import json, os, time, requests, traceback
from datetime import date, timedelta
out = {}
T = os.environ.get("TRAVELPAYOUTS_TOKEN","")
try:
    r = requests.get("https://api.travelpayouts.com/v2/prices/latest", params={"origin":"FOR","currency":"brl","period_type":"year","one_way":"false","limit":1000,"show_to_affiliates":"true","sorting":"price","token":T}, timeout=30)
    d = r.json().get("data") or []
    out["tp_latest"] = {"n": len(d), "destinos": sorted({x["destination"] for x in d})[:80]}
except Exception as e: out["tp_latest"] = str(e)
try:
    from fast_flights import FlightQuery, Passengers, create_query, get_flights
    res = {}
    for dest in ["GRU","LIS","REC"]:
        ida = (date.today()+timedelta(days=40)).isoformat(); volta=(date.today()+timedelta(days=47)).isoformat()
        q = create_query(flights=[FlightQuery(date=ida, from_airport="FOR", to_airport=dest), FlightQuery(date=volta, from_airport=dest, to_airport="FOR")], trip="round-trip", passengers=Passengers(adults=1), language="pt-BR", currency="BRL")
        t=time.time()
        try:
            f = get_flights(q); res[dest] = {"n": len(f), "min": min([x.price for x in f if x.price] or [0]), "s": round(time.time()-t,1)}
        except Exception as e: res[dest] = f"{type(e).__name__}: {str(e)[:200]}"
    out["google"] = res
except Exception: out["google"] = traceback.format_exc()[-500:]
json.dump(out, open("docs/diag.json","w"), indent=1); print(out)
