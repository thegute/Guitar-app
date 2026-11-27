// Melodic Improv Gym core engine (pure logic, 100% unit-testable):
// 6 real-time guitar improvisation games inspired by Roy Ziv's Melodic Improv Trainer, Hexatonic MasterClass,
// Modes Navigator & Paul Davids' melodic phrasing — enhanced with KGuitar's live guitar listening & 53-style AI band!
import { chordInfo } from '../tabs/harmony'
import type { Song } from '../tabs/model'
import type { SongDoc } from '../tabs/library'
import { newId } from '../tabs/library'
import { MODE_COLOR_NOTES, hexatonicArpeggios, scaleInfo } from '../theory/scales'
import { midiName, pc, SHARPS } from '../theory/notes'
import type { BrandyMood } from '../art/samurai'

export type ImprovGameId = 'sniper' | 'teleporter' | 'limit' | 'duel' | 'director' | 'hex-arps'
export type LimitRuleId = '3notes' | '2notes' | '1string' | 'space'
export type DirectorFocus = 'all' | 'melody' | 'neck' | 'rhythm'
export type TargetPreference = 'any' | 'third' | 'fifth' | 'color'

export interface ImprovGameMeta {
  id: ImprovGameId
  icon: string
  label: string
  short: string
  tagline: string
  courseTopics: string[]
}

export const IMPROV_GAMES: ImprovGameMeta[] = [
  {
    id: 'sniper',
    icon: '🎯',
    label: 'Chord-Tone Sniper',
    short: 'Sniper',
    tagline: 'Solo freely between changes — nail the glowing 3rd, 5th, 7th or 9th right when each chord hits.',
    courseTopics: ['chord-tones', 'target-notes', 'playing-the-changes', 'hexatonic', 'arpeggios'],
  },
  {
    id: 'teleporter',
    icon: '🧭',
    label: 'Neck Teleporter',
    short: 'Teleport',
    tagline: 'Skip between fretboard boxes on the beat (Box 1 → 3 → 2 → 4 → 5) with 2-beat warning arrows.',
    courseTopics: ['skipping-shapes', 'caged', 'pentatonic', 'hexatonic', 'modes'],
  },
  {
    id: 'limit',
    icon: '🔥',
    label: 'Note-Limit & Space',
    short: 'Limits',
    tagline: 'Make 2–3 notes sing, play single-string melodies, and leave real breathing room on Rest beats.',
    courseTopics: ['phrasing', 'rhythm', 'blues', 'bb-king', 'improv'],
  },
  {
    id: 'duel',
    icon: '🔁',
    label: 'Call & Response Duel',
    short: 'Duel',
    tagline: 'Trade 2-bar phrases with the band in your key & scale — echo the motif and resolve on a chord tone.',
    courseTopics: ['phrasing', 'improv', 'hexatonic', 'blues', 'pentatonic'],
  },
  {
    id: 'director',
    icon: '🎨',
    label: 'Live Solo Director',
    short: 'Director',
    tagline: 'Full-song arcade jam with fresh phrasing, neck, space & chord-tone cues queued every 4 bars!',
    courseTopics: ['improv', 'phrasing', 'chord-tones', 'hexatonic', 'modes'],
  },
  {
    id: 'hex-arps',
    icon: '✨',
    label: 'Hexatonic Arpeggios',
    short: 'Hex Arps',
    tagline: 'Unlock the 4 nested triads & 7th arpeggios hiding inside Minor Hexatonic (plus 2NPS & B.B. King Box).',
    courseTopics: ['hexatonic', 'arpeggios', 'triads', '2nps', 'bb-king'],
  },
]

export interface NeckZone {
  id: string
  boxNum: number
  label: string
  fromFret: number
  toFret: number
  midiLo: number
  midiHi: number
}

