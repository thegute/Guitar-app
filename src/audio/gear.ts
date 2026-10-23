// Your gear settings, kept separately for the phone mic and for a USB amp / interface (they behave very
// differently): how sensitive note detection is, and how long sound takes to get out and back in (latency).
// Set once in the gear setup; Play, the quizzes, ear training, the looper and the rhythm trainer all read them.
import { useSyncExternalStore } from 'react'
import { audio } from './engine'

export type InputKind = 'mic' | 'usb'
export interface GearProfile {
  /** note-detection threshold multiplier: lower = more sensitive (0.4 .. 3) */
  gate: number
  /** round-trip delay in ms, or -1 = not measured yet (estimate) */
  latencyMs: number
  /** measured room noise and note level (RMS), for the setup screen */
  noise?: number
  level?: number
  /** when the setup was last run */
  setAt?: number
  label?: string
}
type Store = Partial<Record<InputKind, GearProfile>>
const KEY = 'kg:gear'
const listeners = new Set<() => void>()
let cache: Store | null = null
let version = 0

function load(): Store {
  if (cache) return cache
  try { cache = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Store } catch { cache = {} }
  // older versions kept one looper delay and a Play sensitivity: carry them over
  try {
    const old = JSON.parse(localStorage.getItem('kg:loopLatencyMs') ?? '-1') as number
    const gate = JSON.parse(localStorage.getItem('kg:playGate') ?? '1') as number
    for (const k of ['mic', 'usb'] as InputKind[]) {
      if (!cache[k]) cache[k] = { gate: gate || 1, latencyMs: typeof old === 'number' ? old : -1 }
    }
  } catch { /* nothing to carry over */ }
  return cache
}
function save(s: Store) {
  cache = s
  version++
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* storage unavailable */ }
  listeners.forEach(f => f())
}

export const kindOf = (external: boolean | undefined): InputKind => (external ? 'usb' : 'mic')

export function gear(kind: InputKind): GearProfile {
  return { gate: 1, latencyMs: -1, ...load()[kind] }
}
export function setGear(kind: InputKind, patch: Partial<GearProfile>) {
  const s = { ...load() }
  s[kind] = { ...gear(kind), ...patch }
  save(s)
}
export function isSetUp(kind?: InputKind) {
  const s = load()
  return kind ? !!s[kind]?.setAt : !!(s.mic?.setAt || s.usb?.setAt)
}

/** A first guess at the round-trip delay before you calibrate. */
export function estimatedLatencyMs(kind: InputKind) {
  try {
    const ctx = audio() as AudioContext & { outputLatency?: number }
    const outL = ctx.outputLatency || ctx.baseLatency || 0.02
    // USB audio on Android usually adds a little more input buffering than the built-in mic
    return Math.round((outL + (kind === 'usb' ? 0.04 : 0.03)) * 1000)
  } catch {
    return 60
  }
}
/** The delay to correct for, in ms (measured if you've run the timing check, otherwise estimated). */
export function latencyMs(kind: InputKind) {
  const g = gear(kind)
  return g.latencyMs >= 0 ? g.latencyMs : estimatedLatencyMs(kind)
}

/**
 * Work out a sensitivity from the room's noise and how loud a plucked note is.
 * Note detection counts a sound once it is louder than gate x max(0.006, 3 x noise); aim for about a sixth of a
 * fresh note's level so the ringing tail still counts but room noise never does.
 */
export function gateFrom(noise: number, noteLevel: number) {
  const base = Math.max(0.006, noise * 3)
  const g = (noteLevel * 0.16) / base
  return Math.round(Math.min(3, Math.max(0.4, g)) * 100) / 100
}

export function useGear() {
  return useSyncExternalStore(f => { listeners.add(f); return () => { listeners.delete(f) } }, () => version)
}
