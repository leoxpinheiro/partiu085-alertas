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
const MAPA = { periodo: "7", inst: {} };
const PERIODOS = [["1", "Hoje"], ["7", "7 dias"], ["30", "30 dias"], ["tudo", "Tudo"]];

function carregarLeaflet() {
  if (window.L) return Promise.resolve();
  if (MAPA._p) return MAPA._p;
  const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.appendChild(css);
  MAPA._p = new Promise((ok, erro) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; s.onload = ok; s.onerror = erro; document.head.appendChild(s); });
  return MAPA._p;
}
/* pontos: [{k, nome, estado: "promo"|"base"|"cad", n, info, act}] */
function mapaHTML(id, titulo, legendaCor) {
  return `<div class="card mapa-card"><div class="card-h"><div><h3>${titulo}</h3><div class="desc">Número em cima = alertas no período. Toque num destino para ver os detalhes.</div></div>
      <div class="acts">${pills("mapaper", MAPA.periodo, PERIODOS)}</div></div>
    <div class="mapa" id="${id}"><div class="vazio">Carregando o mapa…</div></div>
    <div class="mapa-leg"><span><i class="mk promo" style="--c:${legendaCor}"></i>com promoção no período</span><span><i class="mk base"></i>pesquisado (tem preço)</span><span><i class="mk cad"></i>cadastrado, ainda sem preço</span><span><i class="mk origem"></i>Fortaleza</span></div></div>`;
}
async function montarMapa(id, pontos, cor) {
  const el = document.getElementById(id); if (!el) return;
  try { await carregarLeaflet(); } catch (e) { el.innerHTML = `<div class="vazio">Não carregou o mapa (sem internet?).</div>`; return; }
  if (!document.getElementById(id)) return;
  if (MAPA.inst[id]) { try { MAPA.inst[id].remove(); } catch (e) { } }
  el.innerHTML = "";
  const escuro = document.documentElement.dataset.theme === "dark";
  const m = L.map(el, { zoomControl: true, scrollWheelZoom: false, worldCopyJump: true, attributionControl: true });
  MAPA.inst[id] = m;
  L.tileLayer(`https://{s}.basemaps.cartocdn.com/${escuro ? "dark_all" : "light_all"}/{z}/{x}/{y}{r}.png`, { attribution: "© OpenStreetMap · © CARTO", subdomains: "abcd", maxZoom: 10 }).addTo(m);
  const o = COORD.FOR, bounds = [o];
  pontos.forEach(p => {
    const c = COORD[p.k]; if (!c) return; bounds.push(c);
    L.polyline([o, c], { color: p.estado === "promo" ? cor : escuro ? "#8aa" : "#7b8794", weight: p.estado === "promo" ? 2 : 1, opacity: p.estado === "promo" ? .8 : .35, dashArray: p.estado === "cad" ? "3 5" : null }).addTo(m);
    const html = `<span class="mk ${p.estado}" style="--c:${cor}">${p.n ? p.n : ""}</span>`;
    const tam = p.n ? 28 : 12;
    L.marker(c, { icon: L.divIcon({ className: "mk-w", html, iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2] }), title: p.nome })
      .bindPopup(`<div class="mk-pop"><b>${esc(p.nome)}</b><span class="sub">FOR → ${p.k}</span>${p.info || ""}<div class="mk-n">${p.n ? `<b>${p.n}</b> alerta${p.n > 1 ? "s" : ""} no período` : "nenhum alerta no período"}</div>${p.act || ""}</div>`)
      .addTo(m);
  });
  L.marker(o, { icon: L.divIcon({ className: "mk-w", html: `<span class="mk origem">FOR</span>`, iconSize: [36, 22], iconAnchor: [18, 11] }) }).bindPopup("<b>Fortaleza</b><br>de onde saem todas as buscas").addTo(m);
  if (bounds.length > 1) m.fitBounds(bounds, { padding: [24, 24], maxZoom: 5 }); else m.setView(o, 4);
}
function noPeriodo(iso) {
  if (MAPA.periodo === "tudo") return true;
  return iso.slice(0, 10) >= diaMenos(hojeISO(), +MAPA.periodo - 1);
}
document.addEventListener("click", e => { const b = e.target.closest('[data-act="pill"][data-g="mapaper"]'); if (b) MAPA.periodo = b.dataset.v; }, true);
