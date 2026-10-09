"""Envia no Telegram um post feito no painel (Converter texto): imagem + texto, no canal de milhas ou no de dinheiro."""
import os
import sys
from pathlib import Path

import requests

RAIZ = Path(__file__).resolve().parent.parent
TOK = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CANAL = os.environ.get("CANAL", "milhas")
CHAT = os.environ.get("TELEGRAM_CHAT_MILHAS" if CANAL == "milhas" else "TELEGRAM_CHAT_ID", "") or os.environ.get("TELEGRAM_CHAT_ID", "")
TEXTO = os.environ.get("TEXTO", "").strip()
IMG = os.environ.get("IMAGEM", "").strip()
API = f"https://api.telegram.org/bot{TOK}"


def manda(metodo, dados, arquivos=None):
    for modo in ("Markdown", None):
        d = dict(dados)
        if modo:
            d["parse_mode"] = modo
        r = requests.post(f"{API}/{metodo}", data=d, files=arquivos, timeout=60).json()
        if r.get("ok"):
            return r
        print("telegram:", r.get("description"))
        if arquivos:
            for f in arquivos.values():
                f.seek(0)
    raise SystemExit(1)


if not (TOK and CHAT and (TEXTO or IMG)):
    print("faltou token, canal ou conteúdo")
    sys.exit(1)
foto = RAIZ / "docs" / IMG if IMG else None
if foto and foto.exists():
    if len(TEXTO) <= 1000:
        manda("sendPhoto", {"chat_id": CHAT, "caption": TEXTO}, {"photo": open(foto, "rb")})
    else:
        manda("sendPhoto", {"chat_id": CHAT}, {"photo": open(foto, "rb")})
        manda("sendMessage", {"chat_id": CHAT, "text": TEXTO, "disable_web_page_preview": "true"})
else:
    manda("sendMessage", {"chat_id": CHAT, "text": TEXTO, "disable_web_page_preview": "true"})
print("enviado no canal", CANAL)
