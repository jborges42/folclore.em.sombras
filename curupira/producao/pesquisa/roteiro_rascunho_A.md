# Curupira, o guardião da mata — Rascunho A: o contador de causos

Abordagem: um contador do interior, à beira do fogo, conta o causo para crianças e adultos ao mesmo tempo.
O tom é quente e oral, com pequenas repetições e o refrão **"E a mata ouviu."**, que volta a cada falta
dos caçadores e muda de sentido no fim ("Mas dessa vez, deixou passar"; "E a mata, essa, sempre ouve").
O humor é leve e o suspense cresce até a tempestade. A moral não vem em sermão: está no dito da Vó,
nas duas falas do Curupira sobre fome e gula e na pergunta que o contador deixa para a plateia.

Base: `pesquisa/lore.md`. Elementos da tradição usados:
- carta de Anchieta de maio de 1560, com as oferendas de penas, flechas e abanadores no alto da serra;
- "demônio" como leitura do padre, e "dono da mata" como o nome que o povo da mata usa;
- pequeno, de quatro palmos e com força prodigiosa;
- corpo peludo, dentes verdes e cabelo de fogo, contados como "uns dizem";
- pés virados e rastro que leva para o lado contrário;
- batidas nas sapopemas para testar as árvores antes da tempestade;
- castigo para quem mata por gosto, derruba árvore à toa, mexe com fêmea prenhe ou filhote e abate
  bicho de bando, e tolerância com quem caça por fome;
- assobio agudo, pio de inhambu e voz humana imitada;
- o canto que encanta, "Vou andando pelo meu caminho…", na tradução de Barbosa Rodrigues;
- o castigo de andar em círculos sem achar o caminho de casa;
- o cão do caçador guloso açoitado com cipó;
- vaga-lumes como batedores;
- fumo que adoça a raiva;
- novelo de cipó com a ponta escondida;
- o "meu neto" do conto do Rio Branco;
- montado num queixada à frente da vara.

## Papéis e vozes

- **narrador**: homem maduro do interior, voz grave e quente, com um sorriso na voz. Fala devagar e baixa o
  tom no suspense. Sotaque brasileiro do interior, sem caricatura.
- **tiao**: caçador velho, voz rouca e arrastada, prosa e ganancioso. À noite, o medo aparece por baixo da
  bravata.
- **ze**: rapaz de uns vinte anos, voz clara, rápida e afobada. Começa exibido e termina humilde.
- **vo**: senhora idosa e benzedeira, voz baixa, lenta e carinhosa, com autoridade mansa. Aparece só em
  lembrança.
- **curupira**: voz pequena e aguda, de idade indefinida, que parece vir de todo lado. É enigmático e
  brincalhão, sem ser fofo. Fala três vezes, e na segunda quase canta.

## Motivos musicais

- **Tema do Curupira**: flauta de taquara em pentatônica menor, com uma frase curta e saltitante sobre a
  melodia da cantiga "Vou andando, andando". É sempre pontuado por `bloco_madeira`.
- **Tema da mata**: viola caipira dedilhada em ostinato e rabeca lírica por cima, com pau-de-chuva e maracás.
- **Tema dos caçadores**: zabumba e caixa em marcha arrastada e rabeca grave meio torta.
- **Tema da Vó**: viola solo em toada lenta e maracá suave nos gestos de benzer.
- **Pontuação**, como no teatro de sombras:
  - entradas e saídas levam `bloco_acelera`;
  - golpes levam `bloco_madeira` ou `prato`;
  - revelações levam `gongo_sobe`;
  - quedas levam `gongo_desce`;
  - os silêncios dramáticos cortam tudo, inclusive a ambiência.

## Convenções

- `FALA [papel]: texto` é o texto exato que vai para a voz. Está pronto para TTS: nenhuma frase passa de
  vinte e cinco palavras, e não há parênteses, abreviações nem algarismos.
- `[RESPIRO: n s]` é o `pausa_depois` do roteiro.json.
- `[SFX: etiqueta @ momento]` marca o som pelo `inicio` ou `fim` da fala, ou por `+N` segundos desde o
  início do beat.
- Cada capítulo começa com uma PAUSA que cobre a cartela de cordel e a troca de cenário.

---

## Cena 1 · `abertura`

- **Capítulo:** nenhum. A cartela de capa diz "CURUPIRA, O GUARDIÃO DA MATA".
- **Luz:** lamparina
- **Ambiente:** `lamparina_chama`, `grilos` bem baixos
- **Trilha:**
  - Começa em silêncio. Depois do fósforo, um surdo grave e lento marca o pulso de um coração.
  - Entra uma nota longa de rabeca, e a flauta de taquara apresenta o tema do Curupira uma vez, ao longe.
  - A cartela entra com `gongo_sobe` e `tambor_grave`.
  - Durante a citação de Anchieta, ficam só a rabeca em nota pedal e um maracá raro.
  - Na palavra "dono", tudo para e fica só um assobio distante.
- **Visual:**
  - O biombo tríptico começa apagado. A lamparina de barro acende na frente, e o papel ganha cor âmbar do
    centro para as bordas.
  - A serra aparece em silhueta, em L4 e L5.
  - Na pedra do cume, em L2, surgem recortadas as oferendas da carta: penas, flechas e um abanador
    trançado.

**abertura_01** · PAUSA (3,0 s)
[SFX: fosforo @ +0.3; lamparina_chama @ +0.8; gongo_sobe @ +1.5]
[AÇÃO: escuro total. Um fósforo risca, a chama pega na lamparina e o papel acende devagar.]

**abertura_02** · PAUSA (3,0 s)
[SFX: tambor_grave @ inicio; flauta_chamado @ +1.2]
[AÇÃO: a cartela de capa entra como um carimbo, fica no centro e sai descendo.]

**abertura_03** · FALA [narrador]: Chega mais perto do fogo, que a história é velha. Mais velha que o avô do avô da gente.
[RESPIRO: 0,7 s]
[SFX: lamparina_chama @ inicio]
[AÇÃO: a chama sobe quando o narrador fala, e brasas sobem no feixe.]

**abertura_04** · FALA [narrador]: Em maio de mil quinhentos e sessenta, o padre José de Anchieta escreveu numa carta assim.
[RESPIRO: 0,6 s]
[SFX: maraca @ fim]
[AÇÃO: a serra aparece no alto do papel, com uma trilha estreita subindo pelas brenhas até o cume.]

**abertura_05** · FALA [narrador]: É coisa sabida, e pela boca de todos corre, que há certos demônios, a que os brasis chamam corupira.
[RESPIRO: 0,6 s]
[SFX: gongo_grave @ fim]
[AÇÃO: o narrador diz a frase mais devagar, em tom de leitura. Uma sombra pequena e desfocada cruza ligeira o fundo, em L4, e some.]

**abertura_06** · FALA [narrador]: E o povo deixava penas, flechas e abanadores no alto da serra, pedindo que ele não fizesse mal.
[RESPIRO: 0,6 s]
[SFX: vento_folhas @ inicio; caxixi @ +2.5]
[AÇÃO: no cume aparecem, uma a uma, duas penas, três flechas e um abanador. O vento balança as penas.]

