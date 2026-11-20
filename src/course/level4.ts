// Theory course, Level 4: Mapping the fretboard. Lesson 1 is the whole CAGED system in one deep lesson (owner 2026-11-16:
// "one huge lesson", "don't cut corners", "true mastery", connected to the fills, Target notes, Call and response and Jam).
// Our own words; the owner's books (Fretboard Logic, the CAGED blues book, Fretboard Mastery, Triads and Inversions, the
// Practical Guide) are pointed to, never copied. Every fret below was checked with learn/caged.ts (course/cagedTabs.ts).
import type { CourseLesson } from './types'
import { shapeMarks, shapesOf, scaleInShape } from './cagedTabs'
import { boxMarks, topTriads } from './pentTriadTabs'

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

// ---- Lesson 2: the five pentatonic boxes ------------------------------------------------------------------------
// A minor pentatonic on guitar: box 1 frets 5–8 (Am E shape / C G shape), box 2 7–10 (Am D shape / C E shape),
// box 3 9–13 (Am C shape / C D shape), box 4 12–15 (Am A shape at 12 / C C shape at 12), box 5 2–5 (Am G shape / C A shape).
const AM_SEQ = (label: string, type: 'threes' | 'fours' | 'thirds' | 'triplets', position: number) => ({ label, spec: { kind: 'sequence' as const, root: 'A', type, position, scale: 'minor pentatonic' } })
const AM_BOX = (label: string, position: number) => ({ label, spec: { kind: 'scale' as const, root: 'A', type: 'minor pentatonic', position } })

