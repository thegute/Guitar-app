# Test pieces from KGuitar's recorded sample banks, with the right notes known.
import json, subprocess, numpy as np, random, sys, os
SR = 22050
S = '/home/claude/guitar-app/public/samples/'
cache = {}
def dec(path):
    if path not in cache:
        b = subprocess.run(['ffmpeg','-v','quiet','-i',path,'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True,check=True).stdout
        cache[path] = np.frombuffer(b, dtype=np.float32).copy()
    return cache[path]
def bank(name):
    idx = json.load(open(S+name+'/index.json'))
    flat = idx.get('notes', idx)
    return {int(k): S+name+'/'+v for k,v in flat.items() if str(k).isdigit()}
random.seed(4)
pieces = []
def render(name, events, secs, noise=0.004, ring=1.6):
    b = bank(name); keys = sorted(b)
    buf = np.zeros(int(secs*SR), np.float32); truth = []
    for t, midis, vel in events:
        for k, m in enumerate(midis):
            near = min(keys, key=lambda x: abs(x-m))
            if abs(near-m) > 0: continue  # only notes the bank really has
            x = dec(b[near])[:int(ring*SR)]
            i0 = int((t + k*0.012)*SR)
            n = min(len(x), len(buf)-i0)
            if n <= 0: continue
            fade = np.ones(n, np.float32); f = min(n, 600); fade[-f:] = np.linspace(1,0,f)
            buf[i0:i0+n] += x[:n]*vel*fade
            truth.append((t + k*0.012, m))
    buf += np.random.default_rng(1).normal(0, noise, len(buf)).astype(np.float32)
    buf /= max(1e-6, np.abs(buf).max()) / 0.8
    return buf, truth
scale = [52,54,55,57,59,60,62,64,66,67,69,71,72,74,76]
for name in ['acoustic','j45','clean','electric','nylon','crunch']:
    if not os.path.exists(S+name+'/index.json'): continue
    for bpm, sub, kind in [(96,2,'8ths'),(120,4,'16ths')]:
        spb = 60/bpm; ev = []; t = 0.3
        notes = [random.choice(scale) for _ in range(int(14/(spb/sub)))]
        for i, m in enumerate(notes):
            ev.append((t + i*spb/sub, [m], 0.7 + 0.3*(i % sub == 0)))
        buf, truth = render(name, ev, 15, ring=spb/sub*1.6)
        pieces.append((f'{name}-melody-{kind}', buf, truth))
    # strummed chords (only for banks with plain notes)
    chords = [[40,47,52,56,59,64],[45,52,57,61,64],[43,47,50,55,59,67],[50,57,62,66]]
    ev = []; spb = 60/90
    for i in range(16): ev.append((0.3 + i*spb, chords[(i//4) % 4], 0.8))
    buf, truth = render(name, ev, 12, ring=spb*1.05)
    pieces.append((f'{name}-chords', buf, truth))
os.makedirs('/tmp/claude-0/bench/audio', exist_ok=True)
meta = []
for n, buf, truth in pieces:
    np.save(f'/tmp/claude-0/bench/audio/{n}.npy', buf)
    meta.append({'name': n, 'truth': truth})
json.dump(meta, open('/tmp/claude-0/bench/audio/meta.json','w'))
print(len(pieces), 'pieces:', ', '.join(m['name'] for m in meta))
