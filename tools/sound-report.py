"""Measure sound-lab recordings (tests/browser/sound-lab.cjs) the way mastering engineers do, and compare two runs.

  python3 tools/sound-report.py tests/browser/out/lab/before                 # one run
  python3 tools/sound-report.py tests/browser/out/lab/before tests/browser/out/lab/after   # before → after

Per scene:
  LUFS-I   integrated loudness, ITU-R BS.1770-4 / EBU R128 (K-weighting, 400 ms blocks, −70 LUFS absolute and −10 LU
           relative gates)
  TP       true peak in dBTP (4× oversampled, BS.1770-4 annex 2), and how many samples go over 0 dBFS
  PLR      peak-to-loudness ratio (TP − LUFS-I): how much punch/dynamics the master leaves
  LRA      loudness range (EBU Tech 3342, 3 s short-term, 10th–95th percentile)
  corr     L/R correlation (1 = mono, ~0.3–0.8 = a healthy stereo image, < 0 = phase trouble)
  bands    share of energy: sub / bass / low-mid / mid / presence / air (dB relative to the total)
Writes report.json next to the WAVs.
"""
import glob
import json
import os
import sys

import numpy as np
from scipy.signal import bilinear, lfilter, resample_poly


def read_wav(path):
    import wave
    with open(path, 'rb') as f:
        raw = f.read()
    # our own float32 (format 3) or 16-bit PCM
    fmt = int.from_bytes(raw[20:22], 'little')
    ch = int.from_bytes(raw[22:24], 'little')
    sr = int.from_bytes(raw[24:28], 'little')
    bits = int.from_bytes(raw[34:36], 'little')
    data = raw[44:]
    if fmt == 3 and bits == 32:
        x = np.frombuffer(data, dtype='<f4').astype(np.float64)
    else:
        x = np.frombuffer(data, dtype='<i2').astype(np.float64) / 32768.0
    x = x[: len(x) // ch * ch].reshape(-1, ch)
    return x, sr


def k_weight(x, sr):
    """BS.1770-4 K-weighting for any sample rate (the 48 kHz biquads re-derived from their analogue prototypes)."""
    # stage 1: high shelf (+4 dB above ~1.5 kHz)
    f0, G, Q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
    K = np.tan(np.pi * f0 / sr)
    Vh, Vb = 10 ** (G / 20), (10 ** (G / 20)) ** 0.4996667741545416
    a0 = 1 + K / Q + K * K
    b = [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0]
    a = [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
    y = lfilter(b, a, x, axis=0)
    # stage 2: RLB high-pass (~38 Hz)
    f0, Q = 38.13547087602444, 0.5003270373238773
    K = np.tan(np.pi * f0 / sr)
    a0 = 1 + K / Q + K * K
    b = [1, -2, 1]
    a = [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
    return lfilter(b, a, y, axis=0)


def block_loudness(y, sr, win, hop):
    n = int(win * sr)
    h = int(hop * sr)
    out = []
    for s in range(0, max(1, len(y) - n + 1), h):
        z = (y[s:s + n] ** 2).mean(axis=0).sum()  # channel weights 1.0 for L and R
        out.append(-0.691 + 10 * np.log10(z + 1e-20))
    return np.array(out)


def lufs_i(x, sr):
    y = k_weight(x, sr)
    L = block_loudness(y, sr, 0.4, 0.1)
    L = L[L > -70]
    if not len(L):
        return -np.inf
    p = 10 ** ((L + 0.691) / 10)
    rel = -0.691 + 10 * np.log10(p.mean()) - 10
    L2 = L[L > rel]
    return -0.691 + 10 * np.log10((10 ** ((L2 + 0.691) / 10)).mean())


def lra(x, sr):
    y = k_weight(x, sr)
    S = block_loudness(y, sr, 3.0, 0.1)
    S = S[S > -70]
    if len(S) < 2:
        return 0.0
    rel = -0.691 + 10 * np.log10((10 ** ((S + 0.691) / 10)).mean()) - 20
    S = S[S > rel]
    return float(np.percentile(S, 95) - np.percentile(S, 10)) if len(S) > 1 else 0.0


def true_peak(x):
    up = resample_poly(x, 4, 1, axis=0)
    return 20 * np.log10(np.abs(up).max() + 1e-20)


def bands(x, sr):
    m = x.mean(axis=1)
    S = np.abs(np.fft.rfft(m * np.hanning(len(m)))) ** 2
    f = np.fft.rfftfreq(len(m), 1 / sr)
    tot = S.sum() + 1e-20
    out = {}
    for name, a, b in [('sub', 0, 60), ('bass', 60, 200), ('lowmid', 200, 800), ('mid', 800, 3000),
                       ('presence', 3000, 6000), ('air', 6000, sr / 2)]:
        out[name] = round(10 * np.log10(S[(f >= a) & (f < b)].sum() / tot + 1e-20), 1)
    return out


def measure(path):
    x, sr = read_wav(path)
    # trim leading/trailing silence (the recorder starts a little early)
    a = np.abs(x).max(axis=1)
    nz = np.where(a > 1e-4)[0]
    if not len(nz):
        return {'silent': True}
    x = x[nz[0]:nz[-1] + 1]
    if x.shape[1] == 1:
        x = np.repeat(x, 2, axis=1)
    li = lufs_i(x, sr)
    tp = true_peak(x)
    corr = float(np.corrcoef(x[:, 0], x[:, 1])[0, 1]) if x[:, 0].std() > 0 and x[:, 1].std() > 0 else 1.0
    return {
        'seconds': round(len(x) / sr, 2),
        'lufs': round(li, 1),
        'tp': round(tp, 2),
        'over0': int((np.abs(x) > 1.0).sum()),
        'plr': round(tp - li, 1),
        'lra': round(lra(x, sr), 1),
        'corr': round(corr, 2),
        'bands': bands(x, sr),
    }


def run(folder):
    res = {}
    for p in sorted(glob.glob(os.path.join(folder, '*.wav'))):
        res[os.path.basename(p)[:-4]] = measure(p)
    with open(os.path.join(folder, 'report.json'), 'w') as f:
        json.dump(res, f, indent=1)
    return res


def row(name, m):
    if m.get('silent'):
        return f'{name:22s}  (silent)'
    b = m['bands']
    return (f"{name:22s} {m['lufs']:6.1f} {m['tp']:6.2f} {m['over0']:6d} {m['plr']:5.1f} {m['lra']:5.1f} {m['corr']:5.2f}  "
            f"{b['sub']:5.1f} {b['bass']:5.1f} {b['lowmid']:5.1f} {b['mid']:5.1f} {b['presence']:5.1f} {b['air']:5.1f}")


HEAD = f"{'scene':22s} {'LUFS':>6s} {'TP':>6s} {'>0dB':>6s} {'PLR':>5s} {'LRA':>5s} {'corr':>5s}  {'sub':>5s} {'bass':>5s} {'lomid':>5s} {'mid':>5s} {'pres':>5s} {'air':>5s}"

if __name__ == '__main__':
    A = run(sys.argv[1])
    print(HEAD)
    if len(sys.argv) < 3:
        for k, m in A.items():
            print(row(k, m))
    else:
        B = run(sys.argv[2])
        for k in A:
            print(row(k + ' (before)', A[k]))
            if k in B:
                print(row(k + ' (after)', B[k]))
