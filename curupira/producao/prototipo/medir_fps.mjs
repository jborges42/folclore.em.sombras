// FPS médio do quadro animado: node medir_fps.mjs [url] [segundos=3] [largura=1600] [altura=900] [--livre]
// (puppeteer-core vem de ../node_modules; Chrome do sistema; meta ≥ 50 fps)
// --livre desliga o vsync e o limite de quadros: mede quantos quadros por segundo a página aguenta (folga),
// útil quando a máquina está carregada e o compositor cai para 30 Hz mesmo numa página vazia.
import { createRequire } from 'module';
const require = createRequire(new URL('../package.json', import.meta.url));
const puppeteer = require('puppeteer-core');
const aqui = new URL('.', import.meta.url).pathname;
const livre = process.argv.includes('--livre');
const [url = 'file://' + aqui + 'quadro.html', seg = '3', w = '1600', h = '900'] = process.argv.slice(2).filter(a => a !== '--livre');
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--allow-file-access-from-files', '--enable-gpu-rasterization', '--ignore-gpu-blocklist',
    ...(livre ? ['--disable-gpu-vsync', '--disable-frame-rate-limit'] : [])],
});
const page = await browser.newPage();
await page.setViewport({ width: +w, height: +h });
const erros = [];
page.on('pageerror', e => erros.push(e.message));
await page.goto(url, { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 1500)); // aquecimento (decodificação das máscaras do cenário e dos bonecos)
const r = await page.evaluate(s => new Promise(res => {
  const ts = [];
  const ini = performance.now();
  (function f(t) { ts.push(t); if (t - ini < s * 1000) requestAnimationFrame(f); else res(ts); })(ini);
}), +seg);
const dts = r.slice(1).map((t, i) => t - r[i]).slice(1);
const media = dts.reduce((a, b) => a + b, 0) / dts.length;
const pior = [...dts].sort((a, b) => b - a);
const gpu = await page.evaluate(() => { const c = document.createElement('canvas').getContext('webgl'); const d = c && c.getExtension('WEBGL_debug_renderer_info'); return d ? c.getParameter(d.UNMASKED_RENDERER_WEBGL) : '?'; });
console.log(JSON.stringify({ modo: livre ? 'livre' : 'vsync', fps: +(1000 / media).toFixed(1), quadros: dts.length, p95_ms: +pior[Math.floor(dts.length * .05)].toFixed(1), pior_ms: +pior[0].toFixed(1), gpu, erros }));
await browser.close();
