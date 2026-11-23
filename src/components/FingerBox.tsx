// Live Left-Hand Coach ("Where your fingers go"):
// Streamlined floating window showing where your ENTIRE left hand parks (4 color-coded finger lanes:
// 1 Blue, 2 Green, 3 Amber, 4 Red), live PRESS NOW glowing finger(s), HOLD anchor ring(s),
// NEXT UP ghost preview + guide arrow, upcoming shift warning, and one plain-English cue.
// Floats in a FloatCard (draggable, resizable, edge-bubble, hide; available in Play, Video Lesson tabs,
// Riff Scanner, and via the floating card dropdown menu on Jam, Strum Machine, Chord Path, Scales & Circle).
import type { HandGroup, LiveHandNote } from '../play/handShape'
import type { SongNote } from '../tabs/model'
import { FloatCard } from './FloatCard'
import { Ico } from './Icon'

interface Props {
  group: HandGroup
  next: HandGroup | null
  /** beats until the next hand position starts (Infinity when it's far) */
  beatsToShift: number
  /** fallback active notes when `nowNotes` isn't passed */
  expected: SongNote[]
  /** live notes sounding right now (synced to Hear it, In time, Wait for me, or tapped note) */
  nowNotes?: LiveHandNote[]
  /** notes coming up on the very next playable step */
  nextNotes?: LiveHandNote[]
  /** anchor fingers that stay planted across upcoming notes in this same hand box */
  holdNotes?: LiveHandNote[]
  /** true during open-string/rest intros before the first fretted note */
  prePosition?: boolean
  /** streamlined 1-line plain-English coaching cue */
  cue?: string
  nStr: number
  stringNames: string[]
  onLoopShift?: () => void
  /** screen it lives on, for its remembered place (kg:fingerBox:<where>) */
  where?: string
  /** × on the card: hide it */
  onHide?: () => void
  /** the nth floating card on the screen */
  order?: number
  /** optional header override */
  titleOverride?: string
}

export const FINGER_NAMES = ['open', 'index', 'middle', 'ring', 'pinky']
const LANE_FILLS = ['', 'rgba(59,130,246,0.12)', 'rgba(34,197,94,0.12)', 'rgba(245,158,11,0.12)', 'rgba(239,68,68,0.12)']
const LANE_TEXT = ['', '#60a5fa', '#4ade80', '#fbbf24', '#f87171']

export function FingerBox({
  group,
  next,
  beatsToShift,
  expected,
  nowNotes,
  nextNotes,
  holdNotes,
  prePosition,
  cue,
  nStr,
  stringNames,
  onLoopShift,
  where = 'play',
  onHide,
  order,
  titleOverride,
}: Props) {
  const shiftSoon = !!next && beatsToShift <= 2 && (next.base !== group.base || next.open !== group.open)
  const frameRange = group.open ? 'Frets 1–4' : `Frets ${group.base}–${group.base + 3}`
  const label = titleOverride ?? (group.open ? `${frameRange} · First pos` : `${frameRange} · Index on ${group.base}`)
  return (
    <FloatCard
      id="hand"
      where={where}
      title={label}
      icon="hand"
      alert={shiftSoon}
      dodgeCursor
      onHide={onHide}
      order={order}
      width={272}
      minW={184}
      testId="finger-box"
      bubbleTestId="finger-chip"
      label={`Live Left-Hand Coach: ${label}`}
      bubble={
        <>
          {group.open ? 'Frets 1–4' : `Fret ${group.base}`}
          {shiftSoon ? ` → ${next!.open ? '1–4' : next!.base}` : ''}
        </>
      }
    >
      <FingerNeck
        group={group}
        next={next}
        shiftSoon={shiftSoon}
        expected={expected}
        nowNotes={nowNotes}
        nextNotes={nextNotes}
        holdNotes={holdNotes}
        prePosition={prePosition}
        cue={cue}
        nStr={nStr}
        stringNames={stringNames}
        onLoopShift={onLoopShift}
        label={label}
      />
    </FloatCard>
  )
}

