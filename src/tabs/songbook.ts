// The songbook: folk, bluegrass and reggae songs from beginner to advanced, ready to play along with.
// Everything here is public domain or written for KGuitar:
// - folk and bluegrass words are traditional or published before 1929 (dates in `credit`);
// - fiddle tunes are traditional, from the printed sources named in `credit`;
// - reggae classics are all still under copyright, so the reggae songs are KGuitar originals (riddims, bass lines,
//   leads) and traditional songs played in a reggae style.
// Each song has parts at different levels: words and chords to strum (any instrument), the melody as a tab,
// and rhythm parts (boom-chick, crosspicking, Travis, reggae chops) made from the song's chords.
import { chordShapes, generateShapes, type Instrument } from '../instrument'
import { parseSymbol, type Voicing } from '../theory/chords'
import { pc } from '../theory/notes'
import { parseAbc } from './abc'
import { shapeNotes } from './chordSheet'
import { fingerMelody } from './fingering'
import type { Song, SongBar, SongNote, SongStep } from './model'
import { pickPattern, pickingSong, type PickChord } from './picking'
import type { SongDoc } from './library'

export type Genre = 'folk' | 'bluegrass' | 'reggae'
export type Level = 1 | 2 | 3 | 4
export const LEVELS: { id: Level; label: string; what: string }[] = [
  { id: 1, label: 'Beginner', what: 'two or three open chords, slow' },
  { id: 2, label: 'Easy', what: 'more chord changes, simple melodies' },
  { id: 3, label: 'Intermediate', what: 'fiddle tunes, picking patterns, faster changes' },
  { id: 4, label: 'Advanced', what: 'fast tunes, crosspicking, octave leads' },
]
export const GENRES: { id: Genre; label: string }[] = [
  { id: 'folk', label: 'Folk' }, { id: 'bluegrass', label: 'Bluegrass' }, { id: 'reggae', label: 'Reggae' },
]

export type PartKind = 'words' | 'melody' | 'rhythm' | 'octaves'
export interface SongbookPart {
  id: string
  kind: PartKind
  level: Level
  label: string
  /** what you practise with this part */
  learn: string
  bpm: number
  /** rhythm parts: the picking / strum pattern (tabs/picking.ts) */
  pattern?: string
}
export interface SongbookSong {
  id: string
  title: string
  genre: Genre
  credit: string
  key: string
  minor?: boolean
  /** beats per bar (3 for waltzes) */
  meter: number
  /** chords over words: [Chord] = one bar, [Chord 2] = two beats; {Section} lines; ignored if absent */
  sheet?: string
  /** strum pattern shown over the chord sheet (play/strumCoach.ts) */
  strum?: string
  /** melody in ABC, written for guitar (sounds an octave lower, like guitar music) */
  abc?: string
  /** chords bar by bar when there are no words: "D | G | A D" (two chords in a bar share it) */
  chart?: string
  parts: SongbookPart[]
}

const words = (level: Level, bpm: number, learn: string): SongbookPart => ({ id: 'words', kind: 'words', level, label: 'Words & chords', learn, bpm })
const melody = (level: Level, bpm: number, learn: string): SongbookPart => ({ id: 'melody', kind: 'melody', level, label: 'Melody', learn, bpm })
const rhythm = (id: string, level: Level, bpm: number, pattern: string, label: string, learn: string): SongbookPart => ({ id, kind: 'rhythm', level, label, learn, bpm, pattern })

