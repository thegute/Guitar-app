// Progression → tab: the glue between the chord engine (Jam, starter progressions) and the tab generators
// (Travis / arpeggio / slack key / classical picking; licks and chord melodies are in src/compose). Songs made here are saved with the instrument's other songs.
import type { Instrument } from '../instrument'
import type { Voicing } from '../theory/chords'
import { pc } from '../theory/notes'
import { STYLE_DEFAULTS, spell, typeTones, type ModeId, type ProgChord, type Style } from '../theory/progressions'
import { shapesFor } from '../theory/shapes'
import { bandByStep, type BandEvent } from '../audio/band'
import { grooveOf } from '../audio/drums'
import { bassLine, bassMidi } from '../audio/bass'
import type { SoundId } from '../audio/pluck'
import { pickPattern, pickingSong, type PickChord } from './picking'
import { flatten, type Song } from './model'
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

const readPref = <T,>(k: string, fallback: T): T => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback } catch { return fallback }
}

/** Build TabPlayer-aligned backing events (drums, bass, chords) from the current Jam progression. */
export function jamBandForSong(song: Song, inst: Instrument): { off: number; e: BandEvent }[][] | null {
  const jam = jamProgression()
  const track = song.tracks[0]
  if (!jam || !jam.chords.length || !track) return null
  const flat = flatten(track)
  const totalBeats = flat.reduce((a, f) => a + f.step.dur, 0)
  if (totalBeats <= 0) return null

  const style = readPref<Style>('kg:progStyle', 'any')
  const def = STYLE_DEFAULTS[style] ?? STYLE_DEFAULTS.any
  const drumPick = readPref<string>('kg:jamDrums', 'auto')
  const bassPick = readPref<string>('kg:jamBass', 'auto')
  const tonePick = readPref<string>('kg:jamTone', 'auto')
  const drumId = drumPick === 'auto' ? def.drums : drumPick
  const bassId = bassPick === 'auto' ? def.bass : bassPick
  const tone = (tonePick === 'auto' ? def.tone : tonePick) as SoundId
  const groove = drumId !== 'off' ? grooveOf(drumId) : undefined
  const bass = bassId !== 'off' ? bassLine(bassId) : undefined

  const ev: BandEvent[] = []
  let b = 0
  let idx = 0
  let prevBass: number | null = null
  while (b < totalBeats - 1e-6) {
    const c = jam.chords[idx % jam.chords.length]
    const next = jam.chords[(idx + 1) % jam.chords.length]
    const span = Math.min(c.beats ?? 4, totalBeats - b)
    const v = shapesFor(c, inst)[0]
    const ms = v ? v.frets.map((f, s) => (f < 0 ? -1 : inst.midis[s] + f)).filter(m => m > 0) : []
    if (ms.length) {
      for (let off = 0; off < span - 1e-6; off += 4) {
        ev.push({ beat: b + off, kind: 'gtr', level: 0.34, dur: Math.min(4, span - off), midis: ms, sound: tone })
      }
    }
    const bc = { root: pc(c.root), tones: typeTones(c.type) }
    const nx = { root: pc(next.root), tones: typeTones(next.type) }
    for (let barOff = 0; barOff < span - 1e-6; barOff += 4) {
      const segLen = Math.min(4, span - barOff)
      if (groove) {
        for (const [p, voice, lvl] of groove.hits) {
          if (p < segLen - 1e-6) {
            ev.push({ beat: b + barOff + p, kind: 'drum', voice, level: lvl * 0.58 * (groove.level ?? 1), kit: { kit: groove.kit, pieces: groove.pieces }, dur: 0 })
          }
        }
      }
      if (bass) {
        for (const [p, deg, len, lvl] of bass.hits) {
          if (p < segLen - 1e-6) {
            const m = bassMidi(deg, bc, nx, Math.floor(p), prevBass)
            prevBass = m
            ev.push({ beat: b + barOff + p, kind: 'bass', midis: [m], dur: Math.min(len, segLen - p), level: 0.72 * lvl * (bass.level ?? 1) })
          }
        }
      }
    }
    b += span
    idx++
  }
  ev.sort((a, b2) => a.beat - b2.beat)
  return bandByStep(ev, flat)
}
