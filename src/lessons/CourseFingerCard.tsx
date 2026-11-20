// Floating Finger Diagram Card for Course Studio:
// - Draggable (⠿), Resizable (◢), Shrinkable to bubble (–), Hidable (×), AND Zoomable (− / 100% / + plus pinch-to-zoom)
// - Renders KGuitar's color-coded 1-2-3-4 finger diagram (1 Blue Index, 2 Green Middle, 3 Orange Ring, 4 Red Pinky, ○ Open)
// - Lets you type or tap any chord Paul or Roy mentions (e.g. E7, Am9, C#m7, G6), cycle shapes up the neck, and tap to strum!
import { useEffect, useMemo, useRef, useState } from 'react'
import { FloatCard } from '../components/FloatCard'
import { chordShapes, useInstrument } from '../instrument'
import { parseSymbol, type Voicing } from '../theory/chords'
import { audio } from '../audio/engine'
import { strum } from '../audio/pluck'

const FINGER_COLORS: Record<number, string> = {
  1: '#38bdf8', // Index — Blue
  2: '#4ade80', // Middle — Green
  3: '#fb923c', // Ring — Orange
  4: '#f87171', // Pinky — Red
}

const ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const QUALS = [
  { label: 'Maj', suffix: '' },
  { label: 'm', suffix: 'm' },
  { label: '7', suffix: '7' },
  { label: 'm7', suffix: 'm7' },
  { label: 'maj7', suffix: 'maj7' },
  { label: '9', suffix: '9' },
  { label: 'add9', suffix: 'add9' },
  { label: 'sus4', suffix: 'sus4' },
]

