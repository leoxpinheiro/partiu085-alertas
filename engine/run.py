"""Radar Partiu085 — motor de alertas de passagens saindo de Fortaleza.

Cada rodada (a cada 3h, no GitHub Actions):
1. Lê as rotas cadastradas no painel (docs/rotas.json) e os ajustes (docs/ajustes.json).
2. Varre o calendário no Google Voos para um lote de rotas (rodízio) + rotas em foco.
3. Compara com a média histórica do radar e marca o que está bem abaixo.
4. Agrupa as datas com o mesmo preço, gera o texto, salva no painel e posta no Telegram.
"""

from __future__ import annotations

import json
import os
import statistics
import sys
import time
import traceback
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent))
import config as C  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DOCS = ROOT / "docs"
HIST_FILE = DATA / "historico_precos.json"
SENT_FILE = DATA / "enviados.json"
ROT_FILE = DATA / "rotacao.json"
ALERTS_FILE = DOCS / "alerts.json"
LOG_FILE = DOCS / "rodadas.json"
ROTAS_FILE = DOCS / "rotas.json"
AJUSTES_FILE = DOCS / "ajustes.json"
HIST_PUB = DOCS / "historico.json"
STATUS_FILE = DOCS / "status.json"

TP_MARKER = os.environ.get("TRAVELPAYOUTS_MARKER", "").strip()
TG_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
TG_CHAT = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
ROTAS_AGORA = [x.strip().upper() for x in os.environ.get("ROTAS_AGORA", "").split(",") if x.strip()]
OFFLINE = os.environ.get("PARTIU_OFFLINE") == "1"

TZ = timezone(timedelta(hours=-3))
MESES_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

AJUSTES_PADRAO = {
    "desconto_minimo": 0.20,
    "max_alertas_por_rodada": 3,
    "rotas_por_rodada": 11,
    "dias_inicio": 7,
    "dias_fim": 150,
    "passo_dias": 3,
    "duracao_nacional": 6,
    "duracao_internacional": 10,
    "max_escalas_nacional": 1,
    "max_escalas_internacional": 2,
    "dias_sem_repetir": 3,
    "link_whatsapp": "",
    "assinatura": "",
    "linha_premium": False,
    "mostrar_link": False,
    "dias_proximos": 3,
    "max_opcoes": 5,
    "tolerancia_opcoes": 0.12,
    "telegram_ativo": True,
}


# ----------------------------------------------------------------------------- utilidades
def agora() -> datetime:
    return datetime.now(TZ)


def ler_json(path: Path, padrao):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return padrao


def salvar_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")


def brl(v: float) -> str:
    return "R$ " + f"{int(round(v)):,}".replace(",", ".")


def dm(d: str) -> str:
    return f"{d[8:10]}/{d[5:7]}"


def dmy(d: str) -> str:
    return f"{d[8:10]}/{d[5:7]}/{d[0:4]}"


def log(*a):
    print(*a, flush=True)


def carregar_rotas() -> list[dict]:
    rotas = ler_json(ROTAS_FILE, None)
    if not rotas:
        rotas = [{"iata": i, "nome": n, "tipo": t, "teto": teto, "ativo": True, "foco": False}
                 for i, n, t, teto in C.DESTINOS]
        salvar_json(ROTAS_FILE, rotas)
    return rotas


def carregar_ajustes() -> dict:
    a = dict(AJUSTES_PADRAO)
    a.update(ler_json(AJUSTES_FILE, {}) or {})
    if not AJUSTES_FILE.exists():
        salvar_json(AJUSTES_FILE, a)
    return a


# ----------------------------------------------------------------------------- Google Voos
def _query(dest: str, ida: str, volta: str):
    from fast_flights import FlightQuery, Passengers, create_query
    return create_query(
        flights=[FlightQuery(date=ida, from_airport=C.ORIGEM, to_airport=dest),
                 FlightQuery(date=volta, from_airport=dest, to_airport=C.ORIGEM)],
        trip="round-trip", seat="economy", passengers=Passengers(adults=1),
        language="pt-BR", currency="BRL",
    )


def google_link(dest: str, ida: str, volta: str) -> str:
    try:
        return _query(dest, ida, volta).url()
    except Exception:
        return f"https://www.google.com/travel/flights?q=voos%20{C.ORIGEM}%20{dest}%20{ida}%20{volta}&hl=pt-BR&curr=BRL"


def google_oferta(dest: str, ida: str, volta: str, max_escalas: int) -> dict | None:
    from fast_flights import get_flights
    res = [f for f in get_flights(_query(dest, ida, volta)) if getattr(f, "price", 0)]
    bons = [f for f in res if len(f.flights) - 1 <= max_escalas]
    if not bons:
        return None
    b = min(bons, key=lambda f: f.price)
    return {"preco": float(b.price), "cia": (b.airlines or [""])[0], "escalas": max(0, len(b.flights) - 1)}


