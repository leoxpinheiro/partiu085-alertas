/* Radar Partiu085 — mapa interativo: pra onde a gente pesquisa, o que está cadastrado e onde tem promoção.
   Leaflet (cdnjs) + mapa base CARTO. Usado na aba Milhas (segue o programa escolhido) e em Destinos. */
"use strict";
const COORD = {
  FOR: [-3.78, -38.53], SAO: [-23.55, -46.63], GRU: [-23.43, -46.47], CGH: [-23.63, -46.66], VCP: [-23.01, -47.13], RIO: [-22.91, -43.17], GIG: [-22.81, -43.25], SDU: [-22.91, -43.16],
  BSB: [-15.79, -47.88], BHZ: [-19.92, -43.94], CNF: [-19.62, -43.97], SSA: [-12.97, -38.5], REC: [-8.05, -34.88], NAT: [-5.79, -35.21], JPA: [-7.12, -34.86], MCZ: [-9.67, -35.74],
  AJU: [-10.91, -37.07], SLZ: [-2.53, -44.3], THE: [-5.09, -42.8], BEL: [-1.46, -48.5], MAO: [-3.12, -60.02], POA: [-30.03, -51.23], CWB: [-25.43, -49.27], FLN: [-27.6, -48.55],
  VIX: [-20.32, -40.34], GYN: [-16.69, -49.26], IGU: [-25.55, -54.59], FEN: [-3.85, -32.42], JDO: [-7.21, -39.32], JJD: [-2.79, -40.51], BPS: [-16.45, -39.06], IOS: [-14.79, -39.05],
  CGB: [-15.6, -56.1], CGR: [-20.44, -54.65], PMW: [-10.18, -48.33], MCP: [0.03, -51.07], BVB: [2.82, -60.67], PVH: [-8.76, -63.9], RBR: [-9.97, -67.81], NVT: [-26.88, -48.65], UDI: [-18.92, -48.28],
  LIS: [38.72, -9.14], OPO: [41.15, -8.61], MAD: [40.42, -3.7], BCN: [41.39, 2.17], PAR: [48.86, 2.35], CDG: [49.01, 2.55], ROM: [41.9, 12.5], FCO: [41.8, 12.25], MIL: [45.46, 9.19], MXP: [45.63, 8.72],
  LON: [51.51, -0.13], LHR: [51.47, -0.45], AMS: [52.37, 4.9], FRA: [50.11, 8.68], BRU: [50.85, 4.35], ZRH: [47.38, 8.54], IST: [41.01, 28.98], DXB: [25.2, 55.27],
  MIA: [25.76, -80.19], ORL: [28.54, -81.38], MCO: [28.43, -81.31], NYC: [40.71, -74.01], JFK: [40.64, -73.78], FLL: [26.12, -80.14], BOS: [42.36, -71.06], LAX: [34.05, -118.24], IAD: [38.95, -77.46], ORD: [41.97, -87.9],
  BUE: [-34.6, -58.38], EZE: [-34.82, -58.54], AEP: [-34.56, -58.42], SCL: [-33.45, -70.67], LIM: [-12.05, -77.04], BOG: [4.71, -74.07], CTG: [10.39, -75.48], MDE: [6.24, -75.58],
  ADZ: [12.58, -81.7], PTY: [8.98, -79.52], CUN: [21.16, -86.85], MEX: [19.43, -99.13], MVD: [-34.9, -56.16], PUJ: [18.58, -68.4], SDQ: [18.49, -69.93], HAV: [23.11, -82.37],
  SID: [16.74, -22.95], RAI: [14.93, -23.51], CPT: [-33.92, 18.42], JNB: [-26.2, 28.05], ASU: [-25.26, -57.58], LPB: [-16.49, -68.12], VVI: [-17.78, -63.18], CUZ: [-13.53, -71.97],
  UIO: [-0.18, -78.47], AUA: [12.52, -70.03], CUR: [12.17, -68.98], TYO: [35.68, 139.69], NRT: [35.77, 140.39], BKK: [13.76, 100.5],
};
const MAPA = { periodo: "7", inst: {}, vista: "brasil", aberto: true, geo: null };
try { const v = localStorage.getItem("p085_mapa_aberto"); if (v) MAPA.aberto = v === "1"; MAPA.vista = localStorage.getItem("p085_mapa_vista") || "brasil"; } catch (e) { }
const PERIODOS = [["1", "Hoje"], ["7", "7 dias"], ["30", "30 dias"], ["tudo", "Tudo"]];
const VISTAS = { brasil: [[-34, -74], [6, -32]], mundo: null };

