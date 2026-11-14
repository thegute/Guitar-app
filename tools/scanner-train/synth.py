"""Synthetic tab strips for training KGuitar's picture reader (tab_crnn).

Every strip is drawn in the reader's own frame: 160 px tall, the string lines at y = 42 + 15·s (s = 0 is the TOP line,
the highest string), so a real picture only has to be straightened ("dewarped") onto the same rows before reading.
Above the staff (0–42): pick strokes ⊓ / V, words, chord names, bends. Below it (≈125–160): the rhythm under the tab
(stems, beams, flags, dots, tuplet 3s) the way Guitar Pro / Songsterr print it.

sample(rng, W) → (image uint8 [160, W], columns) where columns = list of dicts:
  x (px, centre), kind 'note' | 'rest' | 'bar', frets {slot: fret | 'x'}, dur (0 whole … 5 32nd, None = no rhythm
  printed), dots, tup (0 none, 3, 5, 6, 7), grace, stroke (0 none, 1 down, 2 up)
Everything here is made up: random frets and rhythms, no songs.
"""
import glob
import io
import math
import os
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

H = 160
GAP = 15
TOP = 42
SS = 3  # draw 3× bigger, then shrink (smooth edges, thin lines)

_FONTS = None


def fonts():
    """Every font on this computer that draws digits (Mac: /System/Library/Fonts, /Library/Fonts; Linux: /usr/share/fonts)."""
    global _FONTS
    if _FONTS is not None:
        return _FONTS
    dirs = ['/System/Library/Fonts', '/System/Library/Fonts/Supplemental', '/Library/Fonts', os.path.expanduser('~/Library/Fonts'),
            '/usr/share/fonts']
    found = []
    for d in dirs:
        for ext in ('ttf', 'otf', 'ttc'):
            found += glob.glob(f'{d}/**/*.{ext}', recursive=True)
    skip = ('emoji', 'symbol', 'webdings', 'wingding', 'zapf', 'bravura', 'math', 'braille', 'lastresort', 'keyboard', 'apple color')
    ok = []
    for f in sorted(set(found)):
        if any(s in f.lower() for s in skip):
            continue
        try:
            ft = ImageFont.truetype(f, 40)
            b = [ft.getbbox(c) for c in '0123456789']
            if any(bb[2] - bb[0] < 6 or bb[3] - bb[1] < 15 for bb in b):
                continue
            if len({ft.getmask(c).getbbox() for c in '0168'}) < 3 and len({bytes(ft.getmask(c)) for c in '0168'}) < 4:
                continue
            ok.append(f)
        except Exception:
            pass
    # tab software mostly prints in a plain sans: weight those more
    plain = [f for f in ok if any(k in os.path.basename(f).lower() for k in ('arial', 'helvetica', 'liberationsans', 'dejavusans', 'inter', 'freesans', 'roboto', 'opensans', 'lato', 'verdana', 'tahoma', 'sf'))]
    _FONTS = ok + plain * 3
    return _FONTS


def font(path, px):
    return ImageFont.truetype(path, max(6, int(px)))


DUR = [4.0, 2.0, 1.0, 0.5, 0.25, 0.125]  # whole … 32nd, in quarters


