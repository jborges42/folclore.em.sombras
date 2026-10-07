# Folclore em Sombras — Curupira · Briefing de produção

## O que estamos fazendo
Uma página web (HTML/CSS/JS) que conta a história tradicional do **Curupira** como um espetáculo de
**teatro de sombras**. O espectador clica em "play" e assiste a uma animação com narração em português
do Brasil, trilha sonora, efeitos e ambiência. Tudo precisa ser **bonito, elegante e encantador**.

## Conceito artístico: fusão, com o Brasil no centro
- **Do teatro de sombras chinês vem só a TÉCNICA e a linguagem plástica**: biombo de papel translúcido
  retroiluminado por chama; bonecos de couro entalhado, tingido e translúcido (a luz atravessa as cores);
  vazados ornamentais finos; articulações com rebites; varetas de manipulação visíveis; personagens de
  perfil; cenário também em peças recortadas; percussão que pontua cada gesto; sombra que cresce e
  desfoca quando o boneco se afasta da tela.
- **PROIBIDO**: letras, ideogramas, carimbos, símbolos, roupas (chapéu cônico etc.), arquitetura ou
  ornamentos chineses identificáveis. Nada de "orientalismo". O conteúdo é 100% brasileiro.
- **Do Brasil vem TODO o conteúdo e o vocabulário visual**: os vazados e padrões dos bonecos inspirados
  em grafismos geométricos de povos originários (marajoara, kadiwéu, padrões de pele de cobra, casco de
  jabuti, pintas de onça, espinha de peixe, gregas, losangos) — usados com respeito, como inspiração
  geométrica genérica, sem copiar desenhos sagrados específicos; textura e força da **xilogravura de
  cordel**; cores de **urucum, jenipapo, açafrão, argila, verde-mata, anil**; flora (samaúma com
  sapopemas, buriti, açaí, embaúba, helicônia, bromélia, costela-de-adão, samambaia, cipós, ipê);
  fauna (onça-pintada, veada, queixada/caititu, arara, tucano, bugio, tatu, urutau, vaga-lumes);
  caçadores caboclos (chapéu de palha, espingarda, facão, bornal, cachorro de caça); a avó benzedeira;
  a moldura do palco em madeira entalhada com palha trançada; a luz vem de uma **lamparina/candeeiro**.
- Referência visual de clima e composição: `curupira/refs/*.jpg` (biombo tríptico, luz âmbar, camadas de
  folhagem em silhueta, bonecos coloridos articulados com varetas, pegadas invertidas). Mantemos esse
  clima, trocando tudo que é chinês por equivalentes brasileiros.

## Exigências do usuário (prioridade máxima)
1. **Fidelidade às fontes**: contar a história do Curupira na versão documentada pelas fontes originais
   (Anchieta 1560, Couto de Magalhães, Barbosa Rodrigues, Câmara Cascudo etc.). Nada inventado que
   contradiga a tradição; animação e narração precisam narrar CORRETAMENTE essa versão.
2. **Narração profissional e profunda**, adequada à atmosfera: nenhum trejeito robótico ou
   computadorizado. Modelo TTS expressivo de ponta, várias tomadas por frase com seleção objetiva da
   melhor, e masterização de locução (EQ, compressão suave, ambiência discreta).
3. **Trilha coerente com a história** que crie a atmosfera envolvente de um teatro de sombras chinês,
   com instrumentação adequada — abrasileirada (ver abaixo).

4. **Nada com cara de IA.** Nenhum emoji em lugar nenhum (interface, legendas, créditos, cartelas, textos).
   Proibidos os clichês de interface gerada por IA: rótulo pequeno em CAIXA ALTA com letras espaçadas
   acima de títulos; títulos com brilho (glow); divisórias ornamentais com losangos/estrelinhas; botões com
   borda dupla, brilho no hover ou ícone decorativo (chama, faísca, estrela); animações de entrada em
   cascata; gradientes e sombras decorativos sem função; frases de efeito ("Som ligado, luzes apagadas");
   texto de marketing; excesso de travessões; tríades retóricas. A interface parece feita à mão por um
   grupo de teatro: pouco texto, palavras simples em minúsculas na fonte serifada, controles discretos e
   funcionais. A entrada no espetáculo acontece pelo próprio palco (clicar na lamparina para acendê-la).

## Trilha sonora (REVISADA pelo usuário — prevalece sobre qualquer outra orientação)
O usuário ouviu a primeira versão e achou que as flautas e os toques deixaram um tom ORIENTAL. Regra:
- **Do teatro de sombras oriental vem só a ATMOSFERA**: clima de conto contado à luz da lamparina, mistério,
  suspense, percussão que pontua cada gesto do boneco, silêncios dramáticos, música que conduz a cena.
