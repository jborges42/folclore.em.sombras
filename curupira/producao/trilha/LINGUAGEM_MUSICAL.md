# Linguagem musical — Curupira (versão 2)

**Do teatro de sombras oriental vem só a atmosfera.** Fica o conto contado à luz da lamparina: mistério, suspense,
percussão que pontua cada gesto do boneco, silêncios dramáticos, música que conduz a cena. **O som é todo
brasileiro**: modos nordestinos, harmonia de viola, rabeca cantando toada, sanfona, cuíca, berimbau, batuques de
maracatu, de banda de couro e de bumba-meu-boi.

A versão 1 foi reprovada porque as flautas, as escalas pentatônicas e os gongos davam cor oriental. Por isso:

- **Fora**: flauta, pífano, quena, ocarina, kalimba, marimba, saltério (nunca como melodia, nem como cor), escala
  pentatônica, gongo de qualquer tipo (inclusive o que sobe e o que desce), bloco de madeira acelerando à moda
  chinesa, banjo. `temas.PROIBIDOS` lista esses timbres e `python temas.py` falha se algum deles aparecer.
- **Melodia** é sempre da rabeca, da viola ou da sanfona (a cuíca e o berrante entram como vozes de personagem).
  Toda melodia principal usa pelo menos 6 notas diferentes, e o `temas.py` confere isso, porque melodia
  pentatônica não passa.
- **Harmonia**: todo tema tem acompanhamento de acordes. A viola faz ponteio ou rasqueado, a sanfona sustenta
  acordes ou faz baixo-acorde, e a zabumba ou o surdo marcam o baixo.

O material está em `temas.py` e a prévia em `temas_demo/`.

## 1. Instrumentos

| Instrumento | Papel | Timbre na prévia (`temas_demo.py`) |
|---|---|---|
| **Rabeca** | voz principal: toada com apojaturas e escorregões, aboio, risada do Curupira, moto-perpétuo | amostras de violino (VSCO2, CC0) com EQ nasal |
| **Viola caipira** (cebolão em Ré) | ponteio (`PONTEIO`, `PONTEIO3`), rasqueado de baião (`RASQUEADO`), segunda voz em terças, melodia da Vó e pegada do Curupira | amostras de cordas de aço pinçadas, em par de oitava nos bordões. Acorde com 3 notas ou mais é rasqueado: 12 ms entre cordas, do grave ao agudo |
| **Sanfona** | fole sustentado (`FOLE`, `FOLE3`), baixo-acorde de marcha (`BAIXO_ACORDE`), estocadas (`ESTOCADA`), melodia em terças no final, drone arrastado da noite | `sintese.sanfona()` no teclado (palhetas livres em tremolo/musette, espectro ajustado às amostras reais). Nos baixos (até Ré3), amostras reais de acordeom e harmônio (`sanfona__Bb2`, `sanfona__G2`) |
| **Cuíca** | voz misteriosa do Curupira: "uí" no contratempo e gemidos longos | 8 gemidos reais (`cuica__1..8`, Freesound CC0), transpostos para que o **topo** do "uí" caia na nota escrita. Nota longa = gemidos em fila |
| **Berrante** | chamado dos caçadores, aboio | chifre de boi soprado real (`berrante__B4`), transposto |
| **Berimbau** | solto (DOIM), preso (DIM) e zum (dobrão encostado, para suspense) | `sintese.berimbau` |
| Alfaia, surdo, zabumba + bacalhau, caixa, prato de banda | marcação, golpes, marcha, baque | amostras `alfaia__1/2`, `surdo__1/2`; síntese para zabumba, caixa e prato |
| Matraca de bumba-meu-boi | o golpe seco e o acelerando | tábuas (claves bem abafadas, 5 semitons abaixo) + o estalo do ar |
| Gonguê, agogô, triângulo, ganzá, caxixi, maracá, pau-de-chuva | cor e contratempo | amostras (`gongue__1`, `triangulo__1/2`, `agogo`, `maraca`, `pau_de_chuva`) e síntese |

