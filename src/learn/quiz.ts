// Quiz courses: fretboard notes, chords, triads, the circle of fifths and CAGED.
// Every question can be answered by tapping; most can also be answered by playing it (mic mode).
import { chordShapes, stringName, type Instrument } from '../instrument'
import type { Voicing } from '../theory/chords'
import type { MarkRole } from '../components/Fretboard'
import { FLATS, SHARPS, pc } from '../theory/notes'
import { CIRCLE_MAJOR, CIRCLE_MINOR, circleIndex, keySignature } from '../components/CircleOfFifths'
import { cagedShapes } from './caged'

export type Answer =
  | { pc: number }
  | { choice: string }
  | { pos: { s: number; f: number } }
  | { pcs: number[] }
  | { positions: { s: number; f: number }[] }

export type Input =
  | { type: 'notes'; naturalsOnly?: boolean }
  | { type: 'choices'; options: { id: string; label: string }[] }
  | { type: 'diagrams'; options: { id: string; voicing: Voicing }[] }
  | { type: 'neck'; count: number; strings?: number[] }
  | { type: 'spell'; count: number }

export interface Mark { s: number; f: number; label: string; role: MarkRole }

export interface Question {
  item: string
  prompt: string
  sub?: string
  neck?: { from: number; to: number; marks: Mark[] }
  diagram?: Voicing
  /** sounds that play when the question appears (ear questions) */
  audio?: { seq?: number[]; chord?: number[] }
  input: Input
  check: (a: Answer) => boolean
  /** what to play in mic mode, or undefined if the question can't be played */
  mic?: { kind: 'note'; ok: (midi: number) => boolean; want: string } | { kind: 'chord'; tones: number[]; want: string }
  /** shown after answering */
  explain: string
  reveal?: Mark[]
}

export interface QuizDef {
  id: string
  unit: string
  title: string
  desc: string
  length: number
  /** questions can be answered by playing */
  mic: boolean
  /** needs sound (headphones when away) */
  ear?: boolean
  guitarOnly?: boolean
  items: (inst: Instrument) => string[]
  make: (item: string, inst: Instrument, rnd: () => number) => Question
}

const NAT = [0, 2, 4, 5, 7, 9, 11]
const nameOf = (p: number, flats = false) => (flats ? FLATS : SHARPS)[((p % 12) + 12) % 12]
const both = (p: number) => (SHARPS[p] === FLATS[p] ? SHARPS[p] : `${SHARPS[p]}/${FLATS[p]}`)
const pick = <T,>(a: T[], rnd: () => number) => a[Math.floor(rnd() * a.length)]
function shuffle<T>(a: T[], rnd: () => number) {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] }
  return b
}

/** Strings in the order worth learning them: lowest strings first (they hold the roots of barre chords). */
export function learningOrder(inst: Instrument): number[] {
  if (inst.id === 'tenor') return [1, 2, 3, 0]
  return inst.midis.map((m, s) => ({ m, s })).sort((a, b) => a.m - b.m).map(x => x.s).filter((s, i, arr) => {
    // the high e repeats the low E: skip it
    return !(inst.id === 'guitar' && i === arr.length - 1 && inst.midis[s] % 12 === inst.midis[arr[0]] % 12)
  })
}

// ---------- fretboard ----------
function fretItems(inst: Instrument, strings: number[], naturals: boolean) {
  const out: string[] = []
  for (const s of strings) for (let f = 0; f <= 12; f++) if (!naturals || NAT.includes((inst.midis[s] + f) % 12)) out.push(`fb:${inst.id}:${s}:${f}`)
  return out
}
function fretQuestion(item: string, inst: Instrument, rnd: () => number, naturalsOnly: boolean): Question {
  const [, , ss, ff] = item.split(':')
  const s = +ss, f = +ff
  const midi = inst.midis[s] + f
  const p = midi % 12
  const sName = stringName(inst.midis, s)
  const where = f === 0 ? `the open ${sName} string` : `fret ${f} on the ${sName} string`
  const reveal: Mark[] = [{ s, f, label: SHARPS[p] === FLATS[p] ? SHARPS[p] : SHARPS[p], role: 'root' }]
  if (f + 12 <= 15) reveal.push({ s, f: f + 12, label: SHARPS[p], role: 'chord' })
  const micOk = (m: number) => m % 12 === p
  if (rnd() < 0.5) {
    return {
      item, prompt: 'Which note is this?', sub: where,
      neck: { from: 0, to: 13, marks: [{ s, f, label: '?', role: 'target' }] },
      input: { type: 'notes', naturalsOnly },
      check: a => 'pc' in a && a.pc === p,
      mic: { kind: 'note', ok: micOk, want: `the note at ${where}` },
      explain: `${where[0].toUpperCase() + where.slice(1)} is ${both(p)}.${f > 0 && f !== 12 ? ` Count up from the open ${nameOf(inst.midis[s])}: ${countUp(inst.midis[s], f)}.` : f === 12 ? ' Fret 12 is the open string an octave up.' : ''}`,
      reveal,
    }
  }
  return {
    item, prompt: `Find ${both(p)} on the ${sName} string`, sub: 'Frets 0–12',
    neck: { from: 0, to: 13, marks: [] },
    input: { type: 'neck', count: 1, strings: [s] },
    check: a => 'pos' in a && a.pos.s === s && (inst.midis[s] + a.pos.f) % 12 === p,
    mic: { kind: 'note', ok: m => micOk(m) && m >= inst.midis[s] && m <= inst.midis[s] + 15, want: `${both(p)} on the ${sName} string` },
    explain: `${both(p)} is at ${where}${f + 12 <= 15 ? ` (and fret ${f + 12})` : ''}.`,
    reveal,
  }
}
function countUp(open: number, f: number) {
  const out: string[] = []
  for (let k = 0; k <= Math.min(f, 12); k++) {
    const p = (open + k) % 12
    if (NAT.includes(p) || k === f) out.push(`${SHARPS[p]}${k === 0 ? '' : ` (${k})`}`)
  }
  return out.join(' → ')
}

