/* Partiu 085 — Criativos: artes de stories, feed e carrossel com a identidade da marca
   (azul-marinho + amarelo, mascote cacto, letra condensada + letra cursiva). */
"use strict";

const MARCA = {
  navy: "#173A5E", navy2: "#0F2A47", azul: "#1F5FBF", azul2: "#3E86E8", amarelo: "#F5C531", amarelo2: "#F2B705",
  creme: "#F6F1E4", verde: "#5FA83A", laranja: "#E07A22", branco: "#FFFFFF",
  titulo: '"Anton", "Bebas Neue", Impact, sans-serif', script: '"Kaushan Script", "Brush Script MT", cursive',
  corpo: '"Plus Jakarta Sans", system-ui, sans-serif',
};
const TEMAS = {
  azul: { bg: [MARCA.azul2, MARCA.azul, MARCA.navy], ink: "#FFFFFF", sub: "rgba(255,255,255,.82)", acc: MARCA.amarelo, accInk: MARCA.navy, card: "#FFFFFF", cardInk: MARCA.navy, chip: "#EEF3FA", linha: "rgba(255,255,255,.55)" },
  amarelo: { bg: ["#FFD54A", MARCA.amarelo, MARCA.amarelo2], ink: MARCA.navy, sub: "rgba(23,58,94,.82)", acc: MARCA.navy, accInk: "#FFFFFF", card: "#FFFFFF", cardInk: MARCA.navy, chip: "#FFF6D6", linha: "rgba(23,58,94,.55)" },
  creme: { bg: ["#FBF8EF", MARCA.creme, "#EDE6D2"], ink: MARCA.navy, sub: "rgba(23,58,94,.75)", acc: MARCA.amarelo, accInk: MARCA.navy, card: "#FFFFFF", cardInk: MARCA.navy, chip: "#F3EEDF", linha: "rgba(23,58,94,.4)" },
  noite: { bg: ["#1D4D7A", MARCA.navy, MARCA.navy2], ink: "#FFFFFF", sub: "rgba(255,255,255,.8)", acc: MARCA.amarelo, accInk: MARCA.navy, card: "#FFFFFF", cardInk: MARCA.navy, chip: "#EEF3FA", linha: "rgba(245,197,49,.6)" },
};
const FMT = { stories: [1080, 1920], feed: [1080, 1350], quadrado: [1080, 1080] };
const TPLS = [
  ["promo", "Promoção do radar"], ["carrossel", "Carrossel: top da semana"], ["destino", "Destino em destaque"],
  ["frase", "Frase da marca"], ["beneficios", "Lista de benefícios"], ["dica", "Dica de milhas"], ["pergunta", "Pergunta (engajamento)"],
];
const SLOGANS = [
  "Viajar bem é questão de oportunidade — e a gente te avisa quando ela aparece.",
  "Viajar bem é questão de oportunidade — e a gente te mostra todas.",
  "Viajar bem é questão de oportunidade — e o 085 tá sempre ligado.",
  "Viajar bem é questão de oportunidade — e aqui elas não passam despercebidas.",
  "Viajar bem é questão de oportunidade — e a gente te ajuda a aproveitar cada uma.",
  "Viajar bem é questão de oportunidade — e no 085, você nunca perde nenhuma.",
];
const ASSINATURAS = [
  "Porque toda boa viagem começa com o alerta certo.", "Do 085 pro mundo, pagando menos pra voar mais.",
  "As oportunidades que fazem você embarcar de verdade.", "Quando o preço cai, o 085 te faz decolar.",
  "Promoções reais, destinos incríveis, viagens possíveis.", "Nosso radar tá sempre ligado nas melhores tarifas.",
  "A gente encontra. Você embarca. Simples assim.", "Mais que promoções — um novo jeito de viajar.",
  "O radar das oportunidades que o cearense esperava.", "Alertas reais, viagens possíveis, experiências de verdade.",
  "Porque economizar é só o começo da viagem.", "Do 085 pro mundo, sempre no melhor preço.",
  "Quando a promoção aparece, a gente te faz decolar.", "O radar do 085 tá sempre ativo.",
  "Do Ceará pro mundo, pagando menos.", "Toda boa viagem começa com um alerta nosso.",
];
const DICAS = [
  ["Transfira pontos só quando tiver destino certo.", "Evite perder bônus e aproveite as transferências no momento certo."],
  ["Espere a promoção de bônus para transferir.", "Livelo e Esfera fazem campanhas de 80% a 100% de bônus várias vezes por ano."],
  ["Junte pontos num lugar só.", "Pontos espalhados vencem. Concentre num programa e use de uma vez."],
  ["Confira a data de validade das milhas.", "Muita gente perde milhas por esquecer de usar. Anote o vencimento."],
  ["Compare: milhas ou dinheiro?", "Divida o preço em reais pelas milhas pedidas. Se valer menos de R$ 20 o milheiro, pague em dinheiro."],
];
const PERGUNTAS = [
  "Se você pudesse embarcar agora… pra onde iria?", "Praia ou neve: qual seria sua próxima viagem?",
  "Qual destino você nunca foi e sonha conhecer?", "Viagem boa é com quem? Marca aqui!",
  "Já pensou em viajar pagando menos que uma ida ao shopping?", "Quando vejo passagem barata pra um lugar que eu nem sabia que queria ir…",
];
const BENEFICIOS = ["Saindo de Fortaleza (FOR)", "Alertas exclusivos", "Emissões com milhas", "Ofertas que cabem no bolso", "Destinos nacionais", "Destinos internacionais"];

