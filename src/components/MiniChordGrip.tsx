// Reusable compact SVG Mini Chord Grip + Global Grips ON/OFF & Open/Barre/Triad control bar.
// Uses KGuitar's universal finger colors (Open=Pearl, 1=Blue, 2=Green, 3=Amber, 4=Red) and stays
// synced across every chord view via src/chordGrips.ts.
import { useMemo } from 'react'
import { cachedFlowVoicing, useChordGrips } from '../chordGrips'
import { useInstrument, type Instrument } from '../instrument'
import { FLOW_VOICING_STYLES, type FlowVoicingStyle } from '../theory/flowVoicings'

export const GRIP_FINGER_HEX: Record<number, string> = {
  1: '#3b82f6', // Index — Blue
  2: '#22c55e', // Middle — Green
  3: '#f59e0b', // Ring — Amber
  4: '#ef4444', // Pinky — Red
}

export interface MiniChordGripProps {
  symbol: string
  inst?: Instrument
  styleOverride?: FlowVoicingStyle
  width?: number
  compact?: boolean
  active?: boolean
  accentColor?: string
  anchorFret?: number
  showInversion?: boolean
  className?: string
}

export function MiniChordGrip({
  symbol,
  inst: instProp,
  styleOverride,
  width = 56,
  compact = false,
  active = false,
  accentColor,
  anchorFret,
  showInversion,
  className,
}: MiniChordGripProps) {
  const currentInst = useInstrument()
  const inst = instProp ?? currentInst
  const { style: globalStyle } = useChordGrips()
  const style = styleOverride ?? globalStyle

  const res = useMemo(
    () => cachedFlowVoicing(symbol, inst, style, anchorFret),
    [symbol, inst, style, anchorFret],
  )

  if (!res) return null
  const v = res.voicing
  const nStr = Math.max(4, v.frets.length)
  const invTag = (showInversion ?? !compact) && res.inversion ? res.inversion : null

  const W = 56
  const H = invTag ? 66 : 56
  const gx = 12
  const gy = 13
  const gw = W - 18
  const gh = 35
  const strGap = gw / (nStr - 1)
  const fretGap = gh / 4

  const pos = v.frets.filter(f => f > 0)
  const base = v.baseFret > 1 ? v.baseFret : (pos.length && Math.max(...pos) > 4 ? Math.min(...pos) : 1)
  const isOpen = base === 1

  const stroke = active ? '#fbbf24' : (accentColor ?? 'rgba(148, 163, 184, 0.35)')
  const strokeOp = active ? 0.95 : accentColor ? 0.55 : 0.7
  const pxHeight = Math.round((width / W) * H)

  return (
    <span
      className={`mini-grip${active ? ' active' : ''}${compact ? ' compact' : ''}${className ? ' ' + className : ''}`}
      data-chord={symbol}
      data-testid="mini-chord-grip"
      data-grip-style={style}
      aria-label={`${symbol} ${FLOW_VOICING_STYLES.find(s => s.id === style)?.short ?? style} chord diagram`}
      style={{ width, height: pxHeight }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width={width} height={pxHeight} aria-hidden="true">
        <rect
          x={0.75}
          y={0.75}
          width={W - 1.5}
          height={H - 1.5}
          rx={7}
          fill={active ? 'rgba(28, 24, 14, 0.95)' : 'rgba(11, 15, 24, 0.92)'}
          stroke={stroke}
          strokeOpacity={strokeOp}
          strokeWidth={active ? 1.5 : 1}
        />

        {/* Nut or starting fret badge */}
        {isOpen ? (
          <line x1={gx} x2={gx + gw} y1={gy} y2={gy} stroke="#e2e8f0" strokeWidth={2.3} />
        ) : (
          <text
            x={gx - 2.5}
            y={gy + fretGap * 0.72}
            textAnchor="end"
            fontSize={7.8}
            fontWeight={800}
            fill="#cbd5e1"
          >
            {base}f
          </text>
        )}

        {/* 4 horizontal frets */}
        {[0, 1, 2, 3, 4].map(fi => (
          <line
            key={`f${fi}`}
            x1={gx}
            x2={gx + gw}
            y1={gy + fi * fretGap}
            y2={gy + fi * fretGap}
            stroke="rgba(148,163,184,0.35)"
            strokeWidth={fi === 0 && isOpen ? 0 : 0.75}
          />
        ))}

        {/* Vertical strings */}
        {Array.from({ length: nStr }, (_, s) => (
          <line
            key={`s${s}`}
            x1={gx + s * strGap}
            x2={gx + s * strGap}
            y1={gy}
            y2={gy + gh}
            stroke="rgba(148,163,184,0.48)"
            strokeWidth={0.75}
          />
        ))}

        {/* Barre bars */}
        {v.barres.map(bf => {
          const rel = bf - base + 1
          if (rel < 1 || rel > 4) return null
          const matching = v.frets.map((f, s) => (f === bf ? s : -1)).filter(s => s >= 0)
          if (matching.length < 2) return null
          const x1 = gx + Math.min(...matching) * strGap
          const x2 = gx + Math.max(...matching) * strGap
          const by = gy + (rel - 0.5) * fretGap
          return (
            <line
              key={`b${bf}`}
              x1={x1}
              x2={x2}
              y1={by}
              y2={by}
              stroke={GRIP_FINGER_HEX[1]}
              strokeWidth={5.2}
              strokeLinecap="round"
              opacity={0.92}
            />
          )
        })}

        {/* Muted x, Open o, and colored 1-2-3-4 finger dots */}
        {v.frets.map((f, s) => {
          const sx = gx + s * strGap
          if (f < 0) {
            return (
              <text key={`m${s}`} x={sx} y={gy - 3} textAnchor="middle" fontSize={7.2} fill="#94a3b8">
                ×
              </text>
            )
          }
          if (f === 0) {
            return (
              <circle
                key={`o${s}`}
                cx={sx}
                cy={gy - 5}
                r={2.3}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth={1.05}
              />
            )
          }
          const rel = f - base + 1
          if (rel < 1 || rel > 4) return null
          const sy = gy + (rel - 0.5) * fretGap
          const fing = v.fingers[s] ?? 0
          const dotFill = GRIP_FINGER_HEX[fing] ?? '#38bdf8'
          return (
            <g key={`d${s}`}>
              <circle cx={sx} cy={sy} r={3.9} fill={dotFill} stroke="#0b0e17" strokeWidth={0.65} />
              {fing > 0 && (
                <text
                  x={sx}
                  y={sy + 2.35}
                  textAnchor="middle"
                  fontSize={6.3}
                  fontWeight={800}
                  fill="#ffffff"
                >
                  {fing}
                </text>
              )}
            </g>
          )
        })}

        {/* Optional triad inversion badge */}
        {invTag && (
          <text x={W / 2} y={H - 4.5} textAnchor="middle" fontSize={7.4} fontWeight={700} fill="#94a3b8">
            {invTag} inv
          </text>
        )}
      </svg>
    </span>
  )
}

export function ChordGripsBar({
  compact = false,
  showStyle = true,
  className,
}: {
  compact?: boolean
  showStyle?: boolean
  className?: string
}) {
  const { show, style, toggleShow, setStyle } = useChordGrips()
  return (
    <div
      className={`chord-grips-bar${compact ? ' compact' : ''}${className ? ' ' + className : ''}`}
      data-testid="chord-grips-bar"
    >
      <button
        type="button"
        className={`btn sm${show ? ' on' : ''}`}
        aria-pressed={show}
        onClick={toggleShow}
        data-testid="global-grips-toggle"
        title="Show or hide always-on mini finger diagrams across the whole app"
      >
        🎸 {show ? 'Grips ON' : 'Grips OFF'}
      </button>
      {show && showStyle && (
        compact ? (
          <select
            className="select sm"
            value={style}
            onChange={e => setStyle(e.target.value as FlowVoicingStyle)}
            aria-label="Global chord grip shape"
            data-testid="global-grips-style-select"
            style={{ width: 'auto', minWidth: 86 }}
          >
            {FLOW_VOICING_STYLES.map(vs => (
              <option key={vs.id} value={vs.id}>
                {vs.short}
              </option>
            ))}
          </select>
        ) : (
          <div className="seg" role="group" aria-label="Global chord grip shape" style={{ flexWrap: 'wrap' }}>
            {FLOW_VOICING_STYLES.map(vs => (
              <button
                key={vs.id}
                type="button"
                aria-pressed={style === vs.id}
                onClick={() => setStyle(vs.id)}
                title={vs.hint}
                data-testid={`global-grips-style-${vs.id}`}
              >
                {vs.short}
              </button>
            ))}
          </div>
        )
      )}
    </div>
  )
}
