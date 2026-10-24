// Psychedelic mode's pictures. Two kinds:
//  - trippy versions of the KGuitar poster (the samurai dog), as images made by tools/make-psy-art.py;
//  - original drawn art (src/art): samurai dogs of many breeds with psychedelic guitars, oni masks, mushrooms,
//    a smiling sun, a sleepy moon, ukiyo-e waves and guitars on their own.
// Everything here renders only in Psychedelic mode; in Day and Night these render nothing.
import { useMemo, type CSSProperties } from 'react'
import { useActiveTheme, usePsyDog, breedFor } from '../theme'
import { dogSvg, type BreedId } from '../art/dogs'
import { sunSvg, moonSvg, mushroomsSvg, oniSvg, waveSvg, waveTileSvg, paradeSvg, skySceneSvg, crossedGuitarsSvg, type OniColour, type ScenePiece } from '../art/scenes'
import { guitarArtSvg, type GuitarKind, type GuitarPaint } from '../art/guitars'

export type PsyKind = 'face' | 'pop' | 'kaleido' | 'melt' | 'shrooms' | 'tunnel' | 'liquid' | 'mandala'
const BASE = import.meta.env.BASE_URL ?? '/'
export const psySrc = (k: Exclude<PsyKind, 'mandala'>) => `${BASE}psy/${k}.webp`

export function PsyArt({ kind, className = '', style }: { kind: PsyKind; className?: string; style?: CSSProperties }) {
  const theme = useActiveTheme()
  if (theme !== 'psy') return null
  if (kind === 'mandala') return <Mandala className={className} style={style} />
  return <img className={`psy-art psy-${kind} ${className}`} src={psySrc(kind)} alt="" aria-hidden="true" draggable={false} style={style} />
}

/** Drawn art from an SVG string (our own, made in src/art; never user content). */
function Svg({ html, className = '', style }: { html: string; className?: string; style?: CSSProperties }) {
  return <span className={`psy-art psy-svg ${className}`} style={style} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
}

/** A samurai dog. With no `breed`, it's your samurai (Settings → Look), or a mix chosen by `seed`. */
export function PsyDog({ breed, seed = 'dog', halo = true, frame = 'bust', className = '', style }: {
  breed?: BreedId; seed?: string; halo?: boolean; frame?: 'bust' | 'portrait'; className?: string; style?: CSSProperties
}) {
  const theme = useActiveTheme()
  const choice = usePsyDog()
  const id = breed ?? breedFor(seed, choice)
  const html = useMemo(() => dogSvg(id, { halo, frame }), [id, halo, frame])
  if (theme !== 'psy') return null
  return <Svg html={html} className={`psy-dogpic ${className}`} style={style} />
}

export type PieceKind = 'sun' | 'moon' | 'shrooms' | 'oni' | 'wave' | 'guitar' | 'crossed'
/** One drawn piece on its own. */
export function PsyPiece({ kind, oni = 'red', guitar = ['electric', 'swirl'], className = '', style }: {
  kind: PieceKind; oni?: OniColour; guitar?: [GuitarKind, GuitarPaint]; className?: string; style?: CSSProperties
}) {
  const theme = useActiveTheme()
  const html = useMemo(() => kind === 'sun' ? sunSvg() : kind === 'moon' ? moonSvg() : kind === 'shrooms' ? mushroomsSvg() : kind === 'oni' ? oniSvg(oni)
    : kind === 'wave' ? waveSvg() : kind === 'crossed' ? crossedGuitarsSvg() : guitarArtSvg(guitar[0], guitar[1]), [kind, oni, guitar[0], guitar[1]]) // eslint-disable-line react-hooks/exhaustive-deps
  if (theme !== 'psy') return null
  return <Svg html={html} className={`psy-piece piece-${kind} ${className}`} style={style} />
}

/** A wide header scene: sky, a centrepiece and the waves. */
export function PsyScene({ piece, oni, guitar, className = '' }: { piece: ScenePiece; oni?: OniColour; guitar?: [GuitarKind, GuitarPaint]; className?: string }) {
  const theme = useActiveTheme()
  const html = useMemo(() => skySceneSvg(piece, { oni, guitar }), [piece, oni, guitar?.[0], guitar?.[1]]) // eslint-disable-line react-hooks/exhaustive-deps
  if (theme !== 'psy') return null
  return <Svg html={html} className={`psy-scenepic ${className}`} />
}

/** Samurai dogs in a row over the waves (a different line-up each day). */
export function PsyParade({ count = 5, sky = 'sun', className = '' }: { count?: number; sky?: 'sun' | 'moon'; className?: string }) {
  const theme = useActiveTheme()
  const day = new Date().toDateString()
  const html = useMemo(() => {
    const all: BreedId[] = ['lab', 'shiba', 'husky', 'corgi', 'pug', 'shepherd', 'beagle', 'dalmatian', 'golden', 'poodle', 'doberman']
    const start = [...day].reduce((a, c) => a + c.charCodeAt(0), 0) % all.length
    const ids = Array.from({ length: count }, (_, i) => all[(start + i * 3) % all.length])
    return paradeSvg(ids, { sky })
  }, [count, sky, day])
  if (theme !== 'psy') return null
  return <Svg html={html} className={`psy-paradepic ${className}`} />
}

/** Three samurai dogs that nod along with the beat while Jam plays. */
export function PsyBand({ className = '' }: { className?: string }) {
  const theme = useActiveTheme()
  if (theme !== 'psy') return null
  return (
    <span className={`psy-band ${className}`} aria-hidden="true">
      <PsyDog breed="corgi" halo={false} className="band-dog" style={{ ['--i' as string]: 0 }} />
      <PsyDog breed="lab" halo={false} className="band-dog" style={{ ['--i' as string]: 1 }} />
      <PsyDog breed="husky" halo={false} className="band-dog" style={{ ['--i' as string]: 2 }} />
    </span>
  )
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

/** The moving liquid colours behind the whole app, with the sun, the moon, a guitar, mushrooms, an oni and the
 *  waves floating in the gaps between the cards. */
export function PsyBackdrop() {
  const theme = useActiveTheme()
  const html = useMemo(() => ({
    sun: sunSvg(), moon: moonSvg(), guitar: guitarArtSvg('electric', 'rainbow'), shrooms: mushroomsSvg(), oni: oniSvg('purple'),
    wave: `url("data:image/svg+xml,${encodeURIComponent(waveTileSvg())}")`,
  }), [])
  if (theme !== 'psy') return null
  return (
    <div className="psy-backdrop" aria-hidden="true">
      <div className="psy-liquid" />
      <div className="psy-veil" />
      <div className="psy-scenery">
        <Svg html={html.sun} className="sc sc-sun" />
        <Svg html={html.moon} className="sc sc-moon" />
        <Svg html={html.guitar} className="sc sc-guitar" />
        <Svg html={html.oni} className="sc sc-oni" />
        <Svg html={html.shrooms} className="sc sc-shrooms" />
        <div className="sc sc-wave" style={{ backgroundImage: html.wave }} />
      </div>
    </div>
  )
}
