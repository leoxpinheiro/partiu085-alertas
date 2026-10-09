"""Partiu 085 — imagens dos alertas (mesmo desenho do painel), para o Telegram."""
from __future__ import annotations

import io
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

RAIZ = Path(__file__).resolve().parent.parent
DOCS = RAIZ / "docs"
FONTES = Path(__file__).resolve().parent / "fontes"
W = H = 1080
FH = 560
NAVY = (15, 42, 71)
AM = (245, 197, 49)
BRANCO = (255, 255, 255)
COR_CLASSE = {"imperdivel": (22, 163, 74), "otima": (37, 99, 235), "boa": (217, 119, 6)}
PILL = {"imperdivel": "IMPERDÍVEL", "otima": "ÓTIMA OPORTUNIDADE", "boa": "BOA OPORTUNIDADE"}
MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]


def anton(t: int):
    return ImageFont.truetype(str(FONTES / "Anton-Regular.ttf"), t)


def jak(t: int, peso: int = 700):
    f = ImageFont.truetype(str(FONTES / "PlusJakartaSans.ttf"), t)
    try:
        f.set_variation_by_axes([peso])
    except Exception:  # noqa: BLE001
        pass
    return f


def brl(v) -> str:
    return "R$ " + f"{round(v):,}".replace(",", ".")


def caber(d: ImageDraw.ImageDraw, txt: str, maxi: int, mini: int, larg: int, fonte) -> int:
    t = maxi
    while t > mini and d.textlength(txt, font=fonte(t)) > larg:
        t -= 4
    return t


def alfa(img: Image.Image, cor, a: float, box, raio: int = 0):
    camada = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(camada).rounded_rectangle(box, raio, fill=cor + (int(255 * a),))
    img.alpha_composite(camada)


def gradiente(img: Image.Image, y0: int, y1: int, paradas):
    """paradas: [(pos 0..1, (r,g,b,a 0..1))] linear vertical."""
    g = Image.new("RGBA", (1, y1 - y0))
    for y in range(y1 - y0):
        p = y / max(1, y1 - y0 - 1)
        for (pa, ca), (pb, cb) in zip(paradas, paradas[1:]):
            if pa <= p <= pb:
                k = (p - pa) / ((pb - pa) or 1)
                c = [ca[i] + (cb[i] - ca[i]) * k for i in range(4)]
                g.putpixel((0, y), (int(c[0]), int(c[1]), int(c[2]), int(c[3] * 255)))
                break
    img.alpha_composite(g.resize((W, y1 - y0)), (0, y0))


def ref_curta(iata: str) -> str:
    try:
        return (json.loads((DOCS / "referencias.json").read_text("utf-8")).get("ref", {}).get(iata) or {}).get("curta", "")
    except Exception:  # noqa: BLE001
        return ""


def topo(img: Image.Image, d: ImageDraw.ImageDraw, etiqueta: str, cor):
    d.ellipse((56, 50, 156, 150), fill=AM)
    try:
        ico = Image.open(DOCS / "marca" / "icone.png").convert("RGBA").resize((88, 88))
        m = Image.new("L", (88, 88), 0)
        ImageDraw.Draw(m).ellipse((0, 0, 87, 87), fill=255)
        img.paste(ico, (62, 56), m)
    except Exception:  # noqa: BLE001
        pass
    d.text((172, 88), "PARTIU 085", font=anton(46), fill=BRANCO, anchor="lm")
    d.text((174, 124), "@partiu.085", font=jak(22, 700), fill=(235, 240, 245), anchor="lm")
    f = jak(26, 800)
    ew = d.textlength(etiqueta, font=f) + 48
    d.rounded_rectangle((W - 60 - ew, 72, W - 60, 128), 28, fill=cor)
    d.text((W - 60 - ew / 2, 101), etiqueta, font=f, fill=BRANCO if cor != AM else NAVY, anchor="mm")


