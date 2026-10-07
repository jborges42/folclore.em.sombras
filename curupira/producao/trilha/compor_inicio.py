"""Trilha do grupo "início": cenas abertura, mata e guardiao (versão 2: linguagem brasileira, sem cor oriental).

Uso (da pasta producao/):  .venv/bin/python trilha/compor_inicio.py [cena ...]
Grava trilha/stems/<cena>.wav (estéreo float, 48 kHz, começa em cena.inicio e dura a cena + 4 s de cauda) e,
em trilha/previas/, <cena>.mp3 e <cena>.png (espectrograma e nível, com as falas sombreadas e as deixas);
imprime a tabela de deixas (alvo × batida), a cobertura dos sfx musicais do roteiro e o nível por beat.

compor(cena_id, linha) lê os tempos da linha do tempo em tempo de execução, nunca segundos fixos. Cada frase
se ancora no início de um beat ou num sfx do roteiro, e o andamento entre duas âncoras se ajusta (poucos %)
para a frase cair no lugar, como o regente que acompanha o narrador.

Versão 2 (LINGUAGEM_MUSICAL.md): do teatro de sombras fica só a atmosfera; o som é brasileiro. Melodia na
rabeca, na viola caipira ou na sanfona; a cuíca é a voz do Curupira; pontuação com alfaia, surdo, zabumba,
caixa, prato de banda, matraca de bumba-meu-boi, gonguê e triângulo. Nada de flauta, pífano, gongo ou bloco
de madeira (temas.PROIBIDOS; main() confere). As etiquetas antigas do roteiro tocam a FUNÇÃO
(temas.ETIQUETAS_ANTIGAS): gongo_sobe = subida, gongo_grave = pontuação (BÃO), gongo_desce = descida (UÔ … BÃO),
bloco_madeira = golpe seco (PÁ), bloco_acelera = matraca acelerando, flauta_chamado = chamado (cantiga do
Curupira na rabeca).
Timbres: amostras reais de sons/musica/ (rabeca = violino com EQ nasal, viola = cordas de aço em par de
cordas, sanfona nos baixos, cuíca, alfaia, surdo, zabumba, caixa, prato, gonguê, triângulo, agogô, maracá,
atabaque, berimbau, pau-de-chuva, glissando de rabeca) e sintese.py (sanfona no teclado, rufo de caixa,
caxixi); a matraca e o bacalhau são montados aqui.
"""
import json
import re
import subprocess
import sys
import zlib
from functools import lru_cache
from pathlib import Path

import matplotlib
import numpy as np
import soundfile as sf
from scipy import signal
from scipy.ndimage import uniform_filter1d
from scipy.optimize import brentq

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import motor as M  # noqa: E402
import sintese as S  # noqa: E402
import temas as T  # noqa: E402

SR = M.SR
MUSICA = AQUI.parent / "sons" / "musica"
LINHA = AQUI.parent / "linha-do-tempo.json"
STEMS, PREVIAS = AQUI / "stems", AQUI / "previas"
CENAS = ("abertura", "mata", "guardiao")
CAUDA = 4.0     # s depois de cena.fim
GERAL = 2.0     # dB, igual nas três cenas: a dinâmica entre elas fica como composta
REF = -20.0     # LUFS (400 ms mais fortes) de toda fonte antes do ganho do instrumento
MUSICAIS = {"gongo_grave", "gongo_sobe", "gongo_desce", "bloco_madeira", "bloco_acelera", "prato", "tambor_grave",
            "rufar", "maraca", "caxixi", "agogo", "berimbau", "flauta_chamado", "pau_de_chuva"}
# amostras que deram a cor oriental à versão 1: nenhuma delas pode ser tocada aqui
AMOSTRAS_PROIBIDAS = ("gongo", "bloco", "flauta", "quena", "ocarina", "kalimba", "marimba", "salterio",
                      "tambor_tronco", "drone_grave")

# ================================================================ material próprio

# A veada: o fim do a' do Tema da Mata (Lá-Si-Dó-Ré-Dó | Si-Lá-Sol-Fá# | Mi … Ré), na viola sozinha, pousando no Ré.
VEADA = T.trecho(T.MATA_RABECA, 10, 15.5)
# O chamado que a veada ouve (ela gira as orelhas): a cantiga do Curupira ao longe, sem o fim (Lá Dó Si Lá Sol# … Lá)
CHAMADO_LONGE = T.trecho(T.CANTIGA_1, 0, 3) + [("A4", 1.5)]
# "E não acha mais o caminho de casa": a pegada grave e lenta, que não volta (o Sol# fica no ar e escorrega).
CAMINHO = [("A3", 0.75), ("C4", 0.5), ("D4", 0.75), ("G#3", 1.0)]
CURU = T.TEMAS["curupira"]["partes"]
MATA = T.TEMAS["mata"]["partes"]
MATA_CIFRA = T.MATA_CIFRA.split()

# ================================================================ timbres


def _mono(x):
    x = np.asarray(x, np.float32)
    return x.mean(axis=1) if x.ndim == 2 else x


def _nivelar(x):
    return (x * M.db(REF - M.lufs_curto_max(x))).astype(np.float32)


def _passa(x, banda, tipo="bandpass"):
    return signal.sosfilt(signal.butter(2, banda, tipo, fs=SR, output="sos"), x).astype(np.float32)


@lru_cache(maxsize=None)
def _som(arq, semitons=0.0, ini=0.0, fim=None):
    """Amostra mono 48 kHz: recorte, ataque no início, transposta, com rampas, nivelada em REF."""
    assert not arq.startswith(AMOSTRAS_PROIBIDAS), arq
    x = _mono(M.carregar(MUSICA / arq))
    x = x[int(ini * SR):int(fim * SR) if fim else None]
    k = int(np.argmax(np.abs(x) > 0.05 * np.abs(x).max()))
    x = M.transpor(x[max(0, k - 96):], semitons)
    return _nivelar(M._fades(x.copy(), 0.001, 0.05))


def _matraca(k):
    """Matraca de bumba-meu-boi: duas tábuas de madeira dura. Claves bem abafadas, 3 a 5 semitons abaixo, + o
    estalo do ar entre as tábuas; sem a nota que fica soando do bloco de madeira."""
    rng = np.random.default_rng(k)
    x = _som(f"claves__{1 + k % 2}.wav", -5.0 + (k % 3))
    n = min(len(x), int(0.09 * SR))
    t = np.arange(n) / SR
    x = x[:n] * np.exp(-t / 0.018)
    ar = _passa(rng.standard_normal(n), [700, 5000]) * np.exp(-t / 0.008)
    return x / (np.abs(x).max() + 1e-9) + 0.5 * ar / (np.abs(ar).max() + 1e-9)


def _bacalhau(k):
    """Bacalhau: a varinha no couro de baixo da zabumba ('tá' estalado e curto)."""
    rng = np.random.default_rng(k)
    t = np.arange(int(0.12 * SR)) / SR
    pele = np.sin(2 * np.pi * np.cumsum(330 + 120 * np.exp(-t / 0.004)) / SR) * np.exp(-t / 0.025)
    return pele + 0.8 * _passa(rng.standard_normal(len(t)), [1500, 7000]) * np.exp(-t / 0.004)


