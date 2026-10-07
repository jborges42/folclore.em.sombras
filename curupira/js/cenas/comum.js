/* comum.js — Sombras.kit: kit de coreografia das cenas (guia §6.5, §10, §11; convenções no BRIEFING).
 *
 * REGRAS (o kit garante; quem usa só o kit não precisa pensar em seek)
 *   - Tempos sempre RELATIVOS À CENA, vindos de ctx.t(beat) / ctx.tf(beat) / ctx.sfx(som)[i].
 *   - Todo tween do kit é fromTo(immediateRender:false) que parte do último valor que o kit deu àquela
 *     propriedade (ou do valor que o objeto tinha ao ser criado). Por objeto e propriedade, agende em ORDEM
 *     CRONOLÓGICA e sem sobrepor; se não, o kit lança erro e a cena é descartada (mensagem no console).
 *     Salto instantâneo = dur 0. Numa cena com posse, os gestos do elenco (Sombras.elenco) passam pelo mesmo
 *     registro: kit e elenco se alternam no mesmo boneco sem saltos. Não use tl.to/tl.fromTo direto em
 *     propriedades que o kit ou o elenco animam.
 *   - Passos, respiração, tremor, visibilidade e transições são funções puras do tempo.
 *   Resultado: seek para trás e para frente reproduz o mesmo quadro.
 *
 * POSSE (primeira linha de toda cena)
 *   const K = Sombras.kit, c = K.posse(tl, ctx, {entrada, saida, luz, luzEm, luzDur})
 *     entrada  'lamparina' (padrão: reacende em 1,2 s) | 'contrarregra' (o cenário sobe em camadas, do fundo
 *              para a frente, em 2 s) | 'corte' (luz troca na hora; use depois de uma saída 'folha')
 *     saida    'lamparina' (padrão: apaga a lamparina no intervalo antes da próxima cena) | 'contrarregra' (as
 *              camadas sobem e saem, da frente para o fundo) | 'folha' (folha gigante de L0 cobre a troca) | 'corte'
 *     luz      estado da cena (padrão ctx.cena.luz; null = a cena cuida da luz). Parte do estado em que a cena
 *              anterior deixou a luz; com cartela, reacende quando a cartela sai (ou em luzEm, durante luzDur s).
 *   Tudo o que a cena possui só aparece de 0 até o início da próxima cena e só é atualizado nesse intervalo.
 *   A câmera volta a 0 no início de cada cena.
 *   c.palco                  o palco (Sombras.palco.atual)
 *   c.boneco(b, {camada, respirar})  põe o boneco na cena (camada 'bonecos'; 'L3', 'L4'… para o fundo).
 *                            Respira sozinho (amp 1; false desliga). Devolve b.
 *   c.cenario(desc)          Sombras.cenario.montar(palco, desc) dentro da cena (desc = {camadas: {L5: itens, …}})
 *   c.possuir(x, camada)     outro ator ({camadas, atualizar}) ou elemento DOM (na camada dada; padrão 'L2')
 *   c.rastros                ator de pegadas da cena: c.rastros.por(x, y, {dir, invertida, lado, escala, t0 (abs), dura})
 *   c.abs(t)                 tempo absoluto do espetáculo
 *
 * FERRAMENTAS (tl = timeline da cena; t, t0, t1 em s relativos à cena; palco = c.palco)
 *   K.anima(tl, alvo, {prop: n}, t, dur, ease)   tween genérico seguro: K.anima(tl, b.pose.a, {bracoFrente: -60}, t, .3, 'back.out(2)')
 *   K.valor(alvo, prop)                         valor em que o kit deixou alvo[prop] (para gestos relativos)
 *   K.luz(tl, palco, estado, t, dur=3, ease)     estado = nome em Sombras.palco.LUZES ou parcial: {hotRX: 14, hotRY: 20,
 *                                               vinheta: .9} (roda de luz), {lamparina: 1.3} (a chama sobe), 'escuro'
 *   K.camera(tl, palco, x, t, dur, ease)         paralaxe. "Andar no mesmo lugar enquanto o cenário desliza" =
 *                                               K.caminhar e K.camera com o mesmo deslocamento (as pegadas ficam no chão)
 *   K.particulas(tl, palco, tipo, t0, t1, {nivel=1, entra=1, sai=1})   'chuva' | 'vagalumes' | 'brasas' | 'poeira';
 *                                               em t1 volta ao nível de antes
 *   K.relampago(tl, palco, t)                    clarão §11.3 (som 'relampago_estalo' no mesmo t)
 *   K.abalo(tl, palco, t, dur=.4, px=6)          o palco inteiro treme e assenta
 *   K.folha(tl, t, {dur=.9, de, segura, opac, escala}) folha gigante de L0 cruza o papel; devolve t + dur/2 (a folha cobre o
 *                                               centro: troque ali o que não deve ser visto trocando)
 *   K.caminhar(tl, b, {de, ate, t0, t1, correr, pegadas, passo, bob, pernas, bracos, ciclo})
 *       x linear de "de" (padrão: onde o kit deixou o boneco) até "ate"; o ciclo de passos segue a distância
 *       percorrida (o pé não escorrega) e entra/sai suave; vira sozinho se estiver de costas para o destino.
 *       pegadas: padrão só no Curupira, INVERTIDAS (dedos para trás); true nos caçadores (normais);
 *       objeto {dura=6, opacidade=.55, escala, invertida} ajusta. ciclo(b, fase, op) troca a marcha (bichos).
 *       Boneco do elenco (E.ze, E.tiao…: tem b.pose.marcha) anda com Sombras.elenco.gestos.andar, no mesmo registro.
 *   K.entrar(tl, b, {lado='esquerda', ate, t0, t1, …})   entra de fora do papel andando (opções de K.caminhar)
 *   K.sair(tl, b, {lado, t0, t1, …})                     sai andando até fora do papel
 *   K.virar(tl, b, t, dur=.14)     scaleX 1 → −1 com z subindo a .25 no meio
 *   K.surgir(tl, b, t, dur=1.2)    vem grande e desfocado (z 1 → 0) e pousa na tela
 *   K.sumir(tl, b, t, dur=.5)      gira 360° de perfil, afasta-se da tela (z → 1) e some
 *   K.pular(tl, b, {ate, altura=60, t0, t1})     arco: x linear, sobe power2.out, desce power2.in, pernas abertas
 *   K.cair(tl, b, t, {para='tras'|'frente', dur=.5, desce=20})   gira 80° sobre os pés, com quique
 *   K.tremer(tl, b, t, dur=.4, amp=2)            ±amp px a 18 Hz, amortecendo
 *   K.CHAO                                       y dos pés dos bonecos; K.MARCHA: passo (fração de H), bob, pernas, braços
 *
 * EXEMPLO
 *   Sombras.cenas.registrar('rastros', (tl, ctx) => {
 *     const K = Sombras.kit, c = K.posse(tl, ctx, {saida: 'folha'}), p = c.palco;
 *     c.cenario(Sombras.cenario.mata({semente: 3}));
 *     const cur = c.boneco(Sombras.bonecos.curupira({x: -200, y: K.CHAO, escala: 1.5}));
 *     const tiao = c.boneco(Sombras.bonecos.tiao({x: -300, y: K.CHAO, escala: 1.15}));
 *     K.entrar(tl, cur, {ate: 1150, t0: ctx.t('rastros_02'), t1: ctx.tf('rastros_02')});    // pegadas invertidas
 *     K.entrar(tl, tiao, {ate: 700, t0: ctx.t('rastros_03'), t1: ctx.tf('rastros_03'), pegadas: true});
 *     K.luz(tl, p, 'noite', ctx.t('rastros_07'), 4);
 *     K.particulas(tl, p, 'vagalumes', ctx.t('rastros_07') + 2, ctx.tf('rastros_09'));
 *     K.relampago(tl, p, ctx.sfx('relampago_estalo')[0]);
 *   });
 */
