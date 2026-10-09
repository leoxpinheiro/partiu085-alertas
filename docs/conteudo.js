/* Partiu 085 · Conteúdo pesquisado (curiosidades, regras de aeroporto, Fortaleza, novidades de voos)
   Fontes: ANAC (abr/2026), Fraport/Diário do Nordeste, O Povo (ago/2026), Passageiro de Primeira, Pontos pra Voar, Wikipédia. */
const CT_VERDE = "#2E9E5B", CT_VERM = "#D64545";

/* capa com foto real + título grande embaixo */
function ctCapaFoto(foto, kick, tit, sub, dir) { return async c => {
  const im = await fotoMidia(foto); c.fillStyle = COR.navy; c.fillRect(0, 0, PW, PH); if (im) cobrir(c, im, 0, 0, PW, PH);
  let g = c.createLinearGradient(0, 0, 0, 300); g.addColorStop(0, "rgba(8,22,40,.7)"); g.addColorStop(1, "rgba(8,22,40,0)"); c.fillStyle = g; c.fillRect(0, 0, PW, 300);
  g = c.createLinearGradient(0, PH * .3, 0, PH); g.addColorStop(0, "rgba(11,36,64,0)"); g.addColorStop(.45, "rgba(11,36,64,.88)"); g.addColorStop(1, COR.navy); c.fillStyle = g; c.fillRect(0, 0, PW, PH);
  marca(c, PW, true, dir);
  const T_ = tit.toUpperCase(); let s = 140; while (s > 80 && quebrar(c, T_, PW - 2 * M, s, MARCA.titulo).length > 4) s -= 6;
  const nl = Math.min(4, quebrar(c, T_, PW - 2 * M, s, MARCA.titulo).length), subH = sub ? 120 : 0;
  const y0 = PH - 190 - subH - nl * s * .98 - 50;
  kicker(c, kick, M, y0, COR.am); const y = titulo(c, tit, M, y0 + 30, PW - 2 * M, s, 80, "#fff", 4) + 34;
  c.fillStyle = COR.am; c.fillRect(M, y, 150, 12);
  if (sub) paragrafo(c, sub, M, y + 70, PW - 2 * M, 38, MARCA.corpo, "rgba(255,255,255,.82)", 600, 1.3, 2);
  T(c, "ARRASTA ➜", PW - M, PH - 80, 24, MARCA.corpo, COR.am, "right", 800, 3);
}; }

