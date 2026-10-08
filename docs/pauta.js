/* Partiu 085 — Pauta do dia (Instagram): opções de post prontas, feitas com os dados do radar
   (promoções de milhas lidas dos blogs, preços saindo de Fortaleza, alertas da semana) + campanha de lançamento.
   Usa a identidade do Criar arte (MARCA, TEMAS, fundo, titulos, bloco, pil, cta, desenhaImg). */
"use strict";
const PA = { aba: "hoje", feitos: {} };
const PW = 1080, PH = 1350, SW = 1080, SH = 1920;
const HASH = "#fortaleza #ceara #passagensbaratas #promocaodepassagem #milhas #viagem #partiu085";

/* ---------- biblioteca de conteúdo educativo (sem dado inventado: só conceito) */
const EDU = [
  { id: "milhas-pontos", capa: ["MILHAS", "ou", "PONTOS?"], sub: "a diferença que muda o jeito de viajar", slides: [
    ["PONTOS", "São os do cartão de crédito e de programas como Livelo e Esfera. Sozinhos, eles não viram passagem."],
    ["MILHAS", "São dos programas das companhias: Smiles (GOL), LATAM Pass e Azul Fidelidade. É com elas que você emite a passagem."],
    ["O PULO DO GATO", "Você transfere os pontos pro programa de milhas. Quando tem promoção de bônus, cada ponto vira mais de uma milha."]] },
  { id: "bonificada", capa: ["TRANSFERÊNCIA", "bonificada", "COMO FUNCIONA"], sub: "o jeito mais barato de juntar milhas", slides: [
    ["1. JUNTE PONTOS", "Cartão de crédito, Livelo, Esfera… os pontos ficam parados lá esperando."],
    ["2. ESPERE O BÔNUS", "De tempos em tempos os programas dão bônus na transferência: 50%, 80%, até 100% ou mais."],
    ["3. TRANSFIRA", "Com 100% de bônus, 10.000 pontos viram 20.000 milhas. A gente avisa aqui quando aparece."]] },
  { id: "erros", capa: ["5 ERROS", "que fazem você", "PAGAR CARO"], sub: "na passagem saindo de Fortaleza", slides: [
    ["1. COMPRAR EM CIMA DA HORA", "Perto da data, o preço costuma subir. Promoção boa aparece com antecedência."],
    ["2. OLHAR SÓ UMA DATA", "Mudar um ou dois dias pode cortar o preço pela metade. Compare o calendário."],
    ["3. NÃO SEPARAR IDA E VOLTA", "Às vezes a ida está barata numa companhia e a volta em outra."],
    ["4. DEMORAR PRA DECIDIR", "Preço de promoção dura horas. Quem tem alerta ligado sai na frente."],
    ["5. NÃO TER ALERTA", "O radar do Partiu 085 olha os preços o dia todo e te avisa no grupo grátis."]] },
  { id: "trecho", capa: ["TRECHO", "ou", "IDA E VOLTA?"], sub: "por que a gente mostra os dois", slides: [
    ["TRECHO", "É o preço de um lado só: só a ida ou só a volta."],
    ["IDA E VOLTA", "É a soma dos dois. É ele que diz se a viagem está barata de verdade."],
    ["NO PARTIU 085", "Todo alerta mostra o trecho e a ida e volta, pra você não cair em preço que parece barato e não é."]] },
  { id: "alerta", capa: ["COMO", "aproveitar", "UM ALERTA"], sub: "em 3 passos", slides: [
    ["1. ATIVE A NOTIFICAÇÃO", "Promoção boa some rápido. Deixe o grupo com notificação ligada."],
    ["2. CONFIRA AS DATAS", "O alerta traz os dias mais baratos de ida e de volta. Escolha os que encaixam."],
    ["3. COMPRE NO SITE DA CIA", "Pesquise as datas e compre direto. O preço pode mudar a qualquer momento."]] },
  { id: "aeroporto", capa: ["CHECKLIST", "antes de ir pro", "AEROPORTO"], sub: "salva pra não esquecer", slides: [
    ["DOCUMENTO", "RG ou CNH dentro da validade. Viagem internacional: passaporte e o que o destino pedir."],
    ["CHECK-IN ONLINE", "Faça pelo app da companhia e já deixe o cartão de embarque no celular."],
    ["CHEGUE COM FOLGA", "As companhias costumam recomendar chegar 2h antes em voo nacional e 3h antes no internacional."]] },
  { id: "clube", capa: ["CLUBE DE", "milhas", "VALE A PENA?"], sub: "faça essa conta antes de assinar", slides: [
    ["O QUE É", "Você paga um valor por mês e recebe milhas todo mês, além de vantagens no programa."],
    ["QUANDO VALE", "Se você viaja e usa as milhas com frequência, e aproveita as promoções exclusivas de quem é assinante."],
    ["QUANDO NÃO VALE", "Se as milhas ficam paradas e vencem. Milha boa é milha usada."]] },
  { id: "tarifa", capa: ["TARIFA", "light", "O QUE É?"], sub: "a mais barata nem sempre é a melhor", slides: [
    ["TARIFA LIGHT", "Geralmente é a mais barata e não inclui bagagem despachada. Cada companhia tem suas regras."],
    ["FAÇA A CONTA", "Se for despachar mala, some o preço da bagagem e compare com a tarifa seguinte."],
    ["NOS ALERTAS", "O preço que a gente mostra é a tarifa mais barata encontrada. Confira o que ela inclui na hora de comprar."]] },
];
const DESTINOS_PAUTA = ["SAO", "LIS", "RIO", "REC", "BUE", "SSA", "SCL", "BSB", "MIA", "POA", "ORL", "CWB", "MAD", "NAT", "PAR", "FLN"];

