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
    IGF.dm = await getJSON("ig_dm.json", { itens: [] }); IGF.dmcfg = { ...DM_PADRAO, ...(await getJSON("ig_dm_cfg.json", {})) };
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


/* ---------- direct automático */
const DM_PADRAO = { ativo: true, palavras: ["QUERO", "EU QUERO", "LINK"],
  mensagem: "Oi! Aqui é o Partiu 085 ✈️\n\nVocê pediu, então você entra antes de todo mundo: esse é o grupo GRÁTIS com as passagens baratas saindo de Fortaleza 👇\n{link}\n\nTodos os nossos links: {bio}",
  resposta: "Te mandei no direct 📩 Se não aparecer, olha em Solicitações de mensagem!" };
const BIO = () => `https://${REPO.split("/")[0]}.github.io/${REPO.split("/")[1]}/links.html`;
function dmTexto(cfg) { return (cfg.mensagem || "").replace("{link}", linkGrupo()).replace("{bio}", BIO()); }
function dmHTML() {
  const cfg = IGF.dmcfg || DM_PADRAO, L = (IGF.dm && IGF.dm.itens) || [];
  const ok = L.filter(x => x.dm === "ok").length, err = L.filter(x => x.dm === "erro");
  const chip = x => x.dm === "ok" ? `<span class="st verde">✓ direct enviado</span>` : x.dm === "expirado" ? `<span class="st">mais de 7 dias</span>` : `<span class="st vermelho" title="${esc(x.erro || "")}">não enviou</span>`;
  return `<details class="card ig-dm" ${L.length ? "" : "open"}><summary><b>📩 Direct automático</b> <small>${cfg.ativo ? `ligado · palavras: ${esc(cfg.palavras.join(", "))}` : "desligado"} · ${ok} enviado${ok === 1 ? "" : "s"}</small></summary>
    <p class="sub">Quem comentar uma das palavras em qualquer post dos últimos 30 dias recebe a mensagem no direct (o robô confere a cada 15 min) e ganha uma resposta no comentário. <code>{link}</code> = link do grupo grátis · <code>{bio}</code> = sua página de links.</p>
    <div class="form ig-dmf"><label class="chk"><input type="checkbox" id="dm-ativo" ${cfg.ativo ? "checked" : ""}> Ligado</label>
      <div class="field"><label>Palavras (separe por vírgula)</label><input id="dm-pal" value="${esc(cfg.palavras.join(", "))}"></div>
      <div class="field" style="grid-column:1/-1"><label>Mensagem do direct</label><textarea id="dm-msg" rows="6">${esc(cfg.mensagem)}</textarea></div>
      <div class="field" style="grid-column:1/-1"><label>Resposta no comentário (deixe vazio pra não responder)</label><input id="dm-resp" value="${esc(cfg.resposta)}"></div>
      <div class="al-acts"><button class="bt pri" data-act="igdmsalvar">${ic("save")}Salvar</button><button class="bt" data-act="igdmcopiar">${ic("copy")}Copiar mensagem</button><a class="bt ghost" href="links.html" target="_blank" rel="noopener">${ic("ext")}Ver página da bio</a></div></div>
    ${err.length ? `<div class="aviso warn"><span>${err.length} direct${err.length > 1 ? "s" : ""} não ${err.length > 1 ? "saíram" : "saiu"} pelo robô (o Instagram ainda pode estar bloqueando). Responda à mão: toque em <b>Abrir direct</b> e cole a mensagem.</span></div>` : ""}
    ${L.length ? `<div class="ig-lista">${L.slice(0, 40).map(x => `<div class="ig-row dm"><div class="ig-i"><b>@${esc(x.usuario || "?")}</b><small>“${esc(x.texto)}” · ${dataHora(x.quando)} ${chip(x)}</small></div>
      <div class="ig-a">${x.dm !== "ok" && x.usuario ? `<button class="bt sm" data-act="igdmcopiar">${ic("copy")}Copiar</button><a class="bt sm pri" href="https://ig.me/m/${encodeURIComponent(x.usuario)}" target="_blank" rel="noopener">${ic("send")}Abrir direct</a>` : ""}${x.post ? `<a class="bt sm ghost" href="${esc(x.post)}" target="_blank" rel="noopener">post</a>` : ""}</div></div>`).join("")}</div>`
      : `<div class="vazio">Ninguém comentou as palavras ainda. Quando comentarem, aparece aqui.</div>`}
  </details>`;
}
document.addEventListener("click", async e => { const b = e.target.closest('[data-act^="igdm"]'); if (!b) return;
  if (b.dataset.act === "igdmcopiar") { await copiar(dmTexto({ mensagem: ($("#dm-msg") || {}).value || (IGF.dmcfg || DM_PADRAO).mensagem })); toast("Mensagem copiada (já com o link)."); return; }
  if (!token()) { toast("Conecte o token do GitHub em Ajustes."); return; }
  const cfg = { ativo: $("#dm-ativo").checked, palavras: $("#dm-pal").value.split(",").map(x => x.trim()).filter(Boolean), mensagem: $("#dm-msg").value, resposta: $("#dm-resp").value.trim() };
  if (!cfg.palavras.length) { toast("Coloque pelo menos uma palavra."); return; }
  b.disabled = true; try { await salvarArquivo("docs/ig_dm_cfg.json", cfg, "Instagram: direct automático"); IGF.dmcfg = cfg; toast("Salvo. Vale a partir da próxima checagem (até 15 min)."); } catch (err) { toast("Erro: " + err.message, 6000); } b.disabled = false; });

