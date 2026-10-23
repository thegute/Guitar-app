// Which instrument the app is set up for: guitar, tenor ukulele or baritone ukulele, and its tuning.
// Everything that draws a neck, shows a chord shape, tunes or quizzes reads from here.
import { useSyncExternalStore } from 'react'
import uke from '@tombatossals/chords-db/lib/ukulele.json'
import { TUNINGS, noteToMidi, pc } from './theory/notes'
import { voicings as guitarVoicings, type Voicing } from './theory/chords'

export type InstrumentId = 'guitar' | 'tenor' | 'baritone'

export interface TuningDef {
  id: string
  name: string
  /** string order as held: top (string nearest your face) first */
  notes: string[]
  reentrant?: boolean
}

export interface InstrumentDef {
  id: InstrumentId
  label: string
  short: string
  noun: string
  strings: number
  tunings: TuningDef[]
  /** the five movable shapes, in order up the neck (CAGED on guitar, CAGFD on tenor ukulele) */
  shapeSystem: string[]
}

export const INSTRUMENTS: Record<InstrumentId, InstrumentDef> = {
  guitar: {
    id: 'guitar', label: 'Guitar', short: 'Guitar', noun: 'guitar', strings: 6,
    tunings: TUNINGS.map(t => ({ id: t.id, name: t.name, notes: t.notes })),
    shapeSystem: ['C', 'A', 'G', 'E', 'D'],
  },
  tenor: {
    id: 'tenor', label: 'Tenor ukulele', short: 'Tenor uke', noun: 'ukulele', strings: 4,
    tunings: [
      { id: 'tenor-high', name: 'High G (re-entrant, gCEA)', notes: ['G4', 'C4', 'E4', 'A4'], reentrant: true },
      { id: 'tenor-low', name: 'Low G (GCEA)', notes: ['G3', 'C4', 'E4', 'A4'] },
    ],
    shapeSystem: ['C', 'A', 'G', 'F', 'D'],
  },
  baritone: {
    id: 'baritone', label: 'Baritone ukulele', short: 'Baritone uke', noun: 'ukulele', strings: 4,
    tunings: [
      { id: 'bari', name: 'Standard (DGBE)', notes: ['D3', 'G3', 'B3', 'E4'] },
      { id: 'bari-high', name: 'High D (re-entrant, dGBE)', notes: ['D4', 'G3', 'B3', 'E4'], reentrant: true },
    ],
    shapeSystem: ['C', 'A', 'G', 'E', 'D'],
  },
}

interface Saved { id: InstrumentId; tuning: Partial<Record<InstrumentId, string>> }
const KEY = 'kg:instrument'
const listeners = new Set<() => void>()
let cache: Saved | null = null
function load(): Saved {
  if (cache) return cache
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? '') as Saved
  } catch {
    cache = null
  }
  if (!cache || !INSTRUMENTS[cache.id]) cache = { id: 'guitar', tuning: {} }
  return cache
}
function save(s: Saved) {
  cache = s
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* storage unavailable */ }
  listeners.forEach(f => f())
}

export function instrumentId(): InstrumentId {
  return load().id
}
export function setInstrument(id: InstrumentId) {
  save({ ...load(), id })
}
export function tuningOf(id: InstrumentId = instrumentId()): TuningDef {
  const def = INSTRUMENTS[id]
  return def.tunings.find(t => t.id === load().tuning[id]) ?? def.tunings[0]
}
export function setTuning(id: InstrumentId, tuningId: string) {
  const s = load()
  save({ ...s, tuning: { ...s.tuning, [id]: tuningId } })
}

export interface Instrument extends InstrumentDef {
  tuning: TuningDef
  /** open-string pitches (MIDI) in string order */
  midis: number[]
  isUke: boolean
}
export function current(): Instrument {
  const def = INSTRUMENTS[instrumentId()]
  const tuning = tuningOf(def.id)
  return { ...def, tuning, midis: tuning.notes.map(noteToMidi), isUke: def.id !== 'guitar' }
}

