// Arpeggio Connector engine (Mode 1: Chord-to-Chord Nearest-Note "Connecting Game" in one neck zone;
// Mode 2: Diagonal CAGED Slides across the whole fretboard).
// Designed to prevent common beginner & algorithmic traps:
//   - Zero bar-line note stutter (prefers smooth 1-3 semitone voice-leading handoffs; explicitly labels shared tones)
//   - Automatic neck-zone bounce (never runs off the top or bottom of your hand position)
//   - Ergonomic 4-5 fret hand-window note selection (Guitar, Baritone, Tenor Uke)
//   - Diagonal slides strictly on the SAME string (tech '/' up, '\' down) capped cleanly <= fret 17
//   - Exact 4/4 bar packing + backing chords for Play & live Demo playback
import { Scale } from 'tonal'
import type { Instrument } from '../instrument'
import { pc, SHARPS } from '../theory/notes'
import { chordInfo, type ChordInfo } from '../tabs/harmony'
import type { Song, SongBar, SongNote, SongStep } from '../tabs/model'
import type { HandGroup } from '../play/handShape'
import { cagedShapes } from './caged'

export type ConnectZoneId = 'low' | 'mid' | 'high'
export type ConnectLevel = 1 | 2 | 3
export type ConnectChordSize = 'triad' | '7th'
export type DiagonalQuality = 'maj' | 'min' | 'dom7'

export const CONNECT_ZONES: { id: ConnectZoneId; label: string; frets: [number, number] }[] = [
  { id: 'low', label: 'Low (frets 0–5)', frets: [0, 5] },
  { id: 'mid', label: 'Middle (frets 4–9)', frets: [4, 9] },
  { id: 'high', label: 'High (frets 8–13)', frets: [8, 13] },
]

export const CONNECT_LEVELS: { id: ConnectLevel; short: string; title: string; summary: string }[] = [
  {
    id: 1,
    short: 'Lv 1 · Pure Arpeggios',
    title: 'Level 1 · Pure Nearest-Note Arpeggios',
    summary: '1 clean chord tone per beat. On every chord change, step to the closest note of the next chord — never jump back to the bottom Root.',
  },
  {
    id: 2,
    short: 'Lv 2 · Scale Bridges',
    title: 'Level 2 · Scale & Half-Step Bridges',
    summary: 'Adds a smooth passing or half-step approach note right before beat 1 so your line glides into the new chord like a real melody.',
  },
  {
    id: 3,
    short: 'Lv 3 · Solo Phrases',
    title: 'Level 3 · Real Solo Phrases (with Space)',
    summary: 'Turns connected arpeggios into singable 3–4 note phrases that land and breathe on beat 1 — fixing the #1 reason arpeggio drills sound robotic.',
  },
]

export interface ArpNote {
  string: number
  fret: number
  midi: number
  pc: number
  /** Chord-tone label (R, 3, b3, 5, b7, 7) or 'pass' for a scale/approach bridge note */
  label: string
  isRoot: boolean
  isGuide: boolean
  isBridge?: boolean
  dur: number
  tech?: '/' | '\\'
  shapeLetter?: string
}

export interface BarHandoff {
  from: ArpNote
  to: ArpNote
  semitones: number
  kind: 'half-step' | 'whole-step' | 'step' | 'shared'
  sharedNames: string[]
  coachText: string
}

export interface ConnectedBar {
  barIndex: number
  chordName: string
  chord: ChordInfo
  /** All chord tones available in this neck zone (for fretboard background display) */
  zoneTones: ArpNote[]
  /** Exact sequence of notes played in this bar (sums to 4 beats) */
  notes: ArpNote[]
  /** Soft backing chord MIDI voicing to strum under beat 1 during demo */
  backingMidis: number[]
  /** Handoff from this bar's last note into the next bar's beat 1 */
  handoffToNext: BarHandoff | null
}

export interface ChordToChordResult {
  bars: ConnectedBar[]
  zone: [number, number]
  allNotes: (ArpNote & { barIndex: number; chordName: string })[]
}

export interface DiagonalStep {
  note: ArpNote
  shapeLetter: string
  slideFrom?: ArpNote | null
  callout?: string
}

export interface DiagonalResult {
  chordName: string
  chord: ChordInfo
  steps: DiagonalStep[]
  /** All chord tones across frets 0–17 for context */
  neckTones: ArpNote[]
  slideArrows: { s1: number; f1: number; s2: number; f2: number; kind: 'guide' | 'move' }[]
  shapePath: string[]
}

