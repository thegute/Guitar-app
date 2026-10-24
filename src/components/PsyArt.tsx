// Psychedelic mode's pictures: trippy versions of the KGuitar poster (the samurai dog) and original swirling art.
// They only appear in Psychedelic mode; in Day and Night these render nothing.
import type { CSSProperties } from 'react'
import { useActiveTheme } from '../theme'

export type PsyKind = 'face' | 'pop' | 'kaleido' | 'melt' | 'shrooms' | 'tunnel' | 'liquid' | 'mandala'
const BASE = import.meta.env.BASE_URL ?? '/'
export const psySrc = (k: Exclude<PsyKind, 'mandala'>) => `${BASE}psy/${k}.webp`

export function PsyArt({ kind, className = '', style }: { kind: PsyKind; className?: string; style?: CSSProperties }) {
  const theme = useActiveTheme()
  if (theme !== 'psy') return null
  if (kind === 'mandala') return <Mandala className={className} style={style} />
  return <img className={`psy-art psy-${kind} ${className}`} src={psySrc(kind)} alt="" aria-hidden="true" draggable={false} style={style} />
}

/** An original, slowly turning mandala: rings of petals in neon colours. */
export function Mandala({ className = '', style }: { className?: string; style?: CSSProperties }) {
  const rings = [
    { n: 8, r: 18, len: 26, w: 10, c: '#ff3fd8' },
    { n: 12, r: 34, len: 22, w: 8, c: '#ffd23f' },
    { n: 16, r: 50, len: 18, w: 6.5, c: '#33ffb4' },
    { n: 24, r: 64, len: 14, w: 5, c: '#00e5ff' },
    { n: 32, r: 76, len: 10, w: 3.5, c: '#ff8a00' },
  ]
  return (
    <svg className={`psy-art psy-mandala ${className}`} viewBox="-100 -100 200 200" aria-hidden="true" style={style}>
      <defs>
        <radialGradient id="psyCore">
          <stop offset="0" stopColor="#fff4d6" />
          <stop offset="0.5" stopColor="#ff3fd8" />
          <stop offset="1" stopColor="#7a2cff" />
        </radialGradient>
      </defs>
      {rings.map((g, k) => (
        <g key={k} className={k % 2 ? 'spin-rev' : 'spin'} style={{ transformOrigin: '0 0', animationDuration: `${40 + k * 12}s` }}>
          {Array.from({ length: g.n }, (_, i) => {
            const a = (360 / g.n) * i
            return (
              <ellipse key={i} cx={0} cy={-(g.r + g.len / 2)} rx={g.w / 2} ry={g.len / 2} fill={g.c} fillOpacity={0.85}
                stroke="#14002b" strokeWidth={0.8} transform={`rotate(${a})`} />
            )
          })}
        </g>
      ))}
      <circle r={16} fill="url(#psyCore)" stroke="#14002b" strokeWidth={1} />
      <circle r={88} fill="none" stroke="#ff3fd8" strokeOpacity={0.5} strokeWidth={1.2} strokeDasharray="2 4" />
    </svg>
  )
}

/** The moving liquid colours behind the whole app. */
export function PsyBackdrop() {
  const theme = useActiveTheme()
  if (theme !== 'psy') return null
  return (
    <div className="psy-backdrop" aria-hidden="true">
      <div className="psy-liquid" />
      <div className="psy-veil" />
    </div>
  )
}
