"""Riff Scanner bench: test pieces with the right answer known, notes AND techniques, alone and in a full band mix.

Why: the owner's real videos lose a lot of notes and never show slides, hammer-ons or pull-offs. KGuitar's sample banks
can't play legato (every sample has a pick attack), so the lead guitar here is the modelled string from guitar_di.py,
played the way a hand does it: one pick, then the pitch moves on the same vibrating string.
  h  hammer-on   pitch steps up, no pick, the string gets a little energy back, a soft thump
  p  pull-off    pitch steps down, the finger plucks a little as it leaves
  s  slide       the pitch glides fret by fret (≈ 50-110 ms) into the note, losing some energy
  b  bend        picked, then pushed up `bend` semitones over ~150 ms (br: and let back down)
  ~  vibrato     ~5.5 Hz, upward (a bend vibrato), after the note settles
Each piece is rendered as:
  dry    the lead guitar only (amp/cab + a little room)
  band   lead + drums + bass + keys + a singing voice, bus compression + reverb, then AAC 128 kbps (like a screen recording)
  buried the same band with the guitar 6 dB lower
Out: <out>/<piece>-<mix>.wav (44.1 kHz stereo) and <out>/truth.json:
  {piece: {bpm, beats_per_bar, notes: [{t, end, midi, string, fret, tech, bend?}]}}   strings 0 = low E.
Usage: python3 make_scan.py [out]   (default /tmp/claude-0/scanbench). Needs numpy, scipy, ffmpeg. Nothing here ships.
"""
import json, os, subprocess, sys
import numpy as np
from scipy.signal import lfilter, resample_poly, fftconvolve

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import guitar_di as gd  # noqa: E402

SR = 44100
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/scanbench'
SAMPLES = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'samples')
TUNING = gd.STANDARD
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- the lead guitar ---------------------------------

def to44(x):
    return resample_poly(x, 147, 160)


def env_rms(x, win):
    k = np.ones(win) / win
    return np.sqrt(np.convolve(x * x, k, mode='same') + 1e-12)


def ramp_steps(n, points, sr, ramp_s=0.004):
    """A piecewise-constant curve (value changes at sample indices) with short linear ramps."""
    y = np.ones(n)
    r = max(1, int(ramp_s * sr))
    cur = 1.0
    for i, v in sorted(points):
        i = int(np.clip(i, 0, n - 1))
        j = min(n, i + r)
        y[i:j] = np.linspace(cur, v, j - i)
        y[j:] = v
        cur = v
    return y