// ---------- chords ----------
const OPEN_CHORDS: Record<string, string[]> = {
  guitar: ['C', 'A', 'G', 'E', 'D', 'Am', 'Em', 'Dm', 'A7', 'D7', 'E7', 'G7', 'C7', 'B7', 'Cmaj7', 'Fmaj7', 'Am7', 'Em7', 'Dm7', 'F'],
  tenor: ['C', 'F', 'G', 'Am', 'Dm', 'Em', 'A', 'D', 'G7', 'C7', 'E7', 'A7', 'Bb', 'E', 'D7', 'Fmaj7', 'Am7', 'Cmaj7', 'Em7', 'Gm'],
  baritone: ['G', 'C', 'D', 'Em', 'Am', 'E', 'A', 'D7', 'G7', 'Bm', 'E7', 'A7', 'Cmaj7', 'Am7', 'Em7', 'F', 'B7', 'Dm'],
}
const SUFFIX: Record<string, string> = { '': 'major', m: 'minor', '7': '7', maj7: 'maj7', m7: 'm7' }
function parseName(n: string) {
  const m = /^([A-G][#b]?)(.*)$/.exec(n)!
  return { root: m[1], suffix: SUFFIX[m[2]] ?? m[2], type: m[2] }
}
const TYPE_IVS: Record<string, number[]> = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], dim: [0, 3, 6], aug: [0, 4, 8] }
const tonesOf = (name: string) => { const { root, type } = parseName(name); return (TYPE_IVS[type] ?? [0, 4, 7]).map(i => (pc(root) + i) % 12) }
function openShape(name: string, inst: Instrument): Voicing | undefined {
  const { root, suffix } = parseName(name)
  const list = chordShapes(root, suffix, inst)
  return list.find(v => v.baseFret <= 1) ?? list[0]
}
function distractors(name: string, pool: string[], rnd: () => number, n = 3) {
  const { root, type } = parseName(name)
  const close = pool.filter(x => x !== name && (parseName(x).root === root || parseName(x).type === type))
  return shuffle([...new Set([...shuffle(close, rnd), ...shuffle(pool.filter(x => x !== name), rnd)])], rnd).slice(0, n)
}

// ---------- triads ----------
const TRIAD = { maj: { ivs: [0, 4, 7], name: 'major', sym: '' }, min: { ivs: [0, 3, 7], name: 'minor', sym: 'm' }, dim: { ivs: [0, 3, 6], name: 'diminished', sym: '°' }, aug: { ivs: [0, 4, 8], name: 'augmented', sym: '+' } }
type TriadQ = keyof typeof TRIAD
const KEYS12 = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F']
export function stringSets(inst: Instrument): { id: string; strings: number[]; label: string }[] {
  const n = inst.strings
  const out: { id: string; strings: number[]; label: string }[] = []
  for (let lo = n - 3; lo >= 0; lo--) {
    const strings = [lo, lo + 1, lo + 2]
    out.push({ id: strings.join(''), strings, label: strings.slice().reverse().map(s => stringName(inst.midis, s).replace(/^(low|high) /, '')).join('-') })
  }
  return out
}
function triadShapesOn(rootPc: number, q: TriadQ, strings: number[], inst: Instrument) {
  const tones = TRIAD[q].ivs.map(i => (rootPc + i) % 12)
  const found: { s: number; f: number }[][] = []
  const opts = strings.map(s => { const fs: number[] = []; for (let f = 0; f <= 15; f++) if (tones.includes((inst.midis[s] + f) % 12)) fs.push(f); return fs })
  for (const a of opts[0]) for (const b of opts[1]) for (const c of opts[2]) {
    const fr = [a, b, c]
    const pcs = new Set(fr.map((f, i) => (inst.midis[strings[i]] + f) % 12))
    const fretted = fr.filter(f => f > 0)
    if (pcs.size === 3 && (!fretted.length || Math.max(...fretted) - Math.min(...fretted) <= 4)) found.push(fr.map((f, i) => ({ s: strings[i], f })))
  }
  return found
}

