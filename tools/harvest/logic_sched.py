#!/usr/bin/env python3
"""Instruments that only live inside Logic Pro (Studio Bass, Drum Kit Designer, Studio Piano, Vintage B3 / EP / Clav, Studio
Horns, percussion) can't be hosted by pedalboard, so they're harvested in two steps:

  1. schedule:  python3 logic_sched.py make <plan.json> <out dir>
       writes <id>.mid (every note the pack needs, one after another with silence between, at 120 BPM so beat = 0.5 s)
       and <id>.sched.json (where each note starts in seconds, and which pack file it becomes)
     → in Logic: a new project at 120 BPM, one Software Instrument track with the plan's patch, import <id>.mid at bar 1,
       METRONOME OFF (Logic bounces its click), the patch's reverbs / delays AND its dynamics (Compressor, Squash, Limiter)
       bypassed so soft and hard notes really differ (KGuitar's bass bus compresses live),
       File → Bounce → Project or Section (PCM, 48 kHz, 24-bit, "Normalize" OFF, from bar 1 to the end) → <id>.wav
  2. slice:     python3 logic_sched.py slice <id>.sched.json <id>.wav <packs dir>
       cuts the bounce into the pack's files (onset found within ±50 ms of where it was scheduled, 2 ms pre-roll, tail to
       −72 dB) and writes pack.json, like render.py does.

plan.json: {"id", "name", "kind": "bass|keys|drums|...", "tuning"? (bass: [28, 33, 38, 43]), "notes": "range" or a list,
            "range": [lo, hi], "velocities": [...], "rr": 1, "hold": 2.0, "tail": 1.5, "drums": {"kick": 36, ...}?}
"""
import json, os, sys

import numpy as np

BPM = 120.0


def make(plan_path, out_dir):
    import mido
    plan = json.load(open(plan_path))
    os.makedirs(out_dir, exist_ok=True)
    ticks = 480
    mid = mido.MidiFile(ticks_per_beat=ticks)
    tr = mido.MidiTrack()
    mid.tracks.append(tr)
    tr.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(BPM), time=0))
    sec_to_ticks = lambda s: int(round(s * BPM / 60 * ticks))
    sched = {'plan': plan, 'notes': []}
    t = 1.0  # one second of silence first (the bounce starts at bar 1)
    events = []
    hold, tail = plan.get('hold', 2.0), plan.get('tail', 1.5)
    items = []
    if plan.get('drums'):
        for piece, note in plan['drums'].items():
            for v in plan.get('velocities', [40, 70, 100, 127]):
                for k in range(plan.get('rr', 3)):
                    items.append({'key': piece, 'midi': note, 'vel': v, 'rr': k, 'hold': plan.get('hold', 0.3), 'tail': plan.get('tail', 1.8)})
    else:
        lo, hi = plan['range']
        step = plan.get('step', 1)
        for m in range(lo, hi + 1, step):
            for v in plan.get('velocities', [45, 82, 115]):
                for k in range(plan.get('rr', 1)):
                    items.append({'key': f'n{m}', 'midi': m, 'vel': v, 'rr': k, 'hold': hold, 'tail': tail})
    for it in items:
        it['t'] = round(t, 4)
        it['rel'] = f"{plan.get('art', 'sustain')}/{it['key']}v{it['vel']:03d}r{it['rr']}.flac"
        events.append((sec_to_ticks(t), mido.Message('note_on', note=it['midi'], velocity=it['vel'], channel=plan.get('channel', 0))))
        events.append((sec_to_ticks(t + it['hold']), mido.Message('note_off', note=it['midi'], velocity=0, channel=plan.get('channel', 0))))
        t += it['hold'] + it['tail'] + 0.25
        sched['notes'].append(it)
    events.sort(key=lambda e: e[0])
    last = 0
    for tick, msg in events:
        msg.time = tick - last
        last = tick
        tr.append(msg)
    tr.append(mido.MetaMessage('end_of_track', time=sec_to_ticks(2.0)))
    mid.save(os.path.join(out_dir, plan['id'] + '.mid'))
    sched['length'] = t + 2.0
    json.dump(sched, open(os.path.join(out_dir, plan['id'] + '.sched.json'), 'w'), indent=1)
    print(f"{len(items)} notes, {t / 60:.1f} min of audio → {plan['id']}.mid")


def slice_(sched_path, wav_path, packs_dir):
    import soundfile as sf
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from render import kweight_ms, cents_off, trim
    sched = json.load(open(sched_path))
    plan = sched['plan']
    x, sr = sf.read(wav_path, always_2d=True, dtype='float64')
    # the second before the first note must be silent: anything there is the metronome (or another track) in the bounce
    pre = np.abs(x[: int(0.9 * sr)]).max() if len(x) else 0
    if pre > 10 ** (-60 / 20):
        sys.exit(f'something plays before the first note ({20 * np.log10(pre):.0f} dBFS): metronome on? Bounce again with it off.')
    out_dir = os.path.join(packs_dir, plan['id'])
    pack = {'format': 'kguitar-pack', 'version': 1, 'id': plan['id'], 'name': plan['name'], 'kind': plan.get('kind', 'keys'),
            'private': True, 'licence': 'personal use only: rendered from the owner\'s Logic Pro instruments', 'sampleRate': sr,
            'articulations': {}}
    if plan.get('tuning'):
        pack['tuning'] = plan['tuning']
    zones = {}
    art = plan.get('art', 'sustain')
    for it in sched['notes']:
        a = int((it['t'] - 0.05) * sr)
        b = int((it['t'] + it['hold'] + it['tail']) * sr)
        seg = x[max(0, a): min(len(x), b)]
        t, _ = trim(seg, sr)
        if t is None:
            print('  silent:', it['rel'])
            continue
        p = os.path.join(out_dir, it['rel'])
        os.makedirs(os.path.dirname(p), exist_ok=True)
        sf.write(p, t.astype(np.float32), sr, subtype='PCM_24')
        z = zones.setdefault(it['key'], {'key': it['key'], 'root': it['midi'], 'lo': it['midi'], 'hi': it['midi'], 'layers': []})
        if plan.get('drums'):
            z['piece'] = it['key']
        layer = next((l for l in z['layers'] if l['velocity'] == it['vel']), None)
        if not layer:
            layer = {'velocity': it['vel'], 'rr': [], 'ms': [], 'tune': []}
            z['layers'].append(layer)
        c = None if plan.get('drums') else cents_off(t, sr, it['midi'])
        layer['rr'].append(it['rel'])
        layer['ms'].append(kweight_ms(t, sr))
        layer['tune'].append(round(-c, 1) if c is not None and abs(c) > plan.get('tuneOver', 5) else 0)
    pack['articulations'][art] = {'zones': sorted(zones.values(), key=lambda q: q['root'])}
    mss = [m for z in zones.values() for l in z['layers'] for m in l['ms']]
    if mss:
        pack['loudness'] = {'lufs': round(-0.691 + 10 * np.log10(np.median(mss)), 2)}
    json.dump(pack, open(os.path.join(out_dir, 'pack.json'), 'w'), indent=1)
    print(f"{sum(len(l['rr']) for z in zones.values() for l in z['layers'])} files → {out_dir}")


if __name__ == '__main__':
    if sys.argv[1] == 'make':
        make(sys.argv[2], sys.argv[3])
    else:
        slice_(sys.argv[2], sys.argv[3], sys.argv[4])
