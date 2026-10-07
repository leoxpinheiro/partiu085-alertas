/* Radar Partiu085 — Criativos: banners de stories, posts de feed e carrossel com as promoções reais do radar */
"use strict";

const CR = { tipo: "stories", tema: "claro", id: "", datas: true };
const FMT = { stories: [1080, 1920], feed: [1080, 1350], carrossel: [1080, 1350] };
const PAL = {
  claro: { bg: "#E9EDEA", glow: "rgba(194,248,108,.55)", ink: "#141414", sub: "#646464", tile: "#FFFFFF", chip: "#F4F4F4", acc: "#C2F86C", accInk: "#141414", pill: "#141414", pillInk: "#FFFFFF" },
  escuro: { bg: "#121314", glow: "rgba(194,248,108,.16)", ink: "#F4F5F6", sub: "#9C9DA2", tile: "#1A1B1D", chip: "#27282B", acc: "#C2F86C", accInk: "#141414", pill: "#C2F86C", pillInk: "#141414" },
  lima: { bg: "#C2F86C", glow: "rgba(255,255,255,.35)", ink: "#141414", sub: "rgba(20,20,20,.62)", tile: "#FFFFFF", chip: "rgba(255,255,255,.55)", acc: "#141414", accInk: "#FFFFFF", pill: "#141414", pillInk: "#FFFFFF" },
};
const FONTE = '"Plus Jakarta Sans", system-ui, sans-serif';
const MESES_C = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function alertaCR() {
  const q = new URLSearchParams((location.hash.split("?")[1]) || "");
  if (q.get("id")) { CR.id = q.get("id"); history.replaceState(null, "", "#criativos"); }
  return S.alertas.find(a => a.id === CR.id) || S.alertas[0];
}
function topSemana() {
  const lim = diaMenos(hojeISO(), 6);
  const vistos = new Set();
  return S.alertas.filter(a => a.criado.slice(0, 10) >= lim).sort((x, y) => y.desconto - x.desconto)
    .filter(a => !vistos.has(a.destino) && vistos.add(a.destino)).slice(0, 5);
}
function linkGrupo() { return (S.ajustes && S.ajustes.link_whatsapp) || "bit.ly/radar085"; }
function mesesTxt(a) {
  const ds = (a.datas_ida || []).map(d => d.dia).concat((a.datas || []).map(d => d.ida));
  const ms = [...new Set(ds.map(d => d.slice(0, 7)))].sort().map(m => MESES_C[+m.slice(5, 7) - 1]);
  return ms.length > 1 ? ms.slice(0, -1).join(", ") + " e " + ms[ms.length - 1] : (ms[0] || "");
}
function classeTxt(a) { return { imperdivel: "IMPERDÍVEL", otima: "ÓTIMA OPORTUNIDADE", boa: "BOA OPORTUNIDADE" }[a.classe || "boa"]; }

