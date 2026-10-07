"""Trilha das cenas noite, vo e novelo (grupo "noite") do Curupira — versão 2, linguagem brasileira.

compor(cena_id, linha) devolve estéreo float32 (n, 2) a 48 kHz que começa em cena.inicio e dura
(cena.fim − cena.inicio) + até 4 s de cauda. Todo instante sai da linha do tempo (beats, sfx, cartela) em tempo
de execução: nada de segundos fixos, porque a linha será regenerada com as vozes reais.
Os sfx MUSICAIS do roteiro destas cenas são tocados aqui pela FUNÇÃO (temas.ETIQUETAS_ANTIGAS: gongo_grave =
BÃO de surdo/zabumba/prato, gongo_sobe = rufo até o "uí" da cuíca, gongo_desce = rabeca escorregando + surdo,
bloco_madeira = matraca + caixa, flauta_chamado = berimbau + cuíca/rabeca na cantiga); os demais sfx (bichos,
trovão, uivo, grito, passos...) ficam com a mixagem e a música abre espaço para eles.

Sem cor oriental (LINGUAGEM_MUSICAL.md): nada de flauta, pífano, gongo, bloco ou pentatônica; compor() recusa
qualquer timbre de temas.PROIBIDOS. Timbres: rabeca (violino real com EQ nasal), viola (cordas de aço reais),
sanfona (sintese.sanfona no teclado, acordeom/harmônio reais nos baixos), cuíca (gemidos reais afinados),
alfaia, surdo, caixa, prato, atabaque, maracá, caxixi, agogô, pau-de-chuva, berimbau (amostras e sintese.py);
matraca, gonguê, triângulo, zabumba, berimbau zum e glissando de rabeca pelos timbres de referência do
temas_demo.py.

Uso (da pasta producao/):  .venv/bin/python trilha/compor_noite.py [noite vo novelo]
→ trilha/stems/<cena>.wav, trilha/previas/<cena>.mp3 e <cena>.png (espectrograma com falas e deixas),
  e a tabela de deixas (alvo do roteiro × batida medida no áudio renderizado).
"""
import json
import re
import subprocess
import sys
import zlib
from functools import lru_cache
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.ndimage import uniform_filter1d
from scipy.signal import butter, sosfilt

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import motor as M  # noqa: E402
import sintese as S  # noqa: E402
import temas as T  # noqa: E402
import temas_demo as D  # noqa: E402  (timbres de referência do compositor-chefe)

SR = M.SR
MUSICA = AQUI.parent / "sons" / "musica"
LINHA = AQUI.parent / "linha-do-tempo.json"
STEMS, PREVIAS = AQUI / "stems", AQUI / "previas"
CENAS = ("noite", "vo", "novelo")
CAUDA = 4.0
MUSICAIS = {"gongo_grave", "gongo_sobe", "gongo_desce", "bloco_madeira", "bloco_acelera", "prato", "tambor_grave",
            "rufar", "maraca", "caxixi", "agogo", "berimbau", "flauta_chamado", "pau_de_chuva"}
NIVEL = {"noite": -3.5, "vo": -6.5, "novelo": -5.5}  # dB por cena: o arco (noite é o ápice)

# chamada do Abre-alas escurecida para a noite: o desenho da CHAMADA em Ré eólio (Fá e Si bemol), 7 notas
CHAMADA_NOITE = [("A4", 0.25), ("D5", 1.25, "f"), ("C5", 0.25), ("D5", 0.25), ("A4", 1.0), ("Bb4", 0.5),
                 ("A4", 0.5), ("G4", 0.5), ("F4", 0.5), ("E4", 0.5), ("D4", 2.0, "mf")]
# lamento da rabeca grave depois do "não sei onde estou" (Ré eólio)
LAMENTO = [("A4", 1.5), ("Bb4", 0.5), ("A4", 1), ("G4", 0.5), ("F4", 0.5), ("E4", 0.5), ("D4", 2.5, "pp")]
# a cabeça da cantiga (escala nordestina) para o chamado curto do novelo
CANTIGA_CABECA = [("A4", 0.5), ("C5", 0.25), ("B4", 0.25), ("A4", 0.25), ("G#4", 0.25), ("A4", 1.0)]


def _rng(*chave):
    return np.random.default_rng(zlib.crc32(":".join(map(str, chave)).encode()))


def _filtro(x, tipo, f, ordem=2):
    return sosfilt(butter(ordem, f, tipo, fs=SR, output="sos"), x, axis=0).astype(np.float32)


# ================================================================ amostras

_HZ = re.compile(r"medida ([\d.]+) Hz")


@lru_cache(maxsize=None)
def _bruta(arquivo, limiar=0.05):
    """Amostra mono começando no ataque, pico 1. O ataque é a primeira amostra acima de `limiar` × o pico dos
    primeiros 250 ms (percussão usa limiar alto: o golpe, não o chiado que o antecede)."""
    x = M.carregar(MUSICA / arquivo)
    x = x.mean(axis=1) if x.ndim == 2 else np.array(x, np.float32)
    a = np.abs(x)
    i0 = int(np.argmax(a > 0.05 * a.max()))
    ref = a[i0:i0 + int(0.25 * SR)].max()
    i = max(0, i0 + int(np.argmax(a[i0:] > limiar * ref)) - int(0.003 * SR))
    x = (x[i:] / a.max()).astype(np.float32)
    k = int(0.002 * SR)
    x[:k] *= np.linspace(0, 1, k, dtype=np.float32)
    return x


@lru_cache(maxsize=None)
def _afinada(arquivo, semitons):
    return M.transpor(_bruta(arquivo), semitons)


@lru_cache(maxsize=None)
def _tabela(prefixo):
    """((hz medido, arquivo), ...) das amostras afinadas `prefixo__<nota>`."""
    out = []
    for e in json.loads((MUSICA / "fontes.json").read_text(encoding="utf-8")):
        base, _, nota = Path(e["arquivo"]).stem.partition("__")
        if base == prefixo and (MUSICA / e["arquivo"]).exists():
            m = _HZ.search(e["descricao"])
            out.append((float(m[1]) if m else T.freq(nota), e["arquivo"]))
    return tuple(out)


def _alongar(x, n, a=0.4, xf=0.25):
    """Sustenta além do fim da amostra repetindo o miolo com emendas de potência constante (a arcada que troca)."""
    a, xf = int(a * SR), int(xf * SR)
    seg, w = x[a:], np.sin(np.linspace(0, np.pi / 2, xf, dtype=np.float32))
    y = x.copy()
    while len(y) < n:
        y[-xf:] = y[-xf:] * w[::-1] + seg[:xf] * w
        y = np.concatenate([y, seg[xf:]])
    return y[:n]


@lru_cache(maxsize=256)
def _sanfona_sint(n, dur, din, sem):
    return np.asarray(S.sanfona(n, dur, dinamica=din, semente=sem), np.float32)


AMOSTRA = {"rabeca": "rabeca", "tremolo": "rabeca_tremolo", "viola": "viola", "sanfona": "sanfona"}
FADE_FONTE = {"rabeca": 1.3, "tremolo": 1.3, "viola": 1.5, "sanfona": 0.3}  # fade-out já gravado no arquivo (s)
SOLTURA = {"rabeca": 0.22, "tremolo": 0.3, "viola": 0.35, "sanfona": 0.15, "cuica": 0.0}
RABECA = ("rabeca", "tremolo")


