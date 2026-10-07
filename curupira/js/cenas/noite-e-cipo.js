/* noite-e-cipo.js — coreografia de três cenas do roteiro: noite (a noite que não acabava), vo (a lembrança da
 * Vó) e novelo (o novelo de cipó). Cada cena cria o próprio cenário (Sombras.cenarios) e os próprios bonecos
 * (Sombras.elenco, Sombras.bichos) e só anima pela timeline, com tempos de ctx.t / ctx.tf / ctx.sfx (kit:
 * js/cenas/comum.js). Por boneco e propriedade, os gestos vão em ordem e encadeados pelo instante que devolvem.
 */
(function () {
  'use strict';
  const S = window.Sombras, K = S.kit, E = S.elenco, G = S.elenco.gestos, CH = K.CHAO;
  const DEIXA = .75; // G.deixar: instante (desde o início do gesto) em que o objeto sai da mão e fica no chão
  const A = (tl, alvo, para, t, dur, ease) => K.anima(tl, alvo, para, t, dur || 0, ease);
  const pulso = (tl, alvo, k, t, pico, sobe, desce) => { // vai a pico e volta a 0
    A(tl, alvo, { [k]: pico }, t, sobe, 'power2.out');
    return A(tl, alvo, { [k]: 0 }, t + sobe, desce, 'power2.inOut');
  };
  // noite de anil e tempestade: o papel é que esfria (centro anil com um resto de âmbar da lamparina, cantos
  // marrom-azulados); brilho 1 e saturação 1, para o véu não apagar o couro dos bonecos
  const L = S.palco.LUZES, CORES = ['papelCentro', 'papelMeio', 'papelBorda', 'papelCanto', 'gel', 'tinta'];
  const luzDe = (base, cores, extra) => {
    const o = Object.assign({}, base, { brilho: 1, saturacao: 1, matiz: 0 }, extra);
    cores.forEach((h, i) => { const n = parseInt(h.slice(1), 16); o[CORES[i] + 'R'] = n >> 16 & 255; o[CORES[i] + 'G'] = n >> 8 & 255; o[CORES[i] + 'B'] = n & 255; });
    return o;
  };
  const NOITE = luzDe(L.noite, ['#ABB3C4', '#61709A', '#1D2542', '#18131A', '#3D5A8A', '#0B1220'], { hotX: 55, hotY: 36, hotRX: 60, hotRY: 76, vinheta: .62, gelOpac: .1 });
  const TEMPESTADE = luzDe(L.tempestade, ['#8893AD', '#4B5879', '#171D31', '#0F0C11', '#4E6470', '#0A0F14'], { hotX: 52, hotY: 38, hotRX: 62, hotRY: 74, vinheta: .7, gelOpac: .12 });
  const naMao = (tl, obj, b, ancora, t, dur, rot) => { // objeto de couro que acompanha uma mão até o ponto da âncora
    const q = E.ponto(b, ancora);
    A(tl, obj.pose, { x: q[0], y: q[1], rot }, t, dur, 'power2.inOut');
  };
  const NS = 'http://www.w3.org/2000/svg', el = (tag, pai) => pai.appendChild(document.createElementNS(NS, tag));
  // ator só desta cena que não precisa de camada (vive no papel): visível de c.inicio até c.fim
  const naCena = (c, p, f) => p.adicionar({ camadas: {}, atualizar: t => f(t, t >= c.inicio && t < c.fim) });

  // Lua recortada no próprio papel (abaixo de todas as camadas: a mata e as nuvens passam na frente). estado.o
  function lua(c, p, x, y) {
    const R = 45, d = document.createElement('div'), est = { o: 1 };
    d.style.cssText = `position:absolute;left:${x - 72 - 3 * R}px;top:${y - 52 - 3 * R}px;width:${6 * R}px;height:${6 * R}px;pointer-events:none;display:none;` +
      `background:radial-gradient(circle ${R * .32}px at 44% 47%,rgba(150,160,190,.28),transparent),radial-gradient(circle ${R * .22}px at 55% 54%,rgba(150,160,190,.22),transparent),` +
      `radial-gradient(circle,#F6F7FF 0,#EDF0FB ${R - 1.5}px,rgba(214,224,250,.5) ${R}px,rgba(196,210,245,.2) ${R * 1.7}px,rgba(196,210,245,0) ${R * 3}px)`;
    p.raiz.querySelector('.sb-papel').appendChild(d);
    let ult = '';
    naCena(c, p, (t, vis) => { const v = vis ? est.o.toFixed(3) : ''; if (v !== ult) { ult = v; d.style.display = vis ? '' : 'none'; d.style.opacity = v; } });
    return est;
  }
  // Brasas (§11.4) que saem das pontas das mechas do Curupira entre t0 e t1 (s da cena); acompanham a escala dele
  function brasas(c, b, t0, t1) {
    const svg = document.createElementNS(NS, 'svg'), n = 16, bs = [];
    svg.setAttribute('class', 'sb-boneco'); svg.setAttribute('width', 1920); svg.setAttribute('height', 1080);
    svg.style.mixBlendMode = 'screen';
    for (let i = 0; i < n; i++) bs.push(el('circle', svg));
    c.possuir({ camadas: { brilho: svg }, atualizar(t) {
      const tc = t - c.abs(0), k = b.pose.escala, liga = tc > t0 && tc < t1 && b.M.cabeca;
      bs.forEach((e, i) => {
        const h = j => S.hash(i * 7 + j + 900), P = 1.2 + h(1) * .9, a = ((tc - t0 + h(2) * 3) % P) / P;
        if (!liga) return e.setAttribute('opacity', 0);
        const q = b.mundo('cabeca', [-22 - 46 * h(3), -176 - 34 * h(4)]), sobe = (40 + 40 * h(5)) * a * P * k * .7;
        e.setAttribute('cx', (q[0] + (6 * Math.sin(3 * tc + i) + 30 * a) * k * .5 * b.pose.dir * -1).toFixed(1));
        e.setAttribute('cy', (q[1] - sobe).toFixed(1));
        e.setAttribute('r', ((1.6 + 1.4 * h(6)) * k * .55 * (1 - a * .5)).toFixed(2));
        e.setAttribute('fill', a < .4 ? '#FFB347' : '#FF5A1F');
        e.setAttribute('opacity', (Math.min(1, (tc - t0) * 2, (t1 - tc) * 2) * (1 - a) * .95).toFixed(3));
      });
    } });
  }
  // cabelo de fogo sempre para trás: compensa a inclinação de peito e cabeça nas mechas do alto (nada de dois tufos
  // em V quando ele olha para baixo); amansado (fúria < 0) as mechas baixam um pouco mais, rente às costas
  const cabeloAtras = b => b.motores.push(b => {
    const P = b.pose.a, X = b.extra.a, k = (P.cabeca || 0) + (X.cabeca || 0) + (P.peito || 0) + (X.peito || 0), baixa = 26 * Math.max(0, -(b.pose.furia || 0));
    for (let i = 0; i < 9; i++) X['mecha' + i] = (X['mecha' + i] || 0) - k * (i < 6 ? .9 : .45) - baixa * (i < 6 ? 1 : .4);
  });
  // varetas mais claras e finas (não competem com os cipós quando descem do alto do papel)
  const varetasLeves = b => { const v = b.camadas.bonecos.querySelector('.sb-varetas'); v.style.opacity = .6; v.querySelector('.vn').style.strokeWidth = '1.5px'; };

  /* ───────────── A noite que não acabava ───────────── */
  S.cenas.registrar('noite', (tl, ctx) => {
    const c = K.posse(tl, ctx, { saida: 'folha', luz: NOITE }), p = c.palco, t = ctx.t, tf = ctx.tf, sx = s => ctx.sfx(s);
    const cen = c.possuir(S.cenarios.noite(p)), P = cen.pecas, pt = cen.pontos.samauma, sam = P.samauma.estado;
    const luaE = lua(c, p, 330, 168);
    A(tl, p.particulas, { chuvaInclina: 18 }, 0, 0); // vento da direita

    // elenco: os dois ainda agarrados à lâmina alta da sapopema (painel do meio); o cachorro esperando embaixo
    const tiao = c.boneco(E.tiao({ x: pt.agarrarTiao[0] + 4, y: pt.agarrarTiao[1] + 8, dir: -1 }));
    E.set(tiao, 'semArma'); E.base(tiao, 'semArma'); E.set(tiao, 'agarrado');
    const cao = c.boneco(S.bichos.cachorro({ x: 960, y: CH, dir: -1 }));
    const ze = c.boneco(E.ze({ x: pt.agarrarZe[0] + 4, y: pt.agarrarZe[1] + 8, dir: -1 }));
    E.set(ze, 'agarrado'); E.set(ze, { s: { facao: 0, facaoCintura: 1 } });
    const g = pt.galho, cur = c.boneco(E.curupira({ x: g[0], y: g[1] + 72, dir: -1, escala: 1, opacidade: 0 }));
    E.set(cur, 'sentado'); cabeloAtras(cur); varetasLeves(cur);
    const coronha = P.coronha, cano = P.cano;

    // noite_01: descem no escuro; Tião apanha os dois pedaços da espingarda e os larga
    const t1 = t('noite_01');
    let tz = G.descer(tl, ze, t1 - 1.2, { ate: [1040, CH], dur: 1.1 });
    let tt = G.descer(tl, tiao, t1 - .95, { ate: [1140, CH], dur: 1.1 });
    A(tl, cao.pose, { abana: 1 }, t1 - .3, .3);
    tt = E.pose(tl, tiao, 'deixar', tt, .45);
    A(tl, coronha.pose, { x: E.ponto(tiao, 'maoT')[0] - 22, y: CH + 4, rot: 12, opacidade: 1 }, 0, 0);
    A(tl, cano.pose, { x: E.ponto(tiao, 'maoT')[0] + 16, y: CH + 2, rot: -7, opacidade: 1 }, 0, 0);
    const ergue = { a: { peito: -6, cabeca: -16 }, maos: { Tras: [96, -290], Frente: [4, -300] }, maoAng: { Tras: -60, Frente: -120 } }; // um pedaço em cada mão, abertos em V
    const te = tt + .1;
    tt = E.pose(tl, tiao, ergue, te, .6, 'power2.out');
    naMao(tl, coronha, tiao, 'maoF', te, .6, -122);
    naMao(tl, cano, tiao, 'maoT', te, .6, -48);
    tt = G.tremer(tl, tiao, tt, { dur: .7, amp: .5 });
    const solta = t('noite_02') + .35; // larga os pedaços quando o pano cai
    A(tl, coronha.pose, { x: 1085, y: CH + 4, rot: 14 }, solta, .5, 'bounce.out');
    A(tl, cano.pose, { x: 1170, y: CH + 2, rot: -8 }, solta, .55, 'bounce.out');
    tt = E.pose(tl, tiao, 'derrotado', solta, .5);

    // noite_02: o pano cai sobre a luz (borda ondulada até o meio do papel) e a chama encolhe; os dois andam, perdidos, e se sentam
    const t2 = t('noite_02');
    A(tl, P.pano.estado, { y: -40 }, t2 + .2, 1.3, 'power3.out');
    K.luz(tl, p, { lamparina: .55 }, t2 + .25, 1.1, 'power2.out');
    A(tl, luaE, { o: .7 }, t2 + .2, 1.3);
    tz = G.olhar(tl, ze, tz + .2, { para: 'cima', dur: .6 });
    tz = G.virar(tl, ze, tz + .5, {});
    tz = G.virar(tl, ze, tz + .6, {});
    tz = G.andar(tl, ze, Math.max(tz, t2 + 1.4), { ate: 760, modo: 'cansado' });
    tz = G.sentar(tl, ze, tz, { dur: .9 });
    tt = G.andar(tl, tiao, Math.max(tt, t2 + 2.4), { ate: 900, modo: 'cansado' });
    tt = G.sentar(tl, tiao, tt, { dur: 1 });
    A(tl, cao.pose, { abana: 0, fareja: 1 }, t2 + .6, .4);
    K.caminhar(tl, cao, { ate: 600, t0: t2 + 1.2, t1: t2 + 4.6 });
    A(tl, cao.pose, { fareja: 0 }, t2 + 4.6, .4);
    K.virar(tl, cao, t2 + 5.0);

    // noite_03: os vaga-lumes acendem um a um, de baixo para cima, numa fila em S até o galho; o Curupira aparece lá
    const t3 = t('noite_03'), V = P.vagalumes.estado;
    A(tl, P.pano.estado, { y: -210 }, t3, 3, 'sine.inOut'); // o pano recua um pouco: a fila de luz manda na tela
    A(tl, luaE, { o: 1 }, t3, 3);
    A(tl, V, { acesos: 1 }, t3 + .3, tf('noite_03') - t3 - .4, 'none');
    tz = G.olhar(tl, ze, Math.max(tz, t3 + 1.2), { para: 'cima', dur: .8 });
    tt = G.olhar(tl, tiao, Math.max(tt, t3 + 2.4), { para: 'cima', dur: .9 });
    A(tl, cao.pose, { alerta: 1 }, t3 + 3, .5);
    const tc0 = sx('flauta_chamado')[0] - .5;
    let tc = G.surgir(tl, cur, tc0, { dur: 1 });
    const t5 = t('noite_05'), cala = t5 + .72 * (tf('noite_05') - t5); // "...quando a cantiga se CALA"
    G.balancarPes(tl, cur, tc0 + .4, { dur: cala - tc0 - .4 });

    // noite_04: a cantiga; os dois se levantam e vão na direção do galho, de braços soltos, como sonâmbulos
    const t4 = t('noite_04');
    A(tl, V, { pisca: 1 }, t4, .6);
    G.falar(tl, cur, t4, { dur: tf('noite_04') - t4 });
    E.osc(tl, cur, t4 + .1, 'boca', .35, .52, Math.floor((tf('noite_04') - t4 - .2) / .52));
    tz = G.levantar(tl, ze, Math.max(tz, t4 + .3), { dur: 1.5 });
    tz = E.pose(tl, ze, 'sonambulo', tz, .7);
    tz = G.andar(tl, ze, tz, { ate: 990, modo: 'sonambulo', dur: tf('noite_04') - tz + .2 });
    tt = G.levantar(tl, tiao, Math.max(tt, t4 + .8), { dur: 1.6 });
    tt = E.pose(tl, tiao, { a: { peito: -4, cabeca: -12, bracoTras: -30, antebracoTras: -14 } }, tt, .7);
    tt = G.andar(tl, tiao, tt, { ate: 1110, modo: 'sonambulo', dur: tf('noite_04') - tt + .4 });
    A(tl, cao.pose, { alerta: 0, medo: .6 }, t4 + 2, .6);

    // noite_05: a fila sai do galho e dá voltas entre as árvores; eles vão atrás; no "cala" tudo se apaga e o galho fica vazio
    A(tl, V, { avanco: .5 }, t5 - .2, cala - t5 + .2, 'sine.inOut');
    tz = G.virar(tl, ze, Math.max(tz, t5 + .1), {});
    tz = G.andar(tl, ze, tz + .05, { ate: 800, modo: 'sonambulo', dur: cala - tz - .05 });
    tt = G.virar(tl, tiao, Math.max(tt, t5 + .3), {});
    tt = G.andar(tl, tiao, tt + .05, { ate: 930, modo: 'sonambulo', dur: cala - tt + .05 });
    A(tl, V, { o: 0 }, cala, .1);
    A(tl, V, { pisca: 0 }, cala + .2, .1);
    E.ir(tl, cur, { opacidade: 0 }, Math.max(tc, cala), .06);
    tz = E.pose(tl, ze, 'neutra', tz + .05, .35, 'power3.out');
    tt = E.pose(tl, tiao, 'neutra', tt + .05, .4, 'power3.out');
    tz = G.virar(tl, ze, tz + .5, {});
    tz = G.virar(tl, ze, tz + .7, {});
    A(tl, cao.pose, { medo: 0 }, cala + .3, .5);

    // noite_06: Tião tira o chapéu e se curva
    const t6 = t('noite_06');
    G.falar(tl, tiao, t6, { dur: tf('noite_06') - t6 });
    tt = G.tirarChapeu(tl, tiao, Math.max(tt, t6 + .3), { para: 'derrotado' });
    tz = G.olhar(tl, ze, Math.max(tz, t6 + 1.2), { para: 'baixo', dur: .8 });

    // noite_07: o vento muda e as nuvens cobrem a lua; pancadas no horizonte (L5) e depois na mata média (L3)
    const t7 = t('noite_07'), bt = sx('batida_tronco');
    A(tl, cen.estado, { vento: 2.4 }, t7, 2.5, 'sine.inOut');
    A(tl, P.pano.estado, { y: -720 }, t7 + .2, 2.4, 'sine.in'); // o vento leva o pano
    A(tl, P.nuvens.estado, { o: 0, x: -470, y: -60 }, 0, 0);
    A(tl, P.nuvens.estado, { o: 1, x: -720 }, t7, 4, 'sine.inOut');
    A(tl, luaE, { o: .3 }, t7 + 1.2, 2.6, 'sine.inOut');
    K.luz(tl, p, { hotRX: 50, hotRY: 64, papelCentroR: 156, papelCentroG: 166, papelCentroB: 186 }, t7 + .4, 3.2);
    pulso(tl, P.treme5.estado, 'tremor', bt[0], 1, .05, 1);
    pulso(tl, P.treme3.estado, 'tremor', bt[1], 1, .05, .9);
    A(tl, cao.pose, { alerta: 1 }, bt[0], .2, 'power3.out');
    tz = G.olhar(tl, ze, Math.max(tz, bt[0] + .1), { para: 'frente', dur: .3 });
    tt = E.pose(tl, tiao, { a: { cabeca: -10 } }, Math.max(tt, bt[0] + .3), .4);
    K.caminhar(tl, cao, { ate: 860, t0: bt[1] + .05, t1: bt[1] + .85, ...S.bichos.andadura(cao, 'trote') });

    // noite_08: duas pancadas colado à samaúma deles, o papel inteiro treme (sem desfocar os bonecos); o uivo; um clarão longe
    for (const b of [bt[2], bt[3]]) { pulso(tl, sam, 'tremor', b, 1, .04, Math.min(.8, bt[3] - bt[2] - .06)); K.abalo(tl, p, b, .45, 3); }
    tz = G.recuar(tl, ze, Math.max(tz, bt[2]), { dx: 20, z: .06, volta: false, dur: 1.2 });
    tt = G.recuar(tl, tiao, Math.max(tt, bt[2] + .06), { dx: 16, z: .05, volta: false, dur: 1.2 });
    A(tl, cao.pose, { alerta: 0, medo: 1 }, bt[3], .3);
    const uv = sx('uivo_curupira');
    K.luz(tl, p, { brilho: 1.2 }, uv[0] + .5, .07, 'power2.out');
    K.luz(tl, p, { brilho: 1 }, uv[0] + .57, .4, 'power2.in');

    // noite_09: tempestade: chuva em diagonal, copas dobrando em fases diferentes, os dois chapéus voando; eles se encolhem
    const t9 = t('noite_09'), rl = sx('relampago_estalo');
    K.luz(tl, p, TEMPESTADE, t9, 1.4);
    A(tl, luaE, { o: .12 }, t9, 1.4);
    A(tl, p.particulas, { chuva: 1 }, sx('chuva_mata')[0], 1.4, 'sine.inOut');
    A(tl, cen.estado, { vento: 5, agito: 1.2 }, t9 + .2, 1.6, 'sine.inOut');
    K.relampago(tl, p, rl[0]);
    const voa = t9 + 1.1, chZ = c.boneco(E.objeto('chapeuZe', { escala: 1, opacidade: 0 }), { respirar: false });
    const chT = c.boneco(E.objeto('chapeuTiao', { escala: 1, opacidade: 0 }), { respirar: false });
    const qz = E.ponto(ze, 'chapeu'), qt = E.ponto(tiao, 'maoT');
    A(tl, chZ.pose, { x: qz[0], y: qz[1] + 20, opacidade: 1 }, voa, 0);
    A(tl, chT.pose, { x: qt[0], y: qt[1], rot: 160, opacidade: 1 }, voa + .15, 0);
    E.mostrar(tl, ze, voa, { chapeu: 0 }); E.ir(tl, ze, { o: { topete: 1 } }, voa, 0);
    E.mostrar(tl, tiao, voa + .15, { chapeuMao: 0 });
    // o do Zé sobe alto, rodando, e some pela esquerda; o do Tião vai rasteiro, quicando no chão
    A(tl, chZ.pose, { x: 380 }, voa, 2.2, 'sine.inOut'); A(tl, chZ.pose, { x: -160 }, voa + 2.2, 1.1, 'power1.in');
    A(tl, chZ.pose, { y: 150 }, voa, 1.3, 'power2.out'); A(tl, chZ.pose, { y: 330 }, voa + 1.3, 2, 'sine.in');
    A(tl, chZ.pose, { rot: -720 }, voa, 3.3, 'none');
    A(tl, chT.pose, { x: 520 }, voa + .15, 1.9, 'power1.out'); A(tl, chT.pose, { x: -140 }, voa + 2.05, 1.6, 'power1.in');
    A(tl, chT.pose, { y: 560 }, voa + .15, .8, 'power2.out'); A(tl, chT.pose, { y: CH - 10 }, voa + .95, 1.1, 'bounce.out');
    A(tl, chT.pose, { rot: -260 }, voa + .15, 3.5, 'none');
    tz = E.ir(tl, ze, { z: 0, x: 820 }, Math.max(tz, t9 + 1.5), .5, 'power2.out');
    tz = G.encolher(tl, ze, tz, { tremor: .6, volta: false });
    tt = E.ir(tl, tiao, { z: 0, x: 900 }, Math.max(tt, t9 + 1.7), .5, 'power2.out');
    tt = G.encolher(tl, tiao, tt, { tremor: .5, volta: false });

    // noite_10: as copas se dobram; um galho estala lá no alto, balança e despenca na frente dos caçadores
    const t10 = t('noite_10'), gq = sx('galho_quebra')[0], GQ = P.galho.estado;
    A(tl, cen.estado, { vento: 6.5, agito: 2.2 }, t10 + .5, 2.5, 'sine.inOut');
    pulso(tl, sam, 'tremor', sx('arvore_rangendo')[1] - .2, .5, .3, 1.6);
    A(tl, GQ, { o: 1, x: 50, y: 330, rot: -14 }, t10 + .8, 0);
    let tg = t10 + .8;
    for (let k = 0; tg + .55 < gq - .7; k++) { A(tl, GQ, { rot: k % 2 ? -14 : 4 }, tg, .55, 'sine.inOut'); tg += .55; }
    A(tl, GQ, { y: CH + 150 - 12 }, gq - .6, .6, 'power2.in');
    A(tl, GQ, { rot: 7 }, Math.max(tg, gq - .6), gq - Math.max(tg, gq - .6), 'power1.in');
    A(tl, GQ, { rot: 3 }, gq, .35, 'power2.out');
    K.abalo(tl, p, gq, .35, 3);
    G.tremer(tl, ze, gq, { dur: .5, amp: 1.4 });
    G.tremer(tl, tiao, gq + .05, { dur: .5, amp: 1.2 });
    A(tl, cao.pose, { latido: 1 }, gq + .1, .1);
    A(tl, cao.pose, { latido: 0 }, gq + .4, .2);

    // noite_11: relâmpago: o papel estoura em branco e mostra o Curupira de pé na crista da lâmina alta, de perfil, machado
    // acima da cabeça, pés virados; o quadro congela; ele uiva, afasta-se da tela e a sombra cresce até cobrir o tríptico
    const rr = rl[1], cr = pt.crista;
    K.relampago(tl, p, rr);
    E.ir(tl, cur, { x: cr[0], y: cr[1] + 1, apoio: 1, escala: 1.15, z: 0, opacidade: 1, furia: .7, balanco: 0 }, rr - .03, 0);
    E.pose(tl, cur, { a: { peito: -8, cabeca: -12, pernaFrente: -16, pernaTras: 16, peFrente: 6, peTras: -6 }, maos: { Frente: [10, -236] }, maoAng: { Frente: -64 } }, rr - .03, 0);
    const BRANCO = luzDe(TEMPESTADE, ['#F2F4FF', '#C4CEE8', '#5A6890'], { brilho: 1.65, gelOpac: 0, vinheta: .45 }), u2 = uv[1];
    K.luz(tl, p, BRANCO, rr + .1, .1, 'power2.out'); // o clarão se demora (≥ 1 s): o papel estoura em branco e o quadro congela
    K.luz(tl, p, TEMPESTADE, Math.max(rr + 1.25, u2 - .2), .5, 'power2.in');
    E.pose(tl, cur, 'uivar', u2 - .25, .3, 'power2.out');
    E.ir(tl, cur, { furia: 1 }, u2 - .25, .3);
    // afasta-se da tela, rumo à luz: a sombra cresce (desfoque moderado: as mechas ainda se leem), solta brasas e cobre o tríptico
    const fim11 = tf('noite_11');
    E.ir(tl, cur, { z: .5, opacidade: .82 }, u2 + .3, 1, 'power1.in');
    E.ir(tl, cur, { escala: 7.6, x: 820, y: 1720 }, u2 + .3, fim11 - u2 + .2, 'power1.inOut');
    brasas(c, cur, u2 - .1, t('noite_12') + 1.2);
    const gp = sx('grito_pavor')[0];
    tz = E.pose(tl, ze, 'medo', Math.max(tz, gp - .12), .15, 'power3.out');
    tz = E.ir(tl, ze, { tremor: 1 }, gp, .1);

    // noite_12: a sombra some; os três se enfiam no oco entre as sapopemas; a luz se fecha sobre o Zé, encolhido
    const t12 = t('noite_12'), oco = pt.oco;
    E.ir(tl, cur, { opacidade: 0 }, Math.max(t12 + .1, fim11 + .25), 1.2, 'sine.in');
    tz = E.ir(tl, ze, { tremor: 0 }, Math.max(tz, t12 + .3), .2);
    tz = G.correr(tl, ze, tz, { ate: oco[0] - 6 });
    tz = G.sentar(tl, ze, tz, { oco: true, dur: .6 });
    E.ir(tl, ze, { tremor: .3 }, tz, .3);
    tt = E.ir(tl, tiao, { tremor: 0 }, Math.max(tt, t12 + .5), .2);
    tt = G.correr(tl, tiao, tt, { ate: oco[0] + 70 });
    tt = G.encolher(tl, tiao, tt, { tremor: .3, volta: false });
    K.caminhar(tl, cao, { ate: oco[0] + 40, t0: t12 + .2, t1: t12 + 1.6, correr: true, ...S.bichos.andadura(cao, 'galope') });
    A(tl, sam, { frente: 1 }, t12 + 1.3, .01);
    A(tl, sam, { oco: 0 }, t12 + 1.3, .6); // o oco se abre em luz: dá para ver quem entrou
    A(tl, cen.estado, { vento: 2.6, agito: .3 }, t12 + 1, 3.5, 'sine.inOut');
    const zx = (oco[0] - 72) / 17.76;
    K.luz(tl, p, { hotX: zx, hotY: 80, hotRX: 13, hotRY: 30, vinheta: .9 }, t12 + 2.2, 3.6, 'sine.inOut');
    K.relampago(tl, p, t12 + 2.6);
    K.relampago(tl, p, sx('trovao').pop() - .3);
  });

  /* ───────────── O novelo da Vó (lembrança) ───────────── */
  S.cenas.registrar('vo', (tl, ctx) => {
    const c = K.posse(tl, ctx, { saida: 'corte' }), p = c.palco, t = ctx.t, tf = ctx.tf, sx = s => ctx.sfx(s);
    const cen = c.possuir(S.cenarios.vo(p)), P = cen.pecas, N = P.novelo.estado;
    // a Vó no banquinho, no terço esquerdo do painel do meio, de costas para o rancho e olhando a mata (esquerda);
    // o pilão logo atrás dela, a porta e a janela acesas à direita
    const EV = 1.7, xv = 840, fr = -1; // fr: para onde ela olha
    const banco = c.boneco(E.objeto('banquinho', { x: xv - fr * 8 * EV, y: CH, escala: EV }), { respirar: false });
    const vo = c.boneco(E.vo({ x: xv, y: CH, dir: fr, escala: EV }));
    E.set(vo, 'sentada'); E.base(vo, 'sentada');
    E.ir(tl, vo, { fumaca: 1 }, 0, 0);
    A(tl, p.particulas, { chuva: 0 }, 0, .3); // na lembrança não chove

    // vo_01: luz quente; volutas do cachimbo; o pilão marca o pulso da casa
    const bf = sx('cachimbo_baforada');
    E.pose(tl, vo, 'pitar', bf[0] - .45, .3);
    E.ir(tl, vo, { fumaca: 2.4 }, bf[0] - .3, .3, 'power2.out');
    E.ir(tl, vo, { fumaca: 1 }, bf[0] + .1, 1.4, 'sine.inOut');
    let tv = E.pose(tl, vo, 'olharFrente', bf[0] + .2, .6);

    // vo_02: tira o cachimbo da boca e aponta com ele para a mata, lá fora
    tv = G.apontarCachimbo(tl, vo, Math.max(tv, t('vo_02') + .6), { segura: 1.4, devolve: true });

    // vo_03: dedo em riste, com doçura, bem longe do rosto
    const t3 = t('vo_03');
    G.falar(tl, vo, t3, { dur: tf('vo_03') - t3 });
    const t3a = Math.max(tv, t3 + 1.3);
    E.mostrar(tl, vo, t3a, { maoFrente: 0, dedoFrente: 1, arruda: 0, cachimboMao: 0 });
    tv = E.pose(tl, vo, { a: { cabeca: -6 }, maos: { Frente: [96, -236] }, maoAng: { Frente: -150 } }, t3a, .45, 'power2.out');
    tv = E.osc(tl, vo, tv, 'antebracoFrente', 8, .5, 3);
    tv = E.pose(tl, vo, 'sentada', tv + .2, .5);
    E.mostrar(tl, vo, tv, { maoFrente: 1, dedoFrente: 0, arruda: 1 });

    // vo_04: as mãos enrolam o cipó em novelo contra a luz: o cipó solto vai entrando em voltas e a ponta some lá dentro
    const t4 = t('vo_04');
    G.falar(tl, vo, t4, { dur: tf('vo_04') - t4 });
    const e0 = Math.max(tv, t4 + 1), ed = 4.4;
    tv = G.enrolar(tl, vo, e0, { dur: ed, de: 0, ate: .001, voltas: 10 });
    const qm = E.ponto(vo, 'maoF');
    A(tl, N, { x: qm[0] + fr * 22, y: qm[1] - 2, escala: 1.7, enrolado: .12, fio: 100, o: 1 }, e0 + .35, 0); // à frente das mãos
    A(tl, N, { enrolado: 1 }, e0 + .4, ed, 'power1.out');
    A(tl, N, { fio: 60 }, e0 + .4, ed, 'sine.inOut');
    K.luz(tl, p, { hotX: (qm[0] - 72) / 17.76, hotY: 64, hotRX: 44, hotRY: 62 }, t4, 2.4, 'sine.inOut'); // a luz vem para trás das mãos
    tv = E.pose(tl, vo, { a: { cabeca: 12 }, maos: { Frente: [44, -146], Tras: [40, -152] } }, tv, .25);
    tv = E.osc(tl, vo, tv, 'antebracoTras', -10, .3, 2);

    // vo_05: põe o novelo no chão e, do lado, o fumo; baforada
    const t5 = t('vo_05'), xm = xv + fr * 92 * EV;
    G.falar(tl, vo, t5, { dur: tf('vo_05') - t5 });
    let d0 = Math.max(tv, t5 + .3);
    tv = G.deixar(tl, vo, d0, { objeto: 'novelo', segura: .1 });
    A(tl, N, { x: xm, y: CH - 12 * EV, fio: 100 }, d0 + .1, DEIXA - .1, 'power2.inOut');
    E.mostrar(tl, vo, tv + .1, { fumoMao: 1 });
    d0 = tv + .15;
    tv = G.deixar(tl, vo, d0, { objeto: 'fumoMao', segura: .1 });
    A(tl, P.fumo.pose, { x: xm - fr * 46, y: CH - 5, rot: -8, escala: 1.25, opacidade: 1 }, d0 + DEIXA, 0);
    K.luz(tl, p, { hotX: 50, hotY: 44, hotRX: 62, hotRY: 78 }, t5 + 1, 3, 'sine.inOut');
    E.pose(tl, vo, 'pitar', bf[1] - .45, .3);
    E.ir(tl, vo, { fumaca: 2.4 }, bf[1] - .3, .3, 'power2.out');
    E.ir(tl, vo, { fumaca: 1 }, bf[1] + .1, 1.4, 'sine.inOut');

    // vo_06: guarda o cachimbo e benze o ar com a arruda numa cruz lenta, em quatro tempos (um por maracá)
    const mr = sx('maraca'), m0 = mr[mr.length - 4];
    E.mostrar(tl, vo, m0 - .6, { cachimbo: 0 });
    E.ir(tl, vo, { fumaca: 0 }, Math.max(m0 - .6, bf[1] + 1.55), .4);
    tv = G.benzer(tl, vo, m0 - .35, { tempo: mr[mr.length - 3] - m0 });

    // vo_07: o rancho desfoca e a lembrança se desfaz em fumaça; o trovão traz a noite de volta
    const t7 = t('vo_07'), tr = sx('trovao')[0];
    A(tl, cen.estado, { desfoque: 16 }, t7 + .4, tr - t7 - .6, 'sine.in');
    A(tl, P.fumaca.estado, { o: 2.2 }, t7 + .4, 3, 'sine.inOut');
    E.ir(tl, vo, { z: .6, opacidade: 0 }, tr - 2.8, 2.6, 'sine.in');
    A(tl, banco.pose, { z: .6, opacidade: 0 }, tr - 2.8, 2.6, 'sine.in');
    A(tl, N, { o: 0 }, tr - 2.8, 2.6, 'sine.in');
    A(tl, P.fumo.pose, { opacidade: 0 }, tr - 2.8, 2.6, 'sine.in');
    A(tl, cen.estado, { visivel: 0 }, tr - 2.2, 2.1, 'sine.in');
    K.relampago(tl, p, tr - .12);
    K.luz(tl, p, TEMPESTADE, tr - .1, 1.2, 'power2.out');
    A(tl, p.particulas, { chuva: .7, chuvaInclina: 18 }, tr, 1);
  });

  /* ───────────── O novelo ───────────── */
  S.cenas.registrar('novelo', (tl, ctx) => {
    const c = K.posse(tl, ctx, { entrada: 'corte', luz: TEMPESTADE }), p = c.palco, t = ctx.t, tf = ctx.tf, sx = s => ctx.sfx(s);
    const cen = c.possuir(S.cenarios.novelo(p)), P = cen.pecas, pt = cen.pontos.samauma, sam = P.samauma.estado;
    const oco = pt.oco[0], N = P.novelo.estado;
    A(tl, sam, { frente: 1 }, 0, 0);
    A(tl, p.particulas, { chuva: 1, chuvaInclina: 18 }, 0, .4);
    A(tl, cen.estado, { vento: 3, agito: .3 }, 0, 0);

    // os três no oco (painel da esquerda): Tião no fundo, o cachorro, o Zé de cabeça nos joelhos
    const tiao = c.boneco(E.tiao({ x: oco + 44, y: CH, dir: 1 }));
    E.set(tiao, 'semArma'); E.base(tiao, 'semArma'); E.set(tiao, 'encolhido');
    E.mostrar(tl, tiao, 0, { penaChapeu: 1 });
    const cao = c.boneco(S.bichos.cachorro({ x: oco + 14, y: CH, dir: 1, medo: .8 }));
    const ze = c.boneco(E.ze({ x: oco - 10, y: CH, dir: 1 }));
    E.set(ze, 'noOco'); E.set(ze, { s: { facao: 0, facaoCintura: 1 } });
    A(tl, sam, { oco: 0 }, 0, 0);
    A(tl, sam, { oco: 1 }, t('novelo_03'), 2, 'sine.inOut'); // vazio, o oco volta a ser escuro (a casa dele)
    const cur = c.boneco(E.curupira({ x: 560, y: CH, dir: 1, escala: 1.15, opacidade: 0 }));
    E.base(cur, 'semMachado'); E.set(cur, 'neutra'); cabeloAtras(cur);

    // novelo_01: Zé ergue a cabeça de repente, sai do oco e arranca o cipó pendurado do galho
    let tz = E.pose(tl, ze, { a: { cabeca: -14, peito: 26 } }, .05, .16, 'power3.out');
    tz = G.levantar(tl, ze, tz + .25, { dur: .5 });
    tz = G.andar(tl, ze, tz, { ate: 945, modo: 'ligeiro' });
    tz = G.arrancar(tl, ze, tz, { segura: .2 });
    A(tl, P.cipo.estado, { tremor: 1 }, tz - .6, .1);
    A(tl, P.cipo.estado, { o: 0, tremor: 0 }, tz - .35, .08);

    // novelo_02: enrola volta sobre volta, cada vez mais rápido; no bloco esconde a ponta e ergue o novelo contra a luz
    const blk = sx('bloco_madeira')[0], e0 = Math.max(tz, t('novelo_01') + 3.3);
    tz = G.enrolar(tl, ze, e0, { dur: blk - .85 - e0, de: .15, ate: 1, voltas: 11 });
    tz = G.erguer(tl, ze, Math.max(tz, blk - .2), { dur: .35, segura: .9 });

    // novelo_03: vira para o Tião e estende a mão aberta, sem tirar os olhos do novelo
    const t3 = t('novelo_03');
    G.falar(tl, ze, t3, { dur: tf('novelo_03') - t3 });
    tz = G.virar(tl, ze, tz, {});
    const pede = { a: { cabeca: 20, peito: 6 }, maos: { Tras: [92, -220], Frente: [26, -236] }, maoAng: { Tras: -100, Frente: -70 } };
    tz = E.pose(tl, ze, pede, tz, .45, 'power2.out');
    let tt = E.pose(tl, tiao, 'neutra', t('novelo_02') + .4, .8);
    tt = G.andar(tl, tiao, tt, { ate: 760 });
    A(tl, cao.pose, { medo: .3 }, t('novelo_02') + 1, .6);
    K.caminhar(tl, cao, { ate: 1180, t0: t('novelo_02') + 1.4, t1: t('novelo_02') + 3.2 });

    // novelo_04: Tião, encharcado, recua e aperta o bornal contra o peito
    const t4 = t('novelo_04');
    G.falar(tl, tiao, t4, { dur: tf('novelo_04') - t4 });
    tt = E.pose(tl, tiao, 'protegerBornal', Math.max(tt, t4 + .3), .35, 'power3.out'); // e recua
    E.ir(tl, tiao, { x: 735 }, tt - .35, .4, 'power2.out');
    E.ir(tl, tiao, { tremor: .35 }, tt, .2);

    // novelo_05: "É para ele": aponta com o queixo para o escuro da samaúma
    const t5 = t('novelo_05');
    G.falar(tl, ze, t5, { dur: tf('novelo_05') - t5 });
    tz = G.apontarQueixo(tl, ze, Math.max(tz, t5 + 1.5), { segura: .6 });
    tt = G.olhar(tl, tiao, Math.max(tt, sx('gongo_grave')[0] - .2), { para: 'frente', dur: .3 });

    // novelo_06: Tião remexe o bornal e entrega o fumo, com a mão tremendo
    const t6 = t('novelo_06');
    tt = E.ir(tl, tiao, { tremor: 0 }, Math.max(tt, t6), .2);
    tt = G.remexerBornal(tl, tiao, tt + .1, { n: 4, segura: .7 });
    E.mostrar(tl, tiao, tt - .2, { fumoMao: 0 });
    tz = E.pose(tl, ze, { a: { cabeca: 14, peito: 4 }, maos: { Frente: [34, -228], Tras: [40, -234] }, maoAng: { Frente: -70 } }, Math.max(tz, tt - .2), .45);
    E.mostrar(tl, ze, tz - .2, { fumoMao: 1 });
    tt = E.pose(tl, tiao, 'neutra', tt, .5);
    tz = E.pose(tl, ze, 'neutra', tz + .3, .5);

    // novelo_07: arruma o novelo e o fumo sobre a folha larga; tira o chapéu e baixa a cabeça para o escuro (a samaúma)
    const t7 = t('novelo_07'), fl = cen.pontos.folhaLarga[0];
    G.falar(tl, ze, t7, { dur: tf('novelo_07') - t7 });
    tz = G.andar(tl, ze, Math.max(tz, t7 - .3), { ate: fl + 140, dur: .7 }); // dá a volta na folha e fica do outro lado
    tz = G.virar(tl, ze, tz, {});
    A(tl, N, { x: fl + 70, y: CH - 20, o: 1, enrolado: 1 }, tz + DEIXA, 0);
    tz = G.deixar(tl, ze, tz, { objeto: 'novelo', segura: .05 });
    A(tl, P.fumo.pose, { x: fl + 14, opacidade: 1 }, tz + DEIXA, 0);
    tz = G.deixar(tl, ze, tz, { objeto: 'fumoMao', segura: .05 });
    tz = G.reverencia(tl, ze, tz + .1, { segura: .8 });
    const fm = sx('folhagem_mexe')[0];
    pulso(tl, sam, 'tremor', fm, .5, .1, .8);
    pulso(tl, sam, 'olhos', fm + .2, 1, .3, 1.2);

    // novelo_08: Tião tira a pena da fita e deixa junto; os dois se escondem atrás da samaúma com o cachorro
    const t8 = t('novelo_08');
    tt = G.penaNoChapeu(tl, tiao, Math.max(tt, t8 + .2), {});
    tt = G.andar(tl, tiao, tt, { ate: fl - 130, dur: .6 });
    A(tl, P.pena.pose, { x: fl - 60, opacidade: 1 }, tt + DEIXA, 0);
    tt = G.deixar(tl, tiao, tt, { objeto: 'pena', segura: .05 });
    tz = G.porChapeu(tl, ze, Math.max(tz, t8 + 1), { facao: false });
    tz = G.andar(tl, ze, Math.max(tz, tt - .4), { ate: 290, modo: 'ligeiro' });
    tz = G.agachar(tl, ze, tz, { pose: 'agachado' });
    tt = G.andar(tl, tiao, tt + .1, { ate: 360, modo: 'ligeiro' });
    tt = G.agachar(tl, tiao, tt, { pose: 'lerRastro' });
    K.caminhar(tl, cao, { ate: 230, t0: t8 + 2.2, t1: t8 + 4.2 });
    A(tl, cao.pose, { medo: .8 }, t8 + 4.2, .4);

    // novelo_09: a chuva afina e para; a luz volta a ser de noite; gotas; um vaga-lume, depois outro
    const t9 = t('novelo_09');
    A(tl, p.particulas, { chuva: 0 }, t9, 2.2, 'sine.out');
    K.luz(tl, p, NOITE, t9, 2.6);
    A(tl, P.gotas.estado, { o: 1 }, t9 + .5, .8);
    A(tl, cen.estado, { vento: 1, agito: 0 }, t9, 2.5, 'sine.inOut');
    A(tl, p.particulas, { vagalumes: .05 }, t9 + 1.2, 1.4);

    // novelo_10: primeiro os olhos no escuro do oco; ele sai de trás da sapopema, nítido e perto da tela, e vai de
    // calcanhar até a folha em três saltinhos (pegadas invertidas no chão claro); no bloco, 1 s parado com a sola à mostra
    const t10 = t('novelo_10'), saltos = [700, 780, fl - 120];
    pulso(tl, sam, 'olhos', t10, 1, .25, .5);
    let tc = G.surgir(tl, cur, t10 + .4, { dur: 1 });
    E.ir(tl, cur, { furia: .6 }, t10 + .4, .6);
    tc = Math.max(tc, t10 + 1.4);
    saltos.forEach((x, i) => {
      K.pular(tl, cur, { ate: x, altura: 30, t0: tc + i * .75, t1: tc + i * .75 + .42 });
      c.rastros.por(x + 8, CH + 5, { dir: 1, invertida: true, lado: i % 2 ? 1 : -1, escala: 1.25, achatar: .6, t0: c.abs(tc + i * .75 + .42), dura: 16, opacidade: .62 });
    });
    const bl = sx('bloco_madeira').pop();
    tc = E.pose(tl, cur, { a: { pernaFrente: -40, peFrente: -26, pernaTras: 6, cabeca: 10, peito: -2 } }, Math.max(tc + 2, bl - .35), .3, 'back.out(1.6)') + 1;
    tc = E.pose(tl, cur, 'neutra', tc, .3);

    // novelo_11: cheira o fumo (a raiva amansa, as mechas baixam), guarda na cintura; a pena atrás da orelha; o novelo: vira,
    // revira e senta no chão claro, de costas para a samaúma
    const t11 = t('novelo_11');
    tc = G.agachar(tl, cur, Math.max(tc, t11), { dur: .35 });
    A(tl, P.fumo.pose, { opacidade: 0 }, tc - .05, 0);
    tc = G.cheirar(tl, cur, tc, { fumo: true, amansa: true, n: 3, volta: false });
    tc = G.guardar(tl, cur, tc, {});
    tc = E.ir(tl, cur, { x: fl - 105 }, tc, .3, 'power2.out');
    tc = G.agachar(tl, cur, tc, { dur: .3 });
    A(tl, P.pena.pose, { opacidade: 0 }, tc - .05, 0);
    tc = G.guardar(tl, cur, tc, { fumo: false, pena: true, volta: false });
    K.pular(tl, cur, { ate: fl + 10, altura: 22, t0: tc + .05, t1: tc + .4 });
    tc = G.agachar(tl, cur, tc + .45, { dur: .3 });
    A(tl, N, { o: 0 }, tc - .05, 0);
    E.mostrar(tl, cur, tc, { novelo: 1 });
    tc = E.pose(tl, cur, { a: { cabeca: 12 }, maos: { Frente: [40, -120], Tras: [46, -124] }, maoAng: { Frente: 60 } }, tc, .3);
    tc = E.osc(tl, cur, tc, 'maoFrente', 50, .3, 1);
    tc = G.virar(tl, cur, tc, {});
    tc = G.virar(tl, cur, tc + .15, {});
    const ts = Math.max(tc + .05, sx('flauta_chamado').pop() - 1.1);
    K.pular(tl, cur, { ate: 1085, altura: 34, t0: ts, t1: ts + .45 });
    tc = G.sentar(tl, cur, ts + .5, { dur: .5 });

    // novelo_12: gira o novelo e desenrola: o cipó sai da mão e se espalha em rodilhas no chão; bufa, coça a cabeça e recomeça
    const t12 = t('novelo_12'), mao = () => E.ponto(cur, 'maoF');
    const roda = (a, d, ate) => { // as mãos giram e o cipó corre do novelo para o chão
      E.ir(tl, cur, { enrolar: 1 }, a, .2);
      E.ir(tl, cur, { giro: K.valor(cur.pose, 'giro') - d * 2.4 }, a, d, 'none');
      A(tl, N, { desenrolado: ate }, a, d, 'sine.inOut');
      return E.ir(tl, cur, { enrolar: 0 }, a + d - .2, .2);
    };
    tc = E.pose(tl, cur, 'desenrolar', Math.max(tc, t12 - .3), .3);
    const q = mao();
    E.mostrar(tl, cur, tc, { novelo: 0 });
    A(tl, N, { x: q[0], y: q[1] - 4, o: 1, enrolado: 1, escala: 1.1 }, tc, 0);
    tc = roda(tc, 1.4, .3);
    const coca = { a: { cabeca: 18, peito: -4 }, boca: .4, maos: { Tras: { ancora: 'topo', d: [-14, -10] } }, maoAng: { Tras: -150 } };
    tc = E.pose(tl, cur, coca, tc, .25, 'back.out(1.6)');
    tc = E.osc(tl, cur, tc, 'maoTras', 16, .2, 3);
    tc = E.pose(tl, cur, 'desenrolar', tc + .15, .3);
    tc = roda(tc, t('novelo_14') + 1.5 - tc, .9);

    // novelo_12/13: atrás dele (às costas, à esquerda) os dois se levantam devagarinho e saem na ponta dos pés
    const t13 = t('novelo_13');
    tz = G.levantar(tl, ze, Math.max(tz, t12 + .8), { dur: 1.4 });
    tt = G.levantar(tl, tiao, Math.max(tt, t12 + 1.2), { dur: 1.5 });
    tz = G.virar(tl, ze, Math.max(tz, t13 - .3), {});
    tz = E.pose(tl, ze, 'pontaDosPes', tz, .4);
    tz = G.andar(tl, ze, tz, { ate: -200, modo: 'pontaDosPes', dur: 6.4, passos: 14 });
    tt = G.virar(tl, tiao, Math.max(tt, t13), {});
    tt = E.pose(tl, tiao, { a: { peito: 12, cabeca: 4 }, maos: { Frente: [70, -250], Tras: [-30, -244] } }, tt, .4);
    tt = G.andar(tl, tiao, tt, { ate: -220, modo: 'pontaDosPes', dur: 6.8, passos: 14 });
    A(tl, cao.pose, { medo: 0 }, t13 + .8, .3);
    K.caminhar(tl, cao, { ate: -150, t0: t13 + 1.2, t1: t13 + 7 });
    const ps = sx('passos_folhas')[0];
    E.osc(tl, cur, ps + .1, 'cabeca', -8, .14, 2); // não levanta a cabeça, mas a orelha mexe

    // novelo_14: sozinho com o novelo, inclina a cabeça de lado e balança os pés virados; a luz baixa
    const t14 = t('novelo_14');
    G.balancarPes(tl, cur, t14 + .6, { dur: ctx.dur - t14 });
    E.pose(tl, cur, { a: { cabeca: 26 } }, t14 + 1.4, .8, 'sine.inOut');
    K.luz(tl, p, { brilho: .82, hotX: (q[0] - 72) / 17.76, hotY: 78, hotRX: 22, hotRY: 30 }, t14 + 1, 3.2);
    A(tl, p.particulas, { chuvaInclina: 0 }, ctx.dur, 0);
  });
})();
