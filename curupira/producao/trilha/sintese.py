"""Biblioteca de síntese sonora do espetáculo "Folclore em Sombras — Curupira".

Funções numpy puras e determinísticas (parâmetro `semente`). Todas devolvem float32 mono a 48 kHz,
sem DC, com rampas nas pontas e pico em −3 dBFS. Nos instrumentos melódicos o pico de −3 dBFS
corresponde à dinâmica 'ff'; dinâmicas menores saem mais baixas e mais escuras.
Utilitários para os compositores: frequencia, escala_pentatonica, mistura, reverbera.
"""
import re
import unicodedata
from fractions import Fraction

import numpy as np
from scipy import signal
from scipy.interpolate import PchipInterpolator
from scipy.optimize import brentq

SR = 48000
PICO = 10 ** (-3 / 20)
_DIN = {'pp': 0.25, 'p': 0.35, 'mp': 0.5, 'mf': 0.65, 'f': 0.82, 'ff': 1.0}
_NOTAS = {'c': 0, 'd': 2, 'e': 4, 'f': 5, 'g': 7, 'a': 9, 'b': 11,
          'do': 0, 're': 2, 'mi': 4, 'fa': 5, 'sol': 7, 'la': 9, 'si': 11}
_MODOS = {'maior': [0, 2, 4, 7, 9], 'suspenso': [0, 2, 5, 7, 10], 'sombrio': [0, 3, 5, 8, 10],
          'aberto': [0, 2, 5, 7, 9], 'menor': [0, 3, 5, 7, 10]}


# ───────────────────────────── utilitários internos ─────────────────────────────

def _n(seg): return int(round(seg * SR))
def _t(seg): return np.arange(_n(seg)) / SR
def _din(d): return _DIN[d] if isinstance(d, str) else float(d)
def _fase(f): return 2 * np.pi * np.cumsum(f) / SR
def _ataque(t, seg): return 0.5 - 0.5 * np.cos(np.pi * np.clip(t / seg, 0, 1))


def _filtra(x, tipo, f, ordem=2):
    """Butterworth causal ('lowpass', 'highpass', 'bandpass')."""
    return signal.sosfilt(signal.butter(ordem, f, btype=tipo, fs=SR, output='sos'), x)


def _eq(x, picos):
    """Biquads de pico RBJ em série; picos = [(freq, ganho_dB, Q)]."""
    sos = []
    for f, g, q in picos:
        A, w = 10 ** (g / 40), 2 * np.pi * f / SR
        al = np.sin(w) / (2 * q)
        b = [1 + al * A, -2 * np.cos(w), 1 - al * A]
        a = [1 + al / A, -2 * np.cos(w), 1 - al / A]
        sos.append(np.r_[b, a] / a[0])
    return signal.sosfilt(np.array(sos), x)


def _lento(rng, n, hz):
    """Ruído suave em −1..1 que muda de rumo cerca de `hz` vezes por segundo."""
    k = max(4, int(n / SR * hz) + 2)
    return PchipInterpolator(np.linspace(0, n, k), rng.uniform(-1, 1, k))(np.arange(n))