def nota(inst, n, dur, din, sem=0, soltura=None):
    """Uma nota. rabeca/tremolo/viola: amostra real reafinada pela altura medida (rabeca com EQ nasal);
    sanfona: botões de baixo (≤ Ré3) = acordeom/harmônio reais, teclado = sintese.sanfona; cuíca: gemidos reais
    com o topo do "uí" na nota. Sustentados saem com RMS ∝ dinâmica; viola e cuíca, com pico ∝ dinâmica."""
    sol = SOLTURA[inst] if soltura is None else soltura
    if inst == "cuica":
        x = np.asarray(D._cuica(n, dur, 1.0, sem), np.float32)
        return (x * din / (np.abs(x).max() + 1e-9)).astype(np.float32)
    if inst == "sanfona" and T.midi(n) > T.midi("D3"):
        x = _sanfona_sint(n, round(dur, 3), round(din, 3), sem % 4)
        rms = np.sqrt(np.mean(x[int(0.08 * SR):max(int(0.2 * SR), int(min(1.0, dur) * SR))] ** 2))
        return (x * 0.25 * din / (rms + 1e-9)).astype(np.float32)
    f = T.freq(n)
    hz, arq = min(_tabela(AMOSTRA[inst]), key=lambda p: abs(np.log(p[0] / f)))
    x = _afinada(arq, round(12 * np.log2(f / hz), 3))
    util = int(len(x) * (1 - FADE_FONTE[inst] * SR / len(_bruta(arq))))
    if inst == "viola":  # corda pinçada: soa até ser abafada um pouco depois do fim da nota
        y = x[:min(util, int((dur + 0.9) * SR))].copy()
        y = M._fades(y, 0.0, min(sol, len(y) / SR / 2))
        return (y * 0.6 * din).astype(np.float32)
    nd, ns = int(dur * SR), int(sol * SR)
    y = _alongar(x[:util], nd + ns) if nd + ns > util else x[:nd + ns].copy()
    if ns:
        y[nd:] *= np.cos(np.linspace(0, np.pi / 2, len(y) - nd, dtype=np.float32))
    y = M._fades(y, 0.004, 0.004)
    y *= 0.25 * din / (np.sqrt(np.mean(x[int(0.08 * SR):int(1.0 * SR)] ** 2)) + 1e-9)  # nível da amostra, não da nota
    if inst in RABECA:  # violino → rabeca: nasal, sem brilho
        y = sosfilt(D.RABECA_EQ, y)
    if din < 0.6:  # tocar baixinho também escurece o timbre
        y = _filtro(y, "lowpass", 2500 + 10000 * din)
    return np.asarray(y, np.float32)


GOLPES = {  # instrumento → amostras reais (alternadas pela semente)
    "alfaia": ("alfaia__1.ogg", "alfaia__2.wav", "tambor_grave__2.wav"),
    "surdo": ("surdo__1.wav", "surdo__2.wav"), "atabaque": ("atabaque__1.wav", "atabaque__2.wav", "conga__1.wav"),
    "caixa": ("caixa__1.wav", "caixa__2.wav"), "prato": ("prato__1.wav", "prato__2.wav"),
    "prato_abafado": ("prato__3.wav",), "agogo_agudo": ("agogo__1.wav",), "agogo_grave": ("agogo__2.wav",),
    "maraca": ("maraca__2.ogg", "maraca__1.wav"), "pau_de_chuva": ("pau_de_chuva__1.wav", "pau_de_chuva__2.wav"),
    "berimbau": ("berimbau_solto__1.wav", "berimbau_solto__2.wav"),
    "berimbau_preso": ("berimbau_preso__1.wav", "berimbau_preso__2.wav"), "rufo": ("rufar__1.wav",),
}
# timbres novos da versão 2 tirados do temas_demo (o mesmo som das prévias do compositor-chefe)
DEMO = {"matraca", "gongue", "triangulo", "cuica", "rabeca_glissando", "berimbau_zum", "zabumba", "ganza",
        "bacalhau"}
# afinação fixa (semitons): berimbau solto ~Si2+30c → Lá2, preso ~Dó#3−18c → Si2
AFINA = {"berimbau": -2.3, "berimbau_preso": -1.8}
GANHO = {  # dB: equilíbrio do conjunto (percussão normalizada no pico, notas no RMS)
    "alfaia": -3, "zabumba": -4, "surdo": -2, "atabaque": -7, "caixa": -10, "matraca": -9, "prato": -9,
    "prato_abafado": -13, "agogo_agudo": -15, "agogo_grave": -15, "maraca": -13, "caxixi": -14, "pau_de_chuva": -8,
    "berimbau": -6, "berimbau_preso": -6, "berimbau_zum": -5, "rufo": -6, "gongue": -14, "triangulo": -13,
    "cuica": -5, "rabeca_glissando": -6, "ganza": -14, "bacalhau": -12,
    "rabeca": -3, "tremolo": -4, "viola": -1, "sanfona": -5,
}
PAN = {"alfaia": -0.25, "zabumba": 0.1, "surdo": 0.0, "atabaque": 0.3, "caixa": 0.2, "matraca": -0.45,
       "prato": -0.3, "prato_abafado": -0.3, "agogo_agudo": 0.4, "agogo_grave": 0.3, "maraca": 0.45, "caxixi": 0.4,
       "pau_de_chuva": -0.2, "berimbau": -0.3, "berimbau_preso": -0.3, "berimbau_zum": -0.3, "rufo": 0.15,
       "gongue": -0.3, "triangulo": 0.45, "cuica": 0.4, "rabeca_glissando": 0.15, "ganza": 0.5, "bacalhau": 0.25,
       "rabeca": 0.15, "tremolo": -0.1, "viola": -0.3, "sanfona": 0.25}


@lru_cache(maxsize=4096)
def golpe(inst, i, sem=0, lp=None, abafar=None):
    """Um golpe com intensidade i (0..1): amostra real ou timbre do temas_demo (caxixi: síntese), leve variação
    de altura pela semente, golpe fraco mais escuro; lp = distância (passa-baixa); abafar = mão no instrumento."""
    if inst == "caxixi":
        x = S.caxixi(1.0, semente=sem % 4)
    elif inst in DEMO:
        x = np.asarray(D.GOLPE[inst](1.0, sem), np.float32)
    else:
        arqs = GOLPES[inst]
        x = _bruta(arqs[sem % len(arqs)], 0.05 if inst in ("pau_de_chuva", "rufo") else 0.3)
        x = M.transpor(x, AFINA.get(inst, 0.0) + 0.12 * ((sem * 7919) % 5 - 2))
    x = np.asarray(x, np.float32) / (np.abs(x).max() + 1e-9) * np.float32(i ** 1.3)
    if i < 0.75:
        x = _filtro(x, "lowpass", 1200 + 16000 * i * i)
    if lp:
        x = _filtro(x, "lowpass", lp)
    if abafar:
        t = np.arange(len(x)) / SR
        x = (x * np.exp(-np.clip(t - 0.06, 0, None) / abafar))[:int((0.06 + 6 * abafar) * SR)]
    return M._fades(np.asarray(x, np.float32).copy(), 0.0, 0.01)


def glissar(x, semitons):
    """Altura variando no tempo (curva em semitons por amostra), lendo a onda mais rápido ou mais devagar."""
    r = 2 ** (np.asarray(semitons) / 12)
    pos = np.clip(np.cumsum(r) - r[0], 0, len(x) - 1)
    return np.interp(pos, np.arange(len(x)), x).astype(np.float32)


def abrir_voz(x, falas, red_db=7.0, lo=300, hi=3000, rampa=0.2):
    """Cava a faixa da voz (lo–hi Hz) da cama durante as falas; graves e agudos passam inteiros."""
    if not falas:
        return x
    baixo, alto = _filtro(x, "lowpass", lo, 4), _filtro(x, "highpass", hi, 4)
    meio = x - baixo - alto
    m = np.zeros(len(x), np.float32)
    for a, b in falas:
        m[max(0, int((a - rampa) * SR)):int((b + 0.1) * SR)] = 1
    m = uniform_filter1d(m, int(rampa * SR))
    return x - meio * ((1 - M.db(-red_db)) * m)[:, None]


