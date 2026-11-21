// The pure part of the course video notes (no app or phone code), shared by the app and the Mac tool
// (tools/video-notes): which videos the course uses, the prompt Gemini gets for each, and reading its answer.
import { COURSE } from './index'
import type { CourseLesson } from './types'
import type { Block } from '../learn/lessons'

export interface CourseVideo { key: string; id: string; title: string; lessonId: string; lessonTitle: string; where: string; stepTitle: string }
export interface VideoNote {
  key: string; id: string; title: string; lessonId: string; where: string
  /** Gemini's answer, parsed (or the raw text when it couldn't be parsed) */
  note: unknown
  raw?: string
  model: string
  at: number
}


/** Every video in the course, once per lesson it appears in (a video used twice in one lesson is watched once). */
export function courseVideos(lessons: CourseLesson[] = COURSE): CourseVideo[] {
  const out: CourseVideo[] = []
  const seen = new Set<string>()
  const add = (l: CourseLesson, v: { id: string; title: string }, where: string, stepTitle: string) => {
    const key = `${l.id}|${v.id}`
    if (seen.has(key) || !/^[A-Za-z0-9_-]{11}$/.test(v.id)) return
    seen.add(key)
    out.push({ key, id: v.id, title: v.title, lessonId: l.id, lessonTitle: l.title, where, stepTitle })
  }
  for (const l of lessons) l.steps.forEach((st, i) => {
    if ('blocks' in st) for (const b of st.blocks) if ('video' in b) add(l, b.video, `step ${i + 1}`, st.title)
    if (st.kind === 'deeper' && st.video) add(l, st.video, 'Go deeper', st.title)
  })
  return out
}

const plain = (s: string) => s.replace(/\*\*/g, '')
const blockText = (b: Block) => ('p' in b ? plain(b.p) : 'list' in b ? b.list.map(x => `- ${plain(x)}`).join('\n') : 'tip' in b ? `Tip: ${plain(b.tip)}` : '')

/** The lesson in short: its goal, every Learn section's title, and the full text of the step the video sits in. */
export function lessonBrief(l: CourseLesson, stepTitle: string): string {
  const sections = l.steps.filter(s => s.kind === 'learn').map(s => s.title)
  const own = l.steps.find(s => s.title === stepTitle)
  const ownText = own && 'blocks' in own ? own.blocks.map(blockText).filter(Boolean).join('\n').slice(0, 2500) : ''
  return [
    `Lesson: "${l.title}" (Level ${l.level}, lesson ${l.n}).`,
    `Goal: ${l.goal}`,
    `Learn sections: ${sections.map(s => `"${s}"`).join(', ')}.`,
    ownText ? `The text of the step the video is in ("${stepTitle}"):\n${ownText}` : `The video is in the "${stepTitle}" step.`,
  ].join('\n')
}

export function notePrompt(v: CourseVideo): string {
  const l = COURSE.find(x => x.id === v.lessonId)!
  return `You are helping a guitar teacher fit a YouTube lesson video into a written lesson. Watch the whole video and listen to what the teacher says and plays.

${lessonBrief(l, v.stepTitle)}

Answer with JSON only (no markdown fences), in this shape:
{
  "videoTitle": "the title as shown",
  "lengthSec": total length in seconds,
  "summary": "2-3 plain sentences: what the video teaches and how",
  "parts": [ { "from": "m:ss", "to": "m:ss", "what": "what is taught or played in this part, concretely (chord names, frets, strings)", "section": "the Learn section title above it matches best, or \\"none\\"" } ],
  "watchFor": [ "things worth noticing in the video that the lesson text doesn't say (a hand position, a sound, a trick)" ],
  "differs": [ "anything the teacher does or says differently from the lesson (another fingering, another name for something, another tuning or key), with the time" ],
  "notCovered": [ "lesson sections the video doesn't cover" ],
  "fit": 1 to 5 (5 = the video teaches exactly this lesson's ideas; 1 = barely related),
  "fitWhy": "one sentence"
}
Rules: times must come from the video itself; if you are not sure of a time, give your best estimate and add "(about)" to "what". Never invent content that isn't in the video. Keep "parts" to the useful teaching parts (skip intros, adverts and sign-offs), at most 12. Plain English, short.`
}

export function parseNote(text: string): unknown | null {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  const a = t.indexOf('{'), b = t.lastIndexOf('}')
  if (a < 0 || b <= a) return null
  try { return JSON.parse(t.slice(a, b + 1)) } catch { return null }
}