def render_group(notes, pickup, rng):
    """One pick and the legato notes after it, all on one string: a single vibrating string whose pitch moves."""
    sr = gd.SR
    n0 = notes[0]
    t0 = n0['t']
    end = max(n['end'] for n in notes) + 0.06
    dur = end - t0
    n = int(dur * sr)
    tt = np.arange(n) / sr
    semis = np.zeros(n)
    energy = []  # (sample, kind)
    for i, nt in enumerate(notes):
        rel = nt['midi'] - n0['midi']
        k = int((nt['t'] - t0) * sr)
        if i == 0:
            semis[:] = 0
        elif nt['tech'] == 's':
            prev = notes[i - 1]['midi'] - n0['midi']
            gap = nt['t'] - notes[i - 1]['t']
            g = float(np.clip(0.035 * abs(rel - prev) ** 0.5 + 0.03, 0.05, 0.11))
            g = min(g, 0.6 * gap)
            a, b = k - int(0.35 * g * sr), k + int(0.65 * g * sr)
            a = max(a, int((notes[i - 1]['t'] - t0) * sr) + 1)
            # fret by fret: a glide with small steps (the frets) smoothed
            ln = max(1, b - a)
            x = np.linspace(0, 1, ln)
            steps = prev + (rel - prev) * x
            frets = np.round(steps)
            smooth = 0.6 * frets + 0.4 * steps
            semis[a:b] = smooth[:max(0, min(ln, n - a))]
            semis[b:] = rel
            energy.append((a, 's'))
        else:  # h / p
            semis[k:] = rel
            energy.append((k, nt['tech']))
        if nt['tech'] in ('b', 'br'):
            amt = nt.get('bend', 2)
            a = k + int(0.03 * sr)
            rise = int(rng.uniform(0.12, 0.2) * sr)
            curve = np.zeros(n)
            seg = np.clip(np.arange(n) - a, 0, rise) / rise
            curve += amt * (0.5 - 0.5 * np.cos(np.pi * seg))
            if nt['tech'] == 'br':
                rel_at = int((nt['t'] + 0.55 * (nt['end'] - nt['t']) - t0) * sr)
                down = int(0.13 * sr)
                seg2 = np.clip(np.arange(n) - rel_at, 0, down) / down
                curve -= amt * (0.5 - 0.5 * np.cos(np.pi * seg2))
            semis += curve * (tt >= (nt['t'] - t0))
        if nt['tech'] == '~' or nt.get('vib'):
            a = k + int(0.16 * sr)
            v = np.zeros(n)
            m = np.arange(n) >= a
            depth = rng.uniform(0.25, 0.45)
            rate = rng.uniform(5.0, 6.5)
            v[m] = depth * (0.5 - 0.5 * np.cos(2 * np.pi * rate * (np.arange(n)[m] - a) / sr))
            stop = int((nt['end'] - t0) * sr)
            v[stop:] = 0
            semis += v
    ratio = 2 ** (semis / 12)
    pos = np.concatenate([[0.0], np.cumsum(ratio[:-1])])
    need = pos[-1] + 2
    base = gd.pluck(n0['midi'], need / sr + 0.1, string=n0['string'], fret=n0['fret'], pickup=pickup,
                    rng=rng, human=1.0, hardness=rng.uniform(0.8, 1.3))
    y = np.interp(pos, np.arange(len(base)), base)
    # legato energy: hammer-ons and pull-offs put some energy back; slides lose some
    e = env_rms(y, int(0.012 * sr))
    peak0 = e[:int(0.05 * sr)].max()
    pts, g = [], 1.0
    for k, kind in energy:
        cur = e[min(k, n - 1)] * g
        if kind == 'h':
            g *= max(1.0, rng.uniform(0.55, 0.75) * peak0 / max(cur, 1e-9))
        elif kind == 'p':
            g *= max(1.0, rng.uniform(0.6, 0.85) * peak0 / max(cur, 1e-9))
        else:
            g *= rng.uniform(0.75, 0.9)
        pts.append((k, g))
    y = y * ramp_steps(n, pts, sr, 0.003)
    # the hammer's thump / the finger's little pluck (much softer than a pick's click)
    for k, kind in energy:
        if kind in ('h', 'p'):
            cl = int(sr * 0.003)
            if k + cl >= n:
                continue
            click = rng.standard_normal(cl) * np.exp(-np.arange(cl) / (sr * 0.0008))
            click = gd.filt(click, gd.biquad_lp(1500 if kind == 'h' else 3500, 0.7))
            y[k:k + cl] += click * peak0 * (0.04 if kind == 'h' else 0.06)
    # the hand stops the string at the end
    stop = int((max(nt['end'] for nt in notes) - t0) * sr)
    f = int(0.03 * sr)
    y[stop:stop + f] *= np.linspace(1, 0, len(y[stop:stop + f]))
    y[stop + f:] = 0
    return t0, y


def render_lead(notes, pickup, secs, seed):
    rng = np.random.default_rng(seed)
    out = np.zeros(int(secs * gd.SR) + gd.SR)
    groups, cur = [], None
    for nt in notes:
        if nt['tech'] in ('h', 'p', 's') and cur is not None and cur[-1]['string'] == nt['string']:
            cur.append(nt)
        else:
            cur = [nt]
            groups.append(cur)
    for g in groups:
        t0, y = render_group(g, pickup, rng)
        k = int(t0 * gd.SR)
        m = min(len(y), len(out) - k)
        out[k:k + m] += y[:m] * rng.uniform(0.85, 1.1)
    return to44(out)[:int(secs * SR)]

