// Shared 47-Style AI Song & Beat Composer for KGuitar's Beat Maker, Strum Machine & Band Jam.
// Generates both Simple Loops (4/8 bars: Drums + Bass + Keys/Synth) and Full Multi-Section Songs
// (Intro -> Verse -> Chorus -> Solo Break -> Outro) with dynamic drum intensity, turnaround fills,
// role-aware mixes (Lead / Rhythm / Drums Only), and natural-language prompt parsing (100% offline!).
import type { KitId, Voice } from '../audio/drums'
import {
  bassNotesFor,
  chordNotesFor,
  newId,
  rowsFromGroove,
  STEPS_PER_BAR,
  type Beat,
  type DrumRow,
  type PartContent,
  type PartId,
  type PNote,
  type Track,
} from '../studio/beat'
import { instr } from '../studio/sounds'
import { keyPrefersFlats, pc, pcName } from '../theory/notes'
import { parseChordQual, type StrumBar, type StrumChart, type StrumStyleId } from '../theory/harmonicFlow'

export type AIStyleGroup =
  | 'Blues & Soul'
  | 'Rock & Alternative'
  | 'Metal & Heavy'
  | 'Acoustic, Folk & Country'
  | 'Funk, Groove & Reggae'
  | 'Jazz, Latin & World'
  | 'Modern, Chill & Cinematic'

export const AI_STYLE_GROUPS: AIStyleGroup[] = [
  'Blues & Soul',
  'Rock & Alternative',
  'Metal & Heavy',
  'Acoustic, Folk & Country',
  'Funk, Groove & Reggae',
  'Jazz, Latin & World',
  'Modern, Chill & Cinematic',
]

export type SongShape = 'song' | 'loop'
export type JamRole = 'lead' | 'rhythm' | 'drums'
export type JamEnergy = 'chill' | 'groove' | 'drive'

/** A chord step as [semitone offset from tonic, beat.ts CHORD_TYPES id, StrumGrid chord suffix]. */
type ProgSpec = [number, string, string][]

export interface AIStyle {
  id: string
  label: string
  group: AIStyleGroup
  hint: string
  keywords: string[]
  minor: boolean
  defaultKey: string
  bpmRange: [number, number]
  defaultBpm: number
  swing: number
  kit: KitId
  groove: string
  strumStyle: StrumStyleId
  bassInst: string
  keysInst: string
  guitarInst?: string
  chordPattern: 'hold' | 'stabs' | 'offbeat' | 'arp' | 'pulse'
  bassRhythm: number[]
  verseProgs: ProgSpec[]
  chorusProgs: ProgSpec[]
  soloProgs: ProgSpec[]
}

// Reusable authentic progressions
const P = {
  blues12Maj: [
    [[0, '7', '7'], [5, '7', '7'], [0, '7', '7'], [0, '7', '7']],
    [[0, '7', '7'], [0, '7', '7'], [5, '7', '7'], [7, '7', '7']],
  ] as ProgSpec[],
  blues12Min: [
    [[0, 'm7', 'm7'], [5, 'm7', 'm7'], [0, 'm7', 'm7'], [7, '7', '7']],
    [[0, 'm7', 'm7'], [8, 'maj7', 'maj7'], [7, '7', '7'], [0, 'm7', 'm7']],
  ] as ProgSpec[],
  bluesChorus: [
    [[5, '7', '7'], [5, '7', '7'], [0, '7', '7'], [7, '7', '7']],
    [[7, '7', '7'], [5, '7', '7'], [0, '7', '7'], [7, '7', '7']],
  ] as ProgSpec[],
  bluesMinChorus: [
    [[5, 'm7', 'm7'], [0, 'm7', 'm7'], [8, 'maj7', 'maj7'], [7, '7', '7']],
    [[8, 'maj7', 'maj7'], [7, '7', '7'], [5, 'm7', 'm7'], [7, '7', '7']],
  ] as ProgSpec[],
  soulNeo: [
    [[0, 'm9', 'm7'], [5, '9', '7'], [10, 'maj7', 'maj7'], [3, 'maj7', 'maj7']],
    [[2, 'm9', 'm7'], [7, '9', '7'], [0, 'maj9', 'maj7'], [9, 'm7', 'm7']],
    [[0, 'm7', 'm7'], [8, 'maj7', 'maj7'], [5, 'm7', 'm7'], [7, '7', '7']],
  ] as ProgSpec[],
  popMaj: [
    [[0, 'maj', ''], [7, 'maj', ''], [9, 'min', 'm'], [5, 'maj', '']],
    [[0, 'maj', ''], [5, 'maj', ''], [9, 'min', 'm'], [7, 'maj', '']],
    [[0, 'add9', 'add9'], [9, 'm7', 'm7'], [5, 'maj7', 'maj7'], [7, 'maj', '']],
  ] as ProgSpec[],
  popChorus: [
    [[5, 'maj', ''], [7, 'maj', ''], [9, 'min', 'm'], [0, 'maj', '']],
    [[5, 'maj', ''], [0, 'maj', ''], [7, 'maj', ''], [9, 'min', 'm']],
    [[0, 'maj', ''], [7, 'maj', ''], [5, 'maj', ''], [5, 'maj', '']],
  ] as ProgSpec[],
  rockMaj: [
    [[0, '5', '5'], [10, '5', ''], [5, '5', ''], [0, '5', '5']],
    [[0, 'maj', ''], [10, 'maj', ''], [5, 'maj', ''], [7, 'maj', '']],
    [[0, '5', '5'], [5, '5', ''], [7, '5', ''], [5, '5', '']],
  ] as ProgSpec[],
  rockMin: [
    [[0, 'min', 'm'], [8, 'maj', ''], [10, 'maj', ''], [0, 'min', 'm']],
    [[0, 'min', 'm'], [10, 'maj', ''], [8, 'maj', ''], [7, 'maj', '']],
    [[0, 'min', 'm'], [3, 'maj', ''], [10, 'maj', ''], [5, 'maj', '']],
  ] as ProgSpec[],
  rockChorus: [
    [[8, 'maj', ''], [10, 'maj', ''], [0, 'min', 'm'], [3, 'maj', '']],
    [[5, 'maj', ''], [7, 'maj', ''], [0, 'min', 'm'], [10, 'maj', '']],
    [[3, 'maj', ''], [10, 'maj', ''], [5, 'min', 'm'], [8, 'maj', '']],
  ] as ProgSpec[],
  metalRiff: [
    [[0, '5', '5'], [1, '5', '5'], [0, '5', '5'], [10, '5', '5']],
    [[0, '5', '5'], [8, '5', '5'], [10, '5', '5'], [7, '5', '5']],
    [[0, '5', '5'], [3, '5', '5'], [5, '5', '5'], [1, '5', '5']],
  ] as ProgSpec[],
  metalChorus: [
    [[8, '5', '5'], [10, '5', '5'], [0, '5', '5'], [3, '5', '5']],
    [[0, '5', '5'], [8, '5', '5'], [3, '5', '5'], [10, '5', '5']],
  ] as ProgSpec[],
  folkCountry: [
    [[0, 'maj', ''], [0, 'maj', ''], [5, 'maj', ''], [7, 'maj', '']],
    [[0, 'maj', ''], [5, 'maj', ''], [0, 'maj', ''], [7, 'maj', '']],
    [[0, 'maj', ''], [9, 'min', 'm'], [5, 'maj', ''], [7, 'maj', '']],
  ] as ProgSpec[],
  folkChorus: [
    [[5, 'maj', ''], [0, 'maj', ''], [7, 'maj', ''], [0, 'maj', '']],
    [[5, 'maj', ''], [7, 'maj', ''], [0, 'maj', ''], [9, 'min', 'm']],
  ] as ProgSpec[],
  funkGroove: [
    [[0, 'm7', 'm7'], [0, 'm7', 'm7'], [5, '9', '7'], [5, '9', '7']],
    [[0, '9', '7'], [0, '9', '7'], [5, '9', '7'], [7, '9', '7']],
    [[0, 'm7', 'm7'], [5, '7', '7'], [0, 'm7', 'm7'], [10, 'maj', '']],
  ] as ProgSpec[],
  reggaeMin: [
    [[0, 'm7', 'm'], [0, 'm7', 'm'], [5, 'm7', 'm'], [7, 'm7', 'm']],
    [[0, 'min', 'm'], [10, 'maj', ''], [8, 'maj', ''], [7, 'min', 'm']],
  ] as ProgSpec[],
  reggaeMaj: [
    [[0, 'maj', ''], [5, 'maj', ''], [0, 'maj', ''], [7, 'maj', '']],
    [[0, 'maj', ''], [7, 'maj', ''], [9, 'min', 'm'], [5, 'maj', '']],
  ] as ProgSpec[],
  jazzIIV: [
    [[2, 'm7', 'm7'], [7, '7', '7'], [0, 'maj7', 'maj7'], [9, 'm7', 'm7']],
    [[0, 'maj7', 'maj7'], [9, 'm7', 'm7'], [2, 'm7', 'm7'], [7, '7', '7']],
    [[2, 'm7', 'm7'], [7, '9', '7'], [4, 'm7', 'm7'], [9, '7', '7']],
  ] as ProgSpec[],
  jazzChorus: [
    [[5, 'maj7', 'maj7'], [5, 'm7', 'm7'], [4, 'm7', 'm7'], [9, '7', '7']],
    [[2, 'm7', 'm7'], [7, '7', '7'], [0, 'maj7', 'maj7'], [0, 'maj7', 'maj7']],
  ] as ProgSpec[],
  latinMin: [
    [[0, 'm7', 'm'], [5, '7', '7'], [0, 'm7', 'm'], [5, '7', '7']],
    [[0, 'min', 'm'], [10, 'maj', ''], [8, 'maj', ''], [7, '7', '7']],
  ] as ProgSpec[],
  lofiChill: [
    [[2, 'm9', 'm7'], [7, '9', '7'], [0, 'maj9', 'maj7'], [9, 'm7', 'm7']],
    [[0, 'maj7', 'maj7'], [9, 'm7', 'm7'], [5, 'maj7', 'maj7'], [7, '7', '7']],
    [[0, 'm9', 'm7'], [8, 'maj7', 'maj7'], [5, 'm7', 'm7'], [7, '7', '7']],
  ] as ProgSpec[],
  cinematicMin: [
    [[0, 'min', 'm'], [8, 'maj', ''], [3, 'maj', ''], [10, 'maj', '']],
    [[0, 'min', 'm'], [5, 'min', 'm'], [8, 'maj', ''], [7, 'maj', '']],
  ] as ProgSpec[],
}