const CR = { tpl: "promo", fmt: "stories", tema: "azul", id: "", hashId: "", datas: true, txt: {}, mascote: true };
const IMGS = {};
function img(n) {
  if (!IMGS[n]) { IMGS[n] = new Image(); IMGS[n].src = `marca/${n}.png`; IMGS[n].onload = () => { if (location.hash.startsWith("#criativos")) desenharCriativo(); }; }
  return IMGS[n];
}
["logo", "mascote", "icone"].forEach(img);
function alertaCR() {
  const q = new URLSearchParams((location.hash.split("?")[1]) || "");
  const hid = q.get("id") || "";
  if (hid && hid !== CR.hashId) { CR.hashId = hid; CR.id = hid; CR.tpl = "promo"; }
  return S.alertas.find(a => a.id === CR.id) || S.alertas[0];
}
function topSemana() {
  const lim = diaMenos(hojeISO(), 6), vistos = new Set();
  return S.alertas.filter(a => a.criado.slice(0, 10) >= lim).sort((x, y) => y.desconto - x.desconto)
    .filter(a => !vistos.has(a.destino) && vistos.add(a.destino)).slice(0, 5);
}
function linkGrupo() { return ((S.grupos || []).find(g => g.id === "gratis") || {}).link || (S.ajustes && S.ajustes.link_whatsapp) || "bit.ly/radar085"; }
const MC = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function mesesTxt(a) {
  const ds = (a.datas_ida || []).map(d => d.dia).concat((a.datas || []).map(d => d.ida));
  const ms = [...new Set(ds.map(d => d.slice(0, 7)))].sort().map(m => MC[+m.slice(5, 7) - 1]);
  return ms.length > 1 ? ms.slice(0, -1).join(", ") + " e " + ms[ms.length - 1] : (ms[0] || "");
}
function classeTxt(a) { return { imperdivel: "IMPERDÍVEL", otima: "ÓTIMA OPORTUNIDADE", boa: "BOA OPORTUNIDADE" }[a.classe || "boa"]; }
function txtPadrao(tpl) {
  const r = n => Math.floor(Math.random() * n);
  return {
    frase: { titulo: SLOGANS[r(SLOGANS.length)].split(" — ")[0], destaque: SLOGANS[0].split(" — ")[1] || "", rodape: ASSINATURAS[r(ASSINATURAS.length)] },
    beneficios: { titulo: "CONHEÇA O MUNDO", destaque: "com economia", lista: BENEFICIOS.join("\n") },
    dica: (() => { const d = DICAS[r(DICAS.length)]; return { titulo: "DICA RÁPIDA DE MILHAS", destaque: d[0], texto: d[1] }; })(),
    pergunta: { titulo: PERGUNTAS[r(PERGUNTAS.length)], destaque: "Comenta aqui embaixo!" },
  }[tpl] || {};
}

