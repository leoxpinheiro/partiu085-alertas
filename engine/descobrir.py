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


def dia(x: str) -> str:
    return (x or "")[:10]


BLOGS = [
    ("Melhores Destinos", "https://www.melhoresdestinos.com.br/feed"),
    ("Passagens Imperdíveis", "https://www.passagensimperdiveis.com.br/feed/"),
    ("Google Notícias", "https://news.google.com/rss/search?hl=pt-BR&gl=BR&ceid=BR:pt-419&q=passagens+saindo+de+Fortaleza+when:3d"),
]


def sem_acento(t: str) -> str:
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", t.lower()) if unicodedata.category(c) != "Mn")


def pistas_blogs(rotas: dict) -> list[dict]:
    """Promoções em dinheiro publicadas em blogs que citam Fortaleza: viram pista pra o robô conferir no Google."""
    import html
    import re
    nomes = {sem_acento(r["nome"]): k for k, r in rotas.items()}
    achou = []
    for fonte, url in BLOGS:
        try:
            x = requests.get(url, timeout=25, headers={"User-Agent": "Mozilla/5.0 partiu085"}).text
        except Exception as e:  # noqa: BLE001
            print(f"! blog {fonte}: {e}")
            continue
        for item in re.findall(r"<item>(.*?)</item>", x, re.S)[:40]:
            tit = html.unescape(re.sub(r"<!\[CDATA\[|\]\]>", "", (re.search(r"<title>(.*?)</title>", item, re.S) or [None, ""])[1]))
            corpo = sem_acento(tit + " " + html.unescape(re.sub(r"<[^>]+>", " ", (re.search(r"<description>(.*?)</description>", item, re.S) or [None, ""])[1])))
            if "fortaleza" not in corpo or "milhas" in sem_acento(tit) or "r$" not in corpo:
                continue
            for nome, k in nomes.items():
                if nome != "fortaleza" and re.search(r"\b" + re.escape(nome) + r"\b", sem_acento(tit)):
                    achou.append({"iata": k, "fonte": fonte, "titulo": tit.strip()[:160]})
    vistos, out = set(), []
    for a in achou:
        if a["iata"] not in vistos:
            vistos.add(a["iata"])
            out.append(a)
    return out


NOTICIAS_Q = ["aeroporto de Fortaleza", "voo direto Fortaleza nova rota", "Fortaleza nova rota aérea", "Fortaleza voos internacionais companhia"]


def fotos_noticias(itens: list) -> None:
    """Baixa a foto de cada notícia (do feed ou da página da matéria) e guarda pequena no site, pra usar de fundo na arte."""
    import hashlib
    import io
    import re
    pasta = DOCS / "noticias_img"
    pasta.mkdir(exist_ok=True)
    usados, baixados = set(), 0
    for it in itens:
        if "news.google" in it["link"]:
            it.pop("img_url", None)
            continue
        nome = hashlib.sha1(it["link"].encode()).hexdigest()[:16] + ".jpg"
        alvo = pasta / nome
        if not alvo.exists() and baixados < 15:
            url = it.get("img_url") or ""
            try:
                if not url:
                    pg = requests.get(it["link"], timeout=20, headers={"User-Agent": "Mozilla/5.0 partiu085"}).text
                    m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', pg) or re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image', pg)
                    url = m.group(1) if m else ""
                if url:
                    from PIL import Image
                    b = requests.get(url, timeout=25, headers={"User-Agent": "Mozilla/5.0 partiu085"}).content
                    im = Image.open(io.BytesIO(b)).convert("RGB")
                    if im.width >= 500:
                        im.thumbnail((1200, 1200))
                        im.save(alvo, "JPEG", quality=82)
                        baixados += 1
            except Exception as e:  # noqa: BLE001
                print(f"! foto notícia: {e}")
        it.pop("img_url", None)
        if alvo.exists():
            it["img"] = f"noticias_img/{nome}"
            usados.add(nome)
    for f in pasta.glob("*.jpg"):
        if f.name not in usados:
            f.unlink()