export interface ConnectCoachGuide {
  what: string
  why: string
  how: string
  avoid: string
}

function allowedPcsForChord(info: ChordInfo, size: ConnectChordSize): number[] {
  if (size === 'triad' && info.triad.length >= 3) return info.triad
  return info.pcs.length ? info.pcs : info.triad
}

function labelForPc(info: ChordInfo, p: number): string {
  return info.labels.get(p) ?? (p === info.root ? 'R' : '·')
}

function isGuideLabel(l: string): boolean {
  return /^(b3|3|b7|7)$/.test(l)
}

/** Build the sorted, zero-duplicate, ergonomic chord-tone pool inside a neck zone. */
export function buildZoneChordPool(
  info: ChordInfo,
  inst: Instrument,
  zone: [number, number],
  size: ConnectChordSize,
): ArpNote[] {
  const pcs = allowedPcsForChord(info, size)
  const [zLo, zHi] = zone
  const center = (zLo + zHi) / 2
  const byMidi = new Map<number, { s: number; f: number; dist: number }>()

  for (let s = 0; s < inst.strings; s++) {
    for (let f = zLo; f <= zHi; f++) {
      const midi = inst.midis[s] + f
      if (!pcs.includes(midi % 12)) continue
      const dist = Math.abs(f - center) + (f === zHi ? 0.35 : 0)
      const prev = byMidi.get(midi)
      if (!prev || dist < prev.dist) byMidi.set(midi, { s, f, dist })
    }
  }

  return [...byMidi.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([midi, v]) => {
      const p = midi % 12
      const label = labelForPc(info, p)
      return {
        string: v.s,
        fret: v.f,
        midi,
        pc: p,
        label,
        isRoot: p === info.root,
        isGuide: isGuideLabel(label),
        dur: 1,
      }
    })
}

/** Pick a comfortable 3–4 note backing chord strum inside or near the zone so learners hear the harmony underneath. */
function backingMidisFor(info: ChordInfo, pool: ArpNote[]): number[] {
  const rootMidi = 48 + ((info.root - 0 + 12) % 12) // C3..B3 register
  const tones = info.pcs.slice(0, 4).map(p => {
    let m = 48 + p
    if (m < rootMidi) m += 12
    return m
  })
  if (tones.length >= 3) return [rootMidi - 12, ...tones.sort((a, b) => a - b)]
  return pool.slice(0, 4).map(n => n.midi)
}

/** Find a clean passing or half-step approach note between `from` and `target` strictly inside the neck zone. */
function findBridgeNote(
  from: ArpNote,
  target: ArpNote,
  scalePcs: Set<number>,
  inst: Instrument,
  zone: [number, number],
): ArpNote | null {
  const [zLo, zHi] = zone
  const diff = target.midi - from.midi
  if (Math.abs(diff) === 0) return null
  const stepDir = diff > 0 ? 1 : -1

  // Candidate bridge MIDI pitches:
  // 1) A diatonic scale tone strictly between from and target (e.g. C -> E bridged by D)
  // 2) Or a chromatic half-step approach right below/above target (target.midi - stepDir)
  const candMidis: number[] = []
  if (Math.abs(diff) >= 2) {
    for (let m = from.midi + stepDir; m !== target.midi; m += stepDir) {
      if (scalePcs.has(((m % 12) + 12) % 12)) candMidis.push(m)
    }
  }
  const chromatic = target.midi - stepDir
  if (chromatic !== from.midi && !candMidis.includes(chromatic)) candMidis.push(chromatic)
  // Prefer the candidate closest to target (so it leads right into beat 1!)
  candMidis.sort((a, b) => Math.abs(target.midi - a) - Math.abs(target.midi - b))

  for (const m of candMidis) {
    // Pick the fret in [zLo, zHi] closest to target's string & fret
    let best: { s: number; f: number; cost: number } | null = null
    for (let s = 0; s < inst.strings; s++) {
      const f = m - inst.midis[s]
      if (f < zLo || f > zHi) continue
      const cost = Math.abs(s - target.string) * 2 + Math.abs(f - target.fret)
      if (!best || cost < best.cost) best = { s, f, cost }
    }
    if (best) {
      const p = ((m % 12) + 12) % 12
      return {
        string: best.s,
        fret: best.f,
        midi: m,
        pc: p,
        label: scalePcs.has(p) ? 'pass' : 'chr',
        isRoot: false,
        isGuide: false,
        isBridge: true,
        dur: 0.5,
      }
    }
  }
  return null
}

