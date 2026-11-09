"""Conteúdo que se faz sozinho: carrossel "Achados da semana" com as melhores ofertas reais do radar.

Roda junto com o radar. Quarta e domingo monta o carrossel (capa + até 5 ofertas + chamada) com as ofertas
dos últimos 7 dias (régua do preço normal da rota, uma por destino) e agenda no Instagram às 17:30.
Uso: python engine/conteudo_auto.py [--agora]
"""
from __future__ import annotations

import io
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import imagem as I  # noqa: E402

DOCS = I.DOCS
FUSO = timezone(timedelta(hours=-3))
DIAS = {3, 7}  # quarta e domingo
HORA = "17:30"
W, H = 1080, 1350


def ler(p, d):
    try:
        return json.loads((DOCS / p).read_text())
    except Exception:  # noqa: BLE001
        return d


def capa(n: int, ini: str, fim: str, menor: dict) -> bytes:
    img = Image.new("RGBA", (W, H), I.NAVY + (255,))
    foto = DOCS / "fotos" / f"{menor['destino']}.jpg"
    if foto.exists():
        from PIL import ImageOps
        f = ImageOps.fit(Image.open(foto).convert("RGBA"), (W, H), Image.LANCZOS)
        img.alpha_composite(f)
    I.gradiente(img, 0, H, [(0, (11, 36, 64, .35)), (.45, (11, 36, 64, .75)), (1, (8, 26, 48, 1))])
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((64, 70, 64 + 360, 128), 29, fill=I.AM)
    d.text((64 + 180, 100), "DADOS DO NOSSO RADAR", font=I.jak(26, 800), fill=I.NAVY, anchor="mm")
    d.text((64, 560), "OS ACHADOS", font=I.anton(150), fill=I.BRANCO, anchor="ls")
    d.text((64, 720), "DA SEMANA", font=I.anton(150), fill=I.AM, anchor="ls")
    d.text((68, 800), f"Saindo de Fortaleza · {ini} a {fim}", font=I.jak(38, 700), fill=(215, 226, 240), anchor="ls")
    d.rounded_rectangle((64, 880, W - 64, 1080), 30, fill=(255, 255, 255, 235))
    d.text((100, 950), f"{n} passagem{'s' if n > 1 else ''} bem abaixo do normal", font=I.jak(34, 800), fill=I.NAVY, anchor="ls")
    d.text((100, 1040), f"A partir de {I.brl(menor['preco'])}", font=I.anton(80), fill=(31, 95, 191), anchor="ls")
    d.text((W - 100, 1040), f"{menor['destino_nome']}", font=I.jak(30, 700), fill=I.NAVY, anchor="rs")
    d.text((64, H - 70), "@partiu.085", font=I.jak(30, 800), fill=I.BRANCO, anchor="ls")
    d.text((W - 64, H - 70), "ARRASTA →", font=I.jak(28, 800), fill=I.AM, anchor="rs")
    return I.png(img)


def chamada() -> bytes:
    img = Image.new("RGBA", (W, H), I.NAVY + (255,))
    I.gradiente(img, 0, H, [(0, (19, 58, 99, 1)), (1, (6, 23, 43, 1))])
    d = ImageDraw.Draw(img)
    d.text((W / 2, 560), "O RADAR", font=I.anton(170), fill=I.BRANCO, anchor="ms")
    d.text((W / 2, 740), "NÃO DORME", font=I.anton(170), fill=I.AM, anchor="ms")
    d.text((W / 2, 840), "Ele vigia os preços saindo de Fortaleza o dia todo.", font=I.jak(34, 600), fill=(215, 226, 240), anchor="ms")
    d.text((W / 2, 890), "Quando cai de verdade, você fica sabendo primeiro.", font=I.jak(34, 600), fill=(215, 226, 240), anchor="ms")
    d.rounded_rectangle((W / 2 - 330, 990, W / 2 + 330, 1090), 50, fill=I.AM)
    d.text((W / 2, 1052), "SIGA @PARTIU.085", font=I.jak(40, 800), fill=I.NAVY, anchor="ms")
    d.text((W / 2, H - 80), "Preços vistos pelo radar. Passagem muda de preço a qualquer momento.", font=I.jak(24, 600), fill=(150, 162, 178), anchor="ms")
    return I.png(img)


def main(agora_mesmo: bool = False) -> None:
    agora = datetime.now(FUSO)
    if not agora_mesmo and agora.isoweekday() not in DIAS:
        return
    fila = ler("ig_fila.json", [])
    tag = f"auto-semana-{agora.date().isoformat()}"
    if any(x.get("origem") == tag for x in fila):
        return
    desde = (agora - timedelta(days=7)).isoformat()
    al = [a for a in ler("alerts.json", {}).get("alertas", []) if a.get("criado", "") >= desde and not a.get("fraco")
          and a.get("regua") in ("menor_normal", "ida_volta") and (a.get("desconto") or 0) >= 0.15]
    melhor = {}
    for a in al:
        k = a["destino"]
        if k not in melhor or (a.get("desconto") or 0) > (melhor[k].get("desconto") or 0):
            melhor[k] = a
    L = sorted(melhor.values(), key=lambda a: -(a.get("desconto") or 0))[:5]
    if len(L) < 2:
        print("achados da semana: poucas ofertas boas, não monto o carrossel")
        return
    ini, fim = (agora - timedelta(days=7)).strftime("%d/%m"), agora.strftime("%d/%m")
    imgs = [capa(len(L), ini, fim, min(L, key=lambda a: a["preco"]))] + [I.card_alerta(a, alto=True) for a in L] + [chamada()]
    nomes = []
    for i, b in enumerate(imgs, 1):
        n = f"ig/{tag}-{i}.jpg"
        (DOCS / n).write_bytes(b)
        nomes.append(n)
    q = f"{agora.date().isoformat()}T{HORA}-03:00"
    if agora.strftime("%H:%M") > "16:30":
        q = f"{(agora + timedelta(days=1)).date().isoformat()}T{HORA}-03:00"
    linhas = []
    for a in L:
        modo = "ida e volta" if a.get("modo") == "ida_volta" else "o trecho"
        linhas.append(f"✈️ {a['destino_nome']} · {I.brl(a['preco'])} {modo}" + (f" ({round(a['desconto'] * 100)}% abaixo do normal)" if a.get("desconto") else ""))
    leg = ("📡 OS ACHADOS DA SEMANA SAINDO DE FORTALEZA\n\n" + "\n".join(linhas) +
           f"\n\n🕐 Preços vistos pelo radar entre {ini} e {fim}. Passagem muda de preço a qualquer momento.\n\n"
           "📌 Salva e marca quem viajaria com você\n🔔 Siga @partiu.085 pra ver os próximos primeiro\n\n#passagembarata #fortaleza #viagem #ceara #partiu085")
    fila.append({"id": tag, "titulo": f"Achados da semana ({ini} a {fim})", "tipo": "carrossel", "imagens": nomes, "legenda": leg,
                 "quando": q, "aprovado": True, "auto_aprovado": True, "tentativa": 0, "criado": agora.isoformat(timespec="minutes"),
                 "origem": tag, "story_junto": True})
    (DOCS / "ig_fila.json").write_text(json.dumps(fila, ensure_ascii=False, indent=1) + "\n")
    print(f"achados da semana: {len(L)} ofertas, agendado {q}")


if __name__ == "__main__":
    main("--agora" in sys.argv)