/** The streamlined 4-finger hand neck (usable inside FingerBox AND inside FloatLayer's universal Hand Coach card). */
export function FingerNeck({
  group,
  next,
  shiftSoon,
  expected,
  nowNotes,
  nextNotes = [],
  holdNotes = [],
  prePosition = false,
  cue,
  nStr,
  stringNames,
  onLoopShift,
  label,
}: {
  group: HandGroup
  next: HandGroup | null
  shiftSoon: boolean
  expected: SongNote[]
  nowNotes?: LiveHandNote[]
  nextNotes?: LiveHandNote[]
  holdNotes?: LiveHandNote[]
  prePosition?: boolean
  cue?: string
  nStr: number
  stringNames: string[]
  onLoopShift?: () => void
  label: string
}) {
  const W = 252
  const lo = Math.max(1, Math.min(group.base, next && shiftSoon ? next.base : group.base) - (group.open ? 0 : 1))
  const hi = Math.max(group.base + 3, next && shiftSoon ? next.base + 3 : 0) + 1
  const frets = hi - lo + 1
  const L = 22, T = 26, FW = Math.max(26, (W - L - 12) / frets), SG = 13.5
  const SW = L + FW * frets + 6, SH = T + SG * (nStr - 1) + 12
  const y = (s: number) => T + (nStr - 1 - s) * SG
  const x = (f: number) => (f === 0 ? L - 9 : L + (f - lo) * FW + FW / 2)
  const boxX = (b: number) => L + (b - lo) * FW

  const activeNow: { string: number; fret: number; finger: number }[] = nowNotes
    ? nowNotes
    : expected.map(n => {
        const hit = group.notes.find(g => g.string === n.string && g.fret === n.fret)
        return {
          string: n.string,
          fret: n.fret,
          finger: n.fret === 0 ? 0 : (hit?.finger || Math.max(1, Math.min(4, n.fret - group.base + 1))),
        }
      })

  const hasLiveFocus = activeNow.length > 0 || nextNotes.length > 0
  const isNow = (s: number, f: number) => activeNow.some(n => n.string === s && n.fret === f)
  const isHold = (s: number, f: number) => holdNotes.some(n => n.string === s && n.fret === f)
  const isNextUp = (s: number, f: number) => !isNow(s, f) && nextNotes.some(n => n.string === s && n.fret === f)

  // Merge group context notes + any activeNow / nextNotes that might fall slightly outside group.notes
  const dotMap = new Map<string, { string: number; fret: number; finger: number }>()
  for (const n of group.notes) dotMap.set(`${n.string}:${n.fret}`, n)
  for (const n of holdNotes) dotMap.set(`${n.string}:${n.fret}`, n)
  for (const n of nextNotes) {
    if (!dotMap.has(`${n.string}:${n.fret}`) && (n.fret === 0 || (n.fret >= lo && n.fret <= hi))) {
      dotMap.set(`${n.string}:${n.fret}`, n)
    }
  }
  for (const n of activeNow) dotMap.set(`${n.string}:${n.fret}`, n)
  const allDots = [...dotMap.values()]

  // Subtle single-note movement arrow from primary NOW fretted note to primary NEXT fretted note
  const primaryNow = activeNow.find(n => n.fret > 0 && n.fret >= lo && n.fret <= hi)
  const primaryNext = nextNotes.find(
    n => n.fret > 0 && n.fret >= lo && n.fret <= hi && (!primaryNow || n.string !== primaryNow.string || n.fret !== primaryNow.fret),
  )

  return (
    <>
      <svg
        width={SW}
        height={SH}
        viewBox={`0 0 ${SW} ${SH}`}
        className="fbx-neck"
        role="img"
        aria-label={`${label}. ${group.notes.filter(n => n.fret > 0).map(n => `${FINGER_NAMES[n.finger]} finger on ${stringNames[n.string]} string fret ${n.fret}`).join(', ')}`}
      >
        <defs>
          <marker id="fbx-head" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" className="fbx-arrowhead" />
          </marker>
          <marker id="fbx-step-head" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
            <path d="M0,0 L5,2.5 L0,5 z" fill="rgba(251,191,36,0.75)" />
          </marker>
        </defs>

        {/* 4 color-coded vertical Finger Lanes showing where your entire left hand parks */}
        {[1, 2, 3, 4].map(fing => {
          const fret = group.base + fing - 1
          if (fret < lo || fret > hi) return null
          const lx = L + (fret - lo) * FW
          return (
            <g key={`lane-${fing}`}>
              <rect
                x={lx + 0.5}
                y={T - 7}
                width={FW - 1}
                height={SG * (nStr - 1) + 14}
                rx={3}
                fill={LANE_FILLS[fing]}
              />
              <text
                x={lx + FW / 2}
                y={10}
                textAnchor="middle"
                fontSize={8.5}
                fontWeight={800}
                fill={LANE_TEXT[fing]}
                opacity={0.92}
              >
                {fing}
              </text>
            </g>
          )
        })}

        {/* Hand box frame outline + upcoming shift ghost box */}
        <rect
          className={`fbx-hand${prePosition ? ' pre' : ''}`}
          x={boxX(group.base)}
          y={T - 7}
          width={FW * 4}
          height={SG * (nStr - 1) + 14}
          rx={6}
        />
        {shiftSoon && next && (
          <rect className="fbx-ghost" x={boxX(next.base)} y={T - 7} width={FW * 4} height={SG * (nStr - 1) + 14} rx={6} />
        )}

        {/* Fret numbers */}
        {Array.from({ length: frets }, (_, i) => (
          <text key={i} className="fbx-fretno" x={L + i * FW + FW / 2} y={T - 9} textAnchor="middle">
            {lo + i}
          </text>
        ))}

        {/* Strings */}
        {Array.from({ length: nStr }, (_, s) => (
          <g key={s}>
            <text className="fbx-str" x={2} y={y(s) + 3.5}>
              {stringNames[s]}
            </text>
            <line className="fbx-line" x1={L} x2={L + FW * frets} y1={y(s)} y2={y(s)} />
          </g>
        ))}

        {/* Frets */}
        {Array.from({ length: frets + 1 }, (_, i) => (
          <line
            key={i}
            className={i === 0 && lo === 1 ? 'fbx-nut' : 'fbx-fret'}
            x1={L + i * FW}
            x2={L + i * FW}
            y1={y(nStr - 1) - 2}
            y2={y(0) + 2}
          />
        ))}

        {/* Barre bar */}
        {group.barre && group.barre.fret >= lo && group.barre.fret <= hi && (
          <rect
            className={`fbx-barre fing-${group.barre.finger}`}
            x={x(group.barre.fret) - 5}
            y={y(Math.max(...group.barre.strings)) - 6}
            width={10}
            height={y(Math.min(...group.barre.strings)) - y(Math.max(...group.barre.strings)) + 12}
            rx={5}
          />
        )}

        {/* Subtle NOW -> NEXT finger transition arrow */}
        {primaryNow && primaryNext && !shiftSoon && (
          <line
            x1={x(primaryNow.fret)}
            y1={y(primaryNow.string)}
            x2={x(primaryNext.fret)}
            y2={y(primaryNext.string)}
            stroke="rgba(251, 191, 36, 0.52)"
            strokeWidth={1.6}
            strokeDasharray="3 2.5"
            markerEnd="url(#fbx-step-head)"
          />
        )}

        {/* Finger dots: dim context -> NEXT ghost -> HOLD anchor ring -> vivid PRESS NOW */}
        {allDots.map(n => {
          if (n.fret > 0 && (n.fret < lo || n.fret > hi)) return null
          const now = isNow(n.string, n.fret)
          const hold = isHold(n.string, n.fret)
          const nxt = isNextUp(n.string, n.fret)
          const dim = hasLiveFocus && !now && !hold && !nxt
          const cx = x(n.fret)
          const cy = y(n.string)
          const r = now ? 7.6 : nxt || hold ? 6.6 : dim ? 4.8 : 6.8
          return (
            <g
              key={`${n.string}-${n.fret}`}
              className={`fbx-dot fing-${n.fret === 0 ? 0 : n.finger}${now ? ' next live-now' : ''}${nxt ? ' live-next' : ''}${dim ? ' dim' : ''}`}
            >
              {hold && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={r + 2.6}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth={1.6}
                  opacity={0.9}
                />
              )}
              {nxt && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={r + 2.2}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth={1.4}
                  strokeDasharray="2.5 2"
                />
              )}
              <circle cx={cx} cy={cy} r={r} />
              {!dim && (
                <text x={cx} y={cy + 3.4} textAnchor="middle">
                  {n.fret === 0 ? '0' : n.finger}
                </text>
              )}
            </g>
          )
        })}

        {/* Upcoming hand-shift arrow */}
        {shiftSoon && next && (
          <path
            className="fbx-arrow"
            d={`M ${boxX(group.base) + FW * 2} ${SH - 3} L ${boxX(next.base) + FW * 2} ${SH - 3}`}
            markerEnd="url(#fbx-head)"
          />
        )}
      </svg>

      {/* Streamlined 1-line coaching cue OR upcoming shift banner */}
      {shiftSoon && next ? (
        <div className="fbx-shift" role="status">
          <span className="fbx-badge">
            Shift → {next.open ? 'Frets 1–4' : `Frets ${next.base}–${next.base + 3}`}
          </span>
          {next.why && <span className="small">{next.why}</span>}
          {onLoopShift && (
            <button className="btn sm" onClick={onLoopShift} data-testid="loop-shift">
              <Ico n="loop" /> Loop this shift
            </button>
          )}
        </div>
      ) : (
        <div className="stack" style={{ gap: 3 }}>
          {cue && (
            <div className="fbx-cue small" role="status" data-testid="finger-cue">
              {cue}
            </div>
          )}
          <div className="fbx-legend small" aria-hidden>
            <i className="fing-1" />1 <i className="fing-2" />2 <i className="fing-3" />3 <i className="fing-4" />4 <i className="fing-0" />open
            {holdNotes.length > 0 && <span className="fbx-hold-pill">● hold</span>}
          </div>
        </div>
      )}
    </>
  )
}