/** Pick the smoothest, zero-stutter nearest chord tone in `nextPool` from `prevNote`. */
function pickNearestHandoff(prev: ArpNote, nextPool: ArpNote[], preferredDir: 1 | -1): ArpNote {
  // Prefer a *moving* chord tone within 1-3 semitones so we don't awkwardly stutter the same pitch across the bar line!
  const moving = nextPool.filter(n => n.midi !== prev.midi)
  const candidates = moving.length ? moving : nextPool
  let best = candidates[0]
  let bestScore = Infinity

  for (const cand of candidates) {
    const semiDist = Math.abs(cand.midi - prev.midi)
    const dirPenalty = (cand.midi - prev.midi) * preferredDir > 0 ? 0 : 0.45
    const guideBonus = cand.isGuide ? -0.35 : 0
    const fretPenalty = Math.abs(cand.fret - prev.fret) * 0.15 + Math.abs(cand.string - prev.string) * 0.2
    const score = semiDist + dirPenalty + guideBonus + fretPenalty
    if (score < bestScore) {
      bestScore = score
      best = cand
    }
  }
  return best
}

function buildHandoffExplanation(
  curChord: ChordInfo,
  nextChord: ChordInfo,
  from: ArpNote,
  to: ArpNote,
  nextPool: ArpNote[],
): BarHandoff {
  const diff = to.midi - from.midi
  const abs = Math.abs(diff)
  const kind: BarHandoff['kind'] =
    abs === 0 ? 'shared' : abs === 1 ? 'half-step' : abs === 2 ? 'whole-step' : 'step'

  const curPcs = new Set(curChord.pcs)
  const sharedPcs = [...new Set(nextPool.map(n => n.pc))].filter(p => curPcs.has(p))
  const sharedNames = sharedPcs.map(p => SHARPS[p])

  const fromName = SHARPS[from.pc]
  const toName = SHARPS[to.pc]
  const moveWord = diff > 0 ? 'climbs' : diff < 0 ? 'drops' : 'stays on'
  const fretStr = abs === 1 ? 'just 1 fret' : `${abs} frets`

  let coachText = ''
  if (kind === 'shared') {
    coachText = `${curChord.name} → ${nextChord.name}: ${fromName} (${from.label}) stays put as a shared tone (${to.label} of ${nextChord.name}) — zero movement needed!`
  } else if (kind === 'half-step') {
    coachText = `${curChord.name} → ${nextChord.name}: ${fromName} (${from.label}) ${moveWord} ${fretStr} to ${toName} (${to.label} of ${nextChord.name}) — that tiny half-step pull makes the chord change pop!`
  } else {
    coachText = `${curChord.name} → ${nextChord.name}: ${fromName} (${from.label}) ${moveWord} ${fretStr} to ${toName} (${to.label} of ${nextChord.name}) right under your hand.`
  }
  if (sharedNames.length && kind !== 'shared') {
    coachText += ` Shared note${sharedNames.length > 1 ? 's' : ''} in this box: ${sharedNames.join(', ')}.`
  }

  return { from, to, semitones: diff, kind, sharedNames, coachText }
}

/**
 * Mode 1: Build a connected chord-to-chord arpeggio line staying in ONE neck zone with automatic Zone Bounce,
 * zero bar-line stutters, optional Scale/Approach Bridges (Level 2), and Musical Solo Phrases (Level 3).
 */
