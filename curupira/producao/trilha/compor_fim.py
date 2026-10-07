"""Trilha do grupo "fim" (versão 2, linguagem brasileira): cenas aurora e encerramento, e os créditos.

Uso (da pasta producao/):  .venv/bin/python trilha/compor_fim.py
Grava trilha/stems/{aurora,encerramento,creditos}.wav (48 kHz, estéreo), as prévias trilha/previas/<id>.mp3
e <id>.png (espectrograma com as falas sombreadas e as deixas marcadas) e imprime a tabela de deixas.

Os tempos vêm SEMPRE da linha do tempo, lida em tempo de execução: cada deixa é achada pelo id do beat e
pela etiqueta do sfx. Nada de segundos fixos; ao regenerar a linha com as vozes reais, basta rodar de novo.
Os sfx musicais do roteiro destas cenas são renderizados aqui, pela FUNÇÃO (temas.ETIQUETAS_ANTIGAS):
gongo_sobe → `sobe`, bloco_madeira → `golpe_seco`, gongo_desce → `desce`, gongo_grave → `pontuacao`,
flauta_chamado → `chamado` (a cantiga ou a toada na rabeca, sobre o berimbau).
Sem flauta, sem pífano, sem gongo, sem pentatônica (temas.PROIBIDOS é conferido no render).
Timbres: os mesmos da prévia do compositor-chefe (temas_demo.nota_som / temas_demo.golpe): rabeca, viola
caipira, sanfona, cuíca, berimbau, alfaia, surdo, zabumba, caixa, prato de banda, matraca, gonguê, agogô,
triângulo, ganzá, caxixi, pau-de-chuva — um só conjunto de instrumentos na peça inteira.
"""
import json
import subprocess
import sys
from functools import lru_cache
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.ndimage import uniform_filter1d
from scipy.signal import butter, sosfilt

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import motor as M  # noqa: E402
import temas as T  # noqa: E402
import temas_demo as TD  # noqa: E402  (timbres de referência; só leitura)

SR = M.SR
LINHA = AQUI.parent / "linha-do-tempo.json"
STEMS, PREVIAS = AQUI / "stems", AQUI / "previas"
CAUDA = 4.0       # s de cauda natural depois de cena.fim
MESTRE_DB = -3.5  # ganho comum aos stems deste grupo (calibrado: loudness por trecho próxima da v1 que o maestro aprovou)
AJUSTE = {"aurora": -2.0, "encerramento": 2.0, "creditos": -1.5}  # dB por cena (maestro): a passagem radiante fica ~2 dB abaixo do ápice da tempestade

# sfx do roteiro que são música (o stem os toca; a mixagem não)
MUSICAIS = {"gongo_grave", "gongo_sobe", "gongo_desce", "bloco_madeira", "bloco_acelera", "prato", "tambor_grave",
            "rufar", "maraca", "caxixi", "agogo", "berimbau", "flauta_chamado", "pau_de_chuva"}

# ================================================================ material temático próprio

# Viola com humor (história do Tião), 80 bpm, Ré mixolídio: ponteio que tropeça e chega atrasado na tônica.
HUMOR = [("D3+A3", 0.5), ("R", 0.25), ("F#4", 0.25), ("A4", 0.25), ("R", 0.25), ("A4", 0.25), ("F#4", 0.25),
         ("G4", 0.25), ("F#4", 0.25), ("E4", 0.25), ("C4", 0.25), ("R", 0.25), ("D4", 0.5), ("R", 0.25),
         ("A2+E3", 0.5), ("R", 0.5), ("C4", 0.25), ("E4", 0.25), ("D4", 0.25), ("C4", 0.25),
         ("A3", 0.5), ("R", 0.5), ("D3+A3", 0.5), ("R", 0.5)]
# Batuque da passagem do Curupira (o tropel: "X..x" é o galope), somado ao Tema Final em baião.
BATUQUE = {"alfaia": ("f", "X..xX..xX..xX.x."), "zabumba": ("f", "X.....x.X...x.x."),
           "atabaque": ("mf", "..x.x..x..x.x.xx"), "agogo_agudo": ("mf", "X..x....X..x...."),
           "agogo_grave": ("mf", "......x.....x.x."), "ganza": ("mf", "xoxXxoxXxoxXxoxX"),
           "caxixi": ("mp", "..x...x...x...x.")}
# Marcha alegre da partida: alfaia, zabumba, agogô e triângulo (o "pífano" do roteiro virou rabeca + sanfona).
MARCHA_BATERIA = {"zabumba": ("f", "X.......X...x..."), "alfaia": ("mf", "..x...x...x...xx"),
                  "agogo_agudo": ("mf", "X...X.x.X...X.x."), "agogo_grave": ("mp", "..x.....x.x....."),
                  "triangulo": ("mp", "xoXoxoXo")}
