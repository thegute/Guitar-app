// Progression → tab: the glue between the chord engine (Jam, starter progressions) and the tab generators
// (Travis / arpeggio / slack key / classical picking; licks and chord melodies are in src/compose). Songs made here are saved with the instrument's other songs.
import type { Instrument } from '../instrument'
import type { Voicing } from '../theory/chords'
import { spell, type ModeId, type ProgChord } from '../theory/progressions'
import { shapesFor } from '../theory/shapes'
import { pickPattern, pickingSong, type PickChord } from './picking'
import type { SongDoc } from './library'

/** Progressions to start from when you haven't made one in Jam (semitones above the key note + chord type). */
export const STARTER_PROGS: { id: string; label: string; mode: ModeId; chords: [number, string][] }[] = [
  { id: 'pop', label: 'I–V–vi–IV (pop)', mode: 'major', chords: [[0, ''], [7, ''], [9, 'm'], [5, '']] },
  { id: 'folk', label: 'I–IV–V–I (folk)', mode: 'major', chords: [[0, ''], [5, ''], [7, ''], [0, '']] },
  { id: 'doowop', label: 'I–vi–IV–V (\'50s)', mode: 'major', chords: [[0, ''], [9, 'm'], [5, ''], [7, '']] },
  { id: 'sad', label: 'vi–IV–I–V (sensitive)', mode: 'major', chords: [[9, 'm'], [5, ''], [0, ''], [7, '']] },
  { id: 'jazz', label: 'ii–V–I–vi (jazz)', mode: 'major', chords: [[2, 'm7'], [7, '7'], [0, 'maj7'], [9, 'm7']] },
  { id: 'minor', label: 'i–VII–VI–V (minor)', mode: 'minor', chords: [[0, 'm'], [10, ''], [8, ''], [7, '']] },
  { id: 'blues', label: '12-bar blues', mode: 'major', chords: [[0, '7'], [0, '7'], [0, '7'], [0, '7'], [5, '7'], [5, '7'], [0, '7'], [0, '7'], [7, '7'], [5, '7'], [0, '7'], [7, '7']] },
]
export function starterProgression(id: string, tonic: string): { mode: ModeId; chords: ProgChord[] } {
  const s = STARTER_PROGS.find(p => p.id === id) ?? STARTER_PROGS[0]
  return { mode: s.mode, chords: s.chords.map(([semi, type]) => ({ ...spell(tonic, s.mode, { semi, type }), beats: 4 })) }
}

/** The progression Jam has now (saved by Jam), if any. */
export function jamProgression(): { tonic: string; mode: ModeId; chords: ProgChord[]; bpm: number } | null {
  try {
    const chords = JSON.parse(localStorage.getItem('kg:jamProg') ?? '[]') as ProgChord[]
    if (!chords.length) return null
    const tonic = JSON.parse(localStorage.getItem('kg:progKey') ?? '"G"') as string
    const mode = JSON.parse(localStorage.getItem('kg:progMode') ?? '"major"') as ModeId
    const bpm = JSON.parse(localStorage.getItem('kg:progBpm') ?? '90') as number
    return { tonic, mode, chords, bpm }
  } catch { return null }
}

/** Shapes for each chord: the ones Jam shows if given, otherwise the most common shape. */
export function pickChords(chords: ProgChord[], inst: Instrument, voicings?: (Voicing | undefined)[]): PickChord[] {
  return chords.map((c, i) => ({ name: c.symbol, root: c.root, voicing: voicings?.[i] ?? shapesFor(c, inst)[0], beats: c.beats ?? 4 }))
    .filter((c): c is PickChord => !!c.voicing)
}

const keyOf = (tonic: string, mode: ModeId) => ({ root: tonic, minor: ['minor', 'dorian', 'phrygian', 'harmonic'].includes(mode) })
const idOf = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) }

export function pickingDoc(chords: ProgChord[], patternId: string, inst: Instrument, bpm: number, tonic: string, mode: ModeId, voicings?: (Voicing | undefined)[]): SongDoc | null {
  const pc = pickChords(chords, inst, voicings)
  if (!pc.length) return null
  const pat = pickPattern(patternId)
  const song = pickingSong(pc, pat.id, inst.midis, { bpm, times: chords.length <= 4 ? 2 : 1, title: `${pat.label}: ${chords.map(c => c.symbol).join(' – ')}` })
  const sig = `${inst.id}:${inst.tuning.id}:${pat.id}:${pc.map(c => c.name + c.voicing.frets.join('.') + c.beats).join(',')}`
  return { id: `jam:pick:${idOf(sig)}`, title: song.title, source: 'jam', inst: inst.id, key: keyOf(tonic, mode), song, updated: Date.now() }
}
