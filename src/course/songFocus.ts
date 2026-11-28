// Songs pinned to a course lesson (owner 2026-11-28: "upload specific songs into the lesson from Songsterr so I can learn
// the song"): any song in his library (a Songsterr / Ultimate Guitar import, a Guitar Pro file, a scan) can be added to a
// lesson. KGuitar then finds the bars of the song that use what the lesson teaches (its hammer-ons, its bends, its double
// stops, its chords, its scale lines …) so "Practise these bars" loops exactly those, slowed down. Kept on the phone only
// (`kg:lessonSongs`, synced/backed up like the songs themselves).
import type { Song, SongStep } from '../tabs/model'
import { songKeyGuess } from '../tabs/keyDetect'
import { noteToMidi } from '../theory/notes'
import type { CourseLesson } from './types'

const KEY = 'kg:lessonSongs'
const read = (): Record<string, string[]> => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {} } catch { return {} } }
const write = (v: Record<string, string[]>) => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* storage full */ } }
const subs = new Set<() => void>()
export const onLessonSongs = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }

export const lessonSongs = (lessonId: string): string[] => read()[lessonId] ?? []
export function addLessonSong(lessonId: string, songId: string) {
  const all = read(); const l = all[lessonId] ?? []
  if (!l.includes(songId)) { all[lessonId] = [...l, songId]; write(all); subs.forEach(f => f()) }
}
export function removeLessonSong(lessonId: string, songId: string) {
  const all = read(); all[lessonId] = (all[lessonId] ?? []).filter(s => s !== songId)
  if (!all[lessonId].length) delete all[lessonId]
  write(all); subs.forEach(f => f())
}

/** What a lesson's skill looks like in a tab. */
export type Focus = 'legato' | 'bends' | 'slides' | 'muting' | 'doubleStops' | 'triads' | 'chords' | 'scaleLines' | 'bassRuns' | 'sixteenths'
export const FOCUS_LABEL: Record<Focus, string> = {
  legato: 'hammer-ons and pull-offs', bends: 'bends', slides: 'slides', muting: 'muted notes', doubleStops: 'double stops',
  triads: 'three-note chords', chords: 'chords', scaleLines: 'single-note lines in the key', bassRuns: 'bass runs', sixteenths: 'sixteenth notes',
}
const TOPIC_FOCUS: [RegExp, Focus][] = [
  [/legato|hammer|pull/i, 'legato'], [/bend|blue notes/i, 'bends'], [/slide/i, 'slides'], [/muting/i, 'muting'],
  [/double stop|^3rds$|^6ths$|intervals/i, 'doubleStops'], [/triad|top strings|string sets|inversion/i, 'triads'],
  [/chord shapes|barre|caged|power chords|strumming|rhythm guitar|sus chords|add9|seventh chords|extensions|extended|drop 2|shell|chord melody|comping|slash|progression|borrowed|reharm|key change|key centre|diatonic 7th|minor keys|minor-keys|ii-v-i|cadence|secondary|substitution|harmon/i, 'chords'],
  [/pentatonic|blues|major scale|minor-scale|scale|modes|dorian|mixolydian|lydian|phrygian|soloing|improvis|phras|arpeggio|target|approach|lick/i, 'scaleLines'],
  [/bass runs|walking bass|chromatic bass|bass lines|runs/i, 'bassRuns'], [/sixteenths|syncopation|funk/i, 'sixteenths'],
]
/** the skills to look for, in the lesson's own order of topics (most specific first) */
export function lessonFocus(lesson: Pick<CourseLesson, 'topics' | 'title'>): Focus[] {
  const out: Focus[] = []
  for (const t of [...lesson.topics, lesson.title]) for (const [re, f] of TOPIC_FOCUS) if (re.test(t) && !out.includes(f)) out.push(f)
  return out
}

const PENT_MINOR = [0, 3, 5, 7, 10], BLUES = [0, 3, 5, 6, 7, 10], MAJOR = [0, 2, 4, 5, 7, 9, 11], NAT_MINOR = [0, 2, 3, 5, 7, 8, 10]
/** does this bar show the skill? */
function barHas(f: Focus, steps: SongStep[], ctx: { scale: number[] | null; low: number }): boolean {
  const played = steps.map(s => s.notes.filter(n => n.tech !== 'x'))
  switch (f) {
    case 'legato': return steps.some(s => s.notes.some(n => n.tech === 'h' || n.tech === 'p'))
    case 'bends': return steps.some(s => s.notes.some(n => n.tech === 'b'))
    case 'slides': return steps.some(s => s.notes.some(n => n.tech === '/' || n.tech === '\\'))
    case 'muting': return steps.filter(s => s.notes.some(n => n.tech === 'x')).length >= 2
    case 'doubleStops': return played.filter(n => n.length === 2 && Math.abs(n[0].string - n[1].string) <= 2).length >= 2
    case 'triads': return played.filter(n => n.length === 3).length >= 2
    case 'chords': return played.filter(n => n.length >= 3).length >= 2 || steps.some(s => !!s.chord)
    case 'sixteenths': return steps.filter(s => s.dur > 0 && s.dur <= 0.25 && s.notes.length).length >= 4
    case 'bassRuns': {
      const singles = played.filter(n => n.length === 1 && n[0].string <= ctx.low)
      return singles.length >= 3 && played.some(n => n.length >= 3 || n.length === 0) || singles.length >= 4
    }
    case 'scaleLines': {
      if (!ctx.scale) return false
      const singles = played.filter(n => n.length === 1).map(n => n[0].midi)
      if (singles.length < 4) return false
      const inKey = singles.filter(m => ctx.scale!.includes(((m % 12) + 12) % 12)).length
      return inKey / singles.length >= 0.85
    }
  }
}

export interface FocusSpot { focus: Focus; from: number; to: number }
/**
 * Where a song uses a lesson's skill: runs of bars (0-based, `to` inclusive), best first (the longest run of the first
 * skill that the song has), at most 4. The scale lines use the song's key: its pentatonic / blues scale for pentatonic and
 * blues lessons, else the major or natural minor scale.
 */
export function focusSpots(song: Song, focus: Focus[], lessonTopics: string[] = []): FocusSpot[] {
  const tr = song.tracks[0]
  if (!tr || !focus.length) return []
  const key = songKeyGuess(song)
  let scale: number[] | null = null
  if (key) {
    const root = ((noteToMidi(`${key.root}4`) % 12) + 12) % 12
    const pent = lessonTopics.some(t => /pentatonic|blues/i.test(t))
    const base = pent ? (key.minor ? (lessonTopics.some(t => /blues/i.test(t)) ? BLUES : PENT_MINOR) : [0, 2, 4, 7, 9]) : key.minor ? NAT_MINOR : MAJOR
    scale = base.map(i => (root + i) % 12)
  }
  const low = Math.min(2, tr.tuning.length - 1)
  for (const f of focus) {
    const hits = tr.bars.map(b => barHas(f, b.steps, { scale, low }))
    const runs: FocusSpot[] = []
    for (let i = 0; i < hits.length; i++) {
      if (!hits[i]) continue
      let j = i
      while (j + 1 < hits.length && hits[j + 1] && j - i < 3) j++
      runs.push({ focus: f, from: i, to: j })
      i = j
    }
    if (runs.length) return runs.sort((a, b) => (b.to - b.from) - (a.to - a.from) || a.from - b.from).slice(0, 4).sort((a, b) => a.from - b.from)
  }
  return []
}
export const barsLabel = (s: { from: number; to: number }) => (s.from === s.to ? `bar ${s.from + 1}` : `bars ${s.from + 1}–${s.to + 1}`)
