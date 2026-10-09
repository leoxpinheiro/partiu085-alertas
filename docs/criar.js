/* Partiu 085 — ✨ Criar post com IA.
   Manda print(s) de outro post/carrossel, um texto ou uma notícia → a IA (Gemini) entende e reescreve
   com a nossa voz → o painel desenha o carrossel com a identidade do Partiu 085 → baixar ou agendar.
   A chave do Gemini fica só neste aparelho (localStorage). */
"use strict";
const IA = { imgs: [], texto: "", fonte: "", objetivo: "copiar", res: null, ideias: null, carregando: "", erro: "", ajuste: "" };
const IA_KEY = "p085_gemini", IA_MOD = "p085_gemini_modelo";
const IA_MODELOS = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.0-flash"];
const crChave = () => { try { return localStorage.getItem(IA_KEY) || ""; } catch (e) { return ""; } };
const crObjetivos = [["copiar", "🔁 Copiar no nosso estilo"], ["noticia", "📰 Explicar notícia"], ["lista", "📋 Lista de destinos/dicas"], ["guia", "🎓 Guia que ensina"], ["polemica", "💬 Gerar comentários"]];

/* ---------- contexto do radar (pra IA usar dados reais) */
function crContexto() {
  const L = [];
  try { const t = top5(); if (t.length) L.push("Top destinos baratos hoje saindo de Fortaleza (dados reais do radar): " + t.map(x => `${x.nome}: ${brl(x.menor)} o trecho, ida e volta ${brl(x.rt)} (${Math.round(x.d * 100)}% abaixo do normal)`).join("; ")); } catch (e) { }
  try { const p = promosMilhas().slice(0, 4); if (p.length) L.push("Promoções de milhas ativas: " + p.map(o => `${o.programa || o.titulo || ""} ${o.tipo}${o.pct ? " " + o.pct + "%" : ""}`).join("; ")); } catch (e) { }
  try { const n = (PA.noticias || []).slice(0, 5); if (n.length) L.push("Notícias recentes: " + n.map(x => x.titulo).join(" | ")); } catch (e) { }
  return L.join("\n");
}
const IA_FOTOS = "AJU AMS BCN BEL BHZ BOG BPS BSB BUE CGB CGR CTG CUN CWB FEN FLN FRA GYN IGU JDO JPA LIM LIS LON MAD MAO MCZ MDE MIA MIL MVD NAT NVT NYC OPO ORL PAR POA PTY PUJ REC RIO ROM SAO SCL SDQ SID SLZ SSA UDI VCP VIX".split(" ");

const IA_MARCA = `Você é o social media do @partiu.085, perfil de Fortaleza-CE (52 mil seguidores) que caça passagem aérea barata saindo de Fortaleza (FOR) e promoções de milhas. O perfil leva as pessoas pro grupo GRÁTIS de alertas (link na bio).
Voz: simples, próxima, animada, com um toque cearense na medida (sem forçar gíria). Frases curtas. Fala com "você". Nada de linguagem de banco.
Regras:
- Escreva tudo em português do Brasil.
- Nunca copie frases inteiras de outro perfil: reescreva com as nossas palavras e, se fizer sentido, puxe pro lado de Fortaleza.
- Não invente preços, datas, regras ou números. Use só o que está no material ou nos dados do radar. Se não tiver o número, fale de forma geral.
- Se o material for de outro perfil/site/notícia, preencha "fonte" com o nome (ex.: @perfil, G1, Aeroporto de Fortaleza).
- Carrossel de 4 a 8 telas internas (sem contar capa e final). Títulos curtos (até 45 caracteres). Texto de cada tela até 200 caracteres.
- A capa tem que dar vontade de arrastar: curiosidade, número ou benefício claro. Ex.: "5 destinos pra ir gastando pouco saindo de Fortaleza".
- Tipos de tela: "texto" (título + explicação), "lista" (até 6 itens com nome, detalhe curto e valor opcional), "destaque" (um número/valor grande + título + texto).
- "pergunta" é a chamada pra comentar (ex.: "Qual desses você iria? Comenta o número!").
- "legenda": gancho forte na 1ª linha, resumo em tópicos com emoji, convite pra salvar/compartilhar. NÃO coloque hashtags nem link do grupo (o sistema adiciona).
- "iata_foto": se o post for sobre um destino que está nesta lista, use o código pra foto da capa: ${IA_FOTOS.join(", ")}. Senão, deixe vazio.
- "dicas": 2 ou 3 dicas curtas de como postar pra engajar (horário, ideia de story, o que responder nos comentários).`;

