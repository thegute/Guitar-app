// The lick chainer: line up licks from the library like train cars and play them as one phrase. Every lick is moved to
// one key, and each one is placed on the neck near where the one before it ended, so your hand doesn't jump around.
// A capo style's licks keep their capo when they all share one; otherwise the capo is "baked in" (same pitches,
// fretted higher) so the chain can mix styles.
import { findLick, myLicks } from './mine'
import type { Song } from '../tabs/model'
import { LICKS, type LickDef } from './library'
import { lickStyle } from './styles'
import { fretSpan, lickSong, parseLick, type LickEvent } from './notation'
import { isStandard, keyLabel, placeFor, retune } from './generator'
import { pc } from '../theory/notes'

export interface ChainLink { lick: string; uid: string }
export interface Chain {
  key: string
  /** Major (false) vs minor (true); locked by the first lick in the chain */
  minor?: boolean
  /** Off by default: false = strict native same-key; true = also include licks transposed cleanly to this key */
  allowTranspose?: boolean
  /** beats per minute; 0 = take it from the first lick */
  tempo: number
  /** rest between licks, in bars */
  gap: 0 | 0.5 | 1
  links: ChainLink[]
}
export const EMPTY_CHAIN: Chain = { key: 'A', minor: false, allowTranspose: false, tempo: 0, gap: 0, links: [] }
const KEY = 'kg:lickChain'
const listeners = new Set<() => void>()

export const lickMinor = (l: LickDef): boolean => l.minor ?? lickStyle(l.style).minor
export const lickHomeKey = (l: LickDef): { root: string; minor: boolean } => ({ root: l.ref, minor: lickMinor(l) })
const sameRoot = (a: string, b: string) => pc(a) === pc(b)

export function chainMinor(c: Chain): boolean {
  if (typeof c.minor === 'boolean') return c.minor
  const first = c.links.length ? findLick(c.links[0].lick) : undefined
  return first ? lickMinor(first) : false
}

/** True when a lick matches a chain key + tonality (strictly native key by default, or transposable when allowed). */
export function lickMatchesChain(l: LickDef, key: string, minor: boolean, allowTranspose = false): boolean {
  if (lickMinor(l) !== minor) return false
  if (!allowTranspose) return sameRoot(l.ref, key) && !!placeFor(l, key)
  return !!placeFor(l, key)
}

export function loadChain(): Chain {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Chain | null
    if (!c || !Array.isArray(c.links)) return { ...EMPTY_CHAIN }
    const links = c.links.filter(l => !!findLick(l.lick))
    const first = links.length ? findLick(links[0].lick) : undefined
    const minor = typeof c.minor === 'boolean' ? c.minor : first ? lickMinor(first) : false
    return { ...EMPTY_CHAIN, ...c, minor, allowTranspose: !!c.allowTranspose, links }
  } catch { return { ...EMPTY_CHAIN } }
}
export function saveChain(c: Chain) {
  try { localStorage.setItem(KEY, JSON.stringify(c)) } catch { /* storage unavailable */ }
  listeners.forEach(f => f())
}
export function onChain(f: () => void) { listeners.add(f); return () => { listeners.delete(f) } }
export const newUid = () => Math.random().toString(36).slice(2, 9)

export interface ChainAddCheck {
  ok: boolean
  reason: 'empty' | 'same' | 'different-key' | 'different-quality' | 'cant-fit'
  lickKey: string
  lickMinor: boolean
  lickLabel: string
  chainKey: string
  chainMinor: boolean
  chainLabel: string
  canTranspose: boolean
}

/** Check whether a lick matches the active chain key + tonality before adding it. */
export function checkChainAdd(lickId: string, chain?: Chain, targetKey?: string): ChainAddCheck | null {
  const lick = findLick(lickId)
  if (!lick) return null
  const c = chain ?? loadChain()
  const lRoot = targetKey && placeFor(lick, targetKey) ? targetKey : lick.ref
  const lMin = lickMinor(lick)
  const cMin = chainMinor(c)
  const lickLabel = keyLabel(lRoot, lMin)
  const chainLabel = keyLabel(c.key, cMin)
  if (c.links.length === 0) {
    return { ok: true, reason: 'empty', lickKey: lRoot, lickMinor: lMin, lickLabel, chainKey: lRoot, chainMinor: lMin, chainLabel: lickLabel, canTranspose: true }
  }
  if (lickMatchesChain(lick, c.key, cMin, !!c.allowTranspose) && (!targetKey || sameRoot(targetKey, c.key))) {
    return { ok: true, reason: 'same', lickKey: lRoot, lickMinor: lMin, lickLabel, chainKey: c.key, chainMinor: cMin, chainLabel, canTranspose: true }
  }
  const canTranspose = lMin === cMin && !!placeFor(lick, c.key)
  const reason = lMin !== cMin ? 'different-quality' : canTranspose ? 'different-key' : 'cant-fit'
  return { ok: false, reason, lickKey: lRoot, lickMinor: lMin, lickLabel, chainKey: c.key, chainMinor: cMin, chainLabel, canTranspose }
}

