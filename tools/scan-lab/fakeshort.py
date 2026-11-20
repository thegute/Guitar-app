"""A made-up YouTube Short with a known answer, for testing the Riff Scanner (scan-lab.cjs scores against it).
Made-up tab (tools/scanner-train/synth.py) scrolls under a playhead in a 720x1280 portrait video, and the soundtrack
plays exactly those notes as they pass the playhead. Writes <out> and <out>.truth.json.
  python3 fakeshort.py <out.mp4> [seed] [look]
look: 'page'    = black tab on a white strip over a dark screen (Mr. Tabs style)
      'overlay' = white tab, see-through, floating over a moving "video" of a player (Level Up style): busy shapes,
                  guitar strings and frets that look like tab lines, light changing; sometimes a dim backing band."""
import sys, os, random, json, subprocess, tempfile, math, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'scanner-train'))
import synth

out = sys.argv[1]
seed = int(sys.argv[2]) if len(sys.argv) > 2 else 3
look = sys.argv[3] if len(sys.argv) > 3 else 'page'
rng = random.Random(seed)
synth.degrade = lambda img, r: img   # a clean screen capture
parts, cols, x0 = [], [], 0
while len(parts) < 3:
    try: a, cs, nstr = synth.sample(rng, 900, 6)
    except ValueError: continue
    parts.append(a)
    for c in cs:
        if c['kind'] == 'note': cols.append({'x': c['x'] + x0, 'frets': {int(k): v for k, v in c['frets'].items()}})
    x0 += a.shape[1]
strip = np.concatenate(parts, axis=1)
Z = 3  # 45 px between strings on screen
strip_img = Image.fromarray(strip).resize((strip.shape[1] * Z, 160 * Z), Image.LANCZOS)
W, H, FPS, SPEED = 720, 1280, 30, 120 * Z / 3   # pixels per second on screen
PH = int(W * 0.3)
dur = (strip_img.width + W) / SPEED
tmp = tempfile.mkdtemp()
y0 = H // 2 - 80 * Z
SH = 160 * Z

# the "video" behind an overlay tab: a big still of blurry shapes + a guitar neck (strings and frets), panned and lit
# differently in every frame, the way a filmed player moves behind the tab
if look == 'overlay':
    nrng = np.random.default_rng(seed)
    BW, BH = W + 400, H + 400
    bg = Image.fromarray((nrng.uniform(20, 200, (12, 8)) ).astype(np.uint8)).resize((BW, BH), Image.BICUBIC)
    d = ImageDraw.Draw(bg)
    for _ in range(40):
        x, y, r = nrng.uniform(0, BW), nrng.uniform(0, BH), nrng.uniform(20, 160)
        d.ellipse([x - r, y - r, x + r, y + r], fill=int(nrng.uniform(0, 255)))
    bg = bg.filter(ImageFilter.GaussianBlur(6))
    d = ImageDraw.Draw(bg)
    ang = nrng.uniform(-0.25, 0.25)   # the neck crosses the screen nearly level, like the tab's own lines
    cy = BH / 2 + nrng.uniform(-150, 150)
    for s in range(6):
        off = (s - 2.5) * 14
        d.line([(0, cy + off), (BW, cy + off + BW * math.tan(ang))], fill=int(nrng.uniform(170, 240)), width=2)
    for fx in np.cumsum(nrng.uniform(40, 90, 14)):
        d.line([(fx, cy - 50 + fx * math.tan(ang)), (fx, cy + 50 + fx * math.tan(ang))], fill=210, width=3)
    bga = np.asarray(bg, dtype=np.float32)
    backing = rng.choice([0.0, 0.0, 0.3, 0.5])  # a dim band behind the tab (or none at all)
    # white ink where the synthetic strip has dark ink
    sa = np.asarray(strip_img, dtype=np.float32)
    ink = np.clip((235 - sa) / 200, 0, 1)

for f in range(int(dur * FPS)):
    t = f / FPS
    off = int(W - t * SPEED)
    if look == 'overlay':
        px, py = int(200 + 150 * math.sin(t * 0.7)), int(200 + 120 * math.sin(t * 0.43 + 1))
        a = bga[py:py + H, px:px + W] * (0.75 + 0.25 * math.sin(t * 1.3))
        a = a.copy()
        a[y0:y0 + SH] *= 1 - backing
        lo, hi = max(0, off), min(W, off + strip_img.width)
        if hi > lo:
            k = ink[:, lo - off:hi - off]
            a[y0:y0 + SH, lo:hi] = a[y0:y0 + SH, lo:hi] * (1 - k) + 250 * k
        a[y0 - 10:y0 + SH + 10, PH:PH + 4] = 255   # the playhead
        Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(f'{tmp}/f{f:05d}.png')
    else:
        fr = Image.new('L', (W, H), 30)
        fr.paste(strip_img, (off, y0))
        a = np.asarray(fr).copy()
        a[y0 - 10:y0 + SH + 10, PH:PH + 4] = 90   # the playhead
        Image.fromarray(a).save(f'{tmp}/f{f:05d}.png')
# soundtrack: each note when its column reaches the playhead
SR = 44100
snd = np.zeros(int((dur + 2) * SR), np.float32)
tuning = [40, 45, 50, 55, 59, 64]
truth = []
for c in cols:
    t = (c['x'] * Z + W - PH) / SPEED
    notes = []
    for slot, v in c['frets'].items():
        if v == 'x': continue
        midi = tuning[5 - slot] + int(v)
        notes.append(midi)
        hz = 440 * 2 ** ((midi - 69) / 12)
        n = int(1.2 * SR); tt = np.arange(n) / SR
        tone = sum((0.6 ** k) * np.sin(2 * math.pi * hz * (k + 1) * tt) for k in range(5)) * np.exp(-tt * 3)
        i = int(t * SR); snd[i:i + n] += tone[: len(snd) - i] * 0.15
    truth.append({'t': round(t, 3), 'notes': notes})
wav = f'{tmp}/a.wav'
with wave.open(wav, 'w') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(snd, -1, 1) * 32000).astype('<i2').tobytes())
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', f'{tmp}/f%05d.png', '-i', wav, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-c:a', 'aac', '-shortest', out], check=True)
json.dump({'cols': cols, 'truth': truth, 'look': look}, open(out + '.truth.json', 'w'))
print('wrote', out, len(cols), 'note columns', round(dur, 1), 's', look)
