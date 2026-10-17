"""Reels "imagem real + narração + legenda palavra por palavra" (formato que mais roda em perfis de viagem).

Cenas reais do banco (docs/midia/clip-*.mp4), título fixo no topo (vira a capa), narração grátis (edge-tts)
e legenda grande no meio que acende em amarelo a palavra que está sendo falada. Música própria baixinha.

uso: python engine/video/real/reel_real.py roteiro.json saida.mp4
roteiro: {"voz", "velocidade", "titulo" (aceita <em>), "texto" (a fala inteira), "clips": [...], "corte": 2.4,
          "fim": "texto do cartão final", "fim_sub": "linha menor"}
TTS_FALSO=1 testa sem internet (tempos estimados).
"""
import asyncio, json, os, re, subprocess, sys, tempfile
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[2]
MIDIA = RAIZ / "docs" / "midia"
FONTES = AQUI.parent / "ui"          # PlusJakartaSans[wght].ttf
TRILHA = AQUI.parent / "trilha.py"
AM, BR, NV = "&H0031C5F5&", "&H00FFFFFF&", "&H0040240B&"   # amarelo, branco, navy (BGR)


def dur(f):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)],
                                capture_output=True, text=True).stdout)


# ---------------------------------------------------------------- voz + tempo de cada palavra
async def _tts(txt, voz, vel, out):
    import edge_tts
    try:
        com = edge_tts.Communicate(txt, voz, rate=vel, boundary="WordBoundary")
    except TypeError:
        com = edge_tts.Communicate(txt, voz, rate=vel)
    pal = []
    with open(out, "wb") as f:
        async for c in com.stream():
            if c["type"] == "audio":
                f.write(c["data"])
            elif c["type"] == "WordBoundary":
                pal.append({"t": c["offset"] / 1e7, "d": c["duration"] / 1e7, "w": c["text"]})
    return pal


def tts(txt, voz, vel, out):
    if os.environ.get("TTS_FALSO"):
        ws = txt.split(); t = 0.0; pal = []
        for w in ws:
            d = 0.12 + 0.055 * len(w); pal.append({"t": t, "d": d, "w": w.strip(".,!?:;")}); t += d + (0.25 if w[-1] in ".!?" else 0.04)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", f"{t + .2:.2f}", "-q:a", "9", str(out)], check=True)
        return pal
    for k in range(3):
        try:
            pal = asyncio.run(_tts(txt, voz, vel, out))
            if pal:
                return pal
            print("sem marcação de palavras, tentando de novo")
        except Exception as e:  # noqa: BLE001
            print("tts tentativa", k + 1, e)
    raise SystemExit("TTS falhou")


# ---------------------------------------------------------------- legenda (ASS)
def ts(t):
    t = max(0, t); h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def esc(s):
    return s.replace("{", "(").replace("}", ")")


def pontuar(pal, texto):
    """A voz devolve as palavras sem pontuação: casa com o texto original pra saber onde a frase quebra."""
    toks = re.findall(r"\S+", texto); j = 0
    norm = lambda s: re.sub(r"[^\wÀ-ÿ%]", "", s.lower())
    for p in pal:
        w = norm(p["w"])
        for k in range(j, min(j + 4, len(toks))):
            if norm(toks[k]).startswith(w) or w.startswith(norm(toks[k])):
                p["fim"] = bool(re.search(r"[.!?,:;]$", toks[k])); j = k + 1; break
    return pal


def blocos(pal, max_pal=4, max_chr=15):
    """Agrupa as palavras em blocos curtos (2 a 3 palavras), quebrando em pontuação."""
    out, cur = [], []
    for p in pal:
        cur.append(p)
        txt = " ".join(x["w"] for x in cur)
        fim_frase = p.get("fim") or bool(re.search(r"[.!?,:;]$", p["w"]))
        if len(cur) >= max_pal or len(txt) >= max_chr or fim_frase:
            out.append(cur); cur = []
    if cur:
        out.append(cur)
    return out


