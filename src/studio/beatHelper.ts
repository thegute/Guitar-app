// Smart Beat Helper engine: pure, undo-friendly producer actions that turn a blank or stiff grid
// into a musical, groovy, full beat — plus a 5-step Guided Beat Coach for beginners and guitarists.
import type { Voice } from '../audio/drums'
import type { PadId } from './pads'
import {
  type Beat, type DrumRow, type PNote, type Track,
  STEPS_PER_BAR, STARTERS, buildSong, chordNotesFor, newId, setBars, totalSteps,
} from './beat'
import { pc } from '../theory/notes'

export interface HelperResult {
  beat: Beat
  tip: string
  /** Optional drum voice to focus in Cockpit after the action */
  focusVoice?: PadId
}

export interface QuickVibe {
  id: string
  label: string
  emoji: string
}

/** Curated 1-tap style starters shown in the Smart Beat Helper bar. */
export const QUICK_VIBES: QuickVibe[] = [
  { id: 'boombap', label: 'Boom Bap', emoji: '🎤' },
  { id: 'trap', label: 'Trap 808', emoji: '🔥' },
  { id: 'rock', label: 'Rock', emoji: '🎸' },
  { id: 'funkpop', label: 'Funk', emoji: '🕺' },
  { id: 'lofi', label: 'Lo-Fi', emoji: '☕' },
  { id: 'pop', label: 'Pop', emoji: '✨' },
  { id: 'reggaerock', label: 'Reggae', emoji: '🌴' },
  { id: 'progmetal', label: 'Metal', emoji: '⚡' },
  { id: 'empty', label: 'Blank', emoji: '🧹' },
]

export interface GuideStepDef {
  id: number
  title: string
  short: string
  emoji: string
  voice: PadId
  hint: string
  cta: string
}

/** 5-step Guided Beat Coach: teaches beat-making in plain English, with a 1-tap auto button on every step. */
export const GUIDE_STEPS: GuideStepDef[] = [
  {
    id: 0,
    short: '1. Kick',
    title: 'Step 1 — Lay down the Kick (Heartbeat)',
    emoji: '🥁',
    voice: 'kick',
    hint: 'Put the Kick on beat 1 (and beat 3 or syncopated off-beats) to anchor the groove.',
    cta: '✨ Auto-build Kick',
  },
  {
    id: 1,
    short: '2. Snare',
    title: 'Step 2 — Add Snare / Clap (Backbeat)',
    emoji: '💥',
    voice: 'snare',
    hint: 'Snare or Clap on beats 2 & 4 (or beat 3 for half-time Trap) makes heads nod right away.',
    cta: '✨ Auto-build Snare',
  },
  {
    id: 2,
    short: '3. Hats',
    title: 'Step 3 — Drive the energy with Hi-Hats',
    emoji: '🎩',
    voice: 'hat',
    hint: '8th-note or 16th-note Hi-Hats carry the speed and bounce. Add rolls or swing for sauce.',
    cta: '✨ Auto-build Hats',
  },
  {
    id: 3,
    short: '4. Bass & Chords',
    title: 'Step 4 — Add Bass & Chords in Key',
    emoji: '🎹',
    voice: 'kick',
    hint: 'Lock a bassline to your kick drum and drop matching chords so it feels like a real track.',
    cta: '✨ Auto Bass + Chords',
  },
  {
    id: 4,
    short: '5. Polish & Fill',
    title: 'Step 5 — Ghost Notes, Fill & Jam!',
    emoji: '🎸',
    voice: 'snare',
    hint: 'Add human groove, ghost snares, and a last-bar drum fill — then grab your guitar and solo over it!',
    cta: '✨ Polish + Drum Fill',
  },
]

const RULER_16 = ['1', 'e', '&', 'a', '2', 'e', '&', 'a', '3', 'e', '&', 'a', '4', 'e', '&', 'a']
/** Plain-English rhythm count label for any 16th-note step index (0..15). */
export const stepRulerLabel = (stepIndex: number): string => RULER_16[((stepIndex % 16) + 16) % 16]