# ================================================================ palco: tempos da cena e barramentos

class Palco:
    """Tempos relativos ao início da cena (lidos da linha do tempo) e os barramentos da trilha:
    seco (fórmulas, perto), tema (temas, com mata), cama (fundo, cavado sob as falas), solto (passa pelos cortes)."""

    def __init__(self, cena):
        self.c, self.t0 = cena, cena["inicio"]
        self.dur = cena["fim"] - cena["inicio"]
        self.beats = {b["id"]: b for b in cena["beats"]}
        self.seco, self.tema, self.cama, self.solto = (M.Faixa(self.dur + CAUDA) for _ in range(4))
        self.falas = [(b["inicio"] - self.t0, b["fim"] - self.t0) for b in cena["beats"] if b["tipo"] == "fala"]
        self.deixas, self.feitos, self.cortes = [], set(), []
        self.ataques = []  # (t, ataque, ganho_db) de cada golpe/nota: para medir as deixas isoladas
        self.usados = set()  # timbres tocados: compor() confere contra temas.PROIBIDOS

    def ini(self, bid):
        return self.beats[bid]["inicio"] - self.t0

    def fim(self, bid):
        return self.beats[bid]["fim"] - self.t0

    def sfx(self, bid, som, k=0):
        """Instante do k-ésimo sfx `som` do beat (e o marca como tocado)."""
        self.feitos.add((bid, som, k))
        return [s["t"] for s in self.beats[bid]["sfx"] if s["som"] == som][k] - self.t0

    def palavra(self, bid, palavra):
        """Instante estimado de uma palavra na fala, pela proporção de caracteres do texto."""
        # ponytail: estimativa por caracteres; trocar por alinhamento de palavras quando a linha trouxer
        b = self.beats[bid]
        return b["inicio"] - self.t0 + (b["fim"] - b["inicio"]) * b["texto"].index(palavra) / len(b["texto"])

    def deixa(self, rotulo, alvo, batida, medir=True):
        self.deixas.append((rotulo, alvo, batida, medir))

    def silencio(self, a, b, fade=0.03):
        """Corte total (inclusive o reverb) de a até b; só o barramento 'solto' continua."""
        self.cortes.append((a, b, fade))

    def _bus(self, nome):
        return getattr(self, nome)

    def golpe(self, inst, t, i, bus="seco", pan=None, ganho_db=0.0, lp=None, abafar=None):
        if i <= 0:
            return
        sem = zlib.crc32(f"{inst}{t:.3f}".encode()) % 4
        x = golpe(inst, round(min(1.0, i), 2), sem, lp, abafar)
        self._bus(bus).colocar(x, t, GANHO[inst] + ganho_db, PAN.get(inst, 0) if pan is None else pan)
        self.ataques.append((t, x[:int(0.3 * SR)], GANHO[inst] + ganho_db))
        self.usados.add(inst)

    def silaba(self, s, t, i, **kw):
        for inst, peso in T.SILABAS[s]:
            self.golpe(inst, t, i * peso, **kw)

    def formula(self, nome, batida_em, ganho=1.0, escala=1.0, sem=(), **kw):
        """Fórmula de temas.FORMULAS com a batida em `batida_em`; golpes antes do início da cena caem fora."""
        f = T.FORMULAS[nome]
        for t, inst, i in f["eventos"]:
            tt = batida_em + (t - f["batida"]) * escala
            if tt >= 0 and inst not in sem:
                self.golpe(inst, tt, i * ganho, **kw)

    def notas(self, inst, eventos, bus="tema", pan=None, ganho_db=0.0, ate=None, staccato=1.0, lp=None, corte=0.03):
        """eventos [(t, dur, nota, intensidade)]; acordes 'D4+A4'. `ate` corta a frase (a nota que soa é abafada)."""
        for k, (t, d, n, i) in enumerate(eventos):
            if ate is not None and t >= ate:
                break
            d *= staccato
            sol = None
            if ate is not None and t + d + SOLTURA[inst] > ate:
                d, sol = max(0.05, ate - t), corte
            for j, nn in enumerate(n.split("+")):
                x = nota(inst, nn, d, i, sem=k + j, soltura=sol)
                if lp:
                    x = _filtro(x, "lowpass", lp(t) if callable(lp) else lp)
                pj = (PAN[inst] if pan is None else pan) + 0.25 * (j - 0.5) * ("+" in n)
                self._bus(bus).colocar(x, t, GANHO[inst] + ganho_db, float(np.clip(pj, -1, 1)))
                self.ataques.append((t, x[:int(0.3 * SR)], GANHO[inst] + ganho_db))
        self.usados.add(inst)

    def melodia(self, inst, melodia, t0, bpm, din="mf", **kw):
        self.notas(inst, [(t0 + t, d, n, i) for t, d, n, i in T.notas(melodia, bpm, din)], **kw)

    def render(self):
        n = len(self.seco.x)
        cama = abrir_voz(self.cama.x, self.falas)
        mata = M.reverb(self.tema.x + cama + M.db(-6) * self.seco.x, "mata")[:n]
        mix = self.seco.x + self.tema.x + cama + M.db(-7) * mata
        env = np.ones(n, np.float32)
        for a, b, fade in self.cortes:
            ia, ib, kf = int(a * SR), min(n, int(b * SR)), int(fade * SR)
            env[ia:ib] = 0
            env[ia:ia + kf] = np.linspace(1, 0, len(env[ia:ia + kf]))
            if ib < n:
                env[max(ia, ib - kf):ib] = np.linspace(0, 1, len(env[max(ia, ib - kf):ib]))
        mix = mix * env[:, None] + self.solto.x + M.db(-18) * M.reverb(self.solto.x, "mata")[:n]
        return mix * M.db(NIVEL[self.c["id"]])

    def conferir_sfx(self):
        """Todo sfx musical das cenas tem de soar: o que a composição não tratou ganha a fórmula da função
        (etiquetas antigas) ou o golpe padrão, e um aviso."""
        padrao = {"prato": ("prato", 0.7), "tambor_grave": ("alfaia", 0.8), "rufar": ("rufo", 0.6),
                  "maraca": ("maraca", 0.5), "caxixi": ("caxixi", 0.5), "agogo": ("agogo_agudo", 0.6),
                  "berimbau": ("berimbau", 0.7), "pau_de_chuva": ("pau_de_chuva", 0.5)}
        for b in self.c["beats"]:
            cont = {}
            for s in b["sfx"]:
                k = cont[s["som"]] = cont.get(s["som"], -1) + 1
                if s["som"] in MUSICAIS and (b["id"], s["som"], k) not in self.feitos:
                    print(f"aviso: {b['id']}: sfx musical '{s['som']}' sem composição própria; fórmula padrão")
                    t = s["t"] - self.t0
                    if s["som"] in T.ETIQUETAS_ANTIGAS:
                        self.formula(T.ETIQUETAS_ANTIGAS[s["som"]][0], t, 0.6)
                    else:
                        self.golpe(*padrao[s["som"]][:1], t, padrao[s["som"]][1])
                    self.deixa(f"{b['id']} {s['som']} (padrão)", t, t)


# ================================================================ recursos comuns

