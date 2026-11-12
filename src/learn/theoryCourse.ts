// Guitar theory: the essentials. Twelve short lessons in the order of the owner's chosen theory book (No Bull Music
// Theory for Guitarists, owner 2026-11-11: "use that as the template"), each ending with something to play and a quiz.
// The words, examples and quizzes are our own (the repo is public): each lesson links to the matching chapter of his
// copy through his private book pack ("Read it in your book"), and to other books on the same topic.
import type { Lesson } from './lessons'

// MIDI: C3 = 48 (guitar sounds an octave below written; these sit in the middle of the neck)
const C3 = 48, E2 = 40, A2 = 45, G2 = 43
const up = (root: number, semis: number[]) => semis.map(s => root + s)
const MAJ = [0, 2, 4, 5, 7, 9, 11, 12]
const triad = (root: number, minor = false) => [root, root + (minor ? 3 : 4), root + 7]

export type TheoryLesson = Lesson & Required<Pick<Lesson, 'bookRef' | 'topics'>>
const NB = 'No Bull Music Theory'

export const THEORY_LESSONS: TheoryLesson[] = [
  {
    id: 'tb-alphabet', chapter: 'essentials', title: '1. The musical alphabet', minutes: 5, bookRef: { book: NB, chapter: 'Chapter 1' }, topics: ['fretboard-notes'],
    blocks: [
      { p: 'Music uses only seven letters: **A B C D E F G**. After G it starts again at A, and it keeps going round in a circle as you go higher or lower.' },
      { p: 'Between most pairs of letters there is one more note, a **sharp or flat** (A# is the same note as Bb). Two pairs have nothing between them: **E–F** and **B–C**. That gives 12 different notes before the letters repeat.' },
      { neck: { root: 'E', ivs: [0, 1, 3, 5, 7, 8, 10, 12], labels: 'note', to: 12 } },
      { p: 'On the guitar every fret is the next note. On the low E string: open E, F at fret 1 (no gap after E), G at 3, A at 5, B at 7, C at 8 (no gap after B), D at 10 and E again at 12.' },
      { play: { label: 'The natural notes up the low E string', seq: [E2, 41, 43, 45, 47, 48, 50, 52], gap: 0.45 } },
      { list: ['Say the alphabet forwards and backwards from any letter: "D E F G A B C D", "D C B A G F E D".', 'Play the low E string from open to fret 12 and name every natural note out loud.', 'Do the same on the A string: open A, B at 2, C at 3, D at 5, E at 7, F at 8, G at 10, A at 12.'] },
      { tip: 'Learning the notes on the two lowest strings first pays off fast: they hold the roots of almost every barre chord and power chord.' },
      { practice: { label: 'The musical alphabet quiz', quiz: 'nb-alpha' } },
      { practice: { label: 'Natural notes on the low E string', quiz: 'fb-nat-0' } },
    ],
  },
  {
    id: 'tb-steps', chapter: 'essentials', title: '2. Tones and semitones', minutes: 4, bookRef: { book: NB, chapter: 'Chapter 2' }, topics: ['major-scale', 'fretboard-notes'],
    blocks: [
      { p: 'A **semitone** (half step) is the smallest step in our music: **one fret**. A **tone** (whole step) is two semitones: **two frets**.' },
      { p: 'Going up a semitone from a letter gives its sharp (C → C#); going down gives a flat (D → Db). C# and Db are the same fret, two names for one sound. Remember the two gaps that aren\'t there: E to F and B to C are already a semitone apart.' },
      { play: { label: 'Semitones: one fret at a time from A', seq: up(A2, [0, 1, 2, 3, 4, 5]), gap: 0.4 } },
      { play: { label: 'Tones: two frets at a time from A', seq: up(A2, [0, 2, 4, 6, 8, 10]), gap: 0.4 } },
      { list: ['On any string, play a note, then the note a semitone up (next fret) and a tone up (two frets). Name all three.', 'Start on B (A string, fret 2): a semitone up is C, not B#: that is the B–C step with no gap.', 'Play a tone up from E: it lands on F#, because E–F is only a semitone.'] },
      { practice: { label: 'Tones and semitones quiz', quiz: 'nb-steps' } },
    ],
  },
  {
    id: 'tb-major', chapter: 'essentials', title: '3. The major scale', minutes: 7, bookRef: { book: NB, chapter: 'Chapter 3' }, topics: ['major-scale', 'caged'],
    blocks: [
      { p: 'The major scale is the "do re mi" scale, and almost everything else in theory is measured against it. It is a pattern of steps: **tone, tone, semitone, tone, tone, tone, semitone** (T T S T T T S).' },
      { p: 'Start on C and follow the pattern: C (tone) D (tone) E (semitone) F (tone) G (tone) A (tone) B (semitone) C. Because the semitones fall exactly on E–F and B–C, C major has no sharps or flats.' },
      { play: { label: 'C major, up and down', seq: [...up(C3, MAJ), ...up(C3, MAJ).reverse().slice(1)], gap: 0.33 } },
      { p: 'Start anywhere else and the pattern needs sharps or flats to keep its shape. G major needs F#; D major needs F# and C#; F major needs Bb. Every major scale uses each letter once, so the notes are always spelled with seven different letters.' },
      { list: ['Play C major along one string: A string from fret 3: frets 3, 5, 7, 8, 10, 12, 14, 15. Say T T S T T T S as you go.', 'Now start on fret 5 of the A string (D) and keep the same pattern of frets. You\'ve just played D major.', 'Learn one shape that stays in position:'] },
      { neck: { root: 'G', ivs: [0, 2, 4, 5, 7, 9, 11, 12], labels: 'int', to: 7 } },
      { p: 'The **octave** is the 8th note: the same letter again, higher. There are 12 major scales, one starting on each of the 12 notes.' },
      { tip: 'Sing "do re mi fa so la ti do" while you play it. Your ear learns the sound and your hands learn the shape at the same time.' },
      { practice: { label: 'Major scale quiz', quiz: 'nb-major' } },
    ],
  },
  {
    id: 'tb-triads', chapter: 'essentials', title: '4. Major and minor triads', minutes: 7, bookRef: { book: NB, chapter: 'Chapter 4' }, topics: ['triads', 'chord-building'],
    blocks: [
      { p: 'A chord is three or more notes played together. The simplest chords have three different notes: **triads**.' },
      { p: 'A **major triad** takes notes 1, 3 and 5 of the major scale. C major scale is C D E F G A B, so a C chord is **C E G**. G major (G A B C D E F#) gives **G B D**.' },
      { p: 'A **minor triad** lowers the 3rd by one fret: **1, b3, 5**. C minor is C Eb G; A minor is A C E. That single note is the whole difference between happy and sad.' },
      { play: { label: 'C major, then C minor (only the middle note moves)', chord: triad(C3) } },
      { play: { label: 'C minor', chord: triad(C3, true) } },
      { list: ['Play an open E chord, then lift your first finger off the G string: the G# becomes G and the chord turns into E minor.', 'Same with A → Am: move the note on the B string (C#) down one fret to C.', 'Find the 1, 3 and 5 inside an open C chord: C on the A and B strings, E on the D and high e strings, G on the G string. Bigger chords just repeat triad notes.'] },
      { p: 'Power chords (E5, A5) have only the 1 and 5: no 3rd, so they\'re neither major nor minor. That\'s why they fit both and sound so strong with distortion.' },
      { practice: { label: 'Spell the triad', quiz: 'tr-spell' } },
      { practice: { label: 'Major or minor? (by ear)', quiz: 'ch-ear' } },
    ],
  },
  {
    id: 'tb-intervals', chapter: 'essentials', title: '5. Intervals from the major scale', minutes: 6, bookRef: { book: NB, chapter: 'Chapter 5' }, topics: ['intervals'],
    blocks: [
      { p: 'An **interval** is the distance between two notes. The easy way to name them: number the major scale from its root. In C, D is the **2nd**, E the **3rd**, F the **4th**, G the **5th**, A the **6th**, B the **7th** and C again the octave.' },
      { p: 'So "the 5th of D" means the 5th note of D major (D E F# G **A** B C#): A. Musicians also use fuller names: major 2nd, major 3rd, perfect 4th, perfect 5th, major 6th, major 7th.' },
      { neck: { root: 'A', ivs: [0, 2, 4, 5, 7, 9, 11, 12], labels: 'int', to: 9 } },
      { p: 'Each interval is a **shape** on the guitar that works anywhere: a 5th is one string higher and two frets up (the power chord shape); an octave is two strings higher and two frets up.' },
      { play: { label: 'C to each interval: 2nd, 3rd, 4th, 5th, 6th, 7th, octave', seq: [C3, 50, C3, 52, C3, 53, C3, 55, C3, 57, C3, 59, C3, 60], gap: 0.32 } },
      { p: 'Chord names use these numbers: **Csus2** swaps the 3rd for the 2nd, **Csus4** for the 4th, **C5** is root and 5th, **C6** adds the 6th and **Cmaj7** adds the 7th.' },
      { list: ['Pick a root on the low E string and find its 3rd, 5th and octave as shapes, without counting.', 'Play a D chord, then Dsus2 and Dsus4: hear the 3rd being replaced.'] },
      { practice: { label: 'Intervals quiz', quiz: 'nb-int' } },
    ],
  },
  {
    id: 'tb-chromatic', chapter: 'essentials', title: '6. Flat and sharp intervals', minutes: 6, bookRef: { book: NB, chapter: 'Chapter 6' }, topics: ['intervals', 'chord-building'],
    blocks: [
      { p: 'The major scale gives seven intervals. The five notes in between are named by **lowering or raising** one of them: **b2, b3, #4/b5, #5/b6, b7**. A flat is one fret lower, a sharp one fret higher.' },
      { p: 'The letter stays the same: the b3 of D is **F** (the 3rd, F#, lowered), never E#. Some pairs sound the same but are written from different letters: #4 and b5 (G# and Ab above D), #5 and b6, #2 and b3. Which name you use depends on the job the note is doing.' },
      { neck: { root: 'C', ivs: [0, 1, 3, 6, 8, 10, 12], labels: 'int', to: 12 } },
      { p: 'This is why chord names make sense: **minor** chords have a b3, **7** chords (C7) add a b7, **m7b5** has a b3, b5 and b7, and **C7#9** has a #9 (a #2 an octave up).' },
      { play: { label: 'C7: root, 3rd, 5th, b7', chord: [C3, 52, 55, 58] } },
      { list: ['Play C major, then lower its 3rd (C minor), then add a b7 to the major (C7) and to the minor (Cm7). Name each new note.', 'Find the b7 of any root: one string up and two frets down from the octave, or two frets below the octave on the same string.'] },
      { practice: { label: 'Flat and sharp intervals quiz', quiz: 'nb-chrom' } },
    ],
  },
  {
    id: 'tb-keys1', chapter: 'essentials', title: '7. Major keys: the big picture', minutes: 6, bookRef: { book: NB, chapter: 'Chapter 7' }, topics: ['harmony', 'circle-of-fifths'],
    blocks: [
      { p: 'When musicians say a song is "in G", they mean three things at once: **G is home** (it sounds finished there), the song mostly uses a **family of chords** that belong together, and those chords come from one **parent scale**, G major.' },
      { p: 'Each major key has seven chords in its family. In C: **C, Dm, Em, F, G, Am and Bdim**. Most songs in C use mainly those. Change key and the whole family moves together.' },
      { prog: { label: 'A song in C: C – Am – F – G', chords: [triad(C3), triad(A2 + 12, true), triad(41 + 12), triad(G2 + 12)] } },
      { p: 'The parent scale is also what to **solo** with: over any chords from the C family, the C major scale fits. Songs do borrow chords from outside the family now and then; they stand out because they don\'t belong, and that\'s often the point.' },
      { list: ['Play C – Am – F – G a few times, then improvise a few notes from the C major scale over a recording or the Jam band.', 'Pick a song you know and list its chords: which family do they come from? Where does it feel like home?'] },
      { practice: { label: 'Chords in a key (circle of fifths)', quiz: 'cof-chords' } },
      { practice: { label: 'Play over the chords in Jam', tool: 'jam' } },
    ],
  },
  {
    id: 'tb-keys2', chapter: 'essentials', title: '8. Building the chords of any key', minutes: 8, bookRef: { book: NB, chapter: 'Chapter 8' }, topics: ['harmony', 'chord-building'],
    blocks: [
      { p: 'You can build any key\'s chord family yourself. Write out its major scale, then build a triad on every note by **stacking every other note**: on C, take C–E–G; on D, D–F–A; on E, E–G–B; and so on.' },
      { p: 'Then number the chords with **Roman numerals**. The pattern of chord types is the same in every major key: **I, IV and V are major; ii, iii and vi are minor; vii is diminished**.' },
      { list: ['C: I C · ii Dm · iii Em · IV F · V G · vi Am · vii° Bdim', 'G: I G · ii Am · iii Bm · IV C · V D · vi Em · vii° F#dim', 'D: I D · ii Em · iii F#m · IV G · V A · vi Bm · vii° C#dim', 'A: I A · ii Bm · iii C#m · IV D · V E · vi F#m · vii° G#dim', 'E: I E · ii F#m · iii G#m · IV A · V B · vi C#m · vii° D#dim'] },
      { p: 'Numbers are how musicians talk about chords without caring about the key: "it\'s a I–IV–V" means the same shape of song in any key. Change the key and only the letters change.' },
      { circle: { tonic: 'G' } },
      { list: ['Build the chord family of F major on paper (F G A Bb C D E), then play every chord in order up the neck.', 'Play I–IV–V–I in G, then in D, then in A, saying the numbers out loud.'] },
      { practice: { label: 'Chords in a major key quiz', quiz: 'nb-keys' } },
    ],
  },
  {
    id: 'tb-progressions', chapter: 'essentials', title: '9. Understanding chord progressions', minutes: 7, bookRef: { book: NB, chapter: 'Chapter 9' }, topics: ['harmony'],
    blocks: [
      { p: 'A chord progression is a set of chords in order. Thinking of them as numbers lets you spot the same progressions in hundreds of songs and play them in any key.' },
      { list: ['**I – IV – V**: the three-chord trick of blues, folk, country and rock and roll.', '**I – V – vi – IV**: countless pop songs.', '**I – vi – IV – V**: the 1950s doo-wop progression.', '**ii – V – I**: the most important move in jazz.', '**vi – IV – I – V**: the same four chords as I–V–vi–IV, starting on the minor chord.'] },
      { prog: { label: 'I – V – vi – IV in G: G – D – Em – C', chords: [triad(G2 + 12), triad(50), triad(52, true), triad(48)] } },
      { p: 'The pull of **V to I** is the strongest in our music: the V chord wants to go home. Listen for where a song lands and you can usually tell the key.' },
      { list: ['Learn I – V – vi – IV in G (G D Em C) and in C (C G Am F). Notice your hands make different shapes but your ears hear the same song.', 'With a capo on 2, the G shapes play in A: same numbers, new key.', 'Take a song you know and write its chords as numbers.'] },
      { practice: { label: 'Progressions in any key quiz', quiz: 'nb-prog' } },
      { practice: { label: 'Make progressions in Jam', tool: 'jam' } },
    ],
  },
  {
    id: 'tb-pentatonic', chapter: 'essentials', title: '10. Pentatonic scales', minutes: 7, bookRef: { book: NB, chapter: 'Chapter 10' }, topics: ['pentatonic', 'improvising'],
    blocks: [
      { p: '"Pentatonic" means five notes. These scales leave out the notes most likely to clash, so almost everything you play with them sounds good: that\'s why every rock, blues and country player starts here.' },
      { p: 'The **major pentatonic** is the major scale without its 4th and 7th: **1, 2, 3, 5, 6**. G major pentatonic is G A B D E. It sounds bright and open: country, bluegrass and happy rock solos.' },
      { p: 'The **minor pentatonic** is **1, b3, 4, 5, b7**. A minor pentatonic is A C D E G. This is the sound of blues and rock solos.' },
      { neck: { root: 'A', ivs: [0, 3, 5, 7, 10, 12], labels: 'int', to: 8 } },
      { play: { label: 'A minor pentatonic, the box at fret 5', seq: [45, 48, 50, 52, 55, 57, 60, 62, 64, 67, 69], gap: 0.28 } },
      { p: 'Each major pentatonic shares its notes with a minor pentatonic three frets lower: **G major pentatonic = E minor pentatonic**. Same shape, different home note. Add the b5 to the minor pentatonic and you get the **blues scale**.' },
      { list: ['Learn the minor pentatonic box at fret 5 (A minor), then play it over an A blues in Jam.', 'Slide the same box down to fret 2 and play it over G: now it\'s G major pentatonic.'] },
      { practice: { label: 'Pentatonic scales quiz', quiz: 'nb-pent' } },
      { practice: { label: 'Solo over a band in Jam', tool: 'jam' } },
    ],
  },
  {
    id: 'tb-minor', chapter: 'essentials', title: '11. The natural minor scale', minutes: 6, bookRef: { book: NB, chapter: 'Chapter 11' }, topics: ['major-scale', 'modes'],
    blocks: [
      { p: 'The natural minor scale is the major scale with three notes lowered: **1, 2, b3, 4, 5, b6, b7**. As steps: T S T T S T T. It\'s darker and sadder than major.' },
      { p: 'A natural minor is **A B C D E F G**: no sharps or flats at all, the same notes as C major. That\'s the **relative minor**: every major scale has a minor scale with the same notes, starting on its 6th note.' },
      { play: { label: 'A natural minor, up and down', seq: [57, 59, 60, 62, 64, 65, 67, 69, 67, 65, 64, 62, 60, 59, 57], gap: 0.3 } },
      { neck: { root: 'A', ivs: [0, 2, 3, 5, 7, 8, 10, 12], labels: 'int', to: 9 } },
      { p: 'You\'ll also see it called the **Aeolian mode**. Any time you play a C major scale over an A minor chord with A as home, you\'re playing A natural minor.' },
      { list: ['Play C major, then play the same notes from A to A. Feel how the home note changes the mood.', 'Play E natural minor (E F# G A B C D) over an Em chord: it\'s the G major scale, starting on E.'] },
      { practice: { label: 'Natural minor quiz', quiz: 'nb-minor' } },
    ],
  },
  {
    id: 'tb-minorkeys', chapter: 'essentials', title: '12. Minor keys', minutes: 7, bookRef: { book: NB, chapter: 'Chapter 12' }, topics: ['harmony', 'circle-of-fifths'],
    blocks: [
      { p: 'A song in a minor key has a minor chord as home. Build its chord family the same way as in major, from the natural minor scale, and the pattern comes out: **i, iv and v are minor; III, VI and VII are major; ii is diminished**.' },
      { list: ['A minor: i Am · ii° Bdim · III C · iv Dm · v Em · VI F · VII G', 'E minor: i Em · ii° F#dim · III G · iv Am · v Bm · VI C · VII D'] },
      { p: 'The **relative minor shortcut**: a minor key uses exactly the same chords as its relative major. A minor\'s chords are C major\'s chords, just with Am as home. So once you know the major keys, you know the minor keys too.' },
      { prog: { label: 'In A minor: Am – F – C – G', chords: [triad(57, true), triad(53), triad(48), triad(55)] } },
      { p: 'How to tell major from minor: listen for home. A song in C and a song in Am may use the same chords; the one that starts and ends on Am, and keeps leaning back to it, is in A minor.' },
      { tip: 'Many minor songs borrow a major V chord (E or E7 in A minor) for a stronger pull home. You\'ll hear it everywhere from flamenco to metal.' },
      { practice: { label: 'Minor keys quiz', quiz: 'nb-minorkey' } },
      { practice: { label: 'Relative minors on the circle', quiz: 'cof-relative' } },
    ],
  },
]
