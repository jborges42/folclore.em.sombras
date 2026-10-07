"""Material temático da trilha do Curupira: temas (leitmotivs), grades rítmicas e fórmulas de percussão.
Dados puros + utilitários mínimos (só biblioteca padrão). A explicação musical está em LINGUAGEM_MUSICAL.md.

Convenções
- Nota: "D5", "F#4", "Bb3" (Lá4 = 440 Hz); "R" = pausa; "D3+A3" = notas juntas (corda dupla, acorde).
- Melodia: lista de (nota, tempos[, dinâmica]). 1 tempo = 1 pulso do bpm do tema (semínima).
  Sem dinâmica, vale a "din" da parte.
- Dinâmica: chaves de DIN ("pp" … "ff") → intensidade 0..1.
- Grade: 1 caractere = 1 semicolcheia (0,25 tempo). "X" forte, "x" normal, "o" fantasma, "." nada.
  Grade mais curta que o tema repete em laço; grade do tamanho do tema é literal.
- Parte de tema: {"instrumento": ..., "din": ...} + UM de: "melodia", "grade" ou "eventos" [(tempo, intensidade)].
- Fórmula: dict com "eventos" [(segundos, instrumento, intensidade)], "batida" (s do golpe principal, para
  alinhar com o gesto do boneco), "fala" (as sílabas da fórmula, para ler em voz alta) e "dur"
  (instante do último golpe; a ressonância soa depois).
- API para a composição cena a cena: eventos(tema, "cheia"|"sussurrada"|"fragmento"|...) → (notas, golpes)
  em segundos; FORMULAS[nome]["eventos"] já está em segundos.
"""
import math
import re

# ================================================================ notação e utilitários

DIN = {"pp": 0.2, "p": 0.32, "mp": 0.45, "mf": 0.6, "f": 0.8, "ff": 1.0}
PESO = {"X": 1.0, "x": 0.65, "o": 0.3}
PASSO = 0.25  # um caractere de grade, em tempos

# escalas: semitons a partir da tônica (o 0 é obrigatório)
PENTA_MAIOR = (0, 2, 4, 7, 9)
PENTA_MENOR = (0, 3, 5, 7, 10)
MIXOLIDIO = (0, 2, 4, 5, 7, 9, 10)
NORDESTINA = (0, 2, 4, 6, 7, 9, 10)  # lídio com 7ª menor
DORICO = (0, 2, 3, 5, 7, 9, 10)
EOLIO = (0, 2, 3, 5, 7, 8, 10)
FRIGIO = (0, 1, 3, 5, 7, 8, 10)

_NOTA = re.compile(r"([A-G])([#b]?)(-?\d)$")
_PC = dict(C=0, D=2, E=4, F=5, G=7, A=9, B=11)
_ACID = {"#": 1, "b": -1, "": 0}
NOMES = ("C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B")


def midi(nota):
    letra, acid, oit = _NOTA.match(nota).groups()
    return 12 * (int(oit) + 1) + _PC[letra] + _ACID[acid]


def nome(m):
    return f"{NOMES[m % 12]}{m // 12 - 1}"


def freq(nota, la=440.0):
    """'A4' → 440.0 Hz (temperamento igual)."""
    return la * 2 ** ((midi(nota) - 69) / 12)


def transpor_nota(nota, semitons=0, graus=0, tonica="D", escala=MIXOLIDIO):
    """Transposição cromática (semitons) e/ou diatônica (graus da escala; −2 = terça abaixo).
    Nota fora da escala mantém o desvio cromático em relação ao grau logo abaixo."""
    if nota == "R":
        return nota
    if "+" in nota:
        return "+".join(transpor_nota(n, semitons, graus, tonica, escala) for n in nota.split("+"))
    m = midi(nota) + semitons
    if graus:
        t = _PC[tonica[0]] + _ACID[tonica[1:]]
        oit, r = divmod(m - t, 12)
        i = max(k for k, s in enumerate(escala) if s <= r)
        o2, i2 = divmod(oit * len(escala) + i + graus, len(escala))
        m = t + 12 * o2 + escala[i2] + (r - escala[i])
    return nome(m)


def transpor(melodia, semitons=0, graus=0, tonica="D", escala=MIXOLIDIO):
    return [(transpor_nota(n, semitons, graus, tonica, escala), *resto) for n, *resto in melodia]


def retrogrado(melodia):
    """De trás para a frente: o 'rastro invertido' dos pés virados."""
    return list(reversed(melodia))


def duracao(melodia):
    return sum(e[1] for e in melodia)


def trecho(melodia, ini, fim):
    """Recorte [ini, fim) em tempos; notas na borda são aparadas."""
    out, t = [], 0.0
    for n, d, *resto in melodia:
        a, b = max(t, ini), min(t + d, fim)
        if b > a + 1e-9:
            out.append((n, round(b - a, 6), *resto))
        t += d
    return out


def segundos(tempo, bpm, bpm_fim=None, total=None):
    """Posição (s) do tempo `tempo`. Com bpm_fim, o andamento varia linearmente de bpm a bpm_fim ao longo
    de `total` tempos (acelerando ou ritardando)."""
    if not bpm_fim or bpm_fim == bpm:
        return 60.0 * tempo / bpm
    k = (bpm_fim - bpm) / total
    return 60.0 / k * math.log((bpm + k * tempo) / bpm)


def notas(melodia, bpm, din="mf", bpm_fim=None, total=None):
    """Melodia → [(t_seg, dur_seg, nota, intensidade)], pausas omitidas."""
    total = total or duracao(melodia)
    out, b = [], 0.0
    for n, d, *dn in melodia:
        if n != "R":
            t0 = segundos(b, bpm, bpm_fim, total)
            out.append((t0, segundos(b + d, bpm, bpm_fim, total) - t0, n, DIN[dn[0] if dn else din]))
        b += d
    return out


def golpes_grade(grade, total, bpm, din="mf", bpm_fim=None):
    """Grade (em laço até `total` tempos) → [(t_seg, intensidade)]."""
    return [(segundos(k * PASSO, bpm, bpm_fim, total), PESO[c] * DIN[din])
            for k in range(round(total / PASSO)) if (c := grade[k % len(grade)]) in PESO]


def tempos_compasso(tema):
    return int(tema["compasso"].split("/")[0])  # todos os compassos aqui são x/4


def tempos_tema(tema):
    return max(duracao(p["melodia"]) for p in tema["partes"].values() if "melodia" in p)


def variacao(tema, nome_var="cheia"):
    """Aplica uma variação: filtra partes, recorta compassos, inverte (retrógrado), troca andamento/grades."""
    v = tema.get("variacoes", {}).get(nome_var, {})
    total = v.get("compassos", 0) * tempos_compasso(tema) or tempos_tema(tema)
    retro = v.get("retrogrado", False)
    partes = {k: p for k, p in tema["partes"].items() if k in v.get("partes", tema["partes"])}
    partes.update(v.get("extra", {}))
    out = {}
    for k, p in partes.items():
        p = dict(p)
        if "melodia" in p:
            m = trecho(p["melodia"], 0, total)
            p["melodia"] = retrogrado(m) if retro else m
        elif "grade" in p:
            n = round(total / PASSO)
            g = (p["grade"] * math.ceil(n / len(p["grade"])))[:n]
            p["grade"] = g[::-1] if retro else g
        else:
            ev = [(t, i) for t, i in p["eventos"] if t < total]
            p["eventos"] = sorted((total - PASSO - t, i) for t, i in ev) if retro else ev
        out[k] = p
    return dict(bpm=v.get("bpm", tema["bpm"]), bpm_fim=v.get("bpm_fim", tema.get("bpm_fim")),
                total=total, ganho=v.get("ganho", 1.0), partes=out)


