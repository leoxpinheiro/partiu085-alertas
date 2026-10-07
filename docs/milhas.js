/* Radar Partiu085 — aba Milhas: 1) passagens em milhas saindo de FOR (principal)  2) promoções e transferências (de outros sites) */
"use strict";
const MI = { sec: "voos", f: "todas", ativas: true, aberto: "", moeda: "", ordem: "ofertas", sel: "", vista: "" };
try { MI.vista = localStorage.getItem("p085_vista_milhas") || "quadros"; } catch (e) { MI.vista = "quadros"; }
const MOEDAS = [["real", "Dinheiro (R$)"], ["Smiles", "Smiles"], ["Azul Fidelidade", "Azul"], ["LATAM Pass", "LATAM Pass"]];
const COR_MOEDA = { real: "#16A34A", Smiles: "#FF7A00", "Azul Fidelidade": "#2563EB", "LATAM Pass": "#E11D48" };
const MI_TIPOS = { bonus: "Bônus de transferência", compra: "Compra de milhas", passagem: "Passagem em milhas", clube: "Clube" };
const milN = n => Math.round(+n || 0).toLocaleString("pt-BR");

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
  let L = (S.mi.ofertas || []).filter(o => !o.busca_propria);
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

/* ---------------- principal: passagens em milhas saindo de FOR (busca própria) */
function cardVoo(o) {
  const env = enviado(o), k = o.desconto >= .4 ? "imperdivel" : o.desconto >= .3 ? "otima" : "boa";
  const ktxt = { imperdivel: "Imperdível", otima: "Ótima", boa: "Boa" }[k];
  return `<article class="al ${k} ${env ? "enviado" : ""}" data-id="${esc(o.id)}">
    ${env ? `<div class="env-faixa">${ic("check", "i sm")}Enviado no grupo · ${new Date(S.marcados[o.id]).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>` : ""}
    <div class="al-top">
      <div><div class="rt">FOR → ${esc(o.aeroporto || o.iata || "")} · ${esc(o.para || "")}</div><div class="ds">${esc(o.destino || "")}</div></div>
      <div class="preco">${milN(o.milhas)} milhas<small>+ ${brl(o.taxa)} de taxas · o trecho</small></div>
    </div>
    <div class="tags">
      ${o.desconto ? `<span class="tag ${k}">${ktxt} · −${pct(o.desconto)} ↘</span>` : ""}
      ${o.cia ? `<span class="tag">${esc(o.cia)}</span>` : ""}${o.paradas != null ? `<span class="tag">${paradasTxt(o.paradas)}</span>` : ""}
      ${o.telegram ? `<span class="tag">${ic("check", "i sm")}Telegram</span>` : ""}
    </div>
    <div class="idavolta"><div><div class="iv-h">${ic("up", "i sm")} Datas de ida <small>${milN(o.milhas)} milhas + ${brl(o.taxa)}</small></div>${mesesHTML(o.ida_meses, false)}</div>
      <div><div class="iv-h">${ic("downl", "i sm")} Datas de volta ${o.milhas_volta ? `<small>${milN(o.milhas_volta)} milhas + ${brl(o.taxa_volta)}</small>` : ""}</div>${o.volta_meses && o.volta_meses.length ? mesesHTML(o.volta_meses, false) : `<div class="sub">ainda sem volta consultada</div>`}</div></div>
    <div class="al-acts">
      <button class="bt sm" data-act="micopiar" data-id="${esc(o.id)}">${ic("copy")}<span>Copiar</span></button>
      <a class="bt sm zap" target="_blank" rel="noopener" data-marca="${esc(o.id)}" href="https://wa.me/?text=${encodeURIComponent(o.texto || "")}">${ic("send")}WhatsApp</a>
      <button class="bt sm ${env ? "ok" : "ghost"}" data-act="mimarcar" data-id="${esc(o.id)}">${ic(env ? "check" : "circle")}${env ? "Enviado" : "Marcar enviado"}</button>
      <button class="bt sm ghost" data-act="mitexto" data-id="${esc(o.id)}">${MI.aberto === o.id ? "Esconder" : "Ver texto"}</button>
      <button class="bt sm ghost" data-act="mibanner" data-id="${esc(o.id)}">${ic("image")}Banner</button>
    </div>
    ${MI.aberto === o.id ? `<div class="texto">${esc(o.texto)}</div>` : ""}
    <div class="quando"><span>Encontrado ${o.publicado.slice(0, 10) === hojeISO() ? "hoje" : dm(o.publicado)} às ${o.publicado.slice(11, 16)}</span></div>
  </article>`;
}
function cfgMilhasHTML() {
  const aj = S.ajustes || {};
  const dest = (aj.milhas_destinos || ["SAO", "RIO", "BSB", "REC", "SSA", "LIS", "MIA", "ORL", "BUE", "SCL"]).join(", ");
  return `<div class="form" style="margin-top:var(--space-4)">
      <div class="field" style="grid-column:1/-1"><label>Destinos vigiados em milhas</label><input data-mic="milhas_destinos" value="${esc(dest)}"><small>Códigos separados por vírgula. Menos destinos = gasta menos créditos.</small></div>
      <div class="field"><label>Consultas por rodada</label><input type="number" data-mic="milhas_buscas_por_rodada" value="${esc(aj.milhas_buscas_por_rodada || 4)}"><small>8 rodadas por dia</small></div>
      <div class="field"><label>Alertar quando</label><input type="number" step="0.05" data-mic="milhas_desconto" value="${esc(aj.milhas_desconto ?? 0.25)}"><small>0,25 = 25% abaixo do normal da rota</small></div>
      <div class="field"><button class="bt pri" data-act="misalvarcfg">${ic("save")}Salvar</button></div></div>`;
}
const milK = n => n >= 1000 ? (n / 1000).toFixed(n % 1000 ? 1 : 0).replace(".", ",") + "k" : String(n);
function calMilhas(r, nome, prog) {
  const lista = sentido => Object.entries((r || {})[sentido] || {}).filter(([, v]) => !v.sem).map(([dia, v]) => ({ dia, ...v })).sort((a, b) => a.dia.localeCompare(b.dia));
  const faixa = (L, titulo) => {
    if (!L.length) return `<div class="cal-b"><div class="cal-t">${titulo}</div><div class="sub">Ainda sem datas consultadas.</div></div>`;
    const ps = L.map(d => d.milhas), lo = Math.min(...ps), hi = Math.max(...ps), meses = {};
    L.forEach(d => (meses[d.dia.slice(0, 7)] = meses[d.dia.slice(0, 7)] || []).push(d));
    return `<div class="cal-b"><div class="cal-t">${titulo} <span class="sub">menor ${milN(lo)} · maior ${milN(hi)} milhas</span></div>
      ${Object.entries(meses).map(([m, ds]) => `<div class="cal-m"><b>${MESES[+m.slice(5, 7) - 1]} ${m.slice(0, 4)}</b><div class="cal-g">${ds.map(d => {
        const t = hi > lo ? (d.milhas - lo) / (hi - lo) : 0, cls = d.milhas <= lo * 1.05 ? "c-top" : t < .33 ? "c-bom" : t < .66 ? "c-med" : "c-caro";
        return `<span class="cal-d ${cls}" data-tip="${dmy(d.dia)} · ${milN(d.milhas)} milhas + ${brl(d.taxa)}${d.cia ? " · " + esc(d.cia) : ""}${d.paradas === 0 ? " · direto" : d.paradas ? ` · ${d.paradas} parada${d.paradas > 1 ? "s" : ""}` : ""}"><i>${d.dia.slice(8, 10)}</i><small>${milK(d.milhas)}</small></span>`;
      }).join("")}</div></div>`).join("")}</div>`;
  };
  return `<div class="cal-leg"><span><i class="c-top"></i>mais barato</span><span><i class="c-bom"></i>bom</span><span><i class="c-med"></i>médio</span><span><i class="c-caro"></i>caro</span><span class="sub">Milhas por trecho, ${esc(prog)} · + taxas (passe o dedo/mouse no dia)</span></div>
    <div class="cal-2">${faixa(lista("ida"), "Ida · Fortaleza → " + esc(nome))}${faixa(lista("volta"), "Volta · " + esc(nome) + " → Fortaleza")}</div>`;
}
function linhasDestinos(moeda) {
  const V = S.mv || { rotas: {} };
  if (moeda === "real") return destinosStatus().map(x => ({ ...x, real: true }));
  const ks = new Set([...Object.keys(V.rotas || {}), ...((S.ajustes || {}).milhas_destinos || ["SAO", "RIO", "BSB", "REC", "SSA", "LIS", "MIA", "ORL", "BUE", "SCL"])]);
  return [...ks].map(k => {
    const r = ((V.rotas || {})[k] || {})[moeda] || null, ida = r && r.menor_ida, volta = r && r.menor_volta;
    const nome = (S.rotas.find(x => x.iata === k) || {}).nome || IATA[k] || k;
    return { k, nome, r, ida, volta, menor: ida ? ida.milhas : null, d: ida && r.normal_ida ? 1 - ida.milhas / r.normal_ida : 0, normal: r && r.normal_ida, tipo: INTL.has(k) ? "internacional" : "nacional" };
  });
}
function numerosVoos(moeda) {
  const h = hojeISO(), ontem = diaMenos(h, 1), d7 = diaMenos(h, 6);
  let datas, quando, pesq, total;
  if (moeda === "real") {
    const A = S.alertas; quando = A.map(a => a.criado.slice(0, 10));
    const st = Object.values(S.status.rotas || {});
    pesq = st.filter(v => v.menor).length; total = S.rotas.filter(r => r.ativo !== false).length;
    datas = st.reduce((n, v) => n + (v.ofertas || 0), 0);
  } else {
    quando = (S.mi.ofertas || []).filter(o => o.busca_propria && o.para === moeda).map(o => o.publicado.slice(0, 10));
    const rs = Object.values((S.mv || {}).rotas || {}).map(ps => ps[moeda]).filter(Boolean);
    pesq = rs.filter(r => r.menor_ida || r.menor_volta).length; total = ((S.ajustes || {}).milhas_destinos || Array(10)).length;
    datas = rs.reduce((n, r) => n + Object.keys(r.ida || {}).length + Object.keys(r.volta || {}).length, 0);
  }
  const n = f => quando.filter(f).length;
  return { hoje: n(d => d === h), ontem: n(d => d === ontem), d7: n(d => d >= d7), tudo: quando.length, pesq, total, datas };
}
function pontosMapa(moeda) {
  const act = k => `<button class="bt sm" data-act="miabrir" data-iata="${k}">${ic("calendar")}Ver calendário</button>`;
  if (moeda === "real") {
    const ks = new Set([...S.rotas.filter(r => r.ativo !== false).map(r => r.iata), ...Object.keys(S.status.rotas || {})]);
    return [...ks].map(k => { const st = (S.status.rotas || {})[k] || {}, nome = (S.rotas.find(r => r.iata === k) || {}).nome || IATA[k] || k;
      const n = S.alertas.filter(a => a.destino === k && noPeriodo(a.criado)).length;
      return { k, nome, n, estado: n ? "promo" : st.menor ? "base" : "cad", info: st.menor ? `<span>ida a partir de <b>${brl(st.menor)}</b></span>` : "", act: act(k) }; });
  }
  return linhasDestinos(moeda).map(x => { const n = (S.mi.ofertas || []).filter(o => o.busca_propria && o.para === moeda && o.iata === x.k && noPeriodo(o.publicado)).length;
    return { k: x.k, nome: x.nome, n, estado: n ? "promo" : x.ida ? "base" : "cad", info: x.ida ? `<span>ida a partir de <b>${milN(x.ida.milhas)} milhas</b> + ${brl(x.ida.taxa)}</span>` : "", act: act(x.k) }; });
}
function mapaMilhas() { if (MI.sec === "voos") montarMapa("mapa-milhas", pontosMapa(MI.moeda || "real"), COR_MOEDA[MI.moeda || "real"]); }
function secaoVoos() {
  const V = S.mv;
  if (!MI.moeda) MI.moeda = V && Object.keys(V.rotas || {}).length ? "Smiles" : "real";
  const moeda = MI.moeda, real = moeda === "real", cor = COR_MOEDA[moeda], nomeM = MOEDAS.find(m => m[0] === moeda)[1];
  let L = linhasDestinos(moeda);
  const ord = { ofertas: (a, b) => (b.d || 0) - (a.d || 0) || (a.menor || 1e12) - (b.menor || 1e12), preco: (a, b) => (a.menor || 1e12) - (b.menor || 1e12), az: (a, b) => a.nome.localeCompare(b.nome, "pt-BR") }[MI.ordem];
  L.sort(ord);
  const comDados = L.filter(x => x.real || x.ida || x.volta), semDados = L.filter(x => !(x.real || x.ida || x.volta));
  const alertas = real ? [] : (S.mi.ofertas || []).filter(o => o.busca_propria && o.para === moeda && (!MI.ativas || o.ativa !== false));
  const sites = (S.mi.ofertas || []).filter(o => !o.busca_propria && o.fortaleza && (!MI.ativas || o.ativa !== false));
  const N = numerosVoos(moeda);
  let aviso = "";
  if (!real && moeda === "LATAM Pass") aviso = `<div class="aviso warn"><span>${ic("key")} Ainda não temos fornecedor para LATAM Pass. Quando tiver, a chave entra em Ajustes › Integrações.</span><a class="bt sm" href="#ajustes">Integrações</a></div>`;
  else if (!real && !V) aviso = `<div class="aviso warn"><span>${ic("key")} A busca em milhas está pronta, falta só a chave da GeckoAPI (teste grátis).</span><a class="bt sm" href="#ajustes">Colocar a chave</a></div>`;
  else if (!real && V && V.status && V.status !== "ok") aviso = `<div class="aviso warn"><span>${ic("key")} ${{ SEM_CREDITOS: "Os créditos da GeckoAPI acabaram.", CHAVE_INVALIDA: "A chave da GeckoAPI não funcionou." }[V.status] || esc(V.status)}</span><a class="bt sm" href="#ajustes">Integrações</a></div>`;
  const quadro = x => {
    const aberto = MI.sel === x.k;
    const preco = x.real ? `<b>${brl(x.menor)}</b><small>ida · média ${brl(x.mediana)}</small>` : `<b>${milN(x.ida ? x.ida.milhas : x.volta.milhas)}</b><small>milhas + ${brl((x.ida || x.volta).taxa)} · ${x.ida ? "ida" : "volta"}</small>`;
    const volta = x.real ? (x.menor_volta ? `volta ${brl(x.menor_volta)}` : "") : (x.ida && x.volta ? `volta ${milN(x.volta.milhas)} + ${brl(x.volta.taxa)}` : "");
    return `<article class="dest mv-d ${aberto ? "aberto" : ""}" id="mcal-${x.k}">
      <button class="dest-h" data-act="miabrir" data-iata="${x.k}" aria-expanded="${aberto}">
        <span class="dest-n"><span class="micro">${x.k}</span><b>${esc(x.nome)}</b></span>
        <span class="dest-p">${preco}</span>
        ${x.d > 0 ? `<span class="badge ${x.d >= .2 ? "pos" : ""}">−${pct(x.d)}</span>` : `<span></span>`}
        <span class="dest-x sub">${volta}</span>
      </button>
      ${aberto ? `<div class="dest-c">${x.real ? calHTML(S.cal[x.k], x) : calMilhas(x.r, x.nome, moeda)}</div>` : ""}
    </article>`;
  };
  const stat = (n, t, dest = false) => `<div class="mv-s ${dest ? "dest" : ""}"><b>${n}</b><span>${t}</span></div>`;
  return `<div class="mv" style="--prog:${cor}">
    <div class="mv-bar">${MOEDAS.map(([v, t]) => `<button class="mv-m ${moeda === v ? "on" : ""}" data-act="pill" data-g="mim" data-v="${v}" style="--c:${COR_MOEDA[v]}"><i></i>${t}</button>`).join("")}</div>
    ${aviso}
    <div class="mv-nums">${stat(N.hoje, "alertas hoje", true)}${stat(N.ontem, "ontem")}${stat(N.d7, "nos últimos 7 dias")}${stat(N.tudo, "alertas no total")}${stat(`${N.pesq}<small>/${N.total}</small>`, "destinos pesquisados")}${stat(milN(N.datas), "datas com preço")}</div>
    ${mapaHTML("mapa-milhas", `Mapa · ${esc(nomeM)}`, cor)}
    ${alertas.length ? `<h2 class="mv-t">Alertas em milhas · ${esc(nomeM)}</h2><div class="alertas">${alertas.map(cardVoo).join("")}</div>` : ""}
    <div class="mv-head"><h2 class="mv-t">Destinos · ${esc(nomeM)}</h2>
      <div class="ordbar">${pills("miv", MI.vista, [["quadros", "▦ Quadros"], ["lista", "☰ Lista"]])}${pills("mio", MI.ordem, [["ofertas", "Melhores ofertas"], ["preco", "Menor valor"], ["az", "A–Z"]])}</div></div>
    ${comDados.length ? `<div class="dests ${MI.vista === "quadros" ? "grade" : ""}">${comDados.map(quadro).join("")}</div>` : `<div class="card vazio">Nenhum destino com preço em ${esc(nomeM)} ainda.</div>`}
    ${semDados.length ? `<div class="mv-esp"><span class="sub">Aguardando a primeira busca:</span> ${semDados.map(x => `<span class="tag">${esc(x.nome)}</span>`).join("")}</div>` : ""}
    ${!real && V ? `<details class="card" style="margin-top:var(--space-4)"><summary class="sub" style="cursor:pointer">Configurar a busca em milhas · ${V.consultas_hoje || 0} consultas hoje · ${haQuanto(V.atualizado)}</summary>${cfgMilhasHTML()}</details>` : ""}
    ${sites.length ? `<h2 class="mv-t" style="margin-top:28px">Vistos nos sites de milhas · saindo de Fortaleza</h2>
      <div class="mv-sites">${sites.map(o => `<div class="mv-site"><span class="tag">${esc(MI_TIPOS[o.tipo])}</span><span class="t">${esc(o.titulo)}<small>${esc((o.fontes || [o.fonte]).slice(0, 2).join(" · "))} · ${dm(o.publicado)}</small></span>
        <button class="bt sm" data-act="micopiar" data-id="${esc(o.id)}">${ic("copy")}Copiar</button>${o.link ? `<a class="bt sm ghost" target="_blank" rel="noopener" href="${esc(o.link)}">${ic("ext")}Fonte</a>` : ""}</div>`).join("")}</div>` : ""}
  </div>`;
}

/* ---------------- separado: promoções e transferências (lidas de outros sites) */
function secaoPromos() {
  const M = S.mi, todas = (M.ofertas || []).filter(o => !o.busca_propria), ativas = todas.filter(o => o.ativa !== false);
  const bon = ativas.filter(o => o.tipo === "bonus").sort((a, b) => (b.pct || 0) - (a.pct || 0));
  const L = miFiltrar();
  return `<div class="grid kpis">
      ${kpi("Bônus ativos", bon.length, bon[0] ? `maior: ${bon[0].pct}% ${esc([bon[0].de, bon[0].para].filter(Boolean).join(" → "))}` : "nenhum no momento", true, "zap")}
      ${kpi("Promoções ativas", ativas.length, `${todas.length} nos últimos 21 dias`, false, "star")}
      ${kpi("Saindo de Fortaleza", ativas.filter(o => o.fortaleza).length, M.atualizado ? `lido ${haQuanto(M.atualizado)}` : "aguardando primeira leitura", false, "plane")}
    </div>
    <div class="filtros-l">${pills("mi", MI.f, [["todas", "Tudo"], ["bonus", "Bônus de transferência"], ["compra", "Compra de milhas"], ["passagem", "Passagens em milhas"], ["clube", "Clubes"], ["fortaleza", "Saindo de Fortaleza"]])}</div>
    <div class="alertas">${L.map(cardMilha).join("") || `<div class="card vazio">${M.vazio ? "A primeira leitura aparece aqui em breve." : "Nada nesse filtro agora."}</div>`}</div>
    ${M.fontes ? `<p class="sub" style="margin-top:var(--space-4)">Lido de: ${M.fontes.map(f => `${esc(f.fonte)}${f.ok ? "" : " (fora do ar)"}`).filter((x, i, a) => a.indexOf(x) === i).join(" · ")}. Sempre confira as regras no site do programa.</p>` : ""}`;
}

function pMilhas() {
  carregarMilhas();
  if (S.mi.carregando) return head("Milhas", "Carregando…") + `<div class="card vazio">Carregando…</div>`;
  const nVoos = (S.mi.ofertas || []).filter(o => o.busca_propria && o.ativa !== false).length;
  const nProm = (S.mi.ofertas || []).filter(o => !o.busca_propria && o.ativa !== false).length;
  return head("Milhas", "Passagens em milhas saindo de Fortaleza e, separado, as promoções e transferências",
    `<button class="bt" data-act="miatualizar">${ic("refresh")}Atualizar promoções</button>`) +
    `<div class="filtros-l">${pills("mis", MI.sec, [["voos", `Passagens saindo de FOR${nVoos ? ` · ${nVoos}` : ""}`], ["promos", `Promoções e transferências${nProm ? ` · ${nProm}` : ""}`]])}
      <label class="chk"><input type="checkbox" data-mi-ativas ${MI.ativas ? "checked" : ""}> Só o que ainda vale</label></div>
    ${MI.sec === "voos" ? secaoVoos() : secaoPromos()}`;
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
      if (o.busca_propria) { CR.tpl = "livre"; CR.txt = { ideia: `${(o.destino || "").toUpperCase()}\n${milN(o.milhas)} milhas + ${brl(o.taxa)} o trecho\nSaindo de Fortaleza · ${o.para}\nAlertas de milhas no grupo do 085` }; location.hash = "#criativos"; return; }
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
    else if (act === "miabrir") {
      MI.sel = MI.sel === b.dataset.iata ? "" : b.dataset.iata;
      if (MI.sel && MI.moeda === "real") await carregarCal(MI.sel);
      render(); setTimeout(() => { const el = document.getElementById("mcal-" + MI.sel); if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, 50);
    }
    else if (act === "misalvarcfg") {
      const v = k => ($(`[data-mic="${k}"]`) || {}).value;
      S.ajustes.milhas_destinos = String(v("milhas_destinos") || "").toUpperCase().split(/[\s,;]+/).filter(x => /^[A-Z]{3}$/.test(x));
      S.ajustes.milhas_buscas_por_rodada = Math.max(1, Math.min(30, +v("milhas_buscas_por_rodada") || 4));
      S.ajustes.milhas_desconto = Math.max(0.05, Math.min(0.6, +String(v("milhas_desconto")).replace(",", ".") || 0.25));
      b.disabled = true; await salvarArquivo("docs/ajustes.json", S.ajustes, "Painel: ajustes da busca em milhas"); toast("Busca em milhas configurada."); b.disabled = false;
    }
  } catch (err) { toast("Erro: " + err.message, 5000); b.disabled = false; }
});
document.addEventListener("input", e => { if (e.target.dataset.miAtivas !== undefined) { MI.ativas = e.target.checked; render(); } });
document.addEventListener("click", e => { const b = e.target.closest('[data-act="pill"][data-g^="mi"]'); if (!b) return; const g = b.dataset.g, v = b.dataset.v;
  if (g === "mis") MI.sec = v; else if (g === "mim") { MI.moeda = v; MI.sel = ""; } else if (g === "mio") MI.ordem = v; else if (g === "miv") { MI.vista = v; try { localStorage.setItem("p085_vista_milhas", v); } catch (x) { } } else MI.f = v; }, true);
