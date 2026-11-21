// Level 5 (Chords in depth), lessons 5–8 and the mastery check: extensions (9, 11, 13), altered dominants, slash chords
// and bass lines, and voice leading with guide tones. Grips checked note by note on a standard-tuned guitar (low E first):
//   C7 x3231x · C9 x32333 · C13 8x8 9 10x · A13 5x567x · Cmaj7 x324xx · Cmaj9 x3243x · Cm7 x313xx · Cm9 x3133x · Cm11 8x886x
//   E9 x76777 · G7 3x343x · G7♭9 3x3434 · A7♭9 5x5656 · G7♯9 x 10 9 10 11 x · G7♯5 3x344x · E7♯9 0767 8x
//   C x32010 · G/B x20033 · Am x02210 · Am/G 302210 · F 133211 · C/E 032010 · Dm7 xx0211 · G 320003
//   D xx0232 · D/C x30232 · Gm/B♭ x10033 · D/A x00232 · D/F♯ 2x0232 · C/G 332010
//   I – vi – ii – V drop 2: Cmaj7 xx10 12 12 12 · Am7 xx10 12 10 12 · Dm7 xx10 10 10 10 · G7 xx9 10 8 10 · Cmaj7 xx9988 ·
//   Am7 xx7988 · Dm7 xx7768 · G7 xx5767 · Cmaj7 xx5557
import type { CourseLesson } from './types'
import { gripMarks, type Quality } from './l5Tabs'

const G = [40, 45, 50, 55, 59, 64]
const notes = (frets: number[]) => frets.flatMap((f, i) => (f < 0 ? [] : [G[i] + f]))
const fig = (caption: string, root: number, q: Quality, frets: number[], near = 3, bass?: number) =>
  ({ caption, from: 0, to: 13, marks: (m: number[]) => gripMarks(m, root, q, frets, near, bass) })
const ex = (root: number, q: Quality, frets: number[], near = 3, bass?: number) => fig('', root, q, frets, near, bass)

