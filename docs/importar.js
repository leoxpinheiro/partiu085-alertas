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
  const L = ["🚨 *O RADAR APITOU — MILHAS*", "", `✈️ ${r.origem === "FOR" ? "Fortaleza" : r.origem} (${r.origem}) → ${r.nome} (${r.iata})${r.internacional ? " · INTERNACIONAL" : ""}`,
    `🎟️ A partir de *${milN(r.milhas)} milhas*${r.taxa ? ` + R$ ${milN(r.taxa)}` : " + taxas"} o trecho`, `💳 ${r.prog || "Programa"} · ${r.classe}`,
    "", "*Datas de ida:*", ...porMesIso(r.idas).map(g => `${g.mes}: ${g.dias.join(", ")}`)];
  if (r.voltas.length) L.push("", "*Datas de volta:*", ...porMesIso(r.voltas).map(g => `${g.mes}: ${g.dias.join(", ")}`));
  L.push("", "⚠️ Disponibilidade em milhas pode acabar a qualquer momento.");
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
async function desenharResgate(cv, r) {
  const W = 1080, H = 1350, c = cv.getContext("2d"); cv.width = W; cv.height = H;
  try { await Promise.all([document.fonts.load('120px "Anton"'), document.fonts.load('60px "Kaushan Script"'), document.fonts.load('600 40px "Plus Jakarta Sans"')]); } catch (e) { }
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, MARCA.azul2); g.addColorStop(.45, MARCA.azul); g.addColorStop(1, MARCA.navy); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const cor = COR_PROG_IMG[r.prog] || MARCA.amarelo;
  // faixa do programa
  c.font = `700 34px ${MARCA.corpo}`; const pt = (r.prog || "MILHAS").toUpperCase(); const pw = c.measureText(pt).width + 64;
  rr(c, 70, 70, pw, 66, 33); c.fillStyle = cor; c.fill(); c.fillStyle = "#fff"; c.textBaseline = "middle"; c.fillText(pt, 102, 104);
  c.font = `600 30px ${MARCA.corpo}`; c.fillStyle = "rgba(255,255,255,.85)"; c.textAlign = "right"; c.fillText(r.internacional ? "INTERNACIONAL" : "NACIONAL", W - 70, 104); c.textAlign = "left";
  c.font = `64px ${MARCA.script}`; c.fillStyle = MARCA.amarelo; c.fillText("oportunidade de resgate", 70, 205);
  // rota
  c.font = `46px ${MARCA.titulo}`; c.fillStyle = "rgba(255,255,255,.85)"; c.fillText(`FORTALEZA (${r.origem})  ✈`, 70, 290);
  let tam = 150; c.font = `${tam}px ${MARCA.titulo}`; const nome = (r.nome || r.iata).toUpperCase();
  while (c.measureText(nome).width > W - 140 && tam > 70) { tam -= 6; c.font = `${tam}px ${MARCA.titulo}`; }
  c.fillStyle = "#fff"; c.fillText(nome, 70, 290 + tam * .75);
  // caixa de milhas
  const by = 290 + tam * .75 + 70; rr(c, 70, by, W - 140, 230, 36); c.fillStyle = "#fff"; c.fill();
  c.fillStyle = MARCA.navy; c.textAlign = "center"; c.font = `600 34px ${MARCA.corpo}`; c.fillText("a partir de", W / 2, by + 48);
  c.font = `118px ${MARCA.titulo}`; c.fillText(`${milN(r.milhas)} MILHAS`, W / 2, by + 125);
  c.font = `600 32px ${MARCA.corpo}`; c.fillStyle = "rgba(23,58,94,.75)"; c.fillText(`o trecho${r.taxa ? ` + R$ ${milN(r.taxa)}` : " + taxas"} · ${r.classe}`, W / 2, by + 196); c.textAlign = "left";
  // datas
  let y = by + 280; const LIM = H - 150;
  const bloco = (titulo, dias, x, w) => {
    let yy = y; c.font = `700 30px ${MARCA.corpo}`; c.fillStyle = MARCA.amarelo; c.fillText(titulo, x, yy); yy += 46;
    const meses = porMesIso(dias); let resto = 0;
    meses.forEach((gm, mi) => {
      const linhasG = Math.ceil(gm.dias.length / Math.floor(w / 62));
      if (yy + 40 + linhasG * 64 > LIM) { resto += gm.dias.length; return; }
      c.font = `600 24px ${MARCA.corpo}`; c.fillStyle = "rgba(255,255,255,.8)"; c.fillText(gm.mes.toUpperCase(), x, yy); yy += 40;
      let xx = x; gm.dias.forEach(d => { if (xx + 58 > x + w) { xx = x; yy += 64; } rr(c, xx, yy - 26, 54, 52, 26); c.fillStyle = MARCA.amarelo; c.fill(); c.fillStyle = MARCA.navy; c.font = `700 24px ${MARCA.corpo}`; c.textAlign = "center"; c.fillText(d, xx + 27, yy); c.textAlign = "left"; xx += 62; });
      yy += 58;
    });
    if (resto) { c.font = `600 24px ${MARCA.corpo}`; c.fillStyle = MARCA.amarelo; c.fillText(`+ ${resto} data${resto > 1 ? "s" : ""} no texto`, x, yy); yy += 40; }
    return yy;
  };
  const yIda = bloco("DATAS DE IDA", r.idas, 70, 440), yVol = r.voltas.length ? bloco("DATAS DE VOLTA", r.voltas, 570, 440) : y;
  // rodapé
  const fy = Math.max(H - 120, Math.min(H - 120, Math.max(yIda, yVol)));
  rr(c, 70, fy, W - 140, 72, 36); c.fillStyle = MARCA.amarelo; c.fill(); c.fillStyle = MARCA.navy; c.font = `700 30px ${MARCA.corpo}`; c.textAlign = "center";
  c.fillText(`✈ Receba alertas: ${((S.ajustes || {}).link_whatsapp_milhas || (S.ajustes || {}).link_whatsapp || "bit.ly/radar085").replace(/^https?:\/\//, "")}`, W / 2, fy + 37); c.textAlign = "left";
  const masc = img("mascote"); if (masc.complete && masc.naturalWidth) { const mw = 190, mh = mw * masc.naturalHeight / masc.naturalWidth; c.drawImage(masc, W - mw - 50, fy - mh - 10, mw, mh); }
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
    else if (act === "impzap") { e.preventDefault(); window.open("https://wa.me/?text=" + encodeURIComponent(txt()), "_blank"); }
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
