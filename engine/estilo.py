"""Sistema visual do @partiu.085 (aprovado pelo Leo em 11/11/2026).

Três estilos, sempre na paleta da marca e com foto real, sem emoji nem ícone 3D:
  revista  - foto grande, título com serifa (Fraunces), cara de revista de viagem
  noticia  - cara de portal de notícia: barra azul-marinho, manchete pesada, data e fonte
  dado     - números enormes (Bebas Neue) em blocos de cor, leitura rápida

Uso (o post é um dicionário, normalmente salvo em JSON):
  python3 engine/estilo.py post.json docs/carrosseis_prontos/<prefixo>
  -> gera <prefixo>-1.jpg, -2.jpg ... (1080x1350)

post = {"estilo": "revista|noticia|dado", "telas": [ {tipo, ...}, ... ]}
Tipos de tela (todos os estilos aceitam todos):
  capa    {foto, kicker, titulo, sub}
  texto   {label, titulo, blocos:[{t, x}], foto?, legenda?, fonte?}
  precos  {label, titulo, sub?, linhas:[{rotulo, nota, preco, destaque?}], nota?, rodape?}
  numero  {label, numero, titulo?, texto, rodape?, foto?}
  cartoes {label, cartoes:[{rotulo, numero, texto}], foto?, legenda?, fonte?}
  lista   {label, titulo, itens:[{n, t, x}], fotos?:[{foto, nome}], fonte?}
  cta     {titulo, texto, foto?}
Nos títulos, *assim* vira destaque (itálico amarelo / marca-texto / cor de destaque).
Fotos: caminho relativo à raiz do repositório (ex.: docs/midia/capa-par-torre-2.jpg).
"""
import html
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
FONTES = "engine/fontes"
NV, AZ, AM, CR, VD, MU = "#0B2440", "#1F5FBF", "#F5C531", "#F7F4EE", "#1E7A45", "#5E6E80"
ICONE = "docs/marca/icone.png"


def e(t):
    return html.escape(str(t or ""))


def destaque(t, est):
    t = e(t)
    rep = {"revista": r'<span class="it">\1</span>', "noticia": r'<span class="mark">\1</span>', "dado": r'<span class="acc">\1</span>'}[est]
    return re.sub(r"\*(.+?)\*", rep, t).replace("\n", "<br>")


