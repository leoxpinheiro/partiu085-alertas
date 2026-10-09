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


def avisar_admin(msg: str) -> None:
    tok, chat = os.environ.get("TELEGRAM_BOT_TOKEN", ""), os.environ.get("TELEGRAM_ADMIN_ID", "")
    if tok and chat:
        try:
            requests.post(f"https://api.telegram.org/bot{tok}/sendMessage", data={"chat_id": chat, "text": msg}, timeout=20)
        except Exception:  # noqa: BLE001
            pass


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


# ---------- vaga "oferta do dia": o robô escolhe a melhor oferta fresca na hora de postar ----------
MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]


def brl(v) -> str:
    return "R$ " + f"{round(float(v or 0)):,}".replace(",", ".")


def subir_github(caminho: str, dados: bytes) -> None:
    import base64
    tok = os.environ.get("GH_TOKEN", "")
    if not tok:
        raise RuntimeError("sem GH_TOKEN pra subir a imagem")
    url = f"https://api.github.com/repos/{REPO}/contents/docs/{caminho}"
    h = {"Authorization": f"Bearer {tok}", "Accept": "application/vnd.github+json"}
    sha = (requests.get(url, headers=h, timeout=30).json() or {}).get("sha")
    body = {"message": f"Instagram: oferta do dia {caminho}", "content": base64.b64encode(dados).decode(), "branch": "main"}
    if sha:
        body["sha"] = sha
    r = requests.put(url, headers=h, json=body, timeout=60)
    if not r.ok:
        raise RuntimeError(f"GitHub {r.status_code}: {r.text[:120]}")
    time.sleep(6)


def escolher_oferta(st: dict):
    """Melhor alerta das últimas 30h, que ainda vale (não subiu), dentro do teto de ida e volta e que não foi postado nos últimos 3 dias."""
    alertas = ler(DOCS / "alerts.json", {}).get("alertas", [])
    tetos = ler(DOCS / "status.json", {}).get("tetos_iv") or {}
    agora = datetime.now(FUSO)
    lim = (agora - timedelta(hours=30)).isoformat(timespec="minutes")
    lim_rep = (agora - timedelta(days=3)).isoformat(timespec="minutes")
    usados = {x.get("destino") for x in st.values() if isinstance(x, dict) and x.get("destino") and x.get("publicado_em", "") >= lim_rep}
    boas = []
    for a in alertas:
        if a.get("criado", "") < lim or a.get("destino") in usados:
            continue
        cf = a.get("conferido") or {}
        if cf.get("status") == "subiu":
            continue
        rt = a["preco"] + (a.get("preco_volta") or a["preco"])
        if tetos.get(a["destino"]) and rt > tetos[a["destino"]]:
            continue
        boas.append(a)
    boas.sort(key=lambda a: (not a.get("recorde"), not (a.get("conferido") or {}).get("status") == "valendo", -(a.get("desconto") or 0)))
    return boas[0] if boas else None


