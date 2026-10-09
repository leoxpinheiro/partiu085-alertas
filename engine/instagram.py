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


# ---------- desempenho do perfil (todos os posts, inclusive os postados à mão) ----------
CAMPOS_MIDIA = "id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count,thumbnail_url,media_url"
NOMES = {"reach": "alcance", "saved": "salvos", "shares": "compartilhamentos", "views": "visualizacoes", "total_interactions": "interacoes",
         "replies": "respostas", "likes": "curtidas", "comments": "comentarios", "profile_visits": "visitas_perfil", "follows": "seguiram"}


def insights_midia(mid: str, metricas_: tuple) -> dict:
    out = {}
    try:
        d = api("GET", f"{mid}/insights", metric=",".join(metricas_)).get("data") or []
        for x in d:
            out[NOMES.get(x["name"], x["name"])] = (x.get("values") or [{}])[0].get("value", x.get("total_value", {}).get("value"))
        return out
    except Exception:  # noqa: BLE001
        pass
    for m in metricas_:  # uma por vez (alguma métrica pode não valer pra esse tipo de post)
        try:
            d = api("GET", f"{mid}/insights", metric=m).get("data") or []
            if d:
                out[NOMES.get(m, m)] = (d[0].get("values") or [{}])[0].get("value")
        except Exception:  # noqa: BLE001
            pass
    return out


def ler_midias(conta: dict) -> None:
    antigos = {m["id"]: m for m in conta.get("midias", [])}
    lista, url, pag = [], f"{USER}/media", 0
    params = {"fields": CAMPOS_MIDIA, "limit": 50}
    while url and pag < 2 and len(lista) < 80:
        j = api("GET", url, **params)
        lista += j.get("data", [])
        nxt = (j.get("paging") or {}).get("cursors", {}).get("after")
        if not nxt or not (j.get("paging") or {}).get("next"):
            break
        params["after"] = nxt
        pag += 1
    agora = datetime.now(FUSO)
    saida = []
    for i, m in enumerate(lista):
        ant = antigos.get(m["id"], {})
        quando = m.get("timestamp", "")
        try:
            idade = (agora - datetime.fromisoformat(quando.replace("+0000", "+00:00"))).days
        except Exception:  # noqa: BLE001
            idade = 999
        tipo = "reels" if m.get("media_product_type") == "REELS" else {"CAROUSEL_ALBUM": "carrossel", "VIDEO": "video"}.get(m.get("media_type"), "foto")
        item = {"id": m["id"], "tipo": tipo, "legenda": (m.get("caption") or "")[:300], "link": m.get("permalink", ""), "quando": quando,
                "thumb": m.get("thumbnail_url") or m.get("media_url") or ant.get("thumb", ""),
                "curtidas": m.get("like_count"), "comentarios": m.get("comments_count"), **{k: ant.get(k) for k in ("alcance", "salvos", "compartilhamentos", "visualizacoes", "interacoes", "visitas_perfil", "seguiram")}}
        # insights: posts novos (até 10 dias) a cada hora; mais velhos 1x por dia; só os 40 mais recentes
        if i < 40 and (idade <= 10 or ant.get("insights_dia") != agora.date().isoformat()):
            met = ("reach", "saved", "shares", "views", "total_interactions", "profile_visits", "follows") if tipo != "reels" else ("reach", "saved", "shares", "views", "total_interactions")
            item.update({k: v for k, v in insights_midia(m["id"], met).items() if v is not None})
            item["insights_dia"] = agora.date().isoformat()
        else:
            item["insights_dia"] = ant.get("insights_dia")
        saida.append(item)
    conta["midias"] = saida


def ler_stories(conta: dict) -> None:
    guard = {s["id"]: s for s in conta.get("stories", [])}
    try:
        for s in api("GET", f"{USER}/stories", fields="id,media_type,permalink,timestamp,thumbnail_url,media_url").get("data", []):
            it = {**guard.get(s["id"], {}), "id": s["id"], "quando": s.get("timestamp", ""), "link": s.get("permalink", ""), "thumb": s.get("thumbnail_url") or s.get("media_url") or ""}
            it.update({k: v for k, v in insights_midia(s["id"], ("reach", "views", "replies", "shares", "total_interactions", "follows", "profile_visits")).items() if v is not None})
            guard[s["id"]] = it
    except Exception as e:  # noqa: BLE001
        print("stories:", e)
    conta["stories"] = sorted(guard.values(), key=lambda x: x.get("quando", ""), reverse=True)[:80]


def ts(d: datetime) -> int:
    return int(d.timestamp())


def ler_dias(conta: dict) -> None:
    """Números da conta por dia (últimos 30): alcance, visualizações, interações, visitas ao perfil, quem seguiu e deixou de seguir."""
    dias = conta.get("dias", {})
    hoje = datetime.now(FUSO).replace(hour=0, minute=0, second=0, microsecond=0)
    alvo = [hoje - timedelta(days=k) for k in range(0, 30)]
    feitos = 0
    for d in alvo:
        chave = d.date().isoformat()
        fechado = dias.get(chave, {}).get("fechado")
        if fechado and d < hoje - timedelta(days=2):
            continue
        if feitos >= 12:  # não estoura o limite de chamadas: completa o histórico aos poucos
            break
        reg = dict(dias.get(chave, {}))
        try:
            j = api("GET", f"{USER}/insights", metric="reach,views,accounts_engaged,total_interactions,likes,comments,shares,saves,profile_links_taps",
                    period="day", metric_type="total_value", since=ts(d), until=ts(d + timedelta(days=1)))
            for x in j.get("data", []):
                reg[{"reach": "alcance", "views": "visualizacoes", "accounts_engaged": "contas_engajadas", "total_interactions": "interacoes", "likes": "curtidas",
                     "comments": "comentarios", "shares": "compartilhamentos", "saves": "salvos", "profile_links_taps": "cliques_link"}.get(x["name"], x["name"])] = (x.get("total_value") or {}).get("value")
        except Exception as e:  # noqa: BLE001
            reg["erro"] = str(e)[:120]
        try:
            j = api("GET", f"{USER}/insights", metric="follows_and_unfollows", period="day", metric_type="total_value", breakdown="follow_type",
                    since=ts(d), until=ts(d + timedelta(days=1)))
            for x in j.get("data", []):
                for b in ((x.get("total_value") or {}).get("breakdowns") or [{}])[0].get("results", []):
                    t = (b.get("dimension_values") or [""])[0]
                    if t == "FOLLOWER":
                        reg["seguiram"] = b.get("value")
                    elif t == "NON_FOLLOWER":
                        reg["deixaram"] = b.get("value")
            reg.setdefault("seguiram", 0)
            reg.setdefault("deixaram", 0)
        except Exception as e:  # noqa: BLE001
            reg["erro_seg"] = str(e)[:120]
        reg["fechado"] = d < hoje - timedelta(days=1)
        dias[chave] = reg
        feitos += 1
    conta["dias"] = dict(sorted(dias.items())[-120:])


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
                      "posts": u.get("media_count"), "historico": hist[-400:], "quando": agora})
        for etapa in (ler_midias, ler_stories, ler_dias):
            try:
                etapa(conta)
            except Exception as e:  # noqa: BLE001
                print(etapa.__name__, e)
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