CSS_BASE = f"""
@font-face{{font-family:Fr;src:url({FONTES}/fraunces-latin-600-normal.woff2);font-weight:600}}
@font-face{{font-family:Fr;src:url({FONTES}/fraunces-latin-800-normal.woff2);font-weight:800}}
@font-face{{font-family:Fr;src:url({FONTES}/fraunces-latin-600-italic.woff2);font-weight:600;font-style:italic}}
@font-face{{font-family:In;src:url({FONTES}/inter-latin-400-normal.woff2);font-weight:400}}
@font-face{{font-family:In;src:url({FONTES}/inter-latin-600-normal.woff2);font-weight:600}}
@font-face{{font-family:In;src:url({FONTES}/inter-latin-800-normal.woff2);font-weight:800}}
@font-face{{font-family:In;src:url({FONTES}/inter-latin-900-normal.woff2);font-weight:900}}
@font-face{{font-family:Bb;src:url({FONTES}/bebas-neue-latin-400-normal.woff2)}}
*{{margin:0;padding:0;box-sizing:border-box}}body{{font-family:In,sans-serif;background:#888}}
.s{{width:1080px;height:1350px;position:relative;overflow:hidden}}
.a{{position:absolute}}.ph{{object-fit:cover;display:block}}
.mk{{position:absolute;left:72px;bottom:52px;display:flex;gap:12px;align-items:center;font-weight:800;font-size:24px}}
.mk img{{width:40px;height:40px;border-radius:50%}}
.pg{{position:absolute;right:72px;bottom:58px;font-weight:800;font-size:20px;letter-spacing:.12em;opacity:.6}}
.fonte{{position:absolute;left:72px;right:72px;bottom:118px;font-size:19px;font-weight:600;line-height:1.4;opacity:.62}}
.lab{{font-weight:800;font-size:21px;letter-spacing:.22em;text-transform:uppercase}}
.rule{{height:2px;background:currentColor;opacity:.3}}
"""
CSS = {
    "revista": """
.T{font-family:Fr;font-weight:600;letter-spacing:-.02em;line-height:1}
.it{font-style:italic;color:var(--ac)}
.N{font-family:Fr;font-weight:800;letter-spacing:-.03em;line-height:1}
.txt{font-size:30px;line-height:1.42}
.txt b{font-weight:800}
""",
    "noticia": """
.bar{position:absolute;left:0;right:0;top:0;height:96px;background:#0B2440;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 72px;font-weight:800;font-size:24px;letter-spacing:.06em}
.bar .ed{background:#F5C531;color:#0B2440;padding:8px 16px;border-radius:6px;font-size:20px}
.T{font-weight:900;letter-spacing:-.025em;line-height:1.04}
.mark{background:linear-gradient(transparent 58%,#F5C531 58%,#F5C531 92%,transparent 92%)}
.N{font-weight:900;letter-spacing:-.03em;line-height:1}
.meta{font-size:22px;font-weight:600;color:#5E6E80}
.txt{font-size:30px;line-height:1.42}
.txt b{font-weight:800}
.box{border-left:8px solid #1F5FBF;padding:4px 0 4px 28px}
""",
    "dado": """
.T{font-family:Bb;line-height:.9;letter-spacing:.01em}
.acc{color:var(--ac)}
.N{font-family:Bb;line-height:.86}
.txt{font-size:30px;line-height:1.4;font-weight:600}
.txt b{font-weight:900}
""",
}
# cores de fundo alternadas por tela (fundo, texto, destaque)
SEQ = {
    "revista": [(NV, CR, AM), (CR, NV, AZ), (NV, CR, AM), (CR, NV, VD)],
    "noticia": [("#fff", NV, AZ), (CR, NV, AZ), ("#fff", NV, VD), (CR, NV, AZ)],
    "dado": [(AZ, "#fff", AM), (CR, NV, AZ), (NV, "#fff", AM), (VD, CR, AM), (AM, NV, AZ)],
}
NOME_TOPO = "PARTIU 085 · FORTALEZA"


def marca(fg):
    return f'<div class="mk" style="color:{fg}"><img src="{ICONE}">@partiu.085</div>'


def topo(est, label, fg, ac):
    if est == "noticia":
        return f'<div class="bar"><span>{NOME_TOPO}</span><span class="ed">{e(label).upper()}</span></div>', 150
    if est == "revista":
        return (f'<div class="a lab" style="left:72px;top:72px;color:{ac}">{e(label)}</div>'
                f'<div class="a" style="left:72px;right:72px;top:118px;color:{fg}"><div class="rule"></div></div>'), 160
    return f'<div class="a lab" style="left:72px;top:72px;color:{ac}">{e(label)}</div>', 140


def foto_fill(src, pos="50% 50%"):
    return f'<img class="a ph" src="{e(src)}" style="inset:0;width:1080px;height:1350px;object-position:{pos}">'


