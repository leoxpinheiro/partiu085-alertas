"""Milhas saindo de Fortaleza, a partir de canais públicos de alertas no Telegram.

Lê a prévia pública dos canais (t.me/s/<canal>), abre as matérias de alerta linkadas nos posts e pega,
nas tabelas de trechos, só as linhas com origem em Fortaleza (FOR). Grava em docs/milhas_tg.json
(lista de achados) e avisa o admin no Telegram quando aparece um novo. Sem fonte no texto.

Rodar: python engine/milhas_telegram.py   (no GitHub Actions, a cada 2h)
"""
from __future__ import annotations

import html
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

RAIZ = Path(__file__).resolve().parent.parent
DOCS = RAIZ / "docs"
SAIDA = DOCS / "milhas_tg.json"
FUSO = timezone(timedelta(hours=-3))
CANAIS = ["canalpontospravoar", "promopassagens"]
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9"}
ORIGEM = re.compile(r"\bfortaleza\b|\(\s*FOR\s*\)|^\s*FOR\s*$", re.I)
PROGRAMAS = [("smiles", "Smiles"), ("latam", "LATAM Pass"), ("tudoazul", "Azul Fidelidade"), ("azul", "Azul Fidelidade"),
             ("livelo", "Livelo"), ("tap", "TAP Miles&Go"), ("iberia", "Iberia Avios"), ("qatar", "Qatar Avios"),
             ("aadvantage", "AAdvantage"), ("american", "AAdvantage"), ("copa", "ConnectMiles"), ("flying blue", "Flying Blue")]
DOM_ALERTA = re.compile(r"https?://(?:www\.)?(pontospravoar\.com|passageirodeprimeira\.com|melhoresdestinos\.com\.br|mestredasmilhas\.com)/[^\s\"'<>]+", re.I)


def ler(p, padrao):
    try:
        return json.loads(Path(p).read_text("utf-8"))
    except Exception:  # noqa: BLE001
        return padrao


def limpa(t: str) -> str:
    t = re.sub(r"<br\s*/?>", " ", t, flags=re.I)
    t = re.sub(r"<[^>]+>", " ", t)
    return re.sub(r"\s+", " ", html.unescape(t)).strip()


def posts_canal(canal: str) -> list[dict]:
    """Últimos posts da prévia pública do canal: texto + links."""
    r = requests.get(f"https://t.me/s/{canal}", headers=UA, timeout=30)
    r.raise_for_status()
    out = []
    for bloco in re.findall(r'<div class="tgme_widget_message_wrap.*?(?=<div class="tgme_widget_message_wrap|\Z)', r.text, flags=re.S):
        m = re.search(r'data-post="([^"]+)"', bloco)
        txt = re.search(r'<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>', bloco, flags=re.S)
        quando = re.search(r'<time[^>]*datetime="([^"]+)"', bloco)
        links = {x.group(0) for x in DOM_ALERTA.finditer(bloco)}
        out.append({"id": m.group(1) if m else "", "texto": limpa(txt.group(1)) if txt else "", "links": sorted(links),
                    "quando": quando.group(1) if quando else ""})
    return out


def programa(titulo: str) -> str:
    t = titulo.lower()
    return next((nome for chave, nome in PROGRAMAS if chave in t), "")


def tabelas(pagina: str) -> list[list[list[str]]]:
    out = []
    for tb in re.findall(r"<table.*?</table>", pagina, flags=re.S | re.I):
        linhas = []
        for tr in re.findall(r"<tr.*?</tr>", tb, flags=re.S | re.I):
            cels = [limpa(c) for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, flags=re.S | re.I)]
            links = re.findall(r'href="([^"]+)"', tr)
            if cels:
                linhas.append(cels + ([links[-1]] if links else []))
        if linhas:
            out.append(linhas)
    return out


def num(t: str) -> int | None:
    m = re.search(r"(\d{1,3}(?:[.\s]\d{3})+|\d{4,6})", t or "")
    return int(re.sub(r"\D", "", m.group(1))) if m else None


def achados_da_materia(url: str) -> list[dict]:
    r = requests.get(url, headers=UA, timeout=30)
    r.raise_for_status()
    pag = r.text
    mt = re.search(r"<title[^>]*>(.*?)</title>", pag, flags=re.S | re.I)
    titulo = limpa(mt.group(1)) if mt else ""
    prog = programa(titulo) or programa(url)
    taxas = re.search(r"\+\s*(?:R\$\s*)?([\d.,]+)\s*(?:de\s*)?taxas", limpa(pag), re.I)
    out = []
    for tb in tabelas(pag):
        cab = [c.lower() for c in tb[0]]
        if not any("origem" in c or "saindo" in c or "de " == c[:3] for c in cab):
            continue
        io = next((i for i, c in enumerate(cab) if "origem" in c or "saindo" in c), 0)
        idd = next((i for i, c in enumerate(cab) if "destino" in c or "para" == c.strip()), 1)
        idt = next((i for i, c in enumerate(cab) if "data" in c or "quando" in c or "período" in c), None)
        imi = [i for i, c in enumerate(cab) if "milha" in c or "ponto" in c or "trecho" in c or "clube" in c or "demais" in c or "valor" in c]
        for ln in tb[1:]:
            if len(ln) <= max(io, idd) or not ORIGEM.search(ln[io]):
                continue
            valores = [num(ln[i]) for i in imi if i < len(ln)] or [num(x) for x in ln]
            valores = [v for v in valores if v and 1000 <= v <= 900000]
            if not valores:
                continue
            reserva = ln[-1] if ln[-1].startswith("http") else url
            out.append({"destino": re.sub(r"\s*\([A-Z]{3}\)\s*", "", ln[idd]).strip(), "iata": (re.search(r"\(([A-Z]{3})\)", ln[idd]) or [None, ""])[1],
                        "milhas": min(valores), "milhas_demais": max(valores) if len(valores) > 1 else None,
                        "programa": prog, "datas": ln[idt] if idt is not None and idt < len(ln) else "",
                        "taxas": taxas.group(1) if taxas else "", "link": reserva, "materia": url, "titulo": titulo})
    # matéria sem tabela, mas o título já é "saindo de Fortaleza"
    if not out and re.search(r"fortaleza", titulo, re.I) and prog:
        v = num(titulo)
        if v:
            out.append({"destino": "", "iata": "", "milhas": v, "milhas_demais": None, "programa": prog, "datas": "", "taxas": "",
                        "link": url, "materia": url, "titulo": titulo})
    return out


