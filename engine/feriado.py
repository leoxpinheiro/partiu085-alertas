"""🗓️ Radar do feriado: preço de verdade pra ir e voltar NAS DATAS dos próximos feriadões, saindo de Fortaleza.
Grava docs/feriados.json (lido pelo guia docs/guias/feriados.html e pelos carrosséis)."""
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config as C  # noqa: E402
import run  # noqa: E402

DOCS = Path(__file__).resolve().parent.parent / "docs"
FUSO = timezone(timedelta(hours=-3))
# (id, nome, saídas possíveis, voltas possíveis)
FERIADOS = [
    ("finados-2026", "Finados", ["2026-10-30", "2026-10-31"], ["2026-11-02"]),
    ("consciencia-2026", "Consciência Negra", ["2026-11-19", "2026-11-20"], ["2026-11-22", "2026-11-23"]),
    ("natal-2026", "Natal", ["2026-12-23", "2026-12-24"], ["2026-12-27", "2026-12-28"]),
    ("reveillon-2026", "Réveillon", ["2026-12-29", "2026-12-30"], ["2027-01-03", "2027-01-04"]),
    ("carnaval-2027", "Carnaval", ["2027-02-05", "2027-02-06"], ["2027-02-09", "2027-02-10"]),
    ("data-magna-2027", "Data Magna + Semana Santa", ["2027-03-24", "2027-03-25"], ["2027-03-28", "2027-03-29"]),
]
NAC = ["REC", "NAT", "JPA", "SSA", "MCZ", "AJU", "SLZ", "THE", "BEL", "JDO", "SAO", "RIO", "BSB", "BHZ", "CWB", "FLN", "POA", "IGU", "FEN", "CXJ"]
INT = ["BUE", "LIS"]


def melhor(orig, dest, dias):
    achados = []
    for d in dias:
        _, r, _ = run._um_dia(orig, dest, d, 1)
        if r:
            achados.append(r)
    return min(achados, key=lambda x: x["preco"]) if achados else None


def um_destino(args):
    fid, idas, voltas, dest = args
    ida = melhor(C.ORIGEM, dest, idas)
    volta = melhor(dest, C.ORIGEM, voltas) if ida else None
    if not (ida and volta):
        return fid, None
    nome = next((d[1] for d in C.DESTINOS if d[0] == dest), dest)
    return fid, {"code": dest, "nome": nome, "ida": ida, "volta": volta, "total": round(ida["preco"] + volta["preco"])}


def main():
    hoje = date.today().isoformat()
    so = sys.argv[1:]  # opcional: ids de feriado
    fer = [f for f in FERIADOS if f[2][0] > hoje and (not so or f[0] in so)][:4]
    tarefas = [(fid, idas, voltas, d) for fid, _, idas, voltas in fer for d in NAC + INT]
    res = {}
    t0 = time.time()
    with ThreadPoolExecutor(4) as ex:
        for fid, r in ex.map(um_destino, tarefas):
            if r:
                res.setdefault(fid, []).append(r)
    ant = {}
    try:
        ant = {f["id"]: f for f in json.loads((DOCS / "feriados.json").read_text("utf-8")).get("feriados", [])}
    except Exception:  # noqa: BLE001
        pass
    out = []
    for fid, nome, idas, voltas in FERIADOS:
        if idas[0] <= hoje:
            continue
        if fid in res:
            out.append({"id": fid, "nome": nome, "idas": idas, "voltas": voltas, "visto": datetime.now(FUSO).isoformat(timespec="minutes"),
                        "destinos": sorted(res[fid], key=lambda x: x["total"])})
        elif fid in ant:
            out.append(ant[fid])
    (DOCS / "feriados.json").write_text(json.dumps({"atualizado": datetime.now(FUSO).isoformat(timespec="minutes"), "feriados": out}, ensure_ascii=False, indent=1) + "\n", "utf-8")
    for f in out:
        print(f["nome"], [(d["nome"], d["total"]) for d in f["destinos"][:6]])
    print(f"{len(tarefas)} destinos·feriado em {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
