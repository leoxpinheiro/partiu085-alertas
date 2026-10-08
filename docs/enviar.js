/* Radar Partiu085 — Modo envio: um alerta por vez, com o texto exato que vai ser copiado. */
"use strict";
const EV = { i: 0, promos: false, ultimo: null };
try { EV.promos = localStorage.getItem("p085_env_promos") === "1"; } catch (e) { }

function filaModoEnvio() {
  return filaEnvio().filter(f => EV.promos || f.tipo !== "promo");
}
function evFonte(f) { return f && (S.alertas.find(a => a.id === f.id) || ((S.mi && S.mi.ofertas) || []).find(o => o.id === f.id)); }
async function evImagem() { const F = filaModoEnvio(), f = F[EV.i], cv = document.getElementById("ev-cv"), d = cardDeAlerta(evFonte(f)); if (cv && d) await desenharResgate(cv, d); return cv; }
function pEnviar() {
  carregarMilhas();
  const F = filaModoEnvio();
  if (EV.i >= F.length) EV.i = Math.max(0, F.length - 1);
  const f = F[EV.i];
  const tot = F.length;
  const ult = EV.ultimo ? `<div class="ev-ult">${ic("check", "i sm")}Último copiado: <b>${esc(EV.ultimo)}</b></div>` : "";
  const topo = head("Modo envio", "Um alerta por vez. Você vê o texto exato, copia (ou compartilha) e já vai pro próximo. Alertas cujo preço subiu não aparecem aqui.") +
    `<div class="ev-bar"><label class="chk"><input type="checkbox" data-ev-promos ${EV.promos ? "checked" : ""}> Incluir promoções de milhas</label>${ult}</div>`;
  if (!f) return topo + `<div class="card ev-fim"><div class="ev-fim-i">🎉</div><h3>Tudo enviado</h3><p class="desc">Não tem nada pendente de ontem e hoje. Os próximos alertas aparecem aqui sozinhos.</p><div class="al-acts"><a class="bt" href="#alertas">${ic("bell")}Ver todos os alertas</a></div></div>`;
  const pode = typeof navigator.share === "function";
  return topo + `
    <div class="ev-prog"><span>Faltam ${tot} pra enviar${EV.i ? ` · vendo o ${EV.i + 1}º` : ""}</span></div>
    <div class="card ev-card" style="--c:${f.cor}">
      <div class="ev-h"><span class="fila-tag">${esc(f.rot)}</span><div><b>${esc(f.t)}</b><small>${esc(f.v)}${f.d ? ` · ${f.d}` : ""} · achado ${f.q.slice(0, 10) === hojeISO() ? "hoje" : "ontem"} às ${f.q.slice(11, 16)}</small></div></div>
      <div class="ev-grid"><div><textarea class="ev-texto" id="ev-texto" spellcheck="false" title="Pode editar antes de copiar">${esc(f.texto)}</textarea><div class="sub" style="margin-top:6px">Dá pra editar o texto antes de copiar. Vale só pra este envio.</div></div>
        ${cardDeAlerta(evFonte(f)) ? `<div class="ev-img"><canvas id="ev-cv"></canvas><div class="al-acts"><button class="bt sm" data-act="evcopimg">${ic("copy")}Copiar imagem</button><button class="bt sm ghost" data-act="evbaixar">${ic("down")}Baixar</button></div></div>` : ""}</div>
      <div class="ev-acts">
        <button class="bt pri lg" data-act="evcopiar">${ic("copy")}Copiar e ir pro próximo</button>
        ${pode ? `<button class="bt lg" data-act="evshare">${ic("send")}Compartilhar (imagem + texto)</button>` : `<a class="bt lg zap" target="_blank" rel="noopener" data-act="evzap" href="https://api.whatsapp.com/send?text=${encodeURIComponent(f.texto || "")}">${ic("send")}Abrir no WhatsApp</a>`}
      </div>
      <div class="ev-acts sec">
        <button class="bt sm ghost" data-act="evvoltar" ${EV.i ? "" : "disabled"}>← Anterior</button>
        <button class="bt sm ghost" data-act="evpular">Pular →</button>
        <button class="bt sm ghost danger" data-act="evacabou">Já acabou / não enviar</button>
        <a class="bt sm ghost" href="${f.link}">${ic("ext")}Abrir na página</a>
      </div>
    </div>`;
}
async function evConcluir(f, msg) {
  marcar(f.id, true); EV.ultimo = `${f.t} · ${f.v}`;
  toast(msg || `Copiado: ${f.t} · ${f.v}`, 3000); render();
}
document.addEventListener("click", async e => {
  const b = e.target.closest('[data-act^="ev"]'); if (!b) return;
  const F = filaModoEnvio(), f = F[EV.i]; const act = b.dataset.act;
  if (act === "evpular") { EV.i = Math.min(EV.i + 1, F.length - 1); render(); return; }
  if (act === "evvoltar") { EV.i = Math.max(0, EV.i - 1); render(); return; }
  if (!f) return;
  const txt = ($("#ev-texto") || {}).value || f.texto;
  if (act === "evcopiar") { await copiar(txt); await evConcluir(f); }
  else if (act === "evcopimg") { const cv = $("#ev-cv"); const blob = await new Promise(ok => cv.toBlob(ok, "image/png")); try { await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); toast("Imagem copiada: cole no WhatsApp e depois cole o texto."); } catch (x) { toast("Seu navegador não deixou copiar imagem. Use Baixar."); } return; }
  else if (act === "evbaixar") { const cv = $("#ev-cv"); const a = document.createElement("a"); a.download = `alerta-${(f.t || "").replace(/\W+/g, "-")}.png`; a.href = cv.toDataURL("image/png"); a.click(); return; }
  else if (act === "evshare") { try { const cv = $("#ev-cv"); let dados = { text: txt };
      if (cv) { const blob = await new Promise(ok => cv.toBlob(ok, "image/png")); const arq = new File([blob], "alerta-085.png", { type: "image/png" }); if (navigator.canShare && navigator.canShare({ files: [arq] })) dados = { files: [arq], text: txt }; }
      await navigator.share(dados); await evConcluir(f, `Enviado: ${f.t}`); } catch (x) { /* cancelou */ } }
  else if (act === "evzap") { b.href = "https://api.whatsapp.com/send?text=" + encodeURIComponent(txt); setTimeout(() => evConcluir(f, `Aberto no WhatsApp: ${f.t}`), 300); }
  else if (act === "evacabou") { marcar(f.id, "descartado"); toast(`${f.t} tirado da fila.`); render(); }
});
document.addEventListener("input", e => { if (e.target.dataset.evPromos !== undefined) { EV.promos = e.target.checked; EV.i = 0; try { localStorage.setItem("p085_env_promos", EV.promos ? "1" : "0"); } catch (x) { } render(); } });

