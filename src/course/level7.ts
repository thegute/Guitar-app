// Level 7 (Harmony in depth), lessons 1–4: cadences, harmonic and melodic minor in minor keys, secondary dominants and
// borrowed chords. Lessons 5–8 and the check are in level7b.ts. Every grip is checked note by note (low E first):
//   C x32010 · F 133211 · G 320003 · G7 320001 · Am x02210 · Dm xx0231 · Em 022000 · E7 020100 · E7♭9 020131
//   A7 x02020 · D7 xx0212 · C7 x32310 · B7 x21202 · Fm 133111 · A♭ 466544 · B♭ x13331 · E♭ x68886
import type { CourseLesson } from './types'
import { gripMarks, type Quality } from './l5Tabs'
import { scaleMarks } from './l6Tabs'

const G = [40, 45, 50, 55, 59, 64]
const notes = (frets: number[]) => frets.flatMap((f, i) => (f < 0 ? [] : [G[i] + f]))
const fig = (caption: string, root: number, q: Quality, frets: number[], near = 3) => ({ caption, from: 0, to: 13, marks: (m: number[]) => gripMarks(m, root, q, frets, near) })
const C = [-1, 3, 2, 0, 1, 0], F = [1, 3, 3, 2, 1, 1], Gc = [3, 2, 0, 0, 0, 3], G7 = [3, 2, 0, 0, 0, 1], Am = [-1, 0, 2, 2, 1, 0], Dm = [-1, -1, 0, 2, 3, 1]
const Em = [0, 2, 2, 0, 0, 0], E7 = [0, 2, 0, 1, 0, 0], E7b9 = [0, 2, 0, 1, 3, 1], A7 = [-1, 0, 2, 0, 2, 0], D7 = [-1, -1, 0, 2, 1, 2], C7 = [-1, 3, 2, 3, 1, 0], B7 = [-1, 2, 1, 2, 0, 2]
const Fm = [1, 3, 3, 1, 1, 1], Ab = [4, 6, 6, 5, 4, 4], Bb = [-1, 1, 3, 3, 3, 1]

