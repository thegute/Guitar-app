// The hand brain: one engine that decides where the fretting hand sits and which finger plays each note, for every
// tab in the app (songs, Guitar Pro files, scans, generated licks, exercises).
//
// It plans the hand, not single notes: a Viterbi search over hand positions ("anchor" = the fret under the index
// finger) across the whole piece, so it looks ahead. Inside a position it is one finger per fret, with real
// stretches measured in millimetres for your hand size (frets are wide low down, narrow up high), barres when one
// finger holds a fret across strings, and technique rules (bends on the ring finger with the middle helping,
// vibrato on a strong finger, hammer-ons and pull-offs inside one position, slides moving the hand with the same
// finger). Shifts cost less where there is time: in a rest, on a long note, on open strings, or in a slide.
//
// Two ways in:
//   planFingers(steps)      the frets are given (a Guitar Pro file, a scan, your own tab): only fingers and hand
//                           positions are chosen; the tab is never changed.
//   placeAndFinger(steps)   only the pitches are given (melodies, transcriptions, "Make it easier"): strings,
//                           frets and fingers are chosen together.
import { REACH, spotMM, type HandSize } from './neck'

export interface HNote { string: number; fret: number; tech?: string }
export interface HStep { notes: HNote[]; dur: number }
export interface StepHand {
  /** fret under the index finger (1 = first position) */
  anchor: number
  /** per note of the step: 1–4, 0 open string, -1 no fretting finger (tap, muted) */
  fingers: number[]
  /** a finger laid across strings */
  barre?: { finger: number; fret: number; strings: number[] }
}
export interface HandPlan {
  /** null where nothing is fretted (rests, open strings only): the hand is free to move */
  steps: (StepHand | null)[]
  cost: number
}
export interface HandOpts {
  /** scale length, mm (neck.ts scaleFor) */
  scale: number
  size?: HandSize
  /** fingers you chose yourself: step index → string → finger */
  fixed?: Map<number, Map<number, number>>
  /** highest anchor tried (default 19) */
  maxAnchor?: number
}

const NO_FINGER = new Set(['x', 'T', 'tap'])
const BEND = /^(b|b½|pb|bend)/
const isBend = (t?: string) => !!t && BEND.test(t)
const isSlide = (t?: string) => t === '/' || t === '\\' || t === 's'
const isLegato = (t?: string) => t === 'h' || t === 'p'

interface Assign { cost: number; fingers: number[]; barre?: StepHand['barre'] }
const INF = 1e9

