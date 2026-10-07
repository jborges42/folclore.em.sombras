// Folha de contato de uma cena: um quadro no meio de cada beat (mais início e fim), em grade, numa só imagem.
// node folha_de_contato.mjs <cenaId> <saida.png> [colunas=4] [quadros extras: t1,t2,...]
// Usa producao/linha-do-tempo.json e abre ../index.html?t=..&pausa=1 (imprime erros do console).
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const [cenaId, saida, colunas = '4', extras = ''] = process.argv.slice(2);
const linha = JSON.parse(readFileSync(path.join(aqui, 'linha-do-tempo.json'), 'utf8'));
const cena = linha.cenas.find(c => c.id === cenaId);
if (!cena) throw new Error(`cena desconhecida: ${cenaId}`);

const marcos = [{ t: cena.inicio + 0.6, rotulo: 'início' }];
if (cena.cartela) marcos.push({ t: cena.cartela.fim + 0.3, rotulo: 'pós-cartela' });
for (const b of cena.beats) marcos.push({ t: (b.inicio + b.fim) / 2, rotulo: b.id + (b.papel ? ` (${b.papel})` : ' (pausa)') });
for (const t of extras.split(',').filter(Boolean)) marcos.push({ t: +t, rotulo: 'extra' });
marcos.push({ t: cena.fim - 0.2, rotulo: 'fim' });
marcos.sort((a, b) => a.t - b.t);

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--allow-file-access-from-files'],
});
const page = await browser.newPage();
page.setDefaultNavigationTimeout(0); page.setDefaultTimeout(0);
await page.setViewport({ width: 960, height: 540 });
const erros = new Set();
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FILE_NOT_FOUND')) erros.add(m.text()); });
page.on('pageerror', e => erros.add(e.message));
const imgs = [];
for (const m of marcos) {
  await page.goto(`file://${path.join(aqui, '..', 'index.html')}?t=${m.t.toFixed(2)}&pausa=1`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts?.ready);
  await new Promise(r => setTimeout(r, 600));
  imgs.push({ ...m, src: 'data:image/png;base64,' + await page.screenshot({ encoding: 'base64' }) });
}
const cols = +colunas, larg = 480;
await page.setViewport({ width: cols * (larg + 8) + 8, height: 400 });
await page.setContent(`<body style="margin:0;padding:4px;background:#111;font:13px Menlo,monospace;color:#ddd;display:grid;grid-template-columns:repeat(${cols},${larg}px);gap:8px">
  ${imgs.map(i => `<figure style="margin:0"><img src="${i.src}" style="width:${larg}px;display:block"><figcaption>${i.t.toFixed(1)} s · ${i.rotulo}</figcaption></figure>`).join('')}</body>`);
await page.screenshot({ path: saida, fullPage: true });
await browser.close();
console.log(`${imgs.length} quadros → ${saida}`);
console.log(erros.size ? [...erros].join('\n') : 'sem erros no console');
