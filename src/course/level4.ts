// Theory course, Level 4: Mapping the fretboard. Lesson 1 is the whole CAGED system in one deep lesson (owner 2026-11-16:
// "one huge lesson", "don't cut corners", "true mastery", connected to the fills, Target notes, Call and response and Jam).
// Our own words; the owner's books (Fretboard Logic, the CAGED blues book, Fretboard Mastery, Triads and Inversions, the
// Practical Guide) are pointed to, never copied. Every fret below was checked with learn/caged.ts (course/cagedTabs.ts).
import type { CourseLesson } from './types'
import { shapeMarks, shapesOf, scaleInShape } from './cagedTabs'

const only = (...letters: string[]) => (sh: { letter: string }[]) => sh.filter(s => letters.includes(s.letter)) as never
/** C major in each shape on guitar (open C, A shape at 3, G shape 5–8, E shape at 8, D shape 10–13, C shape at 12) */
const C_SHAPES = [[48, 52, 55, 60, 64], [48, 55, 60, 64, 67], [48, 52, 55, 60, 64, 72], [48, 55, 60, 64, 67, 72], [60, 67, 72, 76], [60, 64, 67, 72, 76]]
const SERIFF_CAGED = { id: '_XY_JDOFXlE', title: '3 simple patterns to MASTER all CAGED shapes' }

