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
import re
import os
import statistics
import sys
import time
import traceback
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import sys
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
BASE_SAIDA = os.environ.get("BASE_SAIDA", "").strip()   # varredura turbo: só coleta, sem alertas
CAL_DIR = DOCS / "calendario"

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
    "vip_desconto": 0.12,
    "descanso_rota_dias": 4,
    "queda_para_repetir": 0.15,
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


CONT = {"consultas": 0, "erros": 0}  # saúde da rodada


def _um_dia(orig: str, dest: str, dia: str, max_esc: int):
    """Uma data: tenta de novo uma vez se o Google responder com erro (acontece à toa de vez em quando)."""
    err = None
    for t in range(2):
        time.sleep(C.PAUSA_GOOGLE)
        try:
            return dia, google_trecho(orig, dest, dia, max_esc), None
        except Exception as e:  # noqa: BLE001
            err = e
            time.sleep(1.5)
    return dia, None, err


def varrer(orig: str, dest: str, max_esc: int, aj: dict) -> list[dict]:
    """Varre a janela de datas com alguns robôs em paralelo (bem mais rápido) e sem desistir por 4 erros seguidos."""
    d, fim, passo = date.today() + timedelta(days=int(aj["dias_inicio"])), date.today() + timedelta(days=int(aj["dias_fim"])), int(aj["passo_dias"])
    dias = []
    while d <= fim:
        dias.append(d.isoformat())
        d += timedelta(days=passo)
    n = max(1, min(6, int(aj.get("paralelo", 3))))
    out, erros, tipos = [], 0, {}
    with ThreadPoolExecutor(max_workers=n) as ex:
        for i in range(0, len(dias), 12):
            res = list(ex.map(lambda x: _um_dia(orig, dest, x, max_esc), dias[i:i + 12]))
            for dia, o, e in res:
                CONT["consultas"] += 1
                if e is not None:
                    erros += 1
                    CONT["erros"] += 1
                    tipos[type(e).__name__] = tipos.get(type(e).__name__, 0) + 1
                elif o:
                    out.append(o)
            if i == 0 and erros >= len(res):  # o primeiro bloco inteiro deu erro: Google bloqueou ou rota sem voo
                log(f"  ! {orig}-{dest}: o Google não respondeu nas primeiras datas, pulando")
                break
    out.sort(key=lambda x: x["dia"])
    if erros:
        log(f"  {orig}-{dest}: {len(out)} datas com preço · {erros} sem resposta ({', '.join(f'{k} {v}' for k, v in tipos.items())})")
    return out


def coletar(r: dict, aj: dict) -> tuple[list[dict], list[dict]]:
    if OFFLINE:
        return dados_falsos(r, "ida"), dados_falsos(r, "volta")
    max_esc = aj["max_escalas_nacional"] if r["tipo"] == "nacional" else aj["max_escalas_internacional"]
    ida = limpar(varrer(C.ORIGEM, r["iata"], max_esc, aj), r)
    volta = limpar(varrer(r["iata"], C.ORIGEM, max_esc, aj), r) if ida else []
    return ida, volta


def falso(p: float, r: dict) -> bool:
    """O Google devolve um preço 'de mentira' (~R$ 3.850–3.870) quando não acha voo bom em rota nacional."""
    return r.get("tipo") == "nacional" and 3840 <= p <= 3870


def limpar(dias: list[dict], r: dict) -> list[dict]:
    return [d for d in dias if not falso(d["preco"], r)]


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
# Teto de ida e volta: começa mais alto (pouca informação) e vai baixando sozinho conforme o radar
# junta preços de cada rota, até o "piso" da região. Assim não fica sem alerta no começo
# e, com o tempo, só passa o que é barato de verdade pra aquela rota.
TETO_INICIAL = {"Nordeste": 1100, "Sudeste e Sul": 1500, "Centro-Oeste e Norte": 1500, "América do Sul": 3000,
                "Caribe e América do Norte": 4200, "Europa e África": 4500}
TETO_PISO = {"Nordeste": 600, "Sudeste e Sul": 800, "Centro-Oeste e Norte": 900, "América do Sul": 1800,
             "Caribe e América do Norte": 2500, "Europa e África": 2800}
DIAS_PRA_APRENDER = 30
DIAS_ROTA_PROPRIA = 7   # com 7+ dias de histórico, a rota usa o próprio preço normal como teto
_HIST_TETO: dict = {}


def regiao(iata: str) -> str:
    regs = ler_json(DOCS / "referencias.json", {}).get("regioes") or {}
    return next((n for n, ks in regs.items() if iata in ks), "")


def teto_ida_volta(iata: str, tipo: str, aj: dict, hist: dict | None = None) -> float:
    reg = regiao(iata) or ("Sudeste e Sul" if tipo == "nacional" else "Europa e África")
    ini = float({**TETO_INICIAL, **(aj.get("teto_inicial") or {})}.get(reg, 4500))
    piso = float({**TETO_PISO, **(aj.get("teto_piso") or {})}.get(reg, 800))
    h = hist if hist is not None else _HIST_TETO
    ida = {x["dia"]: x["minimo"] for x in h.get(f"{C.ORIGEM}-{iata}", [])}
    volta = {x["dia"]: x["minimo"] for x in h.get(f"{iata}-{C.ORIGEM}", [])}
    rts = sorted(ida[d] + volta[d] for d in ida if d in volta)
    if not rts:
        return ini
    if len(rts) >= DIAS_ROTA_PROPRIA:
        # cada rota com o próprio limite: o preço normal dela (mediana dos menores ida+volta de cada dia).
        # Antes o teto da região era um máximo fixo e travava rotas mais caras (Salvador, Paris, Miami…) pra sempre.
        return round(max(piso, statistics.median(rts) * 1.05))
    aprendido = statistics.median(rts) * 1.05  # o "melhor preço normal" da rota, com 5% de folga
    peso = min(1.0, len(rts) / DIAS_PRA_APRENDER)
    return round(max(piso, min(ini, ini * (1 - peso) + aprendido * peso)))


