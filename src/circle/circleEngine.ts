// Pro Circle of Fifths Theory, Voice-Leading Analyzer, Harmonic Explainer, Original Etude Generator,
// and 12-Key Mastery Tracking. 100% pure & unit-testable.
import { FLATS, SHARPS, keyPrefersFlats, pc } from '../theory/notes'
import { noteAt } from '../theory/spell'
import type { Song, SongBar, SongNote, SongStep } from '../tabs/model'

export const STANDARD_MIDI = [40, 45, 50, 55, 59, 64] // E2 A2 D3 G3 B3 E4
export const CIRCLE_FOURTHS = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'B', 'E', 'A', 'D', 'G']

export type CircleChordQual = 'maj' | 'min' | 'maj7' | 'm7' | '7' | 'm7b5' | 'dim' | 'add9' | 'm9'

export interface CircleChord {
  /** display symbol e.g. 'Em7', 'Am9', 'B7', 'F#m7b5' */
  symbol: string
  /** root note name e.g. 'E', 'F#', 'Bb' */
  root: string
  rootPc: number
  minor: boolean
  dim?: boolean
  qual: CircleChordQual
  /** chord tone pitch classes [root, 3rd, 5th, 7th?, 9th?] */
  pcs: number[]
  /** 3rd pitch class (guide tone A) */
  thirdPc: number
  /** 7th pitch class if 7th/9th chord, else 5th */
  seventhPc: number | null
  /** roman numeral in current key (optional) */
  roman?: string
  /** outside-the-diatonic-slice harmonic role tag */
  outsideTag?: string
}

export interface CirclePathPreset {
  id: string
  name: string
  vibe: string
  minorKey: boolean
  /** relative semitone offsets + qualities from the tonic */
  steps: { degSemi: number; qual: CircleChordQual; roman: string; outsideTag?: string }[]
}

export const CIRCLE_PATHS: CirclePathPreset[] = [
  {
    id: 'minor-gravity',
    name: 'Minor Circle of 4ths (Autumn Gravity)',
    vibe: 'Lush, flowing counter-clockwise cascade ending on Harmonic Minor V7 → i',
    minorKey: true,
    steps: [
      { degSemi: 0, qual: 'm9', roman: 'i9' },
      { degSemi: 5, qual: 'm7', roman: 'iv7' },
      { degSemi: 10, qual: '7', roman: 'VII7' },
      { degSemi: 3, qual: 'maj7', roman: 'IIImaj7' },
      { degSemi: 8, qual: 'maj7', roman: 'VImaj7' },
      { degSemi: 2, qual: 'm7b5', roman: 'iiø7' },
      { degSemi: 7, qual: '7', roman: 'V7', outsideTag: 'Harmonic Minor V7' },
      { degSemi: 0, qual: 'm9', roman: 'i9' },
    ],
  },
  {
    id: 'major-cascade',
    name: 'Major Diatonic Circle of 4ths',
    vibe: 'All 7 diatonic 7th chords falling smoothly in 4ths back to home',
    minorKey: false,
    steps: [
      { degSemi: 0, qual: 'maj7', roman: 'Imaj7' },
      { degSemi: 5, qual: 'maj7', roman: 'IVmaj7' },
      { degSemi: 11, qual: 'm7b5', roman: 'viiø7' },
      { degSemi: 4, qual: 'm7', roman: 'iii7' },
      { degSemi: 9, qual: 'm7', roman: 'vi7' },
      { degSemi: 2, qual: 'm7', roman: 'ii7' },
      { degSemi: 7, qual: '7', roman: 'V7' },
      { degSemi: 0, qual: 'maj7', roman: 'Imaj7' },
    ],
  },
  {
    id: 'peaceful-open',
    name: 'Peaceful Open Flow (I → vi → ii → V)',
    vibe: 'Warm cinematic add9 / maj7 voicings with 1-finger anchor shifts',
    minorKey: false,
    steps: [
      { degSemi: 0, qual: 'add9', roman: 'Iadd9' },
      { degSemi: 9, qual: 'm9', roman: 'vi9' },
      { degSemi: 2, qual: 'm7', roman: 'ii7' },
      { degSemi: 7, qual: '7', roman: 'V7' },
    ],
  },
  {
    id: 'secdom-chain',
    name: 'Secondary Dominant Spark (I → VI7 → II7 → V7)',
    vibe: 'Steps outside the slice with chained dominant 7ths pulling around the wheel',
    minorKey: false,
    steps: [
      { degSemi: 0, qual: 'maj7', roman: 'Imaj7' },
      { degSemi: 9, qual: '7', roman: 'V7/ii', outsideTag: 'Secondary Dominant' },
      { degSemi: 2, qual: '7', roman: 'V7/V', outsideTag: 'Secondary Dominant' },
      { degSemi: 7, qual: '7', roman: 'V7' },
    ],
  },
  {
    id: 'tritone-glide',
    name: 'Tritone Sub Chromatic Glide (ii → bII7 → I)',
    vibe: 'Jumps straight across the Circle for silky half-step bass voice leading',
    minorKey: false,
    steps: [
      { degSemi: 9, qual: 'm7', roman: 'vi7' },
      { degSemi: 2, qual: 'm7', roman: 'ii7' },
      { degSemi: 1, qual: '7', roman: 'bII7', outsideTag: 'Tritone Sub of V7' },
      { degSemi: 0, qual: 'maj7', roman: 'Imaj7' },
    ],
  },
  {
    id: 'borrowed-cinema',
    name: 'Cinematic Borrowed Colour (I → V/vi → vi → iv)',
    vibe: 'Pairs a bright secondary dominant with the bittersweet parallel minor iv',
    minorKey: false,
    steps: [
      { degSemi: 0, qual: 'maj7', roman: 'Imaj7' },
      { degSemi: 4, qual: '7', roman: 'V7/vi', outsideTag: 'Secondary Dominant' },
      { degSemi: 9, qual: 'm9', roman: 'vi9' },
      { degSemi: 5, qual: 'm7', roman: 'iv7', outsideTag: 'Borrowed Minor iv' },
    ],
  },
]

