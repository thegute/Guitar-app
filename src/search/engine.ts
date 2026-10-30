// Ranking: every entry is turned into weighted terms (title counts most, then the words people use for it, then
// where it is and its description). A question's terms match exactly, through a group of words that mean the
// same thing, with a typo ("metronme"), or as the start of a word you are still typing. Rare words count more than
// common ones, and entries that answer the whole question beat ones that match a single word. Pure: no DOM.
import { conceptsOf, editDistance, stem, terms, words } from './text'
import type { InstrumentDef } from '../instrument'
import { intents } from './intents'
import type { Entry, Result } from './types'

const FIELDS: [keyof Entry, number][] = [['title', 1], ['keys', 0.8], ['text', 0.45], ['where', 0.3], ['body', 0.3]]
const CONCEPT = 0.7

interface Item { e: Entry; w: Map<string, number>; title: string; keys: string }

export class SearchIndex {
  private items: Item[]
  private df = new Map<string, number>()
  private vocab: string[]
  private vocabSet: Set<string>

  constructor(entries: Entry[]) {
    this.items = entries.map(e => {
      const w = new Map<string, number>()
      const put = (t: string, v: number) => { if (v > (w.get(t) ?? 0)) w.set(t, v) }
      for (const [field, fw] of FIELDS) {
        const text = e[field]
        if (typeof text !== 'string' || !text) continue
        for (const t of terms(text)) {
          put(t, fw)
          for (const c of conceptsOf(t)) put(c, fw * CONCEPT)
        }
      }
      return { e, w, title: ' ' + terms(e.title).join(' ') + ' ', keys: ' ' + terms(e.keys ?? '').join(' ') + ' ' }
    })
    for (const it of this.items) for (const t of it.w.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1)
    this.vocab = [...this.df.keys()].filter(t => !t.startsWith('~'))
    this.vocabSet = new Set(this.vocab)
  }

  get size() { return this.items.length }

  private idf(t: string) { return Math.log(1 + this.items.length / (1 + (this.df.get(t) ?? 0))) }

  /** What a query word can match, and how much each counts. */
  private candidates(t: string, partial: string | null): Map<string, number> {
    const c = new Map<string, number>()
    const put = (k: string, v: number) => { if (v > (c.get(k) ?? 0)) c.set(k, v) }
    put(t, 1)
    for (const k of conceptsOf(t)) put(k, CONCEPT)
    if (!this.vocabSet.has(t) && !t.startsWith('_') && t.length >= 4 && !/\d/.test(t)) {
      const max = t.length >= 7 ? 2 : 1
      for (const v of this.vocab) {
        if (v[0] !== t[0] || Math.abs(v.length - t.length) > max || v.startsWith('_')) continue
        const d = editDistance(t, v, max)
        if (d <= max) { put(v, 0.75 - 0.1 * (d - 1)); for (const k of conceptsOf(v)) put(k, 0.55) }
      }
    }
    if (partial && partial.length >= 2) {
      for (const v of this.vocab) {
        if (v !== t && !v.startsWith('_') && (v.startsWith(partial) || v.startsWith(t))) put(v, 0.7)
      }
    }
    return c
  }

  /** Entries ranked for a question, best first. */
  search(query: string, limit = 12): Result[] {
    const qt = terms(query)
    if (!qt.length) return []
    const raw = words(query)
    const typing = !/\s$/.test(query)
    const lastRaw = raw[raw.length - 1] ?? ''
    const cands = qt.map((t, k) => this.candidates(t, typing && k === qt.length - 1 && stem(lastRaw) === t ? lastRaw : null))
    // a word that matches nothing anywhere only counts half against the coverage
    const known = cands.map(c => [...c.keys()].some(k => this.df.has(k)))
    // the most a word can add: its own weight when the app uses that word, otherwise its best stand-in (typo, half-typed word)
    const weights = qt.map((t, k) => (!known[k] ? 0 : this.df.has(t) ? this.idf(t) : Math.max(...[...cands[k].keys()].filter(x => this.df.has(x)).map(x => this.idf(x) * cands[k].get(x)!))))
    const best = weights.reduce((a, b) => a + b, 0)
    const denom = known.reduce((a, k) => a + (k ? 1 : 0.5), 0)
    if (!best) return []
    const nq = ' ' + qt.join(' ') + ' '
    const many = qt.length >= 2
    const out: Result[] = []
    for (const it of this.items) {
      let sum = 0, matched = 0
      cands.forEach((c, k) => {
        if (!known[k]) return
        let v = 0
        for (const [term, factor] of c) {
          const ew = it.w.get(term)
          if (ew) v = Math.max(v, factor * ew * this.idf(term))
        }
        if (v > 0) { sum += Math.min(v, weights[k]); matched++ }
      })
      if (!matched) continue
      const coverage = matched / denom
      let score = (sum / best) * (0.35 + 0.65 * coverage * coverage) * 100
      // the whole question is (in) the title, or the title is in the question; or it is one of the ways people ask for it
      const title = it.title
      if (title === nq || many && (title.includes(nq) || (title.trim().length > 3 && nq.includes(title)))) score += 18
      else if (many && it.keys.includes(nq)) score += 12
      score *= 1 + (it.e.boost ?? 0)
      out.push({ ...it.e, score })
    }
    out.sort((a, b) => b.score - a.score)
    const top = out[0]?.score ?? 0
    const perKind = new Map<string, number>()
    return out.filter(r => {
      if (r.score < Math.max(9, top * 0.4)) return false
      const n = (perKind.get(r.kind) ?? 0) + 1
      perKind.set(r.kind, n)
      return n <= 6
    }).slice(0, limit)
  }
}

/** Everything for one question: values first (a chord, a scale, a tuning …), then features, songs and lessons. */
export function searchAll(index: SearchIndex, query: string, inst: InstrumentDef, limit = 12): Result[] {
  const smart = intents(query, inst)
  // when the question names a value (a chord, a scale …) that answer leads; other matches step back a little
  const lead = smart.reduce((m, r) => Math.max(m, r.score), 0)
  const found = index.search(query, limit + 4).map(r => (lead >= 80 ? { ...r, score: r.score * 0.8 } : r))
  const all = [...smart, ...found]
  all.sort((a, b) => b.score - a.score)
  const seen = new Set<string>()
  return all.filter(r => {
    const key = r.kind + ':' + r.title.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, limit)
}