def coletar(r: dict, aj: dict) -> list[dict]:
    if OFFLINE:
        return dados_falsos(r)
    nac = r["tipo"] == "nacional"
    dur = int(r.get("duracao") or (aj["duracao_nacional"] if nac else aj["duracao_internacional"]))
    max_esc = aj["max_escalas_nacional"] if nac else aj["max_escalas_internacional"]
    out, erros = [], 0
    d = date.today() + timedelta(days=int(aj["dias_inicio"]))
    fim = date.today() + timedelta(days=int(aj["dias_fim"]))
    while d <= fim:
        ida, volta = d.isoformat(), (d + timedelta(days=dur)).isoformat()
        try:
            o = google_oferta(r["iata"], ida, volta, max_esc)
            erros = 0
            if o:
                o.update({"ida": ida, "volta": volta})
                out.append(o)
        except Exception as e:  # noqa: BLE001
            erros += 1
            log(f"  ! Google {r['iata']} {ida}: {type(e).__name__}: {str(e)[:100]}")
            if erros >= 3:
                log(f"  ! {r['iata']}: muitos erros seguidos, pulando rota")
                break
            time.sleep(4)
        time.sleep(C.PAUSA_GOOGLE)
        d += timedelta(days=int(aj["passo_dias"]))
    return out


def dados_falsos(r: dict) -> list[dict]:
    import random
    random.seed(r["iata"])
    base = r.get("teto", 1500) * 1.1
    out = []
    d0 = date.today() + timedelta(days=10)
    for i in range(0, 140, 3):
        ida = d0 + timedelta(days=i)
        preco = base * random.uniform(0.85, 1.4)
        if r["iata"] in ("LIS", "REC", "SAO", "BUE") and 30 < i < 50:
            preco = base * 0.62
        out.append({"ida": ida.isoformat(), "volta": (ida + timedelta(days=7)).isoformat(),
                    "preco": round(preco), "cia": random.choice(["LATAM", "Gol", "Azul", "TAP"]),
                    "escalas": random.choice([0, 0, 1])})
    return out


# ----------------------------------------------------------------------------- lógica
def preco_tipico(rota: str, ofertas: list[dict], hist: dict) -> float | None:
    valores = [o["preco"] for o in ofertas]
    passadas = [h["mediana"] for h in hist.get(rota, [])][-40:]
    base = []
    if len(valores) >= 6:
        base.append(statistics.median(valores))
    if len(passadas) >= 3:
        base.append(statistics.median(passadas))
    return max(base) if base else None


def agrupar_datas(ofertas: list[dict], preco_ref: float) -> list[dict]:
    lim = preco_ref * (1 + C.TOLERANCIA_MESMO_VALOR)
    return [{"ida": o["ida"], "volta": o["volta"], "preco": round(o["preco"])}
            for o in sorted(ofertas, key=lambda x: x["ida"]) if o["preco"] <= lim]


def classe(desc: float) -> tuple[str, str]:
    if desc >= 0.40:
        return "imperdivel", "🔥 IMPERDÍVEL"
    if desc >= 0.30:
        return "otima", "⭐ ÓTIMA OPORTUNIDADE"
    return "boa", "✅ BOA OPORTUNIDADE"


def link_aviasales(dest: str, ida: str, volta: str) -> str:
    u = f"https://www.aviasales.com/search/{C.ORIGEM}{ida[8:10]}{ida[5:7]}{dest}{volta[8:10]}{volta[5:7]}1"
    return u + (f"?marker={TP_MARKER}" if TP_MARKER else "")


def montar_texto(a: dict, aj: dict) -> str:
    paradas = "direto" if a["escalas"] == 0 else f"{a['escalas']} parada" + ("s" if a["escalas"] > 1 else "")
    L = [
        "🚨 O RADAR APITOU",
        "",
        f"✈️ {C.ORIGEM_NOME} → {a['destino_nome']} (ida e volta)",
        f"💰 {brl(a['preco'])} · {round(a['desconto'] * 100)}% abaixo da média ({brl(a['preco_tipico'])})",
        a["classe_txt"],
        f"🛫 {a['cia_nome'] or '—'} · {paradas}",
        "",
        f"📅 {dm(a['ida'])} → {dm(a['volta'])} · {brl(a['preco'])}",
    ]
    ops = [o for o in a.get("opcoes", []) if (o["ida"], o["volta"]) != (a["ida"], a["volta"])]
    if ops:
        L.append("📆 Datas próximas:")
        for o in ops[: int(aj.get("max_opcoes", 5))]:
            L.append(f"• {dm(o['ida'])} → {dm(o['volta'])} · {brl(o['preco'])}")
    L += ["", "⚠️ Preço pode mudar a qualquer momento."]
    if aj.get("mostrar_link"):
        L.append(f"🔗 {a['link_google']}")
    if aj.get("linha_premium"):
        L.append("⭐ Você recebeu em primeira mão por ser Premium.")
    rod = [x for x in [f"✈️ Receba alertas: {aj['link_whatsapp']}" if aj.get("link_whatsapp") else "", aj.get("assinatura") or ""] if x]
    if rod:
        L += [""] + rod
    return "\n".join(L)


