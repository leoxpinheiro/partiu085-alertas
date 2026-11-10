"""Fábrica de conteúdo do Partiu 085: monta sozinha um carrossel por dia com dado real do radar.

Cada dia da semana tem um formato (e uma cor da marca), pra o perfil não ficar repetido:
  seg  notícias do Ceará (manchetes da semana, com fonte)    · creme
  ter  sexta a domingo fora de Fortaleza                      · azul
  qua  próximo feriadão: quanto tá a ida e volta              · amarelo
  qui  voo direto saindo de Fortaleza                         · azul-marinho
  sex  destino da semana (o mais abaixo do preço normal)      · verde
  sáb  internacional: ida e volta mais baratas                · azul-marinho
  (dom fica com o "Achados da semana", do conteudo_auto.py)
Desenha em HTML (fontes e ícones da marca), tira foto com o Chromium e agenda no Instagram às 11:30.
Uso: python engine/fabrica.py [seg|ter|qua|qui|sex|sab] [--sem-agendar]
"""
from __future__ import annotations

import asyncio
import glob
import json
import re
import statistics
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DOCS = RAIZ / "docs"
FUSO = timezone(timedelta(hours=-3))
HORA = "11:30"
NV, AZ, AM, CR, VD = "#0B2440", "#1F5FBF", "#F5C531", "#F7F4EE", "#1E7A45"
MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
SEM = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]


def ler(p, d):
    try:
        return json.loads((DOCS / p).read_text())
    except Exception:  # noqa: BLE001
        return d


def brl(v) -> str:
    return "R$ " + f"{round(v):,}".replace(",", ".")


def dm(s: str) -> str:
    return f"{s[8:10]}/{s[5:7]}"


def dsem(s: str) -> str:
    return f"{SEM[date.fromisoformat(s).weekday()]} {dm(s)}"


def hoje() -> date:
    return datetime.now(FUSO).date()


def rotas():
    return {r["iata"]: r for r in ler("rotas.json", []) if r.get("ativo", True)}


def cal(k):
    return ler(f"calendario/{k}.json", {})


def foto(k):
    return f"../fotos/{k}.jpg" if (DOCS / "fotos" / f"{k}.jpg").exists() else "../marca/fotos-extra/hd-decolagem-1.jpg"


# ---------------------------------------------------------------- dados
def d_fds():
    R = []
    for k, r in rotas().items():
        if r["tipo"] != "nacional":
            continue
        c = cal(k)
        I = {x["dia"]: x for x in c.get("ida", []) if x.get("preco")}
        V = {x["dia"]: x for x in c.get("volta", []) if x.get("preco")}
        best = None
        for a, x in I.items():
            d0 = date.fromisoformat(a)
            if d0.weekday() != 4 or d0 <= hoje() + timedelta(days=3):
                continue
            b = (d0 + timedelta(days=2)).isoformat()
            if b in V and (not best or x["preco"] + V[b]["preco"] < best[0]):
                best = (x["preco"] + V[b]["preco"], a, b)
        if best:
            R.append({"k": k, "nome": r["nome"], "preco": best[0], "sub": f"sex {dm(best[1])} a dom {dm(best[2])}"})
    return sorted(R, key=lambda x: x["preco"])[:5]


def d_diretos():
    R = []
    for k, r in rotas().items():
        if r["tipo"] != "nacional":
            continue
        di = [x for x in cal(k).get("ida", []) if x.get("escalas") == 0 and x.get("preco") and x["dia"] > hoje().isoformat()]
        if len(di) >= 3:
            m = min(di, key=lambda x: x["preco"])
            R.append({"k": k, "nome": r["nome"], "preco": m["preco"], "sub": f"{m.get('cia', '')} · {dm(m['dia'])}"})
    return sorted(R, key=lambda x: x["preco"])[:5]


