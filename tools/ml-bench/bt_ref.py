# Reference Beat This! pipeline: the official LogMelSpect (torchaudio), the official chunking (split_piece /
# aggregate_prediction, copied) and the official "minimal" postprocessing (copied), running the ONNX weights.
import sys, json, numpy as np, torch, torchaudio, onnxruntime as ort, mir_eval
import torch.nn.functional as F
sys.path.insert(0, '/tmp/claude-0/ref')
from preprocessing import LogMelSpect
sess = ort.InferenceSession('/tmp/claude-0/models/beat_this.onnx')
spect_fn = LogMelSpect()

def zeropad(s, left=0, right=0): return s if left == 0 and right == 0 else F.pad(s, (0, 0, left, right), 'constant', 0)
def split_piece(spect, chunk_size, border_size=6, avoid_short_end=True):
    starts = np.arange(-border_size, len(spect) - border_size, chunk_size - 2 * border_size)
    if avoid_short_end and len(spect) > chunk_size - 2 * border_size: starts[-1] = len(spect) - (chunk_size - border_size)
    chunks = [zeropad(spect[max(st, 0): min(st + chunk_size, len(spect))], left=max(0, -st), right=max(0, min(border_size, st + chunk_size - len(spect)))) for st in starts]
    return chunks, starts
def aggregate(preds, starts, full, chunk, border):
    preds = [{'beat': p['beat'][border:-border], 'downbeat': p['downbeat'][border:-border]} for p in preds]
    b = torch.full((full,), -1000.0); d = torch.full((full,), -1000.0)
    for st, p in zip(reversed(list(starts)), reversed(preds)):  # keep_first
        b[st + border: st + chunk - border] = p['beat']; d[st + border: st + chunk - border] = p['downbeat']
    return b, d
def dedup(peaks, width=1):
    res = []; peaks = list(map(int, peaks))
    if not peaks: return np.array(res)
    p = peaks[0]; c = 1
    for p2 in peaks[1:]:
        if p2 - p <= width: c += 1; p += (p2 - p) / c
        else: res.append(p); p = p2; c = 1
    res.append(p); return np.array(res)
def minimal(beat, down, fps=50):
    out = []
    for x in (beat, down):
        x = x[None, None]
        pk = (x == F.max_pool1d(x, 7, 1, 3)) & (x > 0)
        out.append(dedup(torch.nonzero(pk[0, 0]).numpy()[:, 0]) / fps)
    bt, dt = out
    if len(bt): dt = np.unique(np.array([bt[np.argmin(np.abs(bt - d))] for d in dt]))
    return bt, dt

def run(x, sr):
    if sr != 22050: x = torchaudio.functional.resample(torch.tensor(x), sr, 22050).numpy()
    spect = spect_fn(torch.tensor(x, dtype=torch.float32))
    chunks, starts = split_piece(spect, 1500, 6)
    preds = []
    for c in chunks:
        b, d = sess.run(None, {'spect': c[None].numpy()})
        preds.append({'beat': torch.tensor(b[0]), 'downbeat': torch.tensor(d[0])})
    b, d = aggregate(preds, starts, spect.shape[0], 1500, 6)
    return spect.numpy(), b.numpy(), d.numpy(), minimal(b, d)

if __name__ == '__main__':
    meta = json.load(open('/tmp/claude-0/bench/rhythm/meta.json'))
    res = {}
    for m in meta:
        x = np.load(f"/tmp/claude-0/bench/rhythm/{m['name']}.npy")
        spect, b, d, (bt, dt) = run(x, 22050)
        f = mir_eval.beat.f_measure(np.array(m['beats']), bt)
        fd = mir_eval.beat.f_measure(np.array(m['downbeats']), dt)
        ibi = np.median(np.diff(bt)) if len(bt) > 2 else 0
        bpm = 60 / ibi if ibi else 0
        per = np.round(np.median(np.diff(dt)) / ibi) if len(dt) > 2 and ibi else 0
        print(f"{m['name']:28s} beats F {f:.2f}  downbeats F {fd:.2f}  bpm {bpm:6.1f} (true {m['bpm']})  beats/bar {per:.0f} (true {m['meter']})")
        res[m['name']] = {'beats': bt.tolist(), 'downbeats': dt.tolist(), 'beatLogits': b[:400].tolist(), 'spect0': spect[:3].tolist(), 'spect200': spect[200].tolist()}
    json.dump(res, open('/tmp/claude-0/bench/rhythm/ref.json', 'w'))