(function () {
  'use strict';
  const S = window.Sombras = window.Sombras || {};
  const PI = Math.PI, TAU = 2 * PI;
  const CHAO = 802;                 // pés dos bonecos; o chão claro da clareira começa logo abaixo
  const reg = new WeakMap();        // alvo → {prop: {v, fim}}: último valor dado pelo kit (fim em tempo absoluto)
  const posses = new WeakMap();     // tl da cena → posse

  // ---------- núcleo: fromTo que parte de onde a propriedade estava ----------
  function valor(alvo, k) {
    const r = reg.get(alvo);
    return r && r[k] ? r[k].v : alvo[k] == null ? 0 : alvo[k];
  }
  function posseDe(tl) {
    const c = posses.get(tl);
    if (!c) throw new Error('kit: chame Sombras.kit.posse(tl, ctx) na primeira linha da cena');
    return c;
  }
  function anima(tl, alvo, para, t, dur, ease) {
    const c = posseDe(tl), a = c.inicio + t;
    if (!isFinite(t) || !(dur >= 0)) throw new Error(`kit, cena ${c.ctx.cena.id}: tempo inválido (t ${t}, dur ${dur})`);
    let r = reg.get(alvo);
    if (!r) reg.set(alvo, r = {});
    const de = {};
    for (const k in para) {
      if (r[k] && a < r[k].fim - 1e-4) throw new Error(`kit, cena ${c.ctx.cena.id}: "${k}" começa em ${t.toFixed(2)} s, ` +
        `antes de acabar o tween anterior (${(r[k].fim - c.inicio).toFixed(2)} s). Agende em ordem, sem sobrepor.`);
      de[k] = valor(alvo, k);
      // ao voltar para antes do tween o GSAP restaura o valor anterior; se a propriedade não existia, grava a
      // string "0" (e 0 + "0" vira texto nas somas de ângulo do bonecos.js): ela já nasce número
      if (alvo[k] == null) alvo[k] = de[k];
    }
    for (const k in para) r[k] = { v: para[k], fim: a + dur };
    return tl.fromTo(alvo, de, Object.assign({ duration: dur, ease: ease || 'none', immediateRender: false, lazy: false }, para), t);
  }

  // ---------- movimentos do contra-regra: trechos {a, b, de, para, ease, pico} em tempo absoluto, função pura de t ----------
  function mov(el, a, dur, de, para, ease, pico) {
    (el._segs = el._segs || []).push({ a, b: a + dur, de, para, ease: gsap.parseEase(ease || 'power2.inOut'), pico: pico == null ? 4 : pico });
    el._segs.sort((p, q) => p.a - q.a);
  }
  function mover(el, t, vis, dx) {
    if (el._vis !== vis) { el._vis = vis; el.style.display = vis ? '' : 'none'; }
    if (!vis || !el._segs) return;
    let x = el._segs[0].de[0], y = el._segs[0].de[1], bl = 0;
    for (const q of el._segs) {
      if (t < q.a) break;
      const u = Math.min(1, (t - q.a) / (q.b - q.a)), e = q.ease(u);
      x = q.de[0] + (q.para[0] - q.de[0]) * e; y = q.de[1] + (q.para[1] - q.de[1]) * e;
      bl = q.pico * Math.sin(PI * u); // a peça "levantada" da tela desfoca no meio do trajeto
    }
    if (dx) x += dx;
    const tr = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`, f = bl > .05 ? `blur(${bl.toFixed(2)}px)` : '';
    if (tr !== el._tr) { el._tr = tr; el.style.transform = tr; }
    if (f !== el._f) { el._f = f; el.style.filter = f; }
  }

  // ---------- posse da cena ----------
  const PROF = { L5: 4, L4: 3, L3: 2, L2: 1, rastros: 1, L1: 0 }; // camadas que o contra-regra troca (0 = frente)
  const RELUZ = { lamparina: 1.2, contrarregra: 2, corte: 0 };

  function posse(tl, ctx, op) {
    if (posses.has(tl)) return posses.get(tl);
    op = op || {};
    const palco = S.palco.atual, L = window.LINHA_DO_TEMPO || { cenas: [] }, i = L.cenas.indexOf(ctx.cena);
    const inicio = ctx.cena.inicio, prox = i >= 0 && L.cenas[i + 1], ultima = i >= 0 && !prox && L.creditos;
    const fim = prox ? prox.inicio : ultima ? L.creditos.inicio : inicio + ctx.dur + 1.5; // até a próxima cena começar
    const c = { palco, ctx, tl, inicio, fim, entrada: op.entrada || 'lamparina', saida: op.saida || 'lamparina', camadas: {}, atores: [], avulsos: [] };
    posses.set(tl, c);
    c.abs = t => inicio + t;
    const cart = ctx.cena.cartela;
    c.luzEm = op.luzEm != null ? op.luzEm : cart ? cart.fim - inicio - .6 : 0;

    c.camada = nome => {
      let w = c.camadas[nome];
      if (w) return w;
      if (!palco.camadas[nome]) throw new Error('kit: camada desconhecida: ' + nome);
      w = c.camadas[nome] = document.createElement('div');
      w.style.cssText = 'position:absolute;left:0;top:0;width:1920px;height:1080px;display:none';
      w._vis = false;
      palco.camadas[nome].appendChild(w);
      if (c.entrada === 'contrarregra' && nome in PROF) mov(w, c.abs(c.luzEm + (4 - PROF[nome]) * .2), .9, [0, 1000], [0, 0]);
      return w;
    };
    c.possuir = (x, camada) => {
      if (x.camadas) {
        for (const k in x.camadas) c.camada(camada || k).appendChild(x.camadas[k]);
        if (x.atualizar) c.atores.push(x);
      } else c.camada(camada || 'L2').appendChild(x);
      return x;
    };
    c.boneco = (b, o) => {
      o = o || {};
      c.possuir(b, o.camada);
      const amp = o.respirar == null ? 1 : o.respirar;
      if (amp && !('respiro' in b.pose)) b.motores.push((b, t) => S.bonecos.respirar(b, t, { amp }));
      return b;
    };
    c.cenario = desc => {
      const m = S.cenario.montar(palco, desc);
      for (const e of m.elementos) c.camada(e.parentNode.dataset.camada).appendChild(e);
      return m;
    };
    Object.defineProperty(c, 'rastros', { get() { return c._rastros || (c._rastros = c.possuir(S.bonecos.pegadas())); } });

    palco.adicionar({
      camadas: {},
      atualizar(t) {
        const dentro = t >= inicio && t < fim;
        for (const k in c.camadas) mover(c.camadas[k], t, dentro);
        for (const e of c.avulsos) mover(e, t, t >= e._a && t < e._b, e._cam ? palco.camera.x * S.palco.PARALAXE.L0 : 0);
        if (dentro) for (const a of c.atores) a.atualizar(t, palco);
      },
    });

    // entrada: câmera em 0 e a luz vai ao estado da cena, a partir de onde a cena anterior a deixou
    anima(tl, palco.camera, { x: 0 }, 0, 0);
    const estado = op.luz === undefined ? ctx.cena.luz : op.luz;
    if (estado) luz(tl, palco, estado, c.luzEm, op.luzDur != null ? op.luzDur : RELUZ[c.entrada]);

    // saída: agendada depois do construtor (registrar, abaixo), quando já se sabe a última luz da cena
    c.fechar = () => {
      const zl = fim - inicio;
      if (c.saida === 'lamparina') {
        const r = reg.get(palco.luz) || {}, livre = Math.max(r.brilho ? r.brilho.fim : 0, r.lamparina ? r.lamparina.fim : 0) - inicio;
        const t = Math.max(livre, Math.min(ctx.dur, zl - .8));
        const apaga = { brilho: Math.min(.08, valor(palco.luz, 'brilho')), lamparina: Math.min(.25, valor(palco.luz, 'lamparina')) };
        if (t < zl) luz(tl, palco, apaga, t, Math.min(.8, zl - t), 'power2.in'); // cena que já terminou no escuro fica no escuro
      } else if (c.saida === 'contrarregra') {
        const t = Math.min(ctx.dur, zl - 1.2);
        for (const k in c.camadas) if (k in PROF) mov(c.camadas[k], c.abs(t + PROF[k] * .15), .6, [0, 0], [0, -1000], 'power2.in');
      } else if (c.saida === 'folha') { // entra no fim da própria cena e fica sobre o papel até passar o corte (zl)
        const t0 = Math.min(ctx.dur, zl) - .45;
        folha(tl, t0, { dur: .9, segura: Math.max(0, zl + .3 - (t0 + .45)), opac: .92, escala: 1.3 });
      }
    };
    return c;
  }

  // ---------- palco: luz, câmera, partículas, relâmpago, abalo, folha ----------
  function luz(tl, palco, estado, t, dur, ease) {
    const alvo = typeof estado === 'string' ? S.palco.LUZES[estado] : estado;
    if (!alvo) throw new Error('kit: estado de luz desconhecido: ' + estado);
    return anima(tl, palco.luz, alvo, t, dur == null ? 3 : dur, ease || 'sine.inOut');
  }
  const camera = (tl, palco, x, t, dur, ease) => anima(tl, palco.camera, { x }, t, dur, ease || 'sine.inOut');
  function particulas(tl, palco, tipo, t0, t1, op) {
    op = op || {};
    const antes = valor(palco.particulas, tipo), e = op.entra == null ? 1 : op.entra, s = op.sai == null ? 1 : op.sai;
    anima(tl, palco.particulas, { [tipo]: op.nivel == null ? 1 : op.nivel }, t0, e, 'sine.inOut');
    anima(tl, palco.particulas, { [tipo]: antes }, t1 - s, s, 'sine.inOut');
  }
  function relampago(tl, palco, t) { palco.relampagos.push(posseDe(tl).abs(t)); }
  function abalo(tl, palco, t, dur, px) {
    dur = dur || .4;
    anima(tl, palco, { abalo: px || 6 }, t, .03);
    anima(tl, palco, { abalo: 0 }, t + .03, Math.max(0, dur - .03), 'power2.out');
  }
  let folhaD = null; // costela-de-adão gigante entre a luz e a tela: sombra larga, escura e desfocada (§10.2)
  function folha(tl, t, op) {
    op = op || {};
    // op.segura (s): a folha para quase no meio do papel (deriva 240 px) antes de sair; op.opac, op.escala
    const c = posseDe(tl), dur = op.dur || .9, s = op.de === 'esquerda' ? -1 : 1, seg = op.segura || 0, k = op.escala || 1;
    if (!folhaD) folhaD = S.cenario.pecas.costelas(S.rng(5), 760, 1420, -PI / 2 + .2, 1500, 1, 1)[0].d;
    // SVG inline pintado com a tinta da luz (a máscara CSS em data-URI não desenhava nada); _cam: L0 anda com a
    // paralaxe 2 da câmera, então a folha desfaz o deslocamento e cruza o papel onde quer que a câmera esteja
    const e = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [k, v] of [['width', 2400], ['height', 1080], ['viewBox', '-240 0 2400 1080']]) e.setAttribute(k, v);
    e.style.cssText = 'position:absolute;left:-240px;top:0;width:2400px;height:1080px;display:none;overflow:visible';
    e.innerHTML = `<g style="filter:blur(18px)"><path d="${folhaD}" fill="var(--sb-tinta,#24140A)" opacity="${op.opac || .8}"` +
      (k !== 1 ? ` transform="translate(960 540) scale(${k}) translate(-960 -540)"` : '') + '/></g>';
    c.palco.camadas.L0.appendChild(e);
    e._vis = false; e._a = c.abs(t); e._b = e._a + dur + seg; e._cam = 1;
    if (!seg) mov(e, e._a, dur, [s * 1750, 0], [-s * 1750, 0], 'power1.inOut', 0);
    else {
      mov(e, e._a, dur / 2, [s * 1750, 0], [s * 120, 0], 'power2.out', 0);
      mov(e, e._a + dur / 2, seg, [s * 120, 0], [-s * 120, 0], 'none', 0);
      mov(e, e._a + dur / 2 + seg, dur / 2, [-s * 120, 0], [-s * 1750, 0], 'power2.in', 0);
    }
    c.avulsos.push(e);
    return t + dur / 2;
  }

  // ---------- bonecos ----------
  const MARCHA = { // passo em fração de H·escala (ou px, se ≥ 3)
    padrao: { passo: .25, bob: 6, pernas: 16, bracos: 10 },
    curupira: { passo: .2, bob: 10, pernas: 18, bracos: 8 },  // saltita, passo curto e rápido (§7.1)
    tiao: { passo: .26, bob: 4, pernas: 14, bracos: 7 },      // anda pesado (§7.2)
    ze: { passo: .3, bob: 7, pernas: 20, bracos: 12 },        // rápido e desengonçado (§7.3)
    vo: { passo: .14, bob: 2, pernas: 9, bracos: 4 },         // passo miúdo (§7.4)
  };
  function caminhar(tl, b, op) {
    const c = posseDe(tl), t0 = op.t0, t1 = op.t1, ate = op.ate;
    const m = Object.assign({}, MARCHA.padrao, MARCHA[b.nome], b.def.marcha);
    if (op.correr) Object.assign(m, { passo: m.passo * 1.7, bob: 12, pernas: 28, bracos: 18, inclinacao: 8 }); // §10.1
    for (const k of ['passo', 'bob', 'pernas', 'bracos', 'inclinacao', 'ciclo']) if (op[k] != null) m[k] = op[k];
    const x0 = valor(b.pose, 'x'), de = op.de == null ? x0 : op.de, dist = Math.abs(ate - de), sentido = ate >= de ? 1 : -1;
    const passo = m.passo < 3 ? m.passo * b.def.H * b.pose.escala : m.passo;
    const pg = op.pegadas == null ? b.nome === 'curupira' : op.pegadas, o = pg === true || !pg ? {} : pg;
    const inv = o.invertida == null ? b.nome === 'curupira' : o.invertida;
    if (de !== x0) anima(tl, b.pose, { x: de }, t0, 0);
    if ((valor(b.pose, 'dir') >= 0 ? 1 : -1) !== sentido) virar(tl, b, t0);
    if ('marcha' in b.pose && S.elenco) { // boneco com o motor do elenco: a marcha dele, no mesmo registro do kit
      S.elenco.gestos.andar(tl, b, t0, { ate, dur: t1 - t0, modo: op.correr ? 'correr' : 'andar', rastro: pg ? c.rastros : null, invertida: inv, dura: o.dura });
      return;
    }
    anima(tl, b.pose, { x: ate }, t0, t1 - t0);
    const a = c.abs(t0), z = c.abs(t1), ciclo = m.ciclo || S.bonecos.andar;
    b.motores.push((b, t) => {
      if (t <= a || t >= z) return;
      const u = Math.min(1, (t - a) / .2, (z - t) / .2), e = u * u * (3 - 2 * u); // começa e termina com os pés juntos
      ciclo(b, Math.abs(b.pose.x - de) / (2 * passo), { pernas: m.pernas * e, bracos: m.bracos * e, bob: m.bob * e, inclinacao: (m.inclinacao || 0) * e });
    });
    if (!pg || !dist) return;
    const esc = o.escala || Math.sqrt(b.def.H / 190) * b.pose.escala, y = valor(b.pose, 'y');
    for (let k = 1, n = Math.floor(dist / passo); k <= n; k++) {
      const lado = k % 2 ? 1 : -1;
      c.rastros.por(de + sentido * k * passo, y + 4 + 3 * lado, { dir: sentido, invertida: inv, lado, escala: esc, achatar: .58,
        giro: lado * 4 + (S.hash(k * 7 + 3) - .5) * 3, t0: a + (z - a) * k * passo / dist, dura: o.dura || 6, opacidade: o.opacidade || .55 });
    }
  }
  function fora(c, b, lado) { // x fora do papel (com a câmera onde o kit a deixou)
    const P = S.palco.PAPEL, m = .75 * b.def.H * b.pose.escala, cx = valor(c.palco.camera, 'x');
    return lado === 'direita' ? cx + P.x + P.w + m : cx + P.x - m;
  }
  function entrar(tl, b, op) {
    const c = posseDe(tl), de = fora(c, b, op.lado), d = Math.abs(valor(b.pose, 'dir')) || 1;
    anima(tl, b.pose, { x: de, dir: op.lado === 'direita' ? -d : d }, op.t0, 0);
    caminhar(tl, b, Object.assign({}, op, { de }));
  }
  function sair(tl, b, op) { caminhar(tl, b, Object.assign({}, op, { ate: fora(posseDe(tl), b, op.lado) })); }
  function virar(tl, b, t, dur) {
    dur = dur || .14;
    const d = valor(b.pose, 'dir'), z = valor(b.pose, 'z');
    anima(tl, b.pose, { dir: -d }, t, dur, 'power2.inOut');
    anima(tl, b.pose, { z: z + .25 }, t, dur / 2, 'power2.out');
    anima(tl, b.pose, { z }, t + dur / 2, dur / 2, 'power2.in');
  }
  function surgir(tl, b, t, dur) {
    dur = dur || 1.2;
    anima(tl, b.pose, { z: 1, opacidade: 0 }, t, 0);
    anima(tl, b.pose, { z: 0 }, t, dur, 'expo.out');
    anima(tl, b.pose, { opacidade: 1 }, t, dur * .4, 'power1.out');
  }
  function sumir(tl, b, t, dur) {
    dur = dur || .5;
    const d = valor(b.pose, 'dir');
    anima(tl, b.pose, { dir: -d }, t, .2, 'sine.inOut'); // giro de 360° visto de perfil: dir = cos(ângulo)
    anima(tl, b.pose, { dir: d }, t + .2, .2, 'sine.inOut');
    anima(tl, b.pose, { z: 1, opacidade: 0 }, t, dur, 'expo.in');
  }
  function pular(tl, b, op) {
    const t0 = op.t0, t1 = op.t1, tm = (t0 + t1) / 2, h = op.altura || 60, dy = valor(b.pose, 'dy'), q = Math.min(.12, (t1 - t0) / 3);
    if (op.ate != null) anima(tl, b.pose, { x: op.ate }, t0, t1 - t0);
    anima(tl, b.pose, { dy: dy - h }, t0, tm - t0, 'power2.out');
    anima(tl, b.pose, { dy }, tm, t1 - tm, 'power2.in');
    const pf = valor(b.pose.a, 'pernaFrente'), pt = valor(b.pose.a, 'pernaTras');
    anima(tl, b.pose.a, { pernaFrente: pf - 25, pernaTras: pt + 25 }, t0, q, 'power2.out');
    anima(tl, b.pose.a, { pernaFrente: pf, pernaTras: pt }, t1 - q, q, 'power2.in');
  }
  function cair(tl, b, t, op) {
    op = op || {};
    const dur = op.dur || .5;
    anima(tl, b.pose, { rot: valor(b.pose, 'rot') + (op.para === 'frente' ? 80 : -80) }, t, dur, 'bounce.out');
    const desce = op.desce != null ? op.desce : 'apoio' in b.pose ? 0 : 20; // com o motor do elenco, o apoio já assenta no chão
    if (desce) anima(tl, b.pose, { dy: valor(b.pose, 'dy') + desce }, t, dur, 'bounce.out');
  }
  function tremer(tl, b, t, dur, amp) {
    const a = posseDe(tl).abs(t), z = a + (dur || .4), A = amp || 2;
    b.motores.push((b, T) => {
      if (T < a || T > z) return;
      const e = 1 - (T - a) / (z - a);
      b.extra.dy += A * e * Math.sin(TAU * 18 * T);
      b.extra.a.peito = (b.extra.a.peito || 0) + .6 * A * e * Math.sin(TAU * 18 * T + 1.9);
    });
  }

  // a saída de cada cena é agendada depois do construtor (o registro de cenas nasce no <head> do index.html)
  if (S.cenas && S.cenas.registrar) {
    const registrar = S.cenas.registrar;
    S.cenas.registrar = function (id, construtor) {
      return registrar.call(this, id, (tl, ctx) => { construtor(tl, ctx); const c = posses.get(tl); if (c) c.fechar(); });
    };
  }

  S.kit = { CHAO, MARCHA, posse, anima, valor, luz, camera, particulas, relampago, abalo, folha, caminhar, entrar, sair, virar, surgir, sumir, pular, cair, tremer };
})();
