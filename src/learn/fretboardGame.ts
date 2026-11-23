// Fretboard Mastery Game engine: structured 6-stage curriculum + endless arcade modes,
// per-fret speed & accuracy heatmap, spaced-repetition weak-spot targeting, Circle-of-4ths
// Metronome Gauntlet, Octave Constellation Sniper, Tom Quayle Solo-style Interval/Changes
// trainer, smart coaching shortcuts on misses, and Phone ↔ Tablet sync-safe persistence.
import { FLATS, INTERVAL_LABELS, SHARPS, pc } from '../theory/notes'
import { typeTones, type ProgChord } from '../theory/progressions'
import type { Instrument } from '../instrument'

export type GameMode =
  | 'path'
  | 'survival'
  | 'blitz'
  | 'gauntlet'
  | 'sniper'
  | 'solo'
  | 'name'
  | 'daily'

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
  unlockMastery: number // previous stage % needed (0 for stage 1)
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
    title: 'Stage 6 · Solo Intervals & Changes',
    short: 'Solo Pro',
    goal: 'Find 3rds, 5ths, 7ths & 9ths over live chord changes',
    why: 'Turns note names into real improvisation — think in musical colors, not scale boxes.',
    accent: '#ec4899',
    kind: 'intervals',
    unlockMastery: 60,
  },
]

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

/** Display a pitch class cleanly according to the selected accidental mode. */
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

/** Friendly spoken string name for Voice Callouts ("low E", "A", "D", "G", "B", "high e"). */
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

/** Classify a fret's mastery heat tier from accuracy + reaction speed. */
export function fretHeat(stat: FretStat | undefined): HeatTier {
  if (!stat || stat.seen === 0) return 'unseen'
  const acc = stat.right / Math.max(1, stat.seen)
  if (acc < 0.7 || stat.avgMs > 2800) return 'red'
  if (acc < 0.9 || stat.avgMs > 1400) return 'amber'
  if (acc >= 0.95 && stat.seen >= 4 && stat.avgMs <= 950) return 'gold'
  return 'green'
}

/** Record one hit or miss for a fret and return updated FretGameData (pure). */
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
        // Exponential moving average so recent improvements turn red frets green quickly!
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

/** Enumerate all candidate FretSpots matching a filter. */
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

/** Enumerate spots belonging to a specific Campaign Stage (1..6). */
export function stageSpots(midis: number[], stageId: number): FretSpot[] {
  const n = midis.length
  const out: FretSpot[] = []
  if (stageId === 1) {
    // Open strings + dot landmarks 0, 3, 5, 7, 9, 12
    for (let s = 0; s < n; s++) {
      for (const f of LANDMARK_FRETS) {
        const midi = midis[s] + f
        out.push({ s, f, midi, pc: ((midi % 12) + 12) % 12 })
      }
    }
    return out
  }
  if (stageId === 2) {
    // Low E and A strings (or lowest 2 strings), frets 0..12
    const low = n >= 2 ? [0, 1] : [0]
    return filterSpots(midis, { fromFret: 0, toFret: 12, strings: low, accidentals: 'both' })
  }
  if (stageId === 3) {
    // Target octaves on strings 2..n-1 (D, G, B, high e), frets 0..12
    const upper = []
    for (let s = Math.min(2, n - 1); s < n; s++) upper.push(s)
    return filterSpots(midis, { fromFret: 0, toFret: 12, strings: upper, accidentals: 'natural' })
  }
  if (stageId === 4) {
    return filterSpots(midis, { fromFret: 0, toFret: 12, strings: [], accidentals: 'natural' })
  }
  // Stage 5 & 6 cover full chromatic neck 0..12
  return filterSpots(midis, { fromFret: 0, toFret: 12, strings: [], accidentals: 'both' })
}

/** Compute mastery % (0..100) for a given list of spots. */
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