def _uo(k):
    """UÔ: a rabeca escorregando para o grave (glissando descendente em corda dupla, uma quarta abaixo)."""
    return signal.sosfilt(RABECA_EQ, _som("rabeca_glissando__2.wav", -5.0 - k % 2))


def _zabumba(k):
    """Zabumba de maceta: o mesmo timbre (sintese.tambor_grave) que os outros grupos tocam, com a mão na pele
    (0,6 s); o tambor grande de amostra (VSCO 'ethnic giant') saiu porque soava como taiko."""
    x = np.asarray(S.tambor_grave("zabumba", 1.0, k), np.float32)[:int(0.6 * SR)]
    return x * np.exp(-np.arange(len(x)) / (0.15 * SR)).astype(np.float32)


def _zabumba_funda(k):
    return M.transpor(np.asarray(S.tambor_grave("zabumba", 1.0, k), np.float32), -3.0)


@lru_cache(maxsize=None)
def _gerado(fn, k):
    return _nivelar(M._fades(np.asarray(fn(k), np.float32), 0.0005, 0.02))


# instrumento → ([fonte], ganho dB, pan); fonte = (arquivo, semitons, início, fim) ou função(semente) que gera
# o som. Fontes niveladas em REF antes do ganho; o golpe alterna entre elas.
GOLPES = {
    "prato": ([("prato__1.wav",), ("prato__2.wav",)], -11, -0.2),           # prato de banda
    "prato_abafado": ([("prato__3.wav",)], -14, -0.2),
    "caixa": ([("caixa__1.wav",), ("caixa__2.wav",)], -10, 0.2),
    "alfaia": ([("alfaia__1.ogg", 1.4), ("alfaia__2.wav",)], -5, -0.1),     # 101 Hz → Lá
    "zabumba": ([_zabumba], -3, 0.05),       # a mesma zabumba de maceta dos outros grupos (sintese), abafada
    "bacalhau": ([_bacalhau], -7, 0.25),
    "surdo": ([("surdo__2.wav", 1.8), ("surdo__1.wav", -2.1)], -4, 0.0),    # → Ré2
    "bumbo": ([_zabumba_funda], -3, 0.0),    # o tambor_grave do roteiro: zabumba funda (3 semitons abaixo)
    "atabaque": ([("atabaque__1.wav",), ("atabaque__2.wav",)], -9, 0.3),
    "atabaque_miudo": ([("conga__3.wav",)], -10, 0.3),
    "matraca": ([_matraca], -9, -0.35),
    "gongue": ([("gongue__1.wav",), ("gongue__1.wav", 2.0)], -12, -0.3),    # boca grave / aguda
    "triangulo": ([("triangulo__1.wav",)], 0, 0.45),
    "triangulo_fechado": ([("triangulo__2.wav",)], -2, 0.45),
    "agogo_agudo": ([("agogo__1.wav", 2.0)], -14, 0.4),        # Fá#6 → Sol#6: o pé virado contra o Ré
    "agogo_grave": ([("agogo__2.wav", 2.0)], -15, 0.3),        # Dó6 → Ré6
    "agogo_mata": ([("agogo__1.wav", 3.0)], -12, 0.4),         # → Lá6 (na mata, sem Sol#)
    "maraca": ([("maraca__2.ogg",), ("maraca__1.wav",)], -13, 0.5),
    "caxixi": ([("caxixi__2.wav", 0, 0.0, 0.55), ("caxixi__2.wav", 0, 0.72, 1.25),
                ("caxixi__2.wav", 0, 1.44, 1.92)], -14, -0.45),
    "berimbau": ([("berimbau_solto__2.wav", 3.0)], -5, 0.2),              # Si2 → Ré3 (DOIM)
    "berimbau_preso": ([("berimbau_preso__1.wav", 4.0), ("berimbau_preso__2.wav", 4.0)], -8, 0.2),  # → Fá3 (DIM)
    "pau_de_chuva": ([("pau_de_chuva__1.wav",), ("pau_de_chuva__2.wav",)], -10, -0.1),
    "cuica": ([(f"cuica__{k}.wav",) for k in (1, 5, 3, 7, 2, 6)], -6, 0.4),   # o "uí" solto
    "rabeca_glissando": ([_uo], -4, 0.15),
}
CLAROS = {"maraca", "caxixi", "pau_de_chuva", "triangulo", "triangulo_fechado"}  # não escurecem tocados de leve
NOTAS = {"rabeca": (0, 0.15), "viola": (-9, -0.3), "sanfona": (-7, 0.3), "cuica": (-4, 0.4),
         "berrante": (-6, -0.4)}   # ganho dB, pan
RABECA_EQ = np.vstack([M._biquad("graves", 250, -3.0), M._biquad("pico", 1300, 4.0, 1.2),
                       M._biquad("agudos", 6000, -4.0)])          # violino → rabeca: nasal, sem brilho


@lru_cache(maxsize=None)
def _k_sanfona():
    return float(M.db(REF - M.lufs_curto_max(np.asarray(S.sanfona("A4", 1.0, dinamica=1.0), np.float32))))


@lru_cache(maxsize=None)
def _banco(prefixo):
    """[(midi medido, arquivo)]: a altura medida em fontes.json afina cada amostra."""
    out = []
    for e in json.loads((MUSICA / "fontes.json").read_text(encoding="utf-8")):
        m = re.search(r"([\d.]+) Hz", e["descricao"])
        if e["arquivo"].startswith(prefixo + "__") and m:
            out.append((69 + 12 * np.log2(float(m[1]) / 440), e["arquivo"]))
    return out


def _fonte(prefixo, m, ordem=0):
    b = sorted(_banco(prefixo), key=lambda e: abs(e[0] - m))
    m0, arq = b[ordem % len(b)]
    return _som(arq, round(m - m0, 2))


def _sustentar(fontes, n, xf=0.3):
    """Nota mais longa que a amostra: o miolo das fontes se reveza com crossfade de potência constante
    (é a troca de arco ou de fole)."""
    k = int(xf * SR)
    u = np.linspace(0, np.pi / 2, k, dtype=np.float32)
    out = fontes[0][:int(0.85 * len(fontes[0]))].copy()
    j = 1
    while len(out) < n:
        f = fontes[j % len(fontes)]
        miolo = f[int(0.2 * len(f)):int(0.85 * len(f))]
        out[-k:] = out[-k:] * np.cos(u) + miolo[:k] * np.sin(u)
        out, j = np.concatenate([out, miolo[k:]]), j + 1
    return out[:n]


def _amostrada(prefixo, nota, dur, i, solta, ordem=0):
    """Nota de instrumento amostrado: a amostra mais próxima afinada, cortada com `solta` s de soltura,
    mais escura e mais baixa quanto menor a intensidade i."""
    m = T.midi(nota)
    n = int((dur + solta) * SR)
    x = _fonte(prefixo, m, ordem)
    x = _sustentar([x, _fonte(prefixo, m, 1)], n) if len(x) < n else x[:n].copy()
    k = min(len(x), int(solta * SR))
    x[len(x) - k:] *= np.cos(np.linspace(0, np.pi / 2, k, dtype=np.float32))
    if i < 0.95:
        x = M.passa_baixa(x, 1200 + 9000 * i ** 2, ordem=1)
    return x * np.float32(i ** 1.5)


