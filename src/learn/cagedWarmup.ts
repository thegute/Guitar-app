// Ultimate All-Keys CAGED Warmup engine (Major & Minor, Guitar / Baritone / Uke).
// 5-Step Ladder:
//   1. All Roots / Octaves (up the neck & back down)
//   2. The 5 Chord Shapes (Full CAGED shape OR 3-string Triad Subsets with inversion labels)
//   3. The 5 Arpeggio Shapes (R–3–5 / R–b3–5 up & back down)
//   4. The 5 Pentatonic Boxes (Start & End on Root — Full-Box Resolve)
//   5. The 5 Scale Shapes (Major / Natural Minor — Start & End on Root — Full-Box Resolve)
// Supports both Classic (ascend up the neck, descend back down) and Snake Flow (alternating direction),
// Full Neck Run (all 5 shapes + 12th-fret octave when open) OR Single-Shape Lockdown,
// Circle-of-4ths Key of the Day, 12-Key Major/Minor mastery persistence, and playable KGuitar Song export.
import { Scale } from 'tonal'
import type { Instrument } from '../instrument'
import { pc, SHARPS } from '../theory/notes'
import type { Song, SongBar, SongNote, SongStep } from '../tabs/model'
import type { HandGroup } from '../play/handShape'
import { cagedShapes, type CagedShape } from './caged'

export type WarmupStepId = 1 | 2 | 3 | 4 | 5
export type WarmupFlow = 'classic' | 'snake'
export type TriadSubset = 'full' | 'top3' | 'mid3' | 'lowmid3' | 'bot3'

export interface WarmupStepInfo {
  id: WarmupStepId
  short: string
  title: string
  subtitle: string
  tip: string
}

export const WARMUP_STEPS: WarmupStepInfo[] = [
  {
    id: 1,
    short: '1 · Roots',
    title: 'Step 1 · All Roots / Octaves',
    subtitle: 'Find every root note up the neck to the high frets and back down.',
    tip: 'Anchor your eyes on the red R dots. Octave pairs (2 strings over, 2–3 frets up) are the skeleton that every CAGED shape hangs on.',
  },
  {
    id: 2,
    short: '2 · Chords',
    title: 'Step 2 · The 5 Chord Shapes',
    subtitle: 'Play all 5 CAGED chord shapes (or a 3-string Triad Subset) up & back down.',
    tip: 'Let each chord ring clean before shifting up. Try a 3-string Triad Subset (like Top 3 G–B–e) to unlock Hendrix/Mayer-style mini-chords inside each CAGED shape.',
  },
  {
    id: 3,
    short: '3 · Arpeggios',
    title: 'Step 3 · The 5 Arpeggio Shapes',
    subtitle: 'Outline the chord tones (Root, 3rd, 5th) one note at a time inside each shape.',
    tip: 'Arpeggios turn chord shapes into melodies. Hear the 3rd (major vs minor) glow against the root drone.',
  },
  {
    id: 4,
    short: '4 · Pentatonic',
    title: 'Step 4 · The 5 Pentatonic Boxes',
    subtitle: 'Start & End on Root (Full-Box Resolve) up the neck and back down.',
    tip: 'Start on the red Root, climb to the top of the box, come all the way down to the bottom, then climb back up and resolve on the Root.',
  },
  {
    id: 5,
    short: '5 · Full Scale',
    title: 'Step 5 · The 5 Scale Shapes',
    subtitle: 'Full 7-note scale — Start & End on Root (Full-Box Resolve) up & back down.',
    tip: 'Just two extra colour notes added to each pentatonic box! Always resolve back to the red Root so your ear locks into the key.',
  },
]

export const TRIAD_SUBSETS: { id: TriadSubset; label: string; stringsLabel: string; hint: string; indices: [number, number, number] | null }[] = [
  { id: 'full', label: 'Full CAGED', stringsLabel: 'All strings', hint: 'The complete CAGED chord grip', indices: null },
  { id: 'top3', label: 'Top 3', stringsLabel: 'G–B–e', hint: 'Bright lead / funk / Mayer triads on the top 3 strings', indices: [3, 4, 5] },
  { id: 'mid3', label: 'Mid 3', stringsLabel: 'D–G–B', hint: 'Warm rhythm / soul / acoustic triads on the middle 3 strings', indices: [2, 3, 4] },
  { id: 'lowmid3', label: 'Low-Mid 3', stringsLabel: 'A–D–G', hint: 'Punchy rock & country triads on strings 5–4–3', indices: [1, 2, 3] },
  { id: 'bot3', label: 'Bottom 3', stringsLabel: 'E–A–D', hint: 'Deep bass-side triads on the lowest 3 strings', indices: [0, 1, 2] },
]

