// My riffs: riffs you scanned (Riff Scanner) or saved, kept as licks so they can go in the lick chainer next to the
// Must-know licks (moved into the chain's key and along the neck like the others). Stored on the phone (kg:myLicks).
import type { LickDef } from './library'
import { LICKS } from './library'
import type { SongTrack } from '../tabs/model'
import { pcName } from '../theory/notes'

const KEY = 'kg:myLicks'
const listeners = new Set<() => void>()

export function myLicks(): LickDef[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? (v as LickDef[]) : [] } catch { return [] }
}
function save(list: LickDef[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* storage full */ }
  listeners.forEach(f => f())
}
export function onMyLicks(f: () => void) { listeners.add(f); return () => { listeners.delete(f) } }
export function deleteMyLick(id: string) { save(myLicks().filter(l => l.id !== id)) }
/** Every lick: the library's and yours. */
export const findLick = (id: string): LickDef | undefined => LICKS.find(l => l.id === id) ?? myLicks().find(l => l.id === id)

// note lengths the lick notation can write, longest first
const TOKENS: [number, string][] = [[4, 'w'], [3, 'h.'], [2, 'h'], [1.5, 'q.'], [1, 'q'], [0.75, 'e.'], [0.5, 'e'], [1 / 3, 't'], [0.25, 's'], [1 / 6, 'x']]
/** a length as a list of writable lengths (the first one carries the note, the rest are rests) */
function split(d: number): [number, string][] {
  const out: [number, string][] = []
  let left = d
  while (left > 1e-3) {
    const t = TOKENS.find(([v]) => v <= left + 1e-3)
    if (!t) break
    out.push(t); left -= t[0]
  }
  return out
}
const TECH: Record<string, string> = { h: 'h', p: 'p', '/': '/', '\\': '\\', b: 'b', '~': '~', x: 'x', r: 'r' }

/**
 * A 6-string track (standard tuning, or anything: the frets are kept as they are) → lick notation, bars of 4/4,
 * at most `maxBars` bars. Returns null when there's nothing to keep.
 */
export function trackToLickTab(t: SongTrack, maxBars = 8): string | null {
  if (t.tuning.length !== 6) return null
  const bars: string[] = []
  for (const bar of t.bars.slice(0, maxBars)) {
    const toks: string[] = []
    let cur = ''
    let used = 0
    const push = (tok: string, what: string) => { if (tok !== cur) { toks.push(tok); cur = tok } toks.push(what) }
    for (const st of bar.steps) {
      if (used >= 4 - 1e-3) break
      const parts = split(Math.min(st.dur, 4 - used))
      if (!parts.length) continue
      const notes = st.notes.map(n => `${6 - n.string}:${n.tech === 'x' ? 'x' : `${n.fret}${n.tech && n.tech !== 'x' && TECH[n.tech] ? TECH[n.tech] : ''}`}`)
      push(parts[0][1], notes.length ? notes.join('+') : 'r')
      for (const p of parts.slice(1)) push(p[1], 'r')
      used += parts.reduce((a, p) => a + p[0], 0)
    }
    // fill the bar
    for (const p of split(4 - used)) push(p[1], 'r')
    bars.push(toks.join(' '))
  }
  // drop empty bars at the end (only rests)
  while (bars.length && !/\d|:x/.test(bars[bars.length - 1])) bars.pop()
  return bars.some(b => /\d/.test(b)) ? bars.join(' | ') : null
}

/** Keep a riff as one of My riffs (key from its notes). Returns its id, or null if it couldn't be written as a lick. */
export function saveMyLick(name: string, t: SongTrack, bpm: number, key: { root: number; minor: boolean }): string | null {
  const tab = trackToLickTab(t)
  if (!tab) return null
  const id = `mine:${Date.now().toString(36)}`
  const lick: LickDef = { id, style: 'mine', name, level: 2, kind: 'riff', ref: pcName(key.root, false), minor: key.minor, meter: 4, bpm: Math.round(bpm), tab }
  save([lick, ...myLicks()].slice(0, 60))
  return id
}
