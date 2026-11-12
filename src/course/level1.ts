// Theory course, Level 1: Notes on the neck. (Sample lesson first: octave shapes. The owner reviews it before the rest
// of the course is written to the same standard.) Words, examples and drills are our own; the books are only pointed to.
import type { CourseLesson } from './types'
import { SHARPS } from '../theory/notes'

export type Spot = { s: number; f: number; label: string; role: 'root' | 'chord' | 'scale' | 'target' | 'next' }
export const nm = (m: number) => SHARPS[((m % 12) + 12) % 12]
/** a note at (s, f) and where its octave above lands on string t (if it fits on frets 0–15) */
export function pair(midis: number[], s: number, f: number, t: number): Spot[] {
  if (s >= midis.length || t >= midis.length) return []
  const m = midis[s] + f
  const g = m + 12 - midis[t]
  if (f < 0 || g < 0 || g > 15) return []
  return [{ s, f, label: nm(m), role: 'root' }, { s: t, f: g, label: nm(m), role: 'target' }]
}
/** every place a pitch class lives between two frets */
export function every(midis: number[], pc: number, from = 0, to = 12, role: Spot['role'] = 'chord'): Spot[] {
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
        { p: 'You can hear the octave hiding inside every note. Rest a fingertip **very lightly** on the A string right over the 12th fret wire (don\'t press it down) and pick: the bell-like **harmonic** is the octave. A plucked string nearly always rings its octave quietly above the main note (the first **overtone**), so when you add a real octave it blends in instead of clashing: it was already there.' },
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
        { spots: { caption: 'G at fret 3 on the low E and the high e: two octaves apart. G at fret 15 on the low E: one octave up the same string.', to: 15, marks: midis => [{ s: 0, f: 3, label: nm(midis[0] + 3), role: 'root' as const }, ...(midis.length >= 6 && midis[5] - midis[0] === 24 ? [{ s: 5, f: 3, label: nm(midis[0] + 3), role: 'target' as const }] : []), { s: 0, f: 15, label: nm(midis[0] + 3), role: 'next' as const }] } },
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
        { spots: { caption: 'A major, E-shape barre at fret 5: the three A roots (the root colour) are octave shapes; the other notes (C# and E) fill in the chord.', from: 3, to: 8, marks: midis => midis.length >= 6 ? [{ s: 0, f: 5, label: 'A', role: 'root' as const }, { s: 1, f: 7, label: 'E', role: 'chord' as const }, { s: 2, f: 7, label: 'A', role: 'root' as const }, { s: 3, f: 6, label: 'C#', role: 'chord' as const }, { s: 4, f: 5, label: 'E', role: 'chord' as const }, { s: 5, f: 5, label: 'A', role: 'root' as const }] : [] } },
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


// ───────────── Level 1 · Notes on the neck: the other lessons (written after the owner's verdict on the sample:
// "more depth, same or a tiny bit less quizzes") ─────────────

const STD = [40, 45, 50, 55, 59, 64]
const openStrings = (midis: number[]): Spot[] => midis.map((m, s) => ({ s, f: 0, label: nm(m), role: 'root' as const }))
export const naturalsOn = (midis: number[], s: number, to = 12): Spot[] => {
  if (s >= midis.length) return []
  const out: Spot[] = []
  for (let f = 0; f <= to; f++) { const pc = (midis[s] + f) % 12; if ([0, 2, 4, 5, 7, 9, 11].includes(pc)) out.push({ s, f, label: SHARPS[pc], role: f === 0 || f === 12 ? 'root' : 'chord' }) }
  return out
}

export const STRINGS_ALPHABET: CourseLesson = {
  id: 'c1-strings', level: 1, n: 1, title: 'The strings and the musical alphabet', minutes: 30,
  goal: 'Name the six open strings without thinking, say the musical alphabet forwards and backwards from any letter, and find the natural notes along one string.',
  topics: ['fretboard-notes'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Every chord name, every scale, every "play an A here" in a lesson or a tab is built from just **seven letters**. Learn them and the six open strings, and you have the first map of the neck: the starting point for every note you\'ll ever find.' },
        { p: 'It\'s also the language guitarists talk in. "Capo 2, it\'s in A", "walk down from G to E", "the riff starts on the 5th fret of the low E": none of it means anything until the letters and strings are second nature.' },
        { play: { label: 'The six open strings, low to high', seq: STD, gap: 0.55 } },
      ],
    },
    {
      kind: 'learn', title: 'The six strings', blocks: [
        { p: 'From the thickest string (nearest your face when you hold the guitar) to the thinnest: **E A D G B E**. A saying helps: **E**ddie **A**te **D**ynamite, **G**ood **B**ye **E**ddie.' },
        { spots: { caption: 'The open strings: the thick low E at the bottom (nearest you), the thin high e at the top.', to: 3, marks: openStrings } },
        { p: '"Low" and "high" are about **sound**, not where the string sits. The low E is physically on top as you hold the guitar, but it sounds the lowest. That\'s why guitarists say "the low E" and "the high e" (often with a small e).' },
        { p: 'Strings also have numbers: **1 is the high e**, 6 is the low E. You\'ll see "string 3" (the G) in lessons and tab books.' },
        { p: 'Both E strings are the same note, E, two octaves apart (you\'ll see why in the octave lesson). So really there are five different open notes: E, A, D, G, B.' },
        { tip: 'Pluck each string and say its name, low to high and back, until you can do it with your eyes closed. Then call out a random string number and pluck it.' },
      ],
    },
    {
      kind: 'learn', title: 'Seven letters in a circle', blocks: [
        { p: 'Music uses the letters **A B C D E F G**. After G it doesn\'t go on to H: it comes back to **A**, a higher A. The letters go round and round like the hours on a clock.' },
        { p: 'Going **up** the alphabet means going **up** in pitch: C, D, E sounds like climbing. Going backwards (E, D, C) sounds like coming down. On the guitar, going up the neck towards the body = going up the alphabet.' },
        { play: { label: 'Climbing the letters from C: C D E F G A B C', seq: [48, 50, 52, 53, 55, 57, 59, 60], gap: 0.33 } },
        { play: { label: 'And back down', seq: [60, 59, 57, 55, 53, 52, 50, 48], gap: 0.33 } },
        { p: 'Practise starting anywhere: "D E F G A B C D", "F E D C B A G F". Saying it backwards fluently is the part most people skip, and it\'s exactly what you need when you move down the neck.' },
      ],
    },
    {
      kind: 'learn', title: 'The notes between the letters', blocks: [
        { p: 'The seven letters aren\'t evenly spaced. Between most pairs there\'s **one more note** (a sharp or flat, the next lesson). But two pairs have **nothing in between**: **E–F** and **B–C**. Remember those two and the rest falls into place.' },
        { p: 'A piano shows it clearly: the white keys are the seven letters, the black keys are the notes in between, and there\'s **no black key** between E and F or between B and C.' },
        { p: 'Count it up: 7 letters + 5 notes in between = **12 different notes**. That\'s all of them: every song you know is made from these 12, repeated higher and lower.' },
        { play: { label: 'E to F (no gap: one fret) vs F to G (a gap: two frets)', seq: [52, 53, 53, 55], gap: 0.5 } },
      ],
    },
    {
      kind: 'learn', title: 'The natural notes along one string', blocks: [
        { p: 'Each fret is the next of the 12 notes. So along one string the letters (the "natural" notes, no sharps or flats) are **two frets apart**, except **E–F and B–C, which are one fret apart**.' },
        { p: 'Up the low E string: **E** (open), **F** (1), **G** (3), **A** (5), **B** (7), **C** (8), **D** (10), **E** (12). See the two places where the gap is only one fret?' },
        { spots: { caption: 'The natural notes on the low E string. The 12th fret is E again, an octave up.', to: 12, marks: midis => naturalsOn(midis, 0) } },
        { p: 'Same idea on the A string: **A** (open), **B** (2), **C** (3), **D** (5), **E** (7), **F** (8), **G** (10), **A** (12).' },
        { spots: { caption: 'The natural notes on the A string.', to: 12, marks: midis => naturalsOn(midis, 1) } },
        { play: { label: 'Up the A string: A B C D E F G A', seq: [45, 47, 48, 50, 52, 53, 55, 57], gap: 0.33 } },
        { tip: 'Fretboard teachers agree on one trick: say the note name out loud every time you play it. Seeing, saying and hearing together sticks far faster than just looking.' },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Answer each one with your guitar in your hands, then check.', examples: [
        { q: 'What is the next letter above B? And above E? How far up the string is each?', steps: ['B is followed by C, and they have no note between them.', 'E is followed by F, also with no note between.', 'So both are just one fret up.'], answer: 'C and F, each one fret higher.' },
        { q: 'Name the natural notes on the D string from open to fret 12.', steps: ['Start on the open string: D.', 'D to E is a gap: two frets → E at 2.', 'E to F has no gap: one fret → F at 3.', 'Then two frets each: G 5, A 7, B 9.', 'B to C has no gap: C at 10. Then D at 12.'], answer: 'D 0, E 2, F 3, G 5, A 7, B 9, C 10, D 12.', spots: { to: 12, marks: midis => naturalsOn(midis, 2) } },
        { q: 'Count backwards from G down to the G below.', steps: ['Backwards from G: F, then E, then D, C, B, A, and back to G.'], answer: 'G F E D C B A G.' },
        { q: 'You\'re on the 5th fret of the low E. Which note is it, and what are the notes one natural step above and below?', steps: ['Count up from the open E: F (1), G (3), A (5).', 'The next letter up is B, two frets higher (7).', 'The letter below is G, two frets lower (3).'], answer: 'A. B is above it (fret 7), G below it (fret 3).', spots: { to: 8, marks: midis => [{ s: 0, f: 3, label: nm(midis[0] + 3), role: 'chord' as const }, { s: 0, f: 5, label: nm(midis[0] + 5), role: 'root' as const }, { s: 0, f: 7, label: nm(midis[0] + 7), role: 'chord' as const }] } },
        { q: 'Which strings are both called E, and are they the same note?', steps: ['String 6 (the thickest) and string 1 (the thinnest) are both E.', 'They\'re the same note name, two octaves apart: the same E, sounding much higher on the thin string.'], answer: 'Strings 6 and 1: the same note, two octaves apart.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Before you can name notes by ear you need to hear **which way** they go. It sounds simple, but small steps fool everyone at first. A trick that works: **hum both notes**. You can feel your voice go up or down even when you can\'t hear it yet.' },
        { list: ['Pluck the open strings in a random order: was each one higher or lower than the last?', 'Play two notes a fret apart on one string, then two frets apart: hear how small the steps are.', 'Hum each open string as you pluck it. Your voice will find the lower ones an octave up: that\'s fine.'] },
      ],
      drills: [
        { label: 'Higher, lower or the same? (ear)', quiz: 'l1-pitch', minutes: 3, goal: '9 out of 10' },
        { label: 'Play each open string and watch the tuner name it', tool: 'tuner', minutes: 2 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Calling the thick string the "top" string because it\'s on top.', right: 'Top and bottom in music mean high and low sound. The thick string is the LOW E; the thin one is the HIGH e (string 1).' },
        { wrong: 'Putting a note between E and F, or between B and C.', right: 'Those two pairs are one fret apart. E# and B# exist on paper but they\'re the same frets as F and C.' },
        { wrong: 'Only learning the alphabet forwards.', right: 'Practise it backwards from every letter: moving down the neck depends on it.' },
        { wrong: 'Counting every fret from the nut to find a note.', right: 'Learn a few landmarks (next lessons) and count from the nearest one.' },
      ],
    },
    {
      kind: 'practice', title: 'Your practice week', intro: 'Five minutes a day is plenty. Say every note out loud.',
      days: [
        { day: 'Day 1', focus: 'The open strings', tasks: [
          { label: 'Open strings, one at a time (say each name)', ex: { label: 'Open strings, one at a time', drill: 'openstrings' }, minutes: 4 },
          { label: 'The musical alphabet', quiz: 'nb-alpha', minutes: 4, goal: 'No mistakes' },
        ] },
        { day: 'Day 2', focus: 'The alphabet both ways', tasks: [
          { label: 'The alphabet along the low E string (say each note)', ex: { label: 'The alphabet along the low E string', tab: 'alphabetE' }, minutes: 5 },
        ] },
        { day: 'Day 3', focus: 'The A string', tasks: [
          { label: 'The alphabet along the A string', ex: { label: 'The alphabet along the A string', tab: 'alphabetA' }, minutes: 5 },
          { label: 'Higher, lower or the same? (ear)', quiz: 'l1-pitch', minutes: 3 },
        ] },
        { day: 'Day 4', focus: 'Find them fast', tasks: [
          { label: 'Natural notes on the low E string', quiz: 'fb-nat-0', minutes: 5, goal: 'Under 3 seconds a note' },
        ] },
        { day: 'Day 5', focus: 'Play a melody from the letters', tasks: [
          { label: 'A melody on the natural notes: Oh! Susanna', ex: { label: 'Oh! Susanna (melody)', songbook: { song: 'susanna', part: 'melody' } }, minutes: 6 },
        ] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['When you learn any riff, say the names of its first few notes. "This riff starts on G": suddenly it has a place on the map.', 'Look at a chord sheet: the chord letters are the same seven letters. A G chord is built on the note G.', 'Tune up every day by plucking each string and saying its name as the tuner shows it.'] },
      ],
      tasks: [
        { label: 'Play Oh! Susanna and name every note in the first line', ex: { label: 'Oh! Susanna (melody)', songbook: { song: 'susanna', part: 'melody' } } },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'The musical alphabet', quiz: 'nb-alpha' },
        { skill: 'Hear', label: 'Higher, lower or the same?', quiz: 'l1-pitch' },
        { skill: 'Play', label: 'Natural notes on the low E (mic)', quiz: 'fb-nat-0', how: 'play' },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "The strings and the musical alphabet". Quiz me as my teacher: ask me to explain in my own words (1) the open strings low to high and what "low" means, (2) why the alphabet starts again after G, (3) which letters have no note between them, and (4) how far apart the natural notes are along a string. One question at a time; tell me what I got right and what I missed; keep it short.',
        points: ['E A D G B E, low = low sound (the thick string)', 'Seven letters, then A again, higher', 'E–F and B–C: no note between', 'Two frets apart, except E–F and B–C (one fret)'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'Ky-55ybil3k', title: 'The Guitar Notes Of The Musical Alphabet on The Guitar Fretboard' },
      books: [
        { book: 'No Bull Music Theory for Guitarists', where: 'Chapter 1: the musical alphabet', why: 'The same starting point, with the musical alphabet on every string.' },
        { book: 'Music Theory for Guitarists', where: 'Chapter 1: The Fretboard', why: 'The open strings, the natural notes and a daily note-naming warm-up.' },
        { book: 'Guitar Fretboard Workbook', where: 'The note-name chapters', why: 'Saying and writing the notes until they stick.' },
      ],
      blocks: [{ p: '**Extra credit**: why do the letters stop at G? Long before guitars, medieval musicians named the notes of their scales with the first letters of the alphabet; seven different notes were all they needed before the pattern repeated an octave higher.' }],
    },
  ],
}

