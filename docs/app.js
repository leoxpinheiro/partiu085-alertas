/* Radar Partiu085 — painel (GitHub Pages + API do GitHub para salvar) */
"use strict";
const REPO = "leoxpinheiro/partiu085-alertas";
const ORIGEM = "FOR";
const META_DIA = 6;
const API = "https://api.github.com/repos/" + REPO;

const S = {
  alertas: [], rotas: [], ajustes: {}, status: { rotas: {} }, hist: {}, rodadas: [],
  rotasSujo: false, ajustesSujo: false,
  F: { q: "", tipo: "", classe: "", cia: "", mes: "", max: "", direto: false, ordem: "recentes", dias: "30", env: "" },
  marcados: {}, grupos: null, gruposSujo: false, rodando: false,
  R: { ordem: "az", tipo: "" }, D: { ordem: "ofertas", tipo: "", q: "", sel: "" }, dashOrd: "ofertas", cal: {},
  histRota: "", conv: null,
};

/* ------------------------------------------------------------ util */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const brl = v => "R$ " + Math.round(+v || 0).toLocaleString("pt-BR");
const taxaR = t => t == null || t === "" ? "taxas" : brl(t);
const pct = v => Math.round((+v || 0) * 100) + "%";
const dm = s => s ? s.slice(8, 10) + "/" + s.slice(5, 7) : "";
const dmy = s => s ? s.slice(8, 10) + "/" + s.slice(5, 7) + "/" + s.slice(0, 4) : "";
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function hojeISO() { return new Date(Date.now() - 3 * 36e5).toISOString().slice(0, 10); }
function diaMenos(iso, n) { return new Date(new Date(iso + "T12:00:00Z").getTime() - n * 864e5).toISOString().slice(0, 10); }
function haQuanto(iso) {
  if (!iso) return "–";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 6e4);
  if (m < 1) return "agora"; if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60); if (h < 24) return `há ${h}h`;
  return `há ${Math.round(h / 24)} dia${h >= 48 ? "s" : ""}`;
}
function proximaRodada() {
  const n = new Date(); const t = new Date(n);
  t.setUTCMinutes(17, 0, 0);
  while (t <= n || t.getUTCHours() % 3 !== 0) t.setUTCHours(t.getUTCHours() + 1);
  const m = Math.round((t - n) / 6e4);
  return m < 60 ? `em ${m} min` : `em ${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
}
function store(k, v) { try { v === undefined ? localStorage.getItem(k) : localStorage.setItem(k, v); } catch (e) { } }
function load(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
function toast(msg, ms = 2600) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("show"), ms); }
async function copiar(txt) {
  try { await navigator.clipboard.writeText(txt); } catch (e) {
    const a = document.createElement("textarea"); a.value = txt; document.body.appendChild(a); a.select(); document.execCommand("copy"); a.remove();
  }
}
const nomeCia = c => c || "—";
const paradasTxt = n => n === 0 ? "voo direto" : `${n} parada${n > 1 ? "s" : ""}`;

/* aeroportos para autocompletar o cadastro */
const IATA = {
  SAO: "São Paulo", GRU: "São Paulo (Guarulhos)", CGH: "São Paulo (Congonhas)", VCP: "Campinas", RIO: "Rio de Janeiro", GIG: "Rio (Galeão)", SDU: "Rio (Santos Dumont)",
  BSB: "Brasília", BHZ: "Belo Horizonte", CNF: "Belo Horizonte (Confins)", SSA: "Salvador", REC: "Recife", NAT: "Natal", JPA: "João Pessoa", MCZ: "Maceió",
  AJU: "Aracaju", SLZ: "São Luís", THE: "Teresina", BEL: "Belém", MAO: "Manaus", POA: "Porto Alegre", CWB: "Curitiba", FLN: "Florianópolis", VIX: "Vitória",
  GYN: "Goiânia", IGU: "Foz do Iguaçu", FEN: "Fernando de Noronha", JDO: "Juazeiro do Norte", JJD: "Jericoacoara", BPS: "Porto Seguro", IOS: "Ilhéus",
  CGB: "Cuiabá", CGR: "Campo Grande", PMW: "Palmas", MCP: "Macapá", BVB: "Boa Vista", PVH: "Porto Velho", RBR: "Rio Branco", NVT: "Navegantes", UDI: "Uberlândia",
  LIS: "Lisboa", OPO: "Porto", MAD: "Madri", BCN: "Barcelona", PAR: "Paris", CDG: "Paris (CDG)", ROM: "Roma", MIL: "Milão", LON: "Londres", AMS: "Amsterdã",
  FRA: "Frankfurt", BRU: "Bruxelas", ZRH: "Zurique", IST: "Istambul", DXB: "Dubai", MIA: "Miami", ORL: "Orlando", MCO: "Orlando", NYC: "Nova York", FLL: "Fort Lauderdale",
  BOS: "Boston", LAX: "Los Angeles", BUE: "Buenos Aires", EZE: "Buenos Aires (Ezeiza)", AEP: "Buenos Aires (Aeroparque)", SCL: "Santiago", LIM: "Lima",
  BOG: "Bogotá", CTG: "Cartagena", MDE: "Medellín", ADZ: "San Andrés", PTY: "Cidade do Panamá", CUN: "Cancún", MEX: "Cidade do México", MVD: "Montevidéu",
  PUJ: "Punta Cana", SDQ: "Santo Domingo", HAV: "Havana", SID: "Cabo Verde (Sal)", RAI: "Praia (Cabo Verde)", CPT: "Cidade do Cabo", JNB: "Joanesburgo",
  ASU: "Assunção", LPB: "La Paz", VVI: "Santa Cruz", CUZ: "Cusco", UIO: "Quito", AUA: "Aruba", CUR: "Curaçao", TYO: "Tóquio", BKK: "Bangkok",
};
const INTL = new Set(["LIS","OPO","MAD","BCN","PAR","CDG","ROM","MIL","LON","AMS","FRA","BRU","ZRH","IST","DXB","MIA","ORL","MCO","NYC","FLL","BOS","LAX","BUE","EZE","AEP","SCL","LIM","BOG","CTG","MDE","ADZ","PTY","CUN","MEX","MVD","PUJ","SDQ","HAV","SID","RAI","CPT","JNB","ASU","LPB","VVI","CUZ","UIO","AUA","CUR","TYO","BKK"]);
const PRESETS = {
  "Nordeste": ["REC", "NAT", "JPA", "MCZ", "AJU", "SSA", "SLZ", "THE", "FEN", "BPS"],
  "Sudeste e Sul": ["SAO", "RIO", "BHZ", "VIX", "CWB", "FLN", "POA", "IGU", "NVT"],
  "Europa": ["LIS", "OPO", "MAD", "BCN", "PAR", "ROM", "MIL", "LON", "AMS", "FRA"],
  "América do Sul": ["BUE", "SCL", "LIM", "BOG", "CTG", "MDE", "MVD", "CUZ", "ASU"],
  "EUA e Caribe": ["MIA", "ORL", "NYC", "CUN", "PTY", "PUJ", "AUA", "CUR"],
};

/* ------------------------------------------------------------ GitHub (salvar) */
const token = () => load("p085_token");
function b64(str) { return btoa(unescape(encodeURIComponent(str))); }
async function gh(path, opts = {}) {
  const r = await fetch(API + path, {
    ...opts, headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + token(), ...(opts.headers || {}) },
  });
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.message || ("HTTP " + r.status)); }
  return r.status === 204 ? {} : r.json();
}
async function salvarArquivo(path, obj, msg) {
  if (!token()) throw new Error("Configure o token do GitHub em Ajustes.");
  let sha;
  try { sha = (await gh(`/contents/${path}?ref=main&t=${Date.now()}`)).sha; } catch (e) { }
  const body = { message: msg, content: b64(JSON.stringify(obj, null, 1) + "\n"), branch: "main" };
  if (sha) body.sha = sha;
  return gh(`/contents/${path}`, { method: "PUT", body: JSON.stringify(body) });
}
async function rodarRadar(rotas = "") {
  if (!token()) { toast("Configure o token do GitHub em Ajustes primeiro."); location.hash = "#ajustes"; return; }
  document.body.classList.add("voando");
  await gh("/actions/workflows/alertas.yml/dispatches", { method: "POST", body: JSON.stringify({ ref: "main", inputs: { rotas } }) });
  toast(rotas ? `Buscando ${rotas} agora… os alertas aparecem em ~3 min.` : "Rodada completa iniciada… leva ~10 min.", 4200);
  setTimeout(checarRodando, 4000);
}
async function rodarTurbo() {
  if (!token()) { toast("Configure o token do GitHub em Ajustes primeiro."); location.hash = "#ajustes"; return; }
  await gh("/actions/workflows/varredura.yml/dispatches", { method: "POST", body: JSON.stringify({ ref: "main", inputs: { robos: "8" } }) });
  document.body.classList.add("voando"); setTimeout(checarRodando, 5000);
  toast("Varredura turbo iniciada: 8 robôs varrendo todas as rotas (~25 min). Não gera alertas, monta a base de preços.", 6000);
}
async function checarRodando() {
  try {
    const r = await fetch(API + "/actions/runs?per_page=3", { headers: { Accept: "application/vnd.github+json" } }).then(r => r.json());
    const rodando = (r.workflow_runs || []).some(w => w.status !== "completed" && /^(Alertas|Varredura)/.test(w.name));
    S.rodando = rodando; document.body.classList.toggle("voando", rodando);
    const p = $("#pulse"); if (p) p.innerHTML = rodando ? `<span class="aviaozinho">${ic("plane", "i sm")}</span>Varrendo os céus…` : `<span class="dot"></span>Última varredura ${haQuanto(S.ultima)} · roda a cada 3h`;
    if (rodando) setTimeout(checarRodando, 30000);
  } catch (e) { }
}

/* ------------------------------------------------------------ marcados como enviados */
let _salvarMarc;
function marcar(id, valor = true) {
  if (valor === "descartado") S.marcados[id] = "descartado"; else if (valor) S.marcados[id] = new Date().toISOString(); else S.marcados[id] = null;
  try { localStorage.setItem("p085_marcados", JSON.stringify(S.marcados)); } catch (e) { }
  const card = document.querySelector(`article.al[data-id="${CSS.escape(id)}"]`);
  if (card && !card.closest(".al-row")) card.outerHTML = cardAlerta(S.alertas.find(a => a.id === id), card.dataset.compacto === "1");
  const row = document.querySelector(`article.al-row[data-id="${CSS.escape(id)}"]`);
  const al = S.alertas.find(a => a.id === id);
  if (row && al) row.outerHTML = linhaAlerta(al);
  clearTimeout(_salvarMarc);
  if (token()) _salvarMarc = setTimeout(async () => {
    const limpo = Object.fromEntries(Object.entries(S.marcados).filter(([, v]) => v));
    try { await salvarArquivo("docs/marcados.json", limpo, "Painel: marca alertas enviados"); } catch (e) { toast("Marcado só neste aparelho: " + e.message, 4000); }
  }, 2500);
}
const enviado = a => !!S.marcados[a.id];

/* ------------------------------------------------------------ texto final (rodapé e aviso configuráveis) */
const RODAPE_PADRAO = "✈️ Receba alertas no WhatsApp: {link}";
const AVISO_PADRAO = "⚠️ _Preço pode mudar a qualquer momento._";
function textoFinal(t, tipo) {
  const aj = S.ajustes || {};
  if (!t) return t;
  let L = String(t).split("\n");
  const ass = (aj.assinatura || "").trim();
  // tira o rodapé antigo (link do grupo / assinatura) do fim
  while (L.length && (L[L.length - 1].trim() === "" || /Receba alertas no WhatsApp|bit\.ly\/radar085/i.test(L[L.length - 1]) || (ass && L[L.length - 1].trim() === ass) || (aj._rodape_ant && aj._rodape_ant.split("\n").includes(L[L.length - 1])))) L.pop();
  if (tipo === "dinheiro") {
    const av = aj.aviso_preco ?? AVISO_PADRAO;
    L = L.flatMap(l => /Preço pode mudar a qualquer momento/.test(l) ? (av.trim() ? [av] : []) : [l]);
  }
  const milhas = tipo === "milhas";
  const link = (milhas ? aj.link_whatsapp_milhas : "") || aj.link_whatsapp || "https://bit.ly/radar085";
  const rod = ((milhas ? aj.rodape_milhas : "") || aj.rodape || RODAPE_PADRAO).replace(/\{link\}/g, link).trim();
  const out = L.join("\n").replace(/\n{3,}/g, "\n\n");
  return rod ? out + "\n\n" + rod : out;
}
function montarTextoDinheiro(a) {
  if (!a || !a.ida_meses || !a.ida_meses.length) return null;
  const aj = S.ajustes || {}, esc_ = a.escalas;
  const paradas = esc_ === 0 ? "voo direto" : esc_ ? `${esc_} parada${esc_ > 1 ? "s" : ""}` : "";
  const k = a.classe || "boa", rot = { imperdivel: ["🔥", "IMPERDÍVEL"], otima: ["⭐", "ÓTIMA OPORTUNIDADE"], boa: ["✅", "BOA OPORTUNIDADE"] }[k];
  const curto = g => { const [n, y] = g.mes.split(" "); return y ? `${n}/${y.slice(2)}` : n; };
  const L = ["🚨 *O RADAR APITOU!*", "", `✈️ *Fortaleza ➜ ${a.destino_nome}* (${a.destino})`, `💰 *${brl(a.preco)}* o trecho`];
  if (a.preco_volta) L.push(`🔁 Ida e volta a partir de *${brl(a.preco + a.preco_volta)}*`);
  L.push(`${rot[0]} *${rot[1]}*`);
  L.push(`🛫 ${a.cia_nome || "—"}${paradas ? " · " + paradas : ""}`);
  if (a.recorde && a.base) L.push(`📉 _Menor preço que já vimos nesse trecho (${a.base.dias} dias de pesquisa)_`);
  if (a.vip) L.push("🎯 _Rota acompanhada a pedido dos assinantes VIP_");
  L.push("", "🗓️ *IDA*", ...a.ida_meses.map(g => `▸ ${curto(g)}: ${g.dias.join(", ")}`));
  if (a.volta_meses && a.volta_meses.length) L.push("", "🗓️ *VOLTA*", ...a.volta_meses.map(g => `▸ ${curto(g)}: ${g.dias.join(", ")}`));
  const av = aj.aviso_preco ?? AVISO_PADRAO; if (av.trim()) L.push("", av.trim());
  if (aj.mostrar_link && a.link_google) L.push(`🔗 ${a.link_google}`);
  return L.join("\n");
}
function reaplicarTextos() {
  S.alertas.forEach(a => { a.texto = textoFinal(montarTextoDinheiro(a) || a.texto0 || a.texto, "dinheiro"); });
  if (S.mi && S.mi.ofertas) S.mi.ofertas.forEach(o => { o.texto = textoFinal(o.texto0 || o.texto, "milhas"); });
}

/* ------------------------------------------------------------ dados */
async function getJSON(f, padrao) {
  try { const r = await fetch(f + "?t=" + Date.now()); if (!r.ok) throw 0; return await r.json(); } catch (e) { return padrao; }
}
async function carregar() {
  const [a, r, aj, st, h, rd, mk, gp] = await Promise.all([
    getJSON("alerts.json", { alertas: [] }), getJSON("rotas.json", []), getJSON("ajustes.json", {}),
    getJSON("status.json", { rotas: {} }), getJSON("historico.json", {}), getJSON("rodadas.json", []), getJSON("marcados.json", {}), getJSON("grupos.json", null),
  ]);
  S.alertas = (a.alertas || []).map(x => ({ ...x, texto0: x.texto, ida: x.ida || (x.datas && x.datas[0] && x.datas[0].ida), volta: x.volta || (x.datas && x.datas[0] && x.datas[0].volta) }))
    .sort((x, y) => y.criado.localeCompare(x.criado));
  if (!S.rotasSujo) S.rotas = r;
  if (!S.ajustesSujo) S.ajustes = aj;
  S.H = S.H || { ordem: "queda", aberto: "" };
  S.status = st || { rotas: {} }; S.hist = h || {}; S.rodadas = rd || [];
  let local = {}; try { local = JSON.parse(load("p085_marcados") || "{}"); } catch (e) { }
  S.marcados = { ...(mk || {}), ...local };
  if (!S.gruposSujo) S.grupos = gp || GRUPOS_PADRAO.map(g => ({ ...g }));
  S.ultima = S.status.ultima_rodada || a.atualizado;
  S.pri = (await getJSON("prioridades.json", { prioridades: {} })).prioridades || {};
  reaplicarTextos();
}

/* ------------------------------------------------------------ ícones (traço fino, sprite no index.html) */
const ic = (n, cls = "i") => `<svg class="${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

/* ------------------------------------------------------------ navegação */
const MENU = [
  ["", [["dashboard", "grid", "Início"], ["enviar", "send", "Modo envio"]]],
  ["Dinheiro", [["alertas", "bell", "Alertas"], ["destinos", "globe", "Preços por destino"], ["historico", "chart", "Histórico"]], "#22C55E"],
  ["Milhas", [["milhas", "coins", "Alertas"], ["promocoes", "zap", "Promoções"]], "#FF7A00"],
  ["Divulgação", [["marketing", "calendar", "Calendário de posts"], ["criativos", "image", "Criar arte"], ["converter", "swap", "Converter texto"], ["grupos", "users", "Grupos e links"]], "#A78BFA"],
  ["Configuração", [["rotas", "plane", "Rotas vigiadas"], ["ajustes", "gear", "Ajustes e APIs"]], "#94A3B8"],
];
const PAGS = MENU.flatMap(g => g[1]);
function contadorMenu(k) {
  const h = hojeISO();
  if (k === "enviar") return typeof filaModoEnvio === "function" ? filaModoEnvio().length : 0;
  if (k === "alertas") return S.alertas.filter(a => a.criado.slice(0, 10) === h && !enviado(a)).length;
  if (k === "milhas") return S.mi && !S.mi.carregando ? (S.mi.ofertas || []).filter(o => o.busca_propria && o.ativa !== false && !enviado(o)).length : 0;
  if (k === "promocoes") return S.mi && !S.mi.carregando ? (S.mi.ofertas || []).filter(o => !o.busca_propria && o.ativa !== false && !enviado(o)).length : 0;
  return 0;
}
function navs() {
  const pag = (location.hash || "#dashboard").slice(1).split("?")[0] || "dashboard";
  $("#rail").innerHTML = `<div class="side-top"><a class="side-brand" href="#dashboard"><img class="mark-img" src="marca/icone.png" alt=""><span><b>Partiu 085</b><small>Radar de passagens</small></span></a>
      <button class="side-tema" data-act="tema" title="Tema claro/escuro" aria-label="Tema claro/escuro">${ic("moon")}</button></div>` +
    MENU.map(([t, itens, cor]) => `<div class="side-g ${t ? "box" : ""}" style="--c:${cor || "transparent"}">${t ? `<div class="side-t">${t}</div>` : ""}${itens.map(([k, i, n]) => { const c = contadorMenu(k);
      return `<a href="#${k}" class="${pag === k ? "on" : ""}">${ic(i)}<span>${n}</span>${c ? `<b class="cnt" title="ainda não enviados">${c}</b>` : ""}</a>`; }).join("")}</div>`).join("");
  const cAl = contadorMenu("alertas"), cMi = contadorMenu("milhas");
  $("#bottom").innerHTML = `<a href="#dashboard" class="${pag === "dashboard" ? "on" : ""}" aria-label="Início">${ic("grid")}<small>Início</small></a>
    <a href="#alertas" class="${pag === "alertas" ? "on" : ""}" aria-label="Alertas">${ic("bell")}<small>Dinheiro</small>${cAl ? `<b class="cnt">${cAl}</b>` : ""}</a>
    <button class="fab" data-act="rodar" aria-label="Rodar radar agora">${ic("play")}</button>
    <a href="#milhas" class="${pag === "milhas" ? "on" : ""}" aria-label="Milhas">${ic("coins")}<small>Milhas</small>${cMi ? `<b class="cnt">${cMi}</b>` : ""}</a>
    <button data-act="menu" aria-label="Menu">${ic("more")}<small>Menu</small></button>`;
  document.body.classList.remove("menu-aberto");
  return pag;
}
function render() {
  const pag = navs();
  const fn = { dashboard: pDash, alertas: pAlertas, rotas: pRotas, historico: pHist, converter: pConv, ajustes: pAjustes, criativos: pCriativos, destinos: pDestinos, grupos: pGrupos, marketing: pMarketing, milhas: pMilhas, promocoes: pPromocoes, enviar: pEnviar }[pag] || pDash;
  if (pag === "criativos") setTimeout(desenharCriativo, 30);
  $("#main").innerHTML = fn();
  if (pag === "milhas" && typeof mapaMilhas === "function") setTimeout(mapaMilhas, 0);
  if (pag === "converter" && typeof desenharImportados === "function") setTimeout(desenharImportados, 0);
  if (pag === "enviar" && typeof evImagem === "function") setTimeout(evImagem, 0);
  if (pag === "destinos" && typeof mapaDestinos === "function") setTimeout(mapaDestinos, 0);
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", render);

/* ------------------------------------------------------------ componentes */
function avisoConta() {
  if (!token()) return `<div class="aviso warn conta">${ic("key")}<span>Este aparelho não está conectado: o que você marcar como enviado fica só aqui e não aparece no celular/computador. </span><a class="bt sm" href="#ajustes">Conectar</a></div>`;
  if (S.tokenVence != null && S.tokenVence <= 10) return `<div class="aviso warn conta">${ic("key")}<span>Seu token do GitHub vence em ${S.tokenVence} dia${S.tokenVence === 1 ? "" : "s"}. Depois disso o painel para de salvar (o radar continua rodando). Gere um novo e cole em Ajustes.</span><a class="bt sm" href="#ajustes">Ajustes</a></div>`;
  return "";
}
function head(t, p, acts = "") { return avisoConta() + `<div class="head"><div><h1>${t}</h1><p>${p}</p></div><div class="acts">${acts}</div></div>`; }
function pills(grupo, atual, opcoes) {
  return `<div class="pills" role="group">${opcoes.map(([v, t]) => `<button class="pill ${atual === v ? "on" : ""}" data-act="pill" data-g="${grupo}" data-v="${v}">${t}</button>`).join("")}</div>`;
}
const ORDENS_DEST = [["ofertas", "Melhores ofertas"], ["preco", "Menor valor"], ["az", "A–Z"]];
function ordenarDest(lista, ordem) {
  const f = { ofertas: (a, b) => b.d - a.d, preco: (a, b) => a.menor - b.menor, az: (a, b) => a.nome.localeCompare(b.nome, "pt-BR"), recente: (a, b) => (b.quando || "").localeCompare(a.quando || "") }[ordem] || ((a, b) => b.d - a.d);
  return lista.slice().sort(f);
}
function destinosStatus() {
  return Object.entries(S.status.rotas || {}).filter(([, v]) => v.menor && v.mediana)
    .map(([k, v]) => { const r = S.rotas.find(x => x.iata === k) || {}; return { k, ...v, d: 1 - v.menor / v.mediana, nome: r.nome || v.nome || IATA[k] || k, tipo: r.tipo || v.tipo || (INTL.has(k) ? "internacional" : "nacional"), foco: !!r.foco }; });
}
function statusPill() { return `<span class="status" id="pulse"><span class="dot"></span>Última varredura ${haQuanto(S.ultima)} · roda a cada 3h</span>`; }
function kpi(lbl, num, sub = "", acc = false, icone = "bell") { return `<div class="card kpi ${acc ? "lime" : ""}"><div class="kpi-h"><span>${lbl}</span><span class="kpi-ic">${ic(icone)}</span></div><div class="num">${num}</div><div class="sub">${sub}</div></div>`; }
function hbars(pares, vazio = "Sem dados ainda") {
  if (!pares.length) return `<div class="vazio">${vazio}</div>`;
  const max = Math.max(...pares.map(p => p[1]));
  const ini = n => n.replace(/[^A-Za-zÀ-ú ]/g, "").split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  return `<div class="rows">${pares.map(([n, v], i) => `<div class="row" data-tip="${esc(n)}: ${v} alerta${v > 1 ? "s" : ""}"><span class="av ${i ? "n" : ""}">${esc(ini(n))}</span><span class="t"><b>${esc(n)}</b><span class="prog"><i style="width:${(v / max) * 100}%"></i></span></span><span class="r">${v}<small>alerta${v > 1 ? "s" : ""}</small></span></div>`).join("")}</div>`;
}
function contar(lista, fn) { const m = {}; lista.forEach(x => { const k = fn(x); if (k) m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); }

function mesesHTML(lista, compacto) {
  return (lista || []).slice(0, compacto ? 2 : 6).map(g => `<div class="mesrow"><b>${esc(g.mes)}</b><span>${g.dias.map(d => `<i>${d}</i>`).join("")}</span></div>`).join("");
}
let ALV = "lista";
try { ALV = localStorage.getItem("p085_vista_alertas") || "lista"; } catch (e) { }
function resumoDatas(meses, max = 6) {
  const L = []; (meses || []).forEach(g => g.dias.forEach(d => L.push(`${d}/${MESES[["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"].indexOf(g.mes.split(" ")[0])] || ""}`)));
  return L.length ? L.slice(0, max).join(", ") + (L.length > max ? ` <b>+${L.length - max}</b>` : "") : "";
}
function linhaAlerta(a) {
  ENV_REG[a.id] = a;
  const k = a.classe || "boa", env = enviado(a), aberto = S.alAberto === a.id, trecho = a.modo === "trecho";
  const ida = trecho ? resumoDatas(a.ida_meses) : (a.datas || []).slice(0, 4).map(d => dm(d.ida)).join(", ");
  const volta = trecho ? resumoDatas(a.volta_meses, 4) : "";
  const subiu = a.conferido && a.conferido.status === "subiu";
  return `<article class="al-row ${k} ${env ? "enviado" : ""} ${subiu ? "subiu" : ""} ${aberto ? "aberto" : ""}" data-id="${esc(a.id)}">
    <div class="alr">
      <button class="alr-dest" data-act="alabrir" data-id="${esc(a.id)}" title="Ver detalhes"><span class="rt">FOR → ${esc(a.destino)}${a.vip ? " · ⭐ VIP" : ""}</span><b>${esc(a.destino_nome)}</b></button>
      <div class="alr-preco"><b>${brl(a.preco)}</b><small>${trecho ? "o trecho" : "ida e volta"} · média ${brl(a.preco_tipico)}</small></div>
      <span class="tag ${k}">−${pct(a.desconto)}</span>
      <div class="alr-info"><span>${a.conferido && a.conferido.status === "subiu" ? `<b class="neg">subiu p/ ${brl(a.conferido.preco)}</b> · ` : a.conferido && a.conferido.status === "valendo" ? `<b class="pos">✓ ainda valendo</b> · ` : ""}${a.recorde ? "📉 menor já visto · " : ""}${esc(nomeCia(a.cia_nome))} · ${paradasTxt(a.escalas)}</span><small>${ida ? `ida ${ida}` : ""}${volta ? ` · volta ${volta}` : ""}</small></div>
      <div class="alr-acts">
        <button class="bt sm" data-act="copiar" data-id="${esc(a.id)}" title="Copiar texto">${ic("copy")}<span>Copiar</span></button>
        <button class="bt sm zap" data-act="envabrir" data-id="${esc(a.id)}" title="Enviar com imagem (imagem + texto)">${ic("image")}<span>Enviar</span></button>
        <button class="bt sm ${env ? "ok" : "ghost"}" data-act="marcar" data-id="${esc(a.id)}" title="${env ? "Enviado (toque para desfazer)" : "Marcar como enviado"}">${ic(env ? "check" : "circle")}<span>${env ? (S.marcados[a.id] === "descartado" ? "Descartado" : "Enviado") : "Marcar"}</span></button>
        ${(Date.now() - new Date(a.criado).getTime()) > 6 * 36e5 && !env ? `<button class="bt sm ghost" data-act="buscarrota" data-iata="${esc(a.destino)}" title="Buscar o preço de novo agora">${ic("refresh")}</button>` : ""}
        <button class="bt sm ghost alr-x" data-act="alabrir" data-id="${esc(a.id)}" title="Ver datas e texto">${aberto ? "▴" : "▾"}</button>
      </div>
    </div>
    ${aberto ? `<div class="alr-c">${cardAlerta(a)}</div>` : ""}
  </article>`;
}
function cardAlerta(a, compacto = false) {
  ENV_REG[a.id] = a;
  const k = a.classe || "boa";
  const ktxt = { imperdivel: "Imperdível", otima: "Ótima", boa: "Boa" }[k];
  const trecho = a.modo === "trecho";
  const corpo = trecho
    ? `<div class="idavolta"><div><div class="iv-h">${ic("up", "i sm")} Datas de ida <small>a partir de ${brl(a.preco)}</small></div>${mesesHTML(a.ida_meses, compacto)}</div>
       <div><div class="iv-h">${ic("downl", "i sm")} Datas de volta <small>a partir de ${brl(a.preco_volta)}</small></div>${mesesHTML(a.volta_meses, compacto)}</div></div>`
    : `<div class="datas">${(a.opcoes && a.opcoes.length ? a.opcoes : (a.datas || [])).slice(0, compacto ? 4 : 10).map(d => `<span class="${d.ida === a.ida ? "main" : ""}">${dm(d.ida)} → ${dm(d.volta)}</span>`).join("")}</div>`;
  const env = enviado(a);
  return `<article class="al ${k} ${env ? "enviado" : ""}" data-id="${esc(a.id)}" data-compacto="${compacto ? 1 : 0}">
    ${env ? `<div class="env-faixa">${ic("check", "i sm")}${S.marcados[a.id] === "descartado" ? "Tirado da fila (não enviado)" : "Enviado no grupo · " + new Date(S.marcados[a.id]).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>` : ""}
    <div class="al-top">
      <div><div class="rt">${ORIGEM} → ${esc(a.destino)} · ${a.tipo === "internacional" ? "INTERNACIONAL" : "NACIONAL"}</div><div class="ds">${esc(a.destino_nome)}</div></div>
      <div class="preco">${brl(a.preco)}<small>${trecho ? "o trecho · " : ""}média ${brl(a.preco_tipico)}</small></div>
    </div>
    <div class="tags">
      <span class="tag ${k}">${ktxt} · −${pct(a.desconto)} ↘</span>
      <span class="tag">${esc(nomeCia(a.cia_nome))}</span><span class="tag">${paradasTxt(a.escalas)}</span>
      ${a.vip ? `<span class="tag vip-t">${ic("star", "i sm")}Pedido VIP${a.vip_nome ? " · " + esc(a.vip_nome) : ""}</span>` : ""}
      ${a.telegram ? `<span class="tag">${ic("check", "i sm")}Telegram</span>` : ""}
      ${a.conferido ? (a.conferido.status === "valendo" ? `<span class="tag ok-t">${ic("check", "i sm")}Ainda valendo · conferido ${haQuanto(a.conferido.quando)}</span>` : `<span class="tag neg-t">Subiu para ${brl(a.conferido.preco)} · ${haQuanto(a.conferido.quando)}</span>`) : ""}
    </div>
    ${corpo}
    <div class="al-acts">
      <button class="bt sm" data-act="copiar" data-id="${esc(a.id)}">${ic("copy")}<span>Copiar</span></button>
      <button class="bt sm zap" data-act="envabrir" data-id="${esc(a.id)}" title="Enviar com imagem (imagem + texto)">${ic("image")}<span>Enviar</span></button>
      <a class="bt sm" target="_blank" rel="noopener" href="${esc(a.link_google)}">${ic("ext")}Google Voos</a>
      <button class="bt sm ${env ? "ok" : "ghost"}" data-act="marcar" data-id="${esc(a.id)}">${ic(env ? "check" : "circle")}${env ? "Enviado" : "Marcar enviado"}</button>
      ${compacto ? "" : `<button class="bt sm ghost" data-act="vertexto" data-id="${esc(a.id)}">Ver texto</button>`}
      <a class="bt sm ghost" href="#criativos?id=${encodeURIComponent(a.id)}">${ic("image")}Banner</a>
    </div>
    <div class="texto" id="tx-${esc(a.id)}" hidden>${esc(a.texto)}</div>
    <div class="quando"><span>Encontrado ${a.criado.slice(0, 10) === hojeISO() ? "hoje" : dm(a.criado)} às ${a.criado.slice(11, 16)}</span>${a.link_compra ? `<a href="${esc(a.link_compra)}" target="_blank" rel="noopener">link de compra ↗</a>` : ""}</div>
  </article>`;
}

/* ------------------------------------------------------------ Dashboard */
function filaEnvio() {
  const lim = diaMenos(hojeISO(), 1);
  const L = S.alertas.filter(a => a.criado.slice(0, 10) >= lim && !enviado(a) && !(a.conferido && a.conferido.status === "subiu")).map(a => ({ id: a.id, tipo: "dinheiro", cor: "#16A34A", rot: "Dinheiro", t: `${a.destino_nome}`, v: `${brl(a.preco)} o trecho`, d: a.desconto ? `−${pct(a.desconto)}` : "", q: a.criado, texto: a.texto, link: "#alertas" }));
  if (S.mi && !S.mi.carregando) (S.mi.ofertas || []).filter(o => o.ativa !== false && !enviado(o) && (o.busca_propria || o.publicado.slice(0, 10) >= lim)).forEach(o => L.push(o.busca_propria
    ? { id: o.id, tipo: "milhas", cor: COR_MOEDA[o.para] || "#FF7A00", rot: o.para, t: o.destino, v: `${milN(o.milhas)} milhas + ${taxaR(o.taxa)}`, d: o.desconto ? `−${pct(o.desconto)}` : "", q: o.publicado, texto: o.texto, link: "#milhas" }
    : { id: o.id, tipo: "promo", cor: "#8B5CF6", rot: MI_TIPOS[o.tipo], t: ([o.de, o.para].filter(Boolean).join(" → ") + (o.pct ? ` ${o.pct}%` : "")).trim() || (o.destino ? `${o.destino}${o.milhas ? " " + milN(o.milhas) + " milhas" : ""}` : o.titulo.slice(0, 40)), v: o.pct ? `${o.pct}%` : o.milhas ? `${milN(o.milhas)} milhas` : "", d: "", q: o.publicado, texto: o.texto, link: "#promocoes" }));
  return L.sort((x, y) => y.q.localeCompare(x.q));
}
function pDash() {
  carregarMilhas();
  const h = hojeISO(), A = S.alertas;
  const fila = filaEnvio();
  const enviadosHoje = Object.values(S.marcados).filter(v => v && v.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
  const miHoje = S.mi && !S.mi.carregando ? (S.mi.ofertas || []).filter(o => o.busca_propria && o.publicado.slice(0, 10) === h).length : 0;
  const promos = S.mi && !S.mi.carregando ? (S.mi.ofertas || []).filter(o => !o.busca_propria && o.ativa !== false).length : 0;
  const dias = Array.from({ length: 14 }, (_, i) => diaMenos(h, 13 - i));
  const cont = Object.fromEntries(dias.map(d => [d, 0])); A.forEach(a => { const d = a.criado.slice(0, 10); if (d in cont) cont[d]++; });
  const max = Math.max(META_DIA + 2, ...Object.values(cont)), H = 150;
  const cols = `<div class="meta" style="bottom:${(META_DIA / max) * H + 30}px"><span>meta ${META_DIA}</span></div>` +
    dias.map((d, i) => `<div class="col ${i === 13 ? "sel" : ""} ${cont[d] >= META_DIA ? "hit" : ""}" data-tip="${dmy(d)}: ${cont[d]} alerta${cont[d] === 1 ? "" : "s"}"><span class="v">${cont[d] || ""}</span><span class="bar ${cont[d] ? "" : "ghost"}" style="height:${Math.max(6, (cont[d] / max) * H)}px"></span><span class="d">${d.slice(8, 10)}</span></div>`).join("");
  const precos = ordenarDest(destinosStatus(), "ofertas").slice(0, 8);
  const a7 = A.filter(a => a.criado.slice(0, 10) >= diaMenos(h, 6));
  const hojeN = A.filter(a => a.criado.slice(0, 10) === h).length;
  const stat = (n, t, href, cor) => `<a class="mv-s ini" href="${href}" style="--c:${cor}"><b>${n}</b><span>${t}</span></a>`;
  return head("Início", "O resumo do dia: o que o radar achou e o que ainda falta enviar", statusPill()) +
    `<div class="mv-nums ini4">${stat(`${hojeN}<small>/${META_DIA}</small>`, "alertas em dinheiro hoje", "#alertas", "#16A34A")}${stat(miHoje, "alertas em milhas hoje", "#milhas", "#FF7A00")}${stat(promos, "promoções de milhas valendo", "#promocoes", "#8B5CF6")}${stat(enviadosHoje, "enviados hoje", "#alertas", "#64748B")}</div>
    <div class="card" style="margin-bottom:var(--space-4)"><div class="card-h"><div><h3>Falta enviar</h3><div class="desc">O que ainda não foi marcado como enviado (ontem e hoje). Alertas cujo preço já subiu ficam de fora.</div></div><a class="bt pri" href="#enviar">${ic("send")}Abrir Modo envio</a></div>
      <div class="falta">${[["dinheiro", "Alertas em dinheiro", "#16A34A", "#alertas"], ["milhas", "Alertas em milhas", "#FF7A00", "#milhas"], ["promo", "Promoções de milhas", "#8B5CF6", "#promocoes"]].map(([t, n, cor, href]) => {
        const L = fila.filter(f => f.tipo === t);
        return `<a class="falta-i" href="${href}" style="--c:${cor}"><b>${L.length}</b><span class="falta-t"><strong>${n}</strong><small>${L.length ? esc(L.slice(0, 4).map(f => f.t).join(" · ")) + (L.length > 4 ? ` e mais ${L.length - 4}` : "") : "tudo enviado ✓"}</small></span><span class="bt sm ${L.length ? "pri" : "ghost"}">${L.length ? "Abrir e enviar" : "Abrir"}</span></a>`; }).join("")}</div>
    </div>
    <div class="grid two">
      <div class="card"><div class="card-h"><div><h3>Alertas em dinheiro por dia</h3><div class="desc">Últimos 14 dias · meta de ${META_DIA} por dia</div></div></div><div class="cols">${cols}</div></div>
      <div class="card"><div class="card-h"><div><h3>Qualidade dos alertas</h3><div class="desc">Últimos 7 dias, por classe</div></div></div>
        ${gDonut(["imperdivel", "otima", "boa"].map(k => ({ n: CLASSE_NOME[k], v: a7.filter(a => (a.classe || "boa") === k).length, cor: CLASSE_COR[k] })), a7.length, "alertas")}
        <div class="sec-gap"></div><div class="desc" style="margin-bottom:6px">Nacional × internacional</div>
        ${gStack([{ n: "Nacional", v: a7.filter(a => a.tipo !== "internacional").length, cor: GC.azul }, { n: "Internacional", v: a7.filter(a => a.tipo === "internacional").length, cor: GC.ambar }])}
      </div>
    </div>
    <div class="card" style="margin-bottom:var(--space-4)"><div class="card-h"><div><h3>Mais barato agora, comparado com a média</h3><div class="desc">Quanto o menor preço de cada destino está abaixo do normal da rota (em dinheiro, só ida)</div></div><a class="bt sm" href="#destinos">Ver todos</a></div>
      ${precos.length ? gHBars(precos.map(p => ({ n: p.nome, v: p.d, rot: `${brl(p.menor)} · −${pct(p.d)}`, tip: `${p.nome}: ${brl(p.menor)} (média ${brl(p.mediana)})`, href: "#destinos", cor: p.d >= .4 ? GC.verde : p.d >= .3 ? GC.azul : GC.ambar })), 1) : `<div class="vazio">Aparece depois da primeira varredura.</div>`}
    </div>`;
}

/* ------------------------------------------------------------ Alertas */
function diasIda(a) { return a.datas_ida ? a.datas_ida.map(d => d.dia) : (a.datas || []).map(d => d.ida); }
function filtrar() {
  const F = S.F, h = hojeISO();
  let L = S.alertas.filter(a => {
    if (F.dias && a.criado.slice(0, 10) < diaMenos(h, +F.dias - 1)) return false;
    if (F.q) { const q = F.q.toLowerCase(); if (!(`${a.destino} ${a.destino_nome} ${a.cia_nome}`.toLowerCase().includes(q))) return false; }
    if (F.tipo && a.tipo !== F.tipo) return false;
    if (F.classe && (a.classe || "boa") !== F.classe) return false;
    if (F.cia && a.cia_nome !== F.cia) return false;
    if (F.mes && !diasIda(a).some(d => d.slice(0, 7) === F.mes)) return false;
    if (F.max && a.preco > +F.max) return false;
    if (F.direto && a.escalas !== 0) return false;
    if (F.env === "nao" && enviado(a)) return false;
    if (F.env === "sim" && !enviado(a)) return false;
    return true;
  });
  const ord = { recentes: (x, y) => y.criado.localeCompare(x.criado), preco: (x, y) => x.preco - y.preco, desconto: (x, y) => y.desconto - x.desconto, ida: (x, y) => (x.ida || "").localeCompare(y.ida || ""), az: (x, y) => x.destino_nome.localeCompare(y.destino_nome, "pt-BR") || y.criado.localeCompare(x.criado) }[F.ordem];
  return L.sort(ord);
}
function painelAlertas(L) {
  const h = hojeISO(), dias = Array.from({ length: 14 }, (_, i) => diaMenos(h, 13 - i));
  const porDia = dias.map(d => ({ d, v: S.alertas.filter(a => a.criado.slice(0, 10) === d).length }));
  const cias = contar(L, a => a.cia_nome).slice(0, 4);
  const env = L.filter(a => enviado(a)).length;
  return `<div class="g-strip">
    <div class="card g-mini"><div class="g-t">Alertas por dia <small>14 dias</small></div>${gCols(porDia)}</div>
    <div class="card g-mini"><div class="g-t">Por classe <small>${L.length} na lista</small></div>${gStack(["imperdivel", "otima", "boa"].map(k => ({ n: CLASSE_NOME[k], v: L.filter(a => (a.classe || "boa") === k).length, cor: CLASSE_COR[k] })))}</div>
    <div class="card g-mini"><div class="g-t">Enviados <small>da lista</small></div>${gStack([{ n: "Enviados", v: env, cor: GC.verde }, { n: "Falta enviar", v: L.length - env, cor: GC.cinza }])}</div>
    <div class="card g-mini"><div class="g-t">Companhias</div>${cias.length ? gHBars(cias.map(([n, v]) => ({ n, v, rot: String(v), cor: GC.azul }))) : `<div class="sub">sem dados</div>`}</div>
  </div>`;
}
function pAlertas() {
  const F = S.F;
  const cias = [...new Set(S.alertas.map(a => a.cia_nome).filter(Boolean))].sort();
  const meses = [...new Set(S.alertas.flatMap(a => diasIda(a).map(d => d.slice(0, 7))))].sort();
  const L = filtrar();
  const opt = (v, t, sel) => `<option value="${esc(v)}" ${sel === v ? "selected" : ""}>${esc(t)}</option>`;
  return head("Alertas em dinheiro", "Promoções em reais que o radar achou saindo de Fortaleza. Copie ou mande no WhatsApp: o quadro fica verde quando enviado.",
    `<button class="bt" data-act="copiarvisiveis">${ic("copy")}Copiar todos visíveis</button>`) +
    `<div class="filtros" id="filtros">
      <input class="busca" type="search" placeholder="Buscar destino ou companhia…" data-f="q" value="${esc(F.q)}">
      <select data-f="dias">${opt("1", "Hoje", F.dias)}${opt("7", "7 dias", F.dias)}${opt("30", "30 dias", F.dias)}${opt("", "Tudo", F.dias)}</select>
      <select data-f="tipo">${opt("", "Nacional + internacional", F.tipo)}${opt("nacional", "Nacional", F.tipo)}${opt("internacional", "Internacional", F.tipo)}</select>
      <select data-f="classe">${opt("", "Todas as classes", F.classe)}${opt("imperdivel", "Imperdível", F.classe)}${opt("otima", "Ótima", F.classe)}${opt("boa", "Boa", F.classe)}</select>
      <select data-f="cia">${opt("", "Todas as cias", F.cia)}${cias.map(c => opt(c, c, F.cia)).join("")}</select>
      <select data-f="mes">${opt("", "Qualquer mês", F.mes)}${meses.map(m => opt(m, MESES[+m.slice(5, 7) - 1] + "/" + m.slice(2, 4), F.mes)).join("")}</select>
      <input type="number" inputmode="numeric" placeholder="Até R$" data-f="max" value="${esc(F.max)}" style="width:100px">
      <label class="chk"><input type="checkbox" data-f="direto" ${F.direto ? "checked" : ""}> Só voo direto</label>
      <select data-f="env">${opt("", "Enviados e não enviados", F.env)}${opt("nao", "Só não enviados", F.env)}${opt("sim", "Só enviados", F.env)}</select>
    </div>
    ${painelAlertas(L)}
    <div class="ordbar">${pills("alvista", ALV, [["lista", "☰ Lista"], ["quadros", "▦ Quadros"]])}<span class="ord-l">Ordenar</span>${pills("alertas", F.ordem, [["recentes", "Mais recentes"], ["desconto", "Melhores ofertas"], ["preco", "Menor valor"], ["az", "A–Z"], ["ida", "Data de ida"]])}</div>
    <div class="resultado"><span>${L.length} alerta${L.length === 1 ? "" : "s"}</span>${Object.values(F).some((v, i) => v && !["recentes", "30"].includes(v)) ? `<a href="#" data-act="limpar">Limpar filtros</a>` : ""}</div>
    ${L.length ? (ALV === "lista" ? `<div class="al-lista">${L.map(linhaAlerta).join("")}</div>` : `<div class="alertas compacto">${L.map(a => cardAlerta(a, true)).join("")}</div>`) : `<div class="card vazio">Nenhum alerta com esses filtros.</div>`}`;
}

/* ------------------------------------------------------------ Destinos (base de preços + calendário) */
async function carregarCal(iata) {
  if (S.cal[iata]) return;
  S.cal[iata] = await getJSON(`calendario/${iata}.json`, null);
}
function calHTML(c, ref) {
  if (!c) return `<div class="vazio">O calendário aparece depois da próxima varredura deste destino.</div>`;
  const faixa = (lista, titulo) => {
    if (!lista || !lista.length) return "";
    const ps = lista.map(d => d.preco), lo = Math.min(...ps), hi = Math.max(...ps);
    const meses = {};
    lista.forEach(d => (meses[d.dia.slice(0, 7)] = meses[d.dia.slice(0, 7)] || []).push(d));
    return `<div class="cal-b"><div class="cal-t">${titulo} <span class="sub">menor ${brl(lo)} · maior ${brl(hi)}</span></div>
      ${Object.entries(meses).map(([m, ds]) => `<div class="cal-m"><b>${MESES[+m.slice(5, 7) - 1]} ${m.slice(0, 4)}</b><div class="cal-g">${ds.map(d => {
        const t = hi > lo ? (d.preco - lo) / (hi - lo) : 0, cls = d.preco <= lo * 1.05 ? "c-top" : t < .33 ? "c-bom" : t < .66 ? "c-med" : "c-caro";
        return `<span class="cal-d ${cls}" data-tip="${dmy(d.dia)} · ${brl(d.preco)} · ${esc(d.cia || "")}${d.escalas === 0 ? " · direto" : d.escalas ? ` · ${d.escalas} parada${d.escalas > 1 ? "s" : ""}` : ""}"><i>${d.dia.slice(8, 10)}</i><small>${Math.round(d.preco / 10) * 10 >= 1000 ? (d.preco / 1000).toFixed(1).replace(".", ",") + "k" : Math.round(d.preco)}</small></span>`;
      }).join("")}</div></div>`).join("")}</div>`;
  };
  return `<div class="cal-leg"><span><i class="c-top"></i>mais barato</span><span><i class="c-bom"></i>bom</span><span><i class="c-med"></i>médio</span><span><i class="c-caro"></i>caro</span><span class="sub">Preço só ida, por trecho · atualizado ${haQuanto(c.atualizado)}</span></div>
    <div class="cal-2">${faixa(c.ida, "Ida · Fortaleza → " + esc(c.nome))}${faixa(c.volta, "Volta · " + esc(c.nome) + " → Fortaleza")}</div>`;
}
function pDestinos() {
  const total = S.rotas.filter(r => r.ativo !== false).length, comBase = destinosStatus().length;
  return head("Preços por destino", "Quanto está cada destino em reais, dia a dia. É a base que o radar usa pra saber o que é promoção. Toque num destino pra ver o calendário.",
    `<button class="bt" data-act="turbo">${ic("zap")}Varredura turbo</button>`) +
    (comBase < total ? `<div class="aviso warn"><span>${ic("chart")} ${comBase} de ${total} destinos já têm base de preços. A varredura turbo completa o resto em ~25 min.</span></div>` : "") +
    blocoDestinos("real");
}

/* ------------------------------------------------------------ Grupos e links */
const GRUPOS_PADRAO = [
  { id: "gratis", nome: "Partiu085 · Alertas grátis", desc: "Promoções de passagens saindo de Fortaleza, todos os dias.", link: "https://bit.ly/radar085", preco: "", ativo: true },
  { id: "vip", nome: "Partiu085 · VIP", desc: "Todos os alertas na hora, datas completas e pedidos de rota.", link: "", preco: "R$ 14,90/mês", ativo: true },
  { id: "milhas", nome: "Partiu085 · Milhas", desc: "Milhas baratas, bônus de transferência (Livelo, Esfera) e oportunidades.", link: "", preco: "", ativo: true },
  { id: "comunidade", nome: "Partiu085 · Comunidade", desc: "Troca de experiências, dicas de viagem e conversa entre viajantes.", link: "", preco: "", ativo: true },
];
function conviteGrupo(g) {
  return `✈️ *${g.nome}*\n${g.desc}${g.preco ? `\n💳 ${g.preco}` : ""}\n\n👉 Entre aqui: ${g.link || "(link do grupo)"}`;
}
function pGrupos() {
  const G = S.grupos || [];
  const bio = location.origin + location.pathname.replace(/index\.html$/, "") + "links.html";
  return head("Grupos e links", "Seus grupos, links de convite e a página de links para a bio",
    `${S.gruposSujo ? `<button class="bt pri" data-act="salvargrupos">${ic("save")}Salvar grupos</button>` : ""}`) +
    `<div class="card bio-card" style="margin-bottom:var(--space-4)"><div class="card-h"><div><h3>Página de links (bio do Instagram)</h3>
      <div class="desc">Uma página com todos os grupos ativos. Coloque este link na bio do @partiu.085.</div></div></div>
      <div class="bio-l"><code>${esc(bio)}</code><button class="bt sm" data-act="copiartxt" data-t="${esc(bio)}">${ic("copy")}Copiar link</button><a class="bt sm" href="links.html" target="_blank" rel="noopener">${ic("ext")}Abrir</a><button class="bt sm" data-act="qr" data-t="${esc(bio)}" data-n="pagina-de-links">QR code</button></div></div>
    <div class="grupos">${G.map((g, i) => `<article class="card grupo ${g.ativo === false ? "off" : ""}">
      <div class="card-h"><div><span class="micro">Grupo ${i + 1}${g.id === "vip" ? " · pago" : ""}</span><h3>${esc(g.nome)}</h3></div>
        <label class="sw" title="Mostrar na página de links"><input type="checkbox" data-g="${i}" data-c="ativo" ${g.ativo !== false ? "checked" : ""}><span></span></label></div>
      <div class="form" style="grid-template-columns:1fr">
        <div class="field"><label>Nome</label><input data-g="${i}" data-c="nome" value="${esc(g.nome)}"></div>
        <div class="field"><label>Descrição</label><input data-g="${i}" data-c="desc" value="${esc(g.desc)}"></div>
        <div class="field"><label>Link de convite</label><input data-g="${i}" data-c="link" value="${esc(g.link)}" placeholder="https://chat.whatsapp.com/…"></div>
        ${g.id === "vip" ? `<div class="field"><label>Preço</label><input data-g="${i}" data-c="preco" value="${esc(g.preco)}" placeholder="R$ 14,90/mês"></div>` : ""}
      </div>
      <div class="al-acts" style="margin-top:var(--space-4)">
        <button class="bt sm" data-act="copiartxt" data-t="${esc(g.link)}" ${g.link ? "" : "disabled"}>${ic("copy")}Copiar link</button>
        <button class="bt sm" data-act="copiartxt" data-t="${esc(conviteGrupo(g))}">${ic("send")}Copiar convite</button>
        <button class="bt sm" data-act="qr" data-t="${esc(g.link)}" data-n="${esc(g.id)}" ${g.link ? "" : "disabled"}>QR code</button>
        ${g.link ? `<a class="bt sm ghost" href="${esc(g.link)}" target="_blank" rel="noopener">${ic("ext")}Abrir</a>` : ""}
      </div></article>`).join("")}</div>
    <div id="qr-box"></div>`;
}
function mostrarQR(texto, nome) {
  if (!window.QRious) { toast("Gerador de QR ainda carregando, tente de novo."); return; }
  const c = document.createElement("canvas");
  new QRious({ element: c, value: texto, size: 720, padding: 40, background: "#ffffff", foreground: "#141414", level: "M" });
  $("#qr-box").innerHTML = `<div class="card qr-card"><div class="card-h"><div><h3>QR code</h3><div class="desc">${esc(texto)}</div></div><button class="bt sm ghost" data-act="fecharqr">${ic("x")}</button></div></div>`;
  $("#qr-box .qr-card").appendChild(c);
  const a = document.createElement("a"); a.className = "bt pri"; a.textContent = "Baixar QR code"; a.download = `qr-${nome || "partiu085"}.png`; a.href = c.toDataURL("image/png");
  $("#qr-box .qr-card").appendChild(a);
  $("#qr-box").scrollIntoView({ behavior: "smooth" });
}

/* ------------------------------------------------------------ Pedidos VIP */
function pedidosVip() {
  const vips = S.rotas.map((r, i) => [r, i]).filter(([r]) => r.vip);
  return `<div class="card vip-card" style="margin-bottom:var(--space-4)"><div class="card-h"><div><h3>${ic("star")} Pedidos VIP</h3>
    <div class="desc">Rota que um assinante pediu. Ela entra em toda rodada, avisa com desconto menor (${Math.round((S.ajustes.vip_desconto || .12) * 100)}%) ou quando chegar no preço-alvo, e não fica em descanso.</div></div></div>
    ${vips.length ? `<div class="rows">${vips.map(([r, i]) => { const s = (S.status.rotas || {})[r.iata] || {}; return `<div class="row">
      <span class="av">${esc(r.iata)}</span>
      <span class="t"><b>${esc(r.nome)}</b><span class="sub">Pedido de ${esc(r.vip_nome || "assinante")} · agora a partir de ${s.menor ? brl(s.menor) : "–"} o trecho</span></span>
      <label class="field mini-f"><span class="sub">Alvo R$</span><input class="mini" type="number" data-rota="${i}" data-campo="vip_alvo" value="${r.vip_alvo || ""}" placeholder="opcional"></label>
      <button class="bt sm ghost danger" data-act="tirarvip" data-i="${i}" title="Encerrar pedido">${ic("x")}</button></div>`; }).join("")}</div>` : `<div class="vazio" style="padding:var(--space-3) 0">Nenhum pedido ainda.</div>`}
    <div class="form" style="margin-top:var(--space-4)">
      <div class="field"><label>Destino (IATA)</label><input id="vp-iata" maxlength="3" placeholder="ex.: LIS" style="text-transform:uppercase"></div>
      <div class="field"><label>Quem pediu</label><input id="vp-nome" placeholder="ex.: Ana (VIP)"></div>
      <div class="field"><label>Preço-alvo por trecho (R$)</label><input id="vp-alvo" type="number" placeholder="opcional"></div>
      <div class="field"><button class="bt pri" data-act="addvip">${ic("star")}Adicionar pedido</button></div>
    </div></div>`;
}

/* ------------------------------------------------------------ Rotas */
function pRotas() {
  const st = S.status.rotas || {};
  const R = S.R;
  const idx = S.rotas.map((r, i) => i).filter(i => !R.tipo || S.rotas[i].tipo === R.tipo);
  const val = i => { const s = st[S.rotas[i].iata] || {}; return s; };
  idx.sort({ az: (a, b) => S.rotas[a].nome.localeCompare(S.rotas[b].nome, "pt-BR"), preco: (a, b) => (val(a).menor || 1e9) - (val(b).menor || 1e9),
    ofertas: (a, b) => ((val(b).menor && val(b).mediana) ? 1 - val(b).menor / val(b).mediana : -1) - ((val(a).menor && val(a).mediana) ? 1 - val(a).menor / val(a).mediana : -1),
    recente: (a, b) => (val(b).quando || "").localeCompare(val(a).quando || ""), foco: (a, b) => (S.rotas[b].foco ? 1 : 0) - (S.rotas[a].foco ? 1 : 0) }[R.ordem] || (() => 0));
  const linhas = idx.map(i => {
    const r = S.rotas[i];
    const s = st[r.iata] || {};
    const pa = (S.pri || {})[r.iata] || {}, auto = pa.auto || "normal", NOME = { alta: "Alta", normal: "Normal", baixa: "Baixa" };
    return `<tr class="${r.ativo === false ? "off" : ""}">
      <td><b class="iata">${esc(r.iata)}</b></td>
      <td class="rt-n"><b>${esc(r.nome)}</b><small>${r.tipo === "internacional" ? "Internacional" : "Nacional"}</small></td>
      <td class="num rt-p">${s.menor ? `<b>${brl(s.menor)}</b><small>média ${brl(s.mediana)}</small>` : `<small>–</small>`}</td>
      <td class="rt-q">${s.quando ? haQuanto(s.quando) : "ainda não"}</td>
      <td><select class="mini pri-sel ${r.prioridade || auto}" data-rota="${i}" data-campo="prioridade" title="${esc(pa.motivo || "")}"><option value="" ${!r.prioridade ? "selected" : ""}>Auto · ${NOME[auto]}</option>${["alta", "normal", "baixa"].map(v => `<option value="${v}" ${r.prioridade === v ? "selected" : ""}>${NOME[v]}</option>`).join("")}</select></td>
      <td class="num"><input class="mini rt-teto" type="number" data-rota="${i}" data-campo="teto" value="${r.teto || ""}" placeholder="–" title="Teto ida e volta (R$)"></td>
      <td><label class="sw" title="Foco: varre em toda rodada"><input type="checkbox" data-rota="${i}" data-campo="foco" ${r.foco ? "checked" : ""}><span></span></label></td>
      <td><label class="sw" title="Ativa"><input type="checkbox" data-rota="${i}" data-campo="ativo" ${r.ativo !== false ? "checked" : ""}><span></span></label></td>
      <td class="rt-a"><button class="bt sm ghost" data-act="buscarrota" data-iata="${esc(r.iata)}" title="Buscar agora">${ic("refresh")}</button><button class="bt sm ghost danger" data-act="excluirrota" data-i="${i}" title="Excluir" aria-label="Excluir">${ic("x")}</button></td>
    </tr>`;
  }).join("");
  return head("Rotas vigiadas", "Os destinos que o radar procura saindo de Fortaleza. Adicione, tire ou coloque em foco.",
    `${S.rotasSujo ? `<button class="bt pri" data-act="salvarrotas">${ic("save")}Salvar alterações</button>` : ""}<button class="bt" data-act="turbo">${ic("zap")}Varredura turbo</button><button class="bt" data-act="rodar">${ic("play")}Rodar radar agora</button>`) +
    (!token() ? `<div class="aviso warn"><span>${ic("key")} Para salvar rotas e rodar o radar daqui, configure seu token do GitHub.</span><a class="bt sm" href="#ajustes">Configurar</a></div>` : "") +
    (S.rotasSujo ? `<div class="aviso warn"><span>Você tem alterações não salvas.</span><button class="bt sm pri" data-act="salvarrotas">Salvar agora</button></div>` : "") +
    pedidosVip() +
    `<div class="card" style="margin-bottom:14px"><h3>Cadastrar trecho</h3><div class="desc">Viu passagem barata em outro canal? Cadastre o destino e marque “foco” — ele passa a ser varrido em toda rodada.</div>
      <div class="form" id="form-rota">
        <div class="field"><label>Destino (código IATA)</label><input id="nr-iata" maxlength="3" placeholder="ex.: LIS" style="text-transform:uppercase"></div>
        <div class="field"><label>Nome da cidade</label><input id="nr-nome" placeholder="ex.: Lisboa"></div>
        <div class="field"><label>Tipo</label><select id="nr-tipo"><option value="nacional">Nacional</option><option value="internacional">Internacional</option></select></div>
        <div class="field"><label>Teto ida e volta (R$)</label><input id="nr-teto" type="number" placeholder="opcional"></div>
        <div class="field"><label>Dias de viagem</label><input id="nr-dur" type="number" placeholder="padrão"></div>
        <div class="field"><label class="chk" style="padding:8px 0"><input type="checkbox" id="nr-foco" checked> Foco (toda rodada)</label></div>
        <div class="field"><button class="bt pri" data-act="addrota">+ Adicionar</button></div>
      </div>
      <div class="presets"><span style="font-size:12px;color:var(--text-tertiary);align-self:center">Pacotes prontos:</span>${Object.keys(PRESETS).map(p => `<button class="chip" data-act="preset" data-p="${p}">+ ${p}</button>`).join("")}</div>
    </div>
    ${(() => { const P = S.pri || {}; const conta = k => S.rotas.filter(r => r.ativo !== false && (r.prioridade || (P[r.iata] || {}).auto || "normal") === k).length;
      return `<div class="card freq" style="margin-bottom:14px"><h3>Como o radar divide as rodadas</h3><div class="desc">Rotas com voo todo dia mudam de preço toda hora, então o radar olha mais vezes. Destinos de nicho quase nunca têm promoção nova: ele continua olhando, só que menos. A frequência é automática (pelos alertas dos últimos 30 dias e pela quantidade de voos), mas você pode mudar em cada rota.</div>
        <div class="freq-g"><div class="freq-i alta"><b>${conta("alta")}</b><span>Alta</span><small>olhada ~a cada 6h</small></div><div class="freq-i normal"><b>${conta("normal")}</b><span>Normal</span><small>~1 vez por dia</small></div><div class="freq-i baixa"><b>${conta("baixa")}</b><span>Baixa</span><small>~a cada 2 dias</small></div></div></div>`; })()}
    <div class="ordbar"><span class="ord-l">Ordenar</span>${pills("rotas", R.ordem, [["az", "A–Z"], ["ofertas", "Melhores ofertas"], ["preco", "Menor valor"], ["recente", "Varridas agora"], ["foco", "Em foco"]])}
      ${pills("rotastipo", R.tipo, [["", "Todas"], ["nacional", "Nacionais"], ["internacional", "Internacionais"]])}</div>
    <div class="tbl-wrap"><table class="rt-tab"><thead><tr><th>Cód.</th><th>Destino</th><th class="num">Menor agora</th><th>Varrida</th><th title="Quantas vezes o radar olha essa rota">Frequência</th><th class="num" title="Teto ida e volta (R$)">Teto</th><th>Foco</th><th>Ativa</th><th></th></tr></thead>
    <tbody>${linhas || `<tr><td colspan="9" class="vazio">Nenhuma rota cadastrada.</td></tr>`}</tbody></table></div>
    <p style="font-size:12px;color:var(--text-tertiary);margin-top:10px">A cada rodada (de 2 em 2 horas) o radar varre ${S.ajustes.rotas_por_rodada || 9} rotas: as de foco sempre, e as outras pela frequência. Use foco em poucas rotas (até 5) pra não deixar a rodada lenta.</p>`;
}
function addRota(iata, extra = {}) {
  iata = (iata || "").toUpperCase().trim();
  if (!/^[A-Z]{3}$/.test(iata)) { toast("Código IATA inválido (3 letras)."); return false; }
  if (iata === ORIGEM) return false;
  const ex = S.rotas.find(r => r.iata === iata);
  if (ex) { Object.assign(ex, { ativo: true }, extra.foco ? { foco: true } : {}); }
  else S.rotas.unshift({ iata, nome: extra.nome || IATA[iata] || iata, tipo: extra.tipo || (INTL.has(iata) ? "internacional" : "nacional"), teto: extra.teto || null, ativo: true, foco: !!extra.foco, ...(extra.duracao ? { duracao: extra.duracao } : {}) });
  S.rotasSujo = true; return true;
}
async function salvarRotas() {
  try {
    await salvarArquivo("docs/rotas.json", S.rotas, "Painel: atualiza rotas");
    S.rotasSujo = false; toast("✓ Rotas salvas. Valem a partir da próxima rodada."); render();
  } catch (e) { toast("Não salvou: " + e.message, 5000); }
}

/* ------------------------------------------------------------ Histórico */
function sparkline(serie, w = 120, h = 34) {
  if (!serie || serie.length < 2) return `<span class="sub">–</span>`;
  const v = serie.map(p => p.minimo), lo = Math.min(...v), hi = Math.max(...v), rg = hi - lo || 1;
  const pts = v.map((x, i) => `${(i / (v.length - 1) * (w - 6) + 3).toFixed(1)},${(h - 4 - (x - lo) / rg * (h - 8)).toFixed(1)}`).join(" ");
  const ult = pts.split(" ").pop().split(",");
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts}"/><circle cx="${ult[0]}" cy="${ult[1]}" r="3.5"/></svg>`;
}
function linhasHist() {
  const st = S.status.rotas || {};
  return Object.keys(S.hist).filter(k => k.startsWith(ORIGEM + "-")).map(k => {
    const iata = k.split("-")[1], serie = (S.hist[k] || []).slice(-30), r = S.rotas.find(x => x.iata === iata) || {}, s = st[iata] || {};
    const hoje = serie[serie.length - 1] || {}, ontem = serie[serie.length - 2];
    const var1 = ontem ? hoje.minimo / ontem.minimo - 1 : null;
    const min30 = serie.length ? Math.min(...serie.map(p => p.minimo)) : null;
    return { k, iata, nome: r.nome || s.nome || IATA[iata] || iata, tipo: r.tipo || s.tipo, serie, hoje, var1, min30, dias: serie.length,
      abaixo: hoje.mediana ? 1 - hoje.minimo / hoje.mediana : 0, melhor_mes: s.melhor_mes, volta: st[iata] && st[iata].menor_volta };
  }).filter(x => x.hoje.minimo);
}
function pHist() {
  const L = linhasHist(), H = S.H || (S.H = { ordem: "queda", aberto: "" });
  const comVar = L.filter(x => x.var1 !== null);
  const caiu = comVar.slice().sort((a, b) => a.var1 - b.var1)[0], subiu = comVar.filter(x => x.var1 > .03).length, desceram = comVar.filter(x => x.var1 < -.03).length;
  const barato = L.slice().sort((a, b) => a.hoje.minimo - b.hoje.minimo)[0];
  const ord = { queda: (a, b) => (a.var1 ?? 0) - (b.var1 ?? 0), preco: (a, b) => a.hoje.minimo - b.hoje.minimo, abaixo: (a, b) => b.abaixo - a.abaixo, az: (a, b) => a.nome.localeCompare(b.nome, "pt-BR") }[H.ordem];
  const lista = L.slice().sort(ord);
  const varTag = v => v === null ? `<span class="sub">1º dia</span>` : `<span class="badge ${v < -.005 ? "pos" : v > .005 ? "neg" : ""}">${v < 0 ? "−" : "+"}${Math.abs(v * 100).toFixed(0)}% ${v < -.005 ? "↘" : v > .005 ? "↗" : "→"}</span>`;
  const dias = Math.max(0, ...L.map(x => x.dias));
  return head("Histórico de preços", "Como os preços saindo de Fortaleza estão se mexendo — o menor preço de cada dia (só ida, por trecho)") +
    `<div class="grid kpis">
      ${kpi("Maior queda desde ontem", caiu && caiu.var1 < 0 ? "−" + Math.abs(caiu.var1 * 100).toFixed(0) + "%" : "–", caiu && caiu.var1 < 0 ? `${esc(caiu.nome)}: ${brl(caiu.hoje.minimo)} o trecho` : "Aparece a partir do 2º dia de varredura", true, "downr")}
      ${kpi("Mais barato agora", barato ? brl(barato.hoje.minimo) : "–", barato ? `${esc(barato.nome)} · o trecho` : "", false, "plane")}
      ${kpi("Movimento do dia", comVar.length ? `${desceram}<small> caíram</small>` : "–", comVar.length ? `${subiu} subiram · ${comVar.length - desceram - subiu} estáveis` : `${dias} dia${dias === 1 ? "" : "s"} de histórico até agora`, false, "chart")}
    </div>
    <div class="aviso"><span>${ic("chart")} <b>Como ler:</b> “Menor hoje” é a passagem mais barata encontrada para os próximos 3 meses. “Abaixo da média” compara com o preço comum da rota. A linha mostra os últimos 30 dias.</span></div>
    <div class="ordbar"><span class="ord-l">Ordenar</span>${pills("hist", H.ordem, [["queda", "Maiores quedas"], ["abaixo", "Mais abaixo da média"], ["preco", "Menor valor"], ["az", "A–Z"]])}</div>
    ${lista.length ? `<div class="tbl-wrap"><table class="hist-t"><thead><tr><th>Destino</th><th class="num">Menor hoje</th><th class="num">vs. ontem</th><th class="num">Abaixo da média</th><th>Últimos 30 dias</th><th class="num">Menor em 30 dias</th><th>Melhor mês</th></tr></thead><tbody>
      ${lista.map(x => `<tr class="clic ${H.aberto === x.k ? "aberto" : ""}" data-act="histabrir" data-k="${x.k}">
        <td data-l="Destino"><span><span class="iata">${x.iata}</span> ${esc(x.nome)}</span></td>
        <td class="num" data-l="Menor hoje"><b>${brl(x.hoje.minimo)}</b></td>
        <td class="num" data-l="vs. ontem">${varTag(x.var1)}</td>
        <td class="num" data-l="Abaixo da média">−${pct(x.abaixo)}</td>
        <td data-l="30 dias">${sparkline(x.serie)}</td>
        <td class="num" data-l="Menor em 30 dias">${brl(x.min30)}</td>
        <td data-l="Melhor mês">${x.melhor_mes ? MESES[+x.melhor_mes.slice(5, 7) - 1] + "/" + x.melhor_mes.slice(2, 4) : "–"}</td></tr>
        ${H.aberto === x.k ? `<tr class="det"><td colspan="7">${detalheHist(x)}</td></tr>` : ""}`).join("")}
    </tbody></table></div>` : `<div class="card vazio">Ainda sem histórico. Rode a varredura turbo em Destinos.</div>`}`;
}
function detalheHist(x) {
  const c = S.cal[x.iata];
  let meses = "";
  if (c && c.ida) {
    const pm = {}; c.ida.forEach(d => { const m = d.dia.slice(0, 7); pm[m] = Math.min(d.preco, pm[m] || 1e9); });
    const ms = Object.entries(pm).sort(), mx = Math.max(...ms.map(m => m[1])), mn = Math.min(...ms.map(m => m[1]));
    meses = `<div class="hm"><b>Menor preço por mês (ida)</b>${ms.map(([m, p]) => `<div class="hm-r"><span>${MESES[+m.slice(5, 7) - 1]}/${m.slice(2, 4)}</span><span class="hm-b"><i class="${p === mn ? "best" : ""}" style="width:${Math.max(8, p / mx * 100)}%"></i></span><b>${brl(p)}</b></div>`).join("")}</div>`;
  }
  return `<div class="hist-det"><div class="linechart">${x.serie.length >= 2 ? linha(x.serie) : `<div class="vazio">O gráfico de linha aparece a partir do 2º dia. Hoje: menor ${brl(x.hoje.minimo)} · média ${brl(x.hoje.mediana)}.</div>`}
      <div class="legend"><span><i style="background:var(--ink)"></i>Menor preço do dia</span><span><i style="background:var(--text-disabled)"></i>Preço médio</span></div></div>
    <div>${meses || `<div class="vazio">Calendário carregando…</div>`}
      <div class="al-acts" style="margin-top:var(--space-3)"><a class="bt sm" href="#destinos" data-act="histcal" data-k="${x.iata}">${ic("globe")}Ver calendário dia a dia</a><button class="bt sm" data-act="buscarrota" data-iata="${x.iata}">${ic("refresh")}Buscar agora</button></div></div></div>`;
}
function linha(serie) {
  const W = 720, H = 240, P = { l: 56, r: 20, t: 16, b: 28 };
  const vals = serie.flatMap(p => [p.minimo, p.mediana]);
  let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo) * .12 || hi * .1; lo = Math.max(0, lo - pad); hi += pad;
  const x = i => P.l + (i / (serie.length - 1)) * (W - P.l - P.r);
  const y = v => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  const path = k => serie.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join("");
  const ticks = [0, .5, 1].map(f => lo + (hi - lo) * f);
  const step = Math.max(1, Math.ceil(serie.length / 8));
  const last = serie.length - 1;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Histórico de preços">
    ${ticks.map(t => `<line class="grid-l" x1="${P.l}" x2="${W - P.r}" y1="${y(t)}" y2="${y(t)}"/><text class="ax" x="${P.l - 8}" y="${y(t) + 4}" text-anchor="end">${brl(t)}</text>`).join("")}
    ${serie.map((p, i) => i % step === 0 || i === last ? `<text class="ax" x="${x(i)}" y="${H - 8}" text-anchor="middle">${dm(p.dia)}</text>` : "").join("")}
    <path class="l2" d="${path("mediana")}"/><path class="l1" d="${path("minimo")}"/>
    ${serie.map((p, i) => `<circle class="dot1" cx="${x(i)}" cy="${y(p.minimo)}" r="4" data-tip="${dmy(p.dia)} · menor ${brl(p.minimo)} · média ${brl(p.mediana)}"/>`).join("")}
    <text class="lab" x="${x(last) - 6}" y="${y(serie[last].minimo) + 18}" text-anchor="end">${brl(serie[last].minimo)}</text>
  </svg>`;
}

/* ------------------------------------------------------------ Converter */
const CIAS_CONHECIDAS = ["LATAM", "Gol", "GOL", "Azul", "TAP", "Iberia", "Air France", "KLM", "Air Europa", "Copa", "Avianca", "American", "United", "Delta", "Aerolíneas", "Sky", "JetSMART", "Lufthansa", "British", "ITA", "Emirates", "Turkish", "Arajet", "Wingo", "Voepass"];
function secoesDatas(txt) {
  const M = { janeiro: 1, fevereiro: 2, "março": 3, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 };
  const res = { ida: [], volta: [] }; let atual = null;
  txt.split(/\n/).forEach(l => {
    const t = l.toLowerCase();
    if (/datas? de ida/.test(t)) { atual = "ida"; return; }
    if (/datas? de volta/.test(t)) { atual = "volta"; return; }
    const m = t.match(/(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s*(\d{4})?\s*:\s*(.+)/);
    if (atual && m) {
      const y = m[2] || new Date().getFullYear(), mm = String(M[m[1]]).padStart(2, "0");
      (m[3].match(/\d{1,2}/g) || []).forEach(d => res[atual].push(`${y}-${mm}-${d.padStart(2, "0")}`));
    }
  });
  return res;
}
function agrupaMes(lista) {
  const M = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const g = {}; lista.filter(Boolean).sort().forEach(d => { const k = `${M[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`; (g[k] = g[k] || []).push(d.slice(8, 10)); });
  return Object.entries(g).map(([m, ds]) => `${m}: ${ds.join(", ")}`);
}
const PROGRAMAS = ["Livelo", "Esfera", "Smiles", "TudoAzul", "Azul Fidelidade", "LATAM Pass", "TAP Miles&Go", "Iupp", "Átomos", "KM de Vantagens", "Dotz", "AAdvantage", "Flying Blue", "Iberia Plus", "Avios"];
function achaCidades(txt) {
  const achados = [];
  const t = txt.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  Object.entries(IATA).forEach(([k, n]) => { const base = n.split(" (")[0].normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); const i = t.indexOf(base); if (i >= 0 && base.length > 3) achados.push([i, k]); });
  (txt.match(/\b[A-Z]{3}\b/g) || []).forEach(c => { if (IATA[c] || c === ORIGEM) achados.push([txt.indexOf(c), c]); });
  return [...new Map(achados.sort((a, b) => a[0] - b[0]).map(([, k]) => [k, k])).keys()];
}
function extrair(txt) {
  const o = { tipo: "passagem", origem: ORIGEM, destino: "", preco: "", media: "", milhas: "", taxas: "", programa: "", de: "", para: "", bonus: "", validade: "", idas: "", voltas: "", cia: "", link: "" };
  const low = txt.toLowerCase();
  const progs = PROGRAMAS.filter(p => new RegExp(p.replace(/[&]/g, "\\$&"), "i").test(txt));
  if (/b[oô]nus|bonifica/i.test(txt) && /transfer|%/.test(low)) {
    o.tipo = "bonus"; o.de = progs[0] || ""; o.para = progs[1] || "";
    const b = txt.match(/(?:at[ée]\s*)?(\d{2,3})\s*%/i); if (b) o.bonus = b[0].replace(/\s+/g, " ");
    const v = txt.match(/(?:at[ée]|v[áa]lid[oa] at[ée]|termina|encerra)[^0-9]{0,15}(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i); if (v) o.validade = v[1];
  } else if (/milhas|pontos|\b\d+\s*k\b/i.test(txt) && !/R\$\s*[\d.]+,\d{2}\s*(?:ida|o trecho)/i.test(txt)) {
    o.tipo = "milhas"; o.programa = progs[0] || "";
    const mi = txt.match(/(\d+(?:[.,]\d+)?\s*(?:k|mil)?)\s*(?:milhas|pontos)/i) || txt.match(/(\d+\s*k)\b/i);
    if (mi) o.milhas = mi[1].replace(/\s+/g, "").replace(/mil$/i, "K").replace(/k$/, "K");
    const tx = txt.match(/taxas?[^R]{0,20}R\$\s*([\d.]+(?:,\d{2})?)/i); if (tx) o.taxas = tx[1];
  }
  const cid = achaCidades(txt);
  const dests = cid.filter(c => c !== ORIGEM); if (dests[0]) o.destino = dests[0];
  if (cid[0] && cid[0] !== ORIGEM && cid.includes(ORIGEM)) { /* origem continua FOR */ }
  const precos = [...txt.matchAll(/R\$\s*([\d.]+(?:,\d{1,2})?)/g)].map(m => +m[1].replace(/\./g, "").replace(",", "."));
  if (o.tipo === "passagem" && precos[0]) o.preco = Math.round(precos[0]);
  const mm = txt.match(/m[ée]dia[^\d]*R?\$?\s*([\d.]+(?:,\d{2})?)/i); if (mm) o.media = Math.round(+mm[1].replace(/\./g, "").replace(",", "."));
  const sec = secoesDatas(txt);
  if (sec.ida.length) o.idas = sec.ida.join(", ");
  if (sec.volta.length) o.voltas = sec.volta.join(", ");
  if (!o.idas) {
    const ano = new Date().getFullYear();
    const ds = [...txt.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g)].map(m => { let y = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : ano; let d = `${y}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`; if (!m[3] && d < hojeISO()) d = `${y + 1}${d.slice(4)}`; return d; });
    if (ds[0] && o.tipo !== "bonus") o.idas = ds[0]; if (ds[1] && o.tipo !== "bonus") o.voltas = ds[1];
  }
  o.cia = CIAS_CONHECIDAS.find(c => new RegExp("\\b" + c + "\\b", "i").test(txt)) || ""; if (o.cia === "GOL") o.cia = "Gol";
  const l = txt.match(/https?:\/\/\S+/); if (l) o.link = l[0];
  o.trecho = /trecho|s[óo] ida/i.test(txt) || !/ida e volta/i.test(txt);
  return o;
}
function listaDatas(v) { return String(v || "").split(/[\s,;]+/).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x)); }
function grupoLink(id) { const g = (S.grupos || []).find(x => x.id === id && x.link); return g ? g.link : ((S.ajustes || {}).link_whatsapp || "https://bit.ly/radar085"); }
function convTextos(c) {
  const nome = c.destino ? ((S.rotas.find(r => r.iata === c.destino) || {}).nome || IATA[c.destino] || c.destino) : "";
  const idas = listaDatas(c.idas), voltas = listaDatas(c.voltas);
  const d = c.media && c.preco ? 1 - c.preco / c.media : 0;
  const classe = d >= .4 ? "🔥 IMPERDÍVEL" : d >= .3 ? "⭐ ÓTIMA OPORTUNIDADE" : d > 0 ? "✅ BOA OPORTUNIDADE" : "";
  const datas = [...(idas.length ? ["", "*Datas de ida:*", ...agrupaMes(idas)] : []), ...(voltas.length ? ["", "*Datas de volta:*", ...agrupaMes(voltas)] : [])];
  const fim = ["", "✈️ Receba alertas no WhatsApp: " + grupoLink("gratis")];
  const ass = ASSINATURAS[new Date().getDate() % ASSINATURAS.length];
  if (c.tipo === "bonus") {
    const rota = [c.de, c.para].filter(Boolean).join(" → ");
    return {
      grupo: ["💳 *BÔNUS DE TRANSFERÊNCIA*", "", rota ? `🔁 ${rota}` : "", c.bonus ? `🎁 ${/at/i.test(c.bonus) ? c.bonus : "Até " + c.bonus} de bônus` : "", c.validade ? `⏳ Válido até ${c.validade}` : "", "", "💡 Dica do 085: só transfira se já tiver um destino em mente — milha parada perde valor.", c.link ? `🔗 ${c.link}` : "", "", "✈️ Mais oportunidades de milhas: " + grupoLink("milhas")].filter((x, i, a) => x !== "" || a[i - 1] !== "").join("\n"),
      insta: `💳 Bônus de transferência no ar${rota ? `: ${rota}` : ""}!\n${c.bonus ? `Até ${c.bonus.replace(/at[ée]\s*/i, "")} de bônus` : ""}${c.validade ? ` até ${c.validade}` : ""}.\n\nNo 085 a regra é clara: transfere só com destino em mente. 😉\n${ass}\n\n#partiu085 #milhas #${(c.de || "milhas").toLowerCase().replace(/\s/g, "")}`,
      stories: `💳 BÔNUS ${c.bonus ? c.bonus.toUpperCase() : ""}\n${rota}\n${c.validade ? "até " + c.validade : ""}\nLink no grupo de milhas 👆`,
    };
  }
  if (c.tipo === "milhas") {
    return {
      grupo: ["🚨 *O RADAR APITOU — MILHAS*", "", `✈️ Fortaleza (${c.origem}) → ${nome} (${c.destino})`, `🎟️ A partir de *${c.milhas || "?"} milhas* o trecho${c.programa ? ` · ${c.programa}` : ""}`, c.taxas ? `💸 + taxas de R$ ${c.taxas}` : "", ...datas, "", "⚠️ Disponibilidade pode acabar a qualquer momento.", ...fim].filter((x, i, a) => !(x === "" && a[i - 1] === "")).join("\n"),
      insta: `🎟️ ${nome} a partir de ${c.milhas} milhas o trecho saindo de Fortaleza${c.programa ? ` (${c.programa})` : ""}!\n${idas.length ? `Datas em ${[...new Set(idas.map(x => MESES[+x.slice(5, 7) - 1]))].join(", ")}.` : ""}\n\n${ass}\n✈️ Receba alertas no WhatsApp: ${grupoLink("gratis")}\n\n#partiu085 #milhas #${(nome || "").toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}`,
      stories: `✈️ FOR → ${c.destino}\n🎟️ ${c.milhas} milhas\n${c.programa}\nCorre que acaba! Link no grupo 👆`,
    };
  }
  return {
    grupo: ["🚨 *O RADAR APITOU*", "", `✈️ Fortaleza (${c.origem}) → ${nome} (${c.destino})`, `💰 A partir de *${brl(c.preco)}* ${c.trecho ? "o trecho" : "ida e volta"}`, classe || "", c.cia ? `🛫 ${c.cia}` : "", ...datas, "", "⚠️ Preço pode mudar a qualquer momento.", ...fim].filter((x, i, a) => !(x === "" && a[i - 1] === "") && x !== null).join("\n"),
    insta: `🚨 ${nome} a partir de ${brl(c.preco)} ${c.trecho ? "o trecho" : "ida e volta"} saindo de Fortaleza!${c.cia ? `\nVoando de ${c.cia}.` : ""}${idas.length ? `\nDatas em ${[...new Set(idas.map(x => MESES[+x.slice(5, 7) - 1]))].join(", ")}.` : ""}\n\n${ass}\nPreço pode mudar a qualquer momento.\n✈️ Receba alertas no WhatsApp: ${grupoLink("gratis")}\n\n#partiu085 #passagensbaratas #${(nome || "").toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}`,
    stories: `🚨 FOR → ${c.destino}\n${brl(c.preco)} ${c.trecho ? "o trecho" : "ida e volta"}\nCorre que acaba! Link no grupo 👆`,
  };
}
function textoConvertido(c) { return convTextos(c).grupo; }
function pConv() {
  const c = S.conv;
  const campo = (k, lbl, tipo = "text") => `<div class="field"><label>${lbl}</label><input type="${tipo}" data-conv="${k}" value="${esc(c ? c[k] : "")}"></div>`;
  const T = c ? convTextos(c) : null;
  const tipoNome = { passagem: "Passagem em dinheiro", milhas: "Passagem com milhas", bonus: "Bônus de transferência" };
  const modo = S.convModo || "milhas";
  const topo = head("Converter texto", "Cole ofertas de outros canais: o 085 reescreve na nossa linguagem e, no caso dos resgates em milhas, faz a imagem e guarda no nosso banco") +
    `<div class="ordbar">${pills("convmodo", modo, [["milhas", "Resgates em milhas (vários de uma vez)"], ["outros", "Outras ofertas (dinheiro e bônus)"]])}</div>`;
  if (modo === "milhas") { carregarMilhas(); return topo + pImportar(); }
  return topo +
    `<div class="grid two conv">
      <div class="card"><h3>1. Cole o texto original</h3><div class="desc">Passagem em dinheiro, passagem com milhas ou bônus de transferência (Livelo, Esfera…).</div>
        <div class="field"><textarea id="conv-in" placeholder="Cole aqui…" style="min-height:220px">${esc(S.convIn || "")}</textarea></div>
        <div class="al-acts" style="margin-top:var(--space-3)"><button class="bt pri lg" data-act="converter">${ic("zap")}Converter pro jeito 085</button></div>
        ${c ? `<div class="sec-gap"></div><h3>2. Confira o que eu entendi</h3>
          <div class="presets" style="margin-top:var(--space-2)">${Object.entries(tipoNome).map(([k, t]) => `<button class="chip ${c.tipo === k ? "on" : ""}" data-act="convtipo" data-v="${k}">${t}</button>`).join("")}</div>
          <div class="form" style="margin-top:var(--space-3)">
          ${c.tipo === "bonus" ? campo("de", "De (programa)") + campo("para", "Para (programa)") + campo("bonus", "Bônus (ex.: 100%)") + campo("validade", "Válido até") :
            campo("destino", "Destino (IATA)") + (c.tipo === "milhas" ? campo("milhas", "Milhas (ex.: 20K)") + campo("programa", "Programa") + campo("taxas", "Taxas R$") : campo("preco", "Preço R$", "number") + campo("media", "Média R$ (opcional)", "number")) +
            campo("idas", "Datas de ida (AAAA-MM-DD, vírgula)") + campo("voltas", "Datas de volta") + campo("cia", "Companhia")}
          ${campo("link", "Link (opcional)")}
        </div>` : ""}
      </div>
      <div>${T ? [["grupo", "Pro grupo (WhatsApp/Telegram)"], ["insta", "Legenda do Instagram"], ["stories", "Texto curto pros stories"]].map(([k, t]) => `
        <div class="card" style="margin-bottom:var(--space-4)"><div class="card-h"><div><h3>${t}</h3></div><div class="acts"><button class="bt sm" data-act="convcopiar" data-k="${k}">${ic("copy")}Copiar</button>${k === "grupo" ? `<a class="bt sm zap" id="conv-zap" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(T.grupo)}">${ic("send")}WhatsApp</a>` : ""}</div></div>
        <div class="texto" id="conv-${k}">${esc(T[k])}</div></div>`).join("") +
        `<div class="al-acts">${c.tipo !== "bonus" && c.destino ? `<button class="bt" data-act="convrota">${ic("plane")}Vigiar ${esc(c.destino)} no radar</button>` : ""}${c.tipo === "passagem" && c.preco && c.destino ? `<button class="bt pri" data-act="convarte">${ic("image")}Criar arte desta oferta</button>` : ""}</div>`
        : `<div class="card vazio">Os três textos prontos aparecem aqui.</div>`}</div>
    </div>`;
}

/* ------------------------------------------------------------ Ajustes */
function previaTexto() {
  const ex = S.alertas[0] ? (montarTextoDinheiro(S.alertas[0]) || S.alertas[0].texto0 || S.alertas[0].texto) : "🚨 *O RADAR APITOU*\n\n✈️ Fortaleza (FOR) → Recife (REC)\n💰 A partir de *R$ 379* o trecho\n\n⚠️ Preço pode mudar a qualquer momento.";
  return textoFinal(ex, "dinheiro").split("\n").slice(-6).join("\n");
}
function pAjustes() {
  const a = S.ajustes, t = token();
  const num = (k, lbl, dica, step = 1) => `<div class="field"><label>${lbl}</label><input type="number" step="${step}" data-aj="${k}" value="${esc(a[k] ?? "")}"><small>${dica}</small></div>`;
  const txt = (k, lbl, dica) => `<div class="field"><label>${lbl}</label><input data-aj="${k}" value="${esc(a[k] ?? "")}"><small>${dica}</small></div>`;
  const rd = S.rodadas.slice(-12).reverse();
  return head("Ajustes e APIs", "Acesso, chaves das APIs, texto dos alertas e sensibilidade do radar",
    `${S.ajustesSujo ? `<button class="bt pri" data-act="salvarajustes">${ic("save")}Salvar ajustes</button>` : ""}`) +
    `<div class="card" style="margin-bottom:14px"><h3>Acesso para salvar</h3><div class="desc">O painel é público só para leitura. Para salvar rotas/ajustes e rodar o radar, cole seu token do GitHub (fica guardado só neste navegador).</div>
      <div class="form"><div class="field" style="grid-column:span 2"><label>Token do GitHub</label><input type="password" id="tok" placeholder="github_pat_…" value="${t ? "••••••••••••" + t.slice(-4) : ""}"></div>
      <div class="field"><button class="bt pri" data-act="salvartoken">Salvar e testar</button></div>
      ${t ? `<div class="field"><button class="bt ghost danger" data-act="sairtoken">Remover deste aparelho</button></div>` : ""}</div></div>
    ${integracoesHTML()}
    <div class="grid two">
      <div class="card"><h3>Texto das mensagens</h3><div class="desc">O fim de toda mensagem (rodapé) e o aviso. Vale na hora para tudo que você copiar, inclusive alertas antigos, e para o Telegram nas próximas rodadas.</div>
        <div class="form" style="grid-template-columns:1fr">
          ${txt("link_whatsapp", "Link principal", "Entra no lugar de {link} no rodapé")}
          <div class="field"><label>Rodapé das mensagens</label><textarea data-aj="rodape" rows="3" style="min-height:84px" placeholder="${esc(RODAPE_PADRAO)}">${esc(a.rodape ?? RODAPE_PADRAO)}</textarea><small>Pode ter mais de uma linha. Use {link} onde o link deve aparecer. Vazio = sem rodapé.</small></div>
          <div class="presets" style="margin-top:0">${[["✈️ Receba alertas no WhatsApp: {link}", "Convite WhatsApp"], ["👉 Entre no grupo grátis: {link}\n📲 Siga @partiu.085", "Grupo + Instagram"], ["⭐ Quer receber primeiro? VIP: {link}", "Chamada VIP"], ["Partiu 085 · Viajar bem é questão de oportunidade\n{link}", "Slogan + link"]].map(([v, t]) => `<button class="chip" data-act="rodapemodelo" data-v="${esc(v)}">${t}</button>`).join("")}</div>
          ${txt("aviso_preco", "Aviso de preço (alertas em dinheiro)", "Vazio = sem aviso")}
          <details><summary class="sub" style="cursor:pointer">Rodapé diferente para mensagens de milhas</summary>
            <div class="form" style="grid-template-columns:1fr;margin-top:10px">${txt("link_whatsapp_milhas", "Link do grupo de milhas", "Vazio = usa o link principal")}
            <div class="field"><label>Rodapé de milhas</label><textarea data-aj="rodape_milhas" rows="2" style="min-height:64px" placeholder="Vazio = usa o rodapé principal">${esc(a.rodape_milhas || "")}</textarea></div></div></details>
          <div class="field"><label>Como vai ficar</label><div class="texto" id="prev-rodape">${esc(previaTexto())}</div></div>
          <label class="chk"><input type="checkbox" data-aj="mostrar_link" ${a.mostrar_link ? "checked" : ""}> Mostrar link do voo no texto</label>
          <label class="chk"><input type="checkbox" data-aj="linha_premium" ${a.linha_premium ? "checked" : ""}> Incluir “⭐ Você recebeu em primeira mão por ser Premium.”</label>
          <label class="chk"><input type="checkbox" data-aj="telegram_ativo" ${a.telegram_ativo !== false ? "checked" : ""}> Postar automaticamente no canal do Telegram</label>
        </div></div>
      <div class="card"><h3>Sensibilidade do radar</h3><div class="desc">Quanto mais baixo o desconto mínimo, mais alertas (e menos “bons”).</div>
        <div class="form">
          ${num("desconto_minimo", "Desconto mínimo", "0,20 = 20% abaixo da média", 0.01)}
          ${num("max_alertas_por_rodada", "Alertas por rodada", "rodadas a cada 3h (8 por dia)")}
          ${num("rotas_por_rodada", "Rotas por rodada", "mais rotas = rodada mais longa")}
          ${num("dias_fim", "Buscar até (dias)", "quantos dias à frente")}
          ${num("passo_dias", "Testar a cada (dias)", "1 = todo dia (recomendado)")}
          ${num("dias_inicio", "Começar daqui a (dias)", "primeira data varrida")}
          ${num("tolerancia_datas", "Datas listadas até", "0,10 = até 10% acima do menor preço", 0.01)}
          ${num("max_escalas_nacional", "Paradas máx. (nacional)", "0 = só direto")}
          ${num("max_escalas_internacional", "Paradas máx. (internac.)", "")}
          ${num("desconto_2paradas", "Internacional c/ 2 paradas", "só alerta se ≥ este desconto (0,30 = 30%)", 0.01)}
          ${num("dias_sem_repetir", "Não repetir por (dias)", "mesma rota e preço")}
        </div></div>
    </div>
    <div class="head" style="margin:22px 0 12px"><div><h1 style="font-size:18px">Rodadas recentes</h1><p>O radar roda sozinho a cada 3 horas no GitHub</p></div>
      <div class="acts"><a class="bt" target="_blank" rel="noopener" href="https://github.com/${REPO}/actions">${ic("ext")}Ver no GitHub</a><button class="bt" data-act="turbo">${ic("zap")}Varredura turbo</button><button class="bt pri" data-act="rodar">${ic("play")}Rodar agora</button></div></div>
    <div class="tbl-wrap"><table><thead><tr><th>Quando</th><th>Rotas</th><th class="num">Candidatos</th><th class="num">Alertas</th><th class="num">Duração</th></tr></thead><tbody>
      ${rd.map(r => `<tr><td style="white-space:nowrap">${dm(r.quando)} ${r.quando.slice(11, 16)}${r.manual ? ' <span class="tag info">manual</span>' : ""}</td><td style="font-size:12px;color:var(--text-body)">${(r.rotas || []).join(", ")}</td><td class="num">${r.candidatos}</td><td class="num" style="font-weight:700;color:${r.alertas ? "var(--positive-text)" : "inherit"}">${r.alertas}</td><td class="num">${r.segundos ? Math.round(r.segundos / 60) + " min" : "–"}</td></tr>`).join("") || `<tr><td colspan="5" class="vazio">Sem rodadas ainda.</td></tr>`}
    </tbody></table></div>`;
}

/* ------------------------------------------------------------ eventos */
document.addEventListener("click", e => { if (document.body.classList.contains("menu-aberto") && !e.target.closest("#rail") && !e.target.closest('[data-act="menu"]')) document.body.classList.remove("menu-aberto"); });
document.addEventListener("click", e => { const z = e.target.closest("[data-marca]"); if (z && !enviado({ id: z.dataset.marca })) marcar(z.dataset.marca, true); }, true);
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const act = b.dataset.act;
  if (b.tagName === "A" && act === "limpar") e.preventDefault();
  const A = id => S.alertas.find(a => a.id === id);
  try {
    if (act === "alabrir") { S.alAberto = S.alAberto === b.dataset.id ? "" : b.dataset.id; const r = document.querySelector(`article.al-row[data-id="${CSS.escape(b.dataset.id)}"]`); document.querySelectorAll("article.al-row.aberto").forEach(x => { const a = S.alertas.find(y => y.id === x.dataset.id); if (a && x !== r) x.outerHTML = linhaAlerta(a); }); const r2 = document.querySelector(`article.al-row[data-id="${CSS.escape(b.dataset.id)}"]`); if (r2) r2.outerHTML = linhaAlerta(S.alertas.find(y => y.id === b.dataset.id)); return; }
    if (act === "filacopiar") { const f = filaEnvio().find(x => x.id === b.dataset.id); if (f) { await copiar(f.texto); marcar(f.id, true); toast("Copiado e marcado como enviado."); render(); } return; }
    if (act === "rodapemodelo") { const t = $('[data-aj="rodape"]'); if (t) { t.value = b.dataset.v; t.dispatchEvent(new Event("input", { bubbles: true })); } return; }
    if (act === "menu") { document.body.classList.toggle("menu-aberto"); return; }
    if (act === "tema") { const n = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = n; store("p085_tema", n); }
    else if (act === "marcar") { marcar(b.dataset.id, !enviado(A(b.dataset.id))); }
    else if (act === "copiar") { await copiar(A(b.dataset.id).texto); if (!enviado(A(b.dataset.id))) { marcar(b.dataset.id, true); toast(`Copiado: ${A(b.dataset.id).destino_nome} · ${brl(A(b.dataset.id).preco)} — marcado como enviado.`, 3500); return; } const o = b.innerHTML; b.innerHTML = ic("check") + "Copiado"; b.classList.add("done"); setTimeout(() => { b.innerHTML = o; b.classList.remove("done"); }, 1600); }
    else if (act === "vertexto") { const t = $("#tx-" + CSS.escape(b.dataset.id)); t.hidden = !t.hidden; b.textContent = t.hidden ? "Ver texto" : "Esconder"; }
    else if (act === "copiarvisiveis") { const L = filtrar(); await copiar(L.map(a => a.texto).join("\n\n\n")); toast(`✓ ${L.length} alertas copiados`); }
    else if (act === "limpar") { S.F = { q: "", tipo: "", classe: "", cia: "", mes: "", max: "", direto: false, ordem: "recentes", dias: "30" }; render(); }
    else if (act === "recarregar") { document.body.classList.add("voando"); await carregar(); render(); setTimeout(() => { if (!S.rodando) document.body.classList.remove("voando"); }, 900); toast("Atualizado."); }
    else if (act === "addvip") {
      const iata = $("#vp-iata").value.toUpperCase().trim();
      if (!addRota(iata, { foco: true })) return;
      const r = S.rotas.find(x => x.iata === iata); r.vip = true; r.vip_nome = $("#vp-nome").value.trim(); r.vip_alvo = +$("#vp-alvo").value || null;
      await salvarRotas();
    }
    else if (act === "tirarvip") { const r = S.rotas[+b.dataset.i]; if (confirm(`Encerrar o pedido VIP de ${r.nome}?`)) { r.vip = false; r.vip_nome = ""; r.vip_alvo = null; S.rotasSujo = true; await salvarRotas(); } }
    else if (act === "copiartxt") { await copiar(b.dataset.t); toast("Copiado."); }
    else if (act === "qr") { mostrarQR(b.dataset.t, b.dataset.n); }
    else if (act === "fecharqr") { $("#qr-box").innerHTML = ""; }
    else if (act === "salvargrupos") {
      b.disabled = true;
      try { await salvarArquivo("docs/grupos.json", S.grupos, "Painel: atualiza grupos"); S.gruposSujo = false; toast("Grupos salvos. A página de links atualiza em ~1 min."); render(); }
      catch (err) { toast("Não salvou: " + err.message, 5000); b.disabled = false; }
    }
    else if (act === "turbo") { b.disabled = true; await rodarTurbo(); b.disabled = false; }
    else if (act === "pill") {
      const g = b.dataset.g, v = b.dataset.v;
      if (g === "convmodo") { S.convModo = v; }
      else if (g === "alvista") { ALV = v; try { localStorage.setItem("p085_vista_alertas", v); } catch (x) { } }
      else if (g === "alertas") S.F.ordem = v; else if (g === "rotas") S.R.ordem = v; else if (g === "rotastipo") S.R.tipo = v;
      else if (g === "dash") S.dashOrd = v; else if (g === "hist") S.H.ordem = v; else if (g === "dest") S.D.ordem = v; else if (g === "desttipo") S.D.tipo = v;
      render(); return;
    }
    else if (act === "histabrir") { const k = b.dataset.k; S.H.aberto = S.H.aberto === k ? "" : k; if (S.H.aberto) await carregarCal(k.split("-")[1]); render(); return; }
    else if (act === "histcal") { S.D.sel = b.dataset.k; await carregarCal(b.dataset.k); }
    else if (act === "abrirdest") { S.D.sel = S.D.sel === b.dataset.iata ? "" : b.dataset.iata; if (S.D.sel) await carregarCal(S.D.sel); render(); setTimeout(() => { const el = document.getElementById("cal-" + S.D.sel); if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, 50); return; }
    else if (act === "focodest") { addRota(b.dataset.iata, { foco: true }); await salvarRotas(); }
    else if (act === "rodar") { b.disabled = true; await rodarRadar(""); b.disabled = false; }
    else if (act === "buscarrota") { if (S.rotasSujo) await salvarRotas(); b.disabled = true; await rodarRadar(b.dataset.iata); b.textContent = "Buscando…"; }
    else if (act === "addrota") {
      const ok = addRota($("#nr-iata").value, { nome: $("#nr-nome").value.trim(), tipo: $("#nr-tipo").value, teto: +$("#nr-teto").value || null, duracao: +$("#nr-dur").value || null, foco: $("#nr-foco").checked });
      if (ok) { render(); toast("Rota adicionada — clique em Salvar alterações."); }
    }
    else if (act === "preset") { let n = 0; PRESETS[b.dataset.p].forEach(i => { if (!S.rotas.find(r => r.iata === i)) { addRota(i); n++; } }); render(); toast(n ? `${n} rotas adicionadas — salve para valer.` : "Essas rotas já estão cadastradas."); }
    else if (act === "excluirrota") { const r = S.rotas[+b.dataset.i]; if (confirm(`Excluir ${r.iata} (${r.nome})?`)) { S.rotas.splice(+b.dataset.i, 1); S.rotasSujo = true; render(); } }
    else if (act === "salvarrotas") { b.disabled = true; await salvarRotas(); }
    else if (act === "salvarajustes") {
      b.disabled = true;
      try { await salvarArquivo("docs/ajustes.json", S.ajustes, "Painel: atualiza ajustes"); S.ajustesSujo = false; toast("✓ Ajustes salvos."); render(); }
      catch (err) { toast("Não salvou: " + err.message, 5000); b.disabled = false; }
    }
    else if (act === "salvartoken") {
      const v = $("#tok").value.trim(); if (v.startsWith("••")) { toast("Token já salvo."); return; }
      store("p085_token", v);
      const r = await gh("");
      if (r.permissions && r.permissions.push) { toast("✓ Token funcionando — você já pode salvar e rodar o radar."); render(); }
      else toast("O token não tem permissão de escrita neste repositório.", 5000);
    }
    else if (act === "sairtoken") { store("p085_token", ""); IG.lista = null; render(); }
    else if (act === "converter") { S.convIn = $("#conv-in").value; S.conv = extrair(S.convIn); render(); }
    else if (act === "convcopiar") { await copiar(convTextos(S.conv)[b.dataset.k || "grupo"]); toast("Copiado."); }
    else if (act === "convtipo") { S.conv.tipo = b.dataset.v; render(); }
    else if (act === "convarte") {
      const c = S.conv, idas = listaDatas(c.idas), voltas = listaDatas(c.voltas), d = c.media ? Math.max(0, 1 - c.preco / c.media) : 0;
      const pm = l => { const g = {}; l.forEach(x => { const k = `${["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][+x.slice(5, 7) - 1]} ${x.slice(0, 4)}`; (g[k] = g[k] || []).push(x.slice(8, 10)); }); return Object.entries(g).map(([mes, dias]) => ({ mes, dias })); };
      const a = { id: "conv-" + Date.now(), criado: new Date(Date.now() - 3 * 36e5).toISOString().slice(0, 16) + "-03:00", destino: c.destino, destino_nome: (S.rotas.find(r => r.iata === c.destino) || {}).nome || IATA[c.destino] || c.destino,
        tipo: INTL.has(c.destino) ? "internacional" : "nacional", modo: c.trecho ? "trecho" : "rt", preco: +c.preco, preco_tipico: +c.media || +c.preco, desconto: d, classe: d >= .4 ? "imperdivel" : d >= .3 ? "otima" : "boa",
        cia_nome: c.cia, escalas: null, ida: idas[0] || "", volta: voltas[0] || "", datas_ida: idas.map(x => ({ dia: x })), datas_volta: voltas.map(x => ({ dia: x })), ida_meses: pm(idas), volta_meses: pm(voltas), datas: [], texto: convTextos(c).grupo, convertido: true };
      S.alertas.unshift(a); CR.id = a.id; CR.tpl = "promo"; location.hash = "#criativos";
    }
    else if (act === "convrota") { addRota(S.conv.destino, { foco: true }); toast(`${S.conv.destino} em foco — salve em Rotas.`); location.hash = "#rotas"; }
  } catch (err) { toast("Erro: " + err.message, 5000); b.disabled = false; }
});
document.addEventListener("input", e => {
  const el = e.target;
  if (el.dataset.f !== undefined) {
    S.F[el.dataset.f] = el.type === "checkbox" ? el.checked : el.value;
    if (el.type === "search" || el.type === "number") { clearTimeout(el._t); el._t = setTimeout(() => { const pos = el.selectionStart; render(); const n = $(`[data-f="${el.dataset.f}"]`); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { } } }, 250); }
    else render();
  } else if (el.dataset.g !== undefined && el.dataset.c) {
    const g = S.grupos[+el.dataset.g]; g[el.dataset.c] = el.type === "checkbox" ? el.checked : el.value; S.gruposSujo = true;
    const bar = $(".head .acts"); if (bar && !bar.querySelector('[data-act="salvargrupos"]')) bar.insertAdjacentHTML("afterbegin", `<button class="bt pri" data-act="salvargrupos">Salvar grupos</button>`);
  } else if (el.dataset.conv !== undefined) {
    S.conv[el.dataset.conv] = el.type === "number" ? (+el.value || "") : el.value;
    const T = convTextos(S.conv); ["grupo", "insta", "stories"].forEach(k => { const n = $("#conv-" + k); if (n) n.textContent = T[k]; });
    const z = $("#conv-zap"); if (z) z.href = "https://wa.me/?text=" + encodeURIComponent(T.grupo);
  } else if (el.dataset.d !== undefined) {
    S.D[el.dataset.d] = el.value; clearTimeout(el._t); el._t = setTimeout(() => { const pos = el.selectionStart; render(); const n = $(`[data-d="${el.dataset.d}"]`); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { } } }, 250);
  } else if (el.dataset.rota !== undefined) {
    const r = S.rotas[+el.dataset.rota], k = el.dataset.campo;
    r[k] = el.type === "checkbox" ? el.checked : el.tagName === "SELECT" ? (el.value || undefined) : (el.value ? +el.value : null);
    S.rotasSujo = true;
    if (el.type === "checkbox" || el.tagName === "SELECT") render(); else { const bar = $(".head .acts"); if (bar && !bar.querySelector('[data-act="salvarrotas"]')) bar.insertAdjacentHTML("afterbegin", `<button class="bt pri" data-act="salvarrotas">${ic("save")}Salvar alterações</button>`); }
  } else if (el.dataset.aj !== undefined) {
    const k = el.dataset.aj;
    S.ajustes[k] = el.type === "checkbox" ? el.checked : el.type === "number" ? (el.value === "" ? null : +el.value) : el.value;
    S.ajustesSujo = true;
    if (["rodape", "rodape_milhas", "link_whatsapp", "link_whatsapp_milhas", "aviso_preco", "assinatura"].includes(k)) { reaplicarTextos(); const pv = $("#prev-rodape"); if (pv) pv.textContent = previaTexto(); }
    const bar = $(".head .acts"); if (bar && !bar.querySelector('[data-act="salvarajustes"]')) bar.insertAdjacentHTML("afterbegin", `<button class="bt pri" data-act="salvarajustes">${ic("save")}Salvar ajustes</button>`);
  } else if (el.dataset.conv !== undefined && false) {
    S.conv[el.dataset.conv] = el.type === "number" ? (+el.value || "") : el.value;
    $("#conv-out").textContent = textoConvertido(S.conv);
    $("#conv-zap").href = "https://wa.me/?text=" + encodeURIComponent(textoConvertido(S.conv));
  } else if (el.id === "nr-iata") {
    const v = el.value.toUpperCase(); if (IATA[v]) { $("#nr-nome").value = IATA[v]; $("#nr-tipo").value = INTL.has(v) ? "internacional" : "nacional"; }
  }
});
document.addEventListener("change", e => { if (e.target.dataset.act === "histsel") { S.histRota = e.target.value; render(); } });