/* selo PODE / NÃO PODE / DEPENDE */
function ctSelo(c, v, x, y) {
  const m = { pode: ["✓ PODE", CT_VERDE, "#fff"], nao: ["✕ NÃO PODE", CT_VERM, "#fff"], dep: ["! DEPENDE", COR.am, COR.tinta] }[v];
  c.font = `400 64px ${MARCA.titulo}`; const w = c.measureText(m[0]).width + 70;
  c.fillStyle = m[1]; rr(c, x, y, w, 100, 50); c.fill(); T(c, m[0], x + 35, y + 76, 64, MARCA.titulo, m[2], "left", 400, 2);
}
function ctTelaPN(t, [item, v, txt, foto], pos, n) { return async c => {
  const k = TEMA[t], im = foto ? await fotoMidia(foto) : null; k.bg(c, PW, PH); marca(c, PW, k.dk, `${pos}/${n}`);
  let y0 = 380;
  if (im) { c.save(); rr(c, M, 170, PW - 2 * M, 380, 36); c.clip(); cobrir(c, im, M, 170, PW - 2 * M, 380); c.restore(); y0 = 600; }
  else { c.save(); c.globalAlpha = k.dk ? .07 : .09; T(c, { pode: "✓", nao: "✕", dep: "!" }[v], PW - M + 40, PH - 140, 620, MARCA.titulo, { pode: CT_VERDE, nao: CT_VERM, dep: k.dk ? COR.am : COR.tinta }[v], "right"); c.restore(); }
  ctSelo(c, v, M, y0);
  const y = titulo(c, item, M, y0 + 140, PW - 2 * M, im ? 110 : 150, 70, k.tx, 3) + 76;
  paragrafo(c, txt, M, y, PW - 2 * M - (im ? 0 : 60), im ? 40 : 46, MARCA.corpo, k.sub, 600, 1.38, im ? 5 : 7);
  rodapeP(c, PW, PH, k.dk, "Salva pra lembrar na hora da mala");
}; }
/* tela texto: número/rótulo grande + título + parágrafo, centralizado na altura */
function ctTelaTxt(t, [h, txt, big], pos, n, rod) { return c => {
  const k = TEMA[t]; k.bg(c, PW, PH); rota(c, PW, PH, k.dk ? COR.am : COR.tinta, .12); marca(c, PW, k.dk, `${pos}/${n}`);
  big = big || String(pos - 1).padStart(2, "0");
  let s = 260; c.font = `400 ${s}px ${MARCA.titulo}`; while (c.measureText(big).width > PW - 2 * M && s > 120) { s -= 10; c.font = `400 ${s}px ${MARCA.titulo}`; }
  const H_ = h.toUpperCase(); let ts = 104; while (ts > 60 && quebrar(c, H_, PW - 2 * M, ts, MARCA.titulo).length > 3) ts -= 6;
  const tl = Math.min(3, quebrar(c, H_, PW - 2 * M, ts, MARCA.titulo).length), pl = quebrar(c, txt, PW - 2 * M, 46, MARCA.corpo, 600).length;
  const tot = s * .95 + 30 + tl * ts * .98 + 80 + pl * 46 * 1.4;
  let y = Math.max(220, Math.min(420, (PH - 120 - tot) / 2 + 60));
  T(c, big, M - 4, y + s * .82, s, MARCA.titulo, k.ac); y += s * .95 + 30;
  y = titulo(c, h, M, y, PW - 2 * M, ts, 60, k.tx, 3) + 80;
  paragrafo(c, txt, M, y, PW - 2 * M, 46, MARCA.corpo, k.sub, 600, 1.4, Math.max(2, Math.floor((PH - 190 - y) / 64) + 1));
  rodapeP(c, PW, PH, k.dk, rod || "Salva e manda pra quem vai viajar");
}; }
/* tela lista: linhas destino · companhia · info */
function ctTelaLista(t, [h, linhas, nota], pos, n) { return c => {
  const k = TEMA[t]; k.bg(c, PW, PH); marca(c, PW, k.dk, `${pos}/${n}`);
  let y = titulo(c, h, M, 210, PW - 2 * M, 100, 64, k.tx, 2) + 60;
  const hL = Math.min(190, (PH - 260 - y - (nota ? 90 : 0)) / linhas.length);
  linhas.forEach(([a, b, d]) => { c.fillStyle = k.dk ? "rgba(255,255,255,.08)" : "rgba(15,42,71,.07)"; rr(c, M, y, PW - 2 * M, hL - 16, 26); c.fill();
    T(c, a.toUpperCase(), M + 40, y + (hL - 16) / 2 + 6, Math.min(72, hL * .42), MARCA.titulo, k.tx, "left", 400, 1);
    T(c, b, M + 40, y + (hL - 16) / 2 + 52, 30, MARCA.corpo, k.sub, "left", 700);
    if (d) T(c, d, PW - M - 40, y + (hL - 16) / 2 + 22, 48, MARCA.corpo, k.ac, "right", 800);
    y += hL; });
  if (nota) paragrafo(c, nota, M, y + 40, PW - 2 * M, 30, MARCA.corpo, k.sub, 600, 1.3, 2);
  rodapeP(c, PW, PH, k.dk, "Salva pra planejar a próxima");
}; }

