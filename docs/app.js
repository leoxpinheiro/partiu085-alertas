/* Radar Partiu085 — painel (GitHub Pages + API do GitHub para salvar) */
"use strict";
const REPO = "leoxpinheiro/partiu085-alertas";
const ORIGEM = "FOR";
const META_DIA = 6;
const API = "https://api.github.com/repos/" + REPO;

const S = {
  alertas: [], rotas: [], ajustes: {}, status: { rotas: {} }, hist: {}, rodadas: [],
  rotasSujo: false, ajustesSujo: false,
  F: { q: "", tipo: "", classe: "", cia: "", mes: "", max: "", direto: false, ordem: "recentes", dias: "30" },
  histRota: "", conv: null,
};

/* ------------------------------------------------------------ util */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const brl = v => "R$ " + Math.round(+v || 0).toLocaleString("pt-BR");
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
  await gh("/actions/workflows/alertas.yml/dispatches", { method: "POST", body: JSON.stringify({ ref: "main", inputs: { rotas } }) });
  toast(rotas ? `Buscando ${rotas} agora… os alertas aparecem em ~3 min.` : "Rodada completa iniciada… leva ~10 min.", 4200);
  setTimeout(checarRodando, 4000);
}
async function checarRodando() {
  try {
    const r = await fetch(API + "/actions/runs?per_page=3", { headers: { Accept: "application/vnd.github+json" } }).then(r => r.json());
    const rodando = (r.workflow_runs || []).some(w => w.status !== "completed" && w.name.startsWith("Alertas"));
    const p = $("#pulse"); p.innerHTML = rodando ? "<i></i>Varrendo agora…" : "<i></i>Radar ligado";
    if (rodando) setTimeout(checarRodando, 30000);
  } catch (e) { }
}

/* ------------------------------------------------------------ dados */
async function getJSON(f, padrao) {
  try { const r = await fetch(f + "?t=" + Date.now()); if (!r.ok) throw 0; return await r.json(); } catch (e) { return padrao; }
}
async function carregar() {
  const [a, r, aj, st, h, rd] = await Promise.all([
    getJSON("alerts.json", { alertas: [] }), getJSON("rotas.json", []), getJSON("ajustes.json", {}),
    getJSON("status.json", { rotas: {} }), getJSON("historico.json", {}), getJSON("rodadas.json", []),
  ]);
  S.alertas = (a.alertas || []).map(x => ({ ...x, ida: x.ida || (x.datas && x.datas[0] && x.datas[0].ida), volta: x.volta || (x.datas && x.datas[0] && x.datas[0].volta) }))
    .sort((x, y) => y.criado.localeCompare(x.criado));
  if (!S.rotasSujo) S.rotas = r;
  if (!S.ajustesSujo) S.ajustes = aj;
  S.status = st || { rotas: {} }; S.hist = h || {}; S.rodadas = rd || [];
  $("#ultima").textContent = "Última varredura " + haQuanto(S.status.ultima_rodada || a.atualizado) + " · próxima " + proximaRodada();
}

