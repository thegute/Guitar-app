#!/usr/bin/env python3
"""Playbox chord sets → a private KGuitar data file (chordsets.json).

Reads the plain-text Kontakt arrays in Playbox's "Library Data" folder (Chords/*.nka + Chords_NAMES / KEYS / MODES /
CATEGORY.nka) and writes {"kind": "chordsets", "source": "playbox", "sets": [{name, key, mode, cat, chords}]}.
The data belongs to the owner's Playbox licence: the output is PRIVATE (his phone / ~/KGuitar-harvest), never the repo.

Usage: python3 playbox_chords.py "<Playbox Library>/Library Data" out/chordsets.json
"""
import json, os, sys

def nka(path):
    with open(path, encoding='utf-8', errors='replace') as f:
        lines = [l.rstrip('\r\n') for l in f]
    return lines[0], lines[1:]

def ints(xs):
    out = []
    for x in xs:
        x = x.strip()
        if x:
            out.append(int(x))
    return out

def chord_set(path):
    head, body = nka(path)
    v = ints(body)
    if not head.startswith('%chord_preset_array') or len(v) < 1 + 48 + 1:
        return None
    notes = v[1:49]
    n = v[49]
    chords = []
    for i in range(min(n, 8)):
        c = sorted(m for m in notes[i * 6:(i + 1) * 6] if m > 0)
        chords.append(c)
    return chords

def main(src, out):
    _, names = nka(os.path.join(src, 'Chords_NAMES.nka'))
    names = [n for n in names if n != '']
    keys = ints(nka(os.path.join(src, 'Chords_KEYS.nka'))[1])
    modes = ints(nka(os.path.join(src, 'Chords_MODES.nka'))[1])
    cats = [c for c in ints(nka(os.path.join(src, 'Chords_CATEGORY.nka'))[1])]
    sets = []
    for i, name in enumerate(names):
        p = os.path.join(src, 'Chords', name + '.nka')
        if not os.path.exists(p):
            continue
        chords = chord_set(p)
        if not chords or not any(chords):
            continue
        sets.append({'name': name, 'key': keys[i] if i < len(keys) else 0,
                     # Playbox's MODES array: 1 = major, 0 = minor (checked against the chords: Altadena = A minor, Ants = Bb major)
                     'mode': 'major' if (i < len(modes) and modes[i] == 1) else 'minor',
                     'cat': cats[i] if i < len(cats) else 0, 'chords': chords})
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out, 'w') as f:
        json.dump({'kind': 'chordsets', 'version': 1, 'source': 'playbox', 'sets': sets}, f, separators=(',', ':'))
    print(f'{len(sets)} chord sets → {out}')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