As amostras novas desta versão são todas CC0 e estão registradas em `sons/musica/fontes.json`: `sanfona__C5`,
`sanfona__Bb2`, `sanfona__G2`, `cuica__1..8`, `berrante__B4`, `alfaia__2`, `gongue__1`, `triangulo__1/2`. Nas
melódicas, a descrição traz a altura medida ("NNN Hz"), então o `_amostrada(prefixo, nota, ...)` dos
compositores já afina essas amostras.

## 2. Fórmulas de percussão por função dramática

A **batida** é o golpe principal: alinhe-a com o gesto do boneco. Os eventos prontos estão em
`temas.FORMULAS[chave]["eventos"]`, com tempos em segundos. A coluna "melodia" indica as fórmulas que trazem
uma frase em `["melodia"]`.

**Sílabas** (`temas.SILABAS`; cada fórmula se lê em voz alta):

| Sílaba | Instrumentos |
|---|---|
| TUM | alfaia + surdo + prato de banda |
| TÁ | gonguê + caixa |
| TLIM | triângulo |
| TCHI | prato abafado + caxixi |
| PÁ | matraca |
| DÁ | caixa |
| DUM | surdo |
| BUM | zabumba + alfaia |
| BÃO | surdo + prato ressoando |
| TCHÁ | prato |
| TIQUI / TOCO | agogô agudo / grave |
| XI | caxixi |
| CHUA | maracá |
| CHUVA | pau-de-chuva |
| DOIM / DIM / ZUM | berimbau solto / preso / zum |
| UÍ | cuíca |
| UÔ | glissando grave de rabeca |

`GÃO` e `TI` continuam valendo como apelidos de `BÃO` e `TLIM`, para os scripts da versão 1.

| Função | Chave · nome | Padrão (fala) | Batida (s) |
|---|---|---|---|
| Entrada | `entrada` · Quatro Pancadas | rrrum pá-dá \| TUM tchi \| TÁ tchi \| TUM! | 3,10 |
| Entrada do Curupira | `entrada_curupira` · Chegada do Curupira | matraca acelerando \| UÍ xi \| tiqui-toco xi \| DOIM-dim … uí | 2,80 |
| Entrada dos caçadores | `entrada_cacadores` · Chegada dos Caçadores | DUM · DUM · BUM-BUM \| TUM tchi \| TUM tchi \| TUM! + **berrante** (melodia) | 3,40 |
| Pose | `pose` · Parada | a matraca acelera e tudo para: TUM! — silêncio … tlim | 1,20 |
| Revelação | `revelacao` · Clarão | (chuva) … dum … UÍ-doim … tlim | 1,60 |
| Susto | `susto` · Espanto | BUM-dá-TCHÃ! | 0,22 |
| Golpe | `golpe` · Pancada | pá-dá-TUM! | 0,24 |
| Queda | `queda` · Três Pancadas e Tombo | TUM · TUM · TUM \| tiqui xi … toco xi \| BUM-dá-TCHÃ — bão | 3,10 |
| Perseguição | `perseguicao` · Baque Virado | alfaias, caixa, gonguê, matraca, ganzá, **120→176** \| rrrum TUM! | 7,12 |
| Travessura | `travessura` · Traquinagem | tiqui-toco · UÍ · xi · DOIM-dim-doim · matraca se desfazendo · tá! | 1,32 |
| Fim de cena | `fim_de_cena` · Arremate | pá-dá-TUM · tchi-TUM · tchi-TUM · tá … TUM — bão (desacelera) | 3,30 |
| Saída | `saida` | tiqui xi tiqui xi … (sumindo) | 0 |
| Transição de capítulo | `transicao` · Abre-alas | BÃO … chuva … matraca acelerando, rufo, TUM! + **chamada da rabeca** (`CHAMADA`, Ré mixolídio) | 3,80 |
| Suspense | `suspense` · Arrepio | zum … zum … dum … zum … dum-dum (berimbau com dobrão encostado, pau-de-chuva, surdo distante) | 0 |
| Pontuação grave | `pontuacao` · Bão | BÃO (surdo + zabumba + prato) | 0 |
| Subida | `sobe` · Subida | rufo crescendo até o UÍ da cuíca + gonguê | 0,80 |
| Descida | `desce` · Descida | glissando grave da rabeca … BÃO | 1,20 |
| Golpe seco | `golpe_seco` · Estalo | PÁ! (matraca + caixa) | 0 |
| Acelerando | `acelerando` | matraca pá . pá . pápápápá → TUM! | 2,03 |
| Chamado | `chamado` | DOIM + a cantiga do Curupira na rabeca (`CANTIGA_1`) | 0 |

