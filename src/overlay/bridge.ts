// Bridge between KGuitar JS and the Android native floating overlay bubble (OverlayPlugin + OverlayService WebView).
// Also houses pure chord-trail & scale-suggestion helpers for the Songsterr / YouTube floating HUD.
import { Capacitor, registerPlugin } from '@capacitor/core'
import { SHARPS, FLATS, keyPrefersFlats, pc } from '../theory/notes'

export interface KGOverlayPlugin {
  canDrawOverlays(): Promise<{ granted: boolean; running: boolean }>
  requestOverlayPermission(): Promise<{ granted: boolean }>
  startOverlay(opts?: { expanded?: boolean }): Promise<{ ok: boolean; running?: boolean; needsPermission?: boolean }>
  stopOverlay(): Promise<{ ok: boolean; running: boolean }>
  isRunning(): Promise<{ running: boolean }>
  updateChord(opts: { text: string }): Promise<void>
  consumeRoute(): Promise<{ route: string }>
}

const KGOverlay = registerPlugin<KGOverlayPlugin>('KGOverlay')

export interface NativeOverlayJsBridge {
  collapse(): void
  expand(): void
  close(): void
  setGhost(on: boolean): void
  setOpacity(alpha: number): void
  setChord(text: string): void
  setFocusable(focusable: boolean): void
  openMain(route: string): void
}

declare global {
  interface Window {
    KGOverlayBridge?: NativeOverlayJsBridge
  }
}

export function isOverlayMode(): boolean {
  if (typeof location === 'undefined') return false
  return new URLSearchParams(location.search).get('overlay') === '1'
}

export function isNativeOverlayWebView(): boolean {
  return typeof window !== 'undefined' && !!window.KGOverlayBridge
}

export function isAndroidApp(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

export function nativeBridge(): NativeOverlayJsBridge | null {
  return typeof window !== 'undefined' ? (window.KGOverlayBridge ?? null) : null
}

export async function overlayStatus(): Promise<{ supported: boolean; granted: boolean; running: boolean }> {
  if (!isAndroidApp()) return { supported: false, granted: false, running: false }
  try {
    const r = await KGOverlay.canDrawOverlays()
    return { supported: true, granted: !!r.granted, running: !!r.running }
  } catch {
    return { supported: false, granted: false, running: false }
  }
}

export async function toggleSystemOverlay(): Promise<{ ok: boolean; running: boolean; needsPermission?: boolean; message?: string }> {
  if (!isAndroidApp()) {
    return {
      ok: false,
      running: false,
      message: 'Floating over other apps (Songsterr, YouTube, Spotify) runs in the Android app. On web, open ?overlay=1 to preview the HUD.',
    }
  }
  try {
    const st = await KGOverlay.canDrawOverlays()
    if (st.running) {
      await KGOverlay.stopOverlay()
      return { ok: true, running: false, message: 'Floating bubble turned off.' }
    }
    if (!st.granted) {
      await KGOverlay.requestOverlayPermission()
      return {
        ok: false,
        running: false,
        needsPermission: true,
        message: 'Allow "Appear on top" for KGuitar in the settings screen that just opened, then tap Float over apps again.',
      }
    }
    const r = await KGOverlay.startOverlay({ expanded: true })
    return {
      ok: !!r.ok,
      running: !!r.running,
      needsPermission: r.needsPermission,
      message: r.ok ? 'KGuitar Bubble is live! Switch to Songsterr, YouTube or Spotify — it stays right on top.' : 'Could not start overlay.',
    }
  } catch {
    return { ok: false, running: false, message: 'Could not start the Android overlay.' }
  }
}

export async function consumeOverlayRoute(): Promise<string> {
  if (!isAndroidApp()) return ''
  try {
    const r = await KGOverlay.consumeRoute()
    return r?.route || ''
  } catch {
    return ''
  }
}

export function pushOverlayChordLabel(text: string) {
  const b = nativeBridge()
  if (b) {
    try { b.setChord(text) } catch { /* noop */ }
    return
  }
  if (isAndroidApp()) {
    void KGOverlay.updateChord({ text }).catch(() => {})
  }
}

// ───────────── Pure Chord-Trail & Best-Scale Helpers (unit-tested) ─────────────

export interface TrailChord {
  symbol: string
  root: string
  minor: boolean
  at: number
}

/** Append a newly detected chord to the live trail, avoiding back-to-back duplicates and capping at maxLen. */
export function appendChordTrail(trail: TrailChord[], symbol: string, root: string, minor: boolean, maxLen = 8, now = Date.now()): TrailChord[] {
  const clean = symbol.trim()
  if (!clean) return trail
  const last = trail[trail.length - 1]
  if (last && last.symbol === clean) return trail
  return [...trail, { symbol: clean, root, minor, at: now }].slice(-maxLen)
}

/** Suggest the most musical soloing scale label for a detected key & chord. */
export function guessBestScale(keyRoot: string, keyMinor: boolean, activeChord?: string): string {
  const flats = keyPrefersFlats(keyRoot, keyMinor)
  const names = flats ? FLATS : SHARPS
  const kPc = pc(keyRoot)
  if (keyMinor) {
    const relMaj = names[(kPc + 3) % 12]
    return `${keyRoot} minor pentatonic / ${keyRoot} natural minor (${relMaj} maj)`
  }
  const relMin = names[(kPc + 9) % 12]
  if (activeChord && /7$/.test(activeChord) && !/maj7|m7/i.test(activeChord)) {
    return `${keyRoot} Mixolydian / ${keyRoot} major & minor blues`
  }
  return `${keyRoot} major pentatonic / ${relMin} minor pentatonic`
}

/** Format a live chord trail into a clean progression string for KGuitar Jam. */
export function formatTrailForJam(trail: TrailChord[]): string[] {
  if (!trail.length) return []
  return trail.slice(-8).map(t => t.symbol)
}
