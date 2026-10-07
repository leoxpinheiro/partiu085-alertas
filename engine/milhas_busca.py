"""Busca própria de passagens em MILHAS saindo de Fortaleza (Smiles e Azul).

Fornecedor atual: GeckoAPI (segredo GECKO_API_KEY no GitHub). Sem a chave, não faz nada.
A cada rodada consulta poucas combinações (rota × programa × data), em rodízio, para
gastar poucos créditos. Guarda tudo em docs/milhas_voos.json e, quando aparece um valor
bem abaixo do normal da rota (ou abaixo do alvo que você definiu), cria um alerta na aba
Milhas (docs/milhas.json) com o texto pronto e a comparação com o preço em dinheiro.
"""
from __future__ import annotations

import hashlib
import json
import os
import statistics
import sys
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import requests

RAIZ = Path(__file__).resolve().parent.parent
DOCS = RAIZ / "docs"
VOOS = DOCS / "milhas_voos.json"
ALERTAS = DOCS / "milhas.json"
FILA = RAIZ / "data" / "milhas_fila.json"
FUSO = timezone(timedelta(hours=-3))
CHAVE = os.environ.get("GECKO_API_KEY", "").strip()
ORIGEM = "FOR"

# código de cidade do radar → aeroporto principal (os programas pedem aeroporto)
AEROPORTO = {"SAO": "GRU", "RIO": "GIG", "BHZ": "CNF", "BUE": "EZE", "PAR": "CDG", "ROM": "FCO", "LON": "LHR",
             "NYC": "JFK", "ORL": "MCO", "MIL": "MXP", "TYO": "NRT", "WAS": "IAD", "CHI": "ORD"}
PADRAO_DESTINOS = ["SAO", "RIO", "BSB", "REC", "SSA", "LIS", "MIA", "ORL", "BUE", "SCL"]
PROGRAMAS = {"Smiles": "smiles.com.br", "Azul Fidelidade": "voeazul.com.br"}
NOMES = {}


def log(*a):
    print(*a, flush=True)


