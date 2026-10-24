"""Check a recording of the app's own output (tests/browser/sound-capture.cjs): loudness, clipping, balance between
bass / guitar / cymbals, how steady the beat is, and a spectrogram picture to look at.
Run: python3 tools/analyse-capture.py tests/browser/out/sound-metal.webm [bpm]
"""
import subprocess
import sys

import numpy as np

SR = 48000


def load(path, ch=1):
    r = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-ac', str(ch), '-ar', str(SR), '-f', 'f32le', '-'],
                       capture_output=True, check=True)
    x = np.frombuffer(r.stdout, dtype=np.float32).astype(np.float64)
    return x.reshape(-1, ch) if ch > 1 else x


def bands(x):
    S = np.abs(np.fft.rfft(x * np.hanning(len(x)))) ** 2
    f = np.fft.rfftfreq(len(x), 1 / SR)
    tot = S.sum() + 1e-20
    out = {}
    for name, a, b in [('sub <60', 0, 60), ('bass 60-200', 60, 200), ('low-mid 200-800', 200, 800),
                       ('mid 0.8-3k', 800, 3000), ('presence 3-6k', 3000, 6000), ('air 6k+', 6000, 24000)]:
        out[name] = 10 * np.log10(S[(f >= a) & (f < b)].sum() / tot + 1e-20)
    return out


def onsets(x, hop=256):
    n = 1024
    prev = None
    flux = []
    for i in range(0, len(x) - n, hop):
        S = np.log1p(30 * np.abs(np.fft.rfft(x[i:i + n] * np.hanning(n))))
        flux.append(0 if prev is None else np.maximum(0, S - prev).sum())
        prev = S
    flux = np.array(flux)
    med = np.convolve(flux, np.ones(31) / 31, mode='same')
    pk = [i for i in range(1, len(flux) - 1) if flux[i] > flux[i - 1] and flux[i] >= flux[i + 1] and flux[i] > med[i] * 1.6 + 1]
    return np.array(pk) * hop / SR


def main(path, bpm=None):
    st = load(path, 2)[int(0.3 * SR):]  # skip the recorder's start
    x = st.mean(axis=1)
    pk = np.max(np.abs(st))
    # loudness over both ears; width = how much differs between left and right
    rms = 20 * np.log10(np.sqrt(np.mean(st ** 2)) + 1e-12)
    side = np.mean(((st[:, 0] - st[:, 1]) / 2) ** 2) / (np.mean(st ** 2) + 1e-20)
    print(f'  stereo width {side * 100:.0f}% of the energy is left/right difference')
    clip = np.mean(np.abs(x) > 0.99) * 100
    win = int(0.5 * SR)
    levels = [20 * np.log10(np.sqrt(np.mean(x[i:i + win] ** 2)) + 1e-12) for i in range(0, len(x) - win, win)]
    print(f'{path}: {len(x) / SR:.1f}s  rms {rms:.1f} dBFS  peak {pk:.2f}  clipped {clip:.3f}%  '
          f'half-second levels {min(levels):.0f}..{max(levels):.0f} dB')
    print('  balance:', '  '.join(f'{k} {v:+.0f}' for k, v in bands(x).items()))
    if bpm:
        on = onsets(x)
        spb = 60 / bpm
        sub = spb / 4
        # how far onsets sit from the nearest sixteenth, after finding the best grid offset
        best = None
        for off in np.linspace(0, sub, 48, endpoint=False):
            d = ((on - off + sub / 2) % sub) - sub / 2
            score = np.median(np.abs(d))
            if best is None or score < best[0]:
                best = (score, off, d)
        print(f'  onsets {len(on)}, median distance from the 16th grid {best[0] * 1000:.1f} ms, '
              f'90th pct {np.percentile(np.abs(best[2]), 90) * 1000:.1f} ms')
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(2, 1, figsize=(12, 5))
        ax[0].specgram(x, NFFT=2048, Fs=SR, noverlap=1536, cmap='magma', vmin=-130)
        ax[0].set_ylim(0, 12000)
        ax[0].set_title(path.split('/')[-1], fontsize=8)
        t = np.arange(len(x)) / SR
        ax[1].plot(t, x, lw=0.3)
        ax[1].set_xlim(0, t[-1])
        plt.tight_layout()
        png = path.rsplit('.', 1)[0] + '.png'
        plt.savefig(png, dpi=70)
        print('  picture:', png)
    except ImportError:
        pass


if __name__ == '__main__':
    main(sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else None)