/* ---------------- primitivas */
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function fnt(c, size, fam, peso = 400) { c.font = `${peso} ${size}px ${fam}`; }
function tx(c, t, x, y, size, fam, cor, align = "left", peso = 400, ls = 0) {
  fnt(c, size, fam, peso); c.fillStyle = cor; c.textAlign = align; c.textBaseline = "alphabetic";
  if ("letterSpacing" in c) c.letterSpacing = ls + "px";
  c.fillText(t, x, y); if ("letterSpacing" in c) c.letterSpacing = "0px";
}
function larg(c, t, size, fam, peso = 400) { fnt(c, size, fam, peso); return c.measureText(t).width; }
function caber(c, t, w, size, fam, peso = 400, min = 30) { let s = size; while (s > min && larg(c, t, s, fam, peso) > w) s -= 4; return s; }
function quebrar(c, t, w, size, fam, peso = 400) {
  const pal = String(t).split(/\s+/); const L = []; let at = "";
  pal.forEach(p => { const tt = at ? at + " " + p : p; if (larg(c, tt, size, fam, peso) > w && at) { L.push(at); at = p; } else at = tt; });
  if (at) L.push(at); return L;
}
function bloco(c, t, x, y, w, size, fam, cor, align = "left", peso = 400, lh = 1.08, maxL = 9) {
  const L = quebrar(c, t, w, size, fam, peso).slice(0, maxL);
  L.forEach((l, i) => tx(c, l, x, y + i * size * lh, size, fam, cor, align, peso));
  return y + (L.length - 1) * size * lh;
}
function pil(c, t, x, y, size, bg, cor, padX = 28, h = null, fam = MARCA.corpo, peso = 700, align = "left") {
  const w = larg(c, t, size, fam, peso) + padX * 2, hh = h || size * 2.1, x0 = align === "center" ? x - w / 2 : x;
  c.fillStyle = bg; rr(c, x0, y, w, hh, hh / 2); c.fill();
  tx(c, t, x0 + padX, y + hh / 2 + size * 0.36, size, fam, cor, "left", peso);
  return w;
}
const AVIAO = new Path2D("M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z");
function aviao(c, x, y, s, cor, rot = 0) { c.save(); c.translate(x, y); c.rotate(rot); c.scale(s / 24, s / 24); c.translate(-12, -12); c.fillStyle = cor; c.fill(AVIAO); c.restore(); }
function rota(c, pts, cor, w = 4) { c.save(); c.strokeStyle = cor; c.lineWidth = w; c.setLineDash([16, 14]); c.lineCap = "round"; c.beginPath(); c.moveTo(pts[0], pts[1]); c.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]); c.stroke(); c.restore(); }
function estrela(c, x, y, s, cor) { c.save(); c.fillStyle = cor; c.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? s * .32 : s, a = i * Math.PI / 4; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); c.fill(); c.restore(); }
let EM_CONTEUDO = null;   // quando desenhando o miolo numa tela à parte (para centralizar e ampliar)
function fundo(c, W, H, t) {
  if (EM_CONTEUDO) return;
  const g = c.createLinearGradient(0, 0, W * .3, H); t.bg.forEach((cor, i) => g.addColorStop(i / (t.bg.length - 1), cor));
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.save(); c.globalAlpha = .07; c.fillStyle = t.ink;
  for (let i = 0; i < 260; i++) { const x = (i * 97) % W, y = (i * 211) % H; c.beginPath(); c.arc(x, y, 2.2, 0, 7); c.fill(); }
  c.restore();
  rota(c, [W * .78, -20, W * 1.05, H * .12, W * .7, H * .2, W * 1.02, H * .3], t.linha);
  rota(c, [-20, H * .62, W * .14, H * .58, W * .02, H * .78, W * .2, H * .86], t.linha);
  aviao(c, W * .86, H * .07, 54, t.acc, .5); aviao(c, W * .12, H * .9, 46, t.acc, -.4);
  estrela(c, W * .07, H * .16, 16, t.acc); estrela(c, W * .93, H * .58, 13, t.acc);
}
function desenhaImg(c, nome, x, y, w, align = "center") {
  const im = img(nome); if (!im.complete || !im.naturalWidth) return 0;
  const h = w * im.naturalHeight / im.naturalWidth; c.drawImage(im, align === "center" ? x - w / 2 : x, y, w, h); return h;
}
function cta(c, W, H, t, texto) {
  if (EM_CONTEUDO) { EM_CONTEUDO.cta = texto; return; }
  const y = H - 150, size = 30;
  c.save(); c.shadowColor = "rgba(0,0,0,.18)"; c.shadowBlur = 24;
  const w = Math.min(W - 140, larg(c, texto, size, MARCA.corpo, 800) + 130);
  c.fillStyle = t.acc; rr(c, W / 2 - w / 2, y, w, 86, 43); c.fill(); c.restore();
  aviao(c, W / 2 - w / 2 + 52, y + 43, 34, t.accInk, Math.PI / 4);
  tx(c, texto, W / 2 + 22, y + 54, size, MARCA.corpo, t.accInk, "center", 800);
}
function titulos(c, W, y, t, cima, script, baixo) {
  if (cima) { const s = caber(c, cima, W - 160, 92, MARCA.titulo); tx(c, cima, W / 2, y, s, MARCA.titulo, t.ink, "center"); y += s * .95; }
  if (script) { const s = caber(c, script, W - 160, 84, MARCA.script); tx(c, script, W / 2, y + 6, s, MARCA.script, t.acc === MARCA.navy ? MARCA.navy : MARCA.amarelo, "center"); y += s * 1.05; }
  if (baixo) { const s = caber(c, baixo, W - 160, 80, MARCA.titulo); tx(c, baixo, W / 2, y, s, MARCA.titulo, t.ink, "center"); y += s; }
  return y;
}

