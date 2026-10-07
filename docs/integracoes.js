/* Radar Partiu085 — Ajustes › Integrações: as chaves das APIs ficam guardadas como segredos do GitHub
   (criptografadas no navegador; nunca vão para os arquivos públicos do site). */
"use strict";
const INTEG = [
  { grupo: "Milhas", itens: [
    { nome: "GECKO_API_KEY", t: "GeckoAPI · milhas Smiles e Azul", d: "Busca própria de passagens em milhas saindo de Fortaleza, ida e volta.", link: "https://geckoapi.com.br", uso: "ativa" },
    { nome: "SEATS_AERO_KEY", t: "Seats.aero", d: "Milhas em programas estrangeiros (Aeroplan, United, LifeMiles…). Espaço reservado.", link: "https://seats.aero", uso: "reservada" },
    { nome: "MILHAS_API_KEY", t: "Outra API de milhas", d: "Se aparecer um fornecedor de LATAM Pass ou outro, a chave entra aqui.", uso: "reservada" },
  ] },
  { grupo: "Envio automático", itens: [
    { nome: "TELEGRAM_BOT_TOKEN", t: "Bot do Telegram", d: "O robô que posta os alertas.", link: "https://t.me/BotFather", uso: "ativa" },
    { nome: "TELEGRAM_CHAT_ID", t: "Canal grátis no Telegram", d: "ID do canal dos alertas em dinheiro (ex.: -100123…).", uso: "ativa" },
    { nome: "TELEGRAM_CHAT_MILHAS", t: "Canal de milhas no Telegram", d: "ID do canal que recebe os alertas de milhas.", uso: "ativa" },
    { nome: "WHATSAPP_API_KEY", t: "WhatsApp (envio automático)", d: "Para quando tivermos um serviço de envio no WhatsApp. Espaço reservado.", uso: "reservada" },
  ] },
  { grupo: "Passagens em dinheiro", itens: [
    { nome: "TRAVELPAYOUTS_TOKEN", t: "Travelpayouts · token", d: "Dados de preços e links de afiliado.", link: "https://app.travelpayouts.com", uso: "ativa" },
    { nome: "TRAVELPAYOUTS_MARKER", t: "Travelpayouts · marker", d: "Seu ID de afiliado (677880).", uso: "ativa" },
  ] },
];
const IG = { lista: null, erro: "", carregando: false, novo: "" };