// ---------- the quizzes ----------
export const QUIZZES: QuizDef[] = [
  // Fretboard
  ...[0, 1, 2, 3, 4, 5].map((k): QuizDef => ({
    id: `fb-nat-${k}`, unit: 'Fretboard notes', title: '', desc: '', length: 12, mic: true,
    items: inst => { const s = learningOrder(inst)[k]; return s === undefined ? [] : fretItems(inst, [s], true) },
    make: (item, inst, rnd) => fretQuestion(item, inst, rnd, true),
  })),
  {
    id: 'fb-low-all', unit: 'Fretboard notes', title: 'Sharps and flats on the two lowest strings', desc: 'Every note, so you can find the root of any barre chord.', length: 14, mic: true,
    items: inst => fretItems(inst, learningOrder(inst).slice(0, 2), false),
    make: (item, inst, rnd) => fretQuestion(item, inst, rnd, false),
  },
  {
    id: 'fb-all-nat', unit: 'Fretboard notes', title: 'Natural notes everywhere', desc: 'Every string mixed together, frets 0–12.', length: 16, mic: true,
    items: inst => fretItems(inst, inst.midis.map((_, s) => s), true),
    make: (item, inst, rnd) => fretQuestion(item, inst, rnd, true),
  },
  {
    id: 'fb-all', unit: 'Fretboard notes', title: 'Every note, every string', desc: 'The final boss of the fretboard.', length: 20, mic: true,
    items: inst => fretItems(inst, inst.midis.map((_, s) => s), false),
    make: (item, inst, rnd) => fretQuestion(item, inst, rnd, false),
  },
  {
    id: 'fb-octave', unit: 'Fretboard notes', title: 'Octave shapes', desc: 'Find the same note one octave higher. The fastest way to connect what you know.', length: 12, mic: true,
    items: inst => fretItems(inst, inst.midis.map((_, s) => s), true).filter(id => { const [, , s, f] = id.split(':'); const m = inst.midis[+s] + +f + 12; return inst.midis.some((o, t) => t !== +s && m - o >= 0 && m - o <= 15 && Math.abs(m - o - +f) <= 4) }),
    make: (item, inst) => {
      const [, , ss, ff] = item.split(':')
      const s = +ss, f = +ff
      const target = inst.midis[s] + f + 12
      const spots: Mark[] = []
      inst.midis.forEach((o, t) => { const g = target - o; if (g >= 0 && g <= 15 && t !== s) spots.push({ s: t, f: g, label: SHARPS[target % 12], role: 'chord' }) })
      return {
        item, prompt: `Tap ${SHARPS[target % 12]} one octave higher`, sub: `Starting from fret ${f} on the ${stringName(inst.midis, s)} string`,
        neck: { from: 0, to: 15, marks: [{ s, f, label: SHARPS[target % 12], role: 'root' }] },
        input: { type: 'neck', count: 1 },
        check: a => 'pos' in a && inst.midis[a.pos.s] + a.pos.f === target,
        mic: { kind: 'note', ok: m => m === target, want: `${SHARPS[target % 12]} an octave above` },
        explain: inst.id === 'guitar' ? 'Octave shape: two strings up, two frets up (three frets when you cross the B string).' : 'Same note name, twelve frets (or a string-and-frets jump) higher.',
        reveal: spots,
      }
    },
  },
  {
    id: 'fb-find-all', unit: 'Fretboard notes', title: 'Find every one', desc: 'Tap every place a note lives in frets 0–12.', length: 6, mic: false,
    items: () => NAT.map(p => `all:${p}`),
    make: (item, inst) => {
      const p = +item.split(':')[1]
      const spots: Mark[] = []
      inst.midis.forEach((o, s) => { for (let f = 0; f <= 12; f++) if ((o + f) % 12 === p) spots.push({ s, f, label: SHARPS[p], role: 'chord' }) })
      return {
        item, prompt: `Tap every ${SHARPS[p]} from fret 0 to 12`, sub: `${spots.length} to find`,
        neck: { from: 0, to: 13, marks: [] },
        input: { type: 'neck', count: spots.length },
        check: a => 'positions' in a && a.positions.length === spots.length && a.positions.every(x => (inst.midis[x.s] + x.f) % 12 === p),
        explain: `There are ${spots.length} ${SHARPS[p]}s in the first 12 frets. Notice how they form octave shapes.`,
        reveal: spots,
      }
    },
  },
  // Chords
  {
    id: 'ch-name', unit: 'Chords', title: 'Name that chord shape', desc: 'Read a chord diagram at a glance.', length: 10, mic: true,
    items: inst => OPEN_CHORDS[inst.id].filter(n => openShape(n, inst)).map(n => `ch:${inst.id}:${n}`),
    make: (item, inst, rnd) => {
      const name = item.split(':')[2]
      const pool = OPEN_CHORDS[inst.id]
      const opts = shuffle([name, ...distractors(name, pool, rnd)], rnd)
      return {
        item, prompt: 'Which chord is this?', diagram: openShape(name, inst),
        input: { type: 'choices', options: opts.map(o => ({ id: o, label: o })) },
        check: a => 'choice' in a && a.choice === name,
        mic: { kind: 'chord', tones: tonesOf(name), want: name },
        explain: `That's ${name}.`,
      }
    },
  },
  {
    id: 'ch-shape', unit: 'Chords', title: 'Pick the right shape', desc: 'See a chord name, find its shape.', length: 10, mic: true,
    items: inst => OPEN_CHORDS[inst.id].filter(n => openShape(n, inst)).map(n => `cs:${inst.id}:${n}`),
    make: (item, inst, rnd) => {
      const name = item.split(':')[2]
      const opts = shuffle([name, ...distractors(name, OPEN_CHORDS[inst.id], rnd, 2)], rnd)
      return {
        item, prompt: `Which shape is ${name}?`,
        input: { type: 'diagrams', options: opts.map(o => ({ id: o, voicing: openShape(o, inst)! })).filter(o => o.voicing) },
        check: a => 'choice' in a && a.choice === name,
        mic: { kind: 'chord', tones: tonesOf(name), want: name },
        explain: `${name} is ${openShape(name, inst)!.frets.map(f => (f < 0 ? 'x' : f)).join(' ')} (low string to high).`,
      }
    },
  },
  {
    id: 'ch-ear', unit: 'Chords', title: 'Major or minor? (by ear)', desc: 'Happy or sad: the first chord sound to learn.', length: 12, mic: false, ear: true,
    items: () => KEYS12.flatMap(k => [`ce:${k}:`, `ce:${k}:m`]),
    make: (item, _inst, rnd) => {
      const [, root, type] = item.split(':')
      const base = 48 + pc(root)
      const ivs = type === 'm' ? [0, 3, 7, 12] : [0, 4, 7, 12]
      void rnd
      return {
        item, prompt: 'Major or minor?', sub: 'Tap ▶ to hear it again',
        audio: { chord: ivs.map(i => base + i) },
        input: { type: 'choices', options: [{ id: '', label: 'Major (bright)' }, { id: 'm', label: 'Minor (dark)' }] },
        check: a => 'choice' in a && a.choice === type,
        explain: `It was ${root}${type} (${type === 'm' ? 'minor: the 3rd is lowered, so it sounds darker' : 'major: bright and settled'}).`,
      }
    },
  },
  {
    id: 'ch-ear-7', unit: 'Chords', title: 'Chord colours by ear', desc: 'Major, minor, dominant 7, major 7, minor 7.', length: 12, mic: false, ear: true,
    items: () => KEYS12.flatMap(k => ['', 'm', '7', 'maj7', 'm7'].map(t => `c7:${k}:${t}`)),
    make: item => {
      const [, root, type] = item.split(':')
      const base = 48 + pc(root)
      const labels: Record<string, string> = { '': 'Major', m: 'Minor', '7': 'Dominant 7 (bluesy)', maj7: 'Major 7 (dreamy)', m7: 'Minor 7 (smooth)' }
      return {
        item, prompt: 'Which chord colour?', sub: 'Tap ▶ to hear it again',
        audio: { chord: TYPE_IVS[type].map(i => base + i) },
        input: { type: 'choices', options: Object.entries(labels).map(([id, label]) => ({ id, label })) },
        check: a => 'choice' in a && a.choice === type,
        explain: `It was ${root}${type}: ${labels[type]}.`,
      }
    },
  },
  {
    id: 'ch-barre', unit: 'Chords', title: 'Barre chords: where does it go?', desc: 'E-shape (root on the low E) and A-shape (root on the A string).', length: 10, mic: true, guitarOnly: true,
    items: () => ['E', 'A'].flatMap(sh => ['', 'm'].flatMap(t => KEYS12.map(k => `br:${sh}:${k}:${t}`))),
    make: (item, inst, rnd) => {
      const [, sh, root, type] = item.split(':')
      const s = sh === 'E' ? 0 : 1
      let fret = (pc(root) - inst.midis[s] + 120) % 12
      if (fret === 0) fret = 12
      const opts = shuffle([...new Set([fret, ...shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(x => x !== fret), rnd).slice(0, 3)])], rnd)
      return {
        item, prompt: `${root}${type} as an ${sh}-shape barre chord: which fret?`, sub: `The root is on the ${sh === 'E' ? 'low E' : 'A'} string`,
        input: { type: 'choices', options: opts.map(f => ({ id: String(f), label: `Fret ${f}` })) },
        check: a => 'choice' in a && +a.choice === fret,
        mic: { kind: 'chord', tones: tonesOf(root + type), want: `${root}${type} (${sh}-shape at fret ${fret})` },
        explain: `${root} is at fret ${fret} on the ${sh === 'E' ? 'low E' : 'A'} string, so the barre goes there.`,
        reveal: [{ s, f: fret, label: 'R', role: 'root' }],
        neck: { from: 0, to: 13, marks: [] },
      }
    },
  },
  // Triads
  {
    id: 'tr-spell', unit: 'Triads', title: 'Spell the triad', desc: 'Every chord starts as three notes: root, 3rd, 5th.', length: 10, mic: false,
    items: () => KEYS12.flatMap(k => (['maj', 'min', 'dim', 'aug'] as TriadQ[]).map(q => `ts:${k}:${q}`)),
    make: item => {
      const [, root, q] = item.split(':') as [string, string, TriadQ]
      const tones = TRIAD[q].ivs.map(i => (pc(root) + i) % 12)
      const flats = /b/.test(root) || ['F'].includes(root)
      return {
        item, prompt: `Spell ${root} ${TRIAD[q].name}`, sub: 'Pick its three notes',
        input: { type: 'spell', count: 3 },
        check: a => 'pcs' in a && a.pcs.length === 3 && tones.every(t => a.pcs.includes(t)),
        explain: `${root} ${TRIAD[q].name} = ${tones.map(t => nameOf(t, flats)).join(' – ')} (root, ${q === 'min' || q === 'dim' ? 'b3' : '3'}, ${q === 'dim' ? 'b5' : q === 'aug' ? '#5' : '5'}).`,
      }
    },
  },
  ...['top', 'mid', 'low', 'bottom'].map((which, k): QuizDef => ({
    id: `tr-find-${which}`, unit: 'Triads', title: '', desc: '', length: 10, mic: true,
    items: inst => { const set = stringSets(inst)[k]; return set ? KEYS12.flatMap(r => ['maj', 'min'].map(q => `tf:${set.id}:${r}:${q}`)) : [] },
    make: (item, inst) => {
      const [, setId, root, q] = item.split(':') as [string, string, string, TriadQ]
      const strings = setId.split('').map(Number)
      const shapes = triadShapesOn(pc(root), q, strings, inst)
      const tones = TRIAD[q].ivs.map(i => (pc(root) + i) % 12)
      const set = stringSets(inst).find(x => x.id === setId)!
      return {
        item, prompt: `Tap a ${root}${TRIAD[q].sym} triad on the ${set.label} strings`, sub: 'One note on each of the three strings',
        neck: { from: 0, to: 15, marks: [] },
        input: { type: 'neck', count: 3, strings },
        check: a => {
          if (!('positions' in a) || a.positions.length !== 3) return false
          const ss = new Set(a.positions.map(p => p.s))
          const pcs = new Set(a.positions.map(p => (inst.midis[p.s] + p.f) % 12))
          const fretted = a.positions.map(p => p.f).filter(f => f > 0)
          return ss.size === 3 && tones.every(t => pcs.has(t)) && (!fretted.length || Math.max(...fretted) - Math.min(...fretted) <= 4)
        },
        mic: { kind: 'chord', tones, want: `${root}${TRIAD[q].sym} on the ${set.label} strings` },
        explain: `${root}${TRIAD[q].sym} has ${shapes.length} shapes on these strings. The highlighted ones are all correct: root position and both inversions.`,
        reveal: shapes.flat().map(p => ({ ...p, label: SHARPS[(inst.midis[p.s] + p.f) % 12], role: (inst.midis[p.s] + p.f) % 12 === pc(root) ? 'root' : 'chord' })),
      }
    },
  })),
  {
    id: 'tr-inv', unit: 'Triads', title: 'Name the inversion', desc: 'Root position, 1st or 2nd inversion: which note is lowest?', length: 10, mic: false,
    items: inst => stringSets(inst).slice(0, 2).flatMap(set => ['C', 'G', 'D', 'A', 'F'].flatMap(r => ['maj', 'min'].map(q => `ti:${set.id}:${r}:${q}`))),
    make: (item, inst, rnd) => {
      const [, setId, root, q] = item.split(':') as [string, string, string, TriadQ]
      const strings = setId.split('').map(Number)
      const shapes = triadShapesOn(pc(root), q, strings, inst).filter(sh => sh.every(p => p.f <= 12))
      const shape = pick(shapes, rnd)
      const low = shape.map(p => inst.midis[p.s] + p.f).reduce((a, b) => Math.min(a, b))
      const iv = (low - pc(root) + 120) % 12
      const inv = iv === 0 ? 'root' : iv === 3 || iv === 4 ? 'first' : 'second'
      return {
        item, prompt: `${root}${TRIAD[q].sym}: which inversion is this?`, sub: 'Look at the lowest-sounding note',
        neck: { from: 0, to: 13, marks: shape.map(p => ({ ...p, label: SHARPS[(inst.midis[p.s] + p.f) % 12], role: 'chord' })) },
        input: { type: 'choices', options: [{ id: 'root', label: 'Root position (root lowest)' }, { id: 'first', label: '1st inversion (3rd lowest)' }, { id: 'second', label: '2nd inversion (5th lowest)' }] },
        check: a => 'choice' in a && a.choice === inv,
        mic: { kind: 'chord', tones: TRIAD[q].ivs.map(i => (pc(root) + i) % 12), want: `this ${root}${TRIAD[q].sym} shape` },
        explain: `The lowest note is the ${iv === 0 ? 'root' : iv === 7 ? '5th' : '3rd'}, so it's ${inv === 'root' ? 'root position' : `${inv} inversion`}.`,
      }
    },
  },
  {
    id: 'tr-ear', unit: 'Triads', title: 'Triad types by ear', desc: 'Major, minor, diminished, augmented.', length: 12, mic: false, ear: true,
    items: () => KEYS12.flatMap(k => (['maj', 'min', 'dim', 'aug'] as TriadQ[]).map(q => `te:${k}:${q}`)),
    make: item => {
      const [, root, q] = item.split(':') as [string, string, TriadQ]
      const base = 55 + (pc(root) % 7)
      const notes = TRIAD[q].ivs.map(i => base + i)
      return {
        item, prompt: 'Which kind of triad?', sub: 'Tap ▶ to hear it again',
        audio: { seq: notes, chord: notes },
        input: { type: 'choices', options: (Object.keys(TRIAD) as TriadQ[]).map(k => ({ id: k, label: TRIAD[k].name[0].toUpperCase() + TRIAD[k].name.slice(1) })) },
        check: a => 'choice' in a && a.choice === q,
        explain: { maj: 'Major: bright.', min: 'Minor: dark.', dim: 'Diminished: tense and small (two minor 3rds).', aug: 'Augmented: dreamy and unstable (two major 3rds).' }[q],
      }
    },
  },
  // Circle of fifths
  {
    id: 'cof-sig', unit: 'Circle of fifths', title: 'Key signatures', desc: 'How many sharps or flats does each key have?', length: 12, mic: false,
    items: () => CIRCLE_MAJOR.flatMap(k => [`sig:${k}`, `key:${k}`]),
    make: (item, _inst, rnd) => {
      const [kind, k] = item.split(':')
      const sig = keySignature(k)
      if (kind === 'sig') {
        const opts = shuffle([...new Set([sig, ...shuffle(CIRCLE_MAJOR.map(x => keySignature(x)).filter(x => x !== sig), rnd).slice(0, 3)])], rnd)
        return {
          item, prompt: `How many sharps or flats in ${k} major?`,
          input: { type: 'choices', options: opts.map(o => ({ id: o, label: o })) },
          check: a => 'choice' in a && a.choice === sig,
          explain: `${k} major has ${sig}. Going clockwise adds a sharp; counter-clockwise adds a flat.`,
        }
      }
      const opts = shuffle([k, ...shuffle(CIRCLE_MAJOR.filter(x => x !== k), rnd).slice(0, 3)], rnd)
      return {
        item, prompt: `Which major key has ${sig}?`,
        input: { type: 'choices', options: opts.map(o => ({ id: o, label: `${o} major` })) },
        check: a => 'choice' in a && a.choice === k,
        explain: `${k} major has ${sig}.`,
      }
    },
  },
  {
    id: 'cof-neighbours', unit: 'Circle of fifths', title: 'IV and V: the neighbours', desc: 'The chords one step either side of home.', length: 12, mic: false,
    items: () => CIRCLE_MAJOR.flatMap(k => [`V:${k}`, `IV:${k}`]),
    make: (item, _inst, rnd) => {
      const [deg, k] = item.split(':')
      const i = circleIndex(k)
      const ans = CIRCLE_MAJOR[(i + (deg === 'V' ? 1 : 11)) % 12]
      const opts = shuffle([ans, ...shuffle(CIRCLE_MAJOR.filter(x => x !== ans), rnd).slice(0, 3)], rnd)
      return {
        item, prompt: `In the key of ${k}, what is the ${deg} chord?`, sub: deg === 'V' ? 'One step clockwise' : 'One step counter-clockwise',
        input: { type: 'choices', options: opts.map(o => ({ id: o, label: o })) },
        check: a => 'choice' in a && a.choice === ans,
        explain: `${ans} is the ${deg} of ${k}: ${deg === 'V' ? 'a fifth up, one step clockwise' : 'a fourth up (a fifth down), one step counter-clockwise'}.`,
      }
    },
  },
  {
    id: 'cof-relative', unit: 'Circle of fifths', title: 'Relative minors and majors', desc: 'Same notes, different home.', length: 12, mic: false,
    items: () => CIRCLE_MAJOR.flatMap((k, i) => [`rm:${k}:${CIRCLE_MINOR[i]}`, `rM:${CIRCLE_MINOR[i]}:${k}`]),
    make: (item, _inst, rnd) => {
      const [kind, from, to] = item.split(':')
      const pool = kind === 'rm' ? CIRCLE_MINOR : CIRCLE_MAJOR
      const opts = shuffle([to, ...shuffle(pool.filter(x => x !== to), rnd).slice(0, 3)], rnd)
      return {
        item, prompt: kind === 'rm' ? `What is the relative minor of ${from} major?` : `What is the relative major of ${from}?`,
        sub: 'It sits right next to it on the circle',
        input: { type: 'choices', options: opts.map(o => ({ id: o, label: o })) },
        check: a => 'choice' in a && a.choice === to,
        explain: `${kind === 'rm' ? `${from} major and ${to}` : `${from} and ${to} major`} share every note. The relative minor is three frets (a minor 3rd) below the major.`,
      }
    },
  },
  {
    id: 'cof-chords', unit: 'Circle of fifths', title: 'Chords in a key', desc: 'Which chords belong to which key?', length: 10, mic: false,
    items: () => CIRCLE_MAJOR.map(k => `dk:${k}`),
    make: (item, _inst, rnd) => {
      const k = item.split(':')[1]
      const i = circleIndex(k)
      const inKey = [CIRCLE_MAJOR[(i + 11) % 12], CIRCLE_MAJOR[(i + 1) % 12], CIRCLE_MINOR[i], CIRCLE_MINOR[(i + 11) % 12], CIRCLE_MINOR[(i + 1) % 12]]
      const out = [...CIRCLE_MAJOR, ...CIRCLE_MINOR].filter(x => !inKey.includes(x) && x !== k && Math.abs(((circleIndex(x.replace('m', ''), x.endsWith('m')) - i + 18) % 12) - 6) >= 2)
      const ans = pick(inKey, rnd)
      const opts = shuffle([ans, ...shuffle(out, rnd).slice(0, 3)], rnd)
      return {
        item, prompt: `Which chord belongs to the key of ${k} major?`,
        input: { type: 'choices', options: opts.map(o => ({ id: o, label: o })) },
        check: a => 'choice' in a && a.choice === ans,
        explain: `The key of ${k} uses ${k}, ${inKey.join(', ')} (and one diminished chord). On the circle they're the slice around ${k}.`,
      }
    },
  },
  // CAGED
  {
    id: 'caged-name', unit: 'CAGED', title: 'Which shape is this?', desc: 'Recognise the five shapes anywhere on the neck.', length: 10, mic: true,
    items: inst => KEYS12.flatMap(k => ['maj', 'min'].flatMap(q => cagedShapes(pc(k), q === 'min', inst).map(s => `cn:${k}:${q}:${s.letter}`))),
    make: (item, inst, rnd) => {
      const [, k, q, letter] = item.split(':')
      const shape = cagedShapes(pc(k), q === 'min', inst).find(s => s.letter === letter)!
      const name = k + (q === 'min' ? 'm' : '')
      return {
        item, prompt: `This is ${name}. Which shape is it?`, sub: `Frets ${shape.lo}–${shape.hi}`,
        neck: { from: Math.max(0, shape.lo - 1), to: Math.max(shape.hi + 1, shape.lo + 5), marks: shape.frets.map((f, s) => ({ s, f, label: (inst.midis[s] + f) % 12 === pc(k) ? 'R' : '', role: (inst.midis[s] + f) % 12 === pc(k) ? 'root' : 'chord' } as Mark)).filter(m => m.f >= 0) },
        input: { type: 'choices', options: shuffle(inst.shapeSystem, rnd).map(l => ({ id: l, label: `${l} shape` })) },
        check: a => 'choice' in a && a.choice === letter,
        mic: { kind: 'chord', tones: tonesOf(name), want: `${name} with the ${letter} shape` },
        explain: `It's the ${letter} shape: the open ${letter}${q === 'min' ? 'm' : ''} chord moved up the neck. Look where the roots sit.`,
      }
    },
  },
  {
    id: 'caged-where', unit: 'CAGED', title: 'Play it with this shape', desc: 'Where does each shape go for any chord?', length: 10, mic: true,
    items: inst => ['C', 'D', 'E', 'F', 'G', 'A', 'Bb'].flatMap(k => inst.shapeSystem.map(l => `cw:${k}:${l}`)),
    make: (item, inst, rnd) => {
      const [, k, letter] = item.split(':')
      const shape = cagedShapes(pc(k), false, inst).find(s => s.letter === letter)
      const root = shape?.roots[0]
      const ans = root ? root.f : 0
      const opts = shuffle([...new Set([ans, ...shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].filter(x => x !== ans), rnd).slice(0, 3)])], rnd)
      return {
        item, prompt: `${k} with the ${letter} shape: which fret is the root on?`, sub: root ? `Root on the ${stringName(inst.midis, root.s)} string` : '',
        input: { type: 'choices', options: opts.map(f => ({ id: String(f), label: f === 0 ? 'Open' : `Fret ${f}` })) },
        check: a => 'choice' in a && +a.choice === ans,
        mic: { kind: 'chord', tones: tonesOf(k), want: `${k} using the ${letter} shape` },
        explain: `The ${letter} shape's root sits on the ${root ? stringName(inst.midis, root.s) : ''} string, so ${k} goes at fret ${ans}.`,
        neck: { from: 0, to: 15, marks: [] },
        reveal: shape ? shape.frets.map((f, s) => ({ s, f, label: (inst.midis[s] + f) % 12 === pc(k) ? 'R' : '', role: ((inst.midis[s] + f) % 12 === pc(k) ? 'root' : 'chord') as MarkRole })).filter(m => m.f >= 0) : [],
      }
    },
  },
  {
    id: 'caged-order', unit: 'CAGED', title: 'The order up the neck', desc: `The shapes always come in the same order and wrap around.`, length: 8, mic: false,
    items: inst => inst.shapeSystem.map(l => `co:${l}`),
    make: (item, inst, rnd) => {
      const l = item.split(':')[1]
      const sys = inst.shapeSystem
      const ans = sys[(sys.indexOf(l) + 1) % 5]
      return {
        item, prompt: `Going up the neck, which shape comes after the ${l} shape?`,
        input: { type: 'choices', options: shuffle(sys.filter(x => x !== l), rnd).map(x => ({ id: x, label: `${x} shape` })) },
        check: a => 'choice' in a && a.choice === ans,
        explain: `The order is ${sys.join(' → ')} → ${sys[0]} … It spells ${sys.join('')}, and starts over after ${sys[4]}.`,
      }
    },
  },
]

