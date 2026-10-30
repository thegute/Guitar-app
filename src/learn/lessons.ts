// Theory lessons. The chapter outline follows Offtonic Theory (https://www.offtonic.com/theory/) so you can read the
// full chapters there; the explanations here are written for this app, aimed at guitar and ukulele players,
// with examples you can hear and see on the neck. Plus guitar-specific chapters at the end.

export type Block =
  | { p: string }
  | { list: string[] }
  | { tip: string }
  | { play: { label: string; seq?: number[]; chord?: number[]; gap?: number } }
  | { prog: { label: string; chords: number[][]; gap?: number } }
  | { neck: { root: string; ivs: number[]; labels?: 'int' | 'note'; to?: number } }
  | { circle: { tonic: string; minor?: boolean } }
  | { rhythm: { label: string; beats: number[]; bpm?: number } }
  | { practice: { label: string; quiz?: string; tool?: 'ear' | 'caged' | 'changes' | 'rhythm' | 'circle' | 'jam' | 'play' | 'practice' } }

export interface Lesson {
  id: string
  chapter: string
  title: string
  /** the matching Offtonic chapter, if any */
  offtonic?: string
  minutes: number
  blocks: Block[]
}

const O = (path: string) => `https://www.offtonic.com/theory/book/${path}`
// MIDI helpers: C4 = 60. Guitar sounds an octave lower than written, so examples sit around C3–C5.
const C3 = 48, A3 = 57, C4 = 60, E3 = 52, G3 = 55
const scale = (root: number, ivs: number[]) => ivs.map(i => root + i)
const MAJOR = [0, 2, 4, 5, 7, 9, 11, 12]
const NAT_MINOR = [0, 2, 3, 5, 7, 8, 10, 12]

export const CHAPTERS: { id: string; title: string; part: string }[] = [
  { id: 'start', title: 'Start here', part: 'Preface' },
  { id: 'basics', title: 'The basics', part: 'Part I · Preliminaries' },
  { id: 'rhythm', title: 'Rhythm', part: 'Part I · Preliminaries' },
  { id: 'notation', title: 'Reading the signs', part: 'Part I · Preliminaries' },
  { id: 'intervals', title: 'Intervals and scale degrees', part: 'Part II · Building blocks' },
  { id: 'ear', title: 'Ear training', part: 'Part II · Building blocks' },
  { id: 'chords', title: 'Chords', part: 'Part II · Building blocks' },
  { id: 'modes', title: 'Modes and scales', part: 'Part II · Building blocks' },
  { id: 'compose', title: 'Writing music', part: 'Part II · Building blocks' },
  { id: 'harmony', title: 'How harmony works', part: 'Part III · Functional harmony' },
  { id: 'guitar', title: 'Guitar mastery', part: 'Extra · For your instrument' },
]

