#!/usr/bin/env python3
"""Digit templates for KGuitar's own tab-picture reader (src/scan/tabRead.ts): the digits 0–9 drawn in a spread of
printed-book styles (sans, serif, mono, regular and bold, a little condensed), each cropped to its ink and scaled into a
12 × 16 grid the same way the reader normalises a digit it finds on a tab line.

Fonts are free-licence ones (Liberation: OFL, DejaVu: Bitstream Vera licence, TeX Gyre: GUST font licence, FreeFont:
GPL with the font exception); only small bitmaps of their digits go into the app.

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
        for d in range(10):
            im = Image.new('L', (160, 160), 0)
            ImageDraw.Draw(im).text((20, 10), str(d), font=font, fill=255)
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