/** The best fingers for one step with the index finger at `a`. */
function assign(notes: HNote[], a: number, L: number, reach: number, fixed?: Map<number, number>): Assign {
  const fingers: number[] = notes.map(n => (n.fret === 0 ? 0 : NO_FINGER.has(n.tech ?? '') ? -1 : 1))
  const pos = notes.map((n, i) => ({ n, i })).filter(p => fingers[p.i] > 0)
  if (!pos.length) return { cost: 0, fingers }
  // every fretted note must be inside the hand (one fret of stretch either way)
  for (const p of pos) if (p.n.fret < a - 1 || p.n.fret > a + 4) return { cost: INF, fingers }
  // unique spots (a doubled note on one string counts once)
  const spots: { s: number; f: number; tech?: string; idx: number[] }[] = []
  for (const p of pos) {
    const hit = spots.find(x => x.s === p.n.string && x.f === p.n.fret)
    if (hit) hit.idx.push(p.i)
    else spots.push({ s: p.n.string, f: p.n.fret, tech: p.n.tech, idx: [p.i] })
  }
  spots.sort((x, y) => x.f - y.f || x.s - y.s)
  const k = spots.length
  let best: Assign = { cost: INF, fingers }
  const pick = new Array<number>(k)
  const search = (j: number) => {
    if (j === k) {
      const c = score(pick)
      if (c < best.cost) {
        const fs = fingers.slice()
        spots.forEach((sp, q) => sp.idx.forEach(i => { fs[i] = pick[q] }))
        best = { cost: c, fingers: fs, barre: barreOf(pick) }
      }
      return
    }
    const sp = spots[j]
    const want = fixed?.get(sp.s)
    for (let f = 1; f <= 4; f++) {
      if (want && f !== want) continue
      // fingers rise with the frets; one finger can only hold one fret
      let ok = true
      for (let q = 0; q < j && ok; q++) {
        if (spots[q].f < sp.f && pick[q] >= f) ok = false
        if (pick[q] === f && spots[q].f !== sp.f) ok = false
      }
      if (!ok) continue
      pick[j] = f
      search(j + 1)
    }
  }
  const barreOf = (p: number[]): StepHand['barre'] => {
    for (let f = 1; f <= 4; f++) {
      const on = spots.filter((_, q) => p[q] === f)
      if (on.length > 1) return { finger: f, fret: on[0].f, strings: on.map(x => x.s).sort((x, y) => x - y) }
    }
    return undefined
  }
  const score = (p: number[]): number => {
    let c = 0
    // one finger per fret: each fret's nearest finger should sit on it; more fingers on the same fret are normal in chords
    const byFret = new Map<number, number[]>()
    spots.forEach((sp, q) => { (byFret.get(sp.f) ?? byFret.set(sp.f, []).get(sp.f)!).push(p[q]) })
    for (const [f, fs] of byFret) {
      const home = f - a + 1
      const uniq = [...new Set(fs)]
      c += Math.min(...uniq.map(x => Math.abs(x - Math.max(1, Math.min(4, home))))) * 0.6 + (uniq.length - 1) * 0.15
      // reaching out of the box: how far past a comfortable spread for this hand, here on the neck
      if (home < 1) c += 0.5 + 0.04 * Math.max(0, Math.abs(spotMM(a + 3, L) - spotMM(f, L)) - reach)
      if (home > 4) c += 0.5 + 0.04 * Math.max(0, Math.abs(spotMM(f, L) - spotMM(a, L)) - reach)
    }
    // a chord whose lowest note isn't under the index leaves the index idle in front of the hand
    if (k > 1 && a > 1 && !p.includes(1)) c += 0.12
    spots.forEach((sp, q) => {
      if (p[q] === 4) c += 0.12 // the pinky only when it helps
      // techniques
      if (isBend(sp.tech)) c += [0, 1, 0.3, 0, 0.6][p[q]]
      if (sp.tech === '~') c += p[q] === 4 ? 0.3 : 0
    })
    // stretches between fingers, in millimetres (once per pair of fingers)
    const fretOf = new Map<number, number>()
    spots.forEach((sp, q) => fretOf.set(p[q], sp.f))
    const used = [...fretOf.keys()].sort((x, y) => x - y)
    for (let x = 0; x < used.length; x++) for (let y = x + 1; y < used.length; y++) {
      const span = Math.abs(spotMM(fretOf.get(used[y])!, L) - spotMM(fretOf.get(used[x])!, L))
      const comfy = (reach * (used[y] - used[x])) / 3 + 6
      if (span > comfy) c += (span - comfy) * 0.07
      if (span > comfy + 26) c += 6
    }
    // same fret on two strings with different fingers: lower string, lower finger
    for (let x = 0; x < k; x++) for (let y = x + 1; y < k; y++) {
      if (spots[x].f === spots[y].f && p[x] !== p[y] && (spots[x].s < spots[y].s) !== (p[x] < p[y])) c += 0.25
    }
    // barres: a finger laid across strings. Nothing in between may be lower than the barre; a full index barre is
    // normal, short barres and other fingers less so
    for (let f = 1; f <= 4; f++) {
      const on = spots.filter((_, q) => p[q] === f)
      if (on.length < 2) continue
      const lo = Math.min(...on.map(x => x.s)), hi = Math.max(...on.map(x => x.s)), fr = on[0].f
      if (spots.some((x, q) => p[q] !== f && x.s > lo && x.s < hi && x.f < fr)) return INF
      if (openIn(lo, hi)) return INF // an open string under the barre would be stopped
      const n = hi - lo + 1
      c += f === 1 ? (n >= 5 ? 0.3 : 0.25 + 0.35 * (n - 1)) : f === 3 ? 0.4 + 0.15 * (n - 1) : 0.85 + 0.2 * (n - 1)
    }
    return c
  }
  const openIn = (lo: number, hi: number) => notes.some(n => n.fret === 0 && n.string > lo && n.string < hi)
  search(0)
  if (best.cost >= INF) {
    // nothing fits (a very wide chord): home fingers anyway, at a high price
    const fs = fingers.slice()
    spots.forEach(sp => sp.idx.forEach(i => { fs[i] = Math.max(1, Math.min(4, sp.f - a + 1)) }))
    return { cost: 8 + (spots[k - 1].f - spots[0].f), fingers: fs }
  }
  return best
}

/** How hard it is to move the hand from anchor a to b just before step i. */
function moveCost(a: number, b: number, steps: HStep[], i: number, L: number): number {
  if (a === b) return 0
  const d = Math.abs(spotMM(Math.max(1, b), L) - spotMM(Math.max(1, a), L))
  let c = 1.2 + d * 0.006
  const prev = steps[i - 1], cur = steps[i]
  const one = (s?: HStep) => (s && s.notes.length === 1 ? s.notes[0] : undefined)
  const pn = one(prev), cn = one(cur)
  // a slide carries the hand, best with the same finger all the way
  if (cn && pn && cn.string === pn.string && isSlide(cn.tech)) return pn.fret - a === cn.fret - b ? 0.3 + d * 0.004 : c
  if (cn && pn && cn.string === pn.string && isLegato(cn.tech)) c *= 2.5 // hammer-ons stay in one position
  if (prev && prev.dur >= 1) c *= 0.6 // a long note gives time
  else if (prev && prev.dur <= 0.25) c *= 1.3 // fast notes don't
  return c
}