def card_alerta(a: dict, alto: bool = False) -> bytes:
    H = 1350 if alto else W
    FH = 700 if alto else globals()["FH"]
    img = Image.new("RGBA", (W, H), NAVY + (255,))
    foto = DOCS / "fotos" / f"{a['destino']}.jpg"
    tem_foto = foto.exists()
    if tem_foto:
        f = ImageOps.exif_transpose(Image.open(foto)).convert("RGBA")
        f = ImageOps.fit(f, (W, FH), Image.LANCZOS)
        img.alpha_composite(f, (0, 0))
    else:
        gradiente(img, 0, FH, [(0, (62, 134, 232, 1)), (1, (31, 95, 191, 1))])
    gradiente(img, 0, 280, [(0, (6, 18, 32, .6)), (1, (6, 18, 32, 0))])
    gradiente(img, FH - 430, FH + 2, [(0, (15, 42, 71, 0)), (.75, (15, 42, 71, .88)), (1, (15, 42, 71, 1))])
    d = ImageDraw.Draw(img)
    k = a.get("classe") or "boa"
    topo(img, d, PILL.get(k, "PROMOÇÃO"), COR_CLASSE.get(k, AM))
    nome = (a.get("destino_nome") or a["destino"]).upper()
    tn = caber(d, nome, 150, 76, W - 128, anton)
    d.text((60, FH - 24), nome, font=anton(tn), fill=BRANCO, anchor="ls")
    rf = ref_curta(a["destino"])
    linha = "SAINDO DE FORTALEZA" + (f"  ·  {rf.upper()}" if rf else "  ·  INTERNACIONAL" if a.get("tipo") == "internacional" else "")
    d.text((64, FH - 24 - tn * 0.98 - 18), linha, font=jak(26, 800), fill=AM, anchor="ls")
    # preço
    y0 = FH + 56
    d.text((64, y0), "a partir de", font=jak(28, 600), fill=(205, 212, 222), anchor="ls")
    big = brl(a["preco"])
    tb = caber(d, big, 128, 80, 560, anton)
    yb = y0 + tb * .92
    d.text((60, yb), big, font=anton(tb), fill=AM, anchor="ls")
    d.text((64, yb + 46), "o trecho", font=jak(30, 700), fill=BRANCO, anchor="ls")
    by, bx = y0 - 30, 660
    bw, bh = W - 60 - bx, 186
    if a.get("preco_volta"):
        alfa(img, (255, 255, 255), .1, (bx, by, bx + bw, by + bh), 28)
        d = ImageDraw.Draw(img)
        d.rounded_rectangle((bx, by, bx + bw, by + bh), 28, outline=(80, 104, 130), width=2)
        cx = bx + bw / 2
        d.text((cx, by + 52), "IDA E VOLTA", font=jak(22, 700), fill=(200, 208, 218), anchor="ms")
        iv = brl(a["preco"] + a["preco_volta"])
        tv = caber(d, iv, 68, 40, bw - 40, anton)
        d.text((cx, by + 50 + tv), iv, font=anton(tv), fill=BRANCO, anchor="ms")
        d.text((cx, by + bh - 24), "somando ida + volta", font=jak(20, 600), fill=(200, 208, 218), anchor="ms")
    yd = max(yb + 96, by + bh + 52)

    if alto:
        yd += 40
        d.text((64, yd - 6), "DATAS PRA VIAJAR (dia de embarque)", font=jak(26, 800), fill=(205, 212, 222), anchor="ls")
        d.line((64, yd + 10, W - 64, yd + 10), fill=(60, 86, 116), width=2)
        yd += 60
    fs_m, fs_d, passo = (30, 30, 50) if alto else (24, 24, 42)

    def coluna(titulo, meses, x, w):
        d.text((x, yd), titulo, font=jak(28 if alto else 24, 800), fill=AM, anchor="ls")
        yy, resto = yd + (52 if alto else 44), 0
        cabe = max(1, int((H - 44 - yy) // passo) + 1)
        mostra = cabe - 1 if len(meses) > cabe else len(meses)
        for i, g in enumerate(meses):
            if i >= mostra:
                resto += len(g["dias"])
                continue
            mes, ano = (g["mes"].split(" ") + [""])[:2]
            d.text((x, yy), f"{mes[:3].upper()}/{ano[2:]}", font=jak(fs_m, 800), fill=BRANCO, anchor="ls")
            dias = list(g["dias"])
            f = jak(fs_d, 600)
            dx = 130 if alto else 104
            while len(dias) > 1 and d.textlength(" · ".join(dias), font=f) > w - dx - 6:
                dias.pop()
                resto += 1
            d.text((x + dx, yy), " · ".join(dias), font=f, fill=(230, 235, 240), anchor="ls")
            yy += passo
        if resto:
            d.text((x, yy), f"+ {resto} data{'s' if resto > 1 else ''} no texto", font=jak(22, 600), fill=(170, 180, 195), anchor="ls")

    coluna("IDA (sai de Fortaleza)" if alto else "IDA", a.get("ida_meses") or [], 64, 470)
    if a.get("volta_meses"):
        coluna("VOLTA (pra Fortaleza)" if alto else "VOLTA", a["volta_meses"], 564, 470)
    return png(img)


def card_top5(L: list[dict], dia: str) -> bytes:
    img = Image.new("RGBA", (W, H), NAVY + (255,))
    gradiente(img, 0, H, [(0, (20, 54, 92, 1)), (1, (15, 42, 71, 1))])
    d = ImageDraw.Draw(img)
    topo(img, d, f"{dia[8:10]}/{dia[5:7]}", AM)
    d.text((60, 330), "TOP 5 DO DIA", font=anton(150), fill=AM, anchor="ls")
    d.text((64, 385), "os mais abaixo do preço normal, saindo de Fortaleza", font=jak(32, 700), fill=BRANCO, anchor="ls")
    y0, rh = 440, 112
    for i, x in enumerate(L):
        y = y0 + i * rh
        alfa(img, (255, 200, 0) if i == 0 else (255, 255, 255), .16 if i == 0 else .07, (60, y, W - 60, y + rh - 16), 24)
        d = ImageDraw.Draw(img)
        cy = y + (rh - 16) / 2
        d.ellipse((86, cy - 30, 146, cy + 30), fill=AM)
        d.text((116, cy + 2), str(i + 1), font=anton(44), fill=NAVY, anchor="mm")
        nome = x["nome"].upper()
        d.text((170, y + 50), nome, font=anton(caber(d, nome, 50, 32, 470, anton)), fill=BRANCO, anchor="ls")
        sub = " · ".join(s for s in [f"melhor em {MESES[int(x['mes']) - 1].lower()}" if x.get("mes") else "", ref_curta(x["k"]) or ("internacional" if x.get("intl") else "")] if s)
        d.text((172, y + 80), sub, font=jak(22, 600), fill=(185, 195, 208), anchor="ls")
        d.text((W - 96, y + 56), brl(x["menor"]), font=anton(54), fill=AM, anchor="rs")
        d.text((W - 96, y + 84), f"ida e volta {brl(x['rt'])}" if x.get("rt") else "o trecho", font=jak(20, 700), fill=(200, 208, 218), anchor="rs")
    d.text((W / 2, H - 40), "Preços de hoje no radar do Partiu 085 · podem mudar a qualquer momento", font=jak(22, 600), fill=(150, 162, 178), anchor="mm")
    return png(img)


def png(img: Image.Image) -> bytes:
    b = io.BytesIO()
    img.convert("RGB").save(b, "JPEG", quality=90)
    return b.getvalue()


def story_de(card: bytes, titulo: str = "OFERTA DO DIA", rodape: str = "Grupo grátis de alertas: link na bio") -> bytes:
    """Versão 9:16 (story/reels) de um card quadrado: fundo desfocado, título em cima e chamada embaixo."""
    from PIL import ImageFilter
    SW, SH = 1080, 1920
    base = Image.open(io.BytesIO(card)).convert("RGBA")
    fundo = ImageOps.fit(base, (SW, SH), Image.LANCZOS).filter(ImageFilter.GaussianBlur(38))
    img = Image.new("RGBA", (SW, SH), NAVY + (255,))
    img.alpha_composite(fundo)
    alfa(img, NAVY, .55, (0, 0, SW, SH))
    d = ImageDraw.Draw(img)
    ty = caber(d, titulo, 150, 80, SW - 140, anton)
    d.text((SW / 2, 330), titulo, font=anton(ty), fill=AM, anchor="ms")
    d.text((SW / 2, 395), "SAINDO DE FORTALEZA · @PARTIU.085", font=jak(30, 800), fill=BRANCO, anchor="ms")
    sombra = Image.new("RGBA", (SW, SH), (0, 0, 0, 0))
    ImageDraw.Draw(sombra).rounded_rectangle((40, 470, SW - 40, 470 + 1000), 40, fill=(0, 0, 0, 120))
    img.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(24)))
    cart = base.resize((1000, 1000), Image.LANCZOS)
    m = Image.new("L", (1000, 1000), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, 999, 999), 36, fill=255)
    img.paste(cart, (40, 460), m)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((SW / 2 - 330, 1560, SW / 2 + 330, 1660), 50, fill=AM)
    d.text((SW / 2, 1626), rodape.upper()[:34], font=jak(30, 800), fill=NAVY, anchor="ms")
    d.text((SW / 2, 1740), "Preço pode mudar a qualquer momento", font=jak(26, 600), fill=(205, 212, 222), anchor="ms")
    return png(img)