def bar_rhythm(rng, beats):
    """A bar's note lengths (quarters) as (dur index, dots, tuplet) with the sum = beats."""
    out = []
    left = beats
    while left > 1e-6:
        r = rng.random()
        if r < 0.10 and left >= 3 - 1e-6:
            out.append((1, 1, 0)); left -= 3  # dotted half
        elif r < 0.17 and left >= 2 - 1e-6:
            out.append((1, 0, 0)); left -= 2
        elif r < 0.33 and left >= 1 - 1e-6:
            out.append((2, 0, 0)); left -= 1
        elif r < 0.43 and left >= 1 - 1e-6:
            # a triplet of eighths (or a sextuplet of 16ths)
            if rng.random() < 0.7:
                out += [(3, 0, 3)] * 3
            else:
                out += [(4, 0, 6)] * 6
            left -= 1
        elif r < 0.50 and left >= 1.5 - 1e-6:
            out.append((2, 1, 0)); left -= 1.5  # dotted quarter
        elif r < 0.58 and left >= 1 - 1e-6:
            out += [(3, 1, 0), (4, 0, 0)]; left -= 1  # dotted eighth + 16th
        elif r < 0.78 and left >= 1 - 1e-6:
            out += [(4, 0, 0)] * 4; left -= 1
        elif r < 0.84 and left >= 0.5 - 1e-6:
            out += [(5, 0, 0)] * 4; left -= 0.5
        elif left >= 0.5 - 1e-6:
            out.append((3, 0, 0)); left -= 0.5
        else:
            out.append((4, 0, 0)); left -= 0.25
        if len(out) > 40:
            break
    return out


def bar_rhythm_compound(rng, beats):
    """6/8, 9/8, 12/8: beats of a dotted quarter, eighths beamed in threes (NOT triplets: no 3 printed)"""
    out = []
    for _ in range(int(round(beats / 1.5))):
        r = rng.random()
        if r < 0.45:
            out += [(3, 0, 0)] * 3
        elif r < 0.6:
            out.append((2, 1, 0))
        elif r < 0.75:
            out += [(2, 0, 0), (3, 0, 0)]
        elif r < 0.88:
            out += [(4, 0, 0), (4, 0, 0), (3, 0, 0), (3, 0, 0)]
        else:
            out += [(3, 0, 0), (2, 0, 0)]
    return out


def length(d):
    dur, dots, tup = d
    v = DUR[dur] * (1.5 if dots == 1 else 1.75 if dots == 2 else 1)
    if tup:
        v *= 2 ** math.floor(math.log2(tup)) / tup
    return v


def chord(rng, nstr):
    """Which strings sound and on which frets: mostly single notes, some double stops and chords."""
    r = rng.random()
    k = 1 if r < 0.58 else 2 if r < 0.72 else rng.randint(3, nstr)
    pos = rng.choice([0, 0, rng.randint(0, 5), rng.randint(0, 5), rng.randint(3, 12), rng.randint(3, 12), rng.randint(5, 17), rng.randint(10, 24)])
    strings = rng.sample(range(nstr), k) if k < nstr else list(range(nstr))
    if k >= 3 and rng.random() < 0.5:
        lo = rng.randint(0, nstr - k)
        strings = list(range(lo, lo + k))
    frets = {}
    xr = 0.04 if k < 3 else rng.choice([0.04, 0.04, 0.2])  # muted strings inside chords (6/X/4 power chords)
    for s in strings:
        if rng.random() < xr:
            frets[s] = 'x'
        else:
            frets[s] = max(0, min(24, pos + rng.randint(-2, 3) if pos else rng.choice([0, 0, 1, 2, 3])))
    return frets


