"""Busca própria de passagens em MILHAS saindo de Fortaleza (Smiles e Azul), ida e volta.

Fornecedor atual: GeckoAPI (segredo GECKO_API_KEY no GitHub). Sem a chave, não faz nada.
A cada rodada consulta poucas combinações (destino × programa × data × sentido), em rodízio,
para gastar poucos créditos. Guarda o calendário em docs/milhas_voos.json e, quando a ida
fica bem abaixo do normal da rota (ou abaixo do alvo da rota), cria o alerta na aba Milhas
(docs/milhas.json) no mesmo formato dos alertas em dinheiro: milhas + taxas e datas por mês.
"""
from __future__ import annotations

import hashlib
import json
import os
import statistics
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

RAIZ = Path(__file__).resolve().parent.parent
DOCS = RAIZ / "docs"
VOOS = DOCS / "milhas_voos.json"
ALERTAS = DOCS / "milhas.json"
FILA = RAIZ / "data" / "milhas_fila.json"
FUSO = timezone(timedelta(hours=-3))
CHAVE = os.environ.get("GECKO_API_KEY", "").strip()
ORIGEM, ORIGEM_NOME = "FOR", "Fortaleza"

# código de cidade do radar → aeroporto principal (os programas pedem aeroporto)
AEROPORTO = {"SAO": "GRU", "RIO": "GIG", "BHZ": "CNF", "BUE": "EZE", "PAR": "CDG", "ROM": "FCO", "LON": "LHR",
             "NYC": "JFK", "ORL": "MCO", "MIL": "MXP", "TYO": "NRT", "WAS": "IAD", "CHI": "ORD"}
PADRAO_DESTINOS = ["SAO", "RIO", "BSB", "REC", "SSA", "LIS", "MIA", "ORL", "BUE", "SCL"]
PROGRAMAS = {"Smiles": "smiles.com.br", "Azul Fidelidade": "voeazul.com.br"}
MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]


RODAPE = "✈️ Receba alertas no WhatsApp: {link}"


def log(*a):
    print(*a, flush=True)


# ----------------------------------------------------------------------------- fornecedor: GeckoAPI
def gecko(programa: str, de: str, para: str, dia: str) -> list[dict]:
    corpo = {"target": PROGRAMAS[programa], "type": "plp", "from": de, "to": para,
             "departureDate": dia, "numAdults": 1, "numChildren": 0, "numInfants": 0}
    if programa == "Azul Fidelidade":
        corpo.update({"currency": "BRL", "points": True})
    r = requests.post("https://api.geckoapi.com.br/v1/extract", json=corpo, timeout=120,
                      headers={"Authorization": f"Bearer {CHAVE}", "Content-Type": "application/json"})
    if r.status_code == 402:
        raise RuntimeError("SEM_CREDITOS")
    if r.status_code in (401, 403):
        raise RuntimeError("CHAVE_INVALIDA")
    r.raise_for_status()
    d = (r.json() or {}).get("data") or {}
    voos = []
    if programa == "Smiles":
        ofertas = list(d.get("offers") or [])
        if d.get("cheapestOffer"):
            ofertas.append(d["cheapestOffer"])
        for o in ofertas:
            for f in o.get("fareOptions") or [o]:
                if f.get("miles"):
                    voos.append({"milhas": int(f["miles"]), "taxa": float(f.get("costTax") or 0), "cia": o.get("airline") or "",
                                 "paradas": o.get("stops")})
    else:
        for t in d.get("trips") or []:
            for jn in t.get("journeys") or []:
                seg = jn.get("segments")
                for fa in jn.get("fares") or []:
                    for po in fa.get("pointsOptions") or []:
                        if po.get("points"):
                            voos.append({"milhas": int(po["points"]), "taxa": float(po.get("taxesAndFees") or 0), "cia": "Azul",
                                         "paradas": max(len(seg) - 1, 0) if isinstance(seg, list) else None})
    return voos


# ----------------------------------------------------------------------------- utilidades
def ler(p: Path, padrao):
    try:
        return json.loads(p.read_text())
    except Exception:  # noqa: BLE001
        return padrao


def mil(n) -> str:
    return f"{int(n):,}".replace(",", ".")


def por_mes(dias: list[str]) -> list[dict]:
    g: dict[str, list[str]] = {}
    for d in sorted(dias):
        g.setdefault(f"{MESES[int(d[5:7]) - 1]} {d[:4]}", []).append(d[8:10])
    return [{"mes": k, "dias": v} for k, v in g.items()]


def baratas(cal: dict, desde: str, tol: float = 0.10) -> tuple[dict | None, list[str]]:
    ok = {d: v for d, v in cal.items() if d >= desde and not v.get("sem")}
    if not ok:
        return None, []
    dmin = min(ok, key=lambda d: (ok[d]["milhas"], ok[d]["taxa"]))
    melhor = {"dia": dmin, **ok[dmin]}
    return melhor, sorted(d for d, v in ok.items() if v["milhas"] <= melhor["milhas"] * (1 + tol))[:12]


