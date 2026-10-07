/* cenarios.js — Sombras.cenarios: o cenário de cada cena. Silhuetas de couro recortado pintadas com a tinta do
 * estado de luz (camadas L5…L0, opacidade e desfoque de profundidade), peças animáveis e objetos de cena em couro
 * tingido (Sombras.bonecos.criar: mesmo acabamento dos bonecos). Guia: estilo.md §3.3, §8; roteiro.json "visual".
 *
 *   const cen = c.possuir(Sombras.cenarios.mata(c.palco))   (kit: só aparece e só é atualizado durante a cena;
 *                sem o kit: palco.adicionar(cen)). Um construtor por cena: abertura mata guardiao cacadores aviso
 *                rastros noite vo novelo aurora encerramento. A aurora traz também cen.rancho (porta do rancho, de
 *                manhã) e cen.beira (beira da mata, de dia): possua os três e troque com estado.visivel (0/1)
 *                nas folhas que passam (K.folha); rancho e beira começam com visivel 0.
 *   cen.estado  NÚMEROS para o GSAP/kit: visivel 0..1 · vento (balanço das camadas e frondes: 0 parado, 1 brisa,
 *               4 tempestade) · agito (toda a folhagem se mexe junto, sem vento) · desfoque (px, tudo) ·
 *               camadas.{L5 L4 L3 L2 rastros bonecos brilho L1 L0}: {y, o, b (desfoque px), sacode (px de tremor)}
 *   cen.pecas.X peças animáveis. Silhueta: .estado {x, y (deslocamentos a partir do lugar de repouso), rot, escala,
 *               o, tremor (0..1 vibra)} + extras de cada peça (comentário do construtor); pivô em .pivo.
 *               Couro tingido: ator de Sombras.bonecos (anime .pose). As que só entram no meio da cena começam
 *               invisíveis (estado.o = 0 / pose.opacidade = 0).
 *   cen.pontos.X [x, y] no palco (câmera em 0): onde pisar, sentar, subir, bater, beber…
 *   Deslizar: K.camera (palco.camera.x). Os panoramas (cacadores, aviso, rastros) repetem a mata sem fim; as peças
 *   "fixas" (rastros) não andam com a câmera: a coreografia as traz de volta pelo estado.x.
 *   Sombras.cenarios.objetos.X(pose)   objeto avulso de couro (pena, fumo, machado, espingarda, coronha, cano) para
 *                c.possuir; Sombras.cenarios.CHAO = 802 (= Sombras.kit.CHAO).
 *   Verificação: producao/prototipo/cenarios.html?teste=1 (título "teste ok"); ?cena=id mostra um cenário.
 *
 * CATÁLOGO (peças · extras do estado/pose · pontos)
 *   abertura   serra, serraL5 (camadas.L4/L5.y: a serra sobe e afunda) · oferendas (pose.o.flecha1…3, abanador) ·
 *              penaA, penaB (balançam com o vento; sobem como brasas) · carta {abrir 0..1; y -900 → 0} · penaEscrever {y} ·
 *              vareta {x, y = ponta, ang, o} · sombrinha (L4) — pontos.serra.cume
 *   mata       samauma · riacho · buritis (L3: a onça passa atrás) — pontos.samauma.{galho (bugio), toca (tatu), oco}, veada
 *   guardiao   samauma · tronco (ergue e arremessa) · moita {tremor} · bromelia, bromeliaFlor · machado (cravar) ·
 *              feixe · redemoinho, sopro (folhas) — pontos.bromelia, tronco, moita, samauma.bater/sapopema
 *   cacadores  samauma · riacho · buritis · embauba {golpes, range, queda} · olhos, sombra (L3, entre os buritis) · pena · folhas
 *   aviso      a mesma beira (embauba caída) + barranco (L3) · sombraGigante (L4: cresce com escala) · galho
 *   rastros    embauba (caída, fixa) {escuro} · toco (urutau: pontos.toco.poleiro) · samauma (fixa) · espingarda, coronha,
 *              cano · rastroQueixada · sombrinha (L3) · revoada (L4: a falsa Vó se desfaz)
 *   noite      samauma · vagalumes {acesos, avanco, pisca, o} · nuvens · pano {y} · treme5, treme3 {tremor} · galho · coronha, cano
 *   vo         rancho {luz}, ranchoGel, ranchoFundo · fumaca · lembranca · novelo · fumo — pontos.rancho.{banquinho, porta, pilao}
 *   novelo     samauma · cipo (Zé arranca) · folhaLarga (couro) · novelo · fumo · pena · gotas
 *   aurora     samauma · ipe {pose.flores 0..1}, ipeArvore · riacho · barranco (pontos.barranco.topo(x)) · gotas · vagalumes (batedores da vara);
 *              .rancho (fumaca, rancho) e .beira (galhoSabia, roca; pontos.saidaDaMata)
 *   encerramento  samaumaLonge {tremor} · sombrinha (L4) — pontos.centro
 *   Peças de uso geral: samauma {frente, oco, olhos, tremor} · novelo {x, y, enrolado, desenrolado, fio, escala, o} ·
 *   folhas/redemoinho/sopro/revoada {x, y, p, raio, giro, dx, dy, queda, o} · olhos {o, piscar} · fumaca, gotas {o}.
 */