/* ---------- página: números do perfil + agenda */
IGF.per = 7; IGF.ord = "recentes";
const igN = v => v == null ? "–" : milN(v);
const igSoma = (L, k) => L.reduce((a, d) => a + (+d[k] || 0), 0);
function igDias(c) {
  const D = c.dias || {}, hoje = hojeISO(), out = [];
  for (let k = 89; k >= 0; k--) { const d = diaMenos(hoje, k); out.push({ dia: d, ...(D[d] || {}), tem: !!D[d] }); }
  // seguidores por dia: parte do número de hoje e volta descontando quem entrou e saiu
  let seg = c.seguidores || 0;
  for (let i = out.length - 1; i >= 0; i--) { out[i].seg = seg; if (out[i].tem) seg -= (out[i].seguiram || 0) - (out[i].deixaram || 0); }
  const h = Object.fromEntries((c.historico || []).map(x => [x.dia, x.seguidores])); out.forEach(d => { if (h[d.dia] != null) d.seg = h[d.dia]; });
  return out;
}
function igSvgLinha(pts, cor = "#7C5CE0") {
  if (pts.length < 2) return `<div class="sub">O gráfico aparece com 2 dias de dados.</div>`;
  const W = 640, H = 170, P = 8, vs = pts.map(p => p.v), mn = Math.min(...vs), mx = Math.max(...vs), r = mx - mn || 1;
  const x = i => P + i * (W - 2 * P) / (pts.length - 1), y = v => H - 22 - (v - mn) / r * (H - 44);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" class="ig-svg"><path d="${d} L${x(pts.length - 1)},${H - 22} L${x(0)},${H - 22}Z" fill="${cor}" opacity=".10"/><path d="${d}" fill="none" stroke="${cor}" stroke-width="3" stroke-linejoin="round"/>
    <text x="${P}" y="14" class="ig-ax">${milN(mx)}</text><text x="${P}" y="${H - 26}" class="ig-ax">${milN(mn)}</text>
    <text x="${P}" y="${H - 4}" class="ig-ax">${pts[0].l}</text><text x="${W - P}" y="${H - 4}" class="ig-ax" text-anchor="end">${pts[pts.length - 1].l}</text></svg>`;
}
function igSvgBarras(L, posts) {
  const W = 640, H = 190, mid = 95, n = L.length, bw = (W - 16) / n;
  const mx = Math.max(1, ...L.map(d => Math.max(d.seguiram || 0, d.deixaram || 0)));
  const s = v => (v || 0) / mx * (mid - 22);
  return `<svg viewBox="0 0 ${W} ${H}" class="ig-svg"><line x1="8" x2="${W - 8}" y1="${mid}" y2="${mid}" stroke="currentColor" opacity=".2"/>
    ${L.map((d, i) => { const x = 8 + i * bw + bw * .15, w = bw * .7, p = posts[d.dia];
      return `<g><title>${dataCurta(d.dia).toLowerCase()}: +${d.seguiram || 0} entraram, −${d.deixaram || 0} saíram${p ? ` · ${p} post${p > 1 ? "s" : ""}` : ""}</title>
      <rect x="${x}" y="${mid - s(d.seguiram)}" width="${w}" height="${s(d.seguiram)}" rx="2" fill="#22A06B"/><rect x="${x}" y="${mid}" width="${w}" height="${s(d.deixaram)}" rx="2" fill="#E5484D"/>
      ${p ? `<circle cx="${x + w / 2}" cy="12" r="5" fill="#7C5CE0"/>` : ""}</g>`; }).join("")}
    <text x="8" y="${H - 4}" class="ig-ax">${dataCurta(L[0].dia).toLowerCase()}</text><text x="${W - 8}" y="${H - 4}" class="ig-ax" text-anchor="end">hoje</text></svg>`;
}
function igDiagnostico(c, L, ant, M) {
  const out = [], n = L.length, ent = igSoma(L, "seguiram"), sai = igSoma(L, "deixaram"), liq = ent - sai;
  if (L.some(d => d.tem)) out.push(liq < 0 ? ["neg", `Nos últimos ${n} dias o perfil <b>perdeu ${milN(-liq)} seguidores</b>: entraram ${milN(ent)} e saíram ${milN(sai)} (média de ${(sai / n).toFixed(0)} saindo por dia).`]
    : ["pos", `Nos últimos ${n} dias o perfil <b>ganhou ${milN(liq)} seguidores</b>: entraram ${milN(ent)} e saíram ${milN(sai)}.`]);
  const ult = M[0]; const dias = ult ? Math.floor((Date.now() - new Date(ult.quando.replace("+0000", "Z")).getTime()) / 864e5) : null;
  if (dias == null) out.push(["neg", "Ainda não tem nenhum post no perfil."]);
  else if (dias >= 3) out.push(["neg", `O último post foi há <b>${dias} dias</b>. Perfil parado faz o seguidor esquecer e deixar de seguir. Meta: <b>1 post por dia</b> no feed + stories todo dia.`]);
  else out.push(["pos", `Último post há ${dias === 0 ? "menos de 1 dia" : dias + " dia" + (dias > 1 ? "s" : "")}. Mantém o ritmo.`]);
  const per = M.filter(m => m.quando.slice(0, 10) >= L[0].dia);
  if (per.length) out.push(["", `${per.length} post${per.length > 1 ? "s" : ""} no período.`]);
  const a = igSoma(L, "alcance"), aa = igSoma(ant, "alcance");
  if (a || aa) out.push([a >= aa ? "pos" : "neg", `Alcance da conta: <b>${milN(a)}</b> contas no período${aa ? ` (${a >= aa ? "+" : ""}${Math.round((a / aa - 1) * 100)}% vs período anterior)` : ""}.`]);
  const best = M.slice().sort((x, y) => (y.seguiram || 0) - (x.seguiram || 0))[0];
  if (best && best.seguiram) out.push(["pos", `O post que mais trouxe seguidor até agora (${best.seguiram}) foi de ${dataCurta(best.quando.slice(0, 10)).toLowerCase()} de ${best.quando.slice(0, 4)}: <a href="${esc(best.link)}" target="_blank" rel="noopener">${esc(curto(best.legenda || "ver post", 60))}</a>. Vale repetir o formato.`]);
  const tipos = {}; M.forEach(m => { if (m.alcance != null) (tipos[m.tipo] = tipos[m.tipo] || []).push(m.alcance); });
  const med = Object.entries(tipos).filter(([, v]) => v.length >= 2).map(([t, v]) => [t, v.reduce((p, q) => p + q, 0) / v.length]).sort((p, q) => q[1] - p[1]);
  if (med.length >= 2) out.push(["", `Formato que mais alcança: <b>${med[0][0]}</b> (média ${milN(Math.round(med[0][1]))}) contra ${med[1][0]} (${milN(Math.round(med[1][1]))}).`]);
  return out;
}
function igPostCard(m) {
  const t = { carrossel: "Carrossel", reels: "Reels", video: "Vídeo", foto: "Foto" }[m.tipo] || m.tipo;
  const met = [["alcance", "👀", "alcance"], ["curtidas", "❤️", "curtidas"], ["comentarios", "💬", "comentários"], ["salvos", "🔖", "salvos"], ["compartilhamentos", "↗️", "compartilhamentos"], ["seguiram", "➕", "seguidores ganhos"]];
  return `<a class="ig-post" href="${esc(m.link)}" target="_blank" rel="noopener"><div class="ig-pimg">${m.thumb ? `<img src="${esc(m.thumb)}" alt="" loading="lazy" onerror="this.remove()">` : ""}<span>${t}</span></div>
    <div class="ig-pi"><small>${dataCurta(m.quando.slice(0, 10)).toLowerCase()} ${m.quando.slice(0, 4)}</small><p>${esc(curto(m.legenda || "(sem legenda)", 70))}</p>
    <div class="ig-m">${met.map(([k, e, tt]) => m[k] != null ? `<span title="${tt}">${e} <b>${milN(m[k])}</b></span>` : "").join("")}</div></div></a>`;
}
function pInstagram() {
  carregarIG();
  const c = IGF.conta, F = IGF.fila, S_ = IGF.st || {};
  const setup = !c || !c.ok;
  const st = p => (S_[p.id] || {}).status || (p.aprovado ? "agendado" : "rascunho");
  const chip = s => ({ agendado: `<span class="st verde">agendado</span>`, rascunho: `<span class="st">rascunho · falta aprovar</span>`, publicado: `<span class="st verde">✓ publicado</span>`, erro: `<span class="st vermelho">erro</span>` }[s]);
  const thumb = p => `https://raw.githubusercontent.com/${REPO}/main/docs/${p.imagens[0]}`;
  const pend = (F || []).filter(p => st(p) !== "publicado").sort((a, b) => a.quando.localeCompare(b.quando));
  const linhaFila = p => { const s = st(p), e = S_[p.id] || {};
    return `<div class="ig-row"><img src="${thumb(p)}" alt="" loading="lazy"><div class="ig-i"><b>${esc(p.titulo)}</b><small>${p.tipo === "story" ? "Story" : p.tipo === "carrossel" ? `Carrossel · ${p.imagens.length} telas` : "Feed"} · ${dataHora(p.quando)} ${chip(s)}</small>
      ${s === "erro" ? `<small class="neg">${esc(e.erro || "")}</small>` : ""}</div>
      <div class="ig-a">${s === "rascunho" ? `<button class="bt sm pri" data-act="igaprovar" data-id="${p.id}">${ic("check")}Aprovar</button>` : s === "agendado" ? `<button class="bt sm ghost" data-act="igdesaprovar" data-id="${p.id}">Pausar</button>` : ""}
        ${s === "erro" ? `<button class="bt sm pri" data-act="igtentar" data-id="${p.id}">${ic("refresh")}Tentar de novo</button>` : ""}
        <button class="bt sm" data-act="igeditar" data-id="${p.id}">Editar</button><button class="bt sm" data-act="igagora" data-id="${p.id}">${ic("send")}Publicar agora</button><button class="bt sm ghost danger" data-act="igremover" data-id="${p.id}">Remover</button></div></div>`; };
  if (setup) return head("Instagram: números", "Crescimento do perfil, desempenho de cada post e agenda.") + `<div class="card ig-setup"><h3>${c && c.erro ? "A conexão com o Instagram deu erro" : "Instagram ainda não conectado"}</h3>${c && c.erro ? `<div class="aviso warn"><span>${esc(c.erro)}</span></div>` : `<p class="sub">Carregando…</p>`}</div>`;

  const per = IGF.per, T = igDias(c), L = T.slice(-per), ant = T.slice(-2 * per, -per);
  const M = (c.midias || []).slice().sort((a, b) => b.quando.localeCompare(a.quando));
  const postsDia = {}; M.forEach(m => { const d = new Date(new Date(m.quando.replace("+0000", "Z")).getTime() - 3 * 36e5).toISOString().slice(0, 10); postsDia[d] = (postsDia[d] || 0) + 1; });
  const ent = igSoma(L, "seguiram"), sai = igSoma(L, "deixaram"), liq = ent - sai;
  const alc = igSoma(L, "alcance"), alcA = igSoma(ant, "alcance"), int_ = igSoma(L, "interacoes"), intA = igSoma(ant, "interacoes");
  const pct = (a, b) => b ? `${a >= b ? "▲" : "▼"} ${Math.abs(Math.round((a / b - 1) * 100))}% vs ${per} dias antes` : "sem comparação ainda";
  const ord = { recentes: () => 0, alcance: (a, b) => (b.alcance || 0) - (a.alcance || 0), curtidas: (a, b) => (b.curtidas || 0) - (a.curtidas || 0), salvos: (a, b) => (b.salvos || 0) + (b.compartilhamentos || 0) - (a.salvos || 0) - (a.compartilhamentos || 0), seguiram: (a, b) => (b.seguiram || 0) - (a.seguiram || 0) }[IGF.ord];
  const MP = IGF.ord === "recentes" ? M : M.slice().sort(ord);
  const faltaHist = L.filter(d => !d.tem).length;
  return head("Instagram: números", `@${esc(c.usuario || "")} · atualiza sozinho a cada hora · última leitura ${haQuanto(c.quando)}`, `<button class="bt" data-act="igrecarregar">${ic("refresh")}Atualizar</button>`) +
    `<div class="ig-bar">${pills("igper", String(per), [["7", "7 dias"], ["14", "14 dias"], ["30", "30 dias"]])}</div>
    <div class="grid kpis ig-k4">${kpi("Seguidores", milN(c.seguidores || 0), `<span class="${liq < 0 ? "neg" : "pos"}">${liq >= 0 ? "+" : "−"}${milN(Math.abs(liq))}</span> em ${per} dias`, true, "users")}
      ${kpi("Entraram × saíram", `<span class="pos">+${milN(ent)}</span> <span class="neg">−${milN(sai)}</span>`, `média de ${(ent / per).toFixed(0)} entrando e ${(sai / per).toFixed(0)} saindo por dia`, false, "swap")}
      ${kpi("Alcance", milN(alc), pct(alc, alcA), false, "globe")}
      ${kpi("Interações", milN(int_), pct(int_, intA), false, "star")}</div>
    ${faltaHist ? `<p class="sub">Completando o histórico: ${per - faltaHist} de ${per} dias carregados (o resto chega nas próximas horas).</p>` : ""}
    <div class="card ig-diag"><h3>Como estamos</h3><ul>${igDiagnostico(c, L, ant, M).map(([k, t]) => `<li class="${k}">${t}</li>`).join("")}</ul></div>
    <div class="ig-graf"><div class="card"><h3>Seguidores</h3>${igSvgLinha(L.map(d => ({ v: d.seg, l: dataCurta(d.dia).toLowerCase() })))}</div>
      <div class="card"><h3>Quem entrou e quem saiu, por dia</h3>${igSvgBarras(L, postsDia)}<div class="ig-leg"><span><i style="background:#22A06B"></i>entraram</span><span><i style="background:#E5484D"></i>deixaram de seguir</span><span><i style="background:#7C5CE0;border-radius:50%"></i>dia com post</span></div></div>
      <div class="card"><h3>Alcance da conta por dia</h3>${igSvgLinha(L.map(d => ({ v: d.alcance || 0, l: dataCurta(d.dia).toLowerCase() })), "#0EA5E9")}</div></div>
    <div class="ig-sec"><h2 class="mv-t">Posts (${M.length})</h2>${pills("igord", IGF.ord, [["recentes", "Recentes"], ["alcance", "Mais alcance"], ["curtidas", "Mais curtidas"], ["salvos", "Mais salvos/compart."], ["seguiram", "Mais seguidores"]])}</div>
    ${MP.length ? `<div class="ig-posts">${MP.slice(0, 30).map(igPostCard).join("")}</div>` : `<div class="card vazio">Nenhum post no perfil ainda.</div>`}
    ${(c.stories || []).length ? `<h2 class="mv-t">Stories recentes</h2><div class="ig-posts">${c.stories.slice(0, 12).map(s => igPostCard({ ...s, tipo: "story", legenda: "Story" })).join("")}</div>` : ""}
    ${dmHTML()}
    <details class="card ig-ag" ${pend.length ? "open" : ""}><summary><b>Agenda do robô</b> <small>${pend.length ? `${pend.length} na fila` : "vazia"} · publica sozinho o que estiver aprovado</small></summary>
      ${F == null ? `<div class="vazio">Carregando…</div>` : pend.length ? `<div class="ig-lista">${pend.map(linhaFila).join("")}</div>` : `<div class="vazio">Nada agendado. Se quiser que o robô publique, use 📅 Agendar nas artes da Pauta.</div>`}</details>`;
}
document.addEventListener("click", e => { const b = e.target.closest('[data-act="pill"][data-g^="ig"]'); if (!b) return; if (b.dataset.g === "igper") IGF.per = +b.dataset.v; else if (b.dataset.g === "igord") IGF.ord = b.dataset.v; });
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
