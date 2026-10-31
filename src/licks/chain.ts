// The lick chainer: line up licks from the library like train cars and play them as one phrase. Every lick is moved to
// one key, and each one is placed on the neck near where the one before it ended, so your hand doesn't jump around.
// A capo style's licks keep their capo when they all share one; otherwise the capo is "baked in" (same pitches,
// fretted higher) so the chain can mix styles.
import type { Song } from '../tabs/model'
import { LICKS, type LickDef } from './library'
import { lickStyle } from './styles'
import { fretSpan, lickSong, parseLick, type LickEvent } from './notation'
import { isStandard, keyLabel, placeFor, retune } from './generator'

export interface ChainLink { lick: string; uid: string }
export interface Chain {
  key: string
  /** beats per minute; 0 = take it from the first lick */
  tempo: number
  /** rest between licks, in bars */
  gap: 0 | 0.5 | 1
  links: ChainLink[]
}
export const EMPTY_CHAIN: Chain = { key: 'A', tempo: 0, gap: 0, links: [] }
const KEY = 'kg:lickChain'
const listeners = new Set<() => void>()

export function loadChain(): Chain {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Chain | null
    return c && Array.isArray(c.links) ? { ...EMPTY_CHAIN, ...c, links: c.links.filter(l => LICKS.some(x => x.id === l.lick)) } : { ...EMPTY_CHAIN }
  } catch { return { ...EMPTY_CHAIN } }
}
export function saveChain(c: Chain) {
  try { localStorage.setItem(KEY, JSON.stringify(c)) } catch { /* storage unavailable */ }
  listeners.forEach(f => f())
}
export function onChain(f: () => void) { listeners.add(f); return () => { listeners.delete(f) } }
export const newUid = () => Math.random().toString(36).slice(2, 9)
/** Add a lick to the end of the saved chain (from a lick's own page). The first lick sets the key. */
export function addToChain(lickId: string, key?: string) {
  const c = loadChain()
  saveChain({ ...c, key: c.links.length ? c.key : key ?? c.key, links: [...c.links, { lick: lickId, uid: newUid() }] })
}

/** Licks that can go in a chain: 4/4 only, so the bars line up. */
export const chainable = (l: LickDef) => (l.meter ?? 4) === 4
export const lickBars = (l: LickDef) => Math.max(1, Math.round(parseLick(l.tab).bars.reduce((a, b) => a + b, 0) / 4))

const STANDARD = [40, 45, 50, 55, 59, 64]
const midiOf = (n: { string: number; fret: number }, capo: number) => STANDARD[n.string] + capo + n.fret
const notesOf = (ev: LickEvent[]) => ev.flatMap(e => e.notes.filter(n => n.tech !== 'x'))

export interface Placed { link: ChainLink; lick: LickDef; events: LickEvent[]; capo: number; fits: boolean }

/**
 * Place every lick of the chain in the key, each near the last. Licks that can't be played in this key come back
 * with fits=false (and no notes); the card says so and the chain skips them.
 */
export function placeChain(c: Chain): Placed[] {
  const out: Placed[] = []
  let prevCenter: number | null = null
  let prevEnd: number | null = null
  for (const link of c.links) {
    const lick = LICKS.find(l => l.id === link.lick)
    if (!lick) continue
    const p = placeFor(lick, c.key)
    if (!p) { out.push({ link, lick, events: [], capo: 0, fits: false }); continue }
    const raw = parseLick(lick.tab).events
    const span = fretSpan(raw)
    let shift = p.shift
    if (lickStyle(lick.style).move === 'shift' && (prevCenter !== null || prevEnd !== null)) {
      // the same lick an octave up or down, whichever sits closest to where the last one finished
      const opts = [p.shift, p.shift - 12, p.shift + 12].filter(s => {
        if (span.open && s < 0) return false
        if (span.hi + s > 20) return false
        if (!span.open && span.lo + s < 0 && span.hi > 0) return false
        return true
      })
      const first = raw.find(e => e.notes.some(n => n.tech !== 'x'))?.notes.find(n => n.tech !== 'x')
      const cost = (s: number) => {
        const mid = (span.lo + span.hi) / 2 + s
        const jump = prevEnd !== null && first ? Math.min(12, Math.abs(midiOf(first, 0) + s - prevEnd)) : 0
        return (prevCenter !== null ? Math.abs(mid - prevCenter) : 0) + jump * 0.5
      }
      shift = opts.sort((a, b) => cost(a) - cost(b))[0] ?? p.shift
    }
    const events = raw.map(e => ({ dur: e.dur, notes: e.notes.map(n => (n.tech === 'x' ? n : { ...n, fret: n.fret + shift })) }))
    const ns = notesOf(events)
    if (ns.length) {
      const frets = ns.map(n => n.fret + p.capo).filter(f => f > 0)
      prevCenter = frets.length ? (Math.min(...frets) + Math.max(...frets)) / 2 : prevCenter
      const last = ns[ns.length - 1]
      prevEnd = midiOf(last, p.capo)
    }
    out.push({ link, lick, events, capo: p.capo, fits: true })
  }
  return out
}

