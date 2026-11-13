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
