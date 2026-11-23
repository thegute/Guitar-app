// Fretboard Mastery Game engine:
// - 5 Training Lenses: Notes, Intervals (Fixed/Moving/By-Ear), Chord Tones, Scale Degrees, Triads
// - 5 Core Modes: Endless Mode (6-string orb radar), Guided Path (6 stages), Speed Blitz (60s),
//   Metronome Run (auto +5 BPM), Build the Shape (find all / connect shapes) + Identify Fret & Daily 3-Min
// - Study Primer chunk engine (Fret Boxes + String Sets), per-fret speed & accuracy Heatmap,
//   spaced-repetition weak-spot targeting, smart coaching shortcuts, and Phone ↔ Tablet sync merge.
import { FLATS, INTERVAL_LABELS, SHARPS, pc } from '../theory/notes'
import { typeTones, type ProgChord } from '../theory/progressions'
import type { Instrument } from '../instrument'

export type GameMode =
  | 'survival' // Endless Mode
  | 'path'     // Guided Path
  | 'blitz'    // Speed Blitz
  | 'gauntlet' // Metronome Run
  | 'sniper'   // Build the Shape
  | 'name'     // Identify the Fret (quick reverse mode)
  | 'daily'    // Daily 3-Min Workout

export type TrainingLens = 'notes' | 'intervals' | 'chords' | 'degrees' | 'triads'
export type IntervalStyle = 'fixed' | 'moving' | 'ear'
export type AccidentalMode = 'natural' | 'sharps' | 'flats' | 'both'
export type HeatTier = 'unseen' | 'red' | 'amber' | 'green' | 'gold'

export interface FretSpot {
  s: number // 0 = lowest string (low E), N-1 = highest string (high e)
  f: number // 0..maxFret
  midi: number
  pc: number
}

export interface FretStat {
  seen: number
  right: number
  wrong: number
  avgMs: number
  bestMs: number
  lastAt: number
  streak: number
}

export interface BestRecords {
  blitzScore: number
  survivalWave: number
  survivalScore: number
  gauntletBpm: number
  sniperClears: number
  bestCombo: number
  dailyStreak: number
  lastDailyDay?: string
}

export interface FretGameData {
  /** Keyed by `${inst.id}:${inst.tuning.id}` -> `${s}:${f}` -> FretStat */
  heat: Record<string, Record<string, FretStat>>
  records: BestRecords
  totalHits: number
  totalSessions: number
  updatedAt: number
}

export interface GameFilter {
  fromFret: number
  toFret: number
  /** Active string indices (0 = lowest). Empty = all strings. */
  strings: number[]
  accidentals: AccidentalMode
  weakOnly?: boolean
}

export interface StageDef {
  id: number
  title: string
  short: string
  goal: string
  why: string
  accent: string
  kind: 'landmarks' | 'bass' | 'octaves' | 'naturals' | 'chromatic' | 'intervals'
  unlockMastery: number
}

export const CIRCLE_FOURTHS_PCS = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7] // C F Bb Eb Ab Db Gb B E A D G
export const NATURAL_PCS = new Set([0, 2, 4, 5, 7, 9, 11])
export const LANDMARK_FRETS = [0, 3, 5, 7, 9, 12]

export const STAGES: StageDef[] = [
  {
    id: 1,
    title: 'Stage 1 · Landmark Anchors',
    short: 'Landmarks',
    goal: 'Open strings + dot frets (0, 3, 5, 7, 9, 12)',
    why: 'Dot frets are your GPS pins — knowing them stops you from ever counting from fret 0.',
    accent: '#38bdf8',
    kind: 'landmarks',
    unlockMastery: 0,
  },
  {
    id: 2,
    title: 'Stage 2 · Low E & A Highway',
    short: 'E & A Roots',
    goal: 'Every note on the two lowest strings (0–12)',
    why: 'Locks in every barre chord root and instantly unlocks the high e string too.',
    accent: '#10b981',
    kind: 'bass',
    unlockMastery: 55,
  },
  {
    id: 3,
    title: 'Stage 3 · Octave Web',
    short: 'Octave Jumps',
    goal: 'Snap from an anchor note to its octave 1–2 strings up',
    why: 'Once you know E & A, the 5 octave shapes unlock D, G, B, and high e in seconds.',
    accent: '#f59e0b',
    kind: 'octaves',
    unlockMastery: 55,
  },
  {
    id: 4,
    title: 'Stage 4 · Full Neck Naturals',
    short: 'All Naturals',
    goal: 'A–G natural notes on every string (0–12)',
    why: 'See all 7 natural letters everywhere, anchored by the B–C and E–F half-steps.',
    accent: '#a855f7',
    kind: 'naturals',
    unlockMastery: 55,
  },
  {
    id: 5,
    title: 'Stage 5 · Chromatic Boss',
    short: 'Chromatic',
    goal: 'All 12 notes (naturals, # and ♭) across the full neck',
    why: 'True total-neck recall under 1.4 seconds per note with zero hesitation.',
    accent: '#ef4444',
    kind: 'chromatic',
    unlockMastery: 60,
  },
  {
    id: 6,
    title: 'Stage 6 · Intervals & Chord Tones',
    short: 'Intervals Pro',
    goal: 'Find 3rds, 5ths, 7ths & 9ths over live chord changes',
    why: 'Turns note names into real improvisation — think in musical colors, not scale boxes.',
    accent: '#ec4899',
    kind: 'intervals',
    unlockMastery: 60,
  },
]

