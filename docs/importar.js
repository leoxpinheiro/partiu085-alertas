/* Radar Partiu085 — Importar resgates em milhas de outros canais.
   Cola um ou vários textos ("Oportunidade de resgate…"), o painel entende programa, destino, milhas e datas,
   reescreve no formato 085, gera uma imagem com a nossa marca e guarda no banco (docs/milhas_importados.json),
   onde passa a aparecer em Alertas em milhas, no Modo envio, no mapa e no calendário de milhas. */
"use strict";
const IMP = { txt: "", lista: [], aberto: 0 };
const MESES_LONGO = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const PROG_NORM = [[/smiles/i, "Smiles"], [/tudo\s*azul|azul/i, "Azul Fidelidade"], [/latam/i, "LATAM Pass"], [/tap|miles\s*&?\s*go/i, "TAP Miles&Go"], [/aadvantage|american/i, "AAdvantage"], [/iberia/i, "Iberia Plus"]];
const semAc = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function lerMilhas(s) {
  const m = String(s).match(/([\d][\d.,]*)\s*(mil|k)?\b/i); if (!m) return null;
  if (m[2]) return Math.round(parseFloat(m[1].replace(",", ".")) * 1000);
  return parseInt(m[1].replace(/[.,]/g, ""), 10);
}
function anoPara(mes) { const h = new Date(); return mes < h.getMonth() ? h.getFullYear() + 1 : h.getFullYear(); }
function lerDatas(linhas) {
  const out = [];
  linhas.forEach(l => {
    const m = l.replace(/[*_]/g, "").match(/^\s*([A-Za-zÀ-ú]+)(?:\s+(\d{4}))?\s*:\s*([\d,\se]+)\s*$/);
    if (!m) return;
    const mi = MESES_LONGO.findIndex(x => semAc(x) === semAc(m[1]));
    if (mi < 0) return;
    const ano = m[2] ? +m[2] : anoPara(mi);
    m[3].split(/[,\se]+/).filter(Boolean).forEach(d => { const n = +d; if (n >= 1 && n <= 31) out.push(`${ano}-${String(mi + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`); });
  });
  return [...new Set(out)].sort();
}
function porMesIso(dias) { const g = {}; dias.forEach(d => { const k = `${MESES_LONGO[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`; (g[k] = g[k] || []).push(d.slice(8, 10)); }); return Object.entries(g).map(([mes, ds]) => ({ mes, dias: ds })); }

