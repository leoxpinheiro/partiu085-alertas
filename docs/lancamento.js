/* Partiu 085 — 🚀 Lançamento do grupo (20/10, adiado de 19/10): checklist de cada dia, textos prontos e capas dos destaques. */
"use strict";
const LC = { feitos: null };
const LC_TXT = {
  boas: "✈️ *Bem-vindo(a) ao Partiu 085!*\n\nAqui você recebe as passagens baratas saindo de *Fortaleza* assim que o nosso radar encontra.\n\n📡 *Como funciona*\n• O radar vigia 54 destinos o dia todo\n• Quando o preço cai, a gente confere e manda aqui\n• Preço de passagem muda rápido: viu, gostou, compra\n\n🔔 *Dica:* deixa as notificações do grupo ligadas (ou fixa o grupo no topo)\n\n📋 *Regras*\n• Grupo só de avisos: só os admins mandam mensagem\n• Nada de spam, venda ou corrente\n• O preço é o visto na hora do alerta e pode mudar\n\n💬 Dúvida ou pedido de destino? Chama no direct do @partiu.085\n\nBoa viagem! 🧳",
  abriu: "🎉 *ABRIU!*\n\nBom dia e bem-vindo(a) ao grupo do *Partiu 085*!\n\nA partir de hoje o radar manda aqui as passagens baratas saindo de Fortaleza, na hora que aparecem.\n\n1️⃣ Ativa as notificações do grupo 🔔\n2️⃣ Fixa o grupo no topo do WhatsApp\n\nDaqui a pouco chega o primeiro achado 👀✈️",
  convite: "📢 Primeiro dia do grupo: obrigado a todo mundo que chegou! 🙌\n\nSabe alguém que vive dizendo que quer viajar? Manda o link pra essa pessoa 👇\n{link}\n\nAmanhã o radar continua trabalhando ✈️",
  bio: "✈️ Passagem barata saindo de Fortaleza\n📡 Radar ligado o dia todo · alertas grátis\n👇 Entra no grupo",
  story_pergunta: "Pra onde você quer ir saindo de Fortaleza? ✈️ (use a caixinha de perguntas)"
};
const LC_DIAS = [
  ["2026-10-13", "Terça 13", [["v1", "Postar o vídeo 1: Tem algo chegando", "#videos"], ["link", "Tocar no link bit.ly/radar085 e conferir se abre o grupo GRÁTIS certo"], ["dm", "Pedir pra um amigo comentar EU QUERO num post e ver se o direct com o link chegou"], ["bio", "Atualizar a bio do Instagram (texto pronto abaixo) com o link", "copiar:bio"]]],
  ["2026-10-14", "Quarta 14", [["v2", "Postar o vídeo 2: Como funciona", "#videos"], ["v7", "Postar o vídeo Antes × depois (Reels ou story)", "#videos"], ["dest", "Colocar os destaques no perfil com as capas novas (abaixo)"]]],
  ["2026-10-15", "Quinta 15", [["v3", "Postar o vídeo 3: O que o radar achou (posso refazer com preços do dia)", "#videos"], ["v9", "Postar o vídeo POV Lisboa", "#videos"], ["grupo", "Criar/preparar o grupo: só admins mandam mensagem, foto e descrição"]]],
  ["2026-10-16", "Sexta 16", [["v8", "Postar o vídeo Radar em números", "#videos"], ["seg", "Conferir se o post \"Segunda abre\" (13h) saiu", "#instagram"], ["perg", "Story com caixinha de perguntas: pra onde você quer ir?", "copiar:story_pergunta"]]],
  ["2026-10-17", "Sábado 17", [["v4", "Postar o vídeo 4: Faltam 2 dias", "#videos"], ["v10", "Postar o vídeo Passagem barata é sorte?", "#videos"]]],
  ["2026-10-18", "Domingo 18", [["v5", "Postar o vídeo 5: É amanhã (comenta EU QUERO)", "#videos"], ["fixa", "Colar e fixar a mensagem de boas-vindas no grupo", "copiar:boas"], ["resp", "Responder os comentários EU QUERO que o robô não alcançou"]]],
  ["2026-10-19", "Segunda 19 · véspera", [["v5b", "Story: É AMANHÃ! Grupo abre terça (comenta EU QUERO)", "#videos"], ["site", "Colocar o site na bio e testar no celular"]]],
  ["2026-10-20", "Terça 20 · ABRE", [["v6", "Postar o vídeo 6: Abriu!", "#videos"], ["m1", "8h: mandar no grupo a mensagem ABRIU", "copiar:abriu"], ["m2", "Meio-dia: mandar o primeiro achado pelo Modo envio", "#enviar"], ["m3", "Noite: mensagem pedindo pra convidar os amigos", "copiar:convite"], ["link2", "Trocar o link da bio pro link do grupo, se mudou"]]]];