export const PENT_BOXES: CourseLesson = {
  id: 'c4-pentboxes', level: 4, n: 2, title: 'The five pentatonic boxes: soloing over the whole neck', minutes: 90,
  goal: 'Play the minor and major pentatonic in all five boxes in any key, see each box around its CAGED chord shape, move between boxes in the middle of a phrase, bend the right notes in every box, and land on the chord that\'s playing wherever you are on the neck.',
  builds: ['the minor pentatonic box 1', 'the major pentatonic and the relative trick', 'the CAGED shapes', 'chord tones (R, 3, 5)', 'bends and vibrato'],
  topics: ['pentatonic', 'minor pentatonic', 'major pentatonic', 'scale positions', 'CAGED', 'soloing', 'target notes', 'bends'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Almost every guitarist gets stuck in **box 1**. It\'s where you learned the minor pentatonic, every lick lives there, and after a while every solo sounds the same: same notes, same octave, same five frets. The players you admire don\'t have more notes than you. The minor pentatonic has five. They just have **all of them, everywhere**: they move up the neck for the high, singing part of a solo and come back down to finish, and the notes under their fingers always relate to the chord.' },
        { p: 'There are **five boxes**, and they are the five CAGED shapes you just learned with the scale notes filled in around them. So you are not learning four new scales. You are colouring in a map you already have.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['play the minor and major pentatonic in all five boxes, in any key;', 'see the chord shape inside each box, so you always know where the root and the 3rd are;', 'move from one box to the next in the middle of a phrase, by sliding, by shifting, or by running a diagonal;', 'bend the right notes in every box and land them in tune;', 'play the same lick in five places, and land on the chord that\'s playing, wherever you are.'] },
        { play: { label: 'A minor pentatonic across the neck: box 1, then up through the boxes on a diagonal', seq: [45, 48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72, 74, 76], gap: 0.22 } },
        { tip: 'Another long one. Do one box a sitting, then the moves between them. The practice goals mark your progress.' },
      ],
    },
    {
      kind: 'learn', title: '1 · Box 1 again, as a chord shape', blocks: [
        { p: 'Look at A minor pentatonic box 1 (frets 5–8) with the jobs of its notes marked. The **root**, **♭3** and **5** are the A minor chord. Together they make the **Am E shape** from the CAGED lesson: the minor barre at the 5th fret. The **4** and **♭7** are the two notes that fill the gaps.' },
        { spots: { caption: 'A minor pentatonic, box 1 (frets 5–8). The highlighted notes (R, ♭3, 5) are the Am barre chord, the E shape. The 4 and ♭7 fill in around it.', from: 4, to: 8, marks: midis => boxMarks(midis, 9, true, 0, 4) } },
        { p: 'Look at it the other way and it\'s also **C major**: the same five notes with C as home (the relative trick from Level 3). Box 1 holds the **C chord\'s G shape** (frets 5–8). So every box is two chords at once: the minor one and its relative major.' },
        { tip: 'This is the key idea of the lesson. A box isn\'t a pattern of dots: it\'s a **chord shape plus two passing notes**. See the chord and you can always find home.' },
      ],
    },
    {
      kind: 'learn', title: '2 · The five boxes, end to end', blocks: [
        { p: 'Each box starts on the next note of the scale along the low E string, and each one sits on the next CAGED shape. For **A minor pentatonic** on guitar:' },
        { list: [
          '**Box 1**: frets 5–8. Am **E shape** (C major\'s G shape). Roots on the low E, D and high e strings.',
          '**Box 2**: frets 7–10. Am **D shape** (C\'s E shape). Roots on the D string (7) and the B string (10).',
          '**Box 3**: frets 9–13. Am **C shape** (C\'s D shape). Roots on the A string (12) and the B string (10).',
          '**Box 4**: frets 12–15. Am **A shape** at the 12th fret (C\'s C shape). Roots on the A string (12) and the G string (14).',
          '**Box 5**: frets 2–5, or 14–17 an octave up. Am **G shape** (C\'s A shape). Roots on the low E (5), G (2) and high e (5) strings. Then box 1 starts again.',
        ] },
        { spots: { caption: 'A minor pentatonic, all five boxes. Box 5 at frets 2–5, then boxes 1–4 from the 5th fret up. R = A, highlighted = the Am chord tones.', from: 0, to: 15, marks: midis => boxMarks(midis, 9, true, 'all') } },
        { p: 'The order of the chord shapes is **E, D, C, A, G**: CAGED read backwards, because here we start from the E shape. Same chain, same wrap-around.' },
        { tip: 'Learn the boxes by their **roots** first. A box you can\'t remember is quick to rebuild from its roots and the chord shape around them.' },
      ],
    },
    {
      kind: 'learn', title: '3 · Each box, with its chord', blocks: [
        { p: 'Practise every box the same way: **strum the chord shape, play the box, strum the chord again**. Your eyes and hands learn the scale as the chord with notes around it, and the chord is the part that changes when the music changes.' },
        { spots: { caption: 'Box 2 (frets 7–10): the Am D shape inside it. Roots on the D and B strings.', from: 6, to: 10, marks: midis => boxMarks(midis, 9, true, 1, 6) } },
        { spots: { caption: 'Box 3 (frets 9–13): the Am C shape inside it. Roots on the A and B strings. Note the B string sits one fret higher: the kink.', from: 8, to: 13, marks: midis => boxMarks(midis, 9, true, 2, 8) } },
        { spots: { caption: 'Box 4 (frets 12–15): the Am A shape at the 12th fret. Roots on the A and G strings.', from: 11, to: 15, marks: midis => boxMarks(midis, 9, true, 3, 11) } },
        { spots: { caption: 'Box 5 (frets 2–5): the Am G shape. Roots on the low E, G and high e strings.', from: 1, to: 5, marks: midis => boxMarks(midis, 9, true, 4, 1) } },
        { p: 'Every box has **two notes on each string**. Watch the **B-string kink**: when a box crosses from the G string to the B string, its fingering shifts up a fret on the B and high e strings. That\'s why boxes 2 and 3 feel lopsided.' },
      ],
    },
    {
      kind: 'learn', title: '4 · The glue between boxes', blocks: [
        { p: 'Neighbouring boxes **share notes**: the right-hand column of one box is the left-hand column of the next. On every string, the higher note of box 1 is the lower note of box 2, and so on. So "moving to the next box" means keeping the notes you\'re on and letting the rest of your hand move up.' },
        { spots: { caption: 'Boxes 1 and 2 together (frets 5–10): the notes at frets 7 and 8 belong to both.', from: 4, to: 10, marks: midis => [...boxMarks(midis, 9, true, 0, 4), ...boxMarks(midis, 9, true, 1, 4)].filter((m, i, a) => a.findIndex(x => x.s === m.s && x.f === m.f) === i) } },
        { p: 'Three ways to travel, and good players use all three in one solo:' },
        { list: [
          '**Slide**: on one string, slide from a box\'s top note up to the next note of the scale. Your whole hand arrives in the next box. It\'s smooth and vocal, the most common way.',
          '**Shift on a shared note**: play up the low strings in box 1, then on the G string move your first finger to the shared note and carry on in box 2. Nobody hears the change.',
          '**Diagonal**: three notes on each string instead of two, so each string climbs a little further up the neck. Two octaves sweep across three boxes in one run: the long, flowing lines of Gilmour, Hendrix and Clapton.',
        ] },
        { tip: 'Practise moving **in the middle of a phrase**, not at the end of a scale. A solo never stops to change position.' },
      ],
    },
    {
      kind: 'learn', title: '5 · Where to land: the targets in every box', blocks: [
        { p: 'A phrase sounds finished when it **ends on a chord tone**: the root, the ♭3 or the 5 of a minor chord. Because each box is built round the chord shape, those landing notes are always one or two frets from where your fingers are.' },
        { list: ['**The root**: home, final. In each box, know your two or three roots without looking.', '**The ♭3**: the minor colour. Ending a phrase on it sounds sad and sweet: the singer\'s note.', '**The 5**: strong and open. A good place to pause before the phrase goes on.', '**The 4 and ♭7**: passing and leaning notes. They want to move: the 4 to the ♭3 or the 5, the ♭7 to the root. Hold one at the end of a phrase and it sounds unfinished (sometimes that\'s what you want).'] },
        { tip: 'Ear first: play the drone or the Am chord, play each note of a box against it and say what it does (rests, leans, wants to move). That\'s the ear drill below too.' },
      ],
    },
    {
      kind: 'learn', title: '6 · Bends in every box', blocks: [
        { p: 'The pentatonic is a **bending scale**: its gaps are a whole step (two frets) between most notes, so a note bent up a whole step lands exactly on the next note of the scale. The three bends that always work:' },
        { list: ['**4 up to 5** (a whole step). The most famous rock bend. In box 1 it\'s the G string, 7th fret.', '**♭7 up to the root** (a whole step). In box 1 it\'s the B string, 8th fret: it lands on the A of the high e string\'s 5th fret.', '**♭3 up to the 4** (a whole step), or just a small **curl** a quarter of the way up, towards the major 3rd: the blues "in-between" note. In box 1 it\'s the high e string, 8th fret.'] },
        { p: 'Every box has the same three bends, on different strings. **Box 2**: the ♭7 on the B string (8th fret) up to the root, and the 4 on the high e (10th fret) up to the 5. **Box 3**: the ♭7 on the G string (12th fret) up to the root, and the ♭3 on the B string (13th fret) up to the 4. **Box 5**: the 4 on the B string (3rd fret) up to the 5, and the ♭7 on the high e (3rd fret) up to the root.' },
        { tip: 'Check every bend: play the target note first, then bend to match it. Bends on the G, B and high e strings are easiest. Use three fingers on the string behind the bending finger.' },
      ],
    },
    {
      kind: 'learn', title: '7 · The major pentatonic: same boxes, a different home', blocks: [
        { p: 'You know from Level 3 that **C major pentatonic** has the same notes as A minor pentatonic. So it also has the same five boxes. Only the **home note** changes, and with it the chord shape you see in each box: the C major shapes instead of the A minor ones.' },
        { p: 'KGuitar numbers boxes from the home note on the low E string, so **C major box 1** (frets 7–10) is the same set of dots as **A minor box 2**. Every major box k is minor box k + 1. You don\'t have to learn anything new, only where the major home sits in each box.' },
        { spots: { caption: 'C major pentatonic around the 8th fret: the C chord (E shape) inside it, with the 2 and 6 next to the chord tones. These are the same dots as A minor box 2.', from: 6, to: 10, marks: midis => boxMarks(midis, 0, false, 0, 6) } },
        { p: 'What changes is the **sound**: lean on C, E and G (the C chord) and the dots sound sweet and major; lean on A, C and E (the Am chord) and the same dots sound minor. The scale doesn\'t decide the mood, **the notes you land on** do.' },
      ],
    },
    {
      kind: 'learn', title: '8 · Playing over chord changes', blocks: [
        { p: 'A solo isn\'t over one chord. In a progression like **Am – F – C – G** (vi – IV – I – V in C), A minor pentatonic fits every chord, because all its notes belong to the key. But "fits" isn\'t the same as "says something". Three levels, each more musical:' },
        { list: [
          '**One scale over everything.** Am pentatonic over the whole song. Safe and bluesy, but it doesn\'t follow the chords.',
          '**Same scale, land on each chord.** Stay in one box, but end each phrase on a note of the chord that\'s playing: C (the 3rd) over Am, A (the 3rd) over F, E (the 3rd) over C, G (the root) over G. Suddenly the solo follows the song.',
          '**A pentatonic per chord.** Switch to the pentatonic of each chord: G major pentatonic over G (it adds B, the G chord\'s 3rd), F major pentatonic over F (it adds F). This is the Mayer, Clapton and Asato move: the shape you\'re in shifts with the chord, using the box map to find each one nearby.',
        ] },
        { p: 'Over a **12-bar blues** the classic move is the same idea: A minor pentatonic for the grit, then the **A major pentatonic** (three frets lower) over the I chord for a sweeter sound, and back. You\'ll go deeper in Level 5.' },
        { tip: 'Target notes trains level two directly: each chord, land on its 3rd, in the box you choose.' },
      ],
    },
    {
      kind: 'learn', title: '9 · One idea, five places', blocks: [
        { p: 'A lick is a **shape of notes**, so it can be played in every box: the same notes, or the same notes an octave up, with five different fingerings. Moving a lick through the boxes does three things at once: it teaches you the boxes, it gives you five sounds for one idea (the B-string version sings, the low-string version growls), and it\'s how players build a solo: say it, then say it again higher.' },
        { p: 'Two more classic ways to make a box musical, not mechanical:' },
        { list: ['**Sequences**: groups of three or four notes stepping up the box (1-2-3, 2-3-4, …). They build speed and give you endless phrases.', '**Call and response**: a short phrase in one box, a reply in the next one up. A conversation that climbs.'] },
        { p: 'And one place every blues player knows: the small area round the **root on the B string** (10th fret for A, top of box 2). B.B. King built a career there: a root, the notes a step either side, and a vibrato.' },
      ],
    },
    {
      kind: 'learn', title: '10 · What mastery looks like', blocks: [
        { p: 'You own the pentatonic when all of these are true without thinking:' },
        { list: [
          'Called a key and a box number, you\'re in it in **about two seconds**, minor or major.',
          'In any box, you can point to the **roots**, the **♭3** and the **5**, and name the **chord shape** inside it.',
          'You can **run a phrase across three boxes** without stopping: sliding, shifting or on a diagonal.',
          'You can play the **three bends** in every box, in tune.',
          'Over a progression, you **land on the chord that\'s playing** in at least two different boxes.',
          'You can play one lick in **all five boxes**, and answer a phrase in the next box up.',
        ] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Find the root first, then the chord shape, then the box.', examples: [
        { q: 'Where is box 1 of E minor pentatonic, and which chord shape is inside it?', steps: ['Box 1 starts on the root on the low E string.', 'E on the low E: the 12th fret (or open).', 'Box 1 = frets 12–15 (or the open position), with the Em E shape inside: the open Em chord, moved up.'], answer: 'Frets 12–15 (or open), round the Em E shape.' },
        { q: 'You\'re in A minor box 1 and want to go higher. Which box is next, and where?', steps: ['Box 2 sits on the next shape up: the Am D shape.', 'It starts on C, the next scale note on the low E: the 8th fret.', 'Frets 7–10. Shared notes with box 1 at the 7th and 8th frets.'], answer: 'Box 2, frets 7–10.', spots: { from: 6, to: 10, marks: midis => boxMarks(midis, 9, true, 1, 6) } },
        { q: 'In box 2 of A minor, which note bends up to the root?', steps: ['The ♭7 bends a whole step up to the root.', 'The ♭7 of A is G.', 'In box 2, G is on the B string, 8th fret. Bend it two frets: it sounds A.'], answer: 'B string, 8th fret, bent a whole step.' },
        { q: 'Where is G major pentatonic box 1?', steps: ['Major box 1 starts on the major root on the low E.', 'G on the low E: the 3rd fret.', 'The box is the same dots as E minor box 2 (frets 2–5), with the G chord\'s E shape inside it.'], answer: 'Frets 2–5, round the G chord\'s E shape at the 3rd fret.' },
        { q: 'Over the progression Am – F – C – G in box 1, which note do you land on for each chord?', steps: ['Am: its 3rd is C: high e string, 8th fret (or the G string, 5th).', 'F: its 3rd is A: high e or D string, root of the box.', 'C: its 3rd is E: B string, 5th fret.', 'G: its 3rd (B) isn\'t in the scale, so land on its root, G: B string, 8th fret.'], answer: 'C, A, E, G: the 3rd of each chord, or the root when the 3rd isn\'t in the scale.' },
        { q: 'A blues in D. Where are the minor pentatonic box 1 and the major pentatonic box 1?', steps: ['D minor pentatonic box 1: D on the low E is the 10th fret: frets 10–13.', 'D major pentatonic: the minor box three frets lower, from the 7th fret (B minor box 1 = D major).', 'Or think of it the KGuitar way: D major box 1 starts on D at the 10th fret, with the D chord\'s E shape: frets 9–12.'], answer: 'Minor: frets 10–13. Major: the B minor box 1 shape at the 7th fret, or D major box 1 at frets 9–12.' },
        { q: 'You play A C D (root, ♭3, 4) on the A and D strings in box 1. Play the same idea in box 4.', steps: ['In box 4 the roots are on the A string, 12th fret, and the G string, 14th fret.', 'From the A-string root: A (A 12), C (A 15), D (D 12).', 'Same notes, one octave up, a different fingering.'], answer: 'A string 12, A string 15, D string 12.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'The boxes give you the notes; your ear decides which ones to play. Two skills matter most. First, hear **what each note does against the chord**: the root rests, the ♭3 is the minor colour, the 4 leans, the 5 is open, the ♭7 wants to rise. Second, hear the **same phrase in a new place**: higher means brighter and more urgent, not a different idea.' },
        { list: ['Over an A drone (or a held Am chord), play each note of box 1 slowly and say what it does.', 'Play the phrase A C D C A in box 1, then in box 4. Same idea, an octave up.', 'Bend the 4 up to the 5, then play the 5 straight. Do they match?'] },
      ],
      drills: [
        { label: 'Which pentatonic note?', quiz: 'l4-pent-deg-ear', minutes: 5, goal: '8 out of 10' },
        { label: 'Which scale? (minor, major, blues…)', quiz: 'l3-scale-ear', minutes: 4 },
        { label: 'Ear training path', tool: 'earpath', minutes: 5 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Learning five boxes as five unrelated patterns.', right: 'Learn each box around its chord shape, and learn the shared notes between neighbours.' },
        { wrong: 'Running boxes up and down and calling it soloing.', right: 'Make phrases. Start and end them on chord tones, and leave space between them.' },
        { wrong: 'Changing boxes only at the end of a run.', right: 'Move in the middle of a phrase: slide, shift on a shared note, or run a diagonal.' },
        { wrong: 'Bending out of tune.', right: 'Play the target note, then bend to match it. Support the bend with the fingers behind.' },
        { wrong: 'Thinking major and minor pentatonic are different shapes.', right: 'Same five boxes. Only the home note, and the chord you lean on, change.' },
        { wrong: 'Ignoring the chord changes.', right: 'Land on a note of the chord that\'s playing, its 3rd when you can.' },
        { wrong: 'Forgetting box 5 lives near the nut too.', right: 'In most keys box 5 has a low version (A: frets 2–5) and a high one (14–17). Both are the same box.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Always over a backing track or a drone, never in silence. Say the root strings and the chord shape before each box.',
      challenge: { label: 'One solo over Am – F – C – G that uses three boxes and lands on every chord', ex: { label: 'Land on each chord in box 3', tab: 'pentTargets3' }, goal: 'then improvise 16 bars over the Jam band, moving through at least three boxes', why: 'This is soloing: the whole neck, the chord changes and the ear, all at once.' },
      goals: [
        { focus: 'Each box with its chord', tasks: [{ label: 'Am pentatonic: each box around its chord shape', ex: { label: 'Each box around its chord shape', tab: 'pentBoxChord' }, minutes: 10, goal: 'no stops at 72 BPM' }] },
        { focus: 'All five boxes', tasks: [{ label: 'A minor pentatonic, all five boxes', ex: AM_BOX('A minor pentatonic, all five boxes', -1), minutes: 8 }, { label: 'Box 2 alone, until it\'s as easy as box 1', ex: AM_BOX('A minor pentatonic, box 2', 1), minutes: 4 }, { label: 'Box 4 alone', ex: AM_BOX('A minor pentatonic, box 4', 3), minutes: 4 }] },
        { focus: 'Joining boxes', tasks: [{ label: 'Low strings in one box, high strings in the next', ex: { label: 'Joining the boxes', tab: 'pentLink' }, minutes: 6 }, { label: 'The diagonal: three notes a string', ex: { label: 'The diagonal across the boxes', tab: 'pentDiag' }, minutes: 6, goal: 'clean at 60 BPM (triplets)' }] },
        { focus: 'One idea, five places', tasks: [{ label: 'One phrase in all five boxes', ex: { label: 'One phrase, five boxes', tab: 'pentLickBoxes' }, minutes: 6 }] },
        { focus: 'Sequences', tasks: [{ label: 'Box 1 in 3s', ex: AM_SEQ('A minor pentatonic in 3s, box 1', 'threes', 0), minutes: 4 }, { label: 'Box 2 in 4s', ex: AM_SEQ('A minor pentatonic in 4s, box 2', 'fours', 1), minutes: 4 }] },
        { focus: 'Land on the chords', tasks: [{ label: 'Am F C G: land on each chord in box 1', ex: { label: 'Land on each chord in box 1', tab: 'pentTargets' }, minutes: 6 }, { label: 'Target notes', tool: 'targets', minutes: 8 }] },
        { focus: 'The major side', tasks: [{ label: 'C major pentatonic: each box around the C chord', ex: { label: 'C major pentatonic around its chord shapes', tab: 'pentBoxChordMaj' }, minutes: 8 }] },
        { focus: 'Hear it', tasks: [{ label: 'Which pentatonic note?', quiz: 'l4-pent-deg-ear', minutes: 5 }, { label: 'Call and response, answer in the next box', tool: 'cr', minutes: 6 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { p: 'Take the boxes out of the exercises and into songs:' },
        { list: [
          '**Jam**: a minor groove in A (or the blues). First chorus in box 1, second in box 2, third climbing to box 4, then back down to finish on the root in box 1. That\'s the shape of a real solo.',
          '**Improv coach**: record a few choruses and see which notes you lean on and where you stayed.',
          '**Fills between chords**: the pentatonic fills step uses the major pentatonic around each chord shape; now you can play them in any box.',
          '**Must-know licks**: pick a box 1 lick and move it to box 4.',
        ] },
      ],
      tasks: [
        { label: 'Jam: solo through the boxes', tool: 'jam', minutes: 10 },
        { label: 'Target notes: land on the 3rds', tool: 'targets', minutes: 8 },
        { label: 'Call and response', tool: 'cr', minutes: 6 },
        { label: 'Fills between chords: the pentatonic fills', tool: 'fills', minutes: 8 },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'A minor pentatonic, box 3 (mic)', ex: AM_BOX('A minor pentatonic, box 3', 2) },
        { skill: 'Hear', label: 'Which pentatonic note?', quiz: 'l4-pent-deg-ear' },
        { skill: 'Play', label: 'Land on each chord in box 1 (mic)', ex: { label: 'Land on each chord in box 1', tab: 'pentTargets' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "The five pentatonic boxes". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) how the five boxes relate to the CAGED shapes, (2) where box 2 and box 4 of A minor are and which chord shape sits in each, (3) three ways to move between boxes, (4) the three bends that always work and why, (5) how major and minor pentatonic share boxes, (6) how to play over Am–F–C–G so the solo follows the chords. Keep it short.',
        points: ['each box is a CAGED chord shape with the 4 and ♭7 (or 2 and 6) filled in', 'A minor: box 2 frets 7–10 round the D shape, box 4 frets 12–15 round the A shape', 'slide, shift on a shared note, or run a diagonal three notes a string', '4 to 5, ♭7 to root, ♭3 to 4: whole steps to the next scale note', 'same dots, different home: major box k = minor box k + 1', 'land on each chord\'s 3rd (or root), or switch to each chord\'s pentatonic'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'T8yodJjWT5c', title: 'The Pentatonic Cheat Code: All 5 Patterns' },
      books: [
        { book: 'The CAGED System and 100 Licks for Blues Guitar', where: 'The chapters for each shape: the scale and the licks over it', why: 'Exactly this lesson: each pentatonic shape on its chord shape, with real blues vocabulary in every one.' },
        { book: 'Guided Guitar Scale Practice Routines', where: 'The pentatonic routines', why: 'Structured daily routines for all five positions, sequences and position shifts.' },
        { book: 'Guitar Fretboard Mastery', where: 'The pentatonic and fretboard map chapters', why: 'Seeing the five shapes as one map across the neck.' },
        { book: 'Improvise for Real', where: 'The chapters on hearing scale degrees', why: 'The ear side: hearing what each note does over the chord, so you choose notes, not dots.' },
      ],
      blocks: [
        { p: '**Next**: triads on the top three strings, the small chord shapes inside these boxes that let you play rhythm and lead at the same time.' },
        { p: '**Extra credit**: record a 16-bar solo over Jam that starts in box 1, peaks in box 4 and comes home. Listen back: did each phrase end on a chord tone?' },
      ],
    },
  ],
}

// ---- Lesson 3: triads on the top three strings ---------------------------------------------------------------------
// C on G-B-e: 0-1-0 (2nd inv), 5-5-3 (root position), 9-8-8 (1st inv), 12-13-12 (2nd inv). Am: 2-1-0, 5-5-5, 9-10-8.
// The key of C in frets 3–8: C 5-5-3, Dm 7-6-5, Em 4-5-3, F 5-6-5, G 7-8-7 (or 4-3-3), Am 5-5-5, Bdim 7-6-7.
/** neck marks for a chord's top-string triads: R / 3 (♭3) / 5, roots as roots */
function triMarks(midis: number[], root: number, minor: boolean, keep?: (t: { lo: number; low: string }) => boolean, from = 0) {
  const out: { s: number; f: number; label: string; role: 'root' | 'chord' }[] = []
  const seen = new Set<string>()
  for (const t of topTriads(midis, root, minor)) {
    if (keep && !keep(t)) continue
    for (const n of t.notes) {
      const k = `${n.string}:${n.fret}`
      if (seen.has(k) || (from > 0 && n.fret <= from)) continue
      seen.add(k)
      const iv = (((n.midi - root) % 12) + 12) % 12
      out.push({ s: n.string, f: n.fret, label: iv === 0 ? 'R' : iv === 7 ? '5' : minor ? '♭3' : '3', role: iv === 0 ? 'root' : 'chord' })
    }
  }
  return out
}
const SERIFF_TRIADS = { id: 'NqSf3iV9qpg', title: 'THIS Triad System Will 13X Your RHYTHM Guitar Playing (Daniel Seriff)' }

export const TOP_TRIADS: CourseLesson = {
  id: 'c4-toptriads', level: 4, n: 3, title: 'Triads on the top three strings: small shapes, big sound', minutes: 80,
  goal: 'Play every major and minor triad in all three inversions on the G, B and high e strings, know which note is on top, move between chords with the smallest possible moves, find all seven chords of a key in one small area of the neck, and decorate them with the free fingers the way Mayer, Hendrix and Curtis Mayfield do.',
  builds: ['major and minor triads (R, 3, 5)', 'the CAGED shapes and their top strings', 'the chords of a key', 'Daniel Seriff\'s 5-fret window'],
  topics: ['triads', 'inversions', 'voice leading', 'top strings', 'CAGED', 'rhythm guitar', 'fills', 'chord melody'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Listen closely to the rhythm guitar on a Motown record, a Hendrix ballad, a John Mayer song, a reggae skank or a funk groove. Most of the time it isn\'t playing six-string chords. It\'s playing **three notes on the top three strings**: a small **triad**. It cuts through the band without getting in the bass player\'s way, it leaves fingers free for little melodies, and it moves from chord to chord with tiny changes, so the part sounds smooth and connected.' },
        { p: 'Every chord has **three** of these shapes on the top strings, one for each **inversion** (which note is at the bottom). You met them in the CAGED lesson as the tops of the A, E, D and C shapes. Here you learn them properly: in every key, minor too, and **moving between chords** with the fewest possible moves. That last skill, **voice leading**, is what separates strumming chords from playing music.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['play any major or minor triad in all three inversions on the G, B and high e strings;', 'say which note is on top of each one, and choose the one that fits the melody;', 'change chords by moving a finger or two, with the top note singing a smooth line;', 'find all seven chords of a key in one five-fret area;', 'add the hammer-ons, slides and little melodies that turn triads into a rhythm part like the players you love.'] },
        { prog: { label: 'C, F, G, C as top-string triads, moving as little as possible', chords: [[60, 64, 67], [60, 65, 69], [59, 62, 67], [60, 64, 67]], gap: 1 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Three notes, three orders', blocks: [
        { p: 'A triad is three notes: the **root**, the **3rd** and the **5th**. On three neighbouring strings you play each note once, and there are only three ways to stack them, named after the **lowest** note:' },
        { list: ['**Root position**: the root at the bottom (R – 3 – 5). The **5th is on top**.', '**1st inversion**: the 3rd at the bottom (3 – 5 – R). The **root is on top**.', '**2nd inversion**: the 5th at the bottom (5 – R – 3). The **3rd is on top**.'] },
        { p: 'For **C major** on the G, B and high e strings:' },
        { list: ['**2nd inversion**: 0 1 0 (the top of your open C chord), and again 12 13 12.', '**Root position**: 5 5 3.', '**1st inversion**: 9 8 8.'] },
        { spots: { caption: 'C major on the top three strings, every inversion up the neck. R = C, 3 = E, 5 = G.', from: 0, to: 15, marks: midis => triMarks(midis, 0, false) } },
        { p: 'They come in a fixed order up the neck: **2nd → root position → 1st → 2nd** again an octave up. Each new shape starts where the last one\'s notes "roll over": the lowest note jumps to the top. Learn one and the next is built from it.' },
        { video: { id: 'dV9Q5F6HX-8', title: 'What Are Chord Inversions? • Guitar Theory', note: 'Inversions explained from the ground up: the same three notes, a different one at the bottom.' } },
      ],
    },
    {
      kind: 'learn', title: '2 · They are the tops of the CAGED shapes', blocks: [
        { p: 'You already know these shapes, hidden in the big chords. Take each CAGED shape of C and keep only its top three strings:' },
        { list: ['The **A shape** at the 3rd fret → **5 5 3**: root position (5th on top).', 'The **E shape** at the 8th fret → **9 8 8**: 1st inversion (root on top).', 'The **D shape** at the 10th fret → **12 13 12**: 2nd inversion (3rd on top). The **C shape** (open C) gives the same shape at 0 1 0.', 'The **G shape** keeps a root and a 3rd on top (5 5 8); its triad lives on the middle strings instead.'] },
        { spots: { caption: 'C, E shape at the 8th fret: the top three strings (9 8 8) are the 1st inversion triad. The rest of the barre is the map around it.', from: 7, to: 11, marks: midis => [...shapeMarks(0, false, midis, only('E'), 7)] } },
        { p: 'So the CAGED map tells you where every triad is: find the chord shape, and the triad is sitting on its top strings. And the triad tells you where the chord is: grab three notes and you know which big shape is around them.' },
        { tip: 'This is the link between rhythm and lead. A triad is a tiny chord **and** three notes of every scale box around it. Players move between the two without thinking because they are the same place on the neck.' },
      ],
    },
    {
      kind: 'learn', title: '3 · Minor triads (and the one diminished)', blocks: [
        { p: 'A minor triad lowers the 3rd one fret. In each inversion the 3rd is on a different string, so a different finger moves:' },
        { list: ['**Root position** (R ♭3 5): the 3rd is on the B string. Am: 2 1 0, and 14 13 12.', '**1st inversion** (♭3 5 R): the 3rd is on the G string. Am: 5 5 5 (a one-finger barre).', '**2nd inversion** (5 R ♭3): the 3rd is on the high e. Am: 9 10 8.'] },
        { spots: { caption: 'A minor on the top three strings. ♭3 = C, R = A, 5 = E.', from: 0, to: 15, marks: midis => triMarks(midis, 9, true) } },
        { p: 'A **diminished** triad (R ♭3 ♭5) also lowers the 5th. In a major key there is one, on the 7th degree: in C it\'s **Bdim** (B D F). On the top strings: 7 6 7, or 4 3 1. You\'ll rarely hold it long; it\'s a passing chord that leans hard into the I.' },
      ],
    },
    {
      kind: 'learn', title: '4 · The whole key in one small window', blocks: [
        { p: 'Daniel Seriff\'s idea from Level 2, now on the top strings: every chord of a key can be found **within five frets**, so the hand stays put and the progression happens under it. For **C major** between the 3rd and 8th frets:' },
        { list: ['**C**: 5 5 3', '**Dm**: 7 6 5', '**Em**: 4 5 3', '**F**: 5 6 5', '**G**: 7 8 7 (or 4 3 3)', '**Am**: 5 5 5', '**Bdim**: 7 6 7'] },
        { p: 'Play I – vi – IV – V (C, Am, F, G) here: 5 5 3 → 5 5 5 → 5 6 5 → 7 8 7. Each change moves one or two fingers by a fret or two. That is the sound of a good rhythm part.' },
        { p: 'A key has three such windows on the top strings (one per inversion family), and they repeat at the 12th fret. Learn the one round the **5th fret** first, then the one round the **10th**, then the open one.' },
        { tip: 'Daniel Seriff builds whole rhythm parts in one window like this, then adds the free-finger moves of section 6. His video in Go deeper shows it.' },
      ],
    },
    {
      kind: 'learn', title: '5 · Voice leading: move as little as possible', blocks: [
        { p: '**Voice leading** means thinking of the three strings as three **singers**, each moving to the nearest note of the next chord. Two rules do almost all of it:' },
        { list: ['**Keep the common tones.** If a note is in both chords, don\'t move it. C (C E G) to Am (A C E): C and E stay; only G moves up to A. 5 5 3 → 5 5 5.', '**Move the others by the smallest step.** C to F (F A C): C stays; E steps up to F, G steps up to A. 5 5 3 → 5 6 5.'] },
        { spots: { caption: 'C → F → G around the 5th fret: C (5 5 3) → F (5 6 5) → G (4 3 3 or 7 8 7). Count how far each finger moves.', from: 2, to: 9, marks: midis => [...triMarks(midis, 0, false, t => t.lo >= 3 && t.lo <= 5, 2), ...triMarks(midis, 5, false, t => t.lo >= 4 && t.lo <= 6, 2), ...triMarks(midis, 7, false, t => t.lo >= 3 && t.lo <= 7, 2)].filter((m, i, a) => a.findIndex(x => x.s === m.s && x.f === m.f) === i).map(m => ({ ...m, label: '' })) } },
        { p: 'Now listen to the **top string** on its own. When the chords are voice-led, the top notes make a little tune of their own: G → A → G (or B) → G. Singers, piano players and horn sections are all following these rules, and that\'s why their chord changes sound smooth.' },
        { p: 'The opposite also matters. Sometimes you **want** a jump: moving the whole triad up to the next inversion on the same chord gives a lift without changing the harmony. That\'s the Mayer and Hendrix move: climb through C\'s three shapes over one bar of C.' },
        { tip: 'Voice leading is a skill you\'ll use for the rest of your life: on chords, in fills, and in soloing (landing on the nearest chord tone when the chord changes is the same idea).' },
      ],
    },
    {
      kind: 'learn', title: '6 · Playing them like the pros', blocks: [
        { p: 'A triad on its own is a little bare. The free fingers are what make it music. The moves you\'ll hear on record, all inside the shapes you now know:' },
        { list: [
          '**Hammer on from the note below** a chord tone: the 2nd up to the 3rd, or the 4th down to the 3rd (sus2 and sus4 for a moment). From C\'s 1st inversion (9 8 8): G string 9 is the 3rd, hammer 7 → 9 is the sus2 → 3rd; 10 → 9 is the sus4 falling back.',
          '**Slide in** from a fret below: the whole triad, or just one string. The scoop that makes Mayer and soul parts sound vocal.',
          '**Add the 6th or 9th** on top with the little finger and let it ring, then lift it.',
          '**Play them on the upbeats** with the low strings muted: that\'s the reggae skank and a lot of funk.',
          '**Let the top note be the melody**: pick the inversion whose top note is the melody note. That\'s chord melody, the start of Asato\'s and Atkins\' sound.',
        ] },
        { p: 'The **fills between chords** workshop builds all of these step by step (shells, the free finger, slides, flicks, turns, the neck walk). This lesson is the theory under it: open it once you can play the inversions.' },
        { video: { id: 'tHCzeZo0Ib4', title: 'Learn the Neck With Triads (Part One)', note: 'The same triads moving up the neck: how players use them to find their way around.' } },
      ],
    },
    {
      kind: 'learn', title: '7 · With a band: why small is better', blocks: [
        { p: 'A full six-string chord plays the bass note too, and in a band the bass player already has it. The two collide and the sound gets muddy. A top-string triad stays above the bass, so the band sounds clear and you can be heard without being loud. It also works the other way round: the bass player decides what the **lowest** note is, so your inversion doesn\'t change the chord\'s name. Your choice of inversion only changes **which note is on top**, which is exactly the note the listener hears.' },
        { p: 'One more idea for later: when you **do** want a different bass note (C with E in the bass, written **C/E**), the inversion becomes the chord\'s name. That\'s for Level 6.' },
      ],
    },
    {
      kind: 'learn', title: '8 · The other string sets, and what\'s next', blocks: [
        { p: 'The same three inversions exist on every set of three neighbouring strings: **D-G-B** (the set you used for Seriff\'s window in Level 2), **A-D-G** and **E-A-D**. The shapes look different because of where the B-string kink falls, but the rule (root position, 1st, 2nd, in order up the neck) is the same. Lesson 4 of this level covers them all.' },
        { p: 'The **G-B-e** set comes first because it\'s the most useful: highest, clearest, and closest to where melodies and solos live.' },
      ],
    },
    {
      kind: 'learn', title: '9 · What mastery looks like', blocks: [
        { p: 'You own top-string triads when, without stopping:' },
        { list: [
          'Called any major or minor chord and an inversion, you play it in **about two seconds**.',
          'You can say which note is **on top** of any triad shape you\'re holding.',
          'You can play **I – vi – IV – V** in any key voice-led, moving at most two fingers each change, in all three windows.',
          'You can find all seven chords of a key in **one five-fret window**.',
          'You can **climb** a chord through its three inversions in time, and add a hammer-on or slide to each.',
          'Given a melody note, you can choose the triad that puts it **on top**.',
        ] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Name the inversion, then say which note is on top.', examples: [
        { q: 'Play C major in 1st inversion on the top strings.', steps: ['1st inversion has the 3rd at the bottom and the root on top: E – G – C.', 'Root on top: C on the high e is the 8th fret.', 'Build down: G on the B string (8th fret), E on the G string (9th fret).'], answer: '9 8 8.', spots: { from: 7, to: 10, marks: midis => triMarks(midis, 0, false, t => t.low === '3' && t.lo >= 7 && t.lo <= 9, 7) } },
        { q: 'You play 7 8 7 on the G, B and e strings. What chord, which inversion?', steps: ['G string 7 = D, B string 8 = G, e 7 = B.', 'The notes are G, B and D: G major.', 'The lowest is D, the 5th: 2nd inversion, with B (the 3rd) on top.'], answer: 'G major, 2nd inversion (3rd on top).' },
        { q: 'Play A minor with the root on top.', steps: ['Root on top = 1st inversion: ♭3 – 5 – R = C – E – A.', 'A on the high e: the 5th fret.', 'C on the G string (5th fret), E on the B string (5th fret).'], answer: '5 5 5.' },
        { q: 'You\'re on C (5 5 3). Move to Am with the smallest change.', steps: ['C = C E G, Am = A C E: C and E are common.', 'Keep them. Only G moves, up a step to A.', 'High e from 3 to 5.'], answer: '5 5 5: one finger moves.' },
        { q: 'Then from Am (5 5 5) to F.', steps: ['F = F A C. Am and F share A and C.', 'Keep A (high e, 5th fret) and C (G string, 5th fret).', 'E moves up a half step to F: B string 5 → 6.'], answer: '5 6 5: again one finger.' },
        { q: 'A melody note E sits over a C chord. Which triad puts it on top?', steps: ['E is the 3rd of C.', 'The 3rd is on top in the 2nd inversion (G – C – E).', 'On the top strings: 12 13 12, or open 0 1 0.'], answer: 'The 2nd inversion: 12 13 12 (or 0 1 0).' },
        { q: 'Holding C in 1st inversion (9 8 8), where is the sus4 hammer-on?', steps: ['The 3rd (E) is on the G string, 9th fret.', 'The 4th (F) is one fret above: G string, 10th fret.', 'Play the 4th, then pull off to the 3rd: Csus4 → C.'], answer: 'G string, 10 → 9.' },
        { q: 'Find Dm and Em near the 5th fret.', steps: ['Dm (D F A): root position with D on the G string, 7th fret: 7 6 5.', 'Em (E G B): 2nd inversion with B on the G string, 4th fret: 4 5 3.', 'Both sit inside frets 3–8, with C, F, G and Am.'], answer: 'Dm 7 6 5, Em 4 5 3.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Two ear skills turn triads from shapes into music. First, hear **which note is on top**: the root sounds settled, the 3rd sweet and singing, the 5th open and floating. Second, hear the **top voice move** when the chord changes: up, down, or staying put on a common tone. That top line is what a listener hums.' },
        { list: ['Play C in all three inversions and sing only the top note each time.', 'Play C → Am → F → G voice-led and sing the top line. Then play it with big jumps and hear the difference.', 'Play one inversion with the hammer-on from the 2nd: does it sound like a melody?'] },
      ],
      drills: [
        { label: 'The top note of a small triad', quiz: 'l4-tri-top-ear', minutes: 5, goal: '8 out of 10' },
        { label: 'Where did the top voice go?', quiz: 'l4-lead-ear', minutes: 5, goal: '8 out of 10' },
        { label: 'Triad types by ear', quiz: 'tr-ear', minutes: 3 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Learning one inversion and using it for everything.', right: 'Learn all three for each chord, so the next chord is always close.' },
        { wrong: 'Moving every finger on every chord change.', right: 'Keep the common tones; move the others by the smallest step.' },
        { wrong: 'Letting the lower strings ring.', right: 'Mute them with the side of the fretting hand or the thumb, or pick only the top three.' },
        { wrong: 'Naming the inversion by the top note.', right: 'Inversions are named by the lowest note. Root on top = 1st inversion.' },
        { wrong: 'Playing the minor triad by moving the wrong finger.', right: 'Find the 3rd first: it\'s on the B string in root position, the G string in 1st, the high e in 2nd.' },
        { wrong: 'Strumming triads like full chords, all the time.', right: 'Use space: upbeats, single notes, hammer-ons, slides. Small shapes want light hands.' },
        { wrong: 'Thinking of triads as separate from scales.', right: 'Each triad sits inside a CAGED shape and a pentatonic box: rhythm and lead in the same place.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Over a slow beat. Say the inversion and the top note before you play each shape.',
      challenge: { label: 'Every chord of C major on the top strings, in all three inversion families', ex: { label: 'The chords of C major, one inversion at a time', tab: 'triKey' }, goal: 'then play the chords of a song from your library using only voice-led top-string triads', why: 'This is the whole key under your hand three times over: the foundation for every rhythm part, fill and chord melody after this.' },
      goals: [
        { focus: 'C, every inversion', tasks: [{ label: 'C major up and down the neck', ex: { label: 'C on the top strings, every inversion', tab: 'triInvC' }, minutes: 6, goal: 'no stops at 70 BPM' }] },
        { focus: 'Minor and other keys', tasks: [{ label: 'A minor, every inversion', ex: { label: 'Am on the top strings, every inversion', tab: 'triInvAm' }, minutes: 5 }, { label: 'F major, every inversion', ex: { label: 'F on the top strings, every inversion', tab: 'triInvF' }, minutes: 5 }] },
        { focus: 'Name the inversion', tasks: [{ label: 'Name the inversion', quiz: 'tr-inv', minutes: 5, goal: '2 stars' }] },
        { focus: 'Voice leading', tasks: [{ label: 'I – IV – V – I, smallest moves, from each inversion', ex: { label: 'I – IV – V – I, moving as little as possible', tab: 'triLead' }, minutes: 8 }, { label: 'vi – IV – I – V – vi, the same way', ex: { label: 'vi – IV – I – V – vi, voice-led', tab: 'triLeadMinor' }, minutes: 6 }] },
        { focus: 'The key in one window', tasks: [{ label: 'The chords of C major, one inversion at a time', ex: { label: 'The chords of C major on the top strings', tab: 'triKey' }, minutes: 8 }] },
        { focus: 'The free fingers', tasks: [{ label: 'Every C triad with a hammer-on', ex: { label: 'Every top-string triad with a hammer-on', tab: 'triEmb' }, minutes: 6 }, { label: 'Fills between chords: shells, free finger, slides', tool: 'fills', minutes: 10 }] },
        { focus: 'Hear it', tasks: [{ label: 'The top note of a small triad', quiz: 'l4-tri-top-ear', minutes: 5 }, { label: 'Where did the top voice go?', quiz: 'l4-lead-ear', minutes: 5 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { p: 'Put the small shapes into real parts:' },
        { list: [
          '**Jam**: C – Am – F – G (or any progression) with the band. Play only top-string triads, voice-led, on the upbeats first, then with hammer-ons.',
          '**Fills between chords**: the Mayer and Asato workshops are built on these exact shapes.',
          '**A song from your library**: replace its open chords with triads round the 5th fret. Record both versions and compare.',
          '**Call and response**: answer a phrase with a triad and a hammer-on.',
        ] },
      ],
      tasks: [
        { label: 'Jam: voice-led triads with the band', tool: 'jam', minutes: 10 },
        { label: 'Fills between chords', tool: 'fills', minutes: 10 },
        { label: 'Call and response', tool: 'cr', minutes: 6 },
        { label: 'Hammer-ons, slides and other techniques', tool: 'techniques', minutes: 5 },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Name the inversion', quiz: 'tr-inv' },
        { skill: 'Hear', label: 'Where did the top voice go?', quiz: 'l4-lead-ear' },
        { skill: 'Play', label: 'I – IV – V – I voice-led (mic)', ex: { label: 'I – IV – V – I, moving as little as possible', tab: 'triLead' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Triads on the top three strings". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) the three inversions, what each is named after and which note is on top, (2) where they come from in the CAGED shapes, (3) how to make each one minor, (4) the two rules of voice leading with an example, (5) where the chords of C major are in one window, (6) two ways to decorate a triad. Keep it short.',
        points: ['named by the lowest note: root position (5 on top), 1st (root on top), 2nd (3rd on top)', 'A shape = root position, E shape = 1st inversion, D and C shapes = 2nd inversion', 'lower the 3rd one fret: B string in root position, G string in 1st, high e in 2nd', 'keep common tones, move the others the smallest step: C 5 5 3 → Am 5 5 5', 'frets 3–8: C 5 5 3, Dm 7 6 5, Em 4 5 3, F 5 6 5, G 7 8 7, Am 5 5 5, Bdim 7 6 7', 'hammer from the 2nd or 4th, slide in from a fret below, add the 6th or 9th, play upbeats'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: SERIFF_TRIADS,
      books: [
        { book: 'Triads and Inversions', where: 'The chapters on the top-string set and moving through the inversions', why: 'The whole topic of this lesson, with more drills.' },
        { book: 'Triads for the Improvising Guitarist', where: 'The early chapters on triads over chords', why: 'How to solo with triads: the next step after rhythm.' },
        { book: 'Fretboard Logic SE', where: 'The part linking chord forms to smaller shapes', why: 'How triads sit inside the big chord forms.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'The sections on inversions and voice leading', why: 'The theory of inversions and smooth chord changes.' },
      ],
      blocks: [
        { p: '**Next in Level 4**: triads on every string set (D-G-B, A-D-G, E-A-D), then the major scale in five positions on the CAGED map.' },
        { p: '**Extra credit**: take a song you strum and write a part using only top-string triads and one free-finger move per chord. Record it with Record yourself and play it against the original.' },
      ],
    },
  ],
}

export const LEVEL4: CourseLesson[] = [CAGED, PENT_BOXES, TOP_TRIADS]
