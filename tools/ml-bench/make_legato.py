# Test pieces WITH TECHNIQUES and known answers, for the Riff Scanner benchmark (tests/scan-bench.ts).
#
# Built on KGuitar's modelled string (tools/guitar_di.py). What is modelled, and how (this is a stand-in for a real
# player, so it is only used to compare "before" and "after" and to catch regressions; the real check is the owner's videos):
#   picked note   a pluck with a pick click                       (tech '')
#   hammer-on     a soft, click-less note on the same string, the old note fades out in 25 ms          (tech 'h' on the SOURCE note)
#   pull-off      the same, a lower note                                                             (tech 'p')
#   slide         one string's pluck with its pitch gliding to the target over 80-200 ms, no new pick (tech '/' or '\\')
#   bend          the pluck's pitch rising 1-2 semitones in 100-160 ms and staying (and an optional release) (tech 'b')
#   vibrato       +-25 cents at 5.5 Hz on a long note                                                 (tech '~')
# The technique mark sits on the note the move starts from (as in tab: 5h7 = note "5" carries 'h'), like KGuitar's tab model.
# Each piece is written twice: 'dry' (the guitar alone, a little tone shaping) and 'video' (backing chords + a soft kick/snare,
# room reverb, a compressor and noise, i.e. what a lesson video's sound is like).
#   python3 make_legato.py [outdir]   → <outdir>/<name>.wav (22.05 kHz mono) + <outdir>/legato-meta.json
import json, os, sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly, fftconvolve, butter, sosfilt
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import guitar_di as g

SR = g.SR
OUT_SR = 22050
STD = g.STANDARD
rng = np.random.default_rng(7)


def hz(m): return 440.0 * 2 ** ((m - 69) / 12)


def warp(x, ratio_of_t, n):
    """Read x at a time-varying speed (ratio_of_t(t) per output sample time) → pitch moves by that ratio."""
    t = np.arange(n) / SR
    r = ratio_of_t(t)
    pos = np.cumsum(r) - r[0]
    pos = np.clip(pos, 0, len(x) - 2)
    i = pos.astype(int)
    f = pos - i
    return x[i] * (1 - f) + x[i + 1] * f


def smooth_step(t, t0, dur):
    u = np.clip((t - t0) / max(dur, 1e-3), 0, 1)
    return u * u * (3 - 2 * u)