export const AI_STYLES: AIStyle[] = [
  // ── 1. Blues & Soul (7)
  {
    id: 'slow-blues', label: 'Slow 12/8 Blues', group: 'Blues & Soul',
    hint: 'Expressive slow blues with organ & deep pocket for bending and phrasing',
    keywords: ['slow blues', 'bb king', 'gary moore', '12/8', '6/8 blues', 'ballad blues'],
    minor: false, defaultKey: 'A', bpmRange: [58, 76], defaultBpm: 68, swing: 0.28,
    kit: 'vintage', groove: 'sixeight', strumStyle: 'blues',
    bassInst: 'bass', keysInst: 'organ', guitarInst: 'clean',
    chordPattern: 'hold', bassRhythm: [0, 6, 8, 12],
    verseProgs: P.blues12Maj, chorusProgs: P.bluesChorus, soloProgs: P.blues12Maj,
  },
  {
    id: 'texas-shuffle', label: 'Texas Blues Shuffle', group: 'Blues & Soul',
    hint: 'Driving SRV-style triplet shuffle with punchy bass & crunch',
    keywords: ['texas', 'srv', 'shuffle', 'blues shuffle', 'stevie'],
    minor: false, defaultKey: 'E', bpmRange: [108, 134], defaultBpm: 120, swing: 0.28,
    kit: 'vintage', groove: 'shuffle', strumStyle: 'blues',
    bassInst: 'bass', keysInst: 'wurli', guitarInst: 'crunch',
    chordPattern: 'stabs', bassRhythm: [0, 3, 4, 7, 8, 11, 12, 15],
    verseProgs: P.blues12Maj, chorusProgs: P.bluesChorus, soloProgs: P.blues12Maj,
  },
  {
    id: 'chicago-blues', label: 'Chicago 12-Bar Blues', group: 'Blues & Soul',
    hint: 'Classic mid-tempo blues groove with walking bass and piano comping',
    keywords: ['chicago', '12 bar', '12-bar', 'blues', 'muddy'],
    minor: false, defaultKey: 'G', bpmRange: [86, 108], defaultBpm: 96, swing: 0.24,
    kit: 'vintage', groove: 'shuffle', strumStyle: 'blues',
    bassInst: 'upbass', keysInst: 'honky', guitarInst: 'clean',
    chordPattern: 'stabs', bassRhythm: [0, 4, 8, 12],
    verseProgs: P.blues12Maj, chorusProgs: P.bluesChorus, soloProgs: P.blues12Maj,
  },
  {
    id: 'minor-blues', label: 'Moody Minor Blues', group: 'Blues & Soul',
    hint: 'Soulful minor blues in the pocket — B.B. King / Santana / Gilmour feel',
    keywords: ['minor blues', 'moody blues', 'thrill', 'sad blues', 'dark blues'],
    minor: true, defaultKey: 'A', bpmRange: [70, 96], defaultBpm: 82, swing: 0.22,
    kit: 'vintage', groove: 'purdie', strumStyle: 'blues',
    bassInst: 'bass', keysInst: 'organ', guitarInst: 'clean',
    chordPattern: 'hold', bassRhythm: [0, 6, 8, 14],
    verseProgs: P.blues12Min, chorusProgs: P.bluesMinChorus, soloProgs: P.blues12Min,
  },
  {
    id: 'funky-blues', label: 'Funky Blues Groove', group: 'Blues & Soul',
    hint: 'Syncopated blues-funk groove with clavinet & tight snare ghosts',
    keywords: ['funky blues', 'blues funk', 'robben ford', 'scofield'],
    minor: true, defaultKey: 'E', bpmRange: [94, 114], defaultBpm: 102, swing: 0.14,
    kit: 'studio', groove: 'funk', strumStyle: 'funk',
    bassInst: 'bass', keysInst: 'clavinet', guitarInst: 'clean',
    chordPattern: 'pulse', bassRhythm: [0, 3, 6, 10, 14],
    verseProgs: P.funkGroove, chorusProgs: P.bluesMinChorus, soloProgs: P.funkGroove,
  },
  {
    id: 'neo-soul', label: 'Neo-Soul Pocket', group: 'Blues & Soul',
    hint: 'Warm Rhodes & Wurlitzer chords over a laid-back John Mayer / D’Angelo groove',
    keywords: ['neo soul', 'neo-soul', 'john mayer', 'mayer', 'rhodes', 'soulful', 'dangelo'],
    minor: true, defaultKey: 'E', bpmRange: [76, 96], defaultBpm: 86, swing: 0.18,
    kit: 'lofi', groove: 'purdie', strumStyle: 'rhodes',
    bassInst: 'bass', keysInst: 'wurli', guitarInst: 'clean',
    chordPattern: 'hold', bassRhythm: [0, 6, 10, 14],
    verseProgs: P.soulNeo, chorusProgs: P.lofiChill, soloProgs: P.soulNeo,
  },
  {
    id: 'motown-rnb', label: 'Motown / R&B Soul', group: 'Blues & Soul',
    hint: 'Classic tambourine backbeat, warm bassline, and soulful keys',
    keywords: ['motown', 'rnb', 'r&b', 'soul', 'gospel', 'slow jam'],
    minor: false, defaultKey: 'C', bpmRange: [88, 114], defaultBpm: 100, swing: 0.12,
    kit: 'vintage', groove: 'motown', strumStyle: 'organ',
    bassInst: 'bass', keysInst: 'epiano', guitarInst: 'clean',
    chordPattern: 'pulse', bassRhythm: [0, 4, 6, 8, 12, 14],
    verseProgs: P.popMaj, chorusProgs: P.popChorus, soloProgs: P.soulNeo,
  },

  // ── 2. Rock & Alternative (9)
  {
    id: 'classic-rock', label: 'Classic Rock Anthem', group: 'Rock & Alternative',
    hint: 'Big 26" rock drums, driving bass & punchy chords for pentatonic leads',
    keywords: ['classic rock', 'rock', 'zeppelin', 'acdc', 'anthem', 'arena'],
    minor: false, defaultKey: 'A', bpmRange: [104, 128], defaultBpm: 116, swing: 0.04,
    kit: 'rock', groove: 'rock', strumStyle: 'rock',
    bassInst: 'bass', keysInst: 'organ', guitarInst: 'crunch',
    chordPattern: 'stabs', bassRhythm: [0, 2, 4, 6, 8, 10, 12, 14],
    verseProgs: P.rockMaj, chorusProgs: P.popChorus, soloProgs: P.rockMaj,
  },
  {
    id: 'southern-rock', label: 'Southern Blues-Rock', group: 'Rock & Alternative',
    hint: 'Warm swampy rock groove with organ & major-pentatonic swagger',
    keywords: ['southern', 'lynyrd', 'allman', 'blues rock', 'swamp'],
    minor: false, defaultKey: 'G', bpmRange: [96, 118], defaultBpm: 106, swing: 0.12,
    kit: 'rock', groove: 'rock', strumStyle: 'rock',
    bassInst: 'bass', keysInst: 'organ', guitarInst: 'crunch',
    chordPattern: 'pulse', bassRhythm: [0, 4, 6, 8, 12],
    verseProgs: P.rockMaj, chorusProgs: P.folkChorus, soloProgs: P.rockMaj,
  },
  {
    id: 'grunge-alt', label: '90s Grunge / Alternative', group: 'Rock & Alternative',
    hint: 'Quiet atmospheric verse exploding into a loud crashing rock chorus',
    keywords: ['grunge', '90s', 'nirvana', 'pearl jam', 'alternative', 'alt rock', 'smashing'],
    minor: true, defaultKey: 'D', bpmRange: [92, 122], defaultBpm: 108, swing: 0,
    kit: 'rock', groove: 'rock', strumStyle: 'rock',
    bassInst: 'bass', keysInst: 'moogpoly', guitarInst: 'crunch',
    chordPattern: 'stabs', bassRhythm: [0, 2, 4, 8, 10, 12, 14],
    verseProgs: P.rockMin, chorusProgs: P.rockChorus, soloProgs: P.rockMin,
  },
  {
    id: 'indie-rock', label: 'Indie / Jangle Rock', group: 'Rock & Alternative',
    hint: 'Driving motorik indie drums, melodic bass & shimmering chords',
    keywords: ['indie', 'jangle', 'strokes', 'arctic', 'motorik', 'britpop'],
    minor: false, defaultKey: 'A', bpmRange: [114, 138], defaultBpm: 124, swing: 0,
    kit: 'vintage', groove: 'motorik', strumStyle: 'twelve',
    bassInst: 'bass', keysInst: 'juno', guitarInst: 'clean',
    chordPattern: 'arp', bassRhythm: [0, 2, 4, 6, 8, 10, 12, 14],
    verseProgs: P.popMaj, chorusProgs: P.popChorus, soloProgs: P.popMaj,
  },
  {
    id: 'surf-rock', label: 'Surf / Garage Rock', group: 'Rock & Alternative',
    hint: 'Upbeat reverb-soaked surf drums and twangy driving progressions',
    keywords: ['surf', 'garage', 'twang', 'ventures', 'pulp'],
    minor: true, defaultKey: 'E', bpmRange: [130, 158], defaultBpm: 142, swing: 0,
    kit: 'vintage', groove: 'punk', strumStyle: 'rock',
    bassInst: 'bass', keysInst: 'organ', guitarInst: 'clean',
    chordPattern: 'stabs', bassRhythm: [0, 4, 6, 8, 12, 14],
    verseProgs: P.rockMin, chorusProgs: P.rockChorus, soloProgs: P.rockMin,
  },
  {
    id: 'pop-punk', label: 'Pop-Punk / Skate Drive', group: 'Rock & Alternative',
    hint: 'High-energy fast rock beat for power chords and melodic riffs',
    keywords: ['punk', 'pop punk', 'pop-punk', 'blink', 'green day', 'fast rock'],
    minor: false, defaultKey: 'E', bpmRange: [148, 178], defaultBpm: 162, swing: 0,
    kit: 'rock', groove: 'punk', strumStyle: 'rock',
    bassInst: 'bass', keysInst: 'prophet', guitarInst: 'crunch',
    chordPattern: 'stabs', bassRhythm: [0, 2, 4, 6, 8, 10, 12, 14],
    verseProgs: P.popMaj, chorusProgs: P.popChorus, soloProgs: P.popMaj,
  },
  {
    id: 'hard-rock', label: 'Hard Rock / 80s Arena', group: 'Rock & Alternative',
    hint: 'Massive snare, Prophet synth pads & punchy hard-rock rhythm for shredding',
    keywords: ['hard rock', '80s rock', 'hair metal', 'van halen', 'shred', 'guns'],
    minor: true, defaultKey: 'E', bpmRange: [112, 138], defaultBpm: 124, swing: 0,
    kit: 'rock', groove: 'rock', strumStyle: 'rock',
    bassInst: 'bass', keysInst: 'prophet', guitarInst: 'crunch',
    chordPattern: 'stabs', bassRhythm: [0, 2, 4, 6, 8, 10, 12, 14],
    verseProgs: P.rockMin, chorusProgs: P.rockChorus, soloProgs: P.rockMin,
  },
  {
    id: 'post-rock', label: 'Ambient Post-Rock / Shoegaze', group: 'Rock & Alternative',
    hint: 'Lush shimmer synth pads, half-time swells & wide-open space for melodic leads',
    keywords: ['post rock', 'post-rock', 'shoegaze', 'ambient rock', 'pink floyd', 'floyd', 'worship', 'swell'],
    minor: true, defaultKey: 'D', bpmRange: [68, 92], defaultBpm: 78, swing: 0,
    kit: 'rock', groove: 'halftime', strumStyle: 'ambient',
    bassInst: 'bass', keysInst: 'shimmer', guitarInst: 'clean',
    chordPattern: 'hold', bassRhythm: [0, 8],
    verseProgs: P.cinematicMin, chorusProgs: P.rockChorus, soloProgs: P.cinematicMin,
  },
  {
    id: 'jam-band', label: 'Jam Band / Psych Groove', group: 'Rock & Alternative',
    hint: 'Open Mixolydian & Dorian pocket built for long improvised guitar jams',
    keywords: ['jam band', 'dead', 'grateful', 'phish', 'psych', 'psychedelic', 'dorian'],
    minor: false, defaultKey: 'G', bpmRange: [96, 120], defaultBpm: 108, swing: 0.14,
    kit: 'vintage', groove: 'funk', strumStyle: 'folk',
    bassInst: 'bass', keysInst: 'organ', guitarInst: 'clean',
    chordPattern: 'pulse', bassRhythm: [0, 3, 6, 8, 12, 14],
    verseProgs: P.rockMaj, chorusProgs: P.folkChorus, soloProgs: P.funkGroove,
  },

  // ── 3. Metal & Heavy (5)
  {
    id: 'heavy-metal', label: 'Classic Heavy Metal', group: 'Metal & Heavy',
    hint: 'Double-kick metal drums & tight low power-chord chugs',
    keywords: ['heavy metal', 'metal', 'iron maiden', 'sabbath', 'metallica'],
    minor: true, defaultKey: 'E', bpmRange: [122, 152], defaultBpm: 136, swing: 0,
    kit: 'metal', groove: 'metal', strumStyle: 'metal-chug',
    bassInst: 'bass', keysInst: 'moogpoly', guitarInst: 'metal',
    chordPattern: 'stabs', bassRhythm: [0, 2, 4, 6, 8, 10, 12, 14],
    verseProgs: P.metalRiff, chorusProgs: P.metalChorus, soloProgs: P.metalRiff,
  },
  {
    id: 'thrash-metal', label: 'Thrash Metal Gallop', group: 'Metal & Heavy',
    hint: 'Relentless fast gallop & skank beat for high-speed shred practice',
    keywords: ['thrash', 'gallop', 'megadeth', 'slayer', 'fast metal'],
    minor: true, defaultKey: 'E', bpmRange: [148, 184], defaultBpm: 164, swing: 0,
    kit: 'metal', groove: 'gallop', strumStyle: 'metal-gallop',
    bassInst: 'bass', keysInst: 'moogpoly', guitarInst: 'metal',
    chordPattern: 'stabs', bassRhythm: [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15],
    verseProgs: P.metalRiff, chorusProgs: P.metalChorus, soloProgs: P.metalRiff,
  },
  {
    id: 'metalcore', label: 'Modern Metalcore Breakdown', group: 'Metal & Heavy',
    hint: 'Half-time crushing snare, heavy breakdowns & soaring melodic chorus',
    keywords: ['metalcore', 'breakdown', 'drop d', 'drop c', 'modern metal', 'chug'],
    minor: true, defaultKey: 'D', bpmRange: [118, 146], defaultBpm: 132, swing: 0,
    kit: 'metal', groove: 'breakdown', strumStyle: 'metal-chug',
    bassInst: 'bass', keysInst: 'shimmer', guitarInst: 'metal',
    chordPattern: 'pulse', bassRhythm: [0, 2, 3, 6, 8, 11, 13, 14],
    verseProgs: P.metalRiff, chorusProgs: P.rockChorus, soloProgs: P.metalRiff,
  },
  {
    id: 'prog-djent', label: 'Prog Metal / Djent', group: 'Metal & Heavy',
    hint: 'Syncopated modern polyrhythmic grooves with ethereal ambient synth layers',
    keywords: ['djent', 'prog', 'progressive', 'periphery', 'polyphia', 'animals'],
    minor: true, defaultKey: 'D', bpmRange: [108, 136], defaultBpm: 122, swing: 0,
    kit: 'metal', groove: 'djent', strumStyle: 'djent',
    bassInst: 'bass', keysInst: 'ambient', guitarInst: 'metal',
    chordPattern: 'pulse', bassRhythm: [0, 3, 6, 8, 11, 14],
    verseProgs: P.metalRiff, chorusProgs: P.cinematicMin, soloProgs: P.metalRiff,
  },
  {
    id: 'stoner-doom', label: 'Stoner / Fuzz Rock Riff', group: 'Metal & Heavy',
    hint: 'Slow, heavy, hypnotic fuzzy pocket for big pentatonic & blues-scale riffs',
    keywords: ['stoner', 'doom', 'fuzz', 'queens', 'kyuss', 'heavy slow'],
    minor: true, defaultKey: 'D', bpmRange: [74, 96], defaultBpm: 84, swing: 0.14,
    kit: 'rock', groove: 'halftime', strumStyle: 'metal-chug',
    bassInst: 'moogbass', keysInst: 'organ', guitarInst: 'crunch',
    chordPattern: 'hold', bassRhythm: [0, 3, 6, 8, 12],
    verseProgs: P.metalRiff, chorusProgs: P.rockMin, soloProgs: P.metalRiff,
  },

  // ── 4. Acoustic, Folk & Country (7)
  {
    id: 'campfire-acoustic', label: 'Acoustic Campfire Strummer', group: 'Acoustic, Folk & Country',
    hint: 'Warm open-chord acoustic strumming with cajón & walking bass',
    keywords: ['campfire', 'acoustic', 'strummer', 'strum', 'unplugged'],
    minor: false, defaultKey: 'G', bpmRange: [88, 116], defaultBpm: 100, swing: 0.06,
    kit: 'studio', groove: 'cajon', strumStyle: 'folk',
    bassInst: 'upbass', keysInst: 'grand', guitarInst: 'acoustic',
    chordPattern: 'pulse', bassRhythm: [0, 6, 8, 12],
    verseProgs: P.folkCountry, chorusProgs: P.popChorus, soloProgs: P.popMaj,
  },
  {
    id: 'folk-fingerpick', label: 'Folk Fingerpick / Singer-Songwriter', group: 'Acoustic, Folk & Country',
    hint: 'Gentle brushes, shaker, upright bass & arpeggiated acoustic warmth',
    keywords: ['folk', 'fingerpick', 'singer', 'songwriter', 'acoustic ballad', 'gentle'],
    minor: false, defaultKey: 'C', bpmRange: [74, 96], defaultBpm: 84, swing: 0.08,
    kit: 'jazz', groove: 'brushfolk', strumStyle: 'folk',
    bassInst: 'upbass', keysInst: 'upright', guitarInst: 'acoustic',
    chordPattern: 'arp', bassRhythm: [0, 8],
    verseProgs: P.popMaj, chorusProgs: P.folkChorus, soloProgs: P.popMaj,
  },
  {
    id: 'country-train', label: 'Country Train Beat', group: 'Acoustic, Folk & Country',
    hint: 'Johnny Cash / Bakersfield train snare & alternating root-5th bass',
    keywords: ['country', 'train', 'cash', 'telecaster', 'chicken pick', 'honky'],
    minor: false, defaultKey: 'G', bpmRange: [104, 134], defaultBpm: 118, swing: 0.05,
    kit: 'vintage', groove: 'train', strumStyle: 'bluegrass',
    bassInst: 'upbass', keysInst: 'honky', guitarInst: 'acoustic',
    chordPattern: 'offbeat', bassRhythm: [0, 4, 8, 12],
    verseProgs: P.folkCountry, chorusProgs: P.folkChorus, soloProgs: P.folkCountry,
  },
  {
    id: 'nashville-ballad', label: 'Nashville Country Ballad', group: 'Acoustic, Folk & Country',
    hint: 'Warm 6/8 or slow-4 storytelling groove with piano, bass & gentle drums',
    keywords: ['nashville', 'country ballad', 'ballad', 'slow country', 'steel'],
    minor: false, defaultKey: 'D', bpmRange: [66, 84], defaultBpm: 74, swing: 0.08,
    kit: 'studio', groove: 'sixeight', strumStyle: 'twelve',
    bassInst: 'bass', keysInst: 'grand', guitarInst: 'acoustic',
    chordPattern: 'arp', bassRhythm: [0, 8, 12],
    verseProgs: P.popMaj, chorusProgs: P.popChorus, soloProgs: P.folkCountry,
  },
  {
    id: 'bluegrass', label: 'Bluegrass Boom-Chick', group: 'Acoustic, Folk & Country',
    hint: 'Crisp acoustic chop, upright bass & banjo bounce for flatpicking',
    keywords: ['bluegrass', 'flatpick', 'banjo', 'boom chick', 'doc watson'],
    minor: false, defaultKey: 'G', bpmRange: [112, 146], defaultBpm: 126, swing: 0.06,
    kit: 'studio', groove: 'cajon', strumStyle: 'bluegrass',
    bassInst: 'upbass', keysInst: 'banjo', guitarInst: 'acoustic',
    chordPattern: 'offbeat', bassRhythm: [0, 4, 8, 12],
    verseProgs: P.folkCountry, chorusProgs: P.folkChorus, soloProgs: P.folkCountry,
  },
  {
    id: 'americana', label: 'Americana / Roots Rock', group: 'Acoustic, Folk & Country',
    hint: '12-string shimmer, organ pad & steady road-trip rhythm section',
    keywords: ['americana', 'roots', 'tom petty', 'heartland', '12 string'],
    minor: false, defaultKey: 'D', bpmRange: [94, 118], defaultBpm: 106, swing: 0.05,
    kit: 'vintage', groove: 'pop', strumStyle: 'twelve',
    bassInst: 'bass', keysInst: 'organ', guitarInst: 'acoustic',
    chordPattern: 'pulse', bassRhythm: [0, 6, 8, 14],
    verseProgs: P.rockMaj, chorusProgs: P.popChorus, soloProgs: P.folkCountry,
  },
  {
    id: 'acoustic-waltz', label: '3/4 Acoustic Waltz', group: 'Acoustic, Folk & Country',
    hint: 'Flowing 3/4 folk & country waltz for fingerstyle or melodic soloing',
    keywords: ['waltz', '3/4', 'three four'],
    minor: false, defaultKey: 'G', bpmRange: [88, 118], defaultBpm: 102, swing: 0.08,
    kit: 'jazz', groove: 'brushes', strumStyle: 'waltz',
    bassInst: 'upbass', keysInst: 'grand', guitarInst: 'acoustic',
    chordPattern: 'arp', bassRhythm: [0, 8],
    verseProgs: P.folkCountry, chorusProgs: P.folkChorus, soloProgs: P.folkCountry,
  },

  // ── 5. Funk, Groove & Reggae (6)
  {
    id: 'tight-funk', label: '70s Tight Funk Pocket', group: 'Funk, Groove & Reggae',
    hint: 'Crisp ghost-note snare, Moog/slap bass & clavinet comping',
    keywords: ['funk', '70s funk', 'james brown', 'nile', 'clavinet', 'pocket'],
    minor: true, defaultKey: 'E', bpmRange: [98, 118], defaultBpm: 108, swing: 0.12,
    kit: 'studio', groove: 'funk', strumStyle: 'funk',
    bassInst: 'moogbass', keysInst: 'clavinet', guitarInst: 'clean',
    chordPattern: 'pulse', bassRhythm: [0, 3, 6, 10, 14],
    verseProgs: P.funkGroove, chorusProgs: P.soulNeo, soloProgs: P.funkGroove,
  },
  {
    id: 'disco-funkpop', label: 'Disco / Funk-Pop', group: 'Funk, Groove & Reggae',
    hint: 'Four-on-the-floor groove, octave bass & bright Juno/horns stabs',
    keywords: ['disco', 'funk pop', 'funk-pop', 'daft', 'dance guitar', 'nu disco'],
    minor: true, defaultKey: 'A', bpmRange: [110, 126], defaultBpm: 118, swing: 0.05,
    kit: 'studio', groove: 'disco', strumStyle: 'funk',
    bassInst: 'synthbass', keysInst: 'juno', guitarInst: 'clean',
    chordPattern: 'offbeat', bassRhythm: [0, 2, 4, 6, 8, 10, 12, 14],
    verseProgs: P.funkGroove, chorusProgs: P.rockChorus, soloProgs: P.funkGroove,
  },
  {
    id: 'reggae-onedrop', label: 'Reggae One-Drop', group: 'Funk, Groove & Reggae',
    hint: 'Beat-3 kick & rimshot drop, off-beat organ skank & deep dub bass',
    keywords: ['reggae', 'one drop', 'one-drop', 'bob marley', 'roots reggae'],
    minor: true, defaultKey: 'A', bpmRange: [72, 88], defaultBpm: 80, swing: 0.16,
    kit: 'vintage', groove: 'reggae', strumStyle: 'reggae',
    bassInst: 'bass', keysInst: 'organ', guitarInst: 'clean',
    chordPattern: 'offbeat', bassRhythm: [0, 6, 8, 12],
    verseProgs: P.reggaeMin, chorusProgs: P.reggaeMin, soloProgs: P.reggaeMin,
  },
  {
    id: 'reggae-rock', label: 'Reggae Rock / Dub Rockers', group: 'Funk, Groove & Reggae',
    hint: 'Sublime / Cali reggae-rock groove with punchy bass & skank chords',
    keywords: ['reggae rock', 'dub', 'sublime', 'cali', 'rockers', 'slightly'],
    minor: false, defaultKey: 'G', bpmRange: [82, 102], defaultBpm: 92, swing: 0.12,
    kit: 'vintage', groove: 'rockers', strumStyle: 'reggae',
    bassInst: 'bass', keysInst: 'organ', guitarInst: 'clean',
    chordPattern: 'offbeat', bassRhythm: [0, 3, 6, 10, 12],
    verseProgs: P.reggaeMaj, chorusProgs: P.popChorus, soloProgs: P.reggaeMaj,
  },
  {
    id: 'ska-upbeat', label: 'Upbeat Ska Skank', group: 'Funk, Groove & Reggae',
    hint: 'Fast bouncy off-beat skank with brass horns & walking bass',
    keywords: ['ska', 'skank', 'two tone', 'upbeat reggae'],
    minor: false, defaultKey: 'C', bpmRange: [132, 164], defaultBpm: 146, swing: 0.04,
    kit: 'vintage', groove: 'steppers', strumStyle: 'reggae',
    bassInst: 'bass', keysInst: 'horns', guitarInst: 'clean',
    chordPattern: 'offbeat', bassRhythm: [0, 4, 8, 12],
    verseProgs: P.reggaeMaj, chorusProgs: P.popChorus, soloProgs: P.reggaeMaj,
  },
  {
    id: 'hawaiian-island', label: 'Hawaiian / Island Acoustic', group: 'Funk, Groove & Reggae',
    hint: 'Breezy slack-key & island shaker groove with warm nylon chords',
    keywords: ['hawaiian', 'island', 'jawaiian', 'ukulele', 'slack key', 'beach', 'tropical'],
    minor: false, defaultKey: 'G', bpmRange: [80, 98], defaultBpm: 88, swing: 0.12,
    kit: 'studio', groove: 'island', strumStyle: 'island',
    bassInst: 'bass', keysInst: 'marimba', guitarInst: 'nylon',
    chordPattern: 'offbeat', bassRhythm: [0, 6, 8, 12],
    verseProgs: P.reggaeMaj, chorusProgs: P.folkChorus, soloProgs: P.reggaeMaj,
  },

  // ── 6. Jazz, Latin & World (7)
  {
    id: 'jazz-swing', label: 'Jazz II–V–I Swing', group: 'Jazz, Latin & World',
    hint: 'Ride cymbal swing, walking upright bass & lush maj7/m7 piano voicings',
    keywords: ['jazz', 'swing', 'ii-v-i', '2-5-1', 'bebop', 'standards'],
    minor: false, defaultKey: 'C', bpmRange: [108, 148], defaultBpm: 124, swing: 0.3,
    kit: 'jazz', groove: 'swing', strumStyle: 'rhodes',
    bassInst: 'upbass', keysInst: 'grand', guitarInst: 'clean',
    chordPattern: 'stabs', bassRhythm: [0, 4, 8, 12],
    verseProgs: P.jazzIIV, chorusProgs: P.jazzChorus, soloProgs: P.jazzIIV,
  },
  {
    id: 'smooth-fusion', label: 'Smooth Jazz / Fusion', group: 'Jazz, Latin & World',
    hint: 'Silky FM/Rhodes chords, melodic groove bass & crisp modern pocket',
    keywords: ['fusion', 'smooth jazz', 'steely dan', 'larry carlton', 'jazzy'],
    minor: true, defaultKey: 'D', bpmRange: [92, 114], defaultBpm: 102, swing: 0.14,
    kit: 'studio', groove: 'purdie', strumStyle: 'rhodes',
    bassInst: 'bass', keysInst: 'fmglass', guitarInst: 'clean',
    chordPattern: 'hold', bassRhythm: [0, 3, 6, 10, 14],
    verseProgs: P.soulNeo, chorusProgs: P.jazzChorus, soloProgs: P.soulNeo,
  },
  {
    id: 'gypsy-jazz', label: 'Gypsy Jazz Pump', group: 'Jazz, Latin & World',
    hint: 'Acoustic Django-style la pompe rhythm with walking upright bass',
    keywords: ['gypsy', 'django', 'manouche', 'paris'],
    minor: true, defaultKey: 'D', bpmRange: [138, 176], defaultBpm: 156, swing: 0.24,
    kit: 'jazz', groove: 'brushes', strumStyle: 'folk',
    bassInst: 'upbass', keysInst: 'upright', guitarInst: 'nylon',
    chordPattern: 'stabs', bassRhythm: [0, 4, 8, 12],
    verseProgs: P.blues12Min, chorusProgs: P.jazzChorus, soloProgs: P.blues12Min,
  },
  {
    id: 'bossa-nova', label: 'Bossa Nova Nylon', group: 'Jazz, Latin & World',
    hint: 'Rimshot clave, gentle shaker & warm jazz-7th bossa chords',
    keywords: ['bossa', 'bossa nova', 'brazil', 'jobim', 'samba chill'],
    minor: false, defaultKey: 'C', bpmRange: [104, 130], defaultBpm: 116, swing: 0.04,
    kit: 'jazz', groove: 'bossa', strumStyle: 'bossa',
    bassInst: 'upbass', keysInst: 'epiano', guitarInst: 'nylon',
    chordPattern: 'pulse', bassRhythm: [0, 6, 8, 14],
    verseProgs: P.jazzIIV, chorusProgs: P.jazzChorus, soloProgs: P.jazzIIV,
  },
  {
    id: 'latin-rock', label: 'Latin Rock / Santana Groove', group: 'Jazz, Latin & World',
    hint: 'Congas, clave, organ & hypnotic Dorian minor groove for soaring leads',
    keywords: ['santana', 'latin rock', 'latin', 'conga', 'salsa', 'oye'],
    minor: true, defaultKey: 'A', bpmRange: [104, 126], defaultBpm: 116, swing: 0.04,
    kit: 'studio', groove: 'clave', strumStyle: 'organ',
    bassInst: 'bass', keysInst: 'organ', guitarInst: 'clean',
    chordPattern: 'pulse', bassRhythm: [0, 6, 8, 14],
    verseProgs: P.latinMin, chorusProgs: P.rockMin, soloProgs: P.latinMin,
  },
  {
    id: 'flamenco-rumba', label: 'Spanish / Flamenco Rumba', group: 'Jazz, Latin & World',
    hint: 'Cajón, handclaps & Andalusian minor progressions for Phrygian/Spanish runs',
    keywords: ['flamenco', 'spanish', 'rumba', 'andalusian', 'gypsy kings', 'phrygian'],
    minor: true, defaultKey: 'E', bpmRange: [98, 124], defaultBpm: 110, swing: 0.05,
    kit: 'studio', groove: 'rumba', strumStyle: 'bossa',
    bassInst: 'upbass', keysInst: 'nylon', guitarInst: 'nylon',
    chordPattern: 'pulse', bassRhythm: [0, 6, 8, 12],
    verseProgs: P.rockMin, chorusProgs: P.latinMin, soloProgs: P.rockMin,
  },
  {
    id: 'afrobeat', label: 'Afrobeat / Highlife Groove', group: 'Jazz, Latin & World',
    hint: 'Polyrhythmic cowbell & shaker pocket with funky bass & horns',
    keywords: ['afrobeat', 'afro', 'fela', 'highlife', 'world'],
    minor: true, defaultKey: 'G', bpmRange: [106, 124], defaultBpm: 114, swing: 0.08,
    kit: 'vintage', groove: 'afrobeat', strumStyle: 'funk',
    bassInst: 'bass', keysInst: 'horns', guitarInst: 'clean',
    chordPattern: 'pulse', bassRhythm: [0, 3, 6, 10, 12, 14],
    verseProgs: P.funkGroove, chorusProgs: P.latinMin, soloProgs: P.funkGroove,
  },

  // ── 7. Modern, Chill & Cinematic (6)
  {
    id: 'lofi-chill', label: 'Lo-Fi Guitar Chillhop', group: 'Modern, Chill & Cinematic',
    hint: 'Dusty swung drums, warm tape keys & dreamy maj7/m9 chords for mellow soloing',
    keywords: ['lofi', 'lo-fi', 'chill', 'chillhop', 'study', 'tape', 'mellow'],
    minor: false, defaultKey: 'C', bpmRange: [70, 88], defaultBpm: 78, swing: 0.2,
    kit: 'lofi', groove: 'hiphop', strumStyle: 'rhodes',
    bassInst: 'reesebass', keysInst: 'lofikeys', guitarInst: 'clean',
    chordPattern: 'hold', bassRhythm: [0, 6, 10],
    verseProgs: P.lofiChill, chorusProgs: P.soulNeo, soloProgs: P.lofiChill,
  },
  {
    id: 'boombap-guitar', label: '90s Boom Bap Guitar Loop', group: 'Modern, Chill & Cinematic',
    hint: 'Head-nodding dusty 90s hip-hop drums, upright bass & soulful jazz chords',
    keywords: ['boom bap', 'boombap', 'hip hop', 'hip-hop', 'rap', '90s hip'],
    minor: true, defaultKey: 'D', bpmRange: [82, 98], defaultBpm: 90, swing: 0.2,
    kit: 'lofi', groove: 'boombap', strumStyle: 'rhodes',
    bassInst: 'upbass', keysInst: 'lofikeys', guitarInst: 'clean',
    chordPattern: 'hold', bassRhythm: [0, 7, 10],
    verseProgs: P.soulNeo, chorusProgs: P.lofiChill, soloProgs: P.soulNeo,
  },
  {
    id: 'trap-guitar', label: 'Trap-Guitar / Emo 808s', group: 'Modern, Chill & Cinematic',
    hint: 'Crisp 808 sub slides, rolling trap hats & atmospheric minor chords',
    keywords: ['trap', '808', 'emo rap', 'post malone', 'juice', 'modern hip'],
    minor: true, defaultKey: 'F', bpmRange: [128, 152], defaultBpm: 140, swing: 0,
    kit: '808', groove: 'trap', strumStyle: 'ambient',
    bassInst: 'sub808', keysInst: 'juno', guitarInst: 'clean',
    chordPattern: 'arp', bassRhythm: [0, 6, 10],
    verseProgs: P.cinematicMin, chorusProgs: P.rockChorus, soloProgs: P.cinematicMin,
  },
  {
    id: 'modern-pop', label: 'Modern Pop / Synth-Pop', group: 'Modern, Chill & Cinematic',
    hint: 'Crisp modern drum pocket, punchy synth bass & glittering DX7/Juno chords',
    keywords: ['pop', 'modern pop', 'synth pop', 'synth-pop', 'top 40', 'upbeat'],
    minor: false, defaultKey: 'C', bpmRange: [98, 124], defaultBpm: 112, swing: 0,
    kit: 'studio', groove: 'pop', strumStyle: 'rhodes',
    bassInst: 'synthbass', keysInst: 'fmglass', guitarInst: 'clean',
    chordPattern: 'pulse', bassRhythm: [0, 3, 6, 8, 11, 14],
    verseProgs: P.popMaj, chorusProgs: P.popChorus, soloProgs: P.popMaj,
  },
  {
    id: 'synthwave', label: '80s Synthwave / Retrowave', group: 'Modern, Chill & Cinematic',
    hint: 'Driving 80s 808/tom drums, pulsing Moog bass & lush Juno/Prophet neon chords',
    keywords: ['synthwave', 'retrowave', '80s', 'neon', 'outrun', 'cyber', 'synth'],
    minor: true, defaultKey: 'A', bpmRange: [104, 128], defaultBpm: 116, swing: 0,
    kit: '808', groove: 'synthpop', strumStyle: 'ambient',
    bassInst: 'moogbass', keysInst: 'juno', guitarInst: 'clean',
    chordPattern: 'hold', bassRhythm: [0, 2, 4, 6, 8, 10, 12, 14],
    verseProgs: P.cinematicMin, chorusProgs: P.rockChorus, soloProgs: P.cinematicMin,
  },
  {
    id: 'cinematic-orch', label: 'Cinematic Orchestral Backing', group: 'Modern, Chill & Cinematic',
    hint: 'Epic VSCO 2 strings, horns, Reese sub & slow dramatic percussion',
    keywords: ['cinematic', 'orchestra', 'orchestral', 'epic', 'film', 'strings', 'movie'],
    minor: true, defaultKey: 'D', bpmRange: [68, 92], defaultBpm: 78, swing: 0,
    kit: 'rock', groove: 'halftime', strumStyle: 'cinematic',
    bassInst: 'reesebass', keysInst: 'strings', guitarInst: 'clean',
    chordPattern: 'hold', bassRhythm: [0, 8],
    verseProgs: P.cinematicMin, chorusProgs: P.rockChorus, soloProgs: P.cinematicMin,
  },
  {
    id: 'melodic-rock-ballad', label: 'Melodic Rock Ballad (Hexatonic)', group: 'Rock & Alternative',
    hint: 'Soaring emotional minor rock ballad with spacious drums, warm Juno pads & wide solo room',
    keywords: ['melodic', 'ballad', 'hexatonic', 'roy', 'emotional', 'soaring', 'lead'],
    minor: true, defaultKey: 'E', bpmRange: [66, 86], defaultBpm: 74, swing: 0,
    kit: 'rock', groove: 'halftime', strumStyle: 'ambient',
    bassInst: 'bass', keysInst: 'juno', guitarInst: 'clean',
    chordPattern: 'hold', bassRhythm: [0, 8, 12],
    verseProgs: [
      [[0, 'm7', 'm'], [8, 'maj7', ''], [3, 'maj7', ''], [10, 'maj', '']],
      [[0, 'm7', 'm'], [5, 'm7', 'm'], [8, 'maj7', ''], [7, 'sus4', '']],
    ],
    chorusProgs: [
      [[8, 'maj7', ''], [10, 'maj', ''], [0, 'm7', 'm'], [3, 'maj7', '']],
      [[3, 'maj7', ''], [10, 'maj', ''], [0, 'm7', 'm'], [8, 'maj7', '']],
    ],
    soloProgs: [
      [[0, 'm7', 'm'], [8, 'maj7', ''], [3, 'maj7', ''], [10, 'maj', '']],
    ],
  },
  {
    id: 'cinematic-minor-ballad', label: 'Cinematic Minor Pop Ballad', group: 'Modern, Chill & Cinematic',
    hint: 'Lush grand piano + shimmer pad minor ballad built for singing bends & vocal phrasing',
    keywords: ['pop ballad', 'minor ballad', 'vocal', 'cinematic ballad', 'piano ballad'],
    minor: true, defaultKey: 'A', bpmRange: [68, 88], defaultBpm: 76, swing: 0,
    kit: 'rock', groove: 'halftime', strumStyle: 'orchestra',
    bassInst: 'bass', keysInst: 'shimmer', guitarInst: 'clean',
    chordPattern: 'arp', bassRhythm: [0, 6, 8, 14],
    verseProgs: [
      [[0, 'm', 'm'], [8, 'maj7', ''], [3, 'maj', ''], [10, 'maj', '']],
      [[0, 'm', 'm'], [5, 'm', 'm'], [10, 'maj', ''], [3, 'maj', '']],
    ],
    chorusProgs: [
      [[8, 'maj7', ''], [3, 'maj', ''], [10, 'maj', ''], [0, 'm', 'm']],
    ],
    soloProgs: [
      [[0, 'm', 'm'], [8, 'maj7', ''], [3, 'maj', ''], [10, 'maj', '']],
    ],
  },
  {
    id: 'modern-fusion-lead', label: 'Modern Fusion / Neo-Soul Lead', group: 'Jazz, Latin & World',
    hint: 'Silky Wurlitzer/Rhodes, tight pocket bass & modern fusion changes for hexatonic & chord-tone soloing',
    keywords: ['fusion', 'modern fusion', 'neo soul', 'pocket', 'rhodes', 'melodic fusion'],
    minor: true, defaultKey: 'A', bpmRange: [84, 108], defaultBpm: 94, swing: 0.14,
    kit: 'rock', groove: 'funk', strumStyle: 'rhodes',
    bassInst: 'moogbass', keysInst: 'wurli', guitarInst: 'clean',
    chordPattern: 'stabs', bassRhythm: [0, 3, 6, 10, 14],
    verseProgs: P.soulNeo,
    chorusProgs: [
      [[5, 'm7', 'm7'], [10, '7', '7'], [3, 'maj7', 'maj7'], [8, 'maj7', 'maj7']],
    ],
    soloProgs: P.soulNeo,
  },
  {
    id: 'dorian-modal-vamp', label: 'Dorian Modal Groove (i → IV)', group: 'Funk, Groove & Reggae',
    hint: 'Classic minor-to-major-IV Dorian vamp (e.g. Am7 → D9) — highlight the bright natural 6th!',
    keywords: ['dorian', 'modal', 'vamp', 'santana', 'smooth', 'natural 6'],
    minor: true, defaultKey: 'A', bpmRange: [88, 114], defaultBpm: 98, swing: 0.12,
    kit: 'rock', groove: 'funk', strumStyle: 'rhodes',
    bassInst: 'bass', keysInst: 'wurli', guitarInst: 'clean',
    chordPattern: 'stabs', bassRhythm: [0, 6, 8, 10, 14],
    verseProgs: [
      [[0, 'm7', 'm7'], [5, '7', '7'], [0, 'm7', 'm7'], [5, '7', '7']],
      [[0, 'm7', 'm7'], [2, 'm7', 'm7'], [5, '7', '7'], [0, 'm7', 'm7']],
    ],
    chorusProgs: [
      [[5, '7', '7'], [0, 'm7', 'm7'], [10, 'maj7', ''], [5, '7', '7']],
    ],
    soloProgs: [
      [[0, 'm7', 'm7'], [5, '7', '7'], [0, 'm7', 'm7'], [5, '7', '7']],
    ],
  },
  {
    id: 'lydian-dream-vamp', label: 'Lydian Dream Pad (I → II)', group: 'Modern, Chill & Cinematic',
    hint: 'Floating film-score Lydian vamp (I → II) built to make the dreamy #4 sparkle!',
    keywords: ['lydian', 'dreamy', 'floating', 'sharp 4', 'satch', 'vai', 'modal'],
    minor: false, defaultKey: 'C', bpmRange: [74, 98], defaultBpm: 86, swing: 0,
    kit: 'rock', groove: 'pop', strumStyle: 'ambient',
    bassInst: 'bass', keysInst: 'shimmer', guitarInst: 'clean',
    chordPattern: 'hold', bassRhythm: [0, 8, 12],
    verseProgs: [
      [[0, 'maj7', 'maj7'], [2, 'maj', ''], [0, 'maj7', 'maj7'], [2, 'maj', '']],
      [[0, 'maj7', 'maj7'], [2, 'maj', ''], [4, 'm7', 'm7'], [2, 'maj', '']],
    ],
    chorusProgs: [
      [[2, 'maj', ''], [4, 'm7', 'm7'], [0, 'maj7', 'maj7'], [2, 'maj', '']],
    ],
    soloProgs: [
      [[0, 'maj7', 'maj7'], [2, 'maj', ''], [0, 'maj7', 'maj7'], [2, 'maj', '']],
    ],
  },
  {
    id: 'mixolydian-jam-vamp', label: 'Mixolydian Jam Groove (I → bVII → IV)', group: 'Rock & Alternative',
    hint: 'Upbeat Mixolydian rock groove (I → bVII → IV) — highlight the bluesy b7 over major chords!',
    keywords: ['mixolydian', 'jam', 'classic', 'b7', 'dominant', 'modal'],
    minor: false, defaultKey: 'G', bpmRange: [96, 124], defaultBpm: 108, swing: 0.06,
    kit: 'rock', groove: 'rock', strumStyle: 'rock',
    bassInst: 'bass', keysInst: 'organ', guitarInst: 'clean',
    chordPattern: 'stabs', bassRhythm: [0, 4, 8, 12, 14],
    verseProgs: [
      [[0, '7', ''], [10, 'maj', ''], [5, 'maj', ''], [0, '7', '']],
      [[0, '7', ''], [10, 'maj', ''], [0, '7', ''], [5, 'maj', '']],
    ],
    chorusProgs: [
      [[5, 'maj', ''], [10, 'maj', ''], [0, '7', ''], [0, '7', '']],
    ],
    soloProgs: [
      [[0, '7', ''], [10, 'maj', ''], [5, 'maj', ''], [0, '7', '']],
    ],
  },
]

