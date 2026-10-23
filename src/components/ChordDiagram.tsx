import type { Voicing } from '../theory/chords'

interface Props {
  name?: string
  voicing: Voicing
  active?: boolean
  onClick?: () => void
  size?: number
}

/** Classic vertical chord box: low E on the left. */
export function ChordDiagram({ name, voicing, active, onClick, size = 1 }: Props) {
  const n = voicing.frets.length
  const W = 124 * size
  const gap = (n <= 4 ? 24 : 18) * size
  const fretH = 22 * size
  const top = (name ? 38 : 22) * size
  const left = (W - gap * (n - 1)) / 2
  const played = voicing.frets.filter(f => f > 0)
  const minF = played.length ? Math.min(...played) : 1
  const maxF = played.length ? Math.max(...played) : 1
  const start = maxF <= 4 ? 1 : minF
  const rows = Math.max(4, maxF - start + 1)
  const H = top + fretH * rows + 14 * size
  const x = (s: number) => left + s * gap
  const yMid = (f: number) => top + (f - start + 0.5) * fretH
  return (
    <button className={`diagram${active ? ' on' : ''}`} onClick={onClick} aria-label={name ? `Play ${name}` : 'Play chord'} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {name && (
          <text x={W / 2} y={20 * size} textAnchor="middle" fontSize={20 * size} fontWeight={700} fill="var(--pearl)">{name}</text>
        )}
        {/* nut or position number */}
        {start === 1 ? (
          <rect x={x(0) - 1} y={top - 4 * size} width={gap * (n - 1) + 2} height={4 * size} fill="var(--pearl)" />
        ) : (
          <text x={x(0) - 12 * size} y={yMid(start) + 5 * size} textAnchor="end" fontSize={13 * size} fill="var(--pearl-2)">{start}</text>
        )}
        {Array.from({ length: rows + 1 }, (_, i) => (
          <line key={`r${i}`} x1={x(0)} x2={x(n - 1)} y1={top + i * fretH} y2={top + i * fretH} stroke="var(--ink-3)" strokeOpacity={0.55} />
        ))}
        {Array.from({ length: n }, (_, s) => s).map(s => (
          <line key={`s${s}`} x1={x(s)} x2={x(s)} y1={top} y2={top + rows * fretH} stroke={n === 6 && s < 3 ? 'var(--bronze)' : 'var(--ink-3)'} strokeWidth={n === 6 ? [2.2, 1.9, 1.6, 1.3, 1.1, 0.9][s] : 1.6} />
        ))}
        {/* barres */}
        {voicing.barres.map(b => {
          const strs = voicing.frets.map((f, i) => (f >= b ? i : -1)).filter(i => i >= 0)
          if (strs.length < 2) return null
          const a = Math.min(...strs)
          const z = Math.max(...strs)
          return <rect key={`b${b}`} x={x(a) - 7 * size} y={yMid(b) - 7 * size} width={x(z) - x(a) + 14 * size} height={14 * size} rx={7 * size} fill="var(--pearl)" />
        })}
        {voicing.frets.map((f, s) => {
          if (f < 0)
            return <text key={`m${s}`} x={x(s)} y={top - 9 * size} textAnchor="middle" fontSize={13 * size} fill="var(--pearl-3)">×</text>
          if (f === 0)
            return <circle key={`o${s}`} cx={x(s)} cy={top - 13 * size} r={4.5 * size} fill="none" stroke="var(--pearl-2)" strokeWidth={1.4} />
          const finger = voicing.fingers[s]
          const barred = voicing.barres.includes(f) && voicing.frets.filter(v => v === f).length > 1
          return (
            <g key={`d${s}`}>
              {!barred && <circle cx={x(s)} cy={yMid(f)} r={7.5 * size} fill="var(--pearl)" />}
              {finger > 0 && (
                <text x={x(s)} y={yMid(f) + 4.5 * size} textAnchor="middle" fontSize={12 * size} fontWeight={600} fill="var(--rosewood)">{finger}</text>
              )}
            </g>
          )
        })}
      </svg>
    </button>
  )
}