**abertura_07** · FALA [narrador]: Demônio, escreveu o padre. Mas quem mora na mata chama de outro jeito. Chama de dono.
[RESPIRO: 1,2 s]
[SFX: tambor_grave @ +4.0; assobio_curupira @ fim]
[AÇÃO: a serra desfoca e se apaga. Na palavra "dono", o batuque para seco e a chama se inclina como se alguém tivesse passado. Depois do assobio distante, a lamparina baixa e o cenário da mata é trocado no escuro.]

---

## Cena 2 · `mata`

- **Capítulo:** I · A mata acorda
- **Luz:** amanhecer, que vira dia na primeira fala
- **Ambiente:** `mata_amanhecer`, depois `mata_dia`, `riacho`, `sabia` e `cigarras`
- **Trilha:**
  - O pau-de-chuva abre a cena, e a viola caipira dedilha o tema da mata em andamento de toada.
  - O pífano responde ao grito das araras, e a zabumba entra macia, só no tempo forte.
  - Os bichos têm pontuação própria: agogô para as araras, rufar curto para o bugio, `bloco_acelera` para o
    tatu e surdo grave para a onça.
  - Na veada, a rabeca canta sozinha.
  - Na última frase, tudo some e fica um gongo grave.
- **Visual:**
  - Samaúma no centro, em L2, com sapopemas largas e um oco entre elas.
  - Buritis e açaís em L3 e L4, riacho à esquerda em L2, costela-de-adão e capim em L1.
  - Os bichos entram um por um.
  - Cor de foco: o vermelho das araras.

**mata_01** · PAUSA (2,5 s)
[SFX: tambor_grave @ inicio; pau_de_chuva @ +0.4; sabia @ +1.2; araras @ +2.0]
[AÇÃO: cartela "Capítulo I · A mata acorda". O sol nasce à esquerda e o cenário entra pela mão do contra-regra.]

**mata_02** · FALA [narrador]: Lá longe, onde a estrada acaba e o rio faz a curva, tinha uma mata. E que mata!
[RESPIRO: 0,4 s]
[SFX: riacho @ inicio]
[AÇÃO: a luz passa de amanhecer para dia, e a mata fica legível até o fundo.]

**mata_03** · FALA [narrador]: As araras cortavam o céu aos gritos, e os bugios roncavam lá no alto, igual gente depois do almoço.
[RESPIRO: 0,3 s]
[SFX: araras_revoada @ inicio; agogo @ +0.5; bugio @ +3.5; rufar @ fim]
[AÇÃO: seis araras cruzam o papel em arco. Depois, um bugio sentado no galho da samaúma, com o rabo enrolado, abre a boca no ronco.]

**mata_04** · FALA [narrador]: O tatu passava sempre apressado, atrasado para algum compromisso que ninguém sabe qual é.
[RESPIRO: 0,3 s]
[SFX: bloco_acelera @ inicio; passos_folhas @ inicio; onca_rosnado @ fim]
[AÇÃO: o tatu cruza o chão em trote rápido, para no meio, olha para a plateia e sai correndo. Ao fundo, em L3, a onça passa ondulando para beber no riacho.]

**mata_05** · FALA [narrador]: Na beira do riacho, uma veada de barriga redonda esperava filhote para a lua nova.
[RESPIRO: 1,0 s]
[SFX: riacho @ inicio; maraca @ fim]
[AÇÃO: a onça vai embora sem pressa, e a veada prenhe entra devagar pela direita para beber. A luz esquenta. As orelhas dela giram em alerta e depois relaxam, enquanto a rabeca canta a frase da veada.]

**mata_06** · FALA [narrador]: Mas a mata tinha dono. E o dono vivia de orelha em pé.
[RESPIRO: 0,6 s]
[SFX: gongo_grave @ fim; folhagem_mexe @ fim]
[AÇÃO: a música corta. No oco entre as sapopemas, dois olhinhos se acendem e se apagam.]

---

## Cena 3 · `guardiao`

- **Capítulo:** II · O dono da mata
- **Luz:** dia
- **Ambiente:** `mata_dia`, `cigarras` e `vento_folhas` leve
- **Trilha:**
  - O tema do Curupira aparece inteiro pela primeira vez: flauta de taquara saltitando sobre atabaque e
    alfaia, um `bloco_madeira` a cada passo dele e agogô e caxixi em contratempo.
  - Na revelação dos pés, tudo congela: dois golpes secos de bloco e silêncio.
  - Nas batidas na sapopema, entram berimbau grave e trovão distante.
  - A cena fecha com rabeca grave e `gongo_desce` em "o caminho de casa".
- **Visual:**
  - A mesma samaúma, mais perto.
  - O Curupira sai do oco, primeiro como sombra grande e desfocada, depois pequeno e nítido, colado à
    tela. Tem cabelo de fogo, pintura de jenipapo, saiote de fibras e tacape.
  - A cada passo, pegadas invertidas ficam no chão de folhas.
  - Cor de foco: o cabelo de fogo.

**guardiao_01** · PAUSA (2,5 s)
[SFX: tambor_grave @ inicio; gongo_sobe @ +1.0; folhagem_mexe @ +1.2; bloco_acelera @ +1.8]
[AÇÃO: cartela "Capítulo II · O dono da mata". O Curupira surge do oco da samaúma, do desfoque para a nitidez.]

**guardiao_02** · FALA [narrador]: O nome dele é Curupira. Em muito canto do Brasil, também chamam de Caipora.
[RESPIRO: 0,4 s]
[SFX: flauta_chamado @ fim]
[AÇÃO: o Curupira estica o corpo, olha para os lados e cheira o ar.]

**guardiao_03** · FALA [narrador]: Pequenininho, coisa de quatro palmos. Mas com força de jogar caçador para o alto feito peteca.
[RESPIRO: 0,3 s]
[SFX: bloco_madeira @ +2.0; prato @ fim]
[AÇÃO: ele se mede ao lado de uma bromélia quase da altura dele. Depois ergue sozinho um tronco caído três vezes maior que ele e o arremessa, com um prato no impacto.]

**guardiao_04** · FALA [narrador]: Uns dizem que é peludo, outros que tem dentes verdes. E tem quem jure que o cabelo é vermelho feito fogo.
[RESPIRO: 0,3 s]
[SFX: risada_curupira @ +3.5; caxixi @ +3.5]
[AÇÃO: ele ri com a cabeça para trás, e os dentes esverdeados aparecem por um instante. As mechas de fogo ondulam mais forte.]

**guardiao_05** · FALA [narrador]: Mas numa coisa todo mundo concorda.
[RESPIRO: 0,2 s]
[SFX: —]
[AÇÃO: a música para e o Curupira congela de perfil.]

**guardiao_06** · PAUSA (2,0 s)
[SFX: bloco_madeira @ inicio; bloco_madeira @ +1.0]
[AÇÃO: quadro parado nos pés, com o calcanhar para a frente e os dedos para trás. A luz sobe só no chão.]

