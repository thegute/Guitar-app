// Level 8 (Modes and beyond), lessons 1–5: what modes really are, Dorian and Mixolydian, Lydian / Phrygian / Locrian,
// modal vamps and their colour chords, harmonic minor and Phrygian dominant. Lessons 6–9 and the check are in level8b.ts.
// Grips (low E first), each checked note by note: Am7 x02010 · D xx0232 · G 320003 · F 133211 · G/F 1x0003 · Em 022000
//   Am x02210 · E7 020100 · C x32010 · Bm7♭5 x2323x
import type { CourseLesson } from './types'
import { MODE, modeMarks } from './l8Tabs'

const G = [40, 45, 50, 55, 59, 64]
const notes = (frets: number[]) => frets.flatMap((f, i) => (f < 0 ? [] : [G[i] + f]))
/** a mode in one window on the neck, its colour notes highlighted */
export const modeFig = (caption: string, root: number, ivs: readonly number[], lo: number, hi: number, colour: number[] = [], chordy = false) =>
  ({ caption, from: 0, to: Math.max(hi + 2, 13), marks: (m: number[]) => modeMarks(m, root, ivs, lo, hi, colour, chordy) })
/** a scale played up an octave from a root (midi) */
export const run = (root: number, ivs: readonly number[]) => [...ivs, 12].map(i => root + i)
const Am7 = [-1, 0, 2, 0, 1, 0], D = [-1, -1, 0, 2, 3, 2], Gc = [3, 2, 0, 0, 0, 3], F = [1, 3, 3, 2, 1, 1], GoverF = [1, -1, 0, 0, 0, 3], Em = [0, 2, 2, 0, 0, 0]
const Am = [-1, 0, 2, 2, 1, 0], E7 = [0, 2, 0, 1, 0, 0], C = [-1, 3, 2, 0, 1, 0], Bm7b5 = [-1, 2, 3, 2, 3, -1]
const ex = (label: string, tab: string) => ({ label, tab: tab as never })