export interface WarmupExplanation {
  what: string
  why: string
  how: string
  watch: string
}

export function explainInversion(inv: 'Root pos' | '1st inv' | '2nd inv', minor: boolean): string {
  const third = minor ? '♭3rd' : '3rd'
  if (inv === 'Root pos') return `Root position: the Root (R) is the lowest note — grounded, solid, classic home sound.`
  if (inv === '1st inv') return `1st inversion: the ${third} is the lowest note — sweeter, lighter, super common in Hendrix, soul & acoustic fills.`
  return `2nd inversion: the 5th is the lowest note — open, punchy, and sits right in the middle of the neck for smooth chord moves.`
}

export function explainCagedShape(letter: string, minor: boolean): string {
  const q = minor ? 'minor' : 'major'
  const map: Record<string, string> = {
    C: `C-shape (${q}): built from the open C chord. Main root sits on the A string (ring/pinky) with a second root on the B string.`,
    A: `A-shape (${q}): the classic A-barre shape. Root on the A string (index finger) and an octave root on the G string two frets up.`,
    G: `G-shape (${q}): roots sit on both E strings (and G string). Full 6-string grip is stretchy, so real players often grab its 3-string Triad Subsets!`,
    E: `E-shape (${q}): the famous E-barre shape. Root sits right under your index finger on the low E, high e, and D strings.`,
    D: `D-shape (${q}): built from the open D chord. Root sits on the D string (index) and B string — bright, sparkling higher voicings.`,
    F: `F-shape (${q}): built from the open F grip on ukulele — smooth handover right into the D shape.`,
  }
  return map[letter] ?? `${letter}-shape (${q}): one of the five linked fretboard shapes.`
}

export function explainFlow(flow: WarmupFlow): string {
  return flow === 'classic'
    ? 'Classic (Up & Back Down): going up the neck toward the body, you ascend every shape (low → high); coming back down to the nut, you descend every shape (high → low).'
    : 'Snake Flow (Alternate ↑↓): you climb UP one shape, shift across at the top and come DOWN the next shape, shift at the bottom and climb UP again — builds seamless solo movement across the whole neck.'
}

