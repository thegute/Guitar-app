// Hands-free control: a Bluetooth footswitch / page turner (they type keys like → ← PageDown) or a USB MIDI pedal
// triggers actions on the screen you're on (start/stop, restart, loop this bar ...). Pedals can be re-assigned.
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { Capacitor, registerPlugin } from '@capacitor/core'

export type PedalAction = 'startStop' | 'restart' | 'loopBar' | 'prevBar' | 'nextBar' | 'hearIt' | 'video' | 'record' | 'accept'
export const ACTION_LABEL: Record<PedalAction, string> = {
  startStop: 'Start / stop',
  restart: 'Back to the start (of the loop)',
  loopBar: 'Loop the bar I\'m on (press again to stop)',
  prevBar: 'Previous bar',
  nextBar: 'Next bar',
  hearIt: 'Hear it',
  video: 'Video play / pause',
  record: 'Record a loop (Jam)',
  accept: 'I played it right (Play: it misheard you)',
}
const DEFAULTS: Record<string, PedalAction> = {
  'key:ArrowRight': 'startStop', 'key:PageDown': 'startStop', 'key:ArrowDown': 'startStop', 'key:MediaPlayPause': 'startStop',
  'key:ArrowLeft': 'restart', 'key:PageUp': 'restart', 'key:ArrowUp': 'restart',
  'midi:cc:64': 'startStop', 'midi:cc:65': 'restart', 'midi:cc:66': 'loopBar', 'midi:cc:67': 'restart',
}
const KEY = 'kg:pedals'
const MIDI_KEY = 'kg:midiPedal'

const listeners = new Set<() => void>()
let version = 0
const changed = () => { version++; listeners.forEach(f => f()) }

export function bindings(): Record<string, PedalAction> {
  // once you change anything the whole map is saved, so a default you removed stays removed
  try { const s = localStorage.getItem(KEY); return s ? (JSON.parse(s) as Record<string, PedalAction>) : { ...DEFAULTS } } catch { return { ...DEFAULTS } }
}
export function bind(code: string, action: PedalAction) {
  const b = bindings()
  // one input does one thing
  b[code] = action
  try { localStorage.setItem(KEY, JSON.stringify(b)) } catch { /* storage unavailable */ }
  changed()
}
export function unbind(code: string) {
  const b = bindings()
  delete b[code]
  try { localStorage.setItem(KEY, JSON.stringify(b)) } catch { /* storage unavailable */ }
  changed()
}
export function resetBindings() {
  try { localStorage.removeItem(KEY) } catch { /* storage unavailable */ }
  changed()
}
export function describe(code: string) {
  const [kind, a, b] = code.split(':')
  if (kind === 'key') return ({ ArrowRight: '→ key', ArrowLeft: '← key', ArrowUp: '↑ key', ArrowDown: '↓ key', PageDown: 'Page Down', PageUp: 'Page Up', ' ': 'Space', MediaPlayPause: 'Play/Pause key' } as Record<string, string>)[a] ?? `${a} key`
  if (kind === 'midi') return a === 'cc' ? `MIDI CC ${b}` : a === 'note' ? `MIDI note ${b}` : `MIDI program ${b}`
  return code
}

// ---------- who receives the actions: the screen on top ----------
type Handlers = Partial<Record<PedalAction, () => void>> & {
  /** a pedal held down for ~0.7 s (after its press already fired): screens that offer "hold to stop" */
  hold?: (a: PedalAction) => void
  /** a pedal let go (any press, held or not): screens where holding a pedal does something (Sample mode) */
  up?: (a: PedalAction) => void
}
const stack: { h: { current: Handlers } }[] = []
let learning: ((code: string) => void) | null = null
let lastFired: { code: string; at: number } | null = null

function fire(code: string) {
  if (learning) { const f = learning; learning = null; f(code); return true }
  const action = bindings()[code]
  if (!action) return false
  // pedals can bounce: ignore a repeat of the same input within 250 ms
  const now = performance.now()
  if (lastFired && lastFired.code === code && now - lastFired.at < 250) return true
  lastFired = { code, at: now }
  const top = stack[stack.length - 1]
  const fn = top?.h.current[action]
  if (!fn) return false
  fn()
  pressed(action)
  downAt.set(code, now)
  return true
}
// how long each pedal has been down, for "hold"
const downAt = new Map<string, number>()
const HOLD_MS = 650
function release(code: string) {
  const t = downAt.get(code)
  downAt.delete(code)
  const act = bindings()[code]
  const top0 = stack[stack.length - 1]
  if (act && t !== undefined && top0?.h.current.up) top0.h.current.up(act)
  if (t === undefined || performance.now() - t < HOLD_MS) return
  const action = bindings()[code]
  const top = stack[stack.length - 1]
  if (action && top?.h.current.hold) top.h.current.hold(action)
}
/** Wait for the next pedal press (any key or MIDI message) and return its code. */
export function learnNext(): Promise<string> {
  return new Promise(resolve => { learning = resolve })
}
export function cancelLearn() { learning = null }