function carregarLeaflet() {
  if (window.L) return Promise.resolve();
  if (MAPA._p) return MAPA._p;
  const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.appendChild(css);
  MAPA._p = new Promise((ok, erro) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; s.onload = ok; s.onerror = erro; document.head.appendChild(s); });
  return MAPA._p;
}
async function carregarGeo() { if (!MAPA.geo) MAPA.geo = await getJSON("mundo.json", null); return MAPA.geo; }
/* Mapa próprio (contorno dos países, sem servidor de mapas pago e sem chave) */
function mapaHTML(id, titulo, cor) {
  return `<details class="card mapa-card" data-mapa="${id}" ${MAPA.aberto ? "open" : ""}>
    <summary><span class="mapa-sum">${ic("globe")}<b>${titulo}</b><span class="sub">pra onde a gente pesquisa e onde tem promoção</span></span><span class="mapa-seta">▾</span></summary>
    <div class="mapa-bar">${pills("mapaper", MAPA.periodo, PERIODOS)}${pills("mapavis", MAPA.vista, [["brasil", "Brasil"], ["mundo", "Mundo"]])}</div>
    <div class="mapa" id="${id}"><div class="vazio">Carregando o mapa…</div></div>
    <div class="mapa-leg"><span><i class="mk promo" style="--c:${cor}"></i>tem alerta no período (o número é a quantidade)</span><span><i class="mk base"></i>pesquisado, tem preço</span><span><i class="mk cad"></i>cadastrado, ainda sem preço</span><span><i class="mk origem"></i>Fortaleza</span></div>
  </details>`;
}
/* pontos: [{k, nome, estado: "promo"|"base"|"cad", n, info, act}] */
async function montarMapa(id, pontos, cor) {
  const el = document.getElementById(id); if (!el || !MAPA.aberto) return;
  MAPA.ult = MAPA.ult || {}; MAPA.ult[id] = [pontos, cor];
  try { await Promise.all([carregarLeaflet(), carregarGeo()]); } catch (e) { el.innerHTML = `<div class="vazio">Não carregou o mapa.</div>`; return; }
  if (!document.getElementById(id)) return;
  if (MAPA.inst[id]) { try { MAPA.inst[id].remove(); } catch (e) { } }
  el.innerHTML = "";
  const escuro = document.documentElement.dataset.theme === "dark";
  el.style.background = escuro ? "#0d1b2a" : "#dbeafe";
  const m = L.map(el, { zoomControl: true, scrollWheelZoom: false, attributionControl: false, zoomSnap: .25, minZoom: 2, maxZoom: 9 });
  MAPA.inst[id] = m;
  const o = COORD.FOR;
  if (MAPA.vista === "brasil") m.fitBounds(VISTAS.brasil, { padding: [10, 10] });
  else { const b = pontos.map(p => COORD[p.k]).filter(Boolean).concat([o]); m.fitBounds(b, { padding: [24, 24] }); }
  if (MAPA.geo) L.geoJSON(MAPA.geo, { interactive: false, style: f => ({ color: escuro ? "#3b5675" : "#ffffff", weight: 1,
    fillColor: f.properties.n === "Brazil" ? (escuro ? "#20456b" : "#bfe3c9") : (escuro ? "#16304d" : "#f1f5f9"), fillOpacity: 1 }) }).addTo(m);
  const ordem = { cad: 0, base: 1, promo: 2 };
  pontos.slice().sort((a, b) => ordem[a.estado] - ordem[b.estado] || (a.n || 0) - (b.n || 0)).forEach(p => {
    const c = COORD[p.k]; if (!c) return;
    if (p.estado !== "cad") L.polyline([o, c], { color: p.estado === "promo" ? cor : escuro ? "#7aa2c8" : "#64748b", weight: p.estado === "promo" ? 2 : 1, opacity: p.estado === "promo" ? .85 : .35, interactive: false }).addTo(m);
    const tam = p.n ? 26 : p.estado === "base" ? 12 : 9;
    L.marker(c, { icon: L.divIcon({ className: "mk-w", html: `<span class="mk ${p.estado}" style="--c:${cor}">${p.n || ""}</span>`, iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2] }), title: p.nome, riseOnHover: true })
      .bindTooltip(`${esc(p.nome)}${p.n ? ` · ${p.n} alerta${p.n > 1 ? "s" : ""}` : ""}`, { direction: "top", offset: [0, -tam / 2] })
      .bindPopup(`<div class="mk-pop"><b>${esc(p.nome)}</b><span class="sub">FOR → ${p.k}</span>${p.info || "<span>ainda sem preço</span>"}<div class="mk-n">${p.n ? `<b>${p.n}</b> alerta${p.n > 1 ? "s" : ""} no período` : "nenhum alerta no período"}</div>${p.act || ""}</div>`)
      .addTo(m);
  });
  L.marker(o, { icon: L.divIcon({ className: "mk-w", html: `<span class="mk origem">FOR</span>`, iconSize: [38, 22], iconAnchor: [19, 11] }), zIndexOffset: 1000 }).bindTooltip("Fortaleza: de onde saem as buscas").addTo(m);
}
function noPeriodo(iso) {
  if (MAPA.periodo === "tudo") return true;
  return iso.slice(0, 10) >= diaMenos(hojeISO(), +MAPA.periodo - 1);
}
document.addEventListener("click", e => { const b = e.target.closest('[data-act="pill"][data-g^="mapa"]'); if (!b) return;
  if (b.dataset.g === "mapaper") MAPA.periodo = b.dataset.v; else { MAPA.vista = b.dataset.v; try { localStorage.setItem("p085_mapa_vista", MAPA.vista); } catch (x) { } } }, true);
document.addEventListener("toggle", e => {
  const d = e.target; if (!d.dataset || !d.dataset.mapa) return;
  MAPA.aberto = d.open; try { localStorage.setItem("p085_mapa_aberto", d.open ? "1" : "0"); } catch (x) { }
  if (d.open && MAPA.ult && MAPA.ult[d.dataset.mapa]) montarMapa(d.dataset.mapa, ...MAPA.ult[d.dataset.mapa]);
  else if (d.open) { if (typeof mapaMilhas === "function" && d.dataset.mapa === "mapa-milhas") mapaMilhas(); if (typeof mapaDestinos === "function" && d.dataset.mapa === "mapa-dest") mapaDestinos(); }
}, true);
