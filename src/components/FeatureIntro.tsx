// App-wide "What this does" feature descriptions anchored to the ✨ AI Assistant bubble.
// Pops up automatically the first time you visit any feature across the whole app,
// dismisses cleanly with × (remembered per feature), lets you tap "Ask ✨ about this"
// to ask follow-up questions immediately, and can be reset anytime in Settings.
import { useEffect, useSyncExternalStore } from 'react'

export interface FeatureIntroDef {
  id: string
  title: string
  text: string
  askPrompt: string
}

export const FEATURE_INTROS: Record<string, FeatureIntroDef> = {
  play: {
    id: 'play',
    title: 'Song Player',
    text: 'Follow along with any guitar tab or chord sheet. Use "Wait for me" to practice at your own pace, "In time" to grade rhythm, or "Game" for highway mode.',
    askPrompt: 'How do I get the most out of the Song Player?',
  },
  songs: {
    id: 'songs',
    title: 'Songs & Library',
    text: 'Browse the built-in Songbook, your imported Guitar Pro / PDF tabs, or add new songs. Filter by key, style, or tuning.',
    askPrompt: 'How do I import tabs or filter songs in the Library?',
  },
  learn: {
    id: 'learn',
    title: 'Learn & Practice',
    text: 'Follow the Zero-to-Hero course, drill 1,000+ exercises and must-know licks, or use Ear Training, CAGED, and Target Notes tools.',
    askPrompt: 'What should I practice today in Learn?',
  },
  jam: {
    id: 'jam',
    title: 'Play with a Band',
    text: 'Auto-generate chord progressions in any key & style with drums, bass, chord shapes, and matching licks to solo over.',
    askPrompt: 'How do I customize a progression in Play with a Band?',
  },
  strum: {
    id: 'strum',
    title: 'Strum Machine',
    text: 'Build or pick 4-bar chord charts in 18 realistic styles (bluegrass, reggae skank, metal chugs, orchestral strings). Keeps playing while you browse Tabs or Scales, and opens a resizable Floating 5-Layer Neck!',
    askPrompt: 'How do I use Strum Machine with the Floating 5-Layer Neck and custom sounds?',
  },
  'chord-path': {
    id: 'chord-path',
    title: 'Chord Path',
    text: 'Choose-your-own-adventure chord web! Tap or strum any glowing orbiting chord to flow naturally through the key (Mint = in key, Gold = pull, Violet = borrowed color), or test yourself in Pathfinder mode.',
    askPrompt: 'Explain how Chord Path and Pathfinder challenges work.',
  },
  'vibe-sets': {
    id: 'vibe-sets',
    title: 'Chord Vibe Sets',
    text: 'Pick a key + genre vibe (Neo-Soul, Cinematic, Metal, Reggae, Folk, Jazz, Lo-Fi) to get an instant soundboard of great-sounding chords. Tap to hear + see guitar shapes, then send your favorite chain to Strum Machine!',
    askPrompt: 'How do I build a progression with Chord Vibe Sets?',
  },
  'key-shifter': {
    id: 'key-shifter',
    title: 'Key Shifter',
    text: 'Want to change keys mid-song? Pick your starting key and destination key, and Key Shifter builds 3 smooth chord bridges (pivot chord, chorus lift, or half-step slide) you can hear and send straight to Strum Machine.',
    askPrompt: 'How do I use Key Shifter to make a smooth key change?',
  },
  'detect-scale': {
    id: 'detect-scale',
    title: 'Detect Scale',
    text: 'Play a riff or strum chords into your mic/interface (or tap notes below) and KGuitar identifies the exact matching scales & modes, then opens your Floating 5-Layer Neck or Strum Machine in that key!',
    askPrompt: 'How does Detect Scale find my scale or mode?',
  },
  beats: {
    id: 'beats',
    title: 'Beat Maker',
    text: 'Finger-drum pads, step sequencer, piano roll, and keys powered by your studio guitar & bass packs. Pull chords straight from Strum Machine with one tap.',
    askPrompt: 'How do I build a beat or import chords into Beat Maker?',
  },
  loop: {
    id: 'loop',
    title: '4-Track Looper',
    text: 'Record up to 4 synced guitar layers over a beat or click, with foot-pedal support, reverse, half-speed, and live FX.',
    askPrompt: 'How do I record synced loops in the 4-Track Looper?',
  },
  find: {
    id: 'find',
    title: 'Riff Scanner',
    text: 'Turn a tab screenshot, PDF, video clip, or audio recording into a playable KGuitar tab automatically.',
    askPrompt: 'How do I scan a tab from a screenshot or video?',
  },
  tuner: {
    id: 'tuner',
    title: 'Chromatic Tuner',
    text: 'Fast, accurate pitch needle for standard, drop, and alternate tunings using your mic or USB guitar interface.',
    askPrompt: 'How do I tune to alternate tunings in the Tuner?',
  },
  metronome: {
    id: 'metronome',
    title: 'Metronome & Speed Trainer',
    text: 'Sample-accurate clicks or real drum grooves with subdivisions, accents, and an automatic BPM speed trainer.',
    askPrompt: 'How do I use the Speed Trainer in the Metronome?',
  },
  chords: {
    id: 'chords',
    title: 'Chord Library',
    text: 'Look up every playable guitar voicing for any chord, see the 5-Layer Neck around it, and jump straight into Chord Path.',
    askPrompt: 'How do I read the chord diagrams and 5-Layer Neck here?',
  },
  scales: {
    id: 'scales',
    title: 'Scales & Modes',
    text: 'Explore any scale across the whole neck or by fret box, inspect its 5-Layer Neck & chords, or launch an instant Strum Machine backing track to solo over.',
    askPrompt: 'How should I practice soloing over this scale?',
  },
}

const PREFIX = 'kg:introDismissed:'
let activeId: string | null = null
let revision = 0
const listeners = new Set<() => void>()

function emit() {
  revision++
  listeners.forEach(fn => { try { fn() } catch { /* noop */ } })
}

export function isFeatureIntroDismissed(id: string): boolean {
  try {
    return localStorage.getItem(PREFIX + id) === '1'
  } catch {
    return false
  }
}

export function dismissFeatureIntro(id: string) {
  try { localStorage.setItem(PREFIX + id, '1') } catch { /* private */ }
  emit()
}

export function reopenFeatureIntro(id: string) {
  try { localStorage.removeItem(PREFIX + id) } catch { /* private */ }
  activeId = id
  emit()
}

/** Bring every dismissed "What this does" popup back across the entire app. */
export function resetAllFeatureIntros() {
  try {
    for (const id of Object.keys(FEATURE_INTROS)) {
      localStorage.removeItem(PREFIX + id)
    }
  } catch { /* private */ }
  emit()
}

/** Tell the ✨ AI Assistant bubble which feature the user is currently viewing. */
export function setActiveFeatureIntro(id: string | null) {
  if (activeId === id) return
  activeId = id
  emit()
}

/** Hook for screens/sub-features to announce themselves while mounted. */
export function useRegisterFeatureIntro(id: string | null) {
  useEffect(() => {
    if (id) setActiveFeatureIntro(id)
  }, [id])
}

/** Subscribe inside AskBubble to the currently active undismissed FeatureIntro (if any). */
export function useActiveFeatureIntro(): FeatureIntroDef | null {
  useSyncExternalStore(
    cb => {
      listeners.add(cb)
      return () => { listeners.delete(cb) }
    },
    () => revision,
  )
  if (!activeId) return null
  const def = FEATURE_INTROS[activeId]
  if (!def || isFeatureIntroDismissed(def.id)) return null
  return def
}
