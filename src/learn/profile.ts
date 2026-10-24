// Who's playing: level, what they want to get better at, and the styles they like. Asked once (Welcome for new
// players, a card in Learn for everyone else) and used by today's plan and the songbook.
import type { Genre, Level } from '../tabs/songbook'

export type Goal = 'songs' | 'strum' | 'fingerpick' | 'lead' | 'rhythm' | 'theory'
export const GOALS: { id: Goal; label: string; what: string }[] = [
  { id: 'songs', label: 'Play songs', what: 'learn whole songs from the songbook' },
  { id: 'strum', label: 'Strum chords', what: 'clean chord changes and steady strumming' },
  { id: 'fingerpick', label: 'Fingerpicking', what: 'Travis picking and arpeggios' },
  { id: 'lead', label: 'Lead & solos', what: 'melodies, fiddle tunes, scales and licks' },
  { id: 'rhythm', label: 'Timing', what: 'playing in time with a beat or a band' },
  { id: 'theory', label: 'Know the neck', what: 'notes, keys and how chords are built' },
]
export const LEVEL_QUESTIONS: { id: Level; label: string; what: string }[] = [
  { id: 1, label: 'Just starting', what: 'a few chords or none yet' },
  { id: 2, label: 'I know some chords', what: 'open chords, simple strumming, changes are slow' },
  { id: 3, label: 'I play songs', what: 'changes are smooth, learning picking and melodies' },
  { id: 4, label: 'I play a lot', what: 'barre chords, fast tunes, lead' },
]

export interface Profile { level: Level; goals: Goal[]; genres: Genre[]; at: number }
const KEY = 'kg:profile'

export function profile(): Profile | null {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Profile | null
    return p && p.level ? p : null
  } catch { return null }
}
export function setProfile(p: Omit<Profile, 'at'>) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...p, at: Date.now() })) } catch { /* storage unavailable */ }
  if (typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event('kg:profile'))
}
/** Remember that the "tell me about you" card was put away without answering. */
export function skipProfile() {
  try { localStorage.setItem('kg:profileSkipped', '1') } catch { /* storage unavailable */ }
  if (typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event('kg:profile'))
}
export function profileSkipped() {
  try { return localStorage.getItem('kg:profileSkipped') === '1' } catch { return false }
}
