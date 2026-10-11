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
    "compras": "shopping bags woman happy", "cartao": "credit card payment smartphone",
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


# ---------- banco de vídeos em alta qualidade (Pexels se tiver chave, senão Pixabay) ----------
HQ = {  # nome: (categoria no painel, buscas em ordem)
    "fortaleza": ("Fortaleza", ["fortaleza ceara", "fortaleza brazil beach", "northeast brazil beach"]),
    "aeroporto": ("Aeroporto", ["airport terminal travelers", "airport departure board"]),
    "janela": ("Voo", ["airplane window view clouds"]), "asa": ("Voo", ["airplane wing sunset"]),
    "decolagem": ("Voo", ["airplane takeoff runway"]), "pouso": ("Voo", ["airplane landing"]),
    "nuvens": ("Voo", ["above the clouds sunset"]), "praia": ("Praia", ["tropical beach aerial", "beach waves drone"]),
    "paisagem": ("Destinos", ["mountain lake aerial", "european city aerial", "lisbon"]), "mala": ("Viagem", ["suitcase travel woman airport"]),
}
PEXELS = os.environ.get("PEXELS_KEY", "")


def candidatos(q):
    """Lista (url, largura, altura, duração, página, crédito), vídeos em pé primeiro."""
    out = []
    if PEXELS:
        try:
            j = requests.get("https://api.pexels.com/videos/search", headers={"Authorization": PEXELS}, params={"query": q, "orientation": "portrait", "per_page": 12, "size": "medium"}, timeout=30).json()
            for v in j.get("videos", []):
                fs = sorted([f for f in v.get("video_files", []) if f.get("width") and f.get("height") and f["height"] >= 1280 and f.get("file_type") == "video/mp4"], key=lambda f: abs(f["height"] - 1920))
                if fs and 5 <= (v.get("duration") or 0) <= 60:
                    out.append((fs[0]["link"], fs[0]["width"], fs[0]["height"], v.get("duration"), v.get("url", ""), "Pexels"))
        except Exception as e:  # noqa: BLE001
            print("pexels:", e)
    if KEY:
        j = requests.get("https://pixabay.com/api/videos/", params={"key": KEY, "q": q, "safesearch": "true", "per_page": 20, "order": "popular"}, timeout=30).json()
        for h in j.get("hits", []):
            vs = h.get("videos", {})
            r = vs.get("large") if (vs.get("large") or {}).get("url") else vs.get("medium") or {}
            if r.get("url") and (r.get("size") or 0) < 90_000_000 and 5 <= (h.get("duration") or 0) <= 60:
                out.append((r["url"], r.get("width") or 0, r.get("height") or 0, h.get("duration"), h.get("pageURL", ""), "Pixabay"))
    vert = [o for o in out if o[2] > o[1]]
    return vert + sorted([o for o in out if o[2] <= o[1]], key=lambda o: -o[1])


def banco_hq(nomes, por=3):
    import shutil
    import subprocess
    if not shutil.which("ffmpeg"):
        subprocess.run("sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg", shell=True, check=False)
    man = json.loads(MAN.read_text("utf-8")) if MAN.exists() else {"fotos": {}, "videos": {}}
    PASTA.mkdir(parents=True, exist_ok=True)
    for nome in nomes:
        cat, buscas = HQ[nome]
        vistos, L = set(), []
        for q in buscas:
            for c in candidatos(q):
                if len(L) >= por:
                    break
                if c[0] in vistos or (c[1] < 1900 and c[2] < 1900):
                    continue  # só Full HD pra cima (qualidade)
                vistos.add(c[0])
                k = len(L) + 1
                bruto, dst = PASTA / f"_tmp-{nome}.mp4", PASTA / f"clip-v-{nome}-{k}.mp4"
                try:
                    baixar(c[0], bruto)
                    ini = "1" if (c[3] or 0) > 12 else "0"
                    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", ini, "-i", str(bruto), "-t", "10", "-an",
                                    "-vf", "scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,fps=30,format=yuv420p",
                                    "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-maxrate", "6M", "-bufsize", "12M", "-movflags", "+faststart", str(dst)], check=True)
                    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "2", "-i", str(dst), "-frames:v", "1", "-q:v", "3", str(dst.with_suffix(".jpg"))], check=True)
                    L.append({"arq": f"midia/{dst.name}", "quadro": f"midia/{dst.stem}.jpg", "w": 1080, "h": 1920, "dur": 10, "cat": cat, "pagina": c[4], "fonte": c[5], "hq": True})
                    print(nome, k, c[5], c[1], "x", c[2], dst.stat().st_size // 1024, "KB")
                except Exception as e:  # noqa: BLE001
                    print("!", nome, e)
                finally:
                    bruto.unlink(missing_ok=True)
            if len(L) >= por:
                break
        if L:
            for v in (man["videos"].get("v-" + nome) or [])[len(L):]:  # sobras antigas com número maior: apaga
                for ext in (".mp4", ".jpg"):
                    (RAIZ / "docs" / v["arq"]).with_suffix(ext).unlink(missing_ok=True)
            man["videos"]["v-" + nome] = L
    MAN.write_text(json.dumps(man, ensure_ascii=False, indent=1) + "\n", "utf-8")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1].startswith("hq"):
        banco_hq([n for n in sys.argv[1][3:].split(",") if n in HQ] if ":" in sys.argv[1] else list(HQ))
    else:
        main()