export const STEPS_SHARPS: CourseLesson = {
  id: 'c1-steps', level: 1, n: 2, title: 'Tones, semitones, sharps and flats', minutes: 30,
  goal: 'Measure any distance on the neck in tones and semitones, and name every one of the 12 notes, including the sharps and flats, with both of their names.',
  builds: ['the musical alphabet'], topics: ['fretboard-notes', 'major-scale'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Tones and semitones are the **ruler** of music. Every scale is a pattern of them (the major scale is tone, tone, semitone…), every chord is built by measuring them, and every "move it up a half step" instruction uses them.' },
        { p: 'Sharps and flats complete the alphabet: with them you can name all **12** notes, so nothing on the neck is nameless any more.' },
      ],
    },
    {
      kind: 'learn', title: 'The semitone: one fret', blocks: [
        { p: 'The smallest step in our music is a **semitone** (Americans say **half step**). On the guitar it\'s exactly **one fret**: from any fret to the next one, up or down, on the same string.' },
        { play: { label: 'Semitones: one fret at a time up the A string', seq: [45, 46, 47, 48, 49, 50], gap: 0.4 } },
        { p: 'Why one fret? The frets are spaced so that each one raises the pitch by the same amount: 12 of them make an octave (the 12th fret). So one fret = one twelfth of an octave = one semitone.' },
      ],
    },
    {
      kind: 'learn', title: 'The tone: two frets', blocks: [
        { p: 'A **tone** (or **whole step**) is two semitones: **two frets**. It\'s the step from "do" to "re".' },
        { play: { label: 'Tones: two frets at a time', seq: [45, 47, 49, 51, 53], gap: 0.45 } },
        { p: 'Now the alphabet makes sense in these terms: most neighbouring letters are a **tone** apart (two frets), and **E–F** and **B–C** are only a **semitone** apart (one fret).' },
        { spots: { caption: 'The low E string: tones (2 frets) between most letters, semitones (1 fret) at E–F and B–C.', to: 12, marks: midis => naturalsOn(midis, 0) } },
      ],
    },
    {
      kind: 'learn', title: 'Sharps (#) and flats (b)', blocks: [
        { p: 'A **sharp** (**#**) raises a note by a semitone: **F#** is one fret above F. A **flat** (**b**) lowers a note by a semitone: **Bb** is one fret below B.' },
        { p: 'So the note between F and G has **two names**: F# (from below) and Gb (from above). Same fret, same sound, two names. Notes like that are called **enharmonic**.' },
        { spots: { caption: 'The low E string with every note: each in-between note has a sharp name and a flat name.', to: 12, marks: midis => Array.from({ length: 13 }, (_, f) => ({ s: 0, f, label: nm(midis[0] + f), role: [0, 2, 4, 5, 7, 9, 11].includes((midis[0] + f) % 12) ? 'chord' as const : 'next' as const })) } },
        { p: 'All 12 notes, going up with sharps: **A A# B C C# D D# E F F# G G# A**. Going down with flats: **A Ab G Gb F E Eb D Db C B Bb A**.' },
        { tip: 'Sharps when you go up, flats when you come down is a handy habit, but in real music the key decides which name is used (you\'ll see why in Level 2: each letter appears once in a scale).' },
      ],
    },
    {
      kind: 'learn', title: 'The odd ones: E#, B#, Fb, Cb', blocks: [
        { p: 'Since E–F and B–C have no note between them, **E#** is simply the same fret as **F**, and **B#** the same as **C**. Likewise **Fb** = E and **Cb** = B.' },
        { p: 'They look strange but they do turn up, in keys like F# major (which has an E#). For now, just know they\'re legal names for frets you already know.' },
      ],
    },
    {
      kind: 'learn', title: 'Measuring on the neck', blocks: [
        { p: 'Put it together and you can measure anything: on one string, **count frets**: 1 fret = semitone, 2 = tone, 12 = octave.' },
        { p: 'Across strings it\'s different, because the next string up is already 5 frets higher (4 from G to B). So the **same fret on the next string** is 5 semitones higher. You\'ll use that in the octave and tuning lessons.' },
        { play: { label: 'Fret 5 on the low E (A), then the open A string: the same note', seq: [45, 45], gap: 0.6 } },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Work each one out on the guitar before you look.', examples: [
        { q: 'What is a tone above E? And a semitone above B?', steps: ['A tone is two frets. One fret above E is F, two frets is F#.', 'A semitone above B is one fret: C (no note between B and C).'], answer: 'F# (two frets above E). C (one fret above B).' },
        { q: 'Give both names of the note at the 1st fret of the A string.', steps: ['One fret above A is A# (A raised a semitone).', 'It\'s also one fret below B, so it\'s Bb.'], answer: 'A# or Bb: the same note.' },
        { q: 'How many semitones from C up to E? Is that two tones?', steps: ['C → C# → D → D# → E: four steps of one fret.', 'Four semitones = two tones.'], answer: '4 semitones, which is 2 tones.' },
        { q: 'Find G# on the low E string, then Ab. What do you notice?', steps: ['G is fret 3, so G# is one fret up: fret 4.', 'A is fret 5, so Ab is one fret down: fret 4.'], answer: 'Both are fret 4: the same note with two names.', spots: { to: 6, marks: midis => [{ s: 0, f: 3, label: nm(midis[0] + 3), role: 'chord' as const }, { s: 0, f: 4, label: 'G#/Ab', role: 'root' as const }, { s: 0, f: 5, label: nm(midis[0] + 5), role: 'chord' as const }] } },
        { q: 'Starting on D (open D string), go up: tone, tone, semitone. Where do you land?', steps: ['A tone above D is E (fret 2).', 'A tone above E is F# (fret 4): E–F is only a semitone, so a full tone reaches F#.', 'A semitone above F# is G (fret 5).'], answer: 'G, at the 5th fret: D E F# G, the start of the D major scale.', spots: { to: 6, marks: midis => (midis.length > 2 ? [0, 2, 4, 5].map(f => ({ s: 2, f, label: nm(midis[2] + f), role: f === 0 ? 'root' as const : 'chord' as const })) : []) } },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'A semitone sounds **tight**, close, a little tense (think of the shark theme from Jaws, or "ti" rising to "do"). A tone sounds **open**, like the first two notes of "do-re-mi". Learning to tell them apart is the first step to playing what you hear.' },
        { play: { label: 'Semitone, then tone', seq: [50, 51, 50, 52], gap: 0.5 } },
        { list: ['Play a note, then the next fret; sing both. Then two frets; sing both. Feel the difference in your throat.', 'Play E–F and B–C on the guitar: they should sound like the tight semitone, even though they\'re "neighbouring letters".'] },
      ],
      drills: [
        { label: 'Semitone or tone? (ear)', quiz: 'l1-step-ear', minutes: 3, goal: '8 out of 10' },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Thinking a tone is "the next letter".', right: 'A tone is two frets. E to F is the next letter but only a semitone; E to F# is a tone.' },
        { wrong: 'Believing F# and Gb are different notes.', right: 'Same fret, same sound: two names. Which one is used depends on the key.' },
        { wrong: 'Counting the starting fret as a step.', right: 'Count the moves, not the frets you touch: from fret 3 to fret 5 is two steps (a tone).' },
        { wrong: 'Assuming the same fret on the next string is "one step up".', right: 'The next string up is 5 semitones higher at the same fret (4 from G to B).' },
      ],
    },
    {
      kind: 'practice', title: 'Your practice week', intro: 'A few minutes a day; finish each day by naming 5 random frets on the low E, sharps and flats included.',
      days: [
        { day: 'Day 1', focus: 'Semitones under your fingers', tasks: [
          { label: 'The spider: one fret at a time (say the names)', ex: { label: 'The spider: one fret at a time', spec: { kind: 'warmup', root: 'A', type: 'spider', position: 0 } }, minutes: 5 },
        ] },
        { day: 'Day 2', focus: 'Tones and semitones', tasks: [
          { label: 'Tones and semitones', quiz: 'nb-steps', minutes: 4, goal: '10 right' },
          { label: 'Semitone or tone? (ear)', quiz: 'l1-step-ear', minutes: 3 },
        ] },
        { day: 'Day 3', focus: 'All 12 notes on the low strings', tasks: [
          { label: 'Sharps and flats on the two lowest strings', quiz: 'fb-low-all', minutes: 5 },
        ] },
        { day: 'Day 4', focus: 'Measure with your ears', tasks: [
          { label: 'Octaves: the same note, higher and lower', ex: { label: 'Octaves: the same note, higher and lower', tab: 'octaves' }, minutes: 5 },
        ] },
        { day: 'Day 5', focus: 'Use it in a scale', tasks: [
          { label: 'C major along one string: T T S T T T S', ex: { label: 'C major scale', spec: { kind: 'scale', root: 'C', type: 'major', position: 0 } }, minutes: 6 },
        ] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['"Move it up a half step" = one fret. Songs often change key by a semitone for the last chorus: every chord moves up one fret.', 'Chromatic runs (every fret in a row) are how bass lines and blues licks walk into a chord.', 'The capo works in semitones: capo 2 makes everything two semitones (a tone) higher.'] },
      ],
      tasks: [
        { label: 'Hear chromatic walk-ups in a 12-bar blues in Jam', tool: 'jam' },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Tones and semitones', quiz: 'nb-steps' },
        { skill: 'Hear', label: 'Semitone or tone?', quiz: 'l1-step-ear' },
        { skill: 'Play', label: 'Sharps and flats on the low strings (mic)', quiz: 'fb-low-all', how: 'play' },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Tones, semitones, sharps and flats". Quiz me as my teacher: ask me to explain in my own words (1) what a semitone and a tone are on the guitar, (2) what sharps and flats do and why one note can have two names, (3) where E# and B# are, and (4) how far up the same fret on the next string is. One question at a time; tell me what I got right and what I missed; keep it short.',
        points: ['Semitone = 1 fret, tone = 2 frets', '# raises a semitone, b lowers one; F# = Gb (enharmonic)', 'E# = F, B# = C', 'The next string at the same fret is 5 semitones up (4 from G to B)'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'zYIStYU3mTw', title: 'This SIMPLE Pattern Made Me Finally Understand Flats And Sharps On The Guitar Neck!' },
      books: [
        { book: 'No Bull Music Theory for Guitarists', where: 'Chapter 2: tones and semitones', why: 'The same ruler, with neck exercises.' },
        { book: 'Music Theory for Guitarists', where: 'Chapter 2: The Basics', why: 'Half steps, whole steps and accidentals in standard notation as well as tab.' },
      ],
      blocks: [{ p: '**Extra credit**: our 12 equal semitones are called **equal temperament**. Older tunings made some keys sweeter and others sour; equal temperament makes every key sound equally good, which is why you can move any shape anywhere on the guitar and it still works.' }],
    },
  ],
}

