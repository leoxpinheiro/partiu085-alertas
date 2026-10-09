/* Partiu 085 — Instagram: agenda, aprovação e publicação automática (API oficial do Instagram).
   O painel salva a fila (docs/ig_fila.json) e as imagens (docs/ig/*.jpg); o robô (instagram.yml, a cada 15 min)
   publica o que estiver aprovado e no horário e devolve status e números (docs/ig_status.json, docs/ig_conta.json). */
"use strict";
const IGF = { fila: null, st: {}, conta: null, carregando: false, modal: null };

async function carregarIG(forcar) {
  if (IGF.carregando || (IGF.fila && !forcar)) return;
  IGF.carregando = true;
  try {
    if (token()) { try { const r = await gh(`/contents/docs/ig_fila.json?ref=main&t=${Date.now()}`); IGF.fila = JSON.parse(decodeURIComponent(escape(atob(r.content.replace(/\n/g, ""))))); } catch (e) { IGF.fila = []; } }
    else IGF.fila = await getJSON("ig_fila.json", []);
    IGF.st = await getJSON("ig_status.json", {}); IGF.conta = await getJSON("ig_conta.json", null);
  } finally { IGF.carregando = false; }
  if (/#instagram/.test(location.hash)) render();
}
function isoLocal(d) { const z = new Date(d.getTime() - 3 * 36e5).toISOString().slice(0, 16); return z + "-03:00"; }
function proximoHorario(story) {
  const d = new Date(Date.now() - 3 * 36e5); const h = d.getUTCHours();
  const alvo = story ? null : [12, 19].find(x => x > h + 0.5);
  if (story) return isoLocal(new Date(Date.now() + 10 * 6e4));
  const base = new Date(Date.now()); const dia = alvo ? 0 : 1, hora = alvo || 12;
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + dia, hora + 3, 0)); return isoLocal(t);
}
function paraInsta(t) { return String(t || "").replace(/\*([^*\n]+)\*/g, "$1").replace(/(^|\s)_([^_\n]+)_/g, "$1$2"); }
async function subirImagem(caminho, cv) {
  const b64 = cv.toDataURL("image/jpeg", .92).split(",")[1];
  await gh(`/contents/docs/${caminho}`, { method: "PUT", body: JSON.stringify({ message: `Instagram: imagem ${caminho}`, content: b64, branch: "main" }) });
}
async function salvarFila(msg) { await salvarArquivo("docs/ig_fila.json", IGF.fila, msg); }

