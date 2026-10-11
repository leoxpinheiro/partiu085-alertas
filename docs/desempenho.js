/* Partiu 085 — 📊 Desempenho do Instagram: seguidores (entrou/saiu), alcance, melhores posts, formato, melhor horário, cidades e o que fazer. */
"use strict";
const DS = { per: 14, ord: "alcance", conta: null };
try { DS.per = +(localStorage.getItem("p085_ds_per") || 14); DS.ord = localStorage.getItem("p085_ds_ord") || "alcance"; } catch (e) { }
const DS_COR = { entrou: "#22A06B", saiu: "#E5484D", barra: "#3E86E8", destaque: "#F5C531" };
const fmtN = n => (n == null ? "—" : Math.round(n).toLocaleString("pt-BR"));
const dsLocal = iso => new Date(new Date(iso.replace("+0000", "Z")).getTime() - 3 * 36e5); // horário de Fortaleza
const DSEM_L = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function dsBarras(dados, { alt = 180, series, fmtV = fmtN, rot = d => d.rot }) { // barras agrupadas em SVG, com dica ao passar o mouse
  const W = 680, H = alt, pl = 8, pb = 26, n = dados.length || 1, g = (W - pl * 2) / n, nb = series.length, bw = Math.max(3, Math.min(22, (g - 6) / nb - 2));
  const mx = Math.max(1, ...dados.flatMap(d => series.map(s => d[s.k] || 0)));
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="ds-svg" role="img"><line x1="${pl}" y1="${H - pb}" x2="${W - pl}" y2="${H - pb}" stroke="currentColor" stroke-opacity=".15"/>`;
  dados.forEach((d, i) => { const cx = pl + g * i + g / 2;
    series.forEach((s, j) => { const v = d[s.k] || 0, h = Math.max(v ? 3 : 0, (v / mx) * (H - pb - 18)), x = cx - (nb * (bw + 2)) / 2 + j * (bw + 2), y = H - pb - h;
      svg += `<g><title>${esc(rot(d))} · ${s.nome}: ${fmtV(v)}</title><rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="3" fill="${d.cor && j === 0 ? d.cor : s.cor}"/><rect x="${x - 2}" y="0" width="${bw + 4}" height="${H - pb}" fill="transparent"/></g>`; });
    if (n <= 16 || i % Math.ceil(n / 12) === 0) svg += `<text x="${cx}" y="${H - 8}" text-anchor="middle" font-size="11" fill="currentColor" fill-opacity=".6">${esc(rot(d))}</text>`; });
  return svg + `</svg>${series.length > 1 ? `<div class="ds-leg">${series.map(s => `<span><i style="background:${s.cor}"></i>${s.nome}</span>`).join("")}</div>` : ""}`;
}
function dsLinhas(L, k) { const mx = Math.max(1, ...L.map(x => x.v)); return `<div class="ds-hb">${L.map(x => `<div class="ds-hbr"><span>${esc(x.k)}</span><div><i style="width:${(x.v / mx) * 100}%;background:${x.cor || DS_COR.barra}"></i></div><b>${k ? k(x) : fmtN(x.v)}</b></div>`).join("")}</div>`; }

function pDesempenho() {
  if (!DS.conta) { getJSON("ig_conta.json?t=" + Date.now(), null).then(c => { DS.conta = c || { erro: "sem dados" }; if (/#desempenho/.test(location.hash)) render(); });
    return head("📊 Desempenho", "Carregando os números do Instagram…") + `<div class="card vazio">Carregando…</div>`; }
  const c = DS.conta; if (!c || !c.ok) return head("📊 Desempenho", "") + `<div class="card vazio">Ainda sem dados do Instagram. ${esc((c && c.erro) || "")}</div>`;
  const hoje = hojeISO(), ini = diaMenos(hoje, DS.per - 1), dias = Object.entries(c.dias || {}).filter(([d]) => d >= ini).sort();
  const soma = k => dias.reduce((a, [, v]) => a + (v[k] || 0), 0), entrou = soma("seguiram"), saiu = soma("deixaram");
  const posts = (c.midias || []).map(m => ({ ...m, dt: dsLocal(m.quando) })), noPer = posts.filter(m => m.quando.slice(0, 10) >= ini);
  const hist = (c.historico || []).filter(h => h.dia >= ini), saldoHist = hist.length > 1 ? hist[hist.length - 1].seguidores - hist[0].seguidores : entrou - saiu;
  const kpi = (r, v, sub, cls) => `<div class="ds-kpi ${cls || ""}"><small>${r}</small><b>${v}</b>${sub ? `<span>${sub}</span>` : ""}</div>`;
  const tipos = ["reels", "carrossel", "foto", "video"].map(t => { const L = posts.filter(m => m.tipo === t && m.alcance != null); return { t, n: L.length, alc: L.length ? L.reduce((a, m) => a + (m.alcance || 0), 0) / L.length : 0, comp: L.length ? L.reduce((a, m) => a + (m.compartilhamentos || 0), 0) / L.length : 0 }; }).filter(x => x.n);
  // melhor horário: pelos seguidores online (Instagram) e pelo alcance dos nossos posts
  const aud = c.audiencia || {}, onl = aud.online_utc ? Array.from({ length: 24 }, (_, h) => ({ h, v: aud.online_utc[String((h + 3) % 24)] || 0 })) : null;
  const porHora = {}; posts.filter(m => m.alcance != null).forEach(m => { const h = m.dt.getUTCHours(), b = (porHora[h] = porHora[h] || { s: 0, n: 0 }); b.s += m.alcance; b.n++; });
  const porDia = {}; posts.filter(m => m.alcance != null).forEach(m => { const d = m.dt.getUTCDay(), b = (porDia[d] = porDia[d] || { s: 0, n: 0 }); b.s += m.alcance; b.n++; });
  const topOnl = onl ? onl.slice().sort((a, b) => b.v - a.v).slice(0, 3).map(x => x.h) : [];
  const topHora = Object.entries(porHora).map(([h, b]) => ({ h: +h, v: b.s / b.n, n: b.n })).sort((a, b) => b.v - a.v);
  const ordens = [["alcance", "Alcance"], ["compartilhamentos", "Compartilhamentos"], ["salvos", "Salvos"], ["comentarios", "Comentários"], ["curtidas", "Curtidas"], ["seguiram", "Seguidores ganhos"]];
  const rank = posts.filter(m => m[DS.ord] != null).sort((a, b) => (b[DS.ord] || 0) - (a[DS.ord] || 0)).slice(0, 10);
  // o que fazer: frases calculadas dos dados
  const dicas = [];
  if (tipos.length > 1) { const tt = tipos.slice().sort((a, b) => b.alc - a.alc); if (tt[0].alc > tt[tt.length - 1].alc * 1.5) dicas.push(`<b>${MAIUSC1(tt[0].t)}</b> alcança em média ${fmtN(tt[0].alc)} pessoas, ${(tt[0].alc / Math.max(1, tt[tt.length - 1].alc)).toFixed(1).replace(".", ",")}x mais que ${tt[tt.length - 1].t}. Faça mais ${tt[0].t}.`); }
  const share = tipos.slice().sort((a, b) => b.comp - a.comp)[0]; if (share && share.comp >= 1) dicas.push(`Quem mais é <b>compartilhado</b> é ${share.t} (${share.comp.toFixed(1).replace(".", ",")} por post). Compartilhamento é o que mais leva o perfil pra gente nova.`);
  if (topOnl.length) dicas.push(`Seus seguidores ficam mais online às <b>${topOnl.map(h => h + "h").join(", ")}</b>. Poste uns 30 min antes.`);
  else if (topHora.length >= 2) dicas.push(`Pelos seus posts, o melhor horário até agora é <b>${topHora[0].h}h</b> (média de ${fmtN(topHora[0].v)} de alcance).`);
  if (entrou < saiu) dicas.push(`No período o perfil perdeu mais do que ganhou (${fmtN(entrou)} entraram, ${fmtN(saiu)} saíram). Reels de humor e o "Comenta EU QUERO" ajudam a virar esse jogo.`);
  if (rank[0]) dicas.push(`Post campeão em ${ordens.find(o => o[0] === DS.ord)[1].toLowerCase()}: "${esc(curto(rank[0].legenda, 60))}". Vale fazer outro no mesmo estilo.`);
  const cidades = (aud.city || []).slice(0, 8);
  return head("📊 Desempenho", "Como o perfil está indo e o que dá mais certo. Atualiza sozinho a cada hora.") + `
  <div class="pa-bar">${pills("dsper", String(DS.per), [["7", "7 dias"], ["14", "14 dias"], ["30", "30 dias"]])}<small class="sub">dados de ${dataHora(isoLocal(new Date(c.quando)))}</small></div>
  <div class="ds-kpis">${kpi("Seguidores", fmtN(c.seguidores), `${saldoHist >= 0 ? "+" : ""}${fmtN(saldoHist)} no período`, saldoHist >= 0 ? "pos" : "neg")}${kpi("Entraram", fmtN(entrou), "novos seguidores", "pos")}${kpi("Saíram", fmtN(saiu), "deixaram de seguir", "neg")}
    ${kpi("Alcance", fmtN(soma("alcance")), "contas que viram")}${kpi("Visualizações", fmtN(soma("visualizacoes")))}${kpi("Interações", fmtN(soma("interacoes")), `${fmtN(soma("compartilhamentos"))} compartilhamentos`)}${kpi("Posts", fmtN(noPer.length), "no período")}</div>
  ${dicas.length ? `<div class="card ds-dicas"><h3>💡 O que fazer agora</h3><ul>${dicas.map(d => `<li>${d}</li>`).join("")}</ul></div>` : ""}
  <div class="ds-grid">
    <div class="card"><h3>Seguidores: entrou × saiu por dia</h3>${dsBarras(dias.map(([d, v]) => ({ rot: d.slice(8, 10) + "/" + d.slice(5, 7), entrou: v.seguiram || 0, saiu: v.deixaram || 0 })), { series: [{ k: "entrou", nome: "Entraram", cor: DS_COR.entrou }, { k: "saiu", nome: "Saíram", cor: DS_COR.saiu }] })}</div>
    <div class="card"><h3>Alcance por dia</h3>${dsBarras(dias.map(([d, v]) => ({ rot: d.slice(8, 10) + "/" + d.slice(5, 7), alc: v.alcance || 0 })), { series: [{ k: "alc", nome: "Alcance", cor: DS_COR.barra }] })}</div>
  </div>
  <div class="card"><div class="ds-th"><h3>🏆 Posts que mais deram certo</h3><select id="ds-ord">${ordens.map(([k, n]) => `<option value="${k}" ${k === DS.ord ? "selected" : ""}>${n}</option>`).join("")}</select></div>
    <div class="ds-rank">${rank.map((m, i) => `<a class="ds-post" href="${esc(m.link)}" target="_blank" rel="noopener"><span class="ds-pos">${i + 1}</span><img src="${esc(m.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer"><div><b>${esc(curto(m.legenda.split("\n")[0], 70))}</b>
      <small>${m.tipo} · ${DSEM_L[m.dt.getUTCDay()].slice(0, 3)} ${String(m.dt.getUTCDate()).padStart(2, "0")}/${String(m.dt.getUTCMonth() + 1).padStart(2, "0")} às ${String(m.dt.getUTCHours()).padStart(2, "0")}h</small>
      <span class="ds-chips">${[["👁", m.alcance], ["❤️", m.curtidas], ["💬", m.comentarios], ["🔁", m.compartilhamentos], ["🔖", m.salvos], ["➕", m.seguiram]].filter(x => x[1] != null).map(([e, v]) => `<i>${e} ${fmtN(v)}</i>`).join("")}</span></div></a>`).join("") || `<div class="vazio">Ainda sem números dos posts.</div>`}</div></div>
  <div class="ds-grid">
    <div class="card"><h3>Formato que mais alcança</h3><small class="sub">média de alcance por post</small>${dsLinhas(tipos.map(t => ({ k: `${MAIUSC1(t.t)} (${t.n})`, v: t.alc })))}</div>
    <div class="card"><h3>Melhor dia da semana</h3><small class="sub">média de alcance dos seus posts</small>${dsLinhas(Object.entries(porDia).map(([d, b]) => ({ k: MAIUSC1(DSEM_L[d]), v: b.s / b.n })).sort((a, b) => b.v - a.v))}</div>
  </div>
  <div class="ds-grid">
    <div class="card"><h3>⏰ Melhor horário pra postar</h3>${onl ? `<small class="sub">quantos seguidores ficam online em cada hora (horário de Fortaleza). Em amarelo, os 3 melhores.</small>${dsBarras(onl.map(x => ({ rot: x.h + "h", v: x.v, cor: topOnl.includes(x.h) ? DS_COR.destaque : null })), { series: [{ k: "v", nome: "Seguidores online", cor: DS_COR.barra }], alt: 170 })}`
      : `<small class="sub">alcance médio dos seus posts por horário (o Instagram ainda vai liberar o horário dos seguidores online)</small>${dsLinhas(topHora.slice().sort((a, b) => a.h - b.h).map(x => ({ k: x.h + "h", v: x.v, cor: x === topHora[0] ? DS_COR.destaque : null })), x => `${fmtN(x.v)}`)}`}</div>
    <div class="card"><h3>📍 De onde são seus seguidores</h3>${cidades.length ? dsLinhas(cidades.map(x => ({ k: x.k.split(",")[0], v: x.n }))) : `<div class="vazio">O Instagram libera esse dado pro robô 1x por dia. Aparece aqui em breve.</div>`}</div>
  </div>`;
}
document.addEventListener("click", e => { const b = e.target.closest('[data-act="pill"][data-g="dsper"]'); if (!b) return; DS.per = +b.dataset.v; try { localStorage.setItem("p085_ds_per", DS.per); } catch (x) { } render(); }, true);
document.addEventListener("change", e => { if (e.target.id !== "ds-ord") return; DS.ord = e.target.value; try { localStorage.setItem("p085_ds_ord", DS.ord); } catch (x) { } render(); });
