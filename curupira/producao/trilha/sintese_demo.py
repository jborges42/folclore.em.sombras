"""Demonstração e verificação de sintese.py.

Renderiza todos os sons e uma frase curta de cada instrumento melódico em sintese_demo/*.wav,
gera um espectrograma PNG para cada um e confere pico, DC, bordas e cliques (sai com código 1 se algo falhar).
Uso: .venv/bin/python trilha/sintese_demo.py [filtro]   (filtro = trecho do nome, opcional)
"""
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import soundfile as sf

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import sintese as s  # noqa: E402

SAIDA = AQUI / 'sintese_demo'
FFMPEG = AQUI.parent / 'bin' / 'ffmpeg'


def voz_teste():
    """Frase de teste falada pela voz do sistema (macOS 'say'); sem ela, uma risada sintética de pulsos glotais."""
    if shutil.which('say') and FFMPEG.exists():
        with tempfile.TemporaryDirectory() as tmp:
            aiff, wav = Path(tmp) / 'v.aiff', Path(tmp) / 'v.wav'
            subprocess.run(['say', '-v', 'Luciana', '-o', aiff,
                            'Quem entra na mata sem pedir licença... nunca mais acha o caminho de volta.'], check=True)
            subprocess.run([FFMPEG, '-v', 'error', '-y', '-i', aiff, '-ac', '1', '-ar', str(s.SR), wav], check=True)
            return sf.read(wav)[0]
    t = np.arange(int(1.6 * s.SR)) / s.SR
    f0 = 260 * (1 + 0.15 * np.sin(2 * np.pi * 0.6 * t))
    pulsos = np.sin(2 * np.pi * np.cumsum(f0) / s.SR) ** 15
    silabas = np.clip(np.sin(2 * np.pi * 4.5 * t), 0, None) ** 0.5 * np.exp(-t / 1.2)
    return s._eq(pulsos * silabas, [(800, 12, 4), (1300, 9, 5), (2600, 6, 5)])


def risada_teste():
    """Risada 'ha-ha-ha' sintética (pulsos glotais com formantes de 'a') para testar o curupirizar."""
    rng = np.random.default_rng(3)
    t = np.arange(int(1.4 * s.SR)) / s.SR
    f0 = 210 * (1 - 0.18 * t) * (1 + 0.01 * rng.standard_normal(len(t)).cumsum() / 300)
    voz = np.sin(np.pi * np.cumsum(f0) / s.SR) ** 30
    sopro = s._filtra(rng.standard_normal(len(t)), 'bandpass', [600, 4000])
    silabas = (0.5 - 0.5 * np.cos(2 * np.pi * 5.2 * t)) ** 2 * np.exp(-t / 0.9)
    return s._eq((voz + 0.15 * sopro) * silabas, [(750, 14, 4), (1200, 10, 5), (2500, 6, 4)])


def frase(fn, notas, molhado=0.2, **kw):
    """notas = [(início, nota, dur, {extras})] → frase mixada com reverb leve, normalizada."""
    y = s.mistura([(t0, fn(nota, dur, semente=i, **kw, **(ex[0] if ex else {})))
                   for i, (t0, nota, dur, *ex) in enumerate(notas)])
    return s._fim(s.reverbera(y, 2.2, molhado, 0.02, 0.6), fim=0.3)


