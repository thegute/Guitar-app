// Level 6 (Chord tones, melody and soloing), lessons 1–4: arpeggios in the CAGED shapes, seventh arpeggios in one
// position, targeting chord tones on the changes, and mixing major and minor pentatonic. Lessons 5–8 and the check are
// in level6b.ts. Positions named here are checked on a standard-tuned guitar (low E first):
//   C arpeggio, E shape at the 8th fret: E8 (C) · A7 (E) A10 (G) · D10 (C) · G9 (E) · B8 (G) · e8 (C)
//   Key of C home position = frets 7–11. Dm7 there: E8 E10 · A8 · D7 D10 · G7 G10 · B10 · e8 e10
//   G7 there: E7 E10 · A8 A10 · D9 · G7 G10 · B8 · e7 e10 · Cmaj7: E7 E8 · A7 A10 · D9 D10 · G9 · B8 · e7 e8
//   A minor pentatonic, frets 5–8: E5 E8 · A5 A7 · D5 D7 · G5 G7 · B5 B8 · e5 e8
//   A major pentatonic, frets 4–7: E5 E7 · A4 A7 · D4 D7 · G4 G6 · B5 B7 · e5 e7
import type { CourseLesson } from './types'
import { shapeMarks } from './cagedTabs'
import { positionMarks, scaleMarks } from './l6Tabs'

const G = [40, 45, 50, 55, 59, 64]
const notes = (frets: number[]) => frets.flatMap((f, i) => (f < 0 ? [] : [G[i] + f]))

