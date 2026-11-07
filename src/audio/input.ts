// Where the guitar sound comes from: the phone's microphone (acoustic) or a USB audio interface /
// guitar headphone amp plugged into the phone (electric), e.g. a Sonicake Pocket Master multi-effects pedal over USB-C (it is a USB audio interface too).

import { Capacitor } from '@capacitor/core'
import { monitoring, monitorVol, noteDevices, noteInput, onRig } from './rig'
import { audio, finalOut } from './engine'

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
const EXTERNAL = /usb|amphonix|sonicake|pocket ?master|qme|interface|audio\s*2\.0|line|guitar|irig|focusrite|scarlett|behringer|presonus|steinberg|boss|katana|spark|mustang|tonex|amplug|zoom|line ?6/i
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
  const list = devs
    .filter(d => d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications')
    .map((d, i) => ({
      id: d.deviceId,
      label: d.label || `Input ${i + 1}`,
      external: EXTERNAL.test(d.label) && !/speakerphone|earpiece/i.test(d.label),
    }))
  // the audio setups switch to "pedal + wireless" (mono) by themselves when the Pocket Master is in the list
  if (devs.some(d => d.label)) noteDevices(list)
  return list
}

/** Keep an eye on what's plugged in (the pedal setup switches by itself). Labels need mic permission first. */
let watching = false
export function watchDevices() {
  if (watching || typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return
  watching = true
  void listInputs().catch(() => {})
  navigator.mediaDevices.addEventListener?.('devicechange', () => void listInputs().catch(() => {}))
}

export interface OpenedInput {
  stream: MediaStream
  /** name to show, e.g. "USB audio" or "Phone mic" */
  label: string
  external: boolean
}

// every voice-call filter off: they treat a sustained note as noise to remove, and squash its dynamics
const RAW = { echoCancellation: false, noiseSuppression: false, autoGainControl: false, voiceIsolation: false } as MediaTrackConstraints

/** Filters the phone left on anyway (some Android phones ignore the request), from the last input opened. */
let filtersLeft: string[] = []
export const filtersStillOn = () => filtersLeft
function checkFilters(stream: MediaStream) {
  const st = (stream.getAudioTracks()[0]?.getSettings?.() ?? {}) as MediaTrackSettings & { voiceIsolation?: boolean }
  filtersLeft = [st.echoCancellation && 'echo cancelling', st.noiseSuppression && 'noise suppression', st.autoGainControl && 'automatic volume', st.voiceIsolation && 'voice isolation'].filter(Boolean) as string[]
}

// Your guitar played back through KGuitar: only in the "interface" setup (rig.ts), switched on by you. The newest open
// input is played; it goes after the compressor so KGuitar's own sounds never pump it.
const openStreams: MediaStream[] = []
let mon: { stream: MediaStream; src: MediaStreamAudioSourceNode; g: GainNode } | null = null
function syncMonitor() {
  const want = monitoring() ? openStreams[openStreams.length - 1] ?? null : null
  if (mon && mon.stream !== want) { try { mon.src.disconnect(); mon.g.disconnect() } catch { /* gone */ } mon = null }
  if (want && !mon) {
    try {
      const ctx = audio()
      const src = ctx.createMediaStreamSource(want)
      const g = ctx.createGain()
      src.connect(g).connect(finalOut())
      mon = { stream: want, src, g }
    } catch { mon = null }
  }
  if (mon) mon.g.gain.value = monitorVol()
}
onRig(syncMonitor)

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
  openStreams.push(stream)
  for (const t of stream.getTracks()) {
    let done = false
    const end = () => {
      if (done) return
      done = true
      openTracks = Math.max(0, openTracks - 1)
      syncListening()
      if (stream.getTracks().every(x => x.readyState === 'ended' || x === t)) {
        const i = openStreams.indexOf(stream)
        if (i >= 0) openStreams.splice(i, 1)
        if (!openStreams.length) noteInput(null)
        syncMonitor()
      }
    }
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
  checkFilters(opened.stream)
  noteInput(opened)
  void listInputs().catch(() => {})
  syncMonitor()
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
  if (/pocket ?master|qme/i.test(label)) return 'Pocket Master'
  if (/amphonix/i.test(label)) return 'Amphonix'
  if (/sonicake/i.test(label)) return 'Sonicake'
  const clean = label.replace(/\(.*?\)/g, '').replace(/usb[- ]?audio|audio device|\bdevice\b/gi, '').trim()
  return clean.length > 1 && clean.length < 16 ? clean : 'USB input'
}