def montar_oferta(p: dict, st: dict) -> dict:
    sys.path.insert(0, str(RAIZ / "engine"))
    import imagem  # noqa: PLC0415
    a = escolher_oferta(st)
    agora = datetime.now(FUSO)
    if a:
        img = imagem.card_alerta(a)
        rt = a["preco"] + (a.get("preco_volta") or 0)
        meses = " · ".join(f"{g['mes'].split(' ')[0][:3].lower()}: {', '.join(g['dias'][:6])}" for g in (a.get("ida_meses") or [])[:3])
        quando = a.get("criado", "")
        leg = (f"🔥 ACHADO DO DIA\n\n✈️ Fortaleza ➜ {a['destino_nome']}\n💰 {brl(a['preco'])} o trecho"
               + (f"\n🔁 Ida e volta a partir de {brl(rt)}" if a.get("preco_volta") else "")
               + f"\n🛫 {a.get('cia_nome') or ''}"
               + (f"\n📅 Datas de ida: {meses}" if meses else "")
               + f"\n\n🕐 Visto pelo radar em {quando[8:10]}/{quando[5:7]} às {quando[11:16]}. Preço muda a qualquer momento, corre!")
        titulo, destino = f"Oferta do dia: {a['destino_nome']}", a["destino"]
    else:
        tetos = ler(DOCS / "status.json", {}).get("tetos_iv") or {}
        rotas = ler(DOCS / "status.json", {}).get("rotas") or {}
        lim = (agora - timedelta(hours=30)).isoformat()
        L = []
        for k, v in rotas.items():
            if not (v.get("menor") and v.get("mediana") and v.get("menor_volta") and v.get("quando", "") >= lim):
                continue
            rt = v["menor"] + v["menor_volta"]
            d = 1 - rt / (v["mediana"] + (v.get("mediana_volta") or v["mediana"]))
            if d < 0.2 or (tetos.get(k) and rt > tetos[k]):
                continue
            L.append({"k": k, "nome": v.get("nome") or k, "menor": v["menor"], "rt": rt, "d": d, "mes": (v.get("dia_menor") or v.get("melhor_mes") or "")[5:7], "intl": v.get("tipo") == "internacional"})
        L = sorted(L, key=lambda x: -x["d"])[:5]
        if len(L) < 3:
            raise RuntimeError("sem oferta fresca hoje (nenhuma promoção nas últimas 30h). Tente mais tarde ou troque o post.")
        img = imagem.card_top5(L, agora.date().isoformat())
        leg = "🏆 TOP 5 DE HOJE SAINDO DE FORTALEZA\n\n" + "\n".join(f"{i + 1}. {x['nome']}: {brl(x['menor'])} o trecho · ida e volta {brl(x['rt'])}" for i, x in enumerate(L)) + f"\n\n🕐 Preços vistos hoje, {agora.strftime('%d/%m')}. Mudam a qualquer momento."
        titulo, destino = "Oferta do dia: Top 5", ""
    rod = p.get("rodape") or "🔔 Alertas grátis de passagem saindo de Fortaleza: link na bio"
    leg += f"\n\n💬 Comenta EU QUERO que eu te mando os próximos no direct 📩\n\n{rod}\n\n#fortaleza #ceara #passagensbaratas #promocaodepassagem #viagem #partiu085"
    caminho = f"ig/{p['id']}-1.jpg"
    subir_github(caminho, img)
    extra = {"imagens": [caminho], "legenda": leg, "titulo": titulo, "destino": destino}
    try:
        st9 = imagem.story_de(img, "OFERTA DO DIA" if destino else "TOP 5 DE HOJE", "Comenta EU QUERO no post")
        c9 = f"ig/{p['id']}-story.jpg"
        subir_github(c9, st9)
        extra["story"] = c9
        if p.get("reels"):
            extra["video"] = fazer_reels(st9, p["id"])
    except Exception as e:  # noqa: BLE001
        print("story/reels da oferta:", e)
    return extra


def fazer_reels(quadro: bytes, pid: str) -> str:
    """Vídeo de 7s (zoom lento) a partir do quadro 9:16. Vai pro site (GitHub Pages), que serve video/mp4."""
    import subprocess
    import tempfile
    d = Path(tempfile.mkdtemp())
    (d / "q.jpg").write_bytes(quadro)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", str(d / "q.jpg"), "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
                    "-vf", "scale=1188:2112,zoompan=z='min(zoom+0.0007,1.1)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=210:s=1080x1920:fps=30,format=yuv420p",
                    "-t", "7", "-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-c:a", "aac", "-shortest", "-movflags", "+faststart", str(d / "r.mp4")], check=True)
    caminho = f"ig/{pid}.mp4"
    subir_github(caminho, (d / "r.mp4").read_bytes())
    return caminho


def url_site(caminho: str) -> str:
    dono, nome = REPO.split("/")
    return f"https://{dono}.github.io/{nome}/{caminho}"


