/* Radar Partiu085 — aba Milhas: bônus de transferência, compra de milhas, passagens em milhas e calculadoras */
"use strict";
const MI = {
  f: "todas", ativas: true, aberto: "",
  c1: { iata: "", preco: "", milhas: "", taxas: "", custo: "" },
  c2: { preco: "", bonus: "" },
  c3: { milhas: "", bonus: "" },
};
try { MI.c1.custo = localStorage.getItem("p085_custo_milheiro") || ""; } catch (e) { }
const MI_TIPOS = { bonus: "Bônus de transferência", compra: "Compra de milhas", passagem: "Passagem em milhas", clube: "Clube" };
const milN = n => Math.round(+n || 0).toLocaleString("pt-BR");
const reais = v => "R$ " + (+v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function carregarMilhas() {
  if (S.mi) return;
  S.mi = { carregando: true, ofertas: [] };
  Promise.all([getJSON("milhas.json", { ofertas: [], vazio: true }), getJSON("milhas_voos.json", null)]).then(([d, v]) => { S.mi = d; S.mv = v; if (/milhas/.test(location.hash)) render(); });
}
function validadeTxt(o) {
  if (!o.validade) return ["", "sem data informada"];
  const h = hojeISO(), am = new Date(new Date(h + "T12:00:00Z").getTime() + 864e5).toISOString().slice(0, 10);
  if (o.validade < h) return ["neg-t", "encerrada"];
  if (o.validade === h) return ["urg", "termina hoje"];
  if (o.validade === am) return ["urg", "termina amanhã"];
  return ["", "até " + dm(o.validade)];
}
function miFiltrar() {
  let L = (S.mi.ofertas || []).slice();
  if (MI.ativas) L = L.filter(o => o.ativa !== false);
  if (MI.f === "fortaleza") L = L.filter(o => o.fortaleza);
  else if (MI.f !== "todas") L = L.filter(o => o.tipo === MI.f);
  return L;
}
function cardMilha(o) {
  const [vc, vt] = validadeTxt(o), env = enviado(o);
  const par = o.tipo === "passagem" && o.destino ? (o.fortaleza ? "Fortaleza → " : "") + o.destino + (o.para ? " · " + o.para : "")
    : [o.de, o.para].filter(Boolean).join(" → ") || (o.programas || []).slice(0, 2).join(" · ") || "Milhas";
  const big = o.tipo === "passagem" && o.milhas ? `${milN(o.milhas)}<small>milhas</small>` : o.pct ? `${o.pct}%<small>${o.tipo === "bonus" ? "de bônus" : "de vantagem"}</small>` : `<small>${MI_TIPOS[o.tipo]}</small>`;
  return `<article class="mi ${o.tipo} ${env ? "enviado" : ""} ${o.ativa === false ? "vencida" : ""}" data-id="${esc(o.id)}">
    ${env ? `<div class="env-faixa">${ic("check", "i sm")}Enviado no grupo · ${new Date(S.marcados[o.id]).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>` : ""}
    <div class="al-top"><div><div class="rt">${MI_TIPOS[o.tipo] || o.tipo}</div><div class="ds">${esc(par)}</div></div><div class="preco mi-big">${big}</div></div>
    <p class="mi-tit">${esc(o.titulo)}</p>
    <div class="tags">
      <span class="tag ${vc}">${ic("calendar", "i sm")}${vt}</span>
      ${o.fortaleza ? `<span class="tag vip-t">${ic("plane", "i sm")}Saindo de Fortaleza</span>` : ""}
      ${o.telegram ? `<span class="tag">${ic("check", "i sm")}Telegram</span>` : ""}
      <span class="tag info">${esc((o.fontes || [o.fonte]).slice(0, 2).join(" · "))}</span>
    </div>
    <div class="al-acts">
      <button class="bt sm" data-act="micopiar" data-id="${esc(o.id)}">${ic("copy")}<span>Copiar</span></button>
      <a class="bt sm zap" target="_blank" rel="noopener" data-marca="${esc(o.id)}" href="https://wa.me/?text=${encodeURIComponent(o.texto || "")}">${ic("send")}WhatsApp</a>
      <button class="bt sm ${env ? "ok" : "ghost"}" data-act="mimarcar" data-id="${esc(o.id)}">${ic(env ? "check" : "circle")}${env ? "Enviado" : "Marcar enviado"}</button>
      <button class="bt sm ghost" data-act="mitexto" data-id="${esc(o.id)}">${MI.aberto === o.id ? "Esconder" : "Ver texto"}</button>
      <button class="bt sm ghost" data-act="mibanner" data-id="${esc(o.id)}">${ic("image")}Banner</button>
      ${o.link ? `<a class="bt sm ghost" target="_blank" rel="noopener" href="${esc(o.link)}">${ic("ext")}Fonte</a>` : ""}
    </div>
    ${MI.aberto === o.id ? `<div class="texto">${esc(o.texto)}</div>` : ""}
    <div class="quando"><span>Publicado ${o.publicado.slice(0, 10) === hojeISO() ? "hoje" : dm(o.publicado)} às ${o.publicado.slice(11, 16)}</span></div>
  </article>`;
}

/* ---------------- busca própria (Smiles e Azul por data) */
function buscaPropriaHTML() {
  const V = S.mv, aj = S.ajustes || {};
  const dest = (aj.milhas_destinos || ["SAO", "RIO", "BSB", "REC", "SSA", "LIS", "MIA", "ORL", "BUE", "SCL"]).join(", ");
  const cfg = `<div class="form" style="margin-top:var(--space-4)">
      <div class="field" style="grid-column:1/-1"><label>Destinos vigiados em milhas</label><input data-mic="milhas_destinos" value="${esc(dest)}"><small>Códigos separados por vírgula. Menos destinos = gasta menos créditos.</small></div>
      <div class="field"><label>Consultas por rodada</label><input type="number" data-mic="milhas_buscas_por_rodada" value="${esc(aj.milhas_buscas_por_rodada || 4)}"><small>8 rodadas por dia</small></div>
      <div class="field"><label>Alertar quando</label><input type="number" step="0.05" data-mic="milhas_desconto" value="${esc(aj.milhas_desconto ?? 0.25)}"><small>0,25 = 25% abaixo do normal da rota</small></div>
      <div class="field"><button class="bt pri" data-act="misalvarcfg">${ic("save")}Salvar</button></div></div>`;
  const head2 = `<div class="head" style="margin:28px 0 12px"><div><h1 style="font-size:20px">Busca própria em milhas · saindo de FOR</h1><p>O robô consulta Smiles e Azul data por data e compara com o preço em dinheiro do radar</p></div></div>`;
  if (!V) return head2 + `<div class="card"><h3>Pronta pra ligar</h3><div class="desc">Falta só a chave da GeckoAPI (teste grátis com 100 créditos).</div>
      <ol class="mi-passos"><li>Crie a conta grátis em <a href="https://geckoapi.com.br" target="_blank" rel="noopener">geckoapi.com.br</a> e copie a sua chave de API.</li>
      <li>No GitHub, abra <a href="https://github.com/${REPO}/settings/secrets/actions/new" target="_blank" rel="noopener">Settings → Secrets → New secret</a>, nome <b>GECKO_API_KEY</b>, e cole a chave.</li>
      <li>Pronto: a busca roda junto com o radar a cada 3h e os achados aparecem aqui e nos alertas de milhas.</li></ol>${cfg}</div>`;
  const linhas = [];
  Object.entries(V.rotas || {}).forEach(([k, ps]) => Object.entries(ps).forEach(([prog, r]) => { if (r.menor) linhas.push({ k, prog, ...r.menor, normal: r.normal }); }));
  linhas.sort((a, b) => a.milhas - b.milhas);
  const st = { ok: "funcionando", SEM_CREDITOS: "sem créditos na GeckoAPI", CHAVE_INVALIDA: "chave inválida" }[V.status] || V.status;
  return head2 + `<div class="card">
    <div class="card-h"><div><h3>Menores valores encontrados</h3><div class="desc">${esc(st)} · ${V.consultas_hoje || 0} consultas hoje · atualizado ${haQuanto(V.atualizado)}</div></div></div>
    <div class="tbl-wrap"><table><thead><tr><th>Destino</th><th>Programa</th><th class="num">Milhas + taxas</th><th>Data</th><th class="num">Em dinheiro</th><th class="num">Milheiro vale</th></tr></thead><tbody>
    ${linhas.map(l => { const nome = (S.rotas.find(r => r.iata === l.k) || {}).nome || IATA[l.k] || l.k; const vm = l.dinheiro ? (l.dinheiro - l.taxa) / (l.milhas / 1000) : null;
      return `<tr><td><b>${esc(nome)}</b></td><td>${esc(l.prog)}</td><td class="num">${milN(l.milhas)} + ${brl(l.taxa)}${l.normal && l.milhas < l.normal * .8 ? ` <span class="tag ok-t">−${Math.round((1 - l.milhas / l.normal) * 100)}%</span>` : ""}</td><td>${dm(l.dia)}</td><td class="num">${l.dinheiro ? brl(l.dinheiro) : "–"}</td><td class="num" style="font-weight:700;color:${vm == null ? "inherit" : vm >= 20 ? "var(--positive-text)" : "var(--negative-text)"}">${vm == null ? "–" : reais(vm)}</td></tr>`; }).join("") || `<tr><td colspan="6" class="vazio">As primeiras consultas aparecem aqui depois da próxima rodada.</td></tr>`}
    </tbody></table></div>
    <details style="margin-top:var(--space-4)"><summary class="sub" style="cursor:pointer">Configurar a busca</summary>${cfg}</details></div>`;
}

/* ---------------- calculadoras */
function calc1() {
  const c = MI.c1, p = +c.preco, m = +c.milhas, t = +c.taxas || 0, custo = +String(c.custo).replace(",", ".");
  if (!p || !m) return { ok: false };
  const valor = (p - t) / (m / 1000);
  const ref = custo || 20;
  return { ok: true, valor, ref, vale: valor >= ref, custo, economia: p - t - (m / 1000) * ref };
}
function calc1HTML() {
  const r = calc1();
  if (!r.ok) return `<div class="mi-res vazio">Preencha o preço em dinheiro e as milhas.</div>`;
  return `<div class="mi-res ${r.vale ? "ok" : "neg"}"><b>${r.vale ? "Vale usar milhas ✅" : "Melhor pagar em dinheiro 💸"}</b>
    <span>Cada milheiro está rendendo <strong>${reais(r.valor)}</strong> nessa emissão. ${r.custo ? `Seu milheiro custa ${reais(r.custo)}.` : `Referência usada: ${reais(r.ref)} por milheiro (troque pelo seu custo).`}</span></div>`;
}
function calc1Texto() {
  const r = calc1(), c = MI.c1; if (!r.ok) return "";
  const nome = c.iata ? ((S.rotas.find(x => x.iata === c.iata) || {}).nome || IATA[c.iata] || c.iata) : "";
  return ["🧮 *MILHAS OU DINHEIRO?*", "", nome ? `✈️ Fortaleza → ${nome}` : "", `💰 Em dinheiro: ${brl(c.preco)}`, `🎟️ Em milhas: ${milN(c.milhas)} milhas${+c.taxas ? ` + ${brl(c.taxas)} de taxas` : ""}`, "",
    `👉 Cada milheiro rende ${reais(r.valor)}.`, r.vale ? "✅ Vale usar milhas!" : "💸 Aqui compensa pagar em dinheiro e guardar as milhas.", "",
    `✈️ Receba alertas no WhatsApp: ${grupoLink("gratis")}`].filter((x, i, a) => x !== "" || a[i - 1] !== "").join("\n");
}
function calc2() { const p = +MI.c2.preco, b = +MI.c2.bonus || 0; if (!p) return null; return { custo: p / (1 + b / 100), dez: 10000 * (1 + b / 100) }; }
function calc3() { const m = +MI.c3.milhas, b = +MI.c3.bonus || 0; if (!m) return null; return Math.ceil(m / (1 + b / 100)); }
function calcOut() {
  const a = $("#mi-c1"); if (a) a.innerHTML = calc1HTML();
  const r2 = calc2(), b = $("#mi-c2"); if (b) b.innerHTML = r2 ? `<div class="mi-res ok"><b>${reais(r2.custo)} por milheiro</b><span>10 mil pontos viram ${milN(r2.dez)} milhas.</span></div>` : `<div class="mi-res vazio">Quanto você paga no milheiro de pontos e o bônus.</div>`;
  const r3 = calc3(), c = $("#mi-c3"); if (c) c.innerHTML = r3 ? `<div class="mi-res ok"><b>${milN(r3)} pontos</b><span>pra ter ${milN(MI.c3.milhas)} milhas com ${+MI.c3.bonus || 0}% de bônus.</span></div>` : `<div class="mi-res vazio">Quantas milhas a passagem custa e o bônus ativo.</div>`;
  const tx = $("#mi-c1-tx"); if (tx) tx.textContent = calc1Texto();
}

function pMilhas() {
  carregarMilhas();
  const M = S.mi;
  if (M.carregando) return head("Milhas", "Carregando…") + `<div class="card vazio">Lendo as promoções de milhas…</div>`;
  const todas = M.ofertas || [], ativas = todas.filter(o => o.ativa !== false);
  const bon = ativas.filter(o => o.tipo === "bonus").sort((a, b) => (b.pct || 0) - (a.pct || 0));
  const fortal = ativas.filter(o => o.fortaleza).length;
  const L = miFiltrar();
  const bonusChips = [...new Set(bon.map(o => o.pct))].slice(0, 5);
  const rotasCash = Object.entries(S.status.rotas || {}).filter(([, v]) => v.menor).map(([k, v]) => [k, (S.rotas.find(r => r.iata === k) || {}).nome || v.nome || IATA[k] || k, v.menor]).sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  const fld = (g, k, lbl, ph = "", dica = "") => `<div class="field"><label>${lbl}</label><input type="number" inputmode="decimal" data-mi="${g}.${k}" value="${esc(MI[g][k])}" placeholder="${ph}">${dica ? `<small>${dica}</small>` : ""}</div>`;
  return head("Milhas", "Bônus de transferência, compra de milhas e passagens em milhas — atualizado sozinho a cada 3h, pronto pro grupo de milhas",
    `<button class="bt" data-act="miatualizar">${ic("refresh")}Atualizar agora</button>`) +
    `<div class="grid kpis">
      ${kpi("Bônus ativos", bon.length, bon[0] ? `maior: ${bon[0].pct}% ${esc([bon[0].de, bon[0].para].filter(Boolean).join(" → "))}` : "nenhum no momento", true, "zap")}
      ${kpi("Promoções ativas", ativas.length, `${todas.length} nos últimos 21 dias`, false, "star")}
      ${kpi("Saindo de Fortaleza", fortal, M.atualizado ? `lido ${haQuanto(M.atualizado)}` : "aguardando primeira leitura", false, "plane")}
    </div>
    <div class="filtros-l">${pills("mi", MI.f, [["todas", "Tudo"], ["bonus", "Bônus de transferência"], ["compra", "Compra de milhas"], ["passagem", "Passagens em milhas"], ["clube", "Clubes"], ["fortaleza", "Saindo de Fortaleza"]])}
      <label class="chk"><input type="checkbox" data-mi-ativas ${MI.ativas ? "checked" : ""}> Só as que ainda valem</label></div>
    <div class="alertas">${L.map(cardMilha).join("") || `<div class="card vazio">${M.vazio ? "O radar de milhas roda junto com o de passagens, a cada 3h. A primeira leitura aparece aqui em breve." : "Nada nesse filtro agora."}</div>`}</div>

    ${buscaPropriaHTML()}
    <div class="head" style="margin:28px 0 12px"><div><h1 style="font-size:20px">Calculadoras do milheiro</h1><p>Responde a pergunta que todo mundo faz no grupo: vale usar milhas ou pagar em dinheiro?</p></div></div>
    <div class="grid mi-calcs">
      <div class="card"><h3>Milhas ou dinheiro?</h3><div class="desc">Puxa o menor preço do radar ou digite o seu.</div>
        <div class="form">
          <div class="field" style="grid-column:1/-1"><label>Destino (opcional)</label><select data-mi="c1.iata"><option value="">— digitar o preço —</option>${rotasCash.map(([k, n, p]) => `<option value="${k}" ${MI.c1.iata === k ? "selected" : ""}>${esc(n)} · ${brl(p)} o trecho</option>`).join("")}</select></div>
          ${fld("c1", "preco", "Preço em dinheiro (R$)", "1200")}${fld("c1", "milhas", "Milhas da passagem", "25000")}
          ${fld("c1", "taxas", "Taxas (R$)", "60")}${fld("c1", "custo", "Seu custo do milheiro", "20", "fica salvo neste aparelho")}
        </div><div id="mi-c1">${calc1HTML()}</div>
        <div class="al-acts" style="margin-top:var(--space-3)"><button class="bt sm" data-act="mic1copiar">${ic("copy")}Copiar comparação pro grupo</button></div>
        <div class="texto" id="mi-c1-tx" style="margin-top:var(--space-3)">${esc(calc1Texto())}</div>
      </div>
      <div class="card"><h3>Custo do milheiro com bônus</h3><div class="desc">Ex.: comprou pontos Livelo a R$ 35 o milheiro e transferiu com 100%.</div>
        <div class="form">${fld("c2", "preco", "Preço do milheiro de pontos (R$)", "35")}${fld("c2", "bonus", "Bônus da transferência (%)", "100")}</div>
        ${bonusChips.length ? `<div class="presets">${bonusChips.map(p => `<button class="chip" data-act="mibonus" data-g="c2" data-v="${p}">${p}% ativo</button>`).join("")}</div>` : ""}
        <div id="mi-c2"></div>
        <div class="sec-gap"></div><h3>Quantos pontos eu preciso?</h3><div class="desc">Pra emitir uma passagem usando o bônus ativo.</div>
        <div class="form">${fld("c3", "milhas", "Milhas da passagem", "30000")}${fld("c3", "bonus", "Bônus (%)", "80")}</div>
        ${bonusChips.length ? `<div class="presets">${bonusChips.map(p => `<button class="chip" data-act="mibonus" data-g="c3" data-v="${p}">${p}% ativo</button>`).join("")}</div>` : ""}
        <div id="mi-c3"></div>
      </div>
    </div>
    ${M.fontes ? `<p class="sub" style="margin-top:var(--space-4)">Fontes lidas: ${M.fontes.map(f => `${esc(f.fonte)}${f.ok ? "" : " (fora do ar)"}`).filter((x, i, a) => a.indexOf(x) === i).join(" · ")}. Sempre confira as regras no site do programa antes de transferir.</p>` : ""}`;
}

document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b || !/^mi/.test(b.dataset.act)) return;
  const act = b.dataset.act, O = id => (S.mi.ofertas || []).find(o => o.id === id);
  try {
    if (act === "micopiar") { const o = O(b.dataset.id); await copiar(o.texto); if (!enviado(o)) { marcar(o.id, true); toast("Copiado e marcado como enviado."); } else toast("Copiado."); render(); }
    else if (act === "mimarcar") { const o = O(b.dataset.id); marcar(o.id, !enviado(o)); render(); }
    else if (act === "mitexto") { MI.aberto = MI.aberto === b.dataset.id ? "" : b.dataset.id; render(); }
    else if (act === "mibanner") {
      const o = O(b.dataset.id), par = [o.de, o.para].filter(Boolean).join(" → ").toUpperCase();
      const l1 = o.tipo === "bonus" ? `${par || "MILHAS"}: ${o.pct}% DE BÔNUS` : o.tipo === "passagem" && o.milhas ? `${o.destino ? o.destino.toUpperCase() + " · " : ""}${milN(o.milhas)} MILHAS` : o.titulo;
      const [, vt] = validadeTxt(o);
      CR.tpl = "livre"; CR.txt = { ideia: `${l1}\n${o.tipo === "passagem" ? o.titulo : o.tipo === "bonus" ? "na transferência de pontos" : ""}${o.validade ? `\nVálido ${vt}` : ""}\nAlertas de milhas no grupo do 085` };
      location.hash = "#criativos";
    }
    else if (act === "miatualizar") {
      if (!token()) { toast("Configure o token em Ajustes primeiro."); location.hash = "#ajustes"; return; }
      b.disabled = true;
      await gh("/actions/workflows/milhas.yml/dispatches", { method: "POST", body: JSON.stringify({ ref: "main", inputs: { sondar: "nao" } }) });
      toast("Lendo as promoções de milhas… atualiza em ~2 min.", 4000);
      setTimeout(async () => { S.mi = null; carregarMilhas(); }, 150000);
    }
    else if (act === "mibonus") { MI[b.dataset.g].bonus = b.dataset.v; const i = $(`[data-mi="${b.dataset.g}.bonus"]`); if (i) i.value = b.dataset.v; calcOut(); }
    else if (act === "misalvarcfg") {
      const v = k => ($(`[data-mic="${k}"]`) || {}).value;
      S.ajustes.milhas_destinos = String(v("milhas_destinos") || "").toUpperCase().split(/[\s,;]+/).filter(x => /^[A-Z]{3}$/.test(x));
      S.ajustes.milhas_buscas_por_rodada = Math.max(1, Math.min(30, +v("milhas_buscas_por_rodada") || 4));
      S.ajustes.milhas_desconto = Math.max(0.05, Math.min(0.6, +String(v("milhas_desconto")).replace(",", ".") || 0.25));
      b.disabled = true; await salvarArquivo("docs/ajustes.json", S.ajustes, "Painel: ajustes da busca em milhas"); toast("Busca em milhas configurada."); b.disabled = false;
    }
    else if (act === "mic1copiar") { const t = calc1Texto(); if (!t) { toast("Preencha a calculadora primeiro."); return; } await copiar(t); toast("Comparação copiada."); }
  } catch (err) { toast("Erro: " + err.message, 5000); b.disabled = false; }
});
document.addEventListener("input", e => {
  const el = e.target;
  if (el.dataset.miAtivas !== undefined) { MI.ativas = el.checked; render(); return; }
  if (el.dataset.mi === undefined) return;
  const [g, k] = el.dataset.mi.split(".");
  MI[g][k] = el.value;
  if (g === "c1" && k === "iata") { const st = (S.status.rotas || {})[el.value]; if (st) { MI.c1.preco = st.menor; const p = $('[data-mi="c1.preco"]'); if (p) p.value = st.menor; } }
  if (g === "c1" && k === "custo") { try { localStorage.setItem("p085_custo_milheiro", el.value); } catch (x) { } }
  calcOut();
});
document.addEventListener("click", e => { const b = e.target.closest('[data-act="pill"][data-g="mi"]'); if (b) MI.f = b.dataset.v; }, true);
