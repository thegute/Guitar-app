// A library of practice tabs generated for any key and any instrument: scales by position, sequences,
// arpeggios, warm-ups and essential licks. They open in the Play screen like any song, so the mic follows you.
import { Scale } from 'tonal'
import { FLATS, SHARPS, keyPrefersFlats, pc } from '../theory/notes'
import type { Song, SongBar, SongNote, SongStep } from './model'

export interface Placed { string: number; fret: number; midi: number }

export type ExerciseKind = 'scale' | 'sequence' | 'arpeggio' | 'warmup' | 'lick'

export const EX_SCALES: { id: string; label: string; minor: boolean }[] = [
  { id: 'minor pentatonic', label: 'Minor pentatonic', minor: true },
  { id: 'major pentatonic', label: 'Major pentatonic', minor: false },
  { id: 'minor blues', label: 'Blues scale', minor: true },
  { id: 'major', label: 'Major scale', minor: false },
  { id: 'aeolian', label: 'Natural minor', minor: true },
  { id: 'dorian', label: 'Dorian', minor: true },
  { id: 'mixolydian', label: 'Mixolydian', minor: false },
  { id: 'harmonic minor', label: 'Harmonic minor', minor: true },
]
export const EX_SEQUENCES = [
  { id: 'threes', label: 'In 3s (1-2-3, 2-3-4 …)' },
  { id: 'fours', label: 'In 4s (1-2-3-4, 2-3-4-5 …)' },
  { id: 'thirds', label: 'In 3rds (1-3, 2-4 …)' },
  { id: 'triplets', label: 'Triplet rolls (down 3, up 1)' },
]
export const EX_ARPS = [
  { id: 'maj', label: 'Major triad', ivs: [0, 4, 7], suffix: '' },
  { id: 'min', label: 'Minor triad', ivs: [0, 3, 7], suffix: 'm' },
  { id: 'maj7', label: 'Major 7th', ivs: [0, 4, 7, 11], suffix: 'maj7' },
  { id: 'm7', label: 'Minor 7th', ivs: [0, 3, 7, 10], suffix: 'm7' },
  { id: 'dom7', label: 'Dominant 7th', ivs: [0, 4, 7, 10], suffix: '7' },
  { id: 'm7b5', label: 'Half-diminished', ivs: [0, 3, 6, 10], suffix: 'm7b5' },
  { id: 'dim7', label: 'Diminished 7th', ivs: [0, 3, 6, 9], suffix: 'dim7' },
]
export const EX_WARMUPS = [
  { id: 'spider', label: 'Spider walk (1-2-3-4 every string)' },
  { id: 'spider2', label: 'Finger-twister (1-3-2-4)' },
  { id: 'stretch', label: 'Shifting chromatic (moves up the neck)' },
]