def _fades(x, ini=0.002, fim=0.02):
    """Rampas de cosseno na entrada e na saída (bordas exatamente em zero)."""
    x = np.array(x, dtype=float)
    a, b = min(_n(ini), len(x) // 2), min(_n(fim), len(x) // 2)
    if a:
        x[:a] *= 0.5 - 0.5 * np.cos(np.pi * np.arange(a) / a)
    if b:
        x[len(x) - b:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(1, b + 1) / b)
    return x


def _fim(x, ganho=1.0, ini=0.002, fim=0.03):
    """Tira DC (passa-altas 20 Hz), corta a cauda abaixo de −80 dB, aplica rampas e põe o pico em −3 dBFS×ganho."""
    x = _filtra(np.asarray(x, float), 'highpass', 20)
    vivo = np.nonzero(np.abs(x) > np.abs(x).max() * 1e-4)[0]
    x = _fades(x[:min(len(x), vivo[-1] + _n(fim))], ini, fim)
    return (x * (PICO * ganho / np.abs(x).max())).astype(np.float32)


def _banda_estreita(rng, fase, largura):
    """Ruído de banda estreita que acompanha a fase dada (heteródino I/Q), desvio-padrão 1."""
    n = len(fase)
    i, q = (_filtra(rng.standard_normal(n), 'lowpass', largura) for _ in range(2))
    b = i * np.cos(fase) + q * np.sin(fase)
    return b / (b.std() + 1e-12)


# ───────────────────────────── utilitários públicos ─────────────────────────────

def frequencia(nota):
    """Converte nota ('A4', 'C#5', 'Bb3', 'Ré4', 'Sol#3', 'Lá4') ou número em Hz (Lá4 = 440)."""
    if not isinstance(nota, str):
        return float(nota)
    m = re.fullmatch(r'([^\d#\-]+?)([#b]?)(-?\d)', nota.strip())
    if not m:
        raise ValueError(f'nota inválida: {nota!r}')
    nome = unicodedata.normalize('NFD', m[1]).encode('ascii', 'ignore').decode().lower()
    semi = 12 * (int(m[3]) + 1) + _NOTAS[nome] + {'#': 1, 'b': -1, '': 0}[m[2]]
    return 440.0 * 2 ** ((semi - 69) / 12)


def escala_pentatonica(tonica, modo='menor', oitavas=2):
    """Frequências (Hz) da pentatônica a partir da tônica; modos: maior, suspenso, sombrio, aberto, menor."""
    f = frequencia(tonica)
    semis = [12 * o + s for o in range(oitavas) for s in _MODOS[modo]] + [12 * oitavas]
    return f * 2 ** (np.array(semis) / 12)


def mistura(eventos):
    """Soma eventos (t_segundos, som[, ganho]) num único array float64, sem normalizar."""
    eventos = [(e[0], np.asarray(e[1], float), e[2] if len(e) > 2 else 1.0) for e in eventos]
    y = np.zeros(max(_n(t) + len(s) for t, s, _ in eventos))
    for t, s, g in eventos:
        y[_n(t):_n(t) + len(s)] += g * s
    return y


def reverbera(x, dur=2.5, molhado=0.3, pre=0.02, escuro=0.5, semente=0):
    """Reverb de convolução (cauda de ruído exponencial, agudos morrem antes); devolve seco+molhado com a cauda, sem normalizar."""
    rng = np.random.default_rng(semente + 7919)
    t = _t(dur)
    r = rng.standard_normal(len(t))
    grave = _filtra(r, 'lowpass', 1800)
    ir = grave * np.exp(-6.9 * t / dur) + (r - grave) * np.exp(-6.9 * t / (dur * (1 - 0.8 * escuro)))
    ir = np.r_[np.zeros(_n(pre)), _fades(ir, 0.004, 0.05)]
    ir /= np.sqrt(np.sum(ir ** 2))
    x = np.asarray(x, float)
    return np.r_[x, np.zeros(len(ir) - 1)] * (1 - molhado) + signal.fftconvolve(x, ir) * molhado


# ───────────────────────────── Curupira ─────────────────────────────

def _assobio_frase(pts, amps, rng, vib=0.02):
    """Frase contínua de assobio: pts = [(t, Hz)], amps = [(t, amplitude)] (mesma duração)."""
    pts, amps = np.array(pts, float), np.array(amps, float)
    dur = pts[-1, 0]
    n = _n(dur)
    t = np.arange(n) / SR
    lf = PchipInterpolator(pts[:, 0], np.log2(pts[:, 1]))(t)
    taxa = 5.8 + 1.3 * _lento(rng, n, 1.2)                                  # vibrato irregular
    prof = vib * (0.65 + 0.35 * _lento(rng, n, 0.9)) * np.clip(t / 0.4, 0, 1) ** 2
    lf += prof * np.sin(_fase(taxa)) + 0.0025 * _lento(rng, n, 30)         # + tremor fino dos lábios
    lf += np.log2(0.93) * np.exp(-t / 0.035)                                # entra por baixo e sobe
    lf += np.log2(0.95) * np.clip((t - dur + 0.18) / 0.18, 0, 1) ** 2       # cai um pouco ao soltar
    f = 2 ** lf
    fase = _fase(f)
    amp = np.clip(PchipInterpolator(amps[:, 0], amps[:, 1])(t), 0, None)
    amp *= (1 + 0.07 * _lento(rng, n, 7)) * (f / np.median(f)) ** 0.4      # agudos saem mais fortes
    tom = np.sin(fase) + 0.03 * np.sin(2 * fase + 0.4) + 0.008 * np.sin(3 * fase + 1.3)
    ar_no_tom = 0.06 * _banda_estreita(rng, fase, 70)
    sopro = _filtra(rng.standard_normal(n), 'bandpass', [1200, 8000], 3)
    sopro *= 0.025 / sopro.std()
    jato = np.exp(-((t - 0.04) / 0.045) ** 2) + 0.3 * np.exp(-((t - dur + 0.08) / 0.08) ** 2)
    env_sopro = np.clip(0.5 * amp + 1.2 * jato * amp.max(), 0, None) * _ataque(t, 0.01)
    return amp * (tom + ar_no_tom) + env_sopro * sopro


def assobio_curupira(variante='chamado', semente=0):
    """Assobio sobrenatural do Curupira: 'chamado' (longo, arrepiante), 'curto', 'espiral' ou 'distante'."""
    rng = np.random.default_rng(semente)
    if variante == 'chamado':
        frases = [(0.0, [(0, 1050), (0.35, 1300), (0.85, 2150), (1.25, 2050)],
                   [(0, 0), (0.1, 0.75), (0.8, 1), (1.1, 0.7), (1.25, 0)], 0.018),
                  (1.5, [(0, 1450), (0.28, 2500), (0.55, 2680), (1.6, 2600), (2.3, 2350), (3.3, 950), (4.1, 640)],
                   [(0, 0), (0.12, 0.9), (0.6, 1), (1.8, 0.95), (2.6, 0.7), (3.5, 0.3), (4.1, 0)], 0.028)]
        cauda = (3.2, 0.38, 0.03, 0.6)
    elif variante == 'curto':
        frases = [(0.0, [(0, 1500), (0.12, 2350), (0.42, 2550), (0.7, 2250)],
                   [(0, 0), (0.06, 1), (0.5, 0.85), (0.7, 0)], 0.012)]
        cauda = (2.0, 0.25, 0.02, 0.5)
    elif variante == 'espiral':
        T = 3.4
        t = np.arange(0, T + 1e-9, 0.005)
        u = t / T
        giro = 2 * np.pi * np.cumsum(1.6 + 5.5 * u ** 1.5) * 0.005          # volta cada vez mais rápida
        centro = np.log2(1150) + 1.0 * np.sin(0.8 * np.pi * u)
        hz = 2 ** (centro + 0.17 * (1 - 0.55 * u) * np.sin(giro))            # Doppler de quem rodeia
        amp = (0.72 - 0.28 * np.cos(giro)) * np.sin(np.pi * u) ** 0.35
        frases = [(0.0, list(zip(t, hz)), list(zip(t, amp)), 0.006)]
        cauda = (2.8, 0.36, 0.03, 0.6)
    elif variante == 'distante':
        frases = [(0.0, [(0, 1300), (0.3, 2300), (1.2, 2250), (2.0, 1500), (2.6, 1100)],
                   [(0, 0), (0.15, 0.9), (1.0, 1), (2.0, 0.6), (2.6, 0)], 0.025)]
        cauda = (3.6, 0.72, 0.06, 0.75)
    else:
        raise ValueError(variante)
    eventos = []
    for t0, pts, amps, vib in frases:
        eventos.append((t0, _assobio_frase(pts, amps, rng, vib)))
        fantasma = [(t, hz * 1.0021) for t, hz in pts]                       # duplo quase uníssono: batimento etéreo
        eventos.append((t0 + 0.022, _assobio_frase(fantasma, amps, rng, vib), 0.3))
    y = mistura(eventos)
    if variante == 'distante':
        y = _filtra(y, 'lowpass', 3200, 4)
    dur, mol, pre, esc = cauda
    return _fim(reverbera(y, dur, mol, pre, esc, semente), ini=0.005, fim=0.25)


def _stft(x, n=2048, h=256):
    """STFT com janela de Hann e enchimento de n amostras em cada ponta."""
    w = signal.windows.hann(n, sym=False)
    q = np.lib.stride_tricks.sliding_window_view(np.pad(x, (n, n)), n)[::h]
    return np.fft.rfft(q * w, axis=1)


def _istft(X, n=2048, h=256):
    """Sobreposição-soma com normalização pela janela; devolve o sinal inteiro (com o enchimento)."""
    w = signal.windows.hann(n, sym=False)
    q = np.fft.irfft(X, n, axis=1) * w
    y = np.zeros(len(q) * h + n)
    soma = np.zeros_like(y)
    for i, quadro in enumerate(q):
        y[i * h:i * h + n] += quadro
        soma[i * h:i * h + n] += w * w
    return y / np.maximum(soma, 1e-3)


def _estica(x, r, n=2048, h=256):
    """Phase vocoder: alonga a duração por r sem mudar a altura."""
    X = _stft(x, n, h)
    pos = np.arange(0, len(X) - 1, 1 / r)
    k = pos.astype(int)
    a = (pos - k)[:, None]
    mag = (1 - a) * np.abs(X[k]) + a * np.abs(X[k + 1])
    w = 2 * np.pi * h * np.arange(X.shape[1]) / n
    d = np.angle(X[1:]) - np.angle(X[:-1]) - w
    d = w + (d + np.pi) % (2 * np.pi) - np.pi                                # avanço real de fase por salto
    fase = np.angle(X[0]) + np.vstack([np.zeros(X.shape[1]), np.cumsum(d[k[:-1]], axis=0)])
    b = np.arange(X.shape[1])
    pico = np.zeros(mag.shape, bool)
    pico[:, 1:-1] = (mag[:, 1:-1] > mag[:, :-2]) & (mag[:, 1:-1] >= mag[:, 2:])
    esq = np.maximum.accumulate(np.where(pico, b, 0), axis=1)
    dir_ = np.minimum.accumulate(np.where(pico, b, b[-1])[:, ::-1], axis=1)[:, ::-1]
    perto = np.where(b - esq <= dir_ - b, esq, dir_)                         # pico que governa cada bin
    ana = np.angle(X[k])
    fase = np.take_along_axis(fase, perto, 1) + ana - np.take_along_axis(ana, perto, 1)
    y = _istft(mag * np.exp(1j * fase), n, h)
    ini = int(round(n * r))
    return y[ini:ini + int(round(len(x) * r))]


def _envelope(X, nc=40):
    """Envelope espectral (log) por cepstro suavizado."""
    c = np.fft.irfft(np.log(np.abs(X) + 1e-7), axis=1)
    c[:, nc:-nc] = 0
    return np.fft.rfft(c, axis=1).real


def curupirizar(x, intensidade=1.0, semitons=None, formante=None, sr=SR, semente=0):
    """Voz/risada → Curupira: altura acima com duração preservada, formante levemente infantil, tremor, coro, ecos e reverb."""
    x = np.asarray(x, float)
    x = x.mean(axis=1) if x.ndim == 2 else x
    if sr != SR:
        x = signal.resample_poly(x, SR, sr)
    semitons = 5.0 * intensidade if semitons is None else semitons
    formante = 1 + 0.13 * intensidade if formante is None else formante
    r = 2 ** (semitons / 12)
    fr = Fraction(r).limit_denominator(64)
    y = signal.resample_poly(_estica(x, r), fr.denominator, fr.numerator)
    y = np.pad(y, (0, max(0, len(x) - len(y))))[:len(x)]
    # o resample levou os formantes junto com a altura; recoloca-os em formante×original
    X, Y = _stft(x), _stft(y)
    ex, ey = _envelope(X), _envelope(Y)
    m = X.shape[1]
    pos = np.arange(m) / formante
    i = np.minimum(pos.astype(int), m - 2)
    a = pos - i
    alvo = ex[:, i] * (1 - a) + ex[:, i + 1] * a
    y = _istft(Y * np.exp(np.clip(alvo - ey, -3, 3)))[2048:2048 + len(x)]
    # modulação sutil: tremor de altura (linha de atraso modulada) e um duplo em coro
    idx = np.arange(len(y))
    t = idx / SR
    def atraso(sinal, base, prof, taxa):
        return np.interp(idx - (base + prof * np.sin(2 * np.pi * taxa * t)) * SR, idx, sinal, left=0, right=0)
    y = atraso(y, 0.001, 0.00028 * intensidade, 5.7)
    y = y + 0.35 * intensidade * atraso(y, 0.017, 0.002, 0.27)
    ecos = [(0.21, 0.3, 5000), (0.38, 0.2, 3500), (0.62, 0.12, 2400), (0.93, 0.07, 1600)]
    y = mistura([(0, y)] + [(d, _filtra(y, 'lowpass', fc), g * intensidade) for d, g, fc in ecos])
    return _fim(reverbera(y, 2.6, 0.12 + 0.16 * intensidade, 0.03, 0.6, semente), ini=0.005, fim=0.15)


# ───────────────────────────── gongos e metais ─────────────────────────────

def _gongo(f0, parciais, dur, glis, tau_glis, golpe, rng, batimento=1.2):
    """Gongo modal: parciais (razão, amp, tau[, tau_florescer]) em dupletos, com glissando comum de altura."""
    t = _t(dur)
    curva = 2 ** (glis / 12 * (1 - np.exp(-t / tau_glis)))
    fb = _fase(f0 * curva)
    y = np.zeros(len(t))
    for p in parciais:
        r, a, tau = p[:3]
        if r * f0 * curva.max() > 18000:
            continue
        if len(p) > 3:                                                       # parcial da nuvem: floresce depois do golpe
            y += a * np.sin(r * fb + rng.uniform(0, 6.3)) * np.exp(-t / tau) * (1 - np.exp(-t / p[3]))
            continue
        df = batimento * rng.uniform(0.4, 1.6)                               # dupleto desigual → batimento
        q = rng.uniform(0.25, 0.4)
        y += a * ((1 - q) * np.sin(r * fb - np.pi * df * t) + q * np.sin(r * fb + np.pi * df * t)) * np.exp(-t / tau)
    lp, ganho, tau_g = golpe
    y += ganho * _filtra(rng.standard_normal(len(t)), 'lowpass', lp) * np.exp(-t / tau_g)
    return y * _ataque(t, 0.002)


def gongo_grave(semente=0):
    """Gongo grande (tam-tam): fundamental profunda, nuvem inarmônica que floresce depois do golpe e leve queda de altura."""
    rng = np.random.default_rng(semente)
    baixos = [(1, 1, 6.0), (1.51, 0.55, 5.0), (2.03, 0.5, 4.5), (2.74, 0.38, 4.0), (3.31, 0.32, 3.5),
              (4.12, 0.26, 3.0), (4.93, 0.2, 2.6)]
    r = np.exp(rng.uniform(np.log(5.5), np.log(140), 170))
    nuvem = [(ri, 0.1 * rng.uniform(0.3, 1) * (ri / 5.5) ** -0.5, 3.2 * rng.uniform(0.7, 1.4) * (ri / 5.5) ** -0.35,
              rng.uniform(0.2, 1.0)) for ri in r]
    y = _gongo(68, baixos + nuvem, 9.0, -0.45, 1.5, (500, 0.6, 0.03), rng, batimento=0.7)
    return _fim(y, ini=0.002, fim=0.4)


def gongo_sobe(semente=0):
    """Gongo pequeno de ópera: golpe brilhante cuja altura sobe ~2,5 semitons logo após o ataque."""
    rng = np.random.default_rng(semente)
    p = [(1, 1, 1.7), (1.47, 0.42, 1.0), (2.09, 0.38, 0.8), (2.62, 0.24, 0.55), (3.31, 0.2, 0.4),
         (4.17, 0.12, 0.28), (5.4, 0.08, 0.18), (6.83, 0.05, 0.12), (8.3, 0.04, 0.08), (9.9, 0.03, 0.06),
         (11.6, 0.025, 0.045), (13.7, 0.02, 0.035)]
    return _fim(_gongo(470, p, 2.8, 2.5, 0.32, (6000, 0.3, 0.004), rng), fim=0.2)


def gongo_desce(semente=0):
    """Gongo grande de ópera: golpe cheio cuja altura cai ~3 semitons depois do ataque."""
    rng = np.random.default_rng(semente)
    p = [(1, 1, 2.6), (1.52, 0.5, 1.8), (2.05, 0.45, 1.3), (2.71, 0.3, 0.9), (3.18, 0.22, 0.7),
         (3.96, 0.15, 0.5), (5.12, 0.1, 0.3), (6.4, 0.07, 0.2), (7.9, 0.05, 0.14), (9.6, 0.04, 0.1),
         (11.8, 0.03, 0.07), (14.3, 0.025, 0.05), (17.2, 0.02, 0.04)]
    return _fim(_gongo(300, p, 4.2, -3.0, 0.45, (1500, 0.25, 0.01), rng), fim=0.3)


def _metal(rng, t, quantos, fmin, fmax, taus):
    """Nuvem densa de parciais inarmônicos (prato)."""
    y = np.zeros(len(t))
    for f in np.exp(rng.uniform(np.log(fmin), np.log(fmax), quantos)):
        y += rng.uniform(0.3, 1) * (f / 1000) ** -0.2 * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.3)) \
             * np.exp(-t / rng.uniform(*taus))
    return y / np.sqrt(quantos)


