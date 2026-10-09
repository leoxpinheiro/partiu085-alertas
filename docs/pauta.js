/* Partiu 085 — Pauta do Instagram: posts prontos com os dados do radar, num layout editorial.
   Stories = o que é do dia (top 5, radar de milhas, achado de hoje, chamada pro grupo).
   Feed = o que tem valor duradouro (oportunidade rara, resumo da semana, bônus forte, quanto custa, guias).
   Usa MARCA/img/caber/quebrar/rr/aviao/desenhaImg do Criar arte e as fotos reais das cidades (fotos/IATA.jpg). */
"use strict";
const PA = { aba: "montar", tipo: "feed", nt: { link: "", kicker: "Novidade no aeroporto de Fortaleza", titulo: "", pontos: "", fonte: "", texto: "", foto: null } };
try { PA.tipo = localStorage.getItem("p085_pa_tipo") || "feed"; } catch (e) { }
const PW = 1080, PH = 1350, SW = 1080, SH = 1920, M = 90;
const COR = { navy: "#0B2440", am: "#F5C531", creme: "#F6F1E4", tinta: "#0F2A47", cinza: "rgba(255,255,255,.62)", linha: "rgba(255,255,255,.14)" };
const HASH = "#fortaleza #ceara #passagensbaratas #promocaodepassagem #milhas #viagem #partiu085";

/* ---------- guias (só conceito, sem número inventado) */
const EDU = [
  { id: "milhas-pontos", cat: "MILHAS", capa: "Milhas ou pontos: qual a diferença?", sub: "O básico que muda o jeito de viajar.", slides: [
    ["Pontos", "São os do cartão de crédito e de programas como Livelo e Esfera. Sozinhos, eles não viram passagem."],
    ["Milhas", "São dos programas das companhias: Smiles, LATAM Pass e Azul Fidelidade. É com elas que você emite a passagem."],
    ["O pulo do gato", "Você transfere os pontos pro programa de milhas. Com bônus na transferência, cada ponto vira mais de uma milha."]] },
  { id: "bonificada", cat: "MILHAS", capa: "Transferência bonificada, sem complicação", sub: "O jeito mais barato de juntar milhas.", slides: [
    ["Junte pontos", "Cartão de crédito, Livelo, Esfera: os pontos ficam guardados esperando a hora certa."],
    ["Espere o bônus", "De tempos em tempos os programas dão bônus na transferência: 50%, 80%, 100% ou mais."],
    ["Transfira", "Com 100% de bônus, 10.000 pontos viram 20.000 milhas. A gente avisa aqui quando aparece."]] },
  { id: "emitir", cat: "MILHAS", capa: "Como emitir passagem com milhas", sub: "Em 4 passos.", slides: [
    ["Escolha o programa", "Veja em qual programa você tem milhas: Smiles, LATAM Pass ou Azul Fidelidade."],
    ["Pesquise as datas", "No site ou app do programa, marque a opção de pagar com milhas e compare o calendário."],
    ["Confira as taxas", "Além das milhas, sempre tem taxa de embarque em dinheiro. Veja o total antes de fechar."],
    ["Emita e confira", "Depois de emitir, confira nome, datas e o localizador no e-mail da companhia."]] },
  { id: "clube", cat: "MILHAS", capa: "Clube de milhas vale a pena?", sub: "Faça essa conta antes de assinar.", slides: [
    ["O que é", "Você paga um valor por mês e recebe milhas todo mês, além de vantagens no programa."],
    ["Quando vale", "Se você usa as milhas com frequência e aproveita as promoções exclusivas de quem é assinante."],
    ["Quando não vale", "Se as milhas ficam paradas até vencer. Milha boa é milha usada."]] },
  { id: "habitos", cat: "VIAGEM", capa: "5 hábitos de quem paga barato na passagem", sub: "Saindo de Fortaleza ou de qualquer lugar.", slides: [
    ["Ser flexível", "Mudar a viagem um ou dois dias pode cortar o preço pela metade. Olhe o calendário inteiro."],
    ["Comparar ida e volta", "Às vezes a ida está barata numa companhia e a volta em outra. Vale olhar separado."],
    ["Comprar com antecedência", "Perto da data o preço costuma subir. Promoção boa aparece antes."],
    ["Decidir rápido", "Preço de promoção dura horas. Quem tem alerta ligado sai na frente."],
    ["Ter um radar", "O Partiu 085 olha os preços o dia todo e avisa no grupo grátis."]] },
  { id: "trecho", cat: "VIAGEM", capa: "Trecho ou ida e volta?", sub: "Por que a gente sempre mostra os dois.", slides: [
    ["Trecho", "É o preço de um lado só: só a ida ou só a volta."],
    ["Ida e volta", "É a soma dos dois. É ela que diz se a viagem está barata de verdade."],
    ["No Partiu 085", "Todo alerta traz o trecho e a ida e volta, pra você não cair em preço que só parece barato."]] },
  { id: "tarifa", cat: "VIAGEM", capa: "Tarifa light: o que você está comprando", sub: "A mais barata nem sempre sai mais barata.", slides: [
    ["O que é", "Geralmente é a tarifa mais em conta e não inclui bagagem despachada. Cada companhia tem suas regras."],
    ["Faça a conta", "Se for despachar mala, some o valor da bagagem e compare com a tarifa seguinte."],
    ["Nos nossos alertas", "Mostramos a tarifa mais barata encontrada. Confira o que ela inclui na hora de comprar."]] },
  { id: "conexao", cat: "VIAGEM", capa: "Conexão: o que ninguém te conta", sub: "Pra não perder o segundo voo.", slides: [
    ["Mesma reserva", "Com os dois voos na mesma reserva, a companhia é responsável se o primeiro atrasar."],
    ["Bilhetes separados", "Comprando separado, o risco é seu. Deixe bastante tempo entre um voo e outro."],
    ["Bagagem", "Na mesma reserva, a mala costuma ir direto ao destino final. Confirme no balcão do check-in."]] },
  { id: "mercosul", cat: "VIAGEM", capa: "Argentina, Chile, Uruguai… dá pra ir só com RG?", sub: "O que saber antes de embarcar.", slides: [
    ["Pode, em geral", "Brasileiros costumam entrar em países do Mercosul e associados com o RG, em vez do passaporte."],
    ["Mas atenção", "O documento precisa estar em bom estado e dentro das regras de validade. CNH não vale."],
    ["Confira sempre", "As regras mudam. Antes de viajar, confira no site do Itamaraty e da companhia aérea."]] },
  { id: "aeroporto", cat: "AEROPORTO", capa: "Checklist antes de ir pro aeroporto", sub: "Salva pra não esquecer nada.", slides: [
    ["Documento", "RG ou CNH válidos no voo nacional. Internacional: passaporte e o que o destino pedir."],
    ["Check-in online", "Faça pelo app da companhia e deixe o cartão de embarque salvo no celular."],
    ["Chegue com folga", "As companhias costumam recomendar 2h antes no voo nacional e 3h antes no internacional."]] },
  { id: "bagagem", cat: "AEROPORTO", capa: "Bagagem de mão: confira antes de fechar a mala", sub: "Evite surpresa no portão de embarque.", slides: [
    ["Peso e medida", "Cada companhia tem seu limite de peso e tamanho. Confira no site antes de viajar."],
    ["Líquidos", "Em voo internacional, líquidos na mão vão em frascos pequenos, dentro de um saquinho transparente."],
    ["Item pessoal", "Além da mala de mão, normalmente dá pra levar uma bolsa ou mochila pequena embaixo do assento."]] },
];
const CAT_EDU = { MILHAS: "Milhas", VIAGEM: "Viagem", AEROPORTO: "Aeroporto" };
const DESTINOS_PAUTA = ["SAO", "LIS", "RIO", "REC", "BUE", "SSA", "SCL", "BSB", "MIA", "POA", "ORL", "CWB", "MAD", "NAT", "PAR", "FLN"];

/* ---------- utilidades */
const nDia = () => Math.floor((Date.now() - 3 * 36e5) / 864e5);
const MESC = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const dataCurta = iso => `${iso.slice(8, 10)} ${MESC[+iso.slice(5, 7) - 1]}`;
function legenda(corpo) { return `${corpo}\n\n🔔 Grupo GRÁTIS de alertas de passagem saindo de Fortaleza: link na bio\n\n${HASH}`; }
function curto(t, n = 70) { t = String(t || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1).replace(/[\s,.;:-]+\S*$/, "") + "…" : t; }
function T(c, t, x, y, size, fam, cor, al = "left", peso = 400, ls = 0) { c.font = `${peso} ${size}px ${fam}`; c.fillStyle = cor; c.textAlign = al; c.textBaseline = "alphabetic"; if ("letterSpacing" in c) c.letterSpacing = ls + "px"; c.fillText(t, x, y); if ("letterSpacing" in c) c.letterSpacing = "0px"; }
function paragrafo(c, t, x, y, w, size, fam, cor, peso = 400, lh = 1.12, max = 8) { const L = quebrar(c, t, w, size, fam, peso).slice(0, max); L.forEach((l, i) => T(c, l, x, y + i * size * lh, size, fam, cor, "left", peso)); return y + L.length * size * lh; }
function kicker(c, t, x, y, cor = COR.am, al = "left") {
  if (al !== "left") { T(c, t.toUpperCase(), x, y, 24, MARCA.corpo, cor, al, 800, 4); return; }
  t = t.toUpperCase(); c.font = `800 28px ${MARCA.corpo}`; if ("letterSpacing" in c) c.letterSpacing = "3px"; const w = c.measureText(t).width; if ("letterSpacing" in c) c.letterSpacing = "0px";
  const txt = cor === COR.am ? COR.tinta : cor === COR.tinta ? COR.am : "#fff";
  c.fillStyle = cor; rr(c, x, y - 50, w + 44, 54, 27); c.fill(); T(c, t, x + 22, y - 12, 28, MARCA.corpo, txt, "left", 800, 3);
}
function rota(c, W, H, cor, a = .22) { c.save(); c.globalAlpha = a; c.strokeStyle = cor; c.lineWidth = 4; c.setLineDash([14, 16]);
  c.beginPath(); c.moveTo(-40, H * .62); c.bezierCurveTo(W * .35, H * .30, W * .62, H * .08, W + 40, H * .16); c.stroke(); c.restore();
  c.save(); c.globalAlpha = Math.min(1, a * 3); aviao(c, W - 150, H * .135, 54, cor, -Math.PI / 10); c.restore(); }
const FOTOS_P = {};
function fotoPronta(iata) {
  if (!iata) return Promise.resolve(null);
  if (!FOTOS_P[iata]) FOTOS_P[iata] = new Promise(ok => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = `fotos/${iata}.jpg`; });
  return FOTOS_P[iata];
}
function grao(c, W, H, a, cor = "#fff") { c.save(); c.globalAlpha = a; c.fillStyle = cor; for (let i = 0; i < 1400; i++) c.fillRect((i * 7919) % W, (i * 104729) % H, 2, 2); c.restore(); }
function bgNavy(c, W, H) {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0E2C4F"); g.addColorStop(1, COR.navy); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const r = c.createRadialGradient(W * .85, H * .08, 10, W * .85, H * .08, W * .9); r.addColorStop(0, "rgba(245,197,49,.16)"); r.addColorStop(1, "rgba(245,197,49,0)"); c.fillStyle = r; c.fillRect(0, 0, W, H);
  grao(c, W, H, .035);
}
function bgCreme(c, W, H) { c.fillStyle = COR.creme; c.fillRect(0, 0, W, H); grao(c, W, H, .03, "#0F2A47"); }
function bgFoto(c, W, H, im, ate = .6) {
  c.fillStyle = COR.navy; c.fillRect(0, 0, W, H);
  if (im) { const fh = H * ate + 220, s = Math.max(W / im.naturalWidth, fh / im.naturalHeight); c.drawImage(im, (W - im.naturalWidth * s) / 2, 0, im.naturalWidth * s, im.naturalHeight * s); }
  else bgNavy(c, W, H);
  let g = c.createLinearGradient(0, 0, 0, 320); g.addColorStop(0, "rgba(8,22,40,.65)"); g.addColorStop(1, "rgba(8,22,40,0)"); c.fillStyle = g; c.fillRect(0, 0, W, 320);
  g = c.createLinearGradient(0, H * ate - 460, 0, H * ate + 220); g.addColorStop(0, "rgba(11,36,64,0)"); g.addColorStop(.65, "rgba(11,36,64,.93)"); g.addColorStop(1, COR.navy); c.fillStyle = g; c.fillRect(0, H * ate - 460, W, H);
}
function marca(c, W, escuro = true, dir = "") {
  const ico = img("icone");
  c.save(); c.beginPath(); c.arc(M + 26, 96, 26, 0, 7); c.fillStyle = COR.am; c.fill();
  if (ico.complete && ico.naturalWidth) { c.beginPath(); c.arc(M + 26, 96, 23, 0, 7); c.clip(); c.drawImage(ico, M + 3, 73, 46, 46); } c.restore();
  T(c, "PARTIU 085", M + 66, 108, 34, MARCA.titulo, escuro ? "#fff" : COR.tinta, "left", 400, 1);
  if (dir) kicker(c, dir, W - M, 106, escuro ? COR.am : COR.tinta, "right");
}
function rodapeP(c, W, H, escuro = true, txt = "Alertas grátis saindo de Fortaleza · link na bio") {
  if (PA.rod && /grupo|grátis|link na bio/i.test(txt)) txt = PA.rod;
  const y = H - 100;
  c.fillStyle = escuro ? COR.linha : "rgba(15,42,71,.15)"; c.fillRect(M, y - 46, W - 2 * M, 2);
  T(c, "@partiu.085", M, y, 26, MARCA.corpo, escuro ? "#fff" : COR.tinta, "left", 800);
  c.fillStyle = COR.am; c.beginPath(); c.arc(W - M - 14, y - 9, 14, 0, 7); c.fill(); aviao(c, W - M - 14, y - 9, 16, COR.tinta, Math.PI / 4);
  T(c, txt, W - M - 40, y, 24, MARCA.corpo, escuro ? "rgba(255,255,255,.8)" : "rgba(15,42,71,.75)", "right", 600);
}
function titulo(c, t, x, y, w, max = 120, min = 64, cor = "#fff", lmax = 3) {
  t = t.toUpperCase(); let s = max; while (s > min && quebrar(c, t, w, s, MARCA.titulo).length > lmax) s -= 6;
  const L = quebrar(c, t, w, s, MARCA.titulo).slice(0, lmax); L.forEach((l, i) => T(c, l, x, y + s * .9 + i * s * .98, s, MARCA.titulo, cor)); return y + L.length * s * .98;
}
function selo(o) { return o.tipo === "bonus" ? (o.pct ? `${o.pct}%` : "BÔNUS") : o.tipo === "compra" ? (o.pct ? `−${o.pct}%` : "COMPRA") : "CLUBE"; }
function rotSelo(o) { return o.tipo === "bonus" ? "bônus" : o.tipo === "compra" ? "compra" : "clube"; }
function linhaLista(c, W, y, num, nome, sub, valor, sv, escuro = true, h = 132) {
  T(c, num, M, y + 74, 64, MARCA.titulo, COR.am);
  const nx = M + 100, vw = 310;
  T(c, nome, nx, y + 62, caber(c, nome, W - 2 * M - 100 - vw, 52, MARCA.titulo, 400, 34), MARCA.titulo, escuro ? "#fff" : COR.tinta);
  if (sub) T(c, sub, nx + 2, y + 100, 24, MARCA.corpo, escuro ? COR.cinza : "rgba(15,42,71,.6)", "left", 600);
  if (valor) T(c, valor, W - M, y + 62, 52, MARCA.titulo, escuro ? "#fff" : COR.tinta, "right");
  if (sv) T(c, sv, W - M, y + 100, 22, MARCA.corpo, escuro ? COR.cinza : "rgba(15,42,71,.6)", "right", 700);
  c.fillStyle = escuro ? COR.linha : "rgba(15,42,71,.12)"; c.fillRect(M, y + h - 2, W - 2 * M, 2);
}
function promosMilhas() {
  const lim = diaMenos(hojeISO(), 2);
  return ((S.mi && S.mi.ofertas) || []).filter(o => !o.busca_propria && o.ativa !== false && ["bonus", "compra", "clube"].includes(o.tipo) && (o.publicado || "").slice(0, 10) >= lim)
    .sort((a, b) => (b.tipo === "bonus") - (a.tipo === "bonus") || (b.pct || 0) - (a.pct || 0));
}
function espacoLink(c, W, H) {
  c.save(); c.setLineDash([10, 10]); c.strokeStyle = "rgba(255,255,255,.3)"; c.lineWidth = 2; rr(c, W / 2 - 240, H - 300, 480, 110, 24); c.stroke(); c.restore();
  T(c, "adesivo de link do grupo aqui", W / 2, H - 236, 22, MARCA.corpo, "rgba(255,255,255,.45)", "center", 600);
}
function bola(c, x, y) { c.fillStyle = COR.am; c.beginPath(); c.arc(x, y, 20, 0, 7); c.fill(); T(c, "✓", x, y + 9, 24, MARCA.corpo, COR.tinta, "center", 800); }

