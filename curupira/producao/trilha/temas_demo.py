"""Prévia dos temas e fórmulas de temas.py: WAV 48 kHz + espectrogramas PNG em trilha/temas_demo/.

Uso (da pasta producao/):  .venv/bin/python trilha/temas_demo.py [tema_ou_formula ...]
Timbres (versão 2, sem flauta e sem gongo):
  rabeca, viola, cuíca, berrante → amostras reais de sons/musica/ afinadas pela altura medida em fontes.json
    (rabeca = violino com EQ nasal; viola = cordas de aço pinçadas em par de oitava; acorde "+" na viola = rasqueado);
  sanfona → sintese.sanfona (palhetas livres) no teclado; botões de baixo (≤ Ré3) = amostras de acordeom/harmônio;
  percussão → amostras (alfaia, surdo, gonguê, triângulo, matraca = tábuas/claves, agogô, maracá, atabaque,
    pau-de-chuva, cuíca, glissando de rabeca) e sintese.py (zabumba, caixa, prato, caxixi, berimbau).
Mixagem crua (pan fixo + reverb de mata do motor.py), só para ouvir e conferir. Os PNGs mostram o espectrograma
com as alturas ESPERADAS tracejadas e, embaixo, os golpes esperados de cada parte de percussão.
"""
import json
import re
import sys
from functools import lru_cache
from pathlib import Path

import matplotlib
import numpy as np
import soundfile as sf
from scipy import signal

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import motor as M  # noqa: E402
import sintese as S  # noqa: E402
import temas as T  # noqa: E402

SR = 48000
SAIDA = AQUI / "temas_demo"
MUSICA = AQUI.parent / "sons" / "musica"
RABECA_EQ = np.vstack([M._biquad("graves", 250, -3.0), M._biquad("pico", 1300, 4.0, 1.2),
                       M._biquad("agudos", 6000, -4.0)])          # violino → rabeca: nasal, sem brilho


def _filtro(x, tipo, f):
    return signal.sosfilt(signal.butter(2, f, tipo, fs=SR, output="sos"), x)


# ---------------------------------------------------------------- amostras

@lru_cache(maxsize=None)
def _som(arq, semitons=0.0):
    """Amostra mono 48 kHz, ataque no início, transposta (reamostragem), pico 1."""
    x = np.asarray(M.carregar(MUSICA / arq), float)
    x = x.mean(axis=1) if x.ndim == 2 else x
    k = int(np.argmax(np.abs(x) > 0.05 * np.abs(x).max()))
    x = np.asarray(M.transpor(x[max(0, k - 96):].astype(np.float32), semitons), float)
    return x / (np.abs(x).max() + 1e-9)


@lru_cache(maxsize=None)
def _banco(prefixo):
    """[(midi medido, arquivo)] pela altura "NNN Hz" que fontes.json registra."""
    out = []
    for e in json.loads((MUSICA / "fontes.json").read_text(encoding="utf-8")):
        m = re.search(r"([\d.]+) Hz", e["descricao"])
        if e["arquivo"].startswith(prefixo + "__") and m:
            out.append((69 + 12 * np.log2(float(m[1]) / 440), e["arquivo"]))
    return out


def _fonte(prefixo, m, ordem=0):
    m0, arq = sorted(_banco(prefixo), key=lambda e: abs(e[0] - m))[ordem % len(_banco(prefixo))]
    return _som(arq, round(m - m0, 2))


def _sustentar(fontes, n, xf=0.3):
    """Nota mais longa que a amostra: o miolo das fontes se reveza com crossfade (troca de arco/fole)."""
    k = int(xf * SR)
    u = np.linspace(0, np.pi / 2, k)
    out = fontes[0][:int(0.85 * len(fontes[0]))].copy()
    j = 1
    while len(out) < n:
        f = fontes[j % len(fontes)]
        miolo = f[int(0.2 * len(f)):int(0.85 * len(f))]
        out[-k:] = out[-k:] * np.cos(u) + miolo[:k] * np.sin(u)
        out, j = np.concatenate([out, miolo[k:]]), j + 1
    return out[:n]