/* ---------- janela "Agendar no Instagram" */
function abrirAgendar(origem) {
  IGF.modal = origem;
  const d = document.createElement("div"); d.className = "ej-fundo"; d.id = "igm";
  const story = origem.tipo === "story";
  d.innerHTML = `<div class="ej" role="dialog" aria-label="Agendar no Instagram">
    <div class="ej-h"><div><b>Agendar no Instagram</b><small>${esc(origem.titulo)} · ${story ? "story" : origem.cvs.length > 1 ? `carrossel com ${origem.cvs.length} telas` : "post no feed"}</small></div><button class="bt sm ghost" data-act="igmfechar">✕</button></div>
    <div class="igm-thumbs">${origem.cvs.map((cv, i) => `<img src="${cv.toDataURL("image/jpeg", .6)}" alt="tela ${i + 1}">`).join("")}</div>
    ${story ? `<div class="aviso warn"><span>A API do Instagram publica o story sem adesivo de link. Se quiser o link do grupo, poste esse story pelo celular.</span></div>` : `<div class="field"><label>Legenda</label><textarea id="igm-leg" rows="8">${esc(paraInsta(origem.legenda))}</textarea></div>`}
    <div class="form" style="grid-template-columns:1fr 1fr"><div class="field"><label>Dia e hora</label><input type="datetime-local" id="igm-qd" value="${proximoHorario(story).slice(0, 16)}"></div>
      <div class="field" style="align-self:end"><label class="chk"><input type="checkbox" id="igm-ok" checked> Aprovado: publicar sozinho no horário</label></div></div>
    <div class="ej-acts"><button class="bt pri lg" data-act="igmsalvar">${ic("calendar")}Agendar</button><button class="bt lg" data-act="igmagora">${ic("send")}Publicar agora</button><a class="bt ghost" href="#instagram" data-act="igmfechar">Ver agenda</a></div>
  </div>`;
  document.body.appendChild(d); document.body.classList.add("ej-on");
}
function fecharAgendar() { const d = $("#igm"); if (d) d.remove(); document.body.classList.remove("ej-on"); IGF.modal = null; }
async function confirmarAgendar(agora) {
  const o = IGF.modal; if (!o) return;
  if (!token()) { toast("Conecte o token do GitHub em Ajustes pra agendar."); return; }
  const id = `ig-${Date.now().toString(36)}`;
  const quando = agora ? isoLocal(new Date()) : ($("#igm-qd").value + "-03:00");
  const item = { id, titulo: o.titulo, tipo: o.tipo === "story" ? "story" : o.cvs.length > 1 ? "carrossel" : "feed", imagens: o.cvs.map((_, i) => `ig/${id}-${i + 1}.jpg`),
    legenda: o.tipo === "story" ? "" : (($("#igm-leg") || {}).value || ""), quando, aprovado: agora || $("#igm-ok").checked, tentativa: 0, criado: isoLocal(new Date()), origem: o.id || "" };
  const bt = document.querySelector('[data-act="igmsalvar"]'); if (bt) { bt.disabled = true; bt.textContent = "Enviando imagens…"; }
  try {
    for (let i = 0; i < o.cvs.length; i++) await subirImagem(item.imagens[i], o.cvs[i]);
    IGF.fila = null; await carregarIG(true); IGF.fila = (IGF.fila || []).concat(item);
    await salvarFila(`Instagram: agenda "${o.titulo}"`);
    if (agora) await gh("/actions/workflows/instagram.yml/dispatches", { method: "POST", body: JSON.stringify({ ref: "main", inputs: { post: id } }) });
    fecharAgendar(); toast(agora ? "Enviado pro robô: publica em 1 a 2 minutos." : `Agendado pra ${dataHora(quando)}.`, 4500);
  } catch (e) { toast("Não agendou: " + e.message, 6000); if (bt) { bt.disabled = false; bt.textContent = "Agendar"; } }
}
function dataHora(q) { return `${q.slice(8, 10)}/${q.slice(5, 7)} às ${q.slice(11, 16)}`; }