def eventos(tema, nome_var="cheia"):
    """Tema → (notas, golpes) em segundos, prontos para sintetizar/posicionar.
    notas: [(t, dur, instrumento, nota, intensidade, parte)]; golpes: [(t, instrumento, intensidade, parte)]."""
    v = variacao(tema, nome_var)
    bpm, fim, total, g = v["bpm"], v["bpm_fim"], v["total"], v["ganho"]
    ns, gs = [], []
    for k, p in v["partes"].items():
        inst, din = p["instrumento"], p.get("din", "mf")
        if "melodia" in p:
            ns += [(t, d, inst, n, i * g, k) for t, d, n, i in notas(p["melodia"], bpm, din, fim, total)]
        elif "grade" in p:
            gs += [(t, inst, i * g, k) for t, i in golpes_grade(p["grade"], total, bpm, din, fim)]
        else:
            gs += [(segundos(b, bpm, fim, total), inst, i * DIN[din] / DIN["mf"] * g, k) for b, i in p["eventos"]]
    return sorted(ns), sorted(gs)



# ================================================================ instrumentos

# extensão escrita (nota mais grave, mais aguda) de cada instrumento melódico
EXTENSAO = {
    "rabeca": ("G3", "A6"),          # afinação Sol-Ré-Lá-Mi; cordas soltas Ré e Lá servem de bordão
    "rabeca_tremolo": ("G3", "A6"),  # rabeca em trêmolo de arco
    "viola": ("A2", "A5"),           # viola caipira em cebolão de Ré (Lá-Ré-Fá#-Lá-Ré); acorde com "+" = rasqueado
    "sanfona": ("E2", "A6"),         # sanfona/acordeom: baixos (E2–D3) e teclado (F3–A6); fole sustenta e respira
    "cuica": ("G3", "D5"),           # cuíca: a nota é o TOPO do gemido "uí" (a altura desce ~6 semitons e sobe até ela)
    "berrante": ("G3", "E4"),        # chifre de boi soprado: chamado dos caçadores/vaqueiros
}

PERCUSSAO = {
    "alfaia", "surdo", "zabumba", "bacalhau", "caixa", "atabaque",
    "prato", "prato_abafado",        # prato de banda (aberto / abafado com a mão)
    "matraca",                       # matracas de bumba-meu-boi (duas tábuas de madeira dura)
    "gongue", "agogo_agudo", "agogo_grave", "triangulo",
    "caxixi", "maraca", "ganza", "pau_de_chuva",
    "berimbau", "berimbau_preso", "berimbau_zum",   # solto (DOIM), preso no dobrão (DIM), dobrão encostado (ZUM)
    "cuica",                         # cuíca: um gemido "uí" (one-shot)
    "rabeca_glissando",              # rabeca escorregando para o grave (a "descida")
}

# Timbres que NÃO entram: deram a cor oriental à versão 1. _conferir() recusa qualquer parte ou fórmula com eles.
PROIBIDOS = {"pifano", "flauta", "flauta_chamado", "quena", "ocarina", "kalimba", "marimba", "salterio_arco",
             "gongo_grave", "gongo_agudo", "gongo_sobe", "gongo_desce", "tam_tam", "bloco", "bloco_madeira",
             "bloco_acelera", "curimbo_grave", "curimbo_agudo", "banjo"}

# prefixo das amostras em sons/musica/ (fontes.json traz a altura medida das melódicas, "NNN Hz")
ETIQUETA = {
    "sanfona": "sanfona", "cuica": "cuica", "berrante": "berrante", "rabeca": "rabeca", "viola": "viola",
    "alfaia": "alfaia", "surdo": "surdo", "zabumba": "tambor_grave", "atabaque": "atabaque", "caixa": "caixa",
    "prato": "prato", "matraca": "claves", "gongue": "gongue", "agogo_agudo": "agogo", "agogo_grave": "agogo",
    "triangulo": "triangulo", "caxixi": "caxixi", "maraca": "maraca", "ganza": "ganza",
    "pau_de_chuva": "pau_de_chuva", "berimbau": "berimbau_solto", "berimbau_preso": "berimbau_preso",
    "rabeca_glissando": "rabeca_glissando",
}

# ================================================================ harmonia

# tríade em posição fechada perto do Ré4 (sanfona/viola) e o par de bordões da viola (cebolão em Ré)
TRIADE = {"D": "D4 F#4 A4", "C": "C4 E4 G4", "G": "B3 D4 G4", "Am": "C4 E4 A4", "A": "C#4 E4 A4",
          "A7": "C#4 E4 G4", "Dm": "D4 F4 A4", "Bb": "Bb3 D4 F4", "Gm": "Bb3 D4 G4", "Em": "B3 E4 G4"}
BAIXO_VIOLA = {"D": "D3+A3", "C": "C3+G3", "G": "D3+G3", "Am": "A2+E3", "A": "A2+E3", "A7": "A2+E3",
               "Dm": "D3+A3", "Bb": "Bb2+F3", "Gm": "D3+G3", "Em": "E3+B3"}
BAIXO_SANFONA = {"D": "D3", "C": "C3", "G": "G2", "Am": "A2", "A": "A2", "A7": "A2", "Dm": "D3", "Bb": "Bb2",
                 "Gm": "G2", "Em": "E2"}


def _tri(c, oit=0):
    return [transpor_nota(n, 12 * oit) for n in TRIADE[c].split()]


def _junta(notas):
    return "+".join(notas)


# ponteio de viola (2/4): bordões juntos, depois o dedilhado nas primas
PONTEIO = {c: (lambda a, b, d: [(BAIXO_VIOLA[c], 0.5), (b, 0.25), (d, 0.25), (a, 0.5), (b, 0.25), (d, 0.25)])(*_tri(c))
           for c in TRIADE}
# ponteio de acalanto/modinha (3/4): bordões e o arpejo uma oitava abaixo (a melodia canta por cima)
PONTEIO3 = {c: (lambda a, b, d: [(BAIXO_VIOLA[c], 1), (a, 0.5), (b, 0.5), (d, 0.5), (b, 0.5)])(*_tri(c, -1))
            for c in TRIADE}
# rasqueado de baião (2/4, 3+3+2): bordões + tríade no mesmo golpe de mão
RASQUEADO = {c: [(_junta([BAIXO_VIOLA[c]] + _tri(c)), 0.75), (_junta(_tri(c)), 0.75), (_junta(_tri(c)), 0.5)]
             for c in TRIADE}
# sanfona: fole sustentado (1 compasso), baixo-acorde de marcha/baião, estocadas da perseguição
FOLE = {c: [(_junta([BAIXO_SANFONA[c]] + _tri(c)), 2)] for c in TRIADE}
FOLE3 = {c: [(_junta([BAIXO_SANFONA[c]] + _tri(c)), 3)] for c in TRIADE}
BAIXO_ACORDE = {c: [(BAIXO_SANFONA[c], 0.75), ("R", 0.25), (_junta(_tri(c)), 0.5), ("R", 0.5)] for c in TRIADE}
ESTOCADA = {c: [(_junta(_tri(c)), 0.25), ("R", 0.5), (_junta(_tri(c)), 0.25), ("R", 1.0)] for c in TRIADE}


