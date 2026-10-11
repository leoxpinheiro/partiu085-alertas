"""Capas certeiras: busca fotos no Pixabay por tema (candidatas viram artefato pra escolher) e baixa só a escolhida.
buscar: CAPAS='{"id": ["query 1", "query 2"]}'  ->  out/<id>-<k>.jpg + out/indice.json
baixar: ESCOLHA='{"id": "largeImageURL"}'      ->  docs/midia/capa-<id>.jpg (vertical, alta)"""
import json
import os
import sys
from pathlib import Path

import requests

KEY = os.environ.get("PIXABAY_KEY", "")
RAIZ = Path(__file__).resolve().parent.parent


def busca(q, orient):
    j = requests.get("https://pixabay.com/api/", params={"key": KEY, "q": q, "image_type": "photo", "safesearch": "true", "per_page": 20,
                                                         "orientation": orient, "order": "popular", "min_height": 1000}, timeout=30).json()
    return j.get("hits", [])


def buscar():
    spec, out, ind = json.loads(os.environ["CAPAS"]), Path("out"), {}
    out.mkdir(exist_ok=True)
    for cid, qs in spec.items():
        vistos, k = set(), 0
        for q in qs:
            hits = busca(q, "vertical")[:5] + busca(q, "all")[:2]
            for h in hits:
                if h["id"] in vistos or k >= 9:
                    continue
                vistos.add(h["id"])
                k += 1
                (out / f"{cid}-{k}.jpg").write_bytes(requests.get(h["webformatURL"], timeout=30).content)
                ind[f"{cid}-{k}"] = {"url": h["largeImageURL"], "w": h["imageWidth"], "h": h["imageHeight"], "tags": h["tags"], "q": q}
        print(cid, k)
    (out / "indice.json").write_text(json.dumps(ind, indent=1))


def baixar():
    for cid, url in json.loads(os.environ["ESCOLHA"]).items():
        alvo = RAIZ / "docs" / "midia" / f"capa-{cid}.jpg"
        alvo.write_bytes(requests.get(url, timeout=60).content)
        print("ok", alvo.name, alvo.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    if not KEY:
        sys.exit("sem PIXABAY_KEY")
    buscar() if sys.argv[1] == "buscar" else baixar()