def texto_alerta(a: dict) -> str:
    dest = a["destino"] or "vários destinos"
    L = ["💎 *ALERTA DE MILHAS!*", "", f"✈️ *Fortaleza ➜ {dest}*" + (f" ({a['iata']})" if a.get("iata") else ""),
         f"🎟️ *{a['milhas']:,} milhas*".replace(",", ".") + (f" {a['programa']}" if a["programa"] else "") + " o trecho"]
    if a.get("milhas_demais") and a["milhas_demais"] != a["milhas"]:
        L.append(f"   ({a['milhas_demais']:,} pra quem não é do clube)".replace(",", "."))
    if a.get("taxas"):
        L.append(f"💵 + R$ {a['taxas']} de taxas")
    if a.get("datas"):
        L.append(f"🗓️ {a['datas']}")
    L += ["", "⚡ Milhas em promoção acabam rápido. Confira antes de emitir.", f"🛒 {a['link']}"]
    return "\n".join(L)


def avisar(msg: str) -> None:
    tok, chat = os.environ.get("TELEGRAM_BOT_TOKEN"), os.environ.get("TELEGRAM_ADMIN_ID") or os.environ.get("TELEGRAM_CHAT_ID")
    if not tok or not chat:
        return
    try:
        requests.post(f"https://api.telegram.org/bot{tok}/sendMessage", json={"chat_id": chat, "text": msg}, timeout=20)
    except Exception as e:  # noqa: BLE001
        print("telegram:", e)


def main():
    agora = datetime.now(FUSO)
    base = ler(SAIDA, {"vistos": [], "achados": []})
    vistos = set(base.get("vistos", []))
    novos = []
    for canal in CANAIS:
        try:
            posts = posts_canal(canal)
        except Exception as e:  # noqa: BLE001
            print(canal, "falhou:", e)
            continue
        print(canal, len(posts), "posts")
        for p in posts:
            for url in p["links"]:
                url = url.split("?")[0].rstrip("/") + "/"
                if url in vistos:
                    continue
                vistos.add(url)
                if not re.search(r"alerta|ppv|promo|resgate|trecho|milhas|pontos", url, re.I):
                    continue
                try:
                    ach = achados_da_materia(url)
                except Exception as e:  # noqa: BLE001
                    print("matéria falhou:", url, e)
                    continue
                for a in ach:
                    chave = f"{url}|{a['destino']}|{a['milhas']}"
                    if any(x.get("chave") == chave for x in base["achados"]):
                        continue
                    a.update({"chave": chave, "criado": agora.isoformat(timespec="minutes"), "texto": texto_alerta(a)})
                    novos.append(a)
    if novos:  # também entra na aba Milhas do painel (docs/milhas.json), junto das promoções
        import hashlib
        mj = ler(DOCS / "milhas.json", {"ofertas": []})
        ids = {o.get("id") for o in mj.get("ofertas", [])}
        for a in novos:
            oid = "tg-" + hashlib.md5(a["chave"].encode()).hexdigest()[:10]
            if oid in ids:
                continue
            dest = a["destino"] or "vários destinos"
            tit = f"Fortaleza → {dest} por {a['milhas']:,} milhas".replace(",", ".") + (f" {a['programa']}" if a["programa"] else "")
            mj.setdefault("ofertas", []).insert(0, {"id": oid, "tipo": "passagem", "titulo": tit,
                "resumo": " · ".join(v for v in [a.get("datas"), f"+ R$ {a['taxas']} de taxas" if a.get("taxas") else "",
                                                  f"{a['milhas_demais']:,} milhas pra quem não é do clube".replace(",", ".") if a.get("milhas_demais") else ""] if v),
                "link": a["link"], "fonte": "Radar 085", "fontes": ["Radar 085"], "publicado": a["criado"], "encontrado": a["criado"],
                "programas": [a["programa"]] if a["programa"] else [], "de": None, "para": a["programa"] or None, "pct": None,
                "milhas": a["milhas"], "validade": None, "fortaleza": True, "iata": a.get("iata", ""), "destino": dest,
                "texto": a["texto"], "ativa": True})
        (DOCS / "milhas.json").write_text(json.dumps(mj, ensure_ascii=False, indent=1) + "\n", "utf-8")
    base["achados"] = (novos + base.get("achados", []))[:300]
    base["vistos"] = sorted(vistos)[-3000:]
    base["atualizado"] = agora.isoformat(timespec="minutes")
    SAIDA.write_text(json.dumps(base, ensure_ascii=False, indent=1), "utf-8")
    print("novos saindo de Fortaleza:", len(novos))
    for a in novos[:5]:
        avisar("💎 Milhas saindo de Fortaleza (achado nos canais)\n\n" + texto_alerta(a).replace("*", ""))


if __name__ == "__main__":
    sys.exit(main())
