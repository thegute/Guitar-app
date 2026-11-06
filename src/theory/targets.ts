// Play the Changes: while a progression plays, the neck shows the current chord's tones in gold (root, 3rd, 5th,
// 7th, 9th: the notes that make a solo follow the chords), the rest of the scale faintly, and two beats before the
// chord changes, the next chord's 3rd and root light up cyan with an arrow from the nearest gold note, so your line
// lands on the change instead of running up and down the scale.
import type { ChordInfo } from '../tabs/harmony'
import type { Mark } from '../components/Fretboard'

export interface TargetView {
  markFor: (midi: number, s: number, f: number) => Mark | null
  arrows: { s1: number; f1: number; s2: number; f2: number; kind: 'look' }[]
  lookAhead: boolean
}

const IV = ['R', 'b2', '9', 'b3', '3', '11', 'b5', '5', 'b6', '6', 'b7', '7']

export function targetView(o: {
  cur: ChordInfo; next: ChordInfo | null; scalePcs: number[]; beatsLeft: number; tuning: number[]; window?: [number, number]
}): TargetView {
  const { cur, next, scalePcs, tuning } = o
  const win = o.window ?? [0, 15]
  // gold: chord tones plus the 9th when the scale has it (it sounds good over almost anything)
  const nine = (cur.root + 2) % 12
  const gold = new Set([...cur.pcs, ...(scalePcs.includes(nine) ? [nine] : [])])
  const lookAhead = !!next && o.beatsLeft <= 2 && next.name !== cur.name
  const look = new Map<number, string>()
  if (lookAhead && next) {
    if (next.third !== null) look.set(next.third, next.labels.get(next.third) ?? '3')
    look.set(next.root, 'R')
  }
  const markFor = (midi: number, _s: number, f: number): Mark | null => {
    if (f < win[0] || f > win[1]) return null
    const q = midi % 12
    if (look.has(q)) return { label: look.get(q)!, role: 'look' }
    if (gold.has(q)) return { label: cur.labels.get(q) ?? IV[(q - cur.root + 12) % 12], role: q === cur.root ? 'root' : 'chord' }
    if (scalePcs.includes(q)) return { label: IV[(q - cur.root + 12) % 12], role: 'ghost' }
    return null
  }
  // arrows: from gold notes to the nearest cyan target (one per string set, short moves only)
  const arrows: TargetView['arrows'] = []
  if (lookAhead && next && next.third !== null) {
    const targets: { s: number; f: number }[] = []
    tuning.forEach((t, s) => { for (let f = win[0]; f <= win[1]; f++) if ((t + f) % 12 === next.third) targets.push({ s, f }) })
    for (const tg of targets) {
      let best: { s: number; f: number; d: number } | null = null
      for (let s = Math.max(0, tg.s - 1); s <= Math.min(tuning.length - 1, tg.s + 1); s++) {
        for (let f = Math.max(win[0], tg.f - 3); f <= Math.min(win[1], tg.f + 3); f++) {
          const q = (tuning[s] + f) % 12
          if (!cur.pcs.includes(q) || look.has(q)) continue
          const d = Math.abs(tuning[s] + f - (tuning[tg.s] + tg.f))
          if (d === 0 || d > 2) continue // a half or whole step into the target
          if (!best || d < best.d) best = { s, f, d }
        }
      }
      if (best) arrows.push({ s1: best.s, f1: best.f, s2: tg.s, f2: tg.f, kind: 'look' })
    }
  }
  return { markFor, arrows, lookAhead }
}
