// Argon Step 2: Parts instead of samples (`notes/SOUND-ENGINE-FINISH.md` Step 2 & `notes/AUDIO-ENGINE.md`).
// Features ask for a musical Part (`guitar.acoustic`, `guitar.12string`, `guitar.sunburst`, `guitar.dracus`,
// `bass.jambass`, `bass.upright`, `drums.acoustic`, `keys.piano`, ...) and send musical events (`note`, `strum`,
// `mute`, `pm`, `harmonic`, `slide`, `bend`, `hammer`, `pull`, `chuck`).
// Maps bidirectionally onto today's `SoundId` and `pack:<id>` sounds so every existing picker and caller keeps working.

import { bus, route, type Role } from '../audio/engine'
import { playNote, strum, playBass, playFromBank, activeSound, packFor, type Handle, type NoteOpts, type SoundId } from '../audio/pluck'
import { playDrum, type KitId, type Voice } from '../audio/drums'
import type { BassKind, BuiltInSound } from '../audio/packSounds'
import { type BodyCabIrId } from './bodyCabIr'

export type GuitarPartId =
  | 'guitar.acoustic'
  | 'guitar.j45'
  | 'guitar.steel'
  | 'guitar.12string'
  | 'guitar.nylon'
  | 'guitar.picked.acoustic'
  | 'guitar.picked.nylon'
  | 'guitar.flatpick'
  | 'guitar.electric.clean'
  | 'guitar.electric.jazz'
  | 'guitar.sunburst'
  | 'guitar.storm'
  | 'guitar.dracus'
  | 'guitar.crunch'
  | 'guitar.metal'
  | 'guitar.synth'

export type BassPartId =
  | 'bass.session'
  | 'bass.sixties'
  | 'bass.modern'
  | 'bass.upright'
  | 'bass.jambass'

export type DrumPartId = `drums.${KitId}`
export type KeysPartId = 'keys.piano' | 'keys.epiano' | 'keys.organ' | 'keys.strings' | 'keys.pad' | 'keys.synth'
export type PartId = GuitarPartId | BassPartId | DrumPartId | KeysPartId

export interface PartDescriptor {
  id: PartId
  label: string
  category: 'guitar' | 'bass' | 'drums' | 'keys'
  baseSound: BuiltInSound
  preferredPacks: string[]
  defaultIr: BodyCabIrId
  acoustic: boolean
  twelveString?: boolean
}