/** Licks as scale-step recipes relative to the root, so they work in any key and on any instrument. */
interface LickNote { st: number; dur: number; tech?: string }
const L = (st: number, dur = 0.5, tech?: string): LickNote => ({ st, dur, tech })
export const EX_LICKS: { id: string; label: string; feel: string; minor: boolean; notes: LickNote[] }[] = [
  { id: 'box-desc', label: 'Box-one cascade', feel: 'The classic descending pentatonic run every rock and blues player knows.', minor: true,
    notes: [L(15), L(12), L(10), L(7), L(12), L(10), L(7), L(5), L(10), L(7), L(5), L(3), L(0, 1)] },
  { id: 'bend-release', label: 'Bend, release, resolve', feel: 'Bend the 4th up to the 5th, let it down, land on the root.', minor: true,
    notes: [L(17, 1, 'b'), L(15), L(12), L(15, 0.5, 'b'), L(12), L(10), L(12, 2)] },
  { id: 'blue-note', label: 'Blue-note walk', feel: 'Slides through the b5 "blue note" for that crying blues sound.', minor: true,
    notes: [L(0), L(3), L(5), L(6), L(7, 1), L(6), L(5), L(3), L(0, 2)] },
  { id: 'triplet-roll', label: 'Triplet roll', feel: 'Fast-sounding but simple: three-note groups rolling down the box.', minor: true,
    notes: [L(15, 1 / 3), L(12, 1 / 3), L(10, 1 / 3), L(12, 1 / 3), L(10, 1 / 3), L(7, 1 / 3), L(10, 1 / 3), L(7, 1 / 3), L(5, 1 / 3), L(7, 1 / 3), L(5, 1 / 3), L(3, 1 / 3), L(0, 2)] },
  { id: 'double-stop', label: 'Rock double-stops', feel: 'Two notes at once on neighbouring strings: instant early rock-and-roll.', minor: false,
    notes: [L(16, 0.5), L(16, 0.5), L(14, 0.5), L(14, 0.5), L(12, 0.5), L(12, 0.5), L(9, 1)] },
  { id: 'country-6', label: 'Country major-6 lick', feel: 'Major pentatonic with the sweet 6th, finishing on the 3rd.', minor: false,
    notes: [L(12), L(14), L(16), L(19), L(16), L(14), L(12), L(9), L(7), L(4, 2)] },
  { id: 'enclosure', label: 'Jazz enclosure', feel: 'Circle the target note from above and below before landing on it.', minor: false,
    notes: [L(14), L(11), L(12, 1), L(5), L(3), L(4, 1), L(9), L(6), L(7, 2)] },
  { id: 'hendrix', label: 'Thumb-over chord fill', feel: 'Hammer a sus4 onto a major chord shape: soul and R&B rhythm-lead.', minor: false,
    notes: [L(12), L(16), L(17, 0.5, 'h'), L(16, 0.5, 'p'), L(12), L(16), L(14, 1)] },
  { id: 'minor-sweep', label: 'Minor triad sweep', feel: 'One smooth motion across the strings: the root, b3 and 5 of a minor chord.', minor: true,
    notes: [L(12, 1 / 4), L(15, 1 / 4), L(19, 1 / 4), L(24, 1 / 4), L(27, 1 / 4), L(24, 1 / 4), L(19, 1 / 4), L(15, 1 / 4), L(12, 1)] },
  { id: 'answer', label: 'Call and answer', feel: 'A short phrase, a rest, and a reply: how to make solos breathe.', minor: true,
    notes: [L(7), L(10), L(12, 1), L(10, 0.5), L(7, 1.5), L(12), L(15), L(17, 1), L(15, 0.5), L(12, 1.5)] },
]

const note = (p: Placed, tech?: string): SongNote => ({ string: p.string, fret: p.fret, midi: p.midi, tech })

/** Is this instrument tuned low-to-high string by string (guitar, low-G, baritone)? Re-entrant tunings are not. */
const linear = (t: number[]) => t.every((m, i) => i === 0 || m > t[i - 1])

/** Group steps into 4-beat bars. */
function toBars(steps: SongStep[]): SongBar[] {
  const bars: SongBar[] = []
  let cur: SongStep[] = []
  let beats = 0
  for (const s of steps) {
    cur.push(s)
    beats += s.dur
    if (beats >= 4 - 1e-6) { bars.push({ steps: cur }); cur = []; beats = 0 }
  }
  if (cur.length) bars.push({ steps: cur })
  return bars
}

function song(title: string, tuning: number[], steps: SongStep[], tempo = 80): Song {
  return { title, tempo, tracks: [{ name: 'Exercise', tuning, capo: 0, bars: toBars(steps) }] }
}

/** Frets on the lowest string where these pitch classes sit, from fret 0 up to 16. */
function fretsOn(stringMidi: number, pcs: number[]) {
  const out: number[] = []
  for (let f = 0; f <= 16; f++) if (pcs.includes((stringMidi + f) % 12)) out.push(f)
  return out
}

/**
 * A scale in one position.
 * Linear tunings use the standard "N notes per string" patterns (2 for pentatonic boxes, 3 for 7-note scales).
 * Re-entrant ukulele tunings use a 4-fret window and play the notes in pitch order.
 */
