import { memo, useEffect, useRef, useState, type JSX } from 'react'
import { STANDARD, stringMidis } from '../theory/notes'

/**
 * root: red · chord: amber (chord tones) · scale: pearl · ghost: outline only · live: teal (what the mic hears)
 * next: teal ring (tones of the next chord) · common: amber with a teal ring (in both chords)
 * pass: small pearl (connecting notes, usually numbered) · target: amber ring (the tab's next note)
 */
export type MarkRole = 'root' | 'chord' | 'scale' | 'ghost' | 'live' | 'next' | 'common' | 'pass' | 'target'
export interface Mark {
  label: string
  role: MarkRole
}

interface Props {
  tuning?: number[]
  fromFret?: number
  toFret?: number
  markFor: (midi: number, string: number, fret: number) => Mark | null
  onTap?: (midi: number, string: number, fret: number) => void
  /** smallest fret width in px (sets overall size) */
  minFretPx?: number
  /** tighter string spacing for small screens */
  compact?: boolean
}

const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21]
const PAD_Y = 22
const OPEN_W = 34

const FILL: Record<MarkRole, string> = {
  root: 'var(--jewel)', chord: 'var(--amber)', scale: 'var(--pearl)', ghost: 'var(--rosewood)', live: 'var(--strobe)',
  next: 'var(--rosewood)', common: 'var(--amber)', pass: 'var(--pearl-2)', target: 'var(--rosewood)',
}
const INK: Record<MarkRole, string> = {
  root: 'var(--pearl)', chord: 'var(--amber-ink)', scale: 'var(--rosewood)', ghost: 'var(--pearl-2)', live: 'var(--rosewood)',
  next: 'var(--strobe)', common: 'var(--amber-ink)', pass: 'var(--rosewood)', target: 'var(--amber)',
}
const RING: Partial<Record<MarkRole, [string, number]>> = {
  ghost: ['var(--nickel)', 1.2], next: ['var(--strobe)', 2.5], common: ['var(--strobe)', 3], target: ['var(--amber)', 3],
}