def d_feriado():
    hj = hoje().isoformat()
    for f in ler("feriados.json", {}).get("feriados", []):
        if any(d > (hoje() + timedelta(days=3)).isoformat() for d in f.get("idas", [])) and len(f.get("destinos", [])) >= 3:
            L = [{"k": x["code"], "nome": x["nome"], "preco": x["total"],
                  "sub": f"{dm(x['ida']['dia'])} a {dm(x['volta']['dia'])}" + (" · direto" if x["ida"].get("escalas") == 0 and x["volta"].get("escalas") == 0 else "")}
                 for x in f["destinos"][:5]]
            return {"nome": f["nome"], "idas": f["idas"], "voltas": f["voltas"], "visto": f.get("visto", hj), "L": L}
    return None


def d_destino():
    V = ler("vitrine.json", {}).get("rotas", {})
    L = [dict(k=k, **v) for k, v in V.items() if v.get("tipo") == "nacional" and (v.get("d") or 0) >= 0.12 and v.get("ida", "") > hoje().isoformat()]
    return max(L, key=lambda x: x["d"]) if L else None


def d_inter():
    V = ler("ida_volta.json", {}).get("rotas", {})
    lim = (datetime.now(FUSO) - timedelta(days=8)).isoformat()
    L = [{"k": k, "nome": v.get("nome", k), "preco": v["atual"]["preco"], "sub": f"{dm(v['atual']['ida'])} a {dm(v['atual']['volta'])} · {v['atual'].get('cia', '')}"}
         for k, v in V.items() if v.get("atual") and v["atual"].get("visto", "") >= lim and v["atual"]["ida"] > hoje().isoformat()]
    return sorted(L, key=lambda x: x["preco"])[:5]


def curto(t: str, n: int = 90) -> str:
    return t if len(t) <= n else t[:n].rsplit(" ", 1)[0].rstrip(",;:") + "…"


LOCAL = re.compile(r"Fortaleza|Ceará|Cear[aá]|Pinto Martins|Jericoacoara|Juazeiro|Cariri|Canoa Quebrada", re.I)


def d_noticias():
    lim = (datetime.now(FUSO) - timedelta(days=8)).isoformat()
    vistos, L = set(), []
    for x in ler("noticias.json", {}).get("itens", []):
        t = x.get("titulo", "")
        if x.get("data", "") < lim or not LOCAL.search(t) or t[:40] in vistos:
            continue
        vistos.add(t[:40])
        L.append({"titulo": re.sub(r"\s*»\s*$", "", t), "fonte": x.get("fonte", "").replace("www.", ""), "data": x.get("data", "")[:10]})
    return L[:3]


# ---------------------------------------------------------------- desenho
CSS = """@font-face{font-family:A;src:url("../../engine/fontes/Anton-Regular.ttf")}
@font-face{font-family:J;src:url("../../engine/fontes/PlusJakartaSans.ttf");font-weight:200 800}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:J,sans-serif}
.s{width:1080px;height:1350px;position:relative;overflow:hidden}
.H{font-family:A;text-transform:uppercase;line-height:.92;letter-spacing:.5px}
.abs{position:absolute}.ph{object-fit:cover}
.tag{display:inline-block;font-weight:800;font-size:24px;letter-spacing:.08em;border-radius:999px;padding:9px 20px}
.marca{position:absolute;left:64px;bottom:50px;display:flex;gap:12px;align-items:center;font-weight:800;font-size:26px}
.marca img{width:44px;height:44px;border-radius:50%}
.row{display:flex;align-items:center;gap:22px;border-radius:26px;padding:14px 24px 14px 14px}
.row img{width:118px;height:118px;border-radius:20px;object-fit:cover;flex:none}
.row .n{flex:1;min-width:0}.row .n b{font-family:A;font-size:46px;text-transform:uppercase;display:block;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row .n span{font-size:23px;font-weight:700;opacity:.75}
.row .v{font-family:A;font-size:56px;white-space:nowrap}
.foot{position:absolute;left:64px;right:64px;bottom:118px;font-size:19px;font-weight:600;line-height:1.4;opacity:.7}
.pol{position:absolute;background:#fff;padding:16px 16px 60px;box-shadow:0 20px 40px rgba(0,0,0,.25)}.pol img{width:100%;height:100%;object-fit:cover}
.pol b{position:absolute;left:0;right:0;bottom:12px;text-align:center;font-family:A;font-size:32px;color:#0B2440}
.i3{position:absolute;filter:drop-shadow(0 24px 30px rgba(0,0,0,.35))}
"""
TEMAS = {  # fundo, texto, destaque, tag(bg,fg), linha(bg), 1ª linha(bg,fg)
    "azul": (AZ, "#fff", AM, (AM, NV), "#fff", (AM, NV), NV),
    "marinho": (f"linear-gradient(160deg,#133a63,{NV} 60%,#06172b)", "#fff", AM, (AM, NV), "rgba(255,255,255,.1)", ("rgba(245,197,49,.22)", "#fff"), "#fff"),
    "amarelo": (AM, NV, AZ, (NV, AM), "#fff", (NV, AM), NV),
    "verde": (VD, CR, AM, (AM, NV), "rgba(247,244,238,.12)", ("rgba(245,197,49,.25)", CR), CR),
    "creme": (CR, NV, AZ, (AM, NV), "#fff", (NV, AM), NV),
}


