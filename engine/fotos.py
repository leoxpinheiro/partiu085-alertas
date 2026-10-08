"""Baixa uma foto real de cada destino (Wikipedia/Wikimedia Commons, licença livre) para as imagens dos alertas.
Salva docs/fotos/<IATA>.jpg (1080 px de largura) e docs/fotos/creditos.json (autor e licença, que vão na imagem).
Uso: python engine/fotos.py [IATA ...]   (sem argumentos: todos os destinos de docs/rotas.json que ainda não têm foto)
"""
import io, json, re, sys, time
from pathlib import Path
import requests
from PIL import Image, ImageOps

RAIZ = Path(__file__).resolve().parent.parent
DIR = RAIZ / "docs" / "fotos"; DIR.mkdir(parents=True, exist_ok=True)
CRED = DIR / "creditos.json"
UA = {"User-Agent": "Partiu085-radar/1.0 (https://leoxpinheiro.github.io/partiu085-alertas; contato via GitHub)"}
# página da Wikipedia (pt ou en) cuja foto principal é bonita para cada destino
PAGINA = {
    "SAO": "en:Paulista Avenue", "RIO": "pt:Pão de Açúcar (Rio de Janeiro)", "BSB": "en:Cathedral of Brasília", "BHZ": "en:Pampulha Modern Ensemble",
    "CNF": "en:Pampulha Modern Ensemble", "SSA": "pt:Elevador Lacerda", "REC": "pt:Praia de Boa Viagem", "NAT": "pt:Ponta Negra (Natal)",
    "JPA": "pt:Praia de Tambaú", "MCZ": "pt:Maceió", "AJU": "en:Aracaju", "SLZ": "en:São Luís, Maranhão", "THE": "pt:Parque Encontro dos Rios",
    "BEL": "pt:Estação das Docas", "MAO": "pt:Teatro Amazonas", "POA": "en:Porto Alegre", "CWB": "pt:Jardim Botânico de Curitiba",
    "FLN": "pt:Ponte Hercílio Luz", "VIX": "pt:Terceira Ponte", "GYN": "en:Goiânia", "IGU": "pt:Cataratas do Iguaçu",
    "FEN": "pt:Baía do Sancho", "JDO": "pt:Estátua do Padre Cícero", "VCP": "en:Campinas", "CGB": "en:Cuiabá", "CGR": "en:Campo Grande",
    "NVT": "pt:Balneário Camboriú", "BPS": "en:Porto Seguro", "PMW": "pt:Palácio Araguaia", "UDI": "en:Uberlândia",
    "LIS": "en:Belém Tower", "OPO": "en:Dom Luís I Bridge", "MAD": "en:Plaza Mayor, Madrid", "PAR": "en:Eiffel Tower", "ROM": "en:Colosseum",
    "LON": "en:Tower Bridge", "AMS": "en:Canals of Amsterdam", "MIA": "en:South Beach", "ORL": "en:Orlando, Florida", "NYC": "en:Lower Manhattan",
    "BUE": "en:Obelisco de Buenos Aires", "SCL": "en:Santiago", "LIM": "en:Miraflores District, Lima", "BOG": "en:Bogotá", "CTG": "en:Castillo San Felipe de Barajas",
    "PTY": "en:Cinta Costera", "CUN": "en:Cancún", "MVD": "en:Montevideo", "SID": "en:Santa Maria, Cape Verde", "BCN": "en:Sagrada Família",
    "MIL": "en:Milan Cathedral", "FRA": "en:Frankfurt", "PUJ": "en:Punta Cana", "MDE": "en:Medellín", "SDQ": "en:Ciudad Colonial (Santo Domingo)",
}

def foto_da_pagina(ref):
    lang, titulo = ref.split(":", 1)
    r = requests.get(f"https://{lang}.wikipedia.org/w/api.php", headers=UA, timeout=30, params={
        "action": "query", "format": "json", "titles": titulo, "prop": "pageimages", "piprop": "original|name", "redirects": 1})
    pag = next(iter(r.json()["query"]["pages"].values()))
    return pag.get("pageimage"), (pag.get("original") or {}).get("source")

def credito(arquivo):
    r = requests.get("https://commons.wikimedia.org/w/api.php", headers=UA, timeout=30, params={
        "action": "query", "format": "json", "titles": "File:" + arquivo, "prop": "imageinfo", "iiprop": "extmetadata|url"})
    pag = next(iter(r.json()["query"]["pages"].values()))
    ii = (pag.get("imageinfo") or [{}])[0]; m = ii.get("extmetadata", {})
    limpa = lambda s: re.sub(r"<[^>]+>", "", s or "").strip()
    return {"autor": limpa((m.get("Artist") or {}).get("value"))[:60], "licenca": limpa((m.get("LicenseShortName") or {}).get("value")),
            "fonte": ii.get("descriptionurl", "")}

def main():
    rotas = [r["iata"] for r in json.loads((RAIZ / "docs" / "rotas.json").read_text())]
    pedidos = [a.upper() for a in sys.argv[1:]] or [i for i in rotas if not (DIR / f"{i}.jpg").exists()]
    cred = json.loads(CRED.read_text()) if CRED.exists() else {}
    for iata in pedidos:
        ref = PAGINA.get(iata)
        if not ref:
            print(iata, "sem página definida"); continue
        try:
            arquivo, url = foto_da_pagina(ref)
            if not url:
                print(iata, "sem foto em", ref); continue
            img = ImageOps.exif_transpose(Image.open(io.BytesIO(requests.get(url, headers=UA, timeout=60).content))).convert("RGB")
            w, h = img.size
            alvo = 1080
            if w < 700:
                print(iata, "foto pequena", w, h); continue
            img = img.resize((alvo, int(h * alvo / w)), Image.LANCZOS) if w > alvo else img
            img.save(DIR / f"{iata}.jpg", "JPEG", quality=82, optimize=True, progressive=True)
            c = credito(arquivo) if arquivo else {}
            cred[iata] = {"pagina": ref, "arquivo": arquivo, **c}
            print(iata, "ok", w, h, arquivo, c.get("licenca"))
        except Exception as e:  # noqa: BLE001
            print(iata, "erro", e)
        time.sleep(1)
    CRED.write_text(json.dumps(cred, ensure_ascii=False, indent=1) + "\n")

if __name__ == "__main__":
    main()
