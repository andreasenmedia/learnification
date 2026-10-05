"""Tag skærmbilleder af Regnehelten til hjemmesiden.

Samme opskrift som runeborg-billeder.py: starter den lokale server, åbner
spillet i en usynlig Chrome med #foto=<scene> (spillet stiller selv scenen
op og gemmer intet) og lægger billederne i
assets/billeder/regnehelten-<scene>.png.

    python tools/regnehelten-billeder.py
"""
import os
import shutil
import subprocess
import sys
import time
import urllib.request

ROD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UD = os.path.join(ROD, 'assets', 'billeder')
PORT = 8799
SCENER = ['titel', 'klasse', 'hjem', 'by', 'skolegaard', 'park', 'dialog', 'opgave', 'moenter', 'regnebogen']

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
    server = subprocess.Popen([sys.executable, os.path.join(ROD, 'tools', 'lokal-server.py'), ROD, str(PORT)],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                urllib.request.urlopen(f'http://127.0.0.1:{PORT}/spil/regnehelten/', timeout=1)
                break
            except OSError:
                time.sleep(0.2)
        profil = os.path.join(ROD, '.chrome-foto')
        for scene in sys.argv[1:] or SCENER:
            ud = os.path.join(UD, f'regnehelten-{scene}.png')
            # Spillet kræver login i testperioden; en cookie lader det starte (serveren svarer ikke på PHP lokalt)
            subprocess.run([chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
                            f'--user-data-dir={profil}', '--window-size=1280,800', '--virtual-time-budget=9000',
                            f'--screenshot={ud}', f'http://127.0.0.1:{PORT}/tools/foto-cookie.html#{scene}'],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=90)
            print('Lavet', os.path.relpath(ud, ROD))
        shutil.rmtree(profil, ignore_errors=True)
    finally:
        server.terminate()


if __name__ == '__main__':
    main()
