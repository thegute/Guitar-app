// Smart (offline) + ✨ AI-generated Drum Fills and Bass Fills for Pocket Drummer, Pocket Band & Drone, and Beat Maker.
// All fills operate on a 16th-note bar grid (steps 0..15) so they lock sample-accurately onto the shared audio clock.
import { ask, activeProvider } from '../assistant/providers'
import type { Voice } from '../audio/drums'

export type DrumFillStyle = 'simple' | 'syncopated' | 'linear' | 'double'
export interface DrumFillHit { step: number; voice: Voice; vel: number }
export interface BassFillHit { step: number; midi: number; vel: number; lenSteps: number }

const VALID_VOICES = new Set<Voice>(['kick', 'snare', 'hat', 'open', 'rim', 'ride', 'ghost', 'clap', 'pedal', 'bell', 'crash'])

/** Instant offline style-matched drum fill for beats 3–4 (steps 8..15) or full bar (steps 4..15). */
export function generateDrumFill(style: DrumFillStyle, seed = Math.floor(Math.random() * 100)): DrumFillHit[] {
  const v = seed % 3
  if (style === 'simple') {
    if (v === 0) return [
      { step: 8, voice: 'snare', vel: 0.72 }, { step: 10, voice: 'snare', vel: 0.78 },
      { step: 12, voice: 'snare', vel: 0.88 }, { step: 14, voice: 'snare', vel: 0.95 },
      { step: 15, voice: 'kick', vel: 0.85 },
    ]
    if (v === 1) return [
      { step: 8, voice: 'kick', vel: 0.85 }, { step: 10, voice: 'snare', vel: 0.8 },
      { step: 12, voice: 'kick', vel: 0.88 }, { step: 13, voice: 'snare', vel: 0.72 },
      { step: 14, voice: 'snare', vel: 0.92 }, { step: 15, voice: 'open', vel: 0.7 },
    ]
    return [
      { step: 10, voice: 'snare', vel: 0.75 }, { step: 12, voice: 'snare', vel: 0.85 },
      { step: 13, voice: 'ghost', vel: 0.55 }, { step: 14, voice: 'snare', vel: 0.94 },
      { step: 15, voice: 'snare', vel: 0.82 },
    ]
  }
  if (style === 'syncopated') {
    if (v === 0) return [
      { step: 8, voice: 'snare', vel: 0.85 }, { step: 9, voice: 'ghost', vel: 0.48 },
      { step: 11, voice: 'snare', vel: 0.9 }, { step: 12, voice: 'kick', vel: 0.92 },
      { step: 14, voice: 'snare', vel: 0.96 }, { step: 15, voice: 'kick', vel: 0.86 },
    ]
    return [
      { step: 7, voice: 'kick', vel: 0.85 }, { step: 8, voice: 'snare', vel: 0.88 },
      { step: 10, voice: 'kick', vel: 0.85 }, { step: 11, voice: 'snare', vel: 0.82 },
      { step: 13, voice: 'snare', vel: 0.9 }, { step: 15, voice: 'open', vel: 0.78 },
    ]
  }
  if (style === 'linear') {
    // Classic RLKK / RLRLKK linear pocket fill (no simultaneous limbs)
    return [
      { step: 8, voice: 'snare', vel: 0.85 }, { step: 9, voice: 'ghost', vel: 0.55 },
      { step: 10, voice: 'kick', vel: 0.9 }, { step: 11, voice: 'kick', vel: 0.82 },
      { step: 12, voice: 'snare', vel: 0.92 }, { step: 13, voice: 'rim', vel: 0.74 },
      { step: 14, voice: 'kick', vel: 0.92 }, { step: 15, voice: 'snare', vel: 0.96 },
    ]
  }
  // double-time 16th-note drive across steps 8..15
  return [
    { step: 8, voice: 'snare', vel: 0.7 }, { step: 9, voice: 'ghost', vel: 0.52 },
    { step: 10, voice: 'snare', vel: 0.78 }, { step: 11, voice: 'kick', vel: 0.82 },
    { step: 12, voice: 'snare', vel: 0.86 }, { step: 13, voice: 'snare', vel: 0.78 },
    { step: 14, voice: 'snare', vel: 0.94 }, { step: 15, voice: 'snare', vel: 0.98 },
  ]
}

/**
 * Instant offline musical bass fill/turnaround (steps 8..15) leading smoothly into `nextRootPc` on Beat 1!
 * Produces real chromatic walk-ups, pentatonic drops, or fifth-octave approaches in bass range (E1=28..E3=52).
 */
