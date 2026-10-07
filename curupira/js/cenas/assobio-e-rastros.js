/* assobio-e-rastros.js — cenas "aviso" (o assobio) e "rastros" (Os pés virados). Roteiro: roteiro.json; kit: js/cenas/comum.js.
 * Tempos só por ctx.t / ctx.tf / ctx.sfx; todo tween passa pelo kit (K.anima) ou pelo elenco (mesmo registro).
 * Coordenadas: bonecos e objetos de couro no mundo (tela = x − câmera); peças "fixas" (desta cena: embaúba caída,
 * samaúma de lâminas, pegadas acesas, poeira) em coordenadas de tela (estado.x desloca); bonecos em L3/L4 andam com a
 * paralaxe da camada (tela = x − câmera·PARALAXE).
 */
(function () {
  'use strict';
  const S = window.Sombras, NS = 'http://www.w3.org/2000/svg';
  const R1 = v => Math.round(v * 10) / 10, clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // estado de luz com o papel recolorido (§3.2 + crítica: hotspot creme no painel do meio, cantos escuros)
  function luzCom(nome, cores, extra) {
    const o = Object.assign({}, S.palco.LUZES[nome]);
    for (const k in cores) { const n = parseInt(cores[k].slice(1), 16); o[k + 'R'] = n >> 16 & 255; o[k + 'G'] = n >> 8 & 255; o[k + 'B'] = n & 255; }
    return Object.assign(o, extra);
  }
  const TARDE = () => luzCom('entardecer', { papelCentro: '#FBE3B0', papelMeio: '#F0B06A', papelBorda: '#B5502A', papelCanto: '#2A1008' },
    { hotX: 50, hotY: 42, hotRX: 58, hotRY: 78, vinheta: .65, saturacao: 1.06, matiz: -3, gelOpac: .1 });
  const NOITE = () => luzCom('noite', { papelCentro: '#D2D8CB', papelMeio: '#56647C', papelBorda: '#222C40', papelCanto: '#0B0F18' },
    { hotX: 47, hotY: 30, hotRX: 50, hotRY: 84, vinheta: .7, saturacao: .95, brilho: .86, gelOpac: .3 });

  function svgNovo(conteudo) {
    const e = document.createElementNS(NS, 'svg');
    for (const [k, v] of [['width', 1920], ['height', 1080], ['viewBox', '0 0 1920 1080']]) e.setAttribute(k, v);
    e.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
    e.innerHTML = conteudo || '';
    return e;
  }
  // peça presa à tela (não anda com a câmera): estado {x, o, …}; quadro(t) opcional
  function fixo(c, camada, el, estado, quadro) {
    const px = S.palco.PARALAXE[camada], ult = {};
    c.possuir({ camadas: { [camada]: el }, atualizar(t) {
      const tr = `translate(${(estado.x + c.palco.camera.x * px).toFixed(1)}px,0)`;
      if (tr !== ult.t) { ult.t = tr; el.style.transform = tr; }
      const o = clamp(estado.o, 0, 1).toFixed(3);
      if (o !== ult.o) { ult.o = o; el.style.opacity = o; el.style.visibility = +o ? '' : 'hidden'; }
      if (quadro) quadro(t);
    } });
    return estado;
  }
  // boneco embrulhado num contêiner com filtro próprio (sombra preta, vulto, couro que a noite não apaga).
  // partes: chaves de b.camadas a levar; filtro: texto ou f(t) → texto; tr(t) → transform do contêiner (opcional);
  // atualiza: false quando outro embrulho do mesmo boneco já o atualiza
  const FOLGA = 3000;
  function envolver(c, b, partes, camada, filtro, tr, atualiza) {
    const w = document.createElement('div');
    let ult = '', uf = '';
    // folga larga: o filtro recorta na caixa do contêiner, e bonecos de fundo (paralaxe) têm x de mundo além de 1920
    w.style.cssText = `position:absolute;left:-${FOLGA}px;top:-${FOLGA / 4}px;width:${1920 + 2 * FOLGA}px;height:${1080 + FOLGA / 2}px;filter:${typeof filtro === 'string' ? filtro : 'none'}`;
    for (const k of partes) if (b.camadas[k]) { b.camadas[k].style.left = FOLGA + 'px'; b.camadas[k].style.top = FOLGA / 4 + 'px'; w.appendChild(b.camadas[k]); }
    c.possuir({ camadas: { [camada]: w }, atualizar(t) {
      if (atualiza !== false) b.atualizar(t);
      const v = tr ? tr(t) : '';
      if (v !== ult) { ult = v; w.style.transform = v; }
      if (typeof filtro === 'function') { const f = filtro(t); if (f !== uf) { uf = f; w.style.filter = f; } }
    } });
    return b;
  }

  // ---------- pegadas e cascos acesos (tela de rastros; halo âmbar só no instante de acender) ----------
  // sola real, 64 px, dedos para +x, lado de dentro em −y: calcanhar redondo, arco estreito, planta larga, dedão e 4 dedos
  const PE = '<g id="ar-pe" transform="translate(-30 0)"><path d="M0 0C0-7 5-10 11-10C17-10 20-7 25-6.5C31-6 35-11 42-11.5C49-12 53-8 53-2C53 5 49 10 42 10.5' +
    'C33 11 22 8.5 14 9.5C6 10.5 0 7 0 0Z"/><ellipse cx="58.6" cy="-7.4" rx="5.2" ry="4.3"/><circle cx="60.2" cy="-.6" r="3.3"/><circle cx="59.2" cy="4.8" r="3"/>' +
    '<circle cx="56.6" cy="9.2" r="2.6"/><circle cx="52.9" cy="12.6" r="2.2"/></g>' +
    // casco fendido de queixada: duas unhas em gota e as duas sobreunhas atrás
    '<g id="ar-casco"><path d="M-8-1.2C-4-7.5 5-8 8-3C6-1.6-1-.9-8-1.2ZM-8 1.2C-4 7.5 5 8 8 3C6 1.6-1 .9-8 1.2Z"/><circle cx="-12.5" cy="-4.6" r="1.7"/><circle cx="-12.5" cy="4.6" r="1.7"/></g>' +
    '<path id="ar-lasca" d="M-7 0L-2-1.6L7-.4L1.4.8L-3 1.8Z"/>'; // lasca de madeira solta
  function marcas(c, lista) {
    const chao = svgNovo(`<defs>${PE}</defs>`), luz = svgNovo(), claro = svgNovo(), us = [];
    luz.style.cssText += ';mix-blend-mode:screen;filter:blur(3px)';
    claro.style.cssText += ';mix-blend-mode:screen';                     // q.claro: furo de luz nítido (no chão escuro da noite)
    for (const q of lista) {
      const e = q.escala || 1, tr = `translate(${R1(q.x)} ${R1(q.y)}) rotate(${q.giro || 0}) scale(${(q.dir || 1) * e} ${e * (q.achatar || .45) * (q.lado || 1)})`;
      for (const [alvo, cor] of [[q.claro ? claro : chao, q.claro ? '#A9B8CC' : S.bonecos.COR.contorno], [luz, '#FFC870']]) {
        if (alvo === luz && !q.halo) continue;
        const u = document.createElementNS(NS, 'use');
        u.setAttribute('href', '#ar-' + (q.tipo || 'pe')); u.setAttribute('transform', tr); u.setAttribute('fill', cor);
        u.setAttribute('opacity', 0);
        alvo.appendChild(u); us.push({ u, a: c.abs(q.t0), dura: q.dura || 30, op: q.opacidade || .7, luz: alvo === luz, ult: '0' });
      }
    }
    const ac = document.createElement('div');
    ac.append(luz, claro);
    c.possuir({ camadas: { rastros: chao, brilho: ac }, atualizar(t) {
      for (const q of us) {
        const d = t - q.a;
        const v = d < 0 ? 0 : q.luz ? (d > 1.4 ? 0 : .95 * Math.exp(-d / .32)) : q.op * Math.min(1, d / .12) * clamp((q.dura - d) / 2, 0, 1);
        const s = v.toFixed(3);
        if (s !== q.ult) { q.ult = s; q.u.setAttribute('opacity', s); }
      }
    } });
  }

  // ---------- rastros: embaúba caída (L2, tela) no painel do meio: tronco anelado de 830 a 1210 com o bisel claro do
  // corte virado para a esquerda; na copa, três galhos curvos e folhas palmadas de 7–9 lobos penduradas pelo pecíolo,
  // abertas em leque para baixo. estado {x (0 = no lugar), o, escuro 0..1}; corte = [x, y] do bisel ----------
  function embaubaCaida(c) {
    const g = S.cenario.geometria, r = S.rng(57), CH = S.kit.CHAO, x0 = 830, x1 = 1210;
    const w = u => 46 - 14 * u, yc = u => CH + 3 - w(u) / 2 - 2.5 * Math.sin(u * 3.1), X = u => x0 + (x1 - x0) * u;
    const cs = []; for (let k = 0; k <= 24; k++) cs.push([X(k / 24), yc(k / 24)]);
    const tinta = [g.fita(cs, u => w(u) + 1.5 * Math.sin(u * 37)), g.circ(x0, yc(0), 12, w(0) / 2 + 1, 18)];
    let furos = '';
    for (let x = x0 + 34; x < x1 - 20; x += 36 + r() * 12) { // anéis: frestas curvas com pontes nas bordas
      const u = (x - x0) / (x1 - x0), h = w(u) / 2, y = yc(u);
      furos += `<path d="M${R1(x)} ${R1(y - h + 6)}Q${R1(x + 5)} ${R1(y)} ${R1(x)} ${R1(y + h - 6)}" stroke="#000" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    }
    const fy = yc(0), fr = w(0) / 2; // bisel do corte: claro (furo), com dois anéis e a medula em couro
    furos += `<ellipse cx="${x0}" cy="${R1(fy)}" rx="9.6" ry="${R1(fr - 1.5)}" fill="#000"/>` +
      [.62, .3].map(k => `<ellipse cx="${x0 + .6}" cy="${R1(fy)}" rx="${R1(9.6 * k)}" ry="${R1((fr - 1.5) * k)}" fill="none" stroke="#fff" stroke-width="1.4"/>`).join('') +
      `<circle cx="${x0 + .6}" cy="${R1(fy)}" r="1.6" fill="#fff"/>`;
    // galhos curvos (u no tronco, controle e ponta relativos) e, em cada ponta, folhas [dx, dy do pecíolo, raio]
    const galhos = [[.72, [-20, -90], [-80, -132], [[-34, 46, 54], [22, 58, 46]]], [.9, [10, -100], [-22, -178], [[-30, 50, 56], [24, 44, 42]]],
      [1, [24, -34], [16, -102], [[-34, 40, 42]]]];
    for (const [u, k, e, folhas] of galhos) {
      const b = [X(u), u < 1 ? yc(u) - w(u) / 2 + 3 : yc(u)], p = [b[0] + e[0], b[1] + e[1]];
      tinta.push(g.fita(g.bez(b, [b[0] + k[0], b[1] + k[1]], p, 12), 11, 3.5));
      for (const [dx, dy, R] of folhas) {
        const cc = [p[0] + dx, p[1] + dy];
        tinta.push(g.fita(g.bez(p, [p[0] + dx * .7, p[1] - 8], cc, 8), 2.8, 1.8)); // pecíolo: sobe um pouco e cai
        const n = 7 + (r() * 3 | 0);
        for (let j = 0; j < n; j++) { // lobos abertos em leque para baixo (25°…155°), compridos e estreitos
          const a = (25 + 130 * j / (n - 1) + (r() - .5) * 10) * Math.PI / 180, L = R * (.78 + r() * .3) * (1 - .25 * Math.abs(j / (n - 1) - .5));
          tinta.push(g.lente(cc, [cc[0] + Math.cos(a) * L, cc[1] + Math.sin(a) * L], R * .13, R * .06 * (r() - .5), 6));
        }
        tinta.push(g.circ(cc[0], cc[1], R * .14, R * .1, 8));
      }
    }
    const el = svgNovo(`<defs><mask id="ar-emb-m" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080"><rect width="1920" height="1080" fill="#fff"/>${furos}</mask></defs>` +
      `<g class="ink" mask="url(#ar-emb-m)" fill="var(--sb-tinta,#24140A)" opacity=".8"><path d="${tinta.join('')}"/></g>`);
    const ink = el.querySelector('.ink'), est = { x: 1300, o: 1, escuro: 0 };
    let ult = '';
    fixo(c, 'L2', el, est, () => { const v = (.8 + .2 * clamp(est.escuro, 0, 1)).toFixed(3); if (v !== ult) { ult = v; ink.setAttribute('opacity', v); } });
    est.corte = [x0, fy];
    return est;
  }

  // ---------- rastros: samaúma de lâminas (L2, tela): tronco no painel da direita (x 1450) e cinco sapopemas em planos
  // diferentes; a da frente (F1) nasce no tronco e desce até o painel do meio, mais clara; entre um plano e outro, uma
  // fresta de luz de 5 px rente ao gume. estado {x, o}; borda(x) = y do gume de F1 (onde os dois sobem) ----------
  function samaumaLaminas(c) {
    const g = S.cenario.geometria, r = S.rng(61), CH = S.kit.CHAO + 4, XS = 1450;
    const tronco = g.poli([[XS - 80, -80], [XS + 82, -80], [XS + 90, 300], [XS + 95, CH], [XS - 95, CH], [XS - 92, 300]]);
    const lamina = (A, F, k, onda) => {
      const ed = [];
      for (let i = 0; i <= 26; i++) {
        const u = i / 26;
        ed.push([A[0] + (F[0] - A[0]) * u, A[1] + (F[1] - A[1]) * (1 - Math.pow(1 - u, k)) + onda * Math.sin(u * 7) * Math.sin(Math.PI * u) + (r() - .5) * 1.4]);
      }
      return { ed, d: g.poli([...ed, [A[0] + (A[0] < XS ? 6 : -6), CH], [A[0], A[1] + 10]]) };
    };
    const F1 = lamina([XS - 93, 470], [790, CH], 1.5, 4), F2 = lamina([XS - 90, 360], [1050, CH], 1.7, -3), F3 = lamina([XS - 86, 250], [1230, CH], 1.9, 2);
    const R1 = lamina([XS + 93, 520], [1900, CH], 2.1, -3), R2 = lamina([XS + 90, 400], [1720, CH], 1.8, 3);
    const fresta = L => g.fita(L.ed.map(([x, y]) => [x, y - 3]), u => 5 * Math.pow(Math.sin(Math.PI * clamp(u * 1.04 + .02, 0, 1)), .5) + .3);
    let los = '';
    for (const [x, y0, n] of [[XS - 42, 90, 12], [XS + 38, 170, 10]]) for (let j = 0; j < n; j++) { // duas faixas de losangos vazados
      const k = j % 3 === 1 ? 1 : .7, cx = x + 2 * Math.sin(j * .9), cy = y0 + j * 23;
      los += g.poli([[cx, cy - 9 * k], [cx + 5.4 * k, cy], [cx, cy + 9 * k], [cx - 5.4 * k, cy]], true);
    }
    // oco rasgado pequeno no pé do tronco, entre as duas lâminas da frente: escuro, com a beira acesa à esquerda
    const oco = g.poli([[XS - 52, CH], [XS - 50, CH - 44], [XS - 40, CH - 78], [XS - 30, CH - 96], [XS - 18, CH - 84], [XS - 8, CH - 102], [XS + 2, CH - 70], [XS + 6, CH - 34], [XS + 10, CH]]);
    const beira = g.fita([[XS - 58, CH], [XS - 56, CH - 46], [XS - 46, CH - 82], [XS - 32, CH - 104], [XS - 16, CH - 94]], u => 3 * Math.sin(Math.PI * u) + .4);
    const caixa = 'x="-400" y="-200" width="2800" height="1400"', m = (id, d) => `<mask id="${id}" maskUnits="userSpaceOnUse" ${caixa}><rect ${caixa} fill="#fff"/><path d="${d}" fill="#000"/></mask>`;
    const el = svgNovo(`<defs>${m('ar-sam-a', F1.d + R1.d + fresta(F1) + fresta(R1))}${m('ar-sam-b', F2.d + fresta(F2) + los + beira)}</defs>` +
      `<g fill="var(--sb-tinta,#24140A)"><g mask="url(#ar-sam-a)"><g mask="url(#ar-sam-b)"><path d="${F3.d}${tronco}${R2.d}" opacity=".95"/></g>` +
      `<path d="${F2.d}" opacity=".88"/></g><path d="${F1.d}${R1.d}" opacity=".75"/><path d="${oco}" opacity=".97"/></g>`);
    const est = fixo(c, 'L2', el, { x: 0, o: 0 });
    est.borda = x => { const u = clamp((F1.ed[0][0] - x) / (F1.ed[0][0] - 790), 0, 1); return 470 + (CH - 470) * (1 - Math.pow(1 - u, 1.5)); };
    return est;
  }

  // ---------- aviso: a sombra gigante do Curupira (L4, tela), longe da tela e junto da luz: cabeça de perfil olhando
  // para −x, orelha grande destacada do crânio por uma fresta de luz, mandíbula que abre, olho rasgado; 9 mechas soltas,
  // fora do contorno da cabeça, esvoaçando para trás e para cima (mais compridas atrás). Cabeça com desfoque de 8 px,
  // mechas de 12 px; véu urucum (screen .3) só sobre as mechas. estado {o, k (escala; âncora na base do pescoço),
  // boca 0..1, furia 0..1}; a tinta é quase preta (a do entardecer desbotaria a sombra) ----------
  function sombraGigante(c) {
    const g = S.cenario.geometria, AX = 1274, AY = 1010, CX = -30, CY = -420, rad = Math.PI / 180; // k = 1,45: cabeça em (1230, 400)
    const liso = P => { // Catmull-Rom fechado → Bézier
      const n = P.length, q = i => P[(i + n) % n];
      let d = `M${R1(P[0][0])} ${R1(P[0][1])}`;
      for (let i = 0; i < n; i++) {
        const a = q(i - 1), b = q(i), e = q(i + 1), f = q(i + 2);
        d += `C${R1(b[0] + (e[0] - a[0]) / 6)} ${R1(b[1] + (e[1] - a[1]) / 6)} ${R1(e[0] - (f[0] - b[0]) / 6)} ${R1(e[1] - (f[1] - b[1]) / 6)} ${R1(e[0])} ${R1(e[1])}`;
      }
      return d + 'Z';
    };
    const cabeca = liso([[70, 0], [80, -120], [110, -230], [150, -330], [165, -420], [150, -510], [110, -580], [40, -625], [-50, -632], [-130, -602], [-190, -540],
      [-214, -470], [-206, -434], [-250, -388], [-236, -352], [-238, -330], [-222, -318], [-120, -312], [-60, -300], [-70, -240], [-45, -120], [-30, 0]]);
    const queixo = liso([[-222, -318], [-230, -292], [-220, -262], [-190, -238], [-140, -224], [-80, -222], [-30, -242], [20, -292], [10, -322], [-120, -320]]);
    const orelhaP = [[-20, -118], [26, -142], [60, -88], [70, -10], [56, 54], [24, 100], [-10, 106], [-32, 74], [-34, 10], [-40, -56]]
      .map(([x, y]) => { const a = 18 * rad; return [130 + x * Math.cos(a) - y * Math.sin(a), -455 + x * Math.sin(a) + y * Math.cos(a)]; });
    const orelha = liso(orelhaP), helice = g.fita(g.bez([118, -540], [168, -470], [140, -380], 10), u => 14 * Math.sin(Math.PI * u) + 1);
    const olho = g.lente([-178, -462], [-140, -458], 7, -2, 8);
    // mechas: raízes num arco fora do crânio (105° no alto … −25° na nuca), direção para trás e para cima
    const mechas = [];
    for (let i = 0; i < 9; i++) {
      const k = i / 8, a = (105 - 130 * k) * rad, R0 = 228, raiz = [CX + R0 * Math.cos(a), CY - R0 * Math.sin(a)];
      const L = 270 + 250 * k + 30 * Math.sin(i * 2.1), d0 = 72 - 58 * k + 6 * Math.sin(i * 1.7), cs = [[0, 0]];
      for (let j = 1; j <= 14; j++) { const u = j / 14, an = (d0 + 30 * Math.pow(u, 1.4) + 7 * Math.sin(u * 5 + i)) * rad, q = cs[j - 1]; cs.push([q[0] + Math.cos(an) * L / 14, q[1] - Math.sin(an) * L / 14]); }
      mechas.push({ raiz, d: g.fita(cs, u => (38 + 8 * Math.sin(i * 1.3)) * Math.pow(1 - u, .85) + 1.5), f: .8 + .6 * S.hash(i * 7 + 1), fi: S.hash(i * 7 + 2) * 6.3 });
    }
    const T = '#1A0D06', mk =  'x="-900" y="-1200" width="2200" height="1600"';
    const elC = svgNovo(`<defs><mask id="ar-gig-m" maskUnits="userSpaceOnUse" ${mk}><rect ${mk} fill="#fff"/><path d="${orelha}" fill="#000" stroke="#000" stroke-width="44" stroke-linejoin="round"/>` +
      `<path d="${olho}" fill="#000"/></mask><mask id="ar-gig-o" maskUnits="userSpaceOnUse" ${mk}><rect ${mk} fill="#fff"/><path d="${helice}" fill="#000"/></mask></defs>` +
      `<g class="raiz" fill="${T}" opacity=".93"><path d="${cabeca}" mask="url(#ar-gig-m)"/><path d="${orelha}" mask="url(#ar-gig-o)"/><path class="queixo" d="${queixo}"/></g>`);
    const fios = cor => svgNovo(`<g class="raiz" fill="${cor}">${mechas.map(m => `<path d="${m.d}"/>`).join('')}</g>`);
    const elM = fios(T), elV = fios('#E8693A');
    elC.style.filter = 'blur(8px)'; elM.style.filter = 'blur(12px)'; elM.style.opacity = '.88';
    elV.style.cssText += ';filter:blur(14px);mix-blend-mode:screen';
    const est = { x: 0, o: 0, k: .6, boca: 0, furia: 0 }, ve = { x: 0, o: 0 };
    const raizes = [elC, elM, elV].map(e => e.querySelector('.raiz')), qx = elC.querySelector('.queixo');
    const ps = [elM, elV].map(e => [...e.querySelectorAll('path')]);
    let ult = '';
    fixo(c, 'L4', elC, est, t => {
      ve.o = .3 * est.o;
      if (est.o <= .001) return;
      const tr = `translate(${AX} ${AY}) scale(${(est.k * (1 + 2.2 * (S.palco.chama(t, 2.2) - 1))).toFixed(4)})`;
      if (tr !== ult) { ult = tr; for (const e of raizes) e.setAttribute('transform', tr); }
      qx.setAttribute('transform', `rotate(${(-14 * est.boca).toFixed(2)} 10 -310)`);
      const amp = 6 + 8 * est.furia, fr = 1 + .8 * est.furia;
      mechas.forEach((m, i) => {
        const v = `translate(${R1(m.raiz[0])} ${R1(m.raiz[1])}) rotate(${(amp * Math.sin(2 * Math.PI * m.f * fr * t + m.fi)).toFixed(2)})`;
        ps[0][i].setAttribute('transform', v); ps[1][i].setAttribute('transform', v);
      });
    });
    fixo(c, 'L4', elM, est);
    fixo(c, 'brilho', elV, ve);
    return est;
  }

  // ---------- rastros: a falsa Vó se desfaz em folhinhas que sobem para a esquerda (L3, tela), de t0 a t0 + 1,2 s ----------
  function revoada(c, cx, cy, t0) {
    const H = S.hash, el = svgNovo(), fs = [], a0 = c.abs(t0);
    for (let i = 0; i < 18; i++) {
      const p = document.createElementNS(NS, 'path'), L = 16 + 12 * H(i * 3 + 1);
      p.setAttribute('d', `M0 0C${R1(L * .3)} ${R1(-L * .32)} ${R1(L * .75)} ${R1(-L * .3)} ${R1(L)} 0C${R1(L * .75)} ${R1(L * .3)} ${R1(L * .3)} ${R1(L * .32)} 0 0Z`);
      p.setAttribute('fill', 'var(--sb-tinta,#24140A)');
      el.appendChild(p);
      fs.push({ p, x0: cx + (H(i * 5 + 2) - .5) * 90, y0: cy - 250 * H(i * 5 + 3), dx: -(160 + 220 * H(i * 5 + 4)), dy: -(180 + 240 * H(i * 5 + 5)), g: (H(i * 5 + 6) - .5) * 900, a: H(i * 5 + 7) * 360 });
    }
    el.style.filter = 'blur(1.2px)';
    let vis = null;
    fixo(c, 'L3', el, { x: 0, o: 1 }, t => {
      const u = (t - a0) / 1.2, v = u > 0 && u < 1;
      if (v !== vis) { vis = v; el.style.display = v ? '' : 'none'; }
      if (!v) return;
      const e = 1 - (1 - u) * (1 - u), o = (.9 * Math.min(1, u * 6, (1 - u) * 3)).toFixed(3);
      for (const f of fs) {
        f.p.setAttribute('transform', `translate(${R1(f.x0 + f.dx * e + 14 * Math.sin(u * 9 + f.a))} ${R1(f.y0 + f.dy * e)}) rotate(${R1(f.a + f.g * u)})`);
        f.p.setAttribute('opacity', o);
      }
    });
  }

  // ---------- poeira da vara (camada dos bonecos, à frente deles; tela): grãos e nuvens de terra levantando do chão,
  // função pura de t. env(t) 0..1 dado por trechos [t0 (s da cena), t1, nível] ----------
  function poeiraDaVara(c, trechos) {
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d'), H = S.hash;
    cv.width = 1920; cv.height = 1080; cv.style.cssText = 'position:absolute;left:0;top:0;width:1920px;height:1080px';
    const env = t => { let v = 0; for (const [a, b, n] of trechos) v = Math.max(v, n * clamp((t - c.abs(a)) / .8, 0, 1) * clamp((c.abs(b) - t) / 1.2, 0, 1)); return v; };
    let vis = null;
    c.possuir({ camadas: { bonecos: cv }, atualizar(t) {
      const e = env(t);
      if ((e > .01) !== vis) { vis = e > .01; cv.style.display = vis ? '' : 'none'; }
      cv.style.transform = `translate(${c.palco.camera.x.toFixed(1)}px,0)`;
      if (!vis) return;
      ctx.clearRect(0, 0, 1920, 1080);
      const L = c.palco.luz, PP = S.palco.PAPEL, hx = PP.x + L.hotX / 100 * PP.w, hy = PP.y + L.hotY / 100 * PP.h, hrx = L.hotRX / 100 * PP.w, hry = L.hotRY / 100 * PP.h;
      for (let i = 0; i < 26; i++) { // nuvens baixas: densas dentro do feixe (hotspot), ralas fora dele
        const P = 2.4 + H(i * 5 + 1) * 1.6, a = ((t / P + H(i * 5 + 2)) % 1), x = 100 + H(i * 5 + 3) * 1720 - 160 * a, y = 830 - 40 * a, R = 70 + 90 * H(i * 5 + 4) * (.6 + a);
        const fe = Math.max(.3, Math.exp(-(((x - hx) / hrx) ** 2) - (((y - hy) / hry) ** 2)));
        const gr = ctx.createRadialGradient(x, y, 0, x, y, R);
        gr.addColorStop(0, `rgba(92,64,38,${(.4 * fe * e * Math.sin(Math.PI * a)).toFixed(3)})`); gr.addColorStop(1, 'rgba(92,64,38,0)');
        ctx.fillStyle = gr; ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
      }
      ctx.fillStyle = 'rgb(70,48,28)';
      for (let i = 0; i < 240; i++) { // grãos que sobem do chão e caem devagar
        const P = 1.4 + H(i * 7 + 1) * 1.4, a = ((t / P + H(i * 7 + 2)) % 1), x = 80 + H(i * 7 + 3) * 1760 - 120 * a + 8 * Math.sin(t * 2 + i);
        const y = 845 - (40 + 300 * H(i * 7 + 4)) * Math.sin(Math.PI * .5 * Math.min(1, a * 1.6)) + 60 * Math.max(0, a - .62);
        const s = 1.4 + 3 * H(i * 7 + 5);
        ctx.globalAlpha = .45 * e * (1 - a) * Math.min(1, a * 6);
        ctx.fillRect(x, y, s, s);
      }
      ctx.globalAlpha = 1;
    } });
  }

  /* ─────────────────────────── aviso: o assobio ───────────────────────────
   * A beira do riacho na luz do entardecer, com a samaúma no terço direito e a clareira iluminada no painel do meio:
   * Tião mira de pé, firme, a veada que bebe à esquerda; o Zé um passo atrás; o cachorro à frente. O assobio desvia o
   * tiro; a veada dispara para a direita num salto por cima dos caçadores e reaparece longe, no barranco (L3). Atrás da
   * samaúma a sombra do Curupira (L4) cresce até cobrir o painel da direita e parte do meio. */
  S.cenas.registrar('aviso', (tl, ctx) => {
    const K = S.kit, E = S.elenco, G = E.gestos, B = S.bichos, CHAO = K.CHAO;
    const T = ctx.t, TF = ctx.tf, sfx = s => ctx.sfx(s)[0];
    const LUZ = TARDE(), MIRA = { hotX: 44, hotY: 44, hotRX: 52, hotRY: 76 };
    const c = K.posse(tl, ctx, { saida: 'folha', luz: Object.assign({}, LUZ, MIRA), luzDur: 1.4 }), p = c.palco;
    const cen = c.possuir(S.cenarios.aviso(p)), P = cen.pecas;
    const g = (b, nome, t, o) => G[nome](tl, b, t, o || {});
    const CAM = -1400, W = x => x + CAM;                               // samaúma (x 300) no terço direito; tela → mundo

    // elenco (tela): veada 300 · cachorro 790 · Tião 920 · Zé 1080 — ≥ 130 px entre pivôs e ninguém sobre os montantes
    // (o cachorro mede ±105 px: em 790 o focinho fica fora do montante de 641–675)
    const veada = c.boneco(B.veada({ x: W(300), y: CHAO + 4, escala: 1.05, bebe: 1, alerta: .35 }));
    const cao = c.boneco(B.cachorro({ x: W(790), y: CHAO, dir: -1, alerta: .6 }));
    // o Zé num contêiner próprio: no recuo (aviso_05) desgruda da tela com desfoque e escurece (zf.k 0..1)
    const zf = { k: 0 };
    const ze = envolver(c, E.ze({ x: W(1080), y: CHAO, escala: 1.05, dir: -1 }), ['bonecos', 'brilho'], 'bonecos',
      () => zf.k > .002 ? `blur(${(6 * zf.k).toFixed(2)}px) brightness(${(1 - .3 * zf.k).toFixed(3)})` : 'none');
    const tiao = c.boneco(E.tiao({ x: W(920), y: CHAO, escala: 1.1, dir: -1 }));
    // mira firme: pés a ~0,3H, tronco ereto inclinado 8°, cabeça de perfil encostada na coronha, chapéu à vista
    E.set(tiao, 'mirar'); E.set(tiao, { a: { peito: 8, cabeca: 10, pernaFrente: -15, pernaTras: 15 } });
    const longe = c.boneco(B.veada({ x: 560, y: CHAO, escala: .55, z: .12, opacidade: 0 }), { camada: 'L3' });
    const gig = sombraGigante(c);

    K.camera(tl, p, CAM, 0, 0);
    K.anima(tl, P.barranco.estado, { x: -1000 }, 0, 0);                 // o barranco no painel da direita, acima das sapopemas
    K.anima(tl, P.galho.estado, { x: -1840 }, 0, 0);                   // despenca entre a veada e os caçadores (tela 560)

    // 01 · a mata se cala: as folhas param; só a chama mexe. A veada ergue a cabeça.
    K.anima(tl, cen.estado, { vento: 0 }, .8, 1.6, 'sine.out');
    K.anima(tl, veada.pose, { bebe: 0, alerta: 1 }, T('aviso_01') + 2.2, 1.1, 'sine.inOut');

    // 02 · um segundo de coração; o assobio; só a mão e o cano tremem; o tiro desvia (o cano sobe); o galho despenca
    const tAss = sfx('assobio_curupira'), tTiro = sfx('tiro_espingarda'), tGalho = sfx('galho_quebra'), tAlarme = sfx('veado_alarme');
    E.osc(tl, tiao, tAss, 'espingarda', 4, .1, Math.max(1, Math.floor((tTiro - tAss - .02) / .1)));
    E.osc(tl, tiao, tAss, 'antebracoFrente', -3, .1, Math.max(1, Math.floor((tTiro - tAss - .02) / .1)));
    g(tiao, 'atirar', tTiro, { desvio: true, segura: .5 });
    const brilho = K.valor(p.luz, 'brilho');
    K.luz(tl, p, { brilho: 1.32 }, tTiro, .04, 'none');                  // clarão do tiro
    K.luz(tl, p, { brilho }, tTiro + .04, .4, 'power2.out');
    K.abalo(tl, p, tTiro, .35, 4);
    K.anima(tl, veada.pose, { alerta: 0 }, tAlarme, .1);
    // a fuga: corre para a direita e, de 600 a 1400 (tela), salta por cima do cachorro e dos dois (dy −420 no meio)
    const v0 = tAlarme + .12, v1 = tAlarme + 1.75, vEm = x => v0 + (v1 - v0) * (x - 300) / (2080 - 300);
    K.caminhar(tl, veada, { ate: W(2080), t0: v0, t1: v1, ...B.andadura(veada, 'salto') });
    const s0 = vEm(600), s1 = vEm(1400), sm = (s0 + s1) / 2;
    K.anima(tl, veada.pose, { dy: -420, rot: -8 }, s0, sm - s0, 'power2.out');
    K.anima(tl, veada.pose, { dy: 0, rot: 0 }, sm, s1 - sm, 'power2.in');
    K.anima(tl, P.galho.estado, { o: 1 }, tGalho - .05, 0);
    K.anima(tl, P.galho.estado, { y: 900, rot: 34 }, tGalho, .55, 'power2.in');
    K.anima(tl, P.galho.estado, { rot: 26 }, tGalho + .55, .25, 'power2.out');
    K.abalo(tl, p, tGalho + .55, .25, 2);
    K.anima(tl, cao.pose, { medo: 1, alerta: 0 }, tTiro, .2, 'power3.out');  // rabo entre as pernas, cabeça baixa
    K.tremer(tl, cao, tTiro, .6, 2.5);
    g(ze, 'recuar', tAlarme + .9, { dx: 26, z: .18, dur: .9 });         // a veada passa por cima: Zé 1080 → 1106
    let u = g(tiao, 'levantar', tTiro + 1.3, { dur: .7 });

    // 03 · ao longe, a veada para no alto do barranco, olha para trás e some. Tião dá dois passos para trás (920 → 840);
    // o cachorro trota encolhido para trás do Zé (tela 976: entre os dois, 136 e 130 px) e espia
    const topo = cen.pontos.barranco.topo, by = x => topo(x + 1000);
    const tL = T('aviso_03') + .5;
    u = g(tiao, 'virar', u + .05);
    G.andar(tl, tiao, u + .15, { ate: W(840), dur: .8, deCostas: true, modo: 'pontaDosPes' });
    g(ze, 'virar', T('aviso_03') + .6);
    K.luz(tl, p, { hotX: 56, hotY: 46, hotRX: 58, hotRY: 78 }, T('aviso_03') + .2, 2.2);  // a luz acompanha a veada
    K.anima(tl, longe.pose, { opacidade: 1 }, tL, .3);
    K.caminhar(tl, longe, { de: 560, ate: 800, t0: tL, t1: tL + 1, ...B.andadura(longe, 'salto') });
    K.anima(tl, longe.pose, { y: by(800) }, tL, 1, 'sine.out');
    K.anima(tl, longe.pose, { olharTras: 1 }, tL + 1.6, .6, 'sine.inOut');
    K.anima(tl, longe.pose, { olharTras: 0 }, tL + 3.8, .4, 'sine.inOut');
    K.caminhar(tl, longe, { ate: 1180, t0: tL + 4.3, t1: tL + 5.4, ...B.andadura(longe, 'salto') });
    K.anima(tl, longe.pose, { y: by(1180) }, tL + 4.3, 1.1, 'none');
    K.anima(tl, longe.pose, { opacidade: 0 }, tL + 5.2, .25);
    g(tiao, 'olhar', tL + .4, { para: 'cima' });
    const tGan = sfx('cachorro_ganido');
    K.caminhar(tl, cao, { ate: W(976), t0: tGan - 1, t1: tGan - .3, ...B.andadura(cao, 'trote') }); // vira para a direita e se esconde
    K.tremer(tl, cao, tGan, 1.2, 2);
    K.anima(tl, cen.estado, { agito: 1.2 }, sfx('folhagem_mexe'), .4, 'power2.out'); // tudo se mexe junto, sem vento

    // 04 · a sombra enorme atrás da samaúma e dos dois: cresce de 0,6 a 1,45 em 1,2 s, tremendo com a chama; boca entreaberta nas
    // sílabas, mechas para trás; some no fim da fala
    const t4 = T('aviso_04'), f4 = TF('aviso_04');
    K.luz(tl, p, { brilho: .92, vinheta: .62, hotX: 62, hotY: 38, hotRX: 66, hotRY: 80 }, t4, 1.6);
    K.anima(tl, gig, { o: .95 }, t4, .5, 'power1.out');
    K.anima(tl, gig, { k: 1.45 }, t4, 1.2, 'power2.out');
    K.anima(tl, gig, { furia: .7 }, t4, 2, 'sine.inOut');
    for (let t = t4 + .35, i = 0; t < f4 - .35; t += .2 + .14 * S.hash(i * 31 + 7), i++) { // a boca abre nas sílabas
      K.anima(tl, gig, { boca: .35 + .65 * S.hash(i * 13 + 3) }, t, .08, 'power1.out');
      K.anima(tl, gig, { boca: 0 }, t + .08, .1, 'power1.in');
    }
    K.anima(tl, gig, { o: 0, k: 1.6 }, f4 - .05, .9, 'power2.in');
    K.anima(tl, cen.estado, { agito: 0 }, f4, 1.2, 'sine.inOut');
    K.luz(tl, p, Object.assign({ brilho }, MIRA, { vinheta: LUZ.vinheta }), f4 + .1, 1.4);
    g(tiao, 'olhar', t4 + .7, { para: 'frente', dur: .5 });
    g(tiao, 'olhar', t4 + 2.2, { para: 'cima', dur: 1.2 });
    g(tiao, 'tremer', t4 + 2.6, { dur: f4 - t4 - 2.8, amp: .35 });
    g(ze, 'olhar', t4 + .4, { para: 'cima' });
    u = g(ze, 'virar', t4 + 2.6);                                      // gira procurando de onde vem a voz
    u = g(ze, 'virar', u + 1.6);
    u = g(ze, 'virar', u + 1.1, { dur: .2 });                          // acaba virado para o Tião
    g(ze, 'olhar', u + .5, { para: 'frente' });

    // 05 · "Quem falou isso, Tião?": o Zé desgruda da tela sem sair do lugar: cresce do chão (1,35×, pés em CHAO + 20),
    // desfoca 6 px, escurece (.7) e treme 2 px a 9 Hz; opacidade 1 (a translucidez é a do multiply)
    const t5 = T('aviso_05'), f5 = TF('aviso_05'), eZ = K.valor(ze.pose, 'escala'), a5 = c.abs(t5 + .1), z5 = c.abs(f5 + .25);
    E.pose(tl, ze, 'medo', t5 + .05, .2, 'power3.out');
    E.ir(tl, ze, { escala: eZ * 1.35, y: CHAO + 20 }, t5 + .05, .3, 'power3.out');
    K.anima(tl, zf, { k: 1 }, t5 + .05, .3, 'power3.out');
    ze.motores.push((b, t) => { if (t > a5 && t < z5) { b.extra.dy += 2 * Math.sin(2 * Math.PI * 9 * t); b.extra.a.peito = (b.extra.a.peito || 0) + .5 * Math.sin(2 * Math.PI * 9 * t + 1.3); } });
    g(ze, 'falar', t5, { dur: f5 - t5 });
    E.ir(tl, ze, { escala: eZ, y: CHAO }, f5 + .25, .6);
    K.anima(tl, zf, { k: 0 }, f5 + .25, .6);
    E.pose(tl, ze, 'neutra', f5 + .25, .6);

    // 06 · "Foi o vento, menino. Vamos embora.": dá as costas depressa e sai ligeiro, de ombros duros
    const t6 = T('aviso_06'), f6 = TF('aviso_06');
    K.anima(tl, cen.estado, { vento: 1.3 }, sfx('vento_folhas'), 2, 'sine.inOut');
    g(tiao, 'falar', t6, { dur: f6 - t6 });
    u = g(tiao, 'virar', t6 + .9, { dur: .12 });
    E.pose(tl, tiao, { a: { peito: -7, cabeca: -6 } }, u, .25, 'power2.out');
    const tAnda = u + .3, tFim7 = TF('aviso_07'), CAM2 = CAM - 700;
    K.luz(tl, p, Object.assign({}, LUZ, { hotX: 40 }), t6, 4);
    K.camera(tl, p, CAM2, tAnda, tFim7 - tAnda, 'sine.inOut');
    G.andar(tl, tiao, tAnda, { ate: CAM2 + 260, dur: tFim7 - tAnda, modo: 'ligeiro' });

    // 07 · o Zé vai atrás, de cabeça virada para trás; o assobio curto responde do fundo: os três apertam o passo e saem
    const t7 = T('aviso_07');
    g(ze, 'olhar', t7 - .4, { para: 'frente' });
    G.andar(tl, ze, t7 - .1, { ate: CAM2 + 470, dur: tFim7 - t7 + .1, modo: 'ligeiro' });
    E.pose(tl, ze, { a: { cabeca: -10 } }, t7 + .6, .4);
    K.caminhar(tl, cao, { ate: CAM2 + 620, t0: t7 + .3, t1: tFim7 });
    K.anima(tl, cao.pose, { medo: .7 }, t7, .5);
    const tA2 = ctx.sfx('assobio_curupira')[1];
    for (const [b, ate, atraso] of [[tiao, CAM2 - 1000, 0], [ze, CAM2 - 790, .1], [cao, CAM2 - 640, .18]]) {
      K.tremer(tl, b, tA2, .25, 2.5);
      K.caminhar(tl, b, { ate, t0: tA2 + .25 + atraso, t1: tA2 + 1.55 + atraso, correr: true, ...(b === cao ? B.andadura(cao, 'galope') : {}) });
    }
  });

  /* ─────────────────────────── rastros: os pés virados ───────────────────────────
   * Mata sem fim (K.camera). Andam "no mesmo lugar" no painel iluminado do meio, seguindo os dedos das pegadas; a
   * embaúba caída (tronco de 830 a 1210) volta ao centro a cada folha que passa; a noite cai com o urutau; a falsa Vó
   * acima do horizonte da mata média; sob outra folha, a samaúma de lâminas com a sapopema da frente descendo até o
   * meio, a vara de queixadas em duas ondas e a espingarda partida no chão claro do meio.
   * Pivôs sempre ≥ 120 px entre bonecos; ninguém para em 620–700 nem em 1240–1300 (montantes). */
  S.cenas.registrar('rastros', (tl, ctx) => {
    const K = S.kit, E = S.elenco, G = E.gestos, B = S.bichos, CHAO = K.CHAO;
    const T = ctx.t, TF = ctx.tf, sfx = (s, i) => ctx.sfx(s)[i || 0];
    const LUZ = TARDE(), NOITE_L = NOITE();
    const c = K.posse(tl, ctx, { entrada: 'corte', saida: 'folha', luz: LUZ }), p = c.palco;
    const cen = c.possuir(S.cenarios.rastros(p)), P = cen.pecas, PT = cen.pontos;
    const g = (b, nome, t, o) => G[nome](tl, b, t, o || {});
    const cam = { v: 0 }, M = x => x + cam.v;                         // tela → mundo, com a câmera agendada
    K.anima(tl, P.embauba.estado, { o: 0 }, 0, 0);                     // a embaúba e a samaúma desta cena são as daqui

    // a fila lê o rastro no painel do meio: cachorro 800 · Zé 940 · Tião 1080 (140 px; o cachorro mede ±105)
    const cao = c.boneco(B.cachorro({ x: 800, y: CHAO, fareja: 1 }));
    const ze = c.boneco(E.ze({ x: 940, y: CHAO, escala: 1.05 }));
    const tiao = c.boneco(E.tiao({ x: 1080, y: CHAO, escala: 1.1 }));
    // o cachorro que volta (rastros_16) fica à frente das pernas do Zé: criado depois dele
    const cao2 = envolver(c, B.cachorro({ x: -300, y: CHAO, escala: 1.3, riscos: true, medo: 1, z: .8, opacidade: 0 }), ['bonecos'], 'bonecos', 'brightness(1.5) saturate(1.25)');
    const urutau = c.boneco(B.urutau({ toco: false, x: -500, y: CHAO, opacidade: 0 }));
    // a falsa Vó: longe (L3), de pé acima do horizonte da mata média (pés em y 700), vulto preto pouco borrado
    const vo = envolver(c, E.vo({ x: 2000, y: 700, escala: .9, dir: -1, opacidade: 0 }), ['bonecos', 'brilho'], 'L3', 'brightness(0) blur(1.4px)');
    E.set(vo, { a: { cabeca: -16, peito: 16 }, s: { cabeca: 1.12, peito: 1.06 } }); // costas curvadas; o perfil não fecha
    // vara: 7 queixadas na 1ª onda (da direita para a esquerda; as da frente grandes e nítidas) e 6 + o vulto montado na
    // 2ª (da esquerda para a direita, mais longe da tela: maiores e borradas)
    const vara = B.vara(7, { semente: 9, x: 4000, y: CHAO, dir: -1 }).map((b, i) => {
      const z = [0, .32, .08, .4, .16, .24, .02][i];
      Object.assign(b.pose, { z, escala: 1.75 - z * 1.1, y: CHAO + 8 - 26 * z });
      return c.boneco(b);
    });
    const volta = B.vara(6, { semente: 23, x: -600, y: CHAO });
    const montado = B.curupiraMontado({ x: -600, y: CHAO, escala: 1.25 });
    volta.forEach((b, i) => { const z = .3 + .25 * S.hash(i * 7 + 2); Object.assign(b.pose, { z, escala: 1.4 - z * .6, y: CHAO - 30 * z }); c.boneco(b); });
    Object.assign(montado.pose, { z: .34, y: CHAO - 10 });
    envolver(c, montado, ['bonecos'], 'bonecos', 'brightness(.14) blur(1px)');            // vulto: só o cabelo de fogo tem cor
    envolver(c, montado, ['brilho'], 'brilho', 'none', null, false);
    volta.splice(3, 0, montado);
    // a sombrinha do Curupira (L3), no horizonte da mata média (pés em y 720)
    const sombra = envolver(c, E.curupira({ x: 1560, y: 720, escala: .8, dir: -1, opacidade: 0 }), ['bonecos', 'brilho'], 'L3', 'brightness(0) blur(1.6px)');
    const emb = embaubaCaida(c), sam = samaumaLaminas(c);
    const quente = document.createElement('div');                      // resto quente da lamparina, à noite, no painel da direita
    quente.style.cssText = 'position:absolute;left:0;top:0;width:1920px;height:1080px;background:radial-gradient(circle 760px at 1790px 900px,rgba(255,150,64,.2),rgba(255,150,64,0) 72%)';
    const qe = fixo(c, 'brilho', quente, { x: 0, o: 0 });

    const camera = (x, t, dur, ease) => { K.camera(tl, p, x, t, dur, ease || 'none'); cam.v = x; };

    // 01 · Tião se agacha e lê o chão; as pegadas pequenas se acendem uma a uma, dedos para a direita, no chão
    const t1 = T('rastros_01');
    E.pose(tl, tiao, { a: { peito: 40, cabeca: 16, pernaFrente: -14, pernaTras: 14 }, maos: { Tras: [70, -120] }, maoAng: { Tras: -50 } }, t1, .7); // sem joelho: curva-se sobre o rastro
    E.osc(tl, tiao, t1 + .8, 'cabeca', 7, .8, 1);
    K.anima(tl, cao.pose, { fareja: 1 }, t1, .1);
    const tP0 = sfx('passos_folhas'), tP1 = sfx('bloco_madeira');
    marcas(c, Array.from({ length: 11 }, (_, k) => ({ x: 1200 + k * 62, y: CHAO + 5 + (k % 2 ? 2 : -2), dir: 1, lado: k % 2 ? 1 : -1, escala: 1.1, achatar: .55,
      giro: (k % 2 ? 1 : -1) * 3, t0: tP0 + (tP1 - tP0) * k / 10, dura: 26, halo: true }))); // ele foi para a esquerda, de calcanhar

    // 02 · "Rastro de gente pequena. Vamos atrás, que dá em casa.": levanta e aponta para a direita, para onde vão os dedos
    const t2 = T('rastros_02'), f2 = TF('rastros_02');
    g(tiao, 'levantar', t2 + .05, { dur: .6 });
    g(tiao, 'apontar', t2 + .8, { segura: 1.4 });
    g(tiao, 'falar', t2, { dur: f2 - t2 });
    K.anima(tl, cao.pose, { fareja: 0, alerta: 1 }, t2 + .6, .4);
    g(ze, 'olhar', t2 + 1.2, { para: 'frente' });

    // 03–04 · seguem para a direita, andando no mesmo lugar enquanto a mata desliza; a embaúba anda com o chão desde a
    // borda direita e chega ao centro quando eles param, na frente dela. Ao fundo (L3) a sombrinha saltita de calcanhar
    // para a esquerda, para 0,6 s no meio do painel, de perfil, e some
    const a0 = T('rastros_03') + .2, a1 = T('rastros_04') + 3.4, D1 = 1100, pg = { dura: 5, opacidade: .4 };
    K.anima(tl, cao.pose, { alerta: 0 }, a0, .3);
    K.caminhar(tl, tiao, { ate: M(1080 + D1), t0: a0, t1: a1, pegadas: pg });
    K.caminhar(tl, ze, { ate: M(940 + D1), t0: a0 + .25, t1: a1, pegadas: pg });
    K.caminhar(tl, cao, { ate: M(800 + D1), t0: a0 + .5, t1: a1 });
    camera(D1, a0, a1 - a0);
    K.anima(tl, emb, { x: D1 }, a0, 0);
    K.anima(tl, emb, { x: 0 }, a0, a1 - a0, 'none');                   // mesma velocidade do chão
    const s0 = T('rastros_03') + 1.4, s1 = sfx('caxixi'), camEm = t => D1 * clamp((t - a0) / (a1 - a0), 0, 1), sm = (s0 + s1 - .3) / 2 - .3;
    K.anima(tl, sombra.pose, { x: 1500 + .55 * camEm(s0) }, s0, 0);
    K.anima(tl, sombra.pose, { opacidade: .7 }, s0, .4);
    G.andar(tl, sombra, s0, { ate: 960 + .55 * camEm(sm), dur: sm - s0, modo: 'saltitar' });
    G.andar(tl, sombra, sm + .6, { ate: 480 + .55 * camEm(s1 - .3), dur: s1 - .3 - sm - .6, modo: 'saltitar' });
    const bs0 = c.abs(s0), bs1 = c.abs(s1 - .3), bsm = c.abs(sm);           // pulinho de 10 px a cada passo, menos na parada
    sombra.motores.push((b, t) => { if (t > bs0 && t < bs1 && Math.abs(t - bsm - .3) > .3) b.extra.dy -= 10 * Math.abs(Math.sin(Math.PI * 3.2 * t)); });
    K.anima(tl, sombra.pose, { opacidade: 0 }, s1 - .6, .5, 'power1.in');
    const tG1 = sfx('gongo_grave');
    g(tiao, 'olhar', tG1 - .3, { para: 'baixo' });

    // 05 · "Essa é a embaúba que eu derrubei.": Zé volta até o corte (tela 745, à esquerda do bisel), vira, agacha e passa a
    // mão no corte; o cachorro cruza para o lugar dele (940) e fareja o tronco
    const t5 = T('rastros_05'), f5 = TF('rastros_05'), corte = emb.corte, xAg = 745;
    g(ze, 'falar', t5, { dur: f5 - t5 });
    let u = G.andar(tl, ze, a1 + .15, { ate: M(xAg), dur: 1, modo: 'ligeiro' });
    u = g(ze, 'virar', u + .05);
    u = E.pose(tl, ze, 'agachado', u, .45);
    u = E.pose(tl, ze, { maos: { Frente: { mundo: [M(corte[0] + 2), corte[1] + 2] } }, maoAng: { Frente: -10 } }, u, .35);
    E.osc(tl, ze, u, 'antebracoFrente', 8, .6, Math.max(1, Math.round((f5 - u) / .6)));
    K.caminhar(tl, cao, { ate: M(940), t0: a1 + .35, t1: a1 + 1.35, ...B.andadura(cao, 'trote') });
    K.anima(tl, cao.pose, { fareja: 1 }, a1 + 1.4, .3);
    g(tiao, 'olhar', t5 + .4, { para: 'frente' });

    // 06 · andam de novo (Zé 745 · cachorro 940 · Tião 1080); a cada volta uma folha passa, a mata desliza e a embaúba volta
    // ao centro, mais escura. Tião arranca o chapéu (fica na mão de trás, baixo, no quadril) e coça a nuca com a da frente
    const t6 = T('rastros_06'), gA = sfx('gongo_grave', 1), gB = sfx('gongo_grave', 2), D2 = 420, v6 = D2 / (gB - t6 - .2);
    g(ze, 'levantar', t6 - .35, { dur: .4 });
    K.anima(tl, cao.pose, { fareja: 0 }, t6, .2);
    K.caminhar(tl, ze, { ate: M(xAg + D2), t0: t6 + .15, t1: gB, pegadas: pg });
    K.caminhar(tl, tiao, { ate: M(1080 + D2), t0: t6 + .2, t1: gB, pegadas: pg });
    K.caminhar(tl, cao, { ate: M(940 + D2), t0: t6 + .35, t1: gB });
    camera(D1 + D2, t6 + .15, gB - t6 - .15);
    let x0 = t6 + .15;
    [[gA, .45], [gB, .9]].forEach(([gg, escuro], i) => {
      const cobre = K.folha(tl, gg - 1.25, { dur: .9, de: i ? 'esquerda' : 'direita' });
      K.anima(tl, emb, { x: -v6 * (cobre - x0) }, x0, cobre - x0, 'none'); // anda com o chão até a folha cobrir
      K.anima(tl, emb, { x: 1300, escuro }, cobre, 0);
      K.anima(tl, emb, { x: 0 }, cobre + .05, gg - cobre - .05, 'power2.out');
      x0 = gg;
    });
    u = g(tiao, 'tirarChapeu', t6 + .4, { para: { a: { cabeca: 12, peito: 4 }, maos: { Tras: { ancora: 'cintura', d: [-34, 26] } }, maoAng: { Tras: -70 } } });
    u = E.pose(tl, tiao, { maos: { Frente: { ancora: 'topo', d: [-38, 62] } }, maoAng: { Frente: -120 } }, u, .35); // a mão da frente coça a nuca
    E.osc(tl, tiao, u, 'maoFrente', 14, .2, 6);

    // 07 · cai a noite; no toco o urutau, parado como galho, abre os olhos âmbar e chora com voz de gente; o cachorro foge
    // para trás do Zé (tela 500, no painel da esquerda)
    const t7 = T('rastros_07'), tU = sfx('urutau'), poleiro = PT.toco.poleiro;
    K.luz(tl, p, NOITE_L, t7, 2.6);
    K.anima(tl, qe, { o: 1 }, t7 + .6, 2.4, 'sine.inOut');
    K.anima(tl, P.toco.estado, { o: 1 }, t7, 1.2, 'sine.inOut');
    K.anima(tl, urutau.pose, { x: M(poleiro[0]), y: poleiro[1] + 4 }, t7, 0);
    K.anima(tl, urutau.pose, { opacidade: 1 }, t7, 1.2, 'sine.inOut');
    K.anima(tl, urutau.pose, { olhos: 1 }, tU - .25, .35, 'power2.out');
    K.anima(tl, urutau.pose, { canto: 1 }, tU, .3);
    K.anima(tl, urutau.pose, { canto: 0 }, TF('rastros_07') + .2, .4);
    K.particulas(tl, p, 'vagalumes', t7 + 1, TF('rastros_16') + 1, { nivel: .45, entra: 2 });
    g(ze, 'encolher', tU + .2, { segura: .8, tremor: .5 });
    K.caminhar(tl, cao, { ate: M(500), t0: tU + .15, t1: tU + .95, ...B.andadura(cao, 'trote') });
    K.anima(tl, cao.pose, { medo: 1 }, tU + .1, .3);

    // 08 · "Do escuro piou um inhambu…": viram-se para o pio, à direita; longe (L3), acima do horizonte da mata, a silhueta
    // curvada de lenço (tela 1400, pés em y 700)
    const t8 = T('rastros_08'), tI = sfx('inhambu'), vx = 1400;
    u = g(tiao, 'virar', tI - 1.2, { dur: .2 });                       // olha para trás, perdido…
    g(tiao, 'virar', tI + .05);                                        // …e para o pio
    g(ze, 'virar', tI - .9, { dur: .2 });
    g(ze, 'virar', tI + .1);
    K.luz(tl, p, { hotX: 60, hotY: 34, hotRX: 54, hotRY: 80 }, t8 + .7, 2.6);   // o luar cai sobre a silhueta
    K.anima(tl, vo.pose, { x: vx + .55 * cam.v }, 0, 0);
    K.anima(tl, vo.pose, { opacidade: .92 }, TF('rastros_08') - 2.4, 1.8, 'sine.inOut');
    g(tiao, 'porChapeu', TF('rastros_08') - 1);

    // 09 · "Zé… ô, Zé… vem cá, meu filho.": acena devagar com o braço comprido demais (1,6×), erguido acima da cabeça
    const t9 = T('rastros_09'), f9 = TF('rastros_09');
    g(vo, 'falar', t9, { dur: f9 - t9 });
    u = E.pose(tl, vo, { maos: { Frente: { ancora: 'topo', d: [46, -96] } }, maoAng: { Frente: -110 } }, t9 + .3, .6);
    E.ir(tl, vo, { s: { bracoFrente: 1.3, antebracoFrente: 1.6 } }, t9 + .3, .6);
    E.osc(tl, vo, u, 'antebracoFrente', -22, 1.25, 3);
    g(ze, 'olhar', t9 + .6, { para: 'frente' });

    // 10 · "Vó? Vó, eu tô aqui!": dois passos de corrida para a silhueta (745 → 880)
    const t10 = T('rastros_10'), f10 = TF('rastros_10'), tCor = sfx('corrida_folhas');
    g(ze, 'falar', t10, { dur: f10 - t10 });
    G.andar(tl, ze, tCor - .45, { ate: M(880), dur: .7, modo: 'correr', passos: 2 });

    // 11 · Tião se põe no caminho e agarra o braço do Zé (corpos a 150 px: só a mão alcança); o tranco o devolve a 860.
    // A falsa Vó se desfaz em folhinhas que sobem para a esquerda (1,2 s)
    const t11 = T('rastros_11'), f11 = TF('rastros_11');
    g(tiao, 'falar', t11, { dur: f11 - t11 });
    u = G.andar(tl, tiao, t11 + .05, { ate: M(1030), dur: .6, modo: 'ligeiro' });
    g(tiao, 'agarrar', u, { em: ze, segura: 2.6 });
    E.ir(tl, ze, { x: M(860) }, u + .1, .3, 'power3.out');
    const tDes = f11 - 1.6;
    K.anima(tl, vo.pose, { opacidade: 0 }, tDes + .1, .45, 'power2.in');
    revoada(c, vx, 700, tDes);
    E.pose(tl, tiao, 'neutra', f11 - .2, .5);

    // 12 · troca sob a folha: a samaúma de lâminas (tronco no painel da direita, sapopema da frente descendo até 790); o
    // chão treme, entra poeira; os dois se colam de costas na sapopema (Tião 1170 · Zé 1030), o cachorro (860) ergue as orelhas
    const t12 = T('rastros_12'), f12 = TF('rastros_12'), cobre = K.folha(tl, t12 - .25, { dur: .9 });
    for (const [o, v] of [[P.toco.estado, { o: 0 }], [emb, { o: 0 }], [sam, { o: 1 }]]) K.anima(tl, o, v, cobre, 0);
    K.anima(tl, urutau.pose, { opacidade: 0 }, cobre, 0);
    E.ir(tl, tiao, { x: M(1120), dir: -1 }, cobre, 0); E.pose(tl, tiao, 'neutra', cobre, 0);
    E.ir(tl, ze, { x: M(985), dir: -1 }, cobre, 0); E.pose(tl, ze, 'neutra', cobre, 0);
    K.anima(tl, cao.pose, { x: M(860), dir: -1, alerta: 0, medo: 0 }, cobre, 0);
    const tGr = sfx('queixada_grunhido'), sac = cen.estado.camadas;
    for (const k of ['L2', 'L3', 'L4']) K.anima(tl, sac[k], { sacode: k === 'L2' ? 1.5 : 2.5 }, cobre + .6, tGr - cobre - .6, 'sine.in');
    K.luz(tl, p, { poeira: 1, brilho: .92, hotX: 50, hotY: 40, hotRX: 52, hotRY: 92, vinheta: .66 }, cobre + .6, 1.5); // luar no chão da clareira
    const tPr = sfx('prato');
    K.particulas(tl, p, 'poeira', cobre + 1.2, tPr + .9, { nivel: 1, entra: 2.5, sai: .9 });
    G.andar(tl, tiao, tGr - 1.6, { ate: M(1170), dur: 1.3, deCostas: true, modo: 'pontaDosPes' });
    G.andar(tl, ze, tGr - 1.4, { ate: M(1030), dur: 1.2, deCostas: true, modo: 'pontaDosPes' });
    E.pose(tl, tiao, 'colado', tGr - .3, .35);
    E.pose(tl, ze, 'colado', tGr - .15, .35);
    K.anima(tl, cao.pose, { alerta: 1 }, tGr - .1, .25, 'back.out(2)');
    g(ze, 'tremer', tGr + .3, { dur: f12 - tGr, amp: .6 });

    // 13 · "Queixada! Sobe, Zé! Sobe!": larga a espingarda (cai no chão claro do meio) e sobe pelo gume da sapopema; o Zé
    // sobe atrás e fica abraçado a ela, mais abaixo (Tião 1170 · Zé 1015: 155 px, sem cruzar)
    const t13 = T('rastros_13'), f13 = TF('rastros_13'), esp = P.espingarda.pose, xE = 960;
    g(tiao, 'falar', t13, { dur: f13 - t13 });
    for (const k of ['L2', 'L3', 'L4']) K.anima(tl, sac[k], { sacode: k === 'L2' ? 4 : 6 }, t13, 1.5, 'power2.in');
    K.abalo(tl, p, t13, .5, 4);
    u = g(tiao, 'largar', t13 + .1);
    K.anima(tl, esp, { x: M(1140), y: CHAO - 150, rot: 50, escala: 1.5, opacidade: 1 }, u - .35, 0);
    K.anima(tl, esp, { x: M(xE), y: CHAO + 4 }, u - .35, .5, 'power1.out');
    K.anima(tl, esp, { rot: -4 }, u - .35, .5, 'power2.in');
    const xT = 1170, xZe = 1015, alto = [M(xT), sam.borda(xT)], meio = [M(xZe), sam.borda(xZe)];
    u = g(tiao, 'virar', u);
    u = g(tiao, 'subir', u + .05, { ate: alto, dur: 1.05, volta: false });
    E.pose(tl, tiao, { a: { peito: 14, cabeca: 8, pernaFrente: -12, pernaTras: 12 }, maos: { Tras: [44, -250] } }, u, .35);   // de pé no gume, curvado
    let uz = g(ze, 'virar', t13 + .7);
    uz = g(ze, 'subir', uz + .05, { ate: meio, dur: .9, lances: 2, volta: false });
    E.pose(tl, ze, { a: { peito: 2, cabeca: -6, pernaFrente: -20, canelaFrente: 26, pernaTras: 10, canelaTras: 12 }, maos: { Frente: [44, -262], Tras: [40, -250] } }, uz, .3);
    K.anima(tl, cao.pose, { medo: 1, alerta: 0 }, t13 + .4, .3);
    K.tremer(tl, cao, t13 + .5, 1.6, 2);

    // 14 · 1ª onda da direita para a esquerda, na frente da sapopema, com poeira no feixe; 2ª da esquerda para a direita, mais
    // longe, com o vulto do Curupira montado na 4ª; o cachorro dispara latindo atrás e some; no prato a poeira assenta:
    // a espingarda partida em duas, em V (as pontas da quebra a 20 px, com lascas), entre cascos fendidos
    const t14 = T('rastros_14'), dts = ctx.sfx('queixada_dentes').filter(x => x >= t14 - .1), grs = ctx.sfx('queixada_grunhido').filter(x => x >= t14);
    vara.forEach((b, i) => {
      const a = t14 + .05 + b.atraso, dur = 1.9 - .1 * (i % 3);
      K.caminhar(tl, b, { de: M(2250 + 40 * i), ate: M(-420 - 30 * i), t0: a, t1: a + dur, ...B.andadura(b, 'galope') });
      for (const d of dts) if (d > a && d < a + dur) B.dentes(tl, b, d + .03 * i, .7);
      for (const r of grs) if (r > a && r < a + dur && i % 2) B.pulso(tl, b, r, 'grunhido', { sobe: .1, desce: .4, segura: .2 });
      K.anima(tl, b.pose, { erica: 1 }, a, .3);
    });
    const tV = t14 + 1.75;
    volta.forEach((b, i) => {
      const a = tV + .17 * i + (i > 3 ? .1 : 0);
      K.caminhar(tl, b, { de: M(-380 - 30 * i), ate: M(2300), t0: a, t1: a + 2.2, ...B.andadura(b, 'galope') });
    });
    poeiraDaVara(c, [[t12 + 1.2, t13, .35], [t13, tPr + .2, 1]]);
    E.ir(tl, ze, { tremor: 1 }, sfx('grito_pavor') - .05, .08);
    E.pose(tl, ze, { a: { cabeca: -20, peito: -4 } }, sfx('grito_pavor'), .2, 'power3.out');
    g(tiao, 'olhar', t14 + .3, { para: 'baixo' });
    const lat = ctx.sfx('cachorro_latido').filter(x => x >= t14);
    K.anima(tl, cao.pose, { medo: 0, alerta: 1 }, lat[0] - .5, .25);
    B.latir(tl, cao, lat[0], 2);
    B.latir(tl, cao, lat[1], 2);
    K.caminhar(tl, cao, { ate: M(260), t0: lat[0] + .05, t1: tPr - .1, ...B.andadura(cao, 'galope') });
    K.anima(tl, cao.pose, { z: .9, opacidade: 0 }, lat[1] - .1, tPr - lat[1], 'power1.in');
    for (const k of ['L2', 'L3', 'L4']) K.anima(tl, sac[k], { sacode: 0 }, tPr, .25, 'power2.out');
    K.anima(tl, esp, { opacidade: 0 }, tPr, .15);
    K.luz(tl, p, { hotX: 50, hotY: 66 }, tPr + .05, .5, 'power2.out');      // a poeira assenta: o luar cai no chão do meio
    // Λ partido, de 786 a 1174 (centro 960): a coronha (curta) e o cano (comprido) apoiados no chão pelas pontas, as duas
    // pontas da quebra erguidas 36 px e a 20 px uma da outra (quebra em bx); conta: ponta = pose + R(rot)·(x local·1,4, 0)
    const bx = 870;
    K.anima(tl, P.coronha.pose, { x: M(bx - 10 + 19.8), y: CHAO - 46.5, rot: -28, escala: 1.4 }, 0, 0);
    K.anima(tl, P.cano.pose, { x: M(bx + 10 + 19.4), y: CHAO - 33.3, rot: 8, escala: 1.4 }, 0, 0);
    K.anima(tl, P.coronha.pose, { opacidade: 1 }, tPr, .3);
    K.anima(tl, P.cano.pose, { opacidade: 1 }, tPr, .3);
    marcas(c, [[-170, 10, 1], [-110, -2, -1], [-40, 14, 1], [80, 0, -1], [170, 12, 1], [240, -1, -1]].map(([dx, dy, d], k) => ({ tipo: 'casco',
      x: xE + dx, y: CHAO + dy * .5, dir: d, lado: 1, escala: 5, achatar: .55, giro: (k % 2 ? 6 : -5), t0: tPr + .1 + .05 * k, dura: 60, opacidade: .9, claro: true }))
      .concat([[-8, -16, 30], [6, -10, -20], [-16, 2, 70], [14, 4, 10]].map(([dx, dy, gi], k) => ({ tipo: 'lasca', x: bx + dx, y: CHAO + 4 + dy * .3, dir: 1, lado: 1,
        escala: 1.6, achatar: 1, giro: gi, t0: tPr + .05 * k, dura: 60, opacidade: .95 }))));

    // 15 · escuro no fundo; ninguém aparece: só as folhas de L3 sacodem a cada estalo; os dois se encolhem no alto
    const t15 = T('rastros_15'), tRi = sfx('risada_curupira'), ch0 = ctx.sfx('cipo_chicote')[0];
    K.luz(tl, p, { brilho: .62, hotRX: 40, hotRY: 70, vinheta: .84 }, t15 - .2, 1.4);
    ctx.sfx('cipo_chicote').concat([tRi]).forEach(t => {
      K.anima(tl, sac.L3, { sacode: 9 }, t, .06, 'power3.out');
      K.anima(tl, sac.L3, { sacode: 0 }, t + .06, .5, 'power2.out');
    });
    E.pose(tl, tiao, { a: { peito: 26, cabeca: 22 } }, ch0 + .05, .2, 'power3.out');
    g(tiao, 'tremer', ch0 + .1, { dur: tRi - ch0 + .8, amp: .5 });
    E.pose(tl, ze, { a: { peito: 18, cabeca: 24 } }, ch0 + .1, .25, 'power3.out');

    // 16 · o cachorro volta encolhido, couro claro com riscos vazados no lombo, e para à frente das pernas do Zé (880),
    // que desce da sapopema e se ajoelha atrás dele (990) para abraçá-lo
    const t16 = T('rastros_16'), f16 = TF('rastros_16'), xC = 880, xZ2 = 990;
    K.luz(tl, p, Object.assign({}, NOITE_L, { hotX: 46, hotY: 34, hotRY: 90 }), t16, 2);
    K.anima(tl, cao2.pose, { x: M(-160) }, 0, 0);
    K.anima(tl, cao2.pose, { opacidade: 1 }, t16, .4);
    K.anima(tl, cao2.pose, { z: 0 }, t16, 1.4, 'power2.out');
    K.caminhar(tl, cao2, { ate: M(xC), t0: t16 + .05, t1: t16 + 2.2, ...B.andadura(cao2, 'trote') });
    for (const t of [t16, t16 + 1.9, t16 + 3.1]) B.pulso(tl, cao2, t, 'latido', { pico: .35, vezes: 2, intervalo: .22 });
    K.tremer(tl, cao2, t16 + 2.2, f16 - t16 - 2.2, 2);
    E.ir(tl, ze, { tremor: 0 }, t16 + .2, .3);
    u = g(ze, 'virar', t16 + .3);                                      // de frente para o cachorro, à esquerda
    u = g(ze, 'descer', u + .05, { ate: [M(xZ2), CHAO], dur: 1.1, volta: false });
    u = E.pose(tl, ze, 'agachado', u, .45);
    E.pose(tl, ze, { maos: { Frente: { mundo: [M(xC + 30), CHAO - 92] }, Tras: { mundo: [M(xC + 70), CHAO - 100] } }, maoAng: { Frente: 20 } }, Math.max(u, t16 + 2.3), .5);
    g(tiao, 'olhar', t16 + 1.2, { para: 'baixo', dur: .8 });
  });
})();
