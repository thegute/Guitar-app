// Interactive circle of fifths: major keys outside, their relative minors inside, diminished chords innermost, and
// round the outside how many sharps or flats each key has.
// Shows the chords of the selected key as one connected slice, roman numerals, the key signature,
// and lights up whichever chord is sounding.
import { pc } from '../theory/notes'
import { useZoomBox } from './Zoomable'

export const CIRCLE_MAJOR = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F']
export const CIRCLE_MINOR = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm']
export const CIRCLE_DIM = ['B°', 'F#°', 'C#°', 'G#°', 'D#°', 'A#°', 'E#°', 'C°', 'G°', 'D°', 'A°', 'E°']
const SIG = ['no sharps or flats', '1♯', '2♯', '3♯', '4♯', '5♯', '6♯ / 6♭', '5♭', '4♭', '3♭', '2♭', '1♭']
/** the same, short, for the ring round the outside */
export const SIG_SHORT = ['0', '1♯', '2♯', '3♯', '4♯', '5♯', '6♯ 6♭', '5♭', '4♭', '3♭', '2♭', '1♭']

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
  /** ordered chord trail for Harmonic GPS arrows (1 -> 2 -> 3 ...) */
  trail?: { root: string; minor: boolean; dim?: boolean }[]
  /** upcoming chord to preview with a dotted arrow from active */
  nextChord?: { root: string; minor: boolean; dim?: boolean } | null
  /** optional 12-key mastery map (key name -> 0..5) drawn as emerald rim arcs */
  mastery?: Record<string, number>
  onPick?: (root: string, minor: boolean, dim?: boolean) => void
  size?: number
  showRomans?: boolean
  /** allow clicking innermost diminished wedges too */
  allowDim?: boolean
}

