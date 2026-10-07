/* elenco-gente.js — Sombras.elenco: Zé e Vó, e as poses e gestos do elenco a pé (Tião, Zé, Vó, Curupira) (guia §6, §7, §10).
 * Depende de bonecos.js (rig e couro: mesmo acabamento). Tião e Curupira continuam definidos lá; aqui ganham objetos
 * de mão (escondidos por s = 0), âncoras, poses, gestos e o motor do elenco.
 *
 * INSTÂNCIAS (cada cena cria as suas e as põe em cena com c.boneco(b) ou palco.adicionar(b))
 *   const E = Sombras.elenco
 *   E.ze(op) · E.vo(op) · E.tiao(op) · E.curupira(op)     op como em bonecos.criar: {x, y, escala, dir, z, opacidade, a, s, o}
 *   E.preparar(b)          liga o motor do elenco num boneco criado por fora (Sombras.bonecos.tiao etc.)
 *   E.objeto(nome, op)     peça solta no mesmo couro, para pôr no chão ou voar: pena, fumo, novelo, banquinho (assento na
 *                          altura do sentar da Vó), chapeuZe, chapeuTiao, espingarda, canoPartido, coronhaPartida,
 *                          machado, facao, cipo
 *   E.rastro()             pegadas controladas pela timeline (sem tempo absoluto): r.por(tl, t, x, y, {dir, invertida,
 *                          lado, escala, dura}); numa cena com o kit, use c.rastros (o elenco aceita os dois)
 *
 * OBJETOS DE MÃO (b.pose.s: 1 mostra, 0 esconde; E.mostrar(tl, b, t, {fumoMao: 1}) troca na hora)
 *   Zé: facao, facaoCintura, chapeu, chapeuMao, topete (o: cabelo sem chapéu), novelo, cipo, fumoMao
 *   Vó: cachimbo (boca), cachimboMao, arruda, terco, novelo, fumoMao, dedoFrente (mão de dedo em riste; maoFrente some)
 *   Tião: espingarda, chapeu, chapeuMao, pena, penaChapeu, fumoMao   Curupira: machado, penaMao, penaOrelha, fumoMao,
 *   fumoCintura, novelo, cipoColar
 *
 * POSE = objeto que o GSAP interpola: {a: {peça: graus}, s: {peça: escala}, o: {peça: opacidade}, dy, rot, z, boca…}
 *   E.poses.ze.agachado …  poses nomeadas por personagem (listas no bloco POSES). Pose NOMEADA é completa: o que ela não cita
 *                          volta à pose de descanso (E.base). Pose em OBJETO é parcial. Campos de pose: 'peito' inclina só o
 *                          tronco (o quadril compensa), 'bacia' gira o quadril, maos: {Frente|Tras: [x, y] | 'âncora' |
 *                          {ancora, d: [dx, dy]} | {mundo: [X, Y]}} = IK de dois ossos até o pulso (px de repouso),
 *                          maoAng: {Frente: graus absolutos da mão; na arma/facão é o ângulo do objeto}.
 *   E.pose(tl, b, pose, t, dur=.5, ease='power2.inOut') → fim      E.seq(tl, b, t, [[pose, dur, ease, segura], …]) → fim
 *   E.set(b, pose)         aplica já (estado inicial, antes de montar a timeline)
 *   E.base(b, pose|null)   pose de descanso desta instância: 'semArma' (Tião sem espingarda), 'sentada' (Vó),
 *                          'semMachado' (Curupira). Gestos que largam/sentam trocam a base sozinhos.
 *   E.ponto(b, ancora)     posição no palco de uma âncora na última pose agendada (alvo entre bonecos)
 *                          Âncoras: boca nariz queixo topo testa chapeu peito ombro cintura costas joelho maoF maoT
 *                          (+ bornal no Tião, orelha no Curupira)
 *   E.ir(tl, b, {campo: valor}, t, dur, ease) · E.osc(tl, b, t, peça|campo, amp, período, n)   peças avulsas do mesmo jeito
 *
 * SEEK E O KIT: todo tween é fromTo (immediateRender: false) que parte do último valor AGENDADO. Numa cena com
 *   Sombras.kit.posse(tl, ctx), os tweens passam por Sombras.kit.anima e partem de Sombras.kit.valor: kit e elenco
 *   dividem o mesmo registro (K.caminhar anda o boneco do elenco com gestos.andar). Agende cada boneco em ordem
 *   cronológica e encadeie pelo instante que o gesto devolve; o kit acusa sobreposição na mesma propriedade.
 *
 * MOTOR (b.pose, números que o GSAP interpola; o motor transforma em movimento a cada quadro, função de t)
 *   marcha 0..1 e passo (fase, ciclos de 2 passos) = andar · respiro (1) · tremor 0..1 (±2 px a 18 Hz) · fala 0..1
 *   (cabeça acena) · enrolar 0..1 + giro (mãos girando) · balanco 0..1 (pés soltos, sentado) · fumaca (cachimbo da Vó:
 *   fio de fumaça + volutas; 2,4 = baforada) · apoio 0..1 (1: o ponto mais baixo do corpo — pé, joelho, assento, costas —
 *   pousa em y, então agachar, sentar e cair ficam no chão; 0: livre, para galho e salto) · andar {pernas, bracos,
 *   joelho, salto, inclinacao, cabeca}. Pêndulos pela gravidade: terço, pontas do lenço e barra da saia (Vó), cipó (Zé).
 *
 * GESTOS: E.gestos.nome(tl, boneco, t, opções) → instante em que termina. Opções comuns: segura (s no auge),
 *   volta ('neutra' | outra pose | false = fica), dur.
 *   todos:    andar {ate, dur, passos, modo: andar|correr|pontaDosPes|sonambulo|cansado|saltitar|calcanhar|ligeiro, noLugar,
 *             deCostas, rastro, invertida} · correr · virar · falar {dur} · tremer {dur, amp} · apontar · rir · comemorar ·
 *             recuar {dx, z, dur} (susto: desgruda da tela e treme) · agachar · levantar · lerRastro · cair {para: frente} ·
 *             subir {ate: [x, y]} / descer {ate} (sapopema) · encolher {tremor} · sentar {oco, galho} · tirarChapeu {para} ·
 *             porChapeu · maoNoOmbro {em} · agarrar {em} · tranco · pedir · oferecer {objeto} · cocar {onde: cabeca|barba} ·
 *             palmas {n} · deixar {objeto} (põe no chão) · olhar {para: cima|baixo|frente} · acenar {comprido}
 *   Tião:     mirar {agachado, alto} · atirar {desvio} (coice) · ombro · armaAoCeu · largar · remexerBornal (tira o fumo,
 *             tremendo) · pegarPena {em: [X, Y]} (apanha no ar e põe na fita) · penaNoChapeu {devolve}
 *   Zé:       golpear {impactos: [t…] | n} (facão, pose de impacto) · medir · cuspir · trofeu (pé no tronco) · arrancar (cipó) ·
 *             enrolar {dur, voltas, de, ate} (novelo cresce) · erguer (novelo contra a luz) · apontarQueixo · reverencia ·
 *             embainhar {tirar}
 *   Vó:       sentar (no banquinho) · pitar {n} · apontarCachimbo {devolve} · advertir (dedo em riste) · enrolar · deixar ·
 *             benzer {tempo=.6} (cruz de arruda em 4 tempos; o terço balança) · contar · acenar {comprido} (a falsa Vó)
 *   Curupira: surgir · sumir (giro e some) · assobiar · baterSapopema {batidas: [t…]} · cheirar {fumo, amansa} · farejar ·
 *             desenrolar {dur, ate} · rirDentes · medirSe · erguer (tronco) · arremessar · sacudir · baterPe {rastro} ·
 *             cravar {solta} · sentar {galho} · balancarPes {dur} · uivar · machadoErguido · acenarFumo · guardar {pena}
 *
 * Página de teste: producao/prototipo/elenco-gente.html (?modo=elenco | poses&quem= | gesto&quem=&g=a,b | cena).
 */
