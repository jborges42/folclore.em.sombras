"""Vozes do Curupira: síntese de fala em português do Brasil com elenco por papel.

Motor: Chatterbox Multilingual, pacote dedicado pt-BR (ResembleAI, MIT), rodando em MLX no Apple Silicon.
Timbre de cada papel: clonado de uma voz-semente desenhada no Qwen3-TTS VoiceDesign (Apache-2.0), em
vozes/elenco/<papel>.wav. Comparativo e decisão: vozes/RELATORIO.md.

Uso (de curupira/producao):
  .venv-tts/bin/python vozes/tts.py --papel narrador --texto "..." --saida arquivo.wav
  .venv-tts/bin/python vozes/tts.py --roteiro ../roteiro.json --saida-dir vozes/falas
  .venv-tts/bin/python vozes/tts.py --autoteste
Saída: wav mono 48 kHz, pontas aparadas, loudness do papel. No modo roteiro, um wav por beat "fala"
(nome = id do beat); pula os que já existem com o mesmo hash (texto + papel + parâmetros + VERSAO), guardado
em <saida-dir>/.tts_hash.json junto com a duração.

Para outros pipelines (vozes/narrar.py): sintetizar(papel, texto, semente, variacao) -> (float32 mono, 24000),
voz crua, sem pós-processamento; processar(papel, x, sr) -> (float32 mono, 48000) faz efeito + apara + loudness.
"""
import argparse
import hashlib
import json
import os
import re
import sys
from functools import cache
from pathlib import Path

AQUI = Path(__file__).resolve().parent
PROD = AQUI.parent
MODELOS = PROD / ".modelos"
os.environ.setdefault("HF_HOME", str(MODELOS / "hf"))
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")

import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402
from scipy.signal import fftconvolve, resample_poly  # noqa: E402

VERSAO = "cbx-ptbr-1"  # suba quando mudar voz/parâmetros: entra no hash (regera tudo)
MODELO = MODELOS / "chatterbox-ptbr-mlx"
SR_TTS, SR = 24000, 48000

# exag = exaggeration (expressividade, 0-1), cfg = cfg_weight (aderência/ritmo; menor = mais lento e solto),
# temp = temperatura de amostragem, pausa = silêncio entre frases (s), lufs = loudness final,
# efeito = pós-processamento (semitons: altura e formantes juntos; eco: [(atraso s, dB)]; reverb: (RT60 s, mix)).
ELENCO = {
    "narrador": dict(exag=0.5, cfg=0.5, temp=0.8, pausa=0.40, lufs=-20.0),
    "tiao": dict(exag=0.6, cfg=0.4, temp=0.8, pausa=0.30, lufs=-19.0),
    "ze": dict(exag=0.6, cfg=0.5, temp=0.8, pausa=0.25, lufs=-20.0),
    "vo": dict(exag=0.4, cfg=0.5, temp=0.7, pausa=0.45, lufs=-22.0, efeito=dict(reverb=(0.9, 0.12))),
    "curupira": dict(exag=0.5, cfg=0.5, temp=0.8, pausa=0.45, lufs=-21.0,
                     efeito=dict(semitons=2.0, eco=[(0.23, -16), (0.47, -22)], reverb=(1.6, 0.22))),
}

# Dicionário de pronúncia: (regex, troca) aplicados ao texto antes do TTS, em ordem.
PRONUNCIA = [
    (r"\d+", lambda m: por_extenso(int(m.group()))),  # o modelo não lê algarismos de forma confiável
]

_U = ("zero um dois três quatro cinco seis sete oito nove dez onze doze treze quatorze quinze dezesseis "
      "dezessete dezoito dezenove").split()
_D = ",,vinte,trinta,quarenta,cinquenta,sessenta,setenta,oitenta,noventa".split(",")
_C = ",cento,duzentos,trezentos,quatrocentos,quinhentos,seiscentos,setecentos,oitocentos,novecentos".split(",")