// ---- Lesson 1: cadences --------------------------------------------------------------------------------------------
export const CADENCES: CourseLesson = {
  id: 'c7-cadences', level: 7, n: 1, title: 'Cadences: how phrases end', minutes: 70,
  goal: 'Recognise and use the four cadences (authentic, plagal, half and deceptive) as the punctuation of music, hear them in songs, play them in major and minor keys, and use them on purpose when you write, arrange or solo.',
  builds: ['the chords of a key', 'hearing the V → I pull', 'the 7th chords of a key'],
  topics: ['cadences', 'harmony', 'progressions', 'phrases', 'songwriting', 'ear'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Music is made of **phrases**, like sentences. The chords at the end of a phrase are its **punctuation**: a full stop, a comma, a question mark, an exclamation of surprise. Those endings are called **cadences**, and there are four you\'ll hear everywhere, from hymns to heavy metal.' },
        { p: 'Knowing them lets you hear where a song is going, predict the next chord, write sections that feel finished (or unfinished on purpose), and in a solo, know when to land and when to keep going.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['name and play the authentic, plagal, half and deceptive cadences in any key;', 'hear each one in a song;', 'use them in minor keys;', 'choose a cadence for the end of a verse, a chorus or a whole song.'] },
        { prog: { label: 'The four endings in C: G7 → C, F → C, ending on G, G7 → Am', chords: [notes(G7), notes(C), notes(F), notes(C), notes(C), notes(Gc), notes(G7), notes(Am)], gap: 0.9 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Authentic: V → I, the full stop', blocks: [
        { p: '**V → I** (or V7 → I): G7 → C in C. The strongest ending there is: the tritone in G7 resolves (B up to C, F down to E, Level 5), and the bass falls a 5th home. It sounds **finished**.' },
        { p: 'It\'s strongest (a **perfect** authentic cadence) when both chords have their root in the bass and the melody lands on the root. With the 3rd or 5th on top, it still ends, but more gently.' },
        { p: 'In a **minor key**: **V7 → i** (E7 → Am), with the V borrowed from harmonic minor (lesson 2).' },
        { spots: fig('G7 (3 2 0 0 0 1): the V7 of C. B (3) and F (♭7) resolve to C and E.', 7, 'dom7', G7, 1) },
      ],
    },
    {
      kind: 'learn', title: '2 · Plagal: IV → I, the "amen"', blocks: [
        { p: '**IV → I**: F → C in C. Softer than V → I, warm and settled, the "amen" at the end of a hymn. Rock and gospel love it: a song can end on IV → I and sound big rather than final.' },
        { p: 'A favourite twist borrows the **minor iv** (Fm → C): bittersweet and lush. That\'s lesson 4\'s borrowed chords.' },
        { spots: fig('F (1 3 3 2 1 1): the IV of C. C, the note F and C share, stays put; A falls to G, F falls to E.', 5, 'maj', F, 1) },
      ],
    },
    {
      kind: 'learn', title: '3 · Half and deceptive: the comma and the surprise', blocks: [
        { p: 'A **half cadence** ends **on V**: C – Am – F – **G**. It sounds unfinished, like a question or a comma: the music has to go on. It\'s the classic end of a verse or the first half of a chorus.' },
        { p: 'A **deceptive cadence** is **V → vi** instead of V → I: G7 → **Am**. The ear expects home and gets the relative minor: a surprise, often used to extend a song or delay the final ending ("one more time…").' },
        { list: ['Half: **anything → V** (I – V, ii – V, IV – V).', 'Deceptive: **V → vi** (or V → ♭VI for an even bigger surprise: G7 → A♭).'] },
        { video: { id: 'EknaUvmYB4k', title: 'Musical Cadences: Explained!', note: 'All four cadences, heard one after another.' } },
      ],
    },
    {
      kind: 'learn', title: '4 · Using cadences', blocks: [
        { list: [
          '**Writing**: end verses on a half cadence (keeps the listener waiting), choruses on an authentic one (the payoff).',
          '**Arranging**: delay the last chorus\'s ending with a deceptive cadence, then repeat the line and land on I.',
          '**Soloing**: phrase with the cadences: questions over half cadences, answers that land on the root over authentic ones.',
          '**Listening**: at the end of every section of a song, ask "full stop, comma, amen or surprise?"',
        ] },
      ],
    },
    {
      kind: 'learn', title: '5 · What mastery looks like', blocks: [
        { p: 'You own cadences when:' },
        { list: ['You can name a cadence from its chords in any major or minor key.', 'You hear all four in recordings, eight times out of ten.', 'You can play each one in C, G, D and A minor without looking anything up.', 'Your own chord progressions end the way you want them to.'] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Find the last two chords and their numbers.', examples: [
        { q: 'A song in G ends D7 → G. Which cadence?', steps: ['D7 = V7 of G, G = I.'], answer: 'Authentic.' },
        { q: 'A verse in D ends Bm → A. Which cadence?', steps: ['Bm = vi, A = V.', 'It stops on V.'], answer: 'Half.' },
        { q: 'In C, a phrase goes G7 → Am. Why does it sound like a surprise?', steps: ['G7 = V7: the ear expects C.', 'Am = vi: it shares C and E with C, so it\'s close, but it\'s minor.'], answer: 'Deceptive: V → vi instead of V → I.' },
        { q: 'Write a plagal ending in A.', steps: ['IV of A = D.'], answer: 'D → A (or Dm → A, borrowed).' },
        { q: 'Write an authentic cadence in E minor.', steps: ['v of E minor = Bm, raised to B7 with harmonic minor (D♯).'], answer: 'B7 → Em.', spots: fig('', 11, 'dom7', B7, 2) },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Hear each cadence as a feeling: **authentic** = finished, **plagal** = warm amen, **half** = waiting, **deceptive** = "wait, what?". Play a progression and stop on its last chord: do you want to go on?' },
      ],
      drills: [
        { label: 'Hear it: how does it end?', quiz: 'l3-cadence-ear', minutes: 5, goal: '8 out of 10' },
        { label: 'Name the cadence', quiz: 'l7-cadence', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Thinking only V → I is a "real" ending.', right: 'All four are tools: choose the punctuation the phrase needs.' },
        { wrong: 'Using Em (the natural minor v) for an authentic cadence in A minor.', right: 'Raise its 3rd: E or E7 (harmonic minor).' },
        { wrong: 'Calling any song ending on V an "unfinished" song.', right: 'Half cadences end sections, not songs (usually). The song goes on.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Say the cadence\'s name as you play its last chord.',
      challenge: { label: 'Cadences in three keys', ex: { label: 'Four endings in C: authentic (G7 – C), half (… – G), deceptive (G7 – Am), plagal (F – C)', tab: 'cadences' }, goal: 'then all four in G, D and A minor from memory, and name the cadence at the end of every section of three songs you know', why: 'Hearing them in real songs is the point.' },
      goals: [
        { focus: 'Name them', tasks: [{ label: 'Name the cadence', quiz: 'l7-cadence', minutes: 5, goal: '2 stars' }] },
        { focus: 'Play them', tasks: [{ label: 'The four endings in C', ex: { label: 'Four endings in C: authentic (G7 – C), half (… – G), deceptive (G7 – Am), plagal (F – C)', tab: 'cadences' }, minutes: 6 }] },
        { focus: 'Hear them', tasks: [{ label: 'Hear it: how does it end?', quiz: 'l3-cadence-ear', minutes: 5, goal: '2 stars' }] },
        { focus: 'Write with them', tasks: [{ label: 'Jam: an 8-bar progression ending half, then authentic', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['**Songs**: in your songbook, find a half cadence and a deceptive cadence.', '**Jam**: build a verse that ends on V and a chorus that ends V → I.', '**Looper**: loop a progression ending on a half cadence and solo a "question" over it, then an "answer" over the authentic ending.'] },
      ],
      tasks: [{ label: 'Jam: cadences', tool: 'jam', minutes: 10 }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Name them, hear them, play them, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Name the cadence', quiz: 'l7-cadence' },
        { skill: 'Hear', label: 'Hear it: how does it end?', quiz: 'l3-cadence-ear' },
        { skill: 'Play', label: 'The four endings (mic)', ex: { label: 'Four endings in C: authentic (G7 – C), half (… – G), deceptive (G7 – Am), plagal (F – C)', tab: 'cadences' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Cadences: how phrases end". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) the four cadences and their chords, (2) what each one feels like, (3) the authentic cadence in a minor key, (4) where songs use half and deceptive cadences. Give me two progressions and ask me to name their endings. Keep it short.',
        points: ['authentic V → I, plagal IV → I, half → V, deceptive V → vi', 'full stop, amen, comma/question, surprise', 'minor: V7 → i with the raised 7th (E7 → Am)', 'half at the end of verses; deceptive to delay the final ending'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'YFe7Jchras0', title: 'The Circle of Fifths Explained for Guitar' },
      books: [
        { book: 'Harmony in Practice', where: 'The chapters on cadences', why: 'The classical detail (perfect and imperfect, the cadential 6/4) with exercises.' },
        { book: 'Music Theory for Guitarists', where: 'The part on cadences', why: 'A guitarist\'s view of the same four endings.' },
      ],
      blocks: [{ p: '**Next**: minor keys in depth: why minor songs borrow from harmonic and melodic minor.' }],
    },
  ],
}

// ---- Lesson 2: harmonic and melodic minor ---------------------------------------------------------------------------
export const MINOR_KEYS: CourseLesson = {
  id: 'c7-minor', level: 7, n: 2, title: 'Harmonic and melodic minor in minor keys', minutes: 80,
  goal: 'Understand why minor keys raise the 7th (and sometimes the 6th), build the chords that come from it (V7, vii°7, III+), play the harmonic and melodic minor scales, and use the mix of natural, harmonic and melodic minor that real minor-key music uses.',
  builds: ['the natural minor scale', 'minor keys', 'cadences', 'altered dominants'],
  topics: ['harmonic minor', 'melodic minor', 'minor keys', 'leading note', 'V7 in minor', 'scales'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'In the natural minor scale the v chord is **minor** (Em in A minor), and minor v doesn\'t pull home: it has no **leading note** a half step below the root. So for centuries, minor-key music has **raised the 7th** (G → G♯ in A minor) to get the strong V7 → i. That one change gives the **harmonic minor** scale, and with it the sound of flamenco, tango, classical minor keys, metal and film villains.' },
        { p: 'Raise the 6th as well and you get the **melodic minor**, which smooths out a melody going up, and is a whole world of jazz sounds (Level 8).' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['play A natural, harmonic and melodic minor and hear the difference;', 'build the chords harmonic minor gives (E7, G♯dim7, C+);', 'use i – iv – V7 – i and its variations;', 'know which version of minor to use where.'] },
        { prog: { label: 'Am – Dm – Em – Am, then Am – Dm – E7 – Am: hear the G♯', chords: [notes(Am), notes(Dm), notes(Em), notes(Am), notes(Am), notes(Dm), notes(E7), notes(Am)], gap: 0.9 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Three minor scales', blocks: [
        { list: [
          '**Natural minor** (Aeolian): A B C D E F G. Sad, folky, rock.',
          '**Harmonic minor**: A B C D E F **G♯**. The 7th raised: a leading note, and a wide **augmented 2nd** (F to G♯, three frets) that sounds Middle-Eastern or classical.',
          '**Melodic minor**: A B C D E **F♯ G♯**. The 6th raised too, smoothing out that gap. Classical music uses it going up and returns to natural minor coming down; jazz uses it both ways.',
        ] },
        { spots: { caption: 'A harmonic minor, frets 4–8. The target is the raised 7th (G♯), the note that makes E7 and pulls up to A.', from: 0, to: 10, marks: m => scaleMarks(m, 9, [0, 2, 3, 5, 7, 8, 11], 4, 8, [11]) } },
      ],
    },
    {
      kind: 'learn', title: '2 · The chords harmonic minor gives', blocks: [
        { p: 'Build chords from A harmonic minor and three new ones appear:' },
        { list: ['**V7 = E7** (E G♯ B D): the strong dominant. With the next 3rd, **E7♭9** (adds F, Level 5).', '**vii°7 = G♯dim7** (G♯ B D F): a full diminished 7th, E7♭9 without its root.', '**III+ = C+** (C E G♯): an augmented triad, dramatic.'] },
        { p: 'Most minor-key songs mix: **i, iv, ♭VI, ♭VII** from natural minor (Am, Dm, F, G) and **V7** from harmonic minor (E7). A progression like **Am – G – F – E7** uses both and is one of the most played in the world (flamenco and countless rock songs).' },
        { spots: fig('E7 (0 2 0 1 0 0): the V7 of A minor. G♯ (its 3rd, on the G string) is the leading note into A.', 4, 'dom7', E7, 1) },
      ],
    },
    {
      kind: 'learn', title: '3 · Which minor where?', blocks: [
        { list: [
          '**Over the i and iv chords** (Am, Dm): natural minor (or Dorian, Level 8).',
          '**Over the V7** (E7): harmonic minor: the G♯ is the chord\'s 3rd. Play natural minor\'s G over E7 and it clashes.',
          '**A melody going up to the root**: melodic minor (F♯ G♯ A) is smoothest.',
          '**Over ♭VI and ♭VII** (F, G): natural minor again.',
        ] },
        { p: 'So a guitarist soloing over Am – G – F – E7 changes one note: G over the first three chords, G♯ over E7. That single note makes the solo follow the harmony.' },
        { video: { id: 'h-vidjPJZg0', title: '3-Minute Theory #39: Harmonic Minor Scale', note: 'The scale and the chords it gives.' } },
        { video: { id: 'Ekml3enKF-E', title: '3-Minute Theory #41: Melodic Minor Scale', note: 'Melodic minor: why the 6th goes up too.' } },
      ],
    },
    {
      kind: 'learn', title: '4 · What mastery looks like', blocks: [
        { p: 'You own minor keys when:' },
        { list: ['You play A natural, harmonic and melodic minor in one position and hear which is which.', 'You can name the V7 of any minor key (raise the 3rd of v).', 'Over i – iv – V7 – i you change G to G♯ on the V7 without thinking.', 'You can play Am – G – F – E7 and E7♭9 → Am in two positions.'] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Natural minor first, then raise what you need.', examples: [
        { q: 'What is the V7 of D minor?', steps: ['v of D minor = A minor (A C E).', 'Raise C to C♯: A C♯ E G.'], answer: 'A7.' },
        { q: 'Spell E harmonic minor.', steps: ['E natural minor: E F♯ G A B C D.', 'Raise D to D♯.'], answer: 'E F♯ G A B C D♯.' },
        { q: 'Over B7 in E minor, which note changes from the natural minor scale?', steps: ['B7 = B D♯ F♯ A.'], answer: 'D → D♯.' },
        { q: 'Why does harmonic minor sound "exotic"?', steps: ['Between the 6th (F) and raised 7th (G♯) there\'s a gap of three frets.'], answer: 'The augmented 2nd (F to G♯).' },
        { q: 'A melody in A minor climbs E – F♯ – G♯ – A. Which minor?', steps: ['Both the 6th and 7th raised.'], answer: 'Melodic minor (going up).' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Hear the **leading note**: the raised 7th sounds like it\'s leaning into the root. Hear the **gap** in harmonic minor (F to G♯). And hear the brighter, smoother top of melodic minor.' },
        { list: ['Play the three scales one after the other and sing along.', 'Play Am – Dm – Em – Am, then Am – Dm – E7 – Am. Which ending sounds finished?'] },
      ],
      drills: [
        { label: 'Hear it: which scale?', quiz: 'l3-scale-ear', minutes: 4 },
        { label: 'Hear it: how does it end?', quiz: 'l3-cadence-ear', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Playing natural minor\'s G over E7.', right: 'Over the V7, use G♯ (harmonic minor).' },
        { wrong: 'Using harmonic minor over every chord of a minor key.', right: 'Its G♯ clashes with G chords (♭VII) and sounds strange over Am7. Use it where the V is.' },
        { wrong: 'Thinking melodic minor is only a classical exercise.', right: 'It\'s the source of many jazz sounds (Level 8).' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Say "natural", "harmonic" or "melodic" as you play each scale. Over chords, name the chord as you change note.',
      challenge: { label: 'A minor-key solo that follows the V', ex: { label: 'A minor with the borrowed V: Am – Dm – Em (natural) vs E7 and E7♭9 (harmonic minor)', tab: 'minorV' }, goal: 'then loop Am – G – F – E7 and improvise for two minutes, playing G over the first three chords and G♯ over E7, then do it in E minor', why: 'Switching scale with the chord is the skill; a new key proves it.' },
      goals: [
        { focus: 'Three scales', tasks: [{ label: 'Natural, harmonic and melodic minor', ex: { label: 'A natural, harmonic and melodic minor, up and back (listen to the 6th and 7th)', tab: 'minorScales' }, minutes: 6, goal: 'clean at 76 BPM' }] },
        { focus: 'The V in minor', tasks: [{ label: 'Am – Dm – Em vs E7 and E7♭9', ex: { label: 'A minor with the borrowed V: Am – Dm – Em (natural) vs E7 and E7♭9 (harmonic minor)', tab: 'minorV' }, minutes: 6 }] },
        { focus: 'Hear them', tasks: [{ label: 'Hear it: which scale?', quiz: 'l3-scale-ear', minutes: 4 }] },
        { focus: 'Solo over it', tasks: [{ label: 'Jam: Am – G – F – E7', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['**Jam**: a minor style (flamenco, metal, Latin): solo with the harmonic-minor G♯ over the V.', '**Licks**: neoclassical and metal licks use harmonic minor runs: try them over E7 → Am.', '**Songbook**: find a minor-key song and spot the major V.'] },
      ],
      tasks: [{ label: 'Jam: minor key with the major V', tool: 'jam', minutes: 10 }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Name them, hear them, play them, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Name the cadence (minor keys too)', quiz: 'l7-cadence' },
        { skill: 'Hear', label: 'Hear it: which scale?', quiz: 'l3-scale-ear' },
        { skill: 'Play', label: 'The three minor scales (mic)', ex: { label: 'A natural, harmonic and melodic minor, up and back (listen to the 6th and 7th)', tab: 'minorScales' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Harmonic and melodic minor in minor keys". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) why minor keys raise the 7th, (2) the three minor scales in A, (3) the chords harmonic minor gives, (4) which minor to use over which chord of Am – G – F – E7. Ask me for the V7 of a minor key I don\'t expect. Keep it short.',
        points: ['natural minor v has no leading note: raise the 7th for V7 → i', 'A natural A–G, harmonic with G♯, melodic with F♯ G♯', 'E7 (E7♭9), G♯dim7, C+', 'G over Am, G, F; G♯ over E7'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'VTITl8OGoII', title: 'Music Theory - Minor Keys Explained - Chords, Scales and Function' },
      books: [
        { book: 'Music Theory for Guitarists', where: 'The chapters on minor keys and the minor scales', why: 'All three minors and their chords.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'The minor scales chapter', why: 'Positions and how to use them.' },
      ],
      blocks: [{ p: '**Next**: secondary dominants: borrowing V7 → I for any chord of the key.' }],
    },
  ],
}

// ---- Lesson 3: secondary dominants ---------------------------------------------------------------------------------
export const SEC_DOM: CourseLesson = {
  id: 'c7-secdom', level: 7, n: 3, title: 'Secondary dominants: a V7 for every chord', minutes: 80,
  goal: 'Build the secondary dominant (V7/x) of any chord in a key, hear the non-key note it brings, use them to make any chord feel like a brief new home, chain them round the circle of fifths, and solo over them by targeting their 3rds.',
  builds: ['the 7th chords of a key', 'cadences', 'the circle of fifths', 'targeting chord tones'],
  topics: ['secondary dominants', 'tonicization', 'harmony', 'progressions', 'jazz', 'ragtime', 'soloing'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'V7 → I is the strongest pull in music. **Secondary dominants** borrow that pull for the **other** chords of the key: for a moment, Dm or Am or G becomes a little home, approached by its own V7. In C, **A7 → Dm**, **E7 → Am**, **D7 → G**. Each brings one note from outside the key, and that note is what makes it sound so purposeful.' },
        { p: 'They\'re everywhere: ragtime, swing, country, Beatles-era pop, gospel, jazz standards, folk songs. Once you know them, a whole layer of "mystery chords" in songbooks makes sense.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['find V7 of ii, iii, IV, V and vi in any key;', 'hear the outside note each one brings;', 'add secondary dominants to a plain progression;', 'chain them (E7 – A7 – D7 – G7 – C);', 'solo over them by landing on their 3rds.'] },
        { prog: { label: 'C – Am – Dm – G7 – C, then C – A7 – Dm – G7 – C', chords: [notes(C), notes(Am), notes(Dm), notes(G7), notes(C), notes(A7), notes(Dm), notes(G7), notes(C)], gap: 0.8 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Building V7/x', blocks: [
        { p: 'To lead into any chord: go **up a 5th from its root** and make that a **dominant 7th**. In C:' },
        { list: ['**V7/ii**: Dm ← **A7** (brings C♯)', '**V7/iii**: Em ← **B7** (brings D♯)', '**V7/IV**: F ← **C7** (brings B♭)', '**V7/V**: G ← **D7** (brings F♯)', '**V7/vi**: Am ← **E7** (brings G♯)'] },
        { p: 'The outside note is always the **leading note of the target** (a half step below its root: C♯ → D, G♯ → A), or for V7/IV, the ♭7 (B♭) that falls to A. No V7/vii°: a diminished chord can\'t act as a home.' },
        { spots: fig('A7 (x 0 2 0 2 0): V7/ii in C. Its C♯ (on the B string) leads up to D.', 9, 'dom7', A7, 1) },
      ],
    },
    {
      kind: 'learn', title: '2 · Using them', blocks: [
        { p: 'The simplest move: **replace the chord before a target with the target\'s V7**. In C – Am – Dm – G, the Am comes before Dm, so make it **A7**: C – A7 – Dm – G7. The melody note usually still fits (A7 has A, C♯, E, G; Am had A, C, E: only one note changed).' },
        { list: ['**C – E7 – Am**: the classic "into the relative minor" move.', '**C – D7 – G**: V of V, a lift before the dominant (in country and bluegrass it\'s the II7 chord).', '**C – C7 – F**: turning I into V7/IV on the way to the IV chord (gospel, blues, folk).'] },
        { video: { id: 'FdyOMwXxJYU', title: 'What Are Secondary Dominants & How to Use Them - Guitar Lesson', note: 'Secondary dominants on the guitar, with examples.' } },
      ],
    },
    {
      kind: 'learn', title: '3 · Chains round the circle', blocks: [
        { p: 'Each dominant can lead to another dominant, a 5th lower each time: **E7 – A7 – D7 – G7 – C**. Every chord is the V7 of the next, all the way home. This "circle of dominants" is the sound of ragtime, early jazz, swing and countless standards\' bridges.' },
        { p: 'You can start the chain anywhere: B7 – E7 – A7 – D7 – G7 – C goes even further round. Lesson 7 will show how to make the bass walk down chromatically instead (tritone subs).' },
      ],
    },
    {
      kind: 'learn', title: '4 · Soloing over secondary dominants', blocks: [
        { p: 'Over a secondary dominant, the key\'s scale has **one wrong note**: the chord\'s 3rd is outside the key. So:' },
        { list: ['Over **A7** in C, play C♯ (not C).', 'Over **E7**, play G♯ (not G): it\'s A harmonic minor for a moment.', 'Over **D7**, play F♯.', 'Easiest of all: **land on the chord\'s 3rd** as it arrives (lesson 6.3): that one note does the work.'] },
      ],
    },
    {
      kind: 'learn', title: '5 · What mastery looks like', blocks: [
        { p: 'You own secondary dominants when:' },
        { list: ['You can name V7/ii, V7/iii, V7/IV, V7/V and V7/vi in C, G, D and F quickly.', 'You can add them to any simple progression, and say what outside note each brings.', 'You can play the chain E7 – A7 – D7 – G7 – C in two positions.', 'In a solo, you land on the 3rd of each secondary dominant.', 'You hear them in songs (a major chord where you expect a minor, pulling to the next).'] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Find the target, go up a 5th, make it a 7.', examples: [
        { q: 'Key of G: what is V7/vi?', steps: ['vi of G = Em.', 'A 5th above E = B: B7.'], answer: 'B7 (brings D♯, leading to E).' },
        { q: 'Key of D: add a secondary dominant to D – Bm – Em – A.', steps: ['Bm comes before Em: V7 of Em = B7.'], answer: 'D – B7 – Em – A7.' },
        { q: 'A song in C has an E7. What will probably come next?', steps: ['E7 = V7 of A.'], answer: 'Am (or A).' },
        { q: 'Over D7 in the key of C, which note of the C major scale clashes?', steps: ['D7 = D F♯ A C.', 'C major has F.'], answer: 'F: play F♯.' },
        { q: 'Extend C – G7 – C with a chain of dominants.', steps: ['G7 is V7 of C; D7 is V7 of G; A7 is V7 of D.'], answer: 'C – A7 – D7 – G7 – C.', spots: fig('', 2, 'dom7', D7, 2) },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'A secondary dominant sounds like **a major chord where you expected minor, with a pull**. Play C – Am – Dm, then C – A7 – Dm: the C♯ makes the Dm feel like a landing.' },
      ],
      drills: [
        { label: 'Hear it: which chord was changed?', quiz: 'l7-colour-ear', minutes: 5, goal: '7 out of 9' },
        { label: 'Find the secondary dominant', quiz: 'l7-secdom', minutes: 5 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Playing A minor scale notes (C) over A7 in a song in C.', right: 'Over A7, its 3rd is C♯. Land on it.' },
        { wrong: 'Making the secondary dominant a maj7 or minor chord.', right: 'It must be a dominant 7th (or at least major) to have the leading note.' },
        { wrong: 'Thinking the song has changed key.', right: 'One V7 → target is a brief visit (tonicization). A key change stays (lesson 5).' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Name the target as you play each secondary dominant ("A7 to D minor").',
      challenge: { label: 'Reharmonise a tune with secondary dominants', ex: { label: 'Secondary dominants in C: A7 → Dm, E7 → Am, D7 → G, C7 → F, B7 → Em', tab: 'secDom' }, goal: 'then take a simple folk or pop song you know (four chords) and add at least two secondary dominants, playing it through with the melody still fitting', why: 'Using them in real songs is what makes them yours.' },
      goals: [
        { focus: 'Find them', tasks: [{ label: 'Find the secondary dominant', quiz: 'l7-secdom', minutes: 6, goal: '2 stars' }] },
        { focus: 'Play them', tasks: [{ label: 'Every secondary dominant in C', ex: { label: 'Secondary dominants in C: A7 → Dm, E7 → Am, D7 → G, C7 → F, B7 → Em', tab: 'secDom' }, minutes: 8 }] },
        { focus: 'Hear them', tasks: [{ label: 'Hear it: which chord was changed?', quiz: 'l7-colour-ear', minutes: 5, goal: '2 stars' }] },
        { focus: 'Solo over them', tasks: [{ label: 'Jam: C – A7 – Dm – G7, landing on C♯ over A7', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['**Jam**: turn I – vi – ii – V into I – VI7 – II7 – V7 (C – A7 – D7 – G7): the ragtime and swing turnaround.', '**Bluegrass and country**: the II7 chord (D7 in C, A7 in G) is V7/V.', '**Target notes**: practise landing on the new 3rds.'] },
      ],
      tasks: [{ label: 'Jam: secondary dominants', tool: 'jam', minutes: 10 }, { label: 'Target notes', tool: 'targets', minutes: 6 }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Find them, hear them, play them, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Find the secondary dominant', quiz: 'l7-secdom' },
        { skill: 'Hear', label: 'Hear it: which chord was changed?', quiz: 'l7-colour-ear' },
        { skill: 'Play', label: 'Secondary dominants in C (mic)', ex: { label: 'Secondary dominants in C: A7 → Dm, E7 → Am, D7 → G, C7 → F, B7 → Em', tab: 'secDom' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Secondary dominants". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) how to build V7 of any chord, (2) the secondary dominants of C and the note each brings, (3) how to add them to a progression, (4) a chain of dominants, (5) what to play over them in a solo. Ask me for one in a key I don\'t expect. Keep it short.',
        points: ['up a 5th from the target, dominant 7th', 'A7 (C♯) → Dm, B7 (D♯) → Em, C7 (B♭) → F, D7 (F♯) → G, E7 (G♯) → Am', 'replace the chord before the target with its V7', 'E7 – A7 – D7 – G7 – C', 'land on its 3rd, the note outside the key'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'AjnrjSavuVc', title: 'Understanding the II-V-I Progression: Introduction to Jazz Guitar' },
      books: [
        { book: 'Music Theory for Guitarists', where: 'The chapter on secondary dominants', why: 'Every secondary dominant and secondary ii – V.' },
        { book: 'Harmony in Practice', where: 'The chapters on applied (secondary) dominants', why: 'Exercises in adding them, with answers.' },
      ],
      blocks: [{ p: '**Next**: borrowed chords: colours from the parallel minor.' }],
    },
  ],
}

// ---- Lesson 4: borrowed chords -------------------------------------------------------------------------------------
export const BORROWED: CourseLesson = {
  id: 'c7-borrowed', level: 7, n: 4, title: 'Borrowed chords: colours from the parallel minor', minutes: 75,
  goal: 'Use chords borrowed from the parallel minor key (iv, ♭VI, ♭VII, ♭III) in a major key, know the classic moves (IV – iv – I, ♭VI – ♭VII – I, ♭VII – IV – I), hear their bittersweet or heroic colour, and solo over them.',
  builds: ['the chords of a key', 'minor keys', 'secondary dominants'],
  topics: ['borrowed chords', 'modal interchange', 'modal mixture', 'iv minor', 'rock', 'pop', 'film music'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'C major and C minor share the same home note. So a song in C major can **borrow** chords from C minor for a moment: **Fm** (iv), **A♭** (♭VI), **B♭** (♭VII), **E♭** (♭III). These are the chords that make a pop ballad suddenly ache, a rock anthem sound heroic, a film score swell.' },
        { p: 'This is called **modal interchange** (or modal mixture), and it\'s one of the most used colours in modern songwriting.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['name the borrowed chords of any major key;', 'play the classic borrowed moves;', 'hear the difference between IV and iv, and between ♭VII and V;', 'solo over borrowed chords by changing the one or two notes that move.'] },
        { prog: { label: 'C – F – Fm – C: the "minor four"', chords: [notes(C), notes(F), notes(Fm), notes(C)], gap: 1.1 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Where they come from', blocks: [
        { p: 'C natural minor is C D E♭ F G A♭ B♭. Its chords: Cm, D°, **E♭**, **Fm**, Gm, **A♭**, **B♭**. The ones that sound great in C **major**:' },
        { list: ['**iv** (Fm): the bittersweet one. A♭ falls to G.', '**♭VI** (A♭): the dreamy, epic one.', '**♭VII** (B♭): the rock one. Strong, open, a little bluesy.', '**♭III** (E♭): the bold one.'] },
        { spots: fig('Fm (1 3 3 1 1 1): iv borrowed in C. Its A♭ (G string) is the note that makes it ache: it falls to G.', 5, 'min', Fm, 1) },
      ],
    },
    {
      kind: 'learn', title: '2 · The classic moves', blocks: [
        { list: [
          '**IV – iv – I** (F – Fm – C): the most famous. The A on top becomes A♭ and falls to G. Ballads, Beatles, soul.',
          '**♭VI – ♭VII – I** (A♭ – B♭ – C): the heroic, triumphant rise (video-game and film endings, rock anthems).',
          '**♭VII – IV – I** (B♭ – F – C): classic rock, a plagal cadence with a twist.',
          '**I – ♭III – IV** (C – E♭ – F): big, bluesy rock riffs.',
          '**Picardy third** (the other way round): a minor-key song ending on a **major** I chord (Am … → A). Bright, hopeful, centuries old.',
        ] },
        { spots: fig('A♭ (4 6 6 5 4 4): ♭VI, borrowed from C minor.', 8, 'maj', Ab, 4) },
        { video: { id: 'MoCxq-Ttuz8', title: 'Modal Interchange: Guitar Lesson, Part 1', note: 'Borrowed chords on the guitar, with the classic moves.' } },
      ],
    },
    {
      kind: 'learn', title: '3 · Soloing over borrowed chords', blocks: [
        { p: 'Over a borrowed chord, the notes that changed are the ones to watch:' },
        { list: ['Over **Fm**: A♭ instead of A.', 'Over **A♭** and **B♭**: A♭ and B♭ instead of A and B (C minor notes).', 'The simplest approach: over the borrowed chords, play **C minor pentatonic** (C E♭ F G B♭) or C natural minor; back to C major over the other chords.'] },
        { p: 'Or land on each borrowed chord\'s 3rd: A♭ over Fm, C over A♭, D over B♭.' },
      ],
    },
    {
      kind: 'learn', title: '4 · What mastery looks like', blocks: [
        { p: 'You own borrowed chords when:' },
        { list: ['You can name iv, ♭VI, ♭VII and ♭III of any major key.', 'You can play IV – iv – I, ♭VI – ♭VII – I and ♭VII – IV – I in C, G and D.', 'You hear when a song borrows (a sudden darker, warmer chord).', 'You change notes in a solo over the borrowed chords.'] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Think of the parallel minor key.', examples: [
        { q: 'Borrowed iv, ♭VI and ♭VII in G major?', steps: ['G minor: G A B♭ C D E♭ F.', 'iv = Cm, ♭VI = E♭, ♭VII = F.'], answer: 'Cm, E♭, F.' },
        { q: 'In D, play the heroic rise to the tonic.', steps: ['♭VI of D = B♭, ♭VII = C.'], answer: 'B♭ – C – D.' },
        { q: 'A song in C goes C – B♭ – F – C. Which chord is borrowed?', steps: ['B♭ isn\'t in C major; it\'s ♭VII from C minor.'], answer: 'B♭ (♭VII).', spots: fig('', 10, 'maj', Bb, 1) },
        { q: 'Over Fm in a song in C, which note changes in your solo?', steps: ['Fm = F A♭ C; C major has A.'], answer: 'A → A♭.' },
        { q: 'A song in A minor ends on A major. What is that called?', steps: ['A minor-key piece ending on a major I.'], answer: 'A Picardy third.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Borrowed chords sound like a cloud passing over the sun: **darker, warmer, a bit sad or a bit epic**. Play F then Fm: the only change is A → A♭, and the whole mood changes.' },
      ],
      drills: [
        { label: 'Hear it: which chord was changed?', quiz: 'l7-colour-ear', minutes: 5 },
        { label: 'Borrowed or not?', quiz: 'l7-borrowed', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Thinking a song with B♭ in C has changed key.', right: 'A borrowed ♭VII is a colour. The home is still C.' },
        { wrong: 'Playing A (from C major) over Fm.', right: 'Play A♭ over Fm.' },
        { wrong: 'Borrowing so much the major key disappears.', right: 'One or two borrowed chords for colour; the rest from the key.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Name each borrowed chord\'s number (iv, ♭VI…) as you play it.',
      challenge: { label: 'Borrowed chords in your own progression', ex: { label: 'Borrowed from C minor: C – Fm – C, C – A♭ – B♭ – C, C – B♭ – F – C, C – E♭ – F – C', tab: 'borrowed' }, goal: 'then write an 8-bar progression in G that uses iv and ♭VI – ♭VII – I, loop it, and solo over it changing notes on the borrowed chords', why: 'Writing and soloing with them makes the colour yours.' },
      goals: [
        { focus: 'Name them', tasks: [{ label: 'Borrowed or not?', quiz: 'l7-borrowed', minutes: 5, goal: '2 stars' }] },
        { focus: 'Play them', tasks: [{ label: 'The classic borrowed moves', ex: { label: 'Borrowed from C minor: C – Fm – C, C – A♭ – B♭ – C, C – B♭ – F – C, C – E♭ – F – C', tab: 'borrowed' }, minutes: 8 }] },
        { focus: 'Hear them', tasks: [{ label: 'Hear it: which chord was changed?', quiz: 'l7-colour-ear', minutes: 5, goal: '2 stars' }] },
        { focus: 'Solo over them', tasks: [{ label: 'Jam: C – A♭ – B♭ – C', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['**Inspire me (Jam)**: many chord palettes include borrowed chords: spot them.', '**Your songs**: change one IV to iv in the last chorus.', '**Rock**: write a riff on I – ♭VII – IV.'] },
      ],
      tasks: [{ label: 'Jam: borrowed chords', tool: 'jam', minutes: 10 }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Name them, hear them, play them, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Borrowed or not?', quiz: 'l7-borrowed' },
        { skill: 'Hear', label: 'Hear it: which chord was changed?', quiz: 'l7-colour-ear' },
        { skill: 'Play', label: 'The borrowed moves (mic)', ex: { label: 'Borrowed from C minor: C – Fm – C, C – A♭ – B♭ – C, C – B♭ – F – C, C – E♭ – F – C', tab: 'borrowed' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Borrowed chords". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) where borrowed chords come from, (2) iv, ♭VI, ♭VII and ♭III in C, (3) the classic moves and what they sound like, (4) what to play over them in a solo, (5) what a Picardy third is. Keep it short.',
        points: ['from the parallel minor (same home note)', 'Fm, A♭, B♭, E♭', 'IV – iv – I bittersweet; ♭VI – ♭VII – I heroic; ♭VII – IV – I rock', 'change the notes that moved (A♭, B♭), or C minor pentatonic', 'a minor-key piece ending on a major I'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'VTITl8OGoII', title: 'Music Theory - Minor Keys Explained - Chords, Scales and Function' },
      books: [
        { book: 'Music Theory for Guitarists', where: 'The part on modal interchange', why: 'Borrowed chords from every mode, not just minor.' },
        { book: 'Harmony in Practice', where: 'The chapters on mixture', why: 'Exercises in using borrowed chords.' },
      ],
      blocks: [{ p: '**Next**: key centres and key changes: when a song really moves home.' }],
    },
  ],
}

export const LEVEL7_A: CourseLesson[] = [CADENCES, MINOR_KEYS, SEC_DOM, BORROWED]
