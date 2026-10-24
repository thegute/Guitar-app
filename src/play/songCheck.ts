// "Song check": what a song asks of you before you start. The chords, barre chords, techniques, the fastest bar,
// how high up the neck it goes, a level (1–4) and a speed to start at. Also spots a different tuning or a capo.
import { chordShapes, INSTRUMENTS, type Instrument } from '../instrument'
import { parseSymbol } from '../theory/chords'
import { noteToMidi, pcName } from '../theory/notes'
import type { Level } from '../tabs/songbook'
import { playable, type Song, type SongTrack } from '../tabs/model'

export const TECHNIQUES: Record<string, string> = {
  h: 'hammer-ons', p: 'pull-offs', '/': 'slides', '\\': 'slides', b: 'bends', r: 'bends', '~': 'vibrato', x: 'muted notes', PM: 'palm muting', t: 'tapping',
}

export interface SongCheck {
  level: Level
  why: string[]
  chords: string[]
  barre: string[]
  techniques: { label: string; count: number }[]
  /** the busiest bar (0-based) and how many notes a second it asks for at full speed */
  fastest: { bar: number; nps: number } | null
  maxFret: number
  /** 0.5, 0.75 or 1 (the Play speed buttons) */
  startSpeed: number
  /** set when the song's tuning isn't what the instrument is tuned to now */
  tuning: { name: string; id?: string; notes: string } | null
  capo: number
}

const tuningNotes = (midis: number[]) => midis.map(m => pcName(m % 12, false)).join(' ')

/** Which known tuning (if any) a track uses. */
export function tuningName(midis: number[], instId: keyof typeof INSTRUMENTS) {
  const def = INSTRUMENTS[instId]
  const t = def.tunings.find(x => x.notes.length === midis.length && x.notes.every((n, i) => noteToMidi(n) === midis[i]))
  return t ? { id: t.id, name: t.name.replace(/\s*\(.*\)$/, '') } : null
}

/** A shape counts as a barre when one finger holds down two or more strings at the lowest fret, nothing open. */
function isBarreStep(notes: { string: number; fret: number }[]) {
  if (notes.length < 4 || notes.some(n => n.fret === 0)) return false
  const low = Math.min(...notes.map(n => n.fret))
  return notes.filter(n => n.fret === low).length >= 2
}

export function checkSong(song: Song, track: SongTrack, inst: Instrument, chordNames: string[] = [], playerLevel = 2): SongCheck {
  const tempo = song.tempo ?? 90
  const why: string[] = []
  // chords: the names the tab gives, then any from the chord list (guessed or edited)
  const chords: string[] = []
  for (const b of track.bars) for (const s of b.steps) if (s.chord && !chords.includes(s.chord)) chords.push(s.chord)
  for (const n of chordNames) if (!chords.includes(n)) chords.push(n)
  // barre chords: shapes from the chord list (chord sheets), or barre shapes in the tab itself
  const barre = new Set<string>()
  const sheet = track.bars.every(b => b.steps.every(s => !s.notes.length || !!s.chord))
  if (sheet) {
    for (const c of chords) {
      const { root, suffix } = parseSymbol(c)
      const v = chordShapes(root, suffix, inst)[0]
      if (v && v.barres.length) barre.add(c)
    }
  }
  const techCount = new Map<string, number>()
  let maxFret = 0
  let fastest: SongCheck['fastest'] = null
  track.bars.forEach((b, bi) => {
    let notes = 0, beats = 0
    let lastChord: string | undefined
    for (const s of b.steps) {
      beats += s.dur
      if (s.chord) lastChord = s.chord
      const ps = playable(s)
      if (ps.length) notes++
      for (const n of s.notes) {
        if (n.fret > maxFret) maxFret = n.fret
        if (n.tech) { const l = TECHNIQUES[n.tech] ?? TECHNIQUES[n.tech[0]]; if (l) techCount.set(l, (techCount.get(l) ?? 0) + 1) }
      }
      if (!sheet && isBarreStep(ps)) barre.add(lastChord ?? `bar ${bi + 1}`)
    }
    const secs = (beats * 60) / tempo
    if (secs > 0 && notes >= 2) {
      const nps = notes / secs
      if (!fastest || nps > fastest.nps) fastest = { bar: bi, nps }
    }
  })
  const techniques = [...techCount.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)

  // level: a rough score from what the song asks for
  let score = 1
  if (chords.length > 3) { score += 0.5; if (chords.length > 6) score += 0.5 }
  if (barre.size) { score += 1; why.push('barre chords') }
  const tl = techniques.map(t => t.label)
  if (tl.includes('bends') || tl.includes('vibrato')) { score += 1; why.push('bends') }
  else if (tl.some(l => ['slides', 'hammer-ons', 'pull-offs', 'palm muting'].includes(l))) { score += 0.5; why.push('slides and slurs') }
  const nps = (fastest as SongCheck['fastest'])?.nps ?? 0
  if (nps > 8) { score += 1.5; why.push('fast runs') } else if (nps > 5) { score += 1; why.push('quick notes') } else if (nps > 3) score += 0.5
  if (maxFret > 9) { score += 1; why.push('high up the neck') } else if (maxFret > 5) score += 0.5
  if (chords.length > 6) why.push(`${chords.length} chords`)
  const level = Math.max(1, Math.min(4, Math.round(score))) as Level

  // a speed where the fastest bar is comfortable for your level
  const comfy = [2.5, 3.5, 5, 8][Math.max(0, Math.min(3, playerLevel - 1))]
  const ratio = nps ? comfy / nps : 1
  const startSpeed = ratio >= 0.95 ? 1 : ratio >= 0.7 ? 0.75 : 0.5

  // tuning
  let tuning: SongCheck['tuning'] = null
  const same = track.tuning.length === inst.midis.length && track.tuning.every((m, i) => m === inst.midis[i])
  if (!same && track.tuning.length === inst.midis.length) {
    const known = tuningName(track.tuning, inst.id)
    tuning = { name: known?.name ?? 'an unusual tuning', id: known?.id, notes: tuningNotes(track.tuning) }
  }
  return { level, why, chords, barre: [...barre], techniques, fastest, maxFret, startSpeed, tuning, capo: track.capo }
}