async function lcCarregar() { const ler = typeof ghJSON === "function" ? ghJSON : (p, d) => getJSON(p.replace(/^docs\//, ""), d); const d = await ler("docs/lancamento.json", { feitos: [] }); LC.feitos = new Set((d && d.feitos) || []); }
function pLancamento() {
  if (!LC.feitos) { lcCarregar().then(() => { if (/#lancamento/.test(location.hash)) render(); }); return head("🚀 Lançamento 20/10", "Carregando…") + `<div class="card vazio">Carregando…</div>`; }
  const h = hojeISO(), tot = LC_DIAS.reduce((p, d) => p + d[2].length, 0), ok = LC_DIAS.reduce((p, d) => p + d[2].filter(i => LC.feitos.has(i[0])).length, 0);
  const faltam = Math.max(0, Math.round((new Date("2026-10-20T12:00:00-03:00") - new Date(h + "T12:00:00-03:00")) / 864e5));
  const dias = LC_DIAS.slice().sort((a, b) => (a[0] === h ? -1 : b[0] === h ? 1 : 0) || a[0].localeCompare(b[0]));
  return head("🚀 Lançamento 20/10", faltam ? `Faltam ${faltam} dia${faltam > 1 ? "s" : ""} pro grupo abrir. Vá marcando o que já fez.` : "É hoje! Bora abrir o grupo.") + `
  <div class="card lc-prog"><b>${ok} de ${tot} feitos</b><div class="lc-bar"><i style="width:${Math.round(ok / tot * 100)}%"></i></div></div>
  ${dias.map(([d, nome, itens]) => `<div class="card lc-dia ${d === h ? "hoje" : d < h ? "passou" : ""}"><div class="lc-dh"><b>${d === h ? "👉 Hoje · " : ""}${nome}</b><small>${itens.filter(i => LC.feitos.has(i[0])).length}/${itens.length}</small></div>
    ${itens.map(([id, t, ac]) => `<div class="lc-it ${LC.feitos.has(id) ? "ok" : ""}"><label class="chk"><input type="checkbox" data-lc="${id}" ${LC.feitos.has(id) ? "checked" : ""}> <span>${esc(t)}</span></label>
      ${ac ? ac.startsWith("copiar:") ? `<button class="bt sm" data-act="lccopiar" data-k="${ac.slice(7)}">📋 Copiar texto</button>` : `<a class="bt sm ghost" href="${ac}">Abrir</a>` : ""}</div>`).join("")}</div>`).join("")}
  <div class="card"><b>📝 Textos prontos</b><div class="lc-txts">${[["boas", "Boas-vindas (fixar no grupo)"], ["abriu", "Mensagem do dia 20, 8h"], ["convite", "Mensagem do dia 20, noite"], ["bio", "Bio do Instagram"]].map(([k, n]) => `<details><summary>${n}</summary><pre>${esc(LC_TXT[k])}</pre><button class="bt sm" data-act="lccopiar" data-k="${k}">📋 Copiar</button></details>`).join("")}</div></div>
  <div class="card"><b>🎨 Capas dos destaques</b><small class="sub" style="display:block;margin:4px 0 10px">Baixe, poste cada uma como story e use como capa do destaque. No perfil aparece só o círculo do meio.</small>
    <div class="lc-dest">${[["grupo", "Grupo"], ["como", "Como funciona"], ["ofertas", "Ofertas"], ["milhas", "Milhas"], ["destinos", "Destinos"]].map(([k, n]) => `<a href="marca/destaques/destaque-${k}.png" download="destaque-${k}.png"><img src="marca/destaques/destaque-${k}.png" alt=""><span>${n}</span></a>`).join("")}</div></div>`;
}
document.addEventListener("change", async e => { const t = e.target; if (!t.dataset || !t.dataset.lc || !LC.feitos) return; t.checked ? LC.feitos.add(t.dataset.lc) : LC.feitos.delete(t.dataset.lc); render();
  if (token()) { try { await salvarArquivo("docs/lancamento.json", { feitos: [...LC.feitos] }, "Lançamento: checklist"); } catch (x) { toast("Não salvou: " + x.message); } } });
document.addEventListener("click", async e => { const b = e.target.closest('[data-act="lccopiar"]'); if (!b) return; let t = LC_TXT[b.dataset.k] || "";
  t = t.replace("{link}", (typeof S !== "undefined" && S.ajustes && S.ajustes.link_whatsapp) || "https://chat.whatsapp.com/Ilk0rj2e1rFA4BYXeEkN9l");
  try { await navigator.clipboard.writeText(t); toast("Copiado!"); } catch (x) { prompt("Copie:", t); } });
