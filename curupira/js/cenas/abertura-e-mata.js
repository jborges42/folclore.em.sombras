/* abertura-e-mata.js — coreografia das cenas "abertura" e "mata" (roteiro.json: visual, luz, beats).
 * Kit: js/cenas/comum.js (Sombras.kit). Cenários: Sombras.cenarios.abertura / .mata. Bichos: Sombras.bichos.
 * Tempos só por ctx.t / ctx.tf / ctx.sfx; todo tween é fromTo (kit) e as peças só existem dentro da cena.
 */
(function () {
  'use strict';
  const S = window.Sombras;

  /* ───────────────────────── ABERTURA ─────────────────────────
   * Escuro; o fósforo risca, a candeia pega e o papel acende do centro para as bordas. Vareta sozinha; capa do
   * folheto; carta de Anchieta e pena de escrever; a serra sobe com a trilha; oferendas no cume; as penas sobem
   * como brasas; na palavra "dono" a chama se inclina; depois do assobio a lamparina baixa (saída do kit). */
  S.cenas.registrar('abertura', (tl, ctx) => {
    const K = S.kit, c = K.posse(tl, ctx, { luz: null }), p = c.palco, LZ = S.palco.LUZES;
    const cen = c.possuir(S.cenarios.abertura(p)), P = cen.pecas, E = cen.estado;
    const t = ctx.t, tf = ctx.tf, sfx = n => ctx.sfx(n)[0];
    const [cx, cy] = cen.pontos.morro.cume;

    // ── 01 · fósforo, candeia, papel que acende do centro para as bordas ──
    const fo = sfx('fosforo'), ch = sfx('lamparina_chama');
    K.anima(tl, p.luz, { hotRX: 16, hotRY: 20, inclina: 0 }, 0, 0);
    const fos = fosforo(p);
    tl.fromTo(fos, { autoAlpha: 0, x: 46, y: 34, rotation: 8 }, { autoAlpha: 1, duration: .05, immediateRender: false }, fo);
    tl.fromTo(fos.firstChild, { scale: 2.4, opacity: 1 }, { scale: 1, opacity: .7, duration: .35, ease: 'power2.out', immediateRender: false, svgOrigin: '80 80' }, fo);
    tl.fromTo(fos, { x: 46, y: 34, rotation: 8 }, { x: 0, y: 0, rotation: 0, duration: ch - fo - .05, ease: 'power2.inOut', immediateRender: false }, fo + .05);
    tl.fromTo(fos, { x: 0, y: 0, rotation: 0 }, { x: 70, y: 60, rotation: 24, duration: .7, ease: 'power2.in', immediateRender: false }, ch + .2);
    tl.fromTo(fos, { autoAlpha: 1 }, { autoAlpha: 0, duration: .25, immediateRender: false }, ch + .6);
    K.anima(tl, p.luz, { brilho: .12 }, fo, .08);
    K.anima(tl, p.luz, { lamparina: 1 }, ch, .4, 'power2.out');
    K.luz(tl, p, { brilho: 1, poeira: 1, hotRX: LZ.lamparina.hotRX, hotRY: LZ.lamparina.hotRY }, ch + .1, 2.6, 'power1.inOut');

    // ── 02 · a chama sobe com a voz; a vareta sozinha cruza o papel e, no bloco, desce e some ──
    const t2 = t('abertura_02'), bloco = sfx('bloco_madeira'), V = P.vareta.estado;
    K.anima(tl, p.luz, { lamparina: 1.4 }, t2, .5, 'power2.out');
    K.anima(tl, p.luz, { lamparina: 1 }, t2 + 2.4, 1.6);
    K.anima(tl, V, { x: -60, y: 600, ang: 14 }, 0, 0);
    K.anima(tl, V, { o: .9 }, t2 + .6, .8);
    K.anima(tl, V, { x: 1760 }, t2 + .6, bloco - t2 - .7, 'sine.inOut');
    K.anima(tl, V, { y: 470, ang: -4 }, t2 + .6, (bloco - t2) / 2, 'sine.inOut');
    K.anima(tl, V, { y: 560, ang: 6 }, t2 + .6 + (bloco - t2) / 2, (bloco - t2) / 2 - .7, 'sine.inOut');
    K.anima(tl, V, { y: 1010, ang: 0 }, bloco, .55, 'power2.in');
    K.anima(tl, V, { o: 0 }, bloco + .25, .3);

    // ── 03 · a capa do folheto baixa, assenta no painel do meio, fica e desliza para baixo ──
    const capa = S.cartela('Folclore em Sombras', 'Curupira, o guardião da mata', 'lamparina', 'abertura');
    const fol = capa.querySelector('.folheto'), assenta = sfx('tambor_grave'), sai = tf('abertura_03') - .55;
    tl.fromTo(capa, { autoAlpha: 0 }, { autoAlpha: 1, duration: .5, immediateRender: false }, bloco + .05);
    tl.fromTo(fol, { y: -760, rotation: -4.5 }, { y: 0, rotation: -1.2, duration: assenta - bloco - .05, ease: 'power2.inOut', immediateRender: false }, bloco + .05);
    tl.fromTo(fol, { y: 0, rotation: -1.2 }, { y: 7, rotation: -1, duration: .07, yoyo: true, repeat: 1, ease: 'power1.out', immediateRender: false }, assenta);
    tl.fromTo(fol, { y: 0 }, { y: 860, duration: .8, ease: 'power2.in', immediateRender: false }, sai);
    tl.fromTo(capa, { autoAlpha: 1 }, { autoAlpha: 0, duration: .5, immediateRender: false }, sai + .35);

    // ── 04 · desce a carta enrolada e a pena de escrever; a serra sobe em L5 e L4 ──
    const t4 = t('abertura_04'), Lc = E.camadas;
    K.anima(tl, Lc.L5, { y: 620 }, 0, 0);
    K.anima(tl, Lc.L4, { y: 760 }, 0, 0);
    K.anima(tl, P.carta.estado, { y: 0 }, t4 + .3, 2.6, 'power2.out');
    K.anima(tl, P.penaEscrever.estado, { y: 0 }, t4 + 1.1, 2.4, 'power2.out');
    K.anima(tl, Lc.L5, { y: 0 }, t4 + 2.4, 3.6, 'sine.out');
    K.anima(tl, Lc.L4, { y: 0 }, t4 + 3, 3.8, 'sine.out');

    // ── 05 · a carta se abre; a pena "escreve"; em "corupira", a sombrinha cruza o fundo e some ──
    const t5 = t('abertura_05'), cor = tf('abertura_05') - 1.05, Pe = P.penaEscrever.estado, Sb = P.sombrinha.estado;
    K.anima(tl, P.carta.estado, { abrir: 1 }, t5 + .2, 1.8, 'power2.inOut');
    [[-5, .5], [3, .45], [-4, .5], [2, .4], [-3, .5], [0, .6]].reduce((a, [r, d]) => { K.anima(tl, Pe, { rot: r }, a, d, 'sine.inOut'); return a + d; }, t5 + 2.2);
    K.anima(tl, Sb, { x: -260 }, 0, 0);
    K.anima(tl, Sb, { o: 1 }, cor, .12);
    K.anima(tl, Sb, { x: 1250 }, cor, .75, 'power1.in');
    K.anima(tl, Sb, { o: 0 }, cor + .58, .17);

    // ── 06 · a carta sobe e sai; o cume sobe em primeiro plano (L2); nele, uma a uma: duas penas, três flechas e o
    //        abanador, enterrados no capim; o vento balança as penas ──
    const t6 = t('abertura_06'), cax = ctx.sfx('caxixi')[0], of = P.oferendas, Mo = P.morro.estado, fixos = [of, P.penaA, P.penaB];
    K.anima(tl, P.carta.estado, { y: -980 }, t6, 1.5, 'power2.in');
    K.anima(tl, Pe, { y: -980 }, t6 + .15, 1.4, 'power2.in');
    K.anima(tl, E, { vento: 2.2 }, t6, 2.5);
    K.anima(tl, Mo, { y: 440 }, 0, 0);
    K.anima(tl, Mo, { y: 0 }, t6 + .4, 2.2, 'power2.out');
    for (const b of fixos) { K.anima(tl, b.pose, { dy: 440 }, 0, 0); K.anima(tl, b.pose, { dy: 0 }, t6 + .4, 2.2, 'power2.out'); }
    const surge = (b, a) => { K.anima(tl, b.pose, { escala: .6 }, 0, 0); K.anima(tl, b.pose, { opacidade: 1 }, a, .3); K.anima(tl, b.pose, { escala: .9 }, a, .45, 'back.out(2)'); };
    surge(P.penaA, cax - 2.2); surge(P.penaB, cax - 1.7);
    ['flecha1', 'flecha2', 'flecha3'].forEach((f, i) => {
      const a = cax - 1.15 + i * .38, g = [-24, 20, 26][i];
      K.anima(tl, of.pose.a, { [f]: g }, 0, 0);
      K.anima(tl, of.pose.o, { [f]: 1 }, a, .12);
      K.anima(tl, of.pose.a, { [f]: 0 }, a, .5, 'back.out(3)'); // fincada: tomba no lugar e balança
    });
    K.anima(tl, of.pose.o, { abanador: 1 }, cax, .25);
    K.anima(tl, of.pose.a, { abanador: -20 }, 0, 0);
    K.anima(tl, of.pose.a, { abanador: 0 }, cax, .6, 'back.out(2.5)');

    // ── 07 · a serra desfoca e afunda devagar, o cume junto; as penas se soltam e sobem pelo feixe, como brasas ──
    const t7 = t('abertura_07'), tam = ctx.sfx('tambor_grave')[1];
    K.anima(tl, Lc.L4, { b: 7 }, t7 + .4, 3.2);
    K.anima(tl, Lc.L5, { b: 10 }, t7 + .4, 3.2);
    K.anima(tl, Lc.L4, { y: 820 }, t7 + 1.8, 4.6, 'power2.in');
    K.anima(tl, Lc.L5, { y: 560 }, t7 + 2.2, 4.4, 'power2.in');
    K.anima(tl, Lc.L2, { b: 4 }, t7 + 1, 3);
    K.anima(tl, Mo, { y: 520 }, t7 + 1.6, 4.4, 'power2.in');
    K.anima(tl, of.pose, { dy: 520, z: .35 }, t7 + 1.6, 4.4, 'power2.in');
    K.anima(tl, of.pose, { opacidade: 0 }, t7 + 3.2, 2.6);
    K.anima(tl, E, { vento: 3 }, t7, 1.5);
    [[P.penaA, tam - 1.3, -230, 70], [P.penaB, tam - .2, 210, -60]].forEach(([b, a, dx, gi]) => {
      K.anima(tl, b.pose, { y: 70, x: b.pose.x + dx, rot: b.pose.rot + gi, z: .75 }, a, 5.2, 'sine.in');
      K.anima(tl, b.pose, { opacidade: 0 }, a + 3.6, 1.6);
    });

    // ── 08 · na palavra "dono", a chama se inclina como se alguém passasse ao lado dela; em "mãe do mato", um par de
    //        pegadas viradas (dedos para trás) marca o rodapé do papel e esmaece antes da troca no escuro ──
    const dono = t('abertura_08') + .75, mae = t('abertura_08') + 2.1;
    K.anima(tl, E, { vento: 0 }, dono - .3, .6);
    K.anima(tl, p.luz, { inclina: -26, lamparina: .72 }, dono, .16, 'power2.out');
    K.anima(tl, p.luz, { inclina: 7, lamparina: 1.1 }, dono + .16, .55, 'sine.inOut');
    K.anima(tl, p.luz, { inclina: 0, lamparina: 1 }, dono + .71, .9, 'sine.out');
    // quem passou junto da luz: a sombra dele varre o papel, enorme e desfocada (L4 está afundada 820 px)
    K.anima(tl, Sb, { x: 1350, y: -560, escala: 4.6 }, dono - .1, 0);
    K.anima(tl, Sb, { o: .7 }, dono - .1, .15);
    K.anima(tl, Sb, { x: -1250 }, dono - .1, .8, 'power1.inOut');
    K.anima(tl, Sb, { o: 0 }, dono + .5, .2);
    K.anima(tl, p.luz, { brilho: .9 }, dono, .2);
    K.anima(tl, p.luz, { brilho: 1 }, dono + .3, 1);
    K.anima(tl, P.franja.estado, { y: 0 }, mae - .5, 3.2, 'sine.out'); // a mata desfocada sobe devagar em L3
    const somem = ctx.cena.fim - ctx.cena.inicio - mae - .9; // apagam antes da troca no escuro
    [[862, 1], [940, -1], [1016, 1], [1094, -1]].forEach(([x, lado], i) =>
      c.rastros.por(x, K.CHAO + 2 + lado * 3, { dir: 1, invertida: true, lado, escala: 1.5, t0: c.abs(mae + i * .22), dura: Math.max(1, somem - i * .22), opacidade: .72 }));
  });

  // Fósforo (fora do papel, junto da candeia): palito com a chama e o clarão. Animado direto pela timeline.
  function fosforo(p) {
    const FX = 1809, FY = 862; // ponta do pavio da candeia no palco (palco.js: FX, FY)
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;left:${FX - 80}px;top:${FY - 80}px;width:160px;height:160px;pointer-events:none;visibility:hidden;opacity:0;z-index:3`;
    d.innerHTML = '<svg width="160" height="160" viewBox="0 0 160 160"><defs><radialGradient id="sbf-g"><stop offset="0" stop-color="#FFE2A0" stop-opacity=".9"/>' +
      '<stop offset=".35" stop-color="#FF9A3C" stop-opacity=".28"/><stop offset="1" stop-color="#FF8A2A" stop-opacity="0"/></radialGradient></defs>' +
      '<circle cx="80" cy="74" r="70" fill="url(#sbf-g)" style="mix-blend-mode:screen"/>' +
      '<path d="M82.5 84L121 141" stroke="#5E3C1E" stroke-width="3.4" stroke-linecap="round"/><path d="M83.4 83.6L121.6 140.4" stroke="#B88650" stroke-width="1" stroke-linecap="round" opacity=".6"/>' +
      '<ellipse cx="82" cy="83" rx="3.6" ry="4.4" fill="#3A140A" transform="rotate(-34 82 83)"/>' +
      '<path d="M80.6 82C74.6 80 74 72 77.4 65C79 61.6 80.4 59 80.6 55C83 59 87 64 87.4 70C87.8 76 85.4 81 80.6 82Z" fill="#F59A2A"/>' +
      '<path d="M81 80.6C78.2 79.4 78 75 79.6 71C80.4 69 81 67.6 81.2 65.4C82.6 68 84.6 71 84.6 74.6C84.6 77.6 83.2 80 81 80.6Z" fill="#FFF0C4"/></svg>';
    p.raiz.appendChild(d);
    return d;
  }

  /* ───────────────────────── MATA ─────────────────────────
   * O sol de couro açafrão nasce baixo, à esquerda, entre os troncos; o contra-regra sobe a mata em camadas e a
   * samaúma pousa por último. Araras em arco por baixo da franja de folhas (duas pousam na embaúba), bugio que
   * ronca, tatu que mergulha na toca, onça em L3 atrás dos buritis, veada prenhe que bebe no riacho claro; tudo
   * respira junto; no fim, o silêncio e dois olhinhos no oco. */
  const rgb = o => Object.fromEntries(Object.entries(o).flatMap(([k, h]) => { const n = parseInt(h.slice(1), 16); return [[k + 'R', n >> 16 & 255], [k + 'G', n >> 8 & 255], [k + 'B', n & 255]]; }));
  // amanhecer quente (rosa-urucum e dourado, sem lilás); a luz nasce embaixo à esquerda
  const AURORA = Object.assign(rgb({ papelCentro: '#FCE8C4', papelMeio: '#F0BC8E', papelBorda: '#A65A38', papelCanto: '#3A1A10', gel: '#FFB070', tinta: '#2A150B' }),
    { gelOpac: .15, saturacao: 1.06, matiz: 0, vinheta: .5, poeira: 1, tremor: .7 });
  // sol de gel açafrão (L4, multiply): disco translúcido de borda recortada a faca, centro quase branco, sem anéis; os
  // raios são feixes longos e finos de luz (camada de brilho, screen) que se abrem por entre os troncos. estado: x, y, o
  function solGel() {
    const NS = 'http://www.w3.org/2000/svg', R = 64, st = { x: 330, y: 760, o: 0 }, f1 = v => v.toFixed(1);
    let borda = '', raios = '', defs = '';
    for (let i = 0; i < 34; i++) {
      const a = i / 34 * Math.PI * 2, k = 1 + .03 * Math.sin(5 * a + 1) + .02 * Math.sin(13 * a) - (i % 7 === 3 ? .05 : 0);
      borda += (i ? 'L' : 'M') + f1(Math.cos(a) * R * k) + ' ' + f1(Math.sin(a) * R * k);
    }
    [[-76, 640, 16], [-55, 900, 26], [-38, 1000, 20], [-22, 1100, 30], [-8, 1000, 18], [8, 820, 24]].forEach(([g, L, w], i) => {
      const a = g * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), p = (d, l) => f1(c * d - s * l) + ' ' + f1(s * d + c * l);
      defs += `<linearGradient id="sol-r${i}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${f1(c * L)}" y2="${f1(s * L)}"><stop offset="0" stop-color="#FFE9B8" stop-opacity="0"/>` +
        `<stop offset=".1" stop-color="#FFE9B8" stop-opacity=".3"/><stop offset=".5" stop-color="#FFE9B8" stop-opacity=".12"/><stop offset="1" stop-color="#FFE9B8" stop-opacity="0"/></linearGradient>`;
      raios += `<path d="M${p(R * .8, -2)}L${p(L, -w / 2)}L${p(L, w / 2)}L${p(R * .8, 2)}Z" fill="url(#sol-r${i})"/>`;
    });
    const el = (html, css) => { const e = document.createElementNS(NS, 'svg'); e.setAttribute('width', 1920); e.setAttribute('height', 1080); e.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;' + css; e.innerHTML = html; return e; };
    const disco = el(`<defs><radialGradient id="sol-gel"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".45" stop-color="#FFF2CF"/><stop offset=".8" stop-color="#F6C460"/>` +
      `<stop offset="1" stop-color="#E2962E"/></radialGradient></defs><g><path d="${borda}Z" fill="url(#sol-gel)" stroke="#9C5C24" stroke-width="1.6" stroke-opacity=".45"/></g>`, 'filter:blur(1.2px)');
    const luz = el(`<defs>${defs}</defs><g>${raios}</g>`, 'mix-blend-mode:screen;filter:blur(3px)');
    const g1 = disco.lastChild, g2 = luz.lastChild;
    return { estado: st, camadas: { L4: disco, brilho: luz }, atualizar() {
      const tr = `translate(${f1(st.x)} ${f1(st.y)})`, o = Math.max(0, Math.min(1, st.o)).toFixed(3);
      g1.setAttribute('transform', tr); g2.setAttribute('transform', tr); disco.style.opacity = o; luz.style.opacity = o;
    } };
  }
  // ondinhas concêntricas claras onde o focinho toca a água (estado.k: 0 → 1 = uma onda que abre e some)
  function ondinha(x, y) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', 1920); svg.setAttribute('height', 1080); svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
    svg.innerHTML = '<g fill="none" stroke="#FFF4D8" stroke-linecap="round"><ellipse stroke-width="2.2"/><ellipse stroke-width="1.6"/></g>';
    const els = [...svg.querySelectorAll('ellipse')], st = { k: 0 };
    return { estado: st, camadas: { brilho: svg }, atualizar() {
      els.forEach((e, i) => {
        const k = Math.max(0, Math.min(1, st.k * 1.3 - i * .3)), rx = 6 + 46 * k;
        e.setAttribute('cx', x); e.setAttribute('cy', y); e.setAttribute('rx', rx.toFixed(1)); e.setAttribute('ry', (rx * .16).toFixed(1));
        e.setAttribute('opacity', (k > 0 && k < 1 ? .85 * (1 - k) : 0).toFixed(3));
      });
    } };
  }

  S.cenas.registrar('mata', (tl, ctx) => {
    const K = S.kit, Bi = S.bichos, t = ctx.t, tf = ctx.tf, sfx = n => ctx.sfx(n)[0];
    const sobe = t('mata_01') - .2;
    const c = K.posse(tl, ctx, { entrada: 'contrarregra', luz: null, luzEm: sobe - 1.2 }), p = c.palco; // as camadas sobem no escuro, ainda sob a cartela
    const cen = c.possuir(S.cenarios.mata(p)), P = cen.pecas, E = cen.estado, pt = cen.pontos;

    // ── 01 · o sol nasce baixo à esquerda, entre os troncos; a mata sobe em camadas; a samaúma desce e pousa no centro ──
    K.luz(tl, p, Object.assign({}, AURORA, { hotX: 14, hotY: 88, hotRX: 50, hotRY: 56, brilho: .86 }), sobe, .9, 'power1.out');
    K.luz(tl, p, Object.assign({}, AURORA, { hotX: 20, hotY: 66, hotRX: 66, hotRY: 74, brilho: .98 }), sobe + .9, t('mata_02') - sobe - .9);
    const sol = c.possuir(solGel()).estado;
    K.anima(tl, sol, { o: 1 }, sobe, 1.2);
    K.anima(tl, sol, { y: 540 }, sobe, t('mata_02') + 3 - sobe, 'sine.out');
    K.anima(tl, sol, { o: 0 }, t('mata_02') + 1.5, 3);
    for (const [o, k] of [[P.samauma.estado, 'y'], [P.bromeliaSap.estado, 'y'], [P.bromeliaFlor.pose, 'dy']]) { // a bromélia da sapopema desce junto
      K.anima(tl, o, { [k]: -1900 }, 0, 0);
      K.anima(tl, o, { [k]: 0 }, sobe + 1.25, 1.15, 'power3.out');
    }

    // ── 02 · amanhecer → dia; a mata fica legível até o fundo; as folhas de L1 balançam ──
    const t2 = t('mata_02');
    K.luz(tl, p, 'dia', t2, 4.5);
    K.anima(tl, E, { vento: 2.4 }, t2 + .3, 1.6);
    K.anima(tl, E, { vento: 1.3 }, tf('mata_02') - 1, 2);

    // ── 03 · seis araras cruzam em arco por baixo da franja de L1 e por baixo do galho do bugio, uma de cada vez (sem
    //        uma cobrir a outra); as duas primeiras pousam em pé no galho da embaúba; o bugio surge no galho e ronca ──
    const t3 = t('mata_03'), [gx, gy] = pt.samauma.galho, pol = pt.poleiro, DY = [-10, 20, 0, 36, -14, 22], SAI = [0, .55, 1.2, 1.75, 2.3, 2.85], pousadas = [];
    // a altura segue a posição (função de x, à prova de seek): sobe até x 300 e desce em curva suave, passando
    // bem abaixo do galho do bugio; as que pousam saem do arco e sobem para o galho da embaúba
    const ss = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
    const arco = x => (x < 300 ? 230 + 200 * ((300 - x) / 490) ** 2 : 230 + 330 * ss((x - 300) / 1000));
    Bi.bando(6, { semente: 4, escala: .95 }).forEach((b, i) => {
      c.boneco(b);
      const a = t3 + SAI[i], dx = 0, alvo = i === 0 ? pol[1] : i === 1 ? pol[0] : null; // a primeira pousa no galho mais longe
      K.anima(tl, b.pose, { x: -190 + dx, y: 0 }, 0, 0);
      b.motores.push(bb => {
        const x = bb.pose.x, k = alvo ? ss((x - alvo[0] + 320) / 320) : 0;
        bb.extra.dy += arco(x) + DY[i] + k * (alvo ? alvo[1] - POUSO * bb.pose.escala - 3 - arco(x) - DY[i] : 0); // garras 3 px acima do galho
      });
      if (!alvo) { K.anima(tl, b.pose, { x: 2400 + dx }, a, 6); return; }
      K.anima(tl, b.pose, { x: alvo[0] }, a, (alvo[0] + 190 - dx) / 400, 'sine.out');
      K.anima(tl, b.pose, { pouso: 1 }, a + (alvo[0] + 190 - dx) / 400 - .45, .5, 'power2.out');
      pousadas.push(b);
    });
    const bu = c.boneco(Bi.bugio({ galho: false, x: gx, y: gy + 22, escala: .9, opacidade: 0 }));
    K.surgir(tl, bu, t3 + 2.2, 1.1);
    Bi.roncar(tl, bu, sfx('bugio'), 2.4);

    // ── 04 · o tatu cruza o chão em trote e mergulha na toca, a cauda some por último; a onça passa em L3 e some atrás dos buritis ──
    const t4 = t('mata_04'), toca = pt.samauma.toca;
    const ta = c.boneco(Bi.tatu({ x: 2000, dir: -1 }));
    K.caminhar(tl, ta, Object.assign({ ate: toca[0] + TATU_X, t0: tf('mata_03') - .1, t1: t4 + 1.35 }, Bi.andadura(ta, 'trote')));
    K.anima(tl, ta.pose, { toca: 1, x: toca[0] - 80 }, t4 + 1.4, 1.1, 'power1.in');
    K.anima(tl, ta.pose, { opacidade: 0 }, t4 + 2.6, 0);

    const es = sfx('onca_esturro'), on = Bi.onca({ x: 1120, y: 808, escala: .62, z: .12, opacidade: 0 });
    c.boneco(on, { camada: 'L3' });
    cen.camadas.L3.insertBefore(on.camadas.bonecos, P.buritis.els[0].e); // atrás dos buritis
    K.anima(tl, on.pose, { opacidade: 1 }, t4 - .4, .8);
    K.caminhar(tl, on, { ate: 1450, t0: t4 - .4, t1: es - .15 });
    Bi.esturrar(tl, on, es, 1.1);
    K.caminhar(tl, on, { ate: 1880, t0: es + 1.1, t1: es + 4.6 });
    K.anima(tl, on.pose, { opacidade: 0 }, es + 3.3, 1.1);

    // ── 05 · a veada prenhe entra pela direita, baixa o pescoço até a linha d'água e bebe (uma ondinha abre);
    //        a luz esquenta sobre ela; orelhas em alerta ──
    const t5 = t('mata_05'), fl = sfx('flauta_chamado'), ve = c.boneco(Bi.veada({ x: 2060, dir: -1 }));
    const xb = pt.riacho.margem[0] + VEADA_X, bebe = t5 + 2.5, ond = c.possuir(ondinha(xb - FOCINHO, pt.riacho.beber[1] + 2));
    K.caminhar(tl, ve, { ate: xb, t0: es + .05, t1: bebe - .1 });
    K.anima(tl, ve.pose, { bebe: 1 }, bebe, 1.1, 'sine.inOut');
    K.anima(tl, ond.estado, { k: 1 }, bebe + .9, 1.6, 'power1.out');
    K.luz(tl, p, { hotX: 18, hotY: 50, hotRX: 74, hotRY: 90, gelR: 255, gelG: 200, gelB: 130, gelOpac: .13, brilho: 1.12 }, t5 + 1.2, 3);
    K.anima(tl, ve.pose, { bebe: 0, alerta: 1 }, fl, .35, 'power2.out');
    K.anima(tl, ve.pose, { alerta: 0 }, fl + 1.3, .9, 'sine.inOut');

    // ── 06 · tudo o que está à vista respira no mesmo compasso, como um só corpo ──
    const t6 = t('mata_06'), vivos = [bu, ve, ...pousadas];
    K.anima(tl, E, { vento: .25 }, t6, 2);
    K.anima(tl, ve.pose, { bebe: .55 }, t6 + 1.2, 1.4);
    for (const b of vivos) {
      K.anima(tl, b.pose, { respiro: 3.2 }, t6 + .4, 2);
      K.anima(tl, b.pose, { respiro: 1 }, tf('mata_06') - .6, 1.4);
    }

    // ── 07 · a música e as cigarras cortam; no oco, dois olhinhos se acendem e se apagam ──
    const t7 = t('mata_07'), fim = sfx('gongo_grave'), olha = t7 + 2.6;
    K.anima(tl, E, { vento: 0 }, t7, .8);
    K.luz(tl, p, { hotX: 50, hotY: 42, hotRX: 74, hotRY: 86, brilho: .9, vinheta: .52, gelOpac: .07 }, t7, 2.4);
    K.anima(tl, P.samauma.estado, { olhos: 1 }, olha, .3, 'power2.out');
    K.anima(tl, P.samauma.estado, { olhos: .05 }, olha + 1.5, .07);
    K.anima(tl, P.samauma.estado, { olhos: 1 }, olha + 1.62, .09);
    K.anima(tl, P.samauma.estado, { olhos: 0 }, fim, .22, 'power2.in');
    K.anima(tl, ve.pose, { bebe: 0, alerta: 1 }, olha + .2, .3, 'power2.out');
    K.anima(tl, bu.pose, { respiro: 0 }, olha + .2, .4);
    K.anima(tl, E, { agito: 1.6 }, fim, .12);
    K.anima(tl, E, { agito: 0 }, fim + .12, 1, 'power2.out');
  });
  // medidas dos bonecos (escala 1, de perfil): origem da arara pousada acima dos pés; tatu de frente para a toca;
  // veada: focinho relativo à origem com o pescoço baixo (bebe 1), e quanto ela fica à direita da margem
  const POUSO = 36, TATU_X = 92, VEADA_X = 110, FOCINHO = 86;
})();