export function scalePosition(tuning: number[], rootPc: number, pcs: number[], position: number): Placed[] {
  const nps = pcs.length <= 6 ? 2 : 3
  const rootFrets = fretsOn(tuning[0], [rootPc])
  const startOptions = fretsOn(tuning[0], pcs)
  let rootIdx = startOptions.indexOf(rootFrets.find(f => f >= 1) ?? rootFrets[0])
  if (rootIdx < 0) rootIdx = 0
  let start = startOptions[(rootIdx + position) % startOptions.length]
  if (position + rootIdx >= startOptions.length) start = startOptions[(rootIdx + position) % startOptions.length]
  if (start > 12) start -= 12
  if (linear(tuning)) {
    const scalePitches: number[] = []
    for (let m = tuning[0] + start; m <= tuning[tuning.length - 1] + 24; m++) if (pcs.includes(m % 12)) scalePitches.push(m)
    const out: Placed[] = []
    let k = 0
    tuning.forEach((open, s) => {
      for (let n = 0; n < nps && k < scalePitches.length; n++, k++) {
        const fret = scalePitches[k] - open
        if (fret < 0) { n--; continue }
        out.push({ string: s, fret, midi: scalePitches[k] })
      }
    })
    // finish on the top root if it sits close by
    return out.filter(p => p.fret <= 22)
  }
  const lo = Math.max(0, start - (start > 0 ? 1 : 0))
  const all: Placed[] = []
  tuning.forEach((open, s) => { for (let f = lo; f <= lo + 4; f++) if (pcs.includes((open + f) % 12)) all.push({ string: s, fret: f, midi: open + f }) })
  const byPitch = new Map<number, Placed>()
  for (const p of all) if (!byPitch.has(p.midi)) byPitch.set(p.midi, p)
  return [...byPitch.values()].sort((a, b) => a.midi - b.midi)
}

/** Put a sequence of pitches on the neck near `nearFret`, moving the hand as little as possible. */
export function placePitches(tuning: number[], pitches: number[], nearFret: number): Placed[] {
  const out: Placed[] = []
  let prev: Placed | null = null
  for (const m of pitches) {
    const cands: Placed[] = []
    tuning.forEach((open, s) => { const f = m - open; if (f >= 0 && f <= 22) cands.push({ string: s, fret: f, midi: m }) })
    if (!cands.length) continue
    const cost = (c: Placed) => Math.abs(c.fret - (prev ? prev.fret : nearFret)) * 1.2 + (prev ? Math.abs(c.string - prev.string) * 0.8 : 0) + Math.max(0, Math.abs(c.fret - nearFret) - 3) * 2
    const best: Placed = cands.sort((a, b) => cost(a) - cost(b))[0]
    out.push(best)
    prev = best
  }
  return out
}

function name(rootPc: number, minor: boolean) {
  return (keyPrefersFlats(SHARPS[rootPc], minor) ? FLATS : SHARPS)[rootPc]
}

export interface ExerciseSpec {
  kind: ExerciseKind
  root: string
  /** scale id, arpeggio id, sequence id, warm-up id or lick id */
  type: string
  /** 0-based position (box); -1 = all positions in a row */
  position: number
  /** scale used by sequences */
  scale?: string
}

