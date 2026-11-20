// The CAGED lesson's playable tabs and neck pictures (Level 4, lesson 1), worked out for any instrument's tuning:
// guitar CAGED, tenor ukulele CAGFD, baritone (a guitar's top four strings). Built on learn/caged.ts cagedShapes.
import { cagedShapes, type CagedShape } from '../learn/caged'
import { INSTRUMENTS, type Instrument } from '../instrument'
import type { Song, SongBar, SongStep } from '../tabs/model'

const GUITAR = [40, 45, 50, 55, 59, 64]
/** An Instrument for a bare tuning (what lesson tabs and neck pictures get). */
export function instOf(tuning: number[]): Instrument {
  const id = tuning.length >= 6 ? 'guitar' : tuning[0] > tuning[1] ? 'tenor' : 'baritone'
  const def = INSTRUMENTS[id]
  return { ...def, tuning: def.tunings[0], midis: tuning, isUke: id !== 'guitar' } as Instrument
}
export const isGuitar = (tuning: number[]) => tuning.length === GUITAR.length && tuning.every((m, i) => m === GUITAR[i])

/** The interval of a note above a chord root, as a chord-tone label (1 = root). */
export function toneLabel(midi: number, rootPc: number, minor: boolean): string {
  const iv = (((midi - rootPc) % 12) + 12) % 12
  return iv === 0 ? 'R' : iv === (minor ? 3 : 4) ? (minor ? '♭3' : '3') : iv === 7 ? '5' : '?'
}

/** A shape as notes (low string to high). */
export function shapeNotes(sh: CagedShape, tuning: number[]) {
  return sh.frets.map((f, s) => ({ string: s, fret: f, midi: tuning[s] + f })).filter(n => n.fret >= 0)
}

/** The shapes of a chord, each one inside frets 0–15. */
export function shapesOf(rootPc: number, minor: boolean, tuning: number[]): CagedShape[] {
  return cagedShapes(rootPc, minor, instOf(tuning)).filter(s => s.hi <= 15)
}

/** Neck-picture marks for one or more shapes: R / 3 / 5 on every note, roots marked as roots. */
export function shapeMarks(rootPc: number, minor: boolean, tuning: number[], pick?: (shapes: CagedShape[]) => CagedShape[], from = 0) {
  const all = shapesOf(rootPc, minor, tuning)
  const use = pick ? pick(all) : all
  const seen = new Set<string>()
  const out: { s: number; f: number; label: string; role: 'root' | 'chord' }[] = []
  for (const sh of use) for (const n of shapeNotes(sh, tuning)) {
    const k = `${n.string}:${n.fret}`
    if (seen.has(k) || (from > 0 && n.fret <= from)) continue
    seen.add(k)
    const label = toneLabel(n.midi, rootPc, minor)
    out.push({ s: n.string, f: n.fret, label, role: label === 'R' ? 'root' : 'chord' })
  }
  return out
}

/** A scale's notes inside one shape's window, labelled by degree (chord tones as chord, roots as root). */
export function scaleInShape(rootPc: number, sh: CagedShape, tuning: number[], semis: number[], labels: string[], tones: number[]) {
  const lo = Math.max(0, sh.lo - 1), hi = sh.hi + 1
  const out: { s: number; f: number; label: string; role: 'root' | 'chord' | 'scale' }[] = []
  tuning.forEach((o, s) => {
    for (let f = Math.max(1, lo); f <= Math.min(15, hi); f++) {
      const iv = (((o + f - rootPc) % 12) + 12) % 12
      const k = semis.indexOf(iv)
      if (k >= 0) out.push({ s, f, label: labels[k], role: iv === 0 ? 'root' : tones.includes(iv) ? 'chord' : 'scale' })
    }
  })
  return out
}

const step = (notes: { string: number; fret: number; midi: number }[], dur: number, chord?: string): SongStep => ({ notes, dur, chord })
const song = (title: string, tuning: number[], bars: SongBar[], tempo: number): Song => ({ title, tempo, tracks: [{ name: 'CAGED', tuning, capo: 0, bars, program: 25 }] })
const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

/** Strum a shape on beat 1, then pick it up and down (one bar of 4/4 each). */
function shapeBars(sh: CagedShape, tuning: number[], name: string): SongBar[] {
  const ns = shapeNotes(sh, tuning)
  const arp = [...ns, ...ns.slice(1, -1).reverse()]
  while (arp.length < 8) arp.push(...ns)
  return [
    { steps: [step(ns, 4, `${name} (${sh.letter} shape)`)] },
    { steps: arp.slice(0, 8).map(n => step([n], 0.5)) },
  ]
}

/** One chord in all five shapes, up the neck and back down. */
export function cagedChordTab(rootPc: number, minor: boolean, tuning: number[]): Song {
  const sh = shapesOf(rootPc, minor, tuning)
  const name = NAMES[rootPc] + (minor ? 'm' : '')
  const bars = [...sh, ...sh.slice(0, -1).reverse()].flatMap(s => shapeBars(s, tuning, name))
  return song(`${name} in every shape, up the neck and back`, tuning, bars, 66)
}

/** The shape of a chord that sits closest to a fret window (for playing a progression in one place). */
export function nearestShape(rootPc: number, minor: boolean, tuning: number[], lo: number, hi: number): CagedShape | null {
  const sh = shapesOf(rootPc, minor, tuning).filter(s => s.lo >= 1 || lo <= 2)
  if (!sh.length) return null
  // the minor C and G shapes are awkward grips: only when nothing else is near
  const awkward = (s: CagedShape) => (minor && tuning.length >= 6 && (s.letter === 'C' || s.letter === 'G') ? 2.5 : 0)
  const cost = (s: CagedShape) => Math.max(0, lo - s.lo) + Math.max(0, s.hi - hi) + Math.abs((s.lo + s.hi) / 2 - (lo + hi) / 2) * 0.25 + awkward(s)
  return sh.slice().sort((a, b) => cost(a) - cost(b))[0]
}