function FretboardImpl({ tuning = stringMidis(STANDARD), fromFret = 0, toFret = 15, markFor, onTap, minFretPx, compact }: Props) {
  const STR_GAP = compact ? 25 : 30
  const nStr = tuning.length
  const wrap = useRef<HTMLDivElement>(null)
  const [avail, setAvail] = useState(0)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(() => setAvail(el.clientWidth))
    ro.observe(el)
    setAvail(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const frets = toFret - fromFret
  // size frets to fill the available width (scroll only when they would get too small)
  let S = 0
  for (let f = fromFret + 1; f <= toFret; f++) S += Math.pow(2, (toFret - f) / 12)
  const leftPad = fromFret === 0 ? OPEN_W : 14
  const fit = avail ? (avail - leftPad - 14) / S : 40
  if (minFretPx === undefined) minFretPx = Math.max(30, Math.min(72, fit))
  // real fret spacing: each fret is 2^(-1/12) narrower than the previous
  const K = minFretPx * Math.pow(2, toFret / 12)
  const widths: number[] = []
  for (let f = fromFret + 1; f <= toFret; f++) widths.push(K * Math.pow(2, -f / 12))
  const left = fromFret === 0 ? OPEN_W : 14
  const xs: number[] = [left]
  for (const w of widths) xs.push(xs[xs.length - 1] + w)
  const width = xs[xs.length - 1] + 12
  const boardH = STR_GAP * (nStr - 1)
  const height = PAD_Y * 2 + boardH + 18
  const y = (s: number) => PAD_Y + (nStr - 1 - s) * STR_GAP // high string at top
  const noteX = (f: number) => (f === 0 ? left / 2 : (xs[f - fromFret - 1] + xs[f - fromFret]) / 2)

  const marks: JSX.Element[] = []
  for (let s = 0; s < nStr; s++) {
    const from = fromFret === 0 ? 0 : fromFret + 1
    for (let f = from; f <= toFret; f++) {
      const midi = tuning[s] + f
      const m = markFor(midi, s, f)
      if (!m) continue
      const cx = noteX(f)
      const cy = y(s)
      const ring = RING[m.role]
      const r = m.role === 'pass' ? 10.5 : compact ? 11 : 12
      marks.push(
        <g key={`${s}-${f}`} className={`note-dot role-${m.role}`} onClick={() => onTap?.(midi, s, f)}>
          <circle cx={cx} cy={cy} r={r} fill={FILL[m.role]} stroke={ring ? ring[0] : 'rgba(0,0,0,0.35)'} strokeWidth={ring ? ring[1] : 1} />
          <text x={cx} y={cy + 5} textAnchor="middle" fontSize={m.label.length > 2 ? 11 : 14} fill={INK[m.role]}>{m.label}</text>
        </g>,
      )
    }
  }

  return (
    <div className="fretboard-wrap" ref={wrap}>
      <svg className="fretboard" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Fretboard, frets ${fromFret} to ${toFret}`}>
        <defs>
          <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4a2e25" />
            <stop offset="0.5" stopColor="#3a231c" />
            <stop offset="1" stopColor="#301d17" />
          </linearGradient>
        </defs>
        <rect x={left} y={PAD_Y - 10} width={xs[xs.length - 1] - left} height={boardH + 20} fill="url(#wood)" rx={2} />
        {/* grain */}
        {[0.18, 0.41, 0.63, 0.86].map(g => (
          <line key={g} x1={left} x2={xs[xs.length - 1]} y1={PAD_Y - 10 + g * (boardH + 20)} y2={PAD_Y - 10 + g * (boardH + 20) + 3} stroke="#000" strokeOpacity={0.12} strokeWidth={6} />
        ))}
        {/* inlays */}
        {Array.from({ length: frets }, (_, i) => fromFret + i + 1).map(f => {
          const cx = noteX(f)
          if (f % 12 === 0)
            return (
              <g key={`in${f}`}>
                <circle cx={cx} cy={PAD_Y + boardH * 0.3} r={6} fill="#e9e1d3" opacity={0.85} />
                <circle cx={cx} cy={PAD_Y + boardH * 0.7} r={6} fill="#e9e1d3" opacity={0.85} />
              </g>
            )
          return INLAYS.includes(f) ? <circle key={`in${f}`} cx={cx} cy={PAD_Y + boardH / 2} r={6} fill="#e9e1d3" opacity={0.85} /> : null
        })}
        {/* nut / frets */}
        {xs.map((x, i) => {
          const f = fromFret + i
          const isNut = f === 0
          return <rect key={`f${i}`} x={x - (isNut ? 3 : 1.5)} y={PAD_Y - 10} width={isNut ? 6 : 3} height={boardH + 20} fill={isNut ? '#e8e0cf' : 'var(--nickel)'} opacity={isNut ? 1 : 0.85} />
        })}
        {/* strings: wound strings are bronze and thicker */}
        {Array.from({ length: nStr }, (_, s) => s).map(s => {
          const fromTop = nStr - 1 - s // 0 = thinnest
          return <line key={`s${s}`} x1={fromFret === 0 ? left - 2 : 0} x2={width} y1={y(s)} y2={y(s)} stroke={fromTop >= 3 ? 'var(--bronze)' : '#d9dcdd'} strokeWidth={0.9 + fromTop * 0.36} />
        })}
        {/* fret numbers */}
        {Array.from({ length: frets }, (_, i) => fromFret + i + 1).map(f =>
          [3, 5, 7, 9, 12, 15, 17, 19, 21, 24, 1].includes(f) ? (
            <text key={`n${f}`} x={noteX(f)} y={height - 4} textAnchor="middle" fontSize={13} fill="var(--pearl-3)">{f}</text>
          ) : null,
        )}
        {marks}
      </svg>
    </div>
  )
}

export const Fretboard = memo(FretboardImpl)
