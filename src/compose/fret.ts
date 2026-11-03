// Putting the line on the neck: every note gets a string and fret, chosen together (a Viterbi search) so the hand
// stays in a sensible position, moves where the style moves (one box per phrase, roaming up the neck, or first
// position with open strings), and plays fast notes on one string as legato. Then the techniques go on: hammer-ons
// and pull-offs, slides between positions, bends into target notes, harmonics, taps, palm mutes, ghost notes.
import type { LickEvent, LickNote } from '../licks/notation'
import type { StyleDef } from './styles'
import type { LNote, Rng } from './line'

interface Pos { s: number; f: number }
interface Cand { notes: Pos[]; cost: number; tech?: string }

const MAX_FRET = 22

/** Where a pitch can be played (open strings only when the style allows them). */
function spots(midi: number, tuning: number[], st: StyleDef, maxFret: number): Pos[] {
  const out: Pos[] = []
  tuning.forEach((t, s) => { const f = midi - t; if (f >= 0 && f <= maxFret) out.push({ s, f }) })
  return out
}

export interface Placed { events: LickEvent[]; cost: number }

/** Anchor fret per note: where the hand should be (by phrase for box styles, following the line when roaming). */
function anchors(notes: LNote[], tuning: number[], st: StyleDef, meter: number, r: Rng): number[] {
  const [lo, hi] = st.zone
  if (st.moves === 'open') return notes.map(() => Math.min(hi, 2))
  const mid = tuning.length >= 6 ? 3 : Math.floor(tuning.length / 2)
  if (st.moves === 'roam') {
    return notes.map(n => Math.max(lo + 1, Math.min(hi - 3, n.midi - tuning[mid] - 1)))
  }
  // box: one position per two bars, chosen where the phrase sits best; the development moves up a box
  const per = 2 * meter
  const groups = new Map<number, LNote[]>()
  notes.forEach(n => { const g = Math.floor(n.at / per); (groups.get(g) ?? groups.set(g, []).get(g)!).push(n) })
  const box = new Map<number, number>()
  for (const [g, ns] of groups) {
    const ms = ns.map(n => n.midi).sort((a, b) => a - b)
    const med = ms[Math.floor(ms.length / 2)]
    let best = lo, bestC = Infinity
    for (let p = Math.max(lo, 1); p <= hi - 3; p++) {
      // how many notes fit in frets p-1 … p+4 on some string
      let miss = 0
      for (const m of ms) if (!tuning.some(t => m - t >= p - 1 && m - t <= p + 4)) miss++
      const c = miss * 3 + Math.abs(med - (tuning[mid] + p + 2)) * .15 + (r() * .4)
      if (c < bestC) { bestC = c; best = p }
    }
    box.set(g, best)
  }
  return notes.map(n => box.get(Math.floor(n.at / per)) ?? lo)
}

