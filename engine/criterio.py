"""Quando uma passagem é barata DE VERDADE (pra chamar de achado no Instagram, story e WhatsApp).

Regra do Leo: não adianta estar 20% abaixo do normal se o preço continua caro
(ex.: R$ 1.500 pra São Paulo não é achado). Então o achado precisa passar
em DUAS réguas: desconto e um teto absoluto por região, contado por trecho
(ida e volta = preço / 2).
"""
REGIAO = {
    "nordeste": "REC NAT JPA MCZ AJU SLZ THE SSA JDO BPS FEN".split(),
    "norte_centro": "BEL MAO BSB GYN PMW CGB CGR".split(),
    "sudeste": "SAO RIO BHZ VIX VCP UDI".split(),
    "sul": "POA CWB FLN NVT IGU".split(),
    "america_sul": "BUE MVD SCL LIM BOG MDE CTG".split(),
    "caribe": "PTY CUN PUJ SDQ CAY".split(),
    "eua": "MIA ORL NYC".split(),
    "europa_africa": "LIS OPO MAD PAR ROM LON AMS BCN MIL FRA SID".split(),
}
# teto por TRECHO (R$). Ida e volta pode custar no máximo o dobro.
TETO_TRECHO = {"nordeste": 450, "norte_centro": 550, "sudeste": 500, "sul": 650,
               "america_sul": 900, "caribe": 1700, "eua": 1800, "europa_africa": 1800}
DESCONTO_MIN = 0.20


def regiao(iata: str) -> str:
    for r, l in REGIAO.items():
        if iata in l:
            return r
    return ""


def preco_trecho(a: dict) -> float:
    p = float(a.get("preco") or 0)
    return p / 2 if a.get("modo") == "ida_volta" or a.get("regua") == "ida_volta" else p


def barato_de_verdade(a: dict, aj: dict | None = None) -> bool:
    aj = aj or {}
    tetos = {**TETO_TRECHO, **(aj.get("achado_teto_trecho") or {})}
    r = regiao(a.get("destino", ""))
    if not r:
        return False
    if (a.get("desconto") or 0) < float(aj.get("achado_desconto_min", DESCONTO_MIN)):
        return False
    return 0 < preco_trecho(a) <= float(tetos[r])


def motivo(a: dict, aj: dict | None = None) -> str:
    r = regiao(a.get("destino", ""))
    t = {**TETO_TRECHO, **((aj or {}).get("achado_teto_trecho") or {})}.get(r)
    return f"{a.get('destino')} {r}: trecho R$ {preco_trecho(a):.0f} (teto {t}), desconto {a.get('desconto')}"