def prato(semente=0):
    """Prato (crash/suspenso): nuvem metálica + chiado que se abre e decai em ~4 s."""
    rng = np.random.default_rng(semente)
    t = _t(4.5)
    y = _metal(rng, t, 260, 380, 15000, (0.6, 2.6))
    chiado = _filtra(rng.standard_normal(len(t)), 'bandpass', [2500, 15000])
    y += 0.5 * chiado * (0.55 * np.exp(-t / 0.18) + 0.45 * np.exp(-t / 1.5))
    y += 0.8 * _filtra(rng.standard_normal(len(t)), 'bandpass', [1000, 9000]) * np.exp(-t / 0.003)
    y = _filtra(y, 'highpass', 300) * _ataque(t, 0.001)
    return _fim(y, fim=0.4)


def pratinhos(semente=0):
    """Par de pratinhos de mão batendo (com leve flam): 'tchin' agudo e anelado."""
    rng = np.random.default_rng(semente)
    t = _t(1.8)
    def prato_pequeno():
        y = _metal(rng, t, 200, 1300, 16000, (0.1, 0.6))
        for f in (2950, 4380, 6120):                                         # tons próprios do bronze
            y += 0.12 * np.sin(2 * np.pi * f * rng.uniform(0.98, 1.02) * t) * np.exp(-t / 0.7)
        y += 0.45 * _filtra(rng.standard_normal(len(t)), 'bandpass', [3000, 14000]) * np.exp(-t / 0.08)
        return y
    y = mistura([(0, prato_pequeno()), (0.006, prato_pequeno(), 0.8)])
    return _fim(_filtra(y, 'highpass', 700) * _ataque(np.arange(len(y)) / SR, 0.001), fim=0.2)