# ---------------------------------------------------------------- amp / cab ----------------------------------------

def bq(x, ba, sr=SR):
    return lfilter(ba[0], ba[1], x)


def lp(f, q=0.707, sr=SR):
    w = 2 * np.pi * f / sr; a = np.sin(w) / (2 * q); c = np.cos(w)
    return np.array([(1 - c) / 2, 1 - c, (1 - c) / 2]) / (1 + a), np.array([1, -2 * c / (1 + a), (1 - a) / (1 + a)])


def hp(f, q=0.707, sr=SR):
    w = 2 * np.pi * f / sr; a = np.sin(w) / (2 * q); c = np.cos(w)
    return np.array([(1 + c) / 2, -(1 + c), (1 + c) / 2]) / (1 + a), np.array([1, -2 * c / (1 + a), (1 - a) / (1 + a)])


def peak(f, q, db, sr=SR):
    A = 10 ** (db / 40); w = 2 * np.pi * f / sr; a = np.sin(w) / (2 * q); c = np.cos(w)
    b = np.array([1 + a * A, -2 * c, 1 - a * A]); d = np.array([1 + a / A, -2 * c, 1 - a / A])
    return b / d[0], d / d[0]


def amp(x, tone):
    x = x / (np.abs(x).max() + 1e-9)
    if tone == 'clean':
        y = np.tanh(1.3 * x) / np.tanh(1.3)
        y = bq(y, peak(120, 0.8, 2)); y = bq(y, peak(2500, 1.0, 2)); y = bq(y, lp(5500)); y = bq(y, hp(70))
    elif tone == 'drive':
        y = bq(x, hp(300, 0.6)) * 9 + x * 1.5
        y = np.tanh(y); y = bq(y, peak(800, 0.7, 3))
        y = bq(y, lp(4200, 0.9)); y = bq(y, lp(6500)); y = bq(y, hp(90)); y = bq(y, peak(110, 1.0, 3))
    else:  # acoustic: piezo with body resonances
        y = bq(x, peak(105, 2.0, 6)); y = bq(y, peak(220, 1.5, 3)); y = bq(y, peak(2800, 1.2, 2)); y = bq(y, hp(70))
    return y / (np.abs(y).max() + 1e-9)


def reverb(x, t60, wet, seed=5):
    rng = np.random.default_rng(seed)
    n = int(t60 * SR)
    ir = rng.standard_normal((2, n)) * np.exp(-6.9 * np.arange(n) / n)
    ir = np.array([bq(bq(i, lp(6000)), hp(200)) for i in ir])
    ir[:, :int(0.012 * SR)] = 0
    ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
    xs = x if x.ndim == 2 else np.stack([x, x])
    w = np.stack([fftconvolve(xs[c], ir[c])[:xs.shape[1]] for c in range(2)])
    return xs + wet * w


def compress(x, thr_db=-18, ratio=4, att=0.005, rel=0.12):
    mono = np.abs(x).max(axis=0)
    a, r = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR))
    env = np.zeros_like(mono); e = 0.0
    for i, v in enumerate(mono):  # slow loop but only a few pieces
        e = a * e + (1 - a) * v if v > e else r * e + (1 - r) * v
        env[i] = e
    db = 20 * np.log10(env + 1e-9)
    gain = np.where(db > thr_db, (thr_db + (db - thr_db) / ratio) - db, 0)
    return x * 10 ** (gain / 20)

# ---------------------------------------------------------------- the band -----------------------------------------
_dec = {}


def dec(path):
    if path not in _dec:
        b = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
        _dec[path] = np.frombuffer(b, dtype=np.float32).copy()
    return _dec[path]


