/* elenco-bichos.js — Sombras.bichos: os bichos de couro entalhado (guia §7.5–7.12) e o Curupira montado.
 * Feitos no rig de Sombras.bonecos (mesmo acabamento de couro, mesma API): b.pose (x, y, escala, dir, z, rot, dy,
 * opacidade, a.{peça}, s.{peça}, o.{peça}), b.motores, b.mundo(), b.pronto, palco.adicionar(b) / c.boneco(b).
 * De perfil olhando +x, chão em y = Sombras.kit.CHAO; varetas na cabeça e na anca. Vazados coerentes com cada
 * bicho: rosetas de onça cortadas em arcos, casco de jabuti no tatu, cerdas e pelagem em hachura de xilogravura.
 *
 * BICHOS   Sombras.bichos.X(op): op do rig ({x, y, escala, dir, z, a, s, o, …campos da pose}) e mais as do bicho.
 *   Para o fundo (onça em L3, vulto na vara): c.boneco(b, {camada: 'L3'}) do kit.
 *   cachorro({riscos})     vira-lata magro. riscos: true = lombo riscado de vazados (volta do sumiço, rastros_16)
 *                          pose 0..1: fareja (focinho no chão, tremendo), alerta, medo (rabo entre as pernas,
 *                          encolhido, tremendo), abana, latido, boca
 *   onca()                 pose: espreita (baixa, cabeça na linha do ombro), esturro, boca. Ombros rolam no passo.
 *   veada()                prenhe. pose: bebe (pescoço até a água), alerta (orelhas e pescoço), olharTras (passada a
 *                          metade, troca a cabeça pela de perfil invertido). Orelhas dão piparotes sozinhas.
 *   filhote()              pose: bambo (joelhos que dobram sozinhos, corpo que balança)
 *   queixada({semente, caititu}) · caititu()   pose: dentes (bate a 7 Hz), grunhido (boca), erica (crina em pé)
 *   vara(n, {semente, caititu, …op})   n queixadas com variação de corpo, escala (.85–1,1), z (0–.4) e passada;
 *                          b.atraso (s, cumulativo) e b.fila. Não adiciona ao palco.
 *   curupiraMontado({pena, colar, fumo})   peças do Curupira de bonecos.js com os MESMOS ids e o mesmo auto
 *                          (furia, boca, bracoFrente, cabeca, machado…), na pose de machadinha erguida, sobre um
 *                          queixada grande (focinho, queixo, dentes). fumo: rolo na cintura e fumoMao na mão de trás
 *                          (o.fumoMao = 0; troque o.fumo/o.fumoMao quando a mão passa pela cintura).
 *   arara({semente, fase}) origem no meio do corpo. pose: voo (bate as asas a ~3 Hz), pouso (asas recolhidas,
 *                          corpo em pé, pés), queda (asas moles; a cena gira rot e derruba y)
 *   bando(n, op)           n araras; b.dx, b.dy (lugar na formação) e b.atraso. Não adiciona ao palco.
 *   bugio({galho})         origem no topo do galho (galho: false = sem o galho). pose: ronco (pulsos), boca
 *   tatu()                 pose: toca (mergulha de focinho; tudo abaixo de pose.y some)
 *   urutau({toco, cor})    na tinta do cenário, imóvel. pose: olhos (âmbar, acendem), canto (bico em pulsos), boca
 *
 * MARCHAS  ciclos por fase, como Sombras.bonecos.andar (uma volta de fase = uma passada; op.pernas = peso 0..1)
 *   Sombras.bichos.passo · trote · galope · salto (b, fase, {pernas, bob})   quadrúpedes (salto: fuga da veada)
 *   Sombras.bichos.voo(b, fase, {pernas})   bater de asas (a arara já bate sozinha pela pose.voo)
 *   Sombras.bichos.andadura(b, nome) → {ciclo, passo}   para trocar a marcha no kit:
 *       K.caminhar(tl, cao, {ate: 1500, t0, t1, ...Sombras.bichos.andadura(cao, 'galope')})
 *   Sem andadura, K.caminhar usa b.def.marcha (o passo do bicho). A fase segue a distância: a pata não escorrega.
 *
 * GESTOS   na timeline, fromTo com immediateRender: false (à prova de seek); t relativo à timeline dada
 *   latir(tl, b, t, vezes) · dentes(tl, b, t, dur) · esturrar(tl, b, t, dur) · roncar(tl, b, t, dur)
 *   pulso(tl, b, t, campo, {pico, sobe, desce, segura, vezes, intervalo})   pulsos de qualquer campo da pose
 *   Estados contínuos (fareja, medo, bebe, espreita, olhos, canto, toca…) são tween direto da pose:
 *       K.anima(tl, b.pose, {medo: 1}, t, .4)
 *
 * PEÇAS    dp/dl = dianteira de perto/de longe, tp/tl = traseiras, +2 = canela e pé; corpo, pescoco, cabeca,
 *   mandibula, orelha(L), rabo(2, 3); queixada: focinho, queixo, crina; arara: asaP/asaL(+2), cauda, pes;
 *   bugio: braco, antebraco, bracoL, perna, rabo..rabo4, galho; urutau: toco, bico, olho (brilho).
 *   pose.respiro (1; 0 desliga): todos respiram no mesmo compasso (mata_06), e o kit não soma a respiração dele.
 * Vitrine e capturas: producao/prototipo/elenco-bichos.html (?cena=galeria|poses|marcha|bicho, ?ato=1..4).
 */