def _ponteio(cifras, tabela):
    """Cifras (uma por compasso, separadas por espaço) → melodia, pela tabela (PONTEIO, RASQUEADO, FOLE...)."""
    return [nota for c in cifras.split() for nota in tabela[c]]


def _com_din(melodia, din):
    return [(n, d, din) for n, d, *_ in melodia]


# ================================================================ fórmulas de percussão

# "Fala do mestre": cada golpe tem uma sílaba e a fórmula se lê em voz alta. A ideia (a percussão que pontua
# o gesto do boneco) vem do teatro de sombras; o som é do Brasil: maracatu, banda de couro, bumba-meu-boi, forró.
SILABAS = {
    "TUM": (("alfaia", 1.0), ("surdo", 0.7), ("prato", 0.55)),   # golpe pleno: tudo junto
    "TÁ": (("gongue", 0.8), ("caixa", 0.3)),                     # golpe leve, metálico (gonguê do maracatu)
    "TLIM": (("triangulo", 0.8),),
    "TCHI": (("prato_abafado", 0.7), ("caxixi", 0.4)),
    "PÁ": (("matraca", 1.0),),                                   # matraca de bumba-meu-boi: a que acelera
    "DÁ": (("caixa", 0.8),),
    "DUM": (("surdo", 1.0),),
    "BUM": (("zabumba", 1.0), ("alfaia", 0.6)),
    "BÃO": (("surdo", 1.0), ("prato", 0.45)),                    # pontuação grave que fica ressoando
    "TCHÁ": (("prato", 1.0),),
    "TIQUI": (("agogo_agudo", 0.8),), "TOCO": (("agogo_grave", 0.8),),
    "XI": (("caxixi", 0.8),), "CHUA": (("maraca", 0.8),), "CHUVA": (("pau_de_chuva", 0.8),),
    "DOIM": (("berimbau", 0.9),), "DIM": (("berimbau_preso", 0.9),), "ZUM": (("berimbau_zum", 0.8),),
    "UÍ": (("cuica", 0.9),),                                     # gemido da cuíca: a voz do Curupira
    "UÔ": (("rabeca_glissando", 0.8),),                          # rabeca escorregando para o grave
}
SILABAS["GÃO"], SILABAS["TI"] = SILABAS["BÃO"], SILABAS["TLIM"]   # nomes da versão 1 (compatibilidade)


def acel(t0, n, de, ate, silaba="PÁ", i0=0.5, i1=0.9):
    """n golpes cujo intervalo vai de `de` a `ate` segundos (progressão geométrica): a matraca que acelera
    (de > ate) ou que se desfaz (de < ate). Intensidade em rampa de i0 a i1."""
    r = (ate / de) ** (1 / max(1, n - 2))
    out, t, d = [], t0, de
    for k in range(n):
        out.append((round(t, 4), silaba, round(i0 + (i1 - i0) * k / max(1, n - 1), 3)))
        t, d = t + d, d * r
    return out


def rufo(t0, dur, i0=0.3, i1=0.9, silaba="DÁ", passo=0.045):
    """Rufo (rrrum) de caixa em crescendo/decrescendo."""
    n = max(2, round(dur / passo))
    return [(round(t0 + k * passo, 4), silaba, round(i0 + (i1 - i0) * k / (n - 1), 3)) for k in range(n)]


def formula(nome_f, origem, funcao, fala, batida, seq, melodia=None):
    """seq: [(s, sílaba ou instrumento, intensidade)] → eventos [(s, instrumento, intensidade)].
    melodia (opcional): dict(t=s, instrumento=..., bpm=..., melodia=[...]) tocada junto da fórmula."""
    ev = sorted((round(t, 4), inst, round(min(1.0, i * peso), 3))
                for t, s, i in seq for inst, peso in SILABAS.get(s, ((s, 1.0),)))
    return dict(nome=nome_f, origem=origem, funcao=funcao, fala=fala, batida=batida, eventos=ev,
                dur=ev[-1][0], melodia=melodia)


def _baque_virado(compassos=8, bpm0=120, bpm1=176):
    """Baque virado de maracatu acelerando de bpm0 a bpm1 (alfaias, caixa, gonguê, matraca, ganzá),
    prato de banda a cada 2 compassos; fecha com rufo + TUM + BÃO."""
    total = compassos * 2
    grades = {"alfaia": "X..x..x.", "caixa": "Xxxx", "gongue": "X.x.x.x.", "matraca": "x.xx",
              "ganza": "xxxx", "prato": "X..............."}
    seq = [(t, inst, i) for inst, g in grades.items() for t, i in golpes_grade(g, total, bpm0, "f", bpm1)]
    fim = segundos(total, bpm0, bpm1, total)
    seq += rufo(fim, 0.5, 0.4, 1.0) + [(fim + 0.55, "TUM", 1.0), (fim + 0.55, "BÃO", 0.9)]
    return seq, round(fim + 0.55, 4)


_BV, _BV_BATIDA = _baque_virado()
_AA = acel(1.2, 12, 0.4, 0.05, "PÁ", 0.3, 0.9)          # a matraca que acelera no Abre-alas
_AA_T = round(_AA[-1][0] + 0.05 + 0.6 + 0.04, 4)       # depois do rufo de 0,6 s
_AC = acel(0.0, 12, 0.4, 0.05, "PÁ", 0.3, 0.9)
_AC_T = round(_AC[-1][0] + 0.12, 4)

# chamada da transição de capítulo: rabeca em Ré mixolídio (o Dó natural é a cor da mata), 80 bpm
CHAMADA = [("A4", 0.25), ("D5", 1.25, "f"), ("C5", 0.25), ("D5", 0.25), ("A4", 1.0), ("B4", 0.5), ("C5", 0.5),
           ("B4", 0.5), ("A4", 0.5), ("D5", 2.0, "f")]
# cantiga do Curupira ("Vou andando…"): mesmo ritmo da versão 1, agora na escala nordestina (Ré lídio com 7ª
# menor): o Sol# é o pé virado. Serve de "chamado" (rabeca, viola ou voz).
CANTIGA_1 = [("A4", 1), ("C5", 0.5), ("B4", 0.5), ("A4", 0.5), ("G#4", 0.5), ("F#4", 0.5), ("G#4", 0.5), ("A4", 2)]
# aboio de berrante (caçadores): nota longa que cai no fim
ABOIO_BERRANTE = [("D4", 3.0, "f")]