`acel()` gera uma matraca que acelera ou se desfaz, `rufo()` gera um rufo de caixa e `formula()` monta uma
fórmula nova a partir das sílabas.

### Etiquetas musicais antigas do roteiro → função nova (`temas.ETIQUETAS_ANTIGAS`)

| Etiqueta no roteiro | Agora significa | Fórmula |
|---|---|---|
| `gongo_grave` | pontuação grave: surdo + zabumba + prato de banda | `pontuacao` |
| `gongo_sobe` | subida: rufo de caixa até o "uí" da cuíca + gonguê | `sobe` |
| `gongo_desce` | descida: glissando grave de rabeca + surdo | `desce` |
| `bloco_madeira` | golpe seco: matraca + caixa | `golpe_seco` |
| `bloco_acelera` | acelerando: matraca até o TUM | `acelerando` |
| `flauta_chamado` | chamado: a cantiga do Curupira na rabeca ou na viola, sobre o berimbau | `chamado` |

Nos textos de "trilha" do `roteiro.json`, onde aparece flauta de taquara ou pífano, leia **rabeca** (melodia),
**viola** (ternura e humor) ou **sanfona** (festa, noite). Onde aparece gongo, use a fórmula correspondente da
tabela acima.

## 3. Temas

Use `temas.eventos(TEMAS[chave], variação)` para obter `(notas, golpes)` em segundos. Todo tema tem as variações
**cheia**, **sussurrada** (para ir sob a narração) e **fragmento** (vinheta).

