// Chord sets ("Inspire me", Stage 3 + Playbox): a palette of up to 8 chords that sound good together, the way NI Playbox
// works (one chord per key, play them in any order). KGuitar names every chord, gives its Roman numeral in the set's key,
// moves the set to any key and turns it into a progression the rest of the app can play, show and tab.
// Sources: the owner's Playbox chord sets (a PRIVATE data file, imported on the phone, never in the repo) and KGuitar's
// own sets built from its famous progressions (always there, for everyone).
import { Chord, Note } from 'tonal'
import { pc } from './notes'
import { typeTones, spell, MODE_STEPS, TEMPLATES, type ModeId, type ProgChord } from './progressions'

export interface ChordSet {
  id: string
  name: string
  /** tonic pitch class 0–11 */
  key: number
  mode: 'major' | 'minor'
  /** up to 8 chords, MIDI notes low → high (a keyboard voicing) */
  chords: number[][]
  source: 'playbox' | 'kguitar'
}
export type Colour = 'simple' | 'colour' | 'lush'

/** Chord types KGuitar names, simplest first (the namer prefers the simpler of two that fit equally well). */
const TYPES = ['', 'm', 'sus4', 'sus2', 'dim', 'aug', '5', '7', 'm7', 'maj7', '6', 'm6', 'add9', 'madd9', 'm7b5', 'dim7', '7sus4',
  '9', 'm9', 'maj9', '69', 'm11', '13', '7b9']

export interface Named { root: number; type: string; bass: number }
/** Name a chord from its notes: the root and type that explain every note, preferring the bass note as the root and
 *  simpler names. Rootless or unusual voicings still get the closest name. */
export function nameChord(midis: number[]): Named | null {
  const notes = [...new Set(midis.filter(m => m > 0))].sort((a, b) => a - b)
  if (!notes.length) return null
  const pcs = [...new Set(notes.map(m => ((m % 12) + 12) % 12))]
  const bass = ((notes[0] % 12) + 12) % 12
  if (pcs.length === 1) return { root: bass, type: '5', bass }
  let best: { n: Named; cost: number } | null = null
  for (let r = 0; r < 12; r++) {
    TYPES.forEach((t, rank) => {
      const tones = typeTones(t).map(x => (x + r) % 12)
      const extra = pcs.filter(p => !tones.includes(p)).length
      if (extra) return
      // missing chord tones: a missing 5th is normal, anything else counts more
      const missing = tones.filter(p => !pcs.includes(p))
      const miss = missing.reduce((a, p) => a + ((p - r + 12) % 12 === 7 ? 0.4 : 1.6), 0)
      const rootMissing = !pcs.includes(r) ? 2.5 : 0
      const cost = miss + rootMissing + rank * 0.06 + (r === bass ? -1.2 : 0)
      if (!best || cost < best.cost) best = { n: { root: r, type: t, bass }, cost }
    })
  }
  return (best as { n: Named } | null)?.n ?? null
}

/** Sort a set into easy (triads), colourful (sevenths, sus) or lush (9ths and beyond, 5–6 note voicings). */
export function colourOf(set: ChordSet): Colour {
  let score = 0, n = 0
  for (const c of set.chords) {
    const nm = nameChord(c)
    if (!nm) continue
    n++
    score += /9|11|13|69/.test(nm.type) ? 2 : /7|6|sus|add/.test(nm.type) ? 1 : 0
  }
  const avg = n ? score / n : 0
  return avg < 0.45 ? 'simple' : avg < 1.15 ? 'colour' : 'lush'
}

/** The set as a progression in a key: every chord named, spelled for that key, with its Roman numeral. */
export function setChords(set: ChordSet, tonic: string): (ProgChord & { midis: number[]; slash?: string })[] {
  const shift = (pc(tonic) - set.key + 12) % 12
  const mode: ModeId = set.mode
  const out: (ProgChord & { midis: number[]; slash?: string })[] = []
  for (const c of set.chords) {
    const nm = nameChord(c)
    if (!nm) continue
    const semi = (nm.root - set.key + 12) % 12
    const pc0 = spell(tonic, mode, { semi, type: nm.type })
    // keep the voicing in a comfortable keyboard range after the move (around middle C)
    let midis = c.map(m => m + shift)
    while (midis[0] > 57) midis = midis.map(m => m - 12)
    let slash: string | undefined
    if (nm.bass !== nm.root) {
      // the bass spelled as a note of this chord (D7/F#, not D7/Gb); a bass outside the chord follows the key
      const bp = (nm.bass + shift) % 12
      const own = Chord.get(pc0.root + (nm.type === '69' ? '6/9' : nm.type)).notes.find(n => Note.chroma(n) === bp)
      slash = own ? Note.simplify(own) : spell(tonic, mode, { semi: (nm.bass - set.key + 12) % 12, type: '' }).root
    }
    out.push({ ...pc0, symbol: pc0.symbol + (slash ? '/' + slash : ''), midis, slash, beats: 4 })
  }
  return out
}

