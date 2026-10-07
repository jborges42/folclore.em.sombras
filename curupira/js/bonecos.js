/* bonecos.js — Sombras.bonecos: rig 2D de bonecos de couro (guia §6, §7, §10).
 *
 *   const b = Sombras.bonecos.criar(def, {x, y, escala, dir})   ator para palco.adicionar(b)
 *   Sombras.bonecos.curupira(op) / .tiao(op)                    personagens prontos (op como acima)
 *   b.pose   NÚMEROS para o GSAP: x, y (chão), escala, dir (1 olha p/ +x, -1 p/ -x; valores intermediários
 *            achatam = virar), z (0 encostado na tela … 1 junto da luz: cresce, desfoca, desbota), rot, dy,
 *            opacidade, furia e boca (Curupira, 0..1: olhar aceso / boca aberta com os dentes verdes),
 *            a.{parte} (graus), s.{parte} (escala), o.{parte} (opacidade da peça)
 *   b.motores.push((b, t) => …)   movimento procedural somado à pose a cada quadro (escreve em b.extra: a, s, o,
 *                                 dy, boca, furia)
 *   (peça com opaca: true não multiplica sobre as de baixo: mandíbula sobre o rosto, sem emenda escura)
 *   b.atualizar(t)                cinemática direta: escreve transform="matrix(…)" de cada peça + varetas
 *   b.pronto                      Promise: peças de couro pré-renderizadas em bitmap (vazados custam caro ao vivo)
 *   b.mundo(parte, [x, y])        ponto (coord. de repouso do boneco) → coordenadas do palco
 *   Sombras.bonecos.respirar(b, t, {amp, freq})        peito ±1°, cabeça ±0,6° defasada
 *   Sombras.bonecos.andar(b, fase, {pernas, bracos, bob, inclinacao})   ciclo de 2 passos por fase 0..1
 *   Sombras.bonecos.pegadas({cor})  ator de rastros (camada "rastros"): .por(x, y, {dir, invertida, lado, escala,
 *                                   achatar, giro, t0, dura, opacidade}); a do Curupira é invertida (dedos para trás)
 *   Sombras.bonecos.pelo(d, quer, {tam, passo, cai, semente})  recorta em tufos de pelo os trechos do contorno d
 *                                   cuja normal externa (nx, ny) satisfaz quer(nx, ny, x, y)
 *
 * def = {nome, H, partes: [{id, pai, pivo:[x,y] (repouso, chão em y=0, olhando +x), ang0, atras, camada:'brilho',
 *        junta (default true se tem pai), corJunta, formas:[{d, cor, op, vazado:{motivo, escala, faixa, margem},
 *        contorno, gradiente}], linhas:[{d, cor, w, op, dash}], furos:[d], brancos:[{d, w}]}],
 *        varetas:[{parte, ponto:[x,y], mestra}], pose:{…}, auto(b, t)}
 * Formas, furos e linhas de cada peça são escritos em coordenadas LOCAIS (pivô da peça na origem).
 */
