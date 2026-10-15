"""🎬 Reels do achado: todo dia monta um vídeo "bem produzido" com a melhor promoção do radar
(gancho, rota animada, preço contando, época, chamada) e deixa na agenda como rascunho pro Leo aprovar."""
import json
import re
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import instagram as ig  # noqa: E402

DIRETOS = {"NAT": "1h", "REC": "1h10", "JPA": "1h05", "SSA": "1h50", "SLZ": "1h20", "THE": "1h", "BEL": "2h", "MAO": "3h20", "BSB": "2h40", "SAO": "3h30", "VCP": "3h30",
           "RIO": "3h20", "BHZ": "3h", "JDO": "1h", "GYN": "2h50", "LIS": "7h10", "PAR": "8h55", "MAD": "8h30", "BUE": "5h40", "MVD": "5h40", "ORL": "7h", "MIA": "6h30"}
MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]


def brl(v):
    return f"R$ {int(round(v)):,}".replace(",", ".")


def achado():
    st = ig.ler(ig.STATUS, {})
    a = ig.escolher_oferta(st)
    if a:
        mes = ((a.get("ida_meses") or [{}])[0].get("mes") or "").split(" ")[0].lower()
        m = re.search(r"📍 _([^_]+)_", a.get("texto") or "")
        return {"code": a["destino"], "nome": a["destino_nome"], "preco": a["preco"], "volta": a.get("preco_volta"), "cia": a.get("cia_nome") or "", "mes": mes, "escalas": a.get("escalas", 1),
                "tipico": a.get("preco_tipico"), "regiao": m.group(1) if m else "", "datas": [d["dia"] for d in a.get("datas_ida") or []][:12],
                "voltas": [d["dia"] for d in a.get("datas_volta") or []][:4], "modo": a.get("modo", "trecho")}
    rotas = ig.ler(ig.DOCS / "status.json", {}).get("rotas") or {}
    lim = (datetime.now(ig.FUSO) - timedelta(hours=30)).isoformat()
    boas = [(v["menor"] / v["mediana"], k, v) for k, v in rotas.items() if v.get("menor") and v.get("mediana") and v.get("quando", "") >= lim and v["menor"] < .85 * v["mediana"]]
    if not boas:
        return None
    _, k, v = min(boas)
    m = (v.get("dia_menor") or v.get("melhor_mes") or "")[5:7]
    return {"code": k, "nome": v.get("nome") or k, "preco": v["menor"], "volta": v.get("menor_volta"), "cia": v.get("cia") or "", "mes": MESES[int(m) - 1] if m else "", "escalas": 0 if k in DIRETOS else 1,
            "tipico": v.get("mediana"), "datas": [v["dia_menor"]] if v.get("dia_menor") else []}


def roteiro(x, hoje):
    gir = int(hoje.strftime("%j"))
    pick = lambda L: L[gir % len(L)]  # noqa: E731
    nome = x["nome"].upper()
    tempo = f"voo direto · cerca de {DIRETOS[x['code']]}" if x["code"] in DIRETOS and not x.get("escalas") else "saindo de Fortaleza"
    cenas = [
        {"tipo": "gancho", "clip": pick(["decolagem-1", "decolagem-2", "pouso-3"]), "dur": 2.9, "y0": 800, "pill": "o radar pegou hoje", "linhas": ["ACHEI PASSAGEM", "PRA " + nome], "amarelas": [1], "tam": 150},
        {"tipo": "rota", "clip": pick(["asa-2", "nuvens-1", "janela-3"]), "dur": 3.3, "nome": nome, "code": x["code"], "tempo": tempo},
        {"tipo": "preco", "clip": "janela-1", "dur": 3.8, "blur": 6, "escuro": .12, "valor": int(round(x["preco"])), "det": "o trecho" + (f" · {x['cia']}" if x["cia"] else ""),
         "iv": f"ida e volta a partir de {brl(x['preco'] + x['volta'])}" if x.get("volta") else ""},
    ]
    if x.get("mes"):
        cenas.append({"tipo": "data", "clip": pick(["asa-3", "janela-2"]), "dur": 2.4, "pre": "MELHOR ÉPOCA", "grande": x["mes"].upper(), "tam": 200, "sub": f"preço visto hoje, {hoje.strftime('%d/%m')} · muda rápido"})
    cenas.append({"tipo": "cta", "clip": "aeroporto-3", "dur": 3.0, "blur": 4, "linhas": ["QUER SABER", "ANTES DE TODO MUNDO?"], "tam": 100, "botao": "grupo grátis de alertas · link na bio"})
    return {"cenas": cenas}