def abre_alas(p, ganho, inst=None, chamada=None, din="mf", ganho_db=0.0):
    """Transição de capítulo: fórmula Abre-alas com o TUM quando a cartela pousa (cartela.inicio + 0,35 s);
    o que viria antes do início da cena cai fora (fica o fim do rufo). A chamada (opcional) sai do TUM."""
    if not p.c.get("cartela"):
        return None
    tum = p.c["cartela"]["inicio"] - p.t0 + 0.35
    p.formula("transicao", tum, ganho)
    if chamada:
        p.melodia(inst, chamada, tum, T.FORMULAS["transicao"]["melodia"]["bpm"], din, bus="tema", ganho_db=ganho_db)
    p.deixa("cartela pousa: TUM do Abre-alas", tum, tum)
    return tum


def fole(p, t0, t1, acorde, din, bus="cama", fade_in=2.0, fade_out=1.0, ganho_db=0.0):
    """Sanfona arrastada: um acorde de fole contínuo de t0 a t1 (entra e sai devagar, como o fole que abre)."""
    for j, n in enumerate(acorde.split("+")):
        x = nota("sanfona", n, t1 - t0, din, sem=j)
        pj = PAN["sanfona"] + 0.3 * (j / max(1, acorde.count("+")) - 0.5)
        p._bus(bus).colocar(x, t0, GANHO["sanfona"] + ganho_db, pj, fade_in=fade_in, fade_out=fade_out)
    p.usados.add("sanfona")


def bordao(p, t0, t1, notas, din, bus="cama", fade_in=2.0, fade_out=1.0, ganho_db=0.0):
    """Bordão de rabeca em trêmulo (cordas soltas Ré-Lá), contínuo de t0 a t1."""
    for j, n in enumerate(notas.split("+")):
        x = nota("tremolo", n, t1 - t0, din, sem=j, soltura=0.0)
        p._bus(bus).colocar(x, t0, GANHO["tremolo"] + ganho_db, -0.3 + 0.6 * j, fade_in=fade_in, fade_out=fade_out)
    p.usados.add("tremolo")


def cuica(p, t, n, dur, i, bus="seco", ganho_db=0.0, pan=None):
    """O 'uí' da cuíca (a voz do Curupira) com o topo do gemido na nota."""
    x = nota("cuica", n, dur, i, sem=int(t * 10))
    p._bus(bus).colocar(x, t, GANHO["cuica"] + ganho_db, PAN["cuica"] if pan is None else pan)
    p.ataques.append((t, x[:int(0.3 * SR)], GANHO["cuica"] + ganho_db))
    p.usados.add("cuica")


def vagalumes(p, t0, t1, ate, notas, i=0.3):
    """Vaga-lumes acendendo um atrás do outro, cada vez mais juntos: cada um é um 'tlim' de triângulo pp e uma
    nota de sanfona que fica acesa até `ate` — o acorde da noite se acende nota a nota."""
    n = len(notas)
    passos = np.geomspace(1.0, 0.45, max(1, n - 1))
    ts = t0 + np.concatenate([[0], np.cumsum(passos)]) * (t1 - t0) / max(1e-9, passos.sum())
    for k, (t, nn) in enumerate(zip(ts, notas)):
        p.golpe("triangulo", t, i, pan=-0.6 + 1.2 * k / max(1, n - 1))
        x = nota("sanfona", nn, ate - t, 0.2, sem=k)
        p.cama.colocar(x, t, GANHO["sanfona"] - 9, -0.5 + k / max(1, n - 1), fade_in=0.25, fade_out=1.5)


def trovoada(p, t0, t1, i0, i1, lp=None, bus="seco", pratos=True):
    """Tempestade de tambores (120): alfaias em semicolcheias que vêm em ondas, como trovão rolando; surdo nos
    apoios; atabaques em 3+3+2; prato no alto das ondas. Intensidade em rampa de i0 a i1."""
    r = _rng("trovoada", round(t0, 2))
    fase, passo = r.uniform(0, 6.3), 0.125
    n = int((t1 - t0) / passo)
    for k in range(n):
        t, u = t0 + k * passo, k / max(1, n - 1)
        onda = 0.45 + 0.55 * np.sin(np.pi * k * passo / 1.6 + fase) ** 2
        base = (i0 + (i1 - i0) * u) * onda
        if r.random() > 0.12:
            p.golpe("alfaia", t, base * (1.0 if k % 4 == 0 else 0.55 + 0.2 * r.random()), bus=bus, lp=lp,
                    pan=-0.45 if k % 2 else 0.45)
        if k % 8 == 0 or r.random() < 0.06:
            p.golpe("surdo", t, min(1, base * 1.15), bus=bus, lp=lp)
        if k % 8 in (0, 3, 6):
            p.golpe("atabaque", t + 0.004, base * 0.8, bus=bus, lp=lp)
        if pratos and k % 16 == 8 and onda > 0.8:
            p.golpe("prato", t, base * 0.6, bus=bus, lp=lp)


def rufar(p, t, ate, i=0.9, bus="seco"):
    """Rufo de caixa (amostra real) em crescendo de t até `ate`, fechando num toque acentuado em `ate`."""
    x = golpe("rufo", 1.0, 0)
    k = int((ate - t) * SR)
    x = x[:k] * np.linspace(0.08, 1.0, k, dtype=np.float32) ** 2
    x = M._fades(x.copy(), 0.0, 0.01) * np.float32(i)
    p._bus(bus).colocar(x, t, GANHO["rufo"], PAN["rufo"])
    p.ataques.append((t, x[:int(0.3 * SR)], GANHO["rufo"]))
    p.golpe("caixa", ate, i, bus=bus)


def grito(p, t, n="D6", dur=0.7, i=0.9, pan=0.35):
    """Rabeca aflita: arcada aguda que entra escorregando de baixo, sustenta e despenca no fim (o grito da mata)."""
    x = nota("rabeca", n, dur + 0.25, i, sem=int(t * 10) % 4, soltura=0.05)
    tt = np.arange(len(x)) / SR
    curva = -3 * np.exp(-tt / 0.06) - 6 * np.clip((tt - dur + 0.1) / 0.3, 0, 1) ** 2
    p.seco.colocar(M._fades(glissar(x, curva), 0.003, 0.08), t, GANHO["rabeca"] - 2, pan)
    p.usados.add("rabeca")


def ponteio(p, cifras, t0, bpm, tempos, din, ate, **kw):
    """Ponteio de viola (PONTEIO3 em 3/4, PONTEIO em 2/4) seguindo as cifras, até `ate`."""
    tabela = T.PONTEIO3 if tempos == 3 else T.PONTEIO
    passo = T.segundos(tempos, bpm)
    for k, ch in enumerate(cifras):
        if t0 + k * passo >= ate - 0.1:
            break
        p.melodia("viola", tabela[ch], t0 + k * passo, bpm, din, ate=ate, **kw)


# ================================================================ noite

