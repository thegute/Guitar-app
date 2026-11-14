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

export type View = { x0: number; w: number; t: number }

/** When each point of a strip was played, from where its frames sat on it and when they were shown, for videos whose
 *  playhead can't be seen (a coloured line, a highlight box, none at all). A page that stays put for a while is played
 *  left to right while it's shown (from where the page before it left off); a tab that scrolls passes a playhead that
 *  sits at fraction p of the frame (found by listening: tuneTiming). */
export function viewTimeline(views: View[], p: number): { x: number; t: number }[] {
  if (views.length < 2) return []
  const vs = [...views].sort((a, b) => a.t - b.t)
  const dt = (vs[vs.length - 1].t - vs[0].t) / (vs.length - 1)
  const segs: View[][] = []
  for (const v of vs) { const s = segs[segs.length - 1]; if (s && Math.abs(s[0].x0 - v.x0) <= 2) s.push(v); else segs.push([v]) }
  const out: { x: number; t: number }[] = []
  let done = -Infinity
  segs.forEach((s, k) => {
    const t0 = s[0].t, t1 = k + 1 < segs.length ? segs[k + 1][0].t : s[s.length - 1].t + dt
    if (s.length >= 3) {
      // a page shown for a while: swept from where the music had got to (or its left edge) to its right edge
      const from = Math.max(s[0].x0, done)
      out.push({ x: from, t: t0 }, { x: s[0].x0 + s[0].w, t: t1 })
      done = s[0].x0 + s[0].w
    } else for (const v of s) { out.push({ x: v.x0 + p * v.w, t: v.t }); done = Math.max(done, v.x0 + p * v.w) }
  })
  return out
}

/** The sound around a moment (a little before to a little after): timing from frames is only roughly right. */
export function heardAround(at: Hearing, spread = [-0.12, 0, 0.12, 0.24]): Hearing {
  return t => {
    const fs = spread.map(d => at(t + d)).filter((f): f is (m: number) => number => !!f)
    return fs.length ? (m: number) => Math.max(...fs.map(f => f(m))) : null
  }
}

/** How well notes read off the picture agree with what's heard when the timing says they were played: 0…1 per note
 *  (its strength against the strongest note heard then), averaged. */
export function agreement(notes: { x: number; midi: number }[], when: (x: number) => number | null, at: Hearing, shift = 0): { score: number; n: number } {
  let s = 0, n = 0
  for (const nt of notes) {
    const t = when(nt.x)
    if (t === null) continue
    const sal = at(t + shift)
    if (!sal) continue
    let top = 1e-9
    for (let m = 36; m <= 90; m++) top = Math.max(top, sal(m))
    s += sal(nt.midi) / top
    n++
  }
  return { score: n ? s / n : 0, n }
}

/** Which playhead place, delay and tuning make the notes the picture is sure of sound right, and whether that timing
 *  can be trusted at all: the notes must sound clearly better at their own times than the same notes shuffled among
 *  those times (a riff that repeats sounds the same a bar later, so a time shift is no test; a shuffle is). Null when
 *  the sound doesn't back the timing (a full band drowning the guitar, a voice-over, no sound). */
export function tuneTiming(notes: { x: number; string: number; fret: number }[], views: View[], at: Hearing, tunings: number[][]): { p: number; delay: number; tuning: number[]; score: number; gain: number } | null {
  if (notes.length < 8) return null
  const moving = views.some(v => Math.abs(v.x0 - views[0].x0) > 2)
  const cache = new Map<number, { sal: (m: number) => number; top: number } | null>()
  const heardAt = (t: number) => {
    const k = Math.round(t * 50)
    if (!cache.has(k)) {
      const sal = at(k / 50)
      let top = 1e-9
      if (sal) for (let m = 36; m <= 90; m++) top = Math.max(top, sal(m))
      cache.set(k, sal ? { sal, top } : null)
    }
    return cache.get(k)!
  }
  // a fixed shuffle: each note's pitch heard at another note's time
  const order = notes.map((_, i) => i).sort((i, j) => ((i * 7919) % 101) - ((j * 7919) % 101))
  let best: { p: number; delay: number; tuning: number[]; score: number; gain: number } | null = null
  for (const p of moving ? [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9] : [0.5]) {
    const when = timeOfPts(viewTimeline(views, p))
    const ts = notes.map(n => when(n.x))
    for (const delay of [-1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2]) {
      const hs = ts.map(t => (t === null ? null : heardAt(t + delay)))
      const ok = hs.filter(h => h).length
      if (ok < 8) continue
      for (const tuning of tunings) {
        let s = 0, sh = 0, n = 0
        notes.forEach((nt, i) => {
          const h = hs[i], o = notes[order[i]]
          if (!h || tuning[nt.string] === undefined || tuning[o.string] === undefined) return
          s += h.sal(tuning[nt.string] + nt.fret) / h.top
          sh += h.sal(tuning[o.string] + o.fret) / h.top
          n++
        })
        if (n < 8) continue
        // (the tuning the app is set to wins unless another is clearly better)
        const gain = (s - sh) / n - (tuning === tunings[0] ? 0 : 0.05)
        if (!best || gain > best.gain) best = { p, delay, tuning, score: s / n, gain }
      }
    }
  }
  // (right timing on the owner's recordings: the notes sound at 0.5–0.9 of the loudest, well above their shuffle; other
  // music at the same times: ~0.3, barely above)
  return best && best.gain >= 0.15 && best.score >= 0.4 ? { p: best.p, delay: best.delay, tuning: best.tuning, score: best.score, gain: best.gain } : null
}

/** a timeline (x → seconds) as a lookup (the same as crnnRead timeOf, here so this file stands alone) */
export function timeOfPts(tl: { x: number; t: number }[]): (x: number) => number | null {
  const pts: { x: number; t: number }[] = []
  for (const p of [...tl].sort((a, b) => a.t - b.t)) if (!pts.length || p.x > pts[pts.length - 1].x) pts.push(p)
  return x => {
    if (pts.length < 2 || x < pts[0].x || x > pts[pts.length - 1].x) return null
    let i = 1
    while (pts[i].x < x) i++
    const a = pts[i - 1], b = pts[i]
    return a.t + ((x - a.x) / Math.max(1e-6, b.x - a.x)) * (b.t - a.t)
  }
}
