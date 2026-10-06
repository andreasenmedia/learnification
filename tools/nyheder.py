"""
Bygger nyhederne ud fra tools/nyheder.json:

  nyheder.html  alle nyheder (mellem <!-- NYHEDER:START --> og <!-- NYHEDER:SLUT -->)
  index.html    de tre nyeste i "Seneste nyt" (mellem <!-- SENESTE-NYT:START/SLUT -->)
  nyheder.xml   RSS-feed til dem, der følger med i en RSS-læser
  sitemap.xml   <lastmod> på /nyheder sættes til den nyeste dato

Kør efter hver rettelse i nyheder.json:

    python tools/nyheder.py

Siden har ingen bygning ellers, så resultatet bliver committet som almindelige
filer. JSON-filen ligger i tools/, som ikke bliver lagt op på serveren.
"""
import html
import json
import re
import sys
from datetime import date, datetime, timezone
from email.utils import format_datetime
from pathlib import Path

ROD = Path(__file__).resolve().parent.parent
KILDE = ROD / "tools" / "nyheder.json"
SITE = "https://learnification.dk"

MAERKER = {
    "Nyt spil": "nyt-spil",
    "Nyt kapitel": "nyt-kapitel",
    "Spil": "spil",
    "Til voksne": "voksne",
    "Privatliv": "privatliv",
    "Siden": "siden",
}
MAANEDER = ["januar", "februar", "marts", "april", "maj", "juni", "juli",
            "august", "september", "oktober", "november", "december"]
PAA_FORSIDEN = 3


def dansk_dato(d):
    return f"{d.day}. {MAANEDER[d.month - 1]} {d.year}"


def indlaes():
    data = json.loads(KILDE.read_text(encoding="utf-8"))
    nyheder, set_id = [], set()
    for i, n in enumerate(data["nyheder"]):
        hvor = f"nyhed nr. {i + 1} ({n.get('id', '?')})"
        for felt in ("id", "dato", "maerke", "titel", "tekst"):
            if not n.get(felt):
                sys.exit(f"{hvor} mangler '{felt}'")
        if not re.fullmatch(r"[a-z0-9-]+", n["id"]):
            sys.exit(f"{hvor}: id må kun have små bogstaver, tal og bindestreg")
        if n["id"] in set_id:
            sys.exit(f"{hvor}: id'et er brugt før")
        set_id.add(n["id"])
        if n["maerke"] not in MAERKER:
            sys.exit(f"{hvor}: mærket skal være et af {', '.join(MAERKER)}")
        try:
            n["_dato"] = date.fromisoformat(n["dato"])
        except ValueError:
            sys.exit(f"{hvor}: datoen skal skrives ÅÅÅÅ-MM-DD")
        if isinstance(n["tekst"], str):
            n["tekst"] = [n["tekst"]]
        nyheder.append(n)
    # Nyeste først. Samme dato beholder rækkefølgen fra filen (sorted er stabil).
    return sorted(nyheder, key=lambda n: n["_dato"], reverse=True)


def kort_tekst(n):
    """Kort tekst til forsiden: 'kort' hvis den findes, ellers første sætning."""
    if n.get("kort"):
        return n["kort"]
    ren = re.sub(r"<[^>]+>", "", n["tekst"][0])
    saetning = re.match(r"(.+?[.!?])(\s|$)", ren)
    ren = saetning.group(1) if saetning else ren
    return ren if len(ren) <= 190 else ren[:187].rsplit(" ", 1)[0] + " …"


def meta(n):
    return (f'<time datetime="{n["dato"]}">{dansk_dato(n["_dato"])}</time>'
            f'<span class="maerke maerke-{MAERKER[n["maerke"]]}">{html.escape(n["maerke"])}</span>')


def artikel(n, nl):
    dele = [f'<article class="nyhed" id="{n["id"]}">',
            f'  <p class="nyhed-meta">{meta(n)}</p>',
            f'  <h2><a href="#{n["id"]}">{html.escape(n["titel"])}</a></h2>']
    if n.get("billede"):
        b = n["billede"]
        dele.append(f'  <figure class="shot nyhed-billede"><img src="{b["src"]}" width="1024" height="640" '
                    f'alt="{html.escape(b.get("alt", ""))}" loading="lazy"></figure>')
    dele += [f"  <p>{afsnit}</p>" for afsnit in n["tekst"]]
    if n.get("link"):
        dele.append(f'  <p class="nyhed-link"><a class="btn btn-sm" href="{n["link"]["href"]}">'
                    f'{html.escape(n["link"]["tekst"])} &rarr;</a></p>')
    dele.append("</article>")
    return nl.join(dele)


