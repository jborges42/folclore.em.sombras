/* Folclore em Sombras · Curupira — player.js (último script da página; monta tudo no DOMContentLoaded)
 *
 * Relógio mestre, timeline mestre, legendas, cartelas de capítulo, créditos, tela inicial e controles.
 *
 * CONTRATO COM OS COREÓGRAFOS ────────────────────────────────────────────────────────────────────────
 *   Sombras.cenas.registrar(idCena, construtor)
 *     Já existe desde o <head> do index.html: pode ser chamado direto no carregamento de js/cenas/*.js.
 *     O player chama construtor(tl, ctx) para cada cena da LINHA_DO_TEMPO que tiver construtor:
 *       tl  → gsap.timeline() local da cena; tempo 0 = cena.inicio. O player a coloca na mestre em cena.inicio.
 *       ctx → { cena, dur,
 *               t(beatId)    início do beat, relativo à cena (s)
 *               tf(beatId)   fim do beat, relativo à cena (s)
 *               beat(beatId) objeto do beat {id, tipo, papel, texto, inicio, fim, sfx}
 *               sfx(som)     [tempos relativos à cena] daquela etiqueta de som }
 *     Beat inexistente lança erro: a cena é descartada e o erro vai para o console, as outras seguem.
 *     O espectador pode pular para qualquer instante: anime só pela tl (nada de setTimeout, gsap.to solto
 *     ou estado que dependa de ter passado pelo instante anterior).
 *   Sombras.mestre         gsap.timeline({paused:true}) com tudo; o player faz mestre.time(relógio) a cada quadro.
 *   Sombras.tempo()        segundos atuais do espetáculo.
 *   Sombras.T(beatId)      início absoluto do beat.
 *   Sombras.cartela(rotulo, titulo, luz, cenaId) → elemento .cartela (oculto) já no palco, com .folheto dentro;
 *                          o player usa nos capítulos; a abertura pode usar como capa do folheto (§10.3).
 *                          A gravura vem de Sombras.xilogravura(cenaId, luz) (js/xilogravuras.js); sem ela, a genérica.
 *   Ganchos opcionais do palco (js/palco.js):
 *     Sombras.palco.iniciar(elPalco)   uma vez, antes de montar as cenas. elPalco = div 1920×1080 lógicos
 *                                      (o player cuida da escala). O carimbo da cartela treme elPalco em x.
 *     Sombras.palco.quadro(tempo, dt)  a cada quadro; dt = avanço do relógio (0 em pausa e em saltos).
 *
 * URL: ?t=SEG&pausa=1 congela em SEG, sem áudio e sem tela inicial (capturas); ?t=SEG começa dali;
 *      ?debug=1 mostra tempo, cena e beat. &de=SEG passa antes por SEG (producao/testar_seek.mjs).
 */
