#!/usr/bin/env python3
"""Psychedelic mode artwork: trippy versions of the owner's poster (art/kguitar-art.jpg) plus original
procedural pieces, written to public/psy/ as WebP.

  face.webp      the samurai dog's face, round (avatars, empty pages)
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
