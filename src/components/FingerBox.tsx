// "Where your fingers go", the hand card: it shades the four frets your hand covers ("Index on fret 5"), shows every note
// with the finger that plays it in the finger colours (1 blue, 2 green, 3 orange, 4 red, open white, the same as Game Mode),
// and two beats before the hand has to move it shows where to ("Shift → fret 7") with a ghost of the next box, the reason,
// and a button to loop just that shift. It floats in a FloatCard (move, resize, bubble, hide; always on top).
import type { HandGroup } from '../play/handShape'
import type { SongNote } from '../tabs/model'
import { FloatCard } from './FloatCard'
import { Ico } from './Icon'

interface Props {
  group: HandGroup
  next: HandGroup | null
  /** beats until the next hand position starts (Infinity when it's far) */
  beatsToShift: number
  expected: SongNote[]
  nStr: number
  stringNames: string[]
  onLoopShift?: () => void
  /** screen it lives on, for its remembered place (kg:fingerBox:<where>) */
  where?: string
  /** × on the card: hide it */
  onHide?: () => void
  /** the nth floating card on the screen */
  order?: number
}

export const FINGER_NAMES = ['open', 'index', 'middle', 'ring', 'pinky']

export function FingerBox({ group, next, beatsToShift, expected, nStr, stringNames, onLoopShift, where = 'play', onHide, order }: Props) {
  const shiftSoon = !!next && beatsToShift <= 2 && (next.base !== group.base || next.open !== group.open)
  const label = group.open ? 'First position' : `Index on fret ${group.base}`
  return (
    <FloatCard id="hand" where={where} title={label} icon="hand" alert={shiftSoon} dodgeCursor onHide={onHide} order={order} width={260} minW={170}
      testId="finger-box" bubbleTestId="finger-chip" label={`Where your fingers go: ${label}`}
      bubble={<>{group.open ? 'Open' : `Fret ${group.base}`}{shiftSoon ? ` → ${next!.open ? 'open' : next!.base}` : ''}</>}>
      <FingerNeck group={group} next={next} shiftSoon={shiftSoon} expected={expected} nStr={nStr} stringNames={stringNames} onLoopShift={onLoopShift} label={label} />
    </FloatCard>
  )
}

/** The neck inside the hand card (drawn 240 px wide and scaled to the card). */
export function FingerNeck({ group, next, shiftSoon, expected, nStr, stringNames, onLoopShift, label }: { group: HandGroup; next: HandGroup | null; shiftSoon: boolean; expected: SongNote[]; nStr: number; stringNames: string[]; onLoopShift?: () => void; label: string }) {
  const W = 240
  // the neck: one fret before the box to two after, so the shift and its ghost box fit
  const lo = Math.max(1, Math.min(group.base, next && shiftSoon ? next.base : group.base) - (group.open ? 0 : 1))
  const hi = Math.max(group.base + 3, next && shiftSoon ? next.base + 3 : 0) + 1
  const frets = hi - lo + 1
  const L = 22, T = 16, FW = Math.max(26, (W - L - 12) / frets), SG = 13
  const SW = L + FW * frets + 6, SH = T + SG * (nStr - 1) + 10
  const y = (s: number) => T + (nStr - 1 - s) * SG
  const x = (f: number) => (f === 0 ? L - 9 : L + (f - lo) * FW + FW / 2)
  const isNext = (s: number, f: number) => expected.some(n => n.string === s && n.fret === f)
  const boxX = (b: number) => L + (b - lo) * FW
  return (
    <>
      <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`} className="fbx-neck" role="img"
        aria-label={`${label}. ${group.notes.filter(n => n.fret > 0).map(n => `${FINGER_NAMES[n.finger]} finger on ${stringNames[n.string]} string fret ${n.fret}`).join(', ')}`}>
        {/* the hand: four frets shaded */}
        <rect className="fbx-hand" x={boxX(group.base)} y={T - 9} width={FW * 4} height={SG * (nStr - 1) + 18} rx={6} />
        {shiftSoon && next && <rect className="fbx-ghost" x={boxX(next.base)} y={T - 9} width={FW * 4} height={SG * (nStr - 1) + 18} rx={6} />}
        {Array.from({ length: frets }, (_, i) => <text key={i} className="fbx-fretno" x={L + i * FW + FW / 2} y={T - 10} textAnchor="middle">{lo + i}</text>)}
        {Array.from({ length: nStr }, (_, s) => (
          <g key={s}>
            <text className="fbx-str" x={2} y={y(s) + 3.5}>{stringNames[s]}</text>
            <line className="fbx-line" x1={L} x2={L + FW * frets} y1={y(s)} y2={y(s)} />
          </g>
        ))}
        {Array.from({ length: frets + 1 }, (_, i) => <line key={i} className={i === 0 && lo === 1 ? 'fbx-nut' : 'fbx-fret'} x1={L + i * FW} x2={L + i * FW} y1={y(nStr - 1) - 2} y2={y(0) + 2} />)}
        {group.barre && <rect className={`fbx-barre fing-${group.barre.finger}`} x={x(group.barre.fret) - 5} y={y(Math.max(...group.barre.strings)) - 6} width={10} height={y(Math.min(...group.barre.strings)) - y(Math.max(...group.barre.strings)) + 12} rx={5} />}
        {group.notes.map(n => {
          if (n.fret > 0 && (n.fret < lo || n.fret > hi)) return null
          const nx = isNext(n.string, n.fret)
          return (
            <g key={`${n.string}-${n.fret}`} className={`fbx-dot fing-${n.fret === 0 ? 0 : n.finger}${nx ? ' next' : ''}`}>
              <circle cx={x(n.fret)} cy={y(n.string)} r={7} />
              <text x={x(n.fret)} y={y(n.string) + 3.5} textAnchor="middle">{n.fret === 0 ? '0' : n.finger}</text>
            </g>
          )
        })}
        {shiftSoon && next && <path className="fbx-arrow" d={`M ${boxX(group.base) + FW * 2} ${SH - 3} L ${boxX(next.base) + FW * 2} ${SH - 3}`} markerEnd="url(#fbx-head)" />}
        <defs><marker id="fbx-head" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" className="fbx-arrowhead" /></marker></defs>
      </svg>
      {shiftSoon && next ? (
        <div className="fbx-shift" role="status">
          <span className="fbx-badge">Upcoming shift → {next.open ? 'first position' : `fret ${next.base}`}</span>
          {next.why && <span className="small">{next.why}</span>}
          {onLoopShift && <button className="btn sm" onClick={onLoopShift} data-testid="loop-shift"><Ico n="loop" /> Loop this shift</button>}
        </div>
      ) : (
        <div className="fbx-legend small" aria-hidden>
          <i className="fing-1" />1 <i className="fing-2" />2 <i className="fing-3" />3 <i className="fing-4" />4 <i className="fing-0" />open
        </div>
      )}
    </>
  )
}
