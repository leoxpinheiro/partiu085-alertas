/* Partiu 085 — 🖼️ Estúdio de carrosséis: frase sobre foto/quadro de vídeo, 1 a 10 telas,
   fonte/cor/tamanho, salva (rascunho → aprovado → postado) e manda pra agenda do Instagram. */
"use strict";
const CRS = { lista: null, atual: null, tela: 0, fundos: null, catF: "Todas", fotosMeus: null, cache: {} };
const CR_PADRAO = { fonte: "Plus Jakarta Sans", tam: 108, cor: "#F3E7C9", escuro: 55, y: 50, alinh: "center", cabec: true, caixa: false };
const crId = () => "cr-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 4);
function crNovo(n = 3) { return { id: crId(), titulo: "", legenda: "", estado: "rascunho", criado: hojeISO(), ...CR_PADRAO,
  telas: Array.from({ length: n }, (_, i) => ({ texto: i === 0 ? "Sua frase de capa aqui" : i === n - 1 ? "Salva e manda pra quem precisa ler isso." : "Escreva a frase da tela " + (i + 1), fundo: "midia/clip-v-" + ["asa-2", "janela-1", "nuvens-3", "janela-3", "asa-1"][i % 5] + ".jpg" })) }; }
/* carrosséis de frases da Pauta viram editáveis */
function crDeFrases(x) { const telas = [[x.telas[0][0], x.capa], ...x.telas, ["asa-1", x.fim]].map(([f, t]) => ({ texto: t, fundo: `midia/clip-v-${f}.jpg` }));
  return { id: crId(), titulo: x.capa, legenda: x.leg + "\n\n✈️ Passagem barata saindo de Fortaleza: segue o @partiu.085\n\n" + HASH, estado: "rascunho", criado: hojeISO(), origem: "fr-" + x.id, ...CR_PADRAO, telas }; }

/* ---------- desenho (mesmo na prévia, nas miniaturas e no post final) ---------- */
function crImg(src) { if (!src) return Promise.resolve(null); if (!CRS.cache[src]) CRS.cache[src] = new Promise(ok => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; }); return CRS.cache[src]; }
async function crDesenhar(c, car, i) {
  const t = car.telas[i], n = car.telas.length, im = await crImg(t.fundo), W = PW, H = PH;
  c.fillStyle = "#0b0d10"; c.fillRect(0, 0, W, H); if (im) cobrir(c, im, 0, 0, W, H);
  c.fillStyle = `rgba(6,8,12,${(car.escuro ?? 55) / 100})`; c.fillRect(0, 0, W, H);
  const cr = car.cor || "#F3E7C9";
  if (car.cabec) { c.save(); c.globalAlpha = .9;
    T(c, "PARTIU 085", M, 110, 22, MARCA.corpo, cr, "left", 700, 4); T(c, "//", W / 2, 110, 22, MARCA.corpo, cr, "center", 700); T(c, "VIAJAR", W - M, 110, 22, MARCA.corpo, cr, "right", 700, 4);
    T(c, "@PARTIU.085", M, H - 80, 22, MARCA.corpo, cr, "left", 700, 4); if (n > 1) { T(c, "//", W / 2, H - 80, 22, MARCA.corpo, cr, "center", 700); T(c, `${i + 1}/${n}`, W - M, H - 80, 22, MARCA.corpo, cr, "right", 700, 2); } c.restore(); }
  let txt = t.texto || ""; if (car.caixa) txt = txt.toUpperCase();
  const peso = FONTE_PESO[car.fonte] || 400, fam = `"${car.fonte}", ${MARCA.corpo}`, serif = !/Jakarta|Montserrat|Anton|Bebas/.test(car.fonte);
  let fs = (t.tam || car.tam || 108), larg = W - 2 * M - 20; c.font = `${peso} ${fs}px ${fam}`;
  const ls = /Jakarta|Montserrat/.test(car.fonte) ? -fs * .06 : serif ? -fs * .015 : 0; if ("letterSpacing" in c) c.letterSpacing = ls + "px";
  let L = estQuebrar(c, txt, larg); while (L.length * fs > H * .62 && fs > 40) { fs -= 4; c.font = `${peso} ${fs}px ${fam}`; if ("letterSpacing" in c) c.letterSpacing = (ls / (t.tam || car.tam || 108) * fs) + "px"; L = estQuebrar(c, txt, larg); }
  const lh = fs * (serif ? 1.08 : 1.0), al = car.alinh || "center", x = al === "left" ? M + 10 : al === "right" ? W - M - 10 : W / 2;
  let y = H * (car.y ?? 50) / 100 - (L.length * lh) / 2 + fs * .78; y = Math.max(170 + fs * .8, Math.min(y, H - 150 - (L.length - 1) * lh));
  c.fillStyle = cr; c.textAlign = al; c.textBaseline = "alphabetic"; L.forEach(l => { c.fillText(l, x, y); y += lh; });
  if ("letterSpacing" in c) c.letterSpacing = "0px"; c.textAlign = "left";
}
async function crCanvas(car, i, escala = 1) { const cv = document.createElement("canvas"); cv.width = PW; cv.height = PH; await crDesenhar(cv.getContext("2d"), car, i);
  if (escala === 1) return cv; const m = document.createElement("canvas"); m.width = PW * escala; m.height = PH * escala; m.getContext("2d").drawImage(cv, 0, 0, m.width, m.height); return m; }

