"""Monta a mixagem completa do Curupira: falas + efeitos + ambiências + música → master.

Uso (da pasta producao/):
  .venv/bin/python trilha/mixar.py                       # entradas e saídas de produção
  .venv/bin/python trilha/mixar.py --base trilha/teste   # tudo dentro de outra pasta (testes)
  .venv/bin/python trilha/mixar.py --sem-voz             # prévia sem falas → trilha/previas/trilha_sem_voz.mp3
Grava ../audio/curupira.mp3, trilha/master.wav e os barramentos voz.wav/fundo.wav (pré-master)
em trilha/barramentos/, usados pelo analisar.py.
"""
import argparse
import json
import sys
import time
import zlib
from functools import lru_cache
from pathlib import Path

import numpy as np
import soundfile as sf

import motor as m

AQUI = Path(__file__).resolve().parent
PROD = AQUI.parent

# Sfx MUSICAIS: as pontuações de percussão/sopro do roteiro são tocadas DENTRO dos stems de música
# (trilha/compor_*.py, no tempo exato e no tom da cena). A mixagem não os coloca de novo: soariam em dobro.
MUSICAIS = {"gongo_grave", "gongo_sobe", "gongo_desce", "bloco_madeira", "bloco_acelera", "prato",
            "tambor_grave", "rufar", "maraca", "caxixi", "agogo", "berimbau", "flauta_chamado", "pau_de_chuva"}

# ======================= AJUSTES DE MIXAGEM (dB) =======================
# Efeitos pontuais: loudness dos 400 ms mais fortes de cada um (LUFS, antes do master;
# referência: a voz fica em −20 LUFS integrados, ≈ −17 nos 400 ms mais fortes).
SFX_LUFS = {
    # bichos
    "araras": -30, "araras_revoada": -28, "tucano": -32, "sabia": -34, "araponga": -32, "urutau": -32,
    "coruja": -34, "inhambu": -34, "bugio": -30, "macaco_gritos": -30, "onca_esturro": -22,
    "onca_rosnado": -26, "queixada_grunhido": -28, "queixada_dentes": -28, "queixada_tropel": -24,
    "veado_alarme": -30, "sapos": -36, "cigarras": -36, "grilos": -38,
    # gente e ação
    "passos_folhas": -34, "corrida_folhas": -30, "galho_quebra": -28, "machado_golpe": -24,
    "arvore_rangendo": -28, "arvore_caindo": -20, "tiro_espingarda": -18, "espingarda_engatilhar": -30,
    "cachorro_latido": -26, "cachorro_ganido": -28, "grito_homem": -24, "grito_pavor": -24,
    "chamado_eco": -26, "ofego": -32, "risada_curupira": -24, "assobio_curupira": -26,
    "batida_tronco": -24, "cipo_torcendo": -32, "folhagem_mexe": -34, "fosforo": -32, "sopro_apaga": -32,
    "coracao": -26, "trovao": -20, "relampago_estalo": -22,
}
SFX_PADRAO = -28
# Ambiências: loudness de cada camada (LUFS, antes do ducking e do master).
AMB_LUFS = {"mata_amanhecer": -32, "mata_dia": -32, "mata_noite": -33, "chuva_mata": -30,
            "tempestade": -28, "vento_folhas": -34, "riacho": -34, "lamparina_chama": -36}
AMB_PADRAO = -33
MUSICA_LUFS = -27                                 # todos os stems juntos, antes do ducking
DUCK = {"musica": 8, "ambiencia": 5, "sfx": 3}    # quanto cada barramento abaixa sob a voz
RELACAO = 14.0   # voz acima do fundo em cada fala (LUFS); onde faltar, o fundo é abaixado ali (meta: ≥ 12)
REVERB = {"sfx": -14, "musica": -20}              # envio para o reverb de mata
ECO = {"chamado_eco", "urutau", "bugio", "araponga", "inhambu"}          # ganham eco de mata
LONGE = {"chamado_eco": 2500, "urutau": 4000, "bugio": 3000, "inhambu": 4000}  # passa-baixa de distância (Hz)
VARIA_DB, VARIA_ST = 1.5, 0.4    # variação aleatória (determinística) de ganho e de altura por evento
XFADE_CENA = 4.0                 # crossfade das ambiências entre cenas (s)
N_VARIACOES_SINTESE = 4
# =======================================================================

_avisos = set()


def aviso(msg):
    if msg not in _avisos:
        _avisos.add(msg)
        print(f"aviso: {msg}", file=sys.stderr)


def rng(*chave):
    """Gerador determinístico por chave (hash estável, ao contrário do hash() do Python)."""
    return np.random.default_rng(zlib.crc32(":".join(map(str, chave)).encode()))


try:
    import sintese
except Exception as e:  # o módulo pode faltar ou estar em edição
    sintese = None
    aviso(f"sintese.py indisponível ({e}); sons marcados 'sintetizar' usarão os arquivos, se houver")