def bank_note(folder, midi, dur):
    idx = json.load(open(os.path.join(folder, 'index.json')))
    flat = {int(k): v for k, v in idx.get('notes', idx).items() if str(k).isdigit()}
    near = min(flat, key=lambda k: abs(k - midi))
    x = dec(os.path.join(folder, flat[near]))
    r = 2 ** ((midi - near) / 12)
    if abs(r - 1) > 1e-6:
        x = np.interp(np.arange(0, len(x) - 1, r), np.arange(len(x)), x)
    x = x[:int(dur * SR)].copy()
    f = min(len(x), int(0.04 * SR)); x[-f:] *= np.linspace(1, 0, f)
    return x


def place_at(buf, x, t, g=1.0):
    k = int(t * SR)
    m = min(len(x), len(buf) - k)
    if m > 0:
        buf[k:k + m] += x[:m] * g


def drums(secs, bpm, rng, feel):
    d = os.path.join(SAMPLES, 'drums')
    idx = json.load(open(os.path.join(d, 'index.json')))
    hit = lambda name, i: dec(os.path.join(d, idx[name][i % len(idx[name])]))
    buf = np.zeros(int(secs * SR)); spb = 60 / bpm
    b = 0
    while b * spb < secs:
        t = b * spb
        place_at(buf, hit('hat', b), t, 0.35); place_at(buf, hit('hat', b + 1), t + spb / 2, 0.25)
        if feel == 'busy':
            place_at(buf, hit('hat', b + 2), t + spb / 4, 0.15); place_at(buf, hit('hat', b + 3), t + 3 * spb / 4, 0.15)
        if b % 4 in (0, 2) or (feel == 'busy' and b % 4 == 3):
            place_at(buf, hit('kick', b), t + (spb / 2 if b % 4 == 3 else 0), 0.9)
        if b % 4 in (1, 3):
            place_at(buf, hit('snare', b), t, 0.75)
        if b % 16 == 0:
            place_at(buf, hit('crash', b), t, 0.4)
        b += 1
    return buf


def voice(melody, secs, rng):
    """A singing voice: sawtooth glottal source with vibrato and slides, through vowel formants that keep changing."""
    n = int(secs * SR)
    f0 = np.zeros(n); amp_ = np.zeros(n)
    for t, d, m in melody:
        a, b = int(t * SR), min(n, int((t + d) * SR))
        if b - a < int(0.13 * SR):
            continue
        f0[a:b] = 440 * 2 ** ((m - 69) / 12)
        env = np.ones(b - a); r = min(len(env), int(0.06 * SR)); env[:r] = np.linspace(0, 1, r); env[-r:] = np.linspace(1, 0, r)
        amp_[a:b] = env
    # glide between notes, vibrato
    k = int(0.04 * SR)
    f0s = np.convolve(np.where(f0 > 0, f0, np.nan_to_num(f0)), np.ones(k) / k, mode='same')
    f0s = np.where(f0 > 0, f0s, 0)
    tt = np.arange(n) / SR
    f0s *= 2 ** (0.3 * np.sin(2 * np.pi * 5.3 * tt) / 12)
    ph = np.cumsum(f0s / SR)
    src = 2 * (ph % 1) - 1
    src = src * amp_ + rng.standard_normal(n) * 0.02 * amp_
    vowels = [(730, 1090, 2440), (270, 2290, 3010), (300, 870, 2240), (530, 1840, 2480), (570, 840, 2410)]
    out = np.zeros(n)
    seg = int(0.35 * SR)
    for s in range(0, n, seg):
        F = vowels[rng.integers(len(vowels))]
        part = src[s:s + seg]
        y = sum(bq(part, peak(f, 6, 18)) for f in F)
        out[s:s + seg] = y[:len(part)]
    return bq(out, hp(150))


KEYS = {'A': 57, 'E': 52, 'G': 55, 'D': 50}
PROGS = [[0, 5, 7, 3], [0, 3, 5, 5], [0, 7, 8, 5]]  # in semitones above the key root: minor-ish vamps (i, iv, v, ...)


