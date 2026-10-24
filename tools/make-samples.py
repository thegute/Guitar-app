"""Prepare the recorded instrument sounds the app plays (Hear it, Jam, quizzes, tapping notes).

Takes the samples from the tonejs-instruments packages (dev dependencies), keeps one note about every three semitones
(the app pitch-shifts in between), trims each to start on the pluck and to a few seconds with a fade, levels them with
one fixed gain per note (no dynamic loudness processing, which made a second "pluck" appear), and writes small mono
MP3s plus an index to public/samples/<sound>/.   Run: python3 tools/make-samples.py
Samples: tonejs-instruments by Nicholaus P. Brosowsky (https://github.com/nbrosowsky/tonejs-instruments), credited in the app.
"""
import json
import os
import re
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
# sound: (package, lowest, highest, seconds kept)
SOURCES = {
    'acoustic': ('tonejs-instrument-guitar-acoustic-mp3', 38, 84, 3.2),
    'electric': ('tonejs-instrument-guitar-electric-mp3', 37, 84, 3.2),
    'nylon': ('tonejs-instrument-guitar-nylon-mp3', 38, 84, 3.2),
    'bass': ('tonejs-instrument-bass-electric-mp3', 28, 64, 2.6),
}
NOTE = {'C': 0, 'Cs': 1, 'D': 2, 'Ds': 3, 'E': 4, 'F': 5, 'Fs': 6, 'G': 7, 'Gs': 8, 'A': 9, 'As': 10, 'B': 11}


def midi_of(name):
    m = re.match(r'^([A-G]s?)(\d)$', name)
    return 12 * (int(m.group(2)) + 1) + NOTE[m.group(1)] if m else None


def load(path):
    r = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                       capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.float32).astype(np.float64)


def write_mp3(y, path, kbps=80):
    pcm = (np.clip(y, -1, 1) * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-ar', '44100', '-b:a', f'{kbps}k', path], input=pcm, check=True)


for sound, (pkg, lo_lim, hi_lim, seconds) in SOURCES.items():
    src = os.path.join(ROOT, 'node_modules', pkg)
    have = {}
    for f in os.listdir(src):
        if f.endswith('.mp3'):
            m = midi_of(f[:-4])
            if m is not None:
                have[m] = f
    lo, hi = max(min(have), lo_lim), min(max(have), hi_lim)
    picked = []
    target = lo
    while target <= hi + 1:
        best = min(have, key=lambda m: abs(m - target))
        if best not in picked:
            picked.append(best)
        target += 3
    out_dir = os.path.join(ROOT, 'public', 'samples', sound)
    os.makedirs(out_dir, exist_ok=True)
    for f in os.listdir(out_dir):
        os.remove(os.path.join(out_dir, f))
    clips = {}
    for m in sorted(picked):
        x = load(os.path.join(src, have[m]))
        pk = np.max(np.abs(x))
        on = max(0, int(np.argmax(np.abs(x) > 0.05 * pk)) - int(0.002 * SR))
        x = x[on:on + int(seconds * SR)].copy()
        fade = int(0.8 * SR)
        x[-fade:] *= np.cos(np.linspace(0, np.pi / 2, fade)) ** 2
        clips[m] = x
    # level: the same loudness over the first 0.4 s for every note (one gain per note), peaks kept under 0.95
    target_rms = 10 ** (-18 / 20)
    index = {}
    for m, x in clips.items():
        rms = np.sqrt(np.mean(x[:int(0.4 * SR)] ** 2)) + 1e-12
        y = x * target_rms / rms
        p = np.max(np.abs(y))
        if p > 0.95:
            y *= 0.95 / p
        name = f'{m}.mp3'
        write_mp3(y, os.path.join(out_dir, name))
        index[m] = name
    with open(os.path.join(out_dir, 'index.json'), 'w') as fh:
        json.dump(index, fh)
    size = sum(os.path.getsize(os.path.join(out_dir, f)) for f in os.listdir(out_dir))
    print(f'{sound}: {len(index)} notes, {size // 1024} KB')