def tipico(chave: str, dias: list[dict], hist: dict) -> float | None:
    base = []
    if len(dias) >= 8:
        base.append(statistics.median(d["preco"] for d in dias))
    passadas = [h["mediana"] for h in hist.get(chave, [])][-40:]
    if len(passadas) >= 3:
        base.append(statistics.median(passadas))
    return max(base) if base else None


def piso_normal(chave: str, hist: dict) -> float | None:
    """O "melhor preço normal" da rota: mediana do MENOR preço de cada dia já varrido (sem contar hoje).
    É com ele que se mede promoção de verdade. Comparar com a mediana de todas as datas (que inclui feriado
    e alta temporada) fazia qualquer menor preço do dia parecer 40-50% mais barato."""
    hoje = agora().date().isoformat()
    mins = [h["minimo"] for h in hist.get(chave, []) if h["dia"] < hoje]
    return statistics.median(mins) if len(mins) >= DIAS_ROTA_PROPRIA else None


def classe_piso(desc: float) -> tuple[str, str]:
    if desc >= 0.30:
        return "imperdivel", "🔥 IMPERDÍVEL"
    if desc >= 0.20:
        return "otima", "⭐ ÓTIMA OPORTUNIDADE"
    return "boa", "✅ BOA OPORTUNIDADE"


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
    return u + (f"?marker={TP_MARKER}.whatsapp&currency=brl" if TP_MARKER else "?currency=brl")


def mes_curto(g: dict) -> str:
    nome, ano = (g["mes"].split(" ") + [""])[:2]
    return f"{nome}/{ano[2:]}" if ano else nome


def milhas_do_voo(dest: str, dia: str) -> list[dict]:
    """Mesmo voo (dia da ida) em milhas, pela GeckoAPI (Smiles e Azul). Sem a chave GECKO_API_KEY, não faz nada."""
    if not os.environ.get("GECKO_API_KEY") or OFFLINE:
        return []
    import milhas_busca as MB
    out = []
    for prog in MB.PROGRAMAS:
        try:
            voos = [v for v in MB.gecko(prog, C.ORIGEM, MB.AEROPORTO.get(dest, dest), dia) if v.get("milhas")]
        except Exception as e:  # noqa: BLE001
            log(f"  ! milhas {prog} {dest} {dia}: {e}")
            continue
        if voos:
            b = min(voos, key=lambda v: v["milhas"])
            out.append({"programa": prog, "milhas": int(b["milhas"]), "taxa": round(float(b.get("taxa") or 0)), "cia": b.get("cia") or ""})
    if out:
        log("  milhas: " + " · ".join(f"{m['programa']} {m['milhas']:,}".replace(",", ".") for m in out))
    return out


def casar_ida_volta(idas: list, voltas: list) -> dict | None:
    """Ida e volta casada: a combinação mais barata em que a volta é de 3 a 21 dias depois da ida."""
    from datetime import date
    melhor = None
    for i in idas:
        di = date.fromisoformat(i["dia"])
        for v in voltas:
            dur = (date.fromisoformat(v["dia"]) - di).days
            if getattr(C, "DURACAO_MIN", 3) <= dur <= getattr(C, "DURACAO_MAX", 21):
                tot = i["preco"] + v["preco"]
                if not melhor or tot < melhor["total"] or (tot == melhor["total"] and abs(dur - 7) < abs(melhor["dias"] - 7)):
                    melhor = {"ida": i["dia"], "volta": v["dia"], "total": round(tot), "dias": dur}
    return melhor


def montar_texto(a: dict, aj: dict) -> str:
    esc = a["escalas"]
    paradas = "voo direto" if esc == 0 else f"{esc} parada" + ("s" if esc and esc > 1 else "")
    emoji, rotulo = (a["classe_txt"].split(" ", 1) + [""])[:2]
    L = [
        "🚨 *O RADAR APITOU!*",
        "",
        f"✈️ *{C.ORIGEM_NOME} ➜ {a['destino_nome']}* ({a['destino']})",
    ]
    ref = (ler_json(DOCS / "referencias.json", {}).get("ref") or {}).get(a["destino"]) or {}
    if ref.get("texto"):
        L.append(f"📍 _{ref['texto']}_")
    L.append(f"💰 *{brl(a['preco'])}* o trecho")
    if a.get("par"):
        p = a["par"]
        L.append(f"🔁 Ida e volta: *{brl(p['total'])}* (ida {p['ida'][8:10]}/{p['ida'][5:7]}, volta {p['volta'][8:10]}/{p['volta'][5:7]} · {p['dias']} dias)")
    elif a.get("preco_volta"):
        L.append(f"🔁 Ida e volta a partir de *{brl(a['preco'] + a['preco_volta'])}*")
    L.append(f"{emoji} *{rotulo}*")
    L.append(f"🛫 {a['cia_nome'] or '—'} · {paradas}")
    if a.get("recorde"):
        L.append(f"📉 _Menor preço que já vimos nesse trecho ({a['base']['dias']} dias de pesquisa)_")
    if a.get("vip"):
        L.append("🎯 _Rota acompanhada a pedido dos assinantes VIP_")
    L += ["", "🗓️ *IDA*"] + [f"▸ {mes_curto(g)}: {', '.join(g['dias'])}" for g in a["ida_meses"]]
    L += ["", "🗓️ *VOLTA*"] + [f"▸ {mes_curto(g)}: {', '.join(g['dias'])}" for g in a["volta_meses"]]
    if a.get("milhas"):
        L += ["", f"💎 *Em milhas* (ida em {a['ida'][8:10]}/{a['ida'][5:7]}):"] + [f"▸ {m['programa']}: {m['milhas']:,}".replace(",", ".") + (f" + {brl(m['taxa'])} de taxas" if m.get("taxa") else "") for m in a["milhas"]]
    aviso = aj.get("aviso_preco", "⚠️ _Preço pode mudar a qualquer momento._")
    if aviso and aviso.strip():
        L += ["", aviso.strip()]
    if aj.get("link_afiliado", True) and a.get("link_compra"):
        L.append(f"🛒 Ver e comprar: {a['link_compra']}")
    elif aj.get("mostrar_link"):
        L.append(f"🔗 {a['link_google']}")
    if a.get("tipo") == "internacional" and (aj.get("link_seguro") or aj.get("link_chip")):
        L.append("")
        if aj.get("link_seguro"):
            L.append(f"🛡️ Seguro viagem: {aj['link_seguro']}")
        if aj.get("link_chip"):
            L.append(f"📱 Internet no exterior (chip/eSIM): {aj['link_chip']}")
    if aj.get("linha_premium"):
        L.append("⭐ Você recebeu em primeira mão por ser Premium.")
    modelo = aj.get("rodape", "✈️ Receba alertas no WhatsApp: {link}")
    rod = [x for x in [(modelo or "").replace("{link}", aj.get("link_whatsapp") or "https://bit.ly/radar085").strip(),
                       aj.get("assinatura") or ""] if x]
    if rod:
        L += [""] + rod
    return "\n".join(L)