FORMULAS = {
    "entrada": formula(
        "Quatro Pancadas", "rufo de caixa + baque de maracatu", "entrada de personagem que termina em pose",
        "rrrum pá-dá | TUM tchi | TÁ tchi | TUM!", 3.1,
        rufo(0.0, 0.5, 0.2, 0.7) + [(0.5, "PÁ", 0.8), (0.75, "DÁ", 0.9), (1.0, "TUM", 1.0), (1.5, "TCHI", 0.7),
                                    (2.0, "TÁ", 0.8), (2.5, "TCHI", 0.7), (3.1, "TUM", 1.0)]),
    "entrada_curupira": formula(
        "Chegada do Curupira", "matraca que acelera + cuíca, agogô, caxixi e berimbau",
        "entrada do Curupira: leve, rápida, misteriosa",
        "pá-pá-pápápápá | UÍ xi | tiqui-toco xi | DOIM-dim … uí", 2.8,
        acel(0.0, 7, 0.22, 0.07, "PÁ", 0.3, 0.7)
        + [(1.0, "UÍ", 0.8), (1.0, "CHUA", 0.5), (1.4, "XI", 0.6), (1.75, "TIQUI", 0.7), (1.95, "TOCO", 0.7),
           (2.35, "XI", 0.5), (2.8, "DOIM", 1.0), (2.8, "TÁ", 0.5), (3.05, "DIM", 0.6), (3.4, "UÍ", 0.5)]),
    "entrada_cacadores": formula(
        "Chegada dos Caçadores", "surdo e zabumba de banda de couro + berrante", "entrada dos caçadores: pesada",
        "DUM · DUM · BUM-BUM | TUM tchi | TUM tchi | TUM! + berrante", 3.4,
        [(0.0, "DUM", 0.9), (0.667, "DUM", 0.9), (1.333, "BUM", 0.8), (1.5, "BUM", 0.9), (2.0, "TUM", 1.0),
         (2.333, "TCHI", 0.6), (2.667, "TUM", 0.9), (3.0, "TCHI", 0.6), (3.4, "TUM", 1.0), (3.4, "BÃO", 0.8)],
        melodia=dict(t=3.5, instrumento="berrante", bpm=90, melodia=ABOIO_BERRANTE)),
    "pose": formula(
        "Parada", "a 'parada' do maracatu: a matraca acelera e tudo para no golpe", "pose / revelação forte",
        "pá  pá  pá pá pápápápá | TUM! — (silêncio) … tlim", 1.2,
        acel(0.0, 9, 0.28, 0.05, "PÁ", 0.35, 0.95) + [(1.2, "TUM", 1.0), (2.9, "TLIM", 0.35)]),
    "revelacao": formula(
        "Clarão", "pau-de-chuva, surdo pp e o gemido da cuíca", "revelação misteriosa (algo aparece na mata)",
        "(chuva)… dum… UÍ-doim … tlim", 1.6,
        [(0.0, "CHUVA", 0.6), (0.0, "DUM", 0.3), (1.6, "UÍ", 0.7), (1.6, "DOIM", 0.6), (2.2, "TLIM", 0.25)]),
    "susto": formula(
        "Espanto", "zabumba, caixa e o golpe pleno", "susto, aparição súbita", "BUM-dá-TCHÃ!", 0.22,
        [(0.0, "BUM", 1.0), (0.11, "DÁ", 0.85), (0.22, "TUM", 1.0), (0.22, "TCHÁ", 0.9)]),
    "golpe": formula(
        "Pancada", "matraca, caixa e o golpe pleno", "golpe único (machado, pancada no tronco)", "pá-dá-TUM!", 0.24,
        [(0.0, "PÁ", 0.8), (0.12, "DÁ", 0.9), (0.24, "TUM", 1.0)]),
    "queda": formula(
        "Três Pancadas e Tombo", "golpes, cambaleio de agogô e caxixi, tombo", "golpes, cambaleio e queda",
        "TUM · TUM · TUM | tiqui xi … toco xi | BUM-dá-TCHÃ — bão", 3.1,
        [(0.0, "TUM", 0.9), (0.45, "TUM", 0.95), (0.8, "TUM", 1.0), (1.4, "TIQUI", 0.4), (1.65, "XI", 0.35),
         (2.05, "TOCO", 0.35), (2.3, "XI", 0.3), (2.9, "BUM", 1.0), (3.0, "DÁ", 0.8), (3.1, "TUM", 1.0),
         (3.1, "BÃO", 0.9)]),
    "perseguicao": formula(
        "Baque Virado", "maracatu de baque virado acelerando + matracas", "correria/perseguição acelerando até a parada",
        "TUM . . tum . . tum . (acelerando 120→176) | rrrum TUM!", _BV_BATIDA, _BV),
    "travessura": formula(
        "Traquinagem", "agogô, cuíca, berimbau e a matraca que se desfaz (risadinha)", "travessura, logro, piada",
        "tiqui-toco · UÍ · xi · DOIM-dim-doim · pápápápá · tá!", 1.32,
        [(0.0, "TIQUI", 0.6), (0.22, "TOCO", 0.5), (0.66, "UÍ", 0.6), (1.1, "XI", 0.5),
         (1.32, "DOIM", 0.8), (1.54, "DIM", 0.7), (1.76, "DOIM", 0.6)]
        + acel(2.1, 6, 0.09, 0.13, "PÁ", 0.7, 0.3) + [(3.0, "TÁ", 0.8)]),
    "fim_de_cena": formula(
        "Arremate", "desacelera e assenta no surdo", "fim de cena",
        "pá-dá-TUM · tchi-TUM · tchi-TUM · tá … TUM — bão", 3.3,
        [(0.0, "PÁ", 0.7), (0.18, "DÁ", 0.8), (0.36, "TUM", 0.9), (0.8, "TCHI", 0.6), (1.0, "TUM", 0.85),
         (1.55, "TCHI", 0.5), (1.8, "TUM", 0.8), (2.5, "TÁ", 0.5), (3.3, "TUM", 0.9), (3.3, "BÃO", 0.8)]),
    "saida": formula(
        "Saída", "agogô e caxixi sumindo", "personagem sai de cena / some na mata",
        "tiqui xi tiqui xi tiqui… (sumindo)", 0.0,
        [(round(k * 0.3, 2), "TIQUI" if k % 2 == 0 else "XI", round(0.6 * 0.78 ** k, 3)) for k in range(8)]),
    "transicao": formula(
        "Abre-alas", "matraca de bumba-meu-boi acelerando + rufo + chamada de rabeca", "transição de capítulo",
        "BÃO … (chuva) … pá . pá . pápápápá rrrum TUM! + chamada da rabeca", _AA_T,
        [(0.0, "BÃO", 0.6), (0.4, "CHUVA", 0.6)] + _AA + rufo(_AA[-1][0] + 0.05, 0.6, 0.3, 0.9)
        + [(_AA_T, "TUM", 1.0), (_AA_T, "BÃO", 0.9)],
        melodia=dict(t=_AA_T, instrumento="rabeca", bpm=80, melodia=CHAMADA)),
    "suspense": formula(
        "Arrepio", "berimbau com o dobrão encostado (zum), pau-de-chuva, surdo distante", "suspense, perigo rondando",
        "zum … zum … dum … zum … dum-dum", 0.0,
        [(round(0.42 * k + 0.07 * (k % 3), 2), "ZUM", round(0.15 + 0.35 * math.sin(math.pi * (k + 1) / 11), 3))
         for k in range(10)]
        + [(0.0, "CHUVA", 0.5), (0.5, "DUM", 0.5), (2.6, "DUM", 0.4), (3.0, "DUM", 0.55)]),
    # ---- as etiquetas musicais antigas do roteiro, agora por FUNÇÃO (ver ETIQUETAS_ANTIGAS)
    "pontuacao": formula(
        "Bão", "surdo + zabumba + prato de banda ressoando", "pontuação grave (antigo gongo_grave)",
        "BÃO", 0.0, [(0.0, "BÃO", 1.0), (0.0, "BUM", 0.5)]),
    "sobe": formula(
        "Subida", "rufo de caixa crescendo até o gemido da cuíca", "subida, clarão, relâmpago (antigo gongo_sobe)",
        "rrrrrum UÍ!", 0.8, rufo(0.0, 0.8, 0.15, 0.8) + [(0.8, "UÍ", 0.9), (0.8, "TÁ", 0.7)]),
    "desce": formula(
        "Descida", "rabeca escorregando para o grave sobre o surdo", "descida, algo afunda (antigo gongo_desce)",
        "uôôô … BÃO", 1.2, [(0.0, "UÔ", 0.9), (0.0, "DÁ", 0.4), (1.2, "BÃO", 0.8)]),
    "golpe_seco": formula(
        "Estalo", "matraca + caixa", "golpe seco de madeira (antigo bloco_madeira)", "PÁ!", 0.0,
        [(0.0, "PÁ", 1.0), (0.0, "DÁ", 0.4)]),
    "acelerando": formula(
        "Acelerando", "matraca de bumba-meu-boi", "acelerando até o golpe (antigo bloco_acelera)",
        "pá . pá . pá pápápápápá TUM!", _AC_T, _AC + [(_AC_T, "TUM", 1.0)]),
    "chamado": formula(
        "Chamado", "a cantiga do Curupira na rabeca, sobre o berimbau", "chamado na mata (antigo flauta_chamado)",
        "doim + 'Vou andando…' (rabeca)", 0.0, [(0.0, "DOIM", 0.5), (0.0, "CHUVA", 0.3)],
        melodia=dict(t=0.1, instrumento="rabeca", bpm=80, melodia=CANTIGA_1)),
}

