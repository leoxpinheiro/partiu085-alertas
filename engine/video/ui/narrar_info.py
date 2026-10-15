"""Informativo narrado: voz grátis (edge-tts) + cenas no ritmo da fala + música baixinha.

uso: python narrar_info.py dados/atraso.json saida.mp4
O JSON é o mesmo do info.html, com "voz" (opcional) e "fala" em capa, em cada regra e no fim.
"""
import asyncio, json, os, subprocess, sys, tempfile
from pathlib import Path

AQUI = Path(__file__).resolve().parent


def dur(f):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)], capture_output=True, text=True).stdout)


async def _tts(txt, voz, vel, out):
    import edge_tts
    await edge_tts.Communicate(txt, voz, rate=vel).save(str(out))


def tts(txt, voz, vel, out):
    if os.environ.get("TTS_FALSO"):  # teste sem internet: silêncio do tamanho estimado
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "sine=f=220", "-t", f"{len(txt.split()) / 2.9:.2f}", str(out)], check=True)
        return
    for t in range(3):
        try:
            asyncio.run(_tts(txt, voz, vel, out))
            return
        except Exception as e:  # noqa: BLE001
            print("tts tentativa", t + 1, e)
    raise SystemExit("TTS falhou")


def main():
    dados, saida = Path(sys.argv[1]), Path(sys.argv[2]).resolve()
    V = json.loads(dados.read_text("utf-8"))
    voz, vel = V.get("voz", "pt-BR-ThalitaMultilingualNeural"), V.get("velocidade", "+12%")
    tmp = Path(tempfile.mkdtemp(prefix="narr-"))
    partes, t = [], 0.0  # (arquivo, início)
    # capa
    a = tmp / "c.mp3"; tts(V["capa"]["fala"], voz, vel, a); d = dur(a)
    V["capa"]["dur"] = round(max(4.2, d + 0.9), 2); partes.append((a, 0.25)); t = V["capa"]["dur"]
    for i, r in enumerate(V["regras"]):
        a = tmp / f"r{i}.mp3"; tts(r["fala"], voz, vel, a); d = dur(a)
        r["dur"] = round(max(3.6 + .55 * len(r.get("itens", [])), d + 1.0), 2)
        partes.append((a, t + 0.35)); t += r["dur"]
    a = tmp / "f.mp3"; tts(V["fim"]["fala"], voz, vel, a); d = dur(a)
    V["fim"]["dur"] = round(max(3.8, d + 1.4), 2); partes.append((a, t + 0.2)); total = t + V["fim"]["dur"]
    # trilha da voz: cada fala no seu tempo
    narr = tmp / "narr.wav"
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-t", f"{total:.2f}", "-i", "anullsrc=r=48000:cl=stereo"]
    filt, labels = [], ["[0:a]"]
    for k, (f, ini) in enumerate(partes, start=1):
        cmd += ["-i", str(f)]
        ms = int(ini * 1000)
        filt.append(f"[{k}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={ms}|{ms}[a{k}]")
        labels.append(f"[a{k}]")
    filt.append("".join(labels) + f"amix=inputs={len(labels)}:duration=first:normalize=0[o]")
    subprocess.run(cmd + ["-filter_complex", ";".join(filt), "-map", "[o]", str(narr)], check=True)
    vid = tmp / "vid.json"; vid.write_text(json.dumps(V, ensure_ascii=False), "utf-8")
    env = {**os.environ, "NARRACAO": str(narr), "TRILHA_VOL": os.environ.get("TRILHA_VOL", "0.16")}
    subprocess.run(["node", str(AQUI / "uirender.js"), str(AQUI / "info.html"), str(saida), os.environ.get("FPS", "60"), str(vid)], check=True, env=env)
    print("ok", saida, f"{total:.1f}s", voz)


if __name__ == "__main__":
    main()
