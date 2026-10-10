/* Partiu 085 — 🎬 Estúdio de Reels: escolhe o vídeo (do banco ou seu), escreve o texto, escolhe a fonte,
   vê a prévia rodando e baixa o vídeo pronto (ou manda pro robô agendar). */
"use strict";
const EST = { video: "", poster: "", nome: "", arquivo: null, texto: "a gente não é rico, mas planeja cada viagem que até Deus tem orgulho da nossa fé", fonte: "Instrument Serif",
  tam: 92, cor: "#FFFDF8", y: 50, larg: 82, brilho: 1, escuro: 25, arroba: true, minusc: false, maiusc: false, olho: 55, gravando: false, lista: null, fontesExtra: null };
const FONTES_EST = [
  ["Instrument Serif", "Serifada condensada (viral)"], ["Playfair Display", "Serifada elegante"], ["DM Serif Display", "Serifada forte"], ["Gloock", "Serifada editorial"],
  ["Cormorant Garamond", "Serifada fina"], ["Patrick Hand", "Escrita à mão"], ["Caveat", "Caneta"], ["Montserrat", "Moderna (negrito)"],
  ["Plus Jakarta Sans", "Moderna (marca)"], ["Anton", "Cartaz"], ["Bebas Neue", "Cartaz fina"]];
const FONTE_PESO = { "Montserrat": 800, "Plus Jakarta Sans": 800, "Cormorant Garamond": 600, "Caveat": 600 };
try { Object.assign(EST, JSON.parse(localStorage.getItem("p085_est") || "{}"), { arquivo: null, gravando: false, lista: null, fontesExtra: null }); if (/^blob:/.test(EST.video)) EST.video = ""; } catch (e) { }
function estGuardar() { try { const { arquivo, gravando, lista, fontesExtra, ap, ...r } = EST; localStorage.setItem("p085_est", JSON.stringify(r)); } catch (e) { } }

async function estCarregar() {
  if (!EST.lista) { await vbCarregar();
    if (!EST.video && EST.lista.length) { EST.video = EST.lista[0].src; EST.poster = EST.lista[0].poster; EST.nome = EST.lista[0].nome; } }
  if (!EST.fontesExtra) { const f = await getJSON("fontes/fontes.json", []); EST.fontesExtra = f;
    for (const x of f) { try { const ff = new FontFace(x.nome, `url(fontes/${x.arq})`); await ff.load(); document.fonts.add(ff); } catch (e) { } } }
}
function estFontes() { return FONTES_EST.concat((EST.fontesExtra || []).map(x => [x.nome, "Sua fonte"])); }

/* efeito "olho de peixe": o centro do texto fica maior e as bordas curvam (estilo dos Reels virais) */
function olhoDePeixe(cv, cx, cy, Rx, Ry, forca) {
  if (!forca || Rx < 4) return cv;
  const W = cv.width, H = cv.height, c = cv.getContext("2d");
  const x0 = Math.max(0, Math.floor(cx - Rx)), y0 = Math.max(0, Math.floor(cy - Ry)), w = Math.min(W, Math.ceil(cx + Rx)) - x0, h = Math.min(H, Math.ceil(cy + Ry)) - y0;
  if (w <= 0 || h <= 0) return cv;
  const src = c.getImageData(x0, y0, w, h), dst = c.createImageData(w, h), S = src.data, D = dst.data, k = 1 + forca / 100 * .5;
  const px = (X, Y, j) => S[(Y * w + X) * 4 + j];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const nx = (x + x0 - cx) / Rx, ny = (y + y0 - cy) / Ry, r = Math.sqrt(nx * nx + ny * ny), o = (y * w + x) * 4;
    let sx = x, sy = y;
    if (r < 1 && r > 0) { const f = Math.pow(r, k) / r; sx = cx + nx * f * Rx - x0; sy = cy + ny * f * Ry - y0; }
    const ix = Math.floor(sx), iy = Math.floor(sy); if (ix < 0 || iy < 0 || ix >= w - 1 || iy >= h - 1) { if (ix >= 0 && iy >= 0 && ix < w && iy < h) { const i = (iy * w + ix) * 4; for (let j = 0; j < 4; j++) D[o + j] = S[i + j]; } continue; }
    const fx = sx - ix, fy = sy - iy;
    for (let j = 0; j < 4; j++) D[o + j] = (px(ix, iy, j) * (1 - fx) + px(ix + 1, iy, j) * fx) * (1 - fy) + (px(ix, iy + 1, j) * (1 - fx) + px(ix + 1, iy + 1, j) * fx) * fy;
  }
  c.putImageData(dst, x0, y0); return cv;
}
/* olho de peixe leve e redondo: lente suave sobre letras nítidas. Cada letra fica em pé (sem entortar),
   o meio cresce um pouco e as letras se afastam do centro em círculo, como numa bolha. */
