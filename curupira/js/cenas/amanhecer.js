/* amanhecer.js — cenas "aurora" (O caminho de casa) e "encerramento". Roteiro: roteiro.json; kit: js/cenas/comum.js.
 * Tempos só por ctx.t / ctx.tf / ctx.sfx; todo tween passa pelo kit (K.anima) ou pelo elenco (mesmo registro).
 * Composição da aurora: painel esquerdo = riacho claro, ipê e samaúma (L3, clara); meio = clareira com o hotspot,
 * o Zé embaixo (x ≈ 740) e o Curupira no beiço do barranco (x ≈ 1120): os dois rostos no mesmo campo de luz;
 * painel direito = crista do barranco (L2) com a vara.
 */
(function () {
  'use strict';
  const S = window.Sombras;
  const TAU = Math.PI * 2, NS = 'http://www.w3.org/2000/svg';
  const fr = x => x - Math.floor(x);
  const svgPalco = () => {
    const s = document.createElementNS(NS, 'svg');
    for (const [k, v] of [['class', 'sb-boneco'], ['width', 1920], ['height', 1080], ['viewBox', '0 0 1920 1080']]) s.setAttribute(k, v);
    return s;
  };
  // estado de luz a partir de outro, com cores em hex: luz('aurora', {papelCentro: '#FFF3D6'}, {hotY: 40})
  function luz(base, cores, extra) {
    const o = Object.assign({}, typeof base === 'string' ? S.palco.LUZES[base] : base);
    for (const k in cores) { const n = parseInt(cores[k].slice(1), 16); o[k + 'R'] = n >> 16 & 255; o[k + 'G'] = n >> 8 & 255; o[k + 'B'] = n & 255; }
    return Object.assign(o, extra);
  }

  // pegadas que a cena controla por números (aparecem em t0 abs; estado.o some todas juntas; estado.b desfoca;
  // estado.brilho acende uma cópia clara na camada de brilho, como couro vazado). lista: [{x, y, dir, lado, escala, t0}]
  function pegadasVivas(c, lista, op) {
    op = op || {};
    const svg = svgPalco(), luzEl = svgPalco(), est = { o: op.o == null ? 1 : op.o, b: 0, brilho: op.brilho || 0 }, us = [];
    luzEl.style.mixBlendMode = 'screen';
    for (const p of lista) {
      const tr = `translate(${p.x} ${p.y}) scale(${(-(p.dir || 1) * p.escala).toFixed(3)} ${(p.escala * (p.achatar || .6) * (p.lado || 1)).toFixed(3)}) rotate(${p.giro || 0})`;
      for (const [alvo, cor] of [[svg, S.bonecos.COR.contorno], [luzEl, '#FFD98A']]) {
        const u = document.createElementNS(NS, 'use');
        u.setAttribute('href', '#pegada'); u.setAttribute('transform', tr); u.setAttribute('fill', cor);
        alvo.appendChild(u); us.push({ u, p, luz: alvo === luzEl, ult: '' });
      }
    }
    let ub = '', ul = '';
    c.possuir({
      camadas: { rastros: svg, brilho: luzEl },
      atualizar(t) {
        for (const q of us) {
          const k = Math.min(1, Math.max(0, (t - c.abs(q.p.t0)) / .25));
          const v = (q.luz ? est.brilho * k : (op.opacidade || .6) * est.o * k).toFixed(3);
          if (v !== q.ult) { q.ult = v; q.u.setAttribute('opacity', v); }
        }
        const f = est.b > .05 ? `blur(${est.b.toFixed(2)}px)` : '';
        if (f !== ub) { ub = f; svg.style.filter = f; }
        const fl = `blur(${((op.luzBlur == null ? 3 : op.luzBlur) + est.b).toFixed(2)}px)`;
        if (fl !== ul) { ul = fl; luzEl.style.filter = fl; }
      },
    });
    return est;
  }

  // nuvem solta de vaga-lumes à frente de um boneco (sementes fixas: lugar, tamanho e piscar desencontrados). estado.o
  function nuvemVagalumes(c, alvo, yBase, op) {
    op = op || {};
    const n = op.n || 9, g = svgPalco(), est = { o: 0 };
    g.innerHTML = `<defs><radialGradient id="sbnv"><stop offset="0" stop-color="#F4FFB0" stop-opacity=".9"/><stop offset=".3" stop-color="#C8F25A" stop-opacity=".4"/>` +
      `<stop offset="1" stop-color="#B6F24A" stop-opacity="0"/></radialGradient></defs>` + '<g><circle r="15" fill="url(#sbnv)"/><circle r="2.6" fill="#F6FFC8"/></g>'.repeat(n);
    const els = [...g.children].slice(1), sem = els.map((_, i) => [0, 1, 2, 3, 4, 5].map(k => S.hash(i * 31 + k * 7 + 401)));
    let ult = '';
    c.possuir({
      camadas: { brilho: g },
      atualizar(t) {
        const vis = est.o > .002 ? '' : 'none';
        if (vis !== ult) { ult = vis; g.style.display = vis; }
        if (vis) return;
        const sg = alvo.pose.dir < 0 ? -1 : 1, cx = alvo.pose.x + sg * (op.frente || 170);
        els.forEach((e, i) => {
          const [a, b, k, per, ph, f] = sem[i];
          const x = cx + (a - .5) * 190 + 14 * Math.sin(t * (.6 + f) + i * 2.1), y = yBase + (b - .5) * 130 + 10 * Math.sin(t * (.8 + a) + i);
          const u = fr(t / (1.6 + 2.4 * per) + ph), on = u < .38 ? Math.min(1, u / .06, (.38 - u) / .06) : .12;
          e.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(.65 + .7 * k).toFixed(2)})`);
          e.setAttribute('opacity', (est.o * on).toFixed(3));
        });
      },
    });
    return est;
  }

  // poeira dourada levantada pelos cascos (§11.5): grãos presos a cada bicho, subindo e ficando para trás. estado.o
  function poeiraDourada(c, bichos, chao, op) {
    op = op || {};
    const n = op.n || 90, g = svgPalco(), est = { o: 0 };
    g.style.mixBlendMode = 'screen'; g.style.filter = 'blur(1.2px)';
    g.innerHTML = '<circle fill="#FFD98A"/>'.repeat(n) + '<ellipse fill="#FFE2A0" opacity="0"/>'.repeat(bichos.length);
    const gr = [...g.querySelectorAll('circle')], nuv = [...g.querySelectorAll('ellipse')];
    let ult = '';
    c.possuir({
      camadas: { brilho: g },
      atualizar(t) {
        const vis = est.o > .002 ? '' : 'none';
        if (vis !== ult) { ult = vis; g.style.display = vis; }
        if (vis) return;
        gr.forEach((e, i) => {
          const b = bichos[i % bichos.length], h = S.hash(i * 13 + 77), h2 = S.hash(i * 5 + 3), u = fr(t * (.5 + .4 * h2) + h);
          const sg = b.pose.dir < 0 ? -1 : 1, x = b.pose.x + (h - .5) * 90 - sg * 70 * u, y = chao(x) - 4 - 70 * u * (.6 + .6 * h2);
          e.setAttribute('cx', x.toFixed(1)); e.setAttribute('cy', y.toFixed(1)); e.setAttribute('r', (1 + 1.8 * h2 + 2 * u).toFixed(2));
          e.setAttribute('opacity', (est.o * .75 * Math.sin(Math.PI * u) * (b.pose.opacidade == null ? 1 : b.pose.opacidade)).toFixed(3));
        });
        nuv.forEach((e, i) => { // véu de poeira junto dos cascos
          const b = bichos[i], x = b.pose.x - (b.pose.dir < 0 ? -1 : 1) * 40;
          e.setAttribute('cx', x.toFixed(1)); e.setAttribute('cy', (chao(x) - 16).toFixed(1)); e.setAttribute('rx', 70); e.setAttribute('ry', 22);
          e.setAttribute('opacity', (est.o * .22).toFixed(3));
        });
      },
    });
    return est;
  }

  // ondulação: anéis claros que se abrem na água onde o focinho toca. estado.o
  function ondulacao(c, x, y) {
    const g = svgPalco(), est = { o: 0 };
    g.innerHTML = '<ellipse fill="none" stroke="#FFF2CF" stroke-width="1.6"/>'.repeat(3);
    const els = [...g.children];
    c.possuir({
      camadas: { brilho: g },
      atualizar(t) {
        els.forEach((e, i) => {
          const u = fr(t / 1.8 + i / 3);
          e.setAttribute('cx', x); e.setAttribute('cy', y); e.setAttribute('rx', (4 + 34 * u).toFixed(1)); e.setAttribute('ry', (1.2 + 6 * u).toFixed(1));
          e.setAttribute('opacity', (est.o * .8 * (1 - u)).toFixed(3));
        });
      },
    });
    return est;
  }

  // Tião da volta, dias depois: aba do chapéu rasgada com palha solta e barba crescida, desgrenhada
  function tiaoRasgado(op) {
    const E = S.elenco, d = E.defs.tiao(), ch = d.partes.find(p => p.id === 'chapeu'), cab = d.partes.find(p => p.id === 'cabeca');
    const palha = S.bonecos.COR.palha, grisalho = S.bonecos.COR.grisalho;
    ch.formas = ch.formas.slice();
    if (ch.formas[2] && ch.formas[2].d.startsWith('M-36 -4C')) ch.formas[2] = Object.assign({}, ch.formas[2], { d: 'M-36 -4C-30 0 -18 2.6 3 2.6C24 2.6 36 0 42 -5.4C44.4 -3.4 43.4 1 40 4L34 7.4L28.4 2.2L26.4 9.6C18 11 10 11 3 11' +
      'C-12 11 -22 10 -27 8.6L-30.6 4.4L-32 7C-35 6 -38.6 3.6 -38.6 1C-39 -1 -38 -3 -36 -4Z' });
    ch.linhas = (ch.linhas || []).concat([{ d: 'M34 7.4L38.6 16.4M31 5.2L32 14.6M28.4 2.6L27 11.4M-30.6 4.4L-34.6 12.6M-27 8.6L-28.4 15.6', cor: palha, w: 1.3, op: 1 }]);
    cab.formas = cab.formas.slice();
    if (cab.formas[1] && cab.formas[1].d.startsWith('M1 -19C')) cab.formas[1] = { d: 'M1 -19C7 -15 15 -14.5 23 -12.5C25 -8 25.4 -3 24.4 2L26.4 15L21.4 7.4L21 22L16.6 10.4L14 25L10.8 9.8L6.4 21L5 6.8L.6 14.4C-1 4 -1.4 -9 1 -19Z', cor: grisalho };
    return E.criar(d, op);
  }

  // sabiá-laranjeira empoleirado (beira da mata). pose.canto 0..1: bico abre e a garganta pulsa
  function sabia(op) {
    const E = S.elenco, costas = '#94724A', peito = '#DD7A2C';
    const partes = [
      E.peca('cauda', 'corpo', [-10, -14], { junta: false, formas: [{ p: [[-9, -17], [-20, -12], [-31, -4], [-33, -.5, 1], [-28, -1.6], [-18, -8], [-9, -12]], cor: '#7E5C3A' }],
        linhas: [{ p: [[-12, -14], [-30, -2]], w: .7, op: .5 }] }),
      E.peca('corpo', null, [0, -12], { formas: [
        { p: [[-12, -16], [-6, -21.5], [2, -23.5], [9, -23], [13.5, -19], [13.5, -13], [9.5, -7], [2, -4], [-5, -5], [-11, -10]], cor: costas },
        { p: [[13.4, -16], [12.6, -10.5], [8.6, -6], [2, -4.4], [-4, -5.6], [-1.5, -9.5], [4.5, -12.5], [10.5, -15.5]], cor: peito, contorno: 0 }],
        linhas: [{ p: [[0, -5], [1, 0]], w: 1.1, op: .9 }, { p: [[4, -5.5], [5, 0]], w: 1.1, op: .9 }] }),
      E.peca('asa', 'corpo', [5, -19], { junta: false, formas: [{ p: [[-12, -19.5], [-2, -22], [6, -20], [4.5, -15], [-5, -12], [-15, -12.5]], cor: '#6E5030' }],
        linhas: [{ p: [[-12, -16], [3, -18]], w: .7, op: .5 }, { p: [[-10, -13.6], [2, -15.4]], w: .7, op: .5 }] }),
      E.peca('cabeca', 'corpo', [10, -22], { junta: false, formas: [{ p: [[6.5, -22.5], [8.5, -28.5], [13.5, -31], [18.5, -29.6], [21, -26.4], [19.4, -22], [13, -19.6]], cor: costas },
        { p: [[19.6, -27.6], [26.4, -26.2, 1], [19.8, -25.2]], cor: '#C9A35C' }],
        furos: [E.oval(15.6, -27.2, 1.25, 1.15, 0, 8)] }),
      E.peca('mandibula', 'cabeca', [19.8, -25.4], { junta: false, formas: [{ p: [[19.6, -25.6], [25.2, -25.3, 1], [19.8, -23.8]], cor: '#B68E4C' }] }),
    ];
    return S.bonecos.criar({
      nome: 'sabia', H: 34, partes, varetas: [{ parte: 'corpo', ponto: [0, -14], mestra: true }],
      pose: { respiro: 0, canto: 0 },
      auto(b, t) {
        const k = b.pose.canto, A = b.extra.a, trilo = .55 + .45 * Math.sin(TAU * 11 * t);
        A.mandibula = (A.mandibula || 0) + 26 * k * trilo;
        A.cabeca = (A.cabeca || 0) - 16 * k + 7 * Math.sin(TAU * .37 * t) * (1 - k) + 5 * Math.sin(TAU * 1.3 * t + 1) * (1 - k);
        A.cauda = (A.cauda || 0) + 5 * Math.sin(TAU * .8 * t) - 6 * k;
        A.corpo = (A.corpo || 0) - 4 * k;
      },
    }, op);
  }

  // boca que fala em sílabas (bichos e montado: campo boca 0..1)
  function falarBoca(tl, b, t0, t1, amp) {
    const K = S.kit;
    for (let t = t0, i = 0; t < t1 - .3; t += .24 + .08 * S.hash(i * 13 + 5), i++) {
      K.anima(tl, b.pose, { boca: amp * (.6 + .4 * S.hash(i * 7 + 1)) }, t, .09, 'power1.out');
      K.anima(tl, b.pose, { boca: .02 }, t + .09, .13, 'power1.in');
    }
  }

  // ======================================================================================================
  S.cenas.registrar('aurora', (tl, ctx) => {
    const K = S.kit, E = S.elenco, Bi = S.bichos, T = ctx.t, TF = ctx.tf, sfx = n => ctx.sfx(n);
    const c = K.posse(tl, ctx, { luz: null }), p = c.palco, CH = K.CHAO;
    const cen = c.possuir(S.cenarios.aurora(p)), rancho = c.possuir(cen.rancho), beira = c.possuir(cen.beira);
    const pc = cen.pecas, topo = cen.pontos.barranco.topo;

    // ---- luz: a madrugada clareia de baixo para cima atrás da samaúma e abre a clareira; centro quase branco ----
    const t01 = T('aurora_01');
    const AUR = luz('aurora', { papelCentro: '#FFF3D6', papelMeio: '#F6CB92', papelBorda: '#A87458', papelCanto: '#3A2430', gel: '#FFC47A' },
      { gelOpac: .14, hotX: 52, hotY: 42, hotRX: 64, hotRY: 76, vinheta: .42, brilho: 1.08, saturacao: 1.08, matiz: 0 });
    K.luz(tl, p, luz('amanhecer', { papelCentro: '#F0CDB8' }, { hotX: 30, hotY: 100, hotRX: 46, hotRY: 20, brilho: .62, vinheta: .72 }), c.luzEm, .3);
    K.luz(tl, p, luz(AUR, { papelCentro: '#FFE9C8', papelMeio: '#EDB990', papelBorda: '#8E6466' }, { hotX: 40, hotY: 56, hotRX: 64, hotRY: 66, brilho: 1, vinheta: .5 }),
      c.luzEm + .3, t01 + 1 - c.luzEm - .3, 'sine.out');                         // o clarão sobe de baixo para cima
    K.luz(tl, p, AUR, t01 + 1, 4);
    K.anima(tl, pc.ipe.pose, { flores: 1 }, t01 - .2, 4.6, 'sine.inOut');
    K.anima(tl, pc.gotas.estado, { o: .2 }, T('aurora_02') + 2, 4);

    // ---- elenco a pé ----
    const ze = c.boneco(E.ze({ x: 560, y: CH, escala: 1.02, dir: -1, z: .55, opacidade: 0 }));
    const tiao = c.boneco(E.tiao({ x: 850, y: CH, escala: 1.06, dir: -1, z: .6, opacidade: 0 }));
    const cao = c.boneco(Bi.cachorro({ x: 600, y: CH, escala: 1, dir: -1, z: .5, opacidade: 0 }));
    E.base(tiao, 'semArma'); E.set(tiao, 'semArma'); E.set(tiao, { s: { penaChapeu: 0 } });

    // aurora_02: saem do fundo da mata exaustos; Zé e o cachorro param inteiros no painel esquerdo, na beira do riacho;
    // o Tião, sobre o papel claro do meio, sacode a cabeça, dá as costas para a água e se mete no mato, à direita
    const t02 = T('aurora_02');
    for (const [b, dt] of [[ze, 0], [cao, .4], [tiao, .9]]) {
      K.anima(tl, b.pose, { opacidade: 1 }, t02 + dt, .8, 'power1.out');
      K.anima(tl, b.pose, { z: 0 }, t02 + dt, 2.2, 'power2.out');
    }
    E.pose(tl, ze, 'exausto', t02, .6);
    let u = E.gestos.andar(tl, ze, t02 + .1, { ate: 520, dur: 2.2, modo: 'cansado' });
    K.caminhar(tl, cao, { ate: 360, t0: t02 + .5, t1: t02 + 4, bob: .6 });
    K.anima(tl, cao.pose, { fareja: 1 }, t02 + 4.1, .5);                       // bebe na beira
    E.pose(tl, tiao, 'exausto', t02 + .9, .6);
    let ut = E.pose(tl, tiao, { a: { peito: 6, cabeca: 4 } }, t02 + 2.1, .4);
    ut = E.osc(tl, tiao, ut, 'cabeca', 9, .32, 3) + .1;                         // sacode a cabeça
    ut = E.gestos.virar(tl, tiao, ut, {});                                       // dá as costas para a água
    const tsai = E.gestos.andar(tl, tiao, ut + .1, { ate: 1760, dur: 3, modo: 'ligeiro' });
    K.anima(tl, tiao.pose, { z: .85 }, ut + .7, tsai - ut - .7, 'power1.in');   // afasta-se da tela: cresce e desfoca
    K.anima(tl, tiao.pose, { opacidade: 0 }, tsai - 1, 1);

    // aurora_03: o tropel; Zé vira e corre até o pé do barranco (cruza o montante depressa); o cachorro vem atrás
    const t03 = T('aurora_03');
    u = E.gestos.virar(tl, ze, Math.max(u, t03 + .2), {});
    u = E.gestos.andar(tl, ze, u + .05, { ate: 740, dur: .75, modo: 'correr' });
    u = E.pose(tl, ze, { a: { peito: -2, cabeca: -22 } }, u + .1, .6);
    K.anima(tl, cao.pose, { fareja: 0 }, t03 + .5, .3);
    K.caminhar(tl, cao, Object.assign({ ate: 520, t0: t03 + 1, t1: t03 + 2 }, Bi.andadura(cao, 'trote')));
    K.anima(tl, cao.pose, { alerta: 1 }, t03 + 2.1, .3, 'power2.out');
    K.abalo(tl, p, sfx('queixada_tropel')[0], 1.4, 1.5);                         // o tropel ainda longe

    // ---- aurora_04: a vara no alto do barranco; ele para no beiço, de machadinha erguida ----
    const t04 = T('aurora_04'), tb = sfx('bloco_madeira')[0], X0 = 1120;
    const yOn = x => topo(x) + 2, noAlto = b => b.motores.push(b => { b.extra.dy += yOn(b.pose.x) - b.pose.y; });
    const mont = c.boneco(Bi.curupiraMontado({ x: 2160, y: yOn(X0), escala: .95, dir: -1, pena: 1, colar: 1, fumo: 1, furia: .35 }));
    Object.assign(mont.pose.a, { bracoFrente: -140, antebracoFrente: -10, maoFrente: 140, pena: -14 }); // machadinha erguida, na vertical
    Object.assign(mont.pose.s, { peFrente: 1.4, pena: 1.3 });                    // o pé virado lê no tamanho real
    noAlto(mont);
    const vara = Bi.vara(6, { y: yOn(X0), escala: .9, semente: 9, dir: -1 });
    const galope = b => Bi.andadura(b, 'galope');
    vara.forEach((q, i) => {
      c.boneco(q); noAlto(q);
      const x1 = X0 + 196 + i * 104 + 14 * S.hash(i + 3), x0 = x1 + 900;
      q.pose.z = Math.min(.12, q.pose.z * .3);                                     // perto da tela: a vara se lê
      K.anima(tl, q.pose, { x: x0 }, 0, 0);
      K.caminhar(tl, q, Object.assign({ de: x0, ate: x1, t0: t04 + .25 + q.atraso, t1: tb + .2 + q.atraso * .6 }, galope(q)));
      Bi.dentes(tl, q, sfx('queixada_dentes')[0] + q.atraso * .5, .8);
      K.anima(tl, q.pose, { erica: 1 }, t04 + .3, .4);
      for (const [k, tt] of [[0, T('aurora_05') + 1.1], [1, T('aurora_06') + 2.3], [2, T('aurora_07') + .4]]) // inquieta: dentes esparsos
        if ((i + k) % 3 === 0) Bi.dentes(tl, q, tt + i * .21, .5);
    });
    K.caminhar(tl, mont, Object.assign({ de: 2160, ate: X0, t0: t04, t1: tb }, galope(mont)));
    K.anima(tl, mont.pose, { rot: -9 }, tb - .12, .12, 'power2.out');           // puxa o queixada: empina
    K.anima(tl, mont.pose, { rot: 0 }, tb + .05, .55, 'back.out(2)');
    K.anima(tl, mont.pose.a, { cabeca: 16 }, tb, .3, 'power2.out');              // vira a cabeça para o Zé
    K.anima(tl, mont.pose, { furia: 0 }, tb, 1.2);
    K.anima(tl, mont.pose.a, { bracoFrente: 10, antebracoFrente: -20, maoFrente: 10 }, tb + 1.1, .8, 'sine.inOut'); // baixa a machadinha ao lado
    Bi.dentes(tl, mont, sfx('queixada_dentes')[0], .8);
    K.anima(tl, mont.pose, { grunhido: 1 }, sfx('queixada_grunhido')[0], .15);
    K.anima(tl, mont.pose, { grunhido: 0 }, sfx('queixada_grunhido')[0] + .4, .3);
    K.particulas(tl, p, 'poeira', t04 - .3, T('aurora_05') + 2, { nivel: 1, entra: .8, sai: 1.5 });
    const po = poeiraDourada(c, [mont, ...vara], yOn);
    K.anima(tl, po, { o: 1 }, t04 + .1, .6);
    K.anima(tl, po, { o: .15 }, tb + .6, 1.6);

    // vaga-lumes batedores (nuvem solta à frente dele) e pegadas invertidas vazadas na crista
    const vg = nuvemVagalumes(c, mont, yOn(X0) - 175);
    K.anima(tl, vg, { o: 1 }, t04 - .6, 1.2);
    const pg = [];
    for (let x = X0 + 56, k = 0; x < 1860; x += 62, k++)
      pg.push({ x, y: yOn(x) + 18 + (k % 2 ? 5 : -5), dir: -1, lado: k % 2 ? 1 : -1, escala: 1.15, achatar: .85, giro: (k % 2 ? 8 : -8), t0: t04 + (tb - t04) * (2160 - x) / (2160 - X0) });
    const pgB = pegadasVivas(c, pg, { o: 0, brilho: .75, luzBlur: .6 });

    // araras levantam voo dos açaís do barranco
    const tr = sfx('araras_revoada')[0];
    Bi.bando(5, { escala: .7, semente: 12, dir: -1 }).forEach(a => {
      c.boneco(a);
      K.anima(tl, a.pose, { x: 1700 - a.dx * .3, y: 240 + a.dy * .4, opacidade: 0 }, 0, 0);
      K.anima(tl, a.pose, { opacidade: 1 }, tr + a.atraso, .2);
      K.anima(tl, a.pose, { x: 380 - a.dx, y: -180 + a.dy }, tr + a.atraso, 3.2, 'sine.in');
    });

    // Zé: espanto quieto
    u = E.ir(tl, ze, { tremor: .25 }, Math.max(u, tb), .2);
    E.ir(tl, ze, { tremor: 0 }, u + 1.2, .5);

    // aurora_05: o Curupira fala, calmo; os perfis frente a frente no mesmo campo de luz
    falarBoca(tl, mont, T('aurora_05') + .1, TF('aurora_05'), .38);
    // aurora_06: Zé tira o chapéu, aperta contra o peito, baixa a cabeça e responde
    const t06 = T('aurora_06');
    u = E.gestos.tirarChapeu(tl, ze, t06 + .2, { para: { a: { peito: 12, cabeca: 26 }, maos: { Frente: { ancora: 'peito', d: [10, 0] } }, maoAng: { Frente: 10 } } }); // chapéu inteiro, de pé, contra o peito
    E.gestos.falar(tl, ze, u, { dur: TF('aurora_06') - u });
    E.ir(tl, ze, { tremor: .15 }, t06, .1); E.ir(tl, ze, { tremor: 0 }, t06 + 1.4, .4);
    K.anima(tl, cao.pose, { alerta: 0 }, t06 + 1, .5);
    K.anima(tl, cao.pose, { abana: .4 }, t06 + 1.5, .6);
    // aurora_07: "Vai, meu neto": tira o rolo de fumo da cintura e o ergue à frente, na altura do ombro, num aceno curto
    const t07 = T('aurora_07');
    falarBoca(tl, mont, t07 + .1, TF('aurora_07'), .3);
    E.pose(tl, ze, { a: { peito: 4, cabeca: -6 } }, t07 + .8, 1.2);
    const ta = t07 + 1.3;
    K.anima(tl, mont.pose.a, { bracoTras: 14, antebracoTras: -40 }, ta - .35, .3);  // a mão vai à cintura
    K.anima(tl, mont.pose.o, { fumo: 0, fumoMao: 1 }, ta, 0);
    K.anima(tl, mont.pose.a, { bracoTras: -84, antebracoTras: -14 }, ta, .35, 'back.out(1.6)');
    K.anima(tl, mont.pose.a, { antebracoTras: -38 }, ta + .45, .25);
    K.anima(tl, mont.pose.a, { antebracoTras: -14 }, ta + .7, .25);
    K.anima(tl, mont.pose.a, { bracoTras: 14, antebracoTras: -40 }, ta + 1.4, .45);
    K.anima(tl, mont.pose.o, { fumo: 1, fumoMao: 0 }, ta + 1.85, 0);
    K.anima(tl, mont.pose.a, { bracoTras: -26, antebracoTras: -30 }, ta + 1.9, .35);

    // aurora_08: assobio longo, ergue a machadinha, gira o queixada e some com a vara; vaga-lumes e pegadas se apagam
    const t08 = T('aurora_08'), tv = sfx('queixada_tropel').find(x => x > t08) || t08 + .4;
    K.anima(tl, mont.pose, { boca: .3 }, t08, .15);
    K.anima(tl, mont.pose.a, { cabeca: -12, bracoFrente: -140, antebracoFrente: -10, maoFrente: 140 }, t08, .4, 'power2.out');
    K.anima(tl, mont.pose, { boca: 0, furia: .3 }, tv, .3);
    K.anima(tl, po, { o: 1 }, tv, .3);
    K.anima(tl, po, { o: 0 }, tv + 1.2, 1.4);
    K.virar(tl, mont, tv - .05, .22);
    K.caminhar(tl, mont, Object.assign({ ate: 2350, t0: tv + .15, t1: tv + 2.6 }, galope(mont)));
    K.anima(tl, mont.pose, { z: .45 }, tv + 1.4, 1.2, 'power1.in');
    vara.forEach((q, i) => {
      const t = tv + .1 + .07 * i;
      K.virar(tl, q, t, .2);
      K.caminhar(tl, q, Object.assign({ ate: 2350 + 90 * i, t0: t + .2, t1: t + 2.2 }, galope(q)));
    });
    K.anima(tl, vg, { o: 0 }, t08 + 1, 1.4);
    K.anima(tl, pgB, { brilho: 0 }, t08 + 1.4, 1.4);
    u = E.pose(tl, ze, { a: { peito: 0, cabeca: -14 } }, t08 + .3, .6);
    E.gestos.porChapeu(tl, ze, t08 + 2.2, {});

    // ---- aurora_09: folha → porta do rancho, de manhã; folha → beira da mata, de dia ----
    const t09 = T('aurora_09'), m1 = K.folha(tl, t09 + .1), m2 = K.folha(tl, t09 + 4.2, { de: 'esquerda' });
    K.anima(tl, cen.estado, { visivel: 0 }, m1, 0);
    K.anima(tl, rancho.estado, { visivel: 1 }, m1, 0);
    K.luz(tl, p, luz('dia', { gel: '#FFD6A0' }, { hotX: 66, hotY: 34, gelOpac: .1 }), m1 - .2, .5);
    const porta = rancho.pontos.rancho.porta;
    K.anima(tl, ze.pose, { x: -260, dir: 1, z: 0 }, m1, 0);
    E.pose(tl, ze, 'neutra', m1, 0);
    E.gestos.andar(tl, ze, m1 + .2, { ate: porta[0] - 150, dur: 3.6 });
    K.anima(tl, cao.pose, { x: -380, dir: 1, abana: 1, alerta: 0, fareja: 0 }, m1, 0);
    K.caminhar(tl, cao, Object.assign({ ate: porta[0] - 30, t0: m1 + .1, t1: m1 + 2.1 }, Bi.andadura(cao, 'trote')));
    Bi.latir(tl, cao, sfx('cachorro_latido')[0], 2);
    K.anima(tl, rancho.estado, { visivel: 0 }, m2, 0);
    K.anima(tl, beira.estado, { visivel: 1 }, m2, 0);
    K.anima(tl, ze.pose, { opacidade: 0 }, m2, 0);
    K.anima(tl, cao.pose, { opacidade: 0 }, m2, 0);
    K.luz(tl, p, 'dia', m2 - .2, .5);

    // beira: o Tião (outro boneco: dias depois, barba crescida, chapéu rasgado) sai do mato no painel 3 e cambaleia até o meio
    const tb2 = c.boneco(tiaoRasgado({ x: 1560, y: CH, escala: 1.06, dir: -1, z: .35, opacidade: 0 }));
    E.base(tb2, 'semArma'); E.set(tb2, 'semArma'); E.set(tb2, { s: { penaChapeu: 0 } });
    const gs = beira.pontos.galhoSabia, sab = c.boneco(sabia({ x: gs[0], y: gs[1] + 4, escala: 1.7, dir: -1, opacidade: 0 }));
    K.anima(tl, sab.pose, { opacidade: 1 }, m2, 0);
    K.anima(tl, tb2.pose, { opacidade: 1 }, m2, 0);
    E.pose(tl, tb2, { a: { peito: 18, cabeca: 16, chapeu: -14 } }, m2, 0);
    let ub = E.gestos.andar(tl, tb2, m2 + .2, { ate: 1330, dur: 2, modo: 'cansado' });
    K.anima(tl, tb2.pose, { z: 0 }, m2 + .2, 1.6, 'power2.out');
    ub = E.gestos.andar(tl, tb2, ub, { ate: 1180, dur: .42, modo: 'correr' });   // tropeça para a frente: cruza o montante de uma vez
    ub = E.gestos.andar(tl, tb2, ub + .05, { ate: 1010, dur: 1.6, modo: 'cansado' });
    E.osc(tl, tb2, m2 + .6, 'rot', 4, 1.1, 1);                                    // cambaleia
    E.osc(tl, tb2, ub + .1, 'rot', 4, 1.1, 1);
    // aurora_10: o sabiá assobia; Tião dá um pulo, gira para todos os lados e apressa o passo
    const t10 = T('aurora_10'), ts = Math.max(ub + 1.4, sfx('sabia').find(x => x > t10) || TF('aurora_10'));
    K.anima(tl, sab.pose, { canto: 1 }, ts - .05, .12);
    K.anima(tl, sab.pose, { canto: 0 }, ts + 1.1, .25);
    E.pose(tl, tb2, 'susto', ts, .12, 'power3.out');
    E.ir(tl, tb2, { y: CH - 46 }, ts, .17, 'power2.out');
    E.ir(tl, tb2, { y: CH }, ts + .17, .2, 'power2.in');
    ut = E.gestos.virar(tl, tb2, ts + .45, {});
    ut = E.gestos.virar(tl, tb2, ut + .22, {});
    E.ir(tl, tb2, { tremor: .7 }, ts + .1, .1); E.ir(tl, tb2, { tremor: 0 }, ut + .6, .3);
    E.gestos.andar(tl, tb2, ut + .1, { ate: -320, dur: 2.6, modo: 'ligeiro' });

    // ---- aurora_11: folha → o riacho; a veada bebe (anéis na água), o filhote vem bambo e encosta nela; tudo doura ----
    const t11 = T('aurora_11'), m3 = K.folha(tl, t11 + .75);
    K.anima(tl, beira.estado, { visivel: 0 }, m3, 0);
    K.anima(tl, cen.estado, { visivel: 1 }, m3, 0);
    K.anima(tl, sab.pose, { opacidade: 0 }, m3, 0);
    K.anima(tl, tb2.pose, { opacidade: 0 }, m3, 0);
    K.luz(tl, p, luz(AUR, {}, { hotX: 40, hotY: 56 }), m3 - .2, .5);
    const veada = c.boneco(Bi.veada({ x: 360, y: CH + 30, escala: .95, dir: 1, bebe: 1, opacidade: 0 })); // de pé na água rasa
    const filho = c.boneco(Bi.filhote({ x: 90, y: CH + 14, escala: .95, dir: 1, bambo: 1, opacidade: 0 }));
    const anel = ondulacao(c, 478, 814);
    K.anima(tl, veada.pose, { opacidade: 1 }, m3, 0);
    K.anima(tl, filho.pose, { opacidade: 1 }, m3, 0);
    K.anima(tl, anel, { o: 1 }, m3, .6);
    K.anima(tl, anel, { o: 0 }, m3 + 3.6, .6);
    K.caminhar(tl, filho, { ate: 160, t0: m3 + .9, t1: m3 + 1.9, bob: 1.6 });
    K.caminhar(tl, filho, { ate: 215, t0: m3 + 2.3, t1: m3 + 3.3, bob: 1.6 });
    K.anima(tl, filho.pose, { rot: 7, bambo: .4 }, m3 + 3.4, .8, 'sine.inOut');    // encosta nela
    K.anima(tl, veada.pose, { bebe: .25 }, m3 + 3.8, 1.2, 'sine.inOut');         // ergue a cabeça e fica com ele
    K.luz(tl, p, luz(AUR, { papelCentro: '#FFF0CC', papelMeio: '#FFE2A8', papelBorda: '#C08A4E', papelCanto: '#4A2A14', gel: '#FFBA60' },
      { hotX: 40, hotY: 60, hotRX: 82, hotRY: 88, gelOpac: .18, vinheta: .35, brilho: 1.12, saturacao: 1.15, matiz: 0 }), m3 + 1.4, 4.5);
  });

  // ======================================================================================================
  S.cenas.registrar('encerramento', (tl, ctx) => {
    const K = S.kit, T = ctx.t, TF = ctx.tf, sfx = n => ctx.sfx(n);
    const c = K.posse(tl, ctx, { saida: 'corte' }), p = c.palco;
    const cen = c.possuir(S.cenarios.encerramento(p)), pc = cen.pecas, L = cen.estado.camadas;
    if (p.luz.halo == null) p.luz.halo = 1;          // campos opcionais do palco começam no neutro (o kit parte deles)
    if (p.luz.textura == null) p.luz.textura = 1;

    // encerramento_01: a sombrinha bate na samaúma distante; a mata sobe, desbota e desfoca, da frente para o fundo;
    // o chão some no lugar; a candeia cresce (chama e halo) e o papel volta ao âmbar dela
    const tb = sfx('batida_tronco')[0];
    K.anima(tl, pc.sombrinha.estado, { o: 1 }, .3, .4);
    K.anima(tl, pc.sombrinha.estado, { x: 44, rot: 8 }, .5, tb - .5, 'power2.in');
    K.anima(tl, pc.sombrinha.estado, { rot: -6 }, tb, .12, 'power2.out');       // a batida
    K.anima(tl, pc.samaumaLonge.estado, { tremor: 1 }, tb, .05);
    K.anima(tl, pc.samaumaLonge.estado, { tremor: 0 }, tb + .05, .6);
    K.anima(tl, pc.sombrinha.estado, { o: 0 }, tb + .2, .35);
    K.abalo(tl, p, tb, .25, 2);
    [['L1', .45], ['L2', .7], ['L3', .95], ['L4', tb + .45], ['L5', tb + .75]].forEach(([k, t]) => {
      K.anima(tl, L[k], { y: -420 }, t, .9, 'power2.in');
      K.anima(tl, L[k], { o: 0 }, t, .9, 'power2.out');
      K.anima(tl, L[k], { b: 6 }, t, .9, 'power1.in');
    });
    K.anima(tl, L.rastros, { o: 0 }, .9, 1.2, 'sine.inOut');
    K.luz(tl, p, { lamparina: 1.8, halo: 1.7, textura: .45 }, 1.25, 1.4);

    // encerramento_02: a chama se inclina com o assobio; um par de pegadas invertidas no centro do chão
    const ta = sfx('assobio_curupira')[0], tp = ta + .5;
    K.anima(tl, p.luz, { inclina: -26 }, ta - .1, .35, 'power2.out');
    K.anima(tl, p.luz, { inclina: 0 }, ta + .25, 1.4, 'sine.inOut');
    const pg = pegadasVivas(c, [{ x: 944, y: 814, dir: 1, lado: 1, escala: 2.4, giro: -5, t0: tp }, { x: 996, y: 798, dir: 1, lado: -1, escala: 2.4, giro: 4, t0: tp + .35 }],
      { opacidade: .72, luzBlur: .8 });
    // encerramento_03: a luz se fecha numa roda pequena (rx ≈ 280 px, ry ≈ 180 px) logo acima das pegadas; o papel fora
    // dela volta a ser só papel âmbar (manchas da textura abrandadas)
    K.luz(tl, p, { hotX: 50, hotY: 76, hotRX: 16, hotRY: 22, vinheta: .9, textura: .1 }, T('encerramento_03') + .3, 3);
    // encerramento_04: as pegadas perdem a nitidez devagar
    K.anima(tl, pg, { b: 3.2, o: .7 }, T('encerramento_04') + .3, TF('encerramento_04') - T('encerramento_04'), 'sine.inOut');
    // encerramento_05: a chama baixa até quase sumir
    K.luz(tl, p, { lamparina: .3, halo: 1, brilho: .55 }, T('encerramento_05') + .1, 2.6);
    // encerramento_06: o sopro apaga; o papel escurece da borda para o centro; as pegadas brilham nítidas e somem;
    // a sala inteira (moldura, palha, candeia) vai ao escuro total
    const ts = sfx('sopro_apaga')[0];
    K.anima(tl, p.luz, { inclina: -30 }, ts - .2, .2, 'power2.out');
    K.anima(tl, p.luz, { inclina: 0 }, ts, .5);
    K.luz(tl, p, { lamparina: 0, brilho: .14, vinheta: 1, hotRX: 7, hotRY: 10, sala: .7 }, ts, .9, 'power2.in');
    K.anima(tl, pg, { b: 0 }, ts + .3, .2);
    K.anima(tl, pg, { brilho: .9 }, ts + .5, .12, 'power2.out');
    K.anima(tl, pg, { brilho: 0, o: 0 }, ts + .8, 1.3, 'power1.in');
    K.luz(tl, p, Object.assign({}, S.palco.LUZES.escuro, { sala: .95, textura: 1, halo: 1 }), ts + 1.2, 1.2);
  });
})();
