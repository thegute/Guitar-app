// Riffs and rhythm parts: where the rhythm is the point. Each kind is how players of the style comp or riff:
//   power   rock: power chords and palm-muted root chugs with a passing note into the next chord
//   gallop  metal: the gallop (eighth + two sixteenths) on the low root, power-chord stabs on the changes
//   djent   prog metal: palm-muted low-string sixteenths in odd groupings (3s and 5s across the bar), accents on
//           chord stabs, an open high string ringing over the top now and then (Periphery, Born of Osiris, Plini heavy)
//   funk16  funk: chord stabs on sixteenths with muted scratches between, a 9th-chord shape on the middle strings
//   skank   reggae: short chops on the "and"s (top three strings), with a little bass-line "dub" riff answering
//   dub     a bass-like riff on the low strings: root, fifth, octave, an approach note into the next chord
import type { LickEvent, LickNote } from '../licks/notation'
import { chordAt, mod, type CChord } from './harmony'
import type { RiffKind } from './styles'
import { findShape } from './voicing'
import type { Rng } from './line'

const pick = <T,>(r: Rng, a: T[]): T => a[Math.floor(r() * a.length)]
interface Hit { at: number; dur: number; notes: LickNote[] }

/** the lowest place a pitch class sits on one string, from fret `min` */
function fretOf(pcv: number, open: number, min = 0, max = 12) {
  for (let f = min; f <= max; f++) if (mod(open + f) === pcv) return f
  return -1
}
/** a power chord (root, fifth, maybe octave) with its root on string s */
function power(c: CChord, tuning: number[], s: number, octave: boolean): LickNote[] {
  const f = fretOf(c.root, tuning[s], 0, 12)
  if (f < 0 || s + 1 >= tuning.length) return []
  const notes: LickNote[] = [{ string: s, fret: f }]
  const f5 = fretOf(mod(c.root + 7), tuning[s + 1], Math.max(0, f - 2), f + 4)
  if (f5 >= 0) notes.push({ string: s + 1, fret: f5 })
  if (octave && s + 2 < tuning.length) { const f8 = fretOf(c.root, tuning[s + 2], Math.max(0, f - 1), f + 4); if (f8 >= 0) notes.push({ string: s + 2, fret: f8 }) }
  return notes
}
const pm = (ns: LickNote[]) => ns.map(n => ({ ...n, tech: 'PM' }))

