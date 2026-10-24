#!/usr/bin/env python3
"""Psychedelic mode artwork: trippy versions of the owner's poster (art/kguitar-art.jpg) plus original
procedural pieces, written to public/psy/ as WebP.

  face.webp      the samurai dog's face, round (avatars, empty pages)
  pop.webp       pop-art strip: the face four times in four colourways (Songs header)
  kaleido.webp   kaleidoscope of the moon, helmet and lightning (Learn's today card, Settings preview)
  melt.webp      the top of the poster melting in waves (Jam header)
  shrooms.webp   the poster's oni mask and glowing mushrooms (Tools header)
  liquid.webp    original tileable liquid-rainbow texture (the moving background)
  tunnel.webp    original rainbow spiral tunnel (celebrations, tuner)

Run: python3 tools/make-psy-art.py
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import map_coordinates

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'psy')
os.makedirs(OUT, exist_ok=True)
POSTER = Image.open(os.path.join(ROOT, 'art', 'kguitar-art.jpg')).convert('RGB')
P = np.asarray(POSTER).astype(np.float32) / 255.0
H0, W0 = P.shape[:2]


def save(img, name, q=80):
    path = os.path.join(OUT, name)
    img.save(path, 'WEBP', quality=q, method=6)
    print(name, img.size, os.path.getsize(path) // 1024, 'KB')


def sample(img, ys, xs):
    """Bilinear sample of an HxWx3 float image at float coordinates (clamped)."""
    out = np.empty(ys.shape + (3,), np.float32)
    for c in range(3):
        out[..., c] = map_coordinates(img[..., c], [ys, xs], order=1, mode='reflect')
    return out


def to_img(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


def palette(t, a, b, c, d):
    """Inigo Quilez's cosine palette."""
    t = t[..., None]
    return np.asarray(a) + np.asarray(b) * np.cos(2 * np.pi * (np.asarray(c) * t + np.asarray(d)))


# ---------- the dog's face ----------
face_box = (470, 380, 1090, 1000)
face = POSTER.crop(face_box).resize((512, 512), Image.LANCZOS)
mask = Image.new('L', (512, 512), 0)
ImageDraw.Draw(mask).ellipse((4, 4, 508, 508), fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(1.5))
face_rgba = face.copy()
face_rgba.putalpha(mask)
save(face_rgba, 'face.webp', 85)

# ---------- pop-art strip ----------
COLOURWAYS = [
    ['#1b0035', '#7a00ff', '#ff2fd0', '#ffd23f', '#fff4d6'],
    ['#00172e', '#005bff', '#00e5ff', '#b6ff00', '#f4fff0'],
    ['#2a0010', '#c4003a', '#ff8a00', '#ffe600', '#fffbe6'],
    ['#06210f', '#00a86b', '#3dffa8', '#ff4fd8', '#fff0fb'],
]


def hex2rgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255


f = np.asarray(face).astype(np.float32) / 255
lum = 0.3 * f[..., 0] + 0.59 * f[..., 1] + 0.11 * f[..., 2]
lum = (lum - np.percentile(lum, 2)) / (np.percentile(lum, 98) - np.percentile(lum, 2))
tiles = []
for cw in COLOURWAYS:
    cols = np.stack([hex2rgb(h) for h in cw])
    lv = np.clip((lum * len(cw)).astype(int), 0, len(cw) - 1)
    t = cols[lv]
    # keep a little of the drawing's line work
    t = t * 0.82 + f * 0.18
    tiles.append(to_img(t).resize((400, 400), Image.LANCZOS))
strip = Image.new('RGB', (1600, 400))
for i, t in enumerate(tiles):
    strip.paste(t, (i * 400, 0))
save(strip, 'pop.webp', 82)

