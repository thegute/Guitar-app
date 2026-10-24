"""Render KGuitar's amp and acoustic tones from the owner's own gear: NAM amp captures and cab / body impulse responses.

The gear files stay on the owner's computer; only the finished notes (small MP3s) are written to public/samples/<tone>/.
Run:  python3 tools/render_tones.py --gear "<folder with 'Amp Models & Presets' and 'IR'>" [tone ...]

Chain per note: modelled guitar string (tools/guitar_di.py) -> optional boost -> amp (NAM capture or a clean preamp)
-> cab / body impulse response -> a little room -> level match -> MP3.
Tones with an amp also get palm-muted notes and power chords (rendered as whole chords so the amp distorts them together).
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import fftconvolve, resample_poly

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from guitar_di import SR, filt, biquad_hp, biquad_lp, peaking, shelf, pluck, strum_notes, place  # noqa: E402
from nam_render import NamWaveNet  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AMPS = 'Amp Models & Presets/Peavey 5150BL IR'
IR = {
    'mes412': 'IR/York Audio - MES 412 OS-V2 (metal)/48k (Fractal, Line 6, etc.)/Mixes/YA MES 412 OS Mix 05.wav',
    'v30': 'IR/CALYPSO-V30 IR/V30-SM57-COD.wav',
    'deluxe': "IR/TONE FACTOR - XR IR PACK - 66 DELUXE REVERB 1x12 - V1-1/Impulse Responses/48 kHz - Fractal, Line 6, ACS1, etc/Tone Factor Starters/TF 66 DR 1X12 JENSN C12NA - 57 R121 70-30.wav",
    'tworock': 'IR/Tone Factor TWO ROCK 65B 2x12OB XR IR Pack v1.1 WAV/XR IRs/96k/Tone Factor Starters/TF TWOROCK 2X12OB 65B - 57 R121 70-30.wav',
    'j45': 'IR/PastToFutureReverbs Gibson J-45 Acoustic Guitar Impulse Responses! Impulse Responses (IRs) WAV/Gibson J45 M147 U47 Schoeps 3 Mics.wav',
}

TONES = {
    # modern metal: tube-screamer style boost into the 5150 lead channel, Mesa 4x12 cab
    'metal': dict(amp='MirrorProfiles 5150 Block Letter RED 1.nam', boost=True, ir='mes412', pickup='bridge', di=0.30,
                  notes=range(36, 88, 2), pm=range(36, 66, 2), power=range(36, 64, 2), room=0.05, dur=3.0),
    # rock crunch: the 5150's British-voiced green channel with the guitar volume rolled back a little, V30 cab
    'crunch': dict(amp='MirrorProfiles 5150 Brit Vintage Green Crunch.nam', boost=False, ir='v30', pickup='bridge', di=0.13,
                   notes=range(36, 88, 3), pm=range(36, 66, 3), power=range(36, 64, 2), room=0.07, dur=3.0),
    # clean electric: neck single coil, a clean preamp, the '66 Deluxe Reverb 1x12 cab and a touch of spring-ish room
    'clean': dict(amp=None, ir='deluxe', pickup='neck_single', hardness=1.5, di=0.35, notes=range(36, 88, 3), room=0.12, dur=3.2),
    # steel-string acoustic: undersaddle signal through the Gibson J-45 body and mics
    'j45': dict(amp=None, ir='j45', pickup='piezo', hardness=3.2, di=0.5, notes=range(36, 88, 3), room=0.0, dur=3.2, acoustic=True),
}


def load_ir(path, max_s=0.25):
    sr, x = wavfile.read(path)
    if x.dtype.kind == 'i':
        x = x / float(np.iinfo(x.dtype).max)
    x = np.asarray(x, dtype=np.float64)
    if x.ndim > 1:
        x = x.mean(axis=1)
    if sr != SR:
        from math import gcd
        g = gcd(int(sr), SR)
        x = resample_poly(x, SR // g, int(sr) // g)
    # drop any pre-delay so every tone speaks at the same moment
    start = max(0, int(np.argmax(np.abs(x) > 0.1 * np.max(np.abs(x)))) - 24)
    x = x[start:]
    n = min(len(x), int(max_s * SR))
    x = x[:n].copy()
    fade = int(0.02 * SR)
    x[-fade:] *= np.linspace(1, 0, fade)
    return x / np.sqrt(np.sum(x ** 2))  # unit energy


def room_ir(t60=0.9, seed=3):
    """A small diffuse room: decaying noise, darker as it decays."""
    rng = np.random.default_rng(seed)
    n = int(t60 * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n) * 10 ** (-3 * t / t60)
    noise = filt(noise, biquad_lp(5000, 0.7))
    noise = filt(noise, biquad_hp(250))
    pre = int(0.012 * SR)
    out = np.concatenate([np.zeros(pre), noise])
    return out / np.sqrt(np.sum(out ** 2))


def boost(x):
    """Tube-screamer-like boost in front of a high-gain amp: trims the lows, lifts the mids, +6 dB."""
    x = filt(x, shelf(220, -9, high=False))
    x = filt(x, peaking(800, 0.8, 3))
    x = filt(x, biquad_lp(5500, 0.6))
    return x * 2.0


def clean_pre(x):
    """A clean, slightly scooped Fender-style preamp with gentle tube warmth."""
    x = filt(x, shelf(120, 2, high=False))
    x = filt(x, peaking(500, 0.7, -3.5))
    x = filt(x, shelf(3000, 6, high=True))  # the amp's bright switch
    y = np.tanh(1.6 * x + 0.12 * x * x) / 1.6
    return filt(y, biquad_hp(25))


def di_note(midi, tone, dur, mute=0.0):
    return pluck(midi, dur, pickup=tone['pickup'], mute=mute, hardness=tone.get('hardness', 1.6))


def di_power(root, tone, dur, mute=0.0):
    s = 0 if root <= 47 else 1
    f = max(0, root - (40 if s == 0 else 45))
    places = [(s, f), (s + 1, f + 2), (s + 2, f + 2)]
    return strum_notes([root, root + 7, root + 12], dur, spread=0.006, places=places, pickup='bridge', mute=mute, hardness=1.6)


class Chain:
    def __init__(self, gear, name, tone):
        self.t = tone
        self.amp = NamWaveNet(os.path.join(gear, AMPS, tone['amp'])) if tone.get('amp') else None
        self.ir = load_ir(os.path.join(gear, IR[tone['ir']]))
        self.room = room_ir() if tone.get('room') else None
        self.name = name

    def run(self, di, level):
        """di: dry signal (any level); level: peak the DI is set to before the amp."""
        pk = np.max(np.abs(di[:int(0.08 * SR)])) or 1.0
        x = di * (level / pk)
        if self.amp is not None:
            if self.t.get('boost'):
                x = boost(x)
            y = self.amp.process(x)
        elif self.t.get('acoustic'):
            y = x
        else:
            y = clean_pre(x)
        y = fftconvolve(y, self.ir)[:len(y)]
        if self.room is not None:
            y = y + self.t['room'] * fftconvolve(y, self.room)[:len(y)] * 3.0
        y = filt(y, biquad_hp(60 if self.amp is not None else 45))
        if self.amp is not None:
            y = filt(y, biquad_lp(9500, 0.7))
        return y


def finish(y, dur, fade=0.5):
    n = int(dur * SR)
    y = y[:n].copy()
    f = int(min(fade, dur * 0.4) * SR)
    y[-f:] *= np.cos(np.linspace(0, np.pi / 2, f)) ** 2
    return y


def loudness(y):
    """RMS over the first 0.35 s (the part you hear most)."""
    seg = y[:int(0.35 * SR)]
    return np.sqrt(np.mean(seg ** 2)) + 1e-12


def write_mp3(y, path, kbps=80):
    y = np.clip(y, -1, 1)
    pcm = (y * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-ar', '44100', '-b:a', f'{kbps}k', path], input=pcm, check=True)


def render(gear, name, out_root, only=None):
    tone = TONES[name]
    ch = Chain(gear, name, tone)
    out_dir = os.path.join(out_root, name)
    os.makedirs(out_dir, exist_ok=True)
    for f in os.listdir(out_dir):
        os.remove(os.path.join(out_dir, f))
    dur = tone['dur']
    groups = {'notes': [(m, lambda m=m: di_note(m, tone, dur + 0.3), dur) for m in tone['notes']]}
    if tone.get('pm'):
        groups['pm'] = [(m, lambda m=m: di_note(m, tone, 1.0, mute=0.9), 0.75) for m in tone['pm']]
    if tone.get('power'):
        groups['power'] = [(m, lambda m=m: di_power(m, tone, dur + 0.3), dur) for m in tone['power']]
        groups['powerpm'] = [(m, lambda m=m: di_power(m, tone, 1.0, mute=0.9), 0.75) for m in tone['power']]
    rendered = {}
    for g, items in groups.items():
        if only and g not in only:
            continue
        for m, make, d in items:
            di = make()
            lvl = tone['di'] * (1.25 if g.startswith('power') else 1.0) * (0.85 if g.endswith('pm') else 1.0)
            y = ch.run(di, lvl)
            rendered[(g, m)] = finish(y, d, fade=0.12 if g.endswith('pm') else 0.6)
            print(f'  {name} {g} {m}', flush=True)
    # one gain for the whole tone (so loud and soft notes keep their natural balance) plus a gentle per-note evening out
    ref = np.median([loudness(y) for (g, _), y in rendered.items() if g == 'notes'])
    target = 10 ** (-17 / 20)
    index = {}
    for (g, m), y in rendered.items():
        k = (target / ref) * (loudness(y) / ref) ** -0.5  # halve the level differences between notes
        y = y * k
        pk = np.max(np.abs(y))
        if pk > 0.95:
            y *= 0.95 / pk
        prefix = {'notes': 'n', 'pm': 'm', 'power': 'p', 'powerpm': 'q'}[g]
        fname = f'{prefix}{m}.mp3'
        write_mp3(y, os.path.join(out_dir, fname), kbps=72 if g != 'notes' else 80)
        index.setdefault(g, {})[str(m)] = fname
    with open(os.path.join(out_dir, 'index.json'), 'w') as fh:
        json.dump(index, fh)
    size = sum(os.path.getsize(os.path.join(out_dir, f)) for f in os.listdir(out_dir))
    print(f'{name}: {sum(len(v) for v in index.values())} files, {size // 1024} KB')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--gear', default=os.environ.get('KG_GEAR', '/mnt/user-data/uploads/Downloads'))
    ap.add_argument('--out', default=os.path.join(ROOT, 'public', 'samples'))
    ap.add_argument('--only', nargs='*', help='only these groups: notes pm power powerpm')
    ap.add_argument('tones', nargs='*', default=list(TONES))
    a = ap.parse_args()
    for t in a.tones:
        render(a.gear, t, a.out, a.only)