/* ---------------- modelos */
function mPromo(c, W, H, t, a) {
  fundo(c, W, H, t);
  const alto = H > 1500, M = 80; let y = alto ? 150 : 110;
  y = titulos(c, W, y, t, "ALERTA DE PASSAGEM", "saindo de Fortaleza", null) + (alto ? 60 : 30);
  const nome = a.destino_nome.toUpperCase(), s = caber(c, nome, W - 160, alto ? 190 : 160, MARCA.titulo);
  tx(c, `${ORIGEM}  ✈  ${a.destino}`, W / 2, y, 34, MARCA.corpo, t.sub, "center", 700, 4); y += s * .95 + 10;
  tx(c, nome, W / 2, y, s, MARCA.titulo, t.ink, "center"); y += 40;
  pil(c, `${classeTxt(a)} · −${Math.round(a.desconto * 100)}% da média`, W / 2, y, 28, t.acc, t.accInk, 30, 64, MARCA.corpo, 800, "center"); y += 64 + (alto ? 60 : 36);
  // preço
  const ph = alto ? 250 : 210; c.fillStyle = t.card; rr(c, M, y, W - M * 2, ph, 44); c.fill();
  tx(c, "a partir de", W / 2, y + 62, 32, MARCA.corpo, t.cardInk, "center", 600);
  tx(c, brl(a.preco), W / 2, y + (alto ? 190 : 162), alto ? 130 : 110, MARCA.titulo, t.cardInk, "center");
  tx(c, (a.modo === "trecho" ? "o trecho" : "ida e volta") + ` · ${a.cia_nome || ""}${a.escalas === 0 ? " · voo direto" : ""}`, W / 2, y + ph - 22, 26, MARCA.corpo, t.cardInk, "center", 600);
  y += ph + 30;
  if (CR.datas && a.modo === "trecho") {
    const disp = H - 190 - y - (CR.mascote && alto ? 0 : 0);
    if (disp > 180) {
      const colW = (W - M * 2 - 60) / 2;
      const linhas = l => (l || []).slice(0, alto ? 3 : 2);
      const altura = Math.min(disp, 70 + Math.max(...[a.ida_meses, a.volta_meses].map(l => linhas(l).reduce((s, g) => s + 42 + Math.ceil(g.dias.length / Math.floor(colW / 62)) * 56, 0))));
      c.fillStyle = "rgba(255,255,255,.94)"; rr(c, M, y, W - M * 2, altura, 40); c.fill();
      [["DATAS DE IDA", a.ida_meses], ["DATAS DE VOLTA", a.volta_meses]].forEach(([tt, l], k) => {
        const x0 = M + 30 + k * (colW + 30); let yy = y + 52;
        tx(c, tt, x0, yy, 30, MARCA.titulo, MARCA.navy, "left", 400, 1);
        linhas(l).forEach(g => {
          yy += 38; tx(c, g.mes, x0, yy, 22, MARCA.corpo, "#5b6b7c", "left", 700);
          let cx = x0; yy += 12;
          g.dias.forEach(d => { if (cx + 56 > x0 + colW) { cx = x0; yy += 56; } if (yy + 48 > y + altura - 10) return; c.fillStyle = MARCA.amarelo; rr(c, cx, yy, 52, 46, 23); c.fill(); tx(c, d, cx + 26, yy + 32, 24, MARCA.corpo, MARCA.navy, "center", 800); cx += 60; });
          yy += 46;
        });
      });
    }
  }
  if (CR.mascote && EM_CONTEUDO) EM_CONTEUDO.mascote = alto ? 230 : 180;
  cta(c, W, H, t, "Receba alertas: " + linkGrupo().replace(/^https?:\/\//, ""));
  if (EM_CONTEUDO) EM_CONTEUDO.nota = true;
}
function mCapa(c, W, H, t, lista) {
  fundo(c, W, H, t);
  const lh = desenhaImg(c, "logo", W / 2, 110, H > 1300 ? 470 : 380);
  let y = 110 + lh + 70;
  y = titulos(c, W, y, t, "AS MELHORES PROMOÇÕES", "da semana", "SAINDO DO 085") + 40;
  let x = 0; const ws = lista.map(a => larg(c, a.destino, 28, MARCA.corpo, 800) + 52); const tot = ws.reduce((s, w) => s + w + 12, -12);
  x = W / 2 - tot / 2; lista.forEach((a, i) => { pil(c, a.destino, x, y, 28, t.card, t.cardInk, 26, 60, MARCA.corpo, 800); x += ws[i] + 12; });
  cta(c, W, H, t, "Arraste para o lado  →");
}
function mItem(c, W, H, t, a, i, n) {
  fundo(c, W, H, t);
  pil(c, `${i} de ${n}`, W / 2, 90, 26, t.acc, t.accInk, 26, 58, MARCA.corpo, 800, "center");
  let y = 300;
  tx(c, `${ORIGEM}  ✈  ${a.destino}`, W / 2, y, 34, MARCA.corpo, t.sub, "center", 700, 4);
  const s = caber(c, a.destino_nome.toUpperCase(), W - 160, 170, MARCA.titulo); y += s * .95 + 10;
  tx(c, a.destino_nome.toUpperCase(), W / 2, y, s, MARCA.titulo, t.ink, "center"); y += 50;
  pil(c, `${classeTxt(a)} · −${Math.round(a.desconto * 100)}%`, W / 2, y, 28, t.acc, t.accInk, 30, 64, MARCA.corpo, 800, "center"); y += 110;
  c.fillStyle = t.card; rr(c, 80, y, W - 160, 230, 44); c.fill();
  tx(c, "a partir de", W / 2, y + 62, 32, MARCA.corpo, t.cardInk, "center", 600);
  tx(c, brl(a.preco), W / 2, y + 180, 120, MARCA.titulo, t.cardInk, "center");
  y += 290; const m = mesesTxt(a);
  if (m) tx(c, `Datas em ${m} · ${a.cia_nome || ""}`, W / 2, y, 34, MARCA.corpo, t.ink, "center", 700);
  if (CR.mascote && EM_CONTEUDO) EM_CONTEUDO.mascote = 170;
  if (EM_CONTEUDO) EM_CONTEUDO.nota = true;
}
function mFinal(c, W, H, t) {
  fundo(c, W, H, t);
  const mh = desenhaImg(c, "mascote", W / 2, 140, H > 1300 ? 520 : 420);
  let y = 140 + mh + 90;
  y = titulos(c, W, y, t, "RECEBA AS PROMOÇÕES", "na hora certa", null) + 20;
  bloco(c, "Alertas de passagens baratas saindo de Fortaleza, direto no seu WhatsApp.", W / 2, y, W - 220, 34, MARCA.corpo, t.ink, "center", 600, 1.3);
  cta(c, W, H, t, linkGrupo().replace(/^https?:\/\//, ""));
}
function mFrase(c, W, H, t, x) {
  fundo(c, W, H, t); const alto = H > 1500;
  let y = alto ? 210 : 130;
  y = bloco(c, (x.titulo || "").toUpperCase(), W / 2, y, W - 200, alto ? 50 : 42, MARCA.titulo, t.ink, "center", 400, 1.12) + 30;
  const lh = desenhaImg(c, "logo", W / 2, y, alto ? 640 : (H > 1100 ? 520 : 440)); y += lh + (alto ? 70 : 40);
  if (x.destaque) y = bloco(c, x.destaque, W / 2, y, W - 180, alto ? 64 : 54, MARCA.script, t.acc === MARCA.navy ? MARCA.navy : MARCA.amarelo, "center", 400, 1.15, 3) + 70;
  if (x.rodape) bloco(c, x.rodape.toUpperCase(), W / 2, Math.min(y, H - 260), W - 200, 44, MARCA.titulo, t.ink, "center", 400, 1.15, 3);
  cta(c, W, H, t, "Siga @partiu.085 e ative os alertas");
}
function mBeneficios(c, W, H, t, x) {
  fundo(c, W, H, t); const alto = H > 1500;
  let y = titulos(c, W, alto ? 170 : 120, t, (x.titulo || "").toUpperCase(), x.destaque || "", null) + 20;
  const mh = desenhaImg(c, "mascote", W / 2, y, alto ? 520 : (H > 1100 ? 380 : 300)); y += mh + 40;
  const itens = String(x.lista || "").split("\n").filter(Boolean).slice(0, 7);
  itens.forEach(it => {
    const w = larg(c, it, 32, MARCA.corpo, 700) + 110;
    c.fillStyle = t.acc === MARCA.navy ? "rgba(23,58,94,.12)" : "rgba(255,255,255,.16)"; rr(c, W / 2 - w / 2, y, w, 66, 33); c.fill();
    c.fillStyle = t.acc; c.beginPath(); c.arc(W / 2 - w / 2 + 36, y + 33, 20, 0, 7); c.fill();
    aviao(c, W / 2 - w / 2 + 36, y + 33, 22, t.accInk, Math.PI / 4);
    tx(c, it, W / 2 - w / 2 + 72, y + 44, 32, MARCA.corpo, t.ink, "left", 700); y += 80;
  });
  cta(c, W, H, t, "Siga @partiu.085 e ative os alertas");
}
function mDica(c, W, H, t, x) {
  fundo(c, W, H, t); const alto = H > 1500;
  let y = alto ? 200 : 130;
  pil(c, "💳  " + (x.titulo || "DICA DE MILHAS"), W / 2, y - 60, 30, t.acc, t.accInk, 30, 70, MARCA.corpo, 800, "center"); y += 70;
  const fs = alto ? 84 : 70, l1 = quebrar(c, (x.destaque || "").toUpperCase(), W - 260, fs, MARCA.titulo).slice(0, 4).length,
    l2 = x.texto ? quebrar(c, x.texto, W - 280, 32, MARCA.corpo, 600).slice(0, 4).length : 0, ch = 120 + l1 * fs * 1.08 + (l2 ? 60 + l2 * 43 : 0) + 140;
  c.fillStyle = t.card; rr(c, 80, y, W - 160, ch, 48); c.fill();
  let yy = bloco(c, (x.destaque || "").toUpperCase(), W / 2, y + 120, W - 260, fs, MARCA.titulo, t.cardInk, "center", 400, 1.08, 4);
  if (x.texto) bloco(c, x.texto, W / 2, yy + 80, W - 280, 32, MARCA.corpo, t.cardInk, "center", 600, 1.35, 4);
  desenhaImg(c, "mascote", W - 180, y + ch - 110, alto ? 240 : 200);
  cta(c, W, H, t, "Salva o post pra lembrar depois!");
}
function mPergunta(c, W, H, t, x) {
  fundo(c, W, H, t); const alto = H > 1500;
  let y = bloco(c, x.titulo || "", W / 2 - 30, alto ? 260 : 170, W - 260, alto ? 100 : 84, MARCA.titulo, t.ink, "center", 400, 1.05, 6);
  desenhaImg(c, "mascote", W / 2, y + 60, alto ? 640 : (H > 1100 ? 440 : 360));
  if (x.destaque) tx(c, x.destaque, W / 2, H - 200, 58, MARCA.script, t.acc === MARCA.navy ? MARCA.navy : MARCA.amarelo, "center");
  cta(c, W, H, t, "Comenta aí ⬇️");
}
function mDestino(c, W, H, t, d) {
  fundo(c, W, H, t); const alto = H > 1500;
  if (!d) { tx(c, "Sem dados de destino ainda", W / 2, H / 2, 50, MARCA.titulo, t.ink, "center"); return; }
  let y = titulos(c, W, alto ? 170 : 120, t, "DESTINO EM DESTAQUE", "saindo de Fortaleza", null) + 30;
  const s = caber(c, d.nome.toUpperCase(), W - 160, 170, MARCA.titulo); y += s * .9;
  tx(c, d.nome.toUpperCase(), W / 2, y, s, MARCA.titulo, t.ink, "center"); y += 50;
  c.fillStyle = t.card; rr(c, 80, y, W - 160, 220, 44); c.fill();
  tx(c, "menor preço visto pelo radar", W / 2, y + 60, 30, MARCA.corpo, t.cardInk, "center", 600);
  tx(c, brl(d.menor), W / 2, y + 170, 110, MARCA.titulo, t.cardInk, "center"); y += 270;
  const cal = S.cal[d.k];
  if (cal && cal.ida && cal.ida.length) {
    const pm = {}; cal.ida.forEach(x => { const m = x.dia.slice(0, 7); pm[m] = Math.min(x.preco, pm[m] || 1e9); });
    const ms = Object.entries(pm).sort().slice(0, 4), max = Math.max(...ms.map(m => m[1])), bw = (W - 260) / ms.length;
    tx(c, "menor preço por mês (o trecho)", W / 2, y, 28, MARCA.corpo, t.ink, "center", 700); y += 80;
    const hmax = alto ? 300 : 200;
    ms.forEach(([m, p], i) => {
      const h = Math.max(30, hmax * p / max), x0 = 130 + i * bw + 14, best = p === Math.min(...ms.map(z => z[1]));
      c.fillStyle = best ? t.acc : (t.acc === MARCA.navy ? "rgba(23,58,94,.25)" : "rgba(255,255,255,.35)"); rr(c, x0, y + hmax - h, bw - 28, h, 18); c.fill();
      tx(c, brl(p), x0 + (bw - 28) / 2, y + hmax - h - 14, 26, MARCA.corpo, t.ink, "center", 800);
      tx(c, MC[+m.slice(5, 7) - 1].toUpperCase(), x0 + (bw - 28) / 2, y + hmax + 40, 30, MARCA.titulo, t.ink, "center");
    });
  } else if (d.melhor_mes) tx(c, `Melhor mês: ${MC[+d.melhor_mes.slice(5, 7) - 1]}`, W / 2, y + 40, 40, MARCA.corpo, t.ink, "center", 800);
  if (CR.mascote && EM_CONTEUDO) EM_CONTEUDO.mascote = 190;
  cta(c, W, H, t, "Receba alertas: " + linkGrupo().replace(/^https?:\/\//, ""));
}

/* compõe: fundo + miolo ampliado e centralizado no espaço livre + chamada no rodapé */
function compor(c, W, H, t, desenhar) {
  fundo(c, W, H, t);
  const off = document.createElement("canvas"); off.width = W; off.height = H; const o = off.getContext("2d");
  EM_CONTEUDO = { cta: null, nota: false, mascote: 0 };
  try { desenhar(o); } finally { var info = EM_CONTEUDO; EM_CONTEUDO = null; }
  const d = o.getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) if (d[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const topo = 70, base = (info.cta ? H - 200 - (info.nota ? 10 : 0) : H - 70) - (info.mascote ? info.mascote * .55 : 0), margem = 64;
  if (x1 > x0 && y1 > y0) {
    const bw = x1 - x0 + 6, bh = y1 - y0 + 6, dispW = W - margem * 2, dispH = base - topo;
    const k = Math.min(dispW / bw, dispH / bh, 1.7);
    const dw = bw * k, dh = bh * k, dx = (W - dw) / 2, dy = topo + (dispH - dh) / 2;
    c.drawImage(off, x0, y0, bw, bh, dx, dy, dw, dh);
  }
  if (info.mascote) desenhaImg(c, "mascote", W - info.mascote / 2 - 40, H - 200 - info.mascote * 1.0, info.mascote);
  if (info.cta) cta(c, W, H, t, info.cta);
  if (info.nota) tx(c, "Preço pode mudar a qualquer momento.", W / 2, H - 36, 22, MARCA.corpo, t.sub, "center", 500);
}

/* ---------------- página */
function destinoCR() {
  const L = (typeof destinosStatus === "function" ? destinosStatus() : []).sort((a, b) => b.d - a.d);
  return L.find(x => x.k === CR.dest) || L[0];
}
function legendaCR(a) {
  const ass = ASSINATURAS[new Date().getDate() % ASSINATURAS.length];
  const T = CR.txt;
  if (CR.tpl === "carrossel") {
    const l = topSemana();
    return `As melhores promoções da semana saindo de Fortaleza ✈️\n\n${l.map(x => `• ${x.destino_nome}: a partir de ${brl(x.preco)} ${x.modo === "trecho" ? "o trecho" : "ida e volta"} (−${Math.round(x.desconto * 100)}%)`).join("\n")}\n\n${ass}\nPreços podem mudar a qualquer momento.\n✈️ Receba alertas no WhatsApp: ${linkGrupo()}\n\n#partiu085 #passagensbaratas #fortaleza #ceara #viagem`;
  }
  if (CR.tpl === "promo" && a) return `🚨 ${a.destino_nome} a partir de ${brl(a.preco)} ${a.modo === "trecho" ? "o trecho" : "ida e volta"} saindo de Fortaleza!\n${Math.round(a.desconto * 100)}% abaixo da média · ${a.cia_nome || ""}${mesesTxt(a) ? ` · datas em ${mesesTxt(a)}` : ""}\n\n${ass}\nPreço pode mudar a qualquer momento.\n✈️ Receba alertas no WhatsApp: ${linkGrupo()}\n\n#partiu085 #passagensbaratas #fortaleza #${(a.destino_nome || "").toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}`;
  if (CR.tpl === "destino") { const d = destinoCR(); return d ? `🌎 Destino em destaque: ${d.nome}!\nO radar já viu passagem saindo de Fortaleza por ${brl(d.menor)} o trecho${d.melhor_mes ? `, e ${MC[+d.melhor_mes.slice(5, 7) - 1]} é o mês mais barato` : ""}.\n\nQuer ser avisado quando cair? Entra no grupo 👇\n✈️ ${linkGrupo()}\n\n#partiu085 #${d.nome.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")} #fortaleza` : ""; }
  if (CR.tpl === "frase") return `${T.titulo || ""} — ${T.destaque || ""}\n\n${T.rodape || ass}\n🔔 Ativa as notificações e não perde o próximo alerta!\n\n#partiu085 #viagem #fortaleza #ceara`;
  if (CR.tpl === "beneficios") return `A gente encontra, você embarca. 🌍\nDo 085 pra onde você quiser, com alertas, milhas e passagens que cabem no bolso.\n\n${String(T.lista || "").split("\n").filter(Boolean).map(l => "✈️ " + l).join("\n")}\n\nSegue o perfil e compartilha com quem também ama viajar!\n\n#partiu085 #viagem #fortaleza`;
  if (CR.tpl === "dica") return `💳 ${T.destaque || ""}\n${T.texto || ""}\n\nPlanejamento é o segredo pra multiplicar suas milhas e viajar mais!\nSalva o post pra lembrar depois! 📌\n\n#partiu085 #milhas #dicasdeviagem`;
  if (CR.tpl === "pergunta") return `${T.titulo || ""} 🌎\nComenta aqui e marca aquele parceiro de viagem que iria junto contigo!\n\n#partiu085 #viagem #fortaleza`;
  return "";
}
function campos() {
  const T = CR.txt, f = (k, l, area = false) => `<div class="field"><label>${l}</label>${area ? `<textarea data-crt="${k}" style="min-height:140px">${esc(T[k] || "")}</textarea>` : `<input data-crt="${k}" value="${esc(T[k] || "")}">`}</div>`;
  const sorteia = `<button class="bt sm ghost" data-act="crsortear">${ic("refresh")}Sortear outro texto</button>`;
  if (CR.tpl === "frase") return f("titulo", "Frase de cima") + f("destaque", "Frase em letra cursiva") + f("rodape", "Frase de baixo") + `<div class="cr-frases">${SLOGANS.concat(ASSINATURAS).slice(0, 22).map(s => `<button class="chip" data-act="crfrase" data-t="${esc(s)}">${esc(s.length > 48 ? s.slice(0, 46) + "…" : s)}</button>`).join("")}</div>` + sorteia;
  if (CR.tpl === "beneficios") return f("titulo", "Título") + f("destaque", "Letra cursiva") + f("lista", "Itens (um por linha)", true);
  if (CR.tpl === "dica") return f("destaque", "Dica (grande)") + f("texto", "Explicação") + sorteia;
  if (CR.tpl === "pergunta") return f("titulo", "Pergunta") + f("destaque", "Chamada em letra cursiva") + sorteia;
  return "";
}
function pCriativos() {
  const a = alertaCR(); if (a && !CR.id) CR.id = a.id;
  if (!Object.keys(CR.txt).length) CR.txt = txtPadrao(CR.tpl);
  const chip = (k, v, t) => `<button class="chip ${CR[k] === v ? "on" : ""}" data-act="cr" data-k="${k}" data-v="${v}">${t}</button>`;
  const dests = typeof destinosStatus === "function" ? destinosStatus().sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR")) : [];
  const lista = topSemana();
  return head("Criativos", "Artes de stories, feed e carrossel com a identidade do Partiu 085",
    `<a class="bt" href="#marketing">${ic("calendar")}Calendário de posts</a>${CR.hashId ? `<a class="bt" href="#alertas">${ic("back")}Voltar aos alertas</a>` : ""}`) +
    `<div class="grid cr-grid">
      <div class="card cr-ctrl">
        <div class="field"><label>1. O que você quer criar?</label><div class="cr-tpls">${TPLS.map(([v, t]) => `<button class="tplb ${CR.tpl === v ? "on" : ""}" data-act="crtpl" data-v="${v}">${t}</button>`).join("")}</div></div>
        <div class="field"><label>2. Formato</label><div class="presets" style="margin-top:0">${chip("fmt", "stories", "Stories 9:16")}${chip("fmt", "feed", "Feed 4:5")}${chip("fmt", "quadrado", "Quadrado 1:1")}</div></div>
        <div class="field"><label>3. Cor</label><div class="presets" style="margin-top:0">${chip("tema", "azul", "Azul")}${chip("tema", "amarelo", "Amarelo")}${chip("tema", "noite", "Azul-noite")}${chip("tema", "creme", "Creme")}</div></div>
        ${CR.tpl === "promo" ? `<div class="field"><label>4. Qual promoção</label><select id="cr-alerta">${S.alertas.slice(0, 80).map(x => `<option value="${esc(x.id)}" ${x.id === CR.id ? "selected" : ""}>${esc(x.destino_nome)} · ${brl(x.preco)} · ${dm(x.criado)} ${x.criado.slice(11, 16)}${enviado(x) ? " · enviado" : ""}</option>`).join("")}</select></div>
          <label class="chk"><input type="checkbox" data-act="crdatas" ${CR.datas ? "checked" : ""}> Mostrar as datas</label>` : ""}
        ${CR.tpl === "destino" ? `<div class="field"><label>4. Qual destino</label><select id="cr-dest">${dests.map(d => `<option value="${d.k}" ${(CR.dest || (destinoCR() || {}).k) === d.k ? "selected" : ""}>${esc(d.nome)} · desde ${brl(d.menor)}</option>`).join("")}</select></div>` : ""}
        ${CR.tpl === "carrossel" ? `<div class="aviso"><span>${lista.length} destino${lista.length === 1 ? "" : "s"} dos últimos 7 dias, do maior para o menor desconto. Capa + ${lista.length} + convite final.</span></div>` : ""}
        ${campos()}
        <label class="chk"><input type="checkbox" data-act="crmascote" ${CR.mascote ? "checked" : ""}> Mostrar o mascote</label>
        <button class="bt pri lg" data-act="crbaixar">${ic("down")}${CR.tpl === "carrossel" ? "Baixar todas as imagens" : "Baixar imagem"}</button>
        <div class="field"><label>Legenda sugerida</label><textarea id="cr-leg" style="min-height:200px">${esc(legendaCR(a))}</textarea></div>
        <button class="bt" data-act="crleg">${ic("copy")}Copiar legenda</button>
      </div>
      <div class="card cr-prev ${CR.tpl === "carrossel" ? "carr" : ""}" id="cr-prev"><div class="carregando"><svg class="i"><use href="#i-plane"/></svg><span>Desenhando…</span></div></div>
    </div>`;
}
async function desenharCriativo() {
  const box = $("#cr-prev"); if (!box) return;
  try { await Promise.all([`400 80px ${MARCA.titulo}`, `400 60px ${MARCA.script}`, `800 30px ${MARCA.corpo}`, `600 30px ${MARCA.corpo}`].map(f => document.fonts.load(f))); } catch (e) { }
  if (CR.tpl === "destino") { const d = destinoCR(); if (d && typeof carregarCal === "function") await carregarCal(d.k); }
  const t = TEMAS[CR.tema] || TEMAS.azul, [W, H] = FMT[CR.fmt] || FMT.stories, X = CR.txt;
  const telas = [];
  if (CR.tpl === "carrossel") {
    const l = topSemana(); telas.push(c => compor(c, W, H, t, o => mCapa(o, W, H, t, l)));
    l.forEach((a, i) => { const ti = i % 2 ? (CR.tema === "amarelo" ? TEMAS.azul : TEMAS.amarelo) : t; telas.push(c => compor(c, W, H, ti, o => mItem(o, W, H, ti, a, i + 1, l.length))); });
    telas.push(c => compor(c, W, H, t, o => mFinal(o, W, H, t)));
  } else {
    const a = S.alertas.find(x => x.id === CR.id) || S.alertas[0];
    const fn = { promo: c => a && mPromo(c, W, H, t, a), frase: c => mFrase(c, W, H, t, X), beneficios: c => mBeneficios(c, W, H, t, X),
      dica: c => mDica(c, W, H, t, X), pergunta: c => mPergunta(c, W, H, t, X), destino: c => mDestino(c, W, H, t, destinoCR()) }[CR.tpl];
    telas.push(c => compor(c, W, H, t, fn));
  }
  box.innerHTML = "";
  telas.forEach((fn, i) => { const cv = document.createElement("canvas"); cv.width = W; cv.height = H; cv.dataset.n = i + 1; try { fn(cv.getContext("2d")); } catch (e) { console.error(e); } box.appendChild(cv); });
}
function baixarCriativos() {
  const cvs = [...document.querySelectorAll("#cr-prev canvas")];
  const a = S.alertas.find(x => x.id === CR.id);
  cvs.forEach((cv, i) => setTimeout(() => cv.toBlob(b => {
    const u = URL.createObjectURL(b), l = document.createElement("a");
    l.href = u; l.download = `partiu085-${CR.tpl}-${CR.fmt}${CR.tpl === "promo" && a ? "-" + a.destino : ""}${cvs.length > 1 ? "-" + (i + 1) : ""}.png`;
    document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  }, "image/png"), i * 450));
  toast(cvs.length > 1 ? `Baixando ${cvs.length} imagens…` : "Imagem baixada.");
}
function atualizarLegenda() { const l = $("#cr-leg"); if (l) l.value = legendaCR(S.alertas.find(x => x.id === CR.id)); }
let _crT;
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const act = b.dataset.act;
  if (act === "cr") { CR[b.dataset.k] = b.dataset.v; render(); }
  else if (act === "crtpl") { CR.tpl = b.dataset.v; CR.txt = txtPadrao(CR.tpl); render(); }
  else if (act === "crsortear") { CR.txt = txtPadrao(CR.tpl); render(); }
  else if (act === "crfrase") { const [p1, p2] = b.dataset.t.split(" — "); if (p2) { CR.txt.titulo = p1; CR.txt.destaque = p2; } else CR.txt.rodape = p1; render(); }
  else if (act === "crbaixar") baixarCriativos();
  else if (act === "crleg") { await copiar($("#cr-leg").value); toast("Legenda copiada."); }
});
document.addEventListener("change", e => {
  if (e.target.id === "cr-alerta") { CR.id = e.target.value; render(); }
  else if (e.target.id === "cr-dest") { CR.dest = e.target.value; render(); }
  else if (e.target.dataset.act === "crdatas") { CR.datas = e.target.checked; desenharCriativo(); }
  else if (e.target.dataset.act === "crmascote") { CR.mascote = e.target.checked; desenharCriativo(); }
});
document.addEventListener("input", e => {
  if (e.target.dataset.crt) { CR.txt[e.target.dataset.crt] = e.target.value; clearTimeout(_crT); _crT = setTimeout(() => { desenharCriativo(); atualizarLegenda(); }, 250); }
});
