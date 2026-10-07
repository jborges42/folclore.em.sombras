"""Pipeline de tomadas da narração: para cada fala do roteiro, N tomadas, avaliação objetiva, a melhor.

Uso (de curupira/producao):
  .venv-tts/bin/python vozes/narrar.py                    # todas as falas do roteiro.json
  .venv-tts/bin/python vozes/narrar.py aviso_04 noite_    # só esses beats (id exato ou prefixo)
Opções: --tomadas N (2) · --teto M (5) · --refazer (ignora o cache de tomadas) · --saida PASTA
        --backend qwen (padrão) | leve | arquivo.py[:funcao]   ("leve" = Piper pt_BR, só para testar o pipeline;
        a saída dele vai para vozes/teste_leve/ para não misturar com as falas reais)

Backend = sintetizar(papel, texto, semente, variacao) -> (np.ndarray float32 mono, sr). `variacao` traz
{"direcao": texto do campo "voz" do beat, "temperatura"/"expressividade": fatores relativos (1 = padrão)}.
Padrão: Qwen3-TTS 1.7B Base clonando vozes/referencias/<papel>.wav (curupira = clone do Zé + curupira_efeito).
Cada tomada passa por ajustar_tempo (velocidade do papel) e, no curupira, pelo efeito de timbre, ANTES de ser
avaliada: o que se mede é o que vai para a mixagem.

Saídas (em vozes/): falas/<beat>.wav (a escolhida: aparada, 48 kHz mono, loudness do papel; para o curupira
também falas/<beat>_crua.wav, a mesma tomada sem o efeito), tomadas/<beat>/tNN.wav (todas, para auditoria),
selecao.json (métricas de todas as tomadas e a escolha; serve de cache) e SELECAO.md (falas abaixo do limiar).

Escore de cada tomada, 0 a 100 = 100 * (0,35 I + 0,30 N + 0,20 P + 0,15 T), cada termo em [0, 1]:
  I inteligibilidade  1 - 2,5 WER - 0,5 (erros nas 2 últimas palavras) - 0,25 (palavras sobrando depois do fim)
                      (WER normalizado: minúsculas, sem acento nem pontuação, números por extenso)
  N naturalidade      (UTMOS - 1,5) / 2,5   (curupira: UTMOS da voz antes do efeito, que o derruba de propósito)
  P prosódia          média de: faixa de F0 (p10-p90, semitons) dentro da faixa do papel; velocidade
                      (palavras/s na fala aparada) dentro da faixa do papel; pausas internas anormais
  T técnica           1 - penalidades (clipping, cliques, pico espectral estreito, ruído de fundo, corte abrupto
                      no fim, silêncio longo nas pontas)
APROVADA = passa em todos os LIMIARES. Escolhida = aprovada de maior escore. Sem aprovada, gera mais N tomadas
(até o teto); persistindo, fica a de menos reprovações (desempate pelo escore) e a fala vai para o SELECAO.md.
"""
import argparse
import hashlib
import importlib.util
import inspect
import json
import os
import random
import re
import sys
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from functools import cache
from math import gcd
from pathlib import Path

AQUI = Path(__file__).resolve().parent
PROD = AQUI.parent
MODELOS = PROD / ".modelos"
os.environ.setdefault("HF_HOME", str(MODELOS / "hf"))
os.environ.setdefault("TORCH_HOME", str(MODELOS / "torch"))
os.environ.setdefault("HF_HUB_OFFLINE", "1")

import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402
from scipy.ndimage import median_filter, uniform_filter1d  # noqa: E402
from scipy.signal import resample_poly, stft  # noqa: E402

ROTEIRO = PROD.parent / "roteiro.json"
SR_FINAL = 48000
VERSAO_METRICAS = 3  # suba ao mudar medir(): as métricas são refeitas sem regerar o áudio

# Por papel: velocidade (palavras/s na fala aparada, pausas internas incluídas), faixa de F0 aceitável
# (p10-p90 em semitons: abaixo é monotonia "robótica", acima é exagero) e loudness da fala final (LUFS).
PAPEIS = {
    "narrador": dict(vel=(2.2, 2.7), f0=(3.5, 12.0), lufs=-20.0),  # pausado, à beira do fogo
    "tiao": dict(vel=(2.0, 3.0), f0=(3.5, 14.0), lufs=-19.0),      # arrastado, fala alto
    "ze": dict(vel=(2.6, 3.6), f0=(3.5, 14.0), lufs=-20.0),        # rápido, afobado
    "vo": dict(vel=(1.8, 2.5), f0=(3.0, 12.0), lufs=-22.0),        # baixa, lenta, mansa
    "curupira": dict(vel=(1.6, 2.5), f0=(3.0, 14.0), lufs=-21.0),  # devagar; a cantiga é meio cantada
}
# velocidade só reprova falas com 8+ palavras: em "E a mata ouviu." o ataque e o fim dominam a conta
LIMIARES = dict(wer=0.15, utmos=3.0, nota=60.0, folga_vel=0.10, clip_ms=1.0, cliques_s=1.0, pico_db=15.0,
                snr_db=30.0, parada=85.0)  # parada: 1a tomada aprovada com escore >= isso dispensa as outras
# Variação entre tomadas (fatores sobre os parâmetros do backend); a semente muda em toda tomada.
VARIACOES = [{}, {"temperatura": 0.8}, {"temperatura": 1.1, "expressividade": 1.2}, {"temperatura": 0.9},
             {"temperatura": 0.7, "expressividade": 0.85}]
APARA = dict(limiar_db=-45.0, antes=0.08, depois=0.20, fade_in=0.015, fade_out=0.08)  # pós-processamento


# ---------------------------------------------------------------- texto

