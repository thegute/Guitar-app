// Hands-free control: a Bluetooth footswitch / page turner (they type keys like → ← PageDown) or a USB MIDI pedal
// triggers actions on the screen you're on (start/stop, restart, loop this bar ...). Pedals can be re-assigned.
import { useEffect, useRef, useSyncExternalStore } from 'react'

export type PedalAction = 'startStop' | 'restart' | 'loopBar' | 'prevBar' | 'nextBar' | 'hearIt' | 'video' | 'record'
export const ACTION_LABEL: Record<PedalAction, string> = {
  startStop: 'Start / stop',
  restart: 'Back to the start (of the loop)',
  loopBar: 'Loop the bar I\'m on (press again to stop)',
  prevBar: 'Previous bar',
  nextBar: 'Next bar',
  hearIt: 'Hear it',
  video: 'Video play / pause',
  record: 'Record a loop (Jam)',
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
type Handlers = Partial<Record<PedalAction, () => void>>
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
  return true
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
}

// ---------- MIDI pedals ----------
let midiStatus: { on: boolean; devices: string[]; error?: string } = { on: false, devices: [] }
const ccLast = new Map<number, number>()
export function midiEnabled() {
  try { return JSON.parse(localStorage.getItem(MIDI_KEY) ?? 'false') as boolean } catch { return false }
}
export function getMidiStatus() { return midiStatus }

interface MidiInputLike { name?: string | null; onmidimessage: ((e: { data: Uint8Array }) => void) | null }
interface MidiAccessLike { inputs: Map<string, MidiInputLike>; onstatechange: (() => void) | null }

export async function enableMidi(on: boolean) {
  try { localStorage.setItem(MIDI_KEY, JSON.stringify(on)) } catch { /* storage unavailable */ }
  if (!on) { midiStatus = { on: false, devices: [] }; changed(); return }
  const req = (navigator as Navigator & { requestMIDIAccess?: () => Promise<MidiAccessLike> }).requestMIDIAccess
  if (!req) { midiStatus = { on: false, devices: [], error: "This phone's web view doesn't offer MIDI to apps. Use the pedal's keyboard (page-turner) mode instead." }; changed(); return }
  try {
    const access = await req.call(navigator)
    const hook = () => {
      const names: string[] = []
      access.inputs.forEach(inp => {
        names.push(inp.name ?? 'MIDI device')
        inp.onmidimessage = ev => {
          const [st, d1, d2] = ev.data
          const type = st & 0xf0
          if (type === 0x90 && d2 > 0) fire(`midi:note:${d1}`)
          else if (type === 0xb0) {
            // footswitches send 127 down / 0 up: act on the press only
            const prev = ccLast.get(d1) ?? 0
            ccLast.set(d1, d2)
            if (d2 >= 64 && prev < 64) fire(`midi:cc:${d1}`)
          } else if (type === 0xc0) fire(`midi:pc:${d1}`)
        }
      })
      midiStatus = { on: true, devices: names }
      changed()
    }
    access.onstatechange = hook
    hook()
  } catch {
    midiStatus = { on: false, devices: [], error: 'MIDI access was refused.' }
    changed()
  }
}
if (typeof window !== 'undefined' && midiEnabled()) setTimeout(() => void enableMidi(true), 1500)

export function usePedalSettings() {
  return useSyncExternalStore(f => { listeners.add(f); return () => { listeners.delete(f) } }, () => version)
}
