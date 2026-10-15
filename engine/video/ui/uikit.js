// Kit de motion de interface do Partiu 085 (paleta: navy, amarelo, azul, creme)
const $ = id => document.getElementById(id);
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), P = (t, a, b) => cl((t - a) / (b - a)), L = (a, b, k) => a + (b - a) * k;
const eo = x => 1 - Math.pow(1 - x, 3), eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2, ex = x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
const SP = (t, a, k = 7, f = 11) => { const e = t - a; return e <= 0 ? 0 : 1 - Math.exp(-k * e) * Math.cos(f * e); };
const st = (id, o) => { const el = typeof id === 'string' ? $(id) : id; if (!el) return; const s = el.style; for (const k in o) s[k] = o[k]; };
const tf = (x, y, s = 1, r = 0, extra = '') => `translate(${x}px,${y}px) scale(${s}) rotate(${r}deg) ${extra}`;
const br = n => Math.round(n).toLocaleString('pt-BR');
const vis = (t, a, b) => (t >= a && t < b) ? 1 : 0;
const WA = '<svg class="wa" viewBox="0 0 24 24"><path d="M17.5 14.4c-.3-.1-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 2.4 1 2.9.8 3.4.7.5-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z"/></svg>';
// texto cinético: quebra o elemento em palavras (mantém <span class> internos)
function kinPrep(id) {
  const el = $(id); const out = [];
  const walk = (node, cls) => { [...node.childNodes].forEach(n => { if (n.nodeType === 3) n.textContent.split(/(\s+)/).forEach(p => { if (!p) return; if (/^\s+$/.test(p)) out.push(document.createTextNode(p)); else { const s = document.createElement('span'); s.className = 'w ' + (cls || ''); s.textContent = p; out.push(s); } });
    else if (n.nodeName === 'BR') out.push(document.createElement('br')); else walk(n, (cls || '') + ' ' + n.className); }); };
  walk(el, ''); el.innerHTML = ''; out.forEach(n => el.appendChild(n)); el._w = [...el.querySelectorAll('.w')];
}
// entra palavra por palavra (de baixo, com mola) e sai subindo
function kin(id, t, a, gap = .07, sai = 99) {
  const el = $(id); if (!el._w) kinPrep(id);
  const o = eio(P(t, sai, sai + .35));
  el.style.opacity = t < a ? 0 : 1 - o; el.style.transform = `translateY(${-120 * o}px)`;
  el._w.forEach((w, i) => { const s = SP(t, a + i * gap, 8, 12); w.style.transform = `translateY(${L(80, 0, cl(s, 0, 1.15))}px) rotate(${L(6, 0, cl(s, 0, 1))}deg)`; w.style.opacity = P(t, a + i * gap, a + i * gap + .12); });
}
const pronto = () => Promise.all([document.fonts.load('800 40px J'), document.fonts.load('600 40px J'), ...[...document.images].map(i => i.decode().catch(() => 0))]).then(() => { window.quadro(0); return true; });
