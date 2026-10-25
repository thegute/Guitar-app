// Psychedelic mode's pictures, all from the owner's own ukiyo-e artwork (src/art/samurai.ts, public/samurai/):
// samurai dog faces and whole cards, banners and story panels for the screen headers, round snippets floating
// behind the cards, plus trippy versions of the KGuitar poster (tools/make-psy-art.py) and a drawn mandala.
// Everything here renders only in Psychedelic mode; in Day and Night these render nothing.
import type { CSSProperties } from 'react'
import { useActiveTheme, usePsyDog, breedFor } from '../theme'
import { DOGS, dogFace, cardSrc, picSrc, dogStrip, floatSrc, hashStr, type DogId, type CardId, type WideId, type FloatId } from '../art/samurai'

export type PsyKind = 'face' | 'tunnel' | 'liquid' | 'mandala'
const BASE = import.meta.env.BASE_URL ?? '/'
export const psySrc = (k: Exclude<PsyKind, 'mandala'>) => `${BASE}psy/${k}.webp`

export function PsyArt({ kind, className = '', style }: { kind: PsyKind; className?: string; style?: CSSProperties }) {
  const theme = useActiveTheme()
  if (theme !== 'psy') return null
  if (kind === 'mandala') return <Mandala className={className} style={style} />
  return <img className={`psy-art psy-${kind} ${className}`} src={psySrc(kind)} alt="" aria-hidden="true" draggable={false} style={style} />
}

const dog = (id: DogId) => DOGS.find(d => d.id === id) ?? DOGS[0]

/** A samurai dog's face (shown round). With no `breed`, it's your samurai (Settings → Look), or a mix chosen by `seed`. */
export function PsyDog({ breed, seed = 'dog', className = '', style }: { breed?: DogId; seed?: string; className?: string; style?: CSSProperties }) {
  const theme = useActiveTheme()
  const choice = usePsyDog()
  if (theme !== 'psy') return null
  const id = breed ?? breedFor(seed, choice)
  return <img className={`psy-art psy-face dog-${id} ${className}`} src={dogFace(id)} alt="" aria-hidden="true" draggable={false} style={style} />
}

/** A samurai dog's whole picture (one of its cards, picked by `seed`). */
export function PsyDogCard({ breed, seed = 'card', className = '' }: { breed?: DogId; seed?: string; className?: string }) {
  const theme = useActiveTheme()
  const choice = usePsyDog()
  if (theme !== 'psy') return null
  const id = breed ?? breedFor(seed, choice)
  const cards = dog(id).cards
  const c: CardId = cards[hashStr(seed) % cards.length]
  return <img className={`psy-art psy-card dog-${id} ${className}`} src={cardSrc(c)} alt="" aria-hidden="true" draggable={false} />
}

/** A picture behind a screen's title: a banner, a story panel or a card; `at` = object-position. */
export function PsyPic({ id, at = '50% 40%', className = '' }: { id: CardId | WideId; at?: string; className?: string }) {
  const theme = useActiveTheme()
  if (theme !== 'psy') return null
  return <img className={`psy-art psy-pic pic-${id} ${className}`} src={picSrc(id)} alt="" aria-hidden="true" draggable={false} style={{ objectPosition: at }} />
}

/** The strip of samurai dog heads; `at` picks which part shows (0% = left end). */
export function PsyStrip({ at = '0%', className = '' }: { at?: string; className?: string }) {
  const theme = useActiveTheme()
  if (theme !== 'psy') return null
  return <img className={`psy-art psy-strip ${className}`} src={dogStrip()} alt="" aria-hidden="true" draggable={false} style={{ objectPosition: `${at} 30%` }} />
}

/** An original mandala (rings of petals in neon colours) that turns slowly round the daily-goal ring. */
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
        <g key={k}>
          {Array.from({ length: g.n }, (_, i) => (
            <ellipse key={i} cx={0} cy={-(g.r + g.len / 2)} rx={g.w / 2} ry={g.len / 2} fill={g.c} fillOpacity={0.85}
              stroke="#14002b" strokeWidth={0.8} transform={`rotate(${(360 / g.n) * i})`} />
          ))}
        </g>
      ))}
      <circle r={16} fill="url(#psyCore)" stroke="#14002b" strokeWidth={1} />
      <circle r={88} fill="none" stroke="#ff3fd8" strokeOpacity={0.5} strokeWidth={1.2} strokeDasharray="2 4" />
    </svg>
  )
}

const FLOATERS: FloatId[] = ['oni-sun', 'oni-moon', 'eclipse', 'shroom-guitar', 'rainbow-moon', 'oni-smoke', 'wave']

/** The moving liquid colours behind the whole app, with snippets of the artwork (the oni sun and moon, the eclipse,
 *  the mushroom guitar, the waves …) floating in the gaps between the cards. */
export function PsyBackdrop() {
  const theme = useActiveTheme()
  if (theme !== 'psy') return null
  return (
    <div className="psy-backdrop" aria-hidden="true">
      <div className="psy-liquid" />
      <div className="psy-veil" />
      <div className="psy-scenery">
        {FLOATERS.map(f => <img key={f} className={`sc sc-${f}`} src={floatSrc(f)} alt="" draggable={false} />)}
      </div>
    </div>
  )
}
