#!/usr/bin/env python3
"""Psychedelic mode's pictures, cut from the owner's own ukiyo-e artwork in art/:
  samurai-dogs.jpg     eight samurai dog cards (4 x 2)
  samurai-dogs-2.jpg   four more (Doberman under an oni sun, husky on bass under an oni moon, the Rottweiler and shepherd
                       duel under an eclipse, the muscle dog under a torii)
  psy-scenes.jpg       four wide banners (dragon guitar, amp vortex, torii and oni volcanoes, waves of amps) and four squares
                       (mushroom guitar, dragon amp, galaxy guitar, skull amp wall)
  concert.jpg ninja.jpg princess.jpg   posters (the lab's band playing a festival, the ninja lab, Brandy the princess)
  story.jpg            four story panels (the princess rises, the march, the sound attack, peace)
  kguitar-art.jpg      the original KGuitar poster
Writes public/samurai/:
  <dog>.webp           256 px face (shown round)
  card-<name>.webp     whole pictures, 900 px wide (celebrations, empty pages, the gallery's full view)
  wide-<name>.webp     banners and story panels, 1400 px wide (screen headers, the today card)
  float-<name>.webp    round snippets with soft edges that float behind the cards
  strip.webp           every dog's head side by side, 300 px tall (Songs header)
  thumb-<name>.webp    small versions for the gallery grid
Run: python3 tools/make-samurai.py
"""
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, 'art')
OUT = os.path.join(ROOT, 'public', 'samurai')
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith('.webp'):
        os.remove(os.path.join(OUT, f))

def load(n): return Image.open(os.path.join(ART, n)).convert('RGB')
def save(img, name, q=80):
    p = os.path.join(OUT, name)
    img.save(p, 'WEBP', quality=q, method=6)
    print(f'{name:28s} {img.size[0]:5d}x{img.size[1]:<5d} {os.path.getsize(p) // 1024:4d} KB')

def grid(img, cols, rows, inset=8):
    return [img.crop((c0 + inset, r0 + inset, c1 - inset, r1 - inset)) for (r0, r1) in rows for (c0, c1) in cols]

S1 = grid(load('samurai-dogs.jpg'), [(21, 611), (655, 1245), (1291, 1881), (1926, 2515)], [(27, 827), (873, 1678)], 7)
S2 = grid(load('samurai-dogs-2.jpg'), [(26, 825), (870, 1669)], [(22, 1243), (1284, 2505)])
SC = load('psy-scenes.jpg')
BAN = [SC.crop((c0 + 8, r0 + 8, c1 - 8, r1 - 8)) for (c0, c1), (r0, r1) in [((21, 1268), (17, 347)), ((1308, 2557), (17, 347)), ((22, 1267), (379, 704)), ((1308, 2556), (379, 704))]]
SQ = [SC.crop((c0 + 8, 780, c1 - 8, 1414)) for (c0, c1) in [(34, 623), (678, 1265), (1324, 1910), (1967, 2556)]]
POST = {n: load(f'{n}.jpg').crop((65, 56, 1633, 2472)) for n in ('concert', 'ninja', 'princess')}
ST = load('story.jpg')
STORY = [ST.crop((c0 + 8, r0 + 8, c1 - 8, r1 - 8)) for (c0, c1), (r0, r1) in [((26, 1261), (20, 695)), ((1314, 2549), (20, 695)), ((26, 1262), (744, 1419)), ((1313, 2549), (744, 1419))]]
POSTER = load('kguitar-art.jpg')

