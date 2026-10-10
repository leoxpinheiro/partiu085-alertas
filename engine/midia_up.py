"""Vídeos enviados pelo painel (pasta brutos/): converte pra Reels 1080x1920 (H.264, sem áudio),
gera a capa e registra em docs/videos_meus.json. Depois apaga o bruto."""
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
BRUTOS, DOCS = RAIZ / "brutos", RAIZ / "docs"
MEUS = DOCS / "videos_meus.json"


def sh(*a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(r.stderr[-800:])
    return r.stdout


def converter(src: Path, job: dict) -> dict:
    vid = job["id"]
    out, cap = DOCS / "midia" / f"clip-u-{vid}.mp4", DOCS / "midia" / f"clip-u-{vid}.jpg"
    ini, dur = max(0.0, float(job.get("inicio") or 0)), min(30.0, max(3.0, float(job.get("dur") or 15)))
    if job.get("modo") == "pronto":  # já veio adaptado do navegador: só padroniza (H.264, 30 fps)
        vf = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,format=yuv420p"
    elif job.get("modo") == "fundo":  # vídeo inteiro + fundo desfocado do próprio vídeo
        vf = ("split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=28:4,eq=brightness=-0.1[bg];"
              "[b]scale=1080:1920:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,fps=30,format=yuv420p")
    else:  # preenche a tela cortando as laterais (foco: 0 esquerda, .5 meio, 1 direita)
        f = min(1.0, max(0.0, float(job.get("foco", 0.5))))
        vf = f"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920:(iw-1080)*{f}:(ih-1920)/2,fps=30,format=yuv420p"
    sh("ffmpeg", "-y", "-loglevel", "error", "-ss", str(ini), "-i", str(src), "-t", str(dur), "-filter_complex" if "split" in vf else "-vf", vf,
       "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-movflags", "+faststart", str(out))
    sh("ffmpeg", "-y", "-loglevel", "error", "-ss", "1", "-i", str(out), "-frames:v", "1", "-q:v", "3", str(cap))
    real = float(sh("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(out)).strip() or dur)
    return {"arq": f"midia/clip-u-{vid}.mp4", "quadro": f"midia/clip-u-{vid}.jpg", "w": 1080, "h": 1920, "dur": round(real),
            "cat": job.get("cat") or "Outros", "nome": job.get("nome") or "", "enviado": datetime.now(timezone.utc).isoformat(timespec="minutes")}


def main():
    meus = json.loads(MEUS.read_text("utf-8")) if MEUS.exists() else []
    feitos = 0
    for jf in sorted(BRUTOS.glob("*.json")):
        job = json.loads(jf.read_text("utf-8"))
        src = next((p for p in BRUTOS.glob(job["id"] + ".*") if p.suffix != ".json"), None)
        if not src:
            print("sem arquivo:", jf.name)
            continue
        try:
            meus = [m for m in meus if m["arq"] != f"midia/clip-u-{job['id']}.mp4"] + [converter(src, job)]
            feitos += 1
            print("ok:", job["id"], job.get("cat"))
        except Exception as e:  # noqa: BLE001
            print("ERRO", job["id"], e)
            job["erro"] = str(e)[-300:]
            meus.append({"arq": "", "erro": job["erro"], "id": job["id"], "nome": job.get("nome", ""), "cat": job.get("cat", "")})
        src.unlink(missing_ok=True)
        jf.unlink(missing_ok=True)
    MEUS.write_text(json.dumps(meus, ensure_ascii=False, indent=1), "utf-8")
    print("convertidos:", feitos)


if __name__ == "__main__":
    main()
