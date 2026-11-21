"""Real guitar for the Riff Scanner bench: GuitarSet (Xi et al. 2018, CC BY 4.0, zenodo.org/records/3371780) solo
excerpts, played by 6 guitarists on an acoustic, with every note annotated per string. Each excerpt is used as
  dry   the microphone recording
  band  the same recording inside make_scan.py's band (drums, bass, keys, a singing voice, compression, AAC)
The tempo and key come from the file name (e.g. 00_BN1-129-Eb_solo). Techniques aren't annotated, so only notes are scored.
Usage: python3 make_gset.py <GuitarSet folder with annotation/ and audio_mono-mic/> [out] [per player]
"""
import glob, json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import resample_poly

sys.argv, args = sys.argv[:1], sys.argv[1:]
import make_scan as ms  # noqa: E402

GS = args[0] if args else '/tmp/claude-0/gset'
OUT = args[1] if len(args) > 1 else '/tmp/claude-0/scanbench'
PER = int(args[2]) if len(args) > 2 else 5
NAMES = {'C': 48, 'Db': 49, 'D': 50, 'Eb': 51, 'E': 52, 'F': 53, 'Gb': 54, 'G': 55, 'Ab': 56, 'A': 57, 'Bb': 58, 'B': 59}
ann = os.path.join(GS, 'ann') if os.path.isdir(os.path.join(GS, 'ann')) else os.path.join(GS, 'annotation')
mic = os.path.join(GS, 'mic') if os.path.isdir(os.path.join(GS, 'mic')) else os.path.join(GS, 'audio_mono-mic')
truth = {}
files = sorted(glob.glob(os.path.join(ann, '*_solo.jams')))
by_player = {}
for f in files:
    by_player.setdefault(os.path.basename(f)[:2], []).append(f)
for player, fs in sorted(by_player.items()):
    # spread over the styles (BN bossa, Funk, Jazz, Rock, SS singer-songwriter)
    pick = [fs[int(i)] for i in np.linspace(0, len(fs) - 1, PER)]
    for f in pick:
        base = os.path.basename(f)[:-5]
        _, rest = base.split('_', 1)
        style, bpm, key = rest.split('_')[0].split('-')
        bpm = int(bpm)
        j = json.load(open(f))
        notes = []
        for a in j['annotations']:
            if a['namespace'] != 'note_midi':
                continue
            s = int(a['annotation_metadata']['data_source'])
            for d in a['data']:
                m = int(round(d['value']))
                notes.append(dict(t=round(d['time'], 4), end=round(d['time'] + d['duration'], 4), string=s, fret=m - ms.TUNING[s], midi=m, tech=None))
        notes.sort(key=lambda n: n['t'])
        x, sr = sf.read(os.path.join(mic, base + '_mic.wav'), dtype='float32')
        if x.ndim > 1:
            x = x.mean(axis=1)
        if sr != ms.SR:
            x = resample_poly(x, ms.SR, sr).astype(np.float32)
        secs = len(x) / ms.SR
        name = f'gs-{base}'
        ms.write_wav(x / (np.abs(x).max() + 1e-9) * 0.9, os.path.join(OUT, f'{name}-dry.wav'))
        ms.KEYS[key] = NAMES[key] + (12 if NAMES[key] < 52 else 0)
        st = ms.mix_band(x.astype(np.float64), secs, bpm, key, ms.PROGS[len(truth) % 3], len(truth), 'straight', -17)
        ms.aac(st, os.path.join(OUT, f'{name}-band.wav'))
        truth[name] = dict(bpm=bpm, beats_per_bar=4, notes=notes, real=True)
        print(name, len(notes), 'notes', flush=True)
path = os.path.join(OUT, 'truth.json')
old = json.load(open(path)) if os.path.exists(path) else {}
old.update(truth)
json.dump(old, open(path, 'w'), indent=0)