**guardiao_07** · FALA [narrador]: Os pés dele são virados para trás. O calcanhar vai na frente, e os dedos apontam para onde ele já passou.
[RESPIRO: 0,3 s]
[SFX: berimbau @ inicio; bloco_madeira @ +3.0; bloco_madeira @ +3.6; bloco_madeira @ +4.2]
[AÇÃO: ele dá três passos devagar para a direita, e as pegadas que ficam no chão apontam para a esquerda.]

**guardiao_08** · FALA [narrador]: Por isso, quem segue o rastro dele vai para o lado contrário. Tem gente procurando até hoje.
[RESPIRO: 0,3 s]
[SFX: bloco_acelera @ inicio; caxixi @ fim]
[AÇÃO: ele sai saltitando para a direita e deixa uma trilha de pegadas invertidas. Um redemoinho de folhas segue as pegadas para a esquerda. O tema do Curupira toca inteiro.]

**guardiao_09** · FALA [narrador]: Antes da tempestade, ele bate nas sapopemas das árvores grandes, para ver se aguentam.
[RESPIRO: 0,2 s]
[SFX: vento_folhas @ inicio]
[AÇÃO: ele volta, encosta o ouvido na sapopema da samaúma e ergue o tacape.]

**guardiao_10** · PAUSA (2,5 s)
[SFX: batida_tronco @ inicio; batida_tronco @ +0.7; batida_tronco @ +1.4; trovao @ +2.0]
[AÇÃO: três pancadas com o tacape, com um som oco de ferro em tronco. Um trovão bem longe responde, e ele acena satisfeito: a árvore aguenta.]

**guardiao_11** · FALA [narrador]: Quem caça para comer, ele deixa.
[RESPIRO: 0,3 s]
[SFX: inhambu @ fim]
[AÇÃO: ele aponta para uma moita e um inhambu levanta voo. O gesto é generoso.]

**guardiao_12** · FALA [narrador]: Mas quem mata por gosto, derruba árvore à toa ou mexe com bicho prenhe e filhote... esse se perde, e não acha o caminho de casa.
[RESPIRO: 1,0 s]
[SFX: tambor_grave @ +3.0; gongo_desce @ fim]
[AÇÃO: o rosto dele endurece, as mechas crescem e soltam três brasas, e a luz esfria um pouco. Ele gira e some num sopro de folhas, e as pegadas se apagam.]

---

## Cena 4 · `cacadores`

- **Capítulo:** III · Caça de gula
- **Luz:** dia, que vira entardecer na entrada da veada
- **Ambiente:** `mata_dia`, `cigarras`, depois `riacho`
- **Trilha:**
  - O tema dos caçadores: zabumba e caixa em marcha arrastada no passo pesado do Tião, com a rabeca grave
    meio cômica. O passo do Zé é um agogô mais rápido.
  - Cada tiro leva um prato e um corte seco de tudo, inclusive da ambiência, por um segundo e meio. Depois
    a mata volta devagar.
  - Os golpes de facão levam um `bloco_madeira` cada.
  - Quando a veada entra, a rabeca lírica da cena dois volta, ameaçada por um surdo em pulso de coração.
- **Visual:**
  - Tião, Zé e o cachorro entram pela esquerda.
  - O bornal do Tião incha ao longo da cena com caça pendurada, só em silhueta e sem sangue.
  - Embaúba nova em L2 à direita, riacho à esquerda.
  - O Curupira aparece só como olhos e sombra entre os buritis, em L3.
  - Cor de foco: a fita vermelha do chapéu do Tião.

**cacadores_01** · PAUSA (2,0 s)
[SFX: tambor_grave @ inicio; passos_folhas @ +0.8; cachorro_latido @ +1.5]
[AÇÃO: cartela "Capítulo III · Caça de gula". Tião, Zé e o cachorro entram pela esquerda. Tião anda pesado, Zé desengonçado, e o cachorro vai farejando.]

**cacadores_02** · FALA [narrador]: Pois foi nessa mata que entraram dois caçadores. Na frente, o velho Tião, com mais bala no bornal do que juízo na cabeça.
[RESPIRO: 0,3 s]
[SFX: passos_folhas @ inicio; bloco_madeira @ fim]
[AÇÃO: Tião para no centro, apoia a espingarda no ombro e coça a barba, cheio de si.]

**cacadores_03** · FALA [narrador]: Atrás vinha o Zé, neto de benzedeira, com mais pressa do que perna. E o cachorro, o único da turma com algum juízo.
[RESPIRO: 0,3 s]
[SFX: agogo @ inicio; facao_golpe @ +2.5; cachorro_latido @ fim]
[AÇÃO: Zé passa à frente do Tião golpeando o mato à toa com o facão. O cachorro olha para a mata, depois para os donos, e solta um latido curto e desconfiado.]

**cacadores_04** · FALA [narrador]: Antes do meio-dia, o bornal já tinha comida para uma semana. Mas o Tião não parou.
[RESPIRO: 0,2 s]
[SFX: bloco_madeira @ +1.0; bloco_madeira @ +1.6; bloco_madeira @ +2.2]
[AÇÃO: a cada golpe de bloco, mais uma silhueta de caça aparece pendurada no bornal. Na última frase, Tião ergue a espingarda para o céu.]

**cacadores_05** · PAUSA (2,5 s)
[SFX: espingarda_engatilhar @ inicio; tiro_espingarda @ +0.9; prato @ +0.9; araras_revoada @ +1.1; gongo_desce @ +1.5]
[AÇÃO: o estouro corta a música e a ambiência. O bando de araras se desfaz no céu, e uma pena vermelha cai girando devagar até o chão.]

**cacadores_06** · FALA [tiao]: Arara não é de comer. Mas a pena fica bonita no chapéu.
[RESPIRO: 0,4 s]
[SFX: —]
[AÇÃO: Tião pega a pena e a enfia na fita do chapéu, todo prosa.]

**cacadores_07** · FALA [narrador]: E a mata ouviu.
[RESPIRO: 0,6 s]
[SFX: gongo_grave @ fim; folhagem_mexe @ fim]
[AÇÃO: entre os buritis, em L3, dois olhos acesos se abrem. O cachorro rosna baixinho para o fundo.]

**cacadores_08** · FALA [narrador]: O Zé quis mostrar serviço. Meteu o facão numa embaúba nova, só para ver se derrubava.
[RESPIRO: 0,2 s]
[SFX: facao_golpe @ fim]
[AÇÃO: Zé cospe nas mãos e mede a embaúba com o facão.]

**cacadores_09** · PAUSA (2,5 s)
[SFX: facao_golpe @ inicio; bloco_madeira @ inicio; facao_golpe @ +0.6; bloco_madeira @ +0.6; facao_golpe @ +1.2; bloco_madeira @ +1.2; arvore_rangendo @ +1.6; arvore_caindo @ +2.1; macaco_gritos @ +2.2]
[AÇÃO: três golpes, a embaúba range e tomba de perfil cruzando o papel. Folhas descem e os macacos gritam lá em cima.]

