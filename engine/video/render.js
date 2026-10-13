// Monta um Reels "bem produzido": cenas animadas (cenas.html, desenhadas quadro a quadro) sobre os vídeos do banco, com transições.
// uso: node engine/video/render.js roteiro.json saida.mp4 [pasta-dos-clipes]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), http = require('http'), os = require('os'); const { execFileSync } = require('child_process');
(async () => {
  const [roteiro, saida, clipes = path.join(__dirname, '../../docs/midia')] = process.argv.slice(2); const V = JSON.parse(fs.readFileSync(roteiro, 'utf8'));
  const raiz = __dirname, marca = path.join(__dirname, '../../docs/marca');
  const tipos = { '.html': 'text/html', '.ttf': 'font/ttf', '.png': 'image/png' };
  const srv = http.createServer((q, r) => { const n = decodeURIComponent(q.url.split('?')[0]).slice(1); const f = fs.existsSync(path.join(raiz, n)) ? path.join(raiz, n) : path.join(marca, n);
    if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
  const porta = srv.address().port;
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {}); const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await pg.addInitScript(v => { window.VID = v; }, V); await pg.goto(`http://localhost:${porta}/cenas.html`); await pg.evaluate(() => window.pronto);
  const TOTAL = await pg.evaluate(() => window.TOTAL), N = Math.round(TOTAL * 30), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-'));
  for (let i = 0; i < N; i++) { const d = await pg.evaluate(t => window.quadro(t), i / 30); fs.writeFileSync(path.join(tmp, String(i).padStart(4, '0') + '.png'), Buffer.from(d.split(',')[1], 'base64')); }
  await b.close(); srv.close();
  const ins = [], fl = []; let off = 0; const tr = ['zoomin', 'fadewhite', 'slideup', 'fade', 'circleopen', 'smoothleft'];
  V.cenas.forEach((s, i) => { ins.push('-ss', String(s.ini || 0), '-t', String(s.dur), '-i', path.join(clipes, `clip-v-${s.clip}.mp4`));
    fl.push(`[${i}:v]scale=w='trunc(1080*(1+${s.zoom || .07}*t/${s.dur})/2)*2':h=-2:eval=frame,crop=1080:1920,setsar=1,fps=30,${s.blur ? `boxblur=${s.blur}:1,` : ''}${s.escuro ? `eq=brightness=-${s.escuro},` : ''}format=yuv420p[s${i}]`); });
  let ant = 's0'; for (let i = 1; i < V.cenas.length; i++) { off += V.cenas[i - 1].dur - .35; fl.push(`[${ant}][s${i}]xfade=transition=${V.cenas[i].trans || tr[(i - 1) % tr.length]}:duration=0.35:offset=${off.toFixed(2)}[x${i}]`); ant = `x${i}`; }
  const bg = path.join(tmp, 'bg.mp4');
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...ins, '-filter_complex', fl.join(';'), '-map', `[${ant}]`, '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', bg]);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', bg, '-framerate', '30', '-i', path.join(tmp, '%04d.png'), '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-filter_complex', '[0:v][1:v]overlay=0:0:format=auto,format=yuv420p[v]',
    '-map', '[v]', '-map', '2:a', '-t', TOTAL.toFixed(2), '-c:v', 'libx264', '-crf', '19', '-preset', 'slow', '-profile:v', 'high', '-c:a', 'aac', '-shortest', '-movflags', '+faststart', saida]);
  fs.rmSync(tmp, { recursive: true, force: true }); console.log('ok', saida, TOTAL.toFixed(1) + 's');
})();