export const NECK_ZONES: NeckZone[] = [
  { id: 'box1', boxNum: 1, label: 'Zone 1 (Frets 0–4)', fromFret: 0, toFret: 4, midiLo: 40, midiHi: 68 },
  { id: 'box2', boxNum: 2, label: 'Zone 2 (Frets 3–7)', fromFret: 3, toFret: 7, midiLo: 43, midiHi: 71 },
  { id: 'box3', boxNum: 3, label: 'Zone 3 (Frets 5–9)', fromFret: 5, toFret: 9, midiLo: 45, midiHi: 73 },
  { id: 'box4', boxNum: 4, label: 'Zone 4 (Frets 7–11)', fromFret: 7, toFret: 11, midiLo: 47, midiHi: 75 },
  { id: 'box5', boxNum: 5, label: 'Zone 5 (Frets 10–15)', fromFret: 10, toFret: 15, midiLo: 50, midiHi: 79 },
]

/** Roy Ziv "Skipping Shapes" sequence — never just walks adjacently, forces real fretboard jumps! */
const SKIPPING_ORDER = [0, 2, 1, 3, 4, 2, 0, 4, 1, 3]

export function zoneForTeleporterStep(stepIndex: number): NeckZone {
  const idx = SKIPPING_ORDER[((stepIndex % SKIPPING_ORDER.length) + SKIPPING_ORDER.length) % SKIPPING_ORDER.length]
  return NECK_ZONES[idx]
}

export interface DirectorCue {
  id: string
  focus: Exclude<DirectorFocus, 'all'>
  title: string
  detail: string
  badge: string
  zone?: NeckZone
  requireSpace?: boolean
  preferTarget?: TargetPreference
  singleString?: number // string index (0 = low E .. 5 = high E)
}

const DIRECTOR_POOL: DirectorCue[] = [
  { id: 'land-3rd', focus: 'melody', badge: '🎯 CHORD TONE', title: 'Land on the 3rd of the next chord', detail: 'Hold the 3rd right on Beat 1 so everyone hears the chord change.', preferTarget: 'third' },
  { id: 'color-9th', focus: 'melody', badge: '💎 COLOUR NOTE', title: 'Spotlight the singing colour note!', detail: 'Lean into the glowing cyan note (9th / #4 / 6th) and let it breathe.', preferTarget: 'color' },
  { id: 'tele-high', focus: 'neck', badge: '🧭 NECK JUMP', title: 'Slide up to the 12th-fret zone!', detail: 'Bring the solo into the high register (Frets 10–15) for energy.', zone: NECK_ZONES[4] },
  { id: 'tele-mid', focus: 'neck', badge: '🧭 NECK JUMP', title: 'Drop to the sweet mid-neck (Frets 5–9)', detail: 'Connect smoothly with a slide instead of stopping dead.', zone: NECK_ZONES[2] },
  { id: 'tele-low', focus: 'neck', badge: '🧭 NECK JUMP', title: 'Warm low-neck phrase (Frets 0–4)', detail: 'Use resonant open/low-fret notes before climbing back up.', zone: NECK_ZONES[0] },
  { id: 'space-2', focus: 'rhythm', badge: '🌬 BREATHE', title: 'Play 2 beats, REST 2 full beats!', detail: 'Silence makes your next phrase hit twice as hard.', requireSpace: true },
  { id: 'motif-echo', focus: 'melody', badge: '🔁 MOTIF', title: 'Play a 3-note hook, then repeat it higher', detail: 'Say one short melodic idea twice with a tiny twist on the ending.' },
  { id: 'one-string-b', focus: 'neck', badge: '🎸 1-STRING', title: 'Vocal melody on the B string only!', detail: 'Sliding horizontally on one string kills robotic box-playing instantly.', singleString: 4 },
  { id: 'bend-vibrato', focus: 'melody', badge: '🎵 VOCAL', title: 'Slow bend up to a chord tone + vibrato', detail: 'Imagine a singer holding one emotional note over the chord.' },
  { id: 'rhythm-sync', focus: 'rhythm', badge: '🥁 POCKET', title: 'Start your phrase on the "&" of Beat 2', detail: 'Skip Beat 1 once — offbeat phrasing sounds instantly pro.' },
  { id: 'arp-sweep', focus: 'melody', badge: '✨ ARPEGGIO', title: 'Outline the chord with a 3-note triad', detail: 'Hit the gold dots in order (Root → 3rd → 5th) across the bar.' },
  { id: 'call-self', focus: 'rhythm', badge: '💬 QUESTION', title: '2-bar Question, then 2-bar Answer', detail: 'End bar 2 on tension (9th/4th), resolve bar 4 on Root or 3rd!' },
]