def lista(L, t, top=380):
    bg, fg, ac, _, lb, (fb, ff), lf = TEMAS[t]
    o = f'<div class="abs" style="left:56px;right:56px;top:{top}px;display:grid;gap:16px">'
    for i, x in enumerate(L):
        o += (f'<div class="row" style="background:{fb if i == 0 else lb};color:{ff if i == 0 else lf}"><img src="{foto(x["k"])}">'
              f'<div class="n"><b>{x["nome"]}</b><span>{x["sub"]}</span></div><div class="v" style="color:{ff if i == 0 else (ac if lb.startswith("rgba") else lf)}">{brl(x["preco"])}</div></div>')
    return o + "</div>"


def secao(t, corpo):
    bg, fg = TEMAS[t][0], TEMAS[t][1]
    return f'<section class="s" style="background:{bg};color:{fg}">{corpo}<div class="marca"><img src="../marca/icone.png">@partiu.085</div></section>'


def tag(t, txt, top=70):
    b, f = TEMAS[t][3]
    return f'<div class="abs" style="left:64px;top:{top}px"><span class="tag" style="background:{b};color:{f}">{txt}</span></div>'


def titulo(t, l1, l2, top=150, tam=98):
    return f'<div class="abs H" style="left:64px;right:64px;top:{top}px;font-size:{tam}px">{l1}<br><span style="color:{TEMAS[t][2]}">{l2}</span></div>'


def capa_foto(t, chip, l1, l2, sub, img):
    bg = TEMAS[t][0]
    cor = bg if not bg.startswith("linear") else NV
    return secao(t, f'<img class="abs ph" src="{img}" style="left:0;top:0;width:1080px;height:760px">'
                    f'<div class="abs" style="left:0;top:520px;width:1080px;height:260px;background:linear-gradient(transparent,{cor})"></div>'
                    + tag(t, chip) + titulo(t, l1, l2, top=(780 if len(l1) + len(l2) > 18 else 800), tam=(100 if len(l1) + len(l2) > 18 else 128)) +
                    f'<div class="abs" style="left:64px;right:64px;top:1130px;font-size:34px;font-weight:700;line-height:1.3">{sub}</div>')


def capa_polaroid(t, chip, l1, l2, sub, L):
    p = [(520, 90, 430, 500, 7), (300, 330, 380, 450, -8), (640, 500, 340, 380, 4)]
    pol = "".join(f'<div class="pol" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;transform:rotate({r}deg)"><img src="{foto(i["k"])}"><b>{i["nome"].upper()[:14]}</b></div>' for (x, y, w, h, r), i in zip(p, L))
    return secao(t, pol + tag(t, chip) + titulo(t, l1, l2, top=(920 if len(l1) + len(l2) > 18 else 860), tam=(92 if len(l1) + len(l2) > 18 else 130)) +
                 f'<div class="abs" style="left:64px;right:64px;top:1150px;font-size:34px;font-weight:700;line-height:1.3">{sub}</div>')


