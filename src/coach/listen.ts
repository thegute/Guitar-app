// The coach's second sense: Gemini listens to a few seconds of the trouble bar, with the tab's notes and KGuitar's
// own numbers beside it, for what a pitch tracker can't hear: buzz, a muted neighbour string, a stiff or rushed feel,
// a note that dies early. It answers in the same shape as the built-in coach (advice.ts), which stands in when there's
// no key, no network or no answer in time.
import { listenAudio } from '../assistant/providers'
import { wavBase64 } from '../scan/listen'
import { playable, type FlatStep } from '../tabs/model'
import { FINGER, stringName, forVoice, type Advice } from './advice'
import type { Trouble } from './trouble'
import type { HandGroup } from '../play/handShape'
import { groupAt } from '../play/handShape'

export interface CoachContext {
  title: string
  inst: string
  tuning: number[]
  mode: 'wait' | 'time'
  speed: number
  flat: FlatStep[]
  groups: HandGroup[]
  /** what to listen for in the style being practised (Phase C lenses) */
  lens?: string
  /** how strict: gentle / balanced / strict */
  strict?: string
}

/** the trouble bar (and the one before it when the loop takes it in) as text the AI can read */
export function barText(t: Trouble, c: CoachContext): string {
  const lines: string[] = []
  c.flat.forEach((f, i) => {
    if (f.bar < t.loop.from || f.bar > t.loop.to) return
    const ns = playable(f.step)
    if (!ns.length) return
    const g = c.groups[groupAt(c.groups, i)]
    const what = ns.map(n => {
      const fin = g?.notes.find(x => x.string === n.string && x.fret === n.fret)?.finger ?? 0
      return `${stringName(c.tuning, n.string)} string fret ${n.fret}${fin ? ` (${FINGER[fin]})` : ''}${n.tech ? ` [${n.tech}]` : ''}`
    }).join(' + ')
    lines.push(`bar ${f.bar + 1}: ${what}${f.step.chord ? `  chord ${f.step.chord}` : ''}, ${f.step.dur} beat${f.step.dur === 1 ? '' : 's'}`)
  })
  return lines.join('\n')
}

export function coachPrompt(t: Trouble, c: CoachContext, rules: Advice): string {
  const f = t.facts
  const nums = c.mode === 'time'
    ? `${f.right} of ${f.notes} notes on time, ${f.early} early, ${f.late} late, ${f.missed} missed${f.meanErr !== null ? `, average ${Math.abs(f.meanErr)} ms ${f.meanErr < 0 ? 'early' : 'late'}` : ''}`
    : `${f.right} of ${f.notes} notes right first time, ${f.missed} missed, ${f.wrong} wrong`
  return [
    `You are a guitar teacher listening to a student's practice. Voice: a friendly, plain-spoken coach, close to neutral, never gushing${c.strict ? `; strictness: ${c.strict}` : ''}.`,
    `The clip is the student playing ${t.loop.from === t.loop.to ? `bar ${t.bar + 1}` : `bars ${t.loop.from + 1}–${t.loop.to + 1}`} of "${c.title}" on ${c.inst}, ${c.mode === 'time' ? `in time at ${Math.round(c.speed * 100)}% speed` : 'at their own pace (the app waits for each note)'}. It may start or end mid-note, and may hold more than one try.`,
    `What the tab asks for there:\n${barText(t, c)}`,
    `What the app measured in bar ${t.bar + 1} (trust these numbers; your ears can't beat them on pitch and timing): ${nums}.`,
    `The app's own reading of the problem: ${rules.fix}`,
    c.lens ? `The student is working on this style; listen with it in mind: ${c.lens}` : '',
    `Listen for what the numbers can't show: fret buzz, a neighbouring string muted or ringing by accident, notes that die early, a stiff or rushed feel, uneven loudness, sloppy bends or slides. If you can't hear anything worth saying, say nothing about the sound.`,
    `Reply with ONLY a JSON object, no other text:`,
    `{"good": one short sentence on something that went well (true, not flattery), "fix": ONE concrete physical fix naming the bar, string, fret and finger, at most 30 words, "drill": ONE short drill for it, at most 20 words, "heard": what you heard in the sound that the numbers can't show, at most 20 words, or "" if nothing, "spoken": the good thing and the fix as one or two natural spoken sentences, no symbols, numbers as words where natural, at most 45 words}`,
    `Give exactly one fix. Do not list several problems. Keep the app's fix unless what you hear clearly points to a better one.`,
  ].filter(Boolean).join('\n\n')
}

/** Pull the coach's JSON out of the AI's reply. Null when it isn't usable. */
export function parseCoach(text: string, rules: Advice): Advice | null {
  const a = text.indexOf('{'), b = text.lastIndexOf('}')
  if (a < 0 || b <= a) return null
  let o: Record<string, unknown>
  try { o = JSON.parse(text.slice(a, b + 1)) } catch { return null }
  const str = (k: string, max: number) => (typeof o[k] === 'string' ? (o[k] as string).trim().slice(0, max) : '')
  const fix = str('fix', 260), spoken = str('spoken', 360)
  if (!fix || !spoken) return null
  return { ...rules, good: str('good', 160) || rules.good, fix, drill: str('drill', 200) || rules.drill, heard: str('heard', 180) || undefined, spoken: forVoice(spoken), from: 'ai' }
}

/** Ask the AI coach about a trouble spot, with the clip of it. Throws when it can't (no key, offline, a bad answer):
 *  the caller keeps the built-in coach's advice. */
export async function aiAdvice(t: Trouble, c: CoachContext, rules: Advice, clip: { x: Float32Array; sr: number }, signal?: AbortSignal): Promise<Advice> {
  const text = await listenAudio(wavBase64(clip.x, clip.sr, 9), 'audio/wav', coachPrompt(t, c, rules), { maxTokens: 700, timeoutMs: 15000, signal })
  const a = parseCoach(text, rules)
  if (!a) throw new Error('The coach sent back something unreadable.')
  return a
}