/** Rich plain-English coach guide for the active step, tailored to Major/Minor, Triad Subsets, and Flow. */
export function explainWarmupStep(opts: {
  step: WarmupStepId
  keyName: string
  minor: boolean
  flow: WarmupFlow
  triadSubset: TriadSubset
  triadInversion?: 'Root pos' | '1st inv' | '2nd inv' | null
}): WarmupExplanation {
  const { step, keyName, minor, flow, triadSubset, triadInversion } = opts
  const scaleName = minor ? `${keyName} Natural Minor` : `${keyName} Major`
  const pentaName = minor ? `${keyName} Minor Pentatonic` : `${keyName} Major Pentatonic`
  const third = minor ? '♭3' : '3'
  const extraTwo = minor ? '2 and ♭6' : '4 and 7'
  const flowTip = flow === 'snake'
    ? 'In Snake Flow, alternate direction each time you shift to the next shape (up one, down the next).'
    : 'In Classic mode, ascend each shape on the way up the neck, then descend each shape coming back down.'

  if (step === 1) {
    return {
      what: `You're locating every ${keyName.replace(/m$/, '')} Root note across the whole fretboard, grouped into CAGED octave shapes from the open frets up past the 12th fret and back down.`,
      why: `Roots are your fretboard GPS pins. Once your eyes lock onto the red R dots automatically in any key, every chord, arpeggio, pentatonic box, and scale snaps right onto them without guessing.`,
      how: `Play each red Root inside the highlighted shape, notice the octave geometry (2 strings over & 2 frets up on E→D / A→G, or 3 frets up when crossing the B string!), then shift up to the next shape and walk all the way back down.`,
      watch: `Watch the red R dots and turn on the ${keyName} Drone — every note you hit should melt seamlessly into the drone because it's the exact same pitch in higher/lower octaves.`,
    }
  }
  if (step === 2) {
    const isTriad = triadSubset !== 'full'
    const subDef = TRIAD_SUBSETS.find(t => t.id === triadSubset) ?? TRIAD_SUBSETS[0]
    return {
      what: isTriad
        ? `You're slicing each ${keyName} CAGED chord into a 3-string Triad Subset (${subDef.label}: ${subDef.stringsLabel}) — just the Root, ${third}, and 5th on 3 adjacent strings — and moving it up the neck & back down.`
        : `You're playing all 5 linked CAGED chord grips for ${keyName} up the neck and back down, like sliding an invisible capo from open position to the 12th fret.`,
      why: isTriad
        ? `Triad Subsets are the #1 pro shortcut: they make stretchy chords (especially minor C & G shapes!) effortless to grab, cut cleanly through a band mix, and teach you every chord inversion up the neck.`
        : `Seeing all 5 chord shapes back-to-back proves there's never just "one way" to play ${keyName}. Each shape shares notes with the next one in C–A–G–E–D order.`,
      how: isTriad
        ? `Grab the 3 glowing notes on ${subDef.stringsLabel} and strum clean (let every string ring!). ${triadInversion ? explainInversion(triadInversion, minor) : ''} Notice the faint ghost rings showing the full CAGED grip your mini-triad lives inside.`
        : `Strum each chord cleanly so every note rings (no muted buzzing strings), spot the red Root notes inside the grip, then slide to the next shape up the neck and back down.`,
      watch: `Red = Root (R), Gold = 3rd (${third}) & 5th (5)${isTriad ? ', Faint outline = rest of the full CAGED shape' : ''}. Try switching between Full CAGED and Top 3 (G–B–e) to feel how they connect!`,
    }
  }
  if (step === 3) {
    return {
      what: `You're breaking each ${keyName} chord into an arpeggio — playing ONLY the 3 chord tones (R, ${third}, 5) one note at a time across every string in the box, starting and ending on the red Root.`,
      why: `Chords are harmony; arpeggios are how you solo *over* chords! Knowing where the R, ${third}, and 5 sit inside every CAGED box lets you land on sweet, melodic target notes whenever the chord changes.`,
      how: `Start on the red R, climb cleanly through the chord tones to the top of the box, come down to the bottom, and resolve back on the red R (Full-Box Resolve). ${flowTip}`,
      watch: `Listen especially to the ${third} against the ${keyName} Drone — that single note is the entire emotional difference between Major (bright/happy) and Minor (moody/soulful)!`,
    }
  }
  if (step === 4) {
    return {
      what: `You're playing all 5 ${pentaName} boxes using Full-Box Resolve (Start & End on Root), moving from the lowest frets up past the 12th fret and back down.`,
      why: `Pentatonic boxes are simply your Step 3 arpeggio (3 chord tones) plus 2 safe, no-wrong-note passing notes! Starting and ending on the red Root trains your ear to hear ${keyName} instead of accidentally sounding like a different mode.`,
      how: `Full-Box Resolve: 1) Start on the red Root (★) → 2) Climb to the highest note in the box → 3) Come ALL the way down to the lowest note in the box → 4) Climb back up and land right on the red Root! ${flowTip}`,
      watch: `Red = Root (R), Gold = Chord tones (${third}, 5 — your strongest landing notes!), White = the 2 pentatonic passing notes. Notice your Step 2 & 3 chord shape is STILL glowing right inside the box!`,
    }
  }
  return {
    what: `You're playing all 5 complete 7-note ${scaleName} shapes with Full-Box Resolve (Start & End on Root), connecting the entire neck up to the body and back down.`,
    why: `Don't memorize 5 brand-new scales! Every 7-note scale shape is literally your Step 4 Pentatonic box plus just TWO colour notes (${extraTwo}). Seeing those 2 cyan notes on top of the pentatonic skeleton unlocks the entire fretboard.`,
    how: `Full-Box Resolve: 1) Start on the red Root (★) → 2) Climb to the top note of the box → 3) Descend all the way to the bottom note → 4) Return and finish solidly on the red Root! ${flowTip}`,
    watch: `Red = Root (R), Gold = Chord tones (${third}, 5), White = Pentatonic notes, Cyan = the 2 full-scale colour notes (${extraTwo}). Turn on the ${keyName} Drone and feel how those 2 cyan notes create tension that begs to resolve!`,
  }
}

/** Circle of 4ths rotation (standard pro practice order: C → F → Bb → Eb ...). */
export const CIRCLE_OF_4THS = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'B', 'E', 'A', 'D', 'G'] as const

const DONE_KEY = 'kg:cagedWarmupDone'
const IV_NAMES = ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7']

export interface WarmupNote {
  string: number
  fret: number
  midi: number
  pc: number
  interval: string
  isRoot: boolean
  isChord: boolean
}

