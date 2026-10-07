/* grafismos.js — Sombras.grafismos: motivos de vazado e defs SVG comuns (guia de estilo §4).
 *
 *   Sombras.grafismos.instalar()          injeta (uma vez) um <svg> oculto com todas as defs no documento;
 *                                         depois disso url(#g-losango), <use href="#pegada"> etc. funcionam
 *                                         em qualquer SVG da página.
 *   Sombras.grafismos.DEFS                string com as defs (para SVGs autônomos: data-URL, máscaras CSS).
 *   Sombras.grafismos.MOTIVOS             ids dos 12 motivos: g-losango, g-cobra, g-grega, g-degrau, g-espinha,
 *                                         g-jabuti, g-roseta, g-voluta, g-serra, g-ponto, g-trancado, g-agua.
 *   Sombras.grafismos.variante(id, {escala, cor, novoId}) → {id, svg}
 *                                         <pattern> derivado: motivo ampliado (nunca < 1) e/ou em outra cor
 *                                         (pintura em vez de furo). O svg deve entrar no <defs> de quem usa.
 *   Sombras.grafismos.manchasURL()        PNG (data-URL) de manchas de tingimento do couro, gerado uma vez.
 *
 * Motivos são pretos (furo, quando usados dentro de <mask>; tinta, quando usados como preenchimento).
 * Regra física: todo furo é uma ilha (pontes de couro ≥ 1,6 px).
 */