**cacadores_10** · FALA [ze]: Derrubei! Viu só, Tião?
[RESPIRO: 0,3 s]
[SFX: —]
[AÇÃO: Zé põe o pé em cima do tronco caído, como um troféu.]

**cacadores_11** · FALA [narrador]: E a mata ouviu.
[RESPIRO: 0,6 s]
[SFX: gongo_grave @ fim; bugio @ fim]
[AÇÃO: o bugio ronca alto e bravo. Os olhos em L3 chegam mais perto e a sombra cresce.]

**cacadores_12** · FALA [narrador]: De tardinha, no riacho, apareceu a veada.
[RESPIRO: 0,6 s]
[SFX: riacho @ inicio; coracao @ fim]
[AÇÃO: a luz passa para entardecer. A veada prenhe entra pela esquerda e bebe, e a rabeca lírica volta. Tião se agacha e leva a espingarda ao rosto devagar.]

**cacadores_13** · FALA [ze]: Tião... ela tá prenhe. Deixa essa.
[RESPIRO: 0,3 s]
[SFX: coracao @ inicio]
[AÇÃO: Zé põe a mão no ombro do Tião, hesitante.]

**cacadores_14** · FALA [tiao]: Melhor ainda. São dois de uma vez.
[RESPIRO: 0,3 s]
[SFX: espingarda_engatilhar @ fim]
[AÇÃO: Tião tira a mão do Zé do ombro, fecha um olho e mira. A música cai em silêncio total.]

---

## Cena 5 · `aviso`

- **Capítulo:** nenhum. A cena continua o capítulo III.
- **Luz:** entardecer
- **Ambiente:** silêncio no começo, depois `vento_folhas` e `cigarras` voltando muito baixo
- **Trilha:**
  - O assobio rasga o silêncio e fica vibrando como um gongo em glissando para baixo.
  - Depois entram berimbau tenso em pulso irregular e maracás em tremolo.
  - A voz do Curupira vem sem música, seguida de um `gongo_desce`.
  - Nas falas dos caçadores, fica só um surdo abafado.
- **Visual:**
  - A veada salta e foge em arcos longos.
  - Atrás da samaúma, em L4, uma sombra pequena cresce até ficar enorme e desfocada: o Curupira está
    longe da tela, por isso a sombra é grande.
  - O cachorro se encolhe, e os caçadores giram procurando de onde veio a voz.

**aviso_01** · PAUSA (2,5 s)
[SFX: coracao @ inicio; assobio_curupira @ +1.0; veado_alarme @ +1.2; tiro_espingarda @ +1.4; prato @ +1.4; galho_quebra @ +1.7; gongo_desce @ +2.2]
[AÇÃO: um segundo de silêncio, só com o coração. No instante do disparo, o assobio corta o ar, a mão do Tião treme, o cano desvia e um galho cai. A veada foge para a direita em saltos longos.]

**aviso_02** · FALA [narrador]: Foi um assobio tão fino que a mão do Tião tremeu. O tiro pegou num galho, e a veada sumiu com filhote e tudo.
[RESPIRO: 0,6 s]
[SFX: cachorro_ganido @ fim; folhagem_mexe @ fim]
[AÇÃO: ao longe, em L3, a veada para um instante no alto do barranco, olha para trás e some. O cachorro enfia o rabo entre as pernas e se esconde atrás do Zé. Toda a folhagem em volta se mexe ao mesmo tempo.]

**aviso_03** · FALA [curupira]: Caça de fome, eu dou. Caça de gula, eu cobro.
[RESPIRO: 0,6 s]
[SFX: gongo_desce @ fim; risada_curupira @ fim]
[AÇÃO: a sombra enorme e desfocada do Curupira aparece atrás da samaúma, com as mechas de fogo, sem ele aparecer inteiro. A voz vem de todos os lados.]

**aviso_04** · FALA [ze]: Quem falou isso, Tião?
[RESPIRO: 0,2 s]
[SFX: —]
[AÇÃO: Zé recua, e o boneco se afasta da tela, tremendo.]

**aviso_05** · FALA [tiao]: Foi o vento, menino. Vamos embora.
[RESPIRO: 0,3 s]
[SFX: vento_folhas @ inicio]
[AÇÃO: Tião dá as costas depressa, fingindo calma.]

**aviso_06** · FALA [narrador]: Foi o vento, disse o Tião. Mas vento não assobia daquele jeito. E vento, que eu saiba, não fala.
[RESPIRO: 0,6 s]
[SFX: assobio_curupira @ fim]
[AÇÃO: um assobio curto responde lá do fundo, e os dois apertam o passo. Uma folha passa e cobre a troca de cena.]

---

## Cena 6 · `rastros`

- **Capítulo:** IV · Os pés virados
- **Luz:** entardecer, que vira noite em `rastros_07`
- **Ambiente:** `vento_folhas`, depois `mata_noite`, `grilos`, `sapos` e `urutau`
- **Trilha:**
  - A música gira em círculo: caxixi e maracá num ostinato que não sai do lugar, e a rabeca numa frase
    que sempre volta à mesma nota. A alfaia vai acelerando aos poucos.
  - A flauta de taquara imita o pio do inhambu.
  - Quando a voz chama o Zé, a rabeca sobe num glissando estranho.
  - Na passagem da vara de queixadas, explode um batuque de galope com alfaia, atabaque, caixa, agogô e
    `bloco_acelera`. Ele corta seco no ganido do cachorro.
- **Visual:**
  - Chão de folhas com pegadas invertidas.
  - Tião segue para a direita, enquanto a sombra pequena do Curupira saltita para a esquerda, ao fundo.
  - A embaúba derrubada é o marco: o cenário desliza e ela volta ao centro três vezes.
  - Um urutau num toco, com olhos de gel âmbar.
  - A vara de queixadas atravessa com poeira.

**rastros_01** · PAUSA (2,0 s)
[SFX: tambor_grave @ inicio; passos_folhas @ +0.8; bloco_madeira @ +1.5]
[AÇÃO: cartela "Capítulo IV · Os pés virados". Tião se agacha e lê o chão. Aparecem pegadas pequenas com os dedos apontando para a direita.]

**rastros_02** · FALA [tiao]: Rastro de gente pequena. Vamos atrás, que dá em casa.
[RESPIRO: 0,3 s]
[SFX: —]
[AÇÃO: Tião aponta para a direita, para onde apontam os dedos das pegadas.]

**rastros_03** · FALA [narrador]: Coitado do Tião. Seguiu para onde os dedos apontavam, e o dono dos dedos tinha ido para o outro lado.
[RESPIRO: 0,3 s]
[SFX: risada_curupira @ fim; caxixi @ fim]
[AÇÃO: os dois partem para a direita. Ao fundo, em L3, a sombrinha do Curupira saltita para a esquerda, pisando de calcanhar. Os caçadores andam no mesmo lugar enquanto o cenário desliza por trás.]

