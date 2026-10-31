"""Build the beat maker's instruments (public/samples/inst/<id>/) from the best free sample libraries.

Sources (all allowed in a public app; credited in Settings -> Credits):
  * Salamander Grand Piano by Alexander Holm, CC BY 3.0, as packaged in Tonejs/audio (github.com/Tonejs/audio).
  * VSCO 2 Community Edition by Versilian Studios, CC0 (github.com/sgossner/VSCO-2-CE): strings, harp, double bass,
    flute, horns, trumpet, marimba, xylophone, glockenspiel, chapel organ, upright piano.
  * MusyngKite soundfont, CC BY-SA 3.0, rendered by gleitz/midi-js-soundfonts: electric piano, honky-tonk piano,
    banjo, harmonica, steel drums, vibraphone, choir "aahs" and voice "oohs".
The MP3s written here are trimmed, levelled adaptations under each source's licence.

Run:  python3 tools/make-instruments.py <folder with vsco/, tonejs-audio/ and musyng/>
Every sample's pitch is checked against the note it is filed under (a warning is printed if it is an octave off).
"""
import base64
import json
import os
import re
import subprocess
import sys

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100
PC = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def midi_of(name):
    """'A#1', 'Db4', 'Ds1' (Salamander's s = sharp) -> MIDI number."""
    m = re.match(r'([A-G])([#bs]?)(-?\d)$', name)
    if not m:
        return None
    p = PC[m.group(1)] + {'#': 1, 's': 1, 'b': -1, '': 0}[m.group(2)]
    return (int(m.group(3)) + 1) * 12 + p


def decode_file(path):
    r = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.float32).astype(np.float64)


def decode_bytes(b):
    r = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', 'pipe:0', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], input=b, capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.float32).astype(np.float64)


def pitch_ratio(x, midi):
    """How the sample's pitch compares with its name: 1 = right, 2 = an octave higher, 0.5 = lower (harmonic sum)."""
    seg = x[int(0.08 * SR): int(0.08 * SR) + 16384]
    if len(seg) < 4096:
        return 1
    seg = seg * np.hanning(len(seg))
    spec = np.abs(np.fft.rfft(seg, 65536))
    freqs = np.fft.rfftfreq(65536, 1 / SR)
    exp = 440 * 2 ** ((midi - 69) / 12)

    def score(f):
        s = 0
        for h in range(1, 9):
            i = int(np.argmin(np.abs(freqs - f * h)))
            if i >= len(spec) - 3:
                break
            s += spec[max(0, i - 2): i + 3].max() / h ** 0.5
        return s
    cands = {r: score(exp * r) for r in [0.5, 1, 2]}
    return max(cands, key=cands.get)


