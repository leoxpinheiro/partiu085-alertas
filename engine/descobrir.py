"""Partiu 085 — descoberta: pergunta à Travelpayouts (dados do Aviasales) os preços mais baratos saindo
de Fortaleza pra QUALQUER destino. Serve de 'pista': o robô principal confirma no Google antes de alertar."""
from __future__ import annotations

import json
import time
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


NOTICIAS_Q = ["aeroporto de Fortaleza", "voo direto Fortaleza nova rota", "Fortaleza nova rota aérea", "Fortaleza voos internacionais companhia",
              "Fraport Fortaleza", "aeroporto Pinto Martins", "aeroporto Jericoacoara voos", "aeroporto Juazeiro do Norte voos",
              "Fortaleza Lisboa voo", "Fortaleza Paris voo", "Ceará turismo voos alta estação", "ANAC regra bagagem passageiro"]
# milhas e pontos: vale pro Brasil todo (o viajante de Fortaleza usa os mesmos programas)
MILHAS_Q = ["Livelo bônus transferência", "Esfera bônus transferência", "Smiles bônus transferência pontos", "LATAM Pass bônus transferência",
            "Azul Fidelidade bônus transferência", "Livelo pontos por real promoção", "compra de pontos desconto Livelo", "compra de milhas desconto Smiles",
            "aniversário Azul Fidelidade promoção", "aniversário LATAM Pass promoção", "Livelo parceiro pontos por real", "sala VIP aeroporto Fortaleza",
            "cartão de crédito acesso sala VIP", "Priority Pass cartão acessos"]
MILHAS_RE = r"\b(livelo|esfera|smiles|latam ?pass|azul fidelidade|tudo ?azul|iupp|inter loop|milhas?|pontos? por real|bonus|bônus)\b"


def decodificar_gnews(url: str) -> str:
    """Link do Google News -> link da matéria (mesmo método do site deles: pega assinatura e pede a URL)."""
    import re
    gid = url.split("/articles/")[1].split("?")[0]
    h = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36"}
    pg = requests.get(f"https://news.google.com/articles/{gid}", headers=h, timeout=15).text
    sg = re.search(r'data-n-a-sg="([^"]+)"', pg)
    ts = re.search(r'data-n-a-ts="([^"]+)"', pg)
    if not (sg and ts):
        return ""
    req = [[["Fbv4je", f'["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"{gid}",{ts.group(1)},"{sg.group(1)}"]', None, "generic"]]]
    r = requests.post("https://news.google.com/_/DotsSplashUi/data/batchexecute", headers={**h, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"},
                      data={"f.req": json.dumps(req)}, timeout=15).text
    m = re.search(r'garturlres\\",\\"(https?://[^\\"]+)', r)
    return m.group(1) if m else ""


def fotos_noticias(itens: list) -> None:
    """Baixa a foto de cada notícia (do feed ou da página da matéria) e guarda pequena no site, pra usar de fundo na arte."""
    import hashlib
    import io
    import re
    pasta = DOCS / "noticias_img"
    pasta.mkdir(exist_ok=True)
    usados, baixados = set(), 0
    import html as _html
    antigos = {}
    try:
        antigos = {x["titulo"]: x for x in json.loads((DOCS / "noticias.json").read_text("utf-8")).get("itens", [])}
    except Exception:  # noqa: BLE001
        pass
    decod = 0
    for it in itens:
        ant = antigos.get(it["titulo"]) or {}
        if "news.google" in it["link"]:
            if ant.get("link_real"):
                it["link_real"] = ant["link_real"]
            elif decod < 12:
                decod += 1
                try:
                    real = decodificar_gnews(it["link"])
                    if real:
                        it["link_real"] = real
                    time.sleep(1)
                except Exception as e:  # noqa: BLE001
                    print(f"! link google news: {e}")
            if not it.get("link_real"):
                it.pop("img_url", None)
                continue
        if ant.get("resumo") and not it.get("resumo"):
            it["resumo"] = ant["resumo"]
        if not it.get("det") and (ant.get("det") or {}).get("v") == 3:
            it["det"] = ant["det"]
        if not it.get("det") and it.get("cat") == "milhas" and baixados + decod < 40:
            try:
                decod += 1
                pg0 = requests.get(it.get("link_real") or it["link"], timeout=15, headers={"User-Agent": "Mozilla/5.0 (Macintosh) partiu085"}).text
                m0 = re.search(r"(?is)<article[^>]*>(.*?)</article>", pg0) or re.search(r'(?is)class="[^"]*(?:entry-content|post-content|article-content|single-content)[^"]*"[^>]*>(.*)', pg0)
                it["det"] = detalhes_materia(m0.group(1) if m0 else pg0, it["titulo"])
                if "10x1" in it["titulo"].lower().replace("×", "x"):  # DEBUG temporário
                    i0 = pg0.lower().find("eleg")
                    it["det"]["dbg"] = f"len={len(pg0)} art={bool(m0)} " + pg0[max(0, i0 - 200):i0 + 1800]
            except Exception as e:  # noqa: BLE001
                print(f"! detalhes notícia: {e}")
        real = it.get("link_real") or it["link"]
        nome = hashlib.sha1(it["link"].encode()).hexdigest()[:16] + ".jpg"
        alvo = pasta / nome
        if (not alvo.exists() or not it.get("resumo")) and baixados < 15 and decod + baixados < 40:
            url = it.get("img_url") or ""
            try:
                if not url or not it.get("resumo"):
                    decod += 1
                    pg = requests.get(real, timeout=15, headers={"User-Agent": "Mozilla/5.0 (Macintosh) partiu085"}).text
                    if not url:
                        m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', pg) or re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image', pg)
                        url = m.group(1) if m else ""
                    if not it.get("resumo"):
                        m = re.search(r'<meta[^>]+(?:property|name)=["\'](?:og:)?description["\'][^>]+content=["\']([^"\']+)', pg) or re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\'](?:og:)?description', pg)
                        if m:
                            it["resumo"] = _html.unescape(m.group(1)).strip()[:400]
                if alvo.exists():
                    url = ""
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


