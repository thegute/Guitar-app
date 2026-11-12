"""KGuitar harvest: render a plugin instrument into a sound pack (Stage 3, notes/AUDIO-ENGINE.md "Step 2 plan").

Runs on the owner's Mac (tools/harvest/setup.sh first, then capture_state.py for each instrument). Hands-free: loads the
plugin with its saved state, plays every note the plan asks for (per string, fret, velocity layer and round robin, each
articulation through its keyswitch), and writes 48 kHz 24-bit FLAC files plus pack.json. Resumable: files already made
are skipped. The packs are PRIVATE (licences: personal use): they go to his phone / Google Drive, never into the repo.

  python tools/harvest/render.py plans/otree-acoustic.json ~/KGuitar-harvest/packs            # everything
  python tools/harvest/render.py plans/otree-acoustic.json ~/KGuitar-harvest/packs --test     # a few notes to check first
"""
import argparse
import json
import os
import sys
import time

import numpy as np
import soundfile as sf
from mido import Message
from pedalboard import Pedalboard, load_plugin
from scipy.signal import lfilter

SR_DEFAULT = 44100  # pedalboard prepares plug-ins at 44.1 kHz: no rate change (Kontakt asks for a restart on one); the libraries are 44.1 kHz too


def kweight_ms(x, sr):
    """BS.1770 K-weighted mean square (both channels summed) over the first second: the sample's loudness."""
    f0, G, Q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
    K = np.tan(np.pi * f0 / sr)
    Vh, Vb = 10 ** (G / 20), (10 ** (G / 20)) ** 0.4996667741545416
    a0 = 1 + K / Q + K * K
    y = lfilter([(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0],
                [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0], x, axis=0)
    f0, Q = 38.13547087602444, 0.5003270373238773
    K = np.tan(np.pi * f0 / sr)
    a0 = 1 + K / Q + K * K
    y = lfilter([1, -2, 1], [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0], y, axis=0)
    seg = y[: sr]
    return float((seg ** 2).mean(axis=0).sum())


def trim(x, sr, pre_ms=2.0, floor_db=-72.0):
    """Cut the silence before the attack (keep a couple of ms) and after the tail falls under the floor (with a fade)."""
    a = np.abs(x).max(axis=1)
    peak = a.max() if len(a) else 0
    if peak <= 0:
        return None, 0
    on_thr = peak * 10 ** (-50 / 20)
    on = int(np.argmax(a > on_thr))
    start = max(0, on - int(pre_ms / 1000 * sr))
    floor = 10 ** (floor_db / 20)
    # the end: the last 10 ms block above the floor
    blk = int(0.01 * sr)
    n_blk = len(a) // blk
    env = a[: n_blk * blk].reshape(n_blk, blk).max(axis=1)
    above = np.where(env > floor)[0]
    end = min(len(x), (above[-1] + 2) * blk) if len(above) else len(x)
    y = x[start:end].copy()
    fade = min(len(y), int(0.03 * sr))
    if fade > 0:
        y[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return y, start


def hold_for(midi):
    return 3.5 if midi < 52 else 2.6 if midi < 64 else 2.0


def cents_off(y, sr, midi):
    """How far a recorded note is from its true pitch (cents), from the steady part after the attack; None if unclear.
    Autocorrelation searched only within ±70 cents of the expected period, refined by a parabola."""
    x = y.mean(axis=1) if y.ndim == 2 else y
    a, b = int(0.12 * sr), int(0.7 * sr)
    seg = x[a:b]
    if len(seg) < int(0.2 * sr) or np.abs(seg).max() < 1e-4:
        return None
    seg = (seg - seg.mean()) * np.hanning(len(seg))
    n = 1 << (2 * len(seg) - 1).bit_length()
    f = np.fft.rfft(seg, n)
    ac = np.fft.irfft(f * np.conj(f))[: len(seg)]
    f0 = 440.0 * 2 ** ((midi - 69) / 12)
    lo, hi = int(sr / (f0 * 2 ** (70 / 1200))), int(sr / (f0 * 2 ** (-70 / 1200))) + 1
    if hi >= len(ac) - 1 or lo < 2:
        return None
    k = lo + int(np.argmax(ac[lo:hi]))
    if ac[k] <= 0.3 * ac[0]:
        return None
    y0, y1, y2 = ac[k - 1], ac[k], ac[k + 1]
    d = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2) if (y0 - 2 * y1 + y2) != 0 else 0
    return float(1200 * np.log2((sr / (k + d)) / f0))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('plan')
    ap.add_argument('out')
    ap.add_argument('--test', action='store_true', help='a handful of notes only, to check the setup')
    a = ap.parse_args()
    plan = json.load(open(a.plan))
    base = os.path.dirname(os.path.abspath(a.plan))
    sr = plan.get('sampleRate', SR_DEFAULT)
    out_dir = os.path.join(os.path.expanduser(a.out), plan['id'])
    os.makedirs(out_dir, exist_ok=True)

    def load(spec, extra=None):
        p = load_plugin(os.path.expanduser(spec['plugin']), plugin_name=spec['pluginName']) if spec.get('pluginName') else load_plugin(os.path.expanduser(spec['plugin']))
        if spec.get('state'):
            st = os.path.expanduser(spec['state'])
            if not os.path.isabs(st):
                st = os.path.join(base, st)
            with open(st, 'rb') as f:
                p.raw_state = f.read()
        for k, v in {**(spec.get('params') or {}), **(extra or {})}.items():
            setattr(p, k, v)
        # samplers load their samples in the background after a state is set: keep processing until they're in
        t_end = time.time() + float(spec.get('warmup', 0))
        while time.time() < t_end:
            p([], duration=0.25, sample_rate=sr, num_channels=2, reset=False)
            time.sleep(0.25)
        return p

    # mic stems: one instance per stem, every instance gets the SAME events in the same order (so its round robins
    # line up take for take); the main stem ('' dir) decides the trim, the others are cut at the same samples
    stems = plan.get('stems') or [{'dir': '', 'gain': 1, 'mono': True}]
    insts = [load(plan, s.get('params')) for s in stems]
    chain = Pedalboard([load(fx) for fx in plan.get('effects', [])]) if plan.get('effects') else None
    tuning = plan['tuning']
    frets = plan.get('frets', [0, 15])
    pack = json.load(open(os.path.join(out_dir, 'pack.json'))) if os.path.exists(os.path.join(out_dir, 'pack.json')) else {
        'format': 'kguitar-pack', 'version': 1, 'id': plan['id'], 'name': plan['name'], 'kind': plan.get('kind', 'guitar'),
        'private': True, 'licence': plan.get('licence', 'personal use only: rendered from the owner\'s plugin'), 'credit': plan.get('credit', ''),
        'sampleRate': sr, 'tuning': tuning, 'articulations': {}, 'renderedWith': {'plugin': plan['plugin'], 'effects': [e['plugin'] for e in plan.get('effects', [])]},
    }
    if plan.get('stems'):
        pack['stems'] = [{'dir': s['dir'], 'gain': s.get('gain', 1), **({'mono': True} if s.get('mono') else {})} for s in stems]
    t_start = time.time()
    made = 0
    for art, spec in plan['articulations'].items():
        vels = spec.get('velocities', [45, 80, 112])
        rr = spec.get('rr', 4)
        zones = {z['key']: z for z in pack['articulations'].get(art, {}).get('zones', [])}
        strings = range(len(tuning))
        if a.test:
            strings, vels, rr = [len(tuning) - 3], vels[1:2], 2
        for s in strings:
            f_lo, f_hi = (spec.get('frets') or frets)
            fret_list = range(f_lo, f_hi + 1, spec.get('fretStep', 1))
            if a.test:
                fret_list = [0, 5]
            for f in fret_list:
                midi = tuning[s] + f
                hold = spec.get('hold') or hold_for(midi)
                tail = spec.get('tail', 1.2)
                key = f's{s}f{f}'
                z = zones.get(key) or {'key': key, 'string': s, 'fret': f, 'root': midi, 'lo': midi, 'hi': midi, 'layers': []}
                for v in vels:
                    layer = next((l for l in z['layers'] if l['velocity'] == v), None)
                    if not layer:
                        layer = {'velocity': v, 'rr': [], 'ms': [], 'tune': []}
                        z['layers'].append(layer)
                    layer.setdefault('tune', [])
                    for k in range(rr):
                        rel = f'{art}/s{s}f{f:02d}v{v:03d}r{k}.flac'
                        paths = [os.path.join(out_dir, st['dir'], rel) if st['dir'] else os.path.join(out_dir, rel) for st in stems]
                        done = all(os.path.exists(pth) for pth in paths) and rel in layer['rr']
                        # channel-based strings: MIDI channel 1 = the LOWEST string ('low-first'), or the highest (Orange Tree: 'high-first')
                        ch = 0
                        if plan.get('stringChannels'):
                            ch = (len(tuning) - 1 - s) if plan.get('stringChannels') == 'high-first' else s
                        msgs = []
                        t0 = 0.1
                        if spec.get('keyswitch') is not None:
                            msgs += [Message('note_on', note=spec['keyswitch'], velocity=100, channel=ch, time=0.0),
                                     Message('note_off', note=spec['keyswitch'], velocity=0, channel=ch, time=0.02)]
                        if plan.get('stringKeys'):
                            # e.g. Ample: G0–C1 pick the string (velocity 127 forces it)
                            ks = plan['stringKeys'][s]
                            msgs += [Message('note_on', note=ks, velocity=127, channel=ch, time=0.05),
                                     Message('note_off', note=ks, velocity=0, channel=ch, time=0.06)]
                        msgs += [Message('note_on', note=midi, velocity=v, channel=ch, time=t0),
                                 Message('note_off', note=midi, velocity=0, channel=ch, time=t0 + hold)]
                        # every stem plays the take, even one already on disk, so the round robins stay in step
                        ys = []
                        for inst in insts:
                            y = inst(msgs, duration=t0 + hold + tail, sample_rate=sr, num_channels=2, buffer_size=512, reset=False)
                            y = y.T if y.shape[0] == 2 else y
                            if chain is not None:
                                y = chain(y.T, sr, reset=False).T
                            inst([], duration=0.3, sample_rate=sr, num_channels=2, buffer_size=512, reset=False)
                            ys.append(y.astype(np.float64))
                        if done:
                            continue
                        t, start = trim(ys[0], sr)
                        if t is None:
                            print(f'  silent: {rel} (check the state / keyswitch / channel)')
                            continue
                        n = len(t)
                        for pth, y, j in zip(paths, ys, range(len(ys))):
                            seg = t if j == 0 else y[start:start + n].copy()
                            if j:
                                fade = min(len(seg), int(0.03 * sr))
                                seg[-fade:] *= np.linspace(1, 0, fade)[:, None]
                            os.makedirs(os.path.dirname(pth), exist_ok=True)
                            sf.write(pth, seg.astype(np.float32), sr, subtype='PCM_24')
                        c = cents_off(t, sr, midi) if art in ('sustain', 'harmonic') else None
                        fix = round(-c, 1) if c is not None and abs(c) > plan.get('tuneOver', 5) else 0
                        if rel not in layer['rr']:
                            layer['rr'].append(rel)
                            layer['ms'].append(kweight_ms(t, sr))
                            layer['tune'].append(fix)
                        made += 1
                zones[key] = z
                pack['articulations'][art] = {'zones': sorted(zones.values(), key=lambda q: (q['string'], q['fret']))}
                with open(os.path.join(out_dir, 'pack.json'), 'w') as fjs:
                    json.dump(pack, fjs, indent=1)
                el = time.time() - t_start
                print(f'{art} string {s} fret {f}: {made} files, {el / 60:.1f} min', flush=True)
    # the pack's reference loudness: the median mf note, in LUFS
    mss = [m for art in pack['articulations'].values() for z in art['zones'] for l in z['layers'] for m in l['ms']]
    if mss:
        pack['loudness'] = {'lufs': round(-0.691 + 10 * np.log10(np.median(mss)), 2)}
    with open(os.path.join(out_dir, 'pack.json'), 'w') as fjs:
        json.dump(pack, fjs, indent=1)
    print(f'done: {made} new files in {out_dir}')


if __name__ == '__main__':
    sys.exit(main())