(function () {
  'use strict';
  const S = window.Sombras = window.Sombras || {};
  const TAU = Math.PI * 2;
  const f2 = v => +v.toFixed(2);
  const fr = x => x - Math.floor(x);
  const NUM = /-?(?:\d+\.?\d*|\.\d+)/g;

  // ---------- geometria (paths ABSOLUTOS só com M/L/C/Z: é o formato que o rig mede) ----------
  // Catmull-Rom por pontos; [x, y, 1] = quina
  function spline(P, aberta) {
    const n = P.length, g = i => aberta ? P[Math.max(0, Math.min(n - 1, i))] : P[(i + n) % n];
    let d = `M${f2(P[0][0])} ${f2(P[0][1])}`;
    for (let i = 0; i < (aberta ? n - 1 : n); i++) {
      const a = g(i - 1), b = g(i), c = g(i + 1), e = g(i + 2);
      const c1 = b[2] ? b : [b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6];
      const c2 = c[2] ? c : [c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6];
      d += `C${f2(c1[0])} ${f2(c1[1])} ${f2(c2[0])} ${f2(c2[1])} ${f2(c[0])} ${f2(c[1])}`;
    }
    return d + (aberta ? '' : 'Z');
  }
  function elipse(cx, cy, rx, ry) {
    const k = .5523, c = (a, b) => f2(a) + ' ' + f2(b);
    return `M${c(cx + rx, cy)}C${c(cx + rx, cy + k * ry)} ${c(cx + k * rx, cy + ry)} ${c(cx, cy + ry)}C${c(cx - k * rx, cy + ry)} ${c(cx - rx, cy + k * ry)} ${c(cx - rx, cy)}` +
      `C${c(cx - rx, cy - k * ry)} ${c(cx - k * rx, cy - ry)} ${c(cx, cy - ry)}C${c(cx + k * rx, cy - ry)} ${c(cx + rx, cy - k * ry)} ${c(cx + rx, cy)}Z`;
  }
  // pontos de uma Catmull-Rom aberta
  function amostra(P, n) {
    const out = [], m = P.length - 1;
    for (let i = 0; i <= n; i++) {
      const s = i / n * m, k = Math.min(m - 1, Math.floor(s)), u = s - k;
      const a = P[Math.max(0, k - 1)], b = P[k], c = P[k + 1], e = P[Math.min(m, k + 2)];
      const cr = j => .5 * (2 * b[j] + (c[j] - a[j]) * u + (2 * a[j] - 5 * b[j] + 4 * c[j] - e[j]) * u * u + (3 * b[j] - a[j] - 3 * c[j] + e[j]) * u * u * u);
      out.push([cr(0), cr(1)]);
    }
    return out;
  }
  // fenda: furo fino de pontas agudas ao longo de uma linha (o entalhe que deixa a luz passar)
  function fenda(P, w, n) {
    const A = amostra(P, n || 10), e = [], d = [];
    A.forEach((p, i) => {
      const a = A[Math.max(0, i - 1)], b = A[Math.min(A.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const h = w / 2 * Math.pow(Math.sin(Math.PI * i / (A.length - 1)), .55);
      e.push([p[0] - (b[1] - a[1]) / l * h, p[1] + (b[0] - a[0]) / l * h]); d.unshift([p[0] + (b[1] - a[1]) / l * h, p[1] - (b[0] - a[0]) / l * h]);
    });
    return 'M' + e.concat(d).map(p => f2(p[0]) + ' ' + f2(p[1])).join('L') + 'Z';
  }
  function dentro(P, x, y) {
    let d = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const [xi, yi] = P[i], [xj, yj] = P[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) d = !d;
    }
    return d;
  }
  // hachura de xilogravura: fendas curtas em fileiras desencontradas dentro do polígono P, no sentido do pelo
  // op: {passo: [dx, dy], comp, larg, ang (graus ou f(x, y)), curva, semente}
  function hachura(P, op) {
    op = op || {};
    const r = S.rng(op.semente || 1), [dx, dy] = op.passo || [6, 5], L = op.comp || 5, w = op.larg || 1.2, out = [];
    const xs = P.map(p => p[0]), ys = P.map(p => p[1]);
    for (let y = Math.min(...ys) + dy / 2, j = 0; y < Math.max(...ys); y += dy, j++) {
      for (let x = Math.min(...xs) + (j % 2 ? dx / 2 : 0); x < Math.max(...xs); x += dx) {
        const px = x + (r() - .5) * dx * .45, py = y + (r() - .5) * dy * .35;
        if (!dentro(P, px, py)) continue;
        const a = ((typeof op.ang === 'function' ? op.ang(px, py) : op.ang || 0) + (r() - .5) * 14) * Math.PI / 180, l = L * (.75 + r() * .5) / 2;
        const c = Math.cos(a) * l, s = Math.sin(a) * l, k = (op.curva || 0) * l;
        out.push(fenda([[px - c, py - s], [px - Math.sin(a) * k, py + Math.cos(a) * k], [px + c, py + s]], w * (.8 + r() * .4), 6));
      }
    }
    return out;
  }
  // pintas soltas (furos ovais irregulares) espalhadas dentro do polígono P. op: {passo, r: [min, max], semente}
  function pintas(P, op) {
    op = op || {};
    const r = S.rng(op.semente || 1), g = op.passo || 9, [r0, r1] = op.r || [1.2, 2.4], out = [];
    const xs = P.map(p => p[0]), ys = P.map(p => p[1]);
    for (let y = Math.min(...ys) + g / 2, j = 0; y < Math.max(...ys); y += g * .87, j++) {
      for (let x = Math.min(...xs) + (j % 2 ? g / 2 : 0); x < Math.max(...xs); x += g) {
        const px = x + (r() - .5) * g * .6, py = y + (r() - .5) * g * .5, rr = r0 + r() * (r1 - r0);
        if (dentro(P, px, py)) out.push(elipse(px, py, rr * (1 + r() * .4), rr * (.7 + r() * .3)));
      }
    }
    return out;
  }
  // rosetas de onça cortadas à faca: anéis partidos em 3–5 arcos (fendas), tamanho e giro variados, às vezes
  // com pinta no meio. op: {passo, r: [min, max], larg, semente}
  function rosetas(P, op) {
    op = op || {};
    const rnd = S.rng(op.semente || 1), g = op.passo || 15, [r0, r1] = op.r || [3.6, 6], w = op.larg || 2, out = [];
    const xs = P.map(p => p[0]), ys = P.map(p => p[1]);
    for (let y = Math.min(...ys) + g / 2, j = 0; y < Math.max(...ys); y += g * .86, j++) {
      for (let x = Math.min(...xs) + (j % 2 ? g / 2 : 0); x < Math.max(...xs); x += g) {
        const cx = x + (rnd() - .5) * g * .5, cy = y + (rnd() - .5) * g * .4, R = r0 + rnd() * (r1 - r0), giro = rnd() * TAU, ach = .7 + rnd() * .25;
        if (!dentro(P, cx, cy)) continue;
        const n = 3 + Math.floor(rnd() * 3);
        for (let k = 0; k < n; k++) {
          const a0 = giro + k * TAU / n + .22 + rnd() * .2, a1 = giro + (k + 1) * TAU / n - .22 - rnd() * .25, pts = [];
          for (let i = 0; i <= 4; i++) { const a = a0 + (a1 - a0) * i / 4; pts.push([cx + R * Math.cos(a), cy + R * ach * Math.sin(a)]); }
          out.push(fenda(pts, w * (.8 + rnd() * .5), 8));
        }
        if (rnd() < .55) out.push(elipse(cx + (rnd() - .5) * R * .4, cy + (rnd() - .5) * R * .3, .7 + rnd() * .7, .6 + rnd() * .5));
      }
    }
    return out;
  }
  // aplica f(x, y) → [x, y] a todos os pares de um path absoluto
  function mapa(d, f) {
    const n = d.match(NUM).map(Number), o = [];
    for (let i = 0; i + 1 < n.length; i += 2) o.push(...f(n[i], n[i + 1]));
    let k = 0;
    return d.replace(NUM, () => f2(o[k++]));
  }
  const mover = (d, dx, dy) => mapa(d, (x, y) => [x + dx, y + dy]);
  // várias formas da mesma peça lidas como UM recorte: contorno duplo por baixo e o miolo repintado por cima
  const unir = (cor, ...ds) => [...ds.map(d => ({ d, cor, contorno: 2.4 })), ...ds.map(d => ({ d, cor, contorno: 0 }))];

  // As peças são desenhadas em coordenadas de REPOUSO do bicho inteiro (chão em y = 0, olhando +x);
  // aqui elas vão para as coordenadas locais que o rig espera (pivô na origem).
  function local(def, k) {
    const kx = Array.isArray(k) ? k[0] : k || 1, ky = Array.isArray(k) ? k[1] : k || 1;
    const K = d => mapa(d, (x, y) => [x * kx, y * ky]);
    for (const p of def.partes) {
      p.pivo = [p.pivo[0] * kx, p.pivo[1] * ky];
      const m = d => mover(K(d), -p.pivo[0], -p.pivo[1]);
      p.formas = p.formas.map(f => Object.assign({}, f, { d: m(f.d) }, f.vazado && f.vazado.faixa ? { vazado: Object.assign({}, f.vazado, { faixa: m(f.vazado.faixa) }) } : {}));
      if (p.furos) p.furos = p.furos.map(m);
      for (const c of ['linhas', 'brancos']) if (p[c]) p[c] = p[c].map(l => Object.assign({}, l, { d: m(l.d) }));
    }
    for (const v of def.varetas || []) v.ponto = [v.ponto[0] * kx, v.ponto[1] * ky];
    if (def.cfg && def.cfg.perna) { def.cfg.perna *= ky; def.marcha = Object.assign(kitMarcha(def.H, def.cfg), def.marcha); }
    return def;
  }

  // ---------- movimento ----------
  const ad = (b, p, v) => { b.extra.a[p] = (b.extra.a[p] || 0) + v; };
  // uma pata na fase u (0..1): [ângulo de cima, flexão de baixo]; apoio = fração do ciclo com a pata no chão.
  // Ângulo positivo = pata para trás (o rig gira no sentido horário com y para baixo).
  function pata(u, apoio, A, F) {
    if (u < apoio) { const s = u / apoio; return [A * (2 * s - 1), F * .25 * Math.pow(Math.max(0, s - .7) / .3, 2)]; }
    const s = (u - apoio) / (1 - apoio);
    return [A * Math.cos(Math.PI * s), F * Math.pow(Math.sin(Math.PI * Math.pow(s, .75)), .8)];
  }
  // marchas de quadrúpede: fase de cada pata (d = dianteira, t = traseira; p = perto do público, l = longe)
  const MARCHAS = {
    passo: { fases: { tl: 0, dl: .25, tp: .5, dp: .75 }, apoio: .64, A: [19, 21], F: [55, 42], bob: 1.6, arfa: 0, cabeca: 2.5 },
    trote: { fases: { tp: 0, dl: 0, tl: .5, dp: .5 }, apoio: .48, A: [25, 26], F: [72, 55], bob: 3.5, arfa: 1, cabeca: 3 },
    galope: { fases: { tl: 0, tp: .1, dl: .5, dp: .6 }, apoio: .3, A: [40, 36], F: [100, 75], bob: 8, arfa: 7, cabeca: 4 },
  };
  // ciclo de marcha por fase, no formato do ciclo de K.caminhar e de Sombras.bonecos.andar: uma volta de fase =
  // uma passada (2 passos). op: {pernas: peso 0..1 (o kit manda a rampa de entrada e saída), bob: × sobe e desce}
  function marcha(b, nome, fase, op) {
    op = op || {};
    const M = MARCHAS[nome], w = op.pernas == null ? 1 : op.pernas, cfg = b.def.cfg || {};
    if (w <= 0) return;
    for (const id in M.fases) {
      const di = id[0] === 'd', [a1, a2] = pata(fr(fase + (cfg.fase0 || 0) + M.fases[id]), M.apoio, M.A[di ? 0 : 1], M.F[di ? 0 : 1]);
      ad(b, id, w * a1); ad(b, id + '2', w * (di ? a2 : -a2));
    }
    const uo = fr(fase + (cfg.fase0 || 0) + M.fases.dp);
    b.extra.s.ombro = (b.extra.s.ombro || 1) * (1 + w * (cfg.ombro || 0) * (uo < M.apoio ? Math.sin(Math.PI * uo / M.apoio) : -.4 * Math.sin(Math.PI * (uo - M.apoio) / (1 - M.apoio))));
    const k4 = Math.cos(2 * TAU * (fase - (nome === 'galope' ? .2 : 0)));
    b.extra.dy += w * M.bob * (op.bob == null ? 1 : op.bob) * (cfg.bob || 1) * (nome === 'passo' ? (1 - k4) / 2 : (1 + k4) / 2);
    const arfa = w * M.arfa * Math.sin(TAU * (fase - .3));
    ad(b, 'corpo', arfa);
    ad(b, 'pescoco', -.7 * arfa + w * M.cabeca * Math.sin(2 * TAU * fase + 1));
    ad(b, 'rabo', w * (cfg.rabo || 6) * Math.sin(TAU * fase + 1.8));
    ad(b, 'rabo2', w * (cfg.rabo || 6) * .8 * Math.sin(TAU * fase + .9));
  }
  const passo = (b, fase, op) => marcha(b, 'passo', fase, op);
  const trote = (b, fase, op) => marcha(b, 'trote', fase, op);
  const galope = (b, fase, op) => marcha(b, 'galope', fase, op);
  // interpolação suave entre chaves [[u, v], …] num ciclo (u de 0 a 1; a última chave deve repetir a primeira)
  function chave(u, K) {
    let i = 0;
    while (i < K.length - 2 && u > K[i + 1][0]) i++;
    const [u0, v0] = K[i], [u1, v1] = K[i + 1], k = Math.max(0, Math.min(1, (u - u0) / ((u1 - u0) || 1)));
    return v0 + (v1 - v0) * (1 - Math.cos(Math.PI * k)) / 2;
  }
  // salto (fuga da veada): impulso nas traseiras, voo esticado, pouso nas dianteiras, recolhe e salta de novo
  const SALTO = {
    d: [[0, -30], [.3, -72], [.55, -34], [.75, 26], [1, -30]], d2: [[0, 100], [.3, 10], [.55, 0], [.75, 8], [.9, 60], [1, 100]],
    t: [[0, 46], [.3, 62], [.55, 12], [.75, -34], [.9, 8], [1, 46]], t2: [[0, 0], [.3, 12], [.55, -40], [.75, -22], [.9, -8], [1, 0]],
    dy: [[0, 0], [.3, -1], [.55, -.06], [.75, .06], [1, 0]], arfa: [[0, -12], [.3, 0], [.55, 12], [.75, 0], [1, -12]],
  };
  function salto(b, fase, op) {
    op = op || {};
    const w = op.pernas == null ? 1 : op.pernas, cfg = b.def.cfg || {}, u = fr(fase + (cfg.fase0 || 0));
    if (w <= 0) return;
    for (const [id, k, d] of [['dp', 'd', 0], ['dl', 'd', .04], ['tp', 't', 0], ['tl', 't', .04]]) {
      ad(b, id, w * chave(fr(u - d), SALTO[k])); ad(b, id + '2', w * chave(fr(u - d), SALTO[k + '2']));
    }
    const arfa = w * chave(u, SALTO.arfa);
    b.extra.dy += w * (cfg.voo || 60) * (op.bob == null ? 1 : op.bob) * chave(u, SALTO.dy);
    ad(b, 'corpo', arfa); ad(b, 'pescoco', -.7 * arfa); ad(b, 'rabo', -w * 30); ad(b, 'orelha', 14 * w); ad(b, 'orelhaL', 12 * w);
  }
  const CICLOS = { passo, trote, galope, salto };
  // opções para K.caminhar: {ciclo, passo}. O passo (meia passada) sai do comprimento da pata e da amplitude,
  // em fração de H (o kit multiplica por H·escala): 2·L·sen(A)/apoio por passada.
  function andadura(b, nome) {
    const cfg = b.def.cfg, M = MARCHAS[nome] || {};
    const px = cfg.passos && cfg.passos[nome] || (M.A ? cfg.perna * Math.sin(M.A[0] * Math.PI / 180) / M.apoio : cfg.perna * 2.2);
    return { ciclo: CICLOS[nome] || S.bichos[nome], passo: px / b.def.H };
  }
  // respiração (pose.respiro; o kit não põe a dele quando o campo existe)
  function vivo(b, t) {
    const r = b.pose.respiro == null ? 1 : b.pose.respiro, s = Math.sin(TAU * .3 * t);
    ad(b, 'pescoco', .9 * r * s); ad(b, 'cabeca', .6 * r * Math.sin(TAU * .3 * t + .5)); b.extra.dy += .5 * r * s;
  }
  // padrões de b.def.marcha para K.caminhar (pernas e bob são pesos; os ciclos dos bichos ignoram braços)
  const kitMarcha = (H, cfg, nome) => ({ ciclo: CICLOS[nome || 'passo'], passo: cfg.perna * Math.sin(MARCHAS[nome || 'passo'].A[0] * Math.PI / 180) / MARCHAS[nome || 'passo'].apoio / H, pernas: 1, bob: 1, bracos: 0, inclinacao: 0 });

  // pulsos de um campo da pose na timeline (latido, dentes, ronco…): fromTo explícitos, à prova de seek
  function pulso(tl, b, t, campo, op) {
    op = op || {};
    const n = op.vezes || 1, pico = op.pico == null ? 1 : op.pico, sobe = op.sobe || .07, desce = op.desce || .12, gap = op.intervalo || (sobe + desce + .05);
    for (let i = 0; i < n; i++) {
      const t0 = t + i * gap;
      tl.fromTo(b.pose, { [campo]: 0 }, { [campo]: pico, duration: sobe, ease: 'power2.out', immediateRender: false }, t0);
      tl.fromTo(b.pose, { [campo]: pico }, { [campo]: 0, duration: desce, ease: 'power1.in', immediateRender: false }, t0 + sobe + (op.segura || 0));
    }
    return tl;
  }

  // ---------- cachorro de caça: vira-lata magro (guia §7.5) ----------
  // Construção de boneco de sombra: o corpo leva ombro e coxa; as patas são pregadas no cotovelo e na
  // soldra com rebite (sem disco de junta), em duas peças (canela + pé), e as de longe ficam atrás do corpo.
  const rebite = (x, y) => ({ d: elipse(x, y, 1.5, 1.5), cor: '#2A1A0E', contorno: 0 });
  const CAO = { pelo: '#DCA066', claro: '#E6BE86', mancha: '#B86A3E', focinho: '#3A2418' };
  function defCachorro(op) {
    op = op || {};
    const pl = S.bonecos.pelo, C = CAO;
    const tufos = (P, quer, sem, tam) => pl(spline(P), quer, { semente: sem, tam: tam || [2, 3.6], passo: [2.6, 4.2], cai: .55 });
    // patas (repouso): antebraço do cotovelo ao carpo; quartela + pata com dois nós de dedo
    const canD = [[22.4, -45.6], [24, -48.4], [28, -49.2], [31.4, -46.6], [32.2, -40], [31.4, -30], [30.8, -22], [30.8, -16.2], [30, -13], [28, -11.8], [26, -12.8],
      [25.2, -16], [25, -22], [24.6, -32], [23.8, -40]];
    const peD = [[25.2, -15.4], [25.8, -17.4], [28, -18.4], [30.2, -17.4], [30.8, -15.2], [31, -10.4], [32, -6.4], [34, -4.8], [35.8, -5.2], [37.6, -4.2], [39.2, -3.4],
      [40.2, -1.4], [39.6, .3, 1], [36, .9], [30, 1], [26.6, .6], [25.6, -1.4], [25.4, -6], [25.2, -11]];
    const canT = [[-46.6, -44.4], [-42, -46.4], [-37.4, -43.4], [-37.6, -38], [-41, -31], [-46.6, -24], [-50.8, -19], [-52, -15.6], [-54, -13.4], [-56.6, -14],
      [-58.8, -17.4], [-58.4, -21], [-56, -27], [-52.2, -34], [-49.4, -40]];
    const peT = [[-57, -16.6], [-56.4, -18.6], [-54, -19.4], [-51.6, -18.4], [-51, -16], [-50.8, -10.4], [-49.6, -6.4], [-47.6, -4.8], [-45.8, -5.2], [-44, -4.2],
      [-42.4, -3.4], [-41.4, -1.4], [-42, .3, 1], [-45.6, .9], [-51.6, 1], [-55, .6], [-56, -1.4], [-56.6, -6], [-56.8, -11]];
    const dedos = (x0, dx) => [fenda([[x0 + dx, -4.4], [x0 + dx - .3, -2.2], [x0 + dx - .6, .2]], .9, 4), fenda([[x0 + dx + 2.4, -3.6], [x0 + dx + 2.1, -1.6], [x0 + dx + 1.8, .2]], .9, 4)];
    const corpo = [[16, -73], [0, -70.5], [-18, -68.6], [-34, -69.6], [-46, -70.2], [-55, -66.4], [-60.6, -58], [-61, -49], [-55.6, -42], [-46, -38.6], [-37, -36.4], [-33, -42], [-31, -50],
      [-24, -51.6], [-10, -46], [4, -39], [18, -35.6], [26, -37.4], [30, -41], [34, -49], [37.6, -56], [36.4, -63], [30, -70]];
    const pescoco = [[20, -73], [24.6, -77], [30, -84], [37.6, -96], [46, -97], [51, -87], [46, -75], [40.6, -63], [37.2, -57], [30, -62], [22.4, -69]];
    const cabeca = [[37, -97], [40.6, -102], [46, -104.4], [56, -103], [62, -98.6], [68, -96.6], [78, -95], [83, -94], [86.6, -91], [86.4, -87.2], [83.6, -86.2],
      [83, -82.4], [74, -81.4], [66, -82.4], [58, -84], [48, -85.6], [39, -90]];
    const mand = [[48, -86], [58, -84.8], [68, -83.8], [78, -83], [81.6, -82.4], [82, -80], [78, -78.4], [68, -78.2], [58, -79.6], [50, -82.6]];
    const orelha = [[39.6, -101], [46, -104.6], [51.6, -101.6], [52.6, -94], [51, -86], [47.6, -79.4], [44.4, -80.4, 1], [42, -88], [39.6, -95]];
    const rabo = [[-51, -70.4], [-60, -68.4], [-66, -62], [-69.4, -54], [-65, -52.6], [-62, -59], [-56, -63], [-50.4, -63]];
    const rabo2 = [[-70.4, -58.4], [-73, -48], [-74, -38], [-72.4, -30], [-68.4, -23.6, 1], [-68.6, -31], [-68, -40], [-66, -49], [-64, -55.4]];
    const riscos = op.riscos ? [fenda([[-2, -73], [-12, -64], [-19, -58]], 2.8), fenda([[-11, -72.4], [-21, -64], [-27.6, -59.4]], 2.8), fenda([[-20, -72], [-30, -65], [-36, -61]], 2.4)] : [];
    const pataFrente = (id, dx, atras) => [
      { id, pai: 'corpo', pivo: [27 + dx, -43], junta: false, atras, formas: [{ d: mover(spline(canD), dx, 0), cor: C.pelo }, ...(atras ? [] : [rebite(27, -43)])],
        furos: atras ? [] : [fenda([[25.6, -38], [26, -28], [26.4, -19]], 1.2)] },
      { id: id + '2', pai: id, pivo: [28 + dx, -14.6], junta: false, atras, formas: [{ d: mover(spline(peD), dx, 0), cor: C.pelo }, ...(atras ? [] : [rebite(28, -14.6)])],
        furos: dedos(35.6, dx) }];
    const pataTras = (id, dx, atras) => [
      { id, pai: 'corpo', pivo: [-42 + dx, -40], junta: false, atras, formas: [{ d: mover(tufos(canT, (nx, ny, x, y) => nx < -.5 && y < -24 && y > -40, 31, [1.6, 2.8]), dx, 0), cor: C.pelo },
        ...(atras ? [] : [rebite(-42, -40)])] },
      { id: id + '2', pai: id, pivo: [-54 + dx, -16.4], junta: false, atras, formas: [{ d: mover(spline(peT), dx, 0), cor: C.pelo }, ...(atras ? [] : [rebite(-54, -16.4)])],
        furos: dedos(-47.8, dx) }];
    const partes = [
      ...pataTras('tl', -6, 1), ...pataFrente('dl', 6, 1),
      { id: 'rabo', pai: 'corpo', pivo: [-53, -66], junta: false, formas: [{ d: tufos(rabo, (nx, ny) => ny > .4, 35), cor: C.pelo }] },
      { id: 'rabo2', pai: 'rabo', opaca: true, pivo: [-67, -56], junta: false, formas: [{ d: tufos(rabo2, (nx, ny) => nx < -.3, 37, [2.6, 5]), cor: C.pelo }] },
      { id: 'corpo', pivo: [-8, -56], formas: [{ d: tufos(corpo, (nx, ny, x, y) => nx < -.6 && y > -60 && y < -44, 39, [1.6, 2.8]), cor: C.pelo },
        { d: spline([[8, -71], [-10, -68.6], [-28, -68.4], [-44, -70.4], [-52, -66], [-46, -61], [-30, -61.6], [-12, -62], [4, -64.4]]), cor: C.mancha, contorno: 0 },
        { d: spline([[37.6, -56], [34, -49], [30, -41], [24, -37], [16, -36.4], [22, -43], [28, -50], [33, -57]]), cor: C.claro, contorno: 0 }],
        furos: [fenda([[12, -62], [9, -53], [8, -45]], 2.4), fenda([[3, -64], [0, -55], [-1.4, -47.6]], 2.4), fenda([[-6, -64.4], [-9.6, -56.4], [-11, -50]], 2.2),
          fenda([[12, -68.6], [-4, -66], [-20, -64.4]], 1.4), fenda([[-28, -65.4], [-40, -66], [-49, -63.4]], 1.4),
          fenda([[-35, -61], [-33.4, -51], [-37, -43]], 1.6),
          ...hachura([[-40, -59], [-38.6, -50], [-43, -44], [-52, -43], [-57, -50], [-55, -58], [-48, -61]], { passo: [4.6, 4.2], comp: 4.4, larg: 1, ang: 100, semente: 3 }),
          ...hachura([[18, -65], [28, -60], [33, -52], [30, -46], [22, -48], [16, -56]], { passo: [4.6, 4.2], comp: 4.2, larg: 1, ang: 75, semente: 5 }),
          ...riscos] },
      { id: 'pescoco', pai: 'corpo', opaca: true, pivo: [25, -68], junta: false, formas: [{ d: spline(pescoco), cor: C.pelo },
        { d: spline([[49.6, -88], [45.6, -76], [40.6, -64], [37.4, -57.6], [41.4, -62], [46.4, -73]]), cor: C.claro, contorno: 0 }],
        furos: hachura([[22, -76], [30, -84], [37, -91], [44, -91], [44, -80], [38, -70], [31, -66]], { passo: [4.8, 4.4], comp: 4.6, larg: 1, ang: (x, y) => 125 - (y + 90) * .8, semente: 7 }) },
      { id: 'mandibula', pai: 'cabeca', opaca: true, pivo: [52, -85], junta: false, formas: [{ d: spline(mand), cor: C.claro }] },
      { id: 'cabeca', pai: 'pescoco', opaca: true, pivo: [42, -92], junta: false, formas: [{ d: spline(cabeca), cor: C.pelo },
        { d: spline([[63, -96.6], [72, -95.4], [80.6, -94], [83.4, -88], [82.4, -83.6], [74, -82.6], [66, -84.4], [62, -90]]), cor: C.claro, contorno: 0 },
        { d: spline([[82.4, -94.2], [85.8, -92.6], [87.2, -89.2], [86, -86.8], [82.6, -87.6], [81.6, -91]]), cor: C.focinho, contorno: 0 }],
        furos: ['M55.4 -95.4C56.6 -97.6 60 -98 62.2 -95.8C60.2 -93.8 57.2 -93.6 55.4 -95.4Z', fenda([[67, -83.4], [75, -83.2], [82.4, -84]], 1.1),
          elipse(72.6, -88.4, .7, .7), elipse(75.4, -87.2, .7, .7), elipse(73.4, -86, .7, .7)],
        brancos: [{ d: elipse(59, -95.8, 1.2, 1.3) }],
        linhas: [{ d: 'M53.6 -98.8C57 -100.8 60.8 -100.6 63.4 -98.4', w: 1.4 }, { d: 'M50 -88C53 -86 56.4 -85.6 59.4 -86.4', op: .5 }] },
      { id: 'orelha', pai: 'cabeca', pivo: [45, -101], junta: false, formas: [{ d: spline(orelha), cor: C.mancha }],
        furos: [fenda([[45.6, -99.6], [48.6, -92], [46.8, -84]], 1.6)] },
      ...pataTras('tp', 0, 0), ...pataFrente('dp', 0, 0),
    ];
    return local({
      nome: 'cachorro', H: 130, partes,
      cfg: { perna: 43, rabo: 8, fase0: op.fase0 || 0 },
      varetas: [{ parte: 'pescoco', ponto: [30, -76], mestra: true }, { parte: 'corpo', ponto: [-44, -62] }],
      pose: { respiro: 1, fareja: 0, medo: 0, alerta: 0, abana: 0, latido: 0 },
      auto(b, t) {
        const P = b.pose, fa = P.fareja, me = P.medo, al = P.alerta;
        vivo(b, t);
        if (fa) { ad(b, 'pescoco', 66 * fa); ad(b, 'cabeca', -6 * fa + 2.2 * fa * Math.sin(TAU * 3 * t)); ad(b, 'orelha', -22 * fa); ad(b, 'corpo', 5 * fa); b.extra.dy += 3 * fa; ad(b, 'dp', -5 * fa); ad(b, 'dl', -5 * fa); ad(b, 'dp2', 10 * fa); ad(b, 'dl2', 10 * fa); }
        if (me) {
          const tr = me * Math.sin(TAU * 9 * t);
          ad(b, 'corpo', -6 * me); b.extra.dy += 6 * me; ad(b, 'pescoco', 22 * me + tr); ad(b, 'cabeca', -14 * me);
          ad(b, 'rabo', -60 * me); ad(b, 'rabo2', -36 * me); ad(b, 'orelha', 28 * me);
          ad(b, 'tp', -12 * me); ad(b, 'tl', -12 * me); ad(b, 'tp2', 16 * me); ad(b, 'tl2', 16 * me); ad(b, 'dp', 6 * me); ad(b, 'dl', 6 * me);
        }
        if (al) { ad(b, 'orelha', -24 * al); ad(b, 'pescoco', -12 * al); ad(b, 'cabeca', -4 * al); ad(b, 'rabo', 26 * al); ad(b, 'rabo2', 14 * al); }
        if (P.abana) { ad(b, 'rabo', 20 * P.abana * Math.sin(TAU * 4.5 * t)); ad(b, 'rabo2', 16 * P.abana * Math.sin(TAU * 4.5 * t - .9)); }
        const la = P.latido;
        ad(b, 'mandibula', 24 * (la + (P.boca || 0)));
        if (la) { ad(b, 'pescoco', -7 * la); ad(b, 'cabeca', -5 * la); ad(b, 'corpo', -1.5 * la); }
      },
    }, 1.25);
  }

  // ---------- queixada e caititu (guia §7.8) ----------
  // Cabeça = 'focinho' e queixo = 'queixo' (não colidem com a cabeça e a mandíbula do Curupira montado).
  // op.caititu: pelagem argila com colar claro; op.semente: variação de corpo, crina e passada (vara).
  const QX = { queixada: { pelo: '#5E4B3C', claro: '#F0E2C4', casco: '#2E241C' }, caititu: { pelo: '#A8764E', claro: '#EADBB8', casco: '#3A2A1E' } };
  function partesPorco(op) {
    const C = op.caititu ? QX.caititu : QX.queixada, r = S.rng(op.semente || 1), pl = S.bonecos.pelo, sem = op.semente || 1;
    const corpo = [[34, -84], [16, -92], [-6, -90], [-28, -84], [-46, -76], [-58, -66], [-63, -54], [-61, -43], [-52, -36], [-40, -34], [-20, -32.6], [4, -32],
      [22, -34], [32, -38], [40, -46], [44, -58], [44, -72]];
    // crina só da nuca até o meio do lombo, curta (a crista inteira lia como ouriço ou jacaré)
    const crina = pl(spline([[40, -78], [30, -88.4], [16, -93], [2, -92.4], [-12, -90], [-22, -86.6], [-12, -85.4], [2, -86.4], [20, -82], [34, -74]]),
      (nx, ny) => ny < -.4, { semente: sem * 7 + 3, tam: [2.6, 5.4], passo: [2.2, 3.6], cai: -.2 });
    const focinho = [[26, -84], [38, -90], [50, -88], [66, -78], [82, -66], [94, -57], [99, -55], [101, -50], [100, -45], [95, -44], [80, -46], [64, -50], [50, -54],
      [38, -58], [28, -64], [24, -74]];
    const queixo = [[40, -57], [56, -50.6], [74, -46.6], [89, -44], [96, -43], [95.4, -37.4], [86, -34.4], [70, -35], [54, -38.6], [42, -46]]; // queixo branco: a marca da queixada
    const orelha = [[34.6, -86], [36, -93], [38.6, -100.6, 1], [43.6, -94], [45.4, -87.6], [40, -84]];
    const canD = [[27.4, -42.4], [29.6, -46.4], [34, -46.6], [36.4, -42], [36, -32], [35.2, -22], [35, -17.6], [33.6, -14], [30.8, -14], [29.6, -18], [29.2, -26], [28.6, -34]];
    const peD = [[30, -16.6], [32.2, -19.2], [34.6, -17], [34.6, -10], [35, -5.6], [37.6, -3.4], [40.6, -.2, 1], [35, .8], [30.6, .6, 1], [30.4, -4], [29.8, -10]];
    const canT = [[-50.4, -42], [-45.4, -45.6], [-40.6, -42.6], [-41.4, -34], [-46, -26], [-50, -20.6], [-52, -16.4], [-55.2, -16.6], [-56.2, -20.6], [-54.6, -28], [-52.4, -36]];
    const peT = [[-55.6, -18.2], [-53.4, -20.6], [-51, -18.6], [-50.6, -11], [-50, -5.6], [-47.2, -3.4], [-44.4, -.2, 1], [-50, .8], [-54.6, .6, 1], [-54.8, -4], [-55.4, -11]];
    const casco = x0 => spline([[x0 - 1.4, -4.2], [x0 + 6.6, -3.6], [x0 + 9.4, -.2, 1], [x0 + 3, .9], [x0 - 2.2, .6, 1]]);
    const pata = (id, pv, can, pj, pe, dx, atras, xc) => [
      { id, pai: 'corpo', pivo: [pv[0] + dx, pv[1]], junta: false, atras, formas: [{ d: mover(spline(can), dx, 0), cor: C.pelo }, ...(atras ? [] : [rebite(pv[0], pv[1])])] },
      { id: id + '2', pai: id, pivo: [pj[0] + dx, pj[1]], junta: false, atras, formas: [{ d: mover(spline(pe), dx, 0), cor: C.pelo },
        { d: mover(casco(xc), dx, 0), cor: C.casco, contorno: 0 }, ...(atras ? [] : [rebite(pj[0], pj[1])])] }];
    const colar = op.caititu ? [{ d: spline([[42, -74], [36, -82], [28, -86], [22, -78], [24, -60], [28, -40], [36, -42], [40, -58]]), cor: C.claro, contorno: 0,
      vazado: { motivo: 'g-cobra', margem: 2.5, faixa: spline([[38, -72], [31, -80], [26, -76], [28, -60], [31, -46], [35, -58]]) } }] : [];
    const kx = 1 + (r() - .5) * .1, ky = 1 + (r() - .5) * .08;
    const curto = d => mapa(d, (x, y) => [x > 48 ? 48 + (x - 48) * .74 : x, y]); // focinho mais curto que o desenho base
    const cab = p => Object.assign(p, { formas: p.formas.map(f => Object.assign({}, f, { d: curto(f.d) })), furos: (p.furos || []).map(curto),
      brancos: (p.brancos || []).map(l => Object.assign({}, l, { d: curto(l.d) })), linhas: (p.linhas || []).map(l => Object.assign({}, l, { d: curto(l.d) })) });
    return {
      C, k: [kx, ky],
      partes: [
        ...pata('tl', [-46, -40], canT, [-53.4, -17.6], peT, -6, 1, -53), ...pata('dl', [32, -42], canD, [32.4, -15.8], peD, 6, 1, 31.6),
        { id: 'corpo', pivo: [-10, -58], formas: [{ d: spline(corpo), cor: C.pelo }, ...colar,
          { d: spline([[-40, -36], [-10, -34.6], [16, -36], [32, -42], [14, -40.6], [-12, -39.4], [-36, -40]]), cor: op.caititu ? C.claro : '#7A6250', contorno: 0 }],
          // pelo em espinha de peixe: duas divisas de fendas no flanco (no lugar da hachura, que lia como escama)
          furos: [fenda([[6, -64], [-6, -70], [-16, -73]], 2), fenda([[6, -60], [-6, -53], [-16, -50]], 2), fenda([[-14, -64], [-25, -69], [-34, -71]], 2),
            fenda([[-14, -60], [-25, -54], [-34, -52]], 2), fenda([[26, -70], [22, -58], [24, -46]], 1.6), fenda([[-40, -70], [-48, -60], [-50, -48]], 1.6)] },
        { id: 'crina', pai: 'corpo', pivo: [-8, -84], junta: false, formas: [{ d: crina, cor: op.caititu ? '#7E5638' : '#3E3128' }] },
        cab({ id: 'queixo', pai: 'focinho', opaca: true, pivo: [48, -52], junta: false, formas: [{ d: spline(queixo), cor: C.claro }],
          linhas: [{ d: 'M56 -45C66 -42.6 78 -41 90 -40.4', op: .4, w: 1 }] }),
        cab({ id: 'focinho', pai: 'corpo', opaca: true, pivo: [34, -66], junta: false, formas: [{ d: spline(focinho), cor: C.pelo },
          { d: spline([[96.6, -56.2], [100.8, -52], [101.4, -48], [100, -44.6], [96.2, -45], [95.6, -51]]), cor: C.casco, contorno: 0 },
          { d: spline([[42, -60], [56, -57], [72, -52], [88, -47.6], [94, -46], [88, -44.4], [72, -46], [56, -50], [44, -55]]), cor: C.claro, contorno: 0 }, // bochecha clara
          ],
          furos: [elipse(54.6, -74.4, 2.2, 1.6), elipse(98.6, -50.4, .9, 1.3), ...hachura([[30, -82], [46, -85], [62, -77], [78, -66], [64, -60], [46, -62], [32, -66]],
            { passo: [9, 7.4], comp: 6.4, larg: 1.1, ang: 200, semente: sem * 5 + 2 })],
          brancos: [{ d: elipse(54.2, -74.6, .9, .9) }],
          linhas: [{ d: 'M50 -78C53 -80 57 -80 59.6 -78', w: 1.2 }, { d: 'M86 -59C89 -56.6 91 -54 92 -51', op: .5 }] }),
        { id: 'orelha', pai: 'focinho', pivo: [38, -86], junta: false, formas: [{ d: spline(orelha), cor: C.pelo }], furos: [fenda([[37, -88], [38, -93], [38.6, -97]], 1.2, 4)] },
        ...pata('tp', [-46, -40], canT, [-53.4, -17.6], peT, 0, 0, -53), ...pata('dp', [32, -42], canD, [32.4, -15.8], peD, 0, 0, 31.6),
      ],
    };
  }
  function autoPorco(b, t) {
    const P = b.pose, d = P.dentes || 0;
    vivo(b, t);
    if (d) ad(b, 'queixo', 9 * d * Math.max(0, Math.sin(TAU * 7 * t)));
    ad(b, 'queixo', 26 * (P.grunhido || 0));
    b.extra.s.crina = 1 + .3 * (P.erica || 0) + .04 * d * Math.sin(TAU * 7 * t + 1);
    ad(b, 'orelha', 8 * Math.max(0, Math.sin(TAU * .37 * t + (b.def.cfg.fase0 || 0) * 9)) ** 8 - 12 * (P.erica || 0));
  }
  function defQueixada(op) {
    op = op || {};
    const q = partesPorco(op), fase0 = op.fase0 == null ? S.hash((op.semente || 1) * 131) : op.fase0;
    return local({
      nome: op.caititu ? 'caititu' : 'queixada', H: 100, partes: q.partes,
      cfg: { perna: 40, rabo: 0, fase0, bob: 1.2 },
      varetas: [{ parte: 'focinho', ponto: [50, -72], mestra: true }, { parte: 'corpo', ponto: [-40, -66] }],
      pose: { respiro: 1, dentes: 0, grunhido: 0, erica: 0 },
      auto: autoPorco,
    }, [(op.k || 1.08) * q.k[0], (op.k || 1.08) * q.k[1]]);
  }
  // vara: n bichos com variação de escala (.85–1,1), profundidade z (0–.4), atraso (.06–.3 s, cumulativo)
  // e passada própria. Devolve a lista (b.atraso = s de atraso em relação ao primeiro; b.fila = posição na fila).
  function vara(n, op) {
    op = op || {};
    const r = S.rng(op.semente || 7), L = [];
    let atraso = 0;
    for (let i = 0; i < (n || 7); i++) {
      const semente = (op.semente || 7) * 17 + i, esc = (op.escala || 1) * (.85 + r() * .25), z = r() * .4;
      const b = criar(defQueixada({ semente, caititu: op.caititu && i % 3 === 2 }), Object.assign({}, op, { escala: esc, z }));
      b.atraso = atraso; b.fila = i; atraso += .06 + r() * .24;
      L.push(b);
    }
    return L;
  }

  // ---------- onça-pintada (guia §7.6): anda sem pressa, ombros rolando; à espreita; esturro ----------
  const ONCA = { pelo: '#E2A324', barriga: '#EBD3A2', escuro: '#4E3216', focinho: '#3A2418' };
  function defOnca(op) {
    op = op || {};
    const C = ONCA, pl = S.bonecos.pelo;
    // desenho base comprido; o corpo atrás do ombro encolhe 20% (onça é atarracada) e anca, patas de trás e rabo vêm junto
    const T = (x, y) => [x < 40 ? 40 + (x - 40) * .8 : x, y], dT = x => T(x, 0)[0] - x;
    const L = P => P.map(p => [...T(p[0], p[1]), p[2]].filter(v => v != null));
    const corpo = L([[54, -111], [36, -106], [14, -103], [-10, -101], [-34, -104], [-56, -108], [-76, -106], [-92, -98], [-104, -86], [-110, -70], [-108, -56], [-98, -46],
      [-84, -42], [-70, -42], [-60, -46], [-46, -46], [-26, -43], [-4, -42], [18, -41], [40, -40], [58, -40], [70, -44], [82, -50], [94, -58], [100, -70], [100, -84], [90, -98], [74, -108]]);
    const ombro = x => spline([[x - 14, -106.6], [x - 8, -113], [x, -115.6], [x + 8, -113], [x + 14, -106.6], [x, -104.6]]), arco = x => `M${x - 13.6} -107.4C${x - 9} -112.6 ${x - 4} -115.4 ${x} -115.6C${x + 4} -115.4 ${x + 9} -112.6 ${x + 13.6} -107.4`;
    const pescoco = [[66, -109], [86, -113], [104, -113], [120, -112], [128, -100], [130, -86], [122, -74], [108, -66], [99, -62], [96, -72], [88, -90], [76, -104]];
    const cabeca = [[113, -110], [117, -121], [127, -127], [141, -127.4], [152.6, -122], [161, -113], [168, -104.6], [173, -99], [174.4, -93], [172.4, -88], [166, -86],
      [160, -84.6], [150, -83.4], [140, -82.4], [130, -82.4], [120, -86], [113, -96]];
    const mand = [[132, -84.6], [146, -84.6], [160, -84.6], [168, -84.4], [168.4, -80], [160, -75], [148, -72.8], [136, -74.6], [129, -80]];
    const orelha = [[119, -120.6], [119.6, -127], [124.4, -131.4], [130, -129], [131, -123], [126, -119.6]];
    const larga = (P, cx, k) => P.map(([x, y, q]) => q ? [cx + (x - cx) * k, y, q] : [cx + (x - cx) * k, y]);
    const canD = larga([[62, -52], [66, -60], [78, -62], [86, -56], [86, -44], [84, -32], [83, -22], [82, -16], [79, -12], [74, -12], [71, -16], [70, -24], [68, -34], [64, -44]], 75, 1.25);
    const peD = larga([[71, -17], [73, -21], [78, -22], [83, -20], [84, -13], [87, -8], [93, -6.4], [98, -4.4], [99.6, -1.4], [96.6, .7, 1], [86, 1], [76, 1], [71, .4, 1], [70, -5], [70, -11]], 77, 1.2);
    const xt = dT(-72), xr = dT(-92);
    const canT = larga([[-80, -52], [-72, -56], [-62, -52], [-61, -42], [-67, -32], [-77, -24], [-85, -18.6], [-90, -14], [-96, -14], [-99.4, -18], [-98, -26], [-92, -34], [-86, -42]], -80, 1.2).map(p => [p[0] + xt, p[1]]);
    const peT = larga([[-99, -18], [-96, -22], [-91, -21], [-89, -14], [-86, -8.4], [-80, -6.4], [-74.4, -4.4], [-72.4, -1.4], [-75.4, .7, 1], [-85, 1], [-95, 1], [-99, .4, 1], [-100, -6], [-100, -12]], -92, 1.2)
      .map(p => [p[0] + xt, p[1], p[2]].filter(v => v != null));
    const rabo = [[-90, -102], [-104, -99], [-118, -89.6], [-130, -78], [-135, -70], [-128, -64.6], [-116, -75], [-102, -85], [-92, -89]].map(p => [p[0] + xr, p[1]]);
    const rabo2 = [[-135, -78], [-149, -63.6], [-164, -52], [-176, -48], [-179, -40], [-172, -36.6], [-159, -42.6], [-143, -55], [-127.6, -65]].map(p => [p[0] + xr, p[1]]);
    const rabo3 = [[-177, -49], [-190, -48], [-204, -50], [-215, -57], [-219.6, -65.4, 1], [-209.6, -59], [-200, -53], [-188, -49], [-176.6, -37.6]].map(p => [p[0] + xr, p[1], p[2]].filter(v => v != null));
    const furosPata = (x0, dx) => [0, 4.8, 9.4].map(k => mover(fenda([[x0 + k, -7], [x0 + k - .4, -3.2], [x0 + k - .8, .2]], 1.1, 4), dx, 0));
    const pataD = (id, dx, atras) => [
      { id, pai: 'corpo', pivo: [75 + dx, -48], junta: false, atras, formas: [{ d: mover(spline(canD), dx, 0), cor: C.pelo }, ...(atras ? [] : [rebite(75, -48)])],
        furos: atras ? [] : pintas([[66, -54], [82, -56], [82, -26], [75, -18], [70, -34]], { passo: 7, r: [1, 2], semente: 3 }) },
      { id: id + '2', pai: id, pivo: [77 + dx, -16], junta: false, atras, formas: [{ d: mover(spline(peD), dx, 0), cor: C.pelo }, ...(atras ? [] : [rebite(77, -16)])], furos: furosPata(89, dx) }];
    const pataT = (id, dx, atras) => [
      { id, pai: 'corpo', pivo: [-72 + xt + dx, -46], junta: false, atras, formas: [{ d: mover(spline(canT), dx, 0), cor: C.pelo }, ...(atras ? [] : [rebite(-72 + xt, -46)])],
        furos: atras ? [] : pintas([[-76 + xt, -50], [-64 + xt, -50], [-71 + xt, -34], [-89 + xt, -22], [-95 + xt, -26]], { passo: 7, r: [1, 2], semente: 5 }) },
      { id: id + '2', pai: id, pivo: [-94 + xt + dx, -17], junta: false, atras, formas: [{ d: mover(spline(peT), dx, 0), cor: C.pelo }, ...(atras ? [] : [rebite(-94 + xt, -17)])], furos: furosPata(-84 + xt, dx) }];
    const partes = [
      ...pataT('tl', -8, 1), ...pataD('dl', 9, 1),
      { id: 'ombroL', pai: 'corpo', opaca: true, pivo: [50, -104], junta: false, atras: 1, formas: [{ d: ombro(50), cor: C.pelo, contorno: 0 }], linhas: [{ d: arco(50), w: 1.2, op: 1 }] },
      { id: 'rabo', pai: 'corpo', pivo: [-92 + xr, -96], junta: false, formas: [{ d: spline(rabo), cor: C.pelo }],
        furos: pintas([[-98 + xr, -94], [-116 + xr, -84], [-128 + xr, -72], [-118 + xr, -78], [-102 + xr, -90]], { passo: 7, r: [1.4, 2.4], semente: 7 }) },
      { id: 'rabo2', pai: 'rabo', opaca: true, pivo: [-131 + xr, -72], junta: false, formas: [{ d: spline(rabo2), cor: C.pelo }],
        furos: [[-142, -64], [-152, -56], [-162, -49], [-171, -44]].map(([x, y], i) => fenda([[x + xr - 2, y - 4.4], [x + xr + .4, y], [x + xr + 2, y + 4.4]], 2.2 + i * .2, 5)) },
      { id: 'rabo3', pai: 'rabo2', opaca: true, pivo: [-175 + xr, -43], junta: false, formas: [{ d: spline(rabo3), cor: C.pelo },
        { d: spline([[-204 + xr, -50], [-215 + xr, -57], [-219.6 + xr, -65.4, 1], [-209.6 + xr, -59], [-202 + xr, -54]]), cor: C.escuro, contorno: 0 }],
        furos: [[-184, -48], [-194, -49]].map(([x, y]) => fenda([[x + xr - 1.4, y - 4], [x + xr, y], [x + xr + 1.4, y + 4]], 2.4, 5)) },
      { id: 'corpo', pivo: [-6, -74], formas: [{ d: spline(corpo), cor: C.pelo },
        { d: spline(L([[66, -46], [40, -42], [18, -43], [-4, -44], [-26, -45], [-46, -48], [-60, -49], [-50, -55], [-26, -52.6], [0, -51.6], [30, -51], [54, -54]])), cor: C.barriga, contorno: 0 }],
        furos: [...rosetas(L([[58, -100], [20, -96], [-10, -94], [-40, -98], [-70, -99], [-92, -89], [-101, -72], [-97, -57], [-80, -52], [-50, -56], [-20, -55], [10, -54], [40, -54], [62, -60], [72, -78], [70, -96]]),
          { passo: 19, r: [5, 8.4], larg: 2.5, semente: 17 }),
          ...hachura(L([[60, -50], [30, -46], [0, -46.6], [-30, -48], [-50, -51], [-30, -51.6], [0, -50.6], [30, -50]]), { passo: [5.6, 3.2], comp: 3.6, larg: .9, ang: 95, semente: 9 })] },
      { id: 'pescoco', pai: 'corpo', opaca: true, pivo: [86, -96], junta: false, formas: [{ d: spline(pescoco), cor: C.pelo },
        { d: spline([[128, -88], [122, -74], [108, -66], [99, -62.4], [106, -72], [118, -80]]), cor: C.barriga, contorno: 0 }],
        furos: rosetas([[82, -104], [100, -108], [116, -104], [118, -92], [108, -80], [98, -76], [90, -90]], { passo: 15, r: [4, 6], larg: 2.2, semente: 19 }) },
      { id: 'ombro', pai: 'corpo', opaca: true, pivo: [64, -104], junta: false, formas: [{ d: ombro(64), cor: C.pelo, contorno: 0 }], linhas: [{ d: arco(64), w: 1.2, op: 1 }] },
      { id: 'mandibula', pai: 'cabeca', opaca: true, pivo: [136, -84], junta: false, formas: [{ d: spline(mand), cor: C.barriga }], linhas: [{ d: 'M140 -80C148 -78 156 -78.4 164 -80', op: .45, w: 1 }] },
      { id: 'cabeca', pai: 'pescoco', opaca: true, pivo: [124, -98], junta: false, formas: [{ d: spline(cabeca), cor: C.pelo },
        { d: spline([[156, -104], [166, -101], [172, -96], [172, -89], [164, -86.4], [154, -88], [150, -94]]), cor: C.barriga, contorno: 0 },
        { d: spline([[167.4, -101.6], [172.6, -99], [174.4, -94], [171, -92.6], [167, -95]]), cor: C.focinho, contorno: 0 }],
        furos: ['M147.4 -112.2C149.4 -115.2 154.4 -115.6 157.6 -112.4C154.8 -109.8 150.2 -109.6 147.4 -112.2Z', fenda([[150, -85.6], [158, -85.6], [166, -86.8]], 1.1),
          ...pintas([[118, -114], [128, -124], [142, -124], [150, -118], [140, -108], [128, -100], [120, -98]], { passo: 6.4, r: [.9, 1.7], semente: 11 }),
          ...pintas([[136, -98], [146, -102], [152, -96], [146, -90], [136, -90]], { passo: 5, r: [.7, 1.1], semente: 13 }),
          elipse(160, -95.4, .7, .7), elipse(163, -93.6, .7, .7), elipse(160.6, -91.6, .7, .7)],
        brancos: [{ d: elipse(152.6, -112.4, 1.6, 1.7) }],
        linhas: [{ d: 'M144.6 -117.4C149.6 -120.4 155.6 -119.6 159.6 -116.2', w: 2 }, { d: 'M152.6 -109.6C152 -105 153.6 -100 157 -97', w: 1.4, op: .8 }, { d: 'M126 -96C132 -90 140 -87.4 148 -87', op: .45 }] },
      { id: 'orelha', pai: 'cabeca', pivo: [125, -122], junta: false, formas: [{ d: spline(orelha), cor: C.escuro }], furos: [elipse(124.6, -126, 1.6, 1.3)] },
      ...pataT('tp', 0, 0), ...pataD('dp', 0, 0),
    ];
    return local({
      nome: 'onca', H: 140, partes,
      cfg: { perna: 48, rabo: 7, ombro: .3, fase0: op.fase0 || 0, bob: .8 },
      varetas: [{ parte: 'pescoco', ponto: [100, -100], mestra: true }, { parte: 'corpo', ponto: [-50, -90] }],
      pose: { respiro: 1, espreita: 0, esturro: 0 },
      auto(b, t) {
        const P = b.pose, e = P.espreita, z = P.esturro;
        vivo(b, t);
        b.extra.s.ombroL = 2 - (b.extra.s.ombro || 1); // as duas escápulas sobem e descem alternadas
        ad(b, 'rabo3', 9 * Math.sin(TAU * .45 * t) + 14 * e * Math.max(0, Math.sin(TAU * 1.3 * t)) ** 3); // a ponta do rabo nunca para
        ad(b, 'rabo2', 4 * Math.sin(TAU * .45 * t - .8));
        if (e) {
          b.extra.dy += 14 * e; ad(b, 'pescoco', 16 * e); ad(b, 'cabeca', -14 * e); ad(b, 'orelha', -10 * e); ad(b, 'rabo', -14 * e);
          for (const id of ['dp', 'dl']) { ad(b, id, -12 * e); ad(b, id + '2', 20 * e); }
          for (const id of ['tp', 'tl']) { ad(b, id, -16 * e); ad(b, id + '2', -6 * e); }
        }
        if (z) { ad(b, 'pescoco', -22 * z); ad(b, 'cabeca', -16 * z); ad(b, 'mandibula', 32 * z); ad(b, 'orelha', 22 * z); ad(b, 'corpo', -2 * z); }
        ad(b, 'mandibula', 30 * (P.boca || 0));
      },
    }, 1);
  }

  // ---------- veada prenhe e filhote (guia §7.7) ----------
  // Bebe no riacho (bebe 0..1), ergue a cabeça e gira as orelhas (alerta 0..1), olha para trás (olharTras 0..1:
  // passada a metade, a cabeça troca pela de perfil invertido), foge em saltos (andadura 'salto').
  const VEADA = { pelo: '#D08F58', claro: '#EEDCB6', escuro: '#3A2418', casco: '#2E2018' };
  function defVeada(op) {
    op = op || {};
    const C = VEADA;
    const corpo = [[34, -122], [10, -125], [-20, -128.6], [-46, -130.6], [-62, -125], [-71.6, -116], [-75.4, -104], [-74, -92], [-66, -82], [-54, -77], [-46, -76],
      [-36, -64], [-22, -54], [-4, -50.4], [14, -53], [28, -61], [40, -72], [48, -78], [54, -86], [58, -98], [56, -110], [46, -119]]; // prenhe: barriga redonda e baixa
    const pescoco = [[30, -120], [44, -130], [60, -146], [76, -164], [88, -177], [98, -172], [98, -160], [86, -146], [72, -128], [62, -112], [58, -100], [48, -108]];
    const cabeca = [[86, -178], [92, -186.6], [102, -189], [112, -186.4], [120, -180], [129, -173], [137, -167.4], [141, -164], [140.4, -160], [136, -158.4], [128, -157.6],
      [118, -159], [106, -162], [96, -166], [88, -170]];
    const orelha = [[93, -186], [90, -194], [84, -205], [78.6, -215.4, 1], [88, -208], [96, -198], [100, -189]];
    const canD = [[41, -78], [43, -84.4], [50, -84.6], [53.4, -79], [53, -66], [51.4, -54], [51, -46], [49.6, -41.6], [46.6, -41.6], [45.4, -46], [44.4, -56], [43, -68]];
    const peD = [[45.6, -44], [48, -47], [50.6, -44.6], [50.6, -30], [50.4, -16], [50.8, -9], [52.4, -5.4], [56.4, -2.4], [58.6, .7, 1], [52, .9], [47.6, .7, 1], [47.6, -6],
      [47, -12], [46.6, -26]];
    const canT = [[-56, -84], [-47, -86], [-40.6, -80], [-42, -70], [-50, -58], [-58, -50], [-63, -45], [-68, -42], [-71, -46], [-69.6, -54], [-64, -66], [-60, -76]];
    const peT = [[-70.6, -45.6], [-68, -48.6], [-64.4, -46], [-63.4, -32], [-62, -18], [-61, -9], [-59.4, -5.4], [-55.4, -2.4], [-53.2, .7, 1], [-59.8, .9], [-64.2, .7, 1],
      [-64.2, -6], [-65.6, -14], [-67.6, -28]];
    const casco = x => spline([[x - 1.8, -5.6], [x + 3.6, -4], [x + 7.2, .7, 1], [x - .4, .9], [x - 3, .7, 1]]);
    const pata = (id, pv, can, pj, pe, xc, dx, atras) => [
      { id, pai: 'corpo', pivo: [pv[0] + dx, pv[1]], junta: false, atras, formas: [{ d: mover(spline(can), dx, 0), cor: C.pelo }, ...(atras ? [] : [rebite(pv[0], pv[1])])] },
      { id: id + '2', pai: id, pivo: [pj[0] + dx, pj[1]], junta: false, atras, formas: [{ d: mover(spline(pe), dx, 0), cor: C.pelo }, { d: mover(casco(xc), dx, 0), cor: C.casco, contorno: 0 },
        ...(atras ? [] : [rebite(pj[0], pj[1])])] }];
    const olho = 'M106.4 -177.6C108.4 -181 113.6 -181.4 116.4 -178.2C113.8 -175.4 109 -175.2 106.4 -177.6Z';
    const cabFormas = d => [{ d: spline(cabeca), cor: C.pelo }, // rosto sóbrio: sem focinho claro (lia como desenho animado)
      { d: spline([[135.6, -167.6], [140.4, -164.6], [140.4, -160.6], [136.6, -161.4]]), cor: C.escuro, contorno: 0 }];
    const cabFuros = [olho, elipse(138, -163.4, .8, 1)];
    const espelho = (d, px) => mapa(d, (x, y) => [2 * px - x, y]);
    const pescCabeca = [86, -174];
    const partes = [
      ...pata('tl', [-48, -80], canT, [-67.4, -45.4], peT, -61.6, -7, 1), ...pata('dl', [47, -80], canD, [48.2, -43.6], peD, 51.4, 7, 1),
      { id: 'orelhaL', pai: 'cabeca', pivo: [97, -188], junta: false, atras: 1, formas: [{ d: mover(spline(orelha), 6, 1), cor: C.pelo }] },
      { id: 'rabo', pai: 'corpo', pivo: [-66, -122], junta: false, formas: [{ d: spline([[-62, -126], [-70, -124], [-76, -116], [-77, -106], [-72.6, -104, 1], [-70, -112], [-66, -118]]), cor: C.pelo },
        { d: spline([[-76.2, -113], [-77, -106], [-72.6, -104, 1], [-72.6, -112]]), cor: C.claro, contorno: 0 }] },
      { id: 'corpo', pivo: [-8, -96], formas: [{ d: spline(corpo), cor: C.pelo },
        { d: spline([[-38, -70], [-24, -58], [-6, -52.6], [12, -55], [26, -62.6], [38, -72.4], [24, -67], [6, -62], [-12, -61], [-26, -66]]), cor: C.claro, contorno: 0 }],
        furos: [...pintas([[30, -118], [0, -121], [-30, -124], [-56, -122], [-60, -112], [-34, -114], [-4, -111], [24, -108]], { passo: 8.6, r: [1.1, 1.8], semente: 23 }),
          fenda([[38, -112], [44, -100], [46, -88]], 1.5), fenda([[-50, -116], [-58, -104], [-60, -90]], 1.5), fenda([[-18, -66], [0, -60], [18, -63]], 1.3)] },
      { id: 'pescoco', pai: 'corpo', opaca: true, pivo: [40, -112], junta: false, formas: [{ d: spline(pescoco), cor: C.pelo },
        { d: spline([[98, -164], [88, -150], [74, -132], [62, -114], [58, -101], [66, -116], [80, -136], [92, -152]]), cor: C.claro, contorno: 0 }],
        furos: hachura([[44, -124], [58, -138], [72, -154], [80, -158], [74, -142], [62, -126], [52, -116]], { passo: [5.4, 5], comp: 4.4, larg: .9, ang: 130, semente: 29 }) },
      { id: 'cabeca', pai: 'pescoco', opaca: true, pivo: pescCabeca, junta: false, formas: cabFormas(), furos: cabFuros },
      { id: 'cabecaVolta', pai: 'pescoco', opaca: true, pivo: pescCabeca, junta: false, formas: [...cabFormas().map(f => Object.assign({}, f, { d: espelho(f.d, pescCabeca[0]) })),
        { d: espelho(spline(orelha), pescCabeca[0]), cor: C.pelo }], furos: cabFuros.map(d => espelho(d, pescCabeca[0])) },
      { id: 'orelha', pai: 'cabeca', pivo: [95, -187], junta: false, formas: [{ d: spline(orelha), cor: C.pelo }, { d: spline([[92, -190], [87, -200], [83, -209], [91, -201], [96, -193]]), cor: C.claro, contorno: 0 }],
        furos: [fenda([[93, -192], [89, -199], [85.6, -205]], 1.1, 5)] },
      ...pata('tp', [-48, -80], canT, [-67.4, -45.4], peT, -61.6, 0, 0), ...pata('dp', [47, -80], canD, [48.2, -43.6], peD, 51.4, 0, 0),
    ];
    return local({
      nome: 'veada', H: 215, partes,
      cfg: { perna: 80, rabo: 4, voo: 64, fase0: op.fase0 || 0, passos: { salto: 135 } },
      varetas: [{ parte: 'pescoco', ponto: [62, -132], mestra: true }, { parte: 'corpo', ponto: [-46, -112] }],
      pose: { respiro: 1, bebe: 0, alerta: 0, olharTras: 0, o: { cabecaVolta: 0 } },
      auto(b, t) {
        const P = b.pose, be = P.bebe, al = P.alerta, ot = P.olharTras;
        vivo(b, t);
        // orelhas vivas: piparotes curtos e defasados
        // alerta: em pé e giradas para a frente (só com a cabeça alta); bebendo: deitadas para trás, rente à nuca
        // (de cabeça baixa, orelha para a frente lê como chifre)
        const fr = al * (1 - be);
        ad(b, 'orelha', 10 * Math.max(0, Math.sin(TAU * .23 * t)) ** 12 + 20 * fr);
        ad(b, 'orelhaL', 10 * Math.max(0, Math.sin(TAU * .19 * t + 2)) ** 12 + 16 * fr);
        if (be) { ad(b, 'pescoco', 96 * be); ad(b, 'cabeca', -14 * be); ad(b, 'corpo', 4 * be); b.extra.dy += 3 * be; ad(b, 'dp', -10 * be); ad(b, 'dl', 6 * be); ad(b, 'orelha', -112 * be); ad(b, 'orelhaL', -106 * be); }
        if (al) { ad(b, 'pescoco', -10 * al); ad(b, 'cabeca', -6 * al); }
        if (ot) {
          ad(b, 'pescoco', -50 * ot);
          const v = ot > .5;
          for (const id of ['cabeca', 'orelha', 'orelhaL']) b.extra.o[id] = v ? 0 : 1;
          b.extra.o.cabecaVolta = v ? 1 : 0;
          ad(b, 'cabecaVolta', 34 * ot);
        }
      },
    }, 1);
  }
  // filhote de pernas bambas: cabeça e orelhas grandes, pintas claras em fileiras; bambo 0..1 faz as pernas tremerem
  function defFilhote(op) {
    op = op || {};
    const C = VEADA;
    const corpo = [[16, -70], [0, -72], [-20, -73], [-36, -71], [-44, -64], [-46, -54], [-40, -46], [-30, -46], [-16, -43], [0, -42], [14, -44], [24, -50], [28, -60], [24, -68]];
    const pescoco = [[12, -68], [22, -76], [32, -88], [40, -98], [48, -94], [46, -84], [38, -72], [32, -60], [24, -58]];
    const cabeca = [[36, -100], [42, -107], [52, -109.6], [60, -106], [66, -100], [71, -95.6], [72.4, -92], [70, -89.4], [64, -88.6], [56, -89.6], [48, -92], [40, -94]];
    const orelha = [[42, -104], [37, -110], [30, -117], [23, -122, 1], [29, -124.6], [37.6, -121], [44.6, -114], [48, -107]];
    const canD = [[16.6, -46], [18.6, -50], [23, -50], [24.6, -46], [24, -36], [23.6, -28], [23.6, -24.4], [22.2, -21.6], [19.8, -21.6], [18.6, -24.4], [18.4, -30], [17.6, -38]];
    const peD = [[19, -23], [21, -25.6], [23.2, -23], [23.4, -14], [23.4, -7], [24.6, -4], [27.6, -1.8], [29.2, .6, 1], [24, .8], [20.4, .6, 1], [20.4, -5], [19.6, -12]];
    const canT = [[-34, -50], [-27, -52], [-23.6, -47], [-25, -40], [-30, -33], [-34.6, -28.6], [-37.6, -26], [-40, -28.4], [-39.4, -34], [-37, -42]];
    const peT = [[-40, -27], [-38, -29.4], [-35.4, -27.4], [-35, -17], [-34.4, -9], [-33.4, -4.4], [-30.4, -1.8], [-28.8, .6, 1], [-34, .8], [-37.4, .6, 1], [-37.4, -6], [-38.6, -14]];
    const casco = x => spline([[x - 1.4, -4.4], [x + 2.8, -3], [x + 5.6, .6, 1], [x - .4, .8], [x - 2.4, .6, 1]]);
    const pata = (id, pv, can, pj, pe, xc, dx, atras) => [
      { id, pai: 'corpo', pivo: [pv[0] + dx, pv[1]], junta: false, atras, formas: [{ d: mover(spline(can), dx, 0), cor: C.pelo }] },
      { id: id + '2', pai: id, pivo: [pj[0] + dx, pj[1]], junta: false, atras, formas: [{ d: mover(spline(pe), dx, 0), cor: C.pelo }, { d: mover(casco(xc), dx, 0), cor: C.casco, contorno: 0 },
        { d: mover(elipse(pj[0], pj[1], 3, 3), dx, 0), cor: C.pelo }] }];
    const fila = (y0, y1, x0, x1, n, r) => Array.from({ length: n }, (_, i) => elipse(x0 + (x1 - x0) * i / (n - 1), y0 + (y1 - y0) * i / (n - 1) + (i % 2 ? .8 : -.8), r, r * .8));
    const partes = [
      ...pata('tl', [-28, -48], canT, [-38.4, -26.6], peT, -33.4, -4, 1), ...pata('dl', [21, -47], canD, [21.2, -22.6], peD, 24.6, 4, 1),
      { id: 'orelhaL', pai: 'cabeca', pivo: [46, -106], junta: false, atras: 1, formas: [{ d: mover(spline(orelha), 5, 1), cor: C.pelo }] },
      { id: 'corpo', pivo: [-10, -58], formas: [{ d: spline(corpo), cor: C.pelo }, { d: spline([[-30, -47], [-14, -44], [2, -43.4], [16, -46], [6, -48], [-12, -49]]), cor: C.claro, contorno: 0 }],
        furos: [...fila(-67, -68, 12, -38, 9, 1.6), ...fila(-61, -62, 16, -40, 10, 1.5), ...fila(-55, -55, 10, -36, 8, 1.4)] },
      { id: 'rabo', pai: 'corpo', pivo: [-40, -68], junta: false, formas: [{ d: spline([[-38, -71], [-45, -69], [-48, -62], [-44.6, -60.4, 1], [-42, -66]]), cor: C.pelo }] },
      { id: 'pescoco', pai: 'corpo', opaca: true, pivo: [20, -64], junta: false, formas: [{ d: spline(pescoco), cor: C.pelo }, { d: spline([[46, -88], [38, -74], [31, -62], [36, -70], [42, -80]]), cor: C.claro, contorno: 0 }] },
      { id: 'cabeca', pai: 'pescoco', opaca: true, pivo: [42, -96], junta: false, formas: [{ d: spline(cabeca), cor: C.pelo },
        { d: spline([[68.6, -97], [72.4, -93], [70.4, -89.6], [67.6, -91.4]]), cor: C.escuro, contorno: 0 }],
        furos: ['M53.4 -100.6C55.4 -104 60.4 -104.4 63 -101.4C60.6 -98.6 55.8 -98.4 53.4 -100.6Z', fenda([[60, -89.6], [65, -89.6], [69, -90.4]], .9)],
        brancos: [{ d: elipse(58.6, -101.4, 1.7, 1.8) }], linhas: [{ d: 'M52.4 -104.6C56 -107 60.6 -107 63.8 -104.6', w: 1.2 }] },
      { id: 'orelha', pai: 'cabeca', pivo: [44, -105], junta: false, formas: [{ d: spline(orelha), cor: C.pelo }, { d: spline([[41, -108], [35, -115], [28, -121], [36, -119], [43, -112]]), cor: C.claro, contorno: 0 }] },
      ...pata('tp', [-28, -48], canT, [-38.4, -26.6], peT, -33.4, 0, 0), ...pata('dp', [21, -47], canD, [21.2, -22.6], peD, 24.6, 0, 0),
    ];
    return local({
      nome: 'filhote', H: 125, partes,
      cfg: { perna: 47, rabo: 10, fase0: op.fase0 || 0, bob: 1.4 },
      varetas: [{ parte: 'pescoco', ponto: [28, -72], mestra: true }, { parte: 'corpo', ponto: [-28, -64] }],
      pose: { respiro: 1, bambo: 0 },
      auto(b, t) {
        const P = b.pose, k = P.bambo;
        vivo(b, t);
        ad(b, 'orelha', 12 * Math.max(0, Math.sin(TAU * .31 * t)) ** 10); ad(b, 'rabo', 18 * Math.max(0, Math.sin(TAU * 1.7 * t)) ** 4);
        if (k) { // joelhos que dobram sozinhos, pernas que abrem, corpo que balança
          const n = (f, ph) => Math.sin(TAU * f * t + ph) + .5 * Math.sin(TAU * f * 2.3 * t + ph * 1.7);
          for (const [id, ph] of [['dp', 0], ['dl', 1.3], ['tp', 2.1], ['tl', 3.4]]) {
            ad(b, id, 6 * k * n(1.1, ph)); ad(b, id + '2', (id[0] === 'd' ? 1 : -1) * 12 * k * Math.max(0, n(1.6, ph + .5)));
          }
          b.extra.dy += 2.4 * k * Math.max(0, n(1.6, .5)); ad(b, 'corpo', 2.4 * k * n(.7, 1)); ad(b, 'pescoco', 4 * k * n(.9, 2));
        }
      },
    }, 1);
  }

  // ---------- araras (guia §7.9): bando que voa (voo 0..1, 3 Hz), pousada (pouso 0..1), a que cai (queda 0..1) ----------
  // Origem no meio do corpo (não há chão). A cena move x, y e rot; o bater de asas é função do tempo.
  const ARARA = { vermelho: '#CC3E1E', amarelo: '#E8B024', azul: '#5C7EC0', face: '#F2E8D6', bico: '#E6D8B8', bicoBaixo: '#2A2420', pe: '#5A4A40' };
  function defArara(op) {
    op = op || {};
    const C = ARARA, r = S.rng(op.semente || 1);
    const corpo = [[14, -11], [22, -15], [31, -14], [36, -10], [34, -3], [26, 4], [14, 8], [-2, 10], [-18, 8], [-30, 3], [-36, -3], [-30, -8], [-14, -12], [2, -13]];
    const bico = [[33, -12], [39, -12], [44.6, -7], [46, 1], [43.6, 7.4, 1], [42.6, 2], [39.6, -1], [35, -1.6]];
    const bicoBaixo = [[34.6, -1], [39.6, -.4], [41.6, 3], [39, 6.6], [34.6, 5.6], [31.6, 2.6]];
    // asa de cima (braço): penas secundárias recortadas na borda de trás; mão: 5 primárias separadas por fendas
    const asa = [[4, -8], [7, -22], [6, -38], [1, -52], [-6, -60], [-14, -61], [-20, -55], [-22.6, -48, 1], [-25, -44], [-24.6, -36, 1], [-27, -31], [-26, -23, 1], [-28, -17], [-24, -9]];
    const mao = [[-1, -54], [-2, -70], [-6, -88], [-12, -104], [-18, -116], [-21.6, -121, 1], [-23, -112], [-25.6, -114, 1], [-26.4, -104], [-29.4, -105.6, 1], [-29.6, -96],
      [-32.4, -96.4, 1], [-31.6, -86], [-33.6, -85, 1], [-30.6, -74], [-24, -62], [-16, -56]];
    const cauda = [[-30, -6], [-48, -4], [-72, -2], [-96, 1], [-118, 5], [-124, 7.4, 1], [-116, 9], [-92, 9], [-70, 8], [-48, 6], [-30, 3]];
    const pes = spline([[-4, 8], [-2, 14], [3, 17], [7, 18.6, 1], [3, 19.6], [-1, 18], [-5, 19.6, 1], [-7, 17], [-8, 11]]);
    const asaPartes = (id, dx, atras) => [
      { id, pai: 'corpo', pivo: [-2 + dx, -8], junta: false, atras, formas: [{ d: mover(spline(asa), dx, 0), cor: C.vermelho },
        { d: mover(spline([[5.4, -28], [3, -44], [-4, -55], [-14, -58], [-20, -52], [-21, -40], [-13, -42], [-6, -40], [0, -34]]), dx, 0), cor: C.amarelo, contorno: 0 },
        { d: mover(spline([[-14, -58], [-20, -55], [-22.6, -48, 1], [-25, -44], [-24.6, -36, 1], [-27, -31], [-26, -23, 1], [-28, -17], [-24, -9], [-18, -20], [-16, -36], [-15, -50]]), dx, 0), cor: C.azul, contorno: 0 }],
        furos: atras ? [] : [fenda([[-20, -50], [-14, -46], [-9, -38]], 1), fenda([[-22, -38], [-15, -34], [-10, -27]], 1), fenda([[-22, -27], [-16, -22], [-12, -16]], 1),
          ...pintas([[2, -30], [-2, -44], [-10, -52], [-16, -48], [-10, -40], [-2, -34]], { passo: 5.4, r: [.7, 1.1], semente: 3 })] },
      { id: id + '2', pai: id, pivo: [-8 + dx, -56], junta: false, atras, formas: [{ d: mover(spline(mao), dx, 0), cor: C.azul }],
        furos: atras ? [] : [fenda([[-10, -70], [-16, -88], [-20, -104]], 1.1, 8), fenda([[-14, -70], [-20, -86], [-24.6, -100]], 1.1, 8), fenda([[-18, -70], [-24, -82], [-28.4, -92]], 1.1, 8)] }];
    const partes = [
      ...asaPartes('asaL', 3, 1),
      { id: 'cauda', pai: 'corpo', pivo: [-30, -2], junta: false, formas: [{ d: spline(cauda), cor: C.vermelho },
        { d: spline([[-96, 1], [-118, 5], [-124, 7.4, 1], [-116, 9], [-96, 8.6]]), cor: C.azul, contorno: 0 }],
        furos: [fenda([[-36, 0], [-70, 2.6], [-108, 6]], 1, 12), fenda([[-50, -2.4], [-72, -.6], [-90, 1.6]], .9, 8)] },
      { id: 'pes', pai: 'corpo', pivo: [-5, 9], junta: false, formas: [{ d: pes, cor: C.pe }] },
      // pousada (corpo em pé, -58°): pernas curtas saindo do fim do ventre, retas para baixo, e dedos que abraçam o
      // galho (um para a frente, um para trás). Em coordenadas de voo: baixo no mundo = (-.85, .53); frente = (.53, .85)
      { id: 'garras', pai: 'corpo', pivo: [-24, 6], junta: false, formas: [{ d: fenda([[-23, 5], [-28, 8.2], [-33, 11.4]], 3.6, 6), cor: C.pe },
        { d: fenda([[-33, 11.4], [-30.6, 15], [-28.4, 17.6], [-28.6, 19.4]], 2.4, 6), cor: C.pe }, { d: fenda([[-33, 11.4], [-35.4, 7.6], [-37.6, 5.8], [-39.4, 6.6]], 2.2, 6), cor: C.pe }] },
      { id: 'corpo', pivo: [0, 0], formas: [{ d: spline(corpo), cor: C.vermelho }, { d: spline(bico), cor: C.bico }, { d: spline(bicoBaixo), cor: C.bicoBaixo },
        { d: spline([[23, -9], [30, -10.6], [34, -7], [33, -1.6], [28, 1], [22, -2]]), cor: C.face, contorno: 0 }],
        furos: [elipse(27, -6.4, 1.6, 1.5), ...hachura([[14, -8], [-4, -9], [-24, -6], [-30, 0], [-14, 6], [8, 5]], { passo: [4.6, 3.6], comp: 3.4, larg: .8, ang: 175, curva: .4, semente: 7 })],
        brancos: [{ d: elipse(27, -6.4, .7, .7) }],
        linhas: [{ d: 'M24 -3.6L29 -3M24.6 -1L29.6 -.4', w: .8, op: .55 }, { d: 'M38.6 -10C42 -7 43.4 -2 42.6 3', w: .9, op: .5 }] },
      ...asaPartes('asaP', 0, 0),
    ];
    const fase = op.fase == null ? r() : op.fase, freq = 3 * (.92 + r() * .16);
    return local({
      nome: 'arara', H: 60, partes, cfg: { fase0: fase }, varetaOp: .45,
      varetas: [{ parte: 'corpo', ponto: [-4, 4], mestra: true }],
      pose: { voo: 1, pouso: 0, queda: 0, o: { pes: 0, garras: 0 } },
      auto(b, t) {
        const P = b.pose, v = Math.max(0, P.voo * (1 - P.pouso) * (1 - P.queda)), po = P.pouso, q = P.queda;
        voo(b, freq * t + fase, { pernas: v });
        ad(b, 'asaP', (1 - v) * -58 * (1 - po - q)); ad(b, 'asaL', (1 - v) * -50 * (1 - po - q)); // planando
        ad(b, 'cauda', 3 * Math.sin(TAU * .5 * t));
        if (po) { ad(b, 'corpo', -58 * po); ad(b, 'asaP', -92 * po); ad(b, 'asaP2', -6 * po); ad(b, 'asaL', -88 * po); ad(b, 'asaL2', -6 * po); ad(b, 'cauda', 22 * po); b.extra.o.garras = po; }
        if (q) { // asas moles, viradas, tremendo
          const tr = Math.sin(TAU * 7 * t), tr2 = Math.sin(TAU * 5.3 * t + 1);
          ad(b, 'asaP', q * (-120 + 18 * tr)); ad(b, 'asaP2', q * (50 + 20 * tr2)); ad(b, 'asaL', q * (-20 + 14 * tr2)); ad(b, 'asaL2', q * (-60 + 16 * tr)); ad(b, 'cauda', q * 20 * tr2);
        }
      },
    }, 1);
  }
  // bater de asas por fase (uma volta = uma batida). Asa de cima de quase em pé a para trás e para baixo; a mão
  // atrasa e dobra na subida. op.pernas = peso (nome do campo igual ao dos outros ciclos).
  function voo(b, fase, op) {
    const v = op && op.pernas != null ? op.pernas : 1;
    if (v <= 0) return;
    const f = TAU * fase, sn = Math.sin(f), su = Math.sign(sn) * Math.abs(sn) ** .7;
    ad(b, 'asaP', v * (-62 + 62 * su)); ad(b, 'asaP2', v * (-18 * Math.sin(f - .9) - 8));
    ad(b, 'asaL', v * (-54 + 52 * Math.sin(f - .25))); ad(b, 'asaL2', v * (-16 * Math.sin(f - 1.1) - 6));
    b.extra.dy += 3 * v * Math.sin(f + 1.4); ad(b, 'cauda', 4 * v * Math.sin(f + 2));
  }
  // bando: n araras com escala, fase e frequência próprias; b.dx/b.dy = deslocamento na formação (em arco)
  function bando(n, op) {
    op = op || {};
    const r = S.rng(op.semente || 5), L = [];
    for (let i = 0; i < (n || 6); i++) {
      const b = criar(defArara({ semente: (op.semente || 5) * 31 + i }), Object.assign({}, op, { escala: (op.escala || 1) * (.8 + r() * .35) }));
      b.dx = -i * 70 - r() * 40; b.dy = Math.sin(i * 1.3) * 40 + (r() - .5) * 30; b.atraso = i * (.08 + r() * .1);
      L.push(b);
    }
    return L;
  }

  // ---------- bugio (guia §7.10): sentado no galho, rabo enrolado; ronco 0..1 (abre a boca e incha a barba) ----------
  // Origem = topo do galho, sob o assento. op.galho = false tira o galho (quando o cenário já tem um).
  const BUGIO = { pelo: '#AE4A26', escuro: '#6E2A14', barba: '#C2602E', face: '#4A2416', galho: '#3E3028' };
  function defBugio(op) {
    op = op || {};
    const C = BUGIO, pl = S.bonecos.pelo;
    const tufos = (P, quer, sem, tam) => pl(spline(P), quer, { semente: sem, tam: tam || [2.6, 4.6], passo: [2.6, 4], cai: .55 });
    const corpo = [[-20, -2], [-27, -18], [-28, -38], [-22, -56], [-8, -70], [8, -73], [18, -64], [24, -48], [26, -30], [22, -12], [8, -2]];
    const cabeca = [[0, -78], [4, -88], [12, -93], [21, -92], [27, -86], [31, -80], [36, -76], [37.6, -72], [34, -69], [26, -70], [18, -70], [10, -68], [2, -70]];
    const mand = [[16, -71], [26, -70.4], [34, -69.6], [35, -64], [32, -56], [24, -50], [14, -52], [8, -60], [10, -68]];
    const braco = [[2, -66], [10, -66], [18, -54], [24, -40], [26, -32], [20, -29], [14, -38], [6, -52], [0, -60]];
    const antebraco = [[19, -34], [26, -34], [32, -22], [36, -10], [38, -2], [40, 1], [37, 3.6], [32, 2], [30, -6], [25, -18], [19, -28]];
    const perna = [[-4, -14], [8, -20], [22, -22], [30, -16], [30, -8], [27, 0], [30, 3.4], [24, 4], [20, 0], [18, -8], [6, -6], [-6, -4]];
    const rabo = [[-24, -10], [-31, -4], [-36, 6], [-38, 18], [-32, 19], [-30, 8], [-26, 0], [-20, -4]];
    const rabo2 = [[-38, 14], [-38, 28], [-34, 40], [-26, 48], [-22, 43], [-28, 36], [-32, 26], [-32, 14]];
    const rabo3 = [[-26, 48], [-14, 50], [-2, 46], [6, 38], [2, 34], [-6, 40], [-16, 43], [-24, 43]];
    const rabo4 = [[6, 38], [10, 28], [8, 16], [2, 10], [-4, 12], [-2, 16], [3, 20], [4, 28], [0, 35]];
    const galho = spline([[-80, 0], [-40, -1], [0, 0], [50, 1.4], [92, 4], [92, 19], [50, 17.6], [0, 16], [-40, 15.6], [-80, 16]]);
    const partes = [
      ...(op.galho === false ? [] : [{ id: 'rabo4', pai: 'rabo3', opaca: true, pivo: [6, 38], junta: false, formas: [{ d: spline(rabo4), cor: C.pelo }] }]),
      { id: 'bracoL', pai: 'corpo', pivo: [-2, -64], junta: false, atras: 1, formas: [{ d: mover(spline(braco), -6, 0), cor: C.pelo }, { d: mover(spline(antebraco), -8, 0), cor: C.pelo }] },
      ...(op.galho === false ? [] : [{ id: 'galho', pivo: [0, 8], junta: false, formas: [{ d: galho, cor: C.galho }],
        furos: [fenda([[-70, 6], [-50, 5], [-30, 6.4]], 1.4), fenda([[20, 8], [50, 9.6], [80, 11]], 1.4), fenda([[-30, 11], [0, 11.4]], 1.2), fenda([[56, 14], [84, 15.6]], 1.2)] }]),
      { id: 'rabo', pai: 'corpo', pivo: [-22, -6], junta: false, formas: [{ d: spline(rabo), cor: C.pelo }] },
      { id: 'rabo2', pai: 'rabo', opaca: true, pivo: [-35, 15], junta: false, formas: [{ d: spline(rabo2), cor: C.pelo }] },
      { id: 'rabo3', pai: 'rabo2', opaca: true, pivo: [-25, 46], junta: false, formas: [{ d: spline(rabo3), cor: C.pelo }] },
      { id: 'corpo', pivo: [0, -30], formas: [{ d: tufos(corpo, (nx, ny) => nx < -.3 || ny < -.6, 51, [3, 5.6]), cor: C.pelo }],
        furos: hachura([[-22, -10], [-24, -36], [-16, -58], [0, -66], [14, -60], [20, -40], [18, -16], [4, -6]], { passo: [5, 4.6], comp: 4.8, larg: 1, ang: (x, y) => 100 + x * .8, curva: .3, semente: 53 }) },
      { id: 'perna', pai: 'corpo', pivo: [0, -10], junta: false, formas: [{ d: tufos(perna, (nx, ny) => ny < -.5, 55, [2, 3.6]), cor: C.pelo }, rebite(0, -10)],
        furos: hachura([[0, -12], [12, -17], [24, -18], [24, -10], [10, -8]], { passo: [4.6, 4], comp: 4, larg: .9, ang: 10, semente: 57 }) },
      { id: 'mandibula', pai: 'cabeca', opaca: true, pivo: [14, -70], junta: false, formas: [{ d: tufos(mand, (nx, ny) => ny > .2 || nx < -.4, 59, [2.6, 5]), cor: C.barba }],
        furos: [fenda([[20, -66], [21, -58], [20, -52]], 1.3, 6), fenda([[25, -66], [26, -58], [25, -53]], 1.3, 6), fenda([[30, -66], [30.4, -60], [29.6, -56]], 1.2, 6)] },
      { id: 'cabeca', pai: 'corpo', opaca: true, pivo: [8, -70], junta: false, formas: [{ d: tufos(cabeca, (nx, ny) => ny < -.5 || nx < -.6, 61, [2, 3.6]), cor: C.pelo },
        { d: spline([[22, -86], [30, -80], [36, -76], [37.6, -72], [33, -69.6], [24, -71], [20, -78]]), cor: C.face, contorno: 0 }],
        furos: ['M21.6 -81.6C23 -83.4 26 -83.6 27.6 -81.8C26.2 -80.2 23.2 -80 21.6 -81.6Z', elipse(35.4, -73.6, .8, .9)],
        brancos: [{ d: elipse(24.8, -81.8, 1, 1.1) }], linhas: [{ d: 'M20 -85.4C23 -87.4 27 -87.4 30 -85.4', w: 1.6, op: .9 }] },
      { id: 'braco', pai: 'corpo', pivo: [6, -62], junta: false, formas: [{ d: tufos(braco, (nx, ny) => nx < -.4, 63, [2, 3.6]), cor: C.pelo }, rebite(6, -62)] },
      { id: 'antebraco', pai: 'braco', pivo: [22, -32], junta: false, formas: [{ d: spline(antebraco), cor: C.pelo }, { d: spline([[34, -6], [38, -2], [40, 1], [37, 3.6], [32, 2], [31, -3]]), cor: C.face, contorno: 0 }, rebite(22, -32)] },
    ];
    return local({
      nome: 'bugio', H: 150, partes,
      varetas: [{ parte: 'cabeca', ponto: [14, -80], mestra: true }, { parte: 'corpo', ponto: [-14, -30] }],
      pose: { respiro: 1, ronco: 0 },
      auto(b, t) {
        const P = b.pose, k = P.ronco, s = Math.sin(TAU * .3 * t), r = P.respiro == null ? 1 : P.respiro;
        ad(b, 'corpo', 1.2 * r * s); ad(b, 'cabeca', -.8 * r * s);
        ad(b, 'rabo2', 2 * Math.sin(TAU * .2 * t)); ad(b, 'rabo3', 1.6 * Math.sin(TAU * .2 * t - .6));
        if (k) { // ronco: pulsos de boca aberta, cabeça para cima, barba que incha, corpo que bombeia
          const pu = .55 + .45 * Math.sin(TAU * 1.2 * t);
          ad(b, 'mandibula', 30 * k * pu); ad(b, 'cabeca', -16 * k - 4 * k * pu); ad(b, 'corpo', -3 * k * pu);
          b.extra.s.mandibula = 1 + .14 * k * pu;
        }
        ad(b, 'mandibula', 28 * (P.boca || 0));
      },
    }, 1);
  }

  // ---------- tatu (guia §7.11): trote ligeiro, carapaça em cintas; toca 0..1 = mergulha no buraco ----------
  // Na toca o boneco é recortado no chão (y da pose): o focinho entra primeiro e o corpo some na terra.
  const TATU = { casco: '#B0683A', cinta: '#94522C', pele: '#C88A5C', unha: '#3A2A20' }; // couro argila: lê no papel claro
  function defTatu(op) {
    op = op || {};
    const C = TATU;
    const meio = [[-14, -51.6], [2, -52.6], [18, -50.6], [20, -13], [2, -12.6], [-14, -13]];
    const frente = [[14, -50.4], [28, -46.6], [40, -38], [46, -26], [47, -14], [14, -13]];
    const tras = [[-10, -52], [-28, -49], [-42, -40], [-50, -26], [-52, -12], [-10, -13]];
    const cabeca = [[38, -32], [46, -36], [48, -46], [51, -49, 1], [54, -42], [60, -31], [72, -21], [82, -12], [84, -8.6], [80, -6.6], [68, -8], [54, -10], [42, -14], [36, -22]];
    const rabo = [[-48, -26], [-62, -20], [-80, -11], [-98, -4], [-101, -2.4, 1], [-96, -1], [-78, -3], [-60, -8], [-48, -14]];
    const pataD = [[26, -18], [33, -18], [34, -8], [37, -4], [42, -1.6], [44, .7, 1], [39, .2], [37.4, .9, 1], [34, .2], [32, .9, 1], [28, .6], [26, -6]];
    const pataT = [[-38, -18], [-30, -18], [-29, -8], [-25, -4], [-21, -1.6], [-19, .7, 1], [-24, .4], [-26, .9, 1], [-30, .6], [-35, .4], [-37, -6]];
    const cintas = [-11, -4.6, 2, 8.6, 15].map(x => fenda([[x, -48.6], [x + .6, -32], [x + .2, -15]], 1.6, 8));
    const pata = (id, P, pv, dx, atras) => ({ id, pai: id[0] === 'd' ? 'frente' : 'tras', pivo: [pv[0] + dx, pv[1]], junta: false, atras,
      formas: [{ d: mover(spline(P), dx, 0), cor: C.pele }], furos: atras ? [] : [fenda([[pv[0] + 6, -4.6], [pv[0] + 7, -1.6], [pv[0] + 7.4, .2]], .8, 4)] });
    const partes = [
      pata('tl', pataT, [-34, -16], -5, 1), pata('dl', pataD, [30, -16], 5, 1),
      { id: 'rabo', pai: 'tras', pivo: [-48, -20], junta: false, formas: [{ d: spline(rabo), cor: C.cinta }],
        furos: [-58, -66, -74, -82, -90].map((x, i) => fenda([[x + 1, -19 + i * 2.4 - 3], [x, -13 + i * 2], [x - .6, -9 + i * 1.6]], 1.1, 5)) },
      { id: 'cabeca', pai: 'frente', pivo: [40, -24], junta: false, formas: [{ d: spline(cabeca), cor: C.pele },
        { d: spline([[42, -33], [52, -32], [62, -26], [66, -21], [56, -22], [46, -25]]), cor: C.casco }],
        furos: ['M54.4 -24.6C55.6 -26.2 58.4 -26.4 59.8 -24.8C58.4 -23.4 55.8 -23.2 54.4 -24.6Z', fenda([[49.6, -46], [51, -41], [52, -37]], 1.1, 4)],
        linhas: [{ d: 'M66 -10C72 -10.6 77 -10 81 -9', op: .5, w: .9 }] },
      { id: 'tras', pai: 'corpo', opaca: true, pivo: [-12, -32], junta: false, formas: [{ d: spline(tras), cor: C.casco, vazado: { motivo: 'g-jabuti', margem: 3 } }],
        linhas: [{ d: 'M-49 -18C-38 -16 -24 -15.6 -11 -15.6', op: .6, w: 1 }] },
      { id: 'corpo', pivo: [2, -32], formas: [{ d: spline(meio), cor: C.cinta }], furos: cintas, linhas: [{ d: 'M-13 -16C-4 -15 8 -15 19 -15.6', op: .6, w: 1 }] },
      { id: 'frente', pai: 'corpo', opaca: true, pivo: [16, -32], junta: false, formas: [{ d: spline(frente), cor: C.casco, vazado: { motivo: 'g-jabuti', margem: 3 } }],
        linhas: [{ d: 'M15 -15.6C26 -15.6 36 -16 46 -17', op: .6, w: 1 }] },
      pata('tp', pataT, [-34, -16], 0, 0), pata('dp', pataD, [30, -16], 0, 0),
    ];
    return local({
      nome: 'tatu', H: 55, partes,
      cfg: { perna: 17, rabo: 5, fase0: op.fase0 || 0, bob: .4 },
      varetas: [{ parte: 'corpo', ponto: [0, -40], mestra: true }],
      pose: { respiro: .4, toca: 0 },
      recorte: true,
      auto(b, t) {
        const P = b.pose, k = P.toca;
        vivo(b, t);
        ad(b, 'cabeca', 3 * Math.sin(TAU * 1.9 * t) * Math.max(0, Math.sin(TAU * .4 * t))); // fuça o ar
        if (k) { ad(b, 'corpo', 28 * Math.min(1, k * 1.6)); b.extra.dy += 70 * k; ad(b, 'cabeca', 12 * k); ad(b, 'rabo', -18 * k); }
      },
    }, 1.1);
  }

  // ---------- urutau (guia §7.12): parado como galho num toco; abre os olhos âmbar (olhos 0..1) e canta (canto 0..1) ----------
  // Na tinta do cenário (op.cor, padrão próximo de L2). Origem = chão ao pé do toco; op.toco = false: origem nos pés.
  function defUrutau(op) {
    op = op || {};
    const cor = op.cor || '#3E3530', dy = op.toco === false ? 0 : -80;
    const corpo = [[-3, 30], [-8, 16], [-11, 0], [-14, -16], [-15.6, -36], [-13.6, -54], [-9, -66], [0, -72], [10, -68], [14.4, -56], [15, -38], [13, -18], [9, 0], [5, 16], [3, 30]];
    const cabeca = [[-9, -63], [-11.4, -76], [-10, -88], [-6, -98], [0, -106], [5, -112.6, 1], [8.4, -104], [12, -92], [14, -80], [12.4, -66], [2, -61]];
    const bico = [[7.6, -90], [12, -96], [11.4, -104], [7.4, -109.4], [6.4, -101], [6, -94]];
    const toco = spline([[-25, 2], [-20, -10], [-19, -40], [-18, -62], [-16, -78], [-10, -85, 1], [-5, -79], [0, -87, 1], [5, -81], [10, -89, 1], [14, -78], [18, -60], [19.4, -30], [21, -8], [29, 2]]);
    const m = d => mover(d, 0, dy);
    const partes = [
      ...(op.toco === false ? [] : [{ id: 'toco', pivo: [0, -40], junta: false, formas: [{ d: toco, cor }],
        furos: [...hachura([[-18, -4], [-16, -40], [-14, -72], [14, -74], [16, -40], [20, -4]], { passo: [5.6, 9], comp: 9, larg: 1.2, ang: 92, semente: 71 }),
          fenda([[-12, -76], [-2, -74.6], [12, -76]], 1.2)] }]),
      { id: 'corpo', pivo: [0, dy - 30], formas: [{ d: m(spline(corpo)), cor }],
        furos: hachura([[-6, dy + 24], [-10, dy - 10], [-11, dy - 50], [-6, dy - 64], [8, dy - 64], [11, dy - 40], [9, dy - 10], [4, dy + 24]], { passo: [4.6, 6.4], comp: 6.4, larg: .9, ang: 88, curva: .3, semente: 73 }) },
      { id: 'bico', pai: 'cabeca', opaca: true, pivo: [7, dy - 92], junta: false, formas: [{ d: m(spline(bico)), cor }] },
      { id: 'cabeca', pai: 'corpo', opaca: true, pivo: [2, dy - 66], junta: false, formas: [{ d: m(spline(cabeca)), cor }],
        furos: [m(fenda([[-3, -84.6], [1.6, -85.4], [6, -84.6]], .9, 5)), m(fenda([[-2.4, -81.6], [1.6, -82], [5.4, -81.4]], .7, 5)),
          ...hachura([[-8, dy - 66], [-9, dy - 78], [-6, dy - 94], [4, dy - 96], [10, dy - 78], [9, dy - 68]], { passo: [4, 5], comp: 4.4, larg: .8, ang: 82, semente: 75 })] },
      { id: 'olho', pai: 'cabeca', pivo: [1.6, dy - 84], junta: false, camada: 'brilho', formas: [{ d: m(elipse(1.6, -84, 5.2, 5)), cor: '#F2C14E', contorno: 0 },
        { d: m(elipse(2.4, -83.8, 2.3, 2.6)), cor: '#2A1A0E', contorno: 0 }, { d: m(elipse(.8, -85.4, .8, .8)), cor: '#FFF2C8', contorno: 0 }] },
    ];
    return local({
      nome: 'urutau', H: 150, partes,
      varetas: [{ parte: 'corpo', ponto: [0, dy - 30], mestra: true }],
      pose: { olhos: 0, canto: 0, o: { olho: 0 } },
      auto(b, t) { // imóvel como galho: nem respira; só o olho e o bico vivem
        const P = b.pose, o = P.olhos, c = P.canto;
        b.extra.o.olho = Math.min(1, o * 1.4); b.extra.s.olho = .25 + .75 * o;
        if (c) { ad(b, 'cabeca', 26 * c); ad(b, 'bico', 50 * c * Math.max(0, Math.sin(TAU * .9 * t)) ** .6); ad(b, 'corpo', 3 * c); }
        ad(b, 'bico', 44 * (P.boca || 0));
      },
    }, 1);
  }

  // ---------- Curupira montado num queixada (aurora_04; vulto borrado no meio da vara em rastros_14) ----------
  // As peças do cavaleiro são as do Curupira de bonecos.js, com os MESMOS ids (bracoFrente, cabeca, mandibula,
  // mechaN…) e o mesmo auto (cabelo, olhar aceso, boca): o que vale para o Curupira vale aqui. O queixada usa
  // focinho/queixo/dp/tp… Opções: pena (atrás da orelha), colar (cipó desmanchado), fumo (rolo na cintura;
  // fumoMao na mão de trás, oculto: troque o.fumo/o.fumoMao no instante em que a mão passa pela cintura).
  function defMontado(op) {
    op = op || {};
    const K = 1.4, porco = defQueixada({ semente: op.semente || 11, fase0: op.fase0, k: K }), cur = S.bonecos.defs.curupira();
    const kp = porco.partes.find(p => p.id === 'corpo').pivo[1] / -58; // escala real do queixada (com a variação da semente)
    const sela = [-4 * kp, -90 * kp], assento = [0, -63], dx = sela[0] - assento[0], dy = sela[1] - assento[1] + 5;
    const ids = new Set(cur.partes.map(p => p.id));
    const cav = cur.partes.map(p => Object.assign({}, p, { pivo: [p.pivo[0] + dx, p.pivo[1] + dy], pai: p.pai || 'corpo' }));
    const mach = cav.find(p => p.id === 'machado');
    if (mach) { // lâmina oval de placa de casco amarrada ao cabo: três escudos e a sutura clara (a do boneco a pé lê como leque)
      const hx = (cx, cy, R) => 'M' + [0, 1, 2, 3, 4, 5, 0].map(k => f2(cx + R * Math.cos(k * TAU / 6)) + ' ' + f2(cy + R * Math.sin(k * TAU / 6))).join('L');
      // cabeça em D presa de lado no cabo (dorso reto amarrado, gume convexo para a frente), o cabo passa por cima
      const lam = 'M1.6 -51C9 -54 19 -52.4 25.6 -45C29.6 -40 30.4 -32 27 -26C22.6 -19.4 12 -18 1.6 -22Z';
      const sut = hx(12.4, -42.6, 4.6) + hx(12.4, -30.6, 4.6) + hx(21.2, -36.6, 4) + 'M17 -42.6L21 -47.6M17 -30.6L21 -25.4M25.2 -36.6L28.6 -36.6M7.8 -42.6L2.6 -42.6M7.8 -30.6L2.6 -30.6M12.4 -47.2L12 -51.6M12.4 -26L12 -21';
      const cabo = 'M-2.6 17C-3.2 9 -1 1 -1.6 -8C-2.4 -18 -4.4 -28 -3.4 -40C-3 -48 -2.4 -54 -1 -60L3.6 -59.4C2.6 -53 2 -47 1.8 -40C1.2 -28 3.4 -18 3.6 -8C3.8 1 2.6 9 2.8 17C2.6 19.4 -2.4 19.4 -2.6 17Z';
      Object.assign(mach, { formas: [{ d: lam, cor: '#9C6A30' }, { d: cabo, cor: '#7A4524' }], furos: [],
        linhas: [{ d: 'M-3.6 -50L3.6 -47.6M-3.8 -45L3.4 -42.6M-3.6 -27L3.6 -24.6M-3.6 -22.6L3.6 -20.2', cor: '#D8B266', w: 1.6, op: 1 }, { d: sut, cor: '#F2DCA6', w: 1.1, op: .95 }] });
    }
    const por = id => porco.partes.find(p => p.id === id), de = id => cav.find(p => p.id === id);
    const props = [];
    const peca = (id, pai, pivo, formas, extra) => Object.assign({ id, pai, pivo: [pivo[0] + dx, pivo[1] + dy], junta: false,
      formas: formas.map(f => Object.assign({}, f, { d: mover(f.d, -pivo[0], -pivo[1]) })) }, extra);
    if (op.pena) props.push(peca('pena', 'cabeca', [-8, -158], [
      { d: spline([[-8, -158], [-11, -170], [-15.6, -186], [-17.6, -204], [-16.4, -219], [-13, -231, 1], [-9.6, -219], [-7.4, -207], [-5.2, -200, 1], [-6.4, -196], [-4, -184],
        [-3.4, -171], [-5, -160]]), cor: '#C2401F' },
      { d: spline([[-17, -214], [-16.4, -219], [-13, -231, 1], [-9.6, -219], [-9, -214], [-13, -212]]), cor: '#3E5E9E', contorno: 0 },
      { d: spline([[-16.6, -203], [-17, -212], [-9.2, -213], [-8.2, -204], [-12.4, -201]]), cor: '#E0A21C', contorno: 0 }],
      { ang0: -54, linhas: [{ d: 'M-8 -159C-9.6 -180 -11 -205 -12.8 -228', w: 1, op: .7 }], furos: [fenda([[-12.6, -178], [-14.2, -186], [-15.6, -194]], .8), fenda([[-6.4, -186], [-7.2, -194]], .8)] }));
    if (op.colar) {
      const fio = [[-6, -140], [-2, -128], [4, -118], [12, -112], [19, -116], [21, -126], [17, -138]], ponta = [[12, -112], [14, -100], [12.6, -88], [15, -80]];
      const folha = (x, y, a) => ({ d: spline([[x, y], [x - 4 * Math.cos(a) - 3, y + 6], [x - 1, y + 13, 1], [x + 4, y + 6]]), cor: '#8DBA62' });
      props.push(peca('colar', 'peito', [6, -134], [{ d: fenda(fio, 5.6, 16), cor: '#A89A48' }, { d: fenda(ponta, 4, 10), cor: '#A89A48' },
        folha(4.6, -118, .3), folha(12.6, -112, -.2), folha(15, -81, .1)]));
    }
    if (op.fumo) {
      const rolo = (x, y) => ({ d: spline([[x - 13, y - 5, 1], [x + 11, y - 5, 1], [x + 13.6, y - 2.6], [x + 13.6, y + 2.6], [x + 11, y + 5, 1], [x - 13, y + 5, 1], [x - 14.8, y]]), cor: '#6A3C1C' });
      const amarras = [{ d: 'M-7 -5L-6 5M4 -5L5 5', cor: '#D8B266', w: 1.8, op: 1 }, { d: 'M-12 -1.6C-9 -3 -6 2 -2 .4C1 -1 6 2.4 9 .8', w: .9, op: .55 }];
      props.push(peca('fumo', 'quadril', [-6, -76], [rolo(-6, -76)], { linhas: amarras }));
      props.push(peca('fumoMao', 'maoTras', [9, -50], [rolo(9, -50)], { linhas: amarras }));
    }
    const atras = ['pernaTras', 'peTras'];
    const partes = [...['tl', 'tl2', 'dl', 'dl2'].map(por), ...atras.map(de), ...['corpo', 'crina', 'queixo', 'focinho', 'orelha', 'tp', 'tp2', 'dp', 'dp2'].map(por),
      ...cav.filter(p => !atras.includes(p.id)), ...props];
    const pose = { respiro: 1, dentes: 0, grunhido: 0, erica: 0, furia: 0, boca: 0,
      a: Object.assign({}, cur.pose && cur.pose.a, { peito: 8, quadril: -8, cabeca: -4, pernaFrente: -34, peFrente: 26, pernaTras: -22, peTras: 18,
        bracoFrente: -132, antebracoFrente: -40, maoFrente: 150, bracoTras: -26, antebracoTras: -30, maoTras: -6 }),
      o: { fumoMao: 0 } };
    return {
      nome: 'curupiraMontado', H: 240, partes, gradientes: cur.gradientes, cfg: porco.cfg, marcha: porco.marcha,
      varetas: [{ parte: 'focinho', ponto: por('focinho').pivo.map((v, i) => v + [14, -6][i]), mestra: true }, { parte: 'peito', ponto: [2 + dx, -134 + dy], mestra: true },
        { parte: 'maoFrente', ponto: [2 + dx, -58 + dy] }],
      pose,
      auto(b, t) {
        autoPorco(b, t);
        cur.auto(b, t);
        ad(b, 'peito', -.6 * (b.extra.a.corpo || 0)); // o cavaleiro compensa o galope
      },
    };
  }

  // ---------- fábrica ----------
  function criar(def, op) {
    const b = S.bonecos.criar(def, op || {});
    if (def.varetaOp) b.camadas.bonecos.querySelector('.sb-varetas').style.opacity = def.varetaOp; // vareta comprida de ave no alto: mais tênue
    if (def.recorte) { // tudo abaixo do chão (y da pose) some: é por onde o tatu entra na toca
      const svg = b.camadas.bonecos, at = b.atualizar;
      let ult = '';
      b.atualizar = t => { at(t); const v = b.pose.toca > 0 ? `inset(0 0 ${(1080 - b.pose.y - 1).toFixed(1)}px 0)` : ''; if (v !== ult) { ult = v; svg.style.clipPath = v; } };
    }
    return b;
  }

  S.bichos = {
    cachorro: op => criar(defCachorro(op), op),
    queixada: op => criar(defQueixada(op), op),
    caititu: op => criar(defQueixada(Object.assign({ caititu: true }, op)), op),
    vara,
    arara: op => criar(defArara(op), op),
    bando,
    bugio: op => criar(defBugio(op), op),
    roncar: (tl, b, t, dur) => pulso(tl, b, t, 'ronco', { sobe: .3, desce: .5, segura: Math.max(0, (dur || 2) - .8) }),
    tatu: op => criar(defTatu(op), op),
    urutau: op => criar(defUrutau(op), op),
    veada: op => criar(defVeada(op), op),
    filhote: op => criar(defFilhote(op), op),
    onca: op => criar(defOnca(op), op),
    esturrar: (tl, b, t, dur) => pulso(tl, b, t, 'esturro', { sobe: .25, desce: .5, segura: Math.max(0, (dur || 1.4) - .75) }),
    curupiraMontado: op => criar(defMontado(op), op),
    dentes: (tl, b, t, dur) => pulso(tl, b, t, 'dentes', { sobe: .08, desce: .2, segura: Math.max(0, (dur || .6) - .28) }),
    latir: (tl, b, t, vezes) => pulso(tl, b, t, 'latido', { vezes: vezes || 1, intervalo: .3 }),
    passo, trote, galope, salto, voo, andadura, pulso,
    defs: { cachorro: defCachorro, queixada: defQueixada, curupiraMontado: defMontado, onca: defOnca, veada: defVeada, filhote: defFilhote, arara: defArara, bugio: defBugio, tatu: defTatu, urutau: defUrutau },
  };
})();
