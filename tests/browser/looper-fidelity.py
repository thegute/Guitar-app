"""How close the looper's take / output is to what was played (looper-fidelity.cjs).
  python3 tests/browser/looper-fidelity.py <input.wav> <take.wav or out.wav>
Finds where in the input the recording starts, then compares the two frame by frame (log spectrum, 60 Hz-8 kHz):
match 1.0 = the same sound, a garbled or smeared copy scores well under 0.9. Also level, clipping and stereo width."""
import sys, wave, numpy as np
def load(f):
    w = wave.open(f); n = w.getnframes(); c = w.getnchannels(); sr = w.getframerate()
    a = np.frombuffer(w.readframes(n), '<i2').astype(np.float32).reshape(-1, c) / 32768
    return a, sr
src, sr1 = load(sys.argv[1]); rec, sr2 = load(sys.argv[2])
assert sr1 == sr2, (sr1, sr2)
sr = sr1
s = np.concatenate([src, src, src])[:, 0]
r = rec[:, 0]
# where the recording starts in the (looping) input: the full cross-correlation (FFT) of the first 2 s of it
seg = r[: sr * 2]
n = 1 << int(np.ceil(np.log2(len(s) + len(seg))))
cc = np.fft.irfft(np.fft.rfft(s, n) * np.conj(np.fft.rfft(seg, n)), n)[: len(s) - len(seg)]
off = int(np.argmax(cc[: len(src)]))
N, H = 2048, 512
win = np.hanning(N)
f = np.fft.rfftfreq(N, 1 / sr); band = (f > 60) & (f < 8000)
def spec(x): return np.array([np.log10(np.abs(np.fft.rfft(x[i:i + N] * win))[band] + 1e-6) for i in range(0, len(x) - N, H)])
L = min(len(r), len(s) - off)
A, B = spec(s[off:off + L]), spec(r[:L])
loud = A.max(1) > A.max() - 3
m = np.array([np.corrcoef(a, b)[0, 1] for a, b in zip(A[loud], B[loud])])
peak = np.abs(rec).max()
side = (rec[:, 0] - rec[:, 1]) if rec.shape[1] > 1 else np.zeros(len(rec)); mid = rec[:, 0] + (rec[:, 1] if rec.shape[1] > 1 else rec[:, 0])
sside = (src[:, 0] - src[:, 1]); smid = src[:, 0] + src[:, 1]
print(f'starts {off / sr:.3f} s into the input; spectral match median {np.median(m):.3f}, worst 10% {np.percentile(m, 10):.3f} over {len(m)} frames')
print(f'peak {20 * np.log10(peak + 1e-9):.1f} dBFS, clipped samples {(np.abs(rec) > 0.98).sum()}, stereo width (side/mid) {np.std(side) / (np.std(mid) + 1e-9):.3f} vs input {np.std(sside) / np.std(smid):.3f}')
