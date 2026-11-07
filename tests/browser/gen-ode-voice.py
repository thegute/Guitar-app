# ode.wav (a guitar melody, 31 notes) with a sung "aah" line over it in a different rhythm and other notes:
# the fake "lesson with someone singing along" for the Take the voice out first test. → out/ode-voice.wav
import subprocess, wave, numpy as np, os, sys
here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, 'out')
def load(p, sr=44100):
    raw = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', p, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()
g = load(os.path.join(out, 'ode.wav'))
sr = 44100
voice = np.zeros_like(g)
choir = os.path.join(here, '..', '..', 'public', 'samples', 'inst', 'choir')
# long sung notes (2 s each) that don't follow the guitar
for i, (t, m) in enumerate([(0.3, 57), (2.4, 63), (4.5, 60), (6.6, 66), (8.7, 57), (10.8, 63), (12.9, 60), (15.0, 54)]):
    s = load(os.path.join(choir, f'{m}.mp3'))[: int(2.0 * sr)]
    env = np.minimum(1, np.minimum(np.arange(len(s)) / (0.08 * sr), (len(s) - np.arange(len(s))) / (0.2 * sr)))
    a = int(t * sr); b = min(len(voice), a + len(s))
    voice[a:b] += (s * env)[: b - a]
gp = np.sqrt(np.mean(g ** 2)); vp = np.sqrt(np.mean(voice[voice != 0] ** 2))
mix = g + voice * (gp / vp) * 0.9
mix *= 0.8 / np.max(np.abs(mix))
pcm = (mix * 32767).astype('<i2').tobytes()
with wave.open(os.path.join(out, 'ode-voice.wav'), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm)
print('ode-voice.wav', len(mix) / sr, 's')
