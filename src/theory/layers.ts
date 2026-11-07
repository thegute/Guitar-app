// The 5-layer neck: everything a chord shape holds, stacked so you can switch each layer on and off.
//   1 CAGED shape   the chord shape itself (where your hand already is)
//   2 Triad X-ray   the three-note triads hiding inside it, on each set of three strings
//   3 Pentatonic    the five-note box around the shape (major or minor)
//   4 Mode bridge   the two notes that turn the box into a full mode (Ionian/Lydian/Mixolydian, Aeolian/Dorian/
//                   Phrygian), and optionally the whole mode as three notes per string from the shape's root
//   5 Free fingers  sus2 / sus4 / add9 / 6th / 7th notes a spare finger can reach while you hold the shape:
//                   the hammer-ons and pull-offs singer-songwriters and melodic prog players decorate chords with
import type { Instrument } from '../instrument'
import { cagedShapes, shapeWindow, type CagedShape } from '../learn/caged'
import type { Mark } from '../components/Fretboard'

export type LayerId = 'caged' | 'triads' | 'penta' | 'bridge' | 'free'
export const LAYERS: { id: LayerId; label: string; what: string }[] = [
  { id: 'caged', label: 'Shape', what: 'The chord shape: where your hand is' },
  { id: 'triads', label: 'Triads', what: 'Three-note triads inside the shape, on each set of three strings' },
  { id: 'penta', label: 'Pentatonic', what: 'The five-note box around the shape' },
  { id: 'bridge', label: 'Mode notes', what: 'The two notes that turn the box into a full mode' },
  { id: 'free', label: 'Free fingers', what: 'Sus2, sus4, add9, 6th and 7th notes a spare finger can reach while you hold the chord' },
]
export type ModeId = 'ionian' | 'lydian' | 'mixolydian' | 'aeolian' | 'dorian' | 'phrygian'
export const MODES: Record<'maj' | 'min', { id: ModeId; label: string; ivs: number[] }[]> = {
  maj: [
    { id: 'ionian', label: 'Major (Ionian)', ivs: [0, 2, 4, 5, 7, 9, 11] },
    { id: 'lydian', label: 'Lydian (#4)', ivs: [0, 2, 4, 6, 7, 9, 11] },
    { id: 'mixolydian', label: 'Mixolydian (b7)', ivs: [0, 2, 4, 5, 7, 9, 10] },
  ],
  min: [
    { id: 'aeolian', label: 'Minor (Aeolian)', ivs: [0, 2, 3, 5, 7, 8, 10] },
    { id: 'dorian', label: 'Dorian (natural 6)', ivs: [0, 2, 3, 5, 7, 9, 10] },
    { id: 'phrygian', label: 'Phrygian (b2)', ivs: [0, 1, 3, 5, 7, 8, 10] },
  ],
}
const IV = ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7']
/** what a free finger adds, by interval above the root */
const EMBEL: Record<number, string> = { 2: 'sus2/add9', 5: 'sus4', 9: '6', 10: 'b7', 11: 'maj7' }
const EMBEL_LABEL: Record<number, string> = { 2: '9', 5: '4', 9: '6', 10: 'b7', 11: '7' }

export interface LayerSpot { s: number; f: number; midi: number; layer: LayerId; label: string; role: Mark['role']; what?: string }
export interface LayerSet {
  shape: CagedShape | null
  window: [number, number]
  spots: Map<string, LayerSpot>
  chordPcs: number[]
  /** the 3-notes-per-string path when asked for (in playing order) */
  path: LayerSpot[]
}

const key = (s: number, f: number) => `${s}-${f}`

