// Sound packs as sounds of their own (owner 2026-11-12: the recorded Ample, Flatpick 6, Mayer, Cory Wong, Henson … each
// pickable by name, wherever a sound is picked). A guitar pack becomes the sound `pack:<id>`; until its recordings are
// loaded it falls back to the closest built-in bank (`base`), so nothing is ever silent.
import type { Pack } from '../engine/packLogic'

export type BuiltInSound = 'acoustic' | 'j45' | 'nylon' | 'clean' | 'electric' | 'crunch' | 'metal' | 'synth'
export interface PackSound { id: string; name: string; base: BuiltInSound; amp: boolean }

const KEY = 'kg:packSounds'

/** Which built-in sound a pack is closest to (its stand-in while loading, and how loud it sits in a band). */
export function packBase(p: Pick<Pack, 'id' | 'name' | 'kind'> & { renderedWith?: { amp?: string } }): BuiltInSound | null {
  if (p.kind !== 'guitar') return null
  const s = `${p.id} ${p.name}`.toLowerCase()
  const amp = !!p.renderedWith?.amp
  // a DI pack (no amp) isn't a sound to play: it's what the amp tones are made from
  if (!amp && /(^|[^a-z])di([^a-z]|$)|direct/.test(s)) return null
  if (/nylon|classical|uke|ukulele/.test(s)) return 'nylon'
  if (amp || /mayer|wong|henson|rabea|petrucci|nolly|misha|fortin|asato|crunch|metal|chug|djent|clean|funk|lead/.test(s)) {
    if (/metal|chug|djent|fortin|nolly|misha|petrucci|lead|high.?gain/.test(s)) return 'metal'
    if (/crunch|rabea|blues|drive/.test(s)) return 'crunch'
    return 'clean'
  }
  return 'acoustic'
}

/** The packs that are sounds, from the list kept in sync with the phone's imported packs. */
export function packSounds(): PackSound[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]') as PackSound[]; return Array.isArray(v) ? v : [] } catch { return [] }
}
/** Make the list from the imported packs (call after an import or a delete, and at start-up). */
export function setPackSounds(packs: (Pick<Pack, 'id' | 'name' | 'kind'> & { renderedWith?: { amp?: string } })[]) {
  const list: PackSound[] = []
  for (const p of packs) {
    const base = packBase(p)
    if (!base) continue
    list.push({ id: p.id, name: p.name, base, amp: !!p.renderedWith?.amp || base === 'crunch' || base === 'metal' })
  }
  list.sort((a, b) => a.name.localeCompare(b.name))
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* private */ }
  return list
}

/** A pack that should take over a built-in sound the first time it arrives (the owner's picks; he can change it). */
export const FIRST_CHOICE: Record<string, BuiltInSound> = { agsj: 'acoustic' }

// ---- recorded basses (Logic's Studio Bass, rendered on the Mac): each bass line picks the one that suits its style ----
export type BassKind = 'session' | 'sixties' | 'modern' | 'upright'
export const BASS_PACK: Record<BassKind, string> = { session: 'studiobass-session', sixties: 'studiobass-sixties', modern: 'studiobass-modern', upright: 'studiobass-upright' }
export const BASS_LABEL: Record<BassKind, string> = { session: 'Session (round, all-round)', sixties: 'Sixties (flatwounds: reggae, soul)', modern: 'Modern (tight: prog, funk, rock)', upright: 'Upright (bluegrass, folk, jazz)' }
const BASS_KEY = 'kg:bassPacks'
/** Bass packs on this phone (kept with the pack sound list). */
export function bassPacks(): string[] { try { const v = JSON.parse(localStorage.getItem(BASS_KEY) ?? '[]'); return Array.isArray(v) ? v : [] } catch { return [] } }
export function setBassPacks(ids: string[]) { try { localStorage.setItem(BASS_KEY, JSON.stringify(ids)) } catch { /* private */ } }
/** The owner's choice of bass: 'auto' (the bass line's style decides) or one kind. */
export function bassChoice(): 'auto' | BassKind {
  try { const v = JSON.parse(localStorage.getItem('kg:bassSound') ?? '"auto"'); return v in BASS_PACK ? v : 'auto' } catch { return 'auto' }
}
export function setBassChoice(c: 'auto' | BassKind) { try { localStorage.setItem('kg:bassSound', JSON.stringify(c)) } catch { /* private */ } }
/** The bass pack to play for a bass line's kind, when it's on this phone (else the built-in bass bank). */
export function bassPackFor(kind?: BassKind): string | null {
  const k = bassChoice() === 'auto' ? kind ?? 'session' : bassChoice() as BassKind
  const have = bassPacks()
  const id = BASS_PACK[k]
  if (have.includes(id)) return id
  // the closest one that is here: any recorded bass beats the built-in one
  const order: BassKind[] = k === 'upright' ? ['upright', 'sixties', 'session', 'modern'] : k === 'sixties' ? ['sixties', 'session', 'modern', 'upright'] : k === 'modern' ? ['modern', 'session', 'sixties', 'upright'] : ['session', 'modern', 'sixties', 'upright']
  return order.map(x => BASS_PACK[x]).find(x => have.includes(x)) ?? null
}

/** The recorded bass each Jam / band style suits (styles not listed follow the bass line, else the Session bass). */
export const STYLE_BASS: Record<string, BassKind | undefined> = {
  bluegrass: 'sixties', jazz: 'sixties', bossa: 'sixties', folk: 'sixties', acoustic: 'sixties', classical: 'sixties', slackkey: 'sixties', island: 'sixties',
  reggae: 'sixties', reggaerock: 'sixties', motown: 'sixties', neosoul: 'sixties', gospel: 'sixties', lofi: 'sixties', blues: 'sixties', afrobeat: 'sixties',
  progclean: 'modern', progmetal: 'modern', mathrock: 'modern', metal: 'modern', funk: 'modern', funkpop: 'modern', grunge: 'modern', punk: 'modern',
}
/** The bass Play's band uses right now (Play sets it from the song's band style). */
let bandBass: BassKind | undefined
export const setBandBass = (k: BassKind | undefined) => { bandBass = k }
export const currentBandBass = () => bandBass
