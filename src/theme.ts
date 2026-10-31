// Day / Night / Psychedelic / Auto appearance. Auto follows the phone's dark-mode setting.
// Psychedelic: neon colours on deep cosmic purple, the samurai dog and trippy art all through the app, with slowly
// drifting colour behind everything (the drifting can be switched off; it also stops if the phone asks for less motion).
import { useSyncExternalStore } from 'react'
import { Capacitor, SystemBars, SystemBarsStyle, registerPlugin } from '@capacitor/core'
import { DOG_IDS, hashStr, type DogId } from './art/samurai'

export type ThemeChoice = 'auto' | 'day' | 'night' | 'psy'
export type ActiveTheme = 'day' | 'night' | 'psy'
const KEY = 'kg:theme'
const MOTION = 'kg:psyMotion'
const DOG = 'kg:psyDog'
// Build 15 made Psychedelic the default look: every install switches to it once (Settings → Look switches back).
const PSY_DEFAULT = 'kg:psyDefault'
const listeners = new Set<() => void>()
let version = 0
const changed = () => { version++; listeners.forEach(f => f()) }

export function themeChoice(): ThemeChoice {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '"psy"') as ThemeChoice
    return ['auto', 'day', 'night', 'psy'].includes(v) ? v : 'psy'
  } catch { return 'psy' }
}
const dark = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
/** The theme actually showing right now. */
export function activeTheme(c = themeChoice()): ActiveTheme {
  return c === 'auto' ? (dark() ? 'night' : 'day') : c
}
/** Psychedelic mode's drifting colours (on unless switched off). */
export function psyMotion(): boolean {
  try { return localStorage.getItem(MOTION) !== '0' } catch { return true }
}

const BG: Record<ActiveTheme, string> = { day: '#eeebf3', night: '#120e17', psy: '#14002b' }

let migrated = false
function psyByDefault() {
  if (migrated) return
  migrated = true
  try {
    if (localStorage.getItem(PSY_DEFAULT) !== '1') {
      localStorage.setItem(KEY, JSON.stringify('psy'))
      localStorage.setItem(PSY_DEFAULT, '1')
    }
  } catch { /* storage unavailable */ }
}

export function applyTheme() {
  psyByDefault()
  const c = themeChoice()
  const root = document.documentElement
  const t = activeTheme(c)
  if (c === 'auto') delete root.dataset.theme
  else root.dataset.theme = c
  root.dataset.motion = psyMotion() ? 'on' : 'off'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BG[t])
  // status bar icons: light on dark themes, dark on day
  SystemBars.setStyle({ style: t === 'day' ? SystemBarsStyle.Light : SystemBarsStyle.Dark }).catch(() => {})
}

export function setTheme(c: ThemeChoice) {
  try { localStorage.setItem(KEY, JSON.stringify(c)) } catch { /* storage unavailable */ }
  applyTheme()
  changed()
}
export function setPsyMotion(on: boolean) {
  try { localStorage.setItem(MOTION, on ? '1' : '0') } catch { /* storage unavailable */ }
  applyTheme()
  changed()
}

if (typeof matchMedia !== 'undefined') {
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (themeChoice() === 'auto') { applyTheme(); changed() } })
}

const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } }
export function useTheme(): ThemeChoice {
  useSyncExternalStore(subscribe, () => version)
  return themeChoice()
}
/** The theme showing now (Auto resolved to day or night). */
export function useActiveTheme(): ActiveTheme {
  useSyncExternalStore(subscribe, () => version)
  return activeTheme()
}
/** Your samurai: the dog breed that greets you in Psychedelic mode, or 'mix' for a different one each time. */
export type DogChoice = DogId | 'mix'
export function psyDogChoice(): DogChoice {
  try {
    const v = JSON.parse(localStorage.getItem(DOG) ?? '"mix"') as DogChoice
    return v === 'mix' || DOG_IDS.includes(v) ? v : 'mix'
  } catch { return 'mix' }
}
export function setPsyDog(d: DogChoice) {
  try { localStorage.setItem(DOG, JSON.stringify(d)) } catch { /* storage unavailable */ }
  changed()
}
/** A breed for a place in the app (the same all day for the same place when mixing). */
export function breedFor(seed: string, choice: DogChoice = psyDogChoice()): DogId {
  if (choice !== 'mix') return choice
  return DOG_IDS[hashStr(seed + new Date().toDateString()) % DOG_IDS.length]
}
/** A breed that depends only on the seed (songs keep their dog). */
export const breedOf = (seed: string): DogId => DOG_IDS[hashStr(seed) % DOG_IDS.length]
export function usePsyDog(): DogChoice {
  useSyncExternalStore(subscribe, () => version)
  return psyDogChoice()
}
export function usePsyMotion(): boolean {
  useSyncExternalStore(subscribe, () => version)
  return psyMotion()
}

/** Full screen: the phone's buttons, status bar and taskbar tuck away; swipe up from the bottom to bring them back for a moment. */
const Immersive = registerPlugin<{ set(o: { on: boolean }): Promise<void> }>('Immersive')
export function fullScreen(): boolean { try { return localStorage.getItem('kg:fullScreen') === 'true' } catch { return false } }
export function setFullScreen(on: boolean) {
  try { localStorage.setItem('kg:fullScreen', String(on)) } catch { /* noop */ }
  if (Capacitor.isNativePlatform()) Immersive.set({ on }).catch(() => {})
}
// apply it when the app starts
if (typeof window !== 'undefined' && fullScreen() && Capacitor.isNativePlatform()) setTimeout(() => Immersive.set({ on: true }).catch(() => {}), 300)
