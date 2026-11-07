// Techniques heard in a recording: hammer-ons (h), pull-offs (p), slides (/ \), bends (b) and vibrato (~).
//
// A note detector only says "a note of this pitch started here". Whether a pick hit the string is not in its output (Basic
// Pitch's onset is as strong for a hammer-on as for a picked note), so this module looks at two other things:
//   attack   the pick's click: a burst of 2-9 kHz energy in the instant a note starts. A hammer-on or pull-off has hardly any.
//   pitch    Basic Pitch's pitch contours (3 bins a semitone, 11.6 ms a frame): where the loudest pitch is, moment by moment.
//            A hammer-on / pull-off is a jump (the old pitch is gone within a frame or two and the new one is there);
//            a slide or a bend is a ramp through the pitches in between; vibrato is a regular wobble about one pitch.
// On a note's way to the next, with no new pick, the old note's pitch vanishing from the contour is the proof the finger
// (not the pick) changed the sound: a picked note on another string leaves the old one still ringing.
//
// The mark goes on the note the move starts from (tab: 5h7 = the 5 carries "h"), like the tab model and Guitar Pro import.
// A bend is one note ("b"): the notes the detector heard after it (the bent pitch, the release) are folded into it.
// Everything is conservative: where the evidence is unclear the notes are left as plain picked notes.
import { FFT } from '../audio/noteDetect'
import type { Note } from './post'

// ---------- time in Basic Pitch's frames (copied from its own toMidi.js so contour frames line up with its notes) ----------
const SR = 22050, HOP = 256, WIN_FRAMES = 172
const WINDOW_OFFSET = (HOP / SR) * (WIN_FRAMES - (SR * 2 - HOP) / HOP) + 0.0018
export const bpTime = (f: number) => (f * HOP) / SR - WINDOW_OFFSET * Math.floor(f / WIN_FRAMES)
/** The frame nearest to time t (seconds). */
export function bpFrame(t: number): number {
  let f = Math.round((t * SR) / HOP)
  while (f > 0 && bpTime(f) > t) f--
  while (bpTime(f + 1) <= t) f++
  return Math.abs(bpTime(f + 1) - t) < Math.abs(t - bpTime(f)) ? f + 1 : f
}

// ---------- the pick's click ----------
/** 2-9 kHz energy rising: the flux of a log spectrogram (512 samples, hop 128), as a multiple of the clip's usual level. */
export function attackCurve(x: Float32Array): { rate: number; v: Float32Array } {
  const N = 512, H = 128, F = Math.max(0, Math.floor((x.length - N) / H) + 1)
  const fft = new FFT(N)
  const win = new Float32Array(N)
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N)
  const b0 = Math.floor((2000 / SR) * N), b1 = Math.floor((9000 / SR) * N)
  const flux = new Float32Array(F), level = new Float32Array(F)
  let prev = new Float32Array(b1 - b0)
  const re = new Float32Array(N), im = new Float32Array(N)
  for (let f = 0; f < F; f++) {
    for (let i = 0; i < N; i++) { re[i] = x[f * H + i] * win[i]; im[i] = 0 }
    fft.run(re, im)
    let s = 0, lv = 0
    for (let k = b0; k < b1; k++) {
      const m = Math.log1p(100 * Math.hypot(re[k], im[k]))
      s += Math.max(0, m - prev[k - b0]); lv += m; prev[k - b0] = m
    }
    flux[f] = f ? s / (b1 - b0) : 0
    level[f] = lv / (b1 - b0)
  }
  // "usual" = the median over the frames that have sound in them (not the silence between phrases)
  const top = Math.max(...level, 1e-9)
  const live: number[] = []
  for (let f = 0; f < F; f++) if (level[f] > 0.35 * top) live.push(flux[f])
  live.sort((a, b) => a - b)
  const med = live.length ? Math.max(live[Math.floor(live.length / 2)], 1e-4) : 1
  for (let f = 0; f < F; f++) flux[f] /= med
  return { rate: SR / H, v: flux }
}

export interface Evidence {
  /** seconds of sound the evidence covers (notes after it are left alone) */
  span: number
  /** how hard a pick hit at time t (the biggest rise in the instant around it; ~1 is "nothing special") */
  attack(t: number): number
  /** the loudest pitch (fractional MIDI) between lo and hi at time t, and how clear it is (0..1); null if nothing there */
  pitch(t: number, lo: number, hi: number): { p: number; c: number } | null
  /** how strong the contour is at this MIDI pitch (±½ semitone) at time t */
  energy(t: number, midi: number): number
}