# Veada: as três primeiras frases do Tema da Mata (mixolídio, o Dó natural) uma oitava acima, pousando no Ré.
VEADA = T.transpor(T.trecho(T.MATA_RABECA, 0, 6), 12)
VEADA_POUSO = 5.5  # tempo em que o Ré final começa

# ================================================================ timbres (os de temas_demo)

GANHO = {k: 20 * np.log10(v) for k, v in TD.GANHO.items()}   # equilíbrio medido pelo compositor-chefe (dB)
GANHO.update({"viola": GANHO["viola"] - 2, "berimbau": GANHO["berimbau"] - 3})
PAN = {**TD.PAN, "segunda": -0.35, "rabeca": 0.15, "sanfona": 0.3, "alfaia": -0.15, "atabaque": 0.3,
       "zabumba": 0.0, "surdo": 0.0}
USADOS = set()    # todo instrumento tocado (conferido contra temas.PROIBIDOS)


@lru_cache(maxsize=None)
def _sos(tipo, hz):
    return butter(2, hz, tipo, fs=SR, output="sos")


def _filtro(x, tipo, hz):
    return sosfilt(_sos(tipo, tuple(hz) if np.ndim(hz) else float(hz)), x, axis=0).astype(np.float32)


def nota(inst, n, dur, din, s=0):
    """Uma nota (mono, float32) com o timbre da prévia dos temas."""
    USADOS.add(inst)
    return np.asarray(TD.nota_som(inst, n, dur, din, s % 4), np.float32)


def golpe(inst, i, s=0):
    """Um golpe de percussão (mono), pico = intensidade (golpes fracos de tambor saem mais escuros)."""
    USADOS.add(inst)
    return np.asarray(TD.golpe(inst, round(float(i), 2), int(s) % 4), np.float32)


# ================================================================ colocação no tempo

DEIXAS = []  # (cena, rótulo, alvo absoluto, batida absoluta, som do roteiro ou None)


def deixa(c, rotulo, alvo, batida, som=None):
    DEIXAS.append((c["id"], rotulo, c["inicio"] + alvo, c["inicio"] + batida, som))


def mel(inst, melodia, bpm, din="mf", parte=None):
    """Melodia de temas.py → notas [(t, dur, inst, nota, intensidade, parte)]."""
    return [(t, d, inst, n, i, parte or inst) for t, d, n, i in T.notas(melodia, bpm, din)]


def grade(inst, din, g, bpm, tempos):
    """Grade de semicolcheias → golpes [(t, inst, intensidade, parte)]."""
    return [(t, inst, i, inst) for t, i in T.golpes_grade(g, tempos, bpm, din)]


def tocar(f, notas=(), golpes=(), t0=0.0, ganho=0.0, ate=None, sob=None, sob_db=8.0):
    """Soma notas/golpes na faixa a partir de t0. `ate` (s relativos) corta o que viria depois;
    `sob(t)` → True abaixa `sob_db` o que cair dentro de uma fala. Acorde de viola com 3+ notas = rasqueado
    (12 ms entre cordas, do grave ao agudo), como na prévia dos temas."""
    for k, (t, d, inst, n, i, parte) in enumerate(notas):
        if ate is not None and t >= ate:
            continue
        d = d if ate is None else min(d, ate - t)
        g = ganho + GANHO[inst] - (sob_db if sob and sob(t0 + t) else 0)
        ns = sorted(n.split("+"), key=T.midi)
        rasq = inst == "viola" and len(ns) > 2
        for j, nn in enumerate(ns):
            f.colocar(nota(inst, nn, d, i * (0.8 if len(ns) > 2 else 1), k), t0 + t + (0.012 * j if rasq else 0),
                      g, PAN.get(parte, PAN.get(inst, 0.0)))
    for k, (t, inst, i, parte) in enumerate(golpes):
        if ate is None or t < ate:
            g = ganho + GANHO[inst] - (sob_db if sob and sob(t0 + t) else 0)
            f.colocar(golpe(inst, i, k), t0 + t, g, PAN.get(parte, PAN.get(inst, 0.0)))


def formula(f, nome, batida, ganho=0.0, sob=None):
    """Fórmula de temas.FORMULAS (só a percussão) com a batida no instante `batida` (s na cena)."""
    F = T.FORMULAS[nome]
    t0 = batida - F["batida"]
    tocar(f, golpes=[(t, inst, i, inst) for t, inst, i in F["eventos"] if t0 + t >= 0], t0=t0, ganho=ganho, sob=sob)


