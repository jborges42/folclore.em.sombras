"""Motor de mixagem e masterização da trilha do Curupira (numpy/scipy, float32, 48 kHz).

Convenções: áudio mono = array 1-D; estéreo = array (n, 2). Tempos em segundos; ganhos em dB.
"""
import subprocess
from fractions import Fraction
from functools import lru_cache
from math import gcd
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy.ndimage import maximum_filter1d, minimum_filter1d, uniform_filter1d
from scipy.signal import butter, oaconvolve, resample_poly, sosfilt

SR = 48000
AQUI = Path(__file__).resolve().parent
FFMPEG = AQUI.parent / "bin" / "ffmpeg"
MASTER_WAV = AQUI / "master.wav"
MP3 = AQUI.parent.parent / "audio" / "curupira.mp3"


def db(v):
    return np.float32(10 ** (np.asarray(v, np.float64) / 20))


# ---------------------------------------------------------------- arquivos e altura

@lru_cache(maxsize=None)
def carregar(caminho):
    """Lê um arquivo de áudio (com cache) e reamostra para 48 kHz. Mantém mono (1-D) ou estéreo (n, 2).
    O array devolvido é somente leitura (é compartilhado pelo cache)."""
    x, sr = sf.read(str(caminho), dtype="float32", always_2d=True)
    x = x[:, :1] if x.shape[1] == 1 else x[:, :2]
    if sr != SR:
        g = gcd(sr, SR)
        x = resample_poly(x, SR // g, sr // g, axis=0).astype(np.float32)
    x = x[:, 0] if x.shape[1] == 1 else x
    x.flags.writeable = False
    return x


def transpor(x, semitons):
    """Muda a altura por reamostragem (como acelerar a fita: a duração muda junto)."""
    if abs(semitons) < 1e-3:
        return x
    f = Fraction(2 ** (-semitons / 12)).limit_denominator(100)
    return resample_poly(x, f.numerator, f.denominator, axis=0).astype(np.float32)


def passa_baixa(x, hz, ordem=2):
    """Passa-baixa Butterworth: som distante perde os agudos."""
    return sosfilt(butter(ordem, hz, fs=SR, output="sos"), x, axis=0).astype(np.float32)


# ---------------------------------------------------------------- faixa e camas

def _fades(x, fade_in, fade_out):
    """Fades de potência constante (seno/cosseno), no próprio array."""
    for dur, entrada in ((fade_in, True), (fade_out, False)):
        k = min(int(dur * SR), len(x))
        if k > 1:
            u = np.linspace(0, np.pi / 2, k, dtype=np.float32)
            c = np.sin(u) if entrada else np.cos(u)
            c = c[:, None] if x.ndim == 2 else c
            if entrada:
                x[:k] *= c
            else:
                x[-k:] *= c
    return x


class Faixa:
    """Barramento estéreo float32 com duração fixa."""

    def __init__(self, dur):
        self.x = np.zeros((int(round(dur * SR)), 2), np.float32)

    def colocar(self, x, t, ganho_db=0.0, pan=0.0, fade_in=0.0, fade_out=0.0):
        """Soma x a partir do instante t. Mono: pan de potência constante (−3 dB no centro).
        Estéreo: balanço. pan em [−1, 1]. Trechos fora da faixa são cortados."""
        x = np.asarray(x, np.float32)
        if x.ndim == 1:
            a = (pan + 1) * np.pi / 4
            x = x[:, None] * np.array([np.cos(a), np.sin(a)], np.float32)
        else:
            x = x * np.array([min(1, 1 - pan), min(1, 1 + pan)], np.float32)
        x = _fades(x * db(ganho_db), fade_in, fade_out)
        i = int(round(t * SR))
        a0, a1 = max(0, -i), min(len(x), len(self.x) - i)
        if a1 > a0:
            self.x[i + a0:i + a1] += x[a0:a1]


def cama(x, dur, xfade=3.0, deslocamento=0):
    """Ambiência em loop sem emenda pela duração pedida: o fim do arquivo é fundido ao começo
    (crossfade de potência constante). Fonte mono vira pseudo-estéreo (canal direito defasado
    meio laço, −3 dB por canal: mesma loudness). `deslocamento` (amostras) escolhe o ponto de partida."""
    x = np.asarray(x, np.float32)
    nx = min(int(xfade * SR), len(x) // 3)
    u = np.linspace(0, np.pi / 2, nx, dtype=np.float32)
    if x.ndim == 2:
        u = u[:, None]
    laco = x[:len(x) - nx].copy()
    laco[:nx] = x[:nx] * np.sin(u) + x[len(x) - nx:] * np.cos(u)
    if laco.ndim == 1:
        laco = np.stack([laco, np.roll(laco, len(laco) // 2)], 1) * np.float32(np.sqrt(0.5))
    n = int(round(dur * SR))
    off = deslocamento % len(laco)
    return np.tile(laco, ((n + off) // len(laco) + 1, 1))[off:off + n]


# ---------------------------------------------------------------- reverb por convolução

ESPACOS = {
    # sala de teatro discreta (voz)
    "sala": dict(rt60=0.45, pre=0.006, brilho=6000, largura=0.5, ecos=()),
    # espaço amplo / mata (música e efeitos)
    "mata": dict(rt60=2.2, pre=0.022, brilho=4000, largura=1.0, ecos=()),
    # eco de mata: cauda longa e repetições escuras vindas de longe (chamados distantes)
    "eco": dict(rt60=2.8, pre=0.035, brilho=2800, largura=1.0,
                ecos=((0.21, -5), (0.46, -9), (0.79, -14), (1.17, -20))),
}


@lru_cache(maxsize=None)
def ir(espaco):
    """Resposta ao impulso sintética estéreo: ruído com decaimento exponencial (−60 dB em rt60),
    que escurece com o tempo; ecos discretos opcionais. Energia normalizada."""
    p = ESPACOS[espaco]
    n = int((1.1 * p["rt60"] + max((e[0] for e in p["ecos"]), default=0)) * SR)
    t = np.arange(n, dtype=np.float32)[:, None] / SR
    r = np.random.default_rng(7).standard_normal((n, 2)).astype(np.float32)
    r[:, 1] = p["largura"] * r[:, 1] + (1 - p["largura"]) * r[:, 0]
    claro, escuro = (passa_baixa(r, f) for f in (p["brilho"], p["brilho"] / 4))
    claro, escuro = claro / claro.std(), escuro / escuro.std()
    w = np.exp(-t / (p["rt60"] / 4))
    cauda = (w * claro + (1 - w) * escuro) * 10 ** (-3 * t / p["rt60"])
    h = np.zeros_like(cauda)
    k = int(p["pre"] * SR)
    h[k:] = cauda[:n - k]
    for atraso, g in p["ecos"]:
        d = int(atraso * SR)
        h[d:] += passa_baixa(cauda[:n - d], p["brilho"] / 2) * db(g)
    return (h / np.sqrt((h ** 2).sum() / 2)).astype(np.float32)


def reverb(x, espaco):
    """Sinal molhado (só o reverb), estéreo, com len(x) + len(ir) − 1 amostras."""
    h = ir(espaco)
    x = x[:, None] if x.ndim == 1 else x
    return np.stack([oaconvolve(x[:, min(c, x.shape[1] - 1)], h[:, c]) for c in (0, 1)], 1).astype(np.float32)


# ---------------------------------------------------------------- dinâmica

def _potencia(x):
    """Potência instantânea; no estéreo, soma dos canais (como na BS.1770)."""
    return np.square(x, dtype=np.float32) if x.ndim == 1 else np.square(x, dtype=np.float32).sum(axis=1)


def _nivel_db(x, hop, janela):
    """Nível RMS (dB) em quadros de `hop` amostras, janela em segundos."""
    p = uniform_filter1d(_potencia(x), max(1, int(janela * SR)))[::hop]
    return 10 * np.log10(p + 1e-10)


def seguidor(alvo, ataque, liberacao, hop):
    """Envelope seguidor por quadro: sobe com constante `ataque`, desce com `liberacao` (s)."""
    ca, cl = np.exp(-hop / (SR * ataque)), np.exp(-hop / (SR * liberacao))
    y = np.empty(len(alvo), np.float32)
    v = 0.0
    for i, a in enumerate(alvo.tolist()):
        v = a + (ca if a > v else cl) * (v - a)
        y[i] = v
    return y


def _por_amostra(v, hop, n):
    return np.interp(np.arange(n, dtype=np.float64), np.arange(len(v)) * hop, v).astype(np.float32)


def _comprimir(x, limiar_db, razao, ataque, liberacao, joelho=6.0, hop=48, janela=0.01):
    """Compressor RMS com joelho suave (x mono)."""
    acima = _nivel_db(x, hop, janela) - limiar_db
    k = 1 - 1 / razao
    gr = np.where(acima <= -joelho / 2, 0.0,
                  np.where(acima >= joelho / 2, k * acima, k * (acima + joelho / 2) ** 2 / (2 * joelho)))
    gr = seguidor(gr, ataque, liberacao, hop)
    return x * db(-_por_amostra(gr, hop, len(x)))


def _de_esser(x, limiar_db=-32.0, razao=3.0, maximo=8.0, corte=5500, hop=48):
    """Reduz só a banda das sibilantes (> `corte` Hz) quando ela passa do limiar."""
    sib = sosfilt(butter(2, corte, "highpass", fs=SR, output="sos"), x).astype(np.float32)
    gr = np.clip((_nivel_db(sib, hop, 0.003) - limiar_db) * (1 - 1 / razao), 0, maximo)
    gr = seguidor(gr, 0.001, 0.04, hop)
    return x - sib * (1 - db(-_por_amostra(gr, hop, len(x))))


def ducking(fundo, chave, profundidade_db, ataque=0.08, liberacao=0.5, segurar=0.6, limiar_db=-45.0, hop=480):
    """Sidechain: abaixa `fundo` em até `profundidade_db` enquanto `chave` (a voz) soa.
    A redução antecipa `ataque` s, se mantém `segurar` s nas pausas curtas entre frases
    (evita o "bombear") e volta com `liberacao`."""
    alvo = profundidade_db * np.clip((_nivel_db(chave, hop, 0.05) - limiar_db) / 6, 0, 1)
    L, H = max(1, int(ataque * SR / hop)), int(segurar * SR / hop)
    alvo = maximum_filter1d(alvo, H + L + 1, origin=H - (H + L + 1) // 2)
    g = db(-_por_amostra(seguidor(alvo, ataque, liberacao, hop), hop, len(fundo)))
    return fundo * (g[:, None] if fundo.ndim == 2 else g)


def abaixar(x, trechos, ataque=0.08, liberacao=0.5, hop=480):
    """Automação de volume (o técnico "segurando o fader"): reduz x em `red_db` dentro de cada
    (inicio, fim, red_db), com rampa iniciada 3×`ataque` antes e volta com `liberacao`."""
    alvo = np.zeros(len(x) // hop + 1, np.float32)
    for ini, fim, red in trechos:
        a, b = max(0, int((ini - 3 * ataque) * SR / hop)), int(fim * SR / hop) + 1
        alvo[a:b] = np.maximum(alvo[a:b], red)
    g = db(-_por_amostra(seguidor(alvo, ataque, liberacao, hop), hop, len(x)))
    return x * (g[:, None] if x.ndim == 2 else g)


# ---------------------------------------------------------------- loudness

_MEDIDOR = pyln.Meter(SR)
_K = np.vstack([np.concatenate([f.b, f.a]) for f in _MEDIDOR._filters.values()])  # ponderação K


def lufs(x):
    """Loudness integrada (BS.1770). Trechos < 0,4 s: média K-ponderada sem gate."""
    if len(x) < 0.4 * SR:
        return float(10 * np.log10(_potencia(sosfilt(_K, x, axis=0)).mean() + 1e-12) - 0.691)
    return float(_MEDIDOR.integrated_loudness(x))


def lufs_curto_max(x):
    """Maior loudness em janela de 400 ms (K-ponderada): escala perceptiva para efeitos pontuais."""
    p = _potencia(sosfilt(_K, x, axis=0).astype(np.float32))
    return float(10 * np.log10(uniform_filter1d(p, min(len(p), int(0.4 * SR))).max() + 1e-12) - 0.691)


def normalizar(x, alvo_lufs):
    l = lufs(x)
    return x if not np.isfinite(l) else x * db(alvo_lufs - l)


# ---------------------------------------------------------------- locução

# Ajustes por papel: grave (prateleira em 140 Hz, "calor"), presença (pico em 4,2 kHz),
# lufs (nível da fala antes do master), sala (envio da ambiência de sala, dB).
VOZ_PADRAO = dict(grave=1.0, presenca=2.0, lufs=-20.0, sala=-22.0)
VOZ = {
    "narrador": dict(grave=1.5, presenca=2.0),
    "vo": dict(grave=0.5, presenca=1.5),
    "curupira": dict(grave=-0.5, presenca=2.5),
}


def _biquad(tipo, f0, ganho_db, q=0.707):
    """Biquad RBJ ('pico', 'graves' ou 'agudos') como linha sos."""
    A, w = 10 ** (ganho_db / 40), 2 * np.pi * f0 / SR
    al, c = np.sin(w) / (2 * q), np.cos(w)
    if tipo == "pico":
        b, a = [1 + al * A, -2 * c, 1 - al * A], [1 + al / A, -2 * c, 1 - al / A]
    else:
        s, r = (1 if tipo == "agudos" else -1), 2 * np.sqrt(A) * al
        b = [A * ((A + 1) + s * (A - 1) * c + r), -2 * s * A * ((A - 1) + s * (A + 1) * c),
             A * ((A + 1) + s * (A - 1) * c - r)]
        a = [(A + 1) - s * (A - 1) * c + r, 2 * s * ((A - 1) - s * (A + 1) * c), (A + 1) - s * (A - 1) * c - r]
    return np.array(b + a) / a[0]


def masterizar_voz(x, papel="narrador"):
    """Cadeia de locução de estúdio: passa-alta 70 Hz → EQ (calor, menos "embolado" em 320 Hz,
    presença, ar) → de-esser → compressão 2,5:1 → ganho de compensação até o LUFS do papel →
    ambiência de sala discretíssima. Devolve estéreo com len(x) + cauda da sala."""
    p = {**VOZ_PADRAO, **VOZ.get(papel, {})}
    x = np.asarray(x, np.float32)
    x = x.mean(axis=1) if x.ndim == 2 else x
    x = sosfilt(butter(4, 70, "highpass", fs=SR, output="sos"), x).astype(np.float32)
    x = normalizar(x, -23.0)  # referência fixa para os limiares absolutos abaixo
    eq = np.vstack([_biquad("graves", 140, p["grave"]), _biquad("pico", 320, -1.5, 1.0),
                    _biquad("pico", 4200, p["presenca"], 0.8), _biquad("agudos", 11000, 1.0)])
    x = sosfilt(eq, x).astype(np.float32)
    x = _de_esser(x)
    x = _comprimir(x, -26.0, 2.5, 0.010, 0.150)  # 2–6 dB de redução nas sílabas fortes
    x = normalizar(x, p["lufs"])
    x = _fades(x.copy(), 0.003, 0.010)
    molhado = reverb(x, "sala") * db(p["sala"])
    molhado[:len(x)] += x[:, None] * np.float32(np.sqrt(0.5))  # seco no centro (mesma lei de pan da Faixa)
    return molhado


# ---------------------------------------------------------------- master

def pico_verdadeiro(x):
    """Pico verdadeiro em dBTP (oversampling 4x)."""
    x = x[:, None] if x.ndim == 1 else x
    m = max(float(np.abs(resample_poly(x[:, c], 4, 1)).max()) for c in range(x.shape[1]))
    return 20 * np.log10(m + 1e-12)


def limitar(x, teto_db=-1.0, ataque=0.005, segurar=0.05):
    """Limitador de pico verdadeiro (detecção com oversampling 4x) com antecipação.
    O mínimo em janela de `segurar` cobre a média de `ataque`, então o ganho já está
    no lugar quando o pico chega e nunca passa do necessário."""
    pico = np.max([np.abs(resample_poly(x[:, c], 4, 1)).reshape(-1, 4).max(axis=1)
                   for c in range(x.shape[1])], axis=0)
    g = np.minimum(1.0, db(teto_db) / np.maximum(pico, 1e-9)).astype(np.float32)
    g = uniform_filter1d(minimum_filter1d(g, int(segurar * SR)), int(ataque * SR))
    return x * g[:, None]


def masterizar(mix, wav=MASTER_WAV, mp3=MP3, alvo_lufs=-16.0, teto_db=-1.0):
    """Normaliza para `alvo_lufs` integrados, limita em `teto_db` dBTP e exporta WAV 24 bits + MP3 192 kbps."""
    for _ in range(3):  # o limitador come um pouco de loudness; 3 passadas convergem
        mix = limitar(mix * db(alvo_lufs - lufs(mix)), teto_db - 0.1)
    Path(wav).parent.mkdir(parents=True, exist_ok=True)
    Path(mp3).parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(wav), mix, SR, subtype="PCM_24")
    subprocess.run([str(FFMPEG), "-y", "-loglevel", "error", "-i", str(wav),
                    "-c:a", "libmp3lame", "-b:a", "192k", str(mp3)], check=True)
    return mix


if __name__ == "__main__":  # autoverificação: .venv/bin/python trilha/motor.py
    r = np.random.default_rng(0)
    seno = np.sin(2 * np.pi * 220.3 * np.arange(5 * SR) / SR).astype(np.float32)
    laco = cama(seno, 20.0, xfade=1.0)
    assert laco.shape == (20 * SR, 2) and np.abs(np.diff(laco, axis=0)).max() < 1.5 * np.abs(np.diff(seno)).max()
    f = Faixa(1.0)
    f.colocar(np.ones(100, np.float32), -0.5e-3, fade_in=0)  # começa antes do zero: corta sem erro
    f.colocar(np.ones(100, np.float32), 0.5)
    assert np.allclose(f.x[24000], np.sqrt(0.5)) and np.allclose(f.x[:52], np.sqrt(0.5))
    assert abs(len(transpor(seno, 12)) - len(seno) / 2) <= 1
    ruido = (r.standard_normal((10 * SR, 2)) * 0.5).astype(np.float32)
    assert pico_verdadeiro(limitar(ruido, -1.0)) <= -0.95
    chave = np.zeros(10 * SR, np.float32)
    chave[3 * SR:6 * SR] = 0.1
    d = ducking(np.ones((10 * SR, 2), np.float32), chave, 10.0)
    assert np.isclose(d[5 * SR, 0], db(-10), rtol=0.02) and np.isclose(d[9 * SR, 0], 1, rtol=0.02)
    v = masterizar_voz((r.standard_normal(3 * SR) * 0.05).astype(np.float32))
    assert v.shape[1] == 2 and abs(lufs(v[:3 * SR]) - VOZ["narrador"].get("lufs", VOZ_PADRAO["lufs"])) < 0.5
    print("motor ok")