export interface TriadResult {
  /** -1 on non-triad strings, fret number on the 3 triad strings */
  frets: number[]
  strings: number[]
  inversion: 'Root pos' | '1st inv' | '2nd inv'
}

export interface WarmupStage {
  index: number
  shape: CagedShape
  /** Whether this stage is on the way UP the neck or coming BACK DOWN */
  journey: 'up' | 'down'
  /** Note direction inside this box ('asc' = low→high / Full-Box up, 'desc' = high→low / Full-Box down) */
  playDir: 'asc' | 'desc'
  /** Octave badge when the open shape repeats at fret 12+ */
  octaveRepeat?: boolean
  label: string
  /** Individual notes in exact playing order (for Steps 1, 3, 4, 5 — or arpeggiated notes of Step 2) */
  notes: WarmupNote[]
  /** For Step 2: the chord frets to strum (full CAGED or 3-string Triad Subset) */
  chordFrets: number[]
  /** For Step 2 Triad Subset mode: the resolved triad + inversion label */
  triad?: TriadResult | null
  /** All unique fretboard spots belonging to this shape & step (for clean static neck display) */
  boxNotes: WarmupNote[]
}

/** Deterministic daily key moving around the Circle of 4ths. */
export function keyOfTheDay(date = new Date()): string {
  const days = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000)
  return CIRCLE_OF_4THS[((days % 12) + 12) % 12]
}

export function nextCircleOf4ths(root: string): string {
  const rPc = pc(root)
  const idx = CIRCLE_OF_4THS.findIndex(k => pc(k) === rPc)
  return CIRCLE_OF_4THS[(idx + 1 + 12) % 12]
}

export function relativeKeyLabel(rootPc: number, minor: boolean): string {
  if (minor) return `${SHARPS[(rootPc + 3) % 12]} Major`
  return `${SHARPS[(rootPc + 9) % 12]}m`
}

export function warmupKeyId(root: string, minor: boolean): string {
  return `${SHARPS[pc(root)]}-${minor ? 'min' : 'maj'}`
}

export function loadWarmupMastery(): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(DONE_KEY) ?? '{}') as unknown
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const out: Record<string, number> = {}
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof v === 'number' && v > 0) out[k] = v
      }
      return out
    }
  } catch { /* ignore */ }
  return {}
}

export function markWarmupDone(root: string, minor: boolean, bpm: number): Record<string, number> {
  const map = loadWarmupMastery()
  const id = warmupKeyId(root, minor)
  map[id] = Math.max(map[id] ?? 0, Math.round(bpm))
  try { localStorage.setItem(DONE_KEY, JSON.stringify(map)) } catch { /* full */ }
  return map
}

function makeNote(s: number, f: number, rootPc: number, chordPcs: number[], inst: Instrument): WarmupNote {
  const midi = inst.midis[s] + f
  const p = midi % 12
  return {
    string: s,
    fret: f,
    midi,
    pc: p,
    interval: IV_NAMES[(p - rootPc + 12) % 12],
    isRoot: p === rootPc,
    isChord: chordPcs.includes(p),
  }
}

/**
 * Find the tightest playable 3-string triad on `targetStrings` inside a CAGED shape's neck zone.
 * Automatically labels Root position, 1st inversion, or 2nd inversion.
 */
