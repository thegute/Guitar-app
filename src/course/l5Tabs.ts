// Level 5 (chords in depth): tabs for augmented and diminished triads, seventh chords (shells and drop 2), the 7th
// chords of a key, sus / add / 6 / power chords, extensions, altered dominants, slash chords with walking bass lines,
// and guide-tone voice leading. Standard-tuned guitar gets the classic grips players use (the shapes the lesson
// text names); other tunings (tenor ukulele, baritone) get the nearest playable voicing worked out for them.
import type { Song, SongBar, SongStep } from '../tabs/model'

const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
type N = { string: number; fret: number; midi: number }
const GUITAR = [40, 45, 50, 55, 59, 64]
export const isGuitar = (t: number[]) => t.length === 6 && t.every((m, i) => m === GUITAR[i])
const mod = (x: number) => ((x % 12) + 12) % 12
const st = (notes: N[], dur: number, chord?: string, tech?: string): SongStep => ({ notes: notes.map(n => ({ ...n, ...(tech ? { tech } : {}) })), dur, ...(chord ? { chord } : {}) })
const song = (title: string, tuning: number[], bars: SongBar[], tempo: number): Song => ({ title, tempo, tracks: [{ name: 'Lesson', tuning, capo: 0, bars, program: 25 }] })
function bars(steps: SongStep[]): SongBar[] {
  const out: SongBar[] = []
  let cur: SongStep[] = [], len = 0
  for (const s of steps) {
    if (len + s.dur > 4 + 1e-6) { if (len < 4) cur.push({ notes: [], dur: 4 - len }); out.push({ steps: cur }); cur = []; len = 0 }
    cur.push(s); len += s.dur
    if (Math.abs(len - 4) < 1e-6) { out.push({ steps: cur }); cur = []; len = 0 }
  }
  if (cur.length) { if (len < 4) cur.push({ notes: [], dur: 4 - len }); out.push({ steps: cur }) }
  return out
}

/** Chord qualities as intervals from the root. */
export const Q = {
  maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8],
  maj7: [0, 4, 7, 11], dom7: [0, 4, 7, 10], m7: [0, 3, 7, 10], m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9],
  sus2: [0, 2, 7], sus4: [0, 5, 7], add9: [0, 4, 7, 14], six: [0, 4, 7, 9], m6: [0, 3, 7, 9], five: [0, 7],
  dom9: [0, 4, 10, 14], maj9: [0, 4, 11, 14], m9: [0, 3, 10, 14], dom13: [0, 4, 10, 21], m11: [0, 3, 10, 17],
  dom7b9: [0, 4, 10, 13], dom7s9: [0, 4, 10, 15], dom7s5: [0, 4, 8, 10], dom7b5: [0, 4, 6, 10],
} as const
export type Quality = keyof typeof Q
const SUFFIX: Record<Quality, string> = { maj: '', min: 'm', dim: 'dim', aug: '+', maj7: 'maj7', dom7: '7', m7: 'm7', m7b5: 'm7♭5', dim7: 'dim7', sus2: 'sus2', sus4: 'sus4', add9: 'add9', six: '6', m6: 'm6', five: '5', dom9: '9', maj9: 'maj9', m9: 'm9', dom13: '13', m11: 'm11', dom7b9: '7♭9', dom7s9: '7♯9', dom7s5: '7♯5', dom7b5: '7♭5' }
export const chordName = (root: number, q: Quality, bass?: number) => `${NAMES[mod(root)]}${SUFFIX[q]}${bass !== undefined && mod(bass) !== mod(root) ? '/' + NAMES[mod(bass)] : ''}`

/**
 * A playable voicing of a chord for any tuning: one note per string (or muted), within a 4-fret span (open strings
 * allowed), every pitch class of the chord present except those in `may` (the 5th is often left out), the lowest note
 * `bass` (the root unless a slash chord), near fret `near`. Fewest gaps, closest to `near`.
 */
