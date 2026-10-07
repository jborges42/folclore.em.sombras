# Guia de estilo visual — Folclore em Sombras · Curupira

Manual de implementação do palco. Tudo aqui é para ser copiado para o código: medidas em px no palco
lógico **1920×1080**, cores em hex, receitas SVG/CSS testadas no Chrome. Quando este guia e o
`BRIEFING.md` divergirem, vale o briefing.

---

## 1. O que torna a referência bonita (`refs/*.jpg`)

1. **Uma única fonte de luz, quente e central.** O papel é retroiluminado por uma luz âmbar com o
   ponto mais claro (hotspot) no painel do meio, um pouco acima do centro. A luz cai suavemente para
   as bordas e os cantos ficam quase marrom-escuros. Essa vinheta natural já resolve a composição:
   o olho vai para o centro.
2. **Tríptico.** Três painéis de papel separados por montantes escuros de madeira. Os montantes dão
   ritmo e "teatralidade", e o cenário **continua por trás deles** (a mata não para no montante).
3. **Camadas de profundidade só com valor e desfoque.** O cenário é monocromático (sépia). Folhagens
   do fundo são claras, desfocadas e pequenas; as da frente são quase pretas, nítidas e grandes. São
   4–5 planos. Palmeiras e folhas grandes emolduram o topo e as laterais; o centro fica limpo, como uma
   clareira de luz onde os bonecos atuam.
4. **Os bonecos são as únicas coisas coloridas.** Couro translúcido em ocres, marrons e laranja; o
   cabelo vermelho-fogo do Curupira é o único vermelho saturado da imagem, por isso é o foco absoluto.
5. **Riqueza no detalhe do boneco.** Contorno escuro fino, padrões no saiote (pintas de onça), franjas
   de fibra nos tornozelos, articulações visíveis em ombro, cotovelo e joelho, e varetas finas.
6. **Narrativa no chão.** As pegadas invertidas contam a lenda sem nenhuma palavra.
7. **Objetos fora do papel.** A mesa e o braseiro estão entre o público e o biombo, em silhueta, e dão
   escala real: estamos olhando um teatro, não um desenho.

**O que trocamos:** os ideogramas do topo (removidos; o título entra numa cartela de cordel), os
chapéus cônicos (viram chapéu de palha de aba larga), arco e aljava (viram espingarda, facão e bornal),
a mesa com treliça chinesa (vira a área escura das legendas) e o braseiro de metal (vira uma lamparina
de barro sobre um toco entalhado). Na referência as varetas vêm de cima, como fios; aqui elas **vêm de
baixo**, como no teatro de sombras de verdade.

---

## 2. Princípios da fusão

### Da técnica chinesa vem só o *como*
- Tela de papel translúcido iluminada por trás por uma chama.
- Boneco de couro raspado até ficar translúcido, **tingido com cores transparentes**: a luz atravessa
  e a cor aparece na tela.
- **Vazados**: o couro é entalhado com furos ornamentais finos. Regra física: **todo furo é uma ilha**
  e o couro continua inteiro (pontes de no mínimo 1,5 px). Não existe vazado que solte um pedaço.
- **Articulações em disco com raios** (como uma roda) presas por **rebite**, para a sobreposição de couro
  não ficar opaca.
- **Rosto de perfil**: um olho, uma sobrancelha, uma narina. Personagens humanos usam **rosto vazado**
  (o interior do rosto é furo e só as linhas dos traços ficam em couro, então o rosto "brilha"). O
  Curupira usa **rosto cheio**, tingido, com os **olhos vazados**, que acendem com a luz.
- **Três varetas** por pessoa (pescoço e as duas mãos) e duas por bicho (cabeça e rabo/anca), visíveis,
  saindo por baixo.
- Cenário também em peças recortadas e encaixadas, com vazados.
- Sombra que **cresce e desfoca** quando o boneco se afasta da tela, rumo à luz.
- Pernas soltas que balançam por gravidade; percussão que "carimba" cada gesto.

### Do Brasil vem todo o *quê*
Grafismos geométricos genéricos inspirados em marajoara e kadiwéu, pintas de onça, casco de jabuti,
pele de cobra, espinha de peixe; força gráfica da **xilogravura de cordel**; o entalhe vigoroso das
**carrancas do São Francisco** na moldura; **palha trançada**; cores de urucum, jenipapo, açafrão,
argila, verde-mata e anil; flora e fauna da mata; caboclos, a benzedeira e a **lamparina de barro**.

### Proibido (checklist de revisão)
- Ideogramas, letras ou numerais chineses; carimbo vermelho (selo) de qualquer tipo.
- Chapéu cônico, rabicho, gola mandarim, túnicas e sapatos de ópera.
- Dragão, fênix, leão-de-guarda, nuvem auspiciosa (*ruyi*), padrão de nuvem chinesa, ondas estilizadas
  chinesas, pagode, telhado de beiral curvo, lanterna vermelha, leque, bambuzal "oriental".
- Treliça e grade chinesas (como a mesa da referência), maquiagem codificada da ópera de Pequim.
- Gongo **visível** (o som do gongo pode, o objeto não).
- Do lado brasileiro: cocar genérico de "índio de fantasia", cópia de desenho específico de um povo
  (pintura de clã, grafismo sagrado identificável), caricatura humilhante do caipira, Curupira como
  demônio (ele é o guardião), sangue, arma apontada para a plateia.

---

## 3. Paleta

### 3.1 Tokens base (copiar para `:root`)

```css
:root {
  /* sala e moldura (iluminadas pela frente, opacas) */
  --sala: #0D0906;           /* fundo da sala */
  --sala-chao: #140D08;      /* faixa das legendas */
  --madeira-escura: #24160D;
  --madeira: #4A2E1A;
  --madeira-luz: #8A5A32;    /* arestas pegando a luz da lamparina */
  --palha: #C9A15A;
  --palha-sombra: #7E5E2C;
  --barro: #9A4E2A;          /* lamparina */

  /* papel (o estado de luz sobrescreve) */
  --papel-centro: #F6E4B8;
  --papel-meio:   #D9B57A;
  --papel-borda:  #8E6232;
  --papel-canto:  #3B2614;

  /* tinta das sombras do cenário (o estado de luz sobrescreve) */
  --sombra-tinta: #24140A;

  /* couros tingidos (sempre translúcidos, ver 6.5) */
  --couro-cru:   #C99A5E;
  --urucum:      #C2401F;  --urucum-claro:  #E8693A;
  --jenipapo:    #1E2A30;
  --acafrao:     #E0A21C;  --acafrao-claro: #F2C14E;
  --argila:      #A65F38;  --argila-clara:  #C98454;
  --verde-mata:  #3E6A34;  --verde-claro:   #7FA35E;
  --anil:        #2D4B8E;  --anil-claro:    #6F8FD0;
  --contorno:    #170C05;
  --rebite:      #2A1A0E;  --rebite-brilho: #A8814B;

  /* fogo */
  --chama-nucleo: #FFF4D2;
  --chama-corpo:  #FFC046;
  --chama-borda:  #F27A1A;
  --chama-ponta:  #B5360F;
  --halo:         rgba(255, 168, 64, .32);
  --cabelo-1: #FFD75E;  --cabelo-2: #F59A1F;  --cabelo-3: #D2401A;  /* raiz → ponta = 3 → 1 */
  --vagalume: #E9FF8C;  --vagalume-halo: rgba(182, 242, 74, .35);

  /* texto (sobre a sala escura) */
  --texto: #F3E6C8;
  --texto-suave: #BFA98A;
  --nome-tiao: #F2C14E;  --nome-ze: #9CC17F;  --nome-vo: #9DB4E8;  --nome-curupira: #F08A5D;

  /* luz: estado padrão = lamparina */
  --hotspot-x: 50%;  --hotspot-y: 44%;  --hotspot-rx: 62%;  --hotspot-ry: 78%;
  --vinheta: .55;
  --gel: #FFB86B;  --gel-opacidade: .10;
  --brilho: 1;  --saturacao: 1;  --matiz: 0deg;
  --poeira: 1;       /* 0 = sem poeira no feixe */
  --chama: 1;        /* multiplicador do tremor (ver 11.6), escrito a cada quadro */
}
```

### 3.2 Estados de luz