def datas_proximas(r: dict, aj: dict, o: dict, ofertas: list[dict]) -> list[dict]:
    """Testa ida e volta ±N dias em volta da melhor data e junta com as datas do calendário."""
    n = int(aj.get("dias_proximos", 3))
    nac = r["tipo"] == "nacional"
    max_esc = aj["max_escalas_nacional"] if nac else aj["max_escalas_internacional"]
    ida0, volta0 = date.fromisoformat(o["ida"]), date.fromisoformat(o["volta"])
    pares = set()
    for k in range(-n, n + 1):
        if k:
            pares.add((ida0 + timedelta(days=k), volta0 + timedelta(days=k)))  # mesma duração
            pares.add((ida0, volta0 + timedelta(days=k)))                         # muda só a volta
            pares.add((ida0 + timedelta(days=k), volta0))                         # muda só a ida
    minimo = date.today() + timedelta(days=2)
    res = {(x["ida"], x["volta"]): x for x in ofertas
           if abs((date.fromisoformat(x["ida"]) - ida0).days) <= n}
    if not OFFLINE:
        for ida, volta in sorted(pares):
            if ida < minimo or volta <= ida + timedelta(days=1):
                continue
            try:
                g = google_oferta(r["iata"], ida.isoformat(), volta.isoformat(), max_esc)
                if g:
                    res[(ida.isoformat(), volta.isoformat())] = {**g, "ida": ida.isoformat(), "volta": volta.isoformat()}
            except Exception as e:  # noqa: BLE001
                log(f"  ! próximas {r['iata']} {ida}: {type(e).__name__}")
            time.sleep(C.PAUSA_GOOGLE)
    lim = o["preco"] * (1 + float(aj.get("tolerancia_opcoes", 0.12)))
    ops = [{"ida": x["ida"], "volta": x["volta"], "preco": round(x["preco"])} for x in res.values() if x["preco"] <= lim]
    ops.sort(key=lambda x: (x["preco"], x["ida"]))
    return ops[:12]


def postar_telegram(texto: str, aj: dict) -> bool:
    if not (TG_TOKEN and TG_CHAT and aj.get("telegram_ativo", True)):
        return False
    try:
        r = requests.post(f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
                          json={"chat_id": TG_CHAT, "text": texto, "disable_web_page_preview": True},
                          timeout=20)
        return r.ok
    except Exception as e:  # noqa: BLE001
        log(f"  ! Telegram: {e}")
        return False


# ----------------------------------------------------------------------------- rodada
def escolher_lote(rotas: list[dict], aj: dict) -> list[dict]:
    if ROTAS_AGORA:
        return [r for r in rotas if r["iata"] in ROTAS_AGORA]
    ativas = [r for r in rotas if r.get("ativo", True)]
    if not ativas:
        return []
    foco = [r for r in ativas if r.get("foco")]
    resto = [r for r in ativas if not r.get("foco")]
    n = max(0, int(aj["rotas_por_rodada"]) - len(foco))
    if not resto:
        return foco
    i0 = ler_json(ROT_FILE, {"i": 0})["i"] % len(resto)
    lote = [resto[(i0 + k) % len(resto)] for k in range(min(n, len(resto)))]
    salvar_json(ROT_FILE, {"i": (i0 + len(lote)) % len(resto)})
    return foco + lote


