// Audio setups: how KGuitar's sound gets to your ears, and whether it plays your guitar back.
//   pedal      the Pocket Master over USB with the Spark NEO wireless in its 1/4" output. That plug is mono (it only
//              takes the LEFT channel), so everything KGuitar plays is folded to mono (the same on both sides) and the
//              double-tracked amp guitars play one centred take. Your guitar is never played back: the pedal already
//              sends it to your ears with no delay. Switched on by itself when the pedal is plugged in.
//   stereo     everything else (phone speaker, headphones, the pedal with wired stereo headphones): stereo, no playback
//              of your guitar.
//   interface  a computer audio interface with no headphone mix of its own: stereo, and your guitar played back through
//              KGuitar ("software monitoring", a small delay) when you switch it on.
// Each setup keeps its own timing correction (gear.ts): the wireless adds a little delay to everything you hear.
import { useSyncExternalStore } from 'react'

export type RigId = 'pedal' | 'stereo' | 'interface'
interface Saved {
  /** "Hear my guitar through KGuitar" with an interface (never with the phone mic or the pedal) */
  monitor: boolean
  monitorVol: number
  /** labels of inputs you told KGuitar are your pedal (when Android names it something generic like "USB audio") */
  pedals: string[]
}
const KEY = 'kg:rig'
const DEF: Saved = { monitor: false, monitorVol: 0.8, pedals: [] }
const listeners = new Set<() => void>()
let version = 0
let saved: Saved | null = null
/** the pedal's input as the phone lists it, when it's plugged in (Android sends all sound out to it then too) */
let pedalDev: string | null = null
/** the input that's open now is a USB pedal / interface (not the mic) */
let inputExternal = false
/** "Using wired headphones? Switch to stereo": lasts until the pedal is unplugged or the app is closed */
let stereoWithPedal = false

function load(): Saved {
  if (saved) return saved
  try { saved = { ...DEF, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Saved>) } } catch { saved = { ...DEF } }
  return saved
}
function changed() { version++; listeners.forEach(f => f()) }
function save(p: Partial<Saved>) {
  saved = { ...load(), ...p }
  try { localStorage.setItem(KEY, JSON.stringify(saved)) } catch { /* storage unavailable */ }
  changed()
}

const PEDAL = /pocket ?master|sonicake|\bqme\b/i
/** Is this input the pedal (by its name, or because you said so)? */
export function isPedal(label: string | undefined, external = true): boolean {
  if (!label || !external) return false
  return PEDAL.test(label) || load().pedals.includes(label)
}

/** Tell the setups what's plugged in: the phone's list of inputs (input.ts, when an input opens and when devices change). */
export function noteDevices(devs: { label: string; external: boolean }[]) {
  const p = devs.find(d => isPedal(d.label, d.external))?.label ?? null
  if (p === pedalDev) return
  if (!p) stereoWithPedal = false
  else if (!pedalDev) justSwitched = Date.now()
  pedalDev = p
  changed()
}
/** The input that's open now (or none). */
export function noteInput(inp: { external: boolean } | null) {
  const e = !!inp?.external
  if (e !== inputExternal) { inputExternal = e; changed() }
}
/** when the pedal setup last switched on by itself (for the "Pocket Master: mono" notice) */
let justSwitched = 0
export const switchedAt = () => justSwitched
/** the pedal's name, when it's plugged in */
export const pedalPlugged = () => pedalDev

/** The setup in use now. */
export function rig(): RigId {
  if (pedalDev && !stereoWithPedal) return 'pedal'
  if (inputExternal && load().monitor) return 'interface'
  return 'stereo'
}
/** Everything KGuitar plays folded to mono? */
export const monoOut = () => rig() === 'pedal'
/** Play your guitar back through KGuitar? Only with an interface, never the mic (it would howl) or the pedal (an echo). */
export const monitoring = () => rig() === 'interface'
export const monitorVol = () => load().monitorVol

export function setStereoWithPedal(on: boolean) { stereoWithPedal = on; changed() }
export const stereoOverride = () => stereoWithPedal
export function setMonitor(on: boolean, vol?: number) { save({ monitor: on, ...(vol !== undefined ? { monitorVol: vol } : {}) }) }
export function setMonitorVol(vol: number) { save({ monitorVol: Math.max(0, Math.min(1.5, vol)) }) }
/** "This is my pedal + wireless" for an input with a generic name; false forgets it. */
export function markPedal(label: string, on: boolean) {
  const p = load().pedals.filter(x => x !== label)
  save({ pedals: on ? [...p, label] : p })
  if (on) { stereoWithPedal = false; pedalDev = label } else if (pedalDev === label) pedalDev = null
  changed()
}

export function onRig(f: () => void) { listeners.add(f); return () => { listeners.delete(f) } }
export function useRig(): RigId {
  useSyncExternalStore(onRig, () => version)
  return rig()
}

/** Short words for the chip: what the setup does. */
export function rigLabel(r: RigId = rig()): string {
  return r === 'pedal' ? 'Pedal + wireless · mono' : r === 'interface' ? 'Interface · hearing your guitar' : 'Stereo'
}