def sample(rng=random, W=512, nstr=None):
    nstr = nstr or (6 if rng.random() < 0.82 else 4)
    S = SS
    bg = rng.randint(225, 255)
    ink = rng.randint(0, 70)
    img = Image.new('L', (W * S, H * S), bg)
    d = ImageDraw.Draw(img)
    fpath = rng.choice(fonts())
    fsize = rng.uniform(0.62, 0.98) * GAP * S * 1.25  # cap height ≈ 0.6–0.9 of a gap
    if rng.random() < 0.15:  # big bold video fonts: numbers taller than the gap, stacked ones touching (Everlong Short)
        fsize = rng.uniform(0.98, 1.25) * GAP * S * 1.25
    fnt = font(fpath, fsize)
    small = font(fpath, fsize * 0.7)
    lw = rng.uniform(0.45, 2.2) * S
    halo = rng.random() < 0.7
    # string lines (a little bend and jitter: the straightening is never perfect)
    amp = rng.uniform(0, 1.3) * S if rng.random() < 0.4 else 0
    ph, fr = rng.uniform(0, 6.28), rng.uniform(0.5, 2.5)
    jit = [rng.uniform(-0.9, 0.9) * S for _ in range(nstr)]
    ys = lambda s, x: (TOP + GAP * s) * S + jit[s] + amp * math.sin(ph + fr * x / (W * S) * 6.28)
    x_start = rng.choice([0, 0, rng.uniform(0, 40)]) * S
    x_end = W * S if rng.random() < 0.85 else rng.uniform(0.6, 1.0) * W * S
    line_ink = rng.randint(ink, min(200, ink + 120))
    for s in range(nstr):
        pts = [(x, ys(s, x)) for x in np.linspace(x_start, x_end, 24)]
        d.line(pts, fill=line_ink, width=max(1, int(round(lw))))
    bottom = lambda x: ys(nstr - 1, x)
    cols = []
    rhythm = rng.random() < 0.75
    stem_full = rng.uniform(0.9, 1.6) * GAP * S
    stem_top_off = rng.uniform(0.3, 0.7) * GAP * S
    stem_w = max(1, int(rng.uniform(0.6, 1.6) * S))
    beam_h = rng.uniform(0.18, 0.4) * GAP * S
    spacing = rng.uniform(1.8, 4.2) * GAP * S
    min_dx = fnt.getbbox('22')[2] * rng.uniform(1.25, 1.7)  # numbers never touch
    prop = rng.random() < 0.8
    x = x_start + rng.uniform(0.6, 2.5) * GAP * S
    # sometimes the string names at the start ("E B G D A E"), not notes
    if rng.random() < 0.15:
        nm = font(fpath, fsize * rng.uniform(0.7, 1.0))
        names = rng.choice([['e', 'B', 'G', 'D', 'A', 'E'], ['E', 'B', 'G', 'D', 'A', 'E'], ['D', 'A', 'F', 'C', 'G', 'C'], ['A', 'E', 'C', 'G']])[:nstr]
        for s_, ch in enumerate(names):
            d.text((x - GAP * S * 0.9, ys(s_, x)), ch, font=nm, fill=ink, anchor='mm')
        x += GAP * S * 0.6
    # sometimes a time signature or "TAB" at the start
    if rng.random() < 0.3:
        big = font(fpath, GAP * S * 2.2)
        for k, ch in enumerate(rng.choice(['44', '34', '68', '78', '24', 'TA'])):
            d.text((x, ys(0, x) + (k * 2 - 0.2) * GAP * S * (nstr - 1) / 4), ch, font=big, fill=ink, anchor='lt')
        x += GAP * S * 2.4
    compound = rng.random() < 0.22
    meter = rng.choice([3, 4.5, 6, 6]) if compound else rng.choice([4, 4, 4, 3, 2, 3.5, 3])
    beam_unit = 1.5 if compound else 1.0
    while x < x_end - GAP * S:
        bar = bar_rhythm_compound(rng, meter) if compound else bar_rhythm(rng, meter)
        beat_t = 0.0
        group = []  # columns in the current beam group
        for b in bar:
            if x >= x_end - GAP * S * 0.8:
                break
            L = length(b)
            col = {'x': x, 'kind': 'note', 'frets': {}, 'dur': b[0] if rhythm else None, 'dots': b[1] if rhythm else 0,
                   'tup': b[2] if rhythm else 0, 'grace': 0, 'stroke': 0}
            if rng.random() < 0.1:
                col['kind'] = 'rest'
            else:
                col['frets'] = chord(rng, nstr)
            # a grace note just before, sometimes
            if col['kind'] == 'note' and rng.random() < 0.035 and cols and x - cols[-1]['x'] > GAP * S * 1.8:
                gx = x - rng.uniform(0.7, 1.2) * GAP * S
                s0 = next(iter(col['frets']))
                gf = rng.randint(0, 15)
                draw_num(d, gx, ys(s0, gx), str(gf), small, ink, bg, halo)
                cols.append({'x': gx, 'kind': 'note', 'frets': {s0: gf}, 'dur': None, 'dots': 0, 'tup': 0, 'grace': 1, 'stroke': 0})
            if col['kind'] == 'note':
                for s, f in col['frets'].items():
                    draw_num(d, x, ys(s, x), 'X' if f == 'x' and rng.random() < 0.5 else 'x' if f == 'x' else str(f), fnt, ink, bg, halo)
                    if rng.random() < 0.05 and f != 'x':  # a slide line / tie off to the right
                        d.line([(x + fsize * 0.5, ys(s, x) + GAP * S * 0.2), (x + fsize * 1.1, ys(s, x) - GAP * S * 0.2)], fill=ink, width=max(1, int(S * 0.8)))
            else:
                draw_rest(d, rng, x, ys(0, x), ys(nstr - 1, x), b[0], ink, S)
            if rng.random() < 0.08 and col['kind'] == 'note':
                col['stroke'] = rng.choice([1, 2])
                draw_stroke(d, x, ys(0, x) - rng.uniform(0.9, 1.6) * GAP * S, col['stroke'], ink, S)
            if rhythm and col['kind'] == 'note':
                yb = bottom(x) + stem_top_off
                short = b[0] <= 1
                if b[0] >= 1:
                    d.line([(x, yb), (x, yb + (stem_full * 0.5 if short else stem_full))], fill=ink, width=stem_w)
                if b[1]:
                    r = S * 0.9
                    cx, cy = x + GAP * S * 0.35, yb + stem_full * (0.3 if short else 0.5)
                    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=ink)
                if b[0] >= 3:
                    group.append((x, b[0], yb + stem_full, b[2]))
                else:
                    finish_group(d, rng, group, ink, beam_h, S, small)
                    group = []
            else:
                finish_group(d, rng, group, ink, beam_h, S, small)
                group = []
            cols.append(col)
            beat_t += L
            if rhythm and abs(beat_t / beam_unit - round(beat_t / beam_unit)) < 1e-6:
                finish_group(d, rng, group, ink, beam_h, S, small)
                group = []
            x += max(min_dx, (spacing * (L ** 0.65) if prop else spacing * 0.7) * rng.uniform(0.92, 1.08))
        finish_group(d, rng, group, ink, beam_h, S, small)
        if x >= x_end - GAP * S * 0.8:
            break
        bx = x - spacing * 0.35
        d.line([(bx, ys(0, bx)), (bx, ys(nstr - 1, bx))], fill=line_ink, width=max(1, int(round(lw * rng.uniform(1, 1.6)))))
        cols.append({'x': bx, 'kind': 'bar', 'frets': {}, 'dur': None, 'dots': 0, 'tup': 0, 'grace': 0, 'stroke': 0})
        x += rng.uniform(0.5, 1.4) * GAP * S
    clutter(d, rng, W * S, ys, nstr, ink, fpath, S)
    img = img.resize((W, H), Image.LANCZOS)
    for c in cols:
        c['x'] /= S
    img = degrade(img, rng)
    return np.asarray(img, dtype=np.uint8), cols, nstr