class Piece:
    def __init__(self, secs, bpm, name, pickup='bridge'):
        self.buf = np.zeros(int(secs * SR))
        self.truth = []  # dicts: t, dur, midi, string, fret, tech, pick (did a pick start it)
        self.bpm, self.name, self.pickup = bpm, name, pickup
        self.spb = 60.0 / bpm

    def add(self, x, t, level=1.0):
        i = int(t * SR)
        n = min(len(x), len(self.buf) - i)
        if n > 0: self.buf[i:i + n] += x[:n] * level

    def fade_out(self, t, t_end, ms=25):
        """Let the string at the old note go quiet from t (called on the buffer region it ringing in)."""
        pass

    # a plucked note (the pick starts it)
    def pick(self, t, string, fret, dur, level=1.0, hard=1.0, mute=0.0, tech=''):
        m = STD[string] + fret
        x = g.pluck(m, dur + 0.4, string=string, fret=fret, pickup=self.pickup, hardness=hard, mute=mute, human=1.0,
                    rng=np.random.default_rng(int(t * 1000) + m))
        n_end = int((dur + 0.02) * SR)
        env = np.ones(n_end); f = min(n_end, int(0.03 * SR)); env[-f:] = np.linspace(1, 0, f)
        self.add(x[:n_end] * env, t, level)
        self.truth.append(dict(t=round(t, 4), dur=round(dur, 4), midi=m, string=string, fret=fret, tech=tech, pick=True))
        return m

    # a note that continues the string's sound without a pick (hammer-on / pull-off)
    def legato(self, t, string, fret, dur, level=0.62, tech=''):
        m = STD[string] + fret
        x = g.pluck(m, dur + 0.4, string=string, fret=fret, pickup=self.pickup, hardness=0.22, human=0.25,
                    rng=np.random.default_rng(int(t * 1000) + m + 5))
        n_end = int((dur + 0.02) * SR)
        env = np.ones(n_end); f = min(n_end, int(0.03 * SR)); env[-f:] = np.linspace(1, 0, f)
        # no pick: the attack is rounded (a 6 ms rise) and quieter
        a = int(0.006 * SR); env[:a] *= np.linspace(0.2, 1, a)
        self.add(x[:n_end] * env, t, level)
        self.truth.append(dict(t=round(t, 4), dur=round(dur, 4), midi=m, string=string, fret=fret, tech=tech, pick=False))
        return m

    def cut(self, t_from, ms=25):
        """Fade what's ringing so far (the old note's string stops where the new note starts: the finger moved)."""
        i = int(t_from * SR); n = int(ms / 1000 * SR)
        if i + n < len(self.buf): self.buf[i:i + n] *= np.linspace(1, 0.0, n)
        # (only the previous note is ringing: this is a one-string-at-a-time line)

    # one string's pluck with a pitch move (slide / bend / vibrato)
    def moving(self, t, string, fret, dur, to_semis=0.0, glide=0.12, glide_at=0.0, release_at=None, vib=0.0, tech='', level=1.0, tail=0.0):
        m = STD[string] + fret
        long = dur + tail + 0.5
        x = g.pluck(m, long, string=string, fret=fret, pickup=self.pickup, human=1.0, rng=np.random.default_rng(int(t * 1000) + m + 9))
        n = int((dur + tail) * SR)
        ratio = 2 ** (to_semis / 12)

        def r(tt):
            s = smooth_step(tt, glide_at, glide)
            if release_at is not None:
                s = s * (1 - smooth_step(tt, release_at, glide))
            out = ratio ** s
            if vib:
                out = out * 2 ** ((vib / 1200.0) * np.sin(2 * np.pi * 5.5 * np.maximum(0, tt - 0.25)) * smooth_step(tt, 0.25, 0.3))
            return out
        y = warp(x, r, n)
        env = np.ones(n); f = min(n, int(0.04 * SR)); env[-f:] = np.linspace(1, 0, f)
        self.add(y * env, t, level)
        return m, m + to_semis