export function placeLine(notes: LNote[], tuning: number[], st: StyleDef, r: Rng, meter = 4, capo = 0): Placed {
  const maxFret = Math.min(MAX_FRET, tuning.length === 4 ? 17 : MAX_FRET) - capo
  const eff = tuning.map(t => t + capo)
  const anc = anchors(notes, eff, st, meter, r)
  const [zlo, zhi] = st.zone
  // candidates for each note (with its double-stop partner, or forced onto a harmonic)
  const cands: Cand[][] = notes.map((n, i) => {
    const out: Cand[] = []
    if (n.want === 'harm') {
      for (const [s, t] of eff.entries()) {
        if (n.midi === t + 12) out.push({ notes: [{ s, f: 12 }], cost: -.4, tech: 'harm' })
        else if (n.midi === t + 19 && st.tech.harm) out.push({ notes: [{ s, f: 7 }], cost: -.2, tech: 'harm' })
        else if (n.midi === t + 24 && st.tech.harm) out.push({ notes: [{ s, f: 5 }], cost: -.1, tech: 'harm' })
      }
    }
    if (n.want === 'x') {
      // a muted ghost note: any string near the hand
      for (let s = 0; s < eff.length; s++) out.push({ notes: [{ s, f: Math.max(0, anc[i]) }], cost: Math.abs(eff[s] + anc[i] - n.midi) * .05, tech: 'x' })
      return out
    }
    const a = spots(n.midi, eff, st, maxFret)
    if (n.under !== undefined) {
      const b = spots(n.under, eff, st, maxFret)
      for (const p of a) for (const q of b) {
        if (q.s >= p.s) continue // the lower note on a lower string
        const fr = [p.f, q.f].filter(f => f > 0)
        const span = fr.length === 2 ? Math.abs(p.f - q.f) : 0
        if (span > 3) continue
        out.push({ notes: [q, p], cost: (p.s - q.s - 1) * .25 })
      }
      if (out.length) return out
    }
    for (const p of a) out.push({ notes: [p], cost: 0 })
    return out
  })
  // costs of one choice on its own
  const own = (i: number, c: Cand): number => {
    let cost = c.cost
    for (const p of c.notes) {
      if (c.tech === 'x') continue
      if (p.f === 0) cost += (.55 - st.open) * 1.6 + (anc[i] > 7 && st.open < .5 ? 1 : 0)
      else {
        const a = anc[i]
        if (st.moves === 'box') { if (p.f < a - 1) cost += (a - 1 - p.f) * 1.3; else if (p.f > a + 4) cost += (p.f - a - 4) * 1.3 }
        else if (st.moves === 'open') { if (p.f > zhi) cost += (p.f - zhi) * 1.1 }
        else cost += Math.abs(p.f - a) * .12
        if (p.f < zlo - 1) cost += (zlo - 1 - p.f) * .8
        if (p.f > zhi + 1) cost += (p.f - zhi - 1) * .8
      }
    }
    return cost
  }
  const step = (i: number, a: Cand, b: Cand): number => {
    const pa = a.notes[a.notes.length - 1], pb = b.notes[b.notes.length - 1]
    const fa = a.notes.filter(p => p.f > 0).map(p => p.f), fb = b.notes.filter(p => p.f > 0).map(p => p.f)
    let cost = 0
    if (fa.length && fb.length) {
      const ca = fa.reduce((x, y) => x + y, 0) / fa.length, cb = fb.reduce((x, y) => x + y, 0) / fb.length
      const shift = Math.abs(cb - ca)
      // along one string: a little move is free-ish, a big one is a slide or a shift (players mostly stay in position)
      cost += pa.s === pb.s ? (shift <= 2 ? shift * .05 : .1 + (shift - 2) * .35) : Math.max(0, shift - 3) * .9
    }
    const dj = Math.abs(pb.s - pa.s)
    cost += dj * .2 + (dj > 2 ? (dj - 2) * (st.arpeggio > .4 ? .1 : .5) : 0)
    // fast notes on one string can be legato (hammer-ons, pull-offs); a tapping figure stays on one string
    const n = notes[i]
    if (n.group !== undefined && notes[i - 1]?.group === n.group && pa.s !== pb.s) cost += 12
    if (pa.s === pb.s && n.dur <= .5 && Math.abs(pb.f - pa.f) <= 3 && pb.f !== pa.f) cost -= .15 * (st.tech.legato ?? 0)
    if (n.group !== undefined && notes[i - 1]?.group === n.group && pa.s === pb.s) cost -= Math.abs(pb.f - pa.f) * .3
    return cost
  }
  // Viterbi
  const N = notes.length
  if (!N) return { events: [], cost: 0 }
  const best: number[][] = [], from: number[][] = []
  for (let i = 0; i < N; i++) {
    if (!cands[i].length) cands[i] = [{ notes: [], cost: 3 }]
    best.push(cands[i].map(c => own(i, c)))
    from.push(cands[i].map(() => -1))
    if (i === 0) continue
    cands[i].forEach((c, k) => {
      let bv = Infinity, bj = 0
      cands[i - 1].forEach((pc, j) => {
        if (!pc.notes.length || !c.notes.length) { const v = best[i - 1][j]; if (v < bv) { bv = v; bj = j } return }
        const v = best[i - 1][j] + step(i, pc, c)
        if (v < bv) { bv = v; bj = j }
      })
      best[i][k] += bv
      from[i][k] = bj
    })
  }
  let k = best[N - 1].reduce((bi, v, j, arr) => (v < arr[bi] ? j : bi), 0)
  const total = best[N - 1][k]
  const chosen: Cand[] = Array(N)
  for (let i = N - 1; i >= 0; i--) { chosen[i] = cands[i][k]; k = from[i][k] }
  return { events: techniques(notes, chosen, st, r, eff), cost: total / N }
}

