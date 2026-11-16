# Manual da Redação Partiu 085

Este é o manual que a redação automática segue. Para mudar como a redação trabalha, edite este arquivo. A tarefa agendada lê sempre a versão do GitHub:
https://raw.githubusercontent.com/leoxpinheiro/partiu085-alertas/main/docs/redacao/MANUAL.md

## 1. O que a gente publica

- **1 carrossel por dia às 11:30.** Ele sai do GitHub mesmo com o Mac desligado. A ordem de saída é a ordem de `docs/ig_auto.json > conteudo_permitido`.
- **Radar.** O radar continua postando:
  - Top 5 no story todo dia, e no feed às segundas e quintas;
  - um achado quando o preço é barato de verdade (`engine/criterio.py`).
  - O mesmo destino não se repete em 7 dias.
- **Redação.** A redação cria conteúdo de verdade, não autopost. O carro-chefe é o formato **achado + destino**:
  - preço real do radar no título;
  - por que vale ir;
  - como chegar;
  - fotos do lugar;
  - roteiro;
  - a época honesta;
  - CTA pro grupo.

## 2. Formatos

### A) Achado + destino (o favorito; modelo: `docs/posts/parnaiba.json`)

São 8 a 9 telas, nesta ordem:

1. `capa` com foto real e crédito. Título: "<Destino> por *R$ X* ida e volta" ou "<Destino> em N dias por *R$ X*". Na linha `data` vai "visto pelo radar em dd/mm".
2. `precos`: datas e valores de ida, volta e total. Inclui os dias da semana em que a rota voa (tire do calendário do radar) e uma foto embaixo.
3. `rota`: as paradas e os trechos (voo, estrada ou barco), com tempo ou distância.
4. e 5. `foto`: 2 telas de foto inteira mostrando o que tem de mais bonito, com selo e um texto curto.
6. `lista`: roteiro dia a dia, usando as datas reais do preço.
7. `cartoes` "a pegadinha": compara a época do preço com a melhor época. Diz a verdade, mesmo quando a data barata não é a melhor época.
8. `texto` com dicas práticas e uma foto.
9. `cta` com foto.

### B) Destino de bolso (modelo: `docs/posts/noronha.json`, `docs/posts/bh.json`)

Ficha (passagem, horas, dias, época), roteiro, dicas e CTA. Use este formato quando não houver um preço muito bom.

### C) Salváveis

Calendário de feriados, guia de documentos, "quanto custa" e curiosidades da aviação. São posts feitos pra galera salvar.

### D) Notícia

Só se a notícia for de **hoje ou ontem**. Notícia de 2 dias já é velha.

## 3. Regras de ouro

- **Visual:** um estilo só, o `noticia` (`engine/estilo.py`). As telas disponíveis são:
  - capa
  - foto
  - rota
  - precos
  - cartoes
  - lista
  - texto
  - numero
  - tabela
  - calendario
  - cta
- **Paleta:**
  - navy #0B2440
  - azul #1F5FBF
  - amarelo #F5C531
  - verde #1E7A45
  - creme #F7F4EE
- Nos slides não vai emoji, ícone 3D nem gráfico de barras. Use números grandes.
- **Fotos:** sempre reais, de Wikimedia Commons com licença CC ou domínio público. O crédito vai na imagem, no formato "Lugar · Autor / Wikimedia (licença)". Use pelo menos 4 fotos diferentes por carrossel. Nunca copie imagem de outro perfil.
- **Fatos:** cada fato precisa de 2 fontes no mínimo, citadas no rodapé e na legenda. Se as fontes discordarem, o fato fica de fora.
- **Preço:**
  - Escreva sempre IDA E VOLTA ou SÓ IDA, mais "visto pelo radar em dd/mm" e "pode mudar a qualquer momento".
  - Só chame de barato o que passar em `criterio.barato_de_verdade`. R$ 1.500 pra São Paulo não é barato.
- **Sem repetição:** leia `docs/pauta_log.json` e não repita destino nem tema dos últimos 14 dias.
- **Tom:** fortalezense, próximo e direto. O destaque com `*asterisco*` vai em 2 ou 3 palavras do título.

## 4. Como achar preço

- O calendário de cada destino fica em `docs/calendario/<IATA>.json` (listas `ida` e `volta` com dia, preço, cia e escalas).
- Monte o melhor par ida + volta com 4 a 7 dias de viagem, preferindo voo direto.
- Rotas novas entram em `docs/rotas.json`.

## 5. Como baixar fotos (a nuvem bloqueia thumb.wikimedia.org)

1. Pesquise na API: `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=<termo>&prop=imageinfo&iiprop=size|extmetadata&format=json`. Use o User-Agent "partiu085-bot/1.0 (github leoxpinheiro)".
2. Para baixar sem gastar outra chamada na API:
   1. Calcule `n = titulo.replace(" ","_")` e `h = md5(n)`.
   2. Baixe `https://upload.wikimedia.org/wikipedia/commons/thumb/{h[0]}/{h[:2]}/{quote(n)}/1920px-{quote(n)}`.
3. Se vier erro 429, espere 30 a 40 s e tente de novo.
4. Olhe as fotos (faça uma folha de contato) antes de escolher.
5. Salve em `docs/midia/<IATA>-<tema>.jpg`.

## 6. Como entregar (a redação nunca dá push)

1. Clone o repo de forma leve:
   ```
   git clone --depth 1 --filter=blob:none --sparse
   ```
   Depois use `sparse-checkout` só em:
   - `docs/carrosseis.json`
   - `docs/ig_auto.json`
   - `docs/pauta_log.json`
   - `engine/estilo.py`
2. Renderize: `python3 engine/estilo.py docs/posts/<id>.json out/<id>`. Isso gera 1080x1350 JPG.
3. Olhe todas as telas renderizadas. Procure texto vazando, sobreposição e espaço vazio, e corrija antes de entregar.
4. Copie:
   - as imagens para `docs/carrosseis_prontos/<lote>-<id>-N.jpg`;
   - o JSON para `docs/posts/`.
5. Em `docs/carrosseis.json`, crie a entrada copiando outra entrada `ct-n2-*` e mudando:
   - id
   - titulo
   - legenda
   - estado "aprovado"
   - criado
   - telas
6. Em `docs/ig_auto.json > conteudo_permitido`:
   - **achado com preço vai pro começo** da lista, porque o preço some;
   - guia sem preço vai pro fim da reserva.
7. Registre em `docs/pauta_log.json` (data, id, tema, destinos, titulo, origem "redacao").
8. Faça `git add --sparse -A`, depois commit com autor "Redação Partiu 085 <redacao@partiu.avancepro.app.br>", depois `git format-patch -1`.
9. Grave o .patch no Mac em `~/partiu085-radar/motor-novo/redacao/pendente-push-<data>-<x>/`. O agente do Mac sobe em até 10 minutos.
10. Para disparar um workflow (ex.: capas.yml), grave `acoes/<workflow>__<nome>.json` com o corpo do dispatch.