// ---- Lesson 5: extensions ------------------------------------------------------------------------------------------
export const EXTENSIONS: CourseLesson = {
  id: 'c5-ext', level: 5, n: 5, title: 'Extensions: 9ths, 11ths and 13ths', minutes: 85,
  goal: 'Build 9, maj9, m9, m11 and 13 chords by stacking 3rds past the 7th, know which extension goes on which chord (and why the 11 avoids major chords), play them with the 5th (and often the root) left out, and use them for funk, soul, jazz and blues.',
  builds: ['seventh chords', 'the 7th chords of a key', 'sus and add chords'],
  topics: ['extended chords', '9th chords', '11th chords', '13th chords', 'funk', 'neo-soul', 'jazz', 'blues'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Keep stacking 3rds past the 7th and you reach the **9th**, **11th** and **13th**. These are the **extensions**: the rich, glossy sound of soul, neo-soul, R&B, funk and jazz. A plain C7 is bluesy; C9 is funky; C13 is the big-band and Texas-blues sound. Cmaj9 and Am11 are the warm pads under a thousand neo-soul songs.' },
        { p: 'You already know the notes: the 9th is the 2nd, the 11th is the 4th, the 13th is the 6th, just an octave higher. What\'s new is **which chord takes which extension**, and **what to leave out** so a six-string guitar can play a chord that could have seven notes.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['spell 9, maj9, m9, m11 and 13 chords from any root;', 'say which extensions sound good on major, minor and dominant chords;', 'play each with the 5th (and sometimes the root) left out;', 'play the E9 funk vamp and dominant 9 and 13 chords in a blues;', 'tell add9 from 9, and 6 from 13.'] },
        { prog: { label: 'C7 → C9 → C13: the same chord, richer each time', chords: [notes([-1, 3, 2, 3, 1, -1]), notes([-1, 3, 2, 3, 3, 3]), notes([8, -1, 8, 9, 10, -1])], gap: 1.3 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Stacking past the 7th', blocks: [
        { p: 'From C, stack 3rds using the notes of the chord\'s scale: **C E G B♭ D F A**. That\'s **1 3 5 ♭7 9 11 13**. After the 13th the next 3rd is C again: the stack has used all seven notes.' },
        { list: ['**9** = the 2nd, an octave up (D over C).', '**11** = the 4th, an octave up (F over C).', '**13** = the 6th, an octave up (A over C).'] },
        { p: 'A chord named with an extension **includes the 7th**, and the extensions below it in principle:' },
        { list: [
          '**C9** = C E G B♭ D (dominant 7 + 9).',
          '**Cmaj9** = C E G B D (maj7 + 9).',
          '**Cm9** = C E♭ G B♭ D (m7 + 9).',
          '**Cm11** = C E♭ G B♭ (D) F (m7 + 11, the 9 optional).',
          '**C13** = C E G B♭ (D) A (dominant 7 + 13; the 9 optional, the 11 left out).',
        ] },
        { tip: 'Compare with lesson 4: **add9** has no 7th, **6** has no 7th. Cadd9 = C E G D; C9 = C E G B♭ D. C6 = C E G A; C13 = C E G B♭ A. The 7th is what makes it an extension.' },
      ],
    },
    {
      kind: 'learn', title: '2 · What goes where', blocks: [
        { p: 'Not every extension fits every chord. The rule is about **half steps**: an extension a half step above a chord tone (a ♭9 interval) rubs hard. So:' },
        { list: [
          '**Major chords (maj7)**: the **9** sounds lovely (Cmaj9). The **11** clashes: F is a half step above E, the 3rd. Use **♯11** instead (Cmaj7♯11, the Lydian sound of Level 8). The **13** (6) is fine.',
          '**Minor chords (m7)**: the **9** and the **11** both sound great (Cm9, Cm11): F is a whole step above E♭, no rub. The 11 is the classic minor extension. The 13 is used less.',
          '**Dominant chords (7)**: the **9** and **13** are the natural extensions (C9, C13). The 11 clashes with the 3rd unless you drop the 3rd: then you have **C9sus4** (C F B♭ D), the "11 chord" of soul and gospel.',
        ] },
        { p: 'In a key, the chords take the extensions that stay inside the key. In C, Dm7 can be **Dm9** or **Dm11**, G7 can be **G9** or **G13**, Cmaj7 can be **Cmaj9**. That\'s the whole jazz and soul sound of a ii – V – I: **Dm9 – G13 – Cmaj9**.' },
      ],
    },
    {
      kind: 'learn', title: '3 · Leaving notes out', blocks: [
        { p: 'A C13 has up to seven notes; you have six strings and four fingers. The order of what to drop:' },
        { list: ['**The 5th** goes first (it adds nothing).', '**The root** goes next when a bass player has it.', '**The 11** goes from dominant 13 chords.', '**The 9** is optional in 11 and 13 chords.', '**Never** drop the 3rd or the 7th: they say what the chord is.'] },
        { p: 'The guitar grips that come out of this:' },
        { list: ['**C9** x 3 2 3 3 3 (R 3 ♭7 9 5).', '**C13** 8 x 8 9 10 (R ♭7 3 13): the 5th and 9th gone.', '**Cmaj9** x 3 2 4 3 (R 3 7 9).', '**Cm9** x 3 1 3 3 (R ♭3 ♭7 9).', '**Cm11** 8 x 8 8 6 (R ♭7 ♭3 11).'] },
        { spots: fig('C13 (8 x 8 9 10): root, ♭7, 3rd and the 13 (A) on the B string. No 5th, no 9th, and it sounds complete.', 0, 'dom13', [8, -1, 8, 9, 10, -1], 8) },
        { spots: fig('Cmaj9 (x 3 2 4 3): the maj7 shell with the 9 (D) on top.', 0, 'maj9', [-1, 3, 2, 4, 3, -1], 3) },
      ],
    },
    {
      kind: 'learn', title: '4 · Funk, soul and blues', blocks: [
        { p: '**Funk** lives on dominant 9th chords. The **E9** at **x 7 6 7 7 7** is the funk grip: slide into it from a fret below, stab short sixteenths, mute between them. Move it anywhere: the root is on the A string.' },
        { spots: fig('E9 (x 7 6 7 7 7): R, 3, ♭7, 9, 5. The funk chord.', 4, 'dom9', [-1, 7, 6, 7, 7, 7], 7) },
        { p: '**Blues** uses 9 and 13 chords in place of plain 7ths for a richer, jazzier shuffle: A9 – D9 – E9, or A13 – D13 – E13 (move the C13 shape: A13 = 5 x 5 6 7).' },
        { p: '**Soul and neo-soul** lean on maj9, m9 and m11: Fmaj9 – Em9 – Dm9 – Cmaj9, with a soft thumb or fingers. The extensions make the chords sound blurred and warm, like an electric piano.' },
        { video: { id: 'OAZm0FjYyPc', title: 'Cory Wong Funk Guitar Lesson', note: 'Dominant 9th chords, sixteenth-note stabs and muting: section 4 in action.' } },
      ],
    },
    {
      kind: 'learn', title: '5 · What mastery looks like', blocks: [
        { p: 'You own extensions when:' },
        { list: [
          'You can **spell** a 9, maj9, m9, m11 and 13 on any root.',
          'You can say which extensions go on major, minor and dominant chords, and **why** the natural 11 avoids major.',
          'You can play the grips above on **three roots each**, and Dm9 – G13 – Cmaj9.',
          'You can play the **E9 funk vamp** in time, with clean mutes, at 90 BPM.',
          'You can hear the difference between a 7 and a 9, and a 6 and a 13.',
        ] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Spell the 7th chord, then keep stacking 3rds.', examples: [
        { q: 'Spell G9.', steps: ['G7: G B D F.', 'One more 3rd above F: A.'], answer: 'G B D F A.' },
        { q: 'Spell Dm11, then say which notes you\'d play on guitar.', steps: ['Dm7: D F A C; add the 9 (E) and the 11 (G).', 'Drop the 5th (A) and the 9 (E).'], answer: 'D F A C E G; on guitar D, C, F, G (R ♭7 ♭3 11).' },
        { q: 'Why does "Cmaj11" almost never appear on a chart?', steps: ['The 11 of C is F.', 'F is a half step above the 3rd, E: a ♭9 rub.'], answer: 'The natural 11 clashes with the major 3rd. Players use Cmaj7♯11 (F♯) or a sus chord instead.' },
        { q: 'Play A13.', steps: ['C13 is 8 x 8 9 10 with the root on the 6th string.', 'A is 3 frets lower.'], answer: '5 x 5 6 7: A, G, C♯, F♯.', spots: ex(9, 'dom13', [5, -1, 5, 6, 7, -1], 5) },
        { q: 'Turn Dm7 – G7 – Cmaj7 into the soul version.', steps: ['ii takes the 9 (or 11), V the 9 or 13, I the 9.'], answer: 'Dm9 – G13 – Cmaj9.' },
        { q: 'C6 or C13? The chord has C, E, B♭ and A.', steps: ['A 6 chord has no 7th.', 'B♭ is the ♭7, so it\'s a dominant chord with the 13.'], answer: 'C13.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Extensions sound like **colour on top** of a chord you already know. Hear the 7th chord first, then the extension as a note floating above it. The 9 sounds bright and open, the 11 on a minor chord sounds airy and modern, the 13 on a dominant sounds sweet and bluesy.' },
        { list: ['Play C7 then C9: sing the D on top.', 'Play Cm7 then Cm11: sing the F.', 'Play the E9 vamp and listen to the 9 (F♯) on the B string: that\'s the funk.'] },
      ],
      drills: [
        { label: 'Hear it: which 7th chord?', quiz: 'l5-7ths-ear', minutes: 4 },
        { label: 'Chord colours by ear', quiz: 'ch-ear-7', minutes: 4 },
        { label: 'Hear it: major, sus2, sus4, add9 or 6?', quiz: 'l5-sus-ear', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Playing every note of a 13 chord.', right: 'Drop the 5th, the 11 and often the 9 and the root. 1 ♭7 3 13 is a complete C13.' },
        { wrong: 'Leaving the 7th out of a 9 chord.', right: 'Then it\'s an add9. A 9 chord needs its 7th.' },
        { wrong: 'Putting a natural 11 on a major or dominant chord with the 3rd.', right: 'It rubs against the 3rd. Use ♯11, or drop the 3rd (9sus4).' },
        { wrong: 'Strumming funk 9th chords long and loud.', right: 'Short stabs, muted in between: the space is the groove.' },
        { wrong: 'Thinking extensions are "harder" versions of chords.', right: 'They\'re colours. A shell plus one note is enough.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Hold each chord, then pick its notes from low to high and name each degree (R, 3, ♭7, 9…).',
      challenge: { label: 'The soul ii – V – I in three keys', ex: { label: 'Extensions: C9, C13, Cmaj9, Cm9 and Cm11 (the 5th left out)', tab: 'ext' }, goal: 'then Dm9 – G13 – Cmaj9, Gm9 – C13 – Fmaj9 and Am9 – D13 – Gmaj9, from memory', why: 'Choosing the right extension for each job, in more than one key, is what turns these from grips into harmony.' },
      goals: [
        { focus: 'Build them', tasks: [{ label: 'Extensions on C', ex: { label: 'Extensions: C9, C13, Cmaj9, Cm9 and Cm11 (the 5th left out)', tab: 'ext' }, minutes: 8, goal: 'no stops at 66 BPM' }] },
        { focus: 'Funk', tasks: [{ label: 'The E9 funk vamp', ex: { label: 'E9 funk vamp: slide in, stab, ghost', tab: 'ninthVamp' }, minutes: 8, goal: 'clean mutes at 90 BPM' }] },
        { focus: 'Spell them', tasks: [{ label: 'Spell the extended chord', quiz: 'l5-spell-ext', minutes: 5, goal: '2 stars' }] },
        { focus: 'Hear them', tasks: [{ label: 'Chord colours by ear', quiz: 'ch-ear-7', minutes: 4 }, { label: 'Hear it: which 7th chord?', quiz: 'l5-7ths-ear', minutes: 4 }] },
        { focus: 'Blues', tasks: [{ label: 'Jam: a 12-bar blues with 9 and 13 chords', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: [
          '**Jam**: a funk groove on one chord (E9) for two minutes. Then a blues with 9ths.',
          '**Neo-soul**: Fmaj9 – Em9 – Dm9 – Cmaj9 (each a step down), fingers, slow.',
          '**Looper**: loop a m9/maj9 pad on track 1 and play single notes over it.',
          '**Your songs**: turn the V into V9 and the ii into ii9 in a song you strum.',
        ] },
      ],
      tasks: [
        { label: 'Jam: funk and blues with extensions', tool: 'jam', minutes: 10 },
        { label: 'Chord changes: Dm9 – G13 – Cmaj9', tool: 'changes', minutes: 5 },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Spell, hear, play, explain.',
      tasks: [
        { skill: 'Apply', label: 'Spell the extended chord', quiz: 'l5-spell-ext' },
        { skill: 'Hear', label: 'Chord colours by ear', quiz: 'ch-ear-7' },
        { skill: 'Play', label: 'Extensions on C (mic)', ex: { label: 'Extensions: C9, C13, Cmaj9, Cm9 and Cm11 (the 5th left out)', tab: 'ext' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Extensions: 9ths, 11ths and 13ths". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) what the 9, 11 and 13 are and how they\'re stacked, (2) the difference between add9 and 9, and 6 and 13, (3) which extensions fit major, minor and dominant chords and why the 11 avoids major chords, (4) which notes to leave out on guitar, (5) the soul version of ii – V – I. Ask me to spell two extended chords on roots I don\'t expect. Keep it short.',
        points: ['9 = 2, 11 = 4, 13 = 6 an octave up; 3rds stacked past the 7th', 'extensions include the 7th; add9 and 6 don\'t', 'maj: 9, ♯11, 13 · minor: 9, 11 · dominant: 9, 13 (11 only with no 3rd: 9sus4)', 'leave out the 5th, then the root, the 11 on 13 chords; never the 3rd or 7th', 'Dm9 – G13 – Cmaj9'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: '-Elz-OxngKI', title: 'EXTENDED (9 11 13) And ALTERED (#11, b9, etc) CHORDS Explained' },
      books: [
        { book: 'Music Theory for Guitarists', where: 'The chapter on extended chords', why: 'The full stack of 3rds and the naming rules.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'The extended chords chapter', why: 'More voicings and which extension fits which chord.' },
        { book: 'Triads for the Improvising Guitarist', where: 'The part on upper-structure triads', why: 'Extensions seen as a triad on top of a chord: a door into Level 8.' },
      ],
      blocks: [
        { p: '**Next in Level 5**: altered dominants, where the 5th and 9th of the V chord are bent on purpose.' },
        { p: '**Extra credit**: on Dm9 – G13 – Cmaj9, notice the top notes. Can you find voicings where the top note walks down by step? That\'s the voice leading of lesson 8.' },
      ],
    },
  ],
}

// ---- Lesson 6: altered dominants -----------------------------------------------------------------------------------
export const ALTERED: CourseLesson = {
  id: 'c5-altered', level: 5, n: 6, title: 'Altered dominants: ♭9, ♯9, ♯5 and ♭5', minutes: 80,
  goal: 'Build 7♭9, 7♯9, 7♯5 and 7♭5 chords, know why only dominant chords get altered, hear how each altered note leans into the next chord, use the 7♭9 that a minor key gives you naturally, and play the Hendrix 7♯9 as a bluesy chord that doesn\'t resolve.',
  builds: ['seventh chords', 'the 7th chords of a key', 'augmented and diminished', 'extensions'],
  topics: ['altered chords', '7b9', '7#9', 'dominant', 'tension and release', 'blues', 'jazz', 'Hendrix chord'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'A dominant 7th already wants to resolve. **Altering** it, bending its 5th or 9th up or down a fret, makes it want to resolve **even more**: extra notes that lean a half step into the next chord. That\'s the tense, dramatic, "here it comes" sound of jazz, gospel, flamenco, film music and the minor-key V chord.' },
        { p: 'And one altered chord took on a life of its own: the **7♯9**, the **Hendrix chord**, a dominant chord with a minor 3rd on top of its major 3rd. It doesn\'t resolve at all. It\'s the sound of rock-blues and funk.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['spell 7♭9, 7♯9, 7♯5 and 7♭5 on any root;', 'say why dominant chords are the ones that get altered;', 'show where each altered note goes when the chord resolves;', 'use V7♭9 in a minor key;', 'play E7♯9 as a riff chord and G7♭9 – C as a cadence.'] },
        { prog: { label: 'G7 → C, then G7♭9 → C: hear the extra pull', chords: [notes([3, -1, 3, 4, 3, -1]), notes([-1, 3, 2, 0, 1, 0]), notes([3, -1, 3, 4, 3, 4]), notes([-1, 3, 2, 0, 1, 0])], gap: 1.2 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Four alterations', blocks: [
        { p: 'Start from G7 (G B D F) and its natural 9 (A). Bend the 5th or the 9th a half step:' },
        { list: [
          '**G7♭9** = G B D F A♭: the 9 lowered. Dark, dramatic.',
          '**G7♯9** = G B D F A♯ (sounds like B♭): the 9 raised. Gritty and bluesy: a minor 3rd rubbing on the major 3rd.',
          '**G7♯5** (G+7, G7aug) = G B D♯ F: the 5th raised. Bright, rising.',
          '**G7♭5** = G B D♭ F: the 5th lowered. Strange, floating (it contains two tritones).',
        ] },
        { p: 'These are the **altered tones**: ♭9, ♯9, ♭5 (also called ♯11) and ♯5 (also called ♭13). A chord chart may combine them (G7♯5♯9) or write **G7alt**, which means "any alterations you like, no natural 5th or 9th".' },
        { spots: fig('G7♭9 (3 x 3 4 3 4): the ♭9 (A♭) on the high e.', 7, 'dom7b9', [3, -1, 3, 4, 3, 4], 3) },
      ],
    },
    {
      kind: 'learn', title: '2 · Why only dominant chords?', blocks: [
        { p: 'A dominant chord\'s job is to create tension that the next chord releases. Alterations add more tension: more notes a half step away from the notes of the target chord. On a **tonic** chord (Imaj7), where the music is supposed to rest, that same tension just sounds wrong. So altered tones belong on **V7** (and on other dominant chords that lead somewhere).' },
        { p: 'Watch where each altered note of **G7** goes when it resolves to **C**:' },
        { list: ['**♭9 (A♭)** falls a half step to **G**, the 5th of C.', '**♯5 (D♯)** rises a half step to **E**, the 3rd of C.', '**♭5 (D♭)** falls a half step to **C**, the root.', '**♯9 (A♯/B♭)** usually falls to **A** (the 6th/13th of C) or acts as a bluesy colour.'] },
        { p: 'Plus the tritone you already know (B up to C, F down to E). An altered dominant has three or four notes pulling into the next chord instead of two.' },
        { prog: { label: 'G7♯5 → C: the D♯ rises into E', chords: [notes([3, -1, 3, 4, 4, -1]), notes([-1, 3, 2, 0, 1, 0])], gap: 1.4 } },
      ],
    },
    {
      kind: 'learn', title: '3 · The minor key gives you 7♭9 for free', blocks: [
        { p: 'In A minor, the V chord from the natural minor scale is **Em7** (E G B D): no leading note, weak pull. So minor-key music raises the G to **G♯** (that\'s the **harmonic minor** scale, Level 7) and the V becomes **E7**. Now stack one more 3rd from the same scale: **F**, the 6th note of A minor. E G♯ B D F = **E7♭9**.' },
        { p: 'So **V7♭9** is the natural dominant of a minor key: tango, flamenco, klezmer, Eastern European folk, metal and every film villain\'s theme. In A minor: **Dm – E7♭9 – Am**.' },
        { prog: { label: 'Am – Dm – E7♭9 – Am: the minor-key cadence', chords: [notes([-1, 0, 2, 2, 1, 0]), notes([-1, -1, 0, 2, 3, 1]), notes([0, 2, 0, 1, 3, 1]), notes([-1, 0, 2, 2, 1, 0])], gap: 1.2 } },
        { tip: 'In a major key the ♭9 is "borrowed" from minor (Level 7). It still works: G7♭9 – C sounds dramatic and a bit old-world.' },
      ],
    },
    {
      kind: 'learn', title: '4 · The Hendrix chord: 7♯9 that stays put', blocks: [
        { p: '**E7♯9** at **0 7 6 7 8** (open E bass): E, E, G♯, D, G. It has the major 3rd (G♯) **and** the ♯9 (G, which is the same pitch as a minor 3rd). Major and minor at once: exactly the blues, where you bend the minor 3rd towards the major 3rd over a major chord.' },
        { spots: fig('E7♯9, the Hendrix chord (0 7 6 7 8 x): G♯ (3) on the D string, G (♯9) on the B string.', 4, 'dom7s9', [0, 7, 6, 7, 8, -1], 7) },
        { p: 'In rock, blues and funk it\'s used as a **tonic** chord: the I chord of a riff, not a V that has to resolve. It doesn\'t need to go anywhere; it just sounds tough. As a jazz V chord (G7♯9 → C, **x 10 9 10 11**) it resolves like any other altered dominant.' },
        { video: { id: '4Hf66fxDLiA', title: 'Hendrix / Mayer Double-Stop Riff in 5 Levels', note: 'The Hendrix vocabulary: the 7♯9 sound and the double stops around it.' } },
      ],
    },
    {
      kind: 'learn', title: '5 · Altered chords as rootless shapes', blocks: [
        { p: 'You\'ve met some of these before under other names:' },
        { list: [
          '**7♭9 without its root = a dim7** (lesson 1). G7♭9 minus G = B D F A♭ = Bdim7. Any dim7 shape is four rootless 7♭9 chords.',
          '**7♯5 = an augmented triad + ♭7**. G7♯5 = G+ with F.',
          '**7♭5 is symmetrical**: G7♭5 and D♭7♭5 have the same notes (the tritone sub, Level 7).',
        ] },
        { p: 'So altered harmony isn\'t a pile of new grips: it\'s shapes you know, used on the V chord.' },
        { video: { id: 'XhMI3-H0Bv4', title: 'ESSENTIAL Altered Dominant Chords: b9 #9 #5 b5 Explained On Guitar', note: 'All four alterations, with where each one resolves.' } },
      ],
    },
    {
      kind: 'learn', title: '6 · What mastery looks like', blocks: [
        { p: 'You own altered dominants when:' },
        { list: [
          'You can **spell** 7♭9, 7♯9, 7♯5 and 7♭5 on any root.',
          'You can play **G7 → C** with each alteration and **sing the altered note** resolving.',
          'You can play **Dm – E7♭9 – Am** and the same in D minor and E minor.',
          'You can play an **E7♯9 riff** and say why that chord doesn\'t need to resolve.',
          'By ear you can tell a plain dominant 7th from an altered one **eight times out of ten**.',
        ] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Spell the dominant 7th, then bend the one note the name asks for.', examples: [
        { q: 'Spell D7♯9.', steps: ['D7: D F♯ A C.', 'The 9 of D is E; raise it: E♯ (sounds as F).'], answer: 'D F♯ A C E♯ (often written F).' },
        { q: 'Spell B♭7♭9.', steps: ['B♭7: B♭ D F A♭.', 'The 9 is C; lower it: C♭ (sounds as B).'], answer: 'B♭ D F A♭ C♭.' },
        { q: 'What\'s the V chord of D minor, with the ♭9 the key gives you?', steps: ['The 5th of D minor is A.', 'Raise the C to C♯ (harmonic minor): A C♯ E G.', 'The next 3rd from the scale: B♭.'], answer: 'A7♭9 (A C♯ E G B♭).' },
        { q: 'Play A7♭9 near the 5th fret.', steps: ['G7♭9 is 3 x 3 4 3 4.', 'A is two frets higher.'], answer: '5 x 5 6 5 6.', spots: ex(9, 'dom7b9', [5, -1, 5, 6, 5, 6], 5) },
        { q: 'In G7♯5 → C, which note makes the ♯5 resolution, and where to?', steps: ['G7♯5 = G B D♯ F.', 'D♯ is a half step below E.'], answer: 'D♯ rises to E, the 3rd of C.', spots: ex(7, 'dom7s5', [3, -1, 3, 4, 4, -1], 3) },
        { q: 'Why isn\'t Cmaj7♭9 a thing?', steps: ['Alterations add tension that wants to resolve.', 'Cmaj7 is the home chord: there\'s nowhere to resolve to.', 'And D♭ against C is the harshest rub there is.'], answer: 'Altered tones belong on dominant chords that lead somewhere, not on the tonic.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'An altered dominant sounds like a plain V7 with something sharp sticking out of it. Hear the **altered note first**: play the chord, then pick the top note and sing it, then resolve and hear where that note goes. ♭9 sounds dark and sinister, ♯9 gritty and bluesy, ♯5 bright and rising, ♭5 strange and floating.' },
        { list: ['Play G7 – C, then G7♭9 – C: sing A♭ falling to G.', 'Play E7♯9 and sing the G on the B string, then the G♯ on the D string: minor 3rd and major 3rd.', 'Play Dm – E7♭9 – Am and hum the F falling to E.'] },
      ],
      drills: [
        { label: 'Hear it: plain or altered dominant?', quiz: 'l5-alt-ear', minutes: 5, goal: '8 out of 10' },
        { label: 'Hear it: how does it end?', quiz: 'l3-cadence-ear', minutes: 3 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Altering every chord to sound jazzy.', right: 'Alterations go on dominant chords that resolve. On the tonic they just sound wrong.' },
        { wrong: 'Playing the natural 5th or 9th along with the altered one.', right: 'G7♭9 shouldn\'t also have A; G7♯5 shouldn\'t also have D. One version of each note.' },
        { wrong: 'Treating the Hendrix 7♯9 as a jazz V chord in a rock riff.', right: 'In rock and funk it\'s the I chord: it sits, it doesn\'t resolve.' },
        { wrong: 'Using the natural minor v (Em7) as the dominant in A minor.', right: 'Raise its 3rd: E7, or E7♭9 for the full minor-key sound.' },
        { wrong: 'Learning altered chords as new shapes.', right: '7♭9 = rootless dim7, 7♯5 = aug + ♭7. Reuse what you know.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Every altered chord gets resolved: hold it, then move to the target chord and listen to the altered note land.',
      challenge: { label: 'Every alteration in every minor key you use', ex: { label: 'Altered dominants: G7, G7♭9, G7♯9, G7♯5 each resolving to C; then the Hendrix E7♯9', tab: 'alt' }, goal: 'then iv – V7♭9 – i in A minor, D minor and E minor, and a two-minute E7♯9 riff, all from memory', why: 'Hearing the alteration pull into the next chord in more than one key is what makes it part of your playing, not just a name.' },
      goals: [
        { focus: 'Resolve them', tasks: [{ label: 'G7, 7♭9, 7♯9, 7♯5 → C, then E7♯9', ex: { label: 'Altered dominants: G7, G7♭9, G7♯9, G7♯5 each resolving to C; then the Hendrix E7♯9', tab: 'alt' }, minutes: 8, goal: 'no stops at 66 BPM' }] },
        { focus: 'Rootless', tasks: [{ label: 'dim7 as rootless 7♭9: Bdim7 arpeggio over G', ex: { label: 'Diminished 7th arpeggio on B', spec: { kind: 'arpeggio', root: 'B', type: 'dim7', position: 0 } }, minutes: 4 }] },
        { focus: 'Hear them', tasks: [{ label: 'Hear it: plain or altered dominant?', quiz: 'l5-alt-ear', minutes: 5, goal: '2 stars' }] },
        { focus: 'Minor keys', tasks: [{ label: 'Jam: a minor-key progression ending iv – V – i', tool: 'jam', minutes: 8 }] },
        { focus: 'Spell them', tasks: [{ label: 'Spell the altered dominant', quiz: 'l5-spell-alt', minutes: 5, goal: '2 stars' }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: [
          '**Minor-key songs**: change the V to V7♭9 on the last bar before the tonic.',
          '**Blues and rock**: an E7♯9 riff, sixteenth-note funk on the same chord, or the Hendrix-style double stops around it.',
          '**Jazz**: ii – V7alt – I: Dm7 – G7♭9 – Cmaj7, then try G7♯5 and G7♯9 in the same spot.',
          '**Endings**: a big V7♯9 with a tremolo before the last chord.',
        ] },
      ],
      tasks: [
        { label: 'Jam: minor keys and altered V chords', tool: 'jam', minutes: 10 },
        { label: 'Fills between chords: lead into the I from the altered note', tool: 'fills', minutes: 8 },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Hear, play, explain.',
      tasks: [
        { skill: 'Apply', label: 'Spell the altered dominant', quiz: 'l5-spell-alt' },
        { skill: 'Hear', label: 'Hear it: plain or altered dominant?', quiz: 'l5-alt-ear' },
        { skill: 'Play', label: 'Altered dominants resolving (mic)', ex: { label: 'Altered dominants: G7, G7♭9, G7♯9, G7♯5 each resolving to C; then the Hendrix E7♯9', tab: 'alt' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Altered dominants". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) the four alterations and how to spell them, (2) why only dominant chords are altered, (3) where the ♭9 and ♯5 go when G7 resolves to C, (4) why a minor key gives you V7♭9, (5) why the Hendrix 7♯9 doesn\'t need to resolve, (6) how 7♭9 relates to a diminished 7th. Keep it short.',
        points: ['♭9, ♯9, ♭5 (♯11), ♯5 (♭13): the 5th or 9th bent a half step', 'alterations add tension: they belong on chords that resolve', 'G7♭9 → C: A♭ falls to G · G7♯5 → C: D♯ rises to E', 'harmonic minor raises the 7th: V7 with the ♭6 of the key on top = 7♭9', '7♯9 = major and minor 3rd together: the blues, used as a I chord', '7♭9 without the root = dim7'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'h-vidjPJZg0', title: '3-Minute Theory #39: Harmonic Minor Scale' },
      books: [
        { book: 'Music Theory for Guitarists', where: 'The chapter on altered chords', why: 'Every alteration and its resolution.' },
        { book: 'Dominant Pentatonic Scale Guitar Soloing', where: 'The parts on soloing over dominant chords', why: 'Making the altered sound in a solo, not just in the chords.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'The extended and altered chords chapter', why: 'More grips and where each one is used.' },
      ],
      blocks: [
        { p: '**Next in Level 5**: slash chords and bass lines. What happens when the bass isn\'t the root.' },
        { p: '**Looking ahead**: the scale that fits an altered dominant is the altered scale (Level 8), and the 7♭5 leads to the tritone substitution (Level 7).' },
      ],
    },
  ],
}

// ---- Lesson 7: slash chords and bass lines -------------------------------------------------------------------------
export const SLASH: CourseLesson = {
  id: 'c5-slash', level: 5, n: 7, title: 'Slash chords and bass lines', minutes: 80,
  goal: 'Read and play slash chords (inversions like C/E and chords over a foreign bass like D/C), use them to make the bass walk by step under a progression, play the classic descending bass lines (C – G/B – Am – Am/G and D – D/C – G/B – Gm/B♭), and add bass runs between chords.',
  builds: ['triads and inversions', 'the chords of a key', 'seventh chords'],
  topics: ['slash chords', 'inversions', 'bass lines', 'walking bass', 'bass runs', 'arranging'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Most chord charts give only the chord, and you play its root in the bass. But some of the most beautiful moments in songs come from the **bass moving on its own**: a line walking down by step while the chords above stay simple. The way charts write that is the **slash chord**: **chord / bass note**.' },
        { p: 'C/E means "a C chord with E in the bass". Am/G means "A minor with G in the bass". Once you can read and play them, you can make any progression sound arranged, with a bass line that sings as much as the melody.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['read any slash chord and tell an inversion from a foreign bass note;', 'play the common slash chords in open position;', 'play a descending bass line under a progression;', 'write your own bass line under a song with slash chords;', 'add bass runs between chords (bluegrass and country style).'] },
        { prog: { label: 'C – G/B – Am – Am/G – F – C/E – Dm7 – G: the bass walks down the scale', chords: [notes([-1, 3, 2, 0, 1, 0]), notes([-1, 2, 0, 0, 3, 3]), notes([-1, 0, 2, 2, 1, 0]), notes([3, 0, 2, 2, 1, 0]), notes([1, 3, 3, 2, 1, 1]), notes([0, 3, 2, 0, 1, 0]), notes([-1, -1, 0, 2, 1, 1]), notes([3, 2, 0, 0, 0, 3])], gap: 0.9 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Reading a slash chord', blocks: [
        { p: '**Left of the slash: the chord. Right of the slash: the bass note.** There are two kinds:' },
        { list: [
          '**Inversions**: the bass note is in the chord. **C/E** (3rd in the bass, 1st inversion), **C/G** (5th in the bass, 2nd inversion), **G/B**, **D/F♯**. Smooth and gentle.',
          '**A foreign bass note**: the bass isn\'t in the chord. **D/C** (C is the ♭7 of D, so the sound is D7 with the 7th in the bass), **Am/G** (= Am7 with G in the bass), **F/G** (a soft G11: the gospel and soul V chord).',
        ] },
        { p: 'Either way you play the chord on top and make sure the **lowest note you play is the bass note**. Mute or skip any lower string that would ring with a different note.' },
        { spots: fig('G/B (x 2 0 0 3 3): a G chord with its 3rd (B) in the bass.', 7, 'maj', [-1, 2, 0, 0, 3, 3], 2, 11) },
      ],
    },
    {
      kind: 'learn', title: '2 · The bass walks down: C – G/B – Am – Am/G', blocks: [
        { p: 'The most famous use: hold simple chords and **walk the bass down the scale**. In C: **C – G/B – Am – Am/G – F – C/E – Dm7 – G**. The bass plays C B A G F E D G: the C major scale going down. The chords on top barely move.' },
        { list: ['**C** x 3 2 0 1 0', '**G/B** x 2 0 0 3 3', '**Am** x 0 2 2 1 0', '**Am/G** 3 0 2 2 1 0', '**F** 1 3 3 2 1 1', '**C/E** 0 3 2 0 1 0', '**Dm7** x x 0 2 1 1', '**G** 3 2 0 0 0 3'] },
        { p: 'This descending line is everywhere: ballads, folk, pop, hymns, Bach. Your ear follows the bass as a second melody.' },
        { spots: fig('Am/G (3 0 2 2 1 0): A minor with G, its ♭7, in the bass.', 9, 'min', [3, 0, 2, 2, 1, 0], 2, 7) },
      ],
    },
    {
      kind: 'learn', title: '3 · Chromatic bass: D – D/C – G/B – Gm/B♭ – D/A', blocks: [
        { p: 'The bass can also walk by **half steps**. Hold D, then let the bass fall one fret at a time: **D – D/C – G/B – Gm/B♭ – D/A**. The bass goes D C B B♭ A. The minor chord on B♭ (borrowed from D minor, Level 7) is the bittersweet moment.' },
        { list: ['**D** x x 0 2 3 2', '**D/C** x 3 0 2 3 2', '**G/B** x 2 0 0 3 3', '**Gm/B♭** x 1 0 0 3 3', '**D/A** x 0 0 2 3 2'] },
        { prog: { label: 'D – D/C – G/B – Gm/B♭ – D/A', chords: [notes([-1, -1, 0, 2, 3, 2]), notes([-1, 3, 0, 2, 3, 2]), notes([-1, 2, 0, 0, 3, 3]), notes([-1, 1, 0, 0, 3, 3]), notes([-1, 0, 0, 2, 3, 2])], gap: 1.1 } },
        { tip: 'You\'ve now heard the **line cliché** (lesson 1: a voice moving inside the chord) and the **bass line** (here: the moving voice at the bottom). Same idea, different voice.' },
      ],
    },
    {
      kind: 'learn', title: '4 · Make your own: step the bass between roots', blocks: [
        { p: 'Turn any progression into a bass line: look at the roots, and wherever two roots are a **3rd apart**, fill the gap with the note between them as a slash chord.' },
        { list: [
          '**C – Am**: C to A, fill B → **C – G/B – Am** (or C – Em/B – Am).',
          '**G – Em**: G to E, fill F♯ → **G – D/F♯ – Em**.',
          '**F – Dm**: fill E → **F – C/E – Dm**.',
          '**Going up**: **C – C/E – F** (C E F), **G – G/B – C** (the bluegrass bass run).',
        ] },
        { p: 'Pick the chord for the in-between note from the key: usually the chord that **has** that note (G/B, D/F♯, C/E: inversions), which keeps it smooth.' },
        { spots: fig('D/F♯ (2 x 0 2 3 2): the thumb on the low E plays F♯, the 3rd of D.', 2, 'maj', [2, -1, 0, 2, 3, 2], 2, 6) },
      ],
    },
    {
      kind: 'learn', title: '5 · Bass runs between chords', blocks: [
        { p: 'Country, bluegrass and folk players do it without slash chords: on the last beat or two before a change, they **pick single bass notes** walking to the next root. G to C: **G, A, B, C** (on the low E and A strings). C to G: **C, B, A, G**. G to D: **G, A, B... D** (or G F♯ E D going down).' },
        { p: 'It\'s the same idea as a walking bass in jazz: approach the next root **by step** (from a scale note) or **by half step** (from below or above). The next root lands on beat 1.' },
        { video: { id: '_HaEzRNmI9I', title: 'Slash Chords: What They Are and How to Use Them in Your Guitar Playing', note: 'Slash chords in open position and the bass lines they make.' } },
        { video: { id: 'O9_HLJ7NYBI', title: 'Bass Walks Connecting Chords in G', note: 'Bass runs between chords: section 5 in bluegrass style.' } },
      ],
    },
    {
      kind: 'learn', title: '6 · What mastery looks like', blocks: [
        { p: 'You own slash chords and bass lines when:' },
        { list: [
          'You can read any slash chord and say whether it\'s an **inversion** or a **foreign bass**.',
          'You can play the **C – G/B – Am – Am/G – F – C/E – Dm7 – G** line and the **D – D/C – G/B – Gm/B♭ – D/A** line without stopping.',
          'Given a progression with roots a 3rd apart, you can **add the passing bass chord** on the spot.',
          'You can add **bass runs** between G, C and D in time.',
          'By ear you can tell **which chord tone is in the bass** (root, 3rd, 5th or ♭7).',
        ] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Find the bass note first, then put the chord on top of it.', examples: [
        { q: 'C/E: inversion or foreign bass? How do you play it?', steps: ['E is the 3rd of C: an inversion (1st inversion).', 'Open C with the low E string open as the bass.'], answer: 'Inversion. 0 3 2 0 1 0.', spots: ex(0, 'maj', [0, 3, 2, 0, 1, 0], 2, 4) },
        { q: 'What does D/C sound like, and why?', steps: ['C isn\'t in D major (D F♯ A).', 'C is the ♭7 of D.'], answer: 'D7 with its 7th in the bass (D7/C). It wants to fall to G/B.' },
        { q: 'Add a walking bass chord between G and Em.', steps: ['Roots G and E, a 3rd apart.', 'The note between is F♯; D has F♯: D/F♯.'], answer: 'G – D/F♯ – Em.' },
        { q: 'Play C/G.', steps: ['G is the 5th of C: 2nd inversion.', 'The C chord with G on the low E (3rd fret) and the A string at 3.'], answer: '3 3 2 0 1 0.', spots: ex(0, 'maj', [3, 3, 2, 0, 1, 0], 2, 7) },
        { q: 'Write the bass line of F – C/E – Dm – Dm/C – B♭.', steps: ['Bass notes: F, E, D, C, B♭.'], answer: 'F E D C B♭: down the F major scale.' },
        { q: 'What is F/G, and where would you use it?', steps: ['F A C over G.', 'From G: ♭7 (F), 9 (A), 11 (C): G9sus4 / G11 without a 3rd.'], answer: 'A soft dominant (G11): the soul and gospel V chord, F/G → C.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Train your ear to follow the **bass**, not just the top. Most people hear the melody and the "chord"; good arrangers hear the bass line as a melody of its own. When a chord has its 3rd in the bass it sounds lighter and on the move; its 5th in the bass sounds suspended, waiting; its ♭7 in the bass sounds like it\'s sinking.' },
        { list: ['Play the C – G/B – Am – Am/G line and sing only the bass.', 'Play C, C/E, C/G and C/B♭: same chord on top, four moods.', 'Listen to a ballad you like and hum its bass line.'] },
      ],
      drills: [
        { label: 'Hear it: which note is in the bass?', quiz: 'l5-bass-ear', minutes: 5, goal: '8 out of 10' },
        { label: 'Name the inversion', quiz: 'tr-inv', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Playing the chord\'s usual shape so its root rings below the slash note.', right: 'The slash note must be the lowest note. Mute or skip the strings below it.' },
        { wrong: 'Reading D/C as "D or C".', right: 'D chord, C in the bass: one chord.' },
        { wrong: 'Using slash chords everywhere.', right: 'Use them where the bass makes a line. A bass that just jumps around sounds random.' },
        { wrong: 'Forgetting the bass note is part of the harmony.', right: 'Am/G is Am7. D/C is D7. The bass can change the chord\'s name and pull.' },
        { wrong: 'Rushing the bass run into the next chord.', right: 'The run fills the beats before the change; the new root lands on beat 1.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Pick the bass note on its own first, then the chord. Sing the bass line before playing it.',
      challenge: { label: 'Bass-line arrangement of a song', ex: { label: 'Slash chords: a bass line walking down under C – G/B – Am – Am/G – F – C/E – Dm7 – G', tab: 'slash' }, goal: 'then take a song you strum and give it a bass line: find every place two roots are a 3rd apart and add the slash chord between', why: 'Arranging a real song is what turns slash chords from something you read into something you hear and choose.' },
      goals: [
        { focus: 'The descending scale', tasks: [{ label: 'C – G/B – Am – Am/G – F – C/E – Dm7 – G', ex: { label: 'Slash chords: a bass line walking down under C – G/B – Am – Am/G – F – C/E – Dm7 – G', tab: 'slash' }, minutes: 8, goal: 'no stops at 72 BPM' }] },
        { focus: 'The chromatic line', tasks: [{ label: 'D – D/C – G/B – Gm/B♭ – D/A', ex: { label: 'A descending bass line: D – D/C – G/B – Gm/B♭ – D/A', tab: 'bassLine' }, minutes: 6 }] },
        { focus: 'Hear the bass', tasks: [{ label: 'Hear it: which note is in the bass?', quiz: 'l5-bass-ear', minutes: 5, goal: '2 stars' }] },
        { focus: 'Bass runs', tasks: [{ label: 'Chord changes: G – C – D with a bass run into each', tool: 'changes', minutes: 6 }] },
        { focus: 'Name the inversion', tasks: [{ label: 'Name the inversion', quiz: 'tr-inv', minutes: 4 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: [
          '**Ballads**: the C – G/B – Am – Am/G line as an intro.',
          '**Fingerstyle**: thumb on the bass line, fingers on the chord tops: the slash chords do the arranging for you.',
          '**Bluegrass and country**: bass runs from G to C to D in a Carter-style rhythm part.',
          '**Looper**: loop a bass line on track 1 (the looper\'s bass octave or Real bass), then strum simple chords over it.',
        ] },
      ],
      tasks: [
        { label: 'Jam: a ballad progression with a walking bass', tool: 'jam', minutes: 10 },
        { label: 'Fills between chords: bass runs', tool: 'fills', minutes: 8 },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Hear the bass, play the line, explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Name the inversion', quiz: 'tr-inv' },
        { skill: 'Hear', label: 'Hear it: which note is in the bass?', quiz: 'l5-bass-ear' },
        { skill: 'Play', label: 'The descending slash-chord line (mic)', ex: { label: 'Slash chords: a bass line walking down under C – G/B – Am – Am/G – F – C/E – Dm7 – G', tab: 'slash' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Slash chords and bass lines". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) how to read a slash chord, (2) the difference between an inversion and a foreign bass note, (3) the C – G/B – Am – Am/G line and why it works, (4) the D – D/C – G/B – Gm/B♭ – D/A line, (5) how to add a passing slash chord between roots a 3rd apart, (6) what F/G is. Give me a progression and ask me to add a bass line. Keep it short.',
        points: ['chord / bass note; the slash note is the lowest', 'inversion: the bass is in the chord (C/E); foreign bass: it isn\'t (D/C = D7)', 'C B A G F E D: the scale going down under simple chords', 'D C B B♭ A: a chromatic line, Gm/B♭ borrowed from minor', 'roots a 3rd apart: fill the step between with a chord that has that note (G – D/F♯ – Em)', 'F/G = G11 without the 3rd: a soft V chord'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'yPy9UjTS49w', title: 'The Easiest Way to Walking Bass With Chords' },
      books: [
        { book: 'Flatpicking Essentials Volume 1', where: 'The chapters on bass runs', why: 'Bass runs between chords in bluegrass rhythm, in every common key.' },
        { book: 'Music Theory for Guitarists', where: 'The part on inversions and slash chords', why: 'How slash chords are named and read.' },
        { book: 'Harmony in Practice', where: 'The chapters on inversions and bass lines', why: 'Why a good bass line moves by step, with exercises.' },
      ],
      blocks: [
        { p: '**Next in Level 5**: voice leading, where every voice moves by the smallest step, not just the bass.' },
      ],
    },
  ],
}

// ---- Lesson 8: voice leading ---------------------------------------------------------------------------------------
export const VOICE_LEADING: CourseLesson = {
  id: 'c5-voicelead', level: 5, n: 8, title: 'Voice leading: guide tones and the smoothest path', minutes: 90,
  goal: 'Hear chords as voices that move, follow the guide tones (3rds and 7ths) through a progression, play any progression of 7th chords with every voice moving the smallest distance, use the top voice as a melody, and connect it to soloing by targeting guide tones on the changes.',
  builds: ['seventh chords', 'the 7th chords of a key', 'triads on every string set', 'slash chords and bass lines'],
  topics: ['voice leading', 'guide tones', 'comping', 'drop 2', 'shell voicings', 'chord tones', 'jazz'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'So far you\'ve learned chords as shapes. Great players hear them as **voices**: three or four separate melodies, moving together. When each voice moves as little as possible, chord changes sound smooth and inevitable, like a choir or a string section. When every voice jumps, the same chords sound clumsy.' },
        { p: 'The secret is in the **guide tones**: the **3rd and 7th** of each chord. They define the chord, and in most progressions they move by a half step or a whole step, or stay still. Follow them and you can comp with two notes, play chord melody, and solo "through the changes" by landing on them.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['name the guide tones of any 7th chord;', 'show how the 7th of one chord falls to the 3rd of the next in a ii – V – I and a circle progression;', 'play a progression with just the guide tones (two notes) on the D and G strings;', 'voice-lead I – vi – ii – V in drop 2 in two positions with no jumps;', 'make the top voice sing a melody, and land on guide tones in a solo.'] },
        { prog: { label: 'Guide tones only: Dm7 (F C) → G7 (F B) → Cmaj7 (E B)', chords: [[53, 60], [53, 59], [52, 59]], gap: 1.3 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Chords are voices', blocks: [
        { p: 'Play C (x 3 2 0 1 0) then F (1 3 3 2 1 1) and look at each string as a singer: the low C jumps to F, E goes to C, G to... it\'s a mess. Now play **C** on D-G-B as **5 5 5** and **F** as **7 5 6**: the G on the D string steps up to A, the C stays, the E steps up to F. Three singers, two tiny steps.' },
        { p: 'The rules are the ones you met with triads in Level 4, now for any chord:' },
        { list: [
          '**Keep common tones** on the same string.',
          '**Move the others by the smallest step** (a half or whole step).',
          '**Let the top voice make a melody**: it\'s what the ear follows.',
          '**Contrary motion** (some voices up, some down) sounds richer than everything moving together.',
        ] },
      ],
    },
    {
      kind: 'learn', title: '2 · Guide tones: the 3rds and 7ths', blocks: [
        { p: 'The **3rd** says major or minor; the **7th** says maj7, 7 or m7. Together they are the **guide tones**: the two notes that make a chord sound like that chord, even with no root and no 5th.' },
        { p: 'Now the magic. When roots move by a **4th** (ii – V – I, and the whole circle of fifths), the guide tones swap roles:' },
        { list: [
          'The **7th** of one chord falls a **half step** (or a whole step) to become the **3rd** of the next.',
          'The **3rd** of one chord **stays** to become the **7th** of the next.',
        ] },
        { p: 'ii – V – I in C: **Dm7 (F, C) → G7 (F, B) → Cmaj7 (E, B)**. C falls to B; F stays; then F falls to E; B stays. One note moves at a time, by a half step.' },
        { spots: fig('The guide tones of Dm7 on the D and G strings: F (♭3) and C (♭7).', 2, 'm7', [-1, -1, 3, 5, -1, -1], 4) },
        { spots: fig('The guide tones of G7: F (♭7) stays, C falls a fret to B (3).', 7, 'dom7', [-1, -1, 3, 4, -1, -1], 4) },
      ],
    },
    {
      kind: 'learn', title: '3 · Two notes through a whole progression', blocks: [
        { p: 'Here\'s the circle progression in G major / E minor: **Am7 – D7 – Gmaj7 – Cmaj7 – F♯m7♭5 – B7 – Em**. Play **only the guide tones**, two notes on the D and G strings, and watch them move:' },
        { list: ['**Am7** C + G', '**D7** C + F♯ (C stays, G falls to F♯)', '**Gmaj7** B + F♯ (C falls to B, F♯ stays)', '**Cmaj7** B + E (B stays, F♯ falls to E)', '**F♯m7♭5** A + E (B falls to A, E stays)', '**B7** A + D♯ (A stays, E falls to D♯)', '**Em** G + (D♯ rises to E: home)'] },
        { p: 'Two strings, never more than a fret or two of movement, and you can hear every chord. This is how jazz players comp quietly behind a soloist, and it\'s the skeleton of every good chord melody.' },
        { tip: 'Add the root on the low strings (or let a looper bass play it) and the guide tones sound like full chords.' },
      ],
    },
    {
      kind: 'learn', title: '4 · Full chords, smallest moves: I – vi – ii – V in drop 2', blocks: [
        { p: 'Now four voices. Play **I – vi – ii – V** in C with drop-2 chords, choosing each next chord **in the inversion closest to the last**:' },
        { list: ['High: **Cmaj7** x x 10 12 12 12 → **Am7** x x 10 12 10 12 → **Dm7** x x 10 10 10 10 → **G7** x x 9 10 8 10.', 'Lower: **Cmaj7** x x 9 9 8 8 → **Am7** x x 7 9 8 8 → **Dm7** x x 7 7 6 8 → **G7** x x 5 7 6 7 → **Cmaj7** x x 5 5 5 7.'] },
        { p: 'Check each change: most voices stay or move a fret or two. The top voice (high e) makes a little melody: **E E D D** up high, then **C C C B B**.' },
        { spots: fig('Am7 (x x 10 12 10 12), right after Cmaj7 (x x 10 12 12 12): only the B string moves, B down to A.', 9, 'm7', [-1, -1, 10, 12, 10, 12], 11) },
        { video: { id: '1tThogfLBW0', title: 'Jazz Chord Essentials: Shell Voicings', note: 'Shells moving through progressions with the smallest steps: voice leading with three notes.' } },
      ],
    },
    {
      kind: 'learn', title: '5 · From chords to solos', blocks: [
        { p: 'Guide tones are also the **best notes to land on in a solo** when the chord changes. Over Dm7 – G7 – Cmaj7, end a phrase on **C** just before G7 arrives, then move it to **B** right as G7 starts: the line itself spells the change. That\'s what "playing the changes" means, and it\'s the heart of Level 6.' },
        { list: ['Target the **3rd** of each new chord on beat 1 (the strongest sound).', 'Approach it from a half step above or below.', 'Use the guide-tone line (C B B, F F E…) as the skeleton of a melody and decorate it.'] },
        { p: 'The Target notes tool in Explore drills exactly this: it plays the chords and asks you to land on the right note.' },
      ],
    },
    {
      kind: 'learn', title: '6 · What mastery looks like', blocks: [
        { p: 'You own voice leading when:' },
        { list: [
          'You can name the **guide tones** of any 7th chord in a second.',
          'You can play **ii – V – I in any key** with just the guide tones on two strings.',
          'You can play the **seven-chord circle** progression in guide tones without stopping.',
          'You can play **I – vi – ii – V** in drop 2 in two positions with no jumps.',
          'You can take any progression and **choose voicings** so that common tones stay and the top voice moves by step.',
          'In a solo you can **land on the 3rd** of each new chord in a ii – V – I.',
        ] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Find the 3rds and 7ths; let each move the smallest distance.', examples: [
        { q: 'Guide tones of Gm7 – C7 – Fmaj7?', steps: ['Gm7: B♭ (♭3), F (♭7).', 'C7: E (3), B♭ (♭7).', 'Fmaj7: A (3), E (7).'], answer: 'B♭ F → B♭ E → A E: F falls to E, then B♭ falls to A.' },
        { q: 'Which voice moves from G7 to Cmaj7, and how far?', steps: ['G7 guide tones F and B.', 'Cmaj7 guide tones E and B.'], answer: 'F falls a half step to E; B stays.' },
        { q: 'Play the guide tones of Am7 and D7 on the D and G strings.', steps: ['Am7: C (♭3), G (♭7). D7: F♯ (3), C (♭7).', 'C on the D string at the 10th fret, G on the G string at 12th; or G on the D string at 5 and C on the G string at 5.', 'From G 5 / C 5: D7 = F♯ 4 / C 5.'], answer: 'Am7 5 5 (D, G strings) → D7 4 5.', spots: ex(2, 'dom7', [-1, -1, 4, 5, -1, -1], 4) },
        { q: 'You\'re on Dm7 at x x 10 10 10 10. Where\'s the nearest G7 drop 2?', steps: ['Dm7 here = C F A D (low to high).', 'G7 = G B D F: keep F and D, move C to B and A to G.'], answer: 'x x 9 10 8 10 (B F G D).', spots: ex(7, 'dom7', [-1, -1, 9, 10, 8, 10], 9) },
        { q: 'Why don\'t the guide tones of Cmaj7 → Fmaj7 move by a half step?', steps: ['Cmaj7: E, B. Fmaj7: A, E.', 'E stays (3rd of C → 7th of F).', 'B falls to A: a whole step.'], answer: 'The major 7th of the first chord is a whole step above the next 3rd. It still moves by step.' },
        { q: 'In a solo over Dm7 – G7 – Cmaj7, which note do you land on at the moment each chord arrives?', steps: ['The 3rd of each: F, B, E.'], answer: 'F on Dm7, B on G7, E on Cmaj7 (approach each from a step away).' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Practise hearing **inside** the chord. Pick a voice (the top, or a guide tone) and follow only it through the changes, singing it. At first only the top voice is easy; with time the inner voices come out, and that\'s when progressions start to sound like music rather than chord names.' },
        { list: ['Play ii – V – I in guide tones and sing the upper note: C B B. Then the lower: F F E.', 'Play the drop-2 I – vi – ii – V and sing the top voice.', 'Over a looped ii – V – I, sing the 3rd of each chord as it arrives.'] },
      ],
      drills: [
        { label: 'Guide tones: where does each voice go?', quiz: 'l5-guide', minutes: 5, goal: '2 stars' },
        { label: 'Where did the top voice go?', quiz: 'l4-lead-ear', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Playing every chord in root position with its root on the 6th string.', right: 'Choose the inversion nearest the last chord. The bass can have the root; your voicing shouldn\'t jump.' },
        { wrong: 'Thinking voice leading needs full four-note chords.', right: 'Two guide tones are enough to hear the whole progression.' },
        { wrong: 'Letting the top voice jump around.', right: 'The top voice is the melody the ear follows: move it by step.' },
        { wrong: 'Moving every voice in the same direction every time.', right: 'Mix it: some voices hold, some go up, some go down.' },
        { wrong: 'Soloing with scale patterns and ignoring the changes.', right: 'Land on guide tones (especially the 3rd) as each chord arrives.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Slowly, naming the guide tones as you go. Sing the top voice once before playing each exercise.',
      challenge: { label: 'Guide tones in all twelve keys', ex: { label: 'Guide tones: the 3rds and 7ths through a circle progression', tab: 'guide' }, goal: 'then ii – V – I in guide tones round the circle of fifths in all twelve keys, two strings only, at 60 BPM', why: 'Moving guide tones without thinking, in every key, is the foundation of jazz comping, chord melody and playing the changes.' },
      goals: [
        { focus: 'Find them', tasks: [{ label: 'Guide tones: where does each voice go?', quiz: 'l5-guide', minutes: 6, goal: '2 stars' }] },
        { focus: 'Two notes', tasks: [{ label: 'The circle progression in guide tones', ex: { label: 'Guide tones: the 3rds and 7ths through a circle progression', tab: 'guide' }, minutes: 8, goal: 'no stops at 70 BPM' }] },
        { focus: 'Four notes', tasks: [{ label: 'I – vi – ii – V in drop 2, two positions', ex: { label: 'I – vi – ii – V in C with 7th chords, each moving to the nearest voicing', tab: 'vl7' }, minutes: 8 }] },
        { focus: 'Solo on the changes', tasks: [{ label: 'Target notes: land on the 3rd of each chord', tool: 'targets', minutes: 8 }] },
        { focus: 'Hear the voices', tasks: [{ label: 'Where did the top voice go?', quiz: 'l4-lead-ear', minutes: 4 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: [
          '**Looper**: record a ii – V – I bass line on track 1, guide tones on track 2, then solo on track 3 landing on the 3rds.',
          '**Jam**: comp a jazz or bossa progression with shells, then with guide tones only.',
          '**Fills between chords**: the fill workshops move the top voice by step between chords: voice leading as melody.',
          '**Songs**: re-voice the chords of a song you know so the top note walks by step.',
        ] },
      ],
      tasks: [
        { label: 'Target notes', tool: 'targets', minutes: 10 },
        { label: 'Jam: comp with guide tones', tool: 'jam', minutes: 10 },
        { label: 'Fills between chords', tool: 'fills', minutes: 8 },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Find the voices, hear them, play them, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Guide tones: where does each voice go?', quiz: 'l5-guide' },
        { skill: 'Hear', label: 'Where did the top voice go?', quiz: 'l4-lead-ear' },
        { skill: 'Play', label: 'I – vi – ii – V voice-led in drop 2 (mic)', ex: { label: 'I – vi – ii – V in C with 7th chords, each moving to the nearest voicing', tab: 'vl7' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Voice leading: guide tones and the smoothest path". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) the four rules of voice leading, (2) what guide tones are and why they matter, (3) how the 3rds and 7ths move when roots move by a 4th, (4) the guide tones of ii – V – I in a key you choose, (5) how to pick the next drop-2 voicing, (6) how guide tones help a solo. Keep it short.',
        points: ['keep common tones, move others by the smallest step, top voice = melody, mix directions', 'guide tones = 3rd and 7th: they define the chord', 'roots by 4ths: the 7th falls a step to the next 3rd; the 3rd stays as the next 7th', 'ii – V – I in C: F C → F B → E B', 'choose the inversion closest to the last chord', 'land on the 3rd of each new chord as it arrives'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'BXrByHNokiE', title: 'Chord Tone Soloing' },
      books: [
        { book: 'Harmony in Practice', where: 'The chapters on voice leading', why: 'The classical rules behind smooth voice leading, with exercises and answers to check.' },
        { book: 'Triads for the Improvising Guitarist', where: 'The parts on voice-leading triads through changes', why: 'Voice leading with triads on top of 7th chords: Daniel Seriff\'s small-window approach goes well with it.' },
        { book: 'Music Theory for Guitarists', where: 'The part on voice leading', why: 'A guitarist\'s view of moving voices.' },
      ],
      blocks: [
        { p: '**Next**: the Level 5 mastery check, then Level 6: chord tones, melody and soloing, where guide tones become the notes you solo with.' },
      ],
    },
  ],
}

// ---- Level 5 mastery check -----------------------------------------------------------------------------------------
export const LEVEL5_CHECK: CourseLesson = {
  id: 'c5-check', level: 5, n: 9, title: 'Level 5 mastery check', minutes: 30,
  goal: 'Show that chords are yours: diminished and augmented, seventh chords in shells and drop 2, the 7th chords of a key, colour chords, extensions, altered dominants, slash chords and voice leading, built, heard and played.',
  builds: ['all of Level 5'], topics: ['seventh chords', 'extensions', 'altered chords', 'slash chords', 'voice leading', 'ear'],
  steps: [
    {
      kind: 'why', title: 'Before Level 6', blocks: [
        { p: 'This check covers all of Level 5: chords in depth. It\'s **strongly suggested** before Level 6 (soloing on chord tones uses every chord you met here), but never required.' },
        { list: ['Take it when the practice goals feel easy.', 'Anything you miss points back to the right lesson.', 'Pass it and the Level 5 badge is yours; it comes back as a review later.'] },
      ],
    },
    {
      kind: 'check', title: 'The check', intro: 'Twelve parts across building, hearing and playing, then explain the level back to the teacher.',
      tasks: [
        { skill: 'Apply', label: 'Spell the 7th chord', quiz: 'l5-spell7' },
        { skill: 'Apply', label: 'The 7th chords of a key', quiz: 'l5-key7' },
        { skill: 'Apply', label: 'Guide tones: where does each voice go?', quiz: 'l5-guide' },
        { skill: 'Apply', label: 'Spell the extended chord', quiz: 'l5-spell-ext' },
        { skill: 'Apply', label: 'Spell the altered dominant', quiz: 'l5-spell-alt' },
        { skill: 'Hear', label: 'Triad types by ear', quiz: 'tr-ear' },
        { skill: 'Hear', label: 'Hear it: which 7th chord?', quiz: 'l5-7ths-ear' },
        { skill: 'Hear', label: 'Hear it: plain or altered dominant?', quiz: 'l5-alt-ear' },
        { skill: 'Hear', label: 'Hear it: which note is in the bass?', quiz: 'l5-bass-ear' },
        { skill: 'Play', label: 'ii – V – I, shells then drop 2 (mic)', ex: { label: 'ii – V – I in C: Dm7 G7 Cmaj7, shells then drop 2', tab: 'iiVI' } },
        { skill: 'Play', label: 'The descending slash-chord line (mic)', ex: { label: 'Slash chords: a bass line walking down under C – G/B – Am – Am/G – F – C/E – Dm7 – G', tab: 'slash' } },
        { skill: 'Play', label: 'I – vi – ii – V voice-led in drop 2 (mic)', ex: { label: 'I – vi – ii – V in C with 7th chords, each moving to the nearest voicing', tab: 'vl7' } },
      ],
      explain: {
        prompt: 'I just took the KGuitar Level 5 mastery check (augmented and diminished triads, the five 7th chords as shells and drop 2, the 7th chords of a key and ii – V – I, sus/add/6/power chords, extensions, altered dominants, slash chords and bass lines, voice leading with guide tones). Be my teacher for a short oral exam: ask me six questions across these topics, one at a time, including "spell and play the ii – V – I in B♭" and "what does a dim7 have to do with a 7♭9?", tell me what I got right and missed, and finish with which lesson to review if anything was shaky.',
        points: ['dim m3+m3, aug M3+M3; dim7 repeats every 3 frets, aug every 4', 'maj7 / 7 / m7 / m7♭5 / dim7 formulas; shells R 3 7; drop 2', 'key: maj7 m7 m7 maj7 7 m7 m7♭5; V7 has the tritone', 'sus replaces the 3rd, add keeps it; extensions include the 7th; 11 on minor, 13 on dominant', 'altered tones on dominants lean a half step into the next chord; 7♭9 = rootless dim7', 'slash = chord over bass; guide tones 3 and 7 move by step'],
      },
    },
  ],
}

export const LEVEL5_B: CourseLesson[] = [EXTENSIONS, ALTERED, SLASH, VOICE_LEADING, LEVEL5_CHECK]
