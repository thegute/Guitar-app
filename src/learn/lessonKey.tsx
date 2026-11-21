// "Change the key" for lessons: one shift (in semitones) shared by every diagram, sound and exercise of the lesson
// you're reading, like a capo you can move up or down. Each neck picture has a Key menu; picking a key there moves the
// whole lesson with it, so a C-major lesson can be studied in D, G, E… The text keeps its written key and numbers;
// a moved picture says how far it moved.
import { createContext, useContext, useState, type ReactNode } from 'react'
import { keyPrefersFlats, pcName } from '../theory/notes'

export const r12 = (n: number) => ((n % 12) + 12) % 12
/** −5 … +6: the nearest way to move (so sounds and shapes stay in a sensible range). */
export const nearShift = (k: number) => { const d = r12(k); return d > 6 ? d - 12 : d }

type Ctx = { shift: number; setShift: (k: number) => void; on: boolean }
const KeyCtx = createContext<Ctx>({ shift: 0, setShift: () => {}, on: false })

export function LessonKeyProvider({ children, id }: { children: ReactNode; id?: string }) {
  const store = id ? `kg:lessonKey:${id}` : ''
  const [shift, set] = useState(() => { try { return store ? nearShift(Number(localStorage.getItem(store)) || 0) : 0 } catch { return 0 } })
  const setShift = (k: number) => { const v = nearShift(k); set(v); try { if (store) { if (v) localStorage.setItem(store, String(v)); else localStorage.removeItem(store) } } catch { /* storage off */ } }
  return <KeyCtx.Provider value={{ shift, setShift, on: true }}>{children}</KeyCtx.Provider>
}
export const useLessonKey = () => useContext(KeyCtx)

type Mark = { s: number; f: number; label: string; role: 'root' | 'chord' | 'scale' | 'target' | 'next' }
const NOTE = /^([A-G])([#b♯♭]?)$/
const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const notePcOf = (label: string) => { const m = NOTE.exec(label); if (!m) return null; return r12(LETTER[m[1]] + (m[2] === '#' || m[2] === '♯' ? 1 : m[2] === 'b' || m[2] === '♭' ? -1 : 0)) }

/** The key a picture is in: the note of its first root mark (null when it has no root). */
export function homeOf(marks: Mark[], midis: number[]): number | null {
  const r = marks.find(m => m.role === 'root')
  return r ? r12(midis[r.s] + r.f) : null
}

/**
 * Move a neck picture by `k` semitones. A shape that fits moves as one piece (up `k` or down `12 − k` frets, whichever
 * stays on the neck, lower first when both fit); a picture of the whole neck (or one that can't fit either way) keeps
 * every copy of each mark that lands on frets 0–15. Degree labels (R, 3, ♭7 …) stay; note names are renamed.
 */
export function shiftMarks(marks: Mark[], midis: number[], k: number, from = 0, to = 12, maxFret = 15): { marks: Mark[]; from: number; to: number } {
  const d = r12(k)
  if (!d || !marks.length) return { marks, from, to }
  const home = homeOf(marks, midis)
  const flats = home !== null ? keyPrefersFlats(pcName(r12(home + d), true)) : false
  const rename = (m: Mark, f: number): Mark => {
    const p = notePcOf(m.label)
    return { ...m, f, label: p === null ? m.label : pcName(r12(p + d), flats) }
  }
  const fs = marks.map(m => m.f)
  const lo = Math.min(...fs), hi = Math.max(...fs)
  const fits = (by: number) => lo + by >= 0 && hi + by <= maxFret
  const whole = hi - lo >= 11 || (from === 0 && to >= 12 && hi - lo >= 9)
  let out: Mark[]
  if (!whole && (fits(d - 12) || fits(d))) {
    // the smaller move keeps the shape nearest where the text puts it
    const by = [d - 12, d].filter(fits).sort((a, b) => Math.abs(a) - Math.abs(b))[0]
    out = marks.map(m => rename(m, m.f + by))
  } else {
    const seen = new Set<string>()
    out = []
    for (const m of marks) for (const f of [m.f + d - 24, m.f + d - 12, m.f + d, m.f + d + 12]) {
      if (f < 0 || f > maxFret || seen.has(`${m.s}:${f}`)) continue
      seen.add(`${m.s}:${f}`); out.push(rename(m, f))
    }
  }
  const ofs = out.map(m => m.f)
  const nlo = Math.min(...ofs), nhi = Math.max(...ofs)
  const span = Math.max(4, to - from)
  const nfrom = from === 0 || nlo <= 1 ? 0 : Math.max(0, Math.min(nlo - 1, nhi - span))
  return { marks: out, from: nfrom, to: Math.min(maxFret, Math.max(nhi + 1, nfrom + span)) }
}

/** The 12 key names, spelled the usual way (C, D♭, D, E♭, E, F, F♯, G, A♭, A, B♭, B). */
export const KEY_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']
const MINOR_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B']

/** The Key menu on a picture: its home key (as written) and the other eleven. Picking one moves the whole lesson. */
export function KeyChip({ home, minor }: { home: number | null; minor?: boolean }) {
  const { shift, setShift, on } = useLessonKey()
  if (!on) return null
  const names = minor ? MINOR_NAMES : KEY_NAMES
  const opts = Array.from({ length: 12 }, (_, i) => i)
  const name = (i: number) => home === null
    ? (i === 0 ? 'As written' : `${i <= 6 ? 'Up' : 'Down'} ${i <= 6 ? i : 12 - i} fret${(i <= 6 ? i : 12 - i) > 1 ? 's' : ''}`)
    : `${names[r12(home + i)]}${minor ? ' minor' : ''}${i === 0 ? ' (as written)' : ''}`
  return (
    <label className={`key-chip${shift ? ' moved' : ''}`} data-testid="key-chip">
      <span>Key</span>
      <select value={r12(shift)} onChange={e => setShift(Number(e.target.value))} aria-label="Change the key of this lesson's pictures and sounds">
        {opts.map(i => <option key={i} value={i}>{name(i)}</option>)}
      </select>
    </label>
  )
}

/** The line under a moved picture. */
export function movedNote(shift: number, home: number | null, minor?: boolean) {
  if (!shift) return null
  const n = Math.abs(shift)
  const dir = shift > 0 ? 'up' : 'down'
  const to = home !== null ? ` to ${(minor ? MINOR_NAMES : KEY_NAMES)[r12(home + shift)]}${minor ? ' minor' : ''}` : ''
  return `Moved ${dir} ${n} fret${n > 1 ? 's' : ''}${to}. The text keeps the written key, so its fret numbers are ${n} ${shift > 0 ? 'lower' : 'higher'} than these (or 12 frets away).`
}