def capa(t, est, cores, n, tot):
    bg, fg, ac = cores
    f = t.get("foto")
    pos = t.get("pos", "50% 40%")
    if est == "revista":
        return f'''<section class="s" style="background:{NV};color:{CR};--ac:{AM}">{foto_fill(f, pos)}
<div class="a" style="inset:0;background:linear-gradient(180deg,rgba(11,36,64,.6) 0,rgba(11,36,64,0) 24%,rgba(11,36,64,0) 42%,rgba(11,36,64,.9) 70%,{NV} 100%)"></div>
<div class="a lab" style="left:72px;top:72px">{e(t.get("kicker","Partiu 085"))}</div><div class="a" style="left:72px;right:72px;top:118px"><div class="rule"></div></div>
<div class="a" style="left:72px;right:72px;bottom:250px"><div class="T" style="font-size:{t.get("tam",120)}px">{destaque(t["titulo"],est)}</div>
<div style="font-size:31px;line-height:1.38;font-weight:600;opacity:.92;margin-top:34px">{e(t.get("sub"))}</div></div>
{marca(CR)}<div class="pg" style="color:{CR}">ARRASTA →</div></section>'''
    if est == "noticia":
        return f'''<section class="s" style="background:#fff;color:{NV}"><div class="bar"><span>{NOME_TOPO}</span><span class="ed">{e(t.get("kicker","NOTÍCIA")).upper()}</span></div>
<img class="a ph" src="{e(f)}" style="left:72px;top:136px;width:936px;height:620px;object-position:{pos}">
<div class="a" style="left:72px;right:72px;top:790px"><div class="meta">{e(t.get("data",""))}</div>
<div class="T" style="font-size:{t.get("tam",80)}px;margin-top:14px">{destaque(t["titulo"],est)}</div>
<div style="font-size:30px;font-weight:600;line-height:1.35;margin-top:22px;color:#33475E">{e(t.get("sub"))}</div></div>
{marca(NV)}<div class="pg" style="color:{NV}">ARRASTA →</div></section>'''
    # dado
    return f'''<section class="s" style="background:{bg};color:{fg};--ac:{ac}"><img class="a ph" src="{e(f)}" style="right:0;top:0;width:500px;height:1350px;object-position:{pos}">
<div class="a" style="left:72px;top:72px"><span class="lab" style="background:{AM};color:{NV};padding:10px 16px">{e(t.get("kicker",""))}</span></div>
<div class="a" style="left:64px;top:220px;width:480px"><div class="N" style="font-size:{t.get("tam_num",360)}px;color:{ac}">{e(t.get("numero",""))}</div>
<div class="T" style="font-size:{t.get("tam",104)}px;margin-top:10px">{destaque(t["titulo"],est)}</div>
<div class="txt" style="margin-top:40px;font-size:29px">{e(t.get("sub"))}</div></div>
{marca(fg)}</section>'''


def texto(t, est, cores, n, tot):
    bg, fg, ac = cores
    tp, y = topo(est, t.get("label", ""), fg, ac)
    blocos = "".join(
        (f'<div class="box" style="margin-top:34px;border-color:{[AZ, VD, AM][i % 3]}"><div style="font-weight:800;font-size:34px">{e(b.get("t"))}</div><div class="txt" style="margin-top:8px;font-size:{t.get("tam_txt",30)}px">{b.get("x","")}</div></div>' if est == "noticia" else
         f'<div style="margin-top:{0 if i == 0 else 30}px">{"" if i == 0 else chr(60)+"div class=rule style=margin-bottom:30px></div>"}<div style="font-weight:800;font-size:32px;color:{ac if est=="dado" else fg}">{e(b.get("t"))}</div><div class="txt" style="margin-top:8px;font-size:{t.get("tam_txt",30)}px">{b.get("x","")}</div></div>')
        for i, b in enumerate(t.get("blocos", [])))
    tit = f'<div class="T" style="font-size:{t.get("tam", 84 if est != "dado" else 120)}px">{destaque(t.get("titulo",""), est)}</div>'
    foto = t.get("foto")
    if foto and t.get("lado"):
        corpo = f'''<div class="a" style="left:72px;right:72px;top:{y}px">{tit}</div>
<img class="a ph" src="{e(foto)}" style="left:72px;top:{y+t.get("dy",260)}px;width:430px;height:640px">
<div class="a" style="left:540px;right:72px;top:{y+t.get("dy",260)}px">{blocos}</div>
<div class="a" style="left:72px;top:{y+t.get("dy",260)+652}px;font-size:19px;font-weight:600;opacity:.6">{e(t.get("legenda"))}</div>'''
    else:
        fh = 380 if foto else 0
        corpo = f'''<div class="a" style="left:72px;right:72px;top:{y}px">{tit}<div style="margin-top:20px">{blocos}</div></div>''' + (
            f'<img class="a ph" src="{e(foto)}" style="left:72px;right:72px;bottom:190px;width:936px;height:{fh}px;object-position:{t.get("pos","50% 50%")}">'
            f'<div class="a" style="left:72px;bottom:156px;font-size:19px;font-weight:600;opacity:.6">{e(t.get("legenda"))}</div>' if foto else "")
    fonte = f'<div class="fonte">{e(t.get("fonte"))}</div>' if t.get("fonte") and not foto else (f'<div class="a" style="right:72px;bottom:58px;font-size:18px;font-weight:600;opacity:.6;max-width:560px;text-align:right">{e(t.get("fonte"))}</div>' if t.get("fonte") else "")
    return f'<section class="s" style="background:{bg};color:{fg};--ac:{ac}">{tp}{corpo}{fonte}{marca(fg)}</section>'