let snap: Instrument | null = null
let snapKey = ''
export function useInstrument(): Instrument {
  return useSyncExternalStore(
    f => { listeners.add(f); return () => { listeners.delete(f) } },
    () => {
      const s = load()
      const k = s.id + JSON.stringify(s.tuning)
      if (k !== snapKey || !snap) { snapKey = k; snap = current() }
      return snap
    },
  )
}

/** Name for string `s` (e.g. "low E", "G", "high g"). */
export function stringName(midis: number[], s: number, flats = false) {
  const names = flats ? ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const n = names[midis[s] % 12]
  const same = midis.filter(m => m % 12 === midis[s] % 12)
  if (same.length < 2) return n
  const lowest = Math.min(...same)
  return midis[s] === lowest ? `low ${n}` : `high ${n.toLowerCase()}`
}

// ---------- chord shapes ----------
const UKE_KEY: Record<string, string> = {
  C: 'C', 'B#': 'C', 'C#': 'Db', Db: 'Db', D: 'D', 'D#': 'Eb', Eb: 'Eb', E: 'E', Fb: 'E', F: 'F', 'E#': 'F',
  'F#': 'Gb', Gb: 'Gb', G: 'G', 'G#': 'Ab', Ab: 'Ab', A: 'A', 'A#': 'Bb', Bb: 'Bb', B: 'B', Cb: 'B',
}
interface DbPos { frets: number[]; fingers: number[]; baseFret: number; barres: number[] }
const ukeDb = uke as unknown as { chords: Record<string, { suffix: string; positions: DbPos[] }[]> }

function withMidi(frets: number[], fingers: number[], barres: number[], baseFret: number, midis: number[]): Voicing {
  return { frets, fingers, barres, baseFret, midi: frets.map((f, s) => (f < 0 ? -1 : midis[s] + f)).filter(m => m > 0) }
}

/** Chord tones (pitch classes) for a library suffix on a root. */
const SUFFIX_IV: Record<string, number[]> = {
  major: [0, 4, 7], minor: [0, 3, 7], '5': [0, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], dim: [0, 3, 6],
  dim7: [0, 3, 6, 9], m7b5: [0, 3, 6, 10], aug: [0, 4, 8], sus2: [0, 2, 7], sus4: [0, 5, 7], '7sus4': [0, 5, 7, 10],
  add9: [0, 4, 7, 2], madd9: [0, 3, 7, 2], '6': [0, 4, 7, 9], m6: [0, 3, 7, 9], '69': [0, 4, 9, 2], '9': [0, 4, 10, 2],
  maj9: [0, 4, 11, 2], m9: [0, 3, 10, 2], m11: [0, 3, 10, 5], '11': [0, 10, 2, 5], '13': [0, 4, 10, 9], '7b9': [0, 4, 10, 1],
  '7#9': [0, 4, 10, 3], mmaj7: [0, 3, 7, 11], aug7: [0, 4, 8, 10], maj13: [0, 4, 11, 9],
}

/**
 * Find playable shapes for any 4-string tuning by search: every chord tone that matters, at most a 4-fret stretch,
 * as few fingers as possible. Used for baritone and as a fallback.
 */