/* ---------- utilidades */
const nDia = () => Math.floor(Date.now() / 864e5);
const dmCurto = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
function legenda(corpo) { return `${corpo}\n\n🔔 Grupo GRÁTIS de alertas de passagem saindo de Fortaleza: link na bio\n📲 ${linkGrupo()}\n\n${HASH}`; }
function topo(c, W, t, etiqueta) {
  c.save();
  const ico = img("icone");
  c.beginPath(); c.arc(100, 96, 44, 0, 7); c.fillStyle = MARCA.amarelo; c.fill();
  if (ico.complete && ico.naturalWidth) { c.beginPath(); c.arc(100, 96, 39, 0, 7); c.clip(); c.drawImage(ico, 61, 57, 78, 78); }
  c.restore();
  tx(c, "PARTIU 085", 160, 96, 40, MARCA.titulo, t.ink); tx(c, "@partiu.085", 162, 126, 21, MARCA.corpo, t.sub, "left", 700);
  if (etiqueta) { const w = larg(c, etiqueta, 24, MARCA.corpo, 800) + 52; c.fillStyle = t.acc; rr(c, W - 70 - w, 70, w, 52, 26); c.fill(); tx(c, etiqueta, W - 70 - w / 2, 105, 24, MARCA.corpo, t.accInk, "center", 800); }
}
function rodape(c, W, H, t, texto) { cta(c, W, H, t, texto || "Alertas grátis saindo de Fortaleza · link na bio"); }
function cartao(c, x, y, w, h, t) { c.save(); c.shadowColor = "rgba(0,0,0,.18)"; c.shadowBlur = 28; c.fillStyle = t.card; rr(c, x, y, w, h, 36); c.fill(); c.restore(); }
function curto(t, n = 70) { t = String(t || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1).replace(/[\s,.;:-]+\S*$/, "") + "…" : t; }