Cada estado é um conjunto de valores para as variáveis acima. **Troca de luz é sempre um tween GSAP das
variáveis CSS** (`gsap.to(palco, {'--papel-centro': '#FBF1D6', ...})`, duração 2–4 s, `sine.inOut`),
dentro da timeline mestre, para o *seek* funcionar. Proibido usar `transition` ou `@keyframes` de CSS
para qualquer coisa da história.

| estado | papel centro / meio / borda / canto | hotspot x y rx ry | vinheta | gel / opac. | brilho | satur. | matiz | sombra-tinta | poeira |
|---|---|---|---|---|---|---|---|---|---|
| `lamparina` | `#F6E4B8` `#D9B57A` `#8E6232` `#3B2614` | 50% 44% 62% 78% | .55 | `#FFB86B` .10 | 1.00 | 1.00 | 0deg | `#24140A` | 1 |
| `amanhecer` | `#F7DDC6` `#D9AE9A` `#7D6577` `#2C2230` | 28% 72% 70% 80% | .45 | `#F2B6A0` .14 | .96 | .90 | -6deg | `#2A1E26` | 1 |
| `dia` | `#FBF1D6` `#E6CC98` `#B08A52` `#5A3E22` | 50% 30% 85% 95% | .30 | `#FFF3D0` .04 | 1.08 | 1.05 | 0deg | `#2B1A0C` | 1 |
| `entardecer` | `#F8CF8C` `#E39A55` `#8E3B1C` `#2E120A` | 72% 64% 66% 80% | .55 | `#FF8A3C` .16 | .98 | 1.15 | -8deg | `#2A0F06` | 1 |
| `noite` | `#C8CCC2` `#7F8C93` `#2B3445` `#0B0F18` | 58% 30% 48% 60% | .80 | `#3D5A8A` .30 | .70 | .65 | 0deg | `#0B1220` | 0 |
| `tempestade` | `#B3B8AE` `#6C7470` `#252B2B` `#080A0B` | 50% 40% 60% 70% | .85 | `#4E6470` .34 | .58 | .55 | 0deg | `#0A0F10` | 0 |
| `aurora` | `#FFEBC0` `#F4BE8E` `#9A6A78` `#3A2433` | 50% 78% 80% 70% | .40 | `#FFD39A` .12 | 1.06 | 1.10 | -4deg | `#2A1810` | 1 |

Notas por estado:
- **lamparina**: abertura e encerramento; a chama treme com amplitude máxima (`--tremor` 1,0).
- **amanhecer**: hotspot baixo à esquerda (o sol nasce à esquerda), rosado com bordas lilás.
- **dia**: luz alta e aberta, pouca vinheta; a mata fica legível até o fundo.
- **entardecer**: hotspot baixo à direita, laranja; as sombras do cenário puxam para o vinho.
- **noite**: o hotspot vira uma lua (menor, alto); o gel azul cobre também os bonecos; o tremor da
  chama cai para 0,3. Vaga-lumes acesos.
- **tempestade**: escuro e frio; o tremor sobe para 1,6 (a luz "vacila"); relâmpagos conforme 11.3.
- **aurora**: final; hotspot nasce embaixo, no centro, atrás da samaúma/ipê; a luz mais bonita do
  espetáculo.

### 3.3 Onde cada cor entra
- O **papel** é um `radial-gradient` controlado pelas variáveis (ver 9.2).
- O **cenário** é pintado com `--sombra-tinta` e `mix-blend-mode: multiply`; a profundidade é dada só
  pela opacidade (ver 8.2). Exceções coloridas, no máximo uma por cena: helicônia (urucum/açafrão),
  bromélia (centro urucum), ipê-amarelo (açafrão), todas em L1/L2.
- Os **bonecos** são os únicos elementos saturados. Cada cena tem **uma cor de foco** (em geral o
  cabelo de fogo do Curupira); as outras cores dos bonecos ficam em tons de argila, couro cru e anil.

---

## 4. Biblioteca de grafismos (vazados)

São inspiração geométrica **genérica** (losango, grega, degrau, escama, espinha, hexágono, pinta,
voluta), sem copiar desenho específico de nenhum povo. Todos seguem a regra **furo = ilha**: os motivos
são formas soltas, separadas por pontes de couro de 1,6 px ou mais.

### 4.1 Definições (um único `<svg>` oculto no `index.html`)