def cta(t, l1, l2, sub):
    return secao(t, f'<img class="i3" src="../marca/3d/mobile_phone_3d.png" style="left:370px;top:170px;width:340px">'
                    f'<img class="i3" src="../marca/3d/bell_3d.png" style="left:620px;top:200px;width:160px;transform:rotate(14deg)">'
                    f'<div class="abs H" style="left:64px;right:64px;top:640px;font-size:104px;text-align:center">{l1}<br><span style="color:{TEMAS[t][2]}">{l2}</span></div>'
                    f'<div class="abs" style="left:90px;right:90px;top:900px;text-align:center;font-size:34px;font-weight:600;line-height:1.35">{sub}</div>'
                    f'<div class="abs" style="left:0;right:0;top:1060px;text-align:center"><span style="display:inline-block;background:{TEMAS[t][3][0]};color:{TEMAS[t][3][1]};font-weight:800;font-size:36px;border-radius:999px;padding:22px 44px">Salva e segue @partiu.085</span></div>')


def foot(txt):
    return f'<div class="foot">{txt}</div>'


H = "#fortaleza #passagembarata #viagem #ceara #partiu085"


def montar(dia: str):
    hj = hoje().strftime("%d/%m/%Y")
    if dia == "ter":
        L, t = d_fds(), "azul"
        if len(L) < 3:
            return None
        sec = [capa_polaroid(t, "🧳 FIM DE SEMANA", "SEXTA A", "DOMINGO", f'Viaja sem perder dia de trabalho. <b style="color:{AM}">A partir de {brl(L[0]["preco"])}</b> ida e volta.', L),
               secao(t, tag(t, "SAI SEXTA · VOLTA DOMINGO") + titulo(t, "ONDE PASSAR", "O FIM DE SEMANA") + lista(L, t) + foot(f"Menor ida (sexta) + volta (domingo), visto pelo radar Partiu 085 em {hj}. Pode mudar a qualquer momento.")),
               cta(t, "SALVA E", "MARCA QUEM VAI", "Toda terça o radar mostra os fins de semana mais baratos.")]
        leg = "🧳 SEXTA A DOMINGO FORA DE FORTALEZA\n\nSai na sexta, volta no domingo:\n\n" + "\n".join(f"✈️ {x['nome']} · {brl(x['preco'])} ({x['sub']})" for x in L)
    elif dia == "qui":
        L, t = d_diretos(), "marinho"
        if len(L) < 3:
            return None
        sec = [capa_foto(t, "✈️ SEM ESCALA", "VOO", "DIRETO", f'Saindo de Fortaleza, a partir de <b style="background:{AM};color:{NV};border-radius:12px;padding:0 12px">{brl(L[0]["preco"])}</b> o trecho.', "../marca/fotos-extra/hd-asa-2.jpg"),
               secao(t, titulo(t, "A PARTIR DE", "QUANTO TÁ", top=110) + lista(L, t, top=340) + foot(f"Menor preço do trecho de ida em voo direto nos próximos 3 meses, radar Partiu 085, {hj}.")),
               cta(t, "VOO DIRETO", "BARATO EXISTE", "O radar mostra quando aparece. Salva essa lista.")]
        leg = "✈️ VOO DIRETO SAINDO DE FORTALEZA: A PARTIR DE QUANTO TÁ\n\nMenor preço do trecho de ida, sem escala:\n\n" + "\n".join(f"▪️ {x['nome']} · {brl(x['preco'])} ({x['sub']})" for x in L)
    elif dia == "qua":
        f, t = d_feriado(), "amarelo"
        if not f:
            return None
        L = f["L"]
        datas = f"ida {' ou '.join(dm(d) for d in f['idas'])} · volta {' ou '.join(dm(d) for d in f['voltas'])}"
        sec = [capa_polaroid(t, f"🗓️ FERIADÃO · {f['nome'].upper()}", "FERIADÃO", "SAINDO DE FORTALEZA", f'{datas}. <b style="color:{AZ}">A partir de {brl(L[0]["preco"])}</b> ida e volta.', L),
               secao(t, tag(t, datas.upper()) + titulo(t, "QUANTO TÁ", "A IDA E VOLTA") + lista(L, t) + foot(f"Menor ida + volta nas datas do feriado, visto pelo radar Partiu 085 em {dm(f['visto'][:10])}. Pode mudar a qualquer momento.")),
               cta(t, "FERIADO", "ESGOTA RÁPIDO", "Salva e marca quem vai com você.")]
        leg = f"🗓️ FERIADÃO ({f['nome']}) SAINDO DE FORTALEZA: QUANTO TÁ\n\n{datas}\n\n" + "\n".join(f"✈️ {x['nome']} · {brl(x['preco'])} ({x['sub']})" for x in L)
    elif dia == "sex":
        x, t = d_destino(), "verde"
        if not x:
            return None
        nome = x["nome"]
        sec = [capa_foto(t, "📍 DESTINO DA SEMANA", nome.upper(), f"{round(x['d'] * 100)}% ABAIXO", f'Ida e volta saindo de Fortaleza por <b style="color:{AM}">{brl(x["rt"])}</b>.', foto(x["k"])),
               secao(t, tag(t, "O ACHADO") + titulo(t, nome.upper(), "QUANTO TÁ") +
                     f'<div class="abs" style="left:64px;right:64px;top:430px;display:grid;gap:22px">'
                     f'<div style="background:rgba(247,244,238,.12);border-radius:30px;padding:34px"><div style="font-size:30px;font-weight:700;opacity:.8">Ida e volta</div><div class="H" style="font-size:160px;color:{AM}">{brl(x["rt"])}</div></div>'
                     f'<div style="background:rgba(247,244,238,.12);border-radius:30px;padding:30px;font-size:34px;font-weight:700;line-height:1.4">🗓️ {dsem(x["ida"])} a {dsem(x["volta"])}<br>📉 Normal da rota: {brl(x["normal"])} ({round(x["d"] * 100)}% abaixo)<br>✈️ {x.get("cia") or ""}</div></div>'
                     + foot(f"Menor ida e volta (3 a 10 dias) visto pelo radar Partiu 085 nos últimos dias. Pode mudar a qualquer momento.")),
               cta(t, "ACHADO ASSIM", "SOME RÁPIDO", "Segue pra ver o próximo antes de todo mundo.")]
        leg = f"📍 DESTINO DA SEMANA: {nome.upper()}\n\n💰 Ida e volta saindo de Fortaleza por {brl(x['rt'])}\n🗓️ {dm(x['ida'])} a {dm(x['volta'])}\n📉 {round(x['d'] * 100)}% abaixo do normal dessa rota ({brl(x['normal'])})"
    elif dia == "sab":
        L, t = d_inter(), "marinho"
        if len(L) < 3:
            return None
        sec = [capa_foto(t, "🌍 INTERNACIONAL", "PRA FORA", "SAINDO DE FORTALEZA", f'Ida e volta na mesma reserva, a partir de <b style="color:{AM}">{brl(L[0]["preco"])}</b>.', foto(L[0]["k"])),
               secao(t, tag(t, "IDA E VOLTA · MESMA RESERVA") + titulo(t, "QUANTO TÁ", "PRA FORA") + lista(L, t) + foot(f"Menor ida e volta (5 a 10 dias) visto pelo radar Partiu 085 na última semana. Pode mudar a qualquer momento.")),
               cta(t, "SALVA PRA", "PLANEJAR", "Pra fora, ida e volta junto costuma sair mais barato que trechos separados.")]
        leg = "🌍 PRA FORA SAINDO DE FORTALEZA: QUANTO TÁ A IDA E VOLTA\n\n" + "\n".join(f"✈️ {x['nome']} · {brl(x['preco'])} ({x['sub']})" for x in L)
    elif dia == "seg":
        N, t = d_noticias(), "creme"
        if len(N) < 2:
            return None
        ini = (hoje() - timedelta(days=7)).strftime("%d/%m")
        cab = f'<div class="abs" style="left:64px;right:64px;top:60px;border-top:6px solid {NV};border-bottom:2px solid {NV};padding:12px 0;display:flex;justify-content:space-between;font-weight:800;font-size:24px;letter-spacing:.1em"><span>PARTIU 085 · NOTÍCIAS</span><span>SEMANA {ini} A {hoje().strftime("%d/%m")}</span></div>'
        itens = "".join(f'<div style="padding:34px 0;{"border-bottom:2px solid " + NV if i < len(N) - 1 else ""}"><div class="H" style="font-size:60px">{curto(n["titulo"])}</div><div style="font-size:19px;font-weight:800;opacity:.6;margin-top:10px">{n["fonte"].upper()} · {dm(n["data"])}</div></div>' for i, n in enumerate(N))
        sec = [secao(t, cab + '<img class="abs ph" src="../marca/fotos-extra/hd-asa-2.jpg" style="left:64px;top:150px;width:952px;height:560px">' + titulo(t, "O QUE MUDOU", "NOS VOOS DO CEARÁ", top=770, tam=118) +
                     f'<div class="abs" style="left:64px;right:64px;top:1170px;font-size:30px;font-weight:700">{len(N)} notícias que mexem com quem viaja saindo de Fortaleza →</div>'),
               secao(t, cab.replace("PARTIU 085 · NOTÍCIAS", "ESTA SEMANA") + f'<div class="abs" style="left:64px;right:64px;top:150px">{itens}</div>')]
        leg = "📰 O QUE MUDOU NOS VOOS DO CEARÁ ESTA SEMANA\n\n" + "\n".join(f"▪️ {n['titulo']} ({n['fonte']}, {dm(n['data'])})" for n in N) + "\n\n💬 Qual dessas te interessa mais? Comenta!"
    else:
        return None
    if dia != "seg":
        leg += f"\n\n🕐 Preços vistos pelo radar Partiu 085. Passagem muda de preço a qualquer momento."
    leg += f"\n\n📌 Salva e manda pra quem vai com você\n🔔 Siga @partiu.085\n\n{H}"
    return sec, leg