/* ---------- geradores: cada um devolve {id, tipo, titulo, porque, fmt, telas:[fn(c)], legenda} ou null */
function promosMilhas() {
  const lim = diaMenos(hojeISO(), 2);
  return ((S.mi && S.mi.ofertas) || []).filter(o => !o.busca_propria && o.ativa !== false && ["bonus", "compra", "clube"].includes(o.tipo) && (o.publicado || "").slice(0, 10) >= lim)
    .sort((a, b) => (b.tipo === "bonus") - (a.tipo === "bonus") || (b.pct || 0) - (a.pct || 0));
}
function selo(o) { return o.tipo === "bonus" ? (o.pct ? `${o.pct}%` : "BÔNUS") : o.tipo === "compra" ? (o.pct ? `${o.pct}% OFF` : "COMPRA") : "CLUBE"; }
function gRadarMilhas() {
  const L = promosMilhas().slice(0, 4); if (L.length < 2) return null;
  const t = TEMAS.noite;
  return { id: "milhas-" + hojeISO(), tipo: "Milhas", titulo: "Radar de milhas de hoje", porque: "Notícia do dia: quem junta milhas salva e compartilha. É o tipo de post que traz seguidor novo.", fmt: "Feed 4:5",
    telas: [c => { fundo(c, PW, PH, t); topo(c, PW, t, dmCurto(hojeISO()));
      let y = titulos(c, PW, 250, t, "RADAR DE MILHAS", "o que tá rolando hoje", null) + 40;
      L.forEach(o => { cartao(c, 80, y, PW - 160, 150, t);
        const s = selo(o), fs = caber(c, s, 220, 60, MARCA.titulo);
        c.fillStyle = MARCA.amarelo; rr(c, 100, y + 20, 250, 110, 24); c.fill(); tx(c, s, 225, y + 75 + fs * .36, fs, MARCA.titulo, MARCA.navy, "center");
        bloco(c, curto(o.titulo, 90), 380, y + 60, PW - 160 - 330, 29, MARCA.corpo, t.cardInk, "left", 700, 1.25, 3); y += 168; });
      tx(c, "Confira as regras no site de cada programa.", PW / 2, Math.min(y + 24, PH - 200), 24, MARCA.corpo, t.sub, "center", 600);
      rodape(c, PW, PH, t); }],
    legenda: legenda(`✈️ RADAR DE MILHAS · ${dmCurto(hojeISO())}\n\nO que tá rolando hoje no mundo das milhas:\n\n${L.map(o => `🔸 ${o.titulo}`).join("\n")}\n\nAs regras mudam de programa pra programa, então confira tudo no site antes de transferir ou comprar.\n\n💬 Comenta "QUERO" que eu te explico como aproveitar.`) };
}
function gBonus() {
  const o = promosMilhas().filter(x => x.tipo === "bonus" && x.pct).sort((a, b) => b.pct - a.pct)[0]; if (!o) return null;
  const t = TEMAS.amarelo, de = o.de || "", para = o.para || "", ex = 10000, ganho = Math.round(ex * (1 + o.pct / 100));
  return { id: "bonus-" + o.id, tipo: "Milhas", titulo: `Bônus de ${o.pct}% em destaque`, porque: "Número grande e simples chama atenção no feed e gera compartilhamento.", fmt: "Feed 4:5",
    telas: [c => { fundo(c, PW, PH, t); topo(c, PW, t, "TRANSFERÊNCIA BONIFICADA");
      tx(c, "ATÉ", PW / 2, 330, 90, MARCA.titulo, t.ink, "center");
      const s = `${o.pct}%`; tx(c, s, PW / 2, 600, caber(c, s, PW - 200, 300, MARCA.titulo), MARCA.titulo, MARCA.navy, "center");
      tx(c, "DE BÔNUS", PW / 2, 700, 96, MARCA.titulo, t.ink, "center");
      const rt = [de, para].filter(Boolean).join("  ➜  ") || curto(o.titulo, 40);
      pil(c, rt, PW / 2, 750, 34, MARCA.navy, "#fff", 36, 84, MARCA.corpo, 800, "center");
      cartao(c, 110, 880, PW - 220, 220, { card: "#fff" });
      tx(c, "NA PRÁTICA", PW / 2, 945, 28, MARCA.corpo, MARCA.navy, "center", 800);
      tx(c, `${milN(ex)} pontos ➜ até ${milN(ganho)} milhas`, PW / 2, 1020, caber(c, `${milN(ex)} pontos ➜ até ${milN(ganho)} milhas`, PW - 300, 54, MARCA.titulo), MARCA.titulo, MARCA.navy, "center");
      tx(c, "Confira regras e prazo no site do programa", PW / 2, 1072, 22, MARCA.corpo, "rgba(23,58,94,.7)", "center", 600);
      rodape(c, PW, PH, t); }],
    legenda: legenda(`🚨 ATÉ ${o.pct}% DE BÔNUS${de || para ? ` · ${[de, para].filter(Boolean).join(" ➜ ")}` : ""}\n\n${o.titulo}\n\nNa prática: com ${o.pct}% de bônus, ${milN(ex)} pontos podem virar até ${milN(ganho)} milhas. Bônus assim é a forma mais barata de juntar milhas pra viajar.\n\n⚠️ Cada promoção tem regra e prazo: confira no site do programa antes de transferir.`) };
}
function gTop5() {
  const L = typeof top5 === "function" ? top5() : []; if (L.length < 3) return null;
  const t = TEMAS.noite;
  return { id: "top5-ig-" + hojeISO(), tipo: "Passagens", titulo: "Top 5 saindo de Fortaleza", porque: "Conteúdo útil e local: o seguidor salva e manda pro amigo. Só a gente tem esses dados de Fortaleza.", fmt: "Feed 4:5",
    telas: [c => { fundo(c, PW, PH, t); topo(c, PW, t, dmCurto(hojeISO()));
      let y = titulos(c, PW, 240, t, "TOP 5 DO DIA", "saindo de Fortaleza", null) + 20;
      L.forEach((x, i) => { cartao(c, 80, y, PW - 160, 140, t);
        c.fillStyle = MARCA.amarelo; c.beginPath(); c.arc(150, y + 70, 40, 0, 7); c.fill(); tx(c, String(i + 1), 150, y + 91, 56, MARCA.titulo, MARCA.navy, "center");
        const nm = x.nome.toUpperCase(); tx(c, nm, 215, y + 78, caber(c, nm, 430, 52, MARCA.titulo), MARCA.titulo, MARCA.navy);
        tx(c, x.mes ? `melhor em ${MESES[+x.mes - 1].toLowerCase()}` : "", 217, y + 112, 24, MARCA.corpo, "rgba(23,58,94,.65)", "left", 600);
        tx(c, brl(x.rt), PW - 110, y + 82, 52, MARCA.titulo, MARCA.navy, "right"); tx(c, "ida e volta", PW - 110, y + 112, 22, MARCA.corpo, "rgba(23,58,94,.65)", "right", 700);
        y += 153; });
      rodape(c, PW, PH, t); }],
    legenda: legenda(`🏆 TOP 5 DO DIA · saindo de Fortaleza (${dmCurto(hojeISO())})\n\nOs destinos mais abaixo do preço normal hoje, no nosso radar:\n\n${L.map((x, i) => `${i + 1}. ${x.nome}: ida e volta a partir de ${brl(x.rt)}${x.mes ? ` (${MESES[+x.mes - 1].toLowerCase()})` : ""}`).join("\n")}\n\n⚠️ Preços de hoje, podem mudar a qualquer momento.\n💬 Qual desses você iria? Comenta aqui!`) };
}
async function gQuantoCusta() {
  const ks = DESTINOS_PAUTA.filter(k => (S.status.rotas || {})[k]); if (!ks.length) return null;
  const k = ks[nDia() % ks.length]; await carregarCal(k); const cal = S.cal[k]; if (!cal || !cal.ida || !cal.ida.length) return null;
  const pm = {}; cal.ida.forEach(d => { const m = d.dia.slice(0, 7); pm[m] = Math.min(d.preco, pm[m] || 1e9); });
  const ms = Object.entries(pm).sort().slice(0, 4); if (ms.length < 2) return null;
  const nome = (S.rotas.find(r => r.iata === k) || {}).nome || IATA[k] || k, mn = Math.min(...ms.map(m => m[1])), mx = Math.max(...ms.map(m => m[1])), melhor = ms.find(m => m[1] === mn)[0];
  const t = TEMAS.azul;
  return { id: "quanto-" + k + "-" + hojeISO(), tipo: "Passagens", titulo: `Quanto custa voar pra ${nome}`, porque: "Responde uma dúvida real (\"quando é mais barato?\") com dado nosso. Bom pra salvar.", fmt: "Feed 4:5",
    telas: [c => { fundo(c, PW, PH, t); topo(c, PW, t, "DADOS DO RADAR");
      let y = titulos(c, PW, 250, t, "QUANTO CUSTA VOAR", "de Fortaleza pra", nome.toUpperCase()) + 50;
      ms.forEach(([m, p]) => { const w = 200 + (p / mx) * (PW - 520), best = p === mn;
        tx(c, `${MESES[+m.slice(5, 7) - 1].toUpperCase()}`, 90, y + 58, 40, MARCA.titulo, t.ink);
        c.fillStyle = best ? MARCA.amarelo : "rgba(255,255,255,.22)"; rr(c, 300, y + 10, w, 66, 33); c.fill();
        tx(c, brl(p), 300 + w - 24, y + 56, 36, MARCA.titulo, best ? MARCA.navy : "#fff", "right"); y += 100; });
      y += 20; pil(c, `Melhor mês: ${MESES[+melhor.slice(5, 7) - 1].toLowerCase()}`, PW / 2, y, 30, MARCA.amarelo, MARCA.navy, 32, 76, MARCA.corpo, 800, "center");
      tx(c, `Menor preço do trecho (só ida) achado pelo radar em ${dmCurto(hojeISO())}`, PW / 2, y + 130, 22, MARCA.corpo, t.sub, "center", 600);
      rodape(c, PW, PH, t); }],
    legenda: legenda(`📅 QUANTO CUSTA VOAR DE FORTALEZA PRA ${nome.toUpperCase()}?\n\nO menor preço do trecho (só ida) que o nosso radar achou pra cada mês:\n\n${ms.map(([m, p]) => `${p === mn ? "⭐" : "▫️"} ${MESES[+m.slice(5, 7) - 1]}: a partir de ${brl(p)}`).join("\n")}\n\nO mais barato agora é ${MESES[+melhor.slice(5, 7) - 1].toLowerCase()}.\n⚠️ Preços de ${dmCurto(hojeISO())}, mudam a qualquer momento.\n\n💬 Quer que a gente faça de outro destino? Comenta aqui!`) };
}
function gEducativo(x) {
  x = x || EDU[nDia() % EDU.length];
  const T = [TEMAS.noite, TEMAS.amarelo], n = x.slides.length;
  const telas = [c => { const t = TEMAS.noite; fundo(c, PW, PH, t); topo(c, PW, t, "ARRASTA ➜");
    let y = titulos(c, PW, 430, t, x.capa[0], x.capa[1], x.capa[2]) + 40; bloco(c, x.sub, PW / 2, y + 20, PW - 240, 36, MARCA.corpo, t.sub, "center", 700, 1.3, 2);
    desenhaImg(c, "mascote", PW / 2, PH - 520, 330); }];
  x.slides.forEach(([h, txt], i) => telas.push(c => { const t = T[(i + 1) % 2]; fundo(c, PW, PH, t); topo(c, PW, t, `${i + 2}/${n + 2}`);
    cartao(c, 80, 240, PW - 160, 900, t);
    const hs = caber(c, h, PW - 240, 96, MARCA.titulo, 400, 60);
    const yh = bloco(c, h, PW / 2, 420, PW - 240, hs, MARCA.titulo, t.cardInk, "center", 400, 1.05, 2);
    c.fillStyle = MARCA.amarelo; rr(c, PW / 2 - 60, yh + 50, 120, 10, 5); c.fill();
    bloco(c, txt, PW / 2, yh + 150, PW - 280, 50, MARCA.corpo, t.cardInk, "center", 700, 1.4, 7);
    desenhaImg(c, "icone", PW / 2, 1180, 110); }));
  telas.push(c => { const t = TEMAS.amarelo; fundo(c, PW, PH, t); topo(c, PW, t, "");
    let y = titulos(c, PW, 360, t, "GOSTOU?", "salva e manda pra quem vai viajar", null) + 40; desenhaImg(c, "mascote", PW / 2, y, 360);
    rodape(c, PW, PH, t, "Siga @partiu.085 · alertas grátis na bio"); });
  return { id: "edu-" + x.id, tipo: "Educativo", titulo: `Carrossel: ${x.capa.join(" ").toLowerCase()}`, porque: "Carrossel educativo é o que mais é salvo e compartilhado. Traz seguidor que ainda não conhece milhas.", fmt: `Carrossel · ${telas.length} telas`, telas,
    legenda: legenda(`${x.capa.join(" ").toUpperCase()} ✈️\n\n${x.slides.map(([h, t]) => `▪️ ${h}: ${t}`).join("\n\n")}\n\n📌 Salva esse post pra consultar depois.`) };
}
function gProva() {
  const lim = diaMenos(hojeISO(), 6);
  const vistos = new Set(), L = S.alertas.filter(a => a.criado.slice(0, 10) >= lim && (typeof ivBarato !== "function" || ivBarato(a))).sort((a, b) => b.desconto - a.desconto)
    .filter(a => !vistos.has(a.destino) && vistos.add(a.destino)).slice(0, 5);
  if (L.length < 3) return null;
  const t = TEMAS.azul;
  return { id: "prova-" + hojeISO(), tipo: "Prova", titulo: "O que o radar achou essa semana", porque: "Mostra que o grupo funciona: é o post que mais converte seguidor em membro do grupo.", fmt: "Feed 4:5",
    telas: [c => { fundo(c, PW, PH, t); topo(c, PW, t, "ÚLTIMOS 7 DIAS");
      let y = titulos(c, PW, 240, t, "O RADAR ACHOU", "essa semana no grupo", null) + 20;
      L.forEach(a => { cartao(c, 80, y, PW - 160, 140, t);
        const nm = a.destino_nome.toUpperCase(); tx(c, nm, 116, y + 70, caber(c, nm, 440, 50, MARCA.titulo), MARCA.titulo, MARCA.navy);
        tx(c, `${nomeCia(a.cia_nome)} · ${dmCurto(a.criado.slice(0, 10))}`, 118, y + 110, 22, MARCA.corpo, "rgba(23,58,94,.65)", "left", 600);
        tx(c, brl(a.preco), PW - 110, y + 74, 52, MARCA.titulo, MARCA.navy, "right"); tx(c, a.preco_volta ? `ida e volta ${brl(a.preco + a.preco_volta)}` : "o trecho", PW - 110, y + 110, 22, MARCA.corpo, "rgba(23,58,94,.65)", "right", 700);
        y += 150; });
      rodape(c, PW, PH, t, "Entre no grupo grátis · link na bio"); }],
    legenda: legenda(`🔔 O QUE O RADAR ACHOU ESSA SEMANA\n\nAlguns dos alertas que mandamos no grupo, saindo de Fortaleza:\n\n${L.map(a => `✈️ ${a.destino_nome}: ${brl(a.preco)} o trecho${a.preco_volta ? ` · ida e volta ${brl(a.preco + a.preco_volta)}` : ""}`).join("\n")}\n\nQuem estava no grupo viu primeiro. Os preços eram do dia do alerta e podem ter mudado.`) };
}
function gChamada() {
  const t = TEMAS.amarelo;
  return { id: "chamada-" + hojeISO(), tipo: "Stories", titulo: "Chamada pro grupo grátis", porque: "Story diário com link: é o que transforma seguidor em membro do grupo.", fmt: "Stories 9:16", stories: true,
    telas: [c => { fundo(c, SW, SH, t); topo(c, SW, t, "GRÁTIS");
      let y = titulos(c, SW, 420, t, "PASSAGEM BARATA", "saindo de Fortaleza", "NO SEU WHATSAPP") + 60;
      desenhaImg(c, "mascote", SW / 2, y, 440); y += 520;
      ["Alertas todo dia", "Preço de ida e volta", "Datas mais baratas", "Promoções de milhas"].forEach(it => { pil(c, "✓  " + it, SW / 2, y, 34, MARCA.navy, "#fff", 40, 86, MARCA.corpo, 800, "center"); y += 110; });
      cta(c, SW, SH, t, "Toque no link e entre no grupo"); }],
    legenda: `Texto pro story (coloque o adesivo de LINK com: ${linkGrupo()})\n\n"Grupo GRÁTIS de alertas de passagem saindo de Fortaleza 👇"` };
}