// ---- Lesson 1: what modes really are ---------------------------------------------------------------------------
const PAR = 'Seven modes on one root (C), brightest to darkest: listen for the note that changes'
export const MODES: CourseLesson = {
  id: 'c8-modes', level: 8, n: 1, title: 'What modes really are', minutes: 75,
  goal: 'Understand modes two ways (the same notes from a new home, and one root with a different set of notes), order them from brightest to darkest, name each one\'s colour note, and hear that modes are about where home is, not which shape your hand is in.',
  builds: ['the major scale', 'the major scale in five positions', 'natural minor', 'the chords of a key'],
  topics: ['modes', 'scales', 'Dorian', 'Mixolydian', 'Lydian', 'Phrygian', 'Locrian', 'ear'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Modes are the most misunderstood idea in guitar theory. Most players learn "Dorian is the major scale from the 2nd note", play the same shape from a different finger, and hear… the major scale. Nothing changes, because **the ear decides where home is, not the hand**.' },
        { p: 'This lesson fixes that. A mode is a **colour**: a set of notes heard against one root. Get that, and the seven modes become seven moods you can pick on purpose: the Dorian of Santana and funk, the Mixolydian of AC/DC and the Grateful Dead, the Lydian of film scores and Plini, the Phrygian of flamenco and metal.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['explain modes as "relative" (same notes, new home) and as "parallel" (same home, new notes);', 'order the seven modes from brightest to darkest;', 'name the one note that gives each mode its colour;', 'hear which mode a phrase is in from a drone and a scale.'] },
        { play: { label: 'C Lydian, C major, C Mixolydian, C Dorian: one root, getting darker', seq: [...run(48, MODE.lydian), ...run(48, MODE.ionian), ...run(48, MODE.mixolydian), ...run(48, MODE.dorian)], gap: 0.2 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Relative view: the same notes, a new home', blocks: [
        { p: 'Take the notes of C major: C D E F G A B. Start and **end** on each of them in turn and you get the seven modes:' },
        { list: ['C to C: **Ionian** (the major scale).', 'D to D: **Dorian**.', 'E to E: **Phrygian**.', 'F to F: **Lydian**.', 'G to G: **Mixolydian**.', 'A to A: **Aeolian** (natural minor, Level 3).', 'B to B: **Locrian**.'] },
        { p: 'This is how modes are usually taught, and it\'s useful for **finding** the notes: D Dorian has no sharps or flats because C major doesn\'t. A Dorian? A is the 2nd note of G major, so A Dorian uses G major\'s notes (one sharp, F♯).' },
        { p: 'But it hides the sound. Play C major from D to D over a C chord and you hear C major. To hear Dorian, **D has to be home**: a D drone, a Dm chord, a bass line sitting on D.' },
        { video: { id: 'lPDVo-7Ua28', title: 'RELATIVE MODES - How C Major and A Minor are Same but Different', note: 'Jake Lizzio (Signals Music Studio) on why the same notes can be two different keys.' } },
      ],
    },
    {
      kind: 'learn', title: '2 · Parallel view: one home, seven colours', blocks: [
        { p: 'Now keep **one root** and change the notes. All seven modes on C, compared with C major:' },
        { list: [
          '**C Lydian**: C D E **F♯** G A B. Major with a ♯4. The brightest.',
          '**C Ionian**: C D E F G A B. Plain major.',
          '**C Mixolydian**: C D E F G A **B♭**. Major with a ♭7.',
          '**C Dorian**: C D **E♭** F G **A** B♭. Minor with a natural 6.',
          '**C Aeolian**: C D E♭ F G **A♭** B♭. Natural minor (♭6).',
          '**C Phrygian**: C **D♭** E♭ F G A♭ B♭. Minor with a ♭2.',
          '**C Locrian**: C D♭ E♭ F **G♭** A♭ B♭. ♭2 and ♭5: the darkest, its root chord is diminished.',
        ] },
        { p: 'Read down the list: each mode flattens **one more note** than the one above it. That\'s the brightness ladder, and it\'s the most useful way to remember modes: **Lydian – Ionian – Mixolydian – Dorian – Aeolian – Phrygian – Locrian**.' },
        { spots: modeFig('C Dorian, frets 2–6: the gold note is the natural 6 (A), the one that separates Dorian from natural minor.', 0, MODE.dorian, 2, 6, [9]) },
        { video: { id: 'bwaeBUYcO5o', title: 'Demonstrating All 7 Modes in Parallel', note: 'Jake plays all seven over one root: listen for the mood change, not the shape.' } },
      ],
    },
    {
      kind: 'learn', title: '3 · The colour note: one note per mode', blocks: [
        { p: 'Every mode has one note that sets it apart from plain major or minor. Play that note and the mode speaks; leave it out and it could be anything.' },
        { list: [
          'Major modes: **Lydian ♯4**, **Mixolydian ♭7** (Ionian is the plain one).',
          'Minor modes: **Dorian ♮6**, **Phrygian ♭2** (Aeolian is the plain one).',
          'Locrian: **♭5** (and ♭2), so its own root chord is diminished.',
        ] },
        { p: 'This is why the minor pentatonic fits Dorian, Aeolian and Phrygian alike: it has no 2nd and no 6th, so it skips every colour note. Add the colour note to the pentatonic and you\'re playing the mode (Level 3\'s blues box plus F♯ in A = A Dorian).' },
        { spots: modeFig('C Lydian, frets 2–6: the gold note is the ♯4 (F♯), floating between the 3rd and 5th.', 0, MODE.lydian, 2, 6, [6]) },
      ],
    },
    {
      kind: 'learn', title: '4 · Modes need a home: drones, vamps and bass notes', blocks: [
        { p: 'For a mode to sound, three things help the ear hear the root as home:' },
        { list: ['**A drone or pedal**: the root held or repeated underneath (an open string is perfect).', '**A vamp**: the root chord going back and forth with a chord that holds the colour note (lesson 4).', '**Phrasing**: start and end phrases on the root, lean on the colour note, but resolve to chord tones.'] },
        { p: 'And one thing destroys a mode: a strong **V → I** in the parent key. Play Dm7 – G7 – Cmaj7 and D Dorian disappears into C major. Modal music avoids that pull.' },
        { video: { id: '96cydVB4w-A', title: 'Playing In Every Mode with ONE Tiny Scale Shape', note: 'One small shape, seven sounds: the root you hear is what changes.' } },
      ],
    },
    {
      kind: 'learn', title: '5 · What mastery looks like', blocks: [
        { p: 'You own this when:' },
        { list: ['You can name the parent major scale of any mode in a few seconds (A Dorian → G).', 'You can spell any mode on any root by its colour note (E Mixolydian = E major with D natural).', 'You say the brightness ladder without thinking.', 'You hear a mode against a drone and name it, seven times out of ten.'] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Use both views: the parent scale to find the notes, the colour note to hear them.', examples: [
        { q: 'Which major scale has the notes of E Phrygian?', steps: ['Phrygian starts on the 3rd note of its major scale.', 'E is the 3rd of C major (C D E).'], answer: 'C major: E F G A B C D.' },
        { q: 'Spell G Mixolydian.', steps: ['G major: G A B C D E F♯.', 'Mixolydian = major with a ♭7: F♯ → F.'], answer: 'G A B C D E F (the notes of C major).' },
        { q: 'Spell D Lydian.', steps: ['D major: D E F♯ G A B C♯.', 'Lydian = major with a ♯4: G → G♯.'], answer: 'D E F♯ G♯ A B C♯ (the notes of A major).' },
        { q: 'You play an A minor pentatonic lick over an Am drone and add F♯. What mode is it?', steps: ['A minor pentatonic: A C D E G.', 'F♯ is a natural 6 over A minor.'], answer: 'A Dorian.', spots: modeFig('', 9, MODE.dorian, 4, 8, [9]) },
        { q: 'Why does B Locrian rarely work as a home?', steps: ['B Locrian: B C D E F G A.', 'Its triad B D F is diminished: there is no perfect 5th to rest on.'], answer: 'The home chord itself is unstable, so the ear keeps looking for another home (usually C).' },
        { q: 'Order these from darkest to brightest: Mixolydian, Phrygian, Dorian.', steps: ['Ladder: Lydian, Ionian, Mixolydian, Dorian, Aeolian, Phrygian, Locrian.'], answer: 'Phrygian, Dorian, Mixolydian.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'First decide **major or minor** (the 3rd). Then listen for the one note that differs: a raised 4th floating (Lydian), a 7th a whole step below the top (Mixolydian), a bright 6th in minor (Dorian), a half step straight above the root (Phrygian).' },
        { list: ['Play an open A string and play A Dorian, then A Aeolian over it. Sing the 6th each time.', 'Play an open E string and play E Phrygian: the F straight above the root is the whole mood.'] },
      ],
      drills: [
        { label: 'Hear it: which mode?', quiz: 'l8-mode-ear', minutes: 6, goal: '7 out of 10' },
        { label: 'The colour note of a mode', quiz: 'l8-colour', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Playing the C major shape from D over a C chord and calling it Dorian.', right: 'A mode needs its own home: D has to be the root you hear (a D drone, a Dm chord).' },
        { wrong: 'Learning seven "mode shapes" for each key.', right: 'Learn the major scale\'s positions (Level 4) and the colour notes. The shapes are the same; the root changes.' },
        { wrong: 'Thinking modes are only for jazz or shred.', right: 'Most rock, folk and pop is Mixolydian, Dorian or Aeolian. You already play modes.' },
        { wrong: 'Ending a "modal" progression on the parent key\'s V → I.', right: 'That pulls the ear to the parent key. Modal vamps avoid it (lesson 4).' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Say the mode\'s name and its colour note out loud as you start each one ("C Dorian, natural 6").',
      challenge: { label: 'Seven modes, one root, another key', ex: ex(PAR, 'modesParallel'), goal: 'then use the Key menu to play all seven on A, then on E using open strings, and hum the colour note of each before you play it', why: 'If you can hear the colour note coming, you know the mode, not the shape.' },
      goals: [
        { focus: 'Find the parent', tasks: [{ label: 'Which major scale is the mode from?', quiz: 'l8-parent', minutes: 5, goal: '2 stars' }] },
        { focus: 'Know the colour note', tasks: [{ label: 'The colour note of a mode', quiz: 'l8-colour', minutes: 5, goal: '2 stars' }] },
        { focus: 'Play the ladder', tasks: [{ label: 'Seven modes on C', ex: ex(PAR, 'modesParallel'), minutes: 8, goal: 'clean at 80 BPM' }] },
        { focus: 'Hear them', tasks: [{ label: 'Hear it: which mode?', quiz: 'l8-mode-ear', minutes: 6, goal: '2 stars' }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['**Ear training**: put on a drone in the Ear trainer and improvise in Lydian, then Mixolydian, then Dorian on the same root. Notice your mood change.', '**Jam**: any one-chord groove is a modal canvas: a minor groove takes Dorian or Aeolian, a dominant groove takes Mixolydian.', '**Songs**: ask of every song you learn: major or minor, and which colour note does the melody use?'] },
      ],
      tasks: [{ label: 'Ear trainer: improvise over a drone', tool: 'ear', minutes: 8 }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Find them, hear them, play them, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Which major scale is the mode from?', quiz: 'l8-parent' },
        { skill: 'Hear', label: 'Hear it: which mode?', quiz: 'l8-mode-ear' },
        { skill: 'Play', label: 'Seven modes on one root (mic)', ex: ex(PAR, 'modesParallel') },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "What modes really are". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) the relative and parallel ways of seeing modes, (2) the brightness ladder, (3) the colour note of each mode, (4) why a mode needs a home and what destroys it. Ask me to spell one mode on a root I don\'t expect. Keep it short.',
        points: ['relative: same notes, new home; parallel: same home, different notes', 'Lydian Ionian Mixolydian Dorian Aeolian Phrygian Locrian', 'Lyd ♯4, Mix ♭7, Dor ♮6, Aeo ♭6, Phr ♭2, Loc ♭5', 'a drone, vamp or bass note makes the root home; the parent key\'s V → I destroys it'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'oF9TYm0Ck9U', title: 'Guitar Lesson: A Guide to the Seven Modes of the Major Scale' },
      books: [
        { book: 'Music Theory for Guitarists', where: 'The chapter on modes', why: 'Each mode with its chords and positions.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'The modes chapters', why: 'Modes as colours, with backing tracks to hear them.' },
      ],
      blocks: [{ p: '**Next**: the two modes you\'ll use most, Dorian and Mixolydian.' }],
    },
  ],
}

// ---- Lesson 2: Dorian and Mixolydian ---------------------------------------------------------------------------
const DOR = 'A Dorian over Am7 – D: the F♯ (the ♮6) is the colour, and the 3rd of D'
const MIX = 'G Mixolydian over G – F: the F (the ♭7) is the colour, and the root of the F chord'
export const DORMIX: CourseLesson = {
  id: 'c8-dormix', level: 8, n: 2, title: 'Dorian and Mixolydian: the modes you already hear', minutes: 85,
  goal: 'Play Dorian and Mixolydian in any key, build them from the pentatonic you know, hear their colour notes, and solo over their vamps (Am7 – D, G – F) so the colour note lands on purpose.',
  builds: ['what modes really are', 'the minor and major pentatonic', 'targeting chord tones'],
  topics: ['Dorian', 'Mixolydian', 'modes', 'soloing', 'funk', 'rock', 'blues'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: '**Dorian** is the minor of funk, soul, Santana, Pink Floyd\'s long solos and "Oye Como Va". **Mixolydian** is the major of classic rock, AC/DC, the Grateful Dead, bluegrass and every blues that isn\'t minor. Between them they cover more songs than all the other modes put together.' },
        { p: 'The good news: you already know 5 of their 7 notes. They are the pentatonic plus two notes, and one of those two is the colour note.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['play A Dorian and G Mixolydian in one position, and move them anywhere;', 'turn the minor pentatonic into Dorian and the major pentatonic into Mixolydian;', 'recognise the Dorian vamp (i – IV) and the Mixolydian vamp (I – ♭VII);', 'land the colour note where it sounds best.'] },
        { prog: { label: 'Am7 – D (Dorian), then G – F (Mixolydian)', chords: [notes(Am7), notes(D), notes(Am7), notes(D), notes(Gc), notes(F), notes(Gc), notes(F)], gap: 0.8 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Dorian: minor with a natural 6', blocks: [
        { p: 'A Dorian: **A B C D E F♯ G**. It\'s A natural minor with the 6th raised (F → F♯). That one note makes minor sound hopeful, open, a bit funky, rather than sad.' },
        { p: 'Build it from what you know: **A minor pentatonic** (A C D E G) **+ B** (the 9th, smooth) **+ F♯** (the colour). Three notes per octave added? No, just two.' },
        { p: 'The chord that gives it away is the **major IV**: in A Dorian, the IV is **D major** (D F♯ A), and F♯ is its 3rd. A minor song with a major IV chord (Am – D, Em – A, Dm – G) is almost always Dorian.' },
        { spots: modeFig('A Dorian, frets 4–8: the gold notes are F♯ (the colour) and B (the 9th): add them to the minor pentatonic box.', 9, MODE.dorian, 4, 8, [9, 2]) },
        { video: { id: 'hyZPcYf1Pe4', title: 'DORIAN SCALE - The 2nd mode of Major', note: 'Jake on Dorian: where it comes from, the IV chord and songs that use it.' } },
      ],
    },
    {
      kind: 'learn', title: '2 · Mixolydian: major with a flat 7', blocks: [
        { p: 'G Mixolydian: **G A B C D E F**. It\'s G major with the 7th lowered (F♯ → F). The result is major, but relaxed, earthy and bluesy: the dominant 7th chord turned into a scale.' },
        { p: 'Build it from the **G major pentatonic** (G A B D E) **+ C** (the 4th) **+ F** (the ♭7, the colour). Or mix the major and minor pentatonic (Level 6), which gives Mixolydian plus the blue ♭3.' },
        { p: 'The giveaway chord is the **♭VII**: a major chord a whole step below home. G – F, D – C, A – G, E – D: think "Sweet Home Alabama", "Sympathy for the Devil", every "rock" I – ♭VII – IV.' },
        { spots: modeFig('G Mixolydian, frets 2–6: the gold note is F, the ♭7, a whole step under the root.', 7, MODE.mixolydian, 2, 6, [10]) },
        { video: { id: 'vPIebPDBizs', title: 'How to Improvise Solos in Mixolydian Mode', note: 'Jake improvises in Mixolydian: watch how often he lands on the ♭7 and the 3rd.' } },
      ],
    },
    {
      kind: 'learn', title: '3 · Where the colour note goes', blocks: [
        { p: 'A colour note is spice, not the main course. The way to use it:' },
        { list: [
          '**Land on chord tones**, pass through the colour note: in A Dorian, F♯ → E or F♯ → G sounds lovely; stopping on F♯ over Am7 is a choice (it\'s a 13th: sweet but unresolved).',
          '**Let the vamp help**: over the D chord, F♯ is the 3rd, so you can land on it. The colour note becomes a chord tone on the colour chord.',
          'In Mixolydian, the ♭7 (F) is a chord tone of G7 and the root of the F chord: land on it over F, pass through it over G.',
        ] },
        { video: { id: 'm0zLzVhTPYU', title: '6 Ways To Solo Over 4 "Simple" Chords [Dorian + Minor Modal Mixture]', note: 'Six options over one minor progression, from plain pentatonic to Dorian and beyond.' } },
      ],
    },
    {
      kind: 'learn', title: '4 · What mastery looks like', blocks: [
        { p: 'You own Dorian and Mixolydian when:' },
        { list: ['You can turn any minor pentatonic box into Dorian, and any major pentatonic box into Mixolydian, in a second.', 'You spot i – IV and I – ♭VII in songs by ear.', 'Over Am7 – D you land on F♯ when D comes and on C or E when Am7 comes back.', 'You can play both modes in at least three keys.'] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Start from the pentatonic, add the two notes.', examples: [
        { q: 'Spell E Dorian.', steps: ['E minor pentatonic: E G A B D.', 'Add the 9th (F♯) and the ♮6 (C♯).'], answer: 'E F♯ G A B C♯ D (the notes of D major).' },
        { q: 'Spell D Mixolydian.', steps: ['D major pentatonic: D E F♯ A B.', 'Add the 4th (G) and the ♭7 (C).'], answer: 'D E F♯ G A B C (the notes of G major).' },
        { q: 'A song goes Dm – G – Dm – G. Which mode, and which note is the colour?', steps: ['Minor home, major IV.', 'G\'s 3rd is B: the ♮6 of D.'], answer: 'D Dorian; B is the colour note.' },
        { q: 'A song goes A – G – D – A. Which mode?', steps: ['Major home (A).', 'G is a whole step below A: ♭VII.', 'G\'s root, G, is the ♭7 of A.'], answer: 'A Mixolydian.' },
        { q: 'Over a long Em7 vamp, which two notes turn the E minor pentatonic into Dorian?', steps: ['Dorian adds the 9th and ♮6.'], answer: 'F♯ and C♯.', spots: modeFig('', 4, MODE.dorian, 0, 4, [9, 2]) },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Dorian vs Aeolian: both minor; Dorian\'s 6th is a whole step **under** the ♭7 (F♯ – G), Aeolian\'s is a half step **above** the 5th (E – F). Mixolydian vs major: the 7th is a whole step under the root (F – G), not a half step (F♯ – G).' },
        { list: ['Loop Am7 – D and sing the F♯ when the D comes in.', 'Loop G – F and sing F over both chords: it\'s the ♭7 over G and the root over F.'] },
      ],
      drills: [
        { label: 'Hear it: which mode?', quiz: 'l8-mode-ear', minutes: 6 },
        { label: 'Which mode is the vamp?', quiz: 'l8-vamp', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Using Dorian over every minor chord.', right: 'Over the vi of a major key (Am in C) the 6th is F: that\'s Aeolian. Dorian fits when the key has a major IV (or the chord is a ii, like Dm7 in C).' },
        { wrong: 'Playing major-scale F♯ over G – F.', right: 'The F chord says F natural: Mixolydian.' },
        { wrong: 'Sitting on the colour note over the home chord until it sounds wrong.', right: 'Pass through it to a chord tone, or save the landing for the chord that contains it.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Over each vamp, say the chord as it changes and aim for one of its notes.',
      challenge: { label: 'Both modes, in three keys', ex: ex(DOR, 'dorian'), goal: 'then improvise over Am7 – D and G – F in Jam for two minutes each, landing the colour note on the colour chord every time; then move both to E (Em7 – A, E – D) with the Key menu', why: 'Hearing the colour note fall into place over the right chord is the goal.' },
      goals: [
        { focus: 'Dorian line', tasks: [{ label: 'A Dorian over Am7 – D', ex: ex(DOR, 'dorian'), minutes: 6, goal: 'clean at 84 BPM' }] },
        { focus: 'Mixolydian line', tasks: [{ label: 'G Mixolydian over G – F', ex: ex(MIX, 'mixo'), minutes: 6, goal: 'clean at 92 BPM' }] },
        { focus: 'Know the vamps', tasks: [{ label: 'Which mode is the vamp?', quiz: 'l8-vamp', minutes: 4, goal: '2 stars' }] },
        { focus: 'Solo over them', tasks: [{ label: 'Jam: a funk vamp in A minor (Dorian)', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['**Jam**: funk, soul and Latin styles are often Dorian: add F♯ to your A minor pentatonic over them. Rock, country and bluegrass in major are often Mixolydian.', '**Licks**: blues-rock licks are Mixolydian plus the blue ♭3; neo-soul licks love the Dorian ♮6.', '**Songbook**: fiddle tunes like Old Joe Clark are Mixolydian.'] },
      ],
      tasks: [{ label: 'Jam: Dorian and Mixolydian grooves', tool: 'jam', minutes: 10 }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Name them, hear them, play them, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Which mode is the vamp?', quiz: 'l8-vamp' },
        { skill: 'Hear', label: 'Hear it: which mode?', quiz: 'l8-mode-ear' },
        { skill: 'Play', label: 'A Dorian over Am7 – D (mic)', ex: ex(DOR, 'dorian') },
        { skill: 'Play', label: 'G Mixolydian over G – F (mic)', ex: ex(MIX, 'mixo') },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Dorian and Mixolydian". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) how Dorian and Mixolydian differ from minor and major, (2) how to build them from the pentatonic, (3) the chord that gives each away, (4) where to land the colour note. Ask me to spell E Dorian and A Mixolydian. Keep it short.',
        points: ['Dorian = minor with ♮6, Mixolydian = major with ♭7', 'minor pent + 9 + 6; major pent + 4 + ♭7', 'Dorian: major IV (Am – D); Mixolydian: ♭VII (G – F)', 'pass through it over the home chord, land on it over the chord that contains it'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'JFte7QHCC18', title: 'FOLLOW ALONG - Funk Jam Track for Lead Guitar in A Dorian' },
      books: [
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'The Dorian and Mixolydian chapters', why: 'Licks, positions and backing tracks for both.' },
        { book: 'Music Theory for Guitarists', where: 'The modes chapter', why: 'The theory side with progressions.' },
      ],
      blocks: [{ p: '**Next**: the outer modes: dreamy Lydian, dark Phrygian and unstable Locrian.' }],
    },
  ],
}

// ---- Lesson 3: Lydian, Phrygian, Locrian -----------------------------------------------------------------------
const LP = 'F Lydian over F – G/F (B is the ♯4), E Phrygian over Em – F (F is the ♭2), B Locrian over Bm7♭5 – C'
export const OUTER: CourseLesson = {
  id: 'c8-outer', level: 8, n: 3, title: 'Lydian, Phrygian and Locrian: the outer colours', minutes: 80,
  goal: 'Play and hear the brightest mode (Lydian), the darkest usable one (Phrygian) and the unstable one (Locrian), know the chord that gives each away, and use them in prog, film-score, flamenco and metal sounds.',
  builds: ['what modes really are', 'Dorian and Mixolydian'],
  topics: ['Lydian', 'Phrygian', 'Locrian', 'modes', 'metal', 'prog', 'flamenco'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'These three are the extremes of the brightness ladder, and that\'s why they\'re so recognisable. **Lydian** is the floating, wonder-filled sound of film scores, Joe Satriani\'s "Flying in a Blue Dream", Plini and Steve Vai. **Phrygian** is the dark, Spanish, menacing sound of flamenco and metal riffs (Metallica\'s "Wherever I May Roam"). **Locrian** is so unstable it\'s mostly used for tension: diminished riffs in metal and the vii chord of every key.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['play F Lydian, E Phrygian and B Locrian, and move them;', 'name their colour notes (♯4, ♭2, ♭5) and their giveaway chords;', 'write a riff or vamp in each.'] },
        { prog: { label: 'F – G/F (Lydian), then Em – F (Phrygian)', chords: [notes(F), notes(GoverF), notes(F), notes(GoverF), notes(Em), notes(F), notes(Em), notes(F)], gap: 0.8 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Lydian: major with a raised 4th', blocks: [
        { p: 'F Lydian: **F G A B C D E**. F major with B♭ raised to **B natural**. The plain 4th in major is the one note that clashes with the major 3rd (B♭ rubs against A). Raise it and every note sits comfortably over the chord: that\'s why Lydian sounds like it\'s floating.' },
        { p: 'The giveaway chord is the **major II**: a major chord a whole step **above** home (F – G, C – D, D – E). Its 3rd is the ♯4. Over a bass note that stays on the root (G/F, D/C) it\'s the classic film-score shimmer.' },
        { spots: modeFig('F Lydian, frets 0–4: the gold note is B, the ♯4.', 5, MODE.lydian, 0, 4, [6]) },
        { video: { id: 'Ou_Z9ol8r0I', title: 'Learn the Lydian Scale- How to write, riff, and solo in the 4th mode.', note: 'Writing, riffing and soloing in Lydian, with the II chord.' } },
      ],
    },
    {
      kind: 'learn', title: '2 · Phrygian: minor with a flat 2', blocks: [
        { p: 'E Phrygian: **E F G A B C D**. Natural minor with the 2nd lowered: the very first step is a **half step**, E to F. That half step above the root is the whole mood: dark, tense, Spanish, heavy.' },
        { p: 'The giveaway chord is the **♭II**: a major chord a half step above home (Em – F, Am – B♭). Metal riffs live on the low open E with F and the ♭2 shoved against it; flamenco uses the same move with a major home chord (lesson 5).' },
        { spots: modeFig('E Phrygian, open position: the gold note is F, the ♭2, one fret above the open E.', 4, MODE.phrygian, 0, 4, [1]) },
        { video: { id: 'ZnoKgWnMEq8', title: 'PHRYGIAN - Understanding and Using the Third Mode of Major', note: 'Jake on Phrygian: its sound, its chords and where you\'ve heard it.' } },
      ],
    },
    {
      kind: 'learn', title: '3 · Locrian: the unstable one', blocks: [
        { p: 'B Locrian: **B C D E F G A**. Both the 2nd and the 5th are flat. With a ♭5, the home triad (B D F) is **diminished**: there\'s nowhere to rest, so the ear wants to move to C.' },
        { p: 'You\'ll use Locrian in two ways: as **the scale over a m7♭5 chord** (Bm7♭5, the vii of C, or the ii of A minor: lesson 8), and in **metal**, where riffs pedal on the low root and hammer the ♭2 and ♭5 for menace.' },
        { spots: modeFig('B Locrian, frets 1–5: the gold note is F, the ♭5.', 11, MODE.locrian, 1, 5, [6]) },
        { video: { id: 'RhKXolkwyDM', title: 'Making Music with Pascal\'s Triangle + the LOCRIAN scale [RIFFING WITH MODES #7]', note: 'Jake writes a whole piece in Locrian: listen for how he handles the missing 5th.' } },
      ],
    },
    {
      kind: 'learn', title: '4 · What mastery looks like', blocks: [
        { p: 'You own the outer modes when:' },
        { list: ['You can spell Lydian, Phrygian and Locrian on any root from major or minor with one change.', 'You hear the ♯4 shimmer and the ♭2 menace instantly.', 'You can write a two-chord vamp in Lydian (I – II) and in Phrygian (i – ♭II).', 'You know Locrian is the m7♭5 scale.'] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'One change from major or minor.', examples: [
        { q: 'Spell C Lydian.', steps: ['C major: C D E F G A B.', 'Raise the 4th: F → F♯.'], answer: 'C D E F♯ G A B (the notes of G major).' },
        { q: 'Spell A Phrygian.', steps: ['A natural minor: A B C D E F G.', 'Lower the 2nd: B → B♭.'], answer: 'A B♭ C D E F G (the notes of F major).' },
        { q: 'What is the Lydian II chord in D?', steps: ['A whole step above D is E.', 'E major: E G♯ B. G♯ is the ♯4 of D.'], answer: 'E major (D – E).' },
        { q: 'A metal riff chugs on the low E and keeps hitting F and B♭. Which mode?', steps: ['F = ♭2, B♭ = ♭5 over E.'], answer: 'E Locrian (the ♭2 and the ♭5 together).' },
        { q: 'What scale fits Bm7♭5 in C major?', steps: ['Bm7♭5 is the vii of C.', 'C major from B = Locrian.'], answer: 'B Locrian.', spots: modeFig('', 11, MODE.locrian, 1, 5, [6]) },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Lydian: major, and the 4th sounds raised, bright, almost unresolved. Phrygian: minor, and the first step up is tiny. Locrian: there\'s no 5th above the root, so even the home note sounds uneasy.' },
        { list: ['Hold an open E string and play F – E, F – E: that\'s Phrygian in two notes.', 'Strum C, then play C D E F♯ G: hear the F♯ lift.'] },
      ],
      drills: [
        { label: 'Hear it: which mode?', quiz: 'l8-mode-ear', minutes: 6 },
        { label: 'The colour note of a mode', quiz: 'l8-colour', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Using Lydian over a chord with the plain 4th in the melody or a sus4.', right: 'Lydian\'s ♯4 clashes with a 4th in the chord. Use it over major and maj7 chords.' },
        { wrong: 'Thinking Phrygian means "Spanish".', right: 'Spanish flamenco is mostly Phrygian dominant (lesson 5), with a major 3rd. Plain Phrygian is darker and minor.' },
        { wrong: 'Trying to resolve a song to a Locrian home chord.', right: 'Locrian is for tension and for m7♭5 chords. Its home chord won\'t settle.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Name the colour note as it comes up.',
      challenge: { label: 'Write in the outer modes', ex: ex(LP, 'lydPhry'), goal: 'then write and loop your own two-chord vamp in Lydian (I – II) and in Phrygian (i – ♭II) in the Looper, and improvise a melody over each that lands on the colour note', why: 'Writing in a mode proves you hear it.' },
      goals: [
        { focus: 'Play the three', tasks: [{ label: 'Lydian, Phrygian and Locrian lines', ex: ex(LP, 'lydPhry'), minutes: 8, goal: 'clean at 80 BPM' }] },
        { focus: 'Colour notes', tasks: [{ label: 'The colour note of a mode', quiz: 'l8-colour', minutes: 5, goal: '2 stars' }] },
        { focus: 'Parent scales', tasks: [{ label: 'Which major scale is the mode from?', quiz: 'l8-parent', minutes: 4 }] },
        { focus: 'Hear them', tasks: [{ label: 'Hear it: which mode?', quiz: 'l8-mode-ear', minutes: 5, goal: '2 stars' }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['**Prog and film**: over a major chord that rings for a long time, try the ♯4 instead of the 4th.', '**Metal**: low-string riffs on the open E with F (♭2) and B♭ (♭5) are Phrygian and Locrian riffs.', '**Looper**: loop Em – F and play E Phrygian over it.'] },
      ],
      tasks: [{ label: 'Looper or Jam: a Phrygian vamp', tool: 'jam', minutes: 8 }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Name them, hear them, play them, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'The colour note of a mode', quiz: 'l8-colour' },
        { skill: 'Hear', label: 'Hear it: which mode?', quiz: 'l8-mode-ear' },
        { skill: 'Play', label: 'Lydian, Phrygian and Locrian (mic)', ex: ex(LP, 'lydPhry') },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Lydian, Phrygian and Locrian". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) the one change from major or minor for each, (2) their giveaway chords, (3) why Locrian doesn\'t work as a home, (4) where each is used in real music. Ask me to spell D Lydian and B Phrygian. Keep it short.',
        points: ['Lydian = major ♯4, Phrygian = minor ♭2, Locrian = ♭2 and ♭5', 'Lydian: major II (F – G); Phrygian: ♭II (Em – F)', 'Locrian\'s home triad is diminished: no perfect 5th', 'film/prog for Lydian, metal/flamenco for Phrygian, m7♭5 and metal tension for Locrian'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'i7ByTjkRJFY', title: '7 MODES - 7 MUSICIANS - 7 STYLES [DEMO + LESSON]' },
      books: [
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'The Lydian, Phrygian and Locrian chapters', why: 'Positions, licks and how to hear each mode.' },
        { book: 'Music Theory for Guitarists', where: 'The modes chapter', why: 'The chords of each mode.' },
      ],
      blocks: [{ p: '**Next**: how modal songs are built: vamps and colour chords.' }],
    },
  ],
}

// ---- Lesson 4: modal vamps and their colour chords -------------------------------------------------------------
const VAMPS = 'Five modal vamps: Dorian Am7 – D, Mixolydian G – F, Lydian F – G/F, Phrygian Em – F, Aeolian Am – F – G'
export const VAMPS_L: CourseLesson = {
  id: 'c8-vamps', level: 8, n: 4, title: 'Modal vamps and their colour chords', minutes: 75,
  goal: 'Build a progression that sounds like a mode (home chord + the chord holding the colour note, no pull to the parent key), recognise modal vamps in songs, and write your own in all six usable modes.',
  builds: ['Dorian and Mixolydian', 'Lydian, Phrygian and Locrian', 'cadences'],
  topics: ['modes', 'vamps', 'chord progressions', 'songwriting', 'modal harmony'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'A scale alone doesn\'t make a mode: the **chords** do. Songs in modes are built on short loops (vamps) that make one root feel like home and keep sounding the colour note. Learn the recipe and you can write in any mode, and hear what mode a song is in from its chords alone.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['name the colour chord of each mode;', 'build a modal vamp and avoid the parent key\'s pull;', 'recognise vamps in songs and name the mode;', 'improvise over all five vamps in this lesson.'] },
        { prog: { label: 'Am7 – D, G – F, F – G/F, Em – F, Am – F – G', chords: [notes(Am7), notes(D), notes(Gc), notes(F), notes(F), notes(GoverF), notes(Em), notes(F), notes(Am), notes(F), notes(Gc), notes(Am)], gap: 0.7 } },
      ],
    },
    {
      kind: 'learn', title: '1 · The recipe: home + the colour chord', blocks: [
        { p: 'Take the mode\'s chords (they\'re the parent key\'s chords). Pick the home chord, then the chord that **contains the colour note**. Loop them.' },
        { list: [
          '**Dorian**: i – **IV** (Am – D; F♯ is D\'s 3rd). Also i – ii (Am – Bm).',
          '**Mixolydian**: I – **♭VII** (G – F; F is its root). Also I – v (G – Dm).',
          '**Lydian**: I – **II** (F – G; B is G\'s 3rd). Over a pedal: F – G/F.',
          '**Phrygian**: i – **♭II** (Em – F; F is its root). Also i – ♭vii (Em – Dm).',
          '**Aeolian**: i – **♭VI** – ♭VII (Am – F – G; F holds the ♭6).',
          '**Ionian**: I – IV – V: here the V → I pull is the point.',
        ] },
        { spots: modeFig('A Dorian, frets 4–8: over the D chord, the gold F♯ and A are D\'s 3rd and 5th.', 9, MODE.dorian, 4, 8, [9]) },
      ],
    },
    {
      kind: 'learn', title: '2 · Keep the parent key out', blocks: [
        { p: 'The danger in modal writing: the parent key\'s **V → I** (G7 → C for all the modes of C). Play it and the ear decides the key is C, whatever you meant.' },
        { list: ['Avoid the parent key\'s V7 chord (and its tritone).', 'Keep the loop short: two or three chords, back to home often.', 'Use a pedal or drone in the bass (G/F, D/C).', 'Use the colour chord more than any other.'] },
        { p: 'Many real songs mix modes on purpose: a verse in Mixolydian, a chorus in plain major, or Dorian borrowing from Aeolian (modal mixture). Hear it as colour moving, not as rule-breaking.' },
        { video: { id: 'sC2qXLnVU3A', title: 'Demonstrating 7 Ways that Composers Make Music Using Modes', note: 'Seven ways real writers make modes sound: vamps, pedals, melodies and more.' } },
      ],
    },
    {
      kind: 'learn', title: '3 · Soloing over a vamp', blocks: [
        { p: 'Over a modal vamp, you don\'t change scales when the chord changes: **the mode stays**. What changes is which notes you **land** on.' },
        { list: ['Over the home chord: land on its root, 3rd or 5th, pass through the colour note.', 'Over the colour chord: land on the colour note. Now it\'s a chord tone.', 'Start with the pentatonic, add the colour note once per phrase, then more.'] },
        { video: { id: 'i7ByTjkRJFY', title: '7 MODES - 7 MUSICIANS - 7 STYLES [DEMO + LESSON]', note: 'One vamp-style piece in each mode, in seven different styles.' } },
      ],
    },
    {
      kind: 'learn', title: '4 · What mastery looks like', blocks: [
        { p: 'You own modal vamps when:' },
        { list: ['You can write a vamp in any of the six usable modes on any root.', 'You name the mode of a two-chord loop at once (Bm – A? Aeolian or Dorian: check for G or G♯).', 'Your solos land the colour note over the colour chord.'] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Home chord first, then find the colour chord.', examples: [
        { q: 'Write a Dorian vamp on E.', steps: ['E Dorian = the notes of D major.', 'i = Em, IV = A (C♯ is the ♮6).'], answer: 'Em – A (or Em7 – A).' },
        { q: 'Write a Mixolydian vamp on D.', steps: ['♭VII of D = C.'], answer: 'D – C (or D – C – G – D).' },
        { q: 'Write a Lydian vamp on C.', steps: ['II of C = D major (F♯ is the ♯4).', 'Keep C in the bass.'], answer: 'C – D/C.' },
        { q: 'A loop goes Bm – A – G – A. Dorian or Aeolian?', steps: ['B is home (minor).', 'G major has G natural: the ♭6 of B.'], answer: 'B Aeolian (Dorian would have G♯).' },
        { q: 'Why does Dm7 – G7 – Cmaj7 not sound like D Dorian?', steps: ['G7 → Cmaj7 is the V → I of C.', 'The ear hears C as home.'], answer: 'It\'s a ii – V – I in C; Dorian needs Dm7 to stay home (Dm7 – G without the pull to C).' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Loop each vamp and ask: where is home, and what colour does the second chord add? Then switch to the next vamp without stopping and feel the mood change.' },
      ],
      drills: [
        { label: 'Which mode is the vamp?', quiz: 'l8-vamp', minutes: 5, goal: '8 out of 10' },
        { label: 'Hear it: which mode?', quiz: 'l8-mode-ear', minutes: 5 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Changing scale on every chord of a modal vamp.', right: 'The mode stays. Change the note you land on.' },
        { wrong: 'Adding the parent key\'s V7 to "spice up" a modal vamp.', right: 'It turns the mode into the parent key. Use the colour chord instead.' },
        { wrong: 'Assuming every two-chord minor loop is Dorian.', right: 'Check the 6th: a ♭VI chord (or a ♭6 in the melody) makes it Aeolian.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Name the mode before each vamp starts.',
      challenge: { label: 'Write six vamps', ex: ex(VAMPS, 'vamps'), goal: 'then write your own vamp in each of the six usable modes on D, loop each one in the Looper for 8 bars and improvise over it, landing the colour note on the colour chord', why: 'Six vamps on one root is the whole brightness ladder under your fingers.' },
      goals: [
        { focus: 'Play the vamps', tasks: [{ label: 'Five modal vamps', ex: ex(VAMPS, 'vamps'), minutes: 6 }] },
        { focus: 'Name them', tasks: [{ label: 'Which mode is the vamp?', quiz: 'l8-vamp', minutes: 5, goal: '2 stars' }] },
        { focus: 'Solo over one', tasks: [{ label: 'Jam: loop Am7 – D and solo in A Dorian', tool: 'jam', minutes: 8 }] },
        { focus: 'And another', tasks: [{ label: 'Jam: loop G – F and solo in G Mixolydian', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['**Looper**: record a vamp, then a bass line on the root, then solo over it.', '**Songwriting**: write a verse in Mixolydian (I – ♭VII) and a chorus in major (IV – V – I): the chorus lifts.', '**Songs**: name the mode of the main loop of five songs you love.'] },
      ],
      tasks: [{ label: 'Looper: your own modal vamp', tool: 'jam', minutes: 10 }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Name them, hear them, play them, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Which mode is the vamp?', quiz: 'l8-vamp' },
        { skill: 'Hear', label: 'Hear it: which mode?', quiz: 'l8-mode-ear' },
        { skill: 'Play', label: 'Five modal vamps (mic)', ex: ex(VAMPS, 'vamps') },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Modal vamps and their colour chords". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) the recipe for a modal vamp, (2) the colour chord of each mode, (3) what destroys a mode, (4) how to solo over a vamp. Give me two loops and ask me to name the mode. Keep it short.',
        points: ['home chord + the chord holding the colour note, looped', 'Dor i–IV, Mix I–♭VII, Lyd I–II, Phr i–♭II, Aeo i–♭VI–♭VII', 'the parent key\'s V → I', 'keep the mode; land on the colour note over the colour chord'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'sC2qXLnVU3A', title: 'Demonstrating 7 Ways that Composers Make Music Using Modes' },
      books: [
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'Modal progressions', why: 'More vamps and how to write with them.' },
        { book: 'Music Theory for Guitarists', where: 'The modes chapter, on modal harmony', why: 'Which chords keep each mode alive.' },
      ],
      blocks: [{ p: '**Next**: beyond the major scale: harmonic minor and the Phrygian dominant sound.' }],
    },
  ],
}

// ---- Lesson 5: harmonic minor and Phrygian dominant ------------------------------------------------------------
const PD = 'E Phrygian dominant (A harmonic minor from E): a low pedal riff over E, then up through E7 into Am'
export const HARMONIC: CourseLesson = {
  id: 'c8-harmonic', level: 8, n: 5, title: 'Harmonic minor and Phrygian dominant', minutes: 80,
  goal: 'Use harmonic minor as a set of modes, above all the 5th mode (Phrygian dominant) over the V7 of a minor key and as the flamenco and metal sound, and hear its augmented 2nd.',
  builds: ['harmonic and melodic minor in minor keys', 'Lydian, Phrygian and Locrian', 'cadences'],
  topics: ['harmonic minor', 'Phrygian dominant', 'modes', 'flamenco', 'metal', 'neoclassical'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Level 7 used harmonic minor for one job: the G♯ over E7 in A minor. Start the same notes on **E** instead and you get **Phrygian dominant**: E F G♯ A B C D. It\'s the sound of flamenco, of Middle-Eastern and klezmer melodies, of neoclassical shred (Yngwie Malmsteen) and countless metal riffs.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['play E Phrygian dominant and know it\'s A harmonic minor from E;', 'use it over the V7 of a minor key (E7 → Am);', 'write the flamenco/metal vamp (E – F – E);', 'know the other useful modes of harmonic minor.'] },
        { prog: { label: 'Am – E7 – Am, then E – F – E (the Andalusian sound)', chords: [notes(Am), notes(E7), notes(Am), notes(Am), [40, 47, 52, 56, 59, 64], notes(F), [40, 47, 52, 56, 59, 64]], gap: 0.8 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Phrygian dominant: Phrygian with a major 3rd', blocks: [
        { p: 'E Phrygian dominant: **E F G♯ A B C D**. Compare E Phrygian (E F G A B C D): only the 3rd changes, G → G♯. So it has the dark ♭2 **and** a major 3rd, with a wide gap between them (F to G♯, three frets: an augmented 2nd).' },
        { p: 'Its chord tones are E G♯ B D: an **E7**. Add the F and C on top and you get E7♭9♭13: the most tense dominant there is, aching to resolve to Am.' },
        { spots: modeFig('E Phrygian dominant, open position: the gold notes are F (♭2) and G♯ (the major 3rd); the gap between them is the sound.', 4, MODE.phrygianDominant, 0, 4, [1, 4]) },
        { video: { id: 'aCZezZf9bi0', title: 'Writing Exotic Music with Phrygian Dominant- 5th mode of Harmonic Minor', note: 'Jake writes with Phrygian dominant: the chords it gives and how to keep it sounding exotic.' } },
      ],
    },
    {
      kind: 'learn', title: '2 · Two ways to use it', blocks: [
        { list: [
          '**Over V7 in a minor key**: over E7 in A minor, play E Phrygian dominant (it\'s just A harmonic minor). Land on G♯ or B, resolve to A or C on the Am.',
          '**As a home**: make E the root. E – F – E (I – ♭II – I), or the Andalusian cadence Am – G – F – E. The major E chord with the ♭2 above it is the flamenco sound; with distortion and a low E pedal it\'s metal.',
        ] },
        { p: 'Over the home E chord, the augmented 2nd (F – G♯) and the ♭6 (C) do the talking. Play them slowly at first: the gap is easy to rush.' },
        { video: { id: 'UkGIfrdMgTA', title: 'Getting Started with Harmonic Minor-Leads and Jamming', note: 'Leads in harmonic minor over a jam: the G♯ over the V, then as a home sound.' } },
      ],
    },
    {
      kind: 'learn', title: '3 · The other modes of harmonic minor', blocks: [
        { p: 'Harmonic minor has seven modes like the major scale. Three are worth knowing now:' },
        { list: [
          '**1 · Harmonic minor** (A B C D E F G♯): over Am(maj7), and as the minor key with its strong V.',
          '**5 · Phrygian dominant** (E F G♯ A B C D): over E7♭9, flamenco, metal.',
          '**7 · Altered diminished** (G♯ A B C D E F): over G♯dim7 = the "fully diminished" sound of E7♭9 without its root.',
        ] },
        { p: 'And a fourth for the curious: **Lydian ♯2** (the 6th mode, on F: F G♯ A B C D E), the dreamy-dark sound of some film scores.' },
        { spots: modeFig('A harmonic minor, frets 4–8: the gold note is G♯, the raised 7th. Start this shape on its E and you\'re in Phrygian dominant.', 9, MODE.harmonicMinor, 4, 8, [11]) },
      ],
    },
    {
      kind: 'learn', title: '4 · What mastery looks like', blocks: [
        { p: 'You own harmonic minor\'s colours when:' },
        { list: ['You find Phrygian dominant on any root (a minor key\'s 5th, or Phrygian with a major 3rd).', 'Over i – V7 you switch to the raised 7th on the V without thinking.', 'You can play an E – F – E riff and a phrase that uses the augmented 2nd cleanly.', 'You hear the difference between Phrygian and Phrygian dominant.'] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Find the minor key, then start on its 5th.', examples: [
        { q: 'Spell A Phrygian dominant.', steps: ['A is the 5th of D minor.', 'D harmonic minor: D E F G A B♭ C♯.', 'From A: A B♭ C♯ D E F G.'], answer: 'A B♭ C♯ D E F G.' },
        { q: 'Which scale fits B7 → Em?', steps: ['B7 is the V7 of E minor.', 'E harmonic minor from B.'], answer: 'B Phrygian dominant (B C D♯ E F♯ G A).' },
        { q: 'What makes E Phrygian dominant different from E Phrygian?', steps: ['Phrygian: E F G…', 'Phrygian dominant: E F G♯…'], answer: 'The 3rd: G♯ instead of G (major instead of minor).' },
        { q: 'Name the chords of the Andalusian cadence in A minor.', steps: ['i – ♭VII – ♭VI – V.'], answer: 'Am – G – F – E (with E Phrygian dominant over the E).' },
        { q: 'Over E7♭9, which two notes give the ♭9 and ♭13?', steps: ['♭9 of E = F, ♭13 of E = C.'], answer: 'F and C (both in A harmonic minor).', spots: modeFig('', 4, MODE.phrygianDominant, 0, 4, [1, 8], true) },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Listen for the gap: the jump of three frets between the ♭2 and the 3rd (F – G♯) or the ♭6 and the 7th (F – G♯ in A harmonic minor). Nothing else in the major-scale world sounds like it.' },
        { list: ['Play F – G♯ – A slowly, then F – G – A: the first is harmonic minor, the second natural.'] },
      ],
      drills: [
        { label: 'Hear it: which scale?', quiz: 'l3-scale-ear', minutes: 4 },
        { label: 'What to play over the chord', quiz: 'l8-chordscale', minutes: 5 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Using harmonic minor over the whole of a minor song.', right: 'Its G♯ clashes with G chords and Am7. Use it over the V (and as a deliberate home sound).' },
        { wrong: 'Calling Phrygian dominant "a different scale to learn".', right: 'It\'s harmonic minor from the 5th: the same shape you know, a new home.' },
        { wrong: 'Overusing the augmented 2nd until everything sounds like a cliché.', right: 'Use it at phrase peaks and resolve it; mix in the plain minor sound elsewhere.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Say "Phrygian dominant" over E and "harmonic minor" over Am: same notes, different home.',
      challenge: { label: 'Phrygian dominant in two keys', ex: ex(PD, 'phrygDom'), goal: 'then improvise over Am – G – F – E in Jam, switching to G♯ on the E chord, and move the riff to A (A – B♭ – A) with the Key menu', why: 'A new key and a real progression make it yours.' },
      goals: [
        { focus: 'The riff and the run', tasks: [{ label: 'E Phrygian dominant', ex: ex(PD, 'phrygDom'), minutes: 6, goal: 'clean at 96 BPM' }] },
        { focus: 'Know when', tasks: [{ label: 'What to play over the chord', quiz: 'l8-chordscale', minutes: 5, goal: '2 stars' }] },
        { focus: 'Minor keys, refreshed', tasks: [{ label: 'The three minor scales', ex: { label: 'A natural, harmonic and melodic minor, up and back (listen to the 6th and 7th)', tab: 'minorScales' }, minutes: 5 }] },
        { focus: 'Over a progression', tasks: [{ label: 'Jam: Am – G – F – E (Andalusian)', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['**Metal**: low E pedal riffs with F and G♯; harmonic-minor runs over E7 in Am.', '**Flamenco feel**: E – F – E with a strummed rasgueado.', '**Licks**: neoclassical and heavy metal licks use these runs: try them over E7 → Am.'] },
      ],
      tasks: [{ label: 'Jam: minor key with the Phrygian dominant V', tool: 'jam', minutes: 10 }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Name them, hear them, play them, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'What to play over the chord', quiz: 'l8-chordscale' },
        { skill: 'Hear', label: 'Hear it: which scale?', quiz: 'l3-scale-ear' },
        { skill: 'Play', label: 'E Phrygian dominant (mic)', ex: ex(PD, 'phrygDom') },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Harmonic minor and Phrygian dominant". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) how Phrygian dominant relates to harmonic minor, (2) how it differs from Phrygian, (3) the two ways to use it, (4) the augmented 2nd. Ask me to find the Phrygian dominant for B7 → Em. Keep it short.',
        points: ['the 5th mode of harmonic minor (A harmonic minor from E)', 'major 3rd instead of minor (G♯)', 'over V7 in a minor key; as a home (E – F – E, Andalusian cadence)', 'the three-fret gap between ♭2 and 3 (or ♭6 and 7)'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'qk8uobP4uJE', title: 'Demonstrating The Modes of Harmonic Minor' },
      books: [
        { book: 'Music Theory for Guitarists', where: 'The harmonic minor chapter', why: 'All seven modes with their chords.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'Harmonic minor and its modes', why: 'Positions and licks.' },
      ],
      blocks: [{ p: '**Next**: melodic minor, the jazz player\'s secret: Lydian dominant and the altered scale.' }],
    },
  ],
}

export const LEVEL8_A: CourseLesson[] = [MODES, DORMIX, OUTER, VAMPS_L, HARMONIC]
void C; void Bm7b5
