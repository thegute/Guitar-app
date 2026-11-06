// Style profiles for the tab composer (licks, solos, riffs and chord melodies), built from the owner's favourite
// players. Each one says what a player of that style actually does: which notes they lean on over each chord, their
// rhythms, how much space they leave, the techniques they use, where on the neck they play and how they end a phrase.
// The players are references for the sound only: every line the composer writes is new.

export type StyleId =
  | 'progclean' | 'polyphia' | 'shred' | 'progmetal' | 'metal'
  | 'mayer' | 'rock' | 'blues' | 'pop'
  | 'neosoul' | 'funk' | 'jazz'
  | 'country' | 'bluegrass' | 'billy' | 'acoustic'
  | 'reggaerock' | 'slackkey' | 'hawaiian'
  | 'fingerstyle' | 'classical'

export type Group = 'Prog & shred' | 'Blues, rock & pop' | 'Soul, funk & jazz' | 'Country & bluegrass' | 'Island' | 'Fingerstyle & classical'
/** which notes the lead leans on over each chord */
export type Palette =
  | 'key'        // the key's scale (mode)
  | 'chord'      // the scale that fits each chord (follows the changes)
  | 'lydian'     // chord scale, with the raised 4th on major chords (Plini, Vai)
  | 'blues'      // the key's minor pentatonic + blue note, the chord's major 3rd over major chords
  | 'mixblues'   // major and minor pentatonic of each chord mixed (Mayer, classic rock)
  | 'majpent'    // the chord's major pentatonic (+ the flat 3rd as a passing note): country, bluegrass, island
  | 'minpent'    // the key's minor pentatonic
export type Ending = 'bend' | 'grun' | 'vamp' | 'harmonics' | 'chicken' | 'octave' | 'legato' | 'cadence' | 'enclosure' | 'pedal'
export type RiffKind = 'djent' | 'gallop' | 'power' | 'funk16' | 'skank' | 'hybrid' | 'boomchick' | 'crosspick' | 'arpeggio' | 'dub'
export type MelodyBacking = 'travis' | 'slack' | 'classical' | 'cirillo' | 'jazz' | 'island' | 'country' | 'ballad' | 'blues' | 'pop' | 'neosoul'

/** Rhythm cells: one bar of 4 beats, [start, length] in beats. Rests are the gaps. */
type Cell = [number, number][]

export interface StyleDef {
  id: StyleId
  label: string
  group: Group
  /** the players this is modelled on (the owner's favourites first) */
  artists: string
  feel: string
  minor: boolean
  /** chord progression used when making licks without one from Jam: semitones above the key + chord type */
  prog: { major: [number, string][]; minor: [number, string][] }
  bpm: number
  /** 0 = straight eighths; 1 = full triplet swing/shuffle */
  swing: number
  /** beats in a bar (classical can be 3) */
  meter?: 3 | 4
  palette: Palette
  /** notes above the chord root it likes to land on besides the triad (9 = 2, maj7 = 11, 6 = 9, 11 = 5, #11 = 6) */
  colors: number[]
  /** chance of a chromatic approach note before a chord tone */
  chromatic: number
  /** rhythm cells by level 1–3 (easy, medium, hard); endings are separate */
  cells: [Cell[], Cell[], Cell[]]
  /** chance the second half of a two-bar idea is left as space (call and response) */
  space: number
  /** how much it moves by leaps / arpeggios (0 = stepwise singing, 1 = arpeggio sweeps) */
  arpeggio: number
  /** chance of a scale sequence (groups of 3 or 4 notes stepping along) in busy bars */
  sequence: number
  /** two-note shapes: 3rds, 6ths, 4ths, octaves */
  doubles: { third?: number; sixth?: number; fourth?: number; octave?: number }
  tech: { bend?: number; slide?: number; legato?: number; vibrato?: number; tap?: number; harm?: number; pm?: number; mute?: number }
  /** frets the style lives around, and how it moves: box = one hand position per phrase, roam = up and down the
   *  neck, open = first position with open strings (a capo moves it to other keys) */
  zone: [number, number]
  moves: 'box' | 'roam' | 'open'
  /** how much it likes open strings (0 = avoids, 1 = loves) */
  open: number
  ending: Ending
  riff: RiffKind
  melody: MelodyBacking
  /** fingerpicking patterns that suit it (picking.ts ids) */
  pick: string[]
  /** General MIDI guitar for Hear it: 24 nylon, 25 steel acoustic, 26 jazz, 27 clean, 29 overdrive, 30 distortion */
  program: number
  /** its own tuning (slack key's open G), low string first, MIDI */
  tuning?: number[]
}

// rhythm vocabulary (q = quarter, e = eighth, s = sixteenth, t = triplet eighth)
const e8: Cell = [[0, .5], [.5, .5], [1, .5], [1.5, .5], [2, .5], [2.5, .5], [3, .5], [3.5, .5]]
const s16 = (from: number, to: number): Cell => { const c: Cell = []; for (let t = from; t < to - 1e-6; t += .25) c.push([t, .25]); return c }
const sext = (from: number, to: number): Cell => { const c: Cell = []; for (let t = from; t < to - 1e-6; t += 1 / 6) c.push([Math.round(t * 1e4) / 1e4, 1 / 6]); return c }
const trip = (from: number, to: number): Cell => { const c: Cell = []; for (let t = from; t < to - 1e-6; t += 1 / 3) c.push([Math.round(t * 1e4) / 1e4, 1 / 3]); return c }

