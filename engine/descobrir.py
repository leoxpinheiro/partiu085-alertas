"""Partiu 085 — descoberta: pergunta à Travelpayouts (dados do Aviasales) os preços mais baratos saindo
de Fortaleza pra QUALQUER destino. Serve de 'pista': o robô principal confirma no Google antes de alertar."""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

RAIZ = Path(__file__).resolve().parent.parent
DOCS, DATA = RAIZ / "docs", RAIZ / "data"
TOKEN = os.environ.get("TRAVELPAYOUTS_TOKEN", "").strip()
API = "https://api.travelpayouts.com"
H = {"X-Access-Token": TOKEN, "Accept-Encoding": "gzip"}


def get(caminho: str, **p):
    r = requests.get(API + caminho, params={**p, "token": TOKEN}, headers=H, timeout=40)
    return r.status_code, (r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text[:300])


def sondar():
    out = []
    for nome, cam, p in [
        ("latest_ow", "/aviasales/v3/get_latest_prices", dict(origin="FOR", currency="brl", period_type="year", one_way="true", limit=1000, sorting="price", market="br")),
        ("latest_rt", "/aviasales/v3/get_latest_prices", dict(origin="FOR", currency="brl", period_type="year", one_way="false", limit=1000, sorting="price", market="br")),
        ("cheap_v1", "/v1/prices/cheap", dict(origin="FOR", currency="BRL")),
        ("for_dates", "/aviasales/v3/prices_for_dates", dict(origin="FOR", currency="brl", sorting="price", direct="false", limit=1000, one_way="true", market="br")),
    ]:
        try:
            st, j = get(cam, **p)
        except Exception as e:  # noqa: BLE001
            out.append(f"{nome}: ERRO {e}")
            continue
        if isinstance(j, dict):
            d = j.get("data")
            n = len(d) if isinstance(d, (list, dict)) else 0
            out.append(f"{nome}: HTTP {st} success={j.get('success')} itens={n} erro={j.get('error')}")
            itens = d if isinstance(d, list) else [dict(v, destination=k) for k, vv in (d or {}).items() for v in (vv.values() if isinstance(vv, dict) else [])]
            for x in sorted(itens, key=lambda x: x.get("value") or x.get("price") or 1e9)[:40]:
                out.append("   " + json.dumps({k: x.get(k) for k in ("destination", "depart_date", "departure_at", "return_date", "return_at", "value", "price", "number_of_changes", "transfers", "found_at", "airline")}, ensure_ascii=False))
        else:
            out.append(f"{nome}: HTTP {st} {j}")
    return "\n".join(out)


if __name__ == "__main__":
    if not TOKEN:
        print("sem TRAVELPAYOUTS_TOKEN")
        sys.exit(0)
    if "--sondar" in sys.argv:
        print(sondar())
