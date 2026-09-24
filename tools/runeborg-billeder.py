"""Tag skærmbilleder af Runeborg til hjemmesiden.

Starter den lokale server, åbner spillet i en usynlig Chrome med
#foto=<scene> (spillet stiller selv scenen op og gemmer intet) og lægger
billederne i assets/billeder/runeborg-<scene>.png.

    python tools/runeborg-billeder.py
"""
import os
import shutil
import subprocess
import sys
import time
import urllib.request

ROD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UD = os.path.join(ROD, 'assets', 'billeder')
PORT = 8797
SCENER = ['by', 'kro', 'opgave', 'fest', 'dialog']

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
                urllib.request.urlopen(f'http://127.0.0.1:{PORT}/spil/runeborg/', timeout=1)
                break
            except OSError:
                time.sleep(0.2)
        profil = os.path.join(ROD, '.chrome-foto')
        for scene in SCENER:
            ud = os.path.join(UD, f'runeborg-{scene}.png')
            subprocess.run([chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
                            f'--user-data-dir={profil}', '--window-size=1280,800', '--virtual-time-budget=9000',
                            f'--screenshot={ud}', f'http://127.0.0.1:{PORT}/spil/runeborg/#foto={scene}'],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=90)
            print('Lavet', os.path.relpath(ud, ROD))
        shutil.rmtree(profil, ignore_errors=True)
    finally:
        server.terminate()


if __name__ == '__main__':
    main()
