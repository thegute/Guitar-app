// Read answers aloud: the phone's own voice in the app (SpeakPlugin.java), the browser's voice on the web.
import { Capacitor, registerPlugin } from '@capacitor/core'
import { aiSettings, post, ttsModel } from './providers'
import { audio } from '../audio/engine'

interface SpeakNative { speak(o: { text: string; rate?: number }): Promise<void>; stop(): Promise<void>; addListener(e: 'done', f: () => void): Promise<{ remove: () => void }> }
const native = registerPlugin<SpeakNative>('Speak')
const isNative = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
const listeners = new Set<(on: boolean) => void>()
let speaking = false
const set = (v: boolean) => { speaking = v; listeners.forEach(f => f(v)) }
if (isNative()) void native.addListener('done', () => set(false)).catch(() => {})

/** Plain words for speaking: no emoji, arrows or symbols read out as names. */
const clean = (t: string) => t.replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, '').replace(/→/g, ', then ').replace(/[*_#`]/g, '').replace(/\s+/g, ' ').trim()

// ── Gemini's own voice: answers from the Gemini AI are read in a natural voice from Google (your pick in Settings →
// You → AI helper), so you can tell them from the built-in helper, which keeps the phone's voice.
export const GEMINI_VOICES: { id: string; label: string }[] = [
  { id: 'Sulafat', label: 'Sulafat (warm)' }, { id: 'Aoede', label: 'Aoede (breezy)' }, { id: 'Achird', label: 'Achird (friendly)' },
  { id: 'Vindemiatrix', label: 'Vindemiatrix (gentle)' }, { id: 'Zephyr', label: 'Zephyr (bright)' }, { id: 'Puck', label: 'Puck (upbeat)' },
  { id: 'Charon', label: 'Charon (calm, deeper)' }, { id: 'Algieba', label: 'Algieba (smooth)' },
]
const VOICE_KEY = 'kg:geminiVoice'
export function geminiVoice(): string { try { return JSON.parse(localStorage.getItem(VOICE_KEY) ?? '"Sulafat"') } catch { return 'Sulafat' } }
export function setGeminiVoice(v: string) { try { localStorage.setItem(VOICE_KEY, JSON.stringify(v)) } catch { /* storage full */ } }
export const hasGeminiVoice = () => !!aiSettings().keys.gemini && geminiVoice() !== 'phone'
let src: AudioBufferSourceNode | null = null
let job = 0
// "getting the voice ready": the gap while Google makes the audio (the card says so, so it doesn't feel stuck)
const prepFns = new Set<(on: boolean) => void>()
let preparing = false
const setPrep = (v: boolean) => { if (preparing !== v) { preparing = v; prepFns.forEach(f => f(v)) } }
export const isPreparingVoice = () => preparing
export function onVoicePrep(f: (on: boolean) => void) { prepFns.add(f); return () => { prepFns.delete(f) } }

/**
 * Tidy the speech audio before it plays: a quarter-second of quiet first (so the phone's sound path is open before
 * the first word, instead of clicking on), fades in and out, and the hiss some speech models leave after the last
 * word cut off (noise-like frames: lots of zero crossings and no voice).
 */
export function tidySpeech(x: Float32Array, rate: number): Float32Array {
  const fr = Math.max(1, Math.round(rate * 0.02))
  const frames = Math.floor(x.length / fr)
  const voiced = (k: number) => {
    let e = 0, z = 0
    for (let i = k * fr + 1; i < (k + 1) * fr; i++) { e += x[i] * x[i]; if ((x[i] >= 0) !== (x[i - 1] >= 0)) z++ }
    return Math.sqrt(e / fr) > 0.02 && z / fr < 0.22
  }
  let first = 0, last = frames - 1
  while (first < frames && !voiced(first)) first++
  while (last > first && !voiced(last)) last--
  if (first >= frames) return x
  // keep a little before the first voiced moment (a soft consonant) and a little after the last
  const a = Math.max(0, first * fr - Math.round(rate * 0.12))
  const b = Math.min(x.length, (last + 1) * fr + Math.round(rate * 0.09))
  const lead = Math.round(rate * 0.25)
  const out = new Float32Array(lead + (b - a))
  const fi = Math.round(rate * 0.015), fo = Math.round(rate * 0.07)
  for (let i = 0; i < b - a; i++) {
    let g = 1
    if (i < fi) g = i / fi
    else if (i > b - a - fo) g = Math.max(0, (b - a - i) / fo)
    out[lead + i] = x[a + i] * g
  }
  return out
}

/** Split a longer answer so the first sentence can start playing while the rest is still being made. */
export function firstSentence(t: string): [string, string] {
  if (t.length < 140) return [t, '']
  const m = /^(.{25,220}?[.!?])\s+(.+)$/s.exec(t)
  return m ? [m[1], m[2]] : [t, '']
}

async function ttsBuffer(t: string, voice: string, key: string, timeout: number): Promise<AudioBuffer | null> {
  const r = await post(`https://generativelanguage.googleapis.com/v1beta/models/${ttsModel()}:generateContent?key=${encodeURIComponent(key)}`, {}, {
    // only the words to say: the newer speech models read any instructions out loud too
    contents: [{ parts: [{ text: t.slice(0, 1500) }] }],
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
  }, timeout)
  const part = (r.data as { candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[] })?.candidates?.[0]?.content?.parts?.find(x => x.inlineData?.data)?.inlineData
  if (r.status >= 300 || !part?.data) return null
  const rate = Number(/rate=(\d+)/.exec(part.mimeType ?? '')?.[1] ?? 24000)
  const bin = atob(part.data)
  const n = bin.length >> 1
  const raw = new Float32Array(n)
  for (let i = 0; i < n; i++) { const v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8); raw[i] = (v >= 32768 ? v - 65536 : v) / 32768 }
  const pcm = tidySpeech(raw, rate)
  const buf = audio().createBuffer(1, pcm.length, rate)
  buf.getChannelData(0).set(pcm)
  return buf
}
function playBuf(buf: AudioBuffer, my: number): Promise<void> {
  return new Promise(res => {
    if (my !== job) { res(); return }
    const ctx = audio()
    void ctx.resume()
    src?.stop()
    const s = ctx.createBufferSource()
    s.buffer = buf
    s.connect(ctx.destination)
    s.onended = () => { if (src === s) src = null; res() }
    src = s
    s.start()
  })
}

/** Read text in Gemini's voice. Resolves false if it couldn't (no key, busy, offline): then use the phone's voice. */
async function geminiSay(t: string, voice = geminiVoice()): Promise<boolean> {
  const key = aiSettings().keys.gemini
  if (!key || voice === 'phone') return false
  const my = ++job
  set(true)
  setPrep(true)
  try {
    // the first sentence and the rest are made at the same time; the first plays as soon as it's ready
    const [one, rest] = firstSentence(t)
    const pa = ttsBuffer(one, voice, key, 9000)
    const pb = rest ? ttsBuffer(rest, voice, key, 20000).catch(() => null) : Promise.resolve(null)
    const a = await pa
    if (my !== job) return true // stopped (or something newer started) while waiting
    setPrep(false)
    if (!a) { set(false); return false }
    void (async () => {
      await playBuf(a, my)
      if (rest && my === job) {
        const b = await pb
        if (my !== job) return
        if (b) await playBuf(b, my)
        else { await phoneSay(rest); return }
      }
      if (my === job) set(false)
    })()
    return true
  } catch {
    if (my === job) { set(false); setPrep(false) }
    return false
  }
}

/** Try a Gemini voice (Settings). */
export async function tryGeminiVoice(voice: string): Promise<boolean> {
  stopSpeaking()
  return geminiSay('Hi! This is how I sound when Gemini answers your questions.', voice)
}

/** Read text aloud. `gemini`: the answer came from the Gemini AI, so use Gemini's voice when it can.
 *  Resolves 'gemini' or 'phone' (which voice read it). */
export async function speak(text: string, o: { gemini?: boolean } = {}): Promise<'gemini' | 'phone' | null> {
  const t = clean(text)
  if (!t) return null
  if (o.gemini && hasGeminiVoice()) {
    stopSpeaking()
    if (await geminiSay(t)) return 'gemini'
  }
  await phoneSay(t)
  return 'phone'
}
async function phoneSay(t: string) {
  try {
    if (isNative()) { set(true); await native.speak({ text: t, rate: 1 }); return }
    if (typeof speechSynthesis === 'undefined') return
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(t)
    u.onend = () => set(false)
    u.onerror = () => set(false)
    set(true)
    speechSynthesis.speak(u)
  } catch { set(false) }
}
export function stopSpeaking() {
  job++
  setPrep(false)
  try { src?.stop() } catch { /* already stopped */ }
  src = null
  try { if (isNative()) void native.stop(); else if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel() } catch { /* noop */ }
  set(false)
}
export const isSpeaking = () => speaking
export function onSpeaking(f: (on: boolean) => void) { listeners.add(f); return () => { listeners.delete(f) } }
export const canSpeak = () => isNative() || typeof speechSynthesis !== 'undefined'