def silabas(seq):
    """[(t, sílaba, i)] → golpes, pela fala do mestre (temas.SILABAS)."""
    return [(t, inst, i, inst) for t, inst, i in T.formula("", "", "", "", 0.0, seq)["eventos"]]


def compassos(notas, golpes, a, b, bar):
    """Recorte dos compassos [a, b) de eventos de tema, deslocado para começar em 0."""
    sel = lambda e: a * bar - 1e-6 <= e[0] < b * bar - 1e-6  # noqa: E731
    return ([(n[0] - a * bar, *n[1:]) for n in notas if sel(n)], [(g[0] - a * bar, *g[1:]) for g in golpes if sel(g)])


def envelope(f, pontos):
    """Automação de volume da faixa inteira: [(t, dB)] interpolados (fora: extremos)."""
    t = np.arange(len(f.x)) / SR
    f.x *= M.db(np.interp(t, *zip(*pontos)))[:, None]


def juntar(seco, fundo, longe=None):
    """Fórmulas secas e próximas; temas mais ao fundo, com reverb de mata; 'longe' quase só reverb."""
    x = seco.x + fundo.x + M.reverb(seco.x, "mata")[:len(seco.x)] * M.db(-20) \
        + M.reverb(fundo.x, "mata")[:len(fundo.x)] * M.db(-11)
    if longe is not None:
        x += longe.x * M.db(-5) + M.reverb(longe.x, "eco")[:len(longe.x)] * M.db(-2)
    return x * M.db(MESTRE_DB)


class Cena:
    """Acesso aos tempos da cena (relativos a cena.inicio) pelo id do beat e pela etiqueta do sfx."""

    def __init__(self, c):
        self.c, self.t0 = c, c["inicio"]
        self.b = {b["id"]: b for b in c["beats"]}
        self.dur = c["fim"] - c["inicio"]
        self.falas = [(b["inicio"] - self.t0, b["fim"] - self.t0) for b in c["beats"] if b["tipo"] == "fala"]

    def ini(self, bid):
        return self.b[bid]["inicio"] - self.t0

    def fim(self, bid):
        return self.b[bid]["fim"] - self.t0

    def sfx(self, bid, som):
        return next(s["t"] for s in self.b[bid]["sfx"] if s["som"] == som) - self.t0

    def palavra(self, bid, p):
        """Instante estimado da palavra p na fala (proporcional à posição no texto)."""
        b = self.b[bid]
        return self.ini(bid) + (b["fim"] - b["inicio"]) * b["texto"].index(p) / len(b["texto"])

    def sob(self, t):
        return any(a - 0.1 <= t <= b + 0.1 for a, b in self.falas)

    def faixas(self, n=2):
        return [M.Faixa(self.dur + CAUDA) for _ in range(n)]


# ================================================================ cenas