const S_ITEM = { type: "OBJECT", properties: { nome: { type: "STRING" }, detalhe: { type: "STRING" }, valor: { type: "STRING" } }, required: ["nome"] };
const S_POST = { type: "OBJECT", properties: {
  tema: { type: "STRING" },
  capa: { type: "OBJECT", properties: { kicker: { type: "STRING" }, titulo: { type: "STRING" }, sub: { type: "STRING" }, iata_foto: { type: "STRING" } }, required: ["kicker", "titulo", "sub"] },
  slides: { type: "ARRAY", items: { type: "OBJECT", properties: { tipo: { type: "STRING", enum: ["texto", "lista", "destaque"] }, titulo: { type: "STRING" }, texto: { type: "STRING" }, numero: { type: "STRING" }, itens: { type: "ARRAY", items: S_ITEM } }, required: ["tipo", "titulo"] } },
  pergunta: { type: "STRING" }, legenda: { type: "STRING" }, fonte: { type: "STRING" }, dicas: { type: "ARRAY", items: { type: "STRING" } } },
  required: ["tema", "capa", "slides", "pergunta", "legenda"] };
const S_IDEIAS = { type: "OBJECT", properties: { ideias: { type: "ARRAY", items: { type: "OBJECT", properties: { titulo: { type: "STRING" }, porque: { type: "STRING" }, briefing: { type: "STRING" } }, required: ["titulo", "porque", "briefing"] } } }, required: ["ideias"] };

/* ---------- chamada ao Gemini */
async function gemini(partes, schema) {
  const key = crChave(); if (!key) throw new Error("Cole a chave do Gemini primeiro.");
  let mods = IA_MODELOS.slice(); try { const m = localStorage.getItem(IA_MOD); if (m) mods = [m, ...mods.filter(x => x !== m)]; } catch (e) { }
  let ult = null;
  for (const m of mods) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: IA_MARCA }] }, contents: [{ role: "user", parts: partes }], generationConfig: { temperature: .9, responseMimeType: "application/json", responseSchema: schema } }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { try { localStorage.setItem(IA_MOD, m); } catch (e) { }
      const t = ((((j.candidates || [])[0] || {}).content || {}).parts || []).map(p => p.text || "").join("");
      if (!t) throw new Error("A IA não respondeu (pode ter bloqueado o conteúdo). Tente outro print ou texto.");
      return JSON.parse(t); }
    const msg = (j.error && j.error.message) || r.status;
    if (r.status === 404 || /not found|not supported/i.test(msg)) { ult = msg; continue; }
    if (r.status === 400 && /api key/i.test(msg)) throw new Error("Chave do Gemini inválida. Confira e cole de novo.");
    if (r.status === 403) throw new Error("Chave do Gemini sem permissão. Gere uma nova no Google AI Studio.");
    if (r.status === 429) throw new Error("Limite grátis do Gemini atingido por agora. Espera 1 minuto e tenta de novo.");
    throw new Error(msg);
  }
  throw new Error("Nenhum modelo do Gemini disponível: " + ult);
}
async function crGerar(extra) {
  if (!IA.imgs.length && !IA.texto.trim() && !extra) { toast("Cole um print ou escreva o assunto."); return; }
  IA.carregando = "Lendo e criando o carrossel…"; IA.erro = ""; render();
  const obj = { copiar: "Recrie esse post/carrossel no estilo do Partiu 085 (mesma ideia, nossas palavras, nosso visual).", noticia: "Transforme essa notícia num carrossel que explica o que muda pra quem viaja saindo de Fortaleza.", lista: "Faça um carrossel em formato de lista (destinos, dicas ou promoções).", guia: "Faça um carrossel que ensina, passo a passo, pra ser salvo.", polemica: "Faça um carrossel que gere muitos comentários (pergunta, comparação ou 'você prefere').", ideia: "" }[IA.objetivo] || "";
  const partes = [{ text: [`Objetivo: ${obj}`, extra ? `Pedido: ${extra}` : "", IA.texto.trim() ? `Material (texto/legenda/link):\n${IA.texto.trim()}` : "", IA.fonte ? `Fonte informada: ${IA.fonte}` : "", IA.imgs.length ? `Segue(m) ${IA.imgs.length} print(s) do post de referência, na ordem.` : "", `Dados do radar de hoje (${hojeISO()}):\n${crContexto() || "sem dados"}`].filter(Boolean).join("\n\n") }];
  IA.imgs.forEach(im => partes.push({ inline_data: { mime_type: "image/jpeg", data: im.b64 } }));
  try { IA.res = await gemini(partes, S_POST); IA.res.slides = (IA.res.slides || []).slice(0, 8); IA.ajuste = ""; }
  catch (e) { IA.erro = e.message; }
  IA.carregando = ""; render();
}
async function crAjustar() {
  const p = IA.ajuste.trim(); if (!p || !IA.res) return;
  IA.carregando = "Ajustando…"; IA.erro = ""; render();
  try { IA.res = await gemini([{ text: `Este é o carrossel atual em JSON:\n${JSON.stringify(IA.res)}\n\nAjuste assim: ${p}\nDevolva o carrossel completo no mesmo formato.` }], S_POST); IA.res.slides = (IA.res.slides || []).slice(0, 8); IA.ajuste = ""; }
  catch (e) { IA.erro = e.message; }
  IA.carregando = ""; render();
}
async function crIdeias() {
  IA.carregando = "Pensando em ideias…"; IA.erro = ""; render();
  const dia = new Date(Date.now() - 3 * 36e5).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  try { const r = await gemini([{ text: `Hoje é ${dia}. Sugira 6 ideias de carrossel pro feed do @partiu.085 que gerem MUITO salvamento, compartilhamento e comentário, e tragam gente pro grupo grátis. Misture: dados reais do radar, milhas, dicas de aeroporto/viagem, feriados e datas próximas, curiosidades e comparações ("você prefere"). Para cada uma: título da capa, por que engaja (1 frase) e um briefing completo pra criar o carrossel.\n\nDados do radar:\n${crContexto() || "sem dados"}` }], S_IDEIAS);
    IA.ideias = r.ideias || []; }
  catch (e) { IA.erro = e.message; }
  IA.carregando = ""; render();
}

