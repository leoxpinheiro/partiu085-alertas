"""Partiu 085 — Instagram: publica os posts aprovados da fila (docs/ig_fila.json) no horário marcado
e guarda os números da conta e de cada post (docs/ig_conta.json). Usa a API oficial do Instagram
(login do Instagram, conta profissional). Segredos: IG_TOKEN e IG_USER_ID."""
from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

RAIZ = Path(__file__).resolve().parent.parent
DOCS = RAIZ / "docs"
FILA, CONTA, STATUS = DOCS / "ig_fila.json", DOCS / "ig_conta.json", DOCS / "ig_status.json"
# a fila é escrita só pelo painel; o robô escreve só o status (assim um não apaga o que o outro salvou)
TOKEN = os.environ.get("IG_TOKEN", "").strip()
USER = os.environ.get("IG_USER_ID", "").strip() or "me"
API = "https://graph.instagram.com/v23.0"
REPO = os.environ.get("GITHUB_REPOSITORY", "leoxpinheiro/partiu085-alertas")
FUSO = timezone(timedelta(hours=-3))
APENAS = os.environ.get("IG_POST", "").strip()   # publicar já um post específico (botão "Publicar agora")


def ler(p, padrao):
    try:
        return json.loads(p.read_text("utf-8"))
    except Exception:  # noqa: BLE001
        return padrao


def salvar(p, obj):
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=1) + "\n", "utf-8")


def api(metodo, caminho, **params):
    params["access_token"] = TOKEN
    r = requests.request(metodo, f"{API}/{caminho}", params=params if metodo == "GET" else None, data=params if metodo != "GET" else None, timeout=60)
    j = r.json() if r.content else {}
    if not r.ok or "error" in j:
        raise RuntimeError((j.get("error") or {}).get("message") or f"HTTP {r.status_code}")
    return j


def url_img(caminho: str) -> str:
    # raw do GitHub: fica disponível na hora (o Pages demora ~1 min pra atualizar)
    return f"https://raw.githubusercontent.com/{REPO}/main/docs/{caminho}"


def esperar(container: str):
    for _ in range(30):
        st = api("GET", container, fields="status_code").get("status_code")
        if st == "FINISHED":
            return
        if st in ("ERROR", "EXPIRED"):
            raise RuntimeError(f"Instagram recusou a imagem ({st})")
        time.sleep(4)
    raise RuntimeError("Instagram demorou demais pra processar")


def publicar(p: dict) -> dict:
    imgs = [url_img(x) for x in p["imagens"]]
    if p.get("tipo") == "story":
        c = api("POST", f"{USER}/media", image_url=imgs[0], media_type="STORIES")["id"]
    elif len(imgs) > 1:
        filhos = [api("POST", f"{USER}/media", image_url=u, is_carousel_item="true")["id"] for u in imgs[:10]]
        for f in filhos:
            esperar(f)
        c = api("POST", f"{USER}/media", media_type="CAROUSEL", children=",".join(filhos), caption=p.get("legenda", ""))["id"]
    else:
        c = api("POST", f"{USER}/media", image_url=imgs[0], caption=p.get("legenda", ""))["id"]
    esperar(c)
    mid = api("POST", f"{USER}/media_publish", creation_id=c)["id"]
    info = {}
    try:
        info = api("GET", mid, fields="permalink,timestamp")
    except Exception:  # noqa: BLE001
        pass
    return {"media_id": mid, "link": info.get("permalink", ""), "publicado_em": datetime.now(FUSO).isoformat(timespec="minutes")}