const CONTEUDO = [
  { id: "pode-nao-pode", tema: "escuro", foto: "clip-v-mala-1", kick: "Bagagem de mão", capa: "Pode ou não pode levar no avião?", sub: "8 itens que geram dúvida (e confusão) no raio-x.", dir: "GUIA",
    pn: [
      ["Carregador portátil", "pode", "Só na bagagem de mão, no máximo 2 por pessoa e de até 100 Wh. E atenção: é proibido recarregar ele durante o voo (regra nova da ANAC, 2026).", "power-bank-3"],
      ["Perfume", "pode", "Em voo internacional, frasco de até 100 ml, junto com os outros líquidos num saquinho transparente de até 1 litro. Comprou no free shop? Vai na sacola lacrada com a nota.", "frascos-1"],
      ["Tesourinha", "dep", "Com lâmina de até 6 cm costuma passar. Passou disso, vai na mala despachada."],
      ["Canivete e estilete", "nao", "Não importa o tamanho. Na bagagem de mão fica no raio-x: se precisar levar, despacha."],
      ["Comida", "pode", "Biscoito, castanha, sanduíche e chocolate: liberado. Em voo internacional, fruta, verdura e carne in natura costumam ser barradas na chegada."],
      ["Desodorante spray", "dep", "Até 100 ml vai no saquinho de líquidos. Maior que isso, despacha. O de bastão não tem limite."],
      ["Isqueiro maçarico", "nao", "Isqueiro de chama tipo maçarico, fluido inflamável e fogos: proibidos no avião."],
      ["Remédio líquido", "pode", "Acima de 100 ml também passa, desde que você leve a receita médica. Insulina e injetáveis: leve a documentação."]],
    fim: ["Qual desses você não sabia?", "Comenta aqui. E salva pra lembrar na hora de fazer a mala."],
    leg: "🧳 PODE OU NÃO PODE NA BAGAGEM DE MÃO?\n\n✅ Carregador portátil: só na mão, máx. 2, até 100 Wh (e não pode recarregar no voo)\n✅ Perfume: até 100 ml no saquinho de líquidos (voo internacional)\n⚠️ Tesourinha: lâmina de até 6 cm\n❌ Canivete e estilete: nenhum tamanho\n✅ Comida sólida: liberada\n⚠️ Desodorante spray: até 100 ml\n❌ Isqueiro maçarico: proibido\n✅ Remédio líquido: com receita\n\nAs companhias podem ter regras mais rígidas: confere no site delas antes de voar.\n\n💬 Qual desses você não sabia?" },
  { id: "power-bank", tema: "amarelo", foto: "power-bank-3", kick: "Regra nova · ANAC", capa: "A regra do carregador portátil mudou", sub: "Quem viaja com power bank precisa saber disso.", dir: "AVISO",
    tx: [
      ["Só na bagagem de mão", "Power bank não pode ir na mala despachada. Nunca. Ele vai com você na cabine.", "MÃO"],
      ["No máximo 2 por pessoa", "A ANAC limitou a quantidade: até dois carregadores portáteis por passageiro.", "2X"],
      ["Olhe os Wh", "Até 100 Wh: liberado. De 100 a 160 Wh: só com autorização da companhia. Acima de 160 Wh: proibido e descartado antes do embarque.", "100 WH"],
      ["Não pode recarregar a bordo", "Carregar o power bank na tomada do avião durante o voo ficou proibido. E usar ele pra carregar o celular não é recomendado.", "✕"],
      ["Proteja os contatos", "Leve na embalagem original ou com os contatos protegidos, pra evitar curto-circuito."]],
    fim: ["Manda pra quem vive com power bank na bolsa", "Regra publicada pela ANAC em abril de 2026. A companhia pode ser ainda mais rígida."],
    leg: "🔋 A REGRA DO POWER BANK MUDOU\n\n▪️ Só na bagagem de mão\n▪️ Máximo de 2 por pessoa\n▪️ Até 100 Wh: liberado · 100 a 160 Wh: com autorização da companhia · acima de 160 Wh: proibido\n▪️ Proibido recarregar ele durante o voo\n▪️ Contatos protegidos contra curto-circuito\n\nFonte: ANAC (abril de 2026). Confere também a regra da sua companhia.\n\n📤 Manda pra quem vive com power bank na bolsa." },
  { id: "pinto-martins", tema: "creme", foto: "clip-v-aeroporto-1", kick: "Curiosidade", capa: "Quem foi Pinto Martins?", sub: "O cearense que dá nome ao nosso aeroporto tem uma história de filme.", dir: "HISTÓRIA",
    tx: [
      ["Cearense de Camocim", "Euclides Pinto Martins nasceu em Camocim, em 1892, e virou um dos pioneiros da aviação brasileira."],
      ["A ideia maluca", "Sair de Nova York e chegar ao Rio de Janeiro voando de hidroavião. Ele era o idealizador do projeto e foi copiloto ao lado do americano Walter Hinton.", "1922"],
      ["Dias de viagem", "Decolaram de Nova York em 16 de agosto de 1922 e pousaram na Baía de Guanabara em 8 de fevereiro de 1923.", "175"],
      ["Virou time de futebol", "O hidroavião se chamava Sampaio Corrêa. O nome e as cores inspiraram jovens de São Luís a fundar o Sampaio Corrêa Futebol Clube, um ano depois.", "⚽"],
      ["E o aeroporto antes?", "Se chamava Aeroporto do Cocorote. Em 1952 ganhou o nome de Pinto Martins, que morreu em 1924, um ano depois do voo histórico.", "1952"]],
    fim: ["Você sabia dessa?", "Salva e manda pro amigo que diz que conhece tudo de Fortaleza."],
    leg: "✈️ QUEM FOI PINTO MARTINS?\n\nO nome do Aeroporto de Fortaleza homenageia Euclides Pinto Martins, cearense de Camocim e pioneiro da aviação.\n\n▪️ Em 1922 ele idealizou um voo de hidroavião de Nova York ao Rio de Janeiro\n▪️ A viagem durou 175 dias (16/08/1922 a 08/02/1923)\n▪️ O avião se chamava Sampaio Corrêa e inspirou o time de futebol de São Luís\n▪️ Antes, o aeroporto se chamava Cocorote. O nome mudou em 1952\n\n💬 Você sabia dessa?" },
  { id: "for-numeros", tema: "escuro", foto: "clip-v-decolagem-1", kick: "Aeroporto de Fortaleza", capa: "O nosso aeroporto em números", sub: "Uns dados que pouca gente conhece.", dir: "DADOS",
    tx: [
      ["Passageiros em 2025", "Foi o movimento do Pinto Martins no ano passado, 9% a mais que em 2024. A meta pra 2026 é passar de 6,5 milhões.", "6,1 MI"],
      ["O recorde é de 2019", "Foram mais de 7,2 milhões de passageiros naquele ano. Depois veio a pandemia e o movimento caiu pra 3,1 milhões em 2020.", "7,2 MI"],
      ["Só em julho de 2026", "585 mil passageiros passaram pelo aeroporto. Fortaleza foi o 10º aeroporto mais movimentado do país no mês.", "585 MIL"],
      ["Metros de pista", "É uma pista só, a 13/31, com 2.755 metros. O terreno todo tem 531 hectares: mais de 700 campos de futebol.", "2.755"],
      ["Anos de concessão", "Desde 2018 quem administra é a alemã Fraport, a mesma do aeroporto de Frankfurt. O contrato é de 30 anos.", "30"]],
    fim: ["Você usa muito o Pinto Martins?", "Comenta pra onde foi seu último voo saindo daqui."],
    leg: "📊 O AEROPORTO DE FORTALEZA EM NÚMEROS\n\n▪️ 6,1 milhões de passageiros em 2025 (+9%)\n▪️ Recorde: 7,2 milhões em 2019\n▪️ 585 mil passageiros só em julho de 2026 (10º do país no mês)\n▪️ Pista de 2.755 metros\n▪️ Administrado pela Fraport desde 2018, numa concessão de 30 anos\n\nFontes: ANAC, Fraport e jornais O Povo e Diário do Nordeste.\n\n💬 Pra onde foi seu último voo saindo daqui?" },
  { id: "voo-direto", tema: "amarelo", foto: "clip-v-asa-2", kick: "Saindo de Fortaleza", capa: "Pra onde dá pra ir sem escala", sub: "Os voos diretos internacionais saindo do Pinto Martins.", dir: "DESTINOS",
    ls: [
      ["Europa", [["Lisboa", "TAP e LATAM", "≈ 7h"], ["Paris", "Air France", "≈ 9h"], ["Madri", "Iberia", ""]], "Fortaleza → Lisboa está entre os voos mais rápidos do Brasil pra Europa."],
      ["Américas", [["Buenos Aires", "Gol", ""], ["Montevidéu", "Gol", ""], ["Orlando", "Gol", ""], ["Caiena · Guiana Francesa", "Air France", ""]], "Rotas e dias de operação mudam ao longo do ano: confirme no site da companhia."]],
    tx: [["E dentro do Brasil?", "Tem voo direto pra São Paulo, Rio, Brasília, BH, Recife, Salvador, Natal, Manaus, Belém, São Luís, Teresina, Juazeiro do Norte, Parnaíba e mais.", "BR"]],
    fim: ["Qual desses tá na sua lista?", "A gente avisa quando qualquer um deles ficar barato saindo de Fortaleza."],
    leg: "🌍 PRA ONDE DÁ PRA IR SEM ESCALA SAINDO DE FORTALEZA\n\n🇵🇹 Lisboa (TAP e LATAM) · ≈ 7h\n🇫🇷 Paris (Air France) · ≈ 9h\n🇪🇸 Madri (Iberia)\n🇦🇷 Buenos Aires (Gol)\n🇺🇾 Montevidéu (Gol)\n🇺🇸 Orlando (Gol)\n🇬🇫 Caiena, Guiana Francesa (Air France)\n\nRotas e frequências mudam durante o ano: confirme com a companhia.\n\n💬 Qual desses tá na sua lista?" },
  { id: "europa-rapido", tema: "creme", foto: "clip-v-nuvens-1", kick: "Vantagem de quem é daqui", capa: "Fortaleza é porta de entrada pra Europa", sub: "Daqui sai um dos voos mais rápidos do Brasil pro outro lado do Atlântico.", dir: "CURIOSIDADE",
    ls: [["Brasil → Lisboa", [["Fortaleza ✈", "", "7h10"], ["Recife", "", "7h40"], ["Salvador", "", "8h15"], ["Brasília", "", "9h05"], ["Rio de Janeiro", "", "9h45"]], "Tempos de voo aproximados. Variam com o avião e a época do ano."]],
    tx: [["E Paris?", "Fortaleza → Paris leva cerca de 8h55 pela Air France. Quem sai do Rio ou de São Paulo voa bem mais.", "8H55"],
      ["Os voos lotam", "No começo de 2026, os voos de Fortaleza pra Europa tiveram mais de 90% de ocupação. Por isso a promoção boa some rápido.", "90%"]],
    fim: ["Europa é mais perto do que parece", "Segue o @partiu.085 pra pegar a próxima promoção pra Lisboa, Paris e Madri."],
    leg: "🇪🇺 FORTALEZA É PORTA DE ENTRADA PRA EUROPA\n\nDaqui sai um dos voos mais rápidos do Brasil pra Lisboa: cerca de 7h10. Do Rio são 9h45.\n\n▪️ Fortaleza → Paris: cerca de 8h55\n▪️ Os voos de Fortaleza pra Europa passaram de 90% de ocupação no começo de 2026\n\n✈️ Segue o @partiu.085 pra pegar a próxima promoção." },
  { id: "curiosidades-aviao", tema: "escuro", foto: "clip-v-janela-2", kick: "Curiosidades", capa: "Coisas do avião que ninguém te explica", sub: "A 5ª muda o jeito que você vê o lanche de bordo.", dir: "VOCÊ SABIA?",
    tx: [
      ["Por que apagam as luzes no pouso?", "Pros seus olhos já estarem acostumados com o escuro. Se precisar sair às pressas, você enxerga melhor."],
      ["Por que abrir a janela?", "Na decolagem e no pouso a tripulação precisa ver o que acontece lá fora, caso aconteça alguma emergência."],
      ["O furinho na janela", "Ele equilibra a pressão entre as camadas do vidro da janela e ajuda a não embaçar."],
      ["Modo avião serve pra quê?", "O sinal do celular pode causar interferência e chiado no rádio dos pilotos, principalmente perto do pouso."],
      ["Por que a comida parece sem gosto?", "Lá em cima, com o ar seco e a pressão menor, a gente sente menos o salgado e o doce. Por isso a comida de bordo vem mais temperada."],
      ["Os pilotos comem igual?", "Normalmente comandante e copiloto comem refeições diferentes. Se uma estiver estragada, o outro segue bem."]],
    fim: ["Qual você não sabia?", "Manda pro amigo que tem medo de avião. Saber como funciona ajuda."],
    leg: "🛫 COISAS DO AVIÃO QUE NINGUÉM TE EXPLICA\n\n1. As luzes apagam no pouso pros olhos se acostumarem ao escuro\n2. A janela aberta é pra tripulação ver lá fora\n3. O furinho da janela equilibra a pressão\n4. O modo avião evita chiado no rádio dos pilotos\n5. A comida parece sem gosto porque lá em cima o paladar muda\n6. Os pilotos costumam comer refeições diferentes\n\n💬 Qual você não sabia?" },
  { id: "novidades-out26", tema: "amarelo", foto: "clip-v-pouso-1", kick: "Notícia · outubro 2026", capa: "O que muda nos voos de Fortaleza", sub: "Mais voo pra Europa, rota saindo e a Fraport chegando em Jeri.", dir: "NOVIDADE", valido: "2026-11-15",
    tx: [
      ["Mais voos pra Lisboa", "A LATAM passa de 3 pra 4 voos por semana em outubro. De novembro a março, chega a 5: segunda, terça, quarta, quinta e sábado.", "5X"],
      ["Paris todo dia?", "A Air France voa 5 vezes por semana pra Paris e planeja chegar a voos diários até o fim de 2026.", "5X"],
      ["Santiago e Miami saindo", "A LATAM deixou de vender voos diretos de Fortaleza pra Santiago e Miami a partir de outubro de 2026.", "✕"],
      ["Jericoacoara na conta", "A Fraport, que administra o aeroporto de Fortaleza, assinou em 2026 pra administrar também o aeroporto de Jericoacoara.", "JERI"],
      ["A meta pra 2026", "A Fraport quer passar de 6,5 milhões de passageiros em Fortaleza em 2026. E fala em Itália, Argentina, Uruguai e Chile como próximos mercados.", "6,5 MI"]],
    fim: ["Qual rota você quer ver chegar?", "Comenta aqui. Itália? Argentina? A gente torce junto."],
    leg: "📰 O QUE MUDA NOS VOOS DE FORTALEZA\n\n▪️ LATAM: Lisboa vai pra 4 voos/semana em outubro e 5 de novembro a março\n▪️ Air France: 5 voos/semana pra Paris, com plano de voo diário até o fim do ano\n▪️ LATAM deixou de vender Fortaleza–Santiago e Fortaleza–Miami a partir de outubro\n▪️ A Fraport também vai administrar o aeroporto de Jericoacoara\n▪️ Meta: passar de 6,5 milhões de passageiros em 2026\n\nFontes: Passageiro de Primeira, Pontos pra Voar e Diário do Nordeste.\n\n💬 Qual rota você quer ver chegar em Fortaleza?" },
  { id: "salas-vip-for", tema: "creme", foto: "clip-v-aeroporto-2", kick: "Aeroporto de Fortaleza", capa: "As salas VIP do nosso aeroporto", sub: "Fortaleza tem 6 espaços premium. E dá pra entrar sem pagar caro.", dir: "SALA VIP",
    tx: [
      ["Sala VIP do Inter", "Inaugurada em março de 2026, no embarque nacional, perto do portão 12. Funciona todo dia, das 6h às 22h, e cabe 60 pessoas.", "NOVA"],
      ["Quem entra de graça?", "Clientes Inter Prime e Inter Win entram sem pagar, quantas vezes quiserem. Os outros clientes do Inter podem usar 4.000 pontos Loop por acesso.", "GRÁTIS"],
      ["O que tem lá dentro", "Bufê com comida cearense, bar, café especial, Wi-Fi, espaço kids e até ducha. Criança até 6 anos não paga.", "☕"],
      ["W Premium Beira-mar", "A sala nova do embarque internacional, logo depois do Duty Free. Abre cerca de 3 horas antes de cada voo internacional. O acesso é por programas parceiros.", "INTERNACIONAL"],
      ["E tem mais", "W Premium Lounge (nacional), W Premium Iracema (internacional), W Arrival Lounge (na chegada) e W Airport Rooms, com quartos pra descansar.", "+4"],
      ["Antes de pagar, olhe o cartão", "Muito cartão de crédito dá acesso a sala VIP (Priority Pass, LoungeKey ou programa do próprio banco). Confira no app do seu cartão antes de pagar avulso.", "💳"]],
    fim: ["Você já usou sala VIP?", "Comenta qual é a sua favorita. E salva pra próxima viagem."],
    leg: "🛋️ AS SALAS VIP DO AEROPORTO DE FORTALEZA\n\n▪️ Sala VIP do Inter (nova, março/2026): embarque nacional, perto do portão 12, das 6h às 22h. Grátis pra Inter Prime e Inter Win; demais clientes, 4.000 pontos Loop\n▪️ W Premium Beira-mar: embarque internacional, abre ~3h antes de cada voo internacional\n▪️ E ainda: W Premium Lounge (nacional), W Premium Iracema (internacional), W Arrival Lounge e W Airport Rooms\n\n💳 Antes de pagar avulso, veja se o seu cartão dá acesso (Priority Pass, LoungeKey ou programa do banco).\n\nFontes: O Povo, Melhores Destinos e Fraport.\n\n💬 Você já usou sala VIP?" },
  { id: "bonus-transferencia", tema: "amarelo", foto: "celular-viagem-1", kick: "Milhas sem mistério", capa: "Bônus de transferência: como funciona", sub: "É assim que quem entende transforma ponto do cartão em passagem.", dir: "MILHAS",
    tx: [
      ["Ponto vira milha", "Você junta pontos no cartão ou no banco (Livelo, Esfera e outros) e transfere pra companhia: Smiles, LATAM Pass ou Azul Fidelidade.", "PONTOS"],
      ["Com bônus, rende muito mais", "Exemplo: 10.000 pontos transferidos com 80% de bônus viram 18.000 milhas. São 8.000 milhas de graça.", "+80%"],
      ["Nunca transfira sem bônus", "Campanhas de 70%, 80% e até 100% aparecem várias vezes por ano. Se não tem bônus agora, espere a próxima.", "ESPERA"],
      ["Clube aumenta o bônus", "As maiores faixas de bônus costumam ser pra quem assina o clube da companhia. Às vezes vale assinar só no mês da transferência.", "CLUBE"],
      ["Pontos por real", "Lojas parceiras dão pontos a cada R$ 1 gasto. Ex.: 8 pontos por real numa compra de R$ 500 = 4.000 pontos. Compra que você ia fazer de qualquer jeito.", "8X"],
      ["Leia o regulamento", "Bônus tem prazo e às vezes pede cadastro antes de transferir. Confira a data e as regras no site do programa."]],
    fim: ["A gente avisa quando o bônus for bom", "Segue o @partiu.085 e ativa o sininho: promoção de milhas some rápido."],
    leg: "💳 BÔNUS DE TRANSFERÊNCIA: COMO FUNCIONA\n\n1️⃣ Você junta pontos (Livelo, Esfera…) e transfere pra companhia (Smiles, LATAM Pass, Azul Fidelidade)\n2️⃣ Com bônus rende mais: 10.000 pontos + 80% = 18.000 milhas\n3️⃣ Nunca transfira sem bônus: campanhas de 70% a 100% aparecem várias vezes por ano\n4️⃣ Quem tem clube costuma ganhar as maiores faixas\n5️⃣ Pontos por real: 8 pontos por real em R$ 500 = 4.000 pontos\n6️⃣ Bônus tem prazo: leia o regulamento\n\n🔔 A gente avisa quando aparecer bônus bom. Ativa o sininho!" },
  { id: "dia-aviador", tema: "creme", foto: "clip-v-decolagem-2", kick: "23 de outubro", capa: "Hoje é Dia do Aviador", sub: "E tem tudo a ver com um brasileiro.", dir: "DATA", data: "2026-10-23",
    tx: [
      ["Por que 23 de outubro?", "Foi nesse dia, em 1906, que Santos Dumont voou com o 14-Bis em Paris, diante de uma multidão e de uma comissão oficial.", "1906"],
      ["Um brasileiro no ar", "Pra muita gente, foi o primeiro voo de um avião que decolou sozinho, por meios próprios, sem catapulta.", "14-BIS"],
      ["E hoje?", "120 anos depois, só de Fortaleza saem voos diretos pra Lisboa, Paris e Madri. Santos Dumont ia gostar de ver."]],
    fim: ["Feliz Dia do Aviador ✈️", "Marca aqui alguém que trabalha com aviação."],
    leg: "✈️ 23 DE OUTUBRO: DIA DO AVIADOR\n\nNesse dia, em 1906, Santos Dumont voou com o 14-Bis em Paris.\n\nUma homenagem a todos os pilotos, comissários, mecânicos e a todo mundo que faz a gente chegar lá.\n\n💬 Marca alguém que trabalha com aviação!" },
];

