/* cenario.js — Sombras.cenario: silhuetas procedurais da mata, com semente determinística (guia §8).
 *
 *   const cena = Sombras.cenario.mata({semente: 7, clareira: [700, 1220], samauma: 'direita'|'esquerda'|false})
 *                → {camadas: {L5: itens, L4, L3, L2, L1, L0}}
 *                itens = [{d, vazado?: {motivo, escala, faixa}} | {d, cor, borda}]  (coordenadas do palco; com cor =
 *                exceção colorida translúcida, como a helicônia)
 *   const m = Sombras.cenario.montar(palco, cena)   pré-renderiza cada camada UMA vez (SVG → máscara CSS
 *                pintada com a tinta do estado de luz: --sb-tinta; peças coloridas num bitmap à parte) e insere
 *                em palco.camadas.Lx; m.remover()
 *   Sombras.cenario.svgCamada(nome, itens)  → string SVG da camada (opacidade/desfoque da tabela, vazados)
 *   Sombras.cenario.PROFUNDIDADE  tabela §8.2: {L5: {opacidade, desfoque, escala, paralaxe}, ...}
 *   Sombras.cenario.pecas          geradores (rng, x, yBase, ...) → itens: palmeira, buriti, embauba, acai,
 *                samaumaLonge, samauma, samambaia, samambaiacu, heliconia, bromelia, costelas, cipo, cipoPendente,
 *                capim, chao, chaoClareira, horizonte, fronde
 * Paralaxe e tremor da chama são aplicados pelo palco aos contêineres das camadas (transform, sem repintar).
 */
