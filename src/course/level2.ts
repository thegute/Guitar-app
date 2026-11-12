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
        { book: 'Music Theory for Guitarists', where: 'Chapter 3: Scales', why: 'Major scales in all 12 keys, in tab and notation.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'Part One: the major scale and its construction', why: 'The scale\'s structure and how every other scale is built from it.' },
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
        { book: 'Triads and Inversions', where: 'Major and minor triads (root position)', why: 'Small triad shapes on every string set: where Level 4 goes.' },
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
        { book: 'Guitar Fretboard Mastery', where: 'Part 5: Music Intervals on Guitar (intervals in a major scale)', why: 'Interval shapes on the neck, with exercises.' },
        { book: 'Music Theory for Guitarists', where: 'Chapter 4: Intervals', why: 'Interval qualities and inversions.' },
        { book: 'Improvise for Real', where: 'Seven little notes, and Exercise 2: Melody', why: 'Hearing notes by their place in the key: the next step after naming intervals.' },
      ],
      blocks: [{ p: '**Extra credit**: turn an interval upside down (C up to G is a 5th; G up to C is a 4th) and the numbers always add up to 9: 5 + 4, 3 + 6, 2 + 7. Handy for finding notes downward.' }],
    },
  ],
}

const G6 = (midis: number[]) => midis.length >= 6 && midis[1] - midis[0] === 5 && midis[2] - midis[1] === 5 && midis[3] - midis[2] === 5 && midis[4] - midis[3] === 4

