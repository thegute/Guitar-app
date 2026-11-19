// Scaler-Style Songwriter Suite for KGuitar:
// 1) Chord Vibe Sets (8 curated genre/mood chord boards transposable to all 12 keys)
// 2) Key Shifter (smooth multi-path key-change bridge generator from Key A → Key B)
// 3) Detect Scale (live mic / tapped pitch-class scale & mode matcher)
import { FLATS, SHARPS, keyPrefersFlats, pc, pcName } from './notes'
import {
  formatChordSymbol,
  type ChordQual,
  type EdgeFlavor,
  type StrumStyleId,
} from './harmonicFlow'

// ---------- 1. Chord Vibe Sets ----------

export interface VibeChordDef {
  roman: string
  semi: number
  qual: ChordQual
  flavor: EdgeFlavor
  tip: string
  flatBias?: boolean
}

export interface ChordVibeSetDef {
  id: string
  name: string
  minor: boolean
  defaultStyle: StrumStyleId
  defaultBpm: number
  desc: string
  chords: VibeChordDef[]
  starterProgression: number[]
}

export interface ResolvedVibeChord extends VibeChordDef {
  symbol: string
  rootPc: number
}

export const CHORD_VIBE_SETS: ChordVibeSetDef[] = [
  {
    id: 'neosoul',
    name: 'Neo-Soul & R&B',
    minor: false,
    defaultStyle: 'rhodes',
    defaultBpm: 84,
    desc: 'Warm maj7s, m7 grooves, secondary dominants, and bittersweet minor iv lifts.',
    starterProgression: [0, 2, 1, 6],
    chords: [
      { roman: 'Imaj7', semi: 0, qual: 'maj7', flavor: 'diatonic', tip: 'Silky home tonic' },
      { roman: 'ii7', semi: 2, qual: 'm7', flavor: 'diatonic', tip: 'Smooth step into V7' },
      { roman: 'iii7', semi: 4, qual: 'm7', flavor: 'diatonic', tip: 'Dreamy mediant color' },
      { roman: 'IVmaj7', semi: 5, qual: 'maj7', flavor: 'diatonic', tip: 'Lush floating subdominant' },
      { roman: 'vi7', semi: 9, qual: 'm7', flavor: 'diatonic', tip: 'Soulful relative minor' },
      { roman: 'V7', semi: 7, qual: '7', flavor: 'pull', tip: 'Classic dominant pull home' },
      { roman: 'V7/vi', semi: 4, qual: '7', flavor: 'pull', tip: 'Gospel push into vi7' },
      { roman: 'V7/ii', semi: 9, qual: '7', flavor: 'pull', tip: 'Turnaround VI7 into ii7' },
      { roman: 'iv', semi: 5, qual: 'm', flavor: 'color', tip: 'Heartbreak minor 4 melt' },
      { roman: '♭VII', semi: 10, qual: '', flavor: 'color', tip: 'Backdoor Mixolydian lift', flatBias: true },
      { roman: '♭II7', semi: 1, qual: '7', flavor: 'color', tip: 'Silky tritone sub slide', flatBias: true },
      { roman: '♭VI', semi: 8, qual: '', flavor: 'color', tip: 'Rich borrowed lift', flatBias: true },
    ],
  },
  {
    id: 'cinematic',
    name: 'Cinematic Strings',
    minor: true,
    defaultStyle: 'orchestra',
    defaultBpm: 80,
    desc: 'Sweeping minor film-score harmony with heroic ♭VI → ♭VII climbs and dramatic V7 pulls.',
    starterProgression: [0, 3, 1, 4],
    chords: [
      { roman: 'i', semi: 0, qual: 'm', flavor: 'diatonic', tip: 'Brooding orchestral home' },
      { roman: '♭III', semi: 3, qual: '', flavor: 'diatonic', tip: 'Warm heroic sunlight', flatBias: true },
      { roman: 'iv', semi: 5, qual: 'm', flavor: 'diatonic', tip: 'Deep emotional swell' },
      { roman: '♭VI', semi: 8, qual: '', flavor: 'diatonic', tip: 'Epic wide-screen lift', flatBias: true },
      { roman: '♭VII', semi: 10, qual: '', flavor: 'diatonic', tip: 'Soaring anthem climb', flatBias: true },
      { roman: 'v', semi: 7, qual: 'm', flavor: 'diatonic', tip: 'Mysterious modal turn' },
      { roman: 'V7', semi: 7, qual: '7', flavor: 'pull', tip: 'Classical tension into i' },
      { roman: 'ii°', semi: 2, qual: 'dim', flavor: 'pull', tip: 'Suspenseful dark pivot' },
      { roman: 'IV', semi: 5, qual: '', flavor: 'color', tip: 'Hopeful Dorian glow' },
      { roman: '♭II', semi: 1, qual: '', flavor: 'color', tip: 'Neapolitan tension', flatBias: true },
      { roman: 'I', semi: 0, qual: '', flavor: 'color', tip: 'Picardy sunrise ending' },
      { roman: 'V7/♭VI', semi: 3, qual: '7', flavor: 'pull', tip: 'Dominant surge into ♭VI', flatBias: true },
    ],
  },
  {
    id: 'metal',
    name: 'Dark Metal & Phrygian',
    minor: true,
    defaultStyle: 'metal-chug',
    defaultBpm: 136,
    desc: 'Heavy low-end power chords, Phrygian ♭II crush, harmonic minor V7, and galloping ♭VI → ♭VII.',
    starterProgression: [0, 3, 4, 8],
    chords: [
      { roman: 'i5', semi: 0, qual: '5', flavor: 'diatonic', tip: 'Crushing root chug' },
      { roman: '♭III5', semi: 3, qual: '5', flavor: 'diatonic', tip: 'Classic NWOBHM riff lift', flatBias: true },
      { roman: 'iv5', semi: 5, qual: '5', flavor: 'diatonic', tip: 'Heavy breakdown drop' },
      { roman: '♭VI5', semi: 8, qual: '5', flavor: 'diatonic', tip: 'Epic Iron Maiden gallop', flatBias: true },
      { roman: '♭VII5', semi: 10, qual: '5', flavor: 'diatonic', tip: 'Driving slam back to i5', flatBias: true },
      { roman: 'v5', semi: 7, qual: '5', flavor: 'diatonic', tip: 'Classic minor 5th chug' },
      { roman: 'V7', semi: 7, qual: '7', flavor: 'pull', tip: 'Neoclassical shred turnaround' },
      { roman: 'ii°', semi: 2, qual: 'dim', flavor: 'pull', tip: 'Dark diminished tension' },
      { roman: '♭II5', semi: 1, qual: '5', flavor: 'color', tip: 'Evil Phrygian half-step slam', flatBias: true },
      { roman: '♭V5', semi: 6, qual: '5', flavor: 'color', tip: 'Tritone doom riff stab', flatBias: true },
    ],
  },
  {
    id: 'reggae',
    name: 'Reggae & Dub Skank',
    minor: true,
    defaultStyle: 'reggae',
    defaultBpm: 80,
    desc: 'Roots minor & Dorian skank chords that lock tight with One-Drop drums and dub bass.',
    starterProgression: [0, 2, 4, 0],
    chords: [
      { roman: 'i', semi: 0, qual: 'm', flavor: 'diatonic', tip: 'Roots skank anchor' },
      { roman: 'i7', semi: 0, qual: 'm7', flavor: 'diatonic', tip: 'Smooth dub 7th chop' },
      { roman: 'iv', semi: 5, qual: 'm', flavor: 'diatonic', tip: 'Deep roots minor 4' },
      { roman: 'v', semi: 7, qual: 'm', flavor: 'diatonic', tip: 'Laid-back 5th skank' },
      { roman: '♭VI', semi: 8, qual: '', flavor: 'diatonic', tip: 'Sunny Marley-style lift', flatBias: true },
      { roman: '♭VII', semi: 10, qual: '', flavor: 'diatonic', tip: 'Classic reggae bounce', flatBias: true },
      { roman: '♭III', semi: 3, qual: '', flavor: 'diatonic', tip: 'Bright island chorus', flatBias: true },
      { roman: 'V7', semi: 7, qual: '7', flavor: 'pull', tip: 'Soulful turnaround to i' },
      { roman: 'IV', semi: 5, qual: '', flavor: 'color', tip: 'Dorian sunshine skank' },
      { roman: 'IV7', semi: 5, qual: '7', flavor: 'color', tip: 'Funky dub-rock push' },
    ],
  },
  {
    id: 'bluegrass',
    name: 'Folk & Bluegrass',
    minor: false,
    defaultStyle: 'bluegrass',
    defaultBpm: 118,
    desc: 'Crisp acoustic open shapes, classic I–IV–V boom-chuck, and Mixolydian ♭VII bluegrass fire.',
    starterProgression: [0, 3, 4, 0],
    chords: [
      { roman: 'I', semi: 0, qual: '', flavor: 'diatonic', tip: 'Open campfire home' },
      { roman: 'ii', semi: 2, qual: 'm', flavor: 'diatonic', tip: 'Country walk into V' },
      { roman: 'iii', semi: 4, qual: 'm', flavor: 'diatonic', tip: 'Gentle folk step' },
      { roman: 'IV', semi: 5, qual: '', flavor: 'diatonic', tip: 'Big acoustic chorus lift' },
      { roman: 'V', semi: 7, qual: '', flavor: 'diatonic', tip: 'Boom-chuck turnaround' },
      { roman: 'vi', semi: 9, qual: 'm', flavor: 'diatonic', tip: 'Heartfelt relative minor' },
      { roman: 'V7/V', semi: 2, qual: '7', flavor: 'pull', tip: 'Classic bluegrass II7 kick' },
      { roman: 'V7/IV', semi: 0, qual: '7', flavor: 'pull', tip: 'Bluesy I7 lean into IV' },
      { roman: '♭VII', semi: 10, qual: '', flavor: 'color', tip: 'Old-time mountain modal drop', flatBias: true },
      { roman: 'Iadd9', semi: 0, qual: 'add9', flavor: 'color', tip: 'Sparkling singer-songwriter ring' },
    ],
  },
  {
    id: 'jazz',
    name: 'Jazz Standards',
    minor: false,
    defaultStyle: 'rhodes',
    defaultBpm: 112,
    desc: 'Classic ii7–V7–Imaj7 turnarounds, secondary dominants, and silky tritone substitutions.',
    starterProgression: [1, 4, 0, 6],
    chords: [
      { roman: 'Imaj7', semi: 0, qual: 'maj7', flavor: 'diatonic', tip: 'Warm jazz home' },
      { roman: 'ii7', semi: 2, qual: 'm7', flavor: 'diatonic', tip: 'Launch every ii–V–I here' },
      { roman: 'iii7', semi: 4, qual: 'm7', flavor: 'diatonic', tip: 'Substitute for Imaj7' },
      { roman: 'IVmaj7', semi: 5, qual: 'maj7', flavor: 'diatonic', tip: 'Bright bridge lift' },
      { roman: 'V7', semi: 7, qual: '7', flavor: 'pull', tip: 'Dominant tension into I' },
      { roman: 'vi7', semi: 9, qual: 'm7', flavor: 'diatonic', tip: 'Smooth relative minor' },
      { roman: 'V7/ii', semi: 9, qual: '7', flavor: 'pull', tip: 'VI7 turnaround into ii7' },
      { roman: 'V7/V', semi: 2, qual: '7', flavor: 'pull', tip: 'II7 pushing into V7' },
      { roman: '♭II7', semi: 1, qual: '7', flavor: 'color', tip: 'Tritone sub for V7', flatBias: true },
      { roman: 'iv', semi: 5, qual: 'm', flavor: 'color', tip: 'Minor plagal jazz cadence' },
    ],
  },
  {
    id: 'lofi',
    name: 'Lo-Fi Chill',
    minor: false,
    defaultStyle: 'rhodes',
    defaultBpm: 76,
    desc: 'Nostalgic dusty maj7 and m7 loops with wistful minor-4 resolutions.',
    starterProgression: [3, 8, 0, 2],
    chords: [
      { roman: 'Imaj7', semi: 0, qual: 'maj7', flavor: 'diatonic', tip: 'Warm sunset tonic' },
      { roman: 'ii7', semi: 2, qual: 'm7', flavor: 'diatonic', tip: 'Chill step up' },
      { roman: 'iii7', semi: 4, qual: 'm7', flavor: 'diatonic', tip: 'Floaty lo-fi color' },
      { roman: 'IVmaj7', semi: 5, qual: 'maj7', flavor: 'diatonic', tip: 'Classic lo-fi starting chord' },
      { roman: 'vi7', semi: 9, qual: 'm7', flavor: 'diatonic', tip: 'Cozy rainy-day minor' },
      { roman: 'V7', semi: 7, qual: '7', flavor: 'pull', tip: 'Gentle turnaround' },
      { roman: 'V7/vi', semi: 4, qual: '7', flavor: 'pull', tip: 'Sweet pull into vi7' },
      { roman: 'Isus4', semi: 0, qual: 'sus4', flavor: 'color', tip: 'Suspended shimmer' },
      { roman: 'iv', semi: 5, qual: 'm', flavor: 'color', tip: 'Wistful IVmaj7 → iv melt' },
      { roman: '♭VII', semi: 10, qual: '', flavor: 'color', tip: 'Dreamy backdoor turn', flatBias: true },
    ],
  },
  {
    id: 'dreampop',
    name: 'Dream Pop & Indie',
    minor: false,
    defaultStyle: 'twelve',
    defaultBpm: 98,
    desc: 'Shimmering add9 & sus4 chords, bittersweet borrowed mediants, and open-string jangle.',
    starterProgression: [0, 3, 4, 7],
    chords: [
      { roman: 'Iadd9', semi: 0, qual: 'add9', flavor: 'diatonic', tip: 'Jangly open-string shimmer' },
      { roman: 'IV', semi: 5, qual: '', flavor: 'diatonic', tip: 'Wide open chorus' },
      { roman: 'V', semi: 7, qual: '', flavor: 'diatonic', tip: 'Bright indie lift' },
      { roman: 'vi', semi: 9, qual: 'm', flavor: 'diatonic', tip: 'Emotional indie core' },
      { roman: 'ii7', semi: 2, qual: 'm7', flavor: 'diatonic', tip: 'Airy passing chord' },
      { roman: 'Isus4', semi: 0, qual: 'sus4', flavor: 'diatonic', tip: 'Chimey suspended ring' },
      { roman: 'V7/vi', semi: 4, qual: '7', flavor: 'pull', tip: 'Bittersweet climb to vi' },
      { roman: 'iv', semi: 5, qual: 'm', flavor: 'color', tip: 'Nostalgic shoegaze melt' },
      { roman: '♭VI', semi: 8, qual: '', flavor: 'color', tip: 'Big cinema-pop jump', flatBias: true },
      { roman: '♭VII', semi: 10, qual: '', flavor: 'color', tip: 'Anthemic Britpop drop', flatBias: true },
    ],
  },
]