def _viola(nota, dur, i):
    """Viola caipira: cada nota é um par de cordas (oitava nos bordões, uníssono nas primas)."""
    m = T.midi(nota)
    m += 12 if m < 48 else 0          # abaixo de Dó3 a amostra mais grave teria de descer demais
    toque = dur + 0.4                 # a corda dedilhada soa além da nota escrita
    x = _amostrada("viola", T.nome(m), toque, i, 0.25)
    par = _amostrada("viola", T.nome(m + 12 if m < 57 else m), toque, i, 0.25, ordem=0 if m < 57 else 1)
    d = int(0.007 * SR)
    x[d:] += 0.55 * par[:len(x) - d]
    return x


def _sanfona(nota, dur, i, semente):
    """Sanfona: botões de baixo (até Ré3) = amostras reais de acordeom/harmônio; teclado = sintese.sanfona."""
    if T.midi(nota) <= T.midi("D3"):
        return _amostrada("sanfona", nota, dur, i, 0.08)
    x = np.asarray(S.sanfona(nota, dur, dinamica=i, semente=semente), np.float32)
    return x * np.float32(_k_sanfona() * i ** 0.5)


def _cuica(nota, dur, i, semente):
    """Cuíca: gemidos reais transpostos para que o TOPO do 'uí' caia na nota; nota longa = gemidos em fila."""
    m, y = T.midi(nota), np.zeros(int((dur + 0.6) * SR), np.float32)
    a, j = 0, semente
    while a == 0 or a < (dur - 0.05) * SR:
        g = _fonte("cuica", m, j)
        g = g[:int(max(0.12, dur - a / SR + 0.08) * SR)]
        y[a:a + len(g)] += g[:len(y) - a]
        a, j = a + max(1, int(len(g) * 0.85)), j + 1
    return y * np.float32(i ** 1.2)


def som_nota(inst, nota, dur, i, semente=0):
    """Nota melódica (mono, nivelada em REF a ff) de rabeca, viola, sanfona, cuíca ou berrante."""
    if inst == "viola":
        return _viola(nota, dur, i)
    if inst == "sanfona":
        return _sanfona(nota, dur, i, semente)
    if inst == "cuica":
        return _cuica(nota, dur, i, semente)
    if inst == "berrante":
        x = _amostrada("berrante", nota, dur, i, 0.25)
        return x * np.exp(-np.maximum(np.arange(len(x)) / SR - dur + 0.3, 0) / 0.25).astype(np.float32)
    if inst == "rabeca":
        return signal.sosfilt(RABECA_EQ, _amostrada("rabeca", nota, dur, i, 0.07)).astype(np.float32)
    raise ValueError(f"{inst}: fora da versão 2 (flauta, pífano e afins estão em temas.PROIBIDOS)")


# ================================================================ tempo

def mapa(ancoras):
    """Batida → segundos. Andamento constante entre âncoras (batida, s), prolongado além das pontas."""
    b, t = (np.array(v, float) for v in zip(*ancoras))

    def g(x):
        j = int(np.clip(np.searchsorted(b, x, "right") - 1, 0, len(b) - 2))
        return float(t[j] + (x - b[j]) * (t[j + 1] - t[j]) / (b[j + 1] - b[j]))
    return g


def batidas(dt, bpm, passo=0.5):
    """Quantas batidas (múltiplo de `passo`) cabem em dt segundos perto do andamento bpm."""
    return max(passo, round(dt * bpm / 60 / passo) * passo)


def acel_ate(t0, t1, n=7, ate=0.05):
    """n golpes de t0 a t1 cujo intervalo encolhe em progressão geométrica até `ate` s (a matraca que acelera)."""
    span = t1 - t0
    if span <= ate * (n - 1) * 1.05:
        return list(np.linspace(t0, t1, n))
    de = brentq(lambda d: sum(d * (ate / d) ** (k / (n - 2)) for k in range(n - 1)) - span, ate, span)
    r = (ate / de) ** (1 / (n - 2))
    return list(t0 + np.r_[0, np.cumsum([de * r ** k for k in range(n - 1)])])


# ================================================================ partitura