def _amostrada(prefixo, nota, dur, i, solta, ordem=0):
    m = T.midi(nota)
    n = int((dur + solta) * SR)
    x = _fonte(prefixo, m, ordem)
    x = _sustentar([x, x], n) if len(x) < n else x[:n].copy()
    k = min(len(x), int(solta * SR))
    x[len(x) - k:] *= np.cos(np.linspace(0, np.pi / 2, k))
    if i < 0.95:
        x = M.passa_baixa(x.astype(np.float32), 1200 + 9000 * i ** 2, ordem=1).astype(float)
    return x * i ** 1.5


def _viola(nota, dur, i, s=0):
    """Par de cordas: oitava nos bordões (abaixo de Lá3), uníssono nas primas, 7 ms de defasagem."""
    m = T.midi(nota)
    toque = dur + 0.4
    x = _amostrada("viola", nota, toque, i, 0.25)
    par = _amostrada("viola", T.nome(m + 12) if m < 57 else nota, toque, i, 0.25, 0 if m < 57 else 1)
    d = int(0.007 * SR)
    x[d:] += 0.55 * par[:len(x) - d]
    return x


def _cuica(nota, dur, i, s=0):
    """Gemido da cuíca: gestos reais transpostos para que o topo do 'uí' caia na nota; nota longa = gestos em fila."""
    out, t = [], 0.0
    while t < dur - 0.05:
        g = _fonte("cuica", T.midi(nota), s + len(out))
        out.append(g[:int(max(0.12, dur - t + 0.08) * SR)])
        t += len(g) / SR * 0.85
    y = np.zeros(int((dur + 0.6) * SR))
    t = 0
    for g in out:
        y[t:t + len(g)] += g[:len(y) - t]
        t += int(len(g) * 0.85)
    return y * i ** 1.2


def nota_som(inst, nota, dur, d, s=0):
    m = T.midi(nota)
    if inst == "rabeca":
        return signal.sosfilt(RABECA_EQ, _amostrada("rabeca", nota, dur, d, 0.07))
    if inst == "rabeca_tremolo":
        x = _amostrada("rabeca_tremolo", nota, dur, d, 0.1)
        return signal.sosfilt(RABECA_EQ, x)
    if inst == "viola":
        return _viola(nota, dur, d, s)
    if inst == "sanfona":
        if m <= T.midi("D3"):  # botões de baixo: acordeom/harmônio reais
            return _amostrada("sanfona", nota, dur, d, 0.06)
        return np.asarray(S.sanfona(nota, dur, dinamica=d, semente=s), float) * d ** 0.5
    if inst == "cuica":
        return _cuica(nota, dur, d, s)
    if inst == "berrante":
        x = _amostrada("berrante", nota, dur, d, 0.25)
        return x * np.exp(-np.maximum(np.arange(len(x)) / SR - dur + 0.3, 0) / 0.25)
    raise ValueError(inst)


# ---------------------------------------------------------------- golpes

def _abafar(x, tau):
    n = min(len(x), int(5 * tau * SR))
    return x[:n] * np.exp(-np.arange(n) / (tau * SR))


def _bacalhau(i, s):
    """Bacalhau: varinha fina no couro de baixo da zabumba ('tá' estalado e curto)."""
    rng = np.random.default_rng(s)
    t = np.arange(int(0.12 * SR)) / SR
    pele = np.sin(2 * np.pi * np.cumsum(330 + 120 * np.exp(-t / 0.004)) / SR) * np.exp(-t / 0.025)
    estalo = _filtro(rng.standard_normal(len(t)), "bandpass", [1500, 7000]) * np.exp(-t / 0.004)
    return pele + 0.8 * estalo


def _ganza(i, s):
    rng = np.random.default_rng(s)
    t = np.arange(int(0.18 * SR)) / SR
    g = (rng.random(len(t)) < 0.3 * np.exp(-((t - 0.03) / 0.03) ** 2)) * rng.standard_normal(len(t))
    return _filtro(np.convolve(g, np.hanning(32), "same"), "bandpass", [3500, 11000])


