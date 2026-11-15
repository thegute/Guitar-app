// Teach-back: explain an idea in your own words and the coach checks which of the key points you covered (built in,
// no AI needed: the points' important words, allowing for other endings), and says what was missed.
const STOP = new Set('the a an and or of to in on for is are it this that what why how do does with be as at by from can when which there their them they then than so if not no but its into about just your you each one two more most some any all also only very like make makes made sound sounds'.split(' '))
const stem = (w: string) => w.replace(/(ings|ing|ed|es|ly|s)$/, '')
const terms = (s: string) => [...new Set(s.toLowerCase().replace(/\*\*/g, '').replace(/[^a-z0-9#♭♯ ]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP.has(w)).map(stem))]

export interface TeachResult { covered: string[]; missed: string[]; score: number; say: string }
export function gradeTeachBack(answer: string, points: string[]): TeachResult {
  const got = new Set(terms(answer))
  const covered: string[] = [], missed: string[] = []
  for (const p of points) {
    const t = terms(p)
    const hit = t.filter(x => got.has(x) || [...got].some(g => g.length > 4 && (g.startsWith(x) || x.startsWith(g)))).length
    ;(hit >= Math.max(1, Math.min(2, t.length), Math.ceil(t.length * 0.3)) ? covered : missed).push(p)
  }
  const score = Math.round((covered.length / Math.max(1, points.length)) * 100)
  const say = !answer.trim() ? 'Write (or say) it in your own words first.'
    : score === 100 ? 'You covered everything. That\'s how a teacher would explain it.'
      : score >= 60 ? `Good: you got ${covered.length} of ${points.length}. Add: ${missed[0].replace(/\.$/, '')}.`
        : `A start: ${covered.length} of ${points.length}. The big one you missed: ${missed[0].replace(/\.$/, '')}. Have another look at the lesson and try again.`
  return { covered, missed, score, say }
}
export function saveTeachBack(id: string, score: number) {
  try { const k = `kg:teachBack:${id}`; const old = Number(localStorage.getItem(k) ?? 0); if (score > old) localStorage.setItem(k, String(score)) } catch { /* storage */ }
}
export const bestTeachBack = (id: string) => { try { return Number(localStorage.getItem(`kg:teachBack:${id}`) ?? 0) } catch { return 0 } }
/** points from a paragraph: its sentences (the idea boxes have no separate list) */
export const pointsOf = (text: string, max = 4) => text.split(/(?<=[.!?])\s+/).filter(s => s.length > 30).slice(0, max)