export const SONGBOOK: SongbookSong[] = [
  // ───────────── folk ─────────────
  {
    id: 'valley', title: 'Down in the Valley', genre: 'folk', credit: 'Traditional (American)', key: 'G', meter: 3, strum: 'waltz',
    sheet: `{Verse}
[G]Down in the valley, [G]the valley so [G]low, [D7]
[D7]Hang your head over, [D7]hear the wind [D7]blow. [G]
[G]Hear the wind blow, dear, [G]hear the wind [G]blow, [D7]
[D7]Hang your head over, [D7]hear the wind [G]blow. [G]`,
    parts: [
      words(1, 84, 'Two chords, G and D7, in waltz time: count 1-2-3.'),
      rhythm('waltz', 2, 92, 'waltz', 'Waltz bass-strum', 'Bass note on 1, strums on 2 and 3.'),
    ],
  },
  {
    id: 'susanna', title: 'Oh! Susanna', genre: 'folk', credit: 'Stephen Foster, 1848', key: 'C', meter: 4, strum: 'folk',
    sheet: `{Verse}
[C]I come from Ala[C]bama with my [C]banjo on my [G7]knee,
[C]I'm going to Loui[C]siana, my [C]true love [G7 2]for to [C 2]see.
[C]It rained all night the [C]day I left, the [C]weather it was [G7]dry,
[C]The sun so hot I [C]froze to death; Su[C]sanna, [G7 2]don't you [C 2]cry.
{Chorus}
[F]Oh, Su[F]sanna, [C]oh don't you [G7]cry for me,
[C]For I come from Ala[C]bama with my [C]banjo [G7 2]on my [C 2]knee.`,
    abc: `M:4/4
L:1/8
K:C
"C"CD | E G G A G E C D | E E D C "G7"D2 CD | "C"E G G A G E C D | E E "G7"D D "C"C4 |
"F"F2 F2 A2 A2 | "C"A2 G2 G2 E2 | C2 "G7"D4 CD | "C"E G G A G E C D | E E "G7"D D "C"C4 |]`,
    parts: [
      words(1, 92, 'C, F and G7: the three chords of a thousand folk songs.'),
      melody(2, 96, 'A first-position melody on the A, D and G strings.'),
      rhythm('boom', 2, 100, 'boomchick', 'Boom-chick', 'Alternating bass and strum, with bass walks into the next chord.'),
    ],
  },
  {
    id: 'clementine', title: 'Clementine', genre: 'folk', credit: 'Traditional (Percy Montrose, 1884)', key: 'G', meter: 3, strum: 'waltz',
    sheet: `{Verse}
[G]In a cavern, [G]in a canyon, [G]excavating [D7]for a mine,
[D7]Dwelt a miner, [G]forty-niner, [D7]and his daughter [G]Clementine.
{Chorus}
[G]Oh my darling, [G]oh my darling, [G]oh my darling [D7]Clementine,
[D7]You are lost and [G]gone forever, [D7]dreadful sorry, [G]Clementine.`,
    abc: `M:3/4
L:1/8
K:G
GG | "G"G2 D2 BB | B2 G2 GB | d3 d cB | "D7"A4 AB | c2 c2 BA | "G"B2 G2 GB | "D7"A2 D2 FA | "G"G4 GG |
"G"G2 D2 BB | B2 G2 GB | d3 d cB | "D7"A4 AB | c2 c2 BA | "G"B2 G2 GB | "D7"A2 D2 FA | "G"G6 |]`,
    parts: [
      words(1, 88, 'G and D7 in waltz time.'),
      melody(2, 96, 'Open strings and first-position notes on the G, B and D strings.'),
      rhythm('waltz', 3, 104, 'waltz', 'Waltz bass-strum', 'Keep the bass on 1 and two light strums.'),
    ],
  },
  {
    id: 'redriver', title: 'Red River Valley', genre: 'folk', credit: 'Traditional (American, 1870s)', key: 'G', meter: 4, strum: 'folk',
    sheet: `{Verse}
[G]From this valley they [G]say you are [G]going, [G]
[G]We will miss your bright [G]eyes and sweet [D7]smile, [D7]
[G]For they say you are [G7]taking the [C]sunshine [C]
[G]That has brightened our [D7]pathway a [G]while. [G]
{Chorus}
[G]Come and sit by my [G]side if you [G]love me, [G]
[G]Do not hasten to [G]bid me a[D7]dieu, [D7]
[G]But remember the [G7]Red River [C]Valley [C]
[G]And the one who has [D7]loved you so [G]true. [G]`,
    parts: [
      words(1, 88, 'G, C and D7 with a G7 on the way to C.'),
      rhythm('travis', 3, 76, 'travis', 'Travis picking', 'Thumb on every beat, fingers in between.'),
      rhythm('pinch', 4, 88, 'pinch2', 'Travis with pinches', 'Pinches on 1 and 3 at a steady 88.'),
    ],
  },
  {
    id: 'gifts', title: 'Simple Gifts', genre: 'folk', credit: 'Joseph Brackett, 1848', key: 'G', meter: 4, strum: 'folk',
    sheet: `{Verse}
[G]'Tis the gift to be [G]simple, 'tis the [G]gift to be [D]free,
[D]'Tis the gift to come [D]down where we [D]ought to [G]be,
[G]And when we find our[G]selves in the [G]place just [G]right,
[G]'Twill be in the [D]valley of [D]love and de[G]light.
{Chorus}
[G]When true sim[G]plicity is [D]gained, [D]
[D]To bow and to [D]bend we shan't be a[G]shamed, [G]
[G]To turn, [G]turn will be our de[C]light, [C]
[G]Till by turning, turning, we [D]come round [G]right. [G]`,
    parts: [
      words(2, 92, 'G, D and C, with a long stretch on one chord to keep the strum steady.'),
      rhythm('arp', 3, 80, 'arp-updown', 'Fingerpicked arpeggio', 'Bass then up and down the strings, letting it ring.'),
    ],
  },
  {
    id: 'scarborough', title: 'Scarborough Fair', genre: 'folk', credit: 'Traditional (English ballad)', key: 'A', minor: true, meter: 3, strum: 'waltz',
    sheet: `{Verse}
[Am]Are you [Am]going to [G]Scarborough [Am]Fair?
[C]Parsley, [Am]sage, rose[D]mary and [Am]thyme;
[Am]Remember [C]me to [G]one who lives [Am]there,
[Am]She once [G]was a [D]true love of [Am]mine.`,
    parts: [
      words(2, 84, 'Am, G, C and D in 3/4: a minor song with a Dorian D major.'),
      rhythm('arp', 3, 76, 'arp-updown', 'Fingerpicked arpeggio', 'Let every note ring into the next.'),
      rhythm('roll', 4, 84, 'arp-16', 'Sixteenth-note roll', 'Four notes a beat, rising, at an even volume.'),
    ],
  },
  {
    id: 'stranger', title: 'Wayfaring Stranger', genre: 'folk', credit: 'Traditional (American, printed 1858)', key: 'A', minor: true, meter: 4, strum: 'folk',
    sheet: `{Verse}
[Am]I am a poor way[Am]faring [Dm]stranger, [Am]
[Am]While travelling [Am]through this world of [E]woe, [E]
[Am]Yet there's no sickness, [Am]toil nor [Dm]danger [Am]
[Am]In that bright [E]world to which I [Am]go. [Am]
{Chorus}
[F]I'm going [F]there to see my [C]father, [C]
[F]I'm going [F]there no more to [E]roam, [E]
[Am]I'm only [Am]going over [Dm]Jordan, [Am]
[Am]I'm only [E]going over [Am]home. [Am]`,
    parts: [
      words(2, 76, 'Am, Dm, E, F and C: minor key changes.'),
      rhythm('travis', 3, 72, 'travis', 'Travis picking', 'Alternating thumb under a slow minor song.'),
      rhythm('ripple', 4, 80, 'arp-pinch', 'Pinch and ripple', 'Bass and top string together, the middle strings ripple.'),
    ],
  },
  {
    id: 'range', title: 'Home on the Range', genre: 'folk', credit: 'Brewster Higley & Daniel Kelley, 1872', key: 'G', meter: 3, strum: 'waltz',
    sheet: `{Verse}
[G]Oh give me a [G]home where the [C]buffalo [C]roam,
[G]Where the deer and the [G]antelope [D7]play, [D7]
[G]Where seldom is [G]heard a dis[C]couraging [C]word,
[G]And the skies [D7]are not cloudy all [G]day. [G]
{Chorus}
[G]Home, [D7]home on the [G]range, [G]
[G]Where the deer and the [G]antelope [D7]play, [D7]
[G]Where seldom is [G]heard a dis[C]couraging [C]word,
[G]And the skies [D7]are not cloudy all [G]day. [G]`,
    parts: [
      words(2, 96, 'G, C and D7 in waltz time with quicker changes.'),
      rhythm('waltz', 3, 108, 'waltz', 'Waltz bass-strum', 'Bass on 1, alternate the bass note when a chord lasts two bars.'),
    ],
  },

  // ───────────── bluegrass ─────────────
  {
    id: 'cabbage', title: 'Boil Them Cabbage Down', genre: 'bluegrass', credit: 'Traditional (American)', key: 'G', meter: 4, strum: 'boomchick',
    sheet: `{Chorus}
[G]Boil them cabbage [C]down, boys, [G]bake them hoecakes [D]brown,
[G]The only song that [C]I can sing is [G 2]boil them [D 2]cabbage [G]down.
{Verse}
[G]Went up on the [C]mountain [G]to give my horn a [D]blow,
[G]Thought I heard my [C]true love say, [G 2]yonder [D 2]comes my [G]beau.`,
    parts: [
      words(1, 90, 'G, C and D: the first tune at every bluegrass jam.'),
      rhythm('boom', 1, 90, 'boomchick', 'Boom-chick', 'Bass on 1 and 3, strum on 2 and 4.'),
      rhythm('carter', 2, 110, 'carter', 'Boom-chicka', 'Down-up strums between the bass notes.'),
    ],
  },
  {
    id: 'circle', title: 'Will the Circle Be Unbroken', genre: 'bluegrass', credit: 'Ada Habershon & Charles Gabriel, 1907', key: 'G', meter: 4, strum: 'boomchick',
    sheet: `{Verse}
[G]There are loved ones [G]in the glory,
[C]Whose dear forms you [G]often miss;
[G]When you close your [G]earthly story,
[G 2]Will you [D 2]join them [G]in their bliss?
{Chorus}
[G]Will the circle [G]be unbroken
[C]By and by, [G]by and by?
[G]Is a better [G]home awaiting
[G 2]In the [D 2]sky, [G]in the sky?`,
    parts: [
      words(1, 96, 'G, C and D with a quick change at the end of each verse.'),
      rhythm('boom', 2, 100, 'boomchick', 'Boom-chick with bass runs', 'Walk the bass from G up to C and back.'),
      rhythm('cross', 4, 120, 'cross', 'Crosspicking', 'A 3-3-2 roll across three strings with a flatpick.'),
    ],
  },
  {
    id: 'sunny', title: 'Keep on the Sunny Side', genre: 'bluegrass', credit: 'Ada Blenkhorn & J. Howard Entwisle, 1899', key: 'G', meter: 4, strum: 'boomchick',
    sheet: `{Verse}
[G]There's a dark and a [G]troubled side of [C]life, [G]
[G]There's a bright and a [G]sunny side [D]too; [D]
[G]Though we meet with the [G]darkness and [C]strife, [G]
[G]The sunny side we [D]also may [G]view. [G]
{Chorus}
[G]Keep on the sunny side, [C]always on the [G]sunny side, [G]
[G]Keep on the sunny [D]side of [G]life; [G]
[G]It will help us every [C]day, it will [G]brighten all the [G]way,
[G]If we'll keep on the [D]sunny side of [G]life. [G]`,
    parts: [
      words(1, 100, 'G, C and D at a happy pace.'),
      rhythm('carter', 2, 108, 'carter', 'Boom-chicka', 'Bass, then down-up strums, with walks between chords.'),
    ],
  },
  {
    id: 'sorrow', title: 'Man of Constant Sorrow', genre: 'bluegrass', credit: 'Traditional (Dick Burnett, 1913)', key: 'G', meter: 4, strum: 'boomchick',
    sheet: `{Verse}
[G]I am a man of [G]constant [C]sorrow, [C]
[G]I've seen trouble [D]all my [G]days; [G]
[G]I bid farewell to [G]old Ken[C]tucky, [C]
[G]The place where [D]I was born and [G]raised. [G]`,
    parts: [
      words(2, 92, 'G, C and D with two-bar holds to count through.'),
      rhythm('boom', 2, 96, 'boomchick', 'Boom-chick with bass runs', 'Bass walks between G, C and D.'),
    ],
  },
  {
    id: 'shady', title: 'Shady Grove', genre: 'bluegrass', credit: 'Traditional (Appalachian)', key: 'E', minor: true, meter: 4, strum: 'boomchick',
    sheet: `{Chorus}
[Em]Shady Grove, my [D]little [Em]love, [Em]
[Em]Shady Grove, I [D]say, [D]
[Em]Shady Grove, my [D]little [Em]love, [Em]
[Em]I'm bound to [D]go a[Em]way. [Em]
{Verse}
[Em]Cheeks as red as a [D]blooming [Em]rose [Em]
[Em]And eyes of the [D]prettiest [D]brown,
[Em]She's the darling [D]of my [Em]heart, [Em]
[Em]Sweetest little [D]girl in [Em]town. [Em]`,
    parts: [
      words(2, 100, 'Em and D: a modal mountain tune.'),
      rhythm('cross', 3, 96, 'cross', 'Crosspicking', 'Rolls on Em and D, the open strings ringing.'),
    ],
  },
  {
    id: 'cripple', title: 'Cripple Creek', genre: 'bluegrass', credit: 'Traditional fiddle tune (Frank Maloy setting, Devil\'s Box 1988)', key: 'A', meter: 2,
    abc: `M:2/4
L:1/8
K:A
e/f/ |: "A"a/g/a/e/ f/e/c/A/ | "D"d/e/f/d/ ee/f/ | "A"a/g/a/e/ f/a/e/d/ | "E"c/A/B/c/ "A"Ae/f/ |
"A"a/g/a/e/ f/e/c/A/ | "D"d/e/f/d/ e/f/e/d/ | "A"c/B/A/c/ B/A/F/D/ |1 "E"(E/F/)A/B/ "A"A e/f/ :|2 "E"(E/F/)A/B/ "A"A A/B/ ||
|: "A"c/B/c/A/ B/A/F/A/ | c/A/c/A/ EA/B/ | c/B/c/A/ B/A/F/D/ | "E"(E/F/)A/B/ "A"AA/B/ |
"A"c/B/c/A/ B/A/F/A/ | c/A/c/A/ EA/B/ | c/B/c/A/ B/A/F/D/ | "E"(E/F/)A/B/ "A"A2 :|`,
    parts: [
      melody(2, 64, 'A fiddle tune in A: the low part is "goin\' up Cripple Creek".'),
      rhythm('boom', 1, 90, 'boomchick', 'Boom-chick backing', 'A, D and E backing for the tune.'),
    ],
  },
  {
    id: 'angeline', title: 'Angeline the Baker', genre: 'bluegrass', credit: 'Traditional (Kuntz, Ragged but Right); after Stephen Foster, 1850', key: 'D', meter: 2,
    abc: `M:2/4
L:1/8
K:D
(3B/d/B/ |: "D"AB d>A | "G"B d d(3B/d/B/ | "D"AB d/B/A | "G"B2 B(3B/d/B/ |
"D"AB d>e | fe d/c/d/e/ | "A"fe (3d/e/d/B | "D"A>B A2 :|
|: "D"a g f/g/e | f/g/f/e/ df | af (3e/f/e/d | "G"B>d Ba |
"D"a g f/g/e | f/g/f/e/ d/c/d/e/ | "A"f e (3d/e/d/B | "D"A4 :|`,
    parts: [
      melody(2, 70, 'A gentle fiddle tune in D with a few triplets.'),
      rhythm('boom', 1, 90, 'boomchick', 'Boom-chick backing', 'D, G and A backing.'),
    ],
  },
  {
    id: 'joeclark', title: 'Old Joe Clark', genre: 'bluegrass', credit: 'Traditional fiddle tune (MOTley Morris setting)', key: 'A', meter: 4,
    abc: `M:4/4
L:1/8
K:A mixolydian
|: "A"efgf ed c2 | efgf e2 e2 | efgf ed c2 | "G"AcBG "A"AA A2 :|
|: "A"A2 A2 ed c2 | AA/A/GA "E"E2 E2 | "A"A2 A2 ed c2 | "G"AcBG "A"AA A2 :|`,
    parts: [
      melody(3, 84, 'A Mixolydian (A major with a G natural) and a flat-seven chord.'),
      rhythm('boom', 2, 100, 'carter', 'Boom-chicka backing', 'A, E and G backing.'),
    ],
  },
  {
    id: 'soldier', title: "Soldier's Joy", genre: 'bluegrass', credit: 'Traditional fiddle tune (Dottes session setting)', key: 'D', meter: 4,
    abc: `M:4/4
L:1/8
K:Dmaj
FG |: "D"AFDF AFDF | A2 d2 "G"d2 cB | "D"AFDF AFDF | "E7"G2E2 "A7"E2 FG |
"D"AFDF AFDF | A2 d2 "G"d2 e2 | "D"fafd "A7"egec | "D"d2 d2 d2 FG :|
|: "D"f2 f2 fagf | "A7"e2 e2 egfe | "D"f2 f2 fagf | "E7"edcB "A"A2 de |
"D"f2 f2 fagf | "A7"e2 e2 egfe | "D"fafd "A7"egec | "D"d2 d2 d2 de :|`,
    parts: [
      melody(3, 88, 'Arpeggios across the D chord and a fast B part.'),
      rhythm('boom', 2, 100, 'carter', 'Boom-chicka backing', 'D, G, A7 and E7 backing.'),
    ],
  },
  {
    id: 'turkey', title: 'Turkey in the Straw', genre: 'bluegrass', credit: 'Traditional (O\'Neill\'s Music of Ireland, 1903)', key: 'G', meter: 4,
    abc: `M:4/4
L:1/8
K:G
BA |: "G"GE2F EDB,C | DEDB, DEGA | BABc dBGA | "D"BA2G AcBA |
"G"GE2F EDB,C | DEDB, DEGA | Bd2e dBGA | BG"D"AF "G"G2 BA :|
|: "G"Bd2e dBGA | Bdde dcBA | Bdef gfed | "C"BA(3Bcd e2ef |
"G"gfge dged | "C"BdAG E2GA | "G"BdAG "D"EDB,D | "G"EG2A G2 GA :|`,
    parts: [
      melody(3, 84, 'A minstrel-era fiddle tune with a triplet run.'),
      rhythm('boom', 2, 100, 'boomchick', 'Boom-chick backing', 'G, C and D with bass walks.'),
    ],
  },
  {
    id: 'arkansas', title: 'Arkansas Traveler', genre: 'bluegrass', credit: 'Traditional fiddle tune (printed 1847)', key: 'D', meter: 2,
    abc: `M:2/4
L:1/8
K:D
|: "D"(D/E/)F/D/ B,B,/D/ | A,A,/B,/ DD | "A"EE "D"FF | D/E/F/D/ B,D | (D/E/)F/D/ B,(B,/D/) | A,A,/B,/ DA | "A"(d/c/)(d/A/) (B/d/)(A/G/) | "D"(F/D/)(E/F/) D2 :|
|: "D"(a/g/)f/a/ (g/f/)e/g/ | (f/e/)d/f/ "A"(e/c/)A | "D"d/d/d "A"e/e/e | "D"(f/e/)d/f/ "A"e2 | "D"(a/g/)f/a/ (g/f/)e/g/ | (f/e/)d/f/ "A"(e/c/)A | "D"(d/c/)d/A/ (B/d/)A/G/ | (F/D/)E/F/ D2 :|`,
    parts: [
      melody(4, 92, 'Low bass-string runs, then a high part up to the 5th fret: fast and even.'),
      rhythm('boom', 2, 110, 'boomchick', 'Boom-chick backing', 'D and A backing at a fast tempo.'),
    ],
  },

  // ───────────── reggae ─────────────
  {
    id: 'firstskank', title: 'First Skank', genre: 'reggae', credit: 'Original for KGuitar', key: 'A', minor: true, meter: 4,
    chart: 'Am | D | Am | D | Am | D | Am | D',
    parts: [
      rhythm('chops', 1, 72, 'onedrop', 'One drop chops', 'Just two chords. Chop on 2 and 4 and let go right away.'),
      rhythm('rockers', 2, 80, 'rockers', 'Skank on every "and"', 'Same chords, chops on every off-beat.'),
    ],
  },
  {
    id: 'sunshine', title: 'Sunshine Skank', genre: 'reggae', credit: 'Original for KGuitar', key: 'C', meter: 4,
    chart: 'C | F | G | F | C | F | G | C',
    parts: [
      rhythm('chops', 1, 76, 'onedrop', 'One drop chops', 'C, F and G as small shapes up the neck.'),
      rhythm('rockers', 2, 84, 'rockers', 'Skank on every "and"', 'Keep the chops short and even.'),
    ],
  },
  {
    id: 'michael', title: 'Michael, Row the Boat Ashore', genre: 'reggae', credit: 'Traditional spiritual (printed 1867), reggae style', key: 'C', meter: 4, strum: 'onedrop',
    sheet: `{Chorus}
[C]Michael, row the [C]boat ashore, [F]Halle[C]lujah!
[C]Michael, row the [G7]boat ashore, [C 2]Halle[G7 2]lu[C]jah!
{Verse}
[C]Sister, help to [C]trim the sail, [F]Halle[C]lujah!
[C]Sister, help to [G7]trim the sail, [C 2]Halle[G7 2]lu[C]jah!`,
    abc: `M:4/4
L:1/4
K:C
"C"C E G E | G A G2 | "F"E G A2 | "C"G4 | E G G E | "G7"F E D2 | "C"C D "G7"E D | "C"C4 |]`,
    parts: [
      words(1, 72, 'C, F and G7 with a one drop strum: chops on 2 and 4.'),
      melody(2, 80, 'A singing melody on the A, D and G strings.'),
      rhythm('chops', 2, 76, 'onedrop', 'One drop chops', 'The chords as reggae chops.'),
    ],
  },
  {
    id: 'saints', title: 'When the Saints Go Marching In', genre: 'reggae', credit: 'Traditional, reggae style', key: 'C', meter: 4, strum: 'rockers',
    sheet: `{Verse}
[C]Oh when the [C]saints, [C]oh when the [C]saints,
[C]Oh when the saints go [C]marching [C]in, [G7]
[C]Oh Lord, I [C]want to [C7]be in that [F]number,
[C]When the [C]saints go [G7]marching [C]in.`,
    abc: `M:4/4
L:1/4
K:C
"C"z C E F | G4 | z C E F | G4 | z C E F | G2 E2 | C2 E2 | "G7"D4 |
"C"z E E D | C3 C | "C7"E2 G2 | "F"G2 F2 | "C"F2 E F | G2 E2 | "G7"C2 D2 | "C"C4 |]`,
    parts: [
      words(1, 84, 'C, F, G7 and C7 with a rockers skank on every "and".'),
      melody(2, 92, 'A five-note melody, mostly on the A and D strings.'),
      rhythm('rockers', 3, 88, 'rockers', 'Rockers skank', 'Off-beat chops through all the changes.'),
    ],
  },
  {
    id: 'swinglow', title: 'Swing Low, Sweet Chariot', genre: 'reggae', credit: 'Traditional spiritual, reggae style', key: 'G', meter: 4, strum: 'onedrop',
    sheet: `{Chorus}
[G]Swing low, [C]sweet [G]chariot, [G]
[G]Coming for to [G]carry me [D]home; [D]
[G]Swing low, [C]sweet [G]chariot, [G]
[G]Coming for to [D]carry me [G]home. [G]
{Verse}
[G]I looked over [C]Jordan, and [G]what did I [G]see,
[G]Coming for to [G]carry me [D]home? [D]
[G]A band of [C]angels [G]coming after [G]me,
[G]Coming for to [D]carry me [G]home. [G]`,
    parts: [
      words(2, 72, 'G, C and D in a slow one drop.'),
      rhythm('double', 3, 72, 'double', 'Double chops', 'Two quick chops on 2 and 4.'),
    ],
  },
  {
    id: 'linstead', title: 'Linstead Market', genre: 'reggae', credit: 'Traditional Jamaican mento', key: 'C', meter: 4, strum: 'rockers',
    sheet: `{Verse}
[C]Carry me ackee go a [F]Linstead Market, [G7]not a quattie wut' [C]sell;
[C]Carry me ackee go a [F]Linstead Market, [G7]not a quattie wut' [C]sell.
{Chorus}
[C]Lawd, wat a [F]night, not a [C]bite, [G7]wat a Satiday [C]night!
[C]Lawd, wat a [F]night, not a [C]bite, [G7]wat a Satiday [C]night!`,
    parts: [
      words(2, 96, 'C, F and G7: the mento roots of reggae.'),
      rhythm('rockers', 2, 96, 'rockers', 'Skank on every "and"', 'Light, bouncy chops.'),
    ],
  },
  {
    id: 'rockers', title: 'Rockers Riddim', genre: 'reggae', credit: 'Original for KGuitar', key: 'A', minor: true, meter: 4,
    abc: `M:4/4
L:1/8
K:Am
|: "Am"A,2 z A, E2 D C | "G"B,2 z G, D2 C B, | "F"A,2 z F, C2 B, A, | "G"G,2 z G, B,2 D2 :|
|: "Am"A,2 z A, E2 D C | "G"B,2 z G, D2 C B, | "F"A,2 z F, C2 B, A, | "G"G,2 B,2 D2 "Am"A,2 :|`,
    parts: [
      rhythm('rockers', 2, 80, 'rockers', 'Rockers skank', 'Am, G and F as chops on every "and".'),
      melody(3, 76, 'The bass line played on the low strings, with the rests that make it bounce.'),
    ],
  },
  {
    id: 'roots', title: 'Roots Melody', genre: 'reggae', credit: 'Original for KGuitar', key: 'A', minor: true, meter: 4,
    abc: `M:4/4
L:1/8
K:Am
|: "Am"z2 e2 g2 e d | c2 A2 z4 | "Dm"z2 d2 f2 e d | A6 z2 | "Am"z2 e2 g2 a g | e2 d c A2 G2 | "Em"z2 B2 d2 B G | "Am"A8 :|`,
    parts: [
      rhythm('chops', 2, 72, 'onedrop', 'One drop chops', 'Am, Dm and Em chops with space in between.'),
      melody(3, 72, 'A minor pentatonic lead with rests: play less, leave space.'),
      { id: 'octaves', kind: 'octaves', level: 4, label: 'Octave lead', learn: 'The same lead in octaves, muting the string in between: the classic reggae lead sound.', bpm: 72 },
    ],
  },
  {
    id: 'ska', title: 'Ska Upstrokes', genre: 'reggae', credit: 'Original for KGuitar', key: 'G', meter: 4,
    chart: 'G | Em | C | D | G | Em | C D | G',
    parts: [
      rhythm('ska', 3, 150, 'ska', 'Ska upstrokes', 'Fast off-beat upstrokes through four chords.'),
    ],
  },
  {
    id: 'steppers', title: 'Steppers', genre: 'reggae', credit: 'Original for KGuitar', key: 'E', minor: true, meter: 4,
    chart: 'Em | Em | Am | B7 | Em | Em | Am B7 | Em',
    parts: [
      rhythm('double', 3, 76, 'double', 'Double chops', 'Two quick chops on 2 and 4 over a minor riddim.'),
      rhythm('rockers', 2, 76, 'rockers', 'Skank on every "and"', 'The same riddim with simple off-beat chops.'),
    ],
  },
]

