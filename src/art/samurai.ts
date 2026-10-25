// Psychedelic mode's pictures, all cut from the owner's own ukiyo-e artwork (art/*.jpg) by tools/make-samurai.py into
// public/samurai/: samurai dogs (faces and whole cards; every one of them plays guitar), banners, story panels and
// round snippets that float behind the cards.
export type DogId = 'lab' | 'princess' | 'shiba' | 'husky' | 'shepherd' | 'boxer' | 'golden' | 'rottweiler' | 'frenchie' | 'akita' | 'doberman' | 'muscle'
export type CardId = 'lab' | 'concert' | 'ninja' | 'princess' | 'shiba' | 'husky' | 'shepherd' | 'boxer' | 'golden' | 'rottweiler' | 'frenchie' | 'akita'
  | 'doberman' | 'husky-bass' | 'duel' | 'muscle' | 'shrooms' | 'dragon-amp' | 'galaxy' | 'skulls'
export type WideId = 'dragon' | 'vortex' | 'torii' | 'waves' | 'rise' | 'march' | 'attack' | 'peace' | 'stage'
export type FloatId = 'oni-sun' | 'oni-moon' | 'eclipse' | 'rainbow-moon' | 'shroom-guitar' | 'oni-smoke' | 'wave'

/** `name` is shown under the dog (only Brandy, the owner's chocolate lab, has one); `breed` is read out by screen readers only. */
export const DOGS: { id: DogId; name?: string; breed: string; cards: CardId[] }[] = [
  { id: 'lab', name: 'Brandy', breed: 'chocolate lab', cards: ['lab', 'concert', 'ninja'] },
  { id: 'princess', name: 'Brandy', breed: 'chocolate lab', cards: ['princess'] },
  { id: 'shiba', breed: 'Shiba Inu', cards: ['shiba'] },
  { id: 'husky', breed: 'husky', cards: ['husky', 'husky-bass'] },
  { id: 'shepherd', breed: 'German shepherd', cards: ['shepherd', 'duel'] },
  { id: 'boxer', breed: 'boxer', cards: ['boxer'] },
  { id: 'golden', breed: 'golden retriever', cards: ['golden'] },
  { id: 'rottweiler', breed: 'Rottweiler', cards: ['rottweiler', 'duel'] },
  { id: 'frenchie', breed: 'French bulldog', cards: ['frenchie'] },
  { id: 'akita', breed: 'Akita', cards: ['akita'] },
  { id: 'doberman', breed: 'Doberman', cards: ['doberman'] },
  { id: 'muscle', breed: 'pit bull', cards: ['muscle'] },
]
export const DOG_IDS = DOGS.map(d => d.id)

/** Everything for the gallery (Settings → Look → The art), in order. The pictures have no titles. */
export const GALLERY: { id: CardId | WideId; wide?: boolean }[] = [
  { id: 'stage', wide: true }, { id: 'concert' }, { id: 'ninja' }, { id: 'lab' }, { id: 'princess' },
  { id: 'rise', wide: true }, { id: 'march', wide: true }, { id: 'attack', wide: true }, { id: 'peace', wide: true },
  { id: 'shiba' }, { id: 'husky' }, { id: 'husky-bass' }, { id: 'shepherd' }, { id: 'boxer' }, { id: 'golden' },
  { id: 'rottweiler' }, { id: 'duel' }, { id: 'frenchie' }, { id: 'akita' }, { id: 'doberman' }, { id: 'muscle' },
  { id: 'dragon', wide: true }, { id: 'vortex', wide: true }, { id: 'torii', wide: true }, { id: 'waves', wide: true },
  { id: 'shrooms' }, { id: 'dragon-amp' }, { id: 'galaxy' }, { id: 'skulls' },
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