export const CHROMATIC: CourseLesson = {
  id: 'c2-chromatic', level: 2, n: 4, title: 'Flat and sharp intervals (and chord names)', minutes: 40,
  goal: 'Name all twelve intervals, find the flat ones (♭2 ♭3 ♭5 ♭6 ♭7) as shapes on the neck, and read any chord name (m, 7, maj7, m7, dim, aug, sus, add9) as a recipe of intervals.',
  builds: ['intervals from the major scale', 'major and minor triads'], topics: ['intervals', 'chord-building', 'ear'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'The major scale gives seven intervals. Music uses all twelve. The other five are made by **lowering or raising** the major-scale ones, and they\'re behind almost every interesting sound: the ♭3 that makes minor sad, the ♭7 that makes the blues and rock swagger, the tritone that makes a dominant chord pull.' },
        { p: 'Once you know them, a chord name stops being a shape to memorise and becomes a **recipe**: Am7 is 1, ♭3, 5, ♭7, and you can build it anywhere on the neck.' },
        { prog: { label: 'C, C7, Cmaj7, Cm7: one note changes the colour each time', chords: [[48, 52, 55, 60], [48, 52, 55, 58], [48, 52, 55, 59], [48, 51, 55, 58]], gap: 1.1 } },
      ],
    },
    {
      kind: 'learn', title: 'Lower a major interval: it becomes minor', blocks: [
        { p: 'Take any **major** interval (2nd, 3rd, 6th, 7th) and make it one fret smaller: it becomes **minor**. We write it with a flat in front of the degree:' },
        { list: ['Major 2nd (2 frets) → **minor 2nd, ♭2** (1 fret)', 'Major 3rd (4) → **minor 3rd, ♭3** (3)', 'Major 6th (9) → **minor 6th, ♭6** (8)', 'Major 7th (11) → **minor 7th, ♭7** (10)'] },
        { p: 'You met the ♭3 already: it\'s what makes a minor triad minor. Perfect intervals work differently: lower a perfect 5th and it becomes **diminished** (♭5); raise a perfect 4th and it becomes **augmented** (#4). Raise a 5th: augmented 5th (#5).' },
        { play: { label: 'From C: major 3rd, then minor 3rd', seq: [48, 52, 48, 51], gap: 0.45 } },
        { play: { label: 'From C: major 7th, then minor 7th', seq: [48, 59, 48, 58], gap: 0.45 } },
      ],
    },
    {
      kind: 'learn', title: 'All twelve, in one table', blocks: [
        { p: 'Every distance from 0 to 12 frets has a name. Learn this table and you can name anything:' },
        { list: ['0 · unison (1)', '1 · minor 2nd (**♭2**)', '2 · major 2nd (2)', '3 · minor 3rd (**♭3**)', '4 · major 3rd (3)', '5 · perfect 4th (4)', '6 · **tritone**: augmented 4th (#4) or diminished 5th (♭5)', '7 · perfect 5th (5)', '8 · minor 6th (**♭6**), also written #5 in chords', '9 · major 6th (6)', '10 · minor 7th (**♭7**)', '11 · major 7th (7)', '12 · octave (8)'] },
        { p: 'The **tritone** (6 frets) sits exactly halfway to the octave: three whole tones. It\'s the most unstable interval, and the reason a dominant 7th chord pulls so hard to its home chord.' },
        { tip: 'The same distance can have two names (#4 or ♭5; #5 or ♭6). Which one depends on the job: in a chord built 1-3-#5 the top note is a raised 5th; in a scale with a lowered 6th it\'s a ♭6.' },
      ],
    },
    {
      kind: 'learn', title: '♭3 doesn\'t mean "a flat note"', blocks: [
        { p: 'This trips up nearly everyone. In a degree, the ♭ means **one fret lower than the major-scale note**, not "a note with a flat in its name".' },
        { list: ['The ♭3 of **A**: A major\'s 3rd is C#, lowered → **C** (a natural note).', 'The ♭7 of **E**: E major\'s 7th is D#, lowered → **D**.', 'The ♭3 of **F**: F major\'s 3rd is A, lowered → **A♭** (here it IS a flat).', 'The #4 of **F**: B♭ raised → **B** (a natural).'] },
        { p: 'And keep the **letter**: the ♭3 of D is F (a kind of F, three letters up from D), never E#. The ♭5 of C is G♭, while the #4 of C is F#: same fret, different jobs.' },
      ],
    },
    {
      kind: 'learn', title: 'The flat intervals as shapes', blocks: [
        { p: 'From a root on the **low E** or **A** string, each flat interval is one fret back from its major shape:' },
        { list: ['**♭2**: one fret up the same string', '**♭3**: one string up, **2 frets back**', '**♭5** (tritone): one string up, **1 fret up**', '**♭6**: two strings up, **2 frets back**', '**♭7**: two strings up, **same fret**'] },
        { spots: { caption: 'From A (low E, fret 5): ♭2, ♭3, ♭5, ♭6 and ♭7 as shapes.', from: 2, to: 7, marks: midis => (G6(midis) ? [{ s: 0, f: 5, label: '1', role: 'root' as const }, { s: 0, f: 6, label: '♭2', role: 'chord' as const }, { s: 1, f: 3, label: '♭3', role: 'chord' as const }, { s: 1, f: 6, label: '♭5', role: 'chord' as const }, { s: 2, f: 3, label: '♭6', role: 'chord' as const }, { s: 2, f: 5, label: '♭7', role: 'chord' as const }] : []) } },
        { p: 'Notice the ♭7: two strings up at the **same fret** as the root. That\'s exactly the note your pinky (or ring finger) adds to make a barre chord into a 7th chord. The B-string rule still applies: crossing from G to B, add a fret.' },
      ],
    },
    {
      kind: 'learn', title: 'Reading chord names', blocks: [
        { p: 'Chord names are lists of intervals stacked on a root. With the twelve intervals you can decode them all:' },
        { list: ['**C** (major): 1 3 5', '**Cm**: 1 ♭3 5', '**C7** ("dominant 7th"): 1 3 5 **♭7**', '**Cmaj7**: 1 3 5 **7**', '**Cm7**: 1 ♭3 5 ♭7', '**Cdim**: 1 ♭3 ♭5 · **Caug** (C+): 1 3 #5', '**Csus2**: 1 2 5 · **Csus4**: 1 4 5', '**C6**: 1 3 5 6 · **Cadd9**: 1 3 5 + 9'] },
        { p: 'Two rules hidden in those names: a plain **"7"** always means the **♭7** (the commonest 7th chord, the blues and rock one); the 7 from the major scale has to be asked for by name, **maj7**. And numbers above 8 are the same notes an octave up: **9 = 2, 11 = 4, 13 = 6**. Cadd9 adds D, just higher.' },
        { play: { label: 'C7 (1 3 5 ♭7)', chord: [48, 52, 55, 58] } },
        { play: { label: 'Cmaj7 (1 3 5 7)', chord: [48, 52, 55, 59] } },
        { play: { label: 'Cm7 (1 ♭3 5 ♭7)', chord: [48, 51, 55, 58] } },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Use the major scale of the root, then lower or raise.', examples: [
        { q: 'What is the ♭3 of E?', steps: ['E major: E F# G# A B C# D#.', 'The 3rd is G#; one fret lower is G.'], answer: 'G (which is why Em is E G B).' },
        { q: 'Spell C7.', steps: ['C major: C D E F G A B.', '1 3 5 = C E G; the 7 is B, lowered → B♭.'], answer: 'C E G B♭.' },
        { q: 'Spell Am7.', steps: ['A major: A B C# D E F# G#.', '1 = A, ♭3 = C, 5 = E, ♭7 = G.'], answer: 'A C E G.' },
        { q: 'C up to F#: what interval?', steps: ['C major: C D E F G…', 'F is the 4th; F# is one fret higher, keeping the letter F.'], answer: 'An augmented 4th (#4): the tritone. Written G♭ it would be a ♭5.' },
        { q: 'Find the ♭7 of A as a shape from the low E (fret 5).', steps: ['♭7 = two strings up, same fret.', 'D string, fret 5: G.'], answer: 'D string, fret 5 (G).', spots: { from: 3, to: 7, marks: midis => (G6(midis) ? [{ s: 0, f: 5, label: 'A', role: 'root' as const }, { s: 2, f: 5, label: 'G', role: 'target' as const }] : []) } },
        { q: 'What makes Dmaj7 and D7 different?', steps: ['Both are D F# A plus a 7th.', 'D major\'s 7th is C#: Dmaj7 = D F# A C#.', 'D7 lowers it: D F# A C.'], answer: 'Only the 7th: C# (maj7, dreamy) or C (♭7, bluesy, wants to move).' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Now that you know the major-scale intervals, the new skill is hearing the **one-fret difference**: major 3rd or minor 3rd, major 7th or minor 7th, perfect 4th or tritone. Tie each to a melody you know and to its chord: the ♭3 is the sad note of minor chords, the ♭7 the bluesy note of 7th chords, the tritone the itch inside them.' },
        { list: ['Minor 2nd: the shark theme from "Jaws"', 'Minor 3rd: the opening of "Greensleeves"', 'Tritone: the first leap of "Maria" (West Side Story)', 'Minor 6th: the leap in "The Entertainer"', 'Minor 7th: the first leap of the original "Star Trek" theme'] },
      ],
      drills: [
        { label: 'Major, minor or perfect? (ear)', quiz: 'l2-chrom-ear', minutes: 4, goal: '8 out of 10' },
        { label: 'Chord colours by ear (maj7, 7, m7…)', quiz: 'ch-ear-7', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Thinking ♭3 means "a note with a flat".', right: '♭3 means one fret below the major 3rd: the ♭3 of A is C.' },
        { wrong: 'Spelling the ♭3 of D as E#… or C\'s ♭7 as A#.', right: 'Keep the letter: D → F, C → B♭.' },
        { wrong: 'Reading "C7" as C major 7th.', right: 'Plain 7 = ♭7 (dominant). The major-scale 7th is written maj7.' },
        { wrong: 'Calling a lowered 5th a "minor 5th".', right: 'Perfect intervals go diminished (♭5) or augmented (#4, #5), never minor or major.' },
        { wrong: 'Treating 9, 11 and 13 as new notes.', right: 'They\'re 2, 4 and 6 an octave higher.' },
      ],
    },
    {
      kind: 'practice', title: 'Your practice week', intro: 'Every 7th chord you play this week, say its recipe.',
      days: [
        { day: 'Day 1', focus: 'Name them', tasks: [{ label: 'Flat and sharp intervals quiz', quiz: 'nb-chrom', minutes: 5 }] },
        { day: 'Day 2', focus: 'Dominant 7th', tasks: [{ label: 'C7 arpeggio: 1, 3, 5, ♭7', ex: { label: 'C7 arpeggio', spec: { kind: 'arpeggio', root: 'C', type: 'dom7', position: 0 } }, minutes: 5 }] },
        { day: 'Day 3', focus: 'Hear the difference', tasks: [{ label: 'Major, minor or perfect? (ear)', quiz: 'l2-chrom-ear', minutes: 4 }] },
        { day: 'Day 4', focus: 'Minor 7th', tasks: [{ label: 'Am7 arpeggio: 1, ♭3, 5, ♭7', ex: { label: 'Am7 arpeggio', spec: { kind: 'arpeggio', root: 'A', type: 'm7', position: 0 } }, minutes: 5 }] },
        { day: 'Day 5', focus: 'Major 7th', tasks: [{ label: 'Cmaj7 arpeggio: hear the 7 against C7\'s ♭7', ex: { label: 'Cmaj7 arpeggio', spec: { kind: 'arpeggio', root: 'C', type: 'maj7', position: 0 } }, minutes: 5 }] },
        { day: 'Day 6', focus: 'Chord colours', tasks: [{ label: 'Chord colours by ear', quiz: 'ch-ear-7', minutes: 5 }] },
        { day: 'Day 7', focus: 'Play it', tasks: [{ label: 'A blues with 7th chords in Jam: aim for the ♭7 of each chord', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['Blues and rock: every chord can be a dominant 7th (A7, D7, E7). The ♭7 is what gives the swagger.', 'Soul, jazz and bossa: maj7 and m7 chords give the smooth, dreamy sound.', 'In a solo, bending the ♭3 of a major chord up towards the 3rd is the classic blues "cry".'] },
      ],
      tasks: [{ label: 'Play A7, D7 and E7 over a blues band in Jam', tool: 'jam' }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Flat and sharp intervals quiz', quiz: 'nb-chrom' },
        { skill: 'Hear', label: 'Major, minor or perfect? (ear)', quiz: 'l2-chrom-ear' },
        { skill: 'Play', label: 'C7 arpeggio (mic)', ex: { label: 'C7 arpeggio', spec: { kind: 'arpeggio', root: 'C', type: 'dom7', position: 0 } } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Flat and sharp intervals (and chord names)". Quiz me as my teacher: ask me (1) what happens when I lower a major interval and a perfect one, (2) why the ♭3 of A is C, (3) the recipes for C7, Cmaj7 and Cm7, (4) what the tritone is and where 9, 11 and 13 come from. One question at a time; tell me what I got right and missed; keep it short.',
        points: ['Major lowered = minor; perfect lowered = diminished, raised = augmented', '♭ in a degree = one fret below the major-scale note, keep the letter', 'C7 = 1 3 5 ♭7; maj7 = 1 3 5 7; m7 = 1 ♭3 5 ♭7', 'Tritone = 6 frets; 9/11/13 = 2/4/6 an octave up'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'UPDmUtezcw8', title: 'Intervals On Guitar - Crash Course for Beginners' },
      books: [
        { book: 'No Bull Music Theory for Guitarists', where: 'Chapter 6: Chromatic Intervals', why: 'The flat and sharp intervals with neck exercises.' },
        { book: 'Guitar Fretboard Mastery', where: 'Part 5: Chromatic intervals', why: 'The rest of the interval shapes.' },
        { book: 'Music Theory for Guitarists', where: 'Chapter 7: Chord Construction', why: 'Every chord type built from intervals, in tab and notation.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'Part One: chord construction', why: 'How chord names are put together.' },
      ],
      blocks: [{ p: '**Extra credit**: the ♭3 and ♭7 together with the root make the bones of the minor pentatonic scale (1 ♭3 4 5 ♭7), which you\'ll learn in Level 3.' }],
    },
  ],
}

export const KEYS: CourseLesson = {
  id: 'c2-keys', level: 2, n: 5, title: 'Keys: home, family and parent scale', minutes: 40,
  goal: 'Say what a key is, hear where home is, work out the key of a song from its chords, and move a song to another key or capo position.',
  builds: ['the major scale', 'major and minor triads'], topics: ['keys', 'ear'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: '"What key is it in?" is the first question musicians ask when they play together, and the answer tells you a lot: which chords will probably come up, which scale to solo with, where to put the capo, how to change the song to suit a singer.' },
        { p: 'Underneath that is something you already feel: **home**. Every song has a note and a chord where it comes to rest. Learning keys is learning to find home, by ear and on paper.' },
        { prog: { label: 'G, C, D … G: the last chord feels like coming home', chords: [[43, 50, 55, 59], [48, 55, 60, 64], [50, 57, 62, 66], [43, 50, 55, 59]], gap: 1 } },
      ],
    },
    {
      kind: 'learn', title: 'A key = home + family', blocks: [
        { p: 'A **key** has two parts:' },
        { list: ['A **home note**, the **tonic** (or key note). "The key of G" means G is home.', 'A **family** of notes that belong: the seven notes of the major scale on that tonic, its **parent scale**. In G, the family is G A B C D E F#.'] },
        { p: 'A scale and a key aren\'t the same thing. The scale is the notes in order, up and down. The key is the music\'s **home and family**: a song in G uses those notes in any order, and mostly (not always) stays inside them.' },
        { tip: 'Music can borrow from outside the family (a blues note, a surprise chord) and still be in the key. Home doesn\'t move just because a guest drops by.' },
      ],
    },
    {
      kind: 'learn', title: 'Feeling home', blocks: [
        { p: 'Home has **gravity**. Melodies tend to end on the tonic; the chord built on it (the **I chord**, "one") feels like rest; the others lean, some gently, some hard, back towards it.' },
        { list: ['The **7th note** pulls up to the tonic (you heard this in the major scale lesson).', 'The chord on the **5th note (V)** pulls hardest back to I. It\'s why songs so often go V → I at the end of a line.', 'The chord on the **4th (IV)** feels like a lift away from home, not a pull back.'] },
        { prog: { label: 'Ending on V: unfinished', chords: [[43, 50, 55, 59], [48, 55, 60, 64], [50, 57, 62, 66]], gap: 1 } },
        { prog: { label: 'The same, then home (V → I)', chords: [[43, 50, 55, 59], [48, 55, 60, 64], [50, 57, 62, 66], [43, 50, 55, 59]], gap: 1 } },
        { p: 'A great habit: whenever you hear a song, **hum the note that feels like home**. That note is the tonic, and the key is named after it.' },
      ],
    },
    {
      kind: 'learn', title: 'Finding the key of a song', blocks: [
        { p: 'Four clues, best used together:' },
        { list: ['**The last chord** is usually I (songs come home at the end).', '**The first chord** is often I too.', '**The chords used**: find the major key whose family holds them all. The three **major** chords a 4th and 5th apart (I, IV, V) pin it down: G, C and D only all live in G major.', '**Your ear**: hum home, and check it on the guitar.'] },
        { p: 'Example: a song uses **C, F, G and Am**. C major\'s chords are C Dm Em F G Am B°: all four fit, and C, F and G are its I, IV and V. The key is **C major**.' },
        { tip: 'Next lesson builds the full family of chords in any key, so this check becomes quick.' },
      ],
    },
    {
      kind: 'learn', title: 'Moving keys: transposing and the capo', blocks: [
        { p: '**Transposing** moves a whole song to another key: every note and chord moves by the **same distance**. G C D in G becomes A D E in A (everything up a tone). The song sounds the same, just higher or lower.' },
        { p: 'Guitarists love keys whose chords are open shapes: **E, A, D, G, C**. A **capo** lets you keep those shapes and change the key: capo 2 with G-shape chords sounds in **A**. Each fret of capo raises the key a semitone.' },
        { list: ['Capo 2 + G shapes → sounds in A', 'Capo 3 + G shapes → B♭', 'Capo 4 + C shapes → E', 'Capo 2 + D shapes → E'] },
        { p: 'On the neck, a key lives around its tonic: the I chord\'s root on the **low E or A string** (your Level 1 landmarks), with the major scale shape around it. That is CAGED again: one key, found from its root.' },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Find home, then check the family.', examples: [
        { q: 'A song goes G, Em, C, D and ends on G. What key?', steps: ['Ends on G; starts on G.', 'G major\'s chords: G Am Bm C D Em F#°. All four fit; G C D are I IV V.'], answer: 'G major.' },
        { q: 'A song uses A, D, E and F#m. What key?', steps: ['A, D and E are major chords a 4th and 5th apart.', 'A major\'s chords: A Bm C#m D E F#m G#°: all fit.'], answer: 'A major.' },
        { q: 'D, G and A: D or A major?', steps: ['A major\'s chords have D and A, but its G would be G#° (G# is in A major, not G).', 'D major\'s: D Em F#m G A Bm C#°: D, G and A are I, IV and V.'], answer: 'D major.' },
        { q: 'Transpose G, C, D, Em to E.', steps: ['G to E is down a minor 3rd (3 semitones), or: I IV V vi.', 'In E: I = E, IV = A, V = B, vi = C#m.'], answer: 'E, A, B, C#m.' },
        { q: 'You play G-shape chords with a capo at fret 5. What key does it sound in?', steps: ['Each fret up raises a semitone.', 'G + 5 semitones: G# A A# B C.'], answer: 'C major.' },
        { q: 'A melody in G uses an F natural once. Is it still in G?', steps: ['G\'s family has F#, not F.', 'One outside note doesn\'t move home: the song still rests on G.'], answer: 'Yes: still G, with a borrowed note (a ♭7, very common in rock and folk).' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Hearing home is the most useful ear skill there is: it\'s how you work out songs, join a jam, and know when a solo has "landed". Two exercises: (1) listen to short progressions and decide whether the last chord is home; (2) over a drone, notice how every note relates to it.' },
        { list: ['Put on any song, pause it, and hum home. Check it on the guitar.', 'Notice how often songs go V → I at the ends of lines.'] },
      ],
      drills: [
        { label: 'Home, or not home yet? (ear)', quiz: 'l2-home-ear', minutes: 4, goal: '9 out of 10' },
        { label: 'Degrees over a drone (Ear trainer: 1 3 5 7)', tool: 'ear', minutes: 5 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Assuming the first chord is always the key.', right: 'Use all the clues: the last chord, the chords used, and your ear.' },
        { wrong: 'Thinking a key and a scale are the same thing.', right: 'The key is home plus its family; the scale is the family in order.' },
        { wrong: 'Deciding a song changed key because of one outside note or chord.', right: 'Borrowed notes are normal. Home only moves if the music rests somewhere new.' },
        { wrong: 'Moving some chords and not others when transposing.', right: 'Every chord moves by the same distance (or keep the numbers: I IV V stays I IV V).' },
        { wrong: 'Naming the key by the capo shapes.', right: 'Shapes + capo frets = the key you hear (G shapes, capo 2 = A).' },
      ],
    },
    {
      kind: 'practice', title: 'Your practice week', intro: 'This week, find the key of every song you play or hear.',
      days: [
        { day: 'Day 1', focus: 'Find home', tasks: [{ label: 'Home, or not home yet? (ear)', quiz: 'l2-home-ear', minutes: 4 }] },
        { day: 'Day 2', focus: 'Keys from chords', tasks: [{ label: 'Name the key from the chords', quiz: 'l2-findkey', minutes: 5 }] },
        { day: 'Day 3', focus: 'A song in G', tasks: [{ label: 'Will the Circle Be Unbroken (G, C, D): hear V → I', ex: { label: 'Will the Circle Be Unbroken', songbook: { song: 'circle', part: 'words' } }, minutes: 6 }] },
        { day: 'Day 4', focus: 'The parent scale', tasks: [{ label: 'D major scale (the family of D)', ex: { label: 'D major scale', spec: { kind: 'scale', root: 'D', type: 'major', position: 0 } }, minutes: 5 }] },
        { day: 'Day 5', focus: 'Drone', tasks: [{ label: 'Degrees over a drone', tool: 'ear', minutes: 5 }] },
        { day: 'Day 6', focus: 'Capo and transposing', tasks: [{ label: 'Red River Valley: play it, then with a capo on 2 (it sounds in A)', ex: { label: 'Red River Valley', songbook: { song: 'redriver', part: 'words' } }, minutes: 6 }] },
        { day: 'Day 7', focus: 'Solo in a key', tasks: [{ label: 'Solo with G major over a G band in Jam; end each phrase on G', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['Chord sheet with a key you can\'t sing? Transpose it or move the capo.', 'Jamming: ask the key, play its major scale, and end your phrases on the tonic.', 'Learning by ear: find home first; most of the other chords will be from its family.'] },
      ],
      tasks: [{ label: 'Name the key from the chords', quiz: 'l2-findkey' }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Name the key from the chords', quiz: 'l2-findkey' },
        { skill: 'Hear', label: 'Home, or not home yet? (ear)', quiz: 'l2-home-ear' },
        { skill: 'Play', label: 'Will the Circle Be Unbroken (mic, strum along)', ex: { label: 'Will the Circle Be Unbroken', songbook: { song: 'circle', part: 'words' } } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Keys: home, family and parent scale". Quiz me as my teacher: ask me (1) what a key is and how it differs from a scale, (2) why V → I sounds like coming home, (3) how I find the key of a song from its chords, (4) what key G-shape chords with a capo at fret 2 sound in. One question at a time; tell me what I got right and missed; keep it short.',
        points: ['Key = tonic (home) + its family (the parent major scale)', 'Everything leans to I; V pulls hardest', 'Last chord, first chord, the I-IV-V trio, and your ear', 'Capo 2 + G shapes = A'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: '-Sx_WHHOvKE', title: 'Using and Understanding Scale Degrees for Bass and Guitar' },
      books: [
        { book: 'No Bull Music Theory for Guitarists', where: 'Chapter 7: Major Keys (Part 1)', why: 'Keys and their notes, with exercises.' },
        { book: 'Guitar Fretboard Mastery', where: 'Part 2: What is a Key? and Concept of the Root note', why: 'Keys and roots on the neck.' },
        { book: 'Music Theory for Guitarists', where: 'Chapter 9: Determining Key Centers', why: 'Finding the key of real progressions.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'Part One: transposing chord progressions', why: 'Moving songs between keys.' },
        { book: 'Improvise for Real', where: 'The magic key', why: 'Hearing every note by its place against home.' },
      ],
      blocks: [{ p: '**Extra credit**: some songs are in **minor** keys: home is a minor chord (Am, Em). They use the same families as major keys, just with a different home. That\'s Level 3.' }],
    },
  ],
}

export const KEY_CHORDS: CourseLesson = {
  id: 'c2-keychords', level: 2, n: 6, title: 'Building the chords of any key', minutes: 45,
  goal: 'Build the seven chords of any major key by stacking 3rds, know the major-minor-minor-major-major-minor-diminished pattern, use Roman numerals and Nashville numbers, and play the common progressions in any key.',
  builds: ['the major scale', 'major and minor triads', 'keys'], topics: ['keys', 'chord-building', 'progressions', 'caged'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'This is the lesson that makes chord sheets make sense. Every major key has the same **seven-chord family** in the same pattern. Know the pattern and you know which chords a song will probably use before you hear it, you can work out songs by ear, write your own progressions, and play anything in any key by its numbers.' },
        { prog: { label: 'The seven chords of C major, in order', chords: [[48, 52, 55, 60], [50, 53, 57, 62], [52, 55, 59, 64], [53, 57, 60, 65], [55, 59, 62, 67], [57, 60, 64, 69], [59, 62, 65, 71]], gap: 0.85 } },
      ],
    },
    {
      kind: 'learn', title: 'Stack 3rds on every note', blocks: [
        { p: 'To build a chord on any note of the key, take that note, **skip one**, take the next, **skip one**, take the next, using only notes of the key. In C major (C D E F G A B):' },
        { list: ['On C: **C E G** → C major', 'On D: **D F A** → D minor', 'On E: **E G B** → E minor', 'On F: **F A C** → F major', 'On G: **G B D** → G major', 'On A: **A C E** → A minor', 'On B: **B D F** → B diminished'] },
        { p: 'Why are some major and some minor? Because the semitones of the scale (E–F and B–C) land in different places in each stack. D to F is 3 frets (♭3: minor); C to E is 4 (major 3rd). B to F is only 6 frets: a ♭5, so B D F is **diminished** (1 ♭3 ♭5).' },
      ],
    },
    {
      kind: 'learn', title: 'The pattern for every major key', blocks: [
        { p: 'Because every major scale has the same recipe, every major key gets the same chord pattern:' },
        { p: '**I major · ii minor · iii minor · IV major · V major · vi minor · vii° diminished**' },
        { p: 'Roman numerals: **upper case = major**, lower case = minor, ° = diminished. Nashville players write plain numbers: 1, 2m, 3m, 4, 5, 6m, 7°.' },
        { list: ['**C**: C Dm Em F G Am B°', '**G**: G Am Bm C D Em F#°', '**D**: D Em F#m G A Bm C#°', '**A**: A Bm C#m D E F#m G#°', '**E**: E F#m G#m A B C#m D#°', '**F**: F Gm Am B♭ C Dm E°'] },
        { tip: 'Say it as a rhythm: "major, minor, minor, major, major, minor, diminished". Then any key\'s family is just its major scale with that pattern on top.' },
      ],
    },
    {
      kind: 'learn', title: 'Three pairs and an odd one', blocks: [
        { p: 'The family has a shape worth knowing. The three **major chords (I, IV, V)** do most of the work. Each has a **relative minor** that shares two of its three notes:' },
        { list: ['**I** (C E G) and **vi** (A C E): share C and E', '**IV** (F A C) and **ii** (D F A): share F and A', '**V** (G B D) and **iii** (E G B): share G and B'] },
        { p: 'That\'s why swapping a chord for its relative minor works so well (C → Am, F → Dm): it changes the mood without leaving the key. The odd one, **vii°**, is tense and rare as a plain triad in pop music, but it\'s hidden inside the V7 chord: G7 = G **B D F**.' },
      ],
    },
    {
      kind: 'learn', title: 'The progressions everyone uses', blocks: [
        { p: 'Most songs you know are built from a handful of number patterns. Because they\'re numbers, they work in every key:' },
        { list: ['**I – IV – V – I**: folk, country, early rock, blues (G C D G)', '**I – V – vi – IV**: countless pop songs (G D Em C)', '**vi – IV – I – V**: the same four starting on the minor (Em C G D)', '**I – vi – IV – V**: the 1950s doo-wop progression (G Em C D)', '**ii – V – I**: jazz\'s favourite cadence (Am D G)'] },
        { prog: { label: 'I – V – vi – IV in G', chords: [[43, 50, 55, 59], [50, 57, 62, 66], [40, 47, 52, 55], [48, 55, 60, 64]], gap: 1 } },
        { prog: { label: 'ii – V – I in G', chords: [[45, 52, 57, 60], [50, 57, 62, 66], [43, 50, 55, 59]], gap: 1 } },
      ],
    },
    {
      kind: 'learn', title: 'The key on the neck: a box of roots (CAGED)', blocks: [
        { p: 'With E-shape barres (root on the low E) and A-shape barres (root on the A string), a whole key\'s chords sit in one small box. In G (I at fret 3 on the low E):' },
        { spots: { caption: 'The roots of G major\'s chords as barre chords: I, IV, V on frets 3–5; ii, iii, vi next to them.', from: 1, to: 8, marks: midis => (G6(midis) ? [{ s: 0, f: 3, label: 'I', role: 'root' as const }, { s: 1, f: 3, label: 'IV', role: 'chord' as const }, { s: 1, f: 5, label: 'V', role: 'chord' as const }, { s: 0, f: 5, label: 'ii', role: 'scale' as const }, { s: 1, f: 2, label: 'iii', role: 'scale' as const }, { s: 0, f: 7, label: 'iii', role: 'scale' as const }, { s: 1, f: 7, label: 'vi', role: 'scale' as const }] : []) } },
        { list: ['**I**: E-shape at the tonic on the low E', '**IV**: A-shape at the **same fret** on the A string', '**V**: A-shape **two frets higher**', '**vi**: A-shape minor two frets above V, or E-shape minor 3 frets below I', '**ii**: E-shape minor two frets above I'] },
        { p: 'Move the box and the whole key moves: put I at fret 5 (A) and you have A major\'s chords. This is how session players change key without thinking.' },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Major scale first, then the pattern.', examples: [
        { q: 'List the chords of D major.', steps: ['D major: D E F# G A B C#.', 'Pattern: M m m M M m dim.'], answer: 'D Em F#m G A Bm C#°.' },
        { q: 'What is vi in A major?', steps: ['A major: A B C# D E F# G#.', '6th note: F#; vi is minor.'], answer: 'F#m.' },
        { q: 'Play I – V – vi – IV in E.', steps: ['E major: E F# G# A B C# D#.', 'I = E, V = B, vi = C#m, IV = A.'], answer: 'E, B, C#m, A.' },
        { q: 'Am appears in which major keys, and as which chord?', steps: ['Am can be ii, iii or vi.', 'ii in G (G Am…), iii in F (F Gm Am…), vi in C (C Dm Em F G Am).'], answer: 'ii in G, iii in F, vi in C.' },
        { q: 'Spell B° in C major and say why it\'s diminished.', steps: ['B, skip C, D, skip E, F.', 'B to D: 3 frets (♭3). B to F: 6 frets (♭5).'], answer: 'B D F: 1 ♭3 ♭5, diminished.' },
        { q: 'Find C major\'s I, IV and V as barre chords with I on the A string (fret 3).', steps: ['The box can start on the A string too: I = A-shape at fret 3.', 'IV = E-shape F at fret 1 (low E); V = E-shape G at fret 3.'], answer: 'C (A-shape, fret 3), F (E-shape, fret 1), G (E-shape, fret 3).', spots: { to: 5, marks: midis => (G6(midis) ? [{ s: 1, f: 3, label: 'C', role: 'root' as const }, { s: 0, f: 1, label: 'F', role: 'chord' as const }, { s: 0, f: 3, label: 'G', role: 'chord' as const }] : []) } },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Each chord of the key has its own feeling **against home**: IV lifts, V leans back, vi is home\'s sad twin, ii is soft and on its way somewhere. Learn those feelings and you can hear a song\'s chords as numbers: the fastest way to work out songs by ear.' },
        { list: ['First, major or minor? That splits the family in half (I IV V vs ii iii vi).', 'Then: does it lean back to home (V) or lift away (IV)?'] },
      ],
      drills: [
        { label: 'Which chord of the key? (ear)', quiz: 'l2-num-ear', minutes: 5, goal: '8 out of 10' },
        { label: 'Major or minor? (ear)', quiz: 'ch-ear', minutes: 3 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Using notes from outside the key when stacking (D F# A in C major).', right: 'Only the key\'s notes: in C, D F A (Dm).' },
        { wrong: 'Forgetting the pattern is the same in every major key.', right: 'M m m M M m dim, always.' },
        { wrong: 'Writing all numerals in capitals.', right: 'Capital = major, lower case = minor: I ii iii IV V vi vii°.' },
        { wrong: 'Playing vii° as a major chord (B in C major).', right: 'It\'s diminished: B D F.' },
        { wrong: 'Learning progressions as chord names only.', right: 'Learn them as numbers; then every key is free.' },
      ],
    },
    {
      kind: 'practice', title: 'Your practice week', intro: 'Say the numbers out loud as you change chords.',
      days: [
        { day: 'Day 1', focus: 'Build the families', tasks: [{ label: 'Chords in a major key quiz', quiz: 'nb-keys', minutes: 6 }] },
        { day: 'Day 2', focus: 'I IV V', tasks: [{ label: 'Red River Valley (G, C, D7: I, IV, V)', ex: { label: 'Red River Valley', songbook: { song: 'redriver', part: 'words' } }, minutes: 6 }] },
        { day: 'Day 3', focus: 'Hear numbers', tasks: [{ label: 'Which chord of the key? (ear)', quiz: 'l2-num-ear', minutes: 5 }] },
        { day: 'Day 4', focus: 'Progressions in any key', tasks: [{ label: 'Progressions in any key quiz', quiz: 'nb-prog', minutes: 5 }] },
        { day: 'Day 5', focus: 'Changes', tasks: [{ label: 'One-minute changes: G to Em, C to D', tool: 'changes', minutes: 5 }] },
        { day: 'Day 6', focus: 'The box', tasks: [{ label: 'Barre chords: where does it go?', quiz: 'ch-barre', minutes: 5 }] },
        { day: 'Day 7', focus: 'Write one', tasks: [{ label: 'Build I – V – vi – IV (or your own) in Jam and play over it', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['Working out a song: find home, then try I, IV, V and vi first. They cover most songs.', 'Writing: pick a key, pick a number pattern, then swap one chord for its relative minor.', 'Playing with others: "it\'s a 1-5-6-4 in E" is all a band needs to hear.'] },
      ],
      tasks: [{ label: 'Make a progression in Jam', tool: 'jam' }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Chords in a major key quiz', quiz: 'nb-keys' },
        { skill: 'Hear', label: 'Which chord of the key? (ear)', quiz: 'l2-num-ear' },
        { skill: 'Play', label: 'Red River Valley (mic, strum along)', ex: { label: 'Red River Valley', songbook: { song: 'redriver', part: 'words' } } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Building the chords of any key". Quiz me as my teacher: ask me (1) how I build a chord on each note of a key, (2) the pattern of major, minor and diminished chords, (3) the chords of D major and what I – V – vi – IV is in D, (4) what relative minors are and why vii° hides inside V7. One question at a time; tell me what I got right and missed; keep it short.',
        points: ['Stack 3rds with the key\'s notes only', 'I ii iii IV V vi vii°: M m m M M m dim', 'D Em F#m G A Bm C#°; D A Bm G', 'I/vi, IV/ii, V/iii share two notes; G7 = G + B D F'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'i22MvZ8GHqM', title: 'Music Theory for Guitar: Diatonic Triads' },
      books: [
        { book: 'No Bull Music Theory for Guitarists', where: 'Chapter 8: Major Keys (Part 2)', why: 'The chords of each key with shapes and exercises.' },
        { book: 'Music Theory for Guitarists', where: 'Chapter 6: Harmonizing', why: 'Harmonizing the major scale in triads, in tab and notation.' },
        { book: 'Guitar Fretboard Mastery', where: 'Part 4: Chords in a scale - Chords of a key', why: 'Chord families and progressions on the neck.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'Part One: harmonising the major scale, the Roman numeral system', why: 'Harmonising the scale and common progressions.' },
      ],
      blocks: [{ p: '**Extra credit**: stack one more 3rd on each chord and you get the key\'s 7th chords: Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø7. That\'s Level 5.' }],
    },
  ],
}

export const CIRCLE: CourseLesson = {
  id: 'c2-circle', level: 2, n: 7, title: 'Key signatures and the circle of fifths', minutes: 40,
  goal: 'Know how many sharps or flats each major key has and which ones, find a key from its signature, and use the circle of fifths to see related keys, the IV and V of any key, and why guitarists live in sharp keys.',
  builds: ['the major scale', 'keys', 'building the chords of any key'], topics: ['circle-of-fifths', 'keys'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'The circle of fifths is a one-picture map of all twelve keys. It answers in a glance: how many sharps or flats a key has, which keys are close relatives (easy to move between), and what the I, IV and V chords of any key are. Players use it to transpose, to write, and to make sense of songs that wander between keys.' },
        { p: 'It isn\'t a new rule to memorise. It falls straight out of the major scale\'s two matching halves, which you met in Lesson 1.' },
      ],
    },
    {
      kind: 'learn', title: 'Key signatures', blocks: [
        { p: 'Every major key has a fixed set of sharps **or** flats (lesson 1: never both). Written music lists them once at the start of each line: the **key signature**. Here they are, counting up:' },
        { list: ['**C**: none', '**Sharp keys**: G 1 (F#) · D 2 (F# C#) · A 3 (+G#) · E 4 (+D#) · B 5 (+A#) · F# 6 (+E#) · C# 7 (+B#)', '**Flat keys**: F 1 (B♭) · B♭ 2 (B♭ E♭) · E♭ 3 (+A♭) · A♭ 4 (+D♭) · D♭ 5 (+G♭) · G♭ 6 (+C♭) · C♭ 7 (+F♭)'] },
        { p: 'The sharps always arrive in the same order: **F C G D A E B** ("Father Charles Goes Down And Ends Battle"). The flats come in the reverse order: **B E A D G C F** ("Battle Ends And Down Goes Charles\' Father").' },
        { list: ['**Sharp key from its signature**: the key is one semitone above the last sharp. F# C# G# → G# + 1 fret = **A major**.', '**Flat key from its signature**: the key is the second-to-last flat. B♭ E♭ A♭ → **E♭ major**. (One flat = F major: learn that one.)'] },
      ],
    },
    {
      kind: 'learn', title: 'The circle', blocks: [
        { p: 'Start at C and keep going **up a 5th**: C → G → D → A → E → B → F# … Each step adds **one sharp**. Go the other way, **up a 4th** (= down a 5th): C → F → B♭ → E♭ → A♭ → D♭ … each step adds **one flat**. Arrange them like a clock and they meet at the bottom (F# = G♭, the same sound spelled two ways):' },
        { p: '**C · G · D · A · E · B · F#/G♭ · D♭ · A♭ · E♭ · B♭ · F** · (back to C)' },
        { p: 'Why one sharp per step? Remember the major scale\'s matching halves: G major\'s bottom half (G A B C) is C major\'s top half. Moving up a 5th keeps six notes and changes just one: the new key\'s 7th note is raised (F → F# in G). That one change is the new sharp.' },
        { play: { label: 'C major, then G major: only F → F# changes', seq: [48, 50, 52, 53, 55, 57, 59, 60, 55, 57, 59, 60, 62, 64, 66, 67], gap: 0.25 } },
      ],
    },
    {
      kind: 'learn', title: 'Neighbours: IV, V and close keys', blocks: [
        { p: 'Look either side of any key on the circle and you find its **IV** (counter-clockwise) and **V** (clockwise). Around G: **C** and **D**. So the circle shows the three major chords of every key at once: G\'s I IV V = G C D, sitting together.' },
        { p: 'Neighbouring keys share six of their seven notes, so songs move between them smoothly (a key change up a 5th or a 4th sounds natural; one across the circle, say C to F#, sounds like a jump).' },
        { p: 'Going **counter-clockwise** (up in 4ths) is how chords love to move: V → I, and chains like E → A → D → G → C. That\'s the "circle of fourths" in countless songs.' },
        { prog: { label: 'Round the circle in 4ths: E7 → A7 → D7 → G', chords: [[40, 47, 50, 56, 59, 64], [45, 52, 55, 61, 64], [50, 57, 60, 66], [43, 47, 50, 55, 59, 67]], gap: 1 } },
      ],
    },
    {
      kind: 'learn', title: 'The circle on your guitar', blocks: [
        { p: 'Your strings are tuned mostly in 4ths (E A D G… B E), so **crossing to the next string at the same fret goes up a 4th: one step counter-clockwise**. And the power-chord shape (one string up, two frets up) is a 5th: one step clockwise. You can walk the circle up the neck:' },
        { spots: { caption: 'Clockwise in 5ths with the power-chord shape: G → D → A → E.', from: 2, to: 10, marks: midis => (G6(midis) ? [{ s: 0, f: 3, label: 'G', role: 'root' as const }, { s: 1, f: 5, label: 'D', role: 'chord' as const }, { s: 2, f: 7, label: 'A', role: 'chord' as const }, { s: 3, f: 9, label: 'E', role: 'chord' as const }] : []) } },
        { p: 'This is also why guitarists live in **sharp keys** (E, A, D, G): the open strings are E A D G B E, and those keys use them as roots. Horn players, whose instruments sit in B♭ and E♭, live in flat keys. Neither is better: it\'s just what\'s under the fingers.' },
        { tip: 'The app\'s Circle of fifths tool (Learn → Explore) lets you tap any key and see its signature, chords and neighbours.' },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Use the order of sharps and flats, then check on the circle.', examples: [
        { q: 'Which sharps does E major have?', steps: ['E is four steps clockwise from C: 4 sharps.', 'The first four in order: F C G D.'], answer: 'F#, C#, G#, D#.' },
        { q: 'A key signature has 2 flats. Which key?', steps: ['Flats in order: B♭ E♭.', 'Second-to-last flat: B♭.'], answer: 'B♭ major.' },
        { q: 'A key signature has F#, C#, G#, D#, A#. Which key?', steps: ['Last sharp: A#.', 'One semitone above: B.'], answer: 'B major.' },
        { q: 'What are the IV and V of A?', steps: ['On the circle, A sits between D (counter-clockwise) and E (clockwise).'], answer: 'IV = D, V = E.' },
        { q: 'Why does F major have B♭?', steps: ['F is one step counter-clockwise from C.', 'Each step that way adds a flat; the first flat is always B♭.', 'Check: F G A B♭ C D E keeps each letter once.'], answer: 'F is C\'s neighbour in 4ths; moving there lowers B to B♭.' },
        { q: 'A song moves from D major to A major. Big jump or close?', steps: ['A is D\'s clockwise neighbour (its V).', 'They share six notes: only G → G# changes.'], answer: 'Close: one step on the circle.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'The neighbours on the circle are IV and V, and telling them apart by ear is a core skill: **IV** lifts away from home, **V** leans back towards it. The more automatic that gets, the faster you\'ll hear songs as numbers.' },
        { list: ['Play G, then C (IV), then G, then D (V). Notice how D wants to go home and C doesn\'t.', 'Over a drone, play 4 then 5: 4 is restless, 5 is strong.'] },
      ],
      drills: [
        { label: 'Which chord of the key? (ear: listen for IV vs V)', quiz: 'l2-num-ear', minutes: 4 },
        { label: 'Degrees over a drone (add 4 and 5)', tool: 'ear', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Writing sharps in random order (C# G# F#).', right: 'Always F C G D A E B; flats B E A D G C F.' },
        { wrong: 'Thinking the last sharp is the key.', right: 'One semitone above the last sharp (F# C# → D).' },
        { wrong: 'Mixing up which way adds sharps.', right: 'Clockwise = up a 5th = one more sharp; counter-clockwise = up a 4th = one more flat.' },
        { wrong: 'Treating F# and G♭ as different keys that sound different.', right: 'Same sound, two spellings: they meet at the bottom of the circle.' },
        { wrong: 'Memorising the circle as a picture only.', right: 'Rebuild it from C by 5ths, and hear the neighbours as IV and V.' },
      ],
    },
    {
      kind: 'practice', title: 'Your practice week', intro: 'Rebuild the circle from memory once a day: say it, then write it.',
      days: [
        { day: 'Day 1', focus: 'Signatures', tasks: [{ label: 'Key signatures quiz', quiz: 'cof-sig', minutes: 5 }] },
        { day: 'Day 2', focus: 'Explore the circle', tasks: [{ label: 'Circle of fifths tool: tap each key, read its chords', tool: 'circle', minutes: 6 }] },
        { day: 'Day 3', focus: 'Neighbours', tasks: [{ label: 'IV and V: the neighbours', quiz: 'cof-neighbours', minutes: 5 }] },
        { day: 'Day 4', focus: 'Hear IV and V', tasks: [{ label: 'Which chord of the key? (ear)', quiz: 'l2-num-ear', minutes: 4 }] },
        { day: 'Day 5', focus: 'One sharp more', tasks: [{ label: 'G major scale, then D major: find the one new note (C#)', ex: { label: 'D major scale', spec: { kind: 'scale', root: 'D', type: 'major', position: 0 } }, minutes: 5 }] },
        { day: 'Day 6', focus: 'Chords in a key', tasks: [{ label: 'Chords in a key (circle quiz)', quiz: 'cof-chords', minutes: 5 }] },
        { day: 'Day 7', focus: 'Neighbours in a song', tasks: [{ label: 'Oh! Susanna: C, F and G, neighbours on the circle', ex: { label: 'Oh! Susanna', songbook: { song: 'susanna', part: 'words' } }, minutes: 6 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['Transposing for a singer: move round the circle and every chord follows.', 'Writing: a chain of chords moving in 4ths (vi ii V I, or E7 A7 D7 G) always sounds like it\'s going somewhere.', 'Reading: the key signature tells you the key (and the sharps or flats) before you play a note.'] },
      ],
      tasks: [{ label: 'Circle of fifths tool', tool: 'circle' }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Key signatures quiz', quiz: 'cof-sig' },
        { skill: 'Hear', label: 'Which chord of the key? (ear)', quiz: 'l2-num-ear' },
        { skill: 'Play', label: 'D major scale: G major plus one sharp (mic)', ex: { label: 'D major scale', spec: { kind: 'scale', root: 'D', type: 'major', position: 0 } } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Key signatures and the circle of fifths". Quiz me as my teacher: ask me (1) the order of sharps and flats, (2) how I find a key from its signature, (3) why each step clockwise adds one sharp, (4) how the circle shows a key\'s IV and V, and how it shows up on the guitar neck. One question at a time; tell me what I got right and missed; keep it short.',
        points: ['F C G D A E B; flats reversed', 'Sharps: a semitone above the last; flats: the second-to-last (F = one flat)', 'Up a 5th keeps six notes and raises the 7th', 'Neighbours = IV and V; strings in 4ths, power-chord shape = a 5th'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'YFe7Jchras0', title: 'The Circle of Fifths Explained for Guitar' },
      books: [
        { book: 'The Circle of Fifths for Guitarists', where: 'Chapter Three: Building the Circle of Fifths', why: 'The circle built step by step, with exercises on the neck.' },
        { book: 'The Circle of Fifths for Guitarists', where: 'Chapter Four: The Circle of Fourths', why: 'Chord movement in 4ths, the way songs use it.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'Part One: the circle of fifths, key signatures', why: 'Key signatures and how the circle is used.' },
        { book: 'No Bull Music Theory for Guitarists', where: 'Chapter 8: Major Keys (Part 2)', why: 'Keys and their signatures.' },
      ],
      blocks: [{ p: '**Extra credit**: each major key on the circle has a **relative minor** with the same signature (C and Am, G and Em). Many circles show them as an inner ring. That\'s Level 3.' }],
    },
  ],
}

export const RHYTHM2: CourseLesson = {
  id: 'c2-rhythm', level: 2, n: 8, title: 'Rhythm 2: strumming eighths, rests and ties', minutes: 35,
  goal: 'Read and play any eighth-note strumming pattern: keep the hand moving, miss strums on purpose, tie across beats, use dotted notes and pushes, and strum in 3/4.',
  builds: ['Rhythm 1: the beat, quarters and eighths'], topics: ['rhythm', 'strumming'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Nearly every strumming pattern you\'ll ever play is built from one idea: an eighth-note grid with some strums left out. Once you see that, you can read any pattern from a chord sheet, copy one from a record, and make up your own, instead of learning each as a separate trick.' },
        { p: 'The parts that make strumming groove (the gaps, the ties, the early chord changes) are exactly the parts this lesson is about.' },
        { rhythm: { label: '"Old faithful": D, DU, (miss) U, DU', beats: [1, 0.5, 1, 0.5, 0.5, 0.5], bpm: 80 } },
      ],
    },
    {
      kind: 'learn', title: 'The grid and the pendulum', blocks: [
        { p: 'A bar of 4/4 has **eight eighth-note slots**: **1 & 2 & 3 & 4 &**. Your strumming hand is a pendulum: **down on every number, up on every "&"**, all the time, whether it hits the strings or not.' },
        { p: 'A strumming pattern is just **which slots you hit**. Written with D and U: "D DU UDU" means: hit 1 (D), hit 2 and & (D U), miss 3, hit & of 3 (U), hit 4 and & (D U).' },
        { list: ['1 · & · 2 · & · 3 · & · 4 · &', 'D · – · D · U · – · U · D · U'] },
        { tip: 'Never change the hand\'s motion to make a pattern. The only thing that changes is whether the pick touches the strings. That\'s what keeps your time steady.' },
      ],
    },
    {
      kind: 'learn', title: 'Ties: hold it across the beat', blocks: [
        { p: 'A **tie** is a curved line joining two notes of the same pitch: play the first, and **hold it through the second** without playing it again. In strumming, a tie is a **missed strum**: the chord rings on through that slot.' },
        { p: '"Old faithful" written in notes is: a quarter on 1, an eighth on 2, an eighth on the & of 2 **tied** to an eighth on 3, then eighths on the & of 3, 4 and &. Count it: **"1, 2 &, (3) &, 4 &"**.' },
        { rhythm: { label: 'Count: 1 · 2 & · (3) & · 4 &', beats: [1, 0.5, 1, 0.5, 0.5, 0.5], bpm: 72 } },
        { p: 'The missed down on 3 is what makes the pattern bounce: the up-strum before it lands on a weak part of the beat and is held over a strong one. That\'s **syncopation**, the word for accents off the main beats.' },
      ],
    },
    {
      kind: 'learn', title: 'Dotted notes', blocks: [
        { p: 'A **dot** after a note adds **half its length**. A dotted quarter = 1½ beats (the same as a quarter tied to an eighth). A dotted half = 3 beats.' },
        { p: 'Dotted quarter + eighth is one of the commonest rhythms in music: "**1** (2) **&**, **3** (4) **&**". Strum: down on 1, miss 2, up on its &.' },
        { rhythm: { label: 'Dotted quarter, eighth, dotted quarter, eighth', beats: [1.5, 0.5, 1.5, 0.5], bpm: 80 } },
      ],
    },
    {
      kind: 'learn', title: 'Pushes and rests', blocks: [
        { p: 'A **push** (or anticipation) brings a chord change **an eighth early**: the new chord arrives on the **& of 4** of the bar before, and is tied over the bar line. It\'s everywhere in pop, rock and country, and it\'s why a chord change can feel like it\'s leaning forward.' },
        { rhythm: { label: 'A push: the last chord on the & of 3, held through 4', beats: [1, 1, 0.5, 1.5], bpm: 80 } },
        { p: 'A **rest** is a silence, not a held chord. Two ways to make one while strumming: lift the fretting fingers just off the strings (the chord stops), or rest the strumming palm on the strings. A **chuck** on 2 and 4 (a muted, percussive strum) turns rests into a backbeat.' },
        { rhythm: { label: 'Strum, rest, strum, rest (stop the sound on the rests)', beats: [1, -1, 1, -1], bpm: 80 } },
      ],
    },
    {
      kind: 'learn', title: 'Strumming in 3/4', blocks: [
        { p: 'Waltzes and many folk ballads are in **3/4**: three beats a bar, **1 & 2 & 3 &**. The pendulum is the same; the bar is just shorter. The classic waltz strum: **D, DU, DU** (or bass note on 1, then strum on 2 and 3).' },
        { rhythm: { label: '3/4: D · D U · D U', beats: [1, 0.5, 0.5, 0.5, 0.5], bpm: 90 } },
        { p: 'Count "**ONE** two three" and feel beat 1 as the strong one. Scarborough Fair is in 3/4.' },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Count out loud, then clap, then strum.', examples: [
        { q: 'Write "D DU UDU" as counts.', steps: ['The slots: 1 & 2 & 3 & 4 &.', 'D on 1 · D U on 2 & · miss 3, U on & · D U on 4 &.'], answer: '1, 2 &, (3) &, 4 &.' },
        { q: 'How many of the 8 slots does old faithful hit?', steps: ['Hits: 1, 2, &, &, 4, &.', 'Misses: the & of 1 and 3.'], answer: 'Six: it misses the & of 1 and beat 3.' },
        { q: 'At 60 BPM, how long is a dotted quarter?', steps: ['One beat = 1 second.', 'Quarter (1) + half of it (½) = 1½ beats.'], answer: '1.5 seconds.' },
        { q: 'You want the change from G to C to "push". Where does the C arrive?', steps: ['A push comes an eighth early.', 'The bar line is beat 1; an eighth before it is the & of 4.'], answer: 'On the & of 4 of the G bar, held over into the C bar.' },
        { q: 'Make old faithful in 3/4.', steps: ['3/4 slots: 1 & 2 & 3 &.', 'Keep the idea: hit 1, then a tie across a beat, then end with DU.', 'D on 1, U on & of 1, miss 2, U on & of 2, D U on 3.'], answer: 'D U (2) U D U: "1 & (2) & 3 &".' },
        { q: 'What\'s the difference between a tie and a rest in strumming?', steps: ['Tie: miss the strum but let the chord ring.', 'Rest: stop the sound (lift the fretting hand or palm-mute).'], answer: 'A tie keeps ringing; a rest is silence.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Rhythm ear training means hearing **where** strums fall in the grid. Count along with the click and notice which slots are hit and which are held. Then copy patterns from songs you like: listen for the misses and the pushes.' },
        { list: ['Clap old faithful while counting out loud; then clap it with a song on.', 'Listen for chord changes that land early (pushes) in pop and country songs.'] },
      ],
      drills: [
        { label: 'Which rhythm? (ear)', quiz: 'l2-rhythm-ear', minutes: 4, goal: '7 out of 8' },
        { label: 'Rhythm trainer: hear it, tap it back', tool: 'rhythm', minutes: 5 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Stopping the hand on missed strums.', right: 'Keep the pendulum going; just don\'t touch the strings.' },
        { wrong: 'Strumming the tied beat anyway (old faithful with a down on 3).', right: 'A tie means hold: count "(3)" and let it ring.' },
        { wrong: 'Rushing the up-strum after a gap.', right: 'The & is exactly halfway: count it out loud.' },
        { wrong: 'Making every strum equally loud.', right: 'Downs on the beats are a little stronger; ups are lighter.' },
        { wrong: 'Changing chords late because the hand stops to move.', right: 'The last up-strum of the bar can be open strings while the fretting hand moves: the beat never waits.' },
      ],
    },
    {
      kind: 'practice', title: 'Your practice week', intro: 'Use a click (Tools → Tempo) at 60–70 BPM; count out loud.',
      days: [
        { day: 'Day 1', focus: 'The pendulum', tasks: [{ label: 'Rhythm trainer', tool: 'rhythm', minutes: 6 }] },
        { day: 'Day 2', focus: 'Old faithful', tasks: [{ label: 'Red River Valley with D DU UDU (In time: each strum is judged)', ex: { label: 'Red River Valley', songbook: { song: 'redriver', part: 'words' } }, minutes: 6 }] },
        { day: 'Day 3', focus: 'Hear it', tasks: [{ label: 'Which rhythm? (ear)', quiz: 'l2-rhythm-ear', minutes: 4 }] },
        { day: 'Day 4', focus: 'Changes on time', tasks: [{ label: 'One-minute changes with old faithful: G to C', tool: 'changes', minutes: 5 }] },
        { day: 'Day 5', focus: '3/4', tasks: [{ label: 'Scarborough Fair in 3/4 (D DU DU)', ex: { label: 'Scarborough Fair', songbook: { song: 'scarborough', part: 'words' } }, minutes: 6 }] },
        { day: 'Day 6', focus: 'Pushes', tasks: [{ label: 'Will the Circle Be Unbroken: push each chord change onto the & of 4', ex: { label: 'Will the Circle Be Unbroken', songbook: { song: 'circle', part: 'words' } }, minutes: 6 }] },
        { day: 'Day 7', focus: 'Groove with a band', tasks: [{ label: 'Strum your own pattern over a Jam band', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['Any chord sheet: try old faithful first; it fits most 4/4 songs.', 'Make a pattern your own: start from the grid and leave out different slots.', 'Pushes on the last change of a section make a chorus hit harder.'] },
      ],
      tasks: [{ label: 'Rhythm trainer', tool: 'rhythm' }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Rhythm trainer: tap the patterns back', tool: 'rhythm' },
        { skill: 'Hear', label: 'Which rhythm? (ear)', quiz: 'l2-rhythm-ear' },
        { skill: 'Play', label: 'Red River Valley with old faithful, In time (mic)', ex: { label: 'Red River Valley', songbook: { song: 'redriver', part: 'words' } } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Rhythm 2: strumming eighths, rests and ties". Quiz me as my teacher: ask me (1) how the strumming hand moves and what a pattern really is, (2) what a tie does and how old faithful uses one, (3) what a dot adds, (4) what a push is and how a rest differs from a tie. One question at a time; tell me what I got right and missed; keep it short.',
        points: ['Down on numbers, up on &s, always; a pattern = which slots you hit', 'Tie = hold through the next slot; old faithful misses 3', 'A dot adds half: dotted quarter = 1½ beats', 'Push = change an eighth early; rest = silence, tie = ringing'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'DiBT-lwcA9Y', title: 'The DUDU UDU and D DU UDU Strumming Patterns' },
      books: [
        { book: 'Music Theory for Guitarists', where: 'Chapter 2: Theory Basics', why: 'Note values, ties and dots in notation.' },
        { book: 'Flatpicking Essentials Volume 1', where: 'The rhythm and strumming sections', why: 'Strumming and boom-chick patterns for bluegrass and folk.' },
      ],
      blocks: [{ p: '**Extra credit**: try the same patterns with a **shuffle** feel (long-short eighths). That\'s Rhythm 3, in Level 3.' }],
    },
  ],
}

export const LEVEL2_CHECK: CourseLesson = {
  id: 'c2-check', level: 2, n: 9, title: 'Level 2 mastery check', minutes: 25,
  goal: 'Show that scales, chords and keys are yours: build, hear and play them in any key.',
  builds: ['all of Level 2'], topics: ['major-scale', 'triads', 'intervals', 'keys', 'circle-of-fifths', 'rhythm', 'ear'],
  steps: [
    {
      kind: 'why', title: 'Before Level 3', blocks: [
        { p: 'This check covers all of Level 2. It\'s **strongly suggested** before Level 3 (progressions, pentatonics and minor keys all stand on the major scale, its chords and its keys), but never required: you can move on and come back.' },
        { list: ['Take it when the practice weeks feel easy.', 'Anything you miss points back to the right lesson.', 'Pass it and the Level 2 badge is yours; it also comes back as a review later.'] },
      ],
    },
    {
      kind: 'check', title: 'The check', intro: 'Eight parts: building, hearing and playing, then explain the level back to the teacher.',
      tasks: [
        { skill: 'Apply', label: 'The major scale', quiz: 'nb-major' },
        { skill: 'Apply', label: 'Flat and sharp intervals', quiz: 'nb-chrom' },
        { skill: 'Apply', label: 'Chords in a major key', quiz: 'nb-keys' },
        { skill: 'Apply', label: 'Key signatures', quiz: 'cof-sig' },
        { skill: 'Hear', label: 'Intervals of the major scale', quiz: 'l2-int-ear' },
        { skill: 'Hear', label: 'Which chord of the key?', quiz: 'l2-num-ear' },
        { skill: 'Play', label: 'Barre chords: where does it go? (mic)', quiz: 'ch-barre', how: 'play' },
        { skill: 'Play', label: 'A major scale in the moveable shape (mic)', ex: { label: 'A major scale', spec: { kind: 'scale', root: 'A', type: 'major', position: 0 } } },
      ],
      explain: {
        prompt: 'I just took the KGuitar Level 2 mastery check (Scales, chords and keys: the major scale, major and minor triads, intervals, flat and sharp intervals and chord names, keys, the chords of a key, key signatures and the circle of fifths, Rhythm 2). Be my teacher for a short oral exam: ask me five questions across these topics, one at a time, including "spell the chords of A major" and "what does Cm7 contain?", tell me what I got right and missed, and finish with which lesson to review if anything was shaky.',
        points: ['T T S T T T S; each letter once', '1-3-5 and 1-♭3-5; barre roots', 'Twelve intervals; chord names as recipes', 'Keys: home + family; I ii iii IV V vi vii°', 'Signatures and the circle; IV and V as neighbours', 'Ties, dots and pushes in strumming'],
      },
    },
  ],
}

export const LEVEL2: CourseLesson[] = [MAJOR_SCALE, TRIADS, INTERVALS, CHROMATIC, KEYS, KEY_CHORDS, CIRCLE, RHYTHM2, LEVEL2_CHECK]