# ----------------------------------------------------------------------------- fornecedor: GeckoAPI
def gecko(programa: str, dest: str, dia: str) -> list[dict]:
    corpo = {"target": PROGRAMAS[programa], "type": "plp", "from": ORIGEM, "to": AEROPORTO.get(dest, dest),
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
    j = r.json()
    d = j.get("data") or {}
    voos = []
    if programa == "Smiles":
        for o in d.get("offers") or []:
            for f in o.get("fareOptions") or [o]:
                mi = f.get("miles")
                if mi:
                    voos.append({"milhas": int(mi), "taxa": float(f.get("costTax") or 0), "cia": o.get("airline") or "",
                                 "paradas": o.get("stops"), "saida": o.get("departureTime") or "", "tarifa": f.get("fareType") or ""})
        co = d.get("cheapestOffer") or {}
        for f in co.get("fareOptions") or []:
            if f.get("miles"):
                voos.append({"milhas": int(f["miles"]), "taxa": float(f.get("costTax") or 0), "cia": co.get("airline") or "",
                             "paradas": co.get("stops"), "saida": co.get("departureTime") or "", "tarifa": f.get("fareType") or ""})
    else:
        for t in d.get("trips") or []:
            for jn in t.get("journeys") or []:
                for fa in jn.get("fares") or []:
                    for po in fa.get("pointsOptions") or []:
                        if po.get("points"):
                            seg = (jn.get("segments") or [{}])
                            voos.append({"milhas": int(po["points"]), "taxa": float(po.get("taxesAndFees") or 0), "cia": "Azul",
                                         "paradas": max(len(seg) - 1, 0) if isinstance(seg, list) else None,
                                         "saida": (jn.get("designator") or {}).get("departure") or jn.get("departureTime") or "", "tarifa": ""})
    return voos


# ----------------------------------------------------------------------------- utilidades
def ler(p: Path, padrao):
    try:
        return json.loads(p.read_text())
    except Exception:  # noqa: BLE001
        return padrao


def preco_dinheiro(dest: str, dia: str) -> float | None:
    cal = ler(DOCS / "calendario" / f"{dest}.json", {})
    for d in cal.get("ida", []):
        if d.get("dia") == dia:
            return d.get("preco")
    return None


def mil(n) -> str:
    return f"{int(n):,}".replace(",", ".")


def texto_alerta(dest: str, nome: str, prog: str, melhor: dict, datas: list[str], dinheiro: float | None, link: str) -> str:
    L = ["🚨 *O RADAR APITOU — MILHAS*", "", f"✈️ Fortaleza (FOR) → {nome} ({AEROPORTO.get(dest, dest)})",
         f"🎟️ A partir de *{mil(melhor['milhas'])} milhas* + R$ {melhor['taxa']:.0f} de taxas · {prog}"]
    if melhor.get("cia"):
        L.append(f"🛫 {melhor['cia']}" + (" · voo direto" if melhor.get("paradas") == 0 else ""))
    if datas:
        meses = {}
        for d in sorted(datas):
            meses.setdefault(d[:7], []).append(d[8:10])
        NM = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
        L += ["", "🗓️ *Datas de ida*"] + [f"{NM[int(k[5:7]) - 1]}: {', '.join(v)}" for k, v in meses.items()]
    if dinheiro and dinheiro > melhor["taxa"]:
        vm = (dinheiro - melhor["taxa"]) / (melhor["milhas"] / 1000)
        L += ["", f"💡 Em dinheiro está R$ {mil(dinheiro)}: cada milheiro vale R$ {vm:.2f}".replace(".", ",").replace(f"R$ {mil(dinheiro).replace('.', ',')}", f"R$ {mil(dinheiro)}") + (". Vale usar milhas!" if vm >= 20 else ". Compare antes de emitir.")]
    L += ["", "⚠️ Disponibilidade em milhas some rápido.", "", f"✈️ Receba alertas no WhatsApp: {link}"]
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
    link = aj.get("link_whatsapp") or "https://bit.ly/radar085"
    agora = datetime.now(FUSO)
    hoje = agora.date()

    base = ler(VOOS, {"rotas": {}})
    fila = ler(FILA, {"pos": 0})
    combos = [(d, p, n) for n in dias for d in destinos for p in progs]
    consultas, erros, status = 0, [], "ok"
    novos_alertas = []
    for _ in range(min(por_rodada, len(combos))):
        dest, prog, n = combos[fila["pos"] % len(combos)]
        fila["pos"] += 1
        dia = (hoje + timedelta(days=n)).isoformat()
        try:
            t0 = time.time()
            voos = gecko(prog, dest, dia)
            consultas += 1
            log(f"  {prog} FOR→{dest} {dia}: {len(voos)} opções ({time.time() - t0:.0f}s)")
        except RuntimeError as e:
            status = str(e)
            log("  !", status)
            break
        except Exception as e:  # noqa: BLE001
            erros.append(f"{prog} {dest} {dia}: {str(e)[:100]}")
            log("  !", erros[-1])
            continue
        r = base["rotas"].setdefault(dest, {}).setdefault(prog, {"datas": {}, "hist": []})
        if not voos:
            r["datas"][dia] = {"sem": True, "quando": agora.isoformat(timespec="minutes")}
            continue
        melhor = min(voos, key=lambda v: (v["milhas"], v["taxa"]))
        melhor["quando"] = agora.isoformat(timespec="minutes")
        r["datas"][dia] = melhor
        r["hist"] = (r["hist"] + [melhor["milhas"]])[-60:]
        # é promoção?
        alvo = (rotas.get(dest) or {}).get("alvo_milhas")
        normal = statistics.median(r["hist"]) if len(r["hist"]) >= 4 else None
        bom = (alvo and melhor["milhas"] <= alvo) or (normal and melhor["milhas"] <= normal * (1 - aj.get("milhas_desconto", 0.25)))
        if bom:
            datas = [d for d, v in r["datas"].items() if not v.get("sem") and d >= hoje.isoformat() and v["milhas"] <= melhor["milhas"] * 1.1]
            nome = (rotas.get(dest) or {}).get("nome") or dest
            novos_alertas.append({
                "id": "mb-" + hashlib.sha1(f"{dest}|{prog}|{melhor['milhas']}|{hoje}".encode()).hexdigest()[:10],
                "tipo": "passagem", "busca_propria": True, "titulo": f"Fortaleza → {nome}: {mil(melhor['milhas'])} milhas {prog}",
                "resumo": "", "link": "", "fonte": "Radar 085", "fontes": ["Radar 085 (busca própria)"],
                "publicado": agora.isoformat(timespec="minutes"), "encontrado": agora.isoformat(timespec="minutes"),
                "programas": [prog], "de": None, "para": prog, "pct": None, "milhas": melhor["milhas"], "taxa": melhor["taxa"],
                "destino": nome, "iata": dest, "validade": None, "fortaleza": True, "ativa": True, "datas": sorted(datas),
                "normal": normal, "texto": texto_alerta(dest, nome, prog, melhor, datas, preco_dinheiro(dest, dia), link),
            })

    # resumo por rota/programa (menor valor futuro) e limpeza de datas passadas
    for dest, ps in base["rotas"].items():
        for prog, r in ps.items():
            r["datas"] = {d: v for d, v in r["datas"].items() if d >= hoje.isoformat()}
            ok = [(d, v) for d, v in r["datas"].items() if not v.get("sem")]
            if ok:
                d, v = min(ok, key=lambda x: x[1]["milhas"])
                r["menor"] = {"dia": d, **v, "dinheiro": preco_dinheiro(dest, d)}
                r["normal"] = statistics.median(r["hist"]) if len(r["hist"]) >= 4 else None
            else:
                r.pop("menor", None)
    base.update({"atualizado": agora.isoformat(timespec="minutes"), "status": status, "fornecedor": "GeckoAPI",
                 "consultas_hoje": (base.get("consultas_hoje", 0) if base.get("dia") == hoje.isoformat() else 0) + consultas,
                 "dia": hoje.isoformat(), "erros": erros[-5:], "destinos": destinos, "programas": progs})
    VOOS.write_text(json.dumps(base, ensure_ascii=False, indent=1) + "\n")
    FILA.parent.mkdir(exist_ok=True)
    FILA.write_text(json.dumps(fila))

    if novos_alertas:
        al = ler(ALERTAS, {"ofertas": []})
        ids = {o["id"] for o in al.get("ofertas", [])}
        lim = (agora - timedelta(days=2)).isoformat()
        for o in novos_alertas:
            parecido = any(x.get("iata") == o["iata"] and x.get("para") == o["para"] and x["publicado"] >= lim
                           and (x.get("milhas") or 1e9) <= o["milhas"] * 1.05 for x in al.get("ofertas", []))
            if o["id"] not in ids and not parecido:
                al.setdefault("ofertas", []).insert(0, o)
                tok, chat = os.environ.get("TELEGRAM_BOT_TOKEN", ""), os.environ.get("TELEGRAM_CHAT_MILHAS", "")
                if tok and chat:
                    try:
                        o["telegram"] = requests.post(f"https://api.telegram.org/bot{tok}/sendMessage", timeout=20,
                                                      json={"chat_id": chat, "text": o["texto"].replace("*", ""), "disable_web_page_preview": True}).ok
                    except Exception:  # noqa: BLE001
                        pass
        ALERTAS.write_text(json.dumps(al, ensure_ascii=False, indent=1) + "\n")
    log(f"Milhas (busca própria): {consultas} consultas, {len(novos_alertas)} alertas, status {status}")


if __name__ == "__main__":
    try:
        rodada()
    except Exception as e:  # noqa: BLE001
        print("! busca de milhas falhou:", e)
        sys.exit(0)
