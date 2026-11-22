// Floating cards: what the screen you're on is doing right now (published by Play, Jam, the beat maker, Pocket Band …)
// and which floating card instances are open on each screen (supports multiple floating cards at once, including
// multiple copies of the same card like two 5-Layer Fretboards or two Book Pages, plus Workspace Presets & Arrange).
import { useEffect, useState } from 'react'

export interface FloatCtx {
  /** chords: the one sounding now, the next, and how many beats until it changes */
  chordNow?: string
  chordNext?: string
  beatsToChange?: number
  /** the key's notes (pitch classes) and its name, for the mini neck / licks / circle */
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

// ---------- Cross-card chord / progression events (Circle → Pocket Band & 5-Layer Neck) ----------
const bandChordListeners = new Set<(chord: string) => void>()
export function onBandAddChord(f: (chord: string) => void) { bandChordListeners.add(f); return () => { bandChordListeners.delete(f) } }
export function emitBandAddChord(chord: string) { bandChordListeners.forEach(f => f(chord)) }

// ---------- Floating card catalog ----------
export type CardId =
  | 'hand' | 'chord' | 'neck' | 'feedback' | 'bar' | 'tempo' | 'tuner' | 'video' | 'timer' | 'mixer'
  | 'drummer' | 'band' | 'licks' | 'circle' | 'note' | 'book'

export type CardIcon =
  | 'hand' | 'music' | 'layers' | 'ear' | 'target' | 'zap' | 'guitar' | 'film' | 'timer' | 'sliders'
  | 'drum' | 'sparkles' | 'book' | 'file' | 'disc'

export const CARDS: { id: CardId; title: string; icon: CardIcon; hint: string; group?: 'core' | 'band' | 'ref' }[] = [
  { id: 'hand', title: 'Hand', icon: 'hand', group: 'core', hint: 'Where your fingers go: the four frets your hand covers, each finger in colour, and the next shift' },
  { id: 'neck', title: '5-Layer Fretboard', icon: 'layers', group: 'core', hint: 'Mini neck or expanded 5-Layer Fretboard (Shape · Triads · Pentatonic · Mode · Free fingers)' },
  { id: 'drummer', title: 'Pocket Drummer', icon: 'drum', group: 'band', hint: 'Drums by themselves across all 7 styles, kits, My Beat Maker, Tap Tempo, Gap Click & AI fills' },
  { id: 'band', title: 'Pocket Band & Drone', icon: 'disc', group: 'band', hint: 'Single chord drone or progression with Sound Packs, Studio Bass, drums/Beat Maker, mixer & AI fills' },
  { id: 'licks', title: 'Licks & Fills', icon: 'sparkles', group: 'ref', hint: 'Must-Know Licks and Fills Workshop ideas transposed live to your key & chord' },
  { id: 'circle', title: 'Circle & Key Sheet', icon: 'music', group: 'ref', hint: 'Diatonic & borrowed chords + mini Circle of Fifths: tap to hear, light up fretboard, or add to Band' },
  { id: 'note', title: 'Sticky Note', icon: 'file', group: 'ref', hint: 'Per-song / per-lesson notes with quick tags and voice dictation' },
  { id: 'book', title: 'Book & Tab Ref', icon: 'book', group: 'ref', hint: 'Float a zoomable page from My Books (or any tab screenshot) with bookmarks & Scan this page' },
  { id: 'chord', title: 'Chord now & next', icon: 'music', group: 'core', hint: 'The chord to play now, the next one and a beat countdown to the change' },
  { id: 'feedback', title: 'What you played', icon: 'ear', group: 'core', hint: 'What the mic heard against what the tab wants' },
  { id: 'bar', title: 'Bar & beat', icon: 'target', group: 'core', hint: 'Which bar and beat you’re on, and the loop' },
  { id: 'tempo', title: 'Tempo', icon: 'zap', group: 'core', hint: 'The tempo with a beat flash; change the speed right on the card' },
  { id: 'tuner', title: 'Quick tuner', icon: 'guitar', group: 'core', hint: 'A small tuner needle for a quick check between songs' },
  { id: 'video', title: 'Mini video', icon: 'film', group: 'core', hint: 'The song’s YouTube video in a small floating player' },
  { id: 'timer', title: 'Practice timer', icon: 'timer', group: 'core', hint: 'Your practice session’s step and time left, or a stopwatch' },
  { id: 'mixer', title: 'Mixer', icon: 'sliders', group: 'band', hint: 'Band behind me: volume, mute and solo for each part' },
]

export interface CardInstance { uid: string; kind: CardId }

const KEY = (screen: string) => `kg:floatCards:${screen}`
const VALID_IDS = new Set<string>(CARDS.map(c => c.id))
// Jam: the chord and the mini neck pop up while the band plays (Jam rests its cards when nothing is playing)
const DEFAULTS: Record<string, CardId[]> = { play: ['hand'], scan: ['hand'], learn: ['hand'], jam: ['chord', 'neck'] }

function parseInstances(raw: unknown): CardInstance[] | null {
  if (!Array.isArray(raw)) return null
  const out: CardInstance[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (typeof item === 'string' && VALID_IDS.has(item)) {
      if (!seen.has(item)) { seen.add(item); out.push({ uid: item, kind: item as CardId }) }
    } else if (item && typeof item === 'object') {
      const o = item as { uid?: unknown; kind?: unknown }
      if (typeof o.uid === 'string' && typeof o.kind === 'string' && VALID_IDS.has(o.kind) && !seen.has(o.uid)) {
        seen.add(o.uid)
        out.push({ uid: o.uid, kind: o.kind as CardId })
      }
    }
  }
  return out
}

export function shownInstances(screen: string): CardInstance[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY(screen)) ?? 'null') as unknown
    const parsed = parseInstances(raw)
    if (parsed) return parsed
    if (screen === 'play' && localStorage.getItem('kg:handGuide') === 'false') return []
  } catch { /* default */ }
  return (DEFAULTS[screen] ?? []).map(kind => ({ uid: kind, kind }))
}