export function directorCueForCycle(cycleIndex: number, focus: DirectorFocus = 'all', seed = 0): DirectorCue {
  const list = focus === 'all' ? DIRECTOR_POOL : DIRECTOR_POOL.filter(c => c.focus === focus)
  const pool = list.length ? list : DIRECTOR_POOL
  const idx = ((cycleIndex * 5 + seed * 3) % pool.length + pool.length) % pool.length
  return pool[idx]
}

/** Pick target pitch classes for Chord-Tone Sniper / Director given a chord symbol, key root, and scale. */
export function targetPcsForChord(
  chordSymbol: string,
  keyRoot: string,
  scaleId: string,
  pref: TargetPreference = 'any',
): { pcs: number[]; label: string } {
  const info = chordInfo(chordSymbol)
  const kPc = pc(keyRoot)
  const colorMeta = MODE_COLOR_NOTES[scaleId]
  if (pref === 'color' && colorMeta) {
    return {
      pcs: colorMeta.semis.map(o => (kPc + o) % 12),
      label: colorMeta.label,
    }
  }
  if (!info) {
    const sInfo = scaleInfo(keyRoot, scaleId)
    return { pcs: [kPc, sInfo.pcs[2] ?? kPc], label: 'Root / 3rd' }
  }
  if (pref === 'third' && info.third !== null) return { pcs: [info.third], label: `3rd (${SHARPS[info.third]})` }
  if (pref === 'fifth') {
    const fifth = info.pcs.find(p => ((p - info.root + 12) % 12) === 7)
    if (fifth !== undefined) return { pcs: [fifth], label: `5th (${SHARPS[fifth]})` }
  }
  return { pcs: info.pcs, label: `${chordSymbol} tones` }
}

/** Choose a 2-note or 3-note melodic palette inside the active scale for Note-Limit Challenge. */
export function noteLimitPalette(root: string, scaleId: string, count: 2 | 3): number[] {
  const s = scaleInfo(root, scaleId)
  const r = pc(root)
  if (count === 2) {
    // Root + 3rd (or 2nd/9th if present)
    const second = s.pcs.find(p => p !== r && ((p - r + 12) % 12 === 3 || (p - r + 12) % 12 === 4 || (p - r + 12) % 12 === 2)) ?? s.pcs[1] ?? r
    return [r, second]
  }
  // 3 notes: Root + singing 2/9th (or 3rd) + 5th (or 3rd)
  const picks = [r]
  for (const offset of [2, 3, 4, 7, 5, 10]) {
    const candidate = (r + offset) % 12
    if (s.pcs.includes(candidate) && !picks.includes(candidate)) {
      picks.push(candidate)
      if (picks.length >= 3) break
    }
  }
  while (picks.length < 3 && s.pcs.length > picks.length) {
    const next = s.pcs.find(p => !picks.includes(p))
    if (next === undefined) break
    picks.push(next)
  }
  return picks
}

/** Rhythm Play/Rest template for Space Challenge (4 beats per bar). */
export function spacePatternForBar(barIndex: number): ('play' | 'rest')[] {
  const patterns: ('play' | 'rest')[][] = [
    ['play', 'play', 'rest', 'rest'],
    ['rest', 'play', 'play', 'rest'],
    ['play', 'rest', 'play', 'rest'],
    ['play', 'play', 'play', 'rest'],
  ]
  return patterns[((barIndex % patterns.length) + patterns.length) % patterns.length]
}