/** Every layer's notes for a major or minor chord, inside one shape (or a fret window when there's no shape). */
export function layerSpots(o: {
  rootPc: number; minor: boolean; inst: Instrument; shape?: string; layers: Set<LayerId>; mode?: ModeId; nps?: boolean; window?: [number, number]
}): LayerSet {
  const { rootPc: r, minor, inst } = o
  const tuning = inst.midis
  const shapes = cagedShapes(r, minor, inst)
  const shape = (o.shape ? shapes.find(x => x.letter === o.shape) : null) ?? (o.window ? null : shapes[0] ?? null)
  const win: [number, number] = shape ? shapeWindow(shape) : o.window ?? [0, 4]
  const third = minor ? 3 : 4
  const chordPcs = [r, (r + third) % 12, (r + 7) % 12]
  const pentaIvs = minor ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9]
  const modes = MODES[minor ? 'min' : 'maj']
  const mode = modes.find(m => m.id === o.mode) ?? modes[0]
  const modePcs = mode.ivs.map(i => (r + i) % 12)
  const bridgePcs = modePcs.filter(p => !pentaIvs.some(i => (r + i) % 12 === p))
  const spots = new Map<string, LayerSpot>()
  const put = (sp: LayerSpot) => { if (!spots.has(key(sp.s, sp.f))) spots.set(key(sp.s, sp.f), sp) }
  const lab = (midi: number) => IV[(((midi % 12) - r) % 12 + 12) % 12]
  const nStr = tuning.length
  // 1 the shape
  if (o.layers.has('caged') && shape) shape.frets.forEach((f, s) => {
    if (f < 0) return
    const midi = tuning[s] + f
    put({ s, f, midi, layer: 'caged', label: lab(midi), role: midi % 12 === r ? 'root' : 'chord' })
  })
  // 2 triads inside the window, on each set of three adjacent strings, compact (within 4 frets)
  if (o.layers.has('triads')) {
    for (let lo = 0; lo + 2 < nStr; lo++) {
      const strs = [lo, lo + 1, lo + 2]
      const opts = strs.map(s => { const fs: number[] = []; for (let f = win[0]; f <= win[1]; f++) if (chordPcs.includes((tuning[s] + f) % 12)) fs.push(f); return fs })
      for (const x of opts[0]) for (const y of opts[1]) for (const z of opts[2]) {
        const fr = [x, y, z]
        if (new Set(fr.map((f, i) => (tuning[strs[i]] + f) % 12)).size !== 3 || Math.max(...fr) - Math.min(...fr) > 4) continue
        fr.forEach((f, i) => { const midi = tuning[strs[i]] + f; put({ s: strs[i], f, midi, layer: 'triads', label: lab(midi), role: midi % 12 === r ? 'root' : 'triad' }) })
      }
    }
  }
  // 3 the pentatonic box, 4 the mode's two extra notes (inside the window)
  for (let s = 0; s < nStr; s++) for (let f = win[0]; f <= win[1]; f++) {
    const midi = tuning[s] + f, p = midi % 12
    const iv = ((p - r) % 12 + 12) % 12
    if (o.layers.has('penta') && pentaIvs.includes(iv)) put({ s, f, midi, layer: 'penta', label: lab(midi), role: p === r ? 'root' : chordPcs.includes(p) ? 'chord' : 'scale' })
    else if (o.layers.has('bridge') && bridgePcs.includes(p)) put({ s, f, midi, layer: 'bridge', label: lab(midi), role: 'pass', what: `${mode.label}: the ${lab(midi)} turns the box into the full mode` })
  }
  // 5 free fingers: notes a spare finger reaches (up to 2 frets) from a note of the shape, on the same string
  if (o.layers.has('free') && shape) shape.frets.forEach((f0, s) => {
    if (f0 < 0) return
    for (let f = Math.max(0, f0 - 2); f <= f0 + 2; f++) {
      if (f === f0) continue
      const midi = tuning[s] + f
      const iv = ((midi % 12) - r + 12) % 12
      if (!(iv in EMBEL) || (minor && iv === 11)) continue
      put({ s, f, midi, layer: 'free', label: EMBEL_LABEL[iv], role: 'embel', what: `${EMBEL[iv]}: ${f > f0 ? 'hammer on' : 'pull off'} from fret ${f0}` })
    }
  })
  // three notes per string through the mode, from the shape's lowest root
  const path: LayerSpot[] = []
  if (o.nps) {
    const start = shape ? Math.min(...shape.roots.map(x => tuning[x.s] + x.f)) : tuning[0] + win[0]
    let m = start
    for (let s = 0; s < nStr; s++) {
      let n = 0
      while (n < 3) {
        const f = m - tuning[s]
        if (f >= 0 && modePcs.includes(m % 12)) {
          // the next string takes over when it's lower down the neck
          path.push({ s, f, midi: m, layer: 'bridge', label: lab(m), role: m % 12 === r ? 'root' : chordPcs.includes(m % 12) ? 'chord' : 'scale' })
          n++
        }
        m++
        if (m - tuning[s] > 22) break
      }
    }
  }
  return { shape, window: win, spots, chordPcs, path }
}

