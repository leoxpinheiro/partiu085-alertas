"""📈 Ranking dos nossos posts: o que mais gerou compartilhamento e salvamento (lido por quem cria a pauta)."""
import json
from pathlib import Path

DOCS = Path(__file__).resolve().parent.parent / "docs"


def main():
    conta = json.loads((DOCS / "ig_conta.json").read_text("utf-8"))
    rows = []
    for m in conta.get("midias", []):
        if m.get("alcance") is None:
            continue
        nota = 3 * (m.get("compartilhamentos") or 0) + 2 * (m.get("salvos") or 0) + (m.get("comentarios") or 0)
        rows.append({"nota": nota, "compart": m.get("compartilhamentos") or 0, "salvos": m.get("salvos") or 0, "coment": m.get("comentarios") or 0,
                     "alcance": m.get("alcance") or 0, "tipo": m.get("tipo"), "quando": (m.get("quando") or "")[:10],
                     "titulo": (m.get("legenda") or "").split("\n")[0][:90], "link": m.get("link")})
    rows.sort(key=lambda r: (-r["nota"], -r["alcance"]))
    out = {"atualizado": conta.get("quando"), "como_ler": "nota = 3x compartilhamentos + 2x salvos + comentários. Repita o que está no topo, evite o que está no fim.",
           "melhores": rows[:10], "piores": [r for r in rows if r["alcance"] >= 50][-8:]}
    (DOCS / "ig_ranking.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", "utf-8")
    # o topo do ranking vira o 1º aprendizado da pauta (quem cria conteúdo lê docs/ideias_virais.json)
    iv = DOCS / "ideias_virais.json"
    try:
        d = json.loads(iv.read_text("utf-8"))
        top = "; ".join(f"\"{r['titulo']}\" ({r['tipo']}, {r['compart']} compart., {r['salvos']} salvos)" for r in rows[:3])
        L = [a for a in d.get("aprendizados", []) if not a.startswith("📈 AUTOMÁTICO")]
        d["aprendizados"] = [f"📈 AUTOMÁTICO ({(conta.get('quando') or '')[:10]}): nossos posts que mais compartilharam e salvaram: {top}. Faça mais disso."] + L
        iv.write_text(json.dumps(d, ensure_ascii=False, indent=1), "utf-8")
    except Exception as e:  # noqa: BLE001
        print("ideias:", e)
    print("ranking", len(rows))


if __name__ == "__main__":
    main()