def publicar_reels(video: str, legenda: str) -> dict:
    url = url_site(video)
    for _ in range(30):  # espera o site publicar o arquivo (≈1–2 min)
        try:
            if requests.head(url, timeout=15).status_code == 200:
                break
        except Exception:  # noqa: BLE001
            pass
        time.sleep(10)
    c = api("POST", f"{USER}/media", media_type="REELS", video_url=url, caption=legenda, share_to_feed="true")["id"]
    for _ in range(40):
        stc = api("GET", c, fields="status_code").get("status_code")
        if stc == "FINISHED":
            break
        if stc in ("ERROR", "EXPIRED"):
            raise RuntimeError(f"Instagram recusou o vídeo ({stc})")
        time.sleep(8)
    mid = api("POST", f"{USER}/media_publish", creation_id=c)["id"]
    info = {}
    try:
        info = api("GET", mid, fields="permalink")
    except Exception:  # noqa: BLE001
        pass
    return {"media_id": mid, "link": info.get("permalink", ""), "publicado_em": datetime.now(FUSO).isoformat(timespec="minutes")}


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


# ---------- direct automático: quem comenta a palavra-chave recebe o link no direct ----------
DM_CFG, DM_LOG = DOCS / "ig_dm_cfg.json", DOCS / "ig_dm.json"
DM_PADRAO = {"ativo": True, "palavras": ["QUERO", "EU QUERO", "LINK"],
             "mensagem": "Oi! Aqui é o Partiu 085 ✈️\n\nVocê pediu, então você entra antes de todo mundo: esse é o grupo GRÁTIS com as passagens baratas saindo de Fortaleza 👇\n{link}\n\nTodos os nossos links: {bio}",
             "resposta": "Te mandei no direct 📩 Se não aparecer, olha em Solicitações de mensagem!"}


def link_grupo() -> str:
    for g in ler(DOCS / "grupos.json", []) or []:
        if g.get("id") == "gratis" and g.get("link"):
            return g["link"]
    return "https://bit.ly/radar085"