def ass(V, pal, ini, total, fim_ini, fn="Plus Jakarta Sans"):
    tit = esc(V["titulo"]).replace("<em>", "{\\c" + AM + "}").replace("</em>", "{\\c" + BR + "}")
    L = ["[Script Info]", "ScriptType: v4.00+", "PlayResX: 1080", "PlayResY: 1920", "WrapStyle: 0", "ScaledBorderAndShadow: yes", "",
         "[V4+ Styles]",
         "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
         f"Style: Titulo,Plus Jakarta Sans,118,{BR},{BR},{NV},{NV},-1,0,0,0,100,100,-1,0,3,30,0,8,80,80,250,1",
         f"Style: Leg,Plus Jakarta Sans,138,{BR},{BR},&H00000000&,&H90000000&,-1,0,0,0,100,100,-1,0,1,9,5,5,60,60,0,1",
         f"Style: Marca,Plus Jakarta Sans,54,{BR},{BR},&H00000000&,&H00000000&,-1,0,0,0,100,100,0,0,1,3,0,2,60,60,120,1",
         f"Style: Fim,Plus Jakarta Sans,128,{BR},{BR},{NV},{NV},-1,0,0,0,100,100,-1,0,3,34,0,5,80,80,0,1",
         f"Style: FimSub,Plus Jakarta Sans,74,&H0040240B&,&H0040240B&,&H0031C5F5&,&H0031C5F5&,-1,0,0,0,100,100,0,0,3,20,0,5,90,90,0,1",
         "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
    # título fixo (entra com um pop rápido)
    L.append(f"Dialogue: 2,{ts(0)},{ts(fim_ini)},Titulo,,0,0,0,,{{\\fad(120,150)\\t(0,180,\\fscx104\\fscy104)\\t(180,320,\\fscx100\\fscy100)}}{tit}")
    L.append(f"Dialogue: 1,{ts(0.4)},{ts(total)},Marca,,0,0,0,,@partiu.085")
    # legenda: cada bloco aparece com a palavra falada em amarelo
    for b in blocos(pal):
        for i, p in enumerate(b):
            a = ini + p["t"]
            z = ini + (b[i + 1]["t"] if i + 1 < len(b) else p["t"] + p["d"] + 0.18)
            txt = " ".join(("{\\c" + AM + "}" + esc(x["w"]).upper() + "{\\c" + BR + "}") if j == i else esc(x["w"]).upper() for j, x in enumerate(b))
            pop = "{\\pos(540,1180)\\t(0,90,\\fscx108\\fscy108)\\t(90,180,\\fscx100\\fscy100)}" if i == 0 else "{\\pos(540,1180)}"
            L.append(f"Dialogue: 0,{ts(a)},{ts(min(z, fim_ini))},Leg,,0,0,0,,{pop}{txt}")
    # cartão final
    L.append(f"Dialogue: 3,{ts(fim_ini)},{ts(total)},Fim,,0,0,0,,{{\\pos(540,860)\\fad(150,0)\\t(0,200,\\fscx106\\fscy106)\\t(200,350,\\fscx100\\fscy100)}}{esc(V.get('fim', 'Segue o @partiu.085'))}")
    if V.get("fim_sub"):
        L.append(f"Dialogue: 3,{ts(fim_ini + .35)},{ts(total)},FimSub,,0,0,0,,{{\\pos(540,1090)\\fad(150,0)}}{esc(V['fim_sub'])}")
    return "\n".join(L).replace("Plus Jakarta Sans", fn) + "\n"


# ---------------------------------------------------------------- vídeo
def fonte_xb(destino: Path) -> str:
    """Gera uma versão fixa ExtraBold (800) da fonte variável, que o libass não sabe engrossar sozinho."""
    try:
        from fontTools.ttLib import TTFont
        from fontTools.varLib.instancer import instantiateVariableFont
        f = TTFont(str(FONTES / "PlusJakartaSans[wght].ttf"))
        f = instantiateVariableFont(f, {"wght": 800})
        for rec in f["name"].names:
            if rec.nameID in (1, 4, 16):
                rec.string = "JakartaXB"
            elif rec.nameID == 6:
                rec.string = "JakartaXB"
            elif rec.nameID in (2, 17):
                rec.string = "Regular"
        destino.mkdir(parents=True, exist_ok=True)
        f.save(str(destino / "JakartaXB.ttf"))
        return "JakartaXB"
    except Exception as e:  # noqa: BLE001
        print("fonte fixa falhou, usando a variável:", e)
        return "Plus Jakarta Sans"


def degrade(png):
    from PIL import Image
    im = Image.new("RGBA", (1080, 1920))
    px = im.load()
    for y in range(1920):
        a = 0
        if y < 760: a = int(170 * (1 - y / 760) ** 1.4)
        if y > 900: a = max(a, int(150 * ((y - 900) / 1020) ** 1.6))
        for x in range(1080):
            px[x, y] = (6, 23, 43, a)
    im.save(png)


def main():
    V = json.loads(Path(sys.argv[1]).read_text("utf-8")); saida = Path(sys.argv[2]).resolve()
    tmp = Path(tempfile.mkdtemp(prefix="real-"))
    voz, vel = V.get("voz", "pt-BR-AntonioNeural"), V.get("velocidade", "+12%")
    voz_mp3 = tmp / "voz.mp3"
    pal = pontuar(tts(V["texto"], voz, vel, voz_mp3), V["texto"])
    d_voz = dur(voz_mp3)
    ini = 0.55                        # respiro antes da fala (o título aparece primeiro)
    fim_ini = ini + d_voz + 0.35
    total = round(fim_ini + float(V.get("dur_fim", 2.6)), 2)
    fdir = tmp / "fontes"; fn = fonte_xb(fdir)
    if fn == "Plus Jakarta Sans":
        fdir = FONTES
    (tmp / "leg.ass").write_text(ass(V, pal, ini, total, fim_ini, fn), "utf-8")
    degrade(tmp / "deg.png")

    # cenas: corta os clipes no ritmo (troca a cada `corte` s), com um zoom/pan lento em cada uma
    clips = [MIDIA / (c if c.endswith(".mp4") else c + ".mp4") for c in V["clips"]]
    corte = float(V.get("corte", 2.4)); n = int(total // corte) + 1
    cmd = ["ffmpeg", "-v", "error", "-y"]; filt = []; ent = []
    for i in range(n):
        c = clips[i % len(clips)]; dc = dur(c); seg = min(corte, total - i * corte)
        if seg <= 0.05: break
        off = (0.4 + (i // len(clips)) * corte) % max(0.1, dc - seg - 0.1)
        cmd += ["-ss", f"{off:.2f}", "-t", f"{seg + .05:.2f}", "-i", str(c)]
        k = len(ent); dirx = "1" if i % 2 == 0 else "-1"
        filt.append(f"[{k}:v]fps=30,scale=1200:2134:force_original_aspect_ratio=increase,crop=1200:2134,"
                    f"crop=1080:1920:x='(in_w-1080)/2+{dirx}*55*(t/{seg:.2f}-0.5)':y='(in_h-1920)/2',setsar=1,trim=duration={seg:.2f},setpts=PTS-STARTPTS[v{k}]")
        ent.append(f"[v{k}]")
    k = len(ent)
    cmd += ["-loop", "1", "-i", str(tmp / "deg.png")]
    filt.append("".join(ent) + f"concat=n={len(ent)}:v=1:a=0[cc]")
    filt.append(f"[cc][{k}:v]overlay=0:0:shortest=1,eq=saturation=1.08:contrast=1.04[ov]")
    ass_p = str(tmp / "leg.ass").replace(":", r"\:")
    filt.append(f"[ov]subtitles='{ass_p}':fontsdir='{fdir}'[vo]")
    vid = tmp / "vid.mp4"
    subprocess.run(cmd + ["-filter_complex", ";".join(filt), "-map", "[vo]", "-t", f"{total:.2f}", "-c:v", "libx264", "-preset", "medium",
                          "-crf", "20", "-pix_fmt", "yuv420p", str(vid)], check=True)

    # som: voz + trilha própria baixinha
    mus = tmp / "mus.wav"
    sfx = {"total": total, "sfx": [["whoosh", 0.05], ["pop", fim_ini]], "semente": int(V.get("semente", 3))}
    (tmp / "sfx.json").write_text(json.dumps(sfx))
    tem_mus = subprocess.run([sys.executable, str(TRILHA), str(tmp / "sfx.json"), str(mus)]).returncode == 0
    vol = float(V.get("musica", 0.13))
    a = ["ffmpeg", "-v", "error", "-y", "-i", str(vid), "-i", str(voz_mp3)] + (["-i", str(mus)] if tem_mus else [])
    ms = int(ini * 1000)
    fa = f"[1:a]aresample=48000,aformat=channel_layouts=stereo,adelay={ms}|{ms},volume=1.0[vz]"
    if tem_mus:
        fa += f";[2:a]aresample=48000,volume={vol}[mu];[vz][mu]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-14:TP=-1.5[ao]"
    else:
        fa += ";[vz]loudnorm=I=-14:TP=-1.5[ao]"
    subprocess.run(a + ["-filter_complex", fa, "-map", "0:v", "-map", "[ao]", "-t", f"{total:.2f}", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
                        "-movflags", "+faststart", str(saida)], check=True)
    print(f"ok {saida} {total:.1f}s · {len(pal)} palavras")


if __name__ == "__main__":
    main()