export function triadForShape(
  shape: CagedShape,
  rootPc: number,
  minor: boolean,
  inst: Instrument,
  subset: TriadSubset,
): TriadResult | null {
  if (subset === 'full') return null
  const def = TRIAD_SUBSETS.find(t => t.id === subset)
  if (!def?.indices) return null
  const nStr = inst.strings
  // On 4-string instruments (baritone/uke), map top3→[1,2,3], mid3/lowmid3/bot3→[0,1,2]
  const strs = nStr >= 6
    ? [...def.indices]
    : subset === 'top3'
      ? [nStr - 3, nStr - 2, nStr - 1]
      : [0, 1, 2]
  if (strs.some(s => s < 0 || s >= nStr)) return null

  const third = (rootPc + (minor ? 3 : 4)) % 12
  const fifth = (rootPc + 7) % 12
  const chordPcs = [rootPc, third, fifth]

  const minF = Math.max(0, shape.lo - 2)
  const maxF = Math.min(20, shape.hi + 3)
  const center = (shape.lo + shape.hi) / 2

  const candidates = strs.map(s => {
    const fs: number[] = []
    for (let f = minF; f <= maxF; f++) {
      if (chordPcs.includes((inst.midis[s] + f) % 12)) fs.push(f)
    }
    return fs
  })

  let best: { combo: [number, number, number]; score: number } | null = null
  for (const f0 of candidates[0]) {
    for (const f1 of candidates[1]) {
      for (const f2 of candidates[2]) {
        const combo: [number, number, number] = [f0, f1, f2]
        const pcs = combo.map((f, i) => (inst.midis[strs[i]] + f) % 12)
        if (new Set(pcs).size !== 3) continue
        const span = Math.max(...combo) - Math.min(...combo)
        if (span > 4) continue
        // Prefer combos that match notes already in the parent CAGED chord shape, tight span, near shape center
        let matches = 0
        for (let i = 0; i < 3; i++) {
          if (shape.frets[strs[i]] === combo[i]) matches++
        }
        const avgDist = combo.reduce((sum, f) => sum + Math.abs(f - center), 0) / 3
        const score = matches * 20 - span * 4 - avgDist
        if (!best || score > best.score) best = { combo, score }
      }
    }
  }

  if (!best) return null
  const frets = Array.from({ length: nStr }, () => -1)
  strs.forEach((s, i) => { frets[s] = best!.combo[i] })
  const bassPc = (inst.midis[strs[0]] + best.combo[0]) % 12
  const inversion: TriadResult['inversion'] = bassPc === rootPc ? 'Root pos' : bassPc === third ? '1st inv' : '2nd inv'
  return { frets, strings: strs, inversion }
}

/**
 * Build a clean, strictly ascending, zero-duplicate, zero-missing-degree CAGED box of notes
 * for a given pitch-class set (arpeggio, pentatonic, or 7-note scale) inside a CAGED shape.
 */
export function buildBoxNotes(
  shape: CagedShape,
  pcs: number[],
  rootPc: number,
  chordPcs: number[],
  inst: Instrument,
  mode: 'roots' | 'arp' | 'penta' | 'scale',
): WarmupNote[] {
  const nStr = inst.strings
  if (mode === 'roots') {
    // Every root inside the shape's fret window (or exact shape roots + any octave in [lo-1, hi+1])
    const minF = Math.max(0, shape.lo - 1)
    const maxF = Math.min(20, shape.hi + 1)
    const out: WarmupNote[] = []
    for (let s = 0; s < nStr; s++) {
      // Prefer exact root in shape.frets if present
      if (shape.frets[s] >= 0 && (inst.midis[s] + shape.frets[s]) % 12 === rootPc) {
        out.push(makeNote(s, shape.frets[s], rootPc, chordPcs, inst))
        continue
      }
      let picked: number | null = null
      for (let f = minF; f <= maxF; f++) {
        if ((inst.midis[s] + f) % 12 === rootPc) {
          if (picked === null || Math.abs(f - shape.lo) < Math.abs(picked - shape.lo)) picked = f
        }
      }
      if (picked !== null) out.push(makeNote(s, picked, rootPc, chordPcs, inst))
    }
    return out.sort((a, b) => a.midi - b.midi || a.string - b.string)
  }

  // Arpeggio / Pentatonic / Scale box inside the shape's hand window.
  // Allow 1-fret reach on either side of [lo, hi] so standard tuning's 5-semitone string spacing never drops a note.
  const winLo = Math.max(0, shape.lo - 1)
  const winHi = Math.min(20, shape.hi + 1)
  const shapeMid = (shape.lo + shape.hi) / 2

  // Collect all candidate (string, fret, midi) in [winLo, winHi]
  const byMidi = new Map<number, { s: number; f: number; dist: number }>()
  for (let s = 0; s < nStr; s++) {
    for (let f = winLo; f <= winHi; f++) {
      const midi = inst.midis[s] + f
      if (!pcs.includes(midi % 12)) continue
      // Prefer notes inside [shape.lo, shape.hi], then closer to center, then matching shape.frets
      const outside = f < shape.lo ? shape.lo - f : f > shape.hi ? f - shape.hi : 0
      const inChordBonus = shape.frets[s] === f ? -0.6 : 0
      const dist = outside * 5 + Math.abs(f - shapeMid) * 0.25 + inChordBonus
      const prev = byMidi.get(midi)
      if (!prev || dist < prev.dist) {
        byMidi.set(midi, { s, f, dist })
      }
    }
  }

  // Keep notes sorted strictly ascending by MIDI, and for pentatonic trim any outlier > 4-fret span if a string got 3 notes
  let notes = [...byMidi.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => makeNote(v.s, v.f, rootPc, chordPcs, inst))

  if (mode === 'penta') {
    // Classic CAGED pentatonic boxes are 2 notes per string. If a string picked up 3 due to [lo-1, hi+1],
    // trim the single edge note farthest from [shape.lo, shape.hi] while keeping all roots.
    const perStr = new Map<number, WarmupNote[]>()
    for (const n of notes) {
      const arr = perStr.get(n.string) ?? []
      arr.push(n)
      perStr.set(n.string, arr)
    }
    const kept: WarmupNote[] = []
    for (let s = 0; s < nStr; s++) {
      const arr = perStr.get(s) ?? []
      if (arr.length <= 2) {
        kept.push(...arr)
      } else {
        // Keep the 2 closest to [shape.lo, shape.hi]
        const ranked = [...arr].sort((a, b) => {
          const outA = a.fret < shape.lo ? shape.lo - a.fret : a.fret > shape.hi ? a.fret - shape.hi : 0
          const outB = b.fret < shape.lo ? shape.lo - b.fret : b.fret > shape.hi ? b.fret - shape.hi : 0
          if (outA !== outB) return outA - outB
          return Math.abs(a.fret - shapeMid) - Math.abs(b.fret - shapeMid)
        })
        kept.push(...ranked.slice(0, 2).sort((a, b) => a.midi - b.midi))
      }
    }
    notes = kept.sort((a, b) => a.midi - b.midi)
  }

  return notes
}