(function () {
  'use strict';
  const S = window.Sombras = window.Sombras || {};
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  // couros tingidos: mais claros e saturados que a tinta final, porque o multiply sobre o papel escurece (vitral)
  const COR = {
    couroCru: '#D9AE72', urucum: '#C2401F', urucumClaro: '#E8693A', jenipapo: '#1E2A30', acafrao: '#E0A21C',
    acafraoClaro: '#F2C14E', argila: '#B86A3E', argilaClara: '#D49562', verdeMata: '#4E8240', verdeClaro: '#8DBA62',
    anil: '#4A6AA8', anilDesbotado: '#5A729E', contorno: '#170C05', palha: '#D8B266', palhaSombra: '#8E6A32',
    madeira: '#7A4524', madeiraClara: '#BE8A52', cano: '#1C1714', grisalho: '#E2D4B4',
    cabelo1: '#FFD75E', cabelo2: '#F59A1F', cabelo3: '#D2401A',
  };
  const escurecer = (h, k) => '#' + [1, 3, 5].map(i => Math.round(parseInt(h.substr(i, 2), 16) * k).toString(16).padStart(2, '0')).join('');
  const f2 = v => +v.toFixed(2);

  // ---------- matrizes afins [a b c d e f] ----------
  const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const T = (x, y) => [1, 0, 0, 1, x, y], R = g => { const c = Math.cos(g * RAD), s = Math.sin(g * RAD); return [c, s, -s, c, 0, 0]; };
  const Sc = (x, y) => [x, 0, 0, y == null ? x : y, 0, 0];
  const ap = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const mstr = m => `matrix(${m[0].toFixed(4)} ${m[1].toFixed(4)} ${m[2].toFixed(4)} ${m[3].toFixed(4)} ${m[4].toFixed(2)} ${m[5].toFixed(2)})`;

  // ---------- geometria das peças ----------
  function elipse(cx, cy, rx, ry) {
    const k = .5523, c = (a, b) => f2(a) + ' ' + f2(b);
    return `M${c(cx + rx, cy)}C${c(cx + rx, cy + k * ry)} ${c(cx + k * rx, cy + ry)} ${c(cx, cy + ry)}C${c(cx - k * rx, cy + ry)} ${c(cx - rx, cy + k * ry)} ${c(cx - rx, cy)}` +
      `C${c(cx - rx, cy - k * ry)} ${c(cx - k * rx, cy - ry)} ${c(cx, cy - ry)}C${c(cx + k * rx, cy - ry)} ${c(cx + rx, cy - k * ry)} ${c(cx + rx, cy)}Z`;
  }
  // polilinha de um path ABSOLUTO de um só contorno (M/L/C/Q/Z)
  function pontos(d) {
    const tk = d.match(/[MLCQZ]|-?(?:\d+\.?\d*|\.\d+)/gi), out = [];
    let i = 0, cmd = 'M', p = [0, 0];
    const n = () => +tk[i++];
    while (i < tk.length) {
      if (/^[MLCQZ]$/i.test(tk[i])) { cmd = tk[i++].toUpperCase(); if (cmd === 'Z') continue; }
      if (cmd === 'M' || cmd === 'L') { p = [n(), n()]; out.push(p); } else if (cmd === 'Q') {
        const a = p, b = [n(), n()], c = [n(), n()];
        for (let k = 1; k <= 6; k++) { const u = k / 6, v = 1 - u; out.push([v * v * a[0] + 2 * v * u * b[0] + u * u * c[0], v * v * a[1] + 2 * v * u * b[1] + u * u * c[1]]); }
        p = c;
      } else {
        const a = p, b = [n(), n()], c = [n(), n()], e = [n(), n()];
        for (let k = 1; k <= 8; k++) {
          const u = k / 8, v = 1 - u, A = v * v * v, B = 3 * v * v * u, C = 3 * v * u * u, D = u * u * u;
          out.push([A * a[0] + B * b[0] + C * c[0] + D * e[0], A * a[1] + B * b[1] + C * c[1] + D * e[1]]);
        }
        p = e;
      }
    }
    return out;
  }
  // tufos de pelo (dente de serra irregular, pontas caindo) nos trechos do contorno escolhidos por quer(nx, ny, x, y)
  function pelo(d, quer, op) {
    op = op || {};
    const P = pontos(d), n = P.length, r = S.rng(op.semente || 1);
    const tam = op.tam || [4, 7.5], passo = op.passo || [3.4, 5.8], cai = op.cai == null ? .45 : op.cai;
    const C = [0];
    let area = 0;
    for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; C.push(C[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const sg = area > 0 ? 1 : -1, tot = C[n];
    let j = 0;
    const at = s => { // ponto, normal externa e tangente na abscissa s do perímetro
      while (j > 0 && C[j] > s) j--;
      while (j < n - 1 && C[j + 1] < s) j++;
      const a = P[j], b = P[(j + 1) % n], L = (C[j + 1] - C[j]) || 1, k = (s - C[j]) / L, tx = (b[0] - a[0]) / L, ty = (b[1] - a[1]) / L;
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, ty * sg, -tx * sg, tx, ty];
    };
    const out = [];
    for (let s = 0; s < tot;) {
      const q = at(s);
      out.push(q);
      if (quer(q[2], q[3], q[0], q[1])) {
        const st = passo[0] + r() * (passo[1] - passo[0]), len = tam[0] + r() * (tam[1] - tam[0]) * (r() < .2 ? 1.5 : 1);
        const m = at(Math.min(tot, s + st * (.45 + r() * .4)));
        if (op.curva) { const k = op.curva * (.5 + r() * .7) * (r() < .5 ? 1 : -.6); out.push([m[0] + m[2] * len * .55 + m[4] * len * k, m[1] + m[3] * len * .55 + len * cai * .3 + m[5] * len * k]); }
        out.push([m[0] + m[2] * len - m[4] * len * .25, m[1] + m[3] * len + len * cai]);
        s += st;
      } else s += 1.5;
    }
    return 'M' + out.map(p => f2(p[0]) + ' ' + f2(p[1])).join('L') + 'Z';
  }
  // cordão de dois fios torcidos (cinto de fibra): retorna os dois fios como paths
  function corda(x0, x1, y, passo) {
    let a = '', b = '';
    for (let x = x0; x < x1; x += passo) {
      const p = passo * 1.15;
      a += `M${f2(x)} ${f2(y + 1.5)}Q${f2(x + p * .15)} ${f2(y - 1.9)} ${f2(x + p)} ${f2(y - 1.5)}Q${f2(x + p * .85)} ${f2(y + 1.9)} ${f2(x)} ${f2(y + 1.5)}Z`;
      const xb = x + passo * .5, yb = y + 2.7;
      b += `M${f2(xb)} ${f2(yb - 1.4)}Q${f2(xb + p * .15)} ${f2(yb + 1.8)} ${f2(xb + p)} ${f2(yb + 1.4)}Q${f2(xb + p * .85)} ${f2(yb - 1.8)} ${f2(xb)} ${f2(yb - 1.4)}Z`;
    }
    return [a, b];
  }

  const CSS = '.sb-boneco{position:absolute;left:0;top:0;overflow:visible}';
  let uid = 0;

  function criar(def, op) {
    op = op || {};
    if (!document.getElementById('sombras-bonecos-css')) {
      const st = document.createElement('style'); st.id = 'sombras-bonecos-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    const id = 'sb' + (++uid) + def.nome;
    const partes = {}, ordemDesenho = def.partes;
    def.partes.forEach(p => { partes[p.id] = p; });
    const filhos = {};
    def.partes.forEach(p => { if (p.pai) (filhos[p.pai] = filhos[p.pai] || []).push(p); });
    const ehJunta = p => p.pai && p.junta !== false;
    const G = S.grafismos, pats = {};
    let defs = '', defsBrilho = '';
    const padrao = (motivo, escala, cor) => { const v = G.variante(motivo, { escala, cor }); if (!pats[v.id]) { pats[v.id] = 1; defs += v.svg; } return v.id; };
    // contorno na cor escura do próprio couro (não preto); juntas pequenas, da cor da peça, rebite de 2 px
    const raio = def.H >= 250 ? 7 : 6, traco = def.H >= 250 ? 1.5 : 1.2;

    function marcacao(p) {
      const k = p.atras ? .85 : 1, cor = c => (k === 1 ? c : escurecer(c, k));
      const formas = p.formas.slice(), base = p.corJunta || formas[0].cor;
      const discos = [];
      if (ehJunta(p)) discos.push([0, 0]);
      (filhos[p.id] || []).filter(ehJunta).forEach(f => discos.push([f.pivo[0] - p.pivo[0], f.pivo[1] - p.pivo[1]]));
      let s = '';
      for (const [x, y] of discos) s += `<circle cx="${x}" cy="${y}" r="${raio}" fill="${cor(base)}"/>`;
      for (const f of formas) {
        const fill = f.gradiente ? `url(#${id}-${f.gradiente})` : cor(f.cor);
        const st = f.contorno === 0 ? '' : ` stroke="${cor(escurecer(f.cor || base, .42))}" stroke-width="${f.contorno || traco}" stroke-linejoin="round"`;
        s += `<path d="${f.d}" fill="${fill}"${f.op ? ` fill-opacity="${f.op}"` : ''}${st}/>`;
      }
      if (p.camada !== 'brilho') s += `<path d="${formas.map(f => f.d).join('')}" fill="url(#g-manchas)" opacity=".6"/>`;
      const tinta = base ? cor(escurecer(base, .38)) : COR.contorno;
      for (const l of p.linhas || []) s += `<path d="${l.d}" fill="none" stroke="${l.cor || tinta}" stroke-width="${l.w || 1.2}" stroke-linecap="round" opacity="${l.op || .85}"${l.dash ? ` stroke-dasharray="${l.dash}"` : ''}/>`;
      // máscara de vazados: branco = couro, preto = furo
      const vaz = formas.filter(f => f.vazado);
      let mascara = '';
      if (vaz.length || (p.furos || []).length) {
        mascara = `<mask id="${id}-m-${p.id}" maskUnits="userSpaceOnUse" x="-420" y="-420" width="840" height="840"><rect x="-420" y="-420" width="840" height="840" fill="#fff"/>`;
        for (const f of vaz) mascara += `<path d="${f.vazado.faixa || f.d}" fill="url(#${padrao(f.vazado.motivo, f.vazado.escala)})"/>`;
        for (const f of vaz) mascara += `<path d="${f.d}" fill="none" stroke="#fff" stroke-width="${(f.vazado.margem || 4) * 2}" stroke-linejoin="round"/>`;
        for (const d of p.furos || []) mascara += `<path d="${d}" fill="#000"/>`;
        for (const b of p.brancos || []) mascara += b.w ? `<path d="${b.d}" fill="none" stroke="#fff" stroke-width="${b.w}" stroke-linecap="round" stroke-linejoin="round"/>` : `<path d="${b.d}" fill="#fff"/>`;
        mascara += '</mask>';
      }
      if (p.camada === 'brilho') defsBrilho += mascara; else defs += mascara;
      p._miolo = (mascara ? `<g mask="url(#${id}-m-${p.id})">${s}</g>` : s) + (ehJunta(p) ? `<use href="#rebite" transform="scale(.62)"/>` : '');
      // caixa local (pontos de controle ⊇ curva) para pré-renderizar a peça
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      const inclui = (x, y, r) => { x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r); };
      for (const f of formas) { const n = f.d.match(/-?(?:\d+\.?\d*|\.\d+)/g).map(Number); for (let i = 0; i + 1 < n.length; i += 2) inclui(n[i], n[i + 1], 0); }
      for (const [x, y] of discos) inclui(x, y, raio);
      p._caixa = [Math.floor(x0 - 5), Math.floor(y0 - 5), Math.ceil(x1 - x0 + 10), Math.ceil(y1 - y0 + 10)];
      // sem multiply por peça: o boneco é um bloco (as peças se cobrem como couro sobre couro, sem ver uma através da outra);
      // quem multiplica sobre o papel é a camada dos bonecos inteira (palco.js), então a luz ainda tinge o couro
      return `<g data-p="${p.id}">${p._miolo}</g>`;
    }

    let corpo = '', brilho = '';
    for (const p of ordemDesenho) { const m = marcacao(p); if (p.camada === 'brilho') brilho += m; else corpo += m; }
    for (const g in def.gradientes || {}) {
      const gr = def.gradientes[g];
      defsBrilho += `<linearGradient id="${id}-${g}" gradientUnits="userSpaceOnUse" x1="${gr.de[0]}" y1="${gr.de[1]}" x2="${gr.ate[0]}" y2="${gr.ate[1]}">` +
        gr.paradas.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('') + '</linearGradient>';
    }
    const tmp = document.createElement('div');
    const svgA = `<svg xmlns="http://www.w3.org/2000/svg" class="sb-boneco" width="1920" height="1080" viewBox="0 0 1920 1080">`;
    tmp.innerHTML = `${svgA}<defs>${defs}</defs>${corpo}<g class="sb-varetas" stroke="${COR.contorno}">` +
      `<path class="vl" fill="none" stroke-width="5" opacity=".14" stroke-linecap="round"/><path class="vn" fill="none" opacity=".5" stroke-linecap="round"/>` +
      `<path class="va" fill="none" stroke-width="1.2" opacity=".6"/></g></svg>` +
      (brilho ? `${svgA}<defs>${defsBrilho}</defs><g filter="url(#f-fogo)">${brilho}</g></svg>` : '');
    const svgCorpo = tmp.children[0], svgBrilho = tmp.children[1] || null;
    const els = {};
    for (const e of tmp.querySelectorAll('[data-p]')) els[e.dataset.p] = e;
    const vl = svgCorpo.querySelector('.vl'), vn = svgCorpo.querySelector('.vn'), va = svgCorpo.querySelector('.va');

    // ordem topológica para a cinemática direta
    const ordem = [], vis = {};
    const visita = p => { if (vis[p.id]) return; vis[p.id] = 1; if (p.pai) visita(partes[p.pai]); ordem.push(p); };
    def.partes.forEach(visita);

    const pose = Object.assign({ x: 960, y: 800, escala: 1, dir: 1, z: 0, rot: 0, dy: 0, opacidade: 1, furia: 0, boca: 0 }, def.pose, op);
    for (const k of ['a', 's', 'o']) pose[k] = Object.assign({}, def.pose && def.pose[k], op[k]);
    const M = {}, ultimo = {};
    const b = {
      nome: def.nome, def, pose, extra: { a: {}, s: {}, o: {}, dy: 0 }, motores: [], M,
      camadas: svgBrilho ? { bonecos: svgCorpo, brilho: svgBrilho } : { bonecos: svgCorpo },
      mundo(parte, pt) { const p = partes[parte]; return ap(M[parte], pt[0] - p.pivo[0], pt[1] - p.pivo[1]); },
      atualizar(t) {
        const E = b.extra;
        E.a = {}; E.s = {}; E.o = {}; E.dy = 0; E.boca = 0; E.furia = 0;
        for (const f of b.motores) f(b, t);
        if (def.auto) def.auto(b, t);
        const P = b.pose, zs = 1 + .45 * Math.max(0, P.z), cy = P.y - def.H * .5 * P.escala;
        let raiz = mul(mul(T(P.x, cy), Sc(zs)), T(-P.x, -cy));
        raiz = mul(raiz, mul(T(P.x, P.y + P.dy + E.dy), mul(Sc(P.dir * P.escala, P.escala), R(P.rot))));
        for (const p of ordem) {
          const pai = p.pai ? M[p.pai] : raiz, pp = p.pai ? partes[p.pai].pivo : [0, 0];
          const ang = (p.ang0 || 0) + (P.a[p.id] || 0) + (E.a[p.id] || 0);
          const sc = (P.s[p.id] == null ? 1 : P.s[p.id]) * (E.s[p.id] == null ? 1 : E.s[p.id]);
          let m = mul(pai, T(p.pivo[0] - pp[0], p.pivo[1] - pp[1]));
          if (ang) m = mul(m, R(ang));
          if (sc !== 1) m = mul(m, Sc(sc));
          M[p.id] = m;
          const s = mstr(m);
          if (ultimo[p.id] !== s) { ultimo[p.id] = s; els[p.id].setAttribute('transform', s); }
          const o = E.o[p.id] != null ? E.o[p.id] : P.o[p.id];
          if (o != null) { const v = Math.max(0, Math.min(1, o)).toFixed(3); if (ultimo['o' + p.id] !== v) { ultimo['o' + p.id] = v; els[p.id].setAttribute('opacity', v); } }
        }
        // varetas: do ponto de fixação até y = 900, inclinadas para trás do sentido do boneco (§6.4)
        let dl = '', dn = '', da = '';
        const dir = P.dir >= 0 ? 1 : -1;
        for (const v of def.varetas || []) {
          const [x, y] = b.mundo(v.parte, v.ponto);
          let th = 12;
          if (!v.mestra) {
            const m = M[v.parte], g = Math.atan2(m[1], m[0]) / RAD * dir;
            th = Math.max(6, Math.min(20, 8 + .2 * Math.abs(((g + 540) % 360) - 180)));
          }
          const xb = x - dir * Math.tan(th * RAD) * (900 - y);
          const seg = `M${x.toFixed(1)} ${y.toFixed(1)}L${xb.toFixed(1)} 900`;
          dl += seg; (v.mestra ? (dn = seg + dn) : (dn += seg));
          da += `M${(x + 3).toFixed(1)} ${y.toFixed(1)}a3 3 0 1 0-6 0a3 3 0 1 0 6 0`;
        }
        if (dl !== ultimo.v) { ultimo.v = dl; vl.setAttribute('d', dl); vn.setAttribute('d', dn); va.setAttribute('d', da); vn.setAttribute('stroke-width', 2.2); }
        // distância da tela (§6.5)
        const z = Math.max(0, P.z);
        const filtro = z > .002 ? `blur(${(14 * z).toFixed(2)}px) saturate(${(1 - .85 * z).toFixed(3)}) brightness(${(1 - .35 * z).toFixed(3)})` : '';
        if (filtro !== ultimo.f) { ultimo.f = filtro; svgCorpo.style.filter = filtro; if (svgBrilho) svgBrilho.style.filter = filtro; }
        const op = P.opacidade < 1 ? P.opacidade.toFixed(3) : '';
        if (op !== ultimo.o) { ultimo.o = op; svgCorpo.style.opacity = op; if (svgBrilho) svgBrilho.style.opacity = op; }
      },
    };
    // Pré-renderiza cada peça de couro (silhueta + vazados + manchas) num bitmap, uma vez: máscaras SVG
    // recalculadas a cada quadro derrubam o FPS (7 → 60). Até ficar pronto, a peça viva é desenhada.
    // As peças de brilho (cabelo, olhar) são assadas com o próprio halo de fogo: o filtro sai do quadro a quadro.
    const K = Math.min(4, 2 * (pose.escala || 1));
    const base = `<defs>${G.DEFS}<pattern id="g-manchas" width="128" height="128" patternUnits="userSpaceOnUse"><image href="${G.manchasURL()}" width="128" height="128"/></pattern>${defs}${defsBrilho}</defs>`;
    b.pronto = Promise.all(def.partes.map(p => {
      const br = p.camada === 'brilho', m = br ? 16 : 0, [x, y, w, h] = [p._caixa[0] - m, p._caixa[1] - m, p._caixa[2] + 2 * m, p._caixa[3] + 2 * m];
      const cw = Math.ceil(w * K), ch = Math.ceil(h * K), img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}" viewBox="${x} ${y} ${w} ${h}">${base}${br ? `<g filter="url(#f-fogo)">${p._miolo}</g>` : p._miolo}</svg>`);
      return img.decode().then(() => {
        const c = document.createElement('canvas'); c.width = cw; c.height = ch;
        c.getContext('2d').drawImage(img, 0, 0, cw, ch);
        const im = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        for (const [k, v] of [['href', c.toDataURL()], ['x', x], ['y', y], ['width', w], ['height', h], ['preserveAspectRatio', 'none']]) im.setAttribute(k, v);
        els[p.id].replaceChildren(im);
      });
    })).then(() => { if (svgBrilho) svgBrilho.querySelector('g[filter]').removeAttribute('filter'); return b; });
    b.atualizar(0);
    return b;
  }

  // ---------- movimento ----------
  const ad = (b, p, v) => { b.extra.a[p] = (b.extra.a[p] || 0) + v; };
  function respirar(b, t, op) {
    op = op || {};
    const A = op.amp == null ? 1 : op.amp, f = op.freq || .25, s = Math.sin(TAU * f * t);
    ad(b, 'peito', A * s); ad(b, 'quadril', -A * s); // o quadril compensa: as pernas não balançam com o fôlego
    ad(b, 'cabeca', .6 * A * Math.sin(TAU * f * t + .4) - .5 * A * s);
  }
  function andar(b, fase, op) {
    op = op || {};
    const A = op.pernas == null ? 16 : op.pernas, B = op.bracos == null ? 10 : op.bracos, bob = op.bob == null ? 6 : op.bob;
    const s = Math.sin(TAU * fase), c = Math.cos(TAU * fase);
    ad(b, 'pernaFrente', -A * s); ad(b, 'pernaTras', A * s);
    ad(b, 'peFrente', A * s * .85 - 6 * Math.max(0, -s)); ad(b, 'peTras', -A * s * .85 - 6 * Math.max(0, s));
    ad(b, 'bracoFrente', B * s); ad(b, 'bracoTras', -B * s);
    ad(b, 'antebracoFrente', B * .4 * s); ad(b, 'antebracoTras', -B * .4 * s);
    ad(b, 'peito', (op.inclinacao || 0) + 1.2 * Math.abs(c));
    ad(b, 'quadril', -(op.inclinacao || 0) - 1.2 * Math.abs(c));
    b.extra.dy -= bob * (Math.abs(c) - .5);
  }

  // ---------- pegadas ----------
  function pegadas(op) {
    op = op || {};
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'sb-boneco'); svg.setAttribute('width', 1920); svg.setAttribute('height', 1080); svg.setAttribute('viewBox', '0 0 1920 1080');
    const lista = [];
    return {
      camadas: { rastros: svg },
      por(x, y, o) {
        o = o || {};
        const u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        const dir = o.dir || 1, e = o.escala || 1, sx = (o.invertida ? -dir : dir) * e, sy = e * (o.achatar || .6) * (o.lado || 1);
        u.setAttribute('href', '#pegada');
        u.setAttribute('transform', `translate(${x} ${y}) scale(${sx} ${sy}) rotate(${o.giro || 0})`);
        u.setAttribute('fill', op.cor || COR.contorno);
        svg.appendChild(u);
        lista.push({ u, t0: o.t0 == null ? -Infinity : o.t0, dura: o.dura || Infinity, op: o.opacidade || .6, ult: null });
      },
      atualizar(t) {
        for (const p of lista) {
          const k = t < p.t0 ? 0 : Math.max(0, 1 - (t - p.t0) / p.dura), v = (p.op * k).toFixed(3);
          if (v !== p.ult) { p.ult = v; p.u.setAttribute('opacity', v); }
        }
      },
    };
  }

  // ---------- personagens ----------
  // língua de fogo ao longo de +x: ondula (onda) e curva a ponta para +y local (curva > 0) ou −y (curva < 0)
  function mecha(L, w, onda, fase, curva, x0) {
    x0 = x0 || 0;
    const cima = [], baixo = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16, cy = onda * Math.sin(u * Math.PI * 2.2 + fase) * u + curva * L * u * u;
      const m = w * Math.pow(1 - u, .9) * (1 + .25 * Math.sin(u * Math.PI * 3.6 + fase * 1.7)) * Math.min(1, .3 + u * 9); // raiz afinada
      cima.push(`${f2(x0 + L * u)} ${f2(cy - m)}`); baixo.unshift(`${f2(x0 + L * u)} ${f2(cy + m * .8)}`);
    }
    return 'M' + cima.join('L') + 'L' + baixo.slice(1).join('L') + 'Z';
  }
  // pé virado do Curupira (pivô no tornozelo, sola em y = 9.9): calcanhar grande para +x, cinco dedos para −x
  function peVirado() {
    const dedos = [[-38.6, 9.8, 5.6], [-36.8, 4.5, 1.5], [-34.8, .6, -2], [-32.4, -2.9, -5.1], [-29.6, -5.9, -7.5]]; // [ponta x, baixo y, cima y]
    let d = 'M5 -4C11 -3.6 15.8 -1.2 17.6 2.8C19 6 17.2 9.6 13 9.9L6 9.9C2 6.6 -9 6.4 -13 9.9L-30 9.9';
    const unhas = [];
    dedos.forEach(([x, b, c], i) => {
      const m = (b + c) / 2, h = (b - c) / 2;
      d += `C${f2(x + 3.4)} ${b} ${x} ${f2(b - h * .25)} ${x} ${f2(m)}C${x} ${f2(c + h * .25)} ${f2(x + 3.4)} ${c} ${f2(x + 6.4)} ${c}`;
      if (i < 4) d += `L${f2(x + 10)} ${f2((c + dedos[i + 1][1]) / 2)}L${f2(dedos[i + 1][0] + 6.4)} ${dedos[i + 1][1]}`;
      unhas.push(elipse(x + 1.9, c + h * .55, .8, Math.max(.6, h * .32)));
    });
    d += 'C-22 -7.8 -16 -6.6 -10 -5.6C-6 -5 -1 -4.4 5 -4Z';
    return { d, unhas, arco: ['M4 4.4C-1 2 -8 2 -14 4.6L-13.4 5.9C-8 3.6 -1.2 3.6 3.4 5.8Z'] };
  }

  // Curupira — H 190 (+cabelo); menino forte: cabeça .25H, ombros largos, braços até o joelho, pernas curtas
  // e arqueadas, corpo coberto de pelos, orelha grande, dentes verdes, machado de casco de jabuti, PÉS VIRADOS
  function defCurupira() {
    const pele = '#DA8C52', orelha = '#E89A60', casco = '#9C6A30';
    const costas = (nx, ny, x, y) => nx < -.42;
    // tronco: pivô na cintura; ombros largos, costas peludas
    const peito = pelo('M11 3C13 -6 15 -16 16 -28C17 -40 16 -50 12 -57C10 -61 9 -65 8 -71L-3 -71C-4 -66 -9 -62 -15 -58C-19 -50 -19 -38 -16 -26C-14 -16 -12 -6 -11 3Z',
      (nx, ny, x, y) => (nx < -.4 && y > -66 && y < 0) || (ny < -.6 && x < -6), { semente: 3, tam: [6, 15], passo: [5, 9.5], cai: .7, curva: .5 });
    const quadril = pelo('M-12 -5C-4 -7 6 -7 12 -5L14 7C11 13 -6 14 -13 9Z', (nx, ny) => ny > .5 || nx < -.6, { semente: 5, tam: [3, 5.5], cai: .3 });
    const [fioA, fioB] = corda(-13, 13, -3.4, 3.1);
    // perna inteira (coxa + canela), joelho saliente para a frente; tornozelo = 65% do joelho
    const perna = pelo('M-8 -3C-2 -7 6 -6 9 -2C11 8 12.4 18 11.6 28C11 34 9.4 40 7.6 46C6 51 4.6 56 4.2 62L-3.8 62.5C-4.4 56 -4.2 51 -3.6 46C-3 40 -4 34 -5 28C-7 18 -9 8 -8 -3Z',
      (nx, ny, x, y) => nx < -.5 && y > 2 && y < 27, { semente: 7, tam: [5, 11], passo: [4.5, 8], cai: .8, curva: .45 });
    const franja = pelo('M-6.6 47L8.2 46.4L7.8 55L-6.4 55.6Z', (nx, ny) => ny > .5, { semente: 9, tam: [3.5, 6], passo: [2.6, 4], cai: .2 });
    const pe = peVirado(), los = pts => pts.map(([x, y, k]) => `M${x} ${y - 1.8 * (k || 1)}L${x + 1.1 * (k || 1)} ${y}L${x} ${y + 1.8 * (k || 1)}L${x - 1.1 * (k || 1)} ${y}Z`);
    const losCoxa = los([[2, 5], [-.5, 10], [2.6, 14.5], [0, 19.5], [2.4, 24], [-1, 29, .8]]), losAnte = los([[.8, 5], [-.6, 10.5], [1.2, 16], [-.2, 21.5, .8]]);
    const braco = pelo('M-7.5 -4C-3 -10 6 -9.5 8.5 -3C10 8 8.8 20 7 32C5.4 37 -2.8 37 -4.4 32C-7.6 20 -9.4 8 -7.5 -4Z',
      (nx, ny, x, y) => (nx < -.5 && y < 24) || (ny < -.7), { semente: 11, tam: [5, 12], passo: [4.5, 8.5], cai: .8, curva: .45 });
    const antebraco = pelo('M-5.5 -2C-3 -6 4 -6 6 -2C7.4 6 7 14 5.6 22C4.8 27 4.2 31 4 35L-2.6 35.4C-3 31 -3.6 27 -4.2 22C-5.8 14 -6.8 6 -5.5 -2Z',
      (nx, ny, x, y) => nx < -.5 && y > 3 && y < 30, { semente: 13, tam: [5, 13], passo: [4.5, 8], cai: .85, curva: .5 });
    const maoAberta = 'M-4.5 -1.5C-7 2 -7.6 7 -6.6 11L-7.2 18.4C-7.3 20 -5.2 20.3 -4.9 18.7L-3.9 12.8L-3.6 20.6C-3.5 22.3 -1.2 22.3 -1.1 20.6L-.6 13.2L.6 20.8C.9 22.4 3.1 22.2 2.9 20.5L2.5 12.8L4.1 18.4C4.6 19.9 6.6 19.4 6.2 17.8L5.3 11.6C6.6 10.3 7.6 8.4 8.2 6.6L11 9.4C12.2 10.5 13.6 9.2 12.7 8L9.2 2.6C8 .6 6.6 -1.2 4.8 -2C1.6 -3.2 -2.4 -3.2 -4.5 -1.5Z';
    const punho = 'M-4.6 -1.6C-7.6 2 -8 8 -6 12.6C-4 16.4 2 17 6.4 14.8C9.6 13 10.4 7.6 9 3.4C7.6 -.4 4.4 -2.8 -.2 -3C-2 -3 -3.6 -2.6 -4.6 -1.6Z';
    const dedosPunho = { d: 'M9 5.4C6.4 6.4 3.6 6.2 1.2 5.2M9.4 9.4C6.6 10.4 3.6 10.2 1.2 9.2M8.2 13.2C6 14 3.6 13.8 1.6 13M-5.4 6.4C-2.4 5 .8 5.4 2.8 7', w: 1.1 };
    // cabeça (pivô no pescoço) com a orelha grande saindo do perfil; a mandíbula é peça própria
    const cabeca = 'M-7 6C-11 0 -13 -6 -14 -12C-18 -19 -19.5 -30 -17 -39C-14 -49 -5 -54 5 -54C14 -54 19.5 -49 21 -42C21.8 -38 21.6 -35 21.2 -32.6C22.8 -30.6 24.6 -28.4 25.4 -26C25.9 -24.4 25.1 -23 23.6 -22.6C23.4 -21.6 23.8 -20.4 24.6 -19.6C25.2 -18.6 24.8 -17.4 23.6 -16.8C24.2 -12.6 23.4 -8 21 -5C18.6 -1.6 14.6 .2 10 1L7 7Z';
    const orelhaD = 'M-3 -20C-6 -16.6 -10.6 -16.4 -13.6 -19.4C-17 -22.6 -20.6 -26 -24.6 -29.8C-20 -30.8 -15 -31.6 -10.6 -31C-6 -30.2 -2.4 -27 -1.6 -23.6C-1.4 -22.2 -2 -21 -3 -20Z';
    const boca = 'M14.4 -15.4C18 -15 22 -15.4 24.4 -15.2L24.2 -9.6C20 -9.2 16 -10 13.6 -12.4Z';
    const dentes = 'M15.2 -15.4L15.7 -10.2L17.9 -10.5L18.1 -15.4ZM18.7 -15.4L19.1 -9.8L21.4 -10.3L21.4 -15.4ZM22 -15.4L22.3 -10.9L24.2 -11.6L24.2 -15.3Z'; // verdes, 5,5 de altura
    const mandibula = 'M11 -3.6C15 -3.2 19 -3.6 21.6 -3.4C22.8 -2.6 22.6 -.8 21.6 .2C21.8 3 21.4 5.4 19.6 7.8C17.4 11 12.6 12.6 7 13C3 13.2 -.4 11 -2 7.4C-2.8 5 -2.4 2 -1 0C3 -2.4 7 -3.6 11 -3.6Z';
    // machado de casco de jabuti: cabo curto e torto + lâmina oval de placa de casco (g-jabuti vazado)
    const cabo = 'M-2.6 17C-3.2 9 -1 1 -1.6 -8C-2.4 -18 -4.4 -26 -3.6 -36C-3.2 -41 -2.6 -45 -1.6 -47L3.2 -46.4C2.4 -42 1.8 -38 1.6 -34C1 -26 3.4 -18 3.6 -8C3.8 1 2.6 9 2.8 17C2.6 19.4 -2.4 19.4 -2.6 17Z';
    // lâmina em leque (estreita no cabo, gume largo e convexo para a frente), de placa de casco
    const lamina = 'M1.6 -45C6 -46 10 -49 14 -54C17 -58.4 22 -60.4 26.4 -57.4C30.4 -53.4 32.6 -45.4 32.6 -37C32.6 -28.6 30.4 -20.6 26.4 -16.6C22 -13.6 17 -15.6 14 -20C10 -25 6 -28 1.6 -29Z';
    const cx = 18.6, cy = -37, poli = pts => 'M' + pts.map(p => f2(p[0]) + ' ' + f2(p[1])).join('L') + 'Z';
    const escudos = [], R = 5.4, dentro = (x, y) => x > 5.5 && Math.abs(y - cy) < (x - 2) * .82 && ((x - 17.5) / 14.4) ** 2 + ((y - cy) / 20.6) ** 2 < 1;
    for (let j = -4; j <= 4; j++) for (let i = -3; i <= 4; i++) {
      const px = cx + i * R * 1.5, py = cy + j * R * 1.732 + (i % 2 ? R * .866 : 0);
      for (let k = 0; k < 6; k++) {
        const a = [px + R * Math.cos(k * TAU / 6), py + R * Math.sin(k * TAU / 6)], b = [px + R * Math.cos((k + 1) * TAU / 6), py + R * Math.sin((k + 1) * TAU / 6)];
        const p = u => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], nx = -(b[1] - a[1]) / R * .55, ny = (b[0] - a[0]) / R * .55;
        const q0 = p(.2), q1 = p(.8);
        if (!dentro(...q0) || !dentro(...q1)) continue;
        escudos.push(poli([[q0[0] + nx, q0[1] + ny], [q1[0] + nx, q1[1] + ny], [q1[0] - nx, q1[1] - ny], [q0[0] - nx, q0[1] - ny]]));
      }
    }
    const partes = [
      { id: 'bracoTras', pai: 'peito', pivo: [7, -131], atras: 1, formas: [{ d: braco, cor: pele }] },
      { id: 'antebracoTras', pai: 'bracoTras', pivo: [7, -95], atras: 1, formas: [{ d: antebraco, cor: pele }], furos: losAnte },
      { id: 'maoTras', pai: 'antebracoTras', pivo: [7, -61], atras: 1, formas: [{ d: maoAberta, cor: pele }] },
      { id: 'pernaTras', pai: 'quadril', pivo: [4, -70], atras: 1, formas: [{ d: perna, cor: pele }, { d: franja, cor: pele, contorno: 0 }], furos: losCoxa },
      { id: 'peTras', pai: 'pernaTras', pivo: [4, -9], atras: 1, formas: [{ d: pe.d, cor: pele }], furos: pe.unhas.concat(pe.arco), linhas: [{ d: 'M8 -1C10.6 2 11 5.6 9.6 8.4', op: .5 }] },
      { id: 'peito', pivo: [0, -76], formas: [{ d: peito, cor: pele, vazado: { motivo: 'g-espinha', escala: .42, faixa: 'M-4 -62L-16 -54L-15 -12L-4 -10Z', margem: 3 } /* só nas costas: pelo, não pintura */ }],
        linhas: [{ d: 'M8 -50C10 -46 11.4 -44 12.6 -43.4', op: .5 }, { d: 'M10 -14C11 -9 11 -5 10 -1', op: .4 }] },
      { id: 'quadril', pai: 'peito', pivo: [0, -76], junta: false, formas: [{ d: quadril, cor: pele }, { d: fioA, cor: COR.palha, contorno: .8 }, { d: fioB, cor: COR.palhaSombra, contorno: .8 }] },
      // olhar aceso: elipse açafrão atrás do furo do olho (opacidade .4 em repouso → 1 na fúria)
      { id: 'olhoAceso', pai: 'cabeca', pivo: [18.7, -171.6], junta: false, formas: [{ d: elipse(0, 0, 4.6, 3), cor: COR.acafrao, contorno: 0 }] },
      { id: 'cabeca', pai: 'peito', pivo: [4, -141], formas: [{ d: cabeca, cor: pele },
        { d: 'M17 -44C19 -49 15 -55.5 5 -56C-6 -56.5 -15 -51 -18.5 -41C-20.5 -35 -21 -27 -19.5 -19C-18.5 -15 -16 -12 -14 -11L-13 -16C-11.5 -22 -10 -28 -6 -33L-3 -31.4L-1.6 -37.6C2 -40.4 6 -42 10 -42.6L11.4 -40L13.2 -43L15.6 -42Z', cor: '#9A3414' },
        { d: orelhaD, cor: orelha }],
        furos: ['M10.2 -31C11.9 -34.8 17.1 -35.2 19.1 -31.4C17.2 -28.1 12.3 -27.9 10.2 -31Z', 'M-14.2 -27C-11.6 -27.4 -7.6 -26.6 -5.2 -24.2C-7.8 -25.4 -11.2 -25.8 -14.2 -27Z'],
        brancos: [{ d: elipse(15.8, -31.4, 1.7, 1.8) }],
        linhas: [{ d: 'M8.6 -36.6C11.8 -40 16.8 -40.6 20.2 -37.8', w: 1.9, op: .95 }, { d: 'M14.6 -15.4C13 -16.4 12.2 -17.8 12.4 -19.4', w: 1.4 }, { d: 'M21.4 -22.6C22.2 -23.6 23.4 -23.8 24.3 -23.2', w: 1.1 }] },
      // boca e dentes verdes: peça escondida (opacidade 0) que só aparece quando a mandíbula abre (couro é translúcido)
      { id: 'dentes', pai: 'cabeca', pivo: [4, -141], junta: false, formas: [{ d: boca, cor: '#4A1C0C', contorno: 0 }, { d: dentes, cor: '#8FB04A', contorno: .5 }] },
      { id: 'mandibula', pai: 'cabeca', pivo: [7, -153], junta: false, opaca: true, formas: [{ d: mandibula, cor: pele }], linhas: [{ d: 'M12 -3.4C14 -2.4 15.8 -2.6 17 -3.4', op: .5 }] },
      { id: 'pernaFrente', pai: 'quadril', pivo: [-2, -70], formas: [{ d: perna, cor: pele }, { d: franja, cor: pele, contorno: 0 }], furos: losCoxa },
      { id: 'peFrente', pai: 'pernaFrente', pivo: [-2, -9], formas: [{ d: pe.d, cor: pele }], furos: pe.unhas.concat(pe.arco), linhas: [{ d: 'M8 -1C10.6 2 11 5.6 9.6 8.4', op: .5 }] },
      { id: 'machado', pai: 'maoFrente', pivo: [3.5, -52], junta: false, formas: [
        { d: cabo, cor: COR.madeira }, { d: lamina, cor: casco }], furos: escudos,
        linhas: [{ d: 'M-3.6 -44L3.6 -41.6M-3.8 -40L3.4 -37.6M-3.8 -36L3.2 -33.8', cor: COR.palha, w: 1.5, op: 1 }, { d: 'M-1 -14C0 -10 0 -4 -.6 0', op: .5 }] },
      { id: 'bracoFrente', pai: 'peito', pivo: [2, -130], formas: [{ d: braco, cor: pele }] },
      { id: 'antebracoFrente', pai: 'bracoFrente', pivo: [2, -94], formas: [{ d: antebraco, cor: pele }], furos: losAnte },
      { id: 'maoFrente', pai: 'antebracoFrente', pivo: [2, -60], formas: [{ d: punho, cor: pele }], linhas: [dedosPunho] },
    ];
    // cabelos de fogo: mechas presas no alto e na nuca, para trás e para cima (nunca em coroa), mais longas atrás
    const raizes = [[12, -51, -128, 28, 3.4], [7, -54, -134, 42, 4.2], [1, -55, -140, 56, 5], [-5, -54, -146, 68, 5.4],
      [-11, -51, -152, 74, 5.4], [-16, -45, -160, 70, 5], [-18, -36, -170, 60, 4.6], [-17, -26, -178, 48, 4.2], [-14, -16, 170, 36, 3.8]];
    const gradientes = {};
    raizes.forEach(([x, y, a, L, w], i) => {
      const curva = .28 + .16 * i / (raizes.length - 1) + (S.hash(i + 7) - .5) * .1; // sobem para trás e a ponta cai
      gradientes['gm' + i] = { de: [0, 0], ate: [L, 0], paradas: [[0, '#A82A0E'], [.3, COR.cabelo3], [.7, COR.cabelo2], [1, COR.cabelo1]] };
      partes.push({ id: 'mecha' + i, pai: 'cabeca', pivo: [4 + x, -141 + y], ang0: a, junta: false, camada: 'brilho',
        formas: [{ d: mecha(L, w, 3 + i % 3 * 1.5, i * 1.7, curva), gradiente: 'gm' + i, contorno: 0 },
          { d: mecha(L * .34, w * .34, 1, i * 1.7, curva * .3, L * .14), cor: '#FFC85A', op: .4, contorno: 0 }] });
    });
    const fase = raizes.map((_, i) => [.8 + S.hash(i + 40) * .6, S.hash(i + 90) * TAU]);
    return {
      nome: 'curupira', H: 190, partes, gradientes,
      varetas: [{ parte: 'peito', ponto: [2, -134], mestra: true }, { parte: 'maoFrente', ponto: [2, -58] }, { parte: 'maoTras', ponto: [7, -59] }],
      pose: { a: { peito: 6, quadril: -6, cabeca: -5, bracoFrente: -38, antebracoFrente: -62, maoFrente: 112, bracoTras: 24, antebracoTras: -10, maoTras: 8 } },
      auto(b, t) { // cabelo vivo (função de t), olhar e boca
        const fu = (b.pose.furia || 0) + b.extra.furia, amp = 6 + 8 * fu, fm = 1 + .8 * fu, comp = 1 + .25 * fu;
        fase.forEach(([f, ph], i) => {
          ad(b, 'mecha' + i, amp * Math.sin(TAU * f * fm * t + ph));
          b.extra.s['mecha' + i] = comp * (1 + .08 * Math.sin(TAU * f * 1.3 * fm * t + ph * 2));
        });
        b.extra.o.olhoAceso = .4 + .6 * fu;
        const boca = (b.pose.boca || 0) + b.extra.boca;
        ad(b, 'mandibula', 22 * boca);
        b.extra.o.dentes = Math.min(1, boca * 5);
      },
    };
  }

  // Tião — caboclo velho, H 320 (+chapéu), rosto vazado, barba grisalha, espingarda no ombro e bornal
  function defTiao() {
    const pele = '#C0703E', camisa = '#D09A56', calca = COR.anilDesbotado, couro = '#7E4A26';
    const calcaD = pelo('M-15 -6C-6 -12 9 -11 14 -4C17 20 17 50 13.4 84C12.4 100 11.4 114 10.8 126L-9.2 127C-10 114 -12 100 -12.4 86C-16.4 54 -18.4 22 -15 -6Z',
      (nx, ny) => ny > .6, { semente: 21, tam: [2.6, 5], passo: [2.4, 4], cai: .15 });
    const canela = 'M-8 118L10 117C9.6 130 9 141 8.6 152L-5.4 153C-6.8 141 -7.8 130 -8 118Z';
    const pe = 'M-7 149C-2 147 6 148 10 150C17 152 27 154.6 33 157.6C36 159.6 36 163 33 163.4L-8.6 163.4C-10 160 -9.6 153 -7 149Z';
    const sola = 'M-10.4 162.6L35.4 162.6C37 164.4 36.4 167 33 167L-10.6 167C-11.6 165.6 -11.4 163.8 -10.4 162.6Z';
    const tiras = 'M7.6 150.6L11.6 150L17.6 162.8L13 162.8ZM-7.6 153.6C-3 152 3 151.6 8 152.4L8.4 155.6C3 155 -3 155.4 -8 157Z';
    const linhasPerna = [{ d: 'M-2 30C0 50 1 70 0 92', op: .35 }, { d: 'M25 157L26.6 160.6M29.6 158.6L30.8 161.4', op: .6 }];
    const braco = 'M-10 -4C-5 -11 7 -11 10 -4C11.6 10 10.6 26 9 40L-6.4 40C-8.6 26 -11.4 10 -10 -4Z';
    const dobra = 'M-8 37.6C-2 36 4.6 36 10.2 37.6L10.8 49C4.6 50.6 -2.6 50.6 -8.8 49Z';
    const remendo = 'M-6.6 3L7.4 2L8 17L-5.8 18Z';
    const antebraco = 'M-6.5 -2C-4 -6 5 -6 7 -2C8.6 6 8 14 6.4 24C5.6 32 5.2 40 4.8 46L-3.8 46.6C-4.4 40 -5 32 -5.6 24C-6.8 14 -8 6 -6.5 -2Z';
    const maoAberta = 'M-5.6 -2C-8.4 2.6 -9 9 -7.8 13.6L-8.4 21.6C-8.4 23.4 -6 23.8 -5.6 22L-4.4 15.4L-4.2 24C-4 26 -1.4 26 -1.2 24L-.6 16.2L.8 23.8C1.2 25.6 3.6 25.4 3.4 23.4L2.8 15.2L4.6 21C5.2 22.8 7.4 22.2 7 20.4L5.8 13.6C7.4 12 8.6 9.6 9.2 7.6L12.4 10.6C13.8 11.8 15.4 10.4 14.4 9L10.4 3C9 .8 7.4 -1.4 5.4 -2.4C1.8 -3.8 -3 -3.8 -5.6 -2Z';
    const punho = 'M-6 -2C-9.6 2.4 -10 9.6 -7.6 15C-5.2 19.6 2.6 20.4 7.8 17.6C11.6 15.6 12.6 9 10.8 4C9 -.6 5.2 -3.4 -.2 -3.6C-2.4 -3.6 -4.6 -3.2 -6 -2Z';
    const peito = 'M-20 8C-24 -16 -30 -44 -27 -66C-24 -82 -12 -94 2 -95C10 -95 16 -92 19 -86C22 -74 23 -58 22 -44C22 -28 22 -12 21 8C10 12 -10 12 -20 8Z';
    const cabeca = 'M-9 6C-12 -2 -16 -14 -16 -26C-16 -40 -7 -50 5 -50C14 -50 19 -45 20 -39C21 -35 21.2 -33 22.6 -31C24.2 -28.8 26.4 -25.6 28.4 -22.2C29.4 -20.6 28.4 -19 26.4 -19.4L24.6 -19.8C24.8 -17.6 24.2 -16 22.8 -15.2C23.2 -11.6 22.8 -7.6 21.2 -4.6C19 -.4 14 2.6 9 3.6L8 10L-8 10Z';
    const rosto = 'M4.6 -45.4C10.6 -46.4 15.6 -43.8 16.8 -39C17.6 -35.8 18.2 -33 19.6 -30.6C21 -28.2 22.6 -25.6 24.2 -23L20.6 -22.8C20.6 -20.4 19.8 -18.4 18.6 -17L6.4 -15.4C2.8 -19 1 -26 1.2 -32.6C1.4 -38.6 2.4 -43.4 4.6 -45.4Z';
    const sobrancelha = 'M6.4 -38.8C10 -41.6 14.8 -41.8 18.4 -39.2L17.8 -36.2C14.4 -38.2 10.6 -38 7 -35.8Z';
    const bigode = 'M18 -21.6C21.6 -22.6 24.6 -21.4 25.2 -19C25.8 -16.2 25.4 -12.6 24.2 -10.2C23 -12.8 21.6 -15 19 -15.8C16.6 -16.4 14 -16 12 -15.2C13.4 -18.6 15.4 -20.8 18 -21.6Z';
    const barba = 'M1 -19C7 -15 15 -14.5 23 -12.5C25 -8 24.5 -4 22.5 0L22 7L18.6 2.6L16.6 10L13.6 3.4L10.6 9L8.4 2.4L5.4 7L3.4 .4C.6 -6 -.4 -13 1 -19Z';
    const tempora = 'M-13 -33L-3 -35.4L-2.4 -27L-5.4 -29.6L-7.6 -25.4L-9.6 -29.4L-12.8 -26.4Z';
    // chapéu de palha: aba curta e levantada nas pontas, copa alta com o amassado no topo
    const aba = 'M-36 -4C-30 0 -18 2.6 3 2.6C24 2.6 36 0 42 -5.4C44.4 -3.4 43.4 1 40 4C30 10 16 11 3 11C-12 11 -28 9 -36.4 4C-39.4 2 -39 -2 -36 -4Z';
    const copa = 'M-17 2C-18 -10 -17.4 -24 -13.6 -33C-11 -38 -6 -37.4 -2 -33C.6 -30.4 3.6 -30.4 6.6 -33.4C10.6 -37.6 16 -37.4 18.4 -31.6C21.4 -23 21.2 -10 20 2Z';
    // espingarda: cano preto fino e comprido, coronha clara em curva, guarda-mato vazado (pivô no punho da coronha)
    const mv = d => { let i = 0; return d.replace(/-?(?:\d+\.?\d*|\.\d+)/g, v => f2(+v + (i++ % 2 ? 0 : 50))); }; // a mão segura a coronha perto da soleira
    const coronha = 'M-6 -3.6C-18 -4.2 -34 -3.4 -50 -1.2C-60 .2 -68 1 -73 1.6C-75.6 2 -76.6 5 -75.8 8.6C-75 12.6 -73 15.6 -70.6 15.8C-62 13.6 -50 10.6 -36 7.4C-24 5 -14 3.8 -6 3.6Z';
    const partes = [
      { id: 'bracoTras', pai: 'peito', pivo: [10, -254], atras: 1, formas: [{ d: braco, cor: camisa }, { d: dobra, cor: COR.couroCru }], linhas: [{ d: 'M-6.6 43C-1 41.6 4.6 41.6 10.4 43', op: .6 }] },
      { id: 'antebracoTras', pai: 'bracoTras', pivo: [12, -200], atras: 1, formas: [{ d: antebraco, cor: pele }] },
      { id: 'maoTras', pai: 'antebracoTras', pivo: [14, -153], atras: 1, formas: [{ d: maoAberta, cor: pele }] },
      { id: 'pernaTras', pai: 'quadril', pivo: [6, -166], atras: 1, corJunta: calca, formas: [{ d: canela, cor: pele }, { d: calcaD, cor: calca }, { d: pe, cor: pele }, { d: sola, cor: couro }, { d: tiras, cor: couro }], linhas: linhasPerna },
      { id: 'peito', pivo: [0, -178], formas: [{ d: peito, cor: camisa, vazado: { motivo: 'g-losango', escala: 1.3, faixa: 'M-25 -74L-8 -84L-6 -36L-21 -30Z', margem: 3 } },
        { d: 'M14.4 -86.6L19.4 -85.4L21.6 -12L16.6 -12Z', cor: COR.couroCru },
        { d: 'M3 -95C7 -92 12 -90 17.4 -89L13.4 -79.4L9 -86C6 -88 4 -91 3 -95Z', cor: COR.couroCru },
        { d: 'M-6 -95C-3 -97.8 3 -97.8 5.4 -95L4.6 -89.6C1 -91.4 -3 -91.4 -5.8 -89.6Z', cor: COR.couroCru },
        { d: 'M8 -93L16 -88L-21 -4L-28 -9Z', cor: COR.palhaSombra }],
        furos: [elipse(18, -72, 1.9, 1.9), elipse(18.6, -52, 1.9, 1.9), elipse(19.2, -32, 1.9, 1.9)],
        linhas: [{ d: 'M-24 -60C-18 -64 -12 -64 -6 -60', op: .4 }, { d: 'M-18 2C-6 5 8 5 20 2', op: .5 }, { d: 'M-22 -30C-20 -20 -19 -10 -19 0', op: .3 }] },
      { id: 'cabeca', pai: 'peito', pivo: [8, -268], formas: [{ d: cabeca, cor: pele }, { d: barba, cor: COR.grisalho }, { d: bigode, cor: COR.grisalho }, { d: sobrancelha, cor: COR.grisalho }, { d: tempora, cor: COR.grisalho }],
        furos: [rosto],
        brancos: [{ d: sobrancelha }, { d: bigode }, { d: 'M9.4 -32.4C11.2 -34.8 15 -35 16.8 -32.6C15 -30.4 11.4 -30.2 9.4 -32.4Z', w: 1.7 }, { d: elipse(14.4, -32.6, 1.5, 1.5) },
          { d: 'M8.4 -33.2L5.4 -34.6M8.4 -31.4L5.4 -30.2', w: 1.3 }, { d: 'M20.6 -24.8C21.2 -23 22.6 -22.2 24 -22.4', w: 1.7 },
          { d: 'M14.4 -27.6C13.2 -24.4 13.4 -21 15.2 -18.4', w: 1.5 }, { d: 'M6.6 -43C10 -44 13 -44 15.8 -42.6', w: 1.3 }, { d: 'M4 -22L11 -17', w: 1.3 }],
        linhas: [{ d: 'M-1 -30C-6.6 -32 -9 -21.6 -2.4 -19.6' }, { d: 'M5 -6L7 2M11 -9L13 0M16.6 -10L18 -3', op: .55, w: 1 }] },
      { id: 'chapeu', pai: 'cabeca', pivo: [14, -316], junta: false, formas: [
        { d: copa, cor: COR.palha, vazado: { motivo: 'g-trancado', faixa: 'M-20 -36H24V-10H-20Z', margem: 3 } },
        { d: 'M-17.6 -7L20.4 -7L20.2 1L-17.8 1Z', cor: COR.urucum },
        { d: aba, cor: COR.palha, vazado: { motivo: 'g-trancado', margem: 2.5 } }],
        linhas: [{ d: 'M-30 3C-14 6 20 6 36 1', op: .45, w: 1 }, { d: 'M-1 -32C0 -26 .4 -20 0 -12', op: .4 }] },
      { id: 'pernaFrente', pai: 'quadril', pivo: [-3, -166], corJunta: calca, formas: [{ d: canela, cor: pele }, { d: calcaD, cor: calca }, { d: pe, cor: pele }, { d: sola, cor: couro }, { d: tiras, cor: couro }], linhas: linhasPerna },
      { id: 'quadril', pai: 'peito', pivo: [0, -178], junta: false, formas: [{ d: 'M-19 -6C-6 -9 8 -9 21 -6L22 14C8 17 -6 17 -20 14Z', cor: calca },
        { d: 'M-19.5 -4.5L21.2 -4.5L21.5 3.5L-19.8 3.5Z', cor: couro },
        { d: 'M-12 2L-6.5 4L-25 66C-27 69.5 -31.5 68 -31 64.6Z', cor: '#4A2A16' }, { d: 'M-11.5 -9L-5 -7L-8.4 4.6L-15 2.6Z', cor: COR.argilaClara }],
        linhas: [{ d: 'M-14 20L-20 42', op: .5 }] },
      { id: 'bornal', pai: 'peito', pivo: [-24, -190], ang0: 4, junta: false, formas: [
        { d: 'M-14 0C-18 6 -20 18 -18 28C-16 34 -6 36 4 35C12 34 15 28 14 18C13 8 10 2 6 0Z', cor: COR.palha, vazado: { motivo: 'g-jabuti', faixa: 'M-20 13H16V36H-20Z' } },
        { d: 'M-15 1C-10 -3 2 -3 7 0L9 12C2 15 -10 15 -16 12Z', cor: COR.palhaSombra }],
        linhas: [{ d: 'M-6 13L-6 17', w: 2 }] },
      { id: 'espingarda', pai: 'maoFrente', pivo: [7, -144], junta: false, formas: [
        { d: mv('M8 -5.4L198 -5.4L198 -2.4L8 -2.4Z'), cor: COR.cano }, { d: mv('M193 -5.4L194.6 -8L196.2 -5.4Z'), cor: COR.cano },
        { d: mv('M12 -2.6L94 -2.6C96.6 -2.4 97 1.6 94 2.4L12 3.4Z'), cor: COR.madeiraClara },
        { d: mv(coronha), cor: COR.madeiraClara },
        { d: mv('M-2.4 2.6C-3.2 8 .6 11.8 5.6 11.6C9 11.4 10.6 8.6 10.2 3.2Z'), cor: COR.cano },
        { d: mv('M-7.4 -5L12.4 -5L12.4 3.4L-7.4 4Z'), cor: '#3A322C' }],
        furos: [mv('M.4 4C.2 7.2 2.2 9.4 5.2 9.4C7.4 9.4 8.4 7.6 8.2 4Z')],
        linhas: [{ d: mv('M3.4 4L4.8 8.4'), w: 1.3, op: 1 }, { d: mv('M-22 0C-38 1 -54 4 -68 8'), op: .45 }, { d: mv('M-4 -5L-6.4 -9.6L-1.6 -9.6'), w: 1.8, op: 1 }] },
      { id: 'bracoFrente', pai: 'peito', pivo: [2, -252], formas: [{ d: braco, cor: camisa }, { d: remendo, cor: COR.anil }, { d: dobra, cor: COR.couroCru }],
        linhas: [{ d: 'M-5.6 3.8L6.6 2.8L7.2 16.2L-5 17.2Z', dash: '2 1.6', op: .8, w: .9 }, { d: 'M-6.6 43C-1 41.6 4.6 41.6 10.4 43', op: .6 }] },
      { id: 'antebracoFrente', pai: 'bracoFrente', pivo: [4, -198], formas: [{ d: antebraco, cor: pele }] },
      { id: 'maoFrente', pai: 'antebracoFrente', pivo: [6, -151], formas: [{ d: punho, cor: pele }],
        linhas: [{ d: 'M10.6 6C7.6 7.2 4.4 7 1.6 6M11 10.6C7.8 11.8 4.4 11.6 1.6 10.4M9.8 15C7.2 16 4.4 15.8 2 14.8M-6.6 7.4C-3 5.8 .8 6.2 3.2 8', w: 1.2 }] },
    ];
    return {
      nome: 'tiao', H: 320, partes,
      varetas: [{ parte: 'peito', ponto: [2, -250], mestra: true }, { parte: 'maoFrente', ponto: [6, -148] }, { parte: 'maoTras', ponto: [14, -150] }],
      pose: { a: { peito: 2, cabeca: -2, bracoFrente: 10, antebracoFrente: -125, maoFrente: 0, espingarda: -32, bracoTras: 8, antebracoTras: -10, maoTras: 6, pernaFrente: -4, pernaTras: 3 } },
    };
  }

  S.bonecos = {
    criar, respirar, andar, pegadas, pelo, COR,
    curupira: op => criar(defCurupira(), op),
    tiao: op => criar(defTiao(), op),
    defs: { curupira: defCurupira, tiao: defTiao },
  };
})();
