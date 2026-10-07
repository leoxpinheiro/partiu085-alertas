"""Radar Partiu085 — motor de alertas de passagens saindo de Fortaleza.

Cada rodada (a cada 3h, no GitHub Actions):
1. Lê as rotas cadastradas no painel (docs/rotas.json) e os ajustes (docs/ajustes.json).
2. Para um lote de rotas (rodízio + rotas em foco), consulta no Google Voos o preço
   SÓ IDA de cada dia: Fortaleza → destino (ida) e destino → Fortaleza (volta).
3. Compara o menor preço com a média do radar para aquela rota.
4. Quando está bem abaixo, lista as datas de ida e de volta que saem por esse valor
   (agrupadas por mês), gera o texto, salva no painel e posta no Telegram.
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
HIST_FILE = DATA / "historico_trechos.json"
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
MESES_LONGO = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto",
               "Setembro", "Outubro", "Novembro", "Dezembro"]

AJUSTES_PADRAO = {
    "desconto_minimo": 0.20,       # quanto abaixo da média o menor trecho precisa estar
    "max_alertas_por_rodada": 3,
    "rotas_por_rodada": 6,         # cada rota = ~2 x 90 consultas
    "dias_inicio": 5,
    "dias_fim": 95,                # janela de datas varrida
    "passo_dias": 1,               # 1 = todo dia
    "tolerancia_datas": 0.10,      # datas listadas: até 10% acima do menor preço
    "max_escalas_nacional": 1,
    "max_escalas_internacional": 2,
    "dias_sem_repetir": 3,
    "link_whatsapp": "https://bit.ly/radar085",
    "assinatura": "",
    "mostrar_link": False,
    "linha_premium": False,
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


def log(*a):
    print(*a, flush=True)


def carregar_rotas() -> list[dict]:
    rotas = ler_json(ROTAS_FILE, None)
    if not rotas:
        rotas = [{"iata": i, "nome": n, "tipo": t, "teto": None, "ativo": True, "foco": False}
                 for i, n, t, _ in C.DESTINOS]
        salvar_json(ROTAS_FILE, rotas)
    return rotas


def carregar_ajustes() -> dict:
    a = dict(AJUSTES_PADRAO)
    salvo = ler_json(AJUSTES_FILE, {}) or {}
    a.update({k: v for k, v in salvo.items() if v is not None})
    return a


# ----------------------------------------------------------------------------- Google Voos (só ida)
def _query(orig: str, dest: str, dia: str):
    from fast_flights import FlightQuery, Passengers, create_query
    return create_query(
        flights=[FlightQuery(date=dia, from_airport=orig, to_airport=dest)],
        trip="one-way", seat="economy", passengers=Passengers(adults=1),
        language="pt-BR", currency="BRL",
    )


def google_link(orig: str, dest: str, dia: str) -> str:
    try:
        return _query(orig, dest, dia).url()
    except Exception:
        return f"https://www.google.com/travel/flights?q=voos%20{orig}%20{dest}%20{dia}&hl=pt-BR&curr=BRL"


def google_trecho(orig: str, dest: str, dia: str, max_escalas: int) -> dict | None:
    from fast_flights import get_flights
    res = [f for f in get_flights(_query(orig, dest, dia)) if getattr(f, "price", 0)]
    bons = [f for f in res if len(f.flights) - 1 <= max_escalas]
    if not bons:
        return None
    b = min(bons, key=lambda f: f.price)
    return {"dia": dia, "preco": float(b.price), "cia": (b.airlines or [""])[0],
            "escalas": max(0, len(b.flights) - 1)}


def varrer(orig: str, dest: str, max_esc: int, aj: dict) -> list[dict]:
    out, erros = [], 0
    d = date.today() + timedelta(days=int(aj["dias_inicio"]))
    fim = date.today() + timedelta(days=int(aj["dias_fim"]))
    while d <= fim:
        try:
            o = google_trecho(orig, dest, d.isoformat(), max_esc)
            erros = 0
            if o:
                out.append(o)
        except Exception as e:  # noqa: BLE001
            erros += 1
            log(f"  ! Google {orig}-{dest} {d}: {type(e).__name__}: {str(e)[:100]}")
            if erros >= 4:
                log(f"  ! {orig}-{dest}: muitos erros seguidos, parando")
                break
            time.sleep(4)
        time.sleep(C.PAUSA_GOOGLE)
        d += timedelta(days=int(aj["passo_dias"]))
    return out


def coletar(r: dict, aj: dict) -> tuple[list[dict], list[dict]]:
    if OFFLINE:
        return dados_falsos(r, "ida"), dados_falsos(r, "volta")
    max_esc = aj["max_escalas_nacional"] if r["tipo"] == "nacional" else aj["max_escalas_internacional"]
    ida = varrer(C.ORIGEM, r["iata"], max_esc, aj)
    volta = varrer(r["iata"], C.ORIGEM, max_esc, aj) if ida else []
    return ida, volta


def dados_falsos(r: dict, sentido: str) -> list[dict]:
    import random
    random.seed(r["iata"] + sentido)
    base = (900 if r["tipo"] == "nacional" else 2300) * random.uniform(.8, 1.2)
    out = []
    for i in range(5, 95):
        dia = date.today() + timedelta(days=i)
        p = base * random.uniform(0.9, 1.45)
        if r["iata"] in ("LIS", "REC", "SAO", "MAB") and (30 < i < 62) and random.random() < .4:
            p = base * 0.6
        out.append({"dia": dia.isoformat(), "preco": round(p), "cia": random.choice(["LATAM", "Gol", "Azul"]),
                    "escalas": random.choice([0, 0, 1])})
    return out


# ----------------------------------------------------------------------------- lógica
def tipico(chave: str, dias: list[dict], hist: dict) -> float | None:
    base = []
    if len(dias) >= 8:
        base.append(statistics.median(d["preco"] for d in dias))
    passadas = [h["mediana"] for h in hist.get(chave, [])][-40:]
    if len(passadas) >= 3:
        base.append(statistics.median(passadas))
    return max(base) if base else None


def baratas(dias: list[dict], ref: float, tol: float, maximo: int = 12) -> list[dict]:
    """Datas até tol% acima do menor preço; no máximo `maximo` (as mais baratas), em ordem de data."""
    lim = ref * (1 + tol)
    boas = sorted([d for d in dias if d["preco"] <= lim], key=lambda d: (d["preco"], d["dia"]))[:maximo]
    return sorted(boas, key=lambda d: d["dia"])


def por_mes(dias: list[dict]) -> list[dict]:
    """[{"mes": "Novembro 2026", "dias": ["05","07"]}]"""
    grupos: dict[str, list[str]] = {}
    for d in sorted(dias, key=lambda x: x["dia"]):
        y, m, dd = d["dia"].split("-")
        grupos.setdefault(f"{MESES_LONGO[int(m) - 1]} {y}", []).append(dd)
    return [{"mes": k, "dias": v} for k, v in grupos.items()]


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
    paradas = "voo direto" if a["escalas"] == 0 else f"{a['escalas']} parada" + ("s" if a["escalas"] > 1 else "")
    L = [
        "🚨 *O RADAR APITOU*",
        "",
        f"✈️ {C.ORIGEM_NOME} ({C.ORIGEM}) → {a['destino_nome']} ({a['destino']})",
        f"💰 A partir de *{brl(a['preco'])}* o trecho",
        f"{a['classe_txt']} · {round(a['desconto'] * 100)}% abaixo da média",
        f"🛫 {a['cia_nome'] or '—'} · {paradas}",
        "",
        "*Datas de ida:*",
    ]
    L += [f"{g['mes']}: {', '.join(g['dias'])}" for g in a["ida_meses"]]
    L += ["", "*Datas de volta:*"]
    L += [f"{g['mes']}: {', '.join(g['dias'])}" for g in a["volta_meses"]]
    L += ["", "⚠️ Preço pode mudar a qualquer momento."]
    if aj.get("mostrar_link"):
        L.append(f"🔗 {a['link_google']}")
    if aj.get("linha_premium"):
        L.append("⭐ Você recebeu em primeira mão por ser Premium.")
    rod = [x for x in [f"✈️ Receba alertas no WhatsApp: {aj['link_whatsapp']}" if aj.get("link_whatsapp") else "",
                       aj.get("assinatura") or ""] if x]
    if rod:
        L += [""] + rod
    return "\n".join(L)


def postar_telegram(texto: str, aj: dict) -> bool:
    if not (TG_TOKEN and TG_CHAT and aj.get("telegram_ativo", True)):
        return False
    try:
        r = requests.post(f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
                          json={"chat_id": TG_CHAT, "text": texto.replace("*", ""), "disable_web_page_preview": True},
                          timeout=20)
        return r.ok
    except Exception as e:  # noqa: BLE001
        log(f"  ! Telegram: {e}")
        return False


def registrar(hist: dict, chave: str, dias: list[dict], hoje: str) -> None:
    if not dias:
        return
    reg = [h for h in hist.get(chave, []) if h["dia"] != hoje]
    reg.append({"dia": hoje, "mediana": statistics.median(d["preco"] for d in dias),
                "minimo": min(d["preco"] for d in dias)})
    hist[chave] = reg[-90:]


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
    tol = float(aj["tolerancia_datas"])
    lote = escolher_lote(rotas, aj)
    log(f"Lote: {', '.join(r['iata'] for r in lote)}")

    candidatos, resumo = [], {}
    for r in lote:
        rota = f"{C.ORIGEM}-{r['iata']}"
        ida, volta = coletar(r, aj)
        quando = agora().isoformat(timespec="minutes")
        if not ida or not volta:
            log(f"{rota}: sem dados suficientes (ida {len(ida)}, volta {len(volta)})")
            resumo[r["iata"]] = {"ofertas": len(ida), "quando": quando}
            continue
        t_ida = tipico(rota, ida, hist)
        t_volta = tipico(f"{r['iata']}-{C.ORIGEM}", volta, hist)
        registrar(hist, rota, ida, hoje)
        registrar(hist, f"{r['iata']}-{C.ORIGEM}", volta, hoje)
        m_ida = min(ida, key=lambda d: d["preco"])
        resumo[r["iata"]] = {"ofertas": len(ida), "menor": m_ida["preco"],
                             "mediana": statistics.median(d["preco"] for d in ida), "quando": quando}
        if not t_ida or not t_volta:
            continue
        desc = 1 - m_ida["preco"] / t_ida
        log(f"{rota}: {len(ida)}+{len(volta)} dias · menor ida {brl(m_ida['preco'])} · média {brl(t_ida)} · {desc:.0%}")
        teto = float(r.get("teto") or 1e9)
        if desc < float(aj["desconto_minimo"]) or m_ida["preco"] > teto:
            continue
        d_ida = baratas(ida, m_ida["preco"], tol)
        primeira = d_ida[0]["dia"]
        volta_ok = [d for d in volta if d["dia"] > primeira]
        if not volta_ok:
            continue
        m_volta = min(volta_ok, key=lambda d: d["preco"])
        if m_volta["preco"] > t_volta * (1 - float(aj["desconto_minimo"]) / 2):
            log(f"  volta cara ({brl(m_volta['preco'])} vs média {brl(t_volta)}) — sem alerta")
            continue
        d_volta = baratas(volta_ok, m_volta["preco"], tol)
        # só idas que tenham alguma volta barata depois (pelo menos 2 dias)
        ultima_volta = max(d["dia"] for d in d_volta)
        d_ida = [d for d in d_ida
                 if (date.fromisoformat(ultima_volta) - date.fromisoformat(d["dia"])).days >= 2]
        if not d_ida:
            continue
        primeira = d_ida[0]["dia"]
        d_volta = [d for d in d_volta
                   if (date.fromisoformat(d["dia"]) - date.fromisoformat(primeira)).days >= 2]
        if not d_volta:
            continue
        m_ida = min(d_ida, key=lambda d: d["preco"])
        m_volta = min(d_volta, key=lambda d: d["preco"])
        desc = 1 - m_ida["preco"] / t_ida
        if desc < float(aj["desconto_minimo"]):
            continue
        candidatos.append({"r": r, "rota": rota, "desc": desc, "t_ida": t_ida,
                           "m_ida": m_ida, "m_volta": m_volta, "d_ida": d_ida, "d_volta": d_volta})

    limite = (agora() - timedelta(days=int(aj["dias_sem_repetir"]))).isoformat()
    recentes = [e for e in enviados if e["quando"] >= limite]
    candidatos = [c for c in candidatos
                  if not any(e["rota"] == c["rota"] and c["m_ida"]["preco"] >= e["preco"] * 0.92 for e in recentes)]
    candidatos.sort(key=lambda c: c["desc"] + min(len(c["d_ida"]), 10) * 0.004
                    + (0.02 if c["r"].get("foco") else 0), reverse=True)

    novos = []
    limite_n = 10 if ROTAS_AGORA else int(aj["max_alertas_por_rodada"])
    for c in candidatos[:limite_n]:
        r, mi, mv = c["r"], c["m_ida"], c["m_volta"]
        k, ktxt = classe(c["desc"])
        a = {
            "id": f"{c['rota']}-{mi['dia']}-{int(time.time())}",
            "criado": agora().isoformat(timespec="minutes"),
            "rota": c["rota"], "destino": r["iata"], "destino_nome": r["nome"], "tipo": r["tipo"],
            "modo": "trecho",
            "preco": round(mi["preco"]), "preco_volta": round(mv["preco"]),
            "preco_tipico": round(c["t_ida"]), "desconto": round(c["desc"], 3),
            "classe": k, "classe_txt": ktxt,
            "cia_nome": mi["cia"], "escalas": mi["escalas"],
            "ida": mi["dia"], "volta": mv["dia"],
            "datas_ida": [{"dia": d["dia"], "preco": round(d["preco"])} for d in c["d_ida"]],
            "datas_volta": [{"dia": d["dia"], "preco": round(d["preco"])} for d in c["d_volta"]],
            "ida_meses": por_mes(c["d_ida"]), "volta_meses": por_mes(c["d_volta"]),
            "meses": sorted({MESES_PT[int(d["dia"][5:7]) - 1] for d in c["d_ida"]}, key=MESES_PT.index),
            "verificado": True,
            "link_google": google_link(C.ORIGEM, r["iata"], mi["dia"]),
            "link_compra": link_aviasales(r["iata"], mi["dia"], mv["dia"]),
        }
        a["texto"] = montar_texto(a, aj)
        a["telegram"] = postar_telegram(a["texto"], aj)
        novos.append(a)
        enviados.append({"rota": a["rota"], "preco": a["preco"], "quando": agora().isoformat()})
        log(f"  ✓ {a['rota']} {brl(a['preco'])}/trecho (-{a['desconto']:.0%}) "
            f"{len(a['datas_ida'])} idas · {len(a['datas_volta'])} voltas")

    corte = (agora() - timedelta(days=45)).isoformat()
    todos = novos + [a for a in salvos if a["criado"] >= corte]
    salvar_json(ALERTS_FILE, {"atualizado": agora().isoformat(timespec="minutes"), "alertas": todos})
    salvar_json(HIST_FILE, hist)
    salvar_json(HIST_PUB, {k: v for k, v in hist.items() if k.startswith(C.ORIGEM + "-")})
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
    status["modo"] = "trecho"
    salvar_json(STATUS_FILE, status)
    log(f"\nRodada: {len(lote)} rotas · {len(candidatos)} candidatos · {len(novos)} alertas · {int(time.time()-inicio)}s")


if __name__ == "__main__":
    try:
        rodada()
    except Exception:
        traceback.print_exc()
        sys.exit(1)
