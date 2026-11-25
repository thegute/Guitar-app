// Persistent "My Voice" profile: Voice Range Profile (soft/loud map), Passaggio break note,
// voice type, course progress, daily vocal minutes, pitch/vibrato history, and saved takes.
import { useSyncExternalStore } from 'react'
import { midiToNoteName } from './vocalEngine'

export type VoiceType = 'Bass' | 'Baritone' | 'Tenor' | 'Alto' | 'Mezzo-Soprano' | 'Soprano'

export interface VrpPoint {
  midi: number
  softDb: number
  loudDb: number
}

export interface VocalSessionStat {
  date: string
  accuracyPct: number
  vibratoHz: number
  minutes: number
}

export interface SavedVocalTake {
  id: string
  label: string
  createdAt: number
  accuracyPct: number
  /** base64 or blob key in IndexedDB */
  blobKey?: string
  note?: string
}

export interface SingProfile {
  tested: boolean
  voiceType: VoiceType
  /** lowest singable MIDI (e.g. E2 = 40) */
  lowMidi: number
  /** highest singable MIDI (e.g. G4 = 67) */
  highMidi: number
  /** comfortable singing sweet spot */
  comfortLow: number
  comfortHigh: number
  /** measured chest-to-head transition ("vocal break") MIDI */
  passaggioMidi: number
  vrp: VrpPoint[]
  /** completed lesson IDs (e.g. 'm1-l1') */
  doneLessons: string[]
  /** active vocal minutes today (for Vocal Health / Water Rest Guard) */
  todayDate: string
  todayVocalSec: number
  history: VocalSessionStat[]
  takes: SavedVocalTake[]
  /** preferences */
  earFirstBlind: boolean
  brandyInGame: boolean
}

const KEY = 'kg:singProfile'
const todayStr = () => new Date().toISOString().slice(0, 10)

export const DEFAULT_PROFILE: SingProfile = {
  tested: false,
  voiceType: 'Baritone',
  lowMidi: 45,       // A2
  highMidi: 67,      // G4
  comfortLow: 48,    // C3
  comfortHigh: 64,   // E4
  passaggioMidi: 61, // C#4
  vrp: [],
  doneLessons: [],
  todayDate: todayStr(),
  todayVocalSec: 0,
  history: [],
  takes: [],
  earFirstBlind: false,
  brandyInGame: true,
}

export function classifyVoiceType(lowMidi: number, highMidi: number): { voiceType: VoiceType; passaggioMidi: number } {
  const mid = (lowMidi + highMidi) / 2
  if (mid <= 51) return { voiceType: 'Bass', passaggioMidi: 57 }          // A3
  if (mid <= 55.5) return { voiceType: 'Baritone', passaggioMidi: 61 }    // C#4
  if (mid <= 60) return { voiceType: 'Tenor', passaggioMidi: 64 }         // E4
  if (mid <= 64.5) return { voiceType: 'Alto', passaggioMidi: 66 }        // F#4
  if (mid <= 68.5) return { voiceType: 'Mezzo-Soprano', passaggioMidi: 68 } // Ab4
  return { voiceType: 'Soprano', passaggioMidi: 71 }                       // B4
}

export function formatRange(low: number, high: number): string {
  return `${midiToNoteName(low)} – ${midiToNoteName(high)}`
}

let cached: SingProfile | null = null
const listeners = new Set<() => void>()

function load(): SingProfile {
  if (cached) return cached
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<SingProfile>) }
      if (p.todayDate !== todayStr()) {
        p.todayDate = todayStr()
        p.todayVocalSec = 0
      }
      cached = p
      return p
    }
  } catch { /* ignore */ }
  cached = { ...DEFAULT_PROFILE, todayDate: todayStr() }
  return cached
}

function save(next: SingProfile) {
  cached = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignore */ }
  listeners.forEach(f => f())
}

export function getSingProfile(): SingProfile {
  return load()
}

export function updateSingProfile(patch: Partial<SingProfile> | ((p: SingProfile) => SingProfile)): SingProfile {
  const cur = load()
  const next = typeof patch === 'function' ? patch(cur) : { ...cur, ...patch }
  save(next)
  return next
}

export function markLessonDone(id: string, done = true) {
  updateSingProfile(p => {
    const set = new Set(p.doneLessons)
    if (done) set.add(id)
    else set.delete(id)
    return { ...p, doneLessons: [...set] }
  })
}

export function addVocalSeconds(secs: number) {
  if (secs <= 0) return
  const today = todayStr()
  updateSingProfile(p => ({
    ...p,
    todayDate: today,
    todayVocalSec: (p.todayDate === today ? p.todayVocalSec : 0) + secs,
  }))
}

export function recordVocalStat(accuracyPct: number, vibratoHz = 0, minutes = 1) {
  const date = todayStr()
  updateSingProfile(p => {
    const hist = [...p.history]
    const last = hist[hist.length - 1]
    if (last && last.date === date) {
      last.accuracyPct = Math.round((last.accuracyPct + accuracyPct) / 2)
      if (vibratoHz > 0) last.vibratoHz = vibratoHz
      last.minutes += minutes
    } else {
      hist.push({ date, accuracyPct: Math.round(accuracyPct), vibratoHz, minutes })
    }
    while (hist.length > 30) hist.shift()
    return { ...p, history: hist }
  })
}

export function useSingProfile(): SingProfile {
  return useSyncExternalStore(
    f => { listeners.add(f); return () => listeners.delete(f) },
    () => load(),
    () => DEFAULT_PROFILE,
  )
}
