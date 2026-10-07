// Captura quadros da página em tempos específicos: node capturar.mjs <url> <saida_dir> <t1,t2,...> [largura] [altura]
import puppeteer from 'puppeteer-core';
const [url, out = '.', times = '0', w = '1600', h = '900'] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'],
});
const page = await browser.newPage();
page.setDefaultNavigationTimeout(0); page.setDefaultTimeout(0);
await page.setViewport({ width: +w, height: +h });
const erros = [];
page.on('console', m => { if (['error', 'warning'].includes(m.type())) erros.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => erros.push(`[pageerror] ${e.message}`));
for (const t of times.split(',')) {
  const u = new URL(url); u.searchParams.set('t', t); u.searchParams.set('pausa', '1');
  await page.goto(u.href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts?.ready);
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: `${out}/quadro_${String(t).padStart(6, '0')}.png` });
}
console.log(erros.length ? erros.join('\n') : 'sem erros no console');
await browser.close();
