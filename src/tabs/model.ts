// One song model for every tab source (Guitar Pro files, text tabs, examples).
import { noteToMidi } from '../theory/notes'
import { stepDurations, type TextTabSong } from './textTab'

export interface SongNote {
  /** 0 = lowest string */
  string: number
  fret: number
  /** sounding pitch (includes the capo) */
  midi: number
  /** technique hint shown next to the number: h, p, /, \, b, ~, x */
  tech?: string
}
export interface SongStep {
  notes: SongNote[]
  /** length in quarter notes (0.5 = eighth) */
  dur: number
  /** chord name that starts on this step, if the source names one */
  chord?: string
  /** chord sheets: the words sung over this chord, and a section name (Verse, Chorus …) starting here */
  lyric?: string
  section?: string
}
export interface SongBar {
  steps: SongStep[]
}
export interface SongTrack {
  name: string
  /** open-string pitches as MIDI numbers, lowest string first (without capo) */
  tuning: number[]
  capo: number
  bars: SongBar[]
  /** General MIDI instrument from a Guitar Pro file (25 acoustic, 29 overdrive, 30 distortion ...): picks the Hear it sound */
  program?: number
}
export interface Song {
  title: string
  artist?: string
  tempo?: number
  /** beats (quarter notes) in a bar: 4 for 4/4, 3 for 3/4 and 6/8; leave out for 4 */
  meter?: number
  /** chord sheets: the strum pattern to show over each bar (see play/strumCoach.ts) */
  strum?: string
  /** a Guitar Pro file's drum part, in beats from the start */
  drums?: { beat: number; voice: import('../audio/drums').Voice; vel: number }[]
  /** drums and bass made from the chord names (songbook songs): a groove and a bass line from Jam */
  backing?: { groove: string; bass: string }
  tracks: SongTrack[]
}

export function fromTextTab(t: TextTabSong): Song {
  const tuning = t.tuning.map(noteToMidi)
  const durs = stepDurations(t)
  return {
    title: t.title,
    tracks: [
      {
        name: 'Guitar',
        tuning,
        capo: 0,
        bars: t.bars.map((bar, bi) => ({
          steps: bar.map((st, si) => ({
            dur: durs[bi][si],
            chord: st.chord,
            notes: st.notes.map(n => ({ string: n.string, fret: n.fret, midi: tuning[n.string] + n.fret, tech: n.tech })),
          })),
        })),
      },
    ],
  }
}

/** Steps flattened in playing order, with their place in the bars. */
export interface FlatStep {
  bar: number
  idx: number
  step: SongStep
}
export function flatten(track: SongTrack): FlatStep[] {
  const out: FlatStep[] = []
  track.bars.forEach((b, bi) => b.steps.forEach((s, si) => out.push({ bar: bi, idx: si, step: s })))
  return out
}

/** How many beats a short first bar (a pickup) is shifted so it ends on the bar's last beat; 0 when it isn't one.
 *  Only a first bar shorter than the bars after it counts: a text tab whose bars are all shorter than the meter
 *  (its rhythm is a guess) has no pickup. Takes bar lengths in beats. */
export function pickupShift(barLens: number[], meter = 4): number {
  if (!barLens.length) return 0
  const first = barLens[0]
  const rest = barLens.slice(1).filter(l => l > 1e-6).map(l => Math.round(l * 4) / 4)
  if (!rest.length) return first < meter - 1e-6 ? meter - first : 0
  // the usual bar length after the first
  const count = new Map<number, number>()
  for (const l of rest) count.set(l, (count.get(l) ?? 0) + 1)
  const usual = [...count.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0]
  const full = Math.min(meter, usual)
  return first < full - 1e-6 ? full - first : 0
}
export const trackPickup = (track: SongTrack, meter = 4) => pickupShift(track.bars.map(b => b.steps.reduce((a, s) => a + s.dur, 0)), meter)

/** Runs of 2+ bars with nothing to play, no chord names and no words (a part that comes in late, a long break):
 *  the tab draws each run as one short rest block. A section name may only start a run. `keep(bar)` stops a bar
 *  from joining a run (e.g. it has a chord from the chord list). */
export function restRuns(track: SongTrack, keep: (bar: number) => boolean = () => false): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = []
  const empty = (i: number) => !keep(i) && track.bars[i].steps.every(s => !s.notes.length && !s.chord && !s.lyric?.trim())
  let i = 0
  while (i < track.bars.length) {
    if (!empty(i)) { i++; continue }
    let j = i
    while (j + 1 < track.bars.length && empty(j + 1) && !track.bars[j + 1].steps[0]?.section) j++
    if (j > i) out.push({ from: i, to: j })
    i = j + 1
  }
  return out
}

/** The notes you actually pick (dead notes are left out: they have no pitch to hear). */
export function playable(step: SongStep) {
  return step.notes.filter(n => n.tech !== 'x')
}

/** Pick the track most likely to be the lead / main part for this instrument (6 strings for guitar, 4 for ukulele). */
export function defaultTrack(song: Song, strings = 6) {
  let best = 0
  let bestScore = -1
  song.tracks.forEach((t, i) => {
    // count picked steps (a single-note line beats a strummed part with the same number of notes)
    const notes = t.bars.reduce((a, b) => a + b.steps.filter(s => s.notes.length).length, 0)
    const wanted = strings === 4 ? /uke|ukulele/i : /guit|gtr|lead|solo|melody/i
    const guitarish = wanted.test(t.name) ? 1.5 : /bass|drum|vocal|voice/i.test(t.name) ? 0.3 : 1
    const fits = t.tuning.length === strings ? 1.3 : 0.7
    const score = notes * guitarish * fits
    if (score > bestScore) { bestScore = score; best = i }
  })
  return best
}
