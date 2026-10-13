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
  { id: "pode-nao-pode", tema: "escuro", foto: "capa-pode-nao-pode", kick: "Bagagem de mão", capa: "Pode ou não pode levar no avião?", sub: "8 itens que geram dúvida (e confusão) no raio-x.", dir: "GUIA",
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
  { id: "pinto-martins", tema: "creme", foto: "capa-pinto-martins", kick: "Curiosidade", capa: "Quem foi Pinto Martins?", sub: "O cearense que dá nome ao nosso aeroporto tem uma história de filme.", dir: "HISTÓRIA",
    tx: [
      ["Cearense de Camocim", "Euclides Pinto Martins nasceu em Camocim, em 1892, e virou um dos pioneiros da aviação brasileira."],
      ["A ideia maluca", "Sair de Nova York e chegar ao Rio de Janeiro voando de hidroavião. Ele era o idealizador do projeto e foi copiloto ao lado do americano Walter Hinton.", "1922"],
      ["Dias de viagem", "Decolaram de Nova York em 16 de agosto de 1922 e pousaram na Baía de Guanabara em 8 de fevereiro de 1923.", "175"],
      ["Virou time de futebol", "O hidroavião se chamava Sampaio Corrêa. O nome e as cores inspiraram jovens de São Luís a fundar o Sampaio Corrêa Futebol Clube, um ano depois.", "⚽"],
      ["E o aeroporto antes?", "Se chamava Aeroporto do Cocorote. Em 1952 ganhou o nome de Pinto Martins, que morreu em 1924, um ano depois do voo histórico.", "1952"]],
    fim: ["Você sabia dessa?", "Salva e manda pro amigo que diz que conhece tudo de Fortaleza."],
    leg: "✈️ QUEM FOI PINTO MARTINS?\n\nO nome do Aeroporto de Fortaleza homenageia Euclides Pinto Martins, cearense de Camocim e pioneiro da aviação.\n\n▪️ Em 1922 ele idealizou um voo de hidroavião de Nova York ao Rio de Janeiro\n▪️ A viagem durou 175 dias (16/08/1922 a 08/02/1923)\n▪️ O avião se chamava Sampaio Corrêa e inspirou o time de futebol de São Luís\n▪️ Antes, o aeroporto se chamava Cocorote. O nome mudou em 1952\n\n💬 Você sabia dessa?" },
  { id: "for-numeros", tema: "escuro", foto: "capa-for-numeros", kick: "Aeroporto de Fortaleza", capa: "O nosso aeroporto em números", sub: "Uns dados que pouca gente conhece.", dir: "DADOS",
    tx: [
      ["Passageiros em 2025", "Foi o movimento do Pinto Martins no ano passado, 9% a mais que em 2024. A meta pra 2026 é passar de 6,5 milhões.", "6,1 MI"],
      ["O recorde é de 2019", "Foram mais de 7,2 milhões de passageiros naquele ano. Depois veio a pandemia e o movimento caiu pra 3,1 milhões em 2020.", "7,2 MI"],
      ["Só em julho de 2026", "585 mil passageiros passaram pelo aeroporto. Fortaleza foi o 10º aeroporto mais movimentado do país no mês.", "585 MIL"],
      ["Metros de pista", "É uma pista só, a 13/31, com 2.755 metros. O terreno todo tem 531 hectares: mais de 700 campos de futebol.", "2.755"],
      ["Anos de concessão", "Desde 2018 quem administra é a alemã Fraport, a mesma do aeroporto de Frankfurt. O contrato é de 30 anos.", "30"]],
    fim: ["Você usa muito o Pinto Martins?", "Comenta pra onde foi seu último voo saindo daqui."],
    leg: "📊 O AEROPORTO DE FORTALEZA EM NÚMEROS\n\n▪️ 6,1 milhões de passageiros em 2025 (+9%)\n▪️ Recorde: 7,2 milhões em 2019\n▪️ 585 mil passageiros só em julho de 2026 (10º do país no mês)\n▪️ Pista de 2.755 metros\n▪️ Administrado pela Fraport desde 2018, numa concessão de 30 anos\n\nFontes: ANAC, Fraport e jornais O Povo e Diário do Nordeste.\n\n💬 Pra onde foi seu último voo saindo daqui?" },
  { id: "voo-direto", tema: "amarelo", foto: "capa-voo-direto", kick: "Saindo de Fortaleza", capa: "Pra onde dá pra ir sem escala", sub: "Os voos diretos internacionais saindo do Pinto Martins.", dir: "DESTINOS",
    ls: [
      ["Europa", [["Lisboa", "TAP e LATAM", "≈ 7h"], ["Paris", "Air France", "≈ 9h"], ["Madri", "Iberia", ""]], "Fortaleza → Lisboa está entre os voos mais rápidos do Brasil pra Europa."],
      ["Américas", [["Buenos Aires", "Gol", ""], ["Montevidéu", "Gol", ""], ["Orlando", "Gol", ""], ["Caiena · Guiana Francesa", "Air France", ""]], "Rotas e dias de operação mudam ao longo do ano: confirme no site da companhia."]],
    tx: [["E dentro do Brasil?", "Tem voo direto pra São Paulo, Rio, Brasília, BH, Recife, Salvador, Natal, Manaus, Belém, São Luís, Teresina, Juazeiro do Norte, Parnaíba e mais.", "BR"]],
    fim: ["Qual desses tá na sua lista?", "A gente avisa quando qualquer um deles ficar barato saindo de Fortaleza."],
    leg: "🌍 PRA ONDE DÁ PRA IR SEM ESCALA SAINDO DE FORTALEZA\n\n🇵🇹 Lisboa (TAP e LATAM) · ≈ 7h\n🇫🇷 Paris (Air France) · ≈ 9h\n🇪🇸 Madri (Iberia)\n🇦🇷 Buenos Aires (Gol)\n🇺🇾 Montevidéu (Gol)\n🇺🇸 Orlando (Gol)\n🇬🇫 Caiena, Guiana Francesa (Air France)\n\nRotas e frequências mudam durante o ano: confirme com a companhia.\n\n💬 Qual desses tá na sua lista?" },
  { id: "europa-rapido", tema: "creme", foto: "capa-europa-rapido", kick: "Vantagem de quem é daqui", capa: "Fortaleza é porta de entrada pra Europa", sub: "Daqui sai um dos voos mais rápidos do Brasil pro outro lado do Atlântico.", dir: "CURIOSIDADE",
    ls: [["Brasil → Lisboa", [["Fortaleza ✈", "", "7h10"], ["Recife", "", "7h40"], ["Salvador", "", "8h15"], ["Brasília", "", "9h05"], ["Rio de Janeiro", "", "9h45"]], "Tempos de voo aproximados. Variam com o avião e a época do ano."]],
    tx: [["E Paris?", "Fortaleza → Paris leva cerca de 8h55 pela Air France. Quem sai do Rio ou de São Paulo voa bem mais.", "8H55"],
      ["Os voos lotam", "No começo de 2026, os voos de Fortaleza pra Europa tiveram mais de 90% de ocupação. Por isso a promoção boa some rápido.", "90%"]],
    fim: ["Europa é mais perto do que parece", "Segue o @partiu.085 pra pegar a próxima promoção pra Lisboa, Paris e Madri."],
    leg: "🇪🇺 FORTALEZA É PORTA DE ENTRADA PRA EUROPA\n\nDaqui sai um dos voos mais rápidos do Brasil pra Lisboa: cerca de 7h10. Do Rio são 9h45.\n\n▪️ Fortaleza → Paris: cerca de 8h55\n▪️ Os voos de Fortaleza pra Europa passaram de 90% de ocupação no começo de 2026\n\n✈️ Segue o @partiu.085 pra pegar a próxima promoção." },
  { id: "curiosidades-aviao", tema: "escuro", foto: "capa-curiosidades-aviao", kick: "Curiosidades", capa: "Coisas do avião que ninguém te explica", sub: "A 5ª muda o jeito que você vê o lanche de bordo.", dir: "VOCÊ SABIA?",
    tx: [
      ["Por que apagam as luzes no pouso?", "Pros seus olhos já estarem acostumados com o escuro. Se precisar sair às pressas, você enxerga melhor."],
      ["Por que abrir a janela?", "Na decolagem e no pouso a tripulação precisa ver o que acontece lá fora, caso aconteça alguma emergência."],
      ["O furinho na janela", "Ele equilibra a pressão entre as camadas do vidro da janela e ajuda a não embaçar."],
      ["Modo avião serve pra quê?", "O sinal do celular pode causar interferência e chiado no rádio dos pilotos, principalmente perto do pouso."],
      ["Por que a comida parece sem gosto?", "Lá em cima, com o ar seco e a pressão menor, a gente sente menos o salgado e o doce. Por isso a comida de bordo vem mais temperada."],
      ["Os pilotos comem igual?", "Normalmente comandante e copiloto comem refeições diferentes. Se uma estiver estragada, o outro segue bem."]],
    fim: ["Qual você não sabia?", "Manda pro amigo que tem medo de avião. Saber como funciona ajuda."],
    leg: "🛫 COISAS DO AVIÃO QUE NINGUÉM TE EXPLICA\n\n1. As luzes apagam no pouso pros olhos se acostumarem ao escuro\n2. A janela aberta é pra tripulação ver lá fora\n3. O furinho da janela equilibra a pressão\n4. O modo avião evita chiado no rádio dos pilotos\n5. A comida parece sem gosto porque lá em cima o paladar muda\n6. Os pilotos costumam comer refeições diferentes\n\n💬 Qual você não sabia?" },
  { id: "novidades-out26", tema: "amarelo", foto: "capa-novidades-out26", kick: "Notícia · outubro 2026", capa: "O que muda nos voos de Fortaleza", sub: "Mais voo pra Europa, rota saindo e a Fraport chegando em Jeri.", dir: "NOVIDADE", valido: "2026-11-15",
    tx: [
      ["Mais voos pra Lisboa", "A LATAM passa de 3 pra 4 voos por semana em outubro. De novembro a março, chega a 5: segunda, terça, quarta, quinta e sábado.", "5X"],
      ["Paris todo dia?", "A Air France voa 5 vezes por semana pra Paris e planeja chegar a voos diários até o fim de 2026.", "5X"],
      ["Santiago e Miami saindo", "A LATAM deixou de vender voos diretos de Fortaleza pra Santiago e Miami a partir de outubro de 2026.", "✕"],
      ["Jericoacoara na conta", "A Fraport, que administra o aeroporto de Fortaleza, assinou em 2026 pra administrar também o aeroporto de Jericoacoara.", "JERI"],
      ["A meta pra 2026", "A Fraport quer passar de 6,5 milhões de passageiros em Fortaleza em 2026. E fala em Itália, Argentina, Uruguai e Chile como próximos mercados.", "6,5 MI"]],
    fim: ["Qual rota você quer ver chegar?", "Comenta aqui. Itália? Argentina? A gente torce junto."],
    leg: "📰 O QUE MUDA NOS VOOS DE FORTALEZA\n\n▪️ LATAM: Lisboa vai pra 4 voos/semana em outubro e 5 de novembro a março\n▪️ Air France: 5 voos/semana pra Paris, com plano de voo diário até o fim do ano\n▪️ LATAM deixou de vender Fortaleza–Santiago e Fortaleza–Miami a partir de outubro\n▪️ A Fraport também vai administrar o aeroporto de Jericoacoara\n▪️ Meta: passar de 6,5 milhões de passageiros em 2026\n\nFontes: Passageiro de Primeira, Pontos pra Voar e Diário do Nordeste.\n\n💬 Qual rota você quer ver chegar em Fortaleza?" },
  { id: "salas-vip-for", tema: "creme", foto: "capa-salas-vip-for", kick: "Aeroporto de Fortaleza", capa: "As salas VIP do nosso aeroporto", sub: "Fortaleza tem 6 espaços premium. E dá pra entrar sem pagar caro.", dir: "SALA VIP",
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
  { id: "tabela-fixa", tema: "escuro", foto: "clip-v-asa-1", kick: "Milhas · nível avançado", capa: "Tabela fixa: o atalho que pouca gente usa", sub: "Preço fixo em milhas, seja alta ou baixa temporada. Mas tem regra.", dir: "MILHAS",
    ls: [["Tabela fixa LATAM Pass · saindo do Brasil", [["América do Sul", "econômica · só ida", "24 mil"], ["América do Norte", "econômica · só ida", "57 mil"], ["África", "econômica · só ida", "62 mil"], ["Europa", "econômica · só ida", "80,7 mil"]], "Valores de agosto/2026, em milhas, sem as taxas. A tabela muda de tempos em tempos: confira no LATAM Pass."]],
    tx: [
      ["Só vale com parceiras", "Na LATAM Pass, a tabela fixa é pra voo 100% operado por companhia parceira. Voo da própria LATAM segue o preço que muda todo dia.", "LATAM"],
      ["No site não aparece", "Esse preço sai pela central de atendimento ou pelo WhatsApp oficial. No site, o mesmo voo costuma aparecer como tarifa comum, mais cara.", "CENTRAL"],
      ["Conexão soma os trechos", "Vai pra Ásia passando pela Europa? Conta Brasil–Europa mais Europa–Ásia. Faça a conta de cada trecho antes de pedir.", "+"],
      ["Assento é limitado", "Quem libera os lugares é a parceira, e são poucos. Tenha datas flexíveis e, se não sair de primeira, tente de novo.", "DATAS"],
      ["Onde ela brilha", "Executiva Brasil → Europa na tabela: 201,6 mil milhas, com o mesmo preço em qualquer data que tiver lugar.", "VIP"]],
    fim: ["Você já conhecia a tabela fixa?", "Salva esse post e manda pra quem junta milhas."],
    leg: "📋 TABELA FIXA: O ATALHO QUE POUCA GENTE USA\n\nNa tabela fixa, a passagem custa um valor tabelado pela região de origem e destino, seja alta ou baixa temporada.\n\nLATAM Pass, saindo do Brasil (econômica, só ida, valores de ago/2026):\n🌎 América do Sul: 24 mil milhas\n🇺🇸 América do Norte: 57 mil\n🌍 África: 62 mil\n🇪🇺 Europa: 80,7 mil\n💺 Executiva pra Europa: 201,6 mil\n\n⚠️ O que você precisa saber:\n▪️ Só vale pra voo 100% operado por companhia parceira (voo da LATAM segue o preço dinâmico)\n▪️ Sai pela central ou pelo WhatsApp oficial: no site aparece mais caro\n▪️ Com conexão, soma cada trecho por região\n▪️ Assento limitado: tenha datas flexíveis\n▪️ Os valores mudam de tempos em tempos e não incluem as taxas\n\n💬 Você já conhecia? Salva e manda pra quem junta milhas." },
  { id: "limite-cpf", tema: "amarelo", foto: "capa-limite-cpf", kick: "Milhas · o que ninguém te conta", capa: "Suas milhas têm limite de pessoas", sub: "Dá pra emitir pra família toda? Depende do programa.", dir: "MILHAS",
    ls: [["Pra quantas pessoas dá pra emitir", [["Smiles", "pessoas por ano · zera em 1º de janeiro", "25"], ["LATAM Pass", "emissões pra outras pessoas em 12 meses", "24"], ["Azul Fidelidade", "beneficiários · até 8 nas categorias altas", "5"]], "Você, o titular, não entra na conta. Regras de 2026: confira o regulamento do programa."]],
    tx: [
      ["Smiles conta pessoas", "São 25 CPFs diferentes no ano. Pra essas mesmas pessoas, você emite quantas vezes quiser.", "25"],
      ["LATAM conta emissões", "Cada passagem pra outra pessoa ocupa uma vaga por 12 meses. Emitiu em 20 de maio? Essa vaga só volta em 20 de maio do ano seguinte.", "12M"],
      ["Azul pede paciência", "Bateu o limite? Tira alguém da lista e cadastra o novo CPF. Mas só dá pra emitir pra ele depois de 30 dias.", "30D"],
      ["Passar do limite custa caro", "A regra existe pra frear a venda de milhas. Quem passa do limite pode ter a conta suspensa, com as milhas dentro.", "!"],
      ["Viagem em família", "Grupo grande? Divida as emissões entre mais de uma conta, ou deixe cada um emitir a própria passagem.", "DICA"]],
    fim: ["Marca quem emite passagem pra família toda", "E salva pra lembrar antes da próxima viagem."],
    leg: "👨‍👩‍👧‍👦 SUAS MILHAS TÊM LIMITE DE PESSOAS\n\nNão dá pra emitir passagem com milhas pra quantas pessoas você quiser. Cada programa tem um limite (o titular não conta):\n\n🟠 Smiles: 25 pessoas por ano. Zera em 1º de janeiro, e pra essas 25 você emite quantas vezes quiser.\n🔴 LATAM Pass: 24 emissões pra outras pessoas. Cada vaga só volta 12 meses depois da emissão.\n🔵 Azul Fidelidade: 5 beneficiários (até 8 nas categorias mais altas). Trocou alguém? Espera 30 dias pra emitir pro novo CPF.\n\n⚠️ Passou do limite, a conta pode ser suspensa. Na dúvida, confira o regulamento.\n\n💬 Marca quem sempre emite a passagem da família toda!" },
  { id: "validade-milhas", tema: "creme", foto: "calendario-2", kick: "Milhas · cuidado", capa: "Sua milha pode vencer antes do que você pensa", sub: "Cada programa tem um prazo. E o bônus vence primeiro.", dir: "ALERTA",
    ls: [["Quando a milha vence", [["LATAM Pass", "milhas de voo LATAM e parceiros", "2 anos"], ["Smiles · voando GOL", "categoria básica", "6 anos"], ["Smiles · banco", "vindas de banco ou parceiro · básica", "3 anos"], ["Azul · clube 1 a 5 mil", "pontos do clube", "3 anos"]], "Prazos de setembro/2026. Categorias mais altas e clubes maiores ganham prazo maior."]],
    tx: [
      ["O bônus vence antes", "Na Smiles, as milhas de bônus da transferência do banco duram cerca de 6 meses. A milha principal fica, o bônus não.", "6M"],
      ["Milha comprada também", "Na Smiles, milha comprada ou reativada vale 12 meses. Milha que veio de outra conta, 6 meses.", "12M"],
      ["Venceu na LATAM? Ainda dá", "Milhas vencidas nos últimos 180 dias podem ser reativadas pagando. Elas ganham mais 2 anos.", "180D"],
      ["Clube grande não vence", "Na Azul, clube de 10 mil ou 20 mil pontos não expira enquanto você cumpre as regras. Na Smiles, os clubes de 7 mil pra cima também não.", "CLUBE"],
      ["Olhe o extrato hoje", "Cada lote de milhas tem a sua data. No app do programa, veja o extrato e o que vence nos próximos meses.", "EXTRATO"]],
    fim: ["Quantas milhas você já perdeu?", "Comenta aqui. E salva pra conferir o extrato."],
    leg: "⏳ SUA MILHA PODE VENCER ANTES DO QUE VOCÊ PENSA\n\nPrazos de cada programa (set/2026, categoria básica):\n🔴 LATAM Pass: 2 anos a partir do crédito\n🟠 Smiles, voando GOL: 6 anos\n🟠 Smiles, vindas do banco ou de parceiros: 3 anos\n🔵 Azul, clubes de 1 a 5 mil: 3 anos\n\n⚠️ O que pega muita gente:\n▪️ Na Smiles, o BÔNUS da transferência do banco dura cerca de 6 meses\n▪️ Milha comprada ou reativada na Smiles: 12 meses\n▪️ Milha transferida de outra conta: 6 meses\n▪️ Na LATAM, milha vencida há até 180 dias pode ser reativada pagando (+2 anos)\n▪️ Clubes grandes (Azul 10 e 20 mil, Smiles 7 mil pra cima) não expiram enquanto você cumpre as regras\n\n👉 Abre o extrato hoje e vê o que vence nos próximos meses.\n\n💬 Quantas milhas você já perdeu? Conta aqui." },
  { id: "milhas-parceiras", tema: "escuro", foto: "capa-milhas-parceiras", kick: "Milhas · voando mais longe", capa: "Suas milhas voam em outras companhias", sub: "Dá pra ir de Emirates, TAP ou United com milha brasileira.", dir: "GUIA",
    ls: [["Algumas parceiras de cada programa", [["Azul Fidelidade", "TAP, United, Emirates, Turkish, Copa…", "7"], ["Smiles", "Air France, KLM, Emirates, Qatar, Iberia…", "+40"], ["LATAM Pass", "parceiras saem pela tabela fixa", "TABELA"]], "Listas de 2026. Ver a companhia na busca não quer dizer que ela aceita milhas: confira a lista oficial."]],
    tx: [
      ["As 7 da Azul", "Air Canada, Copa, Emirates, Etihad, TAP, Turkish e United. A emissão é pelo Azul Pelo Mundo, dentro da sua conta. Sem tabela fixa: o preço muda.", "7"],
      ["Veja quem opera o voo", "Preço e regras mudam conforme a companhia que opera cada trecho. Confira nos detalhes antes de fechar.", "OPERA"],
      ["A taxa muda de uma pra outra", "Além das milhas, cada companhia cobra as suas taxas em dinheiro, e algumas cobram bem mais. Compare o total, não só as milhas.", "R$"],
      ["Avios: a moeda da Iberia", "Livelo e Esfera transferem pra Iberia Plus: 3,5 pontos Livelo ou 2 pontos Esfera viram 1 Avios. Faça a conta antes de transferir.", "AVIOS"],
      ["Bilhetes separados, risco seu", "Juntou duas passagens diferentes? Se o primeiro voo atrasar, a segunda companhia não precisa te esperar. Deixe folga.", "!"]],
    fim: ["Qual companhia você quer voar com milhas?", "Comenta aqui que a gente faz um post sobre ela."],
    leg: "🌍 SUAS MILHAS VOAM EM OUTRAS COMPANHIAS\n\nMilha brasileira não serve só pra GOL, LATAM e Azul:\n\n🔵 Azul Fidelidade: 7 parceiras (Air Canada, Copa, Emirates, Etihad, TAP, Turkish e United), emitidas pelo Azul Pelo Mundo\n🟠 Smiles: mais de 40 parceiras, como Air France, KLM, Emirates, Qatar e Iberia\n🔴 LATAM Pass: parceiras saem pela tabela fixa, por região\n✈️ Iberia Plus (Avios): recebe pontos da Livelo (3,5 por 1 Avios) e da Esfera (2 por 1)\n\n⚠️ Antes de emitir:\n▪️ Veja quem opera cada trecho\n▪️ Compare as taxas em dinheiro, não só as milhas\n▪️ Bilhetes separados: deixe folga entre os voos\n\n💬 Qual companhia você quer voar com milhas? A gente faz um post sobre ela." },
  { id: "feriadoes-fim-2026", revisar: true, tema: "amarelo", foto: "clip-v-asa-3", kick: "Ainda dá tempo", capa: "Os feriadões que ainda faltam em 2026", sub: "E quanto tá a passagem saindo de Fortaleza. Manda pra quem vai contigo.", dir: "CALENDÁRIO", valido: "2026-10-30",
    ls: [["Os feriadões que faltam", [["Finados", "seg 2/11", "31/10 a 2/11"], ["Consciência Negra", "sex 20/11", "20 a 22/11"], ["Natal", "sex 25/12", "25 a 27/12"], ["Ano Novo", "sex 1/1", "1 a 3/1"]], "20 de novembro é feriado nacional desde 2024. 31/12 não é feriado: se a sua folga emendar, são 4 dias."],
      ["Menor preço que o radar viu", [["Recife", "20/11 · Azul", "R$ 442"], ["Curitiba", "7/11 · LATAM", "R$ 405"], ["São Paulo", "10/11 · Gol", "R$ 546"], ["Rio de Janeiro", "2/12 · LATAM", "R$ 519"], ["Salvador", "15/12 · LATAM", "R$ 548"]], "Só a ida, a partir de, na data indicada. Visto pelo radar em 13/10/2026. Preço muda a qualquer hora."]],
    tx: [
      ["Recife bem no feriadão", "O menor preço que o radar viu pra Recife é justamente pra 20/11, dia da Consciência Negra: R$ 442 a ida. Porto de Galinhas fica a cerca de 60 km de lá.", "20/11"],
      ["Fim de ano enche rápido", "Natal e Réveillon são as datas mais procuradas do ano. Quanto mais perto, mais caro: se vai viajar, decida agora.", "DICA"]],
    fim: ["Quer o guia completo com 2027?", "Comenta FERIADO que eu te mando no direct. E manda pra quem vai contigo."],
    leg: "🗓️ OS FERIADÕES QUE AINDA FALTAM EM 2026 (e quanto tá a passagem saindo de Fortaleza)\n\n▪️ Finados: 31/10 a 2/11\n▪️ Consciência Negra: 20 a 22/11\n▪️ Natal: 25 a 27/12\n▪️ Ano Novo: 1 a 3/1\n\n✈️ Menor preço que o radar viu (só a ida):\n▪️ Recife em 20/11: R$ 442\n▪️ Curitiba em 7/11: R$ 405\n▪️ São Paulo em 10/11: R$ 546\n▪️ Rio em 2/12: R$ 519\n▪️ Salvador em 15/12: R$ 548\n\n🕐 Preços vistos pelo radar em 13/10. Mudam a qualquer hora.\n\n💬 Comenta FERIADO que eu te mando no direct o guia completo (com os feriadões de 2027)\n💛 E manda pra quem vai contigo!" },
  { id: "viagem-a-dois", revisar: true, tema: "escuro", foto: "clip-v-praia-3", kick: "Pra ir a dois", capa: "Viagem a dois saindo de Fortaleza: quanto fica pra 2", sub: "Com os menores preços que o radar viu. Manda pro seu par.", dir: "A DOIS", valido: "2026-10-27",
    ls: [["Pertinho", [["Recife", "Porto de Galinhas", "R$ 1.628"], ["Rio de Janeiro", "praia e Cristo", "R$ 2.080"], ["Florianópolis", "praias e lagoa", "R$ 2.298"]], "Pra 2 pessoas, ida e volta, somando a ida e a volta mais baratas que o radar viu em 13/10 (as datas podem ser diferentes)."],
      ["Mais longe", [["Foz do Iguaçu", "Cataratas", "R$ 2.882"], ["Buenos Aires", "tango e vinho", "R$ 6.194"], ["Lisboa", "pastel de nata e Tejo", "R$ 7.946"]], "Mesma conta: a partir de, pra 2 pessoas, ida e volta. Preço muda a qualquer hora."]],
    tx: [
      ["Divide por dois", "Recife a dois sai por R$ 1.628 no total: R$ 814 por pessoa, ida e volta.", "R$ 814"],
      ["O segredo é a data", "Esses valores são das datas mais baratas do mês. Se a sua data é fixa, o preço pode ser outro: por isso vale ter o alerta ligado.", "DICA"]],
    fim: ["Quem você levaria?", "Manda esse post pra pessoa. Ela vai entender o recado."],
    leg: "💛 VIAGEM A DOIS SAINDO DE FORTALEZA: QUANTO FICA A PASSAGEM PRA 2\n\nIda e volta, pra 2 pessoas, com os menores preços que o radar viu:\n\n▪️ Recife (Porto de Galinhas): R$ 1.628\n▪️ Rio de Janeiro: R$ 2.080\n▪️ Florianópolis: R$ 2.298\n▪️ Foz do Iguaçu: R$ 2.882\n▪️ Buenos Aires: R$ 6.194\n▪️ Lisboa: R$ 7.946\n\n🕐 Soma da ida e da volta mais baratas vistas em 13/10 (as datas podem ser diferentes). Preço muda a qualquer hora.\n\n👉 Manda esse post pra pessoa. Ela vai entender o recado 😏\n🔔 Alerta grátis no grupo: link na bio" },
  { id: "feriadoes-2027", tema: "creme", foto: "calendario-2", kick: "Planeje agora", capa: "Os feriadões de 2027 pra quem é de Fortaleza", sub: "Tem um que só o Ceará tem. Salva antes que esqueça.", dir: "CALENDÁRIO",
    ls: [["1º semestre de 2027", [["Ano Novo", "sex 1/1", "1 a 3/1"], ["Carnaval", "seg e ter", "6 a 9/2"], ["São José", "sex 19/3 · Fortaleza", "19 a 21/3"], ["Data Magna + Paixão", "qui e sex · só no Ceará", "25 a 28/3"], ["Corpus Christi", "qui 27/5 · emendando a sex", "27 a 30/5"]], "Carnaval e Corpus Christi são ponto facultativo em muitos lugares: confira se você folga."],
      ["2º semestre de 2027", [["Independência", "ter 7/9 · emendando a seg", "4 a 7/9"], ["N. Sra. Aparecida", "ter 12/10 · emendando a seg", "9 a 12/10"], ["Finados", "ter 2/11 · emendando a seg", "30/10 a 2/11"], ["Proclamação", "seg 15/11", "13 a 15/11"]], "Feriados nacionais pelo calendário da ANBIMA. 19/3 é feriado em Fortaleza e 25/3 é feriado estadual do Ceará."]],
    tx: [
      ["O feriadão que só o Ceará tem", "25 de março (Data Magna do Ceará) cai numa quinta e emenda com a Sexta-feira da Paixão: 4 dias seguidos sem gastar férias.", "4 DIAS"],
      ["Esses caem no sábado", "Dia do Trabalho (1/5), Consciência Negra (20/11) e Natal (25/12) caem num sábado em 2027. Não dá pra contar com eles.", "SÁB"],
      ["Escolha agora, compre na baixa", "Perto do feriado a procura sobe e o preço acompanha. Escolha o feriadão agora e deixe o radar avisar quando a passagem cair.", "DICA"]],
    fim: ["Qual feriadão você já vai usar?", "Comenta aqui. E salva pra planejar 2027."],
    leg: "🗓️ OS FERIADÕES DE 2027 PRA QUEM É DE FORTALEZA\n\n1º semestre\n▪️ Ano Novo: 1 a 3/1\n▪️ Carnaval: 6 a 9/2\n▪️ São José (Fortaleza): 19 a 21/3\n▪️ Data Magna do Ceará + Sexta da Paixão: 25 a 28/3 (4 dias, só no Ceará!)\n▪️ Corpus Christi: 27 a 30/5 (emendando a sexta)\n\n2º semestre\n▪️ Independência: 4 a 7/9 (emendando a segunda)\n▪️ Aparecida: 9 a 12/10 (emendando a segunda)\n▪️ Finados: 30/10 a 2/11 (emendando a segunda)\n▪️ Proclamação da República: 13 a 15/11\n\n😬 Caem no sábado: 1/5, 20/11 e 25/12\n\nCarnaval e Corpus Christi são ponto facultativo em muitos lugares: confira se você folga.\n\n📌 Salva pra planejar e comenta qual feriadão você já vai usar!" },
  { id: "mapa-passagem-barata", tema: "escuro", foto: "capa-hu-mapa2", kick: "Radar Partiu 085", capa: "Até onde dá pra ir saindo de Fortaleza (e por quanto)", sub: "Os menores preços que o radar viu, por região.", dir: "DADOS", valido: "2026-10-20",
    ls: [["Brasil", [["Recife", "Azul", "R$ 428"], ["São Paulo", "LATAM", "R$ 547"], ["Rio de Janeiro", "Gol", "R$ 593"], ["Belo Horizonte", "Azul", "R$ 721"], ["Foz do Iguaçu", "Azul", "R$ 783"]], "O trecho, a partir de. Preços vistos pelo radar em 13/10/2026."],
      ["Exterior", [["Buenos Aires", "Gol", "R$ 1.272"], ["Lisboa", "Iberia", "R$ 1.668"], ["Londres", "TAP", "R$ 1.730"], ["Paris", "TAP", "R$ 1.950"], ["Miami", "LATAM", "R$ 2.499"]], "O trecho (só ida), a partir de. Preço de passagem muda a qualquer hora."]],
    tx: [
      ["Olhe sempre a volta", "Em Londres, a ida estava R$ 1.730, mas a volta mais barata saía R$ 4.842. Por isso o radar olha os dois lados antes de avisar.", "VOLTA"],
      ["Por que a gente mostra o trecho", "Comprar ida e volta separadas, em datas diferentes, muitas vezes sai mais barato. O radar procura cada lado.", "TRECHO"],
      ["Muda todo dia", "O radar vigia 54 destinos o dia todo. A partir de segunda, 19/10, você recebe as quedas no grupo grátis.", "19.10"]],
    fim: ["Pra onde você iria?", "Comenta o destino que a gente fica de olho."],
    leg: "🗺️ ATÉ ONDE DÁ PRA IR SAINDO DE FORTALEZA\n\nOs menores preços que o radar viu (o trecho, em 13/10):\n\n🇧🇷 Recife R$ 428 · São Paulo R$ 547 · Rio R$ 593 · BH R$ 721 · Foz do Iguaçu R$ 783\n\n🌎 Buenos Aires R$ 1.272 · Lisboa R$ 1.668 · Londres R$ 1.730 · Paris R$ 1.950 · Miami R$ 2.499\n\n⚠️ Olhe sempre a volta: em Londres a ida estava R$ 1.730, mas a volta mais barata saía R$ 4.842.\n\nPreço muda a qualquer hora. A partir de 19/10, as quedas chegam no grupo grátis 🔔\n\n💬 Pra onde você iria?" },
  { id: "natal-luz-2026", tema: "amarelo", foto: "capa-natal-luz", kick: "Natal Luz · Gramado", capa: "O Natal Luz de Gramado começa dia 22", sub: "88 dias de festa na Serra Gaúcha. Saindo de Fortaleza, dá pra ir.", dir: "EVENTO", valido: "2027-01-10",
    tx: [
      ["Quando", "De 22 de outubro de 2026 a 17 de janeiro de 2027. São 88 dias de programação.", "88"],
      ["Show de graça todo dia", "\"O Despertar das Luzes\": acendimento diário às 20h, em frente ao Palácio dos Festivais.", "20H"],
      ["4 milhões de luzes", "Ruas, praças e rótulas decoradas com cerca de 4 milhões de pontos de LED.", "LUZ"],
      ["Novidades de 2026", "Grande Desfile de Natal em estrutura coberta, show com figurinos de LED e concertos com a Orquestra Sinfônica de Gramado.", "NOVO"],
      ["Como chegar de Fortaleza", "Voe até Porto Alegre e siga pela Serra, de carro ou ônibus (cerca de 2 horas). O radar vigia FOR → Porto Alegre e avisa quando baratear.", "POA"]],
    fim: ["Natal com frio ou com praia?", "Comenta aqui. E marca quem iria com você."],
    leg: "🎄 O NATAL LUZ DE GRAMADO COMEÇA DIA 22\n\n📅 De 22/10/2026 a 17/01/2027 (88 dias)\n✨ Show gratuito \"O Despertar das Luzes\" todo dia às 20h, em frente ao Palácio dos Festivais\n💡 Cerca de 4 milhões de pontos de LED pela cidade\n🆕 Grande Desfile de Natal em estrutura coberta, show de LED e concertos com a Orquestra Sinfônica de Gramado\n\n✈️ Saindo de Fortaleza: voe até Porto Alegre e suba a Serra (cerca de 2h). O radar avisa quando a passagem pra Porto Alegre baratear 🔔\n\n💬 Natal com frio ou com praia?" },
  { id: "seguro-europa", tema: "creme", foto: "capa-hu-passaporte", kick: "Vai pra Europa?", capa: "Sem seguro viagem, a Europa pode barrar você", sub: "O que é exigido pra Portugal e o resto do Espaço Schengen.", dir: "ALERTA",
    tx: [
      ["É exigido", "Pra entrar no Espaço Schengen (Portugal, Espanha, França, Itália e outros), o seguro viagem é exigido e pode ser pedido na imigração.", "!"],
      ["Cobertura mínima", "Pelo menos 30 mil euros pra despesas médicas e hospitalares, valendo pela viagem inteira.", "€30 MIL"],
      ["Tem que cobrir também", "Repatriação médica e traslado de corpo. Leve a apólice impressa ou salva no celular.", "PDF"],
      ["E o ETIAS?", "A autorização eletrônica da Europa ainda não tem data confirmada pra começar (a previsão é 2027). A taxa será de 20 euros e vale 3 anos.", "ETIAS"],
      ["Antes de pagar", "Alguns cartões de crédito dão seguro viagem como benefício. Confira as condições e se a cobertura bate com a exigência.", "CARTÃO"]],
    fim: ["Tem viagem pra Europa marcada?", "Salva esse post e manda pra quem vai junto."],
    leg: "🇪🇺 SEM SEGURO VIAGEM, A EUROPA PODE BARRAR VOCÊ\n\n✅ É exigido pra entrar no Espaço Schengen (Portugal, Espanha, França, Itália e outros) e pode ser pedido na imigração\n💶 Cobertura mínima de 30 mil euros pra despesas médicas e hospitalares, valendo a viagem inteira\n🏥 Precisa cobrir repatriação médica e traslado de corpo\n📄 Leve a apólice impressa ou no celular\n\n🛂 E o ETIAS? Ainda sem data confirmada (previsão: 2027). Taxa de 20 euros, vale 3 anos.\n\n💳 Alguns cartões dão seguro viagem como benefício: confira se a cobertura bate com a exigência.\n\n📌 Salva e manda pra quem vai junto!" },
  { id: "black-friday-passagem", tema: "escuro", foto: "capa-hu-cartao", kick: "Black Friday · 27/11", capa: "Black Friday de passagem: 7 cuidados antes de comprar", sub: "Promoção de verdade existe. Cilada também.", dir: "GUIA", valido: "2026-11-30",
    tx: [
      ["Saiba o preço de antes", "Desconto só vale se o preço anterior era real. O radar guarda o histórico de cada rota saindo de Fortaleza.", "1"],
      ["Olhe o preço final", "Taxa de embarque, bagagem e marcação de assento entram na conta. Compare o total, não o preço da vitrine.", "2"],
      ["Tarifa light é sem mala", "A mais barata costuma ser só com mala de mão. Se vai despachar, compare com a tarifa que já inclui bagagem.", "3"],
      ["Só em site oficial", "Desconfie de link que chega por mensagem e de preço bom demais. Compre no site da companhia ou de agência conhecida.", "4"],
      ["Datas flexíveis rendem mais", "Mudar a ida um ou dois dias pode baixar bastante o preço. Olhe o calendário inteiro.", "5"],
      ["Parcelado com juros não é promoção", "Confira o valor total no parcelamento antes de fechar.", "6"],
      ["Você tem 24 horas", "Pela regra da ANAC, dá pra desistir sem custo em até 24h da compra, se ela for feita 7 dias ou mais antes do voo.", "24H"]],
    fim: ["A gente avisa as promoções de verdade", "Grupo grátis a partir de 19/10. Ativa o sininho."],
    leg: "🛒 BLACK FRIDAY DE PASSAGEM: 7 CUIDADOS (27/11)\n\n1️⃣ Saiba o preço de antes: desconto só vale se o preço anterior era real\n2️⃣ Olhe o preço final: taxa, bagagem e assento entram na conta\n3️⃣ Tarifa light costuma ser sem mala despachada\n4️⃣ Só em site oficial: desconfie de link por mensagem\n5️⃣ Datas flexíveis rendem mais\n6️⃣ Parcelado com juros não é promoção\n7️⃣ Você tem 24h pra desistir sem custo (regra da ANAC, se comprar 7 dias ou mais antes do voo)\n\n🔔 A gente avisa as promoções de verdade saindo de Fortaleza. Grupo grátis a partir de 19/10!" },
  { id: "dia-aviador", tema: "creme", foto: "capa-dia-aviador", kick: "23 de outubro", capa: "Hoje é Dia do Aviador", sub: "E tem tudo a ver com um brasileiro.", dir: "DATA", data: "2026-10-23",
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
    porque: (typeof FOTOS_APROV !== "undefined" && !FOTOS_APROV[x.foto] ? "⚠️ CAPA SEM FOTO APROVADA: troque antes de postar. " : "") + (x.data ? `Post de data: o ideal é sair no dia ${x.data.slice(8, 10)}/${x.data.slice(5, 7)}.` : x.valido ? "Notícia pesquisada: vale até a data marcada." : "Conteúdo pesquisado, com fonte. Carrossel que ensina é o que mais é salvo e compartilhado."),
    fmt: `Carrossel · ${n} telas`, telas, legenda: `${x.leg}\n\n✈️ Passagem barata saindo de Fortaleza: segue o @partiu.085\n\n${HASH}` };
}
function postsConteudo() { const h = hojeISO(); return CONTEUDO.filter(x => !x.valido || x.valido >= h).map(fConteudo); }

/* ===================== 📍 DESTINO DA SEMANA (premium) — feito com os dados do nosso radar ===================== */
const DIRETOS = { NAT: "≈ 1h", REC: "≈ 1h10", JPA: "≈ 1h05", SSA: "≈ 1h50", SLZ: "≈ 1h20", THE: "≈ 1h", BEL: "≈ 2h", MAO: "≈ 3h20", BSB: "≈ 2h40", SAO: "≈ 3h30", VCP: "≈ 3h30",
  RIO: "≈ 3h20", BHZ: "≈ 3h", JDO: "≈ 1h", GYN: "≈ 2h50", LIS: "≈ 7h10", PAR: "≈ 8h55", MAD: "≈ 8h30", BUE: "≈ 5h40", MVD: "≈ 5h40", ORL: "≈ 7h", MIA: "≈ 6h30" };
const DEST_EXTRA = {
  LIS: "Porta de entrada da Europa pra quem sai de Fortaleza: voo direto e idioma sem barreira.", PAR: "Voo direto da Air France: Fortaleza → Paris sem escala.", MAD: "Voo direto da Iberia, ótimo pra começar um mochilão pela Espanha.",
  BUE: "Câmbio a favor, carne, vinho e show de tango.", MVD: "Tranquila, charmosa e perto de Punta del Este.", ORL: "Parques, compras e voo direto saindo de Fortaleza.", MIA: "Praia, compras e conexão pra todo o Caribe.",
  SSA: "Pelourinho, praia e o melhor acarajé.", REC: "Porto de Galinhas e Carneiros a menos de 2h de carro.", NAT: "Dunas de Genipabu e praia de Pipa, pertinho.", RIO: "Cristo, Pão de Açúcar e praia na cidade.", SAO: "Gastronomia, shows e as melhores conexões do país.",
  FLN: "Mais de 40 praias numa ilha só.", POA: "Porta de entrada da Serra Gaúcha.", CWB: "Parques, frio e a Serra do Mar de trem.", SCL: "Neve na cordilheira e vinícolas do lado.", ROM: "História em cada esquina, com conexão saindo de Fortaleza.",
  MAO: "Encontro das águas e a floresta Amazônica.", BSB: "Arquitetura de Niemeyer e céu enorme.", BHZ: "Comida mineira, Inhotim e Ouro Preto perto.", SLZ: "Lençóis Maranhenses logo ali.", IGU: "As Cataratas, uma das maravilhas do mundo." };
async function fDestinoPremium(k) {
  const R = (S.status && S.status.rotas) || {}, r = R[k]; if (!r || !r.menor) return null;
  await carregarCal(k); const cal = S.cal[k];
  const nome = r.nome || (S.rotas.find(x => x.iata === k) || {}).nome || k, im = await fotoPronta(k), hoje = dataCurta(hojeISO()).toLowerCase();
  const pm = {}; ((cal && cal.ida) || []).forEach(d => { const m = d.dia.slice(0, 7); pm[m] = Math.min(d.preco, pm[m] || 1e9); });
  const ms = Object.entries(pm).sort().slice(0, 6), mn = ms.length ? Math.min(...ms.map(m => m[1])) : 0, mx = ms.length ? Math.max(...ms.map(m => m[1])) : 0;
  const datas = ((cal && cal.ida) || []).slice().sort((a, b) => a.preco - b.preco).slice(0, 5).sort((a, b) => a.dia.localeCompare(b.dia));
  const melhorM = r.melhor_mes ? MESES_LONGO[+r.melhor_mes.slice(5, 7) - 1] : ms.length ? MESES_LONGO[+ms.find(m => m[1] === mn)[0].slice(5, 7) - 1] : "";
  const econ = r.mediana && r.menor < r.mediana ? Math.round((1 - r.menor / r.mediana) * 100) : 0, dir = DIRETOS[k], extra = DEST_EXTRA[k] || "";
  const telas = [];
  telas.push(c => { c.fillStyle = COR.navy; c.fillRect(0, 0, PW, PH); if (im) cobrir(c, im, 0, 0, PW, PH);
    let g = c.createLinearGradient(0, 0, 0, 320); g.addColorStop(0, "rgba(8,22,40,.65)"); g.addColorStop(1, "rgba(8,22,40,0)"); c.fillStyle = g; c.fillRect(0, 0, PW, 320);
    g = c.createLinearGradient(0, PH * .38, 0, PH); g.addColorStop(0, "rgba(11,36,64,0)"); g.addColorStop(.55, "rgba(11,36,64,.9)"); g.addColorStop(1, COR.navy); c.fillStyle = g; c.fillRect(0, 0, PW, PH);
    marca(c, PW, true, "DESTINO DA SEMANA");
    let y = PH - 560; kicker(c, "Saindo de Fortaleza", M, y, COR.am);
    y = titulo(c, nome, M, y + 30, PW - 2 * M, 190, 100, "#fff", 2) + 30;
    const t = `A PARTIR DE ${brl(r.menor)} (IDA)`; c.font = `400 54px ${MARCA.titulo}`; const w = c.measureText(t).width + 60; c.fillStyle = COR.am; rr(c, M, y, w, 84, 42); c.fill(); T(c, t, M + 30, y + 62, 54, MARCA.titulo, COR.tinta, "left", 400, 1);
    T(c, dir ? `✈️ Voo direto ${dir}` : "✈️ Com conexão", M, y + 150, 34, MARCA.corpo, "#fff", "left", 800);
    T(c, "ARRASTA ➜", PW - M, PH - 80, 26, MARCA.corpo, COR.am, "right", 800, 3); });
  telas.push(c => { bgCreme(c, PW, PH); marca(c, PW, false, "RAIO-X");
    titulo(c, `${nome} em números`, M, 200, PW - 2 * M, 104, 64, COR.tinta, 2);
    const tiles = [["Menor preço (ida)", brl(r.menor)], ["Volta a partir de", r.menor_volta ? brl(r.menor_volta) : "—"], ["Melhor mês", melhorM || "—"], [dir ? "Voo direto" : "Voo", dir || "Com conexão"], r.cia ? ["Mais barata agora", r.cia] : null, [r.tipo === "internacional" ? "Tipo" : "Tipo", r.tipo === "internacional" ? "Internacional" : "Nacional"]].filter(Boolean).slice(0, 6);
    const cw = (PW - 2 * M - 24) / 2, ch = 230; tiles.forEach(([l, v], i) => { const x = M + (i % 2) * (cw + 24), yy = 420 + Math.floor(i / 2) * (ch + 24);
      c.fillStyle = "#fff"; rr(c, x, yy, cw, ch, 28); c.fill(); T(c, l.toUpperCase(), x + 30, yy + 60, 24, MARCA.corpo, "rgba(15,42,71,.6)", "left", 800, 2);
      T(c, v, x + 30, yy + 160, caber(c, v, cw - 60, 76, MARCA.titulo, 400, 36), MARCA.titulo, i === 0 ? "#C9971C" : COR.tinta); });
    T(c, `Dados do radar Partiu 085 · ${hoje}`, M, PH - 170, 22, MARCA.corpo, "rgba(15,42,71,.55)", "left", 600); rodapeP(c, PW, PH, false, "Salva pra planejar"); });
  if (ms.length >= 3) telas.push(c => { bgNavy(c, PW, PH); marca(c, PW, true, "MÊS A MÊS"); kicker(c, "Menor preço de ida por mês", M, 300, COR.am);
    titulo(c, "Quando é mais barato ir", M, 330, PW - 2 * M, 100, 64, "#fff", 2); let y = 560;
    ms.forEach(([m, p]) => { const best = p === mn, w = 140 + (p / mx) * (PW - 2 * M - 200 - 380);
      T(c, MESES[+m.slice(5, 7) - 1].toUpperCase(), M, y + 50, 40, MARCA.titulo, best ? COR.am : "#fff");
      c.fillStyle = best ? COR.am : "rgba(255,255,255,.16)"; rr(c, M + 200, y + 12, w, 52, 26); c.fill();
      T(c, brl(p), M + 200 + w + 20, y + 52, 40, MARCA.titulo, best ? COR.am : "#fff"); y += 92; });
    rodapeP(c, PW, PH, true, "Preços mudam a toda hora"); });
  if (datas.length >= 3) telas.push(c => { TEMA.amarelo.bg(c, PW, PH); marca(c, PW, false, "DATAS"); kicker(c, "As mais baratas agora", M, 300, COR.tinta);
    titulo(c, "Se for, vá nessas datas", M, 330, PW - 2 * M, 100, 64, COR.tinta, 2); let y = 560;
    datas.forEach((d, i) => { c.fillStyle = "rgba(255,255,255,.55)"; rr(c, M, y, PW - 2 * M, 100, 24); c.fill();
      T(c, `${d.dia.slice(8, 10)}/${d.dia.slice(5, 7)}`, M + 30, y + 66, 52, MARCA.titulo, COR.tinta);
      T(c, ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"][new Date(d.dia + "T12:00:00Z").getUTCDay()], M + 230, y + 62, 32, MARCA.corpo, "rgba(15,42,71,.7)", "left", 700);
      T(c, brl(d.preco), PW - M - 30, y + 66, 52, MARCA.titulo, COR.tinta, "right"); y += 118; });
    rodapeP(c, PW, PH, false, "Só ida · preço do dia"); });
  if (extra) telas.push(c => capaTema(c, "escuro", "Por que ir", extra, `Melhor época pelo radar: ${melhorM || "fique de olho no grupo"}.`, "DICA", "Salva e manda pra quem vai com você"));
  telas.push(c => capaTema(c, "amarelo", "Quer ir pra " + nome + "?", "Comenta EU QUERO que eu te mando os alertas", "Todo dia tem passagem barata saindo de Fortaleza. Marca quem vai com você 👇", "", "Siga @partiu.085 · ative o sininho 🔔"));
  return { id: "f-destpremium-" + k + "-" + hojeISO(), grupo: "feed", tipo: "Destino da semana", rot: "📍 Destino", titulo: `📍 Destino: ${nome}`, valido: diaMenos(hojeISO(), -2),
    porque: "Carrossel premium com dados do nosso radar (preço, melhor mês, datas). Conteúdo que só a gente tem: muito salvo e compartilhado.", fmt: `Carrossel · ${telas.length} telas`, telas,
    legenda: `📍 DESTINO DA SEMANA: ${nome.toUpperCase()}, SAINDO DE FORTALEZA\n\n💰 Ida a partir de ${brl(r.menor)}${r.menor_volta ? ` · volta a partir de ${brl(r.menor_volta)}` : ""}\n✈️ ${dir ? `Voo direto, ${dir}` : "Com conexão"}\n📅 Melhor mês: ${melhorM || "—"}${extra ? `\n\n${extra}` : ""}\n\n${datas.length ? `🗓️ Datas mais baratas agora: ${datas.map(d => `${d.dia.slice(8, 10)}/${d.dia.slice(5, 7)}`).join(", ")}\n\n` : ""}⚠️ Preços de ${hoje}, mudam a qualquer momento.\n💬 Comenta EU QUERO que eu te mando os alertas de ${nome} no direct!\n👇 Marca quem vai com você.\n\n${HASH}` };
}
async function postsConteudoTudo() {
  const R = (S.status && S.status.rotas) || {}, ks = Object.keys(R).filter(k => R[k].menor && (R[k].ofertas || 0) >= 10);
  PA.destOpcoes = ks.sort((a, b) => (R[a].nome || a).localeCompare(R[b].nome || b));
  if (!PA.dest || !R[PA.dest]) { const sem = Math.floor(nDia() / 7), pref = DESTINOS_PAUTA.filter(k => ks.includes(k)); PA.dest = pref.length ? pref[sem % pref.length] : ks[0]; }
  const d = PA.dest ? await fDestinoPremium(PA.dest) : null;
  return [d, ...postsConteudo()].filter(Boolean);
}
document.addEventListener("change", e => { if (e.target.id !== "pa-dest") return; PA.dest = e.target.value; render(); });