def draw_num(d, x, y, txt, fnt, ink, bg, halo):
    bb = d.textbbox((x, y), txt, font=fnt, anchor='mm')
    if halo:
        pad = (bb[3] - bb[1]) * 0.12
        d.rectangle([bb[0] - pad, bb[1] - pad, bb[2] + pad, bb[3] + pad], fill=bg)
    d.text((x, y), txt, font=fnt, fill=ink, anchor='mm')


def draw_rest(d, rng, x, top, bot, kind, ink, S):
    mid = (top + bot) / 2 + rng.uniform(-0.6, 0.6) * (bot - top) / 5
    g = (bot - top) / 5
    bold = rng.random() < 0.55  # music-font rests (Songsterr, Guitar Pro): heavy, about as thick as a digit's stroke
    if kind <= 1:  # whole / half: a box on a line
        y = mid - g * 0.5 if kind == 0 else mid
        w = g * (rng.uniform(0.5, 0.65) if bold else 0.6)
        d.rectangle([x - w, y - g * (0.5 if bold else 0.45), x + w, y], fill=ink)
    elif kind == 2:  # quarter: a zigzag
        if bold:
            h = g * rng.uniform(1.7, 2.6)
            t = mid - h / 2
            lw = max(2, int(g * rng.uniform(0.3, 0.5)))
            pts = [(x - g * 0.25, t), (x + g * 0.3, t + h * 0.32), (x - g * 0.15, t + h * 0.55), (x + g * 0.25, t + h * 0.8)]
            d.line(pts, fill=ink, width=lw, joint='curve')
            # the hook at the foot, curling back to the left
            d.arc([x - g * 0.45, t + h * 0.72, x + g * 0.3, t + h * 1.02], 60, 250, fill=ink, width=max(1, int(lw * 0.7)))
        else:
            pts = [(x - g * 0.2, mid - g * 1.4), (x + g * 0.3, mid - g * 0.6), (x - g * 0.2, mid), (x + g * 0.3, mid + g * 0.7), (x - g * 0.1, mid + g * 1.2)]
            d.line(pts, fill=ink, width=max(1, int(g * 0.35)))
    else:  # eighth … 32nd: a slanted stem with 1–3 hooks
        n = kind - 2
        r = g * (rng.uniform(0.22, 0.32) if bold else 0.2)
        d.line([(x + g * 0.4, mid - g * 0.9), (x - g * 0.1, mid + g * (0.6 + 0.5 * n))], fill=ink, width=max(1, int(S * (rng.uniform(1.2, 2.0) if bold else 0.9))))
        for k in range(n):
            cy = mid - g * 0.9 + k * g * 0.6
            d.ellipse([x - g * 0.25 - r, cy - r, x - g * 0.25 + r, cy + r], fill=ink)
            d.line([(x - g * 0.25, cy), (x + g * 0.4 - k * g * 0.15, cy - g * 0.1)], fill=ink, width=max(1, int(S * (1.2 if bold else 0.7))))