// ───────────── building the songs ─────────────

interface ChordBeat { name: string; beats: number; lyric?: string; section?: string }

/** Chords over words in the songbook format: [G] = one bar, [G 2] = two beats; {Section} lines. */
export function parseSheet(text: string, meter: number): ChordBeat[] {
  const out: ChordBeat[] = []
  let section: string | undefined
  for (const line of text.split(/\r?\n/)) {
    const sec = /^\s*\{(.+)\}\s*$/.exec(line)
    if (sec) { section = sec[1].trim(); continue }
    const re = /\[([^\]\s]+)(?:\s+(\d+(?:\.\d+)?))?\]([^[]*)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(line))) {
      const lyric = m[3].trim()
      out.push({ name: m[1], beats: m[2] ? Number(m[2]) : meter, ...(lyric ? { lyric } : {}), ...(section ? { section } : {}) })
      section = undefined
    }
  }
  return out
}

/** "D | G | A D" → chords with beats (two chords in a bar share it). */
export function parseChart(chart: string, meter: number): ChordBeat[] {
  return chart.split('|').flatMap(bar => {
    const names = bar.trim().split(/\s+/).filter(Boolean)
    return names.map(name => ({ name, beats: meter / names.length }))
  })
}

/** The chords of an ABC tune, from its chord names, with how long each lasts (pickup left out). */
function abcChords(abc: string): { chords: ChordBeat[]; meter: number } {
  const t = parseAbc(abc)
  const out: ChordBeat[] = []
  let cur: string | null = null
  let skip = t.bars.length && t.bars[0].reduce((a, n) => a + n.dur, 0) < t.meter - 1e-6 ? 1 : 0
  for (const bar of t.bars) {
    if (skip) { skip--; for (const n of bar) if (n.chord) cur = n.chord; continue }
    for (const n of bar) {
      if (n.chord && n.chord !== cur) { cur = n.chord; out.push({ name: cur, beats: 0 }) }
      if (!out.length && cur) out.push({ name: cur, beats: 0 })
      if (out.length) out[out.length - 1].beats += n.dur
    }
  }
  return { chords: out.map(c => ({ ...c, beats: Math.round(c.beats * 1000) / 1000 })), meter: t.meter }
}

