"""💰 Comissões: puxa da Travelpayouts os cliques e as vendas dos links de afiliado (últimos 60 dias) e grava em docs/afiliados.json."""
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

DOCS = Path(__file__).resolve().parent.parent / "docs"
TOKEN = os.environ.get("TRAVELPAYOUTS_TOKEN", "").strip()
FUSO = timezone(timedelta(hours=-3))
URL = "https://api.travelpayouts.com/statistics/v1/execute_query"


def consulta(corpo):
    r = requests.post(URL, headers={"X-Access-Token": TOKEN, "Content-Type": "application/json"}, json=corpo, timeout=60)
    try:
        j = r.json() if r.content else {}
    except ValueError:
        raise RuntimeError(f"HTTP {r.status_code}: {r.text[:200]}")
    if not r.ok:
        raise RuntimeError(f"HTTP {r.status_code}: {str(j)[:200]}")
    return j.get("results", [])


def main():
    agora = datetime.now(FUSO)
    out = {"atualizado": agora.isoformat(timespec="minutes"), "ok": False}
    if not TOKEN:
        out["erro"] = "Falta TRAVELPAYOUTS_TOKEN"
    else:
        ini = (agora - timedelta(days=60)).date().isoformat()
        base = [{"field": "date", "op": "ge", "value": ini}]
        campos = ["redirect_count", "paid_actions_count", "processing_actions_count", "cancelled_actions_count", "paid_profit_eur_sum", "processing_profit_eur_sum"]
        try:
            out["por_dia"] = consulta({"fields": ["date"] + campos, "filters": base, "group": ["date"], "sort": [{"field": "date", "order": "asc"}], "limit": 100})
            try:
                out["por_programa"] = consulta({"fields": ["campaign_id"] + campos, "filters": base, "group": ["campaign_id"], "limit": 100})
            except Exception as e:  # noqa: BLE001
                out["erro_programa"] = str(e)[:200]
            try:
                out["por_canal"] = consulta({"fields": ["sub_id"] + campos, "filters": base, "group": ["sub_id"], "limit": 100})
            except Exception as e:  # noqa: BLE001
                out["erro_canal"] = str(e)[:200]
            out["ok"] = True
        except Exception as e:  # noqa: BLE001
            out["erro"] = str(e)[:300]
    (DOCS / "afiliados.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", "utf-8")
    print(json.dumps(out, ensure_ascii=False)[:1500])


if __name__ == "__main__":
    main()
