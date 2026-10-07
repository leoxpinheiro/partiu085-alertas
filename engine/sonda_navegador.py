"""Sonda: abre Smiles e Azul num navegador de verdade e registra o que as APIs de milhas respondem."""
import asyncio, json, sys
from datetime import date, timedelta
from playwright.async_api import async_playwright

D = date.today() + timedelta(days=45)
ms = int(__import__("datetime").datetime(D.year, D.month, D.day, 12).timestamp() * 1000)
ALVOS = {
    "smiles": (f"https://www.smiles.com.br/mfe/emissao-passagem/?adults=1&cabin=ALL&children=0&departureDate={ms}&infants=0&isElegible=false&isFlexibleDateChecked=false&returnDate=&searchType=g3&segments=1&tripType=2&originAirport=FOR&originCity=&originCountry=&originAirportIsAny=false&destinationAirport=GRU&destinCity=&destinCountry=&destinAirportIsAny=false&novo-resultado-voos=true", ["smiles"]),
    "_azul": (f"https://www.voeazul.com.br/br/pt/home/selecao-voo?c[0].ds=FOR&c[0].std={D:%m/%d/%Y}&c[0].as=GRU&p[0].t=ADT&p[0].c=1&p[0].cp=false&f.dl=3&f.dr=3&cc=PTS", ["availability", "b2c-api", "reservationavailability"]),
    "_latam": (f"https://www.latamairlines.com/br/pt/oferta-voos?origin=FOR&inbound=null&outbound={D:%Y-%m-%d}T12%3A00%3A00.000Z&destination=GRU&adt=1&chd=0&inf=0&trip=OW&cabin=Economy&redemption=true&sort=RECOMMENDED", ["offers", "search"]),
}

async def sondar(pw, nome, url, chaves):
    b = await pw.chromium.launch(headless=True, args=["--disable-blink-features=AutomationControlled"])
    ctx = await b.new_context(locale="pt-BR", timezone_id="America/Fortaleza", viewport={"width": 1366, "height": 900},
                              user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36")
    await ctx.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined})")
    p = await ctx.new_page()
    vistos = []
    falhas = []
    p.on("requestfailed", lambda rq: falhas.append(rq.url[:150]))
    async def resp(r):
        if any(k in r.url.lower() for k in chaves) and r.request.resource_type in ("xhr", "fetch"):
            try: corpo = (await r.text())[:700]
            except Exception as e: corpo = f"<{e}>"
            vistos.append(f"  {r.status} {r.url[:150]}\n    {corpo}")
    p.on("response", resp)
    try:
        r = await p.goto(url, timeout=60000, wait_until="domcontentloaded")
        print(f"== {nome}: página {r.status if r else '?'}")
        await p.wait_for_timeout(55000)
        print("  título:", await p.title())
        txt = (await p.inner_text("body"))[:500].replace("\n", " ")
        print("  texto:", txt)
    except Exception as e:
        print(f"== {nome}: erro {e}")
    print(f"  respostas de API: {len(vistos)}")
    import re as _re
    for v in vistos:
        if _re.search(r"flight|search|avail|offer| 4\d\d | 5\d\d ", v[:200], _re.I): print(v[:900])
    print("  falhas:", falhas[:10])
    await b.close()

async def main():
    async with async_playwright() as pw:
        for n, (u, k) in ALVOS.items():
            if n.startswith("_"): continue
            await sondar(pw, n, u, k)

asyncio.run(main())