/** Generate a musical 2-bar "Call" phrase (midi + beat offset) in the chosen key & scale for Call & Response Duel. */
export interface DuelNote {
  midi: number
  beat: number // 0..7.5 (2 bars of 4/4)
  durBeats: number
}

export function generateDuelCall(root: string, scaleId: string, seed: number, baseOctaveMidi = 57): DuelNote[] {
  const s = scaleInfo(root, scaleId)
  const r = pc(root)
  // Build sorted ascending scale midis spanning ~1.3 octaves in guitar sweet spot (G3..E5 = 55..76)
  const pool: number[] = []
  for (let m = baseOctaveMidi; m <= baseOctaveMidi + 17; m++) {
    if (s.pcs.includes(((m % 12) + 12) % 12)) pool.push(m)
  }
  if (!pool.length) return [{ midi: 60, beat: 0, durBeats: 1 }]

  // 4 melodic phrasing templates (vocal rhythm with space at the end!)
  const templates: { beat: number; dur: number; step: number }[][] = [
    [
      { beat: 0, dur: 0.75, step: 0 },
      { beat: 1, dur: 0.5, step: 1 },
      { beat: 1.5, dur: 1.0, step: 2 },
      { beat: 3, dur: 1.0, step: 4 },
      { beat: 4.5, dur: 1.5, step: 3 },
    ],
    [
      { beat: 0.5, dur: 0.5, step: 2 },
      { beat: 1, dur: 0.5, step: 3 },
      { beat: 1.5, dur: 1.25, step: 5 },
      { beat: 3, dur: 0.75, step: 4 },
      { beat: 4, dur: 1.75, step: 2 },
    ],
    [
      { beat: 0, dur: 1.0, step: 4 },
      { beat: 1.5, dur: 0.5, step: 3 },
      { beat: 2, dur: 0.5, step: 2 },
      { beat: 2.5, dur: 1.0, step: 1 },
      { beat: 4, dur: 2.0, step: 0 },
    ],
    [
      { beat: 0, dur: 0.5, step: 0 },
      { beat: 0.5, dur: 0.5, step: 2 },
      { beat: 1, dur: 1.0, step: 4 },
      { beat: 2.5, dur: 0.5, step: 5 },
      { beat: 3, dur: 0.5, step: 4 },
      { beat: 4, dur: 2.0, step: 2 },
    ],
  ]

  const tpl = templates[((seed % templates.length) + templates.length) % templates.length]
  const rootIdx = Math.max(0, pool.findIndex(m => ((m % 12) + 12) % 12 === r))
  return tpl.map(t => ({
    midi: pool[Math.min(pool.length - 1, Math.max(0, rootIdx + t.step))],
    beat: t.beat,
    durBeats: t.dur,
  }))
}

// ---- Arcade / Brandy Scoring State ----
export interface GymScore {
  points: number
  streak: number
  bestStreak: number
  hits: number
  misses: number
  multiplier: number
  mood: BrandyMood
  lastBanner: string
}

export function initialGymScore(): GymScore {
  return { points: 0, streak: 0, bestStreak: 0, hits: 0, misses: 0, multiplier: 1, mood: 'idle', lastBanner: '' }
}

export function applyGymJudgment(prev: GymScore, ok: boolean, label: string): GymScore {
  if (ok) {
    const streak = prev.streak + 1
    const multiplier = Math.min(5, 1 + Math.floor(streak / 3))
    const gained = 100 * multiplier
    return {
      points: prev.points + gained,
      streak,
      bestStreak: Math.max(prev.bestStreak, streak),
      hits: prev.hits + 1,
      misses: prev.misses,
      multiplier,
      mood: 'shred',
      lastBanner: multiplier >= 5 ? `🔥 FEVER 5×! ${label} (+${gained})` : `✓ ${label} (+${gained})`,
    }
  }
  return {
    points: prev.points,
    streak: 0,
    bestStreak: prev.bestStreak,
    hits: prev.hits,
    misses: prev.misses + 1,
    multiplier: 1,
    mood: prev.streak >= 3 ? 'hurt' : 'wrong',
    lastBanner: `✗ ${label}`,
  }
}

