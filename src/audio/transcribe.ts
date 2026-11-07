// Notes from a recording, with Spotify's open-source note detector (Basic Pitch, Apache 2.0, runs on the phone): far
// better than listening live for a single instrument (you playing, a solo guitar lesson). The notes are rounded to the
// beat grid and put on the neck as a tab: single notes (a lead line) or chords too.
import { lickSong, type LickEvent } from '../licks/notation'
import type { Song } from '../tabs/model'
import { placeAndFinger } from '../hand/engine'
import { handSize, scaleFor } from '../hand/neck'

export interface HeardNote { start: number; dur: number; midi: number; amp: number }

/** A mono recording at any rate → 22050 Hz (the detector's rate). */
async function resample(x: Float32Array, sr: number): Promise<Float32Array> {
  if (sr === 22050) return x
  const ctx = new OfflineAudioContext(1, Math.ceil((x.length * 22050) / sr), 22050)
  const buf = ctx.createBuffer(1, x.length, sr)
  buf.getChannelData(0).set(x)
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.connect(ctx.destination)
  src.start()
  return (await ctx.startRendering()).getChannelData(0)
}

// Basic Pitch's own windows: 2 s (43844 samples at 22050 Hz), 30 frames of overlap; 15 frames dropped at each edge
const BP = { win: 22050 * 2 - 256, overlap: 30 * 256, edge: 15 }
/** The windows Basic Pitch looks at (exactly as its own code cuts them) and how many frames the whole clip has. */
export function bpWindows(audio: Float32Array): { wins: Float32Array[]; frames: number } {
  const hop = BP.win - BP.overlap
  const padded = new Float32Array(BP.overlap / 2 + audio.length)
  padded.set(audio, BP.overlap / 2)
  const wins: Float32Array[] = []
  for (let a = 0; a < padded.length; a += hop) { const w = new Float32Array(BP.win); w.set(padded.subarray(a, a + BP.win)); wins.push(w) }
  return { wins, frames: Math.floor(audio.length * (Math.floor(22050 / 256) / 22050)) }
}
/** One window's output (frames × bins) without its overlapping edges, as rows. */
export function bpUnwrap(x: Float32Array, bins: number): number[][] {
  const n = x.length / bins, rows: number[][] = []
  for (let f = BP.edge; f < n - BP.edge; f++) rows.push(Array.from(x.subarray(f * bins, (f + 1) * bins)))
  return rows
}

/** Every note in a recording (any number at once), with start, length, pitch and loudness. */
export async function transcribe(x: Float32Array, sr: number, onPercent?: (p: number) => void): Promise<HeardNote[]> {
  const audio = await resample(x, sr)
  const bp = await import('@spotify/basic-pitch')
  let frames: number[][] = [], onsets: number[][] = [], contours: number[][] = []
  try {
    // fast: the same network through ONNX Runtime
    const { basicPitchRunner } = await import('../ml/models')
    const run = await basicPitchRunner()
    const { wins, frames: total } = bpWindows(audio)
    for (let i = 0; i < wins.length && frames.length < total; i++) {
      onPercent?.(i / wins.length)
      const r = await run(wins[i])
      frames.push(...bpUnwrap(r.frames, 88)); onsets.push(...bpUnwrap(r.onsets, 88)); contours.push(...bpUnwrap(r.contours, 264))
    }
    frames = frames.slice(0, total); onsets = onsets.slice(0, total); contours = contours.slice(0, total)
    onPercent?.(1)
  } catch {
    // offline in a browser that hasn't fetched ONNX Runtime yet: its TensorFlow.js build (slower, always here)
    frames = []; onsets = []; contours = []
    const model = new bp.BasicPitch(`${import.meta.env.BASE_URL}models/basic-pitch/model.json`)
    await model.evaluateModel(audio, (f, o, c) => { frames.push(...f); onsets.push(...o); contours.push(...c) }, p => onPercent?.(p))
  }
  const events = bp.noteFramesToTime(bp.addPitchBendsToNoteEvents(contours, bp.outputToNotesPoly(frames, onsets, 0.5, 0.3, 11, true, null, null, true)))
  return events.map(e => ({ start: e.startTimeSeconds, dur: e.durationSeconds, midi: e.pitchMidi, amp: e.amplitude })).sort((a, b) => a.start - b.start)
}

/** The tempo the notes move at (from the gaps between note starts), between 60 and 180 BPM. */
export function guessTempo(notes: HeardNote[]): number | null {
  const starts = [...new Set(notes.map(n => Math.round(n.start * 50) / 50))].sort((a, b) => a - b)
  if (starts.length < 8) return null
  let best = 0, bestScore = -1
  for (let bpm = 60; bpm <= 180; bpm += 1) {
    const g = 60 / bpm / 2 // eighth notes
    let score = 0
    for (const s of starts) { const d = Math.abs(s / g - Math.round(s / g)); score += 1 - Math.min(1, d * 4) }
    // prefer the slower of equal fits a little (so 8ths aren't heard as quarters)
    score -= bpm * 0.002
    if (score > bestScore) { bestScore = score; best = bpm }
  }
  return best
}

/** The notes as a tab: rhythm rounded to 16ths at `bpm`, single notes (the loudest at each moment) or chords too. */
export function notesToTab(notes: HeardNote[], bpm: number, tuning: number[], title: string, chords: boolean): Song | null {
  const lo = tuning[0], hi = tuning[tuning.length - 1] + 19
  const loud = notes.filter(n => n.midi >= lo && n.midi <= hi && n.amp >= 0.18)
  if (!loud.length) return null
  const grid = 60 / bpm / 4
  const t0 = loud[0].start
  const slots = new Map<number, HeardNote[]>()
  for (const n of loud) { const k = Math.max(0, Math.round((n.start - t0) / grid)); (slots.get(k) ?? slots.set(k, []).get(k)!).push(n) }
  const keys = [...slots.keys()].sort((a, b) => a - b)
  const at = (k: number) => k / 4 // in beats
  // the hand brain places the notes (strings, frets) so the hand moves as little as possible
  const evs = keys.map((k, i) => {
    const ns = slots.get(k)!
    const top = ns.reduce((a, b) => (b.amp > a.amp ? b : a))
    const next = keys[i + 1] ?? k + Math.max(1, Math.round(top.dur / grid))
    const end = chords ? next : Math.min(next, k + Math.max(1, Math.round(top.dur / grid)))
    const midis = chords ? [...new Set(ns.map(n => n.midi))].sort((a, b) => b - a).slice(0, 4) : [top.midi]
    return { at: at(k), dur: Math.max(0.25, at(end) - at(k)), midis }
  })
  const placed = placeAndFinger(evs.map(e => ({ midis: e.midis, dur: e.dur })), { scale: scaleFor(tuning.length), size: handSize(), tuning, open: 0.5, warm: 0.3 })
  const events: LickEvent[] = []
  let t = 0
  evs.forEach((e, i) => {
    if (e.at > t + 1e-6) events.push({ notes: [], dur: Math.round((e.at - t) * 1e4) / 1e4 })
    events.push({ notes: placed.notes[i].map(n => ({ string: n.string, fret: n.fret })), dur: e.dur })
    t = e.at + e.dur
  })
  if (!events.some(e => e.notes.length)) return null
  return lickSong(events, { tuning, title, tempo: bpm, program: 25 })
}
