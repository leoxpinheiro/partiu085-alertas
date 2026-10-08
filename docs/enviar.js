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
        ${pode ? `<button class="bt lg" data-act="evshare">${ic("send")}Compartilhar (imagem + texto)</button>` : `<a class="bt lg zap" target="_blank" rel="noopener" data-act="evzap" href="https://wa.me/?text=${encodeURIComponent(f.texto || "")}">${ic("send")}Abrir no WhatsApp</a>`}
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
  else if (act === "evzap") { b.href = "https://wa.me/?text=" + encodeURIComponent(txt); setTimeout(() => evConcluir(f, `Aberto no WhatsApp: ${f.t}`), 300); }
  else if (act === "evacabou") { marcar(f.id, "descartado"); toast(`${f.t} tirado da fila.`); render(); }
});
document.addEventListener("input", e => { if (e.target.dataset.evPromos !== undefined) { EV.promos = e.target.checked; EV.i = 0; try { localStorage.setItem("p085_env_promos", EV.promos ? "1" : "0"); } catch (x) { } render(); } });