def norm(t):
    """Minúsculas, sem acento nem pontuação, números por extenso, formas coloquiais unificadas."""
    from num2words import num2words
    t = re.sub(r"\d+", lambda m: num2words(int(m.group()), lang="pt_BR"), t.replace("-", ""))
    t = "".join(c for c in unicodedata.normalize("NFKD", t.lower()) if not unicodedata.combining(c))
    equiv = {"esta": "ta", "estou": "to", "pra": "para"}  # Whisper troca "tá" por "está" e afins
    return " ".join(equiv.get(w, w) for w in re.sub(r"[^a-z0-9]+", " ", t).split())


def comparar(texto, hip):
    """WER e o fim da frase: erros nas 2 últimas palavras e palavras sobrando depois da última."""
    import jiwer
    ref, h = norm(texto).split(), norm(hip).split()
    if not h:
        return dict(wer=1.0, erros_fim=min(2, len(ref)), extra_fim=0, erradas=ref, transcricao=hip)
    o = jiwer.process_words(" ".join(ref), " ".join(h))
    ok, extra = [False] * len(ref), 0
    for c in o.alignments[0]:
        if c.type == "equal":
            ok[c.ref_start_idx:c.ref_end_idx] = [True] * (c.ref_end_idx - c.ref_start_idx)
        elif c.type == "insert" and c.ref_start_idx == len(ref):
            extra += c.hyp_end_idx - c.hyp_start_idx
    return dict(wer=round(o.wer, 3), erros_fim=ok[-2:].count(False), extra_fim=extra,
                erradas=[w for w, b in zip(ref, ok) if not b], transcricao=hip)


def com_reserva(texto, pronuncia):
    """Troca as palavras do roteiro["pronuncia"] pela grafia de reserva para o TTS (mantém a maiúscula)."""
    for p in pronuncia:
        r = p["reserva_tts"]
        texto = re.sub(rf"\b{p['palavra']}\b", lambda m: (r[0].upper() if m.group()[0].isupper() else r[0].lower())
                       + r[1:], texto, flags=re.I)
    return texto


# ---------------------------------------------------------------- modelos de avaliação (carregados uma vez)

@cache
def asr():
    from faster_whisper import WhisperModel
    return WhisperModel("Zoont/faster-whisper-large-v3-turbo-int8-ct2", device="cpu", compute_type="int8",
                        cpu_threads=4, local_files_only=True)


@cache
def mos():
    import torch
    torch.set_num_threads(4)
    return torch.hub.load(str(MODELOS / "torch" / "hub" / "tarepan_SpeechMOS_v1.2.0"), "utmos22_strong",
                          source="local", trust_repo=True).eval()


def utmos(x16):
    import torch
    with torch.no_grad():
        return float(mos()(torch.from_numpy(x16)[None], 16000).item())


# ---------------------------------------------------------------- medidas de sinal