export const GUITAR_PARTS: PartDescriptor[] = [
  { id: 'guitar.acoustic', label: 'Acoustic Dreadnought', category: 'guitar', baseSound: 'acoustic', preferredPacks: ['agsj', 'picked-acoustic', 'steelstrings'], defaultIr: 'j45', acoustic: true },
  { id: 'guitar.j45', label: 'Gibson J-45 Acoustic', category: 'guitar', baseSound: 'j45', preferredPacks: ['agsj', 'picked-acoustic'], defaultIr: 'j45', acoustic: true },
  { id: 'guitar.steel', label: 'Evolution Steel Strings', category: 'guitar', baseSound: 'acoustic', preferredPacks: ['steelstrings', 'agsj'], defaultIr: 'taylor314', acoustic: true },
  { id: 'guitar.12string', label: '12-String Acoustic (Strummed 2)', category: 'guitar', baseSound: 'j45', preferredPacks: ['strummed-12', 'strummed-acoustic-12', 'agsj'], defaultIr: 'sj200', acoustic: true, twelveString: true },
  { id: 'guitar.nylon', label: 'Evolution Modern Nylon', category: 'guitar', baseSound: 'nylon', preferredPacks: ['modernnylon', 'picked-nylon'], defaultIr: 'off', acoustic: true },
  { id: 'guitar.picked.acoustic', label: 'Session Guitarist Picked Acoustic', category: 'guitar', baseSound: 'acoustic', preferredPacks: ['picked-acoustic', 'agsj'], defaultIr: 'j45', acoustic: true },
  { id: 'guitar.picked.nylon', label: 'Session Guitarist Picked Nylon', category: 'guitar', baseSound: 'nylon', preferredPacks: ['picked-nylon', 'modernnylon'], defaultIr: 'off', acoustic: true },
  { id: 'guitar.flatpick', label: 'Evolution Flatpick 6 (Bluegrass)', category: 'guitar', baseSound: 'j45', preferredPacks: ['flatpick6', 'agsj'], defaultIr: 'j45', acoustic: true },
  { id: 'guitar.electric.clean', label: 'Clean Electric (Strat / Mayer / Wong)', category: 'guitar', baseSound: 'clean', preferredPacks: ['mayer-clean', 'corywong-funk', 'henson-clean', 'strat-di'], defaultIr: 'deluxe66', acoustic: false },
  { id: 'guitar.electric.jazz', label: 'Jazz Archtop & Octaves', category: 'guitar', baseSound: 'electric', preferredPacks: ['jazz-octaves', 'sunburst-clean', 'mayer-clean'], defaultIr: 'imperialJazz', acoustic: false },
  { id: 'guitar.sunburst', label: 'Electric Sunburst Deluxe (Les Paul)', category: 'guitar', baseSound: 'clean', preferredPacks: ['sunburst-deluxe', 'sunburst-clean', 'mayer-clean'], defaultIr: 'tworock65', acoustic: false },
  { id: 'guitar.storm', label: 'Electric Storm Deluxe (Modern Rock)', category: 'guitar', baseSound: 'crunch', preferredPacks: ['storm-deluxe', 'rabea-crunch', 'henson-crunch'], defaultIr: 'yorkMesa412', acoustic: false },
  { id: 'guitar.dracus', label: 'Evolution Dracus (Heavy / Extended)', category: 'guitar', baseSound: 'metal', preferredPacks: ['dracus-metal', 'dracus', 'fortin-metal', 'petrucci-lead', 'nolly-rhythm', 'misha-djent'], defaultIr: 'ggdZilla', acoustic: false },
  { id: 'guitar.crunch', label: 'Overdriven Crunch', category: 'guitar', baseSound: 'crunch', preferredPacks: ['rabea-crunch', 'henson-crunch', 'sunburst-crunch'], defaultIr: 'tworock65', acoustic: false },
  { id: 'guitar.metal', label: 'High-Gain Metal Stack', category: 'guitar', baseSound: 'metal', preferredPacks: ['fortin-metal', 'nolly-rhythm', 'petrucci-lead', 'misha-djent', 'dracus-metal'], defaultIr: 'yorkMesa412', acoustic: false },
  { id: 'guitar.synth', label: 'Simple Plucked Synth', category: 'guitar', baseSound: 'synth', preferredPacks: ['henson-synth'], defaultIr: 'off', acoustic: false },
]

/** Map any existing `SoundId` (built-in or `pack:<id>`) onto its musical `GuitarPartId`. */
export function partForSound(sound?: SoundId | null): GuitarPartId {
  const id = sound ?? activeSound()
  if (id.startsWith('pack:')) {
    const pk = id.slice(5).toLowerCase()
    if (/12|twelve/.test(pk)) return 'guitar.12string'
    if (/flatpick/.test(pk)) return 'guitar.flatpick'
    if (/picked.?nylon/.test(pk)) return 'guitar.picked.nylon'
    if (/nylon/.test(pk)) return 'guitar.nylon'
    if (/picked.?acoustic/.test(pk)) return 'guitar.picked.acoustic'
    if (/steel/.test(pk)) return 'guitar.steel'
    if (/agsj|j45|jumbo/.test(pk)) return 'guitar.j45'
    if (/sunburst/.test(pk)) return 'guitar.sunburst'
    if (/storm/.test(pk)) return 'guitar.storm'
    if (/dracus/.test(pk)) return 'guitar.dracus'
    if (/jazz|octave/.test(pk)) return 'guitar.electric.jazz'
    if (/fortin|nolly|misha|petrucci|metal|djent|chug|5150/.test(pk)) return 'guitar.metal'
    if (/rabea|crunch|drive/.test(pk)) return 'guitar.crunch'
    if (/mayer|wong|clean|strat/.test(pk)) return 'guitar.electric.clean'
    if (/synth/.test(pk)) return 'guitar.synth'
    return 'guitar.acoustic'
  }
  switch (id) {
    case 'j45': return 'guitar.j45'
    case 'nylon': return 'guitar.nylon'
    case 'clean': return 'guitar.electric.clean'
    case 'electric': return 'guitar.electric.jazz'
    case 'crunch': return 'guitar.crunch'
    case 'metal': return 'guitar.metal'
    case 'synth': return 'guitar.synth'
    default: return 'guitar.acoustic'
  }
}

