// A tap you can feel and hear: a short buzz (phones that can vibrate) and a tiny soft "tick", like pressing a button.
// Used where you tap a rhythm on the screen (Rhythm trainer), so you know each tap landed.
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { audio, route } from './engine'

import { NotificationType } from '@capacitor/haptics'

/** Feel on taps, everywhere (Settings → Sound → Vibrate on taps). Never while the mic records (it would hear it). */
const KEY = 'kg:haptics'
export function hapticsOn() { try { return localStorage.getItem(KEY) !== 'false' } catch { return true } }
export function setHapticsOn(on: boolean) { try { localStorage.setItem(KEY, String(on)) } catch { /* noop */ } }
let micBusy = 0
/** Something is recording through the mic: hold the buzzing until it's done. */
export function quietForMic(on: boolean) { micBusy = Math.max(0, micBusy + (on ? 1 : -1)) }

export type Feel = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'
const MS: Record<Feel, number | number[]> = { light: 12, medium: 22, heavy: 35, success: [18, 60, 18], warning: [30, 50, 30], error: [40, 40, 40, 40, 40] }
/** A short buzz: the phone's own haptics in the app, a plain vibration in a browser. */
export function haptic(kind: Feel = 'light') {
  if (!hapticsOn() || micBusy > 0) return
  if (Capacitor.isNativePlatform()) {
    const p = kind === 'success' || kind === 'warning' || kind === 'error'
      ? Haptics.notification({ type: kind === 'success' ? NotificationType.Success : kind === 'warning' ? NotificationType.Warning : NotificationType.Error })
      : Haptics.impact({ style: kind === 'heavy' ? ImpactStyle.Heavy : kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light })
    void p.catch(() => {})
    return
  }
  try { (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }).vibrate?.(MS[kind]) } catch { /* no vibration */ }
}
/** The rhythm trainer's tap buzz. */
export const buzz = () => haptic('light')
let noise: AudioBuffer | null = null
/** A tiny button-press tick: a few milliseconds of filtered noise, quiet, different from the metronome's click. */
export function tick(level = 0.35) {
  const ctx = audio()
  void ctx.resume()
  if (!noise) {
    noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.012), ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4)
  }
  const s = ctx.createBufferSource()
  s.buffer = noise
  const f = ctx.createBiquadFilter()
  f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 1.4
  const g = ctx.createGain()
  g.gain.value = level
  s.connect(f).connect(g).connect(route('any', 'click'))
  s.start()
}