async function carregarSegredos() {
  if (IG.carregando || !token()) return;
  IG.carregando = true;
  try { const r = await gh("/actions/secrets?per_page=100"); IG.lista = Object.fromEntries((r.secrets || []).map(x => [x.name, x.updated_at])); IG.erro = ""; }
  catch (e) { IG.erro = e.message; IG.lista = {}; }
  IG.carregando = false;
  if (/ajustes/.test(location.hash)) render();
}
function carregarSelo() {
  return window.seloGitHub ? Promise.resolve() : new Promise((ok, erro) => { const s = document.createElement("script"); s.src = "selo.js?v=1"; s.onload = ok; s.onerror = () => erro(new Error("não carregou o selo.js")); document.head.appendChild(s); });
}
async function salvarSegredo(nome, valor) {
  await carregarSelo();
  const k = await gh("/actions/secrets/public-key");
  await gh(`/actions/secrets/${nome}`, { method: "PUT", body: JSON.stringify({ encrypted_value: window.seloGitHub(k.key, valor), key_id: k.key_id }) });
}
function integracoesHTML() {
  if (!token()) return `<div class="card" style="margin-bottom:14px"><h3>Integrações (APIs)</h3><div class="desc">Cole o token do GitHub acima para ver e guardar as chaves das APIs.</div></div>`;
  if (!IG.lista) { carregarSegredos(); return `<div class="card" style="margin-bottom:14px"><h3>Integrações (APIs)</h3><div class="desc">Carregando…</div></div>`; }
  const conhecidas = new Set(INTEG.flatMap(g => g.itens.map(i => i.nome)));
  const outras = Object.keys(IG.lista).filter(n => !conhecidas.has(n));
  const item = i => { const on = i.nome in IG.lista;
    return `<div class="ig-item ${on ? "on" : ""}">
      <div class="ig-t"><b>${esc(i.t)}</b><span class="tag ${on ? "ok-t" : "info"}">${on ? `${ic("check", "i sm")}ligada` : i.uso === "reservada" ? "espaço reservado" : "falta a chave"}</span>
        <small>${esc(i.d)}${i.link ? ` · <a href="${i.link}" target="_blank" rel="noopener">onde pegar ↗</a>` : ""}</small><code>${i.nome}</code></div>
      <div class="ig-f"><input type="password" autocomplete="off" placeholder="${on ? "trocar a chave…" : "colar a chave…"}" data-ig="${i.nome}">
        <button class="bt sm pri" data-act="igsalvar" data-n="${i.nome}">${ic("save")}Salvar</button>
        ${on ? `<button class="bt sm ghost danger" data-act="igtirar" data-n="${i.nome}">Remover</button>` : ""}</div></div>`; };
  return `<div class="card" style="margin-bottom:14px"><div class="card-h"><div><h3>Integrações (APIs)</h3>
      <div class="desc">As chaves ficam guardadas como segredos no GitHub, criptografadas. Ninguém consegue ler depois, nem pelo site. ${IG.erro ? `<b style="color:var(--negative-text)">Erro: ${esc(IG.erro)}</b>` : ""}</div></div></div>
    ${INTEG.map(g => `<div class="ig-g"><div class="micro">${g.grupo}</div>${g.itens.map(item).join("")}</div>`).join("")}
    <div class="ig-g"><div class="micro">Outra chave</div>
      ${outras.map(n => item({ nome: n, t: n, d: "Chave extra guardada no GitHub.", uso: "reservada" })).join("")}
      <div class="ig-item"><div class="ig-t"><b>Nova chave</b><small>Nome em MAIÚSCULAS, ex.: LATAM_API_KEY. Depois me avise que eu ligo no robô.</small></div>
      <div class="ig-f"><input placeholder="NOME_DA_CHAVE" data-ig-nome value="${esc(IG.novo)}"><input type="password" autocomplete="off" placeholder="colar a chave…" data-ig="__novo">
        <button class="bt sm pri" data-act="igsalvar" data-n="__novo">${ic("save")}Salvar</button></div></div></div></div>`;
}
document.addEventListener("click", async e => {
  const b = e.target.closest('[data-act^="ig"]'); if (!b) return;
  let nome = b.dataset.n;
  try {
    if (b.dataset.act === "igsalvar") {
      const v = ($(`[data-ig="${nome}"]`) || {}).value || "";
      if (nome === "__novo") nome = (($("[data-ig-nome]") || {}).value || "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
      if (!/^[A-Z][A-Z0-9_]{2,}$/.test(nome) || /^GITHUB_/.test(nome)) { toast("Nome inválido (use letras, números e _ ; não pode começar com GITHUB_)."); return; }
      if (!v.trim()) { toast("Cole a chave primeiro."); return; }
      b.disabled = true; await salvarSegredo(nome, v.trim()); IG.lista = null; IG.novo = "";
      toast(`✓ ${nome} guardada no GitHub. Vale a partir da próxima rodada.`, 4500); render();
    } else if (b.dataset.act === "igtirar") {
      if (!confirm(`Remover a chave ${nome} do GitHub?`)) return;
      b.disabled = true; await gh(`/actions/secrets/${nome}`, { method: "DELETE" }); IG.lista = null; toast(`${nome} removida.`); render();
    }
  } catch (err) { toast("Não salvou: " + err.message, 6000); b.disabled = false; }
});
document.addEventListener("input", e => { if (e.target.dataset.igNome !== undefined) IG.novo = e.target.value; });
