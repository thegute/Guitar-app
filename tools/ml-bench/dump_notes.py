import json, time, numpy as np, onnxruntime as ort, soundfile as sf, mir_eval, librosa, sys
M = '/tmp/claude-0/models/'
meta = json.load(open('/tmp/claude-0/bench/audio/meta.json'))
gaps = ort.InferenceSession(M + 'guitar_crnn.onnx')

ON, OFF, FR = float(sys.argv[1]) if len(sys.argv) > 1 else 0.3, 0.3, 0.1
STEP = int(float(sys.argv[2]) * 16000) if len(sys.argv) > 2 else 80000

def binarize(x, thr, nb):
    T, K = x.shape; out = np.zeros_like(x); sh = np.zeros_like(x)
    for k in range(K):
        v = x[:, k]
        for n in range(nb, T - nb):
            if v[n] > thr and all(v[n-i] >= v[n-i-1] and v[n+i] >= v[n+i+1] for i in range(nb)):
                out[n, k] = 1
                sh[n, k] = (v[n+1]-v[n-1])/(v[n]-v[n+1])/2 if v[n-1] > v[n+1] else (v[n+1]-v[n-1])/(v[n]-v[n-1])/2
    return out, sh

def gaps_notes(x22):
    x = librosa.resample(x22, orig_sr=22050, target_sr=16000).astype(np.float32)
    seg = 160000
    L = len(x); n_ch = max(1, int(np.ceil((L - seg) / STEP)) + 1); pad = (n_ch - 1) * STEP + seg - L
    x = np.concatenate([x, np.zeros(pad, np.float32)])
    segs = []; p = 0
    while p + seg <= len(x): segs.append(x[p:p+seg]); p += STEP
    outs = {k: [] for k in ['reg_onset_output','reg_offset_output','frame_output','velocity_output']}
    for s in segs:
        r = gaps.run(None, {'waveform': s[None]})
        for k, v in zip(outs, r): outs[k].append(v[0])
    def deframe(a):
        if len(a) == 1: return a[0]
        a = [y[:-1] for y in a]; n = a[0].shape[0]; st = STEP // 160; b = (n - st) // 2
        y = [a[0][:n-b]] + [z[b:n-b] for z in a[1:-1]] + [a[-1][b:]]
        return np.concatenate(y)
    o = {k: deframe(v)[:int(L/16000*100)+1] for k, v in outs.items()}
    on, onsh = binarize(o['reg_onset_output'], ON, 2)
    off, offsh = binarize(o['reg_offset_output'], OFF, 4)
    notes = []
    fr = o['frame_output']
    for k in range(88):
        bgn = None; fd = None; oc = None
        for i in range(fr.shape[0]):
            if on[i, k]:
                if bgn is not None: notes.append(((bgn+onsh[bgn,k])/100, k+21))
                bgn, fd, oc = i, None, None
            if bgn is not None and i > bgn:
                if fr[i, k] <= FR and fd is None: fd = i
                if off[i, k] and oc is None: oc = i
                if fd is not None or i - bgn >= 600 or i == fr.shape[0]-1:
                    notes.append(((bgn+onsh[bgn,k])/100, k+21)); bgn, fd, oc = None, None, None
    return notes

def f1(est, ref):
    if not est: return 0.0, 0.0, 0.0
    ri = np.array([[t, t+0.1] for t, m in ref]); rp = np.array([librosa.midi_to_hz(m) for t, m in ref])
    ei = np.array([[t, t+0.1] for t, m in est]); ep = np.array([librosa.midi_to_hz(m) for t, m in est])
    p, r, f, _ = mir_eval.transcription.precision_recall_f1_overlap(ri, rp, ei, ep, onset_tolerance=0.05, offset_ratio=None)
    return p, r, f


out = {}
for m in meta:
    x = np.load(f"/tmp/claude-0/bench/audio/{m['name']}.npy")
    out[m['name']] = [[float(a), int(b)] for a, b in gaps_notes(x)]
json.dump(out, open('/tmp/claude-0/bench/audio/notes_ref.json','w'))
print('dumped', len(out))