(function () {
  'use strict';
  const S = window.Sombras = window.Sombras || {};
  const W = 1920, H = 1080, M = 240, PI = Math.PI, TAU = 2 * PI, CHAO = 802, NS = 'http://www.w3.org/2000/svg';
  const CAMADAS = ['L5', 'L4', 'L3', 'L2', 'rastros', 'bonecos', 'brilho', 'L1', 'L0'];
  const BAL = { L5: [.06, .07, 0], L4: [.12, .09, 1.3], L3: [.24, .12, 2.6], L2: [.07, .15, 3.4], L1: [.28, .19, 4.4] }; // graus, Hz, fase
  const PROF = n => S.cenario.PROFUNDIDADE[n] || S.cenario.PROFUNDIDADE.L2;
  const geo = () => S.cenario.geometria, pc = () => S.cenario.pecas, COR = () => S.bonecos.COR;
  const R1 = v => Math.round(v * 10) / 10, lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), mod = (a, b) => ((a % b) + b) % b;
  const it = (d, o) => (o == null ? { d } : { d, o }), its = a => a.map(d => (typeof d === 'string' ? { d } : d));
  const ds = a => a.map(x => (typeof x === 'string' ? x : x.d));
  const poli = (p, furo) => geo().poli(p, furo), bez = (a, b, c, n) => geo().bez(a, b, c, n);

  // ---------- geometria ----------
  function cr(P, n, fechado) { // Catmull-Rom que passa pelos pontos
    const o = [], N = P.length, at = i => P[fechado ? mod(i, N) : clamp(i, 0, N - 1)];
    for (let i = 0; i < (fechado ? N : N - 1); i++) {
      const a = at(i - 1), b = at(i), c = at(i + 1), d = at(i + 2);
      for (let j = 0; j < n; j++) {
        const t = j / n, t2 = t * t, t3 = t2 * t;
        o.push([0, 1].map(k => .5 * (2 * b[k] + (c[k] - a[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * t3)));
      }
    }
    if (!fechado) o.push(P[N - 1].slice());
    return o;
  }
  function fitaP(cs, w) { // contorno de uma faixa ao longo de cs; w(u) = largura total
    const e = [], d = [], n = cs.length;
    for (let i = 0; i < n; i++) {
      const a = cs[Math.max(0, i - 1)], b = cs[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const h = (typeof w === 'function' ? w(n > 1 ? i / (n - 1) : 0) : w) / 2;
      e.push([cs[i][0] - dy * h, cs[i][1] + dx * h]); d.push([cs[i][0] + dy * h, cs[i][1] - dx * h]);
    }
    return e.concat(d.reverse());
  }
  const fita = (cs, w) => poli(fitaP(cs, w)), fenda = (cs, w) => poli(fitaP(cs, w), true);
  const mat = (x, y, a, sx, sy) => { const c = Math.cos(a), s = Math.sin(a); sy = sy == null ? sx : sy; return [c * sx, s * sx, -s * sy, c * sy, x, y]; };
  const apl = (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
  const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const mapa = (pts, m) => pts.map(p => apl(m, p));
  function transD(d, m) { // aplica a matriz a um path absoluto feito só de M/L/C/Q/Z
    if (/[^MLCQZ\d\s.,-]/.test(d)) return '';
    let i = 0, x = 0;
    return d.replace(/-?(?:\d+\.?\d*|\.\d+)/g, v => { if (i++ % 2 === 0) { x = +v; return '#'; } const p = apl(m, [x, +v]); return R1(p[0]) + ' ' + R1(p[1]); }).replace(/#[\s,]*/g, '');
  }
  function oval(c, rx, ry, a, n) {
    const o = [];
    for (let i = 0; i < (n || 10); i++) { const t = i / (n || 10) * TAU; o.push(apl(mat(c[0], c[1], a || 0, 1), [Math.cos(t) * rx, Math.sin(t) * ry])); }
    return o;
  }
  function curvar(pts, k) { // dobra o eixo x local num arco (k > 0: a ponta cai para +y local)
    if (Math.abs(k) < 1e-4) return pts;
    const R = 1 / k;
    return pts.map(([x, y]) => [(R - y) * Math.sin(x * k), R - (R - y) * Math.cos(x * k)]);
  }
  function raio(o, d, a, b) {
    const ex = b[0] - a[0], ey = b[1] - a[1], den = d[0] * ey - d[1] * ex;
    if (Math.abs(den) < 1e-12) return null;
    const ax = a[0] - o[0], ay = a[1] - o[1], t = (ax * ey - ay * ex) / den, s = (ax * d[1] - ay * d[0]) / den;
    return t > 1e-6 && s >= 0 && s <= 1 ? { t, s } : null;
  }
  function alvo(cont, o, d) {
    let m = null;
    for (let i = 0; i < cont.length; i++) { const h = raio(o, d, cont[i], cont[(i + 1) % cont.length]); if (h && (!m || h.t < m.t)) m = { t: h.t, s: h.s, i }; }
    return m;
  }
  // entalhes da margem para dentro (fendas da costela-de-adão, rasgos da bananeira): {o, d (unitário, para fora), prof, larg}
  function recortar(cont, cortes) {
    const ins = [], d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
    for (const c of cortes) {
      const h = alvo(cont, c.o, c.d); if (!h) continue;
      const [dx, dy] = c.d, px = -dy, py = dx, B = [c.o[0] + dx * h.t, c.o[1] + dy * h.t], len = h.t * c.prof;
      const E = [B[0] - dx * len, B[1] - dy * len], w0 = c.larg / 2, w1 = c.larg * .16, m = w0 * 1.2;
      const A = [[B[0] + px * w0 - dx * m, B[1] + py * w0 - dy * m], [E[0] + px * w1, E[1] + py * w1], [E[0] - dx * w1 * 1.6, E[1] - dy * w1 * 1.6],
        [E[0] - px * w1, E[1] - py * w1], [B[0] - px * w0 - dx * m, B[1] - py * w0 - dy * m]];
      if (d2(A[0], cont[h.i]) > d2(A[4], cont[h.i])) A.reverse();
      ins.push({ i: h.i, s: h.s, A });
    }
    ins.sort((p, q) => q.i - p.i || q.s - p.s);
    const out = cont.slice();
    for (const x of ins) out.splice(x.i + 1, 0, ...x.A);
    return out;
  }

  // ---------- folhas recortadas (nervura em +x local, base em 0, ponta em 1) ----------
  const CHAVES = {
    costela: [[.03, 0], [-.02, -.1], [-.09, -.25], [-.06, -.39], [.08, -.48], [.3, -.51], [.52, -.46], [.72, -.34], [.88, -.17]],
    banana: [[-.01, 0], [.05, -.07], [.18, -.14], [.42, -.165], [.68, -.15], [.86, -.1], [.96, -.035]],
    coracao: [[.07, 0], [-.01, -.13], [.02, -.3], [.17, -.4], [.4, -.37], [.64, -.26], [.85, -.11]],
  };
  function folha(r, tipo, m, op) { // → path (contorno + furos invertidos), m: matriz local → palco
    op = op || {};
    const ch = CHAVES[tipo], j = op.jit == null ? .02 : op.jit;
    const lado = s => ch.map(([x, y]) => [x + (r() - .5) * j, s * y * (1 + (r() - .5) * j * 4)]);
    const sup = lado(1), inf = lado(-1).reverse();
    let cont = cr([...sup, [1, 0], ...inf.slice(0, -1)], 4, true);
    const cortes = [], furos = [];
    if (tipo === 'costela') { // fendas finas da margem até 1/3 da nervura, furos ovais alongados em fileira
      for (const s of [-1, 1]) {
        const K = 5 + (r() * 3 | 0);
        for (let k = 0; k < K; k++) {
          const xm = .1 + .72 * (k + .5 + (r() - .5) * .4) / K, phi = .45 + .5 * xm, d = [Math.sin(phi), s * Math.cos(phi)], o = [xm, 0];
          const h = alvo(cont, o, d); if (!h) continue;
          if (r() < .9) cortes.push({ o, d, prof: (op.prof || .52) + r() * .14, larg: (op.larg || .013) + r() * .009 }); // op.prof/op.larg: fendas mais fundas e abertas
          if (k > 0 && r() < .75) { const t = h.t * (.2 + r() * .08); furos.push(oval([o[0] + d[0] * t, o[1] + d[1] * t], h.t * (.07 + r() * .03) * (op.furo || 1), (.011 + r() * .005) * (op.furo || 1), Math.atan2(d[1], d[0]))); }
        }
      }
      furos.push(fitaP([[.14, 0], [.45, 0], [.78, 0]], .006));
    } else if (tipo === 'banana') {
      const n = op.rasgos == null ? 2 + (r() * 5 | 0) : op.rasgos;
      for (let k = 0; k < n; k++) {
        const s = r() < .5 ? -1 : 1, phi = .14 + r() * .22;
        cortes.push({ o: [.1 + r() * .8, 0], d: [Math.sin(phi), s * Math.cos(phi)], prof: .55 + r() * .4, larg: .006 + r() * .01 });
      }
      if (op.nervura) furos.push(fitaP([[.06, 0], [.5, 0], [.92, 0]], .0055));
    }
    cont = recortar(cont, cortes);
    const k = op.curva || 0, mp = pts => mapa(curvar(pts, k), m);
    return poli(mp(cont)) + furos.map(f => poli(mp(f), true)).join('');
  }
  // folha da embaúba: estrela palmada de 7 a 9 lobos, vista de lado (achat) e pendendo (cai)
  function folhaEmbauba(r, c, R, ang, achat, cai, nervuras) {
    let d = '';
    const n = 7 + (r() * 3 | 0);
    for (let i = 0; i < n; i++) {
      const a = ang + i / n * TAU + (r() - .5) * .3, L = R * (.74 + r() * .26), cs = [];
      for (let k = 0; k <= 8; k++) { const u = k / 8; cs.push([c[0] + Math.cos(a) * L * u, c[1] + Math.sin(a) * L * u * achat + cai * L * u * u]); }
      d += fita(cs, u => 2 * R * .12 * Math.pow(Math.sin(PI * Math.min(1, u * 1.04 + .05)), .5));
      if (nervuras && L > 18) d += fenda(cs.slice(4, 8), 1.2);
    }
    return d + geo().circ(c[0], c[1], R * .12, R * .12 * Math.max(.45, achat), 8);
  }

  // ---------- flora própria (a genérica vem de Sombras.cenario.pecas) ----------
  function horizonte(r, x0, x1, base, alto) { // dossel contínuo de copas (borda irregular, sem círculos)
    const f = [r() * 9, r() * 9, r() * 9, r() * 9], pts = [[x0, H]];
    for (let x = x0; x <= x1; x += 6) pts.push([x, base - alto * (.55 + .18 * Math.sin(x * .0031 + f[0]) + .12 * Math.sin(x * .0087 + f[1])) -
      12 * Math.abs(Math.sin(x * .041 + f[2])) - 5 * Math.abs(Math.sin(x * .12 + f[3]))]);
    pts.push([x1, H]);
    return poli(pts);
  }
  // samaúma emergente ao longe: tronco reto altíssimo acima do dossel, galhos longos e copa larga em domo
  function emergente(r, x, y, alt, s) {
    const o = [], top = [x + (r() - .5) * 14 * s, y - alt], larg = alt * (.56 + r() * .14), hc = alt * .17;
    o.push(fita([[x, y + 4], [x + (r() - .5) * 8 * s, y - alt * .5], top], u => (30 - 14 * u) * s));
    const n = 4 + (r() * 3 | 0);
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1) - .5, p = [top[0] + k * larg, top[1] - hc * .3 - (1 - Math.abs(k * 2)) * hc * .35];
      o.push(fita(bez([top[0], top[1] + 12 * s], [top[0] + k * larg * .45, top[1] - hc * .12], p, 8), u => (13 - 8 * u) * s));
    }
    const pts = [];
    for (let i = 0; i <= 54; i++) { const u = i / 54, a = PI + u * PI, b = 1 + .09 * Math.abs(Math.sin(u * 33 + x)) + .05 * r(); pts.push([top[0] + Math.cos(a) * larg * .62 * b, top[1] - hc * .4 + Math.sin(a) * hc * 1.25 * b]); }
    for (let i = 54; i >= 0; i--) { const u = i / 54; pts.push([top[0] - larg * .62 + u * larg * 1.24, top[1] - hc * .25 + hc * .18 * Math.abs(Math.sin(u * 17 + x)) + (r() < .2 ? hc * .3 * r() : 0)]); }
    // (o domo acima só consome o sorteio, para o resto da mata não mudar) copa de emergente amazônica: massas desiguais e
    // assimétricas, borda recortada, sem base reta (nada de guarda-chuva de savana); raio do centro à borda mais distante
    const q = S.rng(Math.round(Math.abs(x) * 13) + 5), c0 = [top[0], top[1] - hc * .45], ms = [];
    for (let i = 0; i < 6; i++) {
      const k = i / 5 - .5;
      ms.push([top[0] + k * larg * (.9 + q() * .3) + (q() - .5) * 20 * s, top[1] - hc * (.1 + q() * .8) - (1 - Math.abs(2 * k)) * hc * .3, larg * (.11 + q() * .13), hc * (.36 + q() * .42)]);
    }
    const cop = [];
    for (let i = 0; i < 96; i++) {
      const a = i / 96 * TAU, dx = Math.cos(a), dy = Math.sin(a);
      let R = hc * .3;
      for (const [ex, ey, rx, ry] of ms) {
        const ox = (c0[0] - ex) / rx, oy = (c0[1] - ey) / ry, vx = dx / rx, vy = dy / ry, A = vx * vx + vy * vy, B = ox * vx + oy * vy, D = B * B - A * (ox * ox + oy * oy - 1);
        if (D > 0) R = Math.max(R, (-B + Math.sqrt(D)) / A);
      }
      R *= 1 + .07 * Math.abs(Math.sin(a * 23 + x)) - (q() < .14 ? .1 : 0);
      cop.push([c0[0] + dx * R, c0[1] + dy * R]);
    }
    o.push(poli(cop));
    return its(o);
  }
  // buriti: estipe liso; copa em fonte (leques cujos segmentos caem nas pontas, nada de leque aberto); saia seca
  function buriti(r, x, y, alt, s, detalhe) {
    const o = [], lean = (r() - .5) * 26 * s, top = [x + lean, y - alt], ns = detalhe ? 26 : 14;
    o.push(fita(bez([x, y + 4], [x + lean * .3, y - alt * .5], top, 12), u => (17 - 5 * u + (u < .04 ? 8 : 0)) * s));
    for (let i = 0; i < 4; i++) {
      const a = (i - 1.5) * .4, L = (70 + r() * 50) * s;
      o.push(fita(bez(top, [top[0] + a * 30 * s, top[1] + 14 * s], [top[0] + a * 46 * s, top[1] + L], 8), u => (11 - 7 * u) * s));
    }
    const nf = 7 + (r() * 4 | 0);
    for (let i = 0; i < nf; i++) {
      const ang = -PI / 2 + (i / (nf - 1) - .5) * 2.9 + (r() - .5) * .25, Pd = (34 + r() * 26) * s;
      const c = [top[0] + Math.cos(ang) * Pd, top[1] + Math.sin(ang) * Pd * .8 - 6 * s];
      o.push(fita([top, [lerp(top[0], c[0], .5), lerp(top[1], c[1], .5) - 6 * s], c], u => (5 - 2 * u) * s));
      const R = (62 + r() * 26) * s;
      for (let j = 0; j < ns; j++) {
        const k = j / (ns - 1) - .5, a = ang + k * 2.5 + (r() - .5) * .06, cai = .5 + Math.abs(k) * .9, cs = [c];
        for (let q = 1; q <= 5; q++) { const u = q / 5; cs.push([c[0] + Math.cos(a) * R * u, c[1] + Math.sin(a) * R * u + R * cai * u * u * .6]); }
        o.push(fita(cs, u => (detalhe ? 4.4 : 5.6) * s * Math.pow(Math.sin(PI * clamp(u * .85 + .12, 0, 1)), .5)));
      }
    }
    if (detalhe) for (let c = 0; c < 2; c++) { // cachos de frutos pendentes
      const p0 = [top[0] + (c ? 12 : -14) * s, top[1] + 10 * s], p1 = [p0[0] + (c ? 10 : -12) * s, p0[1] + 70 * s];
      o.push(fita([p0, p1], 2.4 * s));
      for (let q = 0; q < 9; q++) o.push(geo().circ(lerp(p0[0], p1[0], .35 + q * .07) + (q % 2 ? 4 : -4) * s, lerp(p0[1], p1[1], .35 + q * .07), 3.4 * s, 4 * s, 7));
    }
    return its(o);
  }
  function coluna(r, x, y, s, w) { // tronco liso da mata média que sai pelo alto, base alargada, toco de galho
    const o = [], cs = [];
    w = (w || 38 + r() * 30) * s;
    for (let k = 0; k <= 12; k++) { const u = k / 12; cs.push([x + Math.sin(u * 3 + x) * 5 * s + u * u * (r() - .5) * 24 * s, y + 4 - u * (y + 90)]); }
    o.push(fita(cs, u => w * (1.2 - .35 * u) + (u < .07 ? w * 1.3 * (1 - u / .07) ** 2 : 0)));
    if (r() < .75) {
      const p = cs[6 + (r() * 4 | 0)], l = r() < .5 ? -1 : 1;
      o.push(fita([p, [p[0] + l * 40 * s, p[1] - 26 * s], [p[0] + l * 66 * s, p[1] - 70 * s]], u => (11 - 6 * u) * s));
    }
    return its(o);
  }
  function embaubaGen(r, x, y, alt, s, op) { // embaúba nova: tronco anelado, galhos em candelabro, folhas palmadas
    op = op || {};
    const o = [], ht = alt * .74, lean = (r() - .5) * 30 * s, cs = [], wt = op.grossura || 15;
    for (let k = 0; k <= 16; k++) { const u = k / 16; cs.push([x + lean * Math.pow(u, 1.5) + Math.sin(u * 4 + x) * 3 * s, y + 4 - (ht + 4) * u]); }
    let d = fita(cs, u => (wt - wt * .42 * u) * s);
    if (op.aneis) for (let h = 22 * s; h < ht - 14 * s; h += (20 + r() * 9) * s) {
      const u = (h + 4) / (ht + 4), p = cs[Math.round(u * 16)], w = (wt - wt * .42 * u) * s * .34;
      d += fenda([[p[0] - w, p[1] + .5], [p[0] + w, p[1] - .5]], 1.4);
    }
    o.push(d);
    const ramos = [[.74, -2.45, 1.05], [.8, -.7, 1], [.88, -2.05, .8], [.93, -1.05, .75], [1, -1.5, .55]];
    for (const [u, a, k] of ramos) {
      const b = cs[Math.round(u * 16)], L = (80 + r() * 30) * s * k;
      const p = [b[0] + Math.cos(a) * L * .7, b[1] + Math.sin(a) * L * .5 - L * .32];
      if (u < 1) o.push(fita(bez(b, [b[0] + Math.cos(a) * L * .45, b[1] - L * .05], p, 8), w => (8 - 4 * w) * s));
      const nf = 3 + (r() * 3 | 0);
      for (let j = 0; j < nf; j++) {
        const ap = -PI / 2 + (j / (nf - 1 || 1) - .5) * 2.5 + (r() - .5) * .3, Lp = (24 + r() * 18) * s;
        const c = [p[0] + Math.cos(ap) * Lp, p[1] + Math.sin(ap) * Lp * .7 - 4 * s];
        o.push(fita([p, [lerp(p[0], c[0], .5), lerp(p[1], c[1], .5) - 6 * s], c], 2.4 * s));
        const R = (46 + r() * 16) * s * (op.folha || 1), ang = r() * TAU, ach = .34 + r() * .3; // op.cai: lobos pendentes (guarda-chuva caído, sem estrela)
        o.push(op.cai ? folhaEmbauba(r, c, R, -PI / 2 + (ang - PI) * .25, ach * .6, op.cai, op.aneis) : folhaEmbauba(r, c, R, ang, ach, .3, op.aneis));
      }
    }
    if (op.seca) { // folha seca pendurada rente ao tronco
      const b = cs[10], q = [b[0] + 18 * s, b[1] + 60 * s];
      o.push(fita([b, [b[0] + 14 * s, b[1] + 20 * s], q], 2 * s), folhaEmbauba(r, [q[0], q[1] + 22 * s], 30 * s, PI / 2, .25, .8, false));
    }
    return { itens: its(o), topo: cs[16], cs, wt };
  }
  function bromelia(r, x, y, R, s, vaso) { // roseta de folhas em fita que se arqueiam para fora (vaso: mais erguida)
    const o = [], n = 13 + (r() * 4 | 0), ab = vaso ? 2.2 : 2.8;
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1) - .5, a = -PI / 2 + k * ab + (r() - .5) * .12, L = R * (vaso ? 1.05 - .3 * Math.abs(k) + r() * .15 : .5 + .9 * Math.abs(k) + r() * .15) * s;
      const tip = [x + Math.cos(a) * L, y + Math.sin(a) * L * .8 + Math.abs(k) * L * (vaso ? .9 : .6)];
      o.push(fita(bez([x, y + 2], [x + Math.cos(a) * L * .55, y + Math.sin(a) * L * .75], tip, 8), u => 7.5 * s * Math.pow(1 - u, .7) + .6));
    }
    return o;
  }
  // cipó: espessura variável, dois fios torcidos, folhas alternadas com trechos nus, gavinha irregular na ponta
  function cipo(r, pts, op) {
    op = op || {};
    const s = op.s || 1, cs = cr(pts, 9), n = cs.length, f0 = r() * 9, o = [], w = op.w || [4, 9];
    const larg = i => lerp(w[0], w[1], .5 + .3 * Math.sin(i * .09 + f0) + .2 * Math.sin(i * .31 + f0 * 2)) * s * (op.afina ? 1 - .55 * i / n : 1);
    const nor = i => { const a = cs[Math.max(0, i - 1)], b = cs[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l]; };
    for (const f of [0, PI]) {
      const c2 = cs.map((p, i) => { const q = nor(i), k = larg(i) * .24 * Math.sin(i * .45 + f + f0); return [p[0] + q[0] * k, p[1] + q[1] * k]; });
      o.push(fita(c2, u => larg(Math.round(u * (n - 1))) * .64));
    }
    if (op.folhas !== false) {
      let lado = 1;
      for (let i = 5; i < n - 4; i += 4 + (r() * 7 | 0)) {
        if (r() < .25) { i += 7; continue; }
        lado = -lado;
        const p = cs[i], q = nor(i), tam = (10 + r() * 15) * s, v = [q[0] * lado, q[1] * lado + 1.1];
        const pe = [p[0] + q[0] * lado * 5 * s, p[1] + q[1] * lado * 5 * s + 2 * s];
        o.push(fita([p, pe], 1.6 * s), folha(r, 'coracao', mat(pe[0], pe[1], Math.atan2(v[1], v[0]) + (r() - .5) * .5, tam), {}));
      }
    }
    if (op.gavinha !== false) {
      const e = cs[n - 1], d = cs[n - 2], g = [e], giro = op.giro || (r() < .5 ? 1 : -1);
      let a = Math.atan2(e[1] - d[1], e[0] - d[0]), L = 3.2 * s, p = e;
      for (let k = 0; k < 24; k++) { a += giro * (.3 + r() * .22); L *= .962; p = [p[0] + Math.cos(a) * L, p[1] + Math.sin(a) * L]; g.push(p); }
      o.push(fita(g, u => (2.4 - 1.5 * u) * s));
    }
    return o;
  }
  function chao(r, x0, x1, op) { // chão claro e iluminado na clareira; só a borda de baixo é escura; sobe sob a mata
    op = op || {};
    const cl = op.clareira, f = [r() * 9, r() * 9, r() * 9], pts = [];
    const lado = x => !cl ? .12 : x < cl[0] ? clamp((cl[0] - x) / 300, 0, 1) : x > cl[1] ? clamp((x - cl[1]) / 300, 0, 1) : 0;
    const topo = x => { const k = lado(x), s = k * k * (3 - 2 * k); return 843 - 44 * s + 4 * Math.sin(x * .011 + f[0]) + 2.5 * Math.sin(x * .037 + f[1]) + 1.2 * Math.sin(x * .13 + f[2]); };
    for (let x = x0; x <= x1; x += 10) pts.push([x, topo(x)]);
    const o = [it(poli([...pts, [x1, H], [x0, H]]))];
    for (let x = x0 + r() * 40; x < x1; x += 22 + r() * 54) { // folhas secas soltas, abaixo da linha das pegadas
      const y = Math.min(topo(x) - 1, 820 + r() * 16), L = 7 + r() * 10, a = (r() - .5) * .7 + (r() < .5 ? PI : 0);
      o.push(it(geo().lente([x, y], [x + Math.cos(a) * L, y + Math.sin(a) * L * .35], 2.2 + r(), (r() - .5) * 3, 4), .6));
    }
    for (let x = x0 + 60 + r() * 200; x < x1; x += 260 + r() * 300) { // raiz rasa e pedrinha
      const y = topo(x) + 1, L = 40 + r() * 70, cs = [];
      for (let k = 0; k <= 8; k++) cs.push([x + k / 8 * L, y - 2.5 * Math.sin(k / 8 * PI) - 1.5 * Math.sin(k)]);
      o.push(it(fita(cs, u => 5 - 3 * u)), it(geo().circ(x + L + 14, y - 1, 6 + r() * 4, 3.5 + r() * 2, 9)));
    }
    return o;
  }
  // frondes de palmeira penduradas do alto: variadas no tamanho, na curva e com folíolos faltando ou rasgados
  function frondeL1(r, x, y, a, L) {
    const s = PROF('L1').escala;
    return pc().fronde(r, x, y, a, L * s * (.78 + r() * .3), .38 + r() * .4, 3 * s, (6 + r() * 1.8) * s, .78 + r() * .2, .6, .08);
  }
  const semCor = a => a.map(x => (x.cor ? { d: x.d } : x)); // longe da tela a cor some: vira silhueta
  function palmeiraLonge(r, x, y, alt, s) { // para L4/L5: a silhueta grande sobrevive ao desfoque; os folíolos miúdos, não
    const lean = (r() - .5) * alt * .22, top = [x + lean, y - alt], o = [fita(bez([x, y + 4], [x + lean * .2, y - alt * .5], top, 10), u => (13 - 6 * u) * s)];
    const n = 7 + (r() * 3 | 0);
    for (let i = 0; i < n; i++) o.push(...pc().fronde(r, top[0], top[1], -PI / 2 + (i / (n - 1) - .5) * 3.2 + (r() - .5) * .3, (130 + r() * 80) * s, .55 + r() * .6, 3.4 * s, 13 * s, .9));
    return its(o);
  }
  // costela-de-adão (L1): caule que sobe de base até topo; cada folha em coração alongado num pecíolo longo e curvo,
  // fendas pinadas quase até a nervura, furos ovais junto dela; tamanhos e ângulos variados. lado: +1 abre para a direita
  function costelaGrupo(r, base, topo, lado, tam, n, forte) { // forte: recortes até perto da nervura e janelas ovais grandes
    const o = [], cs = cr([base, [lerp(base[0], topo[0], .5) + lado * 14, lerp(base[1], topo[1], .5)], topo], 8);
    o.push(fita(cs, u => 13 - 6 * u));
    for (let i = 0; i < n; i++) {
      const p = cs[Math.round((.3 + .7 * i / Math.max(1, n - 1)) * (cs.length - 1))], T = tam * (.72 + r() * .5) * (i === n - 1 ? 1.12 : 1);
      const a = lado > 0 ? -1.05 + i * .75 + (r() - .5) * .3 : PI + 1.05 - i * .75 + (r() - .5) * .3; // a primeira sobe, a última pende
      const pl = T * (.55 + r() * .3), fim = [p[0] + Math.cos(a) * pl, p[1] + Math.sin(a) * pl - T * .12];
      o.push(fita(cr([p, [lerp(p[0], fim[0], .5), lerp(p[1], fim[1], .5) - T * .12], fim], 6), u => 6 - 2.4 * u));
      const af = a + lado * (.35 + r() * .3);
      o.push(folha(r, 'costela', mat(fim[0] - Math.cos(af) * T * .06, fim[1] - Math.sin(af) * T * .06, af, T, T * (.6 + r() * .08)), { prof: forte ? .9 : .76, larg: forte ? .058 : .034, furo: forte ? 2.4 : 1, curva: (Math.cos(af) >= 0 ? .3 : -.3) }));
    }
    return its(o);
  }
  // sub-bosque da mata média (L3): touceiras de sororoca (folhas lanceoladas rasgadas, pontas caídas), helicônias
  // e samambaias, sem repetir a mesma peça mais de duas vezes seguidas; escala e inclinação sorteadas (semente)
  function sororoca(r, x, y, alt, s) {
    const o = [], n = 3 + (r() * 3 | 0);
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1) - .5, a = -PI / 2 + k * 1.7 + (r() - .5) * .4, h = alt * (.22 + .5 * ((i * .618 + r() * .3) % 1));
      const pe = [x + Math.cos(a) * h * .7 + k * 14 * s, y - h];
      o.push(fita(bez([x + k * 6 * s, y + 2], [x + Math.cos(a) * h * .15, y - h * .6], pe, 6), 3.4 * s));
      const af = a + (r() - .5) * .5, L = alt * (.45 + r() * .3);
      o.push(folha(r, 'banana', mat(pe[0], pe[1], af, L, L * (.7 + r() * .25)), { rasgos: 1 + (r() * 4 | 0), curva: (Math.cos(af) >= 0 ? 1 : -1) * (.6 + r() * .7) }));
    }
    return its(o);
  }
  function subosque(r, x0, x1, y, s, fora) {
    const o = [], tipos = ['sororoca', 'heliconia', 'samambaia'];
    let ult = '', rep = 0;
    for (let x = x0 + r() * 40; x < x1; x += (70 + r() * 90) * s) {
      if (!fora(x)) continue;
      let t = tipos[r() < .55 ? 0 : r() < .75 ? 1 : 2];
      if (t === ult && ++rep >= 2) { t = tipos[(tipos.indexOf(t) + 1 + (r() * 2 | 0)) % 3]; rep = 0; } else if (t !== ult) rep = 0;
      ult = t;
      const e = s * (.75 + r() * .5);
      o.push(...(t === 'sororoca' ? sororoca(r, x, y, (240 + r() * 120) * e, e) : t === 'heliconia' ? semCor(pc().heliconia(r, x, y, (230 + r() * 80) * e, e)) :
        pc().samambaia(r, x, y, (100 + r() * 60) * e, e)));
    }
    return o;
  }

  // sub-bosque variado (op.subosque 'variado' da floresta): no máximo uma touceira de sororoca a cada 900 px, espelhada,
  // girada ±12° e em escala .7–1,3; no resto, bananeira rasgada, helicônia de brácteas em zigue-zague, samambaiaçu,
  // touceira de açaí de estipes inclinados e cipó de folhas alternadas pendendo do alto
  const girar = (itens, x, y, a, sx, sy) => { const m = mul(mat(x, y, a, sx, sy), [1, 0, 0, 1, -x, -y]); return itens.map(i => Object.assign({}, i, { d: transD(i.d, m) })); };
  function bananeira(r, x, y, alt, s) { // pseudocaule anelado, 5–7 folhas largas em arco e rasgadas, uma seca pendurada
    const o = [], lean = (r() - .5) * 26 * s, top = [x + lean, y - alt * .62], cs = bez([x, y + 3], [x + lean * .2, y - alt * .3], top, 10);
    o.push(fita(cs, u => (22 - 9 * u) * s));
    const n = 5 + (r() * 3 | 0);
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1) - .5, a = -PI / 2 + k * 2.5 + (r() - .5) * .25, L = alt * (.5 + r() * .22) * (1 - .25 * Math.abs(k));
      const pe = [top[0] + Math.cos(a) * 14 * s, top[1] + Math.sin(a) * 10 * s];
      o.push(folha(r, 'banana', mat(pe[0], pe[1], a, L, L * (.36 + r() * .08)), { rasgos: 4 + (r() * 5 | 0), nervura: true, curva: (Math.cos(a) >= 0 ? 1 : -1) * (.5 + r() * .6) }));
    }
    const b = cs[6], L = alt * .34; // folha seca: pende rente ao caule
    o.push(folha(r, 'banana', mat(b[0] + 6 * s, b[1], PI / 2 - .12, L, L * .22), { rasgos: 6, curva: .2 }));
    return its(o);
  }
  function subosqueVariado(r, x0, x1, y, s, fora) {
    const o = [], tipos = ['bananeira', 'samambaiacu', 'cipo', 'acai', 'samambaia', 'heliconia', 'samambaiacu', 'bananeira', 'samambaia'];
    let ultSoro = -1e9, k = (r() * 6) | 0;
    for (let x = x0 + r() * 60; x < x1; x += (95 + r() * 120) * s) {
      if (!fora(x)) continue;
      const e = s * (.75 + r() * .5);
      if (x - ultSoro > 900 && r() < .5) { // sororoca rara e sempre diferente
        ultSoro = x;
        const k2 = .7 + r() * .6;
        o.push(...girar(sororoca(r, x, y, (250 + r() * 100) * e, e), x, y, (r() - .5) * .42, (r() < .5 ? -1 : 1) * k2, k2));
        continue;
      }
      const t = tipos[k++ % tipos.length];
      if (r() < .25) k++;                                   // a ordem não se repete igual a cada volta
      o.push(...(t === 'bananeira' ? bananeira(r, x, y, (330 + r() * 110) * e, e) :
        t === 'heliconia' ? semCor(pc().heliconia(r, x, y, (240 + r() * 80) * e, e)) :
        t === 'samambaiacu' ? pc().samambaiacu(r, x, y, (300 + r() * 90) * e, e) :
        t === 'acai' ? girar(pc().acai(r, x, y, (360 + r() * 90) * e, e), x, y, (r() < .5 ? -1 : 1) * (.12 + r() * .1), 1, 1) :
        t === 'cipo' ? cipo(r, [[x, -20], [x + 40 * e, 200], [x - 20 * e, 420 + r() * 80], [x + 30 * e, 560 + r() * 120]], { s: e, w: [3, 6], afina: true }) :
        pc().samambaia(r, x, y, (110 + r() * 50) * e, e)));
    }
    return o;
  }

  // ---------- núcleo: o cenário é um ator, com um contêiner por camada ----------
  const dataURL = svg => 'data:image/svg+xml,' + svg.replace(/"/g, "'").replace(/[%#<>{}\n]/g, encodeURIComponent);
  function caixa(lista, pad) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const d of lista) {
      const n = (d.match(/-?(?:\d+\.?\d*|\.\d+)/g) || []).map(Number);
      for (let i = 0; i + 1 < n.length; i += 2) { x0 = Math.min(x0, n[i]); x1 = Math.max(x1, n[i]); y0 = Math.min(y0, n[i + 1]); y1 = Math.max(y1, n[i + 1]); }
    }
    return [Math.floor(x0 - pad), Math.floor(y0 - pad), Math.ceil(x1 - x0 + 2 * pad), Math.ceil(y1 - y0 + 2 * pad)];
  }
  function svgTinta(itens, P, cx, furos, repete) {
    let defs = '', corpo = '', n = 0;
    const pats = {}, reg = `x="${cx[0] - 3000}" y="${cx[1] - 3000}" width="${cx[2] + 6000}" height="${cx[3] + 6000}"`;
    for (const x of itens) {
      const o = x.o != null && x.o !== 1 ? ` opacity="${x.o}"` : '';
      if (!x.vazado) { corpo += `<path d="${x.d}"${o}/>`; continue; }
      const v = S.grafismos.variante(x.vazado.motivo, { escala: x.vazado.escala });
      if (!pats[v.id]) { pats[v.id] = 1; defs += v.svg; }
      const id = 'v' + n++;
      defs += `<mask id="${id}" maskUnits="userSpaceOnUse" ${reg}><rect ${reg} fill="#fff"/><path d="${x.vazado.faixa || x.d}" fill="url(#${v.id})"/>` +
        `<path d="${x.d}" fill="none" stroke="#fff" stroke-width="${2 * (x.vazado.margem || 4)}" stroke-linejoin="round"/></mask>`;
      corpo += `<path d="${x.d}" mask="url(#${id})"${o}/>`;
    }
    if (furos) { defs += `<mask id="f" maskUnits="userSpaceOnUse" ${reg}><rect ${reg} fill="#fff"/><path d="${furos}"/></mask>`; corpo = `<g mask="url(#f)">${corpo}</g>`; }
    if (repete) { defs += `<g id="r">${corpo}</g>`; corpo = [-2, -1, 0, 1].map(k => `<use href="#r" x="${k * repete}"/>`).join(''); } // mata sem fim: o mesmo trecho, 4 vezes
    const f = P.desfoque > .05 ? `<filter id="b" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${P.desfoque}"/></filter>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${cx[2]}" height="${cx[3]}" viewBox="${cx.join(' ')}"><defs>${defs}${f}</defs>` +
      `<g opacity="${P.opacidade}"${f ? ' filter="url(#b)"' : ''}>${corpo}</g></svg>`;
  }
  function elMascara(svg, cx, classe) {
    const e = document.createElement('div'), u = `url("${dataURL(svg)}")`;
    if (classe) e.className = classe;
    e.style.cssText = `position:absolute;left:${cx[0]}px;top:${cx[1]}px;width:${cx[2]}px;height:${cx[3]}px;-webkit-mask:${u} 0 0/100% 100% no-repeat;mask:${u} 0 0/100% 100% no-repeat`;
    return e;
  }
  function svgEl(conteudo) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('width', W); s.setAttribute('height', H); s.setAttribute('viewBox', `0 0 ${W} ${H}`);
    s.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
    s.innerHTML = conteudo;
    return s;
  }

  function novo(palco, nome, visivel) {
    const C = {
      nome, palco, camadas: {}, pecas: {}, pontos: {}, _pecas: [], _bonecos: [], _ult: {}, _vis: null,
      estado: { visivel: visivel == null ? 1 : visivel, vento: 1, agito: 0, desfoque: 0, camadas: {} },
      atualizar(t) { quadro(C, t); },
    };
    for (const k of CAMADAS) {
      C.estado.camadas[k] = { y: 0, o: 1, b: 0, sacode: 0 };
      const e = C.camadas[k] = document.createElement('div');
      e.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;display:none;transform-origin:960px ${CHAO}px;will-change:transform`;
      e.dataset.cenario = nome;
    }
    return C;
  }
  function peca(C, nome, pivo, op) {
    op = op || {};
    const p = {
      nome, pivo: pivo || [960, CHAO], els: [], fixo: !!op.fixo, balanco: op.balanco || null, estatica: !!op.estatica,
      estado: Object.assign({ x: 0, y: 0, rot: 0, escala: 1, o: 1, tremor: 0 }, op.estado),
      tinta(camada, itens, o2) { // silhueta (máscara pintada com a tinta da luz); itens com cor viram couro colorido por cima
        o2 = o2 || {};
        const P = Object.assign({}, PROF(o2.prof || camada), o2.P), tin = itens.filter(x => !x.cor), cor = itens.filter(x => x.cor);
        let cx = o2.caixa || caixa(ds(tin).concat(o2.furos ? [o2.furos] : []), 3 * (P.desfoque || 0) + 4);
        if (o2.repete) cx = [-M - o2.repete, cx[1], W + 2 * M + o2.repete, cx[3]];
        const e = p.anexar(camada, elMascara(svgTinta(tin, P, cx, o2.furos, o2.repete), cx, 'sb-tinta'), cx, o2);
        if (cor.length) {
          const cc = caixa(ds(cor), 4), im = document.createElement('img');
          im.src = dataURL(`<svg xmlns="http://www.w3.org/2000/svg" width="${cc[2]}" height="${cc[3]}" viewBox="${cc.join(' ')}"><g opacity=".92" stroke-linejoin="round">` +
            cor.map(x => `<path d="${x.d}" fill="${x.cor}"${x.borda ? ` stroke="${x.borda}" stroke-width="1.4"` : ''}/>`).join('') + '</g></svg>');
          im.style.cssText = `position:absolute;left:${cc[0]}px;top:${cc[1]}px;width:${cc[2]}px;height:${cc[3]}px`;
          p.anexar(camada, im, cc, o2);
        }
        return e;
      },
      anexar(camada, e, cx, o2) {
        o2 = o2 || {};
        e.style.transformOrigin = `${R1(p.pivo[0] - cx[0])}px ${R1(p.pivo[1] - cx[1])}px`;
        if (!op.estatica || o2.repete) e.style.willChange = 'transform'; // ponytail: uma camada de GPU por peça animável
        if (o2.repete) p.periodica = true;
        C.camadas[camada].appendChild(e);
        p.els.push({ e, camada, base: o2.o == null ? 1 : o2.o, chave: o2.chave, periodo: o2.repete, semGiro: o2.semGiro, trava: o2.trava });
        return e;
      },
    };
    if (nome) C.pecas[nome] = p;
    C._pecas.push(p);
    return p;
  }
  function couro(C, nome, def, op, camada) {
    const b = S.bonecos.criar(def, op || {});
    C.camadas[camada || 'bonecos'].appendChild(b.camadas.bonecos);
    if (b.camadas.brilho) C.camadas.brilho.appendChild(b.camadas.brilho);
    C._bonecos.push(b);
    if (nome) C.pecas[nome] = b;
    return b;
  }
  function quadro(C, t) {
    const E = C.estado, vis = E.visivel > .001;
    if (vis !== C._vis) { C._vis = vis; for (const k in C.camadas) C.camadas[k].style.display = vis ? '' : 'none'; }
    if (!vis) return;
    const ult = C._ult, w = (k, v, f) => { if (ult[k] !== v) { ult[k] = v; f(v); } };
    C._sk = {};
    C._dx = 40 * (S.palco.chama(t, C.palco.luz.tremor) - 1); // tremor da chama que o palco aplica às camadas
    for (const k in C.camadas) {
      const L = E.camadas[k], b = BAL[k], el = C.camadas[k];
      const sk = C._sk[k] = b ? E.vento * b[0] * Math.sin(TAU * b[1] * t + b[2]) + E.agito * b[0] * 3 * Math.sin(TAU * .85 * t + .4) : 0;
      const sx = L.sacode ? L.sacode * S.palco.ruido(t * 3, 17 + k.length) : 0, sy = L.sacode ? L.sacode * .5 * S.palco.ruido(t * 3, 29) : 0;
      w('t' + k, `translate(${sx.toFixed(2)}px,${(L.y + sy).toFixed(2)}px) skewX(${sk.toFixed(3)}deg)`, v => { el.style.transform = v; });
      w('o' + k, clamp(E.visivel * L.o, 0, 1).toFixed(3), v => { el.style.opacity = v; });
      const bl = L.b + E.desfoque;
      w('b' + k, bl > .05 ? `blur(${bl.toFixed(2)}px)` : '', v => { el.style.filter = v; });
    }
    for (const p of C._pecas) quadroPeca(C, p, t);
    for (const b of C._bonecos) b.atualizar(t);
  }
  function quadroPeca(C, p, t) {
    const E = p.estado, Ec = C.estado, cam = C.palco.camera.x, PX = S.palco.PARALAXE;
    if (p.antes) p.antes(t, p, C);
    let rot = E.rot, tx = E.x;
    if (E.tremor) { rot += E.tremor * .8 * Math.sin(TAU * 9 * t); tx += E.tremor * 1.8 * Math.sin(TAU * 6.3 * t + 1); }
    if (p.balanco) { const b = p.balanco; rot += Ec.vento * b[0] * Math.sin(TAU * b[1] * t + b[2]) + Ec.agito * b[0] * 2 * Math.sin(TAU * .9 * t + .5); }
    const giro = p.giro ? p.giro(t) : 0;
    if (p.estatica && !p.periodica) return; // fundo parado: nada a reescrever
    for (const e of p.els) {
      let x = tx;
      if (p.fixo) x += cam * PX[e.camada];                                   // não anda com a câmera
      if (e.periodo) { const s = -cam * PX[e.camada]; x += mod(s, e.periodo) - s; } // mata sem fim
      const g = e.semGiro ? 0 : rot + giro;
      let sk = '';
      if (e.trava) { // na camada da frente, mas preso ao plano de trás: desfaz paralaxe, tremor e balanço da diferença
        x += (C._dx - cam) * (PX[e.trava] - PX[e.camada]);
        sk = ` skewX(${((C._sk[e.trava] || 0) - (C._sk[e.camada] || 0)).toFixed(3)}deg)`;
      }
      const tr = `translate(${x.toFixed(2)}px,${E.y.toFixed(2)}px) rotate(${g.toFixed(3)}deg) scale(${E.escala.toFixed(4)})${sk}`;
      if (e.t !== tr) { e.t = tr; e.e.style.transform = tr; }
      const o = clamp(E.o * e.base * (e.chave ? E[e.chave] : 1), 0, 1).toFixed(3);
      if (e.o !== o) { e.o = o; e.e.style.opacity = o; e.e.style.visibility = +o ? '' : 'hidden'; }
    }
    if (p.quadro) p.quadro(t, p, C);
  }
  const tintaAgora = C => { const L = C.palco.luz; return `rgb(${L.tintaR | 0},${L.tintaG | 0},${L.tintaB | 0})`; }; // para desenhos vivos

  // ---------- floresta: L5 → L1 com clareira de luz no centro (ou periódica, para a câmera deslizar sem fim) ----------
  function floresta(C, r, op) {
    op = op || {};
    const per = op.periodo || 0, cl = op.clareira || [700, 1220];
    const X0 = per ? 0 : -M + 10, X1 = per ? per : W + M - 10;
    const dentroDe = (lista, x) => (lista || []).some(([a, b]) => { const m = per ? mod(x, per) : x; return m > a && m < b; });
    const fora = (x, folga) => (per ? !dentroDe(op.ralo, x) : x < cl[0] - (folga == null ? 40 : folga) || x > cl[1] + (folga == null ? 40 : folga));
    const livre = x => !(op.semCapim || []).some(([a, b]) => x > a && x < b);
    const L = { L5: [], L4: [], L3: [], L2: [], L1: [] }, add = (k, a) => L[k].push(...its(a));
    // L5 — horizonte de copas, claro e alto; emergentes acima do dossel
    let s = PROF('L5').escala;
    add('L5', [horizonte(r, X0 - 200, X1 + 200, 818, 340)]);
    for (let x = X0 + r() * 90; x < X1; x += 130 + r() * 170) {
      const q = r();
      add('L5', q < .18 && !op.semEmergente ? emergente(r, x, 812, 900 + r() * 160, s) : q < .74 ? palmeiraLonge(r, x, 812, (760 + r() * 260) * s, s) : buriti(r, x, 812, (800 + r() * 220) * s, s));
    }
    // L4 — árvores distantes (também no centro, em névoa)
    s = PROF('L4').escala;
    add('L4', [horizonte(r, X0 - 200, X1 + 200, 818, 80)]);
    for (let x = X0 + r() * 80; x < X1; x += 120 + r() * 140) {
      if ((!per || op.ralo) && !fora(x, -60) && r() < .45) continue;
      const q = r(), y = 818;
      const a4 = q < .34 ? palmeiraLonge(r, x, y, (700 + r() * 240) * s, s) : q < .48 ? buriti(r, x, y, (760 + r() * 160) * s, s) :
        q < .7 ? pc().acai(r, x, y, (600 + r() * 160) * s, s) : pc().embauba(r, x, y, (640 + r() * 180) * s, s);
      if (!dentroDe(op.semL4, x)) add('L4', a4); // op.semL4: [[a, b]] sem árvore em L4 (sorteada assim mesmo: o resto não muda)
    }
    // L3 — mata média legível: troncos que saem pelo alto, açaís, embaúbas, buritis e samambaiaçus nas bordas
    s = PROF('L3').escala;
    const l3 = x => {
      if (!fora(x)) return;
      const q = r(), y = 816;
      add('L3', q < .24 ? coluna(r, x, y, s) : q < .46 ? pc().acai(r, x, y, (540 + r() * 140) * s, s) : q < .58 ? pc().palmeira(r, x, y, (700 + r() * 140) * s, s) :
        q < .76 ? pc().embauba(r, x, y, (600 + r() * 120) * s, s) : q < .88 ? pc().samambaiacu(r, x, y, (460 + r() * 80) * s, s) : buriti(r, x, y, (740 + r() * 100) * s, s));
    };
    if (per) for (let x = r() * 80; x < per; x += 150 + r() * 170) l3(x);
    else for (const x of op.L3 || [-150, 40, 230, 430, 600, 1320, 1470, 1640, 1810, 2010]) l3(x + (r() - .5) * 60);
    const sub = subosque(r, X0, X1, 816, s, x => fora(x, 0));  // sorteado sempre: o resto da mata não muda
    add('L3', op.subosque === 'variado' ? subosqueVariado(S.rng(per + 7), X0, X1, 816, s, x => fora(x, 0) && !dentroDe(op.clareiraL3, x)) : sub); // clareiraL3: [[a, b]] sem sub-bosque
    for (let i = 0; i < (per ? 4 : 3); i++) {
      const x = per ? (i + .3 + r() * .4) * per / 4 : [140, 1560, 1760][i] + (r() - .5) * 80;
      if (!fora(x)) continue;
      const y1 = 380 + r() * 220;
      add('L3', cipo(r, [[x, 30], [x + 30 * s, y1 * .4], [x - 10 * s, y1 * .75], [x + 26 * s, y1]], { s, folhas: false, w: [3, 6] }));
    }
    // L2 — chão claro na clareira; troncos e touceiras nas bordas
    if (op.chao !== false) add('L2', chao(r, X0 - 40, X1 + 40, { clareira: per ? null : cl }));
    if (!per && op.bordasL2 !== false) {
      for (const x of op.troncosL2 || [-20, 1945]) add('L2', coluna(r, x, 808, 1, 80 + r() * 30));
      for (const [x, R] of [[150, 46], [1760, 42]]) if (livre(x)) add('L2', bromelia(r, x, 808, R, 1));
      if (livre(300)) add('L2', pc().samambaia(r, 300, 814, 130, .95));
      add('L2', pc().samambaia(r, 1640, 814, 120, .9));
    }
    if (per) for (let x = 120; x < per; x += 280 + r() * 260) { const pl = r() < .5 ? pc().samambaia(r, x, 814, 110 + r() * 40, .9) : bromelia(r, x, 812, 34 + r() * 14, 1); if (!dentroDe(op.limpoL2, x)) add('L2', pl); }
    // L1 — moldura colada à tela: frondes do alto, costelas-de-adão nas laterais, helicônia, cipó, capim no rodapé
    s = PROF('L1').escala;
    if (op.L1 !== false) {
      if (per) {
        for (let x = 200; x < per; x += 760 + r() * 200) add('L1', [...frondeL1(r, x, -16, .55 + r() * .5, 190 + r() * 50), ...frondeL1(r, x + 70, -12, PI - .6 - r() * .4, 150 + r() * 40)]);
        for (let x = 30; x < per; x += 50 + r() * 110) add('L1', pc().capim(r, x, 864, 24 + r() * 22, 1));
      } else {
        const fr = op.frondes || [[40, 16, .34, 330], [128, -8, .98, 290], [-12, 130, .05, 250], [250, -12, 1.36, 200],
          [1892, 8, PI - .38, 320], [1822, -12, PI - 1, 270], [1944, 140, PI + .05, 230], [662, 14, .62, 135], [1262, 18, PI - .5, 150]];
        for (const [x, y, a, Lf] of fr) peca(C, null, [x, y], { balanco: [1 + r() * .8, .15 + r() * .12, r() * TAU] }).tinta('L1', its(frondeL1(r, x, y, a, Lf)));
        if (op.costela !== false) { // op.costelaEsq/Dir: [base, topo] do caule (padrão: sobem do rodapé nos cantos)
          const [be, te] = op.costelaEsq || [[24, 900], [70, 600]], [bd, td] = op.costelaDir || [[1906, 900], [1868, 560]];
          add('L1', costelaGrupo(r, be, te, 1, 165, 3, op.costelaRecorte));
          add('L1', costelaGrupo(r, bd, td, -1, 140, 3, op.costelaRecorte));
        }
        if (op.heliconia !== false) add('L1', pc().heliconia(r, op.heliconiaX || 1790, 864, 250, 1.1, true));
        for (let x = 80; x < W - 60; x += 30 + r() * 40) if ((x < cl[0] - 120 || x > cl[1] + 120) && livre(x)) add('L1', pc().capim(r, x, 860, 56 + r() * 36, 1));
        if (op.cipoL1 !== false) add('L1', cipo(r, [[590, 30], [604, 90], [586, 160], [598, 236]], { s: 1.1, w: [3, 6.5], afina: true, gavinha: false }));
      }
    }
    for (const k in L) if (L[k].length) peca(C, null, null, { estatica: true }).tinta(k, L[k], { repete: per, caixa: [-M - 40, -120, W + 2 * M + 80, H + 120], furos: (op.furos || {})[k] }); // op.furos.L2: abre o chão (riacho)
  }

  // ---------- peças especiais ----------
  // galho alto da samaúma: estirão quase horizontal (onde se senta), ramo que sobe, raízes aéreas, bromélia, folhinhas
  function galhoSamauma(r, corpo, P, PP, gd, s, op) {
    const gy = op.gy || -560, sent = op.sentar || 250; // op.gy: altura do galho (noite: mais baixo, o Curupira cabe sentado)
    const gal = cr([[gd * 70, gy + 22], [gd * 150, gy - 14], [gd * sent, gy - 34], [gd * (sent + 90), gy - 50], [gd * (sent + 170), gy - 100], [gd * (sent + 230), gy - 190]], 6);
    corpo.push(it(poli(PP(fitaP(gal, u => 48 - 32 * u)))));
    corpo.push(it(poli(PP(fitaP(cr([[gd * (sent - 30), gy - 30], [gd * (sent - 10), gy - 120], [gd * (sent - 30), gy - 230], [gd * (sent + 10), gy - 380]], 6), u => 22 - 9 * u)))));
    corpo.push(it(poli(PP(fitaP(cr([[-gd * 60, gy - 150], [-gd * 140, gy - 200], [-gd * 210, gy - 290], [-gd * 230, gy - 420]], 6), u => 34 - 14 * u)))));
    for (const [a, L] of [[120, 160], [sent - 60, 230], [sent + 60, 140]]) {
      const b = [gd * a, gy + (a > sent ? -38 : -16)], cs = [b];
      for (let k = 1; k <= 10; k++) cs.push([b[0] + 4 * Math.sin(k * .9 + a), b[1] + L * k / 10]);
      corpo.push(it(poli(PP(fitaP(cs, u => 3.2 - 2 * u)))));
    }
    corpo.push(...its(bromelia(r, ...P(gd * 120, gy - 26), 34, s)));
    // nas pontas: tufos de folha digitada da samaúma (5 a 7 folíolos elípticos caídos, sem pontas em estrela), mais uma
    // bromélia na forquilha e um cipó pendurado. Sorteio próprio: o resto da árvore não muda.
    const q = S.rng(97 + Math.round(P(0, 0)[0])), tufo = (c, dir) => {
      const tw = [c[0] + dir * (6 + q() * 6) * s, c[1] + (8 + q() * 6) * s], n = 5 + (q() * 3 | 0), d = [fita([c, tw], 2 * s)];
      for (let k = 0; k < n; k++) {
        const a = PI / 2 + dir * .25 + (k / (n - 1) - .5) * 2 + (q() - .5) * .25, L = (15 + q() * 9) * s;
        d.push(poli(oval([tw[0] + Math.cos(a) * L * .55, tw[1] + Math.sin(a) * L * .55], L * .5, (2.6 + q() * 1.2) * s, a, 12)));
      }
      return d;
    };
    for (const [a, b] of [[gd * (sent + 230), gy - 190], [gd * (sent + 10), gy - 380], [-gd * 230, gy - 420], [gd * (sent + 170), gy - 100]])
      for (let j = 0; j < 3; j++) corpo.push(...its(tufo(P(a + (q() - .5) * 70, b - 6 - q() * 34), (q() < .5 ? -1 : 1) * gd)));
    corpo.push(...its(bromelia(q, ...P(gd * (sent + 120), gy - 66), 26, s, true)));
    corpo.push(...its(cipo(q, [P(gd * (sent + 150), gy - 72), P(gd * (sent + 162), gy + 30), P(gd * (sent + 148), gy + 130), P(gd * (sent + 160), gy + 220)], { s: s * .9, w: [2.6, 4.4], afina: true })));
    return { gy, sent };
  }
  // Samaúma grande: tronco que sai pelo alto, cinco sapopemas em lâmina com fendas de luz, duas costelas de frente,
  // oco rasgado (casa do Curupira) e galho alto. estado extra: frente (0..1: a sapopema da frente e a boca do oco
  // passam para a frente dos bonecos — esconder-se atrás, entrar no oco), oco (escuridão do oco), olhos (olhinhos acesos)
  function samauma(C, nome, x0, s, op) {
    op = op || {};
    if (op.laminas) return samaumaLaminas(C, nome, x0, s, op);
    const r = S.rng(op.semente || 31), sx = op.espelho ? -1 : 1, gd = op.galho || 1;
    const P = (a, b) => [x0 + sx * a * s, CHAO + b * s], PP = pts => pts.map(q => P(q[0], q[1]));
    const corpo = [], furos = [], topo = -(CHAO + 90) / s;
    const esq = [], dir = [];
    for (let k = 0; k <= 30; k++) {
      const u = k / 30, y = lerp(4, topo, u), c = 22 * u * u, bojo = 5 * Math.sin(u * 7 + 1) + 3 * Math.sin(u * 19);
      esq.push([-97 + 13 * u + c + bojo + (r() - .5) * 2.6, y]); dir.push([95 - 11 * u + c + bojo * .6 + (r() - .5) * 2.6, y]);
    }
    corpo.push(it(poli(PP([...esq, ...dir.reverse()]))));
    // sapopemas: [x no tronco, altura, ponta no chão, y da ponta, ondulação]; da de trás para a da frente
    const SAP = [[-80, -210, -470, -2, 7], [-88, -262, -340, 3, 11], [86, -242, 318, 3, -10], [-46, -172, -205, 9, 6], [44, -134, 182, 9, -6], [70, -200, 440, -3, -8]];
    const bordas = [], fundo = [], meio = [];
    SAP.forEach(([ax, ay, bx, by, onda], i) => {
      const ed = [];
      for (let k = 0; k <= 18; k++) {
        const u = k / 18;
        ed.push([lerp(ax, bx, u) + (r() - .5) * 2, lerp(ay, by, Math.pow(u, .42)) + onda * Math.sin(u * PI * 2.3) * Math.sin(PI * u) + (r() - .5) * 1.6]);
      }
      bordas.push(ed);
      (i === 0 || i === 5 ? fundo : i < 3 ? meio : corpo).push(it(poli(PP([...ed, [bx - Math.sign(bx) * 10, 8], [ax * .3, 8], [ax * .3, ay]])), i === 0 || i === 5 ? .58 : i < 3 ? .82 : 1));
    });
    // fendas de luz rente à borda de cada lâmina que tem outra atrás (separam os planos)
    const lux = (ed, u0, u1, off, w) => {
      const cs = ed.slice(Math.round(u0 * 18), Math.round(u1 * 18) + 1).map(([a, b]) => [a, b - off]);
      return poli(fitaP(PP(cs), u => (w || 3) * Math.sin(PI * clamp(u * 1.1, 0, 1)) + .4), true);
    };
    furos.push(lux(bordas[3], .04, .9, 4.5), lux(bordas[4], .05, .9, 4.5), lux(bordas[1], .3, .97, 4.5, 3.6), lux(bordas[2], .4, .95, 4.5, 3.2));
    // duas costelas de frente (lâminas vistas de quina): sobem do chão como cristas sinuosas contornadas de luz
    for (const [x, h, l] of [[-82, 250, 1], [62, 206, -1]]) for (const lado of [-1, 1]) {
      const cs = [];
      for (let k = 0; k <= 10; k++) { const u = k / 10; cs.push([x + l * 14 * (1 - u) + lado * (11 - 9 * u) + 3 * Math.sin(u * 5 + x), 6 - h * u]); }
      furos.push(poli(fitaP(PP(cs), u => 2.4 * Math.sin(PI * clamp(u * 1.08 + .04, 0, 1)) + .3), true));
    }
    // oco: rasgo alto e estreito entre as costelas, um só bico rasgado e torto, borda de recorte de faca
    // oco: fenda alta e irregular entre as costelas (cabe gente agachada), bico torto e rasgado, mossas de faca
    const oco = [[-52, 6], [-57, -30], [-51, -70], [-47, -104], [-41, -138], [-36, -160], [-29, -182], [-22, -202], [-13, -226], [-7, -207], [-2, -196], [4, -178],
      [9, -152], [4, -146], [11, -138], [15, -110], [21, -80], [27, -46], [32, -14], [34, 6]].map(([a, b]) => [a + (r() - .5) * 2.4, b]);
    const aro = oco.map(([a, b]) => [a + (a < -10 ? -5 : 5), b - 3]);
    for (const [i0, i1] of [[1, 7], [10, 18]]) furos.push(poli(fitaP(PP(aro.slice(i0, i1 + 1)), u => 3.2 * Math.sin(PI * clamp(u * 1.12, .04, 1)) + .5), true));
    furos.push(poli(fitaP(PP([[-13, -232], [-16, -262], [-12, -290], [-17, -330], [-14, -352]]), u => 2.6 * (1 - u) + .3), true)); // a racha continua tronco acima
    // casca: fissuras longas e onduladas e dois frisos estreitos de losangos entalhados, desalinhados
    for (const [a, y0, y1] of [[-66, -290, -520], [-38, -620, -820], [-12, -330, -470], [8, -500, -760], [36, -280, -430], [62, -460, -700], [74, -720, -900]]) {
      const cs = []; for (let k = 0; k <= 9; k++) cs.push([a + 2.4 * Math.sin(k * 1.3 + a) + (k > 6 ? (k - 6) * 1.5 : 0), lerp(y0, y1, k / 9)]);
      furos.push(poli(fitaP(PP(cs), u => 1.9 * Math.sin(PI * u) + .2), true));
    }
    for (const [a, y0, n] of [[-24, -700, 9], [48, -560, 7]]) for (let j = 0; j < n; j++) {
      const cx = a + 2 * Math.sin(j * .8), cy = y0 + j * 17, k = 1 - Math.abs(j / (n - 1) - .5) * .7;
      furos.push(poli(PP([[cx, cy - 7 * k], [cx + 4.2 * k, cy], [cx, cy + 7 * k], [cx - 4.2 * k, cy]]), true));
    }
    const { gy, sent } = galhoSamauma(r, corpo, P, PP, gd, s, op);
    for (const [a, L] of [[-455, -110], [312, 120], [-205, -70]]) { // raízes rasas que correm pelo chão
      const cs = []; for (let k = 0; k <= 10; k++) cs.push([a + L * k / 10, 2 - 3 * Math.sin(k / 10 * PI) + (r() - .5) * 2]);
      corpo.push(it(poli(PP(fitaP(cs, u => 9 - 6 * u)))));
    }
    const sam = peca(C, nome, P(0, 0), { estado: { frente: 0, oco: 1, olhos: 0 }, fixo: op.fixo });
    // três densidades de couro num só recorte (o que fica na frente cobre o de trás sem escurecer em dobro):
    // lâminas de trás (mais finas, mais longe), lâminas maiores abertas para os lados, tronco + lâminas da frente + galho
    // o oco é vazado no couro e tapado pela tinta do oco (estado.oco: 1 escuro, como antes; 0 deixa ver a luz lá dentro)
    sam.tinta('L2', fundo.concat(meio, corpo), { furos: furos.join('') + poli(PP(oco), true) });
    sam.tinta('L2', [it(poli(PP(oco)))], { P: { opacidade: 1, desfoque: .6 }, chave: 'oco' });
    // frente: lâminas da frente + base do tronco, com a boca do oco aberta (na camada de brilho, por cima dos bonecos)
    const fr = [poli(PP([...bordas[3], [-215, 8], [-30, 8], [-30, -172]])), poli(PP([...bordas[4], [192, 8], [30, 8], [30, -134]])), corpo[0].d].map(d => it(d));
    sam.tinta('L1', fr, { prof: 'L2', furos: poli(PP(oco)) + furos[0] + furos[1], chave: 'frente', trava: 'L2' });
    const ol = olhosOco(C, nome, sam, P(-12, -128), s);
    const em = (ed, u) => P(...ed[Math.round(u * 18)]);
    C.pontos[nome] = {
      oco: P(-10, 0), olhos: ol, galho: P(gd * sent, gy - 58), sapopema: em(bordas[2], .45), bater: P(260, 0),
      topoSapopema: em(bordas[1], .22), subirEsq: em(bordas[1], .42), subirDir: em(bordas[2], .38), atras: P(-140, 0), toca: P(112, 0),
    };
    return sam;
  }

  function olhosOco(C, nome, sam, ol, s) { // dois olhinhos acesos no escuro do oco (estado.olhos)
    sam.anexar('brilho', svgEl(`<defs><filter id="sbo-${C.nome}${nome}" x="-2" y="-2" width="5" height="5"><feGaussianBlur stdDeviation="2.4"/></filter></defs>` +
      `<g fill="#FFD36A"><g filter="url(#sbo-${C.nome}${nome})" opacity=".8"><ellipse cx="${ol[0] - 5 * s}" cy="${ol[1]}" rx="${4.6 * s}" ry="${3.2 * s}"/><ellipse cx="${ol[0] + 6 * s}" cy="${ol[1] - 1}" rx="${4.6 * s}" ry="${3.2 * s}"/></g>` +
      `<ellipse cx="${ol[0] - 5 * s}" cy="${ol[1]}" rx="${2.4 * s}" ry="${1.7 * s}" fill="#FFF2C0"/><ellipse cx="${ol[0] + 6 * s}" cy="${ol[1] - 1}" rx="${2.4 * s}" ry="${1.7 * s}" fill="#FFF2C0"/></g>`), [0, 0, W, H], { chave: 'olhos' });
    return ol;
  }
  // Samaúma de sapopemas em lâmina (op.laminas; guia §8.1): cinco abas triangulares curvas, cada uma num tom, com uma
  // fresta de papel entre elas; oco baixo e rasgado entre as duas da frente; toca de tatu no pé da lâmina direita;
  // casca com faixas de losangos vazados e borda do tronco em recorte de faca. Mesmo estado e mesmos pontos de samauma().
  function samaumaLaminas(C, nome, x0, s, op) {
    const r = S.rng(op.semente || 31), sx = op.espelho ? -1 : 1, gd = op.galho || 1, hw = op.meiaLargura || 90;
    const P = (a, b) => [x0 + sx * a * s, CHAO + b * s], PP = pts => pts.map(q => P(q[0], q[1])), topo = -(CHAO + 90) / s;
    const esq = [], dir = [];
    for (let k = 0; k <= 44; k++) {
      const u = k / 44, y = lerp(6, topo, u), c = 18 * u * u, bojo = 4 * Math.sin(u * 7 + 1) + 2.4 * Math.sin(u * 19), pe = 0;
      esq.push([-hw - pe + 9 * u + c + bojo + (k % 7 === 3 ? 11 : 0) + (r() - .5) * 2, y]);    // mossas de faca na borda
      dir.push([hw + pe - 7 * u + c + bojo * .6 - (k % 9 === 5 ? 11 : 0) + (r() - .5) * 2, y]);
    }
    const tronco = poli(PP([...esq, ...dir.reverse()]));
    const casca = [];
    const xc = (x, y) => { const u = (y - 6) / (topo - 6); return x + 18 * u * u; };
    const pelicula = []; // op.casca 'leve': duas faixas só, filetes com pontes, losangos desiguais e menores no alto,
    // com uma película de tinta no furo (a luz sai âmbar, não branca: nada de zíper ou fita bordada no meio da clareira)
    if (op.casca === 'leve') for (const [x, y0, n, k0] of [[-40, -300, 7, 1], [30, -640, 6, .78]]) {
      for (const l of [-1, 1]) for (let j = l < 0 ? 0 : 1; j < n;) {
        const m = 2 + (r() * 2 | 0), ya = y0 + 12 - j * 26, yb = y0 + 22 - Math.min(n, j + m) * 26, cs = [];
        for (let k = 0; k <= 4; k++) { const y = lerp(ya, yb, k / 4); cs.push([xc(x, y) + l * 12 * k0 + (r() - .5) * 1.2, y]); }
        casca.push(fenda(PP(cs), 1.8)); j += m;
      }
      for (let j = 0; j < n; j++) {
        const y = y0 - j * 26, z = k0 * (1 - .4 * j / n) * (.7 + r() * .45), cx = xc(x, y) + (r() - .5) * 2, w = 7 * z, h = 11 * z;
        const lo = PP([[cx, y - h], [cx + w, y + (r() - .5) * 2], [cx, y + h], [cx - w, y + (r() - .5) * 2]]);
        casca.push(poli(lo, true)); pelicula.push(it(poli(lo), .3));
      }
    } else for (const [x, y0, n] of [[-42, -290, 6], [30, -420, 9], [-10, -760, 5], [-46, -1000, 7]]) { // faixas entalhadas: dois filetes e losangos 1,6× entre eles
      for (const l of [-1, 1]) { const cs = []; for (let k = 0; k <= 8; k++) { const y = y0 + 14 - (n * 26 + 2) * k / 8; cs.push([xc(x, y) + l * 13 + (r() - .5) * 1.4, y]); } casca.push(fenda(PP(cs), 2.2)); }
      for (let j = 0; j < n; j++) {
        const y = y0 - j * 26, cx = xc(x, y) + (r() - .5) * 1.5, w = 7 + r() * 1.2, h = 11 + r() * 1.5;
        casca.push(poli(PP([[cx, y - h], [cx + w, y + (r() - .5) * 2], [cx, y + h], [cx - w, y + (r() - .5) * 2]]), true));
      }
    }
    // lâminas: [topo no tronco x, y, pé de fora, ondulação, tom]; de trás para a frente. Presas ao tronco até o chão;
    // a borda de fora desce íngreme e corre rente ao chão (côncava, em S); o tom e a fresta de luz separam uma da outra
    const LAM = op.lam || [[-84, -266, -340, 15, .55], [86, -250, 306, -16, .6], [-88, -212, -232, 12, .8], [84, -198, 196, -12, .84], [-70, -164, -150, 8, 1]]; // op.lam, op.expo: outro desenho

    const lam = LAM.map(([ax, ay, bx, onda, o]) => {
      const ed = [], sg = Math.sign(bx);
      for (let k = 0; k <= 18; k++) { const u = k / 18; ed.push([lerp(ax, bx, u) + (r() - .5) * 2, lerp(ay, 6, Math.pow(u, op.expo || .32)) + onda * Math.sin(u * PI * 2.3) * Math.sin(PI * u) + (r() - .5) * 1.4]); }
      const xi = o < 1 ? sg * (hw - 28) : ax; // o tronco é opaco: a lâmina que entra nele não escurece (sem emenda)
      return { ed, o, sg, bx, ay, xi, d: poli(PP([...ed, [bx - sg * 6, 9], [xi, 9], [xi, ay]])) };
    });
    // lâmina com pé próprio (6º e 7º campos de op.lam: índice da lâmina da frente e vão em px): a borda de dentro sobe do
    // chão a `vao` px da ponta da lâmina da frente, encontra a borda dela a 3/4 e corre 3 px por baixo dela até o tronco,
    // deixando um V de papel claro entre as duas pontas
    LAM.forEach(([, , , , , f, vao], i) => {
      if (f == null) return;
      const L = lam[i], F = lam[f], dentro = F.ed.slice(0, 15).reverse().map(([a, b]) => [a, b + 3]);
      L.d = poli(PP([...L.ed, [L.bx - L.sg * 6, 9], [F.bx + L.sg * vao, 9], ...dentro, [L.xi, F.ay + 3], [L.xi, L.ay]]));
    });
    const fresta = (ed, u0, u1, w) => { // faixa de papel rente à borda de fora da lâmina (separa do que está atrás)
      const cs = [];
      for (let k = Math.round(u0 * 18); k <= Math.round(u1 * 18); k++) {
        const a = ed[Math.max(0, k - 1)], b = ed[Math.min(18, k + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        let nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l;
        if (ny > 0) { nx = -nx; ny = -ny; }
        cs.push([ed[k][0] + nx * (w / 2 + 1.5), ed[k][1] + ny * (w / 2 + 1.5)]);
      }
      return poli(PP(fitaP(cs, u => w * Math.pow(Math.sin(PI * clamp(u * 1.04 + .02, 0, 1)), .6) + .5)), true);
    };
    const oco = (op.oco || [[-34, 8], [-38, -20], [-32, -44], [-36, -64], [-29, -80], [-20, -84], [-12, -92], [-4, -89], [4, -94], [11, -82], [17, -64], [22, -44], [19, -24], [28, 8]]) // boca larga e torta (op.oco: outro contorno)
      .map(([a, b]) => [a * (op.ocoK || 1) + (r() - .5) * 3, b * (op.ocoK || 1) + (r() - .5) * 3]); // op.ocoK: oco maior (cabe gente)
    const toca = [[92, 9], [96, 0], [106, -7], [120, -10], [134, -8], [145, -1], [149, 9]]; // boca da toca no pé da lâmina da direita
    const monte = [[66, 10], [72, 0], [86, -12], [104, -20], [124, -23], [142, -18], [156, -8], [164, 10]];
    const corpo = [it(lam[0].d, lam[0].o), it(lam[1].d, lam[1].o), it(poli(PP(monte)), .55),
      it(tronco),
      it(lam[2].d, lam[2].o), it(lam[3].d, lam[3].o), it(lam[4].d, lam[4].o)];
    const { gy, sent } = galhoSamauma(r, corpo, P, PP, gd, s, op);
    const fw = op.fresta || 1, fr = [fresta(lam[2].ed, .08, .92, 6 * fw), fresta(lam[3].ed, .08, .92, 6 * fw), fresta(lam[4].ed, .1, .94, 5 * fw)]; // op.fresta: largura × fator
    const sam = peca(C, nome, P(0, 0), { estado: { frente: 0, oco: 1, olhos: 0 }, fixo: op.fixo });
    const aro = poli(PP(fitaP(toca.slice(1, -1).map(([a, b]) => [a, b - 3.2]), 2.2)), true); // fresta de luz na borda de cima da toca
    sam.tinta(op.camada || 'L2', corpo, { furos: fr.join('') + casca.join('') + aro + poli(PP(oco), true) }); // op.camada: 'L3' (longe, mais clara)
    if (pelicula.length) sam.tinta(op.camada || 'L2', pelicula);
    sam.tinta(op.camada || 'L2', [it(poli(PP(oco))), it(poli(PP(toca)))], { P: op.camada ? undefined : { opacidade: 1, desfoque: .6 }, chave: 'oco' });
    sam.tinta('L1', [it(lam[3].d), it(lam[4].d), it(tronco)], { prof: 'L2', furos: poli(PP(oco)) + fr[1] + fr[2], chave: 'frente', trava: 'L2' });
    const ol = olhosOco(C, nome, sam, P(-6 * (op.ocoK || 1), -50 * (op.ocoK || 1)), s), em = (i, u) => P(...lam[i].ed[Math.round(u * 18)]);
    C.pontos[nome] = {
      oco: P(-4, 0), olhos: ol, galho: P(gd * sent, gy - 58), sapopema: em(3, .45), bater: P(270, 0), topoSapopema: em(2, .22), subirEsq: em(2, .42),
      subirDir: em(3, .38), atras: P(-150, 0), toca: P(120, 0), bromelia: em(2, .3),
    };
    return sam;
  }

  // Embaúba nova (couro recortado): de pé, range a cada golpe, tomba de perfil e fica caída — sempre a mesma.
  // estado extra: golpes 0..3 (lascas saltam, o entalhe aprofunda), range 0..1 (estala e balança), queda 0..1
  // (de pé → caída para o lado de op.tomba), escuro 0..1 (mais escura a cada volta, nos rastros). Pivô no corte.
  function embauba(C, nome, x0, s, op) {
    op = op || {};
    const r = S.rng(op.semente || 51), lado = op.tomba || -1, hc = 26 * s;
    const g = embaubaGen(r, x0, CHAO, 640 * s, s, { aneis: true, seca: true, folha: 1.15, grossura: 22 });
    const xc = g.cs[1][0], wc = g.wt * s * (1 - .42 * (hc + 4) / (640 * s * .74 + 4)), esq = xc - wc / 2, dirX = xc + wc / 2, yc = CHAO - hc;
    const v = pts => (lado < 0 ? pts : pts.map(([a, b]) => [2 * xc - a, b]));
    const cunha = k => v([[esq - 1, yc - 9 * s * k / 3], [esq + wc * .78 * k / 3, yc], [esq - 1, yc + 9 * s * k / 3]]);
    const p = peca(C, nome, lado < 0 ? [dirX, yc] : [esq, yc], { estado: { golpes: 0, range: 0, queda: op.caida ? 1 : 0, escuro: 0 }, fixo: op.fixo });
    const raizes = [it(fita([[xc - 30 * s, CHAO + 5], [xc - 10 * s, CHAO - 6], [xc, CHAO - 16]], 6 * s)), it(fita([[xc + 28 * s, CHAO + 5], [xc + 8 * s, CHAO - 5], [xc, CHAO - 14]], 6 * s))];
    const toco = [it(fita([[xc, CHAO + 4], [xc, yc + 1]], wc * 1.06)), ...raizes, ...its(ds(pc().samambaia(r, xc + 30 * s, CHAO + 8, 60, .6)))];
    const corte = poli([[xc - 900, yc], [xc + 900, yc], [xc + 900, -400], [xc - 900, -400]]), entalhe = poli(cunha(3), true);
    const desenho = (itens, P2, clip) => { // árvore = só o que fica acima do corte; toco = o resto
      const cx = caixa(ds(itens).concat([entalhe]), 3 * P2.desfoque + 4);
      let svg = svgTinta(itens, P2, cx, entalhe);
      if (clip) svg = svg.replace('<defs>', `<defs><clipPath id="ca"><path d="${corte}"/></clipPath>`).replace('<g opacity', '<g clip-path="url(#ca)"><g opacity').replace(/<\/svg>$/, '</g></svg>');
      return [elMascara(svg, cx, 'sb-tinta'), cx];
    };
    const giroF = lado * 89 * PI / 180, pv = p.pivo, cf = Math.cos(giroF), sf = Math.sin(giroF);
    const caida = mul([1, 0, 0, .42, 0, CHAO * .58], [cf, sf, -sf, cf, pv[0] - cf * pv[0] + sf * pv[1], pv[1] - sf * pv[0] - cf * pv[1]]);
    const copa = g.itens.slice(1), copaCaida = copa.map(x => it(transD(x.d, caida)));
    for (const [P2, ch] of [[PROF('L2'), null], [{ opacidade: 1, desfoque: .6 }, 'escuro']]) {
      p.anexar('L2', ...desenho([g.itens[0]], P2, true), { chave: ch });
      p.anexar('L2', ...desenho(copa, P2, true), { chave: ch ? 'escuroCopa' : 'copa' });
      p.anexar('L2', ...desenho(copaCaida, P2, false), { chave: ch ? 'escuroCaida' : 'caida', semGiro: true });
      p.anexar('L2', ...desenho(toco, P2, false), { chave: ch, semGiro: true });
    }
    for (let k = 1; k <= 3; k++) { // lascas que saltam a cada golpe
      const d = poli(cunha(k)) + (k > 1 ? poli(cunha(k - 1), true) : ''), cx = caixa([d], 4);
      p.anexar('L2', elMascara(svgTinta([it(d)], PROF('L2'), cx), cx, 'sb-tinta'), cx, { chave: 'lasca' + k, semGiro: true });
    }
    p.antes = () => {
      const E = p.estado, k = clamp((E.queda - .86) / .14, 0, 1), a = k * k * (3 - 2 * k);
      for (let i = 1; i <= 3; i++) E['lasca' + i] = clamp(i - E.golpes, 0, 1);
      E.copa = 1 - a; E.caida = a; E.escuroCopa = E.escuro * (1 - a); E.escuroCaida = E.escuro * a;
    };
    p.giro = t => lado * 89 * p.estado.queda + p.estado.range * 1.4 * Math.sin(TAU * 4.3 * t) * (1 - p.estado.queda);
    const alt = CHAO - g.topo[1];
    C.pontos[nome] = { base: [xc, CHAO], corte: [xc, yc], copa: g.topo, golpe: [xc + lado * 46 * s, CHAO], deitada: [xc + lado * alt * .4, CHAO - 26 * s], cortado: [xc + lado * 18 * s, yc] };
    return p;
  }

  // Riacho (de perfil, no rodapé): água rasa com ondinhas vazadas que correm, brilho na linha d'água, pedras e a
  // curva por onde o rio some no fundo. estado: o.
  // op.claro (mata): água clara, quase o papel, com ondinhas de tinta que correm e um reflexo de luz; o chão da
  // floresta precisa ser aberto no lugar da água (floresta({furos: {L2: riachoAgua(S.rng(61), x0, x1).agua}})).
  function riachoAgua(r, x0, x1, ys0) { // ys0: linha d'água (padrão CHAO + 6)
    const ys = ys0 || CHAO + 6, sup = [];
    for (let x = x0; x <= x1; x += 18) sup.push([x, ys + 1.5 * Math.sin(x * .02) + (r() - .5)]);
    const curva = cr([[x1, ys], [x1 + 70, ys - 5], [x1 + 140, ys - 15], [x1 + 196, ys - 22], [x1 + 150, ys - 15], [x1 + 100, ys + 12], [x1 + 60, 880]], 4);
    return { ys, sup, curva, agua: poli([...sup, ...curva, [x0, 880]]) };
  }
  function riacho(C, nome, x0, x1, op) {
    op = op || {};
    const r = S.rng(op.semente || 61), { ys, sup, curva, agua } = riachoAgua(r, x0, x1, op.ys), cl = !!op.claro;
    const p = peca(C, nome, [x0, ys], { fixo: op.fixo });
    // op.reflexos: n reflexos horizontais quebrados, vazados na água (frestas de papel paradas sob a correnteza)
    let rf = '';
    for (let i = 0; i < (op.reflexos || 0); i++) for (let x = x0 + 30 + i * 37 + r() * 40, y = ys + 15 + i * 12; x < x1 - 30 - i * 40; x += 30 + r() * 46) {
      const w = 18 + r() * 42; rf += `M${R1(x)} ${R1(y)}h${R1(w)}v2.6h${R1(-w)}Z`; x += w;
    }
    const cx = caixa([agua], 2), wrap = elMascara(`<svg xmlns="http://www.w3.org/2000/svg" width="${cx[2]}" height="${cx[3]}" viewBox="${cx.join(' ')}"><path fill-rule="evenodd" d="${agua}${rf}"/></svg>`, cx);
    wrap.style.opacity = op.tinta || (cl ? '.55' : '.5'); // op.tinta: densidade da água (sem claro: ondinhas vazadas)
    const eo = op.escalaOnda || 1.8, v = S.grafismos.variante('g-agua', { escala: eo, cor: cl ? '#fff' : undefined }), pw = 22 * eo, ww = cx[2] + 2 * pw;
    const hl = op.linhas ? op.linhas * 12 * eo : cx[3]; // op.linhas: quantas fileiras de ondinhas (sem claro)
    const ond = elMascara(`<svg xmlns="http://www.w3.org/2000/svg" width="${ww}" height="${cx[3]}"><defs>${v.svg}<mask id="m">` + (cl ? `<rect y="11" width="${ww}" height="${cx[3]}" fill="url(#${v.id})"/>` :
      `<rect width="${ww}" height="${cx[3]}" fill="#fff"/><rect y="9" width="${ww}" height="${hl}" fill="url(#${v.id})"/><rect y="4" width="${ww}" height="2.4" fill="#000"/>`) +
      `</mask></defs><rect width="${ww}" height="${cx[3]}" mask="url(#m)"/></svg>`, [-pw, 0, ww, cx[3]], 'sb-tinta');
    ond.style.willChange = 'transform';
    if (op.ondas != null) ond.style.opacity = op.ondas; // op.ondas: força das ondinhas (1)
    wrap.appendChild(ond);
    p.anexar('L2', wrap, cx);
    p.quadro = t => { ond.style.transform = `translateX(${mod((op.correnteza == null ? 8 : op.correnteza) * t, pw).toFixed(2)}px)`; };
    if (cl) { // reflexo da luz na água (tela, acima da tinta)
      const xm = lerp(x0, x1, .45), w = (x1 - x0) * .32;
      p.anexar('brilho', svgEl(`<defs><radialGradient id="rf-${C.nome}${nome}"><stop offset="0" stop-color="#FFF6DC" stop-opacity=".75"/><stop offset="1" stop-color="#FFF6DC" stop-opacity="0"/></radialGradient></defs>` +
        `<ellipse cx="${R1(xm)}" cy="${ys + 12}" rx="${R1(w)}" ry="7" fill="url(#rf-${C.nome}${nome})"/><ellipse cx="${R1(xm + w * .5)}" cy="${ys + 22}" rx="${R1(w * .45)}" ry="3.5" fill="url(#rf-${C.nome}${nome})"/>`), [0, 0, W, H]);
    }
    const pd = [fita(sup.concat(curva.slice(0, 4)), cl ? 3.4 : 2)]; // margem: linha d'água, pedras e capim na curva
    for (let x = x0 + 40 + r() * 60; x < x1 + 60; x += 70 + r() * 120) {
      const yy = r() < .45 ? ys + 1 : (cl ? 842 : 848) + r() * 10, R = (r() < .5 ? 10 : 18) + r() * 14;
      pd.push(poli(oval([x, yy], R, R * (.5 + r() * .2), (r() - .5) * .3, 11).map(([a, b]) => [a + (r() - .5) * (cl ? 6 : 2.5), Math.min(b, yy + R * .2)])));
    }
    if (op.capim !== false) for (let x = x1 + 30; x < x1 + 210; x += 22 + r() * 20) pd.push(...ds(pc().capim(r, x, ys - 2, 40 + r() * 30, .9)));
    p.tinta('L2', its(pd));
    C.pontos[nome] = { beber: [lerp(x0, x1, .72), ys + 2], margem: [x1 - 40, CHAO], curva: [x1 + 150, ys - 15] };
    return p;
  }

  // Barranco (L3): da beira sobe uma rampa de terra, depois a parede erodida até o beiço de capim que avança sobre
  // ela, com raízes pendendo; o alto segue até a borda direita. cen.pontos[nome].topo(x) → y do alto (por onde passa a vara).
  function barranco(C, nome, xa, yt, op) {
    op = op || {};
    const r = S.rng(op.semente || 91), s = PROF('L3').escala;
    const tf = x => yt + 7 * Math.sin((x - xa) * .011) + 3 * Math.sin((x - xa) * .037 + 1) - (x - xa) * .016;
    const h = CHAO - yt, k = [[xa - 70, CHAO + 8], [xa, CHAO - h * .04], [xa + 40, CHAO - h * .13], [xa + 58, CHAO - h * .25], [xa + 92, CHAO - h * .28], [xa + 102, CHAO - h * .4],
      [xa + 112, CHAO - h * .55], [xa + 136, CHAO - h * .62], [xa + 142, CHAO - h * .74], [xa + 154, CHAO - h * .86], [xa + 160, yt + 26], [xa + 186, yt + 10], [xa + 176, yt + 2], [xa + 200, tf(xa + 200) - 2]];
    const face = cr(k, 4).map(([a, b]) => [a + (r() - .5) * 3, b]);
    const pts = face.slice();
    for (let x = xa + 212; x <= W + M; x += 14) pts.push([x, tf(x) + (r() - .5) * 2]);
    const d = [poli([...pts, [W + M, H], [xa - 70, H]])];
    for (const [x, y] of [[xa + 75, CHAO - h * .27], [xa + 124, CHAO - h * .6]]) d.push(...ds(pc().samambaia(r, x, y + 4, 50, .55)));
    for (let i = 0; i < 7; i++) { // raízes pendendo do beiço
      const x = xa + 170 + i * 14 + r() * 10, y = tf(x) + 12, L = 50 + r() * 120, cs = [];
      for (let q = 0; q <= 8; q++) cs.push([x - q * 2 + 5 * Math.sin(q + i), y + L * q / 8]);
      d.push(fita(cs, u => 4.6 - 3.2 * u));
    }
    for (let x = xa + 170; x < W + M; x += 22 + r() * 34) d.push(...ds(pc().capim(r, x, tf(x) + 4, 30 + r() * 30, .85)));
    for (const x of op.palmeiras || [xa + 420, xa + 600]) d.push(...ds(pc().acai(r, x, tf(x) + 4, 360 * s, s * .8)));
    for (const x of [xa + 230, xa + 520]) d.push(...ds(pc().samambaia(r, x, tf(x) + 4, 70, .7)));
    d.push(...ds(pc().samambaia(r, xa + 60, CHAO - 40, 60, .6)));
    const p = peca(C, nome), fur = [];
    if (op.estratos) for (let x = xa + 236 + r() * 40; x < W; x += 70 + r() * 70) { // camadas de terra e raízes cortadas: fendas curtas
      const y = tf(x) + 40 + r() * 170, L = 26 + r() * 40, s2 = (r() - .5) * .12, cs = [];
      for (let q = 0; q <= 4; q++) cs.push([x + L * q / 4, y + s2 * L * q / 4 + (r() - .5) * .8]);
      fur.push(fenda(cs, .9 + r() * .6));
    }
    p.tinta(op.camada || 'L3', its(d), Object.assign(op.P ? { P: op.P } : {}, fur.length ? { furos: fur.join('') } : {}));
    C.pontos[nome] = { topo: tf, beira: [xa + 200, tf(xa + 200)], fim: [W, tf(W)] };
    return p;
  }

  // Toco do urutau: tronco morto partido em lascas no alto (o urutau pousa na ponta e vira galho), orelhas-de-pau.
  function toco(C, nome, x0, s, op) {
    op = op || {};
    const r = S.rng(op.semente || 101), ht = 300 * s, cs = [];
    for (let k = 0; k <= 12; k++) { const u = k / 12; cs.push([x0 + 16 * s * u * u + 3 * Math.sin(u * 5) * s, CHAO + 4 - ht * u]); }
    const tp = cs[12], d = [fita(cs, u => (44 - 16 * u) * s + (u < .06 ? 40 * s * (1 - u / .06) ** 2 : 0))];
    d.push(poli([[tp[0] - 15 * s, tp[1] + 6 * s], [tp[0] - 12 * s, tp[1] - 16 * s], [tp[0] - 6 * s, tp[1] - 4 * s], [tp[0] - 1 * s, tp[1] - 24 * s],
      [tp[0] + 4 * s, tp[1] - 6 * s], [tp[0] + 9 * s, tp[1] - 13 * s], [tp[0] + 15 * s, tp[1] + 6 * s]]));
    const b = cs[5];
    d.push(fita([b, [b[0] + 30 * s, b[1] - 18 * s], [b[0] + 44 * s, b[1] - 40 * s]], u => (12 - 5 * u) * s));
    for (const [k, l] of [[3, -1], [4, -1], [7, 1]]) {
      const q = cs[k], x = q[0] + l * 18 * s;
      d.push(poli(oval([x + l * 8 * s, q[1]], 16 * s, 6 * s, l * .1, 12).filter(pt => pt[1] <= q[1] + 1).concat([[x, q[1] + 2]])));
    }
    d.push(...ds(pc().samambaia(r, x0 - 30 * s, CHAO + 8, 80, .7)), ...ds(pc().capim(r, x0 + 34 * s, CHAO + 8, 40, .8)));
    const fur = [];
    for (const [a, y0, y1] of [[-8, .15, .5], [6, .3, .8], [-2, .55, .9]]) {
      const c2 = []; for (let k = 0; k <= 6; k++) { const q = cs[Math.round(lerp(y0, y1, k / 6) * 12)]; c2.push([q[0] + a * s + Math.sin(k) * 1.5, q[1]]); }
      fur.push(fenda(c2, 1.6));
    }
    const p = peca(C, nome, [x0, CHAO], op);
    p.tinta('L2', its(d), { furos: fur.join('') });
    C.pontos[nome] = { poleiro: [tp[0], tp[1] - 8 * s], base: [x0, CHAO] };
    return p;
  }

  // Ipê-amarelo: tronco tortuoso e galhos nus (silhueta) + cachos de flores em couro açafrão translúcido.
  // pose.flores 0..1 acende os cachos um a um, em ordem salteada; no fim, as flores caídas no chão.
  function ipe(C, nome, x0, s, op) {
    op = op || {};
    const r = S.rng(op.semente || 71), d = [], pontas = [], fur = [];
    const tc = cr([[0, 4], [-14, -80], [10, -160], [-8, -232], [6, -290]].map(([a, b]) => [x0 + a * s, CHAO + b * s]), 6);
    d.push(fita(tc, u => (36 - 15 * u) * s + (u < .05 ? 36 * s * (1 - u / .05) ** 2 : 0)));
    const rb = S.rng((op.semente || 71) + 5);
    for (let k = 0; k < 12; k++) { // fendas de casca curtas, tortas e desencontradas
      const q = tc[2 + Math.floor(rb() * (tc.length - 7))], a = -PI / 2 + (rb() - .5) * 1.5, L = (5 + rb() * 9) * s, ox = (rb() - .5) * 18 * s;
      fur.push(fenda([[q[0] + ox, q[1]], [q[0] + ox + Math.cos(a) * L * .5 + (rb() - .5) * 2.4, q[1] + Math.sin(a) * L * .5], [q[0] + ox + Math.cos(a) * L, q[1] + Math.sin(a) * L]], .9 + rb() * .9));
    }
    const top = tc[tc.length - 1];
    const galho = (p, a, w, nivel) => { // galhos tortos que se dividem; as pontas recebem flores
      const c2 = [p];
      let q = p;
      for (let k = 0; k < 2; k++) { a += (r() - .5) * .7; const L = (48 - nivel * 10 + r() * 26) * s; q = [q[0] + Math.cos(a) * L, q[1] + Math.sin(a) * L]; c2.push(q); }
      d.push(fita(cr(c2, 4), u => w * (1 - .55 * u)));
      pontas.push(c2[1], [lerp(c2[1][0], q[0], .5) + (r() - .5) * 14 * s, lerp(c2[1][1], q[1], .5) - 6 * s]);
      if (nivel < 2) for (let j = 0; j < 2 + (r() < .4); j++) galho(q, a + (j - .5) * (.9 + r() * .4), w * .55, nivel + 1);
      else pontas.push(q);
    };
    for (const a0 of [-2.6, -2.15, -1.7, -1.3, -.85, -.5]) galho([top[0] + (r() - .5) * 12 * s, top[1] + r() * 30 * s], a0 + (r() - .5) * .2, 15 * s, 0);
    const p = peca(C, nome + 'Arvore', [x0, CHAO], { fixo: op.fixo });
    p.tinta('L2', its(d), { furos: fur.join('') });
    // flores: cada cacho é uma bola de trombetas (pivô na ponta do galho)
    const tromb = 'M0 -1.3C4 -1.5 8 -2 10.6 -3.8C12 -5.6 14.4 -5.8 15.6 -4.6C16.8 -3.6 17.6 -1.8 17.1 0C17.6 1.8 16.8 3.6 15.6 4.6C14.4 5.8 12 5.6 10.6 3.8C8 2 4 1.5 0 1.3Z';
    const partes = [], ordem = [];
    pontas.forEach((q, i) => {
      let dd = '', lin = '';
      const n = 13 + (r() * 7 | 0);
      for (let j = 0; j < n; j++) {
        const a = -PI / 2 + (j / n - .5) * TAU * .95 + (r() - .5) * .6, k = (.9 + r() * .5) * s, rr = (3 + r() * 9) * s, m = mat(Math.cos(a) * rr, Math.sin(a) * rr - 4 * s, a, k);
        dd += transD(tromb, m); lin += transD('M5 0L13 0', m);
      }
      partes.push({ id: 'c' + i, pivo: [R1(q[0] - x0), R1(q[1] - CHAO)], junta: false, formas: [{ d: dd, cor: i % 3 ? '#FFD84A' : COR().acafraoClaro, contorno: .7 }], linhas: [{ d: lin, w: .6, op: .35 }] });
      ordem.push(S.hash(i * 7 + 3));
    });
    let caidas = '';
    for (let j = 0; j < 30; j++) caidas += transD(tromb, mat((r() - .5) * 340 * s, 2 + r() * 5, (r() - .5) * 1.2 + (r() < .5 ? PI : 0), .8 * s, .5 * s));
    partes.push({ id: 'chao', pivo: [0, 0], junta: false, formas: [{ d: caidas, cor: '#FFD84A', contorno: .7 }] });
    const pos = [];
    ordem.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]).forEach(([, i], k) => { pos[i] = k; });
    const fl = couro(C, nome, { nome: 'ipe', H: 100, partes, pose: { flores: op.flores == null ? 1 : op.flores } }, { x: x0, y: CHAO }, 'L2');
    const N = pontas.length, cx0 = pontas.reduce((a, q) => a + q[0], 0) / N, cy0 = pontas.reduce((a, q) => a + q[1], 0) / N;
    const halo = svgEl(`<defs><radialGradient id="sbi-${C.nome}${nome}"><stop offset="0" stop-color="#FFE27A" stop-opacity=".42"/><stop offset=".6" stop-color="#FFC94A" stop-opacity=".14"/><stop offset="1" stop-color="#FFC94A" stop-opacity="0"/></radialGradient></defs>` +
      `<ellipse cx="${R1(cx0)}" cy="${R1(cy0)}" rx="${R1(300 * s)}" ry="${R1(210 * s)}" fill="url(#sbi-${C.nome}${nome})"/>`);
    halo.style.mixBlendMode = 'screen';
    C.camadas.brilho.appendChild(halo);
    fl.motores.push(b => { halo.style.opacity = clamp(b.pose.flores * 1.2, 0, 1) * clamp(b.pose.opacidade, 0, 1); });
    fl.motores.push(b => {
      const f = b.pose.flores * (N + 4);
      for (let i = 0; i < N; i++) { const k = clamp(f - pos[i], 0, 1); b.extra.s['c' + i] = k < 1 ? k * k * (3 - 2 * k) * (1 + .25 * Math.sin(PI * k)) : 1; }
      b.extra.s.chao = clamp(f - N - 1, 0, 1);
    });
    C.pontos[nome] = { base: [x0, CHAO], copa: [top[0], top[1] - 140 * s] };
    return fl;
  }

  // Rancho da Vó: pau-a-pique com remendos de taipa caída (trama à mostra), telhado de sapê reto em camadas (sem
  // beiral curvo), porta aberta e janela acesas pelo candeeiro (gel açafrão), banquinho na porta, pilão, bananeira
  // e cerca de varas. estado extra: luz (0..1, brilho quente da porta e da janela). Gel em cen.pecas[nome + 'Gel'].
  function rancho(C, nome, xc, op) {
    op = op || {};
    const r = S.rng(op.semente || 81), y0 = CHAO, x0 = xc - 175, x1 = xc + 175, yt = y0 - 200, d = [], fur = [], trama = [], solto = [];
    // bananeira atrás: pseudocaule, folhas longas e rasgadas que pendem, cacho com o coração
    const bx = x0 + 6, bt = [bx + 14, y0 - 252];
    const atras = [fita([[bx, y0 + 4], [bx + 8, y0 - 130], bt], u => 26 - 9 * u)];
    for (const [a, L] of [[-2.75, 190], [-2.2, 215], [-1.62, 200], [-1.1, 220], [-.55, 205], [-3.1, 160], [-.05, 150]]) {
      const ang = a + (r() - .5) * .15;
      atras.push(folha(r, 'banana', mat(bt[0], bt[1], ang, L, L * .78), { curva: 1.7 * Math.sign(Math.cos(ang) || 1), rasgos: 5 + (r() * 4 | 0) }));
    }
    atras.push(fita(cr([bt, [bt[0] + 30, bt[1] + 10], [bt[0] + 44, bt[1] + 60], [bt[0] + 40, bt[1] + 120]], 4), 3.5));
    for (let k = 0; k < 4; k++) for (let j = 0; j < 5; j++) { const q = [bt[0] + 32 + j * 3 - k * 2, bt[1] + 24 + k * 13]; atras.push(geo().lente(q, [q[0] + 12, q[1] - 5], 2.6, -2, 4)); }
    atras.push(poli(oval([bt[0] + 40, bt[1] + 134], 9, 15, .1, 12)));
    if (op.bananeira !== false) peca(C, nome + 'Fundo', [xc, y0], { fixo: op.fixo }).tinta('L2', its(atras)); // op.bananeira false: sem a bananeira
    // gel do candeeiro atrás da porta e da janela
    const pd = [xc - 36, xc + 36, y0 - 166], jn = [xc + 88, xc + 146, y0 - 152, y0 - 98];
    const ret = (a, b, c, e) => `M${a} ${b}H${c}V${e}H${a}Z`;
    C.pecas[nome + 'Gel'] = couro(C, null, { nome: 'gel', H: 100, partes: [{ id: 'g', pivo: [0, 0], formas: [{ d: ret(pd[0] - xc - 2, pd[2] - y0 - 2, pd[1] - xc + 2, 4), cor: '#E9A43A', contorno: 0 },
      { d: ret(jn[0] - xc - 2, jn[2] - y0 - 2, jn[1] - xc + 2, jn[3] - y0 + 2), cor: '#F5C25A', contorno: 0 }] }] }, { x: xc, y: y0 }, 'L2');
    // parede, porta aberta (folha de tábuas), janela com tramela, remendos de taipa caída com a trama de varas à mostra
    d.push(poli([[x0 - 8, y0 + 4], [x0 - 6, yt - 4], [x1 + 6, yt - 4], [x1 + 8, y0 + 4]]));
    fur.push(poli([[pd[0], y0 + 6], [pd[0], pd[2]], [pd[1], pd[2]], [pd[1], y0 + 6]], true), poli([[jn[0], jn[3]], [jn[0], jn[2]], [jn[1], jn[2]], [jn[1], jn[3]]], true));
    d.push(poli([[xc + 115, jn[2] - 2], [xc + 120, jn[2] - 2], [xc + 120, jn[3] + 2], [xc + 115, jn[3] + 2]]), poli([[jn[0] - 2, y0 - 127], [jn[1] + 2, y0 - 127], [jn[1] + 2, y0 - 123], [jn[0] - 2, y0 - 123]]));
    d.push(poli([[jn[1] + 2, jn[2]], [jn[1] + 24, jn[2] + 4], [jn[1] + 24, jn[3] + 2], [jn[1] + 2, jn[3]]]), poli([[pd[0] - 30, y0 - 2], [pd[0] - 30, pd[2] + 10], [pd[0], pd[2]], [pd[0], y0 + 2]]));
    for (const x of [pd[0] - 22, pd[0] - 12]) fur.push(fenda([[x, y0 - 10], [x + .5, pd[2] + 20]], 1.2));
    // taipa caída: rasgos irregulares, rentes ao chão e aos cantos (onde o barro solta), nunca janelas redondas
    // trama do pau-a-pique: vazados pequenos e regulares (varas em pé e ripas deitadas, alternadas como palha trançada)
    for (const [xa, xb, ya, yb] of [[x0 + 14, pd[0] - 44, yt + 22, yt + 84], [jn[0] - 6, x1 - 12, jn[3] + 16, y0 - 64]])
      for (let y = ya, j = 0; y < yb; y += 9, j++) for (let x = xa + (j % 2) * 5, i = 0; x < xb; x += 10, i++)
        fur.push(poli((i + j) % 2 ? [[x - 1.3, y - 3.2], [x + 1.3, y - 3.2], [x + 1.3, y + 3.2], [x - 1.3, y + 3.2]] : [[x - 3.2, y - 1.2], [x + 3.2, y - 1.2], [x + 3.2, y + 1.2], [x - 3.2, y + 1.2]], true));
    for (const [cx0, cy0, rw, rh] of op.taipa || [[x0 + 46, y0 - 30, 24, 15], [x1 - 34, y0 - 40, 15, 19]]) { // barro caído: remendos pequenos
      const pts = oval([cx0, cy0], rw, rh, (r() - .5) * .3, 16).map(([a, b], i) => { const k = .55 + r() * .6 + (i % 2) * .2; return [cx0 + (a - cx0) * k, cy0 + (b - cy0) * k * (.8 + r() * .5)]; });
      const dentro = (x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) if ((pts[i][1] > y) !== (pts[j][1] > y) && x < (pts[j][0] - pts[i][0]) * (y - pts[i][1]) / (pts[j][1] - pts[i][1]) + pts[i][0]) c = !c; return c; };
      fur.push(poli(pts, true)); // a taipa caiu: abre um vão; por ele se vê a trama de varas em pé e ripas deitadas
      for (let x = cx0 - rw + 3 + r() * 4; x < cx0 + rw; x += 6 + r() * 7) {
        const ys = []; for (let y = cy0 - rh - 4; y < cy0 + rh + 4; y += 1.5) if (dentro(x, y)) ys.push(y);
        if (ys.length < 5) continue;
        const y1 = r() < .2 ? lerp(ys[0], ys[ys.length - 1], .4 + r() * .3) : ys[ys.length - 1] + 2, k = (r() - .5) * 5; // vara quebrada no meio
        trama.push(fita([[x, ys[0] - 2], [x + k * .5, lerp(ys[0], y1, .5)], [x + k, y1]], 2.2 + r() * 1.6));
      }
      const yl = cy0 + (r() - .5) * rh * .5, xs = []; // uma ripa deitada, torta, amarrando as varas
      for (let x = cx0 - rw - 4; x < cx0 + rw + 4; x += 1.5) if (dentro(x, yl)) xs.push(x);
      if (xs.length > 4) trama.push(fita([[xs[0] - 3, yl], [lerp(xs[0], xs[xs.length - 1], .5), yl + 2.5], [xs[xs.length - 1] + 3, yl - 1.5]], 2.4));
    }
    // telhado de sapê: trapézio reto, quatro camadas de palha (borda de fiapos vazada) e beiral com fiapos pendentes
    const ey = yt + 14, ry = yt - 150, e0 = x0 - 46, e1 = x1 + 46, r0 = x0 + 34, r1 = x1 - 34, beiral = [];
    for (let x = e1; x >= e0; x -= 4) { beiral.push([x, ey + (r() - .5) * 3]); if (r() < .75) beiral.push([x - 2, ey + 8 + r() * 20]); }
    d.push(poli([[r0, ry], [r1, ry], [e1, ey], ...beiral, [e0, ey]]));
    for (let x = r0 - 8; x < r1 + 8; x += 12) d.push(poli(oval([x, ry + 2], 8.5, 7, 0, 8)));
    for (const [x, a] of [[r0 - 4, -2.6], [r1 + 4, -.5], [r0 + 40, -2.9], [r1 - 60, -.2]]) d.push(fita([[x, ry], [x + Math.cos(a) * 26, ry + Math.sin(a) * 26]], u => 2 - 1.4 * u));
    for (let c = 1; c <= 4; c++) { // camadas de palha: a borda de cada uma é uma franja serrilhada (vão de luz) com fiapos acima
      const y0c = lerp(ry, ey, c / 5), xa = lerp(r0, e0, (y0c - ry) / (ey - ry)) + 6, xb = lerp(r1, e1, (y0c - ry) / (ey - ry)) - 6, fr = [];
      for (let x = xa, k = 0; x < xb; x += 2.6 + r() * 2.6, k++) fr.push([x, y0c + 3 * Math.sin(x * .03 + c * 2) + (k % 2 ? 3 + r() * 6 : -1 - r() * 2)]);
      fur.push(poli(fitaP(fr, u => 1.8 + Math.sin(PI * u)), true));
      for (let x = xa + 4; x < xb - 4; x += 6 + r() * 7) { const L = 8 + r() * 16, k = (x - xc) / (xb - xc || 1) * .3; fur.push(fenda([[x, y0c - 4 - L], [x + Math.sin(k) * L, y0c - 4]], .8 + r() * .6)); }
    }
    for (const [x, ang] of [[xc - 120, .1], [xc + 30, -.05], [xc + 150, .08]]) fur.push(fenda([[x, ry + 18], [x + Math.sin(ang) * 120, ey - 20]], 1.2)); // amarrios
    // banquinho de três pés diante da porta e pilão com a mão de pilão (fora da máscara da parede: a porta não os vaza)
    const bq = [xc, y0 - 36];
    if (op.banco !== false) solto.push(poli([[bq[0] - 26, bq[1] - 6], [bq[0] + 26, bq[1] - 6], [bq[0] + 24, bq[1] + 2], [bq[0] - 24, bq[1] + 2]]),
      fita([[bq[0] - 18, bq[1]], [bq[0] - 26, y0 + 4]], 5), fita([[bq[0] + 18, bq[1]], [bq[0] + 26, y0 + 4]], 5), fita([[bq[0] + 2, bq[1]], [bq[0] + 3, y0 + 2]], 4));
    const px0 = op.pilao || xc - 235;
    // pilão: tronco cilíndrico de cintura leve, boca com a borda de luz; a mão de pilão encostada ao lado
    solto.push(poli([[-21, 4], [-21.5, -14], [-19, -32], [-17.5, -42], [-18.5, -54], [-21, -68], [-22, -78], [22, -78], [21, -68], [18.5, -54], [17.5, -42], [19, -32], [21.5, -14], [21, 4]].map(([a, b]) => [px0 + a, y0 + b])) +
      poli([[-17, -73], [17, -73], [16, -71], [-16, -71]].map(([a, b]) => [px0 + a, y0 + b]), true) + fenda([[px0 - 19, y0 - 30], [px0 + 19, y0 - 30]], 1.4));
    solto.push(fita([[px0 + 36, y0 + 3], [px0 + 31, y0 - 70], [px0 + 24, y0 - 146]], u => 9.5 - 4.5 * Math.sin(PI * u)));
    for (let x = x1 + 90; x < x1 + 420; x += 62 + r() * 12) d.push(fita([[x, y0 + 4], [x + (r() - .5) * 6, y0 - 96 - r() * 16]], 6)); // cerca de varas
    for (const yy of [y0 - 72, y0 - 36]) d.push(fita(cr([[x1 + 80, yy], [x1 + 250, yy + (r() - .5) * 6], [x1 + 430, yy - 4]], 6), 4));
    const p = peca(C, nome, [xc, y0], { estado: { luz: 1 }, fixo: op.fixo });
    p.tinta('L2', its(d), { furos: fur.join('') });
    p.tinta('L2', its(trama.concat(solto)));
    p.anexar('brilho', svgEl(`<defs><radialGradient id="sbr-${C.nome}${nome}"><stop offset="0" stop-color="#FFC970" stop-opacity=".34"/><stop offset="1" stop-color="#FF9A3C" stop-opacity="0"/></radialGradient></defs>` +
      `<ellipse cx="${xc + 20}" cy="${y0 - 90}" rx="210" ry="150" fill="url(#sbr-${C.nome}${nome})"/>`), [0, 0, W, H], { chave: 'luz' });
    C.pontos[nome] = { banquinho: bq, porta: [xc, y0], janela: [(jn[0] + jn[1]) / 2, (jn[2] + jn[3]) / 2], chamine: [xc + 70, ry + 30], pilao: [px0, y0] };
    return p;
  }

  // Fumaça: fiapos que sobem, alargam e se desfazem (função do tempo). estado.o = intensidade
  function fumaca(C, nome, x, y, op) {
    op = op || {};
    const n = 8, g = svgEl(`<defs><filter id="sbf-${C.nome}${nome}" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="${op.blur || 6}"/></filter></defs>` +
      `<g filter="url(#sbf-${C.nome}${nome})">${'<ellipse/>'.repeat(n)}</g>`);
    const els = [...g.querySelectorAll('ellipse')];
    const p = peca(C, nome, [x, y], { estado: { o: op.o == null ? 1 : op.o } });
    p.anexar(op.camada || 'L2', g, [0, 0, W, H]);
    p.quadro = t => {
      const tinta = tintaAgora(C);
      for (let i = 0; i < n; i++) {
        const u = mod(t / (op.ciclo || 6) + i / n, 1), e = els[i];
        e.setAttribute('cx', (x + 30 * u * (op.vento || 1) + 10 * Math.sin(t * .8 + i * 2) * u).toFixed(1));
        e.setAttribute('cy', (y - (op.alto || 180) * u).toFixed(1));
        e.setAttribute('rx', (10 + 30 * u).toFixed(1)); e.setAttribute('ry', (8 + 18 * u).toFixed(1));
        e.setAttribute('fill', tinta);
        e.setAttribute('opacity', (.5 * Math.sin(PI * Math.sqrt(u)) * (1 - u * .5)).toFixed(3));
      }
    };
    return p;
  }
  // Folhas soltas: redemoinho, revoada ou queda (um punhado de folhas cujo trajeto é função de estado.p 0..1).
  // estado: x, y (de onde partem), p, raio, giro (voltas), dx, dy (deriva total), queda (px, gravidade), o
  function folhasSoltas(C, nome, op) {
    op = op || {};
    const r = S.rng(op.semente || 111), n = op.n || 14;
    const g = svgEl('<path d="M-9 0C-5 -3.4 3 -3.6 9 0C3 3.6 -5 3.4 -9 0Z"/>'.repeat(n));
    const els = [...g.querySelectorAll('path')], sem = els.map(() => [r(), r(), r(), r(), .6 + r() * .8]);
    if (op.desfoque) g.style.filter = `blur(${op.desfoque}px)`;
    const p = peca(C, nome, [0, 0], { estado: Object.assign({ x: 960, y: 700, p: 0, raio: 90, giro: 1, dx: 0, dy: 0, queda: 0, o: 1 }, op.estado) });
    p.anexar(op.camada || 'L2', g, [0, 0, W, H], { semGiro: true });
    p.quadro = () => {
      const E = p.estado, tinta = tintaAgora(C);
      g.style.transform = '';
      for (let i = 0; i < n; i++) {
        const [a, b, c, d, k] = sem[i], u = clamp((E.p - a * .25) / .75, 0, 1), e = els[i];
        if (u <= 0 || u >= 1) { e.setAttribute('opacity', 0); continue; }
        const th = c * TAU + E.giro * TAU * u * (.7 + b * .6), R = E.raio * (.25 + .75 * u) * (.5 + d * .6);
        const x = E.x + E.dx * u + Math.cos(th) * R, y = E.y + E.dy * u + Math.sin(th) * R * .45 + E.queda * u * u + 6 * Math.sin(u * 9 + a * 7);
        e.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(th * 57 + u * 300 * (b - .5)).toFixed(1)}) scale(${k.toFixed(2)} ${(k * (.5 + .5 * Math.abs(Math.sin(u * 11 + c * 9)))).toFixed(2)})`);
        e.setAttribute('fill', tinta);
        e.setAttribute('opacity', (E.o * Math.min(1, u * 6, (1 - u) * 4) * .85).toFixed(3));
      }
    };
    return p;
  }
  // Gotas que pingam das pontas das folhas (função do tempo). estado.o = intensidade
  function gotas(C, nome, fontes, op) {
    op = op || {};
    const g = svgEl('<ellipse/>'.repeat(fontes.length)), els = [...g.querySelectorAll('ellipse')];
    const sem = fontes.map((_, i) => [1.1 + S.hash(i + 31) * 1.6, S.hash(i + 57)]);
    const p = peca(C, nome, [0, 0], { estado: { o: op.o == null ? 1 : op.o } });
    p.anexar(op.camada || 'L1', g, [0, 0, W, H]);
    p.quadro = t => {
      const tinta = tintaAgora(C), chao = op.chao || CHAO + 24;
      fontes.forEach(([x, y], i) => {
        const [T, f] = sem[i], u = mod(t / T + f, 1), e = els[i], cai = u > .55 ? (u - .55) / .45 : 0, yy = y + 2 + 1100 * cai * cai;
        e.setAttribute('cx', x); e.setAttribute('cy', Math.min(yy, chao).toFixed(1));
        e.setAttribute('rx', (cai ? 1.8 : 1.2 + 1.8 * u / .55).toFixed(2)); e.setAttribute('ry', (cai ? 3.8 : 1.4 + 2.2 * u / .55).toFixed(2));
        e.setAttribute('fill', tinta);
        e.setAttribute('opacity', (yy > chao ? 0 : .8 * p.estado.o).toFixed(3));
      });
    };
    return p;
  }
  // Fila de vaga-lumes por um caminho (noite: sobe até o galho; aurora: vai à frente da vara).
  // estado: acesos 0..1 (acendem um a um, do começo para o fim), avanco 0..1 (a fila anda pelo caminho),
  // pisca 0..1 (pisca no ritmo da cantiga), o (apaga tudo de uma vez)
  function vagalumes(C, nome, caminho, op) {
    op = op || {};
    const n = op.n || 16, cs = cr(caminho, 12), comp = [0];
    for (let i = 1; i < cs.length; i++) comp.push(comp[i - 1] + Math.hypot(cs[i][0] - cs[i - 1][0], cs[i][1] - cs[i - 1][1]));
    const tot = comp[comp.length - 1], vao = op.ate != null ? comp[op.ate * 12] / tot : op.vao || 1; // op.ate: a fila (avanco 0) vai até o ponto ate do caminho
    const em = s => { let i = 1; while (i < comp.length - 1 && comp[i] < s) i++; const k = (s - comp[i - 1]) / ((comp[i] - comp[i - 1]) || 1); return [lerp(cs[i - 1][0], cs[i][0], k), lerp(cs[i - 1][1], cs[i][1], k)]; };
    const id = 'sbv-' + C.nome + nome, g = svgEl(`<defs><radialGradient id="${id}"><stop offset="0" stop-color="#F4FFB0" stop-opacity=".9"/><stop offset=".25" stop-color="#C8F25A" stop-opacity=".45"/><stop offset="1" stop-color="#B6F24A" stop-opacity="0"/></radialGradient></defs>` +
      `<g><circle r="${op.halo || 16}" fill="url(#${id})"/><circle r="${op.nucleo || 2.6}" fill="#F6FFC8"/></g>`.repeat(n)); // op.halo/op.nucleo: raios (px)
    if (op.tela) g.style.mixBlendMode = 'screen';
    const els = [...g.children].slice(1);
    const p = peca(C, nome, [0, 0], { estado: { acesos: 0, avanco: 0, pisca: 0, o: 1 } });
    p.anexar('brilho', g, [0, 0, W, H], { semGiro: true });
    p.quadro = t => {
      const E = p.estado;
      g.style.transform = '';
      for (let i = 0; i < n; i++) {
        const e = els[i], h = S.hash(i + 211), a = clamp(E.acesos * (n + 1) - i, 0, 1), q = em(mod(i / n * vao + E.avanco, 1) * tot);
        const x = q[0] + 7 * Math.sin(t * (1.1 + h) + i * 2.3), y = q[1] + 5 * Math.sin(t * (1.4 + h) + i * 1.7);
        const pis = 1 - E.pisca * (.5 + .5 * Math.sin(TAU * 1.6 * t - i * .55)) ** 4;
        e.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        e.setAttribute('opacity', (E.o * a * pis).toFixed(3));
      }
    };
    C.pontos[nome] = { inicio: cs[0], fim: cs[cs.length - 1] };
    return p;
  }
  // Olhos acesos no escuro (par de olhos que se abre e pisca). estado: o, piscar (0 aberto, 1 fechado), x, y, escala
  function olhos(C, nome, x, y, op) {
    op = op || {};
    const s = op.tam || 1, fid = `sbol-${C.nome}${nome}`;
    const g = svgEl(`<defs><filter id="${fid}" x="-2" y="-2" width="5" height="5"><feGaussianBlur stdDeviation="${3 * s}"/></filter></defs>` +
      `<g class="o"><g filter="url(#${fid})" fill="#FFC85A" opacity=".85"><ellipse cx="${x - 9 * s}" cy="${y}" rx="${6 * s}" ry="${4 * s}"/><ellipse cx="${x + 9 * s}" cy="${y}" rx="${6 * s}" ry="${4 * s}"/></g>` +
      `<g fill="#FFF0B8"><ellipse cx="${x - 9 * s}" cy="${y}" rx="${3.2 * s}" ry="${2.2 * s}"/><ellipse cx="${x + 9 * s}" cy="${y}" rx="${3.2 * s}" ry="${2.2 * s}"/></g></g>`);
    if (op.desfoque) g.style.filter = `blur(${op.desfoque}px)`;
    const p = peca(C, nome, [x, y], { estado: { o: 0, piscar: 0 }, fixo: op.fixo });
    p.anexar('brilho', g, [0, 0, W, H]);
    const gi = g.querySelector('.o');
    p.quadro = () => gi.setAttribute('transform', `translate(0 ${y}) scale(1 ${(1 - .92 * p.estado.piscar).toFixed(3)}) translate(0 ${-y})`);
    return p;
  }

  // Sombra do Curupira recortada do próprio boneco (Sombras.bonecos.defs.curupira), para o fundo (L3/L4: pequena e
  // borrada) ou gigante (escala alta: a borra cresce junto). Pés em (x, y); dir -1 vira. estado: x, y, escala, o, rot
  function silhuetaCurupira(a) {
    const def = S.bonecos.defs.curupira(), P = {}, Mx = {}, vis = {};
    def.partes.forEach(p => { P[p.id] = p; });
    const ang = Object.assign({}, def.pose && def.pose.a, a);
    let d = '', fur = '';
    const visita = p => {
      if (vis[p.id]) return; vis[p.id] = 1;
      if (p.pai) visita(P[p.pai]);
      const pai = p.pai ? Mx[p.pai] : [1, 0, 0, 1, 0, 0], pp = p.pai ? P[p.pai].pivo : [0, 0];
      let m = mul(pai, [1, 0, 0, 1, p.pivo[0] - pp[0], p.pivo[1] - pp[1]]);
      const g = ((p.ang0 || 0) + (ang[p.id] || 0)) * PI / 180;
      if (g) m = mul(m, mat(0, 0, g, 1));
      Mx[p.id] = m;
      if (p.id === 'olhoAceso') return;
      for (const f of p.formas) d += transD(f.d, m);
      if (p.id === 'cabeca') for (const f of p.furos || []) fur += transD(f, m);
    };
    def.partes.forEach(visita);
    return { d, fur };
  }
  function sombraCurupira(C, nome, camada, x, y, op) {
    op = op || {};
    const sl = silhuetaCurupira(op.pose), k = op.tam || 1, m = mat(x, y, 0, k * (op.dir || 1), k);
    const p = peca(C, nome, [x, y], { estado: Object.assign({ o: 0 }, op.estado), fixo: op.fixo });
    p.tinta(camada, [it(transD(sl.d, m))], { furos: transD(sl.fur, m), P: op.P });
    return p;
  }

  // Galho que despenca (pivô no meio; começa invisível, no alto). Tronco caído para o Curupira erguer e arremessar.
  function galhoQuebrado(C, nome, x, y, op) {
    op = op || {};
    const r = S.rng(op.semente || 121), d = [], L = op.comp || 300;
    const cs = cr([[x - L / 2, y + 10], [x - L / 6, y - 4], [x + L / 6, y + 6], [x + L / 2, y - 12]], 5);
    d.push(fita(cs, u => 18 - 12 * u), poli([[x - L / 2 - 2, y + 2], [x - L / 2 - 12, y + 6], [x - L / 2 - 4, y + 10], [x - L / 2 - 14, y + 16], [x - L / 2, y + 19]]));
    for (let i = 0; i < 6; i++) {
      const b = cs[2 + i * 3] || cs[cs.length - 1], a = -PI / 2 + (r() - .5) * 2.2, l = 40 + r() * 50, q = [b[0] + Math.cos(a) * l, b[1] + Math.sin(a) * l];
      d.push(fita([b, q], u => 6 - 4 * u));
      for (let j = 0; j < 5; j++) { const c = [lerp(b[0], q[0], .4 + j * .15) + (r() - .5) * 10, lerp(b[1], q[1], .4 + j * .15)]; d.push(geo().lente(c, [c[0] + (r() - .5) * 30, c[1] + 14 + r() * 8], 4.5, (r() - .5) * 5, 5)); }
    }
    const p = peca(C, nome, [x, y], { estado: { o: op.o == null ? 0 : op.o }, fixo: op.fixo });
    p.tinta(op.camada || 'L2', its(d));
    return p;
  }
  function troncoCaido(C, nome, x, s, op) {
    op = op || {};
    const r = S.rng(op.semente || 131), L = 540 * s, y = CHAO - 30 * s, d = [], fur = [], cs = [];
    for (let k = 0; k <= 14; k++) cs.push([x - L / 2 + L * k / 14, y + 3 * Math.sin(k * .7) * s]);
    d.push(fita(cs, u => (68 - 18 * u) * s + 4 * Math.sin(u * 23) * s));
    const e = cs[14];
    d.push(poli([[e[0] - 4, e[1] - 26 * s], [e[0] + 14 * s, e[1] - 18 * s], [e[0] + 6 * s, e[1] - 8 * s], [e[0] + 22 * s, e[1] - 2 * s], [e[0] + 8 * s, e[1] + 6 * s], [e[0] + 16 * s, e[1] + 16 * s], [e[0] - 4, e[1] + 26 * s]]));
    for (const [k, a, l] of [[4, -1.9, 50], [9, -1.2, 36], [11, -2.2, 26]]) { const b = cs[k]; d.push(fita([b, [b[0] + Math.cos(a) * l * s, b[1] - 20 * s + Math.sin(a) * l * s]], u => (14 - 7 * u) * s)); }
    d.push(...ds(pc().samambaia(r, cs[6][0], y - 26 * s, 60, .55)));
    for (let k = 0; k < 9; k++) { const x0 = x - L / 2 + 30 * s + k * 55 * s, yy = y + (r() - .5) * 26 * s; fur.push(fenda([[x0, yy], [x0 + (24 + r() * 26) * s, yy + (r() - .5) * 4]], 1.5)); }
    fur.push(poli(oval([x - L / 2 + 6 * s, y], 6 * s, 22 * s, 0, 12), true));
    const p = peca(C, nome, [x, y], { fixo: op.fixo });
    p.tinta('L2', its(d), { furos: fur.join('') });
    C.pontos[nome] = { centro: [x, y], pontaEsq: [x - L / 2, CHAO], pontaDir: [x + L / 2, CHAO] };
    return p;
  }
  // Moita (onde o inhambu se esconde): samambaias e folhas largas; treme com estado.tremor
  function moita(C, nome, x, op) {
    op = op || {};
    const r = S.rng(op.semente || 141), d = [...ds(pc().samambaia(r, x, CHAO + 8, 120, 1)), ...ds(pc().samambaia(r, x + 40, CHAO + 8, 90, .8))];
    for (const [a, L] of [[-2.4, 90], [-1.9, 110], [-1.2, 100], [-.7, 80]]) d.push(folha(r, 'banana', mat(x + 10, CHAO - 10, a, L, L * .8), { curva: .8 * Math.sign(Math.cos(a)), rasgos: 2 }));
    peca(C, nome, [x, CHAO]).tinta('L2', its(d));
    C.pontos[nome] = [x, CHAO - 40];
  }
  // Rastros de queixada no chão (cascos fendidos), na camada dos rastros. estado.o
  function rastroQueixada(C, nome, x0, x1, op) {
    op = op || {};
    const r = S.rng(op.semente || 151), d = [];
    for (let x = x0; x < x1; x += 22 + r() * 30) {
      const m = mat(x, 798 + r() * 22, (r() - .5) * .8 + (r() < .5 ? PI : 0), 1, .6);
      d.push(poli(mapa(oval([0, -3], 6, 2.6, 0, 9), m)), poli(mapa(oval([0, 3], 6, 2.6, 0, 9), m)));
    }
    peca(C, nome, [x0, CHAO], { estado: { o: op.o == null ? 0 : op.o }, fixo: op.fixo }).tinta('rastros', its(d), { P: { opacidade: .55, desfoque: .4 } });
  }
  // Feixe de luz: faixas quentes diagonais vindas do alto sobre a clareira. estado.o
  function feixe(C, nome, x) {
    const id = 'sbx-' + C.nome + nome, g = svgEl(`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6DC" stop-opacity=".55"/><stop offset=".75" stop-color="#FFE9B4" stop-opacity=".16"/><stop offset="1" stop-color="#FFE9B4" stop-opacity="0"/></linearGradient>` +
      `<filter id="${id}f" x="-.5" y="-.2" width="2" height="1.4"><feGaussianBlur stdDeviation="14"/></filter></defs><g filter="url(#${id}f)" fill="url(#${id})">` +
      `<path d="M${x - 130} 40L${x + 30} 40L${x + 330} 860L${x + 50} 860Z"/><path d="M${x + 80} 40L${x + 150} 40L${x + 480} 860L${x + 360} 860Z" opacity=".75"/></g>`);
    g.style.mixBlendMode = 'screen';
    peca(C, nome, [x, 40]).anexar('brilho', g, [0, 0, W, H]);
  }
  // Pano (noite): sombra de pano que desce do alto e cobre metade da luz (L0). estado.y: -720 (fora) → 0
  function pano(C, nome) {
    const r = S.rng(161), pts = [[-M, -40], [W + M, -40]];
    for (let x = W + M; x >= -M; x -= 20) pts.push([x, 420 + 70 * Math.sin(x * .004 + 1) + 40 * Math.sin(x * .011) + (r() - .5) * 6]);
    peca(C, nome, [960, 0], { estado: { y: -720 } }).tinta('L0', [it(poli(pts))], { P: { opacidade: .7, desfoque: 22 } });
  }
  // Nuvens que cobrem a lua (L4, bem borradas; massas irregulares, nada de nuvem estilizada). estado.x, o
  function nuvens(C, nome) {
    const d = [];
    for (const [cx0, cy0, w, h] of [[1040, 250, 520, 70], [1300, 330, 420, 55], [820, 310, 360, 46]]) {
      const pts = [];
      for (let i = 0; i < 40; i++) { const t = i / 40 * TAU, k = 1 + .18 * Math.sin(t * 3 + cx0) + .1 * Math.sin(t * 7 + cy0); pts.push([cx0 + Math.cos(t) * w / 2 * k, cy0 + Math.sin(t) * h / 2 * k * (Math.sin(t) < 0 ? 1.3 : .7)]); }
      d.push(poli(pts));
    }
    peca(C, nome, [960, 300], { estado: { o: 0 } }).tinta('L4', its(d), { P: { opacidade: .55, desfoque: 14 } });
  }
  // Árvore emergente que estremece com as pancadas nas sapopemas (estado.tremor)
  function arvoreQueTreme(C, nome, camada, x, op) {
    op = op || {};
    const r = S.rng(op.semente || 181), s = PROF(camada).escala;
    const f = op.tipo === 'buriti' ? buriti(r, x, 816, (op.alt || 900) * (op.k || 1) * s, s, true) : emergente(r, x, 816, (op.alt || 900) * (op.k || 1), s); // op.tipo
    peca(C, nome, [x, CHAO]).tinta(camada, f, op.P ? { P: op.P } : undefined);
  }

  // Serra do Mar (abertura): cristas em L5 e L4 cobertas de mata, com a trilha estreita até o cume.
  function serra(C, nome) {
    const r = S.rng(191), perfil = (pts, amp) => {
      const o = [[-M - 60, H]];
      cr(pts, 10).forEach(([x, y]) => o.push([x, y - amp * Math.abs(Math.sin(x * .07)) - amp * .5 * Math.abs(Math.sin(x * .19 + 1))]));
      o.push([W + M + 60, H]);
      return o;
    };
    const p5 = perfil([[-300, 540], [-80, 450], [150, 360], [330, 420], [520, 320], [700, 400], [880, 350], [1060, 430], [1250, 300], [1430, 380], [1620, 340], [1800, 440], [2000, 380], [2200, 500]], 9);
    const p4 = perfil([[-300, 720], [0, 650], [250, 570], [480, 610], [700, 490], [860, 418], [960, 372], [1060, 410], [1240, 505], [1450, 570], [1650, 530], [1900, 630], [2200, 720]], 5);
    const yEm = (pp, x) => pp.reduce((b, q) => (Math.abs(q[0] - x) < Math.abs(b[0] - x) ? q : b))[1];
    const d4 = [poli(p4)];
    for (let x = -M; x < W + M; x += 26 + r() * 50) if (Math.abs(x - 960) > 40) // brenhas: palmeiras e embaúbas miúdas na crista
      d4.push(...ds(r() < .6 ? pc().palmeira(r, x, yEm(p4, x) + 6, 40 + r() * 50, .3) : pc().acai(r, x, yEm(p4, x) + 6, 90 + r() * 40, .3)));
    const trilha = cr([[742, 870], [820, 800], [705, 742], [800, 682], [880, 622], [812, 564], [884, 506], [930, 448], [906, 410], [957, 380]], 8);
    peca(C, nome + 'L5', [960, 806]).tinta('L5', [it(poli(p5))], { P: { opacidade: .24, desfoque: 7 } });
    peca(C, nome, [960, 806]).tinta('L4', its(d4), { P: { opacidade: .4, desfoque: 3.5 }, furos: fenda(trilha, u => 9 - 4 * u) });
    C.pontos[nome] = { cume: [960, 372], trilha: trilha[0] };
  }

  // Morro (abertura): o cume da serra em primeiro plano, recorte nítido em L2 que entra pela base do painel do meio, com
  // capim, pedras e uma touceira; pontos[nome].cume = onde ficam as oferendas. estado.y: sobe de baixo / afunda
  function morro(C, nome) {
    const r = S.rng(197), pts = [[540, 900]];
    for (let x = 560; x <= 1360; x += 10) { const u = (x - 960) / 400; pts.push([x, 650 + 210 * u * u * (1.2 - .2 * Math.abs(u)) + 5 * Math.sin(x * .05) + 3 * Math.sin(x * .13) + (r() - .5) * 2]); }
    pts.push([1380, 900]);
    const o = [poli(pts)];
    for (let x = 610; x < 1320; x += 22 + r() * 30) { const k = (x - 960) / 400, y = 652 + 210 * k * k * (1.2 - .2 * Math.abs(k)); if (Math.abs(x - 965) > 70) o.push(...ds(pc().capim(r, x, y + 4, 26 + r() * 26, 1))); }
    for (const [x, R] of [[1030, 13], [884, 9], [1120, 16]]) { const k = (x - 960) / 400, y = 650 + 210 * k * k; o.push(poli(oval([x, y - R * .3], R, R * .6, (r() - .5) * .4, 9))); }
    o.push(...ds(pc().samambaia(r, 790, 700, 70, .7)), ...ds(pc().samambaia(r, 1170, 716, 60, .6)));
    peca(C, nome, [960, 650]).tinta('L2', its(o));
    C.pontos[nome] = { cume: [962, 652] };
  }
  // Lembrança (vo): bordas do papel desfocadas por folhas grandes junto da luz (L0). estado.o
  function lembranca(C, nome) {
    const r = S.rng(211), d = [], p = peca(C, nome, [960, 540]), cx = [-M, 0, W + 2 * M, H];
    for (const [x, y, a, L] of [[-150, -120, .8, 560], [2070, -100, PI - .8, 540], [-170, 1080, -.7, 560], [2090, 1080, PI + .7, 540]])
      d.push(folha(r, 'costela', mat(x, y, a, L), { curva: .2 }));
    p.tinta('L0', its(d), { P: { opacidade: .5, desfoque: 24 } });
    p.anexar('L0', elMascara(`<svg xmlns="http://www.w3.org/2000/svg" width="${cx[2]}" height="${cx[3]}" viewBox="${cx.join(' ')}"><defs><radialGradient id="v" cx="960" cy="560" r="1000" gradientUnits="userSpaceOnUse" gradientTransform="translate(960 560) scale(1 .62) translate(-960 -560)">` +
      `<stop offset=".5" stop-opacity="0"/><stop offset=".78" stop-opacity=".35"/><stop offset="1" stop-opacity=".7"/></radialGradient></defs><rect x="${-M}" width="${cx[2]}" height="${H}" fill="url(#v)"/></svg>`, cx, 'sb-tinta'), cx);
  }

  // ---------- objetos de cena em couro (Sombras.bonecos.criar: mesmo acabamento dos bonecos) ----------
  const um = (nome, formas, extra) => ({ nome, H: 100, partes: [Object.assign({ id: 'obj', pivo: [0, 0], formas }, extra)] });
  function defPena(op) { // pena da cauda da arara, vermelha com a ponta anil; pivô no cálamo, aponta para +x
    op = op || {};
    const fur = [];
    for (let x = 16; x < 92; x += 6.5) for (const s of [-1, 1]) fur.push(`M${x} ${s * 2.2}L${x + 5} ${s * 5.6}L${x + 5.9} ${s * 5}L${x + .9} ${s * 1.6}Z`);
    return um('pena', [{ d: 'M8 -1.6C20 -5.6 40 -7.6 62 -7.8C70 -7.8 74 -7.5 77 -7.1L77 6.7C70 7 62 7 50 6.6C32 6 18 4.6 8 1.6Z', cor: op.cor || COR().urucum },
      { d: 'M76 -7.1C85 -7.1 93 -6 97.6 -3.6C101 -1.8 101.2 1.4 98.2 3.2C93 5.6 85 6.8 76 6.7Z', cor: op.ponta || COR().anil },
      { d: 'M-1 -1.3L10 -1.7L10 1.7L-1 1.3Z', cor: COR().couroCru }],
    { furos: fur, linhas: [{ d: 'M-1 0C30 .5 60 .3 98 0', w: 1.1 }] });
  }
  function defFumo() { // pedaço de fumo de rolo: corda torcida, enrolada e amarrada com embira; pivô no meio
    const fur = [];
    for (let x = -17; x <= 15; x += 5.4) fur.push(`M${x - 2.6} -8.4L${x - 1.4} -8.6L${x + 3.4} 8.6L${x + 2.2} 8.8Z`);
    return um('fumo', [{ d: 'M-20 -9C-12 -11.6 12 -11.6 20 -9C23.4 -6 23.4 6 20 9C12 11.6 -12 11.6 -20 9C-23.4 6 -23.4 -6 -20 -9Z', cor: '#A0602E' },
      { d: 'M20 -2.6C25 -3.4 29 -1.4 30.4 2.6C27.6 1.8 24 1.8 20 3Z', cor: '#A0602E' }, { d: 'M-7.4 -11L-3.6 -11.2L-3.6 11.2L-7.4 11Z', cor: COR().palha }],
    { furos: fur, linhas: [{ d: 'M-21 -4C-10 -6 10 -6 21 -4M-21 4C-10 6 10 6 21 4', w: .9, op: .5 }] });
  }
  function defMachado() { // o mesmo machado de casco de jabuti do boneco; pivô na ponta do cabo (para fincar no chão)
    const c = S.bonecos.defs.curupira().partes.find(p => p.id === 'machado');
    if (c) return { nome: 'machado', H: 100, partes: [{ id: 'obj', pivo: [0, -18], formas: c.formas, furos: c.furos, linhas: c.linhas }] };
    return um('machado', [{ d: 'M-2.6 17C-3 0 -4 -30 -1.6 -47L3.2 -46.4C1 -30 3 0 2.8 17Z', cor: COR().madeira }, { d: 'M1 -43C4 -51 12 -54 19 -52C27 -50 31 -43 30 -36C30 -28 25 -23 17 -22C10 -22 4 -26 1.6 -31C0 -35 0 -39 1 -43Z', cor: '#C49450', vazado: { motivo: 'g-jabuti' } }]);
  }
  function defEspingarda(parte) { // deitada, cano para +x: inteira, ou os dois pedaços da coronha partida no punho
    const c = COR(), lascas = 'L-14.6 3L-19 1.6L-13.4 -.4L-18.6 -1.6L-14 -2.8';
    const soleira = { d: 'M-18 -3.4C-30 -3.6 -42 -2.6 -50 -1.2C-60 .2 -68 1 -73 1.6C-75.6 2 -76.6 5 -75.8 8.6C-75 12.6 -73 15.6 -70.6 15.8C-62 13.6 -50 10.6 -36 7.4C-30 6.2 -24 5.2 -18 4.8' + lascas + 'Z', cor: c.madeiraClara };
    const frente = [{ d: 'M-6 -3.6C-10 -3.5 -14 -3.4 -18 -3.4L-14 -2.8L-18.6 -1.6L-13.4 -.4L-19 1.6L-14.6 3L-18 4.8C-14 4.2 -10 3.8 -6 3.6Z', cor: c.madeiraClara },
      { d: 'M8 -5.4L198 -5.4L198 -2.4L8 -2.4Z', cor: c.cano }, { d: 'M193 -5.4L194.6 -8L196.2 -5.4Z', cor: c.cano },
      { d: 'M12 -2.6L94 -2.6C96.6 -2.4 97 1.6 94 2.4L12 3.4Z', cor: c.madeiraClara }, { d: 'M-2.4 2.6C-3.2 8 .6 11.8 5.6 11.6C9 11.4 10.6 8.6 10.2 3.2Z', cor: c.cano },
      { d: 'M-7.4 -5L12.4 -5L12.4 3.4L-7.4 4Z', cor: '#3A322C' }];
    const extra = { furos: ['M.4 4C.2 7.2 2.2 9.4 5.2 9.4C7.4 9.4 8.4 7.6 8.2 4Z'], linhas: [{ d: 'M-4 -5L-6.4 -9.6L-1.6 -9.6', w: 1.8, op: 1 }] };
    if (parte === 'coronha') return um('coronha', [soleira]);
    if (parte === 'cano') return um('cano', frente, extra);
    return um('espingarda', [soleira].concat(frente), extra);
  }
  function defOferendas() { // três flechas de pé (ponta estreita de taquara para cima, emplumação perto do chão) e um abanador
    const c = COR(), partes = [];   // trançado, enterrados num tufo de capim; pivôs no chão (pose.o.X para mostrar)
    [[-30, 150, -9, c.urucum], [-8, 126, 4, c.couroCru], [16, 112, 15, c.acafrao]].forEach(([x, L, a, pena], i) => {
      const fur = [];
      for (let y = -50; y < -16; y += 5) for (const sd of [-1, 1]) fur.push(`M${sd * 3} ${y}L${sd * 6.6} ${y + 3.4}L${sd * 6.6} ${y + 4.4}L${sd * 3} ${y + 1.2}Z`);
      partes.push({ id: 'flecha' + (i + 1), pivo: [x, 0], ang0: a, junta: false, formas: [
        { d: `M-1.4 6L-1.3 ${-L}L1.3 ${-L}L1.4 6Z`, cor: c.madeiraClara },
        { d: `M-2.4 ${-L + 3}C-3 ${-L - 8} -1.4 ${-L - 22} 0 ${-L - 34}C1.4 ${-L - 22} 3 ${-L - 8} 2.4 ${-L + 3}Z`, cor: c.couroCru }, // ponta de taquara
        { d: `M-2.2 ${-L + 2}L2.2 ${-L + 2}L2.2 ${-L + 9}L-2.2 ${-L + 9}Z`, cor: c.palhaSombra },                              // amarração
        { d: 'M-1.4 -54C-5 -50 -7.6 -40 -7.4 -16L-1.4 -12Z', cor: pena }, { d: 'M1.4 -54C5 -50 7.6 -40 7.4 -16L1.4 -12Z', cor: pena },
        { d: 'M-2.2 -12L2.2 -12L2.2 -7L-2.2 -7Z', cor: c.palhaSombra }],
      furos: fur, linhas: [{ d: `M0 ${-L + 12}L0 -56`, w: .7, op: .4 }] });
    });
    partes.push({ id: 'abanador', pivo: [38, 0], ang0: -17, junta: false, formas: [ // abano de palha: leque largo de borda redonda, encostado nas flechas
      { d: 'M-2.6 6L-2.2 -17L2.2 -17L2.6 6Z', cor: c.palhaSombra },
      { d: 'M-7 -15L-30 -55C-25 -67 25 -67 30 -55L7 -15Z', cor: c.palha, vazado: { motivo: 'g-trancado', escala: 1, margem: 3.4 } },
      { d: 'M-30.6 -55.6C-25 -68.4 25 -68.4 30.6 -55.6L28.4 -52.6C23 -63.4 -23 -63.4 -28.4 -52.6Z', cor: c.palhaSombra, contorno: 0 }, // debrum da borda
      { d: 'M-8 -18L8 -18L7.4 -13L-7.4 -13Z', cor: c.palhaSombra }],
    linhas: [{ d: 'M-2.2 -12L2.2 -8M-2.2 -6L2.2 -2M-2.2 0L2.2 4M2.2 -12L-2.2 -8M2.2 -6L-2.2 -2M2.2 0L-2.2 4', w: .9, op: .6 }] }); // cabo trançado
    let capim = ''; // tufo de capim e pedra que enterram as bases (na frente de tudo)
    for (let i = 0; i < 15; i++) { const x = -52 + i * 7.6, h = 14 + (i * 7 % 11) * 1.6, g = (i % 3 - 1) * 4 + (x > 0 ? 3 : -3); capim += `M${x - 2.6} 8L${x + g} ${-h}L${x + 2.6} 8Z`; }
    partes.push({ id: 'capim', pivo: [0, 0], junta: false, formas: [{ d: 'M-62 8C-60 -2 -50 -8 -38 -7C-30 -6 -26 -2 -24 8Z', cor: '#6A5A44' }, { d: capim, cor: '#5A4A2A', contorno: 0 }] });
    return { nome: 'oferendas', H: 100, partes, pose: { o: { flecha1: 0, flecha2: 0, flecha3: 0, abanador: 0 } } };
  }
  function defFlorBromelia() { // haste da bromélia grande com brácteas vermelhas de ponta açafrão (a cor da cena do guardião)
    let d = '', d2 = '';
    for (let i = 0; i < 12; i++) {
      const y = -14 - i * 12, L = 30 - i * 1.7, lado = i % 2 ? 1 : -1, m = mat(lado * 3, y, -PI / 2 + lado * (1 - i * .05), 1, lado);
      d += transD(`M0 -3.6C${L * .4} -6.4 ${L * .8} -5 ${L} -1C${L * .8} 3 ${L * .4} 4.4 0 3.6Z`, m);
      d2 += transD(`M${L * .62} -3C${L * .8} -3 ${L * .92} -2 ${L} -1C${L * .9} .8 ${L * .78} 1.2 ${L * .62} 1.4Z`, m);
    }
    return um('flor', [{ d: 'M-3 6L-2.4 -150L2.4 -150L3 6Z', cor: '#6E8A3A' }, { d, cor: COR().urucum }, { d: d2, cor: COR().acafrao, contorno: 0 }]);
  }
  const DEFS = { pena: defPena, fumo: defFumo, machado: defMachado, espingarda: () => defEspingarda(), coronha: () => defEspingarda('coronha'), cano: () => defEspingarda('cano') };
  const objeto = (C, nome, def, pose, camada) => couro(C, nome, def, Object.assign({ opacidade: 0 }, pose), camada);

  // Novelo de cipó (desenho vivo em couro): cresce ao ser enrolado e se desfaz em espirais pelo chão.
  // estado: x, y (centro da bola), enrolado 0..1, desenrolado 0..1, fio (ângulo do fio solto, graus), escala, o.
  // As espirais saem de op.chao [x, y] para o lado op.lado (±1).
  function novelo(C, nome, op) {
    op = op || {};
    const r = S.rng(op.semente || 221), cor = op.cor || '#B3A24E', esc = '#4A3E16', ch = op.chao || [900, CHAO + 4], lado = op.lado || 1, R = op.raio || 15;
    const pts = [];
    if (op.espirais) { // op.espirais: n rodilhas no chão (vistas de lado, achatadas), uma depois da outra, op.raioEsp
      const Re = op.raioEsp || 40; pts.push(ch.slice());
      for (let k = 0; k < op.espirais; k++) for (let a = 0, cx = ch[0] + lado * (Re * 1.3 + k * Re * (op.passoEsp || 2.5)); a <= 2.7 * PI; a += .14) {
        const rr = 3 + (Re - 3) * a / (2.7 * PI), b = a + k * 1.3; pts.push([cx + lado * rr * Math.cos(b), ch[1] - 2 - .5 * rr * Math.sin(b) + 1.2 * Math.sin(a * 2.3)]);
      }
    } else for (let u = 0; u <= 13 * PI; u += .12) { const k = .75 + .5 * Math.sin(u * .23 + 1); pts.push([ch[0] + lado * (7.5 * u - 15 * k * Math.sin(u)), ch[1] - 7 * k * (1 - Math.cos(u)) + 1.5 * Math.sin(u * 2.3)]); }
    const acum = [0];
    for (let i = 1; i < pts.length; i++) acum.push(acum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const comp = acum[acum.length - 1], dEsp = 'M' + pts.map(q => R1(q[0]) + ' ' + R1(q[1])).join('L'), folhas = [];
    let fol = '';
    for (let i = 8; i < pts.length; i += 14 + (r() * 10 | 0)) { folhas.push(acum[i] / comp); fol += `<path d="${folha(r, 'coracao', mat(pts[i][0], pts[i][1], -PI / 2 + (r() - .5) * 2, 11 + r() * 5), { jit: .01 })}"/>`; }
    const g = svgEl(`<g class="esp"><path d="${dEsp}" fill="none" stroke="${esc}" stroke-width="${op.espirais ? 7.4 : 5.6}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${dEsp}" fill="none" stroke="${cor}" stroke-width="${op.espirais ? 4.6 : 3.4}" stroke-linecap="round" stroke-linejoin="round"/><g fill="${cor}" stroke="${esc}" stroke-width="1">${fol}</g></g>` +
      `<g class="bola"><path class="fio" fill="none" stroke="${esc}" stroke-width="4.4" stroke-linecap="round"/><path class="fio" fill="none" stroke="${cor}" stroke-width="2.6" stroke-linecap="round"/>` +
      `<circle fill="${cor}" stroke="${esc}" stroke-width="1.4"/><circle fill="url(#g-manchas)" opacity=".8"/><path class="voltas" fill="none" stroke="${op.voltas || esc}" stroke-width="${op.voltas ? 2 : 1.2}" opacity=".85"/></g>`);
    g.style.mixBlendMode = 'multiply';
    const esp = [...g.querySelectorAll('.esp > path')], fes = [...g.querySelectorAll('.esp g path')], bola = g.querySelector('.bola');
    const circ = [...bola.querySelectorAll('circle')], volt = bola.querySelector('.voltas'), fios = [...bola.querySelectorAll('.fio')];
    const voltas = Array.from({ length: 10 }, (_, i) => [S.hash(i + 5) * PI, .25 + S.hash(i + 9) * .55]);
    const p = peca(C, nome, [0, 0], { estado: Object.assign({ x: ch[0] - lado * 30, y: ch[1] - R, enrolado: 0, desenrolado: 0, fio: 200, escala: 1, o: 0 }, op.estado) });
    p.anexar('bonecos', g, [0, 0, W, H], { semGiro: true });
    p.quadro = () => {
      const E = p.estado, q = clamp(E.desenrolado, 0, 1), en = clamp(E.enrolado, 0, 1), rb = R * Math.sqrt(en * (1 - q)) * E.escala;
      g.style.transform = '';
      for (const e of esp) e.setAttribute('stroke-dasharray', `${(comp * q).toFixed(1)} ${comp + 10}`);
      fes.forEach((e, i) => e.setAttribute('opacity', folhas[i] < q ? 1 : 0));
      bola.setAttribute('transform', `translate(${E.x.toFixed(1)} ${E.y.toFixed(1)})`);
      for (const c of circ) c.setAttribute('r', Math.max(0, rb).toFixed(2));
      let dv = '';
      for (let i = 0; i < Math.ceil(en * 10) && rb > 2; i++) { const [a, k] = voltas[i]; dv += transD(`M-1 0C-.5 ${-k} .5 ${-k} 1 0`, mat(0, 0, a, rb)); }
      volt.setAttribute('d', dv);
      const solto = (1 - en) * 80 * E.escala, a = E.fio * PI / 180;
      let df = '';
      if (solto > 1 && q === 0) { df = `M${R1(Math.cos(a) * rb)} ${R1(Math.sin(a) * rb)}`; for (let k = 1; k <= 8; k++) { const u = k / 8; df += `L${R1(Math.cos(a) * (rb + solto * u) + 4 * Math.sin(u * 9) * E.escala)} ${R1(Math.sin(a) * (rb + solto * u) + 6 * u * u * E.escala)}`; } }
      if (q > 0 && rb > .5) df = `M0 0Q${R1((ch[0] - E.x) / 2)} ${R1((ch[1] - E.y) * .9)} ${R1(ch[0] - E.x)} ${R1(ch[1] - E.y)}`;
      for (const f of fios) f.setAttribute('d', df);
    };
    return p;
  }
  // Carta de Anchieta (abertura): couro cru claro e translúcido, bordas irregulares, linhas de escrita vazadas (fendas de
  // luz onduladas, sem letras). Enrolada: um rolo que afina no meio, com volutas em espiral nas pontas. Duas peças de
  // couro (folha com o rolo de cima; rolo de baixo, que desce ao abrir). estado: y (começa em -900), abrir 0..1, o
  // Carta de Anchieta (1560): folha de couro cru claro e liso, dobrada em três. Desce dobrada (só se vê o verso da aba
  // do meio) e se desdobra em dois tempos: a aba do meio cai do vinco de cima e a de baixo sai de trás dela. Os vincos
  // ficam como fendas finas de luz, as linhas de texto são fendas vazadas, a borda é de recorte de faca e o canto de baixo
  // se curva um pouco. Desenho próprio (o rig dos bonecos não dobra em y). estado: y (-900 → 0), abrir 0..1, o
  function carta(C, nome, x, y) {
    const r = S.rng(231), w = 290, h = 113, cor = '#E6C38C', verso = '#D2A86E', traco = '#6B5233';
    const painel = (cima, baixo, canto) => { // contorno local [0, h]; bordas de faca só onde a folha acaba
      const pts = [];
      for (let xx = -w / 2; xx <= w / 2; xx += 14.5) pts.push([xx, .8 + (cima ? (r() - .5) * 3.4 + (r() < .15 ? 2.4 : 0) : 0)]);
      for (let yy = 12; yy < h - 6; yy += 12) pts.push([w / 2 + (r() - .5) * 3 - (r() < .12 ? 3 : 0), yy]);
      const bx = [];
      for (let xx = w / 2; xx >= -w / 2; xx -= 14.5) bx.push([xx, h - .8 + (baixo ? (r() - .5) * 3.4 - (r() < .15 ? 2.4 : 0) : 0)]);
      if (canto) { bx.splice(0, 2); pts.push([w / 2 - 1, h - 22]); bx.unshift([w / 2 - 27, h - 1]); } // canto cortado: a ponta se curva
      for (let yy = h - 12; yy > 6; yy -= 12) bx.push([-w / 2 + (r() - .5) * 3 + (r() < .12 ? 3 : 0), yy]);
      return poli(pts.concat(bx));
    };
    const texto = (n0, curta) => { // linhas de escrita: fendas finas e trêmulas
      let d = '';
      for (let k = 0; k < 4; k++) {
        const yy = 20 + k * 24, x0 = -w / 2 + 24 + (n0 === 0 && k === 0 ? 46 : 0), x1 = w / 2 - 22 - (curta && k === 3 ? 120 : r() * 30), cs = [];
        for (let xx = x0; xx <= x1; xx += 3) cs.push([xx, yy + 2.2 * Math.sin(xx * .55 + k + n0) * (.6 + .4 * Math.sin(xx * .07 + k * 3)) + (Math.sin(xx * .11 + k + n0) > .93 ? -4 : 0)]);
        d += poli(fitaP(cs, 1.7));
      }
      return d;
    };
    const lado = (d, fur, c) => `<path d="${d}${fur || ''}" fill="${c}" fill-rule="evenodd"/><path d="${d}" fill="none" stroke="${traco}" stroke-width="1.2" stroke-linejoin="round" opacity=".7"/>`;
    const pa = painel(true, false), pb = painel(false, false), pc2 = painel(false, true, true), cachos = 'M' + [[w / 2 - 27, h - 1], [w / 2 - 1, h - 22], [w / 2 - 15, h - 15]].map(q => q.join(' ')).join('L') + 'Z';
    let selo = 'M'; // lacre de urucum no verso da aba (fechada, ela lê como carta de 1560, não como papel em branco)
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, k = 13 * (1 + .08 * Math.sin(3 * a + 1) + (i % 5 === 2 ? .1 : 0)); selo += `${R1(Math.cos(a) * k)} ${R1(h / 2 + Math.sin(a) * k * .9)}${i < 15 ? 'L' : 'Z'}`; }
    selo = `<path d="${selo}" fill="${COR().urucum}" stroke="#5A1E0C" stroke-width="1" opacity=".95"/><path d="M-5 ${h / 2 - 4}L5 ${h / 2 + 4}M5 ${h / 2 - 4}L-5 ${h / 2 + 4}" stroke="#7A2A12" stroke-width="1.6"/>`;
    const svg = svgEl(`<g transform="translate(${x} ${y})" opacity=".94"><g>${lado(pa, texto(0), cor)}</g>` +
      `<g data-a="b"><g data-a="c"><g data-f>${lado(pc2, texto(2, true), cor)}<path d="${cachos}" fill="${verso}" stroke="${traco}" stroke-width="1" opacity=".9"/></g><g data-v>${lado(pc2, '', verso)}</g></g>` +
      `<g data-f>${lado(pb, texto(1), cor)}</g><g data-v>${lado(pb, '', verso)}${selo}</g></g></g>`);
    const gB = svg.querySelector('[data-a="b"]'), gC = svg.querySelector('[data-a="c"]');
    const p = peca(C, nome, [x, y], { estado: { y: -900, abrir: 0 } });
    p.anexar('bonecos', svg, [0, 0, W, H]);
    const lados = (g, sg) => { for (const e of g.children) if (e.dataset.f != null || e.dataset.v != null) e.style.display = (e.dataset.f != null) === sg > 0 ? '' : 'none'; };
    let ult = '';
    p.quadro = () => {
      const k = clamp(p.estado.abrir, 0, 1), e = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
      const s1 = -1 + 2 * e(k * 2), s2 = -1 + 2 * e(k * 2 - 1), q1 = Math.abs(s1) < .03 ? .03 : s1, q2 = Math.abs(s2) < .03 ? .03 : s2, ch = q1.toFixed(3) + q2.toFixed(3);
      if (ch === ult) return;
      ult = ch;
      gB.setAttribute('transform', `translate(0 ${h}) scale(1 ${q1.toFixed(3)})`); gC.setAttribute('transform', `translate(0 ${h}) scale(1 ${q2.toFixed(3)})`);
      lados(gB, q1); lados(gC, q1 * q2);
    };
    return p;
  }
  // Pena de escrever (silhueta): pena de ganso longa com o bico cortado; pivô no bico. Começa fora do papel (y -900)
  function penaEscrever(C, nome, x, y, ang) {
    const r = S.rng(241), m = mat(x, y, ang, 1), fur = [], cont = [[0, 0], [16, -2], [40, -4]];
    for (let k = 0; k <= 16; k++) { const u = k / 16; cont.push([60 + u * 230, -4 - 22 * Math.sin(PI * Math.pow(u, .8)) - (r() < .15 ? 4 : 0)]); }
    cont.push([300, 0]);
    for (let k = 16; k >= 0; k--) { const u = k / 16; cont.push([60 + u * 230, 4 + 12 * Math.sin(PI * Math.pow(u, .7))]); }
    cont.push([40, 4], [16, 2]);
    for (let xx = 70; xx < 280; xx += 9) fur.push(fenda(mapa([[xx, -3], [xx + 10, -14 * Math.sin(PI * (xx - 60) / 230) - 3]], m), 1.2));
    peca(C, nome, [x, y], { estado: { y: -900 } }).tinta('L2', [it(poli(mapa(cont, m)) + fenda(mapa([[6, 0], [298, -1]], m), 1.2))], { furos: fur.join('') });
  }
  // Vareta sozinha, sem boneco (abertura). estado: x, y (ponta com o laço de arame), ang (graus), o
  function vareta(C, nome) {
    const g = svgEl('<g style="filter:blur(.6px)" stroke="#170C05" stroke-linecap="round" fill="none"><path stroke-width="2.6" opacity=".6"/><circle r="3" stroke-width="1.2" opacity=".7"/></g>');
    const v = g.querySelector('path'), a = g.querySelector('circle');
    const p = peca(C, nome, [0, 0], { estado: { x: -100, y: 520, ang: 10, o: 0 } });
    p.anexar('bonecos', g, [0, 0, W, H], { semGiro: true });
    p.quadro = () => {
      const E = p.estado, xb = E.x - Math.tan(E.ang * PI / 180) * (920 - E.y);
      g.style.transform = '';
      v.setAttribute('d', `M${R1(E.x)} ${R1(E.y)}L${R1(xb)} 920`); a.setAttribute('cx', R1(E.x)); a.setAttribute('cy', R1(E.y));
    };
    return p;
  }

  // ---------- os cenários de cada cena ----------
  // abertura: papel nu; a serra sobe em L5/L4 (estado.camadas.L5/L4.y) com a trilha; o cume em primeiro plano (morro,
  // L2, estado.y) com as oferendas (pontos.morro.cume)
  // (pose.o.flecha1…3, abanador; penaA/penaB.pose.opacidade); carta e pena de escrever descem; vareta sozinha;
  // sombrinha borrada que cruza o fundo (L4).
  function abertura(p) {
    const C = novo(p, 'abertura');
    serra(C, 'serra');
    morro(C, 'morro');
    const [cx, cy] = C.pontos.morro.cume;
    objeto(C, 'oferendas', defOferendas(), { x: cx, y: cy + 4, escala: 1, opacidade: 1 });
    const sway = (b, t) => { b.extra.a.obj = 7 * Math.sin(TAU * .7 * t + b.pose.fase) * C.estado.vento; };
    for (const [nome, x, cor, ponta, a, fase] of [['penaA', cx - 70, COR().urucum, COR().anil, -96, 0], ['penaB', cx + 60, COR().acafrao, COR().urucum, -80, 1.7]]) {
      const b = objeto(C, nome, defPena({ cor, ponta }), { x, y: cy + 6, escala: .9, rot: a });
      b.pose.fase = fase; b.motores.push(sway);
    }
    carta(C, 'carta', 372, 150);             // no painel da esquerda: não tapa a serra nem a trilha
    penaEscrever(C, 'penaEscrever', 452, 388, -1.05);
    vareta(C, 'vareta');
    sombraCurupira(C, 'sombrinha', 'L4', 300, 760, { tam: .7, P: { opacidade: .45, desfoque: 4 } });
    const r = S.rng(199), s3 = PROF('L3').escala, fr = [horizonte(r, -M, W + M, 860, 70)]; // franja da mata (L3): sobe em "mãe do mato"
    for (let x = -M + 40; x < W + M; x += 110 + r() * 120) fr.push(...ds(r() < .45 ? pc().acai(r, x, 852, (420 + r() * 160) * s3, s3) : r() < .6 ? sororoca(r, x, 852, 300 * s3, s3) : palmeiraLonge(r, x, 852, (520 + r() * 140) * s3, s3)));
    peca(C, 'franja', [960, 852], { estado: { y: 640 } }).tinta('L3', its(fr));
    return C;
  }
  // mata: samaúma no centro (olhos no oco), riacho à esquerda, buritis em L3 à direita (onça passa atrás: insira o
  // boneco antes de cen.pecas.buritis.els[0].e), costelas, helicônia e capim em L1.
  // Riacho claro no painel da esquerda (o chão é aberto no lugar da água), samaúma de lâminas, embaúba à direita
  // onde pousam as araras (pontos.poleiro: dois [x, y] no galho), bromélias de centro vermelho (sapopema e chão),
  // helicônia colorida em L1 à esquerda, costela-de-adão subindo pelo tronco da esquerda.
  function mata(p) {
    const C = novo(p, 'mata'), r = S.rng(7), s = PROF('L3').escala, r2 = S.rng(77), RX = [40, 470], YS = CHAO - 12;
    floresta(C, r, { clareira: [640, 1280], troncosL2: [-20], semCapim: [[-M, 640]], heliconiaX: 66, costelaEsq: [[36, 800], [60, 390]], semL4: [[900, 1080]],
      furos: { L2: riachoAgua(S.rng(61), RX[0], RX[1], YS).agua } });
    // água com tinta leve (.35), ondinhas vazadas que correm 8 px/s e três reflexos quebrados; sem capim na curva (a veada bebe ali)
    riacho(C, 'riacho', RX[0], RX[1], { ys: YS, tinta: .3, reflexos: 3, capim: false, escalaOnda: 2.3, linhas: 1 });
    // sapopemas em aba triangular (borda de fora reta), cada uma com o pé num ponto do chão e um V de papel entre as pontas;
    // tons bem separados e fresta larga; oco em fenda triangular torta; casca com duas faixas só
    samauma(C, 'samauma', 960, .92, { galho: 1, sentar: 215, semente: 31, laminas: true, expo: 1.15, fresta: 1.75, casca: 'leve',
      lam: [[-84, -266, -360, 6, .5, 2, 46], [86, -250, 320, -6, .65, 3, 44], [-88, -212, -250, 5, .8, 4, 40], [84, -198, 200, -5, .9], [-70, -164, -150, 4, 1]],
      oco: [[-60, 8], [-57, -6], [-52, -20], [-48, -31], [-42, -43], [-37, -52], [-29, -61], [-22, -70], [-13, -77], [-6, -84], [-1, -91], [2, -79], [5, -66],
        [3, -56], [8, -42], [11, -28], [13, -14], [18, 8]] });
    peca(C, 'buritis', [1560, CHAO]).tinta('L3', its([1400, 1540, 1700].flatMap(x => ds(buriti(r2, x, 816, (760 + r2() * 100) * s, s, true)))));
    const r3 = S.rng(79), g = embaubaGen(r3, 1610, CHAO, 560, 1, { aneis: true, folha: 1.1, cai: 1.05 }), b = g.cs[11], q = [b[0] - 190, b[1] - 34];
    const rc = cr([b, [b[0] - 70, b[1] - 6], [b[0] - 140, b[1] - 24], q], 6), ramo = [fita(rc, u => 12 - 7 * u)];
    const topoRamo = xx => rc.reduce((m, p) => (Math.abs(p[0] - xx) < Math.abs(m[0] - xx) ? p : m))[1] - 4.5; // face de cima do galho
    for (const [k, a, R] of [[1, -2.3, 54], [.82, -1.2, 46]]) { const c = [lerp(b[0], q[0], k), lerp(b[1], q[1], k) - 34]; ramo.push(fita([[lerp(b[0], q[0], k), lerp(b[1], q[1], k) - 4], c], 2.6), folhaEmbauba(r3, c, R, -PI / 2 + (a + 1.75) * .3, .26, 1.05, true)); }
    peca(C, 'embauba', [1610, CHAO]).tinta('L2', g.itens.concat(its(ramo)));
    const poleiro = [lerp(b[0], q[0], .7), lerp(b[0], q[0], .2)].map(xx => [xx, topoRamo(xx)]); // ~95 px entre as duas; y = face de cima do galho
    const bro = C.pontos.samauma.bromelia, rb = S.rng(83);
    peca(C, 'bromeliaSap', bro).tinta('L2', its(bromelia(rb, bro[0], bro[1] + 4, 34, 1, true))); // desce junto com a samaúma (estado.y)
    peca(C, 'bromelias', [1330, CHAO]).tinta('L2', its(bromelia(rb, 1330, CHAO + 6, 46, 1, true)));
    couro(C, 'bromeliaFlor', defFlorBromelia(), { x: bro[0], y: bro[1] - 6, escala: .34 }, 'L2');
    couro(C, 'bromeliaFlor2', defFlorBromelia(), { x: 1330, y: CHAO - 8, escala: .44, rot: 6 }, 'L2');
    Object.assign(C.pontos, { onca: { de: [1880, 816], ate: [1300, 816] }, tatu: C.pontos.samauma.toca, veada: C.pontos.riacho.beber, poleiro });
    return C;
  }
  // guardiao: a samaúma mais perto (direita), clareira com feixe de luz, bromélia grande com flor vermelha, tronco caído,
  // moita do inhambu, machado de casco de jabuti (para cravar no chão), redemoinho de folhas e sopro de folhas
  function guardiao(p) {
    const C = novo(p, 'guardiao'), r = S.rng(12);
    floresta(C, r, { clareira: [360, 1600], troncosL2: [-30], costelaRecorte: true }); // mata média rala até o tronco: a sombra que sai do oco se lê
    feixe(C, 'feixe', 520);
    // samaúma no painel da direita, de lâminas triangulares: a da esquerda (lam 2) desce reta até ~1424, onde ele encosta
    samauma(C, 'samauma', 1700, 1.15, { galho: -1, sentar: 250, semente: 37, laminas: true, expo: .9,
      lam: [[86, -266, 360, -14, .55], [86, -250, 306, -14, .6], [-90, -236, -240, 8, .8], [84, -198, 196, -10, .84], [-72, -150, -150, 6, 1]] });
    troncoCaido(C, 'tronco', 330, 1);
    moita(C, 'moita', 735);  // moita e bromélia juntas no terço esquerdo do painel do meio: o centro fica de chão limpo
    peca(C, 'bromelia', [820, CHAO]).tinta('L2', its(bromelia(S.rng(9), 820, CHAO + 4, 60, 1, true)));
    couro(C, 'bromeliaFlor', defFlorBromelia(), { x: 820, y: CHAO - 40, escala: 1.25 }, 'L2');
    objeto(C, 'machado', defMachado(), { x: 900, y: CHAO + 6, escala: 1.4, rot: 18 });
    folhasSoltas(C, 'redemoinho', { estado: { x: 1100, y: 790, raio: 60, giro: 2, dx: -700, dy: -40 } });
    folhasSoltas(C, 'sopro', { semente: 113, estado: { x: 960, y: 700, raio: 160, giro: 1.4, dy: -120, queda: 90 } });
    Object.assign(C.pontos, { bromelia: [820, CHAO], clareira: [1000, CHAO] });
    return C;
  }
  // beira do riacho (cacadores, aviso): panorama sem fim para K.camera; no repouso (câmera 0): riacho e samaúma à
  // esquerda, buritis em L3 no meio (olhos e sombra do Curupira entre eles), embaúba nova à direita
  function beiraDoRiacho(p, nome, op) {
    const C = novo(p, nome), r = S.rng(21), s3 = PROF('L3').escala, r2 = S.rng(78);
    floresta(C, r, Object.assign({ periodo: 2400 }, op.floresta));  // op.floresta, op.riacho [x0, x1], op.samauma [x, s, op],
    riacho(C, 'riacho', ...(op.riacho || [-M - 1400, 360]));      // op.buritis [x…], op.embaubaX, op.olhos (false: sem olhos/sombra)
    samauma(C, 'samauma', ...(op.samauma || [300, .82, { galho: 1, sentar: 210, semente: 41 }]));
    peca(C, 'buritis', [1100, CHAO]).tinta('L3', its((op.buritis || [880, 1010, 1290, 1640]).flatMap(x => ds(buriti(r2, x, 816, (780 + r2() * 120) * s3, s3, true)))));
    embauba(C, 'embauba', op.embaubaX || 1500, 1, { caida: op.caida, semente: 53 });
    if (op.olhos === false) return C;
    olhos(C, 'olhos', 1150, 560, { tam: .8, desfoque: 1.2 });
    sombraCurupira(C, 'sombra', 'L3', 1150, 816, { tam: .9, P: { opacidade: .55, desfoque: 2.5 } });
    return C;
  }
  function cacadores(p) {
    // mundo arrumado para as câmeras da cena (guardiao-e-cacadores.js): entrada e caça perto de x 0…2000 (mata média
    // rala no meio do papel), a embaúba entra pela direita; riacho e samaúma longe, à esquerda (câmera -4000), onde a
    // lâmina comprida da frente (lam 4) esconde o Tião agachado até a cintura
    const C = beiraDoRiacho(p, 'cacadores', {
      floresta: { ralo: [[430, 1180]], limpoL2: [[0, 540], [600, 880], [1240, 1760], [1990, 2400]] },
      riacho: [-3920, -3470], embaubaX: 1500, buritis: [125, 405, 1290, 1640], olhos: false,
      samauma: [-2280, 1, { galho: 1, sentar: 210, semente: 41, laminas: true, expo: .85,
        lam: [[-84, -240, -330, 9, .55], [86, -250, 306, -10, .6], [-85, -200, -300, 6, .8], [84, -198, 196, -8, .84], [-80, -290, -520, 4, 1]] }],
    });
    objeto(C, 'pena', defPena(), { x: 980, y: 300, escala: .95, rot: 70 });
    folhasSoltas(C, 'folhas', { estado: { x: 1500, y: 300, raio: 120, giro: .6, dx: -500, dy: 300, queda: 200 } });
    return C;
  }
  function aviso(p) {
    // a água segue sob a câmera da saída (-2100); sub-bosque variado, com clareira atrás do painel do meio (câmera -1400)
    const C = beiraDoRiacho(p, 'aviso', { caida: true, riacho: [-3000, 360], floresta: { subosque: 'variado', clareiraL3: [[0, 440], [2340, 2400]] } });
    barranco(C, 'barranco', 1330, 560, { palmeiras: [1700] });
    sombraCurupira(C, 'sombraGigante', 'L4', 330, 816, { tam: 1, P: { opacidade: .78, desfoque: 4 } });
    galhoQuebrado(C, 'galho', 1000, -120, { comp: 280 });
    return C;
  }
  // rastros: mata sem fim (K.camera); peças fixas que a coreografia traz: embaúba caída (escuro a cada volta), toco do
  // urutau, samaúma das queixadas, espingarda (inteira; depois coronha e cano partidos), rastro de queixada,
  // sombrinha em L3 e revoada de folhas da falsa Vó (L4)
  function rastros(p) {
    const C = novo(p, 'rastros'), r = S.rng(33);
    floresta(C, r, { periodo: 2400, subosque: 'variado', clareiraL3: [[1560, 2040]] }); // clareira atrás do meio com a câmera em 1520
    embauba(C, 'embauba', 1260, 1, { caida: true, semente: 53, fixo: true });
    toco(C, 'toco', 1520, 1, { fixo: true, estado: { o: 0 } });
    samauma(C, 'samauma', 1250, 1.05, { galho: -1, sentar: 240, semente: 43, fixo: true }).estado.o = 0;
    rastroQueixada(C, 'rastroQueixada', 760, 1500, { fixo: true });
    objeto(C, 'espingarda', DEFS.espingarda(), { x: 1010, y: CHAO + 4, escala: 1.15, rot: -3 });
    objeto(C, 'coronha', DEFS.coronha(), { x: 990, y: CHAO + 4, escala: 1.15, rot: 14 });
    objeto(C, 'cano', DEFS.cano(), { x: 1010, y: CHAO + 2, escala: 1.15, rot: -9 });
    sombraCurupira(C, 'sombrinha', 'L3', 1400, 816, { tam: .55, dir: -1, P: { opacidade: .5, desfoque: 2 }, fixo: true });
    folhasSoltas(C, 'revoada', { camada: 'L4', desfoque: 3, n: 18, estado: { x: 1500, y: 600, raio: 120, giro: .8, dx: 300, dy: -200 } });
    return C;
  }
  // noite: samaúma à direita com o galho sobre o painel do meio; fila de vaga-lumes que sobe até o galho; nuvens sobre a
  // lua; pano que desce; árvores que estremecem com as pancadas (treme5 no horizonte, treme3 na mata média); galho que
  // despenca; os dois pedaços da espingarda no chão
  function noite(p) {
    const C = novo(p, 'noite'), r = S.rng(44), x0 = 1560, s = 1.05;
    floresta(C, r, { clareira: [300, 1230], troncosL2: [-30], costela: false, semEmergente: true });
    cantoL1(C, r);
    for (const k of ['L5', 'L4', 'L3']) C.camadas[k].style.transformOrigin = '50% 816px'; // o vento dobra as copas, não o pé
    arvoreQueTreme(C, 'treme5', 'L5', 520, { alt: 1000, tipo: 'buriti', P: { opacidade: .2, desfoque: 6 } });
    arvoreQueTreme(C, 'treme3', 'L3', 230, { alt: 1000, k: .9, tipo: 'buriti', semente: 183 });
    // lâmina alta à esquerda da samaúma: crista quase plana junto do tronco (o Curupira aparece nela no clarão) e
    // borda que desce até o painel do meio (onde os dois estão agarrados no começo)
    const rl = S.rng(48), ed = [], PL = q => [x0 + q[0] * s, CHAO + q[1] * s];
    for (let k = 0; k <= 24; k++) { const u = k / 24; ed.push([lerp(-86, -430, u) + (rl() - .5) * 2.4, lerp(-240, 6, Math.pow(u, 1.8)) + 5 * Math.sin(u * PI * 3) * Math.sin(PI * u) + (k % 5 === 2 ? 3 : 0)]); }
    peca(C, 'crista', PL([-90, 0])).tinta('L2', [it(poli([...ed, [-424, 9], [-92, 9]].map(PL)), .8)]);
    samauma(C, 'samauma', x0, s, { galho: -1, sentar: 380, semente: 47, gy: -487, laminas: true, ocoK: 2.1 });
    const pt = C.pontos.samauma, eu = u => PL(ed[Math.round(u * 24)]), g = pt.galho;
    Object.assign(pt, { crista: eu(.375), agarrarZe: eu(.88), agarrarTiao: eu(.75) });
    // fila em S do chão (junto dos caçadores) até o galho; depois dá voltas entre as árvores da esquerda (avanco)
    vagalumes(C, 'vagalumes', [[760, 794], [850, 736], [790, 660], [850, 580], [960, 520], [1040, 440], [1100, 370], [g[0] - 30, g[1] + 40],
      [1040, 250], [880, 300], [700, 360], [520, 440], [380, 400], [250, 470], [320, 590], [190, 680], [100, 600]], { n: 26, ate: 7, halo: 13, nucleo: 3.4, tela: true });
    nuvens(C, 'nuvens');
    pano(C, 'pano');
    galhoQuebrado(C, 'galho', 1010, -150, { comp: 240 });
    objeto(C, 'coronha', DEFS.coronha(), { x: 1060, y: CHAO + 4, escala: 1.15, rot: 12 });
    objeto(C, 'cano', DEFS.cano(), { x: 1140, y: CHAO + 2, escala: 1.15, rot: -7 });
    return C;
  }
  // canto de baixo à esquerda (L1): helicônia sem cor e samambaia recortadas no lugar da massa de costelas
  function cantoL1(C, r, esq) {
    peca(C, null, [90, 870], { estatica: true }).tinta('L1', its([...(esq === false ? [] : [...semCor(pc().heliconia(r, 70, 868, 240, 1.15)), ...pc().samambaia(r, 210, 872, 160, 1.15)]), ...pc().samambaia(r, 1830, 872, 150, 1.1)]));
  }
  // vo: o rancho em luz quente de lembrança, bordas desfocadas (lembranca, L0), fumaça no telhado, novelo nas mãos da
  // Vó (cresce ao enrolar) e o pedacinho de fumo
  function vo(p) {
    const C = novo(p, 'vo'), r = S.rng(55);
    floresta(C, r, { clareira: [640, 1500], L1: false, bordasL2: false, L3: [-150, 40, 230, 430, 1660, 1820, 2010], semEmergente: true });
    rancho(C, 'rancho', 1085, { banco: false, pilao: 1066, bananeira: false }); // pilão em silhueta contra a porta acesa // a Vó senta no banquinho dela, no terço esquerdo do painel do meio
    fumaca(C, 'fumaca', ...C.pontos.rancho.chamine, { alto: 200 });
    lembranca(C, 'lembranca');
    novelo(C, 'novelo', { chao: [700, CHAO + 6], lado: -1, raio: 12, cor: '#9DB653', voltas: '#E4F0B0', estado: { x: 700, y: 700 } });
    objeto(C, 'fumo', defFumo(), { x: 700, y: CHAO - 4, escala: 1.15 });
    return C;
  }
  // novelo: de volta às sapopemas, noite de chuva: cipó pendurado (Zé arranca), folha larga de costela-de-adão ao pé
  // da samaúma onde ficam o novelo, o fumo e a pena; gotas que pingam
  function noveloCena(p) {
    const C = novo(p, 'novelo'), r = S.rng(66), x0 = 420;
    floresta(C, r, { clareira: [160, 1700], troncosL2: [1945], costela: false, semEmergente: true, bordasL2: false });
    cantoL1(C, r, false);
    // a samaúma no painel da esquerda (o oco no meio dele); a folha larga ao pé, no chão claro do painel do meio
    samauma(C, 'samauma', x0, 1.05, { galho: 1, sentar: 300, semente: 49, laminas: true, ocoK: 2.1 });
    peca(C, 'cipo', [985, 150]).tinta('L2', its(cipo(S.rng(67), [[985, 150], [1000, 290], [976, 430], [994, 570], [982, 660]], { w: [4, 7], afina: true, folhas: false })));
    const dfl = folha(S.rng(68), 'costela', mat(-85, 4, -.05, 170, 62), {}) + fita([[-150, 9], [-85, 4]], 5);
    couro(C, 'folhaLarga', um('folhaLarga', [{ d: dfl, cor: COR().verdeClaro }]), { x: 960, y: CHAO }, 'L2');
    // o cipó desenrolado corre do pé do Curupira (sentado em ~1080, de frente para a direita) em três rodilhas
    novelo(C, 'novelo', { chao: [1112, CHAO + 4], lado: 1, raio: 20, espirais: 3, raioEsp: 46, passoEsp: 2.9, cor: '#5E9A48', voltas: '#D2EBA0', estado: { x: 880, y: CHAO - 18 } });
    objeto(C, 'fumo', defFumo(), { x: 930, y: CHAO - 8, escala: 1.45 });
    objeto(C, 'pena', defPena(), { x: 975, y: CHAO - 3, escala: 1.45, rot: -176 });
    gotas(C, 'gotas', [[180, 300], [260, 420], [120, 520], [1700, 260], [1790, 380], [600, 120], [1290, 140], [930, 90]]);
    C.pontos.folhaLarga = [960, CHAO]; // o fumo e a pena ficam sobre a folha (ver pecas.fumo / pecas.pena)
    return C;
  }
  // aurora: a luz nasce baixa atrás da samaúma (L3, mais clara, no painel esquerdo) e abre a clareira no meio;
  // ipê-amarelo florido (pose.flores 0 → 1) e riacho claro no painel esquerdo; barranco em L2 nítido à direita, com a
  // crista de x ≈ 1030 até a borda (por onde passa a vara: pontos.barranco.topo(x)); gotas.
  // cen.rancho e cen.beira: outros cenários da mesma cena (começam com estado.visivel = 0)
  function aurora(p) {
    const C = novo(p, 'aurora'), r = S.rng(77), RX = [150, 590];
    floresta(C, r, { clareira: [380, 1240], troncosL2: [-30], L3: [-150, 40, 2010], semCapim: [[-M, 720]], costela: false, cipoL1: false,
      frondes: [[40, 16, .34, 250], [-12, 130, .05, 190], [250, -12, 1.36, 160], [1892, 8, PI - .38, 210], [1822, -12, PI - 1, 180], [662, 14, .62, 120]],
      furos: { L2: riachoAgua(S.rng(61), ...RX).agua } });
    riacho(C, 'riacho', ...RX, { claro: true, ondas: .35 });
    barranco(C, 'barranco', 830, 500, { camada: 'L2', palmeiras: [1560, 1800], estratos: true });
    samauma(C, 'samauma', 470, .82, { galho: 1, sentar: 200, semente: 51, laminas: true, camada: 'L3' }).estado.oco = 0;
    ipe(C, 'ipe', 205, 1.02, { flores: 0 });
    gotas(C, 'gotas', [[150, 250], [86, 430], [1840, 210], [1716, 190], [660, 90]]);
    C.rancho = ranchoManha(p);
    C.beira = beira(p);
    return C;
  }
  function ranchoManha(p) { // porta do rancho, de manhã, com fumaça no telhado
    const C = novo(p, 'aurora-rancho', 0), r = S.rng(56);
    floresta(C, r, { clareira: [700, 1500], L1: false, bordasL2: false, L3: [-150, 40, 230, 430, 1660, 1820, 2010] });
    rancho(C, 'rancho', 1060, {}).estado.luz = 0;
    fumaca(C, 'fumaca', ...C.pontos.rancho.chamine, { alto: 240 });
    return C;
  }
  function beira(p) { // beira da mata, de dia: mata fechada à direita, campo aberto à esquerda, galho para o sabiá
    const C = novo(p, 'aurora-beira', 0), r = S.rng(88);
    floresta(C, r, { clareira: [-400, 1250], L3: [1330, 1470, 1640, 1810, 2010], costela: false, cipoL1: false,
      frondes: [[1892, 8, PI - .38, 320], [1822, -12, PI - 1, 270], [1944, 140, PI + .05, 230], [1262, 18, PI - .5, 150]] });
    peca(C, 'galhoSabia', [1480, 300]).tinta('L2', its([...ds(coluna(r, 1680, 808, 1, 70)), fita(cr([[1662, 344], [1560, 308], [1440, 296], [1326, 280]], 6), u => 18 - 12 * u)]));
    const roca = [];
    for (let x = 90; x < 1040; x += 66 + r() * 14) roca.push(fita([[x, CHAO + 6], [x + (r() - .5) * 8, CHAO - 84 - r() * 18]], 6)); // cerca de varas da roça
    for (const yy of [CHAO - 64, CHAO - 30]) roca.push(fita(cr([[70, yy], [560, yy + 5], [1060, yy - 3]], 8), 4));
    for (let x = 60; x < 1150; x += 24 + r() * 36) roca.push(...ds(pc().capim(r, x, CHAO + 10, 40 + r() * 40, .9)));
    peca(C, 'roca', [600, CHAO]).tinta('L2', its(roca));
    Object.assign(C.pontos, { galhoSabia: [1372, 287], saidaDaMata: [1540, CHAO] });
    return C;
  }
  // encerramento: a mata (camadas saem pelo kit, saída 'contrarregra'); samaúma distante em L4 onde a sombrinha bate
  function encerramento(p) {
    const C = novo(p, 'encerramento'), r = S.rng(99);
    floresta(C, r, { clareira: [560, 1360], chao: false });
    peca(C, 'chao').tinta('rastros', chao(S.rng(98), -M - 40, W + M + 40, { clareira: [560, 1360] }), { prof: 'L2' }); // o chão some por fade (rastros)
    arvoreQueTreme(C, 'samaumaLonge', 'L4', 1420, { alt: 1000, semente: 187, P: { opacidade: .34, desfoque: 4 } });
    sombraCurupira(C, 'sombrinha', 'L4', 1318, 816, { tam: .72, P: { opacidade: .62, desfoque: 2.4 } });
    C.pontos.centro = [960, CHAO];
    return C;
  }

  S.cenarios = {
    abertura, mata, guardiao, cacadores, aviso, rastros, noite, vo, novelo: noveloCena, aurora, encerramento, CHAO,
    objetos: Object.fromEntries(Object.entries(DEFS).map(([k, f]) => [k, pose => S.bonecos.criar(f(), pose || {})])),
    defs: DEFS,
  };
})();
