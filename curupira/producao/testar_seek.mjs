// Teste de seek: o mesmo instante, chegando de antes e de depois, precisa dar o mesmo quadro.
// node testar_seek.mjs <url da página> <t1,t2,...> [de_depois=9999] [pasta para os quadros que diferirem]
// Para cada t compara: direto (?t=t&pausa=1), vindo de 0 (&de=0) e vindo de depois (&de=de_depois).
// Renderiza sem GPU: com GPU, até duas cargas iguais diferem em alguns pixels (±2 níveis).
// Em páginas que aceitam &passo (prototipo/kit-demo.html), "vindo de 0" percorre quadro a quadro, como na reprodução.
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';
const [url, tempos, depois = '9999', pasta] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--allow-file-access-from-files', '--disable-gpu'], // sem GPU a rasterização é determinística
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
page.setDefaultNavigationTimeout(180000);
const erros = new Set();
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FILE_NOT_FOUND')) erros.add(m.text()); });
page.on('pageerror', e => erros.add(e.message));
async function quadro(t, extra) {
  const u = new URL(url);
  u.searchParams.set('t', t); u.searchParams.set('pausa', '1');
  for (const [k, v] of Object.entries(extra)) u.searchParams.set(k, v);
  await page.goto(u.href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts?.ready);
  await new Promise(r => setTimeout(r, 900));
  return page.screenshot({ encoding: 'base64' });
}
async function diferenca(a, b) { // pixels diferentes e a caixa onde estão
  if (a === b) return null;
  return page.evaluate(async (a, b) => {
    const px = async s => { const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode();
      const c = new OffscreenCanvas(im.width, im.height), g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height); };
    const [p, q] = [await px(a), await px(b)];
    let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let i = 0; i < p.data.length; i += 4) {
      if (Math.abs(p.data[i] - q.data[i]) + Math.abs(p.data[i + 1] - q.data[i + 1]) + Math.abs(p.data[i + 2] - q.data[i + 2]) === 0) continue;
      const k = i / 4, x = k % p.width, y = (k / p.width) | 0;
      n++; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    return n ? { pixels: n, caixa: [x0, y0, x1, y1] } : null;
  }, a, b);
}
let falhas = 0;
for (const t of tempos.split(',')) {
  const direto = await quadro(t, {});
  const antes = await quadro(t, { de: 0, passo: 1 / 30 });
  const depoisQ = await quadro(t, { de: depois });
  const [da, dd] = [await diferenca(direto, antes), await diferenca(direto, depoisQ)];
  if (da || dd) falhas++;
  if ((da || dd) && pasta) for (const [k, v] of [['direto', direto], ['antes', antes], ['depois', depoisQ]]) writeFileSync(`${pasta}/seek_${t}_${k}.png`, Buffer.from(v, 'base64'));
  console.log(`t ${t}: vindo de antes ${da ? JSON.stringify(da) : 'idêntico'} · vindo de depois ${dd ? JSON.stringify(dd) : 'idêntico'}`);
}
console.log(falhas ? `${falhas} instante(s) com diferença` : 'seek ok: todos os quadros idênticos');
console.log(erros.size ? [...erros].join('\n') : 'sem erros no console');
await browser.close();
process.exit(falhas ? 1 : 0);
