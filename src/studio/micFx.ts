// Mic effects for what you record into the beat maker (Koala style): the effect goes onto the recording as it's kept
// (Sample mode, Chop a riff, the Looper). Worked out offline, so it never adds delay or plays your guitar back live.
//   bass / treble   shelving EQ, +9 dB
//   fuzz            driven into a soft clipper, then the fizz filtered off
//   robot           a ring modulator and a short metallic comb (the classic robot voice)
//   reverb          a generated room
//   octaveUp/Down   a whole octave, same length (Signalsmith Stretch)
//   synth           your pitch followed note by note and played by a soft sawtooth synth with your loudness
import { shiftSamples } from './pitchShift'

export type MicFx = 'none' | 'bass' | 'treble' | 'fuzz' | 'robot' | 'reverb' | 'octaveUp' | 'octaveDown' | 'synth'
export const MIC_FX: { id: MicFx; label: string }[] = [
  { id: 'none', label: 'None' }, { id: 'bass', label: 'More bass' }, { id: 'treble', label: 'More treble' }, { id: 'fuzz', label: 'Fuzz' },
  { id: 'robot', label: 'Robot' }, { id: 'reverb', label: 'Reverb' }, { id: 'octaveUp', label: 'Octave up' }, { id: 'octaveDown', label: 'Octave down' }, { id: 'synth', label: 'Synth' },
]

/** The recording with the effect on it (same length; the same sound back for 'none'). */
export async function applyMicFx(x: Float32Array, sr: number, fx: MicFx, o: { keepLength?: boolean } = {}): Promise<Float32Array> {
  if (fx === 'none' || x.length < 64) return x
  if (fx === 'synth') return synth(x, sr)
  if (fx === 'octaveUp' || fx === 'octaveDown') return level(x, await shiftSamples(x, sr, fx === 'octaveUp' ? 12 : -12))
  const ctx = new OfflineAudioContext(1, x.length + (fx === 'reverb' ? Math.round(sr * 1.8) : 0), sr)
  const buf = ctx.createBuffer(1, x.length, sr)
  buf.getChannelData(0).set(x)
  {
    const src = ctx.createBufferSource()
    src.buffer = buf
    let end: AudioNode = src
    if (fx === 'bass' || fx === 'treble') {
      const f = ctx.createBiquadFilter()
      f.type = fx === 'bass' ? 'lowshelf' : 'highshelf'
      f.frequency.value = fx === 'bass' ? 220 : 3200
      f.gain.value = 9
      end = end.connect(f)
    } else if (fx === 'fuzz') {
      const pre = ctx.createGain(); pre.gain.value = 18
      const sh = ctx.createWaveShaper()
      const c = new Float32Array(2048)
      for (let i = 0; i < c.length; i++) { const v = (i / (c.length - 1)) * 2 - 1; c[i] = Math.tanh(3 * v) / Math.tanh(3) }
      sh.curve = c; sh.oversample = '4x'
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5500
      const out = ctx.createGain(); out.gain.value = 0.5
      end = end.connect(pre).connect(sh).connect(lp).connect(out)
    } else if (fx === 'robot') {
      // ring modulation: the sound times a 55 Hz sine
      const ring = ctx.createGain(); ring.gain.value = 0
      const osc = ctx.createOscillator(); osc.frequency.value = 55; osc.connect(ring.gain); osc.start()
      end.connect(ring)
      // a short comb (8 ms, feedback) for the metallic buzz
      const d = ctx.createDelay(0.05); d.delayTime.value = 0.008
      const fb = ctx.createGain(); fb.gain.value = 0.55
      const mix = ctx.createGain(); mix.gain.value = 0.9
      ring.connect(mix); ring.connect(d); d.connect(fb).connect(d); d.connect(mix)
      end = mix
    } else if (fx === 'reverb') {
      const conv = ctx.createConvolver()
      const len = Math.round(sr * 1.8)
      const ir = ctx.createBuffer(2, len, sr)
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let seed = 17 + c * 101; for (let i = 0; i < len; i++) { seed = (seed * 16807) % 2147483647; d[i] = ((seed / 2147483647) * 2 - 1) * Math.pow(1 - i / len, 3.2) } }
      conv.buffer = ir
      const wet = ctx.createGain(); wet.gain.value = 0.45
      const dry = ctx.createGain(); dry.gain.value = 0.85
      const mix = ctx.createGain()
      end.connect(dry).connect(mix); end.connect(conv).connect(wet).connect(mix)
      end = mix
    }
    end.connect(ctx.destination)
    src.start()
  }
  const out = (await ctx.startRendering()).getChannelData(0)
  // the reverb's tail is kept; everything else is the original length
  return level(x, out.slice(0, fx === 'reverb' && !o.keepLength ? out.length : x.length))
}

