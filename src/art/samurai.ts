// Psychedelic mode's pictures, all cut from the owner's own ukiyo-e artwork (art/*.jpg) by tools/make-samurai.py into
// public/samurai/: samurai dogs (faces and whole cards; every one of them plays guitar), banners, story panels and
// round snippets that float behind the cards.
export type DogId = 'lab' | 'princess' | 'shiba' | 'husky' | 'shepherd' | 'boxer' | 'golden' | 'rottweiler' | 'frenchie' | 'akita' | 'doberman' | 'muscle'
export type CardId = 'lab' | 'concert' | 'ninja' | 'princess' | 'shiba' | 'husky' | 'shepherd' | 'boxer' | 'golden' | 'rottweiler' | 'frenchie' | 'akita'
  | 'doberman' | 'husky-bass' | 'duel' | 'muscle' | 'shrooms' | 'dragon-amp' | 'galaxy' | 'skulls'
export type WideId = 'dragon' | 'vortex' | 'torii' | 'waves' | 'rise' | 'march' | 'attack' | 'peace' | 'stage'
export type FloatId = 'oni-sun' | 'oni-moon' | 'eclipse' | 'rainbow-moon' | 'shroom-guitar' | 'oni-smoke' | 'wave'

export const DOGS: { id: DogId; name: string; cards: CardId[] }[] = [
  { id: 'lab', name: 'Chocolate lab', cards: ['lab', 'concert', 'ninja'] },
  { id: 'princess', name: 'Brandy the princess', cards: ['princess'] },
  { id: 'shiba', name: 'Shiba Inu', cards: ['shiba'] },
  { id: 'husky', name: 'Husky', cards: ['husky', 'husky-bass'] },
  { id: 'shepherd', name: 'German shepherd', cards: ['shepherd', 'duel'] },
  { id: 'boxer', name: 'Boxer', cards: ['boxer'] },
  { id: 'golden', name: 'Golden retriever', cards: ['golden'] },
  { id: 'rottweiler', name: 'Rottweiler', cards: ['rottweiler', 'duel'] },
  { id: 'frenchie', name: 'French bulldog', cards: ['frenchie'] },
  { id: 'akita', name: 'Akita', cards: ['akita'] },
  { id: 'doberman', name: 'Doberman', cards: ['doberman'] },
  { id: 'muscle', name: 'Pit bull', cards: ['muscle'] },
]
export const DOG_IDS = DOGS.map(d => d.id)

/** Everything for the gallery (Settings → Look → The art). */
export const GALLERY: { id: CardId | WideId; wide?: boolean; title: string }[] = [
  { id: 'stage', wide: true, title: 'The festival show' },
  { id: 'concert', title: 'The festival show (whole poster)' },
  { id: 'ninja', title: 'Ninja lab: music is my weapon' },
  { id: 'lab', title: 'The KGuitar poster' },
  { id: 'princess', title: 'Brandy the princess' },
  { id: 'rise', wide: true, title: 'The princess rises' },
  { id: 'march', wide: true, title: 'The night march' },
  { id: 'attack', wide: true, title: 'The sound attack' },
  { id: 'peace', wide: true, title: 'Peace returns' },
  { id: 'shiba', title: 'Shiba Inu' }, { id: 'husky', title: 'Husky' }, { id: 'husky-bass', title: 'Husky on bass' },
  { id: 'shepherd', title: 'German shepherd' }, { id: 'boxer', title: 'Boxer' }, { id: 'golden', title: 'Golden retriever' },
  { id: 'rottweiler', title: 'Rottweiler' }, { id: 'duel', title: 'The duel' }, { id: 'frenchie', title: 'French bulldog' },
  { id: 'akita', title: 'Akita' }, { id: 'doberman', title: 'Doberman' }, { id: 'muscle', title: 'Pit bull' },
  { id: 'dragon', wide: true, title: 'Dragon guitar' }, { id: 'vortex', wide: true, title: 'Amp vortex' },
  { id: 'torii', wide: true, title: 'Torii and oni volcanoes' }, { id: 'waves', wide: true, title: 'Waves of amps' },
  { id: 'shrooms', title: 'Mushroom guitar' }, { id: 'dragon-amp', title: 'Dragon amp' }, { id: 'galaxy', title: 'Galaxy guitar' }, { id: 'skulls', title: 'Skull amp wall' },
]

// order of the heads in strip.webp (left to right)
export const STRIP_ORDER: DogId[] = ['shiba', 'husky', 'shepherd', 'boxer', 'golden', 'rottweiler', 'frenchie', 'akita', 'doberman', 'muscle', 'princess', 'lab']

const base = (): string => {
  try { return (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/' } catch { return '/' }
}
const WIDE_IDS: string[] = ['dragon', 'vortex', 'torii', 'waves', 'rise', 'march', 'attack', 'peace', 'stage']
export const isWide = (id: string) => WIDE_IDS.includes(id)
export const dogFace = (id: DogId) => `${base()}samurai/${id}.webp`
export const cardSrc = (id: CardId) => `${base()}samurai/card-${id}.webp`
/** A header picture: a wide banner or story panel, or a whole card. */
export const picSrc = (id: CardId | WideId) => isWide(id) ? `${base()}samurai/wide-${id}.webp` : cardSrc(id as CardId)
export const thumbSrc = (id: CardId | WideId) => `${base()}samurai/thumb-${id}.webp`
export const floatSrc = (id: FloatId) => `${base()}samurai/float-${id}.webp`
export const dogStrip = () => `${base()}samurai/strip.webp`
/** object-position (x %) that centres a dog in the strip. */
export const stripAt = (id: DogId) => `${(STRIP_ORDER.indexOf(id) / (STRIP_ORDER.length - 1)) * 100}%`

export function hashStr(t: string) {
  let h = 2166136261
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