/* ================= STORIES (do dia) ================= */
function sTop5() {
  const L = typeof top5 === "function" ? top5() : []; if (L.length < 3) return null;
  return { id: "s-top5-" + hojeISO(), grupo: "stories", tipo: "Passagens", titulo: "Top 5 de hoje", porque: "Informação do dia vai pro story: some em 24h, como o preço.", fmt: "Story 9:16", stories: true,
    telas: [c => { bgNavy(c, SW, SH); marca(c, SW, true, dataCurta(hojeISO()));
      kicker(c, "Top 5 de hoje", M, 330);
      let y = titulo(c, "Os mais baratos saindo de Fortaleza", M, 356, SW - 2 * M, 120, 80) + 60;
      L.forEach((x, i) => { linhaLista(c, SW, y, String(i + 1).padStart(2, "0"), x.nome.toUpperCase(), x.mes ? `melhor em ${MESES[+x.mes - 1].toLowerCase()}` : "", brl(x.rt), "ida e volta", true, 150); y += 150; });
      T(c, "Preços de hoje, podem mudar a qualquer momento.", M, y + 60, 24, MARCA.corpo, COR.cinza, "left", 600);
      espacoLink(c, SW, SH); }],
    legenda: `Adesivo de LINK: ${linkGrupo()}\nTexto do adesivo: "Grupo grátis de alertas"` };
}
function sMilhas() {
  const L = promosMilhas().slice(0, 5); if (L.length < 2) return null;
  return { id: "s-milhas-" + hojeISO(), grupo: "stories", tipo: "Milhas", titulo: "Radar de milhas de hoje", porque: "Notícia rápida de milhas: perfeita pra story e puxa quem ama milhas.", fmt: "Story 9:16", stories: true,
    telas: [c => { bgNavy(c, SW, SH); marca(c, SW, true, dataCurta(hojeISO()));
      kicker(c, "Radar de milhas", M, 330);
      let y = titulo(c, "O que tá rolando hoje", M, 356, SW - 2 * M, 130, 80, "#fff", 2) + 50;
      L.forEach(o => { const s = selo(o), fs = caber(c, s, 180, 64, MARCA.titulo);
        c.fillStyle = COR.am; rr(c, M, y + 10, 210, 124, 22); c.fill(); T(c, s, M + 105, y + 82, fs, MARCA.titulo, COR.tinta, "center");
        T(c, rotSelo(o).toUpperCase(), M + 105, y + 118, 16, MARCA.corpo, COR.tinta, "center", 800, 2);
        paragrafo(c, curto(o.titulo, 95), M + 240, y + 54, SW - 2 * M - 240, 30, MARCA.corpo, "#fff", 700, 1.28, 3);
        c.fillStyle = COR.linha; c.fillRect(M, y + 160, SW - 2 * M, 2); y += 182; });
      T(c, "Confira as regras no site de cada programa.", M, y + 40, 24, MARCA.corpo, COR.cinza, "left", 600);
      espacoLink(c, SW, SH); }],
    legenda: `Adesivo de LINK: ${linkGrupo()}` };
}
async function sAchado() {
  const lim = diaMenos(hojeISO(), 1);
  const a = S.alertas.filter(x => x.criado.slice(0, 10) >= lim && !(x.conferido && x.conferido.status === "subiu") && (typeof ivBarato !== "function" || ivBarato(x)))
    .sort((x, y) => (y.desconto + (y.recorde ? .2 : 0)) - (x.desconto + (x.recorde ? .2 : 0)))[0];
  if (!a) return null;
  const im = await fotoPronta(a.destino), rf = refDe(a.destino), rt = a.preco + (a.preco_volta || 0);
  return { id: "s-achado-" + a.id, grupo: "stories", tipo: "Passagens", titulo: `Achado de hoje: ${a.destino_nome}`, porque: "A melhor passagem do dia com a foto da cidade. Gera resposta e clique no link.", fmt: "Story 9:16", stories: true,
    telas: [c => { bgFoto(c, SW, SH, im, .52); marca(c, SW, true, a.recorde ? "MENOR PREÇO JÁ VISTO" : "ACHADO DE HOJE");
      const y0 = SH * .52 - 120;
      kicker(c, `Saindo de Fortaleza${rf && rf.curta ? " · " + rf.curta : ""}`, M, y0);
      let y = titulo(c, a.destino_nome, M, y0 + 26, SW - 2 * M, 170, 90, "#fff", 2) + 40;
      T(c, "ida e volta a partir de", M, y + 30, 30, MARCA.corpo, COR.cinza, "left", 600);
      const bs = caber(c, brl(rt), SW - 2 * M, 190, MARCA.titulo); T(c, brl(rt), M - 4, y + 40 + bs * .9, bs, MARCA.titulo, COR.am); y += 40 + bs;
      T(c, `trecho ${brl(a.preco)} · ${nomeCia(a.cia_nome)} · ${paradasTxt(a.escalas)}`, M, y + 30, 28, MARCA.corpo, "#fff", "left", 700);
      const ida = (a.ida_meses || []).slice(0, 2).map(g => `${g.mes.split(" ")[0].slice(0, 3).toLowerCase()} ${g.dias.slice(0, 5).join(", ")}`).join("  ·  ");
      if (ida) T(c, "IDA  " + ida, M, y + 80, 24, MARCA.corpo, COR.cinza, "left", 600);
      espacoLink(c, SW, SH); }],
    legenda: `Adesivo de LINK: ${linkGrupo()}\nEnquete sugerida: "Você iria?" Sim / Com certeza` };
}
function sChamada() {
  return { id: "s-chamada-" + hojeISO(), grupo: "stories", tipo: "Grupo", titulo: "Chamada pro grupo grátis", porque: "Story fixo com link: transforma seguidor em membro do grupo.", fmt: "Story 9:16", stories: true,
    telas: [c => { bgNavy(c, SW, SH); marca(c, SW, true, "GRÁTIS");
      kicker(c, "Grupo de alertas", M, 360);
      let y = titulo(c, "Passagem barata saindo de Fortaleza no seu WhatsApp", M, 386, SW - 2 * M, 130, 80, "#fff", 4) + 100;
      ["Alertas todo dia", "Preço de ida e volta", "As datas mais baratas", "Promoções de milhas"].forEach(it => { bola(c, M + 20, y - 14); T(c, it, M + 64, y, 40, MARCA.corpo, "#fff", "left", 700); y += 84; });
      desenhaImg(c, "mascote", SW - M - 160, y - 60, 300);
      espacoLink(c, SW, SH); }],
    legenda: `Adesivo de LINK: ${linkGrupo()}\nTexto: "Grupo grátis de alertas saindo de Fortaleza 👇"` };
}

/* ================= FEED (duradouro) ================= */
async function fOportunidade() {
  const lim = diaMenos(hojeISO(), 2);
  const a = S.alertas.filter(x => x.criado.slice(0, 10) >= lim && (x.recorde || x.desconto >= .5) && !(x.conferido && x.conferido.status === "subiu") && (typeof ivBarato !== "function" || ivBarato(x)))
    .sort((x, y) => ((y.recorde ? 1 : 0) - (x.recorde ? 1 : 0)) || y.desconto - x.desconto)[0];
  if (!a) return null;
  const im = await fotoPronta(a.destino), rf = refDe(a.destino), rt = a.preco + (a.preco_volta || 0);
  const md = ms => (ms || []).map(g => `${g.mes.split(" ")[0]} ${g.dias.join(", ")}`).join(" · ");
  return { id: "f-op-" + a.id, grupo: "feed", tipo: "Oportunidade", titulo: `Oportunidade rara: ${a.destino_nome}`, porque: a.recorde ? "É o menor preço que o radar já viu nessa rota: merece o feed." : "Preço muito abaixo do normal: vale registrar no feed.", fmt: "Feed 4:5",
    telas: [c => { bgFoto(c, PW, PH, im, .56); marca(c, PW, true, a.recorde ? "MENOR PREÇO JÁ VISTO" : "OPORTUNIDADE RARA");
      const y0 = PH * .56 - 130;
      kicker(c, `Fortaleza ➜ ${a.destino}${rf && rf.curta ? " · " + rf.curta : ""}`, M, y0);
      const y = titulo(c, a.destino_nome, M, y0 + 24, PW - 2 * M, 130, 76, "#fff", 2) + 30;
      T(c, "ida e volta a partir de", M, y + 20, 26, MARCA.corpo, COR.cinza, "left", 600);
      const bs = caber(c, brl(rt), 560, 140, MARCA.titulo); T(c, brl(rt), M - 4, y + 30 + bs * .9, bs, MARCA.titulo, COR.am);
      T(c, `trecho ${brl(a.preco)}`, PW - M, y + 30 + bs * .55, 38, MARCA.titulo, "#fff", "right");
      T(c, `${nomeCia(a.cia_nome)} · ${paradasTxt(a.escalas)}`, PW - M, y + 30 + bs * .55 + 40, 24, MARCA.corpo, COR.cinza, "right", 600);
      rodapeP(c, PW, PH); }],
    legenda: legenda(`${a.recorde ? "📉 MENOR PREÇO QUE JÁ VIMOS" : "🔥 OPORTUNIDADE RARA"}: FORTALEZA ➜ ${a.destino_nome.toUpperCase()}\n\nIda e volta a partir de ${brl(rt)} (trecho ${brl(a.preco)}), ${nomeCia(a.cia_nome)}, ${paradasTxt(a.escalas)}.\n\n🗓️ Ida: ${md(a.ida_meses)}\n🗓️ Volta: ${md(a.volta_meses)}\n\n⚠️ Preço de ${dataCurta(a.criado.slice(0, 10)).toLowerCase()}, pode ter mudado. Quem estava no grupo recebeu na hora.`) };
}
function fSemana() {
  const lim = diaMenos(hojeISO(), 6), vistos = new Set();
  const L = S.alertas.filter(a => a.criado.slice(0, 10) >= lim && (typeof ivBarato !== "function" || ivBarato(a))).sort((a, b) => b.desconto - a.desconto).filter(a => !vistos.has(a.destino) && vistos.add(a.destino)).slice(0, 5);
  if (L.length < 3) return null;
  return { id: "f-semana-" + hojeISO(), grupo: "feed", tipo: "Resumo", titulo: "Resumo da semana", porque: "Prova de que o grupo funciona: é o post que mais leva gente pro grupo.", fmt: "Feed 4:5",
    telas: [c => { bgNavy(c, PW, PH); marca(c, PW, true, `${dataCurta(lim)} – ${dataCurta(hojeISO())}`);
      kicker(c, "Resumo da semana", M, 260);
      let y = titulo(c, "O que o radar achou pro grupo", M, 286, PW - 2 * M, 110, 70, "#fff", 2) + 20;
      L.forEach((a, i) => { linhaLista(c, PW, y, String(i + 1).padStart(2, "0"), a.destino_nome.toUpperCase(), `${nomeCia(a.cia_nome)} · ${dataCurta(a.criado.slice(0, 10)).toLowerCase()}`, brl(a.preco + (a.preco_volta || 0)), a.preco_volta ? `ida e volta · trecho ${brl(a.preco)}` : "o trecho", true, 128); y += 128; });
      rodapeP(c, PW, PH, true, "Entre no grupo grátis · link na bio"); }],
    legenda: legenda(`🔔 RESUMO DA SEMANA NO GRUPO\n\nAlguns alertas que mandamos saindo de Fortaleza:\n\n${L.map(a => `✈️ ${a.destino_nome}: ida e volta ${brl(a.preco + (a.preco_volta || 0))} (trecho ${brl(a.preco)})`).join("\n")}\n\nQuem estava no grupo viu primeiro. Os preços eram do dia do alerta.`) };
}
function fBonus() {
  const o = promosMilhas().filter(x => x.tipo === "bonus" && x.pct >= 80).sort((a, b) => b.pct - a.pct)[0]; if (!o) return null;
  const ex = 10000, ganho = Math.round(ex * (1 + o.pct / 100)), rota_ = [o.de, o.para].filter(Boolean).join("  ➜  "), ex_ = `${milN(ex)} pontos ➜ até ${milN(ganho)} milhas`;
  return { id: "f-bonus-" + o.id, grupo: "feed", tipo: "Milhas", titulo: `Bônus de ${o.pct}%`, porque: "Bônus alto é raro e muito compartilhado: vale feed.", fmt: "Feed 4:5",
    telas: [c => { bgCreme(c, PW, PH); marca(c, PW, false, "TRANSFERÊNCIA BONIFICADA");
      kicker(c, "Promoção de milhas", M, 300, "#B7871A");
      T(c, "ATÉ", M, 390, 90, MARCA.titulo, COR.tinta);
      T(c, `${o.pct}%`, M - 8, 700, caber(c, `${o.pct}%`, PW - 2 * M, 320, MARCA.titulo), MARCA.titulo, COR.tinta);
      c.fillStyle = COR.am; c.fillRect(M, 718, 360, 16);
      T(c, "DE BÔNUS", M, 820, 86, MARCA.titulo, COR.tinta);
      if (rota_) T(c, rota_, M, 890, 36, MARCA.corpo, COR.tinta, "left", 800);
      c.fillStyle = "rgba(15,42,71,.08)"; rr(c, M, 940, PW - 2 * M, 150, 24); c.fill();
      T(c, "NA PRÁTICA", M + 36, 990, 20, MARCA.corpo, "rgba(15,42,71,.6)", "left", 800, 3);
      T(c, ex_, M + 36, 1052, caber(c, ex_, PW - 2 * M - 72, 50, MARCA.titulo), MARCA.titulo, COR.tinta);
      rodapeP(c, PW, PH, false, "Confira regras e prazo no site do programa"); }],
    legenda: legenda(`🚨 ATÉ ${o.pct}% DE BÔNUS${rota_ ? ` · ${[o.de, o.para].filter(Boolean).join(" ➜ ")}` : ""}\n\n${o.titulo}\n\nNa prática: ${ex_}.\n\n⚠️ Cada promoção tem regra e prazo: confira no site do programa antes de transferir.`) };
}
async function fQuanto() {
  const ks = DESTINOS_PAUTA.filter(k => (S.status.rotas || {})[k]); if (!ks.length) return null;
  const k = ks[nDia() % ks.length]; await carregarCal(k); const cal = S.cal[k]; if (!cal || !cal.ida || !cal.ida.length) return null;
  const pm = {}; cal.ida.forEach(d => { const m = d.dia.slice(0, 7); pm[m] = Math.min(d.preco, pm[m] || 1e9); });
  const ms = Object.entries(pm).sort().slice(0, 4); if (ms.length < 2) return null;
  const nome = (S.rotas.find(r => r.iata === k) || {}).nome || IATA[k] || k, mn = Math.min(...ms.map(m => m[1])), mx = Math.max(...ms.map(m => m[1])), melhor = ms.find(m => m[1] === mn)[0];
  const im = await fotoPronta(k);
  return { id: "f-quanto-" + k + "-" + hojeISO(), grupo: "feed", tipo: "Dados", titulo: `Quanto custa voar pra ${nome}`, porque: "Responde \"quando é mais barato?\" com dado que só a gente tem. Muito salvo.", fmt: "Feed 4:5",
    telas: [c => { bgFoto(c, PW, PH, im, .4); marca(c, PW, true, "DADOS DO RADAR");
      kicker(c, "Quanto custa voar de Fortaleza pra", M, 450);
      titulo(c, nome, M, 476, PW - 2 * M, 140, 80, "#fff", 1);
      let y = 670;
      ms.forEach(([m, p]) => { const best = p === mn, w = 160 + (p / mx) * (PW - 2 * M - 220 - 380);
        T(c, MESES[+m.slice(5, 7) - 1].toUpperCase(), M, y + 50, 40, MARCA.titulo, best ? COR.am : "#fff");
        c.fillStyle = best ? COR.am : "rgba(255,255,255,.16)"; rr(c, M + 220, y + 12, w, 52, 26); c.fill();
        T(c, brl(p), M + 220 + w + 20, y + 52, 40, MARCA.titulo, best ? COR.am : "#fff"); y += 90; });
      T(c, `Menor preço do trecho (só ida) achado em ${dataCurta(hojeISO()).toLowerCase()}`, M, y + 34, 22, MARCA.corpo, COR.cinza, "left", 600);
      rodapeP(c, PW, PH); }],
    legenda: legenda(`📅 QUANTO CUSTA VOAR DE FORTALEZA PRA ${nome.toUpperCase()}?\n\nO menor preço do trecho (só ida) que o radar achou pra cada mês:\n\n${ms.map(([m, p]) => `${p === mn ? "⭐" : "▫️"} ${MESES[+m.slice(5, 7) - 1]}: a partir de ${brl(p)}`).join("\n")}\n\nO mais barato agora é ${MESES[+melhor.slice(5, 7) - 1].toLowerCase()}.\n⚠️ Preços de ${dataCurta(hojeISO()).toLowerCase()}, mudam a qualquer momento.\n\n💬 Quer que a gente faça de outro destino? Comenta aqui!`) };
}
function fGuia(x) {
  x = x || EDU[nDia() % EDU.length];
  const n = x.slides.length + 2;
  const telas = [c => { bgNavy(c, PW, PH); marca(c, PW, true, `GUIA · ${x.cat}`);
    const y = titulo(c, x.capa, M, 380, PW - 2 * M, 130, 76, "#fff", 4);
    c.fillStyle = COR.am; c.fillRect(M, y + 30, 140, 12);
    paragrafo(c, x.sub, M, y + 110, PW - 2 * M - 220, 38, MARCA.corpo, COR.cinza, 600, 1.3, 3);
    desenhaImg(c, "mascote", PW - M - 120, PH - 450, 230);
    T(c, "ARRASTA ➜", M, PH - 100, 26, MARCA.corpo, COR.am, "left", 800, 3); }];
  x.slides.forEach(([h, t], i) => telas.push(c => { bgCreme(c, PW, PH); marca(c, PW, false, `${i + 2}/${n}`);
    T(c, String(i + 1).padStart(2, "0"), M - 6, 600, 240, MARCA.titulo, COR.am);
    const y = titulo(c, h, M, 650, PW - 2 * M, 96, 64, COR.tinta, 2);
    paragrafo(c, t, M, y + 60, PW - 2 * M, 44, MARCA.corpo, COR.tinta, 600, 1.42, 7);
    rodapeP(c, PW, PH, false, "Salva pra consultar depois"); }));
  telas.push(c => { bgNavy(c, PW, PH); marca(c, PW, true, "");
    kicker(c, "Gostou?", M, 430); const y = titulo(c, "Salva e manda pra quem vai viajar", M, 456, PW - 2 * M, 120, 76, "#fff", 3) + 60;
    paragrafo(c, "Todo dia tem passagem barata saindo de Fortaleza no nosso grupo grátis. O link tá na bio.", M, y, PW - 2 * M - 160, 38, MARCA.corpo, COR.cinza, 600, 1.35, 3);
    desenhaImg(c, "mascote", PW - M - 120, PH - 450, 230);
    rodapeP(c, PW, PH, true, "Siga @partiu.085 · grupo grátis na bio"); });
  return { id: "f-guia-" + x.id, grupo: "feed", tipo: "Guia · " + CAT_EDU[x.cat], titulo: x.capa, porque: "Carrossel que ensina é o que mais é salvo e compartilhado. Traz seguidor novo.", fmt: `Carrossel · ${telas.length} telas`, telas,
    legenda: legenda(`${x.capa.toUpperCase()} ✈️\n\n${x.slides.map(([h, t]) => `▪️ ${h}: ${t}`).join("\n\n")}\n\n📌 Salva esse post pra consultar depois.`) };
}