<!-- DEFS:INICIO -->
```html
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
<defs>
  <!-- G1 losango: treliça de losangos maciços -->
  <pattern id="g-losango" width="20" height="20" patternUnits="userSpaceOnUse">
    <path d="M10 2 17 10 10 18 3 10ZM0-8 7 0 0 8-7 0ZM20-8 27 0 20 8 13 0ZM0 12 7 20 0 28-7 20ZM20 12 27 20 20 28 13 20Z"/>
  </pattern>

  <!-- G2 cobra: moldura de losango com 4 pontes + furo central (pele de cobra) -->
  <pattern id="g-cobra" width="24" height="24" patternUnits="userSpaceOnUse">
    <path d="M12 2 22 12 12 22 2 12Z" fill="none" stroke="#000" stroke-width="2.6"
          stroke-dasharray="11.14 3" stroke-dashoffset="-1.5"/>
    <circle cx="12" cy="12" r="2.2"/>
    <circle cx="0" cy="0" r="1.5"/><circle cx="24" cy="0" r="1.5"/>
    <circle cx="0" cy="24" r="1.5"/><circle cx="24" cy="24" r="1.5"/>
  </pattern>

  <!-- G3 grega: gancho quadrado (meandro) -->
  <pattern id="g-grega" width="18" height="18" patternUnits="userSpaceOnUse">
    <path d="M3 15V3H15V12H8V8H11" fill="none" stroke="#000" stroke-width="2.4" stroke-linecap="square"/>
  </pattern>

  <!-- G4 degrau: escada diagonal (inspiração marajoara) -->
  <pattern id="g-degrau" width="16" height="16" patternUnits="userSpaceOnUse">
    <path d="M1 13H5V9H9V5H13V1" fill="none" stroke="#000" stroke-width="2.2"/>
  </pattern>

  <!-- G5 espinha de peixe: chevrons soltos -->
  <pattern id="g-espinha" width="16" height="10" patternUnits="userSpaceOnUse">
    <path d="M2 2 8 7 14 2" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </pattern>

  <!-- G6 casco de jabuti: hexágonos separados -->
  <pattern id="g-jabuti" width="14.9" height="25.8" patternUnits="userSpaceOnUse">
    <path d="M0-6.5l5.63 3.25v6.5L0 6.5l-5.63-3.25v-6.5z
             M14.9-6.5l5.63 3.25v6.5L14.9 6.5l-5.63-3.25v-6.5z
             M7.45 6.4l5.63 3.25v6.5L7.45 19.4l-5.63-3.25v-6.5z
             M0 19.3l5.63 3.25v6.5L0 32.3l-5.63-3.25v-6.5z
             M14.9 19.3l5.63 3.25v6.5L14.9 32.3l-5.63-3.25v-6.5z"/>
  </pattern>

  <!-- G7 roseta: pintas de onça (4 manchas em anel, centro de couro) -->
  <pattern id="g-roseta" width="36" height="32" patternUnits="userSpaceOnUse">
    <g id="roseta">
      <ellipse cx="9" cy="3.5" rx="3.4" ry="2"/>
      <ellipse cx="13.5" cy="8.5" rx="2" ry="3.2"/>
      <ellipse cx="8.5" cy="12.6" rx="3.2" ry="1.9"/>
      <ellipse cx="4.6" cy="7.8" rx="1.9" ry="3"/>
    </g>
    <use href="#roseta" x="18" y="16"/>
    <circle cx="27" cy="6" r="2"/><circle cx="9" cy="24" r="2.2"/>
  </pattern>

  <!-- G8 voluta: curva em gancho (inspiração curvilínea kadiwéu) -->
  <pattern id="g-voluta" width="32" height="20" patternUnits="userSpaceOnUse">
    <path d="M3 17C3 8 12 3 18 6C23 9 20 15 15 13" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="27" cy="10" r="1.8"/>
  </pattern>

  <!-- G9 dente de serra: triângulos (barras e bordas) -->
  <pattern id="g-serra" width="14" height="12" patternUnits="userSpaceOnUse">
    <path d="M1.5 11 7 2 12.5 11Z"/>
  </pattern>

  <!-- G10 ponto: pontilhado de jenipapo -->
  <pattern id="g-ponto" width="9" height="9" patternUnits="userSpaceOnUse">
    <circle cx="2.5" cy="2.5" r="1.5"/><circle cx="7" cy="7" r="1.5"/>
  </pattern>

  <!-- G11 trançado: palha em esteira (fendas alternadas) -->
  <pattern id="g-trancado" width="16" height="16" patternUnits="userSpaceOnUse">
    <rect x="1" y="1.6" width="6" height="1.6" rx=".8"/><rect x="1" y="4.8" width="6" height="1.6" rx=".8"/>
    <rect x="9.6" y="1" width="1.6" height="6" rx=".8"/><rect x="12.8" y="1" width="1.6" height="6" rx=".8"/>
    <rect x="1.6" y="9" width="1.6" height="6" rx=".8"/><rect x="4.8" y="9" width="1.6" height="6" rx=".8"/>
    <rect x="9" y="9.6" width="6" height="1.6" rx=".8"/><rect x="9" y="12.8" width="6" height="1.6" rx=".8"/>
  </pattern>

  <!-- G12 água: ondinhas soltas -->
  <pattern id="g-agua" width="22" height="12" patternUnits="userSpaceOnUse">
    <path d="M2 7Q6.5 2 11 7T20 7" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round"/>
  </pattern>

  <!-- Articulação: 4 setores vazados em volta do rebite (desenhar no pivô, nas DUAS peças) -->
  <g id="junta-furos">
    <path id="setor" d="M3.38 1.23L7.52 2.74A8 8 0 0 1 2.74 7.52L1.23 3.38A3.6 3.6 0 0 0 3.38 1.23Z"/>
    <use href="#setor" transform="rotate(90)"/><use href="#setor" transform="rotate(180)"/>
    <use href="#setor" transform="rotate(270)"/>
  </g>
  <g id="rebite">
    <circle r="3.2" fill="#2A1A0E"/><circle cx="-.8" cy="-.8" r="1.1" fill="#A8814B"/>
  </g>

  <!-- Pegada (pé apontando para +x, 34 px). Pegada do Curupira = espelhada (ver 7.1) -->
  <g id="pegada">
    <path d="M0 0C3-5 14-6.5 22-5.5C27-5 28-1 25 1.5C21 4.5 12 5 5 4.5C1.5 4.2-1 2.5 0 0Z"/>
    <circle cx="27.5" cy="-6" r="2.4"/><circle cx="31" cy="-2.8" r="2"/><circle cx="32" cy="1"   r="1.8"/>
    <circle cx="30.5" cy="4.3" r="1.6"/><circle cx="27.5" cy="6.6" r="1.4"/>
  </g>

  <!-- Couro: manchas sutis de tingimento (aplicar no <g> do boneco inteiro) -->
  <filter id="f-couro" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency=".035 .06" numOctaves="3" seed="7" result="ruido"/>
    <feColorMatrix in="ruido" type="matrix" result="manchas"
      values="0 0 0 0 .10  0 0 0 0 .05  0 0 0 0 .02  .9 0 0 0 -.3"/>
    <feComposite in="manchas" in2="SourceAlpha" operator="in" result="manchas-no-couro"/>
    <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="manchas-no-couro"/></feMerge>
  </filter>

  <!-- Papel artesanal de fibra (camada estática, ver 9.2) -->
  <filter id="f-papel" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency=".006 .01" numOctaves="4" seed="4" result="nuvens"/>
    <feTurbulence type="fractalNoise" baseFrequency=".9 .35" numOctaves="2" seed="9" result="fibras"/>
    <feColorMatrix in="nuvens" type="matrix" result="manchas"
      values="0 0 0 0 .23  0 0 0 0 .14  0 0 0 0 .06  1.0 0 0 0 -.42"/>
    <feColorMatrix in="fibras" type="matrix" result="fios"
      values="0 0 0 0 .30  0 0 0 0 .20  0 0 0 0 .10  1.2 0 0 0 -.72"/>
    <feMerge><feMergeNode in="manchas"/><feMergeNode in="fios"/></feMerge>
  </filter>

  <!-- Tinta de xilogravura: borda trêmula + falhas de tinta (cartelas e títulos) -->
  <filter id="f-xilo" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="2" result="r"/>
    <feDisplacementMap in="SourceGraphic" in2="r" scale="3.5" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency=".03 .7" numOctaves="2" seed="5" result="g"/>  <!-- veio da madeira -->
    <feColorMatrix in="g" type="matrix" result="falhas"
      values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -7 0 0 0 6.1"/>
    <feComposite in="d" in2="falhas" operator="in"/>
  </filter>

  <!-- Brilho de fogo (cabelo do Curupira, chama, brasas) -->
  <filter id="f-fogo" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>
</svg>
```
<!-- DEFS:FIM -->

### 4.2 Como aplicar um vazado (máscara com margem automática)

O furo é feito com `<mask>`: branco = couro, preto = furo. A forma da peça fica em `<defs>` **sem
`fill`** (para o `<use>` poder pintar) e é reutilizada três vezes: na peça, no campo do motivo e num
traço branco de 8 px que garante **4 px de couro inteiro junto ao contorno**.

```html
<defs>
  <path id="ze-peito" d="..."/>                 <!-- sem fill/stroke -->
  <mask id="m-ze-peito" maskUnits="userSpaceOnUse" x="-500" y="-500" width="1000" height="1000">
    <rect x="-500" y="-500" width="1000" height="1000" fill="#fff"/>
    <use href="#ze-peito" fill="url(#g-espinha)"/>                  <!-- motivo = furos -->
    <use href="#ze-peito" fill="none" stroke="#fff" stroke-width="8"/>  <!-- margem de couro -->
    <use href="#junta-furos" x="0" y="-12" fill="#000"/>            <!-- furos da junta no pivô -->
  </mask>
</defs>
<g class="peca" style="transform-origin: 0px -12px">                 <!-- pivô = ombro, etc. -->
  <use href="#ze-peito" mask="url(#m-ze-peito)"
       style="fill: var(--verde-mata); stroke: var(--contorno); stroke-width: 2.5px; stroke-linejoin: round"/>
  <use href="#rebite" x="0" y="-12"/>
</g>
```
- Para restringir o motivo a uma **faixa** (barra de saia, aba do chapéu), troque o segundo `<use>` por
  um `<path>` da faixa com `fill="url(#g-…)"`.
- `var()` não funciona em atributos de apresentação SVG; use `style="fill: var(--x)"` ou classes.
- **Não use `x`/`y` no `<use>` que recebe a máscara**: o deslocamento entra no sistema de coordenadas
  da máscara e ela sai do lugar (a peça some). Posicione sempre com `transform` no `<g>` pai.
- Escala do motivo: `patternTransform="scale(1.4)"` numa cópia do `<pattern>` (via `href`) para peças
  grandes do cenário. Nunca abaixo de 1 (furos menores que 3 px somem na tela).

### 4.3 Onde usar cada motivo

| id | motivo | uso principal |
|---|---|---|
| `g-losango` | treliça de losangos | peito do Tião, saia da Vó, tronco da samaúma (escala 1,6) |
| `g-cobra` | losango aberto + ponto | cinto e bornal, cipós grossos, corpo do caititu (escala .8) |
| `g-grega` | gancho quadrado | barras de roupa, faixa do tacape, moldura do biombo |
| `g-degrau` | escada diagonal | lenço da Vó, travessas da moldura, cartelas |
| `g-espinha` | espinha de peixe | calça e camisa do Zé, nervura de folhas (helicônia, embaúba) |
| `g-jabuti` | hexágonos | bornal, casco do tatu, chapéu de palha (alternativa ao trançado) |
| `g-roseta` | pintas de onça | onça (como **pintura**, ver 7.6), saiote do Curupira (como vazado) |
| `g-voluta` | ganchos curvos | pintura corporal do Curupira, fumaça do cachimbo, entalhe da moldura |
| `g-serra` | dente de serra | dorso da queixada (cerdas), barra do saiote, bordas das cartelas |
| `g-ponto` | pontilhado | rosto e braços do Curupira (jenipapo), pintas da veada, terço da Vó |
| `g-trancado` | palha trançada | chapéus de palha, cesto, faixa inferior do biombo |
| `g-agua` | ondinhas | riacho, chuva parada no chão, cartela da tempestade |

