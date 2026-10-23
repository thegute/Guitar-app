// Draws a tab as wrapped rows of bars, with the note you are on, the notes you got right,
// and chord names above. Tap any note to hear it and start from there.
import { memo, useEffect, useMemo, useRef } from 'react'
import type { SongBar, SongNote, SongTrack } from '../tabs/model'
import type { ChordSpan } from '../tabs/harmony'
import { pcName } from '../theory/notes'

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
  chords: { at: number; name: string; guess: boolean }[]
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
}

const BarView = memo(function BarView({ bar, index, start, nStr, tuning, mode, flats, cursor, states, chords, last, flash, flashKey, loop, selecting, onTap, onBar, lyricRow }: BarProps) {
  const widths = bar.steps.map(s => Math.max(stepWidth(s.dur, mode), s.lyric ? Math.round(s.lyric.length * 6.4) + 12 : 0, s.chord ? s.chord.length * 9 + 8 : 0))
  const xs: number[] = []
  let x = PAD_L
  for (const w of widths) { xs.push(x + w / 2); x += w }
  const width = Math.max(44, x + PAD_R)
  const height = TOP + (nStr - 1) * GAP + BOTTOM + (lyricRow ? 20 : 0)
  const y = (s: number) => TOP + (nStr - 1 - s) * GAP
  const yTop = y(nStr - 1)
  const yBot = y(0)
  return (
    <svg className={`tab-bar${selecting ? ' selecting' : ''}`} data-bar={index} width={width} height={height} viewBox={`0 0 ${width} ${height}`}
      onClick={selecting ? () => onBar(index) : undefined}>
      {loop && <rect className="tab-loopband" x={0} y={yTop - 12} width={width} height={yBot - yTop + 24} />}
      {(loop === 'start' || loop === 'both') && <path className="tab-loopmark" d={`M2,${yTop - 12} h10 M2,${yTop - 12} v${yBot - yTop + 24} M2,${yBot + 12} h10`} />}
      {(loop === 'end' || loop === 'both') && <path className="tab-loopmark" d={`M${width - 2},${yTop - 12} h-10 M${width - 2},${yTop - 12} v${yBot - yTop + 24} M${width - 2},${yBot + 12} h-10`} />}
      <text className="tab-barno" x={3} y={10}>{index + 1}</text>
      {bar.steps[0]?.section && <text className="tab-section" x={index + 1 >= 10 ? 18 : 13} y={10}>{bar.steps[0].section}</text>}
      {lyricRow && bar.steps.map((st, i) => st.lyric ? <text key={`l${i}`} className="tab-lyric" x={xs[i] - widths[i] / 2 + 3} y={yBot + BOTTOM + 14}>{st.lyric}</text> : null)}
      {Array.from({ length: nStr }, (_, s) => (
        <line key={s} x1={0} x2={width} y1={y(s)} y2={y(s)} className="tab-line" />
      ))}
      <line x1={0.5} x2={0.5} y1={yTop} y2={yBot} className="tab-barline" />
      {last && <line x1={width - 1.5} x2={width - 1.5} y1={yTop} y2={yBot} className="tab-barline" strokeWidth={3} />}
      {cursor >= 0 && (
        <rect className="tab-cursor" x={xs[cursor] - widths[cursor] / 2 + 1} y={yTop - 9} width={widths[cursor] - 2} height={yBot - yTop + 18} rx={5} />
      )}
      {flash >= 0 && (
        <rect key={flashKey} className="tab-hitflash" x={xs[flash] - widths[flash] / 2 + 1} y={yTop - 9} width={widths[flash] - 2} height={yBot - yTop + 18} rx={5} />
      )}
      {chords.map(c => (
        <text key={c.at} className={`tab-chord${c.guess ? ' guess' : ''}`} x={xs[c.at] - widths[c.at] / 2 + 2} y={24}>{c.name}</text>
      ))}
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
}

export function TabView({ track, mode, flats, cursor, playing, states, version, spans, flash, loop, selecting = false, onTap, onBar = () => {} }: Props) {
  const ref = useRef<HTMLDivElement>(null)
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

  let cursorBar = 0
  while (cursorBar + 1 < starts.length && starts[cursorBar + 1] <= cursor) cursorBar++

  // keep the bar you are on in view
  useEffect(() => {
    const box = ref.current
    const el = box?.querySelector<SVGElement>(`[data-bar="${cursorBar}"]`)
    if (!box || !el) return
    const top = (el as unknown as HTMLElement).getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop
    const h = box.clientHeight
    if (top < box.scrollTop + 4 || top > box.scrollTop + h * 0.55) box.scrollTo({ top: Math.max(0, top - h * 0.18), behavior: 'smooth' })
  }, [cursorBar, track])

  const empty = ''
  const lyricRow = useMemo(() => track.bars.some(b => b.steps.some(s => s.lyric)), [track])
  return (
    <div className={`tab-view${playing ? ' playing' : ''}${selecting ? ' selecting' : ''}`} ref={ref} data-version={version}>
      <div className="tab-rows">
        {track.bars.map((bar, i) => {
          const start = starts[i]
          let st = empty
          for (let k = 0; k < bar.steps.length; k++) st += String(states[start + k] ?? 0)
          const cur = cursor >= start && cursor < start + bar.steps.length ? cursor - start : -1
          const fl = flash && flash.flat >= start && flash.flat < start + bar.steps.length ? flash.flat - start : -1
          const inLoop = loop && i >= loop.from && i <= loop.to
          const lp: BarProps['loop'] = !inLoop ? '' : loop!.from === i && loop!.to === i ? 'both' : loop!.from === i ? 'start' : loop!.to === i ? 'end' : 'in'
          return (
            <BarView
              key={i}
              bar={bar}
              index={i}
              start={start}
              nStr={track.tuning.length}
              tuning={track.tuning}
              mode={mode}
              flats={flats}
              cursor={cur}
              states={st}
              chords={chordsByBar.get(i) ?? NONE}
              last={i === track.bars.length - 1}
              flash={fl}
              flashKey={fl >= 0 ? flash!.key : 0}
              loop={lp}
              selecting={selecting}
              onTap={onTap}
              onBar={onBar}
              lyricRow={lyricRow}
            />
          )
        })}
      </div>
    </div>
  )
}
const NONE: { at: number; name: string; guess: boolean }[] = []
