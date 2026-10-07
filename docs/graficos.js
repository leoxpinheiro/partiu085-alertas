/* Radar Partiu085 — gráficos leves em SVG (sem biblioteca). Paleta validada (claro e escuro):
   verde #16A34A · azul #2563EB · âmbar #D97706. Dica ao passar o mouse via data-tip (já existe no painel). */
"use strict";
const GC = { verde: "#16A34A", azul: "#2563EB", ambar: "#D97706", cinza: "#94A3B8" };
const CLASSE_COR = { imperdivel: GC.verde, otima: GC.azul, boa: GC.ambar };
const CLASSE_NOME = { imperdivel: "Imperdível", otima: "Ótima", boa: "Boa" };

/* rosca: segs = [{n, v, cor}] */
function gDonut(segs, centro, sub) {
  const tot = segs.reduce((s, x) => s + x.v, 0);
  const R = 52, C = 2 * Math.PI * R;
  let acc = 0;
  const arcos = tot ? segs.filter(x => x.v).map(x => {
    const frac = x.v / tot, gap = segs.filter(y => y.v).length > 1 ? 2 : 0;
    const len = Math.max(0, frac * C - gap), off = -acc * C; acc += frac;
    return `<circle r="${R}" cx="70" cy="70" fill="none" stroke="${x.cor}" stroke-width="16" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${off}" transform="rotate(-90 70 70)" data-tip="${esc(x.n)}: ${x.v} (${Math.round(frac * 100)}%)"/>`;
  }).join("") : `<circle r="${R}" cx="70" cy="70" fill="none" stroke="var(--tile)" stroke-width="16"/>`;
  return `<div class="g-donut"><svg viewBox="0 0 140 140" role="img" aria-label="${esc(sub)}">${arcos}
      <text x="70" y="68" text-anchor="middle" class="g-big">${centro}</text><text x="70" y="88" text-anchor="middle" class="g-sm">${esc(sub)}</text></svg>
    <ul class="g-leg">${segs.map(x => `<li><i style="background:${x.cor}"></i>${esc(x.n)}<b>${x.v}</b></li>`).join("")}</ul></div>`;
}
/* barras horizontais: rows = [{n, v, rot, cor, tip, href}] (v entre 0 e max) */
function gHBars(rows, max) {
  max = max || Math.max(...rows.map(r => r.v), 1);
  return `<div class="g-hb">${rows.map(r => `<${r.href ? `a href="${r.href}"` : "div"} class="g-hb-r" data-tip="${esc(r.tip || r.n)}">
    <span class="g-hb-n">${esc(r.n)}</span><span class="g-hb-t"><i style="width:${Math.max(2, (r.v / max) * 100)}%;background:${r.cor || GC.verde}"></i></span><span class="g-hb-v">${r.rot}</span></${r.href ? "a" : "div"}>`).join("")}</div>`;
}
/* colunas pequenas: vals = [{d, v}] */
function gCols(vals, cor = GC.verde) {
  const max = Math.max(...vals.map(x => x.v), 1), W = 100 / vals.length;
  return `<svg class="g-cols" viewBox="0 0 100 40" preserveAspectRatio="none">${vals.map((x, i) => {
    const h = Math.max(x.v ? 3 : 1, (x.v / max) * 36);
    return `<rect x="${i * W + W * .15}" y="${40 - h}" width="${W * .7}" height="${h}" rx="1" fill="${x.v ? cor : "var(--tile)"}" data-tip="${dm(x.d)}: ${x.v} alerta${x.v === 1 ? "" : "s"}"/>`;
  }).join("")}</svg><div class="g-cols-x"><span>${dm(vals[0].d)}</span><span>hoje</span></div>`;
}
/* barra 100% empilhada: segs = [{n, v, cor}] */
function gStack(segs) {
  const tot = segs.reduce((s, x) => s + x.v, 0) || 1;
  return `<div class="g-st">${segs.filter(x => x.v).map(x => `<i style="flex:${x.v};background:${x.cor}" data-tip="${esc(x.n)}: ${x.v} (${Math.round(x.v / tot * 100)}%)"></i>`).join("") || `<i style="flex:1;background:var(--tile)"></i>`}</div>
    <ul class="g-leg in">${segs.map(x => `<li><i style="background:${x.cor}"></i>${esc(x.n)} <b>${Math.round(x.v / tot * 100)}%</b></li>`).join("")}</ul>`;
}
/* menor preço vs média: trilho = média, preenchido = menor */
function gBullet(menor, media, cor = GC.verde) {
  if (!menor || !media) return "";
  const p = Math.min(100, (menor / media) * 100);
  return `<span class="g-bul" data-tip="Menor ${brl(menor)} · média ${brl(media)}"><i style="width:${p}%;background:${cor}"></i><b style="left:100%"></b></span>`;
}
/* linha de preço por dia: series = [{n, cor, pts:[{dia, preco, tip}], tracejada}], ref = média */
function gLinha(series, ref, fmt = brl) {
  const pts = series.flatMap(s => s.pts);
  if (pts.length < 2) return "";
  const dias = [...new Set(pts.map(p => p.dia))].sort(), t0 = new Date(dias[0]).getTime(), t1 = new Date(dias[dias.length - 1]).getTime() || t0 + 1;
  const vs = pts.map(p => p.preco).concat(ref ? [ref] : []), lo = Math.min(...vs) * .92, hi = Math.max(...vs) * 1.04;
  const W = 1000, H = 220, L = 74, B = 24, T = 14;
  const x = d => L + ((new Date(d).getTime() - t0) / (t1 - t0 || 1)) * (W - L - 8);
  const y = v => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B);
  const ticks = [lo + (hi - lo) * .1, (lo + hi) / 2, hi - (hi - lo) * .1];
  const meses = [...new Set(dias.map(d => d.slice(0, 7)))];
  return `<div class="g-lin"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Preço por dia">
    ${ticks.map(v => `<line x1="${L}" x2="${W - 8}" y1="${y(v)}" y2="${y(v)}" class="g-grid"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" class="g-ax">${fmt(v)}</text>`).join("")}
    ${meses.map(m => { const d = dias.find(x => x.startsWith(m)); return `<text x="${x(d)}" y="${H - 4}" class="g-ax">${MESES[+m.slice(5, 7) - 1]}</text>`; }).join("")}
    ${ref ? `<line x1="${L}" x2="${W - 8}" y1="${y(ref)}" y2="${y(ref)}" class="g-ref"/><text x="${W - 10}" y="${y(ref) - 5}" text-anchor="end" class="g-ax">média ${fmt(ref)}</text>` : ""}
    ${series.map(s => { const P = s.pts.slice().sort((a, b) => a.dia.localeCompare(b.dia));
      return `<polyline fill="none" stroke="${s.cor}" stroke-width="2" stroke-linejoin="round" ${s.tracejada ? 'stroke-dasharray="5 4"' : ""} points="${P.map(p => `${x(p.dia).toFixed(1)},${y(p.preco).toFixed(1)}`).join(" ")}"/>` +
        P.map(p => `<circle cx="${x(p.dia).toFixed(1)}" cy="${y(p.preco).toFixed(1)}" r="7" class="g-hit" data-tip="${esc(s.n)} ${dmy(p.dia)}: ${fmt(p.preco)}${p.tip ? " · " + esc(p.tip) : ""}"/><circle cx="${x(p.dia).toFixed(1)}" cy="${y(p.preco).toFixed(1)}" r="3" fill="${s.cor}" class="g-dot"/>`).join(""); }).join("")}
  </svg>${series.length > 1 ? `<ul class="g-leg in">${series.map(s => `<li><i style="background:${s.cor}"></i>${esc(s.n)}</li>`).join("")}${ref ? `<li><i class="ref"></i>média da rota</li>` : ""}</ul>` : ""}</div>`;
}