function voicing(name: string, inst: Instrument): Voicing | undefined {
  const { root, suffix } = parseSymbol(name)
  return chordShapes(root, suffix, inst)[0] ?? generateShapes(root, suffix, inst.midis, 1)[0] ?? generateShapes(root, 'major', inst.midis, 1)[0]
}

/** Words & chords: one step per chord (split at bar lines), the shape to strum, the words underneath. */
function sheetSong(s: SongbookSong, inst: Instrument): Song {
  const chords = parseSheet(s.sheet ?? '', s.meter)
  const bars: SongBar[] = []
  let bar: SongStep[] = []
  let used = 0
  const close = () => { if (bar.length) bars.push({ steps: bar }); bar = []; used = 0 }
  for (const c of chords) {
    let left = c.beats
    let first = true
    while (left > 1e-6) {
      const take = Math.min(left, s.meter - used)
      bar.push({ dur: take, chord: c.name, notes: shapeNotes(c.name, inst, 0), ...(first && c.lyric ? { lyric: c.lyric.length > 40 ? c.lyric.slice(0, 38) + '…' : c.lyric } : {}), ...(first && c.section ? { section: c.section } : {}) })
      first = false
      left -= take
      used += take
      if (used >= s.meter - 1e-6) close()
    }
  }
  close()
  return { title: s.title, tempo: 90, meter: s.meter, strum: s.strum, tracks: [{ name: 'Chords', tuning: inst.midis, capo: 0, bars, program: s.genre === 'reggae' ? 27 : 25 }] }
}