O mesmo `<pattern>` também serve como **pintura** (quando não é furo): um `<use>` da peça por cima
dela com `fill="url(#g-roseta)"` e `opacity: .85`. Os motivos são pretos, o que já serve como tinta de
jenipapo/contorno; para outra cor, duplique o `<pattern>` trocando o preenchimento.

---

## 5. Pilha de camadas do palco (de trás para a frente)

| # | camada | tecnologia | mistura | observação |
|---|---|---|---|---|
| 1 | sala escura | CSS `background: var(--sala)` | normal | ocupa 1920×1080 |
| 2 | papel (luz) | `div` com gradiente | normal | recortado à área dos 3 painéis |
| 3 | textura do papel | SVG `rect` com `f-papel` | multiply, opac. .55 | estática, `will-change: transform` |
| 4 | poeira no feixe (fundo) | canvas | screen | metade das partículas |
| 5 | cenário L5 → L3 | SVG | multiply | ver 8.2 |
| 6 | cenário L2 (plano dos bonecos) | SVG | multiply | chão, troncos principais |
| 7 | bonecos + varetas | SVG | multiply (cor) | ver 6.5 |
| 8 | cenário L1 (colado à tela) | SVG | multiply | moldura de folhas das bordas |
| 9 | partículas de tela | canvas | chuva: multiply; vaga-lumes/brasas: screen | |
| 10 | L0 (entre a luz e a tela) | SVG | multiply | folhas gigantes desfocadas (transições) |
| 11 | gel | `div` | multiply, `opacity: var(--gel-opacidade)` | cobre 2–10 |
| 12 | vinheta | `div` com gradiente radial | multiply | `opacity: var(--vinheta)` |
| 13 | biombo (moldura) | SVG | normal | **por cima** do papel: os montantes tapam cenário e bonecos |
| 14 | lamparina + halo | SVG + `div` | halo: screen | à frente, à direita |
| 15 | cartelas e legendas | HTML | normal | fontes locais |
| 16 | interface (play, barra) | HTML | normal | some após 2 s sem mouse |

As camadas 2–12 ficam num contêiner com `clip-path` igual à área de papel e com
`filter: brightness(calc(var(--brilho) * var(--chama))) saturate(var(--saturacao))`.

---

## 6. Construção dos bonecos

### 6.1 Esqueleto humano padrão (11 peças)

Unidade `H` = altura do pé ao topo da cabeça, sem chapéu. Origem (0,0) no chão, entre os pés; y para
cima é negativo. Pivôs (`transform-origin` de cada `<g>`):

| peça | pai | pivô | tamanho |
|---|---|---|---|
| peito | raiz (vareta-mestra) | cintura (0, −0,56H) | do pescoço à cintura, largura .22H |
| cabeça | peito | pescoço (0, −0,84H) | altura .15H (adulto) |
| quadril | peito | cintura (0, −0,56H) | .10H de altura |
| perna D / E | quadril | quadril (±.025H, −0,48H) | **peça única** (coxa + canela + pé), .48H |
| braço D / E | peito | ombro (±.02H, −0,80H) | .17H |
| antebraço D / E | braço | cotovelo | .15H |
| mão D / E | antebraço | pulso | .07H (segura objetos: o objeto é filho da mão) |

- **Perfil sempre**: o boneco olha para +x; virar = `scaleX(-1)` no `<g>` raiz (ver 10.1).
- Corpo alongado, cabeça pequena e ombros estreitos (cânone do teatro de sombras: cabeça ≈ 1/7 da
  altura total no adulto). Mãos e pés um pouco maiores que o natural, para a sombra ler.
- O braço de trás (mais longe do público) é pintado 15% mais escuro (`filter: brightness(.85)`) e fica
  atrás do peito na ordem do DOM; o da frente fica por cima.
- A perna balança solta (pêndulo), como no boneco real; quem a move é o deslocamento do corpo.

### 6.2 Contorno, entalhe e rebites
- Contorno externo: `stroke: var(--contorno)`, **2,5 px** (bonecos com H ≥ 250) ou **2 px** (menores),
  `stroke-linejoin: round`.
- Linhas internas de entalhe (dobras de roupa, músculos, traços do rosto): 1,2 px, opacidade .8,
  traço com pontas afinando (desenhar como `path` preenchido, não como `stroke`).
- Em cada pivô: furos `#junta-furos` nas duas peças sobrepostas + `#rebite` por cima. Ao girar, os
  raios das duas peças desalinham e a luz pisca entre eles: é um detalhe bonito, não esconder.
- Discos de junta: as duas peças terminam num disco de raio 11 px (adulto) / 8 px (criança, bichos
  pequenos) centrado no pivô.

### 6.3 Rostos
- **Rosto vazado** (Tião, Zé, Vó): o interior do rosto é furo; ficam em couro o contorno (3 px), a
  sobrancelha, o olho amendoado (com pupila), o risco do nariz, a boca, a orelha e as rugas/barba.
- **Rosto cheio** (Curupira, bichos): tingido; os **olhos são furos** (o do Curupira com 5×3,5 px).
  Para o "olhar aceso" de fúria, um `ellipse` `--acafrao-claro` com `f-fogo` atrás do furo, opacidade
  0 → 1 em 0,3 s.

### 6.4 Varetas
- Pessoa: **vareta-mestra** presa no peito, logo abaixo do pescoço (0, −0,78H), e **duas de mão**
  presas no pulso. Bicho: cabeça/pescoço e anca/rabo.
- Desenho: `<line>` com `stroke: var(--contorno)`, **2,6 px** (mestra) e **2 px** (mãos), `opacity .55`,
  `stroke-linecap: round`; num único `<g class="varetas">` com `filter: blur(.6px)` (um filtro por
  boneco, não por linha). Na ponta presa ao couro, um laço de arame: `circle r=3`, sem preenchimento,
  traço 1,2 px.
- Geometria: a vareta vai do ponto de fixação até **y = 900** (abaixo do papel, que corta em 852),
  inclinada para **trás** do sentido do boneco: `x_baixo = x_fixo − dir · tan(θ) · (900 − y_fixo)`,
  com θ = 12° na mestra e 6°–20° nas de mão (θ = 8° + 0,2 · ângulo do antebraço). Calcular a cada
  quadro a partir da posição de mundo do ponto (`getCTM()`), sem estado: função só da pose.
- Varetas ficam por cima do boneco (o manipulador segura por trás, entre a luz e o couro).

### 6.5 Translucidez e distância da tela
- Cada peça: `fill` com a cor do couro + `mix-blend-mode: multiply` no `<g>` do boneco inteiro
  (o papel tinge o couro; com o gel noturno o boneco esfria junto) + `filter: url(#f-couro)` no mesmo
  `<g>`. Se o FPS cair abaixo de 50 com 4+ bonecos, retirar `f-couro` primeiro: é só textura.
- Nada de `opacity` < 1 nas peças (as sobreposições ficariam manchadas); a translucidez vem do multiply.
- **Distância da tela** `z ∈ [0, 1]` (0 = encostado, nítido e colorido; 1 = junto da luz):
  `scale(1 + .45·z)`, `filter: blur(14·z px) saturate(1 − .85·z) brightness(1 − .35·z)`.
  Usar para entradas mágicas do Curupira, susto, "vir para cima do público" e saídas.

---

## 7. Fichas de personagem

Alturas em px no palco 1920×1080 (chão dos bonecos em y = 800). Cores pelos tokens da seção 3.

### 7.1 Curupira — o guardião
> **REVISÃO OBRIGATÓRIA (fidelidade às fontes + crítica do 1º protótipo). Prevalece sobre o resto desta ficha.**
> - **Machado de casco de jabuti** (Tapajós, Barbosa Rodrigues) no lugar do tacape: cabo curto de madeira
>   torta e lâmina feita de uma placa de casco, com o padrão `g-jabuti` vazado. É com ele que bate nas sapopemas.
> - **Corpo coberto de pelos longos** (Rio Negro): o contorno de braços, pernas, costas e peito é recortado em
>   franjas/tufos (dente de serra irregular e mechas), com vazados em `g-espinha` sugerindo o pelo. Nada de
>   pintura de jenipapo nem saiote de fibras; no máximo um cinto de fibra torcida.
> - **Orelhas grandes** e **dentes verdes** (Solimões): orelha bem visível no perfil; os dentes verdes aparecem
>   quando ele abre a boca (assobio, riso, fala).
> - **Cabelos de fogo** continuam (imagem popular de hoje; a narração explica que, nesta tela, é a lamparina
>   que lhe acende o cabelo), mas **NUNCA em leque/coroa radial**: isso vira cocar de fantasia, que é proibido.
>   São mechas longas e assimétricas que saem do alto e da nuca e esvoaçam PARA TRÁS e para cima, como chama
>   ao vento, mais compridas atrás, pontas finas e curvas, sobrepostas.
> - Proporção de menino forte: cabeça grande, ombros largos para o tamanho, braços longos, pernas curtas e
>   arqueadas; ele é pequeno, mas tem "força prodigiosa".

