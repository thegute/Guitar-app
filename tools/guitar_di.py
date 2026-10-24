"""A physically modelled guitar string, used to make the dry "DI" signal that KGuitar's tone renderer feeds into amp
captures and cab / body impulse responses (tools/render_tones.py). Nothing here ships in the app: only rendered audio does.

Model (per string): a plucked string as a recirculating delay line of acceleration waves (extended Karplus-Strong) with
  - a one-pole loss filter set from two decay times (fundamental and a high frequency), so highs die away faster,
  - a first-order allpass for exact tuning, and a second, slightly detuned polarization (natural beating / two-stage decay),
  - a pick pulse (hardness = pulse width) shaped by the pick position comb,
  - output either from a magnetic pickup (position comb, velocity sensing, coil resonance) or a bridge piezo (force at the bridge).
"""
import numpy as np
from scipy.signal import lfilter

SR = 48000
STANDARD = [40, 45, 50, 55, 59, 64]
SCALE_MM = 648.0


def place(midi, tuning=STANDARD):
    """Which string and fret a player would most likely use: first position where possible."""
    for s, op in enumerate(tuning):
        if 0 <= midi - op <= 4:
            return s, midi - op
    if midi < tuning[0]:
        return 0, 0  # below the low string: treat as a detuned open string
    return len(tuning) - 1, midi - tuning[-1]


def _onepole(f0, t60_0, t60_h, fh):
    """g, a of L(z) = g(1-a)/(1 - a z^-1) giving decay t60_0 at f0 and t60_h at fh."""
    w0, wh = 2 * np.pi * f0 / SR, 2 * np.pi * fh / SR
    G0 = 10 ** (-3.0 / (f0 * t60_0))
    Gh = 10 ** (-3.0 / (f0 * t60_h))
    R = (Gh / G0) ** 2
    if abs(R - 1) < 1e-9:
        a = 0.0
    else:
        A, B, C = R - 1, 2 * (np.cos(w0) - R * np.cos(wh)), R - 1
        disc = max(B * B - 4 * A * C, 0)
        roots = [(-B + s * np.sqrt(disc)) / (2 * A) for s in (1, -1)]
        roots = [r for r in roots if 0 <= r < 1]
        a = min(roots) if roots else 0.0
    g = G0 * np.sqrt(1 - 2 * a * np.cos(w0) + a * a) / (1 - a)
    return min(g, 0.99999), a


def _phase_delay_onepole(a, w):
    H = (1 - a) / (1 - a * np.exp(-1j * w))
    return -np.angle(H) / w


def _allpass_c(d, w):
    """First-order allpass coefficient whose phase delay at w equals d samples (0.4 < d < 1.6)."""
    c = (1 - d) / (1 + d)
    for _ in range(30):
        H = (c + np.exp(-1j * w)) / (1 + c * np.exp(-1j * w))
        err = -np.angle(H) / w - d
        H2 = (c + 1e-6 + np.exp(-1j * w)) / (1 + (c + 1e-6) * np.exp(-1j * w))
        slope = ((-np.angle(H2) / w) - (-np.angle(H) / w)) / 1e-6
        if slope == 0:
            break
        c -= err / slope
        if abs(err) < 1e-7:
            break
    return float(np.clip(c, -0.95, 0.95))


def _frac_delay(x, d):
    """x delayed by d samples (linear interpolation)."""
    if d <= 0:
        return x.copy()
    i = int(np.floor(d))
    f = d - i
    y = np.zeros_like(x)
    if i < len(x):
        y[i:] += (1 - f) * x[:len(x) - i]
    if i + 1 < len(x):
        y[i + 1:] += f * x[:len(x) - i - 1]
    return y


def string_loop(exc, f0, t60_0, t60_h, fh, n):
    """Run the excitation through the tuned, lossy string loop for n samples."""
    w0 = 2 * np.pi * f0 / SR
    g, a = _onepole(f0, t60_0, t60_h, fh)
    D = SR / f0
    rem = D - _phase_delay_onepole(a, w0)
    P = int(np.floor(rem - 0.6))
    d = rem - P
    c = _allpass_c(d, w0)
    num = np.convolve([1, -a], [1, c])
    den = np.zeros(P + 2)
    den[:3] = num
    den[P] -= g * (1 - a) * c
    den[P + 1] -= g * (1 - a)
    x = np.zeros(n)
    x[:min(len(exc), n)] = exc[:n]
    return lfilter(num, den, x)


def biquad_lp(f, q):
    w = 2 * np.pi * f / SR
    al = np.sin(w) / (2 * q)
    b = np.array([(1 - np.cos(w)) / 2, 1 - np.cos(w), (1 - np.cos(w)) / 2])
    a = np.array([1 + al, -2 * np.cos(w), 1 - al])
    return b / a[0], a / a[0]


def biquad_hp(f, q=0.707):
    w = 2 * np.pi * f / SR
    al = np.sin(w) / (2 * q)
    b = np.array([(1 + np.cos(w)) / 2, -(1 + np.cos(w)), (1 + np.cos(w)) / 2])
    a = np.array([1 + al, -2 * np.cos(w), 1 - al])
    return b / a[0], a / a[0]


def peaking(f, q, db):
    A = 10 ** (db / 40)
    w = 2 * np.pi * f / SR
    al = np.sin(w) / (2 * q)
    b = np.array([1 + al * A, -2 * np.cos(w), 1 - al * A])
    a = np.array([1 + al / A, -2 * np.cos(w), 1 - al / A])
    return b / a[0], a / a[0]