// ---- Lesson 1: arpeggios in the five CAGED shapes ------------------------------------------------------------------
export const CAGED_ARPS: CourseLesson = {
  id: 'c6-arps', level: 6, n: 1, title: 'Arpeggios in the five CAGED shapes', minutes: 80,
  goal: 'Play the major and minor arpeggio of any chord in all five CAGED shapes, see each one inside the chord shape and the pentatonic box you already know, and start a solo line from the chord\'s own notes instead of a scale pattern.',
  builds: ['CAGED: one chord, five shapes', 'the five pentatonic positions', 'triads on every string set'],
  topics: ['arpeggios', 'CAGED', 'chord tones', 'soloing', 'triads'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Scales give you every note that fits a key. But over any one chord, three of those notes are special: the **chord tones** (root, 3rd and 5th). Land on one and the line sounds like it belongs to the chord; land on anything else and it sounds like it\'s on the way somewhere. Players who "follow the chords" in a solo are thinking chord tones first, scale second.' },
        { p: 'An **arpeggio** is a chord played one note at a time. You already know where every chord sits in five CAGED shapes (Level 4). Play the same shapes as single notes, add the same notes an octave away inside each shape, and you have the arpeggio in five positions: five maps of the chord tones, covering the whole neck.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['play C and Am as arpeggios in all five shapes, up and back;', 'see the arpeggio inside the chord shape and inside the pentatonic box;', 'start and end a phrase on a chord tone in any position;', 'move the shapes to any root.'] },
        { play: { label: 'C chord, then the C arpeggio in the E shape (8th fret)', seq: notes([8, -1, -1, -1, -1, -1]).concat(notes([-1, 7, -1, -1, -1, -1]), notes([-1, 10, -1, -1, -1, -1]), notes([-1, -1, 10, -1, -1, -1]), notes([-1, -1, -1, 9, -1, -1]), notes([-1, -1, -1, -1, 8, -1]), notes([-1, -1, -1, -1, -1, 8])), chord: notes([8, 10, 10, 9, 8, 8]), gap: 0.3 } },
      ],
    },
    {
      kind: 'learn', title: '1 · From chord shape to arpeggio shape', blocks: [
        { p: 'Take the **E-shape C chord** at the 8th fret (8 10 10 9 8 8). Its notes are C, G, C, E, G, C. Now look in the same four frets (7 to 10) for **every** C, E and G, not just the six you were holding:' },
        { list: ['low E string: **C** (8)', 'A string: **E** (7) and **G** (10)', 'D string: **C** (10)', 'G string: **E** (9)', 'B string: **G** (8)', 'high e: **C** (8)'] },
        { p: 'That\'s the **C arpeggio in the E shape**: two octaves of C, E, G in one hand position. Play it up and back slowly, saying "root, 3, 5" as you go.' },
        { spots: { caption: 'The C arpeggio in the E shape: every C, E and G between frets 7 and 10.', from: 0, to: 12, marks: m => shapeMarks(0, false, m, all => all.filter(s => s.letter === 'E')) } },
        { tip: 'The hand shape is the chord shape with a few extra notes. If you can see the chord, you can see the arpeggio.' },
      ],
    },
    {
      kind: 'learn', title: '2 · All five shapes, one map', blocks: [
        { p: 'Do the same for the other four CAGED shapes of C and you have the whole neck mapped in chord tones. Going up from the nut: **C shape** (frets 0–3), **A shape** (3–5), **G shape** (5–8), **E shape** (7–10), **D shape** (10–13), then the C shape again at the 12th fret.' },
        { spots: { caption: 'Every C, E and G on the neck: the five CAGED shapes of C joined up. R = C, 3 = E, 5 = G.', from: 0, to: 13, marks: m => shapeMarks(0, false, m) } },
        { p: 'Neighbouring shapes **share notes** on their edges, exactly like the chord shapes and the pentatonic boxes do. Learn to slide from one into the next along a string, and the five shapes stop being five things to remember.' },
        { p: 'For a **minor** arpeggio the 3rd drops a fret (R ♭3 5). Am in five shapes is the same map as C with different labels and the 3rds a fret lower: the A minor arpeggio sits inside the A minor pentatonic boxes.' },
        { video: { id: 'JR1TgDAiCFU', title: 'How to Actually Use the CAGED System', note: 'CAGED used for soloing: chord tones inside the shapes.' } },
      ],
    },
    {
      kind: 'learn', title: '3 · The arpeggio inside the pentatonic box', blocks: [
        { p: 'You already play pentatonic boxes. Look inside them:' },
        { list: ['**Minor pentatonic** = 1 ♭3 4 5 ♭7. The **minor arpeggio** (1 ♭3 5) is in it, plus two extra notes (4 and ♭7).', '**Major pentatonic** = 1 2 3 5 6. The **major arpeggio** (1 3 5) is in it, plus 2 and 6.'] },
        { p: 'So every pentatonic box already holds the chord. The skill now is **choosing**: in a solo over Am, the notes A, C and E are your landing spots; D and G are passing notes on the way between them.' },
        { spots: { caption: 'A minor pentatonic, frets 5–8. The targets (♭3) and roots are the A minor arpeggio\'s notes, with the 5ths: land on these.', from: 0, to: 10, marks: m => scaleMarks(m, 9, [0, 3, 5, 7, 10], 4, 8, [3, 7]) } },
      ],
    },
    {
      kind: 'learn', title: '4 · Practising arpeggios so they turn into music', blocks: [
        { p: 'Arpeggios practised only up and down sound like exercises. Mix it up:' },
        { list: [
          '**Up and back** in each shape, slowly, with a click.',
          '**Start on the 3rd** (or the 5th) instead of the root.',
          '**Skip a note**: 1 5 3 8 5 10… (it breaks the "pattern" sound).',
          '**One string only**: C, E, G along the G string, sliding between them. It shows you the whole neck as a line.',
          '**Phrase it**: play three or four arpeggio notes, then stop, then answer with three or four more.',
        ] },
        { p: 'Then use them in music: over a backing on one chord, play only arpeggio notes for a minute, then add the pentatonic notes between them.' },
      ],
    },
    {
      kind: 'learn', title: '5 · What mastery looks like', blocks: [
        { p: 'You own CAGED arpeggios when:' },
        { list: [
          'You can play the **C and Am arpeggios in all five shapes**, up and back, at 80 BPM in eighths, without stopping.',
          'Called "G arpeggio, A shape", you find it in a few seconds (10th fret).',
          'You can **slide** from one shape into the next along any string.',
          'In a pentatonic solo over one chord, you can **land on a chord tone** every time you stop.',
        ] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Find the chord shape first; the arpeggio is around it.', examples: [
        { q: 'Where is the G arpeggio in the E shape?', steps: ['The E-shape G chord is the 3rd-fret barre: 3 5 5 4 3 3.', 'Every G, B and D in frets 2–5.'], answer: 'Low E 3 (G) · A 2 (B), 5 (D) · D 5 (G) · G 4 (B) · B 3 (D) · e 3 (G).', spots: { from: 0, to: 8, marks: m => shapeMarks(7, false, m, all => all.filter(s => s.letter === 'E')) } },
        { q: 'You\'re soloing in A minor pentatonic at the 5th fret over Am. Which notes are the chord tones?', steps: ['Am = A C E.', 'Go string by string through frets 5–8 and pick out every A, C and E.'], answer: 'A (E5, D7, e5), C (E8, G5, e8), E (A7, B5). D and G are the passing notes.' },
        { q: 'Turn the C arpeggio in the E shape into Cm.', steps: ['Lower every 3rd (E) a fret to E♭.', 'A7 → A6, G9 → G8.'], answer: 'E8 · A6 A10 · D10 · G8 · B8 · e8.' },
        { q: 'Which CAGED shape of C is around the 5th fret, and what\'s its lowest C?', steps: ['Going up the neck: C shape (0–3), A shape (3–5), G shape (5–8).', 'The G shape\'s lowest C is the one on the low E string, 8th fret.'], answer: 'The G shape (frets 5–8). Its lowest C is on the low E at the 8th fret; the A shape sits just below it (frets 3–5).' },
        { q: 'Play C, E, G along only the G string, from the nut up.', steps: ['G string: open G, then C (5), E (9), G (12), C (17 is too high).'], answer: 'Open, 5, 9, 12: G, C, E, G.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Hear chord tones as **the notes that sound finished** over the chord. Play a C chord, let it ring, then pick single notes from the C major scale over it: C, E and G sound settled; D, F, A, B sound like they\'re going somewhere.' },
        { list: ['Hold a C chord and sing up the arpeggio: 1, 3, 5, 8.', 'Play the arpeggio, then sing its notes back without the guitar.', 'Over a looped Am, improvise for a minute ending every phrase on A, C or E.'] },
      ],
      drills: [
        { label: 'Hear it: which chord tone?', quiz: 'l6-tone-ear', minutes: 5, goal: '8 out of 10' },
        { label: 'Triad types by ear', quiz: 'tr-ear', minutes: 3 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Learning five arpeggio "patterns" as new shapes.', right: 'Each one is a CAGED chord shape with its notes doubled. See the chord, then the arpeggio.' },
        { wrong: 'Only ever running them up and down.', right: 'Start on the 3rd, skip notes, phrase them. Arpeggios are a source of melody, not a drill.' },
        { wrong: 'Letting arpeggio notes ring into each other like a strummed chord.', right: 'One note at a time: lift or roll the finger so the last note stops.' },
        { wrong: 'Ignoring the shape names.', right: 'Say "C, E shape" as you play: naming joins the arpeggio to the chords you already know.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Slowly, saying the degrees (R, 3, 5) as you play. The goal is to see the chord, not to run a pattern.',
      challenge: { label: 'Five shapes, three chords, one solo', ex: { label: 'C arpeggio in all five CAGED shapes, up and back', tab: 'arpCaged' }, goal: 'then G and F arpeggios in all five shapes from memory, and a one-minute solo over C – F – G landing on a chord tone of each chord', why: 'Moving the map to new roots and using it over changing chords is the step from arpeggios to soloing.' },
      goals: [
        { focus: 'Major, five shapes', tasks: [{ label: 'C arpeggio in all five shapes', ex: { label: 'C arpeggio in all five CAGED shapes, up and back', tab: 'arpCaged' }, minutes: 8, goal: 'no stops at 80 BPM' }] },
        { focus: 'Minor, five shapes', tasks: [{ label: 'Am arpeggio in all five shapes', ex: { label: 'Am arpeggio in all five CAGED shapes, up and back', tab: 'arpCagedAm' }, minutes: 8 }] },
        { focus: 'See the shapes', tasks: [{ label: 'CAGED explorer: chord shape → arpeggio', tool: 'caged', minutes: 5 }] },
        { focus: 'Hear chord tones', tasks: [{ label: 'Hear it: which chord tone?', quiz: 'l6-tone-ear', minutes: 5, goal: '2 stars' }] },
        { focus: 'Use them', tasks: [{ label: 'Jam on one chord: arpeggio notes only, then add the pentatonic', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: [
          '**Jam**: loop a single chord (C or Am) and improvise using only its arpeggio for a minute; then let the pentatonic notes in as passing notes.',
          '**Looper**: record C – Am – F – G, then play each chord\'s arpeggio in the same CAGED area as the chords change.',
          '**Fills between chords**: the triad fills you learned are arpeggio fragments; play them in all five shapes.',
        ] },
      ],
      tasks: [
        { label: 'Jam: arpeggios over one chord', tool: 'jam', minutes: 10 },
        { label: 'Fills between chords', tool: 'fills', minutes: 8 },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Name the tones, hear them, play the shapes, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Which chord tone is it?', quiz: 'l6-tone' },
        { skill: 'Hear', label: 'Hear it: which chord tone?', quiz: 'l6-tone-ear' },
        { skill: 'Play', label: 'C arpeggio in all five shapes (mic)', ex: { label: 'C arpeggio in all five CAGED shapes, up and back', tab: 'arpCaged' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Arpeggios in the five CAGED shapes". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) what an arpeggio is and why chord tones matter in a solo, (2) how a CAGED chord shape becomes an arpeggio shape, (3) the order of the five shapes up the neck for C, (4) where the arpeggio sits inside the major and minor pentatonic, (5) four ways to practise arpeggios so they sound like music. Keep it short.',
        points: ['arpeggio = a chord one note at a time; chord tones sound settled over the chord', 'chord shape + the same notes doubled in its window = the arpeggio shape', 'C: C shape 0–3, A 3–5, G 5–8, E 7–10, D 10–13', 'minor pent contains 1 ♭3 5; major pent contains 1 3 5', 'start on the 3rd, skip notes, one string, phrase it'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: '_XY_JDOFXlE', title: '3 simple patterns to MASTER all CAGED shapes' },
      books: [
        { book: 'The CAGED System and 100 Licks for Blues Guitar', where: 'The parts on arpeggios in each shape', why: 'Arpeggios and licks built on them in all five shapes.' },
        { book: 'Fretboard Logic SE', where: 'The chapters on the five patterns', why: 'The fretboard as five joined shapes, the system this lesson rests on.' },
        { book: 'The Guide to Playing Endless Killer Arpeggio Guitar Licks', where: 'From the start', why: 'Turning arpeggios into licks.' },
      ],
      blocks: [{ p: '**Next**: seventh arpeggios, where the arpeggio gets a fourth note and starts to sound like jazz and soul.' }],
    },
  ],
}

// ---- Lesson 2: seventh arpeggios in one position -------------------------------------------------------------------
export const SEVENTH_ARPS: CourseLesson = {
  id: 'c6-arp7', level: 6, n: 2, title: 'Seventh arpeggios: every chord of a key in one position', minutes: 85,
  goal: 'Play the maj7, 7, m7 and m7♭5 arpeggios, all seven 7th arpeggios of a key without moving your hand, and ii – V – I – vi as one continuous line that changes arpeggio with the chord.',
  builds: ['arpeggios in CAGED shapes', 'seventh chords', 'the 7th chords of a key'],
  topics: ['seventh arpeggios', 'chord tones', 'ii-V-I', 'jazz', 'soloing'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Add the 7th to an arpeggio and two things happen. It sounds richer (the 7th is the colour of jazz, soul and R&B), and it now contains **both guide tones**: the 3rd and the 7th, the two notes that define the chord. A 7th arpeggio is the chord\'s complete fingerprint, ready to solo with.' },
        { p: 'The big trick of this lesson: you don\'t need to move your hand to change chords. Every 7th chord of a key lives in **one position** of the neck, so as the chords change you just switch which notes you aim for. That\'s exactly how jazz and fusion players solo over fast changes.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['play maj7, 7, m7 and m7♭5 arpeggios from any root;', 'play all seven 7th arpeggios of C in one position (frets 7–11);', 'play ii – V – I – vi as one unbroken line of chord tones;', 'say which notes change between neighbouring chords.'] },
      ],
    },
    {
      kind: 'learn', title: '1 · Four arpeggios, four colours', blocks: [
        { p: 'The same formulas as the chords in Level 5, now as single notes:' },
        { list: ['**maj7** 1 3 5 7: dreamy, floating.', '**7** (dominant) 1 3 5 ♭7: bluesy, wants to move.', '**m7** 1 ♭3 5 ♭7: smooth and soulful.', '**m7♭5** 1 ♭3 ♭5 ♭7: dark, the minor key\'s ii chord.'] },
        { p: 'Play them on one root (C) to hear the difference: Cmaj7 C E G B, C7 C E G B♭, Cm7 C E♭ G B♭, Cm7♭5 C E♭ G♭ B♭.' },
        { spots: { caption: 'Cmaj7 in the home position of C (frets 7–11). Targets = the guide tones (3 and 7).', from: 0, to: 12, marks: m => positionMarks(m, 0, 0, [0, 4, 7, 11], [4, 11]) } },
      ],
    },
    {
      kind: 'learn', title: '2 · The whole key in one place', blocks: [
        { p: 'Stay in frets 7–11 and play the arpeggio of each 7th chord of C: **Cmaj7, Dm7, Em7, Fmaj7, G7, Am7, Bm7♭5**. Your hand never moves. Each arpeggio is a different set of notes from the same C major scale under your fingers.' },
        { p: 'Two arpeggios a 3rd apart share three notes: Cmaj7 (C E G B) and Em7 (E G B D) share E, G, B. Dm7 (D F A C) and Fmaj7 (F A C E) share F, A, C. That\'s why those chords can stand in for each other (Level 5\'s chord jobs), and why switching arpeggios in one position is easier than it looks: often only one note changes.' },
        { spots: { caption: 'G7 in the same position: the hand stays, the notes change. Targets = B (3) and F (♭7).', from: 0, to: 12, marks: m => positionMarks(m, 0, 7, [0, 4, 7, 10], [4, 10]) } },
      ],
    },
    {
      kind: 'learn', title: '3 · ii – V – I as one line', blocks: [
        { p: 'Now the real use. Over **Dm7 – G7 – Cmaj7 – Am7**, play eighth notes of the current chord\'s arpeggio, and when the chord changes, **move to the nearest note of the next arpeggio** instead of starting again from its root. The line never stops; it just bends to fit each chord.' },
        { p: 'Listen for the moments where the line changes chord: very often your note moves by a half step (C to B as Dm7 becomes G7, F to E as G7 becomes Cmaj7). Those are the guide tones from Level 5 showing up in a melody.' },
        { spots: { caption: 'Dm7 in the home position: from here, C moves to B and F moves to E as the chords change.', from: 0, to: 12, marks: m => positionMarks(m, 0, 2, [0, 3, 7, 10], [3, 10]) } },
        { tip: 'Start at half speed with quarter notes. Speed comes from seeing the next chord before it arrives.' },
      ],
    },
    {
      kind: 'learn', title: '4 · What mastery looks like', blocks: [
        { p: 'You own 7th arpeggios when:' },
        { list: [
          'You can play **maj7, 7, m7 and m7♭5** on any root in the E-shape and A-shape positions.',
          'You can play **all seven 7th arpeggios of C** in frets 7–11 without moving your hand.',
          'You can play **ii – V – I – vi** as one line in eighths at 80 BPM, changing on the beat.',
          'Over a ii – V – I backing, you can improvise with arpeggio notes and **land on a guide tone** when each chord arrives.',
        ] },
        { video: { id: 'BXrByHNokiE', title: 'Chord Tone Soloing', note: 'Arpeggios turned into solo lines: the next step after section 3.' } },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Spell it, find it in position, then join it to the next chord.', examples: [
        { q: 'Spell Fmaj7 and find its notes in frets 7–11.', steps: ['Fmaj7 = F A C E.', 'Go string by string through frets 7–11 and pick out every F, A, C and E.'], answer: 'C (E8) · E (A7), F (A8) · A (D7), C (D10) · E (G9), F (G10) · A (B10) · C (e8).' },
        { q: 'Which notes change from Dm7 to Fmaj7?', steps: ['Dm7 D F A C, Fmaj7 F A C E.'], answer: 'Only D → E. F, A and C stay.' },
        { q: 'You\'re on C (e8) at the end of a Dm7 bar. The next chord is G7. What\'s the nearest G7 note?', steps: ['G7 = G B D F.', 'B is a half step below C: e7.'], answer: 'B at e7: the 7th of Dm7 falls to the 3rd of G7.' },
        { q: 'Why does the m7♭5 arpeggio matter in a major key?', steps: ['Bm7♭5 is vii of C, and G9 without its root.', 'It\'s the ii chord of A minor (Bm7♭5 – E7 – Am).'], answer: 'It\'s the dominant colour in major (rootless G9) and the ii in the relative minor.' },
        { q: 'Play Am7 in the home position starting from its 3rd.', steps: ['Am7 = A C E G; the 3rd is C.', 'Lowest C in frets 7–11: E8.'], answer: 'Start on E8 (C), then E (A7), G (A10), A (D7)…' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Hear each 7th arpeggio as its chord\'s mood (from Level 5), and hear the **moment of change**: when a line over ii – V – I moves by a half step on the change, the chord change itself is in the melody. Try singing a ii – V – I line with no guitar: you\'ll hear the harmony even with one voice.' },
        { list: ['Play the seven arpeggios of C slowly and name each mood.', 'Loop Dm7 – G7 and sing C → B, F → F, over and over.'] },
      ],
      drills: [
        { label: 'Hear it: which 7th chord?', quiz: 'l5-7ths-ear', minutes: 4 },
        { label: 'Hear it: which chord tone?', quiz: 'l6-tone-ear', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Starting every arpeggio from its root when the chord changes.', right: 'Move to the nearest chord tone: that\'s what makes it sound like a melody, not a list of arpeggios.' },
        { wrong: 'Jumping positions to play each chord in its "own" shape.', right: 'Stay in one position: every chord of the key is under your hand.' },
        { wrong: 'Playing a maj7 arpeggio over a dominant chord (B over G7… or B♮ over C7).', right: 'Check the 7th: dominant chords have the ♭7.' },
        { wrong: 'Rushing to eighths.', right: 'Quarter notes first, changing exactly on beat 1.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Slowly. Say the chord name as you switch to it. The aim is to change arpeggio without moving your hand.',
      challenge: { label: 'The key in a second position', ex: { label: 'ii – V – I – vi in C: 7th arpeggios as one line', tab: 'arp7Changes' }, goal: 'then all seven 7th arpeggios of C in the A-shape position (frets 2–5), and the ii – V – I – vi line there from memory', why: 'A second position doubles your map and proves you know the chords, not the fingering.' },
      goals: [
        { focus: 'The four types', tasks: [{ label: 'Cmaj7 arpeggio', ex: { label: 'Cmaj7 arpeggio', spec: { kind: 'arpeggio', root: 'C', type: 'maj7', position: 0 } }, minutes: 3 }, { label: 'G7 arpeggio', ex: { label: 'G7 arpeggio', spec: { kind: 'arpeggio', root: 'G', type: 'dom7', position: 0 } }, minutes: 3 }, { label: 'Dm7 arpeggio', ex: { label: 'Dm7 arpeggio', spec: { kind: 'arpeggio', root: 'D', type: 'm7', position: 0 } }, minutes: 3 }] },
        { focus: 'One position, seven chords', tasks: [{ label: 'The seven 7th arpeggios of C, frets 7–11', ex: { label: 'The seven 7th arpeggios of C major in one position', tab: 'arp7Pos' }, minutes: 8, goal: 'no stops at 76 BPM' }] },
        { focus: 'One line', tasks: [{ label: 'ii – V – I – vi as one line', ex: { label: 'ii – V – I – vi in C: 7th arpeggios as one line', tab: 'arp7Changes' }, minutes: 8 }] },
        { focus: 'Know the tones', tasks: [{ label: 'Which chord tone is it?', quiz: 'l6-tone', minutes: 5, goal: '2 stars' }] },
        { focus: 'Over a backing', tasks: [{ label: 'Jam: ii – V – I – vi, arpeggios only', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: [
          '**Jam**: a jazz or bossa progression; improvise with arpeggio notes only for a chorus, then add scale notes between them.',
          '**Looper**: loop Dm7 – G7 – Cmaj7 – Am7 as shells (Level 5), then solo over it in the home position.',
          '**Neo-soul**: over Fmaj7 – Em7 (one bar each), alternate the two arpeggios slowly with slides: most of the notes are shared.',
        ] },
      ],
      tasks: [
        { label: 'Jam: arpeggios over ii – V – I', tool: 'jam', minutes: 10 },
        { label: 'Target notes', tool: 'targets', minutes: 6 },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Name the tones, hear them, play the line, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Which chord tone is it?', quiz: 'l6-tone' },
        { skill: 'Hear', label: 'Hear it: which 7th chord?', quiz: 'l5-7ths-ear' },
        { skill: 'Play', label: 'ii – V – I – vi as one line (mic)', ex: { label: 'ii – V – I – vi in C: 7th arpeggios as one line', tab: 'arp7Changes' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Seventh arpeggios: every chord of a key in one position". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) the four 7th arpeggio formulas, (2) why one position holds every 7th chord of a key, (3) which arpeggios share three notes and why that matters, (4) how to play ii – V – I as one line, (5) which notes usually move on the change. Keep it short.',
        points: ['maj7 1 3 5 7, 7 1 3 5 ♭7, m7 1 ♭3 5 ♭7, m7♭5 1 ♭3 ♭5 ♭7', 'all seven come from the same scale: the hand stays, the targets change', 'chords a 3rd apart share three notes (Cmaj7/Em7, Dm7/Fmaj7)', 'move to the nearest note of the next arpeggio, change on beat 1', 'the guide tones: C → B, F → E by half step'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'W4ZeaKoynv4', title: 'Demystifying Triads and CAGED: Unlock the fretboard and improvise freely' },
      books: [
        { book: 'Triads for the Improvising Guitarist', where: 'The parts on triads inside 7th chords', why: 'Every 7th chord holds two triads: a lighter way to play the same idea.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'The arpeggios chapter', why: 'More arpeggio positions and how to use them.' },
        { book: 'The Guide to Playing Endless Killer Arpeggio Guitar Licks', where: 'The 7th-chord licks', why: 'Arpeggios as licks.' },
      ],
      blocks: [{ p: '**Next**: targeting chord tones: landing the right note at the right moment, with any scale.' }],
    },
  ],
}

// ---- Lesson 3: targeting chord tones on the changes ----------------------------------------------------------------
export const TARGETING: CourseLesson = {
  id: 'c6-targets', level: 6, n: 3, title: 'Targeting chord tones on the changes', minutes: 85,
  goal: 'Land on a chord tone, above all the 3rd, exactly when each chord arrives; plan a line backwards from its targets; and do it over ii – V – I, the minor ii – V – i and a 12-bar blues, so a solo follows the chords instead of floating over them.',
  builds: ['seventh arpeggios', 'voice leading and guide tones', 'pentatonic positions'],
  topics: ['target notes', 'chord tones', 'guide tones', 'playing the changes', 'blues', 'jazz', 'soloing'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Two solos can use exactly the same scale and sound completely different: one wanders, the other follows every chord as if it were singing the song. The difference is **where the strong notes fall**. The second player lands on a chord tone, usually the **3rd**, right as each chord arrives. That one habit is what "playing the changes" means.' },
        { p: 'You already have the tools: arpeggios (where the chord tones are) and guide tones (which ones matter most). Now you\'ll put them in time.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['land on the 3rd of every chord on beat 1 over ii – V – I and a blues;', 'plan a phrase backwards from where it has to land;', 'hear when a solo is following the chords and when it isn\'t;', 'use the minor ii – V – i, where the targets change.'] },
      ],
    },
    {
      kind: 'learn', title: '1 · Strong beats and strong notes', blocks: [
        { p: 'In 4/4, **beats 1 and 3** are strong, 2 and 4 weaker, and the "ands" weakest. Chord tones on strong beats make a line sound like it belongs to the harmony; other notes on strong beats create tension (good in small doses).' },
        { p: 'Ranking the chord tones as landing notes:' },
        { list: ['**3rd**: the strongest. It names the chord (major or minor) and changes from chord to chord.', '**7th**: the other guide tone, leaning and expressive.', '**Root**: safe but plain (the bass is already playing it).', '**5th**: safe and neutral.'] },
        { p: 'So the habit to build: **3rd of the new chord on beat 1**.' },
      ],
    },
    {
      kind: 'learn', title: '2 · Plan it backwards', blocks: [
        { p: 'Beginners improvise forwards and hope to land somewhere good. Experienced players often think **backwards**: "the chord changes to G7 in two beats; I want to be on B then; what\'s a nice way to get there?"' },
        { list: ['**Step 1**: find the target (the 3rd of the next chord, near where your hand is).', '**Step 2**: pick a note a step or two away from it.', '**Step 3**: fill the gap with scale or arpeggio notes.'] },
        { p: 'Over **Dm7 – G7 – Cmaj7** in C at the 7th fret: target **F** (Dm7), then **B** (G7: e7, right next to your hand), then **E** (Cmaj7). The tab for this lesson does exactly that, first in quarter notes, then in eighths.' },
        { spots: { caption: 'G7 in the home position, its 3rd (B) and 7th (F) as targets. B is a half step below Dm7\'s C; F is held over from Dm7.', from: 0, to: 12, marks: m => positionMarks(m, 0, 7, [0, 4, 7, 10], [4, 10]) } },
      ],
    },
    {
      kind: 'learn', title: '3 · Targets in a blues', blocks: [
        { p: 'A 12-bar blues in A has three chords: **A7, D7, E7**. Their 3rds are **C♯, F♯ and G♯**. None of them is in the A minor pentatonic! That\'s why players who only use the minor pentatonic over a blues sound "rock" but miss the sweetness of the changes.' },
        { list: ['Over **A7**, land on **C♯** (the 3rd) when the chord comes back.', 'Over **D7**, land on **F♯** (its 3rd) or **C** (its ♭7, which is the ♭3 of A: the blue note works here!).', 'Over **E7**, land on **G♯** (its 3rd), a half step below the root A.'] },
        { p: 'You can stay in the minor pentatonic box and just reach for these three notes on the changes. Lesson 4 (mixing pentatonics) goes all the way with this.' },
      ],
    },
    {
      kind: 'learn', title: '4 · The minor ii – V – i', blocks: [
        { p: 'In A minor the ii – V – i is **Bm7♭5 – E7 – Am7** (Level 5: the V borrows G♯ from harmonic minor). Targets: **D** (3rd of Bm7♭5), **G♯** (3rd of E7), **C** (3rd of Am7).' },
        { p: 'Notice G♯: it\'s not in the A minor scale, and it\'s the note that makes the V sound like a V. Landing on it, then resolving up to A, is the sound of every minor-key solo from flamenco to metal.' },
        { video: { id: 'AjnrjSavuVc', title: 'Understanding the II-V-I Progression: Introduction to Jazz Guitar', note: 'The progression you\'re targeting, with its chord tones.' } },
      ],
    },
    {
      kind: 'learn', title: '5 · What mastery looks like', blocks: [
        { p: 'You own targeting when:' },
        { list: [
          'Over **ii – V – I** you land on the 3rd of every chord on beat 1, in quarters and in eighths, at 80 BPM.',
          'Over a **12-bar blues in A**, you hit C♯, F♯ and G♯ as the chords change.',
          'Over **Bm7♭5 – E7 – Am7**, you land on D, G♯ and C.',
          'In the Target notes tool you reach the voice-leading level.',
          'Listening to your own recording, you can **hear the changes in your solo** even with the backing muted.',
        ] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Find the target, then the road to it.', examples: [
        { q: 'Over Am7 – D7 – Gmaj7, what are the targets?', steps: ['3rds: Am7 → C, D7 → F♯, Gmaj7 → B.'], answer: 'C, F♯, B (each a step from the one before: C to B by way of F♯).' },
        { q: 'You\'re on A (D7, 7th fret) over Dm7, two beats before G7. Plan the line.', steps: ['Target: B, the 3rd of G7 (nearest: e7, or D9 on the D string).', 'One note before it, a step away: C (Dm7\'s 7th) is a half step above B.', 'Fill the gap: A, then C.'], answer: 'A – C – (beat 1) B: the C, Dm7\'s 7th, steps down to B.' },
        { q: 'A blues in E: what are the targets on E7, A7 and B7?', steps: ['3rds: E7 → G♯, A7 → C♯, B7 → D♯.'], answer: 'G♯, C♯, D♯.' },
        { q: 'Why is landing on the root over each chord weaker than the 3rd?', steps: ['The bass is already playing the root.', 'The 3rd is the note that changes the colour and tells the ear which chord it is.'], answer: 'The root doubles the bass; the 3rd defines the chord.' },
        { q: 'Over E7 in A minor, which note shows the ear it\'s a V chord?', steps: ['E7 = E G♯ B D.', 'G♯ is the leading note, not in natural minor.'], answer: 'G♯ (then up to A on the i chord).' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Learn to **hear a line follow the chords**. Record yourself soloing over a loop, then play the recording back with the backing muted (the looper\'s mute, or just your track). If you can still hear where the chords change, you were targeting. If it sounds like one long chord, you weren\'t.' },
        { list: ['Over a looped ii – V – I, sing only the 3rds on beat 1: F, B, E.', 'Over a blues, sing C♯, F♯, G♯ on the changes.'] },
      ],
      drills: [
        { label: 'Hear it: which chord tone?', quiz: 'l6-tone-ear', minutes: 5 },
        { label: 'Guide tones: where does each voice go?', quiz: 'l5-guide', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Using one scale for the whole blues and ignoring the chords.', right: 'Keep the scale, but reach for each chord\'s 3rd on the change.' },
        { wrong: 'Landing on the target a beat late.', right: 'The target is beat 1. Plan backwards so you\'re a step away on beat 4.' },
        { wrong: 'Making every phrase end on the root.', right: 'Use 3rds and 7ths: they make the line follow the harmony.' },
        { wrong: 'Thinking targeting means only playing chord tones.', right: 'Chord tones on the strong beats, anything tasteful in between.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Say the target out loud before each chord arrives. Accuracy first, speed later.',
      challenge: { label: 'Targets in three settings', ex: { label: 'Target the 3rds: Dm7 – G7 – Cmaj7, landing on F, B and E', tab: 'targets' }, goal: 'then improvise two choruses of a 12-bar blues in A and a ii – V – I in F, landing on every chord\'s 3rd on beat 1, recorded with the looper', why: 'Doing it in your own lines, in different keys and styles, is the real test.' },
      goals: [
        { focus: 'Know the targets', tasks: [{ label: 'Which chord tone is it?', quiz: 'l6-tone', minutes: 5, goal: '2 stars' }] },
        { focus: 'Major ii – V – I', tasks: [{ label: 'Target the 3rds: Dm7 – G7 – Cmaj7', ex: { label: 'Target the 3rds: Dm7 – G7 – Cmaj7, landing on F, B and E', tab: 'targets' }, minutes: 8, goal: 'clean at 72 BPM' }] },
        { focus: 'Minor ii – V – i', tasks: [{ label: 'Target the 3rds in A minor', ex: { label: 'Target the 3rds in A minor: Bm7♭5 – E7 – Am7, landing on D, G♯ and C', tab: 'targetsMinor' }, minutes: 6 }] },
        { focus: 'The tool', tasks: [{ label: 'Target notes: up to the 3rds level', tool: 'targets', minutes: 8 }] },
        { focus: 'Blues', tasks: [{ label: 'Jam: 12-bar blues in A, land on C♯, F♯, G♯', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: [
          '**Looper**: record a ii – V – I or a blues, then solo landing on 3rds; mute the backing on playback and listen.',
          '**Improv coach (Jam)**: it listens and tells you how often you landed on chord tones.',
          '**Songs**: pick a song you know and solo over its chords, landing on each chord\'s 3rd.',
        ] },
      ],
      tasks: [
        { label: 'Target notes', tool: 'targets', minutes: 10 },
        { label: 'Jam: solo over a progression, landing on 3rds', tool: 'jam', minutes: 10 },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Name them, hear them, play them, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Which chord tone is it?', quiz: 'l6-tone' },
        { skill: 'Hear', label: 'Hear it: which chord tone?', quiz: 'l6-tone-ear' },
        { skill: 'Play', label: 'Target the 3rds (mic)', ex: { label: 'Target the 3rds: Dm7 – G7 – Cmaj7, landing on F, B and E', tab: 'targets' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Targeting chord tones on the changes". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) which beats are strong and why it matters, (2) which chord tones make the best targets and why the 3rd is first, (3) how to plan a line backwards, (4) the targets in a 12-bar blues in A, (5) the targets in the minor ii – V – i in A minor. Keep it short.',
        points: ['beats 1 and 3 strong; chord tones there make the line fit', '3rd first (names the chord, changes), then 7th, root and 5th safe', 'find the target, a note a step away, fill the gap', 'A7 C♯, D7 F♯ (or C), E7 G♯', 'Bm7♭5 D, E7 G♯, Am7 C'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: '7FilvCPSYXc', title: 'How Do I Improvise? Start Simple and Expand' },
      books: [
        { book: 'Improvise for Real', where: 'The parts on chord tones and the harmony under the melody', why: 'Hearing where you are in the chord, the ear-first version of this lesson.' },
        { book: 'The CAGED System and 100 Licks for Blues Guitar', where: 'The licks over the IV and V chords', why: 'Blues licks that target the changes.' },
        { book: 'Dominant Pentatonic Scale Guitar Soloing', where: 'The parts on soloing over each chord of a blues', why: 'A pentatonic built to contain each dominant chord\'s 3rd.' },
      ],
      blocks: [{ p: '**Next**: mixing major and minor pentatonic, the blues player\'s way of having both the sweetness and the grit.' }],
    },
  ],
}

// ---- Lesson 4: mixing major and minor pentatonic -------------------------------------------------------------------
export const MIX_PENT: CourseLesson = {
  id: 'c6-mixpent', level: 6, n: 4, title: 'Mixing major and minor pentatonic', minutes: 75,
  goal: 'Play the major and minor pentatonic of the same root side by side, know which one fits which chord, mix them over a blues the way B.B. King, the Allman Brothers and country players do (the ♭3 slipping into the 3), and choose on purpose instead of by habit.',
  builds: ['pentatonic positions', 'targeting chord tones', 'the 12-bar blues'],
  topics: ['pentatonic', 'blues', 'major pentatonic', 'minor pentatonic', 'blue notes', 'soloing', 'country'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Over a blues in A, the A **minor** pentatonic sounds tough and bluesy. The A **major** pentatonic sounds sweet, country, singing. The best blues players use **both**, often in the same phrase: they play the minor 3rd (C) and slide it up to the major 3rd (C♯), bend the ♭3 a little sharp, or move between the two boxes as the chords change.' },
        { p: 'Knowing which one to use, and when, is one of the biggest steps from "playing a scale over a song" to sounding like a real blues, rock or country player.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['play A major and A minor pentatonic in the same area of the neck;', 'say which notes they share and which differ;', 'choose the right one for major songs, minor songs and the blues;', 'mix them with the ♭3 → 3 move, and follow the chords of a blues.'] },
      ],
    },
    {
      kind: 'learn', title: '1 · Same root, different notes', blocks: [
        { list: ['**A minor pentatonic**: A C D E G (1 ♭3 4 5 ♭7).', '**A major pentatonic**: A B C♯ E F♯ (1 2 3 5 6).'] },
        { p: 'They share only **A and E** (root and 5th). The minor has the ♭3, 4 and ♭7; the major has the 2, 3 and 6. In the 5th-fret area they sit side by side: the minor box at frets 5–8, the major at frets 4–7.' },
        { spots: { caption: 'A minor pentatonic, frets 5–8 (targets: ♭3 and ♭7).', from: 0, to: 10, marks: m => scaleMarks(m, 9, [0, 3, 5, 7, 10], 4, 8, [3, 10]) } },
        { spots: { caption: 'A major pentatonic, frets 4–7 (targets: 3 and 6). The same shape as F♯ minor pentatonic (Level 3\'s relative trick).', from: 0, to: 10, marks: m => scaleMarks(m, 9, [0, 2, 4, 7, 9], 4, 7, [4, 9]) } },
      ],
    },
    {
      kind: 'learn', title: '2 · Which one fits which chord?', blocks: [
        { p: 'Match the scale\'s 3rd to the chord\'s 3rd:' },
        { list: [
          '**Major chord or major key** (A, A6, Amaj7): **major pentatonic**. The minor\'s C clashes with the chord\'s C♯ in a way that sounds wrong in a sweet song.',
          '**Minor chord or minor key** (Am, Am7): **minor pentatonic** only. The major\'s C♯ clashes with the chord\'s C.',
          '**Dominant 7th / the blues** (A7): **both**. The chord has C♯ and G; the minor pentatonic\'s C rubs against C♯ as a **blue note**, the tension the blues is built on, and resolving it (C → C♯, or C → A) is the release.',
        ] },
        { tip: 'Rock, metal and much of the blues lean minor. Country, Southern rock, soul and the Allman Brothers lean major (or mix). Ask: is this song sweet or gritty?' },
      ],
    },
    {
      kind: 'learn', title: '3 · Mixing: the ♭3 into the 3', blocks: [
        { p: 'The signature move: play the **♭3 and slide or hammer it up to the 3** (C → C♯ over A7). You get the blues grit and the major sweetness in one gesture. On the guitar: the C at the 5th fret of the G string, slid to the 6th; or the C on the B string (1st fret) hammered to 2. A quarter-step bend on the ♭3 does the same thing more subtly.' },
        { p: 'Other mixtures:' },
        { list: ['the **6 (F♯) with the ♭7 (G)**: both appear in blues lines (that\'s the Mixolydian sound, Level 8);', '**major pentatonic on the I chord, minor on the IV**: over D7 the minor pentatonic of A has C (the ♭7 of D), which fits perfectly;', '**minor licks ending on the 3**: a minor pentatonic phrase that resolves to C♯ instead of A.'] },
        { play: { label: 'C sliding up to C♯ over A7, then down to A', seq: [72, 73, 69], chord: [45, 52, 55, 61, 64], gap: 0.45 } },
      ],
    },
    {
      kind: 'learn', title: '4 · Following a blues with both', blocks: [
        { p: 'Over a 12-bar blues in A (A7 / D7 / E7), a simple plan that follows the changes:' },
        { list: ['**A7**: major pentatonic phrases, or minor with the ♭3 → 3 move. Land on C♯ or A.', '**D7**: the minor pentatonic of A works beautifully: A, C and D are D7\'s chord tones (C is its ♭7). Land on C or A, or reach for F♯ (its 3rd).', '**E7**: aim for G♯ (its 3rd), or the minor pentatonic\'s D (E7\'s ♭7).', '**Turnaround**: E7 back to A7, G♯ → A.'] },
        { video: { id: 'FONKenvjCN4', title: 'Guitar Scales Explained: MAJOR vs MINOR PENTATONIC vs BLUES', note: 'The three scales side by side, and when each one fits.' } },
      ],
    },
    {
      kind: 'learn', title: '5 · What mastery looks like', blocks: [
        { p: 'You own the mix when:' },
        { list: [
          'You can play A major and A minor pentatonic in the same area, and switch mid-phrase.',
          'You can say which one fits **major, minor and dominant** chords, and why.',
          'You can play the **♭3 → 3** slide, hammer and quarter-bend in three places on the neck.',
          'Over a blues in A, E and G, you choose major or minor **for each chord**.',
          'By ear, you tell major, minor and mixed lines apart **eight times out of ten**.',
        ] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Find the chord\'s 3rd; let it pick the scale.', examples: [
        { q: 'Which pentatonic over Em?', steps: ['Em has G (♭3).', 'E major pentatonic has G♯: it clashes.'], answer: 'E minor pentatonic.' },
        { q: 'Which over a country song in G?', steps: ['Major key, major chords.', 'G major pentatonic: G A B D E.'], answer: 'G major pentatonic (or mix in the B♭ → B slide for bluesier moments).' },
        { q: 'Over a blues in E, play the ♭3 → 3 move on the G string.', steps: ['♭3 of E = G, 3 = G♯.', 'G string: open G → 1st fret G♯ (hammer), or 12 → 13.'], answer: 'G string 0 → 1 (or 12 → 13).' },
        { q: 'The notes of A minor and A major pentatonic together: how many different notes?', steps: ['A C D E G + A B C♯ E F♯.', 'Shared: A, E.'], answer: 'Eight: A B C C♯ D E F♯ G.' },
        { q: 'Over D7 in an A blues, why does the A minor pentatonic sound good?', steps: ['A minor pent: A C D E G.', 'D7 = D F♯ A C: A, C, D are chord tones; E is its 9th, G its 4th (passing).'], answer: 'Three of its five notes are D7\'s chord tones, including C, the ♭7.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Over an A7 chord, hear the difference: minor pentatonic lines have a **rub** (C against the chord\'s C♯) that sounds like the blues; major pentatonic lines sit **on** the chord and sound sweet. The mixed line has both: a rub that resolves.' },
        { list: ['Loop A7, play the minor box for 30 seconds, then the major box, then mix.', 'Sing C, then C♯, over A7. Feel the C\'s tension and the C♯\'s release.'] },
      ],
      drills: [
        { label: 'Hear it: major, minor or mixed pentatonic?', quiz: 'l6-pent-ear', minutes: 5, goal: '8 out of 10' },
        { label: 'Major or minor? (by ear)', quiz: 'ch-ear', minutes: 3 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Using the major pentatonic over a minor chord.', right: 'Its 3rd clashes with the minor 3rd. Minor chords take minor pentatonic.' },
        { wrong: 'Sitting on the ♭3 over a major chord for a long time.', right: 'The blue note is a rub to resolve: move it up to the 3, or down to the root.' },
        { wrong: 'Learning the major pentatonic as a "new" set of five boxes.', right: 'It\'s the relative minor\'s boxes (A major = F♯ minor shapes), three frets lower.' },
        { wrong: 'Picking a scale for the whole song and never changing.', right: 'Let the chords decide: in a blues, each chord can take its own choice.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Say "major" or "minor" as you switch. Over the blues, name each chord before it arrives.',
      challenge: { label: 'A blues chorus, chord by chord', ex: { label: 'Major and minor pentatonic over A7, then mixed (the C slides up to C♯)', tab: 'mixPent' }, goal: 'then improvise three choruses of a blues in E (or G), choosing major or minor for each chord and using the ♭3 → 3 slide at least once a chorus, recorded with the looper', why: 'Making the choice live, in a new key, is the whole skill.' },
      goals: [
        { focus: 'Both boxes', tasks: [{ label: 'Major, minor and mixed over A7', ex: { label: 'Major and minor pentatonic over A7, then mixed (the C slides up to C♯)', tab: 'mixPent' }, minutes: 8, goal: 'clean at 84 BPM' }] },
        { focus: 'Hear them', tasks: [{ label: 'Hear it: major, minor or mixed pentatonic?', quiz: 'l6-pent-ear', minutes: 5, goal: '2 stars' }] },
        { focus: 'The slide', tasks: [{ label: 'Slides: the ♭3 into the 3', ex: { label: 'Slides', drill: 'slides' }, minutes: 5 }] },
        { focus: 'Over a blues', tasks: [{ label: 'Jam: 12-bar blues in A, major on A7, minor on D7', tool: 'jam', minutes: 10 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: [
          '**Jam**: blues, Southern rock or country styles; try each scale in turn and pick what sounds right.',
          '**Must-know licks**: look at the blues and country licks: spot which use the major 3rd and which the minor.',
          '**Looper**: loop a I – IV – V shuffle and solo, switching scale with the chord.',
        ] },
      ],
      tasks: [
        { label: 'Jam: blues with both pentatonics', tool: 'jam', minutes: 10 },
        { label: 'Call and response over a blues', tool: 'cr', minutes: 6 },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Hear them, play them, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Which chord tone is it?', quiz: 'l6-tone' },
        { skill: 'Hear', label: 'Hear it: major, minor or mixed pentatonic?', quiz: 'l6-pent-ear' },
        { skill: 'Play', label: 'Major, minor and mixed over A7 (mic)', ex: { label: 'Major and minor pentatonic over A7, then mixed (the C slides up to C♯)', tab: 'mixPent' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Mixing major and minor pentatonic". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) the notes of A major and A minor pentatonic and what they share, (2) which pentatonic fits major, minor and dominant chords and why, (3) what the blue note is, (4) the ♭3 → 3 move and three ways to play it, (5) a plan for a 12-bar blues in A using both. Keep it short.',
        points: ['A minor A C D E G, A major A B C♯ E F♯; shared A and E', 'match the 3rd: major → major pent, minor → minor pent, dominant → both', 'the ♭3 over a major/dominant chord: a rub to resolve', 'slide, hammer-on or quarter-bend the ♭3 into the 3', 'A7 major or mixed, D7 minor of A (C = its ♭7), E7 aim for G♯'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'Gu2esZ-PzFM', title: '5 Blues Licks from the Minor Pentatonic' },
      books: [
        { book: 'Dominant Pentatonic Scale Guitar Soloing', where: 'From the start', why: 'A pentatonic built for dominant chords: the next step after mixing.' },
        { book: 'The CAGED System and 100 Licks for Blues Guitar', where: 'The major and minor blues licks', why: 'Dozens of licks in both flavours, in every shape.' },
      ],
      blocks: [{ p: '**Next**: passing, approach and chromatic notes: the notes between the targets.' }],
    },
  ],
}

export const LEVEL6_A: CourseLesson[] = [CAGED_ARPS, SEVENTH_ARPS, TARGETING, MIX_PENT]