/* ---------- página */
function pInstagram() {
  carregarIG();
  const c = IGF.conta, F = IGF.fila, S_ = IGF.st || {};
  const setup = !c || !c.ok;
  const hist = (c && c.historico) || [], h7 = hist.length > 1 ? hist[hist.length - 1].seguidores - (hist[Math.max(0, hist.length - 8)].seguidores || 0) : null;
  const st = p => (S_[p.id] || {}).status || (p.aprovado ? "agendado" : "rascunho");
  const chip = s => ({ agendado: `<span class="st verde">agendado</span>`, rascunho: `<span class="st">rascunho · falta aprovar</span>`, publicado: `<span class="st verde">✓ publicado</span>`, erro: `<span class="st vermelho">erro</span>` }[s]);
  const thumb = p => `https://raw.githubusercontent.com/${REPO}/main/docs/${p.imagens[0]}`;
  const pend = (F || []).filter(p => st(p) !== "publicado").sort((a, b) => a.quando.localeCompare(b.quando));
  const pub = (F || []).filter(p => st(p) === "publicado").sort((a, b) => ((S_[b.id] || {}).publicado_em || "").localeCompare((S_[a.id] || {}).publicado_em || ""));
  const linhaFila = p => { const s = st(p), e = S_[p.id] || {};
    return `<div class="ig-row"><img src="${thumb(p)}" alt="" loading="lazy"><div class="ig-i"><b>${esc(p.titulo)}</b><small>${p.tipo === "story" ? "Story" : p.tipo === "carrossel" ? `Carrossel · ${p.imagens.length} telas` : "Feed"} · ${dataHora(p.quando)} ${chip(s)}</small>
      ${s === "erro" ? `<small class="neg">${esc(e.erro || "")}</small>` : ""}${p.legenda ? `<small class="ig-leg">${esc(p.legenda.slice(0, 140))}${p.legenda.length > 140 ? "…" : ""}</small>` : ""}</div>
      <div class="ig-a">${s === "rascunho" ? `<button class="bt sm pri" data-act="igaprovar" data-id="${p.id}">${ic("check")}Aprovar</button>` : s === "agendado" ? `<button class="bt sm ghost" data-act="igdesaprovar" data-id="${p.id}">Pausar</button>` : ""}
        ${s === "erro" ? `<button class="bt sm pri" data-act="igtentar" data-id="${p.id}">${ic("refresh")}Tentar de novo</button>` : ""}
        <button class="bt sm" data-act="igeditar" data-id="${p.id}">Editar</button><button class="bt sm" data-act="igagora" data-id="${p.id}">${ic("send")}Publicar agora</button><button class="bt sm ghost danger" data-act="igremover" data-id="${p.id}">Remover</button></div></div>`; };
  const linhaPub = p => { const e = S_[p.id] || {}, m = e.metricas || {};
    return `<div class="ig-row"><img src="${thumb(p)}" alt="" loading="lazy"><div class="ig-i"><b>${esc(p.titulo)}</b><small>${e.publicado_em ? dataHora(e.publicado_em) : ""}${e.link ? ` · <a href="${esc(e.link)}" target="_blank" rel="noopener">ver no Instagram ↗</a>` : ""}</small></div>
      <div class="ig-m">${[["curtidas", "❤️"], ["comentarios", "💬"], ["alcance", "👀"], ["salvos", "🔖"], ["compartilhamentos", "↗️"]].map(([k, e_]) => m[k] != null ? `<span title="${k}">${e_} <b>${milN(m[k])}</b></span>` : "").join("") || `<span class="sub">números aparecem em até 1h</span>`}</div></div>`; };
  return head("Instagram", "Agenda dos posts: você aprova, o robô publica sozinho no horário e traz os números. Pra agendar, use o botão 📅 nas artes da Pauta ou do Conversor.",
    `<button class="bt" data-act="igrecarregar">${ic("refresh")}Atualizar</button>`) +
    (setup ? `<div class="card ig-setup"><h3>${c && c.erro ? "A conexão com o Instagram deu erro" : "Conectar o Instagram (uma vez só)"}</h3>${c && c.erro ? `<div class="aviso warn"><span>${esc(c.erro)}</span></div>` : ""}
      <ol><li>No app do Instagram do <b>@partiu.085</b>: Configurações › Tipo de conta › mude pra <b>conta profissional</b> (Criador de conteúdo ou Empresa). É grátis.</li>
        <li>Em <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener">developers.facebook.com</a>, crie um app (tipo <b>Empresa</b>) e adicione o produto <b>Instagram</b> › “API com login do Instagram”.</li>
        <li>Em “Gerar tokens de acesso”, adicione a conta @partiu.085 e gere o token. Copie também o número do <b>ID da conta</b>.</li>
        <li>Cole os dois em <a href="#ajustes">Ajustes › Integrações</a>: <code>IG_TOKEN</code> e <code>IG_USER_ID</code>. Pronto: o robô passa a publicar e a trazer os números.</li></ol>
      <p class="sub">Se quiser, eu faço esse passo a passo junto com você pelo navegador.</p></div>`
    : `<div class="grid kpis">${kpi("Seguidores", milN(c.seguidores || 0), h7 != null ? `${h7 >= 0 ? "+" : ""}${h7} nos últimos 7 dias` : "o crescimento aparece a partir de amanhã", true, "users")}
        ${kpi("Posts no perfil", milN(c.posts || 0), `@${esc(c.usuario || "")}`, false, "image")}
        ${kpi("Agendados", pend.filter(p => st(p) === "agendado").length, `${pend.filter(p => st(p) === "rascunho").length} esperando aprovação`, false, "calendar")}</div>
      ${c.expira ? `<p class="sub">Conexão válida até ${dataHora(c.expira)} (o robô renova sozinho).</p>` : ""}`) +
    `<h2 class="mv-t">Agenda</h2>${F == null ? `<div class="card vazio">Carregando…</div>` : pend.length ? `<div class="card ig-lista">${pend.map(linhaFila).join("")}</div>` : `<div class="card vazio">Nada agendado. Vá em <a href="#pauta">Pauta do Instagram</a> e toque em 📅 Agendar numa arte.</div>`}
    <h2 class="mv-t">Publicados</h2>${pub.length ? `<div class="card ig-lista">${pub.map(linhaPub).join("")}</div>` : `<div class="card vazio">Os posts publicados pelo robô aparecem aqui, com curtidas, comentários, alcance e salvos.</div>`}`;
}
document.addEventListener("click", async e => {
  const b = e.target.closest('[data-act^="ig"]'); if (!b) return;
  const act = b.dataset.act;
  if (!/^ig(m|agendar|recarregar|aprovar|desaprovar|tentar|editar|agora|remover)/.test(act)) return;
  try {
    if (act === "igagendar") {
      if (b.dataset.src === "pa") { const p = PA.lista[+b.dataset.i]; abrirAgendar({ id: p.id, titulo: p.titulo, tipo: p.stories ? "story" : "feed", cvs: [...document.querySelectorAll(`#pa-t-${b.dataset.i} canvas`)], legenda: ($("#pa-l-" + b.dataset.i) || {}).value || p.legenda }); }
      else { const i = +b.dataset.i, it = CV.itens[i], cv = $("#cv-cv-" + i); if (!cv) { toast("Ligue “Fazer imagem” pra agendar."); return; }
        abrirAgendar({ id: "cv-" + i, titulo: it.tipo === "promo" ? "Promoção de milhas" : `Fortaleza ➜ ${(it.c || it.r).nome || ""}`, tipo: "feed", cvs: [cv], legenda: (($("#cv-t-" + i) || {}).value || it.texto) + `\n\n${typeof HASH !== "undefined" ? HASH : ""}` }); }
      return;
    }
    if (act === "igmfechar") { fecharAgendar(); return; }
    if (act === "igmsalvar" || act === "igmagora") { await confirmarAgendar(act === "igmagora"); return; }
    if (act === "igrecarregar") { IGF.fila = null; await carregarIG(true); toast("Atualizado."); return; }
    const p = (IGF.fila || []).find(x => x.id === b.dataset.id); if (!p) return;
    if (!token()) { toast("Conecte o token do GitHub em Ajustes."); return; }
    b.disabled = true;
    if (act === "igaprovar") { p.aprovado = true; await salvarFila(`Instagram: aprova "${p.titulo}"`); toast("Aprovado: publica sozinho no horário."); }
    else if (act === "igdesaprovar") { p.aprovado = false; await salvarFila(`Instagram: pausa "${p.titulo}"`); toast("Pausado."); }
    else if (act === "igtentar") { p.tentativa = (p.tentativa || 0) + 1; p.aprovado = true; await salvarFila(`Instagram: tenta de novo "${p.titulo}"`); await gh("/actions/workflows/instagram.yml/dispatches", { method: "POST", body: JSON.stringify({ ref: "main", inputs: { post: p.id } }) }); toast("Tentando de novo em 1 a 2 minutos."); }
    else if (act === "igagora") { p.aprovado = true; p.quando = isoLocal(new Date()); p.tentativa = (p.tentativa || 0) + ((IGF.st[p.id] || {}).status === "erro" ? 1 : 0); await salvarFila(`Instagram: publicar agora "${p.titulo}"`); await gh("/actions/workflows/instagram.yml/dispatches", { method: "POST", body: JSON.stringify({ ref: "main", inputs: { post: p.id } }) }); toast("Enviado pro robô: publica em 1 a 2 minutos."); }
    else if (act === "igremover") { if (!confirm(`Remover "${p.titulo}" da agenda?`)) { b.disabled = false; return; } IGF.fila = IGF.fila.filter(x => x !== p); await salvarFila(`Instagram: remove "${p.titulo}"`); toast("Removido."); }
    else if (act === "igeditar") {
      const leg = p.tipo === "story" ? p.legenda : prompt("Legenda:", p.legenda); if (leg == null) { b.disabled = false; return; }
      const q = prompt("Dia e hora (AAAA-MM-DD HH:MM):", p.quando.slice(0, 16).replace("T", " ")); if (q == null) { b.disabled = false; return; }
      if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(q.trim())) { toast("Formato: 2026-10-10 19:00"); b.disabled = false; return; }
      p.legenda = leg; p.quando = q.trim().replace(" ", "T") + "-03:00"; await salvarFila(`Instagram: edita "${p.titulo}"`); toast("Salvo.");
    }
    render();
  } catch (err) { toast("Erro: " + err.message, 6000); b.disabled = false; }
});