/** Build one exercise as a song. `tuning` is the instrument's open strings (MIDI, string order). */
export function buildExercise(spec: ExerciseSpec, tuning: number[]): Song {
  const rootPc = pc(spec.root)
  const eighth = (p: Placed, chord?: string): SongStep => ({ notes: [note(p)], dur: 0.5, chord })
  const positions = (count: number) => (spec.position < 0 ? Array.from({ length: count }, (_, i) => i) : [spec.position])

  if (spec.kind === 'scale' || spec.kind === 'sequence') {
    const scaleId = spec.kind === 'scale' ? spec.type : spec.scale ?? 'minor pentatonic'
    const def = EX_SCALES.find(s => s.id === scaleId) ?? EX_SCALES[0]
    const pcs = Scale.get(`${SHARPS[rootPc]} ${scaleId}`).notes.map(pc)
    const chord = name(rootPc, def.minor) + (def.minor ? 'm' : '')
    const steps: SongStep[] = []
    for (const pos of positions(pcs.length <= 6 ? 5 : 7)) {
      const up = scalePosition(tuning, rootPc, pcs, pos)
      if (!up.length) continue
      let seq: Placed[]
      if (spec.kind === 'scale') seq = [...up, ...up.slice(0, -1).reverse()]
      else if (spec.type === 'threes') seq = up.slice(0, -2).flatMap((_, i) => up.slice(i, i + 3))
      else if (spec.type === 'fours') seq = up.slice(0, -3).flatMap((_, i) => up.slice(i, i + 4))
      else if (spec.type === 'thirds') seq = up.slice(0, -2).flatMap((_, i) => [up[i], up[i + 2]])
      else {
        const down = up.slice().reverse()
        seq = down.slice(0, -2).flatMap((_, i) => [down[i], down[i + 1], down[i + 2]])
      }
      const dur = spec.type === 'triplets' ? 1 / 3 : 0.5
      seq.forEach((p, i) => steps.push({ notes: [note(p)], dur, chord: i === 0 ? chord : undefined }))
      steps.push({ notes: [], dur: 1 })
    }
    const label = spec.kind === 'scale' ? def.label : EX_SEQUENCES.find(s => s.id === spec.type)!.label.replace(/ \(.*\)/, '')
    const posLabel = spec.position < 0 ? 'all positions' : `position ${spec.position + 1}`
    return song(`${name(rootPc, def.minor)} ${def.label.toLowerCase()}${spec.kind === 'sequence' ? ` ${label.toLowerCase()}` : ''}, ${posLabel}`, tuning, steps)
  }

  if (spec.kind === 'arpeggio') {
    const def = EX_ARPS.find(a => a.id === spec.type) ?? EX_ARPS[0]
    const pcs = def.ivs.map(i => (rootPc + i) % 12)
    const chord = name(rootPc, def.suffix.startsWith('m') && !def.suffix.startsWith('maj')) + def.suffix
    const steps: SongStep[] = []
    // positions start on each chord tone along the lowest string (like the CAGED shapes)
    for (const pos of positions(def.ivs.length === 3 ? 5 : 5)) {
      const up = scalePosition(tuning, rootPc, pcs, pos)
      if (up.length < 3) continue
      const seq = [...up, ...up.slice(0, -1).reverse()]
      seq.forEach((p, i) => steps.push({ ...eighth(p, i === 0 ? chord : undefined), dur: 0.5 }))
      steps.push({ notes: [], dur: 1 })
    }
    return song(`${chord} arpeggio, ${spec.position < 0 ? 'all positions' : `position ${spec.position + 1}`}`, tuning, steps)
  }

  if (spec.kind === 'warmup') {
    const steps: SongStep[] = []
    const order = spec.type === 'spider2' ? [0, 2, 1, 3] : [0, 1, 2, 3]
    const starts = spec.type === 'stretch' ? [1, 3, 5, 7] : [Math.max(1, spec.position + 1)]
    for (const base of starts) {
      for (let s = 0; s < tuning.length; s++) for (const k of order) steps.push({ notes: [{ string: s, fret: base + k, midi: tuning[s] + base + k }], dur: 0.25 })
      for (let s = tuning.length - 1; s >= 0; s--) for (const k of [...order].reverse()) steps.push({ notes: [{ string: s, fret: base + k, midi: tuning[s] + base + k }], dur: 0.25 })
    }
    return song(EX_WARMUPS.find(w => w.id === spec.type)!.label.replace(/ \(.*\)/, ''), tuning, steps, 72)
  }

  // licks: steps above the root, placed around where the root sits on the neck
  const def = EX_LICKS.find(l => l.id === spec.type) ?? EX_LICKS[0]
  const rootFret = fretsOn(tuning[0], [rootPc]).find(f => f >= 3 && f <= 12) ?? fretsOn(tuning[0], [rootPc])[0]
  // fit the lick inside the instrument's range (a ukulele has a much smaller range than a guitar)
  const lo = Math.min(...tuning)
  const hi = Math.max(...tuning) + (tuning.length === 4 ? 14 : 20)
  let base = tuning[0] + rootFret
  const inRange = (b: number) => def.notes.filter(n => b + n.st >= lo && b + n.st <= hi).length
  for (const b of [base - 24, base - 12, base + 12]) if (inRange(b) > inRange(base)) base = b
  const pitches = def.notes.map(n => {
    let m = base + n.st
    while (m < lo) m += 12
    while (m > hi) m -= 12
    return m
  })
  const placed = placePitches(tuning, pitches, rootFret + 1)
  const chord = name(rootPc, def.minor) + (def.minor ? 'm' : '')
  const steps: SongStep[] = []
  // double-stops: pair each note with the note a 3rd/4th above on the next string
  placed.forEach((p, i) => {
    const n = def.notes[i]
    const notes: SongNote[] = [note(p, n.tech)]
    if (def.id === 'double-stop' && p.string + 1 < tuning.length) {
      const up = p.midi + (i % 2 ? 4 : 5)
      const f = up - tuning[p.string + 1]
      if (f >= 0) notes.push({ string: p.string + 1, fret: f, midi: up })
    }
    steps.push({ notes, dur: n.dur, chord: i === 0 ? chord : undefined })
  })
  // play it twice with a breath in between
  const all = [...steps, { notes: [], dur: 1 }, ...steps.map(s => ({ ...s, chord: undefined })), { notes: [], dur: 1 }]
  return song(`${def.label} in ${chord}`, tuning, all, 76)
}