def sons():
    """Nome → função que gera cada som da demonstração."""
    voz, ris = voz_teste(), risada_teste()
    rab = [(0.0, 'A4', 0.5), (0.5, 'C5', 0.45), (0.95, 'D5', 1.3, {'portamento_de': 'C5'}),
           (2.25, 'C5', 0.32), (2.57, 'A4', 0.32), (2.89, 'G4', 0.6, {'dinamica': 'mp'}),
           (3.49, 'A4', 2.0, {'portamento_de': 'G4', 'vibrato': 1.3, 'dinamica': 'f'})]
    pif = [(0.0, 'A5', 0.22), (0.25, 'C6', 0.22), (0.5, 'D6', 0.48), (1.0, 'C6', 0.22), (1.25, 'A5', 0.22),
           (1.5, 'G5', 0.48), (2.0, 'A5', 0.22), (2.25, 'D6', 0.22), (2.5, 'A5', 1.2, {'vibrato': 0.9})]
    vio = [(0.0, 'D3', 2.4), (0.3, 'A3', 2.1), (0.6, 'D4', 1.8), (0.9, 'F4', 1.5), (1.2, 'A4', 0.6),
           (1.5, 'G4', 0.3), (1.8, 'F4', 0.3), (2.1, 'D4', 2.0), (2.1, 'A3', 2.0), (2.1, 'D3', 2.0)]
    ber = [(t0 + c * 2.0, 'A2', 0.9 if dob == 'preso' else 1.2, {'dobrao': dob, 'com_caxixi': True})
           for c in range(2) for t0, dob in ((0, 'zum'), (0.25, 'zum'), (0.5, 'solto'), (1.0, 'preso'))]
    return {
        'assobio_chamado': lambda: s.assobio_curupira('chamado'),
        'assobio_curto': lambda: s.assobio_curupira('curto'),
        'assobio_espiral': lambda: s.assobio_curupira('espiral'),
        'assobio_distante': lambda: s.assobio_curupira('distante'),
        'voz_teste_original': lambda: s._fim(voz),
        'voz_teste_curupira': lambda: s.curupirizar(voz, 1.0),
        'risada_teste_original': lambda: s._fim(ris),
        'risada_teste_curupira': lambda: s.curupirizar(ris, 1.0),
        'gongo_grave': lambda: s.gongo_grave(),
        'gongo_sobe': lambda: s.gongo_sobe(),
        'gongo_desce': lambda: s.gongo_desce(),
        'prato': lambda: s.prato(),
        'pratinhos': lambda: s.pratinhos(),
        'bloco_madeira': lambda: s.bloco_madeira(),
        'bloco_acelera': lambda: s.bloco_acelera(),
        'matraca': lambda: s.matraca(),
        'tambor_surdo': lambda: s.tambor_grave('surdo'),
        'tambor_alfaia': lambda: s.tambor_grave('alfaia'),
        'tambor_zabumba': lambda: s.tambor_grave('zabumba'),
        'rufar_crescendo': lambda: s.rufar(3.0, True),
        'rufar_continuo': lambda: s.rufar(3.0, False),
        'coracao': lambda: s.coracao(72, 6.0),
        'drone_noite': lambda: s.drone(14.0, 'D2', 0.15),
        'drone_tensao': lambda: s.drone(14.0, 'D2', 0.9),
        'caxixi': lambda: s.caxixi(),
        'berimbau_solto': lambda: s.berimbau('A2', 1.4, 'solto', dinamica='ff'),
        'rabeca_nota_longa': lambda: s.rabeca('D5', 3.0, 'ff', portamento_de='A4'),
        'rabeca_frase': lambda: frase(s.rabeca, rab),
        'pifano_frase': lambda: frase(s.pifano, pif),
        'viola_frase': lambda: frase(s.viola_caipira, vio, 0.15),
        'berimbau_frase': lambda: frase(s.berimbau, ber, 0.12),
    }


def verifica(nome, x):
    """Pico, DC, bordas e cliques: picos da 2ª diferença maiores que a vizinhança de 20 ms antes E depois (ataques não contam)."""
    pico = 20 * np.log10(np.abs(x).max())
    dc = float(np.mean(x))
    bordas = max(abs(x[0]), abs(x[-1]))
    d2 = np.abs(np.diff(x.astype(float), 2))
    c = np.r_[0, np.cumsum(d2 ** 2)]
    i = np.arange(len(d2))
    depois = (c[np.minimum(i + 960, len(d2))] - c[i]) / 960
    antes = (c[i + 1] - c[np.maximum(i + 1 - 960, 0)]) / 960
    viz = np.sqrt(np.maximum(antes, depois)) + 1e-6                          # ignora o que está abaixo de ~−120 dB
    clique = float((d2 / viz).max())
    ok = x.dtype == np.float32 and np.isfinite(x).all() and abs(pico + 3) < 0.1 and abs(dc) < 1e-4 \
        and bordas < 1e-4 and clique < 14
    print(f'{"ok " if ok else "FALHA"} {nome:24s} {len(x) / s.SR:6.2f}s  pico {pico:6.2f} dBFS  '
          f'DC {dc:+.1e}  bordas {bordas:.1e}  clique {clique:5.1f}')
    return ok


def espectrograma(nome, x, png):
    fig, (a1, a2) = plt.subplots(2, 1, figsize=(10, 5.5), height_ratios=[1, 3], sharex=True)
    t = np.arange(len(x)) / s.SR
    a1.plot(t, x, lw=0.4, color='#333')
    a1.set_ylim(-1, 1)
    a1.set_title(nome)
    a2.specgram(x, NFFT=2048, Fs=s.SR, noverlap=1792, cmap='magma', vmin=-130, vmax=-20)
    a2.set_ylim(0, 16000)
    a2.set_ylabel('Hz')
    a2.set_xlabel('s')
    fig.tight_layout()
    fig.savefig(png, dpi=80)
    plt.close(fig)


if __name__ == '__main__':
    SAIDA.mkdir(exist_ok=True)
    assert abs(s.frequencia('A4') - 440) < 1e-9 and abs(s.frequencia('Lá4') - 440) < 1e-9
    assert abs(s.frequencia('Bb3') - s.frequencia('A#3')) < 1e-9 and abs(s.frequencia('Sol#3') - 207.652) < 1e-3
    assert len(s.escala_pentatonica('D4', 'menor')) == 11
    assert np.array_equal(s.gongo_sobe(3), s.gongo_sobe(3)) and not np.array_equal(s.gongo_sobe(3), s.gongo_sobe(4))
    assert np.array_equal(s.assobio_curupira('curto', 5), s.assobio_curupira('curto', 5))
    filtro = sys.argv[1] if len(sys.argv) > 1 else ''
    tudo_ok = True
    for nome, gera in sons().items():
        if filtro not in nome:
            continue
        x = gera()
        tudo_ok &= verifica(nome, x)
        sf.write(SAIDA / f'{nome}.wav', x, s.SR, subtype='PCM_24')
        espectrograma(nome, x, SAIDA / f'{nome}.png')
    sys.exit(0 if tudo_ok else 1)
