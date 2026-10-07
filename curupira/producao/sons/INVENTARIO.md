# Inventário da biblioteca sonora

Auditoria de `producao/sons/` (natureza, musica, acao). O `inventario.json` ao lado é lido pelo `trilha/mixar.py`: para cada etiqueta, `arquivos` (caminhos relativos a `sons/`, o mixar sorteia um por evento), `sintetizar` (se verdadeiro, o mixar chama a função de mesmo nome em `trilha/sintese.py` e só usa os arquivos se a síntese falhar) e `receita`.

## Resumo

- 370 arquivos na biblioteca, 364 na lista do inventário, 6 deixados de reserva fora da lista.
- 110 etiquetas: as 65 do BRIEFING, as 7 `sons_novos` do roteiro e os extras da biblioteca. Todas têm arquivo ou síntese.
- Todos os arquivos decodificam com soundfile e ffmpeg. Nenhum está mudo. Clipping só em `acao/tiro_espingarda__3.mp3` (6 amostras) e `acao/fosforo__3.mp3` (2), acima de 0 dBFS por menos de 0,3 dB; o ganho da mixagem resolve.
- Licenças conferidas na página de origem de cada um dos 351 arquivos originais (Freesound, API do Wikimedia Commons, LICENSE dos repositórios VCSL e VSCO-2-CE): todas batem com `fontes.json`. Nenhuma NC, ND ou desconhecida, então nada foi apagado por licença.
- Síntese recomendada: `gongo_sobe`, `gongo_desce`, `bloco_acelera` (funções já existentes em `trilha/sintese.py`).

## O que a auditoria mudou

- Acrescentados 19 arquivos para as 7 etiquetas `sons_novos` do roteiro que não tinham nenhum som: `facao_golpe`, `risada_homem`, `cipo_chicote`, `uivo_curupira`, `pilao_batida`, `cachimbo_baforada` (em `acao/`) e `gotejar` (em `natureza/`), com registro em `fontes.json`.
- Corrigidas as descrições de `musica/rabeca_glissando__1` e `__2`: a direção estava trocada e a extensão é ~5 semitons, não ~2 oitavas.
- Fora da lista do inventário (os arquivos continuam na pasta):
  - `acao/assobio_curupira__1.mp3`: tom de altura fixa (1,8 kHz ±1%) com ruído de manuseio no começo; soa como apito, não como o chamado.
  - `natureza/onca_esturro__3.wav`: rugido de tigre; a onça esturra em "serrote" (os outros dois arquivos são onça e leopardo reais).
  - `acao/chamado_eco__3.mp3`: eco de garagem vazia; o mixar.py já aplica eco de mata ao chamado_eco.
  - `acao/arvore_rangendo__3.wav`: rangido fraco (pico −26 dBFS) sob ruído largo; com o ganho da mixagem sobe o chiado.
  - `musica/maraca__2.ogg`: ronco grave forte (energia abaixo de 80 Hz a −18 dB do total) sob a sacudida; a maraca entra 8 vezes no roteiro.
  - `natureza/vento_folhas__2.mp3`: nível muito baixo (RMS −60 dBFS, 77% do arquivo abaixo de −60 dBFS); normalizar levanta o chiado do gravador.

## Riscos para a mixagem

- **Etiqueta usada como ambiente e como efeito.** O `mixar.py` usa a mesma lista nos dois papéis. Como efeito, um arquivo longo toca inteiro a partir do evento (`lamparina_chama` 6 vezes, `riacho` 5, `vento_folhas` 3, `gotejar` 2, `chuva_mata` 2, `tempestade` e `mata_noite`): de 28 s a 6 min, cortados com fade de 20 ms. Como ambiente, um recorte curto vira laço de 2/3 da duração: `sabia`, `araras`, `urutau`, `coruja`, `cigarras`, `grilos` e `sapos` têm só recortes de até 8 s e repetem a cada ~5 s por cenas inteiras, com loudness de cama (−33 LUFS). Sugestão: no mixar, bicho em `ambiente` vira eventos espalhados no tempo, e efeito de etiqueta de ambiência é limitado a alguns segundos com fade.
- `risada_curupira` e `uivo_curupira` são vozes humanas reais sem processamento; o mixar não chama `sintese.curupirizar`.
- Arquivos baixos que dependem do ganho da mixagem: `cachorro_latido__1` (cão ao longe, pico −30 dBFS), `arvore_rangendo__3`, `sopro_apaga__1` e `__3`, `cipo_torcendo__1`, `lamparina_chama__3`, `musica/reco_reco__2` e `__3`, `mata_amanhecer__2` e `__3`, `mata_noite__3`, `chuva_mata__3`.
- Oito mp3 longos de natureza são cópias de fluxo de downloads parciais e dão aviso de "backstep" no ffmpeg no primeiro quadro; o crossfade da `cama` esconde.
- `acao/coracao__2.wav` tem leve DC (−0,013); um passa-altas resolve.

## Tabela por etiqueta

