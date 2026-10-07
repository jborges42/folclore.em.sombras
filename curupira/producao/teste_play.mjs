// Toca o espetáculo com áudio real e confere sincronia, seek e FPS.
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new',
  args: ['--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); p.setDefaultTimeout(0);
await p.setViewport({ width: 1600, height: 900 });
const erros = []; p.on('pageerror', e => erros.push(e.message));
p.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
await p.goto('file:///Users/joaovitorborgesdasilvamatias/Documents/dev/folclore.em.sombras/curupira/index.html', { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 1500));
await p.click('#acender');
const medir = async rot => {
  const fps = await p.evaluate(() => new Promise(r => { let n = 0, pior = 0, ult = performance.now(); const t0 = ult;
    const f = now => { pior = Math.max(pior, now - ult); ult = now; n++; if (now - t0 < 3000) requestAnimationFrame(f); else r({ fps: n / 3, pior: Math.round(pior) }); }; requestAnimationFrame(f); }));
  const s = await p.evaluate(() => ({ anim: Sombras.tempo(), audio: document.querySelector('#audio').currentTime, pausado: document.querySelector('#audio').paused }));
  console.log(`${rot}: anim ${s.anim.toFixed(2)} | áudio ${s.audio.toFixed(2)} | dif ${(s.anim - s.audio).toFixed(3)} s | ${s.pausado ? 'PAUSADO' : 'tocando'} | ${fps.fps.toFixed(0)} fps (pior quadro ${fps.pior} ms)`);
};
await medir('início');
for (const t of [100, 190, 300, 380, 470, 530]) {
  await p.evaluate(t => { const a = document.querySelector('#audio'); a.currentTime = t; }, t);
  await new Promise(r => setTimeout(r, 1500));
  await medir(`seek ${t}s`);
  await p.screenshot({ path: `/Users/joaovitorborgesdasilvamatias/Documents/dev/folclore.em.sombras/curupira/producao/prototipo/play_${t}.png` });
}
console.log(erros.length ? erros.slice(0, 10).join('\n') : 'sem erros');
await b.close();