class Partitura:
    """Uma cena: três barramentos (perto = fórmulas secas, tema = temas com reverb de mata, longe = som que vem
    do fundo da mata), deixas e cortes. Tempos em segundos a partir do início da cena."""
    BUSES = ("perto", "tema", "longe")

    def __init__(self, linha, cena_id):
        c = next(c for c in linha["cenas"] if c["id"] == cena_id)
        self.c, self.id, self.t0 = c, cena_id, c["inicio"]
        self.dur = c["fim"] - c["inicio"]
        self.beats = {b["id"]: b for b in c["beats"]}
        self.falas = [(b["inicio"] - self.t0, b["fim"] - self.t0) for b in c["beats"] if b["tipo"] == "fala"]
        self.bus = {k: M.Faixa(self.dur + CAUDA) for k in self.BUSES}
        self.cortes, self.deixas, self.avisos = [], [], []
        self.usados = set()
        self.rng = np.random.default_rng(zlib.crc32(cena_id.encode()))
        self.k = 0

    # --- tempos da linha do tempo
    def ini(self, bid):
        return self.beats[bid]["inicio"] - self.t0

    def fim(self, bid):
        return self.beats[bid]["fim"] - self.t0

    def sfx(self, bid, etq):
        return next(s["t"] for s in self.beats[bid]["sfx"] if s["som"] == etq) - self.t0

    def cartela(self):
        return self.c["cartela"]["inicio"] - self.t0, self.c["cartela"]["fim"] - self.t0

    def palavra(self, bid, termo):
        """Instante estimado de uma palavra pela posição no texto (sem marcação de palavras na voz)."""
        b = self.beats[bid]
        k = b["texto"].lower().find(termo)
        return self.ini(bid) + 0.1 + (b["fim"] - b["inicio"] - 0.2) * k / len(b["texto"])

    def em_fala(self, t):
        return any(a + 0.05 < t < z - 0.05 for a, z in self.falas)

    # --- sons
    def por(self, x, t, bus, ganho, pan):
        self.bus[bus].colocar(x, t, ganho + GERAL, pan)

    def golpe(self, inst, t, i=0.8, bus="perto", ganho=0.0, pan=None, lp=None, corte=None):
        if inst == "triangulo" and i < 0.3:          # toque leve = triângulo fechado (a mão abafando)
            inst = "triangulo_fechado"
        fontes, g, pn = GOLPES[inst]
        self.k += 1
        self.usados.add(inst)
        spec = fontes[self.k % len(fontes)]
        if callable(spec):
            x = _gerado(spec, self.k % 4)
        else:
            arq, st, ini, fim = spec + (0.0, 0.0, None)[len(spec) - 1:]
            x = _som(arq, st, ini, fim)
        if lp or (i < 0.75 and inst not in CLAROS):
            x = M.passa_baixa(x, min(lp or 2e4, 1500 + 14000 * i ** 2), ordem=1)
        if corte:                                    # abafa a pele: a ressonância não invade a cena seguinte
            x = M._fades(x[:int(corte * SR)].copy(), 0, corte / 2)
        if i >= 0.75 and self.em_fala(t):
            self.avisos.append(f"golpe forte sobre fala: {inst} {i:.2f} em {t + self.t0:.2f} s")
        self.por(x * np.float32(i ** 1.5), t, bus, g + ganho + self.rng.uniform(-0.8, 0.8), pn if pan is None else pan)

    def nota(self, inst, nota, t, dur, i, bus="tema", ganho=0.0, pan=None):
        g, pn = NOTAS[inst]
        self.k += 1
        self.usados.add(inst)
        self.por(som_nota(inst, nota, dur, min(1.0, i), self.k % 4), t, bus, g + ganho, pn if pan is None else pan)

    def longa(self, inst, nota, t, dur, i, env, bus="tema", ganho=0.0, pan=None):
        """Nota longa com envoltória [(s, ganho 0..1)] em tempos da cena."""
        self.usados.add(inst)
        x = som_nota(inst, nota, dur, i)
        tt = t + np.arange(len(x)) / SR
        x = x * np.interp(tt, *zip(*env)).astype(np.float32)
        g, pn = NOTAS[inst]
        self.por(x, t, bus, g + ganho, pn if pan is None else pan)

    def rufo(self, t, dur, i=0.8, crescendo=True, bus="perto"):
        self.k += 1
        self.usados.add("caixa")
        self.por(_rufo(round(dur, 2), crescendo, self.k % 4) * np.float32(i ** 1.5), t, bus, GOLPES["caixa"][1], 0.2)

    def deixa(self, rotulo, alvo, batida, etq=None):
        self.deixas.append((rotulo, alvo, batida, etq))

    def cortar(self, t0, t1=1e9, buses=BUSES):
        """Silêncio seco em [t0, t1) nos barramentos dados, reverb incluída."""
        self.cortes.append((t0, t1, buses))

    # --- mixagem do stem
    def render(self):
        n = len(self.bus["perto"].x)
        x = self.bus["perto"].x
        sai = {"perto": x + M.reverb(x, "sala")[:n] * M.db(-16)}
        x = self.bus["tema"].x
        sai["tema"] = x + M.reverb(x, "mata")[:n] * M.db(-9)
        x = M.passa_baixa(self.bus["longe"].x, 2500)
        sai["longe"] = x * M.db(-12) + M.reverb(x, "eco")[:n] * M.db(-6)
        r = int(0.012 * SR)
        for t0, t1, buses in self.cortes:
            a, b = int(t0 * SR), min(n, int(t1 * SR))
            for k in buses:
                y = sai[k]
                y[max(0, a - r):a] *= np.linspace(1, 0, a - max(0, a - r), dtype=np.float32)[:, None]
                y[a:b] = 0
                y[b:b + r] *= np.linspace(0, 1, len(y[b:b + r]), dtype=np.float32)[:, None]
        return M._fades(cavar_voz(sum(sai.values()), self.falas), 0.0, 1.0).astype(np.float32)


@lru_cache(maxsize=None)
def _rufo(dur, crescendo, semente):
    return _nivelar(S.rufar(dur, crescendo, semente))


def cavar_voz(x, falas, ganho=-5.0):
    """Debaixo das falas, abre espaço para a voz: −5 dB largos em torno de 1,2 kHz (300 Hz–3 kHz)."""
    y = signal.sosfilt(M._biquad("pico", 1200, ganho, 0.5)[None], x, axis=0)
    w = np.zeros(len(x), np.float32)
    for a, z in falas:
        w[int(a * SR):int(z * SR)] = 1
    w = uniform_filter1d(w, int(0.3 * SR))[:, None]
    return x + (y - x) * w


# ================================================================ escrita

def melodia(p, inst, mel, g, b0, din="mf", escala=1.0, bus="tema", ganho=0.0, pan=None, ate=None):
    """(nota, tempos[, din]) a partir da batida b0 no mapa g; nada começa depois de `ate` (s) e a última nota
    é aparada nele. Devolve a batida final."""
    b = b0
    for n, d, *dn in mel:
        t, t1 = g(b), g(b + d)
        b += d
        if n == "R" or (ate is not None and t >= ate - 0.06):
            continue
        t1 = min(t1, ate) if ate is not None else t1
        for nn in n.split("+"):
            p.nota(inst, nn, t, t1 - t, T.DIN[dn[0] if dn else din] * escala, bus, ganho, pan)
    return b


def ritmo(p, inst, grade, g, b0, b1, din="mf", escala=1.0, bus="tema", ate=None, env=None, lp=None, solto=0.006):
    """Grade de semicolcheias (temas.py) de b0 a b1 batidas, com leve imprecisão humana."""
    for k in range(int(round((b1 - b0) / T.PASSO))):
        c, t = grade[k % len(grade)], g(b0 + k * T.PASSO)
        if c in T.PESO and (ate is None or t < ate - 0.02):
            i = T.PESO[c] * T.DIN[din] * escala * (env(t) if env else 1.0)
            p.golpe(inst, t + p.rng.normal(0, solto), i, bus, lp=lp)


def silaba(p, s, t, i=1.0, bus="perto", **kw):
    """Uma sílaba da fala do mestre (temas.SILABAS): TUM = alfaia + surdo + prato, BÃO = surdo + prato…"""
    for inst, peso in T.SILABAS[s]:
        p.golpe(inst, t, i * peso, bus, **kw)


def formula(p, nome, batida, escala=1.0, bus="perto", **kw):
    """Fórmula de temas.FORMULAS com o golpe principal (`batida`) no instante dado. Devolve o início."""
    f = T.FORMULAS[nome]
    t0 = batida - f["batida"]
    for dt, inst, i in f["eventos"]:
        p.golpe(inst, t0 + dt, i * escala, bus, **kw)
    return t0


def pedal(p, t0, t1, i=0.4, notas=("D3", "A3"), bus="tema"):
    """Ré pedal da sanfona (o fole abre, segura e fecha): a cola entre um tema e outro."""
    env = [(t0, 0.0), (t0 + 0.6, 1.0), (t1 - 0.8, 1.0), (t1, 0.0)]
    for k, n in enumerate(notas):
        p.longa("sanfona", n, t0, t1 - t0, i * (1 - 0.2 * k), env, bus)


def abre_alas(p, ate, d5=None):
    """Cartela de capítulo: rrrum de caixa → TUM (alfaia + surdo + prato) quando a cartela pousa (+0,35 s) →
    chamada da rabeca (temas.CHAMADA, Ré mixolídio) sobre um Ré pedal da sanfona. Com d5, o andamento da
    chamada se ajusta para o Ré final começar em d5. O começo acelerado do Abre-alas (3,4 s de matraca antes
    do TUM) não cabe num stem que começa na cartela."""
    tum = p.cartela()[0] + 0.35
    p.rufo(tum - 0.3, 0.3, 0.8)
    silaba(p, "TUM", tum)
    silaba(p, "BUM", tum, 0.6)
    bpm = 80.0 if d5 is None else float(np.clip(5 * 60 / (d5 - tum), 72, 104))
    melodia(p, "rabeca", T.CHAMADA, mapa([(0, tum), (1, tum + 60 / bpm)]), 0, "f", ate=ate)
    pedal(p, tum + 0.2, ate + 0.5, 0.45)
    p.deixa(f"cartela pousa: rrrum TUM! + chamada da rabeca ({bpm:.0f})", tum, tum)