def draw_stroke(d, x, y, kind, ink, S):
    w = GAP * S * 0.45
    if kind == 1:  # ⊓ down-strum
        d.line([(x - w, y + w), (x - w, y), (x + w, y), (x + w, y + w)], fill=ink, width=max(1, int(S * 1.3)))
        d.rectangle([x - w, y - S * 0.6, x + w, y + S * 0.6], fill=ink)
    else:  # V up-strum
        d.line([(x - w * 0.8, y), (x, y + w * 1.4), (x + w * 0.8, y)], fill=ink, width=max(1, int(S * 1.1)))


def finish_group(d, rng, group, ink, beam_h, S, small):
    """Beams across a group of eighths and shorter (one per level), or a flag on a lone note; a 3 under triplets."""
    if not group:
        return
    if len(group) == 1:
        x, lvl, ye, tup = group[0]
        for k in range(lvl - 2):
            yy = ye - k * beam_h * 1.8
            d.line([(x, yy), (x + GAP * S * 0.45, yy - GAP * S * 0.55)], fill=ink, width=max(1, int(beam_h * 0.6)))
        return
    ye = group[0][2]
    for k in range(5):
        need = [g for g in group if g[1] - 2 > k]
        if not need:
            break
        yy = ye - k * beam_h * 1.8
        # consecutive notes at this level share a beam; a lone one gets a stub toward its neighbour
        run = []
        for i, g in enumerate(group):
            if g[1] - 2 > k:
                run.append(i)
            if (g[1] - 2 <= k or i == len(group) - 1) and run:
                a, b = group[run[0]][0], group[run[-1]][0]
                if a == b:
                    b = a + GAP * S * 0.5 * (1 if run[0] < len(group) - 1 else -1)
                d.rectangle([min(a, b), yy - beam_h, max(a, b), yy], fill=ink)
                run = []
    tups = {g[3] for g in group if g[3]}
    if tups:
        t = tups.pop()
        a, b = group[0][0], group[-1][0]
        cy = ye + GAP * S * 0.85
        d.text(((a + b) / 2, cy), str(t), font=small, fill=ink, anchor='mm')
        if rng.random() < 0.5:
            hw = GAP * S * 0.4
            d.line([(a, cy - hw * 0.6), (a, cy), ((a + b) / 2 - hw, cy)], fill=ink, width=max(1, S))
            d.line([((a + b) / 2 + hw, cy), (b, cy), (b, cy - hw * 0.6)], fill=ink, width=max(1, S))