export function voicing(tuning: number[], root: number, ivs: readonly number[], near = 3, bass?: number, may: number[] = [7], minNotes = 3): N[] | null {
  const pcs = [...new Set(ivs.map(i => mod(root + i)))]
  const need = pcs.filter(p => !may.map(i => mod(root + i)).includes(p) || pcs.length <= 3)
  const want = mod(bass ?? root)
  const n = tuning.length
  let best: { notes: N[]; cost: number } | null = null
  for (let p = Math.max(1, near - 4); p <= Math.min(12, near + 5); p++) {
    const opts = tuning.map(o => [-1, 0, p, p + 1, p + 2, p + 3].filter(f => f < 0 || pcs.includes(mod(o + f))))
    const pick = (s: number, acc: number[]) => {
      if (s === n) {
        const fs = acc
        const notes = fs.map((f, i) => (f >= 0 ? { string: i, fret: f, midi: tuning[i] + f } : null)).filter(Boolean) as N[]
        if (notes.length < Math.min(minNotes, pcs.length)) return
        const low = notes.reduce((a, b) => (b.midi < a.midi ? b : a))
        if (mod(low.midi) !== want) return
        const have = new Set(notes.map(x => mod(x.midi)))
        if (!need.every(x => have.has(x))) return
        const fretted = notes.filter(x => x.fret > 0).map(x => x.fret)
        if (fretted.length && Math.max(...fretted) - Math.min(...fretted) > 3) return
        const played = fs.map((f, i) => (f >= 0 ? i : -1)).filter(i => i >= 0)
        const gaps = played.length ? played[played.length - 1] - played[0] + 1 - played.length : 0
        const doubled = notes.length - have.size
        const cost = gaps * 3 + Math.abs(p - near) * 0.5 + doubled * 0.4 - notes.length * 0.3 + (pcs.length - have.size) * 1.5
        if (!best || cost < best.cost) best = { notes, cost }
        return
      }
      for (const f of opts[s]) pick(s + 1, [...acc, f])
    }
    pick(0, [])
  }
  return best ? (best as { notes: N[] }).notes : null
}
/** From guitar frets (low E first, -1 = muted) when the tuning is a standard guitar, else a worked-out voicing. */
function grip(tuning: number[], frets: number[] | null, root: number, ivs: readonly number[], near: number, bass?: number, may?: number[]): N[] {
  if (frets && isGuitar(tuning)) return frets.map((f, s) => (f >= 0 ? { string: s, fret: f, midi: tuning[s] + f } : null)).filter(Boolean) as N[]
  return voicing(tuning, root, ivs, near, bass, may) ?? voicing(tuning, root, ivs, near, bass, [7, 14, 17, 21, 2, 5, 9], 2) ?? voicing(tuning, root, [0, 7], near) ?? []
}
/** A chord held for `beats`, then its notes picked low to high (so you hear every voice). */
function chordAndArp(notes: N[], name: string, hold = 2, each = 0.5): SongStep[] {
  if (!notes.length) return []
  const sorted = [...notes].sort((a, b) => a.midi - b.midi)
  return [st(notes, hold, name), ...sorted.map(n => st([n], each))]
}
/** root, quality, guitar frets (low E first, -1 = muted; null = work it out), slash bass, a name to show instead */
export type G = [number, Quality, number[] | null, number?, string?]
export function walk(tuning: number[], title: string, items: G[], tempo = 72, hold = 2, near = 3): Song {
  const steps: SongStep[] = []
  for (const [r, q, frets, bass, name] of items) steps.push(...chordAndArp(grip(tuning, frets, r, Q[q], near, bass), name ?? chordName(r, q, bass), hold))
  return song(title, tuning, bars(steps), tempo)
}

// ---- 1 · augmented and diminished triads ----
export const augDimTab = (t: number[]) => walk(t, 'Augmented and diminished: C+ moving in major 3rds, Bdim → C, and passing diminished chords', [
  [0, 'aug', [-1, 3, 2, 1, 1, -1]], [4, 'aug', [-1, 7, 6, 5, 5, -1]], [8, 'aug', [-1, 11, 10, 9, 9, -1]],
  [11, 'dim', [-1, 2, 3, 4, 3, -1]], [0, 'maj', [-1, 3, 2, 0, 1, 0]],
  [0, 'maj', [-1, 3, 2, 0, 1, 0]], [1, 'dim7', [-1, 4, 5, 3, 5, -1], undefined, 'C♯dim7'], [2, 'min', [-1, 5, 7, 7, 6, 5]], [3, 'dim7', [-1, 6, 7, 5, 7, -1], undefined, 'D♯dim7'], [4, 'min', [0, 2, 2, 0, 0, 0]],
], 66)

