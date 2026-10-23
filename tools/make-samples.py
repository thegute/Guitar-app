"""Prepare the recorded instrument sounds the app plays (Hear it, Jam, quizzes, tapping notes).

Takes the guitar samples from the tonejs-instruments packages (dev dependencies), keeps one note about every
three semitones (the app pitch-shifts in between), trims each to a few seconds with a fade, and writes small
mono MP3s plus an index to public/samples/<sound>/.   Run: python3 tools/make-samples.py
Samples: tonejs-instruments by Nicholaus P. Brosowsky (https://github.com/nbrosowsky/tonejs-instruments), credited in the app.
"""
import json, os, re, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCES = {
    'acoustic': 'tonejs-instrument-guitar-acoustic-mp3',
    'electric': 'tonejs-instrument-guitar-electric-mp3',
    'nylon': 'tonejs-instrument-guitar-nylon-mp3',
}
NOTE = {'C': 0, 'Cs': 1, 'D': 2, 'Ds': 3, 'E': 4, 'F': 5, 'Fs': 6, 'G': 7, 'Gs': 8, 'A': 9, 'As': 10, 'B': 11}
SECONDS = 3.2


def midi_of(name):
    m = re.match(r'^([A-G]s?)(\d)$', name)
    return 12 * (int(m.group(2)) + 1) + NOTE[m.group(1)] if m else None


for sound, pkg in SOURCES.items():
    src = os.path.join(ROOT, 'node_modules', pkg)
    have = {}
    for f in os.listdir(src):
        if f.endswith('.mp3'):
            m = midi_of(f[:-4])
            if m is not None:
                have[m] = f
    lo, hi = max(min(have), 38), min(max(have), 84)
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
    index = {}
    for m in sorted(picked):
        name = f'{m}.mp3'
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', os.path.join(src, have[m]),
                        '-af', f'atrim=0:{SECONDS},afade=t=out:st={SECONDS - 0.8}:d=0.8,loudnorm=I=-18:TP=-2',
                        '-ac', '1', '-ar', '44100', '-b:a', '80k', os.path.join(out_dir, name)], check=True)
        index[m] = name
    with open(os.path.join(out_dir, 'index.json'), 'w') as fh:
        json.dump(index, fh)
    size = sum(os.path.getsize(os.path.join(out_dir, f)) for f in os.listdir(out_dir))
    print(f'{sound}: {len(index)} notes, {size // 1024} KB')