/* ---------- dados ---------- */
async function crCarregar() {
  if (!CRS.lista) { let L = []; try { L = JSON.parse(localStorage.getItem("p085_carrosseis") || "[]"); } catch (e) { } const d = typeof ghJSON === "function" ? await ghJSON("docs/carrosseis.json", null) : await getJSON("carrosseis.json", null); CRS.lista = d || L; }
  if (!CRS.fundos) { if (typeof estCarregar === "function") await estCarregar();
    const m = await getJSON("midia.json", { fotos: {} }), fm = typeof ghJSON === "function" ? await ghJSON("docs/fotos_meus.json", []) : [];
    CRS.fotosMeus = fm || [];
    const vids = (EST.todos || EST.lista || []).map(v => ({ src: v.poster, video: v.src, cat: v.cat, meu: v.meu })).filter(v => v.src);
    const fotos = Object.entries(m.fotos || {}).flatMap(([k, L]) => (L || []).map(x => ({ src: x.arq, cat: "Fotos" })));
    CRS.fundos = [...CRS.fotosMeus.map(f => ({ src: f.src, cat: f.cat || "Minhas fotos", meu: true })).reverse(), ...vids, ...fotos]; }
  if (!CRS.atual) { try { CRS.atual = JSON.parse(localStorage.getItem("p085_cr_atual") || "null"); } catch (e) { } CRS.atual = CRS.atual || crNovo(3); }
}
const crOcultos = () => (typeof VB !== "undefined" && VB.cfg && VB.cfg.ocultos) || [];
const crOculto = f => crOcultos().includes(f.src) || (f.video && crOcultos().includes(f.video));
function crGuardarLocal() { try { localStorage.setItem("p085_cr_atual", JSON.stringify(CRS.atual)); localStorage.setItem("p085_carrosseis", JSON.stringify(CRS.lista || [])); } catch (e) { } }
async function crSalvarLista(msg) { crGuardarLocal(); if (!token()) { toast("Salvo só neste aparelho (conecte em Ajustes pra salvar no painel)."); return; } try { await salvarArquivo("docs/carrosseis.json", CRS.lista, msg); } catch (e) { toast("Não salvou no painel: " + e.message); } }