- **Tamanho**: H = 190 (criança; mais 60 px de cabelo). Cabeça .22H (grande, infantil), pernas .40H.
  **13 peças**: as 11 do padrão + **2 pés separados** articulados no tornozelo.
- **Pés virados para trás (essencial)**: o calcanhar aponta para onde ele anda e os dedos para trás.
  O pé é peça própria, pivô no tornozelo, desenhado com os dedos para −x enquanto o corpo olha para +x.
  Ao virar o boneco, os pés viram junto (continuam contrários). Em close (cartela, entrada), dar 1 s de
  quadro parado com os pés bem visíveis e um `bloco_madeira`.
- **Pegadas**: a cada passo, uma `#pegada` com **escala −1 em x relativo ao sentido da marcha** (dedos
  para trás), cor `--contorno`, opacidade .55, multiply, no chão L2 (y = 806 ± 3); some em 6 s
  (`opacity → 0`). Os caçadores seguem as pegadas na direção errada: esse é o gag visual central.
- **Cabelos de fogo**: 9 mechas como peças próprias, presas na nuca e no topo da cabeça, gradiente
  linear raiz → ponta `--cabelo-3 → --cabelo-2 → --cabelo-1`, com `f-fogo`, **sem multiply** (é a única
  parte do boneco que brilha: `mix-blend-mode: screen` sobre o próprio boneco). Animação contínua por
  função de t: mecha i gira `6°·sin(2π·f_i·t + φ_i)` com f_i ∈ [0,8; 1,4] Hz e comprimento
  `1 + .08·sin(…)`. Na fúria: amplitude 14°, f × 1,8, comprimento +25%, soltar 3–5 brasas (11.4).
- **Corpo**: pele `--argila` com toque de urucum; pintura corporal de jenipapo (`--jenipapo`) em
  listras e `g-voluta`/`g-ponto` no peito e nos braços; rosto cheio, olhos vazados, sorriso maroto.
  Dentes esverdeados aparecem só na risada (detalhe da tradição, discreto).
- **Saiote de fibras/folhas**: 10 tiras independentes (pivô na cintura) com balanço secundário
  (`4°·sin(…)` atrasado 0,15 s em relação ao quadril), couro `--verde-mata` e `--acafrao` alternados;
  faixa da cintura com `g-roseta` vazado. Fibras também nos tornozelos e nos pulsos.
- **Tacape**: bastão de madeira com a cabeça em gota, `--argila` escura, faixa `g-grega` vazada; filho
  da mão direita. Ele o bate no tronco (`batida_tronco`).
- **Varetas**: 3 (peito e mãos).
- **Gestos**: anda saltitando (bob 10 px, passo curto e rápido), surge do desfoque (z 1 → 0), some com
  um giro e um sopro, assobia (mão na boca), ri com a cabeça para trás, monta no queixada.

### 7.2 Tião — caboclo velho
- **Tamanho**: H = 320 (+30 px de chapéu). Ombros caídos, joelhos levemente dobrados.
- **Chapéu de palha** de aba larga, copa baixa, `--palha` como couro (`--acafrao` dessaturado:
  `#C9A15A`), aba com `g-trancado` vazado e fita `--urucum` na copa.
- **Rosto vazado** com **barba** grisalha: barba em couro recortado em mechas (dente de serra
  irregular), bigode caído.
- Camisa de algodão cru (`--couro-cru`) com remendo em `--anil`; peito com `g-losango`; calça `--anil`
  arregaçada; alpercatas de couro.
- **Espingarda** de cano longo e coronha de madeira (`--argila` escura, cano `--contorno` sólido), filha
  da mão direita; **bornal** de palha a tiracolo com `g-jabuti`, alça com `g-cobra`; facão na cintura.
- **Varetas**: 3. **Gestos**: anda pesado (bob 4 px, passo lento), apoia a espingarda no ombro, agacha
  para ler rastro, coça a barba, aponta.

### 7.3 Zé — jovem caçador
- **Tamanho**: H = 330 (+24 px de chapéu). Magro, comprido, impulsivo.
- **Chapéu de palha surrado**: aba mais estreita, com 2–3 "mordidas" no contorno e palha solta
  (fiapos de 1,5 px), `g-trancado`.
- Rosto vazado, sem barba, cabelo escapando do chapéu. Camisa aberta `--verde-mata` com `g-espinha`,
  calça `--argila`, pés descalços.
- **Facão** na mão (lâmina `--contorno` com um filete vazado ao longo do fio, cabo `--argila`).
- **Varetas**: 3. **Gestos**: anda rápido e desengonçado (bob 7 px), golpeia o mato com o facão,
  dá risada alta com o tronco para trás, recua com medo (z sobe para .3 e treme).

### 7.4 Vó — benzedeira
- **Tamanho**: H = 270, costas curvadas (peito inclinado 12° para a frente), passo miúdo.
- **Lenço** na cabeça `--anil` com `g-ponto`, amarrado na nuca (pontas soltas com balanço);
  xale `--argila-clara` com franja; saia longa `--acafrao` com barra em `g-degrau`.
- Rosto vazado com rugas finas e coque.
- **Cachimbo de barro** (`--barro`) na boca; fumaça em espiral (`g-voluta` como desenho: 3 volutas
  que sobem 60 px e se desfazem, `blur` crescente, ciclo de 4 s).
- **Terço de sementes**: 14–18 contas (círculos de 4 px em couro `--urucum`, cada uma com um furo de
  1,2 px), pendurado na mão esquerda, balanço de pêndulo.
- **Ramo de arruda** na mão direita para benzer (folhinhas em `g-espinha` vazado): o gesto de benzer
  é o ramo descrevendo uma cruz lenta (4 tempos, 0,6 s cada) com `maraca` suave.
- **Varetas**: 3. **Gestos**: benzer, apontar o dedo em advertência, sentar no banquinho, contar
  história com as mãos abertas.

### 7.5 Cachorro de caça
- 110 de altura × 210 de comprimento. Vira-lata magro, orelhas caídas, costelas aparentes (3 vazados
  em fenda no flanco). Couro `--argila-clara` com mancha `--argila`.
- Peças: corpo, cabeça, **mandíbula** (latido: abre 18° em 0,08 s), 4 patas (1 peça cada), rabo
  (2 segmentos). **Varetas**: 2 (pescoço, anca).
- Gestos: fareja o chão (cabeça baixa, focinho tremendo 3 Hz), late, recua de rabo entre as pernas
  (`cachorro_ganido`).

### 7.6 Onça-pintada
- 170 × 420. Peças: cabeça, mandíbula, pescoço, tronco dianteiro, tronco traseiro (dobra na cintura,
  para o salto), 4 patas de 2 segmentos, rabo de 3 segmentos.
- Couro `--acafrao`, barriga `--couro-cru`; **rosetas como pintura** (`g-roseta` em `--contorno`,
  `fill-opacity .85`) e **vazado fino de `g-ponto`** na barriga; olho vazado.
- **Varetas**: 2. Gestos: caminhar ondulante (ombros sobem e descem alternados), agachar e saltar
  (arco parabólico com o corpo dobrando na cintura), esturro (mandíbula 30°, cabeça para cima).

### 7.7 Veada prenhe
- 210 × 230. Delicada, pescoço longo, orelhas grandes articuladas (2 peças), **barriga arredondada**.
- Couro `--argila-clara`, garganta e cauda `--couro-cru`, `g-ponto` claro no dorso (lembrança das
  pintas de filhote). **Varetas**: 2.
- Gestos: orelhas em alerta (giro rápido de 20°), olhar para trás, fuga em saltos longos
  (`veado_alarme`). A cena dela é de piedade: luz quente, movimentos lentos.