def shelf(f, db, high=True, s=0.8):
    A = 10 ** (db / 40)
    w = 2 * np.pi * f / SR
    al = np.sin(w) / 2 * np.sqrt((A + 1 / A) * (1 / s - 1) + 2)
    cw = np.cos(w)
    sq = 2 * np.sqrt(A) * al
    if high:
        b = [A * ((A + 1) + (A - 1) * cw + sq), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - sq)]
        a = [(A + 1) - (A - 1) * cw + sq, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - sq]
    else:
        b = [A * ((A + 1) - (A - 1) * cw + sq), 2 * A * ((A - 1) - (A + 1) * cw), A * ((A + 1) - (A - 1) * cw - sq)]
        a = [(A + 1) + (A - 1) * cw + sq, -2 * ((A - 1) + (A + 1) * cw), (A + 1) + (A - 1) * cw - sq]
    b, a = np.array(b), np.array(a)
    return b / a[0], a / a[0]


def filt(x, ba):
    return lfilter(ba[0], ba[1], x)


def pluck(midi, dur=3.5, *, string=None, fret=None, tuning=STANDARD, pickup='bridge', mute=0.0, hardness=1.0,
          level=1.0, rng=None, pick_mm=None):
    """One plucked note as a dry pickup signal (not normalised).

    pickup: 'bridge' / 'neck' humbucker, 'single' / 'neck_single' single coil, or 'piezo' (acoustic undersaddle).
    mute: 0 = ringing, 1 = full palm mute.  hardness: 1 = medium pick, 2 = hard, 0.5 = soft / flesh.
    """
    rng = rng or np.random.default_rng(midi * 7 + int(mute * 10))
    if string is None:
        string, fret = place(midi, tuning)
    f0 = 440.0 * 2 ** ((midi - 69) / 12)
    n = int(dur * SR)
    D = SR / f0
    length = SCALE_MM * 2 ** (-max(fret, 0) / 12)  # vibrating length
    # decay times: low strings ring longer, fretted notes a little shorter; palm muting kills it quickly
    t60_0 = float(np.clip(9.0 - (midi - 40) * 0.13, 2.2, 9.0))
    t60_h = float(np.clip(0.9 - (midi - 40) * 0.01, 0.45, 0.9))  # at 6 kHz
    fh = max(6000.0, 3 * f0)
    if pickup == 'piezo':  # steel-string acoustic: the top soaks up energy, so a shorter ring
        t60_0 *= 0.75
        t60_h *= 1.3  # steel strings on an acoustic keep their shimmer
    if mute > 0:
        t60_0 = t60_0 * (1 - mute) + mute * float(np.clip(0.32 - (midi - 40) * 0.006, 0.12, 0.32))
        t60_h = t60_h * (1 - mute) + mute * 0.035
        fh = max(900.0, 3 * f0) if mute > 0.5 else fh
    # pick: a short smooth pulse (narrower = harder pick) plus a little scrape noise
    width = max(3, int(round(SR * 0.00018 / max(hardness, 0.2))))
    if mute > 0.5:
        width = int(width * 1.6)  # the palm also softens the attack
    pulse = np.hanning(width + 2)[1:-1]
    exc = np.zeros(int(D * 2) + width + 64)
    exc[:width] = pulse
    noise = rng.standard_normal(int(SR * 0.002)) * np.hanning(int(SR * 0.002)) * 0.06 * hardness
    exc[:len(noise)] += filt(noise, biquad_lp(9000 if pickup == 'piezo' else 5000, 0.7))
    # pick position: about 7 cm from the bridge for an electric, 9 cm over the soundhole edge for an acoustic
    pm = pick_mm if pick_mm else (95.0 if pickup == 'piezo' else 70.0)
    beta = min(0.45, pm / length)
    exc = exc - _frac_delay(exc, beta * D)
    # two polarizations, the second slightly sharp and decaying faster
    y = string_loop(exc, f0, t60_0, t60_h, fh, n)
    y2 = string_loop(exc, f0 * 1.00025, t60_0 * 0.6, t60_h * 0.8, fh, n)
    y = y + 0.45 * y2
    # the loop carries acceleration waves (a pluck is a pulse there); string velocity and the force at the bridge
    # are one integration away, which gives the natural 1/k fall-off of a plucked string's harmonics
    y = lfilter([0.05], [1, -0.997], y)
    if pickup == 'piezo':
        # undersaddle piezo: force at the bridge, fairly bright; the body comes from the impulse response
        out = filt(y, biquad_lp(14000, 0.6))
        out = filt(out, biquad_hp(60))
    else:
        pos = {'bridge': 40.0, 'neck': 158.0, 'single': 42.0, 'neck_single': 160.0}[pickup]
        if pickup in ('single', 'neck_single'):
            out = y - _frac_delay(y, pos / length * D)
        else:  # humbucker: two coils 18 mm apart
            out = 0.5 * ((y - _frac_delay(y, (pos - 9) / length * D)) + (y - _frac_delay(y, (pos + 9) / length * D)))
        # (a magnetic pickup senses string velocity: that is what y already is)
        res = {'bridge': (3200.0, 2.2), 'neck': (2800.0, 1.8), 'single': (5200.0, 1.6), 'neck_single': (4800.0, 1.5)}[pickup]
        out = filt(out, biquad_lp(*res))
        out = filt(out, biquad_hp(40))
    # fade out the very end
    tail = int(0.05 * SR)
    out[-tail:] *= np.linspace(1, 0, tail)
    return out * level


def strum_notes(midis, dur=3.5, *, spread=0.007, places=None, **kw):
    """Several strings picked in a quick downstroke (low to high), summed: the DI of a chord."""
    n = int(dur * SR)
    out = np.zeros(n)
    for i, m in enumerate(midis):
        s, f = places[i] if places else place(m)
        x = pluck(m, dur, string=s, fret=f, rng=np.random.default_rng(m * 13 + i), **kw)
        k = int(i * spread * SR)
        out[k:] += x[:n - k]
    return out