function textoOlho(c, W, H, linhas, fonte, fs, lh, yCentro, cor, sombra, forca) {
  const a = Math.max(0, Math.min(100, forca || 0)) / 100 * .36, ls = parseFloat(c.letterSpacing) || 0;
  const fam = fonte.replace(/^.*?\d+(\.\d+)?px\s*/, ""), peso = (fonte.match(/^(\d{3}|bold|normal)/) || ["400"])[0];
  const F = sz => `${peso} ${sz}px ${fam}`;
  c.save(); c.font = F(fs); if ("letterSpacing" in c) c.letterSpacing = "0px";
  const L = linhas.map(l => { const ch = Array.from(l); return { ch, w: ch.map(x => c.measureText(x).width + ls) }; });
  const maxW = Math.max(1, ...L.map(l => l.w.reduce((p, q) => p + q, 0))), n = L.length;
  const R = Math.max(maxW / 2 * 1.3, n * lh / 2 * 1.25 + fs * .4); // raio único = lente redonda
  const kf = Math.min(1, W * .92 / (maxW * (1 + a))); // nunca sai da tela
  if (sombra) { c.shadowColor = "rgba(0,0,0,.5)"; c.shadowBlur = 22 * W / 1080; }
  c.fillStyle = cor; c.textAlign = "center"; c.textBaseline = "alphabetic";
  L.forEach((l, j) => { const tot = l.w.reduce((p, q) => p + q, 0), by = (lh * (j + .5) - n * lh / 2) * kf; let x = -tot / 2;
    l.ch.forEach((ch, k) => { const bx = (x + l.w[k] / 2) * kf; x += l.w[k];
      const r2 = Math.min(1, (bx * bx + by * by) / (R * R * kf * kf)), g = 1 + a * (1 - r2); // g: quanto cresce/afasta naquele ponto
      const sz = fs * kf * Math.max(.7, 1 + a * (1 - r2) - 2 * a * bx * bx / (R * R * kf * kf)); // tamanho = quanto a lente estica ali (sem letra encavalar)
      c.font = F(sz); c.fillText(ch, W / 2 + bx * g, yCentro + by * g + sz * .32); }); });
  c.restore();
}
/* desenha o texto (mesma função na prévia e no vídeo final) */
function estQuebrar(c, t, w) { const out = []; t.split("\n").forEach(par => { let l = ""; par.split(/\s+/).forEach(p => { const tt = l ? l + " " + p : p; if (c.measureText(tt).width > w && l) { out.push(l); l = p; } else l = tt; }); out.push(l); }); return out; }
function estDesenhar(c, W, H) {
  if (EST.escuro) { c.fillStyle = `rgba(0,0,0,${EST.escuro / 100})`; c.fillRect(0, 0, W, H); }
  const k = W / 1080, fs = EST.tam * k, peso = FONTE_PESO[EST.fonte] || 400;
  c.font = `${peso} ${fs}px "${EST.fonte}", serif`; c.textAlign = "center"; c.textBaseline = "alphabetic";
  if ("letterSpacing" in c) c.letterSpacing = (/Serif|Gloock|Playfair/.test(EST.fonte) ? -fs * .02 : 0) + "px";
  let t = EST.texto || ""; if (EST.minusc && t) t = t.charAt(0).toLowerCase() + t.slice(1); if (EST.maiusc) t = t.toUpperCase();
  const L = estQuebrar(c, t, W * EST.larg / 100), lh = fs * (EST.maiusc ? .95 : 1.02);
  textoOlho(c, W, H, L, c.font, fs, lh, H * EST.y / 100, EST.cor, EST.brilho, EST.olho);
  if ("letterSpacing" in c) c.letterSpacing = "0px";
  if (EST.arroba) { c.save(); c.globalAlpha = .85; c.font = `600 ${30 * k}px "Plus Jakarta Sans", sans-serif`; c.fillStyle = EST.cor; c.fillText("@partiu.085", W / 2, H - 340 * k); c.restore(); }
}
function estPrevia() {
  const cv = document.getElementById("est-cv"); if (!cv) return;
  const c = cv.getContext("2d"); c.clearRect(0, 0, cv.width, cv.height);
  document.fonts.load(`${FONTE_PESO[EST.fonte] || 400} 60px "${EST.fonte}"`).then(() => { c.clearRect(0, 0, cv.width, cv.height); estDesenhar(c, cv.width, cv.height); });
}

/* gravar o vídeo final no navegador (1080x1920) */
async function estExportar(b) {
  const v = document.getElementById("est-v"); if (!v) return;
  const mime = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
  if (!mime) { toast("Esse navegador não grava vídeo. Use o Safari ou o Chrome atualizados."); return; }
  const dur = Math.min(+document.getElementById("est-dur").value || 9, isFinite(v.duration) ? v.duration : 9);
  const cv = document.createElement("canvas"); cv.width = 1080; cv.height = 1920; const c = cv.getContext("2d");
  const capa = document.createElement("canvas"); capa.width = 1080; capa.height = 1920; estDesenhar(capa.getContext("2d"), 1080, 1920);
  const rec = new MediaRecorder(cv.captureStream(30), { mimeType: mime, videoBitsPerSecond: 8e6 }), partes = [];
  rec.ondataavailable = e => e.data.size && partes.push(e.data);
  EST.gravando = true; b.disabled = true; const t0 = b.innerHTML;
  v.pause(); v.currentTime = 0; v.loop = false; await new Promise(r => { v.onseeked = r; setTimeout(r, 400); });
  const desenha = () => { const s = Math.max(1080 / v.videoWidth, 1920 / v.videoHeight); c.drawImage(v, (1080 - v.videoWidth * s) / 2, (1920 - v.videoHeight * s) / 2, v.videoWidth * s, v.videoHeight * s); c.drawImage(capa, 0, 0); };
  rec.start(200); v.play(); const ini = performance.now();
  await new Promise(fim => { const passo = () => { desenha(); const t = (performance.now() - ini) / 1000; b.textContent = `Gravando… ${Math.min(dur, t).toFixed(0)}/${dur.toFixed(0)}s`; if (t >= dur || v.ended) return fim(); requestAnimationFrame(passo); }; passo(); });
  rec.stop(); await new Promise(r => rec.onstop = r); v.loop = true; v.play();
  const blob = new Blob(partes, { type: mime.split(";")[0] }), ext = mime.includes("mp4") ? "mp4" : "webm";
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `partiu085-reels-${Date.now().toString(36)}.${ext}`; a.click();
  EST.gravando = false; b.disabled = false; b.innerHTML = t0;
  toast(ext === "mp4" ? "Vídeo baixado! É só postar pelo celular com uma música em alta." : "Vídeo baixado em .webm (o Chrome grava assim). Pra .mp4 direto, use o Safari.", 7000);
}

