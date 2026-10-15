"""Reels narrado (sem aparecer): cenas de Fortaleza/destinos + voz neural + legenda palavra por palavra.

uso: python engine/video/narrado.py roteiro.json saida.mp4
roteiro.json: {"id", "voz"?, "velocidade"?, "cenas": [{"fala", "visual": "clip:fortaleza-1" | "foto:REC", "ini"?: s,
               "titulo"?, "preco"?, "nota"?}]}
Clipes: docs/midia/clip-v-<nome>.mp4 · fotos: docs/fotos/<IATA>.jpg · fontes: engine/fontes.
Gera também <saida>.mp3 (só a voz) e <saida>.srt pra quem quiser editar no CapCut.
Sem internet (TTS_FALSO=1) gera voz muda com tempos estimados, só pra testar a montagem.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
MIDIA = Path(os.environ.get("MIDIA", RAIZ / "docs" / "midia"))
FOTOS = Path(os.environ.get("FOTOS", RAIZ / "docs" / "fotos"))
FONTES = Path(os.environ.get("FONTES", RAIZ / "engine" / "fontes"))
FPS = 30


def sh(*a):
    subprocess.run(a, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def dur(arq: Path) -> float:
    o = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(arq)], capture_output=True, text=True).stdout
    return float(o.strip())


async def _tts(texto: str, voz: str, vel: str, mp3: Path):
    import edge_tts
    try:
        com = edge_tts.Communicate(texto, voz, rate=vel, boundary="WordBoundary")
    except TypeError:
        com = edge_tts.Communicate(texto, voz, rate=vel)
    pal = []
    with open(mp3, "wb") as f:
        async for ch in com.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                pal.append((ch["offset"] / 1e7, (ch["offset"] + ch["duration"]) / 1e7, ch["text"]))
    return pal


def tts(texto: str, voz: str, vel: str, mp3: Path):
    if os.environ.get("TTS_FALSO"):
        ws = texto.split()
        sh("ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", f"{0.34 * len(ws) + .2:.2f}", "-c:a", "libmp3lame", str(mp3))
        return [(i * .34, i * .34 + .3, w) for i, w in enumerate(ws)]
    for t in range(3):
        try:
            return asyncio.run(_tts(texto, voz, vel, mp3))
        except Exception as e:  # noqa: BLE001
            print("tts tentativa", t + 1, e)
    raise SystemExit("TTS falhou")


def srt_ts(s: float) -> str:
    ms = int(round(max(s, 0) * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def ts(s: float) -> str:
    h, r = divmod(max(s, 0), 3600)
    m, s = divmod(r, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


AMARELO, BRANCO, NAVY = "&H0031C5F5&", "&H00FFFFFF&", "&H00403A17&"


def ass_cab() -> str:
    return f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Leg,Anton,120,{BRANCO},{BRANCO},&H00402417&,&H96000000&,0,0,0,0,100,100,1,0,1,7,4,2,70,70,560,1
Style: Tit,Anton,112,{BRANCO},{BRANCO},&H00402417&,&H80000000&,0,0,0,0,100,100,1,0,1,6,3,8,70,70,330,1
Style: Pre,Anton,210,{AMARELO},{AMARELO},&H00402417&,&H80000000&,0,0,0,0,100,100,0,0,1,8,4,8,70,70,455,1
Style: Not,Plus Jakarta Sans,46,{BRANCO},{BRANCO},&H00402417&,&H80000000&,1,0,0,0,100,100,0,0,1,4,2,8,70,70,700,1
Style: Mar,Anton,40,{BRANCO},{BRANCO},&H00402417&,&H80000000&,0,0,0,0,100,100,2,0,1,3,1,2,70,70,300,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def blocos(pal):
    """Agrupa as palavras em blocos de até 3 (quebra em pontuação)."""
    out, cur = [], []
    for p in pal:
        cur.append(p)
        if len(cur) >= 3 or re.search(r"[.,!?:;]$", p[2]):
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return out


def esc(t: str) -> str:
    return t.replace("{", "(").replace("}", ")").upper()


def main():
    rot = json.loads(Path(sys.argv[1]).read_text("utf-8"))
    saida = Path(sys.argv[2])
    voz, vel = rot.get("voz", "pt-BR-AntonioNeural"), rot.get("velocidade", "+8%")
    tmp = Path(tempfile.mkdtemp(prefix="narr-"))
    ev, srt, partes, auds, t0 = [], [], [], [], 0.0
    for i, c in enumerate(rot["cenas"]):
        mp3 = tmp / f"a{i}.mp3"
        pal = tts(c["fala"], voz, vel, mp3)
        d = round(dur(mp3) + float(c.get("pausa", .12)), 3)
        # áudio da cena com o tamanho exato da cena
        wav = tmp / f"a{i}.wav"
        sh("ffmpeg", "-y", "-i", str(mp3), "-af", f"apad,atrim=0:{d}", "-ar", "44100", "-ac", "2", str(wav))
        auds.append(wav)
        # imagem da cena
        v = tmp / f"v{i}.mp4"
        tipo, nome = c["visual"].split(":", 1)
        if tipo == "clip":
            src = MIDIA / f"clip-v-{nome}.mp4"
            total = dur(src)
            ini = min(float(c.get("ini", 0)), max(0, total - d - .1))
            loop = ["-stream_loop", "-1"] if total < d + ini else []
            sh("ffmpeg", "-y", *loop, "-ss", f"{ini}", "-t", f"{d}", "-i", str(src), "-an", "-vf",
               f"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps={FPS},eq=brightness=-0.04:saturation=1.08",
               "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", str(v))
        else:
            src = FOTOS / f"{nome}.jpg"
            n = int(d * FPS) + 1
            sh("ffmpeg", "-y", "-loop", "1", "-i", str(src), "-t", f"{d}", "-vf",
               f"scale=2160:3840:force_original_aspect_ratio=increase,crop=2160:3840,zoompan=z='1+0.10*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s=1080x1920:fps={FPS},eq=brightness=-0.05",
               "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", str(v))
        partes.append(v)
        # legendas palavra por palavra (palavra falada em amarelo)
        for b in blocos(pal):
            for k, (a, z, w) in enumerate(b):
                fim = b[k + 1][0] if k + 1 < len(b) else max(z, b[-1][1]) + .08
                txt = " ".join((f"{{\\c{AMARELO}}}{esc(x[2])}{{\\c{BRANCO}}}" if j == k else esc(x[2])) for j, x in enumerate(b))
                pop = "{\\fscx92\\fscy92\\t(0,90,\\fscx100\\fscy100)}" if k == 0 else ""
                ev.append(f"Dialogue: 1,{ts(t0 + a)},{ts(t0 + fim)},Leg,,0,0,0,,{pop}{txt}")
            srt.append((t0 + b[0][0], t0 + b[-1][1] + .08, " ".join(x[2] for x in b)))
        if c.get("titulo"):
            ap = "{\\fad(120,0)\\fscx80\\fscy80\\t(0,160,\\fscx100\\fscy100)}"
            ev.append(f"Dialogue: 2,{ts(t0)},{ts(t0 + d)},Tit,,0,0,0,,{ap}{esc(c['titulo'])}")
            if c.get("preco"):
                ev.append(f"Dialogue: 2,{ts(t0 + .15)},{ts(t0 + d)},Pre,,0,0,0,,{ap}{esc(c['preco'])}")
            if c.get("nota"):
                ev.append(f"Dialogue: 2,{ts(t0 + .3)},{ts(t0 + d)},Not,,0,0,0,,{{\\fad(150,0)}}{c['nota']}")
        t0 += d
    ev.append(f"Dialogue: 0,{ts(0)},{ts(t0)},Mar,,0,0,0,,@PARTIU.085")
    (tmp / "l.ass").write_text(ass_cab() + "\n".join(ev) + "\n", "utf-8")
    (tmp / "v.txt").write_text("".join(f"file '{p}'\n" for p in partes))
    (tmp / "a.txt").write_text("".join(f"file '{p}'\n" for p in auds))
    sh("ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(tmp / "a.txt"), str(tmp / "voz.wav"))
    sh("ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(tmp / "v.txt"), "-i", str(tmp / "voz.wav"),
       "-vf", f"ass={tmp / 'l.ass'}:fontsdir={FONTES}", "-map", "0:v", "-map", "1:a",
       "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
       "-af", "loudnorm=I=-14:TP=-1.5", "-shortest", "-movflags", "+faststart", str(saida))
    sh("ffmpeg", "-y", "-i", str(tmp / "voz.wav"), "-af", "loudnorm=I=-14:TP=-1.5", "-b:a", "192k", str(saida.with_suffix(".mp3")))
    saida.with_suffix(".srt").write_text("".join(f"{n + 1}\n{srt_ts(a)} --> {srt_ts(z)}\n{t}\n\n" for n, (a, z, t) in enumerate(srt)), "utf-8")
    print("ok", saida, f"{t0:.1f}s")


if __name__ == "__main__":
    main()