/**
 * Full-Box Resolve ("Start & End on Root"):
 * - Ascending ('asc'): lowest Root → top of box → bottom of box → back up to land on Root!
 * - Descending ('desc'): highest Root → bottom of box → top of box → back down to land on Root!
 * Visits every single note in the box while locking the ear onto the Root at both start and finish.
 */
export function fullBoxResolve(box: WarmupNote[], dir: 'asc' | 'desc'): WarmupNote[] {
  if (box.length <= 1) return [...box]
  const top = box.length - 1
  if (dir === 'asc') {
    let rIdx = box.findIndex(n => n.isRoot)
    if (rIdx < 0) rIdx = 0
    if (rIdx === 0) {
      // Root is already the bottom note: climb 0 → top → 0 cleanly
      return [...box, ...box.slice(0, top).reverse()]
    }
    // Start on Root → climb to top → descend all the way to bottom (0) → climb back up to Root!
    const upToTop = box.slice(rIdx)
    const downToBottom = box.slice(0, top).reverse()
    const backToRoot = box.slice(1, rIdx + 1)
    return [...upToTop, ...downToBottom, ...backToRoot]
  } else {
    let rIdx = -1
    for (let i = top; i >= 0; i--) {
      if (box[i].isRoot) { rIdx = i; break }
    }
    if (rIdx < 0) rIdx = top
    if (rIdx === top) {
      // Root is already the top note: descend top → 0 → top cleanly
      return [...box.slice().reverse(), ...box.slice(1)]
    }
    // Start on highest Root → descend to bottom (0) → climb to top → descend back down to Root!
    const downToBottom = box.slice(0, rIdx + 1).reverse()
    const upToTop = box.slice(1)
    const backToRoot = box.slice(rIdx, top).reverse()
    return [...downToBottom, ...upToTop, ...backToRoot]
  }
}

/** Shift a CagedShape up an octave (+12 frets) for the high-fret turnaround near the guitar body. */
function octaveUpShape(sh: CagedShape): CagedShape | null {
  const frets = sh.frets.map(f => (f < 0 ? -1 : f + 12))
  const played = frets.filter(f => f >= 0)
  if (!played.length || Math.max(...played) > 19) return null
  return {
    letter: sh.letter,
    frets,
    roots: sh.roots.map(r => ({ s: r.s, f: r.f + 12 })),
    lo: Math.min(...played),
    hi: Math.max(...played),
  }
}

/**
 * Build the complete ordered warmup stages (Up the Neck → High Frets → Back Down)
 * for any step (1–5), key, quality (Major/Minor), scope ('all' or single shape), flow ('classic'|'snake'),
 * and Step-2 triad subset.
 */
