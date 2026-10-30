// The lick styles. `move` says how a lick goes to another key:
//   'capo'  open-string styles (bluegrass, folk, Hawaiian …) keep their open strings and use a capo, the way players
//           of those styles do; licks are written in several open keys (G, C, D, E, A) so the capo stays low
//   'shift' movable styles slide the whole shape up or down the neck, staying near the style's usual frets (`zone`)
export type LickStyleId =
  | 'blues' | 'rock' | 'altrock' | 'metal' | 'progmetal' | 'mathrock' | 'jazz' | 'mayer' | 'neosoul' | 'funk'
  | 'hawaiian' | 'jawaiian' | 'bluegrass' | 'country' | 'folk' | 'fingerstyle'

export interface LickStyle {
  id: LickStyleId
  label: string
  group: 'Blues & rock' | 'Heavy' | 'Jazz, soul & funk' | 'Island' | 'Roots'
  feel: string
  /** players to listen to for this sound (style references only: every lick here is original) */
  listen: string
  minor: boolean
  move: 'capo' | 'shift'
  /** frets the style usually lives around (shift styles) */
  zone: [number, number]
  bpm: number
  /** General MIDI guitar for Hear it: 25 steel acoustic, 26 jazz, 27 clean, 29 overdrive, 30 distortion */
  program: number
}

