"""Passer Regneheltens opgaver til klassetrinnet?

Spillet laver opgaverne på stedet i JavaScript (spil/regnehelten/js/opgaver.js).
Det her værktøj starter den lokale server, lader en usynlig Chrome lave et
stort antal opgavesæt pr. klassetrin (tools/regnehelten-tjek.html) og måler
hver eneste opgave mod det, trinnet må indeholde efter Fælles Mål:
regningsarter, talområde, regneloft og fortegn. Reglerne er de samme som i
Python-udgavens tools/tjek_klassetrin.py.

    python tools/regnehelten-tjek.py          (300 runder pr. sæt og trin)
    python tools/regnehelten-tjek.py 1000
"""
import html
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.request

ROD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8798
RUNDER = int(sys.argv[1]) if len(sys.argv) > 1 else 300

# Samme profiler som i opgaver.js (kun det, der tjekkes på)
TRIN = {
    1: dict(gange=False, procent=False, negative=False, decimal=False, plus=10, gange_top=0, del_top=0, kr=20),
    2: dict(gange=True, procent=False, negative=False, decimal=False, plus=50, gange_top=50, del_top=50, kr=100),
    3: dict(gange=True, procent=False, negative=False, decimal=False, plus=100, gange_top=100, del_top=100, kr=200),
    4: dict(gange=True, procent=False, negative=False, decimal=True, plus=200, gange_top=200, del_top=200, kr=400),
    5: dict(gange=True, procent=True, negative=True, decimal=True, plus=1000, gange_top=600, del_top=600, kr=800),
    6: dict(gange=True, procent=True, negative=True, decimal=True, plus=1000, gange_top=900, del_top=900, kr=1200),
}
# Tal, der overhovedet må stå i en opgave, og det, eleven selv skal regne sig frem til
LOFT = {1: 50, 2: 200, 3: 1200, 4: 12000, 5: 120000, 6: 120000}
SVAR_LOFT = {1: 20, 2: 100, 3: 1000, 4: 10000, 5: 100000, 6: 100000}
GANGE = re.compile(r"(\d+)\s*(?:x|·)\s*(\d+)")
DELT = re.compile(r"(\d+)\s*:\s*(\d+)")
GANGE_ORD = re.compile(r"\bgange\b|\bgang(er|et)\b|\bdividere\b|\bdel(t|es|er)? med\b|"
                       r"\bgangetabel|\btabellen\b| x \d| : \d|·")

KANDIDATER = [
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    shutil.which('chrome') or '', shutil.which('google-chrome') or '', shutil.which('chromium') or '',
]


def regneloft(t):
    return max(t["plus"], t["gange_top"], t["kr"])


def tal_i(tekst):
    return [int(n) for n in re.findall(r"-?\d+", str(tekst))]


