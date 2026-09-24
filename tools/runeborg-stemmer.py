"""Læs Runeborgs replikker ind med Piper, så spillet kan læse dem op.

Finder alle replikker i spillets kode (g.say, g.ask, rygter, låste døre,
runestykker, vandprøver og opgavernes spørgsmål), indtaler dem med den
danske Piper-stemme og lægger dem som spil/runeborg/lyd/<nøgle>.mp3.
Hver person får sin egen klang: samme stemme, men med lidt forskellig
tonehøjde og tempo.

Kun nye eller ændrede replikker bliver indtalt; filer til replikker, der
ikke findes længere, bliver slettet. Så kør den bare igen efter hver
ændring i teksterne:

    python tools/runeborg-stemmer.py

Kræver: pip install piper-tts, stemmen da_DK-talesyntese-medium
(python -m piper.download_voices da_DK-talesyntese-medium) og ffmpeg.
Stemmen ledes efter i %LOCALAPPDATA%/piper-voices, eller hvor
RUNEBORG_STEMME peger hen.

clean() og fnv() SKAL svare til dem i spil/runeborg/js/voice.js.
"""
import json
import os
import re
import struct
import subprocess
import sys
import tempfile
import wave

ROD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPIL = os.path.join(ROD, 'spil', 'runeborg')
UD = os.path.join(SPIL, 'lyd')
STEMME = os.environ.get('RUNEBORG_STEMME') or os.path.join(
    os.environ.get('LOCALAPPDATA', os.path.expanduser('~')), 'piper-voices', 'da_DK-talesyntese-medium.onnx')

# Hver persons klang: (halvtoner op/ned, tempo — over 1 er langsommere)
PROFIL = {
    'fortaeller': (0, 1.05),
    'brynja': (-3, 1.05), 'mira': (1, 1.0), 'gorm': (-5, 1.1), 'karl': (-2, 1.05), 'agnete': (1, 1.05),
    'troels': (-3, 1.15), 'laerke': (2, 0.95), 'ugla': (1, 1.1), 'zara': (0, 0.97), 'aldrik': (-3, 1.05),
    'hilde': (-1, 1.12), 'ole': (-4, 1.12), 'sigrid': (4, 1.0), 'bodil': (1, 1.0), 'aksel': (4, 0.95),
    'durin': (-5, 1.05), 'liv': (2, 1.05), 'knud': (0, 0.95), 'bjorn': (-5, 1.1), 'esben': (-2, 1.0),
    'ulf': (-4, 1.05), 'baron': (-2, 1.12),
}

STR = r"'((?:[^'\\\n]|\\.)*)'"


def clean(s):
    s = re.sub(r'<br\s*/?>', ' ', s, flags=re.I)
    s = re.sub(r'<[^>]+>', '', s)
    s = s.replace('{navn}', 'lærling')
    s = re.sub(r'[«»"♪]', '', s)
    s = re.sub(r'\s*—\s*', ', ', s)
    return re.sub(r'\s+', ' ', s).strip()


