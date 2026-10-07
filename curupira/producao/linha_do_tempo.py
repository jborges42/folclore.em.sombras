"""Roteiro + durações das falas -> linha do tempo absoluta (fonte única de tempos para áudio e animação).

Uso: .venv/bin/python linha_do_tempo.py [--estimar]
Lê ../roteiro.json e vozes/falas/<beat>.wav; escreve linha-do-tempo.json e ../js/linha-do-tempo.js
--estimar: fala sem wav ganha duração estimada pelo texto (para trabalhar antes das vozes ficarem prontas).
"""
import json
import sys
from pathlib import Path

import soundfile as sf

AQUI = Path(__file__).parent
RAIZ = AQUI.parent
FALAS = AQUI / "vozes" / "falas"

CARTELA = 4.5       # s de cartela de capítulo no início da cena
TRANSICAO = 1.5     # s entre cenas
PAUSA_PADRAO = 0.5  # pausa_depois quando o roteiro não diz
CREDITOS = 14.0     # s de créditos no fim
PALAVRAS_POR_S = 2.4  # só para --estimar


def momento(em, ini, fim):
    if em == "inicio":
        return ini
    if em == "fim":
        return fim
    return ini + float(str(em).lstrip("+"))


def main():
    estimar = "--estimar" in sys.argv
    estimadas = 0
    roteiro = json.loads((RAIZ / "roteiro.json").read_text(encoding="utf-8"))
    t, cenas = 0.0, []
    for cena in roteiro["cenas"]:
        ini_cena = t
        cartela = None
        if cena.get("capitulo"):
            cartela = {"inicio": round(t, 3), "fim": round(t + CARTELA, 3)}
            t += CARTELA
        beats = []
        for b in cena["beats"]:
            if b["tipo"] == "fala":
                wav = FALAS / f"{b['id']}.wav"
                if wav.exists():
                    dur = sf.info(str(wav)).duration
                elif estimar:
                    dur, estimadas = len(b["texto"].split()) / PALAVRAS_POR_S + 0.3, estimadas + 1
                else:
                    raise SystemExit(f"falta a fala {wav} — rode vozes/tts.py --roteiro primeiro (ou use --estimar)")
            else:
                dur = float(b["dur"])
            ini, fim = t, t + dur
            beats.append({
                "id": b["id"], "tipo": b["tipo"], "papel": b.get("papel"), "texto": b.get("texto"),
                "inicio": round(ini, 3), "fim": round(fim, 3),
                "sfx": [{"som": s["som"], "t": round(momento(s.get("em", "inicio"), ini, fim), 3)} for s in b.get("sfx", [])],
            })
            t = fim + (float(b.get("pausa_depois", PAUSA_PADRAO)) if b["tipo"] == "fala" else 0.0)
        cenas.append({
            "id": cena["id"], "capitulo": cena.get("capitulo"), "luz": cena.get("luz"),
            "ambiente": cena.get("ambiente", []), "inicio": round(ini_cena, 3), "fim": round(t, 3),
            "cartela": cartela, "beats": beats,
        })
        t += TRANSICAO
    creditos = {"inicio": round(t, 3), "fim": round(t + CREDITOS, 3)}
    linha = {"titulo": roteiro.get("titulo"), "duracao": creditos["fim"], "cenas": cenas, "creditos": creditos,
             "estimada": estimadas > 0}

    (AQUI / "linha-do-tempo.json").write_text(json.dumps(linha, ensure_ascii=False, indent=1), encoding="utf-8")
    (RAIZ / "js" / "linha-do-tempo.js").write_text(
        "// GERADO por producao/linha_do_tempo.py — não edite à mão.\nwindow.LINHA_DO_TEMPO = "
        + json.dumps(linha, ensure_ascii=False) + ";\n", encoding="utf-8")
    n = sum(len(c["beats"]) for c in cenas)
    aviso = f" — {estimadas} falas com duração ESTIMADA" if estimadas else ""
    print(f"{len(cenas)} cenas, {n} beats, duração {linha['duracao']:.1f}s ({linha['duracao'] / 60:.1f} min){aviso}")


if __name__ == "__main__":
    main()
