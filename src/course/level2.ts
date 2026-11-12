// Theory course, Level 2: Scales, chords and keys (No Bull chapters 3–8 as the spine; Kolb, Fretboard Mastery Part 2 and
// the Practical Guide to Modern Music Theory for depth). Our own words; the books are pointed to, never copied.
import type { CourseLesson } from './types'
import { SHARPS } from '../theory/notes'
import { nm, type Spot } from './level1'

const MAJ = [0, 2, 4, 5, 7, 9, 11]
const DEG = ['1', '2', '3', '4', '5', '6', '7']
/** A scale's notes between two frets on every string, the root marked (labels: note names or degrees). */
export function scaleBox(midis: number[], rootPc: number, semis = MAJ, from = 0, to = 5, labels: 'note' | 'degree' = 'degree'): Spot[] {
  const out: Spot[] = []
  midis.forEach((o, s) => {
    for (let f = from; f <= to; f++) {
      const iv = (((o + f - rootPc) % 12) + 12) % 12
      const k = semis.indexOf(iv)
      if (k >= 0) out.push({ s, f, label: labels === 'note' ? nm(o + f) : DEG[k], role: k === 0 ? 'root' : 'scale' })
    }
  })
  return out
}
/** A scale along one string from fret `start` (one octave), labelled with the step sizes. */
function alongString(midis: number[], s: number, start: number, semis = MAJ): Spot[] {
  if (s >= midis.length) return []
  return [...semis, 12].map((iv, k) => ({ s, f: start + iv, label: k === 7 ? nm(midis[s] + start) : nm(midis[s] + start + iv), role: k === 0 || k === 7 ? 'root' as const : 'scale' as const })).filter(p => p.f <= 15)
}
export const MAJOR_SCALE: CourseLesson = {
  id: 'c2-major', level: 2, n: 1, title: 'The major scale', minutes: 40,
  goal: 'Build a major scale from any note with the tone/semitone recipe, spell it with the right sharps or flats, hear when it\'s right, and play it in a moveable two-octave shape.',
  builds: ['tones and semitones', 'the notes on the low E and A strings'], topics: ['major-scale', 'caged'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'You may not play the major scale much in solos (pentatonics come later), but it\'s the **measuring stick** for nearly everything else in theory. Chords are built from it, intervals are named from it, keys are made of it, and every other scale is described as "the major scale with a few notes changed".' },
        { p: 'Learn it properly once (the recipe, the degrees, the spelling, the sound, one moveable shape) and Levels 2 to 8 keep paying you back.' },
        { play: { label: 'C major: do re mi fa so la ti do', seq: [48, 50, 52, 53, 55, 57, 59, 60], gap: 0.33 } },
      ],
    },
    {
      kind: 'learn', title: 'A recipe of tones and semitones', blocks: [
        { p: 'A **scale** is a set of notes with a particular sound. The **major scale** is seven notes made by one fixed pattern of steps from a starting note (the **root**, or **tonic**):' },
        { p: '**Tone · Tone · Semitone · Tone · Tone · Tone · Semitone** (T T S T T T S), which on one string is **2 · 2 · 1 · 2 · 2 · 2 · 1 frets**.' },
        { spots: { caption: 'G major along the low E string, from fret 3: 2-2-1-2-2-2-1 frets.', to: 15, marks: midis => alongString(midis, 0, 3) } },
        { p: 'Start on any note and follow the same recipe: you get that note\'s major scale. Start on C (A string, fret 3) and you get C major; on G (low E, fret 3), G major. Change the recipe and it\'s no longer a major scale: it becomes something else (you\'ll meet those other recipes later).' },
        { spots: { caption: 'C major along the A string from fret 3.', to: 15, marks: midis => alongString(midis, 1, 3) } },
        { tip: 'Playing a scale along one string looks odd but shows the recipe clearly: you can see the semitones as the one-fret gaps. Players do it to understand the scale before learning its shapes across the strings.' },
      ],
    },
    {
      kind: 'learn', title: 'Why that recipe? Two matching halves', blocks: [
        { p: 'Split the major scale in the middle and you find **two identical halves**: C D E F (tone, tone, semitone) and G A B C (tone, tone, semitone), joined by a tone (F to G).' },
        { p: 'That symmetry is why the scale sounds so balanced, and why the top half of one major scale is the bottom half of the next one up (G major starts with G A B C). You\'ll see that again in the circle of fifths.' },
        { play: { label: 'C D E F … G A B C: the same shape of steps twice', seq: [48, 50, 52, 53, 55, 57, 59, 60], gap: 0.4 } },
      ],
    },
    {
      kind: 'learn', title: 'Degrees and do-re-mi', blocks: [
        { p: 'Each note gets a number, its **scale degree**: in C major, C is **1**, D **2**, E **3**, F **4**, G **5**, A **6**, B **7**, and C again is **8** (the octave). Singers use **do re mi fa so la ti do** for the same thing.' },
        { p: 'Why numbers? Because they work in **every key**. "The 3rd" is E in C major and B in G major, but it plays the same role and makes the same sound. Chords, intervals and solos are all described in degrees.' },
        { p: 'Some degrees **pull**: **7 wants to go up to 1** (that\'s why a scale that stops on ti sounds unfinished), and **4 leans down to 3**. Feeling those pulls is the start of hearing harmony.' },
        { play: { label: 'Stop on 7 (unfinished)… then resolve to 8', seq: [48, 50, 52, 53, 55, 57, 59, 59, 60], gap: 0.38 } },
      ],
    },
    {
      kind: 'learn', title: 'Spelling: every letter once', blocks: [
        { p: 'Follow the recipe from G: G (T) A (T) B (S) C (T) D (T) E (T) **F#** (S) G. The 7th step lands on the fret between F and G. We call it **F#**, not Gb, because a major scale uses **each letter exactly once**: G A B C D E F#. Gb would give two Gs and no F.' },
        { p: 'From F: F G A **Bb** C D E F. Here the 4th must be a B of some kind, one semitone above A: **Bb** (A# would skip B and repeat A).' },
        { p: 'Only **C major** has no sharps or flats: its semitones fall exactly on the natural E–F and B–C. Every other major scale needs at least one sharp **or** flats (never a mix), and no two major scales have the same seven notes.' },
        { list: ['G: G A B C D E **F#**', 'D: D E **F#** G A B **C#**', 'A: A B **C#** D E **F#** **G#**', 'F: F G A **Bb** C D E', 'Bb: Bb C D **Eb** F G A'] },
      ],
    },
    {
      kind: 'learn', title: 'One moveable shape (root on the low E)', blocks: [
        { p: 'Across the strings, the major scale fits in one hand position. With the root on the **low E string**, this shape covers two octaves using **one finger per fret** (your 2nd finger starts on the root):' },
        { spots: { caption: 'G major, root on the low E at fret 3 (the numbers are scale degrees; 1 = G).', from: 1, to: 5, marks: midis => scaleBox(midis, 7, MAJ, 2, 5) } },
        { p: 'Because there are no open strings in it, the shape is **moveable**: slide it so the root sits on A (fret 5) and it\'s A major; on C (fret 8), C major. One shape, twelve keys. It also sits around the **E-shape** barre chord: the CAGED idea again.' },
        { play: { label: 'G major in this shape, two octaves up and down', seq: [43, 45, 47, 48, 50, 52, 54, 55, 57, 59, 60, 62, 64, 66, 67, 66, 64, 62, 60, 59, 57, 55, 54, 52, 50, 48, 47, 45, 43], gap: 0.22 } },
        { tip: 'Say the degree numbers (1 2 3 4 5 6 7 1) while you play the shape. Knowing where the 3rd and 5th are inside it is what lets you build chords and target notes in solos later.' },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Work each out with the guitar, then check.', examples: [
        { q: 'Build D major along the D string.', steps: ['Open D is the root.', 'T → E (2), T → F# (4), S → G (5), T → A (7), T → B (9), T → C# (11), S → D (12).'], answer: 'D E F# G A B C# D (frets 0 2 4 5 7 9 11 12).', spots: { to: 12, marks: midis => alongString(midis, 2, 0) } },
        { q: 'Spell A major. Why G# and not Ab?', steps: ['A (T) B (T) C# (S) D (T) E (T) F# (T) G# (S) A.', 'The 7th note must be some kind of G (each letter once). The fret below A is G#.'], answer: 'A B C# D E F# G#: G# keeps every letter once.' },
        { q: 'Which major scale is G A B C D E F#?', steps: ['One sharp, F#.', 'Find the note the recipe starts from: the semitones fall B–C (3–4) and F#–G (7–8), so the scale starts on G.'], answer: 'G major.' },
        { q: 'What is the 5th degree of E major? The 3rd?', steps: ['E major: E F# G# A B C# D#.', 'Count: 1 E, 2 F#, 3 G#, 4 A, 5 B.'], answer: '5th = B, 3rd = G#.' },
        { q: 'Play B major with the moveable shape. Where does it start?', steps: ['The shape\'s root is on the low E.', 'B on the low E = fret 7 (a landmark).', 'Put your 2nd finger on fret 7 and play the same shape.'], answer: 'Root at fret 7 of the low E; the shape covers frets 6–9.', spots: { from: 5, to: 9, marks: midis => scaleBox(midis, 11, MAJ, 6, 9) } },
        { q: 'Why does F major have a Bb but no sharps?', steps: ['F (T) G (T) A (S) → the 4th is a semitone above A.', 'It must be a B (the next letter), so a lowered B: Bb.', 'The rest of the recipe lands on naturals: C D E F.'], answer: 'The semitone after A has to be Bb to keep each letter once; every other step lands on a natural.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'You already know the major scale\'s sound ("do re mi"). Two skills turn that into a musician\'s ear: noticing **when one note is wrong** (your ear expects the recipe), and feeling **each degree against the home note**. The Ear trainer plays a drone (the root humming) and a degree on top; with practice, each degree has its own feel: 3 bright, 4 restless, 7 itching to go up.' },
        { play: { label: 'The major scale with one wrong note (a b3): hear the change?', seq: [48, 50, 51, 53, 55, 57, 59, 60], gap: 0.38 } },
      ],
      drills: [
        { label: 'A major scale, or is something off? (ear)', quiz: 'l2-major-ear', minutes: 3, goal: '7 out of 8' },
        { label: 'Degrees over a drone (Ear trainer, start with 1 2 3)', tool: 'ear', minutes: 5 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Changing the recipe for "hard" keys.', right: 'The recipe never changes: T T S T T T S from any root. The sharps and flats are just where it lands.' },
        { wrong: 'Writing A# in F major (or Gb in G major).', right: 'Each letter once: F major has Bb, G major has F#.' },
        { wrong: 'Mixing sharps and flats in one major scale.', right: 'A major scale uses sharps or flats, never both.' },
        { wrong: 'Practising the shape without knowing where the root is.', right: 'Start and end every run on the root, and say the degree numbers.' },
        { wrong: 'Thinking the shape IS the scale.', right: 'The scale is the seven notes; the shape is one place to play them. Level 4 shows all five places.' },
      ],
    },
    {
      kind: 'practice', title: 'Your practice week', intro: 'Ten minutes a day. Slow, even notes with a click; say the degrees.',
      days: [
        { day: 'Day 1', focus: 'The recipe on one string', tasks: [
          { label: 'C major scale (say T T S T T T S)', ex: { label: 'C major scale', spec: { kind: 'scale', root: 'C', type: 'major', position: 0 } }, minutes: 6 },
        ] },
        { day: 'Day 2', focus: 'Spelling', tasks: [
          { label: 'Major scale quiz', quiz: 'nb-major', minutes: 5, goal: '10 right' },
        ] },
        { day: 'Day 3', focus: 'The moveable shape', tasks: [
          { label: 'G major scale, two octaves', ex: { label: 'G major scale', spec: { kind: 'scale', root: 'G', type: 'major', position: 0 } }, minutes: 6, goal: '70 BPM, even notes' },
        ] },
        { day: 'Day 4', focus: 'Hear it', tasks: [
          { label: 'A major scale, or is something off?', quiz: 'l2-major-ear', minutes: 3 },
          { label: 'Degrees over a drone', tool: 'ear', minutes: 4 },
        ] },
        { day: 'Day 5', focus: 'Move it', tasks: [
          { label: 'A major (the same shape at fret 5)', ex: { label: 'A major scale', spec: { kind: 'scale', root: 'A', type: 'major', position: 0 } }, minutes: 6 },
        ] },
        { day: 'Day 6', focus: 'Make music', tasks: [
          { label: 'A major-scale melody: Oh! Susanna', ex: { label: 'Oh! Susanna (melody)', songbook: { song: 'susanna', part: 'melody' } }, minutes: 6 },
        ] },
        { day: 'Day 7', focus: 'Improvise', tasks: [
          { label: 'Make up melodies with G major over a G–C–D band in Jam', tool: 'jam', minutes: 8 },
        ] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['Most folk, country, pop and worship melodies are major-scale melodies: Oh! Susanna uses only C major.', 'Over a song in G major, the G major scale fits every chord in the song: your first "safe" soloing scale.', 'Next lesson builds chords straight out of it: 1-3-5 is a major chord.'] },
      ],
      tasks: [
        { label: 'Improvise over a G major band in Jam', tool: 'jam' },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Major scale quiz', quiz: 'nb-major' },
        { skill: 'Hear', label: 'A major scale, or is something off?', quiz: 'l2-major-ear' },
        { skill: 'Play', label: 'A major scale in the moveable shape (mic)', ex: { label: 'A major scale', spec: { kind: 'scale', root: 'A', type: 'major', position: 0 } } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "The major scale". Quiz me as my teacher: ask me (1) the tone/semitone recipe and why it has two matching halves, (2) what scale degrees are and why we use numbers, (3) why G major has F# and F major has Bb, (4) how I play any major scale with one moveable shape. One question at a time; tell me what I got right and missed; keep it short.',
        points: ['T T S T T T S: two T T S halves joined by a tone', 'Degrees 1–7 name each note\'s job in any key; 7 pulls to 1', 'Each letter once: the semitone steps force F# in G and Bb in F', 'Root on the low E, one finger per fret, slide it to any root'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: '5MzePySWc6w', title: 'Fretboard Mapping: The Major Scale Formula' },
      books: [
        { book: 'No Bull Music Theory for Guitarists', where: 'Chapter 3: Major Scale', why: 'The recipe along one string, its exercises and self-test.' },
        { book: 'Guitar Fretboard Mastery', where: 'Part 2: Learning the Major Scale', why: 'The major scale in every position, with practice routines.' },
        { book: 'Music Theory for Guitarists', where: 'Chapter 3: Scales and Keys', why: 'Major scales in all 12 keys, in tab and notation.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'The major scale chapter', why: 'The scale\'s structure and how every other scale is built from it.' },
      ],
      blocks: [{ p: '**Extra credit**: play the major scale starting from its 6th note (A to A in C major) and listen: the same notes sound sad. That\'s the relative minor, coming in Level 3.' }],
    },
  ],
}

export const TRIADS: CourseLesson = {
  id: 'c2-triads', level: 2, n: 2, title: 'Major and minor triads', minutes: 40,
  goal: 'Build any major or minor triad from the major scale, see the triad inside every open and barre chord, flip chords between major and minor, and hear the difference instantly.',
  builds: ['the major scale', 'the notes on the low E and A strings'], topics: ['triads', 'chord-building', 'caged'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'You\'ve probably been playing triads since your first week, without knowing it: E, A, D, G and C are all triads. Understanding what\'s inside them changes how you play: you can fix a wrong chord by ear, turn any chord minor, build chords anywhere on the neck, and in solos, aim for the notes that make the chord sound.' },
        { p: 'Nearly every bigger chord (7ths, 9ths, sus, add) is a triad with something added. Triads are the foundation of all of it.' },
        { prog: { label: 'C major, then C minor: one note changes', chords: [[48, 52, 55], [48, 51, 55]], gap: 1.1 } },
      ],
    },
    {
      kind: 'learn', title: 'Major triad: 1, 3, 5', blocks: [
        { p: 'A **chord** is a group of notes sounding together. A **triad** is a chord of three different notes. A **major triad** takes the **1st, 3rd and 5th** notes of a major scale.' },
        { list: ['C major scale C D E F G A B → **C E G**', 'G major scale G A B C D E F# → **G B D**', 'D major scale D E F# G A B C# → **D F# A**'] },
        { p: 'In music talk, "major" is usually left off: a chord called just **G** is G major.' },
        { spots: { caption: 'The open C chord: only three different notes. The root C appears twice and E twice.', to: 3, marks: midis => (midis.length >= 6 ? [{ s: 1, f: 3, label: '1', role: 'root' as const }, { s: 2, f: 2, label: '3', role: 'chord' as const }, { s: 3, f: 0, label: '5', role: 'chord' as const }, { s: 4, f: 1, label: '1', role: 'root' as const }, { s: 5, f: 0, label: '3', role: 'chord' as const }] : []) } },
        { p: 'So a chord shape that covers five or six strings is still a triad if it only has three different notes: the others are just copies in other octaves.' },
      ],
    },
    {
      kind: 'learn', title: 'Minor triad: 1, ♭3, 5', blocks: [
        { p: 'A **minor triad** is the same, except the 3rd is **lowered one fret**: **1, ♭3, 5**. G minor = G **B♭** D. A minor = A **C** E. C minor = C **E♭** G.' },
        { p: 'That single fret is the whole difference between bright and dark. In fact the **♭3 is what makes anything minor**: minor chords, minor scales, minor keys all have it.' },
        { play: { label: 'E major (open), then E minor (the G# drops to G)', chord: [40, 47, 52, 56, 59, 64] } },
        { play: { label: 'E minor', chord: [40, 47, 52, 55, 59, 64] } },
        { list: ['**E → Em**: lift the finger on the G string (fret 1, the 3rd G#): the open G is the ♭3.', '**A → Am**: the C# on the B string (fret 2) moves down to C (fret 1).', '**D → Dm**: the F# on the high e (fret 2) moves down to F (fret 1).'] },
      ],
    },
    {
      kind: 'learn', title: 'Finding 1, 3 and 5 inside your chords', blocks: [
        { p: 'Take any chord you know and label its notes: the **root** names the chord, the **3rd** says major or minor, the **5th** adds strength. In the open E chord: E (root) on the low E, B (5th) on the A string, E (root) on the D, G# (3rd) on the G, B (5th) on the B, E (root) on the high e.' },
        { spots: { caption: 'Open E major labelled: three roots, two 5ths, one 3rd (the note that makes it major).', to: 3, marks: midis => (midis.length >= 6 ? [{ s: 0, f: 0, label: '1', role: 'root' as const }, { s: 1, f: 2, label: '5', role: 'chord' as const }, { s: 2, f: 2, label: '1', role: 'root' as const }, { s: 3, f: 1, label: '3', role: 'next' as const }, { s: 4, f: 0, label: '5', role: 'chord' as const }, { s: 5, f: 0, label: '1', role: 'root' as const }] : []) } },
        { tip: 'Notice there\'s only ONE 3rd in the E chord. That\'s typical: the 3rd is the most important note for the chord\'s colour, but it doesn\'t need doubling.' },
      ],
    },
    {
      kind: 'learn', title: 'Barre chords: moveable triads (CAGED, part 2)', blocks: [
        { p: 'Barre the open E shape up the neck and the triad moves with it. The **E-shape barre** has its root on the **low E**; the **A-shape** has it on the **A string**. Name the root and you\'ve named the chord, major or minor:' },
        { spots: { caption: 'G major, E-shape barre at fret 3 (1 = G, 3 = B, 5 = D).', from: 2, to: 6, marks: midis => (midis.length >= 6 ? [{ s: 0, f: 3, label: '1', role: 'root' as const }, { s: 1, f: 5, label: '5', role: 'chord' as const }, { s: 2, f: 5, label: '1', role: 'root' as const }, { s: 3, f: 4, label: '3', role: 'next' as const }, { s: 4, f: 3, label: '5', role: 'chord' as const }, { s: 5, f: 3, label: '1', role: 'root' as const }] : []) } },
        { p: 'Lower the 3rd (here B on the G string, fret 4 → fret 3) and it\'s **G minor**. The same with the A shape: C major at fret 3 has its 3rd on the B string; drop it a fret for C minor.' },
        { p: 'With the root notes from Level 1 and these two shapes you can already play all **24** major and minor chords: 12 roots × major or minor.' },
      ],
    },
    {
      kind: 'learn', title: 'Power chords: no 3rd at all', blocks: [
        { p: 'A **power chord** (E5, A5, G5) has only the **root and 5th** (often with the root doubled an octave up). No 3rd means it\'s **neither major nor minor**, and that\'s exactly why it works so well: it fits under major or minor songs, and with distortion the missing 3rd keeps it from sounding muddy.' },
        { p: 'Strictly, a power chord isn\'t a triad (only two different notes). Add the 3rd and it becomes a major or minor triad.' },
        { play: { label: 'G5 power chord (root, 5th, octave)', chord: [43, 50, 55] } },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Spell, then find on the neck.', examples: [
        { q: 'Spell D major and D minor.', steps: ['D major scale: D E F# G A B C#.', '1, 3, 5 → D F# A.', 'Lower the 3rd: F# → F.'], answer: 'D major = D F# A; D minor = D F A.' },
        { q: 'Spell B♭ major and B♭ minor.', steps: ['B♭ major scale: B♭ C D E♭ F G A.', '1, 3, 5 → B♭ D F.', 'Lower the 3rd: D → D♭.'], answer: 'B♭ major = B♭ D F; B♭ minor = B♭ D♭ F.' },
        { q: 'An open chord has the notes A, C and E. What is it?', steps: ['Try each as the root. From A: C is a ♭3 (3 frets), E is the 5th.', 'Root + ♭3 + 5 = minor triad.'], answer: 'A minor.' },
        { q: 'Play F# minor as a barre chord. Which shape, where?', steps: ['F# on the low E is fret 2.', 'E-shape minor barre with its root at fret 2.'], answer: 'E-shape minor barre at fret 2 (or the A-shape at fret 9).' },
        { q: 'Is C5 major or minor?', steps: ['C5 = C and G only.', 'No E (3rd) and no E♭ (♭3).'], answer: 'Neither: it has no 3rd.' },
        { q: 'In the open G chord, which string has the 3rd?', steps: ['G major = G B D.', 'Open G: G (low E 3), B (A 2), D (open D), G (open G), B (open B), G (high e 3).', 'B is on the A string (fret 2) and the open B string.'], answer: 'The A string (fret 2) and the open B string.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Major or minor is the first chord sound everyone learns to hear, and it\'s worth getting automatic: it lets you work out songs, catch wrong chords on a chord sheet, and later hear chord changes as numbers. Listen to the **3rd**: major sounds open and bright, minor darker, more inward.' },
        { list: ['Strum E, then Em, then E: focus on the one string that changes.', 'Hum the 3rd of each chord after you strum it.', 'Then try the triad drill: major, minor, and the two rarer kinds (diminished and augmented) for later.'] },
      ],
      drills: [
        { label: 'Major or minor? (ear)', quiz: 'ch-ear', minutes: 4, goal: '9 out of 10' },
        { label: 'Triad types by ear', quiz: 'tr-ear', minutes: 3 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Thinking a six-string chord has six different notes.', right: 'Most open and barre chords are triads: three notes, some doubled.' },
        { wrong: 'Lowering the root or the 5th to make a chord minor.', right: 'Only the 3rd changes: 1, ♭3, 5.' },
        { wrong: 'Calling E5 "E major".', right: 'Power chords have no 3rd: they\'re neither major nor minor.' },
        { wrong: 'Spelling C minor with D#.', right: 'The ♭3 of C is E♭ (a kind of E: it\'s the 3rd letter), not D#.' },
        { wrong: 'Learning barre shapes without knowing which string holds the root.', right: 'E shape = root on the low E; A shape = root on the A string.' },
      ],
    },
    {
      kind: 'practice', title: 'Your practice week', intro: 'Name the root and the 3rd of every chord you play this week.',
      days: [
        { day: 'Day 1', focus: 'Spell them', tasks: [
          { label: 'Spell the triad', quiz: 'tr-spell', minutes: 5 },
        ] },
        { day: 'Day 2', focus: 'Major ↔ minor in open chords', tasks: [
          { label: 'Major triad arpeggio: C (1-3-5)', ex: { label: 'C major triad', spec: { kind: 'arpeggio', root: 'C', type: 'maj', position: 0 } }, minutes: 4 },
          { label: 'Minor triad arpeggio: A (1-♭3-5)', ex: { label: 'A minor triad', spec: { kind: 'arpeggio', root: 'A', type: 'min', position: 0 } }, minutes: 4 },
        ] },
        { day: 'Day 3', focus: 'Hear it', tasks: [
          { label: 'Major or minor? (ear)', quiz: 'ch-ear', minutes: 4 },
        ] },
        { day: 'Day 4', focus: 'Barre chords as root finders', tasks: [
          { label: 'Barre chords: where does it go?', quiz: 'ch-barre', minutes: 5 },
        ] },
        { day: 'Day 5', focus: 'Use them', tasks: [
          { label: 'Major and minor chords in a song: Scarborough Fair', ex: { label: 'Scarborough Fair', songbook: { song: 'scarborough', part: 'words' } }, minutes: 6 },
        ] },
        { day: 'Day 6', focus: 'Find the 3rds', tasks: [
          { label: 'See the triads across the neck (CAGED explorer)', tool: 'caged', minutes: 6 },
        ] },
        { day: 'Day 7', focus: 'Play over them', tasks: [
          { label: 'Strum major and minor barres over a band in Jam', tool: 'jam', minutes: 6 },
        ] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['A chord sheet says Bm and you don\'t know the shape? A-shape minor barre at fret 2.', 'In a solo, landing on the chord\'s 3rd makes the chord change obvious; landing on its root sounds safe.', 'Writing: swap one chord in a progression to its minor (or major) twin and hear the mood change.'] },
      ],
      tasks: [
        { label: 'Play C, Am, F and G over a band in Jam', tool: 'jam' },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Spell the triad', quiz: 'tr-spell' },
        { skill: 'Hear', label: 'Major or minor? (ear)', quiz: 'ch-ear' },
        { skill: 'Play', label: 'Barre chords: where does it go? (mic)', quiz: 'ch-barre', how: 'play' },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Major and minor triads". Quiz me as my teacher: ask me (1) the formulas for major and minor triads and where they come from, (2) why open chords with five or six strings are still triads, (3) how I turn E into Em and A into Am, (4) how barre chords and power chords fit in. One question at a time; tell me what I got right and missed; keep it short.',
        points: ['Major 1-3-5, minor 1-♭3-5, from the major scale', 'Only three different notes, some doubled', 'Lower the 3rd one fret (G#→G, C#→C)', 'E-shape/A-shape barres move triads; power chords have no 3rd'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'vlQP1FwQ6ZA', title: 'Guitar Triads for Beginners: How They Work in Simple English' },
      books: [
        { book: 'No Bull Music Theory for Guitarists', where: 'Chapter 4: Major and Minor Triads', why: 'The two formulas with chord-shape exercises.' },
        { book: 'Triads and Inversions', where: 'The opening chapters', why: 'Small triad shapes on every string set: where Level 4 goes.' },
        { book: 'Music Theory for Guitarists', where: 'Chapter 5: Triads', why: 'All four triad types and their shapes.' },
      ],
      blocks: [{ p: '**Extra credit**: there are two more triad types: **diminished** (1, ♭3, ♭5: tense) and **augmented** (1, 3, #5: dreamy, unresolved). You\'ll build them in Level 5.' }],
    },
  ],
}