/* ---------- desenho */
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function txt(ctx, t, x, y, size, weight = 500, cor = "#141414", align = "left", ls = 0) {
  ctx.font = `${weight} ${size}px ${FONTE}`; ctx.fillStyle = cor; ctx.textAlign = align; ctx.textBaseline = "alphabetic";
  if ("letterSpacing" in ctx) ctx.letterSpacing = ls + "px";
  ctx.fillText(t, x, y);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
}
function largura(ctx, t, size, weight = 500) { ctx.font = `${weight} ${size}px ${FONTE}`; return ctx.measureText(t).width; }
function caber(ctx, t, maxW, size, weight, min = 40) { let s = size; while (s > min && largura(ctx, t, s, weight) > maxW) s -= 4; return s; }
function pilula(ctx, t, x, y, size, bg, cor, padX = 26, h = null, weight = 600) {
  const w = largura(ctx, t, size, weight) + padX * 2, hh = h || size * 2.1;
  ctx.fillStyle = bg; rr(ctx, x, y, w, hh, hh / 2); ctx.fill();
  txt(ctx, t, x + padX, y + hh / 2 + size * 0.36, size, weight, cor);
  return w;
}
function marca(ctx, x, y, s, p) {
  ctx.fillStyle = "#141414"; rr(ctx, x, y, s, s, s * 0.3); ctx.fill();
  if (p === PAL.escuro) { ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 2; ctx.stroke(); }
  ctx.strokeStyle = "#C2F86C"; ctx.lineWidth = s * 0.045; ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s * 0.28, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#C2F86C"; ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s * 0.13, 0, Math.PI * 2); ctx.fill();
}
function fundo(ctx, W, H, p) {
  ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(0, H, 0, 0, H, W * 1.1); g.addColorStop(0, p.glow); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function cabecalho(ctx, W, p, M, etiqueta = "O RADAR APITOU") {
  marca(ctx, M, M, 96, p);
  txt(ctx, "Partiu085", M + 120, M + 46, 40, 600, p.ink, "left", -0.8);
  txt(ctx, "radar de passagens · Fortaleza", M + 120, M + 84, 26, 400, p.sub);
  const w = largura(ctx, etiqueta, 26, 600) + 52;
  pilula(ctx, etiqueta, W - M - w, M + 20, 26, p.pill, p.pillInk, 26, 58);
}
function rodape(ctx, W, H, p, M) {
  const h = 116, y = H - M - h;
  ctx.fillStyle = p.pill; rr(ctx, M, y, W - M * 2, h, h / 2); ctx.fill();
  txt(ctx, "Receba alertas no WhatsApp", M + 48, y + 50, 28, 500, p.pillInk);
  txt(ctx, linkGrupo().replace(/^https?:\/\//, ""), M + 48, y + 90, 34, 700, p === PAL.escuro ? "#141414" : "#C2F86C");
  txt(ctx, "→", W - M - 56, y + 74, 52, 500, p.pillInk, "right");
}
function blocoDatas(ctx, x, y, w, titulo, meses, p, maxLinhas, medir = false, big = false) {
  const cw = big ? 76 : 64, ch = big ? 62 : 54, fs = big ? 30 : 26, gap = big ? 86 : 74, lh = ch + 12;
  if (!medir) txt(ctx, titulo, x, y, big ? 34 : 30, 600, p.ink);
  let yy = y + 26, linhas = 0;
  for (const g of meses) {
    if (linhas >= maxLinhas) break;
    yy += 44; if (!medir) txt(ctx, g.mes.toUpperCase(), x, yy, big ? 24 : 22, 600, p.sub, "left", 2);
    let cx = x; yy += 18;
    for (const d of g.dias) {
      if (cx + cw > x + w) { cx = x; yy += lh; linhas++; if (linhas >= maxLinhas) break; }
      if (!medir) { ctx.fillStyle = p.chip; rr(ctx, cx, yy, cw, ch, ch / 2); ctx.fill(); txt(ctx, d, cx + cw / 2, yy + ch / 2 + fs * 0.36, fs, 600, p.ink, "center"); }
      cx += gap;
    }
    yy += ch; linhas++;
  }
  return yy - y;
}
function desenharAlerta(ctx, W, H, a, p) {
  const M = 72, trecho = a.modo === "trecho";
  fundo(ctx, W, H, p); cabecalho(ctx, W, p, M);
  const st = W / 1080, alto = H > 1500;
  let y = M + 96 + (alto ? 150 : 84);
  txt(ctx, `${ORIGEM}  →  ${a.destino}`, M, y, 34, 600, p.sub, "left", 4);
  const nome = a.destino_nome;
  const sz = caber(ctx, nome, W - M * 2, alto ? 150 : 128, 600, 70);
  y += sz * 1.02; txt(ctx, nome, M, y, sz, 600, p.ink, "left", -sz * 0.03);
  y += 40;
  let x = M;
  x += pilula(ctx, classeTxt(a), x, y, 26, p.acc, p.accInk, 26, 60) + 14;
  pilula(ctx, `−${Math.round(a.desconto * 100)}% abaixo da média`, x, y, 26, p.tile, p.ink, 26, 60, 500);
  y += 60 + (alto ? 90 : 60);
  txt(ctx, "a partir de", M, y, 34, 400, p.sub);
  const ps = alto ? 190 : 160;
  y += ps * 0.95; txt(ctx, brl(a.preco), M - 6, y, ps, 600, p.ink, "left", -ps * 0.035);
  y += 56; txt(ctx, (trecho ? "o trecho" : "ida e volta") + ` · ${a.cia_nome || ""}${a.escalas === 0 ? " · voo direto" : a.escalas ? ` · ${a.escalas} parada${a.escalas > 1 ? "s" : ""}` : ""}`, M, y, 32, 500, p.sub);
  if (CR.datas) {
    y += alto ? 60 : 40;
    const hDisp = H - M - 116 - 56 - y;
    const pad = 44, colW = (W - M * 2 - pad * 3) / 2;
    if (trecho && hDisp > 200) {
      let maxL = 8, need;
      const medirTudo = L => Math.max(blocoDatas(ctx, 0, 0, colW, "", a.ida_meses || [], p, L, true, alto), blocoDatas(ctx, 0, 0, colW, "", a.volta_meses || [], p, L, true, alto)) + pad * 2;
      while ((need = medirTudo(maxL)) > hDisp && maxL > 1) maxL--;
      const hBox = Math.min(need, hDisp), y0 = y + (hDisp - hBox) / 2;
      ctx.fillStyle = p.tile; rr(ctx, M, y0, W - M * 2, hBox, 48); ctx.fill();
      blocoDatas(ctx, M + pad, y0 + pad + 26, colW, "Datas de ida", a.ida_meses || [], p, maxL, false, alto);
      blocoDatas(ctx, M + pad * 2 + colW, y0 + pad + 26, colW, "Datas de volta", a.volta_meses || [], p, maxL, false, alto);
    } else if (!trecho && hDisp > 160) {
      const ds = (a.datas || []).slice(0, Math.max(1, Math.floor((hDisp - 110) / 62)));
      const hBox = Math.min(hDisp, 110 + ds.length * 62), y0 = y + (hDisp - hBox) / 2;
      ctx.fillStyle = p.tile; rr(ctx, M, y0, W - M * 2, hBox, 48); ctx.fill();
      txt(ctx, "Datas (ida → volta)", M + pad, y0 + pad + 26, 30, 600, p.ink);
      ds.forEach((d, i) => txt(ctx, `${dm(d.ida)}  →  ${dm(d.volta)}`, M + pad, y0 + pad + 90 + i * 62, 34, 600, p.ink));
    }
  }
  txt(ctx, "Preço pode mudar a qualquer momento.", W / 2, H - M - 116 - 22, 24, 400, p.sub, "center");
  rodape(ctx, W, H, p, M);
}
function desenharCapa(ctx, W, H, lista, p) {
  const M = 72; fundo(ctx, W, H, p); cabecalho(ctx, W, p, M, "TOP DA SEMANA");
  let y = 430;
  ["As melhores", "promoções da", "semana saindo", "de Fortaleza"].forEach((l, i) => { txt(ctx, l, M, y, 104, 600, i === 3 ? p.ink : p.ink, "left", -3); y += 116; });
  y += 30; txt(ctx, `${lista.length} destino${lista.length > 1 ? "s" : ""} com preço abaixo da média`, M, y, 34, 500, p.sub);
  y += 70; let x = M;
  lista.slice(0, 5).forEach(a => { x += pilula(ctx, a.destino, x, y, 28, p.tile, p.ink, 24, 62) + 12; });
  pilula(ctx, "Arraste para o lado  →", M, H - M - 90, 30, p.acc, p.accInk, 34, 90);
}
function desenharItem(ctx, W, H, a, i, n, p) {
  const M = 72; fundo(ctx, W, H, p); cabecalho(ctx, W, p, M, `${i}/${n}`);
  let y = 360;
  txt(ctx, `${ORIGEM}  →  ${a.destino}`, M, y, 34, 600, p.sub, "left", 4);
  const sz = caber(ctx, a.destino_nome, W - M * 2, 130, 600, 70); y += sz * 1.05;
  txt(ctx, a.destino_nome, M, y, sz, 600, p.ink, "left", -3);
  y += 44; let x = M;
  x += pilula(ctx, classeTxt(a), x, y, 26, p.acc, p.accInk, 26, 60) + 14;
  pilula(ctx, `−${Math.round(a.desconto * 100)}% abaixo da média`, x, y, 26, p.tile, p.ink, 26, 60, 500);
  y += 150; txt(ctx, "a partir de", M, y, 34, 400, p.sub);
  y += 170; txt(ctx, brl(a.preco), M - 6, y, 180, 600, p.ink, "left", -6);
  y += 64; txt(ctx, (a.modo === "trecho" ? "o trecho" : "ida e volta") + ` · ${a.cia_nome || ""}`, M, y, 32, 500, p.sub);
  const meses = mesesTxt(a);
  if (meses) { y += 90; ctx.fillStyle = p.tile; rr(ctx, M, y, W - M * 2, 120, 60); ctx.fill(); txt(ctx, `Datas em ${meses}`, M + 44, y + 72, 36, 600, p.ink); }
  txt(ctx, "Preço pode mudar a qualquer momento.", M, H - M - 10, 24, 400, p.sub);
}
function desenharFinal(ctx, W, H, p) {
  const M = 72; fundo(ctx, W, H, p); cabecalho(ctx, W, p, M, "PARTIU?");
  let y = 520;
  ["Receba as", "promoções na", "hora certa"].forEach(l => { txt(ctx, l, M, y, 112, 600, p.ink, "left", -3); y += 124; });
  y += 30; txt(ctx, "Alertas de passagens baratas saindo de Fortaleza,", M, y, 34, 400, p.sub);
  y += 48; txt(ctx, "direto no seu WhatsApp.", M, y, 34, 400, p.sub);
  rodape(ctx, W, H, p, M);
}

/* ---------- página */
function legendaCR(a) {
  if (CR.tipo === "carrossel") {
    const l = topSemana();
    return `As melhores promoções da semana saindo de Fortaleza ✈️\n\n${l.map(x => `• ${x.destino_nome}: a partir de ${brl(x.preco)} ${x.modo === "trecho" ? "o trecho" : "ida e volta"} (−${Math.round(x.desconto * 100)}%)`).join("\n")}\n\nPreços podem mudar a qualquer momento.\n✈️ Receba alertas no WhatsApp: ${linkGrupo()}\n\n#passagensbaratas #fortaleza #partiu085 #viagem #promocaodepassagem`;
  }
  if (!a) return "";
  return `🚨 ${a.destino_nome} a partir de ${brl(a.preco)} ${a.modo === "trecho" ? "o trecho" : "ida e volta"} saindo de Fortaleza!\n${Math.round(a.desconto * 100)}% abaixo da média · ${a.cia_nome || ""}${mesesTxt(a) ? ` · datas em ${mesesTxt(a)}` : ""}\n\nPreço pode mudar a qualquer momento.\n✈️ Receba alertas no WhatsApp: ${linkGrupo()}\n\n#passagensbaratas #fortaleza #partiu085 #${(a.destino_nome || "").toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}`;
}
function pCriativos() {
  const a = alertaCR(); if (a) CR.id = a.id;
  const chip = (k, v, t) => `<button class="chip ${CR[k] === v ? "on" : ""}" data-act="cr" data-k="${k}" data-v="${v}">${t}</button>`;
  const carr = CR.tipo === "carrossel";
  const lista = topSemana();
  return head("Criativos", "Banners de stories, posts de feed e carrossel com as promoções reais do radar") +
    (!S.alertas.length ? `<div class="card vazio">Ainda não há alertas para virar banner.</div>` :
    `<div class="grid cr-grid">
      <div class="card">
        <div class="field"><label>Formato</label><div class="presets" style="margin-top:0">${chip("tipo", "stories", "Stories 9:16")}${chip("tipo", "feed", "Post do feed 4:5")}${chip("tipo", "carrossel", "Carrossel: top da semana")}</div></div>
        <div class="sec-gap"></div>
        ${carr ? `<div class="aviso"><span>${lista.length} destino${lista.length === 1 ? "" : "s"} dos últimos 7 dias, do maior para o menor desconto (um por destino).</span></div>` :
        `<div class="field"><label>Promoção</label><select id="cr-alerta">${S.alertas.slice(0, 60).map(x => `<option value="${esc(x.id)}" ${x.id === CR.id ? "selected" : ""}>${esc(x.destino_nome)} · ${brl(x.preco)} · ${dm(x.criado)} ${x.criado.slice(11, 16)}${enviado(x) ? " · enviado" : ""}</option>`).join("")}</select></div>`}
        <div class="sec-gap"></div>
        <div class="field"><label>Estilo</label><div class="presets" style="margin-top:0">${chip("tema", "claro", "Claro")}${chip("tema", "escuro", "Escuro")}${chip("tema", "lima", "Lima")}</div></div>
        ${carr ? "" : `<div class="sec-gap"></div><label class="chk"><input type="checkbox" data-act="crdatas" ${CR.datas ? "checked" : ""}> Mostrar as datas no banner</label>`}
        <div class="sec-gap"></div>
        <div class="al-acts"><button class="bt pri lg" data-act="crbaixar">${ic("down")}${carr ? "Baixar todas as imagens" : "Baixar imagem"}</button></div>
        <div class="sec-gap"></div>
        <div class="field"><label>Legenda sugerida</label><textarea id="cr-leg" style="min-height:220px">${esc(legendaCR(a))}</textarea></div>
        <div class="al-acts" style="margin-top:var(--space-3)"><button class="bt" data-act="crleg">${ic("copy")}Copiar legenda</button></div>
      </div>
      <div class="card cr-prev ${carr ? "carr" : ""}" id="cr-prev"></div>
    </div>`);
}
async function desenharCriativo() {
  const box = $("#cr-prev"); if (!box) return;
  try { await document.fonts.load(`600 100px ${FONTE}`); await document.fonts.load(`400 30px ${FONTE}`); } catch (e) { }
  const p = PAL[CR.tema], [W, H] = FMT[CR.tipo];
  const telas = [];
  if (CR.tipo === "carrossel") {
    const l = topSemana();
    telas.push(c => desenharCapa(c, W, H, l, p));
    l.forEach((a, i) => telas.push(c => desenharItem(c, W, H, a, i + 1, l.length, p)));
    telas.push(c => desenharFinal(c, W, H, p));
  } else {
    const a = S.alertas.find(x => x.id === CR.id) || S.alertas[0];
    telas.push(c => desenharAlerta(c, W, H, a, p));
  }
  box.innerHTML = "";
  telas.forEach((fn, i) => {
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H; cv.dataset.n = i + 1;
    fn(cv.getContext("2d")); box.appendChild(cv);
  });
}
function baixarCriativos() {
  const cvs = [...document.querySelectorAll("#cr-prev canvas")];
  const a = S.alertas.find(x => x.id === CR.id);
  cvs.forEach((cv, i) => setTimeout(() => cv.toBlob(b => {
    const u = URL.createObjectURL(b), l = document.createElement("a");
    l.href = u; l.download = CR.tipo === "carrossel" ? `partiu085-top-semana-${i + 1}.png` : `partiu085-${CR.tipo}-${(a && a.destino) || "promo"}.png`;
    document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  }, "image/png"), i * 450));
  toast(cvs.length > 1 ? `Baixando ${cvs.length} imagens…` : "Imagem baixada.");
}
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const act = b.dataset.act;
  if (act === "cr") { CR[b.dataset.k] = b.dataset.v; render(); }
  else if (act === "crbaixar") baixarCriativos();
  else if (act === "crleg") { await copiar($("#cr-leg").value); toast("Legenda copiada."); }
});
document.addEventListener("change", e => {
  if (e.target.id === "cr-alerta") { CR.id = e.target.value; render(); }
  else if (e.target.dataset.act === "crdatas") { CR.datas = e.target.checked; desenharCriativo(); }
});