def rodada() -> None:
    inicio = time.time()
    rotas = carregar_rotas()
    aj = carregar_ajustes()
    hist = ler_json(HIST_FILE, {})
    enviados = ler_json(SENT_FILE, [])
    salvos = ler_json(ALERTS_FILE, {"alertas": []}).get("alertas", [])
    hoje = agora().date().isoformat()
    lote = escolher_lote(rotas, aj)
    log(f"Lote: {', '.join(r['iata'] for r in lote)}")

    candidatos, resumo = [], {}
    for r in lote:
        rota = f"{C.ORIGEM}-{r['iata']}"
        ofertas = coletar(r, aj)
        if not ofertas:
            log(f"{rota}: sem dados")
            resumo[r["iata"]] = {"ofertas": 0, "quando": agora().isoformat(timespec="minutes")}
            continue
        tipico = preco_tipico(rota, ofertas, hist)
        menor = min(ofertas, key=lambda o: o["preco"])
        med = statistics.median(o["preco"] for o in ofertas)
        reg = [h for h in hist.get(rota, []) if h["dia"] != hoje]
        reg.append({"dia": hoje, "mediana": med, "minimo": menor["preco"]})
        hist[rota] = reg[-90:]
        resumo[r["iata"]] = {"ofertas": len(ofertas), "menor": menor["preco"], "mediana": med,
                             "quando": agora().isoformat(timespec="minutes")}
        if not tipico:
            continue
        desc = 1 - menor["preco"] / tipico
        log(f"{rota}: {len(ofertas)} datas · menor {brl(menor['preco'])} · média {brl(tipico)} · {desc:.0%}")
        teto = float(r.get("teto") or 1e9)
        if desc >= float(aj["desconto_minimo"]) and menor["preco"] <= teto:
            candidatos.append({"r": r, "rota": rota, "o": menor, "tipico": tipico, "desc": desc,
                               "datas": agrupar_datas(ofertas, menor["preco"]), "todas": ofertas})

    limite = (agora() - timedelta(days=int(aj["dias_sem_repetir"]))).isoformat()
    recentes = [e for e in enviados if e["quando"] >= limite]
    candidatos = [c for c in candidatos
                  if not any(e["rota"] == c["rota"] and c["o"]["preco"] >= e["preco"] * 0.92 for e in recentes)]
    candidatos.sort(key=lambda c: c["desc"] + min(len(c["datas"]), 10) * 0.004
                    + (0.02 if c["r"].get("foco") else 0), reverse=True)

    novos = []
    limite_n = 10 if ROTAS_AGORA else int(aj["max_alertas_por_rodada"])
    for c in candidatos[:limite_n]:
        r, o = c["r"], c["o"]
        k, ktxt = classe(c["desc"])
        opcoes = datas_proximas(r, aj, o, c.get("todas", []))
        if opcoes and opcoes[0]["preco"] < o["preco"]:
            o = {**o, **opcoes[0]}
        a = {
            "id": f"{c['rota']}-{o['ida']}-{int(time.time())}",
            "criado": agora().isoformat(timespec="minutes"),
            "rota": c["rota"], "destino": r["iata"], "destino_nome": r["nome"], "tipo": r["tipo"],
            "preco": round(o["preco"]), "preco_tipico": round(c["tipico"]), "desconto": round(c["desc"], 3),
            "classe": k, "classe_txt": ktxt,
            "cia_nome": o["cia"], "escalas": o["escalas"],
            "ida": o["ida"], "volta": o["volta"], "datas": c["datas"], "opcoes": opcoes,
            "meses": sorted({MESES_PT[int(d["ida"][5:7]) - 1] for d in c["datas"]}, key=MESES_PT.index),
            "verificado": True,
            "link_google": google_link(r["iata"], o["ida"], o["volta"]),
            "link_compra": link_aviasales(r["iata"], o["ida"], o["volta"]),
        }
        a["texto"] = montar_texto(a, aj)
        a["telegram"] = postar_telegram(a["texto"], aj)
        novos.append(a)
        enviados.append({"rota": a["rota"], "preco": a["preco"], "quando": agora().isoformat()})
        log(f"  ✓ {a['rota']} {brl(a['preco'])} (-{a['desconto']:.0%}) {len(a['datas'])} datas")

    corte = (agora() - timedelta(days=45)).isoformat()
    todos = novos + [a for a in salvos if a["criado"] >= corte]
    salvar_json(ALERTS_FILE, {"atualizado": agora().isoformat(timespec="minutes"), "alertas": todos})
    salvar_json(HIST_FILE, hist)
    salvar_json(HIST_PUB, hist)
    salvar_json(SENT_FILE, [e for e in enviados if e["quando"] >= corte])
    rodadas = ler_json(LOG_FILE, [])
    rodadas.append({"quando": agora().isoformat(timespec="minutes"), "rotas": [r["iata"] for r in lote],
                    "rotas_com_dados": sum(1 for v in resumo.values() if v.get("ofertas")),
                    "candidatos": len(candidatos), "alertas": len(novos),
                    "manual": bool(ROTAS_AGORA), "segundos": int(time.time() - inicio)})
    salvar_json(LOG_FILE, rodadas[-400:])
    status = ler_json(STATUS_FILE, {"rotas": {}})
    status.setdefault("rotas", {}).update(resumo)
    status["ultima_rodada"] = agora().isoformat(timespec="minutes")
    salvar_json(STATUS_FILE, status)
    log(f"\nRodada: {len(lote)} rotas · {len(candidatos)} candidatos · {len(novos)} alertas · {int(time.time()-inicio)}s")


if __name__ == "__main__":
    try:
        rodada()
    except Exception:
        traceback.print_exc()
        sys.exit(1)
