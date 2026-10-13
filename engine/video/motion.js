// Reels em motion graphics (plano contínuo + trilha própria).
// uso: node engine/video/motion.js dados.json saida.mp4 [pasta-dos-clipes]
// dados.json (rota):  {destino, code, pais, valor, costuma?, cia?, datas:[AAAA-MM-DD], hoje:"13/10", clip:"janela-1", clip_ini?:0}
// dados.json (roteiro): {cenas:[{tipo:'gancho'|'numero'|'lista'|'passos'|'versus'|'frase'|'foto'|'cta', comp, ...}], semente} → motion2.html
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), http = require('http'), os = require('os'); const { execFileSync, spawn } = require('child_process');
const FPS = +(process.env.FPS || 60);
(async () => {
  const [dados, saida, clipes = path.join(__dirname, '../../docs/midia')] = process.argv.slice(2); const V = JSON.parse(fs.readFileSync(dados, 'utf8'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mo-')), fr = path.join(tmp, 'frames'); fs.mkdirSync(fr);
  const clip = path.join(clipes, `clip-v-${V.clip || 'janela-1'}.mp4`);
  if (!V.cenas && fs.existsSync(clip)) {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(V.clip_ini || 0), '-t', '8.5', '-i', clip, '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30', '-q:v', '3', path.join(fr, '%04d.jpg')]);
    V.frames = fs.readdirSync(fr).length;
  }
  const raiz = __dirname, marca = path.join(__dirname, '../../docs/marca'), tipos = { '.html': 'text/html', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg' };
  const srv = http.createServer((q, r) => { const n = decodeURIComponent(q.url.split('?')[0]).slice(1); const f = [path.join(tmp, n), path.join(raiz, n), path.join(marca, n), n.startsWith('midia/') ? path.join(clipes, path.basename(n)) : ''].find(x => fs.existsSync(x) && fs.statSync(x).isFile());
    if (!f) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {}); const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await pg.addInitScript(v => { window.VID = v; }, V); await pg.goto(`http://localhost:${srv.address().port}/${V.cenas ? 'motion2.html' : 'motion.html'}`); await pg.evaluate(() => window.pronto);
  const TOTAL = await pg.evaluate(() => window.TOTAL), SFX = await pg.evaluate(() => window.SFX), MUS = await pg.evaluate(() => window.MUSICA || {}), N = Math.round(TOTAL * FPS);
  const silen = path.join(tmp, 'v.mp4');
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-crf', '21', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-profile:v', 'high', silen], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < N; i++) { const d = await pg.evaluate(t => window.quadro(t), i / FPS); if (!ff.stdin.write(Buffer.from(d.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r)); }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); srv.close();
  const sfx = path.join(tmp, 'sfx.json'), wav = path.join(tmp, 'trilha.wav'); fs.writeFileSync(sfx, JSON.stringify(Object.assign({ total: TOTAL, sfx: SFX, semente: V.semente || 0 }, MUS)));
  execFileSync('python3', [path.join(__dirname, 'trilha.py'), sfx, wav], { stdio: 'inherit' });
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', silen, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', saida]);
  fs.rmSync(tmp, { recursive: true, force: true }); console.log('ok', saida, TOTAL + 's', FPS + 'fps');
})();