- **PROIBIDO soar oriental**: flautas/pífanos (fora, salvo uso mínimo e claramente brasileiro, nunca como
  melodia principal), escalas pentatônicas, gongos com glissando de ópera chinesa (e gongo em geral como cor),
  bloco de madeira acelerando à moda chinesa, qualquer timbre ou fraseado de erhu/dizi/guzheng.
- **Linguagem musical BRASILEIRA**: modos nordestinos (mixolídio, "escala nordestina" lídio com 7ª menor,
  dórico), menor de modinha/toada, harmonia de viola; **viola caipira** (ponteios, rasqueados, toadas),
  **rabeca** cantando toada nordestina (nunca pentatônica), **sanfona** arrastada para noite e mistério,
  **cuíca** gemendo (voz misteriosa do Curupira), **berimbau**, **batuques** (alfaia e baque de maracatu,
  zabumba e baião, atabaque, caixa, surdo), ganzá, maracás, agogô, gonguê, **matracas de bumba-meu-boi** para
  os acelerandos e pontuações, pau-de-chuva, **berrante** para os caçadores, aboio. Pontuação dos gestos com
  alfaia, surdo, prato de banda, matraca, caixa — não com gongo.
- Contextual, cena a cena; sons da mata (aves, bugios, cigarras, sapos, chuva, vento, trovão); gritos, vozes,
  grunhidos (caçadores, cachorros, queixadas batendo os dentes, onça, risada e assobio do Curupira).
- As etiquetas de sfx musicais antigas do roteiro (gongo_grave, gongo_sobe, gongo_desce, bloco_madeira,
  bloco_acelera, flauta_chamado) passam a significar a FUNÇÃO (pontuação grave, subida, descida, golpe seco,
  acelerando, chamado) e são tocadas com os instrumentos brasileiros acima.

## Licenças (obrigatório)
- Aceito: **CC0 / domínio público** (preferido), **CC-BY 3.0/4.0** (registrar atribuição), MIT, Apache-2.0,
  OFL (fontes). CC-BY-SA só em último caso e sinalizado. **Proibido**: NC, ND, licença desconhecida,
  "free for personal use", conteúdo sem licença clara.
- Toda fonte externa é registrada (arquivo, URL, autor, licença, URL da licença) para os créditos.

## Arquitetura (já decidida)
```
curupira/
  index.html             página final: palco + player + legendas
  js/vendor/gsap.min.js  GSAP 3 (timeline mestre, seek)
  js/*.js                módulos do palco (scripts clássicos, namespace global window.Sombras — SEM
                         ES modules, SEM fetch(): a página precisa abrir por file:// com duplo clique)
  js/linha-do-tempo.js   GERADO: window.LINHA_DO_TEMPO = {...} (tempos absolutos de cenas e falas)
  audio/curupira.mp3     GERADO: mix final (narração + trilha + efeitos)
  fontes/                woff2 (OFL) servidas localmente
  roteiro.json           FONTE DA VERDADE da história (formato abaixo)
  CREDITOS.md            créditos e licenças
  producao/              pipeline (não é servido): .venv (Python 3.12, numpy/scipy/soundfile/pyloudnorm),
                         bin/ffmpeg, capturar.mjs (screenshots), pesquisa/, vozes/, sons/, prototipo/
```
- Renderização: HTML + SVG + CSS (filtros, mix-blend-mode) para tela, cenário e bonecos; Canvas 2D para
  partículas (vaga-lumes, chuva, brasas, poeira). Palco lógico 1920×1080.
- Relógio mestre = `audio.currentTime`; a cada frame `timeline.time(relogio)`. Tudo determinístico por
  tempo, para o seek funcionar. Parâmetros de URL: `?t=SEGUNDOS&pausa=1` congela num instante sem áudio
  (usado nas capturas), `?debug=1` mostra tempo/cena.
- Capturas para revisão visual: `node curupira/producao/capturar.mjs <file:///.../pagina.html> <pasta> <t1,t2,...> [larg] [alt]`
  (gera quadro_XXXXXX.png e imprime erros do console). Use o Read na imagem para vê-la.
- Python: `curupira/producao/.venv/bin/python`; ffmpeg: `curupira/producao/bin/ffmpeg`.

