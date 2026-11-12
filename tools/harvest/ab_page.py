#!/usr/bin/env python3
"""Blind listening test page: every candidate's trial phrases, loudness-matched, under shuffled letters.

  python3 ab_page.py <trials dir> <out dir>      (trials/<candidate>/<phrase>.wav → out/index.html + out/*.wav)

Each phrase gets its own row of players (A, B, C … in a random order per phrase), all at the same loudness
(BS.1770 K-weighted, −20 LUFS) so the louder one doesn't win by being louder. "Show which is which" reveals the names.
The page and its files stay on the Mac (private renders). Open out/index.html in Safari.
"""
import html, json, os, random, sys

import numpy as np
import soundfile as sf
from scipy.signal import lfilter


def kweight(x, sr):
    f0, G, Q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
    K = np.tan(np.pi * f0 / sr)
    Vh, Vb = 10 ** (G / 20), (10 ** (G / 20)) ** 0.4996667741545416
    a0 = 1 + K / Q + K * K
    y = lfilter([(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0],
                [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0], x, axis=0)
    f0, Q = 38.13547087602444, 0.5003270373238773
    K = np.tan(np.pi * f0 / sr)
    a0 = 1 + K / Q + K * K
    return lfilter([1, -2, 1], [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0], y, axis=0)


def lufs(x, sr):
    """Integrated loudness with the BS.1770 gates (400 ms blocks, 75 % overlap)."""
    y = kweight(x, sr)
    n, h = int(0.4 * sr), int(0.1 * sr)
    ms = np.array([(y[i:i + n] ** 2).mean(axis=0).sum() for i in range(0, max(1, len(y) - n), h)])
    ms = ms[ms > 0]
    if not len(ms):
        return -99.0
    l = -0.691 + 10 * np.log10(ms)
    ms = ms[l > -70]
    rel = -0.691 + 10 * np.log10(ms.mean()) - 10
    ms = ms[(-0.691 + 10 * np.log10(ms)) > rel]
    return float(-0.691 + 10 * np.log10(ms.mean()))


LABELS = {'pick': 'Fingerpicking (C – Am – F – G)', 'strum': 'Strumming (G – C – D – Em)', 'lead': 'Single-note lick (hammer-on, pull-off, slide)'}


def main(src, out):
    os.makedirs(out, exist_ok=True)
    cands = sorted(d for d in os.listdir(src) if os.path.isdir(os.path.join(src, d)) and d != os.path.basename(out))
    rows = []
    rnd = random.Random()
    key = {}
    for ph in ['pick', 'strum', 'lead']:
        have = [c for c in cands if os.path.exists(os.path.join(src, c, ph + '.wav'))]
        if not have:
            continue
        rnd.shuffle(have)
        items = []
        for i, c in enumerate(have):
            x, sr = sf.read(os.path.join(src, c, ph + '.wav'), always_2d=True)
            if np.abs(x).max() < 1e-6:
                continue
            g = 10 ** ((-20 - lufs(x, sr)) / 20)
            y = np.clip(x * g, -1, 1)
            letter = chr(65 + i)
            name = f'{ph}-{letter}.wav'
            sf.write(os.path.join(out, name), y.astype(np.float32), sr, subtype='PCM_24')
            items.append((letter, name, c))
            key[f'{ph}-{letter}'] = c
        rows.append((ph, items))
    parts = []
    for ph, items in rows:
        cells = ''.join(f'<div class="c"><b>{l}</b><audio controls preload="auto" src="{n}"></audio><span class="who" hidden>{html.escape(c)}</span>'
                        f'<label><input type="radio" name="{ph}" value="{l}"> best</label></div>' for l, n, c in items)
        parts.append(f'<section><h2>{html.escape(LABELS.get(ph, ph))}</h2>{cells}</section>')
    page = f'''<!doctype html><meta charset="utf-8"><title>KGuitar listening test</title>
<style>body{{font:16px -apple-system,system-ui;background:#16121c;color:#eee;max-width:900px;margin:24px auto;padding:0 16px}}
section{{background:#241d2e;border-radius:12px;padding:12px 16px;margin:14px 0}}.c{{display:flex;gap:12px;align-items:center;margin:8px 0}}
.c b{{font-size:22px;width:24px}}audio{{flex:1}}.who{{color:#ffcc66}}button{{font-size:16px;padding:8px 14px;border-radius:8px}}</style>
<h1>Which sounds most like a real guitar?</h1>
<p>Same notes, same loudness, names hidden. Use headphones if you can. Pick the best in each row, then press the button.</p>
{''.join(parts)}
<p><button onclick="document.querySelectorAll('.who').forEach(e=>e.hidden=false);this.hidden=true">Show which is which</button></p>'''
    with open(os.path.join(out, 'index.html'), 'w') as f:
        f.write(page)
    with open(os.path.join(out, 'key.json'), 'w') as f:
        json.dump(key, f, indent=1)
    print('page:', os.path.join(out, 'index.html'), '·', sum(len(i) for _, i in rows), 'clips')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