/** Shift a written melody by octaves so it fits the instrument (guitar: the usual octave below written). */
function octaveFit(midis: number[], tuning: number[]): number {
  const low = Math.min(...tuning), high = Math.max(...tuning) + 12
  let best = -12, bestOut = Infinity
  for (const shift of [-12, -24, 0, 12]) {
    const out = midis.reduce((a, m) => a + (m + shift < low ? 3 : m + shift > high ? 1 : 0), 0)
    if (out < bestOut) { bestOut = out; best = shift }
  }
  return best
}

/** Melody tab from ABC: rhythm from the notation, first-position fingering, chord names from the tune. */
function melodySong(s: SongbookSong, inst: Instrument, octaves = false): Song {
  const t = parseAbc(s.abc ?? '')
  const all = t.bars.flat().map(n => n.midi).filter((m): m is number => m !== null)
  const tuning = inst.midis
  // octave lead: the low note on the bottom four strings, the octave two strings up
  const low = octaves ? tuning.slice(0, Math.max(2, tuning.length - 2)) : tuning
  const shift = octaves ? octaveFit(all.map(m => m - 12), low) - 12 : octaveFit(all, tuning)
  const placed = fingerMelody(t.bars.flat().map(n => (n.midi === null ? null : n.midi + shift)), low, octaves ? { maxFret: 12, minFret: 2 } : {})
  let k = 0
  const bars: SongBar[] = t.bars.map(bar => ({
    steps: bar.map(n => {
      const p = placed[k++]
      const notes: SongNote[] = []
      if (p) {
        notes.push({ string: p.string, fret: p.fret, midi: tuning[p.string] + p.fret })
        if (octaves) {
          const s2 = p.string + 2
          const f2 = tuning[p.string] + p.fret + 12 - tuning[s2]
          if (s2 < tuning.length && f2 >= 0) notes.push({ string: s2, fret: f2, midi: tuning[s2] + f2 })
        }
      }
      return { notes, dur: Math.round(n.dur * 1000) / 1000, ...(n.chord ? { chord: n.chord } : {}) }
    }),
  }))
  return { title: s.title, tempo: t.tempo ?? 90, meter: t.meter, tracks: [{ name: octaves ? 'Octave lead' : 'Melody', tuning, capo: 0, bars, program: s.genre === 'reggae' ? 27 : 25 }] }
}

