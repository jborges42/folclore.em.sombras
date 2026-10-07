"""Trilha inteira do Curupira: renderiza todos os stems a partir da linha do tempo atual e monta a prévia contínua.

Uso (da pasta producao/):
  .venv/bin/python trilha/compor.py                 # todas as cenas + créditos, depois a prévia e a análise
  .venv/bin/python trilha/compor.py noite aurora    # só essas cenas (a prévia usa os stems que já existem)
  .venv/bin/python trilha/compor.py --so-montar     # não renderiza: só monta a prévia e analisa

É o comando a rodar de novo quando as vozes reais mudarem os tempos (depois de regenerar linha-do-tempo.json).
Cada grupo de cenas tem o seu compositor (compor_<grupo>.py, função compor(cena_id, linha) → float32 (n, 2) a
48 kHz começando em cena.inicio); este arquivo só os chama, grava trilha/stems/<cena>.wav e gera:
  trilha/previas/trilha_completa.wav|mp3  só a música, cada stem em cena.inicio (como o mixar.py os põe)
  trilha/previas/trilha_completa.png      espectrograma da peça inteira + loudness de curto prazo (3 s)
e imprime, por cena, a loudness e as emendas (nível no fim de uma cena e no começo da seguinte).
"""
import importlib
import json
import sys
import time
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.ndimage import uniform_filter1d
from scipy.signal import sosfilt

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import motor as m  # noqa: E402

PROD = AQUI.parent
LINHA = PROD / "linha-do-tempo.json"
STEMS, PREVIAS = AQUI / "stems", AQUI / "previas"
GRUPOS = {
    "compor_inicio": ("abertura", "mata", "guardiao"),
    "compor_caca": ("cacadores", "aviso", "rastros"),
    "compor_noite": ("noite", "vo", "novelo"),
    "compor_fim": ("aurora", "encerramento", "creditos"),
}
COMPOSITOR = {c: g for g, cs in GRUPOS.items() for c in cs}
PREVIA_LUFS = -18.0   # só para ouvir: a mixagem normaliza a música inteira à parte (mixar.MUSICA_LUFS)


def cenas_da_linha(linha):
    """(id, inicio, fim) de cada cena e dos créditos, na ordem do espetáculo."""
    cs = [(c["id"], c["inicio"], c["fim"]) for c in linha["cenas"]]
    return cs + [("creditos", linha["creditos"]["inicio"], linha["creditos"]["fim"])]


def renderizar(ids, linha):
    STEMS.mkdir(exist_ok=True)
    for cid in ids:
        t0 = time.time()
        x = importlib.import_module(COMPOSITOR[cid]).compor(cid, linha)
        assert x.dtype == np.float32 and x.ndim == 2 and x.shape[1] == 2 and np.isfinite(x).all(), cid
        sf.write(str(STEMS / f"{cid}.wav"), x, m.SR, subtype="FLOAT")
        print(f"{cid:13s} {len(x) / m.SR:6.2f} s  pico {m.pico_verdadeiro(x):6.1f} dBTP  {m.lufs(x):6.1f} LUFS"
              f"  ({time.time() - t0:.1f} s)")


def montar(linha):
    """Soma os stems em cena.inicio, como o mixar.py (fade de 10 ms na entrada e 50 ms no fim)."""
    f = m.Faixa(linha["creditos"]["fim"] + 1.0)
    for cid, ini, _ in cenas_da_linha(linha):
        p = STEMS / f"{cid}.wav"
        if p.exists():
            f.colocar(m.carregar(p), ini, fade_in=0.01, fade_out=0.05)
        else:
            print(f"aviso: sem stem para '{cid}'", file=sys.stderr)
    return f.x


def curto_prazo(x, janela=3.0, passo=0.1):
    """Loudness de curto prazo (K-ponderada, janela `janela` s) a cada `passo` s."""
    p = m._potencia(sosfilt(m._K, x, axis=0).astype(np.float32))
    p = uniform_filter1d(p, int(janela * m.SR))[::int(passo * m.SR)]
    return np.arange(len(p)) * passo, 10 * np.log10(p + 1e-12) - 0.691


def analisar(x, linha, png):
    t, st = curto_prazo(x)
    cs = cenas_da_linha(linha)
    print(f"\n{'cena':13s} {'LUFS':>6s} {'máx 3s':>7s}   emenda: fim desta (último 1 s) → começo da próxima (1º 1 s)")
    for k, (cid, ini, fim) in enumerate(cs):
        i, j = int(ini * m.SR), int(fim * m.SR)
        nivel = lambda a, b: m.lufs(x[int(a * m.SR):int(b * m.SR)])  # noqa: E731
        emenda = ""
        if k + 1 < len(cs):
            prox = cs[k + 1][1]
            emenda = f"{nivel(prox - 1, prox):6.1f} → {nivel(prox, prox + 1):6.1f}   (vão {prox - fim:.1f} s)"
        print(f"{cid:13s} {m.lufs(x[i:j]):6.1f} {st[(t >= ini) & (t < fim)].max():7.1f}   {emenda}")

    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    mono = x.mean(axis=1)
    fig, (a1, a2) = plt.subplots(2, 1, figsize=(26, 9), sharex=True, gridspec_kw={"height_ratios": [3, 2]})
    a1.specgram(mono[::4], NFFT=2048, Fs=m.SR / 4, noverlap=1024, cmap="magma", vmin=-130, vmax=-30)
    a1.set_ylim(30, 6000)
    a1.set_yscale("log")
    a1.set_ylabel("Hz")
    a2.plot(t, st, lw=0.8, color="k")
    a2.set_ylim(-60, -5)
    a2.set_ylabel("LUFS (3 s)")
    a2.set_xlabel("s")
    for cid, ini, fim in cs:
        for a in (a1, a2):
            a.axvline(ini, color="c", lw=0.8)
        a2.text(ini + 1, -8, cid, fontsize=9, rotation=0)
    falas = [(b["inicio"], b["fim"]) for c in linha["cenas"] for b in c["beats"] if b["tipo"] == "fala"]
    for a, b in falas:
        a2.axvspan(a, b, color="orange", alpha=0.15, lw=0)
    a2.set_xlim(0, len(mono) / m.SR)
    fig.tight_layout()
    fig.savefig(png, dpi=70)
    plt.close(fig)


def main(args):
    linha = json.loads(LINHA.read_text(encoding="utf-8"))
    if linha.get("estimada"):
        print("aviso: linha do tempo com falas ESTIMADAS; rode de novo quando as vozes estiverem prontas")
    ids = [a for a in args if not a.startswith("--")]
    desconhecidas = set(ids) - set(COMPOSITOR)
    assert not desconhecidas, f"cenas desconhecidas: {desconhecidas}"
    if "--so-montar" not in args:
        renderizar(ids or [c for c, _, _ in cenas_da_linha(linha)], linha)
    PREVIAS.mkdir(exist_ok=True)
    x = montar(linha)
    analisar(x, linha, PREVIAS / "trilha_completa.png")
    m.masterizar(x, PREVIAS / "trilha_completa.wav", PREVIAS / "trilha_completa.mp3", alvo_lufs=PREVIA_LUFS)
    print(f"\n→ {STEMS}\n→ {PREVIAS / 'trilha_completa.mp3'} | .png")


if __name__ == "__main__":
    main(sys.argv[1:])