function initialChordFromHint(hint?: string): string {
  if (!hint) return 'Em'
  const m = hint.match(/\b([A-G][#b]?)\s*(Minor|Major|Blues|Hexatonic|Dorian|Phrygian|Aeolian|Lydian|Mixolydian|Ionian|Locrian)?\b/i)
  if (!m) return 'Em'
  const root = m[1][0].toUpperCase() + (m[1][1] ?? '')
  const mode = (m[2] ?? '').toLowerCase()
  if (mode === 'minor' || mode === 'aeolian' || mode === 'hexatonic' || mode === 'phrygian') return `${root}m`
  if (mode === 'dorian') return `${root}m7`
  if (mode === 'blues' || mode === 'mixolydian') return `${root}7`
  if (mode === 'locrian') return `${root}m7b5`
  return root
}

interface Props {
  lessonHint?: string
  onHide: () => void
}

export function CourseFingerCard({ lessonHint, onHide }: Props) {
  const inst = useInstrument()
  const [query, setQuery] = useState(() => initialChordFromHint(lessonHint))
  const [shapeIdx, setShapeIdx] = useState(0)
  const [zoom, setZoom] = useState(1.1)
  const pinchRef = useRef<{ dist0: number; zoom0: number } | null>(null)

  useEffect(() => {
    setQuery(initialChordFromHint(lessonHint))
    setShapeIdx(0)
  }, [lessonHint])

  const parsed = useMemo(() => {
    const clean = query.trim()
    if (!clean) return null
    try {
      const p = parseSymbol(clean.split('/')[0])
      const shapes = chordShapes(p.root, p.suffix, inst)
      return { name: clean, shapes }
    } catch {
      return null
    }
  }, [query, inst])

  const shapes = parsed?.shapes ?? []
  const safeIdx = shapes.length ? Math.min(shapeIdx, shapes.length - 1) : 0
  const voicing: Voicing | null = shapes[safeIdx] ?? null

  const playVoicing = () => {
    if (!voicing) return
    const midis = voicing.frets
      .map((f, s) => (f >= 0 && inst.midis[s] !== undefined ? inst.midis[s] + f : -1))
      .filter(m => m >= 0)
    if (!midis.length) return
    const ctx = audio()
    void ctx.resume()
    strum(midis, ctx.currentTime + 0.015, { gain: 0.72, spread: 0.024 })
  }

  const clampZoom = (z: number) => Math.max(0.7, Math.min(2.1, Math.round(z * 100) / 100))

  return (
    <FloatCard
      id="courseFinger"
      where="courseStudio"
      title={`Finger Diagram${parsed ? ` · ${parsed.name}` : ''}`}
      bubble={parsed ? `🖐 ${parsed.name}` : '🖐 Fingers'}
      icon="hand"
      width={290}
      minW={210}
      order={2}
      onHide={onHide}
      testId="course-finger-card"
      bubbleTestId="course-finger-bubble"
    >
      <div className="stack" style={{ gap: 6, padding: '2px 2px 6px' }}>
        {/* Chord Search Input + Zoom Controls */}
        <div className="row" style={{ gap: 4, alignItems: 'center' }}>
          <input
            className="input sm"
            type="text"
            value={query}
            placeholder="Chord (e.g. E7, Am9, G6)"
            onChange={e => { setQuery(e.target.value); setShapeIdx(0) }}
            style={{ flex: 1, minWidth: 80, padding: '3px 7px' }}
            aria-label="Chord name for finger diagram"
            data-testid="finger-chord-input"
          />
          <button
            className="btn sm"
            onClick={() => setZoom(z => clampZoom(z - 0.15))}
            title="Zoom out diagram"
            aria-label="Zoom out finger diagram"
            data-testid="finger-zoom-out"
          >
            −
          </button>
          <button
            className="btn sm"
            onClick={() => setZoom(1.1)}
            title="Reset zoom"
            data-testid="finger-zoom-reset"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            className="btn sm"
            onClick={() => setZoom(z => clampZoom(z + 0.15))}
            title="Zoom in diagram"
            aria-label="Zoom in finger diagram"
            data-testid="finger-zoom-in"
          >
            +
          </button>
        </div>

        {/* Quick Root + Quality Chips */}
        <div className="row" style={{ gap: 3, flexWrap: 'wrap' }}>
          {ROOTS.map(r => {
            const curRoot = query.trim().match(/^([A-G][#b]?)/i)?.[1]?.toUpperCase() ?? ''
            const curSuffix = query.trim().replace(/^[A-G][#b]?/i, '')
            return (
              <button
                key={r}
                className={`btn sm${curRoot === r ? ' set' : ''}`}
                style={{ padding: '2px 6px', minHeight: 24, fontSize: 11 }}
                onClick={() => { setQuery(r + curSuffix); setShapeIdx(0) }}
              >
                {r}
              </button>
            )
          })}
          <span style={{ width: 4 }} />
          {QUALS.map(q => {
            const curRoot = query.trim().match(/^([A-G][#b]?)/i)?.[1] ?? 'E'
            const curSuffix = query.trim().replace(/^[A-G][#b]?/i, '')
            return (
              <button
                key={q.label}
                className={`btn sm${curSuffix === q.suffix ? ' set' : ''}`}
                style={{ padding: '2px 6px', minHeight: 24, fontSize: 11 }}
                onClick={() => { setQuery(curRoot + q.suffix); setShapeIdx(0) }}
              >
                {q.label}
              </button>
            )
          })}
        </div>

        {/* Zoomable Color-Coded Finger Diagram (supports two-finger pinch-to-zoom) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'auto',
            background: 'rgba(0,0,0,0.22)',
            borderRadius: 8,
            padding: 6,
            touchAction: 'pan-x pan-y',
          }}
          onTouchStart={e => {
            if (e.touches.length === 2) {
              const d = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY,
              )
              pinchRef.current = { dist0: Math.max(10, d), zoom0: zoom }
            }
          }}
          onTouchMove={e => {
            if (e.touches.length === 2 && pinchRef.current) {
              const d = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY,
              )
              setZoom(clampZoom(pinchRef.current.zoom0 * (d / pinchRef.current.dist0)))
            }
          }}
          onTouchEnd={() => { pinchRef.current = null }}
          data-testid="finger-diagram-stage"
        >
          {voicing ? (
            <ColoredFingerSvg
              name={parsed!.name}
              voicing={voicing}
              size={zoom}
              stringLabels={inst.tuning.notes.map(n => n.replace(/-?\d+$/, ''))}
              onClick={playVoicing}
            />
          ) : (
            <p className="small muted" style={{ margin: '18px 8px', textAlign: 'center' }}>
              Type any chord above (like <b>E7</b>, <b>Am9</b>, <b>C#m7</b>, or <b>Dadd9</b>) to see its color-coded finger diagram.
            </p>
          )}
        </div>

        {/* Shape Stepper + Strum Button */}
        {voicing && (
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
            <div className="row" style={{ gap: 4, alignItems: 'center' }}>
              <button
                className="btn sm"
                disabled={shapes.length <= 1}
                onClick={() => setShapeIdx(i => (i - 1 + shapes.length) % shapes.length)}
                aria-label="Previous shape"
                data-testid="finger-shape-prev"
              >
                ‹
              </button>
              <span className="small muted tabular" data-testid="finger-shape-counter">
                Shape {safeIdx + 1} / {shapes.length}
              </span>
              <button
                className="btn sm"
                disabled={shapes.length <= 1}
                onClick={() => setShapeIdx(i => (i + 1) % shapes.length)}
                aria-label="Next shape"
                data-testid="finger-shape-next"
              >
                ›
              </button>
            </div>
            <button className="btn sm primary" onClick={playVoicing} data-testid="finger-strum-btn">
              🔊 Strum
            </button>
          </div>
        )}

        {/* Color-Coded Finger Legend */}
        <div className="row" style={{ gap: 8, justifyContent: 'center', flexWrap: 'wrap', fontSize: 11 }}>
          {[
            { f: 1, name: '1 Index' },
            { f: 2, name: '2 Mid' },
            { f: 3, name: '3 Ring' },
            { f: 4, name: '4 Pinky' },
          ].map(x => (
            <span key={x.f} className="row" style={{ gap: 3, alignItems: 'center' }}>
              <i style={{ width: 9, height: 9, borderRadius: '50%', background: FINGER_COLORS[x.f], display: 'inline-block' }} />
              <span className="muted">{x.name}</span>
            </span>
          ))}
        </div>
      </div>
    </FloatCard>
  )
}

function ColoredFingerSvg({
  name,
  voicing,
  size,
  stringLabels,
  onClick,
}: {
  name: string
  voicing: Voicing
  size: number
  stringLabels: string[]
  onClick: () => void
}) {
  const n = voicing.frets.length
  const W = 152 * size
  const gap = (n <= 4 ? 26 : 21) * size
  const fretH = 24 * size
  const top = 40 * size
  const left = (W - gap * (n - 1)) / 2
  const played = voicing.frets.filter(f => f > 0)
  const minF = played.length ? Math.min(...played) : 1
  const maxF = played.length ? Math.max(...played) : 1
  const start = maxF <= 4 ? 1 : minF
  const rows = Math.max(4, maxF - start + 1)
  const H = top + fretH * rows + 24 * size
  const x = (s: number) => left + s * gap
  const yMid = (f: number) => top + (f - start + 0.5) * fretH

  return (
    <button
      className="diagram"
      onClick={onClick}
      aria-label={`Play ${name} chord shape`}
      style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
      data-testid="finger-diagram-svg-btn"
    >
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <text x={W / 2} y={19 * size} textAnchor="middle" fontSize={18 * size} fontWeight={700} fill="var(--pearl)">
          {name}
        </text>
        {start === 1 ? (
          <rect x={x(0) - 1} y={top - 4 * size} width={gap * (n - 1) + 2} height={4 * size} fill="var(--pearl)" />
        ) : (
          <text x={x(0) - 10 * size} y={yMid(start) + 4.5 * size} textAnchor="end" fontSize={12 * size} fontWeight={600} fill="var(--pearl-2)">
            {start}fr
          </text>
        )}
        {Array.from({ length: rows + 1 }, (_, i) => (
          <line key={`r${i}`} x1={x(0)} x2={x(n - 1)} y1={top + i * fretH} y2={top + i * fretH} stroke="var(--ink-3)" strokeOpacity={0.6} />
        ))}
        {Array.from({ length: n }, (_, s) => s).map(s => (
          <line
            key={`s${s}`}
            x1={x(s)}
            x2={x(s)}
            y1={top}
            y2={top + rows * fretH}
            stroke={n === 6 && s < 3 ? 'var(--bronze)' : 'var(--ink-3)'}
            strokeWidth={n === 6 ? [2.2, 1.9, 1.6, 1.3, 1.1, 0.9][s] : 1.6}
          />
        ))}
        {/* Color-coded barres (usually finger 1 = blue) */}
        {voicing.barres.map(b => {
          const strs = voicing.frets.map((f, i) => (f >= b ? i : -1)).filter(i => i >= 0)
          if (strs.length < 2) return null
          const a = Math.min(...strs)
          const z = Math.max(...strs)
          const barreFinger = voicing.fingers[a] || 1
          const fill = FINGER_COLORS[barreFinger] ?? '#38bdf8'
          return (
            <rect
              key={`b${b}`}
              x={x(a) - 8 * size}
              y={yMid(b) - 7.5 * size}
              width={x(z) - x(a) + 16 * size}
              height={15 * size}
              rx={7.5 * size}
              fill={fill}
              fillOpacity={0.92}
            />
          )
        })}
        {/* Dots, open circles, muted × */}
        {voicing.frets.map((f, s) => {
          if (f < 0) {
            return (
              <text key={`m${s}`} x={x(s)} y={top - 9 * size} textAnchor="middle" fontSize={13 * size} fill="var(--pearl-3)">
                ×
              </text>
            )
          }
          if (f === 0) {
            return (
              <circle
                key={`o${s}`}
                cx={x(s)}
                cy={top - 13 * size}
                r={4.8 * size}
                fill="none"
                stroke="#ffffff"
                strokeWidth={1.6}
              />
            )
          }
          const finger = voicing.fingers[s] || 0
          const fill = FINGER_COLORS[finger] ?? 'var(--pearl)'
          const barred = voicing.barres.includes(f) && voicing.frets.filter(v => v === f).length > 1
          return (
            <g key={`d${s}`}>
              {!barred && <circle cx={x(s)} cy={yMid(f)} r={8.2 * size} fill={fill} />}
              {finger > 0 && (
                <text x={x(s)} y={yMid(f) + 4.3 * size} textAnchor="middle" fontSize={11.5 * size} fontWeight={700} fill="#0b1020">
                  {finger}
                </text>
              )}
            </g>
          )
        })}
        {/* String name labels along bottom */}
        {Array.from({ length: n }, (_, s) => (
          <text
            key={`lbl${s}`}
            x={x(s)}
            y={top + rows * fretH + 15 * size}
            textAnchor="middle"
            fontSize={10.5 * size}
            fill="var(--pearl-3)"
          >
            {stringLabels[s] ?? ''}
          </text>
        ))}
      </svg>
    </button>
  )
}