export function resolveVibeSet(setId: string, tonic: string): ResolvedVibeChord[] {
  const def = CHORD_VIBE_SETS.find(s => s.id === setId) ?? CHORD_VIBE_SETS[0]
  const tPc = pc(tonic)
  const baseFlats = keyPrefersFlats(tonic, def.minor)
  return def.chords.map(c => {
    const rootPc = (tPc + c.semi) % 12
    const symbol = formatChordSymbol(rootPc, c.qual, baseFlats || !!c.flatBias)
    return { ...c, rootPc, symbol }
  })
}

// ---------- 2. Key Shifter (Modulation Bridge Generator) ----------

export interface BridgeStep {
  symbol: string
  role: string
  flavor: EdgeFlavor
}

export interface KeyShiftBridge {
  id: string
  title: string
  feel: string
  steps: BridgeStep[]
  explanation: string
}

/** Generate 3 smooth musical chord bridges to shift from (fromTonic, fromMinor) to (toTonic, toMinor). */
export function buildKeyShiftBridges(
  fromTonic: string,
  fromMinor: boolean,
  toTonic: string,
  toMinor: boolean,
): KeyShiftBridge[] {
  const aPc = pc(fromTonic)
  const bPc = pc(toTonic)
  const aFlats = keyPrefersFlats(fromTonic, fromMinor)
  const bFlats = keyPrefersFlats(toTonic, toMinor)

  const homeA = formatChordSymbol(aPc, fromMinor ? 'm' : '', aFlats)
  const homeB = formatChordSymbol(bPc, toMinor ? 'm' : '', bFlats)
  const v7B = formatChordSymbol((bPc + 7) % 12, '7', bFlats)
  const iiB = formatChordSymbol((bPc + 2) % 12, toMinor ? 'dim' : 'm7', bFlats)
  const ivB = formatChordSymbol((bPc + 5) % 12, toMinor ? 'm' : '', bFlats)
  const triSubB = formatChordSymbol((bPc + 1) % 12, '7', true)

  // Find a natural shared pivot triad if one exists between Key A and Key B
  const scaleA = (fromMinor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]).map(s => (aPc + s) % 12)
  const triQualA = fromMinor ? ['m', 'dim', '', 'm', 'm', '', ''] : ['', 'm', 'm', '', '', 'm', 'dim']
  const scaleB = (toMinor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]).map(s => (bPc + s) % 12)
  const triQualB = toMinor ? ['m', 'dim', '', 'm', 'm', '', ''] : ['', 'm', 'm', '', '', 'm', 'dim']

  let pivot: { sym: string; label: string } | null = null
  for (let i = 1; i < 7; i++) {
    const r = scaleA[i]
    const q = triQualA[i] as ChordQual
    if (q === 'dim') continue
    const j = scaleB.indexOf(r)
    if (j > 0 && triQualB[j] === q) {
      pivot = {
        sym: formatChordSymbol(r, q, bFlats),
        label: `Shared pivot chord`,
      }
      break
    }
  }

  const bridges: KeyShiftBridge[] = [
    {
      id: 'dom-pivot',
      title: pivot ? 'Smooth Pivot Bridge' : 'Classic ii–V Key Shift',
      feel: 'Seamless & Natural',
      steps: [
        { symbol: homeA, role: 'Start Home', flavor: 'diatonic' },
        pivot
          ? { symbol: pivot.sym, role: 'Pivot (in both keys)', flavor: 'diatonic' }
          : { symbol: iiB, role: 'New ii', flavor: 'diatonic' },
        { symbol: v7B, role: 'New V7 Pull', flavor: 'pull' },
        { symbol: homeB, role: 'New Home!', flavor: 'diatonic' },
      ],
      explanation: pivot
        ? `${pivot.sym} belongs to BOTH keys — use it as a stealth bridge into ${v7B}, which pulls cleanly home to ${homeB}.`
        : `Step onto ${iiB} to set up ${v7B}, creating a classic jazz/pop ii–V landing straight into ${homeB}.`,
    },
    {
      id: 'direct-lift',
      title: 'Pop Chorus Lift (IV → V7)',
      feel: 'Big & Energetic',
      steps: [
        { symbol: homeA, role: 'Start Home', flavor: 'diatonic' },
        { symbol: ivB, role: 'New IV Lift', flavor: 'color' },
        { symbol: v7B, role: 'New V7 Drive', flavor: 'pull' },
        { symbol: homeB, role: 'New Home!', flavor: 'diatonic' },
      ],
      explanation: `Jump boldly onto the new key's IV (${ivB}), push through ${v7B}, and explode into the ${homeB} chorus.`,
    },
    {
      id: 'tritone-slide',
      title: 'Silky Half-Step Slide (Tritone Sub)',
      feel: 'Cinematic & Jazzy',
      steps: [
        { symbol: homeA, role: 'Start Home', flavor: 'diatonic' },
        { symbol: triSubB, role: '♭II7 Half-Step Pull', flavor: 'color' },
        { symbol: homeB, role: 'New Home!', flavor: 'diatonic' },
      ],
      explanation: `${triSubB} sits just ONE fret above ${homeB} — its guide tones slide smoothly by a half-step into your new key.`,
    },
  ]

  return bridges
}