export const STYLES: StyleDef[] = [
  // ───────────── Prog & shred
  {
    id: 'progclean', label: 'Melodic prog', group: 'Prog & shred',
    artists: 'Plini, Syncatto (Charlie Robbins), Roy Ziv, Intervals', minor: false,
    feel: 'Clean and soaring: lydian and major 7 colours, legato runs that pour up the neck, tapped notes, wide arpeggios and harmonics. Melodies first, then a flurry, then a long singing note.',
    prog: { major: [[0, 'maj7'], [2, ''], [9, 'm9'], [5, 'maj7']], minor: [[0, 'm9'], [8, 'maj7'], [3, 'maj7'], [10, '6']] },
    bpm: 100, swing: 0, palette: 'lydian', colors: [2, 6, 11], chromatic: .05,
    cells: [
      [[[0, 1], [1, .5], [1.5, .5], [2, 2]], [[0, 1.5], [1.5, .5], [2, 1], [3, 1]], [[0, .5], [.5, .5], [1, 1], [2, 2]]],
      [[[0, .5], [.5, .25], [.75, .25], [1, .5], [1.5, .5], [2, 2]], [...s16(0, 2), [2, 1], [3, 1]], [[0, 1], [1, .5], [1.5, .5], ...s16(2, 4)], [[0, .75], [.75, .75], [1.5, .5], [2, 2]]],
      [[...sext(0, 2), [2, 2]], [...s16(0, 3), [3, 1]], [[0, .5], ...sext(.5, 1.5), [1.5, .5], [2, 2]], [...s16(0, 1), [1, .75], [1.75, .25], ...s16(2, 4)]],
    ],
    space: .15, arpeggio: .55, sequence: .25, doubles: { fourth: .05 },
    tech: { legato: .6, slide: .35, vibrato: .7, tap: .18, harm: .12, bend: .1 },
    zone: [5, 19], moves: 'roam', open: .2, ending: 'legato', riff: 'arpeggio', melody: 'cirillo', pick: ['arp-maj7', 'arp-updown'], program: 27,
  },
  {
    id: 'polyphia', label: 'Prog-pop: tapping and hybrid picking', group: 'Prog & shred',
    artists: 'Polyphia (Tim Henson, Scott LePage), Ichika Nito', minor: false,
    feel: 'Hybrid-picked arpeggios with open strings ringing against fretted notes, lush maj7 and 9th shapes, harmonics, quick legato flicks and muted "slap" hits, all with a laid-back, almost trap swing.',
    prog: { major: [[0, 'maj9'], [9, 'm9'], [5, 'maj7'], [4, 'm7']], minor: [[0, 'm9'], [5, 'm7'], [8, 'maj7'], [10, '6']] },
    bpm: 92, swing: .15, palette: 'chord', colors: [2, 11, 9], chromatic: .04,
    cells: [
      [[[0, .5], [.5, .5], [1, .5], [1.5, .5], [2, 2]], [[0, .75], [.75, .75], [1.5, .5], [2, 1], [3, 1]]],
      [[...s16(0, 1), [1, .5], [1.5, .5], [2, .75], [2.75, .75], [3.5, .5]], [[0, .5], [.5, .25], [.75, .25], [1, .5], [1.5, .5], ...s16(2, 3), [3, 1]], e8],
      [[...s16(0, 2), ...trip(2, 3), [3, 1]], [...s16(0, 4)], [[0, .5], ...s16(.5, 2), [2, .75], [2.75, .25], ...s16(3, 4)]],
    ],
    space: .1, arpeggio: .75, sequence: .1, doubles: { fourth: .08, third: .05 },
    tech: { legato: .5, slide: .2, harm: .2, mute: .12, tap: .12, vibrato: .4 },
    zone: [0, 15], moves: 'roam', open: .65, ending: 'harmonics', riff: 'hybrid', melody: 'cirillo', pick: ['arp-maj7', 'pinch2'], program: 27,
  },
  {
    id: 'shred', label: 'Shred and melodic rock', group: 'Prog & shred',
    artists: 'Steve Vai, Roy Ziv, John Petrucci (ballads), Joe Satriani', minor: false,
    feel: 'A big singing melody with wide vibrato and bends, lydian colour, then fast alternate-picked sequences and legato bursts up the neck, landing on a screaming long note.',
    prog: { major: [[0, ''], [2, ''], [9, 'm'], [7, '']], minor: [[0, 'm'], [8, ''], [10, ''], [7, '']] },
    bpm: 108, swing: 0, palette: 'lydian', colors: [2, 6], chromatic: .08,
    cells: [
      [[[0, 2], [2, 1], [3, 1]], [[0, 1], [1, 1], [2, 2]], [[0, 1.5], [1.5, .5], [2, 2]]],
      [[[0, 1], [1, .5], [1.5, .5], [2, 2]], [...s16(0, 2), [2, 2]], [[0, 1.5], [1.5, .5], ...s16(2, 4)]],
      [[...s16(0, 4)], [...sext(0, 2), [2, 2]], [...s16(0, 2), ...sext(2, 3), [3, 1]]],
    ],
    space: .1, arpeggio: .3, sequence: .55, doubles: {},
    tech: { bend: .35, vibrato: .9, legato: .45, slide: .3, tap: .08 },
    zone: [5, 20], moves: 'roam', open: 0, ending: 'bend', riff: 'power', melody: 'ballad', pick: ['arp-updown'], program: 29,
  },
  {
    id: 'progmetal', label: 'Prog metal', group: 'Prog & shred',
    artists: 'John Petrucci, Lee McKinney (Born of Osiris), Tosin Abasi, Misha Mansoor', minor: true,
    feel: 'Dark and precise: harmonic minor and phrygian runs in 16ths and sextuplets, odd note groupings, three-notes-per-string legato, pedal-point patterns, palm-muted low notes and wide arpeggios.',
    prog: { major: [[0, ''], [10, ''], [8, ''], [7, '']], minor: [[0, 'm'], [8, ''], [1, ''], [7, '']] },
    bpm: 112, swing: 0, palette: 'key', colors: [2, 7], chromatic: .06,
    cells: [
      [[[0, .5], [.5, .5], [1, 1], [2, .5], [2.5, .5], [3, 1]], [[0, 1], [1, .5], [1.5, .5], [2, 2]]],
      [[...s16(0, 2), [2, 1], [3, 1]], [[0, .75], [.75, .75], [1.5, .5], ...s16(2, 4)], [...s16(0, 4)]],
      [[...sext(0, 2), ...s16(2, 4)], [...s16(0, 4)], [...sext(0, 3), [3, 1]]],
    ],
    space: .08, arpeggio: .45, sequence: .55, doubles: {},
    tech: { legato: .55, pm: .25, vibrato: .6, bend: .12, tap: .1, slide: .2 },
    zone: [5, 20], moves: 'roam', open: .05, ending: 'pedal', riff: 'djent', melody: 'ballad', pick: ['arp-updown'], program: 30,
  },
  {
    id: 'metal', label: 'Heavy metal', group: 'Prog & shred',
    artists: 'Metallica, Iron Maiden, Dimebag Darrell, Avenged Sevenfold', minor: true,
    feel: 'Harmonic minor and phrygian runs, gallops and pedal-point licks against the open low string, tremolo-picked melodies and screaming bends.',
    prog: { major: [[0, '5'], [10, '5'], [8, '5'], [7, '5']], minor: [[0, '5'], [1, '5'], [8, '5'], [7, '5']] },
    bpm: 132, swing: 0, palette: 'key', colors: [7], chromatic: .05,
    cells: [
      [[[0, .5], [.5, .5], [1, 1], [2, .5], [2.5, .5], [3, 1]], [[0, .5], [.5, .25], [.75, .25], [1, .5], [1.5, .25], [1.75, .25], [2, 2]]],
      [[...s16(0, 2), [2, 1], [3, 1]], [[0, .5], [.5, .25], [.75, .25], [1, .5], [1.5, .25], [1.75, .25], ...s16(2, 4)]],
      [[...s16(0, 4)], [...sext(0, 2), ...s16(2, 4)]],
    ],
    space: .05, arpeggio: .25, sequence: .5, doubles: {},
    tech: { pm: .35, bend: .25, vibrato: .7, legato: .3 },
    zone: [0, 17], moves: 'roam', open: .3, ending: 'pedal', riff: 'gallop', melody: 'ballad', pick: ['arp-updown'], program: 30,
  },
  // ───────────── Blues, rock & pop
  {
    id: 'mayer', label: 'Blues-pop', group: 'Blues, rock & pop',
    artists: 'John Mayer, Mateus Asato, Stevie Ray Vaughan (slow tunes), Jimi Hendrix (ballads)', minor: false,
    feel: 'Major and minor pentatonic mixed over each chord, double-stop 6ths and 3rds, half-step "curl" bends, slow singing bends, little hammer-on flicks and a lot of space. Behind the beat.',
    prog: { major: [[0, ''], [7, ''], [9, 'm'], [5, '']], minor: [[0, 'm7'], [5, 'm7'], [10, ''], [7, '7']] },
    bpm: 84, swing: .2, palette: 'mixblues', colors: [2, 9], chromatic: .08,
    cells: [
      [[[0, 1], [1, .5], [1.5, .5], [2, 2]], [[.5, .5], [1, 1], [2, 2]], [[0, 1.5], [1.5, .5], [2, 1.5]]],
      [[[0, .5], [.5, .5], [1, .5], [1.5, .5], [2, 2]], [[.5, .25], [.75, .25], [1, .5], [1.5, .5], [2, 1], [3, 1]], [[0, .75], [.75, .25], [1, 1], [2, .5], [2.5, 1.5]]],
      [[[0, .25], [.25, .25], [.5, .5], [1, .5], [1.5, .5], ...s16(2, 3), [3, 1]], [...trip(0, 2), [2, 2]], [[0, .5], ...s16(.5, 2), [2, 2]]],
    ],
    space: .35, arpeggio: .2, sequence: .05, doubles: { sixth: .22, third: .14 },
    tech: { bend: .3, vibrato: .8, slide: .3, legato: .35 },
    zone: [2, 15], moves: 'box', open: .05, ending: 'bend', riff: 'hybrid', melody: 'neosoul', pick: ['travis', 'arp-updown'], program: 27,
  },
  {
    id: 'rock', label: 'Classic rock', group: 'Blues, rock & pop',
    artists: 'Eagles ("Hotel California"), Fleetwood Mac ("Dreams"), Michael Jackson\'s guitarists, Billy Joel\'s band, Slash, Clapton', minor: true,
    feel: 'Pentatonic boxes played with feeling: repeating triplet licks, unison bends, the major pentatonic over major chords and twin-guitar harmony lines in 3rds. Hooks you can sing.',
    prog: { major: [[0, ''], [10, ''], [5, ''], [0, '']], minor: [[0, 'm'], [7, ''], [10, ''], [5, ''], [3, ''], [10, ''], [8, ''], [7, '']] },
    bpm: 96, swing: 0, palette: 'mixblues', colors: [2], chromatic: .04,
    cells: [
      [[[0, 1], [1, 1], [2, 2]], [[0, .5], [.5, .5], [1, 1], [2, 2]], [[0, 1.5], [1.5, .5], [2, 1], [3, 1]]],
      [[[0, .5], [.5, .5], [1, .5], [1.5, .5], [2, 2]], [...trip(0, 2), [2, 2]], [[0, 1], [1, .5], [1.5, .5], [2, .5], [2.5, .5], [3, 1]]],
      [[...trip(0, 4)], [...s16(0, 2), [2, 2]], [[0, .5], ...trip(.5, 2.5), [2.5, 1.5]]],
    ],
    space: .25, arpeggio: .2, sequence: .25, doubles: { third: .12 },
    tech: { bend: .35, vibrato: .7, slide: .25, legato: .3 },
    zone: [4, 17], moves: 'box', open: .05, ending: 'bend', riff: 'power', melody: 'ballad', pick: ['arp-updown', 'travis'], program: 29,
  },
  {
    id: 'blues', label: 'Blues', group: 'Blues, rock & pop',
    artists: 'B.B. King, Stevie Ray Vaughan, Freddie King, John Mayer (blues side)', minor: true,
    feel: 'Call and response: a short phrase, then space. The blue note, bends that sing, the major 3rd sneaking in over the I chord, and a shuffle feel.',
    prog: { major: [[0, '7'], [5, '7'], [0, '7'], [0, '7'], [5, '7'], [5, '7'], [0, '7'], [0, '7'], [7, '7'], [5, '7'], [0, '7'], [7, '7']], minor: [[0, 'm7'], [5, 'm7'], [0, 'm7'], [7, '7']] },
    bpm: 80, swing: .65, palette: 'blues', colors: [], chromatic: .05,
    cells: [
      [[[0, 1], [1, 1], [2, 2]], [[.5, .5], [1, 1], [2, 2]], [[0, 1.5], [1.5, .5], [2, 2]]],
      [[[0, .5], [.5, .5], [1, .5], [1.5, .5], [2, 2]], [[0, .5], [.5, .5], [1, 1], [2, 1], [3, 1]], [...trip(0, 1), [1, 1], [2, 2]]],
      [[...trip(0, 3), [3, 1]], [[0, .5], [.5, .5], ...trip(1, 2), [2, .5], [2.5, 1.5]], [...trip(0, 2), [2, .5], [2.5, .5], [3, 1]]],
    ],
    space: .45, arpeggio: .1, sequence: .1, doubles: { fourth: .08 },
    tech: { bend: .45, vibrato: .85, slide: .2, legato: .25 },
    zone: [4, 17], moves: 'box', open: .05, ending: 'bend', riff: 'boomchick', melody: 'blues', pick: ['thumb'], program: 29,
  },
  {
    id: 'pop', label: 'Pop and soul', group: 'Blues, rock & pop',
    artists: 'Ed Sheeran, Bruno Mars, James Arthur, The Fray, Mike Posner, Michael Jackson, Billy Joel', minor: false,
    feel: 'A hook you can sing, repeated and answered: notes from the key, sweet 6ths, small slides and a strong ending on the home note. Simple, catchy, nothing wasted.',
    prog: { major: [[0, ''], [7, ''], [9, 'm'], [5, '']], minor: [[0, 'm'], [8, ''], [3, ''], [10, '']] },
    bpm: 96, swing: 0, palette: 'key', colors: [2], chromatic: .02,
    cells: [
      [[[0, 1], [1, 1], [2, 2]], [[0, .5], [.5, .5], [1, 1], [2, 2]], [[.5, .5], [1, .5], [1.5, .5], [2, 2]]],
      [[[0, .5], [.5, .5], [1, .5], [1.5, 1], [2.5, 1.5]], [[.5, .5], [1, .5], [1.5, .5], [2, .5], [2.5, 1.5]], [[0, .75], [.75, .75], [1.5, .5], [2, 2]]],
      [[[0, .5], [.5, .25], [.75, .25], [1, .5], [1.5, .5], [2, .5], [2.5, 1.5]], [[.25, .25], [.5, .5], [1, .5], [1.5, .5], [2, .75], [2.75, 1.25]]],
    ],
    space: .3, arpeggio: .15, sequence: 0, doubles: { sixth: .15, third: .1 },
    tech: { slide: .3, legato: .25, vibrato: .4 },
    zone: [0, 12], moves: 'box', open: .3, ending: 'cadence', riff: 'hybrid', melody: 'pop', pick: ['arp-updown', 'pinch2', 'travis'], program: 25,
  },
  // ───────────── Soul, funk & jazz
  {
    id: 'neosoul', label: 'Neo-soul', group: 'Soul, funk & jazz',
    artists: 'Mateus Asato, Ichika Nito, Isaiah Sharkey, Cory Wong (clean side)', minor: false,
    feel: 'Major 7, 9th and 11th colours, hammer-on flourishes inside chord shapes, sliding 4ths and 3rds, smooth pentatonic runs that end on a 9th or 6th rather than the root.',
    prog: { major: [[5, 'maj7'], [4, 'm7'], [2, 'm9'], [0, 'maj9']], minor: [[0, 'm9'], [5, '9'], [3, 'maj7'], [7, 'm7']] },
    bpm: 76, swing: .2, palette: 'chord', colors: [2, 11, 5, 9], chromatic: .1,
    cells: [
      [[[0, 1], [1, .5], [1.5, .5], [2, 2]], [[.5, .5], [1, .5], [1.5, .5], [2, 2]]],
      [[[0, .25], [.25, .25], [.5, .5], [1, .5], [1.5, .5], [2, 2]], [[0, .5], [.5, .25], [.75, .25], [1, 1], [2, .5], [2.5, 1.5]], [[.5, .25], [.75, .25], [1, .5], [1.5, .5], ...s16(2, 3), [3, 1]]],
      [[...s16(0, 2), [2, .5], [2.5, 1.5]], [[0, .25], [.25, .25], [.5, .25], [.75, .25], [1, .5], ...trip(1.5, 2.5), [2.5, 1.5]]],
    ],
    space: .3, arpeggio: .35, sequence: .1, doubles: { fourth: .15, third: .12 },
    tech: { legato: .5, slide: .4, vibrato: .5, bend: .08 },
    zone: [3, 15], moves: 'box', open: .1, ending: 'enclosure', riff: 'funk16', melody: 'neosoul', pick: ['arp-maj7'], program: 27,
  },
  {
    id: 'funk', label: 'Funk', group: 'Soul, funk & jazz',
    artists: 'Cory Wong, Michael Jackson\'s session players (David Williams), Nile Rodgers, Vulfpeck', minor: true,
    feel: '16th-note grooves: short dorian and mixolydian lines with muted ghost notes between them, octave hooks, and lots of rests. The rhythm is the melody.',
    prog: { major: [[0, '9'], [5, '9'], [0, '9'], [7, '9']], minor: [[0, 'm7'], [5, '9'], [0, 'm7'], [5, '9']] },
    bpm: 104, swing: .05, palette: 'chord', colors: [2, 10], chromatic: .1,
    cells: [
      [[[0, .5], [.75, .25], [1, .5], [2, .5], [2.75, .25], [3, .5]], [[0, .25], [.5, .25], [1, .5], [2, .25], [2.5, .25], [3, .5]]],
      [[[0, .25], [.25, .25], [.75, .25], [1, .25], [1.5, .25], [2, .25], [2.25, .25], [2.75, .25], [3.25, .25], [3.5, .5]], [[0, .5], [.75, .25], [1, .25], [1.25, .25], [1.75, .25], [2.5, .25], [2.75, .25], [3, .5]]],
      [[...s16(0, 4)], [[0, .25], [.25, .25], [.5, .25], [1, .25], [1.25, .25], [1.5, .25], [1.75, .25], [2.25, .25], [2.5, .25], [3, .25], [3.25, .25], [3.5, .5]]],
    ],
    space: .3, arpeggio: .15, sequence: .15, doubles: { octave: .25, fourth: .05 },
    tech: { mute: .3, slide: .25, legato: .2 },
    zone: [5, 14], moves: 'box', open: .05, ending: 'octave', riff: 'funk16', melody: 'neosoul', pick: ['pinch2'], program: 27,
  },
  {
    id: 'jazz', label: 'Jazz', group: 'Soul, funk & jazz',
    artists: 'Wes Montgomery, Joe Pass, Pat Martino, Julian Lage', minor: false,
    feel: 'Swinging eighths, chord tones on the beat, chromatic approach notes and enclosures that circle the target, and lines that follow every chord change.',
    prog: { major: [[2, 'm7'], [7, '7'], [0, 'maj7'], [9, '7']], minor: [[2, 'm7b5'], [7, '7'], [0, 'm7'], [0, 'm7']] },
    bpm: 132, swing: .6, palette: 'chord', colors: [2, 9, 11], chromatic: .3,
    cells: [
      [[[0, 1], [1, 1], [2, 1], [3, 1]], [[0, .5], [.5, .5], [1, 1], [2, 2]]],
      [e8, [[0, .5], [.5, .5], [1, .5], [1.5, .5], [2, 1], [3, .5], [3.5, .5]], [[.5, .5], [1, .5], [1.5, .5], [2, .5], [2.5, .5], [3, 1]]],
      [e8, [[0, .5], [.5, .5], ...trip(1, 2), [2, .5], [2.5, .5], [3, .5], [3.5, .5]]],
    ],
    space: .15, arpeggio: .4, sequence: .15, doubles: { octave: .1 },
    tech: { slide: .15, legato: .15 },
    zone: [3, 13], moves: 'box', open: 0, ending: 'enclosure', riff: 'arpeggio', melody: 'jazz', pick: ['arp-maj7'], program: 26,
  },
  // ───────────── Country & bluegrass
  {
    id: 'country', label: 'Modern country', group: 'Country & bluegrass',
    artists: 'Zac Brown Band, Luke Combs, Morgan Wallen, Cody Johnson (their lead players), Brad Paisley', minor: false,
    feel: 'Major pentatonic with the flat 3rd rolling into the 3rd, sweet 6ths, pedal-steel bends, chicken-pickin\' snaps (muted notes) and hybrid-picked banjo rolls. Ends with the classic 6-5-3-1.',
    prog: { major: [[0, ''], [5, ''], [9, 'm'], [7, '']], minor: [[0, 'm'], [8, ''], [3, ''], [10, '']] },
    bpm: 104, swing: .05, palette: 'majpent', colors: [9, 2], chromatic: .08,
    cells: [
      [[[0, 1], [1, .5], [1.5, .5], [2, 2]], [[0, .5], [.5, .5], [1, 1], [2, 1], [3, 1]]],
      [e8, [[0, .5], [.5, .25], [.75, .25], [1, .5], [1.5, .5], [2, 1], [3, 1]], [[.5, .5], [1, .5], [1.5, .5], [2, .5], [2.5, .5], [3, 1]]],
      [[...s16(0, 2), [2, .5], [2.5, .5], [3, 1]], [[0, .25], [.25, .25], [.5, .5], [1, .25], [1.25, .25], [1.5, .5], ...s16(2, 4)]],
    ],
    space: .2, arpeggio: .25, sequence: .15, doubles: { sixth: .2, third: .15 },
    tech: { bend: .3, mute: .15, slide: .2, legato: .35, vibrato: .3 },
    zone: [2, 15], moves: 'roam', open: .25, ending: 'chicken', riff: 'boomchick', melody: 'country', pick: ['thumb', 'travis'], program: 27,
  },
  {
    id: 'bluegrass', label: 'Bluegrass', group: 'Country & bluegrass',
    artists: 'Doc Watson, Tyler Grant, Tony Rice, Clarence White', minor: false,
    feel: 'Steady eighth-note flatpicking in first position with open strings ringing, the flat-3rd-to-3rd hammer-on, fiddle-tune lines and the G run to finish. Capo up for other keys, like the pickers do.',
    prog: { major: [[0, ''], [5, ''], [7, ''], [0, '']], minor: [[0, 'm'], [10, ''], [7, ''], [0, 'm']] },
    bpm: 120, swing: 0, palette: 'majpent', colors: [9, 2], chromatic: .06,
    cells: [
      [[[0, 1], [1, .5], [1.5, .5], [2, 1], [3, 1]], [[0, .5], [.5, .5], [1, 1], [2, .5], [2.5, .5], [3, 1]]],
      [e8, [[0, .5], [.5, .5], [1, .5], [1.5, .5], [2, 1], [3, .5], [3.5, .5]]],
      [e8, [[0, .5], [.5, .25], [.75, .25], [1, .5], [1.5, .5], [2, .5], [2.5, .5], [3, .5], [3.5, .5]]],
    ],
    space: .03, arpeggio: .15, sequence: .25, doubles: {},
    tech: { legato: .3, slide: .15 },
    zone: [0, 5], moves: 'open', open: .85, ending: 'grun', riff: 'crosspick', melody: 'travis', pick: ['travis', 'thumb'], program: 25,
  },
  {
    id: 'billy', label: 'Modern flatpicking', group: 'Country & bluegrass',
    artists: 'Billy Strings, Molly Tuttle, Tony Rice, Doc Watson', minor: false,
    feel: 'Fast, fearless flatpicking: open-string licks, blue notes, chromatic walk-downs, crosspicking rolls and runs that climb up the neck and come back down to the G run.',
    prog: { major: [[0, ''], [10, ''], [5, ''], [0, '']], minor: [[0, 'm'], [10, ''], [8, ''], [7, '']] },
    bpm: 140, swing: 0, palette: 'majpent', colors: [9, 2, 10], chromatic: .2,
    cells: [
      [e8, [[0, 1], [1, .5], [1.5, .5], [2, .5], [2.5, .5], [3, 1]]],
      [e8, [[0, .5], [.5, .5], ...trip(1, 2), [2, .5], [2.5, .5], [3, .5], [3.5, .5]]],
      [e8, [[0, .5], [.5, .5], [1, .5], [1.5, .5], ...s16(2, 3), [3, .5], [3.5, .5]]],
    ],
    space: .03, arpeggio: .15, sequence: .35, doubles: { third: .05 },
    tech: { legato: .35, slide: .2, bend: .08 },
    zone: [2, 14], moves: 'roam', open: .45, ending: 'grun', riff: 'crosspick', melody: 'travis', pick: ['travis'], program: 25,
  },
  {
    id: 'acoustic', label: 'Acoustic singer-songwriter', group: 'Country & bluegrass',
    artists: 'Dylan Gossett, Ed Sheeran, Zach Bryan, Noah Kahan', minor: false,
    feel: 'Fills you play between sung lines: hammer-ons inside open chord shapes, walking bass notes between chords, open strings left ringing. Capo up to fit your voice.',
    prog: { major: [[0, ''], [5, ''], [9, 'm'], [7, '']], minor: [[0, 'm'], [8, ''], [3, ''], [10, '']] },
    bpm: 88, swing: 0, palette: 'chord', colors: [2], chromatic: .02,
    cells: [
      [[[0, 1], [1, 1], [2, 2]], [[0, .5], [.5, .5], [1, 1], [2, 2]]],
      [[[0, .5], [.5, .5], [1, .5], [1.5, .5], [2, 2]], [[0, 1], [1, .5], [1.5, .5], [2, 1], [3, 1]]],
      [e8, [[0, .5], [.5, .25], [.75, .25], [1, .5], [1.5, .5], [2, 2]]],
    ],
    space: .25, arpeggio: .45, sequence: .05, doubles: { third: .1, sixth: .1 },
    tech: { legato: .5, slide: .15 },
    zone: [0, 7], moves: 'open', open: .8, ending: 'cadence', riff: 'arpeggio', melody: 'pop', pick: ['travis', 'pinch2', 'arp-updown'], program: 25,
  },
  // ───────────── Island
  {
    id: 'reggaerock', label: 'Reggae rock', group: 'Island',
    artists: 'Sublime, Stick Figure, Iration, The Movement, Pacific Dub', minor: false,
    feel: 'Laid back and sunny: major-pentatonic hooks, octave lines like a dub echo, slides into notes, 3rds, and the same hook coming back again and again. Behind the beat, lots of space.',
    prog: { major: [[0, ''], [5, ''], [7, ''], [5, '']], minor: [[0, 'm'], [8, ''], [3, ''], [10, '']] },
    bpm: 88, swing: .1, palette: 'majpent', colors: [2, 9], chromatic: .03,
    cells: [
      [[[0, 1], [1, 1], [2, 2]], [[.5, .5], [1, 1], [2, 2]]],
      [[[.5, .5], [1, .5], [1.5, .5], [2, 2]], [[0, .5], [.5, .5], [1, 1], [2, .5], [2.5, 1.5]], [[0, .75], [.75, .75], [1.5, .5], [2, 2]]],
      [[[.5, .25], [.75, .25], [1, .5], [1.5, .5], [2, .5], [2.5, .5], [3, 1]], [[0, .5], [.5, .5], [1, .5], [1.5, .5], [2, .75], [2.75, 1.25]]],
    ],
    space: .4, arpeggio: .15, sequence: 0, doubles: { octave: .35, third: .15 },
    tech: { slide: .45, vibrato: .4, legato: .2 },
    zone: [2, 14], moves: 'box', open: .15, ending: 'octave', riff: 'skank', melody: 'island', pick: ['pinch2', 'arp-updown'], program: 27,
  },
  {
    id: 'slackkey', label: 'Hawaiian slack key (open G, taro patch)', group: 'Island',
    artists: 'Gabby Pahinui, Ledward Kaʻapana, Keola Beamer, Kaʻau Crater Boys, Hawaiian Style Band', minor: false,
    feel: 'Nahenahe (sweet and gentle): the thumb keeps an alternating bass on the open strings while the fingers play the melody, hammer-ons and pull-offs to open strings, sweet 3rds and 6ths, harmonics, and the Hawaiian vamp at the end. Tuned to open G (D G D G B D).',
    prog: { major: [[0, ''], [5, ''], [7, '7'], [0, '']], minor: [[0, ''], [9, '7'], [2, '7'], [7, '7']] },
    bpm: 84, swing: .1, palette: 'majpent', colors: [9, 2], chromatic: .02,
    cells: [
      [[[0, 1], [1, 1], [2, 2]], [[0, .5], [.5, .5], [1, 1], [2, 2]]],
      [[[0, .5], [.5, .5], [1, .5], [1.5, .5], [2, 2]], [[0, 1], [1, .5], [1.5, .5], [2, 1], [3, 1]], [[0, .75], [.75, .25], [1, 1], [2, 1], [3, 1]]],
      [e8, [[0, .5], [.5, .25], [.75, .25], [1, .5], [1.5, .5], [2, .5], [2.5, .5], [3, 1]]],
    ],
    space: .15, arpeggio: .2, sequence: .05, doubles: { sixth: .25, third: .25 },
    tech: { legato: .55, slide: .3, harm: .15, vibrato: .3 },
    zone: [0, 12], moves: 'open', open: .8, ending: 'vamp', riff: 'arpeggio', melody: 'slack', pick: ['slack', 'travis'], program: 25,
    tuning: [38, 43, 50, 55, 59, 62],
  },
  {
    id: 'hawaiian', label: 'Hawaiian (standard tuning)', group: 'Island',
    artists: 'Kaʻau Crater Boys, Hawaiian Style Band, Makana, Kolohe Kai', minor: false,
    feel: 'Island sweetness in standard tuning: melodies doubled in 6ths and 3rds, slides like a steel guitar, hammer-ons and open strings, ending with the Hawaiian vamp (II7, V7, I).',
    prog: { major: [[0, ''], [5, ''], [2, '7'], [7, '7']], minor: [[0, ''], [9, 'm'], [2, '7'], [7, '7']] },
    bpm: 84, swing: .15, palette: 'majpent', colors: [9, 2], chromatic: .03,
    cells: [
      [[[0, 1], [1, 1], [2, 2]], [[0, .5], [.5, .5], [1, 1], [2, 2]]],
      [[[0, .5], [.5, .5], [1, .5], [1.5, .5], [2, 2]], [[0, 1], [1, .5], [1.5, .5], [2, 1], [3, 1]]],
      [e8, [[0, .5], [.5, .25], [.75, .25], [1, .5], [1.5, .5], [2, 2]]],
    ],
    space: .2, arpeggio: .2, sequence: .05, doubles: { sixth: .3, third: .2 },
    tech: { slide: .45, legato: .35, vibrato: .4, harm: .06 },
    zone: [0, 12], moves: 'box', open: .4, ending: 'vamp', riff: 'skank', melody: 'island', pick: ['pinch2', 'travis'], program: 25,
  },
  // ───────────── Fingerstyle & classical
  {
    id: 'fingerstyle', label: 'Melodic fingerstyle', group: 'Fingerstyle & classical',
    artists: 'Marco Cirillo, Sungha Jung, Tommy Emmanuel, Andy McKee', minor: false,
    feel: 'A melody that sings over open strings ringing like a harp: add9 and sus colours, hammer-ons and pull-offs to open strings, harmonics at the end. Slow down and let every note ring into the next.',
    prog: { major: [[0, 'add9'], [7, ''], [9, 'm7'], [5, 'maj7']], minor: [[0, 'm9'], [8, 'maj7'], [3, 'add9'], [10, 'sus4']] },
    bpm: 76, swing: 0, palette: 'chord', colors: [2, 11, 9], chromatic: .02,
    cells: [
      [[[0, 1], [1, 1], [2, 2]], [[0, .5], [.5, .5], [1, 1], [2, 2]], [[0, 1.5], [1.5, .5], [2, 2]]],
      [[[0, .5], [.5, .5], [1, .5], [1.5, .5], [2, 2]], [[0, .75], [.75, .75], [1.5, .5], [2, 1], [3, 1]], [[0, 1], [1, .5], [1.5, .5], [2, .5], [2.5, 1.5]]],
      [e8, [[0, .5], [.5, .25], [.75, .25], [1, .5], [1.5, .5], ...s16(2, 3), [3, 1]], [[0, .75], [.75, .25], [1, .5], [1.5, .5], [2, .5], [2.5, .5], [3, 1]]],
    ],
    space: .15, arpeggio: .4, sequence: .05, doubles: { third: .12, sixth: .12 },
    tech: { legato: .55, slide: .25, harm: .2, vibrato: .3 },
    zone: [0, 12], moves: 'open', open: .75, ending: 'harmonics', riff: 'arpeggio', melody: 'cirillo', pick: ['cirillo', 'arp-maj7', 'travis'], program: 25,
  },
  {
    id: 'classical', label: 'Classical guitar', group: 'Fingerstyle & classical',
    artists: 'Francisco Tárrega, Fernando Sor, Matteo Carcassi, J. S. Bach (lute pieces)', minor: true,
    feel: 'Clear melodic lines with scale runs and arpeggios, the harmonic minor\'s strong pull home, sequences that climb, and a proper cadence at the end. Fingers, not a pick (p i m a).',
    prog: { major: [[0, ''], [5, ''], [7, '7'], [0, '']], minor: [[0, 'm'], [5, 'm'], [7, '7'], [0, 'm']] },
    bpm: 84, swing: 0, palette: 'chord', colors: [], chromatic: .08,
    cells: [
      [[[0, 1], [1, 1], [2, 1], [3, 1]], [[0, 1.5], [1.5, .5], [2, 2]], [[0, .5], [.5, .5], [1, 1], [2, 2]]],
      [e8, [[0, 1], [1, .5], [1.5, .5], [2, .5], [2.5, .5], [3, 1]], [[0, .75], [.75, .25], [1, .5], [1.5, .5], [2, 2]]],
      [[...s16(0, 2), [2, .5], [2.5, .5], [3, 1]], [...s16(0, 4)], [e8[0], e8[1], ...trip(1, 3), [3, 1]]],
    ],
    space: .05, arpeggio: .45, sequence: .4, doubles: { third: .08, sixth: .08 },
    tech: { slide: .05, legato: .2, vibrato: .3 },
    zone: [0, 12], moves: 'roam', open: .45, ending: 'cadence', riff: 'arpeggio', melody: 'classical', pick: ['pima', 'giuliani', 'arp-updown'], program: 24,
  },
]

export const style = (id: string): StyleDef => STYLES.find(s => s.id === id) ?? STYLES.find(s => s.id === ALIAS[id]) ?? STYLES[0]
/** older style names (lick styles, Jam styles) → composer styles */
export const ALIAS: Record<string, StyleId> = {
  altrock: 'rock', classic: 'rock', bluesrock: 'mayer', popsoul: 'pop', popballad: 'pop', funkpop: 'funk', mathrock: 'polyphia',
  island: 'reggaerock', jawaiian: 'reggaerock', reggae: 'reggaerock', folk: 'acoustic', grunge: 'rock', punk: 'rock', indie: 'pop',
  gospel: 'neosoul', motown: 'funk', lofi: 'neosoul', epic: 'progclean', sad: 'pop', happy: 'pop', any: 'pop',
}
export const GROUPS: Group[] = ['Prog & shred', 'Blues, rock & pop', 'Soul, funk & jazz', 'Country & bluegrass', 'Island', 'Fingerstyle & classical']
