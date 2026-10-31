// Draws a tab as wrapped rows of bars, with the note you are on, the notes you got right,
// and chord names above. Tap any note to hear it and start from there.
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { usePinch } from './Zoomable'
import { restRuns, trackPickup, type SongBar, type SongNote, type SongStep, type SongTrack } from '../tabs/model'
import type { ChordSpan } from '../tabs/harmony'
import { pcName } from '../theory/notes'
import { countLabel, type StrumPattern } from '../play/strumCoach'

export type LabelMode = 'fret' | 'note' | 'both'
/** per step: 0 not played yet · 1 right first time · 2 right after a wrong note (or skipped) · 3 wrong note just now */
export type StepState = 0 | 1 | 2 | 3

const GAP = 17
const TOP = 30
const BOTTOM = 12
const PAD_L = 10
const PAD_R = 8

function stepWidth(dur: number, mode: LabelMode) {
  const base = 15 + 8 * Math.log2(Math.min(dur, 4) / 0.25 + 1)
  return Math.round(base + (mode === 'both' ? 12 : mode === 'note' ? 4 : 0))
}
type ChordMark = { at: number; name: string; guess: boolean }
/** How wide each step is drawn: room for its rhythm, its widest note (with technique marks), the chord name and words. */
function stepWidths(steps: SongStep[], mode: LabelMode, flats: boolean, chords: ChordMark[], strum = false) {
  const w = steps.map(st => {
    let need = stepWidth(st.dur, mode)
    // strum arrows need room for every eighth note
    if (strum && st.chord) need = Math.max(need, st.dur * 30)
    for (const n of st.notes) {
      const dead = n.tech === 'x'
      const name = pcName(n.midi % 12, flats)
      const main = dead ? 'x' : mode === 'note' ? name : String(n.fret)
      const tw = main.length * 7.6 + (mode === 'both' && !dead ? name.length * 6 + 1 : 0)
      // the note is centred; a technique mark (h, p, /, b …) sits to its right
      need = Math.max(need, tw + 10 + (n.tech && !dead ? 2 * (n.tech.length * 6 + 3) : 0))
    }
    if (st.lyric) need = Math.max(need, Math.round(st.lyric.length * 6.4) + 12)
    if (st.chord) need = Math.max(need, st.chord.length * 9 + 8)
    return Math.round(need)
  })
  for (const c of chords) if (c.at >= 0 && c.at < w.length) w[c.at] = Math.max(w[c.at], c.name.length * 9 + 8)
  return w
}
/** A bar is drawn in one piece, or split into pieces when it's wider than the tab box. */
interface Piece { from: number; to: number; chords: ChordMark[]; widths: number[] }

interface BarProps {
  bar: SongBar
  index: number
  start: number
  nStr: number
  tuning: number[]
  mode: LabelMode
  flats: boolean
  /** cursor position inside this bar, or -1 */
  cursor: number
  /** one character per step (StepState) */
  states: string
  chords: ChordMark[]
  /** step widths (for this piece) */
  widths: number[]
  /** this piece starts the bar / ends the bar (long bars are split over lines) */
  first: boolean
  final: boolean
  last: boolean
  /** step that was just played right (re-keyed so the flash restarts), or -1 */
  flash: number
  flashKey: number
  /** this bar is inside the practice loop: '' no, 'in', or where the loop starts/ends */
  loop: '' | 'in' | 'start' | 'end' | 'both'
  /** choosing loop bars: tap anywhere on the bar */
  selecting: boolean
  onTap: (flatIdx: number, note: SongNote | null) => void
  onBar: (bar: number) => void
  /** chord sheets: leave a row under the strings for the words */
  lyricRow: boolean
  /** a row under the strings for the rhythm: stems and counts (tabs) or strum arrows (chord sheets) */
  rhythmRow: boolean
  /** each step's start inside its bar, in beats (pickup bars are shifted to end on the last beat) */
  offs: number[]
  /** the strum pattern to draw over chord steps, or null */
  strum: StrumPattern | null
}

