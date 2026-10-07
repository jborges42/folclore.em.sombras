"""Trilha do grupo "caça" (versão 2, linguagem brasileira): cenas cacadores, aviso e rastros.

Uso (da pasta producao/):  .venv/bin/python trilha/compor_caca.py [cena ...]
Grava trilha/stems/<cena>.wav (estéreo float, 48 kHz, começa em cena.inicio) e, em trilha/previas/,
<cena>.mp3 e <cena>.png (espectrograma com falas e deixas), e imprime a tabela de deixas medida no áudio.

compor(cena_id, linha) lê os tempos da linha do tempo em tempo de execução: nenhum segundo é fixo, tudo se
ancora no início/fim dos beats e nos sfx do roteiro. Do teatro de sombras fica só a atmosfera (percussão que
pontua o gesto, silêncios); o som é brasileiro (LINGUAGEM_MUSICAL.md): rabeca, viola, sanfona, cuíca (a voz do
Curupira), berrante, berimbau; alfaia, surdo, zabumba, caixa, prato de banda, matraca, gonguê, agogô.
Sem flauta, sem gongo, sem bloco de madeira, sem pentatônica (`T.PROIBIDOS` é conferido em toda partitura).
Timbres: os mesmos da prévia do compositor-chefe (temas_demo.nota_som / temas_demo.golpe), nivelados aqui em
LUFS; local só o que falta: rufos gravados (caixa e bumbo) e a rabeca que escorrega de altura (`deslizar`).
As etiquetas antigas do roteiro (gongo_grave, gongo_desce, bloco_madeira, bloco_acelera...) valem pela FUNÇÃO
(T.ETIQUETAS_ANTIGAS) e tocam as fórmulas novas.
"""
import json
import subprocess
import sys
from functools import lru_cache
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import signal
from scipy.ndimage import uniform_filter1d

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import motor as m  # noqa: E402
import temas as T  # noqa: E402
import temas_demo as TD  # noqa: E402

SR = m.SR
PROD = AQUI.parent
MUSICA = PROD / "sons" / "musica"
CENAS = ("cacadores", "aviso", "rastros")
CAUDA = 4.0
GANHO_GERAL = -5.5   # dB, igual para as três cenas (preserva a dinâmica relativa)
AJUSTE = {"cacadores": 2.5, "aviso": 1.4, "rastros": -0.4}   # dB por cena: mantém a loudness de cada stem da v1
# (−25,5 / −31,5 / −25,6 LUFS), que o maestro já equilibrou no arco do espetáculo
# Chamada do Abre-alas (rabeca, o mesmo gesto de temas.CHAMADA) no modo do capítulo: caçadores em Ré menor de
# modinha (Si bemol e o Dó# da dominante), rastros na escala nordestina com o Sol# do pé virado, sem resolver.
CHAMADAS = {
    "cacadores": [("A4", 0.25), ("D5", 1.25, "f"), ("E5", 0.25), ("D5", 0.25), ("A4", 1.0), ("Bb4", 0.5),
                  ("G4", 0.5), ("C#5", 0.5), ("D5", 2.0, "f")],
    "rastros": [("A4", 0.25), ("D5", 1.25, "f"), ("C5", 0.25), ("D5", 0.25), ("A4", 1.0), ("G#4", 0.5),
                ("A4", 0.5), ("F#4", 0.5), ("G#4", 0.5), ("A4", 2.0, "f")],
}
MUSICAIS = {"gongo_grave", "gongo_sobe", "gongo_desce", "bloco_madeira", "bloco_acelera", "prato", "tambor_grave",
            "rufar", "maraca", "caxixi", "agogo", "berimbau", "flauta_chamado", "pau_de_chuva"}

# ---------------------------------------------------------------- timbres

# percussão: nível (LUFS em 400 ms) de um golpe na intensidade 1; amostras/síntese de temas_demo.golpe
GOLPES = {"alfaia": -16, "surdo": -18, "zabumba": -20, "bacalhau": -28, "caixa": -23, "atabaque": -20,
          "prato": -21, "prato_abafado": -25, "matraca": -22, "gongue": -26, "agogo_agudo": -26, "agogo_grave": -26,
          "triangulo": -27, "caxixi": -28, "maraca": -29, "ganza": -31, "pau_de_chuva": -27, "berimbau": -22,
          "berimbau_preso": -22, "berimbau_zum": -24, "cuica": -22, "rabeca_glissando": -20}
LOCAIS = {"rufar": ("rufar__1.wav", -22),        # rufo de caixa gravado (crescendo da mira)
          "rufo_bumbo": ("rufar__3.wav", -20)}   # rufo de bumbo grande: o chão tremendo
# melódicos: nível de uma nota de 1 s em mf (temas_demo.nota_som)
MELODIA = {"rabeca": -24, "rabeca_tremolo": -26, "viola": -24, "sanfona": -27, "cuica": -24, "berrante": -18}
REF = {"viola": "A4", "sanfona": "D4", "cuica": "A4", "berrante": "D4", "rabeca_tremolo": "A4", "rabeca": "A4"}
DURMAX = {"caixa": 0.35, "prato_abafado": 0.25, "zabumba": 0.45, "alfaia": 0.9}   # abafados por padrão (s): a
# zabumba sintética soa 2 s quase só em 40–100 Hz; sem a mão na pele, a marcha vira um zumbido grave contínuo
PAN = {"rabeca": 0.15, "rabeca_tremolo": 0.15, "viola": -0.3, "sanfona": 0.3, "cuica": 0.4, "berrante": -0.55,
       "agogo_agudo": 0.4, "agogo_grave": 0.3, "matraca": -0.35, "maraca": 0.5, "caxixi": 0.45, "ganza": 0.5,
       "caixa": 0.2, "gongue": -0.3, "bacalhau": 0.25, "triangulo": 0.45, "prato": -0.15, "prato_abafado": -0.2,
       "atabaque": -0.35, "berimbau": 0.3, "berimbau_preso": 0.3, "berimbau_zum": 0.3, "pau_de_chuva": -0.4,
       "zabumba": -0.1, "surdo": 0.05, "rabeca_glissando": 0.15}
SUBSTITUTO = {"prato": "prato", "tambor_grave": "zabumba", "rufar": "rufar", "maraca": "maraca", "caxixi": "caxixi",
              "agogo": "agogo_agudo", "berimbau": "berimbau", "pau_de_chuva": "pau_de_chuva"}   # sfx não composto


