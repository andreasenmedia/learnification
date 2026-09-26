"""Henter sitets skrifttyper ned fra Google Fonts, så de ligger på vores eget webhotel.

Hvorfor: når en side linker direkte til fonts.googleapis.com, sender hver
besøgendes browser sin IP-adresse til Google, før der er spurgt om noget.
Det har tyske domstole kaldt et brud på GDPR (LG München, 20.01.2022), og
det passer ikke med løftet om "ingen tredjeparter". Ligger filerne her,
taler browseren kun med learnification.dk.

Kør den igen, hvis der skal flere vægte eller skrifter med:

    python tools/hent-skrifter.py

Den skriver woff2-filerne i assets/skrifter/ og et stilark pr. sæt:
assets/skrifter/site.css og assets/skrifter/runeborg.css.
Skrifterne er under SIL Open Font License, som tillader det her.
"""
import re
import urllib.request
from pathlib import Path

ROD = Path(__file__).resolve().parent.parent
MAPPE = ROD / "assets" / "skrifter"

# Samme adresser, som siderne brugte før
SAET = {
    "site": "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700"
            "&family=Inter:wght@400;500;600;700&display=swap",
    "runeborg": "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400"
                "&family=Pixelify+Sans:wght@500;600;700&display=swap",
}

# Dansk (æ, ø, å) ligger i "latin". "latin-ext" tages med til navne som Łukasz og Şeyma.
DELMAENGDER = {"latin", "latin-ext"}

# Google sender kun woff2, når den tror, den taler med en nyere browser
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0 Safari/537.36")


def hent(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def filnavn(blok: str, delmaengde: str) -> str:
    familie = re.search(r"font-family:\s*'([^']+)'", blok).group(1)
    stil = re.search(r"font-style:\s*(\w+)", blok).group(1)
    vaegt = re.search(r"font-weight:\s*([\d ]+);", blok).group(1).replace(" ", "-")
    navn = f"{familie}-{vaegt}-{stil}-{delmaengde}".lower().replace(" ", "-")
    return navn + ".woff2"


def main() -> None:
    MAPPE.mkdir(parents=True, exist_ok=True)
    for saet, url in SAET.items():
        css = hent(url).decode("utf-8")
        # Google skriver "/* latin */" lige før hver @font-face
        dele = re.findall(r"/\*\s*([\w-]+)\s*\*/\s*(@font-face\s*\{[^}]+\})", css)
        ud = [f"/* Skrifter til {saet} — hentet med tools/hent-skrifter.py. SIL Open Font License. */\n"]
        filer = {}          # kilde-url -> filnavn
        for delmaengde, blok in dele:
            if delmaengde not in DELMAENGDER:
                continue
            kilde = re.search(r"url\((https://[^)]+\.woff2)\)", blok).group(1)
            # Variable skrifter deler én fil på tværs af vægte — hent den kun én gang
            if kilde not in filer:
                filer[kilde] = filnavn(blok, delmaengde)
                (MAPPE / filer[kilde]).write_bytes(hent(kilde))
            navn = filer[kilde]
            ud.append(f"/* {delmaengde} */\n" + blok.replace(kilde, navn) + "\n")
        (MAPPE / f"{saet}.css").write_text("".join(ud), encoding="utf-8", newline="\n")
        print(f"{saet}: {len(ud) - 1} @font-face, {len(filer)} filer")


if __name__ == "__main__":
    main()
