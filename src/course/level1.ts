// Theory course, Level 1: Notes on the neck. (Sample lesson first: octave shapes. The owner reviews it before the rest
// of the course is written to the same standard.) Words, examples and drills are our own; the books are only pointed to.
import type { CourseLesson } from './types'
import { SHARPS } from '../theory/notes'

type Spot = { s: number; f: number; label: string; role: 'root' | 'chord' | 'scale' | 'target' | 'next' }
const nm = (m: number) => SHARPS[((m % 12) + 12) % 12]
/** a note at (s, f) and where its octave above lands on string t (if it fits on frets 0–15) */
function pair(midis: number[], s: number, f: number, t: number): Spot[] {
  if (s >= midis.length || t >= midis.length) return []
  const m = midis[s] + f
  const g = m + 12 - midis[t]
  if (f < 0 || g < 0 || g > 15) return []
  return [{ s, f, label: nm(m), role: 'root' }, { s: t, f: g, label: nm(m), role: 'target' }]
}
/** every place a pitch class lives between two frets */
function every(midis: number[], pc: number, from = 0, to = 12, role: Spot['role'] = 'chord'): Spot[] {
  const out: Spot[] = []
  midis.forEach((o, s) => { for (let f = from; f <= to; f++) if ((o + f) % 12 === pc) out.push({ s, f, label: SHARPS[pc], role }) })
  return out
}