/* ---------- imagens recebidas (print) → JPEG reduzido */
function crAddArquivo(f) {
  if (!f || !/^image\//.test(f.type)) return;
  if (IA.imgs.length >= 10) { toast("Máximo de 10 prints."); return; }
  const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => {
    const s = Math.min(1, 1600 / Math.max(im.width, im.height)), cv = document.createElement("canvas"); cv.width = Math.round(im.width * s); cv.height = Math.round(im.height * s);
    cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height); const url = cv.toDataURL("image/jpeg", .85);
    IA.imgs.push({ url, b64: url.split(",")[1] }); crThumbs(); }; im.src = r.result; }; r.readAsDataURL(f);
}
function crThumbs() { const b = document.getElementById("cr-thumbs"); if (!b) return;
  b.innerHTML = IA.imgs.map((x, i) => `<div class="cr-th"><img src="${x.url}" alt="print ${i + 1}"><button data-act="crtira" data-i="${i}" aria-label="tirar">✕</button></div>`).join("");
  const z = document.getElementById("cr-drop"); if (z) z.classList.toggle("tem", IA.imgs.length > 0); }

/* ---------- desenho do carrossel (1080×1350, identidade Partiu 085) */
function crTelas(R) {
  const n = R.slides.length + 2, telas = [];
  const fonte = (R.fonte || IA.fonte || "").trim();
  telas.push(async c => {
    const iata = (R.capa.iata_foto || "").toUpperCase(); const im = IA_FOTOS.includes(iata) ? await fotoPronta(iata) : null;
    if (im) bgFoto(c, PW, PH, im, .5); else bgNavy(c, PW, PH);
    marca(c, PW, true, `1/${n}`);
    const y0 = im ? PH * .5 - 40 : 380;
    kicker(c, R.capa.kicker || "Partiu 085", M, y0);
    const y = titulo(c, R.capa.titulo || "", M, y0 + 26, PW - 2 * M - (im ? 0 : 120), 128, 72, "#fff", 4);
    c.fillStyle = COR.am; c.fillRect(M, y + 26, 140, 12);
    paragrafo(c, R.capa.sub || "", M, y + 100, PW - 2 * M - (im ? 0 : 220), 36, MARCA.corpo, im ? "rgba(255,255,255,.85)" : COR.cinza, 600, 1.3, 3);
    if (!im) desenhaImg(c, "mascote", PW - M - 120, PH - 450, 230);
    if (fonte) T(c, `Fonte: ${fonte}`, PW - M, PH - 100, 22, MARCA.corpo, COR.cinza, "right", 600);
    T(c, "ARRASTA ➜", M, PH - 100, 26, MARCA.corpo, COR.am, "left", 800, 3);
  });
  R.slides.forEach((s, i) => {
    const pos = `${i + 2}/${n}`;
    if (s.tipo === "lista" && (s.itens || []).length) telas.push(c => { bgNavy(c, PW, PH); marca(c, PW, true, pos);
      const it = s.itens.slice(0, 6);
      let y = titulo(c, s.titulo, M, 200, PW - 2 * M, 96, 60, "#fff", 2) + 20;
      if (s.texto) y = paragrafo(c, s.texto, M, y + 30, PW - 2 * M, 28, MARCA.corpo, COR.cinza, 600, 1.3, 2) - 10;
      const h = Math.max(120, Math.min(175, Math.floor((PH - 190 - y) / it.length)));
      it.forEach((x, k) => linhaLista(c, PW, y + k * h, String(k + 1).padStart(2, "0"), curto(x.nome, 26), curto(x.detalhe || "", 46), curto(x.valor || "", 12), "", true, h));
      rodapeP(c, PW, PH, true, "Salva pra consultar depois"); });
    else if (s.tipo === "destaque" && s.numero) telas.push(c => { bgNavy(c, PW, PH); marca(c, PW, true, pos);
      const num = String(s.numero).slice(0, 14); T(c, num, M - 6, 560, caber(c, num, PW - 2 * M, 260, MARCA.titulo, 400, 110), MARCA.titulo, COR.am);
      const y = titulo(c, s.titulo, M, 620, PW - 2 * M, 96, 60, "#fff", 2);
      paragrafo(c, s.texto || "", M, y + 60, PW - 2 * M, 40, MARCA.corpo, "rgba(255,255,255,.85)", 600, 1.4, 6);
      rodapeP(c, PW, PH, true, "Salva pra consultar depois"); });
    else telas.push(c => { bgCreme(c, PW, PH); marca(c, PW, false, pos);
      T(c, String(i + 1).padStart(2, "0"), M - 6, 560, 220, MARCA.titulo, COR.am);
      const y = titulo(c, s.titulo, M, 610, PW - 2 * M, 96, 60, COR.tinta, 2);
      let t = s.texto || ""; if (!t && (s.itens || []).length) t = s.itens.map(x => `• ${x.nome}${x.detalhe ? ": " + x.detalhe : ""}`).join("  ");
      paragrafo(c, t, M, y + 60, PW - 2 * M, 42, MARCA.corpo, COR.tinta, 600, 1.42, 8);
      rodapeP(c, PW, PH, false, "Salva pra consultar depois"); });
  });
  telas.push(c => { bgNavy(c, PW, PH); marca(c, PW, true, `${n}/${n}`);
    kicker(c, "Gostou? Salva e compartilha", M, 400);
    let y = titulo(c, R.pergunta || "Qual você escolheria? Comenta aqui!", M, 426, PW - 2 * M, 112, 68, "#fff", 4) + 70;
    ["Passagem barata saindo de Fortaleza", "Promoções de milhas", "Tudo de graça, no grupo"].forEach(it => { bola(c, M + 20, y - 12); T(c, it, M + 60, y, 34, MARCA.corpo, "#fff", "left", 700); y += 66; });
    desenhaImg(c, "mascote", PW - M - 120, PH - 450, 230);
    rodapeP(c, PW, PH, true, "Grupo grátis: link na bio"); });
  return telas;
}
async function crDesenhar() {
  const box = document.getElementById("cr-telas"); if (!box || !IA.res) return;
  try { await Promise.all([`400 80px ${MARCA.titulo}`, `800 30px ${MARCA.corpo}`, `600 30px ${MARCA.corpo}`, `700 30px ${MARCA.corpo}`].map(x => document.fonts.load(x))); } catch (e) { }
  const telas = crTelas(IA.res), cvs = [];
  for (const fn of telas) { const cv = document.createElement("canvas"); cv.width = PW; cv.height = PH; try { await fn(cv.getContext("2d")); } catch (e) { console.error(e); } cvs.push(cv); }
  box.innerHTML = ""; cvs.forEach(cv => box.appendChild(cv));
}
function crLegenda() { const R = IA.res; if (!R) return ""; const f = (R.fonte || IA.fonte || "").trim();
  return legenda(`${R.legenda.trim()}${f && !R.legenda.includes(f) ? `\n\nFonte: ${f}` : ""}\n\n💬 ${R.pergunta}`); }

