"""🔎 Radar de concorrentes: lê os posts públicos de perfis de viagem (API oficial do Instagram, business_discovery)
e guarda os que mais engajaram em docs/concorrentes.json, pra inspirar pautas (nunca copiar)."""
import json
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path

import requests

TOKEN = os.environ.get("IG_TOKEN", "").strip()
USER = os.environ.get("IG_USER_ID", "").strip() or "me"
DOCS = Path(__file__).resolve().parent.parent / "docs"
PERFIS = ["melhoresdestinos", "passagensimperdiveis", "milhasaovivo", "pontospravoar", "passageirodeprimeira", "viajenaviagem",
          "promocoesaereas", "viagemempauta", "falandodeviagem", "maxmilhas", "decolar", "voeazul", "voegol", "latamairlinesbrasil", "smilesoficial"]
CAMPOS = "username,followers_count,media_count,media.limit(40){caption,media_type,media_product_type,like_count,comments_count,permalink,timestamp}"


def buscar(base, u):
    r = requests.get(f"{base}/{USER}", params={"fields": f"business_discovery.username({u}){{{CAMPOS}}}", "access_token": TOKEN}, timeout=60)
    j = r.json()
    if "error" in j:
        raise RuntimeError(j["error"].get("message"))
    return j["business_discovery"]


def main():
    out = {"atualizado": datetime.now(timezone(timedelta(hours=-3))).isoformat(timespec="minutes"), "perfis": {}, "erros": {}}
    for u in PERFIS:
        for base in ("https://graph.instagram.com/v23.0", "https://graph.facebook.com/v23.0"):
            try:
                d = buscar(base, u)
                seg = d.get("followers_count") or 1
                posts = []
                for m in (d.get("media") or {}).get("data", []):
                    eng = (m.get("like_count") or 0) + 3 * (m.get("comments_count") or 0)
                    posts.append({"tipo": "reels" if m.get("media_product_type") == "REELS" else m.get("media_type", "").lower(), "curtidas": m.get("like_count"), "comentarios": m.get("comments_count"),
                                  "taxa": round(100 * eng / seg, 3), "quando": m.get("timestamp", "")[:10], "link": m.get("permalink"), "legenda": (m.get("caption") or "")[:600]})
                posts.sort(key=lambda p: -p["taxa"])
                out["perfis"][u] = {"seguidores": d.get("followers_count"), "posts": d.get("media_count"), "top": posts[:15]}
                out["erros"].pop(u, None)
                print("ok", u, d.get("followers_count"))
                break
            except Exception as e:  # noqa: BLE001
                out["erros"][u] = f"{base.split('/')[2]}: {e}"[:200]
    (DOCS / "concorrentes.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", "utf-8")
    print("erros:", out["erros"])


if __name__ == "__main__":
    main()
