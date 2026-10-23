"""KGuitar app icon, drawn in code (original art).

A psychedelic, multicoloured chocolate lab in a spiked punk collar, with a guitar headstock behind it,
on a swirling sunburst. Writes three SVGs (1024 x 1024):
  icon-background.svg  the sunburst (adaptive icon background layer)
  icon-foreground.svg  the dog and guitar on transparent (adaptive icon foreground, kept inside the safe zone)
  icon-full.svg        both together (legacy icons, splash, web)
Render with art/render.cjs.
"""
import math, os

OUT = os.path.dirname(os.path.abspath(__file__))
C = dict(
    night='#22103c', magenta='#ff2d87', orange='#ff7a1a', yellow='#ffd23a', teal='#16c2b0', violet='#8a4dff',
    lime='#a6e34f', choc='#5c3420', choc_dark='#3b2015', tan='#8d5a37', ink='#140a16', cream='#fff6e8', pink='#ff6f9c',
)
CX, CY = 512, 512


def f(x):
    return f'{x:.1f}'


def poly(points, close=True):
    d = 'M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in points)
    return d + (' Z' if close else '')


def wavy_circle(cx, cy, r, waves, amp, phase=0.0, n=180):
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        rr = r + amp * math.sin(waves * a + phase)
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return poly(pts)