@lru_cache(maxsize=None)
def sintetizar(etq, variacao, receita_json):
    """sintese.<etiqueta>(**receita, semente=variacao); `receita` (dict no inventário) vira argumentos."""
    fn = getattr(sintese, etq, None)
    if fn is None:
        aviso(f"sintese.py não tem a função '{etq}'")
        return None
    try:
        return np.asarray(fn(**json.loads(receita_json), semente=variacao), np.float32)
    except Exception as e:
        aviso(f"falha ao sintetizar '{etq}': {e}")
        return None


def fonte(inv, sons, etq, r):
    """Áudio de uma etiqueta: sintetizado (se marcado e disponível) ou uma das variações em arquivo."""
    item = inv.get(etq)
    if item is None:
        aviso(f"etiqueta '{etq}' fora do inventário")
        return None
    if item.get("sintetizar") and sintese is not None:
        receita = item.get("receita")
        x = sintetizar(etq, int(r.integers(N_VARIACOES_SINTESE)),
                       json.dumps(receita if isinstance(receita, dict) else {}, sort_keys=True))
        if x is not None:
            return x
    arqs = item.get("arquivos") or []
    if not arqs:
        aviso(f"etiqueta '{etq}' sem arquivo nem síntese")
        return None
    return m.carregar(sons / arqs[int(r.integers(len(arqs)))])


