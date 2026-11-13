"""Training batches for tab_crnn: made-up strips drawn on the fly (synth.py) mixed with real labelled strips (crop.py),
both damaged at random; the labels turned into per-step targets."""
import json
import math
import os
import random

import numpy as np
import torch
from PIL import Image

import synth
from model import SLOTS, TUPS

STEP = 4
IGN = -100


def targets(cols, nstr, W, rhythm):
    """columns → per-step targets for a strip W px wide"""
    T = W // STEP
    heat = np.zeros((3, T), np.float32)
    off = np.zeros(T, np.float32)
    offm = np.zeros(T, np.float32)
    frets = np.full((SLOTS, T), IGN, np.int64)
    dur = np.full(T, IGN, np.int64)
    dots = np.full(T, IGN, np.int64)
    tup = np.full(T, IGN, np.int64)
    grace = np.full(T, IGN, np.int64)
    stroke = np.full(T, IGN, np.int64)
    ts = np.arange(T)
    for c in cols:
        x = c['x']
        if x < 0 or x >= W:
            continue
        u = x / STEP
        t = int(u)
        k = {'note': 0, 'bar': 1, 'rest': 2}[c['kind']]
        heat[k] = np.maximum(heat[k], np.exp(-((ts + 0.5 - u) ** 2) / 2))
        off[t] = u - t - 0.5
        offm[t] = 1
        if c['kind'] == 'bar':
            continue
        for tt in (t - 1, t, t + 1):
            if not 0 <= tt < T:
                continue
            fr = frets[:, tt]
            if tt == t or fr[0] == IGN:
                for s in range(SLOTS):
                    if s >= nstr:
                        fr[s] = IGN
                        continue
                    v = c['frets'].get(s, c['frets'].get(str(s)))
                    fr[s] = 0 if v is None else 26 if v == 'x' else 1 + int(v)
            grace[tt] = c.get('grace', 0)
            stroke[tt] = c.get('stroke', 0)
            if c.get('grace'):
                continue
            if c['dur'] is not None:
                dur[tt] = c['dur']
                dots[tt] = min(2, c['dots'])
                tup[tt] = TUPS.index(c['tup']) if c['tup'] in TUPS else 0
            elif not rhythm:
                dur[tt] = 6  # no rhythm printed on this strip
    return dict(heat=heat, off=off, offm=offm, frets=frets, dur=dur, dots=dots, tup=tup, grace=grace, stroke=stroke)


class Mixed(torch.utils.data.IterableDataset):
    """Endless strips: `real` of them from labelled pages, the rest drawn fresh."""

    def __init__(self, strips_dir=None, real=0.4, W=512, seed=0):
        self.W, self.real, self.seed = W, real, seed
        self.items = []
        if strips_dir and os.path.exists(os.path.join(strips_dir, 'labels.jsonl')):
            self.dir = strips_dir
            self.items = [json.loads(l) for l in open(os.path.join(strips_dir, 'labels.jsonl'))]
        self.cache = {}

    def real_strip(self, rng):
        e = rng.choice(self.items)
        img = self.cache.get(e['file'])
        if img is None:
            img = Image.open(os.path.join(self.dir, e['file'])).convert('L')
            if len(self.cache) < 4000:
                self.cache[e['file']] = img
        W = self.W
        # a little zoom and a little up / down (the straightening is never exact)
        z = rng.uniform(0.96, 1.04)  # the outer lines move at most ~1.5 px
        dy = rng.uniform(-1.5, 1.5)
        im = img.resize((int(img.width * z), int(160 * z)), Image.BILINEAR)
        # zoomed round the middle row of the staff (y = 79.5), then nudged
        top = round(79.5 * z - 79.5 + dy)
        x0 = rng.uniform(0, max(0, im.width - W))
        canvas = Image.new('L', (W, 160), 255)
        canvas.paste(im, (-int(x0), -top))
        cols = []
        for c in e['cols']:
            c2 = dict(c)
            c2['x'] = c['x'] * z - int(x0)
            cols.append(c2)
        if rng.random() < 0.7:
            canvas = synth.degrade(canvas, rng)
        return np.asarray(canvas, np.uint8), cols, e['nstr'], e['rhythm']

    def __iter__(self):
        info = torch.utils.data.get_worker_info()
        rng = random.Random(self.seed * 1000 + (info.id if info else 0) + random.randrange(1 << 20))
        while True:
            if self.items and rng.random() < self.real:
                a, cols, nstr, rhythm = self.real_strip(rng)
            else:
                a, cols, nstr = synth.sample(rng, self.W)
                rhythm = any(c['dur'] is not None for c in cols if c['kind'] == 'note' and not c['grace'])
            x = torch.from_numpy(a.astype(np.float32) / 255.0)[None]
            yield x, {k: torch.from_numpy(v) for k, v in targets(cols, nstr, self.W, rhythm).items()}


class Fixed(torch.utils.data.Dataset):
    """Labelled strips read whole (for measuring): one at a time, any width."""

    def __init__(self, strips_dir):
        self.dir = strips_dir
        self.items = [json.loads(l) for l in open(os.path.join(strips_dir, 'labels.jsonl'))]

    def __len__(self):
        return len(self.items)

    def __getitem__(self, i):
        e = self.items[i]
        img = Image.open(os.path.join(self.dir, e['file'])).convert('L')
        W = int(math.ceil(img.width / 16) * 16)
        canvas = Image.new('L', (W, 160), 255)
        canvas.paste(img, (0, 0))
        return torch.from_numpy(np.asarray(canvas, np.float32) / 255.0)[None], e