/* ---------- página ---------- */
function pCarrossel() {
  if (!CRS.lista || !CRS.fundos || !CRS.atual) { crCarregar().then(() => { if (/#carrossel/.test(location.hash)) render(); }); return head("Estúdio", "Carregando…") + estAbas("carrossel") + `<div class="card vazio">Carregando…</div>`; }
  const car = CRS.atual, t = car.telas[CRS.tela] || car.telas[0], fontes = typeof estFontes === "function" ? estFontes() : [["Plus Jakarta Sans", "Moderna"]];
  const vivos = CRS.fundos.filter(f => !crOculto(f)), apag = CRS.fundos.filter(crOculto);
  const cats = ["Todas", ...new Set(vivos.map(f => f.cat))], fvis = CRS.catF === "🗑️ Apagados" ? apag : CRS.catF === "Todas" ? vivos : vivos.filter(f => f.cat === CRS.catF);
  const fSel = CRS.fundos.find(f => f.src === t.fundo);
  const rng = (k, l, min, max, v) => `<label class="est-r"><span>${l}</span><input type="range" min="${min}" max="${max}" value="${v}" data-cr="${k}"></label>`;
  const amanha = isoLocal(new Date(Date.now() + 864e5)).slice(0, 10) + "T12:00";
  setTimeout(crPintar, 0);
  return head("Estúdio", "Crie Reels e carrosséis, aprove e vá postando.") + estAbas("carrossel") + `
  <div class="est cr">
    <div class="est-prev"><div class="cr-tela"><canvas id="cr-cv" width="${PW}" height="${PH}"></canvas></div>
      <div class="cr-tiras" id="cr-tiras">${car.telas.map((_, i) => `<button class="cr-mini ${i === CRS.tela ? "on" : ""}" data-act="crtela" data-i="${i}"><canvas width="108" height="135" id="cr-m-${i}"></canvas><small>${i + 1}</small></button>`).join("")}</div>
      <div class="cr-n"><span>Telas:</span><button class="bt sm" data-act="crmenos" ${car.telas.length <= 1 ? "disabled" : ""}>−</button><b>${car.telas.length}</b><button class="bt sm" data-act="crmais" ${car.telas.length >= 10 ? "disabled" : ""}>+</button>
        <button class="bt sm ghost" data-act="crmover" data-d="-1" ${CRS.tela === 0 ? "disabled" : ""}>◀ mover</button><button class="bt sm ghost" data-act="crmover" data-d="1" ${CRS.tela >= car.telas.length - 1 ? "disabled" : ""}>mover ▶</button>
        <button class="bt sm ghost" data-act="crdel" ${car.telas.length <= 1 ? "disabled" : ""}>🗑️ apagar tela</button></div></div>
    <div class="est-ctl">
      <div class="card"><b>Tela ${CRS.tela + 1}: frase</b><textarea id="cr-txt" rows="3" placeholder="Escreva a frase…">${esc(t.texto)}</textarea>
        ${rng("ttam", "Tamanho só desta tela", 50, 170, t.tam || car.tam)}</div>
      <div class="card"><div class="vb-top"><b>Fundo da tela ${CRS.tela + 1}</b><span><button class="bt sm ghost" data-act="crfundotodas">Usar em todas</button>
        <label class="bt sm pri vb-subir">＋ Subir foto<input type="file" accept="image/*" id="cr-foto" multiple hidden></label></span></div>
        <div class="vb-cats">${cats.map(c => `<button class="vb-cat ${CRS.catF === c ? "on" : ""}" data-act="crcat" data-c="${esc(c)}">${esc(c)}</button>`).join("")}${apag.length ? `<button class="vb-cat ${CRS.catF === "🗑️ Apagados" ? "on" : ""}" data-act="crcat" data-c="🗑️ Apagados">🗑️ Apagados <small>${apag.length}</small></button>` : ""}</div>
        ${fSel ? `<div class="vb-sel"><small>Fundo selecionado:</small>${crOculto(fSel) ? `<button class="bt sm" data-act="crvoltafundo">↩ Recuperar</button>` : `<button class="bt sm ghost" data-act="crapagafundo">🗑️ Apagar do banco</button>`}<small class="sub">${fSel.video ? "apaga também o vídeo no Reels" : ""}</small></div>` : ""}
        <div class="cr-fundos">${fvis.map(f => `<button class="cr-f ${f.src === t.fundo ? "on" : ""}" data-act="crfundo" data-src="${esc(f.src)}" style="background-image:url(${esc(f.prev || f.src)})">${f.meu ? `<span class="vb-meu">seu</span>` : ""}</button>`).join("")}</div></div>
      <div class="card"><b>Estilo (vale pro carrossel todo)</b>
        <div class="est-fontes">${fontes.map(([f, d]) => `<button class="est-f ${f === car.fonte ? "on" : ""}" data-act="crfonte" data-f="${esc(f)}" style="font-family:'${esc(f)}';font-weight:${FONTE_PESO[f] || 400}">Aa viagem<small>${esc(d)}</small></button>`).join("")}</div>
        <div class="est-rs">${rng("tam", "Tamanho do texto", 50, 170, car.tam)}${rng("y", "Altura", 25, 75, car.y)}${rng("escuro", "Escurecer fundo", 0, 85, car.escuro)}</div>
        <div class="est-cores">${["#F3E7C9", "#FFFDF8", "#F5C531", "#FFFFFF", "#111111"].map(c => `<button class="est-cor ${c === car.cor ? "on" : ""}" data-act="crcor" data-c="${c}" style="background:${c}"></button>`).join("")}
          ${[["left", "⬅"], ["center", "☰"], ["right", "➡"]].map(([a, l]) => `<button class="vb-cat ${car.alinh === a ? "on" : ""}" data-act="cralinh" data-a="${a}" title="alinhar">${l}</button>`).join("")}
          <label class="chk"><input type="checkbox" data-cr="cabec" ${car.cabec ? "checked" : ""}> PARTIU 085 // VIAJAR</label><label class="chk"><input type="checkbox" data-cr="caixa" ${car.caixa ? "checked" : ""}> CAIXA ALTA</label></div></div>
      <div class="card"><b>Pronto</b>
        <div class="field"><label>Nome (só pra você achar depois)</label><input id="cr-tit" value="${esc(car.titulo)}" placeholder="Ex.: Frases de viagem 1"></div>
        <div class="field"><label>Legenda</label><textarea id="cr-leg" rows="4" placeholder="Legenda do post…">${esc(car.legenda)}</textarea></div>
        <div class="est-fim"><button class="bt pri" data-act="crsalvar">💾 Salvar</button><button class="bt" data-act="craprovar">✓ Aprovar</button><button class="bt" data-act="crbaixar">${ic("down")}Baixar ${car.telas.length > 1 ? car.telas.length + " telas" : "imagem"}</button><button class="bt ghost" data-act="crnovo">+ Novo</button></div>
        <div class="est-fim" style="margin-top:10px"><input type="datetime-local" id="cr-q" value="${amanha}"><button class="bt pri" data-act="cragendar">${ic("calendar")}Mandar pra agenda</button></div></div>
    </div></div>${crBibHTML()}`;
}
function crBibHTML() {
  const L = CRS.lista || [], g = e => L.filter(x => (x.estado || "rascunho") === e);
  const card = x => `<div class="est-card cr-card ${CRS.atual && x.id === CRS.atual.id ? "on" : ""}"><canvas width="216" height="270" data-crmini="${esc(x.id)}"></canvas><p><b>${esc(x.titulo || "Sem nome")}</b> · ${x.telas.length} tela${x.telas.length > 1 ? "s" : ""}${x.agendado ? ` · 📅 ${x.agendado.slice(8, 10)}/${x.agendado.slice(5, 7)} ${x.agendado.slice(11, 16)}` : ""}</p>
    <div class="est-bts"><button class="bt sm pri" data-act="crabrir" data-id="${esc(x.id)}">Abrir</button>${x.estado !== "postado" ? `<button class="bt sm" data-act="crpostei" data-id="${esc(x.id)}">✓ Postei</button>` : `<button class="bt sm ghost" data-act="crdesp" data-id="${esc(x.id)}">desfazer</button>`}<button class="bt sm ghost" data-act="crtira" data-id="${esc(x.id)}">✕</button></div></div>`;
  const sec = (tit, arr, vazio) => `<div class="card est-bib"><div class="est-tit"><b>${tit} (${arr.length})</b></div>${arr.length ? `<div class="est-grade">${arr.map(card).join("")}</div>` : `<div class="vazio">${vazio}</div>`}</div>`;
  return sec("✅ Aprovados", g("aprovado"), "Nada aprovado ainda.") + sec("📝 Rascunhos", g("rascunho"), "Seus rascunhos salvos aparecem aqui. Toque em 💾 Salvar.") +
    (g("postado").length ? `<details class="card est-bib"><summary><b>Já postados (${g("postado").length})</b></summary><div class="est-grade">${g("postado").map(card).join("")}</div></details>` : "");
}
async function crPintar(so) {
  const car = CRS.atual; if (!car) return; const cv = document.getElementById("cr-cv"); if (!cv) return;
  try { await document.fonts.load(`${FONTE_PESO[car.fonte] || 400} 60px "${car.fonte}"`); } catch (e) { }
  const g = document.createElement("canvas"); g.width = PW; g.height = PH; await crDesenhar(g.getContext("2d"), car, CRS.tela); cv.getContext("2d").drawImage(g, 0, 0);
  const minis = so === "atual" ? [CRS.tela] : car.telas.map((_, i) => i);
  for (const i of minis) { const m = document.getElementById("cr-m-" + i); if (!m) continue; const x = i === CRS.tela ? g : await crCanvas(car, i); m.getContext("2d").drawImage(x, 0, 0, m.width, m.height); }
  if (so) return;
  for (const el of document.querySelectorAll("canvas[data-crmini]")) { const x = (CRS.lista || []).find(y => y.id === el.dataset.crmini); if (!x) continue; try { await document.fonts.load(`${FONTE_PESO[x.fonte] || 400} 40px "${x.fonte}"`); } catch (e) { } const k = await crCanvas(x, 0); el.getContext("2d").drawImage(k, 0, 0, el.width, el.height); }
}
let crTimer = null; function crMudou(so = "atual") { crGuardarLocal(); clearTimeout(crTimer); crTimer = setTimeout(() => crPintar(so), 60); }
function crGuardarNaLista(estado) { const car = CRS.atual; car.titulo = ($("#cr-tit") || {}).value ?? car.titulo; car.legenda = ($("#cr-leg") || {}).value ?? car.legenda; if (estado) car.estado = estado;
  CRS.lista = (CRS.lista || []).filter(x => x.id !== car.id); CRS.lista.unshift(JSON.parse(JSON.stringify(car))); }

document.addEventListener("input", e => { const t = e.target; if (!CRS.atual || !/#carrossel/.test(location.hash)) return; const car = CRS.atual;
  if (t.id === "cr-txt") { car.telas[CRS.tela].texto = t.value; crMudou(); }
  else if (t.id === "cr-tit") car.titulo = t.value; else if (t.id === "cr-leg") car.legenda = t.value;
  else if (t.dataset && t.dataset.cr) { const k = t.dataset.cr; if (k === "ttam") car.telas[CRS.tela].tam = +t.value; else car[k] = t.type === "checkbox" ? t.checked : +t.value; if (k === "tam") car.telas.forEach(x => delete x.tam); crMudou(k === "ttam" ? "atual" : "todas"); } });
document.addEventListener("change", async e => { const t = e.target; if (t.id !== "cr-foto" || !t.files.length) return;
  if (!token()) { toast("Conecte em Ajustes pra salvar suas fotos."); return; }
  const cat = (prompt("Categoria dessas fotos (ex.: Fortaleza, Aeroporto, Praia):", CRS.catF !== "Todas" && CRS.catF !== "Fotos" ? CRS.catF : "Minhas fotos") || "Minhas fotos").trim();
  for (const f of t.files) { toast("Subindo foto…");
    const im = await new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = URL.createObjectURL(f); }); if (!im) { toast("Não consegui abrir " + f.name); continue; }
    const s = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight)), cv = document.createElement("canvas"); cv.width = im.naturalWidth * s; cv.height = im.naturalHeight * s; cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
    const url = cv.toDataURL("image/jpeg", .88), src = `midia/foto-u-${Date.now().toString(36)}.jpg`;
    try { await gh(`/contents/docs/${src}`, { method: "PUT", body: JSON.stringify({ message: "Carrossel: foto enviada", content: url.split(",")[1], branch: "main" }) });
      CRS.cache[src] = Promise.resolve(im); CRS.fotosMeus.push({ src, cat, enviado: hojeISO() }); CRS.fundos.unshift({ src, cat, meu: true, prev: url });
      CRS.atual.telas[CRS.tela].fundo = src; } catch (x) { toast("Não subiu: " + x.message); } }
  try { await salvarArquivo("docs/fotos_meus.json", CRS.fotosMeus, "Carrossel: fotos"); } catch (x) { }
  CRS.catF = cat; crGuardarLocal(); render(); toast("Foto salva no seu banco! (a miniatura aparece certinha em 1 a 2 minutos)"); });
document.addEventListener("click", async e => { const b = e.target.closest('[data-act^="cr"]'); if (!b || !/#carrossel/.test(location.hash)) return; const a = b.dataset.act, car = CRS.atual;
  const sync = () => { car.titulo = ($("#cr-tit") || {}).value ?? car.titulo; car.legenda = ($("#cr-leg") || {}).value ?? car.legenda; };
  if (a === "crtela") { CRS.tela = +b.dataset.i; render(); }
  else if (a === "crmais") { sync(); const ult = car.telas[car.telas.length - 1]; car.telas.splice(CRS.tela + 1, 0, { texto: "Nova frase", fundo: ult.fundo }); CRS.tela++; crGuardarLocal(); render(); }
  else if (a === "crmenos" || a === "crdel") { sync(); if (car.telas.length <= 1) return; car.telas.splice(a === "crdel" ? CRS.tela : car.telas.length - 1, 1); CRS.tela = Math.min(CRS.tela, car.telas.length - 1); crGuardarLocal(); render(); }
  else if (a === "crmover") { sync(); const d = +b.dataset.d, j = CRS.tela + d; if (j < 0 || j >= car.telas.length) return; [car.telas[CRS.tela], car.telas[j]] = [car.telas[j], car.telas[CRS.tela]]; CRS.tela = j; crGuardarLocal(); render(); }
  else if (a === "crcat") { sync(); CRS.catF = b.dataset.c; render(); }
  else if (a === "crfundo") { car.telas[CRS.tela].fundo = b.dataset.src; document.querySelectorAll(".cr-f").forEach(x => x.classList.toggle("on", x === b)); crMudou(); }
  else if (a === "crapagafundo" || a === "crvoltafundo") { const f = CRS.fundos.find(x => x.src === car.telas[CRS.tela].fundo); if (!f || typeof VB === "undefined") return; const ks = [f.src, f.video].filter(Boolean);
    VB.cfg.ocultos = a === "crapagafundo" ? [...new Set([...VB.cfg.ocultos, ...ks])] : VB.cfg.ocultos.filter(x => !ks.includes(x));
    if (EST.todos) EST.lista = EST.todos.filter(v => !VB.cfg.ocultos.includes(v.src));
    if (a === "crapagafundo") { const prox = CRS.fundos.find(x => !crOculto(x) && (CRS.catF === "Todas" || x.cat === CRS.catF)) || CRS.fundos.find(x => !crOculto(x)); if (prox) car.telas[CRS.tela].fundo = prox.src; toast("Apagado do banco. Se mudar de ideia, está em 🗑️ Apagados."); }
    crGuardarLocal(); render(); vbSalvarCfg(a === "crapagafundo" ? "Banco: apaga fundo" : "Banco: recupera fundo"); }
  else if (a === "crfundotodas") { car.telas.forEach(x => x.fundo = car.telas[CRS.tela].fundo); crMudou("todas"); toast("Fundo aplicado em todas as telas."); }
  else if (a === "crfonte") { car.fonte = b.dataset.f; document.querySelectorAll('[data-act="crfonte"]').forEach(x => x.classList.toggle("on", x === b)); crMudou("todas"); }
  else if (a === "crcor") { car.cor = b.dataset.c; document.querySelectorAll('[data-act="crcor"]').forEach(x => x.classList.toggle("on", x === b)); crMudou("todas"); }
  else if (a === "cralinh") { car.alinh = b.dataset.a; document.querySelectorAll('[data-act="cralinh"]').forEach(x => x.classList.toggle("on", x === b)); crMudou("todas"); }
  else if (a === "crsalvar") { crGuardarNaLista(); await crSalvarLista("Carrossel: salva"); toast("Salvo em Rascunhos."); render(); }
  else if (a === "craprovar") { crGuardarNaLista("aprovado"); await crSalvarLista("Carrossel: aprova"); toast("Aprovado! Está em ✅ Aprovados."); render(); }
  else if (a === "crnovo") { sync(); CRS.atual = crNovo(3); CRS.tela = 0; crGuardarLocal(); render(); scrollTo({ top: 0, behavior: "smooth" }); }
  else if (a === "crbaixar") { sync(); for (let i = 0; i < car.telas.length; i++) { const cv = await crCanvas(car, i); const l = document.createElement("a"); l.download = `partiu085-carrossel-${i + 1}.png`; l.href = cv.toDataURL("image/png"); l.click(); await new Promise(r => setTimeout(r, 350)); } }
  else if (a === "cragendar") { sync(); const q = ($("#cr-q") || {}).value; if (!q) { toast("Escolha dia e hora."); return; } if (!car.legenda.trim()) { toast("Escreva a legenda antes."); return; }
    b.disabled = true; try { const cvs = []; for (let i = 0; i < car.telas.length; i++) cvs.push(await crCanvas(car, i));
      await agendarItens([{ titulo: "🖼️ " + (car.titulo || car.telas[0].texto).slice(0, 60), cvs, legenda: car.legenda, origem: car.id }], [q + "-03:00"], true, t => { b.textContent = t; });
      car.agendado = q; crGuardarNaLista("aprovado"); await crSalvarLista("Carrossel: agendado"); toast(`Na agenda pra ${q.slice(8, 10)}/${q.slice(5, 7)} às ${q.slice(11, 16)}! Veja em Instagram: agenda.`, 6000); render(); }
    catch (x) { toast("Não agendou: " + x.message, 7000); b.disabled = false; b.innerHTML = "Mandar pra agenda"; } }
  else { const x = (CRS.lista || []).find(y => y.id === b.dataset.id); if (!x) return;
    if (a === "crabrir") { CRS.atual = JSON.parse(JSON.stringify(x)); CRS.tela = 0; crGuardarLocal(); render(); scrollTo({ top: 0, behavior: "smooth" }); }
    else if (a === "crpostei") { x.estado = "postado"; x.postado = hojeISO(); await crSalvarLista("Carrossel: postado"); render(); }
    else if (a === "crdesp") { x.estado = "aprovado"; delete x.postado; await crSalvarLista("Carrossel: desfaz postado"); render(); }
    else if (a === "crtira" && confirm(`Apagar "${x.titulo || "sem nome"}"?`)) { CRS.lista = CRS.lista.filter(y => y !== x); await crSalvarLista("Carrossel: remove"); render(); } } });

/* abrir um carrossel de frases da Pauta já no editor */
function abrirCarrossel(idFrases) { const x = (typeof FRASES_C !== "undefined" ? FRASES_C : []).find(f => "fr-" + f.id === idFrases); if (!x) return; CRS.atual = crDeFrases(x); CRS.tela = 0; crGuardarLocal(); location.hash = "#carrossel"; }
