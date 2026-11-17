// Side-by-side chord diagrams for a whole progression: shows every chord box & fingering at once
// (never hiding the rest of the progression behind the first or current chord), with active highlight and tap-to-hear.
import type { Instrument } from '../instrument'
import { chordShapes, useInstrument } from '../instrument'
import { parseSymbol, type Voicing } from '../theory/chords'
import { shapesFor } from '../theory/shapes'
import { flatten, type SongTrack } from '../tabs/model'
import type { ChordSpan } from '../tabs/harmony'
import { strum } from '../audio/pluck'
import { audio } from '../audio/engine'
import { ChordDiagram } from './ChordDiagram'

export interface ProgDiagramItem {
  name: string
  voicing: Voicing
  /** step indices in flattened track where this diagram is active */
  stepIndices?: number[]
  /** bar index to seek to when clicked */
  bar?: number
}

const SAME = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i])

/** Build a full Voicing (matching chords-db fingerings/barres when available, or inferring clean barres & fingers). */
export function voicingFromFrets(
  frets: number[],
  chordName?: string,
  inst?: Instrument,
  customFingers?: number[],
): Voicing {
  const n = frets.length
  const played = frets.filter(f => f > 0)
  const minF = played.length ? Math.min(...played) : 1
  const maxF = played.length ? Math.max(...played) : 1
  const baseFret = maxF <= 4 ? 1 : minF

  let dbMatch: Voicing | undefined
  if (chordName && inst) {
    const parsed = parseSymbol(chordName)
    const list = chordShapes(parsed.root, parsed.suffix, inst)
    dbMatch = list.find(v => SAME(v.frets, frets))
    if (!dbMatch && played.length >= 3) {
      dbMatch = list.find(v => v.frets.length === n && frets.every((f, s) => f < 0 || f === v.frets[s]))
    }
  }

  let barres: number[] = []
  let fingers: number[] = customFingers && customFingers.length === n ? [...customFingers] : []

  if (dbMatch && !customFingers) {
    // Keep only barres where >= 2 strings in `frets` actually hold that fret
    barres = dbMatch.barres.filter(b => frets.filter(f => f === b).length >= 2)
    fingers = frets.map((f, s) => (f > 0 ? (dbMatch!.fingers[s] ?? 0) : 0))
  } else {
    // Detect practical barres: >= 2 strings on `minF` spanning >= 3 strings (or top-3 triad) with no open/muted strings in between
    const atMin = frets.map((f, i) => (f === minF ? i : -1)).filter(i => i >= 0)
    if (atMin.length >= 2) {
      const a = atMin[0], z = atMin[atMin.length - 1]
      const spanAll = frets.slice(a, z + 1).every(f => f >= minF)
      const looksLikeBarre = spanAll && (z - a >= 3 || (atMin.length >= 3 && minF > 0))
      if (looksLikeBarre) barres = [minF]
    }
    if (!fingers.length) {
      fingers = Array(n).fill(0)
      const remaining: { s: number; f: number }[] = []
      for (let s = 0; s < n; s++) {
        const f = frets[s]
        if (f <= 0) continue
        if (barres.includes(f)) fingers[s] = 1
        else remaining.push({ s, f })
      }
      remaining.sort((x, y) => x.f - y.f || x.s - y.s)
      let nextF = barres.length ? 2 : 1
      for (const r of remaining) {
        fingers[r.s] = Math.min(4, nextF++)
      }
    }
  }

  const midi = inst
    ? frets.map((f, s) => (f >= 0 && s < inst.midis.length ? inst.midis[s] + f : -1)).filter(m => m >= 0)
    : []

  return { frets: [...frets], fingers, barres, baseFret, midi }
}

/** Look up a playable Voicing for a chord symbol (e.g. "Bbmaj7", "F#m"). */
export function voicingForChordName(chordName: string, inst: Instrument, nearFret = 0): Voicing | null {
  const { root, suffix } = parseSymbol(chordName)
  const type = suffix === 'major' ? '' : suffix === 'minor' ? 'm' : suffix
  let list = chordShapes(root, suffix, inst)
  if (!list.length) list = shapesFor({ root, type }, inst)
  if (!list.length) return null
  return list.slice().sort((a, b) => Math.abs(a.baseFret - nearFret) - Math.abs(b.baseFret - nearFret))[0]
}

