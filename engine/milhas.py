"""Radar de milhas do Partiu085.

Lê as notícias de milhas dos principais sites (feeds RSS + Google Notícias) e transforma em
ofertas organizadas: bônus de transferência (Livelo/Esfera/… → Smiles/LATAM Pass/Azul),
compra de pontos/milhas com desconto, clubes e passagens em milhas (com destaque pra
saindo de Fortaleza). Gera docs/milhas.json com o texto pronto pro grupo de milhas.

Uso:  python engine/milhas.py            (rodada normal)
      python engine/milhas.py --sondar   (só testa as fontes e imprime o resultado)
"""
from __future__ import annotations

import hashlib
import html
import json
import os
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

import requests

RAIZ = Path(__file__).resolve().parent.parent
DOCS = RAIZ / "docs"
SAIDA = DOCS / "milhas.json"
AJUSTES = DOCS / "ajustes.json"
FUSO = timezone(timedelta(hours=-3))
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"}

GN = "https://news.google.com/rss/search?hl=pt-BR&gl=BR&ceid=BR:pt-419&q="
FONTES = [
    ("Passageiro de Primeira", "https://passageirodeprimeira.com/feed/"),
    ("Melhores Destinos", "https://www.melhoresdestinos.com.br/feed"),
    ("Pontos pra Voar", "https://pontospravoar.com/feed/"),
    ("Mestre das Milhas", "https://www.mestredasmilhas.com/feed/"),
    ("Melhores Cartões", "https://www.melhorescartoes.com.br/feed"),
    ("Passagens Imperdíveis", "https://www.passagensimperdiveis.com.br/feed/"),
    ("Cartões e Viagens", "https://cartoeseviagens.com.br/feed"),
    ("Mundo Milhas", "https://www.mundomilhas.com.br/feed/"),
    ("Pontos Viajantes", "https://pontosviajantes.com.br/feed/"),
    ("Milhas e Viagens", "https://www.milhaseviagens.com.br/feed/"),
    ("AEROIN", "https://aeroin.net/feed/"),
    ("Aeroflap", "https://www.aeroflap.com.br/feed/"),
    ("Google Notícias", GN + "milhas+a%C3%A9reas+promo%C3%A7%C3%A3o+when:3d"),
    ("Google Notícias", GN + "Livelo+OR+Esfera+OR+Smiles+b%C3%B4nus+when:3d"),
    ("Google Notícias", GN + "b%C3%B4nus+transfer%C3%AAncia+milhas+when:4d"),
    ("Google Notícias", GN + "promo%C3%A7%C3%A3o+milhas+Fortaleza+when:7d"),
    ("Google Notícias", GN + "compra+de+milhas+desconto+when:4d"),
    ("Google Notícias", GN + "milhas+%22Fortaleza%22+passagens+when:14d"),
    ("Google Notícias", GN + "%22saindo+de+Fortaleza%22+milhas+OR+pontos+when:14d"),
    ("Google Notícias", GN + "Smiles+OR+%22LATAM+Pass%22+OR+%22Azul+Fidelidade%22+Fortaleza+when:14d"),
]

PROGRAMAS = [  # (nome exibido, padrões)
    ("Smiles", [r"\bsmiles\b"]),
    ("LATAM Pass", [r"latam\s*pass", r"\blatam\b"]),
    ("Azul Fidelidade", [r"azul\s*fidelidade", r"tudo\s*azul", r"tudoazul", r"\bazul\b"]),
    ("Livelo", [r"\blivelo\b"]),
    ("Esfera", [r"\besfera\b"]),
    ("Átomos C6", [r"[áa]tomos", r"\bc6\b"]),
    ("Itaú", [r"\bita[uú]\b", r"iupp"]),
    ("TAP Miles&Go", [r"tap\s*miles", r"miles\s*&?\s*go"]),
    ("Iberia Plus", [r"iberia"]),
    ("Interline", [r"interline"]),
    ("Inter Loop", [r"\bloop\b"]),
    ("Nubank", [r"nubank"]),
    ("Caixa", [r"\bcaixa\b"]),
    ("Banco do Brasil", [r"banco do brasil", r"\bbb\b"]),
]
AEREAS = {"Smiles", "LATAM Pass", "Azul Fidelidade", "TAP Miles&Go", "Iberia Plus"}
MESES = {"janeiro": 1, "fevereiro": 2, "marco": 3, "abril": 4, "maio": 5, "junho": 6, "julho": 7,
         "agosto": 8, "setembro": 9, "outubro": 10, "novembro": 11, "dezembro": 12}


