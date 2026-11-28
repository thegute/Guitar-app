// The theory course (notes/THEORY-COURSE.md). Levels are added as they're written.
import { LEVEL1 } from './level1'
import { LEVEL2 } from './level2'
import { LEVEL3 } from './level3'
import { LEVEL4 } from './level4'
import { LEVEL5_A } from './level5'
import { LEVEL5_B } from './level5b'
import { LEVEL6_A } from './level6'
import { LEVEL6_B } from './level6b'
import { LEVEL7_A } from './level7'
import { LEVEL7_B } from './level7b'
import { LEVEL8_A } from './level8'
import { LEVEL8_B } from './level8b'
import { TECHNIQUE } from './technique'
import type { CourseLesson } from './types'

export const COURSE: CourseLesson[] = [...LEVEL1, ...LEVEL2, ...LEVEL3, ...LEVEL4, ...LEVEL5_A, ...LEVEL5_B, ...LEVEL6_A, ...LEVEL6_B, ...LEVEL7_A, ...LEVEL7_B, ...LEVEL8_A, ...LEVEL8_B]
/** the pathway courses (technique; bluegrass and acoustic next), each built around its teachers' videos */
export const PATHS: Record<NonNullable<CourseLesson['course']>, CourseLesson[]> = { technique: TECHNIQUE, bluegrass: [], acoustic: [] }
export const PATH_NAMES: Record<NonNullable<CourseLesson['course']>, string> = { technique: 'The technique course', bluegrass: 'Bluegrass flatpicking', acoustic: 'Acoustic singer-songwriter' }
const ALL = (): CourseLesson[] => [...COURSE, ...PATHS.technique, ...PATHS.bluegrass, ...PATHS.acoustic]
export const courseLesson = (id: string) => ALL().find(l => l.id === id)
/** the course a lesson belongs to (for previous / next and the warm-up from the lesson before) */
export const lessonsOf = (l: CourseLesson): CourseLesson[] => (l.course ? PATHS[l.course] : COURSE)
/** "Level 3 · Lesson 2" or "Technique · Unit 1 · Lesson 2" */
const PATH_SHORT: Record<NonNullable<CourseLesson['course']>, string> = { technique: 'Technique', bluegrass: 'Bluegrass', acoustic: 'Acoustic' }
export const lessonPlace = (l: CourseLesson) => (l.course ? `${PATH_SHORT[l.course]} · Unit ${l.level} · Lesson ${l.n}` : `Level ${l.level} · Lesson ${l.n}`)