## Formato de `roteiro.json`
```json
{
  "titulo": "Curupira, o guardião da mata",
  "papeis": {"narrador": "descrição da voz", "tiao": "...", "ze": "...", "vo": "...", "curupira": "..."},
  "cenas": [{
    "id": "abertura",
    "capitulo": "Título do capítulo ou null",
    "luz": "lamparina|amanhecer|dia|entardecer|noite|tempestade|aurora",
    "ambiente": ["etiqueta_de_som", "..."],
    "trilha": "direção musical: instrumentos, andamento, intensidade, entradas e cortes",
    "visual": "direção visual: cenário, quem está em cena, composição",
    "beats": [
      {"id": "abertura_01", "tipo": "fala", "papel": "narrador", "texto": "Frase para a voz.",
       "pausa_depois": 0.8,
       "sfx": [{"som": "etiqueta_de_som", "em": "inicio|fim|+1.5"}],
       "acao": "o que acontece no palco durante esta fala"},
      {"id": "abertura_02", "tipo": "pausa", "dur": 3.0, "sfx": [], "acao": "..."}
    ]
  }]
}
```
`em`: "inicio"/"fim" da fala, ou "+N" segundos após o início do beat.

## Etiquetas de som (vocabulário comum de roteiro, fontes e mixagem)
Ambiências: `mata_amanhecer`, `mata_dia`, `mata_noite`, `chuva_mata`, `tempestade`, `vento_folhas`, `riacho`, `lamparina_chama`.
Bichos: `araras`, `araras_revoada`, `tucano`, `sabia`, `araponga`, `urutau`, `coruja`, `inhambu`, `bugio`, `macaco_gritos`,
`onca_esturro`, `onca_rosnado`, `queixada_grunhido`, `queixada_dentes`, `queixada_tropel`, `veado_alarme`, `sapos`, `cigarras`, `grilos`.
Gente e ação: `passos_folhas`, `corrida_folhas`, `galho_quebra`, `machado_golpe`, `arvore_rangendo`, `arvore_caindo`,
`tiro_espingarda`, `espingarda_engatilhar`, `cachorro_latido`, `cachorro_ganido`, `grito_homem`, `grito_pavor`, `chamado_eco`,
`ofego`, `risada_curupira`, `assobio_curupira`, `batida_tronco`, `cipo_torcendo`, `folhagem_mexe`, `fosforo`, `sopro_apaga`,
`coracao`, `trovao`, `relampago_estalo`.
Música/percussão (pontuações): `gongo_grave`, `gongo_sobe`, `gongo_desce`, `bloco_madeira`, `bloco_acelera`, `prato`,
`tambor_grave`, `rufar`, `maraca`, `caxixi`, `agogo`, `berimbau`, `flauta_chamado`, `pau_de_chuva`.
Novas etiquetas podem ser criadas (snake_case, português), desde que listadas em `sons_novos` no fim do roteiro.json.

## Convenções de coreografia (obrigatório para todos os módulos de cena)
- Arquivos: `js/elenco-gente.js` (Zé, Vó + poses nomeadas de todos os humanos, inclusive Tião), `js/elenco-bichos.js`
  (bichos + Curupira montado), `js/cenarios.js` (cenário de cada cena + objetos de cena), `js/xilogravuras.js`
  (arte das cartelas), `js/cenas/comum.js` (kit de coreografia), `js/cenas/<grupo>.js` (uma timeline por cena,
  registrada com `Sombras.cenas.registrar(id, (tl, ctx) => …)` — contrato no topo de `js/player.js`).
- **Cada cena é dona do que mostra**: cria as PRÓPRIAS instâncias de bonecos e o PRÓPRIO cenário ao ser construída,
  e eles só ficam visíveis dentro do intervalo da cena (mais a transição). Nunca depender do estado deixado por outra cena.
- **Seek à prova de bala**: todo tween com ponto de partida explícito (`fromTo` com `immediateRender: false`, ou `set`
  logo no início da cena); nada de `transition`/`@keyframes` CSS na história; partículas e motores são funções do tempo.
- Tempos sempre a partir de `ctx.t(beatId)` / `ctx.tf(beatId)` / `ctx.sfx(etiqueta)` — nunca segundos fixos absolutos
  (as falas ainda vão mudar de duração quando as vozes reais chegarem).
- Luz: cada cena leva a luz até o seu estado (`luz` do roteiro) com o palco (`p.irPara` / interpolação explícita).
- O que o roteiro descreve em "acao" de cada beat é o que precisa estar na tela naquele beat.
- Edição de arquivo compartilhado: mudanças pequenas, localizadas e aditivas (nunca reescrever o arquivo inteiro de outro).