/* ================= semana 1: aquecimento (sem falar do grupo ainda) ================= */
const EDU_ERROS = { id: "erros", cat: "VIAGEM", capa: "5 erros que deixam sua passagem mais cara", sub: "O 3º quase todo mundo comete.", slides: [
  ["Comprar em cima da hora", "Perto da data o preço sobe. Promoção boa costuma aparecer semanas ou meses antes."],
  ["Olhar uma data só", "Mudar a viagem 1 ou 2 dias pode cortar o preço pela metade. Olhe o mês inteiro."],
  ["Esquecer da volta", "A ida tá barata, mas a volta custa o triplo. O que importa é o total de ida e volta."],
  ["Não somar a bagagem", "A tarifa mais barata quase nunca inclui mala despachada. Some antes de fechar."],
  ["Deixar milha vencer", "Milha parada vence. Confira a validade no app do programa e use antes."]] };
function celular(c, x, y, w, h) {
  c.save(); c.shadowColor = "rgba(0,0,0,.45)"; c.shadowBlur = 60; c.shadowOffsetY = 30;
  c.fillStyle = "#050E1A"; rr(c, x, y, w, h, 70); c.fill(); c.restore();
  c.fillStyle = "#10345C"; rr(c, x + 16, y + 16, w - 32, h - 32, 56); c.fill();
  c.fillStyle = "#050E1A"; rr(c, x + w / 2 - 70, y + 34, 140, 36, 18); c.fill();
}
function notif(c, x, y, w, linhas, destaque) {
  c.fillStyle = destaque ? "rgba(255,255,255,.96)" : "rgba(255,255,255,.18)"; rr(c, x, y, w, 150, 30); c.fill();
  const ink = destaque ? COR.tinta : "#fff";
  c.fillStyle = COR.am; c.beginPath(); c.arc(x + 52, y + 50, 26, 0, 7); c.fill(); aviao(c, x + 52, y + 50, 26, COR.tinta, Math.PI / 4);
  T(c, "PARTIU 085", x + 94, y + 46, 22, MARCA.corpo, ink, "left", 800, 2); T(c, "agora", x + w - 26, y + 46, 20, MARCA.corpo, destaque ? "rgba(15,42,71,.5)" : "rgba(255,255,255,.6)", "right", 600);
  T(c, linhas[0], x + 94, y + 84, 26, MARCA.corpo, ink, "left", 800);
  c.fillStyle = destaque ? "rgba(15,42,71,.16)" : "rgba(255,255,255,.22)"; (linhas[1] || []).forEach(([bx, bw]) => { rr(c, x + 94 + bx, y + 104, bw, 22, 11); c.fill(); });
}
/* paleta em rodízio: escuro → creme → amarelo (no grid de 3 colunas fica organizado, cada coluna de uma cor) */
const TEMA = {
  escuro: { bg: (c, W, H) => bgNavy(c, W, H), tx: "#fff", sub: COR.cinza, kk: COR.am, ac: COR.am, dk: true },
  creme: { bg: (c, W, H) => bgCreme(c, W, H), tx: COR.tinta, sub: "rgba(15,42,71,.72)", kk: "#C9971C", ac: "#C9971C", dk: false },
  amarelo: { bg: (c, W, H) => { c.fillStyle = COR.am; c.fillRect(0, 0, W, H); grao(c, W, H, .04, "#0F2A47"); }, tx: COR.tinta, sub: "rgba(15,42,71,.78)", kk: COR.tinta, ac: COR.tinta, dk: false },
};
function capaTema(c, t, kick, tit, sub, dir, rod, mascote = true) {
  const k = TEMA[t]; k.bg(c, PW, PH); rota(c, PW, PH, k.dk ? COR.am : COR.tinta, k.dk ? .22 : .16); marca(c, PW, k.dk, dir);
  kicker(c, kick, M, 400, k.kk); const y = titulo(c, tit, M, 436, PW - 2 * M - (mascote ? 40 : 0), 156, 92, k.tx, 4) + 40;
  c.fillStyle = k.ac; c.fillRect(M, y, 160, 14);
  if (sub) paragrafo(c, sub, M, y + 90, PW - 2 * M - (mascote ? 250 : 0), 44, MARCA.corpo, k.sub, 600, 1.32, 4);
  if (mascote) desenhaImg(c, "mascote", PW - M - 120, PH - 450, 230);
  rodapeP(c, PW, PH, k.dk, rod);
}
function guiaTema(x, t, rod) {
  const g = fGuia(x), n = g.telas.length, k = TEMA[t];
  g.telas[0] = c => { k.bg(c, PW, PH); marca(c, PW, k.dk, `GUIA · ${x.cat}`);
    const y = titulo(c, x.capa, M, 380, PW - 2 * M, 130, 76, k.tx, 4); c.fillStyle = k.ac; c.fillRect(M, y + 30, 140, 12);
    paragrafo(c, x.sub, M, y + 110, PW - 2 * M - 220, 38, MARCA.corpo, k.sub, 600, 1.3, 3);
    desenhaImg(c, "mascote", PW - M - 120, PH - 450, 230); T(c, "ARRASTA ➜", M, PH - 100, 26, MARCA.corpo, k.kk, "left", 800, 3); };
  g.telas[n - 1] = c => capaTema(c, "escuro", "Gostou?", "Salva e manda pra quem vai viajar", "Segue o @partiu.085: tem novidade chegando pra quem sai de Fortaleza.", "", rod);
  return g;
}
const EDU_MITOS = { id: "mitos", cat: "VIAGEM", capa: "Mito ou verdade? Passagem aérea", sub: "O 2º engana muita gente.", slides: [
  ["Aba anônima baixa o preço?", "MITO. Não tem prova disso. O preço muda pela procura e pelas tarifas que ainda restam no voo."],
  ["Existe dia mágico pra comprar?", "MITO. O que existe é promoção relâmpago. No nosso radar, aparecem mais de segunda a quarta."],
  ["Promoção boa dura dias?", "MITO. Muitas somem em horas. Quem tem aviso ligado sai na frente."],
  ["Milha vence?", "VERDADE. A maioria dos programas tem validade. Confira no app antes de perder."],
  ["Ida e volta pode sair mais barata separada?", "VERDADE. Às vezes a ida é melhor numa companhia e a volta em outra. Compare."]] };
