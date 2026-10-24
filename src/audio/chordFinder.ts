// "Find the chords": listens to music playing nearby (a YouTube video on the phone's speaker, a record, a band)
// through the mic and writes down the chords as they change, the key, and (for a single line that stands out)
// the notes. Apps can't get at a YouTube video's sound directly, so this listens like a person would.
// The pure parts (chord matching, segmenting, the loop, notes to tab) are exported for tests.
import { PitchDetector } from 'pitchy'
import { audio } from './engine'
import { addChroma } from './chroma'
import { openInput, type OpenedInput } from './input'
import { detectKey, type KeyGuess } from '../tabs/keyDetect'
import { fingerMelody } from '../tabs/fingering'
import { SHARPS, FLATS, keyPrefersFlats } from '../theory/notes'
import type { Song, SongBar } from '../tabs/model'
import { FrameFeatures, VoiceGate, pluckLike, type Heard } from './voiceGate'

export type Quality = '' | 'm' | '7' | 'm7'
const QUALITIES: { q: Quality; ivs: [number, number][] }[] = [
  { q: '', ivs: [[0, 1], [4, 0.85], [7, 0.8]] },
  { q: 'm', ivs: [[0, 1], [3, 0.85], [7, 0.8]] },
  { q: '7', ivs: [[0, 1], [4, 0.85], [7, 0.75], [10, 0.6]] },
  { q: 'm7', ivs: [[0, 1], [3, 0.85], [7, 0.75], [10, 0.6]] },
]
export interface ChordGuess { root: number; q: Quality; score: number }

/** Best-matching chords for a 12-note chroma (C..B). `bass`: chroma of the low end, to tell C from Am. */
export function matchChords(chroma: number[], bass?: number[]): ChordGuess[] {
  const sum = chroma.reduce((a, b) => a + b, 0) || 1
  const c = chroma.map(v => v / sum)
  const norm = Math.sqrt(c.reduce((a, b) => a + b * b, 0)) || 1
  const bsum = bass ? bass.reduce((a, b) => a + b, 0) : 0
  const out: ChordGuess[] = []
  for (let r = 0; r < 12; r++) for (const { q, ivs } of QUALITIES) {
    const t = new Array(12).fill(0)
    for (const [i, w] of ivs) t[(r + i) % 12] = w
    const tn = Math.sqrt(t.reduce((a, b) => a + b * b, 0))
    let dot = 0
    for (let i = 0; i < 12; i++) dot += c[i] * t[i]
    let score = dot / (norm * tn)
    // the bass usually plays the root
    if (bass && bsum > 0) score += 0.12 * (bass[r] / bsum)
    // sevenths only when the 7th is really there
    if (q === '7' || q === 'm7') score -= 0.03
    out.push({ root: r, q, score })
  }
  return out.sort((a, b) => b.score - a.score)
}

export const chordName = (g: { root: number; q: Quality }, flats = false) => (flats ? FLATS : SHARPS)[g.root] + g.q

export interface Segment { t: number; dur: number; root: number; q: Quality; alts: { root: number; q: Quality }[]; score: number }

/** Turns a stream of chroma frames into chord changes: a new chord must win for `hold` seconds to count. */
export class ChordSegmenter {
  segments: Segment[] = []
  private avg: number[] | null = null
  private bassAvg: number[] | null = null
  private cand: { root: number; q: Quality; since: number; alts: { root: number; q: Quality }[]; score: number } | null = null
  private lastT = 0
  constructor(private hold = 0.55, private smooth = 0.35) {}
  /** one frame: time (s), chroma, bass chroma, loudness 0..1; `talking`: the voice gate hears speech */
  push(t: number, chroma: number[], bass: number[], level: number, talking = false) {
    // speech has no clear chord: unless a chord clearly rings under it, treat talking as a pause
    if (talking && matchChords(chroma, bass)[0].score < 0.86) level = 0
    const dt = this.lastT ? Math.min(0.5, t - this.lastT) : 0.1
    this.lastT = t
    const cur = this.segments[this.segments.length - 1]
    if (level < 0.004) {
      // quiet: close the current chord
      if (cur) cur.dur = t - cur.t
      this.avg = null
      this.cand = null
      return
    }
    const k = Math.min(1, dt / this.smooth)
    this.avg = this.avg ? this.avg.map((v, i) => v + k * (chroma[i] - v)) : [...chroma]
    this.bassAvg = this.bassAvg ? this.bassAvg.map((v, i) => v + k * (bass[i] - v)) : [...bass]
    const best = matchChords(this.avg, this.bassAvg)
    const top = best[0]
    if (cur && cur.root === top.root && cur.q === top.q && (!this.cand || this.cand.root === top.root)) {
      cur.dur = t - cur.t
      this.cand = null
      return
    }
    if (!this.cand || this.cand.root !== top.root || this.cand.q !== top.q) {
      this.cand = { root: top.root, q: top.q, since: t, alts: best.slice(1, 4).map(b => ({ root: b.root, q: b.q })), score: top.score }
    }
    if (t - this.cand.since >= this.hold || !cur) {
      if (cur) cur.dur = this.cand.since - cur.t
      this.segments.push({ t: this.cand.since, dur: t - this.cand.since, root: this.cand.root, q: this.cand.q, alts: this.cand.alts, score: this.cand.score })
      this.cand = null
    } else if (cur) cur.dur = t - cur.t
  }
}