def por_extenso(n):
    """Inteiro (0 a 999999) por extenso, masculino: 1560 -> 'mil quinhentos e sessenta'."""
    if n < 20:
        return _U[n]
    if n < 100:
        return _D[n // 10] + (" e " + _U[n % 10] if n % 10 else "")
    if n < 1000:
        return "cem" if n == 100 else _C[n // 100] + (" e " + por_extenso(n % 100) if n % 100 else "")
    if n >= 10 ** 6:
        return " ".join(_U[int(c)] for c in str(n))  # ponytail: milhões soletrados; ampliar se o roteiro pedir
    m, r = divmod(n, 1000)
    mil = "mil" if m == 1 else por_extenso(m) + " mil"
    return mil if not r else mil + (" e " if r < 100 or r % 100 == 0 else " ") + por_extenso(r)


def preparar_texto(texto):
    for padrao, troca in PRONUNCIA:
        texto = re.sub(padrao, troca, texto)
    return " ".join(texto.split())


def frases(texto, minimo=25):
    """Quebra em frases; junta as curtas (< minimo caracteres) à seguinte: exclamação isolada tende a alucinar."""
    out = []
    for f in re.split(r"(?<=[.!?…])\s+", texto):
        if out and len(out[-1]) < minimo:
            out[-1] += " " + f
        elif f:
            out.append(f)
    if len(out) > 1 and len(out[-1]) < minimo:
        ultima = out.pop()
        out[-1] += " " + ultima
    return out


# ---------------------------------------------------------------- modelo

def preparar_modelo():
    """Baixa o pacote pt-BR + componentes do Chatterbox e converte para MLX em .modelos/chatterbox-ptbr-mlx.
    O vocoder é o s3gen.safetensors original: o s3gen_v3 do pacote satura (pico 0,99, UTMOS ~2) no MLX."""
    from huggingface_hub import snapshot_download
    import mlx_audio.tts.models.chatterbox.scripts.convert as cv
    br = Path(snapshot_download("ResembleAI/Chatterbox-Multilingual-pt-br",
                                allow_patterns=["t3_pt_br.safetensors", "grapheme_mtl_merged_expanded_v1.json"]))
    base = Path(snapshot_download("ResembleAI/chatterbox",
                                  allow_patterns=["ve.safetensors", "s3gen.safetensors", "Cangjie5_TC.json"]))
    snapshot_download("mlx-community/S3TokenizerV2", allow_patterns=["model.safetensors", "config.json"])
    ck = MODELOS / "chatterbox-ptbr-fontes"
    ck.mkdir(parents=True, exist_ok=True)
    for f in [br / "t3_pt_br.safetensors", br / "grapheme_mtl_merged_expanded_v1.json", base / "ve.safetensors",
              base / "s3gen.safetensors", base / "Cangjie5_TC.json"]:
        (ck / f.name).unlink(missing_ok=True)
        (ck / f.name).symlink_to(f.resolve())
    cv.CHATTERBOX_VARIANTS["v3"] = cv.ChatterboxVariant("t3_pt_br.safetensors", "grapheme_mtl_merged_expanded_v1.json",
                                                        True, "NFKD,fullcase")
    cv.download_chatterbox_weights = lambda *a: ck
    cv.convert_all("local", MODELO, variant="v3")


@cache
def modelo():
    if not (MODELO / "model.safetensors").exists():
        preparar_modelo()
    os.environ.setdefault("HF_HUB_OFFLINE", "1")
    from mlx_audio.tts.utils import load_model
    return load_model(str(MODELO))


@cache
def condicionais(papel, exag):
    return modelo().prepare_conditionals(str(AQUI / "elenco" / f"{papel}.wav"), 0, exag)


def sintetizar(papel, texto, semente=1, variacao=None):
    """Voz crua do papel (24 kHz, sem efeito nem normalização). variacao: {"temperatura": fator,
    "expressividade": fator} relativos ao ELENCO; "direcao" é ignorada (o Chatterbox não aceita instrução)."""
    import mlx.core as mx
    e, v = ELENCO[papel], variacao or {}
    exag = round(min(1.0, e["exag"] * v.get("expressividade", 1.0)), 3)
    temp = e["temp"] * v.get("temperatura", 1.0)
    c = condicionais(papel, exag)
    mx.random.seed(int(semente))
    pausa = np.zeros(int(e["pausa"] * SR_TTS), np.float32)
    partes = []
    for f in frases(preparar_texto(texto)):
        a = np.concatenate([np.asarray(r.audio, np.float32).reshape(-1) for r in modelo().generate(
            f, conds=c, lang_code="pt", exaggeration=exag, cfg_weight=e["cfg"], temperature=temp, verbose=False)])
        partes += [aparar(a, SR_TTS, antes=0.02, depois=0.08), pausa]
    return np.concatenate(partes[:-1]), SR_TTS


# ---------------------------------------------------------------- pós-processamento

def aparar(x, sr, limiar_db=-45.0, antes=0.08, depois=0.20):
    """Corta o silêncio das pontas (relativo ao pico), com margem."""
    i = np.flatnonzero(np.abs(x) > 10 ** (limiar_db / 20) * np.abs(x).max())
    return x[max(0, i[0] - int(antes * sr)):i[-1] + int(depois * sr)] if len(i) else x


def efeito(x, sr, semitons=0.0, eco=(), reverb=None):
    if semitons:  # reamostra: altura e formantes sobem juntos (voz "pequena") e a fala acelera na mesma razão
        r = 2 ** (semitons / 12)
        x = resample_poly(x, 100, int(round(100 * r))).astype(np.float32)
    n = len(x) + int(sr * (max([d for d, _ in eco], default=0) + (reverb[0] if reverb else 0)))
    y = np.zeros(n, np.float32)
    y[:len(x)] = x
    for d, db in eco:
        k = int(d * sr)
        y[k:k + len(x)] += x * 10 ** (db / 20)
    if reverb:  # resposta ao impulso sintética: ruído com decaimento exponencial (RT60), passa-baixa suave
        rt, mix = reverb
        t = np.arange(int(rt * sr)) / sr
        ir = np.random.default_rng(0).standard_normal(len(t)) * 10 ** (-3 * t / rt)
        ir = np.convolve(ir, np.ones(8) / 8, "same")
        w = fftconvolve(y, ir)[:n]
        y = (1 - mix) * y + mix * w * (np.abs(y).max() / max(np.abs(w).max(), 1e-9))
    return y


def processar(papel, x, sr):
    """Efeito do papel, apara, 48 kHz, fades e loudness do papel (pico <= -1 dBFS)."""
    import pyloudnorm
    e = ELENCO[papel]
    x = efeito(np.asarray(x, np.float32), sr, **e.get("efeito", {}))
    y = resample_poly(aparar(x, sr), SR, sr).astype(np.float64)
    fi, fo = int(0.015 * SR), int(0.08 * SR)
    y[:fi] *= np.linspace(0, 1, fi)
    y[-fo:] *= np.linspace(1, 0, fo)
    medida = np.pad(y, (0, max(0, SR - len(y))))  # o medidor pede >= 0,4 s; o silêncio não entra na média
    y *= 10 ** ((e["lufs"] - pyloudnorm.Meter(SR).integrated_loudness(medida)) / 20)
    y *= min(1.0, 10 ** (-1 / 20) / np.abs(y).max())
    return y.astype(np.float32), SR


# ---------------------------------------------------------------- verificação (Whisper)

@cache
def _asr():
    from faster_whisper import WhisperModel
    return WhisperModel("Zoont/faster-whisper-large-v3-turbo-int8-ct2", device="cpu", compute_type="int8",
                        local_files_only=(MODELOS / "hf" / "hub" / "models--Zoont--faster-whisper-large-v3-turbo-int8-ct2").exists())


def _norm(t):
    import unicodedata
    t = unicodedata.normalize("NFKD", preparar_texto(t).lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    eq = {"esta": "ta", "estou": "to", "pra": "para"}
    return [eq.get(w, w) for w in re.sub(r"[^a-z0-9]+", " ", t).split()]


def wer(x, sr, texto):
    import jiwer
    x16 = resample_poly(x, 16000, sr).astype(np.float32)
    segs, _ = _asr().transcribe(x16, language="pt", beam_size=5, condition_on_previous_text=False)
    hip = " ".join(_norm(" ".join(s.text for s in segs)))
    return jiwer.wer(" ".join(_norm(texto)), hip) if hip else 1.0


def gerar(papel, texto, tentativas=3, limite=0.2):
    """Até `tentativas` sementes; fica a primeira com WER <= limite, senão a de menor WER."""
    melhor = None
    for s in range(1, tentativas + 1):
        x, sr = sintetizar(papel, texto, semente=s)
        w = wer(x, sr, texto) if tentativas > 1 else 0.0
        if melhor is None or w < melhor[0]:
            melhor = (w, x, sr, s)
        if w <= limite:
            break
    w, x, sr, s = melhor
    y, sr = processar(papel, x, sr)
    return y, sr, dict(wer=round(w, 3), semente=s)


def chave(papel, texto):
    ref = hashlib.sha1((AQUI / "elenco" / f"{papel}.wav").read_bytes()).hexdigest()
    return hashlib.sha1(json.dumps([VERSAO, papel, ELENCO[papel], ref, preparar_texto(texto)], ensure_ascii=False,
                                   sort_keys=True).encode()).hexdigest()[:16]


def modo_roteiro(roteiro, saida_dir, tentativas):
    saida_dir.mkdir(parents=True, exist_ok=True)
    pi = saida_dir / ".tts_hash.json"
    indice = json.loads(pi.read_text()) if pi.exists() else {}
    falas = [b for c in json.loads(Path(roteiro).read_text(encoding="utf-8"))["cenas"] for b in c["beats"]
             if b.get("tipo") == "fala"]
    for i, b in enumerate(falas, 1):
        k, wav = chave(b["papel"], b["texto"]), saida_dir / f"{b['id']}.wav"
        if wav.exists() and indice.get(b["id"], {}).get("hash") == k:
            continue
        y, sr, info = gerar(b["papel"], b["texto"], tentativas)
        sf.write(str(wav), y, sr, subtype="PCM_24")
        indice[b["id"]] = dict(hash=k, papel=b["papel"], dur=round(len(y) / sr, 3), **info)
        pi.write_text(json.dumps(indice, ensure_ascii=False, indent=1))
        print(f"[{i}/{len(falas)}] {b['id']} {b['papel']} {len(y) / sr:.1f}s wer={info['wer']}", flush=True)


def autoteste():
    assert por_extenso(1560) == "mil quinhentos e sessenta"
    assert por_extenso(1500) == "mil e quinhentos" and por_extenso(2026) == "dois mil e vinte e seis"
    assert por_extenso(100) == "cem" and por_extenso(115) == "cento e quinze" and por_extenso(21000) == "vinte e um mil"
    assert preparar_texto("Em 1560, o  Tião") == "Em mil quinhentos e sessenta, o Tião"
    assert frases("Ô Tião! Onde é que você se meteu? Vem cá.") == ["Ô Tião! Onde é que você se meteu? Vem cá."]
    assert frases("Era uma vez um caçador na mata. Ele seguiu os rastros do bicho.") == [
        "Era uma vez um caçador na mata.", "Ele seguiu os rastros do bicho."]
    x = np.r_[np.zeros(SR_TTS), np.sin(np.arange(SR_TTS) * 0.05) * 0.5, np.zeros(SR_TTS)].astype(np.float32)
    y, sr = processar("narrador", x, SR_TTS)
    assert sr == SR and 1.0 < len(y) / SR < 1.4, len(y) / SR
    print("autoteste ok")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--papel", choices=list(ELENCO))
    ap.add_argument("--texto")
    ap.add_argument("--saida")
    ap.add_argument("--roteiro")
    ap.add_argument("--saida-dir", default=str(AQUI / "falas"))
    ap.add_argument("--tentativas", type=int, default=3, help="sementes por fala, verificadas pelo Whisper (1 = sem verificação)")
    ap.add_argument("--autoteste", action="store_true")
    a = ap.parse_args()
    if a.autoteste:
        autoteste()
    elif a.roteiro:
        modo_roteiro(a.roteiro, Path(a.saida_dir), a.tentativas)
    elif a.papel and a.texto and a.saida:
        y, sr, info = gerar(a.papel, a.texto, a.tentativas)
        sf.write(a.saida, y, sr, subtype="PCM_24")
        print(f"{a.saida} {len(y) / sr:.1f}s wer={info['wer']} semente={info['semente']}")
    else:
        ap.error("use --papel/--texto/--saida, --roteiro/--saida-dir ou --autoteste")