const fretted = (s: HStep) => s.notes.some(n => n.fret > 0 && !NO_FINGER.has(n.tech ?? ''))

/** Fingers and hand positions for a tab whose frets are fixed. */
export function planFingers(steps: HStep[], o: HandOpts): HandPlan {
  const L = o.scale, reach = REACH[o.size ?? 'medium']
  const maxA = o.maxAnchor ?? 19
  const A = Array.from({ length: maxA }, (_, i) => i + 1)
  const cache = new Map<string, Assign>()
  const own = (i: number, a: number): Assign => {
    const st = steps[i]
    const key = `${a}|${st.notes.map(n => `${n.string}.${n.fret}.${n.tech ?? ''}`).join(',')}|${o.fixed?.has(i) ? i : ''}`
    let v = cache.get(key)
    if (!v) { v = assign(st.notes, a, L, reach, o.fixed?.get(i)); cache.set(key, v) }
    return v
  }
  const N = steps.length
  if (!N) return { steps: [], cost: 0 }
  // Viterbi; steps with nothing fretted keep whatever position the hand is in, and moving across them is cheap
  let cost = A.map(a => (fretted(steps[0]) ? own(0, a).cost : 0) + a * 0.004)
  const back: Int16Array[] = []
  let lastFretted = fretted(steps[0]) ? 0 : -1
  for (let i = 1; i < N; i++) {
    const fr = fretted(steps[i])
    const from = new Int16Array(A.length)
    const next = A.map((b, bi) => {
      const oc = fr ? own(i, b).cost : 0
      if (oc >= INF) { from[bi] = bi; return INF }
      let bv = INF, bj = bi
      for (let aj = 0; aj < A.length; aj++) {
        if (cost[aj] >= INF) continue
        // across a gap of open strings or rests the move is cheaper
        const gap = fr && lastFretted >= 0 && lastFretted < i - 1
        let m = fr ? moveCost(A[aj], b, steps, i, L) : (aj === bi ? 0 : INF)
        if (gap && m < INF) m *= 0.3
        const v = cost[aj] + m
        if (v < bv) { bv = v; bj = aj }
      }
      from[bi] = bj
      return bv + oc + b * 0.004
    })
    // a step nothing can reach (outside the neck): let it through anywhere
    if (next.every(v => v >= INF)) { back.push(Int16Array.from(A.map((_, bi) => bi))); cost = cost.map(v => v + 5); continue }
    back.push(from)
    cost = next
    if (fr) lastFretted = i
  }
  let at = cost.reduce((b, v, j, arr) => (v < arr[b] ? j : b), 0)
  const total = cost[at]
  const anchors = new Array<number>(N)
  for (let i = N - 1; i >= 0; i--) { anchors[i] = A[at]; if (i > 0) at = back[i - 1][at] }
  return {
    cost: total,
    steps: steps.map((st, i) => {
      if (!fretted(st)) return null
      const v = own(i, anchors[i])
      return { anchor: anchors[i], fingers: v.fingers, ...(v.barre ? { barre: v.barre } : {}) }
    }),
  }
}

// ───────────────────────── placing pitches ─────────────────────────
export interface PStep {
  midis: number[]
  dur: number
  techs?: (string | undefined)[]
}
export interface PlaceOpts extends HandOpts {
  /** open strings, lowest first (MIDI, capo included) */
  tuning: number[]
  maxFret?: number
  minFret?: number
  /** 0 avoid open strings … 1 love them (default .5) */
  open?: number
  /** 0 … 1: prefer thicker strings higher up the neck for a warmer sound (default .3) */
  warm?: number
  /** frets the style lives in */
  zone?: [number, number]
  /** 1 beginner (stays low) … 4 anything */
  level?: number
  /** a small pull towards the nut (folk melodies, default 0) */
  low?: number
}
export interface Placement { notes: HNote[][]; plan: HandPlan }