// ---------- 3. Detect Scale (Play or Tap Notes → Best Scales & Modes) ----------

export interface DetectedScale {
  root: string
  scaleId: string
  label: string
  minor: boolean
  score: number
  matched: number
  totalInput: number
  scalePcs: number[]
  feel: string
}

const DETECT_SCALES: { id: string; label: string; minor: boolean; ivs: number[]; feel: string }[] = [
  { id: 'major', label: 'Major (Ionian)', minor: false, ivs: [0, 2, 4, 5, 7, 9, 11], feel: 'Bright, classic pop, rock & folk' },
  { id: 'minor', label: 'Natural Minor (Aeolian)', minor: true, ivs: [0, 2, 3, 5, 7, 8, 10], feel: 'Emotional rock, metal & ballads' },
  { id: 'minor pentatonic', label: 'Minor Pentatonic', minor: true, ivs: [0, 3, 5, 7, 10], feel: 'Essential rock, blues & soloing box' },
  { id: 'major pentatonic', label: 'Major Pentatonic', minor: false, ivs: [0, 2, 4, 7, 9], feel: 'Country, bluegrass, soul & Mayer leads' },
  { id: 'dorian', label: 'Dorian', minor: true, ivs: [0, 2, 3, 5, 7, 9, 10], feel: 'Soulful minor with bright natural 6 (Santana, reggae, funk)' },
  { id: 'mixolydian', label: 'Mixolydian', minor: false, ivs: [0, 2, 4, 5, 7, 9, 10], feel: 'Blues-rock & jam-band major with ♭7' },
  { id: 'lydian', label: 'Lydian', minor: false, ivs: [0, 2, 4, 6, 7, 9, 11], feel: 'Dreamy film-score major with bright #4' },
  { id: 'phrygian', label: 'Phrygian', minor: true, ivs: [0, 1, 3, 5, 7, 8, 10], feel: 'Dark exotic metal & flamenco ♭2' },
  { id: 'harmonic minor', label: 'Harmonic Minor', minor: true, ivs: [0, 2, 3, 5, 7, 8, 11], feel: 'Dramatic neoclassical shred & orchestral tension' },
  { id: 'blues', label: 'Blues Scale', minor: true, ivs: [0, 3, 5, 6, 7, 10], feel: 'Minor pentatonic + gritty ♭5 blue note' },
]