export function buildChordToChordConnection(opts: {
  chords: string[]
  keyRootPc: number
  keyMinor: boolean
  inst: Instrument
  zoneId: ConnectZoneId
  level: ConnectLevel
  chordSize: ConnectChordSize
}): ChordToChordResult {
  const { chords, keyRootPc, keyMinor, inst, zoneId, level, chordSize } = opts
  const zoneDef = CONNECT_ZONES.find(z => z.id === zoneId) ?? CONNECT_ZONES[1]
  const zone = zoneDef.frets
  const scalePcs = new Set(Scale.get(`${SHARPS[keyRootPc]} ${keyMinor ? 'aeolian' : 'major'}`).notes.map(pc))

  const parsed = chords.map(c => chordInfo(c)).filter((c): c is ChordInfo => !!c)
  if (!parsed.length) return { bars: [], zone, allNotes: [] }

  const pools = parsed.map(info => buildZoneChordPool(info, inst, zone, chordSize))
  const bars: ConnectedBar[] = []
  let dir: 1 | -1 = 1
  let lastNote: ArpNote | null = null

  for (let bi = 0; bi < parsed.length; bi++) {
    const info = parsed[bi]
    const pool = pools[bi]
    if (!pool.length) continue

    // Pick beat-1 starting note:
    // Bar 0 starts near the lowest Root in the box (comfortable home anchor);
    // Every following bar starts on the smooth nearest-note handoff from the previous bar's last chord tone!
    let startIdx = 0
    if (bi === 0 || !lastNote) {
      const rIdx = pool.findIndex(n => n.isRoot)
      startIdx = rIdx >= 0 ? rIdx : 0
    } else {
      const picked = pickNearestHandoff(lastNote, pool, dir)
      const found = pool.findIndex(n => n.midi === picked.midi)
      startIdx = found >= 0 ? found : 0
      // Keep direction moving cleanly, flipping if we landed right at the top or bottom edge
      if (startIdx >= pool.length - 1) dir = -1
      else if (startIdx <= 0) dir = 1
    }

    // Step through chord tones in this bar with automatic Zone Bounce
    const targetCount = level === 3 ? 3 : 4
    const barChordNotes: ArpNote[] = []
    let idx = startIdx
    for (let k = 0; k < targetCount; k++) {
      barChordNotes.push({ ...pool[idx], dur: 1 })
      if (k < targetCount - 1) {
        if (pool.length === 1) continue
        if (idx + dir >= pool.length || idx + dir < 0) {
          dir = (dir * -1) as 1 | -1
        }
        idx = Math.max(0, Math.min(pool.length - 1, idx + dir))
      }
    }

    // Apply Level 3 rhythmic solo phrasing (hold beat 1 target note for 2 beats + 2 flowing pickup notes = 4 beats!)
    let finalNotes: ArpNote[] = barChordNotes
    if (level === 3 && barChordNotes.length >= 3) {
      finalNotes = [
        { ...barChordNotes[0], dur: 2 }, // Hold & breathe on the beat-1 landing chord tone!
        { ...barChordNotes[1], dur: 1 },
        { ...barChordNotes[2], dur: 1 },
      ]
    }

    lastNote = finalNotes[finalNotes.length - 1]
    bars.push({
      barIndex: bi,
      chordName: info.name,
      chord: info,
      zoneTones: pool,
      notes: finalNotes,
      backingMidis: backingMidisFor(info, pool),
      handoffToNext: null,
    })
  }

  // Wire bar-to-bar handoffs AND insert Level 2 smooth passing/approach bridges on the '&' of beat 4!
  for (let i = 0; i < bars.length; i++) {
    const cur = bars[i]
    const nxt = bars[(i + 1) % bars.length]
    if (!cur.notes.length || !nxt.notes.length) continue
    const lastChordTone = cur.notes[cur.notes.length - 1]
    const nextBeat1 = nxt.notes[0]

    cur.handoffToNext = buildHandoffExplanation(cur.chord, nxt.chord, lastChordTone, nextBeat1, nxt.zoneTones)

    if (level === 2) {
      const bridge = findBridgeNote(lastChordTone, nextBeat1, scalePcs, inst, zone)
      if (bridge) {
        // Split beat 4 (1.0) into 0.5 chord tone + 0.5 scale/chromatic bridge leading directly into next bar's beat 1!
        cur.notes[cur.notes.length - 1] = { ...lastChordTone, dur: 0.5 }
        cur.notes.push({ ...bridge, dur: 0.5 })
      }
    }
  }

  const allNotes = bars.flatMap(b => b.notes.map(n => ({ ...n, barIndex: b.barIndex, chordName: b.chordName })))
  return { bars, zone, allNotes }
}

/**
 * Mode 2: Build a Diagonal CAGED Arpeggio Slide line across the whole neck (C → A → G → E → D and back down!)
 * Every shape-to-shape handoff slides cleanly on the SAME string (tech '/' up, '\' down), capped <= fret 17.
 */