/** String set presets adapting cleanly to 6-string guitar or 4-string uke/baritone. */
export function stringSetPresets(nStr: number): { id: string; label: string; strings: number[] }[] {
  if (nStr === 6) {
    return [
      { id: 'all', label: 'All 6', strings: [] },
      { id: 'low', label: 'Low E–A', strings: [0, 1] },
      { id: 'mid', label: 'Mid D–G', strings: [2, 3] },
      { id: 'high', label: 'Top B–e', strings: [4, 5] },
      { id: 'low3', label: 'Low 3 (E–A–D)', strings: [0, 1, 2] },
      { id: 'top3', label: 'Top 3 (G–B–e)', strings: [3, 4, 5] },
    ]
  }
  return [
    { id: 'all', label: `All ${nStr}`, strings: [] },
    { id: 'low', label: 'Low 2', strings: [0, Math.min(1, nStr - 1)] },
    { id: 'high', label: 'Top 2', strings: [Math.max(0, nStr - 2), nStr - 1] },
  ]
}

// ---------- Scale Degrees & Mode Color Definitions ----------

export interface ScaleLensDef {
  id: string
  label: string
  steps: number[]
  labels: string[]
  /** Semitone offsets that give this mode its signature flavor (highlighted cyan) */
  colorSteps: number[]
}

export const SCALE_LENSES: ScaleLensDef[] = [
  { id: 'major', label: 'Major (Ionian)', steps: [0, 2, 4, 5, 7, 9, 11], labels: ['1', '2', '3', '4', '5', '6', '7'], colorSteps: [4, 11] },
  { id: 'minor', label: 'Natural Minor', steps: [0, 2, 3, 5, 7, 8, 10], labels: ['1', '2', '♭3', '4', '5', '♭6', '♭7'], colorSteps: [3, 8] },
  { id: 'pent-min', label: 'Minor Pentatonic', steps: [0, 3, 5, 7, 10], labels: ['1', '♭3', '4', '5', '♭7'], colorSteps: [3, 10] },
  { id: 'pent-maj', label: 'Major Pentatonic', steps: [0, 2, 4, 7, 9], labels: ['1', '2', '3', '5', '6'], colorSteps: [4, 9] },
  { id: 'dorian', label: 'Dorian (Sweet 6)', steps: [0, 2, 3, 5, 7, 9, 10], labels: ['1', '2', '♭3', '4', '5', '6', '♭7'], colorSteps: [9] },
  { id: 'mixolydian', label: 'Mixolydian (Bluesy ♭7)', steps: [0, 2, 4, 5, 7, 9, 10], labels: ['1', '2', '3', '4', '5', '6', '♭7'], colorSteps: [10] },
  { id: 'lydian', label: 'Lydian (Dreamy ♯4)', steps: [0, 2, 4, 6, 7, 9, 11], labels: ['1', '2', '3', '♯4', '5', '6', '7'], colorSteps: [6] },
]

export function scaleDegreeInfo(
  notePc: number,
  rootPc: number,
  scaleId: string,
): { label: string; isRoot: boolean; isColor: boolean; semitone: number } | null {
  const sc = SCALE_LENSES.find(x => x.id === scaleId) ?? SCALE_LENSES[0]
  const iv = ((notePc - rootPc) % 12 + 12) % 12
  const idx = sc.steps.indexOf(iv)
  if (idx < 0) return null
  return {
    label: sc.labels[idx],
    isRoot: iv === 0,
    isColor: sc.colorSteps.includes(iv),
    semitone: iv,
  }
}

// ---------- Interval Lens Helpers (Fixed Root, Moving Root, By Ear) ----------

export const CORE_INTERVALS = [
  { semi: 3, short: '♭3', name: 'Minor 3rd', shape: '1 string up, 2 frets back (or 3 frets up same string)' },
  { semi: 4, short: '3', name: 'Major 3rd', shape: '1 string up, 1 fret back (same fret across G→B!)' },
  { semi: 5, short: '4', name: 'Perfect 4th', shape: '1 string up, same fret (1 fret up across G→B!)' },
  { semi: 7, short: '5', name: 'Perfect 5th', shape: '1 string up, 2 frets up (power-chord shape; +3 across G→B)' },
  { semi: 9, short: '6', name: 'Major 6th', shape: '2 strings up, 1 fret back (or 1 string up, 4 frets up)' },
  { semi: 10, short: '♭7', name: 'Minor 7th', shape: '2 strings up, same fret (1 fret up across G→B!)' },
  { semi: 11, short: '7', name: 'Major 7th', shape: '2 strings up, 1 fret up (2 frets up across G→B!)' },
  { semi: 12, short: 'Oct', name: 'Octave', shape: '2 strings up, 2 frets up (3 frets up across G→B!)' },
] as const

export function intervalLabelFromRoot(midi: number, rootMidi: number): { short: string; name: string; semi: number } {
  const diff = midi - rootMidi
  if (diff === 0) return { short: 'R', name: 'Root', semi: 0 }
  if (diff === 12 || diff === -12) return { short: 'Oct', name: 'Octave', semi: 12 }
  const iv = ((diff % 12) + 12) % 12
  const found = CORE_INTERVALS.find(x => x.semi === iv)
  if (found) return { short: found.short, name: found.name, semi: iv }
  return { short: INTERVAL_LABELS[iv], name: INTERVAL_LABELS[iv], semi: iv }
}

export function intervalTip(target: FretSpot, anchor: FretSpot): string {
  const diff = target.midi - anchor.midi
  const iv = diff === 12 ? 12 : ((diff % 12) + 12) % 12
  const meta = CORE_INTERVALS.find(x => x.semi === iv)
  const ds = target.s - anchor.s
  const df = target.f - anchor.f
  const dirF = df === 0 ? 'same fret' : df > 0 ? `${df} fret${df === 1 ? '' : 's'} right` : `${Math.abs(df)} fret${Math.abs(df) === 1 ? '' : 's'} left`
  const dirS = ds === 0 ? 'same string' : ds > 0 ? `${ds} string${ds === 1 ? '' : 's'} higher` : `${Math.abs(ds)} string${Math.abs(ds) === 1 ? '' : 's'} lower`
  return `${meta?.name ?? INTERVAL_LABELS[iv]} (${meta?.short ?? ''}): from Root, go ${dirS}, ${dirF}.`
}

