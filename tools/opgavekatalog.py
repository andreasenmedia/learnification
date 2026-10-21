#!/usr/bin/env python3
"""Laver api/opgavekatalog.json: alle Runeborg-opgaver (nøgle, område, type, spørgsmål).

Lærervisningen ("Elevernes læring") bruger den til at vise, hvilke opgaver tallene
bygger på — Runeborg gemmer kun nøglen på de løste opgaver, ikke spørgsmålet.
Kør igen, når der kommer nye opgaver i spil/runeborg/js.
"""
import json
import re
from pathlib import Path

ROD = Path(__file__).resolve().parent.parent
JS = ROD / 'spil' / 'runeborg' / 'js'

# g.task('q1a', { type: 'pick', area: AREA.find, ... q: '...'
KALD = re.compile(
    r"g\.task\(\s*'(?P<nogle>[A-Za-z0-9_]+)'\s*,\s*\{\s*type:\s*'(?P<type>\w+)'\s*,\s*area:\s*(?:K0\.)?(?:AREA|AR)\.(?P<omr>\w+)"
    r"(?P<hale>.*?)\bq:\s*(?P<q>'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\")",
    re.S)


def afcitér(s: str) -> str:
    return re.sub(r'\\(.)', r'\1', s[1:-1])


OMR = re.compile(r"^\s+(\w+):\s*'([^']+)'", re.M)               # iagttag: 'Naturfag · Se og tro'
KAN = re.compile(r"\[\s*'(\w+)'\s*,\s*'([^']+)'\s*(?:,\s*\d+\s*)?\]")  # ['find', 'finde præcis ...']


def omraader(tekst: str) -> dict[str, str]:
    """Områdenavnene: AREA i content.js og A = {...} i kapitel2/3."""
    ud: dict[str, str] = {}
    for blok in re.finditer(r"var (?:AREA|A) = \{(.*?)\};", tekst, re.S):
        for m in OMR.finditer(blok.group(1)):
            ud[m.group(1)] = m.group(2)
    return ud


def main() -> None:
    katalog: dict[str, dict] = {}
    omr: dict[str, str] = {}
    kan: dict[str, str] = {}
    for fil in sorted(JS.glob('*.js')):
        tekst = fil.read_text(encoding='utf-8')
        omr.update(omraader(tekst))
        for m in KAN.finditer(tekst):
            kan.setdefault(m.group(1), m.group(2))
        for m in KALD.finditer(tekst):
            # Spørgsmålet skal høre til netop dette kald og ikke til det næste
            if "g.task(" in m.group('hale'):
                continue
            katalog[m.group('nogle')] = {
                'omraade': m.group('omr'),
                'type': m.group('type'),
                'q': afcitér(m.group('q')),
            }
    ud = ROD / 'api' / 'opgavekatalog.json'
    ud.write_text(json.dumps({'omraader': {k: {'navn': v, 'kan': kan.get(k, '') if len(kan.get(k, '')) > 12 else ''} for k, v in omr.items()}, 'opgaver': katalog}, ensure_ascii=False, indent=1), encoding='utf-8')
    antal = tekst_antal = sum(len(re.findall(r"g\.task\(\s*'", f.read_text(encoding='utf-8'))) for f in JS.glob('*.js'))
    print(f'{len(omr)} områder, {len(katalog)} opgaver skrevet til {ud} (g.task-kald i alt: {antal})')


if __name__ == '__main__':
    main()
