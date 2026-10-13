"""Trilha própria do Partiu 085 (sem direitos autorais): house tropical 120 BPM sintetizada na hora,
com os efeitos sonoros (pop, whoosh, impacto...) batendo exatamente nas animações.
uso: python3 trilha.py sfx.json saida.wav     (sfx.json = {"total": 20, "sfx": [["pop", 0.0], ["riser", 5.2, 1.8], ...], "semente": 0})"""
import json, sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 44100
BPM = 120
BT = 60 / BPM          # 0,5 s por batida
BAR = 4 * BT
S16 = BT / 4

cfg = json.load(open(sys.argv[1]))
TOTAL = float(cfg["total"])
N = int(SR * (TOTAL + 0.05))
rng = np.random.default_rng(int(cfg.get("semente", 0)) + 7)
TRANSP = [0, -2, 2, -1, 1, 3][int(cfg.get("semente", 0)) % 6]

def mtof(m): return 440.0 * 2 ** ((m + TRANSP - 69) / 12)
def tarr(n): return np.arange(n) / SR
def bus(): return np.zeros((N, 2))
def sos(kind, f, order=2):
    f = np.clip(np.atleast_1d(f), 20, SR / 2 - 100)
    return butter(order, f if len(f) > 1 else f[0], btype=kind, fs=SR, output="sos")