/** Strings, frets and fingers chosen together for a line or chords given as pitches. */
export function placeAndFinger(steps: PStep[], o: PlaceOpts): Placement {
  const L = o.scale, reach = REACH[o.size ?? 'medium']
  const maxFret = o.maxFret ?? (o.tuning.length === 4 ? 15 : 20)
  const minFret = o.minFret ?? 0
  const maxA = Math.max(1, Math.min(o.maxAnchor ?? 19, maxFret - 2))
  const A = Array.from({ length: maxA }, (_, i) => i + 1)
  const open = o.open ?? 0.5, warm = o.warm ?? 0.3, level = o.level ?? 3, low = o.low ?? 0
  const where = (m: number) => o.tuning.map((t, s) => ({ s, f: m - t })).filter(x => x.f >= minFret && x.f <= maxFret)
  /** the best way to play step i with the index at a */
  const cache = new Map<string, { cost: number; notes: HNote[] }>()
  const best = (i: number, a: number, anywhere: boolean): { cost: number; notes: HNote[] } => {
    const st = steps[i]
    const key = `${i}|${a}|${anywhere ? 1 : 0}`
    const hit = cache.get(key)
    if (hit) return hit
    const opts = st.midis.map(m => where(m).filter(x => anywhere || x.f === 0 || (x.f >= a - 1 && x.f <= a + 4)))
    let res = { cost: INF, notes: [] as HNote[] }
    const cur: { s: number; f: number }[] = []
    const used = new Set<number>()
    const walk = (j: number) => {
      if (j === opts.length) {
        const notes = cur.map((x, q) => ({ string: x.s, fret: x.f, ...(st.techs?.[q] ? { tech: st.techs[q] } : {}) }))
        let c = anywhere ? 6 : assign(notes, a, L, reach).cost
        if (c >= INF) return
        for (const x of cur) {
          if (x.f === 0) c += (0.5 - open) * 1.2
          c += warm * 0.08 * x.s // thicker strings sound warmer
          c += low * x.f
        }
        if (c < res.cost) res = { cost: c, notes }
        return
      }
      for (const x of opts[j]) {
        if (used.has(x.s)) continue
        used.add(x.s); cur.push(x)
        walk(j + 1)
        cur.pop(); used.delete(x.s)
      }
    }
    walk(0)
    cache.set(key, res)
    return res
  }
  const posCost = (a: number) => {
    let c = a * 0.004
    if (o.zone) { if (a < o.zone[0]) c += 0.5 * (o.zone[0] - a); if (a + 3 > o.zone[1]) c += 0.5 * (a + 3 - o.zone[1]) }
    if (level <= 1 && a > 4) c += 0.25 * (a - 4)
    else if (level === 2 && a > 7) c += 0.1 * (a - 7)
    return c
  }
  const N = steps.length
  if (!N) return { notes: [], plan: { steps: [], cost: 0 } }
  const rest = (i: number) => !steps[i].midis.length
  const anywhereAt = new Set<number>()
  let first = A.map(a => (rest(0) ? 0 : best(0, a, false).cost))
  if (!rest(0) && first.every(v => v >= INF)) { anywhereAt.add(0); first = A.map(a => best(0, a, true).cost) }
  let cost = A.map((a, j) => first[j] + posCost(a))
  const back: Int16Array[] = []
  for (let i = 1; i < N; i++) {
    const from = new Int16Array(A.length)
    let own = A.map(b => (rest(i) ? 0 : best(i, b, false).cost))
    if (!rest(i) && own.every(v => v >= INF)) { anywhereAt.add(i); own = A.map(b => best(i, b, true).cost) }
    const fake: HStep[] = [{ notes: [], dur: steps[i - 1].dur }, { notes: [], dur: steps[i].dur }]
    cost = A.map((b, bi) => {
      if (own[bi] >= INF) { from[bi] = bi; return INF }
      let bv = INF, bj = bi
      for (let aj = 0; aj < A.length; aj++) {
        if (cost[aj] >= INF) continue
        const m = rest(i) || rest(i - 1) ? (aj === bi ? 0 : 0.3 + 0.004 * Math.abs(A[aj] - b)) : moveCost(A[aj], b, fake, 1, L)
        const v = cost[aj] + m
        if (v < bv) { bv = v; bj = aj }
      }
      from[bi] = bj
      return bv + own[bi] + posCost(b)
    })
    back.push(from)
  }
  let at = cost.reduce((b, v, j, arr) => (v < arr[b] ? j : b), 0)
  const anchors = new Array<number>(N)
  for (let i = N - 1; i >= 0; i--) { anchors[i] = A[at]; if (i > 0) at = back[i - 1][at] }
  const notes = steps.map((_, i) => (rest(i) ? [] : best(i, anchors[i], anywhereAt.has(i) || best(i, anchors[i], false).cost >= INF).notes))
  const plan = planFingers(notes.map((ns, i) => ({ notes: ns, dur: steps[i].dur })), { ...o, maxAnchor: maxA })
  return { notes, plan }
}
