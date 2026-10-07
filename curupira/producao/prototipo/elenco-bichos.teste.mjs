// node producao/prototipo/elenco-bichos.teste.mjs — monta todos os bichos fora do navegador e confere o que o rig exige:
// paths de formas só com M/L/C/Q/Z absolutos e pares de números (o rig mede a caixa assim), ids únicos, pais e varetas
// existentes, ciclos de marcha finitos e o auto de cada bicho rodando.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
globalThis.window = { Sombras: {} };
for (const f of ['palco', 'bonecos', 'elenco-bichos']) require(`../../js/${f}.js`);
const S = window.Sombras, Bi = S.bichos;

const casos = { cachorro: [{}, { riscos: true }], onca: [{}], veada: [{}], filhote: [{}], queixada: [{}, { semente: 5, caititu: true }],
  curupiraMontado: [{ pena: 1, colar: 1, fumo: 1 }], arara: [{}], bugio: [{}, { galho: false }], tatu: [{}], urutau: [{}, { toco: false }] };
const falso = def => ({ def, pose: Object.assign({ x: 0, y: 0, escala: 1, dir: 1, a: {}, s: {}, o: {} }, def.pose), extra: { a: {}, s: {}, o: {}, dy: 0, boca: 0, furia: 0 } });
const finito = b => Object.values(b.extra.a).concat(Object.values(b.extra.s), [b.extra.dy]).every(Number.isFinite);
let n = 0;
for (const [nome, ops] of Object.entries(casos)) for (const op of ops) {
  const def = Bi.defs[nome](op), ids = new Set();
  for (const p of def.partes) {
    assert(!ids.has(p.id), `${nome}: id repetido ${p.id}`); ids.add(p.id);
    for (const f of p.formas) {
      assert.match(f.d, /^[MLCQZ0-9.\-\s]+$/, `${nome}.${p.id}: path fora do formato`);
      assert.equal(f.d.match(/-?(?:\d+\.?\d*|\.\d+)/g).length % 2, 0, `${nome}.${p.id}: números ímpares`);
    }
  }
  for (const p of def.partes) assert(!p.pai || ids.has(p.pai), `${nome}.${p.id}: pai ${p.pai} não existe`);
  for (const v of def.varetas) assert(ids.has(v.parte), `${nome}: vareta em ${v.parte}`);
  const b = falso(def);
  for (const t of [0, .37, 1.3]) { b.extra = { a: {}, s: {}, o: {}, dy: 0, boca: 0, furia: 0 }; def.auto(b, t); assert(finito(b), `${nome}: auto não finito`); }
  if (def.cfg && def.cfg.perna) for (const m of ['passo', 'trote', 'galope', 'salto']) {
    const { ciclo, passo } = Bi.andadura(b, m);
    assert(passo > 0 && Number.isFinite(passo), `${nome}: passo de ${m}`);
    for (let f = 0; f < 1; f += .125) { b.extra = { a: {}, s: {}, o: {}, dy: 0, boca: 0, furia: 0 }; ciclo(b, f, { pernas: 1 }); assert(finito(b) && Object.values(b.extra.a).every(a => Math.abs(a) < 180), `${nome}: ${m} em ${f}`); }
  }
  n++;
}
const cur = S.bonecos.defs.curupira().partes.map(p => p.id), mont = Bi.defs.curupiraMontado({}).partes.map(p => p.id);
for (const id of cur) assert(mont.includes(id), `montado sem a peça ${id} do Curupira`);
console.log(`ok: ${n} bichos montados e conferidos`);