/* Enviar com imagem: janela usada em Alertas, Milhas e Promoções (mesmo fluxo do Modo envio). */
const ENV_REG = {};
const EJ = { id: null };
function fonteEnvio(id) { return ENV_REG[id] || S.alertas.find(a => a.id === id) || ((S.mi && S.mi.ofertas) || []).find(o => o.id === id); }
async function abrirEnvio(id) {
  const x = fonteEnvio(id); if (!x) { toast("Não achei esse alerta."); return; }
  EJ.id = id; fecharEnvio(true);
  const card = cardDeAlerta(x), pode = typeof navigator.share === "function" && matchMedia("(pointer:coarse)").matches;
  const titulo = x.destino_nome || x.destino || x.titulo || "Alerta";
  const d = document.createElement("div"); d.className = "ej-fundo"; d.id = "ej";
  d.innerHTML = `<div class="ej" role="dialog" aria-modal="true" aria-label="Enviar alerta">
    <div class="ej-h"><div><b>Enviar: ${esc(titulo)}</b><small>${card ? "Imagem e texto prontos. No WhatsApp: cole a imagem e depois o texto." : "Este é só texto (promoção)."}</small></div><button class="bt sm ghost" data-act="ejfechar" title="Fechar">✕</button></div>
    <div class="ej-g">
      ${card ? `<div class="ej-img"><canvas id="ej-cv"></canvas></div>` : ""}
      <div class="ej-t"><textarea id="ej-texto" spellcheck="false">${esc(x.texto || "")}</textarea><div class="sub">Pode editar antes de copiar. Vale só pra este envio.</div></div>
    </div>
    <div class="ej-acts">
      ${pode ? `<button class="bt pri lg" data-act="ejshare">${ic("send")}Compartilhar no WhatsApp (imagem + texto)</button>` : ""}
      ${card ? `<button class="bt ${pode ? "" : "pri"} lg" data-act="ejimg"><span class="ej-n">1</span>Copiar imagem</button>` : ""}
      <button class="bt lg" data-act="ejtxt">${card ? `<span class="ej-n">2</span>` : ""}Copiar texto</button>
      ${card ? `<button class="bt ghost" data-act="ejbaixar">${ic("down")}Baixar imagem</button>` : ""}
      <button class="bt ghost" data-act="ejok">${ic("check")}Marcar como enviado</button>
    </div></div>`;
  document.body.appendChild(d); document.body.classList.add("ej-on");
  if (card) await desenharResgate(document.getElementById("ej-cv"), card);
}
function fecharEnvio(silencio) { const d = document.getElementById("ej"); if (d) d.remove(); document.body.classList.remove("ej-on"); if (!silencio) render(); }
async function ejBlob() { const cv = document.getElementById("ej-cv"); return cv ? new Promise(ok => cv.toBlob(ok, "image/png")) : null; }
document.addEventListener("click", async e => {
  const b = e.target.closest('[data-act="envabrir"],[data-act^="ej"]');
  if (!b) { if (e.target.id === "ej") fecharEnvio(); return; }
  e.preventDefault(); const act = b.dataset.act;
  if (act === "envabrir") { abrirEnvio(b.dataset.id); return; }
  const id = EJ.id, x = fonteEnvio(id), txt = ($("#ej-texto") || {}).value || "";
  if (act === "ejfechar") fecharEnvio();
  else if (act === "ejimg") { try { const blob = await ejBlob(); await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); b.classList.add("ok"); toast("① Imagem copiada. Cole no WhatsApp (⌘V) e depois copie o texto."); } catch (x) { toast("O navegador não deixou copiar a imagem. Use Baixar imagem."); } }
  else if (act === "ejtxt") { await copiar(txt); b.classList.add("ok"); marcar(id, true); toast("② Texto copiado e alerta marcado como enviado.", 3500); }
  else if (act === "ejbaixar") { const cv = $("#ej-cv"); const a = document.createElement("a"); a.download = `alerta-${String((x && (x.destino_nome || x.destino)) || "085").replace(/\W+/g, "-")}.png`; a.href = cv.toDataURL("image/png"); a.click(); }
  else if (act === "ejok") { marcar(id, true); toast("Marcado como enviado."); fecharEnvio(); }
  else if (act === "ejshare") { try { let dados = { text: txt }; const blob = await ejBlob();
      if (blob) { const arq = new File([blob], "alerta-085.png", { type: "image/png" }); if (navigator.canShare && navigator.canShare({ files: [arq] })) dados = { files: [arq], text: txt }; }
      await navigator.share(dados); marcar(id, true); toast("Enviado ✓"); fecharEnvio(); } catch (x) { } }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && document.getElementById("ej")) fecharEnvio(); });
