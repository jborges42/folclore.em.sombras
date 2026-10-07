// Confere js/xilogravuras.js sem navegador: node producao/checar_xilogravuras.cjs
// Cada capítulo do roteiro (e a capa da abertura) tem gravura própria, sem texto e sem coordenada inválida.
const assert = require('node:assert');
const path = require('node:path');
global.window = {};
require(path.join(__dirname, '..', 'js', 'xilogravuras.js'));
const roteiro = require(path.join(__dirname, '..', 'roteiro.json'));
const ids = ['abertura', ...roteiro.cenas.filter(c => c.capitulo).map(c => c.id)];
for (const id of ids) {
  const svg = window.Sombras.xilogravura(id, 'dia');
  assert.match(svg, /^<svg class="xilo" viewBox="0 0 440 300"/, id);
  assert.doesNotMatch(svg, /NaN|Infinity|undefined|<text/, id);
  console.log(id.padEnd(10), (svg.length / 1024).toFixed(0).padStart(4), 'KB');
}
assert.strictEqual(window.Sombras.xilogravura('aviso', 'entardecer'), '');  // sem gravura: o player usa a genérica
console.log('ok');
