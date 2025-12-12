# # 🎪 Festival-Data-Loader 2026 (mit ISO-Datum)
# 
# Dieses Notebook lädt Festivaldaten 
# und wandelt die Datumsangaben (z. B. "04.06." oder "02.11.-06.11.") in ISO-Formate
# um, die in JavaScript leicht zu parsen sind (YYYY-MM-DD).

import requests
from bs4 import BeautifulSoup
import pandas as pd
import re
from datetime import datetime
import config as cfg
import hashlib
import base64


def get_unique_id(s: str, length=3):
    # SHA1-Hash → Base64 → nur URL-sichere Zeichen
    h = hashlib.sha1(s.encode()).digest()
    myid = base64.urlsafe_b64encode(h).decode()[:length]

    # Sicherstellen, dass die ID einzigartig ist
    if not hasattr(get_unique_id, "_used_ids"):
        get_unique_id._used_ids = set()
    used_ids = get_unique_id._used_ids
    if myid in used_ids:
        myid = '_' + myid[1:]
    used_ids.add(myid)
    return myid


def parse_datum(datum_str, jahr=2026):
    """
    Wandelt ein Datumsfeld wie '04.06.' oder '02.11.-06.11.' in
    startdatum und enddatum (YYYY-MM-DD) um.
    """
    datum_str = datum_str.strip()

    # Muster: Bereich wie 02.11.-06.11.
    match_bereich = re.match(r"(\d{2})\.(\d{2})\.\s*-\s*(\d{2})\.(\d{2})\.", datum_str)
    if match_bereich:
        start = datetime(jahr, int(match_bereich.group(2)), int(match_bereich.group(1)))
        ende = datetime(jahr, int(match_bereich.group(4)), int(match_bereich.group(3)))
        return start.strftime("%Y-%m-%d"), ende.strftime("%Y-%m-%d")

    # Muster: einzelnes Datum wie 04.06.
    match_einzel = re.match(r"(\d{2})\.(\d{2})\.", datum_str)
    if match_einzel:
        start = datetime(jahr, int(match_einzel.group(2)), int(match_einzel.group(1)))
        return start.strftime("%Y-%m-%d"), start.strftime("%Y-%m-%d")

    # Falls kein Treffer, gib None zurück
    return None, None


def load_festivals_2026(url):
    """Lädt Festivaldaten und gibt eine Liste von Dicts mit ISO-Daten zurück."""
    
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/115.0.0.0 Safari/537.36"
        )
    }
    
    print("Lade Seite:", url)
    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        print("⚠️ Fehler beim Laden:", resp.status_code)
        return []
    
    soup = BeautifulSoup(resp.text, "html.parser")

    festivals = []
    tbodies = soup.find_all("tbody", class_="vevent")
    print(f"Gefundene Festival-Tabellen: {len(tbodies)}")

    for tbody in tbodies:
        for tr in tbody.find_all("tr"):
            tds = tr.find_all("td")
            if len(tds) >= 3:
                raw_datum = tds[0].get_text(strip=True)
                name = tds[1].get_text(strip=True)
                plz = tds[3].get_text(strip=True)                
                ort = tds[4].get_text(strip=True)
                land = tds[2].get_text(strip=True)
                if name[:6] == "Irish ":
                    continue  # Skip Irish Festivals
                link = ""
                a = tds[1].find("a")
                if a and a.has_attr("href"):
                    link = a["href"]

                startdatum, enddatum = parse_datum(raw_datum)

                # Entferne Hostname aus dem Link
                link = link.rstrip('/').split('/')[-1]

                festivals.append({
                    "id": get_unique_id(name + startdatum),
                    "name": name,
                    "ort": ort,
                    "land": land,
                    "plz": plz,
                    "startdatum": startdatum,
                    "enddatum": enddatum,
                    "slug": link,
                    "rawdatum": raw_datum,  # zur Kontrolle
                })
    
    return festivals


festivals = load_festivals_2026(cfg.FESTIVALS_2026_URL)
df = pd.DataFrame(festivals)
print(df.head(20))

# Nachdem du deinen DataFrame 'df' erstellt hast:
df.to_json("festivals_2026.json", orient="records", force_ascii=False, indent=2)
print("✅ Daten gespeichert in festivals_2026.json")