def story_post(post: bytes) -> bytes:
    """Story 9:16 chamando pro post novo do feed (usa a 1ª imagem do post)."""
    from PIL import ImageFilter
    SW, SH = 1080, 1920
    base = Image.open(io.BytesIO(post)).convert("RGBA")
    fundo = ImageOps.fit(base, (SW, SH), Image.LANCZOS).filter(ImageFilter.GaussianBlur(40))
    img = Image.new("RGBA", (SW, SH), NAVY + (255,))
    img.alpha_composite(fundo)
    alfa(img, NAVY, .6, (0, 0, SW, SH))
    d = ImageDraw.Draw(img)
    d.text((SW / 2, 300), "POST NOVO", font=anton(150), fill=AM, anchor="ms")
    d.text((SW / 2, 370), "NO PERFIL DO @PARTIU.085", font=jak(32, 800), fill=BRANCO, anchor="ms")
    w = 860
    h = round(base.height * w / base.width)
    cart = base.resize((w, h), Image.LANCZOS)
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), 34, fill=255)
    y = 450
    sombra = Image.new("RGBA", (SW, SH), (0, 0, 0, 0))
    ImageDraw.Draw(sombra).rounded_rectangle(((SW - w) / 2 - 10, y + 10, (SW + w) / 2 + 10, y + h + 20), 40, fill=(0, 0, 0, 130))
    img.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(24)))
    img.paste(cart, ((SW - w) // 2, y), m)
    d = ImageDraw.Draw(img)
    yb = min(SH - 200, y + h + 70)
    d.rounded_rectangle((SW / 2 - 300, yb, SW / 2 + 300, yb + 96), 48, fill=AM)
    d.text((SW / 2, yb + 62), "VEM VER NO PERFIL", font=jak(34, 800), fill=NAVY, anchor="ms")
    return png(img)