// ---- internal helpers
function ensureRow(rows: DrumRow[], voice: PadId, n: number): { rows: DrumRow[]; idx: number } {
  const existing = rows.findIndex(r => r.voice === voice)
  if (existing >= 0) {
    const r = rows[existing]
    const steps = r.steps.length === n ? [...r.steps] : Array.from({ length: n }, (_, i) => r.steps[i % Math.max(1, r.steps.length)] ?? 0)
    const next = [...rows]
    next[existing] = {
      ...r,
      steps,
      ...(r.rat ? { rat: Array.from({ length: n }, (_, i) => r.rat![i % Math.max(1, r.rat!.length)] ?? 1) } : {}),
      ...(r.prob ? { prob: Array.from({ length: n }, (_, i) => r.prob![i % Math.max(1, r.prob!.length)] ?? 1) } : {}),
    }
    return { rows: next, idx: existing }
  }
  const next = [...rows, { voice, steps: Array(n).fill(0) }]
  return { rows: next, idx: next.length - 1 }
}

function clampVel(v: number): number {
  return Math.round(Math.max(0.15, Math.min(1, v)) * 100) / 100
}

const BASS_INSTS = new Set(['sub808', 'bass', 'upbass', 'synthbass'])
const CHORD_INSTS = new Set(['epiano', 'grand', 'upright', 'acoustic', 'nylon', 'clean', 'crunch', 'supersaw', 'strings', 'organ', 'church', 'ambient', 'horns'])

function pickProgression(minor: boolean, bars: number): [number, string][] {
  const base: [number, string][] = minor
    ? [[0, 'm7'], [8, 'maj7'], [3, 'maj'], [10, '7']]
    : [[0, 'maj'], [7, 'maj'], [9, 'm7'], [5, 'maj7']]
  return Array.from({ length: bars }, (_, i) => base[i % base.length])
}

function pickBassInst(kit: Beat['kit']): { id: string; label: string; low: number } {
  if (kit === '808' || kit === '909') return { id: 'sub808', label: '808 Sub Bass', low: 29 }
  if (kit === 'lofi' || kit === 'vintage') return { id: 'upbass', label: 'Upright Bass', low: 33 }
  return { id: 'bass', label: 'Electric Bass', low: 33 }
}

function pickChordInst(kit: Beat['kit']): { id: string; label: string; pattern: 'hold' | 'stabs' | 'offbeat' | 'pulse'; oct: number; vol: number; space: number } {
  if (kit === 'lofi') return { id: 'epiano', label: 'Electric Piano', pattern: 'hold', oct: 52, vol: 0.62, space: 0.3 }
  if (kit === '808') return { id: 'epiano', label: 'Dark Keys', pattern: 'stabs', oct: 50, vol: 0.58, space: 0.32 }
  if (kit === '909') return { id: 'supersaw', label: 'Synth Chords', pattern: 'offbeat', oct: 55, vol: 0.55, space: 0.35 }
  if (kit === 'vintage') return { id: 'acoustic', label: 'Acoustic Guitar', pattern: 'offbeat', oct: 52, vol: 0.65, space: 0.2 }
  if (kit === 'rock' || kit === 'metal') return { id: 'clean', label: 'Rhythm Guitar', pattern: 'stabs', oct: 50, vol: 0.66, space: 0.16 }
  return { id: 'grand', label: 'Grand Piano', pattern: 'pulse', oct: 55, vol: 0.6, space: 0.25 }
}

/** Load one of the curated quick style starters. */
export function loadQuickVibe(id: string): HelperResult | null {
  const s = STARTERS.find(x => x.id === id)
  if (!s) return null
  const beat = s.make()
  const tip = id === 'empty'
    ? 'Started a clean blank beat — use Guide Me or tap the pads/grid to build from scratch!'
    : `Loaded ${s.label} (${beat.bpm} BPM, ${beat.key}${beat.minor ? 'm' : ''}) — press ▶ to hear it, then customize anything!`
  return { beat, tip, focusVoice: 'kick' }
}