export const LESSONS: Lesson[] = [
  // ---------------- Preface ----------------
  { id: 'intro', chapter: 'start', title: 'How to use these lessons', offtonic: O('intro.html'), minutes: 3, blocks: [
    { p: 'Music theory is a set of names for things you can already hear. It does not make you play better on its own, but it makes everything faster: learning songs, finding notes, writing parts, soloing over changes and talking to other musicians.' },
    { p: 'Every lesson here is short, ends with something to try, and links to the matching chapter of **Offtonic Theory**, a free online textbook, if you want to go deeper.' },
    { list: ['Read a lesson (5 minutes), then play the examples on your instrument.', 'Do the matching quiz in Practice until it is easy.', 'On days away from your guitar, the lessons and tap quizzes still count toward your streak.'] },
    { tip: 'Theory sticks when you hear it and play it. Tap every ▶ button and find the notes on your neck.' },
  ] },
  { id: 'rules', chapter: 'start', title: 'The "rules" of music', offtonic: O('0.html'), minutes: 3, blocks: [
    { p: 'You will hear people say music has rules: avoid parallel fifths, resolve the 7th, don\'t do this, always do that. Those rules are really **descriptions of a style**: what Bach, or the Beatles, or bluegrass players usually did.' },
    { p: 'Learning the rules of a style lets you sound like that style on purpose, and break them on purpose. A blues player "breaks" classical rules in every bar; that is the sound of the blues.' },
    { tip: 'When something in a lesson sounds like a rule, ask: in which kind of music? Then listen for it in songs you like.' },
  ] },

  // ---------------- 1. The basics ----------------
  { id: 'reading', chapter: 'basics', title: 'Sheet music and tab', offtonic: O('1-1.html'), minutes: 4, blocks: [
    { p: 'Standard notation shows **pitch** (how high, by where a note sits on the five-line staff) and **rhythm** (how long, by the note\'s shape). Tab shows **where to put your fingers**: one line per string, numbers for frets.' },
    { p: 'Tab is fast to read but usually leaves out rhythm, which is why this app plays tabs back to you (Hear it) and why Guitar Pro files, which include rhythm, are so useful.' },
    { list: ['Top line of a tab = the highest-sounding string (high e on guitar, A on ukulele).', 'A number = the fret. 0 = open string. x = muted.', 'Numbers stacked vertically are played together (a chord).', 'Letters between numbers are techniques: h hammer-on, p pull-off, / slide up, \\ slide down, b bend, ~ vibrato.'] },
    { practice: { label: 'Play along with a tab', tool: 'play' } },
  ] },
  { id: 'alphabet', chapter: 'basics', title: 'The musical alphabet on the fretboard', offtonic: O('1-2.html'), minutes: 5, blocks: [
    { p: 'Music uses seven letter names, **A B C D E F G**, then starts again. Between most neighbours there is an extra note, a sharp (#, one higher) or flat (b, one lower): A#/Bb, C#/Db, D#/Eb, F#/Gb, G#/Ab.' },
    { p: 'Two pairs have **no note between them: B–C and E–F**. Everything else is two frets apart. That gives 12 different notes in all, and each fret on your instrument moves you one of them (a **half step**).' },
    { neck: { root: 'C', ivs: [0, 2, 4, 5, 7, 9, 11], labels: 'note', to: 12 } },
    { play: { label: 'The 12 notes, fret by fret on the A string', seq: Array.from({ length: 13 }, (_, i) => 45 + i), gap: 0.28 } },
    { tip: 'Learn one string at a time. Start with the low E and A strings: they hold the roots of almost every barre chord.' },
    { practice: { label: 'Natural notes on the low strings', quiz: 'fb-nat-0' } },
  ] },
  { id: 'pitch', chapter: 'basics', title: 'Octaves and pitch names', offtonic: O('1-3.html'), minutes: 4, blocks: [
    { p: 'An **octave** is the same note name, twice as high (double the frequency). On a string it is 12 frets up. Notes are numbered by octave: middle C is **C4**, the next C up is C5.' },
    { p: 'Guitar music is written an octave higher than it sounds so it fits on the staff. Your open low E is **E2**, the open high e is **E4**. On a re-entrant ukulele the G string is G4, higher than the C string next to it.' },
    { play: { label: 'E2 → E3 → E4: three octaves of E', seq: [40, 52, 64], gap: 0.6 } },
    { practice: { label: 'Octave shapes', quiz: 'fb-octave' } },
  ] },
  { id: 'durations', chapter: 'basics', title: 'How long notes last', offtonic: O('1-4.html'), minutes: 4, blocks: [
    { p: 'Rhythm is built by halving. A **whole note** lasts four beats, a **half note** two, a **quarter note** one, an **eighth note** half a beat, a **sixteenth** a quarter of a beat.' },
    { p: 'A **dot** adds half again (a dotted half = 3 beats). A **tie** joins two notes into one longer sound. **Rests** are silences with the same lengths.' },
    { rhythm: { label: 'Quarter, quarter, eighth-eighth, half', beats: [1, 1, 0.5, 0.5, 2] } },
    { rhythm: { label: 'Dotted quarter + eighth (the "Charleston" feel)', beats: [1.5, 0.5, 1.5, 0.5] } },
    { practice: { label: 'Rhythm trainer', tool: 'rhythm' } },
  ] },
  { id: 'counting', chapter: 'basics', title: 'Counting rhythms out loud', offtonic: O('1-5.html'), minutes: 4, blocks: [
    { p: 'Players count beats as **1 2 3 4**, eighth notes as **1 & 2 & 3 & 4 &**, and sixteenths as **1 e & a 2 e & a**. Saying the count while you play locks your rhythm in.' },
    { list: ['Down-strum on the numbers, up-strum on the "&"s: the arm keeps moving even when you don\'t hit the strings.', 'Start slow with the metronome. Speed comes from playing it right, slowly, many times.'] },
    { rhythm: { label: '1 & 2 & 3 & 4 &', beats: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] } },
    { rhythm: { label: 'D – DU – UDU (the pop strum)', beats: [1, 0.5, 1, 0.5, 0.5, 0.5] } },
  ] },
  { id: 'singing', chapter: 'basics', title: 'Sing what you play', offtonic: O('1-6.html'), minutes: 3, blocks: [
    { p: 'Singing (even badly, even humming) connects your ear to your hands. If you can sing a phrase you can find it on the neck; if you can\'t, you are guessing.' },
    { list: ['Hum each note of a scale as you play it.', 'Sing a short lick, then find it on the guitar.', 'In the ear trainer, sing the note back before you answer.'] },
    { practice: { label: 'Drone ear training', tool: 'ear' } },
  ] },

  // ---------------- 2. Rhythm ----------------
  { id: 'meter', chapter: 'rhythm', title: 'Meter and time signatures', offtonic: O('2-1.html'), minutes: 5, blocks: [
    { p: 'A **time signature** says how beats are grouped. The top number is how many beats per bar; the bottom is what kind of note gets the beat.' },
    { list: ['**4/4**: four quarter-note beats. Most rock, pop, blues and country.', '**3/4**: three beats, the waltz: STRONG weak weak.', '**6/8**: six eighth notes felt as two big beats (1 2 3 4 5 6). Ballads and Irish jigs.', '**2/2** (cut time): two beats per bar, used for fast songs and marches.', '**Odd meters** like 5/4 and 7/8 group beats unevenly (2+3, 2+2+3): prog rock, Balkan music.'] },
    { rhythm: { label: '3/4: ONE two three', beats: [1, 1, 1, 1, 1, 1] } },
    { rhythm: { label: '6/8: ONE-and-a TWO-and-a', beats: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5] } },
  ] },
  { id: 'tuplets', chapter: 'rhythm', title: 'Triplets, tuplets and hemiola', offtonic: O('2-2.html'), minutes: 4, blocks: [
    { p: 'A **triplet** squeezes three notes into the time of two. Count eighth-note triplets as "1-trip-let 2-trip-let". The blues shuffle is built on triplets.' },
    { rhythm: { label: 'Straight eighths, then triplets', beats: [0.5, 0.5, 0.5, 0.5, 1 / 3, 1 / 3, 1 / 3, 1 / 3, 1 / 3, 1 / 3] } },
    { p: '**Hemiola** is three-against-two: a pattern of three that crosses a pulse of two, so the beat seems to shift. It\'s all over flamenco and Latin music.' },
  ] },
  { id: 'syncopation', chapter: 'rhythm', title: 'Reading rhythms and syncopation', offtonic: O('2-3.html'), minutes: 4, blocks: [
    { p: '**Syncopation** means accenting the off-beats (the "&"s) or tying across the beat, so the music pushes against the pulse. Funk, reggae and most pop riffs are syncopated.' },
    { rhythm: { label: 'Syncopated: 1 . & . . & 4', beats: [1, 0.5, 1, 0.5, 1] } },
    { tip: 'Keep your strumming hand moving down-up in 8ths and simply miss the strings on the beats you skip. The rhythm will stay locked in.' },
  ] },
  { id: 'metric-mod', chapter: 'rhythm', title: 'Changing the pulse', offtonic: O('2-4.html'), minutes: 3, blocks: [
    { p: '**Metric modulation** keeps one note length the same while the beat changes around it: for example, a triplet becomes the new quarter note and the song suddenly feels faster without "speeding up". Half-time and double-time feels in rock are simpler cousins of the same idea.' },
    { tip: 'In Jam, try the half-time ballad drums under a progression, then switch to rock drums at the same tempo: same tempo, very different feel.' },
  ] },
  { id: 'swing', chapter: 'rhythm', title: 'Swing', offtonic: O('2-5.html'), minutes: 3, blocks: [
    { p: '**Swing** plays pairs of eighth notes long-short instead of even, roughly like the first and third note of a triplet. Blues, jazz and rockabilly swing; most rock and pop is "straight".' },
    { rhythm: { label: 'Straight eighths', beats: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] } },
    { rhythm: { label: 'Swung eighths', beats: [2 / 3, 1 / 3, 2 / 3, 1 / 3, 2 / 3, 1 / 3, 2 / 3, 1 / 3] } },
    { practice: { label: 'Jam a blues shuffle', tool: 'jam' } },
  ] },

  // ---------------- 3. Notation ----------------
  { id: 'dynamics', chapter: 'notation', title: 'Loud and soft', offtonic: O('3-1.html'), minutes: 3, blocks: [
    { p: 'Dynamics are written as Italian abbreviations: **pp** very soft, **p** soft, **mp/mf** medium, **f** loud, **ff** very loud. A crescendo (<) grows louder; a diminuendo (>) fades.' },
    { tip: 'Dynamics are the cheapest way to sound more musical. Play a verse with light picking near the neck, then dig in near the bridge for the chorus.' },
  ] },
  { id: 'roadmaps', chapter: 'notation', title: 'Repeats and song roadmaps', offtonic: O('3-2.html'), minutes: 3, blocks: [
    { p: 'Repeat signs (‖: :‖) mean play the section again. **1st and 2nd endings** change the last bar the second time. **D.C.** goes back to the start, **D.S.** to the sign (𝄋), and **To Coda** jumps to the ending (𝄌).' },
    { tip: 'Tabs online often write "x4" or "repeat chorus" instead. Use ⟲ Loop in Play to drill one part before stringing the song together.' },
  ] },
  { id: 'articulation', chapter: 'notation', title: 'Articulation and guitar techniques', offtonic: O('3-3.html'), minutes: 5, blocks: [
    { p: 'Articulations say *how* to play a note: **staccato** (short), **accent** (stronger), **legato** (smoothly connected). On guitar, articulation is technique:' },
    { list: ['**Hammer-on (h)**: pick one note, then slam a finger down for the next without picking.', '**Pull-off (p)**: flick the fretting finger off to sound a lower note.', '**Slide (/ \\)**: keep pressure and glide to a new fret.', '**Palm mute (P.M.)**: rest the side of your picking hand on the strings by the bridge for a tight chug.', '**Let ring**: hold notes down so they overlap like a harp.'] },
    { practice: { label: 'Practice tabs with techniques (Songs → Exercises)', tool: 'practice' } },
  ] },
  { id: 'ornaments', chapter: 'notation', title: 'Ornaments: bends, vibrato and grace notes', offtonic: O('3-4.html'), minutes: 4, blocks: [
    { p: 'Ornaments decorate a note. In classical music: trills, turns, grace notes. On guitar the big ones are **bends** (pushing the string to raise the pitch), **vibrato** (a repeated small bend), and **grace-note slides** into a note.' },
    { tip: 'Bend to a target pitch: play the note two frets higher first so you know where you\'re aiming, then bend up to match it. Use 2–3 fingers together for strength.' },
    { play: { label: 'Target note, then the bend that should match it', seq: [69, 67, 69], gap: 0.5 } },
  ] },
  { id: 'tempo-words', chapter: 'notation', title: 'Tempo, style and pauses', offtonic: O('3-5.html'), minutes: 3, blocks: [
    { p: 'Tempo is measured in **beats per minute** (BPM). Classical scores use words: **adagio** slow, **andante** walking, **moderato**, **allegro** fast, **presto** very fast. **Rit./rall.** slow down, **accel.** speed up, a **fermata** (𝄐) holds a note as long as you like.' },
    { practice: { label: 'Metronome & speed trainer (Tempo tab)', tool: 'jam' } },
  ] },

  // ---------------- 4. Intervals and scale degrees ----------------
  { id: 'diatonic', chapter: 'intervals', title: 'The major scale', offtonic: O('4-1.html'), minutes: 5, blocks: [
    { p: 'Play the white keys of a piano from C to C and you get the **major scale**: C D E F G A B C. Its pattern of steps is **whole, whole, half, whole, whole, whole, half** (W W H W W W H). On guitar a whole step is 2 frets, a half step is 1.' },
    { play: { label: 'C major scale', seq: scale(C3, MAJOR), gap: 0.32 } },
    { neck: { root: 'C', ivs: [0, 2, 4, 5, 7, 9, 11], labels: 'int' } },
    { p: 'Start the same pattern on any note and you get that note\'s major scale. G major needs one sharp (F#) to keep the pattern; D major needs two (F#, C#).' },
    { practice: { label: 'G major scale as a play-along tab', tool: 'play' } },
  ] },
  { id: 'intervals', chapter: 'intervals', title: 'Naming intervals', offtonic: O('4-2.html'), minutes: 6, blocks: [
    { p: 'An **interval** is the distance between two notes. Count letter names (C to E = a 3rd), then the exact size in frets decides the quality:' },
    { list: ['1 fret: minor 2nd · 2: major 2nd', '3: minor 3rd · 4: major 3rd', '5: perfect 4th · 6: tritone (augmented 4th / diminished 5th)', '7: perfect 5th · 8: minor 6th · 9: major 6th', '10: minor 7th · 11: major 7th · 12: octave'] },
    { p: 'On guitar every interval has a **shape** across two strings. A perfect 5th is the power chord: root, then one string up and two frets up. (Crossing onto the B string, shapes shift up one fret.)' },
    { play: { label: 'Root + major 3rd + perfect 5th', seq: [C3, C3 + 4, C3 + 7], gap: 0.5 } },
    { practice: { label: 'Drone ear training', tool: 'ear' } },
  ] },
  { id: 'keys', chapter: 'intervals', title: 'Keys, scale degrees and tendencies', offtonic: O('4-3.html'), minutes: 6, blocks: [
    { p: 'A **key** is a home note plus the scale built on it. Each note of the scale has a number, its **scale degree**: 1 (home) through 7. Degrees have personalities, which is what your ear really hears:' },
    { list: ['**1** home, at rest.', '**5** strong and stable, the second home.', '**3** sweet; it decides major or minor.', '**7** (the leading tone) pulls hard up to 1.', '**4** wants to fall to 3.', '**2** and **6** lean on their neighbours.'] },
    { play: { label: '7 resolving to 1 (feel the pull)', seq: [C4 - 1, C4], gap: 0.6 } },
    { p: '**Minor keys** lower the 3rd, 6th and 7th (b3, b6, b7): C D Eb F G Ab Bb. Every major key has a **relative minor** with the same notes, starting on its 6th degree (C major ↔ A minor).' },
    { play: { label: 'A natural minor', seq: scale(A3, NAT_MINOR), gap: 0.32 } },
    { p: 'A **key signature** lists the sharps or flats a key uses, so you don\'t have to write them on every note.' },
  ] },
  { id: 'circle', chapter: 'intervals', title: 'The circle of fifths', offtonic: O('4-4.html'), minutes: 6, blocks: [
    { p: 'Line up the 12 keys so each is a **perfect fifth** above the last (C G D A E B F# …) and they come back round to C. Going **clockwise adds a sharp**; counter-clockwise adds a flat.' },
    { circle: { tonic: 'C' } },
    { list: ['Neighbours share all but one note, so they sound related.', 'A key\'s **IV and V chords sit on either side of it**; its three minor chords (ii, iii, vi) sit inside them. That slice is the key\'s six main chords.', 'Moving one step counter-clockwise (V → I, like G → C) is the strongest chord move in music: the circle shows why so many progressions sound "right".', 'The inner ring shows each key\'s **relative minor**.'] },
    { practice: { label: 'Circle of fifths quizzes', quiz: 'cof-neighbours' } },
    { practice: { label: 'See it light up in Jam', tool: 'jam' } },
  ] },

  // ---------------- 5. Ear training ----------------
  { id: 'pitch-space', chapter: 'ear', title: 'What pitch is', offtonic: O('5-1.html'), minutes: 4, blocks: [
    { p: 'Sound is vibrating air. **Pitch** is how fast it vibrates: A4 vibrates 440 times per second (440 Hz). An octave up doubles that (880 Hz). The 12 notes divide each octave into equal steps, and each step is divided into 100 **cents** (that is what the tuner shows).' },
    { p: 'Notes with the same letter in different octaves share a **pitch class**. Your ear hears them as "the same note, higher", which is why the ear trainer counts any octave of the right degree as correct.' },
    { practice: { label: 'Tune up with the tuner', tool: 'play' } },
  ] },
  { id: 'interval-sounds', chapter: 'ear', title: 'The sound of each interval', offtonic: O('5-2.html'), minutes: 6, blocks: [
    { p: 'Every interval has a character. Learn them by feel:' },
    { list: ['**Perfect 5th**: open, hollow, strong (power chords).', '**Major 3rd**: bright and happy.', '**Minor 3rd**: dark, sad.', '**Perfect 4th**: open, slightly unresolved; a bugle call.', '**Major 6th**: warm, sweet.', '**Minor 6th**: bittersweet, cinematic.', '**Major 2nd**: a simple step.', '**Minor 2nd**: tense, scary (think shark music).', '**Minor 7th**: bluesy, unresolved.', '**Major 7th**: dreamy but sharp.', '**Tritone**: unstable, spooky; it wants to move.'] },
    ...[[7, 'Perfect 5th'], [4, 'Major 3rd'], [3, 'Minor 3rd'], [5, 'Perfect 4th'], [9, 'Major 6th'], [1, 'Minor 2nd'], [10, 'Minor 7th'], [11, 'Major 7th'], [6, 'Tritone']].map(([iv, name]) => ({ play: { label: String(name), seq: [C3, C3 + (iv as number)], chord: [C3, C3 + (iv as number)], gap: 0.6 } }) as Block),
  ] },
  { id: 'ear-together', chapter: 'ear', title: 'Hearing notes against a key', offtonic: O('5-3.html'), minutes: 4, blocks: [
    { p: 'Intervals help, but players who play by ear mostly hear **where a note sits in the key**: "that\'s the 5", "that\'s the b7". This is called **functional** or **relative pitch** ear training, and it\'s what the drone trainer teaches.' },
    { p: 'A drone keeps the home note sounding so every note is heard against home. Over time 3 starts to sound like "3" in any key, the way a face looks like the same person in any light.' },
    { practice: { label: 'Start ear training', tool: 'ear' } },
  ] },

  // ---------------- 6. Chords ----------------
  { id: 'harmony-intro', chapter: 'chords', title: 'Chords and harmony', offtonic: O('6-1.html'), minutes: 3, blocks: [
    { p: 'A **chord** is three or more notes sounding together. **Harmony** is how chords move from one to the next. Melody is the line you sing; harmony is the colour and motion underneath it.' },
    { play: { label: 'C major chord', chord: [C3, C3 + 4, C3 + 7, C4] } },
  ] },
  { id: 'triads', chapter: 'chords', title: 'Triads, diatonic chords and function', offtonic: O('6-2.html'), minutes: 7, blocks: [
    { p: 'The basic chord is the **triad**: a root, a 3rd and a 5th, stacked in thirds. Four kinds: **major** (R 3 5), **minor** (R b3 5), **diminished** (R b3 b5), **augmented** (R 3 #5).' },
    ...[[[0, 4, 7], 'Major'], [[0, 3, 7], 'Minor'], [[0, 3, 6], 'Diminished'], [[0, 4, 8], 'Augmented']].map(([ivs, name]) => ({ play: { label: String(name), seq: (ivs as number[]).map(i => C3 + i), chord: (ivs as number[]).map(i => C3 + i), gap: 0.35 } }) as Block),
    { p: 'Build a triad on every note of a major scale, using only notes from that scale, and you get the key\'s **diatonic chords**: **I ii iii IV V vi vii°** (uppercase = major, lowercase = minor). In C: C Dm Em F G Am Bdim.' },
    { p: 'Chords have jobs, called **function**: **tonic** (I, vi, iii) feels at home, **subdominant** (IV, ii) moves away, **dominant** (V, vii°) builds tension that wants to resolve home. Most progressions cycle home → away → tension → home.' },
    { practice: { label: 'Spell triads', quiz: 'tr-spell' } },
    { practice: { label: 'Find triads on the neck', quiz: 'tr-find-top' } },
  ] },
  { id: 'sevenths', chapter: 'chords', title: 'Seventh chords and their cousins', offtonic: O('6-3.html'), minutes: 6, blocks: [
    { p: 'Add another 3rd on top of a triad and you get a **seventh chord**. The main ones:' },
    { list: ['**maj7** (R 3 5 7): dreamy, soft.', '**7** "dominant seventh" (R 3 5 b7): bluesy, restless; it wants to resolve. The V7 chord.', '**m7** (R b3 5 b7): smooth, mellow.', '**m7b5** "half-diminished" (R b3 b5 b7): dark and searching; the ii chord in minor.', '**dim7** (R b3 b5 bb7): tense, every note a minor 3rd apart.'] },
    ...[[[0, 4, 7, 11], 'Cmaj7'], [[0, 4, 7, 10], 'C7'], [[0, 3, 7, 10], 'Cm7'], [[0, 3, 6, 10], 'Cm7b5'], [[0, 3, 6, 9], 'Cdim7']].map(([ivs, name]) => ({ play: { label: String(name), chord: (ivs as number[]).map(i => C3 + i) } }) as Block),
    { p: 'The **augmented sixth** chords of classical music (Italian, French, German) are dominant-sounding chords built on the b6 that slide out to the 5. On guitar the German sixth sounds exactly like a dominant 7 chord a half step above V.' },
    { practice: { label: 'Chord colours by ear', quiz: 'ch-ear-7' } },
  ] },
  { id: 'pop-chords', chapter: 'chords', title: 'Popular chord types and extensions', offtonic: O('6-4.html'), minutes: 7, blocks: [
    { list: ['**Power chord (5)**: just root and 5th. No 3rd, so it\'s neither major nor minor: perfect with distortion.', '**sus2 / sus4**: the 3rd replaced by the 2nd or 4th: open, unresolved, ringing.', '**add9**: a triad plus the 9th (the 2nd, an octave up): sparkly.', '**6 and m6**: triad plus the 6th: vintage, jazzy.', '**9, 11, 13**: extensions stacked above the 7th. A 13 chord usually leaves out some notes; on guitar you keep the 3rd, 7th and the colour note.'] },
    ...[[[0, 7, 12], 'C5'], [[0, 5, 7], 'Csus4'], [[0, 2, 7], 'Csus2'], [[0, 4, 7, 14], 'Cadd9'], [[0, 4, 10, 14], 'C9'], [[0, 4, 10, 21], 'C13']].map(([ivs, name]) => ({ play: { label: String(name), chord: (ivs as number[]).map(i => C3 + i) } }) as Block),
    { p: 'Altered tensions (b9, #9, #11, b13) add spice to dominant chords. The famous "Hendrix chord" is a 7#9: major 3rd and minor 3rd at once.' },
    { practice: { label: 'Try chord colours in Jam', tool: 'jam' } },
  ] },
  { id: 'jazz-chords', chapter: 'chords', title: 'Jazz harmony', offtonic: O('6-5.html'), minutes: 5, blocks: [
    { p: 'Jazz builds chords from scales. Stack thirds on each degree of the major scale and you get **Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø7**. Do the same with the **melodic minor** scale and you get its own family, including the "altered" dominant used to create maximum tension before resolving.' },
    { p: '**Symmetric scales** (whole-tone, diminished) make chords that repeat every few frets: a dim7 shape moved up 3 frets is the same chord. Handy shortcuts on guitar.' },
    { practice: { label: 'Generate a jazz progression in Jam (style: Jazz)', tool: 'jam' } },
  ] },
  { id: 'slash', chapter: 'chords', title: 'Slash chords and other colours', offtonic: O('6-6.html'), minutes: 4, blocks: [
    { p: 'A **slash chord** like C/G means a C chord with G in the bass. It can be an **inversion** (the bass is a chord tone) or a new colour (D/C, a D chord over a C bass, sounds Lydian).' },
    { p: 'Other colours: **quartal** chords stacked in 4ths (modern and open), and **clusters** of neighbouring notes. On guitar, open strings ringing against fretted notes make these easy.' },
    { play: { label: 'C → C/B → Am: a walking bass line', seq: [48, 47, 45], gap: 0.6 } },
  ] },

  // ---------------- 7. Modes and scales ----------------
  { id: 'scales-def', chapter: 'modes', title: 'What scales and modes are', offtonic: O('7-1.html'), minutes: 4, blocks: [
    { p: 'A **scale** is a set of notes in order. A **mode** is the same set of notes, but with a different note treated as home. C major and A minor share notes but feel completely different because the home note changes.' },
    { tip: 'A scale isn\'t a pattern to run up and down: it\'s the palette of notes that will sound good over a key or chord.' },
  ] },
  { id: 'principal', chapter: 'modes', title: 'Major and minor, inside out', offtonic: O('7-3.html'), minutes: 5, blocks: [
    { p: 'Split the major scale in half and you get two identical four-note groups (**tetrachords**): C D E F + G A B C, each W W H. That symmetry is why melodies sound balanced in major.' },
    { p: 'Minor has three common versions: **natural minor** (b3 b6 b7), **harmonic minor** (raises the 7th so V becomes major and pulls home), and **melodic minor** (raises the 6th and 7th going up, for smooth melodies).' },
    { play: { label: 'A harmonic minor', seq: scale(A3, [0, 2, 3, 5, 7, 8, 11, 12]), gap: 0.32 } },
  ] },
  { id: 'modes', chapter: 'modes', title: 'The seven modes', offtonic: O('7-4.html'), minutes: 8, blocks: [
    { p: 'Start the major scale on each of its seven notes and you get the **modes**. From brightest to darkest:' },
    { list: ['**Lydian** (#4): dreamy, floating. Film scores.', '**Ionian** (major): happy, settled.', '**Mixolydian** (b7): major with swagger. Classic rock, jam bands.', '**Dorian** (b3, natural 6): minor but hopeful. Funk, soul, Santana.', '**Aeolian** (natural minor): sad, epic.', '**Phrygian** (b2): dark, Spanish. Metal, flamenco.', '**Locrian** (b2, b5): unstable, rarely home.'] },
    ...[['Lydian', [0, 2, 4, 6, 7, 9, 11, 12]], ['Mixolydian', [0, 2, 4, 5, 7, 9, 10, 12]], ['Dorian', [0, 2, 3, 5, 7, 9, 10, 12]], ['Phrygian', [0, 1, 3, 5, 7, 8, 10, 12]]].map(([name, ivs]) => ({ play: { label: `${name} on C`, seq: scale(C3, ivs as number[]), gap: 0.3 } }) as Block),
    { tip: 'To hear a mode, play it over a drone or a one-chord vamp. In Jam, pick the mode and a style, and solo with the scale it suggests.' },
  ] },
  { id: 'pentatonic', chapter: 'modes', title: 'Pentatonic and blues scales', offtonic: O('7-5.html'), minutes: 6, blocks: [
    { p: 'Take the major scale and remove its two "half-step" notes (4 and 7) and you get the five-note **major pentatonic**. Its relative, the **minor pentatonic** (1 b3 4 5 b7), is the most-played scale in rock and blues.' },
    { neck: { root: 'A', ivs: [0, 3, 5, 7, 10], labels: 'int', to: 15 } },
    { p: 'Add the **b5** to minor pentatonic and you get the **blues scale**. The five box shapes of the pentatonic link up across the whole neck.' },
    { play: { label: 'A minor pentatonic', seq: scale(A3, [0, 3, 5, 7, 10, 12]), gap: 0.3 } },
    { play: { label: 'A blues scale', seq: scale(A3, [0, 3, 5, 6, 7, 10, 12]), gap: 0.3 } },
    { practice: { label: 'Play all 5 boxes as a tab (Songs → Exercises)', tool: 'practice' } },
  ] },
  { id: 'harmonic-modes', chapter: 'modes', title: 'Harmonic minor and its modes', offtonic: O('7-6.html'), minutes: 5, blocks: [
    { p: 'Harmonic minor\'s raised 7th creates a big jump (b6 to 7) that sounds exotic. Its most-used mode is **Phrygian dominant** (start harmonic minor on its 5th): the sound of flamenco, klezmer and neoclassical metal. Play it over the V chord in a minor key (E7 in A minor).' },
    { play: { label: 'E Phrygian dominant', seq: scale(E3, [0, 1, 4, 5, 7, 8, 10, 12]), gap: 0.3 } },
    { p: 'Others: the **Spanish** scale (Phrygian dominant plus a b3) and **Ukrainian Dorian** (Dorian with a #4).' },
  ] },
  { id: 'melodic-modes', chapter: 'modes', title: 'Melodic minor and its modes', offtonic: O('7-7.html'), minutes: 5, blocks: [
    { p: '**Melodic minor** (1 2 b3 4 5 6 7) is the jazz minor scale. Its modes include **Lydian dominant** (over 7#11 chords and tritone subs) and the **altered** scale (over a V7 just before it resolves, for maximum tension).' },
    { play: { label: 'C melodic minor', seq: scale(C3, [0, 2, 3, 5, 7, 9, 11, 12]), gap: 0.3 } },
    { play: { label: 'G altered (over G7 → C)', seq: scale(G3, [0, 1, 3, 4, 6, 8, 10, 12]), gap: 0.3 } },
  ] },
  { id: 'symmetric', chapter: 'modes', title: 'Symmetric scales', offtonic: O('7-8.html'), minutes: 4, blocks: [
    { p: '**Whole-tone** (all whole steps) floats with no home. **Diminished** scales alternate whole and half steps; they repeat every 3 frets, so one fingering moves in minor 3rds. **Chromatic** uses all 12 notes: great for passing notes and warm-ups.' },
    { play: { label: 'Whole-tone', seq: scale(C3, [0, 2, 4, 6, 8, 10, 12]), gap: 0.3 } },
    { play: { label: 'Half-whole diminished', seq: scale(C3, [0, 1, 3, 4, 6, 7, 9, 10, 12]), gap: 0.28 } },
  ] },
  { id: 'world', chapter: 'modes', title: 'Maqamat and other scales', offtonic: O('7-9.html'), minutes: 4, blocks: [
    { p: 'Arabic **maqamat** use notes between our 12 (quarter tones), and each maqam includes typical phrases, not just a note set. On a fretted guitar you can approximate them (Hijaz is close to Phrygian dominant) or bend into the in-between notes.' },
    { p: 'Many other scales exist: Japanese **hirajoshi** and **in** scales, the **Hungarian minor**, the **double harmonic** (Byzantine). Try them in the Scales tab.' },
  ] },
  { id: 'using-scales', chapter: 'modes', title: 'Using scales: chord-scale thinking', offtonic: O('7-11.html'), minutes: 6, blocks: [
    { p: 'Over a whole song in one key, the key\'s scale (or its pentatonic) works everywhere. To sound like you\'re **following the chords**, aim for each chord\'s tones (its arpeggio) on the strong beats and use the scale to connect them.' },
    { p: '**Chord-scale theory** picks a scale for each chord: Dorian over a ii chord, Mixolydian over V7, and outside chords get their own scale (Jam shows this for every chord). Modal music stays on one chord or vamp so the mode\'s colour comes through.' },
    { practice: { label: 'Solo over a progression in Jam', tool: 'jam' } },
  ] },

  // ---------------- 8. Composition ----------------
  { id: 'compose-layers', chapter: 'compose', title: 'Songs in layers', offtonic: O('8-4.html'), minutes: 5, blocks: [
    { p: 'Most music has three layers: **top** (melody, lead lines), **middle** (chords, rhythm guitar, pads) and **bottom** (bass and drums). Each layer has its own job; if two layers fight for the same space the song sounds cluttered.' },
    { p: 'On a single guitar you play all three by mixing bass notes, chords and melody (think Travis picking). With the Looper you can stack them: record a rhythm part, then a bass line, then solo on top.' },
    { practice: { label: 'Build a song with the Looper', tool: 'jam' } },
  ] },
  { id: 'compose-how', chapter: 'compose', title: 'How to write a song', offtonic: O('8-3.html'), minutes: 5, blocks: [
    { list: ['**Start small**: a riff, a chord loop or a melody you can hum. Record it before it disappears.', '**Develop it**: repeat it, vary it (change one chord, move the melody up), contrast it with a new section.', '**Finish it**: a verse–chorus song is enough. Done is better than perfect.', '**Study songs you love**: what\'s the progression? Where does the melody sit? Copy the structure, not the notes.'] },
    { tip: 'Use Jam: roll progressions until one grabs you, lock it, record yourself on the Looper, then hum melodies over it.' },
  ] },

  // ---------------- 9. Harmony ----------------
  { id: 'nht', chapter: 'harmony', title: 'Notes outside the chord', offtonic: O('9-2.html'), minutes: 5, blocks: [
    { p: 'Melodies don\'t only use chord tones. The in-between notes have names:' },
    { list: ['**Passing tone**: steps between two chord tones.', '**Neighbour tone**: steps away and back.', '**Suspension**: a note held from the last chord that then resolves down (that\'s what a sus4 chord is).', '**Appoggiatura**: a leap to a non-chord tone that resolves by step: very emotional.', '**Pedal point**: one note held while the chords change over it (open strings are perfect for this).'] },
    { prog: { label: 'Suspension: Csus4 resolving to C', chords: [[48, 53, 55, 60], [48, 52, 55, 60]], gap: 1 } },
  ] },
  { id: 'inversions', chapter: 'harmony', title: 'Inversions and bass lines', offtonic: O('9-3.html'), minutes: 5, blocks: [
    { p: 'A chord is in **root position** when its root is the lowest note, **1st inversion** when the 3rd is lowest, **2nd inversion** when the 5th is lowest. Inversions let bass lines move smoothly by step instead of jumping.' },
    { p: 'Classical players write inversions with **figured bass** numbers (6, 6/4); guitarists write slash chords (C/E, C/G). Same idea.' },
    { practice: { label: 'Name the inversion', quiz: 'tr-inv' } },
  ] },
  { id: 'roman', chapter: 'harmony', title: 'Roman numerals', offtonic: O('9-4.html'), minutes: 5, blocks: [
    { p: 'Roman numerals name chords by their place in the key: I–V–vi–IV is the same progression in any key (C–G–Am–F in C, G–D–Em–C in G). Learn songs in numerals and you can play them in any key instantly.' },
    { list: ['Uppercase = major, lowercase = minor, ° = diminished.', 'A superscript 7 adds the seventh: V7, ii7.', 'b and # mark chords from outside the key: bVII (Bb in C).'] },
    { practice: { label: 'Every Jam chord shows its numeral', tool: 'jam' } },
  ] },
  { id: 'secondary', chapter: 'harmony', title: 'Secondary dominants and key changes', offtonic: O('9-5.html'), minutes: 6, blocks: [
    { p: 'Any chord can get its own **V7** borrowed for a moment. In C, A7 is the V7 of Dm (written **V7/ii**): it makes Dm sound like a mini-home. Secondary dominants add pull and colour, and are everywhere in jazz, gospel and country.' },
    { prog: { label: 'C → A7 → Dm → G7 → C', chords: [[48, 52, 55, 60], [45, 52, 55, 61], [50, 57, 62, 65], [43, 50, 53, 59], [48, 52, 55, 60]], gap: 0.9 } },
    { p: '**Modulation** is a real key change, often prepared by the new key\'s V7. The "truck-driver" key change at the end of pop songs jumps up a half or whole step.' },
  ] },
  { id: 'interchange', chapter: 'harmony', title: 'Borrowed chords', offtonic: O('9-5.html'), minutes: 5, blocks: [
    { p: '**Modal interchange** borrows chords from the parallel key (C minor\'s chords used in C major): **iv** (Fm, bittersweet), **bVII** (Bb, rock swagger), **bVI** (Ab, epic), **bIII** (Eb, bluesy). Special chords include the **Neapolitan** (bII, dramatic) and the **augmented sixths**.' },
    { practice: { label: 'Set Jam to "A little spice" and listen for borrowed chords', tool: 'jam' } },
  ] },
  { id: 'beyond', chapter: 'harmony', title: 'Plagal motion and negative harmony', offtonic: O('9-6.html'), minutes: 4, blocks: [
    { p: 'Not every progression resolves V → I. **Plagal** motion (IV → I, the "amen" cadence; or iv → I) is softer and very common in rock and gospel. Rock also loves bVII → I.' },
    { p: '**Negative harmony** mirrors chords around the key\'s centre: V7 becomes iv6, for example. It\'s a fun way to find fresh, related sounds.' },
  ] },
  { id: 'harmonize', chapter: 'harmony', title: 'Harmonizing a melody', offtonic: O('9-7.html'), minutes: 5, blocks: [
    { p: 'To put chords under a melody, look at the notes on strong beats and pick a diatonic chord that contains them. If the note is 1, 3 or 5 of the key, I works; if it\'s 4 or 6, try IV; if it\'s 2, 5 or 7, try V.' },
    { p: '**Reharmonizing** gives a melody a new mood: replace I with vi, add a secondary dominant before a chord, or borrow the iv. The Play screen\'s chord editor lets you try this on any tab.' },
  ] },
  { id: 'cadences', chapter: 'harmony', title: 'Cadences: how phrases end', offtonic: O('9-8.html'), minutes: 5, blocks: [
    { list: ['**Authentic** (V → I): a full stop.', '**Plagal** (IV → I): amen.', '**Half cadence** (ends on V): a comma, a question.', '**Deceptive** (V → vi): you expect home and get a surprise.'] },
    ...[['Authentic: G → C', [43, 47, 50, 55], [48, 52, 55, 60]], ['Deceptive: G → Am', [43, 47, 50, 55], [45, 52, 57, 60]], ['Plagal: F → C', [41, 48, 53, 57], [48, 52, 55, 60]]].map(([label, a, b]) => ({ prog: { label: String(label), chords: [a as number[], b as number[]], gap: 0.9 } }) as Block),
    { practice: { label: 'Endings in Jam: Resolves home / Turnaround / Unresolved', tool: 'jam' } },
  ] },

  // ---------------- Guitar mastery ----------------
  { id: 'caged', chapter: 'guitar', title: 'The CAGED system', minutes: 8, blocks: [
    { p: 'Five open chord shapes (**C, A, G, E and D**) can be moved up the neck to play any chord. For a given chord they sit one after another along the neck, always in the order C-A-G-E-D, and each one shares notes with the next.' },
    { list: ['**E shape** and **A shape** are your barre chords (root on the low E or A string).', '**C, G and D shapes** give higher voicings and are often played as partial chords.', 'Each shape contains its own **arpeggio**, its own **pentatonic box** and its own **major-scale pattern**: learn a shape and you have a home base for soloing over that chord.', 'On a tenor ukulele the same idea gives the shapes **C-A-G-F-D**.'] },
    { p: 'How to learn it: pick one chord (C), find it in all five shapes from the open position up to fret 12, then do the same for G, then A. Then play a progression (C–Am–F–G) staying in one area of the neck by choosing the nearest shape for each chord.' },
    { practice: { label: 'Open the CAGED explorer', tool: 'caged' } },
    { practice: { label: 'CAGED quizzes', quiz: 'caged-name' } },
  ] },
  { id: 'fretboard-plan', chapter: 'guitar', title: 'A plan for learning the fretboard', minutes: 5, blocks: [
    { list: ['**Week 1**: natural notes on the low E and A strings (barre-chord roots). 5 minutes a day.', '**Week 2**: octave shapes: every note on E and A gives you its octave two strings up.', '**Week 3**: the D and G strings, then B.', '**Week 4**: find every C (then every G, D, A, E) in under 30 seconds.', 'Then: sharps and flats, and triads across the neck.'] },
    { tip: 'Say the note name out loud as you play it. Use mic mode in the quizzes so your hands learn it too, and tap mode when you are away from your guitar.' },
    { practice: { label: 'Start the fretboard course', quiz: 'fb-nat-0' } },
  ] },
  { id: 'practice-how', chapter: 'guitar', title: 'How to practise (so it sticks)', minutes: 5, blocks: [
    { list: ['**Little and often** beats long and rare: 15 minutes every day grows you faster than 2 hours on Sunday.', '**Slow and perfect**: play it right at a slow tempo, then speed up 5 BPM at a time (the Tempo tab\'s speed trainer does this).', '**Loop the hard part**, not the whole song (⟲ Loop in Play).', '**Spaced repetition**: the quizzes bring back what you miss until it sticks.', '**Rest**: your brain consolidates skills while you sleep, so practising before bed actually helps.', '**Record yourself** (Looper) and listen back: it shows what you can\'t hear while playing.'] },
  ] },
  { id: 'technique', chapter: 'guitar', title: 'Technique basics', minutes: 6, blocks: [
    { list: ['**Relax**: tension is the enemy of speed and tone. Check your shoulders, thumb and jaw.', '**Fret close to the fret wire**, with the fingertip, using just enough pressure for a clean note.', '**Thumb behind the neck** for stretches and barre chords; over the top for bends and rock chords.', '**Alternate picking** (down-up) for single notes; small motions from the wrist.', '**Mute what you don\'t play**: the picking-hand palm and loose fretting fingers stop unwanted strings ringing.', '**One-minute chord changes**: count how many clean changes you can make between two chords in 60 seconds. Track it daily.'] },
    { practice: { label: 'One-minute chord changes', tool: 'changes' } },
  ] },
  { id: 'uke-notes', chapter: 'guitar', title: 'Ukulele: tunings and how they relate to guitar', minutes: 4, blocks: [
    { p: 'A **tenor ukulele** is tuned G C E A: like the top four strings of a guitar with a capo on fret 5. **Re-entrant** (high-G) tuning puts the G string an octave up, so it\'s higher than the C string: that bright, sparkly sound. **Low-G** gives a fuller bass.' },
    { p: 'A **baritone ukulele** is tuned D G B E, exactly the top four strings of a guitar, so every guitar chord shape on those strings works with the same name. **High-D** re-entrant tuning makes it sound more like a classic uke.' },
    { tip: 'Switch instruments in Learn → Settings. Chord shapes, scales, tabs, the tuner and quizzes all follow your instrument and tuning.' },
  ] },
]

export function lessonById(id: string) {
  return LESSONS.find(l => l.id === id)
}
