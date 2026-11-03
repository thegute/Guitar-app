// Chord melody and fingerstyle: a singable melody on top, a bass line under it played by the thumb, and (at the
// full level) chord notes in between, arranged the way each style does it:
//   travis / slack   the thumb alternates root and fifth on every beat (slack key: on the open strings of open G)
//   classical        bass on the beat, inner chord notes rippling (p-i-m) where the melody rests
//   cirillo          bass on 1 and 3, chord notes ringing between, harmonics to finish (Marco Cirillo, Sungha Jung)
//   country          boom-chick: bass on 1 and 3, a little chord chop on 2 and 4
//   island           root–fifth bass and the melody doubled a 6th below (Hawaiian, reggae)
//   jazz / neosoul   3rd-and-7th shells under the melody, bass on 1
//   ballad / pop     bass on 1, a full chord under the first note of each chord, a 3rd or 6th under strong notes
//   blues            a shuffle bass (root, fifth, sixth) with the melody answering
// The notes that sound together are put on the neck together (a Viterbi search over hand-sized shapes).
import type { LickEvent, LickNote } from '../licks/notation'
import { mod, notesIn, type CChord } from './harmony'
import type { LNote, Rng } from './line'
import type { MelodyBacking, StyleDef } from './styles'

export type ArrLevel = 'melody' | 'bass' | 'full'
interface Ev { at: number; dur: number; melody?: number; bass?: number; inner: number[]; tech?: string; harm?: boolean; chord?: string }

function bassNote(pcv: number, lo: number): number { let m = lo; while (mod(m) !== pcv) m++; return m }