(function () {
  'use strict';
  const S = window.Sombras = window.Sombras || {};
  const W = 1920, H = 1080, M = 240; // margem lateral para paralaxe
  const PI = Math.PI;
  const PROFUNDIDADE = {
    L5: { opacidade: .13, desfoque: 7, escala: .5, paralaxe: .15 },
    L4: { opacidade: .26, desfoque: 4, escala: .65, paralaxe: .30 },
    L3: { opacidade: .48, desfoque: 2, escala: .82, paralaxe: .55 },
    L2: { opacidade: .85, desfoque: .6, escala: 1, paralaxe: 1 },
    L1: { opacidade: .95, desfoque: 0, escala: 1.25, paralaxe: 1.3 },
    L0: { opacidade: .55, desfoque: 18, escala: 2.2, paralaxe: 2 },
  };

  // ---------- geometria ----------
  const R1 = v => Math.round(v * 10) / 10;
  const suave = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  // polígono com orientação normalizada (furo = orientação inversa; tudo em fill-rule nonzero)
  function poli(pts, furo) {
    let a = 0;
    for (let i = 0, n = pts.length; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; }
    if ((a < 0) !== !!furo) pts = pts.slice().reverse();
    return 'M' + pts.map(p => R1(p[0]) + ' ' + R1(p[1])).join('L') + 'Z';
  }
  function bez(p0, p1, p2, n) {
    const o = [];
    for (let i = 0; i <= n; i++) { const u = i / n, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u; o.push([a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]]); }
    return o;
  }
  // bordas paralelas a uma linha central; larguras inicial/final ou larg(u)
  function bordas(cs, w0, w1) {
    const e = [], d = [], n = cs.length;
    for (let i = 0; i < n; i++) {
      const a = cs[Math.max(0, i - 1)], b = cs[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const u = i / (n - 1), w = (typeof w0 === 'function' ? w0(u) : w0 + (w1 - w0) * u) / 2;
      e.push([cs[i][0] - dy * w, cs[i][1] + dx * w]); d.push([cs[i][0] + dy * w, cs[i][1] - dx * w]);
    }
    return [e, d];
  }
  function fita(cs, w0, w1) { const [e, d] = bordas(cs, w0, w1); return poli(e.concat(d.reverse())); }
  // folha em lente de a até b, meia-largura w, curvatura c (deslocamento do meio)
  function lente(a, b, w, c, n) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return fita(bez(a, [mx - dy / l * c, my + dx / l * c], b, n || 6), u => 2 * w * Math.pow(Math.sin(PI * u), .8));
  }
  function circ(cx, cy, rx, ry, n, furo) {
    const o = [];
    for (let i = 0; i < (n || 14); i++) { const a = i / (n || 14) * 2 * PI; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * (ry || rx)]); }
    return poli(o, furo);
  }
  // segmento de reta com recorte de faca (dentes irregulares) — bordas de oco e entalhes
  function faca(r, a, b, n, amp) {
    const o = [], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    for (let i = 1; i < n; i++) { const u = i / n + (r() - .5) * .4 / n, k = (i % 2 ? 1 : -.4) * amp * (.5 + r()); o.push([a[0] + dx * u - dy / l * k, a[1] + dy * u + dx / l * k]); }
    return o;
  }
  const it = d => ({ d });

  // ---------- peças ----------
  // fronde pinada: ráquis curvada pela gravidade + folíolos; pende = quanto os folíolos caem; rasgo = chance de
  // um folíolo faltar ou estar rasgado
  function fronde(r, x0, y0, ang, L, queda, larg, passo, abertura, pende, rasgo) {
    const o = [], dx = Math.cos(ang), dy = Math.sin(ang);
    const P = u => [x0 + dx * L * u, y0 + dy * L * u + queda * L * u * u];
    const cs = []; for (let i = 0; i <= 10; i++) cs.push(P(i / 10));
    o.push(fita(cs, larg * 1.3, larg * .3));
    const nf = Math.max(3, Math.round(L / passo));
    for (let i = 1; i <= nf; i++) {
      const u = .07 + .93 * i / nf, p = P(u), q = P(Math.min(1, u + .02)), ta = Math.atan2(q[1] - p[1], q[0] - p[0]);
      const comp = L * .3 * Math.pow(Math.sin(PI * (.12 + .88 * u)), .6) * (.8 + r() * .35);
      for (const lado of [-1, 1]) {
        let k = 1;
        if (rasgo && r() < rasgo) { if (r() < .5) continue; k = .3 + r() * .35; }
        const a = ta + lado * ((abertura || .95) + r() * .3);
        let ex = Math.cos(a), ey = Math.sin(a) + (pende == null ? .6 : pende); const l = Math.hypot(ex, ey); ex /= l; ey /= l;
        o.push(lente(p, [p[0] + ex * comp * k, p[1] + ey * comp * k], larg * (.9 + r() * .5), comp * .1 * lado, 5));
      }
    }
    return o;
  }
  function tronco(r, x, y, alt, inclina, w0, w1) {
    const topo = [x + inclina, y - alt];
    return { d: fita(bez([x, y + 4], [x + inclina * .2 + (r() - .5) * 20, y - alt * .5], topo, 12), w0, w1), topo };
  }
  function palmeira(r, x, y, alt, s, fina) {
    const tr = tronco(r, x, y, alt, (r() - .5) * alt * .25, 13 * s, 7 * s), o = [tr.d];
    const n = 7 + (r() * 3 | 0);
    for (let i = 0; i < n; i++) {
      const ang = -PI / 2 + (i / (n - 1) - .5) * 3.2 + (r() - .5) * .3;
      const L = (130 + r() * 80) * s;
      o.push(...fronde(r, tr.topo[0], tr.topo[1], ang, L, .55 + r() * .6, (fina ? 1.4 : 2.6) * s, (fina ? 4 : 6.5) * s, fina ? 1.05 : .9));
    }
    o.push(circ(tr.topo[0], tr.topo[1] + 4 * s, 9 * s, 12 * s, 10));
    return o.map(it);
  }
  function samambaiacu(r, x, y, alt, s) { return palmeira(r, x, y, alt, s * .85, true); }
  function buriti(r, x, y, alt, s) {
    const tr = tronco(r, x, y, alt, (r() - .5) * 30 * s, 15 * s, 12 * s), o = [tr.d];
    const n = 6 + (r() * 3 | 0);
    for (let i = 0; i < n; i++) {
      const ang = -PI / 2 + (i / (n - 1) - .5) * 2.9, pe = 45 * s * (.8 + r() * .5);
      const c = [tr.topo[0] + Math.cos(ang) * pe, tr.topo[1] + Math.sin(ang) * pe + 10 * s];
      o.push(fita([tr.topo, c], 4 * s, 3 * s));
      const R = (60 + r() * 30) * s, nseg = 26;
      for (let j = 0; j < nseg; j++) {
        const a = ang + (j / (nseg - 1) - .5) * 2.6;
        const tip = [c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R + R * .25 * Math.pow(Math.abs(j / (nseg - 1) - .5) * 2, 2)];
        o.push(lente(c, tip, 2.6 * s, (r() - .5) * 6 * s, 4));
      }
    }
    return o.map(it);
  }
  // embaúba: tronco fino, galhos em candelabro, folhas palmadas em estrela de 7–9 lobos bem abertos
  function folhaPalmada(r, cx, cy, R) {
    const o = [], n = 7 + (r() * 3 | 0), g = r() * PI;
    for (let j = 0; j < n; j++) {
      const a = g + j / n * 2 * PI + (r() - .5) * .25, L = R * (.78 + r() * .3);
      o.push(lente([cx, cy], [cx + Math.cos(a) * L, cy + Math.sin(a) * L * .6 + L * .22], R * .14, R * .08 * (r() - .5), 5));
    }
    return o;
  }
  function embauba(r, x, y, alt, s) {
    const tr = tronco(r, x, y, alt * .66, (r() - .5) * 40 * s, 10 * s, 6 * s), o = [tr.d];
    const nb = 3 + (r() * 3 | 0);
    for (let i = 0; i < nb; i++) {
      const lado = nb === 1 ? 0 : (i / (nb - 1) - .5) * 2, base = [tr.topo[0], tr.topo[1] + (Math.abs(lado) * 34 + r() * 16) * s];
      const ponta = [base[0] + lado * (70 + r() * 50) * s, base[1] - (80 + r() * 90) * s];
      o.push(fita(bez(base, [ponta[0], base[1] - 8 * s], ponta, 10), 6 * s, 3.5 * s));
      for (let j = 0, nl = 2 + (r() * 2 | 0); j < nl; j++) o.push(...folhaPalmada(r, ponta[0] + (r() - .5) * 46 * s, ponta[1] + (j * 30 - 12) * s, (46 + r() * 22) * s));
    }
    return o.map(it);
  }
  // touceira de açaí: 4–8 estipes finos inclinados, folhas pinadas de folíolos pendentes, cachos
  function acai(r, x, y, alt, s) {
    const o = [], n = 4 + (r() * 5 | 0);
    for (let i = 0; i < n; i++) {
      const h = alt * (.62 + r() * .42), inc = (i / (n - 1) - .5) * .7 + (r() - .5) * .15;
      const base = [x + (i - n / 2) * 7 * s, y], topo = [base[0] + Math.sin(inc) * h, base[1] - Math.cos(inc) * h];
      o.push(fita(bez(base, [base[0] + Math.sin(inc) * h * .35, base[1] - h * .5], topo, 10), 5 * s, 3.4 * s));
      for (let j = 0, nf = 5 + (r() * 3 | 0); j < nf; j++) {
        const a = -PI / 2 + (j / (nf - 1) - .5) * 3.4 + inc;
        o.push(...fronde(r, topo[0], topo[1], a, (85 + r() * 55) * s, .8 + r() * .6, 1.3 * s, 3.4 * s, .45, 2.4));
      }
      if (r() < .5) o.push(circ(topo[0] + 7 * s, topo[1] + 18 * s, 6 * s, 11 * s, 10));
    }
    return o.map(it);
  }
  // copa em guarda-chuva achatada (samaúma distante): almofada ondulada em cima, chata embaixo
  function almofada(r, cx, cy, rx, ry) {
    const pts = [], n = 24, f = r() * 6;
    for (let i = 0; i <= n; i++) { const u = i / n, a = PI + u * PI, q = 1 + .22 * Math.sin(u * 15 + f) + .12 * (r() - .5); pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry * q]); }
    pts.push([cx + rx * .8, cy + ry * .3], [cx - rx * .8, cy + ry * .3]);
    return poli(pts);
  }
  function samaumaLonge(r, x, y, alt, s) {
    const o = [], top = [x + (r() - .5) * 20 * s, y - alt];
    o.push(fita(bez([x, y + 4], [x, y - alt * .5], top, 10), 30 * s, 16 * s));
    o.push(poli([[x - 70 * s, y + 4], [x - 12 * s, y - 80 * s], [x + 12 * s, y - 80 * s], [x + 70 * s, y + 4]]));
    const larg = alt * (1.1 + r() * .35), ng = 5;
    for (let i = 0; i < ng; i++) {
      const lado = (i / (ng - 1) - .5) * 2, ponta = [top[0] + lado * larg * .5 * (.85 + r() * .25), top[1] - (18 + r() * 22) * s - (1 - Math.abs(lado)) * 20 * s];
      o.push(fita(bez([top[0], top[1] + 24 * s], [top[0] + lado * larg * .22, top[1] - 26 * s * (1 - Math.abs(lado))], ponta, 12), 10 * s, 3.5 * s));
      o.push(almofada(r, ponta[0], ponta[1] - 6 * s, (55 + r() * 45) * s, (16 + r() * 10) * s));
    }
    return o.map(it);
  }
  // horizonte de mata (L5): faixa contínua com topo irregular de copas
  function horizonte(r, x0, x1, y) {
    const pts = [], f = [r() * 6, r() * 6];
    for (let x = x0; x <= x1; x += 10) pts.push([x, y - 22 * Math.abs(Math.sin(x * .011 + f[0])) - 14 * Math.abs(Math.sin(x * .031 + f[1])) - 6 * r()]);
    return [it(poli([...pts, [x1, H], [x0, H]]))];
  }
  // samaúma (L2): tronco largo saindo pelo topo, 5 sapopemas em lâminas côncavas com fendas de luz entre elas,
  // oco rasgado entre duas sapopemas, casca com losangos vazados em faixas verticais desalinhadas
  function samauma(r, x, y, s, comFuros) {
    const larg = 180 * s, xl = x - larg / 2, xr = x + larg / 2, yb = y + 4, o = [];
    o.push(poli([[xl + 10 * s, -60], [xr - 6 * s, -60], [xr + 4 * s, y - 280 * s], [xr + 12 * s, y - 110 * s], [xl - 12 * s, y - 110 * s], [xl - 2 * s, y - 280 * s]]));
    // [topo da lâmina (preso no tronco), pé externo, pé interno]; côncava: controle puxado para dentro e para baixo
    const laminas = [
      [[xl + 4 * s, y - 262 * s], [x - 330 * s, yb], [x - 182 * s, yb], [xl + 22 * s, y - 196 * s]],
      [[xl + 26 * s, y - 192 * s], [x - 168 * s, yb], [x - 92 * s, yb], [xl + 52 * s, y - 128 * s]],
      [[x - 22 * s, y - 116 * s], [x - 40 * s, yb], [x + 62 * s, yb], [x + 34 * s, y - 112 * s]],
      [[xr - 46 * s, y - 150 * s], [x + 78 * s, yb], [x + 192 * s, yb], [xr - 10 * s, y - 208 * s]],
      [[xr - 8 * s, y - 210 * s], [x + 208 * s, yb], [x + 326 * s, yb], [xr + 2 * s, y - 266 * s]],
    ];
    laminas.forEach(([t, pi, pe, t2], k) => {
      const ext = k < 2 ? pi : pe, int = k < 2 ? pe : pi, topoExt = k < 2 ? t : t2, topoInt = k < 2 ? t2 : t;
      const curva = bez(topoExt, [topoExt[0] + (ext[0] - topoExt[0]) * .28, ext[1] - (ext[1] - topoExt[1]) * .22], ext, 12);
      let lado = [int, topoInt];
      if (k === 1 || k === 2) { // bordas do oco: recorte de faca
        const a = k === 1 ? int : [x - 40 * s, yb], b = k === 1 ? [xl + 60 * s, y - 104 * s] : [x - 26 * s, y - 92 * s];
        lado = k === 1 ? [int, ...faca(r, int, b, 7, 4 * s), b, topoInt] : [a, ...faca(r, a, b, 6, 4 * s), b, topoInt];
      }
      o.push(poli(k < 2 ? [...curva, ...lado] : [...lado, ...curva]));
    });
    // fundo do oco: entre a 2ª e a 3ª lâmina a luz entra até o tronco
    const d = o.join('');
    if (!comFuros) return [it(d)];
    // casca entalhada: 3 faixas estreitas e desalinhadas de losangos vazados (pontes largas, furos soltos)
    let casca = '';
    for (const [fx, y0, n] of [[x - 60 * s, 150, 5], [x + 2 * s, 70, 4], [x + 44 * s, 330, 6]])
      for (let j = 0; j < n; j++) for (let c = 0; c < 2; c++) {
        const cx = fx + c * 15 + (j % 2) * 7.5, cy = y0 + j * 15;
        casca += poli([[cx, cy - 8.5], [cx + 5.2, cy], [cx, cy + 8.5], [cx - 5.2, cy]], true);
      }
    return [it(d + casca)];
  }
  function samambaia(r, x, y, alt, s) {
    const o = [], n = 6 + (r() * 3 | 0);
    for (let i = 0; i < n; i++) {
      const ang = -PI / 2 + (i / (n - 1) - .5) * 2.6 + (r() - .5) * .2;
      o.push(...fronde(r, x, y, ang, alt * (.7 + r() * .4), .9 + r() * .5, 1.5 * s, 4.5 * s, 1.15));
    }
    return o.map(it);
  }
  // folha de bananeira (helicônia): oblonga e larga, ao longo de uma nervura curva, com rasgos laterais
  function folhaRasgada(r, p0, ang, L, Wd, queda) {
    const dx = Math.cos(ang), dy = Math.sin(ang), n = 26;
    const C = u => [p0[0] + dx * L * u, p0[1] + dy * L * u + queda * L * u * u];
    const lados = [];
    for (const sd of [-1, 1]) {
      const pts = [], rasgos = [];
      for (let k = 0, u = .18 + r() * .1; u < .9; u += .1 + r() * .16, k++) rasgos.push(u);
      for (let i = 0; i <= n; i++) {
        const u = i / n, c = C(u), c2 = C(Math.min(1, u + .01)), tl = Math.hypot(c2[0] - c[0], c2[1] - c[1]) || 1;
        const nx = -(c2[1] - c[1]) / tl * sd, ny = (c2[0] - c[0]) / tl * sd, w = Wd * Math.pow(Math.sin(PI * Math.min(1, u * 1.04)), .45) * (sd > 0 ? 1 : .88);
        pts.push([c[0] + nx * w, c[1] + ny * w]);
        const rg = rasgos.find(q => q > u - .5 / n && q <= u + .5 / n);
        if (rg != null && u > .05) { // rasgo da margem quase até a nervura, inclinado para a ponta
          const m = C(Math.min(1, u + .035)), prof = .18 + r() * .12;
          pts.push([m[0] + nx * w * prof, m[1] + ny * w * prof], [c[0] + nx * w + (c2[0] - c[0]) / tl * 2.4, c[1] + ny * w + (c2[1] - c[1]) / tl * 2.4]);
        }
      }
      lados.push(pts);
    }
    return [poli([C(0), ...lados[0], C(1), ...lados[1].reverse()]), C];
  }
  function heliconia(r, x, y, alt, s, comFuros) {
    const o = [], cor = [];
    let maior = null;
    for (let i = 0; i < 4; i++) {
      const h = alt * (.32 + r() * .3) * (i === 1 ? 1.3 : 1), lean = (i - 1.4) * .32 + (r() - .5) * .15;
      const base = [x + (i - 1.5) * 9 * s, y], pe = [base[0] + Math.sin(lean) * h, base[1] - Math.cos(lean) * h];
      o.push(fita(bez(base, [base[0] + Math.sin(lean) * h * .1, base[1] - h * .65], pe, 8), 5 * s, 3 * s));
      const ang = -PI / 2 + lean * 2.1 + (lean > 0 ? .25 : -.25), L = (130 + r() * 60) * s * (i === 1 ? 1.25 : 1);
      const [folha, Cm] = folhaRasgada(r, pe, ang, L, (24 + r() * 8) * s * (i === 1 ? 1.2 : 1), .45 + r() * .3);
      if (i === 1) maior = { d: folha, cs: [...Array(13).keys()].map(k => Cm(.04 + k / 12 * .86)) };
      else o.push(folha);
    }
    // inflorescência pendente: haste em arco + 8 brácteas em barco alternadas, em couro urucum com ponta açafrão
    const topo = [x + 4 * s, y - alt * .55], cs = bez(topo, [x + 70 * s, topo[1] - 40 * s], [x + 78 * s, topo[1] + 150 * s], 16);
    o.push(fita(cs, 4 * s, 2.4 * s));
    for (let i = 2; i < 16; i += 1.75) {
      const k = Math.round(i), p = cs[k], q = cs[Math.min(15, k + 1)], ta = Math.atan2(q[1] - p[1], q[0] - p[0]), lado = (Math.round(i / 1.75) % 2) ? 1 : -1;
      const Lb = (36 - k * .7) * s, a = ta + PI + lado * .75, tip = [p[0] + Math.cos(a) * Lb, p[1] + Math.sin(a) * Lb];
      const barco = lente(p, tip, 6.5 * s, lado * 7 * s, 8), ponta = lente([p[0] + (tip[0] - p[0]) * .62, p[1] + (tip[1] - p[1]) * .62], tip, 3.4 * s, lado * 2.4 * s, 5);
      cor.push({ d: barco, cor: '#D2522A', borda: '#6E1E0A' }, { d: ponta, cor: '#F2B43A', borda: '#6E1E0A' });
    }
    const res = o.map(it);
    if (maior) res.push(comFuros ? { d: maior.d, vazado: { motivo: 'g-espinha', escala: 1, faixa: fita(maior.cs, 9 * s, 3 * s) } } : it(maior.d));
    return res.concat(cor);
  }
  function bromelia(r, x, y, s) {
    const o = [], n = 11;
    for (let i = 0; i < n; i++) {
      const a = -PI / 2 + (i / (n - 1) - .5) * 2.8, L = (34 + r() * 18) * s * (1 - Math.abs(i / (n - 1) - .5) * .5);
      o.push(lente([x, y], [x + Math.cos(a) * L, y + Math.sin(a) * L * .9 + (Math.abs(a + PI / 2) > 1 ? 8 * s : 0)], 5 * s, (a + PI / 2) * 10 * s, 6));
    }
    return o.map(it);
  }
  // costela-de-adão: folha cordada (seio na base), fendas da margem até ~2/3 do caminho à nervura em lóbulos de
  // largura variada, furos ovais alongados em fileira junto à nervura; pecíolo longo e curvo
  function costela(r, base, ang, tam) {
    const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx, Wm = tam * .46;
    const Mn = u => [base[0] + dx * tam * u, base[1] + dy * tam * u];
    const larg = u => Wm * (u < 0 ? Math.sqrt(Math.max(0, 1 - Math.pow(-u / .2, 2))) * .9 : Math.pow(Math.sin(PI * Math.min(1, .3 + u * .78)), .55));
    const Ed = (u, sd, fr) => { const m = Mn(u), w = larg(u) * fr; return [m[0] + nx * sd * w, m[1] + ny * sd * w]; };
    const o = [], lados = [];
    for (const sd of [-1, 1]) {
      const pts = [], fendas = [];
      for (let u = .06 + r() * .06; u < .86; u += .1 + r() * .11) fendas.push(u);
      for (let i = 0; i <= 40; i++) {
        const u = -.19 + i / 40 * 1.19;
        pts.push(Ed(u, sd, 1));
        const f = fendas.find(q => q > u - .015 && q <= u + .015);
        if (f != null) { // fenda: vai da margem a 1/3 da meia-largura e volta, inclinada para a ponta
          const a = Ed(u + .006, sd, 1), apex = Ed(u - .04, sd, .32 + r() * .06), b = Ed(u + .03, sd, 1);
          pts.push(a, apex, b);
          const m = Ed(u - .07, sd, .18); // furo oval alongado entre a nervura e a fenda
          if (r() < .8 && u > .12) o.push(poli([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(j => { const t = j / 10 * 2 * PI; return [m[0] + Math.cos(t) * nx * tam * .042 - Math.sin(t) * dx * tam * .017, m[1] + Math.cos(t) * ny * tam * .042 - Math.sin(t) * dy * tam * .017]; }), true));
        }
      }
      lados.push(pts);
    }
    o.unshift(poli([Mn(0), ...lados[0], Mn(1.0), ...lados[1].reverse()]));
    return o.join('');
  }
  // grupo de 3–4 folhas presas num caule que sai da borda do papel
  function costelas(r, x, y, ang, tam, n, sentido) {
    const o = [], caule = bez([x, y], [x + sentido * 40, y - 60], [x + sentido * 70, y - 150], 12);
    o.push(fita(caule, 12, 7));
    for (let i = 0; i < n; i++) {
      const p = caule[2 + i * 3], t = tam * (.65 + r() * .5) * (i === 1 ? 1.15 : 1), a = ang + (i - (n - 1) / 2) * .5 + (r() - .5) * .25;
      const fim = [p[0] + Math.cos(a) * t * .45 + sentido * 14, p[1] + Math.sin(a) * t * .45 - 24];
      o.push(fita(bez(p, [p[0] + sentido * t * .5, p[1] - t * .6], fim, 10), 6, 4));
      o.push(costela(r, fim, a + (r() - .5) * .3, t));
    }
    return [it(o.join(''))];
  }
  // cipó: dois fios torcidos de espessura variável, trechos sem folha, folhas alternadas de tamanhos
  // diferentes e um laço pendente
  function cipo(r, a, b, queda, s, folhas) {
    const cs = bez(a, [(a[0] + b[0]) / 2 + (r() - .5) * 60, (a[1] + b[1]) / 2 + queda], b, 48), o = [], f = r() * 6;
    for (const fase of [0, PI]) {
      const fio = cs.map((p, i) => {
        const q = cs[Math.min(cs.length - 1, i + 1)], pp = cs[Math.max(0, i - 1)], l = Math.hypot(q[0] - pp[0], q[1] - pp[1]) || 1, k = 2.4 * s * Math.sin(i * .8 + fase);
        return [p[0] - (q[1] - pp[1]) / l * k, p[1] + (q[0] - pp[0]) / l * k];
      });
      o.push(fita(fio, u => (2.2 + 2.6 * (.5 + .5 * Math.sin(u * PI * 3 + f + fase))) * s));
    }
    const k1 = 14 + (r() * 6 | 0), k2 = k1 + 9, mid = [(cs[k1][0] + cs[k2][0]) / 2, (cs[k1][1] + cs[k2][1]) / 2 + 70 * s];
    o.push(fita(bez(cs[k1], mid, cs[k2], 14), 4 * s, 3 * s)); // laço pendente
    if (folhas) for (let i = 3, lado = 1; i < cs.length - 2; i += 2 + (r() * 2 | 0)) {
      if (Math.sin(i * .23 + f) < -.25) continue; // trecho sem folha
      const p = cs[i], t = (9 + r() * 12) * s; lado = -lado;
      o.push(lente(p, [p[0] + lado * t, p[1] + t * (.7 + r() * .5)], t * .32, lado * t * .2, 5));
    }
    return o.map(it);
  }
  // cipó que pende do alto em S e termina numa gavinha irregular de volta e meia
  function cipoPendente(r, x, y0, comp, s) {
    const cs = [], f = r() * 6;
    for (let i = 0; i <= 24; i++) { const u = i / 24; cs.push([x + Math.sin(u * PI * 2.2 + f * .1) * 16 * s + 5 * Math.sin(u * 9 + f), y0 + u * comp]); }
    const fim = cs[cs.length - 1], esp = [];
    for (let i = 1; i <= 22; i++) {
      const u = i / 22, a = -PI / 2 - u * 3 * PI, rr = 13 * s * (1 - u * .6) * (1 + .3 * Math.sin(u * 11 + f));
      esp.push([fim[0] + 11 * s + Math.cos(a) * rr + u * 6 * s, fim[1] + 13 * s + Math.sin(a) * rr + u * 10 * s]);
    }
    const o = [fita(cs, 5.5 * s, 3.4 * s), fita([fim, ...esp], 3.2 * s, .9 * s)];
    for (let i = 3; i < cs.length - 3; i += 2 + (r() * 3 | 0)) { const p = cs[i], l = i % 2 ? 1 : -1, t = (10 + r() * 9) * s; o.push(lente(p, [p[0] + l * t, p[1] + t * .7], t * .33, l * 3 * s, 5)); }
    return o.map(it);
  }
  function capim(r, x, y, alt, s) {
    const o = [], n = 9 + (r() * 6 | 0);
    for (let i = 0; i < n; i++) {
      const a = -PI / 2 + (r() - .5) * 1.4, L = alt * (.5 + r() * .5) * s, tip = [x + Math.cos(a) * L + (r() - .5) * 10, y + Math.sin(a) * L];
      o.push(poli([[x - 2.2 * s + i * .6, y + 2], ...bez([x, y], [x + (tip[0] - x) * .2, y - L * .6], tip, 5).slice(1), [x + 2.2 * s + i * .6, y + 2]]));
    }
    return o.map(it);
  }
  function chao(r, x0, x1, yTopo) {
    const pts = [], f = [r() * 6, r() * 6, r() * 6];
    for (let x = x0; x <= x1; x += 12) pts.push([x, yTopo + 6 * Math.sin(x * .004 + f[0]) + 3 * Math.sin(x * .013 + f[1]) + 1.5 * Math.sin(x * .05 + f[2])]);
    return [it(poli([...pts, [x1, H], [x0, H]]))];
  }
  // chão do plano dos bonecos: clareira clara no meio (só uma borda escura irregular no rodapé) e chão escuro
  // subindo nas laterais, sob as plantas; folhas soltas na borda
  function chaoClareira(r, x0, x1, e, d) {
    const f = [r() * 6, r() * 6, r() * 6], o = [];
    const yAt = x => 843 + (806 - 843) * Math.max(suave((e - x) / 170), suave((x - d) / 190)) + 4 * Math.sin(x * .004 + f[0]) + 2.5 * Math.sin(x * .017 + f[1]) + 1.4 * Math.sin(x * .07 + f[2]);
    const pts = [];
    for (let x = x0; x <= x1; x += 8) pts.push([x, yAt(x)]);
    o.push(poli([...pts, [x1, H], [x0, H]]));
    for (let x = x0 + 20; x < x1; x += 16 + r() * 34) { // folhas e gravetos na borda
      const y = yAt(x) + 2, L = 10 + r() * 16, a = -PI / 2 + (r() - .5) * 2.4;
      o.push(lente([x, y], [x + Math.cos(a) * L, y + Math.sin(a) * L * .55], 2.8 + r() * 1.5, (r() - .5) * 6, 5));
    }
    return o.map(it);
  }

  // ---------- composição: a mata da referência (clareira de luz no centro) ----------
  function mata(op) {
    op = op || {};
    const r = S.rng(op.semente || 7), cl = op.clareira || [700, 1220];
    const C = { L5: [], L4: [], L3: [], L2: [], L1: [], L0: [] }, add = (k, a) => C[k].push(...a);
    const noCentro = x => x > cl[0] + 30 && x < cl[1] - 30;

    // L5 — horizonte de copas, claro e alto, com emergentes
    let s = PROFUNDIDADE.L5.escala;
    add('L5', horizonte(r, -M, W + M, 600));
    for (let x = -M + 30; x < W + M; x += 120 + r() * 120) {
      const q = r();
      add('L5', q < .3 ? samaumaLonge(r, x, 610, (420 + r() * 140) * s * 1.6, s) : q < .75 ? palmeira(r, x, 610, (600 + r() * 360) * s, s) : buriti(r, x, 610, (640 + r() * 240) * s, s));
    }
    // L4 — árvores distantes: densas nas bordas, raras no centro (névoa)
    s = PROFUNDIDADE.L4.escala;
    add('L4', chao(r, -M, W + M, 828));
    for (let x = -M + 50; x < W + M; x += 110 + r() * 120) {
      if (noCentro(x) && r() < .55) continue;
      const q = r();
      if (q < .34) add('L4', palmeira(r, x, 820, (620 + r() * 300) * s, s));
      else if (q < .48) add('L4', buriti(r, x, 820, (660 + r() * 180) * s, s));
      else if (q < .66) add('L4', embauba(r, x, 820, (640 + r() * 200) * s, s));
      else if (q < .84) add('L4', acai(r, x, 820, (560 + r() * 160) * s, s));
      else add('L4', samaumaLonge(r, x, 820, (420 + r() * 120) * s, s));
    }
    // L3 — mata média legível: laterais e bordas do painel central
    s = PROFUNDIDADE.L3.escala;
    const L3 = [['embauba', -30, 640], ['acai', 120, 560], ['palmeira', 300, 720], ['samambaiacu', 470, 470], ['embauba', 560, 600],
      ['acai', cl[0] - 70, 400], ['palmeira', cl[1] + 20, 700], ['embauba', 1330, 620], ['acai', 1470, 580], ['palmeira', 1620, 760],
      ['embauba', 1790, 660], ['acai', 1990, 600]];
    const gen = { embauba, acai, palmeira, samambaiacu };
    for (const [g, x, alt] of L3) add('L3', gen[g](r, x + (r() - .5) * 40, 814, alt * s, s));
    for (const x of [60, 380, 1560, 1840]) add('L3', samambaia(r, x, 806, 150 * s, s));
    add('L3', cipo(r, [130, 150], [420, 190], 200, s, true));
    add('L3', cipo(r, [1480, 170], [1760, 120], 240, s, true));
    // L2 — plano dos bonecos: chão, samaúma à direita, touceira de açaí à esquerda (equilíbrio), helicônia
    s = 1;
    add('L2', chaoClareira(r, -M, W + M, 230, 1520));
    const esq = op.samauma === 'esquerda', X = x => (esq ? W - x : x);
    if (op.samauma !== false) add('L2', samauma(r, X(1745), 806, .95, true));
    add('L2', acai(r, X(150), 812, 520, 1));
    add('L2', heliconia(r, X(1372), 812, 230, 1, true));
    add('L2', bromelia(r, X(1460), 812, .9));
    add('L2', bromelia(r, X(258), 812, 1));
    add('L2', samambaia(r, X(560), 818, 110, .9));
    add('L2', cipo(r, [X(1720), 60], [X(1330), 56], 250, 1, true));
    // L1 — colado à tela: frondes do topo (variadas, com folíolos rasgados), costelas-de-adão, cipó, capim
    s = PROFUNDIDADE.L1.escala;
    for (const [x, y, a, L, q, n] of [[30, 30, .25, 330, .5, 7], [40, 10, .75, 250, .62, 6], [-10, 120, -.05, 300, .42, 7.6], [130, 0, 1.25, 210, .7, 6.4],
      [1900, 20, PI - .3, 300, .55, 7.4], [1880, 0, PI - .95, 270, .45, 6.2], [1940, 140, PI + .05, 240, .5, 7]])
      add('L1', fronde(r, x, y, a, L * s * .8, q, 3.2 * s, n * s, .85, .6, .05).map(it));
    for (const [x, y, a, L, q, n] of [[650, 30, .5, 168, .8, 5.5], [672, 18, PI - .5, 104, .95, 6.2], [690, 10, .95, 80, .6, 5], // pontas sobre os montantes
      [1262, 26, PI - .62, 150, .7, 5.2], [1250, 18, .28, 122, .9, 6], [1240, 8, PI - 1.1, 84, .55, 5]])
      add('L1', fronde(r, x, y, a, L * s * .8, q, 2.4 * s, n * s, .85, .6, .07).map(it));
    add('L1', costelas(r, 46, 770, -.5, 125, 3, 1));
    add('L1', cipoPendente(r, 612, 40, 200, 1.1));
    add('L1', cipoPendente(r, 1300, 40, 140, 1));
    add('L1', samambaia(r, 120, 862, 170, 1.2));
    add('L1', samambaia(r, 1810, 862, 160, 1.2));
    for (let x = 80; x < W - 60; x += 34 + r() * 40) if (x < 540 || x > 1440) add('L1', capim(r, x, 860, 60 + r() * 40, 1));
    return { semente: op.semente || 7, camadas: C };
  }

  // ---------- pré-renderização ----------
  function svgCamada(nome, itens) {
    const P = PROFUNDIDADE[nome], G = S.grafismos;
    let defs = '', corpo = '', n = 0;
    const pats = {};
    for (const x of itens) {
      if (x.cor) continue;
      if (!x.vazado) { corpo += `<path d="${x.d}"/>`; continue; }
      const v = G.variante(x.vazado.motivo, { escala: x.vazado.escala });
      if (!pats[v.id]) { pats[v.id] = 1; defs += v.svg; }
      const id = 'mv' + (n++);
      defs += `<mask id="${id}" maskUnits="userSpaceOnUse" x="${-M}" y="0" width="${W + 2 * M}" height="${H}"><rect x="${-M}" y="0" width="${W + 2 * M}" height="${H}" fill="#fff"/>` +
        `<path d="${x.vazado.faixa || x.d}" fill="url(#${v.id})"/><path d="${x.d}" fill="none" stroke="#fff" stroke-width="8"/></mask>`;
      corpo += `<path d="${x.d}" mask="url(#${id})"/>`;
    }
    const filtro = P.desfoque ? `<filter id="b" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="${P.desfoque}"/></filter>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W + 2 * M}" height="${H}" viewBox="${-M} 0 ${W + 2 * M} ${H}"><defs>${defs}${filtro}</defs>` +
      `<g opacity="${P.opacidade}"${filtro ? ' filter="url(#b)"' : ''}>${corpo}</g></svg>`;
  }
  // exceções coloridas (couro tingido translúcido): bitmap estático por cima da tinta da camada
  function svgCores(itens) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W + 2 * M}" height="${H}" viewBox="${-M} 0 ${W + 2 * M} ${H}"><g opacity=".92" stroke-linejoin="round">` +
      itens.map(x => `<path d="${x.d}" fill="${x.cor}"${x.borda ? ` stroke="${x.borda}" stroke-width="1.4"` : ''}/>`).join('') + '</g></svg>';
  }
  const dataURL = svg => 'data:image/svg+xml,' + svg.replace(/"/g, "'").replace(/[%#<>{}\n]/g, encodeURIComponent);
  function montar(palco, cena) {
    const els = [];
    for (const nome in cena.camadas) {
      const itens = cena.camadas[nome];
      if (!itens.length) continue;
      const e = document.createElement('div'), url = 'url("' + dataURL(svgCamada(nome, itens)) + '")';
      e.className = 'sb-tinta';
      e.style.cssText = `position:absolute;left:${-M}px;top:0;width:${W + 2 * M}px;height:${H}px;mask:${url} 0 0/100% 100% no-repeat;-webkit-mask:${url} 0 0/100% 100% no-repeat`;
      palco.camadas[nome].appendChild(e);
      els.push(e);
      const cores = itens.filter(x => x.cor);
      if (cores.length) {
        const im = document.createElement('img');
        im.src = dataURL(svgCores(cores));
        im.style.cssText = `position:absolute;left:${-M}px;top:0;width:${W + 2 * M}px;height:${H}px`;
        palco.camadas[nome].appendChild(im);
        els.push(im);
      }
    }
    return { elementos: els, remover() { els.forEach(e => e.remove()); } };
  }

  S.cenario = {
    mata, montar, svgCamada, PROFUNDIDADE, MARGEM: M,
    pecas: { fronde, palmeira, samambaiacu, buriti, embauba, acai, samaumaLonge, samauma, samambaia, heliconia, bromelia, costelas, cipo, cipoPendente, capim, chao, chaoClareira, horizonte },
    geometria: { poli, fita, lente, circ, bez, faca },
  };
})();
