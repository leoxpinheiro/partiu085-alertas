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
  if (!EST.lista) { const m = await getJSON("midia.json", { videos: {} }); EST.lista = Object.entries(m.videos || {}).flatMap(([k, L]) => L.filter(v => /clip-/.test(v.arq)).map(v => ({ src: v.arq, poster: v.quadro || "", nome: k.replace("v-", "") })));
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
/* olho de peixe "vetorial": cada letra é desenhada nítida, maior no centro e menor nas bordas (lente suave), sem distorcer pixels */
function textoOlho(c, W, H, linhas, fonte, fs, lh, yCentro, cor, sombra, forca) {
  const a = Math.max(0, Math.min(100, forca || 0)) / 100, ls = parseFloat(c.letterSpacing) || 0;
  const fam = fonte.replace(/^.*?\d+(\.\d+)?px\s*/, ""), peso = (fonte.match(/^(\d{3}|bold|normal)/) || ["400"])[0];
  const F = sz => `${peso} ${sz}px ${fam}`;
  c.save(); c.font = F(fs); if ("letterSpacing" in c) c.letterSpacing = "0px";
  const L = linhas.map(l => { const ch = Array.from(l); return { ch, w: ch.map(x => c.measureText(x).width + ls) }; });
  const maxW = Math.max(1, ...L.map(l => l.w.reduce((p, q) => p + q, 0))), n = L.length, meiaA = n * lh / 2 + fs * .25;
  const esc = (nx, ny) => (1 - a * .38) + a * 1.05 * Math.exp(-(nx * nx * 1.5 + ny * ny * 1.9)); // centro até ~1.7x, bordas ~0.6x
  L.forEach((l, j) => { const tot = l.w.reduce((p, q) => p + q, 0), yc = yCentro - n * lh / 2 + lh * (j + .5); let x = W / 2 - tot / 2;
    l.s = l.w.map(w => { const cx = x + w / 2; x += w; return esc((cx - W / 2) / (maxW / 2), (yc - yCentro) / meiaA); });
    l.h = lh * l.s.reduce((p, q) => p + q, 0) / Math.max(1, l.s.length); });
  const larga = Math.max(...L.map(l => l.w.reduce((p, w, k) => p + w * l.s[k], 0))), kf = Math.min(1, W * .92 / larga); // nunca sai da tela
  if (kf < 1) L.forEach(l => { l.s = l.s.map(v => v * kf); l.h *= kf; });
  const altura = L.reduce((p, l) => p + l.h, 0); let y = yCentro - altura / 2;
  if (sombra) { c.shadowColor = "rgba(0,0,0,.5)"; c.shadowBlur = 22 * W / 1080; }
  c.fillStyle = cor; c.textAlign = "left"; c.textBaseline = "alphabetic";
  L.forEach(l => { const tot = l.w.reduce((p, w, k) => p + w * l.s[k], 0); let x = W / 2 - tot / 2; const meio = y + l.h / 2;
    l.ch.forEach((ch, k) => { const s = l.s[k], sz = fs * s; c.font = F(sz); c.fillText(ch, x + ls * s / 2, meio + sz * .3); x += l.w[k] * s; });
    y += l.h; });
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
  return head("🎬 Reels", "Crie no editor, aprove os prontos e vá postando. Tudo de Reels fica aqui.") +
    `<div class="est">
      <div class="est-prev"><div class="est-tela"><video id="est-v" src="${esc(EST.video)}" poster="${esc(EST.poster)}" autoplay muted loop playsinline></video><canvas id="est-cv" width="540" height="960"></canvas></div>
        <small class="sub">${EST.arquivo ? "Seu vídeo" : esc(EST.nome)} · a prévia roda em loop, sem som</small></div>
      <div class="est-ctl">
        <div class="card"><b>1. Vídeo</b><div class="est-vids">${(EST.lista || []).map(v => `<button class="est-vid ${v.src === EST.video ? "on" : ""}" data-act="estvid" data-src="${esc(v.src)}" data-poster="${esc(v.poster)}" data-nome="${esc(v.nome)}" style="background-image:url(${esc(v.poster)})"></button>`).join("")}
          <label class="est-vid est-up">＋<small>seu vídeo</small><input type="file" accept="video/*" id="est-file" hidden></label></div></div>
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
  if (t.id === "est-file" && t.files[0]) { EST.arquivo = t.files[0]; EST.video = URL.createObjectURL(t.files[0]); EST.poster = ""; render(); }
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
