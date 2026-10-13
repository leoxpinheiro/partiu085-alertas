/* Partiu 085 — 🎬 Vídeos prontos: os Reels produzidos (lançamento, sistema e achado do dia). Assistir, baixar, copiar legenda, agendar ou marcar como postado. */
"use strict";
const VP = { lista: null, f: "Todos" };
async function vpCarregar() { const ler = typeof ghJSON === "function" ? ghJSON : (p, d) => getJSON(p.replace(/^docs\//, ""), d); VP.lista = (await ler("docs/videos_prontos.json", [])) || []; }
async function vpSalvar(msg) { if (!token()) { toast("Conecte em Ajustes pra salvar."); return false; } try { await salvarArquivo("docs/videos_prontos.json", VP.lista, msg); return true; } catch (e) { toast("Não salvou: " + e.message); return false; } }
const vpDia = d => { if (!d) return ""; const x = new Date(d + "T12:00:00-03:00"); return ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][x.getDay()] + " " + d.slice(8, 10) + "/" + d.slice(5, 7); };
function pVideos() {
  if (!VP.lista) { vpCarregar().then(() => { if (/#videos/.test(location.hash)) render(); }); return head("🎬 Vídeos prontos", "Carregando…") + `<div class="card vazio">Carregando…</div>`; }
  const grupos = ["Todos", ...new Set(VP.lista.map(v => v.grupo))], h = hojeISO();
  const L = VP.lista.filter(v => VP.f === "Todos" || v.grupo === VP.f).slice().sort((a, b) => (a.postado ? 1 : 0) - (b.postado ? 1 : 0) || (a.data || "9").localeCompare(b.data || "9") || (b.criado || "").localeCompare(a.criado || ""));
  return head("🎬 Vídeos prontos", "Reels produzidos pra postar. O melhor jeito: baixe e poste pelo app do Instagram com uma música em alta.") + estAbas("videos") + `
  <div class="vp-bar">${grupos.map(g => `<button class="pill ${VP.f === g ? "on" : ""}" data-act="vpf" data-v="${esc(g)}">${esc(g)} <small>${g === "Todos" ? VP.lista.length : VP.lista.filter(v => v.grupo === g).length}</small></button>`).join("")}</div>
  <div class="vp-grade">${L.length ? L.map(v => `<article class="card vp-c ${v.postado ? "feito" : ""}">
    <video src="${esc(v.arq)}" poster="${esc(v.capa || "")}" controls playsinline preload="none"></video>
    <div class="vp-i"><small>${esc(v.grupo)}${v.data ? ` · ${v.data === h ? "<b class='pos'>postar hoje</b>" : v.data < h && !v.postado ? `<b class='neg'>era pra ${vpDia(v.data)}</b>` : "📅 " + vpDia(v.data)}` : ""}${v.postado ? " · ✅ postado" : ""}</small><b>${esc(v.titulo)}</b></div>
    <div class="vp-bts"><a class="bt sm pri" href="${esc(v.arq)}" download="${esc(v.id)}.mp4">⬇️ Baixar</a><button class="bt sm" data-act="vpleg" data-id="${esc(v.id)}">📋 Legenda</button>
      <button class="bt sm" data-act="vpag" data-id="${esc(v.id)}">📅 Agendar</button><button class="bt sm ${v.postado ? "ok" : "ghost"}" data-act="vppost" data-id="${esc(v.id)}">${v.postado ? "✓ Postado" : "Postei"}</button></div>
  </article>`).join("") : `<div class="card vazio">Nenhum vídeo aqui ainda.</div>`}</div>
  <div class="card"><b>🤖 Quer um vídeo novo?</b><div class="field" style="margin-top:8px"><textarea id="vp-ped" rows="3" placeholder="Ex.: vídeo mostrando as 5 passagens mais baratas da semana / vídeo explicando como entrar no grupo"></textarea></div>
    <div class="al-acts"><button class="bt pri" data-act="vppedir">Pedir ao Claude</button></div><small class="sub">O Claude cria na próxima passada (8h46, 13h46 ou 19h46) e o vídeo aparece aqui. O vídeo do achado do dia aparece sozinho toda manhã.</small></div>`;
}
document.addEventListener("click", async e => { const b = e.target.closest('[data-act^="vp"]'); if (!b || !VP.lista) return; const a = b.dataset.act, v = VP.lista.find(x => x.id === b.dataset.id);
  if (a === "vpf") { VP.f = b.dataset.v; render(); return; }
  if (a === "vpleg" && v) { try { await navigator.clipboard.writeText(v.legenda || ""); toast("Legenda copiada!"); } catch (x) { prompt("Copie a legenda:", v.legenda || ""); } return; }
  if (a === "vppost" && v) { v.postado = !v.postado; render(); await vpSalvar(v.postado ? "Vídeo postado" : "Vídeo desmarcado"); return; }
  if (a === "vpag" && v) { const sug = (v.data && v.data >= hojeISO() ? v.data : hojeISO()) + "T19:30"; const q = prompt("Dia e hora pra postar (o robô posta sozinho, sem música):", sug.replace("T", " ")); if (!q) return;
    const m = q.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})$/); if (!m) { toast("Use o formato 2026-10-14 19:30"); return; }
    if (!token()) { toast("Conecte em Ajustes."); return; } b.disabled = true;
    try { for (let i = 0; i < 50 && IGF.carregando; i++) await new Promise(r => setTimeout(r, 100)); IGF.fila = null; await carregarIG(true); IGF.fila = IGF.fila || [];
      const quando = `${m[1]}T${m[2].padStart(2, "0")}:${m[3]}-03:00`, ja = IGF.fila.find(x => x.origem === "video-" + v.id);
      if (ja) ja.quando = quando; else IGF.fila.push({ id: "ig-v-" + Date.now().toString(36), titulo: "🎬 " + v.titulo, tipo: "reels", imagens: [v.capa], video_pronto: v.arq, dur: v.dur || 15, legenda: v.legenda || "", quando, aprovado: true, tentativa: 0, criado: isoLocal(new Date()), origem: "video-" + v.id });
      await salvarFila("Instagram: agenda vídeo pronto"); toast(`Agendado: ${vpDia(m[1])} às ${m[2]}:${m[3]}. Veja em Agenda.`, 6000); } catch (x) { toast("Não agendou: " + x.message, 6000); } b.disabled = false; return; }
  if (a === "vppedir") { const t = ($("#vp-ped").value || "").trim(); if (t.length < 5) { toast("Escreva o que quer no vídeo."); return; } if (typeof pdCarregar !== "function") return; b.disabled = true;
    await pdCarregar(); PD.lista.push({ id: "pd-" + Date.now().toString(36), urgente: false, criado: isoLocal(new Date()), status: "novo",
      texto: `VÍDEO NOVO pro @partiu.085: ${t}\n\nComo fazer: monte um roteiro JSON de cenas (tipos em engine/video/cenas.html: gancho, radar, data, alerta, lista, euquero, cta, rota, preco, versus, numeros), com clipes aprovados em docs/fotos_catalogo.json (os clip-v-*), e renderize com engine/video/render.js (precisa de node + playwright + ffmpeg; se não der no computador do Leo, renderize no container da nuvem). Use só dados reais do radar (docs/status.json, docs/alerts.json) com a data. Salve em docs/videos/<id>.mp4 + capa .jpg e acrescente em docs/videos_prontos.json {id,titulo,grupo,arq,capa,data,legenda,criado}.` });
    if (await pdSalvar("Pedido: vídeo novo")) { toast("Pedido enviado! O vídeo aparece aqui depois da próxima passada.", 7000); $("#vp-ped").value = ""; } b.disabled = false; }
});