/** What the technique pass looks at: Basic Pitch's pitch contours and the audio (22.05 kHz) for the pick's click. */
export function makeEvidence(contours: ArrayLike<ArrayLike<number>>, audio22: Float32Array): Evidence {
  const att = attackCurve(audio22)
  const nF = contours.length
  const at = (t: number) => Math.max(0, Math.min(nF - 1, bpFrame(t)))
  return {
    span: Math.min(nF ? bpTime(nF - 1) : 0, att.v.length / att.rate),
    attack(t) {
      const i0 = Math.max(0, Math.floor((t - 0.035) * att.rate)), i1 = Math.min(att.v.length - 1, Math.ceil((t + 0.02) * att.rate))
      let m = 0
      for (let i = i0; i <= i1; i++) if (att.v[i] > m) m = att.v[i]
      return m
    },
    pitch(t, lo, hi) {
      if (!nF) return null
      const row = contours[at(t)]
      // a semitone is 3 bins and its middle bin is the note itself: MIDI = 21 + (bin - 1) / 3
      const b0 = Math.max(1, Math.floor((lo - 21) * 3) + 1), b1 = Math.min(row.length - 2, Math.ceil((hi - 21) * 3) + 1)
      let bi = -1, bv = 0.04
      for (let b = b0; b <= b1; b++) if (row[b] > bv) { bv = row[b]; bi = b }
      if (bi < 0) return null
      const a = row[bi - 1], c = row[bi + 1]
      const den = a - 2 * bv + c
      const off = den < 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / den)) : 0
      return { p: 21 + (bi + off - 1) / 3, c: bv }
    },
    energy(t, midi) {
      if (!nF) return 0
      const row = contours[at(t)]
      const b0 = Math.max(0, Math.round((midi - 21) * 3)), b1 = Math.min(row.length - 1, b0 + 2)
      let m = 0
      for (let b = b0; b <= b1; b++) if (row[b] > m) m = row[b]
      return m
    },
  }
}

// ---------- the pass ----------
export interface TechOpts {
  /** a note this soft at its start counts as "no pick" (default: found from the clip itself) */
  pickThreshold?: number
}

/** Where picked notes' attacks end and the soft (finger-made) ones begin, from the clip itself; null when they don't separate. */
export function pickThreshold(scores: number[]): number | null {
  const v = scores.map(s => Math.log(Math.max(s, 0.05)))
  if (v.length < 6) return null
  let lo = Math.min(...v), hi = Math.max(...v)
  if (hi - lo < Math.log(2.5)) return null
  for (let it = 0; it < 20; it++) {
    const a = v.filter(x => Math.abs(x - lo) <= Math.abs(x - hi)), b = v.filter(x => Math.abs(x - lo) > Math.abs(x - hi))
    if (!a.length || !b.length) return null
    const nlo = a.reduce((s, x) => s + x, 0) / a.length, nhi = b.reduce((s, x) => s + x, 0) / b.length
    if (Math.abs(nlo - lo) < 1e-4 && Math.abs(nhi - hi) < 1e-4) break
    lo = nlo; hi = nhi
  }
  // two real groups: centres well apart (≥ 2.2×), and the picked ones are not a handful of strays
  if (hi - lo < Math.log(2.2)) return null
  const picked = v.filter(x => Math.abs(x - hi) < Math.abs(x - lo)).length
  if (picked < 2) return null
  return Math.exp((lo + hi) / 2)
}

type Tr = { kind: 'jump' | 'glide' | 'none'; frames: number; stable: boolean }
const FRAME = HOP / SR

/** How the pitch got from note `a` to note `b`: a jump (≤ 2 frames), a glide (longer), whether `b`'s pitch settles. */
function transition(ev: Evidence, a: Note, b: Note): Tr {
  const lo = Math.min(a.midi, b.midi) - 1.5, hi = Math.max(a.midi, b.midi) + 1.5
  const t0 = Math.max(a.start + 0.02, b.start - 0.3), t1 = Math.min(b.end - 0.01, b.start + 0.12)
  const ts: number[] = [], ps: (number | null)[] = []
  for (let t = t0; t <= t1; t += FRAME) { ts.push(t); ps.push(ev.pitch(t, lo, hi)?.p ?? null) }
  if (ts.length < 3) return { kind: 'none', frames: 0, stable: false }
  const nearA = (p: number | null) => p !== null && Math.abs(p - a.midi) < 0.35
  const nearB = (p: number | null) => p !== null && Math.abs(p - b.midi) < 0.35
  // B is stable when its pitch holds for at least two frames in a row
  let at = -1
  for (let i = 0; i + 1 < ps.length; i++) if (nearB(ps[i]) && nearB(ps[i + 1])) { at = i; break }
  if (at < 0) return { kind: 'none', frames: 0, stable: false }
  // the last frame near A before that
  let leave = -1
  for (let i = at - 1; i >= 0; i--) if (nearA(ps[i])) { leave = i; break }
  if (leave < 0) return { kind: 'jump', frames: 1, stable: true } // A was gone before the window: B simply began
  return { kind: at - leave <= 2 ? 'jump' : 'glide', frames: at - leave, stable: true }
}

/** Remove overtone ghosts: a quieter note an octave, a twelfth or two octaves above a louder one that starts with it. */
function withoutGhosts(notes: Note[]): Note[] {
  return notes.filter(n => !notes.some(m => m !== n && Math.abs(m.start - n.start) <= 0.04 && [12, 19, 24].includes(n.midi - m.midi) && n.velocity <= m.velocity * 0.9))
}