# ---------- kaleidoscope ----------
N = 1024
yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
dx, dy = xx - N / 2, yy - N / 2
r = np.hypot(dx, dy)
th = np.arctan2(dy, dx)
seg = 2 * np.pi / 8
tt = np.mod(th, seg)
tt = np.where(tt > seg / 2, seg - tt, tt)
cx, cy = 880, 560                       # the moon behind the helmet
ang = tt - np.pi / 2 + 0.25             # wedge points up through the helmet and lightning
rad = r * 1.05 + 40
src = sample(P, cy + rad * np.sin(ang), cx + rad * np.cos(ang))
vign = np.clip(1.25 - (r / (N / 2)) ** 2 * 0.55, 0.45, 1)[..., None]
save(to_img(src * vign), 'kaleido.webp', 80)

# ---------- melting poster top ----------
top = P[40:1180, 120:1580]
Ht, Wt = 640, 1400
ys, xs = np.mgrid[0:Ht, 0:Wt].astype(np.float32)
u, v = xs / Wt, ys / Ht
drip = (v ** 1.6) * (38 * np.sin(2 * np.pi * (u * 5.0 + 0.2)) + 22 * np.sin(2 * np.pi * (u * 11.3 + 0.7)))
wob = 14 * np.sin(2 * np.pi * (v * 3.1 + u * 0.7))
sy = (v * (top.shape[0] - 1)) - drip
sx = (u * (top.shape[1] - 1)) + wob
melt = sample(top, sy, sx)
# rainbow bands bleed in where it melts
bands = palette(v * 2.2 + u * 0.6, [0.6, 0.45, 0.65], [0.4, 0.45, 0.35], [1, 1, 1], [0.0, 0.33, 0.67])
k = np.clip((v - 0.45) * 1.6, 0, 0.55)[..., None]
save(to_img(melt * (1 - k) + bands * k), 'melt.webp', 80)

# ---------- the poster's glowing mushrooms ----------
sh = POSTER.crop((1005, 2080, 1505, 2390)).resize((1000, 620), Image.LANCZOS)   # the oni mask and the mushrooms
save(sh, 'shrooms.webp', 82)

# ---------- liquid rainbow (tileable) ----------
T = 768
yy, xx = np.mgrid[0:T, 0:T].astype(np.float32)
px, py = 2 * np.pi * xx / T, 2 * np.pi * yy / T
WAVES = [((1, 2), 0.0, 1.0), ((3, -1), 1.3, 0.6), ((-2, 3), 2.1, 0.45), ((4, 1), 0.7, 0.3), ((1, -4), 3.3, 0.25)]


def fld(ax, ay, shift):
    out = np.zeros_like(ax)
    for (kx, ky), ph, a in WAVES:
        out += a * np.sin(kx * ax + ky * ay + ph + shift)
    return out / 2.6


qx, qy = fld(px, py, 0.0), fld(px, py, 5.2)
rx, ry = fld(px + 2.4 * qx, py + 2.4 * qy, 1.7), fld(px + 2.4 * qx, py + 2.4 * qy, 8.3)
val = fld(px + 2.8 * rx, py + 2.8 * ry, 2.9)
liq = palette(val * 0.9 + 0.12 * qx, [0.55, 0.4, 0.62], [0.45, 0.42, 0.38], [1.0, 1.0, 1.0], [0.0, 0.35, 0.68])
glow = (0.6 + 0.4 * np.abs(rx))[..., None]
save(to_img(liq * glow), 'liquid.webp', 78)

# ---------- spiral tunnel ----------
N = 900
yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
dx, dy = (xx - N / 2) / (N / 2), (yy - N / 2) / (N / 2)
r = np.hypot(dx, dy) + 1e-3
th = np.arctan2(dy, dx)
t = th / (2 * np.pi) * 6 + 1.6 / r * 0.9 + np.log(r) * 0.5
stripes = 0.5 + 0.5 * np.cos(2 * np.pi * (th / (2 * np.pi) * 12 + 1.2 / r))
tun = palette(t, [0.55, 0.4, 0.6], [0.45, 0.45, 0.4], [1, 1, 1], [0.0, 0.33, 0.67]) * (0.55 + 0.45 * stripes[..., None])
tun *= np.clip(r * 1.6, 0.0, 1.0)[..., None] ** 0.6
save(to_img(tun), 'tunnel.webp', 78)