def _noite(p):
    tum = abre_alas(p, 0.8, "rabeca", CHAMADA_NOITE, "mp", 0)
    n1 = p.ini("noite_01")
    t_cham = p.sfx("noite_03", "flauta_chamado")
    v0, v1 = p.ini("noite_04"), p.fim("noite_04")

    # 1. a noite cai: a sanfona abre o fole por baixo da chamada (Rém) e arrasta Ré-Lá → Rém → Si♭ → Lá bem grave
    #    sob o narrador (só baixos e quintas: fora da faixa da voz); surdo distante, berimbau zumbindo, chuva
    if tum is not None:
        fole(p, tum, n1 + 1.0, "D3+A3+D4+F4", 0.3, bus="tema", fade_in=0.6, fade_out=1.5, ganho_db=-8)
    a = n1 + 0.5
    progressao = [("D3+A3", 0.3), ("D3+A3+F3", 0.32), ("Bb2+F3", 0.32), ("A2+E3", 0.3)]
    passo = (v0 + 0.8 - a) / len(progressao)
    for k, (ac, d) in enumerate(progressao):
        fole(p, a + k * passo - 0.6 * (k > 0), a + (k + 1) * passo + 0.6, ac, d, fade_in=2.0 if k == 0 else 1.2,
             fade_out=1.2, ganho_db=-1)
    for b, i in T.TEMAS["noite"]["partes"]["surdo"]["eventos"]:
        if n1 + b < t_cham - 1.0:
            p.golpe("surdo", n1 + b, i, bus="tema", lp=260)
    p.golpe("berimbau_zum", n1 + 0.2, 0.35, bus="tema", lp=2500)
    p.golpe("pau_de_chuva", n1 + 8, 0.45, bus="tema")

    # 2. os vaga-lumes acendem um a um e sobem até o galho: triângulo pp e o acorde que se acende nota a nota
    vagalumes(p, p.ini("noite_03") + 1.0, t_cham - 0.45, v0 + 1.2, ["D5", "A5", "F5", "E5", "C6", "A5", "D6"], 0.3)
    p.golpe("caxixi", p.sfx("noite_03", "caxixi"), 0.55)

    # 3. o chamado: DOIM do berimbau + o "uí" da cuíca (a voz do Curupira no galho). Durante a cantiga falada
    #    só o toque lento do berimbau (DOIM … dim), o maracá e o pedal grave da sanfona: espaço para a voz.
    p.formula("chamado", t_cham, 0.9)
    cuica(p, t_cham, "A4", 0.5, 0.7)
    p.deixa("noite_03 fim: chamado (berimbau + cuíca, Curupira no galho)", t_cham, t_cham)
    gd = p.sfx("noite_05", "gongo_desce")
    cala = min(p.palavra("noite_05", "cala"), gd - 0.4)
    k, t = 0, v0
    while t < cala - 0.15:
        p.golpe("berimbau" if k % 2 == 0 else "berimbau_preso", t, 0.55 if k % 2 == 0 else 0.4, bus="tema")
        p.golpe("maraca", t + 0.5, 0.5 if k == 0 else 0.35, bus="tema", pan=0.45 if k % 2 else 0.25)
        k, t = k + 1, t + 1.0
    p.golpe("maraca", v0, 0.55, bus="tema")
    p.sfx("noite_04", "maraca")
    p.deixa("noite_04 início: maraca (cantiga, voz do Curupira)", v0, v0)
    fole(p, v0 + 0.5, cala, "D3+A3", 0.28, fade_in=1.0, fade_out=0.05, ganho_db=-2)

    #    quando a voz dele termina, a rabeca leva a cantiga adiante (eco hipnótico, escala nordestina) e o
    #    narrador fala por cima; em "cala" tudo corta no meio da frase
    cuica(p, v1 + 0.05, "D4", 0.6, 0.45)
    ev, t = [], v1 + 0.15
    while t < cala:
        ev += [(t + tt, d, n, i) for tt, d, n, i in T.notas(T.CANTIGA_1, 120, "mp")]
        t += T.segundos(T.duracao(T.CANTIGA_1), 120)
    p.notas("rabeca", ev, ate=cala, corte=0.02, ganho_db=-5, lp=3500)
    p.silencio(cala, gd - 0.01, 0.02)
    p.deixa("noite_05 'cala': a cantiga corta (silêncio)", cala, cala, medir=False)

    # 4. perdidos: Descida (rabeca escorregando para o grave + surdo); o BÃO cai antes da fala do Tião
    n6 = p.ini("noite_06")
    esc = float(np.clip((n6 - 0.1 - gd) / T.FORMULAS["desce"]["batida"], 0.4, 1.0))
    p.formula("desce", gd + T.FORMULAS["desce"]["batida"] * esc, 0.9, escala=esc, sem=("prato",), bus="tema")
    p.deixa("noite_05 fim: gongo_desce → Descida (perdido)", gd, gd)
    uivo1 = p.sfx("noite_08", "uivo_curupira")
    fole(p, gd + 0.3, p.ini("noite_07") + 1.0, "D3+A3+F3", 0.25, fade_in=1.5, fade_out=1.5, ganho_db=-2)
    p.melodia("rabeca", LAMENTO, p.fim("noite_06"), 60, "p", bus="cama", ganho_db=-2, ate=uivo1 - 0.3, corte=0.5)

    # 5. o vento muda: Arrepio (berimbau zumbindo), fole que cresce em Si♭ → Lá, pancadas viram o pulso
    n7, n9 = p.ini("noite_07"), p.ini("noite_09")
    p.formula("suspense", n7, 0.7, sem=("surdo", "pau_de_chuva"), bus="tema")
    fole(p, n7 + 0.5, p.ini("noite_08"), "Bb2+F3+D4", 0.35, fade_in=2.5, fade_out=0.6)
    fole(p, p.ini("noite_08") - 0.3, n9 + 0.4, "A2+E3+A3+C#4+E4", 0.55, bus="tema", fade_in=0.5, fade_out=0.3,
         ganho_db=-3)
    bordao(p, p.ini("noite_08"), n9 + 0.4, "D4+A4", 0.45, bus="tema", fade_in=1.5, fade_out=0.3, ganho_db=-5)
    pancadas = sorted([p.sfx("noite_07", "batida_tronco", 0), p.sfx("noite_07", "batida_tronco", 1)]
                      + [p.sfx("noite_08", "batida_tronco", k) for k in (0, 1)])
    for j, t in enumerate(pancadas[:2]):  # longe, depois na mata média
        p.golpe("surdo", t, 0.5 + 0.2 * j, bus="tema", lp=220 * 2 ** j)
    for k in (0, 1):  # colado à samaúma: tambor grave (alfaia + surdo) no golpe
        t = p.sfx("noite_08", "tambor_grave", k)
        p.golpe("alfaia", t, 0.95)
        p.golpe("surdo", t, 1.0)
        p.deixa(f"noite_08 tambor_grave {k + 1} (pancada colada)", t, t)

    # 6. tempestade, primeira onda: rufo → relâmpago (Subida: o "uí" da cuíca + gonguê + TUM), tambores em
    #    trovoada, rabeca em trêmulo aflita, rabeca gritando, sanfona com o fole todo aberto (Si♭ → Lá)
    rf, gs = p.sfx("noite_09", "rufar"), p.sfx("noite_09", "gongo_sobe")
    n10 = p.ini("noite_10")
    trovoada(p, n9 + 0.1, gs, 0.25, 0.65, pratos=False)
    rufar(p, rf, gs, 0.95)
    cuica(p, gs, "D5", 0.6, 1.0, pan=0.3)
    p.silaba("TÁ", gs, 0.9)
    p.silaba("TUM", gs, 1.0)
    trovoada(p, gs + 0.125, n10 - 0.1, 1.0, 0.6)
    grito(p, gs + 0.04, "D6", 0.75, 0.95)
    grito(p, gs + 0.9, "F6", 0.45, 0.8, pan=-0.3)
    fole(p, gs, (gs + n10) / 2 + 0.2, "Bb2+F3+D4+F4+Bb4", 0.8, bus="tema", fade_in=0.05, fade_out=0.4, ganho_db=-4)
    fole(p, (gs + n10) / 2, n10 + 0.3, "A2+E3+C#4+E4+A4", 0.75, bus="tema", fade_in=0.3, fade_out=0.6, ganho_db=-4)
    p.melodia("tremolo", [("A4", 1), ("Bb4", 0.5), ("A4", 0.5), ("C5", 1), ("Bb4", 1)], gs, 120, "f",
              ate=n10 - 0.1, corte=0.25)
    p.deixa("noite_09 rufar (rufo em crescendo)", rf, rf)
    p.deixa("noite_09 relâmpago: gongo_sobe → Subida (uí + TÁ + TUM)", gs, gs)

    # sob a fala: a tempestade rola grave e longe sobre o pedal da sanfona; no fim cresce para o clarão
    rev = p.sfx("noite_11", "gongo_grave")
    trovoada(p, n10 - 0.1, rev - 1.6, 0.45, 0.35, lp=380, bus="cama", pratos=False)
    fole(p, n10, rev, "D3+A3", 0.4, fade_in=1.0, fade_out=0.05)
    p.golpe("prato", n10 + 2.5, 0.3, bus="tema", lp=6000)
    trovoada(p, rev - 1.6, rev, 0.35, 0.9, lp=900, bus="cama", pratos=False)

    # 7. revelação: BÃO seco (surdo + zabumba + alfaia + prato abafado) no clarão, depois silêncio total
    uivo = p.sfx("noite_11", "uivo_curupira")
    p.silencio(rev + 0.03, uivo - 0.01, 0.03)
    for inst, i in (("surdo", 1.0), ("zabumba", 1.0), ("alfaia", 1.0), ("prato_abafado", 0.9)):
        p.golpe(inst, rev, i, bus="solto", abafar=0.08)
    p.deixa("noite_11 relâmpago da revelação: gongo_grave → BÃO abafado + corte", rev, rev)

    # 8. o uivo: prato + BÃO juntos; segunda onda (a sombra cresce), sanfona no Lá aflito, rabeca por cima do Zé
    n12, pr = p.ini("noite_12"), p.sfx("noite_11", "prato")
    p.golpe("prato", pr, 1.0)
    p.formula("pontuacao", pr, 1.0, bus="tema")
    p.golpe("alfaia", pr, 1.0)
    p.deixa("noite_11 uivo: prato + BÃO", pr, pr)
    gp = p.sfx("noite_11", "grito_pavor")
    trovoada(p, uivo + 0.125, n12 - 0.1, 0.55, 1.0)
    trovoada(p, n12 - 0.1, n12 + 2.4, 0.6, 0.08, lp=500, bus="cama", pratos=False)
    fole(p, uivo + 0.3, n12 + 0.2, "A2+E3+C#4+G4+Bb4", 0.75, bus="tema", fade_in=0.6, fade_out=0.6, ganho_db=-5)
    p.melodia("tremolo", [("C5", 1), ("Bb4", 0.5), ("A4", 0.5), ("D5", 1), ("C5", 1), ("Bb4", 1)], uivo + 0.4, 120,
              "f", ate=n12 - 0.05, corte=0.3)
    grito(p, gp + 0.55, "D6", 0.6, 1.0)
    grito(p, gp + 1.25, "E6", 0.5, 0.85, pan=-0.35)

    # 9. a chuva continua e a música recua: rabeca sozinha (um fio de sanfona Ré bem grave), terminando no Ré
    #    que leva à Lembrança da Vó (Ré menor)
    f12 = p.fim("noite_12")
    fole(p, n12 + 1.0, f12 + 0.5, "D3", 0.22, fade_in=2.0, fade_out=1.5, ganho_db=-3)
    p.melodia("rabeca", [("A4", 2.0, "pp"), ("Bb4", 0.5, "p"), ("A4", 1), ("G4", 1), ("F4", 1), ("E4", 1),
                         ("D4", max(1.0, p.dur + 2.6 - f12 - 3.5), "pp")], f12 - 2.0, 60, "p", bus="cama",
              ganho_db=-1)


