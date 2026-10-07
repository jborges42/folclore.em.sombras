import puppeteer from 'puppeteer-core';
const url = 'file:///Users/joaovitorborgesdasilvamatias/Documents/dev/folclore.em.sombras/curupira/index.html';
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--allow-file-access-from-files'] });
const p = await b.newPage(); p.setDefaultTimeout(0); p.setDefaultNavigationTimeout(0);
await p.setViewport({ width: 1600, height: 900 });
const msgs = [];
p.on('console', m => { if (['error', 'warning'].includes(m.type())) msgs.push(`[${m.type()}] ${m.text()}`); });
p.on('pageerror', e => msgs.push('[pageerror] ' + e.message));
await p.goto(url + '?t=1&pausa=1', { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 1500));
const info = await p.evaluate(() => {
  const L = window.LINHA_DO_TEMPO, reg = Object.keys(Sombras.cenas.construtores);
  return { cenas: L.cenas.map(c => c.id), registradas: reg, faltando: L.cenas.map(c => c.id).filter(i => !reg.includes(i)), dur: Sombras.mestre.duration(), L: L.duracao };
});
console.log(JSON.stringify(info));
// percorre o espetáculo inteiro pelo mestre, em ordem e de trás para frente
const erros2 = await p.evaluate(async () => {
  const out = []; const ts = [];
  for (let t = 0; t < LINHA_DO_TEMPO.duracao; t += 2) ts.push(t);
  for (const t of [...ts, ...ts.slice().reverse()]) { try { Sombras.mestre.time(t); Sombras.palco?.quadro?.(t, 0); } catch (e) { out.push(t + ': ' + e.message); } }
  return out.slice(0, 20);
});
console.log('erros no percurso:', JSON.stringify(erros2));
console.log([...new Set(msgs)].filter(m => !m.includes('ERR_FILE_NOT_FOUND')).slice(0, 30).join('\n') || 'console limpo');
await b.close();