### 7.8 Queixada e caititu
- 90 × 170. Corpo em barril, pernas finas, focinho longo; **cerdas do dorso** com `g-serra` no recorte
  do contorno. Queixada: couro `--jenipapo` com queixo `--couro-cru`; caititu: `--argila` com **colar
  claro** (faixa vazada de `g-cobra` em escala .8).
- Peças: corpo, cabeça, mandíbula (bate os dentes: 4 aberturas de 6° a 7 Hz = `queixada_dentes`), 4
  patas. **Varetas**: 2.
- Bando: 5–9 instâncias com escala 0,85–1,1, atraso de 0,06–0,3 s e cada uma num z diferente (0 a .4)
  para a manada ter profundidade e poeira (11.5).

### 7.9 Araras
- Envergadura 180, corpo 120. Couro `--urucum` (vermelha), asas com faixas `--acafrao` e `--anil`,
  cauda longa em 2 penas. Peças: corpo, 2 asas (2 segmentos cada), cauda. **Vareta**: 1 (corpo).
- Voo: asas batem 3 Hz (`sine.inOut`), trajeto em arco; revoada = 6–10 em grupo com fase aleatória.

### 7.10 Bugio
- 150 sentado. Ruivo (`--urucum` escuro `#8E3018`), barba vazada em fendas, rabo preênsil de 4
  segmentos enrolado no galho. Mandíbula articulada para o ronco (`bugio`). **Varetas**: 2.

### 7.11 Tatu
- 60 × 140. Carapaça em faixas articuladas (5 cintas) com `g-jabuti`; focinho fino; corre em trote
  rápido de 4 Hz. **Vareta**: 1.

### 7.12 Urutau
- 120 de altura, pousado na ponta de um toco, **imóvel como galho** (camuflagem): mesma tinta do
  cenário (`--sombra-tinta`, sem cor), só os **olhos grandes vazados** com gel `--acafrao-claro`
  denunciam o bicho. Peças: corpo, cabeça, bico (abre para o canto `urutau`). Aparece nas cenas de
  noite como presságio.

---

## 8. Cenário

> **Qualidade das silhuetas (crítica do 1º protótipo):** proibidas árvores-pirulito (copa feita de círculos)
> e folhas-bolha (discos pretos). Cada planta precisa de recorte botânico reconhecível: folíolos finos e
> pendentes nas palmeiras, fenestrações e recortes na costela-de-adão, brácteas em zigue-zague na helicônia,
> rosetas pontudas na bromélia, sapopemas em lâminas na samaúma, cipós com folhas alternadas. Cenário também é
> couro entalhado: bordas com recorte de faca e alguns vazados.

### 8.1 Inventário de silhuetas (medidas em L2; nas outras camadas, aplicar a escala de 8.2)

| peça | silhueta | medidas | camadas | vazados / detalhe |
|---|---|---|---|---|
| **Samaúma** | tronco reto e largo saindo pelo topo do papel; **sapopemas** = 5 abas triangulares curvas abrindo no chão | tronco 160–200 de largura; sapopemas até 260 de altura × 520 de base | L2, L4 | casca com `g-losango` 1,6× em faixas verticais; um oco entre sapopemas (morada do Curupira) |
| **Buriti** | estipe liso com anéis; folhas em leque redondas, 40–60 folíolos radiais | 520–700 de altura, leque Ø 220 | L3, L4, L5 | fendas radiais entre folíolos |
| **Açaí** | touceira de 4–8 caules finos (8–12 px) inclinados, folhas pinadas pendentes, cachos de frutos | 480–620 | L2, L3 | frutos como `g-ponto` 2× |
| **Embaúba** | tronco fino com anéis, galhos em candelabro, folhas grandes palmadas de 7–9 lobos | 420–560, folha Ø 110 | L2, L3 | nervuras em fendas finas |
| **Helicônia** | brácteas em zigue-zague (pendentes ou eretas) sobre folhas longas | 160–240 | L1, L2 | **pode ter cor**: `--urucum`/`--acafrao`, `g-espinha` |
| **Bromélia** | roseta de folhas em arco, centro vermelho | 60–90 | L1, L2 (em galhos e no chão) | **pode ter cor** no centro (`--urucum`) |
| **Costela-de-adão** | folha grande recortada e furada (as fenestrações já são vazados) | folha 140–200 | L1 | furos ovais naturais |
| **Samambaia** | frondes pinadas arqueadas; samambaiaçu arborescente no fundo | 120–180 / 380 | L1 / L3 | folíolos recortados |
| **Cipós** | curvas em S e espirais pendentes do alto ligando árvores, folhinhas alternadas | traço 4–10 px | L1–L3 | grossos com `g-cobra`; o cipó que torce é peça animável |
| **Capim** | tufos de lâminas finas | 40–90 | L1 (rodapé) | balanço `2°·sin` com fase por tufo |
| **Chão de folhas** | faixa ondulada com folhas soltas | y 790–852 | L2 | folhas soltas com `g-espinha`; as pegadas ficam aqui |
| **Ipê-amarelo** | tronco tortuoso, copa sem folhas coberta de flores | 500 | L2 | flores em couro `--acafrao` translúcido: imagem final da aurora |
| **Riacho** | faixa de água com margem de pedras | altura 40–60 | L2 | `g-agua` vazado, deslocando 8 px/s em x |
| **Rancho da Vó** | casa de pau-a-pique, telhado de sapê, janela com luz de candeeiro, banco e pilão | 420 × 360 | L2 | parede com `g-trancado` (taipa), janela vazada com gel `--acafrao` |
| **Toco / árvore caída** | tronco cortado com anéis; árvore tombada | variável | L2 | anéis em fendas concêntricas com pontes |

### 8.2 Regras de profundidade (6 camadas)

| camada | o que é | opacidade da tinta | desfoque | escala | paralaxe |
|---|---|---|---|---|---|
| L5 | horizonte de mata | .16 | 7 px | .50 | .15 |
| L4 | árvores distantes | .28 | 4 px | .65 | .30 |
| L3 | mata média | .48 | 2 px | .82 | .55 |
| L2 | plano dos bonecos (chão, troncos) | .85 | .6 px | 1 | 1 |
| L1 | colado à tela: moldura de folhas no topo e nas laterais, capim | .95 | 0 | 1,1–1,4 | 1,3 |
| L0 | entre a luz e a tela (transições) | .55 | 18 px | 2,2+ | 2 |

- Toda a tinta do cenário é `fill: var(--sombra-tinta)` com `fill-opacity` da tabela e
  `mix-blend-mode: multiply` na camada; o desfoque é `filter: blur()` no `<g>` da camada (um filtro
  por camada, nunca por peça).
- Só L2 e L1 têm vazados (nas outras, o desfoque come o detalhe).
- **Composição**: densidade alta nas bordas e baixa no centro (clareira de luz, como na referência).
  L1 pendura do topo até 180 px e entra pelas laterais até 220 px. Deixar 120 px livres acima da
  cabeça dos bonecos. L1 nunca cobre rosto.
- Paralaxe: em travessias, cada camada anda `dx · fator` (tabela). O cenário inteiro ainda acompanha o
  tremor da chama (11.6).

---

## 9. Moldura e palco

### 9.1 Geometria (px, palco 1920×1080)

| elemento | x | y | notas |
|---|---|---|---|
| moldura externa do biombo | 36–1884 | 20–904 | madeira `--madeira` |
| travessa superior | 36–1884 | 20–52 | entalhe de `g-grega` 2× (relevo: furo pintado `--madeira-escura`) |
| papel (área visível) | 72–1848 | 52–852 | `clip-path` das camadas 2–12 |
| montantes laterais | 36–72 e 1848–1884 | 20–904 | 36 px |
| montantes internos | 641–675 e 1245–1279 | 20–904 | 34 px; painéis de 569/570/569 px |
| travessa inferior | 36–1884 | 852–904 | faixa de **palha trançada** (`g-trancado` em `--palha` sobre `--palha-sombra`, 2×) entre dois filetes de `g-serra` |
| pés do biombo | 4 pés de 28 px em x 52, 644, 1248, 1860 | 904–968 | |
| topo dos montantes | — | 4–20 | remates entalhados em gota (lembrança de carranca, sem rosto) |
| lamparina | centro x 1772 | bico em y 892 | de barro, sobre um toco entalhado (x 1730–1814, y 930–1080) |
| chama | x 1792 | base y 884, altura 46 | ver 11.6 |
| zona de legendas | 340–1580 | 930–1050 | sobre `--sala-chao` |

