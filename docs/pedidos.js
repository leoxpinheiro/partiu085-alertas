/* Partiu 085 — 💬 Pedidos ao Claude: você escreve o que quer, o Claude passa algumas vezes por dia, faz e responde aqui. */
"use strict";
const PD = { lista: null };
async function pdCarregar() { PD.lista = (typeof ghJSON === "function" ? await ghJSON("docs/pedidos.json", []) : await getJSON("pedidos.json", [])) || []; }
async function pdSalvar(msg) { if (!token()) { toast("Conecte em Ajustes pra mandar pedidos."); return false; } try { await salvarArquivo("docs/pedidos.json", PD.lista, msg); return true; } catch (e) { toast("Não salvou: " + e.message); return false; } }
const PD_EX = ["Faz um carrossel sobre a Black Friday de milhas", "Cria 5 Reels novos de humor sobre aeroporto", "Muda a cor do botão X no painel", "Pesquisa as novidades do aeroporto de Fortaleza essa semana", "Monta o Destino da semana de Santiago"];
function pPedidos() {
  if (!PD.lista) { pdCarregar().then(() => { if (/#pedidos/.test(location.hash)) render(); }); return head("💬 Pedidos ao Claude", "Carregando…") + `<div class="card vazio">Carregando…</div>`; }
  const st = { novo: ["⏳ na fila", ""], fazendo: ["🛠️ fazendo", "mc-vivo"], feito: ["✅ feito", "pos"], nao: ["⚠️ não deu", "neg"] };
  const L = PD.lista.slice().sort((a, b) => b.criado.localeCompare(a.criado));
  return head("💬 Pedidos ao Claude", "Escreva o que você quer. O Claude passa aqui de manhã, à tarde e à noite, faz e responde embaixo do pedido.") + `
  <div class="card"><div class="field"><label>O que você quer?</label><textarea id="pd-txt" rows="4" placeholder="${esc(PD_EX[Math.floor(Math.random() * PD_EX.length)])}"></textarea></div>
    <div class="al-acts"><label class="chk"><input type="checkbox" id="pd-urg"> é urgente</label><button class="bt pri" data-act="pdenviar">Enviar pedido</button></div>
    <small class="sub">Pra funcionar, o computador precisa estar ligado com o app do Claude aberto nesses horários (9h, 14h e 20h). Pedidos grandes podem levar mais de uma passada. Nada vai pro Instagram sem a sua aprovação: posts novos ficam na Pauta ou na agenda como rascunho.</small></div>
  ${L.length ? L.map(p => `<div class="card pd-item"><div class="pd-h"><b class="${(st[p.status] || st.novo)[1]}">${(st[p.status] || st.novo)[0]}</b><small>${dataHora(p.criado)}${p.urgente ? " · urgente" : ""}${p.feito_em ? ` · respondido ${dataHora(p.feito_em)}` : ""}</small>
      ${p.status === "novo" ? `<button class="bt sm ghost" data-act="pdapagar" data-id="${p.id}">✕</button>` : ""}</div>
    <p class="pd-t">${esc(p.texto).replace(/\n/g, "<br>")}</p>${p.resposta ? `<div class="pd-r">🤖 ${esc(p.resposta).replace(/\n/g, "<br>")}</div>` : ""}</div>`).join("") : `<div class="card vazio">Nenhum pedido ainda.</div>`}`;
}
document.addEventListener("click", async e => { const b = e.target.closest('[data-act^="pd"]'); if (!b || !PD.lista) return;
  if (b.dataset.act === "pdenviar") { const t = ($("#pd-txt").value || "").trim(); if (t.length < 5) { toast("Escreva o pedido."); return; } b.disabled = true;
    await pdCarregar(); PD.lista.push({ id: "pd-" + Date.now().toString(36), texto: t, urgente: $("#pd-urg").checked, criado: isoLocal(new Date()), status: "novo" });
    if (await pdSalvar("Pedido ao Claude")) toast("Pedido enviado! O Claude responde na próxima passada."); render(); }
  else if (b.dataset.act === "pdapagar") { await pdCarregar(); PD.lista = PD.lista.filter(p => p.id !== b.dataset.id); await pdSalvar("Pedido removido"); render(); } });
