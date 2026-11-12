// The theory course (notes/THEORY-COURSE.md). Levels are added as they're written.
import { LEVEL1 } from './level1'
import { LEVEL2 } from './level2'
import type { CourseLesson } from './types'

export const COURSE: CourseLesson[] = [...LEVEL1, ...LEVEL2]
export const courseLesson = (id: string) => COURSE.find(l => l.id === id)