def noticias() -> None:
    """Notícias quentes (rota nova, voo direto, aeroporto de Fortaleza) pra virar post no Instagram."""
    import html
    import re
    from email.utils import parsedate_to_datetime
    itens, vistos = [], set()
    lim = datetime.now(timezone.utc) - timedelta(days=10)
    urls = ["https://news.google.com/rss/search?hl=pt-BR&gl=BR&ceid=BR:pt-419&q=" + requests.utils.quote(q + " when:10d") for q in NOTICIAS_Q]
    urls += ["https://aeroin.net/feed/", "https://www.aeroflap.com.br/feed/", "https://passageirodeprimeira.com/feed/", "https://www.melhoresdestinos.com.br/feed"]
    for url in urls:
        try:
            x = requests.get(url, timeout=25, headers={"User-Agent": "Mozilla/5.0 partiu085"}).text
        except Exception as e:  # noqa: BLE001
            print(f"! notícias: {e}")
            continue
        for item in re.findall(r"<item>(.*?)</item>", x, re.S)[:25]:
            g = lambda t: html.unescape(re.sub(r"<!\[CDATA\[|\]\]>", "", (re.search(rf"<{t}[^>]*>(.*?)</{t}>", item, re.S) or [None, ""])[1])).strip()
            tit, link, fonte = g("title"), g("link"), g("source") or url.split("/")[2].replace("www.", "")
            try:
                dt = parsedate_to_datetime(g("pubDate"))
            except Exception:  # noqa: BLE001
                continue
            tl = sem_acento(tit)
            if dt < lim or not re.search(r"fortaleza|ceara|nordeste", tl) or not re.search(r"\b(voos?|aere[oa]s?|aeroporto|rotas?|companhias?|latam|gol|azul|tap|passage(m|ns)|embarque|conex(ao|oes)|aviao|avioes|turistas?|turismo|cruzeiro)\b", tl):
                continue
            chave = re.sub(r"\W+", "", tit.lower())[:60]
            if chave in vistos:
                continue
            vistos.add(chave)
            tit = re.sub(r"\s+-\s+[^-]+$", "", tit)
            bruto = g("content:encoded") or g("description")
            resumo = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", bruto))).strip()
            if "news.google" in url or resumo.lower().startswith(tit.lower()[:30]):
                resumo = ""
            m = re.search(r'<media:(?:content|thumbnail)[^>]+url="([^"]+)"', item) or re.search(r'<enclosure[^>]+url="([^"]+\.(?:jpe?g|png|webp)[^"]*)"', item) or re.search(r'<img[^>]+src="([^"]+)"', html.unescape(bruto))
            itens.append({"titulo": tit, "link": link, "fonte": fonte, "data": dt.isoformat(), "resumo": resumo[:400], "img_url": m.group(1) if m else ""})
    itens.sort(key=lambda i: i["data"], reverse=True)
    itens = itens[:30]
    fotos_noticias(itens)
    (DOCS / "noticias.json").write_text(json.dumps({"atualizado": datetime.now(timezone.utc).isoformat(timespec="minutes"), "itens": itens[:30]}, ensure_ascii=False, indent=1), "utf-8")
    print(f"Notícias: {len(itens)}")


def descobrir() -> dict:
    """Junta os menores preços (ida e volta e só ida) por destino e marca as 'pistas':
    rotas que estão baratas segundo o Aviasales e que o robô deve confirmar no Google na próxima rodada."""
    status = (json.loads((DOCS / "status.json").read_text("utf-8")) if (DOCS / "status.json").exists() else {})
    rotas = {r["iata"]: r for r in json.loads((DOCS / "rotas.json").read_text("utf-8"))}
    tetos = status.get("tetos_iv") or {}
    st = status.get("rotas") or {}
    agora = datetime.now(timezone.utc)
    melhor: dict[str, dict] = {}
    for one_way in ("false", "true"):
        try:
            code, j = get("/aviasales/v3/get_latest_prices", origin="FOR", currency="brl", period_type="year",
                          one_way=one_way, limit=1000, sorting="price", market="br")
        except Exception as e:  # noqa: BLE001
            print(f"! Travelpayouts: {e}")
            continue
        if code != 200 or not isinstance(j, dict):
            print(f"! Travelpayouts HTTP {code}")
            continue
        for x in j.get("data") or []:
            d = x.get("destination")
            if not d or not x.get("value"):
                continue
            try:
                visto = datetime.fromisoformat(x["found_at"].replace("Z", "+00:00"))
            except Exception:  # noqa: BLE001
                continue
            if agora - visto > timedelta(hours=96):
                continue  # preço velho demais
            m = melhor.setdefault(d, {"iata": d})
            k = "rt" if one_way == "false" else "ow"
            if k not in m or x["value"] < m[k]["preco"]:
                m[k] = {"preco": x["value"], "ida": dia(x.get("depart_date")), "volta": dia(x.get("return_date")),
                        "paradas": x.get("number_of_changes"), "visto": x["found_at"]}
    pistas = []
    for d, m in melhor.items():
        rt = (m.get("rt") or {}).get("preco")
        ow = (m.get("ow") or {}).get("preco")
        r = rotas.get(d)
        m["rastreada"] = bool(r)
        m["nome"] = (r or {}).get("nome") or d
        teto = tetos.get(d)
        med = (st.get(d) or {}).get("mediana")
        boa = False
        if r and rt and teto and rt <= teto:
            boa = True
        if r and ow and med and ow <= med * 0.75:
            boa = True
        m["pista"] = boa
        if boa:
            pistas.append(d)
    blog = pistas_blogs(rotas)
    for b in blog:
        if b["iata"] not in pistas:
            pistas.append(b["iata"])
    saida = {"atualizado": agora.isoformat(timespec="minutes"), "pistas": sorted(pistas), "blogs": blog,
             "destinos": sorted(melhor.values(), key=lambda m: (m.get("rt") or m.get("ow") or {}).get("preco", 1e9))}
    (DOCS / "descobertas.json").write_text(json.dumps(saida, ensure_ascii=False, indent=1), "utf-8")
    print(f"Travelpayouts: {len(melhor)} destinos com preço recente · pistas pra confirmar: {', '.join(pistas) or 'nenhuma'}")
    return saida


if __name__ == "__main__":
    if "--blogs" in sys.argv:
        print(json.dumps(pistas_blogs({r["iata"]: r for r in json.loads((DOCS / "rotas.json").read_text("utf-8"))}), ensure_ascii=False, indent=1))
        sys.exit(0)
    try:
        noticias()
    except Exception as e:  # noqa: BLE001
        print(f"! notícias: {e}")
    if not TOKEN:
        print("sem TRAVELPAYOUTS_TOKEN")
        sys.exit(0)
    if "--sondar" in sys.argv:
        print(sondar())
    else:
        descobrir()