def inventario_pelos_arquivos(sons):
    """Sem inventario.json: monta-o pelos nomes <etiqueta>__<n>.<ext> nas subpastas de sons/ (exceto musica/,
    que é matéria-prima dos stems). Etiqueta sem arquivo só gera aviso: a biblioteca pode estar incompleta."""
    inv = {}
    for p in sorted(sons.glob("*/*__*.*")):
        if p.parent.name != "musica" and p.suffix.lower() in {".wav", ".mp3", ".flac", ".ogg"}:
            item = inv.setdefault(p.name.split("__")[0], {"arquivos": [], "sintetizar": False})
            item["arquivos"].append(str(p.relative_to(sons)))
    if inv:
        aviso(f"sem {sons / 'inventario.json'}: inventário montado pelos arquivos ({len(inv)} etiquetas)")
    return inv


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base", type=Path, help="pasta com linha-do-tempo.json, falas/, sons/, stems/ e saida/")
    ap.add_argument("--linha", type=Path, default=PROD / "linha-do-tempo.json")
    ap.add_argument("--falas", type=Path, default=PROD / "vozes" / "falas")
    ap.add_argument("--sons", type=Path, default=PROD / "sons")
    ap.add_argument("--stems", type=Path, default=AQUI / "stems")
    ap.add_argument("--wav", type=Path, default=m.MASTER_WAV)
    ap.add_argument("--mp3", type=Path, default=m.MP3)
    ap.add_argument("--barramentos", type=Path, default=AQUI / "barramentos")
    ap.add_argument("--semente", type=int, default=1)
    ap.add_argument("--sem-voz", action="store_true",
                    help="prévia sem falas (viram silêncio); grava em trilha/previas/trilha_sem_voz.* e não toca nos barramentos")
    a = ap.parse_args()
    if a.sem_voz and a.wav == m.MASTER_WAV and a.mp3 == m.MP3:
        a.wav, a.mp3 = AQUI / "previas" / "trilha_sem_voz.wav", AQUI / "previas" / "trilha_sem_voz.mp3"
    if a.base:
        b = a.base
        a.linha, a.falas, a.sons, a.stems = b / "linha-do-tempo.json", b / "falas", b / "sons", b / "stems"
        a.wav, a.mp3, a.barramentos = b / "saida" / "master.wav", b / "saida" / "curupira.mp3", b / "saida"

    t0 = time.time()
    linha = json.loads(a.linha.read_text(encoding="utf-8"))
    cenas, dur = linha["cenas"], linha["duracao"]
    caminho_inv = a.sons / "inventario.json"
    inv = json.loads(caminho_inv.read_text(encoding="utf-8")) if caminho_inv.exists() else inventario_pelos_arquivos(a.sons)
    if not inv:
        aviso(f"inventário ausente ou vazio: {caminho_inv}")
    voz, sfx, amb, mus = (m.Faixa(dur) for _ in range(4))

    # 1) narração e diálogos
    for c in cenas:
        for b in c["beats"]:
            if b["tipo"] != "fala" or a.sem_voz:
                continue
            wav = a.falas / f"{b['id']}.wav"
            if not wav.exists():
                aviso(f"falta a fala {wav}")
                continue
            voz.colocar(m.masterizar_voz(m.carregar(wav), b.get("papel") or "narrador"), b["inicio"])
    print(f"falas ok ({time.time() - t0:.1f}s)")

    # 2) efeitos da linha do tempo
    for c in cenas:
        for b in c["beats"]:
            for i, s in enumerate(b.get("sfx", [])):
                etq = s["som"]
                if etq in MUSICAIS:
                    continue
                r = rng(a.semente, b["id"], i, etq)
                x = fonte(inv, a.sons, etq, r)
                if x is None:
                    continue
                x = m.transpor(x, r.uniform(-VARIA_ST, VARIA_ST))
                if etq in LONGE:
                    x = m.passa_baixa(x, LONGE[etq])
                if etq in ECO:  # chamado distante: pouco som direto, muito eco de mata
                    molhado = m.reverb(x, "eco")
                    molhado[:len(x)] += (x if x.ndim == 2 else x[:, None]) * m.db(-6)
                    x = molhado
                ganho = SFX_LUFS.get(etq, SFX_PADRAO) - m.lufs_curto_max(x) + r.uniform(-VARIA_DB, VARIA_DB)
                pan = r.uniform(-1, 1) * 0.5
                sfx.colocar(x, s["t"], ganho, pan, fade_out=0.02)
    print(f"efeitos ok ({time.time() - t0:.1f}s)")

    # 3) ambiências: camadas contínuas enquanto cenas seguidas repetem a etiqueta; crossfade longo entre cenas
    camadas = {}
    for k, c in enumerate(cenas):
        ini = c["inicio"]
        fim = cenas[k + 1]["inicio"] if k + 1 < len(cenas) else linha["creditos"]["inicio"] + XFADE_CENA
        for etq in c.get("ambiente", []):
            iv = camadas.setdefault(etq, [])
            if iv and abs(iv[-1][1] - ini) < 1e-6:
                iv[-1][1] = fim
            else:
                iv.append([ini, fim])
    for etq, ivs in camadas.items():
        for j, (ini, fim) in enumerate(ivs):
            r = rng(a.semente, "amb", etq, j)
            x = fonte(inv, a.sons, etq, r)
            if x is None:
                continue
            x = m.normalizar(x, AMB_LUFS.get(etq, AMB_PADRAO))
            t_ini, t_fim = max(0.0, ini - XFADE_CENA / 2), fim + XFADE_CENA / 2
            amb.colocar(m.cama(x, t_fim - t_ini, deslocamento=int(r.integers(1 << 30))), t_ini,
                        fade_in=XFADE_CENA, fade_out=XFADE_CENA)
    print(f"ambiências ok ({time.time() - t0:.1f}s)")

    # 4) música: um stem por cena (e um opcional para os créditos), começando em cena.inicio
    for c in cenas + [{"id": "creditos", "inicio": linha["creditos"]["inicio"]}]:
        p = a.stems / f"{c['id']}.wav"
        if p.exists():
            mus.colocar(m.carregar(p), c["inicio"], fade_in=0.01, fade_out=0.05)
        else:
            aviso(f"sem stem de música para '{c['id']}' ({p})")
    if np.isfinite(m.lufs(mus.x)):
        mus.x = m.normalizar(mus.x, MUSICA_LUFS)
    print(f"música ok ({time.time() - t0:.1f}s)")

    # 5) espaço (reverb de mata) e ducking sob a voz
    n = len(voz.x)
    for f, nome in ((sfx, "sfx"), (mus, "musica")):
        f.x += m.reverb(f.x, "mata")[:n] * m.db(REVERB[nome])
    fundo = (m.ducking(mus.x, voz.x, DUCK["musica"]) + m.ducking(amb.x, voz.x, DUCK["ambiencia"])
             + m.ducking(sfx.x, voz.x, DUCK["sfx"]))
    del mus, amb, sfx

    # 6) automação por fala: onde a voz ainda não está RELACAO dB acima do fundo, abaixa o fundo ali
    falas = [b for c in cenas for b in c["beats"] if b["tipo"] == "fala"]
    for _ in range(2):
        trechos = []
        for b in falas:
            i, f = int(b["inicio"] * m.SR), int(b["fim"] * m.SR)
            falta = RELACAO - (m.lufs(voz.x[i:f]) - m.lufs(fundo[i:f]))
            if np.isfinite(falta) and falta > 0.1:
                trechos.append((b["inicio"], b["fim"], min(falta, 15.0)))
        if not trechos:
            break
        fundo = m.abaixar(fundo, trechos)
        print(f"automação: fundo abaixado em {len(trechos)} falas (até {max(t[2] for t in trechos):.1f} dB)")
    print(f"reverb, ducking e automação ok ({time.time() - t0:.1f}s)")

    # 7) barramentos para análise e master
    if not a.sem_voz:
        a.barramentos.mkdir(parents=True, exist_ok=True)
        sf.write(str(a.barramentos / "voz.wav"), voz.x, m.SR, subtype="FLOAT")
        sf.write(str(a.barramentos / "fundo.wav"), fundo, m.SR, subtype="FLOAT")
    mix = voz.x + fundo
    del fundo
    m._fades(mix, 0.0, 3.0)
    m.masterizar(mix, a.wav, a.mp3)
    print(f"master ok ({time.time() - t0:.1f}s): {a.wav} | {a.mp3}")


if __name__ == "__main__":
    main()