# ───────────────────────────── madeiras ─────────────────────────────

def _golpe_madeira(f, forca, rng, seco=1.0):
    """Um golpe de madeira: modos curtos inarmônicos com leve queda de altura + estalo."""
    t = _t(0.25)
    fb = _fase(f * rng.uniform(0.985, 1.015) * (1 + 0.03 * np.exp(-t / 0.004)))
    y = sum(a * forca ** (r / 4) * np.sin(r * fb) * np.exp(-t * seco / tau)
            for r, a, tau in ((1, 1, 0.04), (2.42, 0.5, 0.02), (3.95, 0.3, 0.012), (5.7, 0.15, 0.007)))
    y += 0.35 * seco * _filtra(rng.standard_normal(len(t)), 'bandpass', [1500, 9000]) * np.exp(-t / 0.0015)
    return _fades(forca * y * _ataque(t, 0.0004), 0, 0.03)


def bloco_madeira(altura=1100, forca=1.0, semente=0):
    """Um golpe de bloco de madeira; altura em Hz ou nome de nota."""
    return _fim(_golpe_madeira(frequencia(altura), forca, np.random.default_rng(semente)))


def bloco_acelera(n=16, dur=2.4, altura=1100, semente=0):
    """Convenção do teatro de sombras: golpes espaçados que aceleram até um rufo e fecham num golpe forte."""
    rng = np.random.default_rng(semente)
    f = frequencia(altura)
    i_min, m = 0.045, max(n - 1, 2)
    i0 = brentq(lambda i0: sum(i0 * (i_min / i0) ** (k / (m - 1)) for k in range(m)) - dur, i_min, dur)
    tempos = np.r_[0, np.cumsum([i0 * (i_min / i0) ** (k / (m - 1)) for k in range(m)])][:n]
    eventos = []
    for k, tk in enumerate(tempos):
        u = k / (n - 1)
        eventos.append((tk + rng.uniform(-0.003, 0.003) * (k > 0),
                        _golpe_madeira(f * (1.06 if k % 2 else 1), 0.35 + 0.5 * u ** 1.5, rng)))
    fim = tempos[-1] + 0.16
    eventos += [(fim, _golpe_madeira(f * 0.78, 1.6, rng)), (fim + 0.001, _golpe_madeira(f * 1.4, 0.7, rng, seco=1.6))]
    return _fim(mistura(eventos))