export function generateShapes(rootName: string, suffix: string, midis: number[], max = 5): Voicing[] {
  const ivs = SUFFIX_IV[suffix]
  if (!ivs) return []
  const root = pc(rootName)
  const tones = ivs.map(i => (root + i) % 12)
  // the 5th can be left out of 4-note chords on 4 strings
  const essential = tones.filter((t, i) => !(ivs[i] === 7 && ivs.length >= 4))
  const n = midis.length
  const found: { v: Voicing; score: number }[] = []
  for (let base = 0; base <= 12; base++) {
    const options = midis.map(m => {
      const fs: number[] = []
      for (let f = base === 0 ? 0 : base; f <= base + 3; f++) if (tones.includes((m + f) % 12)) fs.push(f)
      if (base > 0 && tones.includes(m % 12)) fs.push(0) // open strings can ring with any shape
      return fs
    })
    const rec = (s: number, cur: number[]) => {
      if (s === n) {
        const pcs = new Set(cur.map((f, i) => (midis[i] + f) % 12))
        if (!essential.every(t => pcs.has(t))) return
        const fretted = cur.filter(f => f > 0)
        if (fretted.length && Math.max(...fretted) - Math.min(...fretted) > 3) return
        const minF = fretted.length ? Math.min(...fretted) : 0
        const barreStrings = cur.filter(f => f === minF && f > 0).length
        const fingers = fretted.length - (barreStrings > 1 ? barreStrings - 1 : 0)
        if (fingers > 4) return
        const lowest = cur.map((f, i) => midis[i] + f).reduce((a, b) => Math.min(a, b))
        let score = fingers * 1.2 + minF * 0.35 + (lowest % 12 === root ? -0.8 : 0)
        if (base === 0) score -= 0.5
        const fingersArr = cur.map(f => (f <= 0 ? 0 : f === minF && barreStrings > 1 ? 1 : Math.min(4, f - minF + 1)))
        const v = withMidi(cur.slice(), fingersArr, barreStrings > 1 ? [minF] : [], Math.max(1, minF), midis)
        found.push({ v, score })
        return
      }
      for (const f of options[s]) { cur.push(f); rec(s + 1, cur); cur.pop() }
    }
    rec(0, [])
  }
  const seen = new Set<string>()
  return found
    .sort((a, b) => a.score - b.score)
    .filter(x => { const k = x.v.frets.join(','); if (seen.has(k)) return false; seen.add(k); return true })
    .slice(0, max)
    .map(x => x.v)
    .sort((a, b) => a.baseFret - b.baseFret)
}

/** Chord shapes for the current instrument (absolute frets, string order). */
export function chordShapes(root: string, suffix: string, inst: Instrument = current()): Voicing[] {
  if (inst.id === 'guitar') {
    if (inst.tuning.id === 'standard') return guitarVoicings(root, suffix)
    // other tunings: keep the standard shapes that still spell the chord (e.g. ones that skip a dropped string)
    const ivs = SUFFIX_IV[suffix]
    const tones = ivs ? new Set(ivs.map(i => (pc(root) + i) % 12)) : null
    return guitarVoicings(root, suffix)
      .filter(v => {
        const pcs = v.frets.map((f, s) => (f < 0 ? -1 : (inst.midis[s] + f) % 12)).filter(x => x >= 0)
        return pcs.includes(pc(root)) && (!tones || pcs.every(p => tones.has(p)))
      })
      .map(v => withMidi(v.frets, v.fingers, v.barres, v.baseFret, inst.midis))
  }
  if (inst.id === 'tenor') {
    const list = ukeDb.chords[UKE_KEY[root] ?? root]?.find(c => c.suffix === suffix)
    if (list) {
      return list.positions.map(p => {
        const abs = p.frets.map(f => (f <= 0 ? f : f + p.baseFret - 1))
        return withMidi(abs, p.fingers, p.barres.map(b => b + p.baseFret - 1), p.baseFret, inst.midis)
      })
    }
    return generateShapes(root, suffix, inst.midis)
  }
  // baritone = the top four strings of a guitar, so take guitar shapes that still make the chord there
  const fromGuitar = guitarVoicings(root, suffix)
    .map(v => ({ frets: v.frets.slice(2), fingers: v.fingers.slice(2), barres: v.barres, baseFret: v.baseFret }))
    .filter(v => v.frets.filter(f => f >= 0).length >= 3)
    .filter(v => {
      const pcs = new Set(v.frets.map((f, s) => (f < 0 ? -1 : (inst.midis[s] + f) % 12)))
      return pcs.has(pc(root))
    })
    .map(v => withMidi(v.frets, v.fingers, v.barres.filter(b => v.frets.filter(f => f === b).length > 1), v.baseFret, inst.midis))
  const seen = new Set<string>()
  const out = [...fromGuitar, ...generateShapes(root, suffix, inst.midis, 4)].filter(v => {
    const k = v.frets.join(',')
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  return out.sort((a, b) => a.baseFret - b.baseFret).slice(0, 6)
}