/** The song's chords with how long each lasts: from the words, the chart, or the tune. */
export function songChords(s: SongbookSong): ChordBeat[] {
  if (s.sheet) return parseSheet(s.sheet, s.meter)
  if (s.chart) return parseChart(s.chart, s.meter)
  if (s.abc) return abcChords(s.abc).chords
  return []
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10]
function rhythmSong(s: SongbookSong, part: SongbookPart, inst: Instrument): Song | null {
  // a chord held over several bars is one chord (so the bass can alternate and walk at the end)
  const merged = songChords(s).reduce<ChordBeat[]>((a, c) => {
    const last = a[a.length - 1]
    if (last && last.name === c.name) last.beats += c.beats
    else a.push({ name: c.name, beats: c.beats })
    return a
  }, [])
  const chords: PickChord[] = merged
    .map(c => ({ name: c.name, root: parseSymbol(c.name).root, voicing: voicing(c.name, inst)!, beats: c.beats }))
    .filter(c => !!c.voicing)
  if (!chords.length) return null
  const tonic = pc(s.key)
  const scale = (s.minor ? MINOR : MAJOR).map(i => (tonic + i) % 12)
  const pat = pickPattern(part.pattern ?? 'boomchick')
  // short charts go round twice
  const total = chords.reduce((a, c) => a + c.beats, 0)
  const song = pickingSong(chords, pat.id, inst.midis, { bpm: part.bpm, times: total <= s.meter * 8 ? 2 : 1, meter: s.meter, scale, title: s.title })
  return song
}

