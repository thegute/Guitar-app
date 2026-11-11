# out/gs-mix.wav for getsound-test.cjs: the first 12 s of ode.wav (guitar melody) with a kick on 1 and 3, a snare on 2 and 4
# out/gs-clip.webm (the "video" check): 8 s of gs-mix.wav with a plain picture, made below with ffmpeg.
# and eighth-note hi-hats at 120 BPM: a short "song" to load, trim, chop at hits and put on pads. Needs out/ode.wav (gen-ode.cjs).
import os, subprocess, wave, numpy as np
here = os.path.dirname(os.path.abspath(__file__)); out = os.path.join(here, 'out'); sr = 44100
raw = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', os.path.join(out, 'ode.wav'), '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True).stdout
g = np.frombuffer(raw, np.float32)[: sr * 12].copy()
n = len(g); t = np.arange(n) / sr; spb = 0.5; rng = np.random.default_rng(3)
mix = g / max(1e-6, np.abs(g).max()) * 0.6
def add(x, at):
    i = int(at * sr); m = min(len(x), n - i)
    if m > 0: mix[i:i + m] += x[:m]
k = np.arange(int(0.2 * sr)) / sr
kick = np.sin(2 * np.pi * (50 + 100 * np.exp(-k * 35)) * k) * np.exp(-k * 16) * 0.8
s = np.arange(int(0.15 * sr)) / sr
snare = rng.standard_normal(len(s)) * np.exp(-s * 28) * 0.35
h = np.arange(int(0.05 * sr)) / sr
hat = np.diff(np.r_[0, rng.standard_normal(len(h))]) * np.exp(-h * 90) * 0.12
b = 0; at = 0.0
while at < n / sr - 0.2:
    add(kick if b % 2 == 0 else snare, at); add(hat, at); add(hat, at + spb / 2)
    at += spb; b += 1
mix = (mix / max(1e-6, np.abs(mix).max()) * 0.9 * 32767).astype(np.int16)
with wave.open(os.path.join(out, 'gs-mix.wav'), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(mix.tobytes())
print('out/gs-mix.wav', round(n / sr, 1), 's')
subprocess.run(['ffmpeg', '-v', 'quiet', '-y', '-f', 'lavfi', '-i', 'color=c=0x14002b:s=320x180:r=15', '-i', os.path.join(out, 'gs-mix.wav'),
                '-t', '8', '-c:v', 'libvpx', '-b:v', '200k', '-c:a', 'libopus', '-shortest', os.path.join(out, 'gs-clip.webm')], check=True)
print('out/gs-clip.webm 8 s')
