// Bridge between KGuitar JS and the Android native floating overlay bubble (OverlayPlugin + OverlayService WebView).
// Also houses pure chord-trail & scale-suggestion helpers for the Songsterr / YouTube floating HUD.
import { Capacitor, registerPlugin } from '@capacitor/core'
import { SHARPS, FLATS, keyPrefersFlats, pc } from '../theory/notes'

export interface KGOverlayPlugin {
  canDrawOverlays(): Promise<{ granted: boolean; running: boolean }>
  requestOverlayPermission(): Promise<{ granted: boolean }>
  startOverlay(opts?: { expanded?: boolean; tab?: string }): Promise<{ ok: boolean; running?: boolean; needsPermission?: boolean }>
  addBubble(opts?: { tab?: string }): Promise<{ ok: boolean; count?: number; needsPermission?: boolean }>
  stopOverlay(): Promise<{ ok: boolean; running: boolean }>
  isRunning(): Promise<{ running: boolean; count?: number }>
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
  setTab?(tab: string): void
  setFocusable(focusable: boolean): void
  addBubble?(tab: string): void
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

export function overlayInitialTab(): string {
  if (typeof location === 'undefined') return 'neck'
  return new URLSearchParams(location.search).get('tab') || 'neck'
}

export function overlayWindowId(): string {
  if (typeof location === 'undefined') return 'w1'
  return new URLSearchParams(location.search).get('wid') || 'w1'
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
      return { ok: true, running: false, message: 'Floating bubbles turned off.' }
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
    const r = await KGOverlay.startOverlay({ expanded: true, tab: 'neck' })
    return {
      ok: !!r.ok,
      running: !!r.running,
      needsPermission: r.needsPermission,
      message: r.ok ? 'KGuitar Bubble is live! Switch to Songsterr, YouTube or Spotify — tap + to open multiple bubbles.' : 'Could not start overlay.',
    }
  } catch {
    return { ok: false, running: false, message: 'Could not start the Android overlay.' }
  }
}

export async function addSystemBubble(tab = ''): Promise<boolean> {
  const b = nativeBridge()
  if (b?.addBubble) {
    try { b.addBubble(tab); return true } catch { return false }
  }
  if (isAndroidApp()) {
    try {
      const r = await KGOverlay.addBubble({ tab })
      return !!r.ok
    } catch { return false }
  }
  if (typeof window !== 'undefined') {
    window.open(`/?overlay=1&tab=${encodeURIComponent(tab || 'hand')}`, '_blank')
    return true
  }
  return false
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

// ───────────── Live Multi-Bubble Sync (all open overlay bubbles share chord/key/trail/capo live!) ─────────────

export interface SharedOverlayState {
  root: string
  qual: string
  keyRoot: string
  keyMinor: boolean
  capo: number
  bpm: number
  trail: TrailChord[]
  fromWid: string
  at: number
}

const SYNC_STORAGE_KEY = 'kg:overlayLiveState'
const SYNC_CHANNEL = 'kg-overlay-sync'

export function loadSharedOverlayState(): SharedOverlayState | null {
  try {
    const raw = localStorage.getItem(SYNC_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SharedOverlayState
    if (parsed && typeof parsed.root === 'string' && typeof parsed.keyRoot === 'string') return parsed
  } catch { /* ignore */ }
  return null
}

export function broadcastOverlayState(state: SharedOverlayState) {
  try { localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(state)) } catch { /* full */ }
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(SYNC_CHANNEL)
      ch.postMessage(state)
      ch.close()
    }
  } catch { /* unsupported */ }
}

export function subscribeOverlayState(myWid: string, onUpdate: (s: SharedOverlayState) => void): () => void {
  const handle = (s: SharedOverlayState | null) => {
    if (!s || s.fromWid === myWid) return
    onUpdate(s)
  }
  let ch: BroadcastChannel | null = null
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      ch = new BroadcastChannel(SYNC_CHANNEL)
      ch.onmessage = e => handle(e.data as SharedOverlayState)
    }
  } catch { ch = null }
  const onStorage = (e: StorageEvent) => {
    if (e.key !== SYNC_STORAGE_KEY || !e.newValue) return
    try { handle(JSON.parse(e.newValue) as SharedOverlayState) } catch { /* ignore */ }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener('storage', onStorage)
    try { ch?.close() } catch { /* noop */ }
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