export function CircleOfFifths({
  tonic, minor = false, active, used = [], trail = [], nextChord = null, mastery,
  onPick, size = 320, showRomans = true, allowDim = false,
}: Props) {
  const zoom = useZoomBox('circle')
  const S = 372
  const c = S / 2
  const R = [154, 112, 76, 46] // outer edge, major/minor border, minor/dim border, inner hole
  const key = circleIndex(tonic, minor) // index of the relative major
  const step = (Math.PI * 2) / 12
  const ang = (i: number) => -Math.PI / 2 + i * step
  const pt = (r: number, a: number) => [c + r * Math.cos(a), c + r * Math.sin(a)] as const
  const wedge = (i: number, r0: number, r1: number) => {
    const a0 = ang(i) - step / 2 + 0.004
    const a1 = ang(i) + step / 2 - 0.004
    const [x0, y0] = pt(r1, a0)
    const [x1, y1] = pt(r1, a1)
    const [x2, y2] = pt(r0, a1)
    const [x3, y3] = pt(r0, a0)
    return `M${x0},${y0} A${r1},${r1} 0 0 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 0 0 ${x3},${y3} Z`
  }
  const chordPt = (ch: { root: string; minor: boolean; dim?: boolean }) => {
    const p = pc(ch.root)
    let idx = 0
    let r = (R[0] + R[1]) / 2
    if (ch.dim) {
      // dim ring has B° at index 0 (relative major C = B + 1)
      idx = (((p + 1) % 12) * 7) % 12
      r = (R[2] + R[3]) / 2
    } else if (ch.minor) {
      idx = (((p + 3) % 12) * 7) % 12
      r = (R[1] + R[2]) / 2
    } else {
      idx = (p * 7) % 12
      r = (R[0] + R[1]) / 2
    }
    return pt(r, ang(idx))
  }
  const curveBetween = (p1: readonly [number, number], p2: readonly [number, number]) => {
    const mx = (p1[0] + p2[0]) / 2
    const my = (p1[1] + p2[1]) / 2
    // pull curve slightly toward center for clean non-overlapping arcs
    const cx = mx + (c - mx) * 0.28
    const cy = my + (c - my) * 0.28
    return `M${p1[0].toFixed(1)},${p1[1].toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }

  // diatonic slice: the key, one step each side (IV and V), for majors, minors and the one diminished chord
  const rel = (i: number) => ((i - key + 12 + 6) % 12) - 6 // -6..5
  const romanMaj: Record<number, string> = minor ? { 0: 'III', 1: 'VII', [-1]: 'VI' } : { 0: 'I', 1: 'V', [-1]: 'IV' }
  const romanMin: Record<number, string> = minor ? { 0: 'i', 1: 'v', [-1]: 'iv' } : { 0: 'vi', 1: 'iii', [-1]: 'ii' }
  const romanDim: Record<number, string> = minor ? { 0: 'ii°' } : { 0: 'vii°' }
  const isUsed = (p: number, kind: 'maj' | 'min' | 'dim') =>
    used.some(u => pc(u.root) === p && (kind === 'dim' ? !!u.dim : kind === 'min' ? u.minor && !u.dim : !u.minor && !u.dim)) ||
    trail.some(u => pc(u.root) === p && (kind === 'dim' ? !!u.dim : kind === 'min' ? u.minor && !u.dim : !u.minor && !u.dim))
  const isActive = (p: number, kind: 'maj' | 'min' | 'dim') => !!active && pc(active.root) === p && (kind === 'dim' ? !!active.dim : kind === 'min' ? active.minor && !active.dim : !active.minor && !active.dim)

  const ring = (labels: string[], r0: number, r1: number, kind: 'maj' | 'min' | 'dim', romans: Record<number, string>, fontSize: number) =>
    labels.map((lab, i) => {
      const d = rel(i)
      const inKey = romans[d] !== undefined
      const p = pc(lab.replace(/m$|°$/, ''))
      const act = isActive(p, kind)
      const usedHere = isUsed(p, kind)
      const home = d === 0 && ((kind === 'maj' && !minor) || (kind === 'min' && minor))
      const outsideActive = act && !inKey
      const fill = outsideActive ? '#a855f7' : act ? 'var(--amber)' : home ? 'var(--jewel)' : inKey ? 'var(--rosewood-3)' : 'var(--rosewood-2)'
      const ink = outsideActive ? '#fff' : act ? 'var(--amber-ink)' : home ? 'var(--pearl)' : inKey ? 'var(--pearl)' : 'var(--pearl-3)'
      const [tx, ty] = pt((r0 + r1) / 2, ang(i))
      const clickable = !!onPick && (kind !== 'dim' || allowDim)
      const pick = () => {
        if (!clickable || !onPick) return
        onPick(lab.replace(/m$|°$/, ''), kind === 'min', kind === 'dim')
      }
      return (
        <g key={kind + i} className="cof-cell" onClick={pick} style={{ cursor: clickable ? 'pointer' : 'default' }}>
          <path d={wedge(i, r0, r1)} fill={fill} stroke={usedHere && !act ? 'var(--strobe)' : 'var(--hairline)'} strokeWidth={usedHere && !act ? 2.5 : 1} />
          <text x={tx} y={ty + (showRomans && inKey ? -2 : 4)} textAnchor="middle" fontSize={fontSize} fontWeight={700} fill={ink}>{lab}</text>
          {showRomans && inKey && <text x={tx} y={ty + fontSize * 0.75} textAnchor="middle" fontSize={fontSize * 0.55} fill={ink} opacity={0.85}>{romans[d]}</text>}
        </g>
      )
    })

  // Trail coordinates & deduplicated step numbers
  const trailPts = trail.map(t => chordPt(t))
  const nextLine = active && nextChord ? curveBetween(chordPt(active), chordPt(nextChord)) : null

  return (
    <div className="zoom-host cof-zoom">
    <div className={`cof-scroll${zoom.z > 1.02 ? ' zoomed' : ''}`} ref={zoom.box}>
    <svg className="cof" viewBox={`0 0 ${S} ${S}`} width={size * zoom.z} height={size * zoom.z} role="img" aria-label={`Circle of fifths, key of ${tonic} ${minor ? 'minor' : 'major'}: ${SIG[key]}. Round the outside: the number of sharps or flats in each key.`}>
      <defs>
        <marker id="cof-arr-amber" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#f59e0b" />
        </marker>
        <marker id="cof-arr-next" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#10b981" />
        </marker>
      </defs>
      <circle cx={c} cy={c} r={170} className="cof-sig-ring" strokeWidth={30} fill="none" />
      {mastery && CIRCLE_MAJOR.map((kName, i) => {
        const level = Object.entries(mastery).find(([mk]) => pc(mk) === pc(kName))?.[1] ?? 0
        if (level <= 0) return null
        const a0 = ang(i) - step / 2 + 0.04
        const a1 = ang(i) + step / 2 - 0.04
        const [x0, y0] = pt(156.5, a0)
        const [x1, y1] = pt(156.5, a1)
        return (
          <path
            key={'m' + i}
            d={`M${x0},${y0} A156.5,156.5 0 0 1 ${x1},${y1}`}
            fill="none"
            stroke="#10b981"
            strokeWidth={level >= 3 ? 5 : 3}
            strokeLinecap="round"
            opacity={Math.min(1, 0.45 + level * 0.15)}
          />
        )
      })}
      {SIG_SHORT.map((sg, i) => {
        const [tx, ty] = pt(170, ang(i))
        const flats = i >= 7, sharps = i >= 1 && i <= 5
        return <text key={'sig' + i} x={tx} y={ty + 5} textAnchor="middle" fontSize={i === 0 || i === 6 ? 11 : 15} fontWeight={i === key ? 800 : 600}
          className={`cof-sig${sharps ? ' sharp' : flats ? ' flat' : ''}${i === key ? ' on' : ''}`}>{sg}</text>
      })}
      {ring(CIRCLE_MAJOR, R[1], R[0], 'maj', romanMaj, 19)}
      {ring(CIRCLE_MINOR, R[2], R[1], 'min', romanMin, 14)}
      {ring(CIRCLE_DIM, R[3], R[2], 'dim', romanDim, 11)}
      <circle cx={c} cy={c} r={R[3] - 2} fill="var(--rosewood)" />
      <text x={c} y={c - 4} textAnchor="middle" fontSize={15} fontWeight={700} fill="var(--pearl)">{tonic}{minor ? 'm' : ''}</text>
      <text x={c} y={c + 13} textAnchor="middle" fontSize={10} fill="var(--pearl-2)">{SIG[key]}</text>

      {/* Harmonic GPS Trail Arrows */}
      {trailPts.length > 1 && (
        <g pointerEvents="none">
          {trailPts.slice(0, -1).map((p1, idx) => {
            const p2 = trailPts[idx + 1]
            if (Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) < 4) return null
            const isRecent = idx >= trailPts.length - 3
            return (
              <path
                key={`tr-${idx}`}
                d={curveBetween(p1, p2)}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={isRecent ? 2.6 : 1.7}
                strokeOpacity={isRecent ? 0.92 : 0.48}
                markerEnd="url(#cof-arr-amber)"
              />
            )
          })}
          {trailPts.map((p, idx) => (
            <g key={`tn-${idx}`} transform={`translate(${(p[0] + 13).toFixed(1)}, ${(p[1] - 11).toFixed(1)})`}>
              <circle r={7.5} fill="#0f172a" stroke="#f59e0b" strokeWidth={1.3} />
              <text y={3} textAnchor="middle" fontSize={8.5} fontWeight={800} fill="#fde68a">{idx + 1}</text>
            </g>
          ))}
        </g>
      )}

      {/* Next-chord dotted preview arrow */}
      {nextLine && (
        <path
          d={nextLine}
          fill="none"
          stroke="#10b981"
          strokeWidth={2.4}
          strokeDasharray="5 4"
          markerEnd="url(#cof-arr-next)"
          pointerEvents="none"
        />
      )}
    </svg>
    </div>
    {zoom.reset}
    </div>
  )
}