- **Madeira**: `--madeira` com veios (linhas finas `--madeira-escura`) e as arestas superiores dos
  entalhes em `--madeira-luz`, com um gradiente que aquece do lado direito (a lamparina ilumina pela
  frente e pela direita).
- **Montantes**: entalhe vertical de `g-degrau` e, no meio da altura, um medalhão em losango.
- Fora do biombo, só escuro (`--sala`) com um halo da lamparina:
  `radial-gradient(circle 420px at 1792px 880px, var(--halo), transparent 70%)`, `screen`,
  intensidade multiplicada por `--chama`.

### 9.2 Papel

```css
.papel {
  background: radial-gradient(ellipse var(--hotspot-rx) var(--hotspot-ry) at var(--hotspot-x) var(--hotspot-y),
    var(--papel-centro) 0%, var(--papel-meio) 42%, var(--papel-borda) 78%, var(--papel-canto) 100%);
}
.vinheta {
  background: radial-gradient(ellipse 75% 80% at 50% 45%, transparent 55%, #000 100%);
  mix-blend-mode: multiply; opacity: var(--vinheta);
}
```
- Textura: um `<svg>` do tamanho do papel com `<rect width="100%" height="100%" filter="url(#f-papel)"/>`,
  `mix-blend-mode: multiply; opacity: .55`. É estática: renderize uma vez e não a anime.
- Cada painel tem um gradiente próprio levíssimo (`rgba(0,0,0,.06)` nas bordas do painel) para os três
  papéis parecerem folhas distintas esticadas.
- Material declarado: **papel artesanal de fibra de bananeira** (manchas e fios curtos).

---

## 10. Linguagem de movimento

### 10.1 Gestos (timeline GSAP; durações em segundos)

| gesto | receita | ease |
|---|---|---|
| **respirar (parado)** | peito ±1°, 0,25 Hz; cabeça ±0,6°, fase +0,4 | `sine.inOut` (ou função de t) |
| **andar** | raiz desliza em x a 90–140 px/s; bob vertical de 4–10 px por passo (passo = 0,45–0,6 s); pernas pendulares ±16°; braço da vareta ±10° em oposição | `none` no x; `sine.inOut` no bob |
| **correr** | 260–380 px/s; bob 12 px; tronco inclinado 8° à frente; pernas ±28° | idem |
| **virar** | `scaleX` 1 → −1 em 0,14 s, com z subindo para .25 no meio (desfoca de leve) e voltando | `power2.inOut` |
| **falar** | cabeça acena 2–3° nas sílabas tônicas (sementes fixas, 2,5 Hz) enquanto dura a fala; bichos abrem a mandíbula | `power1.out` |
| **pose de impacto** | vai à pose em 0,18 s e **segura 0,25 s** parada, com o som de pontuação (`bloco_madeira`, `tambor_grave`) no quadro do impacto | `back.out(2)` |
| **susto** | recuo de 30 px + z → .3 em 0,12 s; tremor de ±2 px a 18 Hz por 0,4 s | `power3.out` |
| **cair** | gira 80° em torno do pé + desce 40 px em 0,5 s; quique de 6 px | `bounce.out` |
| **pular** | arco parabólico (x linear, y `power2.out` / `power2.in`), pernas dobradas 25° no ar | |
| **surgir (Curupira)** | z 1 → 0 em 1,2 s (vem grande e desfocado e "pousa" na tela), com `gongo_sobe` | `expo.out` |
| **sumir (Curupira)** | giro de 360° em 0,4 s + z 0 → 1 + opacidade 0, com `sopro_apaga` ou `assobio_curupira` | `expo.in` |
| **cômico** | qualquer gesto em `steps(4)` (movimento "aos trancos" de boneco) | `steps(4)` |

Regras: nada fica 100% parado (sempre respiração); cada ação importante tem uma pontuação
percussiva no quadro exato; os bonecos não atravessam os montantes devagar (cruzam em ≤ 0,5 s ou
param antes).

### 10.2 Transições de cena
1. **Apagar a lamparina** (troca de lugar ou de tempo): `--brilho` → .08 em 0,8 s, troca o cenário no
   escuro, volta em 1,2 s. A chama da lamparina da frente diminui junto (sopro + `fosforo` na volta).
2. **Mão do contra-regra**: as peças de cenário deslizam na horizontal para fora/dentro do papel em
   1,2 s (`power2.inOut`), com desfoque que sobe a 4 px no meio do trajeto (a peça é "levantada" da
   tela).
3. **Folha que passa**: uma folha gigante de L0 (costela-de-adão, escala 3) cruza o papel em 0,9 s,
   cobrindo a troca. Ideal para cortes rápidos na mata.
4. **Cartela de capítulo** (10.3), quando o roteiro tem `capitulo`.

### 10.3 Cartela de capítulo (capa de cordel em xilogravura)
- Tamanho 520 × 740 (proporção de folheto), centrada no painel do meio (x 700–1220, y 82–822),
  levemente torta (−1,2°), como um folheto preso na tela, **iluminada pela frente** (opaca).
- Papel `#EDE0C2` com `f-papel` a .35; borda preta de 10 px a 14 px da beira + filete de 2 px a 6 px
  para dentro; faixas de `g-serra` em preto no topo e na base.
- Conteúdo, de cima para baixo: "CAPÍTULO II" em Alegreya itálico 30 px, `letter-spacing .12em`;
  **título em Piedra**, caixa-alta, 92–110 px, entrelinha .95, máx. 2 linhas; **xilogravura** 440 ×
  380: silhueta preta do tema do capítulo (onça, chapéu, samaúma, lamparina…) com goivadas brancas
  (`g-agua`, `g-espinha` como furos) e um sol de raios triangulares atrás, o clássico das capas de
  cordel; na base, uma fileira de `g-losango`.
- Tudo o que é tinta preta passa por `filter: url(#f-xilo)`.
- Animação: entra de y + 30 com `scale 1.08 → 1` e rotação −3° → −1,2° em 0,35 s (`power3.in`, um
  carimbo), com `tambor_grave` + tremor do palco de 4 px por 0,15 s; o papel atrás escurece
  (`--brilho` .35); fica 3–4 s; sai descendo 40 px com fade em 0,6 s (`power2.in`).
- A abertura usa a mesma cartela como **capa do folheto**: "CURUPIRA, O GUARDIÃO DA MATA".

---

## 11. Partículas e efeitos (Canvas 2D)

Regra de ouro: **tudo é função do tempo** (`t = audio.currentTime`). Cada partícula i tem sementes
fixas (`mulberry32(semente + i)`) e posição calculada a partir de t, sem integrar estado entre
quadros. Assim o *seek* e o `?t=` funcionam. Um canvas de 1920×1080 com `devicePixelRatio` limitado a 2.

### 11.1 Vaga-lumes (noite, entardecer tardio)
- 24–40 pontos. Núcleo 2,5–4 px `--vagalume`; halo radial de 14 px `--vagalume-halo`; `screen`.
- Piscar: aceso 0,3–0,7 s, apagado 1–4 s, com subida/descida de 0,12 s (fase por semente).
- Trajeto: `x = x0 + 40·sin(.13t + φ) + 12·sin(.71t + ψ)`, `y = y0 + 25·sin(.17t + θ)`, só na metade
  inferior do papel.

### 11.2 Chuva (chuva_mata, tempestade)
- 2 planos: fundo 250 riscos (12–20 px, `rgba(36,20,10,.18)`, `blur` 1 px) e frente 350 riscos
  (22–34 px, `rgba(23,12,5,.35)`), inclinação 12°, velocidade 1400–1900 px/s, `multiply` (chuva é
  sombra no papel).
- Posição: `y = (y0 + v·t) mod 900`. Respingos: no chão (y ≈ 800), arcos de 4 px que duram 0,15 s.

### 11.3 Relâmpago
- Sequência (s): `--brilho` 1,9 por .07 → .45 por .09 → 1,6 por .05 → decai para o valor da cena em .4;
  durante o clarão `--gel-opacidade` → 0 e `--papel-centro` → `#EEF2FF`, e o desfoque de L3–L5 cai à
  metade (tudo fica mais duro).