export function buildWarmupStages(opts: {
  rootPc: number
  minor: boolean
  inst: Instrument
  step: WarmupStepId
  scope: string // 'all' | 'C' | 'A' | 'G' | 'E' | 'D' | 'F'
  flow: WarmupFlow
  triadSubset?: TriadSubset
}): WarmupStage[] {
  const { rootPc, minor, inst, step, scope, flow, triadSubset = 'full' } = opts
  const allShapes = cagedShapes(rootPc, minor, inst)
  const chordPcs = [rootPc, (rootPc + (minor ? 3 : 4)) % 12, (rootPc + 7) % 12]
  const pentaPcs = Scale.get(`${SHARPS[rootPc]} ${minor ? 'minor pentatonic' : 'major pentatonic'}`).notes.map(pc)
  const scalePcs = Scale.get(`${SHARPS[rootPc]} ${minor ? 'aeolian' : 'major'}`).notes.map(pc)

  // Determine the ascending sequence of positions up the neck
  let upList: { shape: CagedShape; octaveRepeat?: boolean }[] = []
  if (scope !== 'all') {
    const picked = allShapes.find(s => s.letter === scope) ?? allShapes[0]
    if (picked) upList = [{ shape: picked }]
  } else {
    upList = allShapes.map(shape => ({ shape }))
    // If the lowest shape sits in open position (lo <= 2), add its 12th-fret octave at the top near the body!
    const first = allShapes[0]
    if (first && first.lo <= 2) {
      const hiOct = octaveUpShape(first)
      if (hiOct) upList.push({ shape: hiOct, octaveRepeat: true })
    }
  }

  // Up the neck, then back down! (For single-shape lockdown: 1 ascending pass + 1 descending pass)
  const rawStages: { shape: CagedShape; journey: 'up' | 'down'; octaveRepeat?: boolean }[] =
    scope !== 'all'
      ? [
          ...upList.map(u => ({ ...u, journey: 'up' as const })),
          ...upList.map(u => ({ ...u, journey: 'down' as const })),
        ]
      : [
          ...upList.map(u => ({ ...u, journey: 'up' as const })),
          // Turn around smoothly at the top shape without duplicating the apex twice in a row (unless 1 shape)
          ...upList.slice(0, Math.max(1, upList.length - 1)).reverse().map(u => ({ ...u, journey: 'down' as const })),
        ]

  return rawStages.map((st, idx) => {
    const playDir: 'asc' | 'desc' =
      flow === 'classic'
        ? (st.journey === 'up' ? 'asc' : 'desc')
        : (idx % 2 === 0 ? 'asc' : 'desc')

    const octSuffix = st.octaveRepeat ? ' (12th)' : ''
    const arrow = playDir === 'asc' ? '↑' : '↓'
    const label = `${st.shape.letter}${octSuffix} ${arrow}`

    let boxNotes: WarmupNote[] = []
    let notes: WarmupNote[] = []
    let chordFrets = [...st.shape.frets]
    let triad: TriadResult | null = null

    if (step === 1) {
      boxNotes = buildBoxNotes(st.shape, [rootPc], rootPc, chordPcs, inst, 'roots')
      notes = playDir === 'asc' ? [...boxNotes] : [...boxNotes].reverse()
    } else if (step === 2) {
      triad = triadForShape(st.shape, rootPc, minor, inst, triadSubset)
      chordFrets = triad ? triad.frets : [...st.shape.frets]
      boxNotes = chordFrets
        .map((f, s) => (f >= 0 ? makeNote(s, f, rootPc, chordPcs, inst) : null))
        .filter((x): x is WarmupNote => x !== null)
      notes = playDir === 'asc' ? [...boxNotes] : [...boxNotes].reverse()
    } else if (step === 3) {
      boxNotes = buildBoxNotes(st.shape, chordPcs, rootPc, chordPcs, inst, 'arp')
      notes = fullBoxResolve(boxNotes, playDir)
    } else if (step === 4) {
      boxNotes = buildBoxNotes(st.shape, pentaPcs, rootPc, chordPcs, inst, 'penta')
      notes = fullBoxResolve(boxNotes, playDir)
    } else {
      boxNotes = buildBoxNotes(st.shape, scalePcs, rootPc, chordPcs, inst, 'scale')
      notes = fullBoxResolve(boxNotes, playDir)
    }

    return {
      index: idx,
      shape: st.shape,
      journey: st.journey,
      playDir,
      octaveRepeat: st.octaveRepeat,
      label,
      notes,
      chordFrets,
      triad,
      boxNotes,
    }
  })
}

/** Build a 1–2–3–4 finger HandGroup diagram for any warmup stage's box notes. */
export function handGroupForStage(stage: WarmupStage): HandGroup {
  const fretted = stage.boxNotes.filter(n => n.fret > 0)
  const minF = fretted.length ? Math.min(...fretted.map(n => n.fret)) : 1
  const maxF = fretted.length ? Math.max(...fretted.map(n => n.fret)) : 1
  const open = stage.boxNotes.some(n => n.fret === 0) && maxF <= 4
  const base = open ? 1 : Math.max(1, minF)
  return {
    from: 0,
    to: Math.max(1, stage.notes.length),
    base,
    open,
    notes: stage.boxNotes.map(n => ({
      string: n.string,
      fret: n.fret,
      finger: n.fret === 0 ? 0 : Math.min(4, Math.max(1, n.fret - base + 1)),
    })),
  }
}