export function generateBassFill(curRootPc: number, nextRootPc: number, minor: boolean, seed = Math.floor(Math.random() * 100)): BassFillHit[] {
  const bassRoot = (pcVal: number) => {
    const p = ((pcVal % 12) + 12) % 12
    const m = 28 + ((p - 4 + 12) % 12) // E1 (28) .. D#2 (39)
    return m
  }
  const cur = bassRoot(curRootPc)
  const nxt = bassRoot(nextRootPc)
  const v = seed % 4

  if (v === 0) {
    // Chromatic walk-up into next root (beat 3, 3&, 4, 4&)
    const target = nxt <= cur ? nxt + 12 : nxt
    return [
      { step: 8, midi: cur, vel: 0.85, lenSteps: 2 },
      { step: 10, midi: target - 3, vel: 0.8, lenSteps: 2 },
      { step: 12, midi: target - 2, vel: 0.86, lenSteps: 2 },
      { step: 14, midi: target - 1, vel: 0.92, lenSteps: 2 },
    ]
  }
  if (v === 1) {
    // Octave pop + fifth turnaround leading down a half-step to next root
    const fifth = cur + 7
    const oct = cur + 12
    const approach = nxt + 1 <= 48 ? nxt + 1 : nxt - 1
    return [
      { step: 8, midi: cur, vel: 0.86, lenSteps: 2 },
      { step: 10, midi: oct, vel: 0.82, lenSteps: 2 },
      { step: 12, midi: fifth, vel: 0.84, lenSteps: 2 },
      { step: 14, midi: approach, vel: 0.9, lenSteps: 2 },
    ]
  }
  if (v === 2) {
    // Pentatonic 16th-note turnaround (beats 3–4)
    const third = cur + (minor ? 3 : 4)
    const fifth = cur + 7
    const sixth = cur + (minor ? 10 : 9)
    const approach = nxt - 1 >= 28 ? nxt - 1 : nxt + 1
    return [
      { step: 8, midi: cur, vel: 0.84, lenSteps: 2 },
      { step: 10, midi: third, vel: 0.8, lenSteps: 2 },
      { step: 12, midi: fifth, vel: 0.85, lenSteps: 1 },
      { step: 13, midi: sixth, vel: 0.82, lenSteps: 1 },
      { step: 14, midi: approach, vel: 0.92, lenSteps: 2 },
    ]
  }
  // Syncopated 5th → b7 → octave → half-step approach
  const approach = nxt - 1 >= 28 ? nxt - 1 : nxt + 1
  return [
    { step: 8, midi: cur + 7, vel: 0.84, lenSteps: 3 },
    { step: 11, midi: cur + 10, vel: 0.86, lenSteps: 2 },
    { step: 13, midi: cur + 12, vel: 0.82, lenSteps: 1 },
    { step: 14, midi: approach, vel: 0.92, lenSteps: 2 },
  ]
}

export const canUseAiFills = () => !!activeProvider()

/** Ask Gemini/Groq for a custom 16th-note drum fill (steps 8..15) matched to the groove/style/BPM. */
export async function askAiDrumFill(opts: { style: string; bpm: number; kit: string }): Promise<DrumFillHit[] | null> {
  if (!activeProvider()) return null
  const sys = `You are a pro session drummer. Create a tasty 2-beat drum fill on steps 8..15 of a 16-step 4/4 bar.
Allowed voices: kick, snare, hat, open, rim, ride, ghost, clap, bell.
Reply ONLY with valid JSON array: [{"step":8,"voice":"snare","vel":0.8}, ...] (4 to 9 hits, steps 8..15, vel 0.4..1.0).`
  try {
    const raw = await ask(sys, [{ role: 'user', text: `Style: ${opts.style}, Kit: ${opts.kit}, Tempo: ${opts.bpm} BPM. Make it musical and groovy.` }], { json: true, maxTokens: 400, deadlineMs: 12000 })
    const s = raw.indexOf('['), e = raw.lastIndexOf(']')
    if (s < 0 || e <= s) return null
    const arr = JSON.parse(raw.slice(s, e + 1)) as unknown[]
    if (!Array.isArray(arr)) return null
    const out: DrumFillHit[] = []
    for (const x of arr) {
      if (!x || typeof x !== 'object') continue
      const o = x as Record<string, unknown>
      const step = Math.round(Number(o.step))
      const voice = String(o.voice ?? '') as Voice
      const vel = Math.max(0.35, Math.min(1, Number(o.vel ?? 0.8)))
      if (step >= 4 && step <= 15 && VALID_VOICES.has(voice)) out.push({ step, voice, vel })
    }
    return out.length >= 3 ? out : null
  } catch {
    return null
  }
}

/** Ask Gemini/Groq for a custom 16th-note bass fill/turnaround (steps 8..15) leading into the next chord. */
export async function askAiBassFill(opts: { curChord: string; nextChord: string; bpm: number; style: string }): Promise<BassFillHit[] | null> {
  if (!activeProvider()) return null
  const sys = `You are a pro session bassist. Create a musical 2-beat bass fill/turnaround on steps 8..15 of a 16-step 4/4 bar leading smoothly into the next chord on beat 1.
Use bass guitar MIDI notes 28 (E1) to 55 (G3).
Reply ONLY with valid JSON array: [{"step":8,"midi":36,"vel":0.85,"len":2}, ...] (3 to 7 notes, steps 8..15, len 1..4).`
  try {
    const raw = await ask(sys, [{ role: 'user', text: `Current chord: ${opts.curChord}, Next chord: ${opts.nextChord}, Style: ${opts.style}, Tempo: ${opts.bpm} BPM.` }], { json: true, maxTokens: 400, deadlineMs: 12000 })
    const s = raw.indexOf('['), e = raw.lastIndexOf(']')
    if (s < 0 || e <= s) return null
    const arr = JSON.parse(raw.slice(s, e + 1)) as unknown[]
    if (!Array.isArray(arr)) return null
    const out: BassFillHit[] = []
    for (const x of arr) {
      if (!x || typeof x !== 'object') continue
      const o = x as Record<string, unknown>
      const step = Math.round(Number(o.step))
      const midi = Math.round(Number(o.midi))
      const vel = Math.max(0.4, Math.min(1, Number(o.vel ?? 0.85)))
      const lenSteps = Math.max(1, Math.min(4, Math.round(Number(o.len ?? 2))))
      if (step >= 6 && step <= 15 && midi >= 28 && midi <= 58) out.push({ step, midi, vel, lenSteps })
    }
    return out.length >= 2 ? out : null
  } catch {
    return null
  }
}