def para_telegram(texto: str) -> str:
    """Telegram sem formatação: tira *negrito* e _itálico_ do WhatsApp."""
    texto = texto.replace("*", "")
    return re.sub(r"(?<![\w/])_([^_\n]+)_(?![\w/])", r"\1", texto)


def postar_telegram(texto: str, aj: dict, foto: bytes | None = None) -> bool:
    """Posta no canal. Com foto: imagem com o texto na legenda (ou imagem + texto separado, se o texto for grande)."""
    if not (TG_TOKEN and TG_CHAT and aj.get("telegram_ativo", True)):
        return False
    txt = re.sub(r"(marker=\d+)\.\w+", r"\1.telegram", para_telegram(texto))  # comissão separada por canal
    try:
        if foto:
            leg = txt if len(txt) <= 1024 else None
            r = requests.post(f"https://api.telegram.org/bot{TG_TOKEN}/sendPhoto",
                              data={"chat_id": TG_CHAT, **({"caption": leg} if leg else {})},
                              files={"photo": ("alerta.jpg", foto, "image/jpeg")}, timeout=40)
            if r.ok and leg:
                return True
            if not r.ok:
                log(f"  ! Telegram foto: {r.status_code} {r.text[:120]}")
        r = requests.post(f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
                          json={"chat_id": TG_CHAT, "text": txt, "disable_web_page_preview": True},
                          timeout=20)
        return r.ok
    except Exception as e:  # noqa: BLE001
        log(f"  ! Telegram: {e}")
        return False


sys.path.insert(0, str(Path(__file__).resolve().parent))


def imagem_alerta(a: dict) -> bytes | None:
    try:
        import imagem
        return imagem.card_alerta(a)
    except Exception as e:  # noqa: BLE001
        log(f"  ! imagem {a.get('destino')}: {type(e).__name__}: {e}")
        return None


def normal_rt(iata: str, hist: dict | None = None) -> float | None:
    """Preço normal de ida e volta da rota: mediana dos menores ida+volta de cada dia já varrido."""
    h = hist if hist is not None else _HIST_TETO
    hoje = agora().date().isoformat()
    ida = {x["dia"]: x["minimo"] for x in h.get(f"{C.ORIGEM}-{iata}", []) if x["dia"] < hoje}
    volta = {x["dia"]: x["minimo"] for x in h.get(f"{iata}-{C.ORIGEM}", []) if x["dia"] < hoje}
    rts = [ida[d] + volta[d] for d in ida if d in volta]
    return statistics.median(rts) if len(rts) >= DIAS_ROTA_PROPRIA else None


def melhor_par(cal: dict) -> dict | None:
    """Ida + volta mais barata (volta de 3 a 10 dias depois da ida: viagem de verdade), a partir do calendário da rota."""
    hoje = agora().date().isoformat()
    ida = [d for d in cal.get("ida", []) if d["dia"] > hoje]
    volta = sorted((d for d in cal.get("volta", []) if d["dia"] > hoje), key=lambda d: d["dia"])
    best = None
    for d in ida:
        d0 = date.fromisoformat(d["dia"])
        vs = [v for v in volta if 3 <= (date.fromisoformat(v["dia"]) - d0).days <= 10]
        if not vs:
            continue
        v = min(vs, key=lambda x: x["preco"])
        if not best or d["preco"] + v["preco"] < best["rt"]:
            best = {"ida": d["dia"], "volta": v["dia"], "preco": d["preco"], "preco_volta": v["preco"], "rt": d["preco"] + v["preco"],
                    "cia": d.get("cia", "")}
    return best