/** Resolve a `GuitarPartId` back to the best available `SoundId` (picking an installed pack when present, else `baseSound`). */
export function soundForPart(part: GuitarPartId): SoundId {
  const desc = GUITAR_PARTS.find(p => p.id === part) ?? GUITAR_PARTS[0]
  const chosenPack = packFor(desc.baseSound)
  if (chosenPack) return `pack:${chosenPack}`
  return desc.baseSound
}

/** Auto-pair Lead Guitar Part, Rhythm Guitar Part, Bass Part, and Body/Cab IR for any musical style. */
export function partsForStyle(style: string): {
  lead: GuitarPartId
  rhythm: GuitarPartId
  bass: BassPartId
  ir: BodyCabIrId
} {
  const s = style.toLowerCase()
  if (/bluegrass|billy/.test(s)) {
    return { lead: 'guitar.flatpick', rhythm: 'guitar.j45', bass: 'bass.upright', ir: 'j45' }
  }
  if (/folk|country|acoustic|fingerstyle|slackkey|island|gospel/.test(s)) {
    return { lead: 'guitar.picked.acoustic', rhythm: 'guitar.12string', bass: 'bass.upright', ir: 'sj200' }
  }
  if (/classical|flamenco|bossa|latin/.test(s)) {
    return { lead: 'guitar.nylon', rhythm: 'guitar.picked.nylon', bass: 'bass.upright', ir: 'taylor314' }
  }
  if (/jazz|neosoul/.test(s)) {
    return { lead: 'guitar.electric.jazz', rhythm: 'guitar.sunburst', bass: 'bass.sixties', ir: 'imperialJazz' }
  }
  if (/funk|motown|pop|disco|afrobeat/.test(s)) {
    return { lead: 'guitar.electric.clean', rhythm: 'guitar.sunburst', bass: 'bass.jambass', ir: 'deluxe66' }
  }
  if (/blues|mayer|southern|classic|rock|grunge|altrock|punk/.test(s)) {
    return { lead: 'guitar.sunburst', rhythm: 'guitar.storm', bass: 'bass.jambass', ir: 'tworock65' }
  }
  if (/metal|prog|djent|shred|buckethead|thrash/.test(s)) {
    return { lead: 'guitar.dracus', rhythm: 'guitar.metal', bass: 'bass.modern', ir: 'yorkMesa412' }
  }
  if (/reggae/.test(s)) {
    return { lead: 'guitar.electric.clean', rhythm: 'guitar.sunburst', bass: 'bass.sixties', ir: 'deluxe66' }
  }
  return { lead: 'guitar.acoustic', rhythm: 'guitar.acoustic', bass: 'bass.session', ir: 'j45' }
}

export type PartArticulation =
  | 'note'
  | 'strum'
  | 'mute'
  | 'pm'
  | 'harmonic'
  | 'slide'
  | 'bend'
  | 'hammer'
  | 'pull'
  | 'chuck'

export interface PartEvent {
  kind: PartArticulation
  midi?: number
  midis?: number[]
  /** Velocity 1..127 (default 96) */
  vel?: number
  string?: number
  fret?: number
  when?: number
  dur?: number
  up?: boolean
  spread?: number
  double?: boolean
  bend?: number
  bendTime?: number
  prebent?: boolean
  release?: boolean
  slideFrom?: number
  slideTime?: number
  voice?: Voice
  role?: Role
  dest?: AudioNode
}

/**
 * Send a unified musical event to any `PartId` (`guitar.*`, `bass.*`, `drums.*`, `keys.*`).
 */