def detalhes_materia(h: str, titulo: str = "") -> dict:
    """Tira da matéria só os FATOS pra gente montar o nosso post: lista de parceiros/lojas, passos, avisos, destaque e prazo."""
    import html as _h
    import re
    if not h:
        return {}
    h = re.sub(r"(?is)<(script|style|figure|aside|nav|footer|form)[^>]*>.*?</\1>", " ", h)
    limpa = lambda x: re.sub(r"\s+", " ", _h.unescape(re.sub(r"<[^>]+>", " ", x))).strip(" .;:-–")
    sec, secoes = "", []
    for tag, corpo in re.findall(r"(?is)<(h[1-6]|ul|ol|p)[^>]*>(.*?)</\1>", h):
        if tag.lower().startswith("h"):
            sec = limpa(corpo)
            continue
        if tag.lower() in ("ul", "ol"):
            its = [limpa(x) for x in re.findall(r"(?is)<li[^>]*>(.*?)</li>", corpo)]
            its = [re.sub(r"\s*\((?:link|clique aqui)\)$", "", i, flags=re.I) for i in its if 1 < len(i) <= 170]
            if its:
                secoes.append((sec, its))
    for tab in re.findall(r"(?is)<table[^>]*>(.*?)</table>", h)[:2]:  # tabelas (faixas de bônus, trechos, preços)
        linhas = []
        for tr in re.findall(r"(?is)<tr[^>]*>(.*?)</tr>", tab):
            if re.search(r"(?is)<th", tr) and not re.search(r"(?is)<td", tr):
                continue  # cabeçalho
            cel = [limpa(c) for c in re.findall(r"(?is)<t[dh][^>]*>(.*?)</t[dh]>", tr)]
            cel = [c for c in cel if c and not re.fullmatch(r"(?i)(clique aqui|link|acesse|saiba mais|confira)", c)]
            if cel and (cel[0].isupper() and len(cel[0]) > 3 or re.match(r"(?i)(perfil|parceiro|categoria|plano|faixa|bonifica|pontua|programa)\b", cel[0]) and not re.search(r"\d", " ".join(cel))):
                continue
            if cel and all(len(c) <= 40 for c in cel) and len(cel) <= 4:
                linhas.append(" · ".join(cel))
        if 2 <= len(linhas) <= 14:
            secoes.append(("Faixas de bônus" if any("%" in l for l in linhas) else "Detalhes", linhas[1:] if re.search(r"(?i)clube|plano|categoria|faixa|trecho|destino|programa", linhas[0]) and len(linhas) > 2 else linhas))
    det = {}
    for tit, its in secoes:
        t = sem_acento(tit)
        if "lista" not in det and (re.search(r"parceir|lojas|elegive|participant|onde (vale|usar)|destinos|trechos|rotas|cartoes|bancos", t) or (not tit and sum(len(i) < 45 for i in its) >= 4)):
            det["lista_tit"], det["lista"] = tit, its[:16]
        elif "lista" not in det and tit in ("Faixas de bônus", "Detalhes"):
            det["lista_tit"], det["lista"] = tit, its[:12]
        elif "passos" not in det and re.search(r"como (aproveitar|participar|transferir|funciona|fazer|comprar|resgatar)|passo", t):
            det["passos"] = [i[:150] for i in its[:5]]
        elif "avisos" not in det and re.search(r"importante|regras|atencao|condic|regulamento|observac|fique de olho", t):
            det["avisos"] = [i[:150] for i in its[:4]]
    txt = sem_acento(limpa(h))
    rxs = (r"ate \d+ pontos? (?:\w+ )?por (?:real|dolar)", r"\d+ pontos? (?:\w+ )?por (?:real|dolar)", r"ate \d+% de bonus", r"\d+% de bonus", r"\d+\s*[x×]\s*1", r"\d+% de desconto", r"desconto de (?:ate )?\d+%",
           r"milheiro a partir de r\$ ?[\d.,]+", r"a partir de [\d.]+ (?:mil )?(?:milhas|pontos)")
    for fonte_txt in (sem_acento(titulo), txt[:1500]):  # o título manda; depois só o começo da matéria
        m = next((re.search(rx, fonte_txt) for rx in rxs if re.search(rx, fonte_txt)), None)
        if m:
            det["destaque"] = m.group(0)
            break
    m = re.search(r"(somente|so|apenas) (hoje|neste \w+|nesta \w+)|valid[ao]s? ate (?:o dia )?(\d{1,2}/\d{1,2}(?:/\d{2,4})?|\d{1,2} de \w+)|ate (?:as \d{1,2}h\d* )?(?:do dia |de )?(\d{1,2}/\d{1,2})", txt)
    if m:
        det["prazo"] = m.group(0)
    det["v"] = 3
    return det