(function () {
  'use strict';
  const S = window.Sombras = window.Sombras || {};

  // Conteúdo dos motivos (preto = furo). Transcrito do guia §4.1; a roseta foi desdobrada sem <use>.
  const ROSETA = '<ellipse cx="9" cy="3.5" rx="3.4" ry="2"/><ellipse cx="13.5" cy="8.5" rx="2" ry="3.2"/>' +
    '<ellipse cx="8.5" cy="12.6" rx="3.2" ry="1.9"/><ellipse cx="4.6" cy="7.8" rx="1.9" ry="3"/>';
  const MOTIVO = {
    'g-losango': [20, 20, '<path d="M10 2 17 10 10 18 3 10ZM0-8 7 0 0 8-7 0ZM20-8 27 0 20 8 13 0ZM0 12 7 20 0 28-7 20ZM20 12 27 20 20 28 13 20Z"/>'],
    'g-cobra': [24, 24, '<path d="M12 2 22 12 12 22 2 12Z" fill="none" stroke="#000" stroke-width="2.6" stroke-dasharray="11.14 3" stroke-dashoffset="-1.5"/>' +
      '<circle cx="12" cy="12" r="2.2"/><circle cx="0" cy="0" r="1.5"/><circle cx="24" cy="0" r="1.5"/><circle cx="0" cy="24" r="1.5"/><circle cx="24" cy="24" r="1.5"/>'],
    'g-grega': [18, 18, '<path d="M3 15V3H15V12H8V8H11" fill="none" stroke="#000" stroke-width="2.4" stroke-linecap="square"/>'],
    'g-degrau': [16, 16, '<path d="M1 13H5V9H9V5H13V1" fill="none" stroke="#000" stroke-width="2.2"/>'],
    'g-espinha': [16, 10, '<path d="M2 2 8 7 14 2" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'],
    'g-jabuti': [14.9, 25.8, '<path d="M0-6.5l5.63 3.25v6.5L0 6.5l-5.63-3.25v-6.5zM14.9-6.5l5.63 3.25v6.5L14.9 6.5l-5.63-3.25v-6.5zM7.45 6.4l5.63 3.25v6.5L7.45 19.4l-5.63-3.25v-6.5zM0 19.3l5.63 3.25v6.5L0 32.3l-5.63-3.25v-6.5zM14.9 19.3l5.63 3.25v6.5L14.9 32.3l-5.63-3.25v-6.5z"/>'],
    'g-roseta': [36, 32, ROSETA + '<g transform="translate(18 16)">' + ROSETA + '</g><circle cx="27" cy="6" r="2"/><circle cx="9" cy="24" r="2.2"/>'],
    'g-voluta': [32, 20, '<path d="M3 17C3 8 12 3 18 6C23 9 20 15 15 13" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round"/><circle cx="27" cy="10" r="1.8"/>'],
    'g-serra': [14, 12, '<path d="M1.5 11 7 2 12.5 11Z"/>'],
    'g-ponto': [9, 9, '<circle cx="2.5" cy="2.5" r="1.5"/><circle cx="7" cy="7" r="1.5"/>'],
    'g-trancado': [16, 16, '<rect x="1" y="1.6" width="6" height="1.6" rx=".8"/><rect x="1" y="4.8" width="6" height="1.6" rx=".8"/>' +
      '<rect x="9.6" y="1" width="1.6" height="6" rx=".8"/><rect x="12.8" y="1" width="1.6" height="6" rx=".8"/>' +
      '<rect x="1.6" y="9" width="1.6" height="6" rx=".8"/><rect x="4.8" y="9" width="1.6" height="6" rx=".8"/>' +
      '<rect x="9" y="9.6" width="6" height="1.6" rx=".8"/><rect x="9" y="12.8" width="6" height="1.6" rx=".8"/>'],
    'g-agua': [22, 12, '<path d="M2 7Q6.5 2 11 7T20 7" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round"/>'],
  };

  function pattern(id, w, h, conteudo, escala, cor) {
    if (cor) conteudo = '<g fill="' + cor + '">' + conteudo.replace(/stroke="#000"/g, 'stroke="' + cor + '"') + '</g>';
    const tr = escala && escala !== 1 ? ' patternTransform="scale(' + escala + ')"' : '';
    return '<pattern id="' + id + '" width="' + w + '" height="' + h + '" patternUnits="userSpaceOnUse"' + tr + '>' + conteudo + '</pattern>';
  }

  const EXTRAS = [
    // articulação: 4 setores vazados em volta do rebite (desenhar no pivô, nas duas peças)
    '<g id="junta-furos"><path id="setor" d="M3.38 1.23L7.52 2.74A8 8 0 0 1 2.74 7.52L1.23 3.38A3.6 3.6 0 0 0 3.38 1.23Z"/>' +
      '<use href="#setor" transform="rotate(90)"/><use href="#setor" transform="rotate(180)"/><use href="#setor" transform="rotate(270)"/></g>',
    '<g id="rebite"><circle r="3.2" fill="#2A1A0E"/><circle cx="-.8" cy="-.8" r="1.1" fill="#A8814B"/></g>',
    // pegada de sola real (pé apontando para +x, 34 px, lado de dentro em −y): calcanhar redondo, arco estreito,
    // planta larga, dedão grande colado e 4 dedos menores em arco. A do Curupira é espelhada (dedos para trás)
    '<g id="pegada"><path d="M0 1.2C0-2.4 2.2-4.1 5-4.1C7.6-4.1 9.4-3.3 11-2.4C13-1.4 15-1.7 17.4-3.7C19.8-5.7 22.8-6.9 25-5.9C27-5 27.3-1.8 26.9 1.2C26.5 4 25 6.3 22.2 6.6C17.4 7 12.4 6.4 8.4 6C4.4 5.6 0 4.8 0 1.2Z"/>' +
      '<ellipse cx="30.6" cy="-4" rx="3.3" ry="2.6"/><circle cx="31" cy=".7" r="1.75"/><circle cx="30.2" cy="3.7" r="1.55"/>' +
      '<circle cx="28.7" cy="6.3" r="1.35"/><circle cx="26.6" cy="8.3" r="1.15"/></g>',
    '<filter id="f-couro" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency=".035 .06" numOctaves="3" seed="7" result="ruido"/>' +
      '<feColorMatrix in="ruido" type="matrix" result="manchas" values="0 0 0 0 .10  0 0 0 0 .05  0 0 0 0 .02  .9 0 0 0 -.3"/>' +
      '<feComposite in="manchas" in2="SourceAlpha" operator="in" result="m"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="m"/></feMerge></filter>',
    '<filter id="f-xilo" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="2" result="r"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="r" scale="3.5" xChannelSelector="R" yChannelSelector="G" result="d"/>' +
      '<feTurbulence type="fractalNoise" baseFrequency=".03 .7" numOctaves="2" seed="5" result="g"/>' +
      '<feColorMatrix in="g" type="matrix" result="falhas" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -7 0 0 0 6.1"/>' +
      '<feComposite in="d" in2="falhas" operator="in"/></filter>',
    '<filter id="f-fogo" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b"/>' +
      '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>',
  ];

  const MOTIVOS = Object.keys(MOTIVO);
  const DEFS = MOTIVOS.map(id => pattern(id, MOTIVO[id][0], MOTIVO[id][1], MOTIVO[id][2])).join('') + EXTRAS.join('');

  function variante(id, op) {
    op = op || {};
    const m = MOTIVO[id];
    if (!m) throw new Error('motivo desconhecido: ' + id);
    const escala = Math.max(1, op.escala || 1);
    const novoId = op.novoId || id + (escala !== 1 ? '-x' + String(escala).replace('.', '_') : '') + (op.cor ? '-' + op.cor.replace(/[^0-9a-z]/gi, '') : '');
    return { id: novoId, svg: pattern(novoId, m[0], m[1], m[2], escala, op.cor) };
  }

  let manchas = null;
  function manchasURL() {
    if (manchas) return manchas;
    // ruído de valor em 2 oitavas, tingido de marrom, com alfa baixo: manchas do tingimento do couro
    const n = 128, c = document.createElement('canvas');
    c.width = c.height = n;
    const ctx = c.getContext('2d'), img = ctx.createImageData(n, n);
    const rnd = S.rng ? S.rng(7) : Math.random;
    const grade = (g) => { const a = []; for (let i = 0; i < g * g; i++) a.push(rnd()); return a; };
    const g1 = grade(8), g2 = grade(32);
    const amostra = (gr, g, x, y) => {
      const fx = x / n * g, fy = y / n * g, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const v = (i, j) => gr[((j % g) * g) + (i % g)];
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      return (v(ix, iy) * (1 - sx) + v(ix + 1, iy) * sx) * (1 - sy) + (v(ix, iy + 1) * (1 - sx) + v(ix + 1, iy + 1) * sx) * sy;
    };
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = amostra(g1, 8, x, y) * .7 + amostra(g2, 32, x, y) * .3;
      const k = (y * n + x) * 4;
      img.data[k] = 40; img.data[k + 1] = 20; img.data[k + 2] = 8;
      img.data[k + 3] = Math.max(0, Math.min(255, (v - .45) * 2.2 * 255));
    }
    ctx.putImageData(img, 0, 0);
    return (manchas = c.toDataURL());
  }

  function instalar() {
    if (document.getElementById('sombras-defs')) return;
    const div = document.createElement('div');
    div.innerHTML = '<svg id="sombras-defs" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' +
      DEFS + '<pattern id="g-manchas" width="128" height="128" patternUnits="userSpaceOnUse"><image href="' + manchasURL() +
      '" width="128" height="128"/></pattern></defs></svg>';
    document.body.prepend(div.firstChild);
  }

  S.grafismos = { DEFS, MOTIVOS, variante, instalar, manchasURL };
})();