export function playPart(part: PartId, ev: PartEvent): Handle {
  const vel = Math.max(1, Math.min(127, ev.vel ?? 96))
  const gain = Math.max(0.05, Math.min(1.2, (vel / 127) * 0.95))
  const when = ev.when ?? 0

  if (part.startsWith('drums.')) {
    const kit = part.slice(6) as KitId
    const target = ev.dest ?? (ev.role === 'band' ? bus('drums') : route(ev.role ?? 'any', 'drums'))
    playDrum(ev.voice ?? 'kick', when, gain, target, { kit })
    return { stop: () => {} }
  }

  if (part.startsWith('bass.')) {
    const bKindRaw = part.slice(5)
    const bKind: BassKind =
      bKindRaw === 'upright' ? 'upright' : bKindRaw === 'sixties' || bKindRaw === 'jambass' ? 'sixties' : bKindRaw === 'modern' ? 'modern' : 'session'
    const target = ev.dest ?? (ev.role === 'band' ? bus('bass') : route(ev.role ?? 'any', 'bass'))
    return playBass(ev.midi ?? ev.midis?.[0] ?? 40, when, gain, target, bKind)
  }

  if (part.startsWith('keys.')) {
    const bankMap: Record<string, string> = {
      'keys.piano': 'gm/piano',
      'keys.epiano': 'gm/epiano',
      'keys.organ': 'gm/organ',
      'keys.strings': 'gm/strings',
      'keys.pad': 'gm/pad',
      'keys.synth': 'gm/lead',
    }
    const bankId = bankMap[part] ?? 'gm/piano'
    const target = ev.dest ?? route(ev.role ?? 'any', 'keys')
    if (ev.midis && ev.midis.length > 1) {
      const hs = ev.midis.map(m => playFromBank(bankId, m, when, gain * 0.75, target))
      return { stop: (at?: number) => hs.forEach(h => h.stop(at)) }
    }
    return playFromBank(bankId, ev.midi ?? ev.midis?.[0] ?? 60, when, gain, target)
  }

  // Guitar part
  const gPart = part as GuitarPartId
  const desc = GUITAR_PARTS.find(p => p.id === gPart) ?? GUITAR_PARTS[0]
  const sound = soundForPart(gPart)
  const target = ev.dest ?? (ev.role === 'me' ? bus('me') : ev.role === 'band' ? bus('other') : route('any', 'guitar'))

  if (ev.kind === 'strum' || ev.kind === 'chuck' || (ev.midis && ev.midis.length > 1)) {
    const notes = ev.midis ?? (ev.midi !== undefined ? [ev.midi] : [40, 47, 52])
    const isChuck = ev.kind === 'chuck' || ev.kind === 'mute'
    const main = strum(notes, when, {
      up: ev.up,
      spread: isChuck ? 0.006 : ev.spread,
      gain: isChuck ? gain * 0.65 : gain,
      dest: target,
      sound,
      pm: isChuck || ev.kind === 'pm',
      double: ev.double,
    })
    if ( isChuck ) {
      main.stop((when || 0) + 0.045)
    }
    // 12-string shimmer: pair the bottom 4 strings an octave up (+12) and top 2 strings in unison (+3 cents) slightly delayed
    if (desc.twelveString && !isChuck && notes.length >= 3) {
      const octaveMidis = notes.map((m, i) => (i < notes.length - 2 && m + 12 <= 84 ? m + 12 : m))
      const shimmer = strum(octaveMidis, (when || 0) + 0.004, {
        up: ev.up,
        spread: ev.spread,
        gain: gain * 0.42,
        dest: target,
        sound,
        pm: ev.kind === 'pm',
      })
      return { stop: (at?: number) => { main.stop(at); shimmer.stop(at) } }
    }
    return main
  }

  const techMap: Partial<Record<PartArticulation, string>> = {
    hammer: 'h',
    pull: 'p',
    slide: ev.slideFrom !== undefined && ev.midi !== undefined && ev.slideFrom > ev.midi ? '\\' : '/',
  }
  const nOpts: NoteOpts = {
    sound,
    pm: ev.kind === 'pm' || ev.kind === 'mute',
    double: ev.double,
    string: ev.string,
    tech: techMap[ev.kind],
    slideFrom: ev.slideFrom,
    slideTime: ev.slideTime,
    bend: ev.kind === 'bend' ? (ev.bend ?? 2) : ev.bend,
    bendTime: ev.bendTime,
    prebent: ev.prebent,
    release: ev.release,
  }
  const midi = ev.kind === 'harmonic' ? Math.min(96, (ev.midi ?? 60) + 12) : (ev.midi ?? 60)
  const h = playNote(midi, when, ev.kind === 'harmonic' ? gain * 0.72 : gain, target, nOpts)
  if (ev.kind === 'mute') {
    h.stop((when || 0) + 0.04)
  } else if (ev.dur !== undefined && ev.dur > 0) {
    h.stop((when || 0) + ev.dur)
  }
  return h
}
