// 🤖 Abastece a agenda sozinho (piloto automático): completa até 4 posts por dia, hoje e amanhã,
// com os carrosséis de conteúdo (docs/conteudo.js) e os vídeos de dica (docs/videos_prontos.json) que ainda não foram usados.
// Só roda o que estiver ligado em docs/ig_auto.json (auto_conteudo / auto_videos). Os posts entram aprovados e marcados "sai sozinho";
// o instagram.py avisa o Leo no Telegram 2h antes. uso: node engine/abastecer/abastecer.js [--teste]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), http = require('http');
const DOCS = path.join(__dirname, '../../docs'), TESTE = process.argv.includes('--teste');
const ler = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(DOCS, f), 'utf8')); } catch (e) { return d; } };
const HS = ['09:30', '13:00', '16:30', '21:00'], POR_DIA = 4;
const agoraFor = () => new Date(Date.now() - 3 * 3600e3); // relógio de Fortaleza (UTC-3) lido como UTC
const iso = d => d.toISOString().slice(0, 16) + '-03:00';
(async () => {
  const auto = { auto_conteudo: false, auto_videos: false, pausado: false, horarios_oferta: ['19:00'], auto_oferta: true, ...ler('ig_auto.json', {}) };
  if (auto.pausado || (!auto.auto_conteudo && !auto.auto_videos)) { console.log('piloto automático de conteúdo desligado'); return; }
  const fila = ler('ig_fila.json', []), st = ler('ig_status.json', {}), vp = ler('videos_prontos.json', []);
  const usados = new Set(fila.map(x => x.origem).filter(Boolean));
  const ocupado = q => { const t = Date.parse(q); if (fila.some(x => x.tipo !== 'story' && x.quando && st[x.id]?.status !== 'erro' && Math.abs(Date.parse(x.quando) - t) < 45 * 60e3)) return true;
    return auto.auto_oferta && (auto.horarios_oferta || []).some(h => Math.abs(Date.parse(q.slice(0, 11) + h + ':00-03:00') - t) < 45 * 60e3); };
  const agora = agoraFor(), vagas = [];
  for (let d = 0; d < 2; d++) { const dia = new Date(agora.getTime() + d * 864e5).toISOString().slice(0, 10);
    const noDia = fila.filter(x => x.tipo !== 'story' && (x.quando || '').startsWith(dia)).length + (auto.auto_oferta ? (auto.horarios_oferta || []).length : 0);
    let livres = Math.max(0, POR_DIA - noDia);
    for (const h of HS) { const q = `${dia}T${h}-03:00`; if (!livres) break; if (Date.parse(q) < Date.now() + 2.5 * 3600e3 || ocupado(q)) continue; vagas.push(q); livres--; } }
  if (!vagas.length) { console.log('agenda já está cheia'); return; }
  // abre o painel sem token, só pra desenhar os carrosséis com o mesmo código dele
  const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
  const srv = http.createServer((q, r) => { let n = decodeURIComponent(q.url.split('?')[0]); if (n === '/') n = '/index.html'; const f = path.join(DOCS, n);
    if (!f.startsWith(DOCS) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {}); const pg = await b.newPage({ viewport: { width: 1200, height: 900 } });
  pg.on('pageerror', e => console.log('erro na página:', e.message));
  await pg.goto(`http://localhost:${srv.address().port}/`, { waitUntil: 'networkidle' }); await pg.waitForFunction(() => typeof postsConteudo === 'function' && typeof CONTEUDO !== 'undefined', null, { timeout: 60000 });
  await pg.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.fonts].map(f => f.load().catch(() => null))); await document.fonts.ready; });
  console.log('fontes:', await pg.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).filter((v, i, a) => a.indexOf(v) === i).join(', ')));
  const conteudos = (await pg.evaluate(() => postsConteudo().map(p => ({ id: p.id, titulo: p.titulo, valido: p.valido || '', data: p.data || '', semFoto: /CAPA SEM FOTO/.test(p.porque || ''), n: p.telas.length })))).filter(p => !usados.has(p.id) && !p.semFoto);
  const videos = vp.filter(v => v.grupo === 'Dicas' && v.arq && !usados.has('vp-' + v.id));
  console.log(`vagas: ${vagas.join(', ')} · carrosséis livres: ${conteudos.length} · vídeos de dica livres: ${videos.length}`);
  const base = Date.now().toString(36), novos = []; let k = 0, vez = 0;
  for (const q of vagas) {
    // reveza: vídeo (se tiver) a cada 3 posts, senão carrossel
    const querVideo = auto.auto_videos && videos.length && (vez % 3 === 1 || !auto.auto_conteudo || !conteudos.length);
    vez++;
    if (querVideo) { const v = videos.shift(), id = `ig-auto-${base}-${++k}`;
      novos.push({ id, titulo: v.titulo.replace(/^🆕\s*Motion:\s*/, '🎬 '), tipo: 'reels', imagens: [v.capa], video_pronto: v.arq, dur: v.dur || 20, legenda: v.legenda, quando: q, aprovado: true, auto_aprovado: true, tentativa: 0, criado: iso(agora), origem: 'vp-' + v.id }); continue; }
    if (!auto.auto_conteudo) continue;
    const dia = q.slice(0, 10), i = conteudos.findIndex(p => (!p.valido || p.valido >= dia) && (!p.data || p.data === dia)); if (i < 0) continue; const p = conteudos.splice(i, 1)[0], id = `ig-auto-${base}-${++k}`;
    const r = await pg.evaluate(async pid => { const p = postsConteudo().find(x => x.id === pid), imgs = [];
      for (const fn of p.telas) { const cv = document.createElement('canvas'); cv.width = PW; cv.height = PH; await fn(cv.getContext('2d')); imgs.push(cv.toDataURL('image/jpeg', .9).split(',')[1]); }
      return { imgs, legenda: paraInsta(p.legenda), titulo: p.titulo.replace(/^\d+\.\s*/, '') }; }, p.id);
    const imagens = r.imgs.map((d, j) => { const f = `ig/${id}-${j + 1}.jpg`; fs.writeFileSync(path.join(DOCS, f), Buffer.from(d, 'base64')); return f; });
    novos.push({ id, titulo: r.titulo, tipo: imagens.length > 1 ? 'carrossel' : 'feed', imagens, legenda: r.legenda, quando: q, aprovado: true, auto_aprovado: true, tentativa: 0, criado: iso(agora), origem: p.id, ...(p.valido ? { valido_ate: p.valido } : {}) });
  }
  await b.close(); srv.close();
  if (!novos.length) { console.log('nada novo pra agendar (acabaram os conteúdos livres)'); return; }
  const f2 = ler('ig_fila.json', []); f2.push(...novos); fs.writeFileSync(path.join(DOCS, 'ig_fila.json'), JSON.stringify(f2, null, 1) + '\n');
  novos.forEach(x => console.log(`agendado: ${x.quando.slice(0, 16)} · ${x.titulo}`)); if (TESTE) console.log('(teste)');
})();