/* ---------- campanha de lançamento: 9 posts na ordem do grid */
function campanha() {
  const t1 = TEMAS.noite, t2 = TEMAS.amarelo, t3 = TEMAS.azul;
  const simples = (id, titulo, porque, desenhar, leg) => ({ id: "camp-" + id, tipo: "Lançamento", titulo, porque, fmt: "Feed 4:5", telas: [desenhar], legenda: legenda(leg) });
  const L = [
    simples("chegou", "1. Chegou o Partiu 085", "Apresenta a marca e o que ela faz.", c => { fundo(c, PW, PH, t1); topo(c, PW, t1, "NOVIDADE");
      let y = titulos(c, PW, 330, t1, "CHEGOU O RADAR", "de passagens de Fortaleza", null) + 30; desenhaImg(c, "logo", PW / 2, y, 560);
      bloco(c, "A gente olha os preços saindo de Fortaleza o dia todo e te avisa quando aparece passagem barata.", PW / 2, PH - 360, PW - 220, 34, MARCA.corpo, t1.sub, "center", 700, 1.35, 3); rodape(c, PW, PH, t1, "Siga @partiu.085 e ative as notificações"); },
      "✈️ CHEGOU O PARTIU 085!\n\nUm radar de passagens feito pra quem sai de Fortaleza. A gente pesquisa os preços o dia todo, compara com o preço normal de cada rota e avisa quando aparece promoção de verdade.\n\nAqui no perfil: dicas, promoções de milhas e os destinos mais baratos da semana.\nNo grupo grátis: os alertas na hora."),
    simples("como", "2. Como funciona o radar", "Explica o processo em 3 passos e dá credibilidade.", c => { fundo(c, PW, PH, t3); topo(c, PW, t3, "COMO FUNCIONA");
      let y = titulos(c, PW, 270, t3, "COMO O RADAR", "trabalha por você", null) + 40;
      [["PESQUISA", "Olha os preços saindo de Fortaleza pra dezenas de destinos, várias vezes por dia."], ["COMPARA", "Vê se o preço está abaixo do normal daquela rota, na ida e na volta."], ["AVISA", "Quando é promoção de verdade, manda no grupo com as datas mais baratas."]]
        .forEach(([h, s], i) => { cartao(c, 80, y, PW - 160, 230, t3); c.fillStyle = MARCA.amarelo; c.beginPath(); c.arc(170, y + 115, 52, 0, 7); c.fill(); tx(c, String(i + 1), 170, y + 140, 70, MARCA.titulo, MARCA.navy, "center");
          tx(c, h, 260, y + 95, 54, MARCA.titulo, MARCA.navy); bloco(c, s, 260, y + 145, PW - 420, 26, MARCA.corpo, MARCA.navy, "left", 600, 1.3, 3); y += 260; });
      rodape(c, PW, PH, t3); },
      "🤖 COMO O RADAR DO PARTIU 085 FUNCIONA\n\n1️⃣ Pesquisa os preços saindo de Fortaleza várias vezes por dia\n2️⃣ Compara com o preço normal de cada rota (ida e volta)\n3️⃣ Quando é promoção de verdade, avisa no grupo com as datas mais baratas\n\nSem enrolação: se não está barato, não vai pro grupo."),
    simples("grupo", "3. O grupo grátis", "Convite direto pro grupo.", c => { fundo(c, PW, PH, t2); topo(c, PW, t2, "GRÁTIS");
      let y = titulos(c, PW, 300, t2, "GRUPO DE ALERTAS", "saindo de Fortaleza", null) + 40; desenhaImg(c, "mascote", PW / 2, y, 340); y += 400;
      ["Passagens baratas em dinheiro", "Promoções de milhas", "Datas mais baratas de ida e volta"].forEach(it => { pil(c, "✓  " + it, PW / 2, y, 32, MARCA.navy, "#fff", 36, 80, MARCA.corpo, 800, "center"); y += 100; });
      rodape(c, PW, PH, t2, "Link na bio · é de graça"); },
      "📲 GRUPO GRÁTIS DE ALERTAS\n\nQuer saber primeiro quando aparecer passagem barata saindo de Fortaleza? Entra no nosso grupo. É de graça.\n\n✅ Passagens em dinheiro\n✅ Promoções de milhas\n✅ Datas mais baratas de ida e volta"),
  ];
  const t5 = gTop5(); if (t5) L.push({ ...t5, id: "camp-top5", titulo: "4. Top 5 do dia" });
  const ed = gEducativo(EDU[0]); L.push({ ...ed, id: "camp-edu", titulo: "5. Carrossel: milhas ou pontos?" });
  const pv = gProva(); if (pv) L.push({ ...pv, id: "camp-prova", titulo: "6. O que o radar achou" });
  const ed2 = gEducativo(EDU[2]); L.push({ ...ed2, id: "camp-erros", titulo: "7. Carrossel: 5 erros" });
  const rm = gRadarMilhas(); if (rm) L.push({ ...rm, id: "camp-milhas", titulo: "8. Radar de milhas" });
  L.push(simples("notif", "9. Ative as notificações", "Fecha a campanha pedindo a ação mais importante.", c => { fundo(c, PW, PH, t1); topo(c, PW, t1, "");
    let y = titulos(c, PW, 380, t1, "PROMOÇÃO BOA", "some em horas", "ATIVE AS NOTIFICAÇÕES") + 60; desenhaImg(c, "mascote", PW / 2, y, 380); rodape(c, PW, PH, t1, "Siga @partiu.085 + grupo grátis na bio"); },
    "🔔 PROMOÇÃO BOA SOME EM HORAS\n\nAtiva as notificações do perfil e entra no grupo grátis pra não perder a próxima.\n\n✈️ Partiu 085: o radar de passagens de Fortaleza."));
  return L;
}
const STORIES_LEO = [
  "Story 1 (vídeo falando): \"Gente, criei um radar que avisa quando aparece passagem barata saindo de Fortaleza. Vou mostrar como funciona.\"",
  "Story 2 (print de um alerta real do grupo): \"Olha esse que saiu essa semana 👀\" + adesivo de enquete: \"Você iria? Sim / Com certeza\"",
  "Story 3 (link): \"É de graça. Entra no grupo e segue o @partiu.085\" + adesivo de LINK do grupo + menção @partiu.085",
];

