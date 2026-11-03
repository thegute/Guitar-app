// Notes from a recording, with Spotify's open-source note detector (Basic Pitch, Apache 2.0, runs on the phone): far
// better than listening live for a single instrument (you playing, a solo guitar lesson). The notes are rounded to the
// beat grid and put on the neck as a tab: single notes (a lead line) or chords too.
import { lickSong, type LickEvent } from '../licks/notation'
import type { Song } from '../tabs/model'
import { style } from '../compose/styles'
import { placeLine } from '../compose/fret'
import { placeArranged } from '../compose/arrange'
import { rng, type LNote } from '../compose/line'

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

/** Every note in a recording (any number at once), with start, length, pitch and loudness. */
export async function transcribe(x: Float32Array, sr: number, onPercent?: (p: number) => void): Promise<HeardNote[]> {
  const audio = await resample(x, sr)
  const bp = await import('@spotify/basic-pitch')
  const model = new bp.BasicPitch(`${import.meta.env.BASE_URL}models/basic-pitch/model.json`)
  const frames: number[][] = [], onsets: number[][] = [], contours: number[][] = []
  await model.evaluateModel(audio, (f, o, c) => { frames.push(...f); onsets.push(...o); contours.push(...c) }, p => onPercent?.(p))
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
  const st = style('pop')
  let events: LickEvent[]
  if (!chords) {
    const line: LNote[] = keys.map((k, i) => {
      const ns = slots.get(k)!
      const top = ns.reduce((a, b) => (b.amp > a.amp ? b : a))
      const next = keys[i + 1] ?? k + Math.max(1, Math.round(top.dur / grid))
      return { at: at(k), dur: Math.max(.25, at(Math.min(next, k + Math.max(1, Math.round(top.dur / grid)))) - at(k)), midi: top.midi, strong: k % 4 === 0, role: 'chord' }
    })
    const placed = placeLine(line, tuning, st, rng(1), 4, 0)
    events = placed.events
  } else {
    const evs = keys.map((k, i) => {
      const ns = [...new Map(slots.get(k)!.map(n => [n.midi, n])).values()].sort((a, b) => b.midi - a.midi).slice(0, 4)
      const next = keys[i + 1] ?? k + 4
      return { at: at(k), dur: at(next) - at(k), melody: ns[0].midi, bass: ns.length > 1 ? ns[ns.length - 1].midi : undefined, inner: ns.slice(1, -1).slice(0, 2).map(n => n.midi) }
    })
    const placed = placeArranged(evs, tuning, st)
    const lead = evs[0].at > 0 ? [{ notes: [], dur: evs[0].at }] : []
    events = [...lead, ...placed.events]
  }
  if (!events.some(e => e.notes.length)) return null
  return lickSong(events, { tuning, title, tempo: bpm, program: 25 })
}
