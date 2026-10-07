/* palco.js — Sombras.palco: sala, biombo tríptico, papel iluminado, camadas, partículas e lamparina.
 * Palco lógico 1920×1080; tudo é função do tempo t (seek/?t= funcionam). Guia: estilo.md §3, §5, §9, §11.
 *
 *   const p = Sombras.palco.criar(elemento, {luz: 'lamparina'})   cria o palco dentro do elemento (1920×1080)
 *   p.quadro(t)              desenha o instante t (s): luz, chama, tremor, paralaxe, partículas e atores
 *   p.luz                    objeto NUMÉRICO do estado de luz (o GSAP interpola): papelCentroR/G/B, papelMeio*,
 *                            papelBorda*, papelCanto*, hotX, hotY, hotRX, hotRY (%), vinheta, gelR/G/B, gelOpac,
 *                            brilho, saturacao, matiz (graus), tintaR/G/B (tinta do cenário), poeira, tremor,
 *                            lamparina (chama da candeia: 0 apagada, 1 acesa, > 1 sobe; também halo e brasas),
 *                            opcionais: halo (escala do halo, 1), sala (0..1: véu sobre moldura e candeia), textura (1), inclina
 *   Sombras.palco.LUZES      {lamparina, amanhecer, dia, entardecer, noite, tempestade, aurora} no mesmo formato, e
 *                            escuro (sala apagada, candeia apagada: estado inicial de Sombras.palco.iniciar)
 *   p.irPara(nome, dur=3)    tween GSAP de p.luz até o estado (devolve o tween para entrar na timeline mestre;
 *                            sem GSAP ou dur=0, aplica direto)
 *   p.relampagos             lista de instantes (s) de relâmpago: [12.5, 14.1]
 *   p.particulas             intensidades 0..1: {poeira, vagalumes, chuva, brasas}; chuvaInclina (graus, padrão 12)
 *   p.camera.x               deslocamento horizontal (px) para paralaxe; p.abalo = px de tremor do palco inteiro
 *   p.camadas[nome]          contêineres, de trás para a frente: L5 L4 L3 L2 rastros bonecos brilho L1 L0
 *                            (multiply, exceto brilho) — o cenário e os bonecos entram aqui
 *   p.adicionar(ator)        ator = {camadas: {nomeDaCamada: elemento}, atualizar(t)} (ex.: boneco)
 *   p.remover(ator)
 *   Sombras.palco.chama(t, A)    sinal do tremor da chama (≈ 1 ± 0,05); Sombras.rng(semente), Sombras.hash(n)
 *   Sombras.palco.iniciar(el) / .quadro(t)   ganchos do player.js (palco único em Sombras.palco.atual)
 * Desempenho: brilho e tremor viram véus de opacidade (sem filtro por quadro); brightness real só acima de 1,12
 * (relâmpago); saturate/hue-rotate só nos estados que pedem. Textura do papel e biombo são estáticos.
 */