const RHYTHM_H = 30
const BarView = memo(function BarView({ bar, index, start, nStr, tuning, mode, flats, cursor, states, chords, widths, first, final, last, flash, flashKey, loop, selecting, onTap, onBar, lyricRow, rhythmRow, offs, strum }: BarProps) {
  const xs: number[] = []
  let x = PAD_L
  for (const w of widths) { xs.push(x + w / 2); x += w }
  const width = Math.max(44, x + PAD_R)
  const height = TOP + (nStr - 1) * GAP + BOTTOM + (lyricRow ? 20 : 0) + (rhythmRow ? RHYTHM_H : 0)
  const y = (s: number) => TOP + (nStr - 1 - s) * GAP
  const yTop = y(nStr - 1)
  const yBot = y(0)
  return (
    <svg className={`tab-bar${selecting ? ' selecting' : ''}`} data-bar={index} width={width} height={height} viewBox={`0 0 ${width} ${height}`}
      onClick={selecting ? () => onBar(index) : undefined}>
      {loop && <rect className="tab-loopband" x={0} y={yTop - 12} width={width} height={yBot - yTop + 24} />}
      {(loop === 'start' || loop === 'both') && <path className="tab-loopmark" d={`M2,${yTop - 12} h10 M2,${yTop - 12} v${yBot - yTop + 24} M2,${yBot + 12} h10`} />}
      {(loop === 'end' || loop === 'both') && <path className="tab-loopmark" d={`M${width - 2},${yTop - 12} h-10 M${width - 2},${yTop - 12} v${yBot - yTop + 24} M${width - 2},${yBot + 12} h-10`} />}
      {first && <text className="tab-barno" x={3} y={10}>{index + 1}</text>}
      {first && bar.steps[0]?.section && <text className="tab-section" x={index + 1 >= 10 ? 18 : 13} y={10}>{bar.steps[0].section}</text>}
      {lyricRow && bar.steps.map((st, i) => st.lyric ? <text key={`l${i}`} className="tab-lyric" x={xs[i] - widths[i] / 2 + 3} y={yBot + BOTTOM + 14 + (rhythmRow ? RHYTHM_H : 0)}>{st.lyric}</text> : null)}
      {rhythmRow && <Rhythm steps={bar.steps} xs={xs} widths={widths} offs={offs} y0={yBot + 7} strum={strum} />}
      {Array.from({ length: nStr }, (_, s) => (
        <line key={s} x1={0} x2={width} y1={y(s)} y2={y(s)} className="tab-line" />
      ))}
      {first ? <line x1={0.5} x2={0.5} y1={yTop} y2={yBot} className="tab-barline" /> : <line x1={0.5} x2={0.5} y1={yTop} y2={yBot} className="tab-cont" />}
      {!final && <line x1={width - 0.5} x2={width - 0.5} y1={yTop} y2={yBot} className="tab-cont" />}
      {last && <line x1={width - 1.5} x2={width - 1.5} y1={yTop} y2={yBot} className="tab-barline" strokeWidth={3} />}
      {cursor >= 0 && (
        <rect className="tab-cursor" x={xs[cursor] - widths[cursor] / 2 + 1} y={yTop - 9} width={widths[cursor] - 2} height={yBot - yTop + 18} rx={5} />
      )}
      {flash >= 0 && (
        <rect key={flashKey} className="tab-hitflash" x={xs[flash] - widths[flash] / 2 + 1} y={yTop - 9} width={widths[flash] - 2} height={yBot - yTop + 18} rx={5} />
      )}
      {chords.map(c => (
        <g key={c.at} className="tab-chord-hit" data-chord={c.name} data-flat={start + c.at}>
          <rect x={xs[c.at] - widths[c.at] / 2} y={2} width={Math.max(widths[c.at], c.name.length * 9 + 12)} height={30} fill="transparent" />
          <text className={`tab-chord${c.guess ? ' guess' : ''}`} x={xs[c.at] - widths[c.at] / 2 + 2} y={24}>{c.name}</text>
        </g>
      ))}
      {/* a bar with nothing to play gets a whole-bar rest, so it doesn't look like missing tab */}
      {first && final && bar.steps.every(s => !s.notes.length) && nStr > 2 && (
        <rect className="tab-rest-mark" x={width / 2 - 7} y={y(nStr - 2)} width={14} height={6} />
      )}
      {bar.steps.map((st, i) => {
        const state = states[i]
        const isCur = i === cursor
        return (
          <g key={i} onClick={selecting ? undefined : () => onTap(start + i, null)}>
            <rect x={xs[i] - widths[i] / 2} y={yTop - 10} width={widths[i]} height={yBot - yTop + 20} fill="transparent" />
            {st.notes.map((n, k) => {
              const name = pcName(n.midi % 12, flats)
              const dead = n.tech === 'x'
              const main = dead ? 'x' : mode === 'note' ? name : String(n.fret)
              const tw = main.length * 7.6 + (mode === 'both' && !dead ? name.length * 6 + 1 : 0)
              const cls = `tab-note${isCur ? (state === '3' ? ' cur miss' : ' cur') : state === '1' ? ' hit' : state === '2' ? ' late' : ''}`
              const cy = y(n.string)
              if (n.string >= nStr || cy === undefined) return null
              return (
                <g key={k} className={cls} onClick={selecting ? undefined : e => { e.stopPropagation(); onTap(start + i, n) }}>
                  <rect x={xs[i] - tw / 2 - 3} y={cy - 8.5} width={tw + 6} height={17} rx={4} />
                  <text x={xs[i] - tw / 2} y={cy + 5}>
                    {main}
                    {mode === 'both' && !dead && <tspan className="tab-notename" dx={1} dy={-1}>{name}</tspan>}
                  </text>
                  {n.tech && !dead && <text className="tab-tech" x={xs[i] + tw / 2 + 3} y={cy - 3}>{n.tech}</text>}
                </g>
              )
            })}
          </g>
        )
      })}
      <title>{`Bar ${index + 1}, tuning ${tuning.length} strings`}</title>
    </svg>
  )
})

