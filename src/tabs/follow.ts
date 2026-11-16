// Turns the microphone (or USB amp) into a stream of "note played" events, and follows a tab with them.
// The sound is captured sample by sample (AudioWorklet) and analysed by the shared listener (src/engine/listener.ts).
import { accepted } from './bends'
import {
  DEFAULT_TAPE_SECONDS,
  ListenerSession,
  acquireListener,
  cutListenerTape,
  type ListenerConfig,
  type ListenerNoteEvent,
} from '../engine/listener'

export type NoteEvent = ListenerNoteEvent
export { acquireListener, type ListenerConfig, ListenerSession }

/**
 * Listens and reports each note played: pick attacks (even the same note again) and legato changes
 * (hammer-ons, pull-offs, slides). Tell it what the tab wants next with expect(): it checks for those notes first,
 * which is much more reliable with distortion, room noise or strings ringing on.
 *
 * Backed by the shared capture hub (`src/engine/listener.ts`) with strictly isolated per-consumer settings
 * and smart speaker-bleed suppression on the phone microphone.
 */
export class NoteListener extends ListenerSession {
  constructor(consumerId = 'play', config?: ListenerConfig) {
    super(consumerId, config)
  }
}

/** how much of what was played the listener keeps (seconds) */
export const TAPE_SECONDS = DEFAULT_TAPE_SECONDS

/** A stretch of a ring tape: `taped` samples written so far (the newest at index (taped − 1) mod length), sample 0 at
 *  time t0. Clamped to what the tape still holds; null when less than a tenth of a second is left. */
export const cutTape = cutListenerTape

/** seconds after a bent note is hit in which a stray reading isn't called a wrong note */
export const BEND_GRACE = 1

export interface FollowStep {
  midis: number[]
  /** pitches a bend on this step passes through and lands on (tabs/bends.ts): they count as the note too */
  also?: number[]
  /** a strummed chord (3+ different notes): followed by listening to the whole chord, not single notes */
  chord?: boolean
}

export type FollowResult = { kind: 'hit'; step: number; skipped: number } | { kind: 'miss'; heard: number; expected: number[] } | { kind: 'done' }
  /** the note just played, still being bent (its pitch on the way up or back down): nothing new */
  | { kind: 'bend' }

/** Matches played notes to the tab, step by step. Pitch classes match in any octave by default
 *  (phone mics often hear a low string an octave up). */
export function matchNote(steps: FollowStep[], idx: number, midi: number, strictOctave = false, sinceHit = Infinity, attack = true): FollowResult {
  if (idx >= steps.length) return { kind: 'done' }
  const same = (a: number, b: number) => (strictOctave ? a === b : ((a - b) % 12 + 12) % 12 === 0)
  // looking ahead needs the exact note (a low note may read an octave up), a fresh pick, and not the note just
  // played (it's still ringing, and a pedal's delay repeats it): otherwise the cursor ran ahead on its own
  const exact = (m: number) => m === midi || (m < 52 && m + 12 === midi)
  const prev = idx > 0 ? accepted(steps[idx - 1]) : []
  for (let look = 0; look <= (attack ? 2 : 0) && idx + look < steps.length; look++) {
    // look ahead one or two steps in case a note was missed, but only accept that when it is unambiguous
    // the note now may read an octave off (two on the low strings: phone mics, amp tones), not more: that's an overtone
    if (accepted(steps[idx + look]).some(m => (look ? exact(m) : same(m, midi) && Math.abs(m - midi) <= (m < 52 ? 24 : 12)))) {
      if (look > 0 && prev.some(m => same(m, midi))) break
      if (look > 0 && steps.slice(idx, idx + look).some(st => accepted(st).some(m => same(m, midi)))) continue
      return { kind: 'hit', step: idx + look, skipped: look }
    }
  }
  // right after a bent note (sinceHit: seconds since it was hit) the string's pitch is on the move and anything may be
  // read off it for a moment: its own pitches on the way always count as the bend, anything else for a second
  if (idx > 0 && steps[idx - 1].also?.length && (sinceHit < BEND_GRACE || accepted(steps[idx - 1]).some(m => same(m, midi)))) return { kind: 'bend' }
  return { kind: 'miss', heard: midi, expected: steps[idx].midis }
}