/* ---------- página */
function crEditor() {
  const R = IA.res;
  const campo = (rot, k, v, area) => `<label class="cr-f"><span>${rot}</span>${area ? `<textarea rows="3" data-crf="${k}">${esc(v || "")}</textarea>` : `<input data-crf="${k}" value="${esc(v || "")}">`}</label>`;
  return `<details class="cr-ed"><summary>✏️ Editar textos das telas</summary>
    <div class="cr-edg"><div class="cr-eb"><b>Capa</b>${campo("Etiqueta", "capa.kicker", R.capa.kicker)}${campo("Título", "capa.titulo", R.capa.titulo)}${campo("Subtítulo", "capa.sub", R.capa.sub, 1)}</div>
    ${R.slides.map((s, i) => `<div class="cr-eb"><b>Tela ${i + 2} · ${s.tipo}</b>${s.tipo === "destaque" ? campo("Número grande", `slides.${i}.numero`, s.numero) : ""}${campo("Título", `slides.${i}.titulo`, s.titulo)}
      ${s.tipo === "lista" ? campo("Itens (1 por linha: nome | detalhe | valor)", `slides.${i}.itens`, (s.itens || []).map(x => [x.nome, x.detalhe || "", x.valor || ""].join(" | ")).join("\n"), 1) : campo("Texto", `slides.${i}.texto`, s.texto, 1)}</div>`).join("")}
    <div class="cr-eb"><b>Tela final</b>${campo("Pergunta pra comentar", "pergunta", R.pergunta)}${campo("Fonte (opcional)", "fonte", R.fonte)}</div></div></details>`;
}
function pCriar() {
  const key = crChave(), R = IA.res;
  setTimeout(() => { crThumbs(); crDesenhar(); }, 0);
  if (!key) return head("✨ Criar post com IA", "Manda um print (carrossel, post, notícia) ou só o assunto. A IA entende, reescreve com a nossa voz e o painel monta o carrossel com a cara do Partiu 085.") +
    `<div class="card cr-setup"><h3>Primeiro, ligar a IA (1 vez só, grátis)</h3><ol>
      <li>Abra o <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener"><b>Google AI Studio › API keys</b></a> (você já usa o AI Studio).</li>
      <li>Clique em <b>Create API key</b> (Criar chave) e copie.</li>
      <li>Cole aqui embaixo e salve. A chave fica guardada só neste aparelho. No celular, cole lá também.</li></ol>
      <div class="cr-k"><input type="password" id="cr-key" placeholder="Cole a chave do Gemini (começa com AIza…)" autocomplete="off"><button class="bt pri" data-act="crsalvakey">Salvar</button></div></div>`;
  return head("✨ Criar post com IA", "Cole o print ou o assunto, escolha o objetivo e clique em Criar. Depois é só ajustar, baixar ou agendar.", `<button class="bt" data-act="crideias">${ic("zap")}Me dá ideias</button>`) +
    `${IA.carregando ? `<div class="card cr-load"><span class="cr-spin"></span>${esc(IA.carregando)}</div>` : ""}
    ${IA.erro ? `<div class="aviso warn"><span>${esc(IA.erro)}</span></div>` : ""}
    ${IA.ideias ? `<div class="card"><div class="cr-h"><h3>💡 Ideias pra hoje</h3><button class="bt sm ghost" data-act="crideiasx">Fechar</button></div><div class="cr-ideias">${IA.ideias.map((x, i) => `<div class="cr-ideia"><b>${esc(x.titulo)}</b><small>${esc(x.porque)}</small><button class="bt sm pri" data-act="crusaideia" data-i="${i}">✨ Criar esse</button></div>`).join("")}</div></div>` : ""}
    <div class="card cr-in">
      <div class="cr-drop" id="cr-drop" tabindex="0"><input type="file" id="cr-file" accept="image/*" multiple hidden>
        <div class="cr-drop-t"><b>📸 Solte, cole (Cmd+V) ou <button class="lnk" data-act="crescolher">escolha os prints</button></b><small>Pode mandar todas as telas de um carrossel, na ordem (até 10).</small></div>
        <div class="cr-thumbs" id="cr-thumbs"></div></div>
      <textarea id="cr-txt" rows="3" placeholder="E/ou escreva o assunto, cole a legenda, o texto da notícia ou um link. Ex.: 'carrossel com 5 destinos nacionais baratos pra novembro'">${esc(IA.texto)}</textarea>
      <div class="cr-row">${pills("crobj", IA.objetivo, crObjetivos)}</div>
      <div class="cr-row"><input id="cr-fonte" placeholder="Fonte, se for de outro perfil/site (opcional)" value="${esc(IA.fonte)}"><button class="bt pri lg" data-act="crgerar" ${IA.carregando ? "disabled" : ""}>✨ Criar carrossel</button>${IA.imgs.length || IA.texto ? `<button class="bt ghost" data-act="crlimpar">Limpar</button>` : ""}</div>
    </div>
    ${R ? `<div class="card cr-out"><div class="cr-h"><div><span class="tag">Carrossel · ${R.slides.length + 2} telas</span><h3>${esc(R.tema || R.capa.titulo)}</h3></div>
        <div class="al-acts"><button class="bt pri" data-act="cragendar">${ic("calendar")}Agendar no Instagram</button><button class="bt" data-act="crbaixar">${ic("down")}Baixar</button><button class="bt" data-act="crcopleg">${ic("copy")}Copiar legenda</button><button class="bt ghost" data-act="crgerar">${ic("refresh")}Outra versão</button></div></div>
      <div class="pa-telas cr-telas" id="cr-telas"><div class="vazio">desenhando…</div></div>
      <div class="cr-row cr-aj"><input id="cr-ajuste" placeholder="Pedir ajuste: 'deixa mais curto', 'capa mais chamativa', 'troca a tela 3 por dica de bagagem'…" value="${esc(IA.ajuste)}"><button class="bt" data-act="crajustar">Ajustar</button></div>
      ${crEditor()}
      <details class="pa-legd" open><summary>Legenda</summary><textarea class="pa-leg" id="cr-leg" spellcheck="false">${esc(crLegenda())}</textarea></details>
      ${(R.dicas || []).length ? `<div class="pa-porque">🚀 <b>Pra engajar:</b> ${R.dicas.map(esc).join(" · ")}</div>` : ""}
    </div>` : ""}
    <details class="card cr-cfg"><summary>Configuração da IA</summary><p class="sub">Chave do Gemini salva neste aparelho. Modelo em uso: ${esc((() => { try { return localStorage.getItem(IA_MOD) || IA_MODELOS[0]; } catch (e) { return IA_MODELOS[0]; } })())}.</p><button class="bt sm ghost" data-act="crtirakey">Trocar chave</button></details>`;
}