/** Pick an anchor Root spot inside the active chunk (preferring lower strings so upper intervals sit cleanly!). */
export function pickIntervalAnchor(
  midis: number[],
  filter: GameFilter,
  fixedRootPc?: number,
  rnd = Math.random,
): FretSpot {
  const all = filterSpots(midis, { ...filter, accidentals: 'both' })
  if (!all.length) return { s: 0, f: 5, midi: midis[0] + 5, pc: (midis[0] + 5) % 12 }
  let cands = all
  if (fixedRootPc !== undefined) {
    const matching = all.filter(sp => sp.pc === ((fixedRootPc % 12) + 12) % 12)
    if (matching.length) cands = matching
  }
  // Prefer lower strings (0, 1, 2) so intervals sit above the anchor cleanly
  const lowCands = cands.filter(sp => sp.s <= Math.max(1, Math.floor(midis.length / 2) - 1))
  const pool = lowCands.length ? lowCands : cands
  return pool[Math.floor(rnd() * pool.length)]
}

/** Pick a target interval spot relative to an anchor Root inside the active chunk. */
export function pickIntervalTarget(
  midis: number[],
  filter: GameFilter,
  anchor: FretSpot,
  avoidKey = '',
  rnd = Math.random,
): { spot: FretSpot; semi: number; short: string; name: string } {
  const allowedSemis = new Set<number>(CORE_INTERVALS.map(x => x.semi))
  const box = filterSpots(midis, { ...filter, accidentals: 'both' })
  const cands = box.filter(sp => {
    if (spotKey(sp.s, sp.f) === spotKey(anchor.s, anchor.f)) return false
    if (spotKey(sp.s, sp.f) === avoidKey) return false
    const diff = sp.midi - anchor.midi
    if (diff === 12) return true
    const iv = ((diff % 12) + 12) % 12
    return diff > 0 && diff <= 14 && allowedSemis.has(iv)
  })
  const fallback = cands.length
    ? cands
    : box.filter(sp => spotKey(sp.s, sp.f) !== spotKey(anchor.s, anchor.f) && ((sp.midi - anchor.midi + 120) % 12) !== 0)
  const chosen = (fallback.length ? fallback : box)[Math.floor(rnd() * Math.max(1, (fallback.length ? fallback : box).length))]
    ?? { s: Math.min(midis.length - 1, anchor.s + 1), f: anchor.f + 2, midi: anchor.midi + 7, pc: (anchor.pc + 7) % 12 }
  const info = intervalLabelFromRoot(chosen.midi, anchor.midi)
  return { spot: chosen, ...info }
}

// ---------- Triads Lens Helpers ----------

export interface TriadChallenge {
  symbol: string
  rootPc: number
  quality: 'maj' | 'min'
  /** Exact 3 spots on 3 adjacent strings inside the chunk! */
  spots: FretSpot[]
  labels: string[]
  stringSetLabel: string
}

/** Build a playable 3-string closed triad challenge inside [fromFret, toFret] & active strings. */
export function buildTriadChallenge(
  midis: number[],
  rootPc: number,
  quality: 'maj' | 'min',
  filter: GameFilter,
  rnd = Math.random,
): TriadChallenge {
  const n = midis.length
  const r = ((rootPc % 12) + 12) % 12
  const third = (r + (quality === 'maj' ? 4 : 3)) % 12
  const fifth = (r + 7) % 12
  const tones = [r, third, fifth]
  const toneLabels: Record<number, string> = { [r]: 'R', [third]: quality === 'maj' ? '3' : '♭3', [fifth]: '5' }
  const symbol = `${SHARPS[r]}${quality === 'min' ? 'm' : ''}`

  // Pick a 3-string adjacent group compatible with filter.strings
  const groups: number[][] = []
  for (let s = 0; s <= n - 3; s++) groups.push([s, s + 1, s + 2])
  const matchingGroups = filter.strings.length >= 3
    ? groups.filter(g => g.every(s => filter.strings.includes(s)))
    : filter.strings.length > 0
      ? groups.filter(g => g.some(s => filter.strings.includes(s)))
      : groups
  const pickedGroup = (matchingGroups.length ? matchingGroups : groups)[
    Math.floor(rnd() * Math.max(1, (matchingGroups.length ? matchingGroups : groups).length))
  ] ?? [Math.max(0, n - 3), Math.max(0, n - 2), n - 1]

  // Find a compact 3-note grip (fret span <= 4) within [fromFret, toFret] (or 0..12 fallback)
  const searchGrip = (fMin: number, fMax: number): FretSpot[] | null => {
    const candidates: FretSpot[][] = []
    for (let f0 = fMin; f0 <= fMax; f0++) {
      const p0 = (midis[pickedGroup[0]] + f0) % 12
      if (!tones.includes(p0)) continue
      for (let f1 = Math.max(fMin, f0 - 3); f1 <= Math.min(fMax, f0 + 3); f1++) {
        const p1 = (midis[pickedGroup[1]] + f1) % 12
        if (!tones.includes(p1) || p1 === p0) continue
        const need = tones.find(t => t !== p0 && t !== p1)!
        for (let f2 = Math.max(fMin, Math.min(f0, f1) - 3); f2 <= Math.min(fMax, Math.max(f0, f1) + 3); f2++) {
          const p2 = (midis[pickedGroup[2]] + f2) % 12
          if (p2 !== need) continue
          const span = Math.max(f0, f1, f2) - Math.min(f0, f1, f2)
          if (span <= 4) {
            candidates.push([
              { s: pickedGroup[0], f: f0, midi: midis[pickedGroup[0]] + f0, pc: p0 },
              { s: pickedGroup[1], f: f1, midi: midis[pickedGroup[1]] + f1, pc: p1 },
              { s: pickedGroup[2], f: f2, midi: midis[pickedGroup[2]] + f2, pc: p2 },
            ])
          }
        }
      }
    }
    return candidates.length ? candidates[Math.floor(rnd() * candidates.length)] : null
  }

  const spots = searchGrip(filter.fromFret, filter.toFret) ?? searchGrip(0, 12) ?? [
    { s: pickedGroup[0], f: 0, midi: midis[pickedGroup[0]], pc: midis[pickedGroup[0]] % 12 },
  ]
  const stringSetLabel = pickedGroup.map(s => SHARPS[midis[s] % 12]).join('–')
  return {
    symbol,
    rootPc: r,
    quality,
    spots,
    labels: spots.map(sp => toneLabels[sp.pc] ?? SHARPS[sp.pc]),
    stringSetLabel,
  }
}