const EDU_AERO = EDU.find(x => x.id === "aeroporto");
const TEMPOS = [["Natal", "≈ 1h"], ["Recife", "≈ 1h10"], ["Salvador", "≈ 1h50"], ["Brasília", "≈ 2h40"], ["São Paulo", "≈ 3h30"], ["Lisboa", "≈ 7h"]];
async function semana1() {
  const R = (S.status && S.status.rotas) || {};
  const nRotas = (S.rotas || []).filter(r => r.ativo !== false).length || 40;
  const promos30 = (S.alertas || []).filter(a => a.criado.slice(0, 10) >= diaMenos(hojeISO(), 29)).length;
  const ROD = "Siga @partiu.085 · ative o sininho 🔔";
  const semGrupo = fns => fns.map(fn => async c => { PA.rod = ROD; try { await fn(c); } finally { PA.rod = ""; } });
  const H2 = `\n\n${HASH}`;
  const P = (id, t, titulo_, porque, telas, leg) => ({ id: "aq-" + id, semana: 1, tema: t, grupo: "feed", titulo: titulo_, porque, fmt: telas.length > 1 ? `Carrossel · ${telas.length} telas` : "Feed 4:5", telas: semGrupo(telas), legenda: leg + H2 });
  const deGuia = (g, id, t, titulo_, porque) => ({ ...g, id: "aq-" + id, semana: 1, tema: t, titulo: titulo_, porque, telas: semGrupo(g.telas), legenda: g.legenda.replace(/\n\n🔔[\s\S]*$/, "") + H2 });
  const prefere = async (a, b, na, nb) => { const [ia, ib] = await Promise.all([fotoPronta(a), fotoPronta(b)]); return c => {
    c.fillStyle = COR.navy; c.fillRect(0, 0, PW, PH);
    [[ia, 0], [ib, PW / 2]].forEach(([im, x]) => { if (!im) return; c.save(); c.beginPath(); c.rect(x, 0, PW / 2, PH); c.clip(); const s = Math.max((PW / 2) / im.naturalWidth, PH / im.naturalHeight); c.drawImage(im, x + (PW / 2 - im.naturalWidth * s) / 2, (PH - im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s); c.restore(); });
    let g = c.createLinearGradient(0, 0, 0, 420); g.addColorStop(0, "rgba(8,22,40,.85)"); g.addColorStop(1, "rgba(8,22,40,0)"); c.fillStyle = g; c.fillRect(0, 0, PW, 420);
    g = c.createLinearGradient(0, PH - 520, 0, PH); g.addColorStop(0, "rgba(8,22,40,0)"); g.addColorStop(1, "rgba(8,22,40,.95)"); c.fillStyle = g; c.fillRect(0, PH - 520, PW, 520);
    c.fillStyle = COR.am; c.fillRect(PW / 2 - 3, 340, 6, PH - 480);
    marca(c, PW, true, ""); T(c, "VOCÊ PREFERE?", PW / 2, 290, 120, MARCA.titulo, "#fff", "center");
    c.fillStyle = COR.am; c.beginPath(); c.arc(PW / 2, PH / 2 + 40, 70, 0, 7); c.fill(); T(c, "OU", PW / 2, PH / 2 + 66, 72, MARCA.titulo, COR.tinta, "center");
    [[na, PW / 4, "1"], [nb, PW * .75, "2"]].forEach(([n, x, d]) => { T(c, d, x, PH - 300, 110, MARCA.titulo, COR.am, "center"); T(c, n.toUpperCase(), x, PH - 200, caber(c, n.toUpperCase(), PW / 2 - 60, 76, MARCA.titulo), MARCA.titulo, "#fff", "center"); });
    c.fillStyle = COR.am; rr(c, PW / 2 - 190, PH - 146, 380, 66, 33); c.fill(); T(c, "COMENTA 1 OU 2 👇", PW / 2, PH - 101, 30, MARCA.corpo, COR.tinta, "center", 800); }; };
  const L = [];
  // 1 escuro
  L.push(P("voltamos", "escuro", "Voltamos", "Reacende o perfil sem pedir nada. Quem esqueceu de você volta a te ver.",
    [c => { bgNavy(c, PW, PH); rota(c, PW, PH, COR.am, .25); marca(c, PW, true, "");
      kicker(c, "Depois de um tempo…", M, 330, COR.am);
      T(c, "VOLTAMOS", M - 6, 600, caber(c, "VOLTAMOS", PW - 2 * M, 300, MARCA.titulo, 400, 160), MARCA.titulo, COR.am);
      const y = titulo(c, "E o radar não parou nem um dia", M, 640, PW - 2 * M - 40, 100, 70, "#fff", 2) + 90;
      paragrafo(c, "Tem novidade chegando pra quem viaja saindo de Fortaleza. Ativa o sininho 🔔", M, y, PW - 2 * M - 250, 44, MARCA.corpo, "rgba(255,255,255,.85)", 600, 1.3, 3);
      desenhaImg(c, "mascote", PW - M - 120, PH - 450, 230); rodapeP(c, PW, PH, true, ROD); }],
    "VOLTAMOS ✈️\n\nA gente ficou um tempo quietinho por aqui, mas o radar continuou ligado, olhando preço de passagem saindo de Fortaleza todo santo dia.\n\nEssa semana tem novidade chegando. Ativa o sininho 🔔 pra não perder.\n\n💬 Pra onde você quer viajar em 2027? Conta aqui!"));
  // 2 creme
  L.push(deGuia(guiaTema(EDU_MITOS, "creme", ROD), "mitos", "creme", "Carrossel: mito ou verdade", "Quebra de mito gera discussão nos comentários e muito compartilhamento."));
  // 3 amarelo
  L.push(P("amigo", "amarelo", "Marca aquele amigo", "Marcação traz gente nova pro perfil de graça: cada @ é um convite.",
    [c => capaTema(c, "amarelo", "Sem citar nomes…", "Marca o amigo que sempre diz \"bora viajar\" e nunca vai", "", "", ROD)],
    "SEM CITAR NOMES… 😂\n\nMarca aqui aquele amigo que vive dizendo \"bora viajar\", \"esse ano vai\", \"só esperar a promoção\"… e nunca vai.\n\nEssa semana a gente vai mudar isso. Fica de olho 👀"));
  // 4 escuro (foto)
  L.push(P("prefere1", "escuro", "Você prefere? Natal ou Floripa", "Pergunta fácil de responder: enche os comentários e o algoritmo entrega pra mais gente.", [await prefere("NAT", "FLN", "Natal", "Floripa")],
    "VOCÊ PREFERE? 🤔\n\n1️⃣ Natal: pertinho, praia, camarão e passeio de buggy\n2️⃣ Floripa: 42 praias, lagoa e frio gostoso no inverno\n\nComenta 1 ou 2 e marca quem vai com você 👇"));
  // 5 creme
  L.push(deGuia(guiaTema(EDU_ERROS, "creme", ROD), "erros", "creme", "Carrossel: 5 erros que encarecem a passagem", "Conteúdo que ajuda é o mais salvo e compartilhado: traz seguidor novo."));
  // 6 amarelo — teaser 1
  L.push(P("teaser1", "amarelo", "Teaser 1: tá chegando", "Cria curiosidade e junta lista de interessados: quem comenta EU QUERO recebe o direct automático.", [c => { TEMA.amarelo.bg(c, PW, PH); marca(c, PW, false, "EM BREVE");
    kicker(c, "Tá chegando", M, 250, COR.tinta); titulo(c, "Algo novo pra quem sai do 085", M, 276, PW - 2 * M, 104, 70, COR.tinta, 2);
    const px = 250, pw = 580; celular(c, px, 560, pw, 900);
    notif(c, px + 40, 680, pw - 80, ["PROMOÇÃO ENCONTRADA 🔥", [[0, 180], [196, 120]]], true);
    notif(c, px + 40, 850, pw - 80, ["Fortaleza ➜ ???", [[0, 240], [256, 90]]], false);
    notif(c, px + 40, 1020, pw - 80, ["Ida e volta por R$ ???", [[0, 150]]], false); }],
    "TÁ CHEGANDO… 👀\n\nFaz tempo que a gente vem preparando uma coisa pra quem viaja saindo de Fortaleza. Ela avisa na hora quando aparece passagem barata de verdade.\n\nAinda não posso mostrar tudo. Mas quem comentar EU QUERO aqui embaixo entra na lista e recebe primeiro no direct 📩"));
  // 7 escuro (foto, dados)
  const q = await fQuanto(); if (q) L.push({ ...q, id: "aq-quanto", semana: 1, tema: "escuro", titulo: "Quanto custa voar (dados do radar)", telas: semGrupo(q.telas), legenda: q.legenda.replace(/\n\n🔔[\s\S]*$/, "") + H2 });
  else L.push(P("voltamos2", "escuro", "Pergunta da noite", "Pergunta aberta: comentário puxa alcance.", [c => capaTema(c, "escuro", "Pergunta da noite", "Qual viagem você ainda vai fazer em 2027?", "Responde aqui embaixo. A gente vai caçar a passagem.", "", ROD)], "PERGUNTA DA NOITE 🌙\n\nQual viagem você ainda vai fazer em 2027? Responde aqui que a gente vai caçar a passagem saindo de Fortaleza ✈️"));
  // 8 creme — bastidores
  L.push(P("bastidor", "creme", "Teaser 2: bastidores do radar", "Mostra o sistema trabalhando com números reais: dá credibilidade antes de abrir o grupo.", [c => { bgCreme(c, PW, PH); marca(c, PW, false, "BASTIDORES");
    kicker(c, "Enquanto você dorme…", M, 300, "#C9971C"); let y = titulo(c, "O radar trabalha por você", M, 326, PW - 2 * M, 112, 70, COR.tinta, 2) + 50;
    [[String(nRotas), "destinos vigiados saindo de Fortaleza"], ["24h", "de olho no preço, todo dia, sem parar"], ["8x", "por dia o radar refaz todas as buscas"]]
      .forEach(([n, t]) => { T(c, n, M, y + 110, 130, MARCA.titulo, "#C9971C"); paragrafo(c, t, M + 300, y + 50, PW - 2 * M - 300, 38, MARCA.corpo, COR.tinta, 700, 1.25, 2); y += 200; });
    rodapeP(c, PW, PH, false, "Semana que vem você vai ver"); }],
    `BASTIDORES DO RADAR 🛰️\n\nEnquanto você dorme, ele trabalha:\n\n✈️ ${nRotas} destinos vigiados saindo de Fortaleza\n🔎 Pesquisa de preço o dia inteiro\n🔁 8 buscas completas por dia: quando o preço cai, ele vê\n\nSemana que vem você vai ver como isso chega até você.\n\n💬 Comenta EU QUERO pra entrar na lista.`));
  // 9 amarelo — tempo de voo
  L.push(P("tempo", "amarelo", "Quanto tempo de voo saindo de Fortaleza", "Curiosidade útil e rápida: muito salvo e enviado pra amigos.", [c => { TEMA.amarelo.bg(c, PW, PH); marca(c, PW, false, "CURIOSIDADE");
    kicker(c, "Voo direto, saindo de Fortaleza", M, 260, COR.tinta); let y = titulo(c, "Quanto tempo até lá?", M, 286, PW - 2 * M, 110, 70, COR.tinta, 2) + 30;
    TEMPOS.forEach(([n, t], i) => { T(c, n.toUpperCase(), M, y + 70, 58, MARCA.titulo, COR.tinta); T(c, t, PW - M, y + 70, 58, MARCA.titulo, COR.tinta, "right"); c.fillStyle = "rgba(15,42,71,.18)"; c.fillRect(M, y + 96, PW - 2 * M, 2); y += 104; });
    T(c, "Tempos aproximados de voo direto. Podem variar.", M, y + 40, 22, MARCA.corpo, "rgba(15,42,71,.7)", "left", 600);
    rodapeP(c, PW, PH, false, ROD); }],
    `QUANTO TEMPO DE VOO SAINDO DE FORTALEZA? ⏱️\n\n${TEMPOS.map(([n, t]) => `✈️ ${n}: ${t}`).join("\n")}\n\n(tempos aproximados de voo direto)\n\n💬 Qual desses você faria primeiro?`));
  // 10 escuro (foto)
  L.push(P("prefere2", "escuro", "Você prefere? Lisboa ou Buenos Aires", "Segunda rodada do \"você prefere\": agora internacional.", [await prefere("LIS", "BUE", "Lisboa", "Buenos Aires")],
    "VOCÊ PREFERE? 🌍\n\n1️⃣ Lisboa: voo direto de Fortaleza, pastel de nata e tudo em português\n2️⃣ Buenos Aires: carne, vinho, tango e dá pra ir só com RG\n\nComenta 1 ou 2 👇"));
  // 11 creme
  L.push(deGuia(guiaTema(EDU_AERO, "creme", ROD), "aeroporto", "creme", "Carrossel: checklist do aeroporto", "Checklist é o tipo de post que as pessoas salvam pra usar depois."));
  // 12 amarelo — feriadão
  const perto = [["NAT", "Natal"], ["REC", "Recife"], ["SSA", "Salvador"], ["SLZ", "São Luís"], ["JPA", "João Pessoa"]].filter(([k]) => R[k] && R[k].menor).sort((a, b) => R[a[0]].menor - R[b[0]].menor).slice(0, 3);
  L.push(P("feriadao", "amarelo", "Feriadão de Finados (2/11)", "Data próxima = urgência: muita gente procurando viagem curta.", [c => { TEMA.amarelo.bg(c, PW, PH); marca(c, PW, false, "FERIADÃO");
    kicker(c, "31/10 a 2/11", M, 300, COR.tinta); let y = titulo(c, "Feriadão chegando. Pra onde dá pra ir?", M, 326, PW - 2 * M, 110, 70, COR.tinta, 3) + 40;
    (perto.length ? perto : [["NAT", "Natal"], ["REC", "Recife"], ["SSA", "Salvador"]]).forEach(([k, n], i) => { linhaLista(c, PW, y, String(i + 1).padStart(2, "0"), n.toUpperCase(), "voo curto saindo de Fortaleza", R[k] && R[k].menor ? brl(R[k].menor) : "", R[k] && R[k].menor ? "o trecho, menor preço visto" : "", false, 140); y += 140; });
    T(c, "Preços mudam a toda hora. Confira antes de comprar.", M, y + 40, 22, MARCA.corpo, "rgba(15,42,71,.7)", "left", 600);
    rodapeP(c, PW, PH, false, ROD); }],
    `FERIADÃO DE FINADOS CHEGANDO 🗓️ (31/10 a 2/11)\n\n3 destinos de voo curto saindo de Fortaleza:\n\n${(perto.length ? perto : [["NAT", "Natal"], ["REC", "Recife"], ["SSA", "Salvador"]]).map(([k, n]) => `✈️ ${n}${R[k] && R[k].menor ? `: trecho a partir de ${brl(R[k].menor)} (menor preço que o radar viu)` : ""}`).join("\n")}\n\nPreços mudam a toda hora. 💬 Qual você escolheria?`));
  // 13 escuro — teaser 3 com achado real
  const ach = (S.alertas || []).filter(a => a.criado >= isoLocal(new Date(Date.now() - 24 * 36e5)).slice(0, 16) && !(a.conferido && a.conferido.status === "subiu") && (typeof ivBarato !== "function" || ivBarato(a))).sort((a, b) => b.desconto - a.desconto)[0];
  L.push(P("teaser3", "escuro", "Teaser 3: olha o que o radar achou", "Prova real: mostra um achado de verdade e promete que semana que vem chega na hora.", [c => { bgNavy(c, PW, PH); marca(c, PW, true, "ACHADO REAL");
    kicker(c, "Essa semana o radar achou", M, 330); let y = titulo(c, ach ? `Fortaleza ➜ ${ach.destino_nome}` : "Promoção de verdade", M, 356, PW - 2 * M, 120, 76, "#fff", 2) + 40;
    if (ach) { const rt = ach.preco + (ach.preco_volta || 0); T(c, brl(rt), M - 4, y + 150, 170, MARCA.titulo, COR.am); T(c, ach.preco_volta ? "ida e volta" : "o trecho", M, y + 210, 34, MARCA.corpo, "#fff", "left", 700);
      T(c, `Visto pelo radar em ${ach.criado.slice(8, 10)}/${ach.criado.slice(5, 7)} às ${ach.criado.slice(11, 16)} · preço pode mudar`, M, y + 270, 28, MARCA.corpo, COR.cinza, "left", 600); }
    paragrafo(c, "Semana que vem, isso chega no seu celular na hora em que aparece.", M, PH - 330, PW - 2 * M - 240, 36, MARCA.corpo, "#fff", 700, 1.3, 3);
    desenhaImg(c, "mascote", PW - M - 120, PH - 450, 230); rodapeP(c, PW, PH, true, ROD); }],
    `OLHA O QUE O RADAR ACHOU ESSA SEMANA 👀\n\n${ach ? `✈️ Fortaleza ➜ ${ach.destino_nome}\n💰 ${brl(ach.preco + (ach.preco_volta || 0))} ${ach.preco_volta ? "ida e volta" : "o trecho"}\n🕐 Visto pelo radar em ${ach.criado.slice(8, 10)}/${ach.criado.slice(5, 7)} às ${ach.criado.slice(11, 16)} (preço muda a toda hora)\n\n` : ""}Promoção assim some em horas. Semana que vem você vai receber na hora em que aparecer.\n\n💬 Comenta EU QUERO que eu te mando primeiro no direct 📩`));
  // 14 creme — contagem
  L.push(P("contagem", "creme", "Segunda abre (teaser final)", "Fecha a semana com data marcada: quem está curioso ativa o sininho e volta na segunda.", [c => { const k = TEMA.creme; k.bg(c, PW, PH); marca(c, PW, false, "CONTAGEM");
    kicker(c, "Anota aí", M, 330, k.kk); const y = titulo(c, "Segunda-feira abre. E é de graça.", M, 356, PW - 2 * M, 130, 80, k.tx, 3) + 70;
    ["Passagem barata saindo de FOR", "Aviso na hora, no celular", "Ida e volta de verdade"].forEach((it, i) => { bola(c, M + 20, y + i * 70 - 12); T(c, it, M + 60, y + i * 70, 36, MARCA.corpo, k.tx, "left", 700); });
    desenhaImg(c, "mascote", PW - M - 120, PH - 450, 230); rodapeP(c, PW, PH, false, ROD); }],
    "SEGUNDA-FEIRA ABRE 🗓️\n\nO que a gente vem preparando chega segunda. De graça.\n\n✅ Passagem barata saindo de Fortaleza\n✅ Aviso na hora, direto no seu celular\n✅ Ida e volta de verdade, sem pegadinha\n\nComenta EU QUERO que eu te mando primeiro no direct 📩"));
  const COR_N = { escuro: "🟦", creme: "⬜", amarelo: "🟨" };
  return L.map((p, i) => ({ ...p, ordem: i, tipo: `Dia ${Math.floor(i / 2) + 1} · ${i % 2 ? "19h" : "12h"} ${COR_N[p.tema] || ""}` }));
}
const STORIES_S1 = [
  "Todo dia: 1 story com enquete ou caixinha (ex.: \"Pra onde você quer ir em 2027?\", \"Você já perdeu promoção por demorar?\"). Responda as respostas: isso aumenta o alcance.",
  "Dia 3 e dia 7: compartilhe o post do teaser no story com o texto \"Comenta EU QUERO lá 👀\".",
  "Dia 5: grave 10 segundos mostrando o painel/alertas no celular, sem mostrar os preços: \"olha o que vem aí\".",
];

/* ================= campanha de lançamento (semana 2) ================= */
async function campanha() {
  const simples = (id, titulo_, porque, desenhar, leg) => ({ id: "camp-" + id, grupo: "feed", tipo: "Lançamento", titulo: titulo_, porque, fmt: "Feed 4:5", telas: [desenhar], legenda: legenda(leg) });
  const L = [
    simples("chegou", "Chegou o Partiu 085", "Apresenta a marca e a promessa.", c => { bgNavy(c, PW, PH); marca(c, PW, true, "NOVIDADE");
      kicker(c, "Radar de passagens", M, 420); const y = titulo(c, "Passagem barata saindo de Fortaleza, sem você procurar", M, 446, PW - 2 * M, 120, 76, "#fff", 4) + 60;
      paragrafo(c, "A gente olha os preços o dia todo, compara com o normal de cada rota e avisa quando é promoção de verdade.", M, y, PW - 2 * M - 200, 36, MARCA.corpo, COR.cinza, 600, 1.35, 4);
      desenhaImg(c, "mascote", PW - M - 120, PH - 450, 230); rodapeP(c, PW, PH, true, "Siga e ative as notificações"); },
      "✈️ CHEGOU O PARTIU 085\n\nUm radar de passagens feito pra quem sai de Fortaleza. A gente pesquisa os preços o dia todo, compara com o preço normal de cada rota e avisa quando aparece promoção de verdade.\n\nAqui no perfil: guias, promoções de milhas e os destinos mais baratos.\nNo grupo grátis: os alertas na hora."),
    simples("como", "Como funciona o radar", "Dá credibilidade explicando o processo.", c => { bgCreme(c, PW, PH); marca(c, PW, false, "COMO FUNCIONA");
      let y = titulo(c, "Como o radar trabalha por você", M, 290, PW - 2 * M, 110, 70, COR.tinta, 2) + 30;
      [["Pesquisa", "Olha os preços saindo de Fortaleza pra dezenas de destinos, várias vezes por dia."], ["Compara", "Vê se o preço está abaixo do normal daquela rota, na ida e na volta."], ["Avisa", "Se for promoção de verdade, manda no grupo com as datas mais baratas."]]
        .forEach(([h, s], i) => { T(c, String(i + 1).padStart(2, "0"), M, y + 70, 90, MARCA.titulo, "#C9971C"); T(c, h.toUpperCase(), M + 150, y + 40, 50, MARCA.titulo, COR.tinta); paragrafo(c, s, M + 150, y + 90, PW - 2 * M - 150, 30, MARCA.corpo, COR.tinta, 600, 1.35, 3); y += 230; });
      rodapeP(c, PW, PH, false); },
      "🤖 COMO O RADAR DO PARTIU 085 FUNCIONA\n\n1️⃣ Pesquisa os preços saindo de Fortaleza várias vezes por dia\n2️⃣ Compara com o preço normal de cada rota (ida e volta)\n3️⃣ Quando é promoção de verdade, avisa no grupo com as datas mais baratas\n\nSe não está barato, não vai pro grupo."),
  ];
  const sem = fSemana(); if (sem) L.push({ ...sem, id: "camp-semana", titulo: "O que o radar achou" });
  L.push({ ...fGuia(EDU[0]), id: "camp-g1", titulo: "Guia: milhas ou pontos?" });
  const q = await fQuanto(); if (q) L.push({ ...q, id: "camp-quanto" });
  L.push({ ...fGuia(EDU[4]), id: "camp-g2", titulo: "Guia: 5 hábitos" });
  const op = await fOportunidade(); if (op) L.push({ ...op, id: "camp-op" });
  L.push({ ...fGuia(EDU[9]), id: "camp-g3", titulo: "Guia: checklist do aeroporto" });
  L.push(simples("grupo", "Grupo grátis + notificações", "Fecha pedindo as duas ações mais importantes.", c => { bgNavy(c, PW, PH); marca(c, PW, true, "GRÁTIS");
    kicker(c, "Promoção boa some em horas", M, 420); let y = titulo(c, "Entra no grupo e ativa as notificações", M, 446, PW - 2 * M, 120, 76, "#fff", 3) + 70;
    ["Passagens em dinheiro", "Promoções de milhas", "Datas mais baratas de ida e volta"].forEach(it => { bola(c, M + 20, y - 12); T(c, it, M + 60, y, 36, MARCA.corpo, "#fff", "left", 700); y += 70; });
    desenhaImg(c, "mascote", PW - M - 120, PH - 450, 230); rodapeP(c, PW, PH, true, "Link do grupo na bio"); },
    "🔔 PROMOÇÃO BOA SOME EM HORAS\n\nEntra no grupo grátis e ativa as notificações do perfil pra não perder a próxima.\n\n✅ Passagens em dinheiro\n✅ Promoções de milhas\n✅ Datas mais baratas de ida e volta"));
  const S1 = await semana1();
  return S1.concat(L.map((p, i) => ({ ...p, semana: 2, titulo: `${i + 1}. ${p.titulo}` })));
}
const STORIES_LEO = [
  "Story 1 (vídeo falando): \"Gente, criei um radar que avisa quando aparece passagem barata saindo de Fortaleza. Vou mostrar como funciona.\"",
  "Story 2 (print de um alerta real do grupo): \"Olha esse que saiu essa semana 👀\" + enquete \"Você iria? Sim / Com certeza\"",
  "Story 3 (link): \"É de graça. Entra no grupo e segue o @partiu.085\" + adesivo de LINK do grupo + menção @partiu.085",
];

/* ================= notícias (novidade do aeroporto, rota nova, etc.) ================= */
const DIAS_SEM_RE = /(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo|diári[oa]s?|diariamente|semanais?|por semana)/i;
function extrairPontos(texto) {
  const nomes = S.rotas.map(r => r.nome.toLowerCase());
  return String(texto || "").split(/\n+|(?<=[.!])\s+/).map(x => x.replace(/^[\s•\-–✈️📍🛫*]+/, "").trim())
    .filter(x => x.length > 8 && x.length < 140 && (DIAS_SEM_RE.test(x) || /\d/.test(x) || nomes.some(n => x.toLowerCase().includes(n)))).slice(0, 5).join("\n");
}
function noticiaHTML() {
  const N = PA.nt;
  if (!PA.noticias || !PA.ntOcultas) Promise.all([getJSON("noticias.json", { itens: [] }), carregarOcultas()]).then(([d]) => { PA.noticias = d.itens || []; if (location.hash.startsWith("#pauta") && PA.aba === "noticia") render(); });
  const h = hojeISO(), todas = (PA.noticias || []).map((x, i) => ({ x, i, v: validadeNoticia(x) }));
  const lista = todas.filter(o => !ntOculta(o.x) && o.v.ate >= h).slice(0, 14), velhas = todas.filter(o => ntOculta(o.x) || o.v.ate < h);
  const linha = ({ x, i, v }, viva) => `<div class="pa-ni ${PA.ntSel === i ? "on" : ""} ${viva ? "" : "velha"}">${x.img ? `<img class="pa-nimg" src="${esc(x.img)}" alt="" loading="lazy">` : `<span class="pa-nimg vazio">${ntCategoria(x) === "MILHAS" ? "💳" : "✈️"}</span>`}<div><b>${esc(x.titulo)}</b><small>${esc(x.fonte || "")} · ${x.data ? dataCurta(x.data.slice(0, 10)).toLowerCase() : ""} · <span class="${viva ? (v.ate === h ? "neg" : "pos") : ""}">${ntOculta(x) ? "removida" : viva ? (v.ate === h ? "último dia pra postar" : `vale até ${v.ate.slice(8, 10)}/${v.ate.slice(5, 7)}`) : "passou"}${v.explicita ? " (data da promoção)" : ""}</span></small></div>
      <a class="bt sm ghost" href="${esc(x.link_real || x.link)}" target="_blank" rel="noopener">${ic("ext")}Abrir</a>${viva ? `<button class="bt sm ghost" data-act="ntrem" data-i="${i}" title="tirar da lista">✕</button><button class="bt sm ${PA.ntSel === i ? "ok" : "pri"}" data-act="ntusar" data-i="${i}">${PA.ntSel === i ? "✓ Abaixo" : "Criar post"}</button>` : ntOculta(x) ? `<button class="bt sm" data-act="ntvolta" data-i="${i}">Voltar</button>` : ""}</div>`;
  return `<div class="card pa-nt"><h3>📰 Notícias pra postar</h3>
    <div class="desc">O robô atualiza a lista várias vezes por dia. Aqui só aparece o que ainda está quente: <b>notícia vale no dia e no dia seguinte</b>, e promoção com data (ex.: "até 12/10") some sozinha depois do último dia. Já postou ou não quer? Toque no ✕.</div>
    ${PA.noticias == null ? `<div class="vazio">Carregando…</div>` : lista.length ? `<div class="pa-nl">${lista.map(o => linha(o, true)).join("")}</div>` : `<div class="vazio">Nenhuma notícia quente agora. O robô procura de novo na próxima rodada.</div>`}
    ${velhas.length ? `<details class="pa-velhas"><summary>Antigas e removidas (${velhas.length})</summary><div class="pa-nl">${velhas.slice(0, 20).map(o => linha(o, false)).join("")}</div></details>` : ""}
  </div>
  <details class="card pa-nt" id="pa-man" ${N.titulo ? "open" : ""}><summary><b>Montar arte da notícia</b></summary>
    <div class="form pa-nt-f" style="margin-top:12px">
      <div class="field"><label>Fonte (aparece na arte)</label><input data-nt="fonte" value="${esc(N.fonte)}" placeholder="@aeroportodefortaleza"></div>
      <div class="field"><label>Etiqueta</label><input data-nt="kicker" value="${esc(N.kicker)}"></div>
      <div class="field" style="grid-column:1/-1"><label>Título da arte</label><input data-nt="titulo" value="${esc(N.titulo)}" placeholder="Ex.: Novo voo direto Fortaleza ➜ Recife"></div>
      <div class="field" style="grid-column:1/-1"><label>Pontos principais (1 por linha)</label><textarea data-nt="pontos" rows="4" placeholder="Ex.: Voos às segundas, quartas e sextas&#10;Começa em dezembro">${esc(N.pontos)}</textarea></div>
      <div class="field"><label>Foto de fundo (opcional)</label><input type="file" accept="image/*" data-nt-foto></div>
      <div class="field" style="align-self:end"><button class="bt pri" data-act="ntgerar">Gerar arte</button></div>
    </div></details>`;
}


/* validade das notícias: some sozinha depois da data da promoção (ex.: "até 12/10") ou no dia seguinte ao que foi publicada */
const MESN = { janeiro: 1, fevereiro: 2, "março": 3, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 };
const MESRE = "(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)";
function validadeNoticia(x) {
  const t = (x.titulo + " " + (x.resumo || "")).toLowerCase(), pub = (x.data || new Date().toISOString()).slice(0, 10);
  const mk = (d, m) => { d = +d; if (!(d >= 1 && d <= 31)) return null; let y = +pub.slice(0, 4), mm = m ? +m : +pub.slice(5, 7); if (!(mm >= 1 && mm <= 12)) return null;
    let r = `${y}-${String(mm).padStart(2, "0")}-${String(d).padStart(2, "0")}`; if (r < pub) { if (m) r = `${y + 1}${r.slice(4)}`; else { mm = mm === 12 ? 1 : mm + 1; if (mm === 1) y++; r = `${y}-${String(mm).padStart(2, "0")}-${String(d).padStart(2, "0")}`; } } return r; };
  let m, r = null;
  if ((m = t.match(/at[ée] (?:o dia |dia )?(\d{1,2})\/(\d{1,2})/))) r = mk(m[1], m[2]);
  else if ((m = t.match(new RegExp(`at[ée] (?:o dia |dia )?(\\d{1,2}) de ${MESRE}`)))) r = mk(m[1], MESN[m[2]]);
  else if ((m = t.match(new RegExp(`\\b(?:de|entre) \\d{1,2}(?:/\\d{1,2})? (?:a|e|até) (\\d{1,2})(?:/(\\d{1,2})| de ${MESRE})?`)))) r = mk(m[1], m[2] || (m[3] ? MESN[m[3]] : null));
  else if ((m = t.match(/at[ée] (?:o dia |dia |a )?(\d{1,2})\b(?!\s?(?:%|mil|h\b|horas|dias|vezes|meses|anos|x\b|pontos|milhas|reais|voos))/))) r = mk(m[1], null);
  return { ate: r || diaMenos(pub, -1), explicita: !!r };
}
function ntChave(x) { return x.link || x.titulo; }
function ntOculta(x) { return (PA.ntOcultas || []).includes(ntChave(x)); }
function noticiasValidas() { const h = hojeISO(); return (PA.noticias || []).filter(x => !ntOculta(x) && validadeNoticia(x).ate >= h); }
async function salvarOcultas() { try { localStorage.setItem("p085_nt_ocultas", JSON.stringify(PA.ntOcultas)); } catch (e) { }
  if (token()) { try { await salvarArquivo("docs/noticias_ocultas.json", { ocultas: PA.ntOcultas.slice(-300) }, "Notícias: remove da lista"); } catch (e) { toast("Removida só neste aparelho: " + e.message); } } }
async function carregarOcultas() { if (PA.ntOcultas) return; let L = []; try { L = JSON.parse(localStorage.getItem("p085_nt_ocultas")) || []; } catch (e) { }
  const d = await getJSON("noticias_ocultas.json", { ocultas: [] }); PA.ntOcultas = [...new Set([...(d.ocultas || []), ...L])]; }

/* ================= notícia premium (foto real da matéria ou foto do destino, título limpo, resumo) ================= */
const FOTOS_OK = "AJU AMS BCN BEL BHZ BOG BPS BSB BUE CGB CGR CTG CUN CWB FEN FLN FRA GYN IGU JDO JPA LIM LIS LON MAD MAO MCZ MDE MIA MIL MVD NAT NVT NYC OPO ORL PAR POA PTY PUJ REC RIO ROM SAO SCL SDQ SID SLZ SSA UDI VCP VIX".split(" ");
const PROG_NT = [[/latam pass|latam/i, "LATAM Pass", "#C8102E"], [/azul fidelidade|azul/i, "Azul Fidelidade", "#0B4EA2"], [/smiles|\bgol\b/i, "Smiles", "#F26B21"], [/livelo/i, "Livelo", "#D6006E"], [/esfera/i, "Esfera", "#CC092F"], [/\btap\b/i, "TAP", "#1D7A3A"]];
function ntCategoria(x) { return /pontos|milhas|b[oô]nus|transfer|livelo|esfera|smiles|fidelidade|latam pass/i.test(x.titulo) ? "MILHAS" : /aeroporto/i.test(x.titulo) ? "AEROPORTO" : "AVIAÇÃO · CEARÁ"; }
function ntTitulo(t) { t = String(t || "").replace(/\s+[-|–]\s+[^-|–]{2,40}$/, "").trim(); if (t.length <= 92) return t;
  const corte = Math.max(t.lastIndexOf(";", 92), t.lastIndexOf(":", 92), t.lastIndexOf(",", 92)); return corte > 45 ? t.slice(0, corte) : curto(t, 92); }
function ntResumo(x) { const r = String(x.resumo || "").replace(/\s+/g, " ").replace(/(Leia mais|Continue lendo|The post|O post).*$/i, "").trim();
  const fr = r.split(/(?<=[.!?])\s+/).filter(f => f.length > 25 && !x.titulo.toLowerCase().startsWith(f.toLowerCase().slice(0, 30))); return fr.slice(0, 2).join(" ").slice(0, 230); }
function ntFotoIata(x) { const t = sem(x.titulo + " " + (x.resumo || ""));
  for (const k of FOTOS_OK) { const n = sem((IATA[k] || "").split(" (")[0]); if (n && n.length > 3 && t.includes(n)) return k; } return ""; }
function sem(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
function ntImg(src) { return new Promise(ok => { if (!src) return ok(null); const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; }); }
function heroPrograma(c, W, H, prog) {
  c.fillStyle = prog[2]; c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(W * .8, H * .1, 20, W * .8, H * .1, W); g.addColorStop(0, "rgba(255,255,255,.22)"); g.addColorStop(1, "rgba(0,0,0,.25)"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.save(); c.globalAlpha = .12; for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(W * .85, H * .2, 120 + i * 90, 0, 7); c.strokeStyle = "#fff"; c.lineWidth = 3; c.stroke(); } c.restore();
  T(c, prog[1].toUpperCase(), M, H * .42, caber(c, prog[1].toUpperCase(), W - 2 * M, 150, MARCA.titulo, 400, 70), MARCA.titulo, "rgba(255,255,255,.95)");
}
function heroAviao(c, W, H) {
  const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#1F5FBF"); g.addColorStop(1, "#0B2440"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.save(); c.globalAlpha = .18; c.strokeStyle = "#fff"; c.lineWidth = 3; c.setLineDash([16, 18]);
  [[.05, .9, .5, .2, 1.05, .35], [-.05, .5, .4, .05, 1.1, .1], [.1, 1.1, .7, .6, 1.05, .7]].forEach(([a, b, cc, d, e, f]) => { c.beginPath(); c.moveTo(W * a, H * b); c.quadraticCurveTo(W * cc, H * d, W * e, H * f); c.stroke(); }); c.restore();
  aviao(c, W * .7, H * .38, Math.min(W, H) * .42, "rgba(255,255,255,.92)", -Math.PI / 7);
}
async function postsDaNoticia(x) {
  const cat = ntCategoria(x), tit = ntTitulo(x.titulo), res = ntResumo(x), prog = PROG_NT.find(p => p[0].test(x.titulo));
  const iata = x.img ? "" : ntFotoIata(x);
  const im = await ntImg(x.img || (iata ? `fotos/${iata}.jpg` : ""));
  const credito = x.img ? `Foto: ${x.fonte}` : iata ? "Foto ilustrativa" : "";
  const tema = ["escuro", "creme", "amarelo"][[...(x.link || tit)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 9973, 7) % 3], K = TEMA[tema];
  const BASE = tema === "escuro" ? [11, 36, 64] : tema === "creme" ? [246, 241, 228] : [245, 197, 49], base = `rgb(${BASE})`, baseA = a => `rgba(${BASE},${a})`;
  const desenha = (W, H, story) => c => {
    const hh = Math.round(H * (story ? .46 : .44));
    if (im) { c.fillStyle = COR.navy; c.fillRect(0, 0, W, H); const s = Math.max(W / im.naturalWidth, (hh + 160) / im.naturalHeight); c.drawImage(im, (W - im.naturalWidth * s) / 2, 0, im.naturalWidth * s, im.naturalHeight * s); }
    else { c.save(); c.beginPath(); c.rect(0, 0, W, hh + 160); c.clip(); prog && cat === "MILHAS" ? heroPrograma(c, W, hh + 160, prog) : heroAviao(c, W, hh + 160); c.restore(); c.fillStyle = COR.navy; c.fillRect(0, hh + 160, W, H); }
    let g = c.createLinearGradient(0, 0, 0, 300); g.addColorStop(0, "rgba(8,22,40,.7)"); g.addColorStop(1, "rgba(8,22,40,0)"); c.fillStyle = g; c.fillRect(0, 0, W, 300);
    g = c.createLinearGradient(0, hh - 220, 0, hh + 170); g.addColorStop(0, baseA(0)); g.addColorStop(.75, baseA(.97)); g.addColorStop(1, base); c.fillStyle = g; c.fillRect(0, hh - 220, W, 400);
    c.fillStyle = base; c.fillRect(0, hh + 170, W, H); if (tema !== "escuro") grao(c, W, H, .03, "#0F2A47");
    marca(c, W, true, "NOTÍCIA");
    if (credito) T(c, credito, W - M, hh - 30, 20, MARCA.corpo, "rgba(255,255,255,.7)", "right", 600);
    const fim = story ? H - 380 : H - 190;   // onde acaba o espaço de texto (antes da fonte e do rodapé)
    kicker(c, cat, M, hh + 40, tema === "escuro" ? COR.am : COR.tinta);
    let y = titulo(c, tit, M, hh + 60, W - 2 * M, story ? 104 : 86, 54, K.tx, 4) + 34;
    const fs = story ? 38 : 31, lh = fs * 1.32, cabe = Math.floor((fim - 50 - y) / lh);
    if (res && cabe >= 2) { const n = Math.min(story ? 5 : 4, cabe); c.fillStyle = tema === "escuro" ? COR.am : COR.tinta; c.fillRect(M, y, 6, n * lh + 6); y = paragrafo(c, res, M + 30, y + fs, W - 2 * M - 30, fs, MARCA.corpo, K.dk ? "rgba(255,255,255,.86)" : "rgba(15,42,71,.85)", 600, 1.32, n); }
    const t = `FONTE: ${String(x.fonte || "").toUpperCase()}`; c.font = `800 20px ${MARCA.corpo}`; const fw = c.measureText(t).width + 48, fy = Math.min(y + 24, fim);
    c.strokeStyle = K.dk ? "rgba(255,255,255,.35)" : "rgba(15,42,71,.35)"; c.lineWidth = 2; rr(c, M, fy, fw, 42, 21); c.stroke(); T(c, t, M + 22, fy + 28, 20, MARCA.corpo, K.dk ? "rgba(255,255,255,.8)" : "rgba(15,42,71,.8)", "left", 800, 1.5);
    if (story) espacoLink(c, W, H); else rodapeP(c, W, H, K.dk, "Siga @partiu.085 · ative o sininho 🔔");
  };
  const leg = `📰 ${tit.toUpperCase()}\n\n${res || ""}${res ? "\n\n" : ""}Fonte: ${x.fonte}\n\n💬 O que você achou dessa novidade? Comenta aqui!\n\n${HASH}`;
  const id = "nt-" + (x.link || tit).replace(/\W+/g, "").slice(-28);
  const valido = validadeNoticia(x).ate;
  return [{ id, valido, grupo: "feed", tipo: "Notícia", rot: "Notícia", titulo: `Notícia: ${curto(tit, 60)}`, porque: "Notícia quente: poste o quanto antes (dá pra agendar pra daqui a 10 min).", fmt: "Feed 4:5", telas: [desenha(PW, PH, false)], legenda: leg, noticia: true },
    { id: id + "-st", grupo: "stories", tipo: "Notícia", titulo: "Notícia · story", porque: "Versão pro story, com espaço pro link do grupo.", fmt: "Story 9:16", stories: true, telas: [desenha(SW, SH, true)], legenda: `Adesivo de LINK: ${linkGrupo()}` }];
}

/* arte de notícia: foto real da matéria em cima, manchete inteira, resumo e fonte */
function artNoticia(N, im, story) {
  return c => { const W = story ? SW : PW, H = story ? SH : PH, fh = Math.round(H * (story ? .5 : .56));
    c.fillStyle = COR.navy; c.fillRect(0, 0, W, H);
    if (im) { const s = Math.max(W / im.naturalWidth, (fh + 180) / im.naturalHeight); c.drawImage(im, (W - im.naturalWidth * s) / 2, (fh + 180 - im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s);
      let g = c.createLinearGradient(0, 0, 0, 300); g.addColorStop(0, "rgba(8,22,40,.75)"); g.addColorStop(1, "rgba(8,22,40,0)"); c.fillStyle = g; c.fillRect(0, 0, W, 300);
      g = c.createLinearGradient(0, fh - 380, 0, fh + 180); g.addColorStop(0, "rgba(11,36,64,0)"); g.addColorStop(.7, "rgba(11,36,64,.94)"); g.addColorStop(1, COR.navy); c.fillStyle = g; c.fillRect(0, fh - 380, W, 560);
      c.fillStyle = COR.navy; c.fillRect(0, fh + 178, W, H); }
    else { bgNavy(c, W, H); rota(c, W, H, COR.am, .22); }
    marca(c, W, true, "NOTÍCIA");
    const y0 = im ? fh - 30 : (story ? 600 : 420);
    kicker(c, N.kicker || "Novidade", M, y0, COR.am);
    let y = titulo(c, N.titulo || "", M, y0 + 20, W - 2 * M, story ? 112 : 92, 50, "#fff", 4) + 34;
    if (N.pontos) y = paragrafo(c, N.pontos.replace(/\n/g, " "), M, y + 10, W - 2 * M, story ? 40 : 33, MARCA.corpo, "rgba(255,255,255,.86)", 600, 1.36, story ? 6 : 4) + 10;
    if (N.fonte) { const t = `FONTE: ${N.fonte.toUpperCase()}${N.data ? " · " + N.data : ""}`; c.font = `800 20px ${MARCA.corpo}`; const w = c.measureText(t).width + 50;
      const fy = Math.min(y + 30, H - (story ? 380 : 210)); c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 2; rr(c, M, fy, w, 44, 22); c.stroke(); T(c, t, M + 22, fy + 29, 20, MARCA.corpo, "rgba(255,255,255,.8)", "left", 800, 1.5); }
    if (story) espacoLink(c, W, H); else rodapeP(c, W, H, true, "Siga @partiu.085 · ative o sininho 🔔"); };
}
function legendaNoticia(N) { return `📰 ${(N.titulo || "").toUpperCase()}\n\n${N.pontos || ""}${N.fonte ? `\n\nFonte: ${N.fonte}` : ""}\n\n💬 O que você achou dessa? Comenta aqui!\n\n${HASH}`; }
async function postNoticia() {
  if (PA.ntSel != null && (PA.noticias || [])[PA.ntSel]) return postsDaNoticia(PA.noticias[PA.ntSel]);
  const N = PA.nt; if (!N.titulo && !N.pontos) return [];
  const im = await carregarFoto(N.foto);
  const leg = legendaNoticia(N);
  return [{ id: "nt-feed-" + (N.titulo || "x").slice(0, 30), grupo: "feed", tipo: "Notícia", titulo: "Notícia · feed", porque: "Novidade do aeroporto/companhias: mostra que o perfil está sempre por dentro.", fmt: "Feed 4:5", telas: [artNoticia(N, im, false)], legenda: leg },
    { id: "nt-story-" + (N.titulo || "x").slice(0, 30), grupo: "stories", tipo: "Notícia", titulo: "Notícia · story", porque: "Versão rápida pro story, com espaço pro link do grupo.", fmt: "Story 9:16", stories: true, telas: [artNoticia(N, im, true)], legenda: `Adesivo de LINK: ${linkGrupo()}` }];
}
document.addEventListener("input", e => { const k = e.target.dataset && e.target.dataset.nt; if (k) PA.nt[k] = e.target.value; });
document.addEventListener("change", e => { if (e.target.dataset && e.target.dataset.ntFoto !== undefined) { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { PA.nt.foto = r.result; toast("Foto carregada. Toque em Gerar arte."); }; r.readAsDataURL(f); } });
document.addEventListener("click", e => { const b = e.target.closest('[data-act^="nt"]'); if (!b) return;
  if (b.dataset.act === "ntextrair") { PA.nt.pontos = extrairPontos(PA.nt.texto); if (!PA.nt.titulo) PA.nt.titulo = curto((PA.nt.texto.split(/\n|[.!]\s/).map(x => x.trim()).find(x => x.length > 15) || ""), 60); render(); }
  else if (b.dataset.act === "ntgerar") { PA.ntSel = null; if (!PA.nt.titulo && !PA.nt.pontos) { toast("Preencha o título ou os pontos."); return; } render(); }
  else if (b.dataset.act === "ntrem" || b.dataset.act === "ntvolta") { const x = (PA.noticias || [])[+b.dataset.i]; if (!x) return; const k = ntChave(x);
    PA.ntOcultas = b.dataset.act === "ntrem" ? [...new Set([...(PA.ntOcultas || []), k])] : (PA.ntOcultas || []).filter(z => z !== k); if (PA.ntSel === +b.dataset.i) PA.ntSel = null; salvarOcultas(); render(); }
  else if (b.dataset.act === "ntusar") { if (!(PA.noticias || [])[+b.dataset.i]) return; PA.ntSel = +b.dataset.i; render(); setTimeout(() => { const g = document.getElementById("pa-grade"); if (g) g.scrollIntoView({ behavior: "smooth" }); }, 500); } });


/* ================= 🗓️ montar calendário: escolher, ordenar e agendar ================= */
const CAL = { f: "todos", thumbs: {}, legs: {}, aberto: "" };
const mcLer = (k, p) => { try { return JSON.parse(localStorage.getItem(k)) || p; } catch (e) { return p; } };
const mcGravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
CAL.sel = mcLer("p085_mc_sel", []); CAL.feitos = mcLer("p085_mc_feitos", {});
CAL.reels = mcLer("p085_mc_reels", false); CAL.arr = 0; CAL.ini = ""; CAL.hs = mcLer("p085_mc_hs", "12:00, 19:00"); CAL.ok = true;
const CAL_F = [["todos", "Tudo"], ["s1", "🚀 Semana 1"], ["s2", "🚀 Semana 2"], ["noticias", "📰 Notícias"], ["dia", "Do dia"], ["guias", "Guias"]];
function mcGrupo(p) { return p.semana === 1 ? "s1" : p.semana === 2 ? "s2" : p.noticia ? "noticias" : p.id.startsWith("f-guia") ? "guias" : "dia"; }
async function mcTodos() {
  const vistos = new Set(), L = [];
  const add = (arr, rot) => arr.filter(Boolean).forEach(p => { if (p.stories || vistos.has(p.id)) return; vistos.add(p.id); L.push({ ...p, rot }); });
  add(await campanha(), "");
  add((await ideiasHoje()).filter(p => p.grupo === "feed"), "Do dia");
  add(EDU.map(x => fGuia(x)), "Guia");
  if (!PA.noticias) PA.noticias = (await getJSON("noticias.json", { itens: [] })).itens || [];
  await carregarOcultas();
  for (const x of noticiasValidas().slice(0, 10)) add([(await postsDaNoticia(x))[0]], "Notícia");
  return L.map(p => ({ ...p, rot: p.semana === 1 ? "Semana 1" : p.semana === 2 ? "Semana 2" : p.noticia ? "Notícia" : p.rot }));
}
function mcCard(p, i) {
  const n = CAL.sel.indexOf(p.id), f = CAL.feitos[p.id], vivo = aoVivo(p);
  return `<div class="mc-card ${n >= 0 ? "on" : ""}" draggable="true" data-id="${esc(p.id)}" data-g="${mcGrupo(p)}" ${CAL.f !== "todos" && CAL.f !== mcGrupo(p) ? "hidden" : ""}>
    <div class="mc-img" data-act="mcver" data-id="${esc(p.id)}" title="ver o post"><canvas id="mc-cv-${i}" width="${PW}" height="${PH}"></canvas>${p.telas.length > 1 ? `<span class="mc-n">${p.telas.length} telas</span>` : ""}${n >= 0 ? `<span class="mc-pos">${n + 1}</span>` : ""}<span class="mc-lupa">🔍 ver</span></div>
    <div class="mc-i"><small>${esc(p.rot || p.tipo)}${vivo ? ` · <b class="mc-vivo">💲 só pra hoje</b>` : ""}${p.valido ? ` · <b class="mc-vivo">vale até ${p.valido.slice(8, 10)}/${p.valido.slice(5, 7)}</b>` : ""}${f ? ` · <b class="pos">agendado ${f.slice(8, 10)}/${f.slice(5, 7)}</b>` : ""}</small><b>${esc(p.titulo.replace(/^\d+\.\s*/, ""))}</b></div>
    <button class="bt sm ${n >= 0 ? "ok" : "pri"} mc-add" data-act="mcadd" data-id="${esc(p.id)}">${n >= 0 ? `${ic("check")}Na lista` : "+ Escolher"}</button></div>`;
}
function slotsCal(n) { const hs = lerHorarios(CAL.hs); if (!CAL.ini || !hs.length) return [];
  const out = [], arr = Math.min(n, Math.max(0, +CAL.arr || 0));
  if (arr) { let t = CAL.ini === hojeISO() ? Date.now() + 15 * 6e4 : new Date(CAL.ini + "T12:00:00-03:00").getTime();
    t = Math.ceil(t / 3e5) * 3e5; for (let i = 0; i < arr; i++) out.push(isoLocal(new Date(t + i * 20 * 6e4))); }
  const resto = n - out.length; if (resto > 0) out.push(...gerarSlots(arr ? diaMenos(out[out.length - 1].slice(0, 10), -1) : CAL.ini, hs, resto));
  return out; }
const DSEM = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const rotSlot = q => { if (!q) return ""; const d = q.slice(0, 10); return `${DSEM[new Date(d + "T12:00:00Z").getUTCDay()]} ${d.slice(8, 10)}/${d.slice(5, 7)} · ${q.slice(11, 16)}`; };
const VAGA = { id: "vaga", titulo: "💲 Oferta do dia", rot: "Robô escolhe na hora", porque: "Na hora de postar, o robô pega a melhor promoção fresca (das últimas 30h, que ainda vale) e cria a arte e a legenda. Se não tiver nenhuma, posta o Top 5 do dia.", telas: [], legenda: "(a legenda é escrita pelo robô na hora, com o preço do momento)" };
const ehVaga = id => /^vaga-/.test(id);
function mcPost(id) { return ehVaga(id) ? { ...VAGA, id } : (PA.lista || []).find(p => p.id === id); }
function mcSelecionados() { return CAL.sel.map(mcPost).filter(Boolean); }
function desenhaVaga(c) { bgNavy(c, PW, PH); rota(c, PW, PH, COR.am, .25); marca(c, PW, true, "NA HORA");
  kicker(c, "Vaga reservada", M, 420, COR.am); const y = titulo(c, "Oferta do dia", M, 450, PW - 2 * M, 170, 100, COR.am, 2) + 40;
  paragrafo(c, "Na hora de postar, o robô escolhe a melhor promoção fresca e cria a arte com o preço do momento.", M, y, PW - 2 * M - 60, 44, MARCA.corpo, "#fff", 600, 1.32, 4);
  T(c, "💲", PW - M - 60, PH - 260, 160, MARCA.corpo, "#fff", "center"); rodapeP(c, PW, PH, true, "Preço sempre fresco"); }
const vira = (p, q) => !ehVaga(p.id) && aoVivo(p) && (q || "").slice(0, 10) !== hojeISO();
function mcCfgHTML() {
  const h = hojeISO(), am = diaMenos(h, -1);
  return `<div class="mc-h"><b>Minha programação</b><small id="mc-resumo"></small></div>
    <div class="mc-cfg"><label>Começa<input type="date" data-mc="ini" value="${CAL.ini}"></label><label>Horários<input data-mc="hs" value="${esc(CAL.hs)}" placeholder="12:00, 19:00"></label></div>
    <div class="mc-rap"><button class="pill ${CAL.ini === h ? "on" : ""}" data-act="mcdia" data-v="${h}">Hoje</button><button class="pill ${CAL.ini === am ? "on" : ""}" data-act="mcdia" data-v="${am}">Amanhã</button><small class="sub">horário que já passou é pulado</small></div>
    <div class="mc-rap"><small class="sub">Por dia:</small>${[["12:00, 19:00", "2"], ["09:00, 13:00, 19:00", "3"], ["09:00, 12:00, 15:00, 19:00", "4"]].map(([v, n]) => `<button class="pill ${CAL.hs.replace(/\s/g, "") === v.replace(/\s/g, "") ? "on" : ""}" data-act="mchs" data-v="${v}">${n} posts</button>`).join("")}</div>
    <label class="mc-arr2"><span>🚀 Arrancada: no 1º dia, postar</span><input type="number" min="0" max="9" data-mc="arr" value="${CAL.arr}"><span>de uma vez (1 a cada 20 min)</span></label>
    <div id="mc-lista"></div>`;
}
function mcListaHTML() {
  const L = mcSelecionados(), slots = slotsCal(L.length), hoje = hojeISO();
  const r = document.getElementById("mc-resumo"); if (r) r.textContent = `${L.length} post${L.length === 1 ? "" : "s"}${L.length && slots.length ? ` · até ${rotSlot(slots[slots.length - 1]).split(" · ")[0]}` : ""}`;
  const errado = L.filter((p, k) => p.valido && (slots[k] || "9").slice(0, 10) > p.valido);
  return (L.length ? `<ol class="mc-lista">${L.map((p, k) => { const ruim = errado.includes(p);
      return `<li class="mc-it ${ruim ? "ruim" : ""}" draggable="true" data-k="${k}">
      <span class="mc-arr" title="arraste pra mudar a ordem">⋮⋮</span><img src="${CAL.thumbs[ehVaga(p.id) ? "vaga" : p.id] || ""}" alt="" data-act="mcver" data-id="${esc(p.id)}" title="ver o post">
      <div class="mc-ii"><small>${rotSlot(slots[k])}${aoVivo(p) || ehVaga(p.id) ? " · 💲 preço do dia" : ""}</small><b>${esc(p.titulo.replace(/^\d+\.\s*/, ""))}</b>
        ${ruim ? `<span class="mc-aviso">Notícia vale até ${p.valido.slice(8, 10)}/${p.valido.slice(5, 7)}: suba ela na lista ou tire.</span>` : ""}
        ${vira(p, slots[k]) ? `<span class="mc-aviso2">Cai em outro dia: no dia, vira 💲 oferta do dia (o robô troca pela melhor promoção fresca).</span>` : ehVaga(p.id) ? `<span class="mc-aviso2">O robô escolhe a melhor promoção fresca na hora.</span>` : ""}
        ${ehVaga(p.id) ? "" : `<button class="lnk" data-act="mcver" data-id="${esc(p.id)}">ver post e legenda</button>`}</div>
      <div class="mc-bts"><button data-act="mcup" data-k="${k}" title="subir">↑</button><button data-act="mcdown" data-k="${k}" title="descer">↓</button><button data-act="mcrem" data-k="${k}" title="tirar">✕</button></div></li>`; }).join("")}</ol>`
    : `<div class="mc-vazio">Toque em <b>+ Escolher</b> ou arraste os posts pra cá.<br>A ordem aqui é a ordem em que vão sair.<br>Clique na imagem de qualquer post pra ver todas as telas e a legenda.</div>`)
    + (L.length ? `<label class="chk"><input type="checkbox" data-mc="ok" ${CAL.ok ? "checked" : ""}> Já aprovar (o robô publica sozinho)</label>
      ${L.some((p, k) => ehVaga(p.id) || vira(p, slots[k])) ? `<label class="chk"><input type="checkbox" data-mc="reels" ${CAL.reels ? "checked" : ""}> 🎬 Ofertas do dia saem como Reels (vídeo de 7s) + story</label>` : ""}
      <div class="al-acts"><button class="bt pri lg" data-act="mcagendar" ${errado.length ? "disabled" : ""}>${ic("calendar")}Agendar ${L.length} post${L.length > 1 ? "s" : ""}</button><button class="bt ghost" data-act="mclimpar">Limpar</button></div><small class="sub" id="mc-prog"></small>` : "");
}
function mcAtualizar() { CAL.sel = CAL.sel.filter(id => ehVaga(id) || (PA.lista || []).some(p => p.id === id)); mcGravar("p085_mc_sel", CAL.sel);
  const a = document.getElementById("mc-lista"); if (a) a.innerHTML = mcListaHTML();
  document.querySelectorAll('[data-act="mcdia"]').forEach(x => x.classList.toggle("on", x.dataset.v === CAL.ini));
  (PA.lista || []).forEach(p => { const el = document.querySelector(`.mc-card[data-id="${CSS.escape(p.id)}"]`); if (!el) return; const n = CAL.sel.indexOf(p.id);
    el.classList.toggle("on", n >= 0); const b = el.querySelector(".mc-add"); b.className = `bt sm ${n >= 0 ? "ok" : "pri"} mc-add`; b.innerHTML = n >= 0 ? `${ic("check")}Na lista` : "+ Escolher";
    let pos = el.querySelector(".mc-pos"); if (n >= 0) { if (!pos) { pos = document.createElement("span"); pos.className = "mc-pos"; el.querySelector(".mc-img").appendChild(pos); } pos.textContent = n + 1; } else if (pos) pos.remove(); }); }
/* ver o post: todas as telas grandes + legenda editável */
async function mcVer(id) {
  const p = (PA.lista || []).find(x => x.id === id); if (!p) return;
  const d = document.createElement("div"); d.className = "ej-fundo"; d.id = "mcv";
  const n = CAL.sel.indexOf(id);
  d.innerHTML = `<div class="ej mc-ver" role="dialog" aria-label="Ver post"><div class="ej-h"><div><b>${esc(p.titulo.replace(/^\d+\.\s*/, ""))}</b><small>${esc(p.rot || p.tipo)} · ${p.telas.length > 1 ? `carrossel com ${p.telas.length} telas (arraste pro lado)` : "post único"}${aoVivo(p) ? " · 💲 tem preço: só pode sair hoje" : ""}</small></div><button class="bt sm ghost" data-act="mcvfechar">✕</button></div>
    <div class="mc-telas" id="mcv-t"></div>
    ${p.porque ? `<div class="pa-porque">💡 ${esc(p.porque)}</div>` : ""}
    <div class="field"><label>Legenda (o que muda aqui vai junto no agendamento)</label><textarea class="mc-leg" data-mcleg="${esc(id)}" rows="9">${esc(CAL.legs[id] ?? p.legenda)}</textarea></div>
    <div class="ej-acts"><button class="bt ${n >= 0 ? "" : "pri"} lg" data-act="mcvadd" data-id="${esc(id)}">${n >= 0 ? "Tirar da lista" : "+ Escolher esse"}</button><button class="bt" data-act="mcvbaixar">${ic("down")}Baixar</button><button class="bt ghost" data-act="mcvfechar">Fechar</button></div></div>`;
  document.body.appendChild(d); document.body.classList.add("ej-on");
  const box = document.getElementById("mcv-t");
  for (const fn of p.telas) { const cv = document.createElement("canvas"); cv.width = PW; cv.height = PH; box.appendChild(cv); try { await fn(cv.getContext("2d")); } catch (e) { console.error(e); } }
}
function mcFecharVer() { const d = document.getElementById("mcv"); if (d) d.remove(); document.body.classList.remove("ej-on"); }
async function montarBoard(g) {
  if (!CAL.ini) CAL.ini = diaMenos(hojeISO(), -1);
  const L = await mcTodos(); PA.lista = L;
  if (!document.getElementById("pa-grade")) return;
  g.innerHTML = `<div class="mc"><div class="mc-lib"><div class="mc-f">${pills("mcf", CAL.f, CAL_F)}<small class="sub">${L.length} posts prontos · escolha os que vão sair e a ordem</small></div><div class="mc-grade"><div class="mc-card mc-vg" draggable="true" data-id="vaga-novo" data-g="dia"><div class="mc-img"><canvas id="mc-cv-vaga" width="${PW}" height="${PH}"></canvas></div>
      <div class="mc-i"><small>Pode usar várias vezes</small><b>💲 Oferta do dia (o robô escolhe na hora)</b></div><button class="bt sm pri mc-add" data-act="mcvaga">+ Adicionar vaga</button></div>${L.map(mcCard).join("")}</div></div>
    <aside class="card mc-sel" id="mc-sel">${mcCfgHTML()}</aside></div>`;
  { const cv = document.getElementById("mc-cv-vaga"); if (cv) { desenhaVaga(cv.getContext("2d")); CAL.thumbs.vaga = cv.toDataURL("image/jpeg", .55); } }
  for (let i = 0; i < L.length; i++) { const cv = document.getElementById("mc-cv-" + i); if (!cv) continue; try { await L[i].telas[0](cv.getContext("2d")); } catch (e) { console.error(e); } CAL.thumbs[L[i].id] = cv.toDataURL("image/jpeg", .55); }
  mcAtualizar();
}
async function mcAgendar(bt) {
  const L = mcSelecionados(), hs = lerHorarios(CAL.hs);
  if (!CAL.ini || !hs.length) { toast("Confira o dia de começo e os horários."); return; }
  const slots = slotsCal(L.length);
  if (L.some((p, k) => p.valido && slots[k].slice(0, 10) > p.valido)) { toast("Tem notícia marcada pra depois do prazo dela."); return; }
  const prog = document.getElementById("mc-prog"); bt.disabled = true;
  try {
    const itens = [];
    const semGrupoAinda = L.some(p => p.semana === 1) && !L.some(p => p.semana === 2);
    for (let k = 0; k < L.length; k++) { const p = L[k];
      if (ehVaga(p.id) || vira(p, slots[k])) { itens.push({ vaga: true, reels: !!CAL.reels, origem: p.id, rodape: semGrupoAinda ? "🔔 Ativa o sininho: semana que vem tem novidade pra quem sai de Fortaleza" : "" }); continue; }
      const cvs = []; for (const fn of p.telas) { const cv = document.createElement("canvas"); cv.width = PW; cv.height = PH; await fn(cv.getContext("2d")); cvs.push(cv); }
      itens.push({ titulo: p.titulo.replace(/^\d+\.\s*/, ""), cvs, legenda: CAL.legs[p.id] ?? p.legenda, origem: p.id, valido: p.valido || "" }); }
    const n = await agendarItens(itens, slots, CAL.ok, t => { if (prog) prog.textContent = t; });
    L.forEach((p, k) => { if (!ehVaga(p.id)) CAL.feitos[p.id] = slots[k].slice(0, 10); }); mcGravar("p085_mc_feitos", CAL.feitos);
    CAL.sel = []; CAL.legs = {}; toast(`${n} posts agendados! Veja em Instagram: agenda.`, 6000); render();
  } catch (e) { toast("Parou no meio: " + e.message, 8000); bt.disabled = false; }
}
document.addEventListener("click", e => {
  const pf = e.target.closest('[data-act="pill"][data-g="mcf"]'); if (pf) { CAL.f = pf.dataset.v; document.querySelectorAll('[data-g="mcf"]').forEach(x => x.classList.toggle("on", x === pf));
    document.querySelectorAll(".mc-card").forEach(el => { el.hidden = CAL.f !== "todos" && el.dataset.g !== CAL.f; }); e.stopImmediatePropagation(); return; }
  const b = e.target.closest('[data-act^="mc"]'); if (!b) return; const a = b.dataset.act, k = +b.dataset.k;
  if (a === "mcadd") { const id = b.dataset.id, n = CAL.sel.indexOf(id); if (n >= 0) CAL.sel.splice(n, 1); else CAL.sel.push(id); }
  else if (a === "mcup" && k > 0) CAL.sel.splice(k - 1, 0, CAL.sel.splice(k, 1)[0]);
  else if (a === "mcdown" && k < CAL.sel.length - 1) CAL.sel.splice(k + 1, 0, CAL.sel.splice(k, 1)[0]);
  else if (a === "mcrem") CAL.sel.splice(k, 1);
  else if (a === "mcver") { e.preventDefault(); mcVer(b.dataset.id); return; }
  else if (a === "mcvfechar") { mcFecharVer(); return; }
  else if (a === "mcvadd") { const id = b.dataset.id, n = CAL.sel.indexOf(id); if (n >= 0) CAL.sel.splice(n, 1); else CAL.sel.push(id); mcFecharVer(); }
  else if (a === "mcvbaixar") { [...document.querySelectorAll("#mcv-t canvas")].forEach((cv, j) => setTimeout(() => { const l = document.createElement("a"); l.download = `partiu085-${j + 1}.png`; l.href = cv.toDataURL("image/png"); l.click(); }, j * 350)); return; }
  else if (a === "mchs") { CAL.hs = b.dataset.v; mcGravar("p085_mc_hs", CAL.hs); const i = document.querySelector('[data-mc="hs"]'); if (i) i.value = CAL.hs; document.querySelectorAll('[data-act="mchs"]').forEach(x => x.classList.toggle("on", x === b)); }
  else if (a === "mcvaga") { CAL.sel.push("vaga-" + Date.now().toString(36)); }
  else if (a === "mcdia") { CAL.ini = b.dataset.v; const i = document.querySelector('[data-mc="ini"]'); if (i) i.value = CAL.ini; }
  else if (a === "mclimpar") { if (!confirm("Tirar todos da lista?")) return; CAL.sel = []; }
  else if (a === "mcagendar") { mcAgendar(b); return; }
  else return;
  mcAtualizar();
}, true);
document.addEventListener("input", e => { const t = e.target;
  if (t.dataset && t.dataset.mcleg) CAL.legs[t.dataset.mcleg] = t.value;
  else if (t.dataset && t.dataset.mc === "hs") { CAL.hs = t.value; mcGravar("p085_mc_hs", CAL.hs); clearTimeout(CAL.t); CAL.t = setTimeout(mcAtualizar, 400); }
  else if (t.dataset && t.dataset.mc === "arr") { CAL.arr = Math.max(0, Math.min(9, +t.value || 0)); clearTimeout(CAL.t); CAL.t = setTimeout(mcAtualizar, 300); }
  else if (t.dataset && t.dataset.mc === "ini" && t.value) { CAL.ini = t.value; clearTimeout(CAL.t); CAL.t = setTimeout(mcAtualizar, 400); } });
document.addEventListener("change", e => { const t = e.target; if (!t.dataset) return;
  if (t.dataset.mc === "ini" && t.value) { CAL.ini = t.value; mcAtualizar(); } else if (t.dataset.mc === "ok") CAL.ok = t.checked; else if (t.dataset.mc === "reels") { CAL.reels = t.checked; mcGravar("p085_mc_reels", CAL.reels); } });
/* arrastar: da biblioteca pra lista, e dentro da lista pra mudar a ordem */
document.addEventListener("dragstart", e => { const c = e.target.closest && e.target.closest(".mc-card"), it = e.target.closest && e.target.closest(".mc-it");
  if (it) { e.dataTransfer.setData("text/plain", "k:" + it.dataset.k); it.classList.add("arrastando"); } else if (c) e.dataTransfer.setData("text/plain", "id:" + c.dataset.id); });
document.addEventListener("dragend", e => { document.querySelectorAll(".arrastando,.mc-alvo").forEach(x => x.classList.remove("arrastando", "mc-alvo")); });
document.addEventListener("dragover", e => { const sel = e.target.closest && e.target.closest("#mc-sel"); if (!sel) return; e.preventDefault();
  document.querySelectorAll(".mc-alvo").forEach(x => x.classList.remove("mc-alvo")); const it = e.target.closest(".mc-it"); (it || sel).classList.add("mc-alvo"); });
document.addEventListener("drop", e => { const sel = e.target.closest && e.target.closest("#mc-sel"); if (!sel) return; e.preventDefault();
  const v = e.dataTransfer.getData("text/plain"), it = e.target.closest(".mc-it"); let pos = it ? +it.dataset.k : CAL.sel.length;
  if (v === "id:vaga-novo") { CAL.sel.splice(pos, 0, "vaga-" + Date.now().toString(36)); }
  else if (v.startsWith("id:")) { const id = v.slice(3), n = CAL.sel.indexOf(id); if (n >= 0) { CAL.sel.splice(n, 1); if (n < pos) pos--; } CAL.sel.splice(pos, 0, id); }
  else if (v.startsWith("k:")) { const de = +v.slice(2); const [x] = CAL.sel.splice(de, 1); CAL.sel.splice(de < pos ? pos - 1 + (it ? 1 : 0) : pos, 0, x); }
  mcAtualizar(); });


/* ================= destino da semana (carrossel com dados do radar) ================= */
async function fDestinoSemana() {
  const R = S.status.rotas || {}, ks = DESTINOS_PAUTA.filter(k => R[k]); if (!ks.length) return null;
  const sem = Math.floor(nDia() / 7), k = ks[sem % ks.length];
  await carregarCal(k); const cal = S.cal[k]; if (!cal || !cal.ida || cal.ida.length < 5) return null;
  const nome = (S.rotas.find(r => r.iata === k) || {}).nome || IATA[k] || k, rf = refDe(k), im = await fotoPronta(k);
  const pm = {}; cal.ida.forEach(d => { const m = d.dia.slice(0, 7); pm[m] = Math.min(d.preco, pm[m] || 1e9); });
  const ms = Object.entries(pm).sort().slice(0, 5), mn = Math.min(...ms.map(m => m[1])), mx = Math.max(...ms.map(m => m[1]));
  const datas = cal.ida.slice().sort((a, b) => a.preco - b.preco).slice(0, 6).sort((a, b) => a.dia.localeCompare(b.dia));
  const n = 5, hoje = dataCurta(hojeISO()).toLowerCase();
  const telas = [
    c => { bgFoto(c, PW, PH, im, .58); marca(c, PW, true, `1/${n}`);
      kicker(c, "Destino da semana", M, PH * .58 - 130, COR.am); const y = titulo(c, nome, M, PH * .58 - 100, PW - 2 * M, 170, 90, "#fff", 2) + 30;
      if (rf && rf.texto) paragrafo(c, rf.texto, M, y + 10, PW - 2 * M, 34, MARCA.corpo, "rgba(255,255,255,.85)", 600, 1.3, 2);
      T(c, "Quando é mais barato ir saindo de Fortaleza? ARRASTA ➜", M, PH - 100, 26, MARCA.corpo, COR.am, "left", 800, 1); },
    c => { bgNavy(c, PW, PH); marca(c, PW, true, `2/${n}`); kicker(c, "Menor preço por mês (só ida)", M, 300, COR.am);
      titulo(c, "Qual mês sai mais em conta", M, 330, PW - 2 * M, 100, 64, "#fff", 2); let y = 600;
      ms.forEach(([m, p]) => { const best = p === mn, w = 140 + (p / mx) * (PW - 2 * M - 200 - 380);
        T(c, MESES[+m.slice(5, 7) - 1].toUpperCase(), M, y + 50, 40, MARCA.titulo, best ? COR.am : "#fff");
        c.fillStyle = best ? COR.am : "rgba(255,255,255,.16)"; rr(c, M + 200, y + 12, w, 52, 26); c.fill();
        T(c, brl(p), M + 200 + w + 20, y + 52, 40, MARCA.titulo, best ? COR.am : "#fff"); y += 92; });
      T(c, `Preços que o radar viu em ${hoje}. Mudam a toda hora.`, M, y + 30, 22, MARCA.corpo, COR.cinza, "left", 600); rodapeP(c, PW, PH, true, "Salva pra consultar depois"); },
    c => { bgCreme(c, PW, PH); marca(c, PW, false, `3/${n}`); kicker(c, "As datas mais baratas agora", M, 300, COR.tinta);
      titulo(c, "Se for, vá nessas datas", M, 330, PW - 2 * M, 100, 64, COR.tinta, 2); let y = 560;
      datas.forEach((d, i) => { linhaLista(c, PW, y, String(i + 1).padStart(2, "0"), `${d.dia.slice(8, 10)}/${d.dia.slice(5, 7)}`, ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][new Date(d.dia + "T12:00:00Z").getUTCDay()], brl(d.preco), "só ida", false, 108); y += 108; });
      rodapeP(c, PW, PH, false, "Preços de hoje, podem mudar"); },
    c => { TEMA.amarelo.bg(c, PW, PH); marca(c, PW, false, `4/${n}`); kicker(c, "Dica do radar", M, 360, COR.tinta);
      const y = titulo(c, `O melhor mês pra ${nome} é ${MESES_LONGO[+ms.find(m => m[1] === mn)[0].slice(5, 7) - 1].toLowerCase()}`, M, 390, PW - 2 * M, 112, 70, COR.tinta, 3) + 50;
      paragrafo(c, "Olhe sempre a ida e a volta juntas e seja rápido: preço bom some em horas. Quem tem alerta ligado compra primeiro.", M, y, PW - 2 * M, 40, MARCA.corpo, "rgba(15,42,71,.85)", 600, 1.35, 4);
      rodapeP(c, PW, PH, false, "Siga @partiu.085"); },
    c => capaTema(c, "escuro", "Quer receber na hora?", `Comenta EU QUERO que eu te mando os alertas de ${nome}`, "Todo dia tem passagem barata saindo de Fortaleza. Salva esse post e manda pra quem vai com você.", "", "Siga @partiu.085 · ative o sininho 🔔") ];
  return { id: "f-destsem-" + k + "-" + hojeISO(), grupo: "feed", tipo: "Destino da semana", titulo: `Destino da semana: ${nome}`, porque: "Carrossel com dado que só a gente tem: muito salvo e compartilhado. Bom pra toda segunda.", fmt: `Carrossel · ${n} telas`, telas,
    legenda: `📍 DESTINO DA SEMANA: ${nome.toUpperCase()}\n\nQuanto custa voar de Fortaleza, mês a mês (menor preço do trecho que o radar viu):\n\n${ms.map(([m, p]) => `${p === mn ? "⭐" : "▫️"} ${MESES_LONGO[+m.slice(5, 7) - 1]}: a partir de ${brl(p)}`).join("\n")}\n\n📅 Datas mais baratas agora: ${datas.map(d => `${d.dia.slice(8, 10)}/${d.dia.slice(5, 7)}`).join(", ")}\n\n⚠️ Preços de ${hoje}, mudam a qualquer momento.\n💬 Comenta EU QUERO que eu te mando os próximos no direct!\n\n${HASH}` };
}


/* ================= 🏆 prova de resultado (quem comprou pelo alerta) ================= */
PA.pv = { nome: "", destino: "", preco: "", tipo: "ida e volta", normal: "", quando: "", frase: "", foto: null };
function provaHTML() {
  const V = PA.pv, f = (k, l, ph, w) => `<div class="field" ${w ? 'style="grid-column:1/-1"' : ""}><label>${l}</label><input data-pv="${k}" value="${esc(V[k])}" placeholder="${ph}"></div>`;
  return `<div class="card pa-nt"><h3>🏆 Post de prova: quem comprou pelo alerta</h3>
    <div class="desc">Alguém do grupo comprou por causa de um alerta? Pede o print e a autorização pra postar. É o post que mais convence gente nova a entrar (e depois a pagar o VIP). Só use casos reais.</div>
    <div class="form pa-nt-f" style="margin-top:12px">
      ${f("nome", "Nome ou @ (com autorização)", "Ex.: Ana, @ana.viaja ou 'Um membro do grupo'")}${f("destino", "Destino", "Ex.: São Paulo")}
      ${f("preco", "Quanto pagou (R$)", "Ex.: 590")}<div class="field"><label>Tipo</label><select data-pv="tipo">${["ida e volta", "só ida"].map(x => `<option ${V.tipo === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
      ${f("normal", "Preço normal da rota (opcional, R$)", "Ex.: 1400")}${f("quando", "Quando vai viajar (opcional)", "Ex.: novembro")}
      ${f("frase", "O que a pessoa disse (opcional)", "Ex.: Vi o alerta às 7h e comprei na hora!", true)}
      <div class="field"><label>Print da compra ou foto da viagem (opcional)</label><input type="file" accept="image/*" data-pv-foto></div>
      <div class="field" style="align-self:end"><button class="bt pri" data-act="pvgerar">Gerar post</button></div>
    </div></div>`;
}
async function postProva() {
  const V = PA.pv; if (!V.destino || !V.preco) return [];
  const im = V.foto ? await carregarFotoPv(V.foto) : await fotoPronta(Object.keys(IATA).find(k => (IATA[k] || "").toLowerCase().startsWith(V.destino.toLowerCase())) || "");
  const preco = brl(String(V.preco).replace(/\D/g, "")), normal = V.normal ? brl(String(V.normal).replace(/\D/g, "")) : "", quem = V.nome || "Um membro do grupo";
  const eco = V.normal ? Math.round((1 - (+String(V.preco).replace(/\D/g, "")) / (+String(V.normal).replace(/\D/g, ""))) * 100) : 0;
  const desenha = (W, H, story) => c => {
    const fh = Math.round(H * (story ? .42 : .44));
    c.fillStyle = COR.am; c.fillRect(0, 0, W, H); grao(c, W, H, .04, "#0F2A47");
    if (im) { c.save(); rr(c, M, 170, W - 2 * M, fh - 140, 36); c.clip(); const s = Math.max((W - 2 * M) / im.naturalWidth, (fh - 140) / im.naturalHeight);
      c.drawImage(im, M + (W - 2 * M - im.naturalWidth * s) / 2, 170 + (fh - 140 - im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s); c.restore(); }
    marca(c, W, false, "RESULTADO REAL");
    let y = im ? fh + 110 : (story ? 520 : 360);
    kicker(c, `${quem} comprou pelo alerta`, M, y, COR.tinta);
    T(c, preco, M - 6, y + 175, caber(c, preco, W - 2 * M, 170, MARCA.titulo, 400, 100), MARCA.titulo, COR.tinta);
    T(c, `Fortaleza ➜ ${V.destino} · ${V.tipo}${V.quando ? " · " + V.quando : ""}`, M, y + 228, 34, MARCA.corpo, COR.tinta, "left", 800);
    y += 270;
    if (normal) { T(c, `Normal: ${normal}${eco > 0 ? `  ·  economizou ${eco}%` : ""}`, M, y + 10, 30, MARCA.corpo, "rgba(15,42,71,.75)", "left", 700); y += 50; }
    if (V.frase) { c.fillStyle = COR.tinta; c.fillRect(M, y + 10, 8, 100); paragrafo(c, `“${V.frase}”`, M + 34, y + 46, W - 2 * M - 40, 34, MARCA.corpo, COR.tinta, 600, 1.3, 3); }
    if (story) espacoLink(c, W, H); else rodapeP(c, W, H, false, "Entre no grupo grátis · link na bio"); };
  const leg = `🏆 RESULTADO REAL DO GRUPO\n\n${quem} viu o alerta e comprou Fortaleza ➜ ${V.destino} por ${preco} (${V.tipo})${normal ? `, quando o normal é ${normal}` : ""}! ✈️${V.frase ? `\n\n💬 "${V.frase}"` : ""}\n\nÉ isso que o radar faz: avisa na hora que o preço cai. Promoção boa some em horas.\n\n🔔 Entre no grupo grátis: link na bio\n💬 Comenta EU QUERO que eu te mando no direct\n\n${HASH}`;
  return [{ id: "pv-feed-" + V.destino + V.preco, grupo: "feed", tipo: "Prova", titulo: "Prova de resultado · feed", porque: "Prova social: o post que mais leva gente pro grupo.", fmt: "Feed 4:5", telas: [desenha(PW, PH, false)], legenda: leg },
    { id: "pv-story-" + V.destino + V.preco, grupo: "stories", tipo: "Prova", titulo: "Prova de resultado · story", porque: "No story, com o adesivo de link do grupo.", fmt: "Story 9:16", stories: true, telas: [desenha(SW, SH, true)], legenda: `Adesivo de LINK: ${linkGrupo()}` }];
}
function carregarFotoPv(src) { return new Promise(ok => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; }); }
document.addEventListener("input", e => { const k = e.target.dataset && e.target.dataset.pv; if (k) PA.pv[k] = e.target.value; });
document.addEventListener("change", e => { const k = e.target.dataset && e.target.dataset.pv; if (k) PA.pv[k] = e.target.value;
  if (e.target.dataset && e.target.dataset.pvFoto !== undefined) { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { PA.pv.foto = r.result; toast("Foto carregada. Toque em Gerar post."); }; r.readAsDataURL(f); } });
document.addEventListener("click", e => { const b = e.target.closest('[data-act="pvgerar"]'); if (!b) return; if (!PA.pv.destino || !PA.pv.preco) { toast("Preencha pelo menos destino e preço."); return; } render(); });

/* ================= página ================= */
async function ideiasHoje() {
  const st = [sTop5(), sMilhas(), await sAchado(), sChamada()].filter(Boolean);
  const fd = [await fOportunidade(), await fDestinoSemana(), fBonus(), fGuia(), await fQuanto(), fSemana()].filter(Boolean);
  return st.concat(fd);
}
function feito(id) { return S.marcados && S.marcados["ig-" + id]; }
function cardPauta(p, i) {
  return `<article class="card pa-c ${p.stories ? "pa-st" : ""} ${feito(p.id) ? "feito" : ""}">
    <div class="pa-h"><span class="tag">${esc(p.tipo)}</span><b>${esc(p.titulo)}</b><small>${esc(p.fmt)}</small></div>
    <div class="pa-telas ${p.stories ? "pa-vert" : ""}" id="pa-t-${i}"><div class="vazio">desenhando…</div></div>
    <div class="pa-porque">💡 ${esc(p.porque)}</div>
    <details class="pa-legd"><summary>${p.stories ? "Instruções do story" : "Ver legenda"}</summary><textarea class="pa-leg" id="pa-l-${i}" spellcheck="false">${esc(p.legenda)}</textarea></details>
    <div class="al-acts"><button class="bt pri sm" data-act="pabaixar" data-i="${i}">${ic("down")}Baixar${p.telas.length > 1 ? ` ${p.telas.length} telas` : ""}</button>
      <button class="bt sm" data-act="pacopiar" data-i="${i}">${ic("copy")}Copiar ${p.stories ? "link" : "legenda"}</button>
      <button class="bt sm" data-act="igagendar" data-src="pa" data-i="${i}">${ic("calendar")}Agendar</button>
      <button class="bt sm ${feito(p.id) ? "ok" : "ghost"}" data-act="pafeito" data-i="${i}">${ic(feito(p.id) ? "check" : "circle")}${feito(p.id) ? "Postado" : "Postei"}</button></div>
  </article>`;
}
function pPauta() {
  PA.lista = null;
  setTimeout(montarPauta, 0);
  return head("Pauta do Instagram", PA.aba === "montar" ? "Todos os posts prontos de um lado. Escolha os que vão sair, arraste pra ordem que quiser e agende tudo de uma vez." : "Stories com o que é do dia. Feed com o que vale por mais tempo: oportunidades raras, resumo da semana e guias de milhas, viagem e aeroporto.") +
    `<div class="pa-bar">${pills("paaba", PA.aba, [["montar", "🗓️ Montar calendário"], ["campanha", "🚀 Lançamento"], ["hoje", "Pra hoje"], ["noticia", "📰 Notícias"], ["prova", "🏆 Prova"], ["biblioteca", "Guias"]])}
      ${PA.aba === "hoje" ? pills("patipo", PA.tipo, [["feed", "▭ Feed"], ["stories", "▯ Stories"]]) : ""}</div>
    ${PA.aba === "noticia" ? noticiaHTML() : ""}${PA.aba === "prova" ? provaHTML() : ""}
    ${PA.aba === "campanha" ? `<div class="card pa-dica"><div class="al-acts" style="margin-bottom:10px"><button class="bt pri" data-act="iglote" data-s="1">${ic("calendar")}Agendar a semana 1 inteira (2 por dia)</button><button class="bt" data-act="iglote" data-s="2">${ic("calendar")}Agendar a semana 2</button></div><b>Plano:</b> semana 1 aquece o perfil (2 posts por dia, 12h e 19h, cores em rodízio 🟦⬜🟨 pra o grid ficar organizado) + stories. Semana 2 abre o grupo. Stories da semana 1:<ol>${STORIES_S1.map(s => `<li>${esc(s)}</li>`).join("")}</ol><b>No seu perfil pessoal, no dia que abrir o grupo:</b><ol>${STORIES_LEO.map(s => `<li>${esc(s)}</li>`).join("")}</ol></div>` : ""}
    <div id="pa-grade"><div class="card vazio">Montando as opções…</div></div>`;
}
async function montarPauta() {
  const g = document.getElementById("pa-grade"); if (!g) return;
  carregarMilhas();
  for (let i = 0; i < 50 && S.mi && S.mi.carregando; i++) await new Promise(r => setTimeout(r, 100));
  try { await Promise.all([`400 80px ${MARCA.titulo}`, `800 30px ${MARCA.corpo}`, `600 30px ${MARCA.corpo}`, `700 30px ${MARCA.corpo}`].map(x => document.fonts.load(x))); } catch (e) { }
  if (PA.aba === "montar") return montarBoard(g);
  const L = PA.aba === "hoje" ? (await ideiasHoje()).filter(p => p.grupo === PA.tipo) : PA.aba === "campanha" ? await campanha() : PA.aba === "noticia" ? await postNoticia() : PA.aba === "prova" ? await postProva() : EDU.map(x => fGuia(x));
  PA.lista = L;
  if (!document.getElementById("pa-grade")) return;
  const sec = (tit, sub, arr) => arr.length ? `<div class="pa-sec"><h3>${tit}</h3><span class="sub">${sub}</span></div><div class="pa-grade">${arr.map(p => cardPauta(p, L.indexOf(p))).join("")}</div>` : "";
  g.innerHTML = !L.length ? (PA.aba === "noticia" || PA.aba === "prova") ? "" : `<div class="card vazio">Sem dados suficientes agora. Volta depois da próxima rodada.</div>`
    : PA.aba === "hoje" ? (PA.tipo === "stories" ? sec("Stories de hoje", "o que é do dia: some em 24h, como o preço", L) : sec("Feed", "escolha 1 por dia: oportunidade rara, guia, dados ou resumo da semana", L))
    : PA.aba === "campanha" ? sec("Semana 1 · Aquecimento", "posts leves + 3 teasers do sistema. Ainda não fala do grupo: pede pra comentar EU QUERO e ativar o sininho", L.filter(p => p.semana === 1)) + sec("Semana 2 · Abre o grupo", "1 post por dia, na ordem. Aqui sim: link na bio e direct pra quem comentar", L.filter(p => p.semana === 2))
    : `<div class="pa-grade">${L.map(cardPauta).join("")}</div>`;
  L.forEach((p, i) => { const box = document.getElementById("pa-t-" + i); if (!box) return; box.innerHTML = "";
    p.telas.forEach(fn => { const cv = document.createElement("canvas"); cv.width = p.stories ? SW : PW; cv.height = p.stories ? SH : PH; try { const r = fn(cv.getContext("2d")); if (r && r.catch) r.catch(e => console.error(e)); } catch (e) { console.error(e); } box.appendChild(cv); }); });
}
document.addEventListener("click", async e => {
  const b = e.target.closest('[data-act^="pa"]'); if (!b || b.dataset.act === "pill") return;
  const p = (PA.lista || [])[+b.dataset.i]; if (!p) return;
  if (b.dataset.act === "pabaixar") { [...document.querySelectorAll(`#pa-t-${b.dataset.i} canvas`)].forEach((cv, j) => setTimeout(() => { const a = document.createElement("a"); a.download = `partiu085-${p.id}-${j + 1}.png`; a.href = cv.toDataURL("image/png"); a.click(); }, j * 350)); }
  else if (b.dataset.act === "pacopiar") { await copiar(p.stories ? linkGrupo() : (($("#pa-l-" + b.dataset.i) || {}).value || p.legenda)); toast(p.stories ? "Link do grupo copiado (pro adesivo de link)." : "Legenda copiada."); }
  else if (b.dataset.act === "pafeito") { marcar("ig-" + p.id, !feito(p.id)); const card = b.closest(".pa-c"); card.classList.toggle("feito", !!feito(p.id)); b.classList.toggle("ok", !!feito(p.id)); b.innerHTML = `${ic(feito(p.id) ? "check" : "circle")}${feito(p.id) ? "Postado" : "Postei"}`; }
});
document.addEventListener("click", e => { const b = e.target.closest('[data-act="pill"][data-g^="pa"]'); if (!b) return;
  if (b.dataset.g === "paaba") PA.aba = b.dataset.v; else if (b.dataset.g === "patipo") { PA.tipo = b.dataset.v; try { localStorage.setItem("p085_pa_tipo", PA.tipo); } catch (x) { } } }, true);