| Etiqueta | Grupo | Uso no roteiro (efeito / ambiente) | Arquivos | Síntese | Observação |
|---|---|---|---|---|---|
| `mata_amanhecer` | Ambiências | 0 / 2 | `mata_amanhecer__1.mp3`, `mata_amanhecer__2.mp3`, `mata_amanhecer__3.mp3` | não |  |
| `mata_dia` | Ambiências | 0 / 3 | `mata_dia__1.mp3`, `mata_dia__2.mp3`, `mata_dia__3.mp3` | não |  |
| `mata_noite` | Ambiências | 1 / 3 | `mata_noite__1.mp3`, `mata_noite__2.mp3`, `mata_noite__3.mp3` | não |  |
| `chuva_mata` | Ambiências | 2 / 3 | `chuva_mata__1.mp3`, `chuva_mata__2.mp3`, `chuva_mata__3.mp3` | não |  |
| `tempestade` | Ambiências | 1 / 1 | `tempestade__1.mp3`, `tempestade__2.mp3`, `tempestade__3.mp3` | não |  |
| `vento_folhas` | Ambiências | 3 / 4 | `vento_folhas__1.mp3`, `vento_folhas__3.mp3` | não | Fora da lista: vento_folhas__2.mp3. |
| `riacho` | Ambiências | 5 / 3 | `riacho__1.mp3`, `riacho__2.mp3`, `riacho__3.mp3` | não |  |
| `lamparina_chama` | Ambiências | 6 / 3 | `lamparina_chama__1.mp3`, `lamparina_chama__2.mp3`, `lamparina_chama__3.mp3` | não |  |
| `araras` | Bichos | 2 / 1 | `araras__1.wav`, `araras__2.wav` | não |  |
| `araras_revoada` | Bichos | 3 / 0 | `araras_revoada__1.wav`, `araras_revoada__2.wav` | não | o __2 é só bater de asas (pombos), para sobrepor. |
| `tucano` | Bichos | 0 / 0 | `tucano__1.wav`, `tucano__2.wav`, `tucano__3.wav` | não |  |
| `sabia` | Bichos | 3 / 2 | `sabia__1.wav`, `sabia__2.wav` | não |  |
| `araponga` | Bichos | 0 / 0 | `araponga__1.wav`, `araponga__2.wav` | não |  |
| `urutau` | Bichos | 1 / 1 | `urutau__1.wav`, `urutau__2.wav`, `urutau__3.wav` | não |  |
| `coruja` | Bichos | 1 / 1 | `coruja__1.flac`, `coruja__2.wav`, `coruja__3.wav` | não |  |
| `inhambu` | Bichos | 2 / 0 | `inhambu__1.wav` | não | CC BY-SA 4.0 (último recurso, sinalizado): no Commons só há tinamídeos BY-SA; o único CC0 do Freesound ("Tinamou bird", 798321) não tem o pio audível. |
| `bugio` | Bichos | 2 / 0 | `bugio__1.wav`, `bugio__2.wav`, `bugio__3.wav` | não |  |
| `macaco_gritos` | Bichos | 1 / 0 | `macaco_gritos__1.mp3`, `macaco_gritos__2.mp3`, `macaco_gritos__3.wav` | não |  |
| `onca_esturro` | Bichos | 1 / 0 | `onca_esturro__1.flac`, `onca_esturro__2.mp3` | não | Fora da lista: onca_esturro__3.wav. |
| `onca_rosnado` | Bichos | 0 / 0 | `onca_rosnado__1.wav`, `onca_rosnado__2.wav`, `onca_rosnado__3.wav` | não | substituto: tigre e leão. |
| `queixada_grunhido` | Bichos | 4 / 0 | `queixada_grunhido__1.wav`, `queixada_grunhido__2.wav` | não | substituto: porco e javali (não existe gravação de queixada/cateto com licença aberta). |
| `queixada_dentes` | Bichos | 4 / 0 | `queixada_dentes__1.mp3`, `queixada_dentes__2.wav` | não | substituto: dentes de cachorro e dentes humanos batendo. |
| `queixada_tropel` | Bichos | 5 / 0 | `queixada_tropel__1.wav`, `queixada_tropel__2.wav` | não | substituto: patadas de animal grande e estouro de manada. |
| `veado_alarme` | Bichos | 1 / 0 | `veado_alarme__1.wav`, `veado_alarme__2.wav`, `veado_alarme__3.wav` | não | bufo de veado-de-cauda-branca e latidos de veados europeus. |
| `sapos` | Bichos | 2 / 3 | `sapos__1.wav`, `sapos__2.wav`, `sapos__3.wav` | não |  |
| `cigarras` | Bichos | 1 / 4 | `cigarras__1.wav`, `cigarras__2.wav`, `cigarras__3.wav` | não |  |
| `grilos` | Bichos | 1 / 6 | `grilos__1.wav`, `grilos__2.wav`, `grilos__3.wav` | não |  |
| `passos_folhas` | Gente e ação | 6 / 0 | `passos_folhas__1.wav`, `passos_folhas__2.wav` | não |  |
| `corrida_folhas` | Gente e ação | 2 / 0 | `corrida_folhas__1.wav`, `corrida_folhas__2.wav`, `corrida_folhas__3.wav` | não |  |
| `galho_quebra` | Gente e ação | 3 / 0 | `galho_quebra__1.mp3`, `galho_quebra__2.mp3`, `galho_quebra__3.wav` | não |  |
| `machado_golpe` | Gente e ação | 0 / 0 | `machado_golpe__1.wav`, `machado_golpe__2.wav`, `machado_golpe__3.wav` | não | o roteiro usa facao_golpe no lugar. |
| `arvore_rangendo` | Gente e ação | 3 / 0 | `arvore_rangendo__1.wav`, `arvore_rangendo__2.wav` | não | Fora da lista: arvore_rangendo__3.wav. |
| `arvore_caindo` | Gente e ação | 1 / 0 | `arvore_caindo__1.mp3`, `arvore_caindo__2.wav`, `arvore_caindo__3.wav` | não |  |
| `tiro_espingarda` | Gente e ação | 2 / 0 | `tiro_espingarda__1.mp3`, `tiro_espingarda__2.mp3`, `tiro_espingarda__3.mp3` | não |  |
| `espingarda_engatilhar` | Gente e ação | 2 / 0 | `espingarda_engatilhar__1.wav`, `espingarda_engatilhar__2.wav`, `espingarda_engatilhar__3.wav` | não |  |
| `cachorro_latido` | Gente e ação | 6 / 0 | `cachorro_latido__1.wav`, `cachorro_latido__2.wav`, `cachorro_latido__3.wav` | não |  |
| `cachorro_ganido` | Gente e ação | 4 / 0 | `cachorro_ganido__1.mp3`, `cachorro_ganido__2.wav`, `cachorro_ganido__3.wav` | não |  |
| `grito_homem` | Gente e ação | 0 / 0 | `grito_homem__1.mp3`, `grito_homem__2.mp3`, `grito_homem__3.mp3` | não |  |
| `grito_pavor` | Gente e ação | 2 / 0 | `grito_pavor__1.mp3`, `grito_pavor__2.mp3`, `grito_pavor__3.wav` | não |  |
| `chamado_eco` | Gente e ação | 2 / 0 | `chamado_eco__1.wav`, `chamado_eco__2.wav` | não | Fora da lista: chamado_eco__3.mp3. |
| `ofego` | Gente e ação | 1 / 0 | `ofego__1.wav`, `ofego__2.wav`, `ofego__3.wav` | não |  |
| `risada_curupira` | Gente e ação | 1 / 0 | `risada_curupira__1.mp3`, `risada_curupira__2.mp3`, `risada_curupira__3.wav` | não | risadas de menino sem processamento; o mixar.py não aplica sintese.curupirizar. |
| `assobio_curupira` | Gente e ação | 6 / 0 | `assobio_curupira__2.mp3`, `assobio_curupira__3.wav` | não | reais (dedos com reverb de igreja; voz desacelerada fantasmagórica). Alternativa: sintese.assobio_curupira(variante=chamado|curto|distante|espiral), que casa com os 6 assobios do roteiro. Fora da lista: assobio_curupira__1.mp3. |
| `batida_tronco` | Gente e ação | 8 / 0 | `batida_tronco__1.wav`, `batida_tronco__2.mp3`, `batida_tronco__3.wav` | não |  |
| `cipo_torcendo` | Gente e ação | 5 / 0 | `cipo_torcendo__1.wav`, `cipo_torcendo__2.wav`, `cipo_torcendo__3.wav` | não |  |
| `folhagem_mexe` | Gente e ação | 5 / 0 | `folhagem_mexe__1.mp3`, `folhagem_mexe__2.wav`, `folhagem_mexe__3.wav` | não |  |
| `fosforo` | Gente e ação | 1 / 0 | `fosforo__1.mp3`, `fosforo__2.wav`, `fosforo__3.mp3` | não |  |
| `sopro_apaga` | Gente e ação | 1 / 0 | `sopro_apaga__1.wav`, `sopro_apaga__2.mp3`, `sopro_apaga__3.wav` | não |  |
| `coracao` | Gente e ação | 4 / 0 | `coracao__1.mp3`, `coracao__2.wav`, `coracao__3.mp3` | não | reais e limpos (60 e 80 bpm, estetoscópio); síntese não necessária. |
| `trovao` | Gente e ação | 6 / 0 | `trovao__1.wav`, `trovao__2.wav`, `trovao__3.wav` | não |  |
| `relampago_estalo` | Gente e ação | 2 / 0 | `relampago_estalo__1.wav`, `relampago_estalo__2.wav`, `relampago_estalo__3.wav` | não |  |
| `gongo_grave` | Música (pontuações do BRIEFING) | 12 / 0 | `gongo_grave__1.wav`, `gongo_grave__2.wav`, `gongo_grave__3.wav` | não |  |
| `gongo_sobe` | Música (pontuações do BRIEFING) | 4 / 0 | `gongo_sobe__1.wav`, `gongo_sobe__2.ogg`, `gongo_sobe__3.wav` | sim |  |
| `gongo_desce` | Música (pontuações do BRIEFING) | 6 / 0 | `gongo_desce__1.ogg`, `gongo_desce__2.ogg`, `gongo_desce__3.ogg` | sim |  |
| `bloco_madeira` | Música (pontuações do BRIEFING) | 8 / 0 | `bloco_madeira__1.wav`, `bloco_madeira__2.wav`, `bloco_madeira__3.wav` | não |  |
| `bloco_acelera` | Música (pontuações do BRIEFING) | 2 / 0 | `bloco_acelera__1.wav` | sim |  |
| `prato` | Música (pontuações do BRIEFING) | 5 / 0 | `prato__1.wav`, `prato__2.wav`, `prato__3.wav` | não |  |
| `tambor_grave` | Música (pontuações do BRIEFING) | 7 / 0 | `tambor_grave__1.wav`, `tambor_grave__2.wav`, `tambor_grave__3.wav` | não |  |
| `rufar` | Música (pontuações do BRIEFING) | 1 / 0 | `rufar__1.wav`, `rufar__2.wav`, `rufar__3.wav` | não | reais (caixa, tambor de quadro em crescendo, bumbo); para a tempestade, o bumbo (__3) é o melhor. |
| `maraca` | Música (pontuações do BRIEFING) | 8 / 0 | `maraca__1.wav`, `maraca__3.wav` | não | Fora da lista: maraca__2.ogg. |
| `caxixi` | Música (pontuações do BRIEFING) | 11 / 0 | `caxixi__1.ogg`, `caxixi__2.wav` | não |  |
| `agogo` | Música (pontuações do BRIEFING) | 4 / 0 | `agogo__1.wav`, `agogo__2.wav`, `agogo__3.wav` | não |  |
| `berimbau` | Música (pontuações do BRIEFING) | 2 / 0 | `berimbau__1.wav`, `berimbau__2.wav`, `berimbau__3.wav` | não |  |
| `flauta_chamado` | Música (pontuações do BRIEFING) | 8 / 0 | `flauta_chamado__1.wav`, `flauta_chamado__2.wav`, `flauta_chamado__3.wav` | não |  |
| `pau_de_chuva` | Música (pontuações do BRIEFING) | 4 / 0 | `pau_de_chuva__1.wav`, `pau_de_chuva__2.wav`, `pau_de_chuva__3.wav` | não |  |
| `facao_golpe` | Etiquetas novas do roteiro (sons_novos) | 4 / 0 | `facao_golpe__1.wav`, `facao_golpe__2.wav`, `facao_golpe__3.wav` | não | novo (auditoria). |
| `risada_homem` | Etiquetas novas do roteiro (sons_novos) | 2 / 0 | `risada_homem__1.wav`, `risada_homem__2.wav`, `risada_homem__3.wav` | não | novo (auditoria). |
| `cipo_chicote` | Etiquetas novas do roteiro (sons_novos) | 2 / 0 | `cipo_chicote__1.wav`, `cipo_chicote__2.wav`, `cipo_chicote__3.wav` | não | novo (auditoria); chicote de couro, assobio do ar e estalo. |
| `uivo_curupira` | Etiquetas novas do roteiro (sons_novos) | 2 / 0 | `uivo_curupira__1.wav`, `uivo_curupira__2.wav`, `uivo_curupira__3.wav` | não | novo (auditoria); vozes humanas reais, pedem sintese.curupirizar ou ao menos eco de mata. |
| `pilao_batida` | Etiquetas novas do roteiro (sons_novos) | 2 / 1 | `pilao_batida__1.wav`, `pilao_batida__2.wav` | não | novo; sequência de ~9 socadas (10 s), porque a etiqueta é ambiente e sfx ao mesmo tempo (golpe único viraria laço de 0,4 s). |
| `cachimbo_baforada` | Etiquetas novas do roteiro (sons_novos) | 2 / 0 | `cachimbo_baforada__1.wav`, `cachimbo_baforada__2.wav`, `cachimbo_baforada__3.wav` | não | novo (auditoria); três sopros de fumaça da mesma gravação. |
| `gotejar` | Etiquetas novas do roteiro (sons_novos) | 2 / 2 | `gotejar__1.flac`, `gotejar__2.flac` | não | novo; camadas de 62 a 80 s (ambiente e sfx no roteiro). |
| `alfaia` | Extras da biblioteca | 0 / 0 | `alfaia__1.ogg` | não |  |
| `apito` | Extras da biblioteca | 0 / 0 | `apito__1.ogg`, `apito__2.wav` | não |  |
| `atabaque` | Extras da biblioteca | 0 / 0 | `atabaque__1.wav`, `atabaque__2.wav` | não |  |
| `berimbau_nota` | Extras da biblioteca | 0 / 0 | `berimbau_nota__1.wav`, `berimbau_nota__2.ogg`, `berimbau_nota__3.ogg` | não |  |
| `berimbau_preso` | Extras da biblioteca | 0 / 0 | `berimbau_preso__1.wav`, `berimbau_preso__2.wav` | não |  |
| `berimbau_solto` | Extras da biblioteca | 0 / 0 | `berimbau_solto__1.wav`, `berimbau_solto__2.wav` | não |  |
| `bongo` | Extras da biblioteca | 0 / 0 | `bongo__1.wav`, `bongo__2.wav` | não |  |
| `caixa` | Extras da biblioteca | 0 / 0 | `caixa__1.wav`, `caixa__2.wav`, `caixa__3.wav` | não |  |
| `claves` | Extras da biblioteca | 0 / 0 | `claves__1.wav`, `claves__2.wav` | não |  |
| `conga` | Extras da biblioteca | 0 / 0 | `conga__1.wav`, `conga__2.wav`, `conga__3.wav` | não |  |
| `djembe` | Extras da biblioteca | 0 / 0 | `djembe__1.wav`, `djembe__2.ogg`, `djembe__3.ogg` | não |  |
| `drone_grave` | Extras da biblioteca | 0 / 0 | `drone_grave__1.ogg`, `drone_grave__2.ogg` | não | o __2 é sintetizado; a LINGUAGEM_MUSICAL veta pads sintéticos. |
| `flauta` | Extras da biblioteca | 0 / 0 | `flauta__A#4.wav`, `flauta__A#5.wav`, `flauta__C5.wav`, `flauta__C6.wav`, `flauta__D5.wav`, `flauta__D6.wav`, `flauta__E5.wav`, `flauta__E6.wav`, `flauta__F#5.wav`, `flauta__F4.wav`, `flauta__G#4.wav`, `flauta__G#5.wav` | não |  |
| `flauta_bambu` | Extras da biblioteca | 0 / 0 | `flauta_bambu__G3.ogg` | não |  |
| `flauta_grave` | Extras da biblioteca | 0 / 0 | `flauta_grave__A3.wav`, `flauta_grave__B3.wav`, `flauta_grave__C4.wav`, `flauta_grave__D4.wav`, `flauta_grave__E4.wav`, `flauta_grave__F3.wav`, `flauta_grave__F4.wav`, `flauta_grave__G3.wav` | não |  |
| `ganza` | Extras da biblioteca | 0 / 0 | `ganza__1.ogg`, `ganza__2.ogg` | não |  |
| `gongo_rufo` | Extras da biblioteca | 0 / 0 | `gongo_rufo__1.wav` | não |  |
| `kalimba` | Extras da biblioteca | 0 / 0 | `kalimba__A#4.wav`, `kalimba__A#5.wav`, `kalimba__B3.wav`, `kalimba__B5.wav`, `kalimba__C#4.wav`, `kalimba__C#5.wav`, `kalimba__D#5.wav`, `kalimba__D5.wav`, `kalimba__F#5.wav`, `kalimba__F4.wav`, `kalimba__G3.wav`, `kalimba__G4.wav`, `kalimba__G5.wav` | não |  |
| `marimba` | Extras da biblioteca | 0 / 0 | `marimba__C#4.wav`, `marimba__C5.wav`, `marimba__C6.wav`, `marimba__F4.wav`, `marimba__F5.wav`, `marimba__F6.wav` | não |  |
| `ocarina` | Extras da biblioteca | 0 / 0 | `ocarina__A#5.wav`, `ocarina__A4.wav`, `ocarina__A5.wav`, `ocarina__B4.wav`, `ocarina__C#5.wav`, `ocarina__C#6.wav`, `ocarina__C6.wav`, `ocarina__D5.wav`, `ocarina__E5.wav`, `ocarina__F#5.wav`, `ocarina__G#5.wav` | não |  |
| `pandeiro` | Extras da biblioteca | 0 / 0 | `pandeiro__1.ogg`, `pandeiro__2.ogg`, `pandeiro__3.wav` | não |  |
| `pratinhos` | Extras da biblioteca | 0 / 0 | `pratinhos__1.wav`, `pratinhos__2.wav` | não |  |
| `prato_arco` | Extras da biblioteca | 0 / 0 | `prato_arco__1.wav`, `prato_arco__2.wav` | não |  |
| `prato_rufo` | Extras da biblioteca | 0 / 0 | `prato_rufo__1.wav`, `prato_rufo__2.wav` | não |  |
| `prato_suspenso` | Extras da biblioteca | 0 / 0 | `prato_suspenso__1.wav`, `prato_suspenso__2.wav`, `prato_suspenso__3.wav` | não |  |
| `quena` | Extras da biblioteca | 0 / 0 | `quena__A4.wav`, `quena__A5.wav`, `quena__B4.wav`, `quena__B5.wav`, `quena__C5.wav`, `quena__D5.wav`, `quena__E5.wav`, `quena__F#5.wav`, `quena__G4.wav`, `quena__G5.wav` | não |  |
| `rabeca` | Extras da biblioteca | 0 / 0 | `rabeca__A3.wav`, `rabeca__A4.wav`, `rabeca__A5.wav`, `rabeca__C4.wav`, `rabeca__C5.wav`, `rabeca__C6.wav`, `rabeca__E4.wav`, `rabeca__E5.wav`, `rabeca__G3.wav`, `rabeca__G4.wav`, `rabeca__G5.wav` | não |  |
| `rabeca_glissando` | Extras da biblioteca | 0 / 0 | `rabeca_glissando__1.wav`, `rabeca_glissando__2.wav` | não | descrições corrigidas: o __1 sobe e o __2 desce, ~5 semitons. |
| `rabeca_tremolo` | Extras da biblioteca | 0 / 0 | `rabeca_tremolo__A4.wav`, `rabeca_tremolo__C4.wav`, `rabeca_tremolo__E4.wav`, `rabeca_tremolo__G3.wav`, `rabeca_tremolo__G4.wav` | não |  |
| `reco_reco` | Extras da biblioteca | 0 / 0 | `reco_reco__1.wav`, `reco_reco__2.wav`, `reco_reco__3.wav` | não | __2 e __3 muito baixos (pico −38 dBFS), precisam de ganho. |
| `salterio_arco` | Extras da biblioteca | 0 / 0 | `salterio_arco__A#4.wav`, `salterio_arco__A#5.wav`, `salterio_arco__C5.wav`, `salterio_arco__C6.wav`, `salterio_arco__D5.wav`, `salterio_arco__D6.wav`, `salterio_arco__E5.wav`, `salterio_arco__E6.wav`, `salterio_arco__F#5.wav`, `salterio_arco__F#6.wav`, `salterio_arco__G#5.wav` | não |  |
| `slapstick` | Extras da biblioteca | 0 / 0 | `slapstick__1.wav`, `slapstick__2.wav` | não |  |
| `surdo` | Extras da biblioteca | 0 / 0 | `surdo__1.wav`, `surdo__2.wav` | não |  |
| `tambor_tronco` | Extras da biblioteca | 0 / 0 | `tambor_tronco__1.wav`, `tambor_tronco__2.wav`, `tambor_tronco__3.wav` | não |  |
| `tamborim` | Extras da biblioteca | 0 / 0 | `tamborim__1.wav`, `tamborim__2.wav`, `tamborim__3.wav` | não |  |
| `vento_rajada` | Extras da biblioteca | 0 / 0 | `vento_rajada__1.wav`, `vento_rajada__2.wav` | não | fora do vocabulário e do roteiro. |
| `vento_uivando` | Extras da biblioteca | 0 / 0 | `vento_uivando__1.mp3`, `vento_uivando__2.mp3`, `vento_uivando__3.mp3` | não | fora do vocabulário e do roteiro. |
| `viola` | Extras da biblioteca | 0 / 0 | `viola__A3.wav`, `viola__A4.wav`, `viola__A5.wav`, `viola__B3.wav`, `viola__B4.wav`, `viola__C#4.wav`, `viola__C#5.wav`, `viola__D3.wav`, `viola__D4.wav`, `viola__D5.wav`, `viola__E3.wav`, `viola__E4.wav`, `viola__E5.wav`, `viola__F#3.wav`, `viola__F#4.wav`, `viola__F#5.wav`, `viola__G3.wav`, `viola__G4.wav`, `viola__G5.wav` | não |  |

