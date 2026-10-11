"""Pasta mágica: vídeos jogados em partiu085-radar/videos-novos/<Categoria>/ viram Reels no banco do painel.
Converte pra 1080x1920 (em pé, alta qualidade), registra em docs/videos_meus.json e move o original pra _enviados/."""
import json
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DOCS = RAIZ / "docs"
MEUS = DOCS / "videos_meus.json"
EXT = {".mp4", ".mov", ".m4v", ".avi", ".mkv", ".webm", ".hevc"}
MAX_S = 20  # pega os primeiros 20s (Reels curto prende mais)


def sh(*a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(r.stderr[-500:])
    return r.stdout


def main(pasta: Path):
    meus = json.loads(MEUS.read_text("utf-8")) if MEUS.exists() else []
    feitos = 0
    for f in sorted(pasta.rglob("*")):
        if not f.is_file() or f.suffix.lower() not in EXT or "_enviados" in f.parts or f.name.startswith("."):
            continue
        cat = f.parent.name if f.parent != pasta else "Outros"
        vid = "p" + hex(int(time.time() * 1000))[2:]
        out, cap = DOCS / "midia" / f"clip-u-{vid}.mp4", DOCS / "midia" / f"clip-u-{vid}.jpg"
        try:
            dur = float(sh("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)).strip() or 0)
            ini = 1 if dur > MAX_S + 4 else 0
            sh("ffmpeg", "-y", "-loglevel", "error", "-ss", str(ini), "-i", str(f), "-t", str(MAX_S), "-an",
               "-vf", "scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,fps=30,format=yuv420p",
               "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high", "-maxrate", "12M", "-bufsize", "24M", "-movflags", "+faststart", str(out))
            sh("ffmpeg", "-y", "-loglevel", "error", "-ss", "1", "-i", str(out), "-frames:v", "1", "-q:v", "3", str(cap))
            real = float(sh("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(out)).strip() or MAX_S)
            meus.append({"arq": f"midia/{out.name}", "quadro": f"midia/{cap.name}", "w": 1080, "h": 1920, "dur": round(real), "cat": cat, "nome": f.stem,
                         "enviado": datetime.now(timezone(timedelta(hours=-3))).isoformat(timespec="minutes")})
            destino = pasta / "_enviados" / cat
            destino.mkdir(parents=True, exist_ok=True)
            f.rename(destino / f.name)
            feitos += 1
            print("ok:", cat, f.name, "->", out.name, out.stat().st_size // 1024, "KB")
        except Exception as e:  # noqa: BLE001
            print("ERRO", f.name, e)
    MEUS.write_text(json.dumps(meus, ensure_ascii=False, indent=1), "utf-8")
    print("vídeos novos:", feitos)


if __name__ == "__main__":
    main(Path(sys.argv[1]))
