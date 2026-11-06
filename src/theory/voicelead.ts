// Voice leading on the neck: chord shapes chosen for a whole progression so the hand barely moves. Notes the two
// chords share are held (anchors), and the others move the shortest way, mostly the 3rds and 7ths (the guide
// tones) sliding a fret or two into the next chord. A Viterbi search over compact voicings (triads on three
// strings, or shells/full four-note shapes for 7th chords) inside one zone of the neck.
import type { ChordInfo } from '../tabs/harmony'

export interface Voice { s: number; f: number; midi: number; label: string }
export interface Voicing { notes: Voice[]; lo: number; hi: number }
export interface Step {
  voicing: Voicing
  /** what happens going into the next chord */
  hold: Voice[]
  moves: { from: Voice; to: Voice; guide: boolean }[]
}

const IV = ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7']
const lab = (c: ChordInfo, midi: number) => c.labels.get(midi % 12) ?? IV[((midi % 12) - c.root + 12) % 12]

/** Every compact voicing of a chord on adjacent strings inside a fret zone. */
export function voicings(c: ChordInfo, tuning: number[], zone: [number, number], size: 3 | 4): Voicing[] {
  const need = new Set<number>([c.root, ...(c.third !== null ? [c.third] : []), ...(c.seventh !== null ? [c.seventh] : [])])
  const tones = c.pcs
  const out: Voicing[] = []
  for (let lo = 0; lo + size <= tuning.length; lo++) {
    const strs = Array.from({ length: size }, (_, i) => lo + i)
    const opts = strs.map(s => { const fs: number[] = []; for (let f = zone[0]; f <= zone[1]; f++) if (tones.includes((tuning[s] + f) % 12)) fs.push(f); return fs })
    const pick: number[] = []
    const walk = (j: number) => {
      if (j === size) {
        const fretted = pick.filter(f => f > 0)
        const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0
        if (span > 3) return
        const pcs = new Set(pick.map((f, i) => (tuning[strs[i]] + f) % 12))
        for (const n of need) if (!pcs.has(n)) return
        // a triad needs its three different notes; a four-note shape may double one
        if (size === 3 && pcs.size < 3) return
        const notes = pick.map((f, i) => ({ s: strs[i], f, midi: tuning[strs[i]] + f, label: lab(c, tuning[strs[i]] + f) }))
        out.push({ notes, lo: Math.min(...pick), hi: Math.max(...pick) })
        return
      }
      for (const f of opts[j]) { pick.push(f); walk(j + 1); pick.pop() }
    }
    walk(0)
  }
  return out
}

/** How far the fingers travel from one voicing to the next. */
function travel(a: Voicing, b: Voicing): number {
  let c = 0
  for (const nb of b.notes) {
    const same = a.notes.find(x => x.s === nb.s)
    if (same) c += Math.abs(same.f - nb.f) === 0 ? 0 : 0.6 + Math.abs(same.f - nb.f) * 0.5
    else c += 1.5 // a string the last chord didn't use
  }
  // the hand as a whole
  c += Math.abs((a.lo + a.hi) / 2 - (b.lo + b.hi) / 2) * 0.35
  return c
}

/** Voicings for the whole progression with the least movement, plus what each change holds and moves. */
export function voiceLead(chords: ChordInfo[], tuning: number[], zone: [number, number], size: 3 | 4 = 3): Step[] {
  const cands = chords.map(c => {
    const v = voicings(c, tuning, zone, size)
    return v.length ? v : voicings(c, tuning, [Math.max(0, zone[0] - 3), zone[1] + 3], size)
  })
  if (cands.some(v => !v.length)) return []
  // Viterbi
  let cost = cands[0].map(v => (v.lo + v.hi) * 0.01)
  const back: number[][] = []
  for (let i = 1; i < chords.length; i++) {
    const from: number[] = []
    cost = cands[i].map(b => {
      let bv = Infinity, bj = 0
      cands[i - 1].forEach((a, j) => { const v = cost[j] + travel(a, b); if (v < bv) { bv = v; bj = j } })
      from.push(bj)
      return bv
    })
    back.push(from)
  }
  let at = cost.indexOf(Math.min(...cost))
  const pick: Voicing[] = new Array(chords.length)
  for (let i = chords.length - 1; i >= 0; i--) { pick[i] = cands[i][at]; if (i > 0) at = back[i - 1][at] }
  return pick.map((v, i) => {
    const next = pick[(i + 1) % pick.length]
    const c = chords[i], nc = chords[(i + 1) % chords.length]
    const hold = v.notes.filter(n => next.notes.some(m => m.s === n.s && m.f === n.f))
    const moves = v.notes.flatMap(n => {
      const m = next.notes.find(x => x.s === n.s)
      if (!m || (m.f === n.f)) return []
      const guide = ['3', 'b3', '7', 'b7'].includes(n.label) || ['3', 'b3', '7', 'b7'].includes(lab(nc, m.midi))
      return [{ from: n, to: { ...m, label: lab(nc, m.midi) }, guide }]
    })
    void c
    return { voicing: v, hold, moves }
  })
}

/** "Hold G; B (3rd) down a half step to Bb (b7)…": the change in words. */
export function describeChange(st: Step, name: (midi: number) => string): string {
  const parts: string[] = []
  if (st.hold.length) parts.push(`Hold ${st.hold.map(h => name(h.midi)).join(' and ')}`)
  for (const m of st.moves) {
    const d = m.to.f - m.from.f
    const how = Math.abs(d) === 1 ? 'a half step' : Math.abs(d) === 2 ? 'a whole step' : `${Math.abs(d)} frets`
    parts.push(`${name(m.from.midi)} (${m.from.label}) ${d > 0 ? 'up' : 'down'} ${how} to ${name(m.to.midi)} (${m.to.label})`)
  }
  return parts.join('; ')
}