def classe(desc: float | None) -> str:
    if not desc:
        return ""
    if desc >= 0.40:
        return f"🔥 IMPERDÍVEL · {round(desc * 100)}% abaixo do normal"
    if desc >= 0.30:
        return f"⭐ ÓTIMA OPORTUNIDADE · {round(desc * 100)}% abaixo do normal"
    return f"✅ BOA OPORTUNIDADE · {round(desc * 100)}% abaixo do normal"


def montar_texto(a: dict, link: str) -> str:
    p = a["paradas"]
    paradas = "" if p is None else (" · voo direto" if p == 0 else f" · {p} parada" + ("s" if p > 1 else ""))
    curto = lambda g: (lambda n, y: f"{n}/{y[2:]}")(*g["mes"].split(" "))
    L = ["🚨 *O RADAR APITOU — MILHAS!*", "",
         f"✈️ *{ORIGEM_NOME} ➜ {a['destino']}* ({a['aeroporto']})",
         f"🎟️ *{mil(a['milhas'])} milhas* + R$ {a['taxa']:.0f} o trecho",
         f"💳 *{a['para']}*" + (f" · {a['cia']}" if a.get("cia") else "") + paradas]
    if classe(a.get("desconto")):
        em, resto = classe(a["desconto"]).split(" ", 1)
        rot, pct = (resto.split(" · ") + [""])[:2]
        L.append(f"{em} *{rot}*")
    L += ["", "🗓️ *IDA*"] + [f"▸ {curto(g)}: {', '.join(g['dias'])}" for g in a["ida_meses"]]
    if a.get("volta_meses"):
        L += ["", f"🗓️ *VOLTA* · a partir de *{mil(a['milhas_volta'])} milhas*"] + [f"▸ {curto(g)}: {', '.join(g['dias'])}" for g in a["volta_meses"]]
    L += ["", "⚠️ _Disponibilidade em milhas pode acabar a qualquer momento._", "", RODAPE.replace("{link}", link)]
    return "\n".join(L)