// ---------- Persistence & Cloud Sync Merge ----------

const STORAGE_KEY = 'kg:fretGame'

export function emptyRecords(): BestRecords {
  return {
    blitzScore: 0,
    survivalWave: 0,
    survivalScore: 0,
    gauntletBpm: 60,
    sniperClears: 0,
    bestCombo: 0,
    dailyStreak: 0,
  }
}

export function emptyFretGameData(): FretGameData {
  return {
    heat: {},
    records: emptyRecords(),
    totalHits: 0,
    totalSessions: 0,
    updatedAt: 0,
  }
}

export function tuningKey(inst: Pick<Instrument, 'id' | 'tuning'>): string {
  return `${inst.id}:${inst.tuning.id}`
}

export function spotKey(s: number, f: number): string {
  return `${s}:${f}`
}

export function loadFretGame(): FretGameData {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<FretGameData> | null
    if (raw && typeof raw === 'object') {
      return {
        heat: raw.heat && typeof raw.heat === 'object' ? raw.heat : {},
        records: { ...emptyRecords(), ...(raw.records ?? {}) },
        totalHits: typeof raw.totalHits === 'number' ? raw.totalHits : 0,
        totalSessions: typeof raw.totalSessions === 'number' ? raw.totalSessions : 0,
        updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0,
      }
    }
  } catch { /* fall through */ }
  return emptyFretGameData()
}

export function saveFretGame(data: FretGameData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, updatedAt: Date.now() }))
  } catch { /* storage full */ }
}

/** Merge two FretGameData blobs cleanly for Phone ↔ Tablet cloud sync. */
export function mergeFretGameData(a: Partial<FretGameData> | null | undefined, b: Partial<FretGameData> | null | undefined): FretGameData {
  const out = emptyFretGameData()
  const ha = a?.heat ?? {}
  const hb = b?.heat ?? {}
  const tunings = new Set([...Object.keys(ha), ...Object.keys(hb)])
  for (const tk of tunings) {
    const ma = ha[tk] ?? {}
    const mb = hb[tk] ?? {}
    const spots = new Set([...Object.keys(ma), ...Object.keys(mb)])
    const merged: Record<string, FretStat> = {}
    for (const sk of spots) {
      const sa = ma[sk]
      const sb = mb[sk]
      if (!sa) { merged[sk] = sb; continue }
      if (!sb) { merged[sk] = sa; continue }
      const seen = Math.max(sa.seen, sb.seen)
      const newer = (sa.lastAt ?? 0) >= (sb.lastAt ?? 0) ? sa : sb
      merged[sk] = {
        seen,
        right: Math.max(sa.right, sb.right),
        wrong: Math.max(sa.wrong, sb.wrong),
        avgMs: newer.avgMs,
        bestMs: Math.min(sa.bestMs || 99999, sb.bestMs || 99999),
        lastAt: Math.max(sa.lastAt || 0, sb.lastAt || 0),
        streak: newer.streak,
      }
    }
    out.heat[tk] = merged
  }
  const ra = { ...emptyRecords(), ...(a?.records ?? {}) }
  const rb = { ...emptyRecords(), ...(b?.records ?? {}) }
  out.records = {
    blitzScore: Math.max(ra.blitzScore, rb.blitzScore),
    survivalWave: Math.max(ra.survivalWave, rb.survivalWave),
    survivalScore: Math.max(ra.survivalScore, rb.survivalScore),
    gauntletBpm: Math.max(ra.gauntletBpm, rb.gauntletBpm),
    sniperClears: Math.max(ra.sniperClears, rb.sniperClears),
    bestCombo: Math.max(ra.bestCombo, rb.bestCombo),
    dailyStreak: Math.max(ra.dailyStreak, rb.dailyStreak),
    lastDailyDay: (ra.lastDailyDay ?? '') >= (rb.lastDailyDay ?? '') ? ra.lastDailyDay : rb.lastDailyDay,
  }
  out.totalHits = Math.max(a?.totalHits ?? 0, b?.totalHits ?? 0)
  out.totalSessions = Math.max(a?.totalSessions ?? 0, b?.totalSessions ?? 0)
  out.updatedAt = Math.max(a?.updatedAt ?? 0, b?.updatedAt ?? 0)
  return out
}

export function displayPc(p: number, acc: AccidentalMode = 'both', preferFlat = false): string {
  const n = ((p % 12) + 12) % 12
  if (NATURAL_PCS.has(n)) return SHARPS[n]
  if (acc === 'sharps') return SHARPS[n]
  if (acc === 'flats') return FLATS[n]
  if (acc === 'both') return preferFlat ? FLATS[n] : SHARPS[n]
  return SHARPS[n]
}