def para(x, sr, alvo):
    g = gcd(sr, alvo)
    return x if sr == alvo else resample_poly(x, alvo // g, sr // g).astype(np.float32)


def nivel_db(x, sr, passo=0.01, janela=0.03):
    """Nível em dBFS, janelas de 30 ms a cada 10 ms."""
    p = uniform_filter1d(np.square(x, dtype=np.float64), max(1, int(janela * sr)))[::int(passo * sr)]
    return 10 * np.log10(p + 1e-12)


def f0_yin(x, sr=16000, fmin=60, fmax=500, w=512, passo=160, limiar=0.15):
    """F0 por quadro de 10 ms (Hz; 0 = não vozeado) pelo YIN (de Cheveigné e Kawahara, 2002), via FFT."""
    tmin, tmax = sr // fmax, sr // fmin
    n = (len(x) - w - tmax) // passo
    if n < 1:
        return np.zeros(0)
    q = x[np.arange(w + tmax)[None] + passo * np.arange(n)[:, None]].astype(np.float64)
    nfft = 1 << (2 * (w + tmax) - 1).bit_length()
    r = np.fft.irfft(np.conj(np.fft.rfft(q[:, :w], nfft)) * np.fft.rfft(q, nfft), nfft)[:, :tmax + 1]
    c = np.concatenate([np.zeros((n, 1)), np.cumsum(q * q, axis=1)], axis=1)
    tau = np.arange(tmax + 1)
    d = c[:, [w]] + c[:, w + tau] - c[:, tau] - 2 * r  # diferença quadrática média d(tau)
    cm = np.ones_like(d)
    cm[:, 1:] = d[:, 1:] * tau[1:] / np.maximum(np.cumsum(d[:, 1:], axis=1), 1e-12)
    f0 = np.zeros(n)
    energia = 10 * np.log10(c[:, w] / w + 1e-12)
    for i in np.flatnonzero(energia > energia.max() - 35):
        abaixo = np.flatnonzero(cm[i, tmin:] < limiar)
        if len(abaixo):
            t = tmin + abaixo[0]
            while t < tmax and cm[i, t + 1] < cm[i, t]:
                t += 1
            f0[i] = sr / t
    return f0


def cliques_por_s(x, sr):
    """Descontinuidades impulsivas: |2a diferença| > 10x o RMS local (20 ms) e acima de 2% do pico."""
    d2 = np.diff(x.astype(np.float64), 2)
    loc = np.sqrt(uniform_filter1d(d2 * d2, int(0.02 * sr)) + 1e-12)
    ev = np.flatnonzero((np.abs(d2) > 10 * loc) & (np.abs(d2) > 0.02 * np.abs(x).max()))
    return (1 + np.count_nonzero(np.diff(ev) > int(0.005 * sr))) / (len(x) / sr) if len(ev) else 0.0


def pico_espectral_db(x, sr):
    """Maior saliência estreita (dB acima da mediana de +-250 Hz) no espectro médio acima de 1 kHz:
    apito, zumbido ou linha de vocoder. A fala, com F0 variando, deixa esse espectro liso."""
    nper = 1 << int(round(np.log2(sr * 0.085)))
    f, _, z = stft(x, sr, nperseg=nper, noverlap=nper * 3 // 4)
    ltas = 10 * np.log10(np.mean(np.abs(z) ** 2, axis=1) + 1e-20)
    sal = ltas - median_filter(ltas, int(500 / (f[1] - f[0])) | 1, mode="nearest")
    return float(sal[(f > 1000) & (f < 0.9 * sr / 2)].max())


def medir(wav, texto, glossario, wav_mos=None):
    """Métricas objetivas de uma tomada. wav_mos: arquivo para o UTMOS, se outro (curupira: a voz antes do efeito,
    que derruba o UTMOS de propósito; a inteligibilidade é medida depois do efeito)."""
    t0 = time.time()
    x, sr = sf.read(str(wav), dtype="float32")
    x = x.mean(axis=1) if x.ndim > 1 else x
    x16 = para(x, sr, 16000)
    db = nivel_db(x, sr)
    ativo = np.flatnonzero(db > db.max() - 40)
    if len(x) < 0.2 * sr or len(ativo) < 10:
        return dict(vazia=True)
    ini, fim = max(0.0, ativo[0] * 0.01 - 0.015), min(len(x) / sr, ativo[-1] * 0.01 + 0.015)  # quadros de 30 ms
    segs, _ = asr().transcribe(x16, language="pt", beam_size=5, condition_on_previous_text=False,
                               without_timestamps=True, vad_filter=False, initial_prompt=glossario)
    m = comparar(texto, " ".join(s.text.strip() for s in segs))
    m["utmos"] = round(utmos(x16 if wav_mos is None else para(*sf.read(str(wav_mos), dtype="float32"), 16000)), 3)
    # prosódia
    f0 = f0_yin(x16)
    v = f0[f0 > 0]
    if len(v) >= 30:
        st = 12 * np.log2(v / np.median(v))
        m.update(f0_mediana_hz=round(float(np.median(v)), 1),
                 f0_faixa_st=round(float(np.percentile(st, 90) - np.percentile(st, 10)), 2))
    else:  # sussurro ou fala curtíssima: sem F0 confiável
        m.update(f0_mediana_hz=None, f0_faixa_st=None)
    m["vel"] = round(len(norm(texto).split()) / (fim - ini), 3)
    mudo = np.r_[False, db[ativo[0]:ativo[-1] + 1] <= db.max() - 40, False]
    bordas = np.flatnonzero(np.diff(mudo.astype(int)))
    pausas = (bordas[1::2] - bordas[::2]) * 0.01
    pausas = pausas[pausas >= 0.25]
    pontuacao = len(re.findall(r"[,.;:!?…]+", texto.strip().rstrip(".!?…").strip()))
    limite = 2.2 if ("..." in texto or "…" in texto) else 1.5
    m.update(pausas=[round(float(p), 2) for p in pausas],
             pausas_anomalas=max(0, len(pausas) - pontuacao) + int(len(pausas) > 0 and pausas.max() > limite))
    # técnica
    piso = db[db <= db.max() - 40]
    m.update(clip_ms=round(1000 * np.count_nonzero(np.abs(x) >= 0.999) / sr, 2),
             cliques_s=round(cliques_por_s(x, sr), 2),
             pico_db=round(pico_espectral_db(x[int(ini * sr):int(fim * sr)], sr), 1),
             snr_db=round(float(np.percentile(db, 95) - (np.median(piso) if len(piso) >= 20 else np.percentile(db, 5))), 1),
             sil_ini=round(ini, 2), sil_fim=round(len(x) / sr - fim, 2),
             fim_abrupto=bool(db[-1] > db.max() - 30), dur=round(len(x) / sr, 2), avaliacao_s=round(time.time() - t0, 1))
    return m


# ---------------------------------------------------------------- escore e limiares

def faixa_vel(papel, direcao, texto=""):
    lo, hi = PAPEIS[papel]["vel"]
    if "..." in texto or "…" in texto:  # hesitação dirigida: a pausa longa é parte da fala
        lo *= 0.75
    if re.search(r"devagar|lent", direcao or "", re.I):
        lo, hi = lo * 0.85, hi * 0.9
    if re.search(r"rápid|apressad|ligeir|afob|berr|pânico", direcao or "", re.I):
        lo, hi = lo * 1.05, hi * 1.2
    return lo, hi


def dentro(v, lo, hi, folga):
    """1 dentro de [lo, hi], caindo linearmente até 0 a `folga` de distância."""
    return float(np.clip(1 - max(lo - v, v - hi, 0) / folga, 0, 1))


def pontuar(m, papel, direcao, texto=""):
    """-> (escore 0-100, componentes, reprovações)."""
    if m.get("vazia"):
        return 0.0, {}, ["tomada vazia"]
    L, (vlo, vhi), (flo, fhi) = LIMIARES, faixa_vel(papel, direcao, texto), PAPEIS[papel]["f0"]
    f0 = m["f0_faixa_st"]
    c = dict(I=np.clip(1 - 2.5 * m["wer"] - 0.5 * m["erros_fim"] - 0.25 * m["extra_fim"], 0, 1),
             N=np.clip((m["utmos"] - 1.5) / 2.5, 0, 1),
             P=(dentro(f0, flo, fhi, 3.0) if f0 is not None else 1.0) / 3 + dentro(m["vel"], vlo, vhi, 0.6) / 3
             + max(0.0, 1 - 0.5 * m["pausas_anomalas"]) / 3,
             T=max(0.0, 1 - 0.5 * min(1, m["clip_ms"] / 5) - 0.3 * min(1, m["cliques_s"] / 2)
                   - 0.3 * np.clip((m["pico_db"] - 10) / 10, 0, 1) - 0.3 * np.clip((40 - m["snr_db"]) / 20, 0, 1)
                   - 0.5 * m["fim_abrupto"] - 0.1 * (m["sil_ini"] > 1.0) - 0.1 * (m["sil_fim"] > 2.0)))
    nota = 100 * (0.35 * c["I"] + 0.30 * c["N"] + 0.20 * c["P"] + 0.15 * c["T"])
    fv = L["folga_vel"]
    falhas = [txt for ruim, txt in [
        (m["wer"] > L["wer"], f"WER {m['wer']:.2f} > {L['wer']}"),
        (m["erros_fim"] > 0, f"fim da frase: {m['erros_fim']} das 2 últimas palavras erradas"),
        (m["extra_fim"] > 0, f"fim da frase: {m['extra_fim']} palavra(s) sobrando"),
        (m["utmos"] < L["utmos"], f"UTMOS {m['utmos']:.2f} < {L['utmos']}"),
        (len(norm(texto).split()) >= 8 and not vlo * (1 - fv) <= m["vel"] <= vhi * (1 + fv), f"velocidade {m['vel']:.2f} fora de {vlo:.2f}-{vhi:.2f} palavras/s"),
        (f0 is not None and f0 < flo, f"F0 monótona: faixa {f0:.1f} < {flo} semitons" if f0 else ""),
        (f0 is not None and f0 > fhi + 2, f"F0 exagerada: faixa {f0:.1f} > {fhi + 2} semitons" if f0 else ""),
        (m["pausas_anomalas"] > 0, f"pausa interna anormal {m['pausas']}"),
        (m["clip_ms"] > L["clip_ms"], f"clipping {m['clip_ms']} ms"),
        (m["cliques_s"] > L["cliques_s"], f"cliques {m['cliques_s']}/s"),
        (m["pico_db"] > L["pico_db"], f"pico espectral {m['pico_db']} dB"),
        (m["snr_db"] < L["snr_db"], f"ruído de fundo: SNR {m['snr_db']} dB"),
        (m["fim_abrupto"], "corte abrupto no fim"),
        (nota < L["nota"], f"escore {nota:.0f} < {L['nota']:.0f}"),
    ] if ruim]
    return round(nota, 1), {k: round(float(v), 3) for k, v in c.items()}, falhas


# ---------------------------------------------------------------- backends

def backend_leve():
    """Piper pt_BR, SÓ PARA TESTE do pipeline: vozes masculinas, prosódia limitada, ruído interno não semeável."""
    from piper import PiperVoice, SynthesisConfig
    raiz = next((MODELOS / "hf" / "hub" / "models--rhasspy--piper-voices" / "snapshots").glob("*/pt/pt_BR"))
    voz = {"narrador": ("cadu", 1.15), "tiao": ("faber", 1.25), "ze": ("faber", 1.0), "vo": ("cadu", 1.35),
           "curupira": ("faber", 1.35)}  # papel -> (voz, length_scale)
    carregadas = {}

    def sintetizar(papel, texto, semente, variacao):
        nome, dur = voz[papel]
        if nome not in carregadas:
            carregadas[nome] = PiperVoice.load(next(raiz.glob(f"{nome}/*/*.onnx")))
        v = carregadas[nome]
        cfg = SynthesisConfig(length_scale=dur, noise_scale=0.667 * variacao.get("temperatura", 1.0),
                              noise_w_scale=0.8 * variacao.get("expressividade", 1.0), normalize_audio=False)
        pausa = np.zeros(int(0.35 * v.config.sample_rate), np.float32)
        partes = [np.r_[c.audio_float_array, pausa] for c in v.synthesize(texto, cfg)]
        return np.concatenate(partes)[:-len(pausa)], v.config.sample_rate

    return sintetizar


REFS = AQUI / "referencias"  # <papel>.wav (vozes desenhadas no Qwen3-TTS VoiceDesign) + referencia.txt
# Pronúncia testada no clone (WER 0, UTMOS >= 4,2): "Zé... ô, Zé..." sai certo como está no roteiro, assim
# como Curupira, sapopemas, queixada, embaúba, inhambu, urutau e Anchieta; nenhuma grafia especial é necessária.
# Se alguma errar, a 2a rodada usa a grafia de reserva do roteiro (com_reserva).


def backend_qwen():
    """Qwen3-TTS 1.7B Base (mlx) clonando a voz de referência do papel: timbre constante em todas as falas.
    Curupira = clone da voz do Zé (o efeito de timbre entra depois, em curupira_efeito)."""
    from mlx_audio.tts.utils import load_model
    snap = next((MODELOS / "hf" / "hub" / "models--mlx-community--Qwen3-TTS-12Hz-1.7B-Base-bf16" / "snapshots").glob("*"))
    modelo = load_model(str(snap))
    ref_texto = (REFS / "referencia.txt").read_text(encoding="utf-8").strip()

    def sintetizar(papel, texto, semente, variacao):
        voz = "ze" if papel == "curupira" else papel
        partes = modelo.generate(texto, ref_audio=str(REFS / f"{voz}.wav"), ref_text=ref_texto,
                                 lang_code="portuguese", temperature=0.9 * variacao.get("temperatura", 1.0))
        return np.concatenate([np.asarray(r.audio, np.float32).reshape(-1) for r in partes]), modelo.sample_rate

    return sintetizar


def curupira_efeito(x, sr, intensidade=0.6, lentidao=1.0):
    """Timbre do Curupira a partir do clone do Zé: altura acima (3 semitons), formante levemente infantil,
    tremor e um duplo sutil (a lentidão já vem de ajustar_tempo). SEM ecos nem reverb (a mixagem põe). Mesmo método de
    trilha/sintese.curupirizar, sem a cauda. -> (y, 48000)"""
    from fractions import Fraction
    sys.path.insert(0, str(PROD / "trilha"))
    import sintese as s
    x = para(np.asarray(x, np.float32), sr, s.SR).astype(np.float64)
    r = 2 ** (5.0 * intensidade / 12)
    fr = Fraction(r).limit_denominator(64)
    y = resample_poly(s._estica(x, r * lentidao), fr.denominator, fr.numerator)
    n = int(len(x) * lentidao)
    y = np.pad(y, (0, max(0, n - len(y))))[:n]
    xl = s._estica(x, lentidao)  # referência de envelope (formantes originais) na mesma duração
    xl = np.pad(xl, (0, max(0, n - len(xl))))[:n]
    X, Y = s._stft(xl), s._stft(y)
    ex, ey = s._envelope(X), s._envelope(Y)
    pos = np.arange(X.shape[1]) / (1 + 0.13 * intensidade)
    i = np.minimum(pos.astype(int), X.shape[1] - 2)
    a = pos - i
    y = s._istft(Y * np.exp(np.clip(ex[:, i] * (1 - a) + ex[:, i + 1] * a - ey, -3, 3)))[2048:2048 + n]
    idx = np.arange(len(y))
    t = idx / s.SR
    atraso = lambda z, base, prof, taxa: np.interp(idx - (base + prof * np.sin(2 * np.pi * taxa * t)) * s.SR, idx, z,  # noqa: E731
                                                  left=0, right=0)
    y = atraso(y, 0.001, 0.00028 * intensidade, 5.7)
    y = y + 0.35 * intensidade * atraso(y, 0.017, 0.002, 0.27)
    y *= np.abs(x).max() / max(np.abs(y).max(), 1e-9)
    return y.astype(np.float32), s.SR


# Nomes que a função do backend pode usar para cada argumento do pipeline e para os fatores de variação.
SINONIMOS = {"papel": ("papel", "personagem", "voz", "role", "speaker"), "texto": ("texto", "text", "frase"),
             "semente": ("semente", "seed"), "variacao": ("variacao", "params", "parametros", "opcoes"),
             "direcao": ("direcao", "instrucao", "instruct", "estilo")}
FATORES = {"temperatura": ("temperatura", "temperature", "temp"),
           "expressividade": ("expressividade", "exaggeration", "exagero")}


def adaptar(f, mod):
    """Encaixa f na assinatura sintetizar(papel, texto, semente, variacao) -> (float32 mono, sr), casando os
    parâmetros pelo nome. Sem parâmetro de variação, a direção vai para o parâmetro de instrução (se houver) e
    os fatores multiplicam os padrões numéricos de mesmo sentido (temperature, exaggeration...). Aceita retorno
    (áudio, sr), só o áudio (sr em mod.SR) ou o caminho de um wav."""
    ps = inspect.signature(f).parameters
    acha = lambda nomes: next((n for n in nomes if n in ps), None)  # noqa: E731
    n = {k: acha(v) for k, v in SINONIMOS.items()}
    posicionais = [p for p in ps if ps[p].kind in (inspect.Parameter.POSITIONAL_ONLY, inspect.Parameter.POSITIONAL_OR_KEYWORD)]
    n["papel"], n["texto"] = n["papel"] or posicionais[0], n["texto"] or posicionais[1]

    def sintetizar(papel, texto, semente, variacao):
        kw = {n["papel"]: papel, n["texto"]: texto}
        if n["semente"]:
            kw[n["semente"]] = semente
        if n["variacao"]:
            kw[n["variacao"]] = variacao
        else:
            if n["direcao"] and variacao.get("direcao"):
                kw[n["direcao"]] = variacao["direcao"]
            for fator, nomes in FATORES.items():
                p = acha(nomes)
                if p and fator in variacao and isinstance(ps[p].default, (int, float)):
                    kw[p] = ps[p].default * variacao[fator]
        r = f(**kw)
        a, sr = r if isinstance(r, tuple) else (r, getattr(mod, "SR", None))
        if isinstance(a, (str, Path)):
            a, sr = sf.read(str(a), dtype="float32")
        a = np.asarray(a, np.float32)
        return (a.mean(axis=1) if a.ndim > 1 else a), int(sr)

    return sintetizar


def carregar_backend(spec):
    """-> (sintetizar, identificador para o cache). spec: None, "leve" ou "arquivo.py[:funcao]"."""
    spec = spec or "qwen"
    if spec == "qwen":
        return backend_qwen(), "qwen3-tts-1.7b-base-clone:1"
    if spec == "leve":
        return backend_leve(), "leve:piper-pt_BR:1"
    arq, _, nome = spec.partition(":")
    arq = Path(arq).resolve()
    sys.path.insert(0, str(arq.parent))
    esp = importlib.util.spec_from_file_location(arq.stem, arq)
    mod = importlib.util.module_from_spec(esp)
    esp.loader.exec_module(mod)
    nome = nome or next((k for k in ("sintetizar", "gerar", "falar", "synthesize") if callable(getattr(mod, k, None))), "")
    if not nome:
        raise SystemExit(f"{arq.name}: não achei sintetizar(papel, texto, semente, variacao); use --backend {arq.name}:funcao")
    versao = getattr(mod, "VERSAO", None) or hashlib.sha1(arq.read_bytes()).hexdigest()[:10]
    return adaptar(getattr(mod, nome), mod), f"{arq.name}:{nome}:{versao}"


def semear(s):
    """Semeia os geradores já carregados (para backends que não recebem a semente)."""
    random.seed(s)
    np.random.seed(s)
    if "mlx.core" in sys.modules:
        sys.modules["mlx.core"].random.seed(s)
    if "torch" in sys.modules:
        sys.modules["torch"].manual_seed(s)


# ---------------------------------------------------------------- pós-processamento da escolhida

def finalizar(wav_tomada, papel, destino):
    """Apara as pontas (margem curta + fade), reamostra para 48 kHz mono e normaliza o loudness do papel."""
    import pyloudnorm
    x, sr = sf.read(str(wav_tomada), dtype="float32")
    x = x.mean(axis=1) if x.ndim > 1 else x
    db = nivel_db(x, sr)
    ativo = np.flatnonzero(db > db.max() + APARA["limiar_db"])
    a = max(0, int((ativo[0] * 0.01 - 0.015 - APARA["antes"]) * sr))  # quadro de 30 ms centrado em i*10 ms
    b = min(len(x), int((ativo[-1] * 0.01 + 0.015 + APARA["depois"]) * sr))
    y = para(x[a:b], sr, SR_FINAL).astype(np.float64)
    fi, fo = int(APARA["fade_in"] * SR_FINAL), int(APARA["fade_out"] * SR_FINAL)
    y[:fi] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, fi))
    y[-fo:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo))
    lufs = pyloudnorm.Meter(SR_FINAL).integrated_loudness(y)
    y *= 10 ** ((PAPEIS[papel]["lufs"] - lufs) / 20)
    y *= min(1.0, 10 ** (-1 / 20) / np.abs(y).max())  # pico de amostra <= -1 dBFS
    sf.write(str(destino), y.astype(np.float32), SR_FINAL, subtype="PCM_24")
    return dict(arquivo=destino.name, dur=round(len(y) / SR_FINAL, 3),
                lufs=round(pyloudnorm.Meter(SR_FINAL).integrated_loudness(y), 1), corte_s=[round(a / sr, 3), round(b / sr, 3)])


