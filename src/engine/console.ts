// The console's processing and its shared space (Stage 3 step 4, notes/AUDIO-ENGINE.md):
// - each category bus gets the moves a mix engineer makes on it: bass = 28 Hz subsonic filter (24 dB/oct) and everything
//   under 110 Hz locked to mono (Linkwitz–Riley crossover); drums = a little parallel saturation for weight; guitars =
//   rumble filtered under 60 Hz; keys / loops / voice untouched
// - three shared sends, so every instrument sits in ONE space instead of dry and mono: a wood live room (true stereo,
//   early reflections + a tail whose highs die faster than its lows), a bright plate, and a tempo-synced stereo tape
//   delay. The impulse responses are generated here (no files), decorrelated left/right so they also fold to mono cleanly
//   for the pedal rig.
import type { Category } from '../audio/engine'

type Ctx = BaseAudioContext

function biquad(c: Ctx, type: BiquadFilterType, f: number, q = 0.7071) {
  const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b
}

/** The processing chain for one category: returns [in, out] (the same node when there is none). */
export function busChain(c: Ctx, cat: Category): [AudioNode, AudioNode] {
  if (cat === 'bass') {
    // 24 dB/oct Butterworth high-pass at 28 Hz (two sections), then a 110 Hz LR4 split with the lows summed to mono
    const hp1 = biquad(c, 'highpass', 28, 0.5412), hp2 = biquad(c, 'highpass', 28, 1.3066)
    hp1.connect(hp2)
    const lo1 = biquad(c, 'lowpass', 110), lo2 = biquad(c, 'lowpass', 110)
    const hi1 = biquad(c, 'highpass', 110), hi2 = biquad(c, 'highpass', 110)
    const mono = c.createGain(); mono.channelCount = 1; mono.channelCountMode = 'explicit'; mono.channelInterpretation = 'speakers'
    const sum = c.createGain()
    hp2.connect(lo1).connect(lo2).connect(mono).connect(sum)
    hp2.connect(hi1).connect(hi2).connect(sum)
    return [hp1, sum]
  }
  if (cat === 'drums') {
    // parallel saturation: 15% of a softly driven copy under the clean drums (weight and glue, no audible distortion)
    const inp = c.createGain(), sum = c.createGain()
    const ws = c.createWaveShaper()
    const n = 1024, curve = new Float32Array(n)
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.tanh(2.5 * x) / Math.tanh(2.5) }
    ws.curve = curve; ws.oversample = '2x'
    const wet = c.createGain(); wet.gain.value = 0.15
    inp.connect(sum)
    inp.connect(ws).connect(wet).connect(sum)
    return [inp, sum]
  }
  if (cat === 'guitar') {
    const hp = biquad(c, 'highpass', 60, 0.6)
    return [hp, hp]
  }
  const g = c.createGain()
  return [g, g]
}

// ---- impulse responses ----------------------------------------------------------------------------------------------
/** a small seeded random generator (the space sounds the same every time the app starts) */
function seeded(seed: number) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 * 2 - 1 } }

/** One-pole filters applied in place (cheap band-splitting for the tail). */
function onePoleLP(x: Float32Array, f: number, sr: number) { const a = Math.exp((-2 * Math.PI * f) / sr); let y = 0; for (let i = 0; i < x.length; i++) { y = (1 - a) * x[i] + a * y; x[i] = y } }

interface Space { rt: [number, number, number, number]; pre: number; er: number; len: number; build: number; seed: number }
/** A stereo IR: early reflections (distinct per side) + a diffuse tail in 4 bands with their own decay times. */
export function makeIR(sr: number, s: Space): Float32Array[] {
  const N = Math.round(s.len * sr)
  const out = [new Float32Array(N), new Float32Array(N)]
  const edges = [0, 300, 1500, 6000, sr / 2]
  for (let ch = 0; ch < 2; ch++) {
    const rnd = seeded(s.seed + ch * 7919)
    const y = out[ch]
    // the tail: band-limited noise, each band with its own RT60, fading in as the room "fills"
    for (let b = 0; b < 4; b++) {
      const nz = new Float32Array(N)
      for (let i = 0; i < N; i++) nz[i] = rnd()
      // band b = LP(edge b+1) − LP(edge b)
      const hi = nz.slice(), lo = nz.slice()
      if (edges[b + 1] < sr / 2) onePoleLP(hi, edges[b + 1], sr)
      if (edges[b] > 0) onePoleLP(lo, edges[b], sr); else lo.fill(0)
      const rt = s.rt[b]
      for (let i = 0; i < N; i++) {
        const t = i / sr - s.pre
        if (t < 0) continue
        const env = Math.exp((-6.9078 * t) / rt) * Math.min(1, t / s.build)
        y[i] += (hi[i] - lo[i]) * env
      }
    }
    // early reflections: walls and floor, 7–45 ms, alternating sides, softer the later they come
    if (s.er > 0) {
      for (let k = 0; k < 18; k++) {
        const t = s.pre * 0.5 + 0.007 + (0.038 * (k + (rnd() + 1) / 2)) / 18
        const i = Math.round(t * sr)
        if (i < N) y[i] += s.er * (rnd() > 0 ? 1 : -1) * (0.9 - k * 0.035)
      }
    }
  }
  // normalise to unit energy per channel, then a sensible level
  for (const y of out) { let e = 0; for (const v of y) e += v * v; const g = 0.6 / Math.sqrt(e || 1); for (let i = 0; i < y.length; i++) y[i] *= g }
  return out
}
export const ROOM: Space = { rt: [0.8, 0.7, 0.55, 0.35], pre: 0.006, er: 0.9, len: 1.4, build: 0.025, seed: 1234 }
export const PLATE: Space = { rt: [1.5, 1.8, 1.7, 1.3], pre: 0.012, er: 0, len: 2.6, build: 0.004, seed: 9876 }

