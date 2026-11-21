// Video notes for the theory course: Gemini watches each YouTube video the course links to (Google lets Gemini open
// YouTube links itself; about 8 hours of video a day on the free tier) and writes notes against the lesson it sits in:
// what's covered at which times, which lesson section each part matches, what to watch for, and anything the teacher
// does differently from the lesson. The notes are a FIRST DRAFT: the owner shares the file, Claude checks it against
// the lessons and builds the good parts into them. Nothing here changes a lesson by itself.
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { watchVideo, aiSettings, workedModel, PROVIDERS } from '../assistant/providers'
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

const STORE = 'kg:videoNotes'
const FAILED = 'kg:videoNotesFailed'

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

function read<T>(k: string, d: T): T { try { return (JSON.parse(localStorage.getItem(k) ?? 'null') as T) ?? d } catch { return d } }
function write(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage full */ } }

export const savedNotes = (): Record<string, VideoNote> => read(STORE, {})
export const failedNotes = (): Record<string, string> => read(FAILED, {})
export function clearNotes() { try { localStorage.removeItem(STORE); localStorage.removeItem(FAILED) } catch { /* storage */ } }

export type RunState =
  | { kind: 'idle' }
  | { kind: 'watching'; v: CourseVideo; done: number; total: number }
  | { kind: 'waiting'; secs: number; done: number; total: number }
  | { kind: 'stopped'; why: string; done: number; total: number }
  | { kind: 'finished'; done: number; total: number; failed: number }

const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((res, rej) => {
  const t = setTimeout(res, ms)
  signal?.addEventListener('abort', () => { clearTimeout(t); rej(new Error('Cancelled.')) }, { once: true })
})

/**
 * Watch every course video not done yet, one at a time, saving each note as it comes. Stops on Cancel, on a Gemini key
 * problem, or when Google's free limit is used up (tried once more after a minute: the per-minute limit clears, the
 * daily video limit doesn't). Call again later to carry on where it stopped; `retryFailed` also re-tries the ones that failed.
 */
export async function runNotes(onState: (s: RunState) => void, signal: AbortSignal, retryFailed = false): Promise<void> {
  const all = courseVideos()
  const failed = failedNotes()
  const todo = () => all.filter(v => !savedNotes()[v.key] && (retryFailed || !failed[v.key]))
  const total = all.length
  const done = () => Object.keys(savedNotes()).filter(k => all.some(v => v.key === k)).length
  const model = aiSettings().models.gemini || workedModel || PROVIDERS[0].model
  let limitTries = 0
  for (const v of todo()) {
    if (signal.aborted) break
    onState({ kind: 'watching', v, done: done(), total })
    try {
      const text = await watchVideo(`https://www.youtube.com/watch?v=${v.id}`, notePrompt(v), { maxTokens: 6000, timeoutMs: 300000, signal })
      const note = parseNote(text)
      const all2 = savedNotes()
      all2[v.key] = { key: v.key, id: v.id, title: v.title, lessonId: v.lessonId, where: v.where, note: note ?? null, ...(note ? {} : { raw: text.slice(0, 6000) }), model, at: Date.now() }
      write(STORE, all2)
      const f = failedNotes(); delete f[v.key]; write(FAILED, f)
      limitTries = 0
      // spread the calls out: each video is a lot of tokens for the free per-minute limit
      onState({ kind: 'waiting', secs: 20, done: done(), total })
      await sleep(20000, signal)
    } catch (e) {
      const msg = (e as Error).message
      if (signal.aborted || /Cancelled/.test(msg)) break
      if (/didn't accept the key|needs a free Google Gemini key|no model by that name/.test(msg)) { onState({ kind: 'stopped', why: msg, done: done(), total }); return }
      if (/free limit/.test(msg)) {
        if (limitTries++ < 1) {
          onState({ kind: 'waiting', secs: 70, done: done(), total })
          try { await sleep(70000, signal) } catch { break }
          // try the same video again
          const again = await runOne(v, model, signal).catch(err => err as Error)
          if (!(again instanceof Error)) { limitTries = 0; continue }
        }
        onState({ kind: 'stopped', why: 'Google\'s free limit is used up for now (about 8 hours of video a day). Tap Carry on later, or tomorrow: it starts where it stopped.', done: done(), total })
        return
      }
      const f = failedNotes(); f[v.key] = msg; write(FAILED, f)
    }
  }
  if (signal.aborted) { onState({ kind: 'stopped', why: 'Paused.', done: done(), total }); return }
  onState({ kind: 'finished', done: done(), total, failed: Object.keys(failedNotes()).length })
}

async function runOne(v: CourseVideo, model: string, signal: AbortSignal) {
  const text = await watchVideo(`https://www.youtube.com/watch?v=${v.id}`, notePrompt(v), { maxTokens: 6000, timeoutMs: 300000, signal })
  const note = parseNote(text)
  const all = savedNotes()
  all[v.key] = { key: v.key, id: v.id, title: v.title, lessonId: v.lessonId, where: v.where, note: note ?? null, ...(note ? {} : { raw: text.slice(0, 6000) }), model, at: Date.now() }
  write(STORE, all)
}

/** The notes as one file for Claude to check: share sheet on Android (pick Drive, Gmail…), a download on the web. */
export async function shareNotes(): Promise<string> {
  const day = new Date().toISOString().slice(0, 10)
  const name = `KGuitar-video-notes-${day}.json`
  const json = JSON.stringify({ app: 'KGuitar', kind: 'video-notes', createdAt: Date.now(), videos: courseVideos().length, notes: Object.values(savedNotes()), failed: failedNotes() }, null, 1)
  if (Capacitor.isNativePlatform()) {
    const r = await Filesystem.writeFile({ path: name, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 })
    await Share.share({ title: 'KGuitar video notes', files: [r.uri], dialogTitle: 'Send the video notes to Claude (save to Drive, or attach in the chat)' })
  } else {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url; a.download = name
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }
  return name
}