# ================================================================ vo

def _vo(p):
    # Abre-alas de lembrança: TUM brando; a viola começa o acalanto (modinha em Ré menor, 3/4 a 60) no TUM
    tum = abre_alas(p, 0.5)
    t0 = tum if tum is not None else p.ini("vo_01")
    n2, bz, v7 = p.ini("vo_02"), p.ini("vo_06"), p.ini("vo_07")
    trov = p.sfx("vo_07", "trovao")
    passo = T.segundos(3, 60)
    cifra = T.VO_CIFRA.split() * 3

    # viola sozinha: melodia + ponteio grave; sob as falas fica só o ponteio (uma oitava abaixo, fora da voz)
    p.melodia("viola", T.trecho(T.VO_VIOLA, 0, 9), t0, 60, "mp", ate=n2 + 0.3, corte=0.6, ganho_db=1)
    ponteio(p, cifra, t0, 60, 3, "p", bz - 0.05, bus="cama")

    def acorde(t):
        return cifra[min(len(cifra) - 1, int((t - t0) / passo))]

    # a tempestade abafada, como ouvida debaixo d'água
    for t in (p.ini("vo_01") + 0.4, p.ini("vo_05") + 1.5):
        for k in range(7):
            p.golpe("alfaia", t + 0.1 * k, 0.2 + 0.2 * np.sin(np.pi * k / 6), bus="cama", lp=120)

    # a viola responde com ternura nos respiros entre as falas da Vó (desce o acorde do momento até a fundamental)
    p.golpe("maraca", p.sfx("vo_03", "maraca"), 0.35, bus="tema")
    p.deixa("vo_03 fim: maraca", p.fim("vo_03"), p.fim("vo_03"))
    for b in ("vo_03", "vo_04"):
        t = p.fim(b)
        a, b3, c = T._tri(acorde(t))
        p.melodia("viola", [(c, 0.5), (b3, 0.5), (a, 2.0)], t, 60, "p", bus="cama", ganho_db=1)

    # benzedura em quatro tempos: maracá suave em cada tempo; a viola fecha o acalanto (Lá7 → Rém) e a sanfona
    # entra bem baixinho (segunda metade do tema)
    for k in range(4):
        t = p.sfx("vo_06", "maraca", k)
        p.golpe("maraca", t, 0.4, bus="tema", pan=-0.2 + 0.4 * (k % 2))
        p.deixa(f"vo_06 benzedura: maraca {k + 1}", t, t)
    m1 = p.sfx("vo_06", "maraca", 1) - bz
    p.notas("viola", [(bz, m1, "G4", 0.45), (bz + m1, m1, "E4", 0.42), (bz + 2 * m1, m1, "C#4", 0.4),
                      (bz + 3 * m1, 2.5, "D4", 0.38)], ganho_db=1)
    p.notas("viola", [(bz, 1.0, "A2+E3", 0.35), (bz + 3 * m1, 2.0, "D3+A3", 0.35)], bus="cama")
    fim_cor = trov - 2.8  # a lembrança perde a cor menor antes da ideia do Zé
    fole(p, bz, bz + 3 * m1 + 0.3, "A2+E3+G3+C#4", 0.2, fade_in=0.8, fade_out=0.4, ganho_db=-2)
    fole(p, bz + 3 * m1, fim_cor + 0.5, "D3+A3+F4", 0.2, fade_in=0.4, fade_out=1.0, ganho_db=-2)
    fole(p, fim_cor, trov, "D3+A3", 0.2, fade_in=1.0, fade_out=0.05, ganho_db=-2)
    for k, ch in enumerate(["Dm", "Gm", "Dm", "Dm"]):  # e a lembrança se desfaz: viola cada vez mais abafada
        t = bz + 3 * m1 + 1.0 + passo * k
        if t >= fim_cor:
            break
        p.melodia("viola", T.PONTEIO3[ch], t, 60, "p" if t < v7 else "pp", bus="cama" if t < v7 else "tema",
                  ate=fim_cor, lp=lambda tt: float(np.clip(6000 - 5200 * (tt - v7) / max(1, trov - v7), 500, 6000)))

    # a ideia do Zé: a cabeça do Tema da Mata (Ré mixolídio) na rabeca, curtinha e brincalhona, sobre o Ré-Lá
    # vazio da sanfona; o trovão corta a lembrança
    p.melodia("rabeca", T.trecho(T.MATA_RABECA, 0, 4), trov - 2.6, 80, "p", staccato=0.5, ate=trov, ganho_db=-4)
    p.silencio(trov, p.dur + CAUDA, 0.04)
    p.deixa("vo_07 fim: trovão corta a lembrança (corte)", trov, trov, medir=False)