/** The same loudness peak as the original. */
function level(x: Float32Array, res: Float32Array): Float32Array {
  let a = 0, b = 0
  for (let i = 0; i < x.length; i++) a = Math.max(a, Math.abs(x[i]))
  for (let i = 0; i < res.length; i++) b = Math.max(b, Math.abs(res[i]))
  if (b > 1e-6 && a > 0) { const g = a / b; for (let i = 0; i < res.length; i++) res[i] *= g }
  return res
}

/** Pitch of a short frame by normalised autocorrelation (70–1000 Hz); 0 when it isn't clearly pitched. */
export function framePitch(x: Float32Array, a: number, n: number, sr: number): number {
  const lo = Math.floor(sr / 1000), hi = Math.min(Math.floor(sr / 70), n - 1)
  let e0 = 0
  for (let i = 0; i < n; i++) e0 += x[a + i] * x[a + i]
  if (e0 < 1e-6) return 0
  const r = (L: number) => {
    let s = 0, e1 = 0
    for (let i = 0; i + L < n; i++) { s += x[a + i] * x[a + i + L]; e1 += x[a + i + L] * x[a + i + L] }
    return s / Math.sqrt(e0 * e1 + 1e-12)
  }
  let best = 0, lag = 0
  for (let L = lo; L <= hi; L++) { const v = r(L); if (v > best) { best = v; lag = L } }
  if (best < 0.6 || !lag) return 0
  // a half or a third of that lag nearly as good means the real note is an octave (or a fifth above it) higher
  for (const d of [4, 3, 2]) {
    const L = Math.round(lag / d)
    if (L < lo) continue
    let bl = L, bv = -1
    for (let k = L - 1; k <= L + 1; k++) { const v = r(k); if (v > bv) { bv = v; bl = k } }
    if (bv > best * 0.92) { lag = bl; best = bv; break }
  }
  // between whole samples (a parabola through the neighbours)
  const y0 = r(lag - 1), y1 = r(lag), y2 = r(lag + 1)
  const den = y0 - 2 * y1 + y2
  const fine = den < 0 ? lag + (0.5 * (y0 - y2)) / den : lag
  return sr / fine
}

/** Synth: your melody, played by a soft sawtooth that follows your pitch and loudness. */
function synth(x: Float32Array, sr: number): Float32Array {
  const hop = Math.round(sr * 0.01), win = Math.round(sr * 0.04)
  const frames = Math.max(1, Math.floor((x.length - win) / hop) + 1)
  const f0 = new Float32Array(frames), amp = new Float32Array(frames)
  for (let k = 0; k < frames; k++) {
    const a = k * hop
    let e = 0
    for (let i = 0; i < win && a + i < x.length; i++) e += x[a + i] * x[a + i]
    amp[k] = Math.sqrt(e / win)
    f0[k] = a + win <= x.length ? framePitch(x, a, win, sr) : 0
  }
  // hold the last pitch through short gaps, median-smooth jumps
  for (let k = 1; k < frames; k++) if (!f0[k] && f0[k - 1] && amp[k] > 0.01) f0[k] = f0[k - 1]
  const out = new Float32Array(x.length)
  let phase = 0, f = 0, lp = 0
  for (let i = 0; i < x.length; i++) {
    const k = Math.min(frames - 1, Math.floor(i / hop))
    const target = f0[k]
    f = target ? (f ? f + (target - f) * 0.004 : target) : f
    const g = target ? amp[k] * 3 : 0
    if (!f) continue
    phase += f / sr
    if (phase >= 1) phase -= 1
    // a band-limited-ish saw (PolyBLEP)
    let v = 2 * phase - 1
    const dt = f / sr
    if (phase < dt) { const t = phase / dt; v -= t + t - t * t - 1 } else if (phase > 1 - dt) { const t = (phase - 1) / dt; v -= t * t + t + t + 1 }
    lp += (v * g - lp) * 0.25
    out[i] = lp
  }
  return out
}

/** The mic effect for the next recordings (one setting for Sample mode, Chop a riff and the Looper). */
export const MIC_FX_KEY = 'micFx'