def filt(x, kind, f, order=2): return sosfilt(sos(kind, f, order), x, axis=0)
def put(b, sig, t0, pan=0.0, g=1.0):
    i = int(t0 * SR)
    if i >= N or i + len(sig) <= 0: return
    if i < 0: sig, i = sig[-i:], 0
    sig = sig[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    b[i:i + len(sig), 0] += sig * g * l * 1.414
    b[i:i + len(sig), 1] += sig * g * r * 1.414

def saw(f, n, fase=0.0):
    t = tarr(n); out = np.zeros(n); K = int(min(60, (SR / 2.2) / f))
    for k in range(1, K + 1): out += np.sin(2 * np.pi * k * f * t + fase * k) / k
    return out * 0.55
def sweep_filter(x, kind, f0, f1, curva=1.0, bloco=256):
    """filtro que abre/fecha ao longo do som"""
    out = np.zeros_like(x); zi = None; nb = int(np.ceil(len(x) / bloco))
    for j in range(nb):
        u = (j / max(1, nb - 1)) ** curva; f = f0 * (f1 / f0) ** u
        s = sos(kind, f) if kind != "bandpass" else sos("bandpass", [f / 1.6, f * 1.6])
        if zi is None or zi.shape[0] != s.shape[0]: zi = np.zeros((s.shape[0], 2))
        seg = x[j * bloco:(j + 1) * bloco]; y, zi = sosfilt(s, seg, zi=zi); out[j * bloco:j * bloco + len(seg)] = y
    return out
def env(n, a=0.003, d=0.2, s=0.0, r=0.05, hold=None):
    t = tarr(n); hold = hold if hold is not None else n / SR
    e = np.where(t < a, t / a, s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    rel = np.clip((t - hold) / r, 0, 1); return e * (1 - rel)

# ---------------- seções ----------------
SFX = cfg["sfx"]
def ev_t(nome): return [s[1] for s in SFX if s[0] == nome]
ENTRA = float(cfg.get("entra", 1.0))
DROP = float(cfg.get("drop", 10.0))
Q0 = float(cfg.get("quebra", DROP - 2.95))
BUILD = DROP - 2.0
LEADFIM = float(cfg.get("lead_fim", min(DROP + 6.0, TOTAL - 4.0)))
QUEBRA = (Q0, DROP)              # sem bumbo: respiro + subida
FIM = TOTAL - 0.9
def tem_bumbo(t): return (t >= 1.0 and not (QUEBRA[0] <= t < DROP - 0.0) and t < FIM) or (DROP - 1.0 <= t < DROP and False)

# progressão vi–IV–I–V (em Lá): F#m D A E
_FS, _D, _A, _E = [54, 57, 61, 66], [50, 54, 57, 62], [52, 57, 61, 64], [52, 56, 59, 64]
_PROG = [([_FS, _D, _A, _E], [42, 38, 45, 40]), ([_A, _E, _FS, _D], [45, 40, 42, 38]), ([_D, _A, _E, _FS], [38, 45, 40, 42])]
ACORDES, BAIXO = _PROG[(int(cfg.get("semente", 0)) // 6) % 3]
def acorde(t): return int(t // BAR) % 4

kick_b, perc, bass_b, harm, lead_b, fx, send = bus(), bus(), bus(), bus(), bus(), bus(), bus()

# bumbo
def bumbo():
    n = int(0.42 * SR); t = tarr(n)
    f = 46 + 110 * np.exp(-t * 28); ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 7.5); s += 0.5 * np.tanh(3 * s)
    cl = rng.standard_normal(int(0.004 * SR)) * np.linspace(1, 0, int(0.004 * SR)) * 0.35; s[:len(cl)] += cl
    return s * 0.95
K = bumbo(); kicks = []
t = 0.0
while t < TOTAL:
    if (ENTRA <= t < QUEBRA[0]) or (DROP <= t < FIM):
        put(kick_b, K, t); kicks.append(t)
    t += BT
# sidechain (o "bombeado" do house)
sc = np.ones(N); tt = tarr(N)
for k in kicks:
    i = int(k * SR); j = min(N, i + int(0.35 * SR)); x = tt[: j - i]
    sc[i:j] = np.minimum(sc[i:j], 1 - 0.75 * np.exp(-x / 0.11) * np.clip(x / 0.004, 0, 1))
sc2 = np.stack([sc, sc], 1)

# palmas, chimbal, shaker
def palma():
    n = int(0.25 * SR); s = np.zeros(n)
    for k, off in enumerate([0, .011, .022]):
        b = rng.standard_normal(int(.012 * SR)) * np.exp(-tarr(int(.012 * SR)) * 200); i = int(off * SR); s[i:i + len(b)] += b
    tail = rng.standard_normal(n) * np.exp(-tarr(n) * 22) * .5; s += tail
    return filt(s, "bandpass", [900, 2600]) * 0.9
def chimbal(dec):
    n = int((dec * 5) * SR); return filt(rng.standard_normal(n), "highpass", 7500) * np.exp(-tarr(n) / dec) * 0.35
P, HC, HO = palma(), chimbal(.022), chimbal(.06)
t = 0.0; i16 = 0
while t < TOTAL - .6:
    cheio = (ENTRA <= t < QUEBRA[0]) or (DROP <= t < FIM)
    pos = i16 % 16
    if cheio:
        if pos in (4, 12): put(perc, P, t, 0.05, 0.9); put(send, P, t, 0, .25)
        if pos % 4 == 2: put(perc, HO, t, 0.25, 0.45)
        if pos % 2 == 1: put(perc, HC, t, -0.3, 0.35 + 0.15 * rng.random())
        if t >= DROP and pos in (7, 15): put(perc, HC, t, 0.4, 0.4)
    elif t < ENTRA and pos % 2 == 1: put(perc, HC, t, -0.3, 0.25)
    t += S16; i16 += 1
# virada de caixa crescendo antes do drop
def caixa():
    n = int(.18 * SR); tt_ = tarr(n)
    return (filt(rng.standard_normal(n), "bandpass", [1200, 6000]) * np.exp(-tt_ * 25) * .6 + np.sin(2 * np.pi * 190 * tt_) * np.exp(-tt_ * 30) * .5)
SN = caixa(); t = BUILD
while t < DROP - 0.05:
    u = (t - BUILD) / 2.0; passo = S16 if u < .5 else S16 / 2 if u < .85 else S16 / 4
    put(perc, SN, t, rng.uniform(-.2, .2), 0.15 + 0.6 * u); put(send, SN, t, 0, .1 * u); t += passo

# baixo (contratempo, house)
def nota_baixo(f, dur):
    n = int(dur * SR); s = saw(f, n) + 0.6 * np.sin(2 * np.pi * f * tarr(n))
    s = filt(s, "lowpass", 520) * env(n, .004, .18, .55, .03, dur - .03); return np.tanh(1.6 * s) * .55
t = 0.0
while t < FIM:
    c = acorde(t); f = mtof(BAIXO[c])
    for o in (BT / 2, BT * 1.5, BT * 2.5, BT * 3.5):
        tn = t + o
        if (ENTRA <= tn < QUEBRA[0]) or (DROP <= tn < FIM): put(bass_b, nota_baixo(f, BT * .45), tn, 0, 1.0)
    t += BAR

# plucks tropicais (síncope)
PADRAO = [0, 3, 6, 10, 12]
def pluck(midi, dur, brilho=4200):
    f = mtof(midi); n = int((dur + .25) * SR)
    s = saw(f * 1.003, n) + saw(f * .997, n, 1.3) + 0.4 * np.sign(np.sin(2 * np.pi * f * 2 * tarr(n))) * .3
    s = sweep_filter(s, "lowpass", brilho, 500, .6, 512) * env(n, .002, .09, .0, .05, dur)
    return s * .22
t = 0.0
while t < FIM:
    c = acorde(t)
    for st in PADRAO:
        tn = t + st * S16
        if tn >= FIM: continue
        on = tn < QUEBRA[0] or tn >= BUILD
        br = 1600 + 3600 * min(1, tn / max(ENTRA, .1)) if tn < ENTRA else (900 + 3500 * (tn - BUILD) / 2 if BUILD <= tn < DROP else 4800)
        if on or QUEBRA[0] <= tn < BUILD:
            g = .55 if QUEBRA[0] <= tn < BUILD else 1.0
            for k, m in enumerate(ACORDES[c]):
                put(harm, pluck(m + 12, S16 * 1.6, br), tn, [-.5, .5, -.2, .2][k], g); put(send, pluck(m + 12, S16 * 1.6, br), tn, [-.5, .5, -.2, .2][k], .25 * g)
    t += BAR

# pad supersaw (entra forte no drop; suave na quebra)
def pad(midi, dur, corte):
    f = mtof(midi); n = int((dur + .3) * SR); s = np.zeros(n)
    for d, ph in zip([-.12, -.05, 0, .05, .12], [0, 1.1, 2.3, .7, 1.9]): s += saw(f * 2 ** (d / 12), n, ph)
    return filt(s, "lowpass", corte) * env(n, .03, 4, .85, .25, dur) * .06
t = 0.0
while t < TOTAL:
    c = acorde(t)
    if QUEBRA[0] <= t + .01 < DROP or DROP <= t < FIM:
        corte = 2600 if t >= DROP else 900 + 1500 * max(0, (t - Q0) / max(.5, DROP - Q0))
        for k, m in enumerate(ACORDES[c]):
            p = pad(m, BAR, corte); put(harm, p, t, [-.7, .7, -.35, .35][k]); put(send, p, t, 0, .3)
    t += BAR

for k, m in enumerate(ACORDES[acorde(Q0)]):
    p = pad(m, 0.9, 1100); put(harm, p, Q0, [-.7, .7, -.35, .35][k]); put(send, p, Q0, 0, .4)

# melodia (só no drop)
MEL = [[(0, 78, 2), (3, 76, 2), (6, 73, 2), (8, 76, 2), (10, 78, 2), (12, 81, 4)],
       [(0, 76, 2), (3, 78, 2), (6, 81, 3), (10, 78, 2), (12, 76, 4)],
       [(0, 73, 2), (3, 76, 2), (6, 78, 2), (8, 81, 2), (10, 83, 2), (12, 81, 4)],
       [(0, 80, 3), (4, 78, 2), (6, 76, 2), (8, 73, 4), (12, 76, 4)]]
def lead(midi, dur):
    f = mtof(midi); n = int((dur + .2) * SR); tt_ = tarr(n); vib = 1 + .004 * np.sin(2 * np.pi * 5.5 * tt_) * np.clip(tt_ / .2, 0, 1)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR; s = np.zeros(n)
    for k in range(1, 18): s += np.sin(k * ph) / k * (1 if k % 2 else .55)
    return filt(s, "lowpass", 3800) * env(n, .006, .25, .6, .08, dur) * .16
t = DROP; b = 0
while t < LEADFIM - .01:
    for st, m, ln in MEL[b % 4]:
        tn = t + st * S16; L = lead(m, ln * S16)
        put(lead_b, L, tn, 0); put(send, L, tn, 0, .35)
        for k, dl in enumerate([3 * S16, 6 * S16]): put(lead_b, L, tn + dl, [-.6, .6][k], .32 / (k + 1))
    t += BAR; b += 1

# acorde final
for k, m in enumerate(ACORDES[2]):
    p = pad(m, 1.6, 3000) * 2.2; put(harm, p, FIM, [-.6, .6, -.3, .3][k]); put(send, p, FIM, 0, .6)
put(kick_b, K, FIM); put(perc, P, FIM, 0, .7)

# ---------------- efeitos sonoros ----------------
def s_pop(f0=900, f1=320, d=.07):
    n = int(d * 2.5 * SR); tt_ = tarr(n); f = f1 + (f0 - f1) * np.exp(-tt_ / (d / 3)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt_ / d) * .45
def s_whoosh(d=.5, f0=300, f1=5000):
    n = int(d * SR); x = rng.standard_normal(n); y = sweep_filter(x, "bandpass", f0, f1, 1.0, 256)
    w = np.sin(np.pi * np.linspace(0, 1, n)) ** 2; return y * w * .5
def s_impact():
    n = int(1.6 * SR); tt_ = tarr(n); f = 38 + 70 * np.exp(-tt_ * 9)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt_ * 2.6)
    ns = filt(rng.standard_normal(n), "lowpass", 2500) * np.exp(-tt_ * 6) * .45
    return np.tanh(1.5 * (sub + ns)) * .8
def s_hit():
    n = int(.6 * SR); tt_ = tarr(n); f = 55 + 90 * np.exp(-tt_ * 20)
    return np.tanh(2 * (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt_ * 6) + filt(rng.standard_normal(n), "bandpass", [800, 5000]) * np.exp(-tt_ * 18) * .5)) * .55
def s_riser(d):
    n = int(d * SR); tt_ = tarr(n); u = tt_ / d
    y = sweep_filter(rng.standard_normal(n), "bandpass", 400, 7000, 1.6, 256) * u ** 2 * .45
    f = 200 * (8 ** u); y += np.sin(2 * np.pi * np.cumsum(f) / SR) * u ** 3 * .12; return y
def s_tick():
    n = int(.012 * SR); return filt(rng.standard_normal(n), "highpass", 3000) * np.exp(-tarr(n) * 600) * .35
def s_scratch():
    n = int(.16 * SR); return sweep_filter(rng.standard_normal(n), "bandpass", 3000, 1200, 1, 128) * np.exp(-tarr(n) * 14) * .35
notas_pop = [76, 78, 81, 83, 85, 88]
for s in SFX:
    nome, t0 = s[0], float(s[1])
    if nome == "pop": put(fx, s_pop(), t0, 0, .9); put(send, s_pop(), t0, 0, .2)
    elif nome == "pop2":
        i = sum(1 for x in SFX if x[0] == "pop2" and x[1] < t0); f = mtof(notas_pop[i % 6])
        put(fx, s_pop(f * 1.02, f, .09), t0, (-1) ** i * .4, .55); put(send, s_pop(f * 1.02, f, .09), t0, 0, .3)
    elif nome == "whoosh": put(fx, s_whoosh(.55), t0 - .2, 0, .8); put(send, s_whoosh(.55), t0 - .2, 0, .2)
    elif nome == "swish": put(fx, s_whoosh(.9, 600, 2500), t0, .3, .35)
    elif nome == "impact": put(fx, s_impact(), t0, 0, 1.0); put(send, s_impact(), t0, 0, .35)
    elif nome == "hit": put(fx, s_hit(), t0, 0, .9); put(send, s_hit(), t0, 0, .3)
    elif nome == "riser": put(fx, s_riser(float(s[2])), t0, 0, .9); put(send, s_riser(float(s[2])), t0, 0, .3)
    elif nome == "tick": put(fx, s_tick(), t0, rng.uniform(-.3, .3), .8)
    elif nome == "scratch": put(fx, s_scratch(), t0, 0, .8)
    elif nome == "tap": put(fx, s_pop(500, 180, .05), t0, 0, .9)
# subida extra antes do drop
put(fx, s_riser(2.0), DROP - 2.0, 0, .7); put(fx, s_impact(), DROP, 0, .9)

# ---------------- reverb + mix ----------------
def ir(d=1.8):
    n = int(d * SR); tt_ = tarr(n); out = np.zeros((n, 2))
    for ch in range(2): out[:, ch] = filt(rng.standard_normal(n), "lowpass", 6000) * np.exp(-tt_ * 3.4 / d)
    out[: int(.012 * SR)] = 0; return out / np.sqrt((out ** 2).sum(0))
R = ir(); rev = np.zeros((N, 2))
for ch in range(2): rev[:, ch] = fftconvolve(filt(send[:, ch], "highpass", 300), R[:, ch])[:N]
mix = kick_b * .55 + perc * 1.0 + bass_b * sc2 * .85 + harm * sc2 * 1.3 + lead_b * (0.6 + 0.4 * sc2) * 1.9 + fx * 1.0 + rev * .55 * (0.5 + 0.5 * sc2)
# intro abafada (abre no "ACHOU")
k = int(ENTRA * SR); mix[:k] = mix[:k] * 0.85
mix = filt(filt(mix, "highpass", 28), "lowpass", 15000)
import os
if os.environ.get("STEMS"):
    for nm, b_ in [("kick", kick_b), ("perc", perc), ("bass", bass_b * sc2), ("harm", harm * sc2), ("lead", lead_b), ("fx", fx), ("rev", rev)]: print(nm, round(20 * np.log10(np.sqrt((b_ ** 2).mean()) + 1e-9), 1))
# master: compressão suave + limitador
pk = np.max(np.abs(mix)) + 1e-9; mix = mix / pk * 1.25
mix = np.tanh(mix) / np.tanh(1.25)
fade = int(.35 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]; mix[: int(.01 * SR)] *= np.linspace(0, 1, int(.01 * SR))[:, None]
mix *= 0.93
wavfile.write(sys.argv[2], SR, (mix * 32767).astype(np.int16))
print("trilha ok", round(TOTAL, 2), "s")
