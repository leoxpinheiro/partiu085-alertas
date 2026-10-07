"""Junta os resultados da varredura turbo (vários robôs em paralelo) no histórico, status e calendários."""
import glob
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import run as R  # noqa: E402

hist = R.ler_json(R.HIST_FILE, {})
status = R.ler_json(R.STATUS_FILE, {"rotas": {}})
n = 0
for f in sorted(glob.glob(sys.argv[1] + "/**/*.json", recursive=True)):
    parte = R.ler_json(Path(f), {})
    for k, regs in (parte.get("hist") or {}).items():
        atuais = {h["dia"]: h for h in hist.get(k, [])}
        for h in regs:
            atuais[h["dia"]] = h
        hist[k] = sorted(atuais.values(), key=lambda h: h["dia"])[-90:]
    status.setdefault("rotas", {}).update(parte.get("status") or {})
    for iata, cal in (parte.get("cal") or {}).items():
        R.salvar_json(R.CAL_DIR / f"{iata}.json", cal)
    n += len(parte.get("status") or {})
status["ultima_varredura_completa"] = R.agora().isoformat(timespec="minutes")
status["ultima_rodada"] = status["ultima_varredura_completa"]
R.salvar_json(R.HIST_FILE, hist)
R.salvar_json(R.HIST_PUB, {k: v for k, v in hist.items() if k.startswith(R.C.ORIGEM + "-")})
R.salvar_json(R.STATUS_FILE, status)
rodadas = R.ler_json(R.LOG_FILE, [])
rodadas.append({"quando": status["ultima_rodada"], "rotas": sorted((status["rotas"]).keys()), "rotas_com_dados": n,
                "candidatos": 0, "alertas": 0, "manual": True, "turbo": True})
R.salvar_json(R.LOG_FILE, rodadas[-400:])
print(f"Varredura turbo juntada: {n} rotas")