# etiqueta musical antiga do roteiro → (fórmula que a substitui, o que ela é agora)
ETIQUETAS_ANTIGAS = {
    "gongo_grave": ("pontuacao", "pontuação grave: surdo + zabumba + prato de banda (BÃO)"),
    "gongo_sobe": ("sobe", "subida: rufo de caixa crescendo até o 'uí' da cuíca + gonguê"),
    "gongo_desce": ("desce", "descida: glissando grave de rabeca + surdo"),
    "bloco_madeira": ("golpe_seco", "golpe seco: matraca de bumba-meu-boi + caixa"),
    "bloco_acelera": ("acelerando", "acelerando: matraca até o TUM"),
    "flauta_chamado": ("chamado", "chamado: a cantiga do Curupira na rabeca (ou viola), sobre berimbau"),
}

# ================================================================ temas

# --- Tema da Mata: toada/baião-toada em Ré mixolídio (o Dó natural é a cor), rabeca cantando com ornamentos
#     (apojaturas curtas de 1/8 de tempo), viola em ponteio, sanfona respirando, 16 compassos 2/4
MATA_RABECA = [
    # a
    ("B4", 0.125), ("A4", 0.625), ("G4", 0.25), ("F#4", 0.5), ("G4", 0.5),
    ("A4", 0.5), ("B4", 0.25), ("C5", 0.25), ("B4", 0.5), ("A4", 0.5),
    ("G4", 0.5), ("F#4", 0.25), ("E4", 0.25), ("F#4", 0.5), ("D4", 0.5),
    ("F#4", 0.125), ("E4", 1.375), ("R", 0.5),
    # a'
    ("B4", 0.125), ("A4", 0.625), ("G4", 0.25), ("F#4", 0.5), ("G4", 0.5),
    ("A4", 0.5), ("B4", 0.25), ("C5", 0.25), ("D5", 0.5), ("C5", 0.5),
    ("B4", 0.5), ("A4", 0.25), ("G4", 0.25), ("F#4", 0.5), ("E4", 0.5),
    ("D4", 1.5), ("R", 0.5),
    # b (abre para o agudo)
    ("E5", 0.125), ("D5", 0.625, "f"), ("C5", 0.25), ("B4", 0.5), ("C5", 0.5),
    ("D5", 0.5), ("E5", 0.25), ("F#5", 0.25), ("E5", 0.5), ("D5", 0.5),
    ("D5", 0.125), ("C5", 0.625), ("B4", 0.25), ("A4", 0.5), ("B4", 0.5),
    ("C5", 1.0, "f"), ("A4", 1.0),
    # a''
    ("B4", 0.125), ("A4", 0.625), ("G4", 0.25), ("F#4", 0.5), ("G4", 0.5),
    ("A4", 0.5), ("B4", 0.25), ("C5", 0.25), ("B4", 0.5), ("A4", 0.5),
    ("G4", 0.5), ("F#4", 0.25), ("E4", 0.25), ("G4", 0.5), ("E4", 0.5),
    ("D4", 2.0),
]
MATA_CIFRA = "D C G Am D C G D G D C Am D C G D"
# segunda voz da viola em terças (a dupla caipira), entra no compasso 9
MATA_SEGUNDA = [("R", 16)] + transpor(trecho(MATA_RABECA, 16, 30), graus=-2) + [("A3", 2.0)]
MATA_PIFANO = MATA_RABECA   # nome da versão 1 (compatibilidade); agora é a melodia da rabeca

# --- Tema do Curupira: viola na escala nordestina (Ré lídio com 7ª menor: Ré Mi Fá# SOL# Lá Si Dó); o Sol#
#     (4ª aumentada, o trítono) é o pé virado. Pegada sempre seguida do retrógrado (pegadas ao contrário).
CURU_X = [("A4", 0.25), ("C5", 0.25), ("B4", 0.25), ("G#4", 0.25), ("A4", 0.5), ("R", 0.5)]   # a pegada
CURU_Y = transpor(CURU_X, graus=3, escala=NORDESTINA)                                       # Ré Fá# Mi Dó Ré
CURU_DESCIDA = [("C5", 0.25), ("B4", 0.25), ("A4", 0.25), ("G#4", 0.25), ("F#4", 0.25), ("E4", 0.25), ("D4", 0.5)]
CURU_FECHO = [("D4", 0.25, "p"), ("R", 0.25), ("A4", 0.25, "p"), ("D5", 0.25, "f"), ("R", 1.0)]
CURU_RISADA = [("D6", 0.25, "f"), ("C6", 0.25), ("A5", 0.25), ("G#5", 0.25), ("A5", 0.25), ("G#5", 0.25),
               ("F#5", 0.25), ("D5", 0.25)]
CURU_LOGRO = [("D5", 0.5), ("G#4", 0.5), ("A4", 1.0)]
CURU_VIOLA = (CURU_X + retrogrado(CURU_X) + CURU_Y + retrogrado(CURU_Y) + CURU_X + retrogrado(CURU_X)
              + CURU_DESCIDA + CURU_FECHO
              + CURU_Y + retrogrado(CURU_Y) + [("R", 4)] + CURU_X + retrogrado(CURU_X) + CURU_DESCIDA + CURU_FECHO)