# ================================================================ abertura

def abertura(p):
    """Silêncio e fósforo; a subida acende o papel (rufo de caixa até o 'uí' distante da cuíca); a música respira
    (bordão Ré-Lá da rabeca, surdo em pulso de coração); a capa do folheto (revelação e a cantiga do Curupira
    ao longe na rabeca); Anchieta quase a seco; o batuque de alfaia e atabaque que vem do fundo da mata; corte
    seco em "dono"."""
    luz = p.sfx("abertura_01", "gongo_sobe")
    p.rufo(luz - 0.8, 0.8, 0.5, bus="tema")
    p.golpe("cuica", luz, 0.55, bus="longe")
    p.golpe("gongue", luz, 0.5, bus="tema")
    p.deixa("o papel acende: subida (rrrum UÍ)", luz, luz, "gongo_sobe")
    dono = p.palavra("abertura_08", "dono")
    p.cortar(dono)
    p.deixa("'dono': tudo corta seco (palavra estimada)", dono, dono, "corte")

    # bordão Ré-Lá de rabeca: nasce depois da luz; na carta de Anchieta recua a Ré sozinho; volta na serra
    t_b, a4, a6 = luz + 0.5, p.ini("abertura_04"), p.ini("abertura_06")
    dur = dono + 0.2 - t_b
    p.longa("rabeca", "D4", t_b, dur, 0.32, [(t_b, 0), (t_b + 3, 1), (a4, 1), (a4 + 2, 0.75), (a6, 0.75),
                                            (a6 + 3, 1)], pan=0.05)
    p.longa("rabeca", "A4", t_b + 0.4, dur - 0.4, 0.26, [(t_b, 0), (t_b + 3.5, 1), (a4, 1), (a4 + 2, 0),
                                                         (a6, 0), (a6 + 4, 0.8)], pan=0.25)

    # surdo em pulso de coração lento, abafado, até o tambor grave da capa
    t_tg = p.sfx("abertura_03", "tambor_grave")
    t, k = t_b + 0.8, 0
    while t < t_tg - 0.7:
        f = min(1.0, 0.45 + 0.2 * k)
        p.golpe("surdo", t, 0.5 * f, bus="tema", lp=260)
        p.golpe("surdo", t + 0.27, 0.32 * f, bus="tema", lp=220)
        t, k = t + 1.35, k + 1

    t = p.sfx("abertura_02", "bloco_madeira")
    formula(p, "golpe_seco", t, 0.7)
    p.deixa("a vareta desce e some: golpe seco (PÁ matraca)", t, t, "bloco_madeira")

    # capa do folheto: revelação (chuva, dum … UÍ-doim … tlim) com o UÍ quando ela assenta; a cantiga longe
    t_fl = p.sfx("abertura_03", "flauta_chamado")
    formula(p, "revelacao", t_fl)
    p.golpe("bumbo", t_tg, 0.6, bus="tema", lp=300, corte=2.5)
    p.deixa("capa baixa: tambor_grave (zabumba funda)", t_tg, t_tg, "tambor_grave")
    p.deixa("capa assenta: revelacao (UÍ-doim)", t_fl, t_fl)
    melodia(p, "rabeca", T.CANTIGA_1, mapa([(0, t_fl + 0.1), (1, t_fl + 0.1 + 60 / 96)]), 0, "mp", bus="longe")
    p.deixa("chamado: cantiga 'Vou andando' na rabeca, longe", t_fl, t_fl + 0.1, "flauta_chamado")

    t = p.sfx("abertura_04", "maraca")
    p.golpe("maraca", t, 0.55, bus="tema")
    p.deixa("antes da citação: maraca (maracá raro)", t, t, "maraca")
    t = p.sfx("abertura_05", "gongo_grave")
    formula(p, "pontuacao", t, 0.6, bus="tema")
    p.deixa("'corupira': pontuação BÃO (surdo + zabumba + prato)", t, t, "gongo_grave")
    t = p.sfx("abertura_06", "caxixi")
    p.golpe("caxixi", t, 0.45, bus="tema")
    p.deixa("penas ao vento: caxixi", t, t, "caxixi")

    # "povos de língua tupi": batuque distante e abafado de alfaia e atabaque, chegando, até "dono"
    t_bt = p.sfx("abertura_07", "tambor_grave")
    p.golpe("bumbo", t_bt, 0.55, bus="longe", lp=500, corte=2.5)
    p.deixa("língua tupi: tambor_grave e o batuque distante", t_bt, t_bt, "tambor_grave")
    g = mapa([(0, t_bt), (1, t_bt + 0.75)])                    # 80: o andamento da mata que vem
    nb = (dono - t_bt) / 0.75 + 1

    def chega(t):
        return 0.55 + 0.45 * min(1.0, (t - t_bt) / max(0.1, dono - t_bt))
    ritmo(p, "alfaia", "X.....x.X.......", g, 0, nb, "mf", bus="longe", ate=dono, env=chega, lp=700)
    ritmo(p, "atabaque", "..x.x..x..x.x..x", g, 0, nb, "mp", bus="longe", ate=dono, env=chega, lp=900)


# ================================================================ mata

def mata_frase(p, g, b0, k1, k2, nivel, ate=None, b_fim=None):
    """Compassos k1..k2 do Tema da Mata a partir da batida b0 (nivel: escala por parte; ausente = cala) e,
    até b_fim, compassos de vamp em Ré (ponteio, fole, zabumba)."""
    a, z = 2 * (k1 - 1), 2 * k2
    b_fim = b0 + z - a if b_fim is None else b_fim
    vamp = int(np.ceil(max(0.0, b_fim - (b0 + z - a)) / 2))
    cifras = " ".join(MATA_CIFRA[k1 - 1:k2] + ["D"] * vamp)
    t_fim = g(b_fim) if ate is None else min(ate, g(b_fim))
    for parte, pan in (("rabeca", 0.15), ("segunda", -0.35)):
        if parte in nivel:
            melodia(p, MATA[parte]["instrumento"], T.trecho(MATA[parte]["melodia"], a, z), g, b0, MATA[parte]["din"],
                    nivel[parte], pan=pan, ate=ate, ganho=4 if parte == "segunda" else 0)
    for parte, tabela in (("viola", T.PONTEIO), ("sanfona", T.FOLE)):
        if parte in nivel:
            melodia(p, parte, T._ponteio(cifras, tabela), g, b0, MATA[parte]["din"], nivel[parte], ate=t_fim)
    for parte in ("zabumba", "bacalhau", "triangulo"):
        if parte in nivel:
            ritmo(p, parte, MATA[parte]["grade"], g, b0, b_fim, MATA[parte]["din"], nivel[parte], ate=ate)
    if "caxixi" in nivel:
        ritmo(p, "caxixi", "..x...x...x...x.", g, b0, b_fim, "p", nivel["caxixi"], ate=ate)


