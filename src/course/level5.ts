// Level 5 (Chords in depth), lessons 1–4: augmented and diminished triads, seventh chords (shells and drop 2), the 7th
// chords of a key (with ii – V – I), and sus / add / 6 / power chords. Lessons 5–8 and the mastery check are in level5b.ts.
// Same standard as Levels 1–4: the idea from the ground up, worked examples, ear training, mistakes, goals with a
// challenge round, use in music, a check with explain-it-back, and go deeper. Every grip named here is checked note by
// note on a standard-tuned guitar (low E first, x = muted); the same grips are in l5Tabs.ts.
//   C+ x32110 (C E G♯ C) · Bdim x2343x (B F B D) · Bdim on D-G-B 9 7 6 · Cdim on D-G-B 10 8 7
//   C♯dim7 x4535x (C♯ G B♭ E) · Dm x57765 · D♯dim7 x6757x · C6 x32210 · C7 x32310 · F 133211
//   Shells, 6th-string root C: maj7 8x99xx · 7 8x89xx · m7 8x88xx · m7♭5 8x887x · dim7 8x787x
//   Shells, 5th-string root C: maj7 x324xx · 7 x323xx · m7 x313xx · m7♭5 x3434x · dim7 x3424x
//   Drop 2 on the top four, C: maj7 xx10 12 12 12 · 7 xx10 12 11 12 · m7 xx10 12 11 11 · m7♭5 xx10 11 11 11 · dim7 xx10 11 10 11
//   Cmaj7 drop 2 inversions: xx2413 · xx5557 · xx9988
//   Key of C shells: Dm7 x535xx · Em7 x757xx · Fmaj7 1x22xx · G7 3x34xx · Am7 5x55xx · Bm7♭5 7x776x
//   ii–V–I drop 2: Dm7 xx10 10 10 10 · G7 xx9 10 8 10 · Cmaj7 xx9988
//   Dsus4 xx0233 · Dsus2 xx0230 · Cadd9 x32030 · Power: E5 022 · G5 355 · A5 577 · D5 x577 · C5 x355
import type { CourseLesson } from './types'
import { gripMarks, type Quality } from './l5Tabs'

const G = [40, 45, 50, 55, 59, 64]
/** guitar frets (low E first, -1 = muted) → the sounding notes, for ▶ buttons */
const notes = (frets: number[]) => frets.flatMap((f, i) => (f < 0 ? [] : [G[i] + f]))
/** a neck picture of one grip (worked out for other tunings), labelled by chord tone */
const fig = (caption: string, root: number, q: Quality, frets: number[], near = 3, bass?: number) =>
  ({ caption, from: 0, to: 13, marks: (m: number[]) => gripMarks(m, root, q, frets, near, bass) })
const ex = (root: number, q: Quality, frets: number[], near = 3, bass?: number) => fig('', root, q, frets, near, bass)