const pressListeners = new Set<(a: PedalAction) => void>()
function pressed(a: PedalAction) { pressListeners.forEach(f => f(a)) }
export function onPedal(f: (a: PedalAction) => void) { pressListeners.add(f); return () => { pressListeners.delete(f) } }

/** Register what the pedals do on this screen (only the most recently mounted screen gets them). */
export function usePedals(handlers: Handlers) {
  const h = useRef(handlers)
  h.current = handlers
  useEffect(() => {
    const entry = { h }
    stack.push(entry)
    return () => { const i = stack.indexOf(entry); if (i >= 0) stack.splice(i, 1) }
  }, [])
}

// ---------- keyboard (Bluetooth page turners and footswitches in keyboard mode) ----------
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', e => {
    const t = e.target as HTMLElement | null
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
    const code = `key:${e.key}`
    if (fire(code)) e.preventDefault()
  })
  window.addEventListener('keyup', e => release(`key:${e.key}`))
}

// ---------- MIDI pedals ----------
// On the phone: our own MidiPlugin.java (USB MIDI, and Bluetooth LE MIDI pedals like the Chocolate Plus: the Android
// web view has no Web MIDI). On the web: Web MIDI where the browser has it.
export interface MidiStatus {
  on: boolean
  devices: string[]
  error?: string
  /** the remembered Bluetooth pedal */
  ble?: { address: string; name: string; state: 'connecting' | 'connected' | 'notfound' | 'idle' }
  /** the last message, so you can see what a button sends */
  last?: string
}
let midiStatus: MidiStatus = { on: false, devices: [] }
const ccLast = new Map<string, number>()
const ccPressAt = new Map<string, number>()
const BLE_KEY = 'kg:midiBle'
const IGNORE_KEY = 'kg:midiIgnore'
export function midiEnabled() {
  try { return JSON.parse(localStorage.getItem(MIDI_KEY) ?? 'false') as boolean } catch { return false }
}
export function getMidiStatus() { return midiStatus }
const setStatus = (p: Partial<MidiStatus>) => { midiStatus = { ...midiStatus, ...p }; changed() }
function readJson<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d } catch { return d } }
function writeJson(k: string, v: unknown) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage unavailable */ } }

/** Devices you've told KGuitar not to listen to (the Pocket Master's own USB MIDI, a keyboard...). */
export function ignoredDevices(): string[] { return readJson<string[]>(IGNORE_KEY, []) }
export function setDeviceIgnored(name: string, ignore: boolean) {
  const list = ignoredDevices().filter(n => n !== name)
  if (ignore) list.push(name)
  writeJson(IGNORE_KEY, list)
  changed()
}

/** One MIDI message from any device: notes and program changes press; a CC (footswitch) presses at 64+ and lets go below. */
export function midiMessage(data: ArrayLike<number>, device = 'MIDI device') {
  const [st, d1, d2 = 0] = [data[0], data[1], data[2]]
  if (ignoredDevices().includes(device)) return
  const type = st & 0xf0
  const now = performance.now()
  if (type === 0x90 && d2 > 0) { setStatus({ last: `Note ${d1} from ${device}` }); fire(`midi:note:${d1}`) }
  else if (type === 0x80 || (type === 0x90 && d2 === 0)) release(`midi:note:${d1}`)
  else if (type === 0xb0) {
    const k = `${d1}`
    const prev = ccLast.get(k) ?? 0
    ccLast.set(k, d2)
    // footswitches send 127 down / 0 up; some send only 127 on every press, so a second 127 later is a new press
    if (d2 >= 64 && (prev < 64 || now - (ccPressAt.get(k) ?? 0) > 400)) {
      ccPressAt.set(k, now)
      setStatus({ last: `CC ${d1} = ${d2} from ${device}` })
      fire(`midi:cc:${d1}`)
    } else if (d2 < 64 && prev >= 64) release(`midi:cc:${d1}`)
  } else if (type === 0xc0) { setStatus({ last: `Program ${d1} from ${device}` }); fire(`midi:pc:${d1}`) }
}