WORDS = ['let ring', 'P.M.', 'T.H.', 'full', '1/2', 'h', 'p', 'sl.', 'Am7', 'Cmaj7', 'G', 'D/F#', 'E7(#9)', 'Riff A', 'Verse',
         'Gtr I', 'harm.', 'vib.', 'rake', 'A.H.', 'P.H.', 'tap', 'N.C.', 'Bb', 'F#m7b5']


def clutter(d, rng, Wpx, ys, nstr, ink, fpath, S):
    """What else a tab page has around the numbers: words and chord names above, ties and bends, a part name."""
    f = font(fpath, GAP * S * rng.uniform(0.7, 1.1))
    for _ in range(rng.randint(0, 5)):
        x = rng.uniform(0, Wpx * 0.9)
        y = rng.uniform(2, TOP - 14) * S
        w = rng.choice(WORDS)
        d.text((x, y), w, font=f, fill=ink)
        if w in ('let ring', 'P.M.') and rng.random() < 0.7:
            x1 = x + rng.uniform(4, 12) * GAP * S
            for xx in np.arange(x + GAP * S * 2.5, min(x1, Wpx), GAP * S * 0.6):
                d.line([(xx, y + GAP * S * 0.5), (xx + GAP * S * 0.3, y + GAP * S * 0.5)], fill=ink, width=S)
    for _ in range(rng.randint(0, 4)):  # ties / slurs below a string
        s = rng.randrange(nstr)
        x = rng.uniform(0, Wpx * 0.9)
        y = ys(s, x) + GAP * S * 0.45
        w = rng.uniform(1.5, 6) * GAP * S
        d.arc([x, y - GAP * S * 0.4, x + w, y + GAP * S * 0.4], 10, 170, fill=ink, width=max(1, S))
    if rng.random() < 0.15:  # a bend arrow
        x = rng.uniform(0, Wpx * 0.9)
        d.line([(x, ys(1, x)), (x + GAP * S, ys(0, x) - GAP * S * 1.2)], fill=ink, width=S)
    # bends as Guitar Pro / Songsterr draw them: a curve from the note up past the top line to an arrow head, with how
    # far ("¼", "½", "full") written just above it; sometimes back down again (bend and release). Not notes.
    g = GAP * S
    lab = font(fpath, g * rng.uniform(0.6, 0.95))
    for _ in range(rng.choice([0, 0, 0, 1, 1, 2, 3])):
        s = rng.randrange(min(3, nstr))
        x = rng.uniform(g, Wpx * 0.92)
        y0 = ys(s, x) - g * 0.1
        tx, ty = x + g * rng.uniform(1.0, 2.6), ys(0, x) - g * rng.uniform(1.0, 1.9)
        pts = [(x + g * 0.45 + (tx - x - g * 0.45) * t, y0 + (ty - y0) * t ** 2.2) for t in np.linspace(0, 1, 12)]
        lw = max(1, int(S * rng.uniform(0.8, 1.4)))
        d.line(pts, fill=ink, width=lw)
        if rng.random() < 0.4:  # a second string bent together (a double-stop bend)
            d.line([(px, py + g) for px, py in pts[:6]] + pts[6:], fill=ink, width=lw)
        a = g * 0.28
        d.polygon([(tx, ty - a * 1.4), (tx - a, ty), (tx + a, ty)], fill=ink)
        if rng.random() < 0.35:  # and released
            rx = tx + g * rng.uniform(1.0, 2.0)
            d.arc([tx, ty, rx * 2 - tx, ys(0, x) + g * 0.2], 270, 360, fill=ink, width=lw)
            d.polygon([(rx, ys(0, x) - g * 0.05), (rx - a, ys(0, x) - g * 0.5), (rx + a, ys(0, x) - g * 0.5)], fill=ink)
        d.text((tx, ty - a * 1.6), rng.choice(['¼', '½', 'full', '1½', '1/4', '1/2', '2', '¾']), font=lab, fill=ink, anchor='mb')


