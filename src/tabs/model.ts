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