def matraca(n=14, semente=0):
    """Matraca: rajada de estalos secos de madeira (martelinhos batendo na tábua), irregular."""
    rng = np.random.default_rng(semente)
    tempos = np.cumsum(np.r_[0, 0.055 * rng.uniform(0.85, 1.15, n - 1)])
    eventos = [(tk, _golpe_madeira((1750 if k % 2 else 2150) * rng.uniform(0.95, 1.05),
                                   rng.uniform(0.6, 1.0), rng, seco=2.2)) for k, tk in enumerate(tempos)]
    return _fim(mistura(eventos))


# ───────────────────────────── membranas ─────────────────────────────

_TAMBORES = {  # f0, queda inicial, tau, modos (razão, amp, tau), golpe (lp, ganho, tau), corpo
    'surdo': (50, 0.45, 0.6, [(1.59, 0.3, 0.25), (2.14, 0.18, 0.16), (2.30, 0.12, 0.12), (2.65, 0.08, 0.08)],
              (700, 0.25, 0.012), [(95, 4, 1.5), (420, -4, 1)]),
    'alfaia': (76, 0.6, 0.32, [(1.59, 0.35, 0.14), (2.14, 0.25, 0.1), (2.65, 0.15, 0.07), (3.16, 0.1, 0.05)],
               (4000, 0.5, 0.004), [(160, 4, 2), (700, 3, 1.5)]),
    'zabumba': (64, 0.5, 0.42, [(1.59, 0.3, 0.18), (2.14, 0.2, 0.12), (2.30, 0.14, 0.09)],
                (1500, 0.35, 0.008), [(120, 4, 1.8), (2500, -3, 1)]),
}


def _membrana(f0, queda, tau, modos, golpe, corpo, rng, forca=1.0):
    """Pele de tambor: fundamental com altura caindo, modos de Bessel, ruído do golpe e ressonâncias do corpo."""
    t = _t(max(1.2, 5 * tau))
    fb = _fase(f0 * (1 + queda * forca * np.exp(-t / 0.03)))
    y = np.sin(fb) * np.exp(-t / tau)
    y += sum(a * np.sin(r * fb + rng.uniform(0, 6.3)) * np.exp(-t / tm) for r, a, tm in modos)
    lp, g, tg = golpe
    y += g * (0.5 + forca) * _filtra(rng.standard_normal(len(t)), 'lowpass', lp) * np.exp(-t / tg)
    return _fades(forca * _eq(y * _ataque(t, 0.0015), corpo), 0, 0.1)


def tambor_grave(tipo='surdo', forca=1.0, semente=0):
    """Golpe de tambor grave: 'surdo' (fundo e longo), 'alfaia' (seco, de baqueta) ou 'zabumba' (de maceta)."""
    return _fim(_membrana(*_TAMBORES[tipo], np.random.default_rng(semente), forca), fim=0.1)


def _caixa(forca, rng):
    """Um toque de caixa (pele + esteira)."""
    t = _t(0.4)
    fb = _fase(190 * (1 + 0.15 * np.exp(-t / 0.01)))
    pele = np.sin(fb) * np.exp(-t / 0.06) + 0.5 * np.sin(1.59 * fb) * np.exp(-t / 0.04) \
        + 0.3 * np.sin(2.14 * fb) * np.exp(-t / 0.03)
    esteira = _filtra(rng.standard_normal(len(t)), 'bandpass', [1800, 9000]) * np.exp(-t / 0.09)
    baqueta = _filtra(rng.standard_normal(len(t)), 'bandpass', [2000, 6000]) * np.exp(-t / 0.002)
    return _fades(forca * (0.6 * pele + (0.5 + 0.7 * forca) * esteira + 0.6 * baqueta) * _ataque(t, 0.0005), 0, 0.1)


def rufar(dur=3.0, crescendo=True, semente=0):
    """Rufo de caixa (~28 toques/s, mãos alternadas); em crescendo fecha com um acento."""
    rng = np.random.default_rng(semente)
    tempos = np.arange(0, dur, 1 / 28)
    eventos = []
    for k, tk in enumerate(tempos):
        u = tk / dur
        nivel = 0.08 + 0.92 * u ** 2 if crescendo else 0.55 * (1 + 0.15 * np.sin(2 * np.pi * 0.7 * tk))
        nivel *= (0.85 if k % 2 else 1) * rng.uniform(0.92, 1.08)
        eventos.append((tk + rng.uniform(-0.002, 0.002) * (k > 0), _caixa(nivel, rng)))
    if crescendo:
        eventos.append((dur, _caixa(1.5, rng)))
    y = mistura(eventos)
    return _fim(y, ini=0.002 if crescendo else 0.25, fim=0.1 if crescendo else 0.3)


def coracao(bpm=60, dur=8.0, semente=0):
    """Batimento cardíaco abafado ('tum-tum'), com leve irregularidade."""
    rng = np.random.default_rng(semente)
    periodo = 60 / bpm
    def baque(f, tau):
        t = _t(0.5)
        y = np.sin(_fase(f * (1 + 0.6 * np.exp(-t / 0.02)))) * np.exp(-t / tau) * _ataque(t, 0.008)
        return _fades(y + 0.25 * _filtra(rng.standard_normal(len(t)), 'lowpass', 150) * np.exp(-t / 0.03), 0, 0.05)
    eventos = []
    for tk in np.arange(0, dur - 0.5, periodo):
        tk += rng.uniform(-0.015, 0.015) * periodo
        g = rng.uniform(0.9, 1.0)
        eventos += [(max(tk, 0), baque(52, 0.09), g), (max(tk, 0) + 0.3 * np.sqrt(periodo), baque(60, 0.06), 0.7 * g)]
    return _fim(_filtra(mistura(eventos), 'lowpass', 260, 4))