/** Merge short blips and repeats into a clean list of changes. */
export function cleanSegments(segs: Segment[], minDur = 0.6): Segment[] {
  const out: Segment[] = []
  for (const s of segs) {
    const last = out[out.length - 1]
    if (s.dur < minDur && last) { last.dur = s.t + s.dur - last.t; continue }
    if (last && last.root === s.root && last.q === s.q) { last.dur = s.t + s.dur - last.t; continue }
    out.push({ ...s })
  }
  return out
}

/** The loop the song keeps coming back to (e.g. Am F C G), from the order of the changes. */
export function findLoop(names: string[], maxLen = 8): string[] {
  const seq = names.filter((n, i) => i === 0 || n !== names[i - 1])
  if (seq.length <= 2) return seq
  let best: { p: number; score: number } | null = null
  for (let p = 2; p <= Math.min(maxLen, Math.floor(seq.length / 2)); p++) {
    let hits = 0
    for (let i = p; i < seq.length; i++) if (seq[i] === seq[i - p]) hits++
    const score = hits / (seq.length - p) - p * 0.01
    if (!best || score > best.score) best = { p, score }
  }
  if (!best || best.score < 0.5) return seq.slice(0, Math.min(maxLen, seq.length))
  // the most common rotation of that loop, starting where the song first plays it
  return seq.slice(0, best.p)
}

/** The key from everything heard. */
export function keyOf(chromaSum: number[], bassSum: number[]): KeyGuess | null {
  if (chromaSum.every(v => v === 0)) return null
  return detectKey(chromaSum, bassSum)[0] ?? null
}

/** Chords → a chord sheet song (one strum shape per chord), at a tempo. */
export function sheetFromSegments(segs: Segment[], bpm: number, flats: boolean): { name: string; beats: number }[] {
  const spb = 60 / bpm
  return segs.map(s => ({ name: chordName(s, flats), beats: Math.max(1, Math.round(s.dur / spb)) }))
}

// ---- notes (a single line that stands out) ----
export interface HeardNote { t: number; dur: number; midi: number }
/** Pitch frames → notes: a note starts when the pitch settles and ends when it moves or stops. Notes heard while
 *  the gate says it's not music are dropped; while playing, only pluck-like notes count (see voiceGate.ts). */
export type Allow = 'pluck' | 'any' | 'none'
export class NoteSegmenter {
  notes: HeardNote[] = []
  /** sounds that weren't kept (talking, singing, or not like a picked note) */
  ignored = 0
  private cur: { t: number; midis: number[]; last: number; frames: { level: number; midi: number | null; onset: boolean }[]; attacked: boolean } | null = null
  private lastOnset = -9
  /** what the gate says now: notes are judged when they end, when the gate has heard the whole note */
  private allow: Allow = 'any'
  /** `onset`: a new attack (a pluck); `allow`: what the voice gate allows right now */
  push(t: number, midi: number | null, onset = false, level = 1, allow: Allow = 'any') {
    this.allow = allow
    const c = this.cur
    // the attack often shows a frame before the pitch tracker moves to the new note
    if (onset) this.lastOnset = t
    if (midi === null) { if (c && t - c.last > 0.12) this.close(c.last); else c?.frames.push({ level, midi, onset }); return }
    // a new attack on the same pitch (a re-pick) starts a new note; the pitch often drops out on the attack frame
    const repick = !!c && this.lastOnset > c.t + 0.12 && this.lastOnset > c.last - 0.05
    if (c && !repick && Math.abs(midi - median(c.midis)) < 0.6) { c.midis.push(midi); c.last = t; c.frames.push({ level, midi, onset }); return }
    const at = repick ? Math.min(t, this.lastOnset) : t
    if (c) this.close(at)
    this.cur = { t: at, midis: [midi], last: t, frames: [{ level, midi, onset: onset || repick }], attacked: repick || t - this.lastOnset < 0.25 }
  }
  close(t: number) {
    const c = this.cur
    this.cur = null
    if (!c || c.midis.length < 2) return
    const allow = this.allow
    if (allow === 'none' || (allow === 'pluck' && !pluckLike(c.frames, c.attacked))) { this.ignored++; return }
    this.notes.push({ t: c.t, dur: Math.max(0.08, t - c.t), midi: Math.round(median(c.midis)) })
  }
}
function median(a: number[]) { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }

/** Heard notes → a tab: lengths rounded to eighth notes at the tempo, played in first position. */
export function tabFromNotes(notes: HeardNote[], bpm: number, tuning: number[], title: string): Song {
  const spb = 60 / bpm
  const t0 = notes[0]?.t ?? 0
  // each note lasts until the next one starts (rounded to an eighth), rests where there are gaps
  const events: { midi: number | null; dur: number }[] = []
  let at = 0
  notes.forEach((n, i) => {
    const start = Math.round(((n.t - t0) / spb) * 2) / 2
    if (start > at) { events.push({ midi: null, dur: start - at }); at = start }
    const next = notes[i + 1] ? Math.round(((notes[i + 1].t - t0) / spb) * 2) / 2 : start + Math.max(0.5, Math.round((n.dur / spb) * 2) / 2)
    const dur = Math.max(0.5, next - start)
    events.push({ midi: n.midi, dur })
    at = start + dur
  })
  // fit the notes on the instrument
  const lo = Math.min(...tuning), hi = Math.max(...tuning) + 15
  const shifted = events.map(e => { if (e.midi === null) return null; let m = e.midi; while (m < lo) m += 12; while (m > hi) m -= 12; return m })
  const placed = fingerMelody(shifted, tuning)
  const bars: SongBar[] = []
  let bar: SongBar = { steps: [] }, used = 0
  events.forEach((e, i) => {
    let left = e.dur
    let first = true
    while (left > 1e-6) {
      const take = Math.min(left, 4 - used)
      const p = placed[i]
      bar.steps.push({ dur: take, notes: first && p ? [{ string: p.string, fret: p.fret, midi: tuning[p.string] + p.fret }] : [] })
      first = false
      left -= take
      used += take
      if (used >= 4 - 1e-6) { bars.push(bar); bar = { steps: [] }; used = 0 }
    }
  })
  if (bar.steps.length) bars.push(bar)
  return { title, tempo: bpm, tracks: [{ name: 'Heard notes', tuning, capo: 0, bars, program: 25 }] }
}

export { keyPrefersFlats }

/** Live listening: chroma frames for chords, pitch frames for notes, ten times a second. */
export class ChordFinder {
  onFrame?: (f: { t: number; chroma: number[]; bass: number[]; level: number; midi: number | null; onset: boolean; heard: Heard }) => void
  private feats: FrameFeatures | null = null
  private gate = new VoiceGate()
  private input: OpenedInput | null = null
  private analyser: AnalyserNode | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private spec = new Float32Array(8192)
  private time = new Float32Array(4096)
  private detector = PitchDetector.forFloat32Array(4096)

  async start() {
    const ctx = audio()
    await ctx.resume()
    this.input = await openInput()
    const src = ctx.createMediaStreamSource(this.input.stream)
    const a = ctx.createAnalyser()
    a.fftSize = 16384
    a.smoothingTimeConstant = 0.5
    src.connect(a)
    this.analyser = a
    this.spec = new Float32Array(a.frequencyBinCount)
    const binHz = ctx.sampleRate / a.fftSize
    this.feats = new FrameFeatures(ctx.sampleRate)
    this.gate = new VoiceGate()
    this.timer = setInterval(() => {
      if (!this.analyser) return
      this.analyser.getFloatFrequencyData(this.spec)
      this.analyser.getFloatTimeDomainData(this.time)
      let s = 0
      for (let i = 0; i < this.time.length; i++) s += this.time[i] * this.time[i]
      const level = Math.sqrt(s / this.time.length)
      const chroma = new Array(12).fill(0)
      addChroma(this.spec, binHz, chroma)
      // the low end on its own (bass notes up to ~200 Hz)
      const bass = new Array(12).fill(0)
      for (let i = Math.floor(38 / binHz); i < Math.floor(200 / binHz); i++) {
        const db = this.spec[i]
        if (db < -80) continue
        const midi = 69 + 12 * Math.log2((i * binHz) / 440)
        const near = Math.round(midi)
        if (Math.abs(midi - near) > 0.35) continue
        bass[((near % 12) + 12) % 12] += Math.pow(10, db / 20)
      }
      const [freq, clarity] = this.detector.findPitch(this.time, ctx.sampleRate)
      const midi = clarity > 0.9 && freq > 60 && freq < 1400 && level > 0.006 ? 69 + 12 * Math.log2(freq / 440) : null
      const ft = this.feats!.run(this.time)
      const heard = this.gate.push({ t: ctx.currentTime, level, midi, flatness: ft.flatness, onset: ft.onset })
      this.onFrame?.({ t: ctx.currentTime, chroma, bass, level, midi, onset: ft.onset, heard })
    }, 40)
  }
  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.input?.stream.getTracks().forEach(t => t.stop())
    this.input = null
    this.analyser = null
  }
}