export const LANDMARKS: CourseLesson = {
  id: 'c1-landmarks', level: 1, n: 3, title: 'The notes on the low E and A strings', minutes: 30,
  goal: 'Name any note on the low E and A strings in about two seconds, using landmark frets, and know why these two strings matter most.',
  builds: ['the musical alphabet', 'sharps and flats'], topics: ['fretboard-notes', 'caged'],
  steps: [
    {
      kind: 'why', title: 'Why these two strings first', blocks: [
        { p: 'The low E and A strings are the **root strings** of the guitar. Nearly every barre chord and power chord is named after the note its lowest finger plays on one of these two strings. Know them and you can play any chord anywhere: "B minor? A-shape barre with the root at fret 2 of the A string."' },
        { p: 'They\'re also the base of everything that follows: octave shapes (lesson 4) carry these notes to the other strings, and CAGED (later) is built on the roots they hold.' },
      ],
    },
    {
      kind: 'learn', title: 'Landmarks: the notes under the dots', blocks: [
        { p: 'Don\'t memorise 24 notes one by one. Memorise a few **landmarks** and count a fret or two from the nearest one. The dots on the neck make perfect landmarks:' },
        { spots: { caption: 'Landmarks: the notes under the dots (3, 5, 7, 9, 12) on the low E and A strings.', to: 12, marks: midis => [3, 5, 7, 9, 12].flatMap(f => [0, 1].filter(s => s < midis.length).map(s => ({ s, f, label: nm(midis[s] + f), role: f === 12 ? 'root' as const : 'chord' as const }))) } },
        { list: ['**Low E**: G (3) · A (5) · B (7) · C# (9) · E (12)', '**A string**: C (3) · D (5) · E (7) · F# (9) · A (12)'] },
        { p: 'Notice: at the same fret, the A string is always **5 semitones** (a 4th) above the low E. G→C, A→D, B→E. That gives you a second way to check yourself.' },
      ],
    },
    {
      kind: 'learn', title: 'Counting from a landmark', blocks: [
        { p: 'From any landmark, one fret up = sharp, one fret down = flat. **Fret 4 on the low E**: one above G (3) = G#, one below A (5) = Ab. **Fret 8**: one above B (7) = C (no gap at B–C). **Fret 10**: one above C# (9)… easier as two below E (12): D.' },
        { p: 'Always count from the **nearest** landmark, up or down. Nothing on these strings is more than one fret from a dot.' },
        { spots: { caption: 'All the natural notes on the two root strings.', to: 12, marks: midis => [...naturalsOn(midis, 0), ...naturalsOn(midis, 1)] } },
      ],
    },
    {
      kind: 'learn', title: 'Root strings: where chords get their names', blocks: [
        { p: 'Look at the open chords you know: **G** and **E** have their lowest root on the low E string (G at fret 3, the open E). **C** and **A** have theirs on the A string (C at fret 3, the open A). **D** starts on the open D string.' },
        { p: 'That\'s the start of the **CAGED** idea: each chord shape has its root on a particular string. Move an E-shape barre chord so its root sits on the low E at fret 5 and it\'s an **A** chord; slide the A-shape so its root is at fret 3 of the A string and it\'s a **C** chord.' },
        { spots: { caption: 'An A chord, E-shape barre at fret 5: its name comes from the root on the low E (the root colour).', from: 3, to: 8, marks: midis => midis.length >= 6 ? [{ s: 0, f: 5, label: 'A', role: 'root' as const }, { s: 1, f: 7, label: 'E', role: 'chord' as const }, { s: 2, f: 7, label: 'A', role: 'root' as const }, { s: 3, f: 6, label: 'C#', role: 'chord' as const }, { s: 4, f: 5, label: 'E', role: 'chord' as const }, { s: 5, f: 5, label: 'A', role: 'root' as const }] : [] } },
        { tip: 'Power chords work the same: the root on the low E or A names the chord. A5 = root at fret 5 of the low E; D5 = root at fret 5 of the A string.' },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Find it on the guitar first.', examples: [
        { q: 'Name fret 8 on the A string.', steps: ['The nearest landmark is E at fret 7.', 'One fret up from E is F (no note between E and F).'], answer: 'F.' },
        { q: 'Where is C on the low E string?', steps: ['Landmark B at fret 7.', 'B to C is a semitone: one fret up.'], answer: 'Fret 8.', spots: { to: 9, marks: midis => [{ s: 0, f: 7, label: nm(midis[0] + 7), role: 'chord' as const }, { s: 0, f: 8, label: nm(midis[0] + 8), role: 'root' as const }] } },
        { q: 'You want a B minor barre chord with an A-shape. Where does it go?', steps: ['The A-shape has its root on the A string.', 'B on the A string: one tone above the open A = fret 2.'], answer: 'Barre at the 2nd fret, root at fret 2 of the A string.' },
        { q: 'Name fret 6 on both root strings.', steps: ['Low E: one above A (5) = A# (or Bb).', 'A string: one above D (5) = D# (or Eb).', 'Check: the A string is a 4th above the low E: A#→D# ✓.'], answer: 'Low E: A#/Bb. A string: D#/Eb.' },
        { q: 'A riff uses a G5 power chord and then a C5. Where are their roots?', steps: ['G on the low E: fret 3 (a landmark).', 'C on the A string: fret 3, right next to it: same fret, one string over (a 4th higher).'], answer: 'G5 at fret 3 of the low E; C5 at fret 3 of the A string.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Two ear skills fit this lesson. First, **direction**: as you walk up the string, hear each note rise. Second, the sound of the **4th**: the same fret on the low E and A strings is always a 4th apart, the opening leap of "Here Comes the Bride". Learn that sound and you can hear when a bass note moves to the next root string.' },
        { prog: { label: 'Same fret, low E then A: a 4th every time', chords: [[43], [48], [45], [50], [47], [52]], gap: 0.5 } },
        { list: ['Play a note on the low E, hum it, then find the same pitch on the A string (5 frets lower): the mic checks you in the drill below.', 'Play landmark pairs (G–C, A–D, B–E) and hum the 4th leap.'] },
      ],
      drills: [
        { label: 'Higher, lower or the same? (small steps)', quiz: 'l1-pitch', minutes: 3 },
        { label: 'Play the natural notes on the A string (mic)', quiz: 'fb-nat-1', how: 'play', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Counting from the nut every time.', right: 'Count from the nearest landmark: nothing is more than one fret from a dot.' },
        { wrong: 'Mixing up the two strings\' landmarks (G at 3 on the A string?).', right: 'Low E: G A B C# E. A string: C D E F# A. The A string is always a 4th higher.' },
        { wrong: 'Forgetting the no-gap pairs when counting (B# at fret 8?).', right: 'One above B is C; one above E is F.' },
        { wrong: 'Learning the notes but never using them.', right: 'Name the root of every barre and power chord you play: that\'s daily practice for free.' },
      ],
    },
    {
      kind: 'practice', title: 'Your practice week', intro: 'Short daily bursts. The goal: about two seconds a note.',
      days: [
        { day: 'Day 1', focus: 'The landmarks', tasks: [
          { label: 'Natural notes on the low E', quiz: 'fb-nat-0', minutes: 4 },
          { label: 'The alphabet along the low E', ex: { label: 'The alphabet along the low E string', tab: 'alphabetE' }, minutes: 3 },
        ] },
        { day: 'Day 2', focus: 'The A string', tasks: [
          { label: 'Natural notes on the A string', quiz: 'fb-nat-1', minutes: 4 },
          { label: 'The alphabet along the A string', ex: { label: 'The alphabet along the A string', tab: 'alphabetA' }, minutes: 3 },
        ] },
        { day: 'Day 3', focus: 'Sharps and flats', tasks: [
          { label: 'Sharps and flats on the two lowest strings', quiz: 'fb-low-all', minutes: 5, goal: 'Under 3 seconds a note' },
        ] },
        { day: 'Day 4', focus: 'Roots for real chords', tasks: [
          { label: 'Barre chords: where does it go?', quiz: 'ch-barre', minutes: 5 },
        ] },
        { day: 'Day 5', focus: 'Play it', tasks: [
          { label: 'Power-chord roots in a reggae-rock riff in Jam (name every root)', tool: 'jam', minutes: 6 },
        ] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['Whenever you see a barre or power chord in a song, say its root out loud: "F#, fret 2, low E".', 'Transposing a riff: find its first note on the low E, then move the whole riff to a new root.', 'Bass lines and walk-ups between chords live on these two strings.'] },
      ],
      tasks: [
        { label: 'Play I–IV–V power chords over the band in Jam', tool: 'jam' },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Barre chords: where does it go?', quiz: 'ch-barre' },
        { skill: 'Hear', label: 'Higher, lower or the same?', quiz: 'l1-pitch' },
        { skill: 'Play', label: 'Sharps and flats on the low strings (mic)', quiz: 'fb-low-all', how: 'play' },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "The notes on the low E and A strings". Quiz me as my teacher: ask me (1) the landmark notes on both strings, (2) how I find a note between landmarks, (3) how the two strings relate at the same fret, and (4) why these strings matter for chords. One question at a time; tell me what I got right and missed; keep it short.',
        points: ['Low E: G A B C# E at 3 5 7 9 12; A: C D E F# A', 'Count one fret from the nearest landmark', 'The A string is a 4th (5 semitones) above at the same fret', 'Barre and power chords take their names from roots on these strings'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'LxfME_pBOgA', title: 'How to Identify ANY Note on the Guitar Fretboard (Simple System for Beginners & Beyond)' },
      books: [
        { book: 'Guitar Fretboard Mastery', where: 'Part 1, Steps 2 and 3: the key tones, and the notes on the E and A strings', why: 'The same landmark idea (its "key tones") and drills, right before its octave shapes.' },
        { book: 'Guitar Fretboard', where: 'The note-finding chapters', why: 'Memory tricks for the root strings.' },
        { book: 'Fretboard Logic SE', where: 'The chapters on chord forms and roots', why: 'How chord shapes take their names from the roots on these strings: the road to CAGED.' },
      ],
      blocks: [{ p: '**Extra credit**: learn the notes on the high e too. You already have: the high e is the same as the low E, two octaves up, fret for fret.' }],
    },
  ],
}

export const READING: CourseLesson = {
  id: 'c1-reading', level: 1, n: 5, title: 'Reading tab, chord boxes and neck diagrams', minutes: 30,
  goal: 'Read any tab, chord box or neck picture fluently: which string, which fret, which finger, how it\'s played and roughly when.',
  builds: ['the six strings', 'the notes on the low E and A strings'], topics: ['fretboard-notes', 'songs'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Almost all guitar music you\'ll ever learn comes as **tab**, **chord boxes** or **neck diagrams**: every song in your books, every lesson, every riff from the Riff Scanner. Reading them quickly and correctly means you spend your time playing, not decoding.' },
        { p: 'Each one is a picture of the neck from a different angle. Once you see that, they\'re all the same idea.' },
      ],
    },
    {
      kind: 'learn', title: 'Tab: six lines, six strings', blocks: [
        { p: 'Tab has six lines, one per string, drawn as if the guitar were lying on your lap face up: the **top line is the high e**, the **bottom line is the low E**. A number on a line is the **fret** to play on that string; **0** means the open string.' },
        { p: 'Read left to right like words. Numbers **stacked in one column** are played **together** (a chord); numbers further right come **later**.' },
        { play: { label: 'The tab "e|--0--3--5--" (open e, then frets 3 and 5)', seq: [64, 67, 69], gap: 0.45 } },
        { tip: 'Check the tuning line at the start (E A D G B E, or D A D G B E for drop D…). If a tab is in another tuning, the frets only work in that tuning.' },
      ],
    },
    {
      kind: 'learn', title: 'Tab symbols: how a note is played', blocks: [
        { list: ['**h** hammer-on: 5h7 = pick 5, slam a finger onto 7 without picking', '**p** pull-off: 7p5 = pick 7, flick the finger off so 5 sounds', '**/** and **\\\\** slide up and down: 5/7 = keep pressing and glide', '**b** bend: 7b9 = bend fret 7 until it sounds like fret 9; **r** = release back down', '**~** vibrato: shake the note', '**x** a muted, dead note (a percussive chuck)', '**PM** palm mute: rest the side of your picking hand on the strings by the bridge', '**<12>** or **NH** a natural harmonic: touch the string over the fret wire, don\'t press'] },
        { p: 'You don\'t need to master these techniques now (Level 1 is about reading); just recognise what each sign asks for. The technique lessons in Learn teach each one.' },
      ],
    },
    {
      kind: 'learn', title: 'Rhythm in tab', blocks: [
        { p: 'Plain text tab often doesn\'t show rhythm: the spacing is only a rough hint. That\'s why you **listen** to the song (or tap **Hear it** in Play) while reading. Better tabs (Guitar Pro files, and KGuitar\'s own tabs) show note lengths with stems under the numbers, and KGuitar can print the **1 & 2 &** counts under each bar (Play → Options → Count).' },
        { p: 'In Play you get the best of both: the tab, the sound, a cursor that moves in time, and the counts. Rhythm itself is the next lesson.' },
      ],
    },
    {
      kind: 'learn', title: 'Chord boxes: the neck standing up', blocks: [
        { p: 'A chord box shows the neck **standing upright facing you**: the six **vertical lines are strings** (low E on the **left**), the **horizontal lines are frets**, and the thick line on top is the **nut**. Dots show where to press; the number on (or under) a dot says **which finger**: 1 index, 2 middle, 3 ring, 4 little.' },
        { p: 'Above the nut, **o** = play that string open, **x** = don\'t play it. If the box starts higher up the neck, a number beside it ("5fr") says which fret the top line is. A curved line or bar across several strings = a **barre** with one finger.' },
        { p: 'Read a box string by string from left to right: "x, 3rd fret ring finger, 2nd fret middle, open, 1st fret index, open" is a C chord.' },
      ],
    },
    {
      kind: 'learn', title: 'Neck diagrams: the neck lying down', blocks: [
        { p: 'Scale and note pictures (like the ones in these lessons) show the neck **lying on its side**: frets run left to right, the **low E is the bottom line** (nearest you, the same way round as tab), and dots show notes, often labelled with a name, a finger or a number like 1, 3, 5 (the notes\' jobs in the scale or chord).' },
        { spots: { caption: 'A neck diagram: the C major chord shape, with note names (the C roots in the root colour).', to: 4, marks: midis => (midis.length >= 6 ? [{ s: 1, f: 3, label: 'C', role: 'root' as const }, { s: 2, f: 2, label: 'E', role: 'chord' as const }, { s: 3, f: 0, label: 'G', role: 'chord' as const }, { s: 4, f: 1, label: 'C', role: 'root' as const }, { s: 5, f: 0, label: 'E', role: 'chord' as const }] : []) } },
        { p: 'Chord box and neck diagram show the same thing turned 90°. Being able to switch between them in your head is a real skill: try drawing a chord box from this picture.' },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Read each one, play it, then check.', examples: [
        { q: 'A tab line reads: G|--2--4--5--. What do you play?', steps: ['The line is the G string.', 'Frets 2, 4 and 5 one after another.', 'G string fret 2 = A, fret 4 = B, fret 5 = C.'], answer: 'A, B, C up the G string (frets 2, 4, 5).' },
        { q: 'In a tab, the numbers 3 (low E), 2 (A), 0 (D), 0 (G), 0 (B), 3 (high e) are stacked in one column. What is it?', steps: ['Stacked = played together: a chord.', 'Read from the bottom line up: 3 on the low E, 2 on the A, the rest open, 3 on the high e.', 'That\'s the open G chord.'], answer: 'An open G chord, strummed once.' },
        { q: 'A chord box shows x o 2 2 2 o with fingers 1 2 3 on the dots. What chord?', steps: ['Low E not played (x), A open (o).', 'Fingers on fret 2 of the D, G and B strings, high e open.'], answer: 'Open A major.' },
        { q: 'What does "12b14r12" ask for?', steps: ['Pick fret 12.', 'Bend it up until it sounds like fret 14 (a whole tone).', 'Release it back to the fret-12 pitch without picking again.'], answer: 'A whole-tone bend and release on fret 12.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'The ear skill here is matching sound to what you read: before you play a line of tab, **imagine** how it goes (up? down? one note repeated?), then tap Hear it and check. Over time you start to "hear" tab with your eyes.' },
        { list: ['Open any short tab in Play, guess whether the first five notes go up or down, then tap Hear it.', 'Follow the cursor in Play while Hear it plays, saying the string and fret of each note.'] },
      ],
      drills: [
        { label: 'Higher, lower or the same? (ear)', quiz: 'l1-pitch', minutes: 3 },
        { label: 'Read a melody tab: Clementine (Hear it first, then play)', ex: { label: 'Read a melody tab: Clementine', songbook: { song: 'clementine', part: 'melody' } }, minutes: 5 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Reading tab upside down (top line = low E).', right: 'Top line = high e, the string nearest the floor. Same way round as the guitar on your lap.' },
        { wrong: 'Reading a chord box with the low E on the right.', right: 'Chord boxes face you: low E on the left, like the guitar standing up in front of you.' },
        { wrong: 'Treating finger numbers as fret numbers.', right: 'In chord boxes the dot\'s position is the fret; the number on it is the finger.' },
        { wrong: 'Guessing the rhythm from the spacing.', right: 'Listen to the song or tap Hear it; use the counts in Play.' },
        { wrong: 'Ignoring the tuning line.', right: 'Check it first: a drop-D tab played in standard tuning sounds wrong from the first note.' },
      ],
    },
    {
      kind: 'practice', title: 'Your practice week', intro: 'Read something every day. Hear it first, then play.',
      days: [
        { day: 'Day 1', focus: 'Tab basics', tasks: [
          { label: 'Reading tab and chord boxes', quiz: 'l1-read', minutes: 4 },
          { label: 'Open strings, one at a time (read the tab)', ex: { label: 'Open strings, one at a time', drill: 'openstrings' }, minutes: 3 },
        ] },
        { day: 'Day 2', focus: 'A melody from tab', tasks: [
          { label: 'Read a melody tab: Clementine', ex: { label: 'Read a melody tab: Clementine', songbook: { song: 'clementine', part: 'melody' } }, minutes: 6 },
        ] },
        { day: 'Day 3', focus: 'Chord boxes', tasks: [
          { label: 'Name that chord shape', quiz: 'ch-name', minutes: 5 },
        ] },
        { day: 'Day 4', focus: 'Symbols in action', tasks: [
          { label: 'Hammer-ons and pull-offs (read the h and p)', ex: { label: 'Hammer-ons and pull-offs', drill: 'legato' }, minutes: 5 },
          { label: 'Slides (read the / and \\)', ex: { label: 'Slides', drill: 'slides' }, minutes: 4 },
        ] },
        { day: 'Day 5', focus: 'A real song', tasks: [
          { label: 'Chords and words: Red River Valley (read the chord boxes)', ex: { label: 'Red River Valley', songbook: { song: 'redriver', part: 'words' } }, minutes: 6 },
        ] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['Add a song from a tab site, a PDF book page or a screenshot: you now know how to check the tab is right before you learn it.', 'Your books are full of tab and chord boxes: try a page with Read this page\'s tab into Play.', 'When a tab looks wrong, check the tuning line and whether the top line is the high e.'] },
      ],
      tasks: [
        { label: 'Read a melody tab: Clementine', ex: { label: 'Read a melody tab: Clementine', songbook: { song: 'clementine', part: 'melody' } } },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Reading tab and chord boxes', quiz: 'l1-read' },
        { skill: 'Hear', label: 'Higher, lower or the same?', quiz: 'l1-pitch' },
        { skill: 'Play', label: 'Name that chord shape', quiz: 'ch-name' },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Reading tab, chord boxes and neck diagrams". Quiz me as my teacher: ask me (1) which tab line is which string and what stacked numbers mean, (2) what h, p, /, b and x mean, (3) how a chord box is laid out and what its numbers mean, (4) how a neck diagram differs from a chord box. One question at a time; tell me what I got right and missed; keep it short.',
        points: ['Top tab line = high e; numbers = frets; stacked = together', 'h hammer, p pull-off, / slide, b bend, x muted', 'Chord box: strings vertical, low E left, numbers = fingers, o open, x not played', 'Neck diagram: the neck on its side, low E at the bottom'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'pQC3JsbgaTw', title: 'Learn How To Read TAB in 5 Minutes' },
      books: [
        { book: 'Music Theory for Guitarists', where: 'Chapter 2: The Basics', why: 'Tab and standard notation side by side (the optional notation track builds on it).' },
        { book: 'Teach Yourself Bluegrass Guitar', where: 'The opening chapter on tab', why: 'Tab with rhythm, the way bluegrass books write it.' },
      ],
      blocks: [{ p: '**More**: every tab symbol with a demo: "Every Guitar Tab Symbol Explained (with Demos!)" (Learn → Technique uses it too).' }],
    },
  ],
}

export const RHYTHM1: CourseLesson = {
  id: 'c1-rhythm', level: 1, n: 6, title: 'Rhythm 1: the beat, quarters and eighths', minutes: 30,
  goal: 'Feel and count a steady beat, play quarter and eighth notes in time, and strum down on the beats and up on the "ands".',
  topics: ['rhythm'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Listeners forgive a wrong note; they don\'t forgive bad time. Rhythm is half of music, and it\'s the half most self-taught players skip. Every level of this course has a rhythm lesson so it grows with everything else.' },
        { p: 'Good news: rhythm is a skill like any other. A steady beat, counting out loud, and a strumming hand that never stops: that\'s the whole foundation.' },
        { rhythm: { label: 'A steady beat: four quarter notes', beats: [1, 1, 1, 1], bpm: 80 } },
      ],
    },
    {
      kind: 'learn', title: 'The beat and the tempo', blocks: [
        { p: 'The **beat** (or pulse) is what you tap your foot to. The **tempo** is how fast it goes, in **beats per minute (BPM)**: 60 BPM is one beat a second, 120 is two.' },
        { p: 'Beats are grouped into **bars** (measures). Most songs have **4 beats in a bar** (written **4/4**): count **1 2 3 4, 1 2 3 4**. Beat 1 is the strongest; you\'ll feel the music "land" on it.' },
        { tip: 'Tap your foot and count out loud. It feels silly; it\'s also exactly what every great rhythm player did to get there.' },
      ],
    },
    {
      kind: 'learn', title: 'Quarter notes: one per beat', blocks: [
        { p: 'A **quarter note** lasts **one beat**. Four quarter notes fill a bar of 4/4: "1 2 3 4". Strum down once on every beat.' },
        { rhythm: { label: 'Quarter notes: 1 2 3 4', beats: [1, 1, 1, 1], bpm: 80 } },
        { p: 'A **half note** lasts two beats ("1 2"), a **whole note** four ("1 2 3 4"). Same idea, longer.' },
        { rhythm: { label: 'Half, half', beats: [2, 2], bpm: 80 } },
      ],
    },
    {
      kind: 'learn', title: 'Eighth notes: "1 &"', blocks: [
        { p: 'Split every beat in two and you get **eighth notes**: two per beat. Count them **"1 & 2 & 3 & 4 &"**: the numbers on the beats, the "&" (and) exactly halfway between.' },
        { rhythm: { label: 'Eighth notes: 1 & 2 & 3 & 4 &', beats: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], bpm: 80 } },
        { p: 'The guitarist\'s secret: keep your strumming hand moving **down on the numbers, up on the "&"**, always, like a pendulum. Even when you don\'t hit the strings, the hand keeps swinging. That\'s what makes strumming steady.' },
        { rhythm: { label: 'Mix: quarter, quarter, 1 & , 1 &', beats: [1, 1, 0.5, 0.5, 0.5, 0.5], bpm: 80 } },
      ],
    },
    {
      kind: 'learn', title: 'Rests: the silence counts too', blocks: [
        { p: 'A **rest** is a beat (or half beat) of silence, and it\'s counted just like a note. In strumming, you keep the hand moving and simply miss the strings.' },
        { rhythm: { label: 'Note, rest, note, rest (count all four)', beats: [1, -1, 1, -1], bpm: 80 } },
        { p: 'A famous strum built this way: **down, down-up, (miss) up, down-up**: "1, 2 &, (3) &, 4 &". Your hand never stops; the gap on 3 is what makes it groove.' },
      ],
    },
    {
      kind: 'learn', title: 'Practising with a click', blocks: [
        { p: 'A **metronome** (Tools → Tempo) clicks the beat so you can\'t drift. Start **slower than you think** (60–70 BPM), play until it feels easy, then go up 5 BPM. Slow and steady is how speed is built.' },
        { p: 'Try putting the click on beats 2 and 4 only (like a snare drum): it forces you to feel 1 and 3 yourself.' },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Count each out loud and clap it before you check.', examples: [
        { q: 'At 60 BPM, how long is a quarter note? An eighth note?', steps: ['60 beats a minute = one beat every second.', 'A quarter note is one beat: 1 second.', 'An eighth is half a beat: half a second.'], answer: 'One second and half a second.' },
        { q: 'Fill a bar of 4/4: two quarter notes and then eighths. How many eighths?', steps: ['Two quarters use 2 beats.', '2 beats are left; each beat holds two eighths.'], answer: 'Four eighth notes: "1 2 3 & 4 &".' },
        { q: 'Which strums are up and which are down in "1 & 2 & 3 & 4 &" if you play only on 1, 2 &, & of 3, and 4 &?', steps: ['Numbers are down, "&"s are up.', '1 down · 2 down, & up · (3 missed), & up · 4 down, & up.'], answer: 'D, D U, (miss) U, D U.' },
        { q: 'A song is in 3/4. How do you count it, and which beat is strongest?', steps: ['3 beats in a bar: count 1 2 3, 1 2 3.', 'Beat 1 is the strongest: OOM-pah-pah, a waltz.'], answer: '"1 2 3", with the weight on 1.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Rhythm ear training is **hear it, then play it back**: the Rhythm trainer plays a pattern, you tap it back and it shows how close you were. Start with quarters and eighths only.' },
        { list: ['Put on any song and tap the beat; then count "1 2 3 4" and find where beat 1 lands (usually where the chord changes).', 'Clap eighth notes against the song: "1 & 2 &".'] },
      ],
      drills: [
        { label: 'Rhythm trainer: hear it, tap it back', tool: 'rhythm', minutes: 5, goal: 'Most taps within the green' },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Stopping the strumming hand on rests.', right: 'Keep the pendulum going and just miss the strings.' },
        { wrong: 'Speeding up in the easy bits and slowing down in the hard ones.', right: 'Practise with the click at a tempo where the hard part is comfortable.' },
        { wrong: 'Counting in your head only.', right: 'Count out loud. It feels silly and it works.' },
        { wrong: 'Starting too fast.', right: 'Begin at 60–70 BPM, add 5 only when it feels easy.' },
      ],
    },
    {
      kind: 'practice', title: 'Your practice week', intro: 'Use the metronome (Tools → Tempo) every day.',
      days: [
        { day: 'Day 1', focus: 'Quarter notes', tasks: [
          { label: 'Counting: quarter notes and eighths (count out loud)', ex: { label: 'Counting 1 & 2 &', tab: 'counting' }, minutes: 5 },
        ] },
        { day: 'Day 2', focus: 'Eighths and the pendulum', tasks: [
          { label: 'Rhythm trainer', tool: 'rhythm', minutes: 5 },
        ] },
        { day: 'Day 3', focus: 'Note lengths', tasks: [
          { label: 'Whole, half, quarter and eighth notes', ex: { label: 'Note lengths', tab: 'durations' }, minutes: 5 },
        ] },
        { day: 'Day 4', focus: 'Three in a bar', tasks: [
          { label: 'Waltz time: Down in the Valley', ex: { label: 'Down in the Valley', songbook: { song: 'valley', part: 'words' } }, minutes: 6 },
        ] },
        { day: 'Day 5', focus: 'Keep time with a band', tasks: [
          { label: 'Strum quarters, then eighths, over a band in Jam', tool: 'jam', minutes: 6 },
        ] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['In Play, switch to **In time**: the tab scrolls with the beat and tells you early, late or perfect.', 'Count "1 & 2 &" over every new song before you play it.', 'Strum a song you know with the pendulum: down on numbers, up on "&".'] },
      ],
      tasks: [
        { label: 'Strum along: Red River Valley', ex: { label: 'Red River Valley', songbook: { song: 'redriver', part: 'words' } } },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Play it with the click, hear it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Counting: play the counting tab In time', ex: { label: 'Counting 1 & 2 &', tab: 'counting' } },
        { skill: 'Hear', label: 'Rhythm trainer', tool: 'rhythm' },
        { skill: 'Play', label: 'Down in the Valley in waltz time', ex: { label: 'Down in the Valley', songbook: { song: 'valley', part: 'words' } } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Rhythm 1: the beat, quarters and eighths". Quiz me as my teacher: ask me (1) what beat, tempo and a bar of 4/4 are, (2) how long quarter, half and eighth notes are and how I count eighths, (3) which way my hand goes on numbers and on "&", (4) how to practise with a metronome. One question at a time; tell me what I got right and missed; keep it short.',
        points: ['Beat = pulse, tempo = BPM, 4/4 = four beats a bar', 'Quarter 1 beat, half 2, eighth half a beat: "1 & 2 &"', 'Down on numbers, up on "&", the hand never stops', 'Start slow (60–70), +5 BPM when easy'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'SxNh6gKD3aU', title: 'How To Count Rhythm on Guitar for Beginners' },
      books: [
        { book: 'Music Theory for Guitarists', where: 'Chapter 2: The Basics', why: 'Note values, rests and time signatures.' },
        { book: 'Flatpicking Essentials Volume 1', where: 'The rhythm chapters', why: 'Bluegrass boom-chuck: the steadiest strumming hand there is.' },
      ],
      blocks: [{ p: '**More**: "Guitar Rhythm Theory: Rests, Whole, Half, Quarter and Eighth Notes" goes through every note value with examples.' }],
    },
  ],
}

