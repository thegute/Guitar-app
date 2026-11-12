// The theory course (notes/THEORY-COURSE.md): levels of deep lessons. A lesson is a unit you work through over a few
// days, step by step: why it matters → the idea from the ground up → worked examples → hear it (ear training for exactly
// this idea) → common mistakes → a practice week → use it in music → check (recall, apply, hear, play, explain it back)
// → go deeper (video, the owner's books). Finished lessons come back for short reviews after 1, 3, 7 and 30 days.
import type { Block } from '../learn/lessons'
import type { LessonEx, LessonVideo } from '../learn/lessonExtras'

/** Something to do: an exercise that opens in Play (the mic follows), a quiz, or a tool / song. */
export type Task =
  | { label: string; ex: LessonEx; minutes?: number; goal?: string }
  | { label: string; quiz: string; minutes?: number; goal?: string; how?: 'tap' | 'play' }
  | { label: string; tool: 'ear' | 'caged' | 'circle' | 'jam' | 'rhythm' | 'changes'; minutes?: number; goal?: string }

export interface WorkedExample {
  /** the question, e.g. "Find C on the D string" */
  q: string
  /** the reasoning, one move per line (shown after "Show me how") */
  steps: string[]
  answer: string
  /** the answer on the neck */
  spots?: Extract<Block, { spots: unknown }>['spots']
}

export type Step =
  | { kind: 'why'; title: string; blocks: Block[] }
  | { kind: 'learn'; title: string; blocks: Block[] }
  | { kind: 'examples'; title: string; intro?: string; examples: WorkedExample[] }
  | { kind: 'hear'; title: string; blocks: Block[]; drills: Task[] }
  | { kind: 'mistakes'; title: string; items: { wrong: string; right: string }[] }
  | { kind: 'practice'; title: string; intro: string; days: { day: string; focus: string; tasks: Task[] }[] }
  | { kind: 'use'; title: string; blocks: Block[]; tasks: Task[] }
  | { kind: 'check'; title: string; intro: string; tasks: (Task & { skill: 'Recall' | 'Apply' | 'Hear' | 'Play' })[]; explain: { prompt: string; points: string[] } }
  | { kind: 'deeper'; title: string; video?: LessonVideo; books: { book: string; where: string; why: string }[]; blocks: Block[] }

export interface CourseLesson {
  id: string
  level: number
  /** number within the level */
  n: number
  title: string
  /** what you'll be able to do at the end (one sentence) */
  goal: string
  /** reading/listening time, and the practice week on top */
  minutes: number
  /** earlier lessons this one builds on */
  builds?: string[]
  topics: string[]
  steps: Step[]
}

export const STEP_LABEL: Record<Step['kind'], string> = {
  why: 'Why it matters', learn: 'Learn', examples: 'Worked examples', hear: 'Hear it', mistakes: 'Common mistakes',
  practice: 'Practice week', use: 'Use it', check: 'Check', deeper: 'Go deeper',
}
