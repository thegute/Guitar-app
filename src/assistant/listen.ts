// Hands-free: listen for one spoken phrase. On the phone it's Android's own speech recognition (ListenPlugin.java);
// on the web, the browser's (Chrome on a computer has it). The words come back as text.
import { Capacitor, registerPlugin } from '@capacitor/core'

interface ListenNative {
  available(): Promise<{ ok: boolean }>
  listen(o: { lang?: string }): Promise<{ text: string; error?: string }>
  stop(): Promise<void>
  addListener(e: 'partial', f: (d: { text: string }) => void): Promise<{ remove: () => void }>
  addListener(e: 'ready', f: () => void): Promise<{ remove: () => void }>
  addListener(e: 'level', f: (d: { level: number }) => void): Promise<{ remove: () => void }>
}
const native = registerPlugin<ListenNative>('Listen')
const isNative = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
type WebRec = { lang: string; interimResults: boolean; maxAlternatives: number; continuous: boolean; start(): void; stop(): void; abort(): void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null }
const WebSR = (): (new () => WebRec) | null => {
  const w = globalThis as unknown as { SpeechRecognition?: new () => WebRec; webkitSpeechRecognition?: new () => WebRec }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const canListen = () => isNative() || !!WebSR()
let web: WebRec | null = null
// while you talk to the helper (and the helper talks back), Play doesn't judge what the mic hears
let talking = false
export const talkingNow = () => talking
export function setTalking(on: boolean) { talking = on }

export interface Heard { text: string; error?: 'nothing' | 'network' | 'permission' | 'busy' | 'unavailable' | 'error' }

/** Listen for one phrase. `onWords` gets the words so far while you're still talking. */
export async function listenOnce(onWords?: (t: string) => void, onLevel?: (v: number) => void): Promise<Heard> {
  if (isNative()) {
    const subs: { remove: () => void }[] = []
    try {
      if (onWords) subs.push(await native.addListener('partial', d => onWords(d.text)))
      if (onLevel) subs.push(await native.addListener('level', d => onLevel(d.level)))
      const r = await native.listen({})
      return { text: (r.text ?? '').trim(), error: r.error as Heard['error'] }
    } catch { return { text: '', error: 'error' } } finally { subs.forEach(s => s.remove()) }
  }
  const SR = WebSR()
  if (!SR) return { text: '', error: 'unavailable' }
  return new Promise<Heard>(done => {
    const r = new SR()
    web = r
    r.lang = navigator.language || 'en-US'
    r.interimResults = true
    r.maxAlternatives = 1
    r.continuous = false
    let text = '', err: Heard['error']
    r.onresult = e => {
      text = Array.from(e.results).map(x => x[0].transcript).join(' ')
      onWords?.(text)
    }
    r.onerror = e => { err = e.error === 'no-speech' ? 'nothing' : e.error === 'not-allowed' ? 'permission' : e.error === 'network' ? 'network' : 'error' }
    r.onend = () => { web = null; done({ text: text.trim(), error: text.trim() ? undefined : err ?? 'nothing' }) }
    try { r.start() } catch { done({ text: '', error: 'busy' }) }
  })
}
export function stopListening() {
  try { if (isNative()) void native.stop(); else web?.abort() } catch { /* already stopped */ }
}