/** Build one part of a songbook song for this instrument. */
export function songbookSong(songId: string, partId: string, inst: Instrument): Song | null {
  const s = SONGBOOK.find(x => x.id === songId)
  const part = s?.parts.find(p => p.id === partId)
  if (!s || !part) return null
  const song = part.kind === 'words' ? sheetSong(s, inst)
    : part.kind === 'melody' ? melodySong(s, inst)
      : part.kind === 'octaves' ? melodySong(s, inst, inst.midis.length >= 6)
        : rhythmSong(s, part, inst)
  if (!song) return null
  song.tempo = part.bpm
  song.title = `${s.title} (${part.label.toLowerCase()})`
  song.artist = s.credit
  if (part.kind === 'words' && s.strum) song.strum = s.strum
  song.backing = backingFor(s, part)
  return song
}

/** Drums and bass for "play with the band", in the song's style. */
export function backingFor(s: SongbookSong, part: SongbookPart): { groove: string; bass: string } {
  if (s.genre === 'reggae') {
    const p = part.pattern ?? s.strum ?? ''
    return { groove: p === 'rockers' || p === 'ska' ? 'rockers' : p === 'double' ? 'steppers' : 'reggae', bass: 'reggae' }
  }
  if (s.genre === 'bluegrass') return { groove: 'train', bass: 'country' }
  return { groove: 'halftime', bass: 'country' }
}