(function () {
  'use strict';
  const S = window.Sombras = window.Sombras || {};
  const W = 1920, H = 1080, PAPEL = { x: 72, y: 52, w: 1776, h: 800 };
  const TAU = Math.PI * 2;
  // candeia: caixa do SVG, ampliação em torno do topo do toco e ponta do pavio (antes da ampliação)
  const LX = 1660, LY = 660, LW = 260, LH = 420;
  const LK = 1.3, BX = 1772, BY = 931; // a candeia é ampliada em torno do topo do toco (lê melhor em tela pequena)
  const CHX = 1800.5, CHY = 879.5;
  const FX = BX + (CHX - BX) * LK, FY = BY + (CHY - BY) * LK; // base da chama no palco

  // ---------- utilidades determinísticas ----------
  function rng(semente) {
    let a = semente >>> 0;
    return function () {
      a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hash(n) {
    n = Math.imul(n ^ 61 ^ (n >>> 16), 9); n ^= n >>> 4;
    n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15;
    return (n >>> 0) / 4294967296;
  }
  const mod = (a, b) => ((a % b) + b) % b;
  function ruido(t, semente) { // valores sorteados a cada 0,1 s, interpolados suavemente, em [-1, 1]
    const x = t * 10, i = Math.floor(x), k = x - i, s = k * k * (3 - 2 * k);
    const a = hash(i * 7919 + semente) * 2 - 1, b = hash((i + 1) * 7919 + semente) * 2 - 1;
    return a + (b - a) * s;
  }
  function chama(t, A) {
    return 1 + A * (.018 * Math.sin(TAU * 1.7 * t) + .012 * Math.sin(TAU * 3.1 * t + 1.3) +
      .008 * Math.sin(TAU * 7.3 * t + .4) + .01 * ruido(t, 11));
  }
  function relampago(dt) { // §11.3 → {b: brilho, k: força do clarão}
    if (dt < 0 || dt > .61) return null;
    if (dt < .07) return { b: 1.9, k: 1 };
    if (dt < .16) return { b: .45, k: 1 };
    if (dt < .21) return { b: 1.6, k: 1 };
    const e = 1 - (dt - .21) / .4;
    return { b: 1.6, k: e * e };
  }

  // ---------- estados de luz (§3.2) ----------
  const COLS = ['papelCentro', 'papelMeio', 'papelBorda', 'papelCanto'];
  const TABELA = { //   centro     meio       borda      canto      hotspot x y rx ry  vinh  gel   gelOp  brilho sat   matiz  tinta    poeira tremor
    lamparina:  ['#F8E8C0', '#D9B57A', '#8E6232', '#3B2614', 50, 44, 62, 78, .65, '#FFB86B', .10, 1.00, 1.00, 0, '#24140A', 1, 1],
    amanhecer:  ['#F7DDC6', '#D9AE9A', '#7D6577', '#2C2230', 28, 72, 70, 80, .45, '#F2B6A0', .14, .96, .90, -6, '#2A1E26', 1, .7],
    dia:        ['#FBF1D6', '#E6CC98', '#B08A52', '#5A3E22', 50, 30, 85, 95, .30, '#FFF3D0', .04, 1.08, 1.05, 0, '#2B1A0C', 1, .5],
    entardecer: ['#F8CF8C', '#E39A55', '#8E3B1C', '#2E120A', 72, 64, 66, 80, .55, '#FF8A3C', .16, .98, 1.15, -8, '#2A0F06', 1, .8],
    noite:      ['#C8CCC2', '#7F8C93', '#2B3445', '#0B0F18', 58, 30, 48, 60, .80, '#3D5A8A', .30, .70, .65, 0, '#0B1220', 0, .3],
    tempestade: ['#B3B8AE', '#6C7470', '#252B2B', '#080A0B', 50, 40, 60, 70, .85, '#4E6470', .34, .58, .55, 0, '#0A0F10', 0, 1.6],
    aurora:     ['#FFEBC0', '#F4BE8E', '#9A6A78', '#3A2433', 50, 78, 80, 70, .40, '#FFD39A', .12, 1.06, 1.10, -4, '#2A1810', 1, .8],
  };
  const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  function corEm(o, nome, r) { o[nome + 'R'] = r[0]; o[nome + 'G'] = r[1]; o[nome + 'B'] = r[2]; }
  const LUZES = {};
  for (const nome in TABELA) {
    const v = TABELA[nome], o = {};
    COLS.forEach((c, i) => corEm(o, c, hex(v[i])));
    Object.assign(o, { hotX: v[4], hotY: v[5], hotRX: v[6], hotRY: v[7], vinheta: v[8] });
    corEm(o, 'gel', hex(v[9]));
    Object.assign(o, { gelOpac: v[10], brilho: v[11], saturacao: v[12], matiz: v[13] });
    corEm(o, 'tinta', hex(v[14]));
    Object.assign(o, { poeira: v[15], tremor: v[16], lamparina: 1 });
    LUZES[nome] = o;
  }
  // lamparina: chama da candeia (0 apagada, 1 acesa, > 1 sobe); 'escuro' = sala às escuras, candeia apagada (tela inicial)
  LUZES.escuro = Object.assign({}, LUZES.lamparina, { brilho: .05, poeira: 0, lamparina: 0 });
  const rgb = (o, n, mix, k) => {
    let r = o[n + 'R'], g = o[n + 'G'], b = o[n + 'B'];
    if (mix && k) { r += (mix[0] - r) * k; g += (mix[1] - g) * k; b += (mix[2] - b) * k; }
    return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
  };

  // ---------- estilos ----------
  const CSS = `
.sb-palco{position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;contain:strict;
  background:radial-gradient(ellipse 60% 40% at 50% 100%,#1A110A,transparent),#0D0906}
.sb-palco>*,.sb-luz>*{position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none}
.sb-luz{clip-path:inset(${PAPEL.y}px ${W - PAPEL.x - PAPEL.w}px ${H - PAPEL.y - PAPEL.h}px ${PAPEL.x}px)}
.sb-escuro{background:#000;will-change:opacity}.sb-claro{background:#fff;will-change:opacity}
.sb-luz>.sb-papel,.sb-luz>.sb-textura{left:${PAPEL.x}px;top:${PAPEL.y}px;width:${PAPEL.w}px;height:${PAPEL.h}px}
.sb-mult{mix-blend-mode:multiply}.sb-tela{mix-blend-mode:screen}
.sb-camada{will-change:transform}
.sb-vinheta{background:radial-gradient(ellipse 75% 80% at 50% 45%,transparent 55%,#000 100%)}
.sb-halo{background:radial-gradient(circle 460px at ${FX}px ${FY}px,rgba(255,168,64,.34),transparent 70%);will-change:opacity}
.sb-tinta{background:var(--sb-tinta,#24140A)}`;
  function injetarCSS() {
    if (document.getElementById('sombras-palco-css')) return;
    const st = document.createElement('style');
    st.id = 'sombras-palco-css'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  // ---------- biombo (§9.1) ----------
  // trança de palha em espinha: fitas inclinadas com tom variado, sombra na borda que entra sob a vizinha, fiapos
  function tranca(r, id, x0, x1, y0, h) {
    const passo = h * .5, meio = y0 + h / 2, d = h * .42;
    let fitas = '', sombras = '';
    const tons = ['#C9A15A', '#BE9450', '#D4AE68', '#B08646', '#C79C56'];
    for (let x = x0 - h, i = 0; x < x1 + h; x += passo, i++) {
      for (const [ya, yb, k] of [[meio, y0, 1], [meio, y0 + h, -1]]) {
        const w = passo * .86, q = [[x, ya], [x + w, ya], [x + w + d, yb], [x + d, yb]].map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1));
        fitas += `<path d="M${q.join('L')}Z" fill="${tons[(i * 3 + (k > 0 ? 0 : 2) + (r() * 2 | 0)) % 5]}"/>`;
        sombras += `M${q[0]}L${q[3]}`;
      }
    }
    let fiapos = '';
    for (let i = 0; i < 4; i++) {
      const x = x0 + 80 + r() * (x1 - x0 - 160), em = r() < .5, y = em ? y0 + 1 : y0 + h - 1, k = em ? -1 : 1, L = 7 + r() * 9;
      fiapos += `M${x.toFixed(1)} ${y}q${(L * .5).toFixed(1)} ${(k * L * .3).toFixed(1)} ${(L * (.8 + r() * .5)).toFixed(1)} ${(k * L * (.5 + r() * .4)).toFixed(1)}`;
    }
    return `<clipPath id="${id}"><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${h}"/></clipPath><g clip-path="url(#${id})">${fitas}` +
      `<path d="${sombras}" stroke="#4A3016" stroke-width="1.6" opacity=".75" transform="translate(-.8 0)"/>` +
      `<path d="M${x0} ${meio}H${x1}" stroke="#5A3E1C" stroke-width="1.2" opacity=".6"/></g>` +
      `<path d="${fiapos}" fill="none" stroke="#C9A15A" stroke-width="1" stroke-linecap="round"/>`;
  }
  function moldura() {
    const G = S.grafismos, r = rng(31);
    const serra = G.variante('g-serra', { cor: '#1A0F08' });
    const pans = [[72, 641], [675, 1245], [1279, 1848]];
    const mont = [[36, 72], [641, 675], [1245, 1279], [1848, 1884]];
    const pes = mont.map(([a, b]) => { const c = (a + b) / 2; return `M${c - 14} 904L${c + 14} 904L${c + 17} 958Q${c + 17} 968 ${c + 8} 968L${c - 8} 968Q${c - 17} 968 ${c - 17} 958Z`; }).join('');
    // remates: toco lavrado a enxó, cantos chanfrados e topo irregular
    const remates = mont.map(([a, b]) => {
      const e = a - 3, d = b + 3, c = (a + b) / 2;
      return `M${e} 22L${e} 13L${e + 6} 6.5L${c - 4} ${(4.5 + r() * 2).toFixed(1)}L${c + 5} ${(3.5 + r() * 2).toFixed(1)}L${d - 6} 7L${d} 12.5L${d} 22Z`;
    }).join('');
    const chanfros = mont.map(([a, b]) => `M${b + 3} 12.5L${b - 3} 7L${b - 3} 13L${b + 3} 18Z`).join('');
    const corpo = 'M36 20H1884V904H36Z' + pans.map(([a, b]) => `M${a} 52V852H${b}V52Z`).join('');
    let veios = '';
    for (const [a, b] of mont) for (let i = 0; i < 7; i++) {
      let x = a + 4 + r() * (b - a - 8), d = `M${x.toFixed(1)} 22`;
      for (let y = 22; y < 904; y += 60) { x += (r() - .5) * 2.4; d += `Q${(x + (r() - .5) * 4).toFixed(1)} ${y + 30} ${x.toFixed(1)} ${y + 60}`; }
      veios += d;
    }
    for (const [y0, y1] of [[20, 52], [852, 904]]) for (let i = 0; i < 6; i++) {
      let y = y0 + 3 + r() * (y1 - y0 - 6), d = `M36 ${y.toFixed(1)}`;
      for (let x = 36; x < 1884; x += 90) { y += (r() - .5) * 1.6; d += `Q${x + 45} ${(y + (r() - .5) * 3).toFixed(1)} ${x + 90} ${y.toFixed(1)}`; }
      veios += d;
    }
    // travessa superior: goivadas de faca irregulares (acima e abaixo) e friso de palha trançada no meio
    let goivas = '', labios = '';
    for (const yc of [26.5, 45.5]) for (let x = 44 + r() * 10; x < 1876; x += 13 + r() * 19) {
      const L = 7 + r() * 9, w = 1.6 + r() * 1.4, a = (r() - .5) * .5 + (yc < 30 ? .12 : -.12), dx = Math.cos(a) * L / 2, dy = Math.sin(a) * L / 2;
      const p = (k, s) => `${(x + dx * k - Math.sin(a) * w * s).toFixed(1)} ${(yc + dy * k + Math.cos(a) * w * s).toFixed(1)}`;
      goivas += `M${p(-1, 0)}Q${p(0, -1.6)} ${p(1, 0)}Q${p(0, 1)} ${p(-1, 0)}Z`;
      labios += `M${p(-.8, .7)}Q${p(0, 1.5)} ${p(.8, .7)}`;
    }
    let entalhes = `<path d="${goivas}" fill="#1A0F08"/><path d="${labios}" fill="none" stroke="#8A5A32" stroke-width="1" opacity=".8"/>` +
      `<rect x="36" y="31" width="1848" height="11" fill="#5A3E1C"/>${tranca(r, 'sbm-t1', 36, 1884, 31.5, 10)}` +
      `<path d="M36 31H1884M36 42.5H1884" stroke="#1A0F08" stroke-width="1.2"/>`;
    // montantes: coluna de losangos com ponto (pele de cobra) em relevo raso, medalhão em losango no meio
    for (const [a, b] of mont) {
      const c = (a + b) / 2, ym = 478, hw = (b - a) / 2 - 8;
      let los = '', pts = '';
      for (const [y0, y1] of [[64, ym - 38], [ym + 38, 846]]) {
        const n = Math.max(1, Math.round((y1 - y0) / 27)), h = (y1 - y0) / n;
        for (let i = 0; i < n; i++) {
          const y = y0 + h * (i + .5) + (r() - .5) * 2, hh = h / 2 - 2.6 - r() * 1.2, ww = hw - r() * 1.2;
          los += `M${c.toFixed(1)} ${(y - hh).toFixed(1)}L${(c + ww).toFixed(1)} ${y.toFixed(1)}L${c.toFixed(1)} ${(y + hh).toFixed(1)}L${(c - ww).toFixed(1)} ${y.toFixed(1)}Z`;
          pts += `M${(c + 1.8).toFixed(1)} ${y.toFixed(1)}a1.8 1.8 0 1 0-3.6 0a1.8 1.8 0 1 0 3.6 0`;
        }
      }
      entalhes += `<g transform="translate(.6 1.1)"><path d="${los}" fill="none" stroke="#8A5A32" stroke-width="1.6" opacity=".7"/></g>` +
        `<path d="${los}" fill="none" stroke="#1A0F08" stroke-width="2"/><path d="${pts}" fill="#1A0F08"/>`;
      entalhes += `<path d="M${c} ${ym - 30}L${c + 13} ${ym}L${c} ${ym + 30}L${c - 13} ${ym}Z" fill="#1A0F08"/><path d="M${c} ${ym - 19}L${c + 7} ${ym}L${c} ${ym + 19}L${c - 7} ${ym}Z" fill="#7E5E2C"/><use href="#rebite" x="${c}" y="${ym}"/>`;
    }
    // travessa inferior: trança de palha com relevo entre dois filetes de dente de serra
    entalhes += `<rect x="36" y="866" width="1848" height="24" fill="#5A3E1C"/>${tranca(r, 'sbm-t2', 36, 1884, 866, 24)}` +
      `<rect x="36" y="853" width="1848" height="12" fill="url(#${serra.id})"/><g transform="translate(0 1756) scale(1 -1)"><rect x="36" y="855" width="1848" height="12" fill="url(#${serra.id})"/></g>`;
    // arestas viradas para a lamparina (direita) pegam luz, crescente perto dela
    const arestas = mont.map(([a, b]) => `M${b - .8} 22V904`).join('') + 'M36 51.2H1884M36 853.2H1884M36 21H1884' + pans.map(([a]) => `M${a + .8} 52V852`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><defs>${serra.svg}
<linearGradient id="sbm-luz" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset=".55" stop-color="#000" stop-opacity=".14"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
<radialGradient id="sbm-quente" gradientUnits="userSpaceOnUse" cx="${FX}" cy="${FY}" r="760"><stop offset="0" stop-color="#E08A40" stop-opacity=".42"/><stop offset=".45" stop-color="#C47A3C" stop-opacity=".16"/><stop offset="1" stop-color="#C47A3C" stop-opacity="0"/></radialGradient>
<linearGradient id="sbm-aresta" gradientUnits="userSpaceOnUse" x1="36" x2="1884" y1="0" y2="0"><stop offset="0" stop-color="#8A5A32" stop-opacity=".12"/><stop offset=".6" stop-color="#8A5A32" stop-opacity=".45"/><stop offset="1" stop-color="#D08A4A" stop-opacity=".95"/></linearGradient>
<linearGradient id="sbm-pe" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></linearGradient></defs>
<path d="${pes}" fill="#3A2414"/><path d="${pes}" fill="url(#sbm-pe)"/>
<path d="${corpo}${remates}" fill="#4A2E1A" fill-rule="evenodd"/><path d="${chanfros}" fill="#6A4426"/>
<clipPath id="sbm-c"><path d="${corpo}" clip-rule="evenodd"/></clipPath><path d="${veios}" fill="none" stroke="#24160D" stroke-width=".9" opacity=".6" clip-path="url(#sbm-c)"/>
${entalhes}
<path d="${pans.map(([a, b]) => `M${a} 52V852H${b}V52Z`).join('')}" fill="none" stroke="#120A05" stroke-width="5" opacity=".75"/>
<path d="${arestas}" fill="none" stroke="url(#sbm-aresta)" stroke-width="1.6"/>
<path d="${corpo}${remates}${pes}" fill="url(#sbm-luz)" fill-rule="evenodd"/>
<path d="${corpo}${remates}${pes}" fill="url(#sbm-quente)" fill-rule="evenodd"/>
</svg>`;
  }

  // ---------- candeia de barro sobre um toco (§9.1, §11.6) ----------
  function lamparina() {
    const r = rng(77);
    // toco: casca rachada, topo irregular com anéis, uma raiz escorrendo até o chão
    const lados = [], topo = [];
    for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU; topo.push([1772 + Math.cos(a) * (39 + (r() - .5) * 4), 932 + Math.sin(a) * (7 + (r() - .5) * 1.6)]); }
    for (let y = 934; y <= 1080; y += 12) lados.push([1735 - (y - 934) * .07 + (r() - .5) * 2.4, y]);
    const dir = lados.map(([x, y]) => [1772 + (1772 - x) + (r() - .5) * 2.4, y]).reverse();
    const P = pts => 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
    const toco = P([...lados, ...dir, [1810, 934]]);
    let fiss = '';
    for (let i = 0; i < 8; i++) {
      let x = 1740 + i * 9.5 + r() * 5, y = 942 + r() * 16, d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
      for (; y < 1080; y += 9 + r() * 8) { x += (r() - .5) * 3.4 + (x - 1772) * .012; d += `L${x.toFixed(1)} ${y.toFixed(1)}`; }
      fiss += d;
    }
    const aneis = [28, 19, 10].map(k => P(topo.map(([x, y]) => [1772 + (x - 1772) * k / 39 + (r() - .5) * 1.2, 932 + (y - 932) * k / 39]))).join('');
    return `<svg viewBox="${LX} ${LY} ${LW} ${LH}" xmlns="http://www.w3.org/2000/svg" style="left:${LX}px;top:${LY}px;width:${LW}px;height:${LH}px"><defs>
<linearGradient id="sbl-toco" x1="0" x2="1"><stop offset="0" stop-color="#120A06"/><stop offset=".55" stop-color="#352113"/><stop offset=".86" stop-color="#5E3D22"/><stop offset="1" stop-color="#2A190E"/></linearGradient>
<linearGradient id="sbl-sombra" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".78"/></linearGradient>
<radialGradient id="sbl-barro" cx=".72" cy=".1" r="1"><stop offset="0" stop-color="#E4935A"/><stop offset=".38" stop-color="#9A4E2A"/><stop offset="1" stop-color="#341607"/></radialGradient>
<radialGradient id="sbl-tampo" cx=".7" cy=".3" r=".8"><stop offset="0" stop-color="#8A5C36"/><stop offset="1" stop-color="#4A2E18"/></radialGradient>
<linearGradient id="sbl-chama" x1="0" x2="0" y1="1" y2="0"><stop offset="0" stop-color="#F27A1A"/><stop offset=".2" stop-color="#FFC046"/><stop offset=".62" stop-color="#F27A1A"/><stop offset="1" stop-color="#B5360F" stop-opacity=".25"/></linearGradient>
<radialGradient id="sbl-nucleo" cx=".5" cy=".75" r=".6"><stop offset="0" stop-color="#FFF4D2"/><stop offset="1" stop-color="#FFC046" stop-opacity="0"/></radialGradient>
<radialGradient id="sbl-aura" r=".5"><stop offset="0" stop-color="#FFC77A" stop-opacity=".5"/><stop offset=".4" stop-color="#FF9A3C" stop-opacity=".16"/><stop offset="1" stop-color="#FF8A2A" stop-opacity="0"/></radialGradient>
<clipPath id="sbl-toco-c"><path d="${toco}"/></clipPath></defs>
<path d="M1738 1004C1728 1016 1716 1034 1708 1056C1704 1066 1699 1074 1692 1080L1716 1080C1719 1068 1724 1054 1732 1042C1736 1034 1739 1024 1740 1016Z" fill="#1E120A"/>
<path d="${toco}" fill="url(#sbl-toco)"/>
<g clip-path="url(#sbl-toco-c)"><path d="${fiss}" fill="none" stroke="#0E0804" stroke-width="2.2"/><path d="${fiss}" fill="none" stroke="#7A5232" stroke-width=".8" opacity=".55" transform="translate(1.4 0)"/>
<rect x="1720" y="934" width="110" height="146" fill="url(#sbl-sombra)"/></g>
<path d="${P(topo)}" fill="url(#sbl-tampo)"/><path d="${aneis}" fill="none" stroke="#2E1C0E" stroke-width="1" opacity=".8"/><path d="M1790 927L1806 936" stroke="#1A0F08" stroke-width="1.6"/>
<g transform="translate(${BX} ${BY}) scale(${LK}) translate(${-BX} ${-BY})">
<path d="M1752 931L1754.5 925.5H1775.5L1778 931Z" fill="#4A2210"/>
<path d="M1784 903C1790 899.6 1795 894.6 1797.8 888.6C1799 886 1802.6 885.6 1803 888.4C1802.4 894 1797.6 901.6 1789.6 907.4Z" fill="url(#sbl-barro)"/>
<path d="M1759 896C1746 898 1738 905.6 1738 914C1738 923 1748 928.4 1765 928.4C1782 928.4 1792 923 1792 914C1792 905.6 1784 898 1771 896Z" fill="url(#sbl-barro)"/>
<path d="M1758 897C1757 893.6 1756 890.6 1754 888.6L1776 888.6C1774 890.6 1773 893.6 1772 897Z" fill="#7E3A1A"/>
<ellipse cx="1765" cy="888.6" rx="11.6" ry="2.4" fill="#1E0C04"/><ellipse cx="1765" cy="888.2" rx="11.6" ry="2.4" fill="none" stroke="#C8743E" stroke-width="1.2"/>
<path d="M1746.2 915.6l1.6 5.2M1753.4 919.4l.8 5.4M1766.8 920.8l-.2 5M1778.6 918.6l-1.2 5M1786.4 912.4l-1.8 4.6M1771.8 903.2l.6 3.6" fill="none" stroke="#4A1C08" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>
<path d="M1747.4 915.2l1.6 5.2M1779.8 918.4l-1.2 5M1787.6 912.2l-1.8 4.6" fill="none" stroke="#E4935A" stroke-width=".7" opacity=".5"/>
<path d="M1800.6 887.6C1799.4 885.6 1801.6 883.6 1800.4 881.6C1799.8 880.6 1800.6 879.8 1800.6 879.6" fill="none" stroke="#EDE0C2" stroke-width="1.5" stroke-linecap="round"/>
<ellipse class="sbl-aura" cx="${CHX}" cy="${CHY - 14}" rx="54" ry="62" fill="url(#sbl-aura)"/>
<g class="sbl-fumaca" transform="translate(${CHX} ${CHY})"><path d="M.5-26C-3.6-34 4.4-40 .6-48C-3-56 3.6-62 .2-71C-2.6-79 2.8-86 .8-96" fill="none" stroke="#CDB894" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="14 9 6 12 10 16" opacity=".22"/></g>
<g class="sbl-chama" transform="translate(${CHX} ${CHY})"><g filter="url(#f-fogo)">
<path d="M0 0C-6.4-1.4-7.6-7.6-5.2-13.2C-3.8-16.6-2.6-18.2-2.2-21.6C-1-19.6.4-18.8 1.2-20.6C1.8-22.4 1.4-24.4.8-26.2C3.2-23.8 5.2-19.6 5.6-15.4C7.6-11.4 7.4-2.8 0 0Z" fill="url(#sbl-chama)"/>
<path class="sbl-lingua" d="M0 0C-1.5-2.4-1.3-5.2 0-7.8C1.3-5.2 1.5-2.4 0 0Z" fill="#F59A2A" opacity=".85"/>
<path d="M0-1C-3.2-2-3.8-5.8-2.3-9.6C-1.5-12-.6-13.4 0-15.6C.8-13.4 1.7-12 2.5-9.6C3.8-5.8 3-2 0-1Z" fill="url(#sbl-nucleo)"/></g></g></g>
</svg>`;
  }

  // ---------- textura do papel: estática, desenhada uma vez (papel artesanal de fibra de bananeira) ----------
  // escura (multiply): papel mais grosso, fios longos e curvos, poucas inclusões; clara (screen): papel mais fino.
  // A textura aparece no centro iluminado e some nos cantos; cada painel tem a borda levemente mais escura.
  function textura(cv, cvLuz) {
    for (const k of [cv, cvLuz]) { k.width = PAPEL.w; k.height = PAPEL.h; }
    const c = cv.getContext('2d'), cl = cvLuz.getContext('2d'), r = rng(4);
    for (let i = 0; i < 170; i++) {
      const x = r() * PAPEL.w, y = r() * PAPEL.h, rad = 40 + r() * 230, escura = r() < .55, ctx = escura ? c : cl;
      const cor = escura ? '96,60,26' : '255,244,214', a = escura ? .04 + r() * .08 : .06 + r() * .12;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(${cor},${a.toFixed(3)})`); g.addColorStop(1, `rgba(${cor},0)`);
      ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    c.lineCap = 'round';
    for (let i = 0; i < 2400; i++) {
      const x = r() * PAPEL.w, y = r() * PAPEL.h, L = 14 + r() * r() * 70 + r() * 16, a = (r() - .5) * 1.3, cv2 = (r() - .5) * L * .5;
      const dx = Math.cos(a) * L, dy = Math.sin(a) * L;
      c.strokeStyle = `rgba(${80 + r() * 40 | 0},${52 + r() * 25 | 0},${22 + r() * 15 | 0},${(.03 + r() * .11).toFixed(3)})`;
      c.lineWidth = .4 + r() * .8;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + dx / 2 - Math.sin(a) * cv2, y + dy / 2 + Math.cos(a) * cv2, x + dx, y + dy); c.stroke();
    }
    for (let i = 0; i < 36; i++) { // inclusões: nós de fibra
      c.fillStyle = `rgba(70,42,18,${(.12 + r() * .18).toFixed(3)})`;
      c.beginPath(); c.ellipse(r() * PAPEL.w, r() * PAPEL.h, .8 + r() * 1.8, .6 + r() * 1.1, r() * 3, 0, TAU); c.fill();
    }
    for (const ctx of [c, cl]) {
      ctx.globalCompositeOperation = 'destination-in';
      const g = ctx.createRadialGradient(PAPEL.w * .5, PAPEL.h * .44, 0, PAPEL.w * .5, PAPEL.h * .44, PAPEL.w * .6);
      g.addColorStop(0, '#000'); g.addColorStop(.5, 'rgba(0,0,0,.8)'); g.addColorStop(1, 'rgba(0,0,0,.2)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, PAPEL.w, PAPEL.h);
      ctx.globalCompositeOperation = 'source-over';
    }
    for (const [a, b] of [[0, 569], [603, 1173], [1207, 1776]]) {
      for (const [x0, x1] of [[a, a + 64], [b, b - 64]]) {
        const g = c.createLinearGradient(x0, 0, x1, 0);
        g.addColorStop(0, 'rgba(40,22,8,.16)'); g.addColorStop(1, 'rgba(40,22,8,0)');
        c.fillStyle = g; c.fillRect(Math.min(x0, x1), 0, 64, PAPEL.h);
      }
    }
    const g = c.createLinearGradient(0, 0, 0, PAPEL.h);
    g.addColorStop(0, 'rgba(40,22,8,.18)'); g.addColorStop(.07, 'rgba(40,22,8,0)'); g.addColorStop(.94, 'rgba(40,22,8,0)'); g.addColorStop(1, 'rgba(40,22,8,.2)');
    c.fillStyle = g; c.fillRect(0, 0, PAPEL.w, PAPEL.h);
  }

  function sprite(raio, paradas) {
    const cv = document.createElement('canvas'); cv.width = cv.height = raio * 2;
    const c = cv.getContext('2d'), g = c.createRadialGradient(raio, raio, 0, raio, raio, raio);
    paradas.forEach(([o, cor]) => g.addColorStop(o, cor));
    c.fillStyle = g; c.fillRect(0, 0, raio * 2, raio * 2);
    return cv;
  }

  // ---------- partículas (§11) ----------
  function criarParticulas(cv) {
    const ctx = {};
    for (const k in cv) ctx[k] = cv[k].getContext('2d');
    const halo = sprite(14, [[0, 'rgba(182,242,74,.55)'], [.4, 'rgba(182,242,74,.22)'], [1, 'rgba(182,242,74,0)']]);
    const brasa = sprite(8, [[0, 'rgba(255,220,150,1)'], [.35, 'rgba(255,150,60,.6)'], [1, 'rgba(255,90,31,0)']]);
    const visivel = {};
    function mostrar(k, sim) { if (visivel[k] !== sim) { visivel[k] = sim; cv[k].style.display = sim ? '' : 'none'; if (!sim) ctx[k].clearRect(0, 0, cv[k].width, cv[k].height); } }
    const tg = Math.tan(12 * Math.PI / 180);

    return function desenhar(t, p) {
      const L = p.luz, I = p.particulas;
      // poeira no feixe
      let n = Math.round(120 * (I.poeira || 0) * L.poeira);
      mostrar('poeira', n > 0);
      if (n > 0) {
        const c = ctx.poeira, cx = PAPEL.x + L.hotX / 100 * PAPEL.w, cy = PAPEL.y + L.hotY / 100 * PAPEL.h, rx = 500, ry = 380;
        c.clearRect(0, 0, W, H); c.fillStyle = 'rgb(255,235,190)';
        for (let i = 0; i < n; i++) {
          const h1 = hash(i * 3 + 1), h2 = hash(i * 3 + 2), h3 = hash(i * 3 + 3), a = h3 * TAU, v = 3 + h1 * 5;
          const x = cx - rx + mod(h1 * 2 * rx + Math.cos(a) * v * t, 2 * rx), y = cy - ry + mod(h2 * 2 * ry + Math.sin(a) * v * t, 2 * ry);
          const d = 1 - ((x - cx) / rx) ** 2 - ((y - cy) / ry) ** 2;
          if (d <= 0) continue;
          c.globalAlpha = .25 * Math.min(1, d * 2) * (.55 + .45 * Math.sin(t * (.6 + h2) + h1 * 9));
          const s = 1 + h2;
          c.fillRect(x, y, s, s);
        }
        c.globalAlpha = 1;
      }
      // vaga-lumes
      n = Math.round(40 * (I.vagalumes || 0));
      mostrar('vagalumes', n > 0);
      if (n > 0) {
        const c = ctx.vagalumes; c.clearRect(0, 0, W, H);
        for (let i = 0; i < n; i++) {
          const h = k => hash(i * 11 + k + 500);
          const x = PAPEL.x + 60 + h(1) * (PAPEL.w - 120) + 40 * Math.sin(.13 * t + h(2) * TAU) + 12 * Math.sin(.71 * t + h(3) * TAU);
          const y = PAPEL.y + PAPEL.h * .5 + h(4) * (PAPEL.h * .5 - 50) + 25 * Math.sin(.17 * t + h(5) * TAU);
          const on = .3 + h(6) * .4, per = on + 1 + h(7) * 3, u = mod(t + h(8) * 10, per);
          const b = u < .12 ? u / .12 : u < on ? 1 : u < on + .12 ? 1 - (u - on) / .12 : 0;
          if (b <= 0) continue;
          c.globalAlpha = b; c.drawImage(halo, x - 14, y - 14);
          c.fillStyle = '#E9FF8C'; c.beginPath(); c.arc(x, y, 1.25 + h(9) * .75, 0, TAU); c.fill();
        }
        c.globalAlpha = 1;
      }
      // chuva (sombra no papel: multiply)
      n = Math.round(350 * (I.chuva || 0));
      mostrar('chuva', n > 0);
      if (n > 0) {
        const c = ctx.chuva, tc = I.chuvaInclina ? Math.tan(I.chuvaInclina * Math.PI / 180) : tg; c.clearRect(0, 0, W, H); // chuvaInclina: graus (vento)
        for (const [qtd, cor, larg, l0, l1, sem] of [[Math.round(n * 250 / 350), 'rgba(36,20,10,.16)', 1.2, 12, 20, 900], [n, 'rgba(23,12,5,.33)', 1.4, 22, 34, 1700]]) {
          c.strokeStyle = cor; c.lineWidth = larg; c.beginPath();
          for (let i = 0; i < qtd; i++) {
            const h = k => hash(i * 5 + k + sem), v = 1400 + h(1) * 500, len = l0 + h(2) * (l1 - l0);
            const dist = h(3) * 900 + v * t, y = PAPEL.y - 40 + mod(dist, 900), x = mod(h(4) * 2200 - (y - PAPEL.y) * tc, 2200) - 140;
            c.moveTo(x, y); c.lineTo(x + len * tc, y - len);
          }
          c.stroke();
        }
        c.strokeStyle = 'rgba(23,12,5,.3)'; c.lineWidth = 1; c.beginPath();
        for (let i = 0; i < n; i++) { // respingos no chão
          const h = k => hash(i * 5 + k + 1700), v = 1400 + h(1) * 500, dist = h(3) * 900 + v * t;
          const idade = mod(dist - (800 - PAPEL.y + 40), 900) / v;
          if (idade > .15) continue;
          const x = mod(h(4) * 2200 - (800 - PAPEL.y) * tc, 2200) - 140, r = 1 + 4 * idade / .15;
          c.moveTo(x + r, 800); c.arc(x, 800, r, 0, Math.PI, true);
        }
        c.stroke();
      }
      // brasas da lamparina (canvas próprio, à frente do biombo)
      n = Math.round(12 * (I.brasas || 0) * (L.lamparina == null ? 1 : L.lamparina));
      mostrar('brasas', n > 0);
      if (n > 0) {
        const c = ctx.brasas; c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, LW, LH);
        c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < n; i++) {
          const h = k => hash(i * 13 + k + 3000), vida = 1.5 + h(1) * 1.5, idade = mod(t + h(2) * 9, vida) / vida;
          const x = FX - LX + (h(3) - .5) * 10 + 6 * Math.sin(3 * t + h(4) * TAU) * idade * 2;
          const y = FY - 30 - LY - (40 + h(5) * 40) * idade * vida;
          const s = (1.5 + h(6) * 1.5) * (1 - idade * .5);
          c.globalAlpha = Math.pow(1 - idade, 1.3);
          c.drawImage(brasa, x - s * 2.6, y - s * 2.6, s * 5.2, s * 5.2);
        }
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      }
    };
  }

  // ---------- montagem ----------
  const PARALAXE = { L5: .15, L4: .30, L3: .55, L2: 1, rastros: 1, bonecos: 1, brilho: 1, L1: 1.3, L0: 2 };

  function criar(raiz, op) {
    op = op || {};
    injetarCSS();
    S.grafismos.instalar();
    const el = document.createElement('div');
    el.className = 'sb-palco';
    const luzEl = document.createElement('div');
    luzEl.className = 'sb-luz';
    const novo = (tag, cls, pai) => { const e = document.createElement(tag); e.className = cls; (pai || luzEl).appendChild(e); return e; };
    const papel = novo('div', 'sb-papel');
    const tex = novo('canvas', 'sb-textura sb-mult'), texLuz = novo('canvas', 'sb-textura sb-tela');
    tex.style.opacity = .6; textura(tex, texLuz);
    const cv = { poeira: novo('canvas', 'sb-tela') };
    const camadas = {};
    for (const nome of ['L5', 'L4', 'L3', 'L2', 'rastros', 'bonecos', 'brilho', 'L1']) camadas[nome] = novo('div', 'sb-camada ' + (nome === 'brilho' ? '' : 'sb-mult'));
    cv.chuva = novo('canvas', 'sb-mult');
    cv.vagalumes = novo('canvas', 'sb-tela');
    camadas.L0 = novo('div', 'sb-camada sb-mult');
    const gel = novo('div', 'sb-mult'), vinheta = novo('div', 'sb-vinheta sb-mult');
    // brilho do papel (tremor da chama, relâmpago) por véus de opacidade: só composição, sem filtro por quadro
    const escuro = novo('div', 'sb-escuro'), claro = novo('div', 'sb-claro sb-tela');
    for (const k in camadas) camadas[k].dataset.camada = k;
    el.appendChild(luzEl);
    const tmp = document.createElement('div');
    tmp.innerHTML = moldura(); const mold = tmp.firstChild; mold.setAttribute('class', 'sb-moldura'); el.appendChild(mold);
    const halo = novo('div', 'sb-halo sb-tela', el);
    tmp.innerHTML = lamparina(); const lamp = tmp.firstChild; el.appendChild(lamp);
    const chamaEl = lamp.querySelector('.sbl-chama'), aura = lamp.querySelector('.sbl-aura');
    const lingua = lamp.querySelector('.sbl-lingua'), fumaca = lamp.querySelector('.sbl-fumaca'), fio = fumaca.firstChild;
    cv.brasas = novo('canvas', 'sb-tela', el);
    const sala = novo('div', 'sb-escuro', el); sala.style.opacity = 0; // L.sala 0..1: a sala escurece (moldura e candeia), escuro total
    halo.style.transformOrigin = `${FX}px ${FY}px`;
    for (const k of ['poeira', 'chuva', 'vagalumes']) { cv[k].width = W; cv[k].height = H; }
    Object.assign(cv.brasas.style, { left: LX + 'px', top: LY + 'px', width: LW + 'px', height: LH + 'px' });
    cv.brasas.width = LW * 2; cv.brasas.height = LH * 2;
    raiz.appendChild(el);
    const desenharParticulas = criarParticulas(cv);
    const ultimo = {};
    const escrever = (chave, valor, fn) => { if (ultimo[chave] !== valor) { ultimo[chave] = valor; fn(valor); } };

    const p = {
      raiz: el, camadas,
      luz: Object.assign({}, LUZES[op.luz || 'lamparina']),
      particulas: Object.assign({ poeira: 1, vagalumes: 0, chuva: 0, brasas: 1 }, op.particulas),
      relampagos: [], camera: { x: 0 }, abalo: 0, atores: [],
      irPara(nome, dur, ease) {
        const alvo = LUZES[nome];
        if (!alvo) throw new Error('estado de luz desconhecido: ' + nome);
        if (dur === 0 || !window.gsap) { Object.assign(p.luz, alvo); return null; }
        return window.gsap.to(p.luz, Object.assign({ duration: dur == null ? 3 : dur, ease: ease || 'sine.inOut' }, alvo));
      },
      adicionar(ator) {
        for (const k in ator.camadas) camadas[k].appendChild(ator.camadas[k]);
        p.atores.push(ator); return ator;
      },
      remover(ator) {
        for (const k in ator.camadas) ator.camadas[k].remove();
        p.atores = p.atores.filter(a => a !== ator);
      },
      quadro(t) {
        const L = p.luz;
        let fl = null;
        for (const t0 of p.relampagos) fl = relampago(t - t0) || fl;
        const k = fl ? fl.k : 0, f = chama(t, L.tremor);
        const centro = rgb(L, 'papelCentro', [238, 242, 255], k);
        escrever('papel', `radial-gradient(circle 720px at ${FX - PAPEL.x - 150}px ${FY - PAPEL.y - 60}px,rgba(255,160,70,.13),rgba(255,160,70,0) 70%),` +
          `radial-gradient(ellipse ${L.hotRX.toFixed(2)}% ${L.hotRY.toFixed(2)}% at ${L.hotX.toFixed(2)}% ${L.hotY.toFixed(2)}%,` +
          `${centro} 0%,${centro} 16%,${rgb(L, 'papelMeio', [200, 206, 225], k * .6)} 45%,${rgb(L, 'papelBorda')} 78%,${rgb(L, 'papelCanto')} 100%)`,
          v => { papel.style.background = v; });
        escrever('gel', rgb(L, 'gel'), v => { gel.style.background = v; });
        escrever('gelOp', (L.gelOpac * (1 - k)).toFixed(3), v => { gel.style.opacity = v; });
        escrever('vinheta', L.vinheta.toFixed(3), v => { vinheta.style.opacity = v; });
        escrever('tinta', rgb(L, 'tinta'), v => { luzEl.style.setProperty('--sb-tinta', v); });
        const b = (L.brilho + ((fl ? fl.b : L.brilho) - L.brilho) * k) * f;
        // véus para a variação pequena (tremor); acima de 1,12 (relâmpago, dia claro) o brightness de verdade,
        // que mantém as sombras duras: o véu claro lavaria tudo
        const forte = b > 1.12;
        escrever('escuro', Math.max(0, 1 - b).toFixed(3), v => { escuro.style.opacity = v; });
        escrever('claro', (forte ? 0 : Math.max(0, b - 1) * .9).toFixed(3), v => { claro.style.opacity = v; });
        let filtro = forte ? `brightness(${b.toFixed(2)})` : ''; // saturação e matiz só nos estados que pedem
        if (Math.abs(L.saturacao - 1) > .005) filtro += ` saturate(${L.saturacao.toFixed(2)})`;
        if (Math.abs(L.matiz) > .05) filtro += ` hue-rotate(${L.matiz.toFixed(0)}deg)`;
        escrever('filtro', filtro, v => { luzEl.style.filter = v; });
        const dx = 40 * (f - 1);
        for (const nome in PARALAXE) {
          escrever('px' + nome, ((dx - p.camera.x) * PARALAXE[nome]).toFixed(2), v => { camadas[nome].style.transform = `translate3d(${v}px,0,0)`; });
        }
        const ab = p.abalo ? `translate3d(${(p.abalo * ruido(t * 3, 5)).toFixed(2)}px,${(p.abalo * ruido(t * 3, 9)).toFixed(2)}px,0)` : '';
        escrever('abalo', ab, v => { el.style.transform = v; });
        const lp = L.lamparina == null ? 1 : L.lamparina; // candeia apagada (0) … acesa (1)
        escrever('halo', (Math.max(0, Math.min(1, .8 + 5 * (f - 1))) * Math.min(1, lp)).toFixed(3), v => { halo.style.opacity = v; });
        escrever('haloK', L.halo > 0 && L.halo !== 1 ? `scale(${L.halo.toFixed(3)})` : '', v => { halo.style.transform = v; }); // L.halo: tamanho do halo (1)
        escrever('sala', (L.sala || 0).toFixed(3), v => { sala.style.opacity = v; });
        escrever('tex', (L.textura == null ? 1 : L.textura).toFixed(3), v => { tex.style.opacity = .6 * v; texLuz.style.opacity = v; }); // L.textura: força das manchas (1)
        const sy = 1 + 4 * (f - 1) + .08 * Math.sin(TAU * 2.7 * t + 2 * ruido(t, 3));
        const sk = 4 * Math.sin(TAU * .9 * t + 1.5 * ruido(t, 7)) + (L.inclina || 0); // inclina: graus (alguém passa junto da chama)
        chamaEl.setAttribute('transform', `translate(${CHX} ${CHY}) skewX(${sk.toFixed(2)}) scale(${((1 - (sy - 1) * .3) * lp).toFixed(3)} ${(sy * lp).toFixed(3)})`);
        aura.setAttribute('opacity', ((.75 + 6 * (f - 1)) * Math.min(1, lp)).toFixed(3));
        // a ponta da chama dança solta; a fumaça sobe (traço que corre pelo fio) e balança
        const dl = 7 * Math.sin(TAU * 2.3 * t + 3 * ruido(t, 13)) + 9 * ruido(t * 1.7, 17);
        lingua.setAttribute('transform', `translate(${(.4 + dl * .05).toFixed(2)} ${(-23.6 - 2.4 * (sy - 1) * 10).toFixed(2)}) rotate(${dl.toFixed(1)}) scale(1 ${(.8 + .35 * (.5 + .5 * Math.sin(TAU * 3.7 * t))).toFixed(3)})`);
        fio.setAttribute('stroke-dashoffset', (t * 26 % 67).toFixed(1));
        fumaca.setAttribute('transform', `translate(${CHX} ${CHY}) skewX(${(6 * Math.sin(TAU * .23 * t) + 4 * ruido(t * .5, 19)).toFixed(2)})`);
        desenharParticulas(t, p);
        for (const a of p.atores) a.atualizar(t, p);
      },
    };
    p.quadro(op.t || 0);
    return p;
  }

  S.rng = rng;
  S.hash = hash;
  S.palco = {
    criar, LUZES, PAPEL, W, H, PARALAXE, chama, ruido, relampago, atual: null,
    // ganchos chamados pelo player.js: um palco único em Sombras.palco.atual
    iniciar(el, op) { return (S.palco.atual = criar(el, Object.assign({ luz: 'escuro' }, op))); }, // começa apagado
    quadro(t) { if (S.palco.atual) S.palco.atual.quadro(t); },
  };
})();