/** 1. Bounce & Ghost Notes: adds subtle ghost snares, dynamic velocity groove, and light pocket swing. */
export function applyBounceAndGhosts(beat: Beat): HelperResult {
  const n = totalSteps(beat)
  let rows = beat.rows.map(r => ({ ...r, steps: [...r.steps] }))

  // Humanize existing hits: downbeats punchier, offbeat 16ths softer for real-drummer pocket
  rows = rows.map(r => {
    const isHat = r.voice === 'hat' || r.voice === 'shaker' || r.voice === 'ride'
    const steps = r.steps.map((v, i) => {
      if (v <= 0) return 0
      const inBar = i % 16
      if (isHat) {
        if (inBar % 4 === 0) return clampVel(Math.max(v, 0.78))
        if (inBar % 2 === 0) return clampVel(Math.min(v, 0.56))
        return clampVel(Math.min(v, 0.38))
      }
      if (inBar === 0 || inBar === 4 || inBar === 8 || inBar === 12) return clampVel(v * 1.06)
      return clampVel(v * 0.9)
    })
    return { ...r, steps }
  })

  // Add subtle ghost snares on musical offbeat 16ths (slots 7, 9, 15) where empty
  const ensured = ensureRow(rows, 'snare', n)
  rows = ensured.rows
  const snare = rows[ensured.idx]
  const ghostSlots = [7, 9, 15]
  let ghostsAdded = 0
  for (let bar = 0; bar < beat.bars; bar++) {
    for (const s of ghostSlots) {
      // Keep bar 1 spacious; put slot 9 only on even/later bars for musical variety
      if (s === 9 && bar % 2 === 0) continue
      const idx = bar * 16 + s
      if (idx < n && snare.steps[idx] === 0) {
        snare.steps[idx] = s === 15 ? 0.34 : 0.27
        ghostsAdded++
      }
    }
  }

  const nextSwing = beat.swing < 0.06 ? 0.11 : beat.swing
  const swingMsg = beat.swing < 0.06 ? ' and a touch of pocket swing' : ''
  return {
    beat: { ...beat, rows, swing: nextSwing },
    tip: `Added ${ghostsAdded} ghost snare notes, natural hit accents${swingMsg} — press ▶ to feel the bounce!`,
    focusVoice: 'snare',
  }
}

/** 2. Pro Hat Rolls: creates crisp ×2 / ×3 hi-hat ratchets and an open-hat turnaround lift. */
export function applyProHatRolls(beat: Beat): HelperResult {
  const n = totalSteps(beat)
  let rows = beat.rows.map(r => ({
    ...r,
    steps: [...r.steps],
    ...(r.rat ? { rat: [...r.rat] } : {}),
  }))

  // Ensure hi-hat row exists and has at least an 8th-note foundation
  const h = ensureRow(rows, 'hat', n)
  rows = h.rows
  const hat = rows[h.idx]
  const hasAnyHat = hat.steps.some(v => v > 0)
  if (!hasAnyHat) {
    for (let i = 0; i < n; i += 2) hat.steps[i] = i % 4 === 0 ? 0.78 : 0.52
  }
  const rat = hat.rat ? [...hat.rat] : Array(n).fill(1)

  for (let bar = 0; bar < beat.bars; bar++) {
    const b0 = bar * 16
    // Mid-bar quick ×2 triplet roll right before beat 3 on alternating bars
    if (bar % 2 === 1 || beat.bars === 1) {
      const mid = b0 + 7
      if (mid < n) { hat.steps[mid] = 0.65; rat[mid] = 2 }
    }
    // End-of-bar signature roll (×2 on odd bars, ×3 on last/even bars)
    const tail = b0 + 15
    if (tail < n) {
      hat.steps[tail] = 0.72
      rat[tail] = bar === beat.bars - 1 ? 3 : 2
    }
  }
  rows[h.idx] = { ...hat, rat }

  // Add a subtle open hi-hat lift on the "&" of beat 4 on even bars (or bar 1)
  const o = ensureRow(rows, 'open', n)
  rows = o.rows
  const openRow = rows[o.idx]
  for (let bar = 0; bar < beat.bars; bar++) {
    if (beat.bars === 1 || bar % 2 === 1) {
      const pos = bar * 16 + 14
      if (pos < n) {
        openRow.steps[pos] = 0.66
        // Clear closed hat on that exact step so the open hat breathes
        rows[h.idx].steps[pos] = 0
      }
    }
  }

  return {
    beat: { ...beat, rows },
    tip: 'Added rapid ×2 / ×3 hi-hat rolls and an open-hat lift leading into beat 1!',
    focusVoice: 'hat',
  }
}

