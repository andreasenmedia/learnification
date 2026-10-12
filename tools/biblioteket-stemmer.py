"""Læs Eventyrbibliotekets replikker ind med Piper (Brynja, Mira, Poul og skiltene).

Samme værktøj som Runeborgs (tools/runeborg-stemmer.py) — det her peger det
bare på spil/biblioteket/ og giver Poul og Sigrid hver sin klang. Kør igen efter
hver ændring i spil/biblioteket/js/content.js, ellers bliver den replik stille:

    python tools/biblioteket-stemmer.py
"""
import importlib.util
import os
import sys

HER = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('runeborg_stemmer', os.path.join(HER, 'runeborg-stemmer.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

m.SPIL = os.path.join(m.ROD, 'spil', 'biblioteket')
m.UD = os.path.join(m.SPIL, 'lyd')
m.PROFIL.update({'poul': (-4, 1.1), 'bygge': (2, 1.0)})

if __name__ == '__main__':
    if '--vis' in sys.argv:
        for w, t in m.lines():
            print(w, '|', m.clean(t))
    else:
        m.main()
