"""Verificação objetiva do master: LUFS integrado e por cena, pico verdadeiro, clipping,
relação narração/fundo durante cada fala (barramentos separados) e espectrogramas.

Uso (da pasta producao/):
  .venv/bin/python trilha/analisar.py                        # produção
  .venv/bin/python trilha/analisar.py --base trilha/teste    # dados de teste
  ... --trechos 10-30,200-215                                # espectrogramas de trechos escolhidos (s)
Sem --trechos: início, a fala com pior relação voz/fundo e o maior pico. Sai com código 1 se alguma meta falhar.
"""
import argparse
import io
import json
import subprocess
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import soundfile as sf
from scipy.signal import spectrogram

import motor as m

AQUI = Path(__file__).resolve().parent
META_LUFS, TOL_LUFS, META_TP, META_VOZ = -16.0, 0.5, -1.0, 12.0


def ler_mp3(p):
    out = subprocess.run([str(m.FFMPEG), "-loglevel", "error", "-i", str(p), "-f", "wav", "-c:a", "pcm_f32le", "-"],
                         capture_output=True, check=True).stdout
    return sf.read(io.BytesIO(out), dtype="float32")[0]


def rms_db(x, janela=0.4, hop=0.05):
    w, h = int(janela * m.SR), int(hop * m.SR)
    p = np.array([np.mean(np.square(x[i:i + w])) for i in range(0, max(1, len(x) - w), h)])
    return np.arange(len(p)) * hop + janela / 2, 10 * np.log10(p + 1e-10)