def precos(t, est, cores, n, tot):
    bg, fg, ac = cores
    tp, y = topo(est, t.get("label", ""), fg, ac)
    cor = [ac, AZ if bg != AZ else AM, VD if bg not in (VD,) else AM]
    linhas = ""
    for i, l in enumerate(t.get("linhas", [])):
        c = (AM if bg in (NV, AZ, VD) else AZ) if l.get("destaque") else fg
        if est == "revista":
            linhas += f'''<div style="margin-top:{0 if i == 0 else 36}px">{"" if i == 0 else '<div class="rule" style="margin-bottom:36px"></div>'}
<div class="lab" style="color:{c};opacity:{1 if l.get("destaque") else .75}">{e(l.get("rotulo"))}</div>
<div class="N" style="font-size:{t.get("tam",130)}px;margin-top:8px;color:{c}">{e(l.get("preco"))}</div>
<div style="font-size:23px;opacity:.7;margin-top:6px">{e(l.get("nota"))}</div></div>'''
        elif est == "noticia":
            linhas += f'''<div style="display:flex;justify-content:space-between;align-items:center;border-top:3px solid {NV};padding:24px 0;gap:20px">
<div><div style="font-weight:800;font-size:32px">{e(l.get("rotulo"))}</div><div class="meta">{e(l.get("nota"))}</div></div>
<div class="N" style="font-size:72px;white-space:nowrap;color:{AZ if l.get("destaque") else NV}">{e(l.get("preco"))}</div></div>'''
        else:
            linhas += f'''<div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid rgba(255,255,255,.18);padding:18px 0;gap:20px">
<div><div class="lab" style="font-size:20px;color:{c}">{e(l.get("rotulo"))}</div><div style="font-size:22px;opacity:.75;margin-top:6px">{e(l.get("nota"))}</div></div>
<div class="N" style="font-size:118px;white-space:nowrap;color:{c}">{e(l.get("preco"))}</div></div>'''
    nota = ""
    if t.get("nota"):
        nota = (f'<div style="margin-top:40px;background:{AM};color:{NV};padding:24px 28px;font-size:28px;font-weight:600;line-height:1.35">{e(t["nota"])}</div>' if est == "noticia"
                else f'<div style="margin-top:40px;border:2px solid {ac};padding:22px 26px;font-size:27px;font-weight:600;line-height:1.35">{e(t["nota"])}</div>')
    sub = f'<div style="font-size:24px;font-weight:600;opacity:.7;margin-top:12px">{e(t.get("sub"))}</div>' if t.get("sub") else ""
    rod = f'<div class="fonte">{e(t.get("rodape"))}</div>' if t.get("rodape") else ""
    return f'''<section class="s" style="background:{bg};color:{fg};--ac:{ac}">{tp}
<div class="a" style="left:72px;right:72px;top:{y}px"><div class="T" style="font-size:{t.get("tam_tit", 80 if est != "dado" else 110)}px">{destaque(t.get("titulo",""), est)}</div>{sub}
<div style="margin-top:44px">{linhas}</div>{nota}</div>{rod}{marca(fg)}</section>'''