/** 3. Auto Drum Fill: writes a musical turnaround fill on the last 2 beats + a beat-1 crash cymbal. */
export function applyAutoDrumFill(beat: Beat): HelperResult {
  const n = totalSteps(beat)
  const lastBarStart = (beat.bars - 1) * STEPS_PER_BAR
  let rows = beat.rows.map(r => ({
    ...r,
    steps: [...r.steps],
    ...(r.rat ? { rat: [...r.rat] } : {}),
  }))

  // Clear closed/open hats on the last 2 beats of the final bar so the fill shines
  rows = rows.map(r => {
    if (r.voice === 'hat' || r.voice === 'open' || r.voice === 'ride') {
      const steps = r.steps.map((v, i) => (i >= lastBarStart + 8 && i < lastBarStart + 16 ? 0 : v))
      return { ...r, steps }
    }
    return r
  })

  const electronic = beat.kit === '808' || beat.kit === '909' || beat.kit === 'lofi'
  if (electronic) {
    // Punchy electronic snare/clap build-up roll
    const s = ensureRow(rows, 'snare', n)
    rows = s.rows
    const snare = rows[s.idx]
    const rat = snare.rat ? [...snare.rat] : Array(n).fill(1)
    const hits: [number, number, number][] = [
      [8, 0.55, 1], [10, 0.68, 1], [12, 0.78, 1], [13, 0.82, 1], [14, 0.88, 1], [15, 0.96, 2],
    ]
    for (const [off, v, r] of hits) {
      const idx = lastBarStart + off
      if (idx < n) { snare.steps[idx] = v; rat[idx] = r }
    }
    rows[s.idx] = { ...snare, rat }
  } else {
    // Acoustic / Rock / Metal drummer tom walk-down: Snare → High Tom → Mid Tom → Floor Tom
    const addHit = (voice: Voice, off: number, vel: number) => {
      const e = ensureRow(rows, voice, n)
      rows = e.rows
      const idx = lastBarStart + off
      if (idx < n) rows[e.idx].steps[idx] = vel
    }
    addHit('snare', 8, 0.86)
    addHit('snare', 9, 0.55)
    addHit('tom1', 10, 0.82)
    addHit('tom1', 11, 0.7)
    addHit('tom2', 12, 0.86)
    addHit('tom2', 13, 0.74)
    addHit('tom3', 14, 0.9)
    addHit('tom3', 15, 0.95)
  }

  // Land on a crash cymbal on beat 1 of Bar 1
  const c = ensureRow(rows, 'crash', n)
  rows = c.rows
  rows[c.idx].steps[0] = 0.85

  return {
    beat: { ...beat, rows },
    tip: electronic
      ? `Wrote a snare build-up roll on Bar ${beat.bars} into a beat-1 crash!`
      : `Wrote a tom walk-down drum fill on Bar ${beat.bars} landing on a beat-1 crash!`,
    focusVoice: electronic ? 'snare' : 'tom1',
  }
}

/** 4. Auto Bassline: locks a musical bassline in the beat's key directly to your kick drum hits. */
export function applyAutoBassline(beat: Beat): HelperResult {
  const prog = pickProgression(beat.minor, beat.bars)
  const bassSpec = pickBassInst(beat.kit)
  const kickRow = beat.rows.find(r => r.voice === 'kick')
  const keyPc = pc(beat.key)

  const notes: PNote[] = []
  for (let bar = 0; bar < beat.bars; bar++) {
    const [semi] = prog[bar]
    const rootMidi = bassSpec.low + ((keyPc + semi) % 12)
    const b0 = bar * STEPS_PER_BAR
    // Read kick steps in this bar (fallback to bar 1 kicks or a tight pocket pattern)
    let hits: number[] = []
    if (kickRow) {
      for (let s = 0; s < 16; s++) if ((kickRow.steps[b0 + s] ?? 0) > 0) hits.push(s)
      if (hits.length === 0) {
        for (let s = 0; s < 16; s++) if ((kickRow.steps[s] ?? 0) > 0) hits.push(s)
      }
    }
    if (hits.length === 0) hits = beat.minor ? [0, 6, 10] : [0, 6, 8, 14]
    // Cap super-dense double-kick runs so the bass breathes cleanly
    const cleanHits: number[] = []
    for (const h of hits) {
      if (cleanHits.length === 0 || h - cleanHits[cleanHits.length - 1] >= 2) cleanHits.push(h)
    }

    cleanHits.forEach((s, idx) => {
      const nextS = idx + 1 < cleanHits.length ? cleanHits[idx + 1] : 16
      const len = Math.max(1, Math.min(4, nextS - s))
      // Musical octave/fifth bounce on the last syncopated note of bars 2 & 4
      const bounce = idx === cleanHits.length - 1 && s >= 10 && bar % 2 === 1 ? 7 : 0
      notes.push({
        s: b0 + s,
        l: len,
        m: rootMidi + bounce,
        v: s === 0 ? 0.9 : 0.8,
      })
    })
  }

  const kept = beat.tracks.filter(t => !BASS_INSTS.has(t.inst))
  const bassTrack: Track = { id: newId(), inst: bassSpec.id, notes, vol: 0.85, space: 0.04 }
  return {
    beat: { ...beat, tracks: [...kept, bassTrack] },
    tip: `Locked a ${bassSpec.label} in ${beat.key}${beat.minor ? ' minor' : ' major'} right to your kick drum!`,
  }
}