// ---- 2–3 · seventh chords ----
/** The five 7th chords on C: shells (R 3 7, the 5th left out), root on the 6th string then the 5th. */
export const sevenShellsTab = (t: number[]) => walk(t, 'The five 7th chords on C as shells: root, 3rd and 7th', [
  [0, 'maj7', [8, -1, 9, 9, -1, -1]], [0, 'dom7', [8, -1, 8, 9, -1, -1]], [0, 'm7', [8, -1, 8, 8, -1, -1]], [0, 'm7b5', [8, -1, 8, 8, 7, -1]], [0, 'dim7', [8, -1, 7, 8, 7, -1]],
  [0, 'maj7', [-1, 3, 2, 4, -1, -1]], [0, 'dom7', [-1, 3, 2, 3, -1, -1]], [0, 'm7', [-1, 3, 1, 3, -1, -1]], [0, 'm7b5', [-1, 3, 4, 3, 4, -1]], [0, 'dim7', [-1, 3, 4, 2, 4, -1]],
], 66, 2, 6)
/** Drop-2 voicings on the top four strings: Cmaj7, C7, Cm7, Cm7♭5 and Cdim7, then the same chord moved round its inversions. */
export const drop2Tab = (t: number[]) => walk(t, 'Drop 2 on the top four strings: the five 7th chords on C', [
  [0, 'maj7', [-1, -1, 10, 12, 12, 12]], [0, 'dom7', [-1, -1, 10, 12, 11, 12]], [0, 'm7', [-1, -1, 10, 12, 11, 11]], [0, 'm7b5', [-1, -1, 10, 11, 11, 11]], [0, 'dim7', [-1, -1, 10, 11, 10, 11]],
  [0, 'maj7', [-1, -1, 2, 4, 1, 3]], [0, 'maj7', [-1, -1, 5, 5, 5, 7]], [0, 'maj7', [-1, -1, 9, 9, 8, 8]],
], 66, 2, 8)
/** The 7th chords of C major as shells, root on the 6th and 5th strings, up the key. */
export const key7Tab = (t: number[]) => walk(t, 'The 7th chords of C major: Cmaj7 Dm7 Em7 Fmaj7 G7 Am7 Bm7♭5', [
  [0, 'maj7', [-1, 3, 2, 4, -1, -1]], [2, 'm7', [-1, 5, 3, 5, -1, -1]], [4, 'm7', [-1, 7, 5, 7, -1, -1]], [5, 'maj7', [1, -1, 2, 2, -1, -1]],
  [7, 'dom7', [3, -1, 3, 4, -1, -1]], [9, 'm7', [5, -1, 5, 5, -1, -1]], [11, 'm7b5', [7, -1, 7, 7, 6, -1]], [0, 'maj7', [8, -1, 9, 9, -1, -1]],
], 70, 2, 4)
/** ii – V – I in C: shells, then drop 2, voice-led (the 7th of each chord falls to the 3rd of the next). */
export const twoFiveOneTab = (t: number[]) => walk(t, 'ii – V – I in C: Dm7 G7 Cmaj7, shells then drop 2', [
  [2, 'm7', [-1, 5, 3, 5, -1, -1]], [7, 'dom7', [3, -1, 3, 4, -1, -1]], [0, 'maj7', [-1, 3, 2, 4, -1, -1]],
  [2, 'm7', [-1, -1, 10, 10, 10, 10]], [7, 'dom7', [-1, -1, 9, 10, 8, 10]], [0, 'maj7', [-1, -1, 9, 9, 8, 8]],
], 72, 4, 5)

// ---- 4 · sus, add, 6 and power chords ----
export const susAddTab = (t: number[]) => walk(t, 'Sus2, sus4, add9 and 6: colours round D and C', [
  [2, 'maj', [-1, -1, 0, 2, 3, 2]], [2, 'sus4', [-1, -1, 0, 2, 3, 3]], [2, 'maj', [-1, -1, 0, 2, 3, 2]], [2, 'sus2', [-1, -1, 0, 2, 3, 0]],
  [0, 'maj', [-1, 3, 2, 0, 1, 0]], [0, 'add9', [-1, 3, 2, 0, 3, 0]], [0, 'six', [-1, 3, 2, 2, 1, 0]], [0, 'maj', [-1, 3, 2, 0, 1, 0]],
], 70, 2, 2)
export const powerTab = (t: number[]) => {
  // power chords R-5 and R-5-8 up the low strings (on a short-necked uke the same two-note shapes high up)
  const items: G[] = [[4, 'five', [0, 2, 2, -1, -1, -1]], [7, 'five', [3, 5, 5, -1, -1, -1]], [9, 'five', [5, 7, 7, -1, -1, -1]], [7, 'five', [3, 5, 5, -1, -1, -1]], [2, 'five', [-1, 5, 7, 7, -1, -1]], [0, 'five', [-1, 3, 5, 5, -1, -1]]]
  const steps: SongStep[] = []
  for (const [r, q, frets] of items) {
    const g = grip(t, frets, r, Q[q], 4, undefined, [])
    if (!g.length) continue
    // chugged eighths, palm-muted, accent on the 1
    steps.push(st(g, 0.5, chordName(r, q)), ...Array.from({ length: 7 }, () => st(g, 0.5, undefined, 'pm')))
  }
  return song('Power chords: R-5 and R-5-8, chugged eighths', t, bars(steps), 100)
}

