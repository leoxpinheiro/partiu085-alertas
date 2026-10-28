"""Radar de IDA E VOLTA internacional.

O radar principal pesquisa só trechos (só ida e só volta). Pra fora do Brasil isso engana: a passagem de ida e volta
na mesma reserva costuma sair bem mais barata que a soma de dois trechos (ex.: Iberia Fortaleza-Porto ~R$ 2.900 ida e
volta, enquanto os dois trechos somados passam de R$ 4.500). Aqui a gente pega as datas mais baratas do calendário de
cada rota internacional e pergunta ao Google o preço de ida e volta junto, de 5 a 10 dias de viagem.

Salva docs/ida_volta.json e, quando o preço é bom de verdade, cria o alerta (alerts.json + Telegram).
Uso: python engine/ida_volta.py [IATA ...]   (sem argumentos: as rotas internacionais menos checadas, até LOTE)
"""
from __future__ import annotations

import os
import statistics
import sys
import time
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import run as R  # noqa: E402
import config as C  # noqa: E402

ARQ = R.DOCS / "ida_volta.json"
LOTE = int(os.environ.get("IDA_VOLTA_LOTE", "8"))
DIAS_MIN, DIAS_MAX = 5, 10
# ida e volta abaixo disso já chama atenção (enquanto a rota ainda não tem histórico próprio)
ALVO_PADRAO = {"Europa e África": 3600, "Caribe e América do Norte": 3900, "América do Sul": 2300}


def _query_rt(dest: str, ida: str, volta: str):
    from fast_flights import FlightQuery, Passengers, create_query
    return create_query(
        flights=[FlightQuery(date=ida, from_airport=C.ORIGEM, to_airport=dest),
                 FlightQuery(date=volta, from_airport=dest, to_airport=C.ORIGEM)],
        trip="round-trip", seat="economy", passengers=Passengers(adults=1), language="pt-BR", currency="BRL")


def preco_rt(dest: str, ida: str, volta: str, max_esc: int) -> dict | None:
    from fast_flights import get_flights
    for t in range(2):
        time.sleep(C.PAUSA_GOOGLE)
        try:
            res = [f for f in get_flights(_query_rt(dest, ida, volta)) if getattr(f, "price", 0)]
            bons = [f for f in res if len(f.flights) - 1 <= max_esc]
            R.CONT["consultas"] += 1
            if not bons:
                return None
            b = min(bons, key=lambda f: f.price)
            return {"ida": ida, "volta": volta, "preco": float(b.price), "cia": (b.airlines or [""])[0],
                    "escalas": max(0, len(b.flights) - 1), "dias": (date.fromisoformat(volta) - date.fromisoformat(ida)).days}
        except Exception as e:  # noqa: BLE001
            R.CONT["erros"] += 1
            err = e
            time.sleep(1.5)
    R.log(f"  ! {dest} {ida}/{volta}: {type(err).__name__}")
    return None


def candidatos(cal: dict, n_ida: int = 3, n_volta: int = 2) -> list[tuple[str, str]]:
    """As idas mais baratas e, pra cada uma, as voltas mais baratas de 5 a 10 dias depois."""
    hoje = R.agora().date()
    ida = sorted((d for d in cal.get("ida", []) if date.fromisoformat(d["dia"]) >= hoje + timedelta(days=7)), key=lambda d: d["preco"])
    volta = cal.get("volta", [])
    out, vistos = [], set()
    for d in ida:
        d0 = date.fromisoformat(d["dia"])
        vs = sorted((v for v in volta if DIAS_MIN <= (date.fromisoformat(v["dia"]) - d0).days <= DIAS_MAX), key=lambda v: v["preco"])
        for v in vs[:n_volta]:
            if (d["dia"], v["dia"]) not in vistos:
                vistos.add((d["dia"], v["dia"]))
                out.append((d["dia"], v["dia"]))
        if len({a for a, _ in out}) >= n_ida:
            break
    # e a ida mais barata de cada mês (ida e volta junto às vezes é barata em data que o trecho avulso não mostra)
    meses = {}
    for d in ida:
        meses.setdefault(d["dia"][:7], d)
    for d in list(meses.values())[:4]:
        d0 = date.fromisoformat(d["dia"])
        vs = sorted((v for v in volta if DIAS_MIN <= (date.fromisoformat(v["dia"]) - d0).days <= DIAS_MAX), key=lambda v: v["preco"])
        if vs and (d["dia"], vs[0]["dia"]) not in vistos:
            vistos.add((d["dia"], vs[0]["dia"]))
            out.append((d["dia"], vs[0]["dia"]))
    return out[:10]


def texto(k: str, nome: str, b: dict, normal: float | None, aj: dict) -> str:
    desc = 1 - b["preco"] / normal if normal else None
    cl, txt = R.classe_piso(desc) if desc is not None else ("otima", "⭐ ÓTIMA OPORTUNIDADE")
    par = "voo direto" if b["escalas"] == 0 else f"{b['escalas']} parada{'s' if b['escalas'] > 1 else ''}"
    L = ["🚨 *O RADAR APITOU!*", "", f"✈️ *Fortaleza ➜ {nome}* ({k})",
         f"🔁 *Ida e volta {R.brl(b['preco'])}* (ida {R.dm(b['ida'])}, volta {R.dm(b['volta'])} · {b['dias']} dias)",
         "{} *{}*".format(*txt.split(" ", 1)),
         f"🛫 {b['cia']} · {par}"]
    if desc and desc > 0.05:
        L.append(f"📉 _{round(desc * 100)}% abaixo do normal dessa rota ({R.brl(normal)})_")
    L += ["", aj.get("aviso_preco", "⚠️ _Preço pode mudar a qualquer momento._").strip(),
          f"🛒 Ver e comprar: {R.link_aviasales(k, b['ida'], b['volta'])}"]
    modelo = aj.get("rodape", "✈️ Receba alertas no WhatsApp: {link}")
    if modelo:
        L += ["", modelo.replace("{link}", aj.get("link_whatsapp") or "https://bit.ly/radar085").strip()]
    return "\n".join(L), cl, txt