export const TUNING: CourseLesson = {
  id: 'c1-tuning', level: 1, n: 7, title: 'How the strings are tuned (and tuning by ear)', minutes: 30,
  goal: 'Know why the guitar is tuned E A D G B E, tune it by ear with the 5th-fret method, and hear when two strings are in or out of tune.',
  builds: ['tones and semitones', 'octave shapes'], topics: ['open-tunings', 'ear'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Everything you\'ve learned in this level comes from one fact: **the strings are a 4th apart, except G to B, a major 3rd**. That\'s why the octave shapes change at the B string, why the same fret on the next string is 5 semitones higher, and why chord shapes look the way they do.' },
        { p: 'Tuning by ear also trains your ear like nothing else: you learn to hear tiny differences in pitch. And it gets you out of trouble when there\'s no tuner.' },
      ],
    },
    {
      kind: 'learn', title: 'Fourths, and one third', blocks: [
        { p: 'From one string to the next: E→A, A→D, D→G and B→E are each **5 semitones** (a perfect 4th). **G→B** is **4 semitones** (a major 3rd).' },
        { p: 'Add them up: 5 + 5 + 5 + 4 + 5 = **24 semitones**: two octaves. That\'s why the two E strings are exactly two octaves apart.' },
        { p: 'Why the odd one out? With every string a 4th apart, the top string would be F, not E, and the common chord shapes wouldn\'t fit four fingers. The single 3rd between G and B makes the open chords and scales fall comfortably under the hand.' },
        { prog: { label: 'Each pair of neighbouring strings: 4th, 4th, 4th, 3rd, 4th', chords: [[40, 45], [45, 50], [50, 55], [55, 59], [59, 64]], gap: 0.8 } },
      ],
    },
    {
      kind: 'learn', title: 'The 5th-fret method', blocks: [
        { p: 'Because each string is 5 semitones above the one below, **fret 5 of a string = the next string open**. Except on the G string, where **fret 4** matches the open B. So you can tune every string to the one below it:' },
        { spots: { caption: 'Tuning by ear: each dot sounds the same as the next string open (fret 4 on the G string).', to: 6, marks: midis => (midis.length >= 6 ? [{ s: 0, f: 5, label: 'A', role: 'root' as const }, { s: 1, f: 0, label: 'A', role: 'target' as const }, { s: 1, f: 5, label: 'D', role: 'root' as const }, { s: 2, f: 0, label: 'D', role: 'target' as const }, { s: 2, f: 5, label: 'G', role: 'root' as const }, { s: 3, f: 0, label: 'G', role: 'target' as const }, { s: 3, f: 4, label: 'B', role: 'root' as const }, { s: 4, f: 0, label: 'B', role: 'target' as const }, { s: 4, f: 5, label: 'E', role: 'root' as const }, { s: 5, f: 0, label: 'E', role: 'target' as const }] : []) } },
        { list: ['Get the low E right first (a tuner, a piano, another guitar).', 'Low E fret 5 → tune the open A to match.', 'A fret 5 → open D. D fret 5 → open G.', 'G fret **4** → open B.', 'B fret 5 → open high e.'] },
        { tip: 'Always tune **up** to a note: if a string is sharp, go below the note and come back up. The string holds its pitch better.' },
      ],
    },
    {
      kind: 'learn', title: 'Hearing "in tune": the wobble', blocks: [
        { p: 'Play two strings that should match (low E fret 5 and the open A). If they\'re slightly apart you hear a **wobble**, a slow "wah-wah-wah": the two sound waves drift in and out of step. These are called **beats**.' },
        { p: 'The **closer** the strings, the **slower** the wobble. Turn the tuning peg slowly: the wobble slows down, stops when they match, and speeds up again if you go past. Tuning by ear is just chasing the wobble to a stop.' },
        { p: 'You can also check with **harmonics**: touch the low E lightly over the 5th fret and the A over the 7th fret: both ring the same E, and the bell-like tones make the wobble very easy to hear.' },
      ],
    },
    {
      kind: 'learn', title: 'Other tunings (a preview)', blocks: [
        { p: 'Change one or more strings and you get an **alternate tuning**. **Drop D** lowers the low E to D (power chords become one finger). **Open G** (D G D G B D, the slack-key "taro patch") makes a G chord on the open strings. **DADGAD** is the Celtic favourite.' },
        { p: 'Everything in this level still works in another tuning, but the shapes move: KGuitar\'s pictures and quizzes follow whatever tuning you pick, and the Tuner explains each one.' },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Do each on the guitar.', examples: [
        { q: 'Which fret on the D string should sound the same as the open G?', steps: ['D to G is a 4th: 5 semitones.', 'So fret 5 of the D string = open G.'], answer: 'Fret 5.' },
        { q: 'Which fret on the G string matches the open B? Why not 5?', steps: ['G to B is a major 3rd: only 4 semitones.', 'So fret 4 matches; fret 5 would be C.'], answer: 'Fret 4, because G–B is a 3rd, not a 4th.' },
        { q: 'The wobble between your fret-5 E and the open A speeds up as you tighten the A. What\'s happening?', steps: ['Faster wobble = further apart.', 'Tightening raises the A, so it was already sharp (or you went past).', 'Loosen below the note, then come back up slowly until the wobble stops.'], answer: 'The A is sharp: loosen it, then tune back up.' },
        { q: 'In drop D, where is the A that matches the open A string?', steps: ['The low string is now D, 2 semitones lower than E.', 'D to A is 7 semitones (a 5th), so fret 7 matches the open A.'], answer: 'Fret 7 of the low D string.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'This is the most practical ear training there is: hearing whether two notes are **exactly** the same. The drill plays the same note on two strings, sometimes perfectly in tune, sometimes a little out: listen for the wobble.' },
        { list: ['Detune your A string a little, then tune it back by ear with the 5th-fret method. Check with the tuner.', 'Play the harmonics at fret 5 (low E) and 7 (A) together and listen to the wobble disappear as you tune.'] },
      ],
      drills: [
        { label: 'In tune or out of tune? (ear)', quiz: 'l1-tune-ear', minutes: 3, goal: '9 out of 10' },
        { label: 'Tune by ear, then check on the tuner', tool: 'tuner', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Using fret 5 on the G string to tune the B.', right: 'G to B is a 3rd: use fret 4.' },
        { wrong: 'Tuning down to a note.', right: 'Tune up to it; the string stays put better.' },
        { wrong: 'Listening only to "higher or lower" when the notes are close.', right: 'Listen for the wobble: slow wobble = nearly there, no wobble = in tune.' },
        { wrong: 'Tuning each string to the one below and never checking the whole guitar.', right: 'Finish with a chord (G or E): small errors add up across five strings.' },
      ],
    },
    {
      kind: 'practice', title: 'Your practice week', intro: 'Tune by ear every day before you play; check with the tuner afterwards.',
      days: [
        { day: 'Day 1', focus: 'The 5th-fret method', tasks: [
          { label: 'Tune by ear, then check on the tuner', tool: 'tuner', minutes: 5 },
        ] },
        { day: 'Day 2', focus: 'The wobble', tasks: [
          { label: 'In tune or out of tune? (ear)', quiz: 'l1-tune-ear', minutes: 4 },
        ] },
        { day: 'Day 3', focus: 'Octaves to check', tasks: [
          { label: 'Octave pairs: they should sound perfectly smooth', ex: { label: 'Octave pairs up the neck', tab: 'octaveDyads' }, minutes: 5 },
        ] },
        { day: 'Day 4', focus: 'The whole guitar', tasks: [
          { label: 'One note on every string (unisons and octaves must blend)', ex: { label: 'One note on every string', tab: 'octaveWalk' }, minutes: 5 },
        ] },
        { day: 'Day 5', focus: 'Level 1 review', tasks: [
          { label: 'Natural notes everywhere', quiz: 'fb-all-nat', minutes: 6 },
        ] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['Tune by ear when you play with others: match their A, then tune the rest to it.', 'In a song with a capo or a new tuning, the 5th-fret relationships tell you where notes moved.', 'Hearing the wobble is how you\'ll later tune bends and double stops perfectly.'] },
      ],
      tasks: [
        { label: 'Tuner: try Drop D and open G, and read how they work', tool: 'tuner' },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Octave shapes on every string pair', quiz: 'oc-move' },
        { skill: 'Hear', label: 'In tune or out of tune?', quiz: 'l1-tune-ear' },
        { skill: 'Play', label: 'Tune by ear, check on the tuner', tool: 'tuner' },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "How the strings are tuned (and tuning by ear)". Quiz me as my teacher: ask me (1) the intervals between the strings and why the two Es are two octaves apart, (2) the 5th-fret tuning method and the exception, (3) what the "wobble" is and how I use it, (4) what drop D changes. One question at a time; tell me what I got right and missed; keep it short.',
        points: ['4ths (5 semitones) except G–B, a 3rd (4); 5+5+5+4+5 = 24 = two octaves', 'Fret 5 = next string open; fret 4 on the G string', 'Beats: the slower the wobble, the closer; none = in tune', 'Drop D: low E down a tone to D; fret 7 then matches the open A'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'sDgGwT1DuME', title: 'How to Tune a Guitar - 5th/4th Fret EASY Method to Tune by Ear | Standard Tuning' },
      books: [
        { book: 'Music Theory for Guitarists', where: 'Chapter 1: The Fretboard', why: 'Tuning by ear with the 5th-fret method and with harmonics.' },
        { book: 'Keola Beamer\'s First Method for Hawaiian Slack Key Guitar', where: 'The tuning chapter', why: 'Taro patch (open G) and how slack key tunings are made.' },
        { book: 'Celtic Guitar Encyclopedia', where: 'The DADGAD chapter', why: 'The Celtic tuning and why it suits the music.' },
      ],
      blocks: [{ p: '**Extra credit**: the wobble rate is the difference between the two frequencies. A at 110 Hz against 111 Hz wobbles once a second; against 112 Hz, twice. Tuners just measure what your ear is hearing.' }],
    },
  ],
}

export const LEVEL1_CHECK: CourseLesson = {
  id: 'c1-check', level: 1, n: 8, title: 'Level 1 mastery check', minutes: 20,
  goal: 'Show that the neck is yours: every note on every string, found fast, heard and played.',
  builds: ['all of Level 1'], topics: ['fretboard-notes', 'rhythm', 'ear'],
  steps: [
    {
      kind: 'why', title: 'Before Level 2', blocks: [
        { p: 'This check covers all of Level 1. It\'s **strongly suggested** before Level 2 (scales, chords and keys build directly on the notes of the neck), but never required: you can move on and come back.' },
        { list: ['Take it when the practice weeks feel easy.', 'Anything you miss sends you back to the right lesson.', 'Pass it and the Level 1 badge is yours; it also comes back as a review later so the neck stays yours.'] },
      ],
    },
    {
      kind: 'check', title: 'The check', intro: 'Six parts: two each of using it, hearing it and playing it, then explain the level back to the teacher.',
      tasks: [
        { skill: 'Apply', label: 'Sharps and flats on the two lowest strings', quiz: 'fb-low-all' },
        { skill: 'Apply', label: 'Octave shapes on every string pair', quiz: 'oc-move' },
        { skill: 'Hear', label: 'Semitone or tone?', quiz: 'l1-step-ear' },
        { skill: 'Hear', label: 'Octave or not?', quiz: 'oc-hear' },
        { skill: 'Play', label: 'Natural notes everywhere (mic)', quiz: 'fb-all-nat', how: 'play' },
        { skill: 'Play', label: 'Read and play: Clementine', ex: { label: 'Read a melody tab: Clementine', songbook: { song: 'clementine', part: 'melody' } } },
      ],
      explain: {
        prompt: 'I just took the KGuitar Level 1 mastery check (Notes on the neck: strings and alphabet, tones/semitones/sharps/flats, notes on the low E and A strings, octave shapes, reading tab and chord boxes, rhythm 1, how the strings are tuned). Be my teacher for a short oral exam: ask me five questions across these topics, one at a time, including "how would you find a C# on the B string?", tell me what I got right and missed, and finish with which lesson to review if anything was shaky.',
        points: ['Strings, alphabet, the E–F and B–C semitones', 'Landmarks on the root strings', 'The octave shapes and the B-string shift', 'Tab and chord boxes', 'Counting quarters and eighths', 'Why the strings are tuned 4ths with one 3rd'],
      },
    },
  ],
}

export const LEVEL1: CourseLesson[] = [STRINGS_ALPHABET, STEPS_SHARPS, LANDMARKS, OCTAVE_SHAPES, READING, RHYTHM1, TUNING, LEVEL1_CHECK]
