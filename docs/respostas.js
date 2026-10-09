/* Partiu 085 — respostas prontas pra comentários e directs (copiar e colar em 2 cliques). */
"use strict";
const RS = { k: "", mes: "" };
const RESP_FIXAS = [
  ["link", "🔗 Me manda o link", "Oi! Tá aqui o grupo GRÁTIS com as passagens baratas saindo de Fortaleza 👇\n{link}\n\nAtiva as notificações do grupo pra não perder, promoção boa some em horas ✈️"],
  ["gratis", "💸 É de graça mesmo?", "É sim, 100% grátis! 😄 A gente olha os preços o dia todo e manda no grupo quando aparece promoção de verdade saindo de Fortaleza. Entra aqui: {link}"],
  ["como", "🤖 Como funciona?", "O radar pesquisa os preços saindo de Fortaleza várias vezes por dia, compara com o preço normal de cada rota (ida e volta) e, quando tá barato de verdade, avisa no grupo com as melhores datas. Você só compra direto na companhia ou no site indicado 😉\nGrupo: {link}"],
  ["comprar", "🛒 Onde eu compro?", "A gente não vende passagem, só avisa 😉 No alerta vem o link pra pesquisa com as datas. Aí é só comprar direto no site da companhia ou da agência que aparecer. Corre que preço bom muda rápido!"],
  ["sumiu", "😢 O preço já subiu", "Poxa, essas promoções somem rápido mesmo 😕 Por isso o grupo é o melhor lugar: o aviso chega na hora. Ativa as notificações lá: {link}"],
  ["vip", "⭐ Tem VIP?", "Vai ter! Tamo preparando o VIP com alertas mais rápidos e promoções de milhas. Quem tá no grupo grátis fica sabendo primeiro: {link}"],
  ["milhas", "💳 Como junto milhas?", "O caminho mais barato: juntar pontos do cartão (Livelo, Esfera…) e transferir pro programa da companhia (Smiles, LATAM Pass, Azul) quando tiver bônus de 80%, 100%… A gente avisa essas promoções também! {link}"],
  ["valeu", "🙏 Agradecer comentário", "Valeu demais! 🙌 Salva o post e manda pra quem vai viajar com você ✈️"],
];
function respTexto(t) { return t.replace(/\{link\}/g, linkGrupo()); }
function respPreco() {
  const R = (S.status && S.status.rotas) || {}, v = R[RS.k]; if (!v) return "";
  const nome = v.nome || IATA[RS.k] || RS.k, c = S.cal[RS.k];
  let menor = v.menor, rt = v.menor && v.menor_volta ? v.menor + v.menor_volta : null, quando = v.dia_menor || "";
  if (RS.mes && c && c.ida) { const ida = c.ida.filter(d => d.dia.slice(0, 7) === RS.mes), vol = (c.volta || []).filter(d => d.dia.slice(0, 7) === RS.mes);
    if (!ida.length) return `Oi! Pra ${nome} em ${MESES[+RS.mes.slice(5, 7) - 1]} o radar ainda não tem preço. Assim que aparecer promoção, avisa no grupo grátis: ${linkGrupo()}`;
    const b = ida.slice().sort((a, x) => a.preco - x.preco)[0]; menor = b.preco; quando = b.dia; rt = vol.length ? menor + Math.min(...vol.map(d => d.preco)) : null; }
  const dt = quando ? ` (dia ${quando.slice(8, 10)}/${quando.slice(5, 7)})` : "";
  return `Oi! Hoje o menor preço que o radar viu pra ${nome} saindo de Fortaleza foi ${brl(menor)} o trecho${dt}${rt ? `, e ida e volta a partir de ${brl(rt)}` : ""} ✈️\n\nPreço muda a toda hora! No grupo grátis a gente avisa na hora que cai: ${linkGrupo()}`;
}
function pRespostas() {
  const R = (S.status && S.status.rotas) || {}, ks = Object.keys(R).filter(k => R[k].menor).sort((a, b) => (R[a].nome || a).localeCompare(R[b].nome || b, "pt-BR"));
  if (RS.k && !S.cal[RS.k]) carregarCal(RS.k).then(() => { if (/#respostas/.test(location.hash)) render(); });
  const meses = RS.k && S.cal[RS.k] && S.cal[RS.k].ida ? [...new Set(S.cal[RS.k].ida.map(d => d.dia.slice(0, 7)))].sort() : [];
  const caixa = (id, tit, txt) => `<div class="card rs-c"><b>${tit}</b><textarea id="rs-${id}" rows="5">${esc(txt)}</textarea><div class="al-acts"><button class="bt sm pri" data-act="rscopiar" data-id="${id}">${ic("copy")}Copiar</button></div></div>`;
  return head("Respostas prontas", "Pra responder comentário e direct em 2 cliques. O link do grupo já entra sozinho. Dá pra mexer no texto antes de copiar.") +
    `<div class="card rs-preco"><h3>✈️ "Quanto tá pra…?"</h3><div class="rs-f"><select data-rs="k"><option value="">Escolha o destino</option>${ks.map(k => `<option value="${k}" ${RS.k === k ? "selected" : ""}>${esc(R[k].nome || IATA[k] || k)}</option>`).join("")}</select>
      <select data-rs="mes" ${meses.length ? "" : "disabled"}><option value="">Qualquer mês</option>${meses.map(m => `<option value="${m}" ${RS.mes === m ? "selected" : ""}>${MESES[+m.slice(5, 7) - 1]} ${m.slice(0, 4)}</option>`).join("")}</select></div>
      ${RS.k ? `<textarea id="rs-preco" rows="5">${esc(respPreco())}</textarea><div class="al-acts"><button class="bt pri" data-act="rscopiar" data-id="preco">${ic("copy")}Copiar resposta</button></div>` : `<p class="sub">Escolha o destino (e o mês, se a pessoa perguntou) e a resposta sai com o preço de hoje.</p>`}</div>
    <div class="rs-grade">${RESP_FIXAS.map(([id, t, x]) => caixa(id, t, respTexto(x))).join("")}</div>`;
}
document.addEventListener("change", e => { const k = e.target.dataset && e.target.dataset.rs; if (!k) return; RS[k] = e.target.value; if (k === "k") RS.mes = ""; render(); });
document.addEventListener("click", async e => { const b = e.target.closest('[data-act="rscopiar"]'); if (!b) return; await copiar(($("#rs-" + b.dataset.id) || {}).value || ""); toast("Copiado. É só colar no comentário ou no direct."); });