/** Add a lick to the end of the saved chain (from a lick's own page). The first lick locks the key & major/minor. */
export function addToChain(lickId: string, key?: string, minor?: boolean) {
  const c = loadChain()
  const lick = findLick(lickId)
  if (c.links.length === 0 && lick) {
    const k = key ?? lick.ref
    const m = typeof minor === 'boolean' ? minor : lickMinor(lick)
    const transposed = !sameRoot(k, lick.ref)
    saveChain({ ...c, key: k, minor: m, allowTranspose: transposed, links: [{ lick: lickId, uid: newUid() }] })
    return
  }
  saveChain({ ...c, links: [...c.links, { lick: lickId, uid: newUid() }] })
}

/** Replace the chain with one lick in its key + tonality (used when user switches away from a locked key). */
export function startNewChain(lickId: string, key?: string, minor?: boolean) {
  const c = loadChain()
  const lick = findLick(lickId)
  if (!lick) return
  const k = key ?? lick.ref
  const m = typeof minor === 'boolean' ? minor : lickMinor(lick)
  const transposed = !sameRoot(k, lick.ref)
  saveChain({ ...c, key: k, minor: m, allowTranspose: transposed, links: [{ lick: lickId, uid: newUid() }] })
}

/** Enable transposition on the current chain (keeping its locked key + tonality) and append the lick. */
export function matchChainTranspose(lickId: string) {
  const c = loadChain()
  const lick = findLick(lickId)
  if (!lick) return
  const cMin = chainMinor(c)
  if (lickMinor(lick) !== cMin || !placeFor(lick, c.key)) return
  saveChain({ ...c, minor: cMin, allowTranspose: true, links: [...c.links, { lick: lickId, uid: newUid() }] })
}

/** Licks that can go in a chain: 4/4 only, so the bars line up. */
export const chainable = (l: LickDef) => (l.meter ?? 4) === 4
export const lickBars = (l: LickDef) => Math.max(1, Math.round(parseLick(l.tab).bars.reduce((a, b) => a + b, 0) / 4))

const STANDARD = [40, 45, 50, 55, 59, 64]
const midiOf = (n: { string: number; fret: number }, capo: number) => STANDARD[n.string] + capo + n.fret
const notesOf = (ev: LickEvent[]) => ev.flatMap(e => e.notes.filter(n => n.tech !== 'x'))

export interface Placed { link: ChainLink; lick: LickDef; events: LickEvent[]; capo: number; fits: boolean }

/**
 * Place every lick of the chain in the key, each near the last. Licks that don't match the chain's key/tonality rules
 * come back with fits=false (and no notes); the card says so and the chain skips them.
 */
export function placeChain(c: Chain): Placed[] {
  const out: Placed[] = []
  let prevCenter: number | null = null
  let prevEnd: number | null = null
  const strictQuality = typeof c.minor === 'boolean'
  for (const link of c.links) {
    const lick = findLick(link.lick)
    if (!lick) continue
    if (strictQuality && !lickMatchesChain(lick, c.key, c.minor!, !!c.allowTranspose)) {
      out.push({ link, lick, events: [], capo: 0, fits: false })
      continue
    }
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
  const first = findLick(c.links[0]?.lick ?? '')
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
  const minor = typeof c.minor === 'boolean' ? c.minor : lickMinor(first)
  const song = lickSong(events, {
    tuning, capo: isStandard(tuning) ? keepCapo : 0, title: `My lick chain in ${keyLabel(c.key, minor)}`, tempo: chainTempo(c),
    program: lickStyle(first.style).program,
  })
  return { song, capo: isStandard(tuning) ? keepCapo : 0, skipped: placed.length - ok.length }
}

/**
 * "Add one that flows": the lick (from the styles already in the chain, or `style`) whose first note is closest to
 * where the chain ends, that fits the key/tonality rules and isn't already the last one. Endings are kept for when the chain has 3+.
 */
export function flowNext(c: Chain, style?: string): LickDef | null {
  const placed = placeChain(c)
  const last = [...placed].reverse().find(p => p.fits && notesOf(p.events).length)
  const lastNote = last ? notesOf(last.events).slice(-1)[0] : null
  const end = last && lastNote ? midiOf(lastNote, last.capo) : null
  const styles = style && style !== 'all' ? [style] : [...new Set(placed.map(p => p.lick.style))]
  const used = new Set(c.links.map(l => l.lick))
  const strict = typeof c.minor === 'boolean'
  const catalog = style === 'mine' ? [...myLicks(), ...LICKS] : LICKS
  const matchesKey = (l: LickDef) => strict
    ? lickMatchesChain(l, c.key, c.minor!, !!c.allowTranspose)
    : !!placeFor(l, c.key)
  const pick = (anyStyle: boolean) => catalog.filter(l => chainable(l) && (anyStyle || !styles.length || styles.includes(l.style)) && l.id !== last?.lick.id && matchesKey(l))
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

