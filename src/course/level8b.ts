// Level 8 (Modes and beyond), lessons 6–9 and the final check: melodic minor (Lydian dominant, altered), whole-tone and
// diminished, what to play over any chord, triad pairs and upper structures.
import type { CourseLesson } from './types'
import { MODE } from './l8Tabs'
import { modeFig, run } from './level8'

const ex = (label: string, tab: string) => ({ label, tab: tab as never })
const G7 = [43, 53, 59, 62, 67], C = [48, 52, 55, 60, 64], D7s11 = [50, 56, 60, 66, 69], G7alt = [43, 53, 59, 63, 68], Cmaj7 = [48, 52, 55, 59, 64]

// ---- Lesson 6: melodic minor, Lydian dominant and altered ------------------------------------------------------
const MM = 'A melodic minor over Am(maj7), D Lydian dominant over D7♯11, G altered over G7alt into Cmaj7'
export const MELODIC: CourseLesson = {
  id: 'c8-melodic', level: 8, n: 6, title: 'Melodic minor: Lydian dominant and the altered scale', minutes: 85,
  goal: 'Use melodic minor as a family of modes: the scale itself over minor(maj7) chords, its 4th mode (Lydian dominant) over 7♯11 chords, and its 7th mode (the altered scale) over altered dominants resolving to I.',
  builds: ['harmonic and melodic minor in minor keys', 'altered dominants', 'what modes really are'],
  topics: ['melodic minor', 'Lydian dominant', 'altered scale', 'jazz', 'fusion', 'prog'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Melodic minor (A B C D E F♯ G♯) is the minor scale with a raised 6th and 7th. On its own it\'s a smooth, slightly mysterious minor. But like the major scale, it has modes, and two of them are the most used sounds in jazz and fusion: **Lydian dominant** (bright dominant 7th with a ♯11) and the **altered scale** (every tension of a dominant chord, all at once). Prog and djent writers love Lydian dominant too.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['play A melodic minor and use it over Am(maj7) and Am6;', 'find Lydian dominant (melodic minor from its 4th) for any 7♯11 chord;', 'find the altered scale (melodic minor a half step up) for any V7alt;', 'resolve an altered line into the I chord.'] },
        { prog: { label: 'D7♯11, then G7alt → Cmaj7', chords: [D7s11, D7s11, G7alt, Cmaj7], gap: 0.9 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Melodic minor itself', blocks: [
        { p: 'A melodic minor: **A B C D E F♯ G♯**. Major scale with a ♭3; or Dorian with a raised 7th. Over a **minor chord with a major 7th** (Am(maj7)) or a **minor 6 chord** (Am6) it\'s the perfect fit: the James Bond ending chord.' },
        { spots: modeFig('A melodic minor, frets 4–8: the gold notes are F♯ and G♯, the raised 6th and 7th.', 9, MODE.melodicMinor, 4, 8, [9, 11]) },
        { video: { id: 'Ztd5lNzYXiE', title: 'They Lied To Us About Melodic Minor', note: 'Jake on why melodic minor isn\'t just "up one way, down the other": it\'s a whole family of sounds.' } },
      ],
    },
    {
      kind: 'learn', title: '2 · Lydian dominant: the 4th mode', blocks: [
        { p: 'Start A melodic minor on its 4th note, D: **D E F♯ G♯ A B C**. That\'s D Mixolydian with a ♯4, or D Lydian with a ♭7: **Lydian dominant**.' },
        { p: 'Its chord is **D7♯11** (D F♯ A C + G♯). It sounds bright and open, less bluesy than plain Mixolydian. Use it over dominant chords that **don\'t** resolve down a 5th: a II7 (D7 in C, "Take the A Train"), a ♭VII7 (B♭7 in C), a tritone sub (lesson 7), or any long dominant vamp you want to sound modern.' },
        { p: 'Shortcut: **Lydian dominant on X = melodic minor a 5th above X** (D Lydian dominant = A melodic minor).' },
        { spots: modeFig('D Lydian dominant, frets 4–8: the gold notes are G♯ (♯11) and C (♭7).', 2, MODE.lydianDominant, 4, 8, [6, 10], true) },
        { video: { id: '5ElP19vESkY', title: 'Writing Prog Metal Djent with Lydian Dominant', note: 'Lydian dominant in a heavy, modern setting.' } },
      ],
    },
    {
      kind: 'learn', title: '3 · The altered scale: the 7th mode', blocks: [
        { p: 'Start A♭ melodic minor (A♭ B♭ C♭ D♭ E♭ F G) on its 7th note, G: **G A♭ B♭ B D♭ E♭ F**. Rename it against G7: root, **♭9** (A♭), **♯9** (B♭), 3 (B), **♯11** (D♭), **♭13** (E♭), ♭7 (F). Every tension is altered, and the chord tones that matter (3 and ♭7) are still there.' },
        { p: 'That\'s why it\'s called the **altered scale** (or super-Locrian). It\'s the sound of **V7alt → I**: maximum tension, then a big release. Each altered note sits a half step from a note of the I chord, so it pulls hard.' },
        { p: 'Shortcut: **altered on X = melodic minor a half step above X** (G altered = A♭ melodic minor).' },
        { spots: modeFig('G altered, frets 2–6: the gold notes are the altered tensions ♭9, ♯9, ♯11, ♭13.', 7, MODE.altered, 2, 6, [1, 3, 6, 8], true) },
        { video: { id: '63-PX9XvrKg', title: 'Intro To ALTERED DOMINANT Chords', note: 'The chords first: what 7alt means and why it resolves so hard.' } },
      ],
    },
    {
      kind: 'learn', title: '4 · What mastery looks like', blocks: [
        { p: 'You own melodic minor when:' },
        { list: ['You find Lydian dominant (a 5th up) and altered (a half step up) for any dominant in seconds.', 'Over D7♯11 you lean on G♯; over G7alt you resolve A♭ → G, D♭ → C, E♭ → E into C.', 'You can play A melodic minor in two positions.', 'You can tell a 7♯11 sound from a 7alt sound by ear.'] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Use the two shortcuts: 5th up for Lydian dominant, half step up for altered.', examples: [
        { q: 'Which melodic minor gives E Lydian dominant?', steps: ['A 5th above E is B.'], answer: 'B melodic minor (B C♯ D E F♯ G♯ A♯ = E F♯ G♯ A♯ B C♯ D).' },
        { q: 'Which melodic minor gives the altered scale on A7?', steps: ['A half step above A is B♭.'], answer: 'B♭ melodic minor (B♭ C D♭ E♭ F G A).' },
        { q: 'Spell C Lydian dominant.', steps: ['C Mixolydian: C D E F G A B♭.', 'Raise the 4th: F → F♯.'], answer: 'C D E F♯ G A B♭.' },
        { q: 'Over G7alt → Cmaj7, where do A♭, D♭ and E♭ resolve?', steps: ['Each is a half step from a C chord note.'], answer: 'A♭ → G, D♭ → C, E♭ → E.' },
        { q: 'Am – Am(maj7) – Am7 – Am6: which notes move, and which scale covers the second and fourth chords?', steps: ['A G♯ G F♯: a line falling by half steps.', 'Both G♯ and F♯ are in A melodic minor.'], answer: 'The top line A – G♯ – G – F♯; A melodic minor.', spots: modeFig('', 9, MODE.melodicMinor, 4, 8, [9, 11]) },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Lydian dominant: a dominant that sounds bright, almost like Lydian with a bluesy 7th. Altered: a dominant that sounds crunchy and urgent, which only makes sense when it resolves.' },
        { list: ['Play D7♯11 and let it ring: it doesn\'t need to go anywhere.', 'Play G7alt and stop: you\'ll want the C so much it hurts.'] },
      ],
      drills: [
        { label: 'What to play over the chord', quiz: 'l8-chordscale', minutes: 5 },
        { label: 'Spell the altered chord', quiz: 'l5-spell-alt', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Using the altered scale over a dominant that doesn\'t resolve.', right: 'Altered needs a resolution. For a static dominant, use Mixolydian or Lydian dominant.' },
        { wrong: 'Learning seven new shapes for melodic minor\'s modes.', right: 'Learn melodic minor in a few positions and use the shortcuts: 5th up, half step up.' },
        { wrong: 'Holding an altered note over the I chord.', right: 'Resolve each tension by a half step as the chord changes.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Before each chord, say which melodic minor you\'re in ("D7♯11: A melodic minor").',
      challenge: { label: 'Altered resolutions in every key', ex: ex(MM, 'melMinor'), goal: 'then play V7alt → I in C, F, B♭ and E♭ (half step up for the altered scale each time), resolving one tension by a half step into the I chord', why: 'Four keys around the circle make the shortcut automatic.' },
      goals: [
        { focus: 'Three sounds', tasks: [{ label: 'Melodic minor, Lydian dominant, altered', ex: ex(MM, 'melMinor'), minutes: 8, goal: 'clean at 84 BPM' }] },
        { focus: 'Pick the scale', tasks: [{ label: 'What to play over the chord', quiz: 'l8-chordscale', minutes: 5, goal: '2 stars' }] },
        { focus: 'Spell the chords', tasks: [{ label: 'Spell the altered chord', quiz: 'l5-spell-alt', minutes: 4 }] },
        { focus: 'Over a vamp', tasks: [{ label: 'Jam: a jazz or fusion groove, Lydian dominant over the 7th chords', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['**Jazz**: over every V7 → I, try the altered scale for one bar before the I.', '**Prog/fusion**: over a long dominant vamp, use Lydian dominant for a modern sound.', '**Songs**: the II7 of "Take the A Train", and any 7♯11 in a chord chart, are Lydian dominant.'] },
      ],
      tasks: [{ label: 'Jam: ii – V – I with an altered V', tool: 'jam', minutes: 10 }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Name them, hear them, play them, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'What to play over the chord', quiz: 'l8-chordscale' },
        { skill: 'Apply', label: 'Spell the altered chord', quiz: 'l5-spell-alt' },
        { skill: 'Hear', label: 'Hear it: plain or altered dominant?', quiz: 'l5-alt-ear' },
        { skill: 'Play', label: 'Melodic minor, Lydian dominant and altered (mic)', ex: ex(MM, 'melMinor') },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Melodic minor: Lydian dominant and the altered scale". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) what melodic minor is, (2) Lydian dominant and when to use it, (3) the altered scale and when to use it, (4) the two shortcuts. Ask me for the altered scale on E7 and the Lydian dominant on B♭7. Keep it short.',
        points: ['major with ♭3 (or Dorian with a raised 7th)', 'its 4th mode, 7♯11 chords that don\'t resolve down a 5th', 'its 7th mode, V7alt → I: ♭9 ♯9 ♯11 ♭13', 'Lydian dominant = melodic minor a 5th up; altered = a half step up'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'Ekml3enKF-E', title: '3-Minute Theory #41: Melodic Minor Scale' },
      books: [
        { book: 'Music Theory for Guitarists', where: 'The melodic minor chapter', why: 'Its modes and their chords.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'Melodic minor and its modes', why: 'Positions and licks for the altered and Lydian dominant sounds.' },
      ],
      blocks: [{ p: '**Next**: two scales built from a pattern: whole-tone and diminished.' }],
    },
  ],
}

// ---- Lesson 7: whole-tone and diminished ------------------------------------------------------------------------
const SYM = 'Whole-tone over G7♯5, half-whole diminished over G7♭9, and Bdim7 into C'
export const SYMMETRIC: CourseLesson = {
  id: 'c8-symmetric', level: 8, n: 7, title: 'Whole-tone and diminished: the symmetric scales', minutes: 75,
  goal: 'Play the whole-tone and the two diminished scales, know why each has only a few versions, and use them over 7♯5, 7♭9 and dim7 chords, with Log\'s practical diminished moves.',
  builds: ['augmented and diminished chords', 'altered dominants', 'tritone subs and passing diminished chords'],
  topics: ['whole-tone', 'diminished scale', 'symmetric scales', 'dominant chords', 'jazz', 'metal'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Most scales mix whole and half steps unevenly. **Symmetric scales** repeat one pattern all the way up: whole-tone is all whole steps; the diminished scales alternate half and whole. That makes them strange (no clear home), but also easy: the shape repeats every few frets, so one fingering covers the neck.' },
        { p: 'They\'re the sound of dream sequences (whole-tone), of tense dominants in jazz and blues (diminished over 7♭9), and of a lot of metal and neoclassical shred (diminished arpeggios).' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['play the whole-tone scale and use it over 7♯5;', 'play half-whole diminished over 7♭9 and whole-half over dim7;', 'move a diminished shape up three frets and still be "right";', 'use a dim7 arpeggio to lead into a chord.'] },
        { play: { label: 'G whole-tone, then G half-whole diminished', seq: [...run(55, MODE.wholeTone), ...run(55, MODE.halfWhole)], gap: 0.2 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Whole-tone: six notes, two scales', blocks: [
        { p: 'G whole-tone: **G A B C♯ D♯ F**. All whole steps, six notes. Against G7 it gives root, 9, 3, ♯11, ♯5, ♭7: a dominant with a raised 5th, **G7♯5** (G+7).' },
        { p: 'Because every step is the same, G whole-tone = A whole-tone = B whole-tone… There are only **two** whole-tone scales in all of music (C D E F♯ G♯ A♯ and C♯ D♯ F G A B).' },
        { p: 'Use it over 7♯5 chords and augmented triads, for a floating, dreamy, unresolved moment, then resolve to a real chord.' },
        { spots: modeFig('G whole-tone, frets 2–6: the gold notes are the ♯11 and ♯5 that make it sound "dreamy".', 7, MODE.wholeTone, 2, 6, [6, 8], true) },
        { video: { id: 'FHa38_bT2Ns', title: 'The Dream Sequence Scale | WHOLE-TONE SCALE Guitar Shapes & How to Use Them', note: 'Whole-tone shapes and where they fit.' } },
      ],
    },
    {
      kind: 'learn', title: '2 · Diminished: half-whole and whole-half', blocks: [
        { p: 'Alternate half and whole steps and you get eight notes. Two versions, same notes, different starting point:' },
        { list: [
          '**Half-whole** (starts with a half step): G A♭ B♭ B C♯ D E F. Over **G7♭9**: root, ♭9, ♯9, 3, ♯11, 5, 13, ♭7. Like the altered scale but with a natural 5th and 13.',
          '**Whole-half** (starts with a whole step): B C♯ D E F G A♭ B♭. Over **Bdim7**: its four chord tones plus a note a whole step above each.',
        ] },
        { p: 'The pattern repeats every **3 frets** (a minor 3rd), so there are only three diminished scales. G half-whole = B♭ = D♭ = E half-whole. Move any lick up 3 frets and it still fits.' },
        { spots: modeFig('G half-whole diminished, frets 2–6: the gold notes are ♭9, ♯9 and ♯11.', 7, MODE.halfWhole, 2, 6, [1, 3, 6], true) },
      ],
    },
    {
      kind: 'learn', title: '3 · Log\'s practical diminished: dim7 over dominants', blocks: [
        { p: 'The quickest way in: **a dim7 arpeggio a half step above the root of a dominant chord** is that dominant\'s 7♭9 without its root. A♭dim7 (A♭ B D F) over G7 = ♭9, 3, 5, ♭7.' },
        { p: 'And because a dim7 repeats every 3 frets, A♭dim7 = Bdim7 = Ddim7 = Fdim7: four places to play the same sound. Leading into a chord, a dim7 a half step **below** it pulls in hard (B dim7 → C, C♯dim7 → Dm, Level 7).' },
        { video: { id: '0TFIHv0G1Xc', title: 'LoG\'s Practical Guide to Diminished 7 | Part 3 (Playing Over Dominant 7)', note: 'Log shows the dim7-over-dominant move on the neck, with musical examples.' } },
        { video: { id: 'wLywvZZ0y_U', title: 'LoG Quickies #17 | Diminished Pairs (with solo example)', note: 'Pairs of diminished shapes turned into a solo.' } },
      ],
    },
    {
      kind: 'learn', title: '4 · What mastery looks like', blocks: [
        { p: 'You own the symmetric scales when:' },
        { list: ['You can play whole-tone and both diminished scales on any root.', 'You know there are only 2 whole-tone and 3 diminished scales, and why.', 'Over a 7♭9 chord you play a dim7 arpeggio from its 3rd (a half step above the root).', 'You can resolve each sound into a plain chord.'] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Find the pattern, then match it to the chord.', examples: [
        { q: 'Spell C whole-tone.', steps: ['Whole steps from C.'], answer: 'C D E F♯ G♯ A♯.' },
        { q: 'Which dim7 arpeggio fits over E7♭9?', steps: ['A half step above E is F.', 'Fdim7: F A♭ B D = ♭9, 3, 5, ♭7 of E7.'], answer: 'Fdim7 (= A♭dim7 = Bdim7 = Ddim7).' },
        { q: 'Spell D half-whole diminished.', steps: ['Half, whole, half, whole… from D.'], answer: 'D E♭ F F♯ G♯ A B C.' },
        { q: 'Why does a diminished lick still fit when moved up 3 frets?', steps: ['The scale repeats every minor 3rd.'], answer: 'The same eight notes come round again 3 frets higher.' },
        { q: 'What scale fits A7♯5?', steps: ['A dominant with a ♯5.'], answer: 'A whole-tone (A B C♯ D♯ F G).', spots: modeFig('', 9, MODE.wholeTone, 4, 8, [6, 8], true) },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Whole-tone sounds like floating with no floor (no perfect 5th, no half steps). Diminished sounds like tense, regular steps: it\'s the half steps every other note.' },
      ],
      drills: [
        { label: 'What to play over the chord', quiz: 'l8-chordscale', minutes: 5 },
        { label: 'Triad types by ear', quiz: 'tr-ear', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Using half-whole over a dim7 chord.', right: 'Over dim7 use whole-half; half-whole is for the dominant 7♭9.' },
        { wrong: 'Running the scale up and down for whole solos.', right: 'Use these for a beat or a bar of tension, then resolve to the next chord.' },
        { wrong: 'Using whole-tone over a dominant with a natural 5th in the melody.', right: 'Whole-tone has a ♯5 and no 5: match it to 7♯5 (or a dominant you\'re free to alter).' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Say the chord the scale belongs to as you play it ("G7♯5: whole-tone").',
      challenge: { label: 'Diminished in four places', ex: ex(SYM, 'symmetric'), goal: 'then play the Bdim7 arpeggio in four positions 3 frets apart over a G7 → C loop, resolving to a C chord tone each time', why: 'Finding the same sound in four places is the whole point of symmetric scales.' },
      goals: [
        { focus: 'Three scales', tasks: [{ label: 'Whole-tone, half-whole, dim7', ex: ex(SYM, 'symmetric'), minutes: 8, goal: 'clean at 84 BPM' }] },
        { focus: 'Pick the scale', tasks: [{ label: 'What to play over the chord', quiz: 'l8-chordscale', minutes: 5, goal: '2 stars' }] },
        { focus: 'Know the chords', tasks: [{ label: 'Triad types by ear', quiz: 'tr-ear', minutes: 4 }] },
        { focus: 'Over a blues', tasks: [{ label: 'Jam: a blues, dim7 a half step above each 7th chord', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['**Blues and jazz**: on the V7 of a blues, a dim7 arpeggio from the 3rd.', '**Metal and shred**: diminished arpeggios moved in minor 3rds.', '**Film moments**: a whole-tone run over an augmented chord before the song comes back in.'] },
      ],
      tasks: [{ label: 'Jam: tension and release with symmetric scales', tool: 'jam', minutes: 10 }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Name them, hear them, play them, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'What to play over the chord', quiz: 'l8-chordscale' },
        { skill: 'Hear', label: 'Triad types by ear', quiz: 'tr-ear' },
        { skill: 'Play', label: 'Whole-tone, diminished and dim7 (mic)', ex: ex(SYM, 'symmetric') },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Whole-tone and diminished: the symmetric scales". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) how each scale is built, (2) why there are only 2 whole-tone and 3 diminished scales, (3) which chord each fits, (4) the dim7-over-dominant trick. Ask me what dim7 fits over C7♭9. Keep it short.',
        points: ['whole-tone = all whole steps; diminished = alternating half and whole', 'they repeat every 2 frets / every 3 frets', 'whole-tone 7♯5; half-whole 7♭9; whole-half dim7', 'a dim7 a half step above the root = 7♭9 without its root'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'pgs8ySdPWi8', title: 'How to Use the Half-Whole Diminished Scale in the Blues (Guitar)' },
      books: [
        { book: 'Music Theory for Guitarists', where: 'The symmetric scales chapter', why: 'The theory and the chords they fit.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'Whole-tone and diminished', why: 'Shapes and licks.' },
      ],
      blocks: [{ p: '**Next**: putting it all together: what to play over any chord.' }],
    },
  ],
}

// ---- Lesson 8: what to play over any chord ---------------------------------------------------------------------
const CS = 'ii – V – I in C twice: D Dorian, G Mixolydian, C major; then G altered and C Lydian for colour'
export const OVER_ANY: CourseLesson = {
  id: 'c8-overchord', level: 8, n: 8, title: 'What to play over any chord', minutes: 80,
  goal: 'Choose a scale for any chord from three questions (what kind of chord, what key it\'s in, where it\'s going), use the chord-scale map, and solo over a ii – V – I with plain and coloured choices.',
  builds: ['all of Level 8 so far', 'seventh chords', 'targeting chord tones', 'reharmonisation'],
  topics: ['chord-scale', 'improvisation', 'modes', 'jazz', 'ii-V-I', 'soloing'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'You now know about 15 scales. This lesson turns them into one decision you can make in a second: **look at the chord, pick the sound**. It\'s how jazz players think, and it works in any style: when a song has a chord that isn\'t in the key, you\'ll know what to play.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['pick a scale for any chord with three questions;', 'use the chord-scale map without looking;', 'choose between a safe and a coloured option;', 'solo over a ii – V – I and resolve it.'] },
        { prog: { label: 'Dm7 – G7 – Cmaj7, then Dm7 – G7alt – Cmaj7', chords: [[50, 57, 60, 65], G7, Cmaj7, Cmaj7, [50, 57, 60, 65], G7alt, Cmaj7, C], gap: 0.8 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Three questions', blocks: [
        { list: [
          '**1 · What kind of chord?** maj7, m7, 7, m7♭5, dim7, m(maj7)… Its chord tones are non-negotiable: the scale must contain them.',
          '**2 · What key is it in?** If the chord belongs to the key, the key\'s notes usually work (that\'s the mode from that degree). If it\'s borrowed or secondary, its own notes plus the key\'s.',
          '**3 · Where is it going?** A dominant resolving to I can take tension (♭9, ♯9, altered). A dominant that stays can take Mixolydian or Lydian dominant.',
        ] },
        { p: 'Remember: a scale is a menu, not a script. Chord tones on strong beats (Level 6), scale notes in between.' },
        { video: { id: 'CsoB2o8PHfI', title: 'Chord Scale Relationships: What\'s the Best Scale to Play With Each Chord?', note: 'The chord-scale idea from the ground up.' } },
      ],
    },
    {
      kind: 'learn', title: '2 · The chord-scale map', blocks: [
        { list: [
          '**maj7**: Ionian (as I), **Lydian** (as IV, or for a brighter sound, ♯11).',
          '**m7**: **Dorian** (as ii), Aeolian (as vi), Phrygian (as iii).',
          '**7** (staying or going nowhere): **Mixolydian**; with ♯11: **Lydian dominant**.',
          '**7 → I** (resolving): Mixolydian (plain), **altered** (7alt), **half-whole** (7♭9 with 13).',
          '**7 → i** (minor): **Phrygian dominant** (7♭9♭13).',
          '**7♯5**: **whole-tone**.',
          '**m7♭5**: **Locrian** (Locrian ♮2 from melodic minor for a softer sound).',
          '**dim7**: **whole-half** diminished.',
          '**m(maj7)**, **m6**: **melodic minor**.',
        ] },
        { spots: modeFig('G altered over G7alt, frets 2–6: the gold tensions resolve by a half step into C.', 7, MODE.altered, 2, 6, [1, 3, 6, 8], true) },
      ],
    },
    {
      kind: 'learn', title: '3 · Safe, then coloured', blocks: [
        { p: 'For each chord there\'s a **safe** choice (the key\'s own notes) and a **coloured** one (one or more notes changed). Over ii – V – I in C:' },
        { list: ['Safe: D Dorian – G Mixolydian – C Ionian (all just C major).', 'Coloured: D Dorian – **G altered** – **C Lydian** (A♭, B♭, D♭, E♭ over G; F♯ over C).'] },
        { p: 'Play a chorus safe, then add one colour at a time. The ear should still hear the changes: if it doesn\'t, go back to chord tones.' },
        { video: { id: '63-PX9XvrKg', title: 'Intro To ALTERED DOMINANT Chords', note: 'Why the V is the chord to colour.' } },
      ],
    },
    {
      kind: 'learn', title: '4 · What mastery looks like', blocks: [
        { p: 'You own chord-scale thinking when:' },
        { list: ['You name a scale for any chord symbol in a chart in under two seconds.', 'You can play a ii – V – I safe and coloured in two keys.', 'Your lines still land on chord tones on the beat.', 'You choose colour on purpose, not by accident.'] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Three questions each time.', examples: [
        { q: 'In G major: what fits Am7?', steps: ['m7, ii of G.'], answer: 'A Dorian (the notes of G major).' },
        { q: 'In C major: what fits A7 going to Dm?', steps: ['A7 = V7/ii (secondary dominant), resolving to a minor chord.'], answer: 'A Phrygian dominant (D harmonic minor from A); A Mixolydian ♭13 is also used.' },
        { q: 'Fmaj7 in C, and you want it brighter.', steps: ['maj7, IV of C: Lydian is the key\'s own notes.'], answer: 'F Lydian (F G A B C D E).' },
        { q: 'Em7♭5 → A7 → Dm. What fits each?', steps: ['ii – V – i in D minor.', 'm7♭5: Locrian; V7 → minor: Phrygian dominant.'], answer: 'E Locrian, A Phrygian dominant (or altered), D Dorian or Aeolian.' },
        { q: 'A long B♭7 vamp in a funk tune.', steps: ['A dominant that doesn\'t resolve.'], answer: 'B♭ Mixolydian (bluesy) or B♭ Lydian dominant (modern).', spots: modeFig('', 10, MODE.lydianDominant, 5, 9, [6, 10], true) },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Over a ii – V – I, hear the difference between the safe V (Mixolydian) and the altered V: both resolve, but the altered one leans much harder into the I.' },
      ],
      drills: [
        { label: 'What to play over the chord', quiz: 'l8-chordscale', minutes: 6, goal: '8 out of 10' },
        { label: 'Hear it: which mode?', quiz: 'l8-mode-ear', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Changing scale on every chord of a diatonic progression.', right: 'If all the chords are in one key, the key\'s notes cover them. Change only for chords outside the key.' },
        { wrong: 'Playing the "right" scale but ending phrases on tensions.', right: 'Chord tones on strong beats; the scale fills in.' },
        { wrong: 'Using altered over a dominant that doesn\'t resolve.', right: 'Tension needs a target. Static dominants take Mixolydian or Lydian dominant.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Say each chord\'s scale out loud one beat before it arrives.',
      challenge: { label: 'Safe and coloured in three keys', ex: ex(CS, 'chordScale'), goal: 'then play a ii – V – I in F and B♭ (Key menu), one chorus safe and one coloured, and write down the scale for every chord of one jazz standard\'s chart', why: 'Keys you don\'t usually play make the map automatic.' },
      goals: [
        { focus: 'The map', tasks: [{ label: 'What to play over the chord', quiz: 'l8-chordscale', minutes: 6, goal: '2 stars' }] },
        { focus: 'ii – V – I', tasks: [{ label: 'Safe, then coloured', ex: ex(CS, 'chordScale'), minutes: 8, goal: 'clean at 84 BPM' }] },
        { focus: 'Land the changes', tasks: [{ label: 'Target notes', tool: 'targets', minutes: 6 }] },
        { focus: 'Over a tune', tasks: [{ label: 'Jam: a jazz progression, safe then coloured', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['**Songs**: take any song with a chord outside the key and choose a scale for it.', '**Jam**: jazz and neo-soul styles, safe choruses then coloured ones.', '**Improv coach**: ask for a ii – V – I and try the altered V.'] },
      ],
      tasks: [{ label: 'Jam: a ii – V – I progression', tool: 'jam', minutes: 10 }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Name them, hear them, play them, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'What to play over the chord', quiz: 'l8-chordscale' },
        { skill: 'Hear', label: 'Hear it: which mode?', quiz: 'l8-mode-ear' },
        { skill: 'Play', label: 'ii – V – I safe and coloured (mic)', ex: ex(CS, 'chordScale') },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "What to play over any chord". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) the three questions, (2) the chord-scale map for maj7, m7, 7, m7♭5 and dim7, (3) safe vs coloured choices over ii – V – I, (4) why chord tones still matter. Give me three chord symbols and ask for a scale for each. Keep it short.',
        points: ['what kind of chord, what key, where is it going', 'maj7 Ionian/Lydian, m7 Dorian, 7 Mixolydian/altered, m7♭5 Locrian, dim7 whole-half', 'safe = the key\'s notes; coloured = altered V, Lydian I', 'chord tones on strong beats keep the changes audible'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: '96cydVB4w-A', title: 'Playing In Every Mode with ONE Tiny Scale Shape' },
      books: [
        { book: 'Music Theory for Guitarists', where: 'Chord-scale relationships', why: 'The full map with examples.' },
        { book: 'Improvise for Real', where: 'The chapters on chords and the scale', why: 'Hearing every note against the chord, not just knowing it.' },
      ],
      blocks: [{ p: '**Next**: a modern way to play scales: two triads at a time.' }],
    },
  ],
}

// ---- Lesson 9: triad pairs and upper structures ----------------------------------------------------------------
const TP = 'C and D triads woven over Am7 – D (A Dorian), then D and A♭ triads on top of C7 (upper structures)'
export const TRIAD_PAIRS: CourseLesson = {
  id: 'c8-triadpairs', level: 8, n: 9, title: 'Triad pairs and upper structures', minutes: 80,
  goal: 'Play scales as two triads (triad pairs) for modern, intervallic lines, and use triads on top of 7th chords (upper structures) to get 9ths, 11ths, 13ths and altered sounds with shapes you already know.',
  builds: ['triads on every string set', 'what to play over any chord', 'melodic minor'],
  topics: ['triad pairs', 'upper structures', 'hexatonic', 'improvisation', 'jazz', 'fusion', 'prog'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Running scales up and down sounds like… scales. Players from Michael Brecker to Plini get a fresher sound by playing **two triads** that between them contain six notes of the scale, jumping between them. The lines skip and leap instead of stepping, and they sound modern immediately.' },
        { p: 'And on the chord side: put a simple triad **on top of** a 7th chord and you get a lush extended chord (9, ♯11, 13) or an altered one, with a shape you already know. That\'s an **upper structure**.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['pick a triad pair for any mode (two major triads a whole step apart);', 'play triad pair lines on the top strings;', 'name the upper-structure triads for 13♯11 and altered dominants;', 'use both over vamps and ii – V – Is.'] },
        { prog: { label: 'C and D triads, then D/C7 and A♭/C7', chords: [[60, 64, 67], [62, 66, 69], [60, 64, 67], [62, 66, 69], [48, 52, 58, 62, 66, 69], [48, 52, 58, 63, 68, 72]], gap: 0.7 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Triad pairs: two triads, six notes', blocks: [
        { p: 'Take two major triads a **whole step apart**, C (C E G) and D (D F♯ A). Together: **C D E F♯ G A**: six notes, no repeats. Those six notes fit:' },
        { list: ['**A Dorian** (missing only B): over Am7 – D.', '**G major/Lydian on C** (C Lydian without B).', '**D Mixolydian**, **E Aeolian**: any mode of G major where the two triads are the IV and V.'] },
        { p: 'Rule of thumb: the **IV and V triads** of a major key make a pair that covers every mode of that key (C and D for G major). Play C up, D up, C down, D down, in any inversion: the line leaps by 3rds and 4ths, and it can\'t sound like a scale.' },
        { video: { id: 'mG7It4ba5w4', title: 'Lesson #17: Intro to Triad Pairs', note: 'How triad pairs are built and practised, shown on the top strings.' } },
      ],
    },
    {
      kind: 'learn', title: '2 · Upper structures: a triad on top of a 7th chord', blocks: [
        { p: 'Hold the 3rd and ♭7 of a dominant in the bass (C7: E and B♭) and put a triad on top. The triad\'s notes become the chord\'s extensions:' },
        { list: [
          '**D triad over C7** (D F♯ A) = 9, ♯11, 13: **C13♯11** (Lydian dominant).',
          '**A triad over C7** (A C♯ E) = 13, ♭9, 3: **C13♭9** (half-whole diminished).',
          '**A♭ triad over C7** (A♭ C E♭) = ♭13, root, ♯9: **C7♯5♯9** (altered).',
          '**G♭ triad over C7** (G♭ B♭ D♭) = ♯11, ♭7, ♭9: **C7♭9♯11** (altered).',
        ] },
        { p: 'So the scale choices from lesson 8 now have chord shapes too, and you can play the triad as an arpeggio over the chord for an instant extended sound.' },
        { video: { id: '27Mu6u8bv3o', title: 'EXERT YOUR DOMINANCE! - Upper Structure Triads for Dominant Chords on Guitar', note: 'Upper-structure triads over dominant chords, as shapes on the guitar.' } },
      ],
    },
    {
      kind: 'learn', title: '3 · How to practise them', blocks: [
        { list: [
          'Start on the **top three strings** (Level 4): one triad pair in one 5-fret area.',
          'Alternate: triad 1 up, triad 2 up; then triad 1 down, triad 2 down; then mix inversions.',
          'Over a vamp (Am7 – D), play only the C and D triads for a whole chorus.',
          'For upper structures: play the bass notes (3 and ♭7) with your thumb or a bassist, and the triad on top.',
        ] },
        { spots: modeFig('A Dorian, frets 4–8: C and D triads together cover every note except B (the gold notes are the ♮6 and 9 that make it Dorian).', 9, MODE.dorian, 4, 8, [9, 2]) },
      ],
    },
    {
      kind: 'learn', title: '4 · What mastery looks like', blocks: [
        { p: 'You own triad pairs and upper structures when:' },
        { list: ['You pick the IV and V triads of a mode\'s parent key as a pair, on any root.', 'You can play a triad-pair line over a vamp for a whole chorus without falling back on the scale.', 'You name the upper-structure triad for C13♯11 (D) and for one altered sound (A♭ or G♭).', 'You hear the difference between a triad-pair line and a scale run.'] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Find the parent key, take its IV and V triads.', examples: [
        { q: 'Which triad pair fits E Dorian?', steps: ['E Dorian = D major\'s notes.', 'IV and V of D: G and A.'], answer: 'G and A triads (G B D + A C♯ E).' },
        { q: 'Which triad pair fits G Mixolydian?', steps: ['G Mixolydian = C major\'s notes.', 'IV and V of C: F and G.'], answer: 'F and G triads.' },
        { q: 'What upper structure gives F13♯11?', steps: ['A whole step above F is G.', 'G triad over F7: G B D = 9, ♯11, 13.'], answer: 'G triad over F7.' },
        { q: 'What does an E♭ triad over G7 give?', steps: ['E♭ G B♭ over G7: ♭13, root, ♯9.'], answer: 'G7♯5♯9 (altered).' },
        { q: 'How many notes do C and D triads have between them, and which note of G major is missing?', steps: ['C E G + D F♯ A = six notes.'], answer: 'Six; B is missing.', spots: modeFig('', 7, MODE.ionian, 2, 6, [11]) },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'A triad pair line sounds wide and bright: leaps of 3rds and 4ths, no stepwise runs. Upper structures sound like rich, clear chords: the triad on top rings like a melody.' },
      ],
      drills: [
        { label: 'What to play over the chord', quiz: 'l8-chordscale', minutes: 5 },
        { label: 'Spell the extended chord', quiz: 'l5-spell-ext', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Picking two triads that share notes (C and Am).', right: 'Triad pairs work because they share nothing: two major triads a whole step apart.' },
        { wrong: 'Running both triads in root position up and down.', right: 'Mix inversions and directions so the line moves smoothly across the neck.' },
        { wrong: 'Playing an upper structure with the chord\'s root and 5th doubling the triad.', right: 'Keep the bass to 3 and ♭7 (or the root alone): the triad on top is the colour.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Name the two triads before you start ("C and D: A Dorian").',
      challenge: { label: 'Triad pairs over a whole progression', ex: ex(TP, 'triadPair'), goal: 'then improvise over Am7 – D for two minutes using only C and D triads, then over a ii – V – I using F and G triads (C major) and an A♭ triad over the G7', why: 'A whole chorus without the scale forces the new sound into your ears.' },
      goals: [
        { focus: 'The line', tasks: [{ label: 'Triad pairs and upper structures', ex: ex(TP, 'triadPair'), minutes: 8, goal: 'clean at 84 BPM' }] },
        { focus: 'Triads on the top strings', tasks: [{ label: 'Triads on the top strings (review)', ex: { label: 'C, F and G triads on the top strings, all three inversions', tab: 'triKey' }, minutes: 5 }] },
        { focus: 'Name the extensions', tasks: [{ label: 'Spell the extended chord', quiz: 'l5-spell-ext', minutes: 4 }] },
        { focus: 'Over a vamp', tasks: [{ label: 'Jam: Am7 – D with only C and D triads', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['**Prog and fusion**: triad pairs over long vamps sound exactly like the players you like.', '**Comping**: upper-structure triads on the top strings over a bassist (or the looper) for lush chords.', '**Licks**: turn a triad pair into a sequence of four-note groups.'] },
      ],
      tasks: [{ label: 'Looper: a vamp, then triad pairs over it', tool: 'jam', minutes: 10 }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Name them, hear them, play them, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'What to play over the chord', quiz: 'l8-chordscale' },
        { skill: 'Apply', label: 'Spell the extended chord', quiz: 'l5-spell-ext' },
        { skill: 'Hear', label: 'Chord colours by ear', quiz: 'ch-ear-7' },
        { skill: 'Play', label: 'Triad pairs and upper structures (mic)', ex: ex(TP, 'triadPair') },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Triad pairs and upper structures". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) what a triad pair is and how to choose one, (2) which modes a pair covers, (3) what an upper structure is, (4) the upper structures for 13♯11 and an altered sound. Ask me for the triad pair of B Dorian. Keep it short.',
        points: ['two major triads a whole step apart, six different notes', 'the IV and V triads cover every mode of their key', 'a triad on top of a 7th chord whose notes become the extensions', 'D/C7 = C13♯11; A♭/C7 = C7♯5♯9 (or G♭/C7)'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: '27Mu6u8bv3o', title: 'EXERT YOUR DOMINANCE! - Upper Structure Triads for Dominant Chords on Guitar' },
      books: [
        { book: 'Triads for the Improvising Guitarist', where: 'The triad pair chapters', why: 'Triad pairs on every string set, with etudes.' },
        { book: 'Music Theory for Guitarists', where: 'Extended chords and upper structures', why: 'Which triad gives which extensions.' },
      ],
      blocks: [{ p: '**Next**: the final mastery check, then the whole course comes back as reviews.' }],
    },
  ],
}

const PAR8 = 'Seven modes on one root (C), brightest to darkest: listen for the note that changes'

// ---- Level 8 mastery check -------------------------------------------------------------------------------------
export const LEVEL8_CHECK: CourseLesson = {
  id: 'c8-check', level: 8, n: 10, title: 'Final mastery check', minutes: 35,
  goal: 'Show that modes and the sounds beyond them are yours: the seven modes and their colour notes, modal vamps, harmonic and melodic minor and their modes, the symmetric scales, chord-scale choices and triad pairs.',
  builds: ['all of Level 8'], topics: ['modes', 'vamps', 'harmonic minor', 'melodic minor', 'symmetric scales', 'chord-scale', 'triad pairs'],
  steps: [
    {
      kind: 'why', title: 'The last check', blocks: [
        { p: 'This check covers all of Level 8, and with it the whole theory course. Take it when the practice goals feel easy; anything you miss points back to the right lesson.' },
        { list: ['Pass it and the Level 8 badge is yours.', 'Every finished lesson keeps coming back as a short review, so the course stays in your hands.', 'From here, the style paths and the songs you love are where it all gets used.'] },
      ],
    },
    {
      kind: 'check', title: 'The check', intro: 'Ten parts across knowing, hearing and playing, then explain the level back to the teacher.',
      tasks: [
        { skill: 'Apply', label: 'Which major scale is the mode from?', quiz: 'l8-parent' },
        { skill: 'Apply', label: 'The colour note of a mode', quiz: 'l8-colour' },
        { skill: 'Apply', label: 'Which mode is the vamp?', quiz: 'l8-vamp' },
        { skill: 'Apply', label: 'What to play over the chord', quiz: 'l8-chordscale' },
        { skill: 'Hear', label: 'Hear it: which mode?', quiz: 'l8-mode-ear' },
        { skill: 'Play', label: 'Seven modes on one root (mic)', ex: ex(PAR8, 'modesParallel') },
        { skill: 'Play', label: 'Five modal vamps (mic)', ex: ex('Five modal vamps: Dorian Am7 – D, Mixolydian G – F, Lydian F – G/F, Phrygian Em – F, Aeolian Am – F – G', 'vamps') },
        { skill: 'Play', label: 'E Phrygian dominant (mic)', ex: ex('E Phrygian dominant (A harmonic minor from E): a low pedal riff over E, then up through E7 into Am', 'phrygDom') },
        { skill: 'Play', label: 'Melodic minor, Lydian dominant and altered (mic)', ex: ex(MM, 'melMinor') },
        { skill: 'Play', label: 'ii – V – I safe and coloured (mic)', ex: ex(CS, 'chordScale') },
      ],
      explain: {
        prompt: 'I just took the KGuitar Level 8 final mastery check (modes, modal vamps, harmonic minor and Phrygian dominant, melodic minor with Lydian dominant and altered, whole-tone and diminished, chord-scale choices, triad pairs and upper structures). Be my teacher for a short oral exam: ask me six questions across these topics, one at a time, including "spell B Phrygian dominant" and "what fits G7alt → C, and why?", tell me what I got right and missed, and finish with which lesson to review if anything was shaky.',
        points: ['relative vs parallel modes; the brightness ladder', 'colour notes: ♯4 ♭7 ♮6 ♭6 ♭2 ♭5', 'vamp = home + colour chord, no parent V → I', 'Phrygian dominant = harmonic minor from the 5th', 'Lydian dominant (5th up), altered (half step up)', 'whole-tone 7♯5, half-whole 7♭9, whole-half dim7', 'IV and V triads as a pair; triads on top of 7th chords'],
      },
    },
  ],
}
export const LEVEL8_B: CourseLesson[] = [MELODIC, SYMMETRIC, OVER_ANY, TRIAD_PAIRS, LEVEL8_CHECK]
void G7; void C
