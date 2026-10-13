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


def main():
    hoje = datetime.now(ig.FUSO)
    fila = ig.ler(ig.FILA, [])
    tag = "achado-" + hoje.date().isoformat()
    if any(x.get("origem") == tag for x in fila):
        print("já tem o vídeo de hoje")
        return
    x = achado()
    if not x:
        print("sem achado bom hoje")
        return
    q = vaga(fila, hoje)
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
    try:  # estilo novo: motion graphics + trilha própria
        subprocess.run(["node", str(vid / "motion.js"), str(dm), str(mp4)], check=True)
        t_capa, dur = "8.2", 20
    except Exception as e:  # noqa: BLE001
        print("motion falhou, uso o modelo antigo:", e)
        subprocess.run(["node", str(vid / "render.js"), str(rot), str(mp4)], check=True)
        t_capa, dur = "7.2", 16
    capa = ig.DOCS / "ig" / f"{pid}-1.jpg"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", t_capa, "-i", str(mp4), "-frames:v", "1", "-q:v", "3", str(capa)], check=True)
    rt = f"\n🔁 Ida e volta a partir de {brl(x['preco'] + x['volta'])}" if x.get("volta") else ""
    leg = (f"✈️ ACHEI PASSAGEM PRA {x['nome'].upper()}\n\n💰 {brl(x['preco'])} o trecho saindo de Fortaleza" + (f" · {x['cia']}" if x["cia"] else "") + rt
           + (f"\n📅 Melhor época: {x['mes']}" if x.get("mes") else "") + f"\n\n🕐 Preço visto pelo radar hoje, {hoje.strftime('%d/%m')}. Muda a qualquer hora."
           + "\n\n💬 Comenta EU QUERO que eu te mando os próximos 📩\n🔔 Ativa o sininho: alerta grátis de passagem saindo de Fortaleza"
           + "\n\n#fortaleza #ceara #passagensbaratas #promocaodepassagem #viagem #partiu085")
    fila.append({"id": pid, "titulo": f"🎬 Reels do achado: {x['nome']} por {brl(x['preco'])}", "tipo": "reels", "imagens": [f"ig/{capa.name}"], "video_pronto": f"ig/{mp4.name}", "dur": dur,
                 "legenda": leg, "quando": q, "aprovado": False, "tentativa": 0, "criado": hoje.isoformat(timespec="minutes"), "origem": tag})
    ig.salvar(ig.FILA, fila)
    vp = ig.ler(ig.DOCS / "videos_prontos.json", [])  # também aparece em 🎬 Vídeos prontos
    vp.append({"id": pid, "titulo": f"Achei passagem pra {x['nome']} por {brl(x['preco'])}", "grupo": "Achado do dia", "arq": f"ig/{mp4.name}", "capa": f"ig/{capa.name}", "dur": dur,
               "data": hoje.date().isoformat(), "legenda": leg, "criado": hoje.isoformat(timespec="minutes")})
    ig.salvar(ig.DOCS / "videos_prontos.json", vp)
    ig.avisar_admin(f"🎬 Reels do achado pronto: {x['nome']} por {brl(x['preco'])}. Está na agenda ({q[8:10]}/{q[5:7]} às {q[11:16]}) esperando você aprovar. Já vem com trilha própria (sem direitos autorais); se quiser, troque pela música do Instagram.")
    print("ok", pid, q)


if __name__ == "__main__":
    main()
