# Songs with a known beat grid (strummed chords from the recorded banks, with or without the recorded drum kit), for tempo tests.
import json, subprocess, numpy as np, random, os
SR = 22050
S = '/home/claude/guitar-app/public/samples/'
cache = {}
def dec(p):
    if p not in cache:
        b = subprocess.run(['ffmpeg','-v','quiet','-i',p,'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True,check=True).stdout
        cache[p] = np.frombuffer(b, np.float32).copy()
    return cache[p]
def bank(name):
    idx = json.load(open(S+name+'/index.json')); flat = idx.get('notes', idx)
    return {int(k): S+name+'/'+v for k, v in flat.items() if str(k).isdigit()}
def mix(buf, x, t, g, ring):
    i0 = int(t*SR); n = min(len(x), int(ring*SR), len(buf)-i0)
    if n > 0: buf[i0:i0+n] += x[:n]*g
random.seed(9); rng = np.random.default_rng(3)
out = []
CH = [[40,47,52,56,59,64],[45,52,57,61,64],[43,47,50,55,59,67],[50,57,62,66]]
for name, bpm, meter, drums, sub, swing in [('acoustic',72,4,False,2,0),('acoustic',96,4,True,2,0),('clean',120,4,True,2,0),('j45',138,4,False,2,0),
                                    ('acoustic',90,3,False,1,0),('clean',150,3,True,1,0),('crunch',104,4,True,2,0),('nylon',84,4,False,4,0),
                                    ('acoustic',112,4,True,2,0.18),('electric',66,4,True,2,0)]:
    spb = 60/bpm; secs = 32; buf = np.zeros(int(secs*SR), np.float32)
    b = bank(name); keys = sorted(b)
    t0 = 0.6 + random.random()*0.5
    beats = []; downs = []
    nb = int((secs - 1.5)/spb)
    for i in range(nb):
        t = t0 + i*spb; beats.append(t)
        if i % meter == 0: downs.append(t)
        ch = CH[(i // meter) % 4]
        for s in range(sub):
            ts = t + s*spb/sub + (swing*spb/2 if s % 2 == 1 and sub == 2 else 0)
            accent = 1.0 if (i % meter == 0 and s == 0) else 0.75 if s == 0 else 0.5
            notes = ch if (s == 0) else ch[-3:]
            for k, m in enumerate(notes if s % 2 == 0 else list(reversed(notes))):
                near = min(keys, key=lambda x: abs(x-m)); mix(buf, dec(b[near]), ts + k*0.008, accent*0.35, spb/sub*1.2)
        if drums:
            mix(buf, dec(S+'drums/'+('kick3.mp3' if (i % meter) in (0, 2 if meter == 4 else 0) else 'snare3.mp3' if meter == 4 else 'hat3.mp3')), t, 0.6, 0.6)
            for s in range(2): mix(buf, dec(S+'drums/hat3.mp3'), t + s*spb/2 + (swing*spb/2 if s else 0), 0.25, 0.2)
    buf += rng.normal(0, 0.003, len(buf)).astype(np.float32)
    buf /= np.abs(buf).max()/0.8
    n = f'{name}-{bpm}-{meter}{"-drums" if drums else ""}{"-swing" if swing else ""}'
    np.save(f'/tmp/claude-0/bench/rhythm/{n}.npy', buf)
    out.append({'name': n, 'bpm': bpm, 'meter': meter, 'beats': beats, 'downbeats': downs})
json.dump(out, open('/tmp/claude-0/bench/rhythm/meta.json','w'))
print(len(out), [o['name'] for o in out])