| Tema (chave) | Modo · andamento | Instrumentos | Caráter e motivo | Variações extras |
|---|---|---|---|---|
| **Mata** (`mata`) | Ré **mixolídio** (o Dó natural é a cor) · 80, 2/4 · 16 c. | rabeca (melodia com apojaturas), viola em ponteio e, do compasso 9 em diante, a **segunda voz em terças** (dupla caipira), sanfona sustentando, zabumba e bacalhau de baião-toada, triângulo | luminoso e respirado. Cabeça: Lá-Sol-Fá#-Sol \| Lá-Si-**Dó**-Si-Lá. Cifra: `D C G Am D C G D G D C Am D C G D` | — |
| **Curupira** (`curupira`) | Ré **"nordestina"** (lídio com 7ª menor; o **Sol#** é o trítono) · 120, 2/4 · 16 c. | viola com a pegada, **cuíca** gemendo no contratempo, berimbau (solto e preso), caxixi, maracá, zabumba pp; a rabeca entra só para a risada | misterioso e travesso. **Pegada**: Lá-Dó-Si-Sol#-Lá, sempre seguida do retrógrado (pegadas ao contrário); resposta 3 graus acima: Ré-Fá#-Mi-Dó-Ré | `rastro` (o tema de trás para a frente) |
| **Caçadores** (`cacadores`) | Ré **menor de modinha** (eólio, com Dó# na dominante Lá7) · 90, 2/4 · 16 c. | rabeca, berrante, zabumba + bacalhau, caixa de marcha, prato de banda; sanfona em baixo-acorde e alfaias na segunda metade | marcha pesada de gente de fora. Cifra: `Dm Dm C Gm Dm Dm A7 Dm` | `aboio` (berrante + aboio de rabeca em tempo largo: espera, tocaia) |
| **Perseguição** (`perseguicao`) | Ré **dórico** + célula do pé virado (Ré-Sol#-Lá) · **120→168**, 2/4 · 12 c. | baque virado: alfaias, caixa, gonguê, matraca, ganzá, prato; rabeca em semicolcheias; sanfona em estocadas sincopadas | moto-perpétuo que acelera até uma parada seca | fragmento 120→132 |
| **Noite e Tempestade** (`noite`) | Ré **eólio** em tempo livre (ref. 60) · 32 s | **sanfona arrastada** (Ré-Lá → Rém → Si♭ → Lá, acordes longos), rabeca grave escorregando entre notas longas, surdo distante, berimbau zum, pau-de-chuva; cheia: alfaias rufando e prato (trovoada) | noite = fole, rabeca e silêncio; tempestade = os tambores como trovão | — |
| **Lembrança da Vó** (`vo`) | Ré **menor de modinha** · 60, **3/4** · 12 c. | **viola sozinha** (melodia + ponteio grave), sem percussão; sanfona pp na 2ª metade | acalanto íntimo: Lá-Fá \| Mi-Fá-Sol-Lá \| Ré-Dó \| Si♭-Lá-Sol … Dó#-Ré. Cifra: `Dm A7 Dm Gm Dm A7 Dm Gm Dm A7 A7 Dm` | sussurrada = só o ponteio |
| **Amanhecer / Final** (`final`) | Ré mixolídio, com a pegada (Sol#) dentro · 112, 2/4 · 16 c. | **conjunto pleno sem flauta**: rabeca na melodia da Mata, **sanfona em terças por cima**, viola em rasqueado de baião, zabumba, bacalhau, triângulo, ganzá | o Tema da Mata em baião luminoso. Nos compassos 13–14 a pegada do Curupira soa sobre o Ré maior: a mata acolhe o Sol# | `ciranda` (90 bpm: bumbo no 1, ganzá, caixa, viola em ponteio, rabeca + sanfona) |

## 4. Coerência

- **Centro em Ré** em tudo, inclusive na Vó, que agora está em Ré menor. Ré e Lá são cordas soltas da rabeca e
  bordões da viola em cebolão, então qualquer tema entra sobre um Ré pedal da sanfona.
- **Os modos contam a história.** Mixolídio é a mata em paz. A escala nordestina, com o Sol#, é o Curupira. O
  menor de modinha é gente: a ameaça dos caçadores e o colo da Vó. O dórico é a correria e o eólio é a noite.
  No final, a pegada com Sol# entra dentro do mixolídio da mata.
- **Sol#, a nota do pé virado.** Só aparece no tema do Curupira, na célula da perseguição e no final. O
  `temas.py` confere.
- **Andamentos** (`ANDAMENTOS`): 60 para a noite e a Vó, 80 para a mata, 90 para os caçadores e a ciranda, 112
  para o final, 120 para o Curupira e o início da perseguição, e 168–176 no pico da perseguição.
- **Compassos.** A base é 2/4 (baião, marcha, maracatu). A Vó é 3/4 (modinha) e a noite, tempo livre.

## 5. Regras de uso, cena a cena

1. **A percussão conduz.** Toda entrada, saída, pose, golpe ou queda de boneco ganha a sua fórmula, com a
   `batida` no gesto.
2. **Silêncio é instrumento.** Depois de `pose`, `susto` e `queda`, deixe pelo menos 1,5 s só com a ambiência
   da mata e a ressonância do surdo ou do prato.
3. **Sob a narração, use a sussurrada.** Os temas cheios e as fórmulas fortes vão nas pausas.
4. **Um tema por vez.** Para trocar de tema, use o fragmento do novo, `transicao`, `fim_de_cena` ou um Ré pedal
   da sanfona.
5. **O Curupira nunca anda em linha reta.** A pegada vem sempre com o retrógrado. A cuíca é a voz dele, então
   não a use em outro personagem.
6. **Respeito.** Não imitar cantos sagrados indígenas: o maracá aparece só como chocalho. O aboio é
   instrumental.
7. **Sem música genérica de filme** (cordas orquestrais, metais épicos, pads) e **sem cor oriental** (ver
   `PROIBIDOS`).

## 6. Arquivos e API

- `temas.py` (só biblioteca padrão):
  - utilitários: `freq`, `midi`, `nome`, `transpor_nota`, `transpor`, `retrogrado`, `duracao`, `trecho`,
    `segundos`, `notas`, `golpes_grade`, `variacao`, `eventos`, `acel`, `rufo`, `formula`
  - harmonia: `TRIADE`, `BAIXO_VIOLA`, `BAIXO_SANFONA`, as tabelas `PONTEIO`, `PONTEIO3`, `RASQUEADO`, `FOLE`,
    `FOLE3`, `BAIXO_ACORDE`, `ESTOCADA`, e `_ponteio(cifras, tabela)` (cifras = um acorde por compasso)
  - material: `MATA_RABECA`, `MATA_CIFRA`, `MATA_SEGUNDA`, `CURU_X`, `CURU_Y`, `CURU_VIOLA`, `CURU_CUICA`,
    `CURU_RISADA`, `CACA_A`, `CACA_CIFRA`, `CACA_BERRANTE`, `CACA_ABOIO`, `PERS`, `PERS_RABECA`, `PERS_SANFONA`,
    `NOITE_FOLE`, `NOITE_ABOIO`, `VO_VIOLA`, `VO_CIFRA`, `FINAL_RABECA`, `FINAL_SANFONA`, `CHAMADA`, `CANTIGA_1`
  - dados: `TEMAS`, `FORMULAS`, `SILABAS`, `ETIQUETAS_ANTIGAS`, `EXTENSAO`, `PERCUSSAO`, `PROIBIDOS`,
    `ETIQUETA` (prefixo das amostras), `ANDAMENTOS`
  - nomes da versão 1, mantidos só para os `compor_*.py` não quebrarem: `MATA_PIFANO` = `MATA_RABECA`,
    `CURU_RABECA` = `CURU_VIOLA`, `VO_FLAUTA` = `VO_VIOLA`, `CHAMADA_PIFANO` = `CHAMADA`. **O instrumento que
    toca cada um agora é rabeca, viola ou sanfona.**
  - `python temas.py` roda a conferência: durações, extensões, timbres proibidos, melodia não pentatônica e
    Sol# só onde é permitido.
- `sintese.py` (adições): `sanfona(nota, dur, dinamica, registro=None|'seco'|'tremolo'|'musette'|'baixo')` e
  `musette(x, cents)`, que engrossa uma amostra de sanfona de palheta única.
- `temas_demo.py` gera `temas_demo/tema_<chave>_<variação>.wav`, `formula_<chave>.wav`, `tema_<chave>.png` e
  `formulas.png`, e mede a afinação. As funções `nota_som(inst, nota, dur, din)` e `golpe(inst, i, s)` servem
  de referência de timbre para os compositores.

## Fontes

- Escala nordestina (mixolídio, lídio com 7ª menor, dórico): https://en.wikipedia.org/wiki/Escala_nordestina
- Maracatu de baque virado (alfaia, gonguê, caixa, mineiro):
  https://educapes.capes.gov.br/bitstream/capes/1000185/2/Maracatu%2c%20que%20hist%c3%b3ria%20%c3%a9%20essa..pdf
- Bumba-meu-boi do Maranhão, sotaque de matraca: https://www.gov.br/iphan/pt-br (Registro do Complexo Cultural
  do Bumba-meu-boi do Maranhão, 2011)
- Trio de forró (sanfona, zabumba, triângulo) e baião: https://en.wikipedia.org/wiki/Bai%C3%A3o_(music)
- Toques de berimbau: https://en.wikipedia.org/wiki/Capoeira_toques
- Amostras novas: Freesound CC0 (cuíca: REVERBERA #850940; acordeom: #178092 e Miles_Thompson #560785;
  harmônio: cabled_mess #523889; chifre de boi: craigsmith #479998; alfaia e agogô grande: Sassaby #509528 e
  #506386; triângulo: Ilson_Junior #609773). URLs e recortes estão em `sons/musica/fontes.json`.