CURU_RABECA_RISO = [("R", 20)] + CURU_RISADA + CURU_LOGRO + [("R", 8)]
# cuíca: "uí" curto no contratempo e gemidos longos; a nota é o alvo do gemido
CURU_CUICA = [("R", 1.5), ("A3", 0.5), ("D4", 1.0), ("R", 1.0),
              ("R", 1.5), ("A3", 0.25), ("C4", 0.25), ("G#3", 1.5), ("R", 0.5)] * 4
CURU_RABECA = CURU_VIOLA    # nome da versão 1 (compatibilidade); agora a pegada é da viola

# --- Caçadores: marcha pesada em Ré menor de modinha (eólio, com o Dó# da dominante), 2/4
CACA_A = [
    ("D4", 0.75), ("D4", 0.25), ("D4", 0.5), ("E4", 0.5),
    ("F4", 1.0), ("E4", 0.5), ("D4", 0.5),
    ("C4", 0.75), ("C4", 0.25), ("C4", 0.5), ("D4", 0.5),
    ("Bb3", 1.0), ("A3", 0.5), ("G3", 0.5),
    ("D4", 0.75), ("D4", 0.25), ("F4", 0.5), ("G4", 0.5),
    ("A4", 1.0, "f"), ("Bb4", 0.5, "f"), ("A4", 0.5),
    ("G4", 0.5), ("F4", 0.5), ("E4", 0.5), ("C#4", 0.5),
    ("D4", 1.5), ("R", 0.5),
]
CACA_CIFRA = "Dm Dm C Gm Dm Dm A7 Dm"
CACA_BERRANTE = [("D4", 3.5, "f"), ("R", 0.5), ("R", 4), ("A3", 1.5), ("D4", 2.0), ("R", 0.5), ("R", 4)]
# aboio (tempo largo, sem palavras) na rabeca: notas longas que caem no fim, como o canto do vaqueiro
CACA_ABOIO = [("R", 4), ("A4", 3, "mf"), ("Bb4", 0.5), ("A4", 0.5), ("G4", 1), ("F4", 1), ("E4", 2), ("D4", 4, "p"),
              ("R", 4), ("D4", 1, "mp"), ("F4", 1), ("A4", 4, "mf"), ("G4", 1), ("E4", 1), ("D4", 4, "p")]


# --- Perseguição: rabeca em semicolcheias (Ré dórico) com a célula do pé virado, sanfona em estocadas
def _semis(seq):
    return [(n, 0.25, "f" if i % 4 == 0 else "mf") for i, n in enumerate(seq.split())]


PERS = {
    "A": "D5 E5 F5 G5 A5 G5 F5 E5", "B": "D5 E5 F5 A5 B5 A5 G5 F5",
    "C": "A5 B5 C6 D6 C6 B5 A5 G5", "D": "D5 G#4 A4 D5 G#4 A4 D5 R",
}
PERS_RABECA = [e for c in "ABABCCBDCD" for e in _semis(PERS[c])] + [("D6", 0.5, "ff"), ("R", 1.5), ("R", 2.0)]
PERS_SANFONA = (_ponteio("Dm Dm C Dm Dm Dm C A7 C A7", ESTOCADA)
                + [("D3+D4+F4+A4", 0.5, "ff"), ("R", 1.5), ("R", 2.0)])

# --- Noite e Tempestade: sanfona arrastada (acordes longos que mal se movem) + rabeca grave em glissandos
NOITE_FOLE = [("D3+A3", 8, "pp"), ("D3+F4+A4", 8, "p"), ("Bb2+D4+F4", 8, "pp"), ("A2+C#4+E4", 6, "p"), ("R", 2)]
NOITE_ABOIO = [("R", 4), ("A4", 3, "p"), ("Bb4", 1, "mp"), ("A4", 2, "p"), ("G4", 1, "p"), ("E4", 1, "p"),
               ("D4", 4, "pp"), ("R", 4),
               ("D4", 2, "mp"), ("F4", 1, "mp"), ("E4", 1, "p"), ("G4", 2, "mp"), ("A4", 2, "mf"),
               ("C5", 1, "mf"), ("Bb4", 1, "mp"), ("A4", 2, "p")]

# --- Lembrança da Vó: modinha/acalanto em Ré menor (Dó# da dominante, sextas e suspiros), 3/4, viola sozinha
VO_VIOLA = [("A4", 2), ("F4", 1),
            ("E4", 1), ("F4", 0.5), ("G4", 0.5), ("A4", 1),
            ("D5", 2), ("C5", 1),
            ("Bb4", 1.5), ("A4", 0.5), ("G4", 1),
            ("A4", 1), ("F4", 1), ("D4", 1),
            ("E4", 1), ("G4", 1), ("C#5", 1),
            ("D5", 2), ("A4", 1),
            ("Bb4", 1), ("A4", 0.5), ("G4", 0.5), ("F4", 1),
            ("A4", 1.5), ("G4", 0.5), ("F4", 1),
            ("E4", 1), ("G4", 1), ("F4", 0.5), ("E4", 0.5),
            ("F4", 1), ("E4", 1), ("C#4", 1),
            ("D4", 3, "pp")]
VO_CIFRA = "Dm A7 Dm Gm Dm A7 Dm Gm Dm A7 A7 Dm"
VO_FLAUTA = VO_VIOLA        # nome da versão 1 (compatibilidade); agora a melodia é da viola

# --- Final: o Tema da Mata em baião/toada luminosa com o conjunto pleno. A sanfona canta em terças por cima
#     da rabeca; nos compassos 13–14 a pegada do Curupira entra DENTRO do tema: o Sol# soa sobre o Ré maior,
#     a mata o acolhe.
FINAL_CIFRA = "D C G Am D C G D G D C Am D D G D"
_PEGADA = CURU_X + retrogrado(CURU_X)
FINAL_RABECA = trecho(MATA_RABECA, 0, 24) + _PEGADA + trecho(MATA_RABECA, 28, 32)
FINAL_SANFONA = (transpor(trecho(MATA_RABECA, 0, 24), graus=2) + transpor(_PEGADA, graus=2, escala=NORDESTINA)
                 + transpor(trecho(MATA_RABECA, 28, 32), graus=2))

