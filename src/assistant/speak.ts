// Read answers aloud: the phone's own voice in the app (SpeakPlugin.java), the browser's voice on the web.
import { Capacitor, registerPlugin } from '@capacitor/core'

interface SpeakNative { speak(o: { text: string; rate?: number }): Promise<void>; stop(): Promise<void>; addListener(e: 'done', f: () => void): Promise<{ remove: () => void }> }
const native = registerPlugin<SpeakNative>('Speak')
const isNative = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
const listeners = new Set<(on: boolean) => void>()
let speaking = false
const set = (v: boolean) => { speaking = v; listeners.forEach(f => f(v)) }
if (isNative()) void native.addListener('done', () => set(false)).catch(() => {})

/** Plain words for speaking: no emoji, arrows or symbols read out as names. */
const clean = (t: string) => t.replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, '').replace(/→/g, ', then ').replace(/[*_#`]/g, '').replace(/\s+/g, ' ').trim()

export async function speak(text: string) {
  const t = clean(text)
  if (!t) return
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
  try { if (isNative()) void native.stop(); else if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel() } catch { /* noop */ }
  set(false)
}
export const isSpeaking = () => speaking
export function onSpeaking(f: (on: boolean) => void) { listeners.add(f); return () => { listeners.delete(f) } }
export const canSpeak = () => isNative() || typeof speechSynthesis !== 'undefined'