# ---------------------------------------------------------------- background
def background():
    out = [f'<rect width="1024" height="1024" fill="{C["night"]}"/>']
    # twisting pinwheel rays
    rays = 18
    cols = [C['magenta'], C['orange'], C['violet'], C['orange']]
    for i in range(rays):
        a0 = 2 * math.pi * i / rays
        w = math.pi / rays * 0.92
        twist = 0.0016
        edge1 = [(CX + r * math.cos(a0 + twist * r), CY + r * math.sin(a0 + twist * r)) for r in range(0, 900, 20)]
        edge2 = [(CX + r * math.cos(a0 + w + twist * r), CY + r * math.sin(a0 + w + twist * r)) for r in range(880, -1, -20)]
        out.append(f'<path d="{poly(edge1 + edge2)}" fill="{cols[i % len(cols)]}" opacity="0.92"/>')
    # wavy concentric rings (poster style)
    rings = [(430, C['teal'], 26), (380, C['night'], 18), (350, C['yellow'], 22), (318, C['magenta'], 14)]
    for r, col, sw in rings:
        out.append(f'<path d="{wavy_circle(CX, CY, r, 14, 9, 0.4)}" fill="none" stroke="{col}" stroke-width="{sw}"/>')
    # the sun the dog sits in
    out.append(f'<path d="{wavy_circle(CX, CY, 292, 16, 10)}" fill="{C["yellow"]}"/>')
    out.append(f'<path d="{wavy_circle(CX, CY, 250, 16, 8, 0.6)}" fill="{C["orange"]}"/>')
    out.append(f'<circle cx="{CX}" cy="{CY}" r="210" fill="{C["magenta"]}"/>')
    # halftone dots for a screen-printed feel
    for gy in range(0, 1024, 26):
        for gx in range(0, 1024, 26):
            x = gx + (13 if (gy // 26) % 2 else 0)
            d = math.hypot(x - CX, gy - CY)
            if d < 450:
                continue
            r = min(5.5, (d - 450) / 70)
            out.append(f'<circle cx="{x}" cy="{gy}" r="{f(r)}" fill="{C["night"]}" opacity="0.55"/>')
    # sparkles
    for sx, sy, s in [(170, 170, 26), (860, 210, 20), (150, 820, 18), (880, 860, 28), (512, 70, 16), (70, 512, 14), (954, 520, 16)]:
        out.append(f'<path d="M{sx} {sy - s} Q{sx} {sy} {sx + s} {sy} Q{sx} {sy} {sx} {sy + s} Q{sx} {sy} {sx - s} {sy} Q{sx} {sy} {sx} {sy - s} Z" fill="{C["cream"]}"/>')
    return '\n'.join(out)


# ---------------------------------------------------------------- guitar
def guitar():
    """Guitar drawn upright around (0,0) = middle of the neck, then tilted behind the dog."""
    g = []
    # body: an original offset double-cutaway shape
    body = ('M -40 150 C -120 120 -190 150 -175 230 C -165 285 -215 330 -200 395 C -180 480 -60 500 0 470 '
            'C 70 505 190 470 200 390 C 210 330 160 290 175 230 C 190 150 120 110 40 140 Z')
    g.append(f'<path d="{body}" fill="{C["teal"]}" stroke="{C["ink"]}" stroke-width="14" stroke-linejoin="round"/>')
    g.append(f'<path d="M -60 210 C -120 210 -130 300 -90 360 C -60 400 40 420 90 380 C 130 340 100 250 60 220 Z" fill="{C["cream"]}" stroke="{C["ink"]}" stroke-width="8"/>')
    for y in (250, 300):
        g.append(f'<rect x="-38" y="{y}" width="76" height="22" rx="5" fill="{C["ink"]}"/>')
    g.append(f'<rect x="-46" y="372" width="92" height="20" rx="4" fill="{C["ink"]}"/>')
    # neck and frets
    g.append(f'<path d="M -24 -330 L 24 -330 L 28 230 L -28 230 Z" fill="{C["tan"]}" stroke="{C["ink"]}" stroke-width="12" stroke-linejoin="round"/>')
    y, step = -320, 40
    while y < 200:
        g.append(f'<line x1="-24" y1="{y}" x2="24" y2="{y}" stroke="{C["yellow"]}" stroke-width="4"/>')
        y += step
        step *= 0.96
    for x in (-15, -9, -3, 3, 9, 15):
        g.append(f'<line x1="{x}" y1="-332" x2="{x * 1.1:.1f}" y2="380" stroke="{C["cream"]}" stroke-width="2" opacity="0.9"/>')
    # headstock with six tuners
    head = 'M -30 -330 C -48 -380 -52 -440 -36 -480 C -20 -500 20 -500 36 -480 C 52 -440 48 -380 30 -330 Z'
    for i in range(3):
        y = -365 - i * 42
        g.append(f'<rect x="-74" y="{y - 9}" width="30" height="18" rx="7" fill="{C["cream"]}" stroke="{C["ink"]}" stroke-width="7"/>')
        g.append(f'<rect x="44" y="{y - 9}" width="30" height="18" rx="7" fill="{C["cream"]}" stroke="{C["ink"]}" stroke-width="7"/>')
    g.append(f'<path d="{head}" fill="{C["magenta"]}" stroke="{C["ink"]}" stroke-width="12" stroke-linejoin="round"/>')
    for i in range(3):
        y = -365 - i * 42
        g.append(f'<circle cx="-18" cy="{y}" r="7" fill="{C["yellow"]}" stroke="{C["ink"]}" stroke-width="4"/>')
        g.append(f'<circle cx="18" cy="{y}" r="7" fill="{C["yellow"]}" stroke="{C["ink"]}" stroke-width="4"/>')
    g.append(f'<rect x="-28" y="-338" width="56" height="10" fill="{C["cream"]}" stroke="{C["ink"]}" stroke-width="4"/>')
    return g


# ---------------------------------------------------------------- dog
HEAD = ('M 512 268 C 610 268 676 326 676 424 C 676 494 652 536 628 566 C 634 650 590 712 512 716 '
        'C 434 712 390 650 396 566 C 372 536 348 494 348 424 C 348 326 414 268 512 268 Z')
EAR_L = 'M 392 312 C 336 314 292 352 284 418 C 276 486 290 546 320 582 C 348 612 392 594 402 552 C 414 494 418 412 412 350 Z'
EAR_R = 'M 632 312 C 688 314 732 352 740 418 C 748 486 734 546 704 582 C 676 612 632 594 622 552 C 610 494 606 412 612 350 Z'
NECK = 'M 418 640 C 400 720 380 800 372 900 L 652 900 C 644 800 624 720 606 640 Z'
MUZZLE = 'M 512 520 C 576 520 618 552 618 606 C 618 660 572 700 512 700 C 452 700 406 660 406 606 C 406 552 448 520 512 520 Z'


def dog():
    d = []
    d.append('<clipPath id="headclip"><path d="' + HEAD + '"/></clipPath>')
    d.append('<clipPath id="earL"><path d="' + EAR_L + '"/></clipPath>')
    d.append('<clipPath id="earR"><path d="' + EAR_R + '"/></clipPath>')
    d.append('<clipPath id="neckclip"><path d="' + NECK + '"/></clipPath>')
    ring_cols = [C['magenta'], C['orange'], C['yellow'], C['lime'], C['teal'], C['violet']]
    # chest / neck
    d.append(f'<path d="{NECK}" fill="{C["choc"]}" stroke="{C["ink"]}" stroke-width="14"/>')
    d.append('<g clip-path="url(#neckclip)">')
    for i, y in enumerate(range(760, 920, 34)):
        d.append(f'<path d="M 360 {y} Q 512 {y - 40} 664 {y}" fill="none" stroke="{ring_cols[(i + 2) % 6]}" stroke-width="13" opacity="0.9"/>')
    d.append('</g>')
    # ears with tie-dye stripes
    for ear, clip, sgn in ((EAR_L, 'earL', -1), (EAR_R, 'earR', 1)):
        d.append(f'<path d="{ear}" fill="{C["choc_dark"]}"/>')
        d.append(f'<g clip-path="url(#{clip})">')
        for i in range(7):
            x0 = 512 + sgn * (120 + i * 26)
            d.append(f'<path d="M {x0} 300 C {x0 + sgn * 40} 420 {x0 - sgn * 30} 520 {x0 + sgn * 10} 680" fill="none" stroke="{ring_cols[i % 6]}" stroke-width="12" opacity="0.95"/>')
        d.append('</g>')
        d.append(f'<path d="{ear}" fill="none" stroke="{C["ink"]}" stroke-width="14" stroke-linejoin="round"/>')
    # head with psychedelic rings radiating from the forehead (the "third eye")
    d.append(f'<path d="{HEAD}" fill="{C["choc"]}"/>')
    d.append('<g clip-path="url(#headclip)">')
    for i, r in enumerate(range(34, 420, 30)):
        d.append(f'<path d="{wavy_circle(512, 372, r, 9, 4 + i * 0.6, i * 0.7)}" fill="none" stroke="{ring_cols[i % 6]}" stroke-width="13" opacity="0.92"/>')
    d.append(f'<circle cx="512" cy="372" r="18" fill="{C["cream"]}"/>')
    d.append(f'<circle cx="512" cy="372" r="9" fill="{C["ink"]}"/>')
    d.append('</g>')
    d.append(f'<path d="{HEAD}" fill="none" stroke="{C["ink"]}" stroke-width="14" stroke-linejoin="round"/>')
    # brow patches behind the eyes so the face reads
    for ex in (452, 572):
        d.append(f'<ellipse cx="{ex}" cy="470" rx="46" ry="38" fill="{C["choc_dark"]}" opacity="0.9"/>')
    # muzzle
    d.append(f'<path d="{MUZZLE}" fill="{C["tan"]}" stroke="{C["ink"]}" stroke-width="12"/>')
    # eyes: amber with a star glint
    for ex in (452, 572):
        d.append(f'<ellipse cx="{ex}" cy="472" rx="27" ry="25" fill="#c06f1e" stroke="{C["ink"]}" stroke-width="8"/>')
        d.append(f'<circle cx="{ex + 2}" cy="474" r="14" fill="{C["ink"]}"/>')

        s = 9
        sx, sy = ex - 6, 462
        d.append(f'<path d="M{sx} {sy - s} Q{sx} {sy} {sx + s} {sy} Q{sx} {sy} {sx} {sy + s} Q{sx} {sy} {sx - s} {sy} Q{sx} {sy} {sx} {sy - s} Z" fill="#fff"/>')
    # nose
    d.append(f'<path d="M 464 560 C 470 534 554 534 560 560 C 566 584 536 604 512 606 C 488 604 458 584 464 560 Z" fill="{C["ink"]}"/>')
    d.append(f'<ellipse cx="494" cy="556" rx="14" ry="7" fill="#fff" opacity="0.55"/>')
    # mouth and tongue (happy pant)
    d.append(f'<path d="M 486 650 C 486 700 538 700 538 650 Z" fill="{C["pink"]}" stroke="{C["ink"]}" stroke-width="8" stroke-linejoin="round"/>')
    d.append(f'<path d="M 512 656 L 512 682" stroke="{C["ink"]}" stroke-width="5" stroke-linecap="round" opacity="0.6"/>')
    d.append(f'<path d="M 512 606 L 512 634 M 512 634 C 496 656 466 656 452 638 M 512 634 C 528 656 558 656 572 638" fill="none" stroke="{C["ink"]}" stroke-width="9" stroke-linecap="round"/>')
    # spiked punk collar
    d.append(f'<path d="M 404 742 C 470 772 554 772 620 742 L 628 790 C 556 820 468 820 396 790 Z" fill="{C["ink"]}"/>')
    for i in range(6):
        t = (i + 0.5) / 6
        x = 404 + t * 216
        y = 782 + 20 * math.sin(math.pi * t)
        d.append(f'<path d="M {f(x - 13)} {f(y - 10)} L {f(x)} {f(y + 30)} L {f(x + 13)} {f(y - 10)} Z" fill="#d8dde6" stroke="{C["ink"]}" stroke-width="5" stroke-linejoin="round"/>')
    d.append(f'<circle cx="512" cy="826" r="20" fill="{C["yellow"]}" stroke="{C["ink"]}" stroke-width="7"/>')
    d.append(f'<path d="M 503 818 L 503 834 M 503 818 L 520 815 L 520 830" fill="none" stroke="{C["ink"]}" stroke-width="4" stroke-linecap="round"/>')
    return d


def foreground(scale=1.0):
    """Dog + guitar. scale < 1 shrinks it toward the centre (to sit inside the adaptive-icon safe zone)."""
    parts = []
    gtr = '\n'.join(guitar())
    tilt = 'translate(520 580) rotate(34) scale(0.86)'
    dogsvg = '\n'.join(dog())
    # white die-cut sticker outline behind everything
    sticker = (f'<g fill="{C["cream"]}" stroke="{C["cream"]}" stroke-width="44" stroke-linejoin="round">'
               f'<path d="{HEAD}"/><path d="{EAR_L}"/><path d="{EAR_R}"/><path d="{NECK}"/>'
               f'<g transform="{tilt}"><path d="M -30 -330 C -48 -380 -52 -440 -36 -480 C -20 -500 20 -500 36 -480 C 52 -440 48 -380 30 -330 L 28 230 L -28 230 Z" stroke-width="60"/>'
               f'<rect x="-80" y="-470" width="160" height="150" rx="20" stroke-width="40"/></g></g>')
    parts.append(f'<g transform="translate({CX} {CY}) scale({scale}) translate({-CX} {-CY})">')
    parts.append(sticker)
    parts.append(f'<g transform="{tilt}">{gtr}</g>')
    parts.append(dogsvg)
    parts.append('</g>')
    return '\n'.join(parts)


def svg(body, size=1024):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="{size}" height="{size}">\n{body}\n</svg>\n'


if __name__ == '__main__':
    with open(os.path.join(OUT, 'icon-background.svg'), 'w') as fh:
        fh.write(svg(background()))
    # adaptive foreground: the visible area is the middle 72/108 of the canvas, the safe zone the middle 66/108
    with open(os.path.join(OUT, 'icon-foreground.svg'), 'w') as fh:
        fh.write(svg(foreground(0.72)))
    with open(os.path.join(OUT, 'icon-full.svg'), 'w') as fh:
        fh.write(svg(background() + '\n' + foreground(0.94)))
    print('wrote icon SVGs')
