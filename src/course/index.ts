// The theory course (notes/THEORY-COURSE.md). Levels are added as they're written.
import { LEVEL1 } from './level1'
import { LEVEL2 } from './level2'
import { LEVEL3 } from './level3'
import { LEVEL4 } from './level4'
import { LEVEL5_A } from './level5'
import { LEVEL5_B } from './level5b'
import { LEVEL6_A } from './level6'
import { LEVEL6_B } from './level6b'
import type { CourseLesson } from './types'

export const COURSE: CourseLesson[] = [...LEVEL1, ...LEVEL2, ...LEVEL3, ...LEVEL4, ...LEVEL5_A, ...LEVEL5_B, ...LEVEL6_A, ...LEVEL6_B]
export const courseLesson = (id: string) => COURSE.find(l => l.id === id)
