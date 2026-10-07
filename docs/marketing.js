/* Partiu 085 — Marketing: calendário de posts, ideias de stories e banco de frases.
   O calendário mistura posts da marca com posts gerados a partir dos dados reais do radar. */
"use strict";

const MK = { dados: null, sujo: false };
const DIAS_SEM = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const NOME_DIA = { dom: "Domingo", seg: "Segunda", ter: "Terça", qua: "Quarta", qui: "Quinta", sex: "Sexta", "sáb": "Sábado" };

function semanaInicio(d = new Date(Date.now() - 3 * 36e5)) {
  const x = new Date(d.toISOString().slice(0, 10) + "T12:00:00Z"); const dw = x.getUTCDay();
  x.setUTCDate(x.getUTCDate() - ((dw + 6) % 7)); return x.toISOString().slice(0, 10);
}
function maisDias(iso, n) { const x = new Date(iso + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
function diaSem(iso) { return DIAS_SEM[new Date(iso + "T12:00:00Z").getUTCDay()]; }

/* Semana 1 — o calendário que o Leo montou */
function semana1(inicio) {
  const P = (n, tpl, tema, titulo, txt, legenda) => ({ id: "s1-" + n, data: maisDias(inicio, n), tpl, tema, titulo, txt, legenda, feito: false });
  return [
    P(0, "beneficios", "azul", "Apresentação da marca", { titulo: "ALERTAS, MILHAS E PROMOÇÕES", destaque: "saindo de Fortaleza", lista: BENEFICIOS.join("\n") },
      "Viajar não precisa ser caro — você só precisa saber o momento certo de agir.\nAqui, a gente mostra promoções reais, alertas de passagens e oportunidades com milhas saindo de Fortaleza.\n💡 Viaje mais, pagando menos.\n\nSegue o perfil e ativa os alertas! ✈️\n\n#partiu085 #passagensbaratas #fortaleza"),
    P(2, "frase", "amarelo", "Identidade da marca", { titulo: "Viajar bem é questão de oportunidade", destaque: "e a gente te avisa quando ela aparece.", rodape: "Partiu 085 — o radar das promoções do Ceará" },
      "A gente acredita que viajar bem é questão de oportunidade — e o segredo é estar no radar certo.\nCriado por cearenses apaixonados por viagens, o Partiu 085 nasceu pra te conectar às melhores promoções.\n🔔 Dicas, alertas e milhas certeiras, sem enrolação.\n\nAtiva as notificações e não perde o próximo alerta!\n\n#partiu085 #viagem #ceara"),
    P(4, "beneficios", "azul", "Valores e benefícios", { titulo: "CONHEÇA O MUNDO", destaque: "com economia", lista: BENEFICIOS.join("\n") },
      "A gente encontra, você embarca. 🌍\nDo 085 pra onde você quiser, com alertas, milhas e passagens que cabem no bolso.\n✈️ Promoções nacionais e internacionais, sempre atualizadas.\n\nSegue o perfil e compartilha com quem também ama viajar!\n\n#partiu085 #viagem #fortaleza"),
    P(6, "dica", "azul", "Dica educativa leve", { titulo: "DICA RÁPIDA DE MILHAS", destaque: "Transfira pontos só quando tiver destino certo.", texto: "Evite perder bônus e aproveite as transferências no momento certo." },
      "Evite perder bônus e aproveite as transferências no momento certo.\nPlanejamento é o segredo pra multiplicar suas milhas e viajar mais!\n\nSalva o post pra lembrar depois! 📌\n\n#partiu085 #milhas #dicasdeviagem"),
    P(8, "pergunta", "creme", "Engajamento", { titulo: "Se você pudesse embarcar agora… pra onde iria?", destaque: "Comenta aqui embaixo!" },
      "A gente quer saber: qual seria o destino dos seus sonhos? 🌎\nComenta aqui e marca aquele parceiro de viagem que iria junto contigo!\n\nComenta aí ⬇️ e bora sonhar com o próximo embarque!\n\n#partiu085 #viagem"),
    P(10, "frase", "amarelo", "Institucional de fechamento", { titulo: "Do 085 pro mundo", destaque: "o seu ponto de partida pra economizar e embarcar.", rodape: "Cearenses que amam viajar" },
      "Cearenses que amam viajar, milhas que viram experiências e alertas que fazem diferença.\nEsse é o Partiu 085 — o seu ponto de partida pra economizar e embarcar.\n\nSegue o perfil e ativa o sininho pra não perder os próximos alertas! 🔔\n\n#partiu085 #fortaleza"),
  ];
}
/* Semana automática: mistura dados do radar + marca, alternando azul e amarelo */
function semanaAuto(inicio) {
  const r = n => Math.floor(Math.random() * n);
  const top = topSemana(), dest = (typeof destinosStatus === "function" ? destinosStatus() : []).sort((a, b) => b.d - a.d);
  const dica = DICAS[r(DICAS.length)], slog = SLOGANS[r(SLOGANS.length)].split(" — ");
  const plano = [
    [0, top.length ? "carrossel" : "frase", "azul", "Top promoções da semana", {}],
    [1, "pergunta", "creme", "Engajamento", { titulo: PERGUNTAS[r(PERGUNTAS.length)], destaque: "Comenta aqui embaixo!" }],
    [2, "frase", "amarelo", "Frase da marca", { titulo: slog[0], destaque: slog[1] || "", rodape: ASSINATURAS[r(ASSINATURAS.length)] }],
    [3, dest.length ? "destino" : "beneficios", "azul", "Destino em destaque", { titulo: "CONHEÇA O MUNDO", destaque: "com economia", lista: BENEFICIOS.join("\n") }, dest[0] && dest[0].k],
    [4, top.length ? "promo" : "beneficios", "amarelo", "Promoção da semana", { titulo: "CONHEÇA O MUNDO", destaque: "com economia", lista: BENEFICIOS.join("\n") }],
    [5, "dica", "azul", "Dica de milhas", { titulo: "DICA RÁPIDA DE MILHAS", destaque: dica[0], texto: dica[1] }],
    [6, "beneficios", "amarelo", "Institucional", { titulo: "ALERTAS DE PASSAGENS", destaque: "saindo do 085", lista: BENEFICIOS.join("\n") }],
  ];
  return plano.map(([n, tpl, tema, titulo, txt, k]) => ({ id: `a-${inicio}-${n}`, data: maisDias(inicio, n), tpl, tema, titulo, txt, dest: k || "", alerta: tpl === "promo" && top[0] ? top[0].id : "", legenda: "", feito: false }));
}
async function carregarMK() {
  if (MK.dados) return;
  MK.dados = await getJSON("marketing.json", null);
  if (!MK.dados) { const ini = semanaInicio(); MK.dados = { posts: semana1(ini) }; MK.sujo = true; }
}
function legendaPost(p) {
  if (p.legenda) return p.legenda;
  const bak = { tpl: CR.tpl, txt: CR.txt, id: CR.id, dest: CR.dest };
  CR.tpl = p.tpl; CR.txt = { ...(p.txt || {}) }; if (p.alerta) CR.id = p.alerta; if (p.dest) CR.dest = p.dest;
  const l = legendaCR(S.alertas.find(a => a.id === CR.id)); Object.assign(CR, bak); return l;
}
function storiesHoje() {
  const nao = S.alertas.filter(a => !enviado(a)).slice(0, 1)[0] || S.alertas[0];
  const d = (typeof destinosStatus === "function" ? destinosStatus() : []).sort((a, b) => a.menor - b.menor);
  const e1 = d[0], e2 = d.find(x => x.tipo !== (e1 || {}).tipo) || d[1];
  return [
    ["Print de alerta real", nao ? `Poste o alerta de ${nao.destino_nome} (${brl(nao.preco)}). Gere o stories pronto em Criativos.` : "Quando sair o próximo alerta, poste o print.", nao ? `#criativos?id=${encodeURIComponent(nao.id)}` : "#alertas"],
    ["Enquete", e1 && e2 ? `"Qual você escolheria?" — ${e1.nome} desde ${brl(e1.menor)} ou ${e2.nome} desde ${brl(e2.menor)} (preços reais do radar).` : "Enquete: praia ou neve?", ""],
    ["Caixinha de perguntas", "“Pra onde você quer que o radar procure passagem barata?” — as respostas viram rotas novas.", "#rotas"],
    ["Bastidores", "Grave a tela do painel com o aviãozinho varrendo: mostra que o radar é de verdade.", "#destinos"],
  ];
}
function pMarketing() {
  if (!MK.dados) { carregarMK().then(render); return head("Calendário de posts", "Carregando…"); }
  const posts = MK.dados.posts.slice().sort((a, b) => a.data.localeCompare(b.data));
  const hoje = hojeISO(), feitos = posts.filter(p => p.feito).length;
  const prox = posts.filter(p => p.data >= hoje && !p.feito);
  return head("Calendário de posts", "O que postar em cada dia, ideias de stories e banco de frases do Partiu 085",
    `${MK.sujo ? `<button class="bt pri" data-act="mksalvar">${ic("save")}Salvar calendário</button>` : ""}<button class="bt" data-act="mknova">${ic("zap")}Gerar próxima semana</button>`) +
    `<div class="grid kpis">
      ${kpi("Posts no calendário", posts.length, `${feitos} já postados`, true, "calendar")}
      ${kpi("Próximo post", prox[0] ? NOME_DIA[diaSem(prox[0].data)] : "–", prox[0] ? esc(prox[0].titulo) : "Gere a próxima semana", false, "image")}
      ${kpi("Promoções desta semana", topSemana().length, "viram carrossel e stories", false, "bell")}
    </div>
    <div class="card ideia-card" style="margin-bottom:var(--space-4)"><div class="card-h"><div><h3>${ic("zap")} Tem uma ideia, um print ou um texto?</h3>
      <div class="desc">Cola aqui que eu monto o banner na identidade do 085 — stories, feed ou quadrado.</div></div></div>
      <textarea id="mk-ideia" placeholder="Ex.: Gente, Recife a partir de R$ 379! Corre que acaba." style="width:100%;min-height:90px"></textarea>
      <div class="al-acts" style="margin-top:var(--space-3)"><button class="bt pri" data-act="mkideia">${ic("image")}Transformar em banner</button><span class="sub">Na próxima tela você pode anexar um print ou foto.</span></div></div>
    <div class="grid two">
      <div class="card"><div class="card-h"><div><h3>Calendário</h3><div class="desc">Padrão azul → amarelo. Clique em “Criar arte” e a arte abre pronta.</div></div></div>
        <div class="mk-lista">${posts.map(p => `<article class="mk-post ${p.feito ? "feito" : ""} ${p.data === hoje ? "hoje" : ""}">
          <div class="mk-data"><b>${dm(p.data)}</b><span>${NOME_DIA[diaSem(p.data)]}</span><i class="mk-cor ${p.tema}"></i></div>
          <div class="mk-c"><span class="micro">${esc((TPLS.find(t => t[0] === p.tpl) || [])[1] || p.tpl)}</span><b>${esc(p.titulo)}</b>
            ${p.txt && (p.txt.titulo || p.txt.destaque) ? `<span class="sub">${esc([p.txt.titulo, p.txt.destaque].filter(Boolean).join(" — "))}</span>` : ""}
            <details><summary>Legenda</summary><div class="texto">${esc(legendaPost(p))}</div></details>
            <div class="al-acts"><button class="bt sm pri" data-act="mkarte" data-id="${p.id}">${ic("image")}Criar arte</button>
              <button class="bt sm" data-act="mkleg" data-id="${p.id}">${ic("copy")}Copiar legenda</button>
              <button class="bt sm ${p.feito ? "ok" : "ghost"}" data-act="mkfeito" data-id="${p.id}">${ic(p.feito ? "check" : "circle")}${p.feito ? "Postado" : "Marcar postado"}</button>
              <button class="bt sm ghost danger" data-act="mktirar" data-id="${p.id}" aria-label="Remover">${ic("x")}</button></div>
          </div></article>`).join("")}</div>
      </div>
      <div>
        <div class="card" style="margin-bottom:var(--space-4)"><h3>Stories de hoje</h3><div class="desc">Sugestões com dados reais do radar</div>
          <div class="rows">${storiesHoje().map(([t, d, h]) => `<div class="row"><span class="av">${ic("image", "i sm")}</span><span class="t"><b>${t}</b><span class="sub" style="display:block;white-space:normal">${esc(d)}</span></span>${h ? `<a class="bt sm" href="${h}">Abrir</a>` : `<button class="bt sm" data-act="copiartxt" data-t="${esc(d)}">Copiar</button>`}</div>`).join("")}</div></div>
        <div class="card"><h3>Banco de frases</h3><div class="desc">Toque para copiar</div>
          <div class="mk-frases">${SLOGANS.concat(ASSINATURAS).map(s => `<button class="mk-frase" data-act="copiartxt" data-t="${esc(s)}">${esc(s)}</button>`).join("")}</div></div>
      </div>
    </div>`;
}
async function salvarMK() {
  try { await salvarArquivo("docs/marketing.json", MK.dados, "Painel: atualiza calendário de marketing"); MK.sujo = false; toast("Calendário salvo."); render(); }
  catch (e) { toast("Não salvou: " + e.message, 5000); }
}
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b || !b.dataset.act.startsWith("mk")) return;
  const act = b.dataset.act, P = id => MK.dados.posts.find(p => p.id === id);
  if (act === "mkideia") { CR.tpl = "livre"; CR.txt = { ideia: ($("#mk-ideia") || {}).value || "" }; location.hash = "#criativos"; return; }
  if (act === "mkarte") {
    const p = P(b.dataset.id);
    CR.tpl = p.tpl; CR.tema = p.tema; CR.txt = { ...(p.txt || {}) }; CR.fmt = "feed";
    if (p.alerta) CR.id = p.alerta; if (p.dest) CR.dest = p.dest;
    location.hash = "#criativos";
  } else if (act === "mkleg") { await copiar(legendaPost(P(b.dataset.id))); toast("Legenda copiada."); }
  else if (act === "mkfeito") { const p = P(b.dataset.id); p.feito = !p.feito; MK.sujo = true; render(); if (token()) salvarMK(); }
  else if (act === "mktirar") { if (confirm("Remover este post do calendário?")) { MK.dados.posts = MK.dados.posts.filter(p => p.id !== b.dataset.id); MK.sujo = true; render(); } }
  else if (act === "mknova") {
    const ult = MK.dados.posts.map(p => p.data).sort().pop() || hojeISO();
    const ini = semanaInicio(new Date(maisDias(ult, 1) + "T12:00:00Z"));
    const inicio = ini <= ult ? maisDias(ini, 7) : ini;
    MK.dados.posts.push(...semanaAuto(inicio)); MK.sujo = true; render(); toast("Semana gerada com os dados do radar. Salve para guardar.");
  } else if (act === "mksalvar") { b.disabled = true; await salvarMK(); }
});