def dados_motion(x, hoje):
    """Entrada do vídeo em motion graphics (engine/video/motion.html)."""
    gir = int(hoje.strftime("%j"))
    ida = x.get("modo", "trecho") == "trecho"
    paradas = "voo direto" if not x.get("escalas") else f"{x['escalas']} parada" + ("s" if x["escalas"] > 1 else "")
    info = " · ".join(v for v in [x.get("cia"), paradas] if v)
    if x["code"] in DIRETOS and not x.get("escalas"):
        info += f" · cerca de {DIRETOS[x['code']]}"
    tip = x.get("tipico")
    voltas = x.get("voltas") or []
    rod = ("volta em " + ", ".join(f"{d[8:10]}/{d[5:7]}" for d in voltas[:3])) if voltas else ""
    return {"destino": x["nome"], "code": x["code"], "pais": x.get("regiao") or "", "valor": int(round(x["preco"])),
            "costuma": int(round(tip)) if tip and tip > x["preco"] * 1.15 else 0,
            "rotulo": "SÓ A IDA · A PARTIR DE" if ida else "IDA E VOLTA · A PARTIR DE",
            "linha": f"ida e volta: {brl(x['preco'] + x['volta'])}" if ida and x.get("volta") else "",
            "info": info, "cia": x.get("cia") or "", "datas": x.get("datas") or [],
            "cal_titulo": "DATAS DE IDA" if len(x.get("datas") or []) > 1 else "DATA DE IDA", "cal_rodape": rod,
            "hoje": hoje.strftime("%d/%m"), "clip": ["nuvens-1", "janela-1", "asa-2", "janela-3", "paisagem-2"][gir % 5], "semente": gir}


def vaga(fila, hoje):
    for d in range(0, 2):
        dia = (hoje + timedelta(days=d)).date().isoformat()
        for h in ["16:30", "21:00", "12:00"]:
            q = f"{dia}T{h}-03:00"
            t = datetime.fromisoformat(q)
            if t < hoje + timedelta(minutes=40):
                continue
            if not any(x.get("tipo") != "story" and x.get("quando") and abs((datetime.fromisoformat(x["quando"]) - t).total_seconds()) < 2700 for x in fila):
                return q
    return None


DIAS_SEM = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]


def _dm(d):
    return f"{d[8:10]}/{d[5:7]}"


def _dsem(d):
    return DIAS_SEM[datetime.fromisoformat(d[:10]).weekday()]