def mata(p):
    """Tema da Mata em Ré mixolídio a 80 (toada): rabeca cantando, viola em ponteio (e em terças na pausa),
    sanfona sustentando, zabumba macia, triângulo; uma pontuação por bicho; a veada na viola sozinha e o chamado
    do Curupira ao longe; corta seco na última frase e fica só o BÃO."""
    c1 = p.cartela()[1]
    abre_alas(p, ate=c1 + 1.2)
    t = p.sfx("mata_01", "pau_de_chuva")
    p.golpe("pau_de_chuva", t, 0.75, bus="tema")
    p.deixa("a mata acorda: pau_de_chuva", t, t, "pau_de_chuva")

    # uma grade a ~80 ancorada nos inícios das falas: o tema segue o narrador
    a2, a3, a4, a5, f5 = (p.ini("mata_02"), p.ini("mata_03"), p.ini("mata_04"), p.ini("mata_05"),
                          p.sfx("mata_05", "flauta_chamado"))
    corte, bao = p.ini("mata_07"), p.sfx("mata_07", "gongo_grave")
    intro = max(t + 0.4, a2 - 1.5)
    marcas, b = [(-2, intro), (0, a2)], 0
    for t0, t1 in ((a2, a3), (a3, a4), (a4, a5), (a5, f5)):
        b += batidas(t1 - t0, 80)
        marcas.append((b, t1))
    marcas.append((b + 16, f5 + 12))
    g = mapa(marcas)
    b2, b3, b4, b5 = (m[0] for m in marcas[2:6])
    sussurro = dict(rabeca=0.6, viola=0.95, sanfona=0.8, zabumba=0.75, triangulo=0.6, caxixi=0.7)

    # a viola entra em ponteio; "Lá longe, onde o rio faz a curva": frase a, sussurrada
    melodia(p, "viola", T._ponteio("D", T.PONTEIO), g, -2, "mp", 1.2)
    mata_frase(p, g, 0, 1, 4, sussurro, ate=a3, b_fim=b2)
    # araras e bugios: frase a' (sobe ao Ré); agogô nas araras, rufo curto de caixa no ronco do bugio
    mata_frase(p, g, b2, 5, 8, sussurro, ate=a4, b_fim=b3)
    t = p.sfx("mata_03", "agogo")
    for dt, i in ((0, 0.6), (0.13, 0.45), (0.27, 0.5)):
        p.golpe("agogo_mata" if dt < 0.2 else "agogo_grave", t + dt, i)
    p.deixa("araras no céu: agogo", t, t, "agogo")
    t = p.sfx("mata_03", "bugio")    # o ronco é da mixagem; o rufo é meu
    p.rufo(t, 0.7, 0.45, crescendo=False, bus="tema")
    p.deixa("bugio ronca: rufo curto de caixa", t, t)

    # pausa (tatu e onça): frase b cheia, rabeca e a viola em terças (a dupla caipira), baião-toada inteiro;
    # caxixi miúdo no trote; surdo grave sob o esturro
    esturro = p.sfx("mata_04", "onca_esturro")   # o esturro é da mixagem; o surdo é meu
    cheia = dict(rabeca=1.15, segunda=1.1, viola=1.1, sanfona=1.1, zabumba=1.2, bacalhau=1.0, triangulo=1.0)
    mata_frase(p, g, b3, 9, 10, cheia, ate=esturro - 0.08)
    t = p.sfx("mata_04", "caxixi")
    for k in range(6):
        p.golpe("caxixi", t + 0.085 * k, (0.55, 0.35)[k % 2] * (1 - 0.08 * k), bus="tema")
    p.deixa("tatu em trote: caxixi miúdo", t, t, "caxixi")
    p.golpe("surdo", esturro - 0.03, 0.65, bus="tema", lp=220)
    p.golpe("surdo", esturro + 0.55, 0.4, bus="tema", lp=200)
    p.deixa("onça esturra ao longe: surdo grave", esturro, esturro - 0.03)

    # a veada: a viola canta sozinha, terna, e pousa no Ré quando a fala acaba
    melodia(p, "viola", VEADA, mapa([(0, a5 + 0.35), (5.5, f5 - 0.05)]), 0, "mf", 1.0, ganho=3, pan=-0.1)
    # chamado: ela gira as orelhas; a cantiga do Curupira na rabeca, ao longe, sobre o berimbau; a mata respira
    formula(p, "chamado", f5, 0.8, bus="tema")
    melodia(p, "rabeca", CHAMADO_LONGE, mapa([(0, f5 + 0.1), (1, f5 + 0.1 + 60 / 96)]), 0, "mp", bus="longe")
    p.deixa("veada: chamado (cantiga na rabeca, longe)", f5, f5 + 0.1, "flauta_chamado")
    respira = dict(rabeca=0.6, viola=0.85, sanfona=0.8, zabumba=0.9, triangulo=0.6, caxixi=0.5)
    melodia(p, "viola", T._ponteio("D", T.PONTEIO), g, b5 + 2, "mp", 0.85, ate=corte)
    ritmo(p, "zabumba", "X.......o.......", g, b5 + 2, b5 + 4, "p", 1.0, ate=corte)
    mata_frase(p, g, b5 + 4, 13, 16, respira, ate=corte, b_fim=b5 + 20)
    t = p.sfx("mata_06", "caxixi")
    p.golpe("caxixi", t, 0.5, bus="tema")
    p.deixa("'medida': caxixi", t, t, "caxixi")

    # "Mas a mata tinha dono": a música corta de uma vez; fica só o BÃO (surdo + zabumba + prato de banda)
    p.cortar(corte, bao - 0.01)
    p.deixa("última frase: a música corta seco", corte, corte, "corte")
    formula(p, "pontuacao", bao, 0.8, bus="tema")
    p.deixa("olhinhos no oco: pontuação BÃO", bao, bao, "gongo_grave")


# ================================================================ guardião