Receitas de síntese:

- `gongo_sobe`: sintese.gongo_sobe(semente) em trilha/sintese.py: gongo modal de 470 Hz cuja altura sobe ~2,5 semitons logo após o golpe (2,8 s). Evita o timbre identificável do xiaoluo da ópera de Pequim (regra 7 da LINGUAGEM_MUSICAL). Os arquivos listados são xiaoluo reais (CC BY 4.0, sobem ~1,5 semitom medidos) e servem só de reserva se a síntese falhar.
- `gongo_desce`: sintese.gongo_desce(semente) em trilha/sintese.py: gongo modal de 300 Hz cuja altura cai ~3 semitons depois do ataque (4,2 s). Mesmo motivo do gongo_sobe. Os arquivos listados são daluo reais (CC BY 4.0, descem 3 a 4 semitons medidos), reserva.
- `bloco_acelera`: sintese.bloco_acelera(n=16, dur=2.4, altura=1100) em trilha/sintese.py: golpes de bloco que aceleram em curva exponencial até 45 ms entre golpes e fecham num golpe forte duplo (convenção do bangzi). O único arquivo real (dedos numa caixa de madeira, 8 s, de 1 s a 0,3 s entre golpes) é lento e longo demais para a pontuação; fica de reserva. Para timbre real, dá para sequenciar musica/bloco_madeira__1..3 com os mesmos tempos.

