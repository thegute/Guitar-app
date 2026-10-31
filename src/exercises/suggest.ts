// "Suggested for you" on the Exercises page: three picks instead of a wall of 800. A warm-up at your level, whatever
// your Zero to Hero plan or style path is working on now, and one a step further. Changes each day.
import type { Exercise, Level } from './catalog'
import { profile } from '../learn/profile'
import { currentFocus, pathSteps, z2h } from '../learn/zeroHero'

export interface Suggestion { ex: Exercise; why: string }

function dayHash(s: string) {
  let h = 2166136261
  const d = new Date().toDateString() + s
  for (let i = 0; i < d.length; i++) { h ^= d.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
const pickOf = <T,>(list: T[], salt: string) => (list.length ? list[dayHash(salt) % list.length] : undefined)

export function suggestExercises(all: Exercise[], guitar: boolean): Suggestion[] {
  const lvl: Level = (profile()?.level ?? 1) as Level
  const out: Suggestion[] = []
  const used = new Set<string>()
  const add = (ex: Exercise | undefined, why: string) => { if (ex && !used.has(ex.code)) { used.add(ex.code); out.push({ ex, why }) } }
  const near = (e: Exercise, l: number) => e.level === l || e.level === l - 1
  // 1. warm up
  add(pickOf(all.filter(e => e.type === 'warmup' && e.level <= Math.max(1, lvl)), 'warm'), 'Warm up first')
  // 2. what your plan is on
  if (guitar) {
    const v = z2h()
    if (v.placed) {
      for (const f of [...pathSteps(v), ...currentFocus(v)]) {
        const t = f.target && 'exercise' in f.target ? f.target.exercise : null
        if (!t) continue
        const m = /^type:(.+)$/.exec(t)
        const ex = m ? pickOf(all.filter(e => (m[1].startsWith('lick:') ? e.code.startsWith(m[1].slice(5)) || e.type === m[1] : e.type === m[1]) && near(e, lvl)), f.label) ?? all.find(e => e.type === m[1]) : all.find(e => e.code === t)
        if (ex) { add(ex, `Your plan: ${f.label}`); break }
      }
    }
  }
  // 3. something at your level, then one a step up
  const goals = profile()?.goals ?? []
  const wantType = goals.includes('fingerpick') ? 'fingerstyle' : goals.includes('lead') ? 'scales' : goals.includes('strum') || goals.includes('rhythm') ? 'strumming' : null
  if (out.length < 3) add(pickOf(all.filter(e => (wantType ? e.type === wantType : e.type !== 'warmup') && near(e, lvl)), 'level'), wantType ? 'For what you want to get better at' : 'At your level')
  if (out.length < 3) add(pickOf(all.filter(e => e.type !== 'warmup' && e.level === Math.min(4, lvl + 1)), 'next'), 'A step further')
  if (out.length < 3) add(pickOf(all.filter(e => !!e.start), 'start'), 'A good one to know')
  return out.slice(0, 3)
}