// ---- the sends -------------------------------------------------------------------------------------------------------
export type Send = 'room' | 'plate' | 'delay'
/** How much of each category goes to each shared space by default (a mix engineer's starting point). */
export const SEND_DEFAULTS: Record<Category, Partial<Record<Send, number>>> = {
  guitar: { room: 0.22 }, bass: { room: 0.04 }, drums: { room: 0.16 }, keys: { room: 0.2, plate: 0.1 },
  loops: { room: 0.05 }, click: {}, voice: { room: 0.05 }, fx: {},
}

export interface Returns { room: AudioNode; plate: AudioNode; delay: AudioNode; setTempo: (bpm: number) => void }
/** Build the three shared spaces, each returning into `dest` (the master). */
export function makeReturns(c: AudioContext, dest: AudioNode): Returns {
  const conv = (s: Space) => {
    const inp = c.createGain()
    // the impulse response is worked out just after the first sound (a few tens of ms), so the first note isn't held up
    setTimeout(() => {
      const ir = makeIR(c.sampleRate, s)
      const buf = c.createBuffer(2, ir[0].length, c.sampleRate)
      buf.getChannelData(0).set(ir[0]); buf.getChannelData(1).set(ir[1])
      const cv = c.createConvolver(); cv.normalize = false; cv.buffer = buf
      // a stereo input to the convolver: mono sources are spread by the decorrelated IR
      cv.channelCount = 2; cv.channelCountMode = 'explicit'
      inp.connect(cv).connect(dest)
    }, 0)
    return inp
  }
  const room = conv(ROOM)
  const plateIn = c.createGain()
  const plateHp = biquad(c, 'highpass', 250)
  plateIn.connect(plateHp).connect(conv(PLATE))
  // tape delay: ping-pong, filtered in the loop (each repeat darker and thinner), a little wow
  const din = c.createGain()
  const split = c.createChannelSplitter(2), merge = c.createChannelMerger(2)
  const dL = c.createDelay(2), dR = c.createDelay(2)
  const fb = c.createGain(); fb.gain.value = 0.38
  const lp = biquad(c, 'lowpass', 3200), hp = biquad(c, 'highpass', 260)
  const sat = c.createWaveShaper()
  const curve = new Float32Array(512); for (let i = 0; i < 512; i++) { const x = (i / 511) * 2 - 1; curve[i] = Math.tanh(1.6 * x) / Math.tanh(1.6) }
  sat.curve = curve
  din.connect(hp).connect(dL)
  dL.connect(merge, 0, 0)
  dL.connect(lp).connect(sat).connect(dR)
  dR.connect(merge, 0, 1)
  dR.connect(fb).connect(dL)
  void split
  const wow = c.createOscillator(); wow.frequency.value = 0.45
  const depth = c.createGain(); depth.gain.value = 0.0004
  wow.connect(depth); depth.connect(dL.delayTime); depth.connect(dR.delayTime); wow.start()
  merge.connect(dest)
  const setTempo = (bpm: number) => {
    const q = 60 / Math.max(40, Math.min(240, bpm)) * 0.75 // a dotted eighth: the classic
    dL.delayTime.setTargetAtTime(q, c.currentTime, 0.05)
    dR.delayTime.setTargetAtTime(q, c.currentTime, 0.05)
  }
  setTempo(100)
  return { room, plate: plateIn, delay: din, setTempo }
}