/** Convert an explicit progression of chord names into chord diagram items. */
export function progressionFromChords(
  chords: string[],
  inst: Instrument,
  opts?: { nearFret?: number; collapseRepeats?: boolean },
): ProgDiagramItem[] {
  const near = opts?.nearFret ?? 0
  const raw: ProgDiagramItem[] = []
  chords.forEach((sym, i) => {
    const v = voicingForChordName(sym, inst, near)
    if (v) raw.push({ name: sym, voicing: v, stepIndices: [i], bar: i })
  })
  return opts?.collapseRepeats ? collapseDiagramSequence(raw) : raw
}

/** Collapse consecutive identical diagrams and clean repeating cycles (e.g. Bb-F-Bb-F -> Bb-F) while keeping step mappings. */
export function collapseDiagramSequence(items: ProgDiagramItem[]): ProgDiagramItem[] {
  if (!items.length) return []
  const keyOf = (x: ProgDiagramItem) => `${x.name}|${x.voicing.frets.join(',')}`
  const merged: ProgDiagramItem[] = []
  for (const it of items) {
    const prev = merged[merged.length - 1]
    if (prev && keyOf(prev) === keyOf(it)) {
      if (it.stepIndices?.length) prev.stepIndices = [...(prev.stepIndices ?? []), ...it.stepIndices]
    } else {
      merged.push({ ...it, stepIndices: it.stepIndices ? [...it.stepIndices] : undefined })
    }
  }
  const n = merged.length
  // Check for clean repeating cycle of length P (2..6), such as [Bb, F, Bb, F, ...]
  for (let p = 2; p <= Math.min(6, Math.floor(n / 2)); p++) {
    if (n % p !== 0) continue
    let ok = true
    for (let i = p; i < n; i++) {
      if (keyOf(merged[i]) !== keyOf(merged[i % p])) { ok = false; break }
    }
    if (ok) {
      const cycle = merged.slice(0, p).map(x => ({ ...x, stepIndices: x.stepIndices ? [...x.stepIndices] : [] }))
      for (let i = p; i < n; i++) {
        const idx = merged[i].stepIndices
        if (idx?.length) cycle[i % p].stepIndices!.push(...idx)
      }
      return cycle
    }
  }
  // If very long (> 8 chords), keep unique chord shapes in order of first appearance
  if (merged.length > 8) {
    const seen = new Map<string, ProgDiagramItem>()
    for (const it of merged) {
      const k = keyOf(it)
      const hit = seen.get(k)
      if (hit) {
        if (it.stepIndices?.length) hit.stepIndices = [...(hit.stepIndices ?? []), ...it.stepIndices]
      } else {
        seen.set(k, { ...it, stepIndices: it.stepIndices ? [...it.stepIndices] : undefined })
      }
    }
    return [...seen.values()]
  }
  return merged
}

