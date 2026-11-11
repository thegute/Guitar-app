// Floating cards: what the screen you're on is doing right now (published by Play, Jam, the beat maker …) and which cards
// are shown on each screen. The cards themselves are in float/FloatLayer.tsx; the shell (move, resize, bubble, hide) in
// components/FloatCard.tsx.
import { useEffect, useState } from 'react'

export interface FloatCtx {
  /** chords: the one sounding now, the next, and how many beats until it changes */
  chordNow?: string
  chordNext?: string
  beatsToChange?: number
  /** the key's notes (pitch classes) and its name, for the mini neck */
  keyPcs?: number[]
  keyName?: string
  /** where your hand is (first fret of the box), so the mini neck shows that part of the neck */
  handBase?: number
  tuning?: number[]
  flats?: boolean
  /** the last thing the mic heard against what the tab wanted */
  feedback?: { ok: boolean; heard: string; want?: string; key: number }
  /** where the music is */
  bar?: number
  bars?: number
  beat?: number
  loop?: string
  /** tempo: the song's BPM and the speed you play it at; setSpeed changes it from the card */
  bpm?: number
  speed?: number
  setSpeed?: (s: number) => void
  /** the song's video, for the mini YouTube card */
  video?: string
  title?: string
  /** Band behind me: which band parts this song has, and the chord band's style (pick another on the Mixer card) */
  band?: { parts: ('drums' | 'bass' | 'other')[]; style?: string; styles?: { id: string; label: string }[]; setStyle?: (s: string) => void }
}

let ctx: FloatCtx = {}
let owner = ''
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(f => f())

/** A screen tells the cards what it's doing (merged into what it said before). */
export function publishFloat(screen: string, part: FloatCtx) {
  if (owner !== screen) { owner = screen; ctx = {} }
  let changed = false
  for (const k of Object.keys(part) as (keyof FloatCtx)[]) if (ctx[k] !== part[k]) { changed = true; break }
  if (!changed) return
  ctx = { ...ctx, ...part }
  emit()
}
/** The screen is gone: its cards show their empty state. */
export function clearFloat(screen: string) { if (owner === screen) { ctx = {}; owner = ''; emit() } }

export function useFloatCtx(): FloatCtx {
  const [, bump] = useState(0)
  useEffect(() => { const f = () => bump(n => n + 1); listeners.add(f); return () => { listeners.delete(f) } }, [])
  return ctx
}

// ---------- which cards are shown, per screen ----------
export type CardId = 'hand' | 'chord' | 'neck' | 'feedback' | 'bar' | 'tempo' | 'tuner' | 'video' | 'timer' | 'mixer'
export const CARDS: { id: CardId; title: string; icon: 'hand' | 'music' | 'layers' | 'ear' | 'target' | 'zap' | 'guitar' | 'film' | 'timer' | 'sliders'; hint: string }[] = [
  { id: 'hand', title: 'Hand', icon: 'hand', hint: 'Where your fingers go: the four frets your hand covers, each finger in colour, and the next shift' },
  { id: 'chord', title: 'Chord now & next', icon: 'music', hint: 'The chord to play now, the next one and a beat countdown to the change' },
  { id: 'neck', title: 'Mini neck', icon: 'layers', hint: 'The key’s notes around your hand, with the chord’s notes lit and its root in red' },
  { id: 'feedback', title: 'What you played', icon: 'ear', hint: 'What the mic heard against what the tab wants' },
  { id: 'bar', title: 'Bar & beat', icon: 'target', hint: 'Which bar and beat you’re on, and the loop' },
  { id: 'tempo', title: 'Tempo', icon: 'zap', hint: 'The tempo with a beat flash; change the speed right on the card' },
  { id: 'tuner', title: 'Quick tuner', icon: 'guitar', hint: 'A small tuner needle for a quick check between songs' },
  { id: 'video', title: 'Mini video', icon: 'film', hint: 'The song’s YouTube video in a small floating player' },
  { id: 'timer', title: 'Practice timer', icon: 'timer', hint: 'Your practice session’s step and time left, or a stopwatch' },
  { id: 'mixer', title: 'Mixer', icon: 'sliders', hint: 'Band behind me: the volume of your part, the drums, the bass and the other parts, each with mute and solo; the chord band’s style' },
]
const KEY = (screen: string) => `kg:floatCards:${screen}`
// Jam: the chord and the mini neck pop up while the band plays (Jam rests its cards when nothing is playing)
const DEFAULTS: Record<string, CardId[]> = { play: ['hand'], scan: ['hand'], learn: ['hand'], jam: ['chord', 'neck'] }

export function shownCards(screen: string): CardId[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY(screen)) ?? 'null') as CardId[] | null
    if (Array.isArray(v)) return v
    // Play: the old "Where your fingers go" switch
    if (screen === 'play' && localStorage.getItem('kg:handGuide') === 'false') return []
  } catch { /* default */ }
  return DEFAULTS[screen] ?? []
}
const cardListeners = new Set<() => void>()
export function setShownCards(screen: string, ids: CardId[]) {
  try { localStorage.setItem(KEY(screen), JSON.stringify(ids)) } catch { /* full */ }
  if (screen === 'play') try { localStorage.setItem('kg:handGuide', JSON.stringify(ids.includes('hand'))) } catch { /* full */ }
  cardListeners.forEach(f => f())
}
export function toggleCard(screen: string, id: CardId) {
  const cur = shownCards(screen)
  setShownCards(screen, cur.includes(id) ? cur.filter(c => c !== id) : [...cur, id])
}
export function useShownCards(screen: string): CardId[] {
  const [v, setV] = useState(() => shownCards(screen))
  useEffect(() => {
    setV(shownCards(screen))
    const f = () => setV(shownCards(screen))
    cardListeners.add(f)
    return () => { cardListeners.delete(f) }
  }, [screen])
  return v
}

// ---------- the screen the cards are on (App sets it) ----------
let screenNow = 'play'
const screenListeners = new Set<() => void>()
export function setFloatScreen(s: string) { if (s !== screenNow) { screenNow = s; screenListeners.forEach(f => f()) } }
export function useFloatScreen(): string {
  const [v, setV] = useState(screenNow)
  useEffect(() => { const f = () => setV(screenNow); screenListeners.add(f); return () => { screenListeners.delete(f) } }, [])
  return v
}

// the card that was touched last is drawn on top of the others
let front = 0
export const bringToFront = () => ++front

// a screen can rest its cards while nothing is going on (Jam: only while the band plays)
const resting = new Set<string>()
const restListeners = new Set<() => void>()
export function setFloatResting(screen: string, on: boolean) {
  if (on === resting.has(screen)) return
  if (on) resting.add(screen); else resting.delete(screen)
  restListeners.forEach(f => f())
}
export function useFloatResting(screen: string): boolean {
  const [v, setV] = useState(() => resting.has(screen))
  useEffect(() => { setV(resting.has(screen)); const f = () => setV(resting.has(screen)); restListeners.add(f); return () => { restListeners.delete(f) } }, [screen])
  return v
}