export const CAGED: CourseLesson = {
  id: 'c4-caged', level: 4, n: 1, title: 'CAGED: the map of the whole neck', minutes: 90,
  goal: 'Play any major or minor chord in all five shapes, know where the root, 3rd and 5th are in each, move through a key without leaving one area of the neck, and use the shapes as the frame for scales, arpeggios, triads and fills.',
  builds: ['octave shapes', 'the notes on the low E and A strings', 'major and minor triads', 'barre chords', 'the chords of a key'],
  topics: ['CAGED', 'fretboard', 'chord shapes', 'barre chords', 'chord tones', 'triads', 'inversion'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Most players know a handful of open chords and two barre shapes, and the rest of the neck is a fog. **CAGED** clears it. It shows that every major and minor chord can be played in **five places** up the neck, that those five places **join up** with no gaps, and that you already know all five shapes: they are the open chords **C, A, G, E and D**.' },
        { p: 'Once you see it, the neck stops being 132 separate frets. It becomes **five overlapping windows**, each built around a chord you can name. Every scale, arpeggio, triad, lick and fill you learn from now on lives inside one of those windows. That\'s why this lesson comes first in Level 4: it is the map everything else is drawn on.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['play any major or minor chord in five places;', 'point to its root, 3rd and 5th in every shape without thinking;', 'play a whole song\'s chords in one small area of the neck, anywhere you choose;', 'see the scale and the chord at the same time, so a solo or a fill always knows where "home" is;', 'start a fill from any chord shape with the free finger, the John Mayer way.'] },
        { prog: { label: 'C major in all five shapes, up the neck: C, A, G, E, D, then C again', chords: C_SHAPES, gap: 1.1 } },
        { tip: 'This is a long lesson on purpose: it covers what most courses spread over five or six. Take it in sittings. The practice goals at the end let you tick it off piece by piece.' },
      ],
    },
    {
      kind: 'learn', title: '1 · Five chords you already know', blocks: [
        { p: 'Play the open chords **C, A, G, E and D**. Each one is a **pattern** of three notes: the **root** (the chord\'s name), the **3rd** (which makes it major or minor) and the **5th** (strong and neutral), repeated on six strings. The open strings are part of each pattern. That matters in a minute.' },
        { p: 'Here is C as you know it (the C shape), with each note named by its job in the chord:' },
        { spots: { caption: 'Open C: the C shape. R = root (C), 3 = the 3rd (E), 5 = the 5th (G). Roots on the A and B strings.', from: 0, to: 4, marks: midis => shapeMarks(0, false, midis, only('C')).filter(m => m.f <= 4) } },
        { p: 'Look at where the **roots** sit in each open chord. They are your handles:' },
        { list: ['**C shape**: roots on the **A** string (3rd fret) and the **B** string (1st fret).', '**A shape**: roots on the **A** string (open) and the **G** string (2nd fret).', '**G shape**: roots on the **low E**, **G** and **high e** strings (3rd fret, open, 3rd fret).', '**E shape**: roots on the **low E**, **D** and **high e** strings.', '**D shape**: roots on the **D** string (open) and the **B** string (3rd fret).'] },
        { tip: 'Those root pairs are the **octave shapes** from Level 1. Every CAGED shape is built round one or two of them: learn the octaves, and you already know where each shape\'s roots are.' },
      ],
    },
    {
      kind: 'learn', title: '2 · Making them movable: the nut becomes a finger', blocks: [
        { p: 'An open chord leans on the **nut**: the open strings are notes the nut "frets" for you. To move a shape up the neck, something has to do the nut\'s job. That\'s your **index finger**: a **barre**, or just a finger on the notes that were open.' },
        { p: 'You already know two cases. **F** at the 1st fret is the **E shape** with the index finger as the nut. **B♭** at the 1st fret is the **A shape**. Slide either one up, and the chord\'s name is simply **the note under the root**: E shape at the 5th fret = A (low E string, 5th fret is A); A shape at the 5th fret = D (A string, 5th fret is D).' },
        { p: 'The other three work the same way, they are just less comfortable as full barres:' },
        { list: ['**C shape** moved up: the index finger takes the open G and E strings; the root is under the **ring finger** on the A string, three frets above the index.', '**G shape** moved up: the index takes the open D, G and B strings; roots under the ring or little finger on the low and high E strings.', '**D shape** moved up: the index takes the open D string root; the shape sits ahead of it, two or three frets up.'] },
        { video: { id: '93RDnOs7QHM', title: 'CAGED System Explained (1 of 4) • Converting Open Chords to Moveable Chords', note: 'Watch how each open chord becomes a movable shape: the open strings turn into a barre or an index-finger note.' } },
        { tip: 'Shape and name are two different things. "C shape" says **which pattern**; the chord\'s **name** comes from the root under it. A D chord can be played with the C shape, the A shape, the G shape, the E shape or the D shape.' },
      ],
    },
    {
      kind: 'learn', title: '3 · Why the shapes look the way they do (the B-string kink)', blocks: [
        { p: 'Ever wondered why an E-shape barre has that odd middle-finger note, or why the octave shapes stretch one fret further when they cross the B string? It comes from the tuning. Five of the six string pairs are tuned a **4th** apart (5 frets): E to A, A to D, D to G, B to e. One pair is different: **G to B is a major 3rd** (4 frets).' },
        { p: 'So any shape that crosses from the G string to the B string has to move **one fret further up** on the B string (and on the high e above it) to keep the same notes. That one-fret kink is in every chord shape, every scale box and every octave shape that crosses it. If the guitar were tuned in 4ths all the way up, all five CAGED shapes would be straight lines and slants. The kink is the only reason they look different.' },
        { list: ['**Unison and octave check**: the 5th fret gives the next string\'s open note on every pair except G → B, where it\'s the **4th** fret. That\'s the same kink.', '**Octave shapes** that cross the B string reach one fret further (Level 1).', '**Any shape you know** can be rebuilt from scratch: work out the notes string by string, and add one fret for every note on the B and high e strings when you move it down from the lower strings.'] },
        { tip: 'This is what turns CAGED from five memorised pictures into one idea. If you forget a shape in the middle of a song, build it: root, then 3rd and 5th on the strings around it, adding the B-string fret.' },
        { p: 'On a **ukulele** (G C E A) the odd pair is C → E (a major 3rd), so the kink sits between the 2nd and 3rd strings instead. Same idea, different place.' },
      ],
    },
    {
      kind: 'learn', title: '4 · One chord, five places: C up the neck', blocks: [
        { p: 'Now play **C** in all five shapes, from the nut up:' },
        { list: ['**C shape**: open position (x 3 2 0 1 0).', '**A shape**: barre at the 3rd fret (x 3 5 5 5 3).', '**G shape**: frets 5 to 8 (8 7 5 5 5 8).', '**E shape**: barre at the 8th fret (8 10 10 9 8 8).', '**D shape**: frets 10 to 13 (x x 10 12 13 12).', 'Then **C shape** again at the 12th fret: the whole thing repeats an octave up.'] },
        { spots: { caption: 'Every C on the neck: the five shapes laid end to end. R = C, 3 = E, 5 = G.', from: 0, to: 15, marks: midis => shapeMarks(0, false, midis) } },
        { p: 'Two things to notice. First, the whole neck is just **C, E and G**: every fret in this picture is one of those three notes, and the five shapes are five ways of grabbing them. Second, the order is **C, A, G, E, D** and then it starts again. That order never changes, whatever the chord: only the starting point moves.' },
        { prog: { label: 'Open C (C shape), then C as the E shape at the 8th fret: same chord, a different voicing', chords: [C_SHAPES[0], C_SHAPES[3], C_SHAPES[0], C_SHAPES[3]], gap: 1.2 } },
      ],
    },
    {
      kind: 'learn', title: '5 · The glue: how each shape hands over to the next', blocks: [
        { p: 'The shapes don\'t just sit next to each other, they **overlap**. The top edge of one shape is the bottom edge of the next, and they share notes there. Learn the shared notes and moving between shapes stops being a jump: you keep one finger where it is and build the next shape around it.' },
        { list: ['**C → A**: the C shape\'s root on the A string (ring finger) is the A shape\'s root (index barre).', '**A → G**: the A shape\'s root on the G string is the G shape\'s root on the G string.', '**G → E**: the G shape\'s root on the low E (and high e) is the E shape\'s barre root.', '**E → D**: the E shape\'s root on the D string is the D shape\'s root.', '**D → C**: the D shape\'s root on the B string is the next C shape\'s root on the B string.'] },
        { spots: { caption: 'The G shape (frets 5–8) and the E shape (frets 8–10) of C: the roots at the 8th fret on both E strings belong to both.', from: 4, to: 11, marks: midis => shapeMarks(0, false, midis, only('G', 'E'), 4) } },
        { tip: 'You only ever have to know **one** shape of a chord plus the order. Find the shape you know, then step to the next one through the shared root.' },
      ],
    },
    {
      kind: 'learn', title: '6 · Any chord, anywhere: the root finders', blocks: [
        { p: 'To play any chord in any shape, find its root on one of three strings, then hang a shape on it. Each string carries two shapes: one that grows **up** the neck from the root and one that reaches **back** towards the nut.' },
        { list: ['Root on the **low E** string: the **E shape** (barre on the root, the shape grows up) or the **G shape** (root under the little or ring finger, the shape reaches back about three frets).', 'Root on the **A** string: the **A shape** (barre on the root, grows up) or the **C shape** (root under the ring finger, reaches back three frets).', 'Root on the **D** string: the **D shape** (index finger on the root, the shape sits two to three frets ahead).'] },
        { p: 'Example: **D major**. Root on the low E at the 10th fret → E shape at 10 (10 12 12 11 10 10) or G shape reaching back from it (10 9 7 7 7 10). Root on the A string at the 5th fret → A shape at 5 (x 5 7 7 7 5) or C shape reaching back (x 5 4 2 3 2). Root on the open D string → the D shape you know (x x 0 2 3 2).' },
        { spots: { caption: 'D major: all five shapes. Count them: C shape (frets 2–5), A shape (5–7), G shape (7–10), E shape (10–12), and the open D shape.', from: 0, to: 15, marks: midis => shapeMarks(2, false, midis) } },
        { tip: 'This is where Level 1 pays off. You need the notes on the low E and A strings (and the octave shapes for the D string) to drop a shape on any root in a second.' },
      ],
    },
    {
      kind: 'learn', title: '7 · Where the 1, 3 and 5 are in every shape', blocks: [
        { p: 'Knowing the shape is half of it. The other half is knowing **which note in the shape does which job**. The root is home, the **3rd** decides major or minor and is the most "telling" note of the chord, and the 5th is strong and plain. When you aim a melody note, a fill or a bend at a chord, you are aiming at one of these.' },
        { p: 'Where the **3rds** are, shape by shape (major chords):' },
        { list: ['**E shape**: the **G** string (the note your middle finger plays in an F barre).', '**A shape**: the **B** string.', '**G shape**: the **A** string and the **B** string.', '**C shape**: the **D** string and the **high e** string.', '**D shape**: the **high e** string.'] },
        { spots: { caption: 'C major, E shape at the 8th fret: R on the low E, D and high e strings, the 3rd on the G string, the 5ths on the A and B strings.', from: 7, to: 11, marks: midis => shapeMarks(0, false, midis, only('E'), 7) } },
        { spots: { caption: 'C major, A shape at the 3rd fret: roots on the A and G strings, the 3rd on the B string, 5ths on the D and high e strings.', from: 2, to: 6, marks: midis => shapeMarks(0, false, midis, only('A'), 2) } },
        { p: 'And the **top note** of each shape (the highest string), because that\'s the note a listener hears as the "tune" of the chord: E shape = **root**, A shape = **5th**, G shape = **root**, C shape = **3rd**, D shape = **3rd**.' },
        { tip: 'Say the jobs out loud while you play: "root, five, root, three, five, root" for the E shape. Ten minutes of that and you will see the jobs, not just the dots.' },
      ],
    },
    {
      kind: 'learn', title: '8 · Minor chords in five shapes', blocks: [
        { p: 'A minor chord is a major chord with its **3rd lowered one fret** (the ♭3). So every minor shape is the major shape with the 3rds moved back a fret, and you already know where the 3rds are.' },
        { list: ['**E shape** → **Em shape**: the G-string note drops a fret (the classic minor barre, like Fm or Am at the 5th fret).', '**A shape** → **Am shape**: the B-string note drops a fret (like Bm at the 2nd fret).', '**D shape** → **Dm shape**: the high e note drops a fret.', '**C shape** and **G shape** minors exist but are awkward grips. Players use **parts** of them (the top three or four strings) rather than the whole thing.'] },
        { spots: { caption: 'A minor in its five shapes. ♭3 = C, the minor 3rd; R = A; 5 = E.', from: 0, to: 15, marks: midis => shapeMarks(9, true, midis) } },
        { p: 'Over a minor key you\'ll lean on the **Em**, **Am** and **Dm** shapes and their small top-string versions. That\'s what the players you\'ll study do too.' },
      ],
    },
    {
      kind: 'learn', title: '9 · The grips players actually use', blocks: [
        { p: 'Here\'s the part most CAGED lessons skip. Nobody plays all five shapes as full six-string barres. The **C** and **G** shapes in particular are stretches. In real music you grab **pieces** of a shape: the top three or four strings, or the bottom three. The full shape is the **map**; the piece is what your hand plays.' },
        { list: ['**E shape**: the full barre for rock and strumming; the **top three strings** (a small triad with the root on top) for funk, soul and fills.', '**A shape**: the barre; or the middle four strings; or the top three (a triad with the 5th on top).', '**G shape**: the top three strings (root, 3rd, root) or the bottom three (root, 3rd, 5th): never the whole stretch.', '**C shape**: the top four strings (the "little C" grip) and the A-D-G strings (root, 3rd, 5th).', '**D shape**: already a top-four-string shape: use it as it is.'] },
        { p: 'Each shape\'s top three strings hold a small **triad**. The E shape gives the triad with the **root on top**, the A shape the one with the **5th on top**, the D shape and the C shape the one with the **3rd on top**. Those three little shapes are the **inversions** you\'ll learn in lesson 3 of this level, and they are what John Mayer, Hendrix and Asato play instead of full chords.' },
        { video: { id: 'ANQ4k3Zq-WE', title: 'Learn CAGED Triads • The Most Useful Shapes on Guitar', note: 'The small top-string versions of each shape: the grips you\'ll use most.' } },
        { tip: 'When a song is strummed, use the full shape. When you\'re one of two guitars, or adding fills, use the top-string piece: it leaves room and leaves a finger free.' },
      ],
    },
    {
      kind: 'learn', title: '10 · Scales and arpeggios live inside the shapes', blocks: [
        { p: 'Every shape is a **frame**. Play only its chord tones one at a time and you have the **arpeggio**. Add the **2** and **6** (the notes one step above the root and the 5th) and you have the **major pentatonic** of that chord. Add the **4** and **7** too and you have the whole **major scale**. Each one grows out of the chord shape, so the chord is always visible inside the scale.' },
        { spots: { caption: 'C major pentatonic around the E shape (frets 7–11): the chord tones (R, 3, 5) with the 2 and the 6 next to them.', from: 6, to: 11, marks: midis => { const sh = shapesOf(0, false, midis).find(x => x.letter === 'E'); return sh ? scaleInShape(0, sh, midis, [0, 2, 4, 7, 9], ['R', '2', '3', '5', '6'], [0, 4, 7]) : [] } } },
        { p: 'This is why the five pentatonic boxes, the five major scale positions and the arpeggio shapes are each **five**: there is one per CAGED shape. Lesson 2 of this level lays the pentatonic boxes over the shapes; lesson 5 does the same with the major scale.' },
        { p: 'It works for minor too. The **A minor pentatonic** has the same notes as C major pentatonic (the relative trick from Level 3), so box 1 of A minor pentatonic (frets 5–8) is just the C major pentatonic around the **G shape** of C: same notes, a different home note.' },
        { tip: 'In a solo, "where am I?" has a simple answer: you are in one of five shapes of the chord that\'s playing. Its roots and 3rd are right there under your fingers.' },
      ],
    },
    {
      kind: 'learn', title: '11 · One key, five zones: change chords without moving', blocks: [
        { p: 'The real power of CAGED is in a progression. For each chord you choose the shape **nearest** the one you\'re in, and a whole song happens in one small area of the neck. That area is a **zone**. A key has five of them, one for each shape of its I chord.' },
        { p: 'Key of C, **I – vi – IV – V** (C, Am, F, G), two zones:' },
        { list: ['**Zone around the 3rd fret** (C as the A shape): C = A shape at 3 (x 3 5 5 5 3), Am = Em shape at 5 (5 7 7 5 5 5), F = D shape at 3 (x x 3 5 6 5), G = E shape at 3 (3 5 5 4 3 3).', '**Zone around the 8th fret** (C as the E shape): C = E shape at 8 (8 10 10 9 8 8), Am = Dm shape (x x 7 9 10 8), F = A shape at 8 (x 8 10 10 10 8), G = C shape reaching back from the A string\'s 10th fret (x 10 9 7 8 7).'] },
        { p: 'A **minor key** works the same way. A minor, **i – iv – v** (Am, Dm, Em) around the 5th fret: Am = Em shape at 5 (5 7 7 5 5 5), Dm = Am shape at 5 (x 5 7 7 6 5), Em = Am shape at 7 (x 7 9 9 8 7). Three barre shapes inside four frets, and the Am pentatonic box 1 sits right on top of them: that\'s the rock and blues home base, now with its chords.' },
        { p: 'Same four chords, same song, a completely different sound: the higher zone is brighter and sits above a bass player or a second guitar. Players choose zones for exactly that reason, and so a fill can grow out of the shape you\'re already holding.' },
        { tip: 'Three habits that make zones easy: keep a common note where you can (C and Am share C and E), move the smallest distance, and let the root jump strings rather than your hand jump frets.' },
        { video: { id: 'W4ZeaKoynv4', title: 'Demystifying Triads and CAGED: Unlock the fretboard and improvise freely', note: 'How the shapes, the small triads and improvising join up in one area of the neck.' } },
      ],
    },
    {
      kind: 'learn', title: '12 · The three directions: how mastery is built', blocks: [
        { p: 'There are three ways to travel the CAGED map, and you need all three. Most players only ever do the first and wonder why the neck still feels foggy.' },
        { list: [
          '**Along the neck: one chord, five shapes.** C, A, G, E, D, up and back. This teaches the order and the hand-overs. (Goal 1.)',
          '**Round the keys: one shape, every chord.** The E shape for C, then F, B♭, E♭, A♭… round the circle of 4ths, then the same with the A shape, then the others. This teaches the root finders: your hand learns to drop a shape on any root without counting. (Goal 4.)',
          '**Across a key: many chords, one zone.** I – vi – IV – V without moving your hand, in each of the five zones. This is the one songs use. (Goal 7.)',
        ] },
        { p: 'Then a fourth, which joins them: **random calls**. Someone (the "Play it with this shape" quiz, or a friend) names a chord and a shape, and you play it. When you can answer any call in about two seconds, the map is in your hands, not in your head.' },
        { tip: 'Ten minutes a sitting is enough: three minutes along, three round the keys, three across, one of random calls. Rotate which shape leads.' },
      ],
    },
    {
      kind: 'learn', title: '13 · Finding any note with the shape around it', blocks: [
        { p: 'CAGED is also a note finder. Any note is the root, 3rd or 5th of some chord. If you know a chord\'s shapes, you know where its notes are. Want every **F#** on the neck? F# is the 3rd of **D**: play D in its five shapes and the 3rds are your F#s. The **E** shape of D at the 10th fret has its 3rd on the G string, 11th fret: F#.' },
        { p: 'Combine that with the octave shapes from Level 1 and nothing on the neck is far from something you know: a root from the low strings, an octave shape to jump strings, a chord shape to see the neighbours.' },
      ],
    },
    {
      kind: 'learn', title: '14 · CAGED in real music', blocks: [
        { p: 'What players actually do with it, and where KGuitar puts it to work:' },
        { list: [
          '**A second part.** When someone else plays open chords, play the same song in the 5th- or 8th-fret zone. It fills the sound instead of doubling it.',
          '**Capo thinking.** Capo players think in shapes: capo 2 plus the G shape sounds A. CAGED is the same idea without the capo.',
          '**Fills between chords.** In every shape a finger is free. Hammer it onto the note above a chord tone (a sus4, sus2 or 6 sound for a moment) and let it fall back. From the E shape, the 3rd on the G string goes up to the 4th; from the A shape, the 3rd on the B string goes up to the 4th or back to the 2nd; from the D shape, the top-string 3rd goes up to the 4th or back to the 2nd (that\'s Dsus4 and Dsus2 moved anywhere). The fills workshop builds whole parts from these moves.',
          '**Soloing over changes.** When the chord changes, land on its **3rd** in the shape you\'re in. Target notes trains exactly that, chord by chord.',
          '**Call and response.** A phrase in one shape can be answered by the same phrase in the next shape up: it sounds like an answer because it\'s the same idea, higher.',
          '**Moving a lick.** A lick learned over the E shape of A works over the E shape of any chord: move the shape, the lick follows.',
          '**Reading tabs and transcriptions.** When a tab says 8 10 10 9 8 8 or a solo sits around the 12th fret, ask "which chord shape is this inside?" You\'ll learn songs faster because you\'re remembering shapes and their jobs, not strings of numbers.',
          '**The 3rd as a bend target.** Blues and rock players bend up to the chord\'s 3rd from the note below it. In every shape the 3rd is right there, so the bend always lands on something the chord agrees with.',
        ] },
        { p: 'Look ahead: each shape also turns into a **7th chord** by lowering one of its roots two frets to the ♭7 (E shape: the D-string root; A shape: the G-string root; D shape: the B-string root; G shape: the high e root). That\'s Level 5, but you\'ll see it in songs already.' },
        { tip: 'Ukulele: the same system is **CAGFD** (the uke\'s open shapes are C, A, G, F and D). Baritone uses the guitar\'s top four strings, so its shapes are the top halves of the guitar ones. KGuitar\'s pictures and tabs follow your instrument.' },
      ],
    },
    {
      kind: 'learn', title: '15 · What mastery looks like', blocks: [
        { p: 'You have CAGED when all of these are true, without stopping to think:' },
        { list: [
          'Any major or minor chord called out, in any shape called out, under your fingers in **about two seconds**.',
          'Your hand on any chord shape, you can say **which note is the root, the 3rd and the 5th** on every string.',
          'You can play **I – vi – IV – V** (and a minor key\'s i – iv – v) in **all five zones** of any key, in time, without stopping.',
          'Given a fill or lick over one chord, you can play it over **the same shape of another chord**, and in **the next shape up** of the same chord.',
          'You hear whether a chord **moved** or **changed**, and which chord tone is **on top**.',
          'You can **rebuild** a forgotten shape from its root, using the B-string kink.',
        ] },
        { p: 'The practice goals below build each of these. The challenge round is the whole thing at once.' },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Say the root string and the shape before you move a finger.', examples: [
        { q: 'Play D major in the E shape and in the A shape.', steps: ['E shape: root on the low E string. D on the low E is the 10th fret.', 'Barre the 10th fret, build the E shape: 10 12 12 11 10 10.', 'A shape: root on the A string. D on the A string is the 5th fret.', 'Barre the 5th fret, build the A shape: x 5 7 7 7 5.'], answer: 'E shape at the 10th fret, A shape at the 5th fret.', spots: { from: 4, to: 13, marks: midis => shapeMarks(2, false, midis, only('E', 'A'), 4) } },
        { q: 'An E-shape barre at the 5th fret. What chord is it, and is it major or minor?', steps: ['The E shape\'s root is on the low E string, under the barre.', 'Low E string, 5th fret = A.', 'Check the G string: if its note is one fret above the barre (6th fret), that\'s the major 3rd; if it\'s on the barre, it\'s the minor 3rd.'], answer: 'A (A major if the G string is at the 6th fret, A minor if it\'s at the 5th).' },
        { q: 'Play G major with the C shape.', steps: ['The C shape\'s root is on the A string, under the ring finger.', 'G on the A string is the 10th fret.', 'The shape reaches back from there: x 10 9 7 8 7 (index on the 7th fret on the G and high e strings).'], answer: 'x 10 9 7 8 7.', spots: { from: 6, to: 11, marks: midis => shapeMarks(7, false, midis, only('C'), 6) } },
        { q: 'You\'re holding C as the E shape at the 8th fret. Play F, G and Am without leaving frets 7 to 10.', steps: ['F: the nearest shape is the A shape on the A string, 8th fret: x 8 10 10 10 8.', 'G: the C shape reaching back from the A string, 10th fret: x 10 9 7 8 7.', 'Am: the Dm shape on the D string, 7th fret: x x 7 9 10 8.'], answer: 'F = A shape at 8, G = C shape from the 10th fret, Am = Dm shape at 7.' },
        { q: 'Where is the 3rd of A major in the E shape?', steps: ['A in the E shape: barre at the 5th fret.', 'The E shape\'s 3rd is on the G string, one fret above the barre.', 'G string, 6th fret = C#.'], answer: 'G string, 6th fret: C#.', spots: { from: 4, to: 8, marks: midis => shapeMarks(9, false, midis, only('E'), 4) } },
        { q: 'Play B minor in the Am shape.', steps: ['The Am shape\'s root is on the A string.', 'B on the A string is the 2nd fret.', 'Barre the 2nd fret: x 2 4 4 3 2 (the B-string note is one fret lower than in B major).'], answer: 'x 2 4 4 3 2.' },
        { q: 'Find an F# around the 11th fret using a chord you know.', steps: ['F# is the 3rd of D.', 'D in the E shape is at the 10th fret.', 'The E shape\'s 3rd is on the G string, one fret above the barre: 11th fret.'], answer: 'G string, 11th fret.' },
        { q: 'Work out F in the D shape, and check it against the B-string kink.', steps: ['The D shape\'s root is on the D string: F on the D string is the 3rd fret.', 'Open D is x x 0 2 3 2. Every fret moves up by 3 (the nut becomes your index on the 3rd fret).', 'x x 3 5 6 5. The B-string note (6) sits one fret further than the G-string note (5) next to it: that\'s the kink.'], answer: 'x x 3 5 6 5.', spots: { from: 2, to: 7, marks: midis => shapeMarks(5, false, midis, only('D'), 2) } },
        { q: 'Play A minor\'s i – iv – v (Am, Dm, Em) around the 5th fret.', steps: ['Am: the Em shape at the 5th fret, 5 7 7 5 5 5.', 'Dm: root on the A string, 5th fret: the Am shape, x 5 7 7 6 5.', 'Em: root on the A string, 7th fret: the Am shape again, x 7 9 9 8 7.'], answer: 'Am = Em shape at 5, Dm = Am shape at 5, Em = Am shape at 7.' },
        { q: 'A fill: you hold C in the A shape at the 3rd fret. Where does the free finger go for a sus4 hammer-on?', steps: ['The A shape\'s 3rd is on the B string (5th fret, E).', 'The 4th (F) is one fret above it: B string, 6th fret.', 'Hammer from 5 to 6 and back: Csus4 to C.'], answer: 'B string, 5th fret to 6th fret and back.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Your ear needs two skills to go with the map. First: tell a chord that **moved** to a new shape from a chord that **changed**. The same chord in a new shape keeps its mood; a new chord brings a new bass and a new mood. Second: hear **which chord tone is on top**. That top note is what a listener hums, so choosing the shape whose top note fits the melody is how players make chords sing.' },
        { list: ['Play C in the C shape and then the E shape: same chord, brighter and higher.', 'Play C (E shape) then F (A shape): a real change. Hear the bass move.', 'Strum each shape of C and sing its highest note, then sing down to C.'] },
      ],
      drills: [
        { label: 'Same chord, new shape?', quiz: 'l4-same-ear', minutes: 5, goal: '8 out of 10' },
        { label: 'Which chord tone is on top?', quiz: 'l4-top-ear', minutes: 5, goal: '7 out of 10' },
        { label: 'Major or minor? (by ear)', quiz: 'ch-ear', minutes: 3 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Naming a chord after its shape ("that\'s a C shape, so it\'s C").', right: 'The shape is the pattern; the name is the note under the root. A C shape with its root on the A string\'s 10th fret is G.' },
        { wrong: 'Learning the five shapes as five separate chords.', right: 'Learn them as one chain in the order C A G E D, joined by shared roots. Move through them on one chord until the hand-overs feel natural.' },
        { wrong: 'Forcing full six-string C and G shapes.', right: 'Use their pieces: top three or four strings, or the bottom three. The full shape is the map, not the grip.' },
        { wrong: 'Knowing the shapes but not the jobs of the notes.', right: 'Say R, 3, 5 as you play each shape. The 3rd is the note to aim at when the chord changes.' },
        { wrong: 'Jumping up and down the neck for every chord change.', right: 'Pick a zone and choose the nearest shape for each chord. Move a finger or two, not your whole hand.' },
        { wrong: 'Using the minor C and G shapes as full chords.', right: 'Lean on the Em, Am and Dm shapes, and use pieces of the others.' },
        { wrong: 'Treating CAGED as only chords.', right: 'Every scale box, arpeggio and triad lives inside a shape. Use the shapes as the frame for everything you solo with.' },
        { wrong: 'Thinking the order changes with the chord.', right: 'It is always C A G E D, wrapping round. Only the starting shape moves.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'A few goals a sitting is plenty. Always over a beat or the metronome, and say the root string and the shape out loud before each one.',
      challenge: { label: 'I – vi – IV – V – I in every zone, from the nut to the 15th fret', ex: { label: 'C: I – vi – IV – V – I in every zone', tab: 'cagedZones' }, goal: 'one clean run at 72 BPM', why: 'Five zones back to back is the whole key over the whole neck. Do this and the fog is gone.' },
      goals: [
        { focus: 'The five shapes of C', tasks: [{ label: 'C in every shape, up and back', ex: { label: 'C in every shape, up and back', tab: 'cagedC' }, minutes: 8, goal: 'no stops at 66 BPM' }] },
        { focus: 'Name them, place them', tasks: [{ label: 'Which shape is this?', quiz: 'caged-name', minutes: 4 }, { label: 'The order up the neck', quiz: 'caged-order', minutes: 3 }] },
        { focus: 'Any chord, any shape', tasks: [{ label: 'Play it with this shape (play the answer, the mic checks)', quiz: 'caged-where', how: 'play', minutes: 6, goal: '2 stars' }, { label: 'G in every shape', ex: { label: 'G in every shape, up and back', tab: 'cagedG' }, minutes: 6 }] },
        { focus: 'One shape, every chord', tasks: [{ label: 'Every chord round the circle of 4ths in the E shape', ex: { label: 'Circle of 4ths, E shape', tab: 'caged4thsE' }, minutes: 6, goal: 'no stops at 70 BPM' }, { label: 'The same in the A shape', ex: { label: 'Circle of 4ths, A shape', tab: 'caged4thsA' }, minutes: 6 }] },
        { focus: 'Minor shapes', tasks: [{ label: 'Am in every shape', ex: { label: 'Am in every shape, up and back', tab: 'cagedAm' }, minutes: 6, goal: 'no stops at 66 BPM' }] },
        { focus: 'The jobs of the notes', tasks: [{ label: 'C major arpeggio in every shape: say R, 3, 5 as you play', ex: { label: 'C major arpeggio, every shape', spec: { kind: 'arpeggio', root: 'C', type: 'maj', position: -1 } }, minutes: 8 }] },
        { focus: 'One zone', tasks: [{ label: 'I – vi – IV – V – I around the 3rd fret', ex: { label: 'I – vi – IV – V – I in one zone', tab: 'cagedZone' }, minutes: 6 }, { label: 'The same around the 8th fret', ex: { label: 'I – vi – IV – V – I, the E-shape zone', tab: 'cagedZoneE' }, minutes: 6 }, { label: 'A minor: i – iv – v – i around the 5th fret', ex: { label: 'Am: i – iv – v – i in one zone', tab: 'cagedZoneMinor' }, minutes: 5 }] },
        { focus: 'Fills from the shapes', tasks: [{ label: 'Every shape with a hammer-on from the free finger', ex: { label: 'Every shape with a hammer-on', tab: 'cagedEmb' }, minutes: 6 }, { label: 'Fills between chords workshop: the "shells" and "free finger" steps', tool: 'fills', minutes: 10 }] },
        { focus: 'Hear it', tasks: [{ label: 'Same chord, new shape?', quiz: 'l4-same-ear', minutes: 5 }, { label: 'Which chord tone is on top?', quiz: 'l4-top-ear', minutes: 5 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { p: 'Put the map to work straight away:' },
        { list: [
          '**Jam**: set up C, Am, F, G and strum it in the 3rd-fret zone, then the 8th-fret zone. Then let the band play and add the sus4 hammer-on from each shape.',
          '**Target notes**: land on the 3rd of each chord in the zone you\'re in. Every 3rd is in the shape under your hand.',
          '**Call and response**: answer each phrase in the next shape up.',
          '**A song from your library**: play its chords in a zone instead of open position. The floating hand diagram shows the shape you\'re holding.',
        ] },
      ],
      tasks: [
        { label: 'Jam: I – vi – IV – V in C, zone by zone', tool: 'jam', minutes: 10 },
        { label: 'Target notes: land on the 3rds', tool: 'targets', minutes: 8 },
        { label: 'Fills between chords', tool: 'fills', minutes: 10 },
        { label: 'Call and response', tool: 'cr', minutes: 6 },
        { label: 'The CAGED explorer: any chord, any shape, with its scale and arpeggio', tool: 'caged', minutes: 5 },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Recall', label: 'The order up the neck', quiz: 'caged-order' },
        { skill: 'Apply', label: 'Play it with this shape (mic)', quiz: 'caged-where', how: 'play' },
        { skill: 'Hear', label: 'Same chord, new shape?', quiz: 'l4-same-ear' },
        { skill: 'Play', label: 'I – vi – IV – V – I in one zone (mic)', ex: { label: 'I – vi – IV – V – I in one zone', tab: 'cagedZone' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "CAGED: the map of the whole neck". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) what the letters mean and why the order always stays C A G E D, (2) how I find a chord in a given shape (which string the root is on for each shape), (3) where the 3rd is in the E, A and D shapes and why it matters, (4) how the shapes hand over to each other, (5) how to play I–vi–IV–V in one zone, (6) how CAGED connects to scales, triads and fills. Keep it short.',
        points: ['the five open chords as movable patterns; the order never changes, only the start', 'E and G shapes: root on the low E; A and C shapes: root on the A string; D shape: root on the D string', 'E shape: G string; A shape: B string; D shape: high e. The 3rd says major or minor and is the note to aim at', 'neighbouring shapes share a root: keep it and build the next shape round it', 'the nearest shape for each chord, one area of the neck', 'every scale box, arpeggio and triad lives inside a shape; fills come from the free finger next to a chord tone'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: SERIFF_CAGED,
      books: [
        { book: 'Fretboard Logic SE', where: 'The part on the five chord forms and how they join up the neck', why: 'The book CAGED teaching grew out of: the chord forms, then the scales built on them.' },
        { book: 'The CAGED System and 100 Licks for Blues Guitar', where: 'The shape chapters (one per shape), each with its licks', why: 'Every shape as a chord, a scale and real blues licks over it.' },
        { book: 'Guitar Fretboard Mastery', where: 'The chapters on chord shapes and the fretboard map', why: 'More drills for seeing the notes inside the shapes.' },
        { book: 'Triads and Inversions', where: 'The opening chapters on the top-string triads', why: 'The small pieces of each shape, ready for lesson 3 of this level.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'The sections on chord construction and scale shapes', why: 'How the chords and the scale positions line up.' },
      ],
      blocks: [
        { p: '**Next in Level 4**: the five pentatonic boxes laid over these shapes, then the small triads on the top three strings (the pieces you met in section 9), then the major scale in five positions.' },
        { p: '**Extra credit**: pick one song you strum in open position and work out its chords in two other zones. Record all three with Record yourself and listen back: which one sits best with the singer, and why?' },
      ],
    },
  ],
}

export const LEVEL4: CourseLesson[] = [CAGED]
