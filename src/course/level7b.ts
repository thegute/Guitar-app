// Level 7 (Harmony in depth), lessons 5–8 and the mastery check: key centres and key changes, diatonic substitution and
// reharmonisation, tritone subs and passing diminished chords, analysing real songs (traditional pieces only).
// Grips (low E first): D xx0232 · A x02220 · Bm x24432 · F♯m 244222 · E 022100 · D♭7 shell x434 · E♭7 shell x656
import type { CourseLesson } from './types'
import { gripMarks, type Quality } from './l5Tabs'

const G = [40, 45, 50, 55, 59, 64]
const notes = (frets: number[]) => frets.flatMap((f, i) => (f < 0 ? [] : [G[i] + f]))
const fig = (caption: string, root: number, q: Quality, frets: number[], near = 3, bass?: number) => ({ caption, from: 0, to: 13, marks: (m: number[]) => gripMarks(m, root, q, frets, near, bass) })
const C = [-1, 3, 2, 0, 1, 0], F = [1, 3, 3, 2, 1, 1], Gc = [3, 2, 0, 0, 0, 3], G7 = [3, 2, 0, 0, 0, 1], Am = [-1, 0, 2, 2, 1, 0], D7 = [-1, -1, 0, 2, 1, 2]
const D = [-1, -1, 0, 2, 3, 2], A7 = [-1, 0, 2, 0, 2, 0], E = [0, 2, 2, 1, 0, 0], Am7 = [-1, 0, 2, 0, 1, 0], Dm7 = [-1, -1, 0, 2, 1, 1], Cmaj7 = [-1, 3, 2, 0, 0, 0]
const sDm7 = [-1, 5, 3, 5, -1, -1], sG7 = [3, -1, 3, 4, -1, -1], sCmaj7 = [-1, 3, 2, 4, -1, -1], sDb7 = [-1, 4, 3, 4, -1, -1]