/* mandar pro robô publicar (vídeo do banco ou o seu) */
async function estAgendar(b) {
  if (!token()) { toast("Conecte o token do GitHub em Ajustes."); return; }
  const quando = document.getElementById("est-q").value; if (!quando) { toast("Escolha dia e hora."); return; }
  b.disabled = true; b.textContent = "Enviando…";
  try {
    IGF.fila = null; await carregarIG(true); IGF.fila = IGF.fila || [];
    const id = `ig-${Date.now().toString(36)}`;
    const capa = document.createElement("canvas"); capa.width = 1080; capa.height = 1920; await document.fonts.load(`400 60px "${EST.fonte}"`); estDesenhar(capa.getContext("2d"), 1080, 1920);
    const put = (path, b64, msg) => gh(`/contents/docs/${path}`, { method: "PUT", body: JSON.stringify({ message: msg, content: b64, branch: "main" }) });
    let fundo = EST.video;
    if (EST.arquivo) { if (EST.arquivo.size > 40e6) throw new Error("vídeo grande demais (máx. 40 MB)"); b.textContent = "Subindo seu vídeo…";
      const b64 = await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result.split(",")[1]); r.readAsDataURL(EST.arquivo); });
      fundo = `ig/${id}-fundo.mp4`; await put(fundo, b64, "Instagram: vídeo do estúdio"); }
    await put(`ig/${id}-overlay.png`, capa.toDataURL("image/png").split(",")[1], "Instagram: camada do estúdio");
    const quadro = document.createElement("canvas"); quadro.width = 1080; quadro.height = 1920; const v = document.getElementById("est-v");
    try { const s = Math.max(1080 / v.videoWidth, 1920 / v.videoHeight); quadro.getContext("2d").drawImage(v, (1080 - v.videoWidth * s) / 2, (1920 - v.videoHeight * s) / 2, v.videoWidth * s, v.videoHeight * s); } catch (e) { }
    quadro.getContext("2d").drawImage(capa, 0, 0); await put(`ig/${id}-1.jpg`, quadro.toDataURL("image/jpeg", .85).split(",")[1], "Instagram: capa do estúdio");
    IGF.fila.push({ id, titulo: "🎬 " + (EST.texto || "Reels").slice(0, 60), tipo: "reels", imagens: [`ig/${id}-1.jpg`], video_fundo: fundo, overlay: `ig/${id}-overlay.png`, dur: +document.getElementById("est-dur").value || 9,
      legenda: document.getElementById("est-leg").value, quando: quando + "-03:00", aprovado: true, tentativa: 0, criado: isoLocal(new Date()), origem: "estudio" });
    await salvarFila("Instagram: Reels do estúdio"); toast("Reels agendado! Veja em Instagram: agenda.", 5000);
  } catch (e) { toast("Não foi: " + e.message, 7000); }
  b.disabled = false; b.textContent = "Agendar no Instagram";
}

async function estSubirFonte(f) {
  if (!f) return; if (!token()) { toast("Conecte o token do GitHub em Ajustes."); return; }
  const nome = f.name.replace(/\.(ttf|otf|woff2?)$/i, "").replace(/[-_]+/g, " ").trim(), arq = f.name.replace(/[^\w.-]+/g, "-");
  const b64 = await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result.split(",")[1]); r.readAsDataURL(f); });
  try { const ff = new FontFace(nome, `url(data:font/ttf;base64,${b64})`); await ff.load(); document.fonts.add(ff);
    await gh(`/contents/docs/fontes/${arq}`, { method: "PUT", body: JSON.stringify({ message: "Fonte do estúdio", content: b64, branch: "main" }) });
    const lista = (EST.fontesExtra || []).filter(x => x.nome !== nome).concat({ nome, arq }); await salvarArquivo("docs/fontes/fontes.json", lista, "Fontes do estúdio");
    EST.fontesExtra = lista; EST.fonte = nome; estGuardar(); toast(`Fonte "${nome}" adicionada.`); render(); }
  catch (e) { toast("Não consegui usar essa fonte: " + e.message, 6000); }
}

