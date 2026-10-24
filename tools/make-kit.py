"""Build KGuitar's recorded drum kit (public/samples/drums/) from the AVL Drumkits by Glen MacArthur.

AVL Drumkits: real Pearl / Ludwig / Sabian / Zildjian kits, 5 velocity layers per piece, licensed CC BY-SA 3.0
(https://github.com/studiorack/avl-drumkits, http://www.bandshed.net/avldrumkits/). The trimmed MP3s this script writes
are adaptations of those samples and stay under the same licence; they are credited in the app (Settings -> Credits).

Run:  git clone https://github.com/studiorack/avl-drumkits  &&  python3 tools/make-kit.py <path to avl-drumkits>
Each piece is trimmed to start on its hit, shortened with a fade, levelled, and saved as small mono MP3s per velocity
layer; index.json lists {piece: [file per layer, soft to loud]}. The app picks a layer from how hard a hit is.
"""
import json
import os
import subprocess
import sys

import numpy as np
from scipy.signal import lfilter

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from guitar_di import shelf, peaking, biquad_hp  # noqa: E402

# piece: (source name, layers to keep, seconds kept, target RMS dB over the first 100 ms)
PIECES = {
    'kick': ('36-Pearl22Kick', [1, 2, 3, 4, 5], 0.55, -12),
    'kickbig': ('36-Ludwig26Kick', [2, 3, 4, 5], 0.75, -12),
    'kickmetal': ('36-Pearl22Kick', [4, 5], 0.2, -12),
    'snare': ('38-PorkpieSnare', [1, 2, 3, 4, 5], 0.55, -13),
    'snaretight': ('38-PearlSnare', [1, 2, 3, 4, 5], 0.35, -13),
    'rim': ('37-SideStick', [2, 3, 4, 5], 0.25, -16),
    'hat': ('42-SabianRockHatClosed', [1, 2, 3, 4, 5], 0.3, -22),
    'pedal': ('44-SabianRockHatPedal', [2, 4], 0.3, -24),
    'open': ('46-SabianRockHatSemiOpen', [2, 3, 5], 0.6, -20),
    'ride': ('51-SabianAAX20Ride', [3, 4, 5], 2.0, -22),
    'ridejazz': ('51-ZildjianA24Ride', [1, 3, 5], 2.4, -24),
    'bell': ('53-SabianAAX20RideBell', [2, 3, 5], 1.4, -20),
    'crash': ('49-SabianAA16Crash', [3, 4, 5], 2.4, -16),
    'tom1': ('45-Pearl12Tom', [2, 3, 5], 0.9, -13),
    'tom2': ('47-Pearl13Tom2', [2, 3, 5], 0.9, -13),
    'tom3': ('41-Pearl16FloorTom', [2, 3, 5], 1.1, -13),
    'clap': ('39-HandClap', [3, 5], 0.4, -16),
    'tamb': ('54-Tambourine', [2, 4], 0.35, -20),
    'cowbell': ('56-Cowbell', [3, 5], 0.35, -18),
    'shaker': ('64-Maraca', [2, 4], 0.18, -24),
    'roto1': ('61-RotoTomHi', [3, 5], 0.6, -15),
    'roto2': ('62-RotoTomMid', [3, 5], 0.5, -15),
    'roto3': ('63-RotoTomLo', [3, 5], 0.6, -15),
}


def load(path):
    r = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                       capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.float32).astype(np.float64)


def metal_kick(x):
    """Modern metal kick: more beater click, less boom and mud, a short tail (cuts through fast double bass)."""
    x = lfilter(*shelf(3500, 9, high=True), x)
    x = lfilter(*peaking(380, 1.0, -7), x)
    x = lfilter(*peaking(90, 1.2, 3), x)
    x = lfilter(*biquad_hp(55), x)
    x = lfilter(*biquad_hp(55), x)
    # gate: the boom dies quickly so sixteenth notes stay separate
    t = np.arange(len(x)) / SR
    return x * np.where(t < 0.06, 1.0, np.exp(-(t - 0.06) / 0.04))


def write_mp3(y, path, kbps=96):
    pcm = (np.clip(y, -1, 1) * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-ar', '44100', '-b:a', f'{kbps}k', path], input=pcm, check=True)


def main(src):
    out_dir = os.path.join(ROOT, 'public', 'samples', 'drums')
    os.makedirs(out_dir, exist_ok=True)
    for f in os.listdir(out_dir):
        os.remove(os.path.join(out_dir, f))
    index = {}
    for piece, (name, layers, secs, target) in PIECES.items():
        files = []
        for L in layers:
            x = load(os.path.join(src, 'Samples', f'{name}-{L}.flac'))
            if piece == 'kickmetal':
                x = metal_kick(x)
            pk = np.max(np.abs(x))
            on = max(0, int(np.argmax(np.abs(x) > 0.05 * pk)) - int(0.001 * SR))
            x = x[on:on + int(secs * SR)].copy()
            fade = int(min(0.25, secs * 0.3) * SR)
            x[-fade:] *= np.cos(np.linspace(0, np.pi / 2, fade)) ** 2
            rms = np.sqrt(np.mean(x[:int(0.1 * SR)] ** 2)) + 1e-12
            x *= 10 ** (target / 20) / rms
            pk = np.max(np.abs(x))
            if pk > 0.97:
                x *= 0.97 / pk
            fname = f'{piece}{L}.mp3'
            write_mp3(x, os.path.join(out_dir, fname))
            files.append(fname)
        index[piece] = files
        print(piece, len(files))
    with open(os.path.join(out_dir, 'index.json'), 'w') as fh:
        json.dump(index, fh)
    size = sum(os.path.getsize(os.path.join(out_dir, f)) for f in os.listdir(out_dir))
    print(f'drums: {size // 1024} KB')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'avl-drumkits')