/** 5. Auto Chords: adds a matching chord progression track in the beat's key & style. */
export function applyAutoChords(beat: Beat): HelperResult {
  const prog = pickProgression(beat.minor, beat.bars)
  const spec = pickChordInst(beat.kit)
  const notes = chordNotesFor(prog, beat.key, spec.oct, spec.pattern, 'close', 16)
  const kept = beat.tracks.filter(t => !CHORD_INSTS.has(t.inst))
  const chordTrack: Track = { id: newId(), inst: spec.id, notes, vol: spec.vol, space: spec.space }
  const progLabel = beat.minor ? 'i – VI – III – VII' : 'I – V – vi – IV'
  return {
    beat: { ...beat, tracks: [...kept, chordTrack] },
    tip: `Added ${spec.label} chords (${progLabel} in ${beat.key}${beat.minor ? 'm' : ''}) — works together with Auto Bass!`,
  }
}

/** 6. Remix Variation: keeps your kick & snare backbone solid while refreshing hats, percussion & groove. */
export function applyRemixVariation(beat: Beat, variantIndex?: number): HelperResult {
  const n = totalSteps(beat)
  // Pick next deterministic variant based on existing beat state if not explicitly provided
  const hash = beat.rows.reduce((acc, r) => acc + r.steps.filter(v => v > 0).length, 0) + Math.round(beat.swing * 100)
  const variant = ((variantIndex ?? hash) % 3 + 3) % 3
  let rows = beat.rows.map(r => ({
    ...r,
    steps: [...r.steps],
    ...(r.rat ? { rat: [...r.rat] } : {}),
  }))

  // Ensure a solid kick + snare backbone exists first
  const k = ensureRow(rows, 'kick', n); rows = k.rows
  if (!rows[k.idx].steps.some(v => v > 0)) {
    for (let bar = 0; bar < beat.bars; bar++) {
      rows[k.idx].steps[bar * 16 + 0] = 0.95
      rows[k.idx].steps[bar * 16 + 8] = 0.85
    }
  }
  const s = ensureRow(rows, 'snare', n); rows = s.rows
  if (!rows[s.idx].steps.some(v => v > 0)) {
    for (let bar = 0; bar < beat.bars; bar++) {
      rows[s.idx].steps[bar * 16 + 4] = 0.9
      rows[s.idx].steps[bar * 16 + 12] = 0.9
    }
  }

  let tip = ''
  let nextSwing = beat.swing
  if (variant === 0) {
    // Syncopated 16th-hat energy + shaker pulse + kick pickup
    const h = ensureRow(rows, 'hat', n); rows = h.rows
    rows[h.idx].steps = Array.from({ length: n }, (_, i) => (i % 4 === 0 ? 0.78 : i % 2 === 0 ? 0.55 : i % 16 === 15 ? 0.65 : 0.32))
    const sh = ensureRow(rows, 'shaker', n); rows = sh.rows
    rows[sh.idx].steps = Array.from({ length: n }, (_, i) => (i % 4 === 2 ? 0.52 : 0))
    for (let bar = 0; bar < beat.bars; bar++) {
      const pickup = bar * 16 + 14
      if (pickup < n) rows[k.idx].steps[pickup] = 0.75
    }
    tip = 'Remix: driving 16th hi-hats, off-beat shaker, and a punchy kick pickup!'
  } else if (variant === 1) {
    // Spacious swung pocket with rimshot accents & open-hat lifts
    const h = ensureRow(rows, 'hat', n); rows = h.rows
    rows[h.idx].steps = Array.from({ length: n }, (_, i) => (i % 2 === 0 && i % 16 !== 14 ? (i % 4 === 0 ? 0.75 : 0.48) : 0))
    const o = ensureRow(rows, 'open', n); rows = o.rows
    rows[o.idx].steps = Array.from({ length: n }, (_, i) => (i % 16 === 14 ? 0.65 : 0))
    const rim = ensureRow(rows, 'rim', n); rows = rim.rows
    rows[rim.idx].steps = Array.from({ length: n }, (_, i) => (i % 16 === 7 || i % 16 === 11 ? 0.55 : 0))
    nextSwing = Math.max(beat.swing, 0.14)
    tip = 'Remix: laid-back swung pocket with rimshot syncopation and open-hat lifts!'
  } else {
    // Big chorus feel: ride cymbal + layered clap on beat 4 + tambourine on 2 & 4
    const rd = ensureRow(rows, 'ride', n); rows = rd.rows
    rows[rd.idx].steps = Array.from({ length: n }, (_, i) => (i % 4 === 0 ? 0.76 : i % 2 === 0 ? 0.46 : 0))
    const cl = ensureRow(rows, 'clap', n); rows = cl.rows
    rows[cl.idx].steps = Array.from({ length: n }, (_, i) => (i % 16 === 12 ? 0.85 : 0))
    const tb = ensureRow(rows, 'tamb', n); rows = tb.rows
    rows[tb.idx].steps = Array.from({ length: n }, (_, i) => (i % 8 === 4 ? 0.6 : 0))
    tip = 'Remix: big chorus groove with ride cymbal, beat-4 clap layer, and tambourine!'
  }

  return { beat: { ...beat, rows, swing: nextSwing }, tip, focusVoice: 'hat' }
}