def write_mp3(y, path):
    pcm = (np.clip(y, -1, 1) * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-b:a', '80k', path], input=pcm, check=True)


def shape(x, secs, target):
    pk = np.max(np.abs(x[: SR // 3])) if len(x) else 0
    if pk <= 0:
        return None
    start = max(0, int(np.argmax(np.abs(x) > pk * 0.02)) - 40)
    y = x[start: start + int(secs * SR)].copy()
    if len(y) < SR // 10:
        return None
    fade = int(len(y) * 0.2)
    y[-fade:] *= np.linspace(1, 0, fade) ** 2
    rms = np.sqrt(np.mean(y[: SR // 2] ** 2)) + 1e-9
    y *= 10 ** (target / 20) / rms
    peak = np.max(np.abs(y))
    if peak > 0.95:
        y *= 0.95 / peak
    return y


def pick_every(notes, step=3, lo=0, hi=127):
    """Keep notes at least `step` semitones apart (sources often sample every 1-2 semitones)."""
    out, last = {}, -99
    for m in sorted(notes):
        if lo <= m <= hi and m - last >= step:
            out[m] = notes[m]
            last = m
    return out


def from_files(folder, pattern, prefer=None, shift=0):
    """{midi: path} for files whose name holds a note; `prefer` ranks alternatives (lower = better). `shift`: VSCO
    names most of its notes an octave low (middle C = C3); every sample's real pitch was measured to set it."""
    found = {}
    for f in sorted(os.listdir(folder)):
        if not f.lower().endswith(('.wav', '.mp3', '.flac')):
            continue
        m = re.search(pattern, f)
        if not m:
            continue
        midi = midi_of(m.group(1))
        if midi is None:
            continue
        midi += shift
        rank = prefer(f) if prefer else 0
        if midi not in found or rank < found[midi][0]:
            found[midi] = (rank, os.path.join(folder, f))
    return {m: p for m, (r, p) in found.items()}


def from_musyng(path):
    text = open(path, encoding='utf8').read()
    return {midi_of(n): ('b64', d) for n, d in re.findall(r'"([A-G]b?\d)":\s*"data:audio/mp3;base64,([^"]+)"', text) if midi_of(n) is not None}


def build(app_id, sources, secs, target, check=True):
    out_dir = os.path.join(ROOT, 'public', 'samples', 'inst', app_id)
    os.makedirs(out_dir, exist_ok=True)
    for f in os.listdir(out_dir):
        os.remove(os.path.join(out_dir, f))
    index = {}
    warn = []
    for m, src in sorted(sources.items()):
        x = decode_bytes(base64.b64decode(src[1])) if isinstance(src, tuple) else decode_file(src)
        if check and m < 84:  # the top notes' harmonics run past the analysis, so they aren't checked
            r = pitch_ratio(x, m)
            if r != 1:
                warn.append(f'{m}:x{r:g}')
        y = shape(x, secs, target)
        if y is None:
            continue
        write_mp3(y, os.path.join(out_dir, f'{m}.mp3'))
        index[str(m)] = f'{m}.mp3'
    with open(os.path.join(out_dir, 'index.json'), 'w') as fh:
        json.dump(index, fh)
    size = sum(os.path.getsize(os.path.join(out_dir, f)) for f in os.listdir(out_dir))
    print(f'{app_id:11s} {len(index):2d} notes {size // 1024:4d} KB  {"pitch check: " + " ".join(warn) if warn else ""}')


def main(src):
    V = os.path.join(src, 'vsco')
    T = os.path.join(src, 'tonejs-audio', 'salamander')
    M = os.path.join(src, 'musyng')
    dyn = lambda order: (lambda f: next((i for i, k in enumerate(order) if k in f), 9))

    build('grand', pick_every(from_files(T, r'^([A-G]s?\d)\.mp3$'), 3, 33, 96), 4.0, -20)
    up = {}
    chart = dict(l.strip().split('=') for l in open(os.path.join(V, 'Keys/Upright Piano/MappingChart.txt')) if '=' in l and l[0].isdigit())
    for f in os.listdir(os.path.join(V, 'Keys/Upright Piano')):
        m = re.match(r'Player_dyn2_rr1_(\d{3})\.wav', f)
        if m and m.group(1) in chart:
            up[int(chart[m.group(1)])] = os.path.join(V, 'Keys/Upright Piano', f)
    build('upright', pick_every(up, 3, 33, 96), 3.5, -20)
    organ = {}
    for f in os.listdir(os.path.join(V, 'Keys/Organ/Loud')):
        m = re.match(r'Rode_Man3Open_(\d+)\.wav', f)
        if m:
            organ[36 + int(m.group(1)) - 1] = os.path.join(V, 'Keys/Organ/Loud', f)
    build('church', pick_every(organ, 3, 36, 96), 3.5, -22)
    # the string section: cellos low, violas in the middle, violins on top
    strings = {}
    strings.update({m: p for m, p in from_files(os.path.join(V, 'Strings/Cello Section/susvib'), r'_([A-G]#?\d)_', dyn(['_v2', '_v1', '_v3']), shift=12).items() if m < 55})
    strings.update({m: p for m, p in from_files(os.path.join(V, 'Strings/Viola Section/susvib'), r'_([A-G]#?\d)_', dyn(['_v2', '_v1']), shift=12).items() if 55 <= m < 67})
    strings.update({m: p for m, p in from_files(os.path.join(V, 'Strings/Violin Section/susVib'), r'_([A-G]#?\d)_', dyn(['_v2', '_v1']), shift=12).items() if m >= 67})
    build('strings', pick_every(strings, 3, 36, 96), 4.0, -21)
    build('fiddle', pick_every(from_files(os.path.join(V, 'Strings/Solo Violin/Arco Vib'), r'_([A-G]#?\d)_', dyn(['_f', '_p'])), 3, 55, 96), 3.5, -21)
    build('cellos', pick_every(from_files(os.path.join(V, 'Strings/Cello Section/susvib'), r'_([A-G]#?\d)_', dyn(['_v2', '_v1', '_v3']), shift=12), 3, 36, 72), 4.0, -21)
    pizz = {m: p for m, p in from_files(os.path.join(V, 'Strings/Violin Section/Pizz'), r'_([A-G]#?\d)_', dyn(['_v2_rr1', '_v1_rr1', 'rr1']), shift=12).items()}
    build('pizz', pick_every(pizz, 3, 55, 96), 1.4, -20)
    build('harp', pick_every(from_files(os.path.join(V, 'Strings/Harp'), r'_([A-G]#?\d)_'), 3, 28, 103), 3.0, -20)
    build('upbass', pick_every(from_files(os.path.join(V, 'Strings/Solo Contrabass/Pizz'), r'_([A-G]#?\d)_', dyn(['_v3_rr1', '_v2_rr1', '_v1_rr1', 'rr1']), shift=12), 3, 24, 60), 1.8, -19)
    build('flute', pick_every(from_files(os.path.join(V, 'Woodwinds/Flute/susvib'), r'_([A-G]#?\d)_', shift=12), 3, 59, 96), 3.0, -21)
    build('horns', pick_every(from_files(os.path.join(V, 'Brass/F Horn/sus'), r'_([A-G]#?\d)_', dyn(['_v2', '_v3', '_v1']), shift=12), 3, 34, 77), 3.0, -21)
    build('trumpet', pick_every(from_files(os.path.join(V, 'Brass/Trumpet/sus'), r'_([A-G]#?\d)_', dyn(['_v3', '_v1']), shift=12), 3, 52, 84), 2.5, -21)
    build('marimba', from_files(os.path.join(V, 'Percussion/Marimba'), r'_([A-G]#?\d)_', shift=12), 1.6, -20)
    build('xylo', from_files(os.path.join(V, 'Percussion/Xylo'), r'_([A-G]#?\d)_', shift=12), 1.2, -21)
    build('glock', from_files(os.path.join(V, 'Percussion/Glock'), r'_([A-G]#?\d)\.wav', shift=12), 2.5, -22)
    for app_id, name, lo, hi, secs, target in [
        ('epiano', 'electric_piano_1', 36, 93, 3.0, -20), ('honky', 'honkytonk_piano', 36, 93, 3.0, -20),
        ('banjo', 'banjo', 48, 84, 2.0, -20), ('harmonica', 'harmonica', 55, 88, 2.5, -21),
        ('steeldrums', 'steel_drums', 48, 90, 2.0, -20), ('vibes', 'vibraphone', 48, 93, 3.0, -21),
        ('choir', 'choir_aahs', 45, 84, 4.0, -22), ('voices', 'voice_oohs', 45, 84, 4.0, -22),
    ]:
        build(app_id, pick_every(from_musyng(os.path.join(M, name + '-mp3.js')), 3, lo, hi), secs, target)


if __name__ == '__main__':
    main(sys.argv[1])