def _aurora(c):
    k = Cena(c)
    seco, fundo, festa, marcha, cama = k.faixas(5)

    # Cartela "O caminho de casa": rrrum TUM! (alfaia + surdo + prato) e a chamada da rabeca com a viola em
    # terças por baixo (a dupla caipira), sobre o Ré-Lá da sanfona.
    fim_chamada = 0.0
    if c["cartela"]:
        tum = c["cartela"]["inicio"] - k.t0 + 0.35
        tocar(seco, golpes=silabas(T.rufo(max(0.0, tum - 0.3), 0.27, 0.2, 0.8) + [(tum, "TUM", 1.0), (tum, "BÃO", 0.8)]))
        dur_ch = T.duracao(T.CHAMADA) * 60 / 80
        tocar(fundo, mel("rabeca", T.CHAMADA, 80, "mf")
              + mel("viola", T.transpor(T.CHAMADA, graus=-2), 80, "mp", "segunda")
              + [(0.0, dur_ch, "sanfona", "D3+A3", 0.32, "sanfona")], t0=tum)
        fim_chamada = tum + dur_ch
        deixa(c, "cartela pousa (+0,35 s): TUM + chamada da rabeca", tum, tum)

    # O pau-de-chuva abre a aurora.
    t = k.sfx("aurora_01", "pau_de_chuva")
    corte = k.ini("aurora_02") - t + 0.8   # a chuva escorre e se cala logo que a narração começa
    x = golpe("pau_de_chuva", 0.56)[:int(corte * SR)]
    seco.colocar(x, t, GANHO["pau_de_chuva"], PAN.get("pau_de_chuva", 0.0), fade_out=1.2)
    deixa(c, "pau-de-chuva abre a aurora", t, t, "pau_de_chuva")

    # Tema da Mata sussurrado (viola em ponteio + fole da sanfona) sob a narração, abafado abaixo de 1,2 kHz
    # (fica fora da presença da voz), terminando no compasso em que o Curupira entra.
    batida = k.sfx("aurora_04", "gongo_sobe")
    n_comp = int(min(8, (batida - fim_chamada) // 1.5))
    notas, golpes = T.eventos(T.TEMAS["mata"], "sussurrada")
    tocar(cama, notas, golpes, t0=batida - 1.5 * n_comp, ate=1.5 * n_comp, ganho=-2)
    fundo.x += _filtro(cama.x, "lowpass", 1200)

    # O tropel se aproxima (alfaia e atabaque em galope, só graves: cabe sob a voz) até a entrada.
    t_trop = k.sfx("aurora_03", "queixada_tropel")
    galope = [(batida - 0.5 * j + d, inst) for j in range(1, int((batida - t_trop) / 0.5) + 1)
              for d, inst in ((0.0, "alfaia"), (0.375, "atabaque"))]
    longe = M.Faixa(len(fundo.x) / SR)
    for t, inst in galope:
        u = 1 - (batida - t) / (batida - t_trop)
        longe.colocar(golpe(inst, 0.3 + 0.5 * u, int(t * 8)), t, GANHO[inst] - 14 + 12 * u, PAN.get(inst, 0))
    fundo.x += _filtro(longe.x, "lowpass", 350)

    # Entrada do Curupira (gongo_sobe → `sobe`): rufo de caixa crescendo até o UÍ da cuíca + gonguê na batida;
    # o rufo que cai sobre o fim da fala entra mais baixo.
    formula(seco, "sobe", batida, ganho=2, sob=k.sob)
    deixa(c, "Curupira entra no queixada: rrrum UÍ (sobe)", batida, batida, "gongo_sobe")

    # Passagem: Tema Final CHEIO a 120 bpm, compassos 13–16, os da pegada do Curupira (Lá-Dó-Si-Sol#-Lá e o
    # retrógrado) DENTRO do Tema da Mata em baião: rabeca, sanfona em terças, viola rasqueada, zabumba,
    # triângulo, ganzá; por cima o batuque em tropel e a cuíca gemendo no contratempo. Corta seco na matraca.
    parada = k.sfx("aurora_04", "bloco_madeira")
    notas, golpes = T.eventos(dict(T.TEMAS["final"], bpm=120), "cheia")
    notas, golpes = compassos(notas, golpes, 12, 16, 1.0)
    tempos = int(np.ceil((parada - batida) / 0.5))
    bat = [g for inst, (din, gr) in BATUQUE.items() for g in grade(inst, din, gr, 120, tempos)]
    cuica = [(j + 0.75, "UÍ", 0.75) for j in range(int(parada - batida) + 1)]
    tocar(festa, notas, t0=batida, ate=parada - batida, ganho=1.0)            # a pegada tem de soar por cima
    tocar(festa, golpes=golpes + bat + silabas(cuica), t0=batida, ate=parada - batida, ganho=-4.5)
    t_ag = k.sfx("aurora_04", "agogo")
    t_cx = k.sfx("aurora_04", "caxixi")
    tocar(festa, golpes=silabas([(t_ag, "TIQUI", 1.0), (t_ag + 0.125, "TOCO", 0.9), (t_ag + 0.25, "TIQUI", 0.9),
                                 (t_cx, "XI", 1.0)]), ganho=4)
    deixa(c, "agogô na passagem (tiqui-toco)", t_ag, t_ag, "agogo")
    deixa(c, "caxixi na passagem", t_cx, t_cx, "caxixi")
    envelope(festa, [(parada - 0.02, 0), (parada + 0.03, -90)])
    fundo.x += festa.x

    # Ele olha para o Zé (bloco_madeira → `golpe_seco`): PÁ! da matraca + caixa, e tudo para.
    formula(seco, "golpe_seco", parada, ganho=4)
    deixa(c, "a música para: ele olha para o Zé (PÁ!)", parada, parada, "bloco_madeira")

    # Diálogo "meu neto": quase silêncio. Só o bordão Ré-Lá da rabeca (as cordas soltas), pianíssimo e abafado
    # abaixo de 1,4 kHz, depois de 1,6 s de silêncio.
    t_ch = k.sfx("aurora_07", "flauta_chamado")
    b0 = parada + 1.6
    for n in ("D4", "A4"):
        x = _filtro(nota("rabeca", n, t_ch - b0, 0.25), "lowpass", 1400)
        fundo.colocar(x, b0, GANHO["rabeca"] - 7, -0.1 if n == "D4" else 0.1, fade_in=2.5, fade_out=1.5)

    # Partida (flauta_chamado → `chamado`): DOIM do berimbau e a rabeca começa sozinha a cantiga do Curupira
    # ("Vou andando…", escala nordestina). Dois tempos depois, no agogô do roteiro, a bateria entra e a
    # cantiga vira marcha alegre (cantiga + o retrógrado: ele nunca anda em linha reta), com a sanfona em
    # terças por cima. O andamento sai da distância chamado → agogô (2 tempos), lida da linha do tempo.
    t_ag8 = k.sfx("aurora_08", "agogo")
    bpm = float(np.clip(120 / max(t_ag8 - t_ch, 1e-3), 96, 132))
    b = 60 / bpm
    t_bat = t_ch + 2 * b
    t_gd = k.sfx("aurora_08", "gongo_desce")
    some = t_gd + 4.0
    volta = T.CANTIGA_1 + T.retrogrado(T.CANTIGA_1)
    tempos = int(np.ceil((some - t_ch) / b)) + 1
    linha_mel = (volta * (tempos // 12 + 1))
    terca = [("R", 2)] + T.transpor(T.trecho(linha_mel, 2, tempos), graus=2, escala=T.NORDESTINA)
    tocar(seco, golpes=silabas([(0, "DOIM", 0.7), (0, "CHUVA", 0.25)]), t0=t_ch)
    tocar(marcha, mel("rabeca", T.trecho(linha_mel, 0, tempos), bpm, "mf")
          + mel("sanfona", T.trecho(terca, 0, tempos), bpm, "mp"), t0=t_ch)
    bat = [g for inst, (din, gr) in MARCHA_BATERIA.items() for g in grade(inst, din, gr, bpm, tempos - 2)]
    tocar(marcha, golpes=bat + [(-0.375 * b + 0.125 * b * j, "alfaia", 0.4 + 0.15 * j, "alfaia") for j in range(3)],
          t0=t_bat)
    deixa(c, "chamado: DOIM + cantiga na rabeca", t_ch, t_ch, "flauta_chamado")
    deixa(c, f"marcha alegre entra no agogô ({bpm:.0f} bpm)", t_ag8, t_bat, "agogo")
    abafada = _filtro(_filtro(marcha.x, "lowpass", 700), "lowpass", 700)
    u = np.clip((np.arange(len(marcha.x)) / SR - t_gd) / (some - t_gd), 0, 1)[:, None]
    marcha.x = marcha.x * (1 - u) + abafada * u
    envelope(marcha, [(t_gd, 0), (some, -40), (some + 0.3, -90)])
    fundo.x += marcha.x

    # Ele some atrás do barranco (gongo_desce → `desce`): a rabeca escorrega para o grave e o BÃO assenta.
    formula(seco, "desce", t_gd + T.FORMULAS["desce"]["batida"], sob=k.sob)
    deixa(c, "some atrás do barranco: uôôô … BÃO (desce)", t_gd, t_gd, "gongo_desce")

    # História do Tião: a viola volta sozinha, com humor; no assobio do sabiá ele pula e apressa o passo.
    t_pulo = k.sfx("aurora_10", "sabia") + 0.25
    t_v = max(k.palavra("aurora_09", "Tião"), some - 1.0)
    voltas = int(np.ceil((t_pulo - t_v) / (T.duracao(HUMOR) * 60 / 80)))
    tocar(fundo, mel("viola", HUMOR * voltas, 80, "p", "viola"), t0=t_v, ate=t_pulo - 0.35 - t_v)
    tocar(fundo, [(0.0, 0.5, "viola", "D3+A3+D4+F#4+A4", 0.6, "viola")]
          + [(0.3 + 0.09 * j, 0.08, "viola", n, 0.32, "viola") for j, n in enumerate(["A4", "F#4", "A4", "D4"])],
          t0=t_pulo)
    deixa(c, "viola entra na história do Tião", k.palavra("aurora_09", "Tião"), t_v)
    deixa(c, "Tião pula: rasqueado, reage ao sabiá", k.sfx("aurora_10", "sabia"), t_pulo)

    # Veada (flauta_chamado → `chamado`): DOIM bem leve e a toada luminosa: a cabeça do Tema da Mata na
    # rabeca, uma oitava acima, com a viola em terças por baixo (dupla caipira) e o fole de Ré da sanfona,
    # pousando no Ré quando a cena termina. O andamento sai do tempo que sobra até o fim da cena.
    t_f = k.sfx("aurora_11", "flauta_chamado")
    bpm_v = float(np.clip(VEADA_POUSO * 60 / max(k.dur - 0.2 - t_f, 1e-3), 72, 100))
    pouso = 2.5 * 60 / bpm_v
    veada = VEADA[:-1] + [(VEADA[-1][0], VEADA[-1][1] + 2.5)]
    tocar(seco, golpes=silabas([(0, "DOIM", 0.35)]), t0=t_f)
    tocar(fundo, mel("rabeca", veada, bpm_v, "p")
          + mel("viola", T.transpor(veada, graus=-2), bpm_v, "pp", "segunda")
          + [(VEADA_POUSO * 60 / bpm_v, pouso, "viola", "D3+A3+D4+F#4+A4", 0.4, "viola"),
             (0.0, VEADA_POUSO * 60 / bpm_v + pouso, "sanfona", "D3+F#4+A4", 0.22, "sanfona")],
          t0=t_f, sob=k.sob, sob_db=4)
    deixa(c, f"veada: toada da Mata na rabeca ({bpm_v:.0f} bpm)", t_f, t_f, "flauta_chamado")
    deixa(c, "pousa no Ré", k.dur - 0.2, t_f + VEADA_POUSO * 60 / bpm_v)
    return juntar(seco, fundo)


def _encerramento(c):
    k = Cena(c)
    seco, fundo, longe = k.faixas(3)
    t_fc = k.sfx("encerramento_01", "flauta_chamado")
    t_sil = k.fim("encerramento_04")          # antes da última frase: silêncio total
    t_bao = k.sfx("encerramento_06", "gongo_grave")

    # Coração lento no surdo (50 → 40 bpm), sumindo antes do silêncio.
    t, fim_coracao = 0.2, t_sil - 2.0
    while t < fim_coracao:
        u = t / fim_coracao
        for d, i in ((0.0, 0.55), (0.3, 0.32)):
            fundo.colocar(_filtro(golpe("surdo", i * (1 - 0.6 * u), int(t)), "lowpass", 160), t + d,
                          GANHO["surdo"] - 7 - 8 * u)
        t += 60 / (50 - 10 * u)

    # Bordão Ré-Lá de rabeca em nota longa, abafado (fora da presença da voz).
    b1 = t_sil - 0.3
    for n in ("D4", "A4"):
        x = _filtro(nota("rabeca", n, b1, 0.22), "lowpass", 1200)
        fundo.colocar(x, 0.0, GANHO["rabeca"] - 9, -0.1 if n == "D4" else 0.1, fade_in=2.5, fade_out=2.0)

    # Chamado (flauta_chamado → `chamado`): de longe, DOIM do berimbau e a rabeca canta só a 1ª frase da
    # cantiga do Curupira, mais lenta (lembrança); a 2ª fica sem resposta.
    tocar(longe, mel("rabeca", T.CANTIGA_1, 90, "p"), silabas([(-0.1, "DOIM", 0.5)]), t0=t_fc, ganho=-4)
    deixa(c, "chamado: 1ª frase da cantiga na rabeca (a 2ª não vem)", t_fc, t_fc, "flauta_chamado")

    # Um atabaque bem distante, some aos poucos.
    t_a0, t_a1 = k.ini("encerramento_02"), k.ini("encerramento_04")
    toques = grade("atabaque", "mf", "X..x..x.X.....x.", 90, int((t_a1 - t_a0) / (60 / 90)))
    for j, (t, inst, i, _) in enumerate(toques):
        u = t / (t_a1 - t_a0)
        longe.colocar(_filtro(golpe(inst, i, j), "lowpass", 500), t_a0 + t, GANHO[inst] - 6 - 26 * u, 0.4)

    # O sopro apaga a lamparina (gongo_grave → `pontuacao`): BÃO (surdo + zabumba + prato de banda deixado
    # ressoar até o fim) e o fole da sanfona fechando num Ré-Lá grave, como um último suspiro.
    formula(seco, "pontuacao", t_bao, ganho=-2)
    fundo.colocar(nota("sanfona", "D3", 3.0, 0.3), t_bao, GANHO["sanfona"] - 10, -0.1, fade_in=0.15, fade_out=2.6)
    fundo.colocar(nota("sanfona", "A2", 3.0, 0.3), t_bao, GANHO["sanfona"] - 13, 0.1, fade_in=0.15, fade_out=2.6)
    deixa(c, "sopro apaga a lamparina: BÃO (pontuacao)", t_bao, t_bao, "gongo_grave")
    deixa(c, "silêncio total antes da última frase", t_sil, t_sil)
    x = juntar(seco, fundo, longe)
    a, b = int((t_sil - 0.4) * SR), int(t_sil * SR)  # a cauda de reverb do bordão não invade o silêncio
    x[a:b] *= np.cos(np.linspace(0, np.pi / 2, b - a, dtype=np.float32))[:, None]
    x[b:int((t_bao - 0.01) * SR)] = 0
    return x


def _creditos(linha):
    """Créditos: o Tema Final em ciranda (90 bpm), fecho em roda: compassos 1–4 (a mata) e 13–16
    (a pegada do Curupira acolhida pela mata), pousando num acorde de Ré (viola, sanfona, zabumba, triângulo)."""
    cr = linha["creditos"]
    c = {"id": "creditos", "inicio": cr["inicio"], "fim": cr["fim"], "beats": []}
    dur, bar = cr["fim"] - cr["inicio"], 2 * 60 / 90
    seco, fundo = M.Faixa(dur), M.Faixa(dur)
    intro = bar if dur >= 9 * bar + 2 else 0.0
    secoes = [(0, 4), (12, 16)] if dur >= intro + 8 * bar + 2 else [(12, 16)]
    notas, golpes = T.eventos(T.TEMAS["final"], "ciranda")
    t = intro
    tocar(fundo, golpes=[g for g in golpes if g[1] in ("ganza", "zabumba") and g[0] < bar], t0=0, ganho=-6)
    for a, b in secoes:
        tocar(fundo, *compassos(notas, golpes, a, b, bar), t0=t)
        t += (b - a) * bar
    tocar(fundo, [(0.0, 2.2, "viola", "D3+A3+D4+F#4+A4+D5", 0.65, "viola"),
                  (0.0, 2.2, "sanfona", "D3+F#4+A4+D5", 0.4, "sanfona")],
          silabas([(0, "BUM", 0.8), (0, "XI", 0.6)]), t0=t)
    tocar(seco, golpes=silabas([(0.0, "TLIM", 0.6)]), t0=t)
    deixa(c, "acorde final de Ré", t, t)
    x = juntar(seco, fundo)
    M._fades(x, 0.0, min(1.5, dur - t))
    return x


def compor(cena_id, linha):
    """Stem estéreo float32 (n, 2) a 48 kHz começando em cena.inicio; dura (fim − inicio) + CAUDA
    ('creditos': exatamente creditos.fim − creditos.inicio)."""
    if cena_id == "creditos":
        x = _creditos(linha)
    else:
        c = next(c for c in linha["cenas"] if c["id"] == cena_id)
        x = {"aurora": _aurora, "encerramento": _encerramento}[cena_id](c)
        M._fades(x, 0.0, 1.0)  # a cauda termina em zero
    x *= M.db(AJUSTE.get(cena_id, 0.0))
    return M.limitar(x, -1.5).astype(np.float32)  # só raspa os golpes mais fortes da passagem


# ================================================================ conferência

def _rms_db(x):
    return float(10 * np.log10(np.mean(np.square(x, dtype=np.float64)) + 1e-12))


def conferir(cena_id, x, linha):
    """Imprime pico, loudness, cauda e a música sob cada fala; confere sfx musicais, silêncios e timbres."""
    assert not USADOS & T.PROIBIDOS, f"timbre proibido: {USADOS & T.PROIBIDOS}"
    c = next((c for c in linha["cenas"] if c["id"] == cena_id), None)
    ini = c["inicio"] if c else linha["creditos"]["inicio"]
    fim = c["fim"] if c else linha["creditos"]["fim"]
    esperado = int(round(((fim - ini) + (CAUDA if c else 0)) * SR))
    assert len(x) == esperado and x.shape[1] == 2, (cena_id, len(x), esperado)
    pico = M.pico_verdadeiro(x)
    assert pico < -1.0, f"{cena_id}: pico {pico:.1f} dBTP"
    print(f"\n[{cena_id}] {len(x) / SR:.2f} s  pico {pico:.1f} dBTP  {M.lufs(x):.1f} LUFS  "
          f"máx. 400 ms {M.lufs_curto_max(x):.1f} LUFS  cauda (último 0,5 s) {_rms_db(x[-SR // 2:]):.0f} dBFS")
    if not c:
        return
    banda = sosfilt(butter(4, (300, 3000), "bandpass", fs=SR, output="sos"), x, axis=0)
    for b in c["beats"]:
        i, f = int((b["inicio"] - ini) * SR), int((b["fim"] - ini) * SR)
        print(f"  {'sob ' if b['tipo'] == 'fala' else '    '}{b['id']:16s} {M.lufs(x[i:f]):6.1f} LUFS  "
              f"máx. {M.lufs_curto_max(x[i:f]):6.1f}  (300 Hz–3 kHz: {M.lufs(banda[i:f]):6.1f})")
        for s in b["sfx"]:
            if s["som"] in MUSICAIS:
                assert any(d[0] == cena_id and d[4] == s["som"] and abs(d[2] - s["t"]) < 1e-3 for d in DEIXAS), \
                    f"sfx musical sem render: {b['id']} {s['som']} @ {s['t']}"
    if cena_id == "encerramento":
        k = Cena(c)
        a, b = int((k.fim("encerramento_04") + 0.05) * SR), int((k.sfx("encerramento_06", "gongo_grave") - 0.02) * SR)
        assert _rms_db(x[a:b]) < -90, "o silêncio antes da última frase não está limpo"
    if cena_id == "aurora":
        k = Cena(c)
        p, e = k.sfx("aurora_04", "bloco_madeira"), k.sfx("aurora_04", "gongo_sobe")
        festa, depois = _rms_db(x[int(e * SR):int(p * SR)]), _rms_db(x[int((p + 0.6) * SR):int((p + 1.5) * SR)])
        print(f"  passagem {festa:.1f} dBFS → depois da matraca {depois:.1f} dBFS ({festa - depois:.0f} dB abaixo)")
        assert festa - depois > 20, "a música não para na matraca"


def _ataque_medido(x, t):
    """Instante de maior subida de energia em [t − 60 ms, t + 120 ms]."""
    a = max(0, int((t - 0.06) * SR))
    e = uniform_filter1d(np.abs(x[a:int((t + 0.12) * SR)]).sum(axis=1), 96)
    return (a + int(np.argmax(np.diff(e)))) / SR


def tabela(stems, linha):
    print(f"\n{'cena':13s} {'deixa (alvo × batida)':58s} {'alvo':>9s} {'batida':>9s} {'Δ':>6s} {'medido':>7s}")
    for cena, rot, alvo, bat, som in DEIXAS:
        ini = linha["creditos"]["inicio"] if cena == "creditos" else next(
            c["inicio"] for c in linha["cenas"] if c["id"] == cena)
        med = "" if "silêncio" in rot else f"{(_ataque_medido(stems[cena], bat - ini) - (bat - ini)) * 1000:+5.0f}ms"
        rot = f"{rot} [{som}]" if som else rot
        print(f"{cena:13s} {rot:58s} {alvo:9.3f} {bat:9.3f} {1000 * (bat - alvo):+5.0f}ms {med:>7s}")


def espectrograma(caminho, cena_id, x, linha):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    c = next((c for c in linha["cenas"] if c["id"] == cena_id), None)
    ini = c["inicio"] if c else linha["creditos"]["inicio"]
    fig, ax = plt.subplots(figsize=(22, 6))
    ruido = np.random.default_rng(0).standard_normal(len(x)) * 1e-7  # piso: silêncio digital sem log(0)
    pxx, *_, im = ax.specgram(x.mean(axis=1) + ruido, NFFT=4096, Fs=SR, noverlap=3072, cmap="magma")
    topo = 10 * np.log10(pxx.max())
    im.set_clim(topo - 80, topo)
    ax.set_yscale("symlog", linthresh=200)
    ax.set_ylim(40, 12000)
    for b in (c["beats"] if c else []):
        if b["tipo"] == "fala":
            ax.axvspan(b["inicio"] - ini, b["fim"] - ini, color="cyan", alpha=0.12)
            ax.text(b["inicio"] - ini, 9000, b["papel"], color="cyan", fontsize=7)
    for cena, rot, alvo, bat, som in DEIXAS:
        if cena == cena_id:
            ax.axvline(bat - ini, color="lime", lw=0.8, ls="--")
            ax.text(bat - ini, 55, rot[:28], color="lime", fontsize=6, rotation=90, va="bottom")
    ax.axhspan(300, 3000, color="white", alpha=0.05)
    ax.set_title(f"{cena_id} (v2): falas em ciano, deixas em verde, faixa da voz 300 Hz–3 kHz clareada")
    ax.set_xlabel("s desde o início do stem")
    fig.tight_layout()
    fig.savefig(caminho, dpi=72)
    plt.close(fig)


def main():
    linha = json.loads(LINHA.read_text(encoding="utf-8"))
    STEMS.mkdir(exist_ok=True)
    PREVIAS.mkdir(exist_ok=True)
    DEIXAS.clear()
    stems = {}
    for cid in ("aurora", "encerramento", "creditos"):
        x = stems[cid] = compor(cid, linha)
        sf.write(STEMS / f"{cid}.wav", x, SR, subtype="PCM_24")
        subprocess.run([str(M.FFMPEG), "-y", "-loglevel", "error", "-i", str(STEMS / f"{cid}.wav"),
                        "-c:a", "libmp3lame", "-b:a", "192k", str(PREVIAS / f"{cid}.mp3")], check=True)
        espectrograma(PREVIAS / f"{cid}.png", cid, x, linha)
        conferir(cid, x, linha)
    tabela(stems, linha)
    print(f"\ninstrumentos: {', '.join(sorted(USADOS))}")
    print(f"→ {STEMS}  |  {PREVIAS}")


if __name__ == "__main__":
    main()