/** Under the strings: note stems with beams and the count (1 & 2 &), or strum arrows over chord steps. */
function Rhythm({ steps, xs, widths, offs, y0, strum }: { steps: SongStep[]; xs: number[]; widths: number[]; offs: number[]; y0: number; strum: StrumPattern | null }) {
  const out: ReactElement[] = []
  const yC = y0 + 21
  const chordBar = strum && steps.length > 0 && steps.every(st => !st.notes.length || !!st.chord)
  if (chordBar && strum) {
    // arrows at each strum of the pattern, placed by time inside the step that covers it
    for (const [p, k] of strum.hits) {
      const i = steps.findIndex((st, j) => offs[j] <= p + 1e-6 && p < offs[j] + st.dur - 1e-6)
      if (i < 0 || !steps[i].notes.length) continue
      const left = xs[i] - widths[i] / 2 + 6
      const x = left + ((p - offs[i]) / steps[i].dur) * (widths[i] - 12) + 4
      const key = `s${p}`
      if (k === 'D' || k === 'U') {
        const d = k === 'D'
        out.push(<path key={key} className={`strum-arrow ${d ? 'down' : 'up'}`} d={d ? `M${x},${y0} v11 m-4,-4 l4,4 l4,-4` : `M${x},${y0 + 11} v-11 m-4,4 l4,-4 l4,4`} />)
      } else if (k === 'X') {
        out.push(<path key={key} className="strum-arrow chop" d={`M${x - 4},${y0 + 2} l8,8 M${x + 4},${y0 + 2} l-8,8`} />)
      } else {
        out.push(<circle key={key} className="strum-bass" cx={x} cy={y0 + 6} r={3.6} />)
      }
      out.push(<text key={`c${p}`} className={`tab-count${p % 1 ? ' off' : ''}`} x={x} y={yC} textAnchor="middle">{countLabel(p)}</text>)
    }
    return <g className="rhythm">{out}</g>
  }
  // stems, beams within each beat, and counts
  const groups: number[][] = []
  steps.forEach((st, i) => {
    if (!st.notes.length) return
    const short = st.dur < 0.99
    const g = groups[groups.length - 1]
    const prev = g?.[g.length - 1]
    if (short && prev !== undefined && prev === i - 1 && steps[prev].dur < 0.99 && Math.floor(offs[prev] + 1e-6) === Math.floor(offs[i] + 1e-6)) g.push(i)
    else groups.push([i])
  })
  const yS = y0 + 12
  for (const g of groups) {
    for (const i of g) {
      const st = steps[i]
      if (st.dur >= 3.99) continue
      out.push(<line key={`st${i}`} className="tab-stem" x1={xs[i]} x2={xs[i]} y1={y0} y2={yS} />)
      if (Math.abs((st.dur * 4) % 3) < 1e-6 && st.dur * 4 >= 3) out.push(<circle key={`dt${i}`} className="tab-dot" cx={xs[i] + 4} cy={yS - 2} r={1.4} />)
    }
    if (g.length >= 2) {
      out.push(<line key={`b${g[0]}`} className="tab-beam" x1={xs[g[0]]} x2={xs[g[g.length - 1]]} y1={yS} y2={yS} />)
      // second beam between sixteenths
      for (let k = 0; k < g.length; k++) {
        const i = g[k]
        if (steps[i].dur > 0.26) continue
        const n = g[k + 1]
        if (n !== undefined && steps[n].dur <= 0.26) out.push(<line key={`b2${i}`} className="tab-beam" x1={xs[i]} x2={xs[n]} y1={yS - 3.5} y2={yS - 3.5} />)
        else if (!(k > 0 && steps[g[k - 1]].dur <= 0.26)) out.push(<line key={`b2${i}`} className="tab-beam" x1={xs[i]} x2={xs[i] + (k === g.length - 1 ? -6 : 6)} y1={yS - 3.5} y2={yS - 3.5} />)
      }
    } else {
      const i = g[0]
      const d = steps[i].dur
      if (d < 0.99) out.push(<path key={`f${i}`} className="tab-flag" d={`M${xs[i]},${yS} q5,-2 6,-7`} />)
      if (d <= 0.26) out.push(<path key={`f2${i}`} className="tab-flag" d={`M${xs[i]},${yS - 4} q5,-2 6,-7`} />)
    }
  }
  steps.forEach((st, i) => {
    const l = countLabel(offs[i])
    if (l) out.push(<text key={`c${i}`} className={`tab-count${st.notes.length ? '' : ' rest'}${l.length === 1 && /\d/.test(l) ? '' : ' off'}`} x={xs[i]} y={yC} textAnchor="middle">{l}</text>)
  })
  return <g className="rhythm">{out}</g>
}

