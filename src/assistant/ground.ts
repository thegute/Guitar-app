// Grounding the helper in KGuitar's own teaching: the course lessons and the fills workshop's ideas that best match a
// question, as short excerpts for the AI (so it teaches the way the app does) and as a link to open the lesson.
import { COURSE } from '../course'
import { FILL_LEARN } from '../fills/make'

const STOP = new Set('the a an and or of to in on for is are it this that what why how do does i my me you your with be as at by from can when which there their them they then than so if not no but its into about just'.split(' '))
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9#♭♯ ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w))
const stem = (w: string) => w.replace(/(ings|ing|ed|es|s)$/, '')

function lessonText(l: (typeof COURSE)[number]): string {
  const blocks = l.steps.flatMap(s => ('blocks' in s ? s.blocks.flatMap(b => ('p' in b ? [b.p] : 'tip' in b ? [b.tip] : 'list' in b ? b.list : [])) : []))
  return `${l.title}. ${l.goal} ${blocks.join(' ')}`.replace(/\*\*/g, '')
}
let index: { id: string; title: string; terms: Set<string>; title2: Set<string>; text: string }[] | null = null
function idx() {
  if (index) return index
  index = COURSE.map(l => { const text = lessonText(l); return { id: l.id, title: l.title, terms: new Set(words(text + ' ' + l.topics.join(' ')).map(stem)), title2: new Set(words(l.title + ' ' + l.topics.join(' ')).map(stem)), text } })
  return index
}

export interface Ground { kind: 'lesson' | 'fill'; id: string; title: string; excerpt: string; score: number }
/** The course lessons and fills ideas that match a question best (best first). */
export function groundFor(q: string, n = 2): Ground[] {
  const qs = [...new Set(words(q).map(stem))]
  if (!qs.length) return []
  const out: Ground[] = []
  for (const l of idx()) {
    const hit = qs.filter(t => l.terms.has(t)).length, inTitle = qs.filter(t => l.title2.has(t)).length
    const score = hit + inTitle * 2
    if (score >= 3 || inTitle >= 1 && hit >= 2) {
      // the sentences that mention the most question words
      const sents = l.text.split(/(?<=[.!?])\s+/)
      const best = sents.map(s => ({ s, k: qs.filter(t => s.toLowerCase().includes(t)).length })).sort((a, b) => b.k - a.k).slice(0, 3).map(x => x.s)
      out.push({ kind: 'lesson', id: l.id, title: l.title, excerpt: best.join(' ').slice(0, 600), score })
    }
  }
  for (const [id, f] of Object.entries(FILL_LEARN)) {
    const t = new Set(words(f.idea + ' ' + f.topics.join(' ')).map(stem)), tt = new Set(words(f.topics.join(' ')).map(stem))
    const score = qs.filter(x => t.has(x)).length + qs.filter(x => tt.has(x)).length * 2
    if (score >= 3) out.push({ kind: 'fill', id, title: f.topics[0] ?? id, excerpt: f.idea.slice(0, 600), score })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, n)
}