**rastros_04** · FALA [narrador]: Andaram, andaram, andaram, e deram de cara com uma embaúba caída.
[RESPIRO: 0,3 s]
[SFX: passos_folhas @ inicio; gongo_grave @ fim]
[AÇÃO: a embaúba derrubada entra deslizando e para no centro. Os dois param na frente dela.]

**rastros_05** · FALA [ze]: Essa é a embaúba que eu derrubei.
[RESPIRO: 0,3 s]
[SFX: —]
[AÇÃO: Zé se agacha e toca o toco cortado.]

**rastros_06** · FALA [narrador]: Andaram de novo. Uma vez. Duas vezes. Três vezes. E sempre a mesma embaúba.
[RESPIRO: 0,3 s]
[SFX: gongo_grave @ +1.2; gongo_grave @ +2.0; gongo_grave @ +2.9]
[AÇÃO: a cada "vez", o cenário desliza e a embaúba volta ao centro, sempre um pouco mais escura.]

**rastros_07** · PAUSA (2,0 s)
[SFX: mata_noite @ inicio; urutau @ +0.8; grilos @ +1.0]
[AÇÃO: a luz cai para noite. Num toco, o urutau parado como galho abre os olhos âmbar e canta. Zé se arrepia.]

**rastros_08** · FALA [narrador]: E a mata? Agora era ela quem respondia.
[RESPIRO: 0,3 s]
[SFX: inhambu @ fim]
[AÇÃO: os dois se viram para o fundo escuro.]

**rastros_09** · FALA [narrador]: Do escuro veio um piado de inhambu. Depois, uma voz chamando o Zé, igualzinha à da avó.
[RESPIRO: 0,2 s]
[SFX: inhambu @ inicio; chamado_eco @ fim]
[AÇÃO: no fundo, em L4, aparece desfocada uma silhueta curvada de lenço na cabeça, e o perfil não fecha direito. É o Curupira imitando a Vó.]

**rastros_10** · FALA [ze]: Vó? Vó, eu tô aqui!
[RESPIRO: 0,2 s]
[SFX: corrida_folhas @ fim]
[AÇÃO: Zé dá dois passos de corrida em direção à silhueta.]

**rastros_11** · FALA [tiao]: Tua avó está a três léguas daqui, menino.
[RESPIRO: 0,4 s]
[SFX: chamado_eco @ fim; queixada_dentes @ fim]
[AÇÃO: Tião agarra o braço do Zé. A falsa Vó se desfaz numa revoada de folhas, e o chamado ecoa mais longe. O cachorro levanta as orelhas.]

**rastros_12** · FALA [narrador]: Aí veio o barulho que nenhum caçador quer ouvir. Dente batendo em dente.
[RESPIRO: 0,2 s]
[SFX: queixada_grunhido @ +1.5; queixada_dentes @ fim; rufar @ fim]
[AÇÃO: os dois se colam de costas contra a sapopema.]

**rastros_13** · PAUSA (3,5 s)
[SFX: queixada_tropel @ inicio; bloco_acelera @ inicio; queixada_dentes @ +0.3; queixada_grunhido @ +0.6; grito_homem @ +1.0; cachorro_latido @ +1.8; cachorro_latido @ +2.3; cachorro_ganido @ +3.1]
[AÇÃO: a vara de queixadas atravessa a tela da direita para a esquerda, com sete animais em profundidades diferentes e poeira no feixe. Tião grita e sobe na sapopema. O cachorro dispara atrás da vara e some. O batuque corta seco no ganido.]

**rastros_14** · FALA [narrador]: O cachorro correu atrás da vara e ganiu lá longe. Dizem que o Curupira açoita cachorro de caçador guloso.
[RESPIRO: 0,6 s]
[SFX: cipo_torcendo @ +4.0; cachorro_ganido @ fim]
[AÇÃO: a poeira assenta. Ao fundo, a sombrinha do Curupira passa estalando um cipó como chicote, sem acertar ninguém em cena. Uma folha passa e cobre a troca de cena.]

---

## Cena 7 · `noite`

- **Capítulo:** V · A noite que não acabava
- **Luz:** noite, que vira tempestade em `noite_09`
- **Ambiente:** `mata_noite`, `sapos`, `coruja` e `grilos`, depois `vento_folhas`, `chuva_mata` e `tempestade`
- **Trilha:**
  - A flauta de taquara canta sozinha a cantiga do Curupira, uma melodia pentatônica e hipnótica que
    dobra a voz dele, sobre um maracá bem lento.
  - A cantiga corta no meio da frase, num silêncio que dói.
  - Um surdo lento marca as batidas na sapopema, cada vez mais perto.
  - A tempestade é o ápice da trilha: alfaia e atabaque fortes, rufar de caixa, pratos, gongos em
    glissando para cima e rabeca aflita, com um `gongo_sobe` a cada relâmpago.
  - No fim da cena a chuva continua, mas a música recua para uma rabeca sozinha, que leva à lembrança da Vó.
- **Visual:**
  - Noite azul com lua alta. Vaga-lumes acendem um a um e formam uma fila, como batedores.
  - O Curupira canta sentado num galho alto da samaúma, pequeno e nítido, balançando os pés virados.
  - Na tempestade, ele se afasta da tela e a sombra cresce até cobrir o tríptico. Os relâmpagos o mostram
    gigante, batendo o tacape.
  - Tião e Zé se encolhem entre as sapopemas.

**noite_01** · PAUSA (2,0 s)
[SFX: tambor_grave @ inicio; sapos @ +0.4; coruja @ +1.2]
[AÇÃO: cartela "Capítulo V · A noite que não acabava". Vaga-lumes acendem um a um.]

**noite_02** · FALA [narrador]: A noite caiu, e os vaga-lumes acenderam, um atrás do outro, feito batedores.
[RESPIRO: 0,3 s]
[SFX: caxixi @ fim]
[AÇÃO: os vaga-lumes formam uma fila que sobe até um galho alto da samaúma.]

**noite_03** · FALA [narrador]: Aí veio uma cantiga. Fininha, bonita, vinda de lugar nenhum.
[RESPIRO: 0,3 s]
[SFX: flauta_chamado @ fim]
[AÇÃO: no fim da fila de vaga-lumes, o Curupira aparece sentado no galho, balançando os pés virados.]

**noite_04** · FALA [curupira]: Vou andando, andando, pelo meu caminho. Atrás de mim, venha andando, andando.
[RESPIRO: 0,4 s]
[SFX: maraca @ inicio]
[AÇÃO: a fala é quase cantada, em cantilena, com a flauta dobrando a melodia. Zé e Tião se levantam devagar e caminham em direção ao galho, como sonâmbulos.]

**noite_05** · FALA [narrador]: Quem escuta vai atrás sem querer. E quando está bem longe, a cantiga se cala.
[RESPIRO: 1,2 s]
[SFX: gongo_desce @ fim; sapos @ fim]
[AÇÃO: os dois seguem a fila de vaga-lumes, que dá voltas. Na palavra "cala", a flauta corta, os vaga-lumes se apagam de uma vez e o galho fica vazio. Os dois acordam do encanto no meio do nada.]