def inhambu(semente=0):
    """Pio de inhambu (Crypturellus): série de assobios puros e chorosos que sobem de leve e aceleram."""
    rng = np.random.default_rng(semente)
    n_pios = int(rng.integers(4, 7))
    f0 = rng.uniform(1450, 1650)
    eventos, tk = [], 0.0
    for i in range(n_pios):
        dur = rng.uniform(0.30, 0.42) * (1 - 0.06 * i)
        t = _t(dur)
        alvo = f0 * (1.04 + 0.025 * i)
        f = f0 * (1 + 0.025 * i) + (alvo - f0 * (1 + 0.025 * i)) * np.sin(np.pi / 2 * t / dur) \
            + 9 * np.sin(2 * np.pi * rng.uniform(5, 7) * t)
        env = _ataque(t, 0.04) * (1 - _ataque(np.maximum(t - dur + 0.12, 0), 0.12))
        y = np.sin(_fase(f)) + 0.04 * np.sin(2 * _fase(f))
        sopro = _filtra(rng.standard_normal(len(t)), 'bandpass', (f0 * 0.8, f0 * 1.6)) * 0.05
        eventos.append((tk, (y + sopro) * env, 1.0 - 0.05 * i))
        tk += dur + rng.uniform(0.42, 0.6) * (1 - 0.08 * i)
    return _fim(mistura(eventos))


def drone(dur=20.0, nota='D2', tensao=0.3, semente=0):
    """Drone grave evolutivo para noite e tensão: vozes desafinadas com batimentos e filtro que respira; tensao 0..1 traz 2ª menor e trítono."""
    rng = np.random.default_rng(semente)
    f = frequencia(nota)
    n = _n(dur)
    t = np.arange(n) / SR
    largura = 1 + 4 * tensao
    vozes = [(1, 0, 1), (1, 4, 0.8), (1, -6, 0.8), (2, 3, 0.45), (1.5, -2, 0.3)]
    vozes += [(2 * 2 ** (1 / 12), 0, 0.45 * tensao), (2 ** 0.5, 3, 0.35 * tensao)]
    corte = f * (3.5 + 3 * (1 + tensao) * (0.5 + 0.5 * _lento(rng, n, 0.06 + 0.1 * tensao)))
    y = np.zeros(n)
    for r, cents, g in vozes:
        if g <= 0:
            continue
        fv = f * r * 2 ** (cents * largura / 1200) * (1 + 0.0015 * _lento(rng, n, 0.1))
        fase = _fase(fv) + rng.uniform(0, 6.3)
        for k in range(1, int(2200 / (f * r)) + 1):
            y += g * k ** -1.1 / np.sqrt(1 + (k * fv / corte) ** 4) * np.sin(k * fase)
    y *= 1 + (0.1 + 0.15 * tensao) * _lento(rng, n, 0.15 + 0.6 * tensao)    # respiração
    vento = _filtra(rng.standard_normal(n), 'bandpass', [150, 900], 4)
    y += 0.12 * y.std() / vento.std() * vento * (0.5 + 0.5 * _lento(rng, n, 0.1))
    return _fim(y, ini=min(2.0, dur / 4), fim=min(2.5, dur / 4))


# ───────────────────────────── instrumentos melódicos (reserva) ─────────────────────────────

_rr = np.random.default_rng(1560)
_CORPO_RABECA = [(290, 9, 4), (470, 4, 3), (1400, -4, 1.5), (2500, 7, 1.4), (3500, 3, 2.5)] + list(zip(
    np.exp(_rr.uniform(np.log(350), np.log(5000), 10)), _rr.uniform(-4, 6, 10), _rr.uniform(6, 14, 10)))


def rabeca(nota, dur, dinamica='mf', vibrato=1.0, portamento_de=None, semente=0):
    """Rabeca: arco (dente de serra com entalhes) + ruído de crina no deslize, corpo nasal, vibrato humano e portamento."""
    rng = np.random.default_rng(semente)
    d, f = _din(dinamica), frequencia(nota)
    n = _n(dur + 0.2)
    t = np.arange(n) / SR
    lf = np.full(n, np.log2(f))
    tp = 0.0
    if portamento_de is not None:
        tp = min(0.22, 0.45 * dur)
        u = np.clip(t / tp, 0, 1)
        lf += (np.log2(frequencia(portamento_de)) - np.log2(f)) * (1 - u * u * (3 - 2 * u))
    entrada = np.clip((t - tp - 0.15) / 0.45, 0, 1) ** 2                       # vibrato entra depois do ataque
    prof = vibrato * 0.22 / 12 * (1 + 0.3 * _lento(rng, n, 1.7)) * entrada
    lf += prof * np.sin(_fase(5.5 + 0.5 * _lento(rng, n, 1.3)))
    lf += 0.05 / 12 * _lento(rng, n, 0.7) + 0.03 / 12 * _lento(rng, n, 30)  # deriva e tremor do arco
    lf += 0.2 / 12 * rng.choice([-1, 1]) * np.exp(-t / 0.025)                # o arco pega a corda meio instável
    freq = 2 ** lf
    fase = _fase(freq)
    beta = 0.11 + 0.01 * rng.uniform(-1, 1)                                   # posição do arco
    corte = 1800 + 5000 * d
    onda = np.zeros(n)
    for k in range(1, int(16000 / freq.max()) + 1):
        onda += (0.55 + 0.45 * abs(np.sin(np.pi * k * beta))) / k * np.exp(-k * f / corte) * np.sin(k * fase)
    pulso = ((1 + np.cos(fase)) / 2) ** 8                                     # instante do deslize, a cada período
    crina = _filtra(rng.standard_normal(n), 'bandpass', [1200, 7000])
    ruido = crina / crina.std() * (0.16 * pulso + 0.035) * (1.25 - 0.4 * d)
    ataque = 0.1 - 0.06 * d
    env = 0.5 - 0.5 * np.cos(np.pi * np.clip(t / ataque, 0, 1))
    env *= (1 + 0.12 * np.sin(np.pi * np.clip(t / dur, 0, 1))) * (1 + 0.04 * _lento(rng, n, 8))
    env *= np.where(t < dur, 1, np.exp(-(t - dur) / 0.045))
    raspa = _filtra(rng.standard_normal(n), 'bandpass', [800, 5000]) * np.exp(-t / 0.035) * 0.25 * d
    x = _eq(env * (onda + ruido) + raspa, _CORPO_RABECA)
    x = _filtra(_filtra(x, 'highpass', 170), 'lowpass', 8000, 4)
    return _fim(x, ganho=d, ini=0.003, fim=0.03)