export function buildDiagonalArpeggioSlides(opts: {
  rootPc: number
  quality: DiagonalQuality
  inst: Instrument
}): DiagonalResult {
  const { rootPc, quality, inst } = opts
  const suffix = quality === 'min' ? 'm' : quality === 'dom7' ? '7' : ''
  const chordName = `${SHARPS[rootPc]}${suffix}`
  const chord = chordInfo(chordName) ?? {
    name: chordName,
    root: rootPc,
    pcs: [rootPc, (rootPc + (quality === 'min' ? 3 : 4)) % 12, (rootPc + 7) % 12],
    labels: new Map([[rootPc, 'R']]),
    third: (rootPc + (quality === 'min' ? 3 : 4)) % 12,
    seventh: quality === 'dom7' ? (rootPc + 10) % 12 : null,
    triad: [rootPc, (rootPc + (quality === 'min' ? 3 : 4)) % 12, (rootPc + 7) % 12],
  }

  const pcs = chord.pcs
  const shapes = cagedShapes(rootPc, quality === 'min', inst)

  // All chord tones across frets 0..17 for neck visualization
  const neckTones: ArpNote[] = []
  for (let s = 0; s < inst.strings; s++) {
    for (let f = 0; f <= 17; f++) {
      const midi = inst.midis[s] + f
      const p = midi % 12
      if (!pcs.includes(p)) continue
      const label = labelForPc(chord, p)
      neckTones.push({
        string: s,
        fret: f,
        midi,
        pc: p,
        label,
        isRoot: p === rootPc,
        isGuide: isGuideLabel(label),
        dur: 0.5,
      })
    }
  }

  // Helper: find chord tones on a single string within fret bounds
  const onString = (s: number, minF: number, maxF: number) =>
    neckTones.filter(n => n.string === s && n.fret >= minF && n.fret <= maxF).sort((a, b) => a.fret - b.fret)

  // Build an ascending diagonal climb across strings 0 → nStr-1, sliding horizontally up into the next CAGED shape
  // every 1–2 strings so the hand glides diagonally from low frets to frets 12–17!
  const upSteps: DiagonalStep[] = []
  const slideArrows: DiagonalResult['slideArrows'] = []
  const shapePath: string[] = []
  const strNames = inst.tuning.notes.map(n => n.replace(/\d+$/, ''))

  // Anchor at lowest playable root on low strings (0 or 1)
  const startCandidates = neckTones
    .filter(n => n.isRoot && n.string <= Math.min(1, inst.strings - 1) && n.fret <= 8)
    .sort((a, b) => a.fret - b.fret || a.string - b.string)
  const startNote = startCandidates[0] ?? neckTones[0]

  const shapeForFret = (f: number) => {
    let best = shapes[0]
    let bestD = Infinity
    for (const sh of shapes) {
      const mid = (sh.lo + sh.hi) / 2
      const d = Math.abs(f - mid)
      if (d < bestD) { bestD = d; best = sh }
    }
    return best?.letter ?? 'E'
  }

  if (startNote) {
    const startSh = shapeForFret(startNote.fret)
    let cur: ArpNote = { ...startNote, shapeLetter: startSh }
    shapePath.push(startSh)
    upSteps.push({ note: cur, shapeLetter: startSh })

    for (let s = cur.string; s < inst.strings; s++) {
      // 1) If we just stepped onto a new string `s`, pick the next ascending chord tone on this string near cur.fret
      if (s > cur.string) {
        const cands = onString(s, Math.max(0, cur.fret - 2), Math.min(17, cur.fret + 3))
          .filter(n => n.midi > cur.midi)
        const nextOnStr = cands[0]
        if (nextOnStr) {
          const sh = shapeForFret(nextOnStr.fret)
          cur = { ...nextOnStr, shapeLetter: sh }
          if (shapePath[shapePath.length - 1] !== sh) shapePath.push(sh)
          upSteps.push({ note: cur, shapeLetter: sh })
        }
      }

      // 2) On strings where there's a sweet next chord tone 2–5 frets higher on the SAME string (creating the CAGED slide!),
      //    slide diagonally up the neck into the next CAGED shape!
      const slideCands = onString(s, cur.fret + 2, Math.min(17, cur.fret + 5))
        .filter(n => n.midi > cur.midi)
      const slideTarget = slideCands[0]
      if (slideTarget && (s === cur.string || s % 2 === 1 || s === inst.strings - 1)) {
        const fromSh = cur.shapeLetter ?? shapeForFret(cur.fret)
        const toSh = shapeForFret(slideTarget.fret)
        const slidNote: ArpNote = { ...slideTarget, tech: '/', shapeLetter: toSh }
        if (shapePath[shapePath.length - 1] !== toSh) shapePath.push(toSh)
        slideArrows.push({ s1: cur.string, f1: cur.fret, s2: slidNote.string, f2: slidNote.fret, kind: 'guide' })
        upSteps.push({
          note: slidNote,
          shapeLetter: toSh,
          slideFrom: cur,
          callout: `Slide ${strNames[s]} string fret ${cur.fret} → ${slidNote.fret} (${cur.label} → ${slidNote.label}, ${fromSh} → ${toSh} shape)`,
        })
        cur = slidNote
      }
    }
  }

  // Smoothly reverse back down the neck (replacing '/' slides with '\' downward slides!)
  const downSteps: DiagonalStep[] = []
  for (let i = upSteps.length - 2; i >= 0; i--) {
    const prevUp = upSteps[i + 1]
    const target = upSteps[i]
    const sameStringDrop = prevUp.note.string === target.note.string && prevUp.note.fret > target.note.fret
    downSteps.push({
      note: { ...target.note, tech: sameStringDrop ? '\\' : undefined },
      shapeLetter: target.shapeLetter,
      slideFrom: sameStringDrop ? prevUp.note : null,
      callout: sameStringDrop
        ? `Slide back down ${strNames[target.note.string]} string fret ${prevUp.note.fret} → ${target.note.fret}`
        : undefined,
    })
  }

  return {
    chordName,
    chord,
    steps: [...upSteps, ...downSteps],
    neckTones,
    slideArrows,
    shapePath,
  }
}

