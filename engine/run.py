"""Motor de alertas Partiu085.

Fluxo de cada rodada:
1. Puxa da Travelpayouts o calendário de preços (ida e volta) de Fortaleza para cada destino,
   nos próximos meses.
2. Calcula o preço típico de cada rota (mediana do calendário + histórico das rodadas anteriores).
3. Marca como candidato o que estiver bem abaixo do típico e abaixo do teto da rota.
4. Agrupa todas as datas com o "mesmo valor".
5. Confere os melhores candidatos ao vivo no Google Voos.
6. Não repete alerta recente, gera o texto pro WhatsApp, salva no site e (opcional) posta no Telegram.
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
ALERTS_FILE = DOCS / "alerts.json"
LOG_FILE = DOCS / "rodadas.json"

TP_TOKEN = os.environ.get("TRAVELPAYOUTS_TOKEN", "").strip()
TP_MARKER = os.environ.get("TRAVELPAYOUTS_MARKER", "").strip()
TG_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
TG_CHAT = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
OFFLINE = os.environ.get("PARTIU_OFFLINE") == "1"  # testes locais com dados falsos

FORTALEZA_TZ = timezone(timedelta(hours=-3))
MESES_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
CIAS = {
    "G3": "GOL", "LA": "LATAM", "JJ": "LATAM", "AD": "Azul", "TP": "TAP", "IB": "Iberia",
    "AF": "Air France", "KL": "KLM", "UX": "Air Europa", "CM": "Copa", "AV": "Avianca",
    "AA": "American", "UA": "United", "DL": "Delta", "AR": "Aerolíneas", "H2": "Sky",
    "JA": "JetSMART", "LH": "Lufthansa", "BA": "British", "AZ": "ITA", "IB*": "Iberia",
    "EK": "Emirates", "TK": "Turkish", "VH": "Viva", "2Z": "Voepass", "DM": "Arajet",
    "VB": "Viva Aerobus", "4M": "LATAM", "XL": "LATAM", "P5": "Wingo",
}


# ----------------------------------------------------------------------------- utilidades
def agora() -> datetime:
    return datetime.now(FORTALEZA_TZ)


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


def dmy(d: str) -> str:
    y, m, dd = d[:10].split("-")
    return f"{dd}/{m}"


def meses_alvo() -> list[str]:
    hoje = date.today()
    out = []
    y, m = hoje.year, hoje.month
    for _ in range(C.MESES_A_FRENTE):
        out.append(f"{y}-{m:02d}")
        m += 1
        if m == 13:
            y, m = y + 1, 1
    return out


def log(*a):
    print(*a, flush=True)


# ----------------------------------------------------------------------------- Travelpayouts
def tp_calendario(dest: str, mes: str) -> list[dict]:
    """Ofertas ida+volta saindo de FOR com ida no mês informado."""
    url = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates"
    params = {
        "origin": C.ORIGEM,
        "destination": dest,
        "departure_at": mes,
        "one_way": "false",
        "unique": "false",
        "sorting": "price",
        "direct": "false",
        "currency": "brl",
        "limit": 1000,
        "page": 1,
        "token": TP_TOKEN,
    }
    for tentativa in range(3):
        try:
            r = requests.get(url, params=params, timeout=30, headers={"Accept-Encoding": "gzip"})
            if r.status_code == 429:
                time.sleep(5 * (tentativa + 1))
                continue
            r.raise_for_status()
            j = r.json()
            return j.get("data") or []
        except Exception as e:  # noqa: BLE001
            log(f"  ! Travelpayouts {dest} {mes}: {e}")
            time.sleep(2)
    return []


def normalizar(ofertas: list[dict]) -> list[dict]:
    hoje = date.today()
    out = []
    for o in ofertas:
        try:
            ida = o["departure_at"][:10]
            volta = (o.get("return_at") or "")[:10]
            if not volta:
                continue
            d_ida = date.fromisoformat(ida)
            dur = (date.fromisoformat(volta) - d_ida).days
            if d_ida <= hoje + timedelta(days=2):
                continue
            if not (C.DURACAO_MIN <= dur <= C.DURACAO_MAX):
                continue
            out.append({
                "ida": ida,
                "volta": volta,
                "preco": float(o["price"]),
                "cia": o.get("airline") or "",
                "escalas": max(int(o.get("transfers") or 0), int(o.get("return_transfers") or 0)),
                "link": o.get("link") or "",
            })
        except Exception:
            continue
    return out


# ----------------------------------------------------------------------------- Google Voos
def google_link(dest: str, ida: str, volta: str) -> str:
    try:
        from fast_flights import FlightQuery, Passengers, create_query
        q = create_query(
            flights=[FlightQuery(date=ida, from_airport=C.ORIGEM, to_airport=dest),
                     FlightQuery(date=volta, from_airport=dest, to_airport=C.ORIGEM)],
            trip="round-trip", seat="economy", passengers=Passengers(adults=1),
            language="pt-BR", currency="BRL",
        )
        return q.url()
    except Exception:
        return f"https://www.google.com/travel/flights?q=voos%20{C.ORIGEM}%20{dest}%20{ida}%20{volta}&hl=pt-BR&curr=BRL"


def google_preco(dest: str, ida: str, volta: str) -> float | None:
    """Menor preço ida+volta ao vivo no Google Voos (None se não deu para conferir)."""
    if OFFLINE:
        return None
    try:
        from fast_flights import FlightQuery, Passengers, create_query, get_flights
        q = create_query(
            flights=[FlightQuery(date=ida, from_airport=C.ORIGEM, to_airport=dest),
                     FlightQuery(date=volta, from_airport=dest, to_airport=C.ORIGEM)],
            trip="round-trip", seat="economy", passengers=Passengers(adults=1),
            language="pt-BR", currency="BRL",
        )
        res = get_flights(q)
        precos = [f.price for f in res if getattr(f, "price", 0)]
        return float(min(precos)) if precos else None
    except Exception as e:  # noqa: BLE001
        log(f"  ! Google Voos {dest} {ida}/{volta}: {type(e).__name__}: {str(e)[:120]}")
        return None


# ----------------------------------------------------------------------------- lógica de promoção
def preco_tipico(rota: str, ofertas: list[dict], hist: dict) -> float | None:
    # mínimo por dia de ida -> mediana (evita que um dia com muitas ofertas pese mais)
    por_dia: dict[str, float] = {}
    for o in ofertas:
        por_dia[o["ida"]] = min(o["preco"], por_dia.get(o["ida"], 1e12))
    valores = list(por_dia.values())
    passadas = [h["mediana"] for h in hist.get(rota, [])][-40:]
    if len(valores) < 6 and len(passadas) < 3:
        return None  # pouca informação para dizer o que é "barato"
    base = []
    if len(valores) >= 6:
        base.append(statistics.median(valores))
    if len(passadas) >= 3:
        base.append(statistics.median(passadas))
    return max(base)


def agrupar_datas(ofertas: list[dict], preco_ref: float) -> list[dict]:
    lim = preco_ref * (1 + C.TOLERANCIA_MESMO_VALOR)
    vistos = set()
    out = []
    for o in sorted(ofertas, key=lambda x: (x["ida"], x["volta"])):
        if o["preco"] <= lim and (o["ida"], o["volta"]) not in vistos:
            vistos.add((o["ida"], o["volta"]))
            out.append({"ida": o["ida"], "volta": o["volta"], "preco": round(o["preco"])})
    return out


def link_compra(o: dict) -> str:
    if not o.get("link"):
        return ""
    base = "https://www.aviasales.com" + o["link"]
    if TP_MARKER:
        base += ("&" if "?" in base else "?") + f"marker={TP_MARKER}"
    return base


def texto_whatsapp(a: dict) -> str:
    cia = CIAS.get(a["cia"], a["cia"]) if a["cia"] else ""
    paradas = "voo direto" if a["escalas"] == 0 else f"{a['escalas']} parada" + ("s" if a["escalas"] > 1 else "")
    linhas = [
        "🚨 *ALERTA PARTIU085* ✈️",
        "",
        f"*{C.ORIGEM_NOME} → {a['destino_nome']}*",
        f"💰 *{brl(a['preco'])}* ida e volta",
        f"📉 {round(a['desconto'] * 100)}% abaixo do normal (costuma sair por {brl(a['preco_tipico'])})",
    ]
    if cia or paradas:
        linhas.append("🛫 " + " · ".join(x for x in [cia, paradas] if x))
    datas = a["datas"]
    linhas += ["", f"📅 *{len(datas)} combinações de data* com esse valor:" if len(datas) > 1 else "📅 *Data:*"]
    for d in datas[:8]:
        linhas.append(f"• {dmy(d['ida'])} → {dmy(d['volta'])}")
    if len(datas) > 8:
        linhas.append(f"• …e mais {len(datas) - 8} datas em {', '.join(a['meses'])}")
    linhas += ["", f"🔎 Ver no Google Voos: {a['link_google']}"]
    if a.get("link_compra"):
        linhas.append(f"🛒 Comprar: {a['link_compra']}")
    linhas += ["", "⚡ Promoção pode acabar a qualquer momento!"]
    return "\n".join(linhas)


# ----------------------------------------------------------------------------- Telegram
def postar_telegram(texto: str) -> None:
    if not (TG_TOKEN and TG_CHAT):
        return
    try:
        requests.post(
            f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
            json={"chat_id": TG_CHAT, "text": texto.replace("*", ""), "disable_web_page_preview": True},
            timeout=20,
        )
    except Exception as e:  # noqa: BLE001
        log(f"  ! Telegram: {e}")


# ----------------------------------------------------------------------------- rodada
def coletar(dest: str) -> list[dict]:
    if OFFLINE:
        return dados_falsos(dest)
    tudo = []
    for mes in meses_alvo():
        tudo += tp_calendario(dest, mes)
        time.sleep(0.25)
    return normalizar(tudo)


def dados_falsos(dest: str) -> list[dict]:
    import random
    random.seed(dest)
    base = dict((d[0], d[3]) for d in C.DESTINOS)[dest] * 1.05
    out = []
    d0 = date.today() + timedelta(days=10)
    for i in range(0, 150, 2):
        ida = d0 + timedelta(days=i)
        preco = base * random.uniform(0.85, 1.4)
        if dest in ("LIS", "REC", "SAO") and 30 < i < 50:
            preco = base * 0.62
        out.append({"departure_at": ida.isoformat() + "T10:00:00-03:00",
                    "return_at": (ida + timedelta(days=7)).isoformat() + "T10:00:00-03:00",
                    "price": round(preco), "airline": "TP" if dest == "LIS" else "G3", "transfers": 0,
                    "link": f"/search/FOR{ida:%d%m}{dest}1?t=x"})
    return normalizar(out)


def rodada() -> dict:
    if not TP_TOKEN and not OFFLINE:
        raise SystemExit("Falta o segredo TRAVELPAYOUTS_TOKEN.")

    hist = ler_json(HIST_FILE, {})
    enviados = ler_json(SENT_FILE, [])
    alertas_salvos = ler_json(ALERTS_FILE, {"alertas": []})
    hoje = agora().date().isoformat()

    candidatos = []
    rotas_ok = 0
    for iata, nome, tipo, teto in C.DESTINOS:
        rota = f"{C.ORIGEM}-{iata}"
        ofertas = coletar(iata)
        if not ofertas:
            log(f"{rota}: sem dados")
            continue
        rotas_ok += 1
        tipico = preco_tipico(rota, ofertas, hist)
        menor = min(ofertas, key=lambda o: o["preco"])
        # histórico: 1 registro por rota por dia
        reg = hist.setdefault(rota, [])
        mediana_hoje = statistics.median(o["preco"] for o in ofertas)
        if reg and reg[-1]["dia"] == hoje:
            reg[-1] = {"dia": hoje, "mediana": mediana_hoje, "minimo": menor["preco"]}
        else:
            reg.append({"dia": hoje, "mediana": mediana_hoje, "minimo": menor["preco"]})
        hist[rota] = reg[-60:]

        if not tipico:
            log(f"{rota}: {len(ofertas)} ofertas, pouca base ainda")
            continue
        desconto = 1 - menor["preco"] / tipico
        log(f"{rota}: {len(ofertas)} ofertas · menor {brl(menor['preco'])} · típico {brl(tipico)} · {desconto:.0%}")
        if desconto >= C.DESCONTO_MINIMO and menor["preco"] <= teto:
            candidatos.append({
                "rota": rota, "destino": iata, "destino_nome": nome, "tipo": tipo,
                "oferta": menor, "tipico": tipico, "desconto": desconto,
                "datas": agrupar_datas(ofertas, menor["preco"]),
            })

    # não repetir: mesma rota com preço parecido nos últimos N dias
    limite = (agora() - timedelta(days=C.DIAS_SEM_REPETIR)).isoformat()
    recentes = [e for e in enviados if e["quando"] >= limite]

    def repetido(c) -> bool:
        for e in recentes:
            if e["rota"] == c["rota"] and c["oferta"]["preco"] >= e["preco"] * 0.92:
                return True
        return False

    candidatos = [c for c in candidatos if not repetido(c)]
    # prioridade: maior desconto, mais datas, internacional ganha um empurrão
    candidatos.sort(key=lambda c: c["desconto"] + min(len(c["datas"]), 10) * 0.004
                    + (0.03 if c["tipo"] == "internacional" else 0), reverse=True)

    novos = []
    verificados = 0
    for c in candidatos:
        if len(novos) >= C.MAX_ALERTAS_POR_RODADA:
            break
        o = c["oferta"]
        ao_vivo = None
        if verificados < C.MAX_VERIFICACOES:
            verificados += 1
            ao_vivo = google_preco(c["destino"], o["ida"], o["volta"])
            time.sleep(1.5)
        if ao_vivo is not None:
            if ao_vivo > o["preco"] * 1.12:
                log(f"  x {c['rota']}: Google mostra {brl(ao_vivo)} (cache dizia {brl(o['preco'])}) — descartado")
                continue
            preco = min(ao_vivo, o["preco"]) if ao_vivo >= o["preco"] * 0.6 else o["preco"]
            verificado = True
        else:
            if c["desconto"] < 0.30:
                log(f"  ? {c['rota']}: não deu pra conferir e desconto < 30% — fica pra próxima")
                continue
            preco, verificado = o["preco"], False
        desconto = 1 - preco / c["tipico"]
        if desconto < C.DESCONTO_MINIMO:
            continue
        meses = sorted({MESES_PT[int(d["ida"][5:7]) - 1] for d in c["datas"]},
                       key=lambda m: MESES_PT.index(m))
        a = {
            "id": f"{c['rota']}-{o['ida']}-{int(time.time())}",
            "criado": agora().isoformat(timespec="minutes"),
            "rota": c["rota"],
            "destino": c["destino"],
            "destino_nome": c["destino_nome"],
            "tipo": c["tipo"],
            "preco": round(preco),
            "preco_tipico": round(c["tipico"]),
            "desconto": round(desconto, 3),
            "cia": o["cia"],
            "cia_nome": CIAS.get(o["cia"], o["cia"]),
            "escalas": o["escalas"],
            "datas": c["datas"] or [{"ida": o["ida"], "volta": o["volta"], "preco": round(preco)}],
            "meses": meses,
            "verificado": verificado,
            "link_google": google_link(c["destino"], o["ida"], o["volta"]),
            "link_compra": link_compra(o),
        }
        a["texto"] = texto_whatsapp(a)
        novos.append(a)
        enviados.append({"rota": a["rota"], "preco": a["preco"], "quando": agora().isoformat()})
        postar_telegram(a["texto"])
        log(f"  ✓ ALERTA {a['rota']} {brl(a['preco'])} (-{a['desconto']:.0%}) {len(a['datas'])} datas"
            f" {'[conferido]' if verificado else '[não conferido]'}")

    # salvar
    corte = (agora() - timedelta(days=30)).isoformat()
    todos = novos + [a for a in alertas_salvos.get("alertas", []) if a["criado"] >= corte]
    salvar_json(ALERTS_FILE, {"atualizado": agora().isoformat(timespec="minutes"), "alertas": todos})
    salvar_json(HIST_FILE, hist)
    salvar_json(SENT_FILE, [e for e in enviados if e["quando"] >= corte])
    rodadas = ler_json(LOG_FILE, [])
    rodadas.append({"quando": agora().isoformat(timespec="minutes"), "rotas_com_dados": rotas_ok,
                    "candidatos": len(candidatos), "alertas": len(novos)})
    salvar_json(LOG_FILE, rodadas[-300:])
    log(f"\nRodada: {rotas_ok}/{len(C.DESTINOS)} rotas com dados · {len(candidatos)} candidatos · {len(novos)} alertas novos")
    return {"novos": len(novos)}


if __name__ == "__main__":
    try:
        rodada()
    except SystemExit:
        raise
    except Exception:
        traceback.print_exc()
        sys.exit(1)