def pifano(nota, dur, dinamica='mf', vibrato=0.5, semente=0):
    """Pífano: sopro agudo de taquara com muito ar, 'chiff' de ataque, harmônicos fracos e vibrato leve."""
    rng = np.random.default_rng(semente)
    d, f = _din(dinamica), frequencia(nota)
    n = _n(dur + 0.12)
    t = np.arange(n) / SR
    lf = np.log2(f) - 0.35 / 12 * np.exp(-t / 0.03)                          # entra baixo e sobe (língua)
    lf += vibrato * 0.15 / 12 * np.sin(_fase(5.0 + 0.4 * _lento(rng, n, 1))) * np.clip((t - 0.2) / 0.3, 0, 1)
    lf += 0.06 / 12 * _lento(rng, n, 0.8) + 0.02 / 12 * _lento(rng, n, 20)
    fase = _fase(2 ** lf)
    chiff = np.exp(-t / 0.025)
    harm = [(1, 1), (2, 0.22 + 0.15 * d), (3, 0.05 + 0.12 * d), (4, 0.04), (5, 0.03 * d)]
    tom = sum(a * (1 + 2.5 * chiff * (k > 1)) * np.sin(k * fase) for k, a in harm)
    tom += 0.1 * _banda_estreita(rng, fase, 150) + 0.04 * _banda_estreita(rng, 2 * fase, 200)
    sopro = _filtra(rng.standard_normal(n), 'bandpass', [1500, 9000], 4)
    sopro *= 0.045 / sopro.std() * (1 + 3 * chiff)
    env = 0.5 - 0.5 * np.cos(np.pi * np.clip(t / (0.035 - 0.015 * d), 0, 1))
    env *= (1 + 0.06 * _lento(rng, n, 8)) * np.where(t < dur, 1, np.exp(-(t - dur) / 0.03))
    return _fim(_filtra(env * (tom + sopro), 'lowpass', 12000), ganho=d, ini=0.002, fim=0.02)


def _corda(f, n, t60, brilho, exc):
    """Karplus-Strong (lfilter): atraso fracionário + filtro de perda; brilho 0..1."""
    s = 0.5 + 0.49 * brilho
    L = int(SR / f - (1 - s))
    fr = SR / f - (1 - s) - L
    a = np.zeros(L + 3)
    a[0] = 1
    a[L:] -= 10 ** (-3 / (t60 * f)) * np.convolve([1 - fr, fr], [s, 1 - s])
    x = np.zeros(n)
    x[:len(exc)] = exc[:n]
    return signal.lfilter([1.0], a, x)


def viola_caipira(nota, dur, dinamica='mf', semente=0):
    """Viola caipira: par de cordas (uníssono levemente desafinado, ou oitava nos bordões) ponteadas quase juntas; abafa após dur."""
    rng = np.random.default_rng(semente)
    d, f = _din(dinamica), frequencia(nota)
    n = _n(dur + 0.3)
    t60 = float(np.clip(3.0 * (220 / f) ** 0.5, 1.0, 6.0))
    par = (2 * f * 2 ** (1.5 / 1200), 0.55, 0.007) if f < 250 else (f * 2 ** (2.5 / 1200), 0.85, 0.006)
    y = np.zeros(n)
    for fc, g, atraso in [(f, 1.0, 0.0), par]:
        L = int(SR / fc)
        exc = _filtra(rng.standard_normal(L + 64), 'lowpass', 1500 + 6000 * d)[64:]
        exc = exc - np.r_[np.zeros(int(0.13 * L)), exc][:L]                   # posição da palheta
        exc = _fades(exc, 0.0002, 0.0002)
        k = _n(atraso)
        y[k:] += g * _corda(fc, n - k, t60, 0.35 + 0.4 * d, exc)
        y[k:k + 480] += 0.04 * d * _filtra(rng.standard_normal(480), 'bandpass', [2000, 8000]) * np.exp(-np.arange(480) / 96)
    t = np.arange(n) / SR
    y *= np.where(t < dur, 1, np.exp(-(t - dur) / 0.06))
    y = _eq(y, [(105, 6, 2), (215, 5, 2.5), (420, 3, 2), (2600, 2, 1.5)])
    return _fim(_filtra(y, 'highpass', 70), ganho=d, ini=0.0005)


def _ressonancia_movel(x, fc, q):
    """Passa-banda ressonante com centro variando no tempo (coeficientes trocados a cada 64 amostras)."""
    y, zi = np.empty_like(x), np.zeros((1, 2))
    for i in range(0, len(x), 64):
        sos = signal.butter(1, [fc[i] * (1 - 0.5 / q), fc[i] * (1 + 0.5 / q)], 'bandpass', fs=SR, output='sos')
        y[i:i + 64], zi = signal.sosfilt(sos, x[i:i + 64], zi=zi)
    return y


def caxixi(forca=1.0, semente=0):
    """Caxixi: chocalho de palha com sementes — 'tchi' granulado."""
    rng = np.random.default_rng(semente)
    t = _t(0.3)
    dens = 0.35 * np.exp(-((t - 0.015) / 0.035) ** 2)
    graos = (rng.random(len(t)) < dens) * rng.uniform(0, 1, len(t)) * np.sqrt(dens / dens.max())  # sementes finais assentam mais leves
    graos = np.convolve(graos, np.hanning(48), 'same') * rng.standard_normal(len(t))  # cada grão: ~1 ms de chiado
    y = _filtra(graos, 'bandpass', [2800, 11000], 4) + 0.15 * _filtra(graos, 'bandpass', [250, 600])
    return _fim(forca * y * _ataque(t, 0.001), ganho=forca, fim=0.05)