/** 7. Auto Full Song: 1-tap A/B/C/D song builder right from the Helper bar. */
export function applyAutoFullSong(beat: Beat): HelperResult {
  const next = buildSong(beat)
  return {
    beat: next,
    tip: 'Built a full song (A Verse · B Chorus · C Break · D Ending) and turned Song Mode on!',
  }
}

/** Execute the 1-tap "✨ Do this step for me" action for any of the 5 Guided Beat Coach steps. */
export function applyGuideStep(beat: Beat, stepIndex: 0 | 1 | 2 | 3 | 4): HelperResult {
  const n = totalSteps(beat)
  const halfTime = beat.bpm >= 128 || beat.kit === '808'

  if (stepIndex === 0) {
    // Step 1: Kick (Heartbeat)
    const e = ensureRow(beat.rows, 'kick', n)
    const pattern = halfTime ? [0, 6, 10] : beat.kit === 'lofi' ? [0, 7, 10] : [0, 8, 10]
    const steps = Array(n).fill(0) as number[]
    for (let bar = 0; bar < beat.bars; bar++) {
      for (const s of pattern) {
        const idx = bar * 16 + s
        if (idx < n) steps[idx] = s === 0 ? 0.96 : 0.82
      }
    }
    e.rows[e.idx] = { ...e.rows[e.idx], steps, mute: false }
    return {
      beat: { ...beat, rows: e.rows },
      tip: 'Step 1 done! Added a punchy Kick pattern — press ▶ to hear the heartbeat, then move to Step 2.',
      focusVoice: 'kick',
    }
  }

  if (stepIndex === 1) {
    // Step 2: Snare / Clap (Backbeat)
    const e = ensureRow(beat.rows, 'snare', n)
    const slots = halfTime ? [8] : [4, 12]
    const steps = Array(n).fill(0) as number[]
    for (let bar = 0; bar < beat.bars; bar++) {
      for (const s of slots) {
        const idx = bar * 16 + s
        if (idx < n) steps[idx] = 0.92
      }
    }
    e.rows[e.idx] = { ...e.rows[e.idx], steps, mute: false }
    let rows = e.rows
    if (halfTime) {
      const cl = ensureRow(rows, 'clap', n)
      rows = cl.rows
      const cSteps = Array(n).fill(0) as number[]
      for (let bar = 0; bar < beat.bars; bar++) cSteps[bar * 16 + 8] = 0.78
      rows[cl.idx] = { ...rows[cl.idx], steps: cSteps, mute: false }
    }
    return {
      beat: { ...beat, rows },
      tip: halfTime
        ? 'Step 2 done! Placed a hard half-time Snare + Clap on beat 3.'
        : 'Step 2 done! Locked the Snare on beats 2 & 4 — instant head-nod backbeat!',
      focusVoice: 'snare',
    }
  }

  if (stepIndex === 2) {
    // Step 3: Hi-Hats (Energy + subtle roll on electronic kits)
    const e = ensureRow(beat.rows, 'hat', n)
    const steps = Array.from({ length: n }, (_, i) => {
      const inBar = i % 16
      if (inBar % 2 !== 0) return 0
      return inBar % 4 === 0 ? 0.78 : 0.52
    })
    e.rows[e.idx] = { ...e.rows[e.idx], steps, mute: false }
    const baseBeat = { ...beat, rows: e.rows }
    if (halfTime) {
      const rolled = applyProHatRolls(baseBeat)
      return { ...rolled, tip: 'Step 3 done! Added driving Hi-Hats with rapid pro rolls!' }
    }
    return {
      beat: baseBeat,
      tip: 'Step 3 done! Added accented 8th-note Hi-Hats to carry the rhythm.',
      focusVoice: 'hat',
    }
  }

  if (stepIndex === 3) {
    // Step 4: Bass + Chords in key
    const withBass = applyAutoBassline(beat).beat
    const withBoth = applyAutoChords(withBass).beat
    return {
      beat: withBoth,
      tip: `Step 4 done! Added a tight Bassline + matching Chords in ${beat.key}${beat.minor ? ' minor' : ' major'}!`,
      focusVoice: 'kick',
    }
  }

  // Step 5: Polish (Bounce + Auto Fill)
  const bounced = applyBounceAndGhosts(beat).beat
  const polished = applyAutoDrumFill(bounced).beat
  return {
    beat: polished,
    tip: 'Step 5 done! Added ghost snares, natural pocket swing, and a last-bar drum fill — grab your guitar and jam!',
    focusVoice: 'snare',
  }
}

