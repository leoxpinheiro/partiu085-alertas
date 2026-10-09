"""Banco de mídia real (Pixabay): baixa fotos e vídeos de viagem pra usar nos posts e Reels.
Gera docs/midia/*.jpg|mp4 e docs/midia.json. Chave: PIXABAY_KEY."""
import json
import os
import re
import sys
from pathlib import Path

import requests

RAIZ = Path(__file__).resolve().parent.parent
PASTA = RAIZ / "docs" / "midia"
MAN = RAIZ / "docs" / "midia.json"
KEY = os.environ.get("PIXABAY_KEY", "")

FOTOS = {
    "power-bank": "power bank charging phone", "frascos": "travel toiletries bottles", "travesseiro": "travel pillow",
    "documentos": "passport boarding pass phone", "casaco": "cozy sweater travel woman", "garrafa": "reusable water bottle travel",
    "cadeado": "luggage lock suitcase", "mala": "suitcase packing", "aeroporto": "airport terminal window", "janela": "airplane window view",
    "asa": "airplane wing clouds", "passageiros": "airplane cabin passengers", "praia": "tropical beach", "ferias": "woman relaxing beach vacation",
    "trabalho": "tired office worker laptop", "calendario": "calendar planning travel", "celular-viagem": "smartphone travel booking",
}
VIDEOS = {
    "v-janela": "airplane window", "v-asa": "airplane wing clouds", "v-decolagem": "airplane takeoff", "v-aeroporto": "airport terminal people",
    "v-nuvens": "above clouds sunset", "v-praia": "beach waves aerial", "v-mala": "suitcase airport walking", "v-pouso": "airplane landing",
}


def baixar(url, alvo):
    r = requests.get(url, timeout=120)
    r.raise_for_status()
    alvo.write_bytes(r.content)


def main():
    if not KEY:
        print("sem PIXABAY_KEY")
        sys.exit(1)
    PASTA.mkdir(parents=True, exist_ok=True)
    man = json.loads(MAN.read_text("utf-8")) if MAN.exists() else {"fotos": {}, "videos": {}}
    so = sys.argv[1:] and sys.argv[1].split(",")
    for nome, q in FOTOS.items():
        if (so and nome not in so) or (not so and man["fotos"].get(nome)):
            continue
        j = requests.get("https://pixabay.com/api/", params={"key": KEY, "q": q, "image_type": "photo", "safesearch": "true", "per_page": 12, "min_width": 1200, "order": "popular"}, timeout=30).json()
        L = []
        for k, h in enumerate(j.get("hits", [])[:4]):
            alvo = PASTA / f"{nome}-{k + 1}.jpg"
            try:
                baixar(h.get("largeImageURL") or h["webformatURL"], alvo)
                L.append({"arq": f"midia/{alvo.name}", "w": h.get("imageWidth"), "h": h.get("imageHeight"), "tags": h.get("tags", ""), "pagina": h.get("pageURL", "")})
            except Exception as e:  # noqa: BLE001
                print("!", nome, e)
        man["fotos"][nome] = L
        print(nome, len(L))
    for nome, q in VIDEOS.items():
        if (so and nome not in so) or (not so and man["videos"].get(nome)):
            continue
        j = requests.get("https://pixabay.com/api/videos/", params={"key": KEY, "q": q, "safesearch": "true", "per_page": 10, "order": "popular"}, timeout=30).json()
        L = []
        for k, h in enumerate(j.get("hits", [])[:3]):
            v = h.get("videos", {})
            esc = v.get("medium") or v.get("small") or {}
            if not esc.get("url") or (esc.get("size") or 0) > 25_000_000:
                continue
            alvo = PASTA / f"{nome}-{k + 1}.mp4"
            try:
                baixar(esc["url"], alvo)
                L.append({"arq": f"midia/{alvo.name}", "w": esc.get("width"), "h": esc.get("height"), "dur": h.get("duration"), "tags": h.get("tags", ""), "pagina": h.get("pageURL", ""),
                          "thumb": esc.get("thumbnail", "")})
            except Exception as e:  # noqa: BLE001
                print("!", nome, e)
        man["videos"][nome] = L
        print(nome, len(L))
    clipes(man)
    MAN.write_text(json.dumps(man, ensure_ascii=False, indent=1) + "\n", "utf-8")


def clipes(man):
    """Transforma cada vídeo em um clipe vertical 1080x1920 de 9s, leve, sem áudio (pra servir de fundo dos Reels)."""
    import shutil
    import subprocess
    if not shutil.which("ffmpeg"):
        subprocess.run("sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg", shell=True, check=False)
    for nome, L in man["videos"].items():
        for v in L:
            src = RAIZ / "docs" / v["arq"]
            if v["arq"].startswith("midia/clip-") or not src.exists():
                continue
            dst = PASTA / ("clip-" + src.stem + ".mp4")
            ini = "1" if (v.get("dur") or 0) > 11 else "0"
            r = subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", ini, "-i", str(src), "-t", "9", "-an",
                                "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,format=yuv420p",
                                "-c:v", "libx264", "-preset", "veryfast", "-crf", "27", "-movflags", "+faststart", str(dst)])
            if r.returncode == 0:
                subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "2", "-i", str(dst), "-frames:v", "1", "-q:v", "4", str(dst.with_suffix(".jpg"))])
                src.unlink()
                v["arq"], v["quadro"], v["w"], v["h"] = f"midia/{dst.name}", f"midia/{dst.stem}.jpg", 1080, 1920
                print("clipe", dst.name, dst.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