def band(secs, bpm, key, prog, rng, feel):
    spb = 60 / bpm
    root = KEYS[key]
    bass_b = np.zeros(int(secs * SR)); keys_b = np.zeros(int(secs * SR))
    melody = []
    bar = 0
    while bar * 4 * spb < secs:
        r = root + prog[bar % len(prog)]
        minor = prog[bar % len(prog)] in (0, 5)
        tri = [r, r + (3 if minor else 4), r + 7]
        for i in range(8):
            place_at(bass_b, bank_note(os.path.join(SAMPLES, 'bass'), r - 24 + (12 if i == 6 else 0), spb * 0.48), (bar * 4 + i / 2) * spb, 0.8)
        for m in tri:
            place_at(keys_b, bank_note(os.path.join(SAMPLES, 'inst', 'epiano'), m, 4 * spb * 0.95), bar * 4 * spb, 0.35)
        # the voice sings a slow tune over every other bar
        if bar % 2 == 1:
            for j in range(3):
                melody.append(((bar * 4 + j * 1.3) * spb, 1.1 * spb, int(rng.choice(tri)) + 12))
        bar += 1
    dr = drums(secs, bpm, rng, feel)
    vo = voice(melody, secs, rng)
    return dr, bass_b, keys_b, vo


def mix_band(lead, secs, bpm, key, prog, seed, feel, lead_db):
    rng = np.random.default_rng(seed + 99)
    dr, ba, ke, vo = band(secs, bpm, key, prog, rng, feel)
    norm = lambda x, db: x / (np.sqrt(np.mean(x ** 2)) + 1e-9) * 10 ** (db / 20)
    L = norm(lead, lead_db)
    parts = [(norm(dr, -16), 0.0), (norm(ba, -19), 0.0), (norm(ke, -24), -0.4), (norm(vo, -20), 0.1), (L, 0.3)]
    st = np.zeros((2, int(secs * SR)))
    for x, pan in parts:
        st[0] += x[:st.shape[1]] * np.sqrt((1 - pan) / 2) * 1.414
        st[1] += x[:st.shape[1]] * np.sqrt((1 + pan) / 2) * 1.414
    st = reverb(st, 1.6, 0.18, seed)
    st = compress(st)
    return st / (np.abs(st).max() + 1e-9) * 0.9


def aac(st, path):
    raw = path + '.raw.wav'
    write_wav(st, raw)
    subprocess.run(['ffmpeg', '-v', 'quiet', '-y', '-i', raw, '-c:a', 'aac', '-b:a', '128k', path + '.m4a'], check=True)
    subprocess.run(['ffmpeg', '-v', 'quiet', '-y', '-i', path + '.m4a', '-ar', str(SR), path], check=True)
    os.remove(raw); os.remove(path + '.m4a')


def write_wav(st, path):
    st = st if st.ndim == 2 else np.stack([st, st])
    pcm = (np.clip(st.T, -1, 1) * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-v', 'quiet', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', path], input=pcm, check=True)

# ---------------------------------------------------------------- the lines ----------------------------------------
# A minor pentatonic box 1 at the 5th fret (+ the 2 and 6 for colour), strings low E .. high e
BOX = {0: [5, 7, 8], 1: [5, 7], 2: [5, 7], 3: [4, 5, 7], 4: [5, 6, 8], 5: [5, 7, 8]}


def N(t, d, s, f, tech='pick', **kw):
    return dict(t=t, end=t + d, string=s, fret=f, midi=TUNING[s] + f, tech=tech, **kw)