RODAPE = "✈️ Receba alertas no WhatsApp: {link}"


def sem_acento(s: str) -> str:
    return unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()


def limpar(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", html.unescape(s or ""))
    return re.sub(r"\s+", " ", s).strip()


def ler_feed(nome: str, url: str) -> list[dict]:
    r = requests.get(url, headers=UA, timeout=25)
    r.raise_for_status()
    raiz = ET.fromstring(r.content)
    itens = []
    for it in raiz.iter("item"):
        tit = limpar(it.findtext("title") or "")
        fonte = nome
        if nome == "Google Notícias":  # "Título - Site"
            src = it.find("source")
            if src is not None and src.text:
                fonte = src.text.strip()
                tit = re.sub(r"\s+-\s+" + re.escape(fonte) + r"$", "", tit)
        try:
            quando = parsedate_to_datetime(it.findtext("pubDate") or "").astimezone(FUSO)
        except Exception:  # noqa: BLE001
            quando = datetime.now(FUSO)
        itens.append({"titulo": tit, "resumo": limpar(it.findtext("description") or "")[:500],
                      "link": (it.findtext("link") or "").strip(), "fonte": fonte, "quando": quando})
    return itens


# ----------------------------------------------------------------------------- entender a notícia
def programas_em(txt: str) -> list[str]:
    t = sem_acento(txt)
    achados = []
    for nome, pads in PROGRAMAS:
        pos = min((m.start() for p in pads for m in re.finditer(p, t)), default=None)
        if pos is not None:
            achados.append((pos, nome))
    return [n for _, n in sorted(achados)]


def classificar(tit: str, res: str) -> str | None:
    t = sem_acento(tit)
    if re.search(r"bonus|bonificad", t) and re.search(r"transfer", t + sem_acento(res)):
        return "bonus"
    if re.search(r"(compra|comprar|venda|vende).{0,40}(milhas|pontos)|(milhas|pontos).{0,30}(com|ate) .{0,10}desconto|milheiro", t):
        return "compra"
    if re.search(r"clube", t) and re.search(r"milhas|pontos|smiles|azul|latam", t):
        return "clube"
    if re.search(r"(passage|voo|voos|trecho|ida e volta|resgate|emitir|emissao).{0,60}(milhas|pontos)|(milhas|pontos).{0,60}(trecho|ida e volta|passage)", t):
        return "passagem"
    if re.search(r"bonus", t) and re.search(r"smiles|latam|azul|livelo|esfera", t):
        return "bonus"
    return None


def maior_pct(txt: str) -> int | None:
    v = [int(x) for x in re.findall(r"(\d{1,3})\s?%", txt)]
    v = [x for x in v if 5 <= x <= 200]
    return max(v) if v else None


def milhas_em(txt: str) -> int | None:
    t = sem_acento(txt)
    m = re.search(r"(\d{1,3}(?:[.,]\d{3})+|\d{1,3}(?:[.,]\d)?\s*mil)\s*(?:milhas|pontos)", t)
    if not m:
        return None
    s = m.group(1)
    if "mil" in s:
        return int(float(s.replace("mil", "").strip().replace(",", ".")) * 1000)
    return int(re.sub(r"[.,]", "", s))


def validade_em(txt: str, base: datetime) -> str | None:
    t = sem_acento(txt)
    if re.search(r"(so|somente|apenas|valido|vale|termina|acaba)\s.{0,15}hoje|ultimo dia|ultimas horas|ate as \d", t):
        return base.date().isoformat()
    if re.search(r"ate amanha|termina amanha", t):
        return (base.date() + timedelta(days=1)).isoformat()
    m = re.search(r"ate (?:o dia |dia )?(\d{1,2})/(\d{1,2})", t)
    if m:
        d, mm = int(m.group(1)), int(m.group(2))
    else:
        m = re.search(r"ate (?:o dia |dia )?(\d{1,2}) de (" + "|".join(MESES) + ")", t)
        if not m:
            return None
        d, mm = int(m.group(1)), MESES[m.group(2)]
    try:
        v = date(base.year, mm, d)
        if v < base.date() - timedelta(days=30):
            v = date(base.year + 1, mm, d)
        return v.isoformat()
    except ValueError:
        return None


def entender(it: dict) -> dict | None:
    tit, res = it["titulo"], it["resumo"]
    tipo = classificar(tit, res)
    if not tipo:
        return None
    tudo = f"{tit}. {res}"
    progs = programas_em(tit) or programas_em(res)
    if not progs and tipo != "passagem":
        return None
    de = next((p for p in progs if p not in AEREAS), None)
    para = next((p for p in progs if p in AEREAS), None)
    pct = maior_pct(tit) or (maior_pct(res) if tipo in ("bonus", "compra") else None)
    if tipo == "bonus" and not pct:
        return None
    o = {
        "tipo": tipo, "titulo": tit, "resumo": res[:280], "link": it["link"], "fonte": it["fonte"],
        "publicado": it["quando"].isoformat(timespec="minutes"),
        "programas": progs, "de": de, "para": para, "pct": pct,
        "milhas": milhas_em(tudo) if tipo == "passagem" else None,
        "validade": validade_em(tudo, it["quando"]),
        "fortaleza": bool(re.search(r"fortaleza|\bfor\b", sem_acento(tudo))),
    }
    chave = f"{tipo}|{de}|{para}|{pct}|{o['milhas']}|" + ("" if pct or o["milhas"] else sem_acento(tit)[:60])
    o["id"] = "mi-" + hashlib.sha1(chave.encode()).hexdigest()[:10]
    return o


# ----------------------------------------------------------------------------- texto pro grupo
def mil(n: int) -> str:
    return f"{n:,}".replace(",", ".")


def texto(o: dict, link_grupo: str) -> str:
    L = ["🚨 *O RADAR APITOU — MILHAS*", ""]
    val = f"⏰ Válido até {o['validade'][8:10]}/{o['validade'][5:7]}" if o.get("validade") else ""
    if o["tipo"] == "bonus":
        par = " → ".join(x for x in (o["de"], o["para"]) if x) or " / ".join(o["programas"][:2])
        L += [f"💳 {par}", f"🎁 Até *{o['pct']}% de bônus* na transferência"]
        if val:
            L.append(val)
        L += ["", "⚠️ O bônus costuma depender do seu clube/categoria. Confira as regras antes de transferir."]
    elif o["tipo"] == "compra":
        prog = o["para"] or (o["programas"][0] if o["programas"] else "milhas")
        L += [f"🛒 Promoção pra comprar {prog}", f"💸 {o['titulo']}"]
        if o.get("pct"):
            L.append(f"🔥 Até *{o['pct']}%* de vantagem")
        if val:
            L.append(val)
        L += ["", "💡 Só compre se já tiver uma viagem em mente: milha parada perde valor."]
    elif o["tipo"] == "clube":
        L += [f"⭐ {o['titulo']}"]
        if val:
            L.append(val)
        L += ["", "💡 Clube vale a pena pra quem acumula todo mês e quer bônus maiores nas transferências."]
    else:
        L += [f"✈️ {o['titulo']}"]
        if o.get("milhas"):
            L.append(f"🎟️ A partir de *{mil(o['milhas'])} milhas*" + (f" · {o['para']}" if o.get("para") else ""))
        if o.get("fortaleza"):
            L.append("📍 Com saída de Fortaleza")
        if val:
            L.append(val)
        L += ["", "⚠️ Disponibilidade em milhas some rápido. Confira no app do programa."]
    L += ["", RODAPE.replace("{link}", link_grupo)]
    return "\n".join(L)


# ----------------------------------------------------------------------------- telegram (grupo de milhas)
def postar(txt: str) -> bool:
    tok, chat = os.environ.get("TELEGRAM_BOT_TOKEN", ""), os.environ.get("TELEGRAM_CHAT_MILHAS", "")
    if not (tok and chat):
        return False
    try:
        r = requests.post(f"https://api.telegram.org/bot{tok}/sendMessage",
                          json={"chat_id": chat, "text": txt.replace("*", "").replace("_", ""), "disable_web_page_preview": True}, timeout=20)
        return r.ok
    except Exception:  # noqa: BLE001
        return False


# ----------------------------------------------------------------------------- rodada
def rodada(sondar: bool = False) -> None:
    agora = datetime.now(FUSO)
    hoje = agora.date().isoformat()
    aj = json.loads(AJUSTES.read_text()) if AJUSTES.exists() else {}
    link = aj.get("link_whatsapp_milhas") or aj.get("link_whatsapp") or "https://bit.ly/radar085"
    global RODAPE
    RODAPE = (aj.get("rodape_milhas") or aj.get("rodape") or RODAPE).strip() or RODAPE
    antigo = json.loads(SAIDA.read_text()) if SAIDA.exists() else {"ofertas": []}
    por_id = {o["id"]: o for o in antigo.get("ofertas", [])}

    fontes_ok, novos = [], 0
    for nome, url in FONTES:
        try:
            itens = ler_feed(nome, url)
            fontes_ok.append({"fonte": nome, "url": url.split("?")[0] if "news.google" not in url else "Google Notícias", "itens": len(itens), "ok": True})
        except Exception as e:  # noqa: BLE001
            fontes_ok.append({"fonte": nome, "url": url.split("?")[0], "ok": False, "erro": str(e)[:120]})
            print(f"! {nome}: {e}")
            continue
        for it in itens:
            if it["quando"] < agora - timedelta(days=14):
                continue
            o = entender(it)
            if not o:
                continue
            if sondar:
                print(f"  [{o['tipo']}] {o['pct'] or o['milhas'] or ''} {o['de']}→{o['para']} até {o['validade']} | {o['titulo'][:90]} ({o['fonte']})")
            if o["id"] in por_id:
                velho = por_id[o["id"]]
                fs = set(velho.get("fontes", [velho["fonte"]])) | {o["fonte"]}
                velho["fontes"] = sorted(fs)
                if not velho.get("validade") and o.get("validade"):
                    velho["validade"] = o["validade"]
                continue
            o["fontes"] = [o["fonte"]]
            o["encontrado"] = agora.isoformat(timespec="minutes")
            o["texto"] = texto(o, link)
            por_id[o["id"]] = o
            novos += 1
            forte = (o["tipo"] == "bonus" and (o["pct"] or 0) >= aj.get("milhas_bonus_minimo", 80)) or (o["tipo"] == "passagem" and o["fortaleza"])
            if forte and not sondar and postar(o["texto"]):
                o["telegram"] = True

    # mantém 21 dias; tira o que já venceu há mais de 1 dia
    lim = (agora - timedelta(days=21)).isoformat()
    ofertas = []
    for o in por_id.values():
        if o["publicado"] < lim:
            continue
        venc = o.get("validade") or (o["publicado"][:10] and (date.fromisoformat(o["publicado"][:10]) + timedelta(days=4)).isoformat())
        o["ativa"] = venc >= hoje
        if not o.get("busca_propria"):
            o["texto"] = texto(o, link)
        ofertas.append(o)
    ofertas.sort(key=lambda o: o["publicado"], reverse=True)
    print(f"Milhas: {len(ofertas)} ofertas ({novos} novas) · fontes ok: {sum(f['ok'] for f in fontes_ok)}/{len(fontes_ok)}")
    if sondar:
        for f in fontes_ok:
            print("  fonte", f)
        return
    SAIDA.write_text(json.dumps({"atualizado": agora.isoformat(timespec="minutes"), "fontes": fontes_ok, "ofertas": ofertas},
                                ensure_ascii=False, indent=1) + "\n")


if __name__ == "__main__":
    try:
        rodada(sondar="--sondar" in sys.argv)
    except Exception as e:  # noqa: BLE001  — o radar de passagens não pode parar por causa disto
        print("! milhas falhou:", e)