export function fullPcLabel(p: number): string {
  const n = ((p % 12) + 12) % 12
  return SHARPS[n] === FLATS[n] ? SHARPS[n] : `${SHARPS[n]}/${FLATS[n]}`
}

export function friendlyStringLabel(midis: number[], s: number): string {
  const name = SHARPS[((midis[s] % 12) + 12) % 12]
  if (midis.length === 6 && midis[0] % 12 === 4 && midis[5] % 12 === 4) {
    if (s === 0) return 'Low E (6th)'
    if (s === 5) return 'High e (1st)'
  }
  const num = midis.length - s
  const ord = num === 1 ? '1st' : num === 2 ? '2nd' : num === 3 ? '3rd' : `${num}th`
  return `${name} (${ord})`
}

export function fretHeat(stat: FretStat | undefined): HeatTier {
  if (!stat || stat.seen === 0) return 'unseen'
  const acc = stat.right / Math.max(1, stat.seen)
  if (acc < 0.7 || stat.avgMs > 2800) return 'red'
  if (acc < 0.9 || stat.avgMs > 1400) return 'amber'
  if (acc >= 0.95 && stat.seen >= 4 && stat.avgMs <= 950) return 'gold'
  return 'green'
}

export function recordFretResult(
  data: FretGameData,
  tKey: string,
  s: number,
  f: number,
  ok: boolean,
  ms: number,
): FretGameData {
  const clampedMs = Math.max(150, Math.min(12000, Math.round(ms)))
  const map = { ...(data.heat[tKey] ?? {}) }
  const key = spotKey(s, f)
  const prev = map[key]
  const next: FretStat = prev
    ? {
        seen: prev.seen + 1,
        right: prev.right + (ok ? 1 : 0),
        wrong: prev.wrong + (ok ? 0 : 1),
        avgMs: ok ? Math.round(prev.avgMs * 0.65 + clampedMs * 0.35) : Math.round(Math.max(prev.avgMs, clampedMs)),
        bestMs: ok ? Math.min(prev.bestMs || clampedMs, clampedMs) : prev.bestMs,
        lastAt: Date.now(),
        streak: ok ? prev.streak + 1 : 0,
      }
    : {
        seen: 1,
        right: ok ? 1 : 0,
        wrong: ok ? 0 : 1,
        avgMs: clampedMs,
        bestMs: ok ? clampedMs : 0,
        lastAt: Date.now(),
        streak: ok ? 1 : 0,
      }
  map[key] = next
  return {
    ...data,
    heat: { ...data.heat, [tKey]: map },
    totalHits: data.totalHits + (ok ? 1 : 0),
    updatedAt: Date.now(),
  }
}

export function filterSpots(midis: number[], filter: GameFilter): FretSpot[] {
  const strs = filter.strings.length
    ? filter.strings.filter(s => s >= 0 && s < midis.length)
    : midis.map((_, i) => i)
  const out: FretSpot[] = []
  for (const s of strs) {
    for (let f = filter.fromFret; f <= filter.toFret; f++) {
      const midi = midis[s] + f
      const p = ((midi % 12) + 12) % 12
      if (filter.accidentals === 'natural' && !NATURAL_PCS.has(p)) continue
      out.push({ s, f, midi, pc: p })
    }
  }
  return out
}

export function stageSpots(midis: number[], stageId: number): FretSpot[] {
  const n = midis.length
  const out: FretSpot[] = []
  if (stageId === 1) {
    for (let s = 0; s < n; s++) {
      for (const f of LANDMARK_FRETS) {
        const midi = midis[s] + f
        out.push({ s, f, midi, pc: ((midi % 12) + 12) % 12 })
      }
    }
    return out
  }
  if (stageId === 2) {
    const low = n >= 2 ? [0, 1] : [0]
    return filterSpots(midis, { fromFret: 0, toFret: 12, strings: low, accidentals: 'both' })
  }
  if (stageId === 3) {
    const upper = []
    for (let s = Math.min(2, n - 1); s < n; s++) upper.push(s)
    return filterSpots(midis, { fromFret: 0, toFret: 12, strings: upper, accidentals: 'natural' })
  }
  if (stageId === 4) {
    return filterSpots(midis, { fromFret: 0, toFret: 12, strings: [], accidentals: 'natural' })
  }
  return filterSpots(midis, { fromFret: 0, toFret: 12, strings: [], accidentals: 'both' })
}

export function spotsMastery(spots: FretSpot[], heatMap: Record<string, FretStat> | undefined): {
  pct: number
  green: number
  gold: number
  amber: number
  red: number
  unseen: number
  avgMs: number
} {
  let green = 0, gold = 0, amber = 0, red = 0, unseen = 0
  let msSum = 0, msCount = 0
  let score = 0
  for (const sp of spots) {
    const st = heatMap?.[spotKey(sp.s, sp.f)]
    const tier = fretHeat(st)
    if (tier === 'gold') { gold++; green++; score += 1 }
    else if (tier === 'green') { green++; score += 1 }
    else if (tier === 'amber') { amber++; score += 0.55 }
    else if (tier === 'red') { red++; score += 0.15 }
    else unseen++
    if (st && st.seen > 0 && st.avgMs > 0) { msSum += st.avgMs; msCount++ }
  }
  const pct = spots.length ? Math.round((score / spots.length) * 100) : 0
  return { pct, green, gold, amber, red, unseen, avgMs: msCount ? Math.round(msSum / msCount) : 0 }
}