def top5_do_dia(aj: dict) -> list[dict]:
    """Os destinos mais abaixo do preço normal DELES hoje (ida e volta), pelo histórico de cada rota."""
    st = ler_json(DOCS / "status.json", {}).get("rotas") or {}
    lim = (agora() - timedelta(hours=30)).isoformat()
    nomes = {r["iata"]: r["nome"] for r in carregar_rotas()}
    L = []
    for k, v in st.items():
        if v.get("quando", "") < lim:
            continue
        v = {**v, "nome": v.get("nome") or nomes.get(k, k)}
        cal = ler_json(CAL_DIR / f"{k}.json", {})
        par = melhor_par(cal) if cal else None
        normal = normal_rt(k)
        if not par or not normal:
            continue
        d = 1 - par["rt"] / normal
        if d < float(aj.get("top5_desconto", 0.05)):
            continue
        L.append({"k": k, "nome": v.get("nome") or k, "menor": par["preco"], "rt": par["rt"], "d": d, "normal": round(normal),
                  "ida": par["ida"], "volta": par["volta"], "cia": par["cia"],
                  "mes": par["ida"][5:7], "intl": v.get("tipo") == "internacional"})
    return sorted(L, key=lambda x: -x["d"])[:5]


def baratos_do_dia(n: int = 6) -> list[dict]:
    """Menores ida e volta nacionais de hoje (preço absoluto), com quanto estão do normal de cada rota."""
    st = ler_json(DOCS / "status.json", {}).get("rotas") or {}
    lim = (agora() - timedelta(hours=30)).isoformat()
    nomes = {r["iata"]: r["nome"] for r in carregar_rotas()}
    L = []
    for k, v in st.items():
        if v.get("quando", "") < lim or v.get("tipo") != "nacional":
            continue
        cal = ler_json(CAL_DIR / f"{k}.json", {})
        par = melhor_par(cal) if cal else None
        if not par:
            continue
        normal = normal_rt(k)
        L.append({"k": k, "nome": v.get("nome") or nomes.get(k, k), "rt": par["rt"], "menor": par["preco"], "ida": par["ida"],
                  "volta": par["volta"], "normal": round(normal) if normal else None, "d": (1 - par["rt"] / normal) if normal else None})
    return sorted(L, key=lambda x: x["rt"])[:n]


def texto_baratos(L: list[dict], aj: dict) -> str:
    hoje = agora().date().isoformat()
    T = ["💸 *IDA E VOLTA MAIS BARATAS DE HOJE*", "_Saindo de Fortaleza, voos nacionais_", f"_{hoje[8:10]}/{hoje[5:7]}_", ""]
    T += [f"✈️ *{x['nome']}* · *{brl(x['rt'])}* ({x['ida'][8:10]}/{x['ida'][5:7]} a {x['volta'][8:10]}/{x['volta'][5:7]})" for x in L]
    T += ["", aj.get("aviso_preco", "⚠️ _Preço pode mudar a qualquer momento._").strip()]
    modelo = aj.get("rodape", "✈️ Receba alertas no WhatsApp: {link}")
    if modelo:
        T += ["", modelo.replace("{link}", aj.get("link_whatsapp") or "https://bit.ly/radar085").strip()]
    return "\n".join(T)


def salvar_vitrine(dias: int = 15) -> None:
    """Vitrine do site: o menor ida e volta (viagem de 3 a 10 dias) que o radar achou em cada rota nos últimos 15 dias."""
    path = DOCS / "vitrine.json"
    V = ler_json(path, {}).get("rotas") or {}
    agora_iso = agora().isoformat(timespec="minutes")
    lim = (agora() - timedelta(days=dias)).isoformat()
    nomes = {r["iata"]: (r["nome"], r["tipo"]) for r in carregar_rotas()}
    for k, (nome, tipo) in nomes.items():
        cal = ler_json(CAL_DIR / f"{k}.json", {})
        par = melhor_par(cal) if cal else None
        if not par:
            continue
        normal = normal_rt(k)
        old = V.get(k)
        if old and old.get("visto", "") >= lim and old["rt"] <= par["rt"]:
            continue
        V[k] = {"nome": nome, "tipo": tipo, "rt": par["rt"], "menor": par["preco"], "ida": par["ida"], "volta": par["volta"],
                "cia": par.get("cia", ""), "normal": round(normal) if normal else None,
                "d": round(1 - par["rt"] / normal, 3) if normal else None, "visto": agora_iso}
    V = {k: v for k, v in V.items() if v.get("visto", "") >= lim}
    salvar_json(path, {"atualizado": agora_iso, "rotas": V})


def salvar_top5(aj: dict) -> None:
    """Listas do dia pro painel (aba Pra enviar), sempre atualizadas, mesmo quando não tem promoção relâmpago."""
    L = top5_do_dia(aj)
    B = baratos_do_dia()
    salvar_json(DOCS / "top5.json", {"atualizado": agora().isoformat(timespec="minutes"), "itens": L,
                                     "texto": texto_top5(L, aj) if L else "",
                                     "baratos": B, "texto_baratos": texto_baratos(B, aj) if B else ""})


def texto_top5(L: list[dict], aj: dict) -> str:
    n = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"]
    meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
    hoje = agora().date().isoformat()
    T = [f"🏆 *TOP {len(L)} DO DIA*" if len(L) != 5 else "🏆 *TOP 5 DO DIA*", "_Destinos abaixo do preço normal deles, saindo de Fortaleza_", f"_{hoje[8:10]}/{hoje[5:7]}_", ""]
    T += [f"{n[i]} *{x['nome']}* · ida e volta *{brl(x['rt'])}* ({x['ida'][8:10]}/{x['ida'][5:7]} a {x['volta'][8:10]}/{x['volta'][5:7]})"
          + (f" · {x['d']:.0%} abaixo do normal" if x.get("d", 0) >= 0.1 else "")
          for i, x in enumerate(L)]
    T += ["", "👉 _Quer as datas de algum? Responde aqui o número._"]
    aviso = aj.get("aviso_preco", "⚠️ _Preço pode mudar a qualquer momento._")
    if aviso and aviso.strip():
        T += ["", aviso.strip()]
    modelo = aj.get("rodape", "✈️ Receba alertas no WhatsApp: {link}")
    if modelo:
        T += ["", modelo.replace("{link}", aj.get("link_whatsapp") or "https://bit.ly/radar085").strip()]
    return "\n".join(T)