def tjek(k, navn, sp, fejl):
    t = TRIN[k]
    tekst = " ".join(str(sp.get(f, "")) for f in ("q", "hint", "statement"))
    for c in sp.get("choices", []) or []:
        tekst += " " + str(c)
    hvor = f"{k}. klasse / {navn}"

    if not t["gange"]:
        if sp.get("book") in ("gange", "division"):
            fejl.append(f"{hvor}: peger i Regnebogen på '{sp['book']}', men trinnet har ikke mødt gange")
        if GANGE_ORD.search(tekst):
            fejl.append(f"{hvor}: gange/division i teksten: {tekst[:80]!r}")
        if sp["kind"] == "balance" and sp.get("op") == "x":
            fejl.append(f"{hvor}: vægtskål med gange")
    if not t["procent"] and "%" in tekst:
        fejl.append(f"{hvor}: procent, som trinnet ikke har mødt")

    svar = sp.get("answer")
    tal = isinstance(svar, (int, float)) and not isinstance(svar, bool)
    if tal and svar < 0 and not t["negative"]:
        fejl.append(f"{hvor}: negativt svar {svar}")
    for n in tal_i(tekst):
        if abs(n) > LOFT[k]:
            fejl.append(f"{hvor}: tallet {n} er over loftet {LOFT[k]}  ({tekst[:70]!r})")
            break
    if tal and abs(svar) > SVAR_LOFT[k]:
        fejl.append(f"{hvor}: svaret {svar} er over talområdet {SVAR_LOFT[k]}")
    if tal and abs(svar) > regneloft(t):
        fejl.append(f"{hvor}: svaret {svar} er over regneloftet {regneloft(t)}  ({tekst[:60]!r})")
    for a, b in GANGE.findall(tekst):
        if int(a) * int(b) > t["gange_top"]:
            fejl.append(f"{hvor}: {a} x {b} er over gangeloftet {t['gange_top']}")
    for a, b in DELT.findall(tekst):
        if int(a) > t["del_top"]:
            fejl.append(f"{hvor}: {a} : {b} er over deleloftet {t['del_top']}")
    if tal and not float(svar).is_integer() and not t["decimal"]:
        fejl.append(f"{hvor}: decimalsvar {svar}")

    kind = sp["kind"]
    if kind == "balance":
        a, op, sv = sp["a"], sp["op"], sp["answer"]
        vent = a * sv if op == "x" else (a + sv if op == "+" else a - sv)
        if sp["target"] != vent:
            fejl.append(f"{hvor}: vægtskålen går ikke op")
        if not (sp["min"] <= sv <= sp["max"]):
            fejl.append(f"{hvor}: vægtskålens svar {sv} kan ikke stilles ind ({sp['min']}-{sp['max']})")
    if kind == "findall":
        rigtige = 0
        for lab, vaerdi in sp["tiles"]:
            udtryk = lab.replace("x", "*")
            if eval(udtryk, {"__builtins__": {}}, {}) != vaerdi:
                fejl.append(f"{hvor}: flisen '{lab}' er ikke {vaerdi}")
            if not t["gange"] and "x" in lab:
                fejl.append(f"{hvor}: gangestykke på en flise: {lab}")
            if vaerdi > regneloft(t):
                fejl.append(f"{hvor}: flisen '{lab}' er over regneloftet")
            if any(n > LOFT[k] for n in tal_i(lab)):
                fejl.append(f"{hvor}: flisen '{lab}' har tal over loftet")
            rigtige += vaerdi == sp["target"]
        if rigtige < 1:
            fejl.append(f"{hvor}: ingen fliser giver {sp['target']}")
    if kind == "sequence" and len([x for x in sp["seq"] if x is not None]) < 3:
        fejl.append(f"{hvor}: talrække uden nok tal")
    if kind == "choice" and not (0 <= sp["answer"] < len(sp["choices"])):
        fejl.append(f"{hvor}: svaret peger uden for valgmulighederne")
    if kind == "coins" and not (1 <= sp["target"] <= 9 * 88):
        fejl.append(f"{hvor}: beløbet {sp['target']} kan ikke lægges med mønterne")


def find_chrome():
    for k in KANDIDATER:
        if k and os.path.exists(k):
            return k
    sys.exit('Fandt hverken Chrome eller Edge.')


def main():
    chrome = find_chrome()
    server = subprocess.Popen([sys.executable, os.path.join(ROD, 'tools', 'lokal-server.py'), ROD, str(PORT)],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                urllib.request.urlopen(f'http://127.0.0.1:{PORT}/tools/regnehelten-tjek.html', timeout=1)
                break
            except OSError:
                time.sleep(0.2)
        profil = os.path.join(ROD, '.chrome-tjek')
        dom = subprocess.run([chrome, '--headless=new', '--disable-gpu', f'--user-data-dir={profil}', '--virtual-time-budget=60000',
                              '--dump-dom', f'http://127.0.0.1:{PORT}/tools/regnehelten-tjek.html#{RUNDER}'],
                             capture_output=True, text=True, encoding='utf-8', timeout=300).stdout
        shutil.rmtree(profil, ignore_errors=True)
    finally:
        server.terminate()
    m = re.search(r'<pre id="ud">(.*?)</pre>', dom, re.S)
    if not m or m.group(1) == 'venter':
        sys.exit('Siden lavede ingen opgaver — kør den i en browser og se konsollen.')
    data = json.loads(html.unescape(m.group(1)))

    fejl = []
    pr_trin = {}
    for d in data:
        pr_trin[d["k"]] = pr_trin.get(d["k"], 0) + 1
        if d["fejl"]:
            fejl.append(f'{d["k"]}. klasse / {d["navn"]}: {d["fejl"]}')
        tjek(d["k"], d["navn"], d["sp"], fejl)
    print(f"{RUNDER} runder pr. opgavesæt og klassetrin:")
    for k in sorted(pr_trin):
        print(f"  {k}. klasse: {pr_trin[k]:6d} opgaver tjekket")
    print()
    if fejl:
        unikke = sorted(set(fejl))
        print(f"{len(fejl)} fejl, {len(unikke)} forskellige:\n")
        for f in unikke[:60]:
            print("  -", f)
        sys.exit(1)
    print("Alt passer til klassetrinnet.")


if __name__ == '__main__':
    main()