function pEstudio() {
  if (!EST.lista || !EST.fontesExtra || !EST.ap) { Promise.all([estCarregar(), carregarAp()]).then(() => { if (/#estudio/.test(location.hash)) render(); }); }
  setTimeout(() => { estPrevia(); desenharMinis(); }, 0);
  const rng = (k, l, min, max, step = 1) => `<label class="est-r"><span>${l}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${EST[k]}" data-est="${k}"></label>`;
  const amanha = isoLocal(new Date(Date.now() + 864e5)).slice(0, 10) + "T19:00";
  return head("Estúdio", "Crie Reels e carrosséis, aprove e vá postando.") + estAbas("estudio") +
    `<div class="est">
      <div class="est-prev"><div class="est-tela"><video id="est-v" src="${esc(EST.video)}" poster="${esc(EST.poster)}" autoplay muted loop playsinline></video><canvas id="est-cv" width="540" height="960"></canvas></div>
        <small class="sub">${EST.arquivo ? "Seu vídeo" : esc(EST.nome)} · a prévia roda em loop, sem som</small></div>
      <div class="est-ctl">
        <div class="card">${vbHTML()}</div>
        <div class="card"><b>2. Texto</b><textarea id="est-txt" rows="3">${esc(EST.texto)}</textarea>
          <div class="est-cores"><label class="chk"><input type="checkbox" data-est="minusc" ${EST.minusc ? "checked" : ""}> começar em minúscula</label><label class="chk"><input type="checkbox" data-est="maiusc" ${EST.maiusc ? "checked" : ""}> TUDO EM CAIXA ALTA</label></div></div>
        <div class="card"><b>3. Fonte</b><div class="est-fontes">${estFontes().map(([f, d]) => `<button class="est-f ${f === EST.fonte ? "on" : ""}" data-act="estfonte" data-f="${esc(f)}" style="font-family:'${esc(f)}';font-weight:${FONTE_PESO[f] || 400}">Aa viagem<small>${esc(d)}</small></button>`).join("")}
          <label class="est-f est-up">＋ Enviar fonte<small>.ttf ou .otf</small><input type="file" accept=".ttf,.otf,.woff,.woff2" id="est-font" hidden></label></div>
          <div class="est-rs">${rng("tam", "Tamanho", 50, 150)}${rng("y", "Altura", 15, 85)}${rng("larg", "Largura", 50, 95)}${rng("olho", "Efeito olho de peixe", 0, 100)}${rng("escuro", "Escurecer vídeo", 0, 60)}</div>
          <div class="est-cores">${["#FFFDF8", "#F6EBD0", "#F5C531", "#FFFFFF", "#111111"].map(c => `<button class="est-cor ${c === EST.cor ? "on" : ""}" data-act="estcor" data-c="${c}" style="background:${c}"></button>`).join("")}
            <label class="chk"><input type="checkbox" data-est="brilho" ${EST.brilho ? "checked" : ""}> sombra</label><label class="chk"><input type="checkbox" data-est="arroba" ${EST.arroba ? "checked" : ""}> @partiu.085</label></div></div>
        <div class="card"><b>4. Pronto</b><div class="est-fim"><label class="est-r"><span>Duração (s)</span><input type="number" id="est-dur" min="3" max="30" value="9"></label>
          <button class="bt pri lg" data-act="estbaixar">${ic("down")}Baixar vídeo</button><button class="bt lg" data-act="estaprovaratual">✓ Aprovar pra postar depois</button></div>
          <details><summary>Ou agendar pro robô postar</summary><div class="field"><label>Legenda</label><textarea id="est-leg" rows="4">Quem se identifica? 😂✈️\n\nPassagem barata saindo de Fortaleza: segue o @partiu.085\n\n${HASH}</textarea></div>
            <div class="est-fim"><input type="datetime-local" id="est-q" value="${amanha}"><button class="bt" data-act="estagendar">Agendar no Instagram</button></div>
            <small class="sub">Pelo robô o Reels sai sem música. Pra pôr música em alta, baixe e poste pelo celular.</small></details></div>
      </div></div>${EST.ap ? bibliotecaHTML() : ""}`;
}
document.addEventListener("input", e => { const t = e.target;
  if (t.id === "est-txt") { EST.texto = t.value; estGuardar(); estPrevia(); }
  else if (t.dataset && t.dataset.est) { const k = t.dataset.est; EST[k] = t.type === "checkbox" ? t.checked : +t.value; estGuardar(); estPrevia(); } });
document.addEventListener("change", e => { const t = e.target;
  if (t.id === "est-file" && t.files.length) { vbAbrirEnvio([...t.files]); t.value = ""; }
  else if (t.id === "est-font" && t.files[0]) estSubirFonte(t.files[0]); });
document.addEventListener("click", e => { const b = e.target.closest('[data-act^="est"]'); if (!b) return; const a = b.dataset.act;
  if (a === "estvid") { EST.video = b.dataset.src; EST.poster = b.dataset.poster; EST.nome = b.dataset.nome; EST.arquivo = null; render(); }
  else if (a === "estfonte") { EST.fonte = b.dataset.f; estGuardar(); document.querySelectorAll(".est-f").forEach(x => x.classList.toggle("on", x === b)); estPrevia(); }
  else if (a === "estcor") { EST.cor = b.dataset.c; estGuardar(); document.querySelectorAll(".est-cor").forEach(x => x.classList.toggle("on", x === b)); estPrevia(); }
  else if (a === "estbaixar") estExportar(b);
  else if (a === "estagendar") estAgendar(b); });

/* ---------- biblioteca: Reels prontos (pra aprovar), aprovados e postados ---------- */
const CFG_K = ["video", "poster", "texto", "fonte", "tam", "cor", "y", "larg", "brilho", "escuro", "arroba", "minusc", "maiusc", "olho"];
EST.ap = null;
function cfgAtual() { const o = {}; CFG_K.forEach(k => o[k] = EST[k]); return o; }
function comCfg(cfg, fn) { const b = cfgAtual(); Object.assign(EST, cfg); try { return fn(); } finally { Object.assign(EST, b); } }
function prontos() { return (typeof REELS !== "undefined" ? REELS : []).map(x => ({ id: "pr-" + x.id, video: `midia/clip-v-${x.clip}.mp4`, poster: `midia/clip-v-${x.clip}.jpg`,
  texto: x.t.split("\n").map(l => l.charAt(0).toLowerCase() + l.slice(1)).join(" ").replace(/\. /g, ", ").replace(/\.$/, ""), legenda: x.leg,
  fonte: "Instrument Serif", tam: 92, cor: "#FFFDF8", y: 50, larg: 82, brilho: 1, escuro: 25, arroba: true, minusc: false, maiusc: false, olho: 55 })); }
async function carregarAp() { if (EST.ap) return; let L = []; try { L = JSON.parse(localStorage.getItem("p085_reels_ap") || "[]"); } catch (e) { }
  const d = await getJSON("reels_aprovados.json", null); EST.ap = d || L; }
async function salvarAp(msg) { try { localStorage.setItem("p085_reels_ap", JSON.stringify(EST.ap)); } catch (e) { } if (token()) { try { await salvarArquivo("docs/reels_aprovados.json", EST.ap, msg); } catch (e) { toast("Salvo só neste aparelho: " + e.message); } } }
function miniReels(cfg, extra) { return `<div class="rv-prev rv-play est-mini" data-act="rvplay"><video src="${esc(cfg.video)}" poster="${esc(cfg.poster || "")}" muted loop playsinline preload="none"></video><canvas width="270" height="480" data-cfg='${esc(JSON.stringify(cfg))}'></canvas><span class="rv-btn">▶</span>${extra || ""}</div>`; }
function desenharMinis() { document.querySelectorAll(".est-mini canvas[data-cfg]").forEach(cv => { const cfg = JSON.parse(cv.dataset.cfg);
  document.fonts.load(`400 40px "${cfg.fonte}"`).then(() => { const c = cv.getContext("2d"); c.clearRect(0, 0, cv.width, cv.height); comCfg(cfg, () => estDesenhar(c, cv.width, cv.height)); }); }); }
function bibliotecaHTML() {
  const ap = EST.ap || [], idsAp = new Set(ap.map(x => x.origem)), pr = prontos().filter(x => !idsAp.has(x.id));
  const pend = ap.filter(x => !x.postado), post = ap.filter(x => x.postado);
  const card = (cfg, bts) => `<div class="est-card">${miniReels(cfg)}<p>${esc(cfg.texto.slice(0, 90))}</p><div class="est-bts">${bts}</div></div>`;
  return `<div class="card est-bib"><div class="est-tit"><b>✅ Aprovados pra postar (${pend.length})</b><small class="sub">Abra, baixe e poste pelo celular com música. Depois marque "Postei".</small></div>
      ${pend.length ? `<div class="est-grade">${pend.map(x => card(x, `<button class="bt sm pri" data-act="estabrir" data-id="${x.id}">Abrir e baixar</button><button class="bt sm" data-act="estpostei" data-id="${x.id}">✓ Postei</button><button class="bt sm ghost" data-act="esttira" data-id="${x.id}">✕</button>`)).join("")}</div>` : `<div class="vazio">Nada aprovado ainda. Aprove os prontos abaixo ou crie um no editor e toque em "Aprovar".</div>`}</div>
    <div class="card est-bib"><div class="est-tit"><b>🎬 Reels prontos pra aprovar (${pr.length})</b><small class="sub">Toque ▶ pra ver rodando. Gostou? Aprovar. Quer mudar? Editar.</small></div>
      ${pr.length ? `<div class="est-grade">${pr.map(x => card(x, `<button class="bt sm pri" data-act="estaprovar" data-id="${x.id}">✓ Aprovar</button><button class="bt sm" data-act="esteditar" data-id="${x.id}">Editar</button>`)).join("")}</div>` : `<div class="vazio">Todos os prontos já foram aprovados. Me pede mais frases que eu crio.</div>`}</div>
    ${post.length ? `<details class="card est-bib"><summary><b>Já postados (${post.length})</b></summary><div class="est-grade">${post.map(x => card(x, `<span class="sub">postado ${x.postado.slice(8, 10)}/${x.postado.slice(5, 7)}</span><button class="bt sm ghost" data-act="estdesposta" data-id="${x.id}">desfazer</button>`)).join("")}</div></details>` : ""}`;
}
document.addEventListener("click", async e => { const b = e.target.closest('[data-act^="est"]'); if (!b || !EST.ap) return; const a = b.dataset.act, id = b.dataset.id;
  const pr = prontos().find(x => x.id === id), ap = EST.ap.find(x => x.id === id);
  if (a === "estaprovar" && pr) { EST.ap.unshift({ ...pr, id: "ap-" + Date.now().toString(36), origem: pr.id, aprovado: hojeISO() }); await salvarAp("Reels: aprova"); toast("Aprovado! Está em Aprovados pra postar."); render(); }
  else if (a === "esteditar" && pr) { Object.assign(EST, pr, { arquivo: null, origemEd: pr.id }); estGuardar(); render(); scrollTo({ top: 0, behavior: "smooth" }); }
  else if (a === "estabrir" && ap) { Object.assign(EST, ap, { arquivo: null }); estGuardar(); render(); scrollTo({ top: 0, behavior: "smooth" }); toast("Carregado no editor. Toque em Baixar vídeo."); }
  else if (a === "estpostei" && ap) { ap.postado = isoLocal(new Date()); await salvarAp("Reels: postado"); render(); }
  else if (a === "estdesposta" && ap) { delete ap.postado; await salvarAp("Reels: desfaz postado"); render(); }
  else if (a === "esttira" && ap) { EST.ap = EST.ap.filter(x => x !== ap); await salvarAp("Reels: remove"); render(); }
  else if (a === "estaprovaratual") { if (EST.arquivo) { toast("Vídeo seu: baixe direto (ele não fica salvo no banco)."); return; }
    EST.ap.unshift({ ...cfgAtual(), id: "ap-" + Date.now().toString(36), origem: EST.origemEd || "editor", aprovado: hojeISO(), legenda: "" }); await salvarAp("Reels: aprova do editor"); toast("Aprovado!"); render(); }
});

/* abrir o estúdio já com um vídeo e uma frase (dos Reels prontos da Pauta) */
function abrirEstudio(video, texto) { EST.video = video; EST.poster = video.replace(".mp4", ".jpg"); EST.nome = ""; EST.arquivo = null; if (texto) EST.texto = texto; estGuardar(); location.hash = "#estudio"; }


/* ================= 📁 meus vídeos: banco organizado por categoria, envio que fica salvo ================= */
const VB_CATS = ["Fortaleza", "Aeroporto", "Voo", "Praia", "Destinos", "Viagem"];
const VB_PADRAO = { aeroporto: "Aeroporto", janela: "Voo", asa: "Voo", nuvens: "Voo", decolagem: "Voo", pouso: "Voo", praia: "Praia", mala: "Viagem" };
const VB = { cat: "Todas", cfg: { ocultos: [], cats: {} }, pend: [], meus: [] };
try { VB.cat = localStorage.getItem("p085_vb_cat") || "Todas"; VB.pend = JSON.parse(localStorage.getItem("p085_vb_pend") || "[]"); } catch (e) { }
async function ghJSON(path, padrao) { // lê direto do GitHub (sem esperar o site atualizar)
  if (!token()) return getJSON(path.replace(/^docs\//, ""), padrao);
  try { const r = await gh(`/contents/${path}?ref=main&t=${Date.now()}`); return JSON.parse(decodeURIComponent(escape(atob(r.content.replace(/\n/g, ""))))); } catch (e) { return getJSON(path.replace(/^docs\//, ""), padrao); } }
async function vbCarregar() {
  const [m, meus, cfg] = await Promise.all([getJSON("midia.json", { videos: {} }), ghJSON("docs/videos_meus.json", []), ghJSON("docs/videos_cfg.json", { ocultos: [], cats: {} })]);
  VB.cfg = { ocultos: cfg.ocultos || [], cats: cfg.cats || {} }; VB.meus = meus || [];
  const banco = Object.entries(m.videos || {}).flatMap(([k, L]) => L.filter(v => /clip-/.test(v.arq)).map(v => ({ src: v.arq, poster: v.quadro || "", nome: k.replace("v-", ""), cat: VB_PADRAO[k.replace("v-", "")] || "Viagem", meu: false })));
  const env = VB.meus.filter(v => v.arq).map(v => ({ src: v.arq, poster: v.quadro, nome: v.nome || v.cat, cat: v.cat || "Outros", meu: true, quando: v.enviado || "" })).reverse();
  EST.todos = [...env, ...banco].map(v => ({ ...v, cat: VB.cfg.cats[v.src] || v.cat }));
  EST.lista = EST.todos.filter(v => !VB.cfg.ocultos.includes(v.src));
  const prontos = new Set(VB.meus.map(v => v.arq).concat(VB.meus.filter(v => v.erro).map(v => "erro:" + v.id)));
  VB.erros = VB.meus.filter(v => v.erro && VB.pend.some(p => p.id === v.id));
  VB.pend = VB.pend.filter(p => !prontos.has(`midia/clip-u-${p.id}.mp4`) && !prontos.has("erro:" + p.id) && Date.now() - p.t < 3 * 36e5); vbGuardarPend();
}
function vbGuardarPend() { try { localStorage.setItem("p085_vb_pend", JSON.stringify(VB.pend)); } catch (e) { } }
function vbCats() { const c = new Set(VB_CATS); (EST.todos || []).forEach(v => c.add(v.cat)); return [...c]; }
function vbHTML() {
  const L = EST.lista || [], cats = vbCats(), apagados = (EST.todos || []).filter(v => VB.cfg.ocultos.includes(v.src));
  const n = c => L.filter(v => v.cat === c).length;
  const vis = VB.cat === "Apagados" ? apagados : VB.cat === "Todas" ? L : L.filter(v => v.cat === VB.cat);
  const sel = (EST.todos || []).find(v => v.src === EST.video);
  return `<div class="vb-top"><b>1. Vídeo</b><label class="bt sm pri vb-subir">＋ Subir vídeos<input type="file" accept="video/*,.mov,.mp4,.m4v,.avi,.mkv,.webm" id="est-file" multiple hidden></label></div>
    <div class="vb-cats">${["Todas", ...cats].map(c => `<button class="vb-cat ${VB.cat === c ? "on" : ""}" data-act="vbcat" data-c="${esc(c)}">${esc(c)} <small>${c === "Todas" ? L.length : n(c)}</small></button>`).join("")}${apagados.length ? `<button class="vb-cat ${VB.cat === "Apagados" ? "on" : ""}" data-act="vbcat" data-c="Apagados">🗑️ Apagados <small>${apagados.length}</small></button>` : ""}</div>
    ${VB.pend.length ? `<div class="vb-pend">⏳ Preparando ${VB.pend.length} vídeo${VB.pend.length > 1 ? "s" : ""} pro formato Reels (${VB.pend.map(p => esc(p.cat)).join(", ")}). Leva de 1 a 3 minutos e aparece aqui sozinho.</div>` : ""}
    ${(VB.erros || []).length ? `<div class="vb-pend erro">⚠️ Não consegui converter: ${VB.erros.map(e => esc(e.nome || e.id)).join(", ")}. Tente outro arquivo ou um trecho menor.</div>` : ""}
    <div class="est-vids">${vis.map(v => `<button class="est-vid ${v.src === EST.video ? "on" : ""}" data-act="estvid" data-src="${esc(v.src)}" data-poster="${esc(v.poster)}" data-nome="${esc(v.nome)}" style="background-image:url(${esc(v.poster)})">${v.meu ? `<span class="vb-meu">seu</span>` : ""}</button>`).join("") || `<div class="vazio" style="grid-column:1/-1">Nenhum vídeo em ${esc(VB.cat)} ainda. Toque em ＋ Subir vídeos.</div>`}</div>
    ${sel ? `<div class="vb-sel"><small>Selecionado:</small><select data-act="vbmover">${cats.map(c => `<option ${c === sel.cat ? "selected" : ""}>${esc(c)}</option>`).join("")}<option value="__nova">+ Nova categoria…</option></select>
      ${VB.cfg.ocultos.includes(sel.src) ? `<button class="bt sm" data-act="vbvolta">↩ Recuperar</button>` : `<button class="bt sm ghost" data-act="vbapaga">🗑️ Apagar</button>`}</div>` : ""}`;
}
async function vbSalvarCfg(msg) { if (!token()) { toast("Conecte o token do GitHub em Ajustes pra salvar."); return; } try { await salvarArquivo("docs/videos_cfg.json", VB.cfg, msg); } catch (e) { toast("Não salvou: " + e.message); } }
document.addEventListener("click", async e => { const b = e.target.closest('[data-act^="vb"]'); if (!b) return; const a = b.dataset.act;
  if (a === "vbcat") { VB.cat = b.dataset.c; try { localStorage.setItem("p085_vb_cat", VB.cat); } catch (x) { } render(); }
  else if (a === "vbapaga") { VB.cfg.ocultos = [...new Set([...VB.cfg.ocultos, EST.video])]; EST.lista = EST.todos.filter(v => !VB.cfg.ocultos.includes(v.src)); const p = EST.lista[0]; if (p) { EST.video = p.src; EST.poster = p.poster; EST.nome = p.nome; } estGuardar(); render(); toast("Apagado. Se mudar de ideia, está em 🗑️ Apagados."); vbSalvarCfg("Reels: apaga vídeo"); }
  else if (a === "vbvolta") { VB.cfg.ocultos = VB.cfg.ocultos.filter(x => x !== EST.video); EST.lista = EST.todos.filter(v => !VB.cfg.ocultos.includes(v.src)); render(); vbSalvarCfg("Reels: recupera vídeo"); }
  else if (a === "vbenviar") vbEnviar(b);
  else if (a === "vbfechar") { const d = document.getElementById("vbm"); if (d) d.remove(); document.body.classList.remove("ej-on"); }
  else if (a === "vbmodo") { document.querySelectorAll('[data-act="vbmodo"]').forEach(x => x.classList.toggle("on", x === b)); VB.modo = b.dataset.m; document.getElementById("vb-foco").hidden = VB.modo !== "cortar"; vbPrevias(); }
  else if (a === "vbfoco") { document.querySelectorAll('[data-act="vbfoco"]').forEach(x => x.classList.toggle("on", x === b)); VB.foco = +b.dataset.f; vbPrevias(); }
  else if (a === "vbcatenv") { document.querySelectorAll('[data-act="vbcatenv"]').forEach(x => x.classList.toggle("on", x === b)); VB.catEnv = b.dataset.c; const i = document.getElementById("vb-nova"); if (i) i.value = ""; }
});
document.addEventListener("change", async e => { const t = e.target; if (t.dataset.act !== "vbmover") return; let c = t.value;
  if (c === "__nova") { c = (prompt("Nome da nova categoria (ex.: Jericoacoara, Lisboa, Pôr do sol):") || "").trim(); if (!c) { render(); return; } }
  VB.cfg.cats[EST.video] = c; EST.todos.forEach(v => { if (v.src === EST.video) v.cat = c; }); EST.lista.forEach(v => { if (v.src === EST.video) v.cat = c; }); render(); toast(`Movido pra ${c}.`); vbSalvarCfg("Reels: categoria do vídeo"); });

/* janela de envio: escolhe a categoria e como adaptar pro Reels (vertical 9:16) */
function vbAbrirEnvio(files) {
  if (!token()) { toast("Conecte o token do GitHub em Ajustes pra salvar seus vídeos."); return; }
  VB.files = files; VB.modo = VB.modo || "cortar"; VB.foco = VB.foco ?? .5; VB.catEnv = VB.cat !== "Todas" && VB.cat !== "Apagados" ? VB.cat : "";
  const d = document.createElement("div"); d.className = "ej-fundo"; d.id = "vbm";
  d.innerHTML = `<div class="ej vb-ej" role="dialog"><div class="ej-h"><div><b>Subir ${files.length} vídeo${files.length > 1 ? "s" : ""}</b><small>Eu adapto pro formato do Reels (vertical) e deixo salvo no seu banco.</small></div><button class="bt sm ghost" data-act="vbfechar">✕</button></div>
    <div class="field"><label>Pra qual categoria?</label><div class="vb-cats">${vbCats().map(c => `<button class="vb-cat ${VB.catEnv === c ? "on" : ""}" data-act="vbcatenv" data-c="${esc(c)}">${esc(c)}</button>`).join("")}</div>
      <input id="vb-nova" placeholder="ou crie uma nova: Jericoacoara, Lisboa, Pôr do sol…" style="margin-top:8px"></div>
    <div class="field"><label>Vídeo deitado (horizontal): como fica no Reels?</label><div class="vb-cats">
      <button class="vb-cat ${VB.modo === "cortar" ? "on" : ""}" data-act="vbmodo" data-m="cortar">✂️ Preencher a tela (corta as laterais)</button>
      <button class="vb-cat ${VB.modo === "fundo" ? "on" : ""}" data-act="vbmodo" data-m="fundo">🖼️ Vídeo inteiro com fundo desfocado</button></div>
      <div class="vb-cats" id="vb-foco" ${VB.modo !== "cortar" ? "hidden" : ""} style="margin-top:6px"><small style="align-self:center;opacity:.7">Manter qual parte?</small>${[[0, "⬅ Esquerda"], [.5, "Meio"], [1, "Direita ➡"]].map(([f, l]) => `<button class="vb-cat ${VB.foco === f ? "on" : ""}" data-act="vbfoco" data-f="${f}">${l}</button>`).join("")}</div>
      <small class="sub">Vídeo que já é em pé fica igual nos dois modos.</small></div>
    <div class="vb-lista">${files.map((f, i) => `<div class="vb-item" id="vb-i-${i}"><div class="vb-prev"><video muted playsinline preload="metadata" id="vb-v-${i}"></video><canvas width="108" height="192" id="vb-c-${i}"></canvas></div>
      <div class="vb-inf"><b>${esc(f.name)}</b><small>${(f.size / 1e6).toFixed(1)} MB</small>
        <div class="vb-tr"><label>Começa em <input type="number" min="0" step="1" value="0" id="vb-ini-${i}">s</label><label>Duração <input type="number" min="3" max="30" step="1" value="15" id="vb-dur-${i}">s</label></div>
        <small class="vb-st" id="vb-st-${i}"></small></div></div>`).join("")}</div>
    <div class="ej-acts"><button class="bt pri lg" data-act="vbenviar">Enviar e salvar</button><button class="bt ghost" data-act="vbfechar">Cancelar</button></div></div>`;
  document.body.appendChild(d); document.body.classList.add("ej-on");
  files.forEach((f, i) => { const v = document.getElementById("vb-v-" + i); v.src = URL.createObjectURL(f); v.onloadeddata = () => { try { v.currentTime = Math.min(1, (v.duration || 2) / 2); } catch (x) { } }; v.onseeked = () => vbPrevia(i);
    v.onloadedmetadata = () => { const st = document.getElementById("vb-st-" + i); if (st) st.textContent = v.videoWidth ? `${v.videoWidth}×${v.videoHeight}${v.videoWidth > v.videoHeight ? " · deitado" : " · em pé"} · ${Math.round(v.duration || 0)}s` : "formato que o navegador não mostra, mas eu converto mesmo assim"; }; });
}
function vbPrevia(i) { const v = document.getElementById("vb-v-" + i), cv = document.getElementById("vb-c-" + i); if (!v || !cv || !v.videoWidth) return; const c = cv.getContext("2d"), W = cv.width, H = cv.height, vw = v.videoWidth, vh = v.videoHeight;
  c.fillStyle = "#000"; c.fillRect(0, 0, W, H);
  if (VB.modo === "fundo") { const s = Math.max(W / vw, H / vh); c.filter = "blur(6px) brightness(.85)"; c.drawImage(v, (W - vw * s) / 2, (H - vh * s) / 2, vw * s, vh * s); c.filter = "none"; const s2 = Math.min(W / vw, H / vh); c.drawImage(v, (W - vw * s2) / 2, (H - vh * s2) / 2, vw * s2, vh * s2); }
  else { const s = Math.max(W / vw, H / vh); c.drawImage(v, (W - vw * s) * VB.foco, (H - vh * s) / 2, vw * s, vh * s); } }
function vbPrevias() { (VB.files || []).forEach((f, i) => vbPrevia(i)); }
async function vbEnviar(b) {
  const nova = (document.getElementById("vb-nova") || {}).value.trim(), cat = nova || VB.catEnv;
  if (!cat) { toast("Escolha a categoria (ou digite uma nova)."); return; }
  b.disabled = true; let ok = 0;
  for (const [i, f] of VB.files.entries()) { const st = document.getElementById("vb-st-" + i);
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5); let ext = ((f.name.match(/\.(\w{2,4})$/) || [])[1] || "mp4").toLowerCase();
    const ini = +document.getElementById("vb-ini-" + i).value || 0, dur = Math.min(30, Math.max(3, +document.getElementById("vb-dur-" + i).value || 15));
    try { b.textContent = `Preparando ${i + 1}/${VB.files.length}…`;
      // 1º tenta adaptar aqui mesmo (corta/encaixa no 9:16 e já sai leve). Se o navegador não ler o formato, manda o original.
      let blob = null, modo = VB.modo; const v = document.getElementById("vb-v-" + i);
      if (v && v.videoWidth && window.MediaRecorder) { try { blob = await vbGravar(v, ini, dur, t => { st.textContent = `Adaptando pro Reels… ${t}/${Math.round(dur)}s (deixe esta aba aberta)`; }); if (blob) { ext = blob.type.includes("mp4") ? "mp4" : "webm"; modo = "pronto"; } } catch (x) { blob = null; } }
      if (!blob) { if (f.size > 45e6) { st.innerHTML = `<span class="neg">esse formato eu só consigo mandar inteiro, e ele passa de 45 MB. Corte um trecho no celular e tente de novo.</span>`; continue; } blob = f; }
      st.textContent = `Enviando ${(blob.size / 1e6).toFixed(1)} MB… (não feche a página)`;
      const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(blob); });
      await gh(`/contents/brutos/${id}.${ext}`, { method: "PUT", body: JSON.stringify({ message: "Reels: vídeo enviado", content: b64, branch: "main" }) });
      const job = { id, cat, nome: f.name.replace(/\.\w+$/, ""), modo, foco: VB.foco, inicio: modo === "pronto" ? 0 : ini, dur };
      await gh(`/contents/brutos/${id}.json`, { method: "PUT", body: JSON.stringify({ message: "Reels: vídeo enviado", content: btoa(unescape(encodeURIComponent(JSON.stringify(job)))), branch: "main" }) });
      VB.pend.push({ id, cat, t: Date.now() }); vbGuardarPend(); ok++; st.innerHTML = `<span class="pos">✓ enviado</span>`;
    } catch (e) { st.innerHTML = `<span class="neg">falhou: ${esc(e.message)}</span>`; } }
  if (ok) { try { await gh("/actions/workflows/midia-up.yml/dispatches", { method: "POST", body: JSON.stringify({ ref: "main" }) }); } catch (e) { toast("Enviado, mas não consegui iniciar a conversão: " + e.message, 7000); } }
  b.disabled = false; b.textContent = "Enviar e salvar";
  if (ok) { VB.cat = cat; try { localStorage.setItem("p085_vb_cat", cat); } catch (x) { } setTimeout(() => { const d = document.getElementById("vbm"); if (d) d.remove(); document.body.classList.remove("ej-on"); render(); }, 900);
    toast(`${ok} vídeo${ok > 1 ? "s" : ""} enviado${ok > 1 ? "s" : ""}! Em 1 a 3 minutos aparece${ok > 1 ? "m" : ""} em ${cat}, já no formato Reels.`, 7000); vbVigiar(); }
}
/* fica de olho até os vídeos convertidos aparecerem */
let vbTimer = null;
function vbVigiar() { clearTimeout(vbTimer); if (!VB.pend.length) return;
  vbTimer = setTimeout(async () => { const antes = VB.pend.length; await vbCarregar(); if (VB.pend.length < antes && /#estudio/.test(location.hash) && !document.getElementById("vbm")) { render(); toast("Vídeo novo pronto no seu banco! 🎬"); } vbVigiar(); }, 25000); }
if (VB.pend.length) setTimeout(vbVigiar, 3000);

/* grava o trecho escolhido já no formato Reels (1080x1920), direto no navegador */
async function vbGravar(v, ini, dur, prog) {
  const mime = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find(m => MediaRecorder.isTypeSupported(m)); if (!mime) return null;
  const W = 1080, H = 1920, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const c = cv.getContext("2d"), vw = v.videoWidth, vh = v.videoHeight;
  const quadro = () => { c.fillStyle = "#000"; c.fillRect(0, 0, W, H);
    if (VB.modo === "fundo" && vw > vh * .7) { const s = Math.max(W / vw, H / vh); c.filter = "blur(40px) brightness(.8)"; c.drawImage(v, (W - vw * s) / 2, (H - vh * s) / 2, vw * s, vh * s); c.filter = "none"; const s2 = Math.min(W / vw, H / vh); c.drawImage(v, (W - vw * s2) / 2, (H - vh * s2) / 2, vw * s2, vh * s2); }
    else { const s = Math.max(W / vw, H / vh); c.drawImage(v, (W - vw * s) * VB.foco, (H - vh * s) / 2, vw * s, vh * s); } };
  v.muted = true; v.loop = false; v.currentTime = Math.min(ini, Math.max(0, (v.duration || ini + 1) - 1)); await new Promise(r => { v.onseeked = r; setTimeout(r, 1500); });
  const fim = Math.min(v.duration || ini + dur, ini + dur), rec = new MediaRecorder(cv.captureStream(30), { mimeType: mime, videoBitsPerSecond: 7e6 }), partes = [];
  rec.ondataavailable = e => e.data.size && partes.push(e.data); quadro(); rec.start(250); await v.play();
  await new Promise(ok => { const passo = () => { quadro(); prog(Math.round(v.currentTime - ini)); if (v.currentTime >= fim || v.ended) return ok(); requestAnimationFrame(passo); }; passo(); });
  v.pause(); rec.stop(); await new Promise(r => rec.onstop = r);
  const blob = new Blob(partes, { type: mime.split(";")[0] }); return blob.size > 50e3 ? blob : null;
}

function estAbas(cur) { return `<div class="est-abas">${[["estudio", "🎬 Reels"], ["carrossel", "🖼️ Carrosséis"]].map(([k, n]) => `<a href="#${k}" class="pill ${cur === k ? "on" : ""}">${n}</a>`).join("")}</div>`; }