/* ------------------------------------------------------------ navegação */
const PAGS = [
  ["dashboard", "📊", "Dashboard"], ["alertas", "🚨", "Alertas"], ["rotas", "✈️", "Rotas"],
  ["historico", "📈", "Histórico"], ["converter", "🔄", "Converter"], ["ajustes", "⚙️", "Ajustes"],
];
function navs() {
  const pag = (location.hash || "#dashboard").slice(1).split("?")[0];
  const hoje = S.alertas.filter(a => a.criado.slice(0, 10) === hojeISO()).length;
  $("#nav").innerHTML = `<div class="nav-sec">Radar</div>` + PAGS.map(([k, i, n], idx) =>
    (idx === 2 ? `<div class="nav-sec">O que vigiar</div>` : idx === 4 ? `<div class="nav-sec">Ferramentas</div>` : "") +
    `<a href="#${k}" class="${pag === k ? "on" : ""}">${i} ${n}${k === "alertas" && hoje ? `<span class="cnt">${hoje} hoje</span>` : ""}${k === "rotas" ? `<span class="cnt">${S.rotas.filter(r => r.ativo !== false).length}</span>` : ""}</a>`).join("");
  $("#bottom").innerHTML = PAGS.map(([k, i, n]) => `<a href="#${k}" class="${pag === k ? "on" : ""}"><span>${i}</span>${n}</a>`).join("");
  return pag;
}
function render() {
  const pag = navs();
  const fn = { dashboard: pDash, alertas: pAlertas, rotas: pRotas, historico: pHist, converter: pConv, ajustes: pAjustes }[pag] || pDash;
  $("#main").innerHTML = fn();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", render);

/* ------------------------------------------------------------ componentes */
function head(t, p, acts = "") { return `<div class="head"><div><h1>${t}</h1><p>${p}</p></div><div class="acts">${acts}</div></div>`; }
function kpi(lbl, num, sub = "", acc = false) { return `<div class="card kpi"><div class="lbl">${lbl}</div><div class="num ${acc ? "acc" : ""}">${num}</div><div class="sub">${sub}</div></div>`; }
function hbars(pares, vazio = "Sem dados ainda") {
  if (!pares.length) return `<div class="vazio">${vazio}</div>`;
  const max = Math.max(...pares.map(p => p[1]));
  return `<div class="hbars">${pares.map(([n, v]) => `<div class="hrow" data-tip="${esc(n)}: ${v} alerta${v > 1 ? "s" : ""}"><span class="n">${esc(n)}</span><span class="t"><i style="width:${(v / max) * 100}%"></i></span><span class="v">${v}</span></div>`).join("")}</div>`;
}
function contar(lista, fn) { const m = {}; lista.forEach(x => { const k = fn(x); if (k) m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); }

function cardAlerta(a, compacto = false) {
  const outras = (a.opcoes && a.opcoes.length ? a.opcoes : (a.datas || []));
  const datas = outras.slice(0, compacto ? 4 : 10).map(d => `<span class="${d.ida === a.ida && d.volta === a.volta ? "main" : ""}">${dm(d.ida)} → ${dm(d.volta)}${a.opcoes && a.opcoes.length ? ` · ${brl(d.preco)}` : ""}</span>`).join("") +
    (outras.length > (compacto ? 4 : 10) ? `<span>+${outras.length - (compacto ? 4 : 10)}</span>` : "");
  const k = a.classe || "boa";
  const ktxt = { imperdivel: "🔥 Imperdível", otima: "⭐ Ótima", boa: "✅ Boa" }[k];
  return `<article class="al ${k}">
    <div class="al-top">
      <div><div class="rt">${ORIGEM} → ${esc(a.destino)} · ${a.tipo === "internacional" ? "INTERNACIONAL" : "NACIONAL"}</div><div class="ds">${esc(a.destino_nome)}</div></div>
      <div class="preco">${brl(a.preco)}<small>média ${brl(a.preco_tipico)}</small></div>
    </div>
    <div class="tags">
      <span class="tag ${k}">${ktxt}</span><span class="tag ${k}">−${pct(a.desconto)}</span>
      <span class="tag">${esc(nomeCia(a.cia_nome))}</span><span class="tag">${paradasTxt(a.escalas)}</span>
      <span class="tag info">${outras.length} data${outras.length > 1 ? "s" : ""} · ${(a.meses || []).join(", ")}</span>
      ${a.telegram ? `<span class="tag">✓ Telegram</span>` : ""}
    </div>
    <div class="datas">${datas}</div>
    <div class="al-acts">
      <button class="bt sm" data-act="copiar" data-id="${esc(a.id)}">📋 Copiar</button>
      <a class="bt sm zap" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(a.texto || "")}">WhatsApp</a>
      <a class="bt sm" target="_blank" rel="noopener" href="${esc(a.link_google)}">Google Voos</a>
      ${compacto ? "" : `<button class="bt sm ghost" data-act="vertexto" data-id="${esc(a.id)}">Ver texto</button>`}
    </div>
    <div class="texto" id="tx-${esc(a.id)}" hidden>${esc(a.texto)}</div>
    <div class="quando"><span>Encontrado ${a.criado.slice(0, 10) === hojeISO() ? "hoje" : dm(a.criado)} às ${a.criado.slice(11, 16)}</span>${a.link_compra ? `<a href="${esc(a.link_compra)}" target="_blank" rel="noopener">link de compra ↗</a>` : ""}</div>
  </article>`;
}

/* ------------------------------------------------------------ Dashboard */
function pDash() {
  const h = hojeISO(), A = S.alertas;
  const em = n => A.filter(a => a.criado.slice(0, 10) >= diaMenos(h, n - 1));
  const a7 = em(7), a30 = em(30);
  const melhor = a30.slice().sort((x, y) => y.desconto - x.desconto)[0];
  const ativas = S.rotas.filter(r => r.ativo !== false).length;
  const dias = Array.from({ length: 14 }, (_, i) => diaMenos(h, 13 - i));
  const cont = Object.fromEntries(dias.map(d => [d, 0])); A.forEach(a => { const d = a.criado.slice(0, 10); if (d in cont) cont[d]++; });
  const max = Math.max(META_DIA + 2, ...Object.values(cont));
  const bateu = dias.filter(d => cont[d] >= META_DIA).length;
  const metaTop = 18 + (1 - META_DIA / max) * 152;
  const bars = dias.map(d => `<div class="vbar ${cont[d] >= META_DIA ? "hit" : ""}" data-tip="${dmy(d)}: ${cont[d]} alerta${cont[d] === 1 ? "" : "s"}"><b>${cont[d] || ""}</b><i style="height:${(cont[d] / max) * 152}px"></i></div>`).join("");
  const precos = Object.entries(S.status.rotas || {}).filter(([, v]) => v.menor && v.mediana)
    .map(([k, v]) => ({ k, ...v, d: 1 - v.menor / v.mediana, nome: (S.rotas.find(r => r.iata === k) || {}).nome || IATA[k] || k }))
    .sort((a, b) => b.d - a.d).slice(0, 8);
  const classes = contar(a30, a => a.classe || "boa");
  const cc = k => (classes.find(c => c[0] === k) || [0, 0])[1];
  return head("Dashboard", "O que o radar encontrou saindo de Fortaleza",
    `<button class="bt" data-act="recarregar">↻ Atualizar</button><button class="bt pri" data-act="rodar">▶ Rodar radar agora</button>`) +
    `<div class="grid kpis">
      ${kpi("Alertas hoje", A.filter(a => a.criado.slice(0, 10) === h).length, `meta: ${META_DIA} por dia`, true)}
      ${kpi("Últimos 7 dias", a7.length, `média ${(a7.length / 7).toFixed(1).replace(".", ",")} por dia`)}
      ${kpi("Últimos 30 dias", a30.length, `${cc("imperdivel")} imperdíveis · ${cc("otima")} ótimas`)}
      ${kpi("Maior desconto", melhor ? "−" + pct(melhor.desconto) : "–", melhor ? `${melhor.destino_nome} por ${brl(melhor.preco)}` : "ainda sem alertas")}
      ${kpi("Rotas vigiadas", ativas, `${S.rotas.filter(r => r.foco).length} em foco`)}
      ${kpi("Última varredura", haQuanto(S.status.ultima_rodada), "próxima " + proximaRodada())}
    </div>
    <div class="grid two">
      <div class="card"><div class="card-h"><div><h3>Alertas por dia</h3><div class="desc">Últimos 14 dias · bateu a meta em ${bateu} dia${bateu === 1 ? "" : "s"}</div></div></div>
        <div class="vbars"><div class="meta-line" style="top:${metaTop}px"><span>meta ${META_DIA}</span></div>${bars}</div>
        <div class="vlab">${dias.map(d => `<span>${d.slice(8, 10)}</span>`).join("")}</div>
        <div class="legend"><span><i style="background:var(--bar)"></i>bateu a meta</span><span><i style="background:var(--bar2)"></i>abaixo da meta</span></div>
      </div>
      <div class="card"><h3>Por companhia</h3><div class="desc">Alertas dos últimos 30 dias</div>${hbars(contar(a30, a => a.cia_nome).slice(0, 7))}</div>
    </div>
    <div class="grid two">
      <div class="card"><h3>Onde está mais barato agora</h3><div class="desc">Menor preço da última varredura vs. média da rota</div>
        ${precos.length ? `<div class="tbl-wrap" style="border:none"><table><thead><tr><th>Destino</th><th class="num">Menor</th><th class="num">Média</th><th class="num">Abaixo</th><th></th></tr></thead><tbody>
        ${precos.map(p => `<tr><td><span class="iata">${p.k}</span> <span style="color:var(--muted)">${esc(p.nome)}</span></td><td class="num">${brl(p.menor)}</td><td class="num">${brl(p.mediana)}</td><td class="num" style="color:${p.d >= .2 ? "var(--acc)" : "var(--ink2)"};font-weight:650">−${pct(p.d)}</td><td class="num" style="color:var(--muted);font-size:12px">${haQuanto(p.quando)}</td></tr>`).join("")}
        </tbody></table></div>` : `<div class="vazio">Aparece depois da primeira varredura.</div>`}
      </div>
      <div class="card"><h3>Destinos com mais alertas</h3><div class="desc">Últimos 30 dias</div>${hbars(contar(a30, a => a.destino_nome).slice(0, 8))}</div>
    </div>
    <div class="head" style="margin:22px 0 12px"><div><h1 style="font-size:18px">Últimos alertas</h1></div><div class="acts"><a class="bt" href="#alertas">Ver todos →</a></div></div>
    ${A.length ? `<div class="alertas">${A.slice(0, 4).map(a => cardAlerta(a, true)).join("")}</div>` : `<div class="card vazio">Nenhum alerta ainda — o radar varre a cada 3 horas.</div>`}`;
}

/* ------------------------------------------------------------ Alertas */
function filtrar() {
  const F = S.F, h = hojeISO();
  let L = S.alertas.filter(a => {
    if (F.dias && a.criado.slice(0, 10) < diaMenos(h, +F.dias - 1)) return false;
    if (F.q) { const q = F.q.toLowerCase(); if (!(`${a.destino} ${a.destino_nome} ${a.cia_nome}`.toLowerCase().includes(q))) return false; }
    if (F.tipo && a.tipo !== F.tipo) return false;
    if (F.classe && (a.classe || "boa") !== F.classe) return false;
    if (F.cia && a.cia_nome !== F.cia) return false;
    if (F.mes && !(a.datas || []).some(d => d.ida.slice(0, 7) === F.mes)) return false;
    if (F.max && a.preco > +F.max) return false;
    if (F.direto && a.escalas !== 0) return false;
    return true;
  });
  const ord = { recentes: (x, y) => y.criado.localeCompare(x.criado), preco: (x, y) => x.preco - y.preco, desconto: (x, y) => y.desconto - x.desconto, ida: (x, y) => (x.ida || "").localeCompare(y.ida || "") }[F.ordem];
  return L.sort(ord);
}
function pAlertas() {
  const F = S.F;
  const cias = [...new Set(S.alertas.map(a => a.cia_nome).filter(Boolean))].sort();
  const meses = [...new Set(S.alertas.flatMap(a => (a.datas || []).map(d => d.ida.slice(0, 7))))].sort();
  const L = filtrar();
  const opt = (v, t, sel) => `<option value="${esc(v)}" ${sel === v ? "selected" : ""}>${esc(t)}</option>`;
  return head("Alertas", "Tudo que o radar apitou — filtre, copie e envie",
    `<button class="bt" data-act="copiarvisiveis">📋 Copiar todos visíveis</button>`) +
    `<div class="filtros" id="filtros">
      <input class="busca" type="search" placeholder="Buscar destino ou companhia…" data-f="q" value="${esc(F.q)}">
      <select data-f="dias">${opt("1", "Hoje", F.dias)}${opt("7", "7 dias", F.dias)}${opt("30", "30 dias", F.dias)}${opt("", "Tudo", F.dias)}</select>
      <select data-f="tipo">${opt("", "Nacional + internacional", F.tipo)}${opt("nacional", "Nacional", F.tipo)}${opt("internacional", "Internacional", F.tipo)}</select>
      <select data-f="classe">${opt("", "Todas as classes", F.classe)}${opt("imperdivel", "🔥 Imperdível", F.classe)}${opt("otima", "⭐ Ótima", F.classe)}${opt("boa", "✅ Boa", F.classe)}</select>
      <select data-f="cia">${opt("", "Todas as cias", F.cia)}${cias.map(c => opt(c, c, F.cia)).join("")}</select>
      <select data-f="mes">${opt("", "Qualquer mês", F.mes)}${meses.map(m => opt(m, MESES[+m.slice(5, 7) - 1] + "/" + m.slice(2, 4), F.mes)).join("")}</select>
      <input type="number" inputmode="numeric" placeholder="Até R$" data-f="max" value="${esc(F.max)}" style="width:100px">
      <label class="chk"><input type="checkbox" data-f="direto" ${F.direto ? "checked" : ""}> Só voo direto</label>
      <select data-f="ordem">${opt("recentes", "Mais recentes", F.ordem)}${opt("desconto", "Maior desconto", F.ordem)}${opt("preco", "Menor preço", F.ordem)}${opt("ida", "Data de ida", F.ordem)}</select>
    </div>
    <div class="resultado"><span>${L.length} alerta${L.length === 1 ? "" : "s"}</span>${Object.values(F).some((v, i) => v && !["recentes", "30"].includes(v)) ? `<a href="#" data-act="limpar">Limpar filtros</a>` : ""}</div>
    ${L.length ? `<div class="alertas">${L.map(a => cardAlerta(a)).join("")}</div>` : `<div class="card vazio">Nenhum alerta com esses filtros.</div>`}`;
}

/* ------------------------------------------------------------ Rotas */
function pRotas() {
  const st = S.status.rotas || {};
  const linhas = S.rotas.map((r, i) => {
    const s = st[r.iata] || {};
    return `<tr class="${r.ativo === false ? "off" : ""}">
      <td><span class="iata">${esc(r.iata)}</span></td>
      <td>${esc(r.nome)}</td>
      <td><span class="tag ${r.tipo === "internacional" ? "info" : ""}">${r.tipo === "internacional" ? "Internacional" : "Nacional"}</span></td>
      <td class="num"><input class="mini" type="number" data-rota="${i}" data-campo="teto" value="${r.teto || ""}" placeholder="sem teto"></td>
      <td class="num">${s.menor ? brl(s.menor) : "–"}</td>
      <td class="num">${s.mediana ? brl(s.mediana) : "–"}</td>
      <td style="color:var(--muted);font-size:12px;white-space:nowrap">${s.quando ? haQuanto(s.quando) : "ainda não"}</td>
      <td><label class="sw" title="Foco: varre em toda rodada"><input type="checkbox" data-rota="${i}" data-campo="foco" ${r.foco ? "checked" : ""}><span></span></label></td>
      <td><label class="sw" title="Ativa"><input type="checkbox" data-rota="${i}" data-campo="ativo" ${r.ativo !== false ? "checked" : ""}><span></span></label></td>
      <td style="white-space:nowrap"><button class="bt sm" data-act="buscarrota" data-iata="${esc(r.iata)}">Buscar agora</button>
        <button class="bt sm ghost danger" data-act="excluirrota" data-i="${i}" title="Excluir">✕</button></td>
    </tr>`;
  }).join("");
  return head("Rotas", "Trechos que o radar vigia saindo de Fortaleza",
    `${S.rotasSujo ? `<button class="bt pri" data-act="salvarrotas">💾 Salvar alterações</button>` : ""}<button class="bt" data-act="rodar">▶ Rodar radar completo</button>`) +
    (!token() ? `<div class="aviso warn"><span>🔑 Para salvar rotas e rodar o radar daqui, configure seu token do GitHub.</span><a class="bt sm" href="#ajustes">Configurar</a></div>` : "") +
    (S.rotasSujo ? `<div class="aviso warn"><span>Você tem alterações não salvas.</span><button class="bt sm pri" data-act="salvarrotas">Salvar agora</button></div>` : "") +
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
      <div class="presets"><span style="font-size:12px;color:var(--muted);align-self:center">Pacotes prontos:</span>${Object.keys(PRESETS).map(p => `<button class="chip" data-act="preset" data-p="${p}">+ ${p}</button>`).join("")}</div>
    </div>
    <div class="tbl-wrap"><table><thead><tr><th>Cód.</th><th>Destino</th><th>Tipo</th><th class="num">Teto</th><th class="num">Menor agora</th><th class="num">Média</th><th>Varrida</th><th>Foco</th><th>Ativa</th><th></th></tr></thead>
    <tbody>${linhas || `<tr><td colspan="10" class="vazio">Nenhuma rota cadastrada.</td></tr>`}</tbody></table></div>
    <p style="font-size:12px;color:var(--muted);margin-top:10px">Rodízio: a cada rodada (3 em 3 horas) o radar varre ${S.ajustes.rotas_por_rodada || 11} rotas, sempre incluindo as de foco. Use foco em poucas rotas (até 5) para não deixar a rodada lenta.</p>`;
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
function pHist() {
  const keys = Object.keys(S.hist).sort();
  if (!S.histRota || !S.hist[S.histRota]) S.histRota = keys[0] || "";
  const serie = (S.hist[S.histRota] || []).slice(-60);
  const nome = k => { const i = k.split("-")[1]; return `${i} · ${(S.rotas.find(r => r.iata === i) || {}).nome || IATA[i] || ""}`; };
  return head("Histórico de preços", "Como o preço de cada rota se comporta dia a dia (ida e volta)") +
    `<div class="filtros"><select data-act="histsel" style="min-width:240px">${keys.map(k => `<option value="${k}" ${k === S.histRota ? "selected" : ""}>${esc(nome(k))}</option>`).join("")}</select>
      <span style="font-size:12.5px;color:var(--muted)">${serie.length} dia${serie.length === 1 ? "" : "s"} de histórico</span></div>
    <div class="card linechart">${serie.length >= 2 ? linha(serie) : `<div class="vazio">${serie.length ? `Hoje: menor ${brl(serie[0].minimo)} · média ${brl(serie[0].mediana)}.<br>` : ""}O gráfico aparece a partir do 2º dia de varredura dessa rota.</div>`}
      <div class="legend"><span><i style="background:var(--acc)"></i>Menor preço do dia</span><span><i style="background:var(--bar2)"></i>Preço médio (mediana)</span></div></div>
    <div class="sec-gap"></div>
    <div class="tbl-wrap"><table><thead><tr><th>Dia</th><th class="num">Menor</th><th class="num">Média</th><th class="num">Diferença</th></tr></thead><tbody>
    ${serie.slice().reverse().map(p => `<tr><td>${dmy(p.dia)}</td><td class="num">${brl(p.minimo)}</td><td class="num">${brl(p.mediana)}</td><td class="num">−${pct(1 - p.minimo / p.mediana)}</td></tr>`).join("") || `<tr><td colspan="4" class="vazio">Sem histórico.</td></tr>`}
    </tbody></table></div>`;
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
function extrair(txt) {
  const out = { origem: ORIGEM, destino: "", preco: "", media: "", ida: "", volta: "", cia: "", link: "" };
  const iatas = (txt.match(/\b[A-Z]{3}\b/g) || []).filter(c => IATA[c] || c === ORIGEM || /^[A-Z]{3}$/.test(c)).filter(c => !["BRL", "USD", "EUR", "VIP", "PIX"].includes(c));
  const dest = iatas.find(c => c !== ORIGEM); if (dest) out.destino = dest;
  if (iatas[0] && iatas[0] !== dest) out.origem = iatas[0];
  const precos = [...txt.matchAll(/R\$\s*([\d.]+(?:,\d{2})?)/g)].map(m => +m[1].replace(/\./g, "").replace(",", "."));
  if (precos[0]) out.preco = Math.round(precos[0]);
  const mm = txt.match(/m[ée]dia[^\d]*R?\$?\s*([\d.]+(?:,\d{2})?)/i); if (mm) out.media = Math.round(+mm[1].replace(/\./g, "").replace(",", "."));
  const ano = new Date().getFullYear();
  const datas = [...txt.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g)].map(m => {
    let y = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : ano; const d = `${y}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
    if (!m[3] && d < hojeISO()) y++; return `${y}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
  });
  out.ida = datas[0] || ""; out.volta = datas[1] || "";
  out.cia = CIAS_CONHECIDAS.find(c => new RegExp("\\b" + c + "\\b", "i").test(txt)) || "";
  if (out.cia === "GOL") out.cia = "Gol";
  const l = txt.match(/https?:\/\/\S+/); if (l) out.link = l[0];
  return out;
}
function textoConvertido(c) {
  const aj = S.ajustes || {};
  const nome = (S.rotas.find(r => r.iata === c.destino) || {}).nome || IATA[c.destino] || c.destino;
  const L = ["🚨 O RADAR APITOU", "", `✈️ Fortaleza → ${nome} (ida e volta)`];
  let d = 0;
  if (c.media && c.preco) d = 1 - c.preco / c.media;
  L.push(`💰 ${brl(c.preco)}${d > 0 ? ` · ${Math.round(d * 100)}% abaixo da média (${brl(c.media)})` : ""}`);
  if (d > 0) L.push(d >= .4 ? "🔥 IMPERDÍVEL" : d >= .3 ? "⭐ ÓTIMA OPORTUNIDADE" : "✅ BOA OPORTUNIDADE");
  if (c.cia) L.push(`🛫 ${c.cia}`);
  if (c.ida) L.push("", `📅 ${dm(c.ida)}${c.volta ? ` → ${dm(c.volta)}` : ""} · ${brl(c.preco)}`);
  L.push("", "⚠️ Preço pode mudar a qualquer momento.");
  if (aj.mostrar_link && c.link) L.push(`🔗 ${c.link}`);
  if (aj.linha_premium) L.push("⭐ Você recebeu em primeira mão por ser Premium.");
  const rod = [aj.link_whatsapp ? `✈️ Receba alertas: ${aj.link_whatsapp}` : "", aj.assinatura || ""].filter(Boolean);
  if (rod.length) L.push("", ...rod);
  return L.join("\n");
}
function pConv() {
  const c = S.conv;
  const campo = (k, lbl, tipo = "text") => `<div class="field"><label>${lbl}</label><input type="${tipo}" data-conv="${k}" value="${esc(c ? c[k] : "")}"></div>`;
  return head("Converter texto", "Cole um alerta de outro canal e transforme no padrão Partiu085") +
    `<div class="grid two">
      <div class="card"><h3>1. Cole o texto original</h3><div class="desc">De outro grupo, canal ou site — eu puxo destino, preço, datas, companhia e link.</div>
        <div class="field"><textarea id="conv-in" placeholder="Cole aqui…">${esc(S.convIn || "")}</textarea></div>
        <div style="margin-top:10px;display:flex;gap:8px"><button class="bt pri" data-act="converter">Converter</button></div>
        ${c ? `<div class="sec-gap"></div><h3>2. Confira os dados</h3><div class="form" style="margin-top:10px">
          ${campo("origem", "Origem")}${campo("destino", "Destino")}${campo("preco", "Preço R$", "number")}${campo("media", "Média R$", "number")}
          ${campo("ida", "Ida", "date")}${campo("volta", "Volta", "date")}${campo("cia", "Companhia")}${campo("link", "Link")}
        </div>` : ""}
      </div>
      <div class="card"><h3>${c ? "3. Texto pronto" : "Resultado"}</h3><div class="desc">No formato do seu radar</div>
        ${c ? `<div class="texto" id="conv-out">${esc(textoConvertido(c))}</div>
        <div class="al-acts" style="margin-top:10px"><button class="bt" data-act="convcopiar">📋 Copiar</button>
          <a class="bt zap" id="conv-zap" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(textoConvertido(c))}">WhatsApp</a>
          ${c.destino ? `<button class="bt" data-act="convrota">✈️ Vigiar ${esc(c.destino)} no radar</button>` : ""}</div>` : `<div class="vazio">O texto convertido aparece aqui.</div>`}
      </div></div>`;
}

/* ------------------------------------------------------------ Ajustes */
function pAjustes() {
  const a = S.ajustes, t = token();
  const num = (k, lbl, dica, step = 1) => `<div class="field"><label>${lbl}</label><input type="number" step="${step}" data-aj="${k}" value="${esc(a[k] ?? "")}"><small>${dica}</small></div>`;
  const txt = (k, lbl, dica) => `<div class="field"><label>${lbl}</label><input data-aj="${k}" value="${esc(a[k] ?? "")}"><small>${dica}</small></div>`;
  const rd = S.rodadas.slice(-12).reverse();
  return head("Ajustes", "Textos, sensibilidade do radar e acesso",
    `${S.ajustesSujo ? `<button class="bt pri" data-act="salvarajustes">💾 Salvar ajustes</button>` : ""}`) +
    `<div class="card" style="margin-bottom:14px"><h3>🔑 Acesso para salvar</h3><div class="desc">O painel é público só para leitura. Para salvar rotas/ajustes e rodar o radar, cole seu token do GitHub (fica guardado só neste navegador).</div>
      <div class="form"><div class="field" style="grid-column:span 2"><label>Token do GitHub</label><input type="password" id="tok" placeholder="github_pat_…" value="${t ? "••••••••••••" + t.slice(-4) : ""}"></div>
      <div class="field"><button class="bt pri" data-act="salvartoken">Salvar e testar</button></div>
      ${t ? `<div class="field"><button class="bt ghost danger" data-act="sairtoken">Remover deste aparelho</button></div>` : ""}</div></div>
    <div class="grid two">
      <div class="card"><h3>Texto dos alertas</h3><div class="desc">Vale para os próximos alertas e para o conversor.</div>
        <div class="form" style="grid-template-columns:1fr">
          ${txt("link_whatsapp", "Link do grupo (rodapé)", "Vazio = não aparece no alerta")}
          ${txt("assinatura", "Assinatura", "Vazio = não aparece no alerta")}
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
          ${num("passo_dias", "Testar a cada (dias)", "1 = toda data; 3 = mais rápido")}
          ${num("duracao_nacional", "Viagem nacional (dias)", "ida→volta")}
          ${num("duracao_internacional", "Viagem internacional (dias)", "ida→volta")}
          ${num("max_escalas_nacional", "Paradas máx. (nacional)", "0 = só direto")}
          ${num("max_escalas_internacional", "Paradas máx. (internac.)", "")}
          ${num("dias_sem_repetir", "Não repetir por (dias)", "mesma rota e preço")}
          ${num("dias_proximos", "Datas próximas (± dias)", "testa ida/volta em volta da melhor data")}
          ${num("max_opcoes", "Datas próximas no texto", "quantas opções listar")}
        </div></div>
    </div>
    <div class="head" style="margin:22px 0 12px"><div><h1 style="font-size:18px">Rodadas recentes</h1><p>O radar roda sozinho a cada 3 horas no GitHub</p></div>
      <div class="acts"><a class="bt" target="_blank" rel="noopener" href="https://github.com/${REPO}/actions">Ver no GitHub ↗</a><button class="bt pri" data-act="rodar">▶ Rodar agora</button></div></div>
    <div class="tbl-wrap"><table><thead><tr><th>Quando</th><th>Rotas</th><th class="num">Candidatos</th><th class="num">Alertas</th><th class="num">Duração</th></tr></thead><tbody>
      ${rd.map(r => `<tr><td style="white-space:nowrap">${dm(r.quando)} ${r.quando.slice(11, 16)}${r.manual ? ' <span class="tag info">manual</span>' : ""}</td><td style="font-size:12px;color:var(--ink2)">${(r.rotas || []).join(", ")}</td><td class="num">${r.candidatos}</td><td class="num" style="font-weight:700;color:${r.alertas ? "var(--acc)" : "inherit"}">${r.alertas}</td><td class="num">${r.segundos ? Math.round(r.segundos / 60) + " min" : "–"}</td></tr>`).join("") || `<tr><td colspan="5" class="vazio">Sem rodadas ainda.</td></tr>`}
    </tbody></table></div>`;
}

/* ------------------------------------------------------------ eventos */
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const act = b.dataset.act;
  if (b.tagName === "A" && act === "limpar") e.preventDefault();
  const A = id => S.alertas.find(a => a.id === id);
  try {
    if (act === "tema") { const n = document.documentElement.dataset.theme === "light" ? "dark" : "light"; document.documentElement.dataset.theme = n; store("p085_tema", n); }
    else if (act === "copiar") { await copiar(A(b.dataset.id).texto); b.textContent = "✓ Copiado"; b.classList.add("done"); setTimeout(() => { b.textContent = "📋 Copiar"; b.classList.remove("done"); }, 1600); }
    else if (act === "vertexto") { const t = $("#tx-" + CSS.escape(b.dataset.id)); t.hidden = !t.hidden; b.textContent = t.hidden ? "Ver texto" : "Esconder"; }
    else if (act === "copiarvisiveis") { const L = filtrar(); await copiar(L.map(a => a.texto).join("\n\n\n")); toast(`✓ ${L.length} alertas copiados`); }
    else if (act === "limpar") { S.F = { q: "", tipo: "", classe: "", cia: "", mes: "", max: "", direto: false, ordem: "recentes", dias: "30" }; render(); }
    else if (act === "recarregar") { await carregar(); render(); toast("✓ Atualizado"); }
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
    else if (act === "sairtoken") { store("p085_token", ""); render(); }
    else if (act === "converter") { S.convIn = $("#conv-in").value; S.conv = extrair(S.convIn); render(); }
    else if (act === "convcopiar") { await copiar(textoConvertido(S.conv)); toast("✓ Texto copiado"); }
    else if (act === "convrota") { addRota(S.conv.destino, { foco: true }); toast(`${S.conv.destino} em foco — salve em Rotas.`); location.hash = "#rotas"; }
  } catch (err) { toast("Erro: " + err.message, 5000); b.disabled = false; }
});
document.addEventListener("input", e => {
  const el = e.target;
  if (el.dataset.f !== undefined) {
    S.F[el.dataset.f] = el.type === "checkbox" ? el.checked : el.value;
    if (el.type === "search" || el.type === "number") { clearTimeout(el._t); el._t = setTimeout(() => { const pos = el.selectionStart; render(); const n = $(`[data-f="${el.dataset.f}"]`); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { } } }, 250); }
    else render();
  } else if (el.dataset.rota !== undefined) {
    const r = S.rotas[+el.dataset.rota], k = el.dataset.campo;
    r[k] = el.type === "checkbox" ? el.checked : (el.value ? +el.value : null);
    S.rotasSujo = true;
    if (el.type === "checkbox") render(); else { const bar = $(".head .acts"); if (bar && !bar.querySelector('[data-act="salvarrotas"]')) bar.insertAdjacentHTML("afterbegin", `<button class="bt pri" data-act="salvarrotas">💾 Salvar alterações</button>`); }
  } else if (el.dataset.aj !== undefined) {
    const k = el.dataset.aj;
    S.ajustes[k] = el.type === "checkbox" ? el.checked : el.type === "number" ? (el.value === "" ? null : +el.value) : el.value;
    S.ajustesSujo = true;
    const bar = $(".head .acts"); if (bar && !bar.querySelector('[data-act="salvarajustes"]')) bar.insertAdjacentHTML("afterbegin", `<button class="bt pri" data-act="salvarajustes">💾 Salvar ajustes</button>`);
  } else if (el.dataset.conv !== undefined) {
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
  await carregar(); render(); checarRodando();
  setInterval(async () => { if (!S.rotasSujo && !S.ajustesSujo && !document.querySelector("input:focus,textarea:focus")) { await carregar(); if (!/converter|ajustes|rotas/.test(location.hash)) render(); } }, 120000);
})();