def guardiao(p):
    """Entrada do Curupira (subida até o primeiro 'uí' da cuíca, chocalhos, matraca acelerando, DOIM-tá no pouso)
    e o Tema do Curupira inteiro (viola com a pegada e o retrógrado, cuíca gemendo, berimbau, caxixi, maracá;
    a rabeca só no chamado e na risada); os pés (pose: a matraca acelera e congela num PÁ; silêncio); o rastro
    de trás para a frente; a música para nas sapopemas; um fragmento da Mata; castigo em surdo lento; a pegada
    grave da rabeca escorrega na descida (UÔ … BÃO)."""
    ta, ac = p.sfx("guardiao_01", "gongo_sobe"), p.sfx("guardiao_01", "bloco_acelera")
    pouso = p.fim("guardiao_01") - 0.12
    abre_alas(p, ate=ta, d5=ta - 0.85)

    # subida: a rabeca segura o Ré, o rufo cresce e a sombra surge no oco com o primeiro "uí" da cuíca
    p.rufo(ta - 0.8, 0.8, 0.75)
    for inst, i in (("cuica", 0.95), ("gongue", 0.7), ("maraca", 0.5)):
        p.golpe(inst, ta, i)
    p.deixa("sombra no oco: subida (rrrum UÍ + tá)", ta, ta, "gongo_sobe")
    e = min(1.0, (ac - ta) / 1.4)
    for dt, inst, i in ((0.4, "caxixi", 0.6), (0.62, "agogo_agudo", 0.6), (0.8, "agogo_grave", 0.6),
                        (1.05, "caxixi", 0.5)):
        p.golpe(inst, ta + dt * e, i)
    for t in np.arange(ta + 0.3, ac - 0.05, 0.09):       # a sombra encolhe: chocalho em crescendo
        p.golpe("caxixi" if round(t / 0.09) % 2 else "maraca", t, 0.3 + 0.45 * (t - ta) / (ac - ta))
    golpes = acel_ate(ac, pouso - 0.07, 7)
    for k, t in enumerate(golpes):
        p.golpe("matraca", t, 0.3 + 0.45 * k / 6)
    p.deixa("encolhe e ganha nitidez: matraca acelerando", ac, golpes[0], "bloco_acelera")
    p.golpe("berimbau", pouso, 0.9)
    p.golpe("gongue", pouso, 0.55)
    p.golpe("berimbau_preso", pouso + 0.25, 0.55)
    p.deixa("o Curupira pousa na tela: DOIM-tá (batida)", p.fim("guardiao_01"), pouso)

    # o Tema do Curupira a 120, ancorado no pouso, no chamado ("Caipora") e na pose dos pés
    t_fl = p.sfx("guardiao_02", "flauta_chamado")
    pe = p.sfx("guardiao_06", "bloco_madeira")
    para = max(p.fim("guardiao_05") - 0.25, pe - 1.2)
    n1 = batidas(t_fl - pouso, 120, 1)
    n3 = batidas(para - t_fl, 120, 1)
    nc = T.duracao(T.CANTIGA_1)
    g = mapa([(0, pouso), (n1, t_fl), (n1 + n3, para)])
    tema = T.CURU_VIOLA * 2
    melodia(p, "viola", T.trecho(tema, 0, n1), g, 0, "mf", 0.95, ganho=2, ate=t_fl)
    p.golpe("berimbau", t_fl, 0.6, bus="tema")
    p.golpe("pau_de_chuva", t_fl, 0.3, bus="tema")
    melodia(p, "rabeca", T.CANTIGA_1, g, n1, "mf", 0.9)
    p.deixa("'Caipora': chamado (a cantiga na rabeca)", t_fl, g(n1), "flauta_chamado")
    melodia(p, "viola", T.trecho(tema, n1 + nc, n1 + n3), g, n1 + nc, "mf", 0.9, ganho=2, ate=para)
    melodia(p, "cuica", T.trecho(T.CURU_CUICA * 2, 0, n1 + n3), g, 0, "mp", 1.0, ate=para)
    for parte in ("berimbau", "berimbau_preso", "caxixi", "maraca", "zabumba"):
        ritmo(p, CURU[parte]["instrumento"], CURU[parte]["grade"], g, 0, n1 + n3, CURU[parte]["din"], 0.9, ate=para)
    t = p.sfx("guardiao_03", "prato")
    p.golpe("prato", t, 0.8)
    p.golpe("zabumba", t, 0.75)
    melodia(p, "rabeca", T.CURU_RISADA, mapa([(0, t + 0.12), (1, t + 0.62)]), 0, "mf", 0.75, pan=0.3)
    p.deixa("tronco arremessado: prato + a risada da rabeca", t, t, "prato")
    t = p.sfx("guardiao_04", "caxixi")
    for k, i in enumerate((0.7, 0.5, 0.35)):
        p.golpe("caxixi", t + 0.07 * k, i, bus="tema")
    p.deixa("pelos se arrepiam: caxixi", t, t, "caxixi")

    # os pés (pose): a música para, a matraca acelera e congela num PÁ (a pegada no chão); silêncio
    golpes = acel_ate(para, pe, 9 if pe - para > 0.9 else 6)
    for k, t in enumerate(golpes[:-1]):
        p.golpe("matraca", t, 0.35 + 0.45 * k / len(golpes))
    formula(p, "golpe_seco", pe)
    p.golpe("surdo", pe, 0.6, lp=300)
    p.cortar(para, p.ini("guardiao_07") - 0.02, ("tema", "longe"))
    p.deixa("a música para: pose", para, para, "corte")
    p.deixa("pezinho bate: golpe seco (PÁ, pose)", pe, pe, "bloco_madeira")

    # pés virados: berimbau, um toque por passo
    t, f7 = p.sfx("guardiao_07", "berimbau"), p.fim("guardiao_07")
    passo = (f7 - t) / 3
    for k, (inst, i) in enumerate((("berimbau", 0.75), ("berimbau_preso", 0.4), ("berimbau", 0.45))):
        p.golpe(inst, t + k * passo, i, bus="tema")
    p.deixa("pés virados para trás: berimbau", t, t, "berimbau")

    # o rastro: o tema de trás para a frente (viola e cuíca), sussurrado, e um xi no fim
    a8, f8 = p.ini("guardiao_08"), p.sfx("guardiao_08", "caxixi")
    n = batidas(f8 - a8 - 0.1, 120, 1)
    g8 = mapa([(0, a8 + 0.1), (n, f8)])
    melodia(p, "viola", T.trecho(T.retrogrado(T.CURU_VIOLA), 1, 1 + n), g8, 0, "mf", 0.6, ganho=3, ate=f8)
    melodia(p, "cuica", T.trecho(T.retrogrado(T.CURU_CUICA), 0, n), g8, 0, "p", 0.9, ate=f8)
    ritmo(p, "maraca", ".x.o.x.o.x.o.x.o", g8, 0, n, "p", ate=f8)
    p.golpe("caxixi", f8, 0.7, bus="tema")
    p.deixa("rastro para o lado errado: caxixi", f8, f8, "caxixi")
    # guardiao_09: a música para; só as pancadas e o trovão (mixagem)

    # "Quem caça para comer, ele deixa": um fragmento da Mata (rabeca, viola, fole)
    a10, f10 = p.ini("guardiao_10"), p.fim("guardiao_10")
    n = batidas(f10 - a10, 80, 1)
    g10 = mapa([(0, a10), (n, f10)])
    melodia(p, "viola", T._ponteio("D D", T.PONTEIO), g10, 0, "mp", 0.8, ate=f10)
    melodia(p, "sanfona", T._ponteio("D D", T.FOLE), g10, 0, "p", 0.8, ate=f10)
    melodia(p, "rabeca", T.trecho(T.MATA_RABECA, 0, 4), g10, 0, "mf", 0.5, ate=f10)

    # castigo: só surdo grave e lento; a zabumba funda quando ele crava a machadinha
    t_tg, gd = p.sfx("guardiao_11", "tambor_grave"), p.sfx("guardiao_12", "gongo_desce")
    p.golpe("bumbo", t_tg, 0.85, bus="tema", lp=400, corte=3.5)
    p.deixa("machadinha cravada: tambor_grave (zabumba funda)", t_tg, t_tg, "tambor_grave")
    for k in range(-6, 12):
        t = t_tg + 1.5 * k
        if k and p.ini("guardiao_11") - 0.01 < t < gd - 0.9:
            p.golpe("surdo", t, 0.5 if k < 0 else max(0.25, 0.5 - 0.03 * k), bus="tema", lp=300)

    # "e não acha mais o caminho de casa": a pegada grave e lenta não volta; o Sol# escorrega na descida
    melodia(p, "rabeca", CAMINHO, mapa([(0, p.ini("guardiao_12") + 0.15), (3, gd)]), 0, "mp", ate=gd + 0.1)
    formula(p, "desce", gd + T.FORMULAS["desce"]["batida"], bus="tema")
    p.deixa("caminho de casa: descida (UÔ … BÃO)", gd, gd, "gongo_desce")