/** Rank the best matching scales & modes for a collection of pitch classes (0..11). */
export function detectScalesFromPcs(inputPcs: number[], maxResults = 6): DetectedScale[] {
  const uniq = [...new Set(inputPcs.map(p => ((p % 12) + 12) % 12))]
  if (uniq.length < 2) return []
  const firstPc = uniq[0]
  const results: DetectedScale[] = []

  for (let r = 0; r < 12; r++) {
    for (const sc of DETECT_SCALES) {
      const scalePcs = sc.ivs.map(iv => (r + iv) % 12)
      const set = new Set(scalePcs)
      let matched = 0
      for (const p of uniq) if (set.has(p)) matched++
      if (matched < Math.min(2, uniq.length)) continue
      const recall = matched / uniq.length
      // Slight bonus for tight fit (fewer unused notes), root matching first played note, and core scales
      const precision = matched / sc.ivs.length
      const rootBonus = r === firstPc ? 0.06 : 0
      const coreBonus = sc.id === 'major' || sc.id === 'minor' || sc.id === 'minor pentatonic' ? 0.02 : 0
      const score = Math.min(1, recall * 0.8 + precision * 0.14 + rootBonus + coreBonus)
      const rootName = pcName(r, keyPrefersFlats(SHARPS[r], sc.minor) && ![0, 2, 4, 7, 9, 11].includes(r))
      results.push({
        root: rootName,
        scaleId: sc.id,
        label: `${rootName} ${sc.label}`,
        minor: sc.minor,
        score,
        matched,
        totalInput: uniq.length,
        scalePcs,
        feel: sc.feel,
      })
    }
  }

  results.sort((a, b) => b.score - a.score || b.matched - a.matched)
  return results.slice(0, maxResults)
}

/** Extract dominant pitch classes from a 12-bin chroma array (for mic-based Detect Scale). */
export function topPcsFromChroma(chroma: number[], count = 3): number[] {
  return chroma
    .map((v, i) => ({ v, i }))
    .filter(x => x.v > 0.11)
    .sort((a, b) => b.v - a.v)
    .slice(0, count)
    .map(x => x.i)
}

export { FLATS, SHARPS }