interface MidiDev { id: number; name: string; kind: 'usb' | 'ble' | 'other' }
interface MidiNative {
  available(): Promise<{ ok: boolean; ble: boolean }>
  start(o: { ble?: string }): Promise<{ devices: MidiDev[]; error?: string }>
  stop(): Promise<void>
  scanBle(o: { ms?: number }): Promise<{ found: { address: string; name: string }[]; error?: string }>
  connectBle(o: { address: string }): Promise<{ error?: string } | void>
  forgetBle(): Promise<void>
  addListener(e: 'midi', f: (d: { data: number[]; device: string }) => void): Promise<{ remove: () => void }>
  addListener(e: 'devices', f: (d: { devices: MidiDev[] }) => void): Promise<{ remove: () => void }>
  addListener(e: 'status', f: (d: { ble: 'connecting' | 'connected' | 'notfound' }) => void): Promise<{ remove: () => void }>
}
const nativeMidi = registerPlugin<MidiNative>('Midi')
export const nativeMidiOn = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
let nativeSubs: { remove: () => void }[] = []

interface MidiInputLike { name?: string | null; onmidimessage: ((e: { data: Uint8Array }) => void) | null }
interface MidiAccessLike { inputs: Map<string, MidiInputLike>; onstatechange: (() => void) | null }

export async function enableMidi(on: boolean) {
  writeJson(MIDI_KEY, on)
  if (nativeMidiOn()) return enableNative(on)
  if (!on) { midiStatus = { on: false, devices: [] }; changed(); return }
  const req = (navigator as Navigator & { requestMIDIAccess?: () => Promise<MidiAccessLike> }).requestMIDIAccess
  if (!req) { midiStatus = { on: false, devices: [], error: "This browser doesn't offer MIDI. Use the pedal's keyboard (page-turner) mode instead." }; changed(); return }
  try {
    const access = await req.call(navigator)
    const hook = () => {
      const names: string[] = []
      access.inputs.forEach(inp => {
        const name = inp.name ?? 'MIDI device'
        names.push(name)
        inp.onmidimessage = ev => midiMessage(ev.data, name)
      })
      setStatus({ on: true, devices: names, error: undefined })
    }
    access.onstatechange = hook
    hook()
  } catch {
    midiStatus = { on: false, devices: [], error: 'MIDI access was refused.' }
    changed()
  }
}

async function enableNative(on: boolean) {
  nativeSubs.forEach(s => s.remove()); nativeSubs = []
  if (!on) { try { await nativeMidi.stop() } catch { /* not there */ } midiStatus = { on: false, devices: [] }; changed(); return }
  const saved = readJson<{ address: string; name: string } | null>(BLE_KEY, null)
  try {
    nativeSubs.push(await nativeMidi.addListener('midi', d => midiMessage(d.data, d.device)))
    nativeSubs.push(await nativeMidi.addListener('devices', d => setStatus({ devices: d.devices.map(x => x.name) })))
    nativeSubs.push(await nativeMidi.addListener('status', d => { if (midiStatus.ble) setStatus({ ble: { ...midiStatus.ble, state: d.ble } }) }))
    const r = await nativeMidi.start({ ble: saved?.address })
    if (r.error) { midiStatus = { on: false, devices: [], error: "This phone doesn't offer MIDI to apps." }; changed(); return }
    midiStatus = { on: true, devices: r.devices.map(x => x.name), ble: saved ? { ...saved, state: 'connecting' } : undefined }
    changed()
  } catch {
    midiStatus = { on: false, devices: [], error: 'MIDI needs the newest KGuitar app.' }
    changed()
  }
}

export const BLE_ERRORS: Record<string, string> = {
  permission: 'KGuitar needs the Nearby devices permission to find Bluetooth pedals. Allow it and try again.',
  off: 'Bluetooth is off. Switch it on and try again.',
  nobluetooth: "This device doesn't have Bluetooth LE.",
}
/** Look for Bluetooth MIDI pedals nearby (phone app only). */
export async function scanBlePedals(): Promise<{ found: { address: string; name: string }[]; error?: string }> {
  if (!nativeMidiOn()) return { found: [], error: 'web' }
  if (!midiStatus.on) await enableMidi(true)
  try { return await nativeMidi.scanBle({ ms: 6000 }) } catch { return { found: [], error: 'error' } }
}
/** Connect to a Bluetooth pedal and remember it (it reconnects whenever it's switched on). */
export async function connectBlePedal(p: { address: string; name: string }) {
  writeJson(BLE_KEY, p)
  setStatus({ ble: { ...p, state: 'connecting' } })
  try { const r = await nativeMidi.connectBle({ address: p.address }); if (r && r.error) setStatus({ error: BLE_ERRORS[r.error] ?? r.error }) } catch { /* not there */ }
}
export async function forgetBlePedal() {
  writeJson(BLE_KEY, null)
  setStatus({ ble: undefined })
  try { await nativeMidi.forgetBle() } catch { /* not there */ }
}

if (typeof window !== 'undefined' && midiEnabled()) setTimeout(() => void enableMidi(true), 1500)

export function usePedalSettings() {
  return useSyncExternalStore(f => { listeners.add(f); return () => { listeners.delete(f) } }, () => version)
}
