/* Partiu 085 — Conversor: cola o texto de qualquer canal (um ou vários de uma vez) e ele reescreve no jeito 085
   (passagem em dinheiro, passagem em milhas ou promoção de pontos/bônus), com imagem pronta pro grupo. */
"use strict";
const CV = { txt: "", itens: [], img: true };
try { CV.img = localStorage.getItem("p085_conv_img") !== "0"; } catch (e) { }
const MES_RE = "(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)";
function mesIdx(s) { const k = semAc(s).slice(0, 3); return ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"].indexOf(k); }
function iso(y, m, d) { return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }
/* datas em qualquer formato: "Novembro: 3, 5", "nov/26: 03, 05", "10/11 e 12/11", "15 de dezembro" */
function datasLivres(t) {
  const out = [];
  t.replace(/\*|_/g, "").split("\n").forEach(l => {
    let m = l.match(new RegExp(MES_RE + "(?:\\s*(?:/|de)?\\s*(\\d{2,4}))?\\s*[:\\-–]\\s*([\\d,\\se]+)$", "i"));
    if (m) { const mi = mesIdx(m[1]); let y = m[2] ? +m[2] : anoPara(mi); if (y < 100) y += 2000; m[3].split(/[,\se]+/).filter(Boolean).forEach(d => { if (+d >= 1 && +d <= 31) out.push(iso(y, mi, +d)); }); return; }
    for (const x of l.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g)) { const mi = +x[2] - 1; if (mi < 0 || mi > 11 || +x[1] > 31) continue; let y = x[3] ? +x[3] : anoPara(mi); if (y < 100) y += 2000; out.push(iso(y, mi, +x[1])); }
    for (const x of l.matchAll(new RegExp("\\b(\\d{1,2})\\s+de\\s+" + MES_RE, "gi"))) { const mi = mesIdx(x[2]); out.push(iso(anoPara(mi), mi, +x[1])); }
  });
  return [...new Set(out)].filter(d => d >= hojeISO()).sort();
}
function idaVolta(t) {
  const lin = t.split("\n"), iv = lin.findIndex(l => /\bvolta\b/i.test(l) && !/ida e volta/i.test(l));
  if (iv < 0) return { idas: datasLivres(t), voltas: [] };
  return { idas: datasLivres(lin.slice(0, iv).join("\n")), voltas: datasLivres(lin.slice(iv).join("\n")) };
}
function dividirBlocos(txt) {
  const t = String(txt).replace(/\r/g, "").trim(); if (!t) return [];
  let partes = t.split(/\n\s*\n\s*\n+|\n\s*[-—_=]{4,}\s*\n|(?=^[^\n]*Oportunidade de resgate)/im).map(x => x.trim()).filter(x => x.length > 25);
  if (partes.length <= 1) { const p2 = t.split(/(?=^\s*(?:🚨|🔥|⚠️\s*ALERTA|ALERTA DE|PASSAGEM BARATA|PROMO[CÇ][AÃ]O))/im).map(x => x.trim()).filter(x => x.length > 25); if (p2.length > 1) partes = p2; }
  return partes.length ? partes : [t];
}
const PROG_DESTINO = [[/smiles/i, "Smiles"], [/tudo\s*azul|azul\s*fidelidade|\bazul\b/i, "Azul Fidelidade"], [/latam/i, "LATAM Pass"], [/tap|miles\s*&?\s*go/i, "TAP Miles&Go"]];
function progDe(t) { return (PROG_DESTINO.find(([re]) => re.test(t)) || [, ""])[1]; }
function preco(s) { return Math.round(+String(s).replace(/\./g, "").replace(",", ".")); }