/* ---------- eventos */
function crSet(path, v) { const ks = path.split("."); let o = IA.res; while (ks.length > 1) o = o[ks.shift()]; const k = ks[0];
  if (k === "itens") o.itens = v.split("\n").map(l => l.split("|").map(x => x.trim())).filter(a => a[0]).map(([nome, detalhe, valor]) => ({ nome, detalhe, valor })); else o[k] = v; }
let crT = null;
document.addEventListener("input", e => { const t = e.target;
  if (t.id === "cr-txt") IA.texto = t.value; else if (t.id === "cr-fonte") IA.fonte = t.value; else if (t.id === "cr-ajuste") IA.ajuste = t.value;
  else if (t.dataset && t.dataset.crf && IA.res) { crSet(t.dataset.crf, t.value); clearTimeout(crT); crT = setTimeout(() => { crDesenhar(); const l = $("#cr-leg"); if (l && /pergunta|fonte/.test(t.dataset.crf)) l.value = crLegenda(); }, 350); } });
document.addEventListener("change", e => { if (e.target.id === "cr-file") { [...e.target.files].forEach(crAddArquivo); e.target.value = ""; } });
document.addEventListener("paste", e => { if (!/#criar/.test(location.hash)) return; const fs = [...(e.clipboardData || {}).items || []].filter(x => x.kind === "file").map(x => x.getAsFile());
  if (fs.length) { e.preventDefault(); fs.forEach(crAddArquivo); toast(`${fs.length} print${fs.length > 1 ? "s" : ""} adicionado${fs.length > 1 ? "s" : ""}.`); } });
document.addEventListener("dragover", e => { if (e.target.closest && e.target.closest("#cr-drop")) { e.preventDefault(); e.target.closest("#cr-drop").classList.add("on"); } });
document.addEventListener("dragleave", e => { const z = e.target.closest && e.target.closest("#cr-drop"); if (z) z.classList.remove("on"); });
document.addEventListener("drop", e => { const z = e.target.closest && e.target.closest("#cr-drop"); if (!z) return; e.preventDefault(); z.classList.remove("on"); [...e.dataTransfer.files].forEach(crAddArquivo); });
document.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.id === "cr-ajuste") { e.preventDefault(); crAjustar(); } });
document.addEventListener("click", async e => {
  const pb = e.target.closest('[data-act="pill"][data-g="crobj"]'); if (pb) { IA.objetivo = pb.dataset.v; return; }
  const b = e.target.closest('[data-act^="cr"]');
  if (!b) { if (e.target.closest && e.target.closest("#cr-drop") && !e.target.closest(".cr-th")) $("#cr-file").click(); return; }
  const a = b.dataset.act;
  if (a === "crsalvakey") { const v = ($("#cr-key").value || "").trim(); if (v.length < 20) { toast("Essa chave parece incompleta."); return; } try { localStorage.setItem(IA_KEY, v); } catch (x) { } toast("IA ligada neste aparelho ✨"); render(); }
  else if (a === "crtirakey") { try { localStorage.removeItem(IA_KEY); } catch (x) { } render(); }
  else if (a === "crescolher") { e.preventDefault(); $("#cr-file").click(); }
  else if (a === "crtira") { IA.imgs.splice(+b.dataset.i, 1); crThumbs(); }
  else if (a === "crlimpar") { Object.assign(IA, { imgs: [], texto: "", fonte: "", res: null, erro: "" }); render(); }
  else if (a === "crgerar") crGerar();
  else if (a === "crajustar") crAjustar();
  else if (a === "crideias") crIdeias();
  else if (a === "crideiasx") { IA.ideias = null; render(); }
  else if (a === "crusaideia") { const x = IA.ideias[+b.dataset.i]; IA.texto = x.briefing; IA.imgs = []; IA.fonte = ""; IA.objetivo = "copiar"; IA.ideias = null; crGerar(`Crie o carrossel: ${x.titulo}`); }
  else if (a === "crbaixar") { [...document.querySelectorAll("#cr-telas canvas")].forEach((cv, j) => setTimeout(() => { const l = document.createElement("a"); l.download = `partiu085-carrossel-${j + 1}.png`; l.href = cv.toDataURL("image/png"); l.click(); }, j * 350)); }
  else if (a === "crcopleg") { await copiar(($("#cr-leg") || {}).value || crLegenda()); toast("Legenda copiada."); }
  else if (a === "cragendar") { const cvs = [...document.querySelectorAll("#cr-telas canvas")]; if (!cvs.length) return;
    abrirAgendar({ id: "cr-" + Date.now().toString(36), titulo: IA.res.capa.titulo, tipo: "feed", cvs, legenda: ($("#cr-leg") || {}).value || crLegenda() }); }
});
/* atalho vindo de outras telas (ex.: notícia → carrossel) */
function crAbrirCom(texto, fonte, objetivo) { Object.assign(IA, { imgs: [], texto, fonte: fonte || "", objetivo: objetivo || "noticia", res: null, erro: "" }); location.hash = "#criar"; if (crChave()) setTimeout(() => crGerar(), 50); }