/** Techniques on the placed notes, and the events with rests between them. */
function techniques(notes: LNote[], chosen: Cand[], st: StyleDef, r: Rng, tuning: number[]): LickEvent[] {
  const ev: LickEvent[] = []
  const tech: (string | undefined)[][] = chosen.map(c => c.notes.map(() => c.tech))
  const frets = chosen.map(c => c.notes.map(p => ({ ...p })))
  const top = tuning.length - 1
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i], c = frets[i]
    if (!c.length || tech[i][0]) continue
    const p = c[c.length - 1]
    const prev = i > 0 ? frets[i - 1][frets[i - 1].length - 1] : undefined
    const prevTech = i > 0 ? tech[i - 1][0] : 'x'
    const single = c.length === 1 && (i === 0 || frets[i - 1].length === 1)
    // bends: play the note a step (or half step, a "curl") lower and bend up into it, on the top three strings
    if ((n.want === 'bend' || n.want === 'curl') && single && p.s >= top - 2 && p.f >= (n.want === 'curl' ? 2 : 4)) {
      const by = n.want === 'curl' ? 1 : 2
      p.f -= by
      tech[i] = [by === 2 ? 'b' : 'b½']
      if (n.dur >= 1.5 && (st.tech.vibrato ?? 0) > .3) tech[i] = [tech[i][0] + '~']
      continue
    }
    if (prev && single && prev.s === p.s && prevTech !== 'x' && notes[i].at - (notes[i - 1].at + notes[i - 1].dur) < .05) {
      const d = p.f - prev.f
      const fast = notes[i - 1].dur <= .5
      if (n.want !== 'tap' && prevTech !== 'T' && n.group === undefined && d !== 0 && Math.abs(d) <= 4 && fast && r() < (st.tech.legato ?? 0)) { tech[i] = [d > 0 ? 'h' : 'p']; continue }
      if (Math.abs(d) >= 2 && Math.abs(d) <= 7 && p.f > 0 && prev.f > 0 && r() < (st.tech.slide ?? 0)) { tech[i] = [d > 0 ? '/' : '\\']; continue }
      // taps, and the pull-off that always follows a tap on the same string
      if (n.want === 'tap' && d > 0) { tech[i] = ['T']; continue }
      if (prevTech === 'T' && d < 0) { tech[i] = ['p']; continue }
      if (n.group !== undefined && notes[i - 1].group === n.group && d !== 0) { tech[i] = [d > 0 ? 'h' : 'p']; continue }
    }
    if (n.want === 'pm') { tech[i] = c.map(() => 'PM'); continue }
    if (n.want === 'vib' || (n.dur >= 1.5 && r() < (st.tech.vibrato ?? 0) * .7)) tech[i] = c.map(() => '~')
  }
  // events: rests fill the gaps
  let t = 0
  notes.forEach((n, i) => {
    if (n.at > t + 1e-6) ev.push({ notes: [], dur: Math.round((n.at - t) * 1e4) / 1e4 })
    const ns: LickNote[] = frets[i].map((p, j) => ({ string: p.s, fret: p.f, ...(tech[i][j] ? { tech: tech[i][j] } : {}) }))
    ev.push({ notes: ns, dur: n.dur })
    t = n.at + n.dur
  })
  return ev
}