def render_pieces():
    pieces = []

    # 1 legato runs: cascades (pick, h, h / pick, p, p), trills (h p h p), 16ths and 32nds
    def legato_runs(name, bpm, sub):
        p = Piece(15, bpm, name)
        d = p.spb / sub  # note length
        t = 0.4
        shapes = [
            ('asc', [(1, 5), (1, 7), (1, 8)]),   # on the B string: 5 h7 h8
            ('desc', [(1, 8), (1, 7), (1, 5)]),
            ('trill', [(2, 7), (2, 9), (2, 7), (2, 9), (2, 7), (2, 9)]),
            ('casc', [(3, 7), (3, 9), (3, 10), (2, 7), (2, 9), (2, 10)]),
            ('pent', [(4, 5), (4, 8), (3, 5), (3, 7), (2, 5), (2, 7)]),
        ]
        k = 0
        while t < 13.5:
            kind, seq = shapes[k % len(shapes)]
            k += 1
            prev = None
            for j, (s, fr) in enumerate(seq):
                if prev is None or prev[0] != s:  # a new string → picked
                    p.pick(t, s, fr, d * 0.95, level=0.8 if j else 1.0)
                else:
                    if prev is not None:
                        p.cut(t, 20)
                    up = fr > prev[1]
                    p.legato(t, s, fr, d * 0.95, tech='')
                    # the mark goes on the note the move starts from
                    p.truth[-2]['tech'] = 'h' if up else 'p'
                prev = (s, fr)
                t += d
            t += d * 2  # a gap
        pieces.append(p)

    legato_runs('legato-16ths-100', 100, 4)
    legato_runs('legato-32nds-80', 80, 8)
    legato_runs('legato-16ths-130', 130, 4)

    # 2 slides: up and down, on the A / D / G / B strings
    p = Piece(16, 96, 'slides')
    t = 0.4
    moves = [(2, 5, +3), (2, 8, -3), (3, 7, +2), (1, 10, -4), (3, 5, +5), (2, 12, -5), (4, 3, +2), (1, 8, +3)]
    for i in range(14):
        s, fr, d_semi = moves[i % len(moves)]
        dur = p.spb * 0.5 * (1 + (i % 3 == 0))
        glide = 0.09 + 0.05 * (i % 3)
        a, b = p.moving(t, s, fr, dur, to_semis=d_semi, glide=glide, glide_at=dur * 0.5, tech='/' if d_semi > 0 else '\\', tail=0.0)
        p.truth.append(dict(t=round(t, 4), dur=round(dur, 4), midi=a, string=s, fret=fr, tech='/' if d_semi > 0 else '\\', pick=True, to=b))
        p.truth.append(dict(t=round(t + dur * 0.5 + glide, 4), dur=round(dur * 0.5 - glide, 4), midi=b, string=s, fret=fr + d_semi, tech='', pick=False, soft=True))
        t += dur + p.spb * 0.25
        if i % 2:  # a picked note in between
            p.pick(t, s, fr + d_semi, p.spb * 0.5)
            t += p.spb * 0.5
    pieces.append(p)

    # 3 bends and vibrato
    p = Piece(16, 90, 'bends-vibrato')
    t = 0.4
    for i in range(10):
        s, fr = [(2, 7), (1, 8), (2, 9), (3, 7), (1, 10)][i % 5]
        dur = p.spb * 1.0
        if i % 3 == 0:  # full bend up and hold
            a, b = p.moving(t, s, fr, dur, to_semis=2.0, glide=0.14, glide_at=0.05, tech='b')
            p.truth.append(dict(t=round(t, 4), dur=round(dur, 4), midi=a, string=s, fret=fr, tech='b', pick=True, to=b))
        elif i % 3 == 1:  # half bend and release
            a, b = p.moving(t, s, fr, dur, to_semis=1.0, glide=0.1, glide_at=0.05, release_at=dur * 0.6, tech='b')
            p.truth.append(dict(t=round(t, 4), dur=round(dur, 4), midi=a, string=s, fret=fr, tech='b', pick=True, to=b))
        else:  # vibrato
            a, b = p.moving(t, s, fr, dur * 1.5, vib=28, tech='~')
            p.truth.append(dict(t=round(t, 4), dur=round(dur * 1.5, 4), midi=a, string=s, fret=fr, tech='~', pick=True))
            dur *= 1.5
        t += dur + p.spb * 0.5
    pieces.append(p)

    # 4 mixed lead: picked 8ths and 16ths with a hammer / pull / slide each bar
    p = Piece(15, 110, 'mixed-lead')
    t = 0.4
    lines = [
        [('pk', 2, 7), ('h', 2, 9), ('pk', 1, 8), ('p', 1, 5), ('pk', 2, 7), ('sl', 2, 7, +3)],
        [('pk', 3, 7), ('pk', 2, 7), ('h', 2, 9), ('pk', 1, 5), ('h', 1, 8), ('p', 1, 5)],
    ]
    k = 0
    while t < 13.0:
        for (kind, s, fr, *rest) in lines[k % 2]:
            d = p.spb * 0.5
            if kind == 'pk': p.pick(t, s, fr, d * 0.95)
            elif kind in ('h', 'p'):
                p.cut(t, 20); up = kind == 'h'
                p.legato(t, s, fr, d * 0.95); p.truth[-2]['tech'] = kind
            elif kind == 'sl':
                a, b = p.moving(t, s, fr, d * 1.5, to_semis=rest[0], glide=0.1, glide_at=d * 0.8, tech='/')
                p.truth.append(dict(t=round(t, 4), dur=round(d * 1.5, 4), midi=a, string=s, fret=fr, tech='/', pick=True, to=b))
                p.truth.append(dict(t=round(t + d * 0.8 + 0.1, 4), dur=round(d * 1.5 - d * 0.8 - 0.1, 4), midi=b, string=s, fret=fr + rest[0], tech='', pick=False, soft=True))
                t += d
            t += d
        k += 1
        t += p.spb * 0.5
    pieces.append(p)

    # 5 all picked: 16ths, triplets and a few 32nds (the rhythm test; no techniques)
    p = Piece(15, 100, 'picked-rhythm')
    t = 0.4
    pent = [(3, 7), (2, 7), (2, 9), (1, 8), (1, 10), (2, 5), (3, 5), (4, 5), (3, 9), (2, 10)]
    k = 0
    while t < 13.2:
        sub = [4, 3, 8, 4][k % 4]  # 16ths, triplet 8ths, 32nds, 16ths
        n = {4: 8, 3: 6, 8: 8}[sub]
        for j in range(n):
            s, fr = pent[(k * 3 + j) % len(pent)]
            d = p.spb / sub
            p.pick(t, s, fr, d * 0.95, level=0.7 + 0.3 * (j % (sub // 2 if sub > 3 else 3) == 0))
            t += d
        t += p.spb * 0.5
        k += 1
    pieces.append(p)
    return pieces


# ---------- the rest of a video's sound ----------
def room(x):
    """A small room: exponential noise tail with a bright early part."""
    n = int(0.55 * SR)
    tt = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-tt / 0.14)
    ir[0] = 1.0
    sos = butter(2, 6000, 'low', fs=SR, output='sos')
    ir = sosfilt(sos, ir)
    ir /= np.abs(ir).sum() * 0.25
    return fftconvolve(x, ir)[:len(x)]


def compress(x, thr=0.25, ratio=3.5):
    y = np.abs(x)
    a = np.exp(-1 / (0.005 * SR)); r = np.exp(-1 / (0.12 * SR))
    e = 0.0
    out = np.empty_like(x)
    for i in range(len(x)):
        v = y[i]
        e = a * e + (1 - a) * v if v > e else r * e + (1 - r) * v
        gain = 1.0 if e < thr else (thr + (e - thr) / ratio) / e
        out[i] = x[i] * gain
    return out


def backing(secs, bpm):
    """Chords on a clean guitar + soft kick and snare (the rest of a lesson video's sound)."""
    n = int(secs * SR)
    out = np.zeros(n)
    spb = 60.0 / bpm
    chords = [[45, 52, 57, 60, 64], [41, 48, 53, 57, 60], [48, 55, 60, 64], [43, 50, 55, 59, 62]]
    bar = 0
    t = 0.0
    while t < secs - 1:
        ch = chords[bar % 4]
        x = g.strum_notes(ch, spb * 4 + 0.4, human=1, pickup='single', seed=bar, hardness=0.8)
        i = int(t * SR); m = min(len(x), n - i)
        out[i:i + m] += x[:m] * 0.5
        t += spb * 4; bar += 1
    # kick (low thump) on 1 and 3, snare (noise burst) on 2 and 4
    t = 0.0
    k = 0
    while t < secs - 0.3:
        i = int(t * SR)
        if k % 2 == 0:
            L = int(0.18 * SR); tt = np.arange(L) / SR
            kick = np.sin(2 * np.pi * (50 + 90 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 18)
            m = min(L, n - i); out[i:i + m] += kick[:m] * 0.55
        else:
            L = int(0.16 * SR); tt = np.arange(L) / SR
            sn = rng.standard_normal(L) * np.exp(-tt * 25)
            m = min(L, n - i); out[i:i + m] += sn[:m] * 0.22
        t += spb; k += 1
    return out


def to_out(x):
    x = x / max(1e-6, np.abs(x).max()) * 0.85
    y = resample_poly(x, OUT_SR, SR)
    return y.astype(np.float32)


def main():
    outdir = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/bench/legato'
    os.makedirs(outdir, exist_ok=True)
    meta = []
    for p in render_pieces():
        for kind in ('dry', 'video'):
            x = p.buf.copy()
            if kind == 'dry':
                sos = butter(2, 5500, 'low', fs=SR, output='sos'); x = sosfilt(sos, x)
                x = np.tanh(2.0 * x / max(1e-6, np.abs(x).max()))
                x = x + rng.standard_normal(len(x)) * 1e-3
            else:
                sos = butter(2, 5500, 'low', fs=SR, output='sos'); x = sosfilt(sos, x)
                x = x / max(1e-6, np.abs(x).max())
                x = np.tanh(2.0 * x)
                x = room(x) * 0.9 + room(backing(len(x) / SR, p.bpm)) * 0.7 + rng.standard_normal(len(x)) * 4e-3
                x = compress(x)
            name = f'{p.name}.{kind}'
            wavfile.write(os.path.join(outdir, name + '.wav'), OUT_SR, to_out(x))
            meta.append(dict(name=name, bpm=p.bpm, kind=kind, truth=sorted(p.truth, key=lambda a: a['t'])))
    json.dump(meta, open(os.path.join(outdir, 'legato-meta.json'), 'w'))
    print(len(meta), 'pieces in', outdir, ':', ', '.join(m['name'] for m in meta))


if __name__ == '__main__':
    main()
