"""Relatório semanal do Instagram no Telegram do admin (toda segunda de manhã)."""
import json
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

RAIZ = Path(__file__).resolve().parent.parent
DOCS = RAIZ / "docs"
ARQ_ADMIN = RAIZ / "engine" / ".telegram_admin"
CODIGO = "partiu085 admin 6921"
FUSO = timezone(timedelta(hours=-3))
TOK = os.environ.get("TELEGRAM_BOT_TOKEN", "")


def admin_id() -> str:
    """ID do admin: secret, arquivo salvo, ou quem mandou o código pro bot."""
    if os.environ.get("TELEGRAM_ADMIN_ID"):
        return os.environ["TELEGRAM_ADMIN_ID"]
    if ARQ_ADMIN.exists():
        return ARQ_ADMIN.read_text().strip()
    try:
        for u in requests.get(f"https://api.telegram.org/bot{TOK}/getUpdates", timeout=20).json().get("result", []):
            m = u.get("message") or {}
            if CODIGO in (m.get("text") or "").lower():
                cid = str(m["chat"]["id"])
                ARQ_ADMIN.write_text(cid)
                requests.post(f"https://api.telegram.org/bot{TOK}/sendMessage", data={"chat_id": cid, "text": "✅ Pronto! Você vai receber aqui o relatório semanal do Instagram e os avisos do Partiu 085."}, timeout=20)
                return cid
    except Exception as e:  # noqa: BLE001
        print("getUpdates:", e)
    return ""


def n(v):
    return f"{round(v or 0):,}".replace(",", ".")


def main():
    c = json.loads((DOCS / "ig_conta.json").read_text("utf-8"))
    hoje = datetime.now(FUSO).date()
    ini = (hoje - timedelta(days=7)).isoformat()
    dias = {d: v for d, v in (c.get("dias") or {}).items() if ini <= d < hoje.isoformat()}
    s = lambda k: sum((v.get(k) or 0) for v in dias.values())
    posts = [m for m in c.get("midias", []) if m.get("quando", "")[:10] >= ini]
    top = sorted(posts, key=lambda m: -(m.get("alcance") or 0))[:3]
    comp = sorted(posts, key=lambda m: -(m.get("compartilhamentos") or 0))[:1]
    tipos = {}
    for m in posts:
        t = tipos.setdefault(m["tipo"], [0, 0])
        t[0] += m.get("alcance") or 0
        t[1] += 1
    fmt = sorted(((k, v[0] / v[1]) for k, v in tipos.items() if v[1]), key=lambda x: -x[1])
    titulo = lambda m: re.sub(r"\s+", " ", (m.get("legenda") or "").split("\n")[0])[:60]
    hist = c.get("historico", [])
    saldo = (hist[-1]["seguidores"] - next((h["seguidores"] for h in hist if h["dia"] >= ini), hist[-1]["seguidores"])) if hist else s("seguiram") - s("deixaram")
    txt = [f"📊 PARTIU 085 · semana {(hoje - timedelta(days=7)).strftime('%d/%m')} a {(hoje - timedelta(days=1)).strftime('%d/%m')}", "",
           f"👥 Seguidores: {n(c.get('seguidores'))} ({'+' if saldo >= 0 else ''}{n(saldo)})",
           f"➕ Entraram {n(s('seguiram'))} · ➖ saíram {n(s('deixaram'))}",
           f"👁 Alcance {n(s('alcance'))} · {n(s('visualizacoes'))} visualizações",
           f"🔁 {n(s('compartilhamentos'))} compartilhamentos · 🔖 {n(s('salvos'))} salvos", f"📝 {len(posts)} posts na semana", ""]
    if top:
        txt += ["🏆 Mais alcance:"] + [f"{i + 1}. {titulo(m)} ({n(m.get('alcance'))})" for i, m in enumerate(top)] + [""]
    if comp and (comp[0].get("compartilhamentos") or 0) > 0:
        txt += [f"🔁 Mais compartilhado: {titulo(comp[0])} ({n(comp[0].get('compartilhamentos'))})", ""]
    if fmt:
        txt += ["🎯 Formato campeão: " + fmt[0][0] + f" (média {n(fmt[0][1])} de alcance)", ""]
    txt += ["👉 Detalhes no painel: Instagram › Desempenho"]
    cid = admin_id()
    print("\n".join(txt))
    if TOK and cid:
        requests.post(f"https://api.telegram.org/bot{TOK}/sendMessage", data={"chat_id": cid, "text": "\n".join(txt)}, timeout=20)
        print("enviado")
    else:
        print("sem admin do Telegram: mande o código pro bot")


if __name__ == "__main__":
    main()