/** Pack a list of SongSteps cleanly into 4/4 bars (4 beats per bar). */
function packIntoBars(steps: SongStep[]): SongBar[] {
  const bars: SongBar[] = []
  let cur: SongStep[] = []
  let beat = 0
  for (const st of steps) {
    if (beat + st.dur > 4.001 && cur.length > 0) {
      bars.push({ steps: cur })
      cur = []
      beat = 0
    }
    cur.push(st)
    beat += st.dur
    if (beat >= 3.999) {
      bars.push({ steps: cur })
      cur = []
      beat = 0
    }
  }
  if (cur.length > 0) bars.push({ steps: cur })
  return bars
}

/** Convert one warmup step (or ALL 5 steps chained together!) into a playable KGuitar Song for Play. */
export function buildCagedWarmupSong(opts: {
  rootPc: number
  minor: boolean
  inst: Instrument
  steps: WarmupStepId[]
  scope: string
  flow: WarmupFlow
  triadSubset?: TriadSubset
  bpm?: number
}): Song {
  const { rootPc, minor, inst, steps, scope, flow, triadSubset = 'full', bpm = 85 } = opts
  const keyLabel = `${SHARPS[rootPc]}${minor ? 'm' : ''}`
  const allSongSteps: SongStep[] = []

  for (const stepId of steps) {
    const info = WARMUP_STEPS.find(s => s.id === stepId)!
    const stages = buildWarmupStages({ rootPc, minor, inst, step: stepId, scope, flow, triadSubset })
    stages.forEach((st, stIdx) => {
      const section = stIdx === 0 ? info.title : undefined
      const triadTag = stepId === 2 && st.triad ? ` · ${st.triad.inversion}` : ''
      const chordTag = `${keyLabel} (${st.label}${triadTag})`
      if (stepId === 2) {
        // Strum the chord / triad cleanly as a half note, then arpeggiate it lightly or hold a full bar!
        const chordNotes: SongNote[] = st.boxNotes.map(n => ({ string: n.string, fret: n.fret, midi: n.midi }))
        if (chordNotes.length) {
          allSongSteps.push({
            notes: chordNotes,
            dur: 2,
            chord: chordTag,
            section,
            stroke: st.playDir === 'asc' ? 'down' : 'up',
          })
          // Follow with quick broken-chord clarity check (2 beats total)
          const subDur = st.notes.length ? Math.max(0.25, Number((2 / st.notes.length).toFixed(2))) : 2
          st.notes.forEach((n, i) => {
            allSongSteps.push({
              notes: [{ string: n.string, fret: n.fret, midi: n.midi }],
              dur: i === st.notes.length - 1 ? Math.max(0.25, Number((2 - subDur * (st.notes.length - 1)).toFixed(2))) : subDur,
            })
          })
        }
      } else {
        const dur = stepId === 1 ? 1 : 0.5
        st.notes.forEach((n, ni) => {
          allSongSteps.push({
            notes: [{ string: n.string, fret: n.fret, midi: n.midi }],
            dur,
            chord: ni === 0 ? chordTag : undefined,
            section: ni === 0 ? section : undefined,
          })
        })
      }
    })
  }

  const scopeLabel = scope === 'all' ? 'All 5 Shapes' : `${scope} Shape`
  const title = steps.length === 5
    ? `CAGED 5-Step Warmup · ${keyLabel} (${scopeLabel})`
    : `CAGED ${WARMUP_STEPS.find(s => s.id === steps[0])?.short ?? ''} · ${keyLabel} (${scopeLabel})`

  return {
    title,
    artist: flow === 'snake' ? 'CAGED Snake Flow' : 'CAGED Classic Up & Down',
    tempo: bpm,
    meter: 4,
    tracks: [
      {
        name: inst.noun[0].toUpperCase() + inst.noun.slice(1),
        tuning: [...inst.midis],
        capo: 0,
        bars: packIntoBars(allSongSteps),
      },
    ],
  }
}

export function formatWarmupNote(n: WarmupNote): string {
  return `${SHARPS[n.midi % 12]}(${n.fret})`
}