def metricas(st: dict) -> None:
    lim = (datetime.now(FUSO) - timedelta(days=30)).isoformat()
    for p in st.values():
        if p.get("status") != "publicado" or not p.get("media_id") or p.get("publicado_em", "") < lim:
            continue
        m = {}
        try:
            b = api("GET", p["media_id"], fields="like_count,comments_count,permalink")
            m.update({"curtidas": b.get("like_count"), "comentarios": b.get("comments_count")})
            p["link"] = p.get("link") or b.get("permalink", "")
        except Exception:  # noqa: BLE001
            pass
        for metric in ("reach", "saved", "shares", "views"):
            try:
                d = api("GET", f"{p['media_id']}/insights", metric=metric).get("data") or []
                if d:
                    m[{"reach": "alcance", "saved": "salvos", "shares": "compartilhamentos", "views": "visualizacoes"}[metric]] = (d[0].get("values") or [{}])[0].get("value")
            except Exception:  # noqa: BLE001
                pass
        if m:
            p["metricas"] = {**m, "quando": datetime.now(FUSO).isoformat(timespec="minutes")}


def main():
    fila = ler(FILA, [])
    st = ler(STATUS, {})
    conta = ler(CONTA, {})
    if not TOKEN:
        if "IG_TOKEN" in (conta.get("erro") or ""):
            return
        conta.update({"ok": False, "erro": "Falta a chave IG_TOKEN (Ajustes › Integrações).", "quando": datetime.now(FUSO).isoformat(timespec="minutes")})
        salvar(CONTA, conta)
        print("sem IG_TOKEN")
        return
    agora = datetime.now(FUSO).isoformat(timespec="minutes")
    feitos = 0
    for p in fila:
        s_ = st.get(p["id"], {})
        if s_.get("status") == "publicado":
            continue
        if s_.get("status") == "erro" and int(s_.get("tentativa", 0)) >= int(p.get("tentativa", 0)) and p.get("id") != APENAS:
            continue
        pronto = p.get("aprovado") and (p.get("quando", "9") <= agora or p.get("id") == APENAS)
        if not pronto or feitos >= 5:
            continue
        try:
            st[p["id"]] = {"status": "publicado", **publicar(p)}
            feitos += 1
            print(f"publicado: {p.get('titulo')} {st[p['id']].get('link')}")
        except Exception as e:  # noqa: BLE001
            st[p["id"]] = {"status": "erro", "erro": str(e)[:200], "tentativa": int(p.get("tentativa", 0)), "quando": agora}
            print(f"! {p.get('titulo')}: {e}")
    velho = (datetime.now(FUSO) - timedelta(minutes=55)).isoformat()
    if not feitos and conta.get("ok") and conta.get("quando", "") > velho and not APENAS:
        salvar(STATUS, st)
        return  # números da conta: no máximo 1 vez por hora (evita salvar a cada 15 min)
    try:
        u = api("GET", USER, fields="username,followers_count,follows_count,media_count")
        hist = conta.get("historico", [])
        hoje = agora[:10]
        hist = [h for h in hist if h["dia"] != hoje] + [{"dia": hoje, "seguidores": u.get("followers_count")}]
        conta.update({"ok": True, "erro": "", "usuario": u.get("username"), "seguidores": u.get("followers_count"), "seguindo": u.get("follows_count"),
                      "posts": u.get("media_count"), "historico": hist[-120:], "quando": agora})
        try:
            lim = api("GET", f"{USER}/content_publishing_limit", fields="quota_usage,config")
            conta["limite"] = (lim.get("data") or [{}])[0]
        except Exception:  # noqa: BLE001
            pass
        if not conta.get("renovado") or conta["renovado"] < (datetime.now(FUSO) - timedelta(days=20)).isoformat():
            try:
                r = requests.get("https://graph.instagram.com/refresh_access_token", params={"grant_type": "ig_refresh_token", "access_token": TOKEN}, timeout=30).json()
                if r.get("expires_in"):
                    conta["renovado"] = agora
                    conta["expira"] = (datetime.now(FUSO) + timedelta(seconds=int(r["expires_in"]))).isoformat(timespec="minutes")
            except Exception:  # noqa: BLE001
                pass
    except Exception as e:  # noqa: BLE001
        conta.update({"ok": False, "erro": str(e)[:200], "quando": agora})
    metricas(st)
    salvar(STATUS, st)
    salvar(CONTA, conta)


if __name__ == "__main__":
    main()
    sys.exit(0)