# ---------------------------------------------------------------- pipeline

POS_VERSAO = "atempo-centro:1"  # entra na chave das tomadas: mudar o ajuste de tempo regera as tomadas


def ajustar_tempo(x, sr, texto, papel, direcao):
    """O clone fala mais rápido que a referência (3,3-3,7 palavras/s no narrador). Fora da faixa do papel, leva a
    velocidade ao centro da faixa com o atempo do libavfilter (WSOLA, feito para fala: UTMOS 4,06 -> 3,89 a 0,75x;
    o vocoder de fase caía para 1,59). Limitado a 0,70-1,15x. -> (áudio, fator)"""
    db = nivel_db(x, sr)
    ativo = np.flatnonzero(db > db.max() - 40)
    if len(ativo) < 10:
        return x, 1.0
    vel = len(norm(texto).split()) / ((ativo[-1] - ativo[0]) * 0.01 + 0.03)
    lo, hi = faixa_vel(papel, direcao, texto)
    if lo <= vel <= hi:
        return x, 1.0
    f = float(np.clip((lo + hi) / 2 / vel, 0.70, 1.15))
    import av  # libavfilter do PyAV (idêntico ao binário do ffmpeg, sem depender de arquivo fora do venv)
    g = av.filter.Graph()
    src, at, sink = g.add_abuffer(format="flt", sample_rate=sr, layout="mono"), g.add("atempo", f"{f:.4f}"), g.add("abuffersink")
    src.link_to(at)
    at.link_to(sink)
    g.configure()
    q = av.AudioFrame.from_ndarray(np.asarray(x, np.float32)[None], format="flt", layout="mono")
    q.sample_rate = sr
    saida = []
    for quadro in (q, None):  # None esvazia o filtro
        g.push(quadro)
        while True:
            try:
                saida.append(g.pull().to_ndarray().reshape(-1))
            except (av.BlockingIOError, av.EOFError):
                break
    return np.concatenate(saida), round(f, 3)