/** Return the weakest (red/amber/slowest) spots in a pool for "Drill My Weak Spots". */
export function weakestSpots(spots: FretSpot[], heatMap: Record<string, FretStat> | undefined, limit = 18): FretSpot[] {
  const scored = spots.map(sp => {
    const st = heatMap?.[spotKey(sp.s, sp.f)]
    if (!st || st.seen === 0) return { sp, priority: 2 } // unseen = medium priority
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

/** Spaced-repetition weighted spot picker: drills weak & overdue spots much more often. */
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

/** For Stage 3 (Octave Web): pick an anchor spot on a lower string and its target octave 1–3 strings higher. */
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
  // Weight by weakness of the target spot
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

/** All places a pitch class lives on the neck within [fromFret, toFret] (one per string for 0..11, or all in range). */
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

/** Build glowing octave constellation edges connecting spots of the same note across adjacent strings. */
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

/** Plain-English coaching shortcut shown when a player misses a note so every miss teaches! */
export function shortcutTip(midis: number[], spot: FretSpot): string {
  const name = fullPcLabel(spot.pc)
  if (spot.f === 0) return `${name} is the open ${friendlyStringLabel(midis, spot.s)} string.`
  if (spot.f === 12) return `Fret 12 is always the double-dot octave of the open string (${name}).`
  // Check nearest dot landmark (3, 5, 7, 9, 12)
  const nearDot = LANDMARK_FRETS.find(d => d > 0 && Math.abs(d - spot.f) <= 1)
  if (nearDot !== undefined && nearDot === spot.f) {
    return `${name} sits right on the fret-${spot.f} dot on the ${friendlyStringLabel(midis, spot.s)} string.`
  }
  // Standard guitar octave shortcut from Low E or A
  if (midis.length === 6 && spot.s >= 2) {
    // Find lower octave on Low E or A
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
  // Natural half-step anchor (B-C or E-F)
  if (spot.pc === 5) return `E→F has no sharp in between — ${name} is just 1 fret above E!`
  if (spot.pc === 0) return `B→C has no sharp in between — ${name} is just 1 fret above B!`
  if (nearDot !== undefined) {
    const dir = spot.f > nearDot ? '1 fret above' : '1 fret below'
    return `Landmark: ${name} is ${dir} the fret-${nearDot} dot on ${friendlyStringLabel(midis, spot.s)}.`
  }
  return `${name} is on ${friendlyStringLabel(midis, spot.s)}, fret ${spot.f}.`
}

// ---------- Solo Mode (Tom Quayle-style Interval & Chord Changes Trainer) ----------

export interface SoloGoal {
  chordSymbol: string
  rootPc: number
  chordMidis: number[]
  /** Interval semitones (0..11) to play in order */
  intervals: number[]
  /** Pretty labels like ['R', '3', '5', '7'] */
  labels: string[]
  /** Target pitch classes matching each interval */
  targetPcs: number[]
  /** Recommended 5-fret zone */
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

/** Build one Solo-mode interval challenge for a given chord inside [fromFret, toFret]. */
export function buildSoloGoal(
  chord: Pick<ProgChord, 'root' | 'type' | 'symbol'>,
  level: SoloLevel,
  fromFret: number,
  toFret: number,
  rnd = Math.random,
): SoloGoal {
  const rootPc = pc(chord.root)
  const rawTones = typeTones(chord.type) // e.g. [0, 4, 7] or [0, 3, 7, 10]
  const third = rawTones.find(t => t === 3 || t === 4) ?? 4
  const fifth = rawTones.find(t => t === 6 || t === 7 || t === 8) ?? 7
  const seventh = rawTones.find(t => t === 9 || t === 10 || t === 11) ?? (third === 4 ? 11 : 10)
  const ninth = 2 // major 9th

  let intervals: number[]
  if (level === 'triads') {
    intervals = [0, third, fifth]
  } else if (level === 'sevenths') {
    intervals = [0, third, fifth, seventh]
  } else if (level === 'color') {
    intervals = [third, fifth, seventh, ninth]
  } else {
    const pool = [0, third, fifth, seventh]
    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    intervals = pool.slice(0, 3)
  }

  const labelFor = (iv: number) => (iv === 2 && level === 'color' ? '9' : INTERVAL_LABELS[((iv % 12) + 12) % 12])
  const labels = intervals.map(labelFor)
  const targetPcs = intervals.map(iv => (rootPc + iv) % 12)
  // Soft voicing midis for the backing pad strum
  const baseMidi = 48 + rootPc
  const chordMidis = [baseMidi, baseMidi + fifth, baseMidi + 12 + third, ...(level === 'triads' ? [] : [baseMidi + seventh])]

  return {
    chordSymbol: chord.symbol,
    rootPc,
    chordMidis,
    intervals,
    labels,
    targetPcs,
    fromFret,
    toFret,
  }
}

/** Score calculation with combo multiplier + lightning speed bonus. */
export function calcHitPoints(ms: number, comboAfter: number): { points: number; mult: number; badge: string } {
  const mult = comboAfter >= 15 ? 5 : comboAfter >= 10 ? 4 : comboAfter >= 6 ? 3 : comboAfter >= 3 ? 2 : 1
  const speedBonus = ms <= 900 ? 50 : ms <= 1500 ? 25 : 0
  const badge = ms <= 900 ? '⚡ LIGHTNING' : ms <= 1500 ? '🔥 FAST' : '✓ HIT'
  return { points: (50 + speedBonus) * mult, mult, badge }
}

/** Grade (S, A, B, C) from accuracy and avg speed. */
export function sessionGrade(accuracyPct: number, avgMs: number): 'S' | 'A' | 'B' | 'C' {
  if (accuracyPct >= 95 && avgMs > 0 && avgMs <= 1300) return 'S'
  if (accuracyPct >= 88 && (avgMs === 0 || avgMs <= 2100)) return 'A'
  if (accuracyPct >= 75) return 'B'
  return 'C'
}

/** Spoken text for Blindfold / Eyes-Up Voice Callout mode. */
export function speakPrompt(text: string): void {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1.08
    u.pitch = 1.0
    window.speechSynthesis.speak(u)
  } catch { /* ignore on devices without TTS */ }
}

/** Convert a note name to speech-friendly pronunciation ("F sharp", "B flat"). */
export function spokenNote(label: string): string {
  return label
    .replace(/#/g, ' sharp')
    .replace(/b|♭/g, ' flat')
    .replace(/\//g, ' or ')
}

// ---------- Note Rush / Fret Defense (Endless Arcade Lane Game) ----------

export interface RushOrb {
  id: number
  spot: FretSpot
  label: string
  /** Progress from right (100) toward the shield on the left (0) */
  x: number
  /** Units per second toward 0 */
  speed: number
  spawnedAt: number
}

export interface RushBoss {
  id: number
  pc: number
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

/** Progressive wave tuning for Endless Note Rush (Fret Defense): approachable at Wave 1, exciting forever! */
export function rushWaveSpec(wave: number, nStr: number): RushWaveSpec {
  const w = Math.max(1, wave)
  const isBoss = w % 5 === 0
  if (isBoss) {
    return {
      wave: w,
      title: `👑 Wave ${w} · Octave Boss`,
      fromFret: 0,
      toFret: 11,
      strings: [],
      accidentals: w >= 10 ? 'both' : 'natural',
      maxConcurrent: 1,
      speedPerSec: Math.min(5.2, 3.0 + (w / 5 - 1) * 0.45),
      isBoss: true,
    }
  }
  if (w === 1) {
    return {
      wave: w,
      title: 'Wave 1 · Bass Warm-Up',
      fromFret: 0,
      toFret: 5,
      strings: nStr >= 2 ? [0, 1] : [0],
      accidentals: 'natural',
      maxConcurrent: 1,
      speedPerSec: 10.5,
      isBoss: false,
    }
  }
  if (w === 2) {
    return {
      wave: w,
      title: 'Wave 2 · Low Strings (0–7)',
      fromFret: 0,
      toFret: 7,
      strings: nStr >= 3 ? [0, 1, 2] : [],
      accidentals: 'natural',
      maxConcurrent: 1,
      speedPerSec: 12,
      isBoss: false,
    }
  }
  if (w === 3) {
    return {
      wave: w,
      title: 'Wave 3 · All Strings (0–7)',
      fromFret: 0,
      toFret: 7,
      strings: [],
      accidentals: 'natural',
      maxConcurrent: 1,
      speedPerSec: 13.5,
      isBoss: false,
    }
  }
  if (w === 4) {
    return {
      wave: w,
      title: 'Wave 4 · Full Neck Naturals',
      fromFret: 0,
      toFret: 12,
      strings: [],
      accidentals: 'natural',
      maxConcurrent: 2,
      speedPerSec: 14,
      isBoss: false,
    }
  }
  return {
    wave: w,
    title: `Wave ${w} · Chromatic Rush`,
    fromFret: 0,
    toFret: 12,
    strings: [],
    accidentals: 'both',
    maxConcurrent: w >= 8 ? 2 : 2,
    speedPerSec: Math.min(26, 14.5 + (w - 5) * 1.15),
    isBoss: false,
  }
}

/** Match a touchscreen tap OR guitar mic MIDI pitch against active Note Rush orbs or Boss armor. */
export function matchRushAttempt(
  orbs: RushOrb[],
  boss: RushBoss | null,
  attempt: { s?: number; f?: number; midi?: number },
): { kind: 'orb'; orb: RushOrb } | { kind: 'boss'; spot: FretSpot } | null {
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
  // Prioritize the orb closest to the shield (smallest x)
  const sorted = [...orbs].sort((a, b) => a.x - b.x)
  for (const orb of sorted) {
    if (attempt.s !== undefined && attempt.f !== undefined) {
      if (orb.spot.s === attempt.s && orb.spot.f === attempt.f) return { kind: 'orb', orb }
    } else if (attempt.midi !== undefined) {
      if (orb.spot.midi === attempt.midi) return { kind: 'orb', orb }
    }
  }
  return null
}