(function () {
  'use strict';
  const S = window.Sombras = window.Sombras || {};
  const B = S.bonecos, TAU = Math.PI * 2, RAD = Math.PI / 180;
  const C = Object.assign({}, B.COR, {
    peleZe: '#C98A58', camisaZe: '#5E9145', camisaZeEsc: '#467535', calcaZe: '#B7733F', calcaZeEsc: '#8E5530',
    cabelo: '#6A4426', palhaZe: '#D8B266', facaoCabo: '#9A5A32', laminha: '#2A1C12', remendo: '#6F86B0',
    peleVo: '#BC7C4E', blusaVo: '#DDB57C', xaleVo: '#CE8A58', saiaVo: '#DDA343', saiaVoEsc: '#B9832C',
    lencoVo: '#4A6AA8', barro: '#A65230', grisalho: '#DCCDA8', arruda: '#86A85E', conta: '#C84A26', madeiraClara: '#9C6A3C',
  });

  // ---------- desenho: pontos [x, y] ou [x, y, 1] (1 = canto vivo) → Bézier suave (Catmull-Rom) ----------
  const r1 = v => Math.round(v * 10) / 10;
  function liso(pts, aberto) {
    const n = pts.length, Q = i => pts[aberto ? Math.max(0, Math.min(n - 1, i)) : ((i % n) + n) % n];
    let d = 'M' + r1(pts[0][0]) + ' ' + r1(pts[0][1]);
    for (let i = 0; i < (aberto ? n - 1 : n); i++) {
      const a = Q(i - 1), p = Q(i), q = Q(i + 1), z = Q(i + 2), k1 = p[2] ? 0 : 1 / 6, k2 = q[2] ? 0 : 1 / 6;
      d += 'C' + [p[0] + (q[0] - a[0]) * k1, p[1] + (q[1] - a[1]) * k1, q[0] - (z[0] - p[0]) * k2, q[1] - (z[1] - p[1]) * k2, q[0], q[1]].map(r1).join(' ');
    }
    return d + (aberto ? '' : 'Z');
  }
  const oval = (x, y, rx, ry, g, n) => Array.from({ length: n || 8 }, (_, i) => {
    const u = i / (n || 8) * TAU, c = Math.cos((g || 0) * RAD), s = Math.sin((g || 0) * RAD), px = rx * Math.cos(u), py = (ry || rx) * Math.sin(u);
    return [x + c * px - s * py, y + s * px + c * py];
  });
  const des = (pts, dx, dy) => pts.map(p => [p[0] + dx, p[1] + dy, p[2]]);
  const multi = p => Array.isArray(p[0][0]);
  // peça em coordenadas de REPOUSO (chão y = 0, olhando +x) → coordenadas locais do bonecos.js (pivô na origem)
  function peca(id, pai, pivo, o) {
    const k = o.k || 1, loc = o.local ? (q => q.map(p => [p[0] * k, p[1] * k, p[2]])) : (q => des(q, -pivo[0], -pivo[1]));
    const fe = p => typeof p === 'string' ? p : multi(p) ? p.map(q => liso(loc(q))).join('') : liso(loc(p));
    const ab = p => typeof p === 'string' ? p : multi(p) ? p.map(q => liso(loc(q), true)).join('') : liso(loc(p), true);
    const r = Object.assign({}, o, { id, pai, pivo });
    delete r.local; delete r.k;
    r.formas = o.formas.map(f => Object.assign({}, f, { d: fe(f.p), p: undefined },
      f.vazado ? { vazado: Object.assign({}, f.vazado, f.vazado.faixa ? { faixa: fe(f.vazado.faixa) } : {}) } : {}));
    if (o.linhas) r.linhas = o.linhas.map(l => Object.assign({}, l, { d: ab(l.p), p: undefined }));
    if (o.furos) r.furos = o.furos.map(fe);
    if (o.brancos) r.brancos = o.brancos.map(b => Object.assign({}, b, { d: b.w ? ab(b.p) : fe(b.p), p: undefined }));
    return r;
  }

  // ---------- Zé: jovem caçador, H 330 (+24 de chapéu), magro e comprido, descalço, facão (§7.3) ----------
  function defZe() {
    const pele = C.peleZe;
    const coxa = [[-13, -168], [-15, -140], [-12, -112], [-9, -92], [2, -82], [10, -91], [13, -114], [14, -142], [12, -168]];
    const canela = [[-7, -92], [-9, -74], [-9, -60], [-6, -38], [-4, -19], [-7, -10], [-7, -2], [-3, 0, 1], [22, 0], [31, -.5], [34.5, -3], [31.5, -6.5], [17, -9.5], [8, -15],
      [5.5, -34], [7, -58], [8.5, -78], [8.5, -92]];
    const calcaBaixo = [[-8.5, -96], [-9.5, -74], [-9.5, -60], [-9, -52], [9, -52], [8.5, -72], [9, -96]];
    const barraCalca = [[-10, -61, 1], [9.5, -60, 1], [10, -51], [7, -46.5], [4, -50], [1, -45.5], [-2, -49.5], [-5, -45.8], [-8, -49.5], [-10.5, -47]];
    const manga = [[-8, -270], [-11, -250], [-10.5, -228], [-9, -210], [-7.5, -201], [5, -196.5], [14, -203], [13.5, -218], [12.5, -238], [13, -256], [11, -269]];
    const dobraManga = [[-9.5, -219, 1], [13.8, -222, 1], [14.6, -205], [5, -196.5], [-7.5, -201], [-9.5, -207]];
    const antebraco = [[-5, -210], [-7, -195], [-6, -180], [-3, -167], [-1, -158], [12, -156.5], [13, -168], [14.8, -186], [13.5, -205]];
    const punho = [[1, -161], [-2.5, -152], [-1.5, -142], [3, -135.5], [10, -132.5], [16.5, -134.5], [19.5, -140.5], [19.5, -149], [16, -155], [12, -159]];
    const polegar = [[13, -156], [19, -154.5], [23, -149.5], [21, -145.5], [16.5, -147.5]];
    const maoAberta = [[0, -161], [-2, -151], [-1, -140], [1.5, -131], [5.5, -127.5], [10, -128], [13.5, -132], [14.5, -141], [17.5, -146.5], [21, -144], [20, -140.5],
      [16, -137.5, 1], [13.5, -149], [12.5, -158]];
    const dedosAbertos = [[[3.2, -126], [4.2, -126], [4.6, -134], [3.6, -134]], [[6.6, -126.5], [7.6, -126.5], [7.8, -135], [6.8, -135]], [[9.8, -127.5], [10.8, -127.5], [10.8, -136], [9.8, -136]]];
    const P = (id, pai, pv, o) => peca(id, pai, pv, o);
    const remendo = [[-8.5, -124, 1], [7.5, -126, 1], [8.5, -106, 1], [-7.5, -104.5, 1]];
    const perna = (lado, dx, atras) => [
      P('perna' + lado, 'quadril', [-2 + dx, -160], { atras, formas: [{ p: des(coxa, dx, 0), cor: C.calcaZe }].concat(atras ? [] : [{ p: remendo, cor: C.remendo, contorno: 1 }]),
        linhas: [{ p: des([[0, -152], [3, -128]], dx, 0), op: .35 }].concat(atras ? [] : [{ p: [[-6.9, -122.4, 1], [5.9, -124.2, 1], [6.9, -107.6, 1], [-5.9, -106.2, 1], [-6.9, -122.4, 1]], w: .9, dash: '2 1.6', op: .8 }]),
        furos: atras ? [] : [[[2, -146], [5, -141], [3.6, -139], [6.4, -134], [4.4, -135.6], [1.4, -140]]] }),
      P('canela' + lado, 'perna' + lado, [2 + dx, -88], { atras, formas: [{ p: des(canela, dx, 0), cor: pele }, { p: des(calcaBaixo, dx, 0), cor: C.calcaZe }, { p: des(barraCalca, dx, 0), cor: C.calcaZeEsc }],
        linhas: [{ p: des([[23, -6], [25.5, -1.5]], dx, 0), w: 1, op: .7 }, { p: des([[27.5, -6.5], [29.5, -2]], dx, 0), w: 1, op: .7 }, { p: des([[-5, -30], [-4.5, -20]], dx, 0), op: .35 }] }),
    ];
    const braco = (lado, dx, dy, atras, maoForma) => [
      P('braco' + lado, 'peito', [4 + dx, -262 + dy], { atras, formas: [{ p: des(manga, dx, dy), cor: C.camisaZe }, { p: des(dobraManga, dx, dy), cor: C.camisaZeEsc }],
        linhas: [{ p: des([[-6, -214], [12.5, -216]], dx, dy), op: .5, w: 1 }, { p: des([[2, -258], [4, -232]], dx, dy), op: .35 }] }),
      P('antebraco' + lado, 'braco' + lado, [5 + dx, -206 + dy], { atras, formas: [{ p: des(antebraco, dx, dy), cor: pele }], linhas: [{ p: des([[9, -196], [7, -176]], dx, dy), op: .3 }] }),
      maoForma(dx, dy),
    ];
    const partes = [
      ...braco('Tras', 6, -2, 1, (dx, dy) => P('maoTras', 'antebracoTras', [7 + dx, -158 + dy], { atras: 1, formas: [{ p: des(maoAberta, dx, dy), cor: pele }], furos: dedosAbertos.map(q => des(q, dx, dy)) })),
      ...perna('Tras', 7, 1),
      ...perna('Frente', 0, 0),
      P('quadril', 'peito', [0, -186], { junta: false, formas: [{ p: [[-16, -196, 1], [17, -196, 1], [17, -170], [14, -152], [4, -146], [-8, -147], [-17, -156]], cor: C.calcaZe }],
        linhas: [{ p: [[4, -170], [6, -150]], op: .35 }] }),
      P('peito', null, [0, -186], {
        formas: [
          { p: [[-3, -282], [-11, -275], [-17, -262], [-20, -242], [-18.5, -218], [-16, -198], [-17.5, -180], [-19.5, -167, 1], [-7, -164.5], [5, -166], [19.5, -168.5, 1], [17.5, -184], [16, -200], [17.5, -216], [21.5, -236], [23.5, -252],
            [19.5, -267], [14.5, -279], [6, -284]], cor: C.camisaZe, vazado: { motivo: 'g-espinha', escala: 1.3, faixa: [[-18, -262], [3, -266], [7, -196], [-16, -186]], margem: 4 } },
          { p: [[6, -283], [14.5, -279.5], [19.5, -267], [23.5, -252], [22, -238], [18.2, -226, 1], [14.5, -236], [10.5, -254], [7.5, -270]], cor: pele },
          { p: [[4.5, -284.5], [9.5, -277], [8.6, -263, 1], [13.6, -271], [15.2, -280.5]], cor: C.camisaZeEsc },
        ],
        furos: [oval(17.4, -211, 1.3), oval(16.8, -191, 1.3)],
        linhas: [{ p: [[10.5, -254], [14.5, -236], [18.2, -226]], op: .8, w: 1.4 }, { p: [[18.2, -226], [17.2, -200], [17.6, -170]], op: .55, w: 1.1 }, { p: [[13, -262], [19.5, -252]], op: .35 },
          { p: [[-10, -254], [-7, -216]], op: .3 }, { p: [[-15, -178], [-2, -175], [12, -177]], op: .3 }],
      }),
      P('cabeca', 'peito', [8, -278], {
        formas: [
          { p: [[-1, -266], [-4, -284], [-8, -300], [-7.6, -313], [-6, -321.5, 1], [25.4, -321.5, 1], [26.2, -317], [28, -308], [27.5, -304], [35, -295, 1], [30.2, -292], [30.6, -289], [31.2, -287], [28.6, -285.6, 1],
            [30.2, -284], [29.5, -279], [24.5, -275], [17, -275.5], [12.5, -270], [13, -264], [2, -263]], cor: pele },
          { p: [[-6.8, -316], [-2, -315.5], [1.4, -310], [-.4, -302.5], [-4, -298], [-8.6, -293.5, 1], [-6.8, -300], [-9.6, -303, 1], [-7.6, -309]], cor: C.cabelo },
          { p: [[13, -319], [17.5, -319], [16, -308], [13.6, -306.5]], cor: C.cabelo },
        ],
        furos: [[[15.5, -318.5], [24, -318.5], [25.2, -309], [24.6, -303.2], [31, -295.4, 1], [27.6, -292.6], [28, -289.2], [26.2, -287.4], [27.2, -283.4], [25.6, -279.6], [21, -278.4], [16.5, -281], [15, -292], [15, -306]],
          [[11.6, -303.6], [9, -301], [8, -296], [9, -291], [11.6, -288.4], [12.2, -289.8], [10.4, -292], [9.6, -296], [10.4, -300.4], [12.4, -302.2]], oval(11.8, -296, .9)],
        brancos: [{ p: [[16.5, -310.5], [20.5, -311.4], [25.2, -309.6]], w: 2.2 }, { p: [[17.6, -304.4], [20.6, -306.2], [24.4, -304]], w: 1.5 }, { p: [[18.4, -303.6], [21, -302.8], [24.4, -304]], w: 1.1 },
          { p: oval(21.6, -304.6, 1.25) }, { p: [[24.4, -304], [25, -303.4]], w: 1.4 }, { p: [[27.8, -296.8], [26, -294], [28.4, -292.8]], w: 1.2 }, { p: [[28.4, -287.2], [24.2, -286.6]], w: 1.4 },
          { p: [[15.2, -297], [18.8, -292.5]], w: 1 }],
      }),
      P('topete', 'cabeca', [8, -318], { junta: false, formas: [{ p: [[-7.4, -316], [-8.6, -326], [-3.6, -334.5], [6, -338.5], [16, -337], [23.4, -332], [27.4, -324], [26, -318.5, 1], [22.6, -322], [20.4, -318.6, 1],
        [16.6, -322.4], [10, -321], [2, -322.4], [-3.4, -318.6]], cor: C.cabelo }], linhas: [{ p: [[-2, -330], [8, -334], [18, -331]], op: .5 }, { p: [[4, -326], [14, -328]], op: .4 }] }),
      P('chapeu', 'cabeca', [10, -322], {
        junta: false, formas: [
          { p: [[-9.5, -321], [-9.5, -337], [-4.5, -347.5], [5.5, -351], [12, -346.5, 1], [18.5, -351], [26.5, -347], [28.5, -336], [28.5, -321]], cor: C.palhaZe, vazado: { motivo: 'g-trancado', escala: 1.2, margem: 2.5 } },
          { p: [[-9.8, -320.5, 1], [28.8, -320.5, 1], [29, -327, 1], [-10, -327, 1]], cor: '#5C3A20', contorno: 1.2 },
          { p: [[-25, -318], [-14, -323.5], [0, -325.5], [20, -325.5], [34, -322.5], [44.5, -317.5, 1], [41, -315.5], [36, -317], [33, -313.5, 1], [28.5, -316.2], [16, -317.5], [0, -317.5],
            [-9, -315.6], [-12, -312, 1], [-15.5, -316], [-24.5, -313.5, 1]], cor: C.palhaZe, vazado: { motivo: 'g-trancado', escala: 1.2, margem: 2 } },
        ],
        linhas: [{ p: [[44.5, -317.5], [50.5, -315.5]], cor: C.palhaZe, w: 1.5, op: 1 }, { p: [[41, -315.5], [45.5, -310.5]], cor: C.palhaZe, w: 1.4, op: 1 },
          { p: [[-25, -318], [-31, -320.5]], cor: C.palhaZe, w: 1.5, op: 1 }, { p: [[-24.5, -313.5], [-29, -309]], cor: C.palhaZe, w: 1.4, op: 1 },
          { p: [[28.5, -337], [33.5, -340.5]], cor: C.palhaZe, w: 1.3, op: 1 }, { p: [[-20, -317], [20, -320.5], [40, -318]], w: 1, op: .4 }],
      }),
      P('chapeuMao', 'maoFrente', [12, -144], { local: 1, junta: false, ang0: -20, formas: [
        { p: [[-14, 2], [-14, -12], [-9, -22], [0, -25], [6, -21, 1], [12, -25], [19, -21], [21, -10], [21, 2]], cor: C.palhaZe, vazado: { motivo: 'g-trancado', escala: 1.2, margem: 2.5 } },
        { p: [[-30, 4], [-18, -2], [4, -3.5], [26, -2], [40, 3, 1], [35, 6], [29, 8.5, 1], [24, 6], [4, 4.5], [-20, 7], [-29, 9, 1]], cor: C.palhaZe, vazado: { motivo: 'g-trancado', escala: 1.2, margem: 2 } }] }),
      P('facao', 'maoFrente', [10, -145], { local: 1, junta: false, ang0: 62, formas: [ // lâmina fina e curva, cabo curto
        { p: [[11, -3, 1], [40, -3.4], [70, -4.6], [92, -7.4], [104, -11.6], [108.5, -10.2, 1], [105, -4.2], [91, .8], [66, 3.2], [38, 3.6], [11, 3, 1]], cor: C.laminha },
        { p: [[-10, -3.4], [11, -3.6, 1], [11, 3.6, 1], [-10, 3.4], [-12.5, 0]], cor: C.facaoCabo }],
        furos: [[[20, 1.2], [66, 1.1], [90, -1.4], [90, -.4], [66, 2.1], [20, 2.1]], oval(-4, 0, 1.2)] }),
      P('facaoCintura', 'quadril', [-12, -180], { local: 1, junta: false, ang0: 98, k: .9, formas: [
        { p: [[11, -4.6, 1], [96, -5.6], [104, -3, 1], [106, 3], [100, 8.6, 1], [70, 9.2], [35, 7.6], [11, 4.6, 1]], cor: C.laminha },
        { p: [[-16, -3.2], [11, -3.8, 1], [11, 3.8, 1], [-16, 3.2], [-18.5, 0]], cor: C.facaoCabo }], furos: [oval(-9, 0, 1.2)] }),
      P('novelo', 'maoFrente', [11, -137], { local: 1, junta: false, formas: [{ p: oval(0, 0, 13, 12, 0, 10), cor: '#7C6A34' }],
        linhas: [{ p: [[-10, -7], [-2, -11], [9, -8], [12, 1], [6, 10], [-6, 10], [-12, 1], [-6, -5], [4, -6], [7, 3], [0, 7], [-5, 1]], w: 1.4, op: .7 }, { p: [[-12, 5], [-4, -3], [8, -4]], w: 1.2, op: .5 }] }),
      P('cipo', 'maoFrente', [11, -140], { local: 1, junta: false, formas: [
        { p: [[-2, 0], [-6, 30], [-2, 62], [-7, 94], [-4, 118, 1], [-1, 118, 1], [-3, 94], [2, 62], [-2, 30], [2, 0]], cor: '#6B5A2C' },
        { p: [[[-4, 40], [-15, 34], [-20, 40], [-11, 44]], [[1, 72], [12, 66], [17, 73], [8, 76]], [[-4, 100], [-14, 96], [-18, 103], [-9, 105]]], cor: C.verdeMata }] }),
      P('fumoMao', 'maoFrente', [12, -138], { local: 1, junta: false, formas: [{ p: [[-12, -4], [10, -5], [13, 0], [10, 5], [-12, 4], [-14, 0]], cor: '#5A3418' }],
        linhas: [{ p: [[-6, -4.5], [-5, 4.5]], w: 1, op: .7 }, { p: [[2, -5], [3, 5]], w: 1, op: .7 }] }),
      ...braco('Frente', 0, 0, 0, (dx, dy) => P('maoFrente', 'antebracoFrente', [7, -158], { formas: [{ p: punho, cor: pele }, { p: polegar, cor: pele }],
        linhas: [{ p: [[13.5, -146.5], [19.4, -145]], w: 1.1, op: .75 }, { p: [[12.5, -141], [18.6, -139.5]], w: 1.1, op: .75 }] })),
    ];
    return {
      nome: 'ze', H: 330, partes,
      varetas: [{ parte: 'peito', ponto: [2, -258], mestra: true }, { parte: 'maoFrente', ponto: [8, -152] }, { parte: 'maoTras', ponto: [14, -154] }],
      pose: { s: { chapeuMao: 0, novelo: 0, cipo: 0, fumoMao: 0, facaoCintura: 0 }, o: { topete: 0 },
        a: { peito: 3, quadril: -5, cabeca: -1, bracoFrente: 6, antebracoFrente: -16, maoFrente: -4, bracoTras: -8, antebracoTras: -12, pernaFrente: -2, canelaFrente: 4, pernaTras: 7, canelaTras: 1 } },
      pendulos: { cipo: [3, .5] },
      ancoras: { boca: ['cabeca', [29, -286]], nariz: ['cabeca', [33, -296]], queixo: ['cabeca', [26, -278]], topo: ['cabeca', [10, -332]], testa: ['cabeca', [24, -314]],
        chapeu: ['chapeu', [10, -338]], peito: ['peito', [20, -242]], ombro: ['peito', [6, -268]], cintura: ['peito', [15, -190]], costas: ['peito', [-17, -232]], joelho: ['canelaFrente', [9, -88]] },
      assento: [-12, -152],
    };
  }

  // ---------- Vó: benzedeira, H 270, costas curvadas, lenço, cachimbo de barro, terço e arruda (§7.4) ----------
  function defVo() {
    const pele = C.peleVo, P = (id, pai, pv, o) => peca(id, pai, pv, o);
    const coxa = [[-10, -140], [-12, -112], [-10, -84], [-3, -64], [11, -62], [17, -76], [17, -108], [14, -140]];
    const canela = [[-3.4, -16], [-3, -12], [-6, -6.5], [-5.5, -1.5, 1], [20, -1.5], [25.5, -3], [23.5, -6.5], [13, -9.5], [5.5, -12.5], [4.6, -16]]; // só o pé aparece sob a saia
    const sola = [[-6.5, -2.4, 1], [26, -2.4, 1], [26, .6, 1], [-6.5, .6, 1]];
    const manga = [[-1, -205], [-4.5, -186], [-4, -168], [-1, -154], [10, -149], [17.5, -156], [18, -175], [18.5, -194], [15, -205]];
    const antebraco = [[2.5, -161], [1.5, -146], [3.5, -133], [6, -121.5], [14.5, -120], [16.5, -131], [17.5, -146], [16.5, -161]];
    const punhoBlusa = [[1.6, -162, 1], [17.6, -162, 1], [17.8, -150], [15, -147.5], [12, -150], [9, -147.5], [6, -150], [3, -147.5], [1.4, -150]];
    const mao = [[6, -123], [4, -115], [5.5, -107], [10.5, -102.5], [16.5, -103.5], [19.5, -108.5], [19.5, -114.5], [16.5, -120.5], [13, -123]];
    const polegar = [[14.5, -119.5], [20.5, -117.5], [23, -113.5], [20.5, -110.5], [17, -112.5]];
    const dedo = [[6, -123], [4, -115], [6, -108], [11, -104.5], [14.8, -104], [15.6, -96], [16.6, -90.5], [19.2, -90.8], [19.4, -97], [19.6, -106], [20.6, -111], [19.6, -117], [16.5, -121], [13, -123]];
    const braco = (lado, dx, dy, atras, maoParte) => [
      P('braco' + lado, 'peito', [8 + dx, -198 + dy], { atras, formas: [{ p: des(manga, dx, dy), cor: C.blusaVo }], linhas: [{ p: des([[6, -192], [8, -162]], dx, dy), op: .35 }] }),
      P('antebraco' + lado, 'braco' + lado, [9 + dx, -157 + dy], { atras, formas: [{ p: des(antebraco, dx, dy), cor: pele }, { p: des(punhoBlusa, dx, dy), cor: C.blusaVo }],
        linhas: [{ p: des([[7, -140], [9, -128]], dx, dy), op: .3 }] }),
      maoParte(dx, dy),
    ];
    const perna = (lado, dx, atras) => [
      P('canela' + lado, 'perna' + lado, [5 + dx, -70], { atras, junta: false, formas: [{ p: des(canela, dx, 0), cor: pele }, { p: des(sola, dx, 0), cor: '#4E2C16', contorno: 1 }],
        linhas: [{ p: des([[5, -12], [13, -4.5]], dx, 0), w: 2.2, op: .9, cor: '#4E2C16' }, { p: des([[-3.5, -9], [6, -12]], dx, 0), w: 1.8, op: .9, cor: '#4E2C16' }] }),
      P('perna' + lado, 'quadril', [2 + dx, -134], { atras, junta: false, formas: [{ p: des(coxa, dx, 0), cor: C.saiaVo }] }),
    ];
    // franja do xale: fios pendurados na borda de baixo (da ponta das costas até o peito)
    const franja = [];
    for (let i = 0; i <= 13; i++) {
      const u = i / 13, x = -16.5 + 40 * u, y = -154 - 31 * u + 4 * Math.sin(u * Math.PI), L = 8 - 2.5 * u;
      franja.push([[x - .8, y - 1.5, 1], [x + .8, y - 1.5, 1], [x + 1, y + L, 1], [x - .6, y + L, 1]]);
    }
    // terço: 17 contas numa alça em U pendurada da mão (cruz embaixo)
    const contas = Array.from({ length: 17 }, (_, i) => { const u = i / 16; return [.5 - 4 * Math.cos(Math.PI * u), 2 + 31 * Math.pow(Math.sin(Math.PI * u), .7)]; });
    const partes = [
      ...braco('Tras', 5, -2, 1, (dx, dy) => P('maoTras', 'antebracoTras', [11 + dx, -120 + dy], { atras: 1, formas: [{ p: des(mao, dx, dy), cor: pele }, { p: des(polegar, dx, dy), cor: pele }],
        linhas: [{ p: des([[15, -111], [19.5, -110]], dx, dy), w: 1, op: .7 }] })),
      P('terco', 'maoTras', [19, -110], { local: 1, junta: false, formas: [
        { p: contas.map(([x, y]) => oval(x, y, 2.1, 2.1, 0, 6)), cor: C.conta, contorno: 1 },
        { p: [[-1.2, 34], [1.2, 34], [1.2, 37], [3.6, 37], [3.6, 39.2], [1.2, 39.2], [1.2, 45, 1], [-1.2, 45, 1], [-1.2, 39.2], [-3.6, 39.2], [-3.6, 37], [-1.2, 37]].map(p => [p[0], p[1], 1]), cor: '#6B4426', contorno: 1 }],
        linhas: [{ p: contas, w: .8, op: .8 }],
        furos: contas.map(([x, y]) => oval(x, y, .6, .6, 0, 5)) }),
      ...perna('Tras', 6, 1),
      ...perna('Frente', 0, 0),
      // saia de dois babados: o de cima pende da cintura; o de baixo pende do joelho (pêndulo) e acompanha o passo e o sentar
      P('barra', 'pernaFrente', [5, -70], { junta: false, formas: [
        { p: [[-28.5, -76], [22.5, -76], [24.5, -58], [27.5, -32], [31, -12], [33.5, -4.5, 1], [26, -3], [18, -5.6], [9, -3], [0, -5.2], [-9, -2.8], [-18, -5.2], [-27, -3], [-34.5, -5, 1], [-33.5, -20], [-31.5, -48]],
          cor: C.saiaVo, vazado: { motivo: 'g-degrau', escala: 1.25, faixa: [[-36, -26], [34, -26], [35, -10], [-36, -10]], margem: 3 } }],
        linhas: [{ p: [[-33, -28], [-1, -29], [30, -28]], op: .6, w: 1.1 }, { p: [[-14, -66], [-17, -32]], op: .35 }, { p: [[8, -66], [11, -32]], op: .35 }, { p: [[-3, -64], [-4, -34]], op: .25 }] }),
      P('quadril', 'peito', [0, -146], { junta: false, formas: [
        { p: [[-13.5, -152, 1], [15.5, -152, 1], [17, -134], [19.5, -112], [22.5, -90], [25.5, -70], [27.5, -61.5, 1], [21, -60.5], [14, -62.8], [6, -60], [-2, -62.4], [-10, -59.6], [-18, -62.2], [-25.6, -60], [-31.5, -62.5, 1],
          [-28.5, -80], [-23, -104], [-18, -128]], cor: C.saiaVo, vazado: { motivo: 'g-losango', escala: 1.2, faixa: [[-24, -134], [18, -134], [22, -76], [-27, -76]], margem: 4 } },
        { p: [[-14, -153, 1], [16, -153, 1], [16.5, -145, 1], [-14.5, -145, 1]], cor: C.saiaVoEsc }],
        linhas: [{ p: [[-6, -145], [-10, -110], [-14, -62]], op: .4 }, { p: [[6, -145], [8, -108], [10, -61]], op: .4 }, { p: [[-17, -140], [-24, -96], [-27, -64]], op: .3 }] }),
      P('peito', null, [0, -146], {
        formas: [
          { p: [[-13, -140, 1], [-15.5, -158], [-16, -176], [-12, -194], [-3, -206], [8, -213], [18, -214], [26, -206], [25, -196], [22, -184], [19, -170], [16, -156], [14, -140, 1]], cor: C.blusaVo },
          { p: [[9, -216], [-3, -210], [-12, -199], [-17, -184], [-19, -168], [-17, -154.5, 1], [-9, -162], [0, -170.5], [10, -177.5], [19, -182], [24.5, -186, 1], [26, -196], [24.5, -206.5], [17, -214.5]], cor: C.xaleVo,
            vazado: { motivo: 'g-losango', escala: 1.2, margem: 3.5 } },
          { p: franja, cor: C.xaleVo, contorno: .8 },
        ],
        linhas: [{ p: [[19, -170], [17, -152]], op: .35 }, { p: [[-12, -158], [-10, -144]], op: .3 }, { p: [[12, -212], [18, -200], [21, -188]], op: .4 }],
      }),
      P('cabeca', 'peito', [20, -210], {
        formas: [
          { p: [[14, -201], [8, -212], [6, -226], [10, -240], [20, -250], [30, -249], [36, -242], [38, -236], [37.6, -232], [44, -224, 1], [39.6, -221.2], [39, -218.6], [37, -217, 1], [38.6, -215.2],
            [39.6, -211], [37.4, -207], [31, -205], [26, -204], [24, -199], [16, -197]], cor: pele },
          { p: [[24, -238.5], [28.5, -240.5], [27.4, -234], [25.2, -231]], cor: C.grisalho },
          { p: [[37.4, -241.4, 1], [35.4, -247.4], [28, -253.4], [18, -256.4], [8, -253.4], [0, -246.4], [-4.2, -237.4], [-3, -229], [3, -225.4, 1], [9, -228], [14.4, -231.4], [18.6, -233.6], [23.4, -237.6], [29.4, -241.6], [34, -242.6]],
            cor: C.lencoVo, vazado: { motivo: 'g-ponto', escala: 1.2, margem: 3 } },
        ],
        furos: [[[27, -239], [34.6, -239], [35.2, -233.2], [34.8, -229.6], [41, -223.6, 1], [37.4, -221.6], [36.3, -218.8], [34.6, -217.4], [36, -213.8], [35.6, -210.2], [31, -208.6], [27, -210], [25.6, -218], [25.6, -230]],
          [[22.6, -230.6], [19.8, -228.4], [18.8, -223], [19.8, -217.8], [22.6, -215.6], [23, -217], [20.9, -218.6], [20.2, -223], [21, -227.6], [23.2, -229.2]], oval(22.4, -223, .8)],
        brancos: [{ p: [[28.6, -234.6], [32, -235.4], [35.2, -234.2]], w: 1.7 }, { p: [[29.8, -229.4], [32.4, -230.8], [35, -229.6]], w: 1.6 }, { p: [[30.4, -229], [33, -228.2], [35, -229.4]], w: 1.1 },
          { p: oval(33, -229.6, 1.1) }, { p: [[30.6, -227], [33.4, -226.2]], w: .9 }, { p: [[38.2, -222], [35.6, -219.6], [34.6, -216.4]], w: 1.2 },
          { p: [[36.6, -217.2], [33.4, -217]], w: 1.4 }, { p: [[35.6, -212.4], [32.8, -212]], w: 1 }, { p: [[25.6, -221.4], [29.4, -219.4]], w: 1 }, { p: [[34.6, -239], [33, -236.2]], w: 1.1 }],
        linhas: [{ p: [[37.4, -241.4], [30, -244], [22, -243.2]], w: 1, op: .6 }],
      }),
      P('pontaLenco', 'cabeca', [-1, -232], { junta: false, formas: [{ p: [[0, -236], [-5, -233], [-8, -226], [-11, -214], [-9.5, -205.5, 1], [-6, -213], [-3, -221], [-1, -213], [1.5, -204.5, 1], [3, -214], [3.4, -226], [4.4, -232]], cor: C.lencoVo }],
        linhas: [{ p: [[-2, -230], [-6, -216]], op: .4 }] }),
      P('cachimbo', 'cabeca', [36.6, -217], { local: 1, junta: false, formas: [
        { p: [[0, -1.1], [12.4, 4.4], [12.8, 6.6], [0, 1.2]], cor: '#5A3A22', contorno: 1 },
        { p: [[11, 1], [10.6, -6], [12.6, -8.2, 1], [21.2, -8.2, 1], [20.6, 1.2], [18, 5.4], [13.4, 5.6]], cor: C.barro, contorno: 1.2 }],
        linhas: [{ p: [[12.8, -6.2], [20.6, -6.2]], w: 1, op: .7 }] }),
      P('arruda', 'maoFrente', [15, -111], { local: 1, junta: false, ang0: -8, formas: [
        { p: [[[-1, 1], [3.6, -14], [8.6, -30], [10.6, -31], [6, -14], [1.4, 1.4]], [[5.4, -12, 1], [11, -19], [12.6, -18.4], [7.2, -11, 1]]], cor: '#55703A', contorno: 1 },
        { p: [oval(9.6, -35.5, 2.6, 3.8, 10, 6), oval(5.6, -30.5, 2.4, 3.6, -40, 6), oval(13.4, -30.6, 2.4, 3.6, 50, 6), oval(13.6, -22.6, 2.4, 3.4, 60, 6),
          oval(15.2, -17.2, 2.2, 3.2, 80, 6), oval(3, -22, 2.2, 3.4, -55, 6), oval(8.2, -24.6, 2.2, 3.2, 20, 6), oval(1.4, -14.4, 2, 3, -60, 6), oval(6.4, -8.4, 2, 3, 40, 6)], cor: C.arruda, contorno: 1 }] }),
      P('cachimboMao', 'maoFrente', [15, -112], { local: 1, junta: false, ang0: -70, formas: [
        { p: [[-3, -1.1], [12.4, 4.4], [12.8, 6.6], [-3, 1.2]], cor: '#5A3A22', contorno: 1 },
        { p: [[11, 1], [10.6, -6], [12.6, -8.2, 1], [21.2, -8.2, 1], [20.6, 1.2], [18, 5.4], [13.4, 5.6]], cor: C.barro, contorno: 1.2 }] }),
      P('novelo', 'maoFrente', [15, -108], { local: 1, junta: false, formas: [{ p: oval(0, 0, 11, 10, 0, 10), cor: '#7C6A34' }],
        linhas: [{ p: [[-8, -6], [-2, -9], [7, -7], [10, 1], [5, 8], [-5, 8], [-10, 1], [-5, -4], [3, -5], [6, 2], [0, 6], [-4, 1]], w: 1.3, op: .7 }] }),
      P('fumoMao', 'maoFrente', [15, -110], { local: 1, junta: false, formas: [{ p: [[-10, -3.5], [8, -4.5], [11, 0], [8, 4.5], [-10, 3.5], [-12, 0]], cor: '#5A3418' }],
        linhas: [{ p: [[-4, -4], [-3, 4]], w: 1, op: .7 }] }),
      ...braco('Frente', 0, 0, 0, (dx, dy) => P('maoFrente', 'antebracoFrente', [11, -120], { formas: [{ p: mao, cor: pele }, { p: polegar, cor: pele }],
        linhas: [{ p: [[15.6, -111.4], [19.6, -110.4]], w: 1, op: .7 }, { p: [[14.8, -107.4], [18.8, -106.2]], w: 1, op: .7 }] })),
      P('dedoFrente', 'antebracoFrente', [11, -120], { junta: false, formas: [{ p: dedo, cor: pele }, { p: polegar, cor: pele }],
        linhas: [{ p: [[15.6, -111.4], [19.4, -110.6]], w: 1, op: .7 }] }),
    ];
    return {
      nome: 'vo', H: 270, partes,
      varetas: [{ parte: 'peito', ponto: [8, -200], mestra: true }, { parte: 'maoFrente', ponto: [12, -116] }, { parte: 'maoTras', ponto: [16, -118] }],
      pose: { fumaca: 1, s: { dedoFrente: 0, cachimboMao: 0, novelo: 0, fumoMao: 0 }, o: { pernaFrente: 0, pernaTras: 0 },
        a: { peito: 9, quadril: -6, cabeca: -3, bracoFrente: -14, antebracoFrente: -46, maoFrente: 10, bracoTras: 8, antebracoTras: -24, maoTras: 6, pernaFrente: -2, canelaFrente: 2, pernaTras: 3, canelaTras: 1 } },
      pendulos: { terco: [6, .7], pontaLenco: [4, .45], barra: [2, .4] },
      fumo: { cachimbo: [53.6, -225.4], cachimboMao: [32, -120] },
      ancoras: { boca: ['cabeca', [37, -217]], nariz: ['cabeca', [41, -225]], queixo: ['cabeca', [37, -209]], topo: ['cabeca', [20, -255]], testa: ['cabeca', [33, -240]],
        peito: ['peito', [22, -184]], ombro: ['peito', [10, -208]], cintura: ['peito', [15, -150]], costas: ['peito', [-15, -176]], joelho: ['canelaFrente', [11, -70]] },
      assento: [-8, -128],
    };
  }

  // Tião e Curupira vêm do bonecos.js; aqui ganham objetos de mão (escondidos por s = 0) e âncoras
  function defTiao() {
    const def = B.defs.tiao(), by = id => def.partes.find(p => p.id === id), ch = by('chapeu'), mt = by('maoTras');
    def.partes.push(
      Object.assign({}, ch, { id: 'chapeuMao', pai: 'maoTras', pivo: [mt.pivo[0] + 3, mt.pivo[1] + 16], ang0: 170, junta: false }),
      peca('pena', 'maoTras', [mt.pivo[0] + 2, mt.pivo[1] + 14], Object.assign({ local: 1, junta: false, ang0: -100, k: .8 }, OBJETOS.pena())),
      peca('penaChapeu', 'chapeu', [ch.pivo[0] - 14, ch.pivo[1] - 6], Object.assign({ local: 1, junta: false, ang0: -168, k: .8 }, OBJETOS.pena())),
      peca('fumoMao', 'maoTras', [mt.pivo[0] + 2, mt.pivo[1] + 14], Object.assign({ local: 1, junta: false, ang0: 70 }, OBJETOS.fumo())));
    def.pose.s = Object.assign({ chapeuMao: 0, pena: 0, penaChapeu: 0, fumoMao: 0 }, def.pose.s);
    def.ancoras = { boca: ['cabeca', [30, -282]], nariz: ['cabeca', [36, -290]], queixo: ['cabeca', [24, -262]], topo: ['cabeca', [13, -318]], testa: ['cabeca', [26, -306]],
      chapeu: ['chapeu', [14, -334]], peito: ['peito', [22, -236]], ombro: ['peito', [4, -260]], cintura: ['peito', [20, -178]], costas: ['peito', [-26, -230]], bornal: ['bornal', [-26, -172]] };
    return def;
  }
  function defCurupira() {
    const def = B.defs.curupira(), by = id => def.partes.find(p => p.id === id), cb = by('cabeca'), mt = by('maoTras'), q = by('quadril');
    const colar = []; // cipó desmanchado no pescoço: fio torcido com folhinhas soltas
    for (let i = 0; i <= 10; i++) { const u = i / 10, x = -8 + 26 * u, y = -138 + 30 * Math.sin(Math.PI * u * .9); colar.push([x, y]); }
    def.partes.push(
      peca('penaMao', 'maoTras', [mt.pivo[0] + 1, mt.pivo[1] + 12], Object.assign({ local: 1, junta: false, ang0: -100, k: .6 }, OBJETOS.pena())),
      peca('penaOrelha', 'cabeca', [cb.pivo[0] - 10, cb.pivo[1] - 24], Object.assign({ local: 1, junta: false, ang0: -150, k: .6 }, OBJETOS.pena())),
      peca('fumoMao', 'maoTras', [mt.pivo[0] + 1, mt.pivo[1] + 12], Object.assign({ local: 1, junta: false, ang0: 70, k: .8 }, OBJETOS.fumo())),
      peca('fumoCintura', 'quadril', [q.pivo[0] + 9, q.pivo[1] - 1], Object.assign({ local: 1, junta: false, ang0: 72, k: .8 }, OBJETOS.fumo())),
      peca('novelo', 'maoTras', [mt.pivo[0] + 2, mt.pivo[1] + 22], Object.assign({ local: 1, junta: false, k: .85 }, OBJETOS.novelo())),
      peca('cipoColar', 'peito', [0, -76], { junta: false, formas: [{ p: colar.map(([x, y]) => [x, y - 1.3]).concat(colar.slice().reverse().map(([x, y]) => [x, y + 1.3])), cor: '#6B5A2C', contorno: .8 },
        { p: [oval(2, -116, 2.2, 4, 20, 6), oval(9, -112, 2, 3.6, -10, 6), oval(16, -118, 2, 3.4, -30, 6)], cor: C.verdeMata, contorno: .8 }] }));
    def.pose.s = Object.assign({ penaMao: 0, penaOrelha: 0, fumoMao: 0, fumoCintura: 0, novelo: 0, cipoColar: 0 }, def.pose.s);
    def.ancoras = { boca: ['cabeca', [22, -153]], nariz: ['cabeca', [27, -163]], queixo: ['mandibula', [16, -142]], topo: ['cabeca', [8, -191]], orelha: ['cabeca', [-8, -166]],
      peito: ['peito', [15, -110]], ombro: ['peito', [4, -140]], cintura: ['peito', [12, -80]], costas: ['peito', [-16, -110]] };
    return def;
  }

  // ---------- estado, motor e apoio no chão ----------
  const EXTRA = { marcha: 0, passo: 0, respiro: 1, tremor: 0, fala: 0, giro: 0, enrolar: 0, balanco: 0, fumaca: 0, apoio: 1 };
  // andar de cada um: px/s, px por passo, graus de perna/braço, dobra do joelho, salto (px), inclinação, cabeça
  const ESTILOS = {
    tiao: { vel: 95, passo: 58, pernas: 15, bracos: 6, joelho: 0, salto: 0, inclinacao: 3, cabeca: 1.5 },
    ze: { vel: 140, passo: 70, pernas: 19, bracos: 15, joelho: 30, salto: 2, inclinacao: 4, cabeca: 3 },
    vo: { vel: 46, passo: 24, pernas: 8, bracos: 3, joelho: 12, salto: 0, inclinacao: 1, cabeca: 1 },
    curupira: { vel: 120, passo: 40, pernas: 20, bracos: 10, joelho: 0, salto: 9, inclinacao: 2, cabeca: 2 },
  };
  const MODOS = { // variações do andar (multiplicam o estilo)
    andar: {}, correr: { vel: 2.6, passo: 1.7, pernas: 1.7, bracos: 2, joelho: 2, salto: 3, inclinacao: 2.4 },
    pontaDosPes: { vel: .4, passo: .8, pernas: 1.5, bracos: .3, joelho: 2.4, salto: 1.5 },
    sonambulo: { vel: .5, passo: .6, pernas: .6, bracos: 0, joelho: .4, inclinacao: -.5 },
    cansado: { vel: .55, passo: .7, pernas: .7, bracos: .3, joelho: .6, inclinacao: 2.5 },
    saltitar: { vel: 1.1, salto: 1.6 }, calcanhar: { vel: .5, passo: .8, salto: .3 }, ligeiro: { vel: 1.5, passo: 1.2, bracos: .3 },
  };
  const ad = (b, k, v) => { b.extra.a[k] = (b.extra.a[k] || 0) + v; };

  // ponto de repouso da peça → coordenadas do boneco (raiz na origem, sem escala), com os ângulos ang(id)
  function fk(b, ang, id, pt) {
    const by = b._partes;
    let p = by[id], x = pt[0] - p.pivo[0], y = pt[1] - p.pivo[1];
    while (p) {
      const g = ((p.ang0 || 0) + ang(p.id)) * RAD, c = Math.cos(g), s = Math.sin(g), pai = p.pai && by[p.pai];
      const nx = c * x - s * y; y = s * x + c * y; x = nx;
      x += p.pivo[0] - (pai ? pai.pivo[0] : 0); y += p.pivo[1] - (pai ? pai.pivo[1] : 0);
      p = pai;
    }
    return [x, y];
  }
  // o mais baixo dos pontos de contato (pés, joelhos, assento, cabeça, costas), já com o giro da raiz
  function baixo(b, ang, rot) {
    const s = Math.sin(rot * RAD), c = Math.cos(rot * RAD);
    let m = -1e9;
    for (const [id, pt] of b._contatos) { const [x, y] = fk(b, ang, id, pt); m = Math.max(m, x * s + y * c); }
    return m;
  }
  function contatos(def, by) {
    const pts = id => { const p = by[id], o = []; if (!p) return o; for (const f of p.formas) { const n = f.d.match(/-?(?:\d+\.?\d*|\.\d+)/g).map(Number); for (let i = 0; i + 1 < n.length; i += 2) o.push([n[i] + p.pivo[0], n[i + 1] + p.pivo[1]]); } return o; };
    const ext = (id, f) => { const q = pts(id); return q.length ? [id, q.reduce((a, p) => (f(p) > f(a) ? p : a))] : null; };
    const L = [];
    for (const lado of ['Frente', 'Tras']) {
      const id = ['pe', 'canela', 'perna'].map(k => k + lado).find(k => by[k]);
      if (!id) continue;
      const q = pts(id), yM = Math.max(...q.map(p => p[1])), sola = q.filter(p => p[1] > yM - 4);
      L.push([id, sola.reduce((a, p) => (p[0] < a[0] ? p : a))], [id, sola.reduce((a, p) => (p[0] > a[0] ? p : a))]);
      if (by['canela' + lado]) L.push(['canela' + lado, [by['canela' + lado].pivo[0] + 9, by['canela' + lado].pivo[1]]]);
    }
    L.push(def.assento ? ['quadril', def.assento] : ext('quadril', p => p[1] - .6 * p[0]), ext('cabeca', p => -p[1]), ext('peito', p => -p[0] - .2 * Math.abs(p[1] + def.H * .7)));
    return L.filter(p => p && by[p[0]]);
  }
  function acumulado(b, id) { // ângulo absoluto do quadro da peça (graus), com pose, motores e giro da raiz
    const by = b._partes, P = b.pose, E = b.extra;
    let g = P.rot || 0;
    for (let p = by[id]; p; p = p.pai && by[p.pai]) g += (p.ang0 || 0) + (P.a[p.id] || 0) + (E.a[p.id] || 0);
    return g;
  }

  function mover(b, t) {
    const P = b.pose, w = P.andar || b.estilo, m = P.marcha || 0;
    B.respirar(b, t, { amp: P.respiro == null ? 1 : P.respiro });
    if (m > .001) {
      const f = P.passo, c = Math.cos(TAU * f);
      B.andar(b, f, { pernas: w.pernas * m, bracos: w.bracos * m, bob: 0, inclinacao: w.inclinacao * m });
      if (w.joelho) { ad(b, 'canelaFrente', w.joelho * m * Math.max(0, c)); ad(b, 'canelaTras', w.joelho * m * Math.max(0, -c)); }
      if (w.salto) b.extra.dy -= w.salto * m * c * c;
      if (w.cabeca) ad(b, 'cabeca', w.cabeca * m * Math.sin(TAU * 2 * f + 1));
    }
    if (P.tremor > .001) { const k = P.tremor; b.extra.dy += 2 * k * Math.sin(TAU * 18 * t); ad(b, 'peito', 1.4 * k * Math.sin(TAU * 15 * t + 1)); ad(b, 'cabeca', k * Math.sin(TAU * 13 * t + 2)); }
    if (P.fala > .001) ad(b, 'cabeca', -2.6 * P.fala * Math.max(0, Math.sin(TAU * 2.5 * t)) * (.55 + .45 * Math.sin(TAU * .63 * t + 1)));
    if (P.enrolar > .001) {
      const k = P.enrolar, g = TAU * P.giro;
      ad(b, 'antebracoFrente', 15 * k * Math.sin(g)); ad(b, 'maoFrente', 24 * k * Math.cos(g));
      ad(b, 'antebracoTras', 15 * k * Math.sin(g + 2.4)); ad(b, 'maoTras', 24 * k * Math.cos(g + 2.4));
    }
    if (P.balanco > .001) {
      const k = P.balanco, s = Math.sin(TAU * .85 * t);
      ad(b, 'pernaFrente', 12 * k * s); ad(b, 'pernaTras', -12 * k * s); ad(b, 'peFrente', 10 * k * s); ad(b, 'peTras', -10 * k * s);
      ad(b, 'canelaFrente', 10 * k * s); ad(b, 'canelaTras', -10 * k * s);
    }
  }
  function pendulos(b, t) {
    const L = b.def.pendulos;
    if (L) for (const id in L) if (b._partes[id]) ad(b, id, L[id][0] * Math.sin(TAU * L[id][1] * t + id.length) - acumulado(b, id));
  }
  function plantar(b) {
    const P = b.pose, k = P.apoio == null ? 1 : P.apoio;
    if (k <= 0) return;
    const ang = id => (P.a[id] || 0) + (b.extra.a[id] || 0);
    b.extra.dy -= k * baixo(b, ang, P.rot || 0) * P.escala;
  }
  // fumaça do cachimbo: um fio que sobe ondulando e 3 volutas que se soltam no alto e se desfazem (ciclo de 4 s)
  function fumaca(b, t) {
    const F = b._fumaca;
    if (!F) return;
    const P = b.pose, parte = (P.s.cachimboMao || 0) > .5 ? 'cachimboMao' : 'cachimbo';
    const k = b.M[parte] && (P.s[parte] == null || P.s[parte] > .5) ? Math.max(0, P.fumaca || 0) : 0;
    F.g.style.display = k > .01 ? '' : 'none';
    if (k <= .01) return;
    const [x0, y0] = b.mundo(parte, b.def.fumo[parte]), e = P.escala * (1 + .35 * Math.max(0, k - 1)), H = 70 * e, kv = Math.min(1, k);
    const onda = (u, j) => x0 + e * ((1.5 + 9 * u) * Math.sin(TAU * (1.25 * u - .4 * t) + j * 2.2) + (j ? -3 : 7) * u);
    for (const [a, v] of [['x1', x0], ['y1', y0], ['x2', x0], ['y2', y0 - H]]) F.gr.setAttribute(a, v.toFixed(1));
    F.f.forEach((el, j) => {
      let d = '';
      for (let i = 0; i <= 14; i++) d += (i ? 'L' : 'M') + onda(i / 14, j).toFixed(1) + ' ' + (y0 - H * i / 14).toFixed(1);
      el.setAttribute('d', d);
      el.setAttribute('opacity', (kv * (j ? .7 : 1)).toFixed(2));
    });
    F.v.forEach((el, i) => {
      const u = (((t / 4 + i / 3) % 1) + 1) % 1, y = y0 - H * (.5 + .75 * u), x = onda(.5 + .4 * u, 0);
      el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(-30 + 70 * u).toFixed(0)}) scale(${(e * (.6 + .9 * u)).toFixed(2)})`);
      el.setAttribute('opacity', (kv * .5 * Math.sin(Math.PI * u)).toFixed(3));
      el.style.filter = `blur(${(.4 + 2.2 * u).toFixed(1)}px)`;
    });
  }

  function preparar(b, interno) {
    if (b._ult) return b;
    for (const k in EXTRA) if (b.pose[k] == null) b.pose[k] = EXTRA[k];
    b.estilo = Object.assign({}, ESTILOS[b.nome] || ESTILOS.ze);
    b.pose.andar = Object.assign({}, b.estilo);
    b._partes = {};
    b.def.partes.forEach(p => {
      b._partes[p.id] = p;
      if (b.pose.s[p.id] == null) b.pose.s[p.id] = 1; // valores explícitos: o kit lê o valor atual quando ainda não animou
      if (b.pose.o[p.id] == null) b.pose.o[p.id] = 1;
    });
    b._contatos = contatos(b.def, b._partes);
    b._ancoras = Object.assign({}, b.def.ancoras);
    for (const [k, id] of [['maoF', 'maoFrente'], ['maoT', 'maoTras']]) { const p = b._partes[id]; if (p) b._ancoras[k] = [id, [p.pivo[0] + 5, p.pivo[1] + 12]]; }
    b._ult = JSON.parse(JSON.stringify(b.pose));
    if (!interno) b.motores.push((bb, t) => { mover(bb, t); pendulos(bb, t); plantar(bb); });
    b.atualizar(0);
    return b;
  }
  let nFumo = 0;
  function criar(def, op) {
    const auto0 = def.auto;
    def.auto = (b, t) => { // ordem: motor do elenco → cabelo e boca do bonecos.js → pêndulos → apoio no chão → fumaça
      if (b._ult) mover(b, t);
      if (auto0) auto0(b, t);
      if (b._ult) { pendulos(b, t); plantar(b); fumaca(b, t); }
    };
    const b = B.criar(def, op);
    if (def.fumo) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'), id = 'fumo' + (++nFumo);
      g.setAttribute('fill', 'none'); g.setAttribute('stroke-linecap', 'round'); g.style.filter = 'blur(.6px)';
      g.innerHTML = `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.contorno}" stop-opacity=".55"/>` +
        `<stop offset=".7" stop-color="${C.contorno}" stop-opacity=".2"/><stop offset="1" stop-color="${C.contorno}" stop-opacity="0"/></linearGradient></defs>` +
        `<path stroke="url(#${id})" stroke-width="2.6"/><path stroke="url(#${id})" stroke-width="1.4"/>` +
        [0, 1, 2].map(() => `<path class="v" d="M0 0C-4 -6 2 -13 8 -12C13 -11 13 -4 9 -3C6 -2 5 -6 7 -7" stroke="${C.contorno}" stroke-width="1.8" opacity="0"/>`).join('');
      b.camadas.bonecos.appendChild(g);
      b._fumaca = { g, gr: g.querySelector('linearGradient'), f: [...g.querySelectorAll('path:not(.v)')], v: [...g.querySelectorAll('.v')] };
    }
    return preparar(b, true);
  }

  // ---------- poses: resolução (IK) e interpolação partindo do último valor agendado ----------
  // Quando a timeline é de uma cena com o kit (Sombras.kit.posse), os tweens passam por Sombras.kit.anima e o
  // "valor de partida" vem de Sombras.kit.valor: kit e elenco compartilham o mesmo registro (sem saltos).
  const comKit = new WeakMap();
  function kitDe(tl) {
    if (!S.kit) return false;
    if (!comKit.has(tl)) { let ok = true; try { S.kit.anima(tl, {}, {}, 0, 0); } catch (e) { ok = false; } comKit.set(tl, ok); }
    return comKit.get(tl);
  }
  function prepara(tl, b) { if (!b._ult) preparar(b, false); if (kitDe(tl)) b._kit = 1; }
  function atual(b, g, k) { // último valor agendado de b.pose[g][k] (g = '' para os números do topo)
    const obj = g ? b.pose[g] : b.pose;
    if (b._kit) return S.kit.valor(obj, k);
    const U = g ? b._ult[g] : b._ult;
    return U && U[k] != null ? U[k] : obj[k] != null ? obj[k] : (g === 's' || g === 'o' ? 1 : 0);
  }
  const norm = g => ((((g + 180) % 360) + 360) % 360) - 180;
  function ik(b, ang, a, lado, alvo, absMao) {
    const by = b._partes, br = by['braco' + lado], an = by['antebraco' + lado], mo = by['mao' + lado];
    if (!br || !an || !mo || !alvo) return;
    const S0 = fk(b, ang, br.id, br.pivo), v1 = [an.pivo[0] - br.pivo[0], an.pivo[1] - br.pivo[1]], v2 = [mo.pivo[0] - an.pivo[0], mo.pivo[1] - an.pivo[1]];
    const L1 = Math.hypot(v1[0], v1[1]), L2 = Math.hypot(v2[0], v2[1]), dx = alvo[0] - S0[0], dy = alvo[1] - S0[1];
    const d = Math.max(Math.abs(L1 - L2) + .01, Math.min(L1 + L2 - .01, Math.hypot(dx, dy))), th = Math.atan2(dy, dx);
    const k = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
    const nota = g => Math.sin(g) - .35 * Math.cos(g), g1 = nota(th + k) >= nota(th - k) ? th + k : th - k; // cotovelo para baixo e para trás
    const ex = S0[0] + L1 * Math.cos(g1), ey = S0[1] + L1 * Math.sin(g1);
    const g2 = Math.atan2(S0[1] + d * Math.sin(th) - ey, S0[0] + d * Math.cos(th) - ex);
    let pai = 0;
    for (let p = by[br.pai]; p; p = p.pai && by[p.pai]) pai += (p.ang0 || 0) + ang(p.id);
    const G1 = (g1 - Math.atan2(v1[1], v1[0])) / RAD, G2 = (g2 - Math.atan2(v2[1], v2[0])) / RAD;
    a[br.id] = norm(G1 - pai - (br.ang0 || 0));
    a[an.id] = norm(G2 - G1 - (an.ang0 || 0));
    if (absMao != null) a[mo.id] = norm(absMao - G2 - (mo.ang0 || 0));
  }
  // alvo de mão → coordenadas de repouso do boneco (px), com os ângulos da pose em construção
  function alvoEm(b, v, ang) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') v = { ancora: v };
    if (v.mundo) { const e = atual(b, '', 'escala'); return [(v.mundo[0] - atual(b, '', 'x')) / (atual(b, '', 'dir') * e), (v.mundo[1] - atual(b, '', 'y') - atual(b, '', 'dy')) / e]; }
    const A = b._ancoras[v.ancora];
    if (!A || !b._partes[A[0]]) return null;
    const p = fk(b, ang, A[0], A[1]), d = v.d || [0, 0];
    return [p[0] + d[0], p[1] + d[1]];
  }
  const SUB = ['a', 's', 'o', 'andar'], NAO = ['a', 'maos', 'maoAng', 'parcial', 'bacia'];
  function resolver(b, pose) {
    const nomeada = typeof pose === 'string', P = nomeada ? (POSES[b.nome] || {})[pose] : pose;
    if (!P) throw new Error(`pose desconhecida para ${b.nome}: ${pose}`);
    const completa = nomeada && !P.parcial, base = b._base || (b.def.pose && b.def.pose.a) || {}, a = {};
    const cur = id => atual(b, 'a', id);
    if (completa) for (const k of new Set([...Object.keys(b._ult.a), ...Object.keys(base)])) a[k] = base[k] || 0;
    Object.assign(a, P.a);
    // 'peito' inclina só o tronco: o quadril compensa e as pernas ficam onde estavam ('bacia' gira o quadril no mundo)
    if (!(P.a && 'quadril' in P.a) && (('peito' in a) || P.bacia != null)) {
      const bacia = P.bacia != null ? P.bacia : completa ? (base.peito || 0) + (base.quadril || 0) : cur('peito') + cur('quadril');
      a.quadril = bacia - ('peito' in a ? a.peito : cur('peito'));
    }
    const r = { a };
    for (const k in P) if (!NAO.includes(k)) r[k] = typeof P[k] === 'object' ? Object.assign({}, P[k]) : P[k];
    if (completa) for (const k of ['rot', 'dy', 'boca']) if (r[k] == null) r[k] = 0;
    if (P.maos) {
      const ang = id => (id in a ? a[id] : cur(id));
      for (const lado in P.maos) ik(b, ang, a, lado, alvoEm(b, P.maos[lado], ang), P.maoAng && P.maoAng[lado]);
    }
    return r;
  }
  // tween de b.pose até o alvo: fromTo explícito (immediateRender: false) a partir do último valor agendado
  function ir(tl, b, alvo, t, dur, ease) {
    prepara(tl, b);
    ease = ease || 'power2.inOut';
    const grupos = { '': {} };
    for (const k in alvo) {
      if (alvo[k] == null) continue;
      if (SUB.includes(k)) grupos[k] = Object.assign(grupos[k] || {}, alvo[k]); else grupos[''][k] = alvo[k];
    }
    for (const g in grupos) {
      const para = grupos[g], obj = g ? b.pose[g] : b.pose;
      if (!Object.keys(para).length) continue;
      if (b._kit) S.kit.anima(tl, obj, para, t, dur, ease);
      else {
        const de = {};
        for (const k in para) de[k] = atual(b, g, k);
        tl.fromTo(obj, de, Object.assign({}, para, { duration: dur, ease, immediateRender: false }), t);
      }
      Object.assign(g ? (b._ult[g] = b._ult[g] || {}) : b._ult, para);
    }
    return t + dur;
  }
  const pose = (tl, b, p, t, dur, ease) => { prepara(tl, b); return ir(tl, b, resolver(b, p), t, dur == null ? .5 : dur, ease); };
  function seq(tl, b, t, passos) {
    for (const [p, dur, ease, segura] of passos) t = pose(tl, b, p, t, dur, ease) + (segura || 0);
    return t;
  }
  function set(b, p) { // aplica já (estado inicial, antes de montar a timeline)
    if (!b._ult) preparar(b, false);
    const r = resolver(b, p), U = b._ult;
    for (const k in r) {
      if (SUB.includes(k)) { Object.assign(b.pose[k], r[k]); U[k] = Object.assign(U[k] || {}, r[k]); } else { b.pose[k] = r[k]; U[k] = r[k]; }
    }
    return b;
  }
  // pose de descanso desta instância (para onde as poses nomeadas voltam): 'semArma', 'sentada', 'semMachado'…
  function base(b, p) { if (!b._ult) preparar(b, false); b._base = p ? resolver(b, p).a : null; return b; }
  // vai e volta n vezes em torno do valor agendado e termina onde começou (ângulo de peça ou número da pose)
  function osc(tl, b, t, k, amp, per, n, ease) {
    prepara(tl, b);
    const g = b._partes[k] ? 'a' : '', obj = g ? b.pose.a : b.pose, v = atual(b, g, k);
    tl.fromTo(obj, { [k]: v }, { [k]: v + amp, duration: per / 2, repeat: 2 * n - 1, yoyo: true, ease: ease || 'sine.inOut', immediateRender: false }, t);
    return t + per * n;
  }
  const mostrar = (tl, b, t, s) => ir(tl, b, { s }, t, 0); // troca instantânea de objeto: {fumoMao: 1, facao: 0}
  function ponto(b, nome) { // posição no palco de uma âncora, na última pose agendada (alvo entre bonecos)
    if (!b._ult) preparar(b, false);
    const ang = id => atual(b, 'a', id), p = alvoEm(b, nome, ang), k = atual(b, '', 'apoio'), e = atual(b, '', 'escala');
    return [atual(b, '', 'x') + atual(b, '', 'dir') * e * p[0], atual(b, '', 'y') + atual(b, '', 'dy') + e * (p[1] - k * baixo(b, ang, atual(b, '', 'rot')))];
  }

  // ---------- pegadas controladas pela timeline ----------
  function rastro() {
    const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'), lista = [];
    for (const [k, v] of [['class', 'sb-boneco'], ['width', 1920], ['height', 1080], ['viewBox', '0 0 1920 1080']]) svg.setAttribute(k, v);
    return {
      _tl: 1, camadas: { rastros: svg },
      por(tl, t, x, y, o) {
        o = o || {};
        const u = document.createElementNS(NS, 'use'), dir = o.dir || 1, e = o.escala || 1, op = o.opacidade || .55, dura = o.dura || 6, p = { u, v: 0, ult: null };
        u.setAttribute('href', '#pegada');
        u.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${((o.invertida ? -dir : dir) * e).toFixed(3)} ${(e * (o.achatar || .58) * (o.lado || 1)).toFixed(3)}) rotate(${o.giro || 0})`);
        u.setAttribute('fill', o.cor || C.contorno);
        u.setAttribute('opacity', 0);
        svg.appendChild(u);
        tl.fromTo(p, { v: 0 }, { v: op, duration: .08, ease: 'none', immediateRender: false }, t);
        if (isFinite(dura)) tl.fromTo(p, { v: op }, { v: 0, duration: dura * .35, ease: 'power1.in', immediateRender: false }, t + dura * .65);
        lista.push(p);
        return p;
      },
      atualizar() { for (const p of lista) { const s = p.v.toFixed(3); if (s !== p.ult) { p.ult = s; p.u.setAttribute('opacity', s); } } },
    };
  }
  // pegada no rastro dado: o do elenco (pela timeline) ou o do kit (c.rastros, com t0 absoluto)
  const pegada = (tl, r, t, x, y, o) => (r._tl ? r.por(tl, t, x, y, o) : r.por(x, y, Object.assign({ t0: S.kit.posse(tl).abs(t) }, o)));

  // ---------- objetos soltos (mesmo couro): pena, fumo, novelo, banquinho, chapéus, espingarda… ----------
  function objeto(nome, op) {
    const o = OBJETOS[nome] && OBJETOS[nome]();
    if (!o || !o.formas.length) throw new Error('objeto desconhecido: ' + nome);
    const parte = o.d ? Object.assign({}, o, { id: 'o', pai: null, pivo: [0, 0], junta: false }) : peca('o', null, [0, 0], Object.assign({ local: 1, junta: false }, o));
    return B.criar({ nome: 'obj-' + nome, H: 60, partes: [parte], varetas: [], pose: {} }, Object.assign({ x: 960, y: 800 }, op));
  }

  const OBJETOS = {
    pena: () => ({ formas: [ // pena de arara: vermelha, ponta açafrão e anil
      { p: [[0, 0], [8, -3], [30, -6], [52, -5], [66, -2, 1], [52, 3.5], [30, 5], [8, 3]], cor: C.urucum },
      { p: [[44, -5.4], [52, -5], [66, -2, 1], [52, 3.5], [44, 4.4]], cor: C.acafrao, contorno: 0 },
      { p: [[56, -4], [66, -2, 1], [56, 2.8]], cor: C.anil, contorno: 0 }],
      linhas: [{ p: [[-6, .5], [20, 0], [60, -1.2]], w: 1.2, op: .8 }], furos: [[[20, -4], [21.4, -1], [19.4, -1]], [[36, 3], [37.6, .4], [35.6, .6]]] }),
    fumo: () => ({ formas: [{ p: [[-14, -4], [10, -5], [14, 0], [10, 5], [-14, 4], [-16, 0]], cor: '#5A3418' }], // pedaço de fumo de rolo
      linhas: [{ p: [[-8, -4.5], [-6, 4.5]], w: 1, op: .7 }, { p: [[0, -5], [2, 5]], w: 1, op: .7 }, { p: [[7, -4.5], [8.5, 4.5]], w: 1, op: .7 }] }),
    novelo: () => ({ formas: [{ p: oval(0, 0, 13, 12, 0, 10), cor: '#7C6A34' }],
      linhas: [{ p: [[-10, -7], [-2, -11], [9, -8], [12, 1], [6, 10], [-6, 10], [-12, 1], [-6, -5], [4, -6], [7, 3], [0, 7], [-5, 1]], w: 1.4, op: .7 }] }),
    banquinho: () => ({ formas: [ // tamborete de três pés (assento na altura do sentar da Vó)
      { p: [[[-22, -2, 1], [-17, -50, 1], [-13, -50, 1], [-15, -2, 1]], [[22, -2, 1], [16, -50, 1], [12, -50, 1], [15, -2, 1]], [[-2.5, -2, 1], [-2, -50, 1], [2, -50, 1], [2.5, -2, 1]]], cor: C.madeiraClara },
      { p: [[-27, -56], [-12, -60], [12, -60], [27, -56], [28, -51], [12, -49], [-12, -49], [-28, -51]], cor: C.madeiraClara }],
      linhas: [{ p: [[-20, -55], [0, -56.4], [20, -55]], op: .4 }, { p: [[-16, -26, 1], [14, -26, 1]], w: 2.6, op: .9 }] }),
  };
  const dePeca = (fn, id) => () => { const p = fn().partes.find(q => q.id === id); return p ? { formas: p.formas, linhas: p.linhas, furos: p.furos, d: 1 } : { formas: [] }; };
  OBJETOS.chapeuZe = dePeca(defZe, 'chapeuMao');
  OBJETOS.chapeuTiao = dePeca(B.defs.tiao, 'chapeu');
  OBJETOS.espingarda = dePeca(B.defs.tiao, 'espingarda');
  OBJETOS.machado = dePeca(B.defs.curupira, 'machado');
  OBJETOS.cipo = dePeca(defZe, 'cipo');
  OBJETOS.facao = dePeca(defZe, 'facao');
  const partida = lado => () => { // espingarda quebrada ao meio: cada metade é a arma inteira com a outra metade vazada
    const o = OBJETOS.espingarda(), q = [[60, -40], [64, -8], [57, -3], [63, 2], [59, 40]].map(p => p.join(' ')).join('L');
    o.furos = (o.furos || []).concat([lado > 0 ? `M-200 -40L${q}L-200 40Z` : `M400 -40L${q}L400 40Z`]);
    return o;
  };
  OBJETOS.canoPartido = partida(1);
  OBJETOS.coronhaPartida = partida(-1);

  // ---------- poses nomeadas ----------
  // Graus com o boneco olhando para +x: positivo gira no sentido horário (tronco e cabeça para a frente, braço e
  // perna para trás); negativo leva braço e perna para a frente e para cima. 'peito' inclina só o tronco (o quadril
  // compensa); 'bacia' gira o quadril. maos: alvo do PULSO (IK), em px de repouso (chão y = 0; frente +x).
  const POSES = {
    ze: {
      neutra: {},
      alerta: { a: { peito: -1, cabeca: -8 }, maos: { Frente: [26, -196] }, maoAng: { Frente: -36 } },
      apontar: { a: { cabeca: -4 }, maos: { Tras: [116, -272] }, maoAng: { Tras: -96 } },
      agachado: { a: { peito: 30, cabeca: -18, pernaFrente: -100, canelaFrente: 124, pernaTras: -22, canelaTras: 128 }, maos: { Frente: [52, -130], Tras: [42, -122] }, maoAng: { Frente: -30 } },
      lerRastro: { a: { peito: 46, cabeca: 8, pernaFrente: -104, canelaFrente: 128, pernaTras: -24, canelaTras: 130 }, maos: { Tras: [90, -16], Frente: [52, -112] }, maoAng: { Tras: -60, Frente: -20 } },
      base: { a: { peito: 6, cabeca: 2, pernaFrente: -24, canelaFrente: 12, pernaTras: 22, canelaTras: 6 } },
      medir: { a: { peito: 8, cabeca: 4, pernaFrente: -24, canelaFrente: 12, pernaTras: 22, canelaTras: 6 }, maos: { Frente: [84, -214], Tras: [26, -202] }, maoAng: { Frente: -68 } },
      golpeArma: { a: { peito: -10, cabeca: -4, pernaFrente: -26, canelaFrente: 16, pernaTras: 24, canelaTras: 6 }, maos: { Frente: [-8, -340], Tras: [38, -236] }, maoAng: { Frente: -205 } },
      golpe: { a: { peito: 18, cabeca: 8, pernaFrente: -30, canelaFrente: 20, pernaTras: 26, canelaTras: 4 }, maos: { Frente: [88, -196], Tras: [16, -214] }, maoAng: { Frente: -62 } },
      cuspir: { a: { peito: 8, cabeca: 10 }, maos: { Tras: { ancora: 'boca', d: [-4, 20] } }, maoAng: { Tras: -170 } },
      esfregar: { a: { peito: 6, cabeca: 8 }, maos: { Frente: [30, -206], Tras: [34, -212] }, maoAng: { Frente: -80, Tras: -100 } },
      trofeu: { a: { peito: -6, cabeca: -12, pernaFrente: -74, canelaFrente: 72, pernaTras: 10, canelaTras: 2 }, maos: { Frente: [14, -372], Tras: { ancora: 'cintura', d: [-12, 22] } }, maoAng: { Frente: -160 } },
      estender: { maos: { Frente: [98, -246] }, maoAng: { Frente: -90 } },
      pedir: { a: { cabeca: -4 }, maos: { Frente: [88, -216] }, maoAng: { Frente: -110 } },
      medo: { a: { peito: -12, cabeca: 12, pernaFrente: -6, canelaFrente: 18, pernaTras: 16, canelaTras: 12 }, maos: { Frente: [40, -284], Tras: [48, -276] }, maoAng: { Frente: -120, Tras: -130 } },
      encolhido: { a: { peito: 12, cabeca: 18, pernaFrente: -16, canelaFrente: 26, pernaTras: 8, canelaTras: 22 }, maos: { Frente: [30, -200], Tras: [28, -246] }, maoAng: { Frente: -40, Tras: -150 } },
      colado: { a: { peito: -8, cabeca: -8 }, bacia: 2, maos: { Frente: [-26, -176], Tras: [-30, -182] } },
      subir1: { a: { peito: 14, cabeca: -16, pernaFrente: -84, canelaFrente: 100, pernaTras: 6, canelaTras: 24 }, maos: { Frente: [30, -392], Tras: [22, -338] } },
      subir2: { a: { peito: 14, cabeca: -16, pernaFrente: -20, canelaFrente: 40, pernaTras: -74, canelaTras: 96 }, maos: { Frente: [26, -334], Tras: [26, -396] } },
      agarrado: { a: { peito: 20, cabeca: 6, pernaFrente: -58, canelaFrente: 84, pernaTras: -36, canelaTras: 70 }, maos: { Frente: [36, -302], Tras: [30, -292] } },
      noOco: { a: { peito: 42, cabeca: 34, pernaFrente: -128, canelaFrente: 152, pernaTras: -120, canelaTras: 148 }, maos: { Frente: [50, -100], Tras: [46, -96] } },
      sentadoChao: { a: { peito: 8, cabeca: 6, pernaFrente: -98, canelaFrente: 6, pernaTras: -92, canelaTras: 12 }, maos: { Frente: [40, -128], Tras: [30, -122] }, maoAng: { Frente: 20 } },
      arrancarAlto: { a: { peito: -6, cabeca: -18 }, maos: { Frente: [34, -410] }, maoAng: { Frente: -180 } },
      arrancarPuxa: { a: { peito: 16, cabeca: 6, pernaFrente: -14, canelaFrente: 24, pernaTras: 14, canelaTras: 16 }, maos: { Frente: [44, -228], Tras: [36, -246] }, maoAng: { Frente: -100 } },
      enrolar: { a: { peito: 10, cabeca: 16 }, maos: { Frente: [38, -214], Tras: [40, -224] }, maoAng: { Frente: -90, Tras: -110 } },
      erguerNovelo: { a: { peito: -6, cabeca: -20 }, maos: { Frente: [44, -372] }, maoAng: { Frente: -170 } },
      chapeuPeito: { a: { peito: 6, cabeca: 10 }, maos: { Frente: { ancora: 'peito', d: [-14, 22] } }, maoAng: { Frente: -80 } },
      reverencia: { a: { peito: 12, cabeca: 26 }, maos: { Frente: { ancora: 'peito', d: [-14, 22] } }, maoAng: { Frente: -80 } },
      deixar: { a: { peito: 50, cabeca: 14, pernaFrente: -100, canelaFrente: 126, pernaTras: -24, canelaTras: 130 }, maos: { Frente: [96, -14], Tras: [50, -110] }, maoAng: { Frente: -70 } },
      exausto: { a: { peito: 18, cabeca: 22, canelaFrente: 12, canelaTras: 10, bracoFrente: 4, antebracoFrente: -6, bracoTras: 2, antebracoTras: -6 } },
      sonambulo: { a: { peito: -4, cabeca: -12, bracoFrente: -52, antebracoFrente: -14, maoFrente: 10, bracoTras: -46, antebracoTras: -16 } },
      comemorar: { a: { peito: -8, cabeca: -14 }, maos: { Frente: [16, -398], Tras: [4, -392] }, maoAng: { Frente: -150 } },
      rir: { a: { peito: -12, cabeca: -20 }, maos: { Tras: { ancora: 'cintura', d: [-6, 26] } } },
      pontaDosPes: { a: { peito: 10, cabeca: 4 }, maos: { Frente: [36, -258], Tras: [26, -264] }, maoAng: { Frente: -150, Tras: -150 } },
      caidoCostas: { rot: -84, a: { peito: -6, cabeca: -12, pernaFrente: -24, canelaFrente: 36, pernaTras: -10, canelaTras: 22 }, maos: { Frente: [-20, -210], Tras: [-10, -220] } },
      caidoFrente: { rot: 80, a: { peito: 6, cabeca: -24, pernaFrente: 10, canelaFrente: 30, pernaTras: 20, canelaTras: 40 }, maos: { Frente: [70, -250], Tras: [60, -240] } },
      olharCima: { parcial: 1, a: { cabeca: -24 } }, olharBaixo: { parcial: 1, a: { cabeca: 22 } }, olharFrente: { parcial: 1, a: { cabeca: -1 } },
    },
    tiao: {
      neutra: {},
      semArma: { s: { espingarda: 0 }, a: { bracoFrente: 4, antebracoFrente: -12, maoFrente: 0, bracoTras: 6, antebracoTras: -10 } },
      estufado: { a: { peito: -6, cabeca: -8 }, maos: { Tras: { ancora: 'queixo', d: [-6, 16] } }, maoAng: { Tras: -160 } },
      armaAoCeu: { a: { peito: -4, cabeca: -16, espingarda: 0 }, maos: { Frente: [36, -330] }, maoAng: { Frente: -82 } },
      mirar: { a: { peito: 6, cabeca: 14, espingarda: 0 }, maos: { Frente: [26, -276], Tras: [124, -276] }, maoAng: { Frente: 0, Tras: -80 } },
      mirarAlto: { a: { peito: -10, cabeca: -22, espingarda: 0 }, maos: { Frente: [22, -300], Tras: [96, -352] }, maoAng: { Frente: -42, Tras: -120 } },
      agachadoMira: { a: { peito: 14, cabeca: 16, pernaFrente: -58, pernaTras: 52, espingarda: 0 }, maos: { Frente: [30, -270], Tras: [124, -266] }, maoAng: { Frente: 0, Tras: -80 } },
      lerRastro: { a: { peito: 52, cabeca: 4, pernaFrente: -52, pernaTras: 46 }, maos: { Tras: [92, -30] }, maoAng: { Tras: -40 } },
      apontar: { a: { cabeca: -4 }, maos: { Tras: [116, -262] }, maoAng: { Tras: -92 } },
      rir: { a: { peito: -12, cabeca: -22 } },
      palmas: { maos: { Tras: { ancora: 'maoF', d: [4, 0] } }, maoAng: { Tras: -100 } },
      palmasAbre: { maos: { Tras: { ancora: 'maoF', d: [34, 12] } }, maoAng: { Tras: -80 } },
      cocar: { a: { cabeca: 8 }, maos: { Tras: { ancora: 'topo', d: [-10, 26] } }, maoAng: { Tras: -170 } },
      cocarBarba: { a: { peito: -6, cabeca: -8 }, maos: { Tras: { ancora: 'queixo', d: [-6, 16] } }, maoAng: { Tras: -160 } },
      chapeuPeito: { a: { peito: 10, cabeca: 12 }, maos: { Tras: { ancora: 'peito', d: [-16, 20] } }, maoAng: { Tras: -80 } },
      derrotado: { a: { peito: 20, cabeca: 24 }, maos: { Tras: { ancora: 'peito', d: [-16, 20] } }, maoAng: { Tras: -80 } },
      protegerBornal: { a: { peito: 14, cabeca: 12 }, maos: { Tras: { ancora: 'bornal', d: [18, -4] } }, maoAng: { Tras: -40 } },
      noBornal: { a: { peito: 10, cabeca: 16 }, maos: { Tras: { ancora: 'bornal', d: [6, 8] } }, maoAng: { Tras: 10 } },
      oferecer: { a: { peito: 4 }, maos: { Tras: [96, -222] }, maoAng: { Tras: -100 } },
      estender: { a: { peito: 4 }, maos: { Tras: [96, -232] }, maoAng: { Tras: -90 } },
      colado: { a: { peito: -8, cabeca: -8 }, maos: { Tras: [-30, -170] } },
      encolhido: { a: { peito: 14, cabeca: 18 }, maos: { Tras: [24, -232] }, maoAng: { Tras: -150 } },
      medo: { a: { peito: -10, cabeca: 10, pernaFrente: -6, pernaTras: 10 }, maos: { Tras: [40, -276] }, maoAng: { Tras: -130 } },
      subir1: { a: { peito: 12, cabeca: -14, pernaFrente: -64, pernaTras: 8 }, maos: { Tras: [26, -392] }, maoAng: { Tras: -180 } },
      subir2: { a: { peito: 12, cabeca: -14, pernaFrente: -18, pernaTras: -50 }, maos: { Tras: [30, -340] }, maoAng: { Tras: -180 } },
      agarrado: { a: { peito: 18, cabeca: 10, pernaFrente: -40, pernaTras: -24 }, maos: { Tras: [34, -296] } },
      sentadoChao: { a: { peito: 16, cabeca: 6, pernaFrente: -88, pernaTras: -82 }, maos: { Tras: [-20, -120] } },
      deixar: { a: { peito: 56, cabeca: 10, pernaFrente: -50, pernaTras: 44 }, maos: { Tras: [98, -20] }, maoAng: { Tras: -50 } },
      pena: { a: { peito: -6, cabeca: -26 }, maos: { Tras: [66, -380] }, maoAng: { Tras: -170 } },
      penaChapeu: { a: { cabeca: 6 }, maos: { Tras: { ancora: 'chapeu', d: [-14, 20] } }, maoAng: { Tras: -150 } },
      susto: { a: { peito: -10, cabeca: -14, pernaFrente: -20, pernaTras: 20 }, maos: { Tras: [40, -306] }, maoAng: { Tras: -150 } },
      exausto: { a: { peito: 16, cabeca: 20 } },
      caidoCostas: { rot: -84, a: { peito: -6, cabeca: -12, pernaFrente: -24, pernaTras: -8 }, maos: { Tras: [-20, -220] } },
      caidoFrente: { rot: 80, a: { peito: 6, cabeca: -24, pernaFrente: 10, pernaTras: 20 }, maos: { Tras: [60, -240] } },
      olharCima: { parcial: 1, a: { cabeca: -24 } }, olharBaixo: { parcial: 1, a: { cabeca: 22 } }, olharFrente: { parcial: 1, a: { cabeca: -2 } },
    },
    vo: {
      neutra: {},
      sentada: { o: { pernaFrente: 1, pernaTras: 1 }, a: { peito: 4, cabeca: -4, pernaFrente: -94, canelaFrente: 94, pernaTras: -88, canelaTras: 90 }, bacia: -4,
        maos: { Frente: [52, -116], Tras: [40, -100] }, maoAng: { Frente: -60, Tras: -20 } },
      deixar: { a: { peito: 34, cabeca: 10 }, maos: { Frente: [86, -10] }, maoAng: { Frente: -40 } },
      pegarCachimbo: { maos: { Frente: { ancora: 'boca', d: [-6, 14] } }, maoAng: { Frente: -160 } },
      apontarCachimbo: { a: { cabeca: -4 }, maos: { Frente: [88, -196] }, maoAng: { Frente: -96 } },
      advertir: { a: { cabeca: -2 }, maos: { Frente: [44, -226] }, maoAng: { Frente: -180 } },
      enrolar: { a: { peito: 12, cabeca: 14 }, maos: { Frente: [40, -150], Tras: [44, -158] }, maoAng: { Frente: -90, Tras: -110 } },
      cruzAlto: { maos: { Frente: [52, -238] }, maoAng: { Frente: -175 } }, cruzBaixo: { maos: { Frente: [54, -148] }, maoAng: { Frente: -150 } },
      cruzTras: { maos: { Frente: [30, -194] }, maoAng: { Frente: -175 } }, cruzFrente: { maos: { Frente: [84, -196] }, maoAng: { Frente: -150 } },
      acenar: { maos: { Frente: [44, -246] }, maoAng: { Frente: -175 } },
      contar: { a: { cabeca: -4 }, maos: { Frente: [62, -170], Tras: [52, -160] }, maoAng: { Frente: -110, Tras: -100 } },
      pitar: { parcial: 1, a: { cabeca: -8 } },
      olharCima: { parcial: 1, a: { cabeca: -18 } }, olharBaixo: { parcial: 1, a: { cabeca: 16 } }, olharFrente: { parcial: 1, a: { cabeca: -3 } },
    },
    curupira: {
      neutra: {},
      semMachado: { s: { machado: 0 }, a: { bracoFrente: 10, antebracoFrente: -14, maoFrente: 0 } },
      farejar: { a: { peito: -8, cabeca: -20 } },
      medirSe: { maos: { Tras: { ancora: 'topo', d: [-2, 14] } }, maoAng: { Tras: -110 } },
      agachar: { a: { peito: 30, cabeca: -6, pernaFrente: -58, peFrente: 46, pernaTras: 42, peTras: -36 }, maos: { Frente: [44, -30], Tras: [50, -34] }, maoAng: { Frente: 90 } },
      erguer: { a: { peito: -6, cabeca: -10, pernaFrente: -22, peFrente: 18, pernaTras: 20, peTras: -16 }, maos: { Frente: [4, -222], Tras: [16, -218] }, maoAng: { Frente: -40, Tras: -170 } },
      arremesso: { a: { peito: 22, cabeca: 6, pernaFrente: -30, peFrente: 24, pernaTras: 28, peTras: -20 }, maos: { Frente: [78, -168], Tras: [82, -158] }, maoAng: { Frente: 60, Tras: -80 } },
      assobiar: { a: { cabeca: -6 }, boca: .3, maos: { Tras: { ancora: 'boca', d: [-3, 12] } }, maoAng: { Tras: -170 } },
      escutar: { a: { peito: 16, cabeca: 26 }, maos: { Frente: [40, -110] }, maoAng: { Frente: 60 } },
      baterArma: { a: { peito: -8, cabeca: 10 }, maos: { Frente: [-4, -196] }, maoAng: { Frente: -40 } },
      baterGolpe: { a: { peito: 12, cabeca: 16 }, maos: { Frente: [52, -120] }, maoAng: { Frente: 88 } },
      apontar: { a: { cabeca: -4 }, maos: { Tras: [72, -134] }, maoAng: { Tras: -84 } },
      cravarAlto: { a: { peito: -10, cabeca: -8 }, maos: { Frente: [8, -226] }, maoAng: { Frente: -10 } },
      cravar: { a: { peito: 26, cabeca: 12, pernaFrente: -26, peFrente: 20, pernaTras: 22, peTras: -18 }, maos: { Frente: [46, -44] }, maoAng: { Frente: 180 } },
      estufado: { a: { peito: -10, cabeca: -10 }, maos: { Frente: { ancora: 'cintura', d: [4, 20] }, Tras: { ancora: 'cintura', d: [-18, 18] } }, maoAng: { Frente: 150, Tras: 150 } },
      sentado: { apoio: 0, a: { peito: -2, cabeca: -4, pernaFrente: -64, peFrente: 30, pernaTras: -54, peTras: 26 }, maos: { Tras: [-12, -76] } },
      sentadoChao: { a: { peito: 12, cabeca: 16, pernaFrente: -96, peFrente: 22, pernaTras: -88, peTras: 18 }, maos: { Frente: [40, -98], Tras: [46, -104] }, maoAng: { Frente: 70 } },
      desenrolar: { a: { peito: 14, cabeca: 22, pernaFrente: -96, peFrente: 22, pernaTras: -88, peTras: 18 }, maos: { Frente: [44, -96], Tras: [48, -100] }, maoAng: { Frente: 70, Tras: -100 } },
      machadoErguido: { a: { peito: -8, cabeca: -14, pernaFrente: -12, pernaTras: 14 }, maos: { Frente: [16, -238] }, maoAng: { Frente: -20 } },
      uivar: { a: { peito: -12, cabeca: -42 }, boca: 1, maos: { Frente: [-8, -150], Tras: [-4, -146] } },
      rir: { a: { peito: -8, cabeca: -24 }, boca: .9 },
      cheirar: { a: { cabeca: 8 }, maos: { Tras: { ancora: 'nariz', d: [2, 12] } }, maoAng: { Tras: -170 } },
      acenarFumo: { maos: { Tras: [30, -232] }, maoAng: { Tras: -175 } },
      cintura: { maos: { Tras: { ancora: 'cintura', d: [-2, 18] } }, maoAng: { Tras: -20 } },
      orelha: { a: { cabeca: 6 }, maos: { Tras: { ancora: 'orelha', d: [2, 16] } }, maoAng: { Tras: -170 } },
      cocar: { a: { cabeca: 10 }, maos: { Tras: { ancora: 'topo', d: [-8, 18] } }, maoAng: { Tras: -170 } },
      peSola: { a: { pernaFrente: -36, peFrente: -24, cabeca: 14 } },
      baterPe: { a: { pernaFrente: -30, peFrente: 6 } },
      medo: { a: { peito: -10, cabeca: 10 }, maos: { Tras: [30, -150] } },
      olharCima: { parcial: 1, a: { cabeca: -24 } }, olharBaixo: { parcial: 1, a: { cabeca: 20 } }, olharFrente: { parcial: 1, a: { cabeca: -5 } },
    },
  };

  // ---------- gestos: (tl, boneco, t, opções) → instante em que o gesto termina ----------
  const cap = s => s[0].toUpperCase() + s.slice(1);
  const volta = (tl, b, t, o, dur) => (o.volta === false ? t : pose(tl, b, o.volta || 'neutra', t, dur == null ? .5 : dur));
  const maoLivre = b => (b.nome === 'ze' ? 'Frente' : 'Tras'); // Zé gesticula com a mão da frente; os outros com a de trás
  const G = {
    // andar: {ate (x), dur, passos, modo: andar|correr|pontaDosPes|sonambulo|cansado|saltitar|calcanhar|ligeiro,
    //         noLugar (anda parado: use com a câmera do kit), deCostas (recua sem virar), rastro (E.rastro() ou c.rastros), invertida}
    andar(tl, b, t, o) {
      const est = Object.assign({}, b.estilo), md = MODOS[o.modo || 'andar'] || {};
      for (const k in md) est[k] = (est[k] || 0) * md[k];
      Object.assign(est, o.estilo);
      const x0 = atual(b, '', 'x'), x1 = o.ate == null ? x0 : o.ate, dist = Math.abs(x1 - x0), sentido = x1 >= x0 ? 1 : -1;
      if (dist && !o.deCostas && (atual(b, '', 'dir') >= 0 ? 1 : -1) !== sentido) t = G.virar(tl, b, t, {});
      const dur = o.dur || Math.max(.5, (dist || est.vel * 1.5) / est.vel), q = Math.min(.25, dur / 2);
      const passos = o.passos || Math.max(1, Math.round((dist || est.vel * dur) / est.passo)), p0 = atual(b, '', 'passo');
      ir(tl, b, { andar: { pernas: est.pernas, bracos: est.bracos, joelho: est.joelho, salto: est.salto, inclinacao: est.inclinacao, cabeca: est.cabeca } }, t, 0);
      ir(tl, b, { marcha: o.marcha || 1 }, t, q, 'sine.inOut');
      ir(tl, b, { passo: p0 + passos / 2 }, t, dur, o.ease || 'none');
      if (dist && !o.noLugar) ir(tl, b, { x: x1 }, t, dur, 'none');
      ir(tl, b, { marcha: 0 }, t + dur - q, q, 'sine.inOut');
      if (o.rastro && dist) { // um pé pousa nas fases ¼ e ¾ do ciclo; pegada à frente do corpo, alternando os lados
        const y = atual(b, '', 'y'), e = atual(b, '', 'escala'), inv = o.invertida == null ? b.nome === 'curupira' : o.invertida;
        for (let f = Math.ceil((p0 - .25) * 2) / 2 + .25, k = 0; f < p0 + passos / 2; f += .5, k++) {
          if (f <= p0) continue;
          const u = (f - p0) / (passos / 2), lado = k % 2 ? 1 : -1;
          pegada(tl, o.rastro, t + u * dur, x0 + (x1 - x0) * u + sentido * est.passo * .45 * e, y + 4 + 3 * lado,
            { dir: sentido, invertida: inv, lado, escala: Math.sqrt(b.def.H / 190) * e, giro: lado * 4, dura: o.dura || 6 });
        }
      }
      return t + dur;
    },
    correr: (tl, b, t, o) => G.andar(tl, b, t, Object.assign({ modo: 'correr' }, o)),
    virar(tl, b, t, o) { // scaleX 1 → −1 com o boneco desgrudando um pouco da tela no meio
      const d = o.dur || .14, z = atual(b, '', 'z');
      ir(tl, b, { dir: -atual(b, '', 'dir') }, t, d, 'power2.inOut');
      ir(tl, b, { z: z + .25 }, t, d / 2, 'power2.out');
      return ir(tl, b, { z }, t + d / 2, d / 2, 'power2.in');
    },
    falar(tl, b, t, o) { const d = o.dur || 2; ir(tl, b, { fala: 1 }, t, .15, 'sine.inOut'); return ir(tl, b, { fala: 0 }, t + Math.max(.15, d - .2), .2, 'sine.inOut'); },
    tremer(tl, b, t, o) { const d = o.dur || .6; ir(tl, b, { tremor: o.amp || 1 }, t, .08, 'none'); return ir(tl, b, { tremor: 0 }, t + Math.max(.08, d - .25), .25, 'power1.in'); },
    apontar(tl, b, t, o) { return volta(tl, b, pose(tl, b, 'apontar', t, .35, 'back.out(1.6)') + (o.segura == null ? 1.2 : o.segura), o); },
    rir(tl, b, t, o) { // cabeça para trás e os ombros sacudindo
      const d = o.dur || 1.4, u = pose(tl, b, 'rir', t, .25, 'power2.out');
      osc(tl, b, u, 'peito', -2.5, .16, Math.max(1, Math.round((d - .3) / .16)));
      return volta(tl, b, t + d, o);
    },
    comemorar(tl, b, t, o) { const u = pose(tl, b, 'comemorar', t, .3, 'back.out(1.8)'); return volta(tl, b, osc(tl, b, u, 'dy', -12, .3, o.n || 3) + (o.segura || .2), o); },
    recuar(tl, b, t, o) { // susto: recua, desgruda da tela (fica maior e desfocado) e treme
      const x = atual(b, '', 'x'), dir = atual(b, '', 'dir'), z0 = atual(b, '', 'z');
      pose(tl, b, 'medo', t, .14, 'power3.out');
      ir(tl, b, { x: x - dir * (o.dx == null ? 34 : o.dx) }, t, .2, 'power3.out');
      ir(tl, b, { z: o.z == null ? .3 : o.z }, t, .25, 'power3.out');
      ir(tl, b, { tremor: 1 }, t, .1);
      const fim = t + (o.dur || 1.6);
      ir(tl, b, { tremor: .3 }, fim - .5, .5);
      if (o.volta === false) return fim;
      ir(tl, b, { z: z0 }, fim, .6); ir(tl, b, { tremor: 0 }, fim, .4);
      return pose(tl, b, o.volta || 'neutra', fim, .6);
    },
    agachar: (tl, b, t, o) => pose(tl, b, o.pose || (b.nome === 'curupira' ? 'agachar' : 'lerRastro'), t, o.dur || .5) + (o.segura || 0),
    levantar(tl, b, t, o) { if (b._base && o.base !== false && b.nome === 'vo') base(b, null); return pose(tl, b, o.pose || 'neutra', t, o.dur || .6); },
    lerRastro(tl, b, t, o) { // agacha, examina o chão (a cabeça corre o rastro) e levanta
      let u = pose(tl, b, 'lerRastro', t, .7);
      u = osc(tl, b, u + .2, 'cabeca', 7, .9, o.n || 2);
      return volta(tl, b, u + (o.segura || .3), o, .7);
    },
    cair(tl, b, t, o) { // gira sobre os pés até o chão, com quique (o apoio mantém o corpo no chão)
      const u = pose(tl, b, o.para === 'frente' ? 'caidoFrente' : 'caidoCostas', t, o.dur || .55, 'bounce.out');
      return o.volta ? pose(tl, b, o.volta, u + (o.segura || 1), .8) : u;
    },
    subir(tl, b, t, o) { // escala até ate = [x, y]: o y de apoio sobe junto (a sapopema vira o chão)
      const n = o.lances || 3, dur = o.dur || 1.6, h = dur / n;
      ir(tl, b, { x: o.ate[0] }, t, dur, 'sine.inOut');
      ir(tl, b, { y: o.ate[1] }, t, dur, 'power1.inOut');
      for (let i = 0; i < n; i++) pose(tl, b, i % 2 ? 'subir2' : 'subir1', t + i * h, h, 'sine.inOut');
      return o.volta === false ? t + dur : pose(tl, b, o.volta || 'agarrado', t + dur, .4);
    },
    descer(tl, b, t, o) { // desce até ate = [x, y] (o chão) e se apruma
      const n = o.lances || 2, dur = o.dur || 1.1, h = dur / n;
      ir(tl, b, { x: o.ate[0] }, t, dur, 'sine.inOut');
      ir(tl, b, { y: o.ate[1] }, t, dur, 'power2.in');
      for (let i = 0; i < n; i++) pose(tl, b, i % 2 ? 'subir1' : 'subir2', t + i * h, h, 'sine.inOut');
      return volta(tl, b, t + dur, o, .4);
    },
    encolher(tl, b, t, o) {
      const u = pose(tl, b, o.pose || 'encolhido', t, .35, 'power2.out');
      ir(tl, b, { tremor: o.tremor == null ? .35 : o.tremor }, t, .2);
      const fim = u + (o.segura == null ? 1.5 : o.segura);
      if (o.volta === false) return fim;
      ir(tl, b, { tremor: 0 }, fim, .3);
      return pose(tl, b, o.volta || 'neutra', fim, .5);
    },
    sentar(tl, b, t, o) { // Vó no banquinho; Zé no chão ou encolhido no oco ({oco: true}); Curupira no chão ou no galho ({galho: true})
      const nome = o.pose || (b.nome === 'vo' ? 'sentada' : o.oco ? 'noOco' : o.galho ? 'sentado' : 'sentadoChao');
      const u = pose(tl, b, nome, t, o.dur || .8);
      if (b.nome === 'vo') base(b, 'sentada');
      return u;
    },
    tirarChapeu(tl, b, t, o) { // a mão vai ao chapéu, o chapéu passa da cabeça para a mão e desce ao peito (o.para: outra pose)
      const m = maoLivre(b);
      let u = pose(tl, b, { maos: { [m]: { ancora: 'chapeu', d: [-8, 30] } }, maoAng: { [m]: -170 } }, t, .35);
      mostrar(tl, b, u, b.nome === 'ze' ? { chapeu: 0, chapeuMao: 1, facao: 0 } : { chapeu: 0, chapeuMao: 1 });
      if (b._partes.topete) ir(tl, b, { o: { topete: 1 } }, u, 0);
      u = pose(tl, b, o.para || 'chapeuPeito', u + .05, .5);
      return u + (o.segura || 0);
    },
    porChapeu(tl, b, t, o) {
      const m = maoLivre(b);
      let u = pose(tl, b, { maos: { [m]: { ancora: 'chapeu', d: [-8, 30] } }, maoAng: { [m]: -170 } }, t, .4);
      mostrar(tl, b, u, b.nome === 'ze' ? { chapeu: 1, chapeuMao: 0, facao: o.facao === false ? 0 : 1 } : { chapeu: 1, chapeuMao: 0 });
      if (b._partes.topete) ir(tl, b, { o: { topete: 0 } }, u, 0);
      return volta(tl, b, u + .05, o);
    },
    maoNoOmbro(tl, b, t, o) { // {em: outro boneco}: pousa a mão no ombro dele
      const m = maoLivre(b), p = ponto(o.em, 'ombro');
      return pose(tl, b, { maos: { [m]: { mundo: [p[0] - 4 * atual(b, '', 'dir'), p[1] + 12] } }, maoAng: { [m]: -80 } }, t, o.dur || .45) + (o.segura || 0);
    },
    agarrar(tl, b, t, o) { // {em: outro boneco}: segura o braço dele (o ombro serve de alvo)
      const m = maoLivre(b), p = ponto(o.em, 'ombro');
      return pose(tl, b, { a: { peito: 6 }, maos: { [m]: { mundo: [p[0], p[1] + 36] } }, maoAng: { [m]: -60 } }, t, o.dur || .25, 'power3.out') + (o.segura || 0);
    },
    tranco(tl, b, t, o) { // sacode a mão do outro do ombro: tranco curto do tronco
      const pe = atual(b, 'a', 'peito'), qu = atual(b, 'a', 'quadril');
      ir(tl, b, { a: { peito: pe - 9, quadril: qu + 9 } }, t, .08, 'power3.out');
      return ir(tl, b, { a: { peito: pe, quadril: qu } }, t + .12, .3, 'power2.out');
    },
    pedir: (tl, b, t, o) => pose(tl, b, b.nome === 'tiao' ? 'estender' : 'pedir', t, o.dur || .45, 'power2.out') + (o.segura || 0),
    oferecer(tl, b, t, o) { // estende a mão com o objeto (o.objeto: fumoMao, novelo…) e segura
      if (o.objeto) mostrar(tl, b, t, { [o.objeto]: 1 });
      return pose(tl, b, b.nome === 'tiao' ? 'oferecer' : 'pedir', t, o.dur || .5, 'power2.out') + (o.segura || 0);
    },
    cocar(tl, b, t, o) { // {onde: 'cabeca' | 'barba'}: coça com os dedos (Tião: barba; todos: cabeça)
      const u = pose(tl, b, o.onde === 'barba' ? 'cocarBarba' : 'cocar', t, .35);
      return volta(tl, b, osc(tl, b, u, 'mao' + maoLivre(b), 14, .2, o.n || 4), o);
    },
    palmas(tl, b, t, o) { // palmas devagar: a mão de trás bate na da frente (Tião segura a arma com a outra)
      let u = t;
      for (let i = 0; i < (o.n || 3); i++) { u = pose(tl, b, 'palmasAbre', u, .22, 'sine.inOut'); u = pose(tl, b, 'palmas', u, .16, 'power3.in') + .14; }
      return volta(tl, b, u, o);
    },
    deixar(tl, b, t, o) { // abaixa e deixa o objeto da mão no chão (o.objeto some da mão; a cena põe E.objeto no lugar)
      const nome = b.nome === 'vo' && b._base ? { maos: { Frente: [86, -12] }, maoAng: { Frente: -40 }, a: { peito: 24, cabeca: 10 } } : b.nome === 'curupira' ? 'agachar' : 'deixar';
      let u = pose(tl, b, nome, t, o.dur || .6) + .15;
      if (o.objeto) mostrar(tl, b, u, { [o.objeto]: 0 });
      return volta(tl, b, u + (o.segura || .2), o, .6);
    },
    olhar: (tl, b, t, o) => pose(tl, b, 'olhar' + cap(o.para || 'cima'), t, o.dur || .4),
    acenar(tl, b, t, o) { // aceno lento; {comprido: true} estica o antebraço (a falsa Vó)
      const m = b.nome === 'vo' ? 'Frente' : maoLivre(b);
      let u = pose(tl, b, b.nome === 'vo' ? 'acenar' : { maos: { [m]: { ancora: 'ombro', d: [30, -60] } }, maoAng: { [m]: -175 } }, t, .5);
      if (o.comprido) ir(tl, b, { s: { ['antebraco' + m]: 1.55 } }, t, .5);
      u = osc(tl, b, u, 'antebraco' + m, -22, o.per || .9, o.n || 3);
      return volta(tl, b, u, o);
    },

    // Tião
    mirar(tl, b, t, o) { // do ombro, a arma passa pelo alto (não varre o corpo) e desce devagar até a mira
      const d = o.dur || .9, alvo = o.agachado ? 'agachadoMira' : o.alto ? 'mirarAlto' : 'mirar';
      const doOmbro = atual(b, 'a', 'espingarda') < -10;
      const u = doOmbro && alvo !== 'mirarAlto' ? pose(tl, b, 'mirarAlto', t, d * .45, 'power2.in') : t;
      return pose(tl, b, alvo, u, doOmbro && alvo !== 'mirarAlto' ? d * .55 : d, 'power2.out') + (o.segura || 0);
    },
    atirar(tl, b, t, o) { // coice: o tranco joga tronco, cabeça e cano para trás; {desvio: true} o cano escapa para o alto
      const k = o.desvio ? 2.6 : 1, x = atual(b, '', 'x'), dir = atual(b, '', 'dir'), A = {};
      for (const p of ['peito', 'quadril', 'cabeca', 'espingarda', 'bracoFrente']) A[p] = atual(b, 'a', p);
      ir(tl, b, { a: { peito: A.peito - 8, quadril: A.quadril + 8, cabeca: A.cabeca - 6, espingarda: A.espingarda - 10 * k, bracoFrente: A.bracoFrente - 5 * k } }, t, .06, 'power4.out');
      ir(tl, b, { x: x - dir * 9 }, t, .06, 'power4.out');
      ir(tl, b, { x }, t + .3, .45, 'power2.inOut');
      return ir(tl, b, { a: A }, t + .06 + (o.segura == null ? .3 : o.segura), .5, 'power2.inOut');
    },
    ombro: (tl, b, t, o) => pose(tl, b, 'neutra', t, o.dur || .7),
    armaAoCeu: (tl, b, t, o) => pose(tl, b, 'armaAoCeu', t, o.dur || .6, 'back.out(1.4)') + (o.segura || 0),
    largar(tl, b, t, o) { // larga a espingarda no chão: a mão abre embaixo e a arma some (a cena põe E.objeto('espingarda'))
      let u = pose(tl, b, { a: { peito: 10 }, maos: { Frente: [46, -150] }, maoAng: { Frente: 70 } }, t, .3);
      mostrar(tl, b, u, { espingarda: 0 });
      base(b, 'semArma');
      return pose(tl, b, o.volta || 'neutra', u + .1, .4);
    },
    remexerBornal(tl, b, t, o) { // a mão revira o bornal e sai com o fumo, tremendo
      let u = pose(tl, b, 'noBornal', t, .4);
      u = osc(tl, b, u, 'antebracoTras', 12, .2, o.n || 4);
      mostrar(tl, b, u, { fumoMao: 1 });
      ir(tl, b, { tremor: .6 }, u, .1);
      u = pose(tl, b, 'oferecer', u, .6);
      return ir(tl, b, { tremor: 0 }, u + (o.segura || .6), .3);
    },
    pegarPena(tl, b, t, o) { // apanha a pena no ar (o.em: [x, y] no palco) e a enfia na fita do chapéu
      let u = pose(tl, b, o.em ? { a: { cabeca: -20 }, maos: { Tras: { mundo: o.em } }, maoAng: { Tras: -170 } } : 'pena', t, .3, 'power3.out');
      mostrar(tl, b, u, { pena: 1 });
      u = pose(tl, b, 'penaChapeu', u + .2, .5);
      mostrar(tl, b, u, { pena: 0, penaChapeu: 1 });
      return volta(tl, b, u + .2, o);
    },
    penaNoChapeu(tl, b, t, o) { // tira a pena da fita (ela passa para a mão): {devolve: true} faz o contrário
      const u = pose(tl, b, 'penaChapeu', t, .45);
      mostrar(tl, b, u, o.devolve ? { pena: 0, penaChapeu: 1 } : { pena: 1, penaChapeu: 0 });
      return volta(tl, b, u + .15, o);
    },

    // Zé
    golpear(tl, b, t, o) { // golpes de facão: arma acima da cabeça, golpe seco e pose de impacto (o.impactos = instantes exatos)
      const imp = o.impactos || Array.from({ length: o.n || 3 }, (_, i) => t + .45 + i * .6);
      let u = t;
      for (const ti of imp) {
        const a0 = Math.max(u, ti - .4);
        pose(tl, b, 'golpeArma', a0, Math.max(.06, ti - .15 - a0), 'power2.out');
        u = pose(tl, b, 'golpe', ti - .13, .13, 'power4.in') + .2;
      }
      return volta(tl, b, u, o);
    },
    medir(tl, b, t, o) { const u = pose(tl, b, 'medir', t, .5); return osc(tl, b, u, 'maoFrente', -7, .26, o.n || 2) + (o.segura || .3); },
    cuspir(tl, b, t, o) { // cospe na mão e esfrega uma na outra
      let u = pose(tl, b, 'cuspir', t, .3);
      u = osc(tl, b, u, 'cabeca', 6, .16, 1);
      u = pose(tl, b, 'esfregar', u + .08, .25);
      return volta(tl, b, osc(tl, b, u, 'antebracoTras', 10, .14, o.n || 3), o);
    },
    trofeu: (tl, b, t, o) => pose(tl, b, 'trofeu', t, o.dur || .5, 'back.out(1.4)') + (o.segura || 0),
    arrancar(tl, b, t, o) { // estica o braço ao cipó, agarra e puxa: o cipó fica na mão
      mostrar(tl, b, t, { facao: 0 });
      let u = pose(tl, b, 'arrancarAlto', t, .5);
      mostrar(tl, b, u, { cipo: 1 });
      u = pose(tl, b, 'arrancarPuxa', u + .15, .18, 'power3.in');
      return u + (o.segura || .3);
    },
    enrolar(tl, b, t, o) { // mãos girando uma em volta da outra; o novelo cresce de o.de até o.ate (s) e gira mais rápido
      const d = o.dur || 2, g0 = atual(b, '', 'giro');
      let u = pose(tl, b, 'enrolar', t, .4);
      mostrar(tl, b, u, { cipo: 0, facao: 0, arruda: 0, novelo: o.de == null ? .3 : o.de });
      ir(tl, b, { enrolar: 1 }, u, .25);
      ir(tl, b, { giro: g0 + (o.voltas || 7) }, u, d, o.acelera === false ? 'none' : 'power1.in');
      ir(tl, b, { s: { novelo: o.ate || 1 } }, u, d, 'power1.out');
      return ir(tl, b, { enrolar: 0 }, u + d - .25, .25);
    },
    erguer: (tl, b, t, o) => pose(tl, b, 'erguerNovelo', t, o.dur || .6, 'power2.out') + (o.segura || 0),
    apontarQueixo(tl, b, t, o) {
      const c = atual(b, 'a', 'cabeca');
      ir(tl, b, { a: { cabeca: c - 16 } }, t, .14, 'power3.out');
      return ir(tl, b, { a: { cabeca: c } }, t + .14 + (o.segura || .5), .4);
    },
    reverencia: (tl, b, t, o) => G.tirarChapeu(tl, b, t, Object.assign({ para: 'reverencia' }, o)),
    embainhar(tl, b, t, o) { // guarda o facão na cintura ({tirar: true} faz o contrário)
      const u = pose(tl, b, { maos: { Frente: { ancora: 'cintura', d: [-22, 8] } }, maoAng: { Frente: o.tirar ? 160 : 170 } }, t, .35);
      mostrar(tl, b, u, o.tirar ? { facao: 1, facaoCintura: 0 } : { facao: 0, facaoCintura: 1 });
      return volta(tl, b, u + .05, o, .4);
    },

    // Vó
    pitar(tl, b, t, o) { // baforada: a fumaça engrossa e sobe mais
      let u = t;
      for (let i = 0; i < (o.n || 1); i++) {
        pose(tl, b, 'pitar', u, .3); ir(tl, b, { fumaca: 2.4 }, u + .1, .3, 'power2.out');
        pose(tl, b, 'olharFrente', u + .5, .6); u = ir(tl, b, { fumaca: 1 }, u + .4, 1.4, 'sine.inOut');
      }
      return u;
    },
    apontarCachimbo(tl, b, t, o) { // tira o cachimbo da boca e aponta com ele; {devolve: true} põe de volta no fim
      let u = pose(tl, b, 'pegarCachimbo', t, .35);
      mostrar(tl, b, u, { cachimbo: 0, cachimboMao: 1, arruda: 0 });
      u = pose(tl, b, 'apontarCachimbo', u + .1, .45, 'power2.out') + (o.segura == null ? 1.2 : o.segura);
      if (!o.devolve) return u;
      u = pose(tl, b, 'pegarCachimbo', u, .45);
      mostrar(tl, b, u, { cachimbo: 1, cachimboMao: 0, arruda: 1 });
      return volta(tl, b, u + .05, o);
    },
    advertir(tl, b, t, o) { // dedo em riste, com doçura: o dedo balança devagar
      mostrar(tl, b, t, { maoFrente: 0, dedoFrente: 1, arruda: 0, cachimboMao: 0 });
      let u = pose(tl, b, 'advertir', t, .4, 'power2.out');
      u = osc(tl, b, u, 'antebracoFrente', 9, .5, o.n || 3);
      u = volta(tl, b, u + (o.segura || .2), o);
      mostrar(tl, b, u, { maoFrente: 1, dedoFrente: 0, arruda: o.arruda === false ? 0 : 1 });
      return u;
    },
    benzer(tl, b, t, o) { // o ramo de arruda descreve uma cruz lenta, em quatro tempos (o.tempo = 0,6 s cada)
      const T = o.tempo || .6;
      mostrar(tl, b, t, { arruda: 1, novelo: 0, cachimboMao: 0 });
      let u = pose(tl, b, 'cruzAlto', t, .35);
      for (const p of ['cruzBaixo', 'cruzTras', 'cruzFrente']) u = pose(tl, b, p, u, T, 'sine.inOut');
      return volta(tl, b, u + .15, o, .5);
    },
    contar: (tl, b, t, o) => volta(tl, b, osc(tl, b, pose(tl, b, 'contar', t, .5), 'antebracoFrente', -10, .8, o.n || 2), o),

    // Curupira
    surgir(tl, b, t, o) { // vem grande e desfocado (longe da tela, junto da luz) e pousa nítido no papel
      const d = o.dur || 1.2;
      ir(tl, b, { z: 1, opacidade: 0 }, t, 0);
      ir(tl, b, { opacidade: 1 }, t, d * .4, 'power1.out');
      return ir(tl, b, { z: 0 }, t, d, 'expo.out');
    },
    sumir(tl, b, t, o) { // giro de 360° visto de perfil (dir = cos) e se afasta da tela até sumir
      const d = o.dur || .5, dir = atual(b, '', 'dir');
      ir(tl, b, { dir: -dir }, t, .2, 'sine.inOut');
      ir(tl, b, { dir }, t + .2, .2, 'sine.inOut');
      return ir(tl, b, { z: 1, opacidade: 0 }, t, d, 'expo.in');
    },
    assobiar: (tl, b, t, o) => volta(tl, b, pose(tl, b, 'assobiar', t, .25) + (o.dur || 1), o),
    baterSapopema(tl, b, t, o) { // encosta o ouvido, bate com o machado em cada instante de o.batidas e acena: a árvore aguenta
      const bs = (o.batidas || [t + .8, t + 1.4, t + 2]).filter(tb => tb > t + .2); // pancadas antes do gesto: ignoradas
      let u = pose(tl, b, 'escutar', t, Math.max(.06, Math.min(.4, (bs[0] || t + 1) - t - .2)));
      for (const tb of bs) {
        const a0 = Math.max(u, tb - .38);
        pose(tl, b, 'baterArma', a0, Math.max(.06, tb - .14 - a0), 'power2.out');
        u = pose(tl, b, 'baterGolpe', tb - .12, .12, 'power4.in') + .14;
      }
      u = pose(tl, b, 'escutar', u, .35);
      if (o.acena !== false) u = osc(tl, b, u + .3, 'cabeca', 10, .4, 2);
      return volta(tl, b, u, o);
    },
    cheirar(tl, b, t, o) { // fareja; {fumo: true} com o fumo no nariz; {amansa: true} as mechas baixam
      if (o.fumo) mostrar(tl, b, t, { fumoMao: 1 });
      let u = pose(tl, b, o.fumo ? 'cheirar' : 'farejar', t, .35);
      u = osc(tl, b, u, 'cabeca', -4, .18, o.n || 4);
      if (o.amansa) ir(tl, b, { furia: -.5 }, u - .5, 1.2);
      return volta(tl, b, u + (o.segura || .2), o);
    },
    farejar(tl, b, t, o) { // estica o corpo, cheira o ar e vira a cabeça para um lado e para o outro
      let u = pose(tl, b, 'farejar', t, .4);
      u = osc(tl, b, u, 'cabeca', -4, .18, 3);
      u = osc(tl, b, u + .1, 'cabeca', 12, 1, 1);
      return volta(tl, b, u, o);
    },
    desenrolar(tl, b, t, o) { // sentado, gira o novelo e desenrola: o novelo encolhe (o cipó se espalha no chão: cena)
      const d = o.dur || 2.4, g0 = atual(b, '', 'giro');
      mostrar(tl, b, t, { novelo: 1 });
      let u = pose(tl, b, 'desenrolar', t, .4);
      ir(tl, b, { enrolar: 1 }, u, .25);
      ir(tl, b, { giro: g0 - (o.voltas || 6) }, u, d, 'none');
      ir(tl, b, { s: { novelo: o.ate == null ? .45 : o.ate } }, u, d, 'power1.in');
      return ir(tl, b, { enrolar: 0 }, u + d - .25, .25);
    },
    rirDentes: (tl, b, t, o) => G.rir(tl, b, t, o),
    medirSe: (tl, b, t, o) => volta(tl, b, pose(tl, b, 'medirSe', t, .4) + (o.segura == null ? 1 : o.segura), o),
    erguer_curupira(tl, b, t, o) { // agacha, ergue sozinho o tronco acima da cabeça e segura (a cena prende o tronco às mãos)
      if (o.machado !== true) mostrar(tl, b, t, { machado: 0 });
      let u = pose(tl, b, 'agachar', t, .35) + .1;
      return pose(tl, b, 'erguer', u, .55, 'power3.out') + (o.segura || .4);
    },
    arremessar(tl, b, t, o) { const u = pose(tl, b, 'arremesso', t, .18, 'back.out(2)') + .3; return volta(tl, b, u, o); },
    sacudir(tl, b, t, o) { // sacode o corpo inteiro: os pelos arrepiam
      ir(tl, b, { furia: .6 }, t, .1);
      const u = osc(tl, b, t, 'rot', 4, .08, o.n || 6);
      return ir(tl, b, { furia: 0 }, u, .4);
    },
    baterPe(tl, b, t, o) { // ergue o pezinho e bate no chão; {rastro} deixa a pegada no bloco
      let u = pose(tl, b, 'baterPe', t, .2, 'power2.out') + .1;
      u = pose(tl, b, 'neutra', u, .07, 'power4.in');
      if (o.rastro) pegada(tl, o.rastro, u, atual(b, '', 'x') + atual(b, '', 'dir') * 6, atual(b, '', 'y') + 4, { dir: atual(b, '', 'dir') >= 0 ? 1 : -1, invertida: true, escala: atual(b, '', 'escala'), dura: o.dura || 6 });
      return u + .2;
    },
    cravar(tl, b, t, o) { // ergue o machado e crava no chão; {solta: true} larga o cabo e fica de peito estufado
      let u = pose(tl, b, 'cravarAlto', t, .35);
      u = pose(tl, b, 'cravar', u, .15, 'power4.in') + .25;
      if (!o.solta) return u;
      mostrar(tl, b, u, { machado: 0 });
      base(b, 'semMachado');
      return pose(tl, b, 'estufado', u, .5) + (o.segura || 0);
    },
    balancarPes(tl, b, t, o) { const d = o.dur || 3; ir(tl, b, { balanco: 1 }, t, .5); return ir(tl, b, { balanco: 0 }, t + Math.max(.5, d - .5), .5); },
    uivar(tl, b, t, o) { const u = pose(tl, b, 'uivar', t, .5, 'power2.out'); ir(tl, b, { furia: 1 }, t, .5); return volta(tl, b, u + (o.dur || 1.2), o); },
    machadoErguido: (tl, b, t, o) => pose(tl, b, 'machadoErguido', t, o.dur || .4, 'back.out(1.6)') + (o.segura || 0),
    acenarFumo(tl, b, t, o) { // ergue o rolo de fumo num aceno curto
      mostrar(tl, b, t, { fumoMao: 1, fumoCintura: 0 });
      const u = pose(tl, b, 'acenarFumo', t, .35, 'back.out(1.6)');
      return volta(tl, b, osc(tl, b, u, 'antebracoTras', -14, .35, o.n || 1) + .3, o);
    },
    guardar(tl, b, t, o) { // fumo na cintura (padrão) e/ou pena atrás da orelha ({pena: true})
      let u = t;
      if (o.fumo !== false) { mostrar(tl, b, u, { fumoMao: 1 }); u = pose(tl, b, 'cintura', u, .4); mostrar(tl, b, u, { fumoMao: 0, fumoCintura: 1 }); u += .1; }
      if (o.pena) { mostrar(tl, b, u, { penaMao: 1 }); u = pose(tl, b, 'orelha', u, .45); mostrar(tl, b, u, { penaMao: 0, penaOrelha: 1 }); u += .1; }
      return volta(tl, b, u, o);
    },
  };
  // a mesma palavra para personagens diferentes: erguer (Zé ergue o novelo; Curupira, o tronco)
  const erguerZe = G.erguer, erguerCur = G.erguer_curupira;
  G.erguer = (tl, b, t, o) => (b.nome === 'curupira' ? erguerCur : erguerZe)(tl, b, t, o);
  delete G.erguer_curupira;
  for (const k in G) { const f = G[k]; G[k] = (tl, b, t, o) => { prepara(tl, b); return f(tl, b, t, o || {}); }; }

  S.elenco = {
    defs: { ze: defZe, vo: defVo, tiao: defTiao, curupira: defCurupira }, C, ESTILOS, MODOS, POSES, poses: POSES, gestos: G,
    ze: op => criar(defZe(), op), vo: op => criar(defVo(), op), tiao: op => criar(defTiao(), op), curupira: op => criar(defCurupira(), op),
    criar, // criar(def, op): instância de um def alterado (ex.: E.defs.tiao() com chapéu rasgado), com o motor do elenco
    preparar: b => preparar(b, false), pose, seq, set, base, ir, osc, mostrar, ponto, rastro, objeto, resolver, liso, oval, peca,
  };
})();
