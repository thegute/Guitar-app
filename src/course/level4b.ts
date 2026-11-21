// Level 4 (Mapping the fretboard), lessons 4–8 and the mastery check: triads on every string set (close and spread),
// the major scale in five positions, 3rds / 6ths / double stops, three-notes-per-string scales, and Rhythm 4
// (sixteenths and syncopation). Same standard as lessons 1–3: the idea from the ground up, worked examples, ear
// training, mistakes, goals with a challenge round, use in music, a check with explain-it-back, and go deeper.
// Facts checked on a standard-tuned guitar:
//   C on D-G-B: 2-0-1 (1st inv), 5-5-5 (2nd), 10-9-8 (root). On A-D-G: 3-2-0 (root), 7-5-5 (1st), 10-10-9 (2nd).
//   On E-A-D: 8-7-5 (root), 12-10-10 (1st), 3-3-2 (2nd). Spread C: E-D-G 8-10-9 (R-5-3), 3-2-5 (5-3-R), 12-10-12 (3-R-5);
//   A-G-B 3-0-5 (R-5-3), 7-5-8 (3-R-5), 10-9-13 (5-3-R); D-B-e 10-8-12 (R-5-3).
//   C major positions: C shape 0–3, A 2–5, G 4–8, E 7–10, D 9–13 (l4bTabs majorPosition).
//   3rds: on G-B major = same fret, minor = one fret back; on the other neighbouring pairs major = one back, minor = two back.
//   6ths: on G-e and D-B major = same fret, minor = one back; on E-D and A-G major = one back, minor = two back.
//   Diatonic 3rds in a major key: M m m M M m m. Diatonic 6ths: M M m M M m m.
//   3NPS C major pattern 1 (from C on the low E, 8th fret): 8 10 12 | 8 10 12 | 9 10 12 | 9 10 12 | 10 12 13 | 10 12 13.
import type { CourseLesson } from './types'
import { majorPosMarks, pairMarks, setMarks, spreadSet, stringSet } from './l4bTabs'

const G = [40, 45, 50, 55, 59, 64]
void G

