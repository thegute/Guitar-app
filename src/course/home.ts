// The key a course lesson is written in (from its first neck picture), as a pitch class; null when it has no picture.
import { homeOf } from '../learn/lessonKey'
import type { CourseLesson, Step } from './types'

export function lessonHome(lesson: CourseLesson, midis: number[]): number | null {
  if (lesson.key !== undefined) return lesson.key
  for (const st of lesson.steps) {
    const bs = 'blocks' in st ? st.blocks : st.kind === 'examples' ? st.examples.map(e => (e.spots ? { spots: e.spots } : null)).filter(Boolean) : []
    for (const b of bs as Extract<Step, { blocks: unknown }>['blocks']) if (b && 'spots' in b) { const h = homeOf(b.spots.marks(midis), midis); if (h !== null) return h }
  }
  return null
}