def _matraca(i, s):
    """Matraca de bumba-meu-boi: duas tábuas de madeira dura batidas. Estalo seco e ruidoso (claves bem abafadas,
    5 semitons abaixo, + o 'clap' do ar entre as tábuas); sem a nota que fica soando do bloco de madeira."""
    rng = np.random.default_rng(s)
    x = _abafar(_som(f"claves__{1 + s % 2}.wav", -5 + 1.0 * (s % 3)), 0.018)
    t = np.arange(len(x)) / SR
    clap = _filtro(rng.standard_normal(len(t)), "bandpass", [700, 5000]) * np.exp(-t / 0.008)
    return x + 0.5 * clap / (np.abs(clap).max() + 1e-9)


GOLPE = {
    "alfaia": lambda i, s: _som(("alfaia__1.ogg", "alfaia__2.wav")[s % 2]),
    "surdo": lambda i, s: _som(f"surdo__{1 + s % 2}.wav"),
    "zabumba": lambda i, s: S.tambor_grave("zabumba", forca=i, semente=s),
    "bacalhau": _bacalhau,
    "caixa": lambda i, s: S._caixa(i, np.random.default_rng(s)),
    "atabaque": lambda i, s: _som(f"atabaque__{1 + s % 2}.wav"),
    "prato": lambda i, s: S.prato(semente=s % 2),
    "prato_abafado": lambda i, s: _abafar(S.prato(semente=s % 2), 0.06),
    "matraca": _matraca,
    "gongue": lambda i, s: _som("gongue__1.wav", 0 if s % 2 == 0 else 2.0),         # boca grave / aguda
    "agogo_agudo": lambda i, s: _som("agogo__1.wav", 2.0),
    "agogo_grave": lambda i, s: _som("agogo__2.wav", 2.0),
    "triangulo": lambda i, s: _som("triangulo__1.wav" if i >= 0.5 else "triangulo__2.wav"),
    "caxixi": lambda i, s: S.caxixi(forca=i, semente=s),
    "maraca": lambda i, s: _som(f"maraca__{1 + s % 3}.{'ogg' if s % 3 == 1 else 'wav'}"),
    "ganza": _ganza,
    "pau_de_chuva": lambda i, s: _som(f"pau_de_chuva__{1 + s % 2}.wav"),
    "berimbau": lambda i, s: S.berimbau("A2", 0.9, "solto", dinamica=min(1, i + 0.2), semente=s),
    "berimbau_preso": lambda i, s: S.berimbau("A2", 0.6, "preso", dinamica=min(1, i + 0.2), semente=s),
    "berimbau_zum": lambda i, s: S.berimbau("A2", 1.4, "zum", dinamica=min(1, i + 0.2), semente=s),
    "cuica": lambda i, s: _som(f"cuica__{1 + s % 8}.wav"),
    "rabeca_glissando": lambda i, s: signal.sosfilt(RABECA_EQ, _som(f"rabeca_glissando__{1 + s % 2}.wav")),
}


@lru_cache(maxsize=None)
def golpe(inst, i, s):
    x = np.asarray(GOLPE[inst](i, s), float)
    if inst in ("alfaia", "surdo", "atabaque") and i < 0.6:      # golpe fraco = mais escuro
        x = _filtro(x, "lowpass", 400 + 3000 * i)
    return x / (np.abs(x).max() + 1e-9) * i


# ---------------------------------------------------------------- mixagem crua

GANHO = {"rabeca": 0.85, "rabeca_tremolo": 0.4, "viola": 0.55, "sanfona": 0.7, "cuica": 0.7, "berrante": 0.4,
         "alfaia": 0.7, "surdo": 0.7, "zabumba": 0.7, "bacalhau": 0.6, "caixa": 0.55, "atabaque": 0.45,
         "prato": 0.25, "prato_abafado": 0.35, "matraca": 0.6, "gongue": 0.3, "agogo_agudo": 0.22,
         "agogo_grave": 0.22, "triangulo": 0.5, "caxixi": 0.4, "maraca": 0.2, "ganza": 0.45, "pau_de_chuva": 0.35,
         "berimbau": 0.55, "berimbau_preso": 0.7, "berimbau_zum": 0.8, "rabeca_glissando": 0.6}
PAN = {"rabeca": 0.15, "aboio": 0.15, "segunda": -0.35, "viola": -0.3, "ponteio": -0.3, "sanfona": 0.3,
       "fole": 0.25, "cuica": 0.4, "berrante": -0.4, "berimbau": -0.2, "berimbau_preso": -0.2, "agogo_agudo": 0.4,
       "agogo_grave": 0.3, "matraca": -0.4, "maraca": 0.5, "caxixi": 0.45, "ganza": 0.5, "caixa": 0.2,
       "gongue": -0.3, "bacalhau": 0.25, "triangulo": 0.45, "prato": -0.2, "prato_abafado": -0.2, "chamada": 0.15}