def postar_top5(aj: dict) -> None:
    """Uma vez por dia no Telegram, pra nunca ficar sem material: dia útil a partir das 17h, fim de semana a partir das 10h."""
    if OFFLINE or not aj.get("top5_telegram", True):
        return
    h = agora()
    if h.hour < (10 if h.weekday() >= 5 else 17) or h.hour >= 22:
        return
    reg_path = DOCS / "telegram_extra.json"
    reg = ler_json(reg_path, {})
    if reg.get("top5") == h.date().isoformat():
        return
    L = top5_do_dia(aj)
    if len(L) < 3:
        log(f"Top 5: só {len(L)} destinos bons hoje — não postado")
        return
    try:
        import imagem
        foto = imagem.card_top5(L, h.date().isoformat())
    except Exception as e:  # noqa: BLE001
        log(f"  ! imagem top5: {e}")
        foto = None
    if postar_telegram(texto_top5(L, aj), aj, foto=foto):
        reg["top5"] = h.date().isoformat()
        salvar_json(reg_path, reg)
        log(f"Top 5 do dia postado: {', '.join(x['nome'] for x in L)}")


def registrar(hist: dict, chave: str, dias: list[dict], hoje: str) -> None:
    if not dias:
        return
    reg = [h for h in hist.get(chave, []) if h["dia"] != hoje]
    reg.append({"dia": hoje, "mediana": statistics.median(d["preco"] for d in dias),
                "minimo": min(d["preco"] for d in dias)})
    hist[chave] = reg[-90:]


# ----------------------------------------------------------------------------- rodada
def reconferir(salvos: list[dict], rotas: list[dict], aj: dict, maximo: int | None = None) -> None:
    """Confere de novo o preço dos alertas das últimas 72h (ainda valendo ou já subiu?).
    Os que seguem valendo viram 'repescagem' no painel, ótimos pro fim de semana."""
    if OFFLINE:
        return
    maximo = int(maximo or aj.get("reconferir_max", 10))
    limite = (agora() - timedelta(hours=72)).isoformat()
    tipos = {r["iata"]: r["tipo"] for r in rotas}
    feitos = 0
    for a in salvos:
        if feitos >= maximo or a.get("modo") != "trecho" or a["criado"] < limite or a.get("ida", "") <= date.today().isoformat():
            continue
        conf = a.get("conferido") or {}
        if conf.get("status") == "subiu" or conf.get("quando", "") >= (agora() - timedelta(hours=4)).isoformat():
            continue
        nac = tipos.get(a["destino"], a.get("tipo")) == "nacional"
        try:
            g = google_trecho(C.ORIGEM, a["destino"], a["ida"],
                              aj["max_escalas_nacional"] if nac else aj["max_escalas_internacional"])
        except Exception as e:  # noqa: BLE001
            log(f"  ! reconferir {a['destino']}: {type(e).__name__}")
            continue
        feitos += 1
        if g:
            st = "valendo" if g["preco"] <= a["preco"] * 1.10 else "subiu"
            a["conferido"] = {"quando": agora().isoformat(timespec="minutes"), "preco": round(g["preco"]), "status": st}
            log(f"  conferido {a['destino']} {a['ida']}: {brl(g['preco'])} ({st})")
        time.sleep(C.PAUSA_GOOGLE)


# Rotas com voo todo dia e muita disputa de preço (capitais, Nordeste, Lisboa…) mudam de preço toda hora:
# vale olhar mais vezes. Rotas com poucos voos quase nunca têm promoção nova: olha menos, mas não abandona.
HUBS = {"SAO", "RIO", "BSB", "BHZ", "CNF", "REC", "SSA", "NAT", "JPA", "MCZ", "AJU", "SLZ", "THE", "BEL", "MAO",
        "POA", "CWB", "FLN", "VIX", "GYN", "LIS", "MIA", "ORL", "BUE"}
NICHO = {"MDE", "PUJ", "SDQ", "CTG", "PTY", "SID", "UDI", "PMW", "ADZ", "AUA", "CUR", "HAV", "LPB", "VVI", "CUZ", "UIO", "ASU"}
PESO = {"turbo": 5.0, "alta": 3.0, "normal": 1.5, "baixa": 0.6}


def prioridade_auto(r: dict, st: dict, alertas30: int) -> tuple[str, str]:
    """Devolve (prioridade, motivo) calculada pelos dados."""
    datas = (st or {}).get("ofertas")
    if alertas30 >= 3:
        return "turbo", f"{alertas30} alertas em 30 dias: promoção relâmpago, olha mais vezes"
    if alertas30 >= 2:
        return "alta", f"{alertas30} alertas em 30 dias"
    if datas is not None and datas < 35:
        return "baixa", f"poucos voos ({datas} de ~90 dias)"
    if r["iata"] in HUBS:
        return "alta", "voo todo dia, preço muda muito"
    if r["iata"] in NICHO and alertas30 == 0:
        return "baixa", "destino de nicho, promoção rara"
    if alertas30 == 0 and r.get("tipo") == "internacional" and datas is not None and datas < 70:
        return "baixa", "pouca oferta e nenhum alerta em 30 dias"
    return "normal", "padrão"