def numero(t, est, cores, n, tot):
    bg, fg, ac = cores
    tp, y = topo(est, t.get("label", ""), fg, ac)
    fam = {"revista": "N", "noticia": "N", "dado": "N"}[est]
    tam = t.get("tam", {"revista": 200, "noticia": 190, "dado": 330}[est])
    tit = f'<div class="T" style="font-size:{t.get("tam_tit", 76 if est != "dado" else 104)}px;margin-bottom:30px">{destaque(t["titulo"], est)}</div>' if t.get("titulo") else ""
    foto = (f'<img class="a ph" src="{e(t["foto"])}" style="left:0;right:0;bottom:0;width:1080px;height:330px;object-position:{t.get("pos","50% 50%")}">'
            f'<div class="a" style="left:0;right:0;bottom:250px;height:80px;background:linear-gradient({bg},transparent)"></div>') if t.get("foto") else ""
    rod = f'<div class="fonte" style="{"bottom:350px" if t.get("foto") else ""}">{e(t.get("rodape"))}</div>' if t.get("rodape") else ""
    mk = "" if t.get("foto") else marca(fg)
    return f'''<section class="s" style="background:{bg};color:{fg};--ac:{ac}">{tp}
<div class="a" style="left:72px;right:72px;top:{y + 20}px">{tit}<div class="{fam}" style="font-size:{tam}px;color:{ac};white-space:nowrap">{e(t["numero"])}</div>
<div class="txt" style="margin-top:28px;font-size:{t.get("tam_txt",38)}px;font-weight:600;line-height:1.3">{t.get("texto","")}</div></div>{foto}{rod}{mk}</section>'''


def cartoes(t, est, cores, n, tot):
    bg, fg, ac = cores
    tp, y = topo(est, t.get("label", ""), fg, ac)
    cs = t.get("cartoes", [])
    fundos = [NV, VD, AZ, AM]
    html_c = ""
    for i, c in enumerate(cs):
        b = fundos[i % 4] if bg != fundos[i % 4] else fundos[(i + 1) % 4]
        f2 = NV if b == AM else "#fff"
        a2 = AZ if b == AM else AM
        numf = "Bb" if est == "dado" else ("Fr" if est == "revista" else "In")
        peso = 400 if est == "dado" else (800 if est == "revista" else 900)
        html_c += f'''<div style="background:{b};color:{f2};padding:36px 34px;min-height:{t.get("alt",440)}px">
<div class="lab" style="color:{a2};font-size:19px">{e(c.get("rotulo"))}</div>
<div style="font-family:{numf};font-weight:{peso};font-size:{t.get("tam",150 if est=="dado" else 110)}px;line-height:.95;margin-top:26px;letter-spacing:{".01em" if est=="dado" else "-.03em"}">{e(c.get("numero"))}</div>
<div style="font-size:26px;font-weight:600;line-height:1.35;margin-top:20px">{e(c.get("texto"))}</div></div>'''
    cols = min(len(cs), 2)
    foto = (f'<img class="ph" src="{e(t["foto"])}" style="margin-top:28px;width:936px;height:{t.get("alt_foto",380)}px;object-position:{t.get("pos","50% 50%")}">'
            f'<div style="font-size:19px;font-weight:600;opacity:.6;margin-top:10px">{e(t.get("legenda"))}</div>') if t.get("foto") else ""
    tit = f'<div class="T" style="font-size:{t.get("tam_tit", 76 if est != "dado" else 104)}px;margin-bottom:34px">{destaque(t["titulo"], est)}</div>' if t.get("titulo") else ""
    rod = f'<div class="fonte">{e(t.get("fonte"))}</div>' if t.get("fonte") else ""
    return f'''<section class="s" style="background:{bg};color:{fg};--ac:{ac}">{tp}
<div class="a" style="left:72px;right:72px;top:{y}px">{tit}<div style="display:grid;grid-template-columns:repeat({cols},1fr);gap:24px">{html_c}</div>{foto}</div>{rod}{marca(fg)}</section>'''