COMPOSICOES = {"abertura": abertura, "mata": mata, "guardiao": guardiao}


def _compor(cena_id, linha):
    p = Partitura(linha, cena_id)
    COMPOSICOES[cena_id](p)
    assert not p.usados & T.PROIBIDOS, p.usados & T.PROIBIDOS
    return p.render(), p


def compor(cena_id, linha):
    """Stem estéreo float32 (n, 2) a 48 kHz da cena: começa em cena.inicio e dura a cena + CAUDA s."""
    return _compor(cena_id, linha)[0]


# ================================================================ conferência

def _figura(p, x, caminho):
    mono = x.mean(axis=1)
    fig, (a1, a2) = plt.subplots(2, 1, figsize=(20, 8), sharex=True, gridspec_kw=dict(height_ratios=[3, 1]))
    f, t, Z = signal.stft(mono, SR, nperseg=4096, noverlap=4096 - 1024)
    k = (f >= 40) & (f <= 12000)
    z = 20 * np.log10(np.abs(Z[k]) + 1e-9)
    a1.pcolormesh(t, f[k], z - z.max(), vmin=-80, vmax=0, cmap="magma", shading="auto")
    a1.set_yscale("log")
    a1.set_ylim(40, 12000)
    a1.set_ylabel("Hz")
    for a, b in p.falas:
        a1.axhspan(300, 3000, xmin=a / t[-1], xmax=b / t[-1], color="white", alpha=0.07)
        a2.axvspan(a, b, color="tab:blue", alpha=0.15)
    for rot, alvo, bat, _ in p.deixas:
        a1.axvline(bat, color="cyan", lw=0.7, alpha=0.8)
        a1.text(bat, 11500, rot[:34], rotation=90, fontsize=6, color="cyan", va="top")
    nivel = 10 * np.log10(uniform_filter1d(mono.astype(np.float64) ** 2, int(0.4 * SR))[::480] + 1e-12)
    a2.plot(np.arange(len(nivel)) * 0.01, nivel, lw=0.8, color="k")
    a2.set_ylim(-70, -5)
    a2.set_ylabel("dBFS (400 ms)")
    a2.set_xlabel(f"s desde o início da cena (falas em azul; início absoluto {p.t0:.2f} s)")
    a1.set_title(f"{p.id}: espectrograma (faixa da voz sombreada nas falas) e deixas")
    fig.tight_layout()
    fig.savefig(caminho, dpi=70)
    plt.close(fig)


def _relatorio(p, x):
    print(f"\n[{p.id}] {len(x) / SR:.2f} s (cena {p.dur:.2f} + cauda {CAUDA:.0f})  pico {M.pico_verdadeiro(x):.1f} dBTP  "
          f"{M.lufs(x):.1f} LUFS  máx. 400 ms {M.lufs_curto_max(x):.1f}  "
          f"cauda (último 0,5 s) {20 * np.log10(np.sqrt(np.mean(x[-SR // 2:] ** 2)) + 1e-12):.0f} dBFS")
    env = 10 * np.log10(uniform_filter1d(x.mean(axis=1).astype(np.float64) ** 2, 240)[::48] + 1e-12)  # 1 ms

    def medir(t, corte):
        """Ataque medido no áudio (maior subida de nível a ±80 ms da batida) ou, num corte, a queda em dB."""
        i = int(t * 1000)
        if corte:
            return f"queda {np.mean(env[i - 300:i - 20]) - np.mean(env[i + 30:i + 300]):4.0f} dB"
        d = np.diff(env[i - 80:i + 80])
        return f"{(i - 80 + int(np.argmax(d)) + 1) / 1000 + p.t0:9.2f}"
    print(f"  {'deixa':52s} {'alvo (s)':>9s} {'batida':>9s} {'Δ ms':>6s} {'medido':>12s}")
    for rot, alvo, bat, etq in p.deixas:
        print(f"  {rot:52s} {alvo + p.t0:9.2f} {bat + p.t0:9.2f} {1000 * (bat - alvo):+6.0f} "
              f"{medir(bat, etq == 'corte'):>12s}")
    pedidos = {(s["som"], round(s["t"] - p.t0, 2)) for b in p.c["beats"] for s in b["sfx"] if s["som"] in MUSICAIS}
    feitos = {(e, round(a, 2)) for _, a, _, e in p.deixas if e}
    print(f"  sfx musicais do roteiro: {len(pedidos & feitos)}/{len(pedidos)} renderizados"
          + (f"; FALTAM {sorted(pedidos - feitos)}" if pedidos - feitos else ""))
    banda = signal.sosfilt(signal.butter(2, [300, 3000], "bandpass", fs=SR, output="sos"), x, axis=0)
    for b in p.c["beats"]:
        i, f = int((b["inicio"] - p.t0) * SR), int((b["fim"] - p.t0) * SR)
        print(f"  {'sob ' if b['tipo'] == 'fala' else '    '}{b['id']:14s} {M.lufs(x[i:f]):6.1f} LUFS  "
              f"máx. {M.lufs_curto_max(x[i:f]):6.1f}  (300 Hz–3 kHz {M.lufs(banda[i:f]):6.1f})")
    print("  instrumentos:", ", ".join(sorted(p.usados)))
    for a in p.avisos:
        print("  aviso:", a)


def main(cenas):
    linha = json.loads(LINHA.read_text(encoding="utf-8"))
    if linha.get("estimada"):
        print("aviso: linha do tempo com falas ESTIMADAS; rode de novo quando as vozes estiverem prontas")
    STEMS.mkdir(exist_ok=True)
    PREVIAS.mkdir(exist_ok=True)
    for cid in cenas:
        x, p = _compor(cid, linha)
        assert x.dtype == np.float32 and x.ndim == 2 and x.shape[1] == 2
        assert len(x) == int(round((p.dur + CAUDA) * SR)) and np.isfinite(x).all()
        wav = STEMS / f"{cid}.wav"
        sf.write(wav, x, SR, subtype="FLOAT")
        subprocess.run([str(M.FFMPEG), "-y", "-loglevel", "error", "-i", str(wav), "-c:a", "libmp3lame",
                        "-b:a", "192k", str(PREVIAS / f"{cid}.mp3")], check=True)
        _figura(p, x, PREVIAS / f"{cid}.png")
        _relatorio(p, x)
        print(f"  → {wav}")


if __name__ == "__main__":
    main([c for c in sys.argv[1:] if c in CENAS] or CENAS)