/**
 * Mark the techniques in a line of notes (seconds; any detector's notes). Returns the notes with `tech` set on the note
 * each move starts from; bends are folded into one note and in-between notes of a slide are dropped.
 */
export function markTechniques(input: Note[], ev: Evidence, opts: TechOpts = {}): Note[] {
  return analyseTechniques(input, ev, opts).notes
}

/** Same, and says whether the sound had a clear enough pick click to tell picked from finger-made notes (`analysed`). */
export function analyseTechniques(input: Note[], ev: Evidence, opts: TechOpts = {}): { notes: Note[]; analysed: boolean } {
  const notes = withoutGhosts(input).map(n => ({ ...n })).sort((a, b) => a.start - b.start || a.midi - b.midi)
  if (notes.length < 2) return { notes, analysed: false }
  const score = notes.map(n => (n.start < ev.span - 0.25 ? ev.attack(n.start) : Infinity)) // past the evidence: treated as picked
  const thr = opts.pickThreshold ?? pickThreshold(score.filter(x => x !== Infinity))
  const gone = new Set<number>()
  if (thr !== null) {
    let a = -1 // the note the line is on (the last kept note)
    let reach = -Infinity // how far the line's notes (incl. ones folded in) ring on
    for (let i = 0; i < notes.length; i++) {
      const B = notes[i]
      if (gone.has(i)) continue
      const soft = score[i] < thr
      if (a < 0 || !soft) { a = i; reach = B.end; continue }
      const A = notes[a]
      // linked only when the old note was still sounding (or just stopped) and B is not part of a chord
      if (B.start - Math.max(A.end, reach) > 0.09 || B.start - A.start < 0.03) { a = i; reach = B.end; continue }
      const other = notes.some((k, j) => j !== i && j !== a && !gone.has(j) && k.start <= B.start + 0.03 && k.end >= B.start + 0.05 && k.midi !== B.midi && k.velocity >= 0.4 * B.velocity)
      if (other) { a = i; reach = B.end; continue }
      const d = B.midi - A.midi
      const tr = transition(ev, A, B)
      if (d === 0) {
        // the same pitch started again with no pick: a vibrato / bend wobble re-triggering, one note
        A.end = Math.max(A.end, B.end); reach = A.end; gone.add(i); continue
      }
      if (tr.kind === 'none' || !tr.stable) {
        // B never settles (it was only passed through, or noise): it's not a note; its time still counts as A's
        reach = Math.max(reach, B.end); gone.add(i)
        continue
      }
      if (tr.kind === 'jump') {
        if (Math.abs(d) > 5) { a = i; reach = B.end; continue }
        // the old pitch must really be gone (a picked note on another string leaves it ringing)
        const before = ev.energy(B.start - 0.04, A.midi), after = ev.energy(B.start + 0.07, A.midi)
        if (before > 0.1 && after > 0.5 * before) { a = i; reach = B.end; continue }
        A.tech = d > 0 ? 'h' : 'p'
        a = i; reach = B.end
        continue
      }
      // a glide
      if (Math.abs(d) >= 3) { A.tech = d > 0 ? '/' : '\\'; a = i; reach = B.end; continue }
      if (Math.abs(d) <= 2) { A.tech = 'b'; A.end = Math.max(A.end, B.end); reach = A.end; gone.add(i); continue }
    }
  }
  const out = notes.filter((_, i) => !gone.has(i))
  // vibrato: a long note whose pitch wobbles regularly (3.5-9 Hz), about a quarter of a semitone or more
  for (const n of out) {
    if (n.end - n.start < 0.28 || n.tech || n.end > ev.span - 0.05) continue
    const ps: number[] = []
    for (let t = n.start + 0.08; t < n.end - 0.03; t += FRAME) { const p = ev.pitch(t, n.midi - 1.2, n.midi + 1.2); if (p) ps.push(p.p) }
    if (ps.length < 16) continue
    const m = ps.reduce((s, x) => s + x, 0) / ps.length
    // smooth over 3 frames, take out the slow drift (a moving average of 15 frames), count crossings
    const sm = ps.map((_, i) => (ps[Math.max(0, i - 1)] + ps[i] + ps[Math.min(ps.length - 1, i + 1)]) / 3)
    const dev = sm.map((x, i) => { let s = 0, c = 0; for (let j = Math.max(0, i - 7); j <= Math.min(sm.length - 1, i + 7); j++) { s += sm[j]; c++ } return x - s / c })
    const sd = Math.sqrt(dev.reduce((s, x) => s + x * x, 0) / dev.length)
    let cross = 0
    for (let i = 1; i < dev.length; i++) if (dev[i - 1] * dev[i] < 0 && Math.abs(dev[i] - dev[i - 1]) > 0.05) cross++
    const secs = ps.length * FRAME
    const rate = cross / 2 / secs
    void m
    if (sd >= 0.11 && cross >= 4 && rate >= 3.5 && rate <= 9) n.tech = '~'
  }
  return { notes: out, analysed: thr !== null }
}