def fnv(s):
    h = 0x811c9dc5
    data = s.encode('utf-16-le')
    for u in struct.unpack('<%dH' % (len(data) // 2), data):
        h ^= u
        h = (h * 0x01000193) & 0xffffffff
    return '%08x' % h


def unesc(s):
    return re.sub(r'\\(.)', r'\1', s)


def call_args(src, start):
    """Teksten mellem parenteserne i et kald, der starter ved src[start] == '('."""
    depth, i, q = 0, start, None
    while i < len(src):
        c = src[i]
        if q:
            if c == '\\':
                i += 2
                continue
            if c == q:
                q = None
        elif c in "'\"`":
            q = c
        elif c in '([{':
            depth += 1
        elif c in ')]}':
            depth -= 1
            if depth == 0:
                return src[start + 1:i]
        i += 1
    return ''


def split_top(args):
    """Del argumenterne ved kommaer på øverste niveau."""
    out, depth, cur, q, i = [], 0, '', None, 0
    while i < len(args):
        c = args[i]
        if q:
            cur += c
            if c == '\\':
                cur += args[i + 1]
                i += 2
                continue
            if c == q:
                q = None
        elif c in "'\"`":
            q = c
            cur += c
        elif c in '([{':
            depth += 1
            cur += c
        elif c in ')]}':
            depth -= 1
            cur += c
        elif c == ',' and depth == 0:
            out.append(cur)
            cur = ''
        else:
            cur += c
        i += 1
    if cur.strip():
        out.append(cur)
    return out


def speaker(arg):
    m = re.fullmatch(r"\s*'(\w+)'\s*", arg)
    return m.group(1) if m else 'fortaeller'


def lines():
    found = set()
    content = open(os.path.join(SPIL, 'js', 'content.js'), encoding='utf-8').read()
    game = open(os.path.join(SPIL, 'js', 'game.js'), encoding='utf-8').read()

    def spoken(expr):
        # alle tekststykker i et udtryk, der ligner sætninger (med mellemrum)
        return [unesc(s) for s in re.findall(STR, expr) if ' ' in s]

    for src in (content, game):
        for m in re.finditer(r'g\.(say|ask)\(', src):
            parts = split_top(call_args(src, m.end() - 1))
            if len(parts) < 2:
                continue
            who = speaker(parts[0])
            for t in spoken(parts[1]):
                found.add((who, t))
    for m in re.finditer(r"rumor\('\w+', '(\w+)', " + STR + r"\)", content):
        found.add((m.group(1), unesc(m.group(2))))
    block = content[content.index('var lockedDoors'):]
    block = block[:block.index('};')]
    for t in re.findall(r": " + STR, block):
        found.add(('fortaeller', unesc(t)))
    for title, t in re.findall(r"title: " + STR + r", t: " + STR, content):
        found.add(('fortaeller', 'Runestykke: ' + unesc(title) + '. ' + unesc(t)))
    for look in re.findall(r"takeSample\(g, '\w+', '[^']*', " + STR + r"\)", content):
        found.add(('fortaeller', 'Du fylder måleglasset. ' + unesc(look)))
    for q in re.findall(r"\bq: " + STR, content):
        found.add(('fortaeller', unesc(q)))
    # personer uden egen klang (fx Glød) bliver læst af fortælleren
    return sorted((w if w in PROFIL else 'fortaeller', t) for w, t in found)


def main():
    if not os.path.exists(STEMME):
        sys.exit('Fandt ikke stemmen: ' + STEMME)
    from piper import PiperVoice, SynthesisConfig
    os.makedirs(UD, exist_ok=True)
    wanted = {}
    for who, text in lines():
        c = clean(text)
        if c:
            wanted[fnv(who + '|' + c)] = (who, c)
    have = {f[:-4] for f in os.listdir(UD) if f.endswith('.mp3')}
    todo = [k for k in wanted if k not in have]
    print(f'{len(wanted)} replikker, {len(todo)} skal indtales')
    voice = PiperVoice.load(STEMME) if todo else None
    rate = voice.config.sample_rate if voice else 22050
    for n, k in enumerate(todo, 1):
        who, text = wanted[k]
        semi, speed = PROFIL[who]
        f = 2 ** (semi / 12)
        with tempfile.TemporaryDirectory() as tmp:
            wav = os.path.join(tmp, 'r.wav')
            with wave.open(wav, 'wb') as w:
                voice.synthesize_wav(text, w, syn_config=SynthesisConfig(length_scale=speed))
            af = f'asetrate={int(rate * f)},aresample={rate},atempo={1 / f:.4f},loudnorm=I=-17:TP=-2:LRA=9' if semi else 'loudnorm=I=-17:TP=-2:LRA=9'
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-af', af, '-ac', '1', '-ar', '22050',
                            '-c:a', 'libmp3lame', '-b:a', '40k', os.path.join(UD, k + '.mp3')], check=True)
        print(f'  {n}/{len(todo)} {who}: {text[:60]}', flush=True)
    for k in have - set(wanted):
        os.remove(os.path.join(UD, k + '.mp3'))
    with open(os.path.join(UD, 'stemmer.json'), 'w', encoding='utf-8') as fh:
        json.dump({'stemme': 'Piper da_DK-talesyntese-medium', 'keys': sorted(wanted)}, fh)
    print('Færdig:', len(wanted), 'filer i', os.path.relpath(UD, ROD))


if __name__ == '__main__':
    if '--vis' in sys.argv:
        for w, t in lines():
            print(w, '|', clean(t))
    else:
        main()