export function weakestSpots(spots: FretSpot[], heatMap: Record<string, FretStat> | undefined, limit = 18): FretSpot[] {
  const scored = spots.map(sp => {
    const st = heatMap?.[spotKey(sp.s, sp.f)]
    if (!st || st.seen === 0) return { sp, priority: 2 }
    const tier = fretHeat(st)
    const acc = st.right / Math.max(1, st.seen)
    const prio =
      tier === 'red' ? 10 + (1 - acc) * 5 + Math.min(5, st.avgMs / 1000)
        : tier === 'amber' ? 5 + (1 - acc) * 3 + Math.min(3, st.avgMs / 1500)
          : tier === 'green' ? 0.6
            : 0.2
    return { sp, priority: prio }
  })
  scored.sort((a, b) => b.priority - a.priority)
  return scored.slice(0, Math.min(limit, scored.length)).map(x => x.sp)
}

export function pickWeightedSpot(
  spots: FretSpot[],
  heatMap: Record<string, FretStat> | undefined,
  avoidKey = '',
  rnd = Math.random,
  weakOnly = false,
): FretSpot {
  const base = weakOnly ? weakestSpots(spots, heatMap, Math.max(8, Math.ceil(spots.length * 0.35))) : spots
  const pool = base.length > 1 ? base.filter(sp => spotKey(sp.s, sp.f) !== avoidKey) : base
  if (!pool.length) return spots[0]
  const now = Date.now()
  const weights = pool.map(sp => {
    const st = heatMap?.[spotKey(sp.s, sp.f)]
    if (!st || st.seen === 0) return 4.5
    const tier = fretHeat(st)
    const daysSince = Math.max(0, (now - (st.lastAt || 0)) / 86400000)
    const decay = Math.min(3, daysSince * 0.45)
    if (tier === 'red') return 9 + decay
    if (tier === 'amber') return 4.5 + decay
    if (tier === 'green') return 1.2 + decay * 0.5
    return 0.5 + decay * 0.25
  })
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rnd() * total
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]
    if (r <= 0) return pool[i]
  }
  return pool[pool.length - 1]
}

export function pickOctavePair(
  midis: number[],
  heatMap: Record<string, FretStat> | undefined,
  avoidTargetKey = '',
  rnd = Math.random,
): { anchor: FretSpot; target: FretSpot; shapeTip: string } {
  const pairs: { anchor: FretSpot; target: FretSpot; shapeTip: string }[] = []
  for (let s1 = 0; s1 < midis.length - 1; s1++) {
    for (let f1 = 0; f1 <= 10; f1++) {
      const m1 = midis[s1] + f1
      const p1 = ((m1 % 12) + 12) % 12
      for (let s2 = s1 + 1; s2 < Math.min(midis.length, s1 + 4); s2++) {
        const f2 = m1 + 12 - midis[s2]
        if (f2 >= 0 && f2 <= 14) {
          const df = f2 - f1
          const ds = s2 - s1
          const dir = df === 0 ? 'same fret' : df > 0 ? `${df} fret${df === 1 ? '' : 's'} UP` : `${Math.abs(df)} fret${Math.abs(df) === 1 ? '' : 's'} DOWN`
          pairs.push({
            anchor: { s: s1, f: f1, midi: m1, pc: p1 },
            target: { s: s2, f: f2, midi: m1 + 12, pc: p1 },
            shapeTip: `${ds} string${ds === 1 ? '' : 's'} higher, ${dir}`,
          })
        }
      }
    }
  }
  if (!pairs.length) {
    const sp: FretSpot = { s: 0, f: 0, midi: midis[0], pc: midis[0] % 12 }
    return { anchor: sp, target: { ...sp, f: 12, midi: midis[0] + 12 }, shapeTip: '12 frets up = exact octave' }
  }
  const filtered = pairs.length > 1 ? pairs.filter(p => spotKey(p.target.s, p.target.f) !== avoidTargetKey) : pairs
  const weights = filtered.map(p => {
    const tier = fretHeat(heatMap?.[spotKey(p.target.s, p.target.f)])
    return tier === 'red' ? 8 : tier === 'amber' ? 4 : tier === 'unseen' ? 3 : 1
  })
  const sum = weights.reduce((a, b) => a + b, 0)
  let r = rnd() * sum
  for (let i = 0; i < filtered.length; i++) {
    r -= weights[i]
    if (r <= 0) return filtered[i]
  }
  return filtered[filtered.length - 1]
}

export function spotsForPc(midis: number[], targetPc: number, fromFret = 0, toFret = 12, onePerString = false): FretSpot[] {
  const p = ((targetPc % 12) + 12) % 12
  const out: FretSpot[] = []
  for (let s = 0; s < midis.length; s++) {
    for (let f = fromFret; f <= toFret; f++) {
      const midi = midis[s] + f
      if (((midi % 12) + 12) % 12 === p) {
        out.push({ s, f, midi, pc: p })
        if (onePerString) break
      }
    }
  }
  return out
}

export function octaveConstellationLinks(spots: FretSpot[]): { s1: number; f1: number; s2: number; f2: number }[] {
  const sorted = [...spots].sort((a, b) => a.s - b.s || a.f - b.f)
  const links: { s1: number; f1: number; s2: number; f2: number }[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    if (Math.abs(a.f - b.f) <= 5) {
      links.push({ s1: a.s, f1: a.f, s2: b.s, f2: b.f })
    }
  }
  return links
}