/** Copy Bar 1 (steps 0..15) cleanly across all bars (if 1 bar, expands to 2 bars first). */
export function copyBar1ToRest(beat: Beat): HelperResult {
  const target = beat.bars === 1 ? setBars(beat, 2) : beat
  const n = totalSteps(target)
  const rows = target.rows.map(r => ({
    ...r,
    steps: Array.from({ length: n }, (_, i) => r.steps[i % 16] ?? 0),
    ...(r.rat ? { rat: Array.from({ length: n }, (_, i) => r.rat![i % 16] ?? 1) } : {}),
    ...(r.prob ? { prob: Array.from({ length: n }, (_, i) => r.prob![i % 16] ?? 1) } : {}),
  }))
  const tracks = target.tracks.map(tr => {
    const bar1 = tr.notes.filter(x => x.s < 16)
    if (bar1.length === 0) return tr
    const notes: PNote[] = []
    for (let bar = 0; bar < target.bars; bar++) {
      for (const note of bar1) notes.push({ ...note, s: note.s + bar * 16 })
    }
    return { ...tr, notes }
  })
  return {
    beat: { ...target, rows, tracks },
    tip: `Copied Bar 1 across all ${target.bars} bars — now tweak Bar ${target.bars} for a custom turnaround!`,
  }
}

/** Fill a single drum row evenly (e.g. every 2 steps = 8th notes, every 4 steps = quarter notes). */
export function fillDrumRow(beat: Beat, voice: PadId, every: number, offset = 0, vel = 0.8): Beat {
  const n = totalSteps(beat)
  const e = ensureRow(beat.rows, voice, n)
  e.rows[e.idx] = {
    ...e.rows[e.idx],
    steps: Array.from({ length: n }, (_, i) => (i % every === offset ? vel : 0)),
  }
  return { ...beat, rows: e.rows }
}

/** Clear all steps on a single drum row. */
export function clearDrumRow(beat: Beat, voice: PadId): Beat {
  const n = totalSteps(beat)
  return {
    ...beat,
    rows: beat.rows.map(r => (r.voice === voice ? { ...r, steps: Array(n).fill(0), rat: undefined, prob: undefined } : r)),
  }
}

/** Clear all drum steps across the whole beat (keeps kit/BPM/tracks intact). */
export function clearAllDrums(beat: Beat): HelperResult {
  const n = totalSteps(beat)
  return {
    beat: {
      ...beat,
      rows: beat.rows.map(r => ({ ...r, steps: Array(n).fill(0), rat: undefined, prob: undefined })),
      layers: [],
    },
    tip: 'Cleared all drum steps (press ↶ Undo anytime to bring them back).',
  }
}