export function chainTempo(c: Chain): number {
  if (c.tempo > 0) return c.tempo
  const first = LICKS.find(l => l.id === c.links[0]?.lick)
  return first ? first.bpm ?? lickStyle(first.style).bpm : 90
}

/** The whole chain as one song (null when nothing in it fits the key). */
export function chainSong(c: Chain, tuning: number[]): { song: Song; capo: number; skipped: number } | null {
  const placed = placeChain(c)
  const ok = placed.filter(p => p.fits && p.events.length)
  if (!ok.length) return null
  const capos = new Set(ok.map(p => p.capo))
  const keepCapo = capos.size === 1 ? ok[0].capo : 0
  const gap = c.gap * 4
  const events: LickEvent[] = []
  ok.forEach((p, i) => {
    // mixed capos: play the capo licks without one (same notes, higher frets)
    const bake = p.capo - keepCapo
    let ev = bake ? p.events.map(e => ({ dur: e.dur, notes: e.notes.map(n => (n.tech === 'x' ? n : { ...n, fret: n.fret + bake })) })) : p.events
    if (!isStandard(tuning)) ev = retune(ev, p.capo, tuning)
    // each lick starts on a new bar: fill the last bar of the one before
    const used = events.reduce((a, e) => a + e.dur, 0) % 4
    if (i > 0 && used > 1e-6) events.push({ notes: [], dur: 4 - used })
    if (i > 0 && gap) events.push({ notes: [], dur: gap })
    events.push(...ev)
  })
  const first = ok[0].lick
  const minor = first.minor ?? lickStyle(first.style).minor
  const song = lickSong(events, {
    tuning, capo: isStandard(tuning) ? keepCapo : 0, title: `My lick chain in ${keyLabel(c.key, minor)}`, tempo: chainTempo(c),
    program: lickStyle(first.style).program,
  })
  return { song, capo: isStandard(tuning) ? keepCapo : 0, skipped: placed.length - ok.length }
}

/**
 * "Add one that flows": the lick (from the styles already in the chain, or `style`) whose first note is closest to
 * where the chain ends, that fits the key and isn't already the last one. Endings are kept for when the chain has 3+.
 */
export function flowNext(c: Chain, style?: string): LickDef | null {
  const placed = placeChain(c)
  const last = [...placed].reverse().find(p => p.fits && notesOf(p.events).length)
  const lastNote = last ? notesOf(last.events).slice(-1)[0] : null
  const end = last && lastNote ? midiOf(lastNote, last.capo) : null
  const styles = style ? [style] : [...new Set(placed.map(p => p.lick.style))]
  const used = new Set(c.links.map(l => l.lick))
  const pick = (anyStyle: boolean) => LICKS.filter(l => chainable(l) && (anyStyle || !styles.length || styles.includes(l.style)) && l.id !== last?.lick.id && !!placeFor(l, c.key))
    .filter(l => c.links.length >= 3 || (l.kind !== 'ending'))
  // nothing in these styles fits the key: any style that does
  let pool = pick(false)
  if (!pool.length) pool = pick(true)
  if (!pool.length) return null
  const scored = pool.map(l => {
    const p = placeFor(l, c.key)!
    const ev = parseLick(l.tab).events
    const f = notesOf(ev)[0]
    const start = f ? midiOf({ string: f.string, fret: f.fret + p.shift }, p.capo) : null
    const step = end !== null && start !== null ? Math.abs(start - end) % 12 : 0
    return { l, score: Math.min(step, 7) + (used.has(l.id) ? 3 : 0) + (l.must ? 0 : 1) + Math.random() * 2 }
  }).sort((a, b) => a.score - b.score)
  return scored[0].l
}

/** For the cards: a tiny picture of a lick (notes as dots on six lines), as [x 0..1, string] pairs. */
export function lickDots(l: LickDef): { x: number; s: number; tech?: string }[] {
  const ev = parseLick(l.tab).events
  const total = ev.reduce((a, e) => a + e.dur, 0) || 1
  const out: { x: number; s: number; tech?: string }[] = []
  let t = 0
  for (const e of ev) {
    for (const n of e.notes) out.push({ x: t / total, s: n.string, tech: n.tech })
    t += e.dur
  }
  return out
}

