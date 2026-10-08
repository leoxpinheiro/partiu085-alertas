/* Radar Partiu085 — Modo envio: um alerta por vez, com o texto exato que vai ser copiado. */
"use strict";
const EV = { i: 0, promos: false, ultimo: null };
try { EV.promos = localStorage.getItem("p085_env_promos") === "1"; } catch (e) { }

function filaModoEnvio() {
  const F = filaEnvio().filter(f => EV.promos || f.tipo !== "promo");
  return F.sort((x, y) => (y.s ?? -1) - (x.s ?? -1) || y.q.localeCompare(x.q));
}

/* ---------- Agenda de envios: horários fixos, mais forte seg–qua (quando saem as promoções) */
const AGENDA_PADRAO = { agenda_forte: "09:00x3, 13:00x3, 19:00x3", agenda_medio: "09:00x2, 13:00x2, 19:00x2", agenda_fds: "10:00x1, 18:00x2" };
const DIA_NOME = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
function tipoDia(d = new Date()) { const w = d.getDay(); return w >= 1 && w <= 3 ? "forte" : w >= 4 && w <= 5 ? "medio" : "fds"; }
function lerAgenda(txt) { return String(txt || "").split(/[,;\n]+/).map(x => x.trim().match(/^(\d{1,2})(?:[:h](\d{2}))?\s*[x×]\s*(\d+)$/i)).filter(Boolean).map(m => ({ min: +m[1] * 60 + (+m[2] || 0), n: +m[3], rot: `${m[1].padStart(2, "0")}h${m[2] && m[2] !== "00" ? m[2] : ""}` })).sort((a, b) => a.min - b.min); }
function agendaHoje() {
  const k = "agenda_" + tipoDia(), aj = S.ajustes || {}, slots = lerAgenda(aj[k] || AGENDA_PADRAO[k]);
  const hoje = new Date().toDateString(), agora = new Date().getHours() * 60 + new Date().getMinutes();
  slots.forEach(s => s.feitos = 0);
  Object.values(S.marcados || {}).forEach(v => { if (!v || v === "descartado") return; const d = new Date(v); if (d.toDateString() !== hoje) return;
    const m = d.getHours() * 60 + d.getMinutes(); let i = slots.length - 1; while (i > 0 && slots[i].min > m) i--; if (slots[i]) slots[i].feitos++; });
  let atual = -1; slots.forEach((s, i) => { if (s.min <= agora + 30) atual = i; });
  return { slots, atual, tipo: tipoDia(), meta: slots.reduce((t, s) => t + s.n, 0), feitos: slots.reduce((t, s) => t + s.feitos, 0) };
}
function agendaHTML(qtdFila) {
  const A = agendaHoje(); if (!A.slots.length) return "";
  const dica = { forte: "dia forte: é quando as companhias soltam promoção", medio: "dia médio de promoções", fds: "fim de semana: pouca promoção nova, vale repescagem e Top 5" }[A.tipo];
  const s = A.slots[A.atual], falta = s ? Math.max(0, s.n - s.feitos) : 0;
  let msg = A.atual < 0 ? `Primeiro envio às ${A.slots[0].rot}.` : falta ? `Agora: faltam <b>${falta}</b> no envio das ${s.rot}.` : A.slots[A.atual + 1] ? `Envio das ${s.rot} feito ✓ Próximo às ${A.slots[A.atual + 1].rot}.` : "Agenda de hoje completa ✓";
  if (falta && !qtdFila) msg += ` Sem alerta na fila: mande o <b>Top 5 do dia</b> abaixo.`;
  return `<div class="ag card"><div class="ag-h"><div><b>Agenda de hoje · ${DIA_NOME[new Date().getDay()]}</b><small>${dica} · <a href="#ajustes">mudar horários</a></small></div><span class="ag-tot">${A.feitos}/${A.meta} enviados</span></div>
    <div class="ag-s">${A.slots.map((x, i) => `<span class="ag-i ${x.feitos >= x.n ? "ok" : i === A.atual ? "agora" : i < A.atual ? "atras" : ""}"><b>${x.rot}</b>${x.feitos}/${x.n}${x.feitos >= x.n ? " ✓" : i === A.atual ? " · agora" : ""}</span>`).join("")}</div>
    <div class="ag-msg">${msg}</div></div>`;
}
function agendaAjustesHTML() {
  const a = S.ajustes || {}, f = (k, t) => `<div class="field"><label>${t}</label><input data-aj="${k}" value="${esc(a[k] ?? AGENDA_PADRAO[k])}" placeholder="${AGENDA_PADRAO[k]}"></div>`;
  return `<div class="card" style="margin-bottom:14px"><h3>Agenda de envios</h3><div class="desc">Horários fixos pro grupo criar o hábito. Formato: <code>09:00x3, 13:00x3</code> (horário x quantidade). Aparece no Modo envio e no Início.</div>
    <div class="form">${f("agenda_forte", "Segunda a quarta (dias fortes)")}${f("agenda_medio", "Quinta e sexta")}${f("agenda_fds", "Sábado e domingo")}</div></div>`;
}

