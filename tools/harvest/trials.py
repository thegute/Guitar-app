#!/usr/bin/env python3
"""Blind listening test, step 1: the same three short phrases for every candidate instrument, written as agent jobs.

Phrases (at 92 BPM, standard tuning, no capo):
  pick   a fingerpicked C – Am – F – G pattern (thumb bass + fingers), the way a folk / fingerstyle part goes
  strum  G – C – D – Em, "D DU UDU", each strum's notes spread like a real hand (KGuitar's strum engine timing)
  lead   a slow lick with a hammer-on, a pull-off, a slide and a held bend-free last note (overlapping notes = legato)

Every candidate plays exactly the same notes and velocities, dry (its own reverb, delay and doubling off), so the
only difference is the instrument. Usage: python3 trials.py <candidate.json> <jobs/inbox dir> [--prefix 2xx]
candidate.json: {"id", "plugin", "pluginName"?, "state"?, "params"?, "warmup"?, "pre": [events before], "chan": 0}
"""
import json, os, random, sys

BPM = 92
BEAT = 60 / BPM
STD = [40, 45, 50, 55, 59, 64]


def strum_times(n, up=False, vel=90, rnd=random.Random(7)):
    """KGuitar's strum engine (src/engine/strumLogic.ts), simplified: speed from velocity, the wrist accelerating,
    the first strings loudest."""
    D = (50 - 30 * vel / 127) / 1000 * (0.85 if up else 1) * (1 + (rnd.random() - 0.5) * 0.12)
    out = []
    for k in range(n):
        pos = k / (n - 1) if n > 1 else 0
        out.append((D * pos ** 0.9, max(1, min(120, round(vel * (1 - 0.22 * pos) * (1.06 if (k == 0 and not up) else 1))))))
    return out


SHAPES = {  # frets low E → high e, -1 = not played
    'C': [-1, 3, 2, 0, 1, 0], 'Am': [-1, 0, 2, 2, 1, 0], 'F': [1, 3, 3, 2, 1, 1], 'G': [3, 2, 0, 0, 0, 3],
    'D': [-1, -1, 0, 2, 3, 2], 'Em': [0, 2, 2, 0, 0, 0],
}


def notes_of(shape):
    return [(s, STD[s] + f) for s, f in enumerate(shape) if f >= 0]


def phrase_pick():
    ev, t = [], 0.5
    for ch in ['C', 'Am', 'F', 'G']:
        sh = notes_of(SHAPES[ch])
        bass = sh[0]
        alt = sh[1] if len(sh) > 1 else sh[0]
        top = sh[-3:]
        pattern = [(0, bass, 78), (0.5, top[2], 62), (1, alt, 70), (1.5, top[1], 58), (2, bass, 76), (2.5, top[2], 64), (3, alt, 70), (3.5, top[0], 58)]
        for b, (s, m), v in pattern:
            ev.append({'t': round(t + b * BEAT, 4), 'note': m, 'vel': v, 'dur': BEAT * 1.9, 'string': s})
        t += 4 * BEAT
    return ev, t


def phrase_strum():
    ev, t = [], 0.5
    pat = [(0, 'D', 96), (1, 'D', 88), (1.5, 'U', 70), (2.5, 'U', 72), (3, 'D', 90), (3.5, 'U', 68)]
    for ch in ['G', 'C', 'D', 'Em']:
        sh = notes_of(SHAPES[ch])
        for j, (b, d, v) in enumerate(pat):
            ns = sh if d == 'D' else list(reversed(sh[-4:]))
            # strings ring until the next strum (a real strum hand never mutes between strums)
            nxt = pat[j + 1][0] if j + 1 < len(pat) else 4
            for (s, m), (off, vv) in zip(ns, strum_times(len(ns), d == 'U', v)):
                ev.append({'t': round(t + b * BEAT + off, 4), 'note': m, 'vel': vv, 'dur': (nxt - b) * BEAT + 0.03, 'string': s})
        t += 4 * BEAT
    return ev, t


def phrase_lead():
    # (beat, string, fret, beats, vel); overlapping = legato (hammer-on / pull-off / slide in the library's own way)
    L = [(0, 3, 5, 1, 88), (1, 3, 7, 0.5, 80), (1.45, 3, 5, 0.6, 70),    # hammer-on 5→7, pull-off back
         (2, 2, 7, 1, 86), (3, 4, 5, 0.5, 84), (3.45, 4, 8, 0.6, 80),      # slide 5→8 on B
         (4, 5, 5, 1, 90), (5, 4, 8, 0.5, 82), (5.5, 4, 5, 0.5, 78), (6, 3, 7, 2, 86)]
    ev, t0 = [], 0.5
    for b, s, f, d, v in L:
        ev.append({'t': round(t0 + b * BEAT, 4), 'note': STD[s] + f, 'vel': v, 'dur': d * BEAT + 0.04, 'string': s})
    return ev, t0 + 8 * BEAT


def main():
    cand = json.load(open(sys.argv[1]))
    inbox = sys.argv[2]
    prefix = sys.argv[sys.argv.index('--prefix') + 1] if '--prefix' in sys.argv else '200'
    os.makedirs(inbox, exist_ok=True)
    for i, (name, fn) in enumerate([('pick', phrase_pick), ('strum', phrase_strum), ('lead', phrase_lead)]):
        ev, end = fn()
        # a per-note string keyswitch (Ample: G0–C1 = 6th → 1st string) if the candidate has one
        evs = []
        for e in ev:
            ks = cand.get('stringKeys')
            if ks:
                evs.append({'t': max(0, e['t'] - 0.004), 'note': ks[e['string']], 'vel': 127, 'dur': 0.002, 'ch': cand.get('chan', 0)})
            evs.append({k: v for k, v in e.items() if k != 'string'} | {'ch': cand.get('chan', 0)})
        job = {'action': 'midi', 'plugin': cand['plugin'], 'out': f"trials/{cand['id']}/{name}.wav", 'events': cand.get('pre', []) + evs,
               'duration': end + 3.0, 'sampleRate': 44100}
        for k in ('pluginName', 'state', 'params', 'warmup', 'effects'):
            if k in cand:
                job[k] = cand[k]
        if i > 0:
            # the agent keeps the plug-in loaded between jobs: setting the state again would reload a sampler's
            # samples (and need another warm-up), so only the first phrase sets it up
            job.pop('warmup', None)
            job.pop('state', None)
        with open(os.path.join(inbox, f"{prefix}{i}-{cand['id']}-{name}.json"), 'w') as f:
            json.dump(job, f)
    print('jobs written for', cand['id'])


if __name__ == '__main__':
    main()
