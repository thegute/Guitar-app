// The theory course (notes/THEORY-COURSE.md). Level 1 has the sample lesson so far; the rest follows once the owner OKs it.
import { LEVEL1 } from './level1'
import type { CourseLesson } from './types'

export const COURSE: CourseLesson[] = [...LEVEL1]
export const courseLesson = (id: string) => COURSE.find(l => l.id === id)