def noticias() -> None:
    """Notícias quentes (rota nova, voo direto, aeroporto de Fortaleza) pra virar post no Instagram."""
    import html
    import re
    from email.utils import parsedate_to_datetime
    itens, vistos = [], set()
    lim = datetime.now(timezone.utc) - timedelta(days=10)
    urls = ["https://news.google.com/rss/search?hl=pt-BR&gl=BR&ceid=BR:pt-419&q=" + requests.utils.quote(q + " when:10d") for q in NOTICIAS_Q]
    urls += ["https://news.google.com/rss/search?hl=pt-BR&gl=BR&ceid=BR:pt-419&q=" + requests.utils.quote(q + " when:4d") for q in MILHAS_Q]
    urls += ["https://aeroin.net/feed/", "https://www.aeroflap.com.br/feed/", "https://passageirodeprimeira.com/feed/", "https://www.melhoresdestinos.com.br/feed", "https://pontospravoar.com/feed/"]
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
            regra = re.search(r"\banac\b.*(bagage|mala|power ?bank|carregador|liquido|passageiro)|mala de mao|power ?bank|bagagem de mao", tl)
            vip = re.search(r"\bsalas? vip\b|lounge|priority pass|loungekey", tl)
            if vip and not re.search(r"fortaleza|ceara|pinto martins|cart(ao|oes)|priority pass|loungekey", tl):
                continue  # sala VIP de outro aeroporto não interessa; só de Fortaleza ou cartão que dá acesso
            milha = (re.search(MILHAS_RE, tl) or vip) and dt >= datetime.now(timezone.utc) - timedelta(days=5)
            if milha:
                regra = True  # milhas/pontos/sala vip: nacional, entra sem precisar citar Fortaleza
            if dt < lim or (not regra and not re.search(r"fortaleza|ceara|nordeste|jericoacoara|jeri\b|juazeiro", tl)) or not regra and not re.search(r"\b(voos?|aere[oa]s?|aeroporto|rotas?|companhias?|latam|gol|azul|tap|passage(m|ns)|embarque|conex(ao|oes)|aviao|avioes|turistas?|turismo|cruzeiro)\b", tl):
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
            det = detalhes_materia(bruto, tit) if len(bruto) > 1500 else {}
            itens.append({"det": det, "cat": "milhas" if milha else "voos", "titulo": tit, "link": link, "fonte": fonte, "data": dt.isoformat(), "resumo": resumo[:400], "img_url": m.group(1) if m else ""})
    itens.sort(key=lambda i: i["data"], reverse=True)
    itens = [i for i in itens if i["cat"] == "milhas"][:45] + [i for i in itens if i["cat"] != "milhas"][:30]  # milhas não espreme as de voos
    itens.sort(key=lambda i: i["data"], reverse=True)
    fotos_noticias(itens)
    (DOCS / "noticias.json").write_text(json.dumps({"atualizado": datetime.now(timezone.utc).isoformat(timespec="minutes"), "itens": itens}, ensure_ascii=False, indent=1), "utf-8")
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
    if "--noticias" in sys.argv:
        sys.exit(0)
    if not TOKEN:
        print("sem TRAVELPAYOUTS_TOKEN")
        sys.exit(0)
    if "--sondar" in sys.argv:
        print(sondar())
    else:
        descobrir()