# ================================================================ novelo

def _novelo(p):
    n1 = p.ini("novelo_01")
    p.golpe("pau_de_chuva", n1 + 0.2, 0.4, bus="tema")  # a chuva começa a afinar

    # o trabalho das mãos do Zé: surdo abafado na fala, berimbau + caxixi acelerando na pausa, Estalo no arremate
    ber, cx, bl = (p.sfx("novelo_02", s) for s in ("berimbau", "caxixi", "bloco_madeira"))
    for t in np.arange(n1 + 1.0, ber - 0.3, 1.0):
        p.golpe("surdo", t, 0.4, bus="tema", lp=170)
    ts = [t for t, _, _ in T.acel(ber, 14, 0.3, 0.08)]
    ts = [t for t in ts if t < bl - 0.06]
    for k, t in enumerate(ts):
        p.golpe("berimbau" if k % 3 == 0 else "berimbau_preso", t, 0.55 + 0.35 * k / len(ts))
        if t >= cx:
            p.golpe("caxixi", t, 0.45 + 0.3 * k / len(ts))
            if k + 1 < len(ts):
                p.golpe("caxixi", (t + ts[k + 1]) / 2, 0.3 + 0.2 * k / len(ts))
    p.golpe("caxixi", cx, 0.6)
    p.formula("golpe_seco", bl, 1.0)
    p.golpe("surdo", bl, 0.6, lp=300)
    for rot, t in (("berimbau", ber), ("caxixi", cx), ("bloco_madeira → Estalo: matraca + caixa", bl)):
        p.deixa(f"novelo_02 {rot}", t, t)

    # diálogo: só o surdo abafado, cada vez mais raro; BÃO brando em "É para ele"
    g5 = p.sfx("novelo_05", "gongo_grave")
    p.formula("pontuacao", g5, 0.55, bus="tema", lp=1800)
    p.deixa("novelo_05 fim: gongo_grave → BÃO ('É para ele')", g5, g5)
    f8 = p.fim("novelo_08")
    for t in np.arange(p.ini("novelo_03") + 0.8, f8 - 0.4, 2.0):
        if abs(t - g5) > 0.7:
            p.golpe("surdo", t, 0.38 - 0.15 * (t - n1) / f8, bus="tema", lp=160)

    # a chuva para: pau-de-chuva; um vaga-lume volta a acender, depois outro (o mesmo tlim + sanfona da noite)
    pc = p.sfx("novelo_09", "pau_de_chuva")
    p.golpe("pau_de_chuva", pc, 0.85, bus="tema")
    vagalumes(p, pc + 0.9, pc + 1.6, p.ini("novelo_10") + 0.8, ["A5", "D6"], 0.4)
    p.deixa("novelo_09 pau_de_chuva (chuva afina)", pc, pc)

    # ele sai de trás da samaúma: Chegada do Curupira em surdina, a batida no Estalo (chega à folha)
    b10 = p.sfx("novelo_10", "bloco_madeira")
    p.formula("entrada_curupira", b10, 0.5)
    p.formula("golpe_seco", b10, 0.8)
    p.deixa("novelo_10 fim: bloco_madeira → Estalo = batida da Chegada do Curupira", b10, b10)

    # Tema do Curupira miúdo e curioso (sussurrado): a pegada na viola pp (pegada, respiro, retrógrado, respiro),
    # a cuíca gemendo baixinho nos respiros, agogô leve
    f11 = p.fim("novelo_11")
    pegada = T.CURU_X + [("R", 2)] + T.retrogrado(T.CURU_X) + [("R", 2)]
    ciclo = T.segundos(T.duracao(pegada), 120)
    for k, t in enumerate(np.arange(b10 + 0.5, f11 - 0.5, ciclo)):
        p.melodia("viola", pegada, t, 120, "p", ate=f11, ganho_db=-2)
        if t + 1.25 < f11 - 0.3:
            cuica(p, t + 1.25, ("D4", "C4")[k % 2], 0.5, 0.35, bus="tema", ganho_db=-3)
        for tt, i in T.golpes_grade("X..x....X..x....", 8, 120, "p"):
            if t + tt < f11:
                p.golpe("agogo_agudo", t + tt, i * 0.8, bus="tema")
    mr = p.sfx("novelo_11", "maraca")
    p.golpe("maraca", mr, 0.45, bus="tema")
    p.deixa("novelo_11 maraca (cheirou o fumo)", mr, mr)
    fc = p.sfx("novelo_11", "flauta_chamado")
    p.formula("chamado", fc, 0.7)
    p.melodia("rabeca", CANTIGA_CABECA, fc, 120, "mp", ganho_db=-3)
    p.deixa("novelo_11 fim: flauta_chamado → Chamado (berimbau + cabeça da cantiga na rabeca)", fc, fc)

    # desenrolando o novelo: Traquinagem ajustada à pausa, a pegada na viola que não acha a ponta (para no
    # Sol#, suspensa), um caxixi a cada volta do cipó, a cuíca bufando
    z0, z1 = p.ini("novelo_12"), p.fim("novelo_12")
    esc = min(1.0, (z1 - z0 - 0.2) / T.FORMULAS["travessura"]["dur"])
    p.formula("travessura", z0 + T.FORMULAS["travessura"]["batida"] * esc, 0.75, escala=esc, sem=("caxixi",))
    suspensa = T.CURU_X + [("A4", 0.25), ("G#4", 0.25), ("B4", 0.25), ("C5", 0.25), ("G#4", 1.0)]
    p.melodia("viola", suspensa, z0 + 0.4, 120, "mp", ate=z1 + 0.6, ganho_db=-1)
    for k in (0, 1):
        t = p.sfx("novelo_12", "caxixi", k)
        p.golpe("caxixi", t, 0.7)
        p.deixa(f"novelo_12 caxixi {k + 1} (volta do novelo)", t, t)

    # saindo de mansinho: matraca abafada e a viola nos bordões, na ponta dos pés (Ré menor com o Dó# da modinha,
    # grave: fora da faixa da voz); um passo no 'passos_folhas'
    n13, f13 = p.ini("novelo_13"), p.fim("novelo_13")
    ps = p.sfx("novelo_13", "passos_folhas")
    passos = np.arange(ps - 0.5 * int((ps - n13 - 0.4) / 0.5), f13 + 0.2, 0.5)
    figura = ["D3", "F3", "A3", "F3", "E3", "C#3", "D3", None]
    for k, t in enumerate(passos):
        p.golpe("matraca", t, 0.55, abafar=0.04)
        if figura[k % 8]:
            p.notas("viola", [(t + 0.25, 0.12, figura[k % 8], 0.4)], bus="seco", ganho_db=0, pan=-0.35)
    p.deixa("novelo_13 passos_folhas (passo na ponta dos pés)", ps, ps)

    # refrão: 'E a mata ouviu' na rabeca suspensa (Lá), '...deixou passar' resolve em Ré MAIOR (Fá#) pela
    # primeira vez, com a sanfona abrindo o Ré e a viola nos bordões; BÃO brando, tlim, e o último "uí"
    n14 = p.ini("novelo_14")
    mas, passar = p.palavra("novelo_14", "Mas"), p.palavra("novelo_14", "passar")
    g14 = p.sfx("novelo_14", "gongo_grave")
    fim = p.dur + 2.8
    p.notas("rabeca", [(n14 + 0.2, mas - n14 - 0.1, "A4", 0.22), (mas, passar - mas, "G4", 0.22)], ganho_db=-3)
    p.notas("rabeca", [(passar, fim - passar, "D4+F#4", 0.3)], ganho_db=-3)
    p.notas("viola", [(passar, 1.5, "D3+A3", 0.3)], bus="tema")
    fole(p, passar, fim, "D3+A3+F#4", 0.22, bus="tema", fade_in=0.8, fade_out=1.5, ganho_db=-4)
    p.formula("pontuacao", g14, 0.5, bus="tema", lp=2500)
    p.golpe("triangulo", g14 + 0.6, 0.3, bus="tema")
    cuica(p, g14 + 1.2, "A4", 0.5, 0.3, bus="tema", ganho_db=-2)
    p.deixa("novelo_14 'passar': rabeca em Ré maior (Fá#)", passar, passar)
    p.deixa("novelo_14 fim: gongo_grave → BÃO", g14, g14)