function lerResgate(bloco) {
  const t = bloco.replace(/\r/g, "");
  const linhas = t.split("\n").map(l => l.replace(/^[^\wÀ-ú*(]+/u, "").trim());
  const achar = re => { const m = t.match(re); return m ? m[1].trim() : ""; };
  const progTxt = achar(/Programa(?: de fidelidade)?\s*:\s*([^\n]+)/i);
  const prog = (PROG_NORM.find(([re]) => re.test(progTxt)) || [, progTxt || ""])[1];
  const dest = t.match(/Destino\s*:\s*([^\n(]+?)\s*\(([A-Z]{3})\)/i), orig = t.match(/Origem\s*:\s*([^\n(]+?)\s*\(([A-Z]{3})\)/i);
  const milhas = lerMilhas(achar(/Quantidade de milhas\s*:\s*(?:a partir de\s*)?([^\n]+)/i) || achar(/a partir de\s*([\d.,]+\s*(?:mil|k)?)\s*(?:milhas|pontos)/i));
  const taxa = (t.match(/\+\s*(?:R\$|BRL)\s*([\d.,]+)/i) || [])[1];
  // datas: linhas depois de "Datas de ida" e de "Datas de volta"
  const iIda = linhas.findIndex(l => /^datas? de ida/i.test(semAc(l).replace(/[^a-z ]/g, "").trim())), iVol = linhas.findIndex(l => /^datas? de volta/i.test(semAc(l).replace(/[^a-z ]/g, "").trim()));
  const fatia = (ini, fim) => ini < 0 ? [] : linhas.slice(ini + 1, fim > ini ? fim : undefined);
  const idas = lerDatas(fatia(iIda, iVol > iIda ? iVol : -1)), voltas = lerDatas(fatia(iVol, -1));
  const iata = dest ? dest[2].toUpperCase() : "", nome = dest ? dest[1].trim() : "";
  const r = {
    prog, progTxt, iata, nome, origem: orig ? orig[2].toUpperCase() : "FOR", milhas, taxa: taxa ? Math.round(parseFloat(taxa.replace(/\./g, "").replace(",", "."))) : null,
    classe: (c => /econ/i.test(semAc(c)) ? "Econômica" : /exec/i.test(semAc(c)) ? "Executiva" : c || "Econômica")(achar(/Classe\s*:\s*([^\n]+)/i)),
    internacional: /internacional/i.test(t) || INTL.has(iata), idas, voltas,
  };
  r.erros = [!r.prog && "programa", !r.iata && "destino (código do aeroporto entre parênteses)", !r.milhas && "quantidade de milhas", !r.idas.length && "datas de ida"].filter(Boolean);
  return r;
}
function lerVarios(txt) {
  const partes = String(txt).split(/(?=^[^\n]*Oportunidade de resgate)/im).map(x => x.trim()).filter(x => x.length > 20);
  return (partes.length ? partes : [txt]).map(lerResgate).filter(r => r.iata || r.milhas);
}
function textoResgate(r) {
  const curto = g => { const [n, y] = g.mes.split(" "); return y ? `${n}/${y.slice(2)}` : n; };
  const L = ["🚨 *O RADAR APITOU — MILHAS!*", "", `✈️ *${r.origem === "FOR" ? "Fortaleza" : r.origem} ➜ ${r.nome}* (${r.iata})${r.internacional ? " 🌎" : ""}`,
    `🎟️ *${milN(r.milhas)} milhas*${r.taxa ? ` + R$ ${milN(r.taxa)}` : " + taxas"} o trecho`, `💳 *${r.prog || "Programa"}* · ${r.classe}`,
    "", "🗓️ *IDA*", ...porMesIso(r.idas).map(g => `▸ ${curto(g)}: ${g.dias.join(", ")}`)];
  if (r.voltas.length) L.push("", "🗓️ *VOLTA*", ...porMesIso(r.voltas).map(g => `▸ ${curto(g)}: ${g.dias.join(", ")}`));
  L.push("", "⚠️ _Disponibilidade em milhas pode acabar a qualquer momento._");
  return L.join("\n");
}
function paraOferta(r, txtEditado) {
  const id = "imp-" + [r.prog, r.iata, r.milhas, r.idas[0] || ""].join("-").replace(/[^A-Za-z0-9-]/g, "");
  const agora = new Date(Date.now() - 3 * 36e5).toISOString().slice(0, 16) + "-03:00";
  const t0 = txtEditado || textoResgate(r);
  return { id, tipo: "passagem", busca_propria: true, importado: true, destino: r.nome, iata: r.iata, aeroporto: r.iata, para: r.prog, programas: [r.prog],
    milhas: r.milhas, taxa: r.taxa, cia: "", paradas: null, desconto: null, ida_meses: porMesIso(r.idas), volta_meses: porMesIso(r.voltas), idas: r.idas, voltas: r.voltas,
    milhas_volta: null, taxa_volta: null, internacional: r.internacional, classe: r.classe,
    titulo: `Fortaleza → ${r.nome}: ${milN(r.milhas)} milhas (${r.prog})`, fonte: "Importado", fontes: ["Importado pelo painel"], link: "",
    publicado: agora, encontrado: agora, validade: null, fortaleza: r.origem === "FOR", ativa: true, texto0: t0 };
}

/* ---------- banco: junta os importados aos dados de milhas do painel */
function juntarImportados(imps) {
  if (!imps || !imps.length) return;
  const h = hojeISO(), lim = diaMenos(h, 3);
  S.mi.ofertas = S.mi.ofertas || [];
  imps.forEach(o => {
    if (S.mi.ofertas.some(x => x.id === o.id)) return;
    const x = { ...o, ativa: o.publicado.slice(0, 10) >= lim };
    x.texto = textoFinal(x.texto0, "milhas");
    S.mi.ofertas.push(x);
  });
  S.mi.ofertas.sort((a, b) => b.publicado.localeCompare(a.publicado));
  S.mv = S.mv || { rotas: {}, status: "ok", importado: true, consultas_hoje: 0, atualizado: imps[0].publicado };
  imps.forEach(o => {
    if (o.iata && o.destino && !IATA[o.iata]) IATA[o.iata] = o.destino;
    const r = ((S.mv.rotas[o.iata] = S.mv.rotas[o.iata] || {})[o.para] = S.mv.rotas[o.iata][o.para] || { ida: {}, volta: {} });
    r.ida = r.ida || {}; r.volta = r.volta || {};
    (o.idas || []).forEach(d => { if (d >= h && (!r.ida[d] || r.ida[d].milhas > o.milhas)) r.ida[d] = { milhas: o.milhas, taxa: o.taxa, cia: "", paradas: null, importado: true }; });
    (o.voltas || []).forEach(d => { if (d >= h && (!r.volta[d] || r.volta[d].milhas > o.milhas)) r.volta[d] = { milhas: o.milhas, taxa: o.taxa, cia: "", paradas: null, importado: true }; });
    ["ida", "volta"].forEach(s => { const ok = Object.entries(r[s]).filter(([d, v]) => d >= h && !v.sem); if (ok.length) { const [d, v] = ok.sort((a, b) => a[1].milhas - b[1].milhas)[0]; r["menor_" + s] = { dia: d, ...v }; } });
  });
}
async function salvarImportados(novos) {
  let atual = [];
  try { const r = await gh(`/contents/docs/milhas_importados.json?ref=main&t=${Date.now()}`); atual = JSON.parse(decodeURIComponent(escape(atob(r.content.replace(/\n/g, ""))))); } catch (e) { }
  const lim = diaMenos(hojeISO(), 60);
  const mapa = Object.fromEntries(atual.filter(o => o.publicado.slice(0, 10) >= lim).map(o => [o.id, o]));
  novos.forEach(o => { mapa[o.id] = { ...o, texto: undefined }; });
  await salvarArquivo("docs/milhas_importados.json", Object.values(mapa).sort((a, b) => b.publicado.localeCompare(a.publicado)), `Painel: importa ${novos.length} resgate(s) em milhas`);
}

/* ---------- imagem do resgate (1080x1350, identidade 085) */
const COR_PROG_IMG = { "Smiles": "#FF7A00", "Azul Fidelidade": "#2563EB", "LATAM Pass": "#E11D48" };
/* foto real do destino (docs/fotos/IATA.jpg, Wikimedia Commons) + crédito */
const FOTOS = { img: {}, cred: null };
function fotoDestino(iata) {
  if (!iata) return Promise.resolve(null);
  if (!(iata in FOTOS.img)) FOTOS.img[iata] = new Promise(ok => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = `fotos/${iata}.jpg?v=1`; });
  return FOTOS.img[iata];
}
async function creditoFoto(iata) { if (!FOTOS.cred) FOTOS.cred = await getJSON("fotos/creditos.json", {}); return FOTOS.cred[iata]; }
function caberR(c, txt, max, min, larg, fonte) { let t = max; c.font = fonte(t); while (c.measureText(txt).width > larg && t > min) { t -= 4; c.font = fonte(t); } return t; }

async function desenharResgate(cv, r) {
  const W = 1080, H = 1080, c = cv.getContext("2d"); cv.width = W; cv.height = H;
  try { await Promise.all([document.fonts.load('120px "Anton"'), document.fonts.load('700 40px "Plus Jakarta Sans"'), document.fonts.load('500 40px "Plus Jakarta Sans"')]); } catch (e) { }
  const NAVY = "#0F2A47", AM = MARCA.amarelo, J = MARCA.corpo, A = MARCA.titulo;
  const cor = r.cor || COR_PROG_IMG[r.prog] || AM;
  const FH = 560; // altura da foto
  c.fillStyle = NAVY; c.fillRect(0, 0, W, H);
  // ---- foto (ou fundo da marca)
  const foto = await fotoDestino(r.iata);
  if (foto) {
    const s = Math.max(W / foto.naturalWidth, FH / foto.naturalHeight), fw = foto.naturalWidth * s, fh = foto.naturalHeight * s;
    c.save(); c.beginPath(); c.rect(0, 0, W, FH); c.clip(); c.drawImage(foto, (W - fw) / 2, (FH - fh) / 2, fw, fh); c.restore();
  } else {
    const g = c.createLinearGradient(0, 0, W, FH); g.addColorStop(0, MARCA.azul2); g.addColorStop(1, MARCA.azul); c.fillStyle = g; c.fillRect(0, 0, W, FH);
    c.globalAlpha = .08; c.fillStyle = "#fff"; c.font = `520px ${A}`; c.fillText("✈", 420, 640); c.globalAlpha = 1;
  }
  let g = c.createLinearGradient(0, 0, 0, 280); g.addColorStop(0, "rgba(6,18,32,.6)"); g.addColorStop(1, "rgba(6,18,32,0)"); c.fillStyle = g; c.fillRect(0, 0, W, 280);
  g = c.createLinearGradient(0, FH - 430, 0, FH); g.addColorStop(0, "rgba(15,42,71,0)"); g.addColorStop(.75, "rgba(15,42,71,.88)"); g.addColorStop(1, NAVY); c.fillStyle = g; c.fillRect(0, FH - 430, W, 432);
  // ---- topo: marca + etiqueta
  c.textBaseline = "middle";
  const ico = img("icone");
  c.beginPath(); c.arc(106, 100, 50, 0, Math.PI * 2); c.fillStyle = AM; c.fill();
  if (ico.complete && ico.naturalWidth) { c.save(); c.beginPath(); c.arc(106, 100, 44, 0, Math.PI * 2); c.clip(); c.drawImage(ico, 62, 56, 88, 88); c.restore(); }
  c.fillStyle = "#fff"; c.shadowColor = "rgba(0,0,0,.35)"; c.shadowBlur = 10; c.font = `46px ${A}`; c.fillText("PARTIU 085", 172, 88);
  c.font = `700 22px ${J}`; c.fillStyle = "rgba(255,255,255,.92)"; c.fillText("@partiu.085", 174, 124); c.shadowBlur = 0;
  const et = (r.pill || r.prog || "MILHAS").toUpperCase(); c.font = `800 26px ${J}`; const ew = c.measureText(et).width + 48;
  rr(c, W - 60 - ew, 72, ew, 56, 28); c.fillStyle = cor; c.fill(); c.fillStyle = "#fff"; c.textAlign = "center"; c.fillText(et, W - 60 - ew / 2, 101); c.textAlign = "left";
  // ---- destino sobre a foto
  c.textBaseline = "alphabetic";
  const nome = (r.nome || r.iata || "").toUpperCase();
  const tn = caberR(c, nome, 150, 76, W - 128, t => `${t}px ${A}`);
  c.fillStyle = "#fff"; c.shadowColor = "rgba(0,0,0,.35)"; c.shadowBlur = 18; c.fillText(nome, 60, FH - 24); c.shadowBlur = 0;
  c.font = `800 26px ${J}`; c.fillStyle = AM; const rfc = (typeof refDe === "function" && refDe(r.iata) || {}).curta; c.fillText(`SAINDO DE FORTALEZA ✈${rfc ? "  ·  " + rfc.toUpperCase() : r.internacional ? "  ·  INTERNACIONAL" : ""}`, 64, FH - 24 - tn * 0.98 - 18);
  // crédito da foto
  const cr = foto ? await creditoFoto(r.iata) : null;
  if (cr) { c.font = `500 15px ${J}`; c.fillStyle = "rgba(255,255,255,.55)"; c.textAlign = "right"; c.fillText(`Foto: ${(cr.autor || "Wikimedia Commons").slice(0, 40)}${cr.licenca ? " · " + cr.licenca : ""}`, W - 60, 156); c.textAlign = "left"; }
  // ---- preço
  const milhas = !!r.milhas && !r.big;
  const big = milhas ? milN(r.milhas) : r.big;
  const y0 = FH + 56;
  c.font = `600 28px ${J}`; c.fillStyle = "rgba(255,255,255,.7)"; c.fillText("a partir de", 64, y0);
  const tb = caberR(c, big, 128, 80, 560, t => `${t}px ${A}`); c.fillStyle = AM; c.fillText(big, 60, y0 + tb * .92);
  const yb = y0 + tb * .92;
  c.font = `700 30px ${J}`; c.fillStyle = "#fff"; c.fillText(milhas ? `milhas ${r.taxa ? "+ R$ " + milN(r.taxa) : "+ taxas"} · o trecho` : "o trecho", 64, yb + 46);
  // caixa à direita
  const bx = 660, by = y0 - 30, bw = W - 60 - bx, bh = 186;
  rr(c, bx, by, bw, bh, 28); c.fillStyle = "rgba(255,255,255,.1)"; c.fill(); c.strokeStyle = "rgba(255,255,255,.18)"; c.lineWidth = 2; c.stroke();
  c.textAlign = "center"; const cx = bx + bw / 2;
  if (milhas) {
    c.font = `700 22px ${J}`; c.fillStyle = "rgba(255,255,255,.7)"; c.fillText("PROGRAMA", cx, by + 52);
    const tp = caberR(c, r.prog || "", 52, 30, bw - 40, t => `${t}px ${A}`); c.fillStyle = "#fff"; c.fillText(r.prog || "", cx, by + 50 + tp);
    c.font = `600 20px ${J}`; c.fillStyle = "rgba(255,255,255,.7)"; c.fillText(r.classe || "Econômica", cx, by + bh - 24);
  } else if (r.idaVolta) {
    c.font = `700 22px ${J}`; c.fillStyle = "rgba(255,255,255,.7)"; c.fillText("IDA E VOLTA", cx, by + 52);
    const tv = caberR(c, brl(r.idaVolta), 68, 40, bw - 40, t => `${t}px ${A}`); c.fillStyle = "#fff"; c.fillText(brl(r.idaVolta), cx, by + 50 + tv);
    c.font = `600 20px ${J}`; c.fillStyle = "rgba(255,255,255,.7)"; c.fillText("somando ida + volta", cx, by + bh - 24);
  }
  c.textAlign = "left";
  // ---- datas
  const yd = Math.max(yb + 96, by + bh + 52);
  const coluna = (titulo, dias, x, w) => {
    c.font = `800 24px ${J}`; c.fillStyle = AM; c.fillText(titulo, x, yd);
    let yy = yd + 44, resto = 0;
    const meses = porMesIso(dias), cabe = Math.max(1, Math.floor((H - 44 - yy) / 42) + 1), mostra = meses.length > cabe ? cabe - 1 : meses.length;
    meses.forEach((gm, i) => {
      if (i >= mostra) { resto += gm.dias.length; return; }
      const [mes, ano] = gm.mes.split(" "); const rot = `${mes.slice(0, 3).toUpperCase()}/${(ano || "").slice(2)}`;
      c.font = `800 24px ${J}`; c.fillStyle = "#fff"; c.fillText(rot, x, yy);
      let txt = gm.dias.join(" · "); c.font = `500 24px ${J}`; c.fillStyle = "rgba(255,255,255,.88)";
      while (c.measureText(txt).width > w - 110 && txt.includes(" · ")) { txt = txt.split(" · ").slice(0, -1).join(" · "); resto++; }
      c.fillText(txt, x + 104, yy); yy += 42;
    });
    if (resto) { c.font = `600 22px ${J}`; c.fillStyle = "rgba(255,255,255,.6)"; c.fillText(`+ ${resto} data${resto > 1 ? "s" : ""} no texto`, x, yy); }
  };
  coluna("✈ IDA", r.idas || [], 64, 470);
  if ((r.voltas || []).length) coluna("↩ VOLTA", r.voltas, 564, 470);
  c.textAlign = "left"; c.textBaseline = "alphabetic";
}

/* ---------- página */
function pImportar() {
  const L = IMP.lista;
  return `<div class="card" style="margin-bottom:var(--space-4)"><h3>Cole os resgates de outros canais</h3>
      <div class="desc">Pode colar vários de uma vez (cada um começando com “Oportunidade de resgate”). Eu leio programa, destino, milhas e datas, reescrevo no jeito 085, faço a imagem e guardo no nosso banco.</div>
      <div class="field"><textarea id="imp-in" style="min-height:200px" placeholder="Oportunidade de resgate - Internacional&#10;Programa de fidelidade: Smiles&#10;…">${esc(IMP.txt)}</textarea></div>
      <div class="al-acts" style="margin-top:var(--space-3)"><button class="bt pri lg" data-act="impler">${ic("zap")}Ler e converter</button>${L.length ? `<button class="bt lg" data-act="impsalvartodos">${ic("save")}Salvar ${L.length > 1 ? `os ${L.length}` : ""} no banco e na fila</button>` : ""}</div></div>
    ${L.map((r, i) => `<div class="card imp-c" style="--c:${COR_PROG_IMG[r.prog] || "#94A3B8"}">
      <div class="imp-h"><span class="fila-tag">${esc(r.prog || "?")}</span><b>FOR → ${esc(r.nome || "?")} (${esc(r.iata || "?")})</b><span class="sub">${r.milhas ? milN(r.milhas) + " milhas" : "?"} · ${r.idas.length} ida${r.idas.length === 1 ? "" : "s"} · ${r.voltas.length} volta${r.voltas.length === 1 ? "" : "s"}${r.salvo ? " · ✓ salvo" : ""}</span></div>
      ${r.erros.length ? `<div class="aviso warn"><span>Não achei: ${r.erros.join(", ")}. Confira o texto colado.</span></div>` : ""}
      <div class="imp-g">
        <div><div class="g-tit">Texto pro grupo (pode editar)</div><textarea class="ev-texto" data-imptxt="${i}" style="min-height:360px">${esc(textoFinal(r.txt || textoResgate(r), "milhas"))}</textarea>
          <div class="al-acts" style="margin-top:10px"><button class="bt sm" data-act="impcopiar" data-i="${i}">${ic("copy")}Copiar texto</button><a class="bt sm zap" target="_blank" rel="noopener" data-act="impzap" data-i="${i}" href="#">${ic("send")}WhatsApp</a></div></div>
        <div><div class="g-tit">Imagem</div><canvas class="imp-cv" id="imp-cv-${i}"></canvas>
          <div class="al-acts" style="margin-top:10px"><button class="bt sm" data-act="impcopimg" data-i="${i}">${ic("copy")}Copiar imagem</button><button class="bt sm" data-act="impbaixar" data-i="${i}">${ic("down")}Baixar</button><button class="bt sm pri" data-act="impsalvar" data-i="${i}" ${r.erros.length ? "disabled" : ""}>${ic("save")}${r.salvo ? "Salvo" : "Salvar no banco"}</button></div></div>
      </div></div>`).join("")}`;
}
function desenharImportados() { IMP.lista.forEach((r, i) => { const cv = document.getElementById("imp-cv-" + i); if (cv) desenharResgate(cv, r); }); }

document.addEventListener("click", async e => {
  const b = e.target.closest('[data-act^="imp"]'); if (!b) return;
  const act = b.dataset.act, i = +b.dataset.i, r = IMP.lista[i];
  const txt = () => ($(`[data-imptxt="${i}"]`) || {}).value || textoFinal(textoResgate(r), "milhas");
  try {
    if (act === "impler") { IMP.txt = $("#imp-in").value; IMP.lista = lerVarios(IMP.txt); if (!IMP.lista.length) toast("Não reconheci nenhum resgate nesse texto."); render(); }
    else if (act === "impcopiar") { await copiar(txt()); toast(`Copiado: ${r.nome} · ${milN(r.milhas)} milhas`); }
    else if (act === "impzap") { e.preventDefault(); window.open("https://api.whatsapp.com/send?text=" + encodeURIComponent(txt()), "_blank"); }
    else if (act === "impbaixar") { const cv = $("#imp-cv-" + i); const a = document.createElement("a"); a.download = `resgate-${r.iata}-${(r.prog || "").replace(/\W/g, "")}.png`; a.href = cv.toDataURL("image/png"); a.click(); }
    else if (act === "impcopimg") { const cv = $("#imp-cv-" + i); const blob = await new Promise(ok => cv.toBlob(ok, "image/png")); await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); toast("Imagem copiada: é só colar no WhatsApp."); }
    else if (act === "impsalvar" || act === "impsalvartodos") {
      if (!token()) { toast("Pra salvar no banco, conecte o token em Ajustes."); return; }
      const idx = act === "impsalvar" ? [i] : IMP.lista.map((_, k) => k).filter(k => !IMP.lista[k].erros.length && !IMP.lista[k].salvo);
      if (!idx.length) { toast("Nada novo pra salvar."); return; }
      b.disabled = true;
      const ofs = idx.map(k => { const t = ($(`[data-imptxt="${k}"]`) || {}).value; IMP.lista[k].txt = t; return paraOferta(IMP.lista[k], t ? t.split("\n").filter((l, n, a) => n < a.length - 0).join("\n") : null); });
      ofs.forEach(o => { o.texto0 = textoResgate(IMP.lista[idx[ofs.indexOf(o)]]); });
      await salvarImportados(ofs);
      if (S.mi && !S.mi.carregando) juntarImportados(ofs);
      idx.forEach(k => IMP.lista[k].salvo = true);
      toast(`${ofs.length} resgate${ofs.length > 1 ? "s" : ""} salvo${ofs.length > 1 ? "s" : ""}: já aparece${ofs.length > 1 ? "m" : ""} em Alertas em milhas e no Modo envio.`, 4500); render();
    }
  } catch (err) { toast("Erro: " + err.message, 5000); b.disabled = false; }
});

/* ---------- imagem de qualquer alerta (dinheiro ou milhas) */
function isoDeMeses(meses) {
  const M = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const out = []; (meses || []).forEach(g => { const [n, y] = g.mes.split(" "); const mi = M.indexOf(semAc(n)); if (mi < 0) return; const ano = y ? +y : anoPara(mi); g.dias.forEach(d => out.push(`${ano}-${String(mi + 1).padStart(2, "0")}-${String(+d).padStart(2, "0")}`)); }); return out;
}
function cardDeAlerta(x) {
  if (!x) return null;
  if (x.destino_nome) { // alerta em dinheiro
    const k = x.classe || "boa";
    return { pill: { imperdivel: "Imperdível", otima: "Ótima oportunidade", boa: "Boa oportunidade" }[k], cor: { imperdivel: "#16A34A", otima: "#2563EB", boa: "#D97706" }[k],
      script: "passagem barata saindo do 085", origem: "FOR", nome: x.destino_nome, iata: x.destino, internacional: x.tipo === "internacional",
      big: brl(x.preco), idaVolta: x.preco_volta ? x.preco + x.preco_volta : null,
      idas: (x.datas_ida || []).map(d => d.dia).length ? x.datas_ida.map(d => d.dia) : isoDeMeses(x.ida_meses), voltas: (x.datas_volta || []).map(d => d.dia).length ? x.datas_volta.map(d => d.dia) : isoDeMeses(x.volta_meses) };
  }
  if (x.busca_propria) return { prog: x.para, origem: "FOR", nome: x.destino, iata: x.iata, internacional: x.internacional || INTL.has(x.iata), milhas: x.milhas, taxa: x.taxa, classe: x.classe || "Econômica",
    idas: x.idas || isoDeMeses(x.ida_meses), voltas: x.voltas || isoDeMeses(x.volta_meses) };
  if (x.milhas && (x.destino || x.iata || x.aeroporto)) { const ia = x.iata || x.aeroporto || ""; return { prog: x.para || x.programa || "", origem: "FOR", nome: x.destino || ia, iata: ia, internacional: x.internacional || INTL.has(ia), milhas: x.milhas, taxa: x.taxa, classe: x.classe || "Econômica",
    idas: x.idas || isoDeMeses(x.ida_meses || {}), voltas: x.voltas || isoDeMeses(x.volta_meses || {}) }; }
  return null;
}