export const INTERVALS: CourseLesson = {
  id: 'c2-intervals', level: 2, n: 3, title: 'Intervals from the major scale', minutes: 40,
  goal: 'Name the distance between any note and the notes of its major scale, find each interval as a shape on the neck, and recognise them by ear.',
  builds: ['the major scale', 'major and minor triads'], topics: ['intervals', 'ear'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'An **interval** is the distance between two notes. Musicians use intervals constantly: "a 3rd above", "add the 9th", "the 5th of the chord", "sus4". They\'re the words for describing chords, scales and melodies in **any** key at once.' },
        { p: 'On the guitar every interval is also a **shape** that works anywhere on the neck. Learn the shapes and you can find a chord\'s 3rd or 7th, harmonise a melody, or play a riff in any key without counting.' },
      ],
    },
    {
      kind: 'learn', title: 'Numbering from the major scale', blocks: [
        { p: 'The easy way to name intervals: count up the **major scale of the lower note**. In C major, from C: D is a **2nd**, E a **3rd**, F a **4th**, G a **5th**, A a **6th**, B a **7th**, and C an **octave** (8th).' },
        { p: 'Count the starting note as **1**: C to E is C(1) D(2) E(3), a 3rd. (It\'s the most common slip: counting C to E as "2 steps".)' },
        { play: { label: 'From C: 2nd, 3rd, 4th, 5th, 6th, 7th, octave', seq: [48, 50, 48, 52, 48, 53, 48, 55, 48, 57, 48, 59, 48, 60], gap: 0.3 } },
      ],
    },
    {
      kind: 'learn', title: 'Their full names: major and perfect', blocks: [
        { p: 'Each interval also has a **quality**. In the major scale: the **2nd, 3rd, 6th and 7th are major**; the **4th, 5th and octave are perfect**. Why "perfect"? Those three sound so stable and blended that they were treated as the purest consonances; and unlike the others, they\'re the same in major and minor keys.' },
        { list: ['Major 2nd (M2): 2 semitones', 'Major 3rd (M3): 4', 'Perfect 4th (P4): 5', 'Perfect 5th (P5): 7', 'Major 6th (M6): 9', 'Major 7th (M7): 11', 'Octave (P8): 12'] },
        { p: 'Next lesson lowers and raises these (minor 3rd, ♭7…), which explains every chord name you\'ll meet.' },
      ],
    },
    {
      kind: 'learn', title: 'Intervals as shapes', blocks: [
        { p: 'On one string, an interval is just frets: M3 = 4 frets, P5 = 7 frets. But players mostly use **two-string shapes**. From a root on the low E or A string:' },
        { list: ['**2nd**: up 2 frets on the same string (or one string up, 3 frets back)', '**3rd**: one string up, 1 fret back', '**4th**: one string up, same fret', '**5th**: one string up, 2 frets up (the power chord)', '**6th**: two strings up, 1 fret back', '**7th**: two strings up, 1 fret up (or one fret below the octave)', '**Octave**: two strings up, 2 frets up'] },
        { spots: { caption: 'From A (low E, fret 5): 3rd, 4th, 5th, 6th, 7th and octave as shapes.', from: 3, to: 8, marks: midis => (midis.length >= 6 ? [{ s: 0, f: 5, label: '1', role: 'root' as const }, { s: 1, f: 4, label: '3', role: 'chord' as const }, { s: 1, f: 5, label: '4', role: 'chord' as const }, { s: 1, f: 7, label: '5', role: 'chord' as const }, { s: 2, f: 4, label: '6', role: 'chord' as const }, { s: 2, f: 6, label: '7', role: 'chord' as const }, { s: 2, f: 7, label: '8', role: 'next' as const }] : []) } },
        { p: '**The B-string rule again**: any shape that crosses from the G to the B string moves **one fret further up**. A 4th from the G string to the B string is one fret up, not the same fret.' },
      ],
    },
    {
      kind: 'learn', title: 'Intervals inside chords and riffs', blocks: [
        { p: 'Chords are stacks of intervals: a major triad is a root with a **major 3rd** and a **perfect 5th** above it. Chord names use the numbers too: **Csus2** replaces the 3rd with the 2nd, **Csus4** with the 4th, **C6** adds the 6th, **Cmaj7** adds the major 7th, **C5** is root and 5th.' },
        { p: 'Riffs and melodies are interval moves: a lot of rock is built on 4ths and 5ths, folk melodies move mostly in 2nds and 3rds, and big emotional leaps are 6ths and octaves.' },
        { prog: { label: 'D, Dsus2, Dsus4, D: the 3rd replaced by the 2nd, then the 4th', chords: [[50, 57, 62, 66], [50, 57, 62, 64], [50, 57, 62, 67], [50, 57, 62, 66]], gap: 0.9 } },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Use the major scale of the lower note.', examples: [
        { q: 'What interval is G up to E?', steps: ['G major: G A B C D E F#.', 'Count: G 1, A 2, B 3, C 4, D 5, E 6.'], answer: 'A major 6th.' },
        { q: 'What note is a perfect 5th above D? A major 3rd above D?', steps: ['D major: D E F# G A B C#.', '5th = A; 3rd = F#.'], answer: 'A, and F#.' },
        { q: 'Find a 5th above C on the A string (fret 3) as a shape.', steps: ['5th = one string up, two frets up.', 'D string, fret 5: G.'], answer: 'D string, fret 5 (G).' },
        { q: 'Find the 3rd above the G on the G string (open) as a shape. Careful!', steps: ['The usual 3rd shape is one string up, 1 fret back.', 'But G → B crosses the B-string gap: add one fret.', 'So the same fret: the open B. G to B is a major 3rd.'], answer: 'The open B string: the B-string shift turns "1 back" into "same fret".' },
        { q: 'Name the intervals in an A major chord (A C# E) from the root.', steps: ['A major: A B C# D E F# G#.', 'C# is the 3rd (major 3rd), E the 5th (perfect 5th).'], answer: 'Root, major 3rd, perfect 5th.' },
        { q: 'How many semitones is a perfect 4th? Find E up a 4th.', steps: ['P4 = 5 semitones.', 'E + 5 frets = A.'], answer: '5 semitones; E up a 4th is A (the next string\'s open note).' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Every interval has its own sound, and the quickest way to learn them is to tie each to a melody you already know: the **start** of a song that leaps by that interval. Sing the song in your head and you\'ll hear the interval. Then practise until you hear it without the song.' },
        { list: ['2nd: do → re', 'Major 3rd: "When the Saints" (do → mi)', 'Perfect 4th: "Here Comes the Bride"', 'Perfect 5th: "Twinkle, Twinkle, Little Star"', 'Major 6th: "My Bonnie Lies Over the Ocean"', 'Major 7th: one step short of the octave, tense', 'Octave: "Somewhere Over the Rainbow"'] },
        { p: 'Better still: sing intervals from your root. Play a note, sing it, then sing up a 3rd, a 5th; check on the guitar.' },
      ],
      drills: [
        { label: 'Intervals of the major scale (ear)', quiz: 'l2-int-ear', minutes: 4, goal: '8 out of 10' },
        { label: 'Degrees over a drone (Ear trainer, add 4 and 5)', tool: 'ear', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Not counting the starting note (C to E = "2").', right: 'The first note is 1: C(1) D(2) E(3), a 3rd.' },
        { wrong: 'Using the major scale of the upper note.', right: 'Always count up the major scale of the LOWER note.' },
        { wrong: 'Forgetting the B-string shift in interval shapes.', right: 'Crossing from G to B: one fret further up.' },
        { wrong: 'Calling a 4th or 5th "major".', right: '4ths, 5ths and octaves are "perfect".' },
        { wrong: 'Learning the names but not the sounds.', right: 'Sing every interval you learn; tie it to a song opening.' },
      ],
    },
    {
      kind: 'practice', title: 'Your practice week', intro: 'Sing a little every day; it\'s the fastest route to hearing intervals.',
      days: [
        { day: 'Day 1', focus: 'Names', tasks: [
          { label: 'Intervals quiz', quiz: 'nb-int', minutes: 5 },
        ] },
        { day: 'Day 2', focus: 'Shapes', tasks: [
          { label: 'Every interval from A (play the shapes)', ex: { label: 'Every interval from A', tab: 'intervals' }, minutes: 6 },
        ] },
        { day: 'Day 3', focus: 'Hear them', tasks: [
          { label: 'Intervals of the major scale (ear)', quiz: 'l2-int-ear', minutes: 4 },
        ] },
        { day: 'Day 4', focus: 'Shapes across the B string', tasks: [
          { label: 'Octave pairs across the B string (the same shift)', ex: { label: 'Octave pairs across the B string', tab: 'octaveCross' }, minutes: 5 },
        ] },
        { day: 'Day 5', focus: 'Sus chords', tasks: [
          { label: 'Play D, Dsus2, Dsus4 and hear the 3rd replaced (Chords tool), then the ear drill', quiz: 'l2-int-ear', minutes: 5 },
        ] },
        { day: 'Day 6', focus: 'Drone', tasks: [
          { label: 'Degrees over a drone', tool: 'ear', minutes: 6 },
        ] },
        { day: 'Day 7', focus: 'Melody', tasks: [
          { label: 'Find the intervals in a melody: When the Saints (it opens with a major 3rd)', ex: { label: 'When the Saints Go Marching In (melody)', songbook: { song: 'saints', part: 'melody' } }, minutes: 6 },
        ] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['Add the 2nd or 4th to an open chord (sus2, sus4) and let it fall back to the 3rd: instant movement in strumming parts.', 'Harmonise a melody in 3rds or 6ths: the sweet two-guitar sound of country and Southern rock.', 'Read chord names as intervals: C6 = C chord + A (the 6th).'] },
      ],
      tasks: [
        { label: 'Every interval from A', ex: { label: 'Every interval from A', tab: 'intervals' } },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Intervals quiz', quiz: 'nb-int' },
        { skill: 'Hear', label: 'Intervals of the major scale (ear)', quiz: 'l2-int-ear' },
        { skill: 'Play', label: 'Every interval from A (mic)', ex: { label: 'Every interval from A', tab: 'intervals' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Intervals from the major scale". Quiz me as my teacher: ask me (1) how I name an interval and why I count the first note as 1, (2) which intervals are major and which perfect, (3) the shapes for a 3rd, 5th and octave from the low E, and what changes across the B string, (4) a song I use to hear a 4th and a 5th. One question at a time; tell me what I got right and missed; keep it short.',
        points: ['Count up the lower note\'s major scale, first note = 1', '2 3 6 7 major; 4 5 8 perfect', '3rd: one string up 1 back; 5th: one up 2 up; octave: two up 2 up; +1 fret across G→B', 'P4 Here Comes the Bride, P5 Twinkle Twinkle'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'ACFxPUEoBVc', title: 'What Are Intervals on Guitar, in 4 Minutes' },
      books: [
        { book: 'No Bull Music Theory for Guitarists', where: 'Chapter 5: Major Scale Intervals', why: 'Intervals counted from the major scale, with neck exercises.' },
        { book: 'Guitar Fretboard Mastery', where: 'Part 5: Music Intervals on Guitar', why: 'Every interval shape on every string pair.' },
        { book: 'Music Theory for Guitarists', where: 'Chapter 4: Intervals', why: 'Interval qualities and inversions.' },
        { book: 'Improvise for Real', where: 'The early chapters on hearing scale tones', why: 'Hearing notes by their place in the key: the next step after naming intervals.' },
      ],
      blocks: [{ p: '**Extra credit**: turn an interval upside down (C up to G is a 5th; G up to C is a 4th) and the numbers always add up to 9: 5 + 4, 3 + 6, 2 + 7. Handy for finding notes downward.' }],
    },
  ],
}

export const LEVEL2: CourseLesson[] = [MAJOR_SCALE, TRIADS, INTERVALS]