export function shownCards(screen: string): CardId[] {
  return [...new Set(shownInstances(screen).map(x => x.kind))]
}

const cardListeners = new Set<() => void>()
export function setShownInstances(screen: string, list: CardInstance[]) {
  try { localStorage.setItem(KEY(screen), JSON.stringify(list)) } catch { /* full */ }
  if (screen === 'play') try { localStorage.setItem('kg:handGuide', JSON.stringify(list.some(x => x.kind === 'hand'))) } catch { /* full */ }
  cardListeners.forEach(f => f())
}

export function setShownCards(screen: string, ids: CardId[]) {
  setShownInstances(screen, [...new Set(ids)].map(kind => ({ uid: kind, kind })))
}

export function toggleCard(screen: string, id: CardId) {
  const cur = shownInstances(screen)
  if (cur.some(x => x.kind === id)) setShownInstances(screen, cur.filter(x => x.kind !== id))
  else setShownInstances(screen, [...cur, { uid: id, kind: id }])
}

/** Open a brand-new floating window for `kind` (supports multiple copies of the same card!). Returns its uid. */
export function addCardInstance(screen: string, kind: CardId): string {
  const cur = shownInstances(screen)
  let uid: string = kind
  if (cur.some(x => x.uid === uid)) {
    let n = 2
    while (cur.some(x => x.uid === `${kind}-${n}`)) n++
    uid = `${kind}-${n}`
  }
  setShownInstances(screen, [...cur, { uid, kind }])
  return uid
}

export function removeCardInstance(screen: string, uid: string) {
  setShownInstances(screen, shownInstances(screen).filter(x => x.uid !== uid))
}

/** Replace one floating card instance's feature in place. */
export function swapCardInstance(screen: string, uid: string, toKind: CardId) {
  const cur = shownInstances(screen)
  const target = cur.find(x => x.uid === uid)
  if (!target || target.kind === toKind) return
  setShownInstances(screen, cur.map(x => (x.uid === uid ? { ...x, kind: toKind } : x)))
}

/** Legacy helper: replace first card of fromId with toId. */
export function swapCard(screen: string, fromId: CardId, toId: CardId) {
  const cur = shownInstances(screen)
  const hit = cur.find(x => x.kind === fromId)
  if (hit) swapCardInstance(screen, hit.uid, toId)
  else addCardInstance(screen, toKindSafe(toId))
}
const toKindSafe = (id: CardId) => id