/** Bass and inner notes for each chord, merged with the melody into time events. */
export function arrangeEvents(melody: LNote[], tl: CChord[], backing: MelodyBacking, level: ArrLevel, eff: number[], meter: number, r: Rng): Ev[] {
  const bassLo = eff[0]
  const evs = new Map<number, Ev>()
  const at = (t: number) => { const k = Math.round(t * 1000) / 1000; let e = evs.get(k); if (!e) { e = { at: k, dur: 0, inner: [] }; evs.set(k, e) } return e }
  for (const n of melody) {
    if (n.want === 'x') continue
    const e = at(n.at)
    e.melody = n.midi
    if (n.want === 'harm') e.harm = true
    if (n.under !== undefined && level === 'full') e.inner.push(n.under)
  }
  if (level !== 'melody') {
    for (const c of tl) {
      const root = bassNote(c.root, bassLo)
      const fifthPc = c.pcs.find(x => mod(x - c.root) === 7) ?? c.pcs[c.pcs.length - 1]
      let fifth = bassNote(fifthPc, bassLo)
      if (fifth - root > 9) fifth -= 12
      if (fifth < bassLo) fifth += 12
      const sixth = root + 9 <= bassLo + 16 ? root + 9 : root - 3
      for (let off = 0; off < c.beats - 1e-6; off += 1) {
        const t = c.start + off
        const beat = Math.round(t) % meter
        let b: number | undefined
        if (backing === 'travis' || backing === 'slack' || backing === 'cirillo' && level === 'full') b = beat % 2 === 0 ? root : fifth
        else if (backing === 'country') b = beat % 2 === 0 ? (beat === 0 ? root : fifth) : undefined
        else if (backing === 'island' || backing === 'pop' || backing === 'cirillo') b = beat === 0 ? root : beat === 2 ? fifth : undefined
        else if (backing === 'blues') b = [root, fifth, sixth, fifth][beat % 4]
        else if (backing === 'classical') b = beat === 0 ? root : beat === 2 && meter === 4 && r() < .5 ? fifth : undefined
        else b = beat === 0 || off === 0 ? root : undefined // ballad, jazz, neosoul
        if (b !== undefined) at(t).bass = b
        // country: the chop on 2 and 4 (two upper chord notes)
        if (backing === 'country' && level === 'full' && beat % 2 === 1) {
          const e = at(t)
          if (e.melody === undefined) e.inner = notesIn(c.pcs, root + 12, root + 22).slice(0, 2)
        }
        // classical and cirillo: inner notes ripple on the off-beats where the melody rests
        if ((backing === 'classical' || backing === 'cirillo') && level === 'full') {
          const mid = notesIn(c.pcs, root + 7, root + 19)
          const e = at(t + .5)
          if (e.melody === undefined && mid.length) e.inner = [mid[(Math.round(t * 2)) % mid.length]]
        }
      }
      // the first note over each chord gets the chord under it (ballad, pop, jazz shells, island 6ths)
      if (level === 'full') {
        const first = melody.find(n => n.at >= c.start - 1e-6 && n.at < c.start + c.beats - 1e-6 && n.want !== 'x')
        for (const n of melody) {
          if (n.want === 'x' || n.at < c.start - 1e-6 || n.at >= c.start + c.beats - 1e-6) continue
          const e = at(n.at)
          if (e.inner.length) continue
          const below = (pcs: number[], count: number) => {
            const out: number[] = []
            for (let m = n.midi - 1; m > n.midi - 13 && out.length < count; m--) if (pcs.includes(mod(m)) && !out.some(x => mod(x) === mod(m)) && mod(m) !== mod(n.midi)) out.push(m)
            return out
          }
          if (backing === 'island' || backing === 'slack') { const six = [n.midi - 9, n.midi - 8].find(m => c.scale.includes(mod(m))); if (six !== undefined && (n.strong || backing === 'island')) e.inner = [six] }
          else if (backing === 'jazz' || backing === 'neosoul') { if (n.strong) { const guide = c.pcs.filter(x => [3, 4, 10, 11].includes(mod(x - c.root))); e.inner = below(guide.length ? guide : c.pcs, 2) } }
          else if (n === first && (backing === 'ballad' || backing === 'pop' || backing === 'travis' || backing === 'cirillo')) e.inner = below(c.pcs, backing === 'ballad' ? 2 : 1)
          else if (n.strong && (backing === 'ballad' || backing === 'pop')) { const t3 = [n.midi - 4, n.midi - 3, n.midi - 9, n.midi - 8].find(m => c.scale.includes(mod(m))); if (t3 !== undefined) e.inner = [t3] }
        }
      }
    }
  }
  // the bass sits below the melody and the inner notes between them
  for (const e of evs.values()) {
    if (e.bass !== undefined && e.melody !== undefined) while (e.bass >= e.melody - 2 && e.bass - 12 >= bassLo) e.bass -= 12
    if (e.bass !== undefined && e.melody !== undefined && e.bass >= e.melody) e.bass = undefined
    const top = e.melody ?? 999, bot = e.bass ?? -1
    e.inner = e.inner.filter(m => m < top && m > bot)
  }
  const list = [...evs.values()].sort((a, b) => a.at - b.at)
  list.forEach((e, i) => { e.dur = Math.round(((list[i + 1]?.at ?? Math.ceil((e.at + 1e-6) / meter) * meter) - e.at) * 1e4) / 1e4 })
  for (const c of tl) { const e = list.find(x => Math.abs(x.at - c.start) < 1e-6); if (e) e.chord = c.name }
  return list.filter(e => e.dur > 1e-4)
}

interface P { s: number; f: number; m: number; role: 'mel' | 'bass' | 'in' }

