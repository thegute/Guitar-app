#!/usr/bin/env python3
"""Re-amp a DI pack through an amp plug-in (Neural DSP Archetypes …) into a new pack: single notes, and whole chords made
by ADDING the DI strings first (a pickup sums the strings linearly) and only then going through the amp, so every chord
distorts like a real chord does (intermodulation), not like a pile of separately distorted notes.

  python3 reamp_pack.py <tone.json> <DI pack dir> <out packs dir>

tone.json: {"id", "name", "plugin", "params": {...}, "inputDb": -8, "chords": true, "power": true}
- The DI is levelled once per pack so a hard-picked note peaks at `inputDb` dBFS (what an amp sim expects from a real
  guitar; too hot or too quiet would change how much it distorts).
- Each note runs through the amp on its own (reset between notes) with a 30 ms lead-in of silence, so no tail leaks.
- Time effects (reverb, delay, doubler) must be OFF in params: KGuitar adds the room live.
"""
import json, os, sys

import numpy as np
import soundfile as sf
from pedalboard import load_plugin

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render import kweight_ms, trim  # noqa: E402

LEAD = 0.03


def main(tone_path, di_dir, out_root):
    tone = json.load(open(tone_path))
    di = json.load(open(os.path.join(di_dir, 'pack.json')))
    sr = di['sampleRate']
    amp = load_plugin(os.path.expanduser(tone['plugin']))
    for k, v in (tone.get('params') or {}).items():
        setattr(amp, k, v)
    out_dir = os.path.join(out_root, tone['id'])
    os.makedirs(out_dir, exist_ok=True)

    # the DI's level: the loudest velocity layer's peak, median over the pack → scale to inputDb
    peaks = []
    for z in di['articulations']['sustain']['zones']:
        top = max(z['layers'], key=lambda l: l['velocity'])
        x, _ = sf.read(os.path.join(di_dir, top['rr'][0]), always_2d=True)
        peaks.append(np.abs(x).max())
    gain = 10 ** (tone.get('inputDb', -8) / 20) / float(np.median(peaks))
    print(f'DI gain {20 * np.log10(gain):+.1f} dB')

    def run(x):
        pad = np.zeros((int(LEAD * sr), x.shape[1]), dtype=np.float32)
        y = amp(np.concatenate([pad, x * gain]).T.astype(np.float32), sr, reset=True).T
        return y[len(pad):]

    pack = json.loads(json.dumps(di))
    pack.update({'id': tone['id'], 'name': tone['name'], 'renderedWith': {'di': di['id'], 'amp': tone['plugin'], 'params': tone.get('params', {})}})
    pack.pop('stems', None)
    made = 0
    for art, block in pack['articulations'].items():
        for z in block['zones']:
            for layer in z['layers']:
                ms = []
                for rel in layer['rr']:
                    pth = os.path.join(out_dir, rel)
                    x, _ = sf.read(os.path.join(di_dir, rel), always_2d=True, dtype='float32')
                    if not os.path.exists(pth):
                        y = run(x)
                        os.makedirs(os.path.dirname(pth), exist_ok=True)
                        sf.write(pth, y.astype(np.float32), sr, subtype='PCM_24')
                        made += 1
                    else:
                        y, _ = sf.read(pth, always_2d=True)
                    ms.append(kweight_ms(y, sr))
                layer['ms'] = ms
        print(f'{art}: {made} notes so far', flush=True)

    # whole chords: DI strings added with KGuitar's strum timing, then the amp
    if tone.get('chords', True):
        zones = {(z['string'], z['fret']): z for z in di['articulations']['sustain']['zones']}
        shapes = chord_shapes(tone)
        cz = []
        for name, frets in shapes:
            for vi, layer_v in enumerate(sorted({l['velocity'] for z in zones.values() for l in z['layers']})):
                for down in (True, False):
                    key = f'{name}{"d" if down else "u"}v{layer_v:03d}'
                    rel = f'chord/{key}.flac'
                    pth = os.path.join(out_dir, rel)
                    strings = [(s, f) for s, f in enumerate(frets) if f >= 0]
                    if not down:
                        strings = list(reversed(strings))[:4]
                    if not os.path.exists(pth):
                        mix = None
                        for k, (s, f) in enumerate(strings):
                            z = zones.get((s, f))
                            if not z:
                                continue
                            l = next(l for l in z['layers'] if l['velocity'] == layer_v)
                            x, _ = sf.read(os.path.join(di_dir, l['rr'][(k + vi) % len(l['rr'])]), always_2d=True, dtype='float32')
                            off = int((0.004 + 0.007 * k) * sr * (0.85 if not down else 1))
                            x = np.concatenate([np.zeros((off, x.shape[1]), dtype=np.float32), x * (1 - 0.18 * k / max(1, len(strings) - 1))])
                            mix = x if mix is None else _add(mix, x)
                        if mix is None:
                            continue
                        y = run(mix)
                        t, _ = trim(y.astype(np.float64), sr)
                        os.makedirs(os.path.dirname(pth), exist_ok=True)
                        sf.write(pth, t.astype(np.float32), sr, subtype='PCM_24')
                    lo = min(di['tuning'][s] + f for s, f in strings)
                    played = {s for s, _ in strings}
                    # the shape as recorded (an upstroke only catches the top four strings)
                    rec = [f if s in played else -1 for s, f in enumerate(frets)]
                    cz.append({'key': key, 'chord': name, 'root': lo, 'lo': lo, 'hi': lo, 'up': not down,
                               'frets': rec, 'layers': [{'velocity': layer_v, 'rr': [rel]}]})
        pack['articulations']['strumDown'] = {'zones': [z for z in cz if not z['up']]}
        pack['articulations']['strumUp'] = {'zones': [z for z in cz if z['up']]}
    mss = [m for a in pack['articulations'].values() for z in a['zones'] for l in z['layers'] for m in l.get('ms', [])]
    if mss:
        pack['loudness'] = {'lufs': round(-0.691 + 10 * np.log10(np.median(mss)), 2)}
    with open(os.path.join(out_dir, 'pack.json'), 'w') as f:
        json.dump(pack, f, indent=1)
    print(f'done: {made} notes + chords in {out_dir}')


def _add(a, b):
    n = max(len(a), len(b))
    out = np.zeros((n, a.shape[1]), dtype=np.float32)
    out[: len(a)] += a
    out[: len(b)] += b
    return out


def chord_shapes(tone):
    """The chords a rhythm part really uses on this kind of tone: power chords for drive, open + barre shapes for clean."""
    shapes = []
    if tone.get('power', True):
        # root on the low E (frets 0–12) and on the A (0–12): R-5-8
        for f in range(0, 13):
            shapes.append((f'5E{f}', [f, f + 2, f + 2, -1, -1, -1]))
            shapes.append((f'5A{f}', [-1, f, f + 2, f + 2, -1, -1]))
    if tone.get('open', True):
        opens = {'C': [-1, 3, 2, 0, 1, 0], 'A': [-1, 0, 2, 2, 2, 0], 'G': [3, 2, 0, 0, 0, 3], 'E': [0, 2, 2, 1, 0, 0],
                 'D': [-1, -1, 0, 2, 3, 2], 'Am': [-1, 0, 2, 2, 1, 0], 'Em': [0, 2, 2, 0, 0, 0], 'Dm': [-1, -1, 0, 2, 3, 1]}
        shapes += list(opens.items())
    return shapes


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3])