def espectrograma(mix, voz, fundo, falas, ini, fim, destino):
    a, b = int(max(0, ini) * m.SR), int(min(len(mix) / m.SR, fim) * m.SR)
    f, t, S = spectrogram(mix[a:b].mean(axis=1), m.SR, nperseg=4096, noverlap=3072)
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(13, 7), sharex=True, gridspec_kw={"height_ratios": [3, 1.3]})
    sel = f >= 30
    ax1.pcolormesh(t + a / m.SR, f[sel], 10 * np.log10(S[sel] + 1e-14), shading="auto", cmap="magma", vmin=-130, vmax=-40)
    ax1.set_yscale("log")
    ax1.set_ylabel("Hz")
    ax1.set_title(f"Master {ini:.1f}–{fim:.1f} s")
    for nome, x, cor in (("voz", voz, "#e8a33d"), ("fundo", fundo, "#3d7fe8")):
        tt, d = rms_db(x[a:b])
        ax2.plot(tt + a / m.SR, d, color=cor, label=nome, lw=1.2)
    for b0, b1 in falas:
        if b1 > ini and b0 < fim:
            ax2.axvspan(max(b0, ini), min(b1, fim), color="#e8a33d", alpha=0.12, lw=0)
    ax2.set_ylim(-70, -5)
    ax2.set_ylabel("RMS 400 ms (dBFS)")
    ax2.set_xlabel("s")
    ax2.legend(loc="upper right")
    fig.tight_layout()
    fig.savefig(destino, dpi=90)
    plt.close(fig)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base", type=Path, help="pasta de teste (usa base/linha-do-tempo.json e base/saida/)")
    ap.add_argument("--linha", type=Path, default=AQUI.parent / "linha-do-tempo.json")
    ap.add_argument("--master", type=Path, default=m.MASTER_WAV)
    ap.add_argument("--mp3", type=Path, default=m.MP3)
    ap.add_argument("--barramentos", type=Path, default=AQUI / "barramentos")
    ap.add_argument("--saida", type=Path, default=AQUI / "analise")
    ap.add_argument("--trechos", help="ex.: 10-30,200-215")
    a = ap.parse_args()
    if a.base:
        s = a.base / "saida"
        a.linha, a.master, a.mp3, a.barramentos, a.saida = (a.base / "linha-do-tempo.json", s / "master.wav",
                                                           s / "curupira.mp3", s, s / "analise")
    a.saida.mkdir(parents=True, exist_ok=True)
    linha = json.loads(a.linha.read_text(encoding="utf-8"))
    mix = sf.read(str(a.master), dtype="float32")[0]
    voz = sf.read(str(a.barramentos / "voz.wav"), dtype="float32")[0]
    fundo = sf.read(str(a.barramentos / "fundo.wav"), dtype="float32")[0]
    seg = lambda x, i, f: x[int(i * m.SR):int(f * m.SR)]

    rel = {"lufs": m.lufs(mix), "pico_verdadeiro": m.pico_verdadeiro(mix),
           "clipping": int((np.abs(mix) >= 0.999).sum()), "duracao": len(mix) / m.SR}
    if a.mp3.exists():
        mp3 = ler_mp3(a.mp3)
        rel["mp3"] = {"lufs": m.lufs(mp3), "pico_verdadeiro": m.pico_verdadeiro(mp3),
                      "clipping": int((np.abs(mp3) >= 0.999).sum())}
    rel["cenas"] = {c["id"]: round(m.lufs(seg(mix, c["inicio"], c["fim"])), 1) for c in linha["cenas"]}
    falas = [b for c in linha["cenas"] for b in c["beats"] if b["tipo"] == "fala"]
    razoes = {}
    for b in falas:
        lv, lf = m.lufs(seg(voz, b["inicio"], b["fim"])), m.lufs(seg(fundo, b["inicio"], b["fim"]))
        if np.isfinite(lv):
            razoes[b["id"]] = round(lv - lf, 1) if np.isfinite(lf) else 99.0
    rel["voz_fundo"] = razoes

    metas = {
        f"LUFS integrado {META_LUFS:+.0f} ± {TOL_LUFS}": abs(rel["lufs"] - META_LUFS) <= TOL_LUFS,
        f"pico verdadeiro ≤ {META_TP} dBTP": rel["pico_verdadeiro"] <= META_TP + 1e-3,
        "sem clipping (WAV e MP3)": rel["clipping"] == 0 and rel.get("mp3", {}).get("clipping", 0) == 0,
        f"voz/fundo ≥ {META_VOZ:.0f} dB em todas as falas": bool(razoes) and min(razoes.values()) >= META_VOZ,
    }
    rel["metas"] = metas = {k: bool(v) for k, v in metas.items()}

    print(f"duração {rel['duracao']:.1f}s | LUFS {rel['lufs']:.2f} | pico verdadeiro {rel['pico_verdadeiro']:.2f} dBTP"
          f" | clipping {rel['clipping']}")
    if "mp3" in rel:
        print(f"MP3: LUFS {rel['mp3']['lufs']:.2f} | pico verdadeiro {rel['mp3']['pico_verdadeiro']:.2f} dBTP"
              f" | clipping {rel['mp3']['clipping']}")
    print("LUFS por cena: " + ", ".join(f"{k} {v}" for k, v in rel["cenas"].items()))
    if razoes:
        v = np.array(list(razoes.values()))
        pior = min(razoes, key=razoes.get)
        print(f"voz/fundo nas falas: mín {v.min():.1f} dB ({pior}) | mediana {np.median(v):.1f} | máx {v.max():.1f}"
              f" | abaixo da meta: {[k for k, x in razoes.items() if x < META_VOZ]}")
    for nome, ok in metas.items():
        print(f"[{'OK' if ok else 'FALHA'}] {nome}")

    if a.trechos:
        trechos = [tuple(map(float, t.split("-"))) for t in a.trechos.split(",")]
    else:
        trechos = [(0.0, 20.0)]
        if razoes:
            b = next(b for b in falas if b["id"] == min(razoes, key=razoes.get))
            trechos.append((b["inicio"] - 8, b["fim"] + 8))
        tp = float(np.argmax(np.abs(mix).max(axis=1))) / m.SR
        trechos.append((tp - 6, tp + 6))
    intervalos = [(b["inicio"], b["fim"]) for b in falas]
    for ini, fim in trechos:
        destino = a.saida / f"espectro_{ini:.0f}-{fim:.0f}.png"
        espectrograma(mix, voz, fundo, intervalos, ini, fim, destino)
        print(f"espectrograma: {destino}")
    (a.saida / "relatorio.json").write_text(json.dumps(rel, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"relatório: {a.saida / 'relatorio.json'}")
    sys.exit(0 if all(metas.values()) else 1)


if __name__ == "__main__":
    main()