export const songbookId = (songId: string, partId: string, inst: Instrument) => `sb:${songId}:${partId}:${inst.id}:${inst.tuning.id}`

/** A songbook part as a song you can open (saved under a fixed id, so progress is kept). */
export function songbookDoc(songId: string, partId: string, inst: Instrument): SongDoc | null {
  const s = SONGBOOK.find(x => x.id === songId)
  const song = songbookSong(songId, partId, inst)
  if (!s || !song) return null
  return {
    id: songbookId(songId, partId, inst), title: song.title, artist: s.credit, source: 'songbook', inst: inst.id, song,
    key: { root: s.key, minor: !!s.minor }, updated: Date.now(),
  }
}

/** Songs with a part at this level (or any level), in this genre (or all). */
export function songbookList(genre: Genre | 'all', level: Level | 0): SongbookSong[] {
  return SONGBOOK.filter(s => (genre === 'all' || s.genre === genre) && (!level || s.parts.some(p => p.level === level)))
}

/** The easiest part at or under this level, for plans and suggestions. */
export function partFor(s: SongbookSong, level: Level): SongbookPart {
  const fits = s.parts.filter(p => p.level <= level).sort((a, b) => b.level - a.level)
  return fits[0] ?? [...s.parts].sort((a, b) => a.level - b.level)[0]
}
