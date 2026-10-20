"""Tag skærmbilleder af den skjulte demo (Lærerens forløb) til decks og slides.

Starter den lokale server, åbner siderne i en usynlig Chrome/Edge og lægger billederne i
demo/laererforloeb/billeder/. Spillet stiller selv scenen op med #foto=<scene> (og gemmer intet),
lærersiden springer til et trin med #trin=<n>.

    python tools/demo-billeder.py
"""
import os
import shutil
import subprocess
import sys
import time
import urllib.request

ROD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UD = os.path.join(ROD, 'demo', 'laererforloeb', 'billeder')
PORT = 8798
LAERER = '/demo/laererforloeb/'
SPIL = '/demo/laererforloeb/spil/'

# (filnavn, adresse, bredde, højde)
BILLEDER = [
    ('laerer-1-hent', LAERER + '#trin=1', 1280, 1180),
    ('laerer-2-ai', LAERER + '#trin=2', 1280, 1180),
    ('laerer-3-forslag', LAERER + '#trin=3', 1280, 1500),
    ('laerer-4-tildel', LAERER + '#trin=4', 1280, 1050),
    ('laerer-5-overblik', LAERER + '#trin=5', 1280, 1350),
    ('spil-skole', SPIL + '#foto=skole', 1280, 800),
    ('spil-dialog', SPIL + '#foto=dialog', 1280, 800),
    ('spil-graf', SPIL + '#foto=graf', 1280, 800),
    ('spil-sorter', SPIL + '#foto=sort', 1280, 800),
    ('spil-bog', SPIL + '#foto=bog', 1280, 800),
    ('spil-vikinger', SPIL + '?forloeb=vikinger#foto=dialog', 1280, 800),
]

KANDIDATER = [
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    shutil.which('chrome') or '', shutil.which('google-chrome') or '', shutil.which('chromium') or '',
]


def find_chrome():
    for k in KANDIDATER:
        if k and os.path.exists(k):
            return k
    sys.exit('Fandt hverken Chrome eller Edge.')


def main():
    chrome = find_chrome()
    os.makedirs(UD, exist_ok=True)
    server = subprocess.Popen([sys.executable, os.path.join(ROD, 'tools', 'lokal-server.py'), ROD, str(PORT)],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                urllib.request.urlopen(f'http://127.0.0.1:{PORT}{LAERER}', timeout=1)
                break
            except OSError:
                time.sleep(0.2)
        profil = os.path.join(ROD, '.chrome-foto')
        for navn, adr, b, h in BILLEDER:
            ud = os.path.join(UD, navn + '.png')
            if os.path.exists(ud):
                os.remove(ud)
            subprocess.run([chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
                            f'--user-data-dir={profil}', f'--window-size={b},{h}', '--virtual-time-budget=9000',
                            f'--screenshot={ud}', f'http://127.0.0.1:{PORT}{adr}'],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=90)
            print('Lavet', os.path.relpath(ud, ROD))
        shutil.rmtree(profil, ignore_errors=True)
    finally:
        server.terminate()


if __name__ == '__main__':
    main()