export function handGroupForConnectBar(bar: ConnectedBar): HandGroup {
  const fretted = bar.zoneTones.filter(n => n.fret > 0)
  const minF = fretted.length ? Math.min(...fretted.map(n => n.fret)) : 1
  const maxF = fretted.length ? Math.max(...fretted.map(n => n.fret)) : 1
  const open = bar.zoneTones.some(n => n.fret === 0) && maxF <= 4
  const base = open ? 1 : Math.max(1, minF)
  return {
    from: 0,
    to: Math.max(1, bar.notes.length),
    base,
    open,
    notes: bar.zoneTones.map(n => ({
      string: n.string,
      fret: n.fret,
      finger: n.fret === 0 ? 0 : Math.min(4, Math.max(1, n.fret - base + 1)),
    })),
  }
}

/** Export Mode 1 (Chord-to-Chord Connected Arpeggios) as a playable 2-lap KGuitar Song with backing band! */
export function buildConnectSong(result: ChordToChordResult, inst: Instrument, bpm: number, level: ConnectLevel, loops = 2): Song {
  const bars: SongBar[] = []
  const chordNames = result.bars.map(b => b.chordName)
  for (let lap = 0; lap < loops; lap++) {
    for (const bar of result.bars) {
      const steps: SongStep[] = bar.notes.map((n, i) => ({
        notes: [{ string: n.string, fret: n.fret, midi: n.midi, tech: n.tech }],
        dur: n.dur,
        chord: i === 0 ? bar.chordName : undefined,
        section: lap === 0 && i === 0 ? `Bar ${bar.barIndex + 1} · ${bar.chordName}` : undefined,
      }))
      bars.push({ steps })
    }
  }
  return {
    title: `Connect Arpeggios (Lv ${level}) · ${chordNames.join(' – ')}`,
    artist: 'CAGED Arpeggio Connector',
    tempo: bpm,
    meter: 4,
    backing: { groove: 'pop', bass: 'root-5' },
    tracks: [
      {
        name: inst.noun[0].toUpperCase() + inst.noun.slice(1),
        tuning: [...inst.midis],
        capo: 0,
        bars,
      },
    ],
  }
}