// ---- Lesson 5: key centres and key changes -------------------------------------------------------------------------
export const KEY_CHANGES: CourseLesson = {
  id: 'c7-keys', level: 7, n: 5, title: 'Key centres and key changes', key: 0, minutes: 75,
  goal: 'Find the key centre of a song (and notice when it moves), tell a brief visit (tonicisation) from a real key change (modulation), and use the main ways songs change key: pivot chords, a new V7, direct lifts, and moves to the relative or parallel key.',
  builds: ['keys and the circle of fifths', 'secondary dominants', 'borrowed chords', 'cadences'],
  topics: ['key changes', 'modulation', 'pivot chord', 'key centre', 'circle of fifths', 'songwriting'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Every song has a **home**: the key centre. Most stay there. But many move: a bridge goes somewhere new, the last chorus lifts up a step, a verse in minor opens into a chorus in major. If you can hear and see those moves, you know which scale to solo with at every moment, and you can write songs that travel.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['find the key centre from the chords;', 'tell a brief visit from a real change of key;', 'change key with a pivot chord, with the new key\'s V7, and directly;', 'use relative and parallel key moves;', 'follow a key change in a solo.'] },
      ],
    },
    {
      kind: 'learn', title: '1 · Finding the key centre', blocks: [
        { p: 'Clues, from strongest to weakest:' },
        { list: ['**A V7 → I** cadence: the I is home.', '**The last chord** of the song (usually home).', '**The chord the song keeps returning to**.', '**The notes**: which key\'s scale contains all the chords? (Level 2)'] },
        { p: 'A song in C with lots of Am might be in C or in A minor: listen for which chord feels like rest, and for E7 (pointing to A minor) or G7 (pointing to C).' },
      ],
    },
    {
      kind: 'learn', title: '2 · A visit or a move?', blocks: [
        { p: '**Tonicisation**: one secondary dominant and its target (A7 → Dm in C). The music visits Dm and comes straight back: still in C.' },
        { p: '**Modulation**: the music settles in a new key: new chords, a new V7 → I, maybe a cadence. Then it may or may not come back.' },
        { tip: 'Rule of thumb: if the new home lasts a phrase or more, and has its own cadence, it\'s a key change. If it\'s one chord, it\'s a visit.' },
      ],
    },
    {
      kind: 'learn', title: '3 · Four ways to change key', blocks: [
        { list: [
          '**Pivot chord**: a chord that belongs to both keys. **Am** is vi in C and ii in G: C – F – **Am** – D7 – G. The ear hears Am as the old key, then D7 reveals the new one. Smooth.',
          '**The new V7**: just play the new key\'s V7: C … **A7** → D. Clear and strong.',
          '**Direct (truck-driver)**: jump up a half or whole step for the last chorus, often with no preparation. Big lift, very pop.',
          '**Relative and parallel**: verse in A minor, chorus in C major (relative: same notes); or C major ↔ C minor (parallel: same home).',
        ] },
        { p: 'Keys next to each other on the **circle of fifths** (C and G, C and F) share six of seven notes: moves between them are smooth. Distant keys (C and F♯) sound like a jolt.' },
        { video: { id: 'I-1A3d5WBX4', title: 'How To Change Key: 3 Methods from Easy to Hard', note: 'Pivot chords, dominants and direct key changes, played.' } },
        { prog: { label: 'C – F – Am (pivot) – D7 – G: from C to G', chords: [notes(C), notes(F), notes(Am), notes(D7), notes(Gc)], gap: 1 } },
      ],
    },
    {
      kind: 'learn', title: '4 · Soloing through a key change', blocks: [
        { p: 'When the key changes, the scale changes. Going from C to G, **F becomes F♯**: one note. Going from C to D, F → F♯ and C → C♯. Know which notes change, and hit the new ones (the new key\'s 3rd and 7th) as the change arrives.' },
        { spots: fig('D (x x 0 2 3 2): the new home after A7. Its F♯ (high e) is the note the old key didn\'t have.', 2, 'maj', D, 2) },
      ],
    },
    {
      kind: 'learn', title: '5 · What mastery looks like', blocks: [
        { p: 'You own key changes when:' },
        { list: ['You can find the key of a song from its chords, and spot where it moves.', 'You can say whether a move is a visit or a modulation.', 'You can change key from C to G, F, Am and D on the spot, using a pivot or the new V7.', 'In a solo, you change the right notes as the key changes.'] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Look for the cadence: it tells you where home is.', examples: [
        { q: 'C – F – G7 – C, then E7 – Am – Dm – E7 – Am. What happened?', steps: ['First phrase ends G7 → C: in C.', 'Second ends E7 → Am, twice: settled in A minor.'], answer: 'A move to the relative minor (A minor).' },
        { q: 'Find a pivot chord between C and F.', steps: ['C major: C Dm Em F G Am B°. F major: F Gm Am B♭ C Dm E°.', 'Shared: Am, C, Dm, F.'], answer: 'Dm (vi in F, ii in C) or Am: then C7 → F.' },
        { q: 'A song in G lifts to A for the last chorus. Which notes change?', steps: ['G: one sharp (F♯). A: three sharps (F♯ C♯ G♯).'], answer: 'C → C♯ and G → G♯.' },
        { q: 'C … A7 – Dm – G7 – C. Key change?', steps: ['A7 → Dm, then straight back to C via G7.'], answer: 'No: a visit to Dm (V7/ii), still in C.' },
        { q: 'Write a direct lift from C to D for a final chorus.', steps: ['Prepare with D\'s V7 (A7), or just jump.'], answer: 'C – F – G7 – C | A7 → D – G – A7 – D.', spots: fig('', 9, 'dom7', A7, 1) },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'A key change sounds like **the floor shifting**: suddenly a different note feels like home. A pivot change is subtle; a direct lift is a jolt upward. Hum the home note before and after: did it move?' },
      ],
      drills: [
        { label: 'Hear it: home or not home yet?', quiz: 'l2-home-ear', minutes: 4 },
        { label: 'Find the key', quiz: 'l2-findkey', minutes: 5 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Calling every secondary dominant a key change.', right: 'One chord visiting is tonicisation. A key change settles and cadences.' },
        { wrong: 'Soloing in the old key after the change.', right: 'Find the notes that changed and use them.' },
        { wrong: 'Deciding the key from the first chord.', right: 'Look for the cadence and the chord the song rests on.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Say "now in G" (or wherever) out loud as each change lands.',
      challenge: { label: 'Change key three ways', ex: { label: 'Two key changes: C to G through the pivot Am, then a direct lift from C to D', tab: 'keyChange' }, goal: 'then loop a progression that moves C → G (pivot), G → A (direct lift) and back, and solo over it changing the right notes each time', why: 'Following a key change in your own playing is the whole point.' },
      goals: [
        { focus: 'Find the key', tasks: [{ label: 'Find the key', quiz: 'l2-findkey', minutes: 5, goal: '2 stars' }, { label: 'Circle of fifths: neighbours', quiz: 'cof-neighbours', minutes: 4 }] },
        { focus: 'Play the changes', tasks: [{ label: 'C to G by pivot, C to D by lift', ex: { label: 'Two key changes: C to G through the pivot Am, then a direct lift from C to D', tab: 'keyChange' }, minutes: 8 }] },
        { focus: 'Hear home', tasks: [{ label: 'Hear it: home or not home yet?', quiz: 'l2-home-ear', minutes: 4 }] },
        { focus: 'Use the circle', tasks: [{ label: 'Circle of fifths: find close keys', tool: 'circle', minutes: 5 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['**Songs**: look for a song in your library with a key change and mark where it happens.', '**Jam**: build a verse in A minor and a chorus in C major.', '**Looper**: record part A in one key and part B in another.'] },
      ],
      tasks: [{ label: 'Jam: two keys', tool: 'jam', minutes: 10 }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Find, hear, play, explain.',
      tasks: [
        { skill: 'Apply', label: 'Find the key', quiz: 'l2-findkey' },
        { skill: 'Hear', label: 'Hear it: home or not home yet?', quiz: 'l2-home-ear' },
        { skill: 'Play', label: 'Two key changes (mic)', ex: { label: 'Two key changes: C to G through the pivot Am, then a direct lift from C to D', tab: 'keyChange' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Key centres and key changes". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) how to find a song\'s key centre, (2) the difference between tonicisation and modulation, (3) four ways to change key, (4) why neighbouring keys on the circle change smoothly, (5) what changes in a solo. Give me a progression and ask me where it modulates. Keep it short.',
        points: ['V7 → I cadence, last chord, the chord it returns to, the notes', 'a one-chord visit vs settling with its own cadence', 'pivot chord, new V7, direct lift, relative/parallel', 'neighbours share six of seven notes', 'change the notes that differ; hit the new 3rd'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'YFe7Jchras0', title: 'The Circle of Fifths Explained for Guitar' },
      books: [
        { book: 'The Circle of Fifths for Guitarists', where: 'The part on modulation', why: 'Key changes mapped on the circle.' },
        { book: 'Music Theory for Guitarists', where: 'The chapter on key centres', why: 'Finding the key and following it.' },
      ],
      blocks: [{ p: '**Next**: diatonic substitution and reharmonisation: new chords under the same melody.' }],
    },
  ],
}

// ---- Lesson 6: diatonic substitution and reharmonisation -----------------------------------------------------------
export const REHARM: CourseLesson = {
  id: 'c7-reharm', level: 7, n: 6, title: 'Diatonic substitution and reharmonisation', key: 0, minutes: 80,
  goal: 'Swap chords for others that share their notes (I ↔ vi ↔ iii, IV ↔ ii, V ↔ vii°), check every swap against the melody, and reharmonise a simple tune step by step: substitutes, 7ths, secondary dominants and ii – V\'s.',
  builds: ['the 7th chords of a key', 'secondary dominants', 'borrowed chords'],
  topics: ['substitution', 'reharmonisation', 'arranging', 'chord function', 'jazz', 'songwriting'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Every melody can be harmonised in many ways. The same tune over C – F – G – C sounds like a nursery rhyme; over Cmaj7 – Am7 – Dm7 – G7 it sounds like a jazz ballad; with secondary dominants it sounds like 1930s swing. **Reharmonisation** is choosing new chords under a melody, and it\'s how arrangers, jazz players and songwriters make familiar songs sound fresh.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['swap chords that share two notes;', 'check a swap against the melody note;', 'add 7ths, secondary dominants and ii – V\'s;', 'reharmonise a simple tune in four steps.'] },
      ],
    },
    {
      kind: 'learn', title: '1 · Chords that share notes', blocks: [
        { p: 'Two triads a 3rd apart share **two** of their three notes: C (C E G) and Am (A C E) share C and E; C and Em (E G B) share E and G. So they can stand in for each other, as long as the melody fits. In a major key:' },
        { list: ['**I ↔ vi ↔ iii** (tonic family): C, Am, Em.', '**IV ↔ ii** (predominant family): F, Dm.', '**V ↔ vii°** (dominant family): G, B°.'] },
        { p: 'Same family, same job (Level 5): swapping keeps the story of the progression but changes its colour.' },
      ],
    },
    {
      kind: 'learn', title: '2 · Check the melody', blocks: [
        { p: 'The one rule: **the melody note should be in the new chord** (or a nice extension of it). If the melody sings C over a C chord, you can use Am (has C) or F (has C), but Em (E G B) puts a B against the C: a clash.' },
        { list: ['Melody note **C**: C, Am, F (and Fmaj7, Dm7, which contain C).', 'Melody note **E**: C, Am, Em.', 'Melody note **G**: C, Em, G.'] },
        { tip: 'A melody note that\'s the 7th or 9th of the new chord can sound lovely: C over Dm7 (its 7th), D over Cadd9. Trust your ear.' },
      ],
    },
    {
      kind: 'learn', title: '3 · Reharmonise in four steps', blocks: [
        { p: 'Start from **C – F – G – C** and build up:' },
        { list: [
          '**Substitute**: C – **Am** – **Dm** – G7 (vi for a second I, ii for IV).',
          '**Add 7ths**: Cmaj7 – Am7 – Dm7 – G7.',
          '**Secondary dominants**: Cmaj7 – **E7** – Am7 – **D7** – Dm7 – G7 (each V7 pointing at the next).',
          '**ii – V into any chord**: put Em7 – A7 before Dm7, or Dm7 – G7 before C.',
        ] },
        { p: 'The lesson tab plays all four versions. Listen to how far one simple tune can travel.' },
        { prog: { label: 'C – F – G – C, then Cmaj7 – Am7 – Dm7 – G7 – Cmaj7', chords: [notes(C), notes(F), notes(Gc), notes(C), notes(Cmaj7), notes(Am7), notes(Dm7), notes(G7), notes(Cmaj7)], gap: 0.8 } },
      ],
    },
    {
      kind: 'learn', title: '4 · What mastery looks like', blocks: [
        { p: 'You own reharmonisation when:' },
        { list: ['You can name the substitutes of any chord in a key.', 'You check every swap against the melody note.', 'You can take a four-chord song and give it two new harmonisations that both fit the melody.', 'You can drop a ii – V in front of any chord.'] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Family first, then check the melody.', examples: [
        { q: 'Substitute for F in the key of C, melody note A.', steps: ['Predominant family: Dm.', 'Dm = D F A: has A.'], answer: 'Dm (or Dm7).' },
        { q: 'Melody note B over a G chord in C. Can you use Em?', steps: ['Em = E G B: has B.'], answer: 'Yes: Em (or G, or Bdim).' },
        { q: 'Put a ii – V in front of Am in the key of C.', steps: ['Am\'s "own" ii – V: Bm7♭5 – E7.'], answer: 'Bm7♭5 – E7 – Am.' },
        { q: 'Reharmonise C – C – F – G with substitutes and 7ths.', steps: ['Second C → Am7; F → Dm7; G → G7.'], answer: 'Cmaj7 – Am7 – Dm7 – G7.', spots: fig('', 2, 'm7', Dm7, 1) },
        { q: 'Melody note F over C – (?) – C. What could go in the middle?', steps: ['F is in F, Dm, Bdim and G7.'], answer: 'F (IV), Dm (ii) or G7 (V7): all have F.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Play the tune in your head (or hum the top notes) over each version and listen to the mood change: plain, soft, jazzy, swinging. The melody stays the same; the harmony tells a different story.' },
      ],
      drills: [
        { label: 'Hear it: which chord of the key?', quiz: 'l2-num-ear', minutes: 4 },
        { label: 'Hear it: which chord was changed?', quiz: 'l7-colour-ear', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Swapping chords without checking the melody.', right: 'The melody note should be in the new chord (or a nice extension).' },
        { wrong: 'Reharmonising every chord at once.', right: 'One step at a time; keep what sounds good.' },
        { wrong: 'Using substitutes from a different family (IV for V).', right: 'Stay in the family to keep the progression\'s story.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Hum the melody note as you choose each new chord.',
      challenge: { label: 'Reharmonise a folk song', ex: { label: 'One tune, four harmonies: C F G C → C Am Dm G7 → with 7ths → with secondary dominants', tab: 'reharm' }, goal: 'then take a simple folk song from the songbook and play it with two new harmonisations of your own, checking every chord against the melody', why: 'A real melody keeps you honest.' },
      goals: [
        { focus: 'Know the families', tasks: [{ label: 'The 7th chords of a key', quiz: 'l5-key7', minutes: 4 }] },
        { focus: 'Hear the four versions', tasks: [{ label: 'One tune, four harmonies', ex: { label: 'One tune, four harmonies: C F G C → C Am Dm G7 → with 7ths → with secondary dominants', tab: 'reharm' }, minutes: 8 }] },
        { focus: 'Secondary dominants', tasks: [{ label: 'Find the secondary dominant', quiz: 'l7-secdom', minutes: 4 }] },
        { focus: 'Do it yourself', tasks: [{ label: 'Jam: reharmonise a four-chord loop', tool: 'jam', minutes: 10 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['**Songbook**: pick a tune and reharmonise it.', '**Chord melody**: the composer\'s chord-melody style already reharmonises: compare.', '**Jam**: the "spice" settings add substitutes and secondary dominants: listen to what they choose.'] },
      ],
      tasks: [{ label: 'Jam: reharmonisation', tool: 'jam', minutes: 10 }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Choose, hear, play, explain.',
      tasks: [
        { skill: 'Apply', label: 'Find the secondary dominant', quiz: 'l7-secdom' },
        { skill: 'Hear', label: 'Hear it: which chord was changed?', quiz: 'l7-colour-ear' },
        { skill: 'Play', label: 'One tune, four harmonies (mic)', ex: { label: 'One tune, four harmonies: C F G C → C Am Dm G7 → with 7ths → with secondary dominants', tab: 'reharm' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Diatonic substitution and reharmonisation". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) which chords substitute for each other and why, (2) the melody rule, (3) the four steps of reharmonising, (4) how to put a ii – V before any chord. Give me a melody note and a chord and ask me for substitutes. Keep it short.',
        points: ['triads a 3rd apart share two notes: I/vi/iii, IV/ii, V/vii°', 'the melody note should be in the new chord', 'substitute, add 7ths, secondary dominants, ii – V\'s', 'the target\'s own ii and V7'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'FdyOMwXxJYU', title: 'What Are Secondary Dominants & How to Use Them - Guitar Lesson' },
      books: [
        { book: 'Music Theory for Guitarists', where: 'The chapter on chord substitution', why: 'Diatonic and dominant substitutes in depth.' },
        { book: 'Harmony in Practice', where: 'The chapters on harmonising a melody', why: 'Harmonising melodies with checked answers.' },
      ],
      blocks: [{ p: '**Next**: tritone substitutions and passing diminished chords: the jazz musician\'s chromatic tricks.' }],
    },
  ],
}

// ---- Lesson 7: tritone subs and passing diminished ------------------------------------------------------------------
export const TRITONE: CourseLesson = {
  id: 'c7-tritone', level: 7, n: 7, title: 'Tritone subs and passing diminished chords', key: 0, minutes: 80,
  goal: 'Replace any dominant 7th with the dominant 7th a tritone away (G7 → D♭7) and know why it works, use it to make the bass walk down by half steps, put passing diminished chords between chords a whole step apart, and hear and solo over both.',
  builds: ['secondary dominants', 'altered dominants', 'augmented and diminished', 'voice leading'],
  topics: ['tritone substitution', 'passing diminished', 'chromatic bass', 'jazz', 'reharmonisation'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Two of the most-loved tricks in jazz, swing, bossa nova and soul are about **chromatic movement**: chords that slide into the next one by half steps. The **tritone substitution** replaces a dominant with another dominant six frets away, so the bass walks down chromatically (Dm7 – D♭7 – Cmaj7). The **passing diminished** chord slips between two chords a whole step apart so the bass walks up (C – C♯dim7 – Dm7).' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['find the tritone sub of any dominant 7th;', 'explain why it works (shared 3rd and 7th);', 'make bass lines walk chromatically with tritone subs;', 'use passing diminished chords going up;', 'solo over both.'] },
        { prog: { label: 'Dm7 – G7 – Cmaj7, then Dm7 – D♭7 – Cmaj7', chords: [notes(sDm7), notes(sG7), notes(sCmaj7), notes(sDm7), notes(sDb7), notes(sCmaj7)], gap: 1 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Why the tritone sub works', blocks: [
        { p: '**G7** = G B D F. Its guide tones are **B** (3) and **F** (♭7), a tritone apart. Now **D♭7** = D♭ F A♭ C♭ (C♭ sounds as B). Its guide tones are **F** (3) and **C♭ = B** (♭7): **the same two notes**, swapped. So D♭7 has the same tritone, the same pull, and resolves to the same place.' },
        { p: 'Any dominant 7th can be replaced by the one **six frets away** (a tritone): G7 ↔ D♭7, A7 ↔ E♭7, D7 ↔ A♭7, E7 ↔ B♭7.' },
        { spots: fig('D♭7 shell (x 4 3 4): D♭, F and C♭ (= B). F and B are G7\'s guide tones too.', 1, 'dom7', sDb7, 4) },
      ],
    },
    {
      kind: 'learn', title: '2 · The bass walks down', blocks: [
        { p: 'In ii – V – I the bass goes D – G – C: jumps. With the tritone sub it goes **D – D♭ – C**: a smooth chromatic walk. That\'s the sound: sophisticated, slippery, very jazz.' },
        { list: ['**Dm7 – D♭7 – Cmaj7** (ii – subV – I).', '**Cmaj7 – E♭7 – Dm7 – D♭7 – Cmaj7**: tritone subs for A7 and G7, the bass walks C – E♭ – D – D♭ – C.', 'Any secondary dominant can be subbed: E7 → B♭7 before Am.'] },
        { video: { id: 'Vwo5yleFesM', title: 'How To Use Tritone Substitutions The Easy Way (Jazz And Blues Rhythm Guitar)', note: 'Tritone subs as a rhythm guitar move, in blues and jazz.' } },
      ],
    },
    {
      kind: 'learn', title: '3 · Passing diminished chords, going up', blocks: [
        { p: 'From Level 5: a dim7 between two chords a whole step apart makes the bass climb by half steps: **C – C♯dim7 – Dm7 – D♯dim7 – Em7**. Each dim7 is a rootless 7♭9 of the next chord (C♯dim7 = A7♭9 without A). Also **F – F♯dim7 – C/G**, a gospel and swing favourite.' },
        { p: 'So the two tricks are mirror images: **tritone subs walk the bass down, passing diminished chords walk it up**.' },
      ],
    },
    {
      kind: 'learn', title: '4 · Soloing over them', blocks: [
        { list: ['Over **D♭7** (for G7): play a **D♭ major arpeggio or D♭ major pentatonic**. Over the G7 in the bass it gives the altered sound (♭9, ♭5, ♭13).', 'Over **passing dim7**: its own arpeggio (four notes, every 3 frets), or just hold a note the two neighbouring chords share.', 'Simplest of all: **land on the guide tones**, which are the same for G7 and D♭7.'] },
      ],
    },
    {
      kind: 'learn', title: '5 · What mastery looks like', blocks: [
        { p: 'You own these when:' },
        { list: ['You can name the tritone sub of any dominant 7th in a few seconds.', 'You can explain the shared guide tones.', 'You can play ii – subV – I in shells in three keys.', 'You can put passing diminished chords between I – ii – iii.', 'You hear the chromatic bass and know which trick made it.'] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Six frets away; same 3rd and 7th.', examples: [
        { q: 'Tritone sub for D7?', steps: ['Six frets from D: A♭.'], answer: 'A♭7 (D7 has F♯ and C; A♭7 has C and G♭ = F♯).' },
        { q: 'Make the bass walk down in Am7 – D7 – Gmaj7.', steps: ['Sub D7 → A♭7: the bass goes A – A♭ – G.'], answer: 'Am7 – A♭7 – Gmaj7.' },
        { q: 'Walk the bass up from F to G with a passing chord.', steps: ['F – F♯ – G: F♯dim7 in the middle.'], answer: 'F – F♯dim7 – G (or Gm7).' },
        { q: 'Why can E♭7 replace A7 before Dm7?', steps: ['A7 guide tones: C♯ and G.', 'E♭7 guide tones: G and D♭ (= C♯).'], answer: 'Same guide tones: the same pull to D.', spots: fig('', 3, 'dom7', [-1, 6, 5, 6, -1, -1], 6) },
        { q: 'Over D♭7 standing in for G7, what\'s an easy solo choice?', steps: ['D♭ major pentatonic: D♭ E♭ F A♭ B♭.'], answer: 'D♭ major pentatonic (or arpeggio): altered colours over G.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'The tritone sub sounds like the V7 with a twist: darker, slippery, the bass sliding by half step. Passing diminished chords sound like a question that climbs. Follow the bass with your voice.' },
      ],
      drills: [
        { label: 'Hear it: plain or altered dominant?', quiz: 'l5-alt-ear', minutes: 4 },
        { label: 'The tritone sub', quiz: 'l7-tritone', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Tritone-subbing a minor or maj7 chord.', right: 'Only dominant 7ths (they\'re the ones with the tritone).' },
        { wrong: 'Thinking the sub changes the destination.', right: 'Both resolve to the same chord.' },
        { wrong: 'Using passing diminished chords between chords a 5th apart.', right: 'They connect chords a whole step apart, bass by half steps.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Follow the bass note with your voice as you play.',
      challenge: { label: 'Chromatic bass in a whole progression', ex: { label: 'Tritone subs and passing diminished: D♭7 for G7, E♭7 for A7, then C♯dim7 and D♯dim7 walking up', tab: 'tritone' }, goal: 'then take I – vi – ii – V – I in F and make the bass move only by half steps going down (tritone subs) and then going up (passing diminished)', why: 'Applying both tricks in a new key makes them part of your harmony.' },
      goals: [
        { focus: 'Name them', tasks: [{ label: 'The tritone sub', quiz: 'l7-tritone', minutes: 5, goal: '2 stars' }] },
        { focus: 'Play them', tasks: [{ label: 'Tritone subs and passing diminished', ex: { label: 'Tritone subs and passing diminished: D♭7 for G7, E♭7 for A7, then C♯dim7 and D♯dim7 walking up', tab: 'tritone' }, minutes: 8 }] },
        { focus: 'Hear the altered sound', tasks: [{ label: 'Hear it: plain or altered dominant?', quiz: 'l5-alt-ear', minutes: 4 }] },
        { focus: 'Jam with them', tasks: [{ label: 'Jam: a jazz turnaround with subs', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['**Jam**: jazz and bossa styles use tritone subs in their spice settings: listen for them.', '**Blues**: replace the V7 in the turnaround with its tritone sub.', '**Ballads**: F – F♯dim7 – C/G before the final cadence.'] },
      ],
      tasks: [{ label: 'Jam: tritone subs', tool: 'jam', minutes: 10 }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Name, hear, play, explain.',
      tasks: [
        { skill: 'Apply', label: 'The tritone sub', quiz: 'l7-tritone' },
        { skill: 'Hear', label: 'Hear it: plain or altered dominant?', quiz: 'l5-alt-ear' },
        { skill: 'Play', label: 'Tritone subs and passing diminished (mic)', ex: { label: 'Tritone subs and passing diminished: D♭7 for G7, E♭7 for A7, then C♯dim7 and D♯dim7 walking up', tab: 'tritone' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Tritone subs and passing diminished chords". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) what a tritone sub is and why it works, (2) how it changes the bass line, (3) which chords can be subbed, (4) how passing diminished chords work, (5) what to play over each in a solo. Keep it short.',
        points: ['the dominant 7th six frets away: same 3rd and 7th swapped', 'ii – subV – I: the bass walks down by half steps', 'only dominant 7ths (including secondary dominants)', 'dim7 between chords a whole step apart; rootless 7♭9; bass walks up', 'subV major pentatonic/arpeggio, or the shared guide tones'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'pgs8ySdPWi8', title: 'How to Use the Half-Whole Diminished Scale in the Blues (Guitar)' },
      books: [
        { book: 'Music Theory for Guitarists', where: 'The chapter on substitution', why: 'Tritone subs and diminished substitutions.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'The advanced harmony chapters', why: 'More chromatic reharmonisation.' },
      ],
      blocks: [{ p: '**Next**: analysing real songs: putting all of Level 7 to work.' }],
    },
  ],
}

// ---- Lesson 8: analysing real songs --------------------------------------------------------------------------------
export const ANALYSIS: CourseLesson = {
  id: 'c7-analysis', level: 7, n: 8, title: 'Analysing real songs', minutes: 80,
  goal: 'Analyse any song\'s harmony in five steps (key, numbers, outside chords, cadences, what it means for playing), using two traditional pieces as models, then do it on songs from your own library.',
  builds: ['all of Level 7', 'chord progressions as numbers', 'minor keys'],
  topics: ['analysis', 'Roman numerals', 'harmony', 'songs', 'arranging', 'soloing'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Everything in Level 7 comes together when you look at a real song and can say **why** each chord is there: "that\'s a secondary dominant", "that\'s borrowed", "that\'s where it changes key". Then you can learn songs faster, remember them, transpose them, solo over them with the right notes, and steal their tricks for your own songs.' },
        { p: 'By the end you\'ll be able to analyse a song in five steps and use the analysis when you play.' },
      ],
    },
    {
      kind: 'learn', title: '1 · The five steps', blocks: [
        { list: [
          '**Key**: find home (the cadences, the last chord, the chord it rests on).',
          '**Numbers**: write the Roman numeral of every chord in that key.',
          '**Outside chords**: for each chord not in the key, ask: secondary dominant? borrowed? from harmonic minor? a key change? a passing chord?',
          '**Cadences**: how does each phrase end?',
          '**Playing**: which scale where, which notes change, which tones to target.',
        ] },
      ],
    },
    {
      kind: 'learn', title: '2 · A traditional minor-key folk song', blocks: [
        { p: 'A well-known traditional song (a ballad about a house in New Orleans, centuries old, public domain) goes: **Am – C – D – F | Am – C – E – E**.' },
        { list: [
          '**Key**: A minor (it starts and ends on Am, and E → Am closes it).',
          '**Numbers**: i – III – **IV** – VI | i – III – **V** – V.',
          '**Outside chords**: **D major** (natural minor has Dm): its F♯ comes from **A Dorian** or **melodic minor** (Level 8), the brighter minor. **E major**: the V from **harmonic minor** (G♯).',
          '**Cadences**: the first line ends on F (VI, open), the second on E (half cadence), and E → Am closes each verse.',
          '**Playing**: A natural minor over Am, C and F; F♯ over D; G♯ over E. Three scales in one short song.',
        ] },
        { spots: fig('E (0 2 2 1 0 0): the major V of A minor. G♯ (G string, 1st fret) is from harmonic minor.', 4, 'maj', E, 1) },
      ],
    },
    {
      kind: 'learn', title: '3 · The Canon progression', blocks: [
        { p: 'Pachelbel\'s Canon (around 1700, public domain) gave pop one of its most used progressions: **D – A – Bm – F♯m – G – D – G – A** in D.' },
        { list: [
          '**Numbers**: I – V – vi – iii – IV – I – IV – V.',
          '**Outside chords**: none: every chord is from D major.',
          '**The secret**: the bass. With every chord in root position the roots go D A B F♯ G D G A. Many arrangements use inversions so the bass **walks down the scale**: D – A/C♯ – Bm – F♯m/A – G – D/F♯ – G – A (bass D C♯ B A G F♯ G A), the slash-chord idea from Level 5, lesson 7.',
          '**Cadences**: IV – V at the end: a half cadence that loops back to I.',
          '**Playing**: D major pentatonic or D major scale throughout; land on each chord\'s 3rd.',
        ] },
        { video: { id: 'VTITl8OGoII', title: 'Music Theory - Minor Keys Explained - Chords, Scales and Function', note: 'Chord functions in minor keys: the tools behind section 2.' } },
      ],
    },
    {
      kind: 'learn', title: '4 · Doing it on your own songs', blocks: [
        { list: [
          'Open a song from **My songs** or the **Songbook**: Play shows its chords and the detected key.',
          'Write the numbers in your head (or on paper).',
          'Circle the outside chords and name each one.',
          'Ask the helper (✨) to check your analysis: it knows these lessons.',
          'Use it: solo with the right scale for each section.',
        ] },
        { tip: 'Analyse ten songs and you\'ll notice the same tricks over and over: they become your vocabulary.' },
      ],
    },
    {
      kind: 'learn', title: '5 · What mastery looks like', blocks: [
        { p: 'You own analysis when:' },
        { list: ['You can analyse a four-chord pop song in under a minute.', 'You can explain every outside chord in the two traditional pieces.', 'You\'ve analysed five songs from your own library.', 'Your solos over those songs change notes where the harmony changes.'] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Key, numbers, outside chords, cadences, playing.', examples: [
        { q: 'C – E7 – Am – F – G7 – C. Analyse it.', steps: ['Key C (G7 → C).', 'I – V7/vi – vi – IV – V7 – I.', 'E7 = secondary dominant of Am.', 'Ends with an authentic cadence.'], answer: 'C major with V7/vi (E7): play G♯ over E7.' },
        { q: 'G – F – C – G. What is F?', steps: ['Key G (it rests on G).', 'F isn\'t in G major: ♭VII, borrowed.'], answer: 'Borrowed ♭VII: the rock sound (I – ♭VII – IV – I).' },
        { q: 'Am – G – F – E. Key and chords?', steps: ['Key A minor; E is the major V (harmonic minor).', 'Numbers in A minor: i – VII – VI – V.'], answer: 'A minor: i – VII – VI – V, with G♯ over E.' },
        { q: 'D – A/C♯ – Bm – D/A. What is the bass doing?', steps: ['Bass: D – C♯ – B – A.'], answer: 'Walking down the D major scale (slash chords, Level 5).' },
        { q: 'A blues: A7 – D7 – E7, all dominant. Which "rule" does it break?', steps: ['In a major key only V is a dominant 7th.', 'In the blues, every chord is: they colour, they don\'t resolve.'], answer: 'Dominant chords that don\'t resolve: the blues\' own harmony.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Listen to the two pieces in the tab and hear the outside chords: the D major lifting in the minor song, the E pulling home; the Canon\'s bass walking down. Then listen to a song you love and ask "home, away, back?" at each chord.' },
      ],
      drills: [
        { label: 'Hear it: which progression?', quiz: 'l3-prog-ear', minutes: 4 },
        { label: 'Hear it: which chord was changed?', quiz: 'l7-colour-ear', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Labelling every outside chord a key change.', right: 'Check: secondary dominant? borrowed? harmonic minor? Most are colours.' },
        { wrong: 'Analysing without listening.', right: 'Theory names what you hear: play it and listen.' },
        { wrong: 'Stopping at the labels.', right: 'Use them: which notes, which targets, which scale.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Say the Roman numeral of each chord as you play it.',
      challenge: { label: 'Five songs from your library', ex: { label: 'Two traditional pieces to analyse: a minor-key folk song (Am C D F / Am C E) and the Canon progression in D', tab: 'analysis' }, goal: 'then analyse five songs from your own library in the five steps, and record a solo over one of them that changes notes where the harmony changes', why: 'Real songs are where the theory lives.' },
      goals: [
        { focus: 'Play the models', tasks: [{ label: 'The two traditional pieces', ex: { label: 'Two traditional pieces to analyse: a minor-key folk song (Am C D F / Am C E) and the Canon progression in D', tab: 'analysis' }, minutes: 8 }] },
        { focus: 'Name the outside chords', tasks: [{ label: 'Borrowed or not?', quiz: 'l7-borrowed', minutes: 4 }, { label: 'Find the secondary dominant', quiz: 'l7-secdom', minutes: 4 }] },
        { focus: 'Hear progressions', tasks: [{ label: 'Hear it: which progression?', quiz: 'l3-prog-ear', minutes: 4 }] },
        { focus: 'Solo with the analysis', tasks: [{ label: 'Jam: Am – C – D – F / Am – C – E, three scales', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['**Songs**: analyse every new song before you learn it.', '**Helper**: ask it to check your analysis.', '**Looper**: loop a song\'s progression and solo with the scale for each section.'] },
      ],
      tasks: [{ label: 'Jam: solo over an analysed song', tool: 'jam', minutes: 10 }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Name, hear, play, explain.',
      tasks: [
        { skill: 'Apply', label: 'Find the secondary dominant', quiz: 'l7-secdom' },
        { skill: 'Hear', label: 'Hear it: which progression?', quiz: 'l3-prog-ear' },
        { skill: 'Play', label: 'The two traditional pieces (mic)', ex: { label: 'Two traditional pieces to analyse: a minor-key folk song (Am C D F / Am C E) and the Canon progression in D', tab: 'analysis' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Analysing real songs". Be my teacher: give me three short chord progressions (one with a secondary dominant, one with a borrowed chord, one in a minor key with a major V), one at a time, and ask me to analyse each in five steps (key, numbers, outside chords, cadences, what to play). Tell me what I got right and missed. Keep it short.',
        points: ['key from cadences and the resting chord', 'Roman numerals for every chord', 'outside chords: secondary dominant, borrowed, harmonic/melodic minor, key change, passing', 'cadence at each phrase end', 'scale and target notes per section'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: '2Jq4vEAqZq8', title: 'How To Figure Songs Out By Ear (Chords and Riffs)' },
      books: [
        { book: 'Harmony in Practice', where: 'The analysis exercises', why: 'Pieces to analyse with answers to check.' },
        { book: 'Music Theory for Guitarists', where: 'The chapters on analysing progressions', why: 'Worked analyses of common progressions.' },
      ],
      blocks: [{ p: '**Next**: the Level 7 mastery check, then Level 8: modes and beyond.' }],
    },
  ],
}

// ---- Level 7 mastery check -----------------------------------------------------------------------------------------
export const LEVEL7_CHECK: CourseLesson = {
  id: 'c7-check', level: 7, n: 9, title: 'Level 7 mastery check', minutes: 30,
  goal: 'Show that harmony is yours: cadences, minor keys and their borrowed V, secondary dominants, borrowed chords, key changes, reharmonisation, tritone subs and passing diminished chords, and analysing real songs.',
  builds: ['all of Level 7'], topics: ['cadences', 'minor keys', 'secondary dominants', 'borrowed chords', 'key changes', 'reharmonisation', 'tritone substitution', 'analysis'],
  steps: [
    {
      kind: 'why', title: 'Before Level 8', blocks: [
        { p: 'This check covers all of Level 7: harmony in depth. It\'s **strongly suggested** before Level 8, but never required.' },
        { list: ['Take it when the practice goals feel easy.', 'Anything you miss points back to the right lesson.', 'Pass it and the Level 7 badge is yours; it comes back as a review later.'] },
      ],
    },
    {
      kind: 'check', title: 'The check', intro: 'Ten parts across knowing, hearing and playing, then explain the level back to the teacher.',
      tasks: [
        { skill: 'Apply', label: 'Name the cadence', quiz: 'l7-cadence' },
        { skill: 'Apply', label: 'Find the secondary dominant', quiz: 'l7-secdom' },
        { skill: 'Apply', label: 'Borrowed or not?', quiz: 'l7-borrowed' },
        { skill: 'Apply', label: 'The tritone sub', quiz: 'l7-tritone' },
        { skill: 'Hear', label: 'Hear it: how does it end?', quiz: 'l3-cadence-ear' },
        { skill: 'Hear', label: 'Hear it: which chord was changed?', quiz: 'l7-colour-ear' },
        { skill: 'Play', label: 'Secondary dominants in C (mic)', ex: { label: 'Secondary dominants in C: A7 → Dm, E7 → Am, D7 → G, C7 → F, B7 → Em', tab: 'secDom' } },
        { skill: 'Play', label: 'Borrowed moves (mic)', ex: { label: 'Borrowed from C minor: C – Fm – C, C – A♭ – B♭ – C, C – B♭ – F – C, C – E♭ – F – C', tab: 'borrowed' } },
        { skill: 'Play', label: 'Tritone subs and passing diminished (mic)', ex: { label: 'Tritone subs and passing diminished: D♭7 for G7, E♭7 for A7, then C♯dim7 and D♯dim7 walking up', tab: 'tritone' } },
        { skill: 'Play', label: 'Two key changes (mic)', ex: { label: 'Two key changes: C to G through the pivot Am, then a direct lift from C to D', tab: 'keyChange' } },
      ],
      explain: {
        prompt: 'I just took the KGuitar Level 7 mastery check (cadences, harmonic and melodic minor, secondary dominants, borrowed chords, key changes, reharmonisation, tritone subs and passing diminished chords, analysing songs). Be my teacher for a short oral exam: ask me six questions across these topics, one at a time, including "what are the secondary dominants of G?" and "analyse Am – G – F – E", tell me what I got right and missed, and finish with which lesson to review if anything was shaky.',
        points: ['authentic, plagal, half, deceptive', 'minor keys raise the 7th for V7 → i', 'V7/x: a dominant 7th a 5th above the target', 'iv, ♭VI, ♭VII, ♭III from the parallel minor', 'pivot chord, new V7, direct lift', 'substitutes share notes; tritone sub shares 3rd and 7th'],
      },
    },
  ],
}

export const LEVEL7_B: CourseLesson[] = [KEY_CHANGES, REHARM, TRITONE, ANALYSIS, LEVEL7_CHECK]
