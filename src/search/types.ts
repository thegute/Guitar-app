// What a search result is and where tapping it takes you.
import type { Go } from '../learn/path'
import type { ToolPage } from '../nav'
import type { ModeId, Style } from '../theory/progressions'

/** Things on the Play screen a result can point at (they flash when you arrive). */
export type PlayFocus =
  | 'speed' | 'sound' | 'band' | 'click' | 'guide' | 'trainer' | 'record' | 'numbers' | 'count' | 'hand' | 'size' | 'split'
  | 'octave' | 'sensitivity' | 'setup' | 'restart' | 'listen' | 'mode' | 'loop' | 'hear' | 'opts' | 'video' | 'full' | 'view' | 'input' | 'check' | 'stand' | 'tidy'
export interface PlayAction {
  mode?: 'wait' | 'time'
  /** open the Options sheet, the video, the song check, start picking loop bars, or show Scales & chords */
  open?: 'options' | 'video' | 'check' | 'loop' | 'solo'
  focus?: PlayFocus
  /** loop these bars (0-based, inclusive), or null to stop looping */
  loop?: { from: number; to: number } | null
  /** playback speed, 1 = the song's tempo */
  speed?: number
}
export type JamPage = 'jam' | 'solo' | 'tab' | 'find' | 'beats'
export interface JamTarget { key?: string; mode?: ModeId; style?: Style; bpm?: number; page?: JamPage }

export type Target =
  | { go: Go }
  | { tool: ToolPage }
  | { play: PlayAction }
  | { chord: { root: string; suffix: string } }
  | { scale: { root?: string; scale: string } }
  | { tuning: string }
  | { metronome: { bpm?: number; sig?: string } }
  | { jam: JamTarget }
  | { example: string }
  | { guide: string }
  /** one exercise by code ("SC-12"), or a whole type of them ("type:melodic") */
  | { exercise: string }

export type Kind =
  | 'feature' | 'setting' | 'chord' | 'scale' | 'tuning' | 'metronome' | 'jam' | 'mysong' | 'songbook' | 'practice'
  | 'lesson' | 'technique' | 'quiz' | 'exercise' | 'lick'

export const KIND_LABEL: Record<Kind, string> = {
  feature: 'How to', setting: 'Settings', chord: 'Chord', scale: 'Scale', tuning: 'Tuning', metronome: 'Metronome', jam: 'Jam',
  mysong: 'Your song', songbook: 'Songbook', practice: 'Practice tab', lesson: 'Lesson', technique: 'Technique', quiz: 'Quiz',
  exercise: 'Exercise', lick: 'Lick',
}

/** Something search can find. `keys` are the other words people use for it; `guide` links it to a guide item. */
export interface Entry {
  id: string
  kind: Kind
  title: string
  where: string
  text: string
  keys?: string
  /** longer text that is searched but not shown (a lesson's paragraphs, a technique's steps) */
  body?: string
  target: Target
  guide?: string | string[]
  /** a small nudge up or down when several entries match equally */
  boost?: number
}

export interface Result extends Entry { score: number }