export function useShownInstances(screen: string): CardInstance[] {
  const [v, setV] = useState(() => shownInstances(screen))
  useEffect(() => {
    setV(shownInstances(screen))
    const f = () => setV(shownInstances(screen))
    cardListeners.add(f)
    return () => { cardListeners.delete(f) }
  }, [screen])
  return v
}

export function useShownCards(screen: string): CardId[] {
  const insts = useShownInstances(screen)
  return [...new Set(insts.map(x => x.kind))]
}

// ---------- Arrange / Minimize All / Workspace Presets ----------
export interface FloatPreset {
  id: string
  name: string
  cards: CardInstance[]
  builtin?: boolean
  neck5Layer?: boolean
}

export const BUILTIN_PRESETS: FloatPreset[] = [
  { id: 'jam-rig', name: 'Jam Rig (5-Layer + Band + Licks)', builtin: true, neck5Layer: true, cards: [{ uid: 'neck', kind: 'neck' }, { uid: 'band', kind: 'band' }, { uid: 'licks', kind: 'licks' }] },
  { id: 'mode-study', name: 'Mode Study (Band + 5-Layer + Circle)', builtin: true, neck5Layer: true, cards: [{ uid: 'band', kind: 'band' }, { uid: 'neck', kind: 'neck' }, { uid: 'circle', kind: 'circle' }] },
  { id: 'book-practice', name: 'Book Practice (Book + Drummer + Note)', builtin: true, cards: [{ uid: 'book', kind: 'book' }, { uid: 'drummer', kind: 'drummer' }, { uid: 'note', kind: 'note' }] },
  { id: 'dual-neck', name: 'Dual Fretboard (2× 5-Layer)', builtin: true, neck5Layer: true, cards: [{ uid: 'neck', kind: 'neck' }, { uid: 'neck-2', kind: 'neck' }] },
]

const PRESETS_KEY = 'kg:floatPresets'
export function savedPresets(): FloatPreset[] {
  try {
    const raw = JSON.parse(localStorage.getItem(PRESETS_KEY) ?? '[]') as FloatPreset[]
    return Array.isArray(raw) ? raw : []
  } catch { return [] }
}
export function savePreset(name: string, screen: string) {
  const cards = shownInstances(screen).filter(c => c.kind !== 'hand')
  if (!cards.length) return
  const list = savedPresets().filter(p => p.name !== name)
  list.unshift({ id: `u-${Date.now()}`, name, cards })
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(list.slice(0, 8))) } catch { /* full */ }
  cardListeners.forEach(f => f())
}
export function deletePreset(id: string) {
  const list = savedPresets().filter(p => p.id !== id)
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(list)) } catch { /* full */ }
  cardListeners.forEach(f => f())
}
export function applyPreset(screen: string, preset: FloatPreset) {
  const keepHand = shownInstances(screen).filter(c => c.kind === 'hand')
  if (preset.neck5Layer) try { localStorage.setItem('kg:floatNeck5Layer', '1') } catch { /* private */ }
  setCleanStage(false)
  setShownInstances(screen, [...keepHand, ...preset.cards])
  setTimeout(() => arrangeFloatCards(), 80)
}

/** Neatly arrange all open floating cards in non-overlapping positions on screen. */
export function arrangeFloatCards() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('kg-float-arrange'))
}
/** Shrink all open floating cards into compact edge bubbles (or restore them). */
export function minimizeAllCards(min = true) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('kg-float-minall', { detail: { min } }))
}

// ---------- Clean Stage focus toggle (1-tap hide/show all floating cards) ----------
let cleanStage = false
const cleanListeners = new Set<() => void>()
export function isCleanStage() { return cleanStage }
export function setCleanStage(v: boolean) {
  if (v === cleanStage) return
  cleanStage = v
  cleanListeners.forEach(f => f())
}
export function useCleanStage(): boolean {
  const [v, setV] = useState(cleanStage)
  useEffect(() => { const f = () => setV(cleanStage); cleanListeners.add(f); return () => { cleanListeners.delete(f) } }, [])
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