def chave(*partes):
    return hashlib.sha1(json.dumps(partes, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:16]


def narrar(b, sintetizar, backend_id, ex, a, antigo, glossario, pronuncia, saida):
    """Gera (ou reaproveita do cache) as tomadas de um beat, avalia, escolhe e finaliza. -> registro do selecao.json"""
    pasta = saida / "tomadas" / b["id"]
    pasta.mkdir(parents=True, exist_ok=True)
    cache = {} if a.refazer else {t["t"]: t for t in antigo.get("tomadas", [])}
    papel, direcao, texto_tts = b["papel"], b.get("voz"), b["texto"]
    # começa com 1 tomada (ou as que já estão no cache); parada antecipada se ela for aprovada com escore alto
    tomadas, rodadas, total = [], 0, max(1, min(len(cache), a.teto))
    while True:
        rodadas += 1
        pendentes = []
        for k in range(len(tomadas), total):
            var = {"direcao": direcao, **VARIACOES[k % len(VARIACOES)]}
            t = dict(t=f"t{k + 1:02d}", chave=chave(backend_id, POS_VERSAO, papel, texto_tts, k + 1, var), semente=k + 1,
                     variacao=var, texto_tts=texto_tts)
            wav = pasta / f"{t['t']}.wav"
            c = cache.get(t["t"])
            if c and c["chave"] == t["chave"] and wav.exists():
                t = c
            else:
                t0 = time.time()
                semear(k + 1)
                audio, sr = sintetizar(papel, texto_tts, k + 1, var)
                audio, t["atempo"] = ajustar_tempo(audio, sr, b["texto"], papel, direcao)
                if papel == "curupira":  # guarda a crua; avalia (e escolhe) já com o timbre do Curupira
                    sf.write(str(pasta / f"{t['t']}_crua.wav"), np.clip(audio, -1, 1), sr, subtype="PCM_16")
                    audio, sr = curupira_efeito(audio, sr)
                sf.write(str(wav), np.clip(audio, -1, 1), sr, subtype="PCM_16")
                t["geracao_s"] = round(time.time() - t0, 1)
            if t.get("versao") != VERSAO_METRICAS:  # mede na CPU enquanto o backend gera a próxima tomada
                crua = pasta / f"{t['t']}_crua.wav" if papel == "curupira" else None
                pendentes.append((t, ex.submit(medir, wav, b["texto"], glossario, crua)))
            tomadas.append(t)
        for t, fut in pendentes:
            t["metricas"], t["versao"] = fut.result(), VERSAO_METRICAS
        for t in tomadas:
            t["nota"], t["componentes"], t["falhas"] = pontuar(t["metricas"], papel, direcao, b["texto"])
        melhor = min(tomadas, key=lambda t: (len(t["falhas"]), -t["nota"]))
        if (not melhor["falhas"] and (len(tomadas) >= a.tomadas or melhor["nota"] >= LIMIARES["parada"])) or total >= a.teto:
            break
        total = min(max(total + 1, a.tomadas) if not melhor["falhas"] else total + a.tomadas, a.teto)
        if set(melhor["metricas"].get("erradas", [])) & {norm(p["palavra"]) for p in pronuncia}:
            texto_tts = com_reserva(b["texto"], pronuncia)  # errou palavra difícil: tenta a grafia de reserva
    for t in tomadas:
        m = t["metricas"]
        print(f"  {b['id']} {t['t']} escore {t['nota']:5.1f}" + ("" if m.get("vazia") else
              f" | WER {m['wer']:.2f} fim {m['erros_fim']}+{m['extra_fim']} UTMOS {m['utmos']:.2f}"
              f" F0 {m['f0_faixa_st']} st {m['vel']:.2f} p/s") + f" | {'; '.join(t['falhas']) or 'aprovada'}"
              + (" <- escolhida" if t is melhor else ""), flush=True)
    for velho in pasta.glob("t*.wav"):  # tomadas de uma configuração anterior que não entraram nesta
        if velho.stem.split("_")[0] not in {t["t"] for t in tomadas}:
            velho.unlink()
    falas = saida / "falas"
    falas.mkdir(exist_ok=True)
    final = finalizar(pasta / f"{melhor['t']}.wav", papel, falas / f"{b['id']}.wav")
    if papel == "curupira":
        final["crua"] = finalizar(pasta / f"{melhor['t']}_crua.wav", papel, falas / f"{b['id']}_crua.wav")["arquivo"]
    return dict(papel=papel, texto=b["texto"], direcao=direcao, backend=backend_id, escolhida=melhor["t"],
                aprovada=not melhor["falhas"], nota=melhor["nota"], falhas=melhor["falhas"], rodadas=rodadas,
                saida=final, tomadas=tomadas)


COMO_USAR = """## Como rodar

```
cd curupira/producao
.venv-tts/bin/python vozes/narrar.py                   # todas as falas (as tomadas já feitas vêm do cache)
.venv-tts/bin/python vozes/narrar.py aviso_04 noite_   # só esses beats (id ou prefixo)
```
Opções: `--tomadas 2` por rodada, `--teto 5` no total, `--refazer` (ignora o cache), `--saida PASTA`,
`--backend qwen|leve|arquivo.py[:funcao]`. Depois: `.venv/bin/python linha_do_tempo.py` (durações reais das falas).

## Backend e vozes

Padrão (`qwen`): Qwen3-TTS 1.7B Base (mlx) em modo clone, com a voz de cada papel em `vozes/referencias/<papel>.wav`
(desenhadas no Qwen3-TTS VoiceDesign com `instrucoes_voicedesign.json`; a do narrador é a escolhida pelo usuário) e
`referencia.txt` como transcrição. Timbre constante em todas as falas. O Curupira é o clone do Zé passado por
`curupira_efeito` (3 semitons acima, formante levemente infantil, tremor e duplo sutil, sem ecos nem reverb: a mixagem
põe); a versão sem efeito fica em `falas/<beat>_crua.wav`. O clone fala mais rápido que as referências, então cada
tomada fora da faixa de velocidade do papel é levada ao centro dela com o `atempo` do ffmpeg (0,70 a 1,15x) antes da
avaliação. Créditos e licença: `creditos_voz.json`.

Outro backend: `--backend arquivo.py[:funcao]` com `sintetizar(papel, texto, semente, variacao) -> (áudio, sr)`; o
pipeline casa os parâmetros pelo nome (`papel`/`voz`, `texto`/`text`, `semente`/`seed`, `variacao`, ou `instruct` e
`temperature` soltos) e aceita retorno `(áudio, sr)`, só o áudio (com `SR` no módulo) ou o caminho de um wav. Defina
`VERSAO = "..."` no módulo: ela entra na chave do cache. O backend `leve` (Piper) é só para teste e grava em
`vozes/teste_leve/`.

## Escore e limiares

Escore 0 a 100 = 100 x (0,35 inteligibilidade + 0,30 naturalidade + 0,20 prosódia + 0,15 técnica):
inteligibilidade = 1 - 2,5 WER (faster-whisper, texto normalizado) - 0,5 por erro nas 2 últimas palavras -
0,25 por palavra sobrando no fim; naturalidade = (UTMOS - 1,5)/2,5 (no Curupira, medido antes do efeito); prosódia = faixa de F0 (p10-p90 em semitons),
palavras/s da fala aparada e pausas internas anormais, contra as faixas do papel (`PAPEIS` no narrar.py; "devagar",
"lento", "apressado", "berrando" na direção do beat deslocam a faixa de velocidade); técnica = clipping, cliques,
pico espectral estreito (apito/zumbido), ruído de fundo, corte abrupto no fim e silêncio longo nas pontas.
Aprovada = passa em todos os `LIMIARES` (WER, fim da frase, UTMOS, velocidade, F0, pausas, técnica, escore mínimo).
Sem aprovada, o pipeline gera mais tomadas até o teto (se o erro foi numa palavra de `pronuncia` do roteiro, as
novas usam a grafia de reserva); persistindo, fica a de menos reprovações e a fala entra na tabela acima.
Tudo por tomada está em `selecao.json`; os áudios em `tomadas/<beat>/tNN.wav`.
"""


def relatorio(saida, sel):
    falas = sel.get("falas", {})
    ruins = {i: f for i, f in falas.items() if not f["aprovada"]}
    extras = [i for i, f in falas.items() if f["rodadas"] > 1]
    linhas = ["# Seleção de tomadas da narração", "",
              f"Gerado por `vozes/narrar.py` em {sel.get('atualizado', '-')} com o backend `{sel.get('backend', '-')}`: "
              f"{len(falas)} falas, {sum(len(f['tomadas']) for f in falas.values())} tomadas avaliadas, "
              f"{len(falas) - len(ruins)} falas com tomada aprovada.", "",
              "## Falas abaixo do limiar (revisão humana)", ""]
    if ruins:
        linhas += ["| fala | papel | escore (tomada) | tomadas | o que falhou na escolhida | texto |",
                   "|---|---|---|---|---|---|"]
        linhas += [f"| {i} | {f['papel']} | {f['nota']:.0f} ({f['escolhida']}) | {len(f['tomadas'])} | "
                   f"{'; '.join(f['falhas'])} | {f['texto']} |" for i, f in ruins.items()]
    else:
        linhas.append("Nenhuma: toda fala tem uma tomada aprovada." if falas else "Nenhuma fala gerada ainda nesta pasta.")
    if extras:
        linhas += ["", f"Precisaram de tomadas extras: {', '.join(extras)}."]
    (saida / "SELECAO.md").write_text("\n".join(linhas + ["", COMO_USAR]), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser(description="Tomadas, avaliação objetiva e seleção das falas do roteiro.")
    ap.add_argument("beats", nargs="*", help="ids ou prefixos de beats (padrão: todas as falas)")
    ap.add_argument("--tomadas", type=int, default=2, help="tomadas por rodada (padrão 2)")
    ap.add_argument("--teto", type=int, default=5, help="máximo de tomadas por fala (padrão 5)")
    ap.add_argument("--backend", help='"qwen" (padrão), "leve" ou arquivo.py[:funcao]')
    ap.add_argument("--saida", type=Path, help="pasta de saída (padrão: vozes/, ou vozes/teste_leve/ com o leve)")
    ap.add_argument("--refazer", action="store_true", help="ignora o cache de tomadas")
    ap.add_argument("--parte", help="i/n: só a i-ésima de n partes equilibradas pelo total de palavras (processos paralelos)")
    a = ap.parse_args()
    roteiro = json.loads(ROTEIRO.read_text(encoding="utf-8"))
    todas = [b for c in roteiro["cenas"] for b in c["beats"] if b["tipo"] == "fala"]
    falas = [b for b in todas if not a.beats or any(b["id"].startswith(s) for s in a.beats)]
    if a.parte:  # guloso: a fala mais longa vai para a parte mais leve
        i, n = map(int, a.parte.split("/"))
        partes = [[] for _ in range(n)]
        for b in sorted(falas, key=lambda b: -len(b["texto"].split())):
            min(partes, key=lambda p: sum(len(x["texto"].split()) for x in p)).append(b)
        falas = [b for b in falas if b in partes[i - 1]]
    sintetizar, backend_id = carregar_backend(a.backend)
    saida = (a.saida or (AQUI / "teste_leve" if backend_id.startswith("leve") else AQUI)).resolve()
    saida.mkdir(parents=True, exist_ok=True)
    arq = saida / "selecao.json"
    sel = json.loads(arq.read_text(encoding="utf-8")) if arq.exists() else {}
    pronuncia = roteiro.get("pronuncia", [])
    # vocabulário raro do roteiro como prompt do Whisper (sem ele, "prenhe" bem dito era transcrito "prene")
    glossario = ", ".join([p["palavra"] for p in pronuncia] + ["Tião", "Zé", "Vó", "prenhe", "bornal", "bugios"]) + "."
    print(f"backend {backend_id} | {len(falas)} falas | saída {saida}", flush=True)
    with ThreadPoolExecutor(1) as ex:
        for b in falas:
            t0 = time.time()
            r = narrar(b, sintetizar, backend_id, ex, a, sel.get("falas", {}).get(b["id"], {}), glossario, pronuncia, saida)
            print(f"{b['id']} ({b['papel']}): {r['escolhida']} escore {r['nota']:.0f}, "
                  f"{'aprovada' if r['aprovada'] else 'ABAIXO DO LIMIAR'}, {len(r['tomadas'])} tomadas, {time.time() - t0:.0f}s", flush=True)
            sel = gravar_selecao(arq, b["id"], r, backend_id, todas)
    relatorio(saida, gravar_selecao(arq, None, None, backend_id, todas))


def gravar_selecao(arq, beat, registro, backend_id, todas):
    """Relê o selecao.json sob trava (vários processos --parte gravam nele) e atualiza só este beat."""
    import fcntl
    with open(arq.with_suffix(".trava"), "w") as trava:
        fcntl.flock(trava, fcntl.LOCK_EX)
        antigas = json.loads(arq.read_text(encoding="utf-8")).get("falas", {}) if arq.exists() else {}
        if beat:
            antigas[beat] = registro
        sel = dict(backend=backend_id, atualizado=time.strftime("%Y-%m-%d %H:%M"), limiares=LIMIARES, papeis=PAPEIS,
                   falas={i["id"]: antigas[i["id"]] for i in todas if i["id"] in antigas})
        tmp = arq.with_suffix(f".{os.getpid()}.tmp")
        tmp.write_text(json.dumps(sel, ensure_ascii=False, indent=1), encoding="utf-8")
        tmp.replace(arq)
    return sel


if __name__ == "__main__":
    main()