def lista(t, est, cores, n, tot):
    bg, fg, ac = cores
    tp, y = topo(est, t.get("label", ""), fg, ac)
    fotos = t.get("fotos") or []
    pol = ""
    if fotos:
        w = 936 // len(fotos) - 18
        pol = '<div style="display:flex;gap:24px;margin-bottom:34px">' + "".join(
            f'<div style="flex:1"><img class="ph" src="{e(f["foto"])}" style="width:100%;height:{t.get("alt_fotos",300)}px"><div style="font-size:20px;font-weight:700;margin-top:10px;opacity:.75">{e(f.get("nome"))}</div></div>'
            for f in fotos) + "</div>"
    nf = "Bb" if est == "dado" else ("Fr" if est == "revista" else "In")
    itens = "".join(
        f'''<div style="display:flex;gap:24px;padding:{t.get("pad",26)}px 0;border-top:2px solid {"rgba(255,255,255,.2)" if bg in (NV,AZ,VD) else "rgba(11,36,64,.15)"}">
<div style="font-family:{nf};font-weight:800;font-size:{46 if est=="dado" else 34}px;color:{ac};width:120px;flex:none;line-height:1.05">{e(i.get("n"))}</div>
<div style="font-size:{t.get("tam_txt",30)}px;line-height:1.33"><b style="font-weight:800;font-size:{t.get("tam_txt",30)+3}px">{e(i.get("t"))}</b><br>{e(i.get("x"))}</div></div>'''
        for i in t.get("itens", []))
    tit = f'<div class="T" style="font-size:{t.get("tam_tit", 76 if est != "dado" else 100)}px;margin-bottom:30px">{destaque(t.get("titulo",""), est)}</div>'
    rod = f'<div class="fonte">{e(t.get("fonte"))}</div>' if t.get("fonte") else ""
    return f'''<section class="s" style="background:{bg};color:{fg};--ac:{ac}">{tp}
<div class="a" style="left:72px;right:72px;top:{y}px">{tit}{pol}{itens}</div>{rod}{marca(fg)}</section>'''


def cta(t, est, cores, n, tot):
    bg, fg, ac = cores
    foto = t.get("foto")
    topo_f = (f'<img class="a ph" src="{e(foto)}" style="left:0;top:0;width:1080px;height:640px;object-position:{t.get("pos","50% 40%")}">'
              f'<div class="a" style="left:0;top:420px;width:1080px;height:230px;background:linear-gradient(transparent,{NV})"></div>') if foto else ""
    y = 680 if foto else 330
    return f'''<section class="s" style="background:{NV};color:#fff;--ac:{AM}">{topo_f}
<div class="a" style="left:72px;right:72px;top:{y}px"><div class="T" style="font-size:{t.get("tam", 100 if est != "dado" else 140)}px">{destaque(t["titulo"], est)}</div>
<div style="font-size:31px;font-weight:600;line-height:1.38;margin-top:28px;opacity:.9">{e(t.get("texto"))}</div>
<div style="margin-top:44px;background:{AM};color:{NV};padding:22px 30px;font-weight:800;font-size:31px;display:inline-block">Grupo grátis: partiu.avancepro.app.br/g</div>
<div style="font-weight:700;font-size:27px;margin-top:22px">Salva e manda pra quem vai contigo</div></div>{marca("#fff")}</section>'''