TEMAS = {
    "mata": dict(
        nome="Tema da Mata", bpm=80, compasso="2/4", tonica="D", escala=MIXOLIDIO,
        modo="Ré mixolídio (Dó natural) — toada/baião-toada",
        carater="luminoso e respirado, a mata viva: rabeca cantando a toada com apojaturas, viola em ponteio "
                "(e a segunda voz em terças a partir do compasso 9), sanfona sustentando, zabumba e triângulo leves",
        quando="abertura, a mata de dia, volta da paz; fragmento como vinheta de paisagem",
        partes={
            "rabeca": dict(instrumento="rabeca", din="mf", melodia=MATA_RABECA),
            "segunda": dict(instrumento="viola", din="mp", melodia=MATA_SEGUNDA),
            "viola": dict(instrumento="viola", din="mp", melodia=_ponteio(MATA_CIFRA, PONTEIO)),
            "sanfona": dict(instrumento="sanfona", din="p", melodia=_ponteio(MATA_CIFRA, FOLE)),
            "zabumba": dict(instrumento="zabumba", din="p", grade="X..x....X......."),
            "bacalhau": dict(instrumento="bacalhau", din="p", grade="....x..x....x..x"),
            "triangulo": dict(instrumento="triangulo", din="p", grade="xoXoxoXo"),
        },
        variacoes={"sussurrada": dict(partes=["viola", "sanfona"], ganho=0.45), "fragmento": dict(compassos=4)},
    ),
    "curupira": dict(
        nome="Tema do Curupira", bpm=120, compasso="2/4", tonica="D", escala=NORDESTINA,
        modo="Ré 'nordestina' (lídio com 7ª menor): o Sol# é o trítono do pé virado",
        carater="misterioso e travesso: a pegada na viola (Lá-Dó-Si-Sol#-Lá) sempre seguida do retrógrado, "
                "a cuíca gemendo no contratempo, berimbau, maracá; a rabeca só aparece para a risada",
        quando="presença/aparição do Curupira, logro dos caçadores; 'rastro' quando seguem as pegadas invertidas",
        partes={
            "viola": dict(instrumento="viola", din="mf", melodia=CURU_VIOLA),
            "cuica": dict(instrumento="cuica", din="mp", melodia=CURU_CUICA),
            "rabeca": dict(instrumento="rabeca", din="mf", melodia=CURU_RABECA_RISO),
            "berimbau": dict(instrumento="berimbau", din="mf", grade="......X.......X."),
            "berimbau_preso": dict(instrumento="berimbau_preso", din="mp", grade="....x.......x..."),
            "caxixi": dict(instrumento="caxixi", din="mp", grade="x.x.....x.x....."),
            "maraca": dict(instrumento="maraca", din="mp", grade="xoxoxoxo"),
            "zabumba": dict(instrumento="zabumba", din="p", grade="X..............."),
        },
        variacoes={"sussurrada": dict(partes=["cuica", "berimbau", "berimbau_preso", "caxixi"], ganho=0.4),
                   "fragmento": dict(compassos=2),
                   "rastro": dict(retrogrado=True)},
    ),
    "cacadores": dict(
        nome="Tema dos Caçadores", bpm=90, compasso="2/4", tonica="D", escala=EOLIO,
        modo="Ré menor de modinha (eólio, com Dó# na dominante Lá7)",
        carater="marcha pesada de gente de fora: zabumba, caixa e prato de banda marciais, rabeca grave, "
                "berrante chamando; sanfona em baixo-acorde e alfaias entram na segunda metade",
        quando="caçadores entrando na mata, caçada, ameaça; sussurrada = a marcha chegando de longe; "
               "aboio = berrante e rabeca em tempo largo (espera, tocaia)",
        partes={
            "rabeca": dict(instrumento="rabeca", din="mf", melodia=CACA_A + CACA_A),
            "sanfona": dict(instrumento="sanfona", din="mf", melodia=[("R", 16)] + _ponteio(CACA_CIFRA, BAIXO_ACORDE)),
            "berrante": dict(instrumento="berrante", din="f", melodia=CACA_BERRANTE + CACA_BERRANTE),
            "zabumba": dict(instrumento="zabumba", din="f", grade="X...x...X...x.x."),
            "bacalhau": dict(instrumento="bacalhau", din="mf", grade="..x...x...x...x."),
            "caixa": dict(instrumento="caixa", din="mp", grade="x.xx.xx.x.xx.xx."),
            "prato": dict(instrumento="prato_abafado", din="mp", grade="X......."),
            "alfaia": dict(instrumento="alfaia", din="f", grade="." * 64 + "X.....x.X.....x." * 4),
        },
        variacoes={"sussurrada": dict(partes=["zabumba", "bacalhau", "berrante"], ganho=0.5),
                   "fragmento": dict(compassos=4),
                   "aboio": dict(partes=["berrante"], ganho=0.7, extra={
                       "aboio": dict(instrumento="rabeca", din="mp", melodia=CACA_ABOIO)})},
    ),
    "perseguicao": dict(
        nome="Perseguição", bpm=120, bpm_fim=168, compasso="2/4", tonica="D", escala=DORICO,
        modo="Ré dórico + a célula do pé virado (Ré-Sol#-Lá)",
        carater="baque virado de maracatu acelerando: alfaias, caixa, gonguê, matracas, ganzá; rabeca em "
                "moto-perpétuo e sanfona em estocadas; termina numa parada seca",
        quando="correria, perseguição, caçadores perdidos e girando em círculo",
        partes={
            "rabeca": dict(instrumento="rabeca", din="mf", melodia=PERS_RABECA),
            "sanfona": dict(instrumento="sanfona", din="f", melodia=PERS_SANFONA),
            "alfaia": dict(instrumento="alfaia", din="f", grade="X..x..x.x.x.X..." * 5 + "X" + "." * 31),
            "caixa": dict(instrumento="caixa", din="mf", grade="XxxXxxXxXxxXxxXx" * 5 + "X" + "." * 31),
            "gongue": dict(instrumento="gongue", din="mp", grade="X.x.x.x.X.x.x..x" * 5 + "." * 32),
            "matraca": dict(instrumento="matraca", din="mp", grade="X.x.x.x.X.x.x.x." * 5 + "X" + "." * 31),
            "ganza": dict(instrumento="ganza", din="mp", grade="xxxxxxxxxxxxxxxx" * 5 + "." * 32),
            "prato": dict(instrumento="prato", din="mp", grade="X..............." * 5 + "X" + "." * 31),
        },
        variacoes={"sussurrada": dict(partes=["alfaia", "ganza", "matraca"], ganho=0.5),
                   "fragmento": dict(compassos=4, bpm_fim=132)},
    ),
    "noite": dict(
        nome="Noite e Tempestade", bpm=60, compasso="4/4", tonica="D", escala=EOLIO,
        modo="Ré eólio em tempo livre (Si bemol, Dó# só no acorde de Lá)",
        carater="sanfona arrastada em acordes longos que mal se movem, rabeca grave escorregando entre as notas, "
                "surdo distante, berimbau zumbindo, muito silêncio; cheia = tempestade (alfaias rufando, prato)",
        quando="noite na mata, medo, solidão (sussurrada); fúria da mata (cheia)",
        partes={
            "fole": dict(instrumento="sanfona", din="pp", melodia=NOITE_FOLE),
            "aboio": dict(instrumento="rabeca", din="p", melodia=NOITE_ABOIO),
            "surdo": dict(instrumento="surdo", din="mp", eventos=[(0, 0.5), (6.5, 0.35), (7, 0.5), (15, 0.4),
                                                                  (22.5, 0.35), (23, 0.55), (30, 0.45)]),
            "zum": dict(instrumento="berimbau_zum", din="p", eventos=[(0, 0.3), (16, 0.4)]),
            "chuva": dict(instrumento="pau_de_chuva", din="p", eventos=[(8, 0.5), (24, 0.5)]),
            "alfaia": dict(instrumento="alfaia", din="mf",
                           eventos=[(12 + k * 0.125, 0.15 + 0.5 * k / 15) for k in range(16)]
                           + [(26 + k * 0.125, 0.2 + 0.7 * k / 23) for k in range(24)] + [(29.25, 1.0)]),
            "prato": dict(instrumento="prato", din="mf", eventos=[(14, 0.5), (29.25, 0.8)]),
        },
        variacoes={"sussurrada": dict(partes=["fole", "aboio", "surdo", "chuva"], ganho=0.5),
                   "fragmento": dict(compassos=2, partes=["fole", "aboio", "surdo", "zum"])},
    ),
    "vo": dict(
        nome="Lembrança da Vó", bpm=60, compasso="3/4", tonica="D", escala=EOLIO,
        modo="Ré menor de modinha (Dó# da dominante) — a mesma tônica da 'casa', em menor",
        carater="acalanto/modinha íntima: a viola canta e se acompanha (ponteio grave), sem percussão; "
                "a sanfona respira bem baixinho na segunda metade",
        quando="conselhos da avó benzedeira, memória, respeito à mata; sussurrada sob a narração",
        partes={
            "viola": dict(instrumento="viola", din="mp", melodia=VO_VIOLA),
            "ponteio": dict(instrumento="viola", din="p", melodia=_ponteio(VO_CIFRA, PONTEIO3)),
            "sanfona": dict(instrumento="sanfona", din="pp",
                            melodia=[("R", 18)] + _com_din(_ponteio("Dm Gm Dm A7 A7 Dm", FOLE3), "pp")),
        },
        variacoes={"sussurrada": dict(partes=["ponteio"], ganho=0.6), "fragmento": dict(compassos=4)},
    ),
    "final": dict(
        nome="Amanhecer / Final", bpm=112, compasso="2/4", tonica="D", escala=MIXOLIDIO,
        modo="Ré mixolídio; a pegada do Curupira (Sol#, escala nordestina) entra dentro do tema",
        carater="o Tema da Mata em baião luminoso com o conjunto pleno: rabeca na melodia, sanfona em terças por "
                "cima, viola em rasqueado, zabumba, triângulo e ganzá; a pegada do Curupira acolhida no fim",
        quando="amanhecer, desfecho, créditos; variação 'ciranda' (90 bpm) para o fecho em roda",
        partes={
            "rabeca": dict(instrumento="rabeca", din="f", melodia=FINAL_RABECA),
            "sanfona": dict(instrumento="sanfona", din="mf", melodia=FINAL_SANFONA),
            "viola": dict(instrumento="viola", din="mp", melodia=_ponteio(FINAL_CIFRA, RASQUEADO)),
            "zabumba": dict(instrumento="zabumba", din="f", grade="X..x....X..x...."),
            "bacalhau": dict(instrumento="bacalhau", din="mf", grade="....x..x....x..x"),
            "triangulo": dict(instrumento="triangulo", din="mf", grade="xoXoxoXo"),
            "ganza": dict(instrumento="ganza", din="mp", grade="x.x.x.x."),
        },
        variacoes={
            "sussurrada": dict(partes=["rabeca", "viola"], ganho=0.4),
            "fragmento": dict(compassos=4),
            "ciranda": dict(bpm=90, partes=["rabeca", "sanfona"], extra={
                "bumbo": dict(instrumento="zabumba", din="f", grade="X.......o......."),
                "ganza": dict(instrumento="ganza", din="mp", grade="x.x.x.x."),
                "caixa": dict(instrumento="caixa", din="p", grade="....x.......x..."),
                "viola": dict(instrumento="viola", din="mp", melodia=_ponteio(FINAL_CIFRA, PONTEIO)),
            }),
        },
    ),
}