/** Bars with nothing to play in a row (a guitar part that comes in late, a long break) drawn as one short block,
 *  so the tab doesn't open on lines of empty staff. While the playhead is in it, it counts the bars. */
function RestBlock({ from, to, nStr, lyricRow, rhythmRow, section, at, loop, selecting, onTap, onBar }: {
  from: number; to: number; nStr: number; lyricRow: boolean; rhythmRow: boolean; section?: string
  /** bar the playhead is on, counted from 1 inside the block, or 0 */
  at: number
  loop: BarProps['loop']; selecting: boolean; onTap: () => void; onBar: () => void
}) {
  const n = to - from + 1
  if (from === 0) {
    // the part starts with rests: one slim line above the tab instead of a row of staff
    return (
      <button type="button" className={`tab-lead-rest${at ? ' on' : ''}${loop ? ' in-loop' : ''}${selecting ? ' selecting' : ''}`} data-bar={from} data-to={to}
        onClick={selecting ? onBar : onTap}>
        <svg width="30" height="12" viewBox="0 0 30 12" aria-hidden="true">
          <rect className="tab-rest-mark" x={4} y={2} width={22} height={8} rx={1} />
          <line className="tab-rest-end" x1={3} x2={3} y1={0} y2={12} /><line className="tab-rest-end" x1={27} x2={27} y1={0} y2={12} />
        </svg>
        {section && <b className="tlr-section">{section}</b>}
        {at ? <b>Rest: bar {at} of {n}</b> : <span><b>Rest {n} bars</b>, you come in at bar {to + 2}</span>}
      </button>
    )
  }
  const width = 112
  const height = TOP + (nStr - 1) * GAP + BOTTOM + (lyricRow ? 20 : 0) + (rhythmRow ? RHYTHM_H : 0)
  const yTop = TOP, yBot = TOP + (nStr - 1) * GAP
  const mid = (yTop + yBot) / 2
  return (
    <svg className={`tab-bar tab-rest${selecting ? ' selecting' : ''}${at ? ' on' : ''}`} data-bar={from} data-to={to} width={width} height={height}
      viewBox={`0 0 ${width} ${height}`} role="button" aria-label={`Bars ${from + 1} to ${to + 1}: rest for ${n} bars`}
      onClick={selecting ? onBar : onTap}>
      {loop && <rect className="tab-loopband" x={0} y={yTop - 12} width={width} height={yBot - yTop + 24} />}
      {(loop === 'start' || loop === 'both') && <path className="tab-loopmark" d={`M2,${yTop - 12} h10 M2,${yTop - 12} v${yBot - yTop + 24} M2,${yBot + 12} h10`} />}
      {(loop === 'end' || loop === 'both') && <path className="tab-loopmark" d={`M${width - 2},${yTop - 12} h-10 M${width - 2},${yTop - 12} v${yBot - yTop + 24} M${width - 2},${yBot + 12} h-10`} />}
      <text className="tab-barno" x={3} y={10}>{`${from + 1}–${to + 1}`}</text>
      {section && <text className="tab-section" x={36} y={10}>{section}</text>}
      {Array.from({ length: nStr }, (_, s) => <line key={s} x1={0} x2={width} y1={yTop + s * GAP} y2={yTop + s * GAP} className="tab-line" />)}
      <line x1={0.5} x2={0.5} y1={yTop} y2={yBot} className="tab-barline" />
      <line x1={width - 0.5} x2={width - 0.5} y1={yTop} y2={yBot} className="tab-barline" />
      {at > 0 && <rect className="tab-cursor" x={4} y={yTop - 9} width={width - 8} height={yBot - yTop + 18} rx={5} />}
      {/* the multi-bar rest sign: a thick bar with end strokes, and how many bars */}
      <rect className="tab-rest-mark" x={22} y={mid - 4} width={width - 44} height={8} rx={1} />
      <line className="tab-rest-end" x1={21} x2={21} y1={mid - 9} y2={mid + 9} />
      <line className="tab-rest-end" x1={width - 21} x2={width - 21} y1={mid - 9} y2={mid + 9} />
      <text className={at ? 'tab-rest-count' : 'tab-rest-label'} x={width / 2} y={24} textAnchor="middle">
        {at ? `bar ${at} of ${n}` : `rest ${n} bars`}
      </text>
      <title>{`Rest for ${n} bars (bars ${from + 1}–${to + 1})`}</title>
    </svg>
  )
}