def line(kind, bpm, bars, rng, shift=0):
    """A lead line in beats (converted to seconds by the caller): mixes of the cells players use."""
    out = []
    beat = 0.0
    total = bars * 4
    cells = {
        'legato': ['hp_triplet', 'h16', 'p16', 'run_legato', 'pick16', 'slide_q', 'bend_q', 'vib_h'],
        'fast': ['pick16', 'pick16', 'triplet8', 'burst32', 'h16', 'p16', 'pick16', 'slide_q'],
        'slow': ['bend_q', 'vib_h', 'slide_q', 'br_h', 'pick8', 'h8', 'p8', 'slide8'],
        'mixed': ['pick8', 'pick16', 'h16', 'p16', 'triplet8', 'slide_q', 'bend_q', 'vib_h', 'hp_triplet', 'burst32'],
    }[kind]
    s = int(rng.integers(1, 5))
    while beat < total - 1:
        c = cells[int(rng.integers(len(cells)))]
        s = int(np.clip(s + rng.integers(-1, 2), 0, 5))
        fr = BOX[s]
        F = lambda i: fr[i % len(fr)] + shift
        if c == 'pick16' or c == 'pick8':
            step = 0.25 if c == 'pick16' else 0.5
            for i in range(4 if step == 0.25 else 2):
                ss = int(np.clip(s + (i % 2) * rng.integers(-1, 2), 0, 5))
                out.append(N(beat + i * step, step, ss, BOX[ss][int(rng.integers(len(BOX[ss])))] + shift))
            beat += 1
        elif c == 'triplet8':
            for i in range(3):
                out.append(N(beat + i / 3, 1 / 3, s, F(i)))
            beat += 1
        elif c == 'burst32':
            for i in range(8):
                ss = s if i < 4 else max(0, s - 1)
                out.append(N(beat + i / 8, 1 / 8, ss, BOX[ss][(3 - i) % len(BOX[ss])] + shift))
            beat += 1
        elif c in ('h16', 'h8'):
            step = 0.25 if c == 'h16' else 0.5
            lo, hi = fr[0] + shift, fr[-1] + shift
            for i in range(2 if step == 0.5 else 2):
                out.append(N(beat + 2 * i * step, step, s, lo))
                out.append(N(beat + (2 * i + 1) * step, step, s, hi, 'h'))
            beat += 4 * step
        elif c in ('p16', 'p8'):
            step = 0.25 if c == 'p16' else 0.5
            lo, hi = fr[0] + shift, fr[-1] + shift
            for i in range(2):
                out.append(N(beat + 2 * i * step, step, s, hi))
                out.append(N(beat + (2 * i + 1) * step, step, s, lo, 'p'))
            beat += 4 * step
        elif c == 'hp_triplet':  # pick, hammer, pull: the classic rolling triplet
            lo, hi = fr[0] + shift, fr[-1] + shift
            for i in range(2):
                b = beat + i
                out.append(N(b, 1 / 3, s, lo)); out.append(N(b + 1 / 3, 1 / 3, s, hi, 'h')); out.append(N(b + 2 / 3, 1 / 3, s, lo, 'p'))
            beat += 2
        elif c == 'run_legato':  # one pick, three hammers up the string
            f0 = fr[0] + shift
            out.append(N(beat, 0.25, s, f0))
            for i, d in enumerate([2, 3, 5]):
                out.append(N(beat + (i + 1) * 0.25, 0.25, s, f0 + d, 'h'))
            beat += 1
        elif c in ('slide_q', 'slide8'):
            step = 1.0 if c == 'slide_q' else 0.5
            a = fr[0] + shift
            d = int(rng.choice([2, 3, 5, -2, -3])) if a > 5 else int(rng.choice([2, 3, 5]))
            out.append(N(beat, step, s, a)); out.append(N(beat + step, step, s, a + d, 's'))
            beat += 2 * step
        elif c == 'bend_q':
            ss = max(2, s)
            out.append(N(beat, 1.0, ss, BOX[ss][1] + shift, 'b', bend=2 if ss != 4 else 1))
            beat += 1
        elif c == 'br_h':
            ss = max(2, s)
            out.append(N(beat, 2.0, ss, BOX[ss][1] + shift, 'br', bend=2))
            beat += 2
        elif c == 'vib_h':
            out.append(N(beat, 2.0, s, F(0), '~'))
            beat += 2
        if rng.random() < 0.15:
            beat += 0.5  # a breath
    spb = 60 / bpm
    for n in out:
        n['t'] = round(0.5 + n['t'] * spb, 4); n['end'] = round(0.5 + n['end'] * spb, 4)
    return [n for n in out if n['end'] <= 0.5 + total * spb]