// ---- Lesson 1: augmented and diminished triads ---------------------------------------------------------------------
export const AUG_DIM: CourseLesson = {
  id: 'c5-augdim', level: 5, n: 1, title: 'Augmented and diminished: the two restless triads', minutes: 75,
  goal: 'Build, play and hear diminished and augmented triads and the diminished 7th, know where they come from in a key, use their symmetry to find them anywhere, and use them the way songs do: leading to a chord, passing between two chords, and climbing a line cliché.',
  builds: ['major and minor triads', 'triads on every string set', 'intervals'],
  topics: ['diminished', 'augmented', 'triads', 'chord construction', 'passing chords', 'harmony'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Major and minor triads are **stable**: you can stop on them and the music feels finished. There are two more triads, and neither one can sit still. The **diminished** triad sounds tense and dark; the **augmented** triad sounds dreamy and unresolved. That restlessness is exactly why songwriters use them: they pull the ear towards the next chord.' },
        { p: 'You\'ve already met the diminished triad as the **vii°** chord of every major key (Bdim in C). In this lesson you\'ll see why it behaves like a dominant chord, meet its big brother the **diminished 7th**, and find out why both of these chords (and the augmented triad) repeat themselves up the neck every few frets, so one shape gives you several chords.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['spell and play any diminished, augmented and diminished 7th chord;', 'say where each one comes from (which key, which degree);', 'use their symmetry: a dim7 repeats every 3 frets, an augmented triad every 4;', 'play a passing diminished chord between two chords a whole step apart;', 'play the "line cliché" (C – C+ – C6 – C7) and hear the moving voice.'] },
        { prog: { label: 'C – C♯dim7 – Dm: a diminished chord passing between two chords', chords: [notes([-1, 3, 2, 0, 1, 0]), notes([-1, 4, 5, 3, 5, -1]), notes([-1, 5, 7, 7, 6, 5])], gap: 1.1 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Four triads from two kinds of 3rd', blocks: [
        { p: 'Every triad is two 3rds stacked on a root. There are only two sizes of 3rd: **major** (4 frets) and **minor** (3 frets). Stack them every possible way and you get exactly four triads:' },
        { list: [
          '**Major** = major 3rd + minor 3rd: **1 3 5** (C E G).',
          '**Minor** = minor 3rd + major 3rd: **1 ♭3 5** (C E♭ G).',
          '**Diminished** = minor 3rd + minor 3rd: **1 ♭3 ♭5** (C E♭ G♭).',
          '**Augmented** = major 3rd + major 3rd: **1 3 ♯5** (C E G♯).',
        ] },
        { p: 'So a diminished triad is a minor triad with its 5th **lowered** a fret, and an augmented triad is a major triad with its 5th **raised** a fret. The 5th is what makes major and minor sound stable (it\'s a perfect 5th, 7 frets from the root). Bend it either way and the chord loses its footing.' },
        { p: 'Chord symbols: **Cdim** or **C°** for diminished, **Caug** or **C+** for augmented.' },
        { spots: fig('C+ (x 3 2 1 1 x): root, 3rd and the raised 5th (G♯ on the G string).', 0, 'aug', [-1, 3, 2, 1, 1, -1], 2) },
      ],
    },
    {
      kind: 'learn', title: '2 · Diminished: the vii° chord and why it leads home', blocks: [
        { p: 'Build triads on every note of a major scale and the 7th one comes out diminished. In C: **B D F**. Two of its notes are a **tritone** apart (B to F, six frets), the most unstable interval there is. A tritone wants to squeeze in or open out: here **B rises to C** and **F falls to E**, which lands you on the C chord.' },
        { p: 'That\'s exactly what G7 does. G7 is G B D F, and B D F **is** Bdim. So the vii° chord is really the **V7 without its root**. It has the same job: a **dominant** chord that leads to I.' },
        { spots: fig('Bdim (x 2 3 4 3 x): B and F, the tritone, sit on the D and B strings.', 11, 'dim', [-1, 2, 3, 4, 3, -1], 3) },
        { p: 'On the top strings, Bdim is **9 7 6** on D-G-B, and C diminished is **10 8 7**. In a minor key the diminished chord is **ii°** (Bdim in A minor).' },
        { prog: { label: 'Bdim → C, then G7 → C: the same pull', chords: [notes([-1, 2, 3, 4, 3, -1]), notes([-1, 3, 2, 0, 1, 0]), notes([3, 2, 0, 0, 0, 1]), notes([-1, 3, 2, 0, 1, 0])], gap: 1.1 } },
      ],
    },
    {
      kind: 'learn', title: '3 · The diminished 7th: one shape, four chords', blocks: [
        { p: 'Add one more minor 3rd on top of a diminished triad and you get the **diminished 7th** (dim7 or °7): **1 ♭3 ♭5 ♭♭7**. In C: C E♭ G♭ B♭♭ (B♭♭ is the note A, spelled that way because it\'s a kind of 7th).' },
        { p: 'Now every note is a minor 3rd (3 frets) from the next, all the way round: C, E♭, G♭, A, and back to C. The chord is **symmetrical**. Move a dim7 shape up 3 frets and you get **the same four notes** in a new order. So:' },
        { list: ['**C♯dim7 = Edim7 = Gdim7 = B♭dim7**: one chord, four names.', 'There are only **three** different dim7 chords in all of music.', 'Any of its notes can be the root, so you name it by the bass note or by where it\'s going.'] },
        { spots: fig('C♯dim7 (x 4 5 3 5 x). Move it up 3 frets (x 7 8 6 8 x) and it\'s Edim7: the same notes.', 1, 'dim7', [-1, 4, 5, 3, 5, -1], 4) },
        { p: 'A dim7 is also a **dominant 7♭9 without its root**: C♯dim7 (C♯ E G B♭) is A7♭9 (A C♯ E G B♭) minus the A. So it leads strongly to D or Dm, the chord A7 leads to. You\'ll meet 7♭9 properly in lesson 6.' },
      ],
    },
    {
      kind: 'learn', title: '4 · Passing diminished chords', blocks: [
        { p: 'The most common use of a dim7 in songs: **slip it between two chords a whole step apart**. The bass climbs one fret at a time and the dim7 makes the middle step sound deliberate:' },
        { list: ['**C – C♯dim7 – Dm**', '**Dm – D♯dim7 – Em**', '**F – F♯dim7 – C/G** (G♯dim7 works the same way going up to Am)'] },
        { p: 'Why it works: C♯dim7 is A7♭9 without the A, and A7 is the chord that leads to Dm (it\'s "V of ii"). So for one beat you borrow the pull of a dominant chord, then land.' },
        { p: 'Old pop, gospel, ragtime, country and jazz are full of these. Once you hear the sound you\'ll notice it everywhere: the bass walking up by half steps under a chord that sounds like a question.' },
        { prog: { label: 'C – C♯dim7 – Dm – D♯dim7 – Em: walking up with passing chords', chords: [notes([-1, 3, 2, 0, 1, 0]), notes([-1, 4, 5, 3, 5, -1]), notes([-1, 5, 7, 7, 6, 5]), notes([-1, 6, 7, 5, 7, -1]), notes([0, 2, 2, 0, 0, 0])], gap: 1 } },
      ],
    },
    {
      kind: 'learn', title: '5 · Augmented: symmetry, V+ and the line cliché', blocks: [
        { p: 'An augmented triad is two major 3rds: C to E to G♯, and G♯ to C is another major 3rd. It\'s symmetrical too: move it up **4 frets** and you have the same three notes. **C+ = E+ = G♯+**, so there are only **four** augmented triads in all.' },
        { p: 'Where it shows up:' },
        { list: [
          '**V+ → I**: play G+ (G B D♯) instead of G before C. The D♯ pushes up to E, the 3rd of C.',
          '**The line cliché**: hold a chord and move one inner voice up by half steps. **C – C+ – C6 – C7**: the 5th goes G, G♯, A, B♭, then lands on F. It\'s the sound of a film score or a lounge ballad slowly opening up.',
          '**III+ in a minor key**: harmonic minor (lesson 6 and Level 7) builds an augmented chord on its 3rd degree (C+ in A minor).',
        ] },
        { prog: { label: 'The line cliché: C – C+ – C6 – C7 – F (listen to the G string)', chords: [notes([-1, 3, 2, 0, 1, 0]), notes([-1, 3, 2, 1, 1, 0]), notes([-1, 3, 2, 2, 1, 0]), notes([-1, 3, 2, 3, 1, 0]), notes([1, 3, 3, 2, 1, 1])], gap: 1.1 } },
        { tip: 'You don\'t need many shapes. One augmented shape and one dim7 shape, slid up the neck by 4 and 3 frets, cover every one of these chords.' },
        { video: { id: 'i22MvZ8GHqM', title: 'Music Theory for Guitar: Diatonic Triads', note: 'Where the diminished chord comes from in every key: the same idea as section 2.' } },
      ],
    },
    {
      kind: 'learn', title: '6 · What mastery looks like', blocks: [
        { p: 'You own these chords when:' },
        { list: [
          'Given any root, you can **spell** its dim, aug and dim7 in a few seconds.',
          'You can play the **vii°** chord of any major key on the top strings and resolve it to I.',
          'You can name the **four names** of any dim7 shape and the **three names** of any augmented shape.',
          'You can drop a **passing dim7** into C – Dm, F – G, or any whole-step move, without stopping.',
          'You can play the **line cliché** on C and on Am (Am – Am(maj7) – Am7 – Am6 uses the same idea going down).',
          'By ear, you can tell major, minor, diminished and augmented apart **nine times out of ten**.',
        ] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Stack 3rds; count frets; let the moving note show you where to go.', examples: [
        { q: 'Spell E diminished.', steps: ['Start with E minor: E G B.', 'Lower the 5th one fret: B → B♭.'], answer: 'E G B♭ (Edim).' },
        { q: 'Spell A♭ augmented.', steps: ['A♭ major: A♭ C E♭.', 'Raise the 5th: E♭ → E.', 'Every step is a major 3rd: A♭–C, C–E.'], answer: 'A♭ C E (A♭+). Also C+ and E+: the same notes.' },
        { q: 'What is the diminished chord in G major, and where does it want to go?', steps: ['The 7th note of G major is F♯.', 'Stack 3rds from F♯ using only notes of G: F♯ A C.', 'F♯ rises to G, C falls to B: the G chord.'], answer: 'F♯dim (F♯ A C), the vii° of G. It leads to G (it\'s D7 without the D).' },
        { q: 'You\'re playing C♯dim7 at x 4 5 3 5 x. Give three other names for the same chord, and say where each could lead.', steps: ['Its notes are C♯ E G B♭, a minor 3rd apart all round.', 'Any of them can be the root: Edim7, Gdim7, B♭dim7.', 'Each is a 7♭9 chord without its root, a half step below the root: C♯dim7 = A7♭9, Edim7 = C7♭9, Gdim7 = E♭7♭9, B♭dim7 = G♭7♭9.'], answer: 'Edim7, Gdim7, B♭dim7. As a rootless 7♭9 it can lead to D(m), F(m), A♭(m) or B(m): the chord a half step above any of its notes.', spots: ex(1, 'dim7', [-1, 4, 5, 3, 5, -1], 4) },
        { q: 'Put a passing chord between F and G.', steps: ['The bass goes F → F♯ → G.', 'A dim7 on F♯: F♯ A C E♭.', 'F♯dim7 is D7♭9 without the D, and D7 leads to G.'], answer: 'F – F♯dim7 – G.' },
        { q: 'Turn G – C into a stronger cadence with an augmented chord.', steps: ['G+ = G B D♯.', 'D♯ moves up a half step to E, the 3rd of C.', 'B moves up to C, G stays.'], answer: 'G – G+ – C: the D♯ pushes into the E of C.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Learn the four triads as four **feelings**: major is bright and settled, minor is darker but still settled, **diminished** is tight and anxious (the two minor 3rds squeeze together), **augmented** is wide and floating (nothing in it feels like home).' },
        { list: ['Play C, Cm, Cdim, C+ one after another on the top strings and sing the top note of each.', 'Play C – C♯dim7 – Dm slowly. Sing the bass: C, C♯, D. The dim7 is the half step that makes the walk sound inevitable.', 'Play the line cliché and sing only the moving note: G, G♯, A, B♭.'] },
        { play: { label: 'Major, minor, diminished, augmented on C', seq: [60, 64, 67, 60, 63, 67, 60, 63, 66, 60, 64, 68], gap: 0.3 } },
      ],
      drills: [
        { label: 'Triad types by ear', quiz: 'tr-ear', minutes: 5, goal: '9 out of 10' },
        { label: 'Spell the triad', quiz: 'tr-spell', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Calling a diminished triad "minor with something wrong" and avoiding it.', right: 'It has a job: a dominant chord without the root. Use it where V7 would go.' },
        { wrong: 'Thinking Cdim and Cdim7 are the same chord.', right: 'Cdim is three notes (C E♭ G♭). Cdim7 adds A (B♭♭). Cm7♭5 adds B♭ instead: that\'s lesson 2.' },
        { wrong: 'Learning twelve dim7 shapes.', right: 'One shape, moved 3 frets at a time, plays all twelve. There are only three different dim7 chords.' },
        { wrong: 'Holding a dim7 or augmented chord for bars on end.', right: 'They\'re passing and leading chords. One or two beats, then resolve.' },
        { wrong: 'Writing G♯ as A♭ in C+.', right: 'Spell by the 3rds: C, E, then the 5th (G) raised = G♯.' },
        { wrong: 'Letting the open strings ring through a dim7 grip.', right: 'Mute the low E and high e with the fretting fingers: the shape is four notes on the middle strings.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Slowly, letting each chord ring before the next. Say the chord name and what it\'s doing ("passing", "leading home") as you play.',
      challenge: { label: 'Every passing chord in a key', ex: { label: 'Augmented and diminished: C+ moving in major 3rds, Bdim → C, and passing diminished chords', tab: 'augDim' }, goal: 'then add a passing dim7 between every pair of chords a whole step apart in a song you know (C–Dm, Dm–Em, F–G)', why: 'Using them in a real song, on the spot, is the difference between knowing what a diminished chord is and hearing where it belongs.' },
      goals: [
        { focus: 'Build them', tasks: [{ label: 'Spell the triad', quiz: 'tr-spell', minutes: 5, goal: '2 stars' }, { label: 'Diminished 7th arpeggio', ex: { label: 'Diminished 7th arpeggio on C♯', spec: { kind: 'arpeggio', root: 'C#', type: 'dim7', position: 0 } }, minutes: 4 }] },
        { focus: 'Play them in music', tasks: [{ label: 'Aug, dim and passing dim7 chords', ex: { label: 'Augmented and diminished: C+ moving in major 3rds, Bdim → C, and passing diminished chords', tab: 'augDim' }, minutes: 8, goal: 'no stops at 66 BPM' }] },
        { focus: 'The symmetry', tasks: [{ label: 'Slide one dim7 shape up the neck in 3-fret jumps, naming each', ex: { label: 'Diminished 7th arpeggio on E', spec: { kind: 'arpeggio', root: 'E', type: 'dim7', position: 0 } }, minutes: 4, goal: 'name all four names of each' }] },
        { focus: 'Hear them', tasks: [{ label: 'Triad types by ear', quiz: 'tr-ear', minutes: 5, goal: '2 stars' }] },
        { focus: 'Use them', tasks: [{ label: 'Jam: put C – C♯dim7 – Dm – G7 in the progression', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: [
          '**Jam**: build I – vi – ii – V in C and change the vi to a **C♯dim7** (it\'s A7♭9 without the A). Hear how it drags the music into Dm.',
          '**Any song with C then Dm** (or G then Am): slip the passing dim7 in on the last beat.',
          '**Endings**: replace the last V with V+ (G+ → C) for an old-fashioned flourish.',
          '**Ballads**: play the line cliché on the tonic chord for an intro.',
        ] },
      ],
      tasks: [
        { label: 'Jam: passing diminished chords', tool: 'jam', minutes: 10 },
        { label: 'Chord changes: C → C♯dim7 → Dm', tool: 'changes', minutes: 5 },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Build them, hear them, play them, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Spell the triad', quiz: 'tr-spell' },
        { skill: 'Hear', label: 'Triad types by ear', quiz: 'tr-ear' },
        { skill: 'Play', label: 'Aug, dim and passing dim7 chords (mic)', ex: { label: 'Augmented and diminished: C+ moving in major 3rds, Bdim → C, and passing diminished chords', tab: 'augDim' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Augmented and diminished triads" (including the diminished 7th). Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) how the four triads are built from major and minor 3rds, (2) why the vii° chord leads to I and how it relates to V7, (3) what a diminished 7th is and why one shape gives four chords, (4) how a passing diminished chord works between C and Dm, (5) why the augmented triad repeats every 4 frets, (6) what the line cliché is. Keep it short.',
        points: ['major M3+m3, minor m3+M3, diminished m3+m3, augmented M3+M3', 'vii° = V7 without its root; the tritone resolves inward/outward to I', 'dim7 = stacked minor 3rds: symmetrical, repeats every 3 frets, only three exist; = 7♭9 without root', 'C – C♯dim7 – Dm: the bass climbs by half step, C♯dim7 = A7♭9 (V of ii)', 'augmented = stacked major 3rds: repeats every 4 frets, only four exist; V+ → I', 'line cliché: one voice moves by half steps under a held chord (C – C+ – C6 – C7)'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'pgs8ySdPWi8', title: 'How to Use the Half-Whole Diminished Scale in the Blues (Guitar)' },
      books: [
        { book: 'Music Theory for Guitarists', where: 'The chapter on building chords from 3rds', why: 'All four triad qualities and the diminished 7th, with the theory behind their symmetry.' },
        { book: 'Triads for the Improvising Guitarist', where: 'The parts on diminished and augmented triads', why: 'Playing these triads as soloing shapes, not just chords.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'The chord construction chapter', why: 'A second explanation with more examples of passing chords.' },
      ],
      blocks: [
        { p: '**Next in Level 5**: seventh chords. Add one more 3rd to a triad and you get five new chord types, two of which you met here.' },
        { p: '**Extra credit**: the video above shows the diminished scale, the scale a dim7 chord comes from. You\'ll use it properly in Level 8.' },
      ],
    },
  ],
}

// ---- Lesson 2: seventh chords --------------------------------------------------------------------------------------
export const SEVENTHS: CourseLesson = {
  id: 'c5-sevenths', level: 5, n: 2, title: 'Seventh chords: five qualities, shells and drop 2', minutes: 90,
  goal: 'Build the five seventh chords (maj7, 7, m7, m7♭5, dim7) from any root, play each as a three-note shell with the root on the 6th and 5th strings and as a drop-2 voicing on the top four strings, say which notes matter most, and tell them apart by ear.',
  builds: ['triads', 'augmented and diminished', 'intervals', 'CAGED'],
  topics: ['seventh chords', 'maj7', 'dominant 7', 'm7', 'half-diminished', 'shell voicings', 'drop 2', 'chord construction'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Triads are three notes. Add **one more 3rd** on top and you get a **seventh chord**: four notes, and a lot more colour. Seventh chords are the sound of blues (every chord a dominant 7), jazz (everything a 7th chord of some kind), soul and neo-soul (maj7 and m7), and of plenty of pop and country (the V7 that pulls to I).' },
        { p: 'Guitarists learn 7th chords as dozens of separate grips. You\'ll learn them as **five qualities × two smart voicing systems**: **shells** (root, 3rd, 7th: the bare bones, the jazz and blues comping sound) and **drop 2** (all four notes on the top four strings, the sound of a chord melody). Ten shapes per root position, and every 7th chord you\'ll ever meet is one of them or a small change to one.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['spell maj7, 7, m7, m7♭5 and dim7 on any root;', 'play all five as shells with the root on the 6th string and on the 5th string;', 'play all five as drop-2 chords on the top four strings;', 'say which notes you can leave out and which you never can;', 'hear the five qualities and name them.'] },
        { prog: { label: 'Cmaj7, C7, Cm7, Cm7♭5, Cdim7: five qualities on one root', chords: [notes([-1, 3, 2, 4, 5, -1]), notes([-1, 3, 2, 3, 5, -1]), notes([-1, 3, 1, 3, 4, -1]), notes([-1, 3, 4, 3, 4, -1]), notes([-1, 3, 4, 2, 4, -1])], gap: 1.2 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Five chords, one note at a time', blocks: [
        { p: 'Start from **Cmaj7** and lower one note at a time. Each step makes a new, real chord:' },
        { list: [
          '**Cmaj7** = 1 3 5 7 (C E G B): major triad + major 7th. Dreamy, smooth.',
          '**C7** (dominant 7th) = 1 3 5 ♭7 (C E G B♭): major triad + minor 7th. Bluesy, restless: it wants to go somewhere (to F).',
          '**Cm7** = 1 ♭3 5 ♭7 (C E♭ G B♭): minor triad + minor 7th. Mellow, soulful.',
          '**Cm7♭5** (half-diminished, Cø) = 1 ♭3 ♭5 ♭7 (C E♭ G♭ B♭): diminished triad + minor 7th. Dark but soft.',
          '**Cdim7** (fully diminished, C°7) = 1 ♭3 ♭5 ♭♭7 (C E♭ G♭ A): diminished triad + diminished 7th. Tense, dramatic.',
        ] },
        { p: 'In 3rds: maj7 is M3 m3 M3; dominant 7 is M3 m3 m3; m7 is m3 M3 m3; m7♭5 is m3 m3 M3; dim7 is m3 m3 m3.' },
        { tip: 'The names trip people up: "**7**" alone always means **dominant** 7th (the ♭7). The major 7th has to be asked for: "maj7". And "m7" means minor triad + ♭7, never a major 7th (that\'s m(maj7), a rare, spooky chord).' },
      ],
    },
    {
      kind: 'learn', title: '2 · Shells: root, 3rd and 7th', blocks: [
        { p: 'The **3rd** decides major or minor. The **7th** decides maj7, 7 or m7. The **5th** usually changes nothing (unless it\'s ♭5) and the bass player often has the root. So the most useful 7th-chord voicing on guitar is a **shell**: just **root, 3rd and 7th**, three notes, no clutter.' },
        { p: '**Root on the 6th string** (C at the 8th fret, A string muted by the finger on the low E):' },
        { list: ['**Cmaj7** 8 x 9 9: root, 7th, 3rd.', '**C7** 8 x 8 9.', '**Cm7** 8 x 8 8.', '**Cm7♭5** 8 x 8 8 7 (add the ♭5 on the B string: it\'s what makes it half-diminished).', '**Cdim7** 8 x 7 8 7.'] },
        { spots: fig('C7 shell, root on the 6th string: 8 x 8 9. Root, ♭7, 3.', 0, 'dom7', [8, -1, 8, 9, -1, -1], 8) },
        { p: '**Root on the 5th string** (C at the 3rd fret):' },
        { list: ['**Cmaj7** x 3 2 4.', '**C7** x 3 2 3.', '**Cm7** x 3 1 3.', '**Cm7♭5** x 3 4 3 4.', '**Cdim7** x 3 4 2 4.'] },
        { spots: fig('Cmaj7 shell, root on the 5th string: x 3 2 4. Root, 3, 7.', 0, 'maj7', [-1, 3, 2, 4, -1, -1], 3) },
        { p: 'Notice the 6th-string shells put the 7th **below** the 3rd, the 5th-string shells put the 3rd **below** the 7th. Having both means any chord is within a fret or two of any other: that\'s lesson 3.' },
        { video: { id: '1tThogfLBW0', title: 'Jazz Chord Essentials: Shell Voicings', note: 'The same three-note shapes, and how jazz players comp with them.' } },
      ],
    },
    {
      kind: 'learn', title: '3 · Drop 2: all four notes on the top strings', blocks: [
        { p: 'Shells sit low and thick. For a lighter, singing sound you want all four notes on the top four strings. Stacking them in 3rds (C E G B) spans too far for one hand, so players use **drop 2**: take the close chord and drop the **second-highest note** down an octave. The result fits on four neighbouring strings and sounds open and even.' },
        { p: 'Drop 2 on the **D-G-B-e** strings, root on the D string (10th fret):' },
        { list: ['**Cmaj7** x x 10 12 12 12 (R 5 7 3).', '**C7** x x 10 12 11 12.', '**Cm7** x x 10 12 11 11.', '**Cm7♭5** x x 10 11 11 11.', '**Cdim7** x x 10 11 10 11.'] },
        { spots: fig('Cmaj7 drop 2 on the top four strings: x x 10 12 12 12.', 0, 'maj7', [-1, -1, 10, 12, 12, 12], 11) },
        { p: 'Like triads, a drop-2 chord has **four inversions** that climb the neck, each with a different note on top. Cmaj7: **x x 2 4 1 3** (3rd in the bass), **x x 5 5 5 7** (5th in the bass), **x x 9 9 8 8** (7th in the bass), **x x 10 12 12 12** (root in the bass). The **top note** is what the ear follows: choose the inversion whose top note fits the melody.' },
        { tip: 'Learn the root-position drop 2 of all five qualities first (it\'s the same "lower one note" game as section 1), then the four inversions of maj7, then the rest as you need them.' },
      ],
    },
    {
      kind: 'learn', title: '4 · What to leave out, what to keep', blocks: [
        { p: 'Guitar has six strings and one hand, so 7th chords are almost always **incomplete**. The rule:' },
        { list: [
          '**Keep the 3rd and the 7th, always.** They\'re the **guide tones**: they tell the ear the chord\'s quality (lesson 8 builds a whole method on them).',
          '**The 5th is the first to go**, unless it\'s altered (♭5 in m7♭5 and dim7 must stay).',
          '**The root can go** when a bass player (or a looper track) has it. Rootless voicings are lesson 8 and Level 6 territory.',
          '**Doubling** a note (two roots) is fine on guitar; doubling the 3rd or 7th sounds heavy.',
        ] },
        { p: 'So a full-sounding Cmaj7 can be as little as **C, E and B**. That\'s why shells sound complete.' },
        { video: { id: 'Fqc2AySOcKQ', title: 'Seventh Chords on Guitar', note: 'Another teacher building the same five chords: useful for hearing them on a different guitar.' } },
      ],
    },
    {
      kind: 'learn', title: '5 · What mastery looks like', blocks: [
        { p: 'You own seventh chords when:' },
        { list: [
          'You can **spell** all five qualities on any root without counting on your fingers.',
          'Called "B♭7, root on the 6th string", "Em7♭5, root on the 5th", you play the shell in **about three seconds**.',
          'You can play the five drop-2 qualities on one root in a row, then do it on two other roots.',
          'You can play the four drop-2 inversions of one maj7 chord up the neck.',
          'By ear you can name maj7, 7 and m7 **nine times out of ten**, and spot m7♭5 and dim7.',
        ] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Build from the triad, then add the 7th.', examples: [
        { q: 'Spell F7.', steps: ['F major: F A C.', 'The ♭7 of F: one whole step below F = E♭.'], answer: 'F A C E♭.' },
        { q: 'Spell Bm7♭5.', steps: ['B diminished: B D F.', 'Add the ♭7: A.'], answer: 'B D F A (Bø). It\'s the vii chord of C major.' },
        { q: 'Play G7 as a shell with the root on the 6th string.', steps: ['G on the low E: 3rd fret.', 'The C7 shell was 8 x 8 9: move it down 5 frets.'], answer: '3 x 3 4: G, F (♭7), B (3).', spots: ex(7, 'dom7', [3, -1, 3, 4, -1, -1], 3) },
        { q: 'Turn the Dm7 shell x 5 3 5 into Dmaj7… then explain why that isn\'t a "minor" chord any more.', steps: ['x 5 3 5 = D, F (♭3), C (♭7).', 'Dmaj7 needs F♯ (3) and C♯ (7): x 5 4 6.'], answer: 'x 5 4 6. Both the 3rd and the 7th moved up a fret: maj7 is a major chord.', spots: ex(2, 'maj7', [-1, 5, 4, 6, -1, -1], 5) },
        { q: 'A chart says "A°7". Find it near the 5th fret on the top strings.', steps: ['A°7 = A C E♭ G♭, the same notes as Cdim7, E♭dim7, F♯dim7.', 'The Cdim7 drop 2 at x x 10 11 10 11 moved down 3 frets.'], answer: 'x x 7 8 7 8 (or any 3-fret jump of it).', spots: ex(9, 'dim7', [-1, -1, 7, 8, 7, 8], 7) },
        { q: 'You want a Cmaj7 with E on top, near the 12th fret. Which drop-2 inversion?', steps: ['The four inversions top out on G, C, E and B… check each top string note.', 'x x 10 12 12 12: high e at 12 = E.'], answer: 'x x 10 12 12 12 (root in the bass, E on top).' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Hear the five as moods: **maj7** dreamy (the 7 rubs gently on the root above it), **7** bluesy and pulling forward, **m7** relaxed and soulful, **m7♭5** dark but soft, **dim7** tense and dramatic. Each sounds like the one before it with one note lowered: listen for which note.' },
        { list: ['Play Cmaj7 then C7: only the top voice moves (B to B♭). Sing it.', 'Play C7 then Cm7: the 3rd moves (E to E♭).', 'Play each chord and then sing its notes up from the root: 1, 3, 5, 7.'] },
      ],
      drills: [
        { label: 'Hear it: which 7th chord?', quiz: 'l5-7ths-ear', minutes: 5, goal: '8 out of 10' },
        { label: 'Chord colours by ear', quiz: 'ch-ear-7', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Playing a maj7 when the chart says "7".', right: '"7" is always the dominant 7th (♭7). Major 7th is written maj7, M7 or △7.' },
        { wrong: 'Leaving out the 3rd to make a shape easier.', right: 'Without the 3rd the chord has no quality. Drop the 5th instead.' },
        { wrong: 'Leaving out the ♭5 of a m7♭5.', right: 'Without it you have Cm7. In half-diminished and diminished chords the 5th is part of the name.' },
        { wrong: 'Letting the open A string ring under a 6th-string shell.', right: 'Lean the finger on the low E against the A string to mute it.' },
        { wrong: 'Learning dozens of grips that don\'t connect.', right: 'Learn five qualities in two shell positions and drop 2: everything else is these with one note changed.' },
        { wrong: 'Strumming drop-2 chords with all six strings.', right: 'Pick or pluck only the top four (or mute the bass strings with the thumb).' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Slowly, saying the chord name and its formula (1 3 5 ♭7…) as you play. Let every note ring: if one is muted, fix the finger before going on.',
      challenge: { label: 'Every quality, every root position, three roots', ex: { label: 'Drop 2 on the top four strings: the five 7th chords on C', tab: 'drop2' }, goal: 'then play the five drop-2 qualities on F and on A♭ from memory, and the four inversions of Fmaj7', why: 'Moving the whole system to other roots without the tab is what proves you know the chords, not the shapes.' },
      goals: [
        { focus: 'Build them', tasks: [{ label: 'Spell the 7th chord', quiz: 'l5-spell7', minutes: 6, goal: '2 stars' }] },
        { focus: 'Shells', tasks: [{ label: 'The five 7th chords as shells', ex: { label: 'The five 7th chords on C as shells: root, 3rd and 7th', tab: 'shells7' }, minutes: 8, goal: 'no stops at 66 BPM' }] },
        { focus: 'Drop 2', tasks: [{ label: 'The five qualities in drop 2', ex: { label: 'Drop 2 on the top four strings: the five 7th chords on C', tab: 'drop2' }, minutes: 8 }] },
        { focus: 'Arpeggios', tasks: [{ label: 'Cmaj7 arpeggio', ex: { label: 'Cmaj7 arpeggio', spec: { kind: 'arpeggio', root: 'C', type: 'maj7', position: 0 } }, minutes: 3 }, { label: 'G7 arpeggio', ex: { label: 'G7 arpeggio', spec: { kind: 'arpeggio', root: 'G', type: 'dom7', position: 0 } }, minutes: 3 }, { label: 'Bm7♭5 arpeggio', ex: { label: 'Bm7♭5 arpeggio', spec: { kind: 'arpeggio', root: 'B', type: 'm7b5', position: 0 } }, minutes: 3 }] },
        { focus: 'Hear them', tasks: [{ label: 'Hear it: which 7th chord?', quiz: 'l5-7ths-ear', minutes: 5, goal: '2 stars' }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: [
          '**Blues**: play a 12-bar blues in A with dominant 7 shells only (A7 5 x 5 6, D7 x 5 4 5, E7 x 7 6 7). That\'s the sound of a thousand blues rhythm parts.',
          '**Soul and neo-soul**: two chords, Cmaj7 and Fmaj7 in drop 2, with a slow, laid-back strum.',
          '**Jam**: switch on 7th chords for any progression and comp with shells.',
          '**Looper**: record a shell part on track 1 and a drop-2 part on track 2: low and high, never in each other\'s way.',
        ] },
      ],
      tasks: [
        { label: 'Jam: comp with 7th chords', tool: 'jam', minutes: 10 },
        { label: 'Chord changes: shells', tool: 'changes', minutes: 5 },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Spell them, hear them, play them, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Spell the 7th chord', quiz: 'l5-spell7' },
        { skill: 'Hear', label: 'Hear it: which 7th chord?', quiz: 'l5-7ths-ear' },
        { skill: 'Play', label: 'The five 7th chords as shells (mic)', ex: { label: 'The five 7th chords on C as shells: root, 3rd and 7th', tab: 'shells7' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Seventh chords: five qualities, shells and drop 2". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) the formulas of maj7, 7, m7, m7♭5 and dim7, (2) what "7" on its own means, (3) what a shell voicing is and why it works, (4) which notes can be left out and which can\'t, (5) what drop 2 means and why guitarists use it, (6) how to choose between drop-2 inversions. Keep it short.',
        points: ['maj7 1 3 5 7 · 7 1 3 5 ♭7 · m7 1 ♭3 5 ♭7 · m7♭5 1 ♭3 ♭5 ♭7 · dim7 1 ♭3 ♭5 ♭♭7', '"7" = dominant (♭7); a major 7th must be written maj7', 'shell = root, 3rd, 7th; 6th-string and 5th-string root shapes', 'keep the 3rd and 7th; drop the 5th first (unless altered); the root can go with a bass player', 'drop 2 = the second-highest note of a close chord down an octave: four notes on four strings', 'choose the inversion by its top note (the melody note)'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'I90s7t1o7lQ', title: '7th Chords on Guitar Explained [Music Theory and Practice]' },
      books: [
        { book: 'Music Theory for Guitarists', where: 'The chapter on seventh chords', why: 'How each quality is built, with the theory of the 7th as a 3rd above the 5th.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'The seventh chords chapter', why: 'More voicings and how to practise them.' },
        { book: 'No Bull Music Theory for Guitarists', where: 'The part on 7th chords', why: 'A quick review in the style you started the course with.' },
      ],
      blocks: [
        { p: '**Next in Level 5**: the seven 7th chords of a key, and the ii – V – I.' },
        { p: '**Extra credit**: Jens Larsen\'s "Ultimate Jazz Chord Guide" (search it on YouTube) covers twelve voicing systems. Shells and drop 2 are the first two; the rest build on them.' },
      ],
    },
  ],
}

// ---- Lesson 3: the 7th chords of a key -----------------------------------------------------------------------------
export const KEY_SEVENTHS: CourseLesson = {
  id: 'c5-key7', level: 5, n: 3, title: 'The 7th chords of a key, and ii – V – I', key: 0, minutes: 90,
  goal: 'Name and play the seven 7th chords of any major key (Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø7) and of the relative minor, group them by job (tonic, predominant, dominant), play ii – V – I in shells and drop 2 with the smallest moves, and hear why V7 points so strongly to I.',
  builds: ['seventh chords', 'the chords of a key', 'Roman numerals', 'the circle of fifths'],
  topics: ['diatonic 7th chords', 'ii-V-I', 'harmonic function', 'tritone', 'jazz', 'progressions'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'In Level 2 you built a triad on every note of the major scale and got the chords of a key: I ii iii IV V vi vii°. Do the same with **four** notes and you get the key\'s **seventh chords**. The pattern is fixed, the same in every key: **maj7, m7, m7, maj7, 7, m7, m7♭5**.' },
        { p: 'Two big things come out of it. First, there\'s only **one** dominant 7th chord in a key, the **V7**, so the moment you hear a dominant 7 you know where home is. Second, the chord pattern **ii – V – I** (Dm7 – G7 – Cmaj7 in C) falls out of it: the most important progression in jazz, and a workhorse in soul, R&B, bossa nova, gospel and pop ballads.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['name the seven 7th chords of any major key and its relative minor;', 'group them by job: home (tonic), moving away (predominant), pulling back (dominant);', 'explain the tritone in V7 and how it resolves;', 'play ii – V – I in shells and in drop 2, moving the fewest notes;', 'hear a ii – V – I and a V7 – I in music.'] },
        { prog: { label: 'Dm7 – G7 – Cmaj7: ii – V – I in C', chords: [notes([-1, 5, 3, 5, -1, -1]), notes([3, -1, 3, 4, -1, -1]), notes([-1, 3, 2, 4, -1, -1])], gap: 1.4 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Stack four notes on each degree', blocks: [
        { p: 'Take the C major scale and build a chord on each note using **only notes of the scale**: every other note, four times (1 3 5 7 of that degree).' },
        { list: ['**I** C E G B = **Cmaj7**', '**ii** D F A C = **Dm7**', '**iii** E G B D = **Em7**', '**IV** F A C E = **Fmaj7**', '**V** G B D F = **G7**', '**vi** A C E G = **Am7**', '**vii** B D F A = **Bm7♭5**'] },
        { p: 'Memorise the qualities as a line: **maj7 m7 m7 maj7 7 m7 m7♭5**. Same in every major key. In G: Gmaj7 Am7 Bm7 Cmaj7 D7 Em7 F♯m7♭5.' },
        { p: 'The **relative minor** uses the same seven chords starting from vi: in A minor, **Am7 Bm7♭5 Cmaj7 Dm7 Em7 Fmaj7 G7** (i7 iiø7 IIImaj7 iv7 v7 VImaj7 VII7). In practice minor songs often borrow **E7** (from harmonic minor) for the v, because a minor v7 doesn\'t pull home strongly. Level 7 covers that properly.' },
        { spots: fig('Dm7 shell, x 5 3 5: the ii chord of C.', 2, 'm7', [-1, 5, 3, 5, -1, -1], 5) },
      ],
    },
    {
      kind: 'learn', title: '2 · Three jobs: home, away, back', blocks: [
        { p: 'The seven chords do three jobs. Think of a story: you start at home, go somewhere, then something pulls you back.' },
        { list: [
          '**Tonic (home)**: **Imaj7**, and its stand-ins **iii7** and **vi7** (they share three notes with I). Restful.',
          '**Predominant (moving away)**: **ii7** and **IVmaj7** (they share three notes). They lead towards the dominant.',
          '**Dominant (pulling back)**: **V7** and **viiø7** (Bm7♭5 is G9 without its root). Tense: they want I.',
        ] },
        { p: 'Most progressions are this story told again and again: **tonic → predominant → dominant → tonic**. I – IV – V – I, I – vi – ii – V, and ii – V – I are all the same story with different actors.' },
        { tip: 'Substitution starts here: you can usually replace a chord with another chord of the same job. Swap IV for ii, or I for vi, and the song still works but takes on a new colour. Level 7 goes much further.' },
      ],
    },
    {
      kind: 'learn', title: '3 · The tritone: why V7 points home', blocks: [
        { p: 'G7 contains **B** and **F**, a **tritone** apart (6 frets): the most unstable interval in the key. B is the **leading note** (a half step below C) and F is a half step above E. So:' },
        { list: ['**B rises to C** (the root of I).', '**F falls to E** (the 3rd of I).'] },
        { p: 'Two half-step moves, in opposite directions, onto the two most important notes of the home chord. No other chord in the key has a tritone between its 3rd and 7th, which is why **V7 is the only dominant 7th in a key** and why hearing one tells you instantly where home is.' },
        { prog: { label: 'G7 → C: listen to B go up and F go down', chords: [notes([3, -1, 3, 4, -1, -1]), notes([-1, 3, 2, 4, -1, -1])], gap: 1.5 } },
        { spots: fig('G7 shell (3 x 3 4): F (♭7) on the D string, B (3) on the G string. That pair is the tritone.', 7, 'dom7', [3, -1, 3, 4, -1, -1], 3) },
      ],
    },
    {
      kind: 'learn', title: '4 · ii – V – I with the smallest moves', blocks: [
        { p: 'Roots move by 4ths in ii – V – I (D up to G, G up to C), the strongest root movement there is. If you play every chord in the same shape, your hand jumps. Instead, **alternate the 6th-string and 5th-string shells** and the chords sit next to each other:' },
        { list: ['**Dm7** x 5 3 5 (5th-string root)', '**G7** 3 x 3 4 (6th-string root)', '**Cmaj7** x 3 2 4 (5th-string root)'] },
        { p: 'Watch the two upper notes: Dm7\'s **C** (7th) falls to G7\'s **B** (3rd), Dm7\'s **F** (3rd) stays as G7\'s **F** (7th), then G7\'s **F** falls to Cmaj7\'s **E** and **B** stays. Each chord changes **one note by a half step**. That\'s voice leading, and lesson 8 is all about it.' },
        { p: 'The same in **drop 2** on the top strings: **Dm7** x x 10 10 10 10, **G7** x x 9 10 8 10, **Cmaj7** x x 9 9 8 8.' },
        { spots: fig('Cmaj7 drop 2 (x x 9 9 8 8), where the ii – V – I lands.', 0, 'maj7', [-1, -1, 9, 9, 8, 8], 9) },
        { video: { id: 'AjnrjSavuVc', title: 'Understanding the II-V-I Progression: Introduction to Jazz Guitar', note: 'The same progression from a jazz teacher, with more voicings.' } },
      ],
    },
    {
      kind: 'learn', title: '5 · What mastery looks like', blocks: [
        { p: 'You own the 7th chords of a key when:' },
        { list: [
          'Asked for any degree of any major key ("the iii7 of E♭"), you name the chord in **a few seconds**.',
          'You can play **all seven** in C, G and F as shells, up the neck, without stopping.',
          'You can play ii – V – I in **four keys** in shells and in drop 2, with no jumps.',
          'You can say which **job** each chord does and swap chords of the same job.',
          'You can **hear** a V7 – I and a ii – V – I in a song.',
        ] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Scale first, then stack 3rds; the quality line does the rest.', examples: [
        { q: 'Name the 7th chords of G major.', steps: ['G major: G A B C D E F♯.', 'Apply the line maj7 m7 m7 maj7 7 m7 m7♭5.'], answer: 'Gmaj7 Am7 Bm7 Cmaj7 D7 Em7 F♯m7♭5.' },
        { q: 'What is the ii – V – I in F?', steps: ['F major: F G A B♭ C D E.', 'ii = G, V = C, I = F.'], answer: 'Gm7 – C7 – Fmaj7.' },
        { q: 'You hear a song sit on A7 and then resolve. What chord does it probably resolve to, and why?', steps: ['A dominant 7th only occurs as the V7 of one key.', 'A is the 5th of D.'], answer: 'D (or Dm): A7 is V7 of D. Its C♯ and G (the tritone) resolve to D and F♯ (or F).' },
        { q: 'Play the ii – V – I in G with shells, no jumps.', steps: ['Am7 – D7 – Gmaj7.', 'Am7 with the 6th-string root: 5 x 5 5.', 'D7 with the 5th-string root: x 5 4 5.', 'Gmaj7 with the 6th-string root: 3 x 4 4.'], answer: '5 x 5 5 → x 5 4 5 → 3 x 4 4.', spots: ex(7, 'maj7', [3, -1, 4, 4, -1, -1], 3) },
        { q: 'In the key of C, which chord could replace Fmaj7 without changing the job?', steps: ['Fmaj7 is IV, a predominant chord.', 'The other predominant chord is ii: Dm7 (D F A C shares F A C with Fmaj7).'], answer: 'Dm7.' },
        { q: 'Why is Bm7♭5 a dominant chord in C?', steps: ['Bm7♭5 = B D F A.', 'G9 = G B D F A: Bm7♭5 is G9 without the G.', 'It has the tritone B–F.'], answer: 'It\'s a rootless G9: same tritone, same pull to C.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'The ear knows a dominant 7th: it sounds like a question. Practise hearing **where it wants to go** before it gets there: play G7 and stop, then sing the C you expect. Then hear the three jobs: tonic chords feel like sitting down, predominant chords like standing up, dominant chords like leaning forward.' },
        { list: ['Play Cmaj7 – Am7 – Dm7 – G7 and stop on G7. Sing the resolution.', 'Play ii – V – I in C and sing the guide tones: C B B, F F E.', 'Play the seven chords of C in order and say the job of each out loud.'] },
      ],
      drills: [
        { label: 'Hear it: which 7th chord?', quiz: 'l5-7ths-ear', minutes: 4 },
        { label: 'Hear it: how does it end?', quiz: 'l3-cadence-ear', minutes: 4 },
        { label: 'Hear it: which chord of the key?', quiz: 'l2-num-ear', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Playing Gmaj7 as the V chord of C.', right: 'The V of a major key is always a dominant 7th: G7 (with F, not F♯).' },
        { wrong: 'Thinking the iii7 and vi7 are "minor key" chords.', right: 'They\'re tonic stand-ins in the major key: they share three notes with Imaj7.' },
        { wrong: 'Jumping the same shell shape from chord to chord in a ii – V – I.', right: 'Alternate 6th-string and 5th-string shells: each chord is a fret or two from the last.' },
        { wrong: 'Using the natural minor v7 (Em7 in A minor) and wondering why it doesn\'t pull home.', right: 'Minor-key songs usually raise its 3rd: E7. It comes from harmonic minor (Level 7).' },
        { wrong: 'Calling Bm7♭5 "B minor 7".', right: 'It has a ♭5: B D F A. Half-diminished, written Bm7♭5 or Bø.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Slowly, naming each chord, its Roman numeral and its job as you play.',
      challenge: { label: 'ii – V – I in all twelve keys', ex: { label: 'ii – V – I in C: Dm7 G7 Cmaj7, shells then drop 2', tab: 'iiVI' }, goal: 'then round the circle of fifths: C, F, B♭, E♭… all twelve keys in shells without stopping (a click at 60)', why: 'Every key, by sound and by shape, with no time to think: that\'s when ii – V – I stops being a pattern and becomes part of your vocabulary.' },
      goals: [
        { focus: 'Name them', tasks: [{ label: 'The 7th chords of a key', quiz: 'l5-key7', minutes: 6, goal: '2 stars' }] },
        { focus: 'Play the key', tasks: [{ label: 'The seven 7th chords of C, up the neck', ex: { label: 'The 7th chords of C major: Cmaj7 Dm7 Em7 Fmaj7 G7 Am7 Bm7♭5', tab: 'key7' }, minutes: 8, goal: 'no stops at 70 BPM' }] },
        { focus: 'ii – V – I', tasks: [{ label: 'ii – V – I, shells then drop 2', ex: { label: 'ii – V – I in C: Dm7 G7 Cmaj7, shells then drop 2', tab: 'iiVI' }, minutes: 8 }] },
        { focus: 'Around the circle', tasks: [{ label: 'Circle of fifths: find the ii and V of each key', tool: 'circle', minutes: 5 }] },
        { focus: 'Hear them', tasks: [{ label: 'Hear it: how does it end?', quiz: 'l3-cadence-ear', minutes: 4, goal: '2 stars' }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: [
          '**Jam**: choose a jazz or bossa style and play ii – V – I – vi round and round in shells.',
          '**Fills between chords**: the small moves of ii – V – I are perfect for fills: play the guide tones as a melody.',
          '**Any song in a major key**: turn every chord into its 7th chord from the key. Hear how the song becomes smoother and jazzier.',
          '**Turnarounds**: at the end of a section play I – vi – ii – V back to I.',
        ] },
      ],
      tasks: [
        { label: 'Jam: ii – V – I – vi', tool: 'jam', minutes: 10 },
        { label: 'Fills between chords', tool: 'fills', minutes: 10 },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Name them, hear them, play them, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'The 7th chords of a key', quiz: 'l5-key7' },
        { skill: 'Hear', label: 'Hear it: how does it end?', quiz: 'l3-cadence-ear' },
        { skill: 'Play', label: 'ii – V – I, shells then drop 2 (mic)', ex: { label: 'ii – V – I in C: Dm7 G7 Cmaj7, shells then drop 2', tab: 'iiVI' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "The 7th chords of a key, and ii – V – I". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) the quality pattern of the seven 7th chords of a major key, (2) the 7th chords of the relative minor, (3) tonic, predominant and dominant chords, (4) the tritone in V7 and how it resolves, (5) how to play ii – V – I without jumping, (6) why viiø7 is a dominant chord. Ask me for the 7th chords of a key I don\'t expect. Keep it short.',
        points: ['maj7 m7 m7 maj7 7 m7 m7♭5 in every major key', 'relative minor = the same chords from vi (Am7 Bm7♭5 Cmaj7…); V7 often borrowed', 'tonic I/iii/vi, predominant ii/IV, dominant V/vii', 'V7 has the tritone 3–♭7: B up to C, F down to E; the only dominant 7 in the key', 'alternate 6th- and 5th-string shells; 7th falls to 3rd, 3rd holds as 7th', 'viiø7 = V9 without its root'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'JKOILPmU9pU', title: 'The Ultimate Jazz Chord Guide: 12 Most Important Voicing Types' },
      books: [
        { book: 'Music Theory for Guitarists', where: 'The chapter on harmonizing the major scale in 7th chords', why: 'The whole key of 7th chords, and function.' },
        { book: 'The Circle of Fifths for Guitarists', where: 'The part on ii – V – I round the circle', why: 'Why the progression follows the circle, and drills in every key.' },
        { book: 'Harmony in Practice', where: 'The chapters on chord function', why: 'Tonic, predominant and dominant, with exercises to check your answers.' },
      ],
      blocks: [
        { p: '**Next in Level 5**: sus, add, 6 and power chords: the colours of pop, rock and folk.' },
        { p: '**Extra credit**: take a standard you know (or a pop ballad) and mark every ii – V in it. They hide everywhere, often moving to keys other than home.' },
      ],
    },
  ],
}

// ---- Lesson 4: sus, add, 6 and power chords ------------------------------------------------------------------------
export const COLOURS: CourseLesson = {
  id: 'c5-colours', level: 5, n: 4, title: 'Sus, add, 6 and power chords: colour without the 7th', minutes: 75,
  goal: 'Build and play sus2, sus4, add9, 6, m6 and power chords from any root, know what each one changes (the 3rd replaced, a note added, or the 3rd removed), use sus chords that resolve and sus chords that just ring, and know why power chords are the chord of distortion.',
  builds: ['triads', 'intervals', 'seventh chords'],
  topics: ['sus chords', 'add9', 'sixth chords', 'power chords', 'chord construction', 'rock', 'pop'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Not every colourful chord is a jazz chord. **Sus**, **add** and **6** chords are the shimmer of pop, folk, country and worship guitar: the open-string ring of Dsus4 – D, the Cadd9 that makes a strummed song sound like a record, the C6 at the end of a country tune. And **power chords**, just root and 5th, are the backbone of rock and metal.' },
        { p: 'Each one is a small, precise change to a triad: **replace** the 3rd (sus), **add** a note (add9, 6), or **remove** the 3rd (power chord). Learn what each change does and you\'ll know which colour to reach for.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['spell sus2, sus4, add9, 6, m6 and 5 chords from any root;', 'use a sus4 that resolves to the major chord, and a sus2 that just rings;', 'tell add9 from 9, and 6 from m7;', 'play power chords with the root on the 6th and 5th strings, two or three notes;', 'hear sus2, sus4, add9 and 6 against the plain major chord.'] },
        { prog: { label: 'D – Dsus4 – D – Dsus2 – D: the classic folk-rock shimmer', chords: [notes([-1, -1, 0, 2, 3, 2]), notes([-1, -1, 0, 2, 3, 3]), notes([-1, -1, 0, 2, 3, 2]), notes([-1, -1, 0, 2, 3, 0]), notes([-1, -1, 0, 2, 3, 2])], gap: 0.9 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Sus chords: the 3rd is replaced', blocks: [
        { p: '"Sus" is short for **suspended**. The 3rd is taken out and **replaced** by the note next to it:' },
        { list: ['**sus4** = 1 4 5: the 3rd raised to the 4th. Dsus4 = D G A.', '**sus2** = 1 2 5: the 3rd lowered to the 2nd. Dsus2 = D E A.'] },
        { p: 'With no 3rd, a sus chord is **neither major nor minor**. It hangs in the air. Two ways to use it:' },
        { list: [
          '**Resolve it**: sus4 → major (the 4 falls a half step to the 3). Dsus4 – D, Asus4 – A, G7sus4 – G7. Centuries old, still everywhere.',
          '**Let it ring**: sus2 often doesn\'t resolve at all. Open, modern, ambiguous: perfect when you don\'t want to say "happy" or "sad".',
        ] },
        { spots: fig('Dsus4 (x x 0 2 3 3): the 4 (G) on the high e, where the 3rd (F♯) would be.', 2, 'sus4', [-1, -1, 0, 2, 3, 3], 2) },
        { tip: 'A sus2 chord and a sus4 chord can share notes: Dsus2 (D E A) has the same notes as Asus4 (A D E). The bass note and context decide which name fits.' },
      ],
    },
    {
      kind: 'learn', title: '2 · Add and 6: a note on top', blocks: [
        { p: 'These keep the 3rd and **add** a colour:' },
        { list: [
          '**add9** = 1 3 5 9: a major triad plus the 9th (the 2nd, an octave up). **No 7th.** Cadd9 = C E G D. Bright and full.',
          '**6** = 1 3 5 6. C6 = C E G A. Sweet, old-fashioned, the sound of country, swing and the last chord of many songs.',
          '**m6** = 1 ♭3 5 6. Am6 = A C E F♯. Dark but elegant (gypsy jazz, bossa nova, spy films).',
          '**m(add9)** = 1 ♭3 5 9. Am(add9) = A C E B. Wistful.',
        ] },
        { spots: fig('Cadd9 (x 3 2 0 3 0): the 9 (D) on the B string, in place of the C of the open chord.', 0, 'add9', [-1, 3, 2, 0, 3, 0], 2) },
        { p: '**add9 vs 9**: a "9" chord (lesson 5) also has the ♭7: C9 = C E G B♭ D. "add9" means **just** the 9. **6 vs m7**: C6 (C E G A) has exactly the same notes as Am7 (A C E G). With C in the bass it\'s C6; with A in the bass it\'s Am7.' },
        { video: { id: 'Qftt4IyV9V8', title: 'Finally Understanding sus2, sus4, 9, add9, 6 & 13 Chords', note: 'Every chord in this lesson, heard side by side.' } },
      ],
    },
    {
      kind: 'learn', title: '3 · Power chords: the 3rd removed', blocks: [
        { p: 'A **power chord** (C5) is just **root and 5th**, often with the root doubled an octave up: **1 5** or **1 5 8**. No 3rd, so like a sus chord it\'s neither major nor minor; the riff and the bass decide.' },
        { list: ['**Root on the 6th string**: E5 **0 2 2**, G5 **3 5 5**, A5 **5 7 7**.', '**Root on the 5th string**: C5 **x 3 5 5**, D5 **x 5 7 7**.', 'Two strings (R 5) for fast riffs, three (R 5 8) for a bigger sound.'] },
        { spots: fig('G5 (3 5 5): root, 5th, root an octave up.', 7, 'five', [3, 5, 5, -1, -1, -1], 4) },
        { p: '**Why rock uses them**: distortion adds loud overtones and "difference tones" to every note. A root and 5th (a simple 3:2 ratio) produce tones that fit the chord, so it sounds huge and clear. A 3rd (5:4) produces tones that clash, so full major and minor chords turn to mud under heavy gain. Clean, a power chord sounds thin; distorted, it sounds like a wall.' },
        { tip: 'Palm-mute power chords for chugs (rest the side of your picking hand on the strings by the bridge). Mute every string you\'re not playing with the fretting hand.' },
      ],
    },
    {
      kind: 'learn', title: '4 · Choosing a colour', blocks: [
        { p: 'Quick guide for when you want to dress up a plain major chord:' },
        { list: [
          'Want **movement** inside one chord? Alternate it with its **sus4** (and sus2): D – Dsus4 – D – Dsus2.',
          'Want it **brighter and bigger**? **add9**.',
          'Want it **sweet and settled** (an ending)? **6**.',
          'Want it **ambiguous**, neither happy nor sad? **sus2**.',
          'Playing with **distortion**? **Power chords** (or sus2, which also survives distortion).',
          'Want it to **pull** somewhere? That\'s a **7th** chord\'s job (lesson 2).',
        ] },
        { p: 'Open strings make these chords easy and ringing in keys like G, D, A, E and C: Cadd9, Dsus2, Asus2, Esus4 all use open strings as the added note.' },
      ],
    },
    {
      kind: 'learn', title: '5 · What mastery looks like', blocks: [
        { p: 'You own these colours when:' },
        { list: [
          'You can **spell** sus2, sus4, add9, 6, m6 and 5 on any root quickly.',
          'You can play the **D, A and E** sus4 – major – sus2 – major move in open position, and **C – Cadd9 – C6**.',
          'You can play power-chord riffs with roots on the 6th and 5th strings, palm-muted, **with no stray strings**.',
          'You can say why add9 ≠ 9 and why C6 = Am7 with a different bass.',
          'By ear you can pick major, sus2, sus4, add9 and 6 apart **eight times out of ten**.',
        ] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Start from the major triad, then make the one change the name asks for.', examples: [
        { q: 'Spell Asus4 and Asus2.', steps: ['A major: A C♯ E.', 'sus4: the 3rd (C♯) up to D. sus2: the 3rd down to B.'], answer: 'Asus4 A D E · Asus2 A B E.' },
        { q: 'Spell G6 and Gm6.', steps: ['G major: G B D; add the 6th, E.', 'G minor: G B♭ D; add E.'], answer: 'G6 G B D E · Gm6 G B♭ D E.' },
        { q: 'A chart says "Fadd9". What\'s the difference from F9?', steps: ['Fadd9 = F A C + G.', 'F9 = F A C E♭ G: it has the ♭7 too.'], answer: 'Fadd9 has no 7th (F A C G). F9 is a dominant chord with E♭.' },
        { q: 'Play an A5 power chord two ways.', steps: ['Root on the 6th string: A at the 5th fret → 5 7 7.', 'Root on the 5th string: open A → x 0 2 2.'], answer: '5 7 7 (x x x) or x 0 2 2.', spots: ex(9, 'five', [5, 7, 7, -1, -1, -1], 6) },
        { q: 'Is C6 the same chord as Am7?', steps: ['C6 = C E G A. Am7 = A C E G.', 'Same four notes; the bass note names it.'], answer: 'Same notes. C in the bass: C6. A in the bass: Am7.' },
        { q: 'Dsus2 or Asus4? You hear D E A with D in the bass, in a song in D.', steps: ['Asus4 would be A D E with A in the bass.', 'D is the bass and the key: it\'s a D chord with E replacing the 3rd.'], answer: 'Dsus2.', spots: ex(2, 'sus2', [-1, -1, 0, 2, 3, 0], 2) },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Every chord here is a plain major chord with one change, so hear them against the major: **sus4** sounds like it\'s leaning on a door that\'s about to open, **sus2** sounds open and airy, **add9** sounds bigger and brighter, **6** sounds sweet and finished. A power chord sounds like a major chord with its face hidden.' },
        { list: ['Play D, then Dsus4, then D: sing the G falling to F♯.', 'Play C and Cadd9 back to back: sing the D that\'s added.', 'Play C6 and then Am7 with A in the bass: same notes, different mood.'] },
      ],
      drills: [
        { label: 'Hear it: major, sus2, sus4, add9 or 6?', quiz: 'l5-sus-ear', minutes: 5, goal: '8 out of 10' },
        { label: 'Major or minor? (by ear)', quiz: 'ch-ear', minutes: 3 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Playing the 3rd and the 4th together in a sus4.', right: 'Sus means the 3rd is gone. If the 3rd rings with the 4th, it\'s a different (crunchy) chord.' },
        { wrong: 'Reading add9 as a 9 chord and adding a ♭7.', right: 'add9 = triad + 9 only. A 9 chord includes the ♭7.' },
        { wrong: 'Using full major chords with heavy distortion and wondering why it\'s muddy.', right: 'With high gain, play power chords (or sus2). Save full chords for clean or light crunch.' },
        { wrong: 'Letting open strings ring through power chords.', right: 'Mute with the fretting fingers\' undersides; palm-mute the low strings when you chug.' },
        { wrong: 'Calling every three-fret shape "a power chord" even with the 3rd in it.', right: 'A power chord has no 3rd: 1 5 (8). Add the 3rd and it\'s a major or minor triad.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Strum or pick slowly; say the chord and the change ("4 replaces 3", "add the 9") as you go.',
      challenge: { label: 'Dress up a whole song', ex: { label: 'Sus2, sus4, add9 and 6: colours round D and C', tab: 'susAdd' }, goal: 'then take a 3- or 4-chord song you strum and give every chord one colour change (sus4 resolving, add9, a 6 at the end) without stopping', why: 'Choosing colours in a real song, in time, is what this lesson is for: it\'s how a plain strum becomes an arrangement.' },
      goals: [
        { focus: 'Build them', tasks: [{ label: 'Spell the colour chord', quiz: 'l5-spell-colour', minutes: 5, goal: '2 stars' }] },
        { focus: 'Sus and add in open position', tasks: [{ label: 'Sus2, sus4, add9 and 6 round D and C', ex: { label: 'Sus2, sus4, add9 and 6: colours round D and C', tab: 'susAdd' }, minutes: 8, goal: 'no stops at 70 BPM' }] },
        { focus: 'Power chords', tasks: [{ label: 'Power chords, chugged eighths', ex: { label: 'Power chords: R-5 and R-5-8, chugged eighths', tab: 'power' }, minutes: 6, goal: 'clean at 100 BPM, no stray strings' }, { label: 'Palm muting', ex: { label: 'Palm muting', drill: 'palmmute' }, minutes: 4 }] },
        { focus: 'Hear them', tasks: [{ label: 'Hear it: major, sus2, sus4, add9 or 6?', quiz: 'l5-sus-ear', minutes: 5, goal: '2 stars' }] },
        { focus: 'Move them', tasks: [{ label: 'Chord changes: D – Dsus4 – D – Dsus2, A – Asus4 – A – Asus2', tool: 'changes', minutes: 5, goal: '40 changes a minute' }] },
        { focus: 'Choose them', tasks: [{ label: 'Jam: a pop progression with colour chords', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: [
          '**Folk and worship strumming**: Cadd9 – Em7 – G – Dsus4 in G: the four chords that sound like every acoustic record (all with the 3rd and 4th fingers anchored on the B and e strings).',
          '**Rock**: write a riff on the low strings with power chords and palm mutes, then loop it and solo over it.',
          '**Endings**: finish a song on I6 instead of I.',
          '**Looper**: loop a plain strum on track 1, then a sus/add part high up on track 2.',
        ] },
      ],
      tasks: [
        { label: 'Jam: colour chords', tool: 'jam', minutes: 10 },
        { label: 'Techniques: palm muting and riffs', tool: 'techniques', minutes: 5 },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Hear them, play them, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Spell the colour chord', quiz: 'l5-spell-colour' },
        { skill: 'Hear', label: 'Hear it: major, sus2, sus4, add9 or 6?', quiz: 'l5-sus-ear' },
        { skill: 'Play', label: 'Sus, add and 6 round D and C (mic)', ex: { label: 'Sus2, sus4, add9 and 6: colours round D and C', tab: 'susAdd' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Sus, add, 6 and power chords". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) what sus2 and sus4 replace and how sus4 resolves, (2) the difference between add9 and 9, (3) why C6 and Am7 have the same notes, (4) what a power chord is and why it works with distortion, (5) which colour to choose for an ending, for movement inside one chord, and for an ambiguous sound. Ask me to spell two of them on roots I don\'t expect. Keep it short.',
        points: ['sus4 1 4 5, sus2 1 2 5: the 3rd replaced; sus4 resolves 4 → 3', 'add9 = triad + 9, no 7th; 9 = dominant 7 + 9', 'C6 = C E G A = Am7 with a different bass', 'power chord = 1 5 (8), no 3rd: clean overtones under distortion', '6 for endings, sus4 – major for movement, sus2 for ambiguity, add9 for brightness'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'QJO5vYO4_8I', title: 'Power Chord Shifts and Palm Mutes' },
      books: [
        { book: 'Music Theory for Guitarists', where: 'The chapter on suspended and added-note chords', why: 'How these chords are named and why the names work the way they do.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'The chord construction chapter', why: 'More voicings of sus, add and 6 chords up the neck.' },
        { book: 'Progressive Metal Guitar', where: 'The early chapters on power chords and riffs', why: 'Power chords taken to their heavy, modern extreme.' },
      ],
      blocks: [
        { p: '**Next in Level 5**: extensions. 9ths, 11ths and 13ths: what happens when you keep stacking 3rds past the 7th.' },
      ],
    },
  ],
}

export const LEVEL5_A: CourseLesson[] = [AUG_DIM, SEVENTHS, KEY_SEVENTHS, COLOURS]