/* entende um bloco: resgate em milhas, passagem em dinheiro ou promoção de pontos */
function entenderBloco(b) {
  const r = lerResgate(b);
  if (r.iata && r.milhas && r.idas.length) return { tipo: "milhas", r, orig: b };
  const o = extrair(b), dv = idaVolta(b), low = semAc(b);
  if (o.tipo === "bonus" || (/(bonus|bonifica|desconto na compra|compra de (pontos|milhas)|clube)/.test(low) && !/r\$\s*\d+[.,]?\d*\s*(o trecho|ida)/i.test(b) && !o.destino)) {
    const pct = (b.match(/(\d{2,3})\s*%/) || [])[1];
    const progs = PROGRAMAS.filter(p => new RegExp(p.replace(/[&]/g, "\\$&"), "i").test(b));
    const val = (b.match(/(?:at[ée]|v[áa]lid[oa]\s*at[ée]|termina|encerra|só at[ée])[^0-9\n]{0,15}(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i) || [])[1] || "";
    const sub = /compra/.test(low) ? "compra" : /clube/.test(low) ? "clube" : "bonus";
    return { tipo: "promo", p: { sub, pct: pct ? +pct : null, de: progs[0] || "", para: progs[1] || "", validade: val, titulo: (b.split("\n").find(l => l.replace(/[^\wÀ-ú]/g, "").length > 12) || "").replace(/[*_]/g, "").replace(/^[^\wÀ-ú]+/u, "").trim() }, orig: b };
  }
  if (o.tipo === "milhas" || /milhas|pontos/i.test(b) && !/R\$\s*\d/.test(b.split(/taxa/i)[0])) {
    const mil = lerMilhas((b.match(/(\d[\d.,]*\s*(?:mil|k)?)\s*(?:milhas|pontos)/i) || b.match(/(\d+[.,]?\d*\s*k)\b/i) || [])[1] || "");
    const tx = (b.match(/(?:\+|taxas?)[^\dR]{0,12}R\$\s*([\d.,]+)/i) || [])[1];
    const iata = o.destino || "";
    return { tipo: "milhas", r: { prog: progDe(b), iata, nome: iata ? (IATA[iata] || iata).split(" (")[0] : "", origem: "FOR", milhas: mil, taxa: tx ? preco(tx) : null, classe: /execut/i.test(b) ? "Executiva" : "Econômica", internacional: INTL.has(iata), idas: dv.idas, voltas: dv.voltas,
      erros: [!iata && "destino", !mil && "milhas"].filter(Boolean) }, orig: b };
  }
  const precos = [...b.matchAll(/R\$\s*([\d.]+(?:,\d{1,2})?)/g)].map(m => preco(m[1]));
  const iv = /ida e volta/i.test(b) && !/trecho|s[óo] (a )?ida/i.test(b);
  const iata = o.destino || "";
  return { tipo: "dinheiro", c: { iata, nome: iata ? ((S.rotas.find(r => r.iata === iata) || {}).nome || IATA[iata] || iata).split(" (")[0] : "", preco: precos[0] || null, idaVolta: iv, cia: o.cia || "", idas: dv.idas, voltas: dv.voltas,
    erros: [!iata && "destino", !precos[0] && "preço"].filter(Boolean) }, orig: b };
}
/* textos no jeito 085 */
function linhasDatas(dias) { const curto = g => { const [n, y] = g.mes.split(" "); return y ? `${n}/${y.slice(2)}` : n; }; return porMesIso(dias).map(g => `▸ ${curto(g)}: ${g.dias.join(", ")}`); }
function textoItem(it) {
  if (it.tipo === "milhas") return textoFinal(textoResgate(it.r), "milhas");
  if (it.tipo === "promo") {
    const p = it.p, ex = 10000;
    const L = ["💳 *PROMOÇÃO DE MILHAS*", ""];
    if (p.sub === "bonus") L.push(`🔥 *${p.pct ? `Até ${p.pct}% de bônus` : "Bônus"} na transferência*`);
    else if (p.sub === "compra") L.push(`🛒 *${p.pct ? `Até ${p.pct}% de desconto` : "Desconto"} na compra de ${/milhas/i.test(it.orig) ? "milhas" : "pontos"}*`);
    else L.push("⭐ *Clube com vantagem*");
    if (p.de || p.para) L.push(`🔁 *${[p.de, p.para].filter(Boolean).join(" ➜ ")}*`);
    if (p.titulo && !p.pct && !p.de && !p.para) L.push(`📰 ${p.titulo}`);
    if (p.validade) L.push(`⏰ Válido até *${p.validade}*`);
    if (p.sub === "bonus" && p.pct) L.push("", `💡 _Na prática: ${milN(ex)} pontos podem virar até ${milN(Math.round(ex * (1 + p.pct / 100)))} milhas._`);
    L.push("", "⚠️ _Confira as regras e o prazo no site do programa._");
    return textoFinal(L.join("\n"), "milhas");
  }
  const c = it.c, rf = refDe(c.iata);
  const L = ["🚨 *O RADAR APITOU!*", "", `✈️ *Fortaleza ➜ ${c.nome || c.iata || "?"}*${c.iata ? ` (${c.iata})` : ""}`];
  if (rf && rf.texto) L.push(`📍 _${rf.texto}_`);
  L.push(c.idaVolta ? `🔁 Ida e volta a partir de *${brl(c.preco || 0)}*` : `💰 *${brl(c.preco || 0)}* o trecho`);
  if (c.cia) L.push(`🛫 ${c.cia}`);
  if (c.idas.length) L.push("", "🗓️ *IDA*", ...linhasDatas(c.idas));
  if (c.voltas.length) L.push("", "🗓️ *VOLTA*", ...linhasDatas(c.voltas));
  const av = (S.ajustes || {}).aviso_preco ?? AVISO_PADRAO; if (av.trim()) L.push("", av.trim());
  return textoFinal(L.join("\n"), "dinheiro");
}
/* imagens */
async function desenharItem(cv, it) {
  if (it.tipo === "milhas") return desenharResgate(cv, it.r);
  if (it.tipo === "dinheiro") { const c = it.c; return desenharResgate(cv, { pill: "PROMOÇÃO", cor: "#16A34A", nome: c.nome || c.iata, iata: c.iata, internacional: INTL.has(c.iata), big: brl(c.preco || 0), sob: c.idaVolta ? "ida e volta" : "o trecho", idaVolta: null, idas: c.idas, voltas: c.voltas }); }
  const p = it.p, W = 1080, H = 1080, g = cv.getContext("2d"); cv.width = W; cv.height = H;
  try { await Promise.all([document.fonts.load(`400 80px ${MARCA.titulo}`), document.fonts.load(`800 30px ${MARCA.corpo}`)]); } catch (e) { }
  bgNavy(g, W, H); marca(g, W, true, p.sub === "bonus" ? "TRANSFERÊNCIA BONIFICADA" : p.sub === "compra" ? "COMPRA DE PONTOS" : "CLUBE");
  kicker(g, "Promoção de milhas", M, 270);
  const big = p.pct ? `${p.sub === "compra" ? "−" : ""}${p.pct}%` : (p.sub === "clube" ? "CLUBE" : "BÔNUS");
  if (p.pct && p.sub === "bonus") T(g, "ATÉ", M, 360, 70, MARCA.titulo, "#fff");
  T(g, big, M - 6, 610, caber(g, big, W - 2 * M, 280, MARCA.titulo), MARCA.titulo, COR.am);
  T(g, p.sub === "bonus" ? "DE BÔNUS" : p.sub === "compra" ? "DE DESCONTO" : "", M, 700, 70, MARCA.titulo, "#fff");
  const rota_ = [p.de, p.para].filter(Boolean).join("  ➜  "); if (rota_) T(g, rota_, M, 770, 38, MARCA.corpo, "#fff", "left", 800);
  if (p.validade) T(g, `Válido até ${p.validade}`, M, 826, 28, MARCA.corpo, COR.cinza, "left", 600);
  if (p.sub === "bonus" && p.pct) { const ex = `10.000 pontos ➜ até ${milN(Math.round(10000 * (1 + p.pct / 100)))} milhas`; g.fillStyle = "rgba(255,255,255,.08)"; rr(g, M, 860, W - 2 * M, 90, 20); g.fill(); T(g, ex, M + 30, 920, caber(g, ex, W - 2 * M - 60, 40, MARCA.titulo), MARCA.titulo, "#fff"); }
  T(g, "@partiu.085 · confira as regras no site do programa", M, H - 50, 22, MARCA.corpo, COR.cinza, "left", 600);
}

/* página */
function pConversor() {
  const L = CV.itens;
  setTimeout(desenharConv, 0);
  const nome = { dinheiro: ["Passagem em dinheiro", "#16A34A"], milhas: ["Passagem em milhas", "#FF7A00"], promo: ["Promoção de pontos", "#8B5CF6"] };
  return head("Converter texto", "Cole o texto de qualquer canal: passagem em dinheiro, em milhas ou promoção de pontos. Pode colar vários de uma vez. Ele reescreve no jeito 085 e faz a imagem pro grupo.") +
    `<div class="card cv-in"><textarea id="cv-txt" placeholder="Cole aqui um ou vários posts (deixe uma linha em branco dupla entre eles)…">${esc(CV.txt)}</textarea>
      <div class="al-acts"><button class="bt pri lg" data-act="cvler">${ic("zap")}Converter pro jeito 085</button>
        <label class="chk"><input type="checkbox" data-cv-img ${CV.img ? "checked" : ""}> Fazer imagem</label>
        ${L.length ? `<span class="sub">${L.length} post${L.length > 1 ? "s" : ""} entendido${L.length > 1 ? "s" : ""}</span>` : ""}</div></div>
    ${L.map((it, i) => { const err = (it.r && it.r.erros) || (it.c && it.c.erros) || [];
      return `<div class="card cv-c" style="--c:${nome[it.tipo][1]}">
      <div class="cv-h"><span class="fila-tag" style="background:${nome[it.tipo][1]}">${nome[it.tipo][0]}</span>
        ${it.tipo === "dinheiro" ? `<label>Destino <input data-cvf="${i}:c:iata" value="${esc(it.c.iata)}" maxlength="3" style="width:70px"></label><label>Preço R$ <input data-cvf="${i}:c:preco" type="number" value="${it.c.preco || ""}" style="width:110px"></label><label class="chk"><input type="checkbox" data-cvf="${i}:c:idaVolta" ${it.c.idaVolta ? "checked" : ""}> é ida e volta</label>`
          : it.tipo === "milhas" ? `<label>Destino <input data-cvf="${i}:r:iata" value="${esc(it.r.iata)}" maxlength="3" style="width:70px"></label><label>Milhas <input data-cvf="${i}:r:milhas" type="number" value="${it.r.milhas || ""}" style="width:110px"></label><label>Programa <input data-cvf="${i}:r:prog" value="${esc(it.r.prog)}" style="width:150px"></label>`
          : `<label>% <input data-cvf="${i}:p:pct" type="number" value="${it.p.pct || ""}" style="width:80px"></label><label>De <input data-cvf="${i}:p:de" value="${esc(it.p.de)}" style="width:120px"></label><label>Para <input data-cvf="${i}:p:para" value="${esc(it.p.para)}" style="width:140px"></label><label>Até <input data-cvf="${i}:p:validade" value="${esc(it.p.validade)}" style="width:90px"></label>`}
        <button class="bt sm ghost" data-act="cvatual" data-i="${i}">${ic("refresh")}Atualizar</button></div>
      ${err.length ? `<div class="aviso warn"><span>Não achei: ${err.join(", ")}. Preencha acima e toque em Atualizar.</span></div>` : ""}
      <div class="cv-g ${CV.img ? "" : "sem"}"><div><textarea class="ev-texto" id="cv-t-${i}">${esc(it.texto)}</textarea>
          <div class="al-acts"><button class="bt sm pri" data-act="cvcopiar" data-i="${i}">${ic("copy")}Copiar texto</button>${it.tipo === "milhas" && !err.length ? `<button class="bt sm" data-act="cvsalvar" data-i="${i}" ${it.salvo ? "disabled" : ""}>${ic("save")}${it.salvo ? "Salvo no banco" : "Salvar no banco e na fila"}</button>` : ""}</div></div>
        ${CV.img ? `<div><canvas class="cv-cv" id="cv-cv-${i}"></canvas><div class="al-acts"><button class="bt sm" data-act="cvcopimg" data-i="${i}">${ic("copy")}Copiar imagem</button><button class="bt sm ghost" data-act="cvbaixar" data-i="${i}">${ic("down")}Baixar</button><button class="bt sm" data-act="igagendar" data-src="cv" data-i="${i}">${ic("calendar")}Instagram</button></div></div>` : ""}</div>
    </div>`; }).join("")}`;
}
function desenharConv() { if (!CV.img) return; CV.itens.forEach((it, i) => { const cv = document.getElementById("cv-cv-" + i); if (cv) desenharItem(cv, it).catch(e => console.error(e)); }); }
function refazer(it) {
  if (it.tipo === "milhas") { const r = it.r; r.nome = r.iata ? (IATA[r.iata] || r.nome || r.iata).split(" (")[0] : r.nome; r.internacional = INTL.has(r.iata); r.erros = [!r.iata && "destino", !r.milhas && "milhas", !r.prog && "programa"].filter(Boolean); }
  if (it.tipo === "dinheiro") { const c = it.c; c.nome = c.iata ? ((S.rotas.find(x => x.iata === c.iata) || {}).nome || IATA[c.iata] || c.iata).split(" (")[0] : ""; c.erros = [!c.iata && "destino", !c.preco && "preço"].filter(Boolean); }
  it.texto = textoItem(it);
}
document.addEventListener("click", async e => {
  const b = e.target.closest('[data-act^="cv"]'); if (!b) return;
  const i = +b.dataset.i, it = CV.itens[i];
  try {
    if (b.dataset.act === "cvler") { CV.txt = $("#cv-txt").value; CV.itens = dividirBlocos(CV.txt).map(entenderBloco); CV.itens.forEach(refazer); if (!CV.itens.length) toast("Cole algum texto primeiro."); render(); }
    else if (b.dataset.act === "cvatual") { refazer(it); render(); }
    else if (b.dataset.act === "cvcopiar") { await copiar(($("#cv-t-" + i) || {}).value || it.texto); toast("Texto copiado."); }
    else if (b.dataset.act === "cvbaixar") { const cv = $("#cv-cv-" + i); const a = document.createElement("a"); a.download = `partiu085-${it.tipo}-${i + 1}.png`; a.href = cv.toDataURL("image/png"); a.click(); }
    else if (b.dataset.act === "cvcopimg") { const cv = $("#cv-cv-" + i); const blob = await new Promise(ok => cv.toBlob(ok, "image/png")); await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); toast("Imagem copiada: cole no WhatsApp e depois o texto."); }
    else if (b.dataset.act === "cvsalvar") { if (!token()) { toast("Pra salvar no banco, conecte o token em Ajustes."); return; } b.disabled = true;
      const o = paraOferta(it.r, ($("#cv-t-" + i) || {}).value); o.texto0 = textoResgate(it.r); await salvarImportados([o]); if (S.mi && !S.mi.carregando) juntarImportados([o]); it.salvo = true; toast("Salvo: já aparece em Alertas de milhas e no Modo envio."); render(); }
  } catch (err) { toast("Erro: " + err.message, 5000); b.disabled = false; }
});
document.addEventListener("input", e => {
  const el = e.target;
  if (el.dataset.cvImg !== undefined) { CV.img = el.checked; try { localStorage.setItem("p085_conv_img", CV.img ? "1" : "0"); } catch (x) { } render(); return; }
  const k = el.dataset.cvf; if (!k) return; const [i, obj, campo] = k.split(":"), it = CV.itens[+i]; if (!it) return;
  let v = el.type === "checkbox" ? el.checked : el.value; if (el.type === "number") v = v === "" ? null : +v; if (campo === "iata") v = String(v).toUpperCase();
  it[obj][campo] = v;
});
