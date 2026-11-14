// The coach's actions (phase B): a micro-drill made from the song's own trouble notes, the speed ramp it runs at, and
// an easier place on the neck for a note that keeps going wrong.
import { playable, type FlatStep, type Song, type SongBar, type SongStep, type SongTrack } from '../tabs/model'
import type { SongDoc } from '../tabs/library'
import type { HandGroup } from '../play/handShape'
import { groupAt } from '../play/handShape'
import { otherSpots } from '../hand/edits'
import type { Trouble } from './trouble'

export const DRILL_ID = 'coach-drill'
/** how many times the drill's bar is written out (one pass of its loop) */
export const DRILL_REPS = 4

/** The few notes around a trouble spot: from the note before it (two before when they're quick) to the note after. */
export function drillSteps(flat: FlatStep[], t: Trouble): { from: number; to: number } {
  const isNote = (i: number) => !!flat[i] && playable(flat[i].step).length > 0
  const prev = (i: number) => { for (let k = i - 1; k >= 0; k--) if (isNote(k)) return k; return -1 }
  const next = (i: number) => { for (let k = i + 1; k < flat.length; k++) if (isNote(k)) return k; return -1 }
  let from = t.before ? t.before.flat : t.spot.flat
  // short notes: one more before, so there's a run-up
  const p = prev(from)
  if (p >= 0 && flat[from].step.dur <= 0.5 && t.spot.flat - p <= 6) from = p
  let to = t.spot.flat
  const n = next(to)
  if (n >= 0 && n - to <= 4) to = n
  // a rushed / dragged bar is drilled whole
  if (t.kind === 'rush' || t.kind === 'drag' || t.kind === 'chord') {
    const inBar = flat.map((f, i) => (f.bar === t.bar && isNote(i) ? i : -1)).filter(i => i >= 0)
    if (inBar.length) { from = Math.min(from, inBar[0]); to = Math.max(to, inBar[inBar.length - 1]) }
  }
  return { from, to }
}

/** A tiny tab of just those notes, written out DRILL_REPS times with a breath between, looped: opened in Play like a
 *  lesson (it has one fixed id, so it never piles up in the library). */
export function makeDrill(doc: SongDoc, track: SongTrack, flat: FlatStep[], t: Trouble): SongDoc {
  const { from, to } = drillSteps(flat, t)
  const steps: SongStep[] = []
  for (let i = from; i <= to; i++) {
    const s = flat[i].step
    steps.push({ ...s, notes: s.notes.map(n => ({ ...n })), lyric: undefined, section: undefined })
  }
  // (the first chord name in force, so the drill shows what it's over)
  if (!steps[0].chord) { for (let i = from - 1; i >= 0; i--) if (flat[i].step.chord) { steps[0].chord = flat[i].step.chord; break } }
  const len = steps.reduce((a, s) => a + s.dur, 0)
  // a whole number of beats, with at least a beat's rest to reset the hand
  const beats = Math.max(2, Math.ceil(len + 1 - 1e-6))
  if (beats - len > 1e-6) steps.push({ notes: [], dur: Math.round((beats - len) * 1000) / 1000 })
  const bars: SongBar[] = Array.from({ length: DRILL_REPS }, () => ({ steps: steps.map(s => ({ ...s, notes: s.notes.map(n => ({ ...n })) })) }))
  const song: Song = { title: `Drill: bar ${t.bar + 1}`, tempo: doc.song.tempo, meter: beats, tracks: [{ name: track.name, tuning: [...track.tuning], capo: track.capo, bars, program: track.program }] }
  return {
    id: DRILL_ID, title: `Drill: bar ${t.bar + 1} of ${doc.title}`, source: 'lesson', inst: doc.inst, song, track: 0,
    loop: { from: 0, to: DRILL_REPS - 1 }, drillOf: { id: doc.id, title: doc.title, bar: t.bar }, updated: Date.now(),
  } as SongDoc
}

// ── the speed ramp: up a little after every two clean passes, down a touch after a flub
export const COACH_RAMP = { start: 0.7, up: 0.03, down: 0.02, every: 2, clean: 90, flub: 70, max: 1, min: 0.4 }
export interface Ramp { speed: number; /** clean passes in a row since the last change */ clean: number }
export function rampNext(r: Ramp, score: number, o = COACH_RAMP): Ramp {
  const round = (v: number) => Math.round(v * 100) / 100
  if (score >= o.clean) {
    const clean = r.clean + 1
    return clean >= o.every ? { speed: Math.min(o.max, round(r.speed + o.up)), clean: 0 } : { speed: r.speed, clean }
  }
  if (score < o.flub) return { speed: Math.max(o.min, round(r.speed - o.down)), clean: 0 }
  return { speed: r.speed, clean: 0 }
}

// ── an easier place for the trouble note
export interface Easier { flat: number; from: { string: number; fret: number }; to: { string: number; fret: number }; /** why it's easier */ why: string }
/** The same note where the hand already is: inside the four frets of the position it comes from (or an open string),
 *  when the tab has it somewhere that makes the hand move or reach. Null when it's already in the easiest place. */
export function easierSpot(flat: FlatStep[], groups: HandGroup[], t: Trouble, tuning: number[], capo: number): Easier | null {
  const s = t.spot
  if (s.fret === 0) return null
  const gPrev = t.before ? groups[groupAt(groups, t.before.flat)] : undefined
  const gHere = groups[groupAt(groups, s.flat)]
  const base = (gPrev ?? gHere)?.base
  if (base === undefined) return null
  const inBox = (f: number) => f === 0 || (f >= base && f <= base + 3)
  // already comfortable: in the box it comes from, not a pinky reach
  if (inBox(s.fret) && !(t.kind === 'stretch') && !(t.kind === 'jump')) return null
  const others = playable(flat[s.flat].step).filter(n => n.string !== s.string).map(n => n.string)
  const opts = otherSpots(s.midi, tuning, capo, tuning.length === 4 ? 15 : 22, base)
    .filter(x => x.string !== s.string && !others.includes(x.string) && inBox(x.fret))
  // for a string jump: the nearest string to the note before wins
  const near = t.before?.string ?? s.string
  opts.sort((a, b) => Math.abs(a.string - near) - Math.abs(b.string - near) || (a.fret === 0 ? -1 : 0) - (b.fret === 0 ? -1 : 0))
  const to = opts[0]
  if (!to) return null
  if (t.kind === 'jump' && Math.abs(to.string - near) >= Math.abs(s.string - near)) return null
  const why = to.fret === 0 ? 'an open string: no reach at all' : t.kind === 'jump' ? 'a string closer to the note before' : `inside the four frets your hand is already on (frets ${base}–${base + 3})`
  return { flat: s.flat, from: { string: s.string, fret: s.fret }, to, why }
}
