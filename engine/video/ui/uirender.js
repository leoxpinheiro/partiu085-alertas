// uso: node uirender.js pagina.html saida.mp4 [fps] [dados.json → window.VID]  (pagina define window.quadro(t), TOTAL, SFX, MUSICA)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), http = require('http'), os = require('os'); const { execFileSync, spawn } = require('child_process');
(async () => {
  const [pag, saida, fpsA, vidf] = process.argv.slice(2); const FPS = +(fpsA || 60); const raiz = path.dirname(path.resolve(pag));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-'));
  const tipos = { '.css': 'text/css', '.js': 'text/javascript', '.html': 'text/html', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg' };
  const srv = http.createServer((q, r) => { const f = path.join(raiz, decodeURIComponent(q.url.split('?')[0]).slice(1)); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {}); const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  pg.on('pageerror', e => console.log('ERRO', e.message));
  if (vidf) { const V = JSON.parse(fs.readFileSync(vidf, 'utf8')); await pg.addInitScript(v => { window.VID = v; }, V); }
  await pg.goto(`http://localhost:${srv.address().port}/${path.basename(pag)}${process.env.Q || ''}`); await pg.evaluate(() => window.pronto);
  const TOTAL = await pg.evaluate(() => window.TOTAL), SFX = await pg.evaluate(() => window.SFX || []), MUS = await pg.evaluate(() => window.MUSICA || {});
  const N = Math.round(TOTAL * FPS), silen = path.join(tmp, 'v.mp4');
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', silen], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < N; i++) { await pg.evaluate(t => window.quadro(t), i / FPS); const buf = await pg.screenshot({ type: 'jpeg', quality: 93 }); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); srv.close();
  const sfx = path.join(tmp, 'sfx.json'), wav = path.join(tmp, 't.wav'); fs.writeFileSync(sfx, JSON.stringify(Object.assign({ total: TOTAL, sfx: SFX, semente: 3 }, MUS)));
  execFileSync('python3', [path.join(__dirname, '..', 'trilha.py'), sfx, wav], { stdio: 'inherit' });
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', silen, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', saida]);
  console.log('ok', saida, TOTAL + 's');
})();