def direct_automatico(conta: dict) -> None:
    cfg = {**DM_PADRAO, **ler(DM_CFG, {})}
    log = ler(DM_LOG, {"itens": []})
    if not cfg.get("ativo"):
        return
    palavras = [p.strip().upper() for p in cfg.get("palavras", []) if p.strip()]
    feitos = {x["id"] for x in log.get("itens", [])}
    agora = datetime.now(FUSO)
    lim_post = (agora - timedelta(days=30)).isoformat()
    lim_com = agora - timedelta(days=6, hours=20)  # a resposta privada só vale até 7 dias depois do comentário
    msg = cfg["mensagem"].replace("{link}", link_grupo()).replace("{bio}", f"https://{REPO.split('/')[0]}.github.io/{REPO.split('/')[1]}/links.html")
    novos, enviados = [], 0
    midias = [m for m in conta.get("midias", []) if (m.get("quando") or "")[:19] >= lim_post[:19]][:15]
    for m in midias:
        try:
            coms = api("GET", f"{m['id']}/comments", fields="id,text,timestamp,username,from", limit=50).get("data", [])
        except Exception as e:  # noqa: BLE001
            print("comentários:", e)
            continue
        for cm in coms:
            if cm["id"] in feitos or enviados >= 30:
                continue
            txt = (cm.get("text") or "").upper()
            if not any(p in txt for p in palavras):
                continue
            usuario = cm.get("username") or (cm.get("from") or {}).get("username", "")
            if usuario and usuario.lower() == (conta.get("usuario") or "").lower():
                continue
            try:
                quando = datetime.fromisoformat(cm["timestamp"].replace("+0000", "+00:00"))
            except Exception:  # noqa: BLE001
                quando = agora
            reg = {"id": cm["id"], "usuario": usuario, "texto": cm.get("text", "")[:120], "quando": quando.astimezone(FUSO).isoformat(timespec="minutes"), "post": m.get("link", "")}
            if quando < lim_com:
                reg["dm"] = "expirado"
            else:
                try:
                    r = requests.post(f"{API}/{USER}/messages", headers={"Authorization": f"Bearer {TOKEN}"},
                                      json={"recipient": {"comment_id": cm["id"]}, "message": {"text": msg}}, timeout=30)
                    j = r.json() if r.content else {}
                    if not r.ok or "error" in j:
                        raise RuntimeError((j.get("error") or {}).get("message") or f"HTTP {r.status_code}")
                    reg["dm"] = "ok"
                    enviados += 1
                except Exception as e:  # noqa: BLE001
                    reg["dm"] = "erro"
                    reg["erro"] = str(e)[:160]
                if cfg.get("resposta") and reg["dm"] == "ok":
                    try:
                        api("POST", f"{cm['id']}/replies", message=cfg["resposta"])
                        reg["resposta"] = "ok"
                    except Exception as e:  # noqa: BLE001
                        reg["resposta"] = "erro"
                        reg["erro_resp"] = str(e)[:120]
            reg["processado"] = agora.isoformat(timespec="minutes")
            novos.append(reg)
            feitos.add(cm["id"])
            print(f"direct @{usuario}: {reg['dm']} {reg.get('erro', '')}")
    if novos:
        log["itens"] = (novos + log.get("itens", []))[:500]
        salvar(DM_LOG, log)


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
        if s_.get("status") == "expirado":
            continue
        pronto = p.get("aprovado") and (p.get("quando", "9") <= agora or p.get("id") == APENAS)
        if pronto and p.get("valido_ate") and p["valido_ate"] < agora[:10]:
            st[p["id"]] = {"status": "expirado", "quando": agora}
            print(f"expirado (não postei): {p.get('titulo')}")
            continue
        if not pronto or feitos >= 5:
            continue
        # não duplica: se esse mesmo post (mesma origem) já saiu por outro agendamento ou pelo "Postar agora", troca por uma oferta do dia
        orig = p.get("origem") or ""
        if orig and orig not in ("vaga", "story") and p.get("tipo") not in ("story", "oferta_dia") and p.get("id") != APENAS:
            ja = [x for x in fila if x.get("origem") == orig and x["id"] != p["id"] and st.get(x["id"], {}).get("status") == "publicado"]
            if ja:
                print(f"já tinha saído ({ja[0]['id']}): {p.get('titulo')} vira oferta do dia")
                p = {**p, "tipo": "oferta_dia", "trocado_de": p.get("titulo")}
        try:
            extra = {}
            if p.get("tipo") == "oferta_dia":
                extra = montar_oferta(p, st)
                p = {**p, "imagens": extra["imagens"], "legenda": extra["legenda"], "tipo": "feed"}
            res = publicar_reels(extra["video"], p["legenda"]) if extra.get("video") else publicar(p)
            st[p["id"]] = {"status": "publicado", **res, **({"trocado_de": p["trocado_de"]} if p.get("trocado_de") else {}), **({"escolhido": extra.get("titulo"), "destino": extra.get("destino"), "imagem": extra["imagens"][0], "formato": "reels" if extra.get("video") else "feed"} if extra else {})}
            if extra.get("story") and p.get("story", True):
                try:
                    publicar({"tipo": "story", "imagens": [extra["story"]]})
                    st[p["id"]]["story"] = True
                except Exception as e:  # noqa: BLE001
                    print("story da oferta:", e)
            feitos += 1
            print(f"publicado: {p.get('titulo')} {st[p['id']].get('link')}")
        except Exception as e:  # noqa: BLE001
            st[p["id"]] = {"status": "erro", "erro": str(e)[:200], "tentativa": int(p.get("tentativa", 0)), "quando": agora}
            avisar_admin(f"⚠️ Instagram: o post \"{p.get('titulo')}\" não saiu.\n{str(e)[:200]}\nAbra a agenda no painel e toque em Tentar de novo.")
            print(f"! {p.get('titulo')}: {e}")
    try:
        direct_automatico(conta)
    except Exception as e:  # noqa: BLE001
        print("direct:", e)
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
                    pass
                else:
                    avisar_admin("⚠️ Instagram: não consegui renovar a conexão. Gere um token novo no Meta e me mande.")
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