- Opcional: raio recortado em couro (zigue-zague com `g-serra`) que aparece por .12 s em L4.
- `relampago_estalo` no quadro do clarão; `trovao` 0,6–2,5 s depois (mais perto = menos atraso).

### 11.4 Brasas (lamparina, fúria do Curupira)
- 6–12 vivas por vez. Cor `#FFB347 → #FF5A1F → transparente` ao longo da vida (1,5–3 s), 1,5–3 px,
  `screen` com `f-fogo` simulado por `shadowBlur 6`.
- Sobem 40–80 px/s com oscilação lateral `6·sin(3t + φ)`. Na lamparina nascem na ponta da chama; no
  Curupira, nas pontas das mechas.

### 11.5 Poeira no feixe
- 60–120 grãos de 1–2 px, `rgba(255,235,190,.25)`, `screen`, dentro de uma elipse centrada no hotspot
  (rx 500, ry 380); deriva lenta de 3–8 px/s. Intensidade × `--poeira`.
- Na manada de queixadas: rajada de 200 grãos `rgba(60,40,20,.25)` (`multiply`) levantando do chão.

### 11.6 Tremor da chama (o coração do palco)
- Sinal único, calculado a cada quadro:
  `f(t) = 1 + A·(.018·sin(2π·1,7t) + .012·sin(2π·3,1t + 1,3) + .008·sin(2π·7,3t + .4) + .01·ruido(t))`,
  com `A = --tremor` do estado (lamparina 1, noite .3, tempestade 1,6) e `ruido` = interpolação suave
  de valores sorteados a cada 0,1 s (semente fixa).
- `--chama = f(t)` (escrito no palco): modula o brilho do papel e o halo da lamparina.
- Chama da lamparina: `<path>` em gota com gradiente `--chama-nucleo → --chama-corpo → --chama-borda →
  --chama-ponta`, `scaleY(f(t)·1.0 ± .08)`, `skewX(±4°)` pelo mesmo sinal, `f-fogo`.
- O cenário inteiro desloca `dx = 40·(f(t) − 1)` px (±1,5 px): as sombras "respiram" com a chama.
- Quando o **narrador** fala, `A` sobe 20% (a lamparina "conta" a história).

---

## 12. Tipografia

| uso | fonte | por quê |
|---|---|---|
| **display** (título, cartelas, créditos) | **Piedra** (Sudtipos, 2011) — OFL 1.1 | Letra de caixa-alta pesada e talhada, com bordas irregulares de entalhe: tem a força das letras cavadas na madeira das capas de cordel. Fundição latino-americana (Argentina). Tem latin-ext e acentos do português (ç, ã, õ). Nome "Piedra" é reservado pela OFL: não renomear nem modificar o arquivo. |
| **legendas e textos** | **Alegreya** (Juan Pablo del Peral / Huerta Tipográfica, 2011) — OFL 1.1 | Serifada "literária", de ritmo caligráfico, elegante e muito legível em tamanho de legenda; itálico verdadeiro (narrador) e pesos 400–800 numa fonte variável. Também latino-americana. |

- Arquivos: `curupira/fontes/` (woff2, subsets latin + latin-ext) e `curupira/fontes/fontes.css`
  (`@font-face` com caminhos relativos, `font-display: block` para não piscar fonte de sistema nas
  capturas). Licenças em `fontes/OFL-Piedra.txt` e `fontes/OFL-Alegreya.txt`.
- Uso: `<link rel="stylesheet" href="fontes/fontes.css">`; `font-family: 'Piedra', serif;` e
  `font-family: 'Alegreya', Georgia, serif;`.
- **Legenda**: Alegreya 500, 42 px, entrelinha 1,25, máx. 2 linhas, `--texto`,
  `text-shadow: 0 2px 8px rgba(0,0,0,.85)`. **Narrador em itálico**; fala de personagem com o nome
  antes, em Alegreya 700, 30 px, caixa-alta, `letter-spacing .08em`, na cor `--nome-*` do personagem.
  Entrada da legenda: opacidade 0 → 1 e y + 6 → 0 em .25 s.
- Piedra só em caixa-alta e só ≥ 48 px. Alegreya nunca abaixo de 28 px no palco lógico.

---

## 13. Dependências locais

| arquivo | versão | licença | origem |
|---|---|---|---|
| `js/vendor/gsap.min.js` | **GSAP 3.15.0** (mais recente no cdnjs em 2026-10-06) | "Standard 'No Charge' GreenSock License" — <https://gsap.com/standard-license> | <https://cdnjs.cloudflare.com/ajax/libs/gsap/3.15.0/gsap.min.js> (SRI conferido: `sha512-oJ8QbaQThQoJZ7oEv+29jfPM6CcP+zUxh3PKJs1vyOhx0UraUrE7PQgeItu3dOuCJyrzWpoYMsVjkkPEBzbUqw==`) |
| `fontes/piedra-*.woff2` | Google Fonts v27 | OFL 1.1 | fonts.gstatic.com |
| `fontes/alegreya-*.woff2` | Google Fonts v41 (variável 400–800, normal + itálico) | OFL 1.1 | fonts.gstatic.com |

**Atenção à licença do GSAP**: não é MIT nem OSI. É gratuita inclusive para uso comercial e permite
redistribuir o arquivo junto do site; a restrição é não usar o GSAP em ferramentas visuais "sem código"
que concorram com o Webflow, o que não é o nosso caso. Não está na lista de licenças do briefing, mas
a arquitetura já escolheu o GSAP: registrar em `CREDITOS.md` com o nome e o link da licença acima.
Só o núcleo (`gsap.min.js`); não usamos plugins.

---

## 14. Fontes da pesquisa

- Técnica chinesa (couro raspado e translúcido, tintas transparentes, entalhe, juntas em roda, varetas):
  <https://www.chineseshadowpuppetry.com/plastic-shadow-puppet>,
  <https://vaia.com/en-us/explanations/chinese/chinese-vocabulary/chinese-shadow-puppetry>,
  <https://disco.teak.fi/asia/?p=56>, <https://umma.umich.edu/objects/shadow-puppet-cloud-1998-2-58/>
- Rostos vazados × cheios, perfil, varetas de bichos (escola de Luanzhou):
  <https://ccrma.stanford.edu/~bt5/shadow/text-puppet_characters.html>,
  <https://www.rrncommunity.org/items/624056> (MOA/UBC: cabeças separadas, 3 varetas, juntas de fibra)
- Teatro de sombras no Brasil (Cia. Teatro Lumbra, "sombratização"):
  <https://revistas.ufg.br/artce/article/view/39287>,
  <https://www.udesc.br/arquivos/ceart/id_cpmenu/14617/Teatro_de_Sombras_ao_Vivo_16608516610564_14617.pdf>
- Grafismos marajoara e kadiwéu (simetria espelhada, labirintos, degraus, espirais; respeito ao
  significado social dos desenhos): <https://repositorio.museu-goeldi.br/handle/mgoeldi/2407>,
  <https://periodicos.usp.br/revmae/article/download/89975/92750/129070>,
  <https://revistas.usp.br/ra/es/article/view/133463>
- Xilogravura de cordel e J. Borges:
  <https://unifor.br/-/cordelteca-da-unifor-abriga-obras-de-j-borges-um-dos-mais-importantes-xilogravuristas-do-brasil>
- Mamulengo (madeira de mulungu, tipos sociais caricatos):
  <https://www.correiodamanha.com.br/nacional/centro-oeste/2025/06/203971-mamulengo-e-patrimonio-no-df.html>
- Carrancas do São Francisco (Mestre Guarany): <https://ojs.uel.br/revistas/uel/index.php/boitata/article/download/40149/28853/212168>
- Curupira (pés virados, cabelos de fogo, dentes verdes, protetor da mata):
  <https://www.nationalgeographicbrasil.com/cultura/2025/08/qual-e-a-origem-do-curupira-no-dia-do-folclore-saiba-mais-sobre-o-curioso-personagem>,
  <https://www.todamateria.com.br/curupira/>
- GSAP: <https://api.cdnjs.com/libraries/gsap>, <https://gsap.com/standard-license>
- Fontes: <https://github.com/google/fonts/tree/main/ofl/piedra>,
  <https://github.com/google/fonts/tree/main/ofl/alegreya>
