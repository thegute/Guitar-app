// The theory course and the Circle of Fifths masterclass point at each other, and the key you're in goes with you:
// a lesson in A opens its Circle chapter in A, and a chapter in A opens the lesson moved to A (its Key menu).
import { openCircleMastery, learnGo } from '../nav'
import { CIRCLE_CHAPTERS } from './circleCourse'

/** course lesson → the Circle chapter that practises it */
export const LESSON_CIRCLE: Record<string, string> = {
  'c2-circle': 'ch1-gravity', 'c3-pull': 'ch1-gravity', 'c7-cadences': 'ch1-gravity',
  'c5-key7': 'ch2-guidetones', 'c5-voicelead': 'ch2-guidetones',
  'c6-arps': 'ch4-arpeggios', 'c6-arp7': 'ch4-arpeggios', 'c6-targets': 'ch4-arpeggios',
  'c7-minor': 'ch5-outside', 'c7-secdom': 'ch5-outside', 'c7-borrowed': 'ch5-outside', 'c7-tritone': 'ch5-outside', 'c8-overchord': 'ch5-outside',
  'c7-keys': 'ch6-pro',
}
/** the Circle's key names (its key chips) by pitch class */
const CIRCLE_KEY = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const pcOf = (name: string) => { let v = LETTER_PC[name[0]] ?? 0; for (const ch of name.slice(1)) v += ch === '#' || ch === '♯' ? 1 : ch === 'b' || ch === '♭' ? -1 : 0; return ((v % 12) + 12) % 12 }
const put = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage off */ } }

export const circleChapterFor = (lessonId: string) => CIRCLE_CHAPTERS.find(c => c.id === LESSON_CIRCLE[lessonId])

/** open the lesson's Circle chapter in the lesson's current key (a pitch class) */
export function openCircleForLesson(lessonId: string, keyPc: number) {
  const i = CIRCLE_CHAPTERS.findIndex(c => c.id === LESSON_CIRCLE[lessonId])
  if (i < 0) return
  put('kg:circleChapterIdx', i)
  put('kg:circleTonic', CIRCLE_KEY[((keyPc % 12) + 12) % 12])
  openCircleMastery('masterclass')
}

/** open a course lesson moved to the Circle's key: home = the key the lesson is written in (pitch class, C if unknown) */
export function openLessonInKey(lessonId: string, tonic: string, home: number | null) {
  const d = ((pcOf(tonic) - (home ?? 0)) % 12 + 12) % 12
  const shift = d > 6 ? d - 12 : d
  try { if (shift) localStorage.setItem(`kg:lessonKey:${lessonId}`, String(shift)); else localStorage.removeItem(`kg:lessonKey:${lessonId}`) } catch { /* storage off */ }
  learnGo({ lesson: lessonId })
}
