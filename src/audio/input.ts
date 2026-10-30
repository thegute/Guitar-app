// Where the guitar sound comes from: the phone's microphone (acoustic) or a USB audio interface /
// guitar headphone amp plugged into the phone (electric), e.g. a Sonicake Amphonix 2 over USB-C.

import { Capacitor } from '@capacitor/core'

/** On a phone or tablet (the app, or a phone's browser), or on a computer. */
export function onPhone(): boolean {
  try { if (Capacitor.isNativePlatform()) return true } catch { /* web */ }
  return typeof navigator !== 'undefined' && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)
}
/** "Phone mic" or "Computer mic" */
export const micName = () => (onPhone() ? 'Phone mic' : 'Computer mic')

/** Where to allow the microphone: the phone's app settings, or the browser's address bar on a computer. */
export function micWhere(): string {
  try { if (Capacitor.isNativePlatform()) return "in your phone settings (Apps → KGuitar → Permissions → Microphone)" } catch { /* web */ }
  return "with the microphone icon in the browser's address bar (or the site settings), then reload the page"
}

export interface InputDevice {
  id: string
  label: string
  /** looks like a USB interface / guitar amp rather than a built-in mic */
  external: boolean
}

/** 'auto' = use a USB interface when one is plugged in, otherwise the phone mic. 'mic' = always the phone mic. */
export type InputChoice = 'auto' | 'mic' | string

const KEY = 'kg:inputDevice'
const EXTERNAL = /usb|amphonix|sonicake|interface|audio\s*2\.0|line|guitar|irig|focusrite|scarlett|behringer|presonus|steinberg|boss|katana|spark|mustang|tonex|amplug|zoom|line ?6/i
const BUILT_IN = /built.?in|bottom|top|back|front|phone|speakerphone|internal|default|communications|earpiece|headset/i

export function getChoice(): InputChoice {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '"auto"')
  } catch {
    return 'auto'
  }
}
export function setChoice(c: InputChoice) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c))
  } catch {
    /* storage unavailable */
  }
  listeners.forEach(f => f())
}
const listeners = new Set<() => void>()
export function onInputChange(f: () => void) {
  listeners.add(f)
  return () => { listeners.delete(f) }
}

/** Audio inputs the phone offers. Labels need microphone permission, so ask once if they are blank. */
export async function listInputs(askPermission = false): Promise<InputDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return []
  let devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput')
  if (askPermission && devs.some(d => !d.label)) {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true })
      s.getTracks().forEach(t => t.stop())
      devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput')
    } catch {
      /* no permission: show what we have */
    }
  }
  return devs
    .filter(d => d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications')
    .map((d, i) => ({
      id: d.deviceId,
      label: d.label || `Input ${i + 1}`,
      external: EXTERNAL.test(d.label) && !/speakerphone|earpiece/i.test(d.label),
    }))
}

export interface OpenedInput {
  stream: MediaStream
  /** name to show, e.g. "USB audio" or "Phone mic" */
  label: string
  external: boolean
}

const RAW = { echoCancellation: false, noiseSuppression: false, autoGainControl: false }

// While any input is open, <html> carries data-listening and Psychedelic mode's moving background holds still: the
// listening code shares the page's thread, and on a busy phone the motion could make it miss a quick re-picked note.
let openTracks = 0
function syncListening() {
  const el = typeof document !== 'undefined' ? document.documentElement : null
  if (!el?.dataset) return
  if (openTracks > 0) el.dataset.listening = ''
  else delete el.dataset.listening
}
function watch(stream: MediaStream): MediaStream {
  for (const t of stream.getTracks()) {
    let done = false
    const end = () => { if (done) return; done = true; openTracks = Math.max(0, openTracks - 1); syncListening() }
    openTracks++
    const stop = t.stop.bind(t)
    t.stop = () => { end(); stop() }
    t.addEventListener?.('ended', end)
  }
  syncListening()
  return stream
}

/** Open the chosen input, with all voice processing off (it would damage the guitar sound). */
export async function openInput(): Promise<OpenedInput> {
  const opened = await openRaw()
  watch(opened.stream)
  return opened
}
async function openRaw(): Promise<OpenedInput> {
  const choice = getChoice()
  const devs = await listInputs()
  let target: InputDevice | undefined
  if (choice === 'auto') target = devs.find(d => d.external)
  else if (choice === 'mic') target = devs.find(d => !d.external && BUILT_IN.test(d.label)) ?? devs.find(d => !d.external)
  else target = devs.find(d => d.id === choice)

  if (target) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { ...RAW, deviceId: { exact: target.id } } })
      return { stream, label: target.label, external: target.external }
    } catch {
      /* unplugged or busy: fall back to the default input */
    }
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: RAW })
  const track = stream.getAudioTracks()[0]
  const label = track?.label || micName()
  // Android often routes the default input to a USB device as soon as it is plugged in
  return { stream, label: EXTERNAL.test(label) ? label : micName(), external: EXTERNAL.test(label) }
}

export function shortName(label: string, external: boolean) {
  if (!external) return micName()
  if (/amphonix|sonicake/i.test(label)) return 'Amphonix'
  const clean = label.replace(/\(.*?\)/g, '').replace(/usb[- ]?audio|audio device|\bdevice\b/gi, '').trim()
  return clean.length > 1 && clean.length < 16 ? clean : 'USB input'
}