// ---- where sets come from --------------------------------------------------------------------------------------
const PRIVATE_KEY = 'kgx:chordsets'
/** Keep imported sets (private: the kgx: prefix is never put in a backup). */
export function savePrivateSets(sets: ChordSet[]) {
  try { localStorage.setItem(PRIVATE_KEY, JSON.stringify(sets)) } catch { /* full or private */ }
}
export function privateSets(): ChordSet[] {
  try { const v = localStorage.getItem(PRIVATE_KEY); return v ? (JSON.parse(v) as ChordSet[]) : [] } catch { return [] }
}
/** Read a chordsets.json made by tools/harvest/playbox_chords.py. Unison sets (single notes) are left out. */
export function parseChordSets(json: unknown): ChordSet[] {
  const d = json as { kind?: string; source?: string; sets?: { name: string; key: number; mode: string; cat?: number; chords: number[][] }[] }
  if (!d || d.kind !== 'chordsets' || !Array.isArray(d.sets)) throw new Error('That file is not a KGuitar chord set file')
  return d.sets
    .filter(s => s && Array.isArray(s.chords) && s.chords.filter(c => c.length >= 2).length >= 3)
    .map((s, i) => ({
      id: `${d.source ?? 'imported'}:${i}:${s.name}`, name: s.name, key: ((s.key % 12) + 12) % 12,
      mode: s.mode === 'minor' ? 'minor' : 'major', chords: s.chords.filter(c => c.length >= 2).slice(0, 8),
      source: d.source === 'playbox' ? 'playbox' : 'kguitar',
    }))
}

/** KGuitar's own sets: each famous progression, voiced for keys, plus its key's other chords to fill 8 keys. */
export function builtInSets(): ChordSet[] {
  const out: ChordSet[] = []
  TEMPLATES.forEach((t, i) => {
    const mode = t.modes.includes('major') ? 'major' : t.modes.includes('minor') ? 'minor' : null
    if (!mode) return
    const seen = new Set<string>()
    const chords: number[][] = []
    const add = (semi: number, type: string) => {
      const k = semi + ':' + type
      if (seen.has(k) || chords.length >= 8) return
      seen.add(k)
      chords.push(voice(semi, type))
    }
    for (const [semi, type] of t.chords) add(semi, type)
    // fill the palette from the key's own chords, sevenths if the progression uses them
    const sev = t.chords.some(([, ty]) => /7|9/.test(ty))
    for (let d = 0; d < 7 && chords.length < 8; d++) add(...diatonicType(mode, d, sev))
    out.push({ id: `kg:${i}`, name: t.name, key: 0, mode, chords, source: 'kguitar' })
  })
  return out
}
function diatonicType(mode: 'major' | 'minor', degree: number, sevenths: boolean): [number, string] {
  const s = MODE_STEPS[mode]
  const at = (k: number) => (s[(degree + k) % 7] - s[degree] + 12) % 12
  const third = at(2), fifth = at(4), seventh = at(6)
  let t = third === 4 ? (fifth === 8 ? 'aug' : '') : fifth === 6 ? 'dim' : 'm'
  if (sevenths) t = third === 4 ? (seventh === 11 ? 'maj7' : '7') : fifth === 6 ? 'm7b5' : 'm7'
  return [s[degree], t]
}
/** A plain keyboard voicing around middle C: root in the bass, then the chord tones closely above. */
function voice(semi: number, type: string): number[] {
  const root = 48 + semi
  const tones = typeTones(type)
  const upper = tones.map(x => 60 + ((semi + x) % 12)).sort((a, b) => a - b)
  return [root, ...upper]
}

export interface RollOpts { mood?: 'any' | 'major' | 'minor'; colour?: 'any' | Colour; avoid?: string; source?: 'any' | 'playbox' | 'kguitar' }
/** Every set available: the owner's imported ones first. */
export function allSets(): ChordSet[] { return [...privateSets(), ...builtInSets()] }
/** A random set that fits the filters (never the one just shown). */
export function rollSet(o: RollOpts = {}, rnd = Math.random, sets = allSets()): ChordSet | null {
  const pool = sets.filter(s =>
    (!o.mood || o.mood === 'any' || s.mode === o.mood) &&
    (!o.colour || o.colour === 'any' || colourOf(s) === o.colour) &&
    (!o.source || o.source === 'any' || s.source === o.source) &&
    s.id !== o.avoid)
  if (!pool.length) return null
  return pool[Math.floor(rnd() * pool.length)]
}
/** Shuffle the order (Playbox's Shuffle), keeping locked chords where they are. */
export function shuffleChords<T>(chords: T[], locked: boolean[], rnd = Math.random): T[] {
  const free = chords.filter((_, i) => !locked[i])
  for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [free[i], free[j]] = [free[j], free[i]] }
  let k = 0
  return chords.map((c, i) => (locked[i] ? c : free[k++]))
}