def _mono(x):
    x = np.asarray(x, np.float32)
    return x if x.ndim == 1 else x.mean(axis=1)


def _fade(x, ini=0.002, fim=0.01):
    x = np.array(x, np.float32)
    for k, entrada in ((int(ini * SR), True), (int(fim * SR), False)):
        k = min(k, len(x) // 2)
        if k > 1:
            c = np.sin(np.linspace(0, np.pi / 2, k, dtype=np.float32))
            c = c[:, None] if x.ndim == 2 else c
            if entrada:
                x[:k] *= c
            else:
                x[-k:] *= c[::-1]
    return x


def _sem_silencio(x):
    """Corta o silêncio antes do ataque (o golpe soa no instante pedido)."""
    e = np.abs(_mono(x))
    return x[max(0, int(np.argmax(e > 0.05 * e.max())) - int(0.003 * SR)):]


def _nivel(x, lufs):
    return m.db(lufs - m.lufs_curto_max(np.asarray(x, np.float32)))


@lru_cache(maxsize=None)
def golpe(inst, var=0, q=1.0):
    """Um golpe do instrumento no nível da intensidade 1; q (0,1–1) dá o timbre da força (golpe fraco = escuro)."""
    if inst in LOCAIS:
        arq, lufs = LOCAIS[inst]
        x = _sem_silencio(_mono(m.carregar(MUSICA / arq)))
        return _fade(x * _nivel(x, lufs), 0.0005, 0.03)
    ref = np.asarray(TD.golpe(inst, 1.0, var), np.float32)
    x = np.asarray(TD.golpe(inst, q, var), np.float32) / np.float32(q)
    return _fade(x * _nivel(ref, GOLPES[inst]), 0.0005, 0.03)


@lru_cache(maxsize=None)
def _cal_nota(inst):
    return _nivel(TD.nota_som(inst, REF[inst], 1.0, 0.6), MELODIA[inst])


@lru_cache(maxsize=None)
def tom(inst, nota, dur, d, var=0, cents=0.0):
    """Nota melódica (rabeca, viola, sanfona, cuíca, berrante): o timbre da prévia do chefe, nivelado.
    cents ≠ 0: a rabeca 'torta' dos caçadores."""
    x = np.asarray(TD.nota_som(inst, nota, dur, d, var), np.float32) * _cal_nota(inst)
    return m.transpor(x, cents / 100) if cents else x


def deslizar(x, semitons, dur, curva=1.0):
    """A altura de x escorrega `semitons` ao longo de `dur` s (leitura com taxa variável, como a mão
    correndo no braço da rabeca). Para subir, x precisa ser mais longo que o resultado."""
    x = _mono(x)
    t = np.arange(len(x)) / SR
    pos = np.cumsum(2 ** (semitons * np.clip(t / dur, 0, 1) ** curva / 12))
    pos = pos[pos < len(x) - 1]
    return _fade(np.interp(pos, np.arange(len(x)), x).astype(np.float32), 0.01, 0.3)


def grade_acel(t0, t1, bpm0, bpm1, passo=0.25):
    """Instantes de cada `passo` (em tempos) entre t0 e t1, com o andamento indo de bpm0 a bpm1 linearmente."""
    tt = np.linspace(t0, t1, max(2, int((t1 - t0) * 1000)))
    fase = np.concatenate([[0], np.cumsum((bpm0 + (bpm1 - bpm0) * (tt[1:] - t0) / (t1 - t0)) / 60 * np.diff(tt))])
    return np.interp(np.arange(int(fase[-1] / passo) + 1) * passo, fase, tt)


def silabas(seq):
    """[(t, sílaba ou instrumento, intensidade)] → [(t, instrumento, intensidade)] (a fala do mestre de temas.py)."""
    return T.formula("", "", "", "", 0.0, seq)["eventos"]


# ---------------------------------------------------------------- a cena como partitura

class Cena:
    def __init__(self, cena_id, linha):
        cenas = linha["cenas"]
        k = [c["id"] for c in cenas].index(cena_id)
        self.c, self.prox = cenas[k], (cenas[k + 1] if k + 1 < len(cenas) else None)
        self.t0, self.dur = self.c["inicio"], self.c["fim"] - self.c["inicio"]
        self.B = {b["id"]: b for b in self.c["beats"]}
        self.falas = [(b["inicio"], b["fim"]) for b in self.c["beats"] if b["tipo"] == "fala"]
        self.n = int(round((self.dur + CAUDA) * SR))
        self.segmentos, self.deixas, self.usados, self.insts = [], [], set(), set()
        self.corte(None)

    # --- tempos do roteiro
    def ini(self, bid):
        return self.B[bid]["inicio"]

    def fim(self, bid):
        return self.B[bid]["fim"]

    def sfx(self, bid, som, k=0):
        ts = [s["t"] for s in self.B[bid]["sfx"] if s["som"] == som]
        if len(ts) <= k:
            raise KeyError(f"{bid}: sfx '{som}' nº {k} não está na linha do tempo")
        if som in MUSICAIS:
            self.usados.add((bid, som, k))
        return ts[k]

    def sob_fala(self, a, b, margem=0.12):
        return any(a < f1 + margem and b > f0 - margem for f0, f1 in self.falas)

    # --- escrita
    def corte(self, t):
        """Fecha o segmento atual em t (tudo que soava, reverb inclusive, para seco) e abre um novo."""
        if self.segmentos:
            self.segmentos[-1][2] = t
        self.segmentos.append([m.Faixa(self.n / SR), m.Faixa(self.n / SR), None])

    def _por(self, x, t, ganho_db, pan, fundo, inst):
        self.insts.add(inst)
        self.segmentos[-1][1 if fundo else 0].colocar(x, t - self.t0, ganho_db, pan)

    def golpe(self, inst, t, i=1.0, pan=None, fundo=False, var=None, ganho_db=0.0, maxdur=None, passa_baixa=None):
        var = int(round(t * 37)) % 8 if var is None else var
        x = golpe(inst, var, round(float(np.clip(i, 0.1, 1.0)), 1))
        maxdur = maxdur or DURMAX.get(inst)
        if passa_baixa:
            x = m.passa_baixa(x, passa_baixa)
        if maxdur:   # abafado: a mão segura a pele ou o metal
            k = min(len(x), int(maxdur * SR))
            x = _fade(x[:k] * np.exp(-np.arange(k) / (0.35 * k)).astype(np.float32), 0, 0.02)
        self._por(x * np.float32(i), t, ganho_db, PAN.get(inst, 0.0) if pan is None else pan, fundo, inst)

    def eventos(self, ev, desloc=0.0, ganho_db=0.0, fundo=False, ate=None, escala=1.0):
        for t, inst, i in ev:
            if ate is None or t + desloc < ate:
                self.golpe(inst, t + desloc, i * escala, fundo=fundo, ganho_db=ganho_db)

    def formula(self, chave, t, escala=1.0, em="batida", ganho_db=0.0, fundo=False):
        """Fórmula de temas.FORMULAS com a batida (ou o 1º golpe, em='inicio') no instante t."""
        f = T.FORMULAS[chave]
        self.eventos(f["eventos"], t - (f["batida"] if em == "batida" else 0.0), ganho_db, fundo, escala=escala)
        return f

    def nota(self, inst, nota, t, dur, d, pan=None, ganho_db=0.0, fundo=True, cents=0.0, var=0):
        ns = sorted(nota.split("+"), key=T.midi)
        rasq = inst == "viola" and len(ns) > 2     # rasqueado: a mão varre do grave ao agudo
        for j, n in enumerate(ns):
            x = tom(inst, n, round(dur, 3), round(float(d) * (0.8 if len(ns) > 2 else 1), 3), var % 4, round(cents, 1))
            self._por(x, t + (0.012 * j if rasq else 0.0), ganho_db, PAN.get(inst, 0.0) if pan is None else pan,
                      fundo, inst)

    def melodia(self, inst, mel, t, bpm, din="mf", ganho_db=0.0, ate=None, pan=None, torta=0.0):
        """Melodia de temas.py (tempos) a partir de t."""
        rng = np.random.default_rng(int(t * 10))
        for k, (a, d, n, i) in enumerate(T.notas(mel, bpm, din)):
            a += t
            if ate is not None and a >= ate:
                break
            d = min(d, ate - a) if ate is not None else d
            self.nota(inst, n, a, d, i, pan, ganho_db, cents=torta * rng.uniform(-1, 1), var=k)

    def tema(self, chave, var, t, bpm=None, partes=None, ganho=None, sob_fala=None, ate=None,
             evitar=(), arrasto=0.0, torta=0.0):
        """Coloca um tema de temas.py a partir de t. bpm reescala o andamento; ganho/sob_fala: dB por parte
        (sob_fala None = a parte cala sob a voz); evitar: instantes onde golpes do tema abrem espaço (±0,15 s);
        arrasto: atraso (s) dos golpes fora do tempo (marcha arrastada); torta: desvio de afinação (cents)."""
        tema = T.TEMAS[chave]
        k = tema["bpm"] / bpm if bpm else 1.0
        ganho, sob_fala = ganho or {}, sob_fala or {}
        notas, golpes = T.eventos(tema, var)
        rng = np.random.default_rng(7)
        for j, (a, d, inst, n, i, parte) in enumerate(notas):
            if partes and parte not in partes:
                continue
            a, d = t + a * k, d * k
            if ate is not None:
                if a >= ate:
                    continue
                d = min(d, ate - a)
            g = ganho.get(parte, 0.0)
            if self.sob_fala(a, a + d):
                if sob_fala.get(parte, 0.0) is None:
                    continue
                g += sob_fala.get(parte, 0.0)
            self.nota(inst, n, a, d, i, ganho_db=g, cents=torta * rng.uniform(-1, 1) if inst == "rabeca" else 0.0,
                      var=j)
        for a, inst, i, parte in golpes:
            if partes and parte not in partes:
                continue
            b = a / (60 / tema["bpm"])
            fora = abs(b - round(b)) > 1e-6
            a = t + a * k + (arrasto if fora else 0.0)
            if (ate is not None and a >= ate) or any(abs(a - e) < 0.15 for e in evitar):
                continue
            g = ganho.get(parte, 0.0)
            if self.sob_fala(a, a + 0.1):
                if sob_fala.get(parte, 0.0) is None:
                    continue
                g += sob_fala.get(parte, 0.0)
            self.golpe(inst, a, i, fundo=True, ganho_db=g)

    def deixa(self, alvo, t_alvo, batida=None, tipo="golpe"):
        self.deixas.append((alvo, t_alvo, t_alvo if batida is None else batida, tipo))

    def abre_alas(self, alvo=None):
        """Abre-alas compacto: o stem começa na cartela, então só cabe o rufo de caixa antes do TUM + BÃO
        (cartela + 0,35 s); depois, a chamada da rabeca no modo do capítulo. alvo=(t2, tf): a 2ª nota da
        chamada cai em t2 e a última em tf (para casar com a fórmula de entrada que vem por baixo)."""
        tb = self.c["cartela"]["inicio"] + 0.35
        self.eventos(silabas(T.rufo(self.t0 + 0.02, tb - self.t0 - 0.05, 0.25, 0.9) + [(tb, "TUM", 1.0), (tb, "BÃO", 0.9)]))
        cham = CHAMADAS.get(self.c["id"], T.CHAMADA)
        bpm, t_ch = 80, tb + 0.3
        if alvo:
            b2, bf = cham[0][1], T.duracao(cham[:-1])
            bpm = (bf - b2) * 60 / (alvo[1] - alvo[0])
            t_ch = alvo[0] - b2 * 60 / bpm
        self.melodia("rabeca", cham, t_ch, bpm, ganho_db=-1.0)
        self.deixa("cartela pousa: Abre-alas (rrrum TUM + chamada da rabeca)", tb)
        return tb

    # --- áudio
    def render(self):
        n = self.n
        out = np.zeros((n, 2), np.float32)
        for seco, fundo, corte in self.segmentos:
            x = seco.x + fundo.x
            x += m.reverb(fundo.x, "mata")[:n] * m.db(-9)     # temas ao fundo, na mata
            x += m.reverb(seco.x, "mata")[:n] * m.db(-19)     # fórmulas secas e próximas
            if corte is not None:
                i = int(round((corte - self.t0) * SR))
                k = int(0.008 * SR)
                x[i + k:] = 0
                x[i:i + k] *= np.cos(np.linspace(0, np.pi / 2, len(x[i:i + k]), dtype=np.float32))[:, None]
            out += x
        out = cavar(out, [(a - self.t0, b - self.t0) for a, b in self.falas]) * m.db(GANHO_GERAL + AJUSTE.get(self.c["id"], 0.0))
        self.pico = 20 * np.log10(np.abs(out).max() + 1e-12)
        out = m.limitar(out, -1.0) if np.abs(out).max() > m.db(-1.0) else out
        vivo = np.nonzero(np.abs(out).max(axis=1) > 1e-4)[0]
        fim = max(int(round(self.dur * SR)), (vivo[-1] + int(0.05 * SR)) if len(vivo) else 0)
        return _fade(out[:min(fim, n)], 0, 0.05).astype(np.float32)


def cavar(x, falas, profundidade=-8.0):
    """Sob as falas, abre a faixa da voz: −8 dB num sino largo em 1,2 kHz (≈ 350 Hz–3,5 kHz), com rampas de 0,15 s."""
    y = signal.sosfilt(m._biquad("pico", 1200, profundidade, 0.45)[None], x, axis=0).astype(np.float32)
    mask = np.zeros(len(x), np.float32)
    for a, b in falas:
        mask[max(0, int((a - 0.1) * SR)):max(0, int((b + 0.1) * SR))] = 1
    mask = uniform_filter1d(mask, int(0.15 * SR))[:, None]
    return x + (y - x) * mask


def crescendo(p, inst, a, b, pico_db=0.0, expoente=2.2, passa_baixa=None, fundo=True, pular=0.0):
    """Rufo gravado (caixa ou bumbo) crescendo de nada até b, onde para seco."""
    x = golpe(inst, 0)[int(pular * SR):]
    if passa_baixa:
        x = m.passa_baixa(x, passa_baixa)
    k = min(len(x), int((b - a) * SR))
    env = (np.linspace(0, 1, k) ** expoente).astype(np.float32)
    p._por(_fade(x[:k] * env, 0.3, 0.008), b - k / SR, pico_db, 0.0, fundo, inst)


# ---------------------------------------------------------------- cenas

def cacadores(p):
    # cartela: rrrum TUM-BÃO e a chamada da rabeca em menor de modinha, que pousa no TUM da entrada
    t_ent = p.ini("cacadores_01")
    f = T.FORMULAS["entrada_cacadores"]
    t_f = t_ent - f["batida"]
    p.abre_alas(alvo=(t_f + 0.667, t_ent))

    # entrada: DUM · DUM · BUM-BUM | TUM tchi | TUM tchi | TUM! — o TUM quando os três surgem na tela
    p.eventos(f["eventos"], t_f)
    p.deixa("caçadores entram (entrada_cacadores)", t_ent)

    # marcha: Tema dos Caçadores (Ré menor de modinha) do TUM da entrada até o tiro; o andamento (85–95) se
    # ajusta para os 16 compassos fecharem no tiro. O berrante do tema abre a marcha (é a melodia da fórmula de
    # entrada). Sob a narração: zabumba e caixa no passo do Tião, berrante ao longe, rabeca grave meio torta
    # bem baixa, sanfona (baixo-acorde) e alfaias da 2ª metade recuadas.
    t_tiro = p.sfx("cacadores_05", "prato")
    bpm = float(np.clip(32 * 60 / (t_tiro - t_ent), 85, 95))
    bornal = [p.sfx("cacadores_04", "tambor_grave", k) for k in (0, 1)]
    t_facao = p.sfx("cacadores_03", "facao_golpe")
    p.tema("cacadores", "cheia", t_ent, bpm=bpm, ate=t_tiro, evitar=bornal + [t_facao], arrasto=0.02, torta=12,
           ganho={"berrante": -4, "rabeca": -2, "caixa": -3, "sanfona": -3, "prato": -2},
           sob_fala={"rabeca": -13, "caixa": -10, "zabumba": -6, "bacalhau": -6, "alfaia": -8, "berrante": -4,
                     "sanfona": -10, "prato": -8})
    t = p.sfx("cacadores_02", "bloco_madeira")
    p.formula("golpe_seco", t, 0.7)
    p.deixa("fim da 1ª fala: golpe seco (matraca + caixa)", t)

    # o passo do Zé: agogô mais ligeiro (tiqui-toco a 120) enquanto ele passa à frente; facão = caixa seca
    tz = p.sfx("cacadores_03", "agogo")
    for k, a in enumerate(np.arange(tz, p.fim("cacadores_03") - 0.1, 0.5)):
        p.golpe("agogo_agudo", a, 0.75 * 0.88 ** k)
        p.golpe("agogo_grave", a + 0.16, 0.5 * 0.88 ** k)
    p.deixa("o Zé entra: agogô", tz)
    p.golpe("caixa", t_facao, 0.85, maxdur=0.3, pan=0.1)
    p.deixa("facão do Zé: caixa seca", t_facao)
    for k, t in enumerate(bornal):
        p.golpe("zabumba", t, 0.8, maxdur=0.5)
        p.deixa(f"caça {k + 1} no bornal: baque de zabumba", t)

    # o tiro: prato, a música corta seco; a mata volta com a descida (rabeca escorregando + surdo)
    p.corte(t_tiro)
    p.golpe("prato", t_tiro, 1.0, maxdur=0.35)
    p.corte(t_tiro + 0.35)
    p.deixa("tiro nas araras: prato e corte", t_tiro)
    tg = p.sfx("cacadores_05", "gongo_desce")
    p.formula("desce", tg, 0.75, em="inicio")
    p.deixa("a mata volta: descida (uô da rabeca … bão)", tg)

    # lamento curto da rabeca sobre o bando que roda gritando (Ré menor: o suspiro Sib→Lá e o Dó# que volta
    # ao Ré), acaba antes do Tião
    lamento = [("Bb5", 0.5, "mp"), ("A5", 1.2, "p"), ("G5", 0.4), ("F5", 0.4), ("E5", 0.6), ("C#5", 0.4),
               ("D5", 1.4, "pp")]
    p.melodia("rabeca", lamento, tg + 0.35, 60, din="p", ate=p.ini("cacadores_07") - 0.1, ganho_db=3)

    # Tião prosa: a marcha volta de longe (sussurrada: zabumba, bacalhau, berrante) e some antes do refrão
    t7 = p.ini("cacadores_07")
    p.tema("cacadores", "sussurrada", t7 + 0.15, ate=p.fim("cacadores_07"), ganho={"berrante": -10},
           sob_fala={"zabumba": -4, "bacalhau": -4})

    # “E a mata ouviu” (1ª): pontuação grave (BÃO) e, quando os olhos se abrem, um uí baixinho da cuíca
    t = p.sfx("cacadores_08", "gongo_grave")
    p.formula("pontuacao", t, 0.55)
    p.golpe("cuica", t + 0.35, 0.3, pan=0.55, fundo=True, var=2)
    p.deixa("“E a mata ouviu” (1ª): BÃO + uí da cuíca", t)

    # a embaúba: três golpes de facão = três toques secos de caixa; rangido = tá tchi (gonguê, prato abafado);
    # tombo = BUM-dá-TCHÃ (susto) com BÃO; logo depois o golpe seco do “Derrubei!”
    for k in range(3):
        t = p.sfx("cacadores_10", "facao_golpe", k)
        p.golpe("caixa", t, 0.8 + 0.07 * k, maxdur=0.28, pan=0.1)
        p.deixa(f"facão na embaúba {k + 1}: caixa seca", t)
    tr = p.sfx("cacadores_10", "arvore_rangendo")
    p.eventos(silabas([(tr, "TÁ", 0.45), (tr + 0.2, "TCHI", 0.35)]))
    p.deixa("embaúba range: tá tchi", tr)
    tq = p.sfx("cacadores_10", "arvore_caindo")
    s = T.FORMULAS["susto"]
    p.eventos(s["eventos"] + silabas([(s["batida"], "BÃO", 0.9)]), tq - s["batida"])
    p.deixa("embaúba tomba: BUM-dá-TCHÃ + bão", tq)
    t = p.sfx("cacadores_11", "bloco_madeira")
    p.formula("golpe_seco", t, 0.75)
    p.deixa("“Derrubei!”: golpe seco", t)

    # 2º refrão, mais grave: rufo de bumbo cresce sob a frase e explode no fim em TUM + BÃO; a cuíca, mais perto
    t = p.sfx("cacadores_12", "gongo_grave")
    crescendo(p, "rufo_bumbo", t - 2.6, t, -3.0, expoente=2.0, passa_baixa=400, fundo=False)
    p.eventos(silabas([(t, "TUM", 0.9), (t, "BÃO", 0.9), (t, "BUM", 0.6)]))
    p.golpe("cuica", t + 0.3, 0.55, pan=0.45, fundo=True, var=5)
    p.deixa("“E a mata ouviu” (2ª): rufo de bumbo → TUM-BÃO + uí", t)

    # a veada: a viola volta frágil com a cabeça do Tema da Mata (fica suspensa), ameaçada pelo surdo em pulso
    # de coração (alinhado ao coração do roteiro); a fala do Tião a corta
    tv, t15 = p.ini("cacadores_13"), p.ini("cacadores_15")
    p.melodia("viola", T.trecho(T.MATA_RABECA, 0, 8), tv + 0.75, 80, din="p", ate=t15, ganho_db=-2)
    tc = p.sfx("cacadores_13", "coracao")
    te = p.sfx("cacadores_15", "espingarda_engatilhar")
    a = tc - np.floor((tc - tv - 0.2) / 1.0)
    while a < te - 0.3:
        p.golpe("surdo", a, 0.4, passa_baixa=180, fundo=True)
        p.golpe("surdo", a + 0.3, 0.25, passa_baixa=180, fundo=True)
        a += 1.0
    p.deixa("a veada no riacho: viola frágil + surdo-coração", tv + 0.75, tipo="entrada")

    # a mira: rufo de caixa cresce sob a fala fria e corta em silêncio total no engatilhar
    crescendo(p, "rufar", t15 + 0.4, te, -1.0, expoente=3.0, fundo=False, pular=0.4)
    p.corte(te)
    p.deixa("mira: rufo de caixa cresce e corta (silêncio total)", te, tipo="corte")


def aviso(p):
    # silêncio absoluto até o disparo; o prato vai com o tiro, e o assobio fica vibrando: a rabeca escorrega
    # (o uô gravado + um trêmolo de arco descendo o trítono Sol#→Ré, o pé virado) sobre o surdo
    t = p.sfx("aviso_02", "prato")
    p.golpe("prato", t, 0.85, maxdur=0.6)
    p.deixa("tiro desviado: prato", t)
    tg = p.sfx("aviso_02", "gongo_desce")
    p.golpe("rabeca_glissando", tg, 0.8, var=1)
    p.golpe("caixa", tg, 0.3)
    trem = tom("rabeca_tremolo", "G#4", 4.0, 0.5)
    p._por(_fade(deslizar(trem, -6.0, 3.2, curva=0.8)[:int(3.8 * SR)], 0, 0.4), tg + 0.05, -4.0, 0.2, True, "rabeca_tremolo")
    p.eventos(silabas([(tg + 1.2, "DUM", 0.5), (tg + 1.2, "TCHÁ", 0.15)]), fundo=True)
    p.deixa("o assobio fica vibrando: rabeca escorrega (desce)", tg)

    # Arrepio (suspense) sob a narração: berimbau de dobrão encostado (zum) e tenso em pulso irregular,
    # pau-de-chuva, maracás em trêmulo e surdo distante; antes da voz do Curupira, um uí grave da cuíca
    a, b = p.ini("aviso_03"), p.fim("aviso_03")
    d = b - a
    for k, x in enumerate(np.arange(0.1, d - 0.3, 0.62)):
        p.golpe("berimbau_zum", a + x + 0.07 * (k % 3), 0.2 + 0.4 * np.sin(np.pi * x / d) ** 1.5, fundo=True, var=k)
    p.golpe("pau_de_chuva", a, 0.6, fundo=True, var=1)
    for x, prender in ((0.35, 0), (1.2, 1), (1.5, 1), (2.85, 0), (3.25, 1), (4.5, 0), (4.85, 1), (5.15, 1), (6.2, 0)):
        if x < d - 0.3:
            p.golpe("berimbau_preso" if prender else "berimbau", a + x, 0.5, fundo=True, var=int(x * 10))
    for c0, c1 in ((1.0, 2.5), (3.6, 5.3)):
        for x in np.arange(c0, min(c1, d - 0.2), 0.055):
            p.golpe("maraca", a + x, 0.35 * np.sin(np.pi * (x - c0) / (c1 - c0)), fundo=True, var=int(x * 50))
    for x, i in ((0.5, 0.5), (2.6, 0.4), (3.0, 0.55), (5.6, 0.45)):
        if x < d:
            p.golpe("surdo", a + x, i, passa_baixa=250, fundo=True, ganho_db=-5)
    p.deixa("Arrepio: suspense sob a narração", a, tipo="entrada")
    t4 = p.ini("aviso_04")
    tc = (b + t4) / 2 - 0.15
    p.nota("cuica", "A3", tc, 0.45, 0.45, pan=0.0, ganho_db=-2)
    p.deixa("a voz vai chegar: uí grave da cuíca", tc, tipo="entrada")

    # a voz do Curupira: só bordão grave de rabeca (Lá-Ré, escuro e baixo) e pau-de-chuva; ao fim, a descida
    # (uô da rabeca + bão) cabe antes da fala do Zé
    t = p.sfx("aviso_04", "pau_de_chuva")
    p.golpe("pau_de_chuva", t, 0.75, var=2)
    p.deixa("voz do Curupira: pau-de-chuva", t)
    tgd = p.sfx("aviso_04", "gongo_desce")
    for n in ("A3", "D4"):
        x = tom("rabeca", n, round(tgd - t + 0.4, 3), 0.3, 1 if n == "D4" else 2)
        p._por(m.passa_baixa(_fade(x, 0.8, 0.6), 1000), t + 0.1, -6.0, 0.15 if n == "D4" else -0.15, True, "rabeca")
    folga = min(1.2, max(0.4, p.ini("aviso_05") - tgd - 0.1))
    p.eventos(silabas([(tgd, "UÔ", 0.8), (tgd, "DÁ", 0.3), (tgd + folga, "BÃO", 0.6)]))
    p.deixa("fim da voz do Curupira: descida (uô … bão)", tgd)

    # Zé e Tião: só um surdo abafado, como passos de algo grande (some sob a última narração)
    a, b = p.ini("aviso_05"), p.ini("aviso_07") + 1.5
    for k, x in enumerate(np.arange(a + 0.2, b, 1.25)):
        p.golpe("surdo", x + 0.08 * np.sin(3 * k), 0.42 * (0.8 if x > p.fim("aviso_06") else 1), passa_baixa=160,
                fundo=True, var=k)
    p.deixa("passos de algo grande: surdo abafado", a + 0.2)

    # saída apressada dos dois: a matraca acelera na cauda, até o rufo do Abre-alas da cena seguinte
    if p.prox and p.prox["id"] in CENAS and p.prox.get("cartela"):
        ev = T.acel(0.0, 9, 0.26, 0.06, "PÁ", 0.3, 0.8)
        fim_ = p.prox["inicio"] - 0.04
        ini_ = max(p.sfx("aviso_07", "assobio_curupira") + 0.6, fim_ - ev[-1][0])
        esc = (fim_ - ini_) / ev[-1][0]
        p.eventos(silabas([(ini_ + t * esc, s, i) for t, s, i in ev]))
        p.deixa("os dois apertam o passo: matraca acelera (leva ao Abre-alas)", ini_, tipo="entrada")


def rastros(p):
    p.abre_alas()
    t = p.sfx("rastros_01", "bloco_madeira")
    p.formula("golpe_seco", t, 0.6)
    p.deixa("Tião lê o chão: golpe seco", t)

    # o rastro: Tema do Curupira de trás para a frente (viola e cuíca sussurradas, berimbau), caxixi e maracá
    # num ostinato que não sai do lugar (120), alfaia acelerando aos poucos (60→120) até o Pé-de-vento
    t_r = p.ini("rastros_02")
    t_bao = p.sfx("rastros_04", "gongo_grave")
    t_pdv = p.sfx("rastros_06", "bloco_acelera")
    p.tema("curupira", "rastro", t_r, partes=["viola", "cuica", "berimbau", "berimbau_preso"], ate=t_bao - 0.15,
           ganho={"viola": -4, "cuica": -7, "berimbau": -6, "berimbau_preso": -6}, sob_fala={"viola": -3, "cuica": -2})
    for k, x in enumerate(np.arange(t_r, t_pdv, 0.125)):
        c = "X..x..x."[k % 8]
        if c != ".":
            p.golpe("caxixi", x, 0.55 if c == "X" else 0.38, fundo=True, var=k)
        if "..x...x."[k % 8] == "x":
            p.golpe("maraca", x, 0.3, fundo=True, var=k)
    for k, x in enumerate(grade_acel(t_r, t_pdv, 60, 120, passo=1.0)):
        p.golpe("alfaia", x, 0.3 + 0.35 * (x - t_r) / (t_pdv - t_r), fundo=True, var=k, ganho_db=-3)
    p.deixa("seguem o rastro: variação 'rastro' + ostinato + alfaia acelerando", t_r, tipo="entrada")
    t = p.sfx("rastros_03", "caxixi")
    p.golpe("caxixi", t, 1.0, fundo=True, var=3, pan=-0.45)
    p.deixa("quem deixou o rastro foi para o outro lado: caxixi", t)
    p.formula("pontuacao", t_bao, 0.6)
    p.deixa("a embaúba caída de novo: BÃO", t_bao)
    # a rabeca presa numa frase que sempre volta à mesma nota (Lá, com o Sol# do pé virado)
    presa = [("A4", 0.5), ("G#4", 0.25), ("A4", 0.75), ("R", 0.5)] * 6
    p.melodia("rabeca", presa, t_bao + 0.6, 120, din="pp", ate=t_pdv - 0.1, ganho_db=-4)

    # perdidos: a matraca acelera no sfx; a cada volta, o BÃO; depois o Pé-de-vento sussurrado (baque virado:
    # alfaia, caixa, gonguê, ganzá, 120→176) com a célula Ré-Sol#-Lá na rabeca; rrrum TUM-BÃO na 2ª volta
    p.eventos(silabas(T.acel(t_pdv, 10, 0.3, 0.06, "PÁ", 0.35, 0.85)))
    p.deixa("perdidos em círculo: matraca acelera", t_pdv)
    tg1, tg2 = p.sfx("rastros_06", "gongo_grave", 0), p.sfx("rastros_06", "gongo_grave", 1)
    p.formula("pontuacao", tg1, 0.6)
    p.deixa("a embaúba volta (1ª volta): BÃO", tg1)
    grade = grade_acel(tg1, tg2 - 0.5, 120, 176)
    celula = "D5 G#4 A4 D5 G#4 A4 D5 F5".split()
    for k, x in enumerate(grade[:-1]):
        u = (x - tg1) / (tg2 - tg1)
        if "X..x..x."[k % 8] != ".":
            p.golpe("alfaia", x, (0.75 if k % 8 == 0 else 0.5) * (0.6 + 0.4 * u), fundo=True, var=k, maxdur=0.45)
        if "X.x.x.x."[k % 8] != ".":
            p.golpe("gongue", x, 0.35 + 0.15 * u, fundo=True, var=k % 2, ganho_db=-3)
        p.golpe("ganza", x, 0.4 + 0.2 * u, fundo=True, var=k)
        p.golpe("caixa", x, (0.45 if k % 4 == 0 else 0.25) * (0.6 + 0.4 * u), fundo=True, var=k, maxdur=0.2)
        p.nota("rabeca", celula[k % 8], x, grade[k + 1] - x, 0.5 + 0.25 * (k % 4 == 0), ganho_db=-3, var=k)
    p.eventos(silabas(T.rufo(tg2 - 0.5, 0.45, 0.4, 1.0) + [(tg2, "TUM", 1.0), (tg2, "BÃO", 0.8)]))
    p.deixa("a mesma embaúba (2ª volta): rrrum TUM-BÃO", tg2)

    # a noite cai: silêncio. Do escuro, o pio do inhambu imitado pela cuíca (é o Curupira quem chama)
    ti = p.sfx("rastros_08", "inhambu") + 1.6
    p.nota("cuica", "A4", ti, 0.6, 0.35, pan=0.45, ganho_db=-3, var=1)
    p.nota("cuica", "F#4", ti + 1.25, 0.5, 0.3, pan=0.45, ganho_db=-4, var=6)
    p.deixa("a cuíca imita o pio do inhambu", ti, tipo="entrada")

    # a falsa Vó: a música some e a rabeca sobe num trêmolo de arco escorregando o trítono (Ré → Sol#)
    tv = p.ini("rastros_09")
    dv = p.fim("rastros_09") - tv + 0.3
    trem = tom("rabeca_tremolo", "D4", round(dv * 1.5 + 0.5, 3), 0.4)
    p._por(_fade(deslizar(trem, 6.0, dv, curva=1.3)[:int(dv * SR)], 0.3, 0.3), tv + 0.1, -7.0, 0.2, True, "rabeca_tremolo")
    p.deixa("voz que imita a Vó: rabeca sobe escorregando", tv + 0.1, tipo="entrada")

    # dente batendo em dente: o chão treme (rufo de bumbo crescendo, sem meio), a matraca acelera até a vara
    # entrar (TUM); explode o baque de galope (maracatu acelerando 150→176) e corta seco no prato
    t_vara = p.ini("rastros_14")
    crescendo(p, "rufo_bumbo", p.ini("rastros_12") + 1.0, t_vara - 0.02, -2.0, passa_baixa=300)
    f = T.FORMULAS["pose"]
    p.eventos([e for e in f["eventos"] if e[0] <= f["batida"]], t_vara - f["batida"])
    p.deixa("a vara de queixadas entra: pá…pápápá TUM", t_vara)
    t_prato = p.sfx("rastros_14", "prato")
    grade = grade_acel(t_vara, t_prato, 150, 176)
    galope = {"alfaia": "X.xxX.xx", "atabaque": "..x..x.x", "caixa": "XxxXxxXx", "gongue": "X.x.x.x.",
              "matraca": "x.xx", "agogo_agudo": "X.x.....", "agogo_grave": "....X.x.", "ganza": "xxxxxxxx",
              "prato": "X" + "." * 15}
    pers = " ".join(T.PERS[c] for c in "DADB").replace(" R", " A4").split()
    acordes = "Dm Dm C A7".split()
    for k, x in enumerate(grade[:-1]):
        u = 0.85 + 0.15 * (x - t_vara) / (t_prato - t_vara)
        for inst, g in galope.items():
            c = g[k % len(g)]
            if c in T.PESO:
                p.golpe(inst, x, T.PESO[c] * u * (0.7 if inst in ("prato", "gongue") else 1.0), var=k, ganho_db=3,
                        maxdur={"caixa": 0.25, "alfaia": 0.4, "atabaque": 0.4, "prato": 0.8}.get(inst))
        p.nota("rabeca", pers[k % len(pers)], x, grade[k + 1] - x, 0.85 if k % 4 == 0 else 0.65, ganho_db=2, var=k)
        if k % 8 in (0, 3):   # sanfona em estocadas (ESTOCADA de temas.py)
            p.nota("sanfona", "+".join(T.TRIADE[acordes[(k // 8) % 4]].split()), x, 0.14, 0.8, ganho_db=-1, var=k)
    p.corte(t_prato)
    p.golpe("prato", t_prato, 1.0, maxdur=1.3)
    p.deixa("galope corta seco no prato", t_prato)

    # o açoite no escuro: sem música. Na última frase, a pegada do Curupira sussurrada na viola (Lá-Dó-Si-Sol#-Lá
    # e o retrógrado), o BÃO que fecha a cena e o uí da cuíca na cauda
    tf = p.sfx("rastros_16", "gongo_grave")
    pegada = T.CURU_X + T.retrogrado(T.CURU_X)
    p.melodia("viola", pegada, tf - 0.25 - 60 / 120 * T.duracao(pegada), 120, din="p", ganho_db=-2)
    p.formula("pontuacao", tf, 0.6)
    p.golpe("cuica", tf + 0.5, 0.35, pan=-0.4, fundo=True, var=3)
    p.deixa("“Coisa do Curupira”: pegada na viola + BÃO + uí", tf)


COMPOR = {"cacadores": cacadores, "aviso": aviso, "rastros": rastros}


def partitura(cena_id, linha):
    p = Cena(cena_id, linha)
    COMPOR[cena_id](p)
    # sfx musicais do roteiro que a composição não tratou: a fórmula da função (etiquetas antigas) ou o timbre
    # brasileiro equivalente, com um aviso
    for b in p.c["beats"]:
        vistos = {}
        for s in b["sfx"]:
            k = vistos[s["som"]] = vistos.get(s["som"], -1) + 1
            if s["som"] in MUSICAIS and (b["id"], s["som"], k) not in p.usados:
                print(f"aviso: {b['id']} {s['som']} não composto; usando o padrão", file=sys.stderr)
                if s["som"] in T.ETIQUETAS_ANTIGAS:
                    p.formula(T.ETIQUETAS_ANTIGAS[s["som"]][0], s["t"], 0.6)
                else:
                    p.golpe(SUBSTITUTO[s["som"]], s["t"], 0.6)
                p.deixa(f"{s['som']} (padrão)", s["t"])
    assert not p.insts & T.PROIBIDOS, (cena_id, p.insts & T.PROIBIDOS)
    return p


def compor(cena_id, linha):
    """Stem estéreo float32 (n, 2) a 48 kHz que começa em cena.inicio e dura cena.fim − cena.inicio + cauda (≤ 4 s)."""
    return partitura(cena_id, linha).render()


# ---------------------------------------------------------------- conferência e prévias

def medir_deixas(p, x):
    """Para cada deixa, o ataque medido no áudio (pico do fluxo espectral em −30…+80 ms: acha o golpe mesmo
    sobre outra música, se ele chega numa faixa nova) ou, nos cortes, o nível 0,1–0,6 s depois / 0,5 s antes."""
    hop = 120
    _, tq, Z = signal.stft(x.mean(axis=1), SR, nperseg=1024, noverlap=1024 - hop, boundary=None)
    L = np.log(np.abs(Z) + 1e-5)
    fluxo = np.concatenate([[0], np.maximum(np.diff(L, axis=1), 0).sum(axis=0)])
    linhas = []
    for alvo, t_alvo, batida, tipo in sorted(p.deixas, key=lambda d: d[1]):
        i = int(round((batida - p.t0) * SR))
        if tipo == "corte":
            antes = np.sqrt(np.mean(x[max(0, i - SR // 2):i] ** 2) + 1e-12)
            depois = np.sqrt(np.mean(x[i + SR // 10:i + int(0.6 * SR)] ** 2) + 1e-12) if i + SR // 10 < len(x) else 0
            medido = f"{20 * np.log10(depois / antes + 1e-12):+.0f} dB"
        elif tipo == "entrada":
            medido = "—"
        else:
            sel = np.nonzero((tq >= batida - p.t0 - 0.03) & (tq <= batida - p.t0 + 0.08))[0]
            j = sel[np.argmax(fluxo[sel])]
            medido = f"{(tq[j] - (batida - p.t0)) * 1000:+.0f} ms"
        linhas.append((alvo, t_alvo, batida, medido))
    return linhas


def figura(p, x, caminho):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, (a1, a2) = plt.subplots(2, 1, figsize=(22, 9), sharex=True, gridspec_kw=dict(height_ratios=[3, 1]))
    f, t, Z = signal.stft(x.mean(axis=1), SR, nperseg=4096, noverlap=4096 - 1024)
    k = (f >= 40) & (f <= 12000)
    dbz = 20 * np.log10(np.abs(Z[k]) + 1e-9)
    a1.pcolormesh(t + p.t0, f[k], dbz - dbz.max(), vmin=-80, vmax=0, cmap="magma", shading="auto")
    a1.set_yscale("log")
    a1.set_ylabel("Hz")
    for a, b in p.falas:
        for ax in (a1, a2):
            ax.axvspan(a, b, color="cyan", alpha=0.08)
        a1.hlines([300, 3000], a, b, color="cyan", lw=0.8, alpha=0.6)
    for j, (alvo, t_alvo, batida, tipo) in enumerate(sorted(p.deixas, key=lambda d: d[1])):
        a1.axvline(batida, color="w" if tipo != "corte" else "r", lw=0.8, ls="--", alpha=0.8)
        a1.text(batida, 12000 * 0.75 ** (j % 6), alvo[:38], color="w", fontsize=7, rotation=0, va="top")
    rms = 10 * np.log10(uniform_filter1d((x ** 2).sum(axis=1), int(0.05 * SR))[::480] + 1e-10)
    a2.plot(p.t0 + np.arange(len(rms)) * 0.01, rms, lw=0.7)
    a2.set_ylim(-80, 0)
    a2.set_ylabel("dB RMS")
    a2.axvline(p.c["fim"], color="k", lw=1)
    a2.set_xlabel("s (linha do tempo)")
    a1.set_title(f"{p.c['id']} (v2) — falas em ciano (faixa 300 Hz–3 kHz marcada); deixas tracejadas (cortes em vermelho)")
    fig.tight_layout()
    fig.savefig(caminho, dpi=70)
    plt.close(fig)


def faixa_voz(p, x):
    """Energia em 300 Hz–3 kHz sob as falas e fora delas (dB RMS), para conferir que o meio fica livre."""
    y = signal.sosfilt(signal.butter(4, [300, 3000], "bandpass", fs=SR, output="sos"), x.mean(axis=1))
    mask = np.zeros(len(y), bool)
    for a, b in p.falas:
        mask[int((a - p.t0) * SR):int((b - p.t0) * SR)] = True
    mask = mask[:len(y)]

    def nivel(sel):
        return 10 * np.log10(np.mean(y[sel] ** 2) + 1e-12) if sel.any() else float("nan")
    return nivel(mask), nivel(~mask)


def main(cenas):
    linha = json.loads((PROD / "linha-do-tempo.json").read_text(encoding="utf-8"))
    stems, previas = AQUI / "stems", AQUI / "previas"
    stems.mkdir(exist_ok=True)
    previas.mkdir(exist_ok=True)
    if linha.get("estimada"):
        print("(linha do tempo estimada: renderize de novo quando as vozes reais chegarem)")
    for cid in cenas:
        p = partitura(cid, linha)
        x = p.render()
        assert x.dtype == np.float32 and x.ndim == 2 and x.shape[1] == 2 and np.isfinite(x).all()
        assert int(round(p.dur * SR)) <= len(x) <= p.n, (cid, len(x) / SR, p.dur)
        wav = stems / f"{cid}.wav"
        sf.write(str(wav), x, SR, subtype="FLOAT")
        subprocess.run([str(m.FFMPEG), "-y", "-loglevel", "error", "-i", str(wav), "-c:a", "libmp3lame", "-b:a", "192k",
                        str(previas / f"{cid}.mp3")], check=True)
        figura(p, x, previas / f"{cid}.png")
        sob, fora = faixa_voz(p, x)
        print(f"\n== {cid}: {p.t0:.3f}–{p.c['fim']:.3f} s, stem {len(x) / SR:.2f} s (cauda {len(x) / SR - p.dur:.2f} s), "
              f"pico {20 * np.log10(np.abs(x).max()):.1f} dBFS (antes do limitador {p.pico:.1f}), {m.lufs(x):.1f} LUFS, 400 ms máx {m.lufs_curto_max(x):.1f}, "
              f"300 Hz–3 kHz sob falas {sob:.1f} dB / fora {fora:.1f} dB")
        print(f"   instrumentos: {', '.join(sorted(p.insts))}")
        print(f"   {'deixa (alvo)':62s} {'alvo':>8s} {'batida':>8s} {'medido':>8s}")
        for alvo, t_alvo, batida, medido in medir_deixas(p, x):
            print(f"   {alvo:62s} {t_alvo:8.3f} {batida:8.3f} {medido:>8s}")


if __name__ == "__main__":
    main(sys.argv[1:] or list(CENAS))
