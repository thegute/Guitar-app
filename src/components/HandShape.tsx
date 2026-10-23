// A small view of the neck showing where your fretting hand sits for this part of the tab: four frets,
// a dot for every note with the finger that plays it (1 index … 4 pinky), open strings by the nut,
// and the note you play next glowing. Just before the hand has to move, it says where to.
import type { HandGroup } from '../play/handShape'
import type { SongNote } from '../tabs/model'

interface Props {
  group: HandGroup
  next?: HandGroup | null
  /** show the "move to" hint */
  moveSoon: boolean
  expected: SongNote[]
  nStr: number
  stringNames: string[]
  compact?: boolean
}

export function HandShape({ group, next, moveSoon, expected, nStr, stringNames, compact }: Props) {
  const FW = compact ? 34 : 38, SG = compact ? 11 : 13, L = compact ? 34 : 40, T = compact ? 14 : 18
  const frets = [0, 1, 2, 3].map(i => group.base + i)
  const W = L + FW * 4 + 8
  const H = T + SG * (nStr - 1) + (compact ? 8 : 12)
  const y = (s: number) => T + (nStr - 1 - s) * SG
  const x = (fret: number) => (fret === 0 ? L - 12 : L + (fret - group.base) * FW + FW / 2)
  const isNext = (s: number, f: number) => expected.some(n => n.string === s && n.fret === f)
  const label = group.open ? 'Open position' : `Hand at fret ${group.base}`
  const move = moveSoon && next && (next.base !== group.base || next.open !== group.open)
  return (
    <div className={`hand-shape${compact ? ' compact' : ''}`}>
      <div className="hand-head small">
        <b>{label}</b>
        {move && <span className="hand-move">next: {next!.open ? 'open position' : `fret ${next!.base}`} →</span>}
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: ${group.notes.filter(n => n.fret > 0).map(n => `finger ${n.finger} on ${stringNames[n.string]} string fret ${n.fret}`).join(', ')}`}>
        {frets.map((f, i) => <text key={f} className="hand-fretno" x={L + i * FW + FW / 2} y={T - 6} textAnchor="middle">{f}</text>)}
        {Array.from({ length: nStr }, (_, s) => (
          <g key={s}>
            <text className="hand-str" x={4} y={y(s) + 3.5}>{stringNames[s]}</text>
            <line className="hand-line" x1={L} x2={L + FW * 4} y1={y(s)} y2={y(s)} />
          </g>
        ))}
        {[0, 1, 2, 3, 4].map(i => (
          <line key={i} className={i === 0 && group.open ? 'hand-nut' : 'hand-fret'} x1={L + i * FW} x2={L + i * FW} y1={y(nStr - 1) - 2} y2={y(0) + 2} />
        ))}
        {group.notes.map(n => {
          const nx = isNext(n.string, n.fret)
          if (n.fret > 0 && (n.fret < group.base || n.fret > group.base + 3)) return null
          return (
            <g key={`${n.string}-${n.fret}`} className={`hand-dot${nx ? ' next' : ''}${n.fret === 0 ? ' open' : ''}`}>
              <circle cx={x(n.fret)} cy={y(n.string)} r={compact ? 5.5 : 7} />
              <text x={x(n.fret)} y={y(n.string) + (compact ? 3 : 3.5)} textAnchor="middle">{n.fret === 0 ? '0' : n.finger}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