export function shortcutTip(midis: number[], spot: FretSpot): string {
  const name = fullPcLabel(spot.pc)
  if (spot.f === 0) return `${name} is the open ${friendlyStringLabel(midis, spot.s)} string.`
  if (spot.f === 12) return `Fret 12 is always the double-dot octave of the open string (${name}).`
  const nearDot = LANDMARK_FRETS.find(d => d > 0 && Math.abs(d - spot.f) <= 1)
  if (nearDot !== undefined && nearDot === spot.f) {
    return `${name} sits right on the fret-${spot.f} dot on the ${friendlyStringLabel(midis, spot.s)} string.`
  }
  if (midis.length === 6 && spot.s >= 2) {
    for (const anchorS of [0, 1]) {
      const fAnchor = spot.midi - 12 - midis[anchorS]
      if (fAnchor >= 0 && fAnchor <= 12) {
        const sName = anchorS === 0 ? 'Low E' : 'A'
        return `Octave trick: find ${name} on ${sName} fret ${fAnchor} → jump to ${friendlyStringLabel(midis, spot.s)} fret ${spot.f}.`
      }
    }
    if (spot.s === 5) {
      return `High e matches Low E! Same fret ${spot.f} on both outside strings = ${name}.`
    }
  }
  if (spot.pc === 5) return `E→F has no sharp in between — ${name} is just 1 fret above E!`
  if (spot.pc === 0) return `B→C has no sharp in between — ${name} is just 1 fret above B!`
  if (nearDot !== undefined) {
    const dir = spot.f > nearDot ? '1 fret above' : '1 fret below'
    return `Landmark: ${name} is ${dir} the fret-${nearDot} dot on ${friendlyStringLabel(midis, spot.s)}.`
  }
  return `${name} is on ${friendlyStringLabel(midis, spot.s)}, fret ${spot.f}.`
}

// ---------- Chord Tones / Solo Changes Goal Builder ----------

export interface SoloGoal {
  chordSymbol: string
  rootPc: number
  chordMidis: number[]
  intervals: number[]
  labels: string[]
  targetPcs: number[]
  fromFret: number
  toFret: number
}

export type SoloLevel = 'triads' | 'sevenths' | 'color' | 'random3'

export const SOLO_LEVELS: { id: SoloLevel; label: string; desc: string }[] = [
  { id: 'triads', label: 'Triads (R-3-5)', desc: 'Core chord tones in order over every chord' },
  { id: 'sevenths', label: '7th Chords (R-3-5-7)', desc: 'Full 4-note chord arpeggio inside your box' },
  { id: 'color', label: 'Guide + Color (3-5-7-9)', desc: 'Target the juicy upper tones pros solo with' },
  { id: 'random3', label: 'Mixed Intervals', desc: '3 shuffled chord tones — breaks box autopilot!' },
]

export function buildSoloGoal(
  chord: Pick<ProgChord, 'root' | 'type' | 'symbol'>,
  level: SoloLevel,
  fromFret: number,
  toFret: number,
  rnd = Math.random,
): SoloGoal {
  const rootPc = pc(chord.root)
  const rawTones = typeTones(chord.type)
  const third = rawTones.find(t => t === 3 || t === 4) ?? 4
  const fifth = rawTones.find(t => t === 6 || t === 7 || t === 8) ?? 7
  const seventh = rawTones.find(t => t === 9 || t === 10 || t === 11) ?? (third === 4 ? 11 : 10)
  const ninth = 2

  let intervals: number[]
  if (level === 'triads') intervals = [0, third, fifth]
  else if (level === 'sevenths') intervals = [0, third, fifth, seventh]
  else if (level === 'color') intervals = [third, fifth, seventh, ninth]
  else {
    const pool = [0, third, fifth, seventh]
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    intervals = pool.slice(0, 3)
  }

  const labelFor = (iv: number) => (iv === 2 && level === 'color' ? '9' : INTERVAL_LABELS[((iv % 12) + 12) % 12])
  const labels = intervals.map(labelFor)
  const targetPcs = intervals.map(iv => (rootPc + iv) % 12)
  const baseMidi = 48 + rootPc
  const chordMidis = [baseMidi, baseMidi + fifth, baseMidi + 12 + third, ...(level === 'triads' ? [] : [baseMidi + seventh])]

  return { chordSymbol: chord.symbol, rootPc, chordMidis, intervals, labels, targetPcs, fromFret, toFret }
}

export function calcHitPoints(ms: number, comboAfter: number): { points: number; mult: number; badge: string } {
  const mult = comboAfter >= 15 ? 5 : comboAfter >= 10 ? 4 : comboAfter >= 6 ? 3 : comboAfter >= 3 ? 2 : 1
  const speedBonus = ms <= 900 ? 50 : ms <= 1500 ? 25 : 0
  const badge = ms <= 900 ? '⚡ LIGHTNING' : ms <= 1500 ? '🔥 FAST' : '✓ HIT'
  return { points: (50 + speedBonus) * mult, mult, badge }
}

export function sessionGrade(accuracyPct: number, avgMs: number): 'S' | 'A' | 'B' | 'C' {
  if (accuracyPct >= 95 && avgMs > 0 && avgMs <= 1300) return 'S'
  if (accuracyPct >= 88 && (avgMs === 0 || avgMs <= 2100)) return 'A'
  if (accuracyPct >= 75) return 'B'
  return 'C'
}

export function speakPrompt(text: string): void {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1.08
    u.pitch = 1.0
    window.speechSynthesis.speak(u)
  } catch { /* ignore */ }
}