export const LICK_STYLES: LickStyle[] = [
  { id: 'blues', label: 'Blues', group: 'Blues & rock', minor: true, move: 'shift', zone: [4, 11], bpm: 84, program: 29,
    feel: 'Minor pentatonic with the blue note, bends that sing, the major 3rd sneaking in, call and response. Play behind the beat and add vibrato to long notes.',
    listen: 'B.B. King, Freddie King, Stevie Ray Vaughan, Albert King' },
  { id: 'rock', label: 'Classic rock', group: 'Blues & rock', minor: true, move: 'shift', zone: [4, 11], bpm: 100, program: 29,
    feel: 'Pentatonic boxes played loud: repeating triplet licks, unison and double-stop bends, the major pentatonic for Southern rock.',
    listen: 'Jimmy Page, Eric Clapton, Slash, Duane Allman' },
  { id: 'altrock', label: 'Alt rock', group: 'Blues & rock', minor: true, move: 'shift', zone: [0, 12], bpm: 104, program: 29,
    feel: 'Octave melodies, open strings droning against moving notes, chromatic power-chord slides, sus and add9 arpeggios, tremolo picking.',
    listen: 'The Edge, Billy Corgan, Jonny Greenwood, John Frusciante' },
  { id: 'metal', label: 'Heavy metal', group: 'Heavy', minor: true, move: 'shift', zone: [0, 12], bpm: 132, program: 30,
    feel: 'Palm-muted gallops on the low string, pedal-point runs, harmonic minor, tremolo picking and screaming bends.',
    listen: 'Iron Maiden, Metallica, Judas Priest, Dimebag Darrell' },
  { id: 'progmetal', label: 'Prog metal', group: 'Heavy', minor: true, move: 'shift', zone: [5, 17], bpm: 100, program: 30,
    feel: 'Odd groupings (5s and 3s over 16ths), odd meters, three-notes-per-string legato, string skipping, tapping and diminished colours.',
    listen: 'John Petrucci, Tosin Abasi, Plini, Misha Mansoor' },
  { id: 'mathrock', label: 'Math rock', group: 'Heavy', minor: false, move: 'capo', zone: [0, 14], bpm: 112, program: 27,
    feel: 'Clean tone, open strings ringing against hammered notes, two-hand tapping, odd meters like 7/8 and 5/4, and shifting accents.',
    listen: 'TTNG, American Football, Covet, Chon' },
  { id: 'jazz', label: 'Jazz', group: 'Jazz, soul & funk', minor: false, move: 'shift', zone: [3, 10], bpm: 120, program: 26,
    feel: 'Chord tones on the beat, chromatic approach notes and enclosures, bebop scales, guide tones through ii–V–I, octaves.',
    listen: 'Wes Montgomery, Joe Pass, Pat Martino, Jim Hall' },
  { id: 'mayer', label: 'Blues-pop (John Mayer style)', group: 'Jazz, soul & funk', minor: false, move: 'shift', zone: [0, 15], bpm: 80, program: 27,
    feel: 'Blues licks with pop sweetness: double-stop sixths, Hendrix-style chord embellishments, major and minor pentatonic mixed, slow singing bends, hybrid picking.',
    listen: 'John Mayer, Jimi Hendrix (ballads), Stevie Ray Vaughan (slow tunes)' },
  { id: 'neosoul', label: 'Neo-soul', group: 'Jazz, soul & funk', minor: false, move: 'shift', zone: [4, 12], bpm: 76, program: 27,
    feel: 'Major 7th and 9th chord shapes with hammer-on flourishes, sliding double stops and smooth pentatonic runs.',
    listen: 'Isaiah Sharkey, Mark Lettieri, Curtis Mayfield, Cory Wong (clean side)' },
  { id: 'funk', label: 'Funk', group: 'Jazz, soul & funk', minor: true, move: 'shift', zone: [0, 12], bpm: 100, program: 27,
    feel: '16th-note grooves: dorian riffs, muted scratches between notes, 9th-chord stabs and octave lines. Keep the strumming hand moving.',
    listen: 'Nile Rodgers, Jimmy Nolen, Cory Wong, Prince' },
  { id: 'hawaiian', label: 'Hawaiian', group: 'Island', minor: false, move: 'capo', zone: [0, 7], bpm: 80, program: 25,
    feel: 'Slack-key sweetness (nahenahe): open strings, hammer-ons and pull-offs, sweet 3rds and 6ths, harmonics, steel-guitar slides and the Hawaiian vamp ending.',
    listen: 'Gabby Pahinui, Keola Beamer, Ledward Kaapana, Makana' },
  { id: 'jawaiian', label: 'Jawaiian (island reggae)', group: 'Island', minor: false, move: 'capo', zone: [0, 7], bpm: 78, program: 27,
    feel: 'Reggae chops on the off-beats with sweet melodic fills: major pentatonic, 3rds, octave hooks and the organ "bubble".',
    listen: 'Kolohe Kai, Rebel Souljahz, Common Kings, Fiji' },
  { id: 'bluegrass', label: 'Bluegrass', group: 'Roots', minor: false, move: 'capo', zone: [0, 5], bpm: 120, program: 25,
    feel: 'First-position flatpicking near the headstock: the G run, the flat-3rd-to-3rd hammer-on, crosspicking rolls and fiddle-tune lines. Capo up for other keys.',
    listen: 'Tony Rice, Doc Watson, Clarence White, Billy Strings' },
  { id: 'country', label: 'Country', group: 'Roots', minor: false, move: 'shift', zone: [0, 10], bpm: 108, program: 27,
    feel: 'Chicken pickin\' snaps, pedal-steel bends, the major 6th, banjo rolls and chromatic runs. Hybrid pick (pick plus middle finger) if you can.',
    listen: 'Brad Paisley, Albert Lee, Brent Mason, Vince Gill' },
  { id: 'folk', label: 'Folk', group: 'Roots', minor: false, move: 'capo', zone: [0, 5], bpm: 92, program: 25,
    feel: 'Open-position melodies with hammer-ons and pull-offs, Travis picking, bass walks and arpeggios that let the strings ring.',
    listen: 'Doc Watson, James Taylor, Joni Mitchell, Nick Drake' },
  { id: 'fingerstyle', label: 'Melodic fingerstyle (Marco Cirillo style)', group: 'Roots', minor: false, move: 'capo', zone: [0, 7], bpm: 72, program: 25,
    feel: 'Fingerpicked and melodic: open-string chord colours (add9, maj7, sus), the thumb on the bass and the fingers on top, hammer-ons and harmonics inside the arpeggios, and runs where every note rings into the next. Slow down and let it breathe.',
    listen: 'Marco Cirillo, Tommy Emmanuel (ballads), Andy McKee, Sungha Jung' },
]
export const lickStyle = (id: string) => LICK_STYLES.find(s => s.id === id) ?? LICK_STYLES[0]