/** The I, vi, IV and V of a major key, each in the shape nearest the I chord's shape (a "zone"). */
export function zoneChords(keyPc: number, tuning: number[], home: CagedShape) {
  const degs: [number, boolean, string][] = [[0, false, 'I'], [9, true, 'vi'], [5, false, 'IV'], [7, false, 'V']]
  return degs.map(([semi, minor, num]) => {
    const pcv = (keyPc + semi) % 12
    const sh = semi === 0 ? home : nearestShape(pcv, minor, tuning, home.lo - 1, home.hi + 1)
    return { num, name: NAMES[pcv] + (minor ? 'm' : ''), shape: sh }
  }).filter(c => c.shape) as { num: string; name: string; shape: CagedShape }[]
}

/** I – vi – IV – V – I in one zone (several zones: the whole key up the neck). Half-note strums, then the 3rd of the
 *  next chord picked alone at the end of each bar so you hear where the shape changes. */
export function cagedZoneTab(keyPc: number, tuning: number[], zones: number[] | 'all'): Song {
  const homes = shapesOf(keyPc, false, tuning).filter(s => s.lo >= 1)
  const use = zones === 'all' ? homes : zones.map(i => homes[Math.min(i, homes.length - 1)])
  const bars: SongBar[] = []
  for (const home of use) {
    const zc = zoneChords(keyPc, tuning, home)
    const order = [...zc, zc[0]]
    order.forEach(c => {
      const ns = shapeNotes(c.shape, tuning)
      bars.push({ steps: [step(ns, 2, `${c.name} (${c.shape.letter} shape)`), step(ns, 2)] })
    })
  }
  const nm = NAMES[keyPc]
  return song(zones === 'all' ? `${nm}: I – vi – IV – V – I in every zone up the neck` : `${nm}: I – vi – IV – V – I without leaving the ${use[0].letter}-shape zone`, tuning, bars, 72)
}

/** Each shape of a chord, with the free finger adding the scale note above the top string's chord tone (a hammer-on
 *  sus / add9 / 6 sound, the start of a fill), and back. */
export function cagedEmbTab(rootPc: number, tuning: number[]): Song {
  const MAJOR = [0, 2, 4, 5, 7, 9, 11]
  const sh = shapesOf(rootPc, false, tuning).filter(s => s.lo >= 1)
  const name = NAMES[rootPc]
  const bars: SongBar[] = []
  for (const s of sh) {
    const ns = shapeNotes(s, tuning)
    // the two highest strings of the shape: decorate each with the scale note above it (if within 2 frets)
    const tops = ns.slice(-2)
    const deco = tops.map(n => {
      let up = 1
      while (!MAJOR.includes((((n.midi + up - rootPc) % 12) + 12) % 12)) up++
      return n.fret + up <= 15 ? { ...n, fret: n.fret + up, midi: n.midi + up } : null
    })
    const st: SongStep[] = [step(ns, 1, `${name} (${s.letter} shape)`)]
    tops.forEach((n, i) => { const d = deco[i]; if (d) st.push(step([n], 0.5), step([d], 0.5)) })
    while (st.reduce((a, x) => a + x.dur, 0) < 3.5) st.push(step([tops[tops.length - 1]], 0.5))
    st.push(step([tops[tops.length - 1]], 4 - st.reduce((a, x) => a + x.dur, 0)))
    bars.push({ steps: st })
  }
  return song(`${name}: every shape with a hammer-on from the free finger`, tuning, bars, 70)
}

/** One shape for every chord: the twelve major chords round the circle of 4ths (C F B♭ E♭ …), all in one shape. */
export function cagedOneShapeTab(letter: string, tuning: number[]): Song {
  const bars: SongBar[] = []
  let pcv = 0
  let used = letter
  for (let i = 0; i < 12; i++, pcv = (pcv + 5) % 12) {
    const all = shapesOf(pcv, false, tuning)
    const sh = all.find(s => s.letter === letter) ?? all.find(s => s.lo >= 1) ?? all[0]
    used = sh.letter
    const ns = shapeNotes(sh, tuning)
    bars.push({ steps: [step(ns, 2, `${NAMES[pcv]} (${sh.letter} shape)`), step(ns, 2)] })
  }
  return song(`Every chord round the circle of 4ths in the ${used} shape`, tuning, bars, 70)
}

/** A minor key in one zone: i – iv – v – i (Am Dm Em Am) around the minor home chord's shape. */
export function cagedMinorZoneTab(keyPc: number, tuning: number[]): Song {
  const homes = shapesOf(keyPc, true, tuning).filter(s => s.lo >= 1)
  const home = homes.find(s => s.letter === 'E') ?? homes[0]
  const degs: [number, string][] = [[0, 'i'], [5, 'iv'], [7, 'v'], [0, 'i']]
  const bars: SongBar[] = degs.map(([semi]) => {
    const pcv = (keyPc + semi) % 12
    const sh = semi === 0 ? home : nearestShape(pcv, true, tuning, home.lo - 1, home.hi + 1) ?? home
    const ns = shapeNotes(sh, tuning)
    return { steps: [step(ns, 2, `${NAMES[pcv]}m (${sh.letter} shape)`), step(ns, 2)] }
  })
  return song(`${NAMES[keyPc]} minor: i – iv – v – i in one zone`, tuning, bars, 72)
}