// ---------- double-stops: two notes at once, the way Hendrix, Mayer and soul players decorate a chord ----------
export interface DoubleStop { lo: { s: number; f: number; midi: number }; hi: { s: number; f: number; midi: number }; kind: '3rds' | '4ths' | '6ths'; what: string }
/**
 * Pairs inside a fret window (the shape's, two frets either side): 3rds on neighbouring strings (Mayer, soul), 4ths on
 * neighbouring strings (Hendrix's "Little Wing" moves), 6ths with one string skipped (Hendrix, Cropper). Both notes in the
 * chord's scale (major or natural minor of the root), at least one of them a chord tone.
 */
export function doubleStops(o: { rootPc: number; minor: boolean; tuning: number[]; window: [number, number] }): DoubleStop[] {
  const { rootPc: r, minor, tuning } = o
  const scale = (minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]).map(i => (r + i) % 12)
  const chord = [r, (r + (minor ? 3 : 4)) % 12, (r + 7) % 12]
  const lo = Math.max(0, o.window[0] - 2), hi = o.window[1] + 2
  const out: DoubleStop[] = []
  const name = (m: number) => ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][m % 12]
  const strName = (s: number) => (s === tuning.length - 1 ? 'high e' : ['E', 'A', 'D', 'G', 'B', 'e'][s] ?? `string ${s + 1}`)
  for (let s = 0; s + 1 < tuning.length; s++) for (const gap of [1, 2]) {
    const t = s + gap
    if (t >= tuning.length) continue
    for (let f1 = lo; f1 <= hi; f1++) for (let f2 = lo; f2 <= hi; f2++) {
      if (Math.abs(f1 - f2) > 3) continue
      const a = tuning[s] + f1, b = tuning[t] + f2
      const iv = b - a
      const kind = gap === 1 && (iv === 3 || iv === 4) ? '3rds' : gap === 1 && iv === 5 ? '4ths' : gap === 2 && (iv === 8 || iv === 9) ? '6ths' : null
      if (!kind || !scale.includes(a % 12) || !scale.includes(b % 12) || !(chord.includes(a % 12) || chord.includes(b % 12))) continue
      out.push({ lo: { s, f: f1, midi: a }, hi: { s: t, f: f2, midi: b }, kind, what: `${kind === '3rds' ? 'A 3rd' : kind === '4ths' ? 'A 4th' : 'A 6th'}: ${name(a)} (${strName(s)} string, fret ${f1}) with ${name(b)} (${strName(t)} string, fret ${f2})${kind === '6ths' ? ', skip the string between (mute it with the finger on the lower string)' : ''}` })
    }
  }
  // lowest first within each kind
  return out.sort((x, y) => (x.kind === y.kind ? x.lo.f + x.hi.f - (y.lo.f + y.hi.f) || x.lo.s - y.lo.s : x.kind.localeCompare(y.kind)))
}