def riff(bpm, bars, rng):
    """A rhythm part: palm-free 8ths with double-stops and power chords (more than one note at once)."""
    out = []
    spb = 60 / bpm
    for b in range(bars * 4 * 2):
        t = 0.5 + b * spb / 2
        r = [0, 0, 3, 5][(b // 8) % 4]
        if b % 4 == 0:
            for s, f in [(0, 5 + r), (1, 7 + r), (2, 7 + r)]:
                out.append(dict(t=t, end=t + spb, string=s, fret=f, midi=TUNING[s] + f, tech='pick'))
        elif b % 4 == 2:
            for s, f in [(3, 5 + r), (4, 5 + r)]:
                out.append(dict(t=t, end=t + spb / 2, string=s, fret=f, midi=TUNING[s] + f, tech='pick'))
        else:
            out.append(dict(t=t, end=t + spb / 2, string=2, fret=7 + r, midi=TUNING[2] + 7 + r, tech='pick'))
    return out


def render_poly(notes, pickup, secs, seed):
    """Strummed / several strings at once: each string its own pluck (no legato)."""
    rng = np.random.default_rng(seed)
    out = np.zeros(int(secs * gd.SR) + gd.SR)
    for nt in notes:
        k = int(nt['t'] * gd.SR)
        y = gd.pluck(nt['midi'], nt['end'] - nt['t'] + 0.05, string=nt['string'], fret=nt['fret'], pickup=pickup, rng=rng, human=1.0)
        m = min(len(y), len(out) - k)
        out[k:k + m] += y[:m]
    return to44(out)[:int(secs * SR)]


PIECES = [
    # name, kind, bpm, tone, pickup, key/prog, feel
    ('legato-clean-96', 'legato', 96, 'clean', 'neck_single', 0, 'straight'),
    ('legato-drive-110', 'legato', 110, 'drive', 'bridge', 1, 'busy'),
    ('fast-clean-120', 'fast', 120, 'clean', 'single', 2, 'busy'),
    ('fast-drive-132', 'fast', 132, 'drive', 'bridge', 0, 'busy'),
    ('slow-drive-76', 'slow', 76, 'drive', 'neck', 1, 'straight'),
    ('slow-acoustic-84', 'slow', 84, 'acoustic', 'piezo', 2, 'straight'),
    ('mixed-clean-104', 'mixed', 104, 'clean', 'neck_single', 0, 'straight'),
    ('mixed-acoustic-92', 'mixed', 92, 'acoustic', 'piezo', 1, 'straight'),
    ('riff-drive-100', 'riff', 100, 'drive', 'bridge', 0, 'busy'),
]

if __name__ == '__main__':
    truth = {}
    only = os.environ.get('ONLY')
    for i, (name, kind, bpm, tone, pickup, prog, feel) in enumerate(PIECES):
        if only and only not in name:
            continue
        rng = np.random.default_rng(1000 + i)
        bars = 8
        secs = 0.5 + bars * 4 * 60 / bpm + 1.5
        notes = riff(bpm, bars, rng) if kind == 'riff' else line(kind, bpm, bars, rng)
        dry = render_poly(notes, pickup, secs, i) if kind == 'riff' else render_lead(notes, pickup, secs, i)
        lead = amp(dry, tone)
        write_wav(reverb(lead * 0.8, 0.6, 0.08, i) / 1.1, os.path.join(OUT, f'{name}-dry.wav'))
        key = 'A'
        for mix, db in (('band', -17), ('buried', -23)):
            st = mix_band(lead, secs, bpm, key, PROGS[prog], i, feel, db)
            aac(st, os.path.join(OUT, f'{name}-{mix}.wav'))
        truth[name] = dict(bpm=bpm, beats_per_bar=4, notes=notes)
        techs = {}
        for n in notes:
            techs[n['tech']] = techs.get(n['tech'], 0) + 1
        print(f'{name}: {len(notes)} notes {techs}', flush=True)
    path = os.path.join(OUT, 'truth.json')
    old = json.load(open(path)) if only and os.path.exists(path) else {}
    old.update(truth)
    json.dump(old, open(path, 'w'), indent=0)