def escolher_lote(rotas: list[dict], aj: dict) -> list[dict]:
    if ROTAS_AGORA:
        return [r for r in rotas if r["iata"] in ROTAS_AGORA]
    ativas = [r for r in rotas if r.get("ativo", True)]
    if not ativas:
        return []
    foco = [r for r in ativas if r.get("foco") or r.get("vip")]
    resto = [r for r in ativas if not (r.get("foco") or r.get("vip"))]
    base = int(aj["rotas_por_rodada"])
    if agora().weekday() <= 2:  # segunda a quarta: é quando as companhias soltam promoção, varre mais
        base = round(base * float(aj.get("reforco_seg_qua", 1.35)))
    n = max(0, base - len(foco))
    if not resto:
        return foco
    status = ler_json(STATUS_FILE, {"rotas": {}}).get("rotas", {})
    enviados = ler_json(SENT_FILE, [])
    corte = (agora() - timedelta(days=30)).isoformat()
    agora_ts = agora().timestamp()
    pri = {}
    votos = ler_json(DOCS / "votos_destinos.json", {})
    votados = set(votos.get("top") or []) if votos.get("ate", "") >= agora().date().isoformat() else set()

    def urgencia(r):
        st = status.get(r["iata"], {})
        a30 = sum(1 for e in enviados if e.get("rota") == f"{C.ORIGEM}-{r['iata']}" and e.get("quando", "") >= corte)
        auto, motivo = prioridade_auto(r, st, a30)
        p = r.get("prioridade") if r.get("prioridade") in PESO else auto
        if r.get("prioridade") not in PESO and r["iata"] in votados:  # votação do radar no Instagram
            p, motivo = "alta", f"pedido pelos seguidores ({votos.get('contagem', {}).get(r['iata'])} votos)"
        pri[r["iata"]] = {"prioridade": p, "auto": auto, "motivo": motivo}
        try:
            horas = (agora_ts - datetime.fromisoformat(st["quando"]).timestamp()) / 3600
        except Exception:  # noqa: BLE001
            horas = 999  # nunca varrida: vai primeiro
        return horas * PESO[p]

    # pistas da Travelpayouts (rotas que parecem baratas lá): entram primeiro pra o Google confirmar
    desc = ler_json(DOCS / "descobertas.json", {})
    pistas = set(desc.get("pistas") or []) if desc.get("atualizado", "") >= (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat() else set()
    status_q = {k: v.get("quando", "") for k, v in status.items()}
    limite_pista = (agora() - timedelta(hours=8)).isoformat()
    com_pista = [r for r in resto if r["iata"] in pistas and status_q.get(r["iata"], "") < limite_pista][:max(2, n // 2)]
    if com_pista:
        log("Pistas da Travelpayouts: " + ", ".join(r["iata"] for r in com_pista))
    urg = {r["iata"]: urgencia(r) for r in resto}  # calcula a prioridade de todas (inclusive as pistas)
    lote = com_pista + sorted([r for r in resto if r not in com_pista], key=lambda r: urg[r["iata"]], reverse=True)[:max(0, n - len(com_pista))]
    salvar_json(DOCS / "prioridades.json", {"prioridades": pri, "quando": agora().isoformat(timespec="minutes"),
                                            "ultimo_lote": [r["iata"] for r in lote]})
    log("Lote: " + ", ".join(f"{r['iata']}({pri.get(r['iata'], {}).get('prioridade', '?')[0]})" for r in lote))
    return foco + lote


def rodada() -> None:
    inicio = time.time()
    rotas = carregar_rotas()
    aj = carregar_ajustes()
    hist = ler_json(HIST_FILE, {})
    _HIST_TETO.clear(); _HIST_TETO.update(hist)
    enviados = ler_json(SENT_FILE, [])
    salvos = ler_json(ALERTS_FILE, {"alertas": []}).get("alertas", [])
    hoje = agora().date().isoformat()
    tol = float(aj["tolerancia_datas"])
    lote = escolher_lote(rotas, aj)
    log(f"Lote: {', '.join(r['iata'] for r in lote)}")

    candidatos, resumo, calendarios = [], {}, {}
    limite_s = float(aj.get("limite_minutos", 50)) * 60
    parou = False
    for r in lote:
        if time.time() - inicio > limite_s and not BASE_SAIDA:
            log(f"⏱️ Tempo da rodada esgotado ({int((time.time() - inicio) / 60)} min): salvo o que já tenho e paro aqui.")
            parou = True
            break
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
        m_v = min(volta, key=lambda d: d["preco"])
        por_mes_ida: dict[str, float] = {}
        for d in ida:
            por_mes_ida[d["dia"][:7]] = min(d["preco"], por_mes_ida.get(d["dia"][:7], 1e12))
        resumo[r["iata"]] = {"ofertas": len(ida), "menor": m_ida["preco"], "dia_menor": m_ida["dia"],
                             "mediana": statistics.median(d["preco"] for d in ida),
                             "menor_volta": m_v["preco"], "mediana_volta": statistics.median(d["preco"] for d in volta),
                             "melhor_mes": min(por_mes_ida, key=por_mes_ida.get), "cia": m_ida["cia"],
                             "nome": r["nome"], "tipo": r["tipo"], "quando": quando}
        cal = {"iata": r["iata"], "nome": r["nome"], "atualizado": quando,
               "ida": [{k: d[k] for k in ("dia", "preco", "cia", "escalas")} for d in ida],
               "volta": [{k: d[k] for k in ("dia", "preco", "cia", "escalas")} for d in volta]}
        calendarios[r["iata"]] = cal
        if not BASE_SAIDA:
            salvar_json(CAL_DIR / f"{r['iata']}.json", cal)
        if BASE_SAIDA:
            continue
        if not t_ida or not t_volta:
            continue
        pn = piso_normal(rota, hist)
        if pn:  # régua de verdade: o menor preço normal da rota
            t_ida = pn
        desc = 1 - m_ida["preco"] / t_ida
        log(f"{rota}: {len(ida)}+{len(volta)} dias · menor ida {brl(m_ida['preco'])} · {'menor normal' if pn else 'média'} {brl(t_ida)} · {desc:.0%}")
        teto = float(r.get("teto") or 1e9)
        vip = bool(r.get("vip"))
        alvo = float(r.get("vip_alvo") or 0)
        lim_base = float(aj.get("desconto_piso", 0.15)) if pn else float(aj["desconto_minimo"])
        limiar = min(lim_base, float(aj.get("vip_desconto", 0.12))) if vip else lim_base
        no_alvo = vip and alvo > 0 and m_ida["preco"] <= alvo
        if (desc < limiar and not no_alvo) or m_ida["preco"] > teto:
            continue
        d_ida = baratas(ida, m_ida["preco"], tol)
        primeira = d_ida[0]["dia"]
        volta_ok = [d for d in volta if d["dia"] > primeira]
        if not volta_ok:
            continue
        m_volta = min(volta_ok, key=lambda d: d["preco"])
        if not vip and m_volta["preco"] > t_volta * (1 - float(aj["desconto_minimo"]) / 2):
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
        no_alvo = vip and alvo > 0 and m_ida["preco"] <= alvo
        if desc < limiar and not no_alvo:
            continue
        rt, lim_rt = m_ida["preco"] + m_volta["preco"], teto_ida_volta(r["iata"], r["tipo"], aj)
        if rt > lim_rt and not no_alvo:
            log(f"  ida e volta {brl(rt)} acima do teto da região ({brl(lim_rt)}) — sem alerta")
            continue
        if r["tipo"] == "internacional" and (m_ida.get("escalas") or 0) >= 2 and desc < float(aj.get("desconto_2paradas", 0.30)) and not no_alvo:
            log(f"  2 paradas e só {desc:.0%} abaixo — sem alerta (filtro de qualidade)")
            continue
        # promoção tem que ser usável: 2+ datas de ida e uma ida+volta casada de 3 a 21 dias
        if not vip and (len(d_ida) < int(aj.get("min_datas_ida", 2)) or not casar_ida_volta(d_ida, d_volta)):
            log(f"  só {len(d_ida)} data(s) de ida ou sem ida+volta de 3 a 21 dias — sem alerta (pouco prático)")
            continue
        candidatos.append({"r": r, "rota": rota, "desc": desc, "t_ida": t_ida, "piso": bool(pn),
                           "m_ida": m_ida, "m_volta": m_volta, "d_ida": d_ida, "d_volta": d_volta})

    if BASE_SAIDA:
        chaves = {f"{C.ORIGEM}-{r['iata']}" for r in lote} | {f"{r['iata']}-{C.ORIGEM}" for r in lote}
        salvar_json(Path(BASE_SAIDA), {"hist": {k: v for k, v in hist.items() if k in chaves},
                                       "status": resumo, "cal": calendarios})
        log(f"\nVarredura turbo: {len(lote)} rotas salvas em {BASE_SAIDA} · {int(time.time()-inicio)}s")
        return

    # "a promoção voltou": se o último alerta da rota já subiu e o preço caiu de novo pra perto dele, avisa outra vez
    ultimo = {}
    for a in salvos:
        if a.get("rota") and a["criado"] > ultimo.get(a["rota"], {}).get("criado", ""):
            ultimo[a["rota"]] = a
    def voltou(c):
        u = ultimo.get(c["rota"])
        if not u or (u.get("conferido") or {}).get("status") != "subiu":
            return False
        return c["m_ida"]["preco"] <= u["preco"] * float(aj.get("volta_promo_tol", 1.10))
    for c in candidatos:
        c["voltou"] = voltou(c)
    limite = (agora() - timedelta(days=int(aj["dias_sem_repetir"]))).isoformat()
    recentes = [e for e in enviados if e["quando"] >= limite]
    candidatos = [c for c in candidatos
                  if c["voltou"] or not any(e["rota"] == c["rota"] and c["m_ida"]["preco"] >= e["preco"] * 0.92 for e in recentes)]
    # descanso da rota: depois de um alerta, a mesma rota só volta se o preço cair bem mais
    descanso = (agora() - timedelta(days=float(aj.get("descanso_rota_dias", 4)))).isoformat()
    queda = 1 - float(aj.get("queda_para_repetir", 0.15))
    def em_descanso(c):
        if c["r"].get("vip") or c.get("voltou"):
            return False  # pedido VIP / promoção que voltou: não fica de castigo
        ant = [e["preco"] for e in enviados if e["rota"] == c["rota"] and e["quando"] >= descanso]
        return bool(ant) and c["m_ida"]["preco"] > min(ant) * queda
    bloqueados = [c["rota"] for c in candidatos if em_descanso(c)]
    if bloqueados:
        log(f"  em descanso (alerta recente): {', '.join(bloqueados)}")
    candidatos = [c for c in candidatos if not em_descanso(c)]
    # variedade: rotas que apitaram menos nos últimos 14 dias ganham prioridade
    corte14 = (agora() - timedelta(days=14)).isoformat()
    vezes = {}
    for e in enviados:
        if e["quando"] >= corte14:
            vezes[e["rota"]] = vezes.get(e["rota"], 0) + 1
    candidatos.sort(key=lambda c: c["desc"] + min(len(c["d_ida"]), 10) * 0.004
                    + (0.02 if c["r"].get("foco") else 0) - 0.03 * vezes.get(c["rota"], 0), reverse=True)

    novos = []
    limite_n = 10 if ROTAS_AGORA else int(aj["max_alertas_por_rodada"])
    for c in candidatos[:limite_n]:
        r, mi, mv = c["r"], c["m_ida"], c["m_volta"]
        k, ktxt = classe_piso(c["desc"]) if c.get("piso") else classe(c["desc"])
        a = {
            "id": f"{c['rota']}-{mi['dia']}-{int(time.time())}",
            "criado": agora().isoformat(timespec="minutes"),
            "rota": c["rota"], "destino": r["iata"], "destino_nome": r["nome"], "tipo": r["tipo"],
            "modo": "trecho",
            "preco": round(mi["preco"]), "preco_volta": round(mv["preco"]),
            "preco_tipico": round(c["t_ida"]), "desconto": round(c["desc"], 3), "regua": "menor_normal" if c.get("piso") else "media",
            "classe": k, "classe_txt": ktxt,
            "cia_nome": mi["cia"], "escalas": mi["escalas"],
            "ida": mi["dia"], "volta": mv["dia"],
            "vip": bool(r.get("vip")), "vip_nome": r.get("vip_nome") or "", "voltou": bool(c.get("voltou")),
            "datas_ida": [{"dia": d["dia"], "preco": round(d["preco"])} for d in c["d_ida"]],
            "datas_volta": [{"dia": d["dia"], "preco": round(d["preco"])} for d in c["d_volta"]],
            "ida_meses": por_mes(c["d_ida"]), "volta_meses": por_mes(c["d_volta"]),
            "meses": sorted({MESES_PT[int(d["dia"][5:7]) - 1] for d in c["d_ida"]}, key=MESES_PT.index),
            "verificado": True,
            "link_google": google_link(C.ORIGEM, r["iata"], mi["dia"]),
            "link_compra": link_aviasales(r["iata"], mi["dia"], mv["dia"]),
        }
        par = casar_ida_volta(c["d_ida"], c["d_volta"])
        if par:
            a["par"] = par
            a["link_compra"] = link_aviasales(r["iata"], par["ida"], par["volta"])
        passado = [h for h in hist.get(f"{C.ORIGEM}-{r['iata']}", []) if h["dia"] < agora().date().isoformat()]
        if passado:
            menor_visto = min(h["minimo"] for h in passado)
            a["base"] = {"dias": len(passado), "menor_visto": round(menor_visto)}
            a["recorde"] = len(passado) >= 3 and a["preco"] <= menor_visto
        try:
            a["milhas"] = milhas_do_voo(r["iata"], mi["dia"])
        except Exception as e:  # noqa: BLE001
            log(f"  ! milhas {r['iata']}: {e}")
        a["texto"] = montar_texto(a, aj)
        a["telegram"] = postar_telegram(a["texto"], aj, foto=imagem_alerta(a))
        novos.append(a)
        enviados.append({"rota": a["rota"], "preco": a["preco"], "quando": agora().isoformat()})
        log(f"  ✓ {a['rota']} {brl(a['preco'])}/trecho (-{a['desconto']:.0%}) "
            f"{len(a['datas_ida'])} idas · {len(a['datas_volta'])} voltas")

    reconferir(salvos, rotas, aj)
    # alertas antigos (régua da média): marca os que não eram promoção de verdade, pra sair da fila de envio
    for a in salvos:
        if a.get("regua") or "fraco" in a:
            continue
        mins = [h["minimo"] for h in hist.get(a.get("rota", ""), []) if h["dia"] < a["criado"][:10]]
        if len(mins) >= DIAS_ROTA_PROPRIA:
            real = 1 - a["preco"] / statistics.median(mins)
            a["desc_real"] = round(real, 3)
            a["fraco"] = real < float(aj.get("desconto_piso", 0.15))
    corte = (agora() - timedelta(days=45)).isoformat()
    todos = novos + [a for a in salvos if a["criado"] >= corte]
    salvar_json(ALERTS_FILE, {"atualizado": agora().isoformat(timespec="minutes"), "alertas": todos})
    salvar_json(HIST_FILE, hist)
    salvar_json(HIST_PUB, {k: v[-60:] for k, v in hist.items() if C.ORIGEM in k.split("-")})  # ida e volta, pro painel
    salvar_json(SENT_FILE, [e for e in enviados if e["quando"] >= corte])
    rodadas = ler_json(LOG_FILE, [])
    rodadas.append({"quando": agora().isoformat(timespec="minutes"), "rotas": [r["iata"] for r in lote],
                    "rotas_com_dados": sum(1 for v in resumo.values() if v.get("ofertas")),
                    "candidatos": len(candidatos), "alertas": len(novos),
                    "manual": bool(ROTAS_AGORA), "segundos": int(time.time() - inicio),
                    "consultas": CONT["consultas"], "erros": CONT["erros"], "parou_por_tempo": parou})
    salvar_json(LOG_FILE, rodadas[-400:])
    status = ler_json(STATUS_FILE, {"rotas": {}})
    status.setdefault("rotas", {}).update(resumo)
    status["ultima_rodada"] = agora().isoformat(timespec="minutes")
    status["modo"] = "trecho"
    status["tetos_iv"] = {r["iata"]: teto_ida_volta(r["iata"], r["tipo"], aj, hist) for r in rotas}
    salvar_json(STATUS_FILE, status)
    try:
        salvar_top5(aj)
    except Exception as e:  # noqa: BLE001
        log(f"  ! top5 painel: {e}")
    try:
        salvar_vitrine()
    except Exception as e:  # noqa: BLE001
        log(f"  ! vitrine: {e}")
    try:
        postar_top5(aj)
    except Exception as e:  # noqa: BLE001
        log(f"  ! top5: {e}")
    log(f"\nRodada: {len(lote)} rotas · {len(candidatos)} candidatos · {len(novos)} alertas · {int(time.time()-inicio)}s")


if __name__ == "__main__":
    try:
        rodada()
    except Exception:
        traceback.print_exc()
        sys.exit(1)