def square(img, cx, cy, s):
    s = min(s, img.width, img.height)
    x0 = min(max(0, cx - s // 2), img.width - s)
    y0 = min(max(0, cy - s // 2), img.height - s)
    return img.crop((x0, y0, x0 + s, y0 + s))

def width(img, w):
    return img.resize((w, round(w * img.height / img.width)), Image.LANCZOS)

# ---------------- cards (whole pictures)
CARDS = {
    'lab': POSTER, 'concert': POST['concert'], 'ninja': POST['ninja'], 'princess': POST['princess'],
    'shiba': S1[0], 'husky': S1[1], 'shepherd': S1[2], 'boxer': S1[3], 'golden': S1[4], 'rottweiler': S1[5], 'frenchie': S1[6], 'akita': S1[7],
    'doberman': S2[0], 'husky-bass': S2[1], 'duel': S2[2], 'muscle': S2[3],
    'shrooms': SQ[0], 'dragon-amp': SQ[1], 'galaxy': SQ[2], 'skulls': SQ[3],
}
for name, img in CARDS.items():
    save(width(img, 900), f'card-{name}.webp', 76)
    save(width(img, 180), f'thumb-{name}.webp', 72)

# ---------------- wide pictures (headers)
WIDE = {'dragon': BAN[0], 'vortex': BAN[1], 'torii': BAN[2], 'waves': BAN[3],
        'rise': STORY[0], 'march': STORY[1], 'attack': STORY[2], 'peace': STORY[3],
        'stage': POST['concert'].crop((0, 430, 1568, 960))}
for name, img in WIDE.items():
    save(width(img, 1400), f'wide-{name}.webp', 78)
    save(width(img, 360), f'thumb-{name}.webp', 72)

# ---------------- faces: (picture, centre x, centre y, size)
FACES = {
    'lab': (POSTER, 780, 690, 640),
    'princess': (POST['princess'], 395, 1160, 420),
    'shiba': (S1[0], 298, 158, 215), 'husky': (S1[1], 283, 350, 400), 'shepherd': (S1[2], 287, 195, 230),
    'boxer': (S1[3], 230, 300, 380), 'golden': (S1[4], 300, 150, 200), 'rottweiler': (S1[5], 283, 300, 420),
    'frenchie': (S1[6], 275, 175, 240), 'akita': (S1[7], 278, 330, 400),
    'doberman': (S2[0], 430, 445, 240), 'muscle': (S2[3], 362, 492, 250),
}
faces = {}
for name, (img, cx, cy, s) in FACES.items():
    faces[name] = square(img, cx, cy, s)
    save(faces[name].resize((256, 256), Image.LANCZOS), f'{name}.webp', 82)

# ---------------- the strip of heads (a little more room round each face)
order = ['shiba', 'husky', 'shepherd', 'boxer', 'golden', 'rottweiler', 'frenchie', 'akita', 'doberman', 'muscle', 'princess', 'lab']
tiles = []
for name in order:
    img, cx, cy, s = FACES[name]
    tiles.append(square(img, cx, cy + s // 10, int(s * 1.3)).resize((300, 300), Image.LANCZOS))
gap = 6
strip = Image.new('RGB', (len(tiles) * 300 + (len(tiles) - 1) * gap, 300), (20, 0, 43))
for i, t in enumerate(tiles):
    strip.paste(t, (i * (300 + gap), 0))
save(strip, 'strip.webp', 78)
print('strip order:', order)

# ---------------- round snippets with soft edges (float behind the cards)
def floater(img, cx, cy, r, name, size=360):
    c = square(img, cx, cy, 2 * r).resize((size, size), Image.LANCZOS).convert('RGBA')
    m = Image.new('L', (size, size), 0)
    ImageDraw.Draw(m).ellipse((size * 0.06, size * 0.06, size * 0.94, size * 0.94), fill=255)
    c.putalpha(m.filter(ImageFilter.GaussianBlur(size * 0.04)))
    save(c, f'float-{name}.webp', 80)

floater(S2[0], 389, 216, 215, 'oni-sun')
floater(S2[1], 367, 178, 215, 'oni-moon')
floater(S2[2], 333, 160, 170, 'eclipse')
floater(S2[3], 405, 111, 140, 'rainbow-moon')
floater(SQ[0], 286, 317, 290, 'shroom-guitar')
floater(BAN[2], 470, 80, 80, 'oni-smoke')
floater(BAN[3], 175, 150, 150, 'wave')