# Paleta de andamentos (razões simples → modulações métricas limpas: 60→90, 80→120, 90→120, 120→160)
ANDAMENTOS = {"noite": 60, "vo": 60, "mata": 80, "cacadores": 90, "ciranda": 90, "final": 112, "curupira": 120,
              "perseguicao": "120→168 (fórmula Baque Virado: 120→176)"}

# compatibilidade com a versão 1
CHAMADA_PIFANO = CHAMADA


# ================================================================ conferência

def _conferir():
    assert freq("A4") == 440.0 and midi("C4") == 60 and nome(midi("Eb4")) == "Eb4"
    assert transpor_nota("A5", graus=-2) == "F#5" and transpor_nota("C6", graus=-2) == "A5"
    assert [n for n, *_ in CURU_Y] == ["D5", "F#5", "E5", "C5", "D5", "R"], CURU_Y
    assert segundos(16, 120, 176, 16) < segundos(16, 120) and abs(segundos(8, 90) - 16 / 3) < 1e-9
    usados = set()
    for k, tema in TEMAS.items():
        total, bar = tempos_tema(tema), tempos_compasso(tema)
        assert total % bar == 0, (k, total)
        for v in ["cheia", *tema.get("variacoes", {})]:
            vv = variacao(tema, v)
            for nome_p, p in vv["partes"].items():
                inst = p["instrumento"]
                usados.add(inst)
                if "melodia" in p:
                    d = duracao(p["melodia"])
                    assert abs(d - vv["total"]) < 1e-6, (k, v, nome_p, d)
                    lo, hi = (midi(n) for n in EXTENSAO[inst])
                    for n, *_ in p["melodia"]:
                        for x in ([] if n == "R" else n.split("+")):
                            assert lo <= midi(x) <= hi, (k, nome_p, x)
                else:
                    assert inst in PERCUSSAO, (k, nome_p, inst)
                    if "grade" in p:
                        assert set(p["grade"]) <= set(PESO) | {"."}, (k, nome_p)
            ns, gs = eventos(tema, v)
            assert (ns or gs) and all(0 < e[4] <= 1 for e in ns) and all(0 < e[2] <= 1 for e in gs), (k, v)
        # nada de pentatônica: a melodia principal de cada tema usa pelo menos 6 classes de altura
        principal = next(p["melodia"] for p in tema["partes"].values() if "melodia" in p)
        classes = {midi(x) % 12 for n, *_ in principal if n != "R" for x in n.split("+")}
        assert len(classes) >= 6, (k, "melodia pentatônica?", sorted(classes))
        # o Sol# é assinatura do Curupira: só no tema dele, na perseguição (célula do pé virado) e no final
        if k not in ("curupira", "perseguicao", "final"):
            assert all(midi(x) % 12 != 8 for p in tema["partes"].values() if "melodia" in p
                       for n, *_ in p["melodia"] if n != "R" for x in n.split("+")), (k, "Sol# fora do lugar")
    for k, f in FORMULAS.items():
        ts = [t for t, *_ in f["eventos"]]
        assert ts == sorted(ts) and ts[0] >= 0 and 0 <= f["batida"] <= f["dur"] + 1e-9, k
        assert all(inst in PERCUSSAO and 0 < i <= 1 for _, inst, i in f["eventos"]), k
        usados |= {inst for _, inst, _ in f["eventos"]}
        if f["melodia"]:
            usados.add(f["melodia"]["instrumento"])
    assert not usados & PROIBIDOS, usados & PROIBIDOS
    assert all(v[0] in FORMULAS for v in ETIQUETAS_ANTIGAS.values())
    print(f"ok: {len(TEMAS)} temas, {len(FORMULAS)} fórmulas, sem timbres proibidos, sem melodia pentatônica")


if __name__ == "__main__":
    _conferir()
    for k, t in TEMAS.items():
        print(f"{k:12s} {t['bpm']:>3} bpm {t['compasso']}  {tempos_tema(t) / tempos_compasso(t):>4.0f} compassos  "
              f"{segundos(tempos_tema(t), t['bpm'], t.get('bpm_fim'), tempos_tema(t)):5.1f} s  {t['modo']}")
    for k, f in FORMULAS.items():
        print(f"{k:18s} batida {f['batida']:5.2f} s  dur {f['dur']:5.2f} s  {f['fala']}")