def tabela(t, est, cores, n, tot):
    """{label, titulo, cols:[c1,c2], linhas:[{nome, sub?, a, b}], rodape?} - b é a coluna de destaque."""
    bg, fg, ac = cores
    tp, y = topo(est, t.get("label", ""), fg, ac)
    c1, c2 = t.get("cols", ["", ""])
    escuro = bg in (NV, AZ, VD)
    linha_cor = "rgba(255,255,255,.2)" if escuro else "rgba(11,36,64,.18)"
    dest = AM if escuro else AZ
    nf = {"revista": "font-family:Fr;font-weight:800", "noticia": "font-weight:900", "dado": "font-family:Bb;font-weight:400"}[est]
    tn = 66 if est == "dado" else 50
    cab = f'''<div style="display:grid;grid-template-columns:1fr 220px 250px;gap:16px;padding-bottom:14px;border-bottom:3px solid {fg}">
<div></div><div class="lab" style="font-size:18px;text-align:right;opacity:.7">{e(c1)}</div><div class="lab" style="font-size:18px;text-align:right;color:{dest}">{e(c2)}</div></div>'''
    rows = "".join(
        f'''<div style="display:grid;grid-template-columns:1fr 220px 250px;gap:16px;align-items:center;padding:{t.get("pad",20)}px 0;border-bottom:2px solid {linha_cor}">
<div><div style="font-weight:800;font-size:33px">{e(l["nome"])}</div>{f'<div style="font-size:20px;opacity:.65;margin-top:2px">{e(l.get("sub"))}</div>' if l.get("sub") else ""}</div>
<div style="{nf};font-size:{tn - 8}px;text-align:right;opacity:.55;text-decoration:line-through;text-decoration-thickness:3px">{e(l["a"])}</div>
<div style="{nf};font-size:{tn}px;text-align:right;color:{dest}">{e(l["b"])}</div></div>''' for l in t.get("linhas", []))
    tit = f'<div class="T" style="font-size:{t.get("tam_tit", 74 if est != "dado" else 104)}px;margin-bottom:40px">{destaque(t.get("titulo",""), est)}</div>'
    rod = f'<div class="fonte">{e(t.get("rodape"))}</div>' if t.get("rodape") else ""
    return f'''<section class="s" style="background:{bg};color:{fg};--ac:{ac}">{tp}
<div class="a" style="left:72px;right:72px;top:{y}px">{tit}{cab}{rows}</div>{rod}{marca(fg)}</section>'''


TIPOS = {"tabela": tabela, "capa": capa, "texto": texto, "precos": precos, "numero": numero, "cartoes": cartoes, "lista": lista, "cta": cta}


def montar(post):
    est = post.get("estilo", "revista")
    seq = SEQ[est]
    secs = []
    tot = len(post["telas"])
    for i, t in enumerate(post["telas"]):
        cores = tuple(t["cores"]) if t.get("cores") else seq[i % len(seq)]
        secs.append(TIPOS[t["tipo"]](t, est, cores, i + 1, tot))
    return f'<!doctype html><html><head><meta charset="utf-8"><base href="file://{RAIZ}/"><style>{CSS_BASE}{CSS[est]}</style></head><body>{"".join(secs)}</body></html>'


def renderizar(post, prefixo):
    from playwright.sync_api import sync_playwright
    h = Path(str(prefixo) + ".html")
    h.parent.mkdir(parents=True, exist_ok=True)
    h.write_text(montar(post), encoding="utf-8")
    saidas = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1080, "height": 1350})
        pg.goto(h.resolve().as_uri())
        pg.wait_for_timeout(900)
        for i, s in enumerate(pg.query_selector_all("section.s"), 1):
            out = f"{prefixo}-{i}.jpg"
            s.screenshot(path=out, type="jpeg", quality=92)
            saidas.append(out)
        b.close()
    h.unlink()
    return saidas


if __name__ == "__main__":
    post = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    for s in renderizar(post, sys.argv[2]):
        print(s)
