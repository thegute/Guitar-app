// The audio referee for reading a tab off a video: when the reader can't tell two numbers apart (a 6 or an 8 in a
// blurry frame, 1 or 7, 0 or 9), the note you HEAR at that moment settles it. The playhead says when each column of the
// tab is played (Stitcher.timelines); the sound at that moment says which of the possible notes is really ringing.
//   hearing(x, sr) → at(t) → salience(midi): how strongly a note (with its overtones) sounds just after time t, 0…1
//   scaled to the loudest candidate.
import { FFT } from '../audio/noteDetect'

const N = 4096
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12)

export type Hearing = (t: number) => ((midi: number) => number) | null

export function hearing(x: Float32Array, sr: number): Hearing {
  const fft = new FFT(N)
  const win = new Float32Array(N)
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1))
  const cache = new Map<number, Float32Array>()
  const mags = (t: number): Float32Array | null => {
    // just after the note starts (the pick's click is over, the string rings)
    const at = Math.round((t + 0.03) * sr)
    if (at < 0 || at + N > x.length) return null
    const key = Math.round(at / 256)
    const hit = cache.get(key)
    if (hit) return hit
    const re = new Float32Array(N), im = new Float32Array(N)
    let e = 0
    for (let i = 0; i < N; i++) { re[i] = x[at + i] * win[i]; e += re[i] * re[i] }
    if (e < 1e-7) return null // silence
    fft.run(re, im)
    const m = new Float32Array(N / 2)
    for (let i = 0; i < N / 2; i++) m[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i])
    if (cache.size > 400) cache.clear()
    cache.set(key, m)
    return m
  }
  const bin = (f: number) => (f * N) / sr
  return t => {
    const m = mags(t)
    if (!m) return null
    // a note's strength: its fundamental and first overtones (guitar notes are rich), each the peak of a small band
    const raw = (midi: number) => {
      let s = 0
      for (let h = 1; h <= 5; h++) {
        const b = bin(hz(midi) * h)
        if (b >= N / 2 - 2) break
        const lo = Math.max(1, Math.floor(b * 0.985)), hi = Math.min(N / 2 - 1, Math.ceil(b * 1.015))
        let p = 0
        for (let k = lo; k <= hi; k++) p = Math.max(p, m[k])
        s += p / h
      }
      return s
    }
    return raw
  }
}

/** Pick among a column's possible readings with the sound: each option's picture probability times how strongly its
 *  note sounds (relative to the strongest option), weighted by gamma. Returns the index of the best option. */
export function referee(options: { midi: number | null; p: number }[], sal: (midi: number) => number, gamma = 1): number {
  const s = options.map(o => (o.midi === null ? 0 : sal(o.midi)))
  const top = Math.max(...s, 1e-9)
  let best = 0, bv = -Infinity
  options.forEach((o, i) => {
    // a dead (muted) note has no pitch: it neither wins nor loses on the sound
    const heard = o.midi === null ? 0.5 : Math.max(0.02, s[i] / top)
    const v = Math.log(o.p + 1e-6) + gamma * Math.log(heard)
    if (v > bv) { bv = v; best = i }
  })
  return best
}
