/* Partiu 085 — 💡 Ideias virais: o que está bombando nos perfis de viagem (só inspiração, nunca cópia) + roteiros prontos pro nosso público de Fortaleza. */
"use strict";
const IV = { d: null, usadas: null, fo: "Todos", fb: "Todos" };
async function ivCarregar() { const ler = typeof ghJSON === "function" ? ghJSON : (p, d) => getJSON(p.replace(/^docs\//, ""), d);
  IV.d = (await ler("docs/ideias_virais.json", { ideias: [] })) || { ideias: [] }; IV.usadas = (await ler("docs/ideias_usadas.json", {})) || {}; }
const IV_OBJ = { "comentários": "💬", "compartilhamentos": "🔁", "salvamentos": "🔖", "seguidores": "➕" };
function pIdeias() {
  if (!IV.d) { ivCarregar().then(() => { if (/#ideias/.test(location.hash)) render(); }); return head("💡 Ideias virais", "Carregando…") + `<div class="card vazio">Carregando…</div>`; }
  const T = IV.d.ideias || [], objs = ["Todos", ...new Set(T.map(x => x.objetivo))], fmts = ["Todos", ...new Set(T.map(x => x.formato))];
  const L = T.filter(x => (IV.fo === "Todos" || x.objetivo === IV.fo) && (IV.fb === "Todos" || x.formato === IV.fb)).sort((a, b) => (IV.usadas[a.n] ? 1 : 0) - (IV.usadas[b.n] ? 1 : 0) || a.n - b.n);
  const nUs = Object.keys(IV.usadas).length;
  return head("💡 Ideias virais", `${T.length} roteiros pra viralizar · ${nUs} já usados · baseados no que mais engajou nos perfis de viagem`) + `
  <div class="card iv-apr"><b>📈 O que está funcionando no nicho</b><ul>${(IV.d.aprendizados || []).map(t => `<li>${esc(t)}</li>`).join("")}</ul><small class="sub">${esc(IV.d.fonte || "")}</small></div>
  <div class="vp-bar">${objs.map(o => `<button class="pill ${IV.fo === o ? "on" : ""}" data-act="ivo" data-v="${esc(o)}">${IV_OBJ[o] || ""} ${esc(o)}</button>`).join("")}</div>
  <div class="vp-bar">${fmts.map(o => `<button class="pill ${IV.fb === o ? "on" : ""}" data-act="ivf" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>
  <div class="iv-grade">${L.map(x => `<article class="card iv-c ${IV.usadas[x.n] ? "feito" : ""}">
    <div class="iv-top"><span class="iv-n">${x.n}</span><small>${esc(x.formato)} · ${IV_OBJ[x.objetivo] || ""} ${esc(x.objetivo)}${IV.usadas[x.n] ? ` · ✅ ${esc(IV.usadas[x.n])}` : ""}</small></div>
    <b class="iv-t">${esc(x.titulo)}</b>
    <div class="iv-g">“${esc(x.gancho)}”</div>
    <ol class="iv-r">${(x.roteiro || []).map(r => `<li>${esc(r)}</li>`).join("")}</ol>
    <div class="iv-cta">💬 ${esc(x.cta)}</div>
    <small class="sub">💡 ${esc(x.porque)}</small>
    ${x.pesquisar ? `<small class="sub">🔎 Confirmar antes: ${esc(x.pesquisar)}</small>` : ""}
    ${x.ref ? `<a class="sub iv-ref" href="${esc(x.ref[1])}" target="_blank" rel="noopener">👀 ${esc(x.ref[0])}</a>` : ""}
    <div class="vp-bts"><button class="bt sm pri" data-act="ivcriar" data-n="${x.n}">✨ Criar este</button><button class="bt sm ${IV.usadas[x.n] ? "ok" : "ghost"}" data-act="ivusei" data-n="${x.n}">${IV.usadas[x.n] ? "✓ Usado" : "Usei"}</button></div>
  </article>`).join("")}</div>`;
}
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b || !/^iv/.test(b.dataset.act)) return; const a = b.dataset.act;
  if (a === "ivo") { IV.fo = b.dataset.v; render(); return; }
  if (a === "ivf") { IV.fb = b.dataset.v; render(); return; }
  const x = (IV.d.ideias || []).find(i => String(i.n) === b.dataset.n); if (!x) return;
  if (a === "ivusei") { if (!token()) { toast("Conecte em Ajustes."); return; } if (IV.usadas[x.n]) delete IV.usadas[x.n]; else IV.usadas[x.n] = hojeISO().slice(8, 10) + "/" + hojeISO().slice(5, 7);
    try { await salvarArquivo("docs/ideias_usadas.json", IV.usadas, "Ideias virais: marcada como usada"); } catch (er) { toast("Não salvou: " + er.message); } render(); return; }
  if (a === "ivcriar") { if (typeof pdCarregar !== "function") return; b.disabled = true; await pdCarregar();
    const video = /Reels motion/.test(x.formato), carr = /Carrossel/.test(x.formato);
    PD.lista.push({ id: "pd-" + Date.now().toString(36), urgente: false, criado: isoLocal(new Date()), status: "novo",
      texto: `IDEIA VIRAL nº ${x.n} pro @partiu.085: ${x.titulo}\nFormato: ${x.formato} · objetivo: ${x.objetivo}\nGancho: ${x.gancho}\nRoteiro: ${(x.roteiro || []).join(" | ")}\nCTA/legenda: ${x.cta}\n${x.pesquisar ? "Pesquisar e confirmar antes: " + x.pesquisar + "\n" : ""}\nComo fazer: ${video ? "vídeo MOTION com engine/video/motion2.html (veja as instruções do pedido de vídeo em docs/videos.js) e coloque em docs/videos_prontos.json no grupo \"Dicas\"" : carr ? "carrossel novo no array CONTEUDO de docs/conteudo.js com foto de capa aprovada (regra das fotos)" : "prepare o roteiro detalhado (texto na tela, cenas pra gravar, legenda) na resposta do pedido, pro Leo gravar"}. Só fatos verdadeiros e com data; preços só do nosso radar. Inspiração, nunca cópia. No fim marque a ideia ${x.n} em docs/ideias_usadas.json com a data.` });
    if (await pdSalvar("Pedido: ideia viral " + x.n)) toast("Pedido enviado! O Claude cria na próxima passada (8h46, 13h46 ou 19h46).", 7000); b.disabled = false; }
});