def berimbau(nota='A2', dur=1.4, dobrao='solto', com_caxixi=False, dinamica='mf', semente=0):
    """Berimbau: arame batido pela baqueta, cabaça abrindo (formante que sobe) e dobrão 'solto', 'preso' (+1 tom) ou 'zum' (chiado)."""
    rng = np.random.default_rng(semente)
    d, f = _din(dinamica), frequencia(nota)
    f *= {'solto': 1, 'preso': 2 ** (2 / 12), 'zum': 2 ** (0.7 / 12)}[dobrao]
    n = _n(dur + 0.2)
    t = np.arange(n) / SR
    L = int(SR / f)
    exc = np.zeros(L)
    exc[:40] = _filtra(rng.standard_normal(40 + 64), 'bandpass', [400, 5000])[64:] * np.hanning(40)  # baqueta: ~1 ms de contato
    corda = _corda(f, n, 1.6 if dobrao == 'solto' else 0.8, 0.6, exc)
    if dobrao == 'zum':                                                       # arame batendo no dobrão
        lim = 0.3 * np.abs(corda).max()
        toque = np.maximum(corda - lim, 0)
        corda = corda - 0.85 * toque + 0.6 * np.sqrt(toque * lim) * _filtra(rng.standard_normal(n), 'highpass', 2500)
    fc = 420 + 530 * (1 - np.exp(-t / 0.18))                                  # a cabaça se afasta da barriga
    y = 0.12 * _filtra(corda, 'lowpass', 3000) + _ressonancia_movel(_ressonancia_movel(corda, fc, 4), fc, 4)
    y *= np.where(t < dur, 1, np.exp(-(t - dur) / 0.05))
    y = _filtra(y, 'highpass', 80)
    if com_caxixi:
        y = mistura([(0, y), (0, caxixi(0.8, semente), 0.25 * np.abs(y).max())])
    return _fim(y, ganho=d, ini=0.0005)


# ───────────────────────────── sanfona (palhetas livres) ─────────────────────────────

_REGISTROS = {  # (desvio em cents, ganho, oitava) de cada palheta tocando junto
    'seco': [(0, 1.0, 0)],
    'tremolo': [(0, 1.0, 0), (11, 0.85, 0)],
    'musette': [(0, 1.0, 0), (13, 0.8, 0), (-13, 0.8, 0)],
    'baixo': [(0, 1.0, 0), (4, 0.6, -1), (-3, 0.45, 1)],     # botão de baixo: palhetas em oitavas
}


def sanfona(nota, dur, dinamica='mf', registro=None, semente=0):
    """Sanfona/acordeom: palhetas livres (onda rica em harmônicos, com a ressonância da câmara de palheta),
    registro 'musette'/'tremolo' (palhetas desafinadas de propósito → batimento), entrada da palheta
    levemente baixa e rouca, fole que cresce e respira, ruído de ar e de válvula. Abaixo de Fá3 usa o
    registro 'baixo' (palhetas em oitavas). Mais forte = mais brilhante."""
    rng = np.random.default_rng(semente)
    d, f = _din(dinamica), frequencia(nota)
    registro = registro or ('baixo' if f < 175 else 'tremolo')
    n = _n(dur + 0.15)
    t = np.arange(n) / SR
    corte = (1800 + 3500 * d) * (0.6 if registro == 'baixo' else 1.0)      # pressão do fole abre os agudos
    f_form, g_form, incl = (450, 1.5, 1.0) if registro == 'baixo' else (1300, 0.5, 0.75)  # câmara (medida nas amostras)
    y = np.zeros(n)
    for cents, g, oit in _REGISTROS[registro]:
        fr = f * 2 ** (oit + cents / 1200)
        atraso = rng.uniform(0, 0.012)
        lf = np.log2(fr) - 0.1 / 12 * np.exp(-np.maximum(t - atraso, 0) / 0.03)   # a palheta entra baixa
        lf += 0.02 / 12 * _lento(rng, n, 0.6)
        fase = _fase(2 ** lf)
        onda = np.zeros(n)
        for k in range(1, int(12000 / fr) + 1):
            hk = k * fr
            a = (1 + (hk / 500) ** 2) ** -incl * (1 + g_form * np.exp(-np.log2(hk / f_form) ** 2 / 0.5))  # −12 dB/oit
            a *= hk / np.sqrt(hk ** 2 + 400 ** 2) / np.sqrt(1 + (hk / corte) ** 4)  # palheta pequena: pouco grave
            onda += a * np.sin(k * fase + rng.uniform(0, 6.3))
        env_p = np.clip((t - atraso) / 0.004, 0, 1)
        y += g * onda * env_p
    y /= np.abs(y).max() + 1e-12
    rouco = _filtra(rng.standard_normal(n), 'bandpass', [900, 4500]) * np.exp(-t / 0.03)
    ar = _filtra(rng.standard_normal(n), 'bandpass', [500, 3500])
    y += 0.12 * rouco / (rouco.std() + 1e-12) * np.exp(-t / 0.015) + 0.0025 * ar / (ar.std() + 1e-12)
    ataque = 0.09 - 0.05 * d
    fole = 0.5 - 0.5 * np.cos(np.pi * np.clip(t / ataque, 0, 1))
    fole *= 1 + 0.08 * np.sin(np.pi * np.clip(t / max(dur, 0.1), 0, 1)) + 0.03 * _lento(rng, n, 0.8)
    fole *= np.where(t < dur, 1, np.exp(-(t - dur) / 0.04))
    clique = _filtra(rng.standard_normal(n), 'highpass', 1500) * np.exp(-t / 0.002) * 0.15 * d
    y = _eq(y * fole + clique, [(6000, -6, 1)])
    return _fim(_filtra(y, 'highpass', 60), ganho=d, ini=0.002, fim=0.03)


def musette(x, cents=12.0):
    """Engrossa uma amostra de sanfona de palheta única: soma cópias afinadas ±cents (o batimento da musette)."""
    x = np.asarray(x, float)
    out = x.copy()
    for c, g in ((cents, 0.7), (-cents, 0.6)):
        r = Fraction(2 ** (-c / 1200)).limit_denominator(2000)
        y = signal.resample_poly(x, r.numerator, r.denominator)
        m = min(len(out), len(y))
        out[:m] += g * y[:m]
    return out / 2.3