/* ---------- Top 5 do dia: os destinos mais baratos em relação à média, a partir do nosso banco */
function top5() {
  const R = (S.status && S.status.rotas) || {}, lim = Date.now() - 30 * 36e5;
  return Object.entries(R).filter(([, v]) => v.menor && v.mediana && v.quando && new Date(v.quando).getTime() > lim && 1 - v.menor / v.mediana >= .2 && v.menor <= (v.tipo === "internacional" ? 4000 : 1200))
    .map(([k, v]) => ({ k, nome: v.nome || IATA[k] || k, menor: v.menor, d: 1 - v.menor / v.mediana, mes: (v.dia_menor || v.melhor_mes || "").slice(5, 7), intl: v.tipo === "internacional" }))
    .sort((a, b) => b.d - a.d).slice(0, 5);
}
function textoTop5(L) {
  const n = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"], d = hojeISO();
  const t = ["🏆 *TOP 5 DO DIA*", "_Os destinos mais abaixo do preço normal, saindo de Fortaleza_", `_${d.slice(8, 10)}/${d.slice(5, 7)} · preço por trecho, só a ida_`, "",
    ...L.map((x, i) => `${n[i]} *${x.nome}* · *${brl(x.menor)}*${x.mes ? ` (${MESES[+x.mes - 1].toLowerCase()})` : ""}`),
    "", "👉 _Quer as datas de algum? Responde aqui o número._", "", (S.ajustes || {}).aviso_preco ?? AVISO_PADRAO].join("\n");
  return textoFinal(t, "dinheiro");
}
async function desenharTop5(cv, L) {
  const W = 1080, H = 1080, c = cv.getContext("2d"); cv.width = W; cv.height = H;
  try { await Promise.all([document.fonts.load('120px "Anton"'), document.fonts.load('700 40px "Plus Jakarta Sans"')]); } catch (e) { }
  const NAVY = "#0F2A47", AM = MARCA.amarelo, J = MARCA.corpo, A = MARCA.titulo;
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#14365C"); g.addColorStop(1, NAVY); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.textBaseline = "middle"; const ico = img("icone");
  c.beginPath(); c.arc(106, 100, 50, 0, Math.PI * 2); c.fillStyle = AM; c.fill();
  if (ico.complete && ico.naturalWidth) { c.save(); c.beginPath(); c.arc(106, 100, 44, 0, Math.PI * 2); c.clip(); c.drawImage(ico, 62, 56, 88, 88); c.restore(); }
  c.fillStyle = "#fff"; c.font = `46px ${A}`; c.fillText("PARTIU 085", 172, 88); c.font = `700 22px ${J}`; c.fillStyle = "rgba(255,255,255,.85)"; c.fillText("@partiu.085", 174, 124);
  const d = hojeISO(), dt = `${d.slice(8, 10)}/${d.slice(5, 7)}`; c.font = `800 26px ${J}`; const ew = c.measureText(dt).width + 48;
  rr(c, W - 60 - ew, 72, ew, 56, 28); c.fillStyle = AM; c.fill(); c.fillStyle = NAVY; c.textAlign = "center"; c.fillText(dt, W - 60 - ew / 2, 101); c.textAlign = "left";
  c.textBaseline = "alphabetic"; c.fillStyle = AM; c.font = `150px ${A}`; c.fillText("TOP 5 DO DIA", 60, 330);
  c.fillStyle = "#fff"; c.font = `700 32px ${J}`; c.fillText("os mais abaixo do preço normal, saindo de Fortaleza", 64, 385);
  const y0 = 440, rh = 112;
  L.forEach((x, i) => { const y = y0 + i * rh;
    rr(c, 60, y, W - 120, rh - 16, 24); c.fillStyle = i === 0 ? "rgba(255,200,0,.16)" : "rgba(255,255,255,.07)"; c.fill();
    c.beginPath(); c.arc(116, y + (rh - 16) / 2, 30, 0, Math.PI * 2); c.fillStyle = AM; c.fill();
    c.fillStyle = NAVY; c.font = `44px ${A}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(i + 1), 116, y + (rh - 16) / 2 + 2); c.textAlign = "left";
    c.fillStyle = "#fff"; c.font = `${caberR(c, x.nome.toUpperCase(), 52, 32, 470, t => `${t}px ${A}`)}px ${A}`; c.fillText(x.nome.toUpperCase(), 170, y + 36);
    const rf = (typeof refDe === "function" && refDe(x.k) || {}).curta; c.font = `600 22px ${J}`; c.fillStyle = "rgba(255,255,255,.65)";
    c.fillText([x.mes ? "melhor em " + MESES[+x.mes - 1].toLowerCase() : "", rf || (x.intl ? "internacional" : "")].filter(Boolean).join(" · "), 172, y + 70);
    c.textAlign = "right"; c.fillStyle = AM; c.font = `58px ${A}`; c.fillText(brl(x.menor), W - 96, y + 42);
    c.font = `700 20px ${J}`; c.fillStyle = "rgba(255,255,255,.75)"; c.fillText("o trecho", W - 96, y + 72); c.textAlign = "left"; c.textBaseline = "alphabetic"; });
  c.font = `600 22px ${J}`; c.fillStyle = "rgba(255,255,255,.55)"; c.textAlign = "center"; c.fillText("Preços de hoje no radar do Partiu 085 · podem mudar a qualquer momento", W / 2, H - 40); c.textAlign = "left";
}
function top5HTML(aberto) {
  const L = top5(), id = "top5-" + hojeISO(), env = S.marcados && S.marcados[id];
  if (L.length < 3) return `<div class="card ev-top5 sub">Top 5 do dia: ainda poucos destinos com preço bom hoje (${L.length}). Aparece aqui sozinho depois das próximas rodadas.</div>`;
  return `<details class="card ev-top5" ${aberto && !env ? "open" : ""}><summary><span>🏆 <b>Post do dia: Top 5 saindo de Fortaleza</b><small>${env ? "✓ já enviado hoje" : "ótimo pra fim de semana e pra horário sem alerta novo"}</small></span><span class="mapa-seta">▾</span></summary>
    <div class="ev-grid"><div><textarea class="ev-texto" id="t5-texto" spellcheck="false">${esc(textoTop5(L))}</textarea></div>
      <div class="ev-img"><canvas id="t5-cv"></canvas></div></div>
    <div class="ev-acts"><button class="bt pri" data-act="t5img"><span class="ej-n">1</span>Copiar imagem</button><button class="bt" data-act="t5txt"><span class="ej-n">2</span>Copiar texto</button>
      ${typeof navigator.share === "function" ? `<button class="bt" data-act="t5share">${ic("send")}Compartilhar</button>` : ""}<button class="bt ghost" data-act="t5baixar">${ic("down")}Baixar</button></div></details>`;
}
function desenharTop5Pagina() { const cv = document.getElementById("t5-cv"); if (cv && !cv.dataset.ok) { cv.dataset.ok = 1; desenharTop5(cv, top5()); } }
document.addEventListener("toggle", e => { if (e.target.classList && e.target.classList.contains("ev-top5") && e.target.open) desenharTop5Pagina(); }, true);
document.addEventListener("click", async e => {
  const b = e.target.closest('[data-act^="t5"]'); if (!b) return;
  const cv = $("#t5-cv"), txt = ($("#t5-texto") || {}).value || "", id = "top5-" + hojeISO(), act = b.dataset.act;
  const blob = () => new Promise(ok => cv.toBlob(ok, "image/png"));
  if (act === "t5img") { try { await navigator.clipboard.write([new ClipboardItem({ "image/png": await blob() })]); toast("① Imagem copiada. Cole no WhatsApp e depois copie o texto."); } catch (x) { toast("O navegador não deixou copiar a imagem. Use Baixar."); } }
  else if (act === "t5txt") { await copiar(txt); marcar(id, true); toast("② Texto copiado. Top 5 marcado como enviado."); }
  else if (act === "t5baixar") { const a = document.createElement("a"); a.download = `top5-${hojeISO()}.png`; a.href = cv.toDataURL("image/png"); a.click(); }
  else if (act === "t5share") { try { const arq = new File([await blob()], "top5-085.png", { type: "image/png" }); await navigator.share(navigator.canShare && navigator.canShare({ files: [arq] }) ? { files: [arq], text: txt } : { text: txt }); marcar(id, true); render(); } catch (x) { } }
});
function evFonte(f) { return f && (S.alertas.find(a => a.id === f.id) || ((S.mi && S.mi.ofertas) || []).find(o => o.id === f.id)); }
async function evImagem() { const F = filaModoEnvio(), f = F[EV.i], cv = document.getElementById("ev-cv"), d = cardDeAlerta(evFonte(f)); if (cv && d) await desenharResgate(cv, d); return cv; }
function evTira(F) {
  const hj = hojeISO(), grupos = [["Hoje", F.map((f, i) => [f, i]).filter(([f]) => f.q.slice(0, 10) === hj)], ["Ontem e antes", F.map((f, i) => [f, i]).filter(([f]) => f.q.slice(0, 10) !== hj)]].filter(g => g[1].length);
  const mini = ([f, i]) => { const x = evFonte(f) || {}, ia = x.destino || x.iata || "";
    return `<button class="ev-mini ${i === EV.i ? "on" : ""}" data-act="evir" data-i="${i}" style="--c:${f.cor}" title="${esc(f.t)} · ${esc(f.v)}">
      <span class="ev-mini-f" style="${ia ? `background-image:url(fotos/${ia}.jpg)` : ""}"></span><span class="ev-mini-t"><b>${esc(f.t)}</b><small>${esc(String(f.v).replace(/ o trecho$/, ""))}</small></span></button>`; };
  return `<div class="ev-tira">${grupos.map(([n, L]) => `<div class="ev-tira-g"><span class="micro">${n} · ${L.length}</span><div class="ev-tira-l">${L.map(mini).join("")}</div></div>`).join("")}</div>`;
}
function pEnviar() {
  carregarMilhas();
  const F = filaModoEnvio();
  setTimeout(desenharTop5Pagina, 0);
  if (EV.i >= F.length) EV.i = Math.max(0, F.length - 1);
  const f = F[EV.i];
  const tot = F.length;
  const ult = EV.ultimo ? `<div class="ev-ult">${ic("check", "i sm")}Último copiado: <b>${esc(EV.ultimo)}</b></div>` : "";
  const topo = head("Modo envio", "Um alerta por vez. Você vê o texto exato, copia (ou compartilha) e já vai pro próximo. Alertas cujo preço subiu não aparecem aqui.") +
    agendaHTML(F.length) + top5HTML(!F.length || tipoDia() === "fds") +
    `<div class="ev-bar"><label class="chk"><input type="checkbox" data-ev-promos ${EV.promos ? "checked" : ""}> Incluir promoções de milhas</label><span class="sub">Ordem: as melhores ofertas primeiro</span>${ult}</div>`;
  if (!f) return topo + `<div class="card ev-fim"><div class="ev-fim-i">🎉</div><h3>Tudo enviado</h3><p class="desc">Não tem nada pendente de ontem e hoje. Os próximos alertas aparecem aqui sozinhos.</p><div class="al-acts"><a class="bt" href="#alertas">${ic("bell")}Ver todos os alertas</a></div></div>`;
  const pode = typeof navigator.share === "function";
  return topo + `
    <div class="ev-prog"><span>Faltam ${tot} pra enviar · vendo o ${EV.i + 1}º</span></div>
    ${evTira(F)}
    <div class="card ev-card" style="--c:${f.cor}">
      <div class="ev-h"><span class="fila-tag">${esc(f.rot)}</span>${EV.i === 0 && f.s != null ? `<span class="tag ok-t">melhor da fila</span>` : ""}<div><b>${esc(f.t)}</b><small>${esc(f.v)}${f.d ? ` · ${f.d}` : ""} · achado ${f.q.slice(0, 10) === hojeISO() ? "hoje" : "ontem"} às ${f.q.slice(11, 16)}</small></div></div>
      <div class="ev-grid"><div><textarea class="ev-texto" id="ev-texto" spellcheck="false" title="Pode editar antes de copiar">${esc(f.texto)}</textarea><div class="sub" style="margin-top:6px">Dá pra editar o texto antes de copiar. Vale só pra este envio.</div></div>
        ${cardDeAlerta(evFonte(f)) ? `<div class="ev-img"><canvas id="ev-cv"></canvas><div class="al-acts"><button class="bt sm" data-act="evcopimg">${ic("copy")}Copiar imagem</button><button class="bt sm ghost" data-act="evbaixar">${ic("down")}Baixar</button></div></div>` : ""}</div>
      <div class="ev-acts">
        <button class="bt pri lg" data-act="evcopiar">${ic("copy")}Copiar e ir pro próximo</button>
        ${pode ? `<button class="bt lg" data-act="evshare">${ic("send")}Compartilhar (imagem + texto)</button>` : `<a class="bt lg zap" target="_blank" rel="noopener" data-act="evzap" href="https://api.whatsapp.com/send?text=${encodeURIComponent(f.texto || "")}">${ic("send")}Abrir no WhatsApp</a>`}
      </div>
      <div class="ev-acts sec">
        <button class="bt sm ghost" data-act="evvoltar" ${EV.i ? "" : "disabled"}>← Anterior</button>
        <button class="bt sm ghost" data-act="evpular">Pular →</button>
        <button class="bt sm ghost danger" data-act="evacabou">Já acabou / não enviar</button>
        <a class="bt sm ghost" href="${f.link}">${ic("ext")}Abrir na página</a>
      </div>
    </div>`;
}
async function evConcluir(f, msg) {
  marcar(f.id, true); EV.ultimo = `${f.t} · ${f.v}`;
  toast(msg || `Copiado: ${f.t} · ${f.v}`, 3000); render();
}
document.addEventListener("click", async e => {
  const b = e.target.closest('[data-act^="ev"]'); if (!b) return;
  const F = filaModoEnvio(), f = F[EV.i]; const act = b.dataset.act;
  if (act === "evpular") { EV.i = Math.min(EV.i + 1, F.length - 1); render(); return; }
  if (act === "evir") { EV.i = +b.dataset.i; render(); return; }
  if (act === "evvoltar") { EV.i = Math.max(0, EV.i - 1); render(); return; }
  if (!f) return;
  const txt = ($("#ev-texto") || {}).value || f.texto;
  if (act === "evcopiar") { await copiar(txt); await evConcluir(f); }
  else if (act === "evcopimg") { const cv = $("#ev-cv"); const blob = await new Promise(ok => cv.toBlob(ok, "image/png")); try { await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); toast("Imagem copiada: cole no WhatsApp e depois cole o texto."); } catch (x) { toast("Seu navegador não deixou copiar imagem. Use Baixar."); } return; }
  else if (act === "evbaixar") { const cv = $("#ev-cv"); const a = document.createElement("a"); a.download = `alerta-${(f.t || "").replace(/\W+/g, "-")}.png`; a.href = cv.toDataURL("image/png"); a.click(); return; }
  else if (act === "evshare") { try { const cv = $("#ev-cv"); let dados = { text: txt };
      if (cv) { const blob = await new Promise(ok => cv.toBlob(ok, "image/png")); const arq = new File([blob], "alerta-085.png", { type: "image/png" }); if (navigator.canShare && navigator.canShare({ files: [arq] })) dados = { files: [arq], text: txt }; }
      await navigator.share(dados); await evConcluir(f, `Enviado: ${f.t}`); } catch (x) { /* cancelou */ } }
  else if (act === "evzap") { b.href = "https://api.whatsapp.com/send?text=" + encodeURIComponent(txt); setTimeout(() => evConcluir(f, `Aberto no WhatsApp: ${f.t}`), 300); }
  else if (act === "evacabou") { marcar(f.id, "descartado"); toast(`${f.t} tirado da fila.`); render(); }
});
document.addEventListener("input", e => { if (e.target.dataset.evPromos !== undefined) { EV.promos = e.target.checked; EV.i = 0; try { localStorage.setItem("p085_env_promos", EV.promos ? "1" : "0"); } catch (x) { } render(); } });

/* Enviar com imagem: janela usada em Alertas, Milhas e Promoções (mesmo fluxo do Modo envio). */
const ENV_REG = {};
const EJ = { id: null };
function fonteEnvio(id) { return ENV_REG[id] || S.alertas.find(a => a.id === id) || ((S.mi && S.mi.ofertas) || []).find(o => o.id === id); }
async function abrirEnvio(id) {
  const x = fonteEnvio(id); if (!x) { toast("Não achei esse alerta."); return; }
  EJ.id = id; fecharEnvio(true);
  const card = cardDeAlerta(x), pode = typeof navigator.share === "function" && matchMedia("(pointer:coarse)").matches;
  const titulo = x.destino_nome || x.destino || x.titulo || "Alerta";
  const d = document.createElement("div"); d.className = "ej-fundo"; d.id = "ej";
  d.innerHTML = `<div class="ej" role="dialog" aria-modal="true" aria-label="Enviar alerta">
    <div class="ej-h"><div><b>Enviar: ${esc(titulo)}</b><small>${card ? "Imagem e texto prontos. No WhatsApp: cole a imagem e depois o texto." : "Este é só texto (promoção)."}</small></div><button class="bt sm ghost" data-act="ejfechar" title="Fechar">✕</button></div>
    <div class="ej-g">
      ${card ? `<div class="ej-img"><canvas id="ej-cv"></canvas></div>` : ""}
      <div class="ej-t"><textarea id="ej-texto" spellcheck="false">${esc(x.texto || "")}</textarea><div class="sub">Pode editar antes de copiar. Vale só pra este envio.</div></div>
    </div>
    <div class="ej-acts">
      ${pode ? `<button class="bt pri lg" data-act="ejshare">${ic("send")}Compartilhar no WhatsApp (imagem + texto)</button>` : ""}
      ${card ? `<button class="bt ${pode ? "" : "pri"} lg" data-act="ejimg"><span class="ej-n">1</span>Copiar imagem</button>` : ""}
      <button class="bt lg" data-act="ejtxt">${card ? `<span class="ej-n">2</span>` : ""}Copiar texto</button>
      ${card ? `<button class="bt ghost" data-act="ejbaixar">${ic("down")}Baixar imagem</button>` : ""}
      <button class="bt ghost" data-act="ejok">${ic("check")}Marcar como enviado</button>
    </div></div>`;
  document.body.appendChild(d); document.body.classList.add("ej-on");
  if (card) await desenharResgate(document.getElementById("ej-cv"), card);
}
function fecharEnvio(silencio) { const d = document.getElementById("ej"); if (d) d.remove(); document.body.classList.remove("ej-on"); if (!silencio) render(); }
async function ejBlob() { const cv = document.getElementById("ej-cv"); return cv ? new Promise(ok => cv.toBlob(ok, "image/png")) : null; }
document.addEventListener("click", async e => {
  const b = e.target.closest('[data-act="envabrir"],[data-act^="ej"]');
  if (!b) { if (e.target.id === "ej") fecharEnvio(); return; }
  e.preventDefault(); const act = b.dataset.act;
  if (act === "envabrir") { abrirEnvio(b.dataset.id); return; }
  const id = EJ.id, x = fonteEnvio(id), txt = ($("#ej-texto") || {}).value || "";
  if (act === "ejfechar") fecharEnvio();
  else if (act === "ejimg") { try { const blob = await ejBlob(); await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); b.classList.add("ok"); toast("① Imagem copiada. Cole no WhatsApp (⌘V) e depois copie o texto."); } catch (x) { toast("O navegador não deixou copiar a imagem. Use Baixar imagem."); } }
  else if (act === "ejtxt") { await copiar(txt); b.classList.add("ok"); marcar(id, true); toast("② Texto copiado e alerta marcado como enviado.", 3500); }
  else if (act === "ejbaixar") { const cv = $("#ej-cv"); const a = document.createElement("a"); a.download = `alerta-${String((x && (x.destino_nome || x.destino)) || "085").replace(/\W+/g, "-")}.png`; a.href = cv.toDataURL("image/png"); a.click(); }
  else if (act === "ejok") { marcar(id, true); toast("Marcado como enviado."); fecharEnvio(); }
  else if (act === "ejshare") { try { let dados = { text: txt }; const blob = await ejBlob();
      if (blob) { const arq = new File([blob], "alerta-085.png", { type: "image/png" }); if (navigator.canShare && navigator.canShare({ files: [arq] })) dados = { files: [arq], text: txt }; }
      await navigator.share(dados); marcar(id, true); toast("Enviado ✓"); fecharEnvio(); } catch (x) { } }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && document.getElementById("ej")) fecharEnvio(); });