/** Put each event's notes on the neck, all together, keeping the hand in reach and moving little. */
export function placeArranged(evs: Ev[], eff: number[], st: StyleDef): { events: LickEvent[]; cost: number } {
  const maxF = eff.length === 4 ? 15 : 17
  const pos = (m: number) => eff.map((t, s) => ({ s, f: m - t })).filter(p => p.f >= 0 && p.f <= maxF)
  const combos = (e: Ev): P[][] => {
    const out: P[][] = []
    const mel = e.melody !== undefined ? pos(e.melody).map(p => ({ ...p, m: e.melody!, role: 'mel' as const })) : [null]
    if (e.harm && e.melody !== undefined) {
      const hs = eff.map((t, s) => ({ s, t })).filter(x => x.t + 12 === e.melody || x.t + 19 === e.melody)
      for (const h of hs) out.push([{ s: h.s, f: h.t + 12 === e.melody ? 12 : 7, m: e.melody!, role: 'mel' }])
      if (out.length) return out
    }
    const bass = e.bass !== undefined ? [...pos(e.bass).map(p => ({ ...p, m: e.bass!, role: 'bass' as const })), null] : [null]
    const in0 = e.inner[0] !== undefined ? [...pos(e.inner[0]).map(p => ({ ...p, m: e.inner[0], role: 'in' as const })), null] : [null]
    const in1 = e.inner[1] !== undefined ? [...pos(e.inner[1]).map(p => ({ ...p, m: e.inner[1], role: 'in' as const })), null] : [null]
    for (const a of mel) for (const b of bass) for (const c of in0) for (const d of in1) {
      const ch = [a, b, c, d].filter((x): x is P => !!x)
      if (!ch.length) continue
      if (new Set(ch.map(x => x.s)).size !== ch.length) continue
      // melody on the highest string used, bass on the lowest
      if (a && ch.some(x => x !== a && x.s > a.s)) continue
      if (b && ch.some(x => x !== b && x.s < b.s)) continue
      const fr = ch.filter(x => x.f > 0).map(x => x.f)
      if (fr.length && Math.max(...fr) - Math.min(...fr) > 4) continue
      out.push(ch)
    }
    return out.length ? out : [[]]
  }
  const cands = evs.map(combos)
  const center = (c: P[]) => { const fr = c.filter(x => x.f > 0).map(x => x.f); return fr.length ? fr.reduce((a, b) => a + b, 0) / fr.length : null }
  const own = (e: Ev, c: P[]) => {
    let cost = 0
    const want = (e.melody !== undefined ? 1 : 0) + (e.bass !== undefined ? 1 : 0) + e.inner.length
    cost += (want - c.length) * 2.2
    if (e.melody !== undefined && !c.some(x => x.role === 'mel')) cost += 6
    for (const x of c) {
      if (x.f === 0) cost += (.4 - st.open) * 1.2
      if (x.f > st.zone[1] + 2) cost += (x.f - st.zone[1] - 2) * .8
      if (x.role === 'mel') cost += (eff.length - 1 - x.s) * .25
      if (x.role === 'bass') cost += x.s * .35
    }
    return cost
  }
  const N = evs.length
  if (!N) return { events: [], cost: 0 }
  const best: number[][] = [], from: number[][] = [], hand: (number | null)[][] = []
  for (let i = 0; i < N; i++) {
    best.push(cands[i].map(c => own(evs[i], c)))
    from.push(cands[i].map(() => 0))
    hand.push(cands[i].map(c => center(c)))
    if (!i) continue
    cands[i].forEach((c, k) => {
      let bv = Infinity, bj = 0
      cands[i - 1].forEach((_, j) => {
        const h0 = hand[i - 1][j], h1 = center(c)
        const move = h0 !== null && h1 !== null ? Math.abs(h1 - h0) : 0
        const v = best[i - 1][j] + Math.max(0, move - 1.5) * .7
        if (v < bv) { bv = v; bj = j }
      })
      best[i][k] += bv
      from[i][k] = bj
      if (hand[i][k] === null) hand[i][k] = hand[i - 1][bj]
    })
  }
  let k = best[N - 1].reduce((bi, v, j, a) => (v < a[bi] ? j : bi), 0)
  const total = best[N - 1][k]
  const chosen: P[][] = Array(N)
  for (let i = N - 1; i >= 0; i--) { chosen[i] = cands[i][k]; k = from[i][k] }
  // legato on the melody where it moves on one string with nothing else struck
  const events: LickEvent[] = chosen.map((c, i) => {
    const e = evs[i]
    const notes: LickNote[] = c.map(x => ({ string: x.s, fret: x.f, ...(e.harm && x.role === 'mel' ? { tech: 'harm' } : {}) }))
    const prev = i ? chosen[i - 1].find(x => x.role === 'mel') : undefined
    const me = c.find(x => x.role === 'mel')
    if (prev && me && c.length === 1 && prev.s === me.s && prev.f !== me.f && Math.abs(prev.f - me.f) <= 3 && evs[i - 1].dur <= .5 && !e.harm) {
      const n = notes.find(x => x.string === me.s)!
      n.tech = me.f > prev.f ? 'h' : 'p'
    }
    if (me && e.dur >= 1.5 && i === N - 1 && !e.harm) { const n = notes.find(x => x.string === me.s)!; n.tech = (n.tech ?? '') + '~' }
    return { notes: notes.sort((a, b) => a.string - b.string), dur: e.dur }
  })
  return { events, cost: total / N }
}
