// Read answers aloud: the phone's own voice in the app (SpeakPlugin.java), the browser's voice on the web.
import { Capacitor, registerPlugin } from '@capacitor/core'
import { aiSettings, post } from './providers'
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

/** Read text in Gemini's voice. Resolves false if it couldn't (no key, busy, offline): then use the phone's voice. */
async function geminiSay(t: string, voice = geminiVoice()): Promise<boolean> {
  const key = aiSettings().keys.gemini
  if (!key || voice === 'phone') return false
  const my = ++job
  set(true)
  try {
    const r = await post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${encodeURIComponent(key)}`, {}, {
      contents: [{ parts: [{ text: `Say this in a warm, relaxed, friendly way, like a guitar teacher talking to a student: ${t.slice(0, 1500)}` }] }],
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
    }, 30000)
    if (my !== job) return true // stopped (or something newer started) while waiting
    const part = (r.data as { candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[] })?.candidates?.[0]?.content?.parts?.find(x => x.inlineData?.data)?.inlineData
    if (r.status >= 300 || !part?.data) { set(false); return false }
    const rate = Number(/rate=(\d+)/.exec(part.mimeType ?? '')?.[1] ?? 24000)
    const bin = atob(part.data)
    const n = bin.length >> 1
    const ctx = audio()
    const buf = ctx.createBuffer(1, n, rate)
    const ch = buf.getChannelData(0)
    for (let i = 0; i < n; i++) { const v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8); ch[i] = (v >= 32768 ? v - 65536 : v) / 32768 }
    void ctx.resume()
    src?.stop()
    const s = ctx.createBufferSource()
    s.buffer = buf
    s.connect(ctx.destination)
    s.onended = () => { if (src === s) { src = null; set(false) } }
    src = s
    s.start()
    return true
  } catch {
    if (my === job) set(false)
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
  try { src?.stop() } catch { /* already stopped */ }
  src = null
  try { if (isNative()) void native.stop(); else if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel() } catch { /* noop */ }
  set(false)
}
export const isSpeaking = () => speaking
export function onSpeaking(f: (on: boolean) => void) { listeners.add(f); return () => { listeners.delete(f) } }
export const canSpeak = () => isNative() || typeof speechSynthesis !== 'undefined'