const QUAL_INTERVALS: Record<CircleChordQual, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  '7': [0, 4, 7, 10],
  m7b5: [0, 3, 6, 10],
  dim: [0, 3, 6],
  add9: [0, 4, 7, 2],
  m9: [0, 3, 7, 10, 2],
}

const QUAL_SUFFIX: Record<CircleChordQual, string> = {
  maj: '',
  min: 'm',
  maj7: 'maj7',
  m7: 'm7',
  '7': '7',
  m7b5: 'm7b5',
  dim: 'dim',
  add9: 'add9',
  m9: 'm9',
}

export function buildCircleChord(rootPc: number, qual: CircleChordQual, preferFlats = false, roman?: string, outsideTag?: string): CircleChord {
  const p = ((rootPc % 12) + 12) % 12
  const root = (preferFlats ? FLATS : SHARPS)[p]
  const ivs = QUAL_INTERVALS[qual]
  const pcs = ivs.map(i => (p + i) % 12)
  const minor = qual === 'min' || qual === 'm7' || qual === 'm7b5' || qual === 'm9'
  const dim = qual === 'dim' || qual === 'm7b5'
  const thirdPc = (p + (minor || dim ? 3 : 4)) % 12
  const seventhIv = ivs.find(i => i === 10 || i === 11)
  const seventhPc = seventhIv !== undefined ? (p + seventhIv) % 12 : null
  return {
    symbol: root + QUAL_SUFFIX[qual],
    root,
    rootPc: p,
    minor,
    dim,
    qual,
    pcs,
    thirdPc,
    seventhPc,
    roman,
    outsideTag,
  }
}

