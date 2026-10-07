/* xilogravuras.js — Sombras.xilogravura(cenaId, luz) → string <svg> com a gravura da capa de cordel do capítulo.
 *
 * Uma xilogravura própria por capítulo (estilo.md §10.3): tinta preta chapada, goivadas brancas, hachuras.
 * viewBox 440 × 300 (o player a põe na cartela com a classe .xilo). Cena sem gravura → '' e o player usa a
 * genérica. luz não muda o desenho (cada capítulo tem a sua), fica na assinatura para a genérica.
 */
(() => {
  const S = window.Sombras = window.Sombras || {};
  const TINTA = '#170C05', PAPEL = '#EDE0C2';

  /* ── geometria ── */
  const r1 = v => Math.round(v * 10) / 10;
  const pt = p => r1(p[0]) + ' ' + r1(p[1]);
  const caminho = ps => 'M' + ps.map(pt).join('L') + 'Z';
  const sorteio = s => () => (s = s * 16807 % 2147483647) / 2147483647;
  // Catmull-Rom entre b e c
  const cr = (a, b, c, d, t) => [0, 1].map(k => .5 * (2 * b[k] + (c[k] - a[k]) * t +
    (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t * t + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * t * t * t));
  function curva(ps, k = 8) {
    const out = [], n = ps.length;
    for (let i = 0; i < n - 1; i++)
      for (let s = 0; s < k; s++) out.push(cr(ps[i - 1] || ps[i], ps[i], ps[i + 1], ps[i + 2] || ps[i + 1], s / k));
    return out.concat([ps[n - 1]]);
  }
  // contorno fechado suave pelos pontos (sentido horário na tela); [x, y, 1] = quina
  function contorno(ps, k = 6) {
    const out = [], n = ps.length, em = i => ps[(i + n) % n];
    for (let i = 0; i < n; i++) {
      const b = em(i), c = em(i + 1), a = b[2] ? b : em(i - 1), d = c[2] ? c : em(i + 2);
      for (let s = 0; s < k; s++) out.push(cr(a, b, c, d, s / k));
    }
    return out;
  }
  const forma = (ps, k) => caminho(contorno(ps, k));
  // caixa [x0, y0, x1, y1] de um caminho feito por caminho()
  const caixa = d => {
    const n = d.match(/-?\d+(\.\d+)?/g).map(Number), xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  };
  // franja de pelo/palha: os pontos do contorno no trecho [de, ate) viram pontas para fora (e para baixo)
  function franja(ps, de, ate, amp, semente = 1) {
    const r = sorteio(semente), n = ps.length;
    return ps.map((p, i) => {
      const sorte = r();
      if (i / n < de || i / n >= ate || i % 2 || sorte < .2) return p;
      const a = ps[(i - 1 + n) % n], b = ps[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, m = amp * (.35 + sorte);
      return [p[0] + (b[1] - a[1]) / L * m, p[1] - (b[0] - a[0]) / L * m + m * .45];
    });
  }
  // faixa de largura variável ao longo de uma curva (larg(t) = meia-largura); devolve os pontos do contorno
  function faixa(ps, larg, k = 8) {
    const c = curva(ps, k), n = c.length, e = [], d = [];
    c.forEach((p, i) => {
      const a = c[Math.max(0, i - 1)], b = c[Math.min(n - 1, i + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L, w = larg(i / (n - 1));
      e.push([p[0] + nx * w, p[1] + ny * w]);
      d.push([p[0] - nx * w, p[1] - ny * w]);
    });
    return e.concat(d.reverse());
  }
  const traco = (ps, larg, k) => caminho(faixa(ps, larg, k));
  const fuso = w => t => w * Math.sin(Math.PI * t) ** .8;          // pontas finas: goivada
  const afina = (a, b = 0) => t => a + (b - a) * t;               // da raiz à ponta
  // goivada reta ou curva (dobra = desvio do meio, em px)
  const goiva = (a, b, w, dobra = 0) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const m = [(a[0] + b[0]) / 2 - (b[1] - a[1]) / L * dobra, (a[1] + b[1]) / 2 + (b[0] - a[0]) / L * dobra];
    return traco([a, m, b], fuso(w), 3);
  };
  // campo de goivadas curtas (pelo, casca) num retângulo; usar dentro de um clip
  function pelagem(x0, y0, x1, y1, ang, passo, comp, w, semente) {
    const r = sorteio(semente);
    let d = '';
    for (let y = y0, lin = 0; y < y1; y += comp * .75, lin++)
      for (let x = x0 + (lin % 2) * passo * .5; x < x1; x += passo) {
        const a = ang + (r() - .5) * .35, e = comp * (.6 + r() * .5) / 2, jx = x + (r() - .5) * passo * .6, jy = y + (r() - .5) * comp * .5;
        d += goiva([jx - Math.cos(a) * e, jy - Math.sin(a) * e], [jx + Math.cos(a) * e, jy + Math.sin(a) * e], w * (.7 + r() * .5), (r() - .3) * 2.4);
      }
    return d;
  }

  /* ── peças de gravura ── */
  const P = d => `<path d="${d}"/>`;
  const B = d => `<path fill="${PAPEL}" d="${d}"/>`;                // goivada (branco)
  const respiro = (d, w = 3) => `<path d="${d}" stroke="${PAPEL}" stroke-width="${w}" stroke-linejoin="round" paint-order="stroke"/>`;
  const pele = d => `<path fill="${PAPEL}" stroke="${TINTA}" stroke-width="2.6" stroke-linejoin="round" d="${d}"/>`;  // área goivada com contorno
  const bola = (x, y, r, cor = PAPEL) => `<circle fill="${cor}" cx="${r1(x)}" cy="${r1(y)}" r="${r}"/>`;

  // peça preta com miolo goivado (clip) e contorno preto reforçado por cima
  function peca(ctx, d, goivas, halo = 3) {
    const id = `xc-${ctx.id}-${ctx.n++}`;
    return `<clipPath id="${id}">${P(d)}</clipPath>${halo ? respiro(d, halo) : P(d)}` +
      `<g clip-path="url(#${id})">${goivas}</g><path d="${d}" fill="none" stroke="${TINTA}" stroke-width="2.4" stroke-linejoin="round"/>`;
  }

  // sol de cordel: disco com anéis goivados e raios triangulares, longos e curtos
  function sol(cx, cy, r, n = 18, semente = 3) {
    const rnd = sorteio(semente), p = (a, rr) => [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = i / n * 2 * Math.PI + rnd() * .06, lon = i % 2 ? 1.5 : 1.95, e = .12 + rnd() * .04;
      d += caminho([p(a - e, r * 1.14), p(a, r * (lon + rnd() * .12)), p(a + e, r * 1.14)]);
    }
    const anel = (rr, w) => B(traco(Array.from({ length: 14 }, (_, i) => p(i / 12 * 2 * Math.PI, rr * (.97 + rnd() * .06))), () => w, 4));
    return P(d) + P(forma(Array.from({ length: 12 }, (_, i) => p(i / 12 * 2 * Math.PI, r * (.97 + rnd() * .06))))) +
      anel(r * .72, r * .07) + anel(r * .42, r * .06);
  }

  // chão: faixa preta de borda irregular com touceiras de capim goivadas
  function chao(y, semente) {
    const r = sorteio(semente), ps = [[0, 300, 1]];
    for (let x = 0; x <= 440; x += 20) ps.push([x, y + (r() - .5) * 7]);
    ps.push([440, 300, 1]);
    let capim = '';
    for (let x = 10; x < 432; x += 11 + r() * 20) {
      const yy = y + 8 + r() * 16, alt = 5 + r() * 6;
      for (let k = -2; k <= 2; k++) if (r() > .25) capim += goiva([x + k * 1.5, yy], [x + k * (2 + r() * 2), yy - alt * (1 - Math.abs(k) * .2)], .9);
    }
    return P(forma(ps, 4)) + B(capim);
  }

  // folha larga de bananeira/helicônia: nervura goivada, veias oblíquas e rasgos na margem
  function folha(base, topo, larg, dobra, semente, halo) {
    const r = sorteio(semente), L = Math.hypot(topo[0] - base[0], topo[1] - base[1]);
    const ux = (topo[0] - base[0]) / L, uy = (topo[1] - base[1]) / L, nx = -uy, ny = ux;
    const em = (t, s) => { const q = s + dobra * Math.sin(Math.PI * t); return [base[0] + ux * L * t + nx * q, base[1] + uy * L * t + ny * q]; };
    const perfil = t => t < .3 ? .2 + 2.7 * t : t > .85 ? (1 - t) / .15 * .9 + .1 : 1;
    const lado = s => [.06, .2, .35, .5, .65, .8, .92].map(t => em(t, s * larg * perfil(t)));
    const f = forma([em(0, 0), ...lado(1), em(1, 0), ...lado(-1).reverse()], 5);
    let d = halo ? respiro(f, halo) : P(f);
    d += B(traco([em(.02, 0), em(.5, 0), em(.97, 0)], t => 1.4 * (1 - t) + .4));
    for (let t = .14; t < .9; t += .085 + r() * .03)
      for (const s of [1, -1]) {
        const rasgo = r() > .78;
        d += B(goiva(em(t, s * 2.6), em(t + .07, s * larg * perfil(t + .07) * (rasgo ? 1.08 : .8)), rasgo ? 1.4 : .8, s * 1.2));
      }
    return d;
  }

  // nascente: meio sol no horizonte, raios em triângulo que não chegam às bordas
  function nascente(cx, cy, r, n = 13, semente = 4, a0 = Math.PI, a1 = 2 * Math.PI) {
    const rnd = sorteio(semente), p = (a, rr) => [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = a0 + (i + .5) / n * (a1 - a0), lon = i % 2 ? 1.6 : 2.25, e = .085 + rnd() * .03;
      d += caminho([p(a - e, r * 1.16), p(a, r * (lon + rnd() * .15)), p(a + e, r * 1.16)]);
    }
    const arco = (rr, w) => B(traco(Array.from({ length: 9 }, (_, i) => p(Math.PI + i / 8 * Math.PI, rr * (.97 + rnd() * .05))), fuso(w), 5));
    return P(d) + P(forma([[cx - r, cy + 1, 1], ...Array.from({ length: 9 }, (_, i) => p(Math.PI + (i + .5) / 9.5 * Math.PI, r * (.98 + rnd() * .04))), [cx + r, cy + 1, 1]], 4)) +
      arco(r * .66, r * .08);
  }
  // fronde pinada (açaí, samambaia): ráquis curva e folíolos pendentes dos dois lados
  function fronde(ps, n, comp, queda, w, semente, cor = P) {
    const r = sorteio(semente), c = curva(ps, 10), N = c.length - 1;
    let d = traco(ps, t => w * (1 - t) + .5, 10);
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1), k = Math.round(t * N), [x, y] = c[k], [x2, y2] = c[Math.min(N, k + 1)];
      const ang = Math.atan2(y2 - y, x2 - x), L = comp * (1 - t * .55) * (.8 + r() * .35);
      for (const lado of [1, -1]) {
        if (r() < .08) continue;                       // folíolo que falta
        const a = ang + lado * (1.05 + r() * .25), ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L + queda * L;
        d += traco([[x, y], [(x + ex) / 2 + Math.cos(a) * L * .1, (y + ey) / 2 + Math.sin(a) * L * .1 - queda * L * .15], [ex, ey]], fuso(1.7 + r() * .5), 2);
      }
    }
    return cor(d);
  }
  // água: faixa preta com ondinhas goivadas
  function agua(y0, y1, semente, reflexo) {
    const r = sorteio(semente);
    let d = '';
    if (reflexo) for (let y = y0 + 5, k = 0; y < y1 - 3; y += 5.5, k++) {
      const L = reflexo[1] * (1 - k * .07) * (.75 + r() * .4), x = reflexo[0] + (r() - .5) * 8;
      if (L > 4) d += traco([[x - L, y], [x, y - .8], [x + L, y]], fuso(1.5 - k * .05), 4);
    }
    for (let y = y0 + 6, k = 0; y < y1 - 2; y += 6.5, k++)
      for (let x = 8 + (k % 2) * 14 + r() * 8; x < 432; x += 24 + r() * 16) {
        const L = 12 + r() * 12;
        if (reflexo && Math.abs(x + L / 2 - reflexo[0]) < reflexo[1] * 1.2) continue;
        d += traco([[x, y], [x + L * .3, y - 2], [x + L * .7, y + 1.5], [x + L, y - .5]], fuso(1.1), 3);
      }
    return P(`M0 ${y0}H440V${y1}H0Z`) + B(d);
  }

  /* ── arara em voo (olha para −x; asa = 1 para cima, −1 para baixo) ── */
  function arara(x, y, e, asa, semente) {
    const r = sorteio(semente), A = ([u, v]) => [u, v * asa];
    const pena = (a, b, w, dobra = 2) => {
      const d = goiva(A(a), A(b), w, dobra * asa);
      return respiro(d, 2.2) + B(goiva(A([a[0] + (b[0] - a[0]) * .15, a[1] + (b[1] - a[1]) * .15]), A([a[0] + (b[0] - a[0]) * .8, a[1] + (b[1] - a[1]) * .8]), .55, dobra * asa * .7));
    };
    let s = '';
    // asa de trás, só as pontas
    for (const [a, b, w] of [[[-2, -26], [20, -76], 4.2], [[4, -24], [28, -70], 4.2], [[8, -18], [33, -58], 4]]) s += pena([a[0] + 10, a[1]], [b[0] + 10, b[1]], w);
    // cauda: três penas, a do meio mais longa
    for (const [b, w] of [[[74, -6], 3.4], [[96, 12], 3.6], [[118, 4], 4.2]]) s += pena([14, 0], b, w, 3);
    // corpo, cabeça e bico grande
    s += respiro(forma([[-44, -9], [-52, -9], [-60, -6], [-64, 1], [-62, 10, 1], [-58, 5], [-56, 7], [-52, 11], [-44, 12], [-32, 12], [-16, 13], [0, 10],
      [14, 6], [24, 3], [24, -3], [8, -8], [-12, -12], [-28, -13], [-38, -13]], 5), 2.6);
    s += pele(forma([[-51, -5], [-45, -8.5], [-38, -6], [-37, 0], [-42, 4.5], [-50, 3]], 4)) + bola(-44, -2, 2, TINTA) +
      P(goiva([-49.5, 1.4], [-41, 2.8], .45, -.4)) + P(goiva([-48, -5], [-41, -5.4], .4, .5)) + B(goiva([-59, 4], [-50, 5.6], .7, .5));
    for (let i = 0; i < 8; i++) {
      const u = -30 + i * 5.2 + r() * 2, v = 3 + r() * 5;
      s += B(traco([[u - 2.2, v - 1], [u, v + 1.3], [u + 2.2, v - 1]], fuso(.75), 3));
    }
    // asa da frente: penas compridas em leque a partir do punho, coberteiras por cima
    for (const [a, b, w] of [[[8, -8], [26, -30], 3.6], [[8, -14], [30, -44], 4], [[6, -20], [28, -58], 4.4], [[2, -26], [22, -70], 4.6],
      [[-3, -30], [13, -78], 4.8], [[-8, -32], [3, -80], 4.8], [[-14, -30], [-6, -76], 4.4]]) s += pena(a, b, w);
    s += respiro(forma([[-20, -6], [-19, -22], [-12, -34], [-1, -38], [8, -28], [10, -8]].map(A), 5), 2.4);
    for (let i = 0; i < 4; i++) s += B(traco([A([-16 + i * 6, -12]), A([-15.5 + i * 6, -16]), A([-13 + i * 6, -17.5]), A([-10.5 + i * 6, -16]), A([-10 + i * 6, -12])], fuso(.75), 3)) +
      (i < 3 ? B(traco([A([-13 + i * 6, -23]), A([-12.5 + i * 6, -27]), A([-10 + i * 6, -28.5]), A([-7.5 + i * 6, -27]), A([-7 + i * 6, -23])], fuso(.7), 3)) : '');
    return `<g transform="translate(${x} ${y}) scale(${e})">${s}</g>`;
  }
  // açaizeiro pequeno: estipe curvo e penacho de frondes
  function acai(x, y, alt, curv, e, semente) {
    const t = [x + curv, y - alt];
    let s = P(traco([[x, y], [x + curv * .4, y - alt * .55], t], afina(2.2 * e, 1.3 * e), 5));
    const r = sorteio(semente);
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI * (.05 + .9 * i / 5) + (r() - .5) * .2, L = (16 + r() * 7) * e;
      s += fronde([t, [t[0] + Math.cos(a) * L * .55, t[1] + Math.sin(a) * L * .55 - 3 * e], [t[0] + Math.cos(a) * L, t[1] + Math.sin(a) * L * .6 + 6 * e]], 7, 6 * e, .9, 1.1 * e, semente + i);
    }
    return s;
  }

  /* ── veada prenhe (olha para −x, chão em y = 0) ── */
  function veada(x, y, e) {
    let s = '';
    // pernas de trás (do lado de lá)
    s += respiro(forma([[-26, -46], [-22, -28], [-24, -10], [-25, 0, 1], [-20, 0, 1], [-19, -10], [-17, -30], [-14, -46]], 4), 2.4);
    s += respiro(forma([[26, -48], [30, -34], [36, -24], [34, -10], [34, 0, 1], [39, 0, 1], [40, -12], [44, -28], [42, -48]], 4), 2.4);
    const orelha = (a, b, w) => respiro(traco([a, [(a[0] + b[0]) / 2 + 2, (a[1] + b[1]) / 2], b], t => w * Math.sin(Math.PI * (.1 + .9 * t)) ** .9 * (1 - .25 * t), 5), 2.4);
    s += orelha([-63, -122], [-80, -146], 7.5);
    const corpo = [[-92, -108, 1], [-86, -101], [-74, -98], [-62, -95], [-54, -84], [-49, -66], [-45, -56], [-43, -44], [-41, -28], [-42, -10],
      [-43, 0, 1], [-37, 0, 1], [-36, -10], [-35, -28], [-31, -44], [-16, -40], [2, -34], [20, -38], [31, -46], [34, -36], [40, -24], [38, -10],
      [38, 0, 1], [44, 0, 1], [44, -12], [48, -26], [55, -40], [58, -56], [56, -72], [62, -66, 1], [62, -74], [56, -80], [46, -84], [20, -87], [-10, -87],
      [-32, -90], [-42, -101], [-50, -116], [-58, -126], [-68, -127], [-78, -123], [-86, -115]];
    s += respiro(forma(corpo, 4), 2.8) + orelha([-56, -122], [-36, -144], 8);
    // olho grande, narina, orelhas por dentro, pintas no dorso, ventre e cauda claros
    s += B(forma([[-76, -114], [-71, -117.5], [-66, -115.5], [-71, -112]], 4)) + bola(-71.5, -115, 1.5, TINTA);
    s += B(goiva([-90, -106], [-86, -105], 1)) + B(goiva([-52, -127], [-41, -140], 2, -.8)) + B(goiva([-86, -100], [-76, -100.5], .7, .8));
    for (const [u, v] of [[-30, -80], [-18, -80], [-6, -79], [6, -79], [18, -79], [30, -77], [-24, -73], [-12, -72], [0, -72], [12, -72], [24, -70], [36, -72]]) s += bola(u, v, 1.7);
    s += B(traco([[-36, -46], [-16, -43], [0, -40.5], [16, -42.5], [26, -47]], fuso(1.5))) + B(traco([[57, -73], [61, -69]], fuso(1.2), 3));
    s += B(goiva([-52, -100], [-44, -74], 1.1, 2)) + B(goiva([46, -60], [52, -40], 1, -2));
    return `<g transform="translate(${x} ${y}) scale(${e})">${s}</g>`;
  }
  // chapéu de palha (branco, trançado em tinta), aba média levantada nas pontas, copa com amassado
  function chapeu(x, y, e) {
    const aba = forma([[-36, 0], [-30, -4], [0, -6], [30, -4], [37, -1, 1], [30, 3], [0, 4], [-30, 3], [-37, 2, 1]], 4);
    const copa = forma([[-17, -4], [-17, -15], [-12, -23], [-4, -21], [3, -24], [12, -22], [17, -14], [18, -4]], 4);
    let s = pele(copa) + pele(aba);
    for (let i = -3; i < 4; i++) s += P(goiva([i * 5 - 3, -6], [i * 5 + 3, -20], .5)) + P(goiva([i * 5 + 3, -6], [i * 5 - 3, -20], .5));
    s += P(`M-17.5 -9H18V-5H-17.5Z`) + P(goiva([-28, 0], [28, 0], .5, 1));
    return `<g transform="translate(${x} ${y}) scale(${e})">${s}</g>`;
  }

  /* ── noite: lua, estrelas, vaga-lumes, urutau ── */
  function lua(cx, cy, r, semente) {
    const rnd = sorteio(semente), p = (a, rr) => [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
    let s = B(forma(Array.from({ length: 12 }, (_, i) => p(i / 12 * 2 * Math.PI, r * (.97 + rnd() * .06)))));
    for (let i = 0; i < 6; i++) {                 // sombra do lado direito em hachura
      const x = cx + r * (.38 + i * .1), h = Math.sqrt(Math.max(0, r * r - (x - cx) ** 2)) * .86;
      s += P(goiva([x, cy - h], [x + 1, cy + h], .55 + i * .12, .6));
    }
    for (let i = 0; i < 22; i++) { const a = i / 22 * 2 * Math.PI + rnd() * .12; s += B(goiva(p(a, r * 1.22), p(a, r * (1.36 + rnd() * .14)), .8)); }
    return s;
  }
  const estrela = (x, y, t) => B(goiva([x - t, y], [x + t, y], .8) + goiva([x, y - t], [x, y + t], .8)) + bola(x, y, .9);
  const vagalume = (x, y, r) => bola(x, y, r) + (r > 1.8 ? Array.from({ length: 6 }, (_, i) => {
    const a = i / 6 * 2 * Math.PI + .3;
    return B(goiva([x + Math.cos(a) * (r + 1.8), y + Math.sin(a) * (r + 1.8)], [x + Math.cos(a) * (r + 4.6), y + Math.sin(a) * (r + 4.6)], .5));
  }).join('') : '');
  // urutau (mãe-da-lua) pousado na ponta do toco (x, y), de frente: cabeça chata, olhos enormes, bico miúdo, boca larga
  function urutau(ctx, x, y, e) {
    const corpo = forma([[-5, 34, 1], [-8, 12], [-14, -6], [-16, -28], [-15, -50], [-19, -60], [-22, -72], [-18, -84], [-8, -87], [0, -86], [8, -87],
      [18, -84], [22, -72], [19, -60], [15, -50], [16, -28], [14, -6], [8, 12], [5, 34, 1]], 5);
    const r = sorteio(77);
    let penas = '';
    for (let i = 0; i < 80; i++) {
      const u = -15 + r() * 30, v = -58 + r() * 92, a = 1.25 + r() * .6, L = 2 + r() * 3.5;
      penas += r() < .25 ? bola(u, v, .7 + r() * .5) : B(goiva([u, v], [u + Math.cos(a) * L, v + Math.sin(a) * L], .5 + r() * .3));
    }
    penas += B(goiva([-14, -52], [-7, 18], 1.1, -2.4)) + B(goiva([14, -52], [7, 18], 1.1, 2.4));
    let s = peca(ctx, corpo, penas, 3);
    for (const sx of [-1, 1]) {
      const cx = sx * 12, cy = -73;
      s += B(forma(Array.from({ length: 10 }, (_, i) => [cx + 7.4 * Math.cos(i * .63), cy + 7.4 * Math.sin(i * .63)]))) + bola(cx - sx * 1.4, cy + 1.6, 3.6, TINTA) + bola(cx - sx * 2.4, cy + .6, 1);
      s += P(forma([[cx - 8.4, cy - 1.6], [cx - 6, cy - 6.6], [cx, cy - 8.6], [cx + 6, cy - 6.6], [cx + 8.4, cy - 1.6], [cx, cy - 3.4]], 4));
      for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + sx * (i / 5 * 2 - .1); s += B(goiva([cx + Math.cos(a) * 10, cy + Math.sin(a) * 10], [cx + Math.cos(a) * 12.6, cy + Math.sin(a) * 12.6], .5)); }
    }
    s += B(traco([[-21, -57], [-12, -61.5], [0, -62.6], [12, -61.5], [21, -57]], fuso(1.2), 4)) + B(traco([[-14, -56.5], [0, -57.6], [14, -56.5]], fuso(.6), 4)) +
      B(goiva([-1.4, -67], [0, -62.4], .9)) + B(goiva([1.4, -67], [0, -62.4], .9));
    return `<g transform="translate(${x} ${y}) scale(${e})">${s}</g>`;
  }

  // caçador andando de perfil para +x, braços esticados como sonâmbulo (silhueta com respiro)
  function sonambulo(x, y, e, velho) {
    let s = '';
    const chapeuS = forma([[-17, -97], [-10, -99], [-9, -110], [-3, -113], [2, -110], [8, -112], [10, -99], [18, -98], [19, -95, 1], [-18, -94, 1]], 3);
    s += respiro(goiva([-2, -46], [-10, -24], 4.4) + goiva([-10, -24], [-15, -1], 3.4) + caminho([[-19, 0], [-10, 0], [-12, -4], [-17, -4]]), 2.2);
    s += respiro(goiva([2, -78], [30, -76], 3.2, -.8), 2.2);
    s += respiro(forma([[-7, -82], [8, -82], [10, -66], [9, -46], [-8, -44], [-9, -64]], 4), 2.4);
    s += respiro(goiva([4, -46], [12, -24], 4.6) + goiva([12, -24], [15, -1], 3.4) + caminho([[11, 0], [22, 0], [20, -4], [13, -4]]), 2.2);
    s += respiro(forma([[-6, -84], [-7, -94], [2, -98], [9, -93], [12, -88, 1], [8, -86], [8, -82]], 4), 2.2);
    if (velho) s += respiro(forma([[2, -86], [9, -85], [8, -78, 1], [4, -80], [0, -76, 1], [-2, -82]], 3), 1.6);
    s += respiro(chapeuS, 2.2) + B(goiva([-9, -101], [10, -101], .8));
    s += respiro(goiva([0, -76], [30, -72], 3.2, -.6), 2.2);
    if (velho) s += respiro(traco([[-12, -56], [-4, -80], [6, -108]], afina(2.4, 1.6), 3), 2);
    return `<g transform="translate(${x} ${y}) scale(${e})">${s}</g>`;
  }

  /* ── a Vó benzedeira, sentada no banquinho, de perfil para +x; (x, y) = chão sob o banco ── */
  function vo(ctx, x, y, e) {
    let s = '';
    // banquinho
    s += respiro(goiva([-18, -28], [-23, 1], 2.4) + goiva([12, -28], [15, 1], 2.4) + goiva([-4, -28], [-5, 0], 2), 2.2);
    // saia comprida com barra em degrau, pés de fora
    s += pele(forma([[50, -4], [58, -6], [63, -3], [62, 0, 1], [48, 0, 1]], 4));
    const saia = forma([[-18, -56], [8, -60], [24, -58], [40, -52], [46, -38], [50, -18], [55, -1, 1], [6, -1, 1], [2, -10], [-12, -15], [-25, -22], [-27, -38], [-23, -50]], 5);
    let barra = B(traco([[8, -11], [30, -12], [53, -12]], () => .9, 4));
    for (let u = 8; u < 52; u += 6) barra += B(caminho([[u, -3], [u + 3, -8.5], [u + 6, -3]]));
    s += peca(ctx, saia, barra + B(goiva([40, -46], [46, -16], .9, -1.5)) + B(goiva([30, -48], [33, -16], .8, -1)) + B(goiva([-18, -40], [-6, -16], .8, 1)), 2.8);
    // tronco curvado e xale com franja
    s += respiro(forma([[-20, -54], [-24, -72], [-20, -92], [-8, -106], [6, -100], [14, -86], [12, -70], [8, -58]], 5), 2.6);
    const xale = franja(contorno([[-10, -108], [4, -102], [14, -90], [18, -74, 1], [6, -70], [-6, -68], [-22, -66, 1], [-24, -84], [-18, -100]], 5), .3, .75, 4, 7);
    let xs = '';
    for (let i = 0; i < 5; i++) xs += B(caminho([[-14 + i * 6, -86], [-11 + i * 6, -82], [-14 + i * 6, -78], [-17 + i * 6, -82]]));
    s += peca(ctx, caminho(xale), xs + B(goiva([-20, -72], [16, -76], .8, 2)), 2.6);
    // braço, mãos e o novelo de cipó
    s += respiro(traco([[2, -88], [8, -70], [24, -64]], afina(5.5, 4), 5), 2.4);
    s += pele(forma([[22, -70], [29, -73], [33, -66], [30, -60], [23, -61]], 4));
    s += respiro(forma(Array.from({ length: 10 }, (_, i) => [38 + 10.5 * Math.cos(i * .63), -70 + 10.5 * Math.sin(i * .63)])), 2.6);
    s += B(traco([[30, -73], [36, -79], [44, -77], [48, -70]], fuso(1.2), 5)) + B(traco([[29, -67], [36, -74], [45, -71], [47, -63]], fuso(1.1), 5)) +
      B(traco([[33, -61], [38, -68], [46, -66]], fuso(1), 5)) + B(traco([[34, -78], [32, -70], [35, -62]], fuso(.9), 5));
    s += pele(forma([[28, -64], [36, -61], [37, -55], [29, -55]], 4));
    // cabeça: lenço de pintas atado na nuca, rosto enrugado, cachimbo de barro
    const lenco = forma([[16, -124], [8, -131], [-4, -132], [-13, -124], [-14, -110], [-8, -104], [-2, -108], [2, -118], [12, -120]], 5);
    let pintas = '';
    for (let u = -14; u < 16; u += 5) for (let v = -132; v < -104; v += 5) pintas += bola(u + (v % 2) * 2.5, v, 1.1);
    s += respiro(goiva([-12, -110], [-24, -98], 3.2, 2) + goiva([-12, -110], [-18, -92], 2.6, -1), 2.2);
    s += pele(forma([[13, -121], [19, -117], [21, -113], [25.5, -107.5], [24, -104.5], [21.5, -103.5], [21, -100], [19, -99], [21.5, -95.5], [18, -90.5], [9, -92], [2, -100], [1, -112], [4, -120]], 4));
    s += peca(ctx, lenco, pintas, 2.6) + respiro(forma([[-16, -112], [-11, -115], [-8, -110], [-12, -106]], 4), 2);
    s += P(goiva([10, -112], [17, -112.5], 1, -1)) + P(goiva([8, -116], [16, -117.5], .6, -.8)) + P(goiva([7, -106], [13, -100], .6, 1)) +
      P(goiva([11, -96], [16, -93], .5, -.6)) + P(goiva([14, -110], [17, -106], .5));
    s += respiro(traco([[20, -100], [32, -98], [42, -97]], afina(1.6, 1.3), 4), 2) + respiro(forma([[38, -98], [48, -99], [47, -91], [41, -90]], 3), 2);
    s += P(traco([[44, -103], [47, -114], [41, -126], [47, -138], [58, -143], [56, -156], [64, -168], [61, -184], [68, -196]], fuso(2), 6));
    return `<g transform="translate(${x} ${y}) scale(${e})">${s}</g>`;
  }
  // cipó solto no chão: fio que cai do novelo e faz voltas largas, com folhinhas
  function cipoSolto(ps, semente, cor = B) {
    const r = sorteio(semente), c = curva(ps, 8);
    let s = cor(traco(ps, () => 1.3, 8));
    for (let i = 6; i < c.length - 2; i += 7 + Math.floor(r() * 4)) {
      const [x, y] = c[i], [x2, y2] = c[i + 1], a = Math.atan2(y2 - y, x2 - x) + (i % 2 ? 1 : -1) * (.8 + r() * .4);
      s += cor(goiva([x, y], [x + Math.cos(a) * 7, y + Math.sin(a) * 7], 1.8));
    }
    return s;
  }

  /* ── queixada (olha para +x, chão em y = 0) ── */
  function queixada(ctx, x, y, e, semente) {
    const r = sorteio(semente);
    const perna = (ps, w) => { const [hx, hy] = ps[ps.length - 1]; return traco(ps, afina(w, w * .62), 4) + caminho([[hx - w * .9, hy + 1], [hx + w * .9, hy + 1], [hx + w * .6, hy - 3], [hx - w * .6, hy - 3]]); };
    let s = P(perna([[16, -26], [15.5, -12], [15, 0]], 3) + perna([[-26, -30], [-27, -14], [-28, 0]], 3.2));
    const dorso = [[18, -62], [2, -66], [-24, -60], [-42, -52]];
    let crina = '';
    curva(dorso, 6).forEach(([u, v], i, c) => {
      if (i % 2 || i > c.length - 2) return;
      const [u2, v2] = c[i + 1], L = Math.hypot(u2 - u, v2 - v), nx = (v2 - v) / L, ny = -(u2 - u) / L, h = (5 + r() * 5) * (1.5 - i / c.length);
      crina += caminho([[u - 2.4, v + 1], [u + nx * h - 2.5, v + ny * h], [u + 2.4, v + 1]]);
    });
    const corpo = forma([[22, -30], [8, -22], [-22, -22], [-36, -28], [-44, -40], [-42, -52], [-26, -60], [2, -66], [18, -62], [30, -56], [46, -44],
      [56, -38], [60, -38], [62, -32], [59, -27, 1], [50, -26], [40, -22], [30, -24]], 5);
    s += P(crina) + peca(ctx, corpo, B(pelagem(-50, -70, 40, -20, -.45, 4.2, 12, .5, semente + 1)), 0);
    s += P(caminho([[19, -61], [15, -73], [25, -62]])) + B(goiva([21, -63], [17.5, -70], .6));
    s += B(forma([[32, -25], [44, -24], [54, -26], [50, -22.5], [38, -21.5]], 4)) + B(goiva([61, -36], [61, -29], .7)) + bola(34, -48, 1.6);
    s += P(perna([[24, -28], [23.5, -12], [23, 0]], 3.4) + perna([[-34, -34], [-37, -14], [-34, 0]], 3.8));
    return `<g transform="translate(${x} ${y}) scale(${e})">${s}</g>`;
  }
  // ipê-amarelo em flor: tronco torto, galhos nus e cachos de flores de cinco pétalas
  function ipe(x, y, semente) {
    const r = sorteio(semente);
    let s = P(traco([[x, y], [x - 6, y - 50], [x + 4, y - 96], [x - 4, y - 130]], afina(7, 4), 6));
    const galhos = [[[x + 2, y - 92], [x + 26, y - 120], [x + 30, y - 160]], [[x - 4, y - 128], [x - 28, y - 150], [x - 40, y - 176]],
      [[x - 3, y - 126], [x + 4, y - 160], [x - 6, y - 190]], [[x - 4, y - 60], [x - 26, y - 82], [x - 44, y - 90]], [[x + 4, y - 100], [x + 34, y - 104], [x + 50, y - 118]]];
    for (const g of galhos) s += P(traco(g, afina(3.4, 1.2), 5));
    const flor = (fx, fy, fr) => {
      const a0 = r() * 7;
      return [0, 1, 2, 3, 4].map(i => `<circle cx="${r1(fx + Math.cos(a0 + i * 1.257) * fr * .55)}" cy="${r1(fy + Math.sin(a0 + i * 1.257) * fr * .55)}" r="${r1(fr * .5)}" stroke="${PAPEL}" stroke-width=".8"/>`).join('') + bola(fx, fy, fr * .22);
    };
    for (const g of galhos) {
      const [gx, gy] = g[2];
      for (let k = 0; k < 13; k++) {
        const a = r() * 2 * Math.PI, d = r() * 17;
        s += flor(gx + Math.cos(a) * d, gy + Math.sin(a) * d * .8, 3.6 + r() * 1.6);
      }
    }
    return s;
  }

  /* ── Curupira (perfil, olha para +x, chão em y = 0, 220 de altura sem o cabelo) ── */
  // membro: curva raiz → junta → ponta, largura w0 → w1, com pelos (franja) de um lado
  function membro(ps, w0, w1, lado, s) {
    const ps2 = faixa(ps, t => w0 + (w1 - w0) * t);
    return caminho(lado ? franja(ps2, lado > 0 ? .06 : .55, lado > 0 ? .46 : .95, 5.5, s) : ps2);
  }
  // pé virado, de perfil e de pele (branco): tornozelo em (x, y), calcanhar para +x, dedos para −x
  function pe([x, y]) {
    const q = (u, v, k) => [x + u, y + 16 + v, k];   // v medido a partir da sola
    const d = forma([q(-5, -23), q(5, -23), q(6, -20), q(9, -15), q(14, -10), q(15.5, -5), q(13, -1), q(7, 0, 1), q(-24, .4, 1), q(-31, -.8),
      q(-34.5, -3.4), q(-32.5, -6.2), q(-30, -6.6, 1), q(-30.5, -8.6), q(-27.5, -10.2), q(-25.4, -9.6, 1), q(-25, -11.4), q(-22, -12.6),
      q(-19.6, -11.8, 1), q(-12, -14), q(-6, -20)], 4);
    return pele(d) + P(goiva(q(-30, -6.4), q(-25, -4.2), .8)) + P(goiva(q(-25.4, -9.4), q(-21, -7.4), .7)) +
      P(goiva(q(-33.6, -4.6), q(-31, -2), .7, -.8)) + P(goiva(q(-1, -14), q(3, -15.5), .9, 1.2)) + P(goiva(q(6, -7), q(12, -3), .7, -1));
  }
  // a pelagem da perna para no meio da canela; dali para baixo é pele
  const acima = ([q, j, [x, y]]) => [q, j, [x + (j[0] - x) * .1, y + (j[1] - y) * .1]];
  function curupira(ctx, o) {
    const { bF, bT, pF, pT } = o;
    // peça peluda: goivadas de pelo só dentro da caixa da peça
    const k = 1 / Math.max(o.e, .5), peludo = (d, sem, ang = 1.75, extra = '') => {
      const [x0, y0, x1, y1] = caixa(d);
      return peca(ctx, d, (o.e < .4 ? '' : B(pelagem(x0 - 4, y0 - 4, x1 + 4, y1 + 4, ang, 6.5 * k, 12 * k, .75 * k, sem))) + extra);
    };
    let s = '';
    // cabelo de fogo: línguas que saem do alto e da nuca, para trás, e cujas pontas sobem como chama
    const linguas = [
      [[[12, -209], [0, -218], [-16, -224], [-32, -232], [-44, -244]], 8],
      [[[2, -212], [-18, -219], [-40, -222], [-58, -230], [-72, -242]], 10],
      [[[-10, -207], [-34, -210], [-58, -211], [-80, -218], [-96, -230]], 12],
      [[[-18, -196], [-42, -197], [-66, -195], [-90, -200], [-108, -211], [-116, -222]], 12],
      [[[-22, -183], [-46, -181], [-72, -178], [-96, -181], [-114, -190], [-124, -201]], 11],
      [[[-23, -170], [-46, -166], [-70, -164], [-92, -167], [-108, -176]], 10],
      [[[-20, -158], [-38, -151], [-58, -149], [-74, -152], [-86, -160]], 8]];
    let fogo = '', luz = '';
    linguas.forEach(([ps, w], i) => {
      fogo += traco(ps, t => w * (1 - t) ** .65 * (1 + .22 * Math.sin(t * 11 + i * 2)) + .4, 7);
      luz += B(traco(ps.slice(0, -1).map(([x, y], k) => [x - k * 1.5, y + 2.6 + Math.sin(k * 1.9 + i) * 1.6]), fuso(1.5), 6));
    });
    for (const [x, y] of [[-86, -246], [-132, -218], [-58, -252]]) fogo += traco([[x, y], [x - 4, y - 5], [x - 9, y - 9]], fuso(2.6), 4);
    s += respiro(fogo, 3) + luz;
    s += P(forma([[10, -212], [-6, -216], [-20, -206], [-26, -188], [-26, -166], [-18, -150], [-4, -148], [0, -170], [0, -196]]));
    // braço e perna de trás
    s += peludo(membro(bT, 8, 5, 1, 11), 21, 1.9);
    if (pT) s += pe(pT[2]) + peludo(membro(acima(pT), 11, 7, -1, 12), 22);
    // tronco atarracado, peludo nas costas, cinto de fibra torcida
    const tronco = franja(contorno([[12, -152], [22, -142], [29, -126], [28, -108], [23, -94], [20, -82], [-8, -76, 1],
      [-18, -84], [-22, -98], [-27, -114], [-28, -130], [-20, -148]], 6), .52, .98, 7, 5);
    let cinto = B(goiva([-18, -90], [22, -94], 1.4, 1)) + B(goiva([-17, -82], [21, -86], 1.4, 1));
    for (let i = 0; i < 9; i++) cinto += B(goiva([-14 + i * 4.2, -91.4], [-12 + i * 4.2, -84.4], .9));
    s += peludo(caminho(tronco), 23, 1.75, cinto + (o.colar ? B(traco([[-20, -146], [-6, -134], [10, -132], [22, -140]], () => 1.6, 6)) +
      B(traco([[-18, -141], [-4, -128], [12, -127], [24, -135]], () => 1.2, 6)) : ''));
    // rosto goivado (branco) com o perfil em tinta: testa, nariz arrebitado, sorriso maroto
    s += pele(forma([[6, -208], [22, -203], [30, -195], [32, -188], [31, -184, 1], [38, -176, 1], [32, -172], [34, -168],
      [30, -165], [33, -161], [29, -155], [20, -150], [6, -151], [-4, -158], [-6, -172], [-4, -192], [0, -204]]));
    s += P(goiva([13, -193], [29, -190], 2.2, -1.5));                                                   // sobrancelha
    s += P(forma([[14, -184], [20, -187.5], [27, -185], [21, -181.5]], 4)) + bola(22.5, -185.2, 1.2);  // olho
    s += P(goiva([19, -165], [32, -167.5], 1.4, 1.6)) + P(goiva([16.5, -169.5], [20.5, -164.5], 1, -.6)); // sorriso
    s += P(goiva([30.5, -174], [34, -172], 1)) + P(goiva([13, -176], [20, -171], .8, 1));
    // orelha grande
    s += pele(forma([[0, -192], [-9, -197], [-18, -190], [-21, -177], [-17, -165], [-8, -159], [-2, -164], [-4, -176], [-1, -184]], 5));
    s += P(traco([[-5, -190], [-14, -188], [-16, -176], [-11, -166]], fuso(1.8))) + P(goiva([-9, -182], [-9, -172], 1.1, 1));
    // perna da frente e machado de casco de jabuti
    s += pe(pF[2]) + peludo(membro(acima(pF), 11.5, 7.5, -1, 13), 24);
    if (o.machado) {
      const [hx, hy] = bF[2];
      s += respiro(traco([[hx - 6, hy + 30], [hx - 1, hy + 4], [hx + 3, hy - 24], [hx + 8, hy - 62]], afina(3.6, 2.8)), 3);
      const lam = forma([[hx + 6, hy - 52, 1], [hx + 20, hy - 60], [hx + 33, hy - 64, 1], [hx + 40, hy - 50], [hx + 39, hy - 33],
        [hx + 31, hy - 20, 1], [hx + 17, hy - 27], [hx + 4, hy - 33, 1]], 6);
      // casco: um escudo central irregular e sulcos até a borda
      const esc = [[hx + 14, hy - 50], [hx + 24, hy - 52], [hx + 29, hy - 43], [hx + 24, hy - 34], [hx + 14, hy - 36]];
      let sulcos = B(traco(esc.concat([esc[0], esc[1]]), () => 1.1, 1));
      for (const [i, dx, dy] of [[0, -6, -6], [1, 6, -10], [2, 10, -2], [3, 6, 9], [4, -6, 6]])
        sulcos += B(goiva(esc[i], [esc[i][0] + dx, esc[i][1] + dy], 1.1, 1));
      s += respiro(lam, 3) + sulcos;
      for (let k = 0; k < 3; k++) s += B(goiva([hx - 1, hy - 34 - k * 6], [hx + 10, hy - 39 - k * 6], .9));  // amarração
    }
    s += peludo(membro(bF, 9, 6, -1, 14), 25, 1.2);
    const [mx, my] = bF[2];
    s += pele(forma([[mx - 6, my - 5], [mx + 3, my - 9], [mx + 9, my - 3], [mx + 7, my + 6], [mx - 4, my + 6]])) +
      P(goiva([mx - 2, my - 1], [mx + 7, my - 3], .7)) + P(goiva([mx - 2, my + 2.5], [mx + 7, my + 1], .7));
    if (o.maoAberta) {
      const [ax, ay] = bT[2];
      s += pele(forma([[ax - 2, ay - 5], [ax + 5, ay - 3], [ax + 6, ay + 4], [ax + 3, ay + 11], [ax, ay + 16], [ax - 3, ay + 15], [ax - 2, ay + 9],
        [ax - 5, ay + 17], [ax - 8, ay + 16], [ax - 7, ay + 9], [ax - 10, ay + 15], [ax - 13, ay + 13], [ax - 11, ay + 5], [ax - 9, ay - 2]], 3));
    }
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.e})">${s}</g>`;
  }

  // pegada do Curupira no chão (vista de cima, achatada): calcanhar para +x, dedos para −x
  const pegada = (x, y, e = 1) => B(forma([[16, 0], [14.5, 3.4], [10, 4.2], [3, 4.6], [-3, 5], [-7, 4], [-9, .5], [-8, -3.5], [-4, -5.6],
    [1, -4.8], [6, -2.6], [11, -3.2], [14.5, -2.6]].map(([u, v]) => [x + u * e, y + v * e * .8]), 4)) +
    [[-13, -4.6, 2.8, 2.4], [-14, -.6, 2, 1.7], [-13.4, 2.4, 1.8, 1.5], [-12.2, 4.8, 1.6, 1.4], [-10.4, 6.8, 1.3, 1.2]]
      .map(([u, v, rx, ry]) => `<ellipse fill="${PAPEL}" cx="${r1(x + u * e)}" cy="${r1(y + v * e * .8)}" rx="${r1(rx * e)}" ry="${r1(ry * e * .8)}"/>`).join('');
  // a mesma pegada em tinta preta, para chão claro: sola chapada e cinco dedos soltos, bem abertos (legível em tamanho real)
  const pegadaPreta = (x, y, e = 1, lado = 1) => P(forma([[16.5, 0], [15.6, 2.8], [13, 4.3], [9, 4.4], [5, 3.2], [1.5, 3.4], [-2.5, 5], [-6.5, 5.4], [-9.5, 3.6],
    [-10.5, .5], [-9.6, -3], [-6.5, -5.2], [-2.5, -5], [1.5, -3], [5, -1.4], [9, -3.6], [13, -4.3], [15.6, -2.8]].map(([u, v]) => [x + u * e, y + v * e * lado]), 4)) +
    [[-16.4, -4.6, 2.7, 2.2], [-17.6, -.2, 2.1, 1.8], [-16.8, 3.4, 1.9, 1.6], [-15, 6.6, 1.7, 1.4], [-12.4, 9.4, 1.4, 1.2]]
      .map(([u, v, rx, ry]) => `<ellipse fill="${TINTA}" cx="${r1(x + u * e)}" cy="${r1(y + v * e * lado)}" rx="${r1(rx * e)}" ry="${r1(ry * e)}"/>`).join('');
  // sol em cunha: disco chapado com uma goiva em crescente (volume, sem anéis) e raios triangulares longos e desiguais,
  // soltos do disco (nada de engrenagem: nenhum dente curto colado na borda)
  function solCunha(cx, cy, r, n, semente) {
    const rnd = sorteio(semente), p = (a, rr) => [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = i / n * 2 * Math.PI + (rnd() - .5) * .16, e = .07 + rnd() * .035;
      d += caminho([p(a - e, r * 1.22), p(a + (rnd() - .5) * .03, r * (1.75 + rnd() * .75)), p(a + e, r * 1.22)]);
    }
    let g = ''; // raios goivados dentro do disco, em cunha, desencontrados dos de fora
    for (let i = 0; i < n; i++) { const a = (i + .5) / n * 2 * Math.PI + (rnd() - .5) * .2; g += goiva(p(a, r * (.22 + rnd() * .1)), p(a, r * (.74 + rnd() * .12)), r * (.09 + rnd() * .04)); }
    return P(d) + P(forma(Array.from({ length: 14 }, (_, i) => p(i / 14 * 2 * Math.PI, r * (.97 + rnd() * .05))))) + B(g) + bola(cx, cy, r * .14);
  }
  // passarinho em voo (asa para cima ou para baixo)
  const passaro = (x, y, e = 1, asa = 1) => P(forma([[8, 0], [3, -1.6], [-2, -1.2], [-7, -3, 1], [-5.5, 0], [-7, 2.4, 1], [-2, 1.4], [3, 1.6]]
    .map(([u, v]) => [x + u * e, y + v * e]), 3)) + P(forma([[2.5, -1], [-1, -10 * asa, 1], [-3.5, -1]].map(([u, v]) => [x + u * e, y + v * e]), 3));

  /* ── as gravuras ── */
  const GRAVURAS = {
    mata(ctx) {
      let s = '';
      // o sol nasce à esquerda, atrás da mata, e se espelha no rio
      s += nascente(146, 208, 38);
      const r = sorteio(21), h = [[0, 216, 1]];
      for (let x = 0; x <= 440; x += 4) h.push([x, 201 + Math.sin(x * .045) * 3 + Math.sin(x * .17) * 2.5 - (r() < .35 ? 2 + r() * 4 : r() * 1.5)]);
      h.push([440, 216, 1]);
      s += P(caminho(h));
      for (const [x, a, c, e] of [[24, 34, -4, 1], [56, 46, 5, 1.1], [92, 28, 3, .8], [212, 40, -5, 1], [238, 26, 4, .8], [300, 50, 6, 1.15], [334, 36, -3, .9]])
        s += acai(x, 206, a, c, e, x);
      s += agua(214, 300, 5, [146, 34]);
      // açaí entrando pela direita
      s += P(traco([[446, 300], [428, 200], [404, 120], [392, 70]], afina(5, 3.4), 6));
      for (let i = 0; i < 7; i++) s += B(goiva([438 - i * 7.4, 276 - i * 30], [430 - i * 7.4, 272 - i * 30], .8));
      s += fronde([[392, 70], [360, 50], [324, 52], [300, 68]], 16, 22, .7, 2.4, 7) + fronde([[392, 70], [398, 40], [380, 14], [360, 8]], 12, 20, .5, 2.2, 8) +
        fronde([[392, 70], [420, 56], [440, 60]], 6, 18, .7, 2, 9) + fronde([[392, 72], [372, 96], [364, 128]], 9, 18, .2, 2, 10);
      // fronde pendendo do canto esquerdo
      s += fronde([[-4, 30], [30, 26], [58, 40], [72, 64]], 12, 18, .8, 2.2, 13);
      // as araras em arco, rumo ao sol
      s += arara(268, 120, .86, 1, 3) + arara(166, 78, .66, -1, 4);
      return s;
    },
    cacadores(ctx) {
      let s = '';
      s += sol(214, 50, 19, 16, 8) + passaro(118, 64, 1.9, 1) + passaro(150, 40, 1.5, -.9) + passaro(96, 34, 1.3, .9);
      // palmeira na direita
      s += P(traco([[452, 300], [430, 190], [414, 96], [410, 56]], afina(5, 3.2), 6)) +
        fronde([[410, 56], [384, 40], [356, 44], [338, 62]], 14, 18, .7, 2.2, 31) + fronde([[410, 56], [420, 28], [440, 16]], 8, 16, .5, 2, 32) +
        fronde([[410, 58], [392, 80], [384, 108]], 8, 15, .3, 1.8, 33) + fronde([[412, 58], [440, 64]], 4, 14, .8, 1.8, 34);
      s += chao(266, 17);
      // a veada prenhe, parada, de orelhas em pé
      s += veada(326, 268, 1.12);
      // o caçador escondido: chapéu acima da moita e o cano da espingarda apontado para ela
      s += chapeu(62, 146, 1.05);
      s += respiro(traco([[96, 181], [140, 179], [186, 176.5]], afina(1.9, 1.6), 3), 2.4) + P('M181 176.5l1-4.4h2.4l-.4 4.2Z');
      s += respiro(traco([[90, 184], [104, 182.5], [122, 181.5]], afina(3.6, 3), 3), 2.4);
      s += folha([10, 270], [120, 146], 15, -10, 41, 2.4) + folha([40, 272], [84, 126], 14, 6, 42, 2.4) + folha([-4, 250], [60, 140], 13, -4, 43, 2.4) +
        folha([60, 272], [150, 200], 13, -8, 44, 2.4) + folha([-6, 200], [34, 120], 11, 4, 45, 2.4) + folha([20, 270], [110, 180], 12, 6, 46, 2.4);
      return s;
    },
    rastros(ctx) {
      let s = '';
      // fim de tarde: o rastro vem até nós com os dedos apontando para cá; quem o fez vai embora lá no fundo
      s += nascente(346, 140, 34, 13, 9);
      const r = sorteio(41), h = [[0, 150, 1]];
      for (let x = 0; x <= 440; x += 4) h.push([x, 138 + Math.sin(x * .05) * 2.5 - (r() < .35 ? 2 + r() * 4 : r() * 1.5)]);
      h.push([440, 150, 1]);
      s += P(caminho(h)) + acai(28, 142, 56, 4, 1.2, 3) + acai(62, 142, 36, -3, .85, 4) + acai(408, 142, 64, -5, 1.25, 5) + acai(380, 142, 32, 3, .8, 6);
      s += P('M0 146H440V300H0Z');
      let chao = '';
      for (let i = 0; i < 70; i++) {
        const y = 152 + (r() ** 1.6) * 140, x = r() * 440, L = 3 + (y - 140) / 14;
        if (Math.abs(x - 220 - (y - 150) * .1) < 30 + (y - 150) * .45) continue;
        chao += goiva([x, y], [x - L * .3, y - L], .55 + (y - 140) / 300) + goiva([x + 1, y], [x + L * .4, y - L * .9], .5 + (y - 140) / 320);
      }
      s += B(chao);
      for (const [x, y, e] of [[242, 268, 2.8], [196, 228, 2.12], [236, 196, 1.6], [206, 174, 1.2], [229, 159, .9], [212, 150, .66]])
        s += `<g transform="translate(${x} ${y}) scale(1 .62) rotate(${x > 222 ? -97 : -83})">${pegada(0, 0, e)}</g>`;
      s += curupira(ctx, {
        x: 248, y: 148, e: .34, maoAberta: true,
        bF: [[6, -136], [26, -110], [40, -96]], bT: [[-10, -134], [-30, -108], [-44, -84]],
        pF: [[8, -82], [26, -48], [16, -16]], pT: [[-8, -82], [-16, -46], [-36, -16]],
      });
      return s;
    },
    noite(ctx) {
      let s = P('M0 0H440V300H0Z');
      s += lua(78, 62, 24, 5);
      for (const [x, y, t] of [[150, 28, 3], [198, 70, 2.4], [252, 30, 2.8], [28, 130, 2.2], [130, 120, 2], [404, 26, 2.6], [228, 110, 1.8]]) s += estrela(x, y, t);
      // toco quebrado e o urutau na ponta, imóvel como galho
      const r = sorteio(51);
      const toco = forma([[300, 300, 1], [306, 250], [312, 200], [310, 178, 1], [318, 184], [322, 172, 1], [330, 182], [338, 174, 1], [342, 190],
        [344, 216], [362, 204, 1], [366, 210], [348, 232], [356, 300, 1]], 4);
      let casca = '';
      for (let u = 310; u < 350; u += 7 + r() * 3) casca += B(traco([[u, 296], [u + 2, 256], [u - 1, 220], [u + 1, 196 + r() * 10]], fuso(1.2), 4));
      s += peca(ctx, toco, casca, 3) + urutau(ctx, 327, 180, 1.7);
      // a fila de vaga-lumes subindo para o alto
      const c = curva([[150, 222], [166, 196], [196, 178], [228, 166], [248, 138], [236, 106], [254, 80]], 3);
      c.forEach(([x, y], i) => { s += vagalume(x + Math.sin(i * 2.3) * 8, y + Math.cos(i * 1.7) * 7, i % 4 === 0 ? 3.2 : i % 3 === 0 ? 2.4 : 1.6); });
      // folhas largas contornadas de branco e capim; os caçadores atrás da luz, como sonâmbulos
      s += folha([420, 304], [446, 214], 12, 4, 63, 2.6) + folha([-10, 230], [26, 160], 11, 6, 61, 2.6);
      s += sonambulo(44, 290, .86, true) + sonambulo(104, 286, .88, false);
      for (let x = 8; x < 300; x += 5 + r() * 6) s += B(goiva([x, 296], [x + (r() - .5) * 8, 284 - r() * 10], .8, (r() - .5) * 3));
      return s;
    },
    vo(ctx) {
      let s = '';
      // beiral de sapê no alto
      const r = sorteio(71), beira = [[0, 0, 1], [440, 0, 1]];
      for (let x = 440; x >= 0; x -= 5) beira.push([x, 30 + r() * 8 + (x / 5 % 2) * 5]);
      let palha = '';
      for (let x = 4; x < 440; x += 4 + r() * 3) palha += goiva([x, 6 + r() * 6], [x - 3, 28 + r() * 8], .7);
      s += P(caminho(beira)) + B(palha);
      // janela escura com o candeeiro aceso, postigo aberto
      s += P('M290 70H392V172H290Z');
      let raios = '';
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI * (.98 + i / 12 * 1.04), L = i % 2 ? 24 : 36;
        raios += goiva([340 + Math.cos(a) * 15, 128 + Math.sin(a) * 16], [340 + Math.cos(a) * L, 128 + Math.sin(a) * L * .9], 1);
      }
      s += B(raios) + B(forma([[340, 112], [346, 125], [344, 138], [336, 138], [334, 125]], 4)) + P(goiva([340, 122], [340, 135], 1.1));
      s += respiro(forma([[324, 164], [326, 152], [334, 146], [346, 146], [354, 152], [356, 164]], 4), 2.2) + respiro(goiva([352, 151], [366, 145], 1.8), 2) +
        respiro(goiva([340, 146], [340, 139], 1), 1.6) + B(goiva([330, 156], [350, 156], .7, 1));
      s += P('M284 164H398V176H284Z') + B('M290 70H392V74H290Z');
      s += P('M398 66L428 56V188L398 178Z') + B(goiva([406, 70], [406, 176], .8) + goiva([415, 66], [415, 180], .8) + goiva([423, 62], [423, 183], .7));
      // parede caiada com barrado em hachura; chão de terra batida
      let barra = '';
      for (let y = 222; y < 262; y += 4.5) barra += goiva([4 + r() * 6, y + (r() - .5)], [436 - r() * 6, y + (r() - .5)], .7 + (y - 222) / 90, (r() - .5) * 2);
      s += P(barra) + P(traco([[0, 218], [110, 216], [220, 219], [330, 216], [440, 218]], () => .9, 4));
      let terra = P(traco([[0, 266], [220, 263], [440, 266]], () => 1.1, 4));
      for (let i = 0; i < 46; i++) { const x = r() * 440, y = 272 + r() * 20; terra += P(goiva([x, y], [x + 4 + r() * 8, y + (r() - .5)], .7)); }
      for (let i = 0; i < 28; i++) { const x = r() * 440, y = 226 + r() * 34; terra += P(goiva([x, y], [x + 3 + r() * 6, y + (r() - .5)], .5)); }
      s += terra;
      s += vo(ctx, 112, 266, 1.42);
      s += cipoSolto([[178, 186], [194, 214], [204, 246], [212, 268], [236, 276], [262, 271], [252, 283], [226, 287], [248, 292], [292, 288], [322, 279]], 9, P);
      return s;
    },
    aurora(ctx) {
      let s = '';
      // a aurora nasce à esquerda; a vara passa no alto do barranco, recortada contra o céu
      s += nascente(80, 226, 50, 11, 13, Math.PI * 1.02, Math.PI * 1.74);
      s += ipe(406, 228, 17);
      s += chao(224, 29);
      s += queixada(ctx, 156, 222, .7, 3) + queixada(ctx, 216, 222, .92, 4);
      s += queixada(ctx, 300, 222, 1.36, 5);
      s += curupira(ctx, {
        x: 289, y: 185, e: .58, colar: true,
        bF: [[6, -136], [26, -112], [44, -108]], bT: [[-10, -134], [-24, -110], [-20, -90]],
        pF: [[8, -82], [34, -64], [26, -24]], pT: null,
      });
      return s;
    },
    abertura(ctx) {
      let s = '';
      // a samaúma, morada do Curupira: galhos abertos em guarda-chuva, tufos de folha, sapopemas em lâmina
      const r = sorteio(81);
      const galhos = [[[220, 124], [204, 100], [150, 86], [64, 80], [24, 86]], [[220, 120], [210, 92], [176, 64], [120, 44]], [[220, 118], [222, 84], [212, 52], [214, 26]],
        [[222, 118], [236, 88], [280, 62], [324, 46]], [[222, 122], [240, 98], [304, 86], [388, 80], [424, 88]]];
      s += P(galhos.map(g => traco(g, afina(8, 1.6), 6)).join(''));
      const borda = [];
      for (let x = 14; x <= 426; x += 7) borda.push([x, 78 - 58 * Math.sin(Math.PI * (x - 14) / 412) ** .55 + (r() - .5) * 9 - (x / 7 % 3 ? 0 : 4)]);
      for (let x = 426; x >= 14; x -= 9) borda.push([x, 86 + (r() - .5) * 10 + (r() < .2 ? 10 : 0) - Math.sin(Math.PI * (x - 14) / 412) * 12]);
      let folhas = '';
      for (let i = 0; i < 230; i++) {
        const x = 24 + r() * 392, y = 18 + r() * 70, a = Math.PI / 2 + (x - 220) / 300 + (r() - .5) * .9;
        folhas += goiva([x, y], [x + Math.cos(a) * 6, y + Math.sin(a) * 6], 1.2);
      }
      s += P(caminho(contorno(borda, 2)));
      const furos = [[70, 70, 9, 6], [128, 52, 10, 6], [300, 52, 11, 6], [360, 66, 9, 5], [252, 34, 8, 5], [176, 78, 7, 4]];
      s += `<clipPath id="xc-${ctx.id}-copa">${P(caminho(contorno(borda, 2)))}</clipPath><g clip-path="url(#xc-${ctx.id}-copa)">${B(folhas)}</g>`;
      s += B(furos.map(([x, y, w, h]) => forma([[x - w, y], [x - w * .3, y - h], [x + w, y - h * .4], [x + w * .6, y + h * .6], [x - w * .2, y + h]], 3)).join(''));
      s += B(galhos.map(g => traco(g.slice(1), afina(2.2, .4), 6)).join(''));
      for (const [x, y, L, sem] of [[54, 88, 70, 1], [92, 90, 104, 2], [392, 88, 46, 3], [412, 86, 72, 4]])
        s += cipoSolto([[x, y], [x + 4, y + L * .35], [x - 3, y + L * .7], [x + 2, y + L]], sem, P);
      s += P(forma([[204, 96, 1], [238, 96, 1], [240, 160], [250, 200], [292, 238], [352, 266, 1], [88, 266, 1], [150, 236], [190, 200], [200, 160]], 5));
      let casca = '';
      for (let x = 208; x < 236; x += 7 + r() * 2) casca += B(traco([[x, 104], [x + 2, 130], [x - 1, 166], [x + 1, 192]], fuso(1.3), 4));
      s += casca + B(traco([[204, 200], [176, 232], [126, 266]], fuso(2.2), 4) + traco([[236, 200], [266, 232], [318, 266]], fuso(2.2), 4) +
        traco([[214, 210], [206, 240], [196, 266]], fuso(1.8), 4) + traco([[228, 212], [240, 240], [252, 266]], fuso(1.8), 4));
      s += B(forma([[212, 266], [210, 246], [217, 230], [224, 244], [228, 266]], 4)) + P(forma([[216, 266], [214, 250], [218, 240], [222, 252], [224, 266]], 4));
      s += chao(264, 37);
      // trilha de chão batido, clara, atrás dele; nela o par de pegadas viradas em preto: o calcanhar aponta para onde ele
      // anda (+x) e os cinco dedos, bem separados, ficam para trás
      s += B(forma([[140, 280], [168, 271], [214, 270], [262, 273], [306, 271], [326, 278], [318, 292], [270, 296], [214, 297], [160, 295]], 4));
      s += pegadaPreta(194, 287, 2.3, -1) + pegadaPreta(268, 281, 2.3);
      // sol de xilogravura no alto, na quina da copa: disco chapado e raios em cunha, longos e desiguais, com respiro branco
      s += `<g stroke="${PAPEL}" stroke-width="3.4" stroke-linejoin="round" paint-order="stroke">${solCunha(376, 62, 36, 13, 5)}</g>`;
      s += curupira(ctx, {
        x: 334, y: 268, e: .5, machado: true, maoAberta: true,
        bF: [[6, -136], [34, -112], [52, -140]], bT: [[-10, -134], [-30, -108], [-44, -84]],
        pF: [[8, -82], [26, -48], [16, -16]], pT: [[-8, -82], [-16, -46], [-36, -16]],
      });
      s += arara(92, 150, .4, 1, 5) + arara(48, 176, .32, -1, 6);
      return s;
    },
    guardiao(ctx) {
      let s = '';
      // samaúma na beira esquerda: tronco com casca goivada e sapopemas em lâmina
      const r = sorteio(9);
      s += P(forma([[0, 0, 1], [52, 0, 1], [50, 90], [54, 150], [70, 200], [96, 240], [126, 268, 1], [0, 268, 1]], 5));
      let casca = '';
      for (let x = 9; x < 48; x += 10 + r() * 3)
        casca += B(traco([[x, 2], [x + 3, 40 + r() * 20], [x - 2, 90 + r() * 20], [x + 1, 140]], fuso(1.5)));
      s += casca + B(traco([[40, 150], [58, 196], [86, 236], [112, 268]], fuso(2.2))) + B(traco([[26, 162], [36, 210], [52, 268]], fuso(2)));
      s += sol(388, 56, 21);
      // helicônia na direita
      s += folha([446, 300], [356, 192], 19, -12, 4) + folha([432, 304], [414, 170], 15, 8, 5);
      s += chao(268, 7);
      for (const [x, y] of [[118, 284], [180, 281]]) s += pegada(x, y, 1.7);
      s += curupira(ctx, {
        x: 250, y: 270, e: 1, machado: true, maoAberta: true,
        bF: [[6, -136], [34, -112], [52, -140]], bT: [[-10, -134], [-30, -108], [-44, -84]],
        pF: [[8, -82], [26, -48], [16, -16]], pT: [[-8, -82], [-16, -46], [-36, -16]],
      });
      return s;
    },
  };

  const filtro = (id, semente) => `<filter id="xf-${id}" x="0" y="0" width="440" height="300" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="${semente}" result="r"/>
    <feDisplacementMap in="SourceGraphic" in2="r" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency=".015 .45" numOctaves="2" seed="${semente + 1}" result="veio"/>
    <feColorMatrix in="veio" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -20 0 0 0 16.4" result="falhas"/>
    <feComposite in="d" in2="falhas" operator="in"/></filter>`;

  S.xilogravura = (cenaId, luz) => {
    const desenho = GRAVURAS[cenaId];
    if (!desenho) return '';
    const ctx = { id: cenaId, n: 0 }, corpo = desenho(ctx, luz);
    return `<svg class="xilo" viewBox="0 0 440 300" aria-hidden="true"><defs>${filtro(cenaId, cenaId.length * 7)}</defs>` +
      `<g filter="url(#xf-${cenaId})" fill="${TINTA}"><rect width="440" height="300" fill="${PAPEL}"/>${corpo}` +
      `<path fill-rule="evenodd" d="M0 0H440V300H0ZM6 6V294H434V6Z"/></g>` +
      '<rect width="440" height="300" filter="url(#f-papel)" opacity=".35"/></svg>';
  };
})();