async def fotografar(html: Path, pref: str) -> list[str]:
    from playwright.async_api import async_playwright
    out = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 1080, "height": 1350})
        await pg.goto(html.resolve().as_uri())
        await pg.wait_for_timeout(1200)
        for i, s in enumerate(await pg.query_selector_all("section.s"), 1):
            n = f"ig/{pref}-{i}.jpg"
            await s.screenshot(path=str(DOCS / n), type="jpeg", quality=90)
            out.append(n)
        await b.close()
    return out


def main(args):
    dia = next((a for a in args if a in ("seg", "ter", "qua", "qui", "sex", "sab")), None)
    if not dia:
        dia = ["seg", "ter", "qua", "qui", "sex", "sab", None][hoje().weekday()]
    if not dia:
        return
    tag_ = f"fab-{hoje().isoformat()}-{dia}"
    fila = ler("ig_fila.json", [])
    if any(x.get("origem") == tag_ for x in fila) and "--sem-agendar" not in args:
        print("fábrica: já fiz o de hoje")
        return
    r = montar(dia)
    if not r:
        print(f"fábrica ({dia}): sem dado suficiente hoje, pulei")
        return
    sec, leg = r
    tmp = DOCS / "ig" / f"_{tag_}.html"
    tmp.parent.mkdir(parents=True, exist_ok=True)
    tmp.write_text(f"<!doctype html><html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{''.join(sec)}</body></html>")
    imgs = asyncio.run(fotografar(tmp, tag_))
    tmp.unlink()
    if "--sem-agendar" in args:
        print("prévia:", imgs)
        return
    agora = datetime.now(FUSO)
    q = f"{hoje().isoformat()}T{HORA}-03:00"
    if agora.strftime("%H:%M") > "10:00":
        q = f"{(hoje() + timedelta(days=1)).isoformat()}T{HORA}-03:00"
    fila = ler("ig_fila.json", [])
    fila.append({"id": tag_, "titulo": f"Fábrica: {dia} ({hoje().strftime('%d/%m')})", "tipo": "carrossel", "imagens": imgs, "legenda": leg,
                 "quando": q, "aprovado": True, "auto_aprovado": True, "tentativa": 0, "criado": agora.isoformat(timespec="minutes"), "origem": tag_})
    (DOCS / "ig_fila.json").write_text(json.dumps(fila, ensure_ascii=False, indent=1) + "\n")
    print(f"fábrica ({dia}): {len(imgs)} telas, agendado {q}")


if __name__ == "__main__":
    main(sys.argv[1:])