# ================================================================ render, conferência e CLI

COMPOR = {"noite": _noite, "vo": _vo, "novelo": _novelo}
_ULTIMO = {}


def compor(cena_id, linha):
    """Stem da cena: estéreo float32 (n, 2), 48 kHz, de cena.inicio até cena.fim + cauda natural (≤ 4 s)."""
    cena = next(c for c in linha["cenas"] if c["id"] == cena_id)
    p = Palco(cena)
    COMPOR[cena_id](p)
    p.conferir_sfx()
    proibidos = p.usados & T.PROIBIDOS | {u for u in p.usados if "flauta" in u or "gongo" in u or "bloco" in u}
    assert not proibidos, f"{cena_id}: timbre proibido (cor oriental): {proibidos}"
    x = p.render()
    # cauda natural: até onde ainda soa acima de −70 dBFS (no máximo 4 s), com fade curto no fim
    base = int(p.dur * SR)
    vivo = np.nonzero(np.abs(x[base:]).max(axis=1) > M.db(-70))[0]
    x = x[:base + (int(vivo[-1]) + 1 if len(vivo) else 0)]
    x = M._fades(x, 0.0, min(0.5, max(0.01, len(x) / SR - p.dur)))
    if M.pico_verdadeiro(x) > -1.0:
        x = M.limitar(x, -1.0)
    _ULTIMO[cena_id] = p
    return x.astype(np.float32)


def _onset(x, t, janela=0.08):
    """Instante do ataque mais forte perto de t (subida do envelope agudo, quadros de 2 ms)."""
    a, b = max(0, int((t - janela) * SR)), min(len(x), int((t + janela) * SR))
    if b - a < 960:
        return None
    y = _filtro(x[a:b].mean(axis=1), "highpass", 120)
    h = int(0.002 * SR)
    e = uniform_filter1d(y ** 2, int(0.004 * SR))[::h]
    env = 10 * np.log10(e + 1e-4 * e.max() + 1e-12)  # piso a −40 dB do máximo: ruído de fundo não conta
    d = env[4:] - env[:-4]  # subida em 8 ms
    return (a + (int(np.argmax(d)) + 2) * h) / SR


def tabela(cena_id):
    """Deixas: alvo do roteiro × batida composta × ataque medido no áudio dos golpes/notas daquela batida
    (re-renderizados sozinhos, para que o resto da textura não confunda a medida)."""
    p = _ULTIMO[cena_id]
    print(f"\n{cena_id}: deixas (tempos absolutos; Δ = ataque medido − alvo do roteiro)")
    print(f"  {'alvo':>8} {'batida':>8} {'medida':>8} {'Δ ms':>6}  deixa")
    for rot, alvo, batida, medir in sorted(p.deixas, key=lambda d: d[1]):
        m = None
        if medir:
            sonda = M.Faixa(0.6)
            for t, a, g in p.ataques:
                if abs(t - batida) < 0.002:
                    sonda.colocar(a, 0.2 + t - batida, g)
            m = _onset(sonda.x, 0.2)
            m = None if m is None else batida + m - 0.2
        dm = f"{1000 * (m - alvo):+6.0f}" if m is not None else "     —"
        ms = f"{p.t0 + m:8.3f}" if m is not None else "       —"
        print(f"  {p.t0 + alvo:8.3f} {p.t0 + batida:8.3f} {ms} {dm}  {rot}")


def figura(cena_id, x, caminho):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from scipy.signal import stft
    p = _ULTIMO[cena_id]
    f, t, Z = stft(x.mean(axis=1), SR, nperseg=4096, noverlap=4096 - 1024)
    k = f <= 12000
    dbz = 20 * np.log10(np.abs(Z[k]) + 1e-9)
    fig, (a1, a2) = plt.subplots(2, 1, figsize=(18, 8), sharex=True, gridspec_kw=dict(height_ratios=[3, 1]))
    a1.pcolormesh(t, f[k], dbz - dbz.max(), vmin=-80, vmax=0, cmap="magma", shading="auto")
    a1.set_yscale("log")
    a1.set_ylim(40, 12000)
    a1.axhspan(300, 3000, color="cyan", alpha=0.06)
    for a, b in p.falas:
        for ax in (a1, a2):
            ax.axvspan(a, b, color="cyan", alpha=0.12)
    for rot, alvo, batida, medir in p.deixas:
        for ax in (a1, a2):
            ax.axvline(alvo, color="lime", lw=0.8, ls="--")
    a1.axvline(p.dur, color="white", lw=1)
    a1.set_title(f"{cena_id} — espectrograma (faixas ciano: falas; tracejado: deixas; linha branca: fim da cena)")
    curto = uniform_filter1d((x ** 2).sum(axis=1), int(0.4 * SR))[::480]
    a2.plot(np.arange(len(curto)) * 480 / SR, 10 * np.log10(curto + 1e-12), lw=0.8)
    a2.set_ylim(-80, 0)
    a2.set_ylabel("dB (400 ms)")
    a2.set_xlabel("s desde o início da cena")
    fig.tight_layout()
    fig.savefig(caminho, dpi=72)
    plt.close(fig)


def main(cenas):
    linha = json.loads(LINHA.read_text(encoding="utf-8"))
    STEMS.mkdir(exist_ok=True)
    PREVIAS.mkdir(exist_ok=True)
    for cid in cenas:
        x = compor(cid, linha)
        p = _ULTIMO[cid]
        wav = STEMS / f"{cid}.wav"
        sf.write(str(wav), x, SR, subtype="PCM_24")
        subprocess.run([str(M.FFMPEG), "-y", "-loglevel", "error", "-i", str(wav), "-c:a", "libmp3lame", "-b:a", "160k",
                        str(PREVIAS / f"{cid}.mp3")], check=True)
        figura(cid, x, PREVIAS / f"{cid}.png")
        assert x.dtype == np.float32 and x.ndim == 2 and x.shape[1] == 2 and np.isfinite(x).all()
        assert p.dur - 1e-3 <= len(x) / SR <= p.dur + CAUDA + 1e-3, (len(x) / SR, p.dur)
        print(f"\n== {cid}: {len(x) / SR:.2f} s (cena {p.dur:.2f} s + cauda {len(x) / SR - p.dur:.2f} s), "
              f"pico {20 * np.log10(np.abs(x).max()):.1f} dBFS, pico verdadeiro {M.pico_verdadeiro(x):.1f} dBTP, "
              f"{M.lufs(x):.1f} LUFS, timbres: {', '.join(sorted(p.usados))} → {wav}")
        tabela(cid)


if __name__ == "__main__":
    main(sys.argv[1:] or CENAS)