// ---- 5 · extensions ----
export const extTab = (t: number[]) => walk(t, 'Extensions: C9, C13, Cmaj9, Cm9 and Cm11 (the 5th left out)', [
  [0, 'dom7', [-1, 3, 2, 3, 1, -1]], [0, 'dom9', [-1, 3, 2, 3, 3, 3]], [0, 'dom13', [8, -1, 8, 9, 10, -1]],
  [0, 'maj7', [-1, 3, 2, 4, -1, -1]], [0, 'maj9', [-1, 3, 2, 4, 3, -1]],
  [0, 'm7', [-1, 3, 1, 3, -1, -1]], [0, 'm9', [-1, 3, 1, 3, 3, -1]], [0, 'm11', [8, -1, 8, 8, 6, -1]],
], 66, 2, 5)
/** A funk vamp on a 9th chord (E9, the Cory Wong / James Brown grip), sliding into it from a fret below. */
export const ninthVampTab = (t: number[]) => {
  const g = grip(t, [-1, 7, 6, 7, 7, 7], 4, Q.dom9, 6)
  const below = g.map(n => (n.fret > 0 ? { ...n, fret: n.fret - 1, midi: n.midi - 1 } : n))
  const steps: SongStep[] = []
  for (let k = 0; k < 4; k++) steps.push(st(below, 0.25), st(g, 0.25, k === 0 ? 'E9' : undefined, '/'), { notes: [], dur: 0.5 }, st(g, 0.25), { notes: [], dur: 0.25 }, st(g, 0.5), st(g.map(n => ({ ...n })), 0.25, undefined, 'x'), { notes: [], dur: 0.25 }, st(g, 0.5), { notes: [], dur: 1 })
  return song('E9 funk vamp: slide in, stab, ghost', t, bars(steps), 96)
}

// ---- 6 · altered dominants ----
export const altTab = (t: number[]) => walk(t, 'Altered dominants: G7, G7♭9, G7♯9, G7♯5 each resolving to C; then the Hendrix E7♯9', [
  [7, 'dom7', [3, -1, 3, 4, 3, -1]], [0, 'maj', [-1, 3, 2, 0, 1, 0]],
  [7, 'dom7b9', [3, -1, 3, 4, 3, 4]], [0, 'maj', [-1, 3, 2, 0, 1, 0]],
  [7, 'dom7s9', [-1, 10, 9, 10, 11, -1]], [0, 'maj', [-1, 3, 2, 0, 1, 0]],
  [7, 'dom7s5', [3, -1, 3, 4, 4, -1]], [0, 'maj', [-1, 3, 2, 0, 1, 0]],
  [4, 'dom7s9', [0, 7, 6, 7, 8, -1]],
], 66, 2, 4)

// ---- 7 · slash chords and bass lines ----
export const slashTab = (t: number[]) => walk(t, 'Slash chords: a bass line walking down under C – G/B – Am – Am/G – F – C/E – Dm7 – G', [
  [0, 'maj', [-1, 3, 2, 0, 1, 0]], [7, 'maj', [-1, 2, 0, 0, 3, 3], 11], [9, 'min', [-1, 0, 2, 2, 1, 0]], [9, 'min', [3, 0, 2, 2, 1, 0], 7],
  [5, 'maj', [1, 3, 3, 2, 1, 1]], [0, 'maj', [0, 3, 2, 0, 1, 0], 4], [2, 'm7', [-1, -1, 0, 2, 1, 1]], [7, 'maj', [3, 2, 0, 0, 0, 3]],
], 72, 2, 2)
/** D – D/C – G/B – Gm/B♭ – D/A: the "chromatic bass under a held chord" sound. */
export const bassLineTab = (t: number[]) => walk(t, 'A descending bass line: D – D/C – G/B – Gm/B♭ – D/A', [
  [2, 'maj', [-1, -1, 0, 2, 3, 2]], [2, 'maj', [-1, 3, 0, 2, 3, 2], 0], [7, 'maj', [-1, 2, 0, 0, 3, 3], 11], [7, 'min', [-1, 1, 0, 0, 3, 3], 10], [2, 'maj', [-1, 0, 0, 2, 3, 2], 9],
], 70, 2, 2)