## Créditos (pronto para virar CREDITOS.md)

Só os arquivos que estão no inventário. CC BY e CC BY-SA exigem este crédito; CC0 não exige, mas fica registrado.

### CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)

- "Whistle, Finger, Long, A.wav", InspectorJ (www.jshaw.co.uk). https://freesound.org/people/InspectorJ/sounds/423287/ (arquivos: assobio_curupira__2.mp3)
- "stretched_howl_female.wav", xpoki. https://freesound.org/people/xpoki/sounds/432760/ (arquivos: uivo_curupira__3.wav)
- "Berimbau_01.aiff", Paulo_Gonçalves. https://freesound.org/people/Paulo_Gon%C3%A7alves/sounds/177004/ (arquivos: berimbau_nota__1.wav)
- "Berimbau_02.aiff", Paulo_Gonçalves. https://freesound.org/people/Paulo_Gon%C3%A7alves/sounds/177003/ (arquivos: berimbau_nota__2.ogg)
- "Berimbau_04.aiff", Paulo_Gonçalves. https://freesound.org/people/Paulo_Gon%C3%A7alves/sounds/177067/ (arquivos: berimbau_nota__3.ogg)
- "daluo_41", ajaysm. https://freesound.org/people/ajaysm/sounds/222228/ (arquivos: gongo_desce__1.ogg)
- "daluo_43", ajaysm. https://freesound.org/people/ajaysm/sounds/222230/ (arquivos: gongo_desce__2.ogg)
- "daluo_02", ajaysm. https://freesound.org/people/ajaysm/sounds/222190/ (arquivos: gongo_desce__3.ogg)
- "xiaoluo_54", ajaysm. https://freesound.org/people/ajaysm/sounds/222350/ (arquivos: gongo_sobe__1.wav)
- "xiaoluo_58", ajaysm. https://freesound.org/people/ajaysm/sounds/222354/ (arquivos: gongo_sobe__2.ogg)
- "xiaoluo_65", ajaysm. https://freesound.org/people/ajaysm/sounds/222361/ (arquivos: gongo_sobe__3.wav)
- "Amazon Forest - A wild population of red-and-green macaws (Ara chloropterus)", ricardoemfield. https://freesound.org/people/ricardoemfield/sounds/811332/ (arquivos: araras__1.wav)
- "Mantled_Howler_Monkey_(Alouatta_palliata)_(W_ALOUATTA_PALLIATA_R1_C2).ogg", Richard Ranft (gravação) / The British Library Board. https://commons.wikimedia.org/wiki/File:Mantled_Howler_Monkey_(Alouatta_palliata)_(W_ALOUATTA_PALLIATA_R1_C2).ogg (arquivos: bugio__1.wav)
- "American_Barn_Owl_Screech.flac", Daniel Polin. https://commons.wikimedia.org/wiki/File:American_Barn_Owl_Screech.flac (arquivos: coruja__1.flac)
- "Amazon Jungle - Day", RTB45. https://freesound.org/people/RTB45/sounds/473569/ (arquivos: mata_dia__2.mp3)
- "Amazon Jungle - Night", RTB45. https://freesound.org/people/RTB45/sounds/473570/ (arquivos: mata_noite__1.mp3)
- "Jaguar_saw.flac", About Zoos. https://commons.wikimedia.org/wiki/File:Jaguar_saw.flac (arquivos: onca_esturro__1.flac)
- "Large Animal Running", bevibeldesign. https://freesound.org/people/bevibeldesign/sounds/350423/ (arquivos: queixada_tropel__1.wav)
- "Toco_Toucan_call_(Ramphastos_toco).ogg", Fabrício Grigolin. https://commons.wikimedia.org/wiki/File:Toco_Toucan_call_(Ramphastos_toco).ogg (arquivos: tucano__1.wav)
- "Common_Potoo_(Nyctibius_griseus)_(W1CDR0000523_BD1).ogg", Richard Ranft (gravação) / The British Library Board. https://commons.wikimedia.org/wiki/File:Common_Potoo_(Nyctibius_griseus)_(W1CDR0000523_BD1).ogg (arquivos: urutau__1.wav, urutau__2.wav)
- "Wind Through Trees 3b", spoonbender. https://freesound.org/people/spoonbender/sounds/244942/ (arquivos: vento_folhas__1.mp3)
- "Trees Blowing in a Steady Wind", byjoshberry. https://freesound.org/people/byjoshberry/sounds/551318/ (arquivos: vento_folhas__3.mp3)

### CC BY 3.0 (http://creativecommons.org/licenses/by/3.0/)

- "Leopard's Cough Isolated.wav", drobiumdesign. https://freesound.org/people/drobiumdesign/sounds/346402/ (arquivos: onca_esturro__2.mp3)
- "Wild Boar / Grunting / Squealing", TheVeoMammoth11. https://freesound.org/people/TheVeoMammoth11/sounds/492654/ (arquivos: queixada_grunhido__2.wav)

### CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0)

Compartilha pela mesma licença: a obra derivada que contém este trecho também fica sob CC BY-SA 4.0.

- "Crypturellus_tataupa_-_Tataupa_Tinamou_XC433997.mp3", maria belotti. https://commons.wikimedia.org/wiki/File:Crypturellus_tataupa_-_Tataupa_Tinamou_XC433997.mp3 (arquivos: inhambu__1.wav)

### CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)

- "Big Tree Fall in Forest", Kinoton. https://freesound.org/people/Kinoton/sounds/494071/ (arquivos: arvore_caindo__1.mp3)
- "Tall dead tree splintering then falling to ground with crashing Impact", ozymandias37. https://freesound.org/people/ozymandias37/sounds/869103/ (arquivos: arvore_caindo__2.wav)
- "falling gumtree.wav", ianoboe. https://freesound.org/people/ianoboe/sounds/150203/ (arquivos: arvore_caindo__3.wav)
- "Creaking Tree in Liwa Forest", GirlWithSoundRecorder. https://freesound.org/people/GirlWithSoundRecorder/sounds/441041/ (arquivos: arvore_rangendo__1.wav)
- "A tree is creaking in the patagonian forest of Argentina in a deep creaky sound. (Argentina, Tierra del Fuego).", felix.blume. https://freesound.org/people/felix.blume/sounds/140047/ (arquivos: arvore_rangendo__2.wav)
- "spooky eerie whistling 03", HenryHardhat. https://freesound.org/people/HenryHardhat/sounds/822459/ (arquivos: assobio_curupira__3.wav)
- "Hitting Tree with big stick.wav", MWsfx. https://freesound.org/people/MWsfx/sounds/575403/ (arquivos: batida_tronco__1.wav)
- "tree 03.wav", denalwa. https://freesound.org/people/denalwa/sounds/57927/ (arquivos: batida_tronco__2.mp3)
- "Stick Against Dead Log - Zoom H6.wav", lunchmoney. https://freesound.org/people/lunchmoney/sounds/380208/ (arquivos: batida_tronco__3.wav)
- "blowing_smoke_3.wav", ivanmilic. https://freesound.org/people/ivanmilic/sounds/513854/ (arquivos: cachimbo_baforada__1.wav, cachimbo_baforada__2.wav, cachimbo_baforada__3.wav)
- "dog small whimper +run.flac", kyles. https://freesound.org/people/kyles/sounds/452202/ (arquivos: cachorro_ganido__1.mp3)
- "dog crying.wav", jocelynlopez. https://freesound.org/people/jocelynlopez/sounds/635114/ (arquivos: cachorro_ganido__2.wav)
- "Dog's Yelping 7", unfa. https://freesound.org/people/unfa/sounds/160478/ (arquivos: cachorro_ganido__3.wav)
- "Angry big dog barking - Far [d15].wav", v23. https://freesound.org/people/v23/sounds/440865/ (arquivos: cachorro_latido__1.wav)
- "Dogs Barking.wav", Mrthenoronha. https://freesound.org/people/Mrthenoronha/sounds/420451/ (arquivos: cachorro_latido__2.wav)
- "R01-12-Hound Dog Baying and Howling.wav", craigsmith. https://freesound.org/people/craigsmith/sounds/479618/ (arquivos: cachorro_latido__3.wav)
- "GRITOS_LEJANOS.wav", SAUL92. https://freesound.org/people/SAUL92/sounds/365004/ (arquivos: chamado_eco__1.wav)
- "Voice_Man_hey_calling_far_away_shout.wav", ValentinPetiteau. https://freesound.org/people/ValentinPetiteau/sounds/557375/ (arquivos: chamado_eco__2.wav)
- "118068__g-lamont__whip-cracks.wav", martian. https://freesound.org/people/martian/sounds/529783/ (arquivos: cipo_chicote__1.wav, cipo_chicote__3.wav)
- "Whip breaking sound barrier (recording)", modusmogulus. https://freesound.org/people/modusmogulus/sounds/817032/ (arquivos: cipo_chicote__2.wav)
- "rope twist,old rope being twisted in hands, tightaning rope.recorded on  H6Zoom XY capsule", Rinaldobowles56. https://freesound.org/people/Rinaldobowles56/sounds/708114/ (arquivos: cipo_torcendo__1.wav)
- "Rope Tightening.wav", EugeneEverett. https://freesound.org/people/EugeneEverett/sounds/596513/ (arquivos: cipo_torcendo__2.wav)
- "Rope under tension.WAV", gear_clinkz. https://freesound.org/people/gear_clinkz/sounds/547862/ (arquivos: cipo_torcendo__3.wav)
- "Human Heartbeat (60 BPM)", FenrirFangs. https://freesound.org/people/FenrirFangs/sounds/213181/ (arquivos: coracao__1.mp3)
- "Heartbeat.mp3", UnderASpell. https://freesound.org/people/UnderASpell/sounds/692820/ (arquivos: coracao__2.wav)
- "Four Heartbeats HQ_BeatSmith.wav", Lunardrive. https://freesound.org/people/Lunardrive/sounds/22416/ (arquivos: coracao__3.mp3)
- "Panicked Running Footsteps on Grass", sillygrizzlies. https://freesound.org/people/sillygrizzlies/sounds/635052/ (arquivos: corrida_folhas__1.wav)
- "running in the forest", newtad1. https://freesound.org/people/newtad1/sounds/836423/ (arquivos: corrida_folhas__2.wav)
- "Running on dry leaves", AudioPapkin. https://freesound.org/people/AudioPapkin/sounds/716949/ (arquivos: corrida_folhas__3.wav)
- "Winchester 1873, cock and dry fire.wav", SpliceSound. https://freesound.org/people/SpliceSound/sounds/218319/ (arquivos: espingarda_engatilhar__1.wav, espingarda_engatilhar__2.wav)
- "Pump Action Shotgun", awrmacd. https://freesound.org/people/awrmacd/sounds/387190/ (arquivos: espingarda_engatilhar__3.wav)
- "S04-28 Cutting or chopping with large knife or machete.wav", craigsmith. https://freesound.org/people/craigsmith/sounds/675971/ (arquivos: facao_golpe__1.wav)
- "Plant dismemberment - Desmembramiento vegetal", johan_sound. https://freesound.org/people/johan_sound/sounds/858645/ (arquivos: facao_golpe__2.wav)
- "Machete .wav", Primitv094. https://freesound.org/people/Primitv094/sounds/587916/ (arquivos: facao_golpe__3.wav)
- "bushmovement.wav", j1987. https://freesound.org/people/j1987/sounds/106114/ (arquivos: folhagem_mexe__1.mp3)
- "Rustling Foliage in Forest", sillygrizzlies. https://freesound.org/people/sillygrizzlies/sounds/635053/ (arquivos: folhagem_mexe__2.wav)
- "Shaking, wiggling tree/bush branches 005", Simonus18. https://freesound.org/people/Simonus18/sounds/733731/ (arquivos: folhagem_mexe__3.wav)
- "Match strike 03", scalywhale. https://freesound.org/people/scalywhale/sounds/423811/ (arquivos: fosforo__1.mp3)
- "MatchStrike07.wav", kingsrow. https://freesound.org/people/kingsrow/sounds/181580/ (arquivos: fosforo__2.wav)
- "Striking Match", lurpsis. https://freesound.org/people/lurpsis/sounds/444130/ (arquivos: fosforo__3.mp3)
- "branch breaking forest twig snap crunch.wav", kyles. https://freesound.org/people/kyles/sounds/452570/ (arquivos: galho_quebra__1.mp3)
- "Crack of branch 3.wav", deleted_user_2104797. https://freesound.org/people/deleted_user_2104797/sounds/164472/ (arquivos: galho_quebra__2.mp3)
- "Branches snapping_northern87", northern87. https://freesound.org/people/northern87/sounds/369986/ (arquivos: galho_quebra__3.wav)
- "Yell EEEH", joseppujol. https://freesound.org/people/joseppujol/sounds/221546/ (arquivos: grito_homem__1.mp3)
- "A single scream of a young male", akridiy. https://freesound.org/people/akridiy/sounds/759458/ (arquivos: grito_homem__2.mp3)
- "Wounded man scream", joseppujol. https://freesound.org/people/joseppujol/sounds/221544/ (arquivos: grito_homem__3.mp3)
- "Panic-stricken screaming #2", Klangkobold. https://freesound.org/people/Klangkobold/sounds/547964/ (arquivos: grito_pavor__1.mp3)
- "Horror scream (high-pitched voice)", joseppujol. https://freesound.org/people/joseppujol/sounds/221547/ (arquivos: grito_pavor__2.mp3)
- "human male scream small group torture panic.mp3", JohnsonBrandEditing. https://freesound.org/people/JohnsonBrandEditing/sounds/173942/ (arquivos: grito_pavor__3.wav)
- "Crackling Flames (loop)", NickTayloe. https://freesound.org/people/NickTayloe/sounds/813328/ (arquivos: lamparina_chama__1.mp3)
- "R09-67-Small Crackling Fire.wav", craigsmith. https://freesound.org/people/craigsmith/sounds/483311/ (arquivos: lamparina_chama__2.mp3)
- "Fireplace - close.wav", not_yr. https://freesound.org/people/not_yr/sounds/545639/ (arquivos: lamparina_chama__3.mp3)
- "Axe chop sequence v1 MIXED.flac", TRP. https://freesound.org/people/TRP/sounds/573813/ (arquivos: machado_golpe__1.wav)
- "Axe chopping wood", xkeril. https://freesound.org/people/xkeril/sounds/753925/ (arquivos: machado_golpe__2.wav)
- "Chopping a tree trunk with an Axe. OWI.wav", JesterWhoo. https://freesound.org/people/JesterWhoo/sounds/706978/ (arquivos: machado_golpe__3.wav)
- "Scared Male Heavy Breathing", casiba842. https://freesound.org/people/casiba842/sounds/554307/ (arquivos: ofego__1.wav)
- "Panting.MP3", SoundsForHim. https://freesound.org/people/SoundsForHim/sounds/395563/ (arquivos: ofego__2.wav)
- "Heavy breath male.WAV", AdrianoAnjos. https://freesound.org/people/AdrianoAnjos/sounds/538870/ (arquivos: ofego__3.wav)
- "Walk in dry leaves in the forest.wav", devy32. https://freesound.org/people/devy32/sounds/437455/ (arquivos: passos_folhas__1.wav)
- "01-20 Footsteps, sneakers on dry leaves.wav", SpliceSound. https://freesound.org/people/SpliceSound/sounds/218305/ (arquivos: passos_folhas__2.wav)
- "Burkina Ouagadougou neighborhood very calm pestle", Martin.Sadoux. https://freesound.org/people/Martin.Sadoux/sounds/416450/ (arquivos: pilao_batida__1.wav, pilao_batida__2.wav)
- "200817 Thunder, pretty close crack 4pm.flac", TRP. https://freesound.org/people/TRP/sounds/567945/ (arquivos: relampago_estalo__1.wav)
- "Closeup Thunder Strike 01", loganzsound. https://freesound.org/people/loganzsound/sounds/840628/ (arquivos: relampago_estalo__2.wav)
- "Thunder big crack explosive close ms 77mel 190903.flac", TRP. https://freesound.org/people/TRP/sounds/574412/ (arquivos: relampago_estalo__3.wav)
- "Boy or Young Child Laughing", OBXJohn. https://freesound.org/people/OBXJohn/sounds/365632/ (arquivos: risada_curupira__1.mp3)
- "Child's laugh 1 - medyk3D.wav", medyk3D. https://freesound.org/people/medyk3D/sounds/616088/ (arquivos: risada_curupira__2.mp3)
- "Boy Laughing (5 y.o.)", Nakhas. https://freesound.org/people/Nakhas/sounds/506937/ (arquivos: risada_curupira__3.wav)
- "best laugh", Gaudomatic01. https://freesound.org/people/Gaudomatic01/sounds/718529/ (arquivos: risada_homem__1.wav)
- "Man laughs extensively (stuxer).mp3", stuxer. https://freesound.org/people/stuxer/sounds/401214/ (arquivos: risada_homem__2.wav, risada_homem__3.wav)
- "Man Blowing Candle Out.wav", bbrocer. https://freesound.org/people/bbrocer/sounds/382667/ (arquivos: sopro_apaga__1.wav)
- "Candle blow.wav", JacobEmanuelMadrid. https://freesound.org/people/JacobEmanuelMadrid/sounds/656818/ (arquivos: sopro_apaga__2.mp3)
- "Candle flicker/ blown out x4", peridactyloptrix. https://freesound.org/people/peridactyloptrix/sounds/204531/ (arquivos: sopro_apaga__3.wav)
- "old musket bang.wav", bruno.auzet. https://freesound.org/people/bruno.auzet/sounds/538795/ (arquivos: tiro_espingarda__1.mp3)
- "Medium distance rifle shot with echo.wav", moosegravy. https://freesound.org/people/moosegravy/sounds/431826/ (arquivos: tiro_espingarda__2.mp3)
- "Musket Shot.wav", mlsulli. https://freesound.org/people/mlsulli/sounds/234869/ (arquivos: tiro_espingarda__3.mp3)
- "Wolves : induced howling by humans 3", Sacha.Julien. https://freesound.org/people/Sacha.Julien/sounds/753891/ (arquivos: uivo_curupira__1.wav)
- "Wolves : induced howling by humans 5", Sacha.Julien. https://freesound.org/people/Sacha.Julien/sounds/753893/ (arquivos: uivo_curupira__2.wav)
- "wind heavy strong through big trees suburbs 2nd floor window winter no leaves powerful gusts far forest wide.flac", kyles. https://freesound.org/people/kyles/sounds/454358/ (arquivos: vento_rajada__1.wav)
- "strong windy night.wav", 170129. https://freesound.org/people/170129/sounds/408266/ (arquivos: vento_rajada__2.wav)
- "wind_howl2_stereo.wav", swiftoid. https://freesound.org/people/swiftoid/sounds/117611/ (arquivos: vento_uivando__1.mp3)
- "Halloween - Graveyard At Night Howling Wind.mp3", mistersherlock. https://freesound.org/people/mistersherlock/sounds/159509/ (arquivos: vento_uivando__2.mp3)
- "Howling wind through window in tower", tomhannen. https://freesound.org/people/tomhannen/sounds/486599/ (arquivos: vento_uivando__3.mp3)
- "Versilian Community Sample Library (VCSL)", Versilian Studios / Sam Gossner. https://github.com/sgossner/VCSL (arquivos: agogo__1.wav, agogo__2.wav, agogo__3.wav, bloco_madeira__1.wav, bloco_madeira__2.wav, bloco_madeira__3.wav, bongo__1.wav, bongo__2.wav, caixa__1.wav, caixa__2.wav, caixa__3.wav, claves__1.wav, claves__2.wav, conga__1.wav, conga__2.wav, conga__3.wav, flauta__A#4.wav, flauta__A#5.wav, flauta__C5.wav, flauta__C6.wav, flauta__D5.wav, flauta__D6.wav, flauta__E5.wav, flauta__E6.wav, flauta__F#5.wav, flauta__F4.wav, flauta__G#4.wav, flauta__G#5.wav, flauta_grave__A3.wav, flauta_grave__B3.wav, flauta_grave__C4.wav, flauta_grave__D4.wav, flauta_grave__E4.wav, flauta_grave__F3.wav, flauta_grave__F4.wav, flauta_grave__G3.wav, gongo_grave__1.wav, gongo_grave__2.wav, gongo_grave__3.wav, kalimba__A#4.wav, kalimba__A#5.wav, kalimba__B3.wav, kalimba__B5.wav, kalimba__C#4.wav, kalimba__C#5.wav, kalimba__D#5.wav, kalimba__D5.wav, kalimba__F#5.wav, kalimba__F4.wav, kalimba__G3.wav, kalimba__G4.wav, kalimba__G5.wav, maraca__1.wav, marimba__C#4.wav, marimba__C5.wav, marimba__C6.wav, marimba__F4.wav, marimba__F5.wav, marimba__F6.wav, ocarina__A#5.wav, ocarina__A4.wav, ocarina__A5.wav, ocarina__B4.wav, ocarina__C#5.wav, ocarina__C#6.wav, ocarina__C6.wav, ocarina__D5.wav, ocarina__E5.wav, ocarina__F#5.wav, ocarina__G#5.wav, prato__1.wav, prato__2.wav, prato__3.wav, prato_arco__1.wav, prato_arco__2.wav, prato_rufo__1.wav, prato_rufo__2.wav, prato_suspenso__1.wav, prato_suspenso__2.wav, prato_suspenso__3.wav, reco_reco__2.wav, reco_reco__3.wav, rufar__1.wav, rufar__3.wav, salterio_arco__A#4.wav, salterio_arco__A#5.wav, salterio_arco__C5.wav, salterio_arco__C6.wav, salterio_arco__D5.wav, salterio_arco__D6.wav, salterio_arco__E5.wav, salterio_arco__E6.wav, salterio_arco__F#5.wav, salterio_arco__F#6.wav, salterio_arco__G#5.wav, slapstick__1.wav, slapstick__2.wav, tambor_grave__1.wav, tambor_grave__3.wav, tambor_tronco__1.wav, tambor_tronco__2.wav, viola__A3.wav, viola__A4.wav, viola__A5.wav, viola__B3.wav, viola__B4.wav, viola__C#4.wav, viola__C#5.wav, viola__D3.wav, viola__D4.wav, viola__D5.wav, viola__E3.wav, viola__E4.wav, viola__E5.wav, viola__F#3.wav, viola__F#4.wav, viola__F#5.wav, viola__G3.wav, viola__G4.wav, viola__G5.wav)
- "Alfaia Hit (combined)", Sassaby. https://freesound.org/people/Sassaby/sounds/511275/ (arquivos: alfaia__1.ogg)
- "35'10'546 - Whistle - (+EQ)", laffik. https://freesound.org/people/laffik/sounds/725849/ (arquivos: apito__1.ogg)
- "FX_bird_water_whistle.wav", PLukx. https://freesound.org/people/PLukx/sounds/254209/ (arquivos: apito__2.wav)
- "Versilian Studios Chamber Orchestra 2, Community Edition (VSCO-2-CE)", Versilian Studios / Sam Gossner. https://github.com/sgossner/VSCO-2-CE (arquivos: atabaque__1.wav, atabaque__2.wav, gongo_rufo__1.wav, rabeca__A3.wav, rabeca__A4.wav, rabeca__A5.wav, rabeca__C4.wav, rabeca__C5.wav, rabeca__C6.wav, rabeca__E4.wav, rabeca__E5.wav, rabeca__G3.wav, rabeca__G4.wav, rabeca__G5.wav, rabeca_tremolo__A4.wav, rabeca_tremolo__C4.wav, rabeca_tremolo__E4.wav, rabeca_tremolo__G3.wav, rabeca_tremolo__G4.wav, rufar__2.wav, tambor_grave__2.wav, tambor_tronco__3.wav)
- "Calango1berimbau.mp3", brfindla. https://freesound.org/people/brfindla/sounds/26393/ (arquivos: berimbau__1.wav, berimbau__3.wav, berimbau_preso__1.wav, berimbau_preso__2.wav, berimbau_solto__1.wav, berimbau_solto__2.wav)
- "berimbau.aif", uiop. https://freesound.org/people/uiop/sounds/44705/ (arquivos: berimbau__2.wav)
- "rapping-accel.wav", sadlyshoe. https://freesound.org/people/sadlyshoe/sounds/544264/ (arquivos: bloco_acelera__1.wav)
- "Caxixi.wav", mattyharm. https://freesound.org/people/mattyharm/sounds/444338/ (arquivos: caxixi__1.ogg)
- "Musical, percussion, caxixi, shake, rattle, rhythm, movement", Oldome. https://freesound.org/people/Oldome/sounds/856789/ (arquivos: caxixi__2.wav)
- "mini djembe hit.wav", kaiseraudio. https://freesound.org/people/kaiseraudio/sounds/387051/ (arquivos: djembe__1.wav)
- "Djembe Slap.wav", PanPiper5. https://freesound.org/people/PanPiper5/sounds/659910/ (arquivos: djembe__2.ogg)
- "djembe_longrim_mute2.wav", Infinita08. https://freesound.org/people/Infinita08/sounds/460986/ (arquivos: djembe__3.ogg)
- "Textured Low Drone - Loop", kkenny101. https://freesound.org/people/kkenny101/sounds/871189/ (arquivos: drone_grave__1.ogg)
- "Massive Zebra Drone", be-steele. https://freesound.org/people/be-steele/sounds/323052/ (arquivos: drone_grave__2.ogg)
- "Low Bamboo Flute.wav", PanPiper5. https://freesound.org/people/PanPiper5/sounds/659915/ (arquivos: flauta_bambu__G3.ogg)
- "Native American Style Flute Bamboo Low A3 Riff", Wood_Flutes. https://freesound.org/people/Wood_Flutes/sounds/265867/ (arquivos: flauta_chamado__1.wav)
- "bamboo flute", iluppai. https://freesound.org/people/iluppai/sounds/148845/ (arquivos: flauta_chamado__2.wav)
- "F# phrase on Native American Flute", skylarjulian. https://freesound.org/people/skylarjulian/sounds/558999/ (arquivos: flauta_chamado__3.wav)
- "Ganzá de arroz.wav", Ilson_Junior. https://freesound.org/people/Ilson_Junior/sounds/609774/ (arquivos: ganza__1.ogg)
- "Ganza.wav", mattyharm. https://freesound.org/people/mattyharm/sounds/444344/ (arquivos: ganza__2.ogg)
- "Small Bamboo Maraca", JarredGibb. https://freesound.org/people/JarredGibb/sounds/263891/ (arquivos: maraca__3.wav)
- "Pandeiro de couro (leather tambourine).wav", Ilson_Junior. https://freesound.org/people/Ilson_Junior/sounds/609770/ (arquivos: pandeiro__1.ogg)
- "Pandeiro", katusm. https://freesound.org/people/katusm/sounds/527967/ (arquivos: pandeiro__2.ogg)
- "pandeiro A collection", MeanRaccoon. https://freesound.org/people/MeanRaccoon/sounds/844751/ (arquivos: pandeiro__3.wav)
- "Rainstick (Stereo)", benjammin2006. https://freesound.org/people/benjammin2006/sounds/235966/ (arquivos: pau_de_chuva__1.wav, pau_de_chuva__2.wav)
- "RainStick", urupin. https://freesound.org/people/urupin/sounds/191803/ (arquivos: pau_de_chuva__3.wav)
- "Finger Cymbals.wav", MirkoMeter84. https://freesound.org/people/MirkoMeter84/sounds/175932/ (arquivos: pratinhos__1.wav)
- "Finger cymbals.WAV by Luc Henrion", Luc Henrion. https://freesound.org/people/Luc%20Henrion/sounds/439616/ (arquivos: pratinhos__2.wav)
- "quena scale.wav", MarleneAyni. https://freesound.org/people/MarleneAyni/sounds/569392/ (arquivos: quena__A4.wav, quena__A5.wav, quena__B4.wav, quena__B5.wav, quena__C5.wav, quena__D5.wav, quena__E5.wav, quena__F#5.wav, quena__G4.wav, quena__G5.wav)
- "Violin Glissando", mael46. https://freesound.org/people/mael46/sounds/670025/ (arquivos: rabeca_glissando__1.wav, rabeca_glissando__2.wav)
- "recoreco-texture.wav", andrescompovigo. https://freesound.org/people/andrescompovigo/sounds/219634/ (arquivos: reco_reco__1.wav)
- "AKG 414 Surdo Processed.wav", igorfiche01. https://freesound.org/people/igorfiche01/sounds/394583/ (arquivos: surdo__1.wav)
- "X Surdo 4Bar D.aiff", plotzki. https://freesound.org/people/plotzki/sounds/36127/ (arquivos: surdo__2.wav)
- "tamborim.wav", Renato_Oliveira. https://freesound.org/people/Renato_Oliveira/sounds/253472/ (arquivos: tamborim__1.wav)
- "tamborim A1 collection", MeanRaccoon. https://freesound.org/people/MeanRaccoon/sounds/844752/ (arquivos: tamborim__2.wav, tamborim__3.wav)
- "Araponga.wav", Pangudani. https://freesound.org/people/Pangudani/sounds/422518/ (arquivos: araponga__1.wav, araponga__2.wav)
- "Macaw Parrot screaming in a park", felix.blume. https://freesound.org/people/felix.blume/sounds/504988/ (arquivos: araras__2.wav)
- "Parrots arriving at Santander square in Leticia /Amazonas/Colombia", dixavs. https://freesound.org/people/dixavs/sounds/723900/ (arquivos: araras_revoada__1.wav)
- "121003 Pigeon flock fly away, wing flaps, Toronto.wav", TRP. https://freesound.org/people/TRP/sounds/616623/ (arquivos: araras_revoada__2.wav)
- "howler_monkey_jungle_4.wav", itsmrjack. https://freesound.org/people/itsmrjack/sounds/123044/ (arquivos: bugio__2.wav)
- "Howler Monkeys", Lenguaverde. https://freesound.org/people/Lenguaverde/sounds/490315/ (arquivos: bugio__3.wav)
- "Amazon Jungle Afternoon Shower.aif", trundlefly. https://freesound.org/people/trundlefly/sounds/349328/ (arquivos: chuva_mata__1.mp3)
- "Light Rain - Atmosphere - Jungle Rain", florianreichelt. https://freesound.org/people/florianreichelt/sounds/422052/ (arquivos: chuva_mata__2.mp3)
- "Amazon soft to harder rain with some thunder.aif", cybergenic. https://freesound.org/people/cybergenic/sounds/135821/ (arquivos: chuva_mata__3.mp3)
- "Cicadas and crickets in the Amazonian Rainforest", felix.blume. https://freesound.org/people/felix.blume/sounds/410434/ (arquivos: cigarras__1.wav)
- "Cicadas singing.wav", dtmendes. https://freesound.org/people/dtmendes/sounds/591063/ (arquivos: cigarras__2.wav)
- "Cicadas in the bush.mp3", soupods. https://freesound.org/people/soupods/sounds/618433/ (arquivos: cigarras__3.wav)
- "Great Horned Owls Hooting, Crickets", CHallSmith. https://freesound.org/people/CHallSmith/sounds/870593/ (arquivos: coruja__2.wav)
- "Owl Slow Hoot", dandman3039. https://freesound.org/people/dandman3039/sounds/528623/ (arquivos: coruja__3.wav)
- "rain drips on wet leaves.flac", kyles. https://freesound.org/people/kyles/sounds/452297/ (arquivos: gotejar__1.flac)
- "Tropical Rain - light in a forest with drop hitting the leaves", nyoz. https://freesound.org/people/nyoz/sounds/615747/ (arquivos: gotejar__2.flac)
- "Cricket singing (close recording)", felix.blume. https://freesound.org/people/felix.blume/sounds/476082/ (arquivos: grilos__1.wav)
- "Single Cricket Chirping, Close Perspective 02", HECKFRICKER. https://freesound.org/people/HECKFRICKER/sounds/753272/ (arquivos: grilos__2.wav)
- "20240816_Crickets_in_the_Night_001", Borgory. https://freesound.org/people/Borgory/sounds/751471/ (arquivos: grilos__3.wav)
- "Primates - Geoffroy's Tamarin, Single", TheKingOfGeeks360. https://freesound.org/people/TheKingOfGeeks360/sounds/871018/ (arquivos: macaco_gritos__1.mp3)
- "Primates - Geoffroy's Spider Monkey, Take 2", TheKingOfGeeks360. https://freesound.org/people/TheKingOfGeeks360/sounds/843477/ (arquivos: macaco_gritos__2.mp3)
- "G12-21-Monkey Chattering.wav", craigsmith. https://freesound.org/people/craigsmith/sounds/437953/ (arquivos: macaco_gritos__3.wav)
- "Dawn in the Amazonian Rainforest", felix.blume. https://freesound.org/people/felix.blume/sounds/408048/ (arquivos: mata_amanhecer__1.mp3)
- "ANMLBird_BR Serrinha do alambari calm atmosphere with turtledove and crickets_Melia Roger_ORTF Schoeps.wav", MeliaRoger. https://freesound.org/people/MeliaRoger/sounds/586171/ (arquivos: mata_amanhecer__2.mp3)
- "Amazon Jungle in the Morning at Rainforest Tambopata National Reserve", alberto_cendra_woodman. https://freesound.org/people/alberto_cendra_woodman/sounds/737513/ (arquivos: mata_amanhecer__3.mp3)
- "rainforest mata atlantica.wav", Fenodyrie. https://freesound.org/people/Fenodyrie/sounds/673163/ (arquivos: mata_dia__1.mp3)
- "Amazon Forest", jonasrocha. https://freesound.org/people/jonasrocha/sounds/159583/ (arquivos: mata_dia__3.mp3)
- "Amazon jungle night crickets birds frogs.flac", kyles. https://freesound.org/people/kyles/sounds/450536/ (arquivos: mata_noite__2.mp3)
- "AMBRurl_BR Serrinha do alambari night frogs chorus with close crickets_Melia Roger_ORTF Schoeps.WAV", MeliaRoger. https://freesound.org/people/MeliaRoger/sounds/645706/ (arquivos: mata_noite__3.mp3)
- "Angry tiger.wav", schots. https://freesound.org/people/schots/sounds/439280/ (arquivos: onca_rosnado__1.wav)
- "G12-45-Tiger Hiss and Growl.wav", craigsmith. https://freesound.org/people/craigsmith/sounds/437978/ (arquivos: onca_rosnado__2.wav)
- "Lion.wav", GJ55GB. https://freesound.org/people/GJ55GB/sounds/488348/ (arquivos: onca_rosnado__3.wav)
- "Dog Teeth Clattering Clicking", qubodup. https://freesound.org/people/qubodup/sounds/841350/ (arquivos: queixada_dentes__1.mp3)
- "Real Teeth chattering back and front", williethewolf. https://freesound.org/people/williethewolf/sounds/789220/ (arquivos: queixada_dentes__2.wav)
- "Pig_Grunts_Snorts_Breathing_Hackney_City_Farm.wav", tompallant. https://freesound.org/people/tompallant/sounds/257858/ (arquivos: queixada_grunhido__1.wav)
- "Stampede", bevibeldesign. https://freesound.org/people/bevibeldesign/sounds/350425/ (arquivos: queixada_tropel__2.wav)
- "Small stream in the jungle", zachrau. https://freesound.org/people/zachrau/sounds/812938/ (arquivos: riacho__1.mp3)
- "Small stream in forest", Cinetony. https://freesound.org/people/Cinetony/sounds/559955/ (arquivos: riacho__2.mp3)
- "Small forest in Brazil, at the edge, river passing close by", felix.blume. https://freesound.org/people/felix.blume/sounds/466046/ (arquivos: riacho__3.mp3)
- "Turdus_rufiventris_brasilian.ogg", Icoeng. https://commons.wikimedia.org/wiki/File:Turdus_rufiventris_brasilian.ogg (arquivos: sabia__1.wav, sabia__2.wav)
- "CaneToad2.wav", bhobby. https://freesound.org/people/bhobby/sounds/412096/ (arquivos: sapos__1.wav)
- "SAPO - FROG", Rildo3000. https://freesound.org/people/Rildo3000/sounds/489899/ (arquivos: sapos__2.wav)
- "youtube jungle", laboratoriosonoridades2022. https://freesound.org/people/laboratoriosonoridades2022/sounds/668505/ (arquivos: sapos__3.wav)
- "LONG THUNDER ROLLS AND HEAVY RAIN.wav", Alex_hears_things. https://freesound.org/people/Alex_hears_things/sounds/376810/ (arquivos: tempestade__1.mp3)
- "Tropical Storm Heavy Rain Thunderstorm.wav", Solar01. https://freesound.org/people/Solar01/sounds/671587/ (arquivos: tempestade__2.mp3)
- "Heavy rain with thuder", dersinnsspace. https://freesound.org/people/dersinnsspace/sounds/435222/ (arquivos: tempestade__3.mp3)
- "Thunder Clap", DaniloSFX. https://freesound.org/people/DaniloSFX/sounds/672776/ (arquivos: trovao__1.wav)
- "Thunder Clap OWB KY 441x16.wav by Dave Welsh", Dave Welsh. https://freesound.org/people/Dave%20Welsh/sounds/194364/ (arquivos: trovao__2.wav)
- "Long Rumbling Thunder", billgrip. https://freesound.org/people/billgrip/sounds/151447/ (arquivos: trovao__3.wav)
- "111013__soundbytez__chesnut-mandibled-toucan.wav", agarwalkunal. https://freesound.org/people/agarwalkunal/sounds/163115/ (arquivos: tucano__2.wav)
- "Toucans calling", zachrau. https://freesound.org/people/zachrau/sounds/812935/ (arquivos: tucano__3.wav)
- "common potoo nightcall Brazil.wav", deleted_user_162443. https://freesound.org/people/deleted_user_162443/sounds/532268/ (arquivos: urutau__3.wav)
- "Hot summer woods hawk Deer snort Little Grassy RTR Trail July 2 2025", kvgarlic. https://freesound.org/people/kvgarlic/sounds/816601/ (arquivos: veado_alarme__1.wav)
- "Deer barking.m4a", Spamanator. https://freesound.org/people/Spamanator/sounds/569926/ (arquivos: veado_alarme__2.wav)
- "barkingroedeer.wav", raoul_slayer. https://freesound.org/people/raoul_slayer/sounds/203593/ (arquivos: veado_alarme__3.wav)