interface Props {
  track: SongTrack
  mode: LabelMode
  flats: boolean
  /** flat index of the step to play next */
  cursor: number
  /** true while the tab is being played back (the cursor is the playhead) */
  playing?: boolean
  states: Uint8Array
  version: number
  spans: ChordSpan[]
  /** flat index of the step just played right, with a counter to restart the flash */
  flash?: { flat: number; key: number } | null
  /** practice loop, in bars (inclusive) */
  loop?: { from: number; to: number } | null
  selecting?: boolean
  onTap: (flatIdx: number, note: SongNote | null) => void
  onBar?: (bar: number) => void
  /** the A−/A+ tab size, so long bars can be split to fit the box */
  zoom?: number
  /** pinch to zoom changes the tab size (Play keeps it with the A−/A+ buttons); without it the tab zooms by itself */
  onZoom?: (z: number) => void
  /** beats in a bar (for the counts) */
  meter?: number
  /** show stems and counts under the tab */
  counts?: boolean
  /** chord sheets: the strum pattern to draw */
  strum?: StrumPattern | null
}

export function TabView({ track, mode, flats, cursor, playing, states, version, spans, flash, loop, selecting = false, onTap, onBar = () => {}, zoom: zoomProp, onZoom, meter = 4, counts = false, strum = null }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  // pinch to zoom: Play owns the size (A−/A+); previews keep their own
  const [ownZoom, setOwnZoom] = useState(1)
  const zoom = zoomProp ?? ownZoom
  const keepPinch = usePinch(ref, () => zoom, z => (onZoom ?? setOwnZoom)(z), { min: 0.7, max: 2.4 })
  useLayoutEffect(() => { keepPinch() }, [zoom]) // eslint-disable-line react-hooks/exhaustive-deps
  // the tab box's inner width, so bars wider than it are split over lines instead of running off the edge
  const [boxW, setBoxW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth))
    ro.observe(el)
    setBoxW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const starts = useMemo(() => {
    const out: number[] = []
    let n = 0
    for (const b of track.bars) { out.push(n); n += b.steps.length }
    return out
  }, [track])
  const chordsByBar = useMemo(() => {
    const m = new Map<number, { at: number; name: string; guess: boolean }[]>()
    for (const sp of spans) {
      // which bar holds the span's first step
      let b = 0
      while (b + 1 < starts.length && starts[b + 1] <= sp.start) b++
      const list = m.get(b) ?? []
      list.push({ at: sp.start - starts[b], name: sp.name, guess: sp.source === 'guess' })
      m.set(b, list)
    }
    return m
  }, [spans, starts])

  const avail = boxW > 0 ? Math.floor((boxW - 10) / (zoom || 1)) : 0
  const pieces = useMemo(() => track.bars.map((bar, i): Piece[] => {
    const chords = chordsByBar.get(i) ?? NONE
    const widths = stepWidths(bar.steps, mode, flats, chords, !!strum)
    const total = PAD_L + widths.reduce((a, b) => a + b, 0) + PAD_R
    if (!avail || total <= avail || bar.steps.length < 2) return [{ from: 0, to: bar.steps.length, chords, widths }]
    const out: Piece[] = []
    let from = 0, sum = 0
    for (let k = 0; k < widths.length; k++) {
      if (k > from && PAD_L + sum + widths[k] + PAD_R > avail) { out.push({ from, to: k, chords: [], widths: [] }); from = k; sum = 0 }
      sum += widths[k]
    }
    out.push({ from, to: widths.length, chords: [], widths: [] })
    return out.map(p => ({ ...p, widths: widths.slice(p.from, p.to), chords: chords.filter(c => c.at >= p.from && c.at < p.to).map(c => ({ ...c, at: c.at - p.from })) }))
  }), [track, mode, flats, chordsByBar, avail, strum])
  // where each step starts in its bar; a short first bar (pickup) ends on the last beat
  const offsets = useMemo(() => track.bars.map((bar, i) => {
    let o = i === 0 ? trackPickup(track, meter) : 0
    return bar.steps.map(s => { const at = o; o += s.dur; return at })
  }), [track, meter])
  const sheet = useMemo(() => track.bars.every(b => b.steps.every(s => !s.notes.length || !!s.chord)) && track.bars.some(b => b.steps.some(s => s.chord)), [track])
  const rhythmRow = sheet ? !!strum : counts

  // bars with nothing to play in a row become one rest block (runOf: bar → the run it's in, or -1)
  const { runs, runOf } = useMemo(() => {
    const runs = restRuns(track, b => chordsByBar.has(b))
    const runOf = new Int32Array(track.bars.length).fill(-1)
    runs.forEach((r, k) => { for (let b = r.from; b <= r.to; b++) runOf[b] = k })
    return { runs, runOf }
  }, [track, chordsByBar])

  let cursorBar = 0
  while (cursorBar + 1 < starts.length && starts[cursorBar + 1] <= cursor) cursorBar++
  const scrollBar = runOf[cursorBar] >= 0 ? runs[runOf[cursorBar]].from : cursorBar

  // keep the bar you are on in view
  useEffect(() => {
    const box = ref.current
    const el = box?.querySelector<SVGElement>(`[data-bar="${scrollBar}"]`)
    if (!box || !el) return
    const top = (el as unknown as HTMLElement).getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop
    const h = box.clientHeight
    if (top < box.scrollTop + 4 || top > box.scrollTop + h * 0.55) box.scrollTo({ top: Math.max(0, top - h * 0.18), behavior: 'smooth' })
  }, [scrollBar, track])

  const empty = ''
  const lyricRow = useMemo(() => track.bars.some(b => b.steps.some(s => s.lyric)), [track])
  return (
    <div className={`tab-view${playing ? ' playing' : ''}${selecting ? ' selecting' : ''}`} ref={ref} data-version={version}>
      <div className="tab-rows" style={{ zoom }}>
        {track.bars.map((bar, i) => {
          const start = starts[i]
          const run = runOf[i] >= 0 ? runs[runOf[i]] : null
          if (run) {
            if (run.from !== i) return null
            const inL = !!loop && loop.from <= run.to && loop.to >= run.from
            const ls = inL && loop!.from >= run.from, le = inL && loop!.to <= run.to
            const end = run.to + 1 < starts.length ? starts[run.to + 1] : Infinity
            return (
              <RestBlock key={`r${i}`} from={run.from} to={run.to} nStr={track.tuning.length} lyricRow={lyricRow} rhythmRow={rhythmRow}
                section={bar.steps[0]?.section} at={cursor >= start && cursor < end ? cursorBar - run.from + 1 : 0}
                loop={!inL ? '' : ls && le ? 'both' : ls ? 'start' : le ? 'end' : 'in'} selecting={selecting}
                onTap={() => onTap(start, null)} onBar={() => onBar(run.from)} />
            )
          }
          const inLoop = loop && i >= loop.from && i <= loop.to
          const lp: BarProps['loop'] = !inLoop ? '' : loop!.from === i && loop!.to === i ? 'both' : loop!.from === i ? 'start' : loop!.to === i ? 'end' : 'in'
          const ps = pieces[i]
          return ps.map((p, j) => {
            const s0 = start + p.from, n = p.to - p.from
            let st = empty
            for (let k = 0; k < n; k++) st += String(states[s0 + k] ?? 0)
            const cur = cursor >= s0 && cursor < s0 + n ? cursor - s0 : -1
            const fl = flash && flash.flat >= s0 && flash.flat < s0 + n ? flash.flat - s0 : -1
            const first = j === 0, final = j === ps.length - 1
            const plp: BarProps['loop'] = !lp || lp === 'in' ? lp
              : lp === 'both' ? (first && final ? 'both' : first ? 'start' : final ? 'end' : 'in')
              : lp === 'start' ? (first ? 'start' : 'in') : (final ? 'end' : 'in')
            return (
              <BarView
                key={`${i}.${j}`}
                bar={ps.length === 1 ? bar : { steps: bar.steps.slice(p.from, p.to) }}
                index={i}
                start={s0}
                nStr={track.tuning.length}
                tuning={track.tuning}
                mode={mode}
                flats={flats}
                cursor={cur}
                states={st}
                chords={p.chords}
                widths={p.widths}
                first={first}
                final={final}
                last={final && i === track.bars.length - 1}
                flash={fl}
                flashKey={fl >= 0 ? flash!.key : 0}
                loop={plp}
                selecting={selecting}
                onTap={onTap}
                onBar={onBar}
                lyricRow={lyricRow}
                rhythmRow={rhythmRow}
                offs={offsets[i].slice(p.from, p.to)}
                strum={sheet ? strum : null}
              />
            )
          })
        })}
      </div>
    </div>
  )
}
const NONE: ChordMark[] = []