export const OCTAVE_SHAPES: CourseLesson = {
  id: 'c1-octaves', level: 1, n: 4, title: 'Octave shapes: every note on every string', minutes: 35,
  goal: 'Find any note on any string in a couple of seconds, by moving from a note you know with an octave shape.',
  builds: ['the musical alphabet', 'sharps and flats', 'the notes on the low E and A strings'],
  topics: ['fretboard-notes', 'intervals'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Most guitarists know the notes on the two lowest strings and then get lost. Octave shapes fix that for good: from a note you **already know**, a small, fixed shape takes you straight to the **same note** on the higher strings. Learn the low E and A strings, add four shapes, and you can find every note on the neck.' },
        { p: 'They also show up everywhere in real playing: the roots of barre chords, the skeleton of the CAGED system (Level 4), octave melodies (the thick, singing lead sound of jazz players like Wes Montgomery, reggae lead lines and rock riffs), and checking your tuning.' },
        { play: { label: 'Hear it: a melody, then the same melody in octaves', seq: [45, 48, 50, 52, 50, 48, 45], gap: 0.32 } },
        { prog: { label: 'The same melody in octaves (fuller, it "sings")', chords: [[45, 57], [48, 60], [50, 62], [52, 64], [50, 62], [48, 60], [45, 57]], gap: 0.32 } },
      ],
    },
    {
      kind: 'learn', title: 'What an octave is', blocks: [
        { p: 'Play the open A string, then the same string at the **12th fret**. Two different heights, but your ear says "that\'s the same note, higher". That jump is an **octave**: 12 semitones (12 frets) up.' },
        { play: { label: 'Open A, then A at the 12th fret', seq: [45, 57], gap: 0.7 } },
        { p: 'Why does it sound like the same note? The 12th fret sits at the **exact middle** of the string. Half the string vibrates **twice as fast**: the open A vibrates 110 times a second, the 12th-fret A 220 times. When one note vibrates exactly twice as fast as another, their waves line up perfectly and the ear hears them as one note at two heights. That\'s why both get the **same letter name**, and why the musical alphabet starts again after G.' },
        { p: 'You can hear the octave hiding inside every note. Rest a fingertip **very lightly** on the A string right over the 12th fret wire (don\'t press it down) and pick: the bell-like **harmonic** is the octave. A plucked string always rings its octave quietly above the main note (the first **overtone**), so when you add a real octave it blends in instead of clashing: it was already there.' },
        { p: 'When it matters **which** A, musicians number the octaves: the open A string is **A2**, the 12th fret is **A3**, and the 5th fret of the high e is **A4**. The numbers go up by one every time you pass C. The tuner shows notes this way (the low E string is E2).' },
        { p: 'Every note on the neck has copies an octave (or two) higher and lower. Here is every A on your neck from the open strings to fret 15:' },
        { spots: { caption: 'Every A from fret 0 to 15. Tap any of them to hear it.', to: 15, marks: midis => every(midis, 9, 0, 15) } },
        { tip: 'Same letter = same note, different height. "A" means any of these; when it matters which one, players say "the A on the 5th fret of the low E".' },
      ],
    },
    {
      kind: 'learn', title: 'Shape 1: two strings up, two frets up', blocks: [
        { p: 'Start on a note on the **low E** or **A** string. Skip one string and land on the next, **two frets higher**: that\'s the same note an octave up. From the low E string you land on the D string; from the A string, on the G string.' },
        { spots: { caption: 'G on the low E (fret 3) → G on the D string (fret 5). C on the A string (fret 3) → C on the G string (fret 5).', to: 7, marks: midis => [...pair(midis, 0, 3, 2), ...pair(midis, 1, 3, 3)] } },
        { prog: { label: 'Hear both shapes', chords: [[43], [55], [43, 55], [48], [60], [48, 60]], gap: 0.55 } },
        { p: 'Why two frets? Two strings up is **10 frets higher** in pitch (E to D is 10 semitones), and an octave is 12. The missing 2 come from moving two frets up the neck. That little sum (12 minus the gap between the strings) explains every octave shape there is.' },
        { p: 'The shape works **in reverse** too: from the D or G string, two strings down and two frets **back** lands on the octave below.' },
        { tip: 'Grip it with your 1st finger on the low note and your 3rd or 4th finger on the high one. Let the 1st finger lean lightly on the string in between to mute it, so only the two octave notes sound when you strum.' },
      ],
    },
    {
      kind: 'learn', title: 'Shape 2: crossing the B string (three frets up)', blocks: [
        { p: 'From the **D** or **G** string, two strings up lands on the **B** or **high e** string. Here the octave is **three frets** higher, not two.' },
        { spots: { caption: 'A on the D string (fret 7) → A on the B string (fret 10). C on the G string (fret 5) → C on the high e (fret 8).', from: 3, to: 11, marks: midis => [...pair(midis, 2, 7, 4), ...pair(midis, 3, 5, 5)] } },
        { prog: { label: 'Hear both shapes', chords: [[57], [69], [57, 69], [60], [72], [60, 72]], gap: 0.55 } },
        { p: 'Why the extra fret? Every pair of neighbouring strings is tuned **5 frets apart** (a 4th), except **G to B**, which is **4 frets apart** (a major 3rd). Any shape that crosses from the G string to the B string has one fret less of string gap to work with, so it has to reach **one fret further** to make up the octave. Remember it as: **crossing the B string? add one fret.**' },
        { p: 'Why is the guitar tuned like that? The one 3rd between G and B makes the common chord shapes fit the hand, and it makes the two E strings come out exactly two octaves apart. The octave shapes simply follow the tuning.' },
      ],
    },
    {
      kind: 'learn', title: 'Shape 3: three strings up, three frets back', blocks: [
        { p: 'From the **low E** string, skip two strings and land on the **G** string, **three frets lower** (back towards the nut). That\'s the octave too. From the **A** string to the **B** string, and from the **D** string to the **high e**, it\'s **two frets** back (one less, because you cross the B string).' },
        { spots: { caption: 'A on the low E (fret 5) → A on the G string (fret 2). D on the A string (fret 5) → D on the B string (fret 3).', to: 7, marks: midis => [...pair(midis, 0, 5, 3), ...pair(midis, 1, 5, 4)] } },
        { prog: { label: 'Hear both shapes', chords: [[45], [57], [45, 57], [50], [62], [50, 62]], gap: 0.55 } },
        { p: 'Use this one when shape 1 would take you too high up the neck, or to stay in one hand position. Three strings up is **15 semitones** higher (E to G), 3 more than an octave, so you take 3 frets **away**.' },
      ],
    },
    {
      kind: 'learn', title: 'Two octaves, and 12 frets up', blocks: [
        { p: 'The **low E** and **high e** strings are exactly **two octaves** apart, so the **same fret** on both is the same note. Know the low E string and you know the high e for free.' },
        { spots: { caption: 'G at fret 3 on the low E and the high e: two octaves apart. G at fret 15 on the low E: one octave up the same string.', to: 15, marks: midis => [{ s: 0, f: 3, label: 'G', role: 'root' as const }, ...(midis.length >= 6 && midis[5] - midis[0] === 24 ? [{ s: 5, f: 3, label: 'G', role: 'target' as const }] : []), { s: 0, f: 15, label: 'G', role: 'next' as const }] } },
        { p: 'And on any single string, **12 frets up** is the octave (that\'s why fret 12 has the double dot, and why the pattern of notes from fret 12 up repeats frets 0 to 11).' },
      ],
    },
    {
      kind: 'learn', title: 'The neck repeats every 12 frets', blocks: [
        { p: 'Because fret 12 is the octave of every open string, **frets 12 to 24 are an exact copy of frets 0 to 12**, one octave higher. Every note name, chord shape and scale you learn near the nut also works from the 12th fret up: same names, same shapes, just higher. So there are really only 12 frets to learn.' },
        { p: 'The dots on your neck are landmarks. Learn the notes under them on the two lowest strings and you\'re never more than a fret or two from a note you know: **low E**: G (3), A (5), B (7), C# (9), E (12). **A string**: C (3), D (5), E (7), F# (9), A (12).' },
        { spots: { caption: 'The landmark notes on the low E and A strings, under the dots at frets 3, 5, 7, 9 and 12.', to: 12, marks: midis => [3, 5, 7, 9, 12].flatMap(f => [0, 1].filter(s => s < midis.length).map(s => ({ s, f, label: nm(midis[s] + f), role: f === 12 ? 'root' as const : 'chord' as const }))) } },
        { p: 'From a landmark, a fret up is a sharp and a fret down is a flat: one above the A at fret 5 is A# (B♭), one below the B at fret 7 is A# too. Then the octave shapes carry every one of these to the higher strings.' },
      ],
    },
    {
      kind: 'learn', title: 'Octaves inside chords (the road to CAGED)', blocks: [
        { p: 'Look inside the chords you already play and you\'ll find octaves holding them together. An open **C** chord has C on the A string (fret 3) and C on the B string (fret 1): that\'s shape 3 crossing the B string. An open **G** chord has three Gs: low E fret 3, the open G string and high e fret 3.' },
        { p: 'A barre chord is the same. The **E-shape barre at the 5th fret** (an A chord) has its root, A, on the low E (fret 5), on the D string (fret 7, shape 1) and on the high e (fret 5, two octaves):' },
        { spots: { caption: 'A major, E-shape barre at fret 5: the three A roots (pink) are octave shapes; the other notes (C# and E) fill in the chord.', from: 3, to: 8, marks: midis => midis.length >= 6 ? [{ s: 0, f: 5, label: 'A', role: 'root' as const }, { s: 1, f: 7, label: 'E', role: 'chord' as const }, { s: 2, f: 7, label: 'A', role: 'root' as const }, { s: 3, f: 6, label: 'C#', role: 'chord' as const }, { s: 4, f: 5, label: 'E', role: 'chord' as const }, { s: 5, f: 5, label: 'A', role: 'root' as const }] : [] } },
        { p: 'This is the idea behind the **CAGED system** in Level 4: every chord shape is built around its roots, which sit in octave shapes, and the five shapes link up the neck by sharing those roots. Learn the octave shapes now and CAGED is half learned before you start.' },
      ],
    },
    {
      kind: 'learn', title: 'Putting it together: one note, everywhere', blocks: [
        { p: 'Now chain the shapes. Pick G. You know it on the low E (fret 3) and on the A string (fret 10). Shape 1 takes the low-E G to the **D string, fret 5**. Shape 2 takes that to the **B string, fret 8**. Shape 3 takes the low-E G to the **open G string** (fret 3 − 3 = 0), and 12 frets up that string is **fret 12**. Two octaves gives the **high e, fret 3**. That\'s every G on the neck, found without counting a single fret.' },
        { spots: { caption: 'Every G from fret 0 to 12, all found from the G on the low E with octave shapes.', to: 12, marks: midis => every(midis, 7, 0, 12) } },
        { p: 'Most notes on the G, B and high e strings can be reached **two ways**: up from the low strings with shapes 1 and 2, or across with shape 3 or the two-octave match with the low E. Pick whichever lands nearer to where your hand already is. That choice is exactly how players think when they solo: stay in one area of the neck and find the notes there.' },
        { p: 'This is the method for the whole neck: **know the notes on the low E and A strings, then use octave shapes to reach the others.** After a few weeks you won\'t need the shapes: you\'ll just see the notes. The shapes are the scaffolding that gets you there.' },
        { tip: 'Say the note name out loud every time you play it. Saying, seeing and hearing at the same time is what makes it stick.' },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Try each one on your guitar first, then tap "Show me how" to check your thinking.', examples: [
        {
          q: 'Find C on the D string.',
          steps: ['You know C on the low E string: fret 8.', 'Shape 1 (two strings up, two frets up) from the low E lands on the D string.', 'Fret 8 + 2 = fret 10.'],
          answer: 'C is at the 10th fret of the D string.',
          spots: { to: 12, marks: midis => pair(midis, 0, 8, 2) },
        },
        {
          q: 'Find F# on the B string.',
          steps: ['F# on the low E is fret 2 (one fret above F).', 'Shape 1: low E fret 2 → D string fret 4.', 'Shape 2 crosses the B string, so three frets up: D fret 4 → B string fret 7.'],
          answer: 'F# is at the 7th fret of the B string.',
          spots: { to: 9, marks: midis => [...pair(midis, 0, 2, 2), ...(midis.length > 4 ? pair(midis, 2, 4, 4).slice(1) : [])] },
        },
        {
          q: 'Where is the octave BELOW the F at fret 6 of the B string?',
          steps: ['Going down two strings from the B string lands on the D string.', 'This shape crosses the B string, so it moves three frets (back, because we go down).', 'Fret 6 − 3 = fret 3.'],
          answer: 'Fret 3 of the D string.',
          spots: { to: 8, marks: midis => (midis.length > 4 ? pair(midis, 2, 3, 4) : []) },
        },
        {
          q: 'Find every D from fret 0 to 12. How many are there?',
          steps: ['Start from what you know: D on the A string is fret 5, and the open D string.', 'Low E: fret 10. A string fret 5 → shape 1 → G string fret 7.', 'Open D → shape 2 → B string fret 3; D string fret 12 → B string fret 15 (too high, skip).', 'The high e matches the low E (two octaves apart): fret 10.', 'Plus the open D and fret 12 of the D string.'],
          answer: '7 Ds: low E 10, A 5, D 0 and 12, G 7, B 3, high e 10.',
          spots: { to: 12, marks: midis => every(midis, 2, 0, 12) },
        },
        {
          q: 'Find B♭ on the G string, two different ways. Do they agree?',
          steps: ['Way 1: B♭ on the A string is fret 1 (one above the open A). Shape 1: two strings up, two frets up → G string, fret 3.', 'Way 2: B♭ on the low E is fret 6 (one above the A at fret 5). Shape 3: three strings up, three frets back → G string, fret 3.', 'Both routes land on the same fret: a good way to check yourself.'],
          answer: 'Fret 3 of the G string (and fret 15, an octave up the same string).',
          spots: { to: 7, marks: midis => [...pair(midis, 1, 1, 3), ...pair(midis, 0, 6, 3)] },
        },
        {
          q: 'A melody note sits high up at fret 10 of the high e string. Play it an octave lower, nearer the middle of the neck.',
          steps: ['Fret 10 on the high e is D (the same as fret 10 on the low E).', 'An octave down, two strings down, lands on the G string.', 'That shape crosses the B string, so it moves three frets: fret 10 − 3 = fret 7.'],
          answer: 'Fret 7 of the G string: the same D, one octave lower.',
          spots: { from: 5, to: 11, marks: midis => (midis.length >= 6 ? pair(midis, 3, 7, 5) : []) },
        },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Your ear already knows octaves: men and women singing "the same tune" together are usually an octave apart. Train it on purpose so you can hear when two notes are the same note (an octave) and when they\'re almost, but not quite, an octave apart.' },
        { list: ['**Octave or not?** The drill plays two notes. Is it the same note, an octave apart, or a different note? Watch out for the near misses one fret short or one fret past: they sound tense or clashing, while a true octave blends.', '**Sing it**: play a low note, hum it, then hum the same note an octave higher. Check with the octave shape on the guitar. If your voice is too low or high for one of them, sing the other.', '**Play it back**: the drill shows a note and plays it; play its octave on the guitar. The mic tells you if you landed on it.'] },
        { play: { label: 'An octave (blends)', seq: [45, 57], gap: 0.6 } },
        { play: { label: 'One fret short: a major 7th (tense)', seq: [45, 56], gap: 0.6 } },
        { play: { label: 'One fret past: a minor 9th (clashes)', seq: [45, 58], gap: 0.6 } },
      ],
      drills: [
        { label: 'Octave or not? (ear)', quiz: 'oc-hear', minutes: 3, goal: '9 out of 10' },
        { label: 'Play the octave you see and hear (mic or tap)', quiz: 'fb-octave', minutes: 4, how: 'play' },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Forgetting the B-string shift: from the D or G string you go up two frets and land one fret short.', right: 'Crossing the B string? Add one fret. If it sounds tense instead of blending, you\'re one fret short (a major 7th).' },
        { wrong: 'Mixing up the octave shape with the power chord shape.', right: 'A power chord is ONE string up, two frets up: a 5th, a different note. The octave skips a string.' },
        { wrong: 'Letting the string in between ring when you play an octave.', right: 'Lean the 1st finger lightly across the middle string (and let the picking hand palm cover the low ones) so only the two octave notes sound.' },
        { wrong: 'Counting frets one by one from the nut.', right: 'Go from a note you know with a shape. Counting is slow and keeps you from ever "seeing" the neck.' },
        { wrong: 'Thinking the octave is a different note because it sounds higher.', right: 'Same letter, same note: an octave is the same note at a different height. Chords and scales treat them as the same.' },
      ],
    },
    {
      kind: 'practice', title: 'Your practice week', intro: 'About 10 minutes a day for a week. Each day builds on the one before. Slow and correct beats fast and sloppy: the mic shows you each note.',
      days: [
        { day: 'Day 1', focus: 'Shape 1 only', tasks: [
          { label: 'Octave pairs up the neck (shape 1)', ex: { label: 'Octave pairs up the neck', tab: 'octaveDyads' }, minutes: 5, goal: 'Every pair clean, the middle string silent' },
          { label: 'Octave shapes quiz', quiz: 'oc-move', minutes: 4, goal: '10 right in a row' },
        ] },
        { day: 'Day 2', focus: 'Crossing the B string', tasks: [
          { label: 'Octave pairs across the B string (shape 2)', ex: { label: 'Octave pairs across the B string', tab: 'octaveCross' }, minutes: 5 },
          { label: 'Octave or not? (ear)', quiz: 'oc-hear', minutes: 3 },
        ] },
        { day: 'Day 3', focus: 'Shape 3 and two octaves', tasks: [
          { label: 'The same note in every octave', ex: { label: 'Octaves: the same note, higher and lower', tab: 'octaves' }, minutes: 4 },
          { label: 'Octave pairs up the neck, faster', ex: { label: 'Octave pairs up the neck', tab: 'octaveDyads' }, minutes: 5, goal: 'A little faster than Day 1, still clean' },
        ] },
        { day: 'Day 4', focus: 'One note everywhere', tasks: [
          { label: 'One note on every string, up and back (a new note each day)', ex: { label: 'One note on every string', tab: 'octaveWalk' }, minutes: 5, goal: 'At 60 BPM, then 80' },
          { label: 'Find every one', quiz: 'fb-find-all', minutes: 4, goal: 'Under 20 seconds a note' },
        ] },
        { day: 'Day 5', focus: 'Play it (mic)', tasks: [
          { label: 'Play the octave you see and hear', quiz: 'fb-octave', how: 'play', minutes: 5, goal: 'Answer by playing, not tapping' },
          { label: 'Octave pairs across the B string', ex: { label: 'Octave pairs across the B string', tab: 'octaveCross' }, minutes: 4 },
        ] },
        { day: 'Day 6', focus: 'Make music with it', tasks: [
          { label: 'Octave lead: Roots Melody (slow)', ex: { label: 'Octave lead: Roots Melody', songbook: { song: 'roots', part: 'octaves' } }, minutes: 6 },
          { label: 'Improvise octaves over a band in Jam', tool: 'jam', minutes: 4 },
        ] },
        { day: 'Day 7', focus: 'Check yourself', tasks: [
          { label: 'Do the Check step of this lesson', quiz: 'oc-move', minutes: 8 },
        ] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['**Octave melodies**: play any melody you know with the shape-1 grip and strum both notes, muting the middle string. Instantly fuller.', '**Find chord roots**: the root of a barre chord on the D or G string is an octave of a note you know on the E or A string.', '**Check your tuning**: the octave pairs should sound perfectly smooth. If they "wobble" (a slow beat), one string is out.', '**Solo anywhere**: when you know one A, the shapes show you every A, so you can move a lick to a new spot on the neck.'] },
      ],
      tasks: [
        { label: 'Octave lead over a reggae band: Roots Melody', ex: { label: 'Octave lead: Roots Melody', songbook: { song: 'roots', part: 'octaves' } } },
        { label: 'Play octaves over a Jam band', tool: 'jam' },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Three checks and one conversation, like a teacher would give: use it, hear it, play it, then explain it back. Get them and the lesson is done; it comes back for short reviews in 1, 3, 7 and 30 days so it sticks.',
      tasks: [
        { skill: 'Apply', label: 'Where does each shape land?', quiz: 'oc-move' },
        { skill: 'Hear', label: 'Octave or not?', quiz: 'oc-hear' },
        { skill: 'Play', label: 'Play the octave (mic)', quiz: 'fb-octave', how: 'play' },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Octave shapes: every note on every string". Quiz me as my teacher: ask me to explain in my own words (1) what an octave is and why it has the same note name, (2) the shape from the low E or A string, (3) why the shape changes when it crosses the B string, and (4) how I would find every G on the neck. Ask one question at a time, tell me what I got right and what I missed, and keep it short.',
        points: ['Same note, 12 frets apart; the higher one vibrates twice as fast', 'Two strings up, two frets up (from E or A)', 'Crossing the B string adds one fret: G to B is a 3rd, not a 4th', 'Find it on the E or A string, then chain the shapes'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'lJYF_Bm7g_w', title: 'Memorize Guitar Notes - Octave Shapes' },
      books: [
        { book: 'Guitar Fretboard Mastery', where: 'Part 1, Step 4: using octaves to find the notes on the D, G, B and e strings', why: 'The same four shapes, with photos of the grip and the muting.' },
        { book: 'Music Theory for Guitarists', where: 'Chapter 1: The Fretboard', why: 'His daily warm-up: one note on every string and back, a new note each day (Day 4 of your practice week).' },
        { book: 'Guitar Fretboard Workbook', where: 'The note-name chapters', why: 'Drawing and saying the shapes out loud: his way of making them stick fast.' },
      ],
      blocks: [
        { p: '**Extra credit**: octaves also live **inside chords**. In an open C chord the C on the A string (fret 3) and the C on the B string (fret 1) are an octave apart: shape 3 across the B string. Look for the octave pairs inside every chord you know.' },
      ],
    },
  ],
}

export const LEVEL1: CourseLesson[] = [OCTAVE_SHAPES]