def dados_ui(a, hoje):
    """Entrada do vídeo no estilo novo (engine/video/ui/achado.html): notificação → cartão do voo → gráfico → datas → grupo."""
    alertas = ig.ler(ig.DOCS / "alerts.json", {}).get("alertas", [])
    hist = ig.ler(ig.DOCS / "historico.json", {}).get(f"FOR-{a['destino']}") or []
    hist = [h for h in hist if h.get("mediana") and h.get("minimo")][-10:]
    tip = a.get("preco_tipico")
    par = a.get("par")
    nome = a["destino_nome"]
    if par:
        datas = [["🛫", f"Ida · {_dsem(par['ida'])} {_dm(par['ida'])}", f"Fortaleza → {nome}"],
                 ["🛬", f"Volta · {_dsem(par['volta'])} {_dm(par['volta'])}", f"{par['dias']} dias de viagem"],
                 ["💸", f"Ida e volta {brl(par['total'])}", "pelo menor preço que o radar achou"]]
    else:
        ds = [d["dia"] for d in a.get("datas_ida") or []]
        datas = [["🛫", f"Ida a partir de {_dm(a['ida'])}" if a.get("ida") else "Ida", f"Fortaleza → {nome}"]]
        if len(ds) > 1:
            datas.append(["📅", "Outras datas de ida", ", ".join(_dm(d) for d in ds[1:5])])
        datas.append(["💸", f"{brl(a['preco'])} só a ida", a.get("cia_nome") or "o trecho"])
    lim = (hoje - timedelta(hours=72)).isoformat()
    outros, vistos = [], {a["destino"]}
    for x in alertas:
        if x.get("criado", "") < lim or x["destino"] in vistos:
            continue
        vistos.add(x["destino"])
        outros.append(x)
        if len(outros) >= 3:
            break
    def linha(x, i):
        iv = f" · ida e volta {brl(x['par']['total'])}" if x.get("par") else " · só a ida"
        return [("🚨 " if i == 0 else "🔥 ") + f"{x['destino_nome']} · {brl(x['preco'])}", (x.get("cia_nome") or "") + iv, x["criado"][11:16]]
    chat = [linha(x, i) for i, x in enumerate([a] + outros)]
    dias = sorted({x["criado"][:10] for x in [a] + outros})
    quando = " e ".join(sorted({_dm(d) for d in dias})) + f"/{dias[-1][:4]}" if dias else hoje.strftime("%d/%m/%Y")
    return {"code": a["destino"], "nome": nome, "preco": int(round(a["preco"])),
            "normal": int(round(tip)) if tip and tip > a["preco"] * 1.15 else 0,
            "info": " · ".join(v for v in [a.get("cia_nome"), "só a ida" if a.get("modo", "trecho") == "trecho" else "ida e volta", f"visto em {_dm(a['criado'])}"] if v),
            "tag": a.get("classe_txt") or "", "med": [h["mediana"] for h in hist], "min": [h["minimo"] for h in hist],
            "datas": datas, "chat": chat,
            "ctasub": "abre dia 19/10 · link na bio" if hoje.date().isoformat() < "2026-10-19" else "link na bio 👆",
            "nota": f"Preços vistos pelo nosso radar em {quando}. Passagem muda de preço a qualquer hora."}


def limpar_achados(hoje, dias=5):
    """Tira de 🎬 Vídeos prontos os vídeos de achado com mais de 5 dias (a oferta já passou) e apaga os arquivos."""
    vp = ig.ler(ig.DOCS / "videos_prontos.json", [])
    fila = ig.ler(ig.FILA, [])
    pendentes = {x.get("video_pronto") for x in fila if x.get("quando", "") >= hoje.isoformat()}
    corte = (hoje - timedelta(days=dias)).date().isoformat()
    fica = []
    for v in vp:
        velho = v.get("grupo") == "Achado do dia" and (v.get("data") or v.get("criado", "")[:10] or "9999") < corte
        if velho and v.get("arq") not in pendentes:
            for k in ("arq", "capa"):
                f = ig.DOCS / (v.get(k) or "-")
                if v.get(k) and f.is_file():
                    f.unlink()
            print("apaguei vídeo velho:", v.get("id"))
        else:
            fica.append(v)
    if len(fica) != len(vp):
        ig.salvar(ig.DOCS / "videos_prontos.json", fica)


AUTO = False


