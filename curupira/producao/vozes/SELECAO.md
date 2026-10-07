# Seleção de tomadas da narração

Gerado por `vozes/narrar.py` em 2026-10-07 05:19 com o backend `qwen3-tts-1.7b-base-clone:1`: 87 falas, 172 tomadas avaliadas, 81 falas com tomada aprovada.

## Falas abaixo do limiar (revisão humana)

| fala | papel | escore (tomada) | tomadas | o que falhou na escolhida | texto |
|---|---|---|---|---|---|
| abertura_05 | narrador | 78 (t04) | 6 | fim da frase: 1 das 2 últimas palavras erradas | É coisa sabida, e pela boca de todos corre, que há certos demônios, a que os brasis chamam corupira. |
| guardiao_12 | narrador | 94 (t03) | 5 | velocidade 3.28 fora de 2.20-2.70 palavras/s | E não acha mais o caminho de casa. |
| cacadores_13 | narrador | 70 (t01) | 5 | fim da frase: 1 das 2 últimas palavras erradas | De tardinha, no riacho, apareceu a veada. |
| aviso_03 | narrador | 84 (t05) | 5 | WER 0.19 > 0.15 | O assobio fez a mão do Tião tremer. E a veada sumiu com filhote e tudo. |
| vo_05 | vo | 88 (t03) | 5 | velocidade 2.96 fora de 1.80-2.50 palavras/s | E deixa um fuminho do lado, que fumo adoça a raiva do dono. |
| encerramento_05 | narrador | 68 (t01) | 5 | WER 0.17 > 0.15; fim da frase: 1 das 2 últimas palavras erradas | E a mata, essa, sempre ouve. |

Precisaram de tomadas extras: abertura_05, aviso_03, rastros_10, vo_05, novelo_01, novelo_05, novelo_10, novelo_14, encerramento_05.

## Como rodar

```
cd curupira/producao
.venv-tts/bin/python vozes/narrar.py                   # todas as falas (as tomadas já feitas vêm do cache)
.venv-tts/bin/python vozes/narrar.py aviso_04 noite_   # só esses beats (id ou prefixo)
```
Opções: `--tomadas 2` por rodada, `--teto 5` no total, `--refazer` (ignora o cache), `--saida PASTA`,
`--backend qwen|leve|arquivo.py[:funcao]`. Depois: `.venv/bin/python linha_do_tempo.py` (durações reais das falas).

## Backend e vozes

Padrão (`qwen`): Qwen3-TTS 1.7B Base (mlx) em modo clone, com a voz de cada papel em `vozes/referencias/<papel>.wav`
(desenhadas no Qwen3-TTS VoiceDesign com `instrucoes_voicedesign.json`; a do narrador é a escolhida pelo usuário) e
`referencia.txt` como transcrição. Timbre constante em todas as falas. O Curupira é o clone do Zé passado por
`curupira_efeito` (3 semitons acima, formante levemente infantil, tremor e duplo sutil, sem ecos nem reverb: a mixagem
põe); a versão sem efeito fica em `falas/<beat>_crua.wav`. O clone fala mais rápido que as referências, então cada
tomada fora da faixa de velocidade do papel é levada ao centro dela com o `atempo` do ffmpeg (0,70 a 1,15x) antes da
avaliação. Créditos e licença: `creditos_voz.json`.

Outro backend: `--backend arquivo.py[:funcao]` com `sintetizar(papel, texto, semente, variacao) -> (áudio, sr)`; o
pipeline casa os parâmetros pelo nome (`papel`/`voz`, `texto`/`text`, `semente`/`seed`, `variacao`, ou `instruct` e
`temperature` soltos) e aceita retorno `(áudio, sr)`, só o áudio (com `SR` no módulo) ou o caminho de um wav. Defina
`VERSAO = "..."` no módulo: ela entra na chave do cache. O backend `leve` (Piper) é só para teste e grava em
`vozes/teste_leve/`.

## Escore e limiares

Escore 0 a 100 = 100 x (0,35 inteligibilidade + 0,30 naturalidade + 0,20 prosódia + 0,15 técnica):
inteligibilidade = 1 - 2,5 WER (faster-whisper, texto normalizado) - 0,5 por erro nas 2 últimas palavras -
0,25 por palavra sobrando no fim; naturalidade = (UTMOS - 1,5)/2,5 (no Curupira, medido antes do efeito); prosódia = faixa de F0 (p10-p90 em semitons),
palavras/s da fala aparada e pausas internas anormais, contra as faixas do papel (`PAPEIS` no narrar.py; "devagar",
"lento", "apressado", "berrando" na direção do beat deslocam a faixa de velocidade); técnica = clipping, cliques,
pico espectral estreito (apito/zumbido), ruído de fundo, corte abrupto no fim e silêncio longo nas pontas.
Aprovada = passa em todos os `LIMIARES` (WER, fim da frase, UTMOS, velocidade, F0, pausas, técnica, escore mínimo).
Sem aprovada, o pipeline gera mais tomadas até o teto (se o erro foi numa palavra de `pronuncia` do roteiro, as
novas usam a grafia de reserva); persistindo, fica a de menos reprovações e a fala entra na tabela acima.
Tudo por tomada está em `selecao.json`; os áudios em `tomadas/<beat>/tNN.wav`.