export function makeRiff(kind: RiffKind, tl: CChord[], bars: number, meter: number, tuning: number[], level: 1 | 2 | 3, r: Rng): LickEvent[] {
  const hits: Hit[] = []
  const n = tuning.length
  const low = 0
  // the string the low riffs sit on: the one where the key's chords' roots fall lowest
  const rootString = (c: CChord) => { const f0 = fretOf(c.root, tuning[0], 0, 7); return f0 >= 0 ? 0 : 1 }
  for (let b = 0; b < bars; b++) {
    const t0 = b * meter
    const c = chordAt(tl, t0)
    const nextC = chordAt(tl, t0 + meter + .01)
    const last = b === bars - 1
    if (kind === 'power' || kind === 'gallop') {
      const s = rootString(c)
      const chug = pm([{ string: s, fret: fretOf(c.root, tuning[s], 0, 12) }])
      const pc5 = power(c, tuning, s, kind === 'power')
      const pats: [number, number, 'C' | 'm' | 'p'][][] = kind === 'gallop'
        ? [[[0, .5, 'C'], [.5, .25, 'm'], [.75, .25, 'm'], [1, .5, 'm'], [1.5, .25, 'm'], [1.75, .25, 'm'], [2, .5, 'C'], [2.5, .25, 'm'], [2.75, .25, 'm'], [3, .5, 'm'], [3.5, .25, 'm'], [3.75, .25, 'm']]]
        : level === 1 ? [[[0, 1, 'C'], [1, .5, 'm'], [1.5, .5, 'm'], [2, 1, 'C'], [3, .5, 'm'], [3.5, .5, 'm']]]
          : [[[0, .5, 'C'], [.5, .5, 'm'], [1, .5, 'm'], [1.5, .5, 'C'], [2, .5, 'm'], [2.5, .5, 'm'], [3, .5, 'C'], [3.5, .5, 'p']],
            [[0, .75, 'C'], [.75, .75, 'C'], [1.5, .5, 'm'], [2, .5, 'm'], [2.5, .5, 'C'], [3, .5, 'm'], [3.5, .5, 'p']]]
      for (const [a, d, w] of pick(r, pats)) {
        if (a >= meter) continue
        if (w === 'p') {
          // a passing note into the next chord's root (a half or whole step away)
          const target = fretOf(nextC.root, tuning[s], 0, 12)
          const pf = target > 1 ? target - (r() < .5 ? 1 : 2) : target + 2
          hits.push({ at: t0 + a, dur: d, notes: last ? pc5 : [{ string: s, fret: Math.max(0, pf) }] })
        } else hits.push({ at: t0 + a, dur: d, notes: w === 'C' ? pc5 : chug })
      }
    } else if (kind === 'djent') {
      const s = 0
      const rf = fretOf(c.root, tuning[s], 0, 11)
      const chug = pm([{ string: s, fret: rf }])
      // groups across the bar: e.g. 3+3+3+3+2+2 sixteenths, each group starts with an accent (a chord stab)
      const groupsets = [[3, 3, 3, 3, 2, 2], [5, 5, 3, 3], [3, 3, 2, 3, 3, 2], [4, 3, 3, 4, 2]]
      const gs = pick(r, groupsets)
      let x = 0
      for (const g of gs) {
        const at = t0 + x * .25
        if (x * .25 >= meter) break
        // a power chord, or the root-5th-9th shape with an open string ringing over it now and then
        const stab = r() < .5 ? power(c, tuning, s, false) : [{ string: s, fret: rf }, { string: s + 1, fret: fretOf(mod(c.root + 7), tuning[s + 1], Math.max(0, rf - 1), rf + 3) }, { string: s + 2, fret: fretOf(mod(c.root + 2), tuning[s + 2], Math.max(0, rf), rf + 5) }, ...(r() < .4 ? [{ string: n - 1, fret: 0 }] : [])]
        hits.push({ at, dur: .25 * Math.min(2, g), notes: stab })
        for (let k = Math.min(2, g); k < g; k++) {
          if ((x + k) * .25 >= meter) break
          hits.push({ at: t0 + (x + k) * .25, dur: .25, notes: level >= 2 || k % 2 === 0 ? chug : [] })
        }
        x += g
      }
    } else if (kind === 'funk16') {
      const sh = findShape([...new Set([...c.pcs, mod(c.root + (c.minor ? 10 : 2))])], c.root, tuning, 6, { minStrings: 3, noOpen: true })
      const chord: LickNote[] = sh ? sh.frets.map((f, s) => ({ string: s, fret: f })).filter((x, s) => x.fret >= 0 && s >= 2 && s <= 4) : []
      const scratch: LickNote[] = chord.map(x => ({ ...x, tech: 'x' }))
      const pats = [
        'C.x.Cx.xC.x.xCx.', 'x.C.xxC.x.Cxx.C.', 'C..xC.x.C..xCx.x', 'Cx.CxxC.x.C.xC.x',
      ]
      const p = pick(r, pats)
      for (let k = 0; k < 16 && k * .25 < meter; k++) {
        const ch = p[k]
        if (ch === '.') continue
        hits.push({ at: t0 + k * .25, dur: .25, notes: ch === 'C' ? chord : scratch })
      }
    } else if (kind === 'skank' || kind === 'dub') {
      const sh = findShape(c.pcs, c.root, tuning.slice(n - 3).length === 3 ? tuning : tuning, 7, { minStrings: 3 })
      // a small triad on the top three strings around the 5th–10th fret
      const top: LickNote[] = []
      if (sh) {
        let fs = sh.frets.slice(n - 3)
        const t3 = tuning.slice(n - 3)
        // find the top-3-string triad nearest the 7th fret
        let bestT: number[] | null = null, bestC = 99
        for (let p = 3; p <= 12; p++) {
          const pick3 = t3.map(open => { for (let f = p; f <= p + 3; f++) if (c.pcs.includes(mod(open + f))) return f; return -1 })
          if (pick3.some(f => f < 0)) continue
          const cs = new Set(pick3.map((f, k) => mod(t3[k] + f)))
          const cost = (3 - cs.size) * 3 + Math.abs(p - 7) * .3
          if (cost < bestC) { bestC = cost; bestT = pick3 }
        }
        if (bestT) fs = bestT
        fs.forEach((f, k) => { if (f >= 0) top.push({ string: n - 3 + k, fret: f }) })
      }
      const offs = kind === 'skank' ? (level === 1 ? [1, 3] : [.5, 1.5, 2.5, 3.5]) : []
      for (const a of offs) if (a < meter) hits.push({ at: t0 + a, dur: .25, notes: top })
      // the dub answer: a low riff in the second half of every other bar (or every bar for dub)
      if (kind === 'dub' || (b % 2 === 1 && level >= 2)) {
        const s = rootString(c)
        const rf = fretOf(c.root, tuning[s], 2, 12)
        const fifthS = s + 1, f5 = fretOf(mod(c.root + 7), tuning[fifthS], Math.max(0, rf - 2), rf + 3)
        const seq: [number, number, LickNote][] = kind === 'dub'
          ? [[0, .75, { string: s, fret: rf }], [1.5, .5, { string: s, fret: rf }], [2, .5, { string: fifthS, fret: f5 }], [2.5, .5, { string: fifthS, fret: Math.min(f5 + 2, 22) }], [3, .75, { string: s + 1 < n ? s + 2 : s, fret: fretOf(c.root, tuning[Math.min(n - 1, s + 2)], Math.max(0, rf - 2), rf + 3) }]]
          : [[2, .25, { string: s, fret: rf }], [2.25, .25, { string: s, fret: rf }], [2.75, .25, { string: fifthS, fret: f5 }], [3.25, .25, { string: s, fret: rf }]]
        for (const [a, d, nn] of seq) if (a < meter && nn.fret >= 0 && !hits.some(h => Math.abs(h.at - (t0 + a)) < 1e-6)) hits.push({ at: t0 + a, dur: d, notes: [nn] })
      }
    } else {
      // boomchick / crosspick / hybrid / arpeggio are fingerpicking patterns (handled by picking.ts)
    }
  }
  // events with rests in the gaps, in time order, no overlaps
  hits.sort((a, b) => a.at - b.at)
  const ev: LickEvent[] = []
  let t = 0
  for (let i = 0; i < hits.length; i++) {
    const h = hits[i]
    if (h.at > t + 1e-6) ev.push({ notes: [], dur: Math.round((h.at - t) * 1e4) / 1e4 })
    const next = hits[i + 1]?.at ?? bars * meter
    const dur = Math.max(.125, Math.min(h.dur, next - h.at))
    ev.push({ notes: h.notes.filter(x => x.fret >= 0), dur: Math.round(dur * 1e4) / 1e4 })
    t = h.at + dur
  }
  if (t < bars * meter - 1e-6) ev.push({ notes: [], dur: Math.round((bars * meter - t) * 1e4) / 1e4 })
  void low
  return ev
}