// ---- Lesson 4: triads on every string set ---------------------------------------------------------------------------
export const STRING_SETS: CourseLesson = {
  id: 'c4-stringsets', level: 4, n: 4, title: 'Triads on every string set: close and spread', minutes: 85,
  goal: 'Play any major or minor triad in every inversion on all four sets of three strings, know why the shapes change where the B string comes in, find one chord in a column across the whole neck, voice-lead a progression on any set, and use spread triads for the big open sound of piano and string arrangements.',
  builds: ['triads on the top three strings', 'the CAGED shapes', 'voice leading'],
  topics: ['triads', 'inversions', 'string sets', 'spread triads', 'voice leading', 'CAGED', 'rhythm guitar'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Last lesson put every triad on the top three strings. That set is the most useful, but it\'s only a quarter of the neck. The same three notes live on **every** group of three neighbouring strings: **D-G-B**, **A-D-G** and **E-A-D**. Each set has its own colour: the higher sets sparkle, the lower ones are warm and full, the bottom set growls like a piano\'s left hand.' },
        { p: 'Knowing all four sets means you never have to jump to find a chord. Whatever your hand is doing, a voicing of the next chord is a fret or two away, on the strings you\'re already on. It\'s also the key to **arranging**: two guitars (or guitar and keys) sound twice as big when one plays high triads and the other plays the same chords on a lower set.' },
        { p: 'And there\'s a second kind: **spread triads**, where one note jumps up an octave so the chord opens out over a skipped string. That\'s the sound of Tommy Emmanuel\'s ballads, of string sections and of a lot of modern worship and indie guitar: wide, ringing, never muddy.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['play any major or minor triad in all three inversions on all four string sets;', 'say why the shapes change on the sets that include the B string;', 'find one chord in a narrow "column" of the neck on every set;', 'voice-lead I – vi – IV – V on any set;', 'play spread triads (R-5-3, 3-R-5, 5-3-R) and use them for big, open chord parts.'] },
        { prog: { label: 'C on E-A-D, A-D-G, D-G-B, G-B-e: the same chord climbing across the neck', chords: [[48, 52, 55], [48, 52, 55].map(x => x + 12), [55, 60, 64], [60, 64, 67]], gap: 1 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Same three notes, four places', blocks: [
        { p: 'A triad on three neighbouring strings always comes in the same three inversions you know: **root position** (5th on top), **1st inversion** (root on top), **2nd inversion** (3rd on top). Up the neck they still come in the same order: each new shape takes the lowest note and puts it on top.' },
        { p: '**C major on D-G-B** (strings 4, 3, 2):' },
        { list: ['**1st inversion** (E G C): **2 0 1**, the middle of the open C chord.', '**2nd inversion** (G C E): **5 5 5**, a one-finger barre.', '**Root position** (C E G): **10 9 8**.'] },
        { spots: { caption: 'C major on the D, G and B strings, every inversion up the neck.', from: 0, to: 15, marks: midis => setMarks(midis, 0, false, stringSet(midis, 1)) } },
        { p: '**C major on A-D-G** (strings 5, 4, 3): **3 2 0** (root position, the open C chord again), **7 5 5** (1st), **10 10 9** (2nd).' },
        { p: '**C major on E-A-D** (strings 6, 5, 4): **8 7 5** (root position, the top of the E-shape barre turned into a triad), **12 10 10** (1st), and **3 3 2** (2nd: G in the bass).' },
        { spots: { caption: 'C major on the A, D and G strings.', from: 0, to: 15, marks: midis => setMarks(midis, 0, false, stringSet(midis, 2)) } },
      ],
    },
    {
      kind: 'learn', title: '2 · Why the shapes change: the B string', blocks: [
        { p: 'Guitar strings are tuned a **4th** apart (5 frets), except **G to B**, which is a **major 3rd** (4 frets). That one kink is why chord shapes bend when they cross the B string.' },
        { list: [
          '**E-A-D and A-D-G** are both all-4ths sets, so their shapes are **identical**: the root-position triad on E-A-D (8 7 5 for C) is the same shape as on A-D-G (3 2 0 for C, or 8 7 5 for F). Move a shape across a string and it becomes the chord a 4th higher.',
          '**D-G-B** has the kink between its middle and top string: every note on the B string sits **one fret higher** than the all-4ths shape would put it.',
          '**G-B-e** has the kink between its bottom and middle string: the G-string note sits one fret **lower** compared with the others.',
        ] },
        { p: 'So you really learn **three** families of shapes, not four: the all-4ths sets, D-G-B, and G-B-e. The rule never changes, only where the one-fret bend falls.' },
        { tip: 'When a shape you know "doesn\'t sound right" after moving it across, check whether you crossed from G to B. Push the note on the B string up a fret (or the G-string note down) and it\'s fixed.' },
      ],
    },
    {
      kind: 'learn', title: '3 · Minor, and the triads of a key', blocks: [
        { p: 'Minor works exactly as before: find the **3rd** and lower it one fret. The 3rd moves strings as the inversion changes, so the finger that moves changes too.' },
        { p: '**A minor on D-G-B**: **7 5 5** (root position: A C E, the minor 3rd on the G string), **10 9 10** (1st inversion: C E A), **2 2 1** (2nd inversion: E A C, the middle of the open Am chord).' },
        { spots: { caption: 'A minor on the D, G and B strings.', from: 0, to: 15, marks: midis => setMarks(midis, 9, true, stringSet(midis, 1)) } },
        { p: 'Every key\'s seven chords sit together in one area on every set, just as on the top strings. On **D-G-B** round the 5th fret in C: **C 5 5 5**, **Dm 7 7 6**, **Em 9 9 8** (or 2 0 0), **F 7 5 6**, **G 5 4 3**, **Am 7 5 5**, **Bdim 9 7 6**.' },
      ],
    },
    {
      kind: 'learn', title: '4 · One chord, one column: the neck as a grid', blocks: [
        { p: 'Here\'s where it all connects. Pick a spot on the neck, say around the **5th fret**. On each string set there\'s a C triad within a fret or two of it. Play them from the low set to the high set and the same chord **climbs across** the neck without your hand moving along it:' },
        { list: ['**E-A-D**: 3 3 2 or 8 7 5 (pick the one nearest).', '**A-D-G**: 7 5 5.', '**D-G-B**: 5 5 5.', '**G-B-e**: 5 5 3.'] },
        { p: 'That column is the **CAGED** map again, seen through triads: around the 5th fret you\'re in C\'s A shape, and every one of those triads is three notes of it. Rhythm players use the column to choose **register** (low and warm, or high and bright) without changing position; arrangers use it to give two instruments different parts of the same chord.' },
        { tip: 'Do this for every chord of a key: choose a column, find the chord on all four sets. After a week of that, any chord anywhere will feel close.' },
      ],
    },
    {
      kind: 'learn', title: '5 · Voice leading on every set', blocks: [
        { p: 'The two rules from last lesson work on any set: **keep the common tones**, **move the others the smallest step**. On D-G-B in C: **C 5 5 5 → Am 7 5 5 → F 7 5 6 → G 5 4 3 → C 5 5 5**. Count the moves: one finger, one finger, three small ones, back home.' },
        { p: 'Lower sets voice-lead the same way, but they sit where the bass player lives, so use them with care in a band: lighter, shorter, or when the bass drops out. Solo, they make a guitar sound like a piano\'s left hand.' },
        { p: 'Mixing sets is the pro move: start a phrase on D-G-B, move the top voice up to G-B-e as the tune rises. The top note sings a melody while the chords change underneath.' },
      ],
    },
    {
      kind: 'learn', title: '6 · Spread triads: the big open sound', blocks: [
        { p: 'A close triad fits inside an octave. A **spread** (or open) triad takes the **middle** note and moves it **up an octave**, so the chord stretches over more than an octave. On guitar that means skipping a string between the bottom two notes:' },
        { list: ['**R-5-3** (root at the bottom): C on E-D-G = **8 10 9**. On D-B-e = **10 8 12**.', '**3-R-5** (3rd at the bottom): C on E-D-G = **12 10 12**. On A-G-B = **7 5 8**.', '**5-3-R** (5th at the bottom): C on E-D-G = **3 2 5**. On A-G-B = **10 9 13**.'] },
        { spots: { caption: 'Spread C on the E, D and G strings (A string skipped): R-5-3 at the 8th fret, 5-3-R round the 3rd, 3-R-5 round the 12th.', from: 0, to: 15, marks: midis => setMarks(midis, 0, false, spreadSet(midis, 2), true) } },
        { p: 'Why it sounds so good: the notes are far enough apart that none of them rub, and the 3rd sits high where it sings. Piano players call it an **open voicing**; string sections and choirs use it all the time. Played fingerstyle (thumb on the low note, two fingers on the others) it\'s instant cinematic guitar.' },
        { p: 'Mute the skipped string with the underside of the finger on the lower note, or pick with fingers so it never sounds.' },
        { video: { id: 'W4ZeaKoynv4', title: 'Demystifying Triads and CAGED: Unlock the fretboard and improvise freely', note: 'Triads across the string sets, tied to the CAGED shapes: the column idea from section 4.' } },
      ],
    },
    {
      kind: 'learn', title: '7 · What mastery looks like', blocks: [
        { p: 'You own the string sets when, without stopping:' },
        { list: [
          'Called a chord, an inversion and a set, you play it in **about three seconds**.',
          'You can play one chord in a **column** on all four sets around any fret.',
          'You can play **I – vi – IV – V** voice-led on D-G-B and A-D-G in two keys.',
          'You can say **where the B-string bend** falls in a shape and fix it.',
          'You can play the three **spread** shapes of a major chord on E-D-G and A-G-B.',
          'You can play a whole chord progression in **spread triads**, moving the smallest distance.',
        ] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Find the 3rd first; the rest follows.', examples: [
        { q: 'Play C in 2nd inversion on D-G-B.', steps: ['2nd inversion = 5th at the bottom: G – C – E.', 'G on the D string: 5th fret. C on the G string: 5th fret. E on the B string: 5th fret.'], answer: '5 5 5: a one-finger barre.', spots: { from: 4, to: 7, marks: midis => setMarks(midis, 0, false, stringSet(midis, 1), false, t => t.low === '5' && t.lo >= 5 && t.lo <= 6, 4) } },
        { q: 'You know C root position on E-A-D (8 7 5). Move the shape over one set. What chord, and where?', steps: ['E-A-D to A-D-G: both all-4ths sets, so the shape doesn\'t change.', 'One string higher = a 4th higher: C becomes F.', 'Same frets: 8 7 5 on A-D-G.'], answer: 'F major, 8 7 5 on the A, D and G strings.' },
        { q: 'Now move that shape once more, onto D-G-B.', steps: ['D-G-B has the G–B kink between its middle and top string.', 'The note on the B string goes up one fret: 8 7 6.', 'A 4th above F is B♭.'], answer: 'B♭ major: 8 7 6 on D-G-B.' },
        { q: 'Make 10 9 8 on D-G-B minor.', steps: ['10 9 8 = C E G, root position: the 3rd (E) is on the G string.', 'Lower it a fret: G string 8.'], answer: 'Cm: 10 8 8.' },
        { q: 'Voice-lead C (5 5 5 on D-G-B) to F.', steps: ['C = C E G, F = F A C: C is common (G string, 5th fret).', 'G steps up to A (D string 5 → 7), E steps up to F (B string 5 → 6).'], answer: 'F: 7 5 6.' },
        { q: 'Play C as a spread triad with the root at the bottom on E-D-G.', steps: ['R-5-3: C at the bottom, then G, then E an octave above the close position.', 'C on the low E: 8th fret. G on the D string: 10th. E on the G string: 9th (the A string is skipped).'], answer: '8 10 9 (A string muted).' },
        { q: 'Which set gives the darkest, fullest C triad, and when would you avoid it?', steps: ['E-A-D is the lowest set.', 'It shares the bass player\'s range.'], answer: 'E-A-D: lovely solo or with no bass, but keep it light (or avoid it) when a bass is playing.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Two ears for this lesson. First, **register**: the same chord on a low set and a high set, which is which, and which one fits the song. Second, **open versus close**: a spread triad sounds wide and calm, a close one compact and punchy. Play both versions of C and listen for the space between the notes.' },
        { list: ['Play C on all four sets in a column and sing the top note of each.', 'Play C close (5 5 5 on D-G-B) then spread (8 10 9 on E-D-G): which sounds bigger?', 'Voice-lead C → Am → F → G on D-G-B and sing the top line.'] },
      ],
      drills: [
        { label: 'Where did the top voice go?', quiz: 'l4-lead-ear', minutes: 5, goal: '8 out of 10' },
        { label: 'Triad types by ear', quiz: 'tr-ear', minutes: 4, goal: '8 out of 10' },
        { label: 'The top note of a triad', quiz: 'l4-tri-top-ear', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Moving a shape from D-G-B to G-B-e (or the other way) without changing anything.', right: 'Crossing the G–B gap bends the shape: adjust the note on the B string by a fret.' },
        { wrong: 'Thinking four sets = four times as many shapes.', right: 'Three families: the all-4ths sets share shapes; only the two sets with the B string differ.' },
        { wrong: 'Letting the open strings around a low-set triad ring.', right: 'Mute them: the side of the fretting hand, or pick only the three strings.' },
        { wrong: 'Using the low sets under a bass player all the time.', right: 'Low triads fight the bass: play them lightly, short, or save them for solo playing.' },
        { wrong: 'Strumming spread triads with a pick and hitting the skipped string.', right: 'Mute the skipped string with the finger below it, or play them fingerstyle.' },
        { wrong: 'Learning each set as separate shapes to memorise.', right: 'Learn them as places in the CAGED map: every triad is three notes of a shape you know.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Over a slow beat. Say the set, the inversion and the top note before you play each shape.',
      challenge: { label: 'Spread triads: a whole progression, three ways', ex: { label: 'Spread triads: I – vi – IV – V – I on each set', tab: 'spread' }, goal: 'then play a song you strum using only spread triads, fingerstyle', why: 'Spread voicings are the sound of arrangers and fingerstyle players: doing a whole song in them proves you can find any chord in an open voicing.' },
      goals: [
        { focus: 'D-G-B', tasks: [{ label: 'C on D-G-B, every inversion', ex: { label: 'C on D-G-B, every inversion', tab: 'setInvDGB' }, minutes: 6, goal: 'no stops at 70 BPM' }, { label: 'Am on D-G-B, every inversion', ex: { label: 'Am on D-G-B, every inversion', tab: 'setInvDGBm' }, minutes: 5 }] },
        { focus: 'The lower sets', tasks: [{ label: 'C on A-D-G, every inversion', ex: { label: 'C on A-D-G, every inversion', tab: 'setInvADG' }, minutes: 5 }, { label: 'C on E-A-D, every inversion', ex: { label: 'C on E-A-D, every inversion', tab: 'setInvEAD' }, minutes: 5 }] },
        { focus: 'One chord, one column', tasks: [{ label: 'C on every set around the 5th fret', ex: { label: 'C on every string set around fret 5', tab: 'setsWalk' }, minutes: 5, goal: 'then the same for F and G' }] },
        { focus: 'Voice leading', tasks: [{ label: 'I – vi – IV – V – I on D-G-B', ex: { label: 'I – vi – IV – V – I voice-led on D-G-B', tab: 'setLead' }, minutes: 8 }] },
        { focus: 'Name it', tasks: [{ label: 'Name the inversion', quiz: 'tr-inv', minutes: 5, goal: '2 stars' }, { label: 'CAGED: where is it?', quiz: 'caged-where', minutes: 5 }] },
        { focus: 'Hear it', tasks: [{ label: 'Where did the top voice go?', quiz: 'l4-lead-ear', minutes: 5 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: [
          '**Jam**: one progression, three passes: top set, D-G-B, then spread triads. Record each and hear how the mood changes.',
          '**Looper**: loop a low-set part on track 1 (Rhythm), then a top-set part on track 2: the two-guitar arrangement trick.',
          '**Fills between chords**: the shells and free-finger moves work on D-G-B too.',
          '**A ballad from your songbook**: play it fingerstyle in spread triads.',
        ] },
      ],
      tasks: [
        { label: 'Jam: the same chords on three sets', tool: 'jam', minutes: 10 },
        { label: 'Fills between chords', tool: 'fills', minutes: 10 },
        { label: 'CAGED explorer: find the column', tool: 'caged', minutes: 5 },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Name the inversion', quiz: 'tr-inv' },
        { skill: 'Hear', label: 'Where did the top voice go?', quiz: 'l4-lead-ear' },
        { skill: 'Play', label: 'I – vi – IV – V – I on D-G-B (mic)', ex: { label: 'I – vi – IV – V – I voice-led on D-G-B', tab: 'setLead' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Triads on every string set: close and spread". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) the four string sets and the three inversions on each, (2) why shapes change when they cross the G and B strings, and which sets share shapes, (3) how to make a triad minor on any set, (4) the "column" idea and how it connects to CAGED, (5) what a spread triad is and the three spread shapes of C on E-D-G, (6) when to avoid the lowest set in a band. Keep it short.',
        points: ['sets E-A-D, A-D-G, D-G-B, G-B-e; root position, 1st, 2nd on each', 'G–B is a major 3rd, not a 4th: shapes bend by a fret there; E-A-D and A-D-G share shapes', 'lower the 3rd one fret, wherever it is in the shape', 'one chord on every set within a fret or two: three notes of one CAGED shape', 'the middle note up an octave, a string skipped: C on E-D-G 8 10 9, 12 10 12, 3 2 5', 'the low set clashes with the bass: keep it light or use it solo'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'ANQ4k3Zq-WE', title: 'Learn CAGED Triads • The Most Useful Shapes on Guitar' },
      books: [
        { book: 'Triads and Inversions', where: 'The chapters on each string set', why: 'Drills for every set, the heart of this lesson.' },
        { book: 'Triads for the Improvising Guitarist', where: 'The chapters on string sets and open triads', why: 'Using triads on every set for soloing as well as rhythm.' },
        { book: 'Fretboard Logic SE', where: 'The part on chord forms across the neck', why: 'Why the B string bends every shape, from the ground up.' },
      ],
      blocks: [
        { p: '**Next in Level 4**: the major scale in five positions, built round the CAGED shapes these triads live in.' },
        { p: '**Extra credit**: arrange a song for two guitars with the looper: a low-set part and a top-set part that never play the same notes.' },
      ],
    },
  ],
}

// ---- Lesson 5: the major scale in five positions -------------------------------------------------------------------
export const MAJOR_POSITIONS: CourseLesson = {
  id: 'c4-majorpos', level: 4, n: 5, title: 'The major scale in five positions', minutes: 90,
  goal: 'Play the major scale in all five CAGED positions in any key, see the chord shape and its 1 3 5 inside every position, know each note\'s degree as you play it, connect the positions up the neck, and use the same five patterns for the relative minor.',
  builds: ['the major scale and its formula', 'CAGED', 'the five pentatonic boxes', 'triads on every string set'],
  topics: ['major scale', 'scale positions', 'CAGED', 'scale degrees', 'fretboard', 'soloing'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'The pentatonic gave you five notes everywhere on the neck. The **major scale** has seven, and those two extra notes (the **4th** and the **7th**) are where melody gets its tension and its pull: the 4 that leans down to 3, the 7 that pulls up to the root. Every melody in a major key, every chord of the key, and later every mode, is built from this scale.' },
        { p: 'You\'ll learn it the way the neck is laid out: **five positions**, one round each CAGED shape. Each position is a chord shape with the scale\'s other notes filled in around it, so you always know where the chord tones are. That\'s the difference between running a pattern and **playing the changes**.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['play the major scale in all five CAGED positions, in any key;', 'say the degree (1 to 7) of every note you play;', 'see the chord shape (1 3 5) inside each position;', 'connect the positions, moving up and down the neck in a run;', 'use the same five positions for the relative minor.'] },
        { play: { label: 'C major, up and down: listen for the 4 and the 7', seq: [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60] } },
      ],
    },
    {
      kind: 'learn', title: '1 · Each position is a chord shape with the gaps filled', blocks: [
        { p: 'Take C\'s **A shape** at the 3rd fret. Its notes are the **1**, **3** and **5** of C. The scale\'s other notes, **2, 4, 6, 7**, sit in between, inside the same four or five frets. Fill them in and you have **position 2** of C major (frets 2–5):' },
        { list: ['low E: 3 5 (G, A)', 'A: 2 3 5 (B, C, D)', 'D: 2 3 5 (E, F, G)', 'G: 2 4 5 (A, B, C)', 'B: 3 5 (D, E)', 'high e: 3 5 (G, A)'] },
        { spots: { caption: 'C major round the A shape (frets 2–5). 1 3 5 are the chord; 2 4 6 7 fill the gaps.', from: 1, to: 6, marks: midis => majorPosMarks(midis, 0, ['A'], 1) } },
        { p: 'Every position works this way. The five, for C major, from the open position up:' },
        { list: ['**C shape**: frets 0–3 (the open-position C major scale).', '**A shape**: frets 2–5.', '**G shape**: frets 4–8.', '**E shape**: frets 7–10.', '**D shape**: frets 9–13, and then the C shape again at 12–15.'] },
        { p: 'Each position overlaps its neighbours by a fret or two, so together they cover the whole neck with no gaps.' },
        { spots: { caption: 'All five positions of C major: the whole neck in the key of C, every note labelled with its degree.', from: 0, to: 15, marks: midis => majorPosMarks(midis, 0, 'all') } },
      ],
    },
    {
      kind: 'learn', title: '2 · Pentatonic plus two', blocks: [
        { p: 'You already know four-fifths of each position. The **major pentatonic** is the major scale **without the 4 and the 7**: 1 2 3 5 6. Each pentatonic box you learned sits inside one of these positions. Add two notes per octave to the box and it becomes the full scale.' },
        { p: 'That gives you a practical way to learn them: play the pentatonic box you know, then add the 4 (a fret above the 3) and the 7 (a fret below the root). That\'s it.' },
        { tip: 'The 4 and 7 are the two notes a half step from a chord tone (4 above 3, 7 below 1). That\'s why they sound tense: they want to move. Pentatonic avoids them; the major scale uses them on purpose.' },
      ],
    },
    {
      kind: 'learn', title: '3 · Think in degrees, not dots', blocks: [
        { p: 'Learn every position as **numbers**, not as a pattern of dots. When you play the E-shape position of C, say "5 6 7 1, 2 3 4 5..." as you go. Three things happen:' },
        { list: ['You always know where the **root** is, so you can start and end phrases at home.', 'You see the **chord tones** (1 3 5) as the strong notes to land on, and 2 4 6 7 as passing notes between them.', 'The same numbers work in **every key**: move the shape and the numbers come with it.'] },
        { p: 'Degrees are also how you\'ll talk about melodies, licks and solos from here on: "a run from the 5 down to the 3" means the same thing in any key, on any instrument.' },
        { video: { id: '5MzePySWc6w', title: 'Fretboard Mapping: The Major Scale Formula', note: 'The scale formula laid on the neck: the same idea as degrees, from a different angle.' } },
      ],
    },
    {
      kind: 'learn', title: '4 · Connecting the positions', blocks: [
        { p: 'Positions are a map, not cages. To move along the neck mid-phrase:' },
        { list: [
          '**Slide** on one string into the next position\'s note (the shared notes overlap by a fret or two).',
          '**Shift on the root**: end a run on the root in one position, start the next run from the same root in the next position up.',
          '**Diagonal runs**: three notes per string for a few strings carries you up the neck in a line (that\'s lesson 7, three-notes-per-string).',
        ] },
        { p: 'Practise moving in both directions. Most players are fluent going up and lost coming back down: the descending connection is the one that makes solos sound free.' },
      ],
    },
    {
      kind: 'learn', title: '5 · Sequences: making the scale musical', blocks: [
        { p: 'A scale played straight up and down is an exercise. A scale played in **sequences** sounds like music, because sequences are the shapes melodies make:' },
        { list: ['**In 3s**: 1 2 3, 2 3 4, 3 4 5 ...', '**In 4s**: 1 2 3 4, 2 3 4 5 ...', '**In 3rds**: 1 3, 2 4, 3 5 ... (the sound of lesson 6\'s double stops, one note at a time).', '**Triplet rolls**: down three, up one.'] },
        { p: 'Play them in one position first, slowly, saying the degrees. They train your hand to move freely inside the position instead of just running the pattern.' },
      ],
    },
    {
      kind: 'learn', title: '6 · The same positions in a minor key', blocks: [
        { p: 'The relative minor uses **the same notes**: C major and A minor share every note. So the five positions of C major are also the five positions of **A natural minor**. Only the home note changes: in A minor you start and end phrases on the **6** of C (A), and the chord tones to land on are A C E.' },
        { p: 'In practice: over an Am – F – C – G progression, play the C major positions, but aim for the A minor chord tones. The scale is the same; what you emphasise decides whether it sounds major or minor.' },
        { tip: 'This is the doorway to **modes** (Level 8): the same seven notes, a different home. Dorian, Mixolydian and the rest are this idea, nothing more mysterious.' },
      ],
    },
    {
      kind: 'learn', title: '7 · What mastery looks like', blocks: [
        { list: [
          'All five positions of C, G and A major, up and down, **evenly at 80 BPM in eighths**.',
          'In any position, you can **name the degree** of a note before you play it.',
          'You can play the **chord shape** of each position, then the scale round it, without looking.',
          'You can run from the **open position to the 12th fret** and back, connecting positions without a stop.',
          'You can play **sequences in 3s and 3rds** in at least two positions.',
          'You can solo over a I – vi – IV – V in one position, **landing on chord tones** as the chords change.',
        ] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Start from the chord shape, then fill in the gaps.', examples: [
        { q: 'Find the C major scale round the E shape at the 8th fret.', steps: ['The E-shape C chord: 8 10 10 9 8 8.', 'Fill in 2, 4, 6, 7 within frets 7–10.', 'Low E 7 8 10 (B C D), A 7 8 10 (E F G), D 7 9 10 (A B C), G 7 9 10 (D E F), B 8 10 (G A), e 7 8 10 (B C D).'], answer: 'Position 4: frets 7–10.', spots: { from: 6, to: 11, marks: midis => majorPosMarks(midis, 0, ['E'], 6) } },
        { q: 'Which degree is the note on the B string, 10th fret, in the E-shape position of C?', steps: ['B string 10 = A.', 'In C major, A is the 6th note.'], answer: '6.' },
        { q: 'Move the A-shape position of C to G major. Where does it start?', steps: ['The A shape of C has its root on the A string, 3rd fret.', 'G on the A string is the 10th fret: 7 frets higher.', 'Everything moves up 7 frets: frets 9–12.'], answer: 'Frets 9–12, root on the A string at 10.' },
        { q: 'You\'re playing the A minor pentatonic box 1 (5th fret). Which position of C major contains it, and which notes do you add?', steps: ['A minor pentatonic box 1 = C major pentatonic in the same place.', 'It sits in the G-shape position of C (frets 4–8).', 'Add the 4 (F) and 7 (B) of C: in A minor terms, the 2 and ♭6.'], answer: 'The G-shape position; add B and F.' },
        { q: 'What makes the 4th and 7th sound tense?', steps: ['4 is a half step above 3 (F over E).', '7 is a half step below 1 (B under C).'], answer: 'Each is a half step from a chord tone, so it wants to move to it: 4 → 3, 7 → 1.' },
        { q: 'Over A minor, which C major degree is home?', steps: ['A minor is C major\'s relative minor.', 'A is the 6th note of C major.'], answer: 'The 6: start and end on A, aim for A C E (6 1 3 of C).' },
        { q: 'Play C major "in 3s" starting from the root in the A-shape position. What are the first four groups?', steps: ['Groups of three consecutive scale notes, each starting one note higher.'], answer: 'C D E, D E F, E F G, F G A (1 2 3, 2 3 4, 3 4 5, 4 5 6).' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Hearing **degrees** is the ear skill that makes scales useful. Each note of the scale has a feeling against the home chord: 1 rests, 3 is sweet, 5 is strong, 2 and 6 float, 4 leans down to 3, 7 pulls up to 1. Learn the feelings and you\'ll find melodies by ear instead of by searching.' },
        { list: ['Hold a C chord (or a drone) and play each degree against it, saying its number. Sing it, then sing down to the root.', 'Play the scale and stop on the 7: feel the pull to resolve. Stop on the 4: feel it lean down.'] },
      ],
      drills: [
        { label: 'Which note of the scale?', quiz: 'l4-deg-ear', minutes: 5, goal: '8 out of 10' },
        { label: 'Ear training path', tool: 'earpath', minutes: 5 },
        { label: 'Drone: sing the degrees', tool: 'ear', minutes: 5 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Learning five patterns of dots with no chord in them.', right: 'See each position as a CAGED chord with 2 4 6 7 filled in; play the chord first.' },
        { wrong: 'Always starting and ending on the lowest note of the pattern.', right: 'Start and end on the root (or a chord tone): that\'s what makes it sound like the key.' },
        { wrong: 'Playing only upwards.', right: 'Descend as much as you ascend; connect positions in both directions.' },
        { wrong: 'Treating major and relative minor as two different scales.', right: 'Same notes, same positions, different home note and chord tones.' },
        { wrong: 'Running scales fast and sloppy.', right: 'Even and clean at a slow tempo, saying the degrees; speed comes from evenness.' },
        { wrong: 'Never leaving the position.', right: 'Slide and shift into the next one: positions are a map, not walls.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Eighth notes over a click. Say the degrees out loud for at least one pass of every goal.',
      challenge: { label: 'All five positions, then sequences in 3s across the neck', ex: { label: 'C major in sequences of 3 (all positions)', spec: { kind: 'sequence', root: 'C', type: 'threes', position: -1, scale: 'major' } }, goal: 'then improvise one chorus over a I – vi – IV – V using all five positions, landing on chord tones', why: 'Sequences in every position plus a solo that lands on chord tones is the proof that the positions have become music, not patterns.' },
      goals: [
        { focus: 'The five positions', tasks: [{ label: 'C major in every position, up the neck', ex: { label: 'C major in every CAGED position', tab: 'majPos' }, minutes: 8, goal: 'even at 72 BPM' }, { label: 'G major in every position', ex: { label: 'G major in every CAGED position', tab: 'majPosG' }, minutes: 8 }] },
        { focus: 'Chord tones as the frame', tasks: [{ label: 'The chord tones, then the scale, in each position', ex: { label: 'C major: arpeggio, then scale, in each position', tab: 'majArpScale' }, minutes: 8 }] },
        { focus: 'Connecting', tasks: [{ label: 'Walking from one position into the next', ex: { label: 'C major: from position to position', tab: 'majLink' }, minutes: 6 }] },
        { focus: 'Sequences', tasks: [{ label: 'C major in 3rds', ex: { label: 'C major in 3rds', spec: { kind: 'sequence', root: 'C', type: 'thirds', position: 0, scale: 'major' } }, minutes: 5 }, { label: 'C major in 4s', ex: { label: 'C major in 4s', spec: { kind: 'sequence', root: 'C', type: 'fours', position: 0, scale: 'major' } }, minutes: 5 }] },
        { focus: 'Know the notes', tasks: [{ label: 'Build any major scale', quiz: 'nb-major', minutes: 5, goal: '2 stars' }, { label: 'CAGED: where is it?', quiz: 'caged-where', minutes: 5 }] },
        { focus: 'Hear the degrees', tasks: [{ label: 'Which note of the scale?', quiz: 'l4-deg-ear', minutes: 5 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: [
          '**Jam**: a I – vi – IV – V in C. Solo in one position, then move to the next every four bars.',
          '**Target notes**: the chord tones of each chord, inside the position you\'re in.',
          '**Call and response**: answer each phrase with the same phrase in the next position up.',
          '**A melody from your songbook**: find it by ear in two different positions.',
        ] },
      ],
      tasks: [
        { label: 'Jam: solo through the positions', tool: 'jam', minutes: 10 },
        { label: 'Target notes', tool: 'targets', minutes: 8 },
        { label: 'Call and response', tool: 'cr', minutes: 6 },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Build any major scale', quiz: 'nb-major' },
        { skill: 'Hear', label: 'Which note of the scale?', quiz: 'l4-deg-ear' },
        { skill: 'Play', label: 'C major in every position (mic)', ex: { label: 'C major in every CAGED position', tab: 'majPos' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "The major scale in five positions". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) how a scale position is built from a CAGED chord shape, (2) the five positions of C major and roughly which frets each covers, (3) how the major pentatonic relates to the major scale, (4) why the 4th and 7th sound tense, (5) how to connect positions, (6) how the same positions work for the relative minor. Keep it short.',
        points: ['the chord shape (1 3 5) with 2 4 6 7 filled in round it', 'C shape 0–3, A 2–5, G 4–8, E 7–10, D 9–13', 'major pentatonic = the major scale without 4 and 7', 'each is a half step from a chord tone: 4 → 3, 7 → 1', 'slide into the overlap, shift on the root, diagonal runs', 'same notes and positions; home is the 6 (A in C), aim for A C E'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: '-Sx_WHHOvKE', title: 'Using and Understanding Scale Degrees for Bass and Guitar' },
      books: [
        { book: 'Fretboard Logic SE', where: 'The part on scale patterns and chord forms', why: 'The major scale built from the chord forms: this lesson\'s whole idea.' },
        { book: 'The CAGED System and 100 Licks for Blues Guitar', where: 'The chapters on each CAGED shape', why: 'Scales and licks round each shape.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'The chapters on the major scale and its positions', why: 'More on degrees and how the scale makes the chords.' },
        { book: 'Guided Scale Practice', where: 'The major scale sections', why: 'Daily routines for the positions and sequences.' },
      ],
      blocks: [
        { p: '**Next in Level 4**: 3rds, 6ths and double stops: the major scale in pairs, the sound of soul, country and Mayer.' },
        { p: '**Extra credit**: learn the five positions of the key of a song you love, then work out its melody in two of them.' },
      ],
    },
  ],
}

// ---- Lesson 6: 3rds, 6ths and double stops -------------------------------------------------------------------------
export const INTERVAL_SHAPES: CourseLesson = {
  id: 'c4-intervals', level: 4, n: 6, title: '3rds, 6ths and double stops: interval shapes everywhere', minutes: 85,
  goal: 'Play the major scale harmonised in 3rds and 6ths on every useful pair of strings, know the major and minor shapes on each pair (and why they change at the B string), and use double stops over chords the way soul, country, Hendrix and Mayer players do.',
  builds: ['intervals', 'the major scale in five positions', 'triads on every string set', 'fills between chords'],
  topics: ['intervals', 'double stops', '3rds', '6ths', 'harmony', 'soul', 'country', 'fills'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Two notes at once is the smallest kind of chord, and it may be the most musical. **Double stops** in 3rds and 6ths are the sweet sound of Motown and soul guitar (Curtis Mayfield, Steve Cropper), the twang of country (and Hawaiian and bluegrass), the Hendrix ballad sound, and half of what makes John Mayer\'s rhythm parts sing.' },
        { p: 'They\'re also how two guitars (or a guitar and a voice) **harmonise** a melody: the second part a 3rd or a 6th away. Learn the shapes and you can harmonise anything in any key, on the spot.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['play the major scale in 3rds on G-B and B-e, and in 6ths on G-e and D-B;', 'know the major and minor 3rd and 6th shapes on every pair, and why they change at the B string;', 'find the 3rd or 6th above any note in a key, quickly;', 'slide double stops into chords over I – IV – V;', 'hear a 3rd, a 6th, a 4th and an octave apart.'] },
        { prog: { label: 'C major in 3rds, then in 6ths', chords: [[60, 64], [62, 65], [64, 67], [65, 69], [67, 71], [60, 69], [62, 71], [64, 72], [65, 74], [67, 76]], gap: 0.6 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Diatonic 3rds: every other note', blocks: [
        { p: 'A **3rd** in a key means: from a scale note, skip one and take the next. In C: C–E, D–F, E–G, F–A, G–B, A–C, B–D. Some are **major 3rds** (4 half steps), some **minor** (3), and the pattern for a major key never changes:' },
        { list: ['**M m m M M m m**: 1–3 major, 2–4 minor, 3–5 minor, 4–6 major, 5–7 major, 6–1 minor, 7–2 minor.'] },
        { p: 'Notice that\'s exactly the bottom two notes of the chords of the key: C, Dm, Em, F, G, Am, Bdim. A 3rd **is** a triad with the 5th left out. That\'s why 3rds sound so complete: two notes are enough to say "major" or "minor".' },
        { spots: { caption: 'C major in 3rds on the G and B strings: the lower voice on G, the upper on B. Same fret = major 3rd, one fret back = minor.', from: 4, to: 15, marks: midis => pairMarks(midis, 0, 'GB', 2, 4) } },
      ],
    },
    {
      kind: 'learn', title: '2 · The shapes on each pair (and the B string again)', blocks: [
        { p: 'Two neighbouring strings are a 4th apart, except G to B (a major 3rd). So the 3rd shapes depend on the pair:' },
        { list: [
          '**G and B**: major 3rd = the **same fret**; minor 3rd = the upper note **one fret back**.',
          '**B and e, D and G, A and D, E and A**: major 3rd = the upper note **one fret back**; minor 3rd = **two frets back**.',
        ] },
        { p: '**6ths** are played with **one string skipped**, and the same kink applies:' },
        { list: [
          '**G and e, D and B** (the pairs that span the G–B gap): major 6th = the **same fret**; minor 6th = the upper note **one fret back**.',
          '**E and D, A and G**: major 6th = the upper note **one fret back**; minor 6th = **two frets back**.',
        ] },
        { p: 'The 6ths in a major key run **M M m M M m m** (C–A, D–B, E–C, F–D, G–E, A–F, B–G). A 6th is a 3rd turned upside down: C up to A is a 6th; A up to C is a 3rd. Flip one and you get the other.' },
        { spots: { caption: 'C major in 6ths on the G and high e strings (B skipped): same fret = major 6th, one back = minor.', from: 4, to: 15, marks: midis => pairMarks(midis, 0, 'GE', 5, 4) } },
      ],
    },
    {
      kind: 'learn', title: '3 · Double stops over chords', blocks: [
        { p: 'Over a chord, the best double stops are the ones made of its **chord tones**. Over C: E–G (the 3rd and 5th, a minor 3rd apart), C–E (root and 3rd), G–C, E–C as a 6th. Slide into them from a fret below and they sound like a horn section.' },
        { p: 'Two you can play right now over C: **C–E** in 3rds on G and B (both 5th fret: a major 3rd, same fret), and **E–G** in 3rds on B and e (B 5th, e 3rd: a minor 3rd, two frets back). Notice they\'re the bottom and top pairs of the top-string triad 5 5 3: the top two notes of any small triad are a double stop over its chord.' },
        { list: [
          '**Soul / Mayer**: 3rds on G-B or B-e, slid into, over I – IV (C – F). Curtis Mayfield and Hendrix ballads.',
          '**Country**: 6ths on G-e, moving with the chords, often with a hammer-on to the 3rd. The pedal-steel sound on a guitar.',
          '**Rock and roll**: 4ths on neighbouring strings at the same fret (Chuck Berry), bent or hammered.',
        ] },
        { video: { id: '4Hf66fxDLiA', title: 'Hendrix / Mayer Double-Stop Riff in 5 Levels', note: 'Double stops over chords, built up step by step: the sound this lesson is aiming for.' } },
      ],
    },
    {
      kind: 'learn', title: '4 · Finding them anywhere', blocks: [
        { p: 'You don\'t need to memorise every position. Two ways to find a 3rd or 6th on the spot:' },
        { list: [
          '**From the scale position**: you know where the scale\'s notes are; the 3rd is two scale notes up. In a CAGED position the pairs fall out naturally.',
          '**From the shape rule**: decide major or minor (the M m m M M m m pattern tells you), then use the fret rule for the pair you\'re on.',
        ] },
        { tip: 'The quickest check: is the 3rd or 6th a note of the chord you\'re over? If both notes are chord tones, it will sound right; if one isn\'t, it\'s a passing double stop: keep moving.' },
      ],
    },
    {
      kind: 'learn', title: '5 · Harmonising a melody', blocks: [
        { p: 'To harmonise a melody: play each melody note with the **diatonic 3rd below it** (or the 6th below). The harmony moves in parallel with the tune, always in the key. That\'s how twin-guitar parts (Thin Lizzy, Iron Maiden, the Allman Brothers) are made, and how a second guitar can follow a singer.' },
        { p: 'In 3rds the harmony is close and sweet; in 6ths it\'s wider and more open. Many parts switch between the two to stay in a comfortable range.' },
      ],
    },
    {
      kind: 'learn', title: '6 · What mastery looks like', blocks: [
        { list: [
          'C major in 3rds on G-B and B-e, and in 6ths on G-e and D-B, **up and back without a stop**.',
          'Given a note and a pair of strings, you find the **3rd or 6th above it** in the key in about two seconds.',
          'You can say whether a diatonic 3rd or 6th is **major or minor** from its degree.',
          'Over I – IV – V, you slide into double stops made of **chord tones** on every chord.',
          'You can **harmonise** a simple melody from your songbook in 3rds.',
          'By ear you can tell a **3rd from a 6th** (and both from a 4th and an octave).',
        ] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Decide major or minor first, then use the shape rule for the strings you\'re on.', examples: [
        { q: 'In C major, play the 3rd above D (G string, 7th fret) on the B string.', steps: ['D up two scale notes = F.', '2 → 4 is a minor 3rd.', 'On G-B a minor 3rd is one fret back: B string 6.'], answer: 'G 7, B 6.' },
        { q: 'Play the 3rd above F (B string, 6th fret) on the high e.', steps: ['F up two scale notes = A: 4 → 6, a major 3rd.', 'On B-e a major 3rd is one fret back: e 5.'], answer: 'B 6, e 5.' },
        { q: 'Play the 6th above C (G string, 5th fret) on the high e.', steps: ['C up five scale notes = A: 1 → 6, a major 6th.', 'On G-e a major 6th is the same fret.'], answer: 'G 5, e 5.' },
        { q: 'Play the 6th above E (G string, 9th fret) on the high e.', steps: ['E up five scale notes = C: 3 → 1, a minor 6th.', 'On G-e a minor 6th is one fret back: e 8.'], answer: 'G 9, e 8.' },
        { q: 'Over a G chord in the key of C, which 3rd on B-e is all chord tones?', steps: ['G chord = G B D.', 'B–D is a diatonic 3rd (7 → 2): minor.', 'B on the B string is the 12th fret; D on e: minor 3rd = two back: 10.'], answer: 'B 12, e 10 (B and D).' },
        { q: 'Is A–C in C major a major or minor 3rd?', steps: ['A is the 6; 6 → 1 in the pattern M m m M M m m is the 6th entry: minor.'], answer: 'Minor (3 half steps).' },
        { q: 'Harmonise the melody E – D – C (3 2 1) in 3rds below.', steps: ['3rd below E = C; below D = B; below C = A.'], answer: 'E/C, D/B, C/A: a sweet descending pair, the end of countless songs.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Two notes together have a colour of their own: **3rds** are close and sweet, **6ths** wider and still sweet, **4ths** open and a little hollow, **octaves** the same note doubled. Being able to tell them apart lets you copy double-stop parts off records.' },
        { list: ['Play a 3rd and a 6th from the same low note: which sounds wider?', 'Play C major in 3rds slowly and hear the major and minor ones alternate.'] },
      ],
      drills: [
        { label: '3rds, 6ths, 4ths or octaves?', quiz: 'l4-int-ear', minutes: 5, goal: '8 out of 10' },
        { label: 'Intervals by ear', quiz: 'l2-int-ear', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Using the same shape for every 3rd.', right: 'Diatonic 3rds alternate major and minor (M m m M M m m): the shape changes with the degree.' },
        { wrong: 'Forgetting the B-string kink.', right: 'On G-B (3rds) and G-e / D-B (6ths) the shapes move a fret compared with the other pairs.' },
        { wrong: 'Letting the skipped string ring in 6ths.', right: 'Mute it with the underside of the finger on the lower note, or play fingerstyle.' },
        { wrong: 'Strumming double stops like chords.', right: 'Pick them (or hybrid-pick: pick plus middle finger) and slide into them: they\'re melody, not strumming.' },
        { wrong: 'Double stops that clash with the chord.', right: 'Aim both notes at chord tones on the strong beats; pass through the others.' },
        { wrong: 'Leaving the harmony out of the key.', right: 'Diatonic 3rds and 6ths stay in the key; don\'t make them all major.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Pick each pair low-high, then together. Say "major" or "minor" for each.',
      challenge: { label: '6ths over I – IV – V – I in G, slid into', ex: { label: 'G: 6ths over I – IV – V – I, slid into', tab: 'ds6ths' }, goal: 'then harmonise a melody from your songbook in 3rds and play it with the looper on the melody', why: 'Double stops over changes and a harmonised melody are the two ways these shapes turn into music: this is the soul and country rhythm-lead sound.' },
      goals: [
        { focus: '3rds', tasks: [{ label: 'C major in 3rds on G and B', ex: { label: 'C major in 3rds on G and B', tab: 'thirdsGB' }, minutes: 6, goal: 'even at 70 BPM' }, { label: 'G major in 3rds on B and e', ex: { label: 'G major in 3rds on B and e', tab: 'thirdsBE' }, minutes: 6 }] },
        { focus: '6ths', tasks: [{ label: 'C major in 6ths on G and e', ex: { label: 'C major in 6ths on G and e', tab: 'sixthsGE' }, minutes: 6 }, { label: 'G major in 6ths on D and B', ex: { label: 'G major in 6ths on D and B', tab: 'sixthsDB' }, minutes: 6 }] },
        { focus: 'Over chords', tasks: [{ label: 'C: 3rds over I – IV – V – I, slid into', ex: { label: 'C: 3rds over I – IV – V – I, slid into', tab: 'ds3rds' }, minutes: 6 }, { label: 'Rock double stops', ex: { label: 'Rock double-stops', spec: { kind: 'lick', root: 'A', type: 'double-stop', position: 0 } }, minutes: 4 }] },
        { focus: 'Find them', tasks: [{ label: '3rds and 6ths on the neck', quiz: 'l4-pairs', minutes: 5, goal: '2 stars' }] },
        { focus: 'Hear them', tasks: [{ label: '3rds, 6ths, 4ths or octaves?', quiz: 'l4-int-ear', minutes: 5 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: [
          '**Fills between chords**: the Mayer workshop\'s double-stop steps use exactly these shapes.',
          '**Jam**: a soul or country style; play only double stops, slid into on the chord changes.',
          '**Looper**: record a melody, then a second track a 3rd below it: instant twin guitars.',
          '**Techniques**: slides and hammer-ons into double stops.',
        ] },
      ],
      tasks: [
        { label: 'Fills between chords', tool: 'fills', minutes: 10 },
        { label: 'Jam: double stops only', tool: 'jam', minutes: 8 },
        { label: 'Slides and hammer-ons', tool: 'techniques', minutes: 5 },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: '3rds and 6ths on the neck', quiz: 'l4-pairs' },
        { skill: 'Hear', label: '3rds, 6ths, 4ths or octaves?', quiz: 'l4-int-ear' },
        { skill: 'Play', label: 'C major in 3rds on G and B (mic)', ex: { label: 'C major in 3rds on G and B', tab: 'thirdsGB' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "3rds, 6ths and double stops". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) what a diatonic 3rd is and the major/minor pattern in a major key, (2) the 3rd shapes on G-B versus the other pairs, (3) the 6th shapes and which pairs they use, (4) how 3rds and 6ths are related, (5) how to choose double stops over a chord, (6) how to harmonise a melody. Keep it short.',
        points: ['skip one scale note: M m m M M m m', 'G-B: major same fret, minor one back; other pairs: major one back, minor two back', '6ths skip a string: G-e and D-B major same fret, minor one back; E-D and A-G one and two back', 'a 6th is an upside-down 3rd', 'both notes chord tones on strong beats, slid into', 'each melody note with the diatonic 3rd (or 6th) below'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'rFDuj8GXMk0', title: 'John Mayer Style Guitar Lesson' },
      books: [
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'The sections on intervals and harmonising the scale', why: 'Why 3rds and 6ths fall the way they do.' },
        { book: 'The CAGED System and 100 Licks for Blues Guitar', where: 'The double-stop licks', why: 'Blues and soul double stops round each shape.' },
        { book: 'Triads for the Improvising Guitarist', where: 'The chapters on dyads and partial chords', why: 'Two-note voicings as a bridge between chords and lines.' },
      ],
      blocks: [
        { p: '**Next in Level 4**: three-notes-per-string scales, the patterns for speed and legato.' },
        { p: '**Extra credit**: learn a Curtis Mayfield or Steve Cropper part by ear and name every double stop as a 3rd, 4th or 6th.' },
      ],
    },
  ],
}

// ---- Lesson 7: three notes per string ------------------------------------------------------------------------------
export const THREE_NPS: CourseLesson = {
  id: 'c4-3nps', level: 4, n: 7, title: 'Three-notes-per-string scales: speed, legato and the long view', minutes: 80,
  goal: 'Play the seven three-notes-per-string patterns of the major scale, connect them to the CAGED positions, pick them cleanly (alternate, economy and legato), use them for long diagonal runs, and know where each pattern starts in any key.',
  builds: ['the major scale in five positions', 'alternate picking', 'hammer-ons and pull-offs'],
  topics: ['3nps', 'scales', 'technique', 'legato', 'alternate picking', 'speed', 'prog'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'The CAGED positions keep the hand in one place and fit the chords perfectly. But they have two or three notes on each string, which makes fast, even picking awkward: the pattern of strokes keeps changing. **Three-notes-per-string** (3NPS) patterns put exactly three notes on every string, so the picking and fingering repeat on every string. That\'s why rock, fusion and prog players (Paul Gilbert, Guthrie Govan, Plini, Tosin Abasi) use them for speed and legato.' },
        { p: '3NPS also stretches each pattern across five or six frets, so a run naturally travels along the neck. Combined with CAGED you get two views of the same notes: CAGED for chords and phrasing, 3NPS for speed and long lines.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['play the seven 3NPS patterns of a major scale;', 'say which degree each pattern starts on, in any key;', 'see how they overlap the CAGED positions;', 'pick them with alternate picking, economy picking and legato;', 'play long diagonal runs and sequences across the neck.'] },
      ],
    },
    {
      kind: 'learn', title: '1 · Seven patterns, one per scale note', blocks: [
        { p: 'Start on any note of the scale on the low E string and play **three scale notes per string** all the way up. Because there are seven notes in the scale, there are **seven** patterns, one starting on each degree. In C major, pattern 1 starts on C (8th fret):' },
        { list: ['low E: 8 10 12 (C D E)', 'A: 8 10 12 (F G A)', 'D: 9 10 12 (B C D)', 'G: 9 10 12 (E F G)', 'B: 10 12 13 (A B C)', 'high e: 10 12 13 (D E F)'] },
        { p: 'Pattern 2 starts on D (10th fret), pattern 3 on E (12th, or open), and so on. Each pattern is the last one shifted up one scale note. The shapes repeat every octave.' },
        { p: 'Each pattern has three kinds of string: **whole-whole** (frets x, x+2, x+4: a stretch), **half-whole** (x, x+1, x+3) and **whole-half** (x, x+2, x+3). The order of those three is all you need to remember for each pattern.' },
        { tip: 'Pattern 1\'s first string (whole-whole: 8 10 12) is a 4-fret stretch. Use fingers 1, 2 and 4; if it hurts, practise it higher up the neck first, where the frets are closer.' },
      ],
    },
    {
      kind: 'learn', title: '2 · How 3NPS meets CAGED', blocks: [
        { p: 'A 3NPS pattern covers about the same notes as one CAGED position plus a fret or two of the next. Two practical consequences:' },
        { list: [
          'Every 3NPS pattern **contains** a chord shape you know: find it and you know where the chord tones are.',
          'When you switch between views, the notes don\'t change, only how you finger them. Use CAGED when you\'re playing round the chords; use 3NPS when you\'re running.',
        ] },
        { p: 'Because each pattern starts on a degree, the seven patterns are also the fingerings of the seven **modes** (Level 8): pattern 2 starting on D in C major is the classic "Dorian" fingering. Same notes; the name only matters once the home note changes.' },
      ],
    },
    {
      kind: 'learn', title: '3 · Picking: three ways', blocks: [
        { list: [
          '**Alternate picking**: down-up-down on one string, then up-down-up on the next. Even and powerful; the cross-string motion alternates "inside" and "outside". This is the Paul Gilbert and John Petrucci approach.',
          '**Economy (sweep) picking**: when you move to the next string in the same direction you\'re already going, keep going (down-up-down, **down**-up-down...). Smoother across strings, fewer motions.',
          '**Legato**: pick only the first note on each string and **hammer on** the other two (pull off coming down). Smooth and fast with little picking; the Joe Satriani, Allan Holdsworth and Plini sound.',
        ] },
        { p: 'Learn alternate picking first: it makes your timing even. Then add legato for a different colour. Groups of three per string make **triplets** and **sextuplets** fall naturally on the beat: each string is one triplet.' },
        { video: { id: 'N_MHpdP5X58', title: 'Alternate Picking Exercises That Fix Your Technique', note: 'Picking-hand control for scale runs: start slow and keep the motion small.' } },
      ],
    },
    {
      kind: 'learn', title: '4 · Long runs and sequences', blocks: [
        { p: 'Three notes per string makes **diagonal runs** easy: play two strings of one pattern, then shift up into the next pattern on the third string, and keep going. A run can climb from the 3rd fret to the 15th without a single awkward reach.' },
        { p: 'Sequences fit 3NPS perfectly: **in 3s** (one string at a time), **in 6s** (two strings), and the **"4s"** that cross strings mid-group. These are the building blocks of fast prog and fusion lines.' },
        { tip: 'Speed comes from accuracy, not effort. Practise at a tempo where every note is clean and even, add 4 BPM when it\'s easy for three runs in a row, and stop before you get tense.' },
      ],
    },
    {
      kind: 'learn', title: '5 · What mastery looks like', blocks: [
        { list: [
          'All **seven patterns of C major**, up and down, in triplets at **80 BPM**, alternate picked.',
          'You can name the **start note and degree** of each pattern in C, G and A.',
          'You can play pattern 1 **legato**, evenly, at the same tempo.',
          'You can find the **CAGED chord shape** inside each pattern.',
          'You can play a **diagonal run** across three patterns without a pause.',
          'You can play **sequences in 3s** in two patterns.',
        ] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Find the start note on the low E, then three notes per string.', examples: [
        { q: 'Where does pattern 1 of G major start?', steps: ['Pattern 1 starts on the root on the low E.', 'G on the low E: 3rd fret.'], answer: '3rd fret: 3 5 7 on the low E (G A B).' },
        { q: 'In C major, a pattern starts on the low E at the 12th fret. Which degree?', steps: ['Low E 12 = E.', 'E is the 3rd of C major.'], answer: 'The 3: pattern 3.' },
        { q: 'What are the frets of pattern 1 of C major on the D string?', steps: ['After the A string (F G A), the next three notes are B C D.', 'On the D string: B = 9, C = 10, D = 12.'], answer: '9 10 12.' },
        { q: 'Alternate picking, pattern 1: which stroke starts the A string?', steps: ['Low E: down-up-down.', 'The next stroke is up.'], answer: 'Up: up-down-up on the A string.' },
        { q: 'How many notes in one pattern of a 7-note scale (six strings)?', steps: ['Three per string × six strings.'], answer: '18: two and a half octaves.' },
        { q: 'Why do 3NPS patterns make triplets fall on the beat?', steps: ['Three notes per string, three notes per beat.'], answer: 'Each string is one triplet, so each beat starts on a new string: easy to keep time.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Fast scales only sound good when they\'re **even**. Record yourself and listen back: are the notes the same length and loudness? Can you hear where the string changes are? The ear skill here is hearing your own timing, plus knowing the degrees so a run lands on the right note.' },
        { list: ['Record pattern 1 at a slow tempo with the click, play it back, and listen for uneven notes.', 'Stop a run on different degrees and say which one you landed on.'] },
      ],
      drills: [
        { label: 'Which note of the scale?', quiz: 'l4-deg-ear', minutes: 5, goal: '8 out of 10' },
        { label: 'Rhythm trainer: even triplets', tool: 'rhythm', minutes: 5 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Practising faster than you can play cleanly.', right: 'Slow and even first; add 4 BPM only after three clean runs in a row.' },
        { wrong: 'Squeezing the neck to reach the stretches.', right: 'Relax the thumb, move the elbow, use fingers 1-2-4 on whole-whole strings.' },
        { wrong: 'Uneven legato (the hammered notes quieter).', right: 'Hammer from a little height and pull off slightly sideways so every note is as loud as the picked one.' },
        { wrong: 'Running patterns with no idea of the chord.', right: 'Find the CAGED chord inside each pattern and land on its tones.' },
        { wrong: 'Thinking 3NPS replaces CAGED.', right: 'Same notes, two views: CAGED for phrasing over chords, 3NPS for speed and long runs.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Triplets over a click. Alternate picking unless the goal says legato.',
      challenge: { label: 'All seven patterns, then sequences in 3s through them', ex: { label: 'C major, three notes per string, in 3s (all patterns)', spec: { kind: 'sequence', root: 'C', type: 'threes', position: -1, scale: 'major' } }, goal: 'then a diagonal run from the 3rd fret to the 15th and back, legato', why: 'All seven patterns in sequences plus a diagonal legato run is the technical foundation prog and fusion players build their speed on.' },
      goals: [
        { focus: 'Pattern 1', tasks: [{ label: 'C major pattern 1, three notes per string', ex: { label: 'C major, pattern 1 (3 notes per string)', spec: { kind: 'scale', root: 'C', type: 'major', position: 0 } }, minutes: 6, goal: 'even triplets at 70 BPM' }] },
        { focus: 'All seven', tasks: [{ label: 'C major, all seven patterns', ex: { label: 'C major, all seven 3NPS patterns', spec: { kind: 'scale', root: 'C', type: 'major', position: -1 } }, minutes: 10 }] },
        { focus: 'Another key', tasks: [{ label: 'G major, all seven patterns', ex: { label: 'G major, all seven 3NPS patterns', spec: { kind: 'scale', root: 'G', type: 'major', position: -1 } }, minutes: 10 }] },
        { focus: 'Sequences', tasks: [{ label: 'C major in 4s, pattern 1', ex: { label: 'C major in 4s', spec: { kind: 'sequence', root: 'C', type: 'fours', position: 0, scale: 'major' } }, minutes: 6 }] },
        { focus: 'Know the starts', tasks: [{ label: 'Where does each pattern start?', quiz: 'l4-3nps', minutes: 5, goal: '2 stars' }] },
        { focus: 'Technique', tasks: [{ label: 'Hammer-ons, pull-offs and legato', tool: 'techniques', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: [
          '**Jam**: a prog or rock style in A minor (the C major patterns); one long run per four bars, landing on a chord tone.',
          '**Looper**: loop a riff, then improvise runs over it, stopping on chord tones.',
          '**Licks & solos** (Jam → Make a tab): make a prog-clean lick and find which pattern it uses.',
        ] },
      ],
      tasks: [
        { label: 'Jam: runs that land', tool: 'jam', minutes: 10 },
        { label: 'Target notes', tool: 'targets', minutes: 6 },
        { label: 'Techniques: legato', tool: 'techniques', minutes: 5 },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Where does each pattern start?', quiz: 'l4-3nps' },
        { skill: 'Hear', label: 'Which note of the scale?', quiz: 'l4-deg-ear' },
        { skill: 'Play', label: 'C major pattern 1 (mic)', ex: { label: 'C major, pattern 1 (3 notes per string)', spec: { kind: 'scale', root: 'C', type: 'major', position: 0 } } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Three-notes-per-string scales". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) why there are seven patterns and where each starts, (2) the three kinds of string (whole-whole, half-whole, whole-half), (3) how 3NPS relates to the CAGED positions, (4) alternate, economy and legato picking and when to use each, (5) how to build speed safely. Keep it short.',
        points: ['seven scale notes, a pattern starting on each on the low string', 'whole-whole (a stretch), half-whole, whole-half', 'the same notes as a CAGED position plus a fret or two; each pattern holds a chord shape', 'alternate = even and strong, economy = smooth string changes, legato = hammer and pull', 'clean and even first, add 4 BPM after three clean runs, relax'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: '2iMaBoeWhv4', title: 'Picking-Hand Rhythm' },
      books: [
        { book: 'Guided Scale Practice', where: 'The three-notes-per-string sections', why: 'Daily routines for these patterns.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'The scale-pattern sections', why: 'How 3NPS patterns become the modes.' },
      ],
      blocks: [
        { p: '**Next in Level 4**: Rhythm 4: sixteenths and syncopation.' },
        { p: '**Extra credit**: learn a short legato run from a Plini or Satriani tune and find the pattern it lives in.' },
      ],
    },
  ],
}

// ---- Lesson 8: Rhythm 4, sixteenths and syncopation ----------------------------------------------------------------
const S16 = 0.25
export const RHYTHM4: CourseLesson = {
  id: 'c4-rhythm', level: 4, n: 8, title: 'Rhythm 4: sixteenths and syncopation', minutes: 70,
  goal: 'Count and play sixteenth notes, keep the strumming hand moving in sixteenths while choosing which strokes hit, use ghost strums and accents for funk grooves, and play syncopated rhythms and anticipated chord changes in time.',
  builds: ['Rhythm 2: eighths and strumming', 'Rhythm 3: triplets and shuffle'],
  topics: ['rhythm', 'sixteenths', 'syncopation', 'funk', 'strumming', 'muting'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Eighth notes make a song move; **sixteenths** make it groove. Funk (Nile Rodgers, Cory Wong), R&B, reggaeton, a lot of pop and most modern acoustic strumming live on the sixteenth note: four to a beat, with the hand moving down-up-down-up and the groove coming from **which** strokes hit and which ones only scratch.' },
        { p: '**Syncopation** is the other half: putting the accent where the listener doesn\'t expect it, on the "e" or the "a", or bringing the next chord in a little **early**. It\'s what makes a rhythm feel alive instead of marching.' },
        { rhythm: { label: 'Four sixteenths to a beat: 1 e & a 2 e & a…', beats: Array(16).fill(S16), bpm: 72 } },
        { rhythm: { label: 'A funk cell: 1 . . a  . . & .  (syncopated)', beats: [0.75, 0.5, 0.75, 0.5, 0.75, 0.75], bpm: 80 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Counting sixteenths', blocks: [
        { p: 'Split each beat into **four**: **"1 e & a, 2 e & a, 3 e & a, 4 e & a"** (say "one ee and uh"). The "&" is the eighth-note off-beat you know; the "e" and "a" are the new in-between places.' },
        { p: 'The common one-beat cells, with their counts:' },
        { list: ['**1 e & a**: four sixteenths.', '**1 & a**: an eighth and two sixteenths (the "gallop").', '**1 e &**: two sixteenths and an eighth (the reverse gallop).', '**1 a**: a dotted eighth and a sixteenth (the skip).', '**1 e a**: sixteenth, eighth, sixteenth (syncopated).'] },
        { rhythm: { label: '1 & a, 1 & a… the gallop (metal, Iron Maiden)', beats: [0.5, S16, S16, 0.5, S16, S16, 0.5, S16, S16, 0.5, S16, S16], bpm: 90 } },
        { rhythm: { label: '1 a, 1 a… the skip', beats: [0.75, S16, 0.75, S16, 0.75, S16, 0.75, S16], bpm: 80 } },
      ],
    },
    {
      kind: 'learn', title: '2 · The strumming hand as a sixteenth motor', blocks: [
        { p: 'The secret of sixteenth strumming: the hand **never stops**. It moves **down on 1 and &**, **up on e and a**, every beat, like a pendulum. The rhythm comes from whether the pick **hits** the strings or **misses** them on each stroke.' },
        { list: ['Downstrokes always land on the **1 e & a** grid\'s "1" and "&"; upstrokes on "e" and "a".', 'If a rhythm has a note on the "a", it\'s an **up**stroke. If it starts on the "e", it\'s an **up**stroke too.', 'Missing strokes: keep the motion, just move the pick slightly away from the strings.'] },
        { p: 'Because the motion is constant, your timing is locked to it: you can\'t rush a note that the hand isn\'t ready to play. That\'s why funk players can play such tight, complicated rhythms.' },
        { video: { id: 'yUVyS6HwQ_I', title: 'Rhythm Workout #3: Sixteenth Note Strumming Basics', note: 'The constant down-up motion, played slowly: the foundation for everything in this lesson.' } },
      ],
    },
    {
      kind: 'learn', title: '3 · Ghost strums, muting and accents', blocks: [
        { p: 'A **ghost strum** (or scratch) is a stroke on strings that are **muted**: relax the fretting hand so the fingers touch the strings without pressing them. You get a percussive "chk" with no pitch. Funk is built from chords and ghosts alternating.' },
        { list: ['**Fretting-hand muting**: release the pressure between chord hits (the chord shape stays, the fingers lift a hair).', '**Picking-hand muting**: rest the side of the palm lightly on the strings near the bridge (palm mute) for a tight, dark chug.', '**Accents**: hit a stroke harder. Accenting **2 and 4** gives a backbeat with the drums; accenting the "a" gives a push.'] },
        { p: 'Practise switching between chord and ghost with no gap in the hand\'s motion. Start with chords on the beats and ghosts in between, then move the chord hits around.' },
      ],
    },
    {
      kind: 'learn', title: '4 · Syncopation and anticipation', blocks: [
        { p: '**Syncopation** means accenting or playing the weak parts of the beat (the "e", "&" and "a") and leaving the strong parts empty. A strum on the "a" of 2 that rings over beat 3 sounds like it\'s pushing forward.' },
        { p: '**Anticipation** is syncopation at a chord change: the new chord arrives a sixteenth or an eighth **before** the bar line and is held over it. Listen to almost any pop chorus: the chord changes "early". It makes the music lean forward.' },
        { rhythm: { label: 'Anticipated change: the new chord on the "a" of 4, tied over', beats: [1, 1, 1, 0.75, 0.25, 4], bpm: 80 } },
        { tip: 'Count out loud when you start. Syncopation is only exciting if the beat underneath stays rock steady; if the count wobbles, the rhythm just sounds wrong.' },
      ],
    },
    {
      kind: 'learn', title: '5 · Where you\'ll hear it', blocks: [
        { list: [
          '**Funk** (Nile Rodgers, Cory Wong, Prince): sixteenth chord stabs and ghosts on small chord shapes (top-string triads and 9th chords).',
          '**Metal**: the gallop (1 & a) palm-muted on the low string.',
          '**Acoustic pop and country**: sixteenth "push" strums with anticipated changes.',
          '**Reggae and ska** stay mostly on eighth off-beats, but the drums and bass often play sixteenth fills around them.',
        ] },
        { video: { id: 'OAZm0FjYyPc', title: 'Cory Wong Funk Guitar Lesson', note: 'Sixteenth-note funk from one of its masters: the constant hand, the ghosts, the accents.' } },
      ],
    },
    {
      kind: 'learn', title: '6 · What mastery looks like', blocks: [
        { list: [
          'You can count **"1 e & a"** out loud while strumming steady sixteenths at **80 BPM**.',
          'You can play all five one-beat cells and say which strokes are down and up.',
          'You can play a **funk groove** with chord hits and ghosts without the hand stopping.',
          'You can accent **2 and 4**, or the "a", at will.',
          'You can play an **anticipated chord change** in time, four bars in a row.',
          'By ear you can tell the five cells apart.',
        ] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Count it, find the strokes, then play.', examples: [
        { q: 'How many sixteenth notes in a bar of 4/4?', steps: ['Four per beat × four beats.'], answer: '16.' },
        { q: 'A strum falls on the "a" of beat 2. Down or up?', steps: ['Down on 1 and &, up on e and a.'], answer: 'Up.' },
        { q: 'At 60 BPM, how long is a sixteenth?', steps: ['A beat is 1 second; four sixteenths per beat.'], answer: 'A quarter of a second.' },
        { q: 'Write the gallop as counts for two beats.', steps: ['An eighth and two sixteenths: 1 & a.'], answer: '1 & a, 2 & a.' },
        { q: 'The next chord is "anticipated by a sixteenth". When do you play it?', steps: ['A sixteenth before the bar line = the "a" of 4.'], answer: 'On the "a" of 4, held over the 1.' },
        { q: 'What makes a ghost strum?', steps: ['The strings are touched but not pressed.'], answer: 'Relax the fretting hand so the chord is muted: a percussive scratch with no pitch.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Hearing sixteenth rhythms is hearing **which of the four slots** in each beat are played. Count "1 e & a" against the click and point at each slot as it goes by; the ones you hear are the rhythm.' },
      ],
      drills: [
        { label: 'Which sixteenth rhythm?', quiz: 'l4-16ths-ear', minutes: 5, goal: '7 out of 8' },
        { label: 'Rhythm trainer: hear it, tap it back', tool: 'rhythm', minutes: 6 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Stopping the hand on the missed strokes.', right: 'Keep it moving down-up every sixteenth; just miss the strings.' },
        { wrong: 'Playing an "e" or "a" with a downstroke.', right: 'In sixteenth strumming the e and a are always upstrokes.' },
        { wrong: 'Ghost strums that still ring.', right: 'Release the fretting fingers fully (touch, don\'t press), or palm-mute.' },
        { wrong: 'Rushing syncopated notes.', right: 'Count out loud with the click: the off-beat must land exactly between the beats.' },
        { wrong: 'Big, heavy strums for funk.', right: 'Small, light strokes on small shapes (top-string triads, 9th chords): the groove is in the precision.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Always with a click or a drum beat. Count out loud for at least one pass.',
      challenge: { label: 'Syncopation: off-beat hits and the anticipated change', ex: { label: 'Syncopation and the anticipated change', tab: 'syncopation' }, goal: 'then loop a 2-bar funk groove in the looper and play it 16 times without a slip', why: 'Syncopated hits and early changes over a steady loop are the real test of sixteenth time: it\'s what makes a rhythm part feel professional.' },
      goals: [
        { focus: 'Count and strum', tasks: [{ label: 'Sixteenths on Em: four grooves', ex: { label: 'Sixteenths on Em: every 16th, ghosts, accents, funk', tab: 'sixteenths' }, minutes: 8, goal: 'the hand never stops' }] },
        { focus: 'Hear the cells', tasks: [{ label: 'Which sixteenth rhythm?', quiz: 'l4-16ths-ear', minutes: 5 }] },
        { focus: 'Tap it', tasks: [{ label: 'Rhythm trainer', tool: 'rhythm', minutes: 6, goal: 'most taps green' }] },
        { focus: 'Groove with a band', tasks: [{ label: 'Jam: funk or pop style, sixteenth strums', tool: 'jam', minutes: 10 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: [
          '**Jam**: funk, neo-soul or pop styles; small shapes, sixteenth grooves.',
          '**Looper**: record a sixteenth groove on track 1, then add a ghost-note part on track 2.',
          '**Fills between chords**: add the fills on the "a" of 4, pushing into the next chord.',
          '**Your songbook**: take a song you strum in eighths and play the chorus with sixteenth pushes.',
        ] },
      ],
      tasks: [
        { label: 'Jam: sixteenth grooves', tool: 'jam', minutes: 10 },
        { label: 'Fills on the "a" of 4', tool: 'fills', minutes: 6 },
        { label: 'Rhythm trainer', tool: 'rhythm', minutes: 5 },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Rhythm trainer', tool: 'rhythm' },
        { skill: 'Hear', label: 'Which sixteenth rhythm?', quiz: 'l4-16ths-ear' },
        { skill: 'Play', label: 'Sixteenths on Em (mic)', ex: { label: 'Sixteenths on Em: every 16th, ghosts, accents, funk', tab: 'sixteenths' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Rhythm 4: sixteenths and syncopation". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) how to count sixteenths, (2) the five one-beat cells, (3) which strokes are down and up in sixteenth strumming and why the hand never stops, (4) what a ghost strum is and how to make one, (5) what syncopation and anticipation are, with an example. Keep it short.',
        points: ['1 e & a: four to a beat', '1 e & a, 1 & a, 1 e &, 1 a, 1 e a', 'down on 1 and &, up on e and a; constant motion keeps time', 'muted strings, touched not pressed: a scratch', 'playing the weak parts of the beat; a chord arriving early, held over the bar line'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'qpR6mzN45kk', title: 'How To Practice Guitar Strumming With A Metronome' },
      books: [
        { book: 'Music Theory for Guitarists', where: 'The rhythm chapters on sixteenth notes', why: 'Sixteenths and syncopation in notation.' },
        { book: 'The CAGED System and 100 Licks for Blues Guitar', where: 'Part One: Rhythm Guitar', why: 'Rhythm parts that use these figures.' },
      ],
      blocks: [
        { p: '**Next**: the Level 4 mastery check, then Level 5: chords in depth.' },
        { p: '**Extra credit**: learn a Nile Rodgers or Cory Wong rhythm part by ear and write its counts.' },
      ],
    },
  ],
}

// ---- Level 4 mastery check -----------------------------------------------------------------------------------------
export const LEVEL4_CHECK: CourseLesson = {
  id: 'c4-check', level: 4, n: 9, title: 'Level 4 mastery check', minutes: 30,
  goal: 'Show that the whole neck is yours: CAGED, the pentatonic boxes, triads on every set, the major scale in five positions, 3rds and 6ths, three notes per string and sixteenth-note rhythm, heard and played.',
  builds: ['all of Level 4'], topics: ['CAGED', 'pentatonic', 'triads', 'major scale', 'intervals', '3nps', 'rhythm', 'ear'],
  steps: [
    {
      kind: 'why', title: 'Before Level 5', blocks: [
        { p: 'This check covers all of Level 4: mapping the fretboard. It\'s **strongly suggested** before Level 5 (seventh chords, extensions and voice leading are all built on these maps), but never required.' },
        { list: ['Take it when the practice goals feel easy.', 'Anything you miss points back to the right lesson.', 'Pass it and the Level 4 badge is yours; it comes back as a review later.'] },
      ],
    },
    {
      kind: 'check', title: 'The check', intro: 'Ten parts across building, hearing and playing, then explain the level back to the teacher.',
      tasks: [
        { skill: 'Apply', label: 'CAGED: where is it?', quiz: 'caged-where' },
        { skill: 'Apply', label: 'Name the inversion', quiz: 'tr-inv' },
        { skill: 'Apply', label: '3rds and 6ths on the neck', quiz: 'l4-pairs' },
        { skill: 'Apply', label: 'Three notes per string: where does each pattern start?', quiz: 'l4-3nps' },
        { skill: 'Hear', label: 'Which note of the scale?', quiz: 'l4-deg-ear' },
        { skill: 'Hear', label: 'Where did the top voice go?', quiz: 'l4-lead-ear' },
        { skill: 'Hear', label: 'Which sixteenth rhythm?', quiz: 'l4-16ths-ear' },
        { skill: 'Play', label: 'C major in every position (mic)', ex: { label: 'C major in every CAGED position', tab: 'majPos' } },
        { skill: 'Play', label: 'I – vi – IV – V – I on D-G-B (mic)', ex: { label: 'I – vi – IV – V – I voice-led on D-G-B', tab: 'setLead' } },
        { skill: 'Play', label: 'The five pentatonic boxes linked (mic)', ex: { label: 'A minor pentatonic: walking through the boxes', tab: 'pentLink' } },
      ],
      explain: {
        prompt: 'I just took the KGuitar Level 4 mastery check (CAGED, the five pentatonic boxes, triads on the top strings and every string set, the major scale in five positions, 3rds and 6ths, three-notes-per-string scales, sixteenths and syncopation). Be my teacher for a short oral exam: ask me six questions across these topics, one at a time, including "find me G major in the E shape and the scale round it" and "how do 3rd shapes change on the G and B strings?", tell me what I got right and missed, and finish with which lesson to review if anything was shaky.',
        points: ['CAGED: five shapes in order up the neck, roots and zones', 'Pentatonic boxes sit on the shapes; major and minor share them', 'Triads: three inversions on every set; the B-string bend; voice leading', 'Major scale: each position is a chord shape with 2 4 6 7 filled in', '3rds and 6ths: the M m m M M m m pattern and the fret rules', '3NPS: seven patterns, one per degree; sixteenths: down on 1 and &, up on e and a'],
      },
    },
  ],
}

export const LEVEL4_REST: CourseLesson[] = [STRING_SETS, MAJOR_POSITIONS, INTERVAL_SHAPES, THREE_NPS, RHYTHM4, LEVEL4_CHECK]
