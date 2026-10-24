// Interactive circle of fifths: major keys outside, their relative minors inside, diminished chords innermost.
// Shows the chords of the selected key as one connected slice, roman numerals, the key signature,
// and lights up whichever chord is sounding.
import { pc } from '../theory/notes'
import { useZoomBox } from './Zoomable'

export const CIRCLE_MAJOR = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F']
export const CIRCLE_MINOR = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm']
export const CIRCLE_DIM = ['B°', 'F#°', 'C#°', 'G#°', 'D#°', 'A#°', 'E#°', 'C°', 'G°', 'D°', 'A°', 'E°']
const SIG = ['no sharps or flats', '1♯', '2♯', '3♯', '4♯', '5♯', '6♯ / 6♭', '5♭', '4♭', '3♭', '2♭', '1♭']

/** Position of a major key on the circle (0 = C at the top). Works for any spelling. */
export function circleIndex(root: string, minor = false) {
  const p = (pc(root) + (minor ? 3 : 0)) % 12 // a minor key sits with its relative major
  return (p * 7) % 12
}
export function keySignature(root: string, minor = false) {
  return SIG[circleIndex(root, minor)]
}

interface Props {
  /** tonic of the selected key */
  tonic: string
  minor?: boolean
  /** pitch classes + quality of chords to light up, e.g. the sounding chord */
  active?: { root: string; minor: boolean; dim?: boolean } | null
  /** chords used in the progression (dimmer highlight) */
  used?: { root: string; minor: boolean; dim?: boolean }[]
  onPick?: (root: string, minor: boolean) => void
  size?: number
  showRomans?: boolean
}

export function CircleOfFifths({ tonic, minor = false, active, used = [], onPick, size = 320, showRomans = true }: Props) {
  const zoom = useZoomBox('circle')
  const S = 320
  const c = S / 2
  const R = [154, 112, 76, 46] // outer edge, major/minor border, minor/dim border, inner hole
  const key = circleIndex(tonic, minor) // index of the relative major
  const step = (Math.PI * 2) / 12
  const ang = (i: number) => -Math.PI / 2 + i * step
  const pt = (r: number, a: number) => [c + r * Math.cos(a), c + r * Math.sin(a)]
  const wedge = (i: number, r0: number, r1: number) => {
    const a0 = ang(i) - step / 2 + 0.004
    const a1 = ang(i) + step / 2 - 0.004
    const [x0, y0] = pt(r1, a0)
    const [x1, y1] = pt(r1, a1)
    const [x2, y2] = pt(r0, a1)
    const [x3, y3] = pt(r0, a0)
    return `M${x0},${y0} A${r1},${r1} 0 0 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 0 0 ${x3},${y3} Z`
  }
  // diatonic slice: the key, one step each side (IV and V), for majors, minors and the one diminished chord
  const rel = (i: number) => ((i - key + 12 + 6) % 12) - 6 // -6..5
  const romanMaj: Record<number, string> = minor ? { 0: 'III', 1: 'VII', [-1]: 'VI' } : { 0: 'I', 1: 'V', [-1]: 'IV' }
  const romanMin: Record<number, string> = minor ? { 0: 'i', 1: 'v', [-1]: 'iv' } : { 0: 'vi', 1: 'iii', [-1]: 'ii' }
  const romanDim: Record<number, string> = minor ? { 0: 'ii°' } : { 0: 'vii°' }
  const isUsed = (p: number, kind: 'maj' | 'min' | 'dim') => used.some(u => pc(u.root) === p && (kind === 'dim' ? !!u.dim : kind === 'min' ? u.minor && !u.dim : !u.minor && !u.dim))
  const isActive = (p: number, kind: 'maj' | 'min' | 'dim') => !!active && pc(active.root) === p && (kind === 'dim' ? !!active.dim : kind === 'min' ? active.minor && !active.dim : !active.minor && !active.dim)

  const ring = (labels: string[], r0: number, r1: number, kind: 'maj' | 'min' | 'dim', romans: Record<number, string>, fontSize: number) =>
    labels.map((lab, i) => {
      const d = rel(i)
      const inKey = romans[d] !== undefined
      const p = pc(lab.replace(/m$|°$/, ''))
      const act = isActive(p, kind)
      const usedHere = isUsed(p, kind)
      const home = d === 0 && ((kind === 'maj' && !minor) || (kind === 'min' && minor))
      const fill = act ? 'var(--amber)' : home ? 'var(--jewel)' : inKey ? 'var(--rosewood-3)' : 'var(--rosewood-2)'
      const ink = act ? 'var(--amber-ink)' : home ? 'var(--pearl)' : inKey ? 'var(--pearl)' : 'var(--pearl-3)'
      const [tx, ty] = pt((r0 + r1) / 2, ang(i))
      const pick = () => {
        if (!onPick || kind === 'dim') return
        onPick(lab.replace(/m$/, ''), kind === 'min')
      }
      return (
        <g key={kind + i} className="cof-cell" onClick={pick} style={{ cursor: onPick && kind !== 'dim' ? 'pointer' : 'default' }}>
          <path d={wedge(i, r0, r1)} fill={fill} stroke={usedHere && !act ? 'var(--strobe)' : 'var(--hairline)'} strokeWidth={usedHere && !act ? 2.5 : 1} />
          <text x={tx} y={ty + (showRomans && inKey ? -2 : 4)} textAnchor="middle" fontSize={fontSize} fontWeight={700} fill={ink}>{lab}</text>
          {showRomans && inKey && <text x={tx} y={ty + fontSize * 0.75} textAnchor="middle" fontSize={fontSize * 0.55} fill={ink} opacity={0.85}>{romans[d]}</text>}
        </g>
      )
    })

  return (
    <div className="zoom-host cof-zoom">
    <div className={`cof-scroll${zoom.z > 1.02 ? ' zoomed' : ''}`} ref={zoom.box}>
    <svg className="cof" viewBox={`0 0 ${S} ${S}`} width={size * zoom.z} height={size * zoom.z} role="img" aria-label={`Circle of fifths, key of ${tonic} ${minor ? 'minor' : 'major'}`}>
      {ring(CIRCLE_MAJOR, R[1], R[0], 'maj', romanMaj, 19)}
      {ring(CIRCLE_MINOR, R[2], R[1], 'min', romanMin, 14)}
      {ring(CIRCLE_DIM, R[3], R[2], 'dim', romanDim, 11)}
      <circle cx={c} cy={c} r={R[3] - 2} fill="var(--rosewood)" />
      <text x={c} y={c - 4} textAnchor="middle" fontSize={15} fontWeight={700} fill="var(--pearl)">{tonic}{minor ? 'm' : ''}</text>
      <text x={c} y={c + 13} textAnchor="middle" fontSize={10} fill="var(--pearl-2)">{SIG[key]}</text>
    </svg>
    </div>
    {zoom.reset}
    </div>
  )
}
