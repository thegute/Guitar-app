"""Cut every labelled tab staff (from realstrips.ts) out of a picture of its page, into the reader's frame: 160 px tall,
string lines at y = 42 + 15·s. Writes <out>/<name>-p<page>-<staff>.png and one labels.jsonl line per strip.

python3 crop.py <book.pdf> <labels.json> <out dir> <name> [--pages-from N] [--pages-to M]
"""
import json
import os
import subprocess
import sys
import tempfile

from PIL import Image

H, GAP, TOP = 160, 15, 42
DPI = 300


def main():
    pdf, lab, out, name = sys.argv[1:5]
    lo = int(sys.argv[sys.argv.index('--pages-from') + 1]) if '--pages-from' in sys.argv else 0
    hi = int(sys.argv[sys.argv.index('--pages-to') + 1]) if '--pages-to' in sys.argv else 10 ** 9
    os.makedirs(out, exist_ok=True)
    pages = [p for p in json.load(open(lab)) if lo <= p['page'] <= hi]
    r = DPI / 72
    n = 0
    with open(os.path.join(out, 'labels.jsonl'), 'a') as jl, tempfile.TemporaryDirectory() as tmp:
        for p in pages:
            base = os.path.join(tmp, 'pg')
            subprocess.run(['pdftoppm', '-f', str(p['page']), '-l', str(p['page']), '-r', str(DPI), '-gray', '-png', '-singlefile', pdf, base], check=True)
            img = Image.open(base + '.png').convert('L')
            for si, st in enumerate(p['staves']):
                gap = st['gap']
                k = GAP / (gap * r)  # page pixels → frame pixels
                top = st['lines'][0]
                y0 = top - TOP / GAP * gap
                y1 = y0 + H / GAP * gap
                x0 = max(0, st['left'] - gap * 1.2)
                x1 = min(p['width'], st['right'] + gap * 1.2)
                crop = img.crop((round(x0 * r), round(y0 * r), round(x1 * r), round(y1 * r)))
                w = max(16, round((x1 - x0) * r * k))
                crop = crop.resize((w, H), Image.LANCZOS)
                fn = f'{name}-p{p["page"]}-{si}.png'
                crop.save(os.path.join(out, fn))
                cols = [dict(c, x=(c['x'] - x0) * r * k) for c in st['cols']]
                jl.write(json.dumps({'file': fn, 'nstr': st['nstr'], 'rhythm': st['rhythmRead'], 'cols': cols}) + '\n')
                n += 1
    print(n, 'strips from', len(pages), 'pages →', out)


if __name__ == '__main__':
    main()