def degrade(img, rng):
    """Phone photos, screenshots, video frames: blur, low resolution, compression, noise, a playhead, dark mode."""
    W, Hh = img.size
    if rng.random() < 0.35:  # low resolution (a video's tab strip can be ~10 px per string gap)
        k = rng.uniform(0.35, 0.8)
        img = img.resize((max(8, int(W * k)), max(8, int(Hh * k))), Image.BILINEAR).resize((W, Hh), Image.BILINEAR)
    if rng.random() < 0.3:
        img = img.filter(ImageFilter.GaussianBlur(rng.uniform(0.3, 1.2)))
    a = np.asarray(img, dtype=np.float32)
    if rng.random() < 0.3:  # light falling across a photo
        gx = np.linspace(rng.uniform(-40, 10), rng.uniform(-40, 10), W)[None, :]
        a = a + gx
    if rng.random() < 0.25:  # a playhead or a highlight box over a few columns
        x0 = rng.randint(0, W - 4)
        if rng.random() < 0.5:
            a[:, x0:x0 + rng.randint(1, 4)] = rng.uniform(60, 200)
        else:
            w = rng.randint(10, 40)
            a[:, x0:x0 + w] = a[:, x0:x0 + w] * rng.uniform(0.6, 0.9) + rng.uniform(0, 40)
    if rng.random() < 0.4:
        a = a + np.random.default_rng(rng.randint(0, 1 << 30)).normal(0, rng.uniform(2, 12), a.shape)
    c = rng.uniform(0.6, 1.1)
    a = (a - 128) * c + 128 + rng.uniform(-15, 15)
    a = np.clip(a, 0, 255).astype(np.uint8)
    img = Image.fromarray(a)
    if rng.random() < 0.4:
        buf = io.BytesIO()
        img.save(buf, 'JPEG', quality=rng.randint(25, 85))
        img = Image.open(io.BytesIO(buf.getvalue())).convert('L')
    if rng.random() < 0.12:  # dark mode, turned back round by the app before reading (imperfectly)
        img = Image.fromarray(255 - np.asarray(img))
        img = Image.fromarray(255 - np.asarray(img.filter(ImageFilter.GaussianBlur(0.4))))
    return img


if __name__ == '__main__':
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else 'synth-preview'
    os.makedirs(out, exist_ok=True)
    rng = random.Random(1)
    print(len(fonts()), 'font choices')
    for i in range(8):
        a, cols, n = sample(rng)
        im = Image.fromarray(a).convert('RGB')
        dr = ImageDraw.Draw(im)
        for c in cols:
            dr.line([(c['x'], 150), (c['x'], 159)], fill=(255, 0, 0) if c['kind'] == 'note' else (0, 160, 0) if c['kind'] == 'bar' else (0, 0, 255))
        im.save(f'{out}/s{i}.png')