def main():
    global AUTO
    AUTO = bool({**ig.AUTO_PADRAO, **ig.ler(ig.AUTO, {})}.get("auto_reels_achado"))
    hoje = datetime.now(ig.FUSO)
    limpar_achados(hoje)
    fila = ig.ler(ig.FILA, [])
    tag = "achado-" + hoje.date().isoformat()
    if any(x.get("origem") == tag for x in fila):
        print("já tem o vídeo de hoje")
        return
    x = achado()
    if not x:
        print("sem achado bom hoje")
        return
    if any(v.get("id", "").startswith(f"ig-ach-{hoje.strftime('%m%d')}-") for v in ig.ler(ig.DOCS / "videos_prontos.json", [])):
        print("já tem o vídeo de hoje")
        return
    q = vaga(fila, hoje) if AUTO else "-"
    if not q:
        print("sem horário livre")
        return
    pid = f"ig-ach-{hoje.strftime('%m%d')}-{x['code'].lower()}"
    rot = Path("/tmp/roteiro.json")
    rot.write_text(json.dumps(roteiro(x, hoje), ensure_ascii=False))
    mp4 = ig.DOCS / "ig" / f"{pid}-pronto.mp4"
    dm = Path("/tmp/motion.json")
    dm.write_text(json.dumps(dados_motion(x, hoje), ensure_ascii=False))
    vid = Path(__file__).resolve().parent / "video"
    alerta = ig.escolher_oferta(ig.ler(ig.STATUS, {}))
    if not alerta:
        print("sem alerta válido pro vídeo no estilo novo")
        return
    du = Path("/tmp/ui.json")
    du.write_text(json.dumps(dados_ui(alerta, hoje), ensure_ascii=False))
    # estilo novo (UI motion na paleta da marca) — o modelo antigo foi aposentado
    subprocess.run(["node", str(vid / "ui" / "uirender.js"), str(vid / "ui" / "achado.html"), str(mp4), "60", str(du)], check=True)
    t_capa, dur = "5.6", 22
    capa = ig.DOCS / "ig" / f"{pid}-1.jpg"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", t_capa, "-i", str(mp4), "-frames:v", "1", "-q:v", "3", str(capa)], check=True)
    rt = f"\n🔁 Ida e volta a partir de {brl(x['preco'] + x['volta'])}" if x.get("volta") else ""
    leg = (f"✈️ ACHEI PASSAGEM PRA {x['nome'].upper()}\n\n💰 {brl(x['preco'])} o trecho saindo de Fortaleza" + (f" · {x['cia']}" if x["cia"] else "") + rt
           + (f"\n📅 Melhor época: {x['mes']}" if x.get("mes") else "") + f"\n\n🕐 Preço visto pelo radar hoje, {hoje.strftime('%d/%m')}. Muda a qualquer hora."
           + "\n\n💬 Comenta EU QUERO que eu te mando os próximos 📩\n🔔 Ativa o sininho: alerta grátis de passagem saindo de Fortaleza"
           + "\n\n#fortaleza #ceara #passagensbaratas #promocaodepassagem #viagem #partiu085")
    if AUTO:  # só entra na agenda se o piloto automático do reels estiver ligado; senão fica só em 🎬 Vídeos prontos
      fila.append({"id": pid, "titulo": f"🎬 Reels do achado: {x['nome']} por {brl(x['preco'])}", "tipo": "reels", "imagens": [f"ig/{capa.name}"], "video_pronto": f"ig/{mp4.name}", "dur": dur,
                 "legenda": leg, "quando": q, "aprovado": AUTO, "auto_aprovado": AUTO, "tentativa": 0, "criado": hoje.isoformat(timespec="minutes"), "origem": tag})
    ig.salvar(ig.FILA, fila)
    vp = ig.ler(ig.DOCS / "videos_prontos.json", [])  # também aparece em 🎬 Vídeos prontos
    vp.append({"id": pid, "titulo": f"Achei passagem pra {x['nome']} por {brl(x['preco'])}", "grupo": "Achado do dia", "arq": f"ig/{mp4.name}", "capa": f"ig/{capa.name}", "dur": dur,
               "data": hoje.date().isoformat(), "legenda": leg, "criado": hoje.isoformat(timespec="minutes")})
    ig.salvar(ig.DOCS / "videos_prontos.json", vp)
    if not AUTO:
        print("ok (só em Vídeos prontos)", pid)
        return
    if AUTO:
        ig.avisar_admin(f"🎬 Reels do achado pronto: {x['nome']} por {brl(x['preco'])}. Vai sair sozinho {q[8:10]}/{q[5:7]} às {q[11:16]} (piloto automático). Se não quiser, tira da agenda no painel.")
    else:
        ig.avisar_admin(f"🎬 Reels do achado pronto: {x['nome']} por {brl(x['preco'])}. Está na agenda ({q[8:10]}/{q[5:7]} às {q[11:16]}) esperando você aprovar.")
    print("ok", pid, q)


if __name__ == "__main__":
    main()