**noite_06** · FALA [tiao]: Quarenta anos nesta mata... e eu não sei onde estou.
[RESPIRO: 0,6 s]
[SFX: —]
[AÇÃO: Tião tira o chapéu com a pena de arara e fica olhando para ela. Pela primeira vez, ele parece velho.]

**noite_07** · FALA [narrador]: Então o vento mudou. E alguém começou a bater nas sapopemas.
[RESPIRO: 0,2 s]
[SFX: vento_folhas @ inicio]
[AÇÃO: as copas em L3 a L5 começam a balançar, e as nuvens cobrem a lua.]

**noite_08** · PAUSA (2,5 s)
[SFX: batida_tronco @ inicio; tambor_grave @ inicio; batida_tronco @ +0.8; tambor_grave @ +0.8; batida_tronco @ +1.6; tambor_grave @ +1.6]
[AÇÃO: três pancadas, cada uma mais perto e mais forte. A cada uma, o papel do biombo treme.]

**noite_09** · FALA [narrador]: Era o Curupira testando as árvores. Quando ele testa, é porque vem tempestade.
[RESPIRO: 0,2 s]
[SFX: trovao @ fim; relampago_estalo @ fim]
[AÇÃO: um primeiro relâmpago mostra por um instante a sombra do Curupira com o tacape erguido.]

**noite_10** · PAUSA (4,0 s)
[SFX: gongo_sobe @ inicio; tempestade @ inicio; chuva_mata @ +0.3; rufar @ +0.8; trovao @ +1.2; batida_tronco @ +2.0; prato @ +2.0; grito_pavor @ +2.6; relampago_estalo @ +3.4; gongo_sobe @ +3.4; trovao @ +3.7]
[AÇÃO: a luz vira tempestade e a chuva cai em diagonal. O Curupira se afasta da tela, e a sombra cresce gigante e desfocada, com as mechas de fogo agitadas soltando brasas. Zé grita, e os dois se encolhem entre as sapopemas.]

**noite_11** · FALA [narrador]: Choveu como se o céu tivesse furado. E a noite não acabava. Parecia que tinha esquecido como se acaba.
[RESPIRO: 0,4 s]
[SFX: trovao @ +2.5]
[AÇÃO: a chuva continua e a sombra gigante some no escuro. Os relâmpagos ficam mais espaçados.]

**noite_12** · FALA [narrador]: Encolhido entre as sapopemas, o Zé fechou os olhos e lembrou da Vó.
[RESPIRO: 0,6 s]
[SFX: chuva_mata @ inicio]
[AÇÃO: o foco se fecha sobre o Zé de olhos fechados. A música recua para uma rabeca sozinha, e a chuva fica abafada, como se viesse de longe.]

---

## Cena 8 · `vo`

- **Capítulo:** VI · O novelo da Vó
- **Luz:** lamparina, usada como cor de lembrança
- **Ambiente:** `lamparina_chama`, `grilos` e `chuva_mata` muito abafada, ao longe
- **Trilha:**
  - O tema da Vó: viola caipira solo em toada lenta, com a rabeca respondendo com ternura.
  - Um maracá suave marca os quatro tempos da benzedura.
  - Não há batuque.
  - Na última frase do narrador, um pífano brincalhão anuncia a ideia do Zé.
- **Visual:**
  - Transição com a folha que passa.
  - O rancho da Vó é de pau-a-pique e sapê, com uma janela iluminada pelo candeeiro.
  - A Vó está sentada no banquinho da porta. O cachimbo de barro solta fumaça em volutas, e ela segura o
    terço de sementes e o ramo de arruda.
  - Nas mãos dela, um cipó vira novelo.
  - As bordas ficam um pouco desfocadas, como numa lembrança.
  - Cor de foco: o anil do lenço.

**vo_01** · PAUSA (2,0 s)
[SFX: tambor_grave @ inicio; cachimbo_baforada @ +0.8; lamparina_chama @ +0.8]
[AÇÃO: cartela "Capítulo VI · O novelo da Vó". O rancho aparece em luz quente, com a fumaça do cachimbo subindo em espiral.]

**vo_02** · FALA [narrador]: Na porta do rancho, de cachimbo na boca, a Vó sempre dizia.
[RESPIRO: 0,4 s]
[SFX: cachimbo_baforada @ fim]
[AÇÃO: a Vó tira o cachimbo da boca e aponta com ele para a mata, lá fora.]

**vo_03** · FALA [vo]: A mata tem dono, meu filho. Pede licença, que ele empresta.
[RESPIRO: 0,6 s]
[SFX: maraca @ fim]
[AÇÃO: a Vó levanta o dedo em advertência, com doçura.]

**vo_04** · FALA [vo]: Se o Curupira te encantar, não corre. Faz um novelo de cipó, esconde bem a ponta e deixa no chão.
[RESPIRO: 0,3 s]
[SFX: cipo_torcendo @ +2.5]
[AÇÃO: as mãos dela enrolam o cipó em novelo e escondem a ponta lá dentro.]

**vo_05** · FALA [vo]: E deixa um fuminho do lado, que fumo adoça a raiva do dono.
[RESPIRO: 0,3 s]
[SFX: cachimbo_baforada @ fim]
[AÇÃO: ela põe o novelo no chão e, do lado, um pedacinho de fumo de rolo. Dá uma baforada e sorri.]

**vo_06** · PAUSA (2,0 s)
[SFX: maraca @ inicio; maraca @ +0.5; maraca @ +1.0; maraca @ +1.5]
[AÇÃO: a Vó benze o ar com o ramo de arruda numa cruz lenta, em quatro tempos, e o terço balança.]

**vo_07** · FALA [narrador]: O Zé achava que era só história de avó. Mas, perdido na chuva, história de avó vira a coisa mais séria do mundo.
[RESPIRO: 0,6 s]
[SFX: flauta_chamado @ fim; trovao @ fim]
[AÇÃO: o rancho desfoca e a lembrança se desfaz. O trovão traz de volta a noite, e a transição apaga a lamparina.]

---

## Cena 9 · `novelo`

- **Capítulo:** nenhum. A cena continua o capítulo VI.
- **Luz:** tempestade, que se acalma e vira noite em `novelo_08`
- **Ambiente:** `chuva_mata` diminuindo até parar, depois `sapos`, `grilos` e `mata_noite`
- **Trilha:**
  - O pau-de-chuva faz a chuva ir afinando.
  - O berimbau marca o trabalho das mãos do Zé, com caxixi rápido.
  - Nas falas, fica só um surdo abafado.
  - Quando o Curupira aparece, o tema dele volta em versão miúda e curiosa: flauta de taquara em
    pianíssimo e um `bloco_madeira` a cada volta do novelo.
  - A fuga nas pontas dos pés tem pífano e blocos bem baixinhos, quase cômicos.
  - No refrão final, a rabeca resolve numa nota maior pela primeira vez.