def forside_kort(n, nl):
    return nl.join([
        '<article class="card nyhed-kort">',
        f'  <p class="nyhed-meta">{meta(n)}</p>',
        f'  <h3><a href="/nyheder#{n["id"]}">{html.escape(n["titel"])}</a></h3>',
        f"  <p>{html.escape(kort_tekst(n))}</p>",
        "</article>",
    ])


def udskift(fil, start, slut, indhold):
    tekst = fil.read_text(encoding="utf-8")
    nl = "\r\n" if "\r\n" in tekst else "\n"
    a, b = f"<!-- {start} -->", f"<!-- {slut} -->"
    if a not in tekst or b not in tekst:
        sys.exit(f"{fil.name}: mangler markeringerne {a} og {b}")
    foer, rest = tekst.split(a, 1)
    _, efter = rest.split(b, 1)
    ny = foer + a + nl + indhold(nl) + nl + b + efter
    if ny != tekst:
        fil.write_text(ny, encoding="utf-8", newline="")
        print(f"  {fil.name} opdateret")
    else:
        print(f"  {fil.name} uændret")


def absolutte_links(s):
    return re.sub(r'(href|src)="/', rf'\1="{SITE}/', s)


def rss(nyheder):
    def tid(d):
        return format_datetime(datetime(d.year, d.month, d.day, 10, 0, tzinfo=timezone.utc))

    items = []
    for n in nyheder:
        beskrivelse = "".join(f"<p>{p}</p>" for p in n["tekst"]).replace("]]>", "]]&gt;")
        items.append(
            "    <item>\n"
            f"      <title>{html.escape(n['titel'])}</title>\n"
            f"      <link>{SITE}/nyheder#{n['id']}</link>\n"
            f"      <guid isPermaLink=\"false\">learnification-nyhed-{n['id']}</guid>\n"
            f"      <pubDate>{tid(n['_dato'])}</pubDate>\n"
            f"      <category>{html.escape(n['maerke'])}</category>\n"
            f"      <description><![CDATA[{absolutte_links(beskrivelse)}]]></description>\n"
            "    </item>")
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
        "  <channel>\n"
        "    <title>Nyt fra Learnification</title>\n"
        f"    <link>{SITE}/nyheder</link>\n"
        f'    <atom:link href="{SITE}/nyheder.xml" rel="self" type="application/rss+xml"/>\n'
        "    <description>Nye spil, nye kapitler og forbedringer på learnification.dk</description>\n"
        "    <language>da</language>\n"
        f"    <lastBuildDate>{tid(nyheder[0]['_dato'])}</lastBuildDate>\n"
        + "\n".join(items) + "\n"
        "  </channel>\n"
        "</rss>\n")


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    nyheder = indlaes()
    print(f"{len(nyheder)} nyheder, nyeste {nyheder[0]['dato']}")

    udskift(ROD / "nyheder.html", "NYHEDER:START", "NYHEDER:SLUT",
            lambda nl: (nl + nl).join(artikel(n, nl) for n in nyheder))
    udskift(ROD / "index.html", "SENESTE-NYT:START", "SENESTE-NYT:SLUT",
            lambda nl: nl.join(forside_kort(n, nl) for n in nyheder[:PAA_FORSIDEN]))

    (ROD / "nyheder.xml").write_text(rss(nyheder), encoding="utf-8", newline="\n")
    print("  nyheder.xml skrevet")

    sitemap = ROD / "sitemap.xml"
    s = sitemap.read_text(encoding="utf-8")
    ny = re.sub(r"(<loc>https://learnification\.dk/nyheder</loc>)(<lastmod>[^<]*</lastmod>)?",
                rf"\1<lastmod>{nyheder[0]['dato']}</lastmod>", s)
    if ny != s:
        sitemap.write_text(ny, encoding="utf-8", newline="")
        print("  sitemap.xml opdateret")


if __name__ == "__main__":
    main()