export function parseChordToCircle(sym: string, preferFlats = false): CircleChord | null {
  const m = sym.trim().match(/^([A-G][#b]?)(.*)$/)
  if (!m) return null
  const root = m[1]
  const rest = m[2].trim()
  let qual: CircleChordQual = 'maj'
  if (/m7b5|ø|half/i.test(rest)) qual = 'm7b5'
  else if (/dim|°/i.test(rest)) qual = 'dim'
  else if (/m9/i.test(rest)) qual = 'm9'
  else if (/maj7|M7|Δ/.test(rest)) qual = 'maj7'
  else if (/add9/i.test(rest)) qual = 'add9'
  else if (/^m7|^min7|^-7/i.test(rest)) qual = 'm7'
  else if (/^m(?!aj)|^min|^-/i.test(rest)) qual = 'min'
  else if (/7|9|11|13/.test(rest)) qual = '7'
  return buildCircleChord(pc(root), qual, preferFlats || root.includes('b'))
}

/** Instantiate any CirclePathPreset in any of the 12 keys. */
export function instantiatePath(presetId: string, tonic: string): CircleChord[] {
  const p = CIRCLE_PATHS.find(x => x.id === presetId) ?? CIRCLE_PATHS[0]
  const tPc = pc(tonic)
  const flats = keyPrefersFlats(tonic, p.minorKey)
  return p.steps.map(s => buildCircleChord(tPc + s.degSemi, s.qual, flats, s.roman, s.outsideTag))
}

// ---------- Voice Leading & Guide-Tone Analysis ----------

export interface VoiceMove {
  fromPc: number
  toPc: number
  fromName: string
  toName: string
  semitones: number // -2..+2
  role: 'anchor' | 'guide-drop' | 'step'
}

export interface VoiceLeadSummary {
  /** pitch classes shared between prev and cur (fingers that can stay glued!) */
  anchors: number[]
  /** pitch classes new in cur */
  moving: number[]
  /** detailed smooth voice moves (including 7th -> 3rd 1-fret drops!) */
  moves: VoiceMove[]
  /** plain-English takeaway for the player */
  headline: string
}

// chord tones spelled from the chord's root letter (Cm: E♭ and B♭, never D♯ and A♯); other notes by the key's preference
const STEP_OF = [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6]
export function spellInChord(ch: CircleChord, p: number): string {
  const iv = ((p - ch.rootPc) % 12 + 12) % 12
  try { return noteAt(ch.root, STEP_OF[iv], iv) } catch { return (ch.root.includes('b') ? FLATS : SHARPS)[p] }
}

export function analyzeVoiceLeading(prev: CircleChord | null, cur: CircleChord, flats = false): VoiceLeadSummary {
  const plain = flats ? FLATS : SHARPS
  // a note is named the way the chord it belongs to spells it (the new chord first)
  const names = new Proxy([] as string[], { get: (_t, k) => {
    const p = Number(k)
    if (!Number.isInteger(p)) return undefined
    if (cur.pcs.includes(p)) return spellInChord(cur, p)
    if (prev?.pcs.includes(p)) return spellInChord(prev, p)
    return plain[p]
  } })
  if (!prev) {
    return {
      anchors: [],
      moving: cur.pcs,
      moves: [],
      headline: `Home base on ${cur.symbol}: lock in the 3rd (${names[cur.thirdPc]})${cur.seventhPc !== null ? ` and 7th (${names[cur.seventhPc]})` : ''}.`,
    }
  }
  const anchors = cur.pcs.filter(p => prev.pcs.includes(p))
  const moving = cur.pcs.filter(p => !prev.pcs.includes(p))
  const moves: VoiceMove[] = []

  // Anchors first
  for (const a of anchors) {
    moves.push({ fromPc: a, toPc: a, fromName: names[a], toName: names[a], semitones: 0, role: 'anchor' })
  }

  // Check classic 7th -> 3rd half-step/whole-step guide-tone resolution!
  let guideText = ''
  if (prev.seventhPc !== null) {
    const diff = ((cur.thirdPc - prev.seventhPc + 18) % 12) - 6 // -6..+5
    if (diff === -1 || diff === -2) {
      moves.push({
        fromPc: prev.seventhPc,
        toPc: cur.thirdPc,
        fromName: names[prev.seventhPc],
        toName: names[cur.thirdPc],
        semitones: diff,
        role: 'guide-drop',
      })
      guideText = `Guide-tone drop: ${names[prev.seventhPc]} → ${names[cur.thirdPc]} (${Math.abs(diff)} fret${Math.abs(diff) === 1 ? '' : 's'} down)`
    }
  }

  // Remaining moving notes matched to closest previous chord tone
  for (const m of moving) {
    if (moves.some(x => x.toPc === m)) continue
    let bestFrom = prev.pcs[0]
    let bestDiff = 6
    for (const fp of prev.pcs) {
      const d = ((m - fp + 18) % 12) - 6
      if (Math.abs(d) < Math.abs(bestDiff)) { bestDiff = d; bestFrom = fp }
    }
    if (Math.abs(bestDiff) <= 2) {
      moves.push({
        fromPc: bestFrom,
        toPc: m,
        fromName: names[bestFrom],
        toName: names[m],
        semitones: bestDiff,
        role: 'step',
      })
    }
  }

  const anchorStr = anchors.length ? `Keep ${anchors.slice(0, 2).map(a => names[a]).join(' & ')} held` : 'Fresh colour shift'
  const headline = guideText ? `${guideText} · ${anchorStr}` : `${anchorStr} into ${cur.symbol}`
  return { anchors, moving, moves, headline }
}

// ---------- Plain-English Harmonic GPS Caption (for Floating Circle Card & Masterclass) ----------

export interface CircleExplanation {
  badge: string
  outside: boolean
  text: string
}

export function explainCircleChord(
  chordSym: string,
  prevSym: string | undefined,
  keyRoot: string,
  keyMinor: boolean,
): CircleExplanation {
  const flats = keyPrefersFlats(keyRoot, keyMinor)
  const cur = parseChordToCircle(chordSym, flats)
  if (!cur) return { badge: '', outside: false, text: 'Tap any chord on the wheel to hear it.' }
  const prev = prevSym ? parseChordToCircle(prevSym, flats) : null
  const kPc = pc(keyRoot)
  const iv = (cur.rootPc - kPc + 12) % 12

  // Check if moving counter-clockwise by a 4th (+5 semitones) or tritone (+6 / -1)
  const stepSemi = prev ? (cur.rootPc - prev.rootPc + 12) % 12 : -1
  const motionNote =
    stepSemi === 5 ? ' (1 click counter-clockwise — pure Circle-of-4ths gravity!)' :
    stepSemi === 7 ? ' (1 click clockwise — bright, lifting tension)' :
    stepSemi === 11 ? ' (half-step drop — silky chromatic / tritone glide)' :
    ''

  // Major key degree map
  if (!keyMinor) {
    if (iv === 0 && !cur.minor) return { badge: 'I · Home', outside: false, text: `${cur.symbol} is Home (I) — full rest and resolution${motionNote}.` }
    if (iv === 2 && cur.minor) return { badge: 'ii · Setup', outside: false, text: `${cur.symbol} (ii) sets up the V chord — classic Circle-of-4ths launchpad${motionNote}.` }
    if (iv === 4 && cur.minor) return { badge: 'iii · Soft', outside: false, text: `${cur.symbol} (iii) shares two notes with Home — floats peacefully toward vi${motionNote}.` }
    if (iv === 5 && !cur.minor) return { badge: 'IV · Warm', outside: false, text: `${cur.symbol} (IV) sits one click left of Home — open, warm lift${motionNote}.` }
    if (iv === 7 && !cur.minor) return { badge: 'V · Pull Home', outside: false, text: `${cur.symbol} (V) sits one click right of Home — strongest pull back to ${keyRoot}${motionNote}.` }
    if (iv === 9 && cur.minor) return { badge: 'vi · Relative', outside: false, text: `${cur.symbol} (vi) is the relative minor — heartfelt shift right inside the slice${motionNote}.` }
    if (iv === 11 && cur.dim) return { badge: 'vii° · Tension', outside: false, text: `${cur.symbol} (vii°) acts like a rootless V7 pulling directly into ${keyRoot}.` }
    // Outside-the-slice colours in Major!
    if (iv === 5 && cur.minor) return { badge: 'iv · Borrowed', outside: true, text: `${cur.symbol} steps outside (parallel minor iv) — bittersweet cinematic pull back to ${keyRoot}.` }
    if (iv === 1 && !cur.minor) return { badge: '♭II7 · Tritone Sub', outside: true, text: `${cur.symbol} jumps across the Circle (Tritone Sub) — glides down 1 fret into ${keyRoot}!` }
    if (iv === 10 && !cur.minor) return { badge: '♭VII · Borrowed', outside: true, text: `${cur.symbol} borrows from Mixolydian — bold rock/folk lift from one click left of IV.` }
    if (iv === 8 && !cur.minor) return { badge: '♭VI · Epic', outside: true, text: `${cur.symbol} borrows from parallel minor — huge dramatic colour outside the slice.` }
    if (!cur.minor) {
      const targetRoot = (flats ? FLATS : SHARPS)[(cur.rootPc + 5) % 12]
      return { badge: 'V7/x · Outside Spark', outside: true, text: `${cur.symbol} steps outside as a Secondary Dominant — pulls strongly 1 click counter-clockwise into ${targetRoot}!` }
    }
  } else {
    // Minor key degree map
    if (iv === 0 && cur.minor) return { badge: 'i · Home', outside: false, text: `${cur.symbol} is Home (i) — minor gravity centre${motionNote}.` }
    if (iv === 2 && cur.dim) return { badge: 'iiø · Turnaround', outside: false, text: `${cur.symbol} (iiø) starts the road back home into V7 → ${keyRoot}m${motionNote}.` }
    if (iv === 3 && !cur.minor) return { badge: 'III · Relative Maj', outside: false, text: `${cur.symbol} (III) is the bright relative major breath inside ${keyRoot}m${motionNote}.` }
    if (iv === 5 && cur.minor) return { badge: 'iv · Deep', outside: false, text: `${cur.symbol} (iv) sits 1 click left of Home — launches the classic minor Circle of 4ths${motionNote}.` }
    if (iv === 7 && cur.minor) return { badge: 'v · Natural', outside: false, text: `${cur.symbol} (v) stays soft inside Natural Minor${motionNote}.` }
    if (iv === 7 && !cur.minor) return { badge: 'V7 · Harmonic Minor', outside: true, text: `${cur.symbol} steps outside into Harmonic Minor (raised 7th) — dramatic pull straight home to ${keyRoot}m!` }
    if (iv === 8 && !cur.minor) return { badge: 'VI · Lift', outside: false, text: `${cur.symbol} (VI) opens wide and leads smoothly into iiø → V7${motionNote}.` }
    if (iv === 10 && !cur.minor) return { badge: 'VII · Push', outside: false, text: `${cur.symbol} (VII) acts as V of the relative major (III), pushing the wheel counter-clockwise${motionNote}.` }
  }

  return {
    badge: 'Outside Colour',
    outside: true,
    text: `${cur.symbol} steps outside ${keyRoot}${keyMinor ? 'm' : ''} for fresh colour${motionNote}.`,
  }
}

// ---------- Guitar Fretboard Voicing & Original Circle Etude Generator ----------

export type EtudeTexture = 'peaceful' | 'arpeggio' | 'twister' | 'triads'
export type EtudeLevel = 'starter' | 'intermediate' | 'pro'
export type EtudeZone = 'open' | 'mid' | 'high'
export type EtudePicking = 'finger' | 'pick'

export interface EtudeOptions {
  tonic: string
  pathId: string
  /** optional custom chord symbols from Tap-a-Path (overrides pathId when >= 2 chords) */
  customChords?: string[]
  texture: EtudeTexture
  level: EtudeLevel
  zone: EtudeZone
  picking: EtudePicking
  bpm?: number
  tuning?: number[]
}

/** Find a clean 3- or 4-note guitar grip for a chord inside `[minFret, maxFret]` with smooth voice-leading from `prevCenter`. */
export function buildVoiceLedGrip(
  chord: CircleChord,
  zone: EtudeZone,
  prevFrets?: number[] | null,
  tuning = STANDARD_MIDI,
): { string: number; fret: number; midi: number; degree: string }[] {
  const [minF, maxF] = zone === 'open' ? [0, 5] : zone === 'mid' ? [4, 9] : [7, 13]
  const targetCenter = prevFrets && prevFrets.length
    ? prevFrets.reduce((a, b) => a + b, 0) / prevFrets.length
    : (minF + maxF) / 2

  // 1. Pick bass root on string 0 (E) or string 1 (A) or string 2 (D)
  let bassS = 0
  let bassF = 0
  let bestBassScore = 999
  for (const s of [0, 1, 2]) {
    for (let f = minF; f <= maxF; f++) {
      if ((tuning[s] + f) % 12 === chord.rootPc) {
        const score = Math.abs(f - targetCenter) + (s === 2 ? 1.2 : 0) + (f === 0 && zone === 'open' ? -1.5 : 0)
        if (score < bestBassScore) { bestBassScore = score; bassS = s; bassF = f }
      }
    }
  }
  // Fallback if root wasn't in strict window
  if (bestBassScore >= 999) {
    bassS = 1
    bassF = ((chord.rootPc - tuning[1] % 12) + 12) % 12
    if (bassF > 11) bassF -= 12
  }

  // Window tightly around bassF (within max 4-fret span for comfortable hand!)
  const handLo = Math.max(0, Math.min(bassF, Math.round(targetCenter) - 2))
  const handHi = Math.min(15, handLo + 4)

  // Required upper chord tones: 3rd, 7th (or 5th), 9th/5th
  const wantedPcs: { p: number; deg: string }[] = [
    { p: chord.thirdPc, deg: chord.minor ? 'b3' : '3' },
  ]
  if (chord.seventhPc !== null) {
    wantedPcs.push({ p: chord.seventhPc, deg: chord.qual === 'maj7' ? '7' : 'b7' })
  }
  const fifthPc = (chord.rootPc + (chord.dim ? 6 : 7)) % 12
  wantedPcs.push({ p: fifthPc, deg: chord.dim ? 'b5' : '5' })
  if (chord.qual === 'add9' || chord.qual === 'm9') {
    wantedPcs.push({ p: (chord.rootPc + 2) % 12, deg: '9' })
  }

  const upperStrings = [2, 3, 4, 5].filter(s => s > bassS)
  const picked: { string: number; fret: number; midi: number; degree: string }[] = [
    { string: bassS, fret: bassF, midi: tuning[bassS] + bassF, degree: 'R' },
  ]
  const usedPcs = new Set<number>([chord.rootPc])

  for (const s of upperStrings) {
    let best: { fret: number; deg: string; p: number; score: number } | null = null
    for (let f = handLo; f <= handHi; f++) {
      // Allow open strings in open zone!
      const p = (tuning[s] + f) % 12
      const w = wantedPcs.find(x => x.p === p)
      if (!w) continue
      const already = usedPcs.has(p) ? 4 : 0
      const dist = Math.abs(f - targetCenter)
      const guideBonus = (p === chord.thirdPc || p === chord.seventhPc) ? -2 : 0
      const score = already + dist + guideBonus
      if (!best || score < best.score) best = { fret: f, deg: w.deg, p, score }
    }
    // Check open string in 'open' zone too
    if (zone === 'open') {
      const p0 = tuning[s] % 12
      const w0 = wantedPcs.find(x => x.p === p0)
      if (w0 && (!best || (usedPcs.has(p0) ? 4 : -1.5) < best.score)) {
        best = { fret: 0, deg: w0.deg, p: p0, score: -1.5 }
      }
    }
    if (best) {
      usedPcs.add(best.p)
      picked.push({ string: s, fret: best.fret, midi: tuning[s] + best.fret, degree: best.deg })
    }
  }

  // Ensure at least 3 notes
  if (picked.length < 3) {
    for (const s of upperStrings) {
      if (picked.some(x => x.string === s)) continue
      for (let f = Math.max(0, bassF - 2); f <= Math.min(15, bassF + 3); f++) {
        const p = (tuning[s] + f) % 12
        if (chord.pcs.includes(p)) {
          picked.push({ string: s, fret: f, midi: tuning[s] + f, degree: p === chord.thirdPc ? '3' : '5' })
          break
        }
      }
      if (picked.length >= 4) break
    }
  }

  return picked.sort((a, b) => a.string - b.string)
}

/** Build tight top-3-string (G-B-e) voice-led triad grip inside the zone. */
export function buildTopTriadGrip(
  chord: CircleChord,
  zone: EtudeZone,
  prevCenter?: number,
  tuning = STANDARD_MIDI,
): { string: number; fret: number; midi: number; degree: string }[] {
  const [minF, maxF] = zone === 'open' ? [0, 5] : zone === 'mid' ? [4, 9] : [7, 13]
  const center = prevCenter ?? (minF + maxF) / 2
  const triadPcs = [chord.rootPc, chord.thirdPc, (chord.rootPc + (chord.dim ? 6 : 7)) % 12]
  const degLabels = ['R', chord.minor ? 'b3' : '3', chord.dim ? 'b5' : '5']
  const strings = [3, 4, 5] // G, B, e

  // Try all 3 inversions (which string gets root, 3rd, 5th) and pick the tightest & closest to prevCenter!
  const perms: [number, number, number][] = [[0, 1, 2], [1, 2, 0], [2, 0, 1]]
  let bestGrip: { string: number; fret: number; midi: number; degree: string }[] = []
  let bestScore = 999

  for (const perm of perms) {
    const cand: { string: number; fret: number; midi: number; degree: string }[] = []
    for (let i = 0; i < 3; i++) {
      const s = strings[i]
      const targetPc = triadPcs[perm[i]]
      let bestF = 0
      let bestDist = 99
      for (let f = 0; f <= 15; f++) {
        if ((tuning[s] + f) % 12 === targetPc) {
          const d = Math.abs(f - center)
          if (d < bestDist) { bestDist = d; bestF = f }
        }
      }
      cand.push({ string: s, fret: bestF, midi: tuning[s] + bestF, degree: degLabels[perm[i]] })
    }
    const frets = cand.map(x => x.fret)
    const span = Math.max(...frets) - Math.min(...frets)
    const avg = frets.reduce((a, b) => a + b, 0) / 3
    const score = span * 2.2 + Math.abs(avg - center)
    if (score < bestScore) { bestScore = score; bestGrip = cand }
  }
  return bestGrip
}

/** Build a playable 2-note Guide-Tone Shell (Root on E/A + 3rd & 7th on D/G strings) for the 1-Fret Drop Drill! */
export function buildGuideToneShell(
  chord: CircleChord,
  zone: EtudeZone = 'mid',
  prevShellCenter?: number,
  tuning = STANDARD_MIDI,
): { string: number; fret: number; midi: number; degree: 'R' | '3' | '7' }[] {
  const center = prevShellCenter ?? (zone === 'open' ? 3 : zone === 'mid' ? 6 : 9)
  const thirdPc = chord.thirdPc
  const seventhPc = chord.seventhPc ?? (chord.rootPc + 7) % 12

  // Two classic shell layouts on strings D(2) & G(3): [3 on D, 7 on G] or [7 on D, 3 on G]
  const pickFret = (s: number, targetPc: number) => {
    let bestF = 0, bestD = 99
    for (let f = 0; f <= 14; f++) {
      if ((tuning[s] + f) % 12 === targetPc && Math.abs(f - center) < bestD) { bestD = Math.abs(f - center); bestF = f }
    }
    return bestF
  }
  const fD3 = pickFret(2, thirdPc), fG7 = pickFret(3, seventhPc)
  const fD7 = pickFret(2, seventhPc), fG3 = pickFret(3, thirdPc)
  const spanA = Math.abs(fD3 - fG7) + Math.abs((fD3 + fG7) / 2 - center)
  const spanB = Math.abs(fD7 - fG3) + Math.abs((fD7 + fG3) / 2 - center)

  const upper: { string: number; fret: number; midi: number; degree: 'R' | '3' | '7' }[] =
    spanA <= spanB
      ? [
          { string: 2, fret: fD3, midi: tuning[2] + fD3, degree: '3' },
          { string: 3, fret: fG7, midi: tuning[3] + fG7, degree: '7' },
        ]
      : [
          { string: 2, fret: fD7, midi: tuning[2] + fD7, degree: '7' },
          { string: 3, fret: fG3, midi: tuning[3] + fG3, degree: '3' },
        ]

  // Closest root on E(0) or A(1)
  const uAvg = (upper[0].fret + upper[1].fret) / 2
  const r0 = pickFret(0, chord.rootPc)
  const r1 = pickFret(1, chord.rootPc)
  const rootNote = Math.abs(r0 - uAvg) <= Math.abs(r1 - uAvg)
    ? { string: 0, fret: r0, midi: tuning[0] + r0, degree: 'R' as const }
    : { string: 1, fret: r1, midi: tuning[1] + r1, degree: 'R' as const }

  return [rootNote, ...upper]
}

/** Generate a complete, playable original Guitar Etude Song along a Circle of Fifths path! */
export function generateCircleEtude(opts: EtudeOptions): { song: Song; chords: CircleChord[] } {
  const tuning = opts.tuning ?? STANDARD_MIDI
  const flats = keyPrefersFlats(opts.tonic, CIRCLE_PATHS.find(p => p.id === opts.pathId)?.minorKey ?? false)
  const chords: CircleChord[] =
    opts.customChords && opts.customChords.length >= 2
      ? opts.customChords.map(s => parseChordToCircle(s, flats)).filter((x): x is CircleChord => !!x)
      : instantiatePath(opts.pathId, opts.tonic)

  const bars: SongBar[] = []
  let prevFrets: number[] | null = null
  let prevCenter: number | undefined

  const note = (n: { string: number; fret: number; midi: number }, tech?: string): SongNote => ({
    string: n.string,
    fret: n.fret,
    midi: n.midi,
    ...(tech ? { tech } : {}),
  })

  for (const ch of chords) {
    const grip: { string: number; fret: number; midi: number; degree: string }[] = opts.texture === 'triads'
      ? buildTopTriadGrip(ch, opts.zone, prevCenter, tuning)
      : buildVoiceLedGrip(ch, opts.zone, prevFrets, tuning)
    const nextFrets = grip.map(g => g.fret)
    prevFrets = nextFrets
    prevCenter = nextFrets.reduce((a, b) => a + b, 0) / Math.max(1, nextFrets.length)

    // Ensure at least 4 addressable positions in grip for arpeggio patterns
    const g = (i: number) => grip[Math.min(i, grip.length - 1)]
    const steps: SongStep[] = []

    if (opts.texture === 'peaceful') {
      if (opts.level === 'starter') {
        // Gentle quarter-note peaceful bloom: pinch/strum beat 1, then roll upper voices
        if (opts.picking === 'finger') {
          steps.push({ chord: ch.symbol, dur: 1, notes: [note(g(0)), note(g(2))] })
          steps.push({ dur: 1, notes: [note(g(1))] })
          steps.push({ dur: 1, notes: [note(g(3))] })
          steps.push({ dur: 1, notes: [note(g(2))] })
        } else {
          steps.push({ chord: ch.symbol, dur: 1, stroke: 'down', notes: [note(g(0))] })
          steps.push({ dur: 1, stroke: 'down', notes: [note(g(1))] })
          steps.push({ dur: 1, stroke: 'down', notes: [note(g(2))] })
          steps.push({ dur: 1, stroke: 'up', notes: [note(g(3))] })
        }
      } else {
        // 8th-note lush peaceful fingerstyle/pick wave (1 & 2 & 3 & 4 &)
        const pat = opts.picking === 'finger'
          ? [[0, 3], [1], [2], [3], [1], [2], [3], [2]]
          : [[0], [1], [2], [3], [2], [1], [3], [2]]
        pat.forEach((idxs, si) => {
          steps.push({
            ...(si === 0 ? { chord: ch.symbol } : {}),
            dur: 0.5,
            stroke: opts.picking === 'pick' ? (si % 2 === 0 ? 'down' : 'up') : undefined,
            notes: idxs.map(ix => note(g(ix))),
          })
        })
      }
    } else if (opts.texture === 'arpeggio') {
      // Flowing one-box Circle of Arpeggios: up and down through chord tones (with 9th/octave colour on pro)
      const seq = opts.level === 'starter'
        ? [0, 1, 2, 3]
        : opts.level === 'intermediate'
          ? [0, 1, 2, 3, 2, 1, 2, 3]
          : [0, 2, 1, 3, 2, 3, 1, 2]
      const dur = opts.level === 'starter' ? 1 : 0.5
      seq.forEach((ix, si) => {
        steps.push({
          ...(si === 0 ? { chord: ch.symbol } : {}),
          dur,
          stroke: opts.picking === 'pick' ? (si % 2 === 0 ? 'down' : 'up') : undefined,
          notes: [note(g(ix))],
        })
      })
    } else if (opts.texture === 'twister') {
      // Wide-interval melodic string-skipping ("Twister" style): alternates low-high-mid-high leaps!
      const seq = opts.level === 'starter'
        ? [0, 2, 1, 3]
        : opts.level === 'intermediate'
          ? [0, 3, 1, 2, 0, 3, 2, 1]
          : [0, 3, 2, 0, 3, 1, 3, 2]
      const dur = opts.level === 'starter' ? 1 : 0.5
      seq.forEach((ix, si) => {
        steps.push({
          ...(si === 0 ? { chord: ch.symbol } : {}),
          dur,
          stroke: opts.picking === 'pick' ? (si % 2 === 0 ? 'down' : 'up') : undefined,
          notes: [note(g(ix))],
        })
      })
    } else {
      // Voice-Led Triads (top 3 strings G-B-e): crisp strum + melodic arpeggio
      if (opts.level === 'starter') {
        steps.push({ chord: ch.symbol, dur: 2, stroke: 'down', notes: grip.map(x => note(x)) })
        steps.push({ dur: 2, stroke: 'down', notes: grip.map(x => note(x)) })
      } else {
        steps.push({ chord: ch.symbol, dur: 1, stroke: 'down', notes: grip.map(x => note(x)) })
        steps.push({ dur: 0.5, notes: [note(g(0))] })
        steps.push({ dur: 0.5, notes: [note(g(1))] })
        steps.push({ dur: 0.5, notes: [note(g(2))] })
        steps.push({ dur: 0.5, notes: [note(g(1))] })
        steps.push({ dur: 1, stroke: 'up', notes: grip.map(x => note(x)) })
      }
    }

    bars.push({ steps })
  }

  const presetName = opts.customChords?.length
    ? 'Custom Circle Path'
    : (CIRCLE_PATHS.find(p => p.id === opts.pathId)?.name.split('(')[0].trim() ?? 'Circle Flow')
  const texName: Record<EtudeTexture, string> = {
    peaceful: 'Peaceful Voicings',
    arpeggio: 'Circle of Arpeggios',
    twister: 'String-Skipper',
    triads: 'Voice-Led Triads',
  }
  const tempo = opts.bpm ?? (opts.level === 'starter' ? 76 : opts.level === 'intermediate' ? 92 : 108)

  const song: Song = {
    title: `${opts.tonic} ${texName[opts.texture]} — ${presetName}`,
    artist: 'KGuitar Circle Mastery',
    tempo,
    meter: 4,
    backing: { groove: 'acoustic', bass: 'root-fifth' },
    tracks: [
      {
        name: opts.picking === 'finger' ? 'Fingerstyle Guitar' : 'Clean Guitar',
        tuning,
        capo: 0,
        program: opts.picking === 'finger' ? 24 : 27,
        bars,
      },
    ],
  }
  return { song, chords }
}

// ---------- 12-Key Mastery Persistence ----------
const MASTERY_KEY = 'kg:circleKeyMastery'
export function loadKeyMastery(): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(MASTERY_KEY) ?? '{}') as Record<string, number>
    return raw && typeof raw === 'object' ? raw : {}
  } catch { return {} }
}
export function markKeyMastered(keyName: string, delta = 1): Record<string, number> {
  const cur = loadKeyMastery()
  const norm = CIRCLE_FOURTHS.find(k => pc(k) === pc(keyName)) ?? keyName
  cur[norm] = Math.min(5, (cur[norm] ?? 0) + delta)
  try { localStorage.setItem(MASTERY_KEY, JSON.stringify(cur)) } catch { /* full */ }
  return cur
}
export function resetKeyMastery(): Record<string, number> {
  try { localStorage.removeItem(MASTERY_KEY) } catch { /* ignore */ }
  return {}
}

/** Move every note / chord name in a line of text from one key to another, spelled properly (E minor → C minor:
 *  "Em → Am" becomes "Cm → Fm", "F#m7b5" becomes "Dm7b5"). Words like "Bar", "Add" or "Bass" are left alone. */
export function transposeNames(text: string, from: string, to: string): string {
  const LET = 'CDEFGAB'
  const steps = (LET.indexOf(to[0]) - LET.indexOf(from[0]) + 7) % 7
  const semis = (pc(to) - pc(from) + 12) % 12
  if (!semis && !steps) return text
  return text.replace(/(?<![A-Za-z])([A-G])(#|b|♯|♭)?(?![a-ln-z])/g, (_m, l: string, acc?: string) => {
    const name = l + (acc === '♯' ? '#' : acc === '♭' ? 'b' : acc ?? '')
    let out: string
    try { out = noteAt(name, steps, semis) } catch { return name }
    // double flats / sharps and Cb Fb E# B# read better as the plain note a guitarist would say
    return /bb|##|x/.test(out) || /^(Cb|Fb|E#|B#)$/.test(out) ? (keyPrefersFlats(to) ? FLATS : SHARPS)[pc(out.replace(/x/, '##'))] : out
  })
}