export function aiStyleById(id: string): AIStyle {
  return AI_STYLES.find(s => s.id === id) ?? AI_STYLES[0]
}

// ── Favorites & Recent Style Storage ──
const FAV_KEY = 'kg:aiStyleFavs'
const REC_KEY = 'kg:aiStyleRecent'

export function favoriteStyleIds(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch { return [] }
}
export function toggleFavoriteStyle(id: string): string[] {
  const cur = favoriteStyleIds()
  const next = cur.includes(id) ? cur.filter(x => x !== id) : [id, ...cur].slice(0, 16)
  try { localStorage.setItem(FAV_KEY, JSON.stringify(next)) } catch { /* private */ }
  return next
}
export function recentStyleIds(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(REC_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch { return [] }
}
export function recordRecentStyle(id: string): string[] {
  const next = [id, ...recentStyleIds().filter(x => x !== id)].slice(0, 6)
  try { localStorage.setItem(REC_KEY, JSON.stringify(next)) } catch { /* private */ }
  return next
}
export function randomAIStyle(excludeId?: string): AIStyle {
  const pool = excludeId ? AI_STYLES.filter(s => s.id !== excludeId) : AI_STYLES
  return pool[Math.floor(Math.random() * pool.length)] ?? AI_STYLES[0]
}

// ── Composition Request & Helpers ──
export interface ComposeRequest {
  styleId: string
  key?: string
  minor?: boolean
  bpm?: number
  songShape?: SongShape
  role?: JamRole
  energy?: JamEnergy
  keysInst?: string
  bassInst?: string
  seed?: number
}

export interface ComposedSectionInfo {
  part: PartId
  label: string
  chords: string[]
}

export interface ComposedBeatResult {
  beat: Beat
  style: AIStyle
  sections: ComposedSectionInfo[]
  chords: string[]
  soloScale: { root: string; scaleId: string; label: string }
  summary: string
}

export interface ComposedStrumResult {
  chart: StrumChart
  style: AIStyle
  keysInst: string
  bassInst: string
  soloScale: { root: string; scaleId: string; label: string }
  summary: string
}

/** Simple deterministic-friendly picker so seed produces repeatable tests AND fresh remixes. */
function pick<T>(arr: T[], idx: number): T {
  return arr[((idx % arr.length) + arr.length) % arr.length]
}

function progToSymbols(prog: ProgSpec, tonic: string, minor: boolean): string[] {
  const tPc = pc(tonic)
  const flats = keyPrefersFlats(tonic, minor)
  return prog.map(([semi, , suf]) => `${pcName((tPc + semi) % 12, flats)}${suf}`)
}

function soloScaleFor(style: AIStyle, tonic: string, minor: boolean): { root: string; scaleId: string; label: string } {
  if (style.id === 'melodic-rock-ballad' || style.id === 'cinematic-minor-ballad' || style.id === 'modern-fusion-lead') {
    return { root: tonic, scaleId: 'minor hexatonic', label: `${tonic} Minor Hexatonic (1 2 b3 4 5 b7)` }
  }
  if (style.id === 'lydian-dream-vamp') return { root: tonic, scaleId: 'lydian', label: `${tonic} Lydian (highlight #4!)` }
  if (style.id === 'mixolydian-jam-vamp') return { root: tonic, scaleId: 'mixolydian', label: `${tonic} Mixolydian (highlight b7!)` }
  if (style.id === 'dorian-modal-vamp') return { root: tonic, scaleId: 'dorian', label: `${tonic} Dorian (highlight natural 6th!)` }
  if (style.id === 'flamenco-rumba') return { root: tonic, scaleId: 'phrygian', label: `${tonic} Phrygian / Minor Pentatonic` }
  if (style.id === 'latin-rock' || style.id === 'tight-funk' || style.id === 'funky-blues') {
    return { root: tonic, scaleId: 'dorian', label: `${tonic} Dorian / Minor Pentatonic` }
  }
  if (style.id === 'slow-blues' || style.id === 'texas-shuffle' || style.id === 'chicago-blues') {
    return { root: tonic, scaleId: 'blues', label: `${tonic} Blues (Mix Major + Minor Pent)` }
  }
  if (style.id === 'jam-band' || style.id === 'classic-rock' || style.id === 'southern-rock') {
    return { root: tonic, scaleId: minor ? 'pent_min' : 'mixolydian', label: `${tonic} ${minor ? 'Minor Pentatonic' : 'Mixolydian / Major Pent'}` }
  }
  if (minor) return { root: tonic, scaleId: 'pent_min', label: `${tonic} Minor Pentatonic / Natural Minor` }
  return { root: tonic, scaleId: 'pent_maj', label: `${tonic} Major Pentatonic / Major` }
}

function addFillToRows(rows: DrumRow[], totalSt: number, energy: JamEnergy, kit: KitId): DrumRow[] {
  const out = rows.map(r => ({ ...r, steps: [...r.steps] }))
  const ensure = (voice: Voice) => {
    let row = out.find(r => r.voice === voice)
    if (!row) { row = { voice, steps: Array(totalSt).fill(0) }; out.push(row) }
    return row
  }
  const lastBar = Math.max(0, totalSt - STEPS_PER_BAR)
  const fillVoices: [Voice, number, number][] = kit === '808' || kit === '909'
    ? [['snare', 12, 0.72], ['snare', 13, 0.8], ['snare', 14, 0.88], ['snare', 15, 0.96]]
    : energy === 'chill'
      ? [['snare', 14, 0.62], ['tom2', 15, 0.72]]
      : energy === 'drive'
        ? [['snare', 10, 0.82], ['tom1', 12, 0.86], ['tom2', 13, 0.88], ['tom2', 14, 0.9], ['tom3', 15, 0.98]]
        : [['tom1', 12, 0.8], ['tom2', 14, 0.86], ['tom3', 15, 0.94]]
  for (const [v, offset, vel] of fillVoices) {
    const idx = lastBar + offset
    if (idx < totalSt) ensure(v).steps[idx] = Math.max(ensure(v).steps[idx], vel)
  }
  return out
}

function shapeDrums(base: DrumRow[], section: 'intro' | 'verse' | 'chorus' | 'solo', energy: JamEnergy, kit: KitId): DrumRow[] {
  const totalSt = base[0]?.steps.length ?? 64
  let rows = base.map(r => ({ ...r, steps: [...r.steps] }))
  const ensure = (voice: Voice) => {
    let row = rows.find(r => r.voice === voice)
    if (!row) { row = { voice, steps: Array(totalSt).fill(0) }; rows.push(row) }
    return row
  }

  if (section === 'intro') {
    // Strip down to welcoming pulse: keep hat/shaker/rim + half-level kick
    rows = rows.map(r => {
      if (r.voice === 'snare' || r.voice === 'crash' || r.voice === 'ride') {
        return { ...r, steps: r.steps.map((v, i) => (i >= totalSt - 4 ? v * 0.65 : 0)) }
      }
      if (r.voice === 'kick') return { ...r, steps: r.steps.map((v, i) => (i % 16 === 0 ? v * 0.7 : 0)) }
      return { ...r, steps: r.steps.map(v => v * 0.75) }
    })
    return addFillToRows(rows, totalSt, 'chill', kit)
  }

  if (section === 'verse') {
    if (energy === 'chill') {
      rows = rows.map(r => r.voice === 'crash' ? { ...r, steps: r.steps.map(() => 0) } : { ...r, steps: r.steps.map(v => v * 0.86) })
    }
    return addFillToRows(rows, totalSt, energy === 'drive' ? 'groove' : 'chill', kit)
  }

  if (section === 'chorus') {
    // Lift energy: Beat 1 crash, ride/open-hat brightness, fuller snare/kick
    const crash = ensure('crash')
    crash.steps[0] = Math.max(crash.steps[0], energy === 'chill' ? 0.62 : 0.88)
    if (totalSt >= 64) crash.steps[32] = Math.max(crash.steps[32], 0.72)
    if (energy !== 'chill' && kit !== '808' && kit !== '909') {
      const ride = ensure('ride')
      for (let s = 0; s < totalSt; s += 4) ride.steps[s] = Math.max(ride.steps[s], 0.52)
    }
    return addFillToRows(rows, totalSt, energy === 'chill' ? 'groove' : 'drive', kit)
  }

  // Solo Break: steady driving open pocket + Beat 1 crash + clean turnaround fill
  const crash = ensure('crash')
  crash.steps[0] = Math.max(crash.steps[0], 0.78)
  const open = ensure('open')
  for (let b = 0; b < totalSt; b += 16) {
    if (b + 14 < totalSt) open.steps[b + 14] = Math.max(open.steps[b + 14], 0.5)
  }
  return addFillToRows(rows, totalSt, energy, kit)
}

function buildTracksForPart(
  prog: ProgSpec,
  key: string,
  style: AIStyle,
  section: 'intro' | 'verse' | 'chorus' | 'solo',
  role: JamRole,
  keysInst: string,
  bassInst: string,
): Track[] {
  const beatProg: [number, string][] = prog.map(([semi, type]) => [semi, type])
  const lowBass = style.id === 'trap-guitar' ? 29 : 33
  const bassRhythm = section === 'intro' ? [0, 8] : style.bassRhythm
  const bassNotes: PNote[] = bassNotesFor(beatProg, key, lowBass, bassRhythm, section === 'chorus' ? 3 : 2)
  const bassTrack: Track = {
    id: newId(),
    inst: bassInst,
    notes: bassNotes,
    vol: section === 'intro' ? 0.62 : 0.84,
    space: instr(bassInst).space,
  }

  const chordPat = section === 'intro' ? 'hold' : section === 'chorus' ? (style.chordPattern === 'hold' ? 'pulse' : style.chordPattern) : style.chordPattern
  const chordOct = keysInst === 'strings' || keysInst === 'shimmer' || keysInst === 'juno' ? 54 : 52
  const keysNotes = chordNotesFor(beatProg, key, chordOct, chordPat, section === 'chorus' ? 'open' : 'close')
  const keysTrack: Track = {
    id: newId(),
    inst: keysInst,
    notes: keysNotes,
    vol: role === 'drums' ? 0.65 : section === 'chorus' ? 0.72 : 0.6,
    mute: role === 'drums',
    space: instr(keysInst).space,
  }

  const tracks: Track[] = [bassTrack, keysTrack]
  // Optional companion guitar track (muted automatically in Rhythm & Drums-Only roles so YOU play the guitar!)
  if (style.guitarInst && style.guitarInst !== keysInst) {
    const gtrNotes = chordNotesFor(beatProg, key, 48, style.chordPattern === 'hold' ? 'pulse' : style.chordPattern, 'close')
    tracks.push({
      id: newId(),
      inst: style.guitarInst,
      notes: gtrNotes,
      vol: section === 'solo' ? 0.5 : 0.64,
      mute: role !== 'lead',
      space: instr(style.guitarInst).space,
    })
  }
  return tracks
}

/** Generate a complete Beat Maker beat (either Simple 4-bar Loop or Full 4-Part Song: Intro/Verse/Chorus/Solo!). */
export function composeAIBeat(req: ComposeRequest): ComposedBeatResult {
  const style = aiStyleById(req.styleId)
  const seed = req.seed ?? Math.floor(Math.random() * 10000)
  const key = req.key ?? style.defaultKey
  const minor = req.minor ?? style.minor
  const bpm = Math.max(45, Math.min(210, Math.round(req.bpm ?? style.defaultBpm)))
  const songShape: SongShape = req.songShape ?? 'song'
  const role: JamRole = req.role ?? 'lead'
  const energy: JamEnergy = req.energy ?? 'groove'
  const keysInst = req.keysInst ?? style.keysInst
  const bassInst = req.bassInst ?? style.bassInst

  recordRecentStyle(style.id)

  const verseProg = pick(style.verseProgs, seed)
  const chorusProg = pick(style.chorusProgs, seed + 1)
  const soloProg = pick(style.soloProgs, seed + 2)
  const introProg: ProgSpec = [verseProg[0], verseProg[0], verseProg[1] ?? verseProg[0], verseProg[3] ?? verseProg[0]]

  const baseRows = rowsFromGroove(style.groove, 4)

  const partA: PartContent = {
    rows: shapeDrums(baseRows, 'verse', energy, style.kit),
    tracks: buildTracksForPart(verseProg, key, style, 'verse', role, keysInst, bassInst),
  }

  const verseSyms = progToSymbols(verseProg, key, minor)
  const soloScale = soloScaleFor(style, key, minor)

  if (songShape === 'loop') {
    const beat: Beat = {
      name: `${style.label} Loop (${key}${minor ? 'm' : ''})`,
      bpm,
      bars: 4,
      swing: style.swing,
      kit: style.kit,
      rows: partA.rows,
      tracks: partA.tracks,
      key,
      minor,
      drumVol: 0.88,
      part: 'A',
      parts: { A: partA },
      chain: ['A'],
      chainOn: false,
    }
    return {
      beat,
      style,
      sections: [{ part: 'A', label: 'Loop', chords: verseSyms }],
      chords: verseSyms,
      soloScale,
      summary: `${style.label} 4-bar loop in ${key}${minor ? 'm' : ''} (${bpm} BPM) — ${verseSyms.join(' · ')}`,
    }
  }

  const partB: PartContent = {
    rows: shapeDrums(baseRows, 'chorus', energy, style.kit),
    tracks: buildTracksForPart(chorusProg, key, style, 'chorus', role, keysInst, bassInst),
  }
  const partC: PartContent = {
    rows: shapeDrums(baseRows, 'solo', energy, style.kit),
    tracks: buildTracksForPart(soloProg, key, style, 'solo', role, keysInst, bassInst),
  }
  const partD: PartContent = {
    rows: shapeDrums(baseRows, 'intro', energy, style.kit),
    tracks: buildTracksForPart(introProg, key, style, 'intro', role, keysInst, bassInst),
  }

  const chorusSyms = progToSymbols(chorusProg, key, minor)
  const soloSyms = progToSymbols(soloProg, key, minor)
  const introSyms = progToSymbols(introProg, key, minor)

  const beat: Beat = {
    name: `${style.label} (${key}${minor ? 'm' : ''})`,
    bpm,
    bars: 4,
    swing: style.swing,
    kit: style.kit,
    rows: partA.rows,
    tracks: partA.tracks,
    key,
    minor,
    drumVol: 0.88,
    part: 'A',
    parts: { A: partA, B: partB, C: partC, D: partD },
    chain: ['D', 'A', 'A', 'B', 'A', 'B', 'C', 'B'],
    chainOn: true,
  }

  const sections: ComposedSectionInfo[] = [
    { part: 'D', label: 'Intro', chords: introSyms },
    { part: 'A', label: 'Verse', chords: verseSyms },
    { part: 'B', label: 'Chorus', chords: chorusSyms },
    { part: 'C', label: 'Solo', chords: soloSyms },
  ]

  return {
    beat,
    style,
    sections,
    chords: verseSyms,
    soloScale,
    summary: `Full ${style.label} song in ${key}${minor ? 'm' : ''} (${bpm} BPM): Intro → Verse → Chorus → Solo Break!`,
  }
}

/** Generate a Strum Machine chart (Simple 4/8-bar Loop OR Full Song: Intro -> Verse -> Chorus -> Solo -> Outro!). */
export function composeAIStrumChart(req: ComposeRequest): ComposedStrumResult {
  const style = aiStyleById(req.styleId)
  const seed = req.seed ?? Math.floor(Math.random() * 10000)
  const key = req.key ?? style.defaultKey
  const minor = req.minor ?? style.minor
  const bpm = Math.max(45, Math.min(210, Math.round(req.bpm ?? style.defaultBpm)))
  const songShape: SongShape = req.songShape ?? 'song'
  const keysInst = req.keysInst ?? style.keysInst
  const bassInst = req.bassInst ?? style.bassInst

  recordRecentStyle(style.id)

  const verseSyms = progToSymbols(pick(style.verseProgs, seed), key, minor)
  const chorusSyms = progToSymbols(pick(style.chorusProgs, seed + 1), key, minor)
  const soloSyms = progToSymbols(pick(style.soloProgs, seed + 2), key, minor)
  const soloScale = soloScaleFor(style, key, minor)

  const bars: StrumBar[] = []
  if (songShape === 'loop') {
    verseSyms.forEach((c, i) => bars.push({ chords: [c], ...(i === 0 ? { section: 'Loop' } : {}) }))
    // Repeat with subtle turnaround if 4 chords so it's a roomy 8-bar jam
    verseSyms.forEach(c => bars.push({ chords: [c] }))
  } else {
    // Intro (2 bars)
    bars.push({ chords: [verseSyms[0]], section: 'Intro' })
    bars.push({ chords: [verseSyms[verseSyms.length - 1] ?? verseSyms[0]] })
    // Verse (8 bars = 2 passes)
    verseSyms.forEach((c, i) => bars.push({ chords: [c], ...(i === 0 ? { section: 'Verse' } : {}) }))
    verseSyms.forEach(c => bars.push({ chords: [c] }))
    // Chorus (8 bars = 2 passes)
    chorusSyms.forEach((c, i) => bars.push({ chords: [c], ...(i === 0 ? { section: 'Chorus' } : {}) }))
    chorusSyms.forEach(c => bars.push({ chords: [c] }))
    // Solo Break (8 bars)
    soloSyms.forEach((c, i) => bars.push({ chords: [c], ...(i === 0 ? { section: 'Solo' } : {}) }))
    soloSyms.forEach(c => bars.push({ chords: [c] }))
    // Outro (2 bars)
    bars.push({ chords: [chorusSyms[chorusSyms.length - 1] ?? verseSyms[0]], section: 'Outro' })
    bars.push({ chords: [verseSyms[0]] })
  }

  const chart: StrumChart = {
    id: `ai-${style.id}-${Date.now()}`,
    name: songShape === 'loop' ? `${style.label} Loop (${key}${minor ? 'm' : ''})` : `${style.label} Song (${key}${minor ? 'm' : ''})`,
    tonic: key,
    minor,
    capo: 0,
    bpm,
    style: style.strumStyle,
    bars,
  }

  return {
    chart,
    style,
    keysInst,
    bassInst,
    soloScale,
    summary: songShape === 'loop'
      ? `${style.label} 8-bar loop in ${key}${minor ? 'm' : ''} (${bpm} BPM)`
      : `Full ${style.label} song in ${key}${minor ? 'm' : ''} (${bpm} BPM): Intro · Verse · Chorus · Solo · Outro`,
  }
}

/** Parse a plain-English jam prompt into a structured ComposeRequest (works 100% offline!). */
export function parsePromptToRequest(prompt: string, fallback: Partial<ComposeRequest> = {}): ComposeRequest {
  const q = prompt.trim().toLowerCase()

  // 1. Style matching (exact keyword hits score highest)
  let bestStyle: AIStyle | null = null
  let bestScore = 0
  for (const s of AI_STYLES) {
    let score = 0
    if (q.includes(s.label.toLowerCase())) score += 8
    for (const kw of s.keywords) {
      if (q.includes(kw)) score += 3 + kw.length * 0.15
    }
    if (q.includes(s.group.toLowerCase())) score += 1
    if (score > bestScore) { bestScore = score; bestStyle = s }
  }
  const style = bestStyle ?? aiStyleById(fallback.styleId ?? 'classic-rock')

  // 2. Key & Major/Minor detection ("in A minor", "in Eb", "key of G", "Drop D")
  let key = fallback.key ?? style.defaultKey
  let minor = fallback.minor ?? style.minor
  const keyMatch =
    /\b(?:in|key(?: of)?|drop)\s+([a-g])([#b♯♭])?\s*(minor|min|maj|major|m\b)?/i.exec(prompt)
    ?? /\b([A-G])([#b])?(m|min|minor)\b/.exec(prompt)
  if (keyMatch) {
    const letter = keyMatch[1].toUpperCase()
    const acc = keyMatch[2] ? keyMatch[2].replace('♯', '#').replace('♭', 'b') : ''
    key = `${letter}${acc}`
    const modeWord = (keyMatch[3] ?? '').toLowerCase()
    if (modeWord === 'm' || modeWord === 'min' || modeWord === 'minor') minor = true
    else if (modeWord === 'maj' || modeWord === 'major') minor = false
    else if (/drop\s+d/i.test(prompt)) minor = true
  } else if (/\bminor\b/.test(q)) {
    minor = true
  } else if (/\bmajor\b/.test(q)) {
    minor = false
  }

  // 3. BPM detection ("92 bpm", "at 120", "slow", "fast")
  let bpm = fallback.bpm ?? style.defaultBpm
  const bpmMatch = /\b(\d{2,3})\s*bpm\b/i.exec(q) ?? /\b(?:at|around)\s+(\d{2,3})\b/i.exec(q)
  if (bpmMatch) {
    bpm = Math.max(45, Math.min(210, Number(bpmMatch[1])))
  } else if (/\b(very slow|super slow)\b/.test(q)) {
    bpm = Math.max(54, style.bpmRange[0] - 8)
  } else if (/\bslow\b/.test(q)) {
    bpm = style.bpmRange[0]
  } else if (/\b(fast|upbeat|uptempo|driving|energetic)\b/.test(q)) {
    bpm = style.bpmRange[1]
  }

  // 4. Song shape ("loop", "simple", "4 bar", "full song", "verse", "chorus", "solo")
  let songShape: SongShape = fallback.songShape ?? 'song'
  if (/\b(simple|loop|4[\s-]?bar|8[\s-]?bar|vamp|backing loop)\b/.test(q) && !/\b(verse|chorus|full song|intro)\b/.test(q)) {
    songShape = 'loop'
  } else if (/\b(full song|intro|verse|chorus|solo|bridge|arrangement)\b/.test(q)) {
    songShape = 'song'
  }

  // 5. Role ("drums and bass", "rhythm", "mute guitar", "solo", "drums only")
  let role: JamRole = fallback.role ?? 'lead'
  if (/\b(drums? only|just drums?|no chords?)\b/.test(q)) role = 'drums'
  else if (/\b(rhythm|play rhythm|drums? and bass|no guitar|mute guitar|just drums? and bass)\b/.test(q)) role = 'rhythm'
  else if (/\b(solo|lead|shred|improv)\b/.test(q)) role = 'lead'

  // 6. Energy
  let energy: JamEnergy = fallback.energy ?? 'groove'
  if (/\b(chill|mellow|soft|quiet|laid[\s-]?back|gentle|moody|ambient)\b/.test(q)) energy = 'chill'
  else if (/\b(heavy|loud|driving|intense|fast|hard|shred|energetic|big)\b/.test(q)) energy = 'drive'

  // 7. Synth / Keys preference
  let keysInst = fallback.keysInst
  if (/\bjuno\b/.test(q)) keysInst = 'juno'
  else if (/\bprophet\b/.test(q)) keysInst = 'prophet'
  else if (/\b(lo[\s-]?fi|tape keys?)\b/.test(q)) keysInst = 'lofikeys'
  else if (/\b(wurli|wurlitzer)\b/.test(q)) keysInst = 'wurli'
  else if (/\b(dx7|fm|glass)\b/.test(q)) keysInst = 'fmglass'
  else if (/\bshimmer\b/.test(q)) keysInst = 'shimmer'
  else if (/\bmoog\b/.test(q)) keysInst = 'moogpoly'
  else if (/\bclav(inet)?\b/.test(q)) keysInst = 'clavinet'
  else if (/\b(rhodes|electric piano)\b/.test(q)) keysInst = 'epiano'
  else if (/\b(organ|hammond|b3)\b/.test(q)) keysInst = 'organ'
  else if (/\b(strings?|orchestra)\b/.test(q)) keysInst = 'strings'
  else if (/\bpiano\b/.test(q)) keysInst = 'grand'

  return { styleId: style.id, key, minor, bpm, songShape, role, energy, keysInst }
}

/** Turn 2–4 user-played guitar chords ("Strum a Riff → Build Band Around Me") into both a Beat & StrumChart! */
export function buildBandFromChords(
  chords: string[],
  opts: { styleId?: string; bpm?: number; songShape?: SongShape; role?: JamRole; keysInst?: string } = {},
): { beat: Beat; chart: StrumChart; key: string; minor: boolean; summary: string } {
  const clean = chords.map(c => c.trim()).filter(Boolean).slice(0, 8)
  const list = clean.length >= 2 ? clean : ['Am', 'F', 'C', 'G']
  const first = parseChordQual(list[0])
  const key = first ? pcName(first.rootPc, false) : 'A'
  const minor = first ? (first.qual === 'm' || first.qual === 'm7') : true
  const style = aiStyleById(opts.styleId ?? (minor ? 'classic-rock' : 'campfire-acoustic'))
  const bpm = opts.bpm ?? style.defaultBpm
  const songShape = opts.songShape ?? 'song'
  const role = opts.role ?? 'rhythm'
  const keysInst = opts.keysInst ?? style.keysInst

  // Convert played chord symbols into a 4-bar ProgSpec
  const kPc = pc(key)
  const toType = (q: string) => (q === 'm' ? 'min' : q === '' ? 'maj' : q)
  const verseProg: ProgSpec = Array.from({ length: 4 }, (_, i) => {
    const sym = list[i % list.length]
    const p = parseChordQual(sym)
    const semi = p ? (p.rootPc - kPc + 12) % 12 : 0
    const q = p?.qual ?? ''
    return [semi, toType(q), q]
  })
  // Build a complementary Chorus (lifts to IV or bVI!) & Solo section
  const chorusProg: ProgSpec = minor
    ? [[8, 'maj', ''], [10, 'maj', ''], verseProg[0], [7, '7', '7']]
    : [[5, 'maj', ''], [7, 'maj', ''], verseProg[0], verseProg[1] ?? [9, 'min', 'm']]
  const soloProg: ProgSpec = [...verseProg]

  const baseRows = rowsFromGroove(style.groove, 4)
  const partA: PartContent = {
    rows: shapeDrums(baseRows, 'verse', 'groove', style.kit),
    tracks: buildTracksForPart(verseProg, key, style, 'verse', role, keysInst, style.bassInst),
  }
  const partB: PartContent = {
    rows: shapeDrums(baseRows, 'chorus', 'drive', style.kit),
    tracks: buildTracksForPart(chorusProg, key, style, 'chorus', role, keysInst, style.bassInst),
  }
  const partC: PartContent = {
    rows: shapeDrums(baseRows, 'solo', 'groove', style.kit),
    tracks: buildTracksForPart(soloProg, key, style, 'solo', role, keysInst, style.bassInst),
  }
  const partD: PartContent = {
    rows: shapeDrums(baseRows, 'intro', 'chill', style.kit),
    tracks: buildTracksForPart(verseProg, key, style, 'intro', role, keysInst, style.bassInst),
  }

  const beat: Beat = {
    name: `My Riff (${list.slice(0, 4).join('–')})`,
    bpm,
    bars: 4,
    swing: style.swing,
    kit: style.kit,
    rows: partA.rows,
    tracks: partA.tracks,
    key,
    minor,
    drumVol: 0.88,
    part: 'A',
    parts: songShape === 'song' ? { A: partA, B: partB, C: partC, D: partD } : { A: partA },
    chain: songShape === 'song' ? ['D', 'A', 'A', 'B', 'A', 'B', 'C', 'B'] : ['A'],
    chainOn: songShape === 'song',
  }

  const chorusSyms = progToSymbols(chorusProg, key, minor)
  const bars: StrumBar[] = songShape === 'loop'
    ? list.map((c, i) => ({ chords: [c], ...(i === 0 ? { section: 'My Riff' } : {}) }))
    : [
        { chords: [list[0]], section: 'Intro' },
        { chords: [list[list.length - 1]] },
        ...list.map((c, i) => ({ chords: [c], ...(i === 0 ? { section: 'Verse' } : {}) })),
        ...chorusSyms.map((c, i) => ({ chords: [c], ...(i === 0 ? { section: 'Chorus' } : {}) })),
        ...list.map((c, i) => ({ chords: [c], ...(i === 0 ? { section: 'Solo' } : {}) })),
      ]

  const chart: StrumChart = {
    id: `riff-${Date.now()}`,
    name: `My Riff (${list.slice(0, 4).join('–')})`,
    tonic: key,
    minor,
    capo: 0,
    bpm,
    style: style.strumStyle,
    bars,
  }

  return {
    beat,
    chart,
    key,
    minor,
    summary: `Built a ${style.label} band around ${list.join(' → ')} in ${key}${minor ? 'm' : ''} (${bpm} BPM)!`,
  }
}

/** Keys & Synth choices curated for quick switching on Stage (includes all 10 new synths!). */
export const STAGE_KEYS_VOICES: { id: string; label: string; group: string }[] = [
  { id: 'juno', label: 'Juno 106 Chorus Pad', group: 'New Synths' },
  { id: 'prophet', label: 'Prophet Analog Brass', group: 'New Synths' },
  { id: 'lofikeys', label: 'Lo-Fi Tape Keys', group: 'New Synths' },
  { id: 'wurli', label: 'Wurlitzer Funk EP', group: 'New Synths' },
  { id: 'fmglass', label: 'FM Glass Keys (DX7)', group: 'New Synths' },
  { id: 'shimmer', label: 'Dreamy Shimmer Pad', group: 'New Synths' },
  { id: 'moogpoly', label: 'Deep Moog Poly', group: 'New Synths' },
  { id: 'clavinet', label: 'Funk Clavinet', group: 'New Synths' },
  { id: 'epiano', label: 'Warm Rhodes EP', group: 'Classic Keys' },
  { id: 'organ', label: 'Hammond B3 Organ', group: 'Classic Keys' },
  { id: 'grand', label: 'Salamander Grand Piano', group: 'Classic Keys' },
  { id: 'upright', label: 'Upright Lo-Fi Piano', group: 'Classic Keys' },
  { id: 'honky', label: 'Honky-Tonk Piano', group: 'Classic Keys' },
  { id: 'strings', label: 'Orchestral Strings', group: 'Pads & Orchestra' },
  { id: 'horns', label: 'Brass / Horns', group: 'Pads & Orchestra' },
  { id: 'warmpad', label: 'Warm Analog Pad', group: 'Pads & Orchestra' },
  { id: 'ambient', label: 'Ambient Modal Pad', group: 'Pads & Orchestra' },
  { id: 'supersaw', label: 'Supersaw Synth', group: 'Pads & Orchestra' },
  { id: 'pluck', label: 'Synth Pluck', group: 'Pads & Orchestra' },
]

export const STAGE_BASS_VOICES: { id: string; label: string }[] = [
  { id: 'bass', label: 'Electric Bass' },
  { id: 'upbass', label: 'Acoustic Upright Bass' },
  { id: 'moogbass', label: 'Moog Funk Synth Bass' },
  { id: 'reesebass', label: 'Deep Reese Sub Bass' },
  { id: 'synthbass', label: 'Analog Synth Bass' },
  { id: 'sub808', label: '808 Sub (Slides)' },
]