function fConteudo(x) {
  const corpo = [...(x.pn || []).map(p => ["pn", p]), ...(x.ls || []).map(p => ["ls", p]), ...(x.tx || []).map(p => ["tx", p])], n = corpo.length + 2;
  const par = { escuro: ["creme", "escuro"], creme: ["creme", "escuro"], amarelo: ["amarelo", "escuro"] }[x.tema];
  const telas = [ctCapaFoto(x.foto, x.kick, x.capa, x.sub, x.dir)];
  corpo.forEach(([tp, d], i) => { const t = par[i % 2]; // alterna claro/escuro dentro do carrossel
    telas.push(tp === "pn" ? ctTelaPN(t, d, i + 2, n) : tp === "ls" ? ctTelaLista(t, d, i + 2, n) : ctTelaTxt(t, d, i + 2, n)); });
  telas.push(c => capaTema(c, "escuro", "Partiu 085", x.fim[0], x.fim[1], "", "Siga @partiu.085 · ative o sininho 🔔"));
  return { id: "ct-" + x.id, grupo: "feed", tipo: "Conteúdo", rot: "Conteúdo", titulo: x.capa, valido: x.valido, data: x.data,
    porque: x.data ? `Post de data: o ideal é sair no dia ${x.data.slice(8, 10)}/${x.data.slice(5, 7)}.` : x.valido ? "Notícia pesquisada: vale até a data marcada." : "Conteúdo pesquisado, com fonte. Carrossel que ensina é o que mais é salvo e compartilhado.",
    fmt: `Carrossel · ${n} telas`, telas, legenda: `${x.leg}\n\n✈️ Passagem barata saindo de Fortaleza: segue o @partiu.085\n\n${HASH}` };
}
function postsConteudo() { const h = hojeISO(); return CONTEUDO.filter(x => !x.valido || x.valido >= h).map(fConteudo); }