/* ---------- página */
async function ideiasHoje() {
  const L = [gRadarMilhas(), gBonus(), gTop5(), await gQuantoCusta(), gEducativo(), gProva(), gChamada()].filter(Boolean);
  return L;
}
function feito(id) { return S.marcados && S.marcados["ig-" + id]; }
function cardPauta(p, i) {
  return `<article class="card pa-c ${feito(p.id) ? "feito" : ""}" data-pa="${i}">
    <div class="pa-h"><span class="tag">${esc(p.tipo)}</span><b>${esc(p.titulo)}</b><small>${esc(p.fmt)}</small></div>
    <div class="pa-telas ${p.stories ? "st" : ""}" id="pa-t-${i}"><div class="vazio">desenhando…</div></div>
    <div class="pa-porque">💡 ${esc(p.porque)}</div>
    <textarea class="pa-leg" id="pa-l-${i}" spellcheck="false">${esc(p.legenda)}</textarea>
    <div class="al-acts"><button class="bt pri sm" data-act="pabaixar" data-i="${i}">${ic("down")}Baixar ${p.telas.length > 1 ? `as ${p.telas.length} telas` : "imagem"}</button>
      <button class="bt sm" data-act="pacopiar" data-i="${i}">${ic("copy")}Copiar legenda</button>
      <button class="bt sm ${feito(p.id) ? "ok" : "ghost"}" data-act="pafeito" data-i="${i}">${ic(feito(p.id) ? "check" : "circle")}${feito(p.id) ? "Postado" : "Marcar como postado"}</button></div>
  </article>`;
}
function pPauta() {
  PA.lista = null;
  const abas = pills("paaba", PA.aba, [["hoje", "Pra hoje"], ["campanha", "Campanha de lançamento"], ["biblioteca", "Biblioteca educativa"]]);
  setTimeout(montarPauta, 0);
  return head("Pauta do Instagram", "Opções de post prontas pra hoje, feitas com os dados do radar e com a nossa identidade. Escolha 1 ou 2, baixe, copie a legenda e poste. Tudo termina chamando pro grupo grátis.") +
    `<div class="pa-bar">${abas}</div>
    ${PA.aba === "campanha" ? `<div class="card pa-dica"><b>Como usar a campanha:</b> poste na ordem, 1 ou 2 por dia, pra o perfil ficar com um grid bonito desde o começo. No seu perfil pessoal (@leoxpinheiro), faça os 3 stories abaixo no dia do lançamento:<ol>${STORIES_LEO.map(s => `<li>${esc(s)}</li>`).join("")}</ol></div>` : ""}
    <div class="pa-grade" id="pa-grade"><div class="card vazio">Montando as opções…</div></div>`;
}
async function montarPauta() {
  const g = document.getElementById("pa-grade"); if (!g) return;
  carregarMilhas();
  for (let i = 0; i < 50 && S.mi && S.mi.carregando; i++) await new Promise(r => setTimeout(r, 100));
  try { await Promise.all([`400 80px ${MARCA.titulo}`, `400 60px ${MARCA.script}`, `800 30px ${MARCA.corpo}`, `600 30px ${MARCA.corpo}`, `700 30px ${MARCA.corpo}`].map(f => document.fonts.load(f))); } catch (e) { }
  const L = PA.aba === "hoje" ? await ideiasHoje() : PA.aba === "campanha" ? campanha() : EDU.map(x => gEducativo(x));
  PA.lista = L;
  if (!document.getElementById("pa-grade")) return;
  g.innerHTML = L.length ? L.map(cardPauta).join("") : `<div class="card vazio">Sem dados suficientes agora. Volta depois da próxima rodada.</div>`;
  L.forEach((p, i) => { const box = document.getElementById("pa-t-" + i); if (!box) return; box.innerHTML = "";
    p.telas.forEach((fn, j) => { const cv = document.createElement("canvas"); cv.width = p.stories ? SW : PW; cv.height = p.stories ? SH : PH; try { fn(cv.getContext("2d")); } catch (e) { console.error(e); } box.appendChild(cv); }); });
}
document.addEventListener("click", async e => {
  const b = e.target.closest('[data-act^="pa"]'); if (!b) return;
  if (b.dataset.act === "pill") return;
  const p = (PA.lista || [])[+b.dataset.i]; if (!p) return;
  if (b.dataset.act === "pabaixar") { [...document.querySelectorAll(`#pa-t-${b.dataset.i} canvas`)].forEach((cv, j) => setTimeout(() => { const a = document.createElement("a"); a.download = `partiu085-${p.id}-${j + 1}.png`; a.href = cv.toDataURL("image/png"); a.click(); }, j * 350)); }
  else if (b.dataset.act === "pacopiar") { await copiar(($("#pa-l-" + b.dataset.i) || {}).value || p.legenda); toast("Legenda copiada."); }
  else if (b.dataset.act === "pafeito") { marcar("ig-" + p.id, !feito(p.id)); const card = b.closest(".pa-c"); card.classList.toggle("feito", !!feito(p.id)); b.classList.toggle("ok", !!feito(p.id)); b.innerHTML = `${ic(feito(p.id) ? "check" : "circle")}${feito(p.id) ? "Postado" : "Marcar como postado"}`; }
});
document.addEventListener("click", e => { const b = e.target.closest('[data-act="pill"][data-g="paaba"]'); if (b) { PA.aba = b.dataset.v; } }, true);