/* tooltip */
const tip = $("#tip");
document.addEventListener("mousemove", e => {
  const t = e.target.closest("[data-tip]");
  if (!t) { tip.style.opacity = 0; return; }
  tip.textContent = t.dataset.tip; tip.style.opacity = 1;
  const w = tip.offsetWidth; tip.style.left = Math.min(window.innerWidth - w - 8, e.clientX + 12) + "px"; tip.style.top = (e.clientY - 34) + "px";
});
window.addEventListener("beforeunload", e => { if (S.rotasSujo || S.ajustesSujo) { e.preventDefault(); e.returnValue = ""; } });

/* ------------------------------------------------------------ início */
(async () => {
  const mc = (location.hash || "").match(/^#conectar=([\w-]+)/);
  if (mc) { store("p085_token", mc[1]); history.replaceState(null, "", location.pathname + "#dashboard"); setTimeout(() => toast("✓ Aparelho conectado. Pode usar normalmente."), 800); }
  await carregar(); render(); checarRodando();
  if (token()) fetch(API, { headers: { Authorization: "Bearer " + token() } }).then(r => { const h = r.headers.get("github-authentication-token-expiration"); if (h) { S.tokenVence = Math.floor((new Date(h.replace(" UTC", "Z").replace(" ", "T")) - Date.now()) / 864e5); if (S.tokenVence <= 10) render(); } }).catch(() => { });
  setInterval(async () => { if (!S.rotasSujo && !S.ajustesSujo && !document.querySelector("input:focus,textarea:focus")) { await carregar(); if (S.mi && !S.mi.carregando) S.mi = null; if (!/converter|ajustes|rotas|milhas/.test(location.hash)) render(); } }, 120000);
})();
