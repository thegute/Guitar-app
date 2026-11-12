#!/usr/bin/env python3
"""Make the phone copy of a rendered pack: Opus 48 kHz (transparent at 192 kbps stereo, ~1/6 of FLAC), duplicate takes
left out, pack.json rewritten to match. The FLAC masters stay on the Mac untouched.

  python3 export_pack.py ~/KGuitar-harvest/packs/agsj ~/KGuitar-harvest/phone/agsj [--kbps 192]

- Opus only runs at 48 kHz: 44.1 kHz masters are resampled with a polyphase filter (160/147), not a cheap one.
- "Round robins" that are really the same recording (correlation > 0.995 after aligning) are kept once: the app adds
  its own small variation to single-take layers (engine/packs.ts).
- Every mic stem of a kept take is exported, so stems stay take-for-take in step.
"""
import argparse, json, os, sys

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly


def same_take(a, b):
    n = min(len(a), len(b), 48000)
    if n < 2000:
        return False
    x, y = a[:n].mean(axis=1), b[:n].mean(axis=1)
    if not x.any() or not y.any():
        return False
    return float(np.corrcoef(x, y)[0, 1]) > 0.995


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('dst')
    ap.add_argument('--kbps', type=int, default=192)
    a = ap.parse_args()
    src, dst = os.path.expanduser(a.src), os.path.expanduser(a.dst)
    pack = json.load(open(os.path.join(src, 'pack.json')))
    stems = pack.get('stems') or [{'dir': '', 'gain': 1, 'mono': True}]
    sr_in = pack.get('sampleRate', 48000)
    up, down = (160, 147) if sr_in == 44100 else (1, 1)
    if sr_in not in (44100, 48000):
        sys.exit(f'unexpected sample rate {sr_in}')
    # libsndfile 1.2 Opus: compression_level 0 ≈ 520 kbps … 0.8 ≈ 115 kbps stereo, about linearly (measured)
    level = min(0.9, max(0.0, (517 - a.kbps) / 500))
    out = json.loads(json.dumps(pack))
    out['sampleRate'] = 48000
    out['phone'] = {'codec': 'opus', 'kbps': a.kbps, 'from': os.path.basename(src)}
    kept = dropped = 0
    for art, block in out['articulations'].items():
        for z in block['zones']:
            for layer in z['layers']:
                rr, ms, tune = layer['rr'], layer.get('ms', []), layer.get('tune', [])
                keep_idx, takes = [], []
                for k, rel in enumerate(rr):
                    x, _ = sf.read(os.path.join(src, rel), always_2d=True)
                    if any(same_take(x, t) for t in takes):
                        dropped += 1
                        continue
                    takes.append(x)
                    keep_idx.append(k)
                new_rr = []
                for k in keep_idx:
                    rel = rr[k]
                    orel = os.path.splitext(rel)[0] + '.ogg'
                    for st in stems:
                        pin = os.path.join(src, st['dir'], rel) if st['dir'] else os.path.join(src, rel)
                        pout = os.path.join(dst, st['dir'], orel) if st['dir'] else os.path.join(dst, orel)
                        if os.path.exists(pout):
                            continue
                        x, _ = sf.read(pin, always_2d=True, dtype='float32')
                        if up != down:
                            x = resample_poly(x, up, down, axis=0).astype(np.float32)
                        os.makedirs(os.path.dirname(pout), exist_ok=True)
                        sf.write(pout, np.clip(x, -1, 1), 48000, format='OGG', subtype='OPUS', compression_level=level)
                    new_rr.append(orel)
                    kept += 1
                layer['rr'] = new_rr
                if ms:
                    layer['ms'] = [ms[k] for k in keep_idx]
                if tune:
                    layer['tune'] = [tune[k] for k in keep_idx]
    os.makedirs(dst, exist_ok=True)
    with open(os.path.join(dst, 'pack.json'), 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    size = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(dst) for f in fs)
    print(f'{kept} takes kept, {dropped} duplicates left out, {size / 1e6:.0f} MB in {dst}')


if __name__ == '__main__':
    main()