def main(args: list[str]) -> None:
    aj = R.carregar_ajustes()
    alvos = {**ALVO_PADRAO, **(aj.get("alvo_ida_volta") or {})}
    max_esc = int(aj.get("max_escalas_internacional", 1))
    D = R.ler_json(ARQ, {"rotas": {}})
    rotas = [r for r in R.carregar_rotas() if r["tipo"] == "internacional" and r.get("ativo", True)]
    if args:
        lote = [r for r in rotas if r["iata"] in args]
    else:
        lote = sorted(rotas, key=lambda r: (D["rotas"].get(r["iata"], {}).get("checado", ""), r["iata"]))[:LOTE]
    hoje = R.agora().date().isoformat()
    agora_iso = R.agora().isoformat(timespec="minutes")
    alertas_doc = R.ler_json(R.ALERTS_FILE, {"alertas": []})
    novos = 0
    for r in lote:
        k = r["iata"]
        cal = R.ler_json(R.CAL_DIR / f"{k}.json", {})
        cs = candidatos(cal)
        if not cs:
            R.log(f"FOR-{k} ida e volta: sem datas no calendário")
            continue
        res = [x for x in (preco_rt(k, a, b, max_esc) for a, b in cs) if x]
        st = D["rotas"].setdefault(k, {"nome": r["nome"], "hist": []})
        st["nome"], st["checado"] = r["nome"], agora_iso
        if not res:
            R.log(f"FOR-{k} ida e volta: Google sem resposta ({len(cs)} pares)")
            continue
        b = min(res, key=lambda x: x["preco"])
        b["visto"] = agora_iso
        hist = [h for h in st.get("hist", []) if h["dia"] != hoje]
        hist.append({"dia": hoje, "min": b["preco"]})
        st["hist"] = hist[-60:]
        st["atual"] = b
        if not st.get("melhor") or b["preco"] <= st["melhor"]["preco"] or st["melhor"].get("visto", "") < (R.agora() - timedelta(days=15)).isoformat():
            st["melhor"] = b
        passados = [h["min"] for h in st["hist"] if h["dia"] < hoje]
        normal = statistics.median(passados) if len(passados) >= 5 else None
        st["normal"] = round(normal) if normal else None
        soma = (min(d["preco"] for d in cal.get("ida", [])) + min(d["preco"] for d in cal.get("volta", []))) if cal.get("ida") and cal.get("volta") else None
        R.log(f"FOR-{k} ida e volta: {R.brl(b['preco'])} ({R.dm(b['ida'])}-{R.dm(b['volta'])}, {b['cia']}) · {len(res)} pares"
              + (f" · normal {R.brl(normal)}" if normal else "") + (f" · trechos somados {R.brl(soma)}" if soma else ""))
        alvo = float(alvos.get(R.regiao(k) or "Europa e África", 3600))
        bom = b["preco"] <= alvo and (normal is None or b["preco"] <= normal * (1 - float(aj.get("desconto_piso", 0.15))))
        ult = st.get("alertado") or {}
        repetido = ult and ult.get("quando", "") >= (R.agora() - timedelta(days=4)).isoformat() and b["preco"] > ult.get("preco", 0) * 0.9
        if not bom or repetido:
            continue
        txt, cl, cl_txt = texto(k, r["nome"], b, normal, aj)
        a = {"id": f"FOR-{k}-RT-{b['ida']}-{int(time.time())}", "criado": agora_iso, "rota": f"FOR-{k}", "destino": k,
             "destino_nome": r["nome"], "tipo": "internacional", "modo": "ida_volta", "regua": "ida_volta",
             "preco": b["preco"], "preco_tipico": round(normal) if normal else None,
             "desconto": round(1 - b["preco"] / normal, 3) if normal else None, "classe": cl, "classe_txt": cl_txt,
             "cia_nome": b["cia"], "escalas": b["escalas"], "ida": b["ida"], "volta": b["volta"],
             "par": {"ida": b["ida"], "volta": b["volta"], "total": b["preco"], "dias": b["dias"]},
             "pares": sorted(res, key=lambda x: x["preco"])[:4], "verificado": True,
             "link_compra": R.link_aviasales(k, b["ida"], b["volta"]), "texto": txt}
        alertas_doc.setdefault("alertas", []).append(a)
        st["alertado"] = {"preco": b["preco"], "quando": agora_iso}
        novos += 1
        R.log(f"  🚨 ALERTA ida e volta {r['nome']}: {R.brl(b['preco'])}")
        if (a.get("desconto") or 0) >= float(aj.get("story_desconto_min", 0.25)) or b["preco"] <= alvo * 0.85:
            R.story_oferta({**a, "desconto": max(a.get("desconto") or 0, 0.3)}, aj)
        try:
            R.postar_telegram(txt, aj)
        except Exception as e:  # noqa: BLE001
            R.log(f"  ! Telegram: {e}")
    D["atualizado"] = agora_iso
    R.salvar_json(ARQ, D)
    if novos:
        R.salvar_json(R.ALERTS_FILE, alertas_doc)
    R.log(f"Ida e volta internacional: {len(lote)} rotas · {novos} alerta(s) · {R.CONT['consultas']} consultas, {R.CONT['erros']} erros")


if __name__ == "__main__":
    main([a.upper() for a in sys.argv[1:]])