/** Recommended starter set, in learning order. */
export const ESSENTIALS: { title: string; spec: ExerciseSpec; why: string }[] = [
  { title: 'Spider walk warm-up', spec: { kind: 'warmup', root: 'A', type: 'spider', position: 0 }, why: 'Wakes up all four fingers and gets them working independently.' },
  { title: 'A minor pentatonic, box 1', spec: { kind: 'scale', root: 'A', type: 'minor pentatonic', position: 0 }, why: 'The most-used scale shape in rock and blues. Learn this one first.' },
  { title: 'Box-one cascade lick', spec: { kind: 'lick', root: 'A', type: 'box-desc', position: 0 }, why: 'Your first "real" lick, built right out of box 1.' },
  { title: 'A minor pentatonic in 3s', spec: { kind: 'sequence', root: 'A', type: 'threes', position: 0, scale: 'minor pentatonic' }, why: 'Sequences turn a scale into music and build speed.' },
  { title: 'C major arpeggio, all positions', spec: { kind: 'arpeggio', root: 'C', type: 'maj', position: -1 }, why: 'Arpeggios show you where the chord lives everywhere on the neck.' },
  { title: 'G major scale, position 1', spec: { kind: 'scale', root: 'G', type: 'major', position: 0 }, why: 'The full major scale: the source of most melodies and chords.' },
  { title: 'A minor pentatonic, all 5 boxes', spec: { kind: 'scale', root: 'A', type: 'minor pentatonic', position: -1 }, why: 'Connect the boxes and the whole neck opens up.' },
  { title: 'Bend, release, resolve', spec: { kind: 'lick', root: 'A', type: 'bend-release', position: 0 }, why: 'Bending in tune is what makes a solo sing.' },
  { title: 'A minor 7th arpeggio', spec: { kind: 'arpeggio', root: 'A', type: 'm7', position: 0 }, why: 'Target these notes and your solos follow the chords.' },
  { title: 'Country major-6 lick in G', spec: { kind: 'lick', root: 'G', type: 'country-6', position: 0 }, why: 'Major pentatonic vocabulary for happier songs.' },
]