/** Extract all chord diagrams & tab fingerings from a SongTrack (with optional ChordSpans). */
export function progressionFromTrack(
  track: SongTrack,
  inst?: Instrument,
  spans?: ChordSpan[],
): ProgDiagramItem[] {
  const flat = flatten(track)
  if (!flat.length) return []
  const nStr = track.tuning.length

  interface SpanWin { name: string; start: number; end: number; bar: number }
  const wins: SpanWin[] = []

  if (spans && spans.length > 0) {
    for (const sp of spans) wins.push({ name: sp.name, start: sp.start, end: sp.end, bar: sp.bar })
  } else {
    const anyNamed = flat.some(fs => !!fs.step.chord)
    if (anyNamed) {
      let curName = ''
      let curStart = 0
      let curBar = flat[0].bar
      for (let i = 0; i < flat.length; i++) {
        const ch = flat[i].step.chord
        if (ch && ch !== curName) {
          if (curName) wins.push({ name: curName, start: curStart, end: i, bar: curBar })
          curName = ch
          curStart = i
          curBar = flat[i].bar
        } else if (!curName && ch) {
          curName = ch
          curStart = i
          curBar = flat[i].bar
        }
      }
      if (curName) wins.push({ name: curName, start: curStart, end: flat.length, bar: curBar })
    } else {
      // No chord names in tab: extract multi-note chord shapes per bar if this is a chord/riff track
      const hasMulti = flat.some(fs => fs.step.notes.length >= 2)
      if (!hasMulti) return []
      let curStart = 0
      let curBar = flat[0].bar
      for (let i = 1; i <= flat.length; i++) {
        if (i === flat.length || flat[i].bar !== curBar) {
          wins.push({ name: `Bar ${curBar + 1}`, start: curStart, end: i, bar: curBar })
          if (i < flat.length) { curStart = i; curBar = flat[i].bar }
        }
      }
    }
  }

  const raw: ProgDiagramItem[] = []
  for (const w of wins) {
    const slice = flat.slice(w.start, w.end)
    const stepIndices = Array.from({ length: w.end - w.start }, (_, k) => w.start + k)
    const multiStep = slice.find(fs => fs.step.notes.length >= 2)
    let frets: number[] | null = null

    if (multiStep && multiStep.step.notes.length >= 3) {
      frets = Array(nStr).fill(-1)
      for (const n of multiStep.step.notes) frets[n.string] = n.fret
      // Include a preceding bass note on a lower string in the same bar if beat 1 was split bass + strum
      const mIdx = slice.indexOf(multiStep)
      if (mIdx === 1 && slice[0].step.notes.length === 1 && slice[0].bar === multiStep.bar) {
        const bn = slice[0].step.notes[0]
        if (frets[bn.string] < 0) frets[bn.string] = bn.fret
      }
    } else {
      // Check if an arpeggio/picking span touches >= 3 distinct strings across its first bar
      const firstBar = slice[0]?.bar
      const arpFrets = Array(nStr).fill(-1)
      let touched = 0
      for (const fs of slice) {
        if (fs.bar !== firstBar) break
        for (const n of fs.step.notes) {
          if (arpFrets[n.string] < 0) { arpFrets[n.string] = n.fret; touched++ }
        }
      }
      if (touched >= 3) {
        frets = arpFrets
      } else if (multiStep) {
        frets = Array(nStr).fill(-1)
        for (const n of multiStep.step.notes) frets[n.string] = n.fret
      }
    }

    let voicing: Voicing | null = null
    if (frets && frets.some(f => f >= 0)) {
      voicing = voicingFromFrets(frets, w.name.startsWith('Bar ') ? undefined : w.name, inst)
    } else if (inst && !w.name.startsWith('Bar ')) {
      voicing = voicingForChordName(w.name, inst)
    }

    if (voicing) raw.push({ name: w.name, voicing, stepIndices, bar: w.bar })
  }

  return collapseDiagramSequence(raw)
}

interface StripProps {
  items: ProgDiagramItem[]
  activeIndex?: number
  size?: number
  tuning?: number[]
  capo?: number
  onSelect?: (item: ProgDiagramItem, index: number) => void
  label?: string
  compact?: boolean
}

export function ProgressionDiagrams({
  items,
  activeIndex = -1,
  size = 0.72,
  tuning,
  capo = 0,
  onSelect,
  label = 'Chord fingerings in this progression',
  compact,
}: StripProps) {
  const inst = useInstrument()
  const midis = tuning ?? inst.midis
  if (!items.length) return null

  const playAndSelect = (it: ProgDiagramItem, i: number) => {
    const notes = it.voicing.frets.some(f => f >= 0) && midis.length >= it.voicing.frets.length
      ? it.voicing.frets.map((f, s) => (f >= 0 ? midis[s] + f + capo : -1)).filter(m => m > 0)
      : it.voicing.midi
    if (notes.length) {
      const ctx = audio()
      void ctx.resume()
      strum(notes, ctx.currentTime + 0.015)
    }
    onSelect?.(it, i)
  }

  return (
    <div className={`prog-diagrams-strip${compact ? ' compact' : ''}`} role="list" aria-label={label} data-testid="prog-diagrams">
      {items.map((it, i) => (
        <div key={`${it.name}-${i}`} role="listitem" className={`prog-diagram-item${i === activeIndex ? ' on' : ''}`}>
          <ChordDiagram
            name={it.name}
            voicing={it.voicing}
            active={i === activeIndex}
            size={size}
            onClick={() => playAndSelect(it, i)}
          />
        </div>
      ))}
    </div>
  )
}