// titles for generated quizzes
export function quizTitle(q: QuizDef, inst: Instrument): { title: string; desc: string } {
  if (q.id.startsWith('fb-nat-')) {
    const s = learningOrder(inst)[+q.id.slice(7)]
    if (s === undefined) return { title: '', desc: '' }
    const n = stringName(inst.midis, s)
    return { title: `Natural notes on the ${n} string`, desc: inst.id === 'guitar' && n === 'low E' ? 'Start here: the low E holds the roots of your E-shape barre chords (and the high e is the same).' : `Learn every natural note on the ${n} string, frets 0–12.` }
  }
  if (q.id.startsWith('tr-find-')) {
    const set = stringSets(inst)[['top', 'mid', 'low', 'bottom'].indexOf(q.id.slice(8))]
    if (!set) return { title: '', desc: '' }
    return { title: `Triads on the ${set.label} strings`, desc: 'Find major and minor triads, every inversion.' }
  }
  return { title: q.title, desc: q.desc }
}

/** The quizzes available on this instrument, in course order, grouped by unit. */
export function course(inst: Instrument) {
  const units = new Map<string, (QuizDef & { title: string; desc: string })[]>()
  for (const q of QUIZZES) {
    if (q.guitarOnly && inst.id !== 'guitar') continue
    if (!q.items(inst).length) continue
    const t = quizTitle(q, inst)
    if (!t.title) continue
    const list = units.get(q.unit) ?? []
    list.push({ ...q, ...t })
    units.set(q.unit, list)
  }
  return [...units.entries()].map(([unit, quizzes]) => ({ unit, quizzes }))
}
export function findQuiz(id: string, inst: Instrument) {
  for (const u of course(inst)) for (const q of u.quizzes) if (q.id === id) return q
  return null
}