- **Visual:**
  - De volta às sapopemas, de noite e com chuva.
  - Zé arranca um cipó e enrola o novelo. O rolo de fumo sai do bornal do Tião.
  - O novelo e o fumo ficam sobre uma folha de costela-de-adão.
  - O Curupira sai de trás da samaúma, pequeno, nítido e perto da tela. Ele não tem cachimbo, para não ser
    confundido com o Saci.
  - Ele senta e desenrola, e o cipó se espalha em espirais pelo chão.
  - Tião e Zé saem de mansinho para a esquerda.

**novelo_01** · FALA [narrador]: O Zé arrancou um cipó da sapopema e começou a enrolar.
[RESPIRO: 0,2 s]
[SFX: pau_de_chuva @ inicio; cipo_torcendo @ +1.5]
[AÇÃO: Zé abre os olhos de repente e arranca um cipó pendurado.]

**novelo_02** · PAUSA (2,0 s)
[SFX: cipo_torcendo @ inicio; berimbau @ inicio; caxixi @ +0.4; bloco_madeira @ +0.8; bloco_madeira @ +1.6]
[AÇÃO: as mãos do Zé enrolam rápido e o novelo cresce.]

**novelo_03** · FALA [ze]: Tião, você tem fumo aí?
[RESPIRO: 0,3 s]
[SFX: —]
[AÇÃO: Zé estende a mão sem tirar os olhos do novelo.]

**novelo_04** · FALA [tiao]: Fumo? Isso lá é hora de pitar, menino?
[RESPIRO: 0,3 s]
[SFX: —]
[AÇÃO: Tião, encharcado, olha para o Zé como quem olha para um doido.]

**novelo_05** · FALA [ze]: Não é para mim. É para ele.
[RESPIRO: 0,4 s]
[SFX: gongo_grave @ fim]
[AÇÃO: Zé aponta com o queixo para o escuro atrás da samaúma.]

**novelo_06** · FALA [narrador]: O Tião entendeu. Tirou do bornal o único rolo de fumo que tinha.
[RESPIRO: 0,3 s]
[SFX: —]
[AÇÃO: Tião remexe o bornal cheio de caça e tira o rolo de fumo com a mão tremendo.]

**novelo_07** · FALA [ze]: Isso é para o senhor. E me desculpa pela embaúba.
[RESPIRO: 0,4 s]
[SFX: folhagem_mexe @ fim]
[AÇÃO: Zé esconde a ponta e arruma o novelo e o fumo sobre a folha larga, como um altar pequenino. Tira o chapéu e baixa a cabeça para o escuro. Depois de um instante, Tião tira a pena de arara do chapéu e a deixa junto do fumo.]

**novelo_08** · PAUSA (2,0 s)
[SFX: pau_de_chuva @ inicio; sapos @ +1.0; maraca @ +1.5]
[AÇÃO: a chuva afina até parar, e a luz passa de tempestade para noite. Um vaga-lume volta a acender, depois outro.]

**novelo_09** · FALA [narrador]: A chuva afinou. E de trás da samaúma saiu ele, pequenininho, pisando de calcanhar.
[RESPIRO: 0,3 s]
[SFX: bloco_madeira @ +3.0; bloco_madeira @ +3.5; bloco_madeira @ +4.0]
[AÇÃO: o Curupira sai de trás da sapopema, nítido e perto, e vai de calcanhar até a folha em três passos.]

**novelo_10** · FALA [narrador]: Cheirou o fumo. Pegou o novelo. Sentou ali mesmo e começou a procurar a ponta.
[RESPIRO: 0,2 s]
[SFX: caxixi @ inicio; flauta_chamado @ fim]
[AÇÃO: ele cheira o fumo e guarda o rolo debaixo do braço. Depois pega o novelo, vira, revira e senta.]

**novelo_11** · PAUSA (2,5 s)
[SFX: cipo_torcendo @ inicio; bloco_madeira @ +0.4; bloco_madeira @ +1.1; bloco_madeira @ +1.8; cipo_torcendo @ +1.9; bloco_madeira @ +2.3]
[AÇÃO: ele gira o novelo e o desenrola, e o cipó se espalha em espirais. Ele bufa, coça a cabeça e recomeça. Atrás dele, Tião e Zé se levantam devagarinho.]

**novelo_12** · FALA [narrador]: E enquanto ele enrolava e desenrolava, desenrolava e enrolava, os dois saíram de mansinho.
[RESPIRO: 0,3 s]
[SFX: passos_folhas @ +2.0]
[AÇÃO: os dois atravessam para a esquerda na ponta dos pés, em passos exagerados, ao som do pífano cômico. O Curupira não levanta os olhos do novelo, mas mexe uma orelha.]

**novelo_13** · FALA [narrador]: E a mata ouviu. Mas dessa vez, deixou passar.
[RESPIRO: 1,0 s]
[SFX: gongo_grave @ fim]
[AÇÃO: os dois saem de cena. O Curupira, sozinho com o novelo, abre um sorriso de lado, e a luz baixa.]

---

## Cena 10 · `aurora`

- **Capítulo:** VII · O caminho de casa
- **Luz:** aurora
- **Ambiente:** `mata_amanhecer`, `riacho`, `sabia` e `araras` ao longe
- **Trilha:**
  - O pau-de-chuva abre a cena. A flauta de taquara retoma o tema do Curupira, agora luminoso e em modo
    maior, com a viola e a rabeca juntas.
  - O cachorro volta com um agogô alegre.
  - A passagem do Curupira tem o batuque mais festivo do espetáculo: alfaia, zabumba e atabaque em tropel,
    com agogô, caxixi e `gongo_sobe`.
  - Tudo para quando ele olha para trás. Depois da fala dele, um assobio longo se afasta.
  - Na lição final, a viola volta sozinha, com humor.
- **Visual:**
  - A aurora nasce baixa, no centro, atrás da samaúma.
  - Ao lado, um ipê-amarelo florido em couro açafrão translúcido.
  - Riacho à esquerda, com Tião e Zé na beira da água.
  - No alto do barranco, em L3, o Curupira passa montado num queixada. A vara vem atrás, e os últimos
    vaga-lumes vão à frente, como batedores. É a imagem mais bonita do espetáculo.
  - Cor de foco: o amarelo do ipê.

**aurora_01** · PAUSA (2,5 s)
[SFX: tambor_grave @ inicio; pau_de_chuva @ +0.4; sabia @ +1.2; riacho @ +1.8]
[AÇÃO: cartela "Capítulo VII · O caminho de casa". O céu clareia de baixo para cima e as flores do ipê se acendem uma a uma.]

**aurora_02** · FALA [narrador]: Quando o céu clareou, o Zé ouviu o riacho. E riacho sempre leva a algum lugar.
[RESPIRO: 0,3 s]
[SFX: ofego @ inicio; riacho @ inicio]
[AÇÃO: Tião e Zé chegam à beira do riacho, exaustos e enlameados.]