# ----------------------------------------------------------------------------- rodada
def rodada() -> None:
    if not CHAVE:
        log("Milhas (busca própria): sem GECKO_API_KEY, pulando.")
        return
    aj = ler(DOCS / "ajustes.json", {})
    rotas = {r["iata"]: r for r in ler(DOCS / "rotas.json", [])}
    destinos = aj.get("milhas_destinos") or PADRAO_DESTINOS
    por_rodada = int(aj.get("milhas_buscas_por_rodada") or 4)
    progs = [p for p in PROGRAMAS if p in (aj.get("milhas_programas") or list(PROGRAMAS))]
    dias = [int(x) for x in (aj.get("milhas_dias") or [10, 25, 40, 60, 80])]
    desconto_min = float(aj.get("milhas_desconto") or 0.25)
    link = aj.get("link_whatsapp_milhas") or aj.get("link_whatsapp") or "https://bit.ly/radar085"
    global RODAPE
    RODAPE = (aj.get("rodape_milhas") or aj.get("rodape") or RODAPE).strip() or RODAPE
    agora = datetime.now(FUSO)
    hoje = agora.date().isoformat()

    base = ler(VOOS, {"rotas": {}})
    fila = ler(FILA, {"pos": 0})
    # ida no dia N; volta no dia N+7 (assim as voltas ficam depois das idas)
    combos = [(d, p, s, n + (7 if s == "volta" else 0)) for n in dias for d in destinos for p in progs for s in ("ida", "volta")]
    consultas, erros, status, novos = 0, [], "ok", []
    for _ in range(min(por_rodada, len(combos))):
        dest, prog, sentido, n = combos[fila["pos"] % len(combos)]
        fila["pos"] += 1
        dia = (agora.date() + timedelta(days=n)).isoformat()
        aero = AEROPORTO.get(dest, dest)
        de, para = (ORIGEM, aero) if sentido == "ida" else (aero, ORIGEM)
        try:
            t0 = time.time()
            voos = gecko(prog, de, para, dia)
            consultas += 1
            log(f"  {prog} {de}→{para} {dia}: {len(voos)} opções ({time.time() - t0:.0f}s)")
        except RuntimeError as e:
            status = str(e)
            log("  !", status)
            break
        except Exception as e:  # noqa: BLE001
            erros.append(f"{prog} {de}→{para} {dia}: {str(e)[:100]}")
            log("  !", erros[-1])
            continue
        r = base["rotas"].setdefault(dest, {}).setdefault(prog, {})
        cal = r.setdefault(sentido, {})
        if not voos:
            cal[dia] = {"sem": True, "quando": agora.isoformat(timespec="minutes")}
            continue
        m = min(voos, key=lambda v: (v["milhas"], v["taxa"]))
        cal[dia] = {**m, "quando": agora.isoformat(timespec="minutes")}
        hist = r.setdefault(f"hist_{sentido}", [])
        hist.append(m["milhas"])
        r[f"hist_{sentido}"] = hist[-60:]
        if sentido != "ida":
            continue
        # a ida está barata?
        normal = statistics.median(r["hist_ida"]) if len(r["hist_ida"]) >= 4 else None
        alvo = (rotas.get(dest) or {}).get("alvo_milhas")
        desc = 1 - m["milhas"] / normal if normal else None
        if not ((alvo and m["milhas"] <= alvo) or (desc and desc >= desconto_min)):
            continue
        ida, idas = baratas(cal, hoje)
        volta, voltas = baratas(r.get("volta", {}), idas[0] if idas else hoje)
        nome = (rotas.get(dest) or {}).get("nome") or dest
        a = {"tipo": "passagem", "busca_propria": True, "destino": nome, "iata": dest, "aeroporto": aero,
             "para": prog, "programas": [prog], "de": None, "pct": None,
             "milhas": ida["milhas"], "taxa": ida["taxa"], "cia": ida.get("cia") or "", "paradas": ida.get("paradas"),
             "desconto": round(desc, 3) if desc else None, "normal": normal,
             "ida_meses": por_mes(idas), "volta_meses": por_mes(voltas) if volta else [],
             "milhas_volta": volta["milhas"] if volta else None, "taxa_volta": volta["taxa"] if volta else None,
             "titulo": f"{ORIGEM_NOME} → {nome}: {mil(ida['milhas'])} milhas + R$ {ida['taxa']:.0f} ({prog})",
             "resumo": "", "link": "", "fonte": "Radar 085", "fontes": ["Radar 085 (busca própria)"],
             "publicado": agora.isoformat(timespec="minutes"), "encontrado": agora.isoformat(timespec="minutes"),
             "validade": None, "fortaleza": True, "ativa": True}
        a["id"] = "mb-" + hashlib.sha1(f"{dest}|{prog}|{ida['milhas']}|{hoje}".encode()).hexdigest()[:10]
        a["texto"] = montar_texto(a, link)
        novos.append(a)

    # limpa datas passadas e guarda o resumo de cada rota
    for dest, ps in base["rotas"].items():
        for prog, r in ps.items():
            if "datas" in r:  # formato antigo
                r.setdefault("ida", {}).update(r.pop("datas"))
                r["hist_ida"] = r.pop("hist", [])
            for s in ("ida", "volta"):
                r[s] = {d: v for d, v in r.get(s, {}).items() if d >= hoje}
                melhor, _ = baratas(r[s], hoje)
                r[f"menor_{s}"] = melhor
            r["normal_ida"] = statistics.median(r["hist_ida"]) if len(r.get("hist_ida", [])) >= 4 else None
            r.pop("menor", None)
            r.pop("normal", None)
    base.update({"atualizado": agora.isoformat(timespec="minutes"), "status": status, "fornecedor": "GeckoAPI",
                 "consultas_hoje": (base.get("consultas_hoje", 0) if base.get("dia") == hoje else 0) + consultas,
                 "dia": hoje, "erros": erros[-5:], "destinos": destinos, "programas": progs})
    VOOS.write_text(json.dumps(base, ensure_ascii=False, indent=1) + "\n")
    FILA.parent.mkdir(exist_ok=True)
    FILA.write_text(json.dumps(fila))

    if novos:
        al = ler(ALERTAS, {"ofertas": []})
        al.setdefault("ofertas", [])
        lim = (agora - timedelta(days=2)).isoformat()
        tok, chat = os.environ.get("TELEGRAM_BOT_TOKEN", ""), os.environ.get("TELEGRAM_CHAT_MILHAS", "")
        for a in novos:
            repetido = any(x.get("iata") == a["iata"] and x.get("para") == a["para"] and x.get("publicado", "") >= lim
                           and (x.get("milhas") or 1e9) <= a["milhas"] * 1.05 for x in al["ofertas"])
            if repetido:
                continue
            if tok and chat:
                try:
                    a["telegram"] = requests.post(f"https://api.telegram.org/bot{tok}/sendMessage", timeout=20,
                                                  json={"chat_id": chat, "text": a["texto"].replace("*", "").replace("_", ""), "disable_web_page_preview": True}).ok
                except Exception:  # noqa: BLE001
                    pass
            al["ofertas"].insert(0, a)
        ALERTAS.write_text(json.dumps(al, ensure_ascii=False, indent=1) + "\n")
    log(f"Milhas (busca própria): {consultas} consultas, {len(novos)} alertas, status {status}")


if __name__ == "__main__":
    try:
        rodada()
    except Exception as e:  # noqa: BLE001
        print("! busca de milhas falhou:", e)
        sys.exit(0)