def _colocar(buf, x, t, pan):
    a = (pan + 1) * np.pi / 4
    i = int(round(t * SR))
    n = min(len(x), len(buf) - i)
    if n > 0:
        buf[i:i + n] += x[:n, None] * np.array([np.cos(a), np.sin(a)])


def tocar(notas, golpes):
    fim = max([t + d for t, d, *_ in notas] + [t for t, *_ in golpes] + [0])
    buf = np.zeros((int((fim + 6) * SR), 2))
    for k, (t, d, inst, nota, i, parte) in enumerate(notas):
        pan = PAN.get(parte, PAN.get(inst, 0))
        ns = sorted(nota.split("+"), key=T.midi)
        rasq = inst == "viola" and len(ns) > 2                      # rasqueado: a mão varre do grave ao agudo
        for j, n in enumerate(ns):
            x = nota_som(inst, n, d, i * (0.8 if len(ns) > 2 else 1), k % 4)
            _colocar(buf, x * GANHO[inst], t + (0.012 * j if rasq else 0), pan)
    for k, (t, inst, i, parte) in enumerate(golpes):
        _colocar(buf, golpe(inst, round(i, 2), k % 4) * GANHO[inst], t, PAN.get(parte, PAN.get(inst, 0)))
    molhado = M.reverb(buf.mean(axis=1).astype(np.float32), "mata")[:len(buf)]
    buf[:len(molhado)] += 0.3 * molhado
    vivo = np.nonzero(np.abs(buf).max(axis=1) > 1e-3)[0]
    buf = buf[:vivo[-1] + int(0.3 * SR)] if len(vivo) else buf
    buf = M.normalizar(buf, -18.0)
    return (buf * min(1.0, 0.89 / (np.abs(buf).max() + 1e-9))).astype(np.float32)


# ---------------------------------------------------------------- conferência

def afinacao(notas):
    """Mede o f0 (autocorrelação) de cada nota simples ≥ 80 ms tocada sozinha; devolve (dentro de ±35 cents, total, pior)."""
    ok = tot = 0
    pior = (0.0, "")
    for t, d, inst, nota, i, parte in notas:
        if "+" in nota or d < 0.08 or inst in ("berrante", "cuica"):
            continue
        x = nota_som(inst, nota, d, i)
        a, b = int(min(0.08, 0.3 * d) * SR), int(min(d, 0.4) * SR)
        seg = x[a:b] * np.hanning(b - a)
        ac = np.fft.irfft(np.abs(np.fft.rfft(seg, 2 * len(seg))) ** 2)[:len(seg)]
        f = T.freq(nota)
        lo, hi = int(SR / (f * 1.45)), int(SR / (f / 1.45))
        j = lo + int(np.argmax(ac[lo:hi]))
        y0, y1, y2 = ac[j - 1:j + 2]
        lag = j + 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2)
        c = 1200 * np.log2(SR / lag / f)
        tot, ok = tot + 1, ok + (abs(c) < 35)
        pior = max(pior, (abs(c), f"{parte} {nota} @{t:.2f}s"))
    return ok, tot, pior


CORES = plt.get_cmap("tab10").colors


def _espectro(ax, x, n, hop, fmax=7000):
    f, t, Z = signal.stft(x.mean(axis=1), SR, nperseg=n, noverlap=n - hop)
    k = f <= fmax
    db = 20 * np.log10(np.abs(Z[k]) + 1e-9)
    ax.pcolormesh(t, f[k], db - db.max(), vmin=-75, vmax=0, cmap="magma", shading="auto")
    ax.set_yscale("log")
    ax.set_ylim(55, fmax)
    ax.set_ylabel("Hz")