// ---- "Save That Lick!" Dashcam Buffer (rolling last 4 bars of detected guitar notes) ----
export interface DashcamNote {
  midi: number
  beat: number
  atMs: number
}

export function trimDashcam(notes: DashcamNote[], maxBeats = 16): DashcamNote[] {
  if (!notes.length) return []
  const latest = notes[notes.length - 1].beat
  return notes.filter(n => latest - n.beat <= maxBeats).slice(-48)
}

/** Map a detected MIDI note to an ergonomic string/fret inside the preferred fret window. */
export function midiToGuitarSpot(midi: number, tuning: number[], preferFret = 7): { string: number; fret: number } {
  let best = { string: 0, fret: Math.max(0, midi - (tuning[0] ?? 40)) }
  let bestDist = Infinity
  for (let s = 0; s < tuning.length; s++) {
    const f = midi - tuning[s]
    if (f < 0 || f > 20) continue
    const d = Math.abs(f - preferFret) + (s === 0 || s === 1 ? 1.5 : 0) // slight preference for upper lead strings
    if (d < bestDist) {
      bestDist = d
      best = { string: s, fret: f }
    }
  }
  return best
}

/** Convert captured Dashcam notes into a playable KGuitar SongDoc ready for Play / Licks! */
export function dashcamToSongDoc(
  notes: DashcamNote[],
  opts: { key: string; scale: string; bpm: number; tuning: number[]; preferFret?: number },
): SongDoc {
  const clean = notes.slice(-32)
  const prefer = opts.preferFret ?? 7
  const firstBeat = clean.length ? clean[0].beat : 0
  // Group into 4-beat bars (4 steps per bar if sparse, up to 8 steps per bar)
  const bars: { steps: { dur: number; notes: { string: number; fret: number; midi: number }[] }[] }[] = []
  const byBar = new Map<number, DashcamNote[]>()
  for (const n of clean) {
    const bIdx = Math.max(0, Math.floor((n.beat - firstBeat) / 4))
    const arr = byBar.get(bIdx) ?? []
    arr.push(n)
    byBar.set(bIdx, arr)
  }
  const barCount = Math.max(1, Math.min(4, Math.max(...byBar.keys(), 0) + 1))
  for (let bi = 0; bi < barCount; bi++) {
    const list = byBar.get(bi) ?? []
    if (!list.length) {
      bars.push({ steps: [{ dur: 4, notes: [] }] })
      continue
    }
    const dur = Math.max(0.5, Math.min(4, 4 / list.length))
    bars.push({
      steps: list.map(n => {
        const sp = midiToGuitarSpot(n.midi, opts.tuning, prefer)
        return { dur, notes: [{ string: sp.string, fret: sp.fret, midi: n.midi }] }
      }),
    })
  }
  const label = clean.slice(0, 4).map(n => midiName(n.midi)).join('–')
  const song: Song = {
    title: `Improv Lick (${opts.key} ${opts.scale}${label ? ` · ${label}` : ''})`,
    tempo: Math.round(opts.bpm),
    tracks: [{ name: 'Captured Lead', tuning: [...opts.tuning], capo: 0, bars }],
  }
  return {
    id: newId(),
    title: song.title,
    source: 'jam',
    song,
    updated: Date.now(),
  }
}

/** Check if a detected note falls cleanly inside a Neck Zone's pitch span (with octave-smart tolerance). */
export function noteFitsZone(midi: number, zone: NeckZone): boolean {
  return midi >= zone.midiLo - 2 && midi <= zone.midiHi + 2
}

/** Convenience re-export for Hexatonic arpeggios inside the Gym. */
export { hexatonicArpeggios }