**aurora_03** · FALA [narrador]: Na beira, esperava o cachorro, com cara de quem tinha aprendido alguma coisa.
[RESPIRO: 0,6 s]
[SFX: cachorro_latido @ fim; agogo @ fim]
[AÇÃO: o cachorro está sentado na margem, de orelhas caídas, e olha de lado para os donos. Depois corre e pula no Zé, e Tião se ajoelha para fazer carinho na cabeça dele.]

**aurora_04** · FALA [narrador]: Foi aí que, no alto do barranco, ele passou. Montado num queixada, com a vara inteirinha atrás.
[RESPIRO: 0,2 s]
[SFX: queixada_tropel @ +2.0]
[AÇÃO: os dois olham para o alto, à direita.]

**aurora_05** · PAUSA (3,5 s)
[SFX: queixada_tropel @ inicio; gongo_sobe @ inicio; queixada_grunhido @ +0.6; queixada_dentes @ +1.2; agogo @ +1.5; caxixi @ +1.5; araras_revoada @ +2.5; bloco_madeira @ +3.2]
[AÇÃO: no alto do barranco passa o Curupira montado num queixada, de tacape erguido, com as mechas brilhando contra a aurora e os vaga-lumes à frente. A vara inteira vem atrás em tropel, com poeira dourada no feixe, e as araras levantam voo. No último bloco, a música para: ele puxa o queixada, para e olha para o Zé.]

**aurora_06** · FALA [curupira]: Fumo bom, meu neto. Volta quando tiver fome.
[RESPIRO: 0,3 s]
[SFX: —]
[AÇÃO: ele ergue o rolo de fumo como quem brinda. Ainda tem um fiapo de cipó enrolado no tornozelo.]

**aurora_07** · PAUSA (2,5 s)
[SFX: assobio_curupira @ inicio; queixada_tropel @ +0.4; risada_curupira @ +0.8; gongo_desce @ +2.0]
[AÇÃO: um assobio longo. Ele gira o queixada e some do outro lado do barranco com a vara. Os vaga-lumes se apagam, e as pegadas invertidas no alto do barranco se desfazem.]

**aurora_08** · FALA [narrador]: O Tião nunca mais atirou em bicho de bando. Só caçava o que a panela pedia.
[RESPIRO: 0,3 s]
[SFX: —]
[AÇÃO: Tião tira caça do bornal estufado e deixa só o necessário. Ajeita o chapéu, agora sem a pena.]

**aurora_09** · FALA [narrador]: E, por via das dúvidas, nunca mais entrou na mata sem fumo no bornal.
[RESPIRO: 0,4 s]
[SFX: bloco_madeira @ fim]
[AÇÃO: Tião bate no bornal, olha desconfiado para o barranco e apressa o passo.]

**aurora_10** · FALA [narrador]: E o Zé? Aprendeu a hora de guardar o facão.
[RESPIRO: 1,0 s]
[SFX: agogo @ fim]
[AÇÃO: Zé põe o facão na cintura e sai pela esquerda com o cachorro atrás, e os dois caçadores somem ao sol.]

---

## Cena 11 · `encerramento`

- **Capítulo:** nenhum
- **Luz:** lamparina
- **Ambiente:** `lamparina_chama`, `grilos`
- **Trilha:**
  - Volta o clima da abertura: surdo de coração lento e rabeca em nota longa.
  - A flauta de taquara toca a primeira frase do tema do Curupira e deixa a segunda sem resposta.
  - Antes da última frase, silêncio total.
  - No sopro que apaga a lamparina, um `gongo_grave` reverbera até o fim.
- **Visual:**
  - A mata recua e o papel volta ao âmbar da lamparina.
  - Um par de pegadas invertidas fica sozinho no centro do chão.
  - No fim, a lamparina se apaga, as pegadas brilham um instante e o escuro fica total.

**encerramento_01** · FALA [narrador]: E o Curupira? Continua lá, batendo nas sapopemas antes de cada tempestade.
[RESPIRO: 0,4 s]
[SFX: batida_tronco @ fim]
[AÇÃO: em L4, bem desfocadas, aparecem a silhueta da samaúma e uma sombrinha que bate nela. Depois tudo recua.]

**encerramento_02** · FALA [narrador]: Se um dia você ouvir um assobio fino lá na mata, bem fino...
[RESPIRO: 1,5 s]
[SFX: assobio_curupira @ fim]
[AÇÃO: a chama da lamparina se inclina. No silêncio, as pegadas invertidas aparecem no centro do chão.]

**encerramento_03** · FALA [narrador]: Não precisa correr, não. Só pergunta para a sua barriga se aquilo é fome... ou se é gula.
[RESPIRO: 0,6 s]
[SFX: bloco_madeira @ fim]
[AÇÃO: o tom é de conversa com a plateia, sorrindo.]

**encerramento_04** · FALA [narrador]: Porque o dono da mata sabe a diferença. E a mata, essa, sempre ouve.
[RESPIRO: 0,6 s]
[SFX: —]
[AÇÃO: a voz baixa até quase um sussurro na última palavra.]

**encerramento_05** · PAUSA (3,5 s)
[SFX: sopro_apaga @ +0.4; gongo_grave @ +0.5; assobio_curupira @ +2.6]
[AÇÃO: um sopro apaga a lamparina e o papel escurece. As pegadas brilham um instante e somem. No escuro total, um último assobio, bem longe.]

---

## Etiquetas de som novas (`sons_novos`)

- `facao_golpe`: golpe de facão no mato e num tronco fino. Som seco com a lâmina vibrando. Os caçadores
  usam facão, não machado.
- `cachimbo_baforada`: tragada e sopro de cachimbo de barro, com um estalo leve de fumo queimando.

## Contagem e estimativa de duração

Contagem automática das linhas `FALA`. A estimativa usa dois ritmos de voz sintética: um mais lento, de
causo, e um normal.

| papel | falas | palavras | a 150 palavras por minuto | a 160 palavras por minuto |
|---|---|---|---|---|
| narrador | 60 | 894 | 357 s | 335 s |
| tiao | 7 | 61 | 26 s | 24 s |
| ze | 8 | 48 | 19 s | 18 s |
| vo | 3 | 44 | 20 s | 19 s |
| curupira, com a cantiga mais lenta | 3 | 30 | 16 s | 14 s |
| **total falado** | **81** | **1077** | **438 s** | **410 s** |

| componente | segundos |
|---|---|
| pausas de som e ação: 25 beats, de 2 a 4 s | 63,5 |
| respiros entre falas: 81 valores de `pausa_depois` | 35,7 |
| **duração total estimada** | **de 510 a 538 s, ou seja, de 8 min 30 s a 8 min 58 s** |

Se a voz final ficar mais lenta e passar de nove minutos, estes são os cortes mais baratos, que não perdem
nenhum elemento da tradição:
- `mata_04`, a fala do tatu, que vira só ação;
- a segunda frase de `guardiao_08`;
- `aurora_09`;
- reduzir as cartelas de capítulo para dois segundos.