(() => {
  const S = window.Sombras = window.Sombras || {};
  const NOMES = { tiao: 'Tião', ze: 'Zé', vo: 'Vó', curupira: 'Curupira' };
  const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const $ = s => document.querySelector(s);
  const hora = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const el = (tag, cls, texto) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (texto != null) e.textContent = texto;
    return e;
  };

  /* ── Cartela de cordel: moldura entalhada e xilogravura (estilo.md §10.3) ── */
  const folha = (r, s) =>
    `<g transform="rotate(${r}) scale(${s})"><path class="tinta" d="M0 0C30-34 100-38 150 0C100 38 30 34 0 0Z"/>` +
    '<path class="goiva" stroke-width="2" d="M0 0C30-34 100-38 150 0C100 38 30 34 0 0ZM8 0H140M40-13 52 0 40 13M75-17 87 0 75 17M108-13 120 0 108 13"/></g>';
  const touceira = '<g transform="translate(-12 302)">' + folha(-80, 1.25) + folha(-55, 1.5) + folha(-28, 1.3) + folha(-8, .9) + '</g>';
  // Pegadas do Curupira: o rastro vai para a direita, os dedos apontam para a esquerda.
  const pegada = (x, y) =>
    `<ellipse class="tinta" cx="${x}" cy="${y}" rx="36" ry="17"/><use href="#pegada" class="branco" transform="translate(${x + 25} ${y}) scale(-1.5 1.5)"/>`;

  function xilogravura(luz) {
    const noite = luz === 'noite' || luz === 'tempestade';
    let ceu = '', astro = '';
    for (let y = 14; y < 200; y += 11) ceu += `M16 ${y}H424`;
    if (noite) {
      astro = '<circle class="tinta" cx="220" cy="104" r="66"/><circle class="branco" cx="220" cy="104" r="42"/>' +
        '<circle class="tinta" cx="238" cy="92" r="38"/>';
      for (const [x, y] of [[70, 40], [120, 92], [330, 52], [370, 120], [300, 168]])
        astro += `<circle class="tinta" cx="${x}" cy="${y}" r="9"/><path class="branco" d="M${x} ${y - 6}l3 6-3 6-3-6z"/>`;
    } else {
      astro = '<circle class="tinta" cx="220" cy="118" r="86"/>';
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8, p = (r, d) => `${(220 + r * Math.cos(a + d)).toFixed(1)} ${(118 + r * Math.sin(a + d)).toFixed(1)}`;
        astro += `<path class="branco" d="M${p(80, 0)}L${p(52, .13)}L${p(52, -.13)}Z"/>`;
      }
      astro += '<circle class="branco" cx="220" cy="118" r="44"/><circle cx="220" cy="118" r="33" fill="none" stroke="#170C05" stroke-width="3"/>';
    }
    let chao = '';
    for (let y = 222; y < 300; y += 13) chao += `M10 ${y}q24-7 48 0t48 0t48 0t48 0t48 0t48 0t48 0t48 0t48 0`;
    return `<svg class="xilo" viewBox="0 0 440 300" aria-hidden="true"><g filter="url(#f-xilo)">
      <rect class="tinta" width="440" height="300"/><path class="goiva" stroke-width="2.6" d="${ceu}"/>${astro}
      <path class="tinta" d="M0 206Q110 186 220 200T440 204V300H0Z"/><path class="goiva" stroke-width="2.4" d="${chao}"/>
      ${pegada(162, 252)}${pegada(222, 276)}${pegada(282, 252)}
      ${touceira}<g transform="translate(440 0) scale(-1 1)">${touceira}</g>
    </g></svg>`;
  }

  const FUNDO_FOLHETO = `<svg class="fundo" viewBox="0 0 520 740" aria-hidden="true">
    <rect width="520" height="740" filter="url(#f-papel)" opacity=".35"/>
    <g filter="url(#f-xilo)">
      <path class="tinta" fill-rule="evenodd" d="M14 14H506V726H14ZM24 24V716H496V24Z"/>
      <rect x="31" y="31" width="458" height="678" fill="none" stroke="#170C05" stroke-width="2"/>
      <rect x="42" y="36" width="434" height="12" fill="url(#g-serra)"/>
      <rect x="42" y="36" width="434" height="12" fill="url(#g-serra)" transform="matrix(1 0 0 -1 0 740)"/>
      <rect x="40" y="660" width="440" height="20" fill="url(#g-losango)"/>
    </g></svg>`;

  const elCartelas = $('#cartelas');
  S.cartela = (rotulo, titulo, luz, cenaId) => {
    const c = el('div', 'cartela');
    c.innerHTML = `<div class="veu"></div><figure class="folheto">${FUNDO_FOLHETO}<p class="rotulo"></p><h2><span></span></h2>${S.xilogravura?.(cenaId, luz) || xilogravura(luz)}</figure>`;
    c.querySelector('.rotulo').textContent = rotulo;
    c.querySelector('h2 span').textContent = titulo;
    elCartelas.append(c);
    document.fonts.ready.then(() => ajustarTitulo(c.querySelector('h2')));
    return c;
  };
  // Piedra 110 px por padrão; diminui até caber em 2 linhas na largura do folheto.
  function ajustarTitulo(h2) {
    const span = h2.firstChild;
    for (let fs = 110; fs >= 56; fs -= 4) {
      h2.style.fontSize = fs + 'px';
      if (span.offsetHeight <= h2.clientHeight && span.scrollWidth <= h2.clientWidth && span.offsetHeight < fs * 2.1) break;
    }
  }

  addEventListener('DOMContentLoaded', () => {
    const L = window.LINHA_DO_TEMPO, dur = L.duracao;
    const corpo = document.body, audio = $('#audio'), elPalco = $('#palco');
    const params = new URLSearchParams(location.search);
    const congelado = params.get('pausa') === '1' && params.has('t');
    const debug = params.get('debug') === '1' && $('#debug');

    const beats = new Map();
    for (const c of L.cenas) for (const b of c.beats) beats.set(b.id, b);
    const beat = id => {
      const b = beats.get(id);
      if (!b) throw new Error(`beat desconhecido: ${id}`);
      return b;
    };
    const falas = L.cenas.flatMap(c => c.beats.filter(b => b.tipo === 'fala' && b.texto));
    const capitulos = L.cenas.filter(c => c.capitulo).map((c, i) => ({ num: ROMANOS[i] || String(i + 1), titulo: c.capitulo, inicio: c.inicio, cena: c }));
    const marcos = capitulos[0]?.inicio === 0 ? capitulos : [{ num: '', titulo: 'Abertura', inicio: 0 }, ...capitulos];
    const marcoEm = x => marcos.findLast(m => m.inicio <= x + .01);

    /* ── Relógio ── */
    let t = 0, tocando = false, semAudio = congelado, avisado = false;
    let ctVisto = -1, ctQuando = 0;  // última leitura de audio.currentTime e quando ela mudou
    S.tempo = () => t;
    S.T = id => beat(id).inicio;
    const usaAudio = () => !semAudio && !audio.ended;

    // Áudio é o relógio; entre as atualizações de currentTime, interpola com o relógio do quadro e
    // corrige a deriva aos poucos (salto se passar de 0,3 s).
    function avancar(dt, agora) {
      if (!usaAudio()) { t += dt; return; }
      if (audio.paused || audio.seeking || audio.readyState < 3) { t = audio.currentTime; ctVisto = -1; return; }
      const ct = audio.currentTime, taxa = audio.playbackRate;
      if (ct !== ctVisto) { ctVisto = ct; ctQuando = agora; }
      const estimado = ct + Math.min(.3, (agora - ctQuando) / 1000) * taxa;
      t += dt * taxa;
      const erro = estimado - t;
      t = Math.abs(erro) > .3 ? estimado : t + erro * .08;
    }

    /* ── Timeline mestre ── */
    const mestre = S.mestre = gsap.timeline({ paused: true });
    if (S.palco?.iniciar) {
      try { S.palco.iniciar(elPalco); } catch (e) { console.error('palco.iniciar falhou:', e); }
    } else elPalco.classList.add('provisorio');

    for (const cena of L.cenas) {
      const construtor = S.cenas.construtores[cena.id];
      if (!construtor) continue;
      const ctx = {
        cena, dur: cena.fim - cena.inicio, beat,
        t: id => beat(id).inicio - cena.inicio,
        tf: id => beat(id).fim - cena.inicio,
        sfx: som => cena.beats.flatMap(b => (b.sfx || []).filter(s => s.som === som).map(s => s.t - cena.inicio)),
      };
      const tl = gsap.timeline();
      try { construtor(tl, ctx); mestre.add(tl, cena.inicio); }
      catch (e) { tl.revert(); console.error(`cena "${cena.id}" descartada:`, e); }
    }

    // Cartelas: carimbo (y+30, 1,08 → 1, −3° → −1,2° em 0,35 s) + tremor do palco; sai descendo em 0,6 s.
    const fromTo = (alvo, de, para, em) => mestre.fromTo(alvo, de, { ...para, immediateRender: false }, em);
    for (const cap of capitulos) {
      const { inicio, fim } = cap.cena.cartela || {};
      if (inicio == null) continue;
      const c = S.cartela(`Capítulo ${cap.num}`, cap.titulo, cap.cena.luz, cap.cena.id), f = c.querySelector('.folheto');
      fromTo(c, { autoAlpha: 0 }, { autoAlpha: 1, duration: .35, ease: 'power3.in' }, inicio);
      fromTo(f, { y: 30, scale: 1.08, rotation: -3 }, { y: 0, scale: 1, rotation: -1.2, duration: .35, ease: 'power3.in' }, inicio);
      fromTo(elPalco, { x: 0 }, { x: 4, duration: .0375, repeat: 3, yoyo: true, ease: 'none' }, inicio + .35);
      fromTo(c, { autoAlpha: 1 }, { autoAlpha: 0, duration: .6, ease: 'power2.in' }, fim - .6);
      fromTo(f, { y: 0 }, { y: 40, duration: .6, ease: 'power2.in' }, fim - .6);
    }

    // Créditos: o palco escurece e o rolo sobe do pé ao topo; no último instante, apaga de vez.
    const elCred = $('#creditos');
    elCred.append(el('p', 'titulo', 'Curupira'), el('p', 'subtitulo', 'o guardião da mata'));
    for (const { secao, itens } of window.CREDITOS || []) {
      const ul = el('ul');
      for (const i of itens) ul.append(el('li', null, i));
      elCred.append(el('h3', null, secao), ul);
    }
    elCred.append(el('p', 'assinatura', 'Folclore em Sombras'));
    const { inicio: ci, fim: cf } = L.creditos;
    fromTo('#escuro', { opacity: 0 }, { opacity: .82, duration: 2.5 }, ci);
    fromTo(elCred, { y: 0, yPercent: 0 }, { y: -1080, yPercent: -100, duration: Math.max(1, cf - ci - 1), ease: 'none' }, ci);
    fromTo('#escuro', { opacity: .82 }, { opacity: 1, duration: 1.5 }, cf - 1.5);
    mestre.set({}, {}, dur);

    /* ── Interface ── */
    const barra = $('#barra'), tempoEl = $('#tempo'), elLeg = $('#legenda'), quem = $('#legenda .quem'), fala = $('#legenda .fala');
    const btTocar = $('#bt-tocar'), btLeg = $('#bt-legendas'), btSom = $('#bt-som'), btTela = $('#bt-tela');
    const volume = $('#volume'), controles = $('#controles'), menu = $('#menu-capitulos');
    barra.max = dur;

    const marcas = $('.marcas');
    for (const m of capitulos) {
      const i = el('i');
      i.style.left = (m.inicio / dur * 100) + '%';
      marcas.append(i);
    }
    const itensMenu = marcos.map(m => {
      const b = el('button');
      b.type = 'button';
      b.append(el('span', 'num', m.num), el('span', null, m.titulo), el('span', 'hora', hora(m.inicio)));
      b.addEventListener('click', () => { irPara(m.inicio); menu.hidePopover?.(); });
      const li = el('li');
      li.append(b);
      menu.querySelector('ol').append(li);
      return [m, b];
    });

    // Dica da barra: capítulo e hora sob o ponteiro (o polegar do range tem 14 px).
    const dica = $('.dica'), progresso = $('.progresso');
    progresso.addEventListener('pointermove', e => {
      const r = barra.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (e.clientX - r.left - 7) / (r.width - 14))), x = p * dur, m = marcoEm(x);
      dica.replaceChildren(m.titulo, el('span', null, hora(x)));
      const meia = dica.offsetWidth / 2, cx = 7 + p * (r.width - 14);
      dica.style.transform = `translateX(${Math.min(r.width - meia, Math.max(meia, cx)) - meia}px)`;
      dica.classList.add('visivel');
    });
    progresso.addEventListener('pointerleave', () => dica.classList.remove('visivel'));

    let arrastando = false;
    barra.addEventListener('pointerdown', () => { arrastando = true; });
    addEventListener('pointerup', () => { arrastando = false; });
    barra.addEventListener('input', () => irPara(+barra.value));

    // Legenda: zona do palco (x 340–1580, y 930–1050, Alegreya 42 px lógicos); se ficar ilegível
    // (celular em retrato), desce para o espaço livre abaixo do palco.
    const moldura = $('#moldura'), escala = $('#escala');
    function layout() {
      const W = innerWidth, H = innerHeight, s = Math.min(W / 1920, H / 1080);
      const w = 1920 * s, h = 1080 * s, x = (W - w) / 2, y = (H - h) / 2;
      Object.assign(moldura.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
      escala.style.transform = `scale(${s})`;
      const abaixo = 42 * s < 14 && y > 64;
      const fs = abaixo ? Math.min(17, Math.max(15, W * .042)) : Math.max(12, 42 * s);
      const lx = abaixo ? 16 : x + 340 * s, lw = abaixo ? W - 32 : 1240 * s, ly = abaixo ? y + h + 14 : y + 930 * s;
      Object.assign(elLeg.style, { left: lx + 'px', width: lw + 'px', top: ly + 'px' });
      elLeg.style.setProperty('--fs', fs + 'px');
      const fimLeg = ly + fs * 1.25 * 2, topoCtl = H - controles.offsetHeight;
      elLeg.style.setProperty('--sobe', Math.max(0, fimLeg - topoCtl + 6) + 'px');
    }
    addEventListener('resize', layout);
    layout();

    let falaAtual = null, trocaLegenda;
    function legenda(f) {
      if (f === falaAtual) return;
      falaAtual = f;
      clearTimeout(trocaLegenda);
      const visivel = elLeg.classList.contains('visivel');
      elLeg.classList.remove('visivel');
      if (!f) return;
      trocaLegenda = setTimeout(() => {
        elLeg.dataset.papel = f.papel || 'narrador';
        quem.textContent = NOMES[f.papel] || '';
        fala.textContent = f.texto;
        elLeg.classList.add('visivel');
      }, visivel ? 200 : 0);
    }
    const falaEm = x => {
      let f = null;
      for (const b of falas) { if (b.inicio > x) break; if (x < b.fim + .35) f = b; }
      return f;
    };

    let segAnterior = -1;
    function ui() {
      if (!arrastando) barra.value = t;
      barra.style.setProperty('--p', (t / dur * 100) + '%');
      const seg = Math.floor(t);
      if (seg !== segAnterior) {
        segAnterior = seg;
        tempoEl.textContent = `${hora(t)} / ${hora(dur)}`;
        barra.setAttribute('aria-valuetext', `${hora(t)} de ${hora(dur)}`);
        const m = marcoEm(t);
        for (const [mm, b] of itensMenu) b.setAttribute('aria-current', mm === m);
      }
      legenda(falaEm(t));
      if (debug) {
        const c = L.cenas.find(c => c.inicio <= t && t < c.fim), b = c?.beats.find(b => b.inicio <= t && t < b.fim);
        debug.textContent = `t ${t.toFixed(2)} s · relógio ${usaAudio() ? 'áudio' : 'silencioso'}\n` +
          `cena ${c?.id ?? '—'} · beat ${b ? `${b.id} (${b.tipo}${b.papel ? ' ' + b.papel : ''})` : '—'}`;
      }
    }

    /* ── Transporte ── */
    function botoes() {
      corpo.classList.toggle('tocando', tocando);
      btTocar.setAttribute('aria-label', tocando ? 'Pausar' : 'Tocar');
    }
    function irPara(x) {
      t = Math.min(dur, Math.max(0, x));
      ctVisto = -1;
      if (!semAudio) {
        audio.currentTime = t;
        if (tocando && audio.paused && usaAudio()) audio.play().catch(() => {});
      }
      if (t < dur) corpo.classList.remove('fim');
      mestre.time(t);
      ui();
    }
    function tocar() {
      if (t >= dur - .05) irPara(0);
      tocando = true;
      corpo.classList.remove('inicio', 'fim');
      corpo.classList.add('acesa');
      ctVisto = -1;
      if (usaAudio()) audio.play().catch(e => {
        if (e.name === 'NotSupportedError') falhaAudio();
        else if (e.name === 'NotAllowedError') pausar();
      });
      if (semAudio && !avisado) { avisado = true; aviso('Sem áudio. O espetáculo segue em silêncio.'); }
      botoes();
      mexeu();
    }
    function pausar() { tocando = false; audio.pause(); botoes(); mexeu(); }
    const alternar = () => (tocando ? pausar() : tocar());
    function terminar() {
      tocando = false;
      audio.pause();
      t = dur;
      mestre.time(dur);
      corpo.classList.add('fim');
      botoes();
      ui();
      setTimeout(() => $('#de-novo').focus({ preventScroll: true }), 50);
    }

    // Pausa vinda de fora (teclas de mídia, fone desconectado).
    audio.addEventListener('pause', () => { if (tocando && usaAudio()) { tocando = false; botoes(); } });
    audio.addEventListener('play', () => { if (!tocando) tocar(); });

    /* ── Carregamento e falha do áudio ── */
    const carga = $('#carregamento');
    const status = texto => { carga.textContent = texto; };
    function progressoAudio() {
      if (semAudio) return;
      const d = audio.duration, b = audio.buffered;
      const p = audio.readyState >= 4 ? 1 : d && b.length ? b.end(b.length - 1) / d : 0;
      status(p >= 1 ? '' : `carregando o som, ${Math.round(p * 100)}%`);
    }
    function falhaAudio() {
      if (semAudio) return;
      semAudio = true;
      status('sem áudio: o espetáculo vai seguir em silêncio');
      if (tocando && !avisado) { avisado = true; aviso('Sem áudio. O espetáculo segue em silêncio.'); }
    }
    const elAviso = $('#aviso');
    function aviso(texto) {
      elAviso.textContent = texto;
      elAviso.classList.add('visivel');
      setTimeout(() => elAviso.classList.remove('visivel'), 6000);
    }
    if (congelado) { audio.removeAttribute('src'); audio.load(); }
    else {
      for (const ev of ['progress', 'loadedmetadata', 'canplaythrough']) audio.addEventListener(ev, progressoAudio);
      audio.addEventListener('error', falhaAudio);
      if (audio.error) falhaAudio(); else progressoAudio();
    }

    /* ── Controles ── */
    let timerOcultar;
    function mexeu() {
      corpo.classList.remove('ocultar');
      clearTimeout(timerOcultar);
      timerOcultar = setTimeout(() => {
        if (tocando && !controles.matches(':hover') && !menu.matches(':popover-open')) corpo.classList.add('ocultar');
      }, 2000);
    }
    for (const ev of ['pointermove', 'pointerdown', 'keydown']) addEventListener(ev, mexeu, { passive: true });

    btTocar.addEventListener('click', alternar);
    $('#inicio').addEventListener('click', () => { tocar(); btTocar.focus({ preventScroll: true }); });
    $('#de-novo').addEventListener('click', () => { irPara(0); tocar(); btTocar.focus({ preventScroll: true }); });
    // Clique no palco pausa/toca com mouse; no toque só mostra os controles.
    let tipoPonteiro = 'mouse';
    moldura.addEventListener('pointerdown', e => { tipoPonteiro = e.pointerType; });
    moldura.addEventListener('click', () => { if (tipoPonteiro === 'mouse' && !corpo.matches('.inicio, .fim')) alternar(); });

    const alternarLegendas = () => {
      const sem = corpo.classList.toggle('sem-legendas');
      btLeg.setAttribute('aria-pressed', !sem);
    };
    btLeg.addEventListener('click', alternarLegendas);

    const alternarMudo = () => { audio.muted = !audio.muted; };
    btSom.addEventListener('click', alternarMudo);
    volume.addEventListener('input', () => { audio.volume = +volume.value; audio.muted = audio.volume === 0; });
    audio.addEventListener('volumechange', () => {
      const mudo = audio.muted || audio.volume === 0;
      corpo.classList.toggle('mudo', mudo);
      btSom.setAttribute('aria-label', mudo ? 'Ativar som' : 'Silenciar');
      volume.value = audio.muted ? 0 : audio.volume;
      volume.style.setProperty('--p', volume.value * 100 + '%');
    });
    volume.style.setProperty('--p', '100%');

    const alternarTela = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});
    if (!document.fullscreenEnabled) btTela.hidden = true;
    btTela.addEventListener('click', alternarTela);
    document.addEventListener('fullscreenchange', () => {
      const cheia = !!document.fullscreenElement;
      corpo.classList.toggle('tela-cheia', cheia);
      btTela.setAttribute('aria-label', cheia ? 'Sair da tela cheia' : 'Tela cheia');
    });

    document.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey || corpo.classList.contains('inicio')) return;
      const alvo = e.target;
      const emBotao = alvo.tagName === 'BUTTON', emVolume = alvo === volume;
      switch (e.key) {
        case ' ':
          if (emBotao) return;
          e.preventDefault(); alternar(); break;
        case 'ArrowLeft': case 'ArrowRight':
          if (emVolume) return;
          e.preventDefault(); irPara(t + (e.key === 'ArrowLeft' ? -5 : 5)); break;
        case 'l': case 'L': alternarLegendas(); break;
        case 'm': case 'M': alternarMudo(); break;
        case 'f': case 'F': alternarTela(); break;
      }
    });

    /* ── Início ── */
    const t0 = Math.min(dur, Math.max(0, parseFloat(params.get('t')) || 0));
    if (congelado) corpo.className = 'acesa congelado';
    if (debug) debug.hidden = false;
    if (params.has('de')) mestre.time(+params.get('de')); // teste de seek: chega a t0 vindo deste instante
    irPara(t0);

    let ultimo = performance.now(), tAnterior = t;
    function quadro(agora) {
      requestAnimationFrame(quadro);
      const dt = Math.min(.25, Math.max(0, (agora - ultimo) / 1000));
      ultimo = agora;
      if (tocando) {
        avancar(dt, agora);
        if (t >= dur) return terminar();
      }
      mestre.time(t);
      const passo = t - tAnterior;
      tAnterior = t;
      S.palco?.quadro?.(t, passo > 0 && passo < .25 ? passo : 0);
      ui();
    }
    requestAnimationFrame(quadro);
  });
})();
