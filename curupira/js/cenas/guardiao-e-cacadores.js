/* guardiao-e-cacadores.js — cenas "guardiao" (O dono da mata) e "cacadores" (Caça de gula).
 * Kit: js/cenas/comum.js · elenco: js/elenco-gente.js, js/elenco-bichos.js · cenários: js/cenarios.js.
 * Tempos só por ctx.t / ctx.tf / ctx.sfx. Bichos que voam e objetos que caem andam por trajeto(): a pose é uma
 * função pura do tempo da cena (seek seguro), sem tween; o resto é kit/elenco (fromTo, em ordem).
 * Marcas de palco (x lógico, câmera parada): painéis 72–641 · 675–1245 · 1279–1848; ninguém para a menos de 90 px
 * de um montante. Couro inteiriço: dentro de cada boneco a peça da frente cobre a de trás (sem dupla exposição); o
 * boneco inteiro continua em multiply sobre o papel.
 */
(function () {
  'use strict';
  const S = window.Sombras, TAU = Math.PI * 2;
  const lerp = (a, b, k) => a + (b - a) * k, cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const suave = u => { u = cl(u, 0, 1); return u * u * (3 - 2 * u); };
  const TINTA = '#2B1A0C';

  // pose em função do tempo da cena (T): fn(T) devolve campos da pose ou null (não mexe)
  function trajeto(c, b, fn) { b.motores.unshift((b, t) => { const r = fn(t - c.inicio); if (r) Object.assign(b.pose, r); }); }
  // véu SVG de 1920×1080 numa camada (brilho = luz que soma), atualizado por fn(T, svg)
  function veu(c, camada, html, fn) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [k, v] of [['width', 1920], ['height', 1080], ['viewBox', '0 0 1920 1080']]) svg.setAttribute(k, v);
    svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
    svg.innerHTML = html;
    return c.possuir({ camadas: { [camada]: svg }, atualizar: t => fn(t - c.inicio, svg) });
  }
  // couro inteiriço: as peças deixam de multiplicar umas sobre as outras (juntas sem anel escuro, braço sobre o peito
  // sem camada dupla); a camada dos bonecos continua em multiply sobre o papel
  function inteirico(b) { b.camadas.bonecos.querySelectorAll('[data-p]').forEach(e => { e.style.mixBlendMode = 'normal'; }); return b; }
  // troca as cores de um def (mapa {cor antiga: nova} ou função) antes de criar o boneco
  function tingir(def, mapa) {
    const f = typeof mapa === 'function' ? mapa : c => mapa[c] || c;
    def.partes = def.partes.map(p => Object.assign({}, p, { formas: p.formas.map(x => Object.assign({}, x, x.cor ? { cor: f(x.cor) } : {})) }));
    return def;
  }
  const elipse = (cx, cy, rx, ry) => `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;

  // brasinhas que se soltam do cabelo do Curupira e sobem tremeluzindo: [{t, x, y}]
  function brasas(c, lista) {
    const um = '<g opacity="0"><circle r="9" fill="#FF8A24" opacity=".55" filter="url(#gc-brasa)"/><circle r="3" fill="#FFD27A"/><circle r="1.4" fill="#FFF6D8"/></g>';
    return veu(c, 'brilho', '<defs><filter id="gc-brasa" x="-2" y="-2" width="5" height="5"><feGaussianBlur stdDeviation="4"/></filter></defs>' + lista.map(() => um).join(''), (T, svg) => {
      svg.querySelectorAll(':scope > g').forEach((g, i) => {
        const q = lista[i], u = (T - q.t) / 2.8;
        if (u < 0 || u > 1) { g.setAttribute('opacity', 0); return; }
        const x = q.x + (q.dx || -40) * u + 14 * Math.sin(u * 9 + i) * u, y = q.y - 210 * u + 30 * u * u;
        g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(1.1 - .7 * u).toFixed(2)})`);
        g.setAttribute('opacity', (Math.min(1, u * 10) * (1 - u * u) * (.7 + .3 * Math.sin(T * 31 + i * 2))).toFixed(3));
      });
    });
  }

  // redemoinho de folhas secas: funil que gira rente ao chão e corre de x0 a x1 entre T0 e T1 (função do tempo)
  function redemoinho(c, T0, T1, x0, x1) {
    const n = 16, r = S.rng(77), sem = Array.from({ length: n }, () => [r(), r(), r(), .75 + r() * .35]);
    const folha = '<path d="M-14 0C-9 -6.4 5 -7 14 0C5 7 -9 6.4 -14 0Z" fill="#3A2614"/><path d="M-13 0H12" stroke="#E8C890" stroke-width="1" opacity=".55"/>';
    return veu(c, 'bonecos', sem.map(() => `<g opacity="0">${folha}</g>`).join(''), (T, svg) => {
      const k = (T - T0) / (T1 - T0), gs = svg.children;
      for (let i = 0; i < n; i++) {
        const g = gs[i], [a, b, f, e] = sem[i];
        if (k <= 0 || k >= 1) { if (g._v !== 0) { g._v = 0; g.setAttribute('opacity', 0); } continue; }
        const cx = lerp(x0, x1, k) + 24 * Math.sin(T * 1.7), h = 6 + 150 * a * (.55 + .45 * Math.sin(Math.PI * k)), R = 12 + h * .45;
        const th = TAU * (1.5 + b) * T + f * TAU, z = Math.sin(th);
        const x = cx + R * Math.cos(th), y = 800 - h + 8 * z;
        g._v = 1;
        g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(th * 80 % 360).toFixed(0)}) scale(${(e * (.8 + .2 * z)).toFixed(2)} ${(e * (.4 + .5 * Math.abs(Math.cos(th * 1.3)))).toFixed(2)})`);
        g.setAttribute('opacity', (Math.min(1, k * 8, (1 - k) * 6) * (.9 + .1 * z)).toFixed(3));
      }
    });
  }

  // inhambu: ave de chão, gorda, cauda curtinha, bico fino; voo de bater rápido (pose.voo 0..1)
  function inhambu(op) {
    const L = S.elenco.liso, pena = '#8C5E34', claro = '#C2905A', escuro = '#4A3020';
    const corpo = L([[24, -15], [17, -21], [4, -22], [-10, -19], [-21, -13], [-28, -6], [-30, -1], [-23, 3], [-11, 8], [3, 9], [15, 6], [22, 0], [26, -7]]);
    const cabeca = L([[17, -17], [20, -25], [27, -29], [34, -27], [36.5, -22.5], [33, -18], [27, -14]]);
    const asa = (k, cor) => ({ formas: [{ d: L([[4, 2], [0, -10], [-8, -22], [-20, -30], [-33, -31], [-27, -22], [-29, -16], [-20, -8], [-12, 0]].map(([x, y]) => [x * k, y * k])), cor, vazado: { motivo: 'g-espinha', escala: .55, margem: 2.5 } }] });
    const partes = [
      Object.assign({ id: 'asaL', pai: 'corpo', pivo: [6, -14], junta: false, atras: 1 }, asa(.9, escuro)),
      { id: 'pes', pai: 'corpo', pivo: [2, 8], junta: false, formas: [{ d: 'M-1 0L1 0L4 9L8 10L8 11.4L2 11L-2 1Z', cor: escuro }] },
      { id: 'corpo', pivo: [0, 0], formas: [{ d: corpo, cor: pena }, { d: cabeca, cor: pena }, { d: 'M34 -25.6L45 -22L34.6 -20.2Z', cor: escuro },
        { d: L([[2, -2], [12, -6], [20, -4], [14, 4], [2, 6], [-8, 4]]), cor: claro, contorno: 0 }],
        furos: ['M28.6 -24.2a1.6 1.6 0 1 0 .1 0Z'], linhas: [{ d: 'M-22 -6C-12 -10 0 -12 12 -11M-18 0C-8 -3 4 -4 14 -3', w: .9, op: .45 }] },
      Object.assign({ id: 'asaP', pai: 'corpo', pivo: [6, -14], junta: false }, asa(1, '#A87244')),
    ];
    const b = S.bonecos.criar({
      nome: 'inhambu', H: 40, partes, varetas: [{ parte: 'corpo', ponto: [0, 0], mestra: true }], pose: { voo: 0 },
      auto(b, t) {
        const v = b.pose.voo, a = Math.sin(TAU * 10 * t);
        b.extra.a.asaP = v * (-38 + 46 * a); b.extra.a.asaL = v * (-30 + 40 * Math.sin(TAU * 10 * t - .4)); b.extra.a.pes = v * 40;
      },
    }, op);
    const v = b.camadas.bonecos.querySelector('.sb-varetas');
    if (v) v.style.opacity = .4;
    return b;
  }

  // Tião com a caça pendurada no bornal (silhuetas escuras, sem sangue): s.caca1…3 de 0 a 1
  function tiaoComCaca(op) {
    const E = S.elenco, def = E.defs.tiao(), esc = '#3B2818', esc2 = '#5A3C24';
    const pecas = [
      ['caca1', [-36, -160], { formas: [ // jacu pendurado pelos pés: corpo, asa caída, pescoço mole e cabeça embaixo
        { p: [[-1.4, 0], [1.4, 0], [2, 7], [7, 12], [10, 22], [9, 33], [4, 41], [-2, 43], [-7, 37], [-9, 26], [-8, 15], [-2, 7]], cor: esc },
        { p: [[-2, 41], [1.6, 41], [2.4, 47], [.4, 54], [-3, 58], [-6.4, 55], [-5, 48]], cor: esc },
        { p: [[6, 15], [13, 21], [16, 31], [13, 36], [8, 28]], cor: esc2 }],
        linhas: [{ p: [[-5, 18], [-6, 28], [-3, 36]], w: .9, op: .4 }] }],
      ['caca2', [-28, -158], { formas: [ // juriti: menor, cauda em leque junto dos pés
        { p: [[-1.2, 0], [1.2, 0], [5, 4], [7, 12], [6, 20], [2, 27], [-3, 28], [-6.6, 22], [-7, 12], [-4, 5]], cor: esc2 },
        { p: [[-2, 1], [-7, -5], [-2, -8], [3, -8], [7, -4], [2, 1]], cor: esc },
        { p: [[-2, 26], [1.4, 26], [1.4, 31], [-1, 35], [-3.6, 31]], cor: esc2 }] }],
      ['caca3', [-44, -162], { formas: [ // cutia pendurada pelas patas de trás: corpo longo, patas da frente soltas, orelhinha
        { p: [[-3, 0], [0, 0], [2, 7], [1, 13], [6, 15], [10, 27], [11, 42], [8, 55], [3, 62], [-4, 60], [-8, 48], [-9, 32], [-7, 18], [-4, 12], [-5, 6]], cor: esc },
        { p: [[0, 60], [5, 62], [6, 70], [3, 78], [-1, 80], [-4, 73], [-3, 65]], cor: esc },
        { p: [[5, 66], [9, 64], [9, 68]], cor: esc2 },
        { p: [[7, 50], [12, 57], [12, 62], [9, 63], [6, 56]], cor: esc2 }],
        linhas: [{ p: [[-6, 22], [-7, 36], [-6, 50]], w: .9, op: .4 }, { p: [[4, 22], [6, 36], [5, 50]], w: .9, op: .35 }] }],
    ];
    for (const [id, pivo, o] of pecas) def.partes.splice(def.partes.findIndex(p => p.id === 'bornal'), 0, E.peca(id, 'peito', pivo, Object.assign({ local: 1, junta: false }, o)));
    def.pose.s = Object.assign({ caca1: 0, caca2: 0, caca3: 0 }, def.pose.s);
    const b = E.preparar(S.bonecos.criar(def, op));
    b.motores.push((b, t) => { // a caça balança no passo
      const m = b.pose.marcha || 0;
      ['caca1', 'caca2', 'caca3'].forEach((id, i) => { b.extra.a[id] = (b.extra.a[id] || 0) + (3 + 7 * m) * Math.sin(TAU * (1.1 + .2 * i) * t + i * 1.7); });
    });
    return inteirico(b);
  }

  // ======================================================================================================
  // O DONO DA MATA — a samaúma de perto (painel da direita), clareira com feixe; o Curupira sai do oco e se apresenta.
  // Marcas: centro do painel do meio (1000) para falar; 960 ao lado da bromélia (820) para se medir; 440 no tronco
  // caído; 1405 encostado na lâmina esquerda da samaúma (pé dela em ~1424); 1030 → 1140 no close dos pés.
  S.cenas.registrar('guardiao', (tl, ctx) => {
    const K = S.kit, E = S.elenco, G = E.gestos, c = K.posse(tl, ctx), p = c.palco, t = ctx.t, tf = ctx.tf, sfx = ctx.sfx;
    const cen = c.possuir(S.cenarios.guardiao(p)), P = cen.pecas, pt = cen.pontos, sam = P.samauma.estado;
    const ESC = 1.35, OCO = pt.samauma.oco[0], CHAO = K.CHAO, MEIO = 1000, XB = 960, XS = 1405, XP = 1030;
    // 01: sai da boca do oco como sombra grande, borrada e meio apagada (z 1 = blur 14 px; escala total ≈ 2,3×),
    // sobre o papel claro à esquerda do tronco (sobre o tronco escuro a sombra não se lê)
    const cur = c.boneco(E.curupira({ x: OCO - 130, y: CHAO, escala: ESC * 1.6, dir: -1, z: 1, opacidade: 0 }));
    const ave = c.boneco(inhambu({ x: pt.moita[0], y: pt.moita[1], escala: 1.5, dir: -1, opacidade: 0 }), { respirar: false });
    const rastro = E.rastro(), meus = [], por = rastro.por; // pegadas que só se apagam no fim (uma a uma)
    rastro.por = function (tl, tt, x, y, o) { const q = por.apply(this, arguments); if (!(o && isFinite(o.dura))) meus.push(q); return q; };
    c.possuir(rastro);
    // pegadas do close: escuras e grandes (opacidade .85)
    const forte = { _tl: 1, por: (tl, tt, x, y, o) => rastro.por(tl, tt, x, y, Object.assign({}, o, { opacidade: .85, achatar: .5 })) };
    const gesto = (nome, tt, o) => G[nome](tl, cur, tt, o || {});
    const pose = (ps, tt, d, e) => E.pose(tl, cur, ps, tt, d, e);

    // 01 · do oco, uma sombra grande e borrada encolhe e ganha nitidez até pousar colada à tela
    const g1 = t('guardiao_01'), [folh] = sfx('folhagem_mexe');
    K.anima(tl, sam, { olhos: 1, oco: .25 }, g1, .3); // o oco se abre em luz; os olhinhos acesos lá dentro
    K.anima(tl, sam, { oco: 1 }, folh + 1.2, .8);
    K.anima(tl, sam, { olhos: 0 }, folh - .2, .3);
    K.anima(tl, sam, { tremor: .7 }, folh, .08); K.anima(tl, sam, { tremor: 0 }, folh + .08, .6);
    K.anima(tl, cur.pose, { opacidade: .78 }, g1 + .1, .5);
    K.anima(tl, cur.pose, { z: 0, escala: ESC }, folh, 1.6, 'power2.inOut');
    K.anima(tl, cur.pose, { opacidade: 1 }, folh + .5, 1.1);

    // 02 · vem saltitando ao centro do painel do meio; estica o corpo, cheira o ar, vira a cabeça para os dois lados
    let u = gesto('andar', folh + 1.7, { ate: MEIO, dur: 2.2, modo: 'saltitar', rastro: c.rastros, dura: 7 });
    u = gesto('farejar', u + .1);
    u = gesto('virar', u + .15); u = gesto('olhar', u + .2, { para: 'cima' });
    u = gesto('virar', u + .3); u = gesto('olhar', u + .1, { para: 'frente' });

    // 03 · mede-se ao lado da bromélia (lado a lado, a 60 px das folhas); ergue o tronco caído e o arremessa (prato)
    u = gesto('andar', Math.max(u + .05, t('guardiao_03') + .1), { ate: XB, dur: .5, modo: 'saltitar', rastro: c.rastros, dura: 7 });
    if (K.valor(cur.pose, 'dir') > 0) u = gesto('virar', u + .1); // de frente para a bromélia
    u = gesto('medirSe', u + .1, { segura: 1.4 });
    const xt = pt.tronco.centro[0] + 110, [prato] = sfx('prato');
    u = gesto('andar', u + .05, { ate: xt, dur: 1.1, modo: 'correr', rastro: c.rastros, dura: 7 });
    const lev = u + .45;                      // fim do agachar: as mãos chegam ao tronco
    u = gesto('erguer', u + .05, { segura: .35 });
    const tr = P.tronco.estado, [tx, ty] = pt.tronco.centro, mao = E.ponto(cur, 'maoF');
    K.anima(tl, tr, { x: mao[0] - tx + 10, y: mao[1] - ty - 26, rot: -5 }, lev, .55, 'power3.out');
    const solta = prato - .62;
    K.anima(tl, tr, { rot: 4 }, lev + .55, solta - lev - .55, 'sine.inOut');
    u = gesto('arremessar', Math.max(u, solta - .16));
    E.mostrar(tl, cur, u, { machado: 1 });
    K.anima(tl, tr, { x: -1250 - tx, rot: -170 }, solta, .62, 'power1.in');
    K.anima(tl, tr, { y: mao[1] - ty - 210 }, solta, .26, 'power2.out');
    K.anima(tl, tr, { y: -40 }, solta + .26, .36, 'power2.in');
    K.abalo(tl, p, prato, .5, 7);

    // 04 · volta ao centro; sacode o corpo (o pelo arrepia) e ri: os dentes verdes aparecem contra a luz
    const [cax] = sfx('caxixi');
    u = gesto('andar', Math.max(u + .1, t('guardiao_04') + .1), { ate: MEIO, dur: 1.1, modo: 'saltitar', rastro: c.rastros, dura: 7 });
    u = gesto('sacudir', Math.max(u, cax - .35), { n: 10 });
    u = gesto('rirDentes', u + .2, { dur: 1.4 });

    // 05 · a chama sobe e acende o cabelo como brasa; duas brasinhas sobem
    const [chama] = sfx('lamparina_chama');
    K.luz(tl, p, { lamparina: 1.45 }, chama, 1, 'power2.out');
    K.anima(tl, cur.pose, { furia: .8 }, chama + .3, .9, 'power2.out');
    gesto('olhar', Math.max(u + .05, chama + .6), { para: 'cima' });
    const topo = E.ponto(cur, 'topo');
    brasas(c, [{ t: chama + 1.2, x: topo[0] - 40, y: topo[1] - 10 }, { t: chama + 2.1, x: topo[0] - 64, y: topo[1] + 6, dx: -70 }]);
    K.luz(tl, p, { lamparina: 1 }, tf('guardiao_05') - 1.6, 1.4);
    K.anima(tl, cur.pose, { furia: 0 }, tf('guardiao_05') - 1.2, 1);
    gesto('olhar', tf('guardiao_05') - 1.2, { para: 'frente' });
    gesto('andar', tf('guardiao_05') - .6, { ate: XP, dur: .5, modo: 'saltitar', rastro: c.rastros, dura: 7 });

    // 06 · a música para; a luz fecha num círculo baixo sobre os pés (chão limpo de 880 a 1180); o boneco encosta
    // na tela até os pés ficarem grandes e nítidos; no bloco, um pezinho bate e deixa a pegada; 1 s parado
    const g6 = t('guardiao_06'), [bloco] = sfx('bloco_madeira'), PX = x => (x - 72) / 17.76, EP = 2.7;
    K.anima(tl, P.feixe.estado, { o: 0 }, g6 - .5, .6);
    K.luz(tl, p, { hotX: PX(XP + 20), hotY: 95, hotRX: 9, hotRY: 6, vinheta: 1, brilho: .85 }, g6 - .45, .8, 'power2.inOut');
    K.anima(tl, cur.pose, { escala: EP }, g6 - .4, .8, 'power2.inOut');
    // pernas abertas e pés 15 % maiores: os dois pés separados, calcanhar para a frente, dedos para trás
    const PASSO = { a: { pernaFrente: -20, peFrente: 14, pernaTras: 24, peTras: -18 }, s: { peFrente: 1.15, peTras: 1.15 } };
    pose(PASSO, g6 - .35, .35);
    pose({ a: { pernaFrente: -38, peFrente: -4, pernaTras: 24, peTras: -18 }, s: { peFrente: 1.15, peTras: 1.15 } }, bloco - .3, .2, 'power2.out');
    pose(PASSO, bloco - .07, .07, 'power4.in');
    forte.por(tl, bloco, XP + 22, CHAO + 4, { dir: 1, invertida: true, escala: EP * 1.1, dura: 11 });

    // 07 · três passos devagar para a direita, de calcanhar: as pegadas ficam com os dedos para a esquerda
    const g7 = t('guardiao_07'), X7 = XP + 110;
    gesto('andar', g7 + .15, { ate: X7, dur: tf('guardiao_07') - g7 - .35, passos: 3, modo: 'calcanhar', rastro: forte, dura: 10 });
    K.luz(tl, p, { hotX: PX(X7 + 30), hotRX: 12 }, g7 + .15, tf('guardiao_07') - g7 - .35, 'sine.inOut');

    // 08 · sai saltitando para a direita; um redemoinho de folhas segue as pegadas no sentido dos dedos (para a esquerda)
    const g8 = t('guardiao_08');
    K.luz(tl, p, 'dia', g8 - .1, 1.2);
    K.anima(tl, P.feixe.estado, { o: 1 }, g8 + .3, 1);
    K.anima(tl, cur.pose, { escala: ESC }, g8, .6, 'power2.inOut');
    pose('neutra', g8, .3);
    u = gesto('andar', g8 + .1, { ate: 2080, dur: 1.7, modo: 'saltitar', rastro: c.rastros, dura: 7.5 });
    redemoinho(c, g8 + .25, tf('guardiao_08') + .3, 1260, 120);

    // 09 · sai do oco, encosta-se na lâmina esquerda da samaúma com o ouvido nela e bate: uma, duas, três (machadinha
    // acima da cabeça a cada número); a árvore inteira vibra; o trovão longe responde e ele acena: a árvore aguenta
    const g9 = t('guardiao_09'), bat = sfx('batida_tronco'), [trovao] = sfx('trovao');
    K.anima(tl, cur.pose, { x: OCO, dir: -1, z: 1, opacidade: 0 }, g9, 0);
    u = gesto('surgir', g9 + .1, { dur: .8 });
    u = gesto('andar', u - .2, { ate: XS, dur: .95, modo: 'saltitar', rastro, dura: Infinity });
    u = gesto('virar', u + .05);
    const ENCOSTA = { rot: 31, a: { peito: 0, cabeca: 22 }, maos: { Frente: [26, -96], Tras: [40, -128] }, maoAng: { Frente: 80, Tras: -40 } };
    const ALTO = { rot: 8, a: { peito: -12, cabeca: 4 }, maos: { Frente: [-2, -238], Tras: [36, -150] }, maoAng: { Frente: -38, Tras: -60 } };
    const GOLPE = { rot: 24, a: { peito: 16, cabeca: 18 }, maos: { Frente: [84, -132], Tras: [34, -140] }, maoAng: { Frente: 96, Tras: -60 } };
    u = pose(ENCOSTA, u + .05, .35, 'sine.inOut');
    for (const tb of bat) {
      const a0 = Math.max(u + .05, tb - .5);
      pose(ALTO, a0, Math.max(.06, tb - .25 - a0), 'power2.out'); // ergue e segura .15 s no alto (antecipação)
      u = pose(GOLPE, tb - .1, .1, 'power4.in') + .06;
      K.anima(tl, sam, { tremor: 1 }, tb, .04); K.anima(tl, sam, { tremor: 0 }, tb + .04, .5, 'power2.out'); K.abalo(tl, p, tb, .25, 2.5);
    }
    u = pose(ENCOSTA, u + .1, .45, 'sine.inOut');
    K.abalo(tl, p, trovao, .9, 1.5);
    u = E.osc(tl, cur, Math.max(u + .1, trovao + .1), 'cabeca', -16, .36, 2); // dois acenos claros
    u = pose('neutra', u + .05, .3);

    // 10 · volta saltitando ao centro e aponta a moita de palma aberta; um inhambu levanta voo
    const [inh] = sfx('inhambu'), mo = pt.moita;
    u = gesto('andar', Math.max(u + .05, t('guardiao_10') + .05), { ate: MEIO, dur: 1.2, modo: 'saltitar', rastro, dura: Infinity });
    if (K.valor(cur.pose, 'dir') > 0) u = gesto('virar', u + .05);
    gesto('apontar', u + .05, { segura: Math.max(.5, inh - u - .25) });
    K.anima(tl, P.moita.estado, { tremor: .8 }, inh - .7, .1); K.anima(tl, P.moita.estado, { tremor: 0 }, inh + .2, .5);
    trajeto(c, ave, T => {
      const k = (T - inh + .1) / 1.7;
      if (k < 0) return { opacidade: 0, voo: 0 };
      if (k > 1) return { opacidade: 0 };
      const e = k * k * (3 - 2 * k) * .7 + k * .3;
      return { opacidade: 1, voo: 1, x: lerp(mo[0] - 10, -120, e) + 40 * Math.sin(k * 3), y: lerp(mo[1] + 10, 120, 1 - (1 - k) * (1 - k)), rot: -18 * (1 - k) };
    });

    // 11 · crava a machadinha no chão e fica imóvel, de peito estufado; as mechas crescem, três brasas; a luz esfria
    const [tam] = sfx('tambor_grave');
    u = gesto('cravar', tam - .5, { solta: true, segura: 0 });
    const mc = P.machado.pose, dm = K.valor(cur.pose, 'dir');  // a lâmina fica fincada onde a mão desceu
    K.anima(tl, mc, { x: K.valor(cur.pose, 'x') + dm * 58 * ESC, y: CHAO + 10, rot: 8 * dm, escala: ESC * 1.05, opacidade: 0 }, 0, 0);
    K.anima(tl, mc, { opacidade: 1 }, tam + .25, 0);
    K.abalo(tl, p, tam, .4, 4);
    K.anima(tl, cur.pose, { furia: 1 }, tam + .5, 1.2, 'power2.out');
    const L = S.palco.LUZES, frio = {};
    for (const k of ['gelR', 'gelG', 'gelB', 'gelOpac', 'saturacao', 'brilho', 'tintaR', 'tintaG', 'tintaB']) frio[k] = lerp(L.dia[k], L.noite[k], .5);
    K.luz(tl, p, frio, tam + .3, 3);
    const tp = E.ponto(cur, 'topo'), d = K.valor(cur.pose, 'dir');
    brasas(c, [{ t: tam + 1.1, x: tp[0] - 30 * d, y: tp[1] - 20, dx: 50 * d }, { t: tam + 2, x: tp[0] - 50 * d, y: tp[1] - 4, dx: 20 * d }, { t: tam + 2.9, x: tp[0] - 24 * d, y: tp[1] - 30, dx: 70 * d }]);

    // 12 · gira sobre si e some num sopro de folhas; as pegadas se apagam uma a uma
    const g12 = t('guardiao_12'), so = P.sopro.estado, sx = K.valor(cur.pose, 'x');
    gesto('sumir', g12 + .6, { dur: 1 });
    K.anima(tl, mc, { opacidade: 0 }, g12 + .6, .7, 'power2.in');
    K.anima(tl, so, { x: sx, y: CHAO - 150, o: 0, p: 0 }, 0, 0);
    K.anima(tl, so, { o: 1 }, g12 + .5, .2);
    K.anima(tl, so, { p: 1 }, g12 + .5, 2.2, 'power1.out');
    K.anima(tl, so, { o: 0 }, g12 + 2.2, .6);
    meus.slice().reverse().forEach((q, i) => tl.fromTo(q, { v: .55 }, { v: 0, duration: .3, ease: 'power1.in', immediateRender: false }, g12 + 1.3 + i * .28));
  });

  // ======================================================================================================
  // CAÇA DE GULA — a mata desliza enquanto entram; o bornal enche; tiro nas araras; os olhos no fundo; a embaúba
  // tomba; de tardinha, no riacho, a veada. Marcas (na tela): Tião 960 → 840, Zé 470 → 1480 → 1725 → 1450, cachorro
  // 780 → 500; olhos e sombra no painel da esquerda (L3); embaúba em 1600, tomba para a esquerda até ~980.
  S.cenas.registrar('cacadores', (tl, ctx) => {
    const K = S.kit, E = S.elenco, G = E.gestos, B = S.bichos, c = K.posse(tl, ctx), p = c.palco, t = ctx.t, tf = ctx.tf, sfx = ctx.sfx;
    const cen = c.possuir(S.cenarios.cacadores(p)), P = cen.pecas, pt = cen.pontos, CHAO = K.CHAO;
    const CE = -950, CA = -700, CB = -100, CC = -4000; // câmera: entrada · parados · depois do bornal cheio · riacho
    const ESCT = 1.1, ESCZ = 1.05;

    const tiao = c.boneco(tiaoComCaca({ x: 250 + CE, y: CHAO, escala: ESCT }));
    const ze = c.boneco(inteirico(E.ze({ x: -160 + CE, y: CHAO, escala: ESCZ })));
    // cachorro e veada em couro mais denso (não somem no papel do entardecer); veada com g-ponto vazado na barriga
    const cao = c.boneco(inteirico(S.bonecos.criar(tingir(B.defs.cachorro({}), { '#DCA066': '#C27A44', '#E6BE86': '#DDA468', '#B86A3E': '#8E4A26' }), { x: 30 + CE, y: CHAO })));
    const dv = tingir(B.defs.veada({}), { '#D08F58': '#A9592B', '#EEDCB6': '#E3AE62' });
    dv.partes.find(q => q.id === 'corpo').formas[0].vazado = { motivo: 'g-ponto', escala: .9, faixa: elipse(10, 31, 30, 9), margem: 2 };
    const veada = c.boneco(inteirico(S.bonecos.criar(dv, { x: -2400, y: CHAO + 4, escala: 1.3, opacidade: 0 })));
    const bando = B.bando(6, { semente: 9, escala: .9 }).map(b => c.boneco(b));
    const ferida = c.boneco(B.arara({ semente: 4, escala: .8 }), { camada: 'L3' });
    // bugios em silhueta de tinta (mata média), sem vareta comprida
    const macacos = [0, 1].map(i => {
      const b = S.bonecos.criar(tingir(B.defs.bugio({ galho: false }), () => '#3A281A'), { escala: .7 - .08 * i, opacidade: 0 });
      b.camadas.bonecos.querySelector('.sb-varetas').style.opacity = 0;
      return c.boneco(inteirico(b), { camada: 'L3', respirar: false });
    });
    // o Curupira à espreita: silhueta de tinta em L3 (cabelo em mechas), olhos acesos por cima (camada de brilho)
    const dsp = S.bonecos.defs.curupira();
    dsp.partes = dsp.partes.filter(q => q.id !== 'olhoAceso').map(q => Object.assign({}, q, { camada: undefined, formas: q.formas.map(f => ({ d: f.d, cor: '#3A2614', contorno: 0 })) }));
    const XO = 300, EO = 1.45, espreita = c.boneco(S.bonecos.criar(dsp, { x: XO + CB * .55, y: CHAO + 10, escala: EO, dir: 1, z: .2, opacidade: 0 }), { camada: 'L3' });
    espreita.camadas.bonecos.querySelector('.sb-varetas').style.opacity = 0;
    const olhar = { o: 0, piscar: 0 };
    veu(c, 'brilho', '<defs><filter id="gc-olho" x="-2" y="-2" width="5" height="5"><feGaussianBlur stdDeviation="5"/></filter></defs>' +
      '<g style="mix-blend-mode:screen;opacity:0"><g filter="url(#gc-olho)" fill="#F2B23A"><ellipse/><ellipse/></g><g fill="#FFF0B8"><ellipse/><ellipse/></g></g>',
    (T, svg) => {
      const g = svg.lastChild, o = olhar.o.toFixed(3);
      if (g._o !== o) { g._o = o; g.style.opacity = o; }
      if (olhar.o < .005) return;
      const k = espreita.pose.escala / EO, [x, y] = espreita.mundo('cabeca', [18.7, -171.6]), x0 = x + p.camera.x * .45; // L3 anda .55 da câmera; o brilho, 1
      const sy = 1 - .92 * olhar.piscar;
      g.querySelectorAll('ellipse').forEach((e, i) => {
        const halo = i < 2, ex = x0 + (i % 2 ? 8 : -7) * k;
        e.setAttribute('cx', ex.toFixed(1)); e.setAttribute('cy', y.toFixed(1));
        e.setAttribute('rx', ((halo ? 12 : 6.5) * k).toFixed(2)); e.setAttribute('ry', ((halo ? 8 : 4.2) * k * sy).toFixed(2));
      });
    });
    const g = (b, nome, tt, o) => G[nome](tl, b, tt, o || {});
    const fx = { o: 0 }, xf = 1520; // feixe de luz por onde a pena desce (até o Tião, em 840)
    veu(c, 'brilho', `<defs><linearGradient id="gc-feixe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6DC" stop-opacity=".95"/><stop offset=".42" stop-color="#FFE9B4" stop-opacity=".38"/><stop offset=".7" stop-color="#FFE9B4" stop-opacity="0"/></linearGradient>` +
      `<filter id="gc-feixef" x="-.5" y="-.2" width="2" height="1.4"><feGaussianBlur stdDeviation="16"/></filter></defs><g filter="url(#gc-feixef)" fill="url(#gc-feixe)" style="mix-blend-mode:screen">` +
      `<path d="M${xf - 60} 40L${xf + 110} 40L${xf - 560} 860L${xf - 830} 860Z"/><path d="M${xf + 150} 40L${xf + 210} 40L${xf - 410} 860L${xf - 520} 860Z" opacity=".7"/></g>`,
    (T, svg) => { const o = fx.o.toFixed(3); if (svg._o !== o) { svg._o = o; svg.style.opacity = o; } });

    // 01 · os três entram pela esquerda (Tião à frente, pesado; o cachorro farejando; Zé atrás, desengonçado) e a mata
    // desliza por trás deles (paralaxe L3 .55, L2 1, L1 1,3)
    const XT0 = 960, XZ0 = 470, XC0 = 780, a0 = 3, a1 = 10.2; // no 01 (luz acesa) os três já estão entrando juntos
    K.camera(tl, p, CE, 0, 0);
    K.camera(tl, p, CA, a0, a1 - a0, 'sine.inOut');
    let u = g(tiao, 'andar', a0, { ate: XT0 + CA, dur: a1 - a0, passos: 12, rastro: c.rastros, dura: 6 });
    g(ze, 'andar', a0 + .2, { ate: XZ0 + CA, dur: a1 - a0 - .5, passos: 10, rastro: c.rastros, dura: 6 });
    const [lat1] = sfx('cachorro_latido');
    K.anima(tl, cao.pose, { fareja: 1 }, a0, .3);
    K.caminhar(tl, cao, { ate: XC0 + CA, t0: a0, t1: a1 - .3 });
    K.anima(tl, cao.pose, { fareja: 0 }, lat1 - .35, .25);
    B.latir(tl, cao, lat1, 1);
    K.anima(tl, cao.pose, { fareja: 1 }, lat1 + .5, .3);

    // 02 · Tião para no centro, apoia a espingarda no ombro e coça a barba, de peito estufado
    u = E.pose(tl, tiao, 'estufado', u + .1, .6);
    u = g(tiao, 'cocar', u + .4, { onde: 'barba', n: 5, volta: 'estufado' });
    const [bl1] = sfx('bloco_madeira');
    E.pose(tl, tiao, 'neutra', Math.max(u + .1, bl1 - .12), .12, 'power3.in');
    g(ze, 'olhar', a1 + .3, { para: 'cima' }); g(ze, 'olhar', a1 + 2, { para: 'frente' });
    K.anima(tl, cao.pose, { fareja: 0, abana: 1 }, a1 - .1, .4);

    // 03 · Zé passa à frente do Tião golpeando o mato à toa; o cachorro olha a mata, depois os donos, e late curto
    const [ago] = sfx('agogo'), [fac1] = sfx('facao_golpe'), lat2 = sfx('cachorro_latido')[1], XZ1 = 1480;
    u = g(ze, 'andar', ago + .1, { ate: XZ1 + CA, dur: 2.6, modo: 'ligeiro', rastro: c.rastros, dura: 6 });
    g(ze, 'golpear', ago + .5, { impactos: [ago + 1.05, fac1] });
    K.anima(tl, cao.pose, { abana: 0, alerta: 1 }, ago + .6, .3);
    K.virar(tl, cao, lat2 - .7);
    B.latir(tl, cao, lat2, 1);

    // 04 · andam no mesmo lugar e a mata desliza (a embaúba entra pela direita); a cada baque, mais uma caça no
    // bornal (começa vazio); na última frase, Tião ergue a espingarda para o céu
    const b4 = t('cacadores_04') + .2, d4 = 4.9, tam = sfx('tambor_grave'), [eng] = sfx('espingarda_engatilhar');
    const XT = 840, XZ = XZ1, XC = 500;
    K.virar(tl, cao, b4 - .3);
    K.anima(tl, cao.pose, { alerta: 0, fareja: .6 }, b4 - .3, .4);
    K.camera(tl, p, CB, b4, d4);
    g(tiao, 'andar', b4, { ate: XT + CB, dur: d4, rastro: c.rastros, dura: 5 });
    g(ze, 'andar', b4, { ate: XZ + CB, dur: d4, rastro: c.rastros, dura: 5 });
    K.caminhar(tl, cao, { ate: XC + CB, t0: b4, t1: b4 + d4 });
    [...tam, tam[1] + (tam[1] - tam[0])].forEach((tt, i) => E.ir(tl, tiao, { s: { ['caca' + (i + 1)]: 1, bornal: 1.06 + .08 * i } }, tt, .28, 'back.out(2.2)'));
    u = g(tiao, 'armaAoCeu', eng - 1.1, { dur: .8 });
    E.osc(tl, tiao, eng, 'maoFrente', -6, .14, 1);
    g(ze, 'olhar', eng - .8, { para: 'cima' });

    // 05 · o estouro: o bando se desfaz, uma arara cai girando atrás das folhas; Tião ri; a pena desce no feixe
    const [tiro] = sfx('tiro_espingarda'), [ri1] = sfx('risada_homem'), hit = [1180, 210];
    g(tiao, 'atirar', tiro, { segura: .25 });
    K.abalo(tl, p, tiro, .35, 6);
    K.luz(tl, p, { brilho: 1.32 }, tiro, .03);
    K.luz(tl, p, { brilho: S.palco.LUZES.dia.brilho }, tiro + .03, .4);
    K.anima(tl, cao.pose, { fareja: 0, medo: 1 }, tiro + .02, .12);
    K.anima(tl, cao.pose, { medo: .35 }, tiro + 1.3, .6);
    g(ze, 'tremer', tiro + .03, { dur: .7 });
    g(tiao, 'rir', ri1, { dur: 1.7 });
    K.anima(tl, fx, { o: 1 }, tiro + .3, 1.6);

    // araras: um voo em função do tempo (tela → mundo: + câmera × paralaxe da camada)
    const T0 = tiro - 2.2, T1 = tiro, TC = t('cacadores_06'), TS = tf('cacadores_06') - 1.4, TF = tf('cacadores_06') + .2;
    const voo = (i, T) => { // posição na tela da arara i
      const dx = -bando[i].dx, dy = bando[i].dy * .8;
      const ante = T => [hit[0] - 150 + (T1 - T) * 430 + dx, hit[1] + 10 * Math.sin(T * 2 + i) + dy];
      if (T <= T1) return ante(T);
      const p0 = ante(T1), vx = (i % 2 ? 1 : -1) * (260 + 60 * i), vy = -140 - 40 * (i % 3), s = T - T1;
      const esp = [p0[0] + vx * s * Math.exp(-s * .6), p0[1] + vy * s * Math.exp(-s * .8)];
      const th = i * TAU / 6 + (T - TC) * TAU / 1.9, rx = 210 + 26 * i, ry = 70 + 9 * i;
      const roda = [hit[0] + rx * Math.cos(th), hit[1] - 20 + ry * Math.sin(th)];
      let q = [lerp(esp[0], roda[0], suave((T - T1) / (TC - T1 + .6))), lerp(esp[1], roda[1], suave((T - T1) / (TC - T1 + .6)))];
      if (T > TS) { const k = (T - TS) / (TF - TS); q = [q[0] + 2200 * k * k, q[1] - 340 * k * k]; }
      return q;
    };
    bando.forEach((b, i) => trajeto(c, b, T => {
      if (T < T0 - .5 || T > TF + .3) return { opacidade: 0 };
      const a = voo(i, T), z = voo(i, T + .03), vx = z[0] - a[0], vy = z[1] - a[1];
      return { opacidade: 1, x: a[0] + CB, y: a[1], dir: Math.tanh(vx / 3), rot: cl(-vy * 4, -24, 24) * Math.sign(vx || 1) };
    }));
    trajeto(c, ferida, T => {
      if (T < T0 - .5 || T > T1 + 1.6) return { opacidade: 0 };
      const par = CB * .55;
      if (T <= T1) { const a = [hit[0] - 150 + (T1 - T) * 430 + 30, hit[1] - 14]; return { opacidade: 1, x: a[0] + par, y: a[1], dir: -1, rot: 0, queda: 0 }; }
      const s = T - T1;
      return { opacidade: cl(1 - (s - 1.1) / .4, 0, 1), queda: 1, x: hit[0] - 120 + 60 * s + par, y: hit[1] - 14 + 40 * s + 380 * s * s, rot: -540 * s, dir: -1 };
    });

    // a pena: desce rodando devagar pelo feixe até a mão do Tião
    const g7 = t('cacadores_07'), pega = g7 + .7, em = [XT + CB + 64, CHAO - ESCT * 372];
    trajeto(c, P.pena, T => {
      const a = tiro + .25, k = (T - a) / (pega + .3 - a);
      if (k < 0 || k > 1) return { opacidade: 0 };
      const w = TAU * .42 * (T - a), e = 1 - (1 - k) * (1 - k);
      return { opacidade: cl(k * 12, 0, 1), escala: .9, x: lerp(hit[0] - 120 + CB, em[0], suave(k)) + 80 * Math.sin(w) * (1 - k), y: lerp(hit[1], em[1], e * .5 + k * .5) + 8 * Math.sin(2 * w), rot: 80 + 38 * Math.sin(w + 1.2) * (1 - k * .6) };
    });

    // 06 · os outros rodam no céu gritando pela que caiu
    g(ze, 'olhar', TC + .3, { para: 'frente' });
    K.anima(tl, cao.pose, { medo: 0, alerta: 1 }, TC + .5, .5);

    // 07 · "Arara não é de comer…": apanha a pena no ar e a enfia na fita do chapéu
    g(tiao, 'falar', g7, { dur: tf('cacadores_07') - g7 });
    u = g(tiao, 'pegarPena', pega, { em, volta: 'estufado' });
    E.pose(tl, tiao, 'neutra', tf('cacadores_07') - .4, .6);
    E.osc(tl, ze, g7 + 3.4, 'cabeca', 7, .55, 2);
    K.anima(tl, fx, { o: 0 }, tf('cacadores_07') - 1.5, 2);

    // 08 · "E a mata ouviu": dois olhos acesos se abrem entre os buritis (painel da esquerda) e piscam; atrás deles, a
    // silhueta borrada; o cachorro se vira para o fundo e se encolhe (traseiro baixo, rabo entre as pernas, cabeça baixa)
    const g8 = t('cacadores_08'), [gon1] = sfx('gongo_grave'), bur = P.buritis.estado;
    K.anima(tl, espreita.pose, { opacidade: .6 }, g8 + .1, .6, 'power1.in');
    K.anima(tl, olhar, { o: 1 }, g8 + .3, .4, 'power1.in');
    K.anima(tl, olhar, { piscar: 1 }, g8 + .9, .08); K.anima(tl, olhar, { piscar: 0 }, g8 + .98, .14);
    K.virar(tl, cao, g8 + .25);
    K.anima(tl, cao.pose, { alerta: 0, medo: 1 }, g8 + .45, .5);
    K.anima(tl, bur, { tremor: .7 }, gon1, .1); K.anima(tl, bur, { tremor: 0 }, gon1 + .1, .9);
    K.anima(tl, olhar, { o: 0 }, gon1 + .3, .5); K.anima(tl, espreita.pose, { opacidade: 0 }, gon1 + .2, .8);
    cao.motores.push(b => { // medo de verdade: o corpo nivela, a cabeça e o focinho descem, as patas da frente recuam
      const m = b.pose.medo || 0;
      if (!m) return;
      const ad = (k, v) => { b.extra.a[k] = (b.extra.a[k] || 0) + v; };
      ad('corpo', 9 * m); ad('pescoco', 16 * m); ad('cabeca', 12 * m); ad('dp', -8 * m); ad('dl', -8 * m); ad('tp', 10 * m); ad('tl', 10 * m); b.extra.dy += 3 * m;
    });

    // 09 · Zé vai para o lado direito da embaúba, cospe nas mãos, abre as pernas e mede o tronco com o facão
    const eb = P.embauba.estado, XE = pt.embauba.base[0] - CB, XG = XE + 125;
    u = g(ze, 'andar', t('cacadores_09') + .1, { ate: XG + CB, dur: 1.6, modo: 'ligeiro', rastro: c.rastros, dura: 6 });
    u = g(ze, 'virar', u + .05);
    u = g(ze, 'cuspir', u + .1);
    g(ze, 'medir', u + .08, { n: 1, segura: .1 });
    g(tiao, 'olhar', t('cacadores_09') + .6, { para: 'frente' });

    // 10 · três golpes; a embaúba range, pivota no corte e tomba de perfil (≈ 1 s, power2.in) atravessando o papel
    // até o painel do meio; folhas palmadas descem girando; os bugios pulam em arco para outras árvores
    const fac = sfx('facao_golpe').slice(1), [range] = sfx('arvore_rangendo'), [cai] = sfx('arvore_caindo'), [mac] = sfx('macaco_gritos');
    u = g(ze, 'golpear', fac[0] - .45, { impactos: fac, volta: false });
    fac.forEach((tt, i) => { K.anima(tl, eb, { golpes: i + 1 }, tt, 0); K.anima(tl, eb, { range: .5 }, tt, .05); K.anima(tl, eb, { range: 0 }, tt + .05, .25); });
    const q0 = fac[2] + .32, qd = cai + .05 - q0;
    K.anima(tl, eb, { range: 1 }, q0 - .02, .02);
    const antes = P.embauba.antes;
    P.embauba.antes = (T, pc, C) => { antes(T, pc, C); Object.assign(eb, { copa: 1, caida: 0, escuroCopa: eb.escuro, escuroCaida: 0 }); };
    K.anima(tl, eb, { queda: 1.035 }, q0, qd, 'power2.in');
    K.anima(tl, eb, { queda: .985 }, q0 + qd, .12, 'power2.out'); K.anima(tl, eb, { queda: 1 }, q0 + qd + .12, .16, 'power1.inOut');
    K.anima(tl, eb, { range: 0 }, cai + .05, .3);
    K.abalo(tl, p, cai + .05, .55, 9);
    E.ir(tl, ze, { x: XG + CB + 40 }, range, .35, 'power3.out');
    E.pose(tl, ze, 'medo', range, .25, 'power3.out');
    g(tiao, 'olhar', range, { para: 'cima' });
    // folhas palmadas: soltam-se da copa no arco da queda e descem girando, balançando
    const corte = pt.embauba.corte, Rc = Math.hypot(pt.embauba.copa[0] - corte[0], pt.embauba.copa[1] - corte[1]);
    let palmada = '';
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * .95 + i * Math.PI * 1.9 / 8, P2 = (r, w) => `${(r * Math.cos(w)).toFixed(1)} ${(r * Math.sin(w)).toFixed(1)}`;
      palmada += `M0 0L${P2(26, a - .13)}Q${P2(36, a)} ${P2(26, a + .13)}Z`;
    }
    palmada += 'M-1.5 0L1.5 0L1 16L-1 16Z';
    const quedas = Array.from({ length: 8 }, (_, i) => ({ k: .3 + i * .09, r: S.hash(i + 501), s: .75 + .4 * S.hash(i + 777) }));
    veu(c, 'bonecos', quedas.map(() => `<path d="${palmada}" fill="${TINTA}" opacity="0"/>`).join(''), (T, svg) => {
      [...svg.children].forEach((e, i) => {
        const f = quedas[i], s = T - (q0 + Math.sqrt(f.k) * qd); // power2.in: a fração f.k do giro chega em √k do tempo
        if (s < 0 || s > 4.2) { if (e._v !== 0) { e._v = 0; e.setAttribute('opacity', 0); } return; }
        const ang = -89 * f.k * Math.PI / 180, R = Rc * (.72 + .25 * f.r), x0 = corte[0] + R * Math.sin(ang) + (f.r - .5) * 120, y0 = corte[1] - R * Math.cos(ang);
        const y = Math.min(CHAO + 4, y0 + 90 * s + 16 * s * s), x = x0 - 40 * s + 34 * Math.sin(2.2 * s + i);
        e._v = 1;
        e.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(f.r * 360 + 160 * s * (i % 2 ? 1 : -1)).toFixed(0)}) scale(${f.s.toFixed(2)} ${(f.s * (.45 + .55 * Math.abs(Math.cos(1.7 * s + i)))).toFixed(2)})`);
        e.setAttribute('opacity', (.82 * Math.min(1, s * 6, (4.2 - s) / .8)).toFixed(3));
      });
    });
    const pos3 = x => x + CB * .55; // tela → camada L3
    const saltos = [[[XE - 40, 300], [1700, 175], [1560, 120]], [[XE + 20, 340], [1345, 160], [1420, 110]]]; // de galho em galho
    macacos.forEach((m, i) => trajeto(c, m, T => {
      const a = mac - .5 + .3 * i, S0 = saltos[i];
      if (T < a - 1.2 || T > t('cacadores_13') + 1) return { opacidade: 0 };
      if (T < a) return { opacidade: cl((T - a + 1.2) / .3, 0, 1) * .9, x: pos3(S0[0][0]), y: S0[0][1], rot: 0, dir: i ? -1 : 1 };
      const s = T - a, j = s < .8 ? 0 : 1, k = j ? cl((s - 1.1) / .6, 0, 1) : cl(s / .8, 0, 1), de = S0[j], ate = S0[j + 1], ar = j ? 70 : 150;
      return { opacidade: .9, x: pos3(lerp(de[0], ate[0], k)), y: lerp(de[1], ate[1], k) - ar * Math.sin(Math.PI * k), rot: (ate[0] > de[0] ? 1 : -1) * 22 * Math.sin(Math.PI * k), dir: ate[0] > de[0] ? 1 : -1 };
    }));

    // 11 · Zé põe o pé no tronco caído, como troféu; Tião bate palmas devagar e os dois riem
    const [bl2] = sfx('bloco_madeira').slice(1), ri2 = sfx('risada_homem')[1], XTR = XE - 150;
    u = g(ze, 'andar', Math.max(bl2 - .3, range + .45), { ate: XTR + CB, dur: .8, modo: 'ligeiro' });
    u = g(ze, 'trofeu', u + .05, { dur: .45 });
    g(ze, 'falar', t('cacadores_11'), { dur: tf('cacadores_11') - t('cacadores_11') });
    g(tiao, 'palmas', bl2 + .2, { n: 3, volta: false });
    const [bug] = sfx('bugio'), riso = Math.max(.6, bug - ri2 - .45); // o riso (+ volta de .5 s) acaba antes do bugio
    g(ze, 'rir', Math.max(u + .05, ri2 - .1), { dur: riso });
    g(tiao, 'rir', ri2, { dur: riso - .1 });

    // 12 · "E a mata ouviu": o bugio ronca bravo; os olhos chegam perto de verdade (escala ×2,5, desfoque 4 → 1 px,
    // opacidade .3 → .6) e a sombra cresce
    const g12 = t('cacadores_12'), d12 = Math.max(1, bug - g12);
    B.roncar(tl, macacos[0], bug - .1, 1.6);
    K.anima(tl, espreita.pose, { opacidade: .3, z: .3 }, g12 - .2, .2);
    K.anima(tl, olhar, { o: 1 }, g12, .3);
    K.anima(tl, espreita.pose, { opacidade: .62, z: .07, escala: EO * 2.5, y: CHAO + 40 }, g12 + .1, d12, 'sine.in');
    g(ze, 'recuar', bug + .1, { dx: 20, z: .12, dur: .9, volta: false });
    g(tiao, 'olhar', bug + .15, { para: 'frente' });

    // 13 · troca de lugar sob a folha: de tardinha, no riacho (painel da esquerda), a veada bebe; Tião se agacha atrás
    // da lâmina comprida da samaúma (cobre até a cintura) e leva a espingarda ao rosto, devagar
    const g13 = t('cacadores_13'), meioF = K.folha(tl, g13 + .55, { dur: .9, de: 'esquerda' });
    const L = S.palco.LUZES, hx = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
    const ambar = Object.assign({}, L.entardecer, { hotX: 46, hotY: 62, hotRX: 70, hotRY: 84, vinheta: .5, gelOpac: .09, saturacao: 1.02, matiz: -3, brilho: 1 });
    for (const [k, h] of [['papelCentro', '#FBE7BA'], ['papelMeio', '#EDB467'], ['papelBorda', '#B0582A'], ['papelCanto', '#3C1709'], ['gel', '#FFB45C'], ['tinta', '#2A1308']])
      [ambar[k + 'R'], ambar[k + 'G'], ambar[k + 'B']] = hx(h);
    K.luz(tl, p, ambar, g13 + .1, 3);
    K.camera(tl, p, CC, meioF, 0);
    K.anima(tl, olhar, { o: 0 }, meioF, 0);
    K.anima(tl, espreita.pose, { opacidade: 0 }, meioF, 0);
    K.anima(tl, P.samauma.estado, { frente: 1 }, meioF, 0);
    const XTa = 1440, XZa = 1545, beber = pt.riacho.beber[0];
    E.ir(tl, tiao, { x: XTa + CC, dir: -1 }, meioF, 0); E.pose(tl, tiao, 'neutra', meioF, 0);
    E.ir(tl, ze, { x: XZa + CC, dir: -1, z: 0, tremor: 0 }, meioF, 0); E.pose(tl, ze, 'neutra', meioF, 0);
    K.anima(tl, cao.pose, { opacidade: 0 }, meioF, 0);
    K.anima(tl, veada.pose, { opacidade: 1 }, meioF, 0);
    K.caminhar(tl, veada, { de: CC - 300, ate: beber - 60, t0: meioF + .2, t1: meioF + 2.4 });
    K.anima(tl, veada.pose, { bebe: 1 }, meioF + 2.6, .9, 'sine.inOut');
    u = g(tiao, 'mirar', meioF + .9, { agachado: true, dur: 2.4 });

    // 14 · "Ela tá prenhe. Deixa essa.": Zé, 85 px atrás, estende o braço e pousa a mão no ombro do Tião
    g(ze, 'falar', t('cacadores_14'), { dur: tf('cacadores_14') - t('cacadores_14') });
    g(ze, 'maoNoOmbro', Math.max(u + .1, t('cacadores_14') + .3), { em: tiao, dur: .6 });

    // 15 · tranco; encosta o rosto na coronha e mira; silêncio total; a luz fecha sobre a linha do tiro
    const g15 = t('cacadores_15');
    g(tiao, 'falar', g15, { dur: tf('cacadores_15') - g15 });
    g(tiao, 'tranco', g15 + .25);
    E.pose(tl, ze, 'neutra', g15 + .3, .35, 'power2.out');
    E.pose(tl, tiao, { a: { cabeca: 24, peito: 18 } }, g15 + 1.2, 1.2, 'sine.inOut');
    K.luz(tl, p, { hotX: 44, hotY: 76, hotRX: 50, hotRY: 56, vinheta: .8 }, g15 + .4, 2.6, 'sine.inOut');
    E.osc(tl, tiao, sfx('espingarda_engatilhar')[1], 'maoTras', 8, .12, 1);
    K.anima(tl, veada.pose, { alerta: .35 }, tf('cacadores_15') - .2, .3);
  });
})();