export function spokenNote(label: string): string {
  return label.replace(/#/g, ' sharp').replace(/b|♭/g, ' flat').replace(/\//g, ' or ')
}

// ---------- Endless Mode (6-String Arcade Lane Defense) ----------

export interface RushOrb {
  id: number
  spot: FretSpot
  /** Label drawn inside the orb (e.g. 'A', '♭3', '5', '👂 ?') — NEVER a fret number! */
  label: string
  /** Optional subtitle / interval tag */
  sub?: string
  /** True when the orb represents a mode color note (cyan glow) */
  isColor?: boolean
  /** Progress from right (100) toward the shield on the left (0) */
  x: number
  /** Units per second toward 0 */
  speed: number
  spawnedAt: number
}

export interface RushBoss {
  id: number
  title: string
  label: string
  spots: FretSpot[]
  found: string[]
  x: number
  speed: number
  spawnedAt: number
}

export interface RushWaveSpec {
  wave: number
  title: string
  fromFret: number
  toFret: number
  strings: number[]
  accidentals: AccidentalMode
  maxConcurrent: number
  speedPerSec: number
  isBoss: boolean
}

export function rushWaveSpec(wave: number, nStr: number): RushWaveSpec {
  const w = Math.max(1, wave)
  const isBoss = w % 5 === 0
  if (isBoss) {
    return {
      wave: w,
      title: `👑 Wave ${w} · Boss Wave`,
      fromFret: 0,
      toFret: 11,
      strings: [],
      accidentals: w >= 10 ? 'both' : 'natural',
      maxConcurrent: 1,
      speedPerSec: Math.min(5.0, 2.9 + (w / 5 - 1) * 0.45),
      isBoss: true,
    }
  }
  if (w === 1) {
    return { wave: w, title: 'Wave 1 · Bass Warm-Up', fromFret: 0, toFret: 5, strings: nStr >= 2 ? [0, 1] : [0], accidentals: 'natural', maxConcurrent: 1, speedPerSec: 10.0, isBoss: false }
  }
  if (w === 2) {
    return { wave: w, title: 'Wave 2 · Low Strings (0–7)', fromFret: 0, toFret: 7, strings: nStr >= 3 ? [0, 1, 2] : [], accidentals: 'natural', maxConcurrent: 1, speedPerSec: 11.5, isBoss: false }
  }
  if (w === 3) {
    return { wave: w, title: 'Wave 3 · All Strings (0–7)', fromFret: 0, toFret: 7, strings: [], accidentals: 'natural', maxConcurrent: 1, speedPerSec: 13.0, isBoss: false }
  }
  if (w === 4) {
    return { wave: w, title: 'Wave 4 · Full Neck Naturals', fromFret: 0, toFret: 12, strings: [], accidentals: 'natural', maxConcurrent: 2, speedPerSec: 13.5, isBoss: false }
  }
  return {
    wave: w,
    title: `Wave ${w} · Full Speed`,
    fromFret: 0,
    toFret: 12,
    strings: [],
    accidentals: 'both',
    maxConcurrent: 2,
    speedPerSec: Math.min(24, 14.0 + (w - 5) * 1.05),
    isBoss: false,
  }
}

export function matchRushAttempt(
  orbs: RushOrb[],
  boss: RushBoss | null,
  attempt: { s?: number; f?: number; midi?: number },
  opts?: {
    singleTrack?: boolean
    midis?: number[]
    fromFret?: number
    toFret?: number
    allowedStrings?: number[]
  },
): { kind: 'orb'; orb: RushOrb; hitSpot?: FretSpot } | { kind: 'boss'; spot: FretSpot } | null {
  if (boss) {
    const foundSet = new Set(boss.found)
    const remaining = boss.spots.filter(sp => !foundSet.has(spotKey(sp.s, sp.f)))
    let match: FretSpot | undefined
    if (attempt.s !== undefined && attempt.f !== undefined) {
      match = remaining.find(sp => sp.s === attempt.s && sp.f === attempt.f)
    } else if (attempt.midi !== undefined) {
      match = remaining.find(sp => sp.midi === attempt.midi)
        ?? remaining.find(sp => Math.abs(sp.midi - attempt.midi!) === 12)
    }
    return match ? { kind: 'boss', spot: match } : null
  }
  const sorted = [...orbs].sort((a, b) => a.x - b.x)
  for (const orb of sorted) {
    if (attempt.s !== undefined && attempt.f !== undefined) {
      if (opts?.singleTrack && opts.midis) {
        const inFret = (opts.fromFret === undefined || attempt.f >= opts.fromFret)
          && (opts.toFret === undefined || attempt.f <= opts.toFret)
        const inStr = !opts.allowedStrings?.length || opts.allowedStrings.includes(attempt.s)
        const m = opts.midis[attempt.s] + attempt.f
        const ap = ((m % 12) + 12) % 12
        if (inFret && inStr && ap === orb.spot.pc) {
          return { kind: 'orb', orb, hitSpot: { s: attempt.s, f: attempt.f, midi: m, pc: ap } }
        }
      } else if (orb.spot.s === attempt.s && orb.spot.f === attempt.f) {
        return { kind: 'orb', orb, hitSpot: orb.spot }
      }
    } else if (attempt.midi !== undefined) {
      if (opts?.singleTrack) {
        const ap = ((attempt.midi % 12) + 12) % 12
        if (ap === orb.spot.pc) {
          let hitSpot = orb.spot
          if (opts.midis) {
            const cands = spotsForPc(opts.midis, ap, opts.fromFret ?? 0, opts.toFret ?? 12)
              .filter(sp => !opts.allowedStrings?.length || opts.allowedStrings.includes(sp.s))
            hitSpot = cands.find(sp => sp.midi === attempt.midi)
              ?? cands.find(sp => sp.midi < 52 && sp.midi + 12 === attempt.midi)
              ?? cands[0]
              ?? orb.spot
          }
          return { kind: 'orb', orb, hitSpot }
        }
      } else if (orb.spot.midi === attempt.midi || (orb.spot.midi < 52 && attempt.midi === orb.spot.midi + 12)) {
        return { kind: 'orb', orb, hitSpot: orb.spot }
      }
    }
  }
  return null
}