/** Export Mode 2 (Diagonal CAGED Arpeggio Slides) as a playable KGuitar Song with slides! */
export function buildDiagonalSong(result: DiagonalResult, inst: Instrument, bpm: number): Song {
  const allSteps: SongStep[] = result.steps.map((st, i) => ({
    notes: [{ string: st.note.string, fret: st.note.fret, midi: st.note.midi, tech: st.note.tech }],
    dur: 0.5,
    chord: i === 0 ? result.chordName : undefined,
    section: i === 0 ? `${result.chordName} Diagonal Slides (${result.shapePath.join(' → ')})` : undefined,
  }))
  const bars: SongBar[] = []
  for (let i = 0; i < allSteps.length; i += 8) {
    bars.push({ steps: allSteps.slice(i, i + 8) })
  }
  return {
    title: `Diagonal Arpeggio Slides · ${result.chordName}`,
    artist: `Shapes: ${result.shapePath.join(' → ')}`,
    tempo: bpm,
    meter: 4,
    backing: { groove: 'pop', bass: 'root' },
    tracks: [
      {
        name: inst.noun[0].toUpperCase() + inst.noun.slice(1),
        tuning: [...inst.midis],
        capo: 0,
        bars,
      },
    ],
  }
}

/** Plain-English Coach Guide for both Arpeggio Connector modes & all 3 levels. */
export function explainArpeggioConnect(mode: 'changes' | 'diagonal', level: ConnectLevel, chordSize: ConnectChordSize): ConnectCoachGuide {
  if (mode === 'diagonal') {
    return {
      what: `You're connecting ONE chord's arpeggio diagonally across the entire fretboard — sliding smoothly on a single string from one CAGED shape straight into the next (and back down).`,
      why: `Vertical box arpeggios can make you feel trapped in 4 frets. Sliding horizontally on one string (R → 3, 3 → 5, or 5 → R) lets your solos soar across 2+ octaves like David Gilmour, Slash, or Eric Johnson.`,
      how: `Play 1–2 notes in a CAGED shape, then follow the gold arrow and slide cleanly along that SAME string into the next CAGED shape. Listen to the slide ring cleanly without lifting your finger off the fretboard!`,
      avoid: `Don't jump blindly between shapes — keep your eyes locked on the target fret BEFORE you slide so your finger lands dead-on in tune.`,
    }
  }
  const tonesText = chordSize === '7th' ? '4-note 7th arpeggios (R–3–5–7)' : '3-note triad arpeggios (R–3–5)'
  if (level === 1) {
    return {
      what: `You're playing "The Connecting Game" with ${tonesText} inside ONE 5-fret neck zone while the chords change underneath.`,
      why: `This is the #1 technique that makes a listener HEAR the chord progression inside your guitar solo — even if the backing band drops out!`,
      how: `Keep walking smoothly up (or down) through Chord 1's tones. The instant Chord 2 arrives on beat 1, follow the curved arrow to the CLOSEST chord tone of Chord 2 right under your hand — then keep flowing (bouncing back when you reach the top/bottom of your zone).`,
      avoid: `Never jump back down to the lowest Root note when the chord changes! Starting on a 3rd, 5th, or 7th right next to your last note is what creates magic voice leading.`,
    }
  }
  if (level === 2) {
    return {
      what: `You're adding a 1-note Scale or Half-Step Bridge (glowing in cyan) on the "& of beat 4" right before each chord change.`,
      why: `Pure arpeggios train your eyes; adding a single stepping-stone note right before beat 1 turns a drill into a smooth, singing lead-guitar melody!`,
      how: `Play the chord tones on beats 1–4, then use the cyan bridge note as a tiny springboard that resolves directly onto beat 1 of the next chord.`,
      avoid: `Don't pause or hesitate on the cyan bridge note — lean right through it so your ear feels the tension resolve on beat 1!`,
    }
  }
  return {
    what: `You're playing Real Solo Phrases — landing on the nearest chord tone on beat 1 and HOLDING it for 2 beats so the melody breathes before walking into the next chord.`,
    why: `The #1 reason beginner arpeggio solos sound like exercises is non-stop notes with zero space. Holding the beat-1 target note lets the listener savour how sweetly it melts into the new chord!`,
    how: `Hit beat 1 cleanly (let it ring & add a touch of vibrato!), pause for beat 2, then play the 2 pickup notes on beats 3 & 4 to lead smoothly into the next chord's beat 1.`,
    avoid: `Don't rush through beat 2! Leaving space is half of great phrasing (just ask B.B. King and David Gilmour).`,
  }
}

export function formatArpNote(n: ArpNote): string {
  const slide = n.tech ? `${n.tech} ` : ''
  return `${slide}${SHARPS[n.pc]}(${n.fret})`
}
