// The KGuitar audio engine's spine (Stage 3, notes/AUDIO-ENGINE.md): one AudioContext, a mixing console and a mastering
// stage that every sound in the app goes through.
//
//   source → role stage (me | band | any) → category bus (guitar, bass, drums, keys, loops, click, voice, fx)
//          → master in → [glue compressor → true-peak look-ahead limiter] (AudioWorklet) → final → mono fold → speakers
//
// - Role: "your part" vs "the band" (the Play / Game slider) and the band's own parts (drums / bass / other), with the
//   levels, mute and solo the mixer card sets. Kept exactly as before so every existing caller and setting still works.
// - Category: where each kind of sound gets its own processing (Step 4: drum punch, bass mono lock, guitar carve, sends)
//   and its calibrated level, so every feature plays at the same loudness.
// - Master: replaces the old DynamicsCompressor + waveshaper ceiling, which flattened every strum's attack. Until the
//   worklet is ready (a few ms after the first sound) and on browsers without AudioWorklet, a transparent safety
//   limiter (DynamicsCompressor set as a brickwall) stands in.
// - The live guitar (interface setup, rig.ts) joins at `finalOut()`: after the master, before the mono fold.
import { monoOut, onRig } from './rig'
import masterWorkletUrl from '../engine/worklets/master.worklet.js?url'

let ctx: AudioContext | null = null
/** what features call "the output": the master's input */
let masterIn: GainNode | null = null
/** stands in for the worklet master until it's ready (and for good where AudioWorklet is missing) */
let fallback: DynamicsCompressorNode | null = null
let masterNode: AudioWorkletNode | null = null
let fold: GainNode | null = null
/** after the master, before the mono fold: your guitar played back through an interface */
let finalIn: GainNode | null = null

function applyFold() {
  if (!fold) return
  // 'explicit' + 'speakers': one channel = (L + R) / 2, which the output then sends to both sides
  fold.channelCount = monoOut() ? 1 : 2
}
onRig(applyFold)

/** Glue and limiter meters (dB of gain reduction, ~20 times a second) for a mixer view or tests. */
export const masterMeter = { glue: 0, limit: 0, ready: false }

function loadMaster(c: AudioContext) {
  if (!c.audioWorklet || typeof AudioWorkletNode === 'undefined') return
  c.audioWorklet.addModule(masterWorkletUrl).then(() => {
    if (!masterIn || !finalIn || masterNode) return
    const node = new AudioWorkletNode(c, 'kg-master', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'speakers' })
    node.port.onmessage = e => { masterMeter.glue = e.data.glue; masterMeter.limit = e.data.limit }
    // swap in without a gap: connect the new path, then drop the stand-in
    masterIn.connect(node).connect(finalIn)
    masterIn.disconnect(fallback!)
    fallback!.disconnect()
    masterNode = node
    masterMeter.ready = true
  }).catch(() => { /* keep the stand-in */ })
}

export function audio(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: 'interactive' })
    masterIn = ctx.createGain()
    masterIn.channelCount = 2
    // the stand-in: a fast brickwall just under full scale (transparent until something would clip)
    fallback = ctx.createDynamicsCompressor()
    fallback.threshold.value = -1.5
    fallback.knee.value = 0
    fallback.ratio.value = 20
    fallback.attack.value = 0.001
    fallback.release.value = 0.08
    fold = ctx.createGain()
    fold.channelCountMode = 'explicit'
    fold.channelInterpretation = 'speakers'
    finalIn = ctx.createGain()
    masterIn.connect(fallback).connect(finalIn)
    finalIn.connect(fold).connect(ctx.destination)
    applyFold()
    loadMaster(ctx)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** The end of the chain (after the master, before the mono fold): only the live guitar in the interface setup. */
export function finalOut(): AudioNode {
  audio()
  return finalIn!
}
/** Straight into the master, skipping the console (only for things that are already a finished mix). */
export function masterInput(): AudioNode {
  audio()
  return masterIn!
}

// ---------------------------------------------------------------------------------------------------------------------
// The console: category buses

