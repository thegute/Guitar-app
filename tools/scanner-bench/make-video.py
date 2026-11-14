"""Test videos of a tab, like the ones the Riff Scanner meets on YouTube: the staves of some book pages (labelled by
tools/scanner-train/realstrips.ts) shown either as one long line scrolling sideways under a fixed playhead
(Songsterr / Guitar Pro "horizontal" view) or as still cards with a playhead sweeping across each, over a busy
"video" background, small (gap px between string lines), H.264-compressed like YouTube.

python3 make-video.py <book.pdf> <labels.json> <first page> <last page> <out.mp4|.webm> [scroll|cards] [gap px] [crf] [part] [landscape|portrait]
"""
import os
import random
import subprocess
import sys
import tempfile
import json

import numpy as np
from PIL import Image, ImageDraw


def main():
    pdf, lab, a, b, out = sys.argv[1:6]
    mode = sys.argv[6] if len(sys.argv) > 6 else 'scroll'
    gap_px = float(sys.argv[7]) if len(sys.argv) > 7 else 9
    crf = sys.argv[8] if len(sys.argv) > 8 else '30'
    part = int(sys.argv[9]) if len(sys.argv) > 9 else 0
    # 'portrait': a Short / a phone screen recording (720 × 1280), the tab strip across the middle under the player
    portrait = len(sys.argv) > 10 and sys.argv[10] == 'portrait'
    a, b = int(a), int(b)
    pages = [p for p in json.load(open(lab)) if a <= p['page'] <= b]
    rng = random.Random(7)
    staves = []
    notes_at = []  # (pano x of the column within its staff crop, MIDI notes) for the sound track
    TUNE = [64, 59, 55, 50, 45, 40]  # standard tuning, slot 0 = top line
    with tempfile.TemporaryDirectory() as tmp:
        for p in pages:
            gap = p['staves'][0]['gap']
            dpi = 72 * gap_px / gap
            base = os.path.join(tmp, 'pg')
            subprocess.run(['pdftoppm', '-f', str(p['page']), '-l', str(p['page']), '-r', f'{dpi:.2f}', '-gray', '-png', '-singlefile', pdf, base], check=True)
            img = Image.open(base + '.png').convert('L')
            k = dpi / 72
            for st in p['staves']:
                if st.get('part', 0) != part:  # one guitar's part, like a real video
                    continue
                g = st['gap']
                y0, y1 = st['lines'][0] - g * 3, st['lines'][-1] + g * 4.5
                # from just before the first note (no "TAB" sign: a scrolling tab is one long staff) to the staff's end
                # bar line, so the staves join up into one continuous line
                notes = [c['x'] for c in st['cols'] if c['kind'] != 'bar']
                x0 = (min(notes) - g * 1.6) if (mode == 'scroll' and notes) else st['left'] - 1
                staves.append(img.crop((int(x0 * k), int(y0 * k), int(st['right'] * k) + 1, int(y1 * k))))
                notes_at.append([((c['x'] - x0) * k, [TUNE[int(sl)] + v for sl, v in c['frets'].items() if v != 'x' and int(sl) < 6]) for c in st['cols'] if c['kind'] == 'note'])
    H = max(s.height for s in staves)
    W, VH, fps = (720, 1280, 10) if portrait else (1280, 720, 10)
    ty = int(VH * 0.55) if portrait else VH - H - 40
    frames_dir = tempfile.mkdtemp()
    bg = (np.random.default_rng(1).random((VH // 8, W // 8, 3)) * 90 + 40).astype(np.uint8)
    bg = Image.fromarray(bg).resize((W, VH), Image.BILINEAR)
    n = 0
    speed_px = 14  # px per frame (140 px/s)
    events = []

    def frame(strip, x_play):
        nonlocal n
        f = bg.copy()
        # a little camera life in the background
        d = ImageDraw.Draw(f)
        d.ellipse([200 + n % 300, 80, 420 + n % 300, 300], fill=(150, 110, 90))
        f.paste(Image.new('RGB', (W, H + 20), (255, 255, 255)), (0, ty - 10))
        f.paste(strip.convert('RGB'), (0, ty))
        d.rectangle([x_play - 1, ty - 8, x_play + 1, ty + H + 8], fill=(220, 30, 30))
        f.save(os.path.join(frames_dir, f'f{n:06d}.png'))
        n += 1

    if mode == 'scroll':
        pano = Image.new('L', (sum(s.width for s in staves) + W, H), 255)
        x = W // 3
        events = []
        for s, ns in zip(staves, notes_at):
            pano.paste(s, (x, 0))
            for cx, midis in ns:
                events.append(((x + cx - W // 3) / speed_px / fps, midis))  # when the column reaches the playhead
            x += s.width
        speed = speed_px
        for off in range(0, pano.width - W, speed):
            frame(pano.crop((off, 0, off + W, H)), W // 3)
    else:
        for ci, (s, ns) in enumerate(zip(staves, notes_at)):
            card = Image.new('L', (W, H), 255)
            card.paste(s.resize((min(W, s.width), s.height)), (0, (H - s.height) // 2))
            t0 = ci * 4
            for cx, midis in ns:  # the playhead sweeps 20 … W-20 in 4 s
                events.append((t0 + (cx - 20) / (W - 40) * 4, midis))
            for t in range(int(fps * 4)):
                frame(card, int(20 + (W - 40) * t / (fps * 4)))
    # the sound: each column's notes plucked (Karplus–Strong) as the playhead reaches it
    sr = 44100
    dur = n / fps
    audio = np.zeros(int(sr * (dur + 2)), np.float32)
    arng = np.random.default_rng(3)
    for t, midis in events:
        for m in midis:
            f = 440 * 2 ** ((m - 69) / 12)
            L = max(2, int(sr / f))
            buf = arng.uniform(-1, 1, L).astype(np.float32)
            pl = np.zeros(int(sr * 0.8), np.float32)
            for i in range(len(pl)):
                pl[i] = buf[i % L]
                buf[i % L] = 0.996 * 0.5 * (buf[i % L] + buf[(i + 1) % L])
            a = int(t * sr)
            if 0 <= a < len(audio):
                seg = pl[:len(audio) - a]
                audio[a:a + len(seg)] += seg * 0.25
    wav = os.path.join(tempfile.gettempdir(), 'mv-sound.wav')
    import wave
    with wave.open(wav, 'wb') as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(sr)
        wf.writeframes((np.clip(audio / max(1e-6, np.abs(audio).max()) * 0.9, -1, 1) * 32767).astype(np.int16).tobytes())
    # .webm (VP9) for the browser tests (test Chromium has no H.264), .mp4 (H.264) otherwise
    codec = ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', str(int(crf) + 8), '-deadline', 'realtime', '-cpu-used', '8', '-c:a', 'libopus'] if out.endswith('.webm') else ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', crf, '-c:a', 'aac']
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(fps), '-i', os.path.join(frames_dir, 'f%06d.png'), '-i', wav, *codec, '-pix_fmt', 'yuv420p', '-shortest', out], check=True)
    for f in os.listdir(frames_dir):
        os.remove(os.path.join(frames_dir, f))
    os.rmdir(frames_dir)
    print(out, n, 'frames', f'{n / fps:.0f} s')


if __name__ == '__main__':
    main()
