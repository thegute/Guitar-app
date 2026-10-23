// Day / Night / Auto appearance. Auto follows the phone's dark-mode setting.
import { useSyncExternalStore } from 'react'
import { SystemBars, SystemBarsStyle } from '@capacitor/core'

export type ThemeChoice = 'auto' | 'day' | 'night'
const KEY = 'kg:theme'
const listeners = new Set<() => void>()

export function themeChoice(): ThemeChoice {
  try { return (JSON.parse(localStorage.getItem(KEY) ?? '"auto"') as ThemeChoice) || 'auto' } catch { return 'auto' }
}
const dark = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
/** The theme actually showing right now. */
export function activeTheme(c = themeChoice()): 'day' | 'night' {
  return c === 'auto' ? (dark() ? 'night' : 'day') : c
}

export function applyTheme() {
  const c = themeChoice()
  const root = document.documentElement
  if (c === 'auto') delete root.dataset.theme
  else root.dataset.theme = c
  const t = activeTheme(c)
  const bg = t === 'night' ? '#120e17' : '#eeebf3'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
  // status bar icons: light on night, dark on day
  SystemBars.setStyle({ style: t === 'night' ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {})
}

export function setTheme(c: ThemeChoice) {
  try { localStorage.setItem(KEY, JSON.stringify(c)) } catch { /* storage unavailable */ }
  applyTheme()
  listeners.forEach(f => f())
}

if (typeof matchMedia !== 'undefined') {
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (themeChoice() === 'auto') { applyTheme(); listeners.forEach(f => f()) } })
}

export function useTheme(): ThemeChoice {
  return useSyncExternalStore(f => { listeners.add(f); return () => { listeners.delete(f) } }, themeChoice)
}