def figura_tema(caminho, titulo, x, notas, golpes):
    partes_p = sorted({g[3] for g in golpes})
    if partes_p:
        fig, (a1, a2) = plt.subplots(2, 1, figsize=(16, 8), sharex=True,
                                     gridspec_kw=dict(height_ratios=[3, max(1, 0.35 * len(partes_p))]))
    else:
        fig, a1 = plt.subplots(figsize=(16, 6))
        a2 = None
    curtas = np.median([n[1] for n in notas]) < 0.2
    _espectro(a1, x, 4096 if curtas else 8192, 512 if curtas else 1024)
    partes_m = sorted({n[5] for n in notas})
    for t, d, inst, nota, i, parte in notas:
        for n in nota.split("+"):
            a1.hlines(T.freq(n), t, t + d, color=CORES[partes_m.index(parte) % 10], lw=1.0, ls="--", alpha=0.85)
    for j, p in enumerate(partes_m):
        a1.plot([], [], color=CORES[j % 10], ls="--", label=p)
    a1.legend(loc="upper right", fontsize=8)
    a1.set_title(titulo)
    for t, inst, i, parte in golpes:
        y = partes_p.index(parte)
        a2.vlines(t, y - 0.4 * i, y + 0.4 * i, color=CORES[y % 10], lw=1.2)
    if a2 is not None:
        a2.set_yticks(range(len(partes_p)), partes_p, fontsize=8)
        a2.grid(axis="x", alpha=0.3)
    (a2 or a1).set_xlabel("s")
    fig.tight_layout()
    fig.savefig(caminho, dpi=80)
    plt.close(fig)


def figura_formulas(caminho, itens):
    fig, eixos = plt.subplots((len(itens) + 1) // 2, 2, figsize=(18, 3.0 * ((len(itens) + 1) // 2)))
    for ax, (nome, f, x) in zip(eixos.flat, itens):
        _espectro(ax, x, 2048, 256, 12000)
        insts = sorted({e[1] for e in f["eventos"]})
        for t, inst, i in f["eventos"]:
            ax.vlines(t, 58, 58 * (1 + 0.8 * i), color=CORES[insts.index(inst) % 10], lw=1.5)
        ax.axvline(f["batida"], color="cyan", ls="--", lw=1)
        ax.set_title(f"{nome} — {f['nome']}: {f['fala']}", fontsize=9)
    for ax in eixos.flat[len(itens):]:
        ax.axis("off")
    fig.tight_layout()
    fig.savefig(caminho, dpi=70)
    plt.close(fig)


# ---------------------------------------------------------------- principal

def main(filtro):
    SAIDA.mkdir(exist_ok=True)
    if not filtro:  # substitui a prévia inteira (a versão 1 tinha flauta e gongo)
        for p in SAIDA.glob("*"):
            p.unlink()
    for k, tema in T.TEMAS.items():
        if filtro and k not in filtro:
            continue
        for v in ["cheia", *tema.get("variacoes", {})]:
            notas, golpes = T.eventos(tema, v)
            x = tocar(notas, golpes)
            sf.write(SAIDA / f"tema_{k}_{v}.wav", x, SR, subtype="PCM_16")
            if v == "cheia":
                ok, tot, pior = afinacao(notas)
                print(f"{k:12s} {len(x) / SR:5.1f} s  afinação {ok}/{tot} notas a ±35 cents (pior: {pior[0]:.0f} c, {pior[1]})")
                vv = T.variacao(tema, v)
                figura_tema(SAIDA / f"tema_{k}.png", f"{tema['nome']} — {vv['bpm']}"
                            f"{'→' + str(vv['bpm_fim']) if vv['bpm_fim'] else ''} bpm {tema['compasso']} — {tema['modo']}",
                            x, notas, golpes)
    itens = []
    for k, f in T.FORMULAS.items():
        if filtro and k not in filtro:
            continue
        golpes = [(t, inst, i, inst) for t, inst, i in f["eventos"]]
        notas = []
        if f["melodia"]:
            m = f["melodia"]
            notas = [(m["t"] + t, d, m["instrumento"], n, i, "chamada") for t, d, n, i in T.notas(m["melodia"], m["bpm"])]
        x = tocar(notas, golpes)
        sf.write(SAIDA / f"formula_{k}.wav", x, SR, subtype="PCM_16")
        itens.append((k, f, x))
    if itens:
        figura_formulas(SAIDA / "formulas.png", itens)
    print(f"→ {SAIDA}")


if __name__ == "__main__":
    main(set(sys.argv[1:]))