export type Category = 'guitar' | 'bass' | 'drums' | 'keys' | 'loops' | 'click' | 'voice' | 'fx'
export const CATEGORIES: Category[] = ['guitar', 'bass', 'drums', 'keys', 'loops', 'click', 'voice', 'fx']
/** Calibrated levels (Step 1): each category's sounds land near the same loudness at the master (sound lab measured). */
const CAT_TRIM: Record<Category, number> = { guitar: 1, bass: 1, drums: 1, keys: 1, loops: 1, click: 1, voice: 1, fx: 1 }
interface CatBus { input: GainNode; output: GainNode }
const cats = new Map<Category, CatBus>()
/** A category bus: its input (where sounds arrive) → [its processing, Step 4] → its output → the master. */
export function catBus(cat: Category): CatBus {
  const c = audio()
  let b = cats.get(cat)
  if (!b) {
    const input = c.createGain()
    const output = c.createGain()
    output.gain.value = CAT_TRIM[cat]
    input.connect(output).connect(masterIn!)
    b = { input, output }
    cats.set(cat, b)
  }
  return b
}

// ---------------------------------------------------------------------------------------------------------------------
// Roles: your part vs the band, and the band's parts (levels remembered as kg:bus:<name>, mute/solo for right now)

export type BusName = 'me' | 'band' | 'drums' | 'bass' | 'other'
export const BAND_PARTS: BusName[] = ['drums', 'bass', 'other']
export type Role = 'me' | 'band' | 'any'
const BUS_DEFAULT: Record<BusName, number> = { me: 1, band: 1, drums: 1, bass: 1, other: 1 }
const mutedBuses = new Set<BusName>()
export function busLevel(name: BusName): number {
  try { const v = Number(localStorage.getItem(`kg:bus:${name}`)); return localStorage.getItem(`kg:bus:${name}`) !== null && v >= 0 && v <= 1.5 ? v : BUS_DEFAULT[name] } catch { return BUS_DEFAULT[name] }
}
const gainOf = (name: BusName) => (mutedBuses.has(name) ? 0 : busLevel(name))
/** which band part a category counts as (the mixer card's Drums / Bass / Other parts) */
const partOf = (cat: Category): BusName => (cat === 'drums' ? 'drums' : cat === 'bass' ? 'bass' : 'other')
const routeGain = (role: Role, cat: Category) => (role === 'any' ? 1 : role === 'me' ? gainOf('me') : gainOf('band') * gainOf(partOf(cat)))
const routes = new Map<string, GainNode>()
/** Where a sound goes: its role (your part / the band / neither) and its kind. Every sound-making call should end here. */
export function route(role: Role, cat: Category): GainNode {
  const c = audio()
  const k = `${role}:${cat}`
  let g = routes.get(k)
  if (!g) {
    g = c.createGain()
    g.gain.value = routeGain(role, cat)
    g.connect(catBus(cat).input)
    routes.set(k, g)
  }
  if ((globalThis as { __kgTest?: boolean }).__kgTest) (globalThis as { __kgRoutes?: unknown }).__kgRoutes = routes
  return g
}
/** The default for sounds that don't say where they go: a guitar, nobody's part in particular. */
export function out(): AudioNode {
  return route('any', 'guitar')
}
/** The old named buses, kept for existing callers: your part, or one part of the band. */
export function bus(name: BusName): GainNode {
  if (name === 'me') return route('me', 'guitar')
  if (name === 'drums') return route('band', 'drums')
  if (name === 'bass') return route('band', 'bass')
  return route('band', 'guitar')
}
const busListeners = new Set<() => void>()
export function onBuses(f: () => void) { busListeners.add(f); return () => { busListeners.delete(f) } }
function applyRoutes() {
  if (ctx) for (const [k, g] of routes) {
    const [role, cat] = k.split(':') as [Role, Category]
    g.gain.setTargetAtTime(routeGain(role, cat), ctx.currentTime, 0.04)
  }
  busListeners.forEach(f => f())
}
/** Set a bus's level (0–1.5), smoothly, and remember it. */
export function setBusLevel(name: BusName, v: number) {
  const x = Math.max(0, Math.min(1.5, v))
  try { localStorage.setItem(`kg:bus:${name}`, String(Math.round(x * 100) / 100)) } catch { /* private */ }
  applyRoutes()
}
/** Silence a bus for now (the mixer's mute and solo), keeping its level. */
export function setBusMuted(name: BusName, on: boolean) { if (on) mutedBuses.add(name); else mutedBuses.delete(name); applyRoutes() }
export const busMuted = (name: BusName) => mutedBuses.has(name)

/** Keep the screen awake while practising (tuner, metronome, playback). */
let wakeLock: { release: () => Promise<void> } | null = null
export async function keepAwake(on: boolean) {
  try {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    if (on && !wakeLock && nav.wakeLock) wakeLock = await nav.wakeLock.request('screen')
    if (!on && wakeLock) {
      await wakeLock.release()
      wakeLock = null
    }
  } catch {
    /* not supported: fine */
  }
}