// ---- 8 · voice leading: guide tones ----
/** The guide tones (3rds and 7ths) through a circle progression: each 7th falls a half step to the next chord's 3rd. */
export function guideTonesTab(tuning: number[]): Song {
  // Am7 D7 Gmaj7 Cmaj7 F#m7♭5 B7 Em (the circle of 4ths in E minor / G major): two voices, one moving at a time
  const prog: [number, Quality][] = [[9, 'm7'], [2, 'dom7'], [7, 'maj7'], [0, 'maj7'], [6, 'm7b5'], [11, 'dom7'], [4, 'min']]
  const n = tuning.length
  const [lo, hi] = [Math.max(0, n - 4), n - 3] // D and G strings on guitar (the middle of any instrument)
  const steps: SongStep[] = []
  let prev: [number, number] | null = null
  for (const [r, q] of prog) {
    const ivs = Q[q] as readonly number[]
    const third = mod(r + ivs[1]), sev = mod(r + (ivs[3] ?? ivs[2]))
    // the two guide tones, as close as possible to the last pair (one voice on each string)
    let best: [N, N] | null = null, bc = Infinity
    for (let f1 = 0; f1 <= 12; f1++) for (let f2 = 0; f2 <= 12; f2++) {
      const a = tuning[lo] + f1, b = tuning[hi] + f2
      const pa = mod(a), pb = mod(b)
      if (!((pa === third && pb === sev) || (pa === sev && pb === third))) continue
      if (Math.abs(f1 - f2) > 3) continue
      const c: number = prev ? Math.abs(a - prev[0]) + Math.abs(b - prev[1]) : Math.abs(f1 - 5) + Math.abs(f2 - 5)
      if (c < bc) { bc = c; best = [{ string: lo, fret: f1, midi: a }, { string: hi, fret: f2, midi: b }] }
    }
    if (!best) continue
    const pair = best as [N, N]
    steps.push(st(pair, 2, chordName(r, q)), st([pair[0]], 1), st([pair[1]], 1))
    prev = [pair[0].midi, pair[1].midi]
  }
  return song('Guide tones: the 3rds and 7ths through a circle progression', tuning, bars(steps), 70)
}
/** I – vi – ii – V in C, drop 2 on the top strings, voice-led: Cmaj7 Am7 Dm7 G7 (then the same with 9ths). */
export const voiceLead7Tab = (t: number[]) => walk(t, 'I – vi – ii – V in C with 7th chords, each moving to the nearest voicing', [
  [0, 'maj7', [-1, -1, 10, 12, 12, 12]], [9, 'm7', [-1, -1, 10, 12, 10, 12]], [2, 'm7', [-1, -1, 10, 10, 10, 10]], [7, 'dom7', [-1, -1, 9, 10, 8, 10]],
  [0, 'maj7', [-1, -1, 9, 9, 8, 8]], [9, 'm7', [-1, -1, 7, 9, 8, 8]], [2, 'm7', [-1, -1, 7, 7, 6, 8]], [7, 'dom7', [-1, -1, 5, 7, 6, 7]], [0, 'maj7', [-1, -1, 5, 5, 5, 7]],
], 70, 2, 8)

// ---- neck pictures ----
/** Marks for a chord grip on the neck (guitar frets as written; other tunings worked out), labelled by chord tone. */
export function gripMarks(tuning: number[], root: number, q: Quality, frets: number[] | null, near = 3, bass?: number) {
  const g = grip(tuning, frets, root, Q[q], near, bass)
  const ivs = Q[q].map(i => mod(i))
  const LAB: Record<number, string> = { 0: 'R', 1: '♭9', 2: '9', 3: '♭3', 4: '3', 5: '4', 6: '♭5', 7: '5', 8: '♯5', 9: '6', 10: '♭7', 11: '7' }
  const fix = (iv: number) => (q === 'dim7' && iv === 9 ? '♭♭7' : q === 'dom7s9' && iv === 3 ? '♯9' : q === 'dom13' && iv === 9 ? '13' : q === 'm11' && iv === 5 ? '11' : (q === 'dom9' || q === 'maj9' || q === 'm9' || q === 'add9') && iv === 2 ? '9' : LAB[iv])
  return g.map(n => {
    const iv = mod(n.midi - root)
    return { s: n.string, f: n.fret, label: ivs.includes(iv) ? fix(iv) : LAB[iv], role: (iv === 0 ? 'root' : 'chord') as 'root' | 'chord' }
  })
}
