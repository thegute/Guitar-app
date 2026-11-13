#!/usr/bin/env python3
"""Digit templates for KGuitar's own tab-picture reader (src/scan/tabRead.ts): the digits 0–9 drawn in a spread of
printed-book styles (sans, serif, mono, regular and bold, a little condensed), each cropped to its ink and scaled into a
12 × 16 grid the same way the reader normalises a digit it finds on a tab line.

Fonts are free-licence ones (Liberation: OFL, DejaVu: Bitstream Vera licence, TeX Gyre: GUST font licence, FreeFont:
GPL with the font exception; the music fonts Bravura, Petaluma (Steinberg) and Leland (MuseScore): SIL OFL, downloaded to
~/.cache/kguitar-fonts the first time); only small bitmaps of their digits go into the app. The music fonts give the
engraved time-signature digits (SMuFL U+E080–E089) that tab books print in the staff (4/4 → 3/4).

  python3 tools/make-digit-templates.py   →   src/scan/digitTemplates.ts
"""
import base64, os

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 12, 16
FONTS = [
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf',
    '/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyreheros-regular.otf',
    '/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyreheros-bold.otf',
    '/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyreheroscn-bold.otf',
    '/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyretermes-regular.otf',
    '/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyretermes-bold.otf',
    '/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyrecursor-bold.otf',
    '/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyreadventor-bold.otf',
    '/usr/share/fonts/truetype/freefont/FreeSans.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf',
]


MUSIC_FONTS = {
    'Bravura.otf': 'https://raw.githubusercontent.com/steinbergmedia/bravura/master/redist/otf/Bravura.otf',
    'Petaluma.otf': 'https://raw.githubusercontent.com/steinbergmedia/petaluma/master/redist/otf/Petaluma.otf',
    'Leland.otf': 'https://raw.githubusercontent.com/MuseScoreFonts/Leland/main/Leland.otf',
}


def music_fonts():
    import urllib.request
    cache = os.path.expanduser('~/.cache/kguitar-fonts')
    os.makedirs(cache, exist_ok=True)
    out = []
    for name, url in MUSIC_FONTS.items():
        path = os.path.join(cache, name)
        if not os.path.exists(path):
            try:
                urllib.request.urlretrieve(url, path)
            except Exception as e:  # offline: build without them
                print('skip', name, e)
                continue
        out.append(path)
    return out


def norm(ink):
    """ink: 2-D array, 1 = ink. Crop to the ink, keep the shape's proportions, centre it in W × H (same as tabRead.ts)."""
    ys, xs = np.nonzero(ink > 0.5)
    if not len(ys):
        return None
    ink = ink[ys.min(): ys.max() + 1, xs.min(): xs.max() + 1]
    h, w = ink.shape
    s = min(W / w, H / h)
    nw, nh = max(1, round(w * s)), max(1, round(h * s))
    im = Image.fromarray((ink * 255).astype(np.uint8)).resize((nw, nh), Image.BILINEAR)
    out = np.zeros((H, W), dtype=np.float32)
    ox, oy = (W - nw) // 2, (H - nh) // 2
    out[oy: oy + nh, ox: ox + nw] = np.asarray(im, dtype=np.float32) / 255
    return out


def main():
    rows = []
    for path in FONTS:
        if not os.path.exists(path):
            continue
        font = ImageFont.truetype(path, 96)
        # 0–9, then 10 = a dead note's X (tab software prints a capital or small x on the string)
        for d, ch in [(d, str(d)) for d in range(10)] + [(10, 'X'), (10, 'x')]:
            im = Image.new('L', (160, 160), 0)
            ImageDraw.Draw(im).text((20, 10), ch, font=font, fill=255)
            a = np.asarray(im, dtype=np.float32) / 255
            # two sizes the way books print them: as drawn, and a little thinner (light print / small type)
            for erode in (False, True):
                b = a
                if erode:
                    from PIL import ImageFilter
                    b = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)), dtype=np.float32) / 255
                g = norm(b)
                if g is not None:
                    rows.append((d, (np.clip(g, 0, 1) * 255).astype(np.uint8)))
        # small print (a phone photo of a book, a 150 dpi scan): the digit ~12 pixels tall, cut to ink / paper the way
        # the reader cuts it (staircase edges, thin strokes gone thick or broken), at two sub-pixel offsets
        for d, ch in [(d, str(d)) for d in range(10)] + [(10, 'X')]:
            for dx in (0, 4):
                im = Image.new('L', (160, 160), 0)
                ImageDraw.Draw(im).text((16 + dx, 16 + dx), ch, font=font, fill=255)
                a = np.asarray(im.resize((20, 20), Image.BOX), dtype=np.float32) / 255
                g = norm((a > 0.45).astype(np.float32))
                if g is not None:
                    rows.append((d, (np.clip(g, 0, 1) * 255).astype(np.uint8)))
    # engraved time-signature digits (big, bold, ball ends): two sizes each, as drawn and a little thinner
    for path in music_fonts():
        font = ImageFont.truetype(path, 120)
        for d in range(10):
            bb = font.getbbox(chr(0xE080 + d))
            im = Image.new('L', (220, 220), 0)
            ImageDraw.Draw(im).text((30 - bb[0], 30 - bb[1]), chr(0xE080 + d), font=font, fill=255)
            a = np.asarray(im, dtype=np.float32) / 255
            for erode in (False, True):
                b = a
                if erode:
                    from PIL import ImageFilter
                    b = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)), dtype=np.float32) / 255
                g = norm(b)
                if g is not None:
                    rows.append((20 + d, (np.clip(g, 0, 1) * 255).astype(np.uint8)))  # 20–29: time-signature digits
    # rests (40 whole, 41 half, 42 quarter, 43 eighth, 44 sixteenth, 45 32nd): tab software draws them in the staff
    for path in music_fonts():
        font = ImageFont.truetype(path, 120)
        for k, cp in enumerate(range(0xE4E3, 0xE4E9)):
            bb = font.getbbox(chr(cp))
            im = Image.new('L', (240, 300), 0)
            ImageDraw.Draw(im).text((30 - bb[0], 30 - bb[1]), chr(cp), font=font, fill=255)
            g = norm(np.asarray(im, dtype=np.float32) / 255)
            if g is not None:
                rows.append((40 + k, (np.clip(g, 0, 1) * 255).astype(np.uint8)))
    data = bytes([d for d, _ in rows]) + b''.join(g.tobytes() for _, g in rows)
    b64 = base64.b64encode(data).decode()
    out = os.path.join(os.path.dirname(__file__), '..', 'src', 'scan', 'digitTemplates.ts')
    with open(out, 'w') as f:
        f.write('// Made by tools/make-digit-templates.py: digits 0–9 from free-licence fonts (Liberation, DejaVu, TeX Gyre, FreeFont),\n')
        f.write(f'// each a {W} × {H} grey grid (0 = paper, 255 = ink). First {len(rows)} bytes = the digit of each template.\n')
        f.write(f'export const TEMPLATE_W = {W}\nexport const TEMPLATE_H = {H}\nexport const TEMPLATE_COUNT = {len(rows)}\n')
        f.write(f"export const TEMPLATES_B64 = '{b64}'\n")
    print(f'{len(rows)} templates, {len(b64) / 1024:.0f} KB → {out}')


if __name__ == '__main__':
    main()
