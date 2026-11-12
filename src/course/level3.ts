// Theory course, Level 3: Progressions, pentatonics and minor keys (No Bull chapters 9–12 as the spine, so the end of
// Level 3 = all of No Bull; Kolb, the Practical Guide, the CAGED blues book and Improvise for Real for depth). Our own
// words; the books are pointed to, never copied.
import type { CourseLesson } from './types'
import { nm, type Spot } from './level1'

const G6 = (midis: number[]) => midis.length >= 6 && midis[1] - midis[0] === 5 && midis[2] - midis[1] === 5 && midis[3] - midis[2] === 5 && midis[4] - midis[3] === 4
/** A scale's notes between two frets on every string, labelled with its own degree names. */
function box(midis: number[], rootPc: number, semis: number[], labels: string[], from: number, to: number, names = false): Spot[] {
  const out: Spot[] = []
  midis.forEach((o, s) => {
    for (let f = from; f <= to; f++) {
      const iv = (((o + f - rootPc) % 12) + 12) % 12
      const k = semis.indexOf(iv)
      if (k >= 0) out.push({ s, f, label: names ? nm(o + f) : labels[k], role: k === 0 ? 'root' : 'scale' })
    }
  })
  return out
}
const MPENT = [0, 3, 5, 7, 10], MPENT_L = ['1', '♭3', '4', '5', '♭7']
const BLUES = [0, 3, 5, 6, 7, 10], BLUES_L = ['1', '♭3', '4', '♭5', '5', '♭7']
const PENT = [0, 2, 4, 7, 9], PENT_L = ['1', '2', '3', '5', '6']
const NAT = [0, 2, 3, 5, 7, 8, 10], NAT_L = ['1', '2', '♭3', '4', '5', '♭6', '♭7']

export const PROGRESSIONS: CourseLesson = {
  id: 'c3-progressions', level: 3, n: 1, title: 'Chord progressions as numbers', minutes: 40,
  goal: 'Hear and name the jobs chords do (home, away, tension), read and write number charts, and play, change and write progressions in any key.',
  builds: ['building the chords of any key', 'keys'], topics: ['progressions', 'keys', 'ear'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Level 2 gave you the seven chords of a key. This lesson is about **how songs move through them**. Progressions aren\'t random: chords have jobs, and the same few moves come up again and again across centuries of music.' },
        { p: 'Think in numbers and a song stops being a list of chord names to memorise: it becomes a shape you can recognise, play in any key, learn by ear, and borrow for your own songs.' },
        { prog: { label: 'The same shape in two keys: I – vi – IV – V in C, then in G', chords: [[48, 55, 60, 64], [45, 52, 57, 60], [53, 57, 60, 65], [55, 59, 62, 67], [43, 50, 55, 59], [40, 47, 52, 55], [48, 55, 60, 64], [50, 57, 62, 66]], gap: 0.8 } },
      ],
    },
    {
      kind: 'learn', title: 'Chords have jobs: home, away, tension', blocks: [
        { p: 'Every chord in a key does one of three jobs (musicians call them **functions**):' },
        { list: ['**Home (tonic)**: **I**, and its look-alikes **vi** and **iii** (they share two notes with I). Rest, stability.', '**Away (subdominant)**: **IV** and **ii**. Movement, a lift, "leaving the house".', '**Tension (dominant)**: **V** and **vii°**. They lean hard back towards home.'] },
        { p: 'Most progressions tell a little story: **home → away → tension → home**. I – IV – V – I is the plainest version; ii – V – I and I – vi – ii – V do the same with different colours.' },
        { prog: { label: 'Home, away, tension, home: I – IV – V – I in G', chords: [[43, 50, 55, 59], [48, 55, 60, 64], [50, 57, 62, 66], [43, 50, 55, 59]], gap: 1 } },
        { tip: 'Two chords with the same job can usually swap: ii for IV (Am for C in G), vi for I. It changes the colour, not the story.' },
      ],
    },
    {
      kind: 'learn', title: 'How roots like to move', blocks: [
        { p: 'Look at the distance the **root** moves from one chord to the next:' },
        { list: ['**Down a 5th (up a 4th)**: the strongest move. V → I, ii → V, vi → ii. Chains of these (vi – ii – V – I) sound like they\'re going somewhere.', '**By a step**: IV → V, V → vi. Smooth and driving.', '**By a 3rd**: I → vi, IV → ii. A gentle shift between relatives (two shared notes).'] },
        { prog: { label: 'A chain of 5ths: Em – Am – D – G (vi – ii – V – I in G)', chords: [[40, 47, 52, 55], [45, 52, 57, 60], [50, 57, 62, 66], [43, 50, 55, 59]], gap: 1 } },
        { p: 'Chords also change at a rate, the **harmonic rhythm**: usually once or twice a bar, landing on beat 1 (or pushed onto the & of 4, from Rhythm 2). Faster changes add energy; slow ones give a melody room.' },
      ],
    },
    {
      kind: 'learn', title: 'Number charts', blocks: [
        { p: 'Session players write songs as **number charts** (the Nashville number system): one number per bar, a minus or "m" for minor, and the key at the top. A verse might be:' },
        { p: '**Key of G: 1 | 1 | 4 | 1 | 5 | 4 | 1 | 1**' },
        { p: 'Play it in G (G G C G D C G G) or move the whole chart to any key the singer needs: the chart doesn\'t change. Two chords in one bar are written together, often underlined: **4 5** = half a bar each.' },
        { list: ['**1 5 6m 4**: the pop four', '**6m 4 1 5**: the same four starting on the minor', '**1 6m 4 5**: the 50s doo-wop shape', '**2m 5 1**: the jazz cadence', '**1 4 1 5**: folk and country'] },
      ],
    },
    {
      kind: 'learn', title: 'Writing your own', blocks: [
        { p: 'A simple recipe that always works: pick a key, start on **1**, go **away** (4 or 2m), build **tension** (5), and come **home**. Then make it yours:' },
        { list: ['Swap a chord for one with the same job (4 → 2m, 1 → 6m).', 'Start somewhere other than 1 (6m 4 1 5 starts sad).', 'Change the harmonic rhythm: two bars on 1, half a bar on 4 and 5.', 'End a section on 5 to leave a question, and the next section on 1 to answer it.'] },
        { p: 'On the neck, think in the **CAGED box** from Level 2: 1 at an E-shape barre, 4 and 5 as A-shape barres at the same fret and two frets up, the minors next door. Every key, same hand moves.' },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Name the numbers first, then the chords.', examples: [
        { q: 'A song in D goes D – A – Bm – G. What are the numbers?', steps: ['D major chords: D Em F#m G A Bm C#°.', 'D = 1, A = 5, Bm = 6m, G = 4.'], answer: '1 – 5 – 6m – 4: the pop four.' },
        { q: 'Play the chart 1 | 6m | 4 | 5 in A.', steps: ['A major chords: A Bm C#m D E F#m G#°.', '1 = A, 6m = F#m, 4 = D, 5 = E.'], answer: 'A | F#m | D | E.' },
        { q: 'What job does ii do, and what can it replace?', steps: ['ii shares two notes with IV (in C: Dm = D F A, F = F A C).', 'Both are "away" chords.'], answer: 'Away (subdominant): it can stand in for IV.' },
        { q: 'Write vi – ii – V – I in C. Why does it pull so strongly?', steps: ['C major: vi = Am, ii = Dm, V = G, I = C.', 'Each root falls a 5th: A → D → G → C.'], answer: 'Am – Dm – G – C: a chain of the strongest root move.' },
        { q: 'Move the chart 1 4 5 1 from G to E for a singer.', steps: ['Numbers stay the same.', 'E major: 1 = E, 4 = A, 5 = B.'], answer: 'E A B E.' },
        { q: 'A song in G uses G, C, D and Am. Which chord could you swap in for C in one place?', steps: ['C is IV (away).', 'The other away chord is ii = Am.'], answer: 'Am (ii): same job, softer colour.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Hearing progressions as numbers is the skill that lets players learn songs fast. Start from what you know: is the first chord home? Where does the minor chord come? Does the last change lean back home (5 → 1)?' },
        { list: ['Play the four common shapes in one key and sing the bass note of each chord.', 'With a song you like: find home, then guess 1 4 5 6m and check.'] },
      ],
      drills: [
        { label: 'Which progression? (ear)', quiz: 'l3-prog-ear', minutes: 5, goal: '8 out of 10' },
        { label: 'Which chord of the key? (ear)', quiz: 'l2-num-ear', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Learning progressions as chord names in one key.', right: 'Learn the numbers; the chords follow in any key.' },
        { wrong: 'Thinking every song must start on I.', right: 'Many start on vi or IV; home is where it rests, not where it starts.' },
        { wrong: 'Changing chords late because you wait for the bar line.', right: 'Move the fretting hand during the last strum of the bar.' },
        { wrong: 'Swapping chords with different jobs and wondering why the story breaks.', right: 'Swap within a job: ii ↔ IV, vi ↔ I, vii° ↔ V.' },
        { wrong: 'Writing charts without the key.', right: 'Numbers mean nothing until the key is written at the top.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Say the numbers out loud as you play.',
      challenge: { label: 'Write a verse and chorus in Jam, then play them in a second key', tool: 'jam', goal: 'both keys, no chord sheet', why: 'If you can move your own song, you think in numbers.' },
      goals: [
        { focus: 'Numbers', tasks: [{ label: 'Progressions in any key quiz', quiz: 'nb-prog', minutes: 5 }] },
        { focus: 'Hear them', tasks: [{ label: 'Which progression? (ear)', quiz: 'l3-prog-ear', minutes: 5 }] },
        { focus: 'I IV V', tasks: [{ label: 'Oh! Susanna: 1 4 5 in C', ex: { label: 'Oh! Susanna', songbook: { song: 'susanna', part: 'words' } }, minutes: 6 }] },
        { focus: 'Smooth changes', tasks: [{ label: 'One-minute changes: G to Em, C to D', tool: 'changes', minutes: 5 }] },
        { focus: 'Same song, new key', tasks: [{ label: 'Keep on the Sunny Side (G): play it, then capo 2 and say the numbers', ex: { label: 'Keep on the Sunny Side', songbook: { song: 'sunny', part: 'words' } }, minutes: 6 }] },
        { focus: 'Functions', tasks: [{ label: 'Chords in a key (circle quiz)', quiz: 'cof-chords', minutes: 5 }] },
        { focus: 'Write one', tasks: [{ label: 'Write a verse and chorus in Jam: verse ends on 5, chorus ends on 1', tool: 'jam', minutes: 10 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['Learning a song: write its number chart once, and you\'ll remember it in every key.', 'Jamming: "it\'s 1 5 6 4 in E" is all you need to join in.', 'Soloing: on a 5 chord, aim for its 3rd (the scale\'s 7th) and resolve up to the root when 1 arrives.'] },
      ],
      tasks: [{ label: 'Build a progression in Jam', tool: 'jam' }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Progressions in any key quiz', quiz: 'nb-prog' },
        { skill: 'Hear', label: 'Which progression? (ear)', quiz: 'l3-prog-ear' },
        { skill: 'Play', label: 'Oh! Susanna, 1 4 5 (mic, strum along)', ex: { label: 'Oh! Susanna', songbook: { song: 'susanna', part: 'words' } } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Chord progressions as numbers". Quiz me as my teacher: ask me (1) the three jobs chords do and which chords do each, (2) which root movement is strongest and why vi – ii – V – I pulls, (3) how to play the chart 1 | 6m | 4 | 5 in A, (4) how I would write a verse that ends with a question and a chorus that answers it. One question at a time; tell me what I got right and missed; keep it short.',
        points: ['Home I vi iii; away IV ii; tension V vii°', 'Down a 5th is strongest; vi ii V I is a chain of them', 'A F#m D E', 'End on 5 for a question, 1 for the answer'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'XSxRutxNoRs', title: 'Start Writing Songs and Progressions (the Number System)' },
      books: [
        { book: 'No Bull Music Theory for Guitarists', where: 'Chapter 9: Understanding Chord Progressions', why: 'Progressions by number, with exercises in every key.' },
        { book: 'Guitar Fretboard Mastery', where: 'Part 4: Chord progressions', why: 'Progressions on the neck, and playing them in any key.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'Part One: common chord progressions from the major scale', why: 'The standard progressions and how to transpose them.' },
        { book: 'Music Theory for Guitarists', where: 'Chapter 9: Determining Key Centers', why: 'Reading a progression to find its key and functions.' },
      ],
      blocks: [{ p: '**Extra credit**: some songs borrow a chord from outside the key, like a ♭VII (F in G major) for a rock lift. That\'s Level 7 (borrowed chords).' }],
    },
  ],
}

export const PULL: CourseLesson = {
  id: 'c3-pull', level: 3, n: 2, title: 'Hearing the key and the V → I pull', minutes: 35,
  goal: 'Find home by ear in any song, explain why V and V7 pull to I (the leading tone and the tritone), and hear how a phrase ends.',
  builds: ['keys', 'chord progressions as numbers', 'flat and sharp intervals'], topics: ['keys', 'ear', 'cadences'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Music feels like it moves because some sounds are **unstable** and want to settle. The strongest of these is the pull from the **V chord to I**. Understand it and you can hear where any song is heading, find its key without a chord sheet, and write endings that land (or deliberately don\'t).' },
        { prog: { label: 'G7 → C: tension, then release', chords: [[43, 47, 50, 55, 59, 65], [48, 52, 55, 60, 64]], gap: 1.2 } },
      ],
    },
    {
      kind: 'learn', title: 'Two notes that want to move', blocks: [
        { p: 'Inside the major scale, two notes lean hardest:' },
        { list: ['**7 → 1**: the **leading tone** is a semitone below home and pulls up into it (B → C in C major).', '**4 → 3**: the 4th sits a semitone above the 3rd and leans down onto it (F → E).'] },
        { p: 'Both moves are a single fret. Semitone steps are the strongest pulls in music, and the V7 chord holds both of those notes at once.' },
        { play: { label: '7 → 1 (B → C), then 4 → 3 (F → E)', seq: [59, 60, 65, 64], gap: 0.55 } },
      ],
    },
    {
      kind: 'learn', title: 'Inside V7: the tritone', blocks: [
        { p: 'Build the V chord in C: G B D. It already contains the leading tone **B**. Add the next 3rd from the key and you get **G7: G B D F**, the only dominant 7th chord in the key. Now it holds **both** pulling notes, B (7) and F (4).' },
        { p: 'B up to F is 6 frets: a **tritone**, the most unstable interval (Level 2). When G7 moves to C, the tritone collapses inwards: **B rises to C, F falls to E**. That\'s the click of a key coming home.' },
        { spots: { caption: 'Open G7 → open C: B (A string, fret 2) rises to C (fret 3); F (high e, fret 1) falls to E (open).', to: 4, marks: midis => (G6(midis) ? [{ s: 1, f: 2, label: 'B', role: 'target' as const }, { s: 1, f: 3, label: 'C', role: 'root' as const }, { s: 5, f: 1, label: 'F', role: 'target' as const }, { s: 5, f: 0, label: 'E', role: 'chord' as const }] : []) } },
        { tip: 'Every key has exactly one dominant 7th chord, on V. So when you hear a 7th chord in a song, it usually points straight at the home chord a 5th below.' },
      ],
    },
    {
      kind: 'learn', title: 'Four ways to end a phrase', blocks: [
        { p: 'How a phrase ends tells the listener "finished" or "more to come". Level 7 gives these their official names (cadences); for now, learn to hear them:' },
        { list: ['**Home: V → I**. Strong and final. Ends of verses and songs.', '**Amen: IV → I**. Softer, warm, a gentle landing (the end of hymns).', '**Left hanging: … → V**. A question; the music has to go on.', '**Surprise: V → vi**. You expect home and get its sad twin.'] },
        { prog: { label: 'Home: … V → I', chords: [[43, 50, 55, 59], [48, 55, 60, 64], [50, 57, 62, 66], [43, 50, 55, 59]], gap: 0.9 } },
        { prog: { label: 'Surprise: … V → vi', chords: [[43, 50, 55, 59], [48, 55, 60, 64], [50, 57, 62, 66], [40, 47, 52, 55]], gap: 0.9 } },
      ],
    },
    {
      kind: 'learn', title: 'Finding home by ear, step by step', blocks: [
        { list: ['**Hum** along until a note feels like it could end the song. That\'s your best guess for home.', '**Find it** on the guitar (low E or A string, your landmarks).', '**Test it**: play the I chord on that note over the song. Home sounds like it belongs everywhere; a wrong guess clashes somewhere.', '**Listen for V → I** at the ends of lines: the chord before the resolution is usually V (often V7).', '**Major or minor home?** If home sounds dark, it\'s a minor key (lessons 5 and 6).'] },
        { p: 'With practice, step 1 does almost all the work. It\'s the same skill as hearing the degrees over a drone: home is the drone.' },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Find V, then follow its pull.', examples: [
        { q: 'What is the V7 chord in A major, and its notes?', steps: ['A major: A B C# D E F# G#.', 'V = E; stack 3rds: E G# B D.'], answer: 'E7: E G# B D (G# is the leading tone, D the 4th).' },
        { q: 'In G7 → C, where do B and F go?', steps: ['B is 7 in C: it rises a semitone to C.', 'F is 4: it falls a semitone to E.'], answer: 'B → C and F → E.' },
        { q: 'What is the leading tone of D major?', steps: ['D major: D E F# G A B C#.', 'The 7th note: C#, a semitone below D.'], answer: 'C#.' },
        { q: 'A verse in G ends on D. Finished or not?', steps: ['D is V in G.', 'Stopping on V leaves the question open.'], answer: 'Not finished: "left hanging" on V, so the next section has to answer.' },
        { q: 'A song in C goes … F → G → Am at the end of a line. What happened?', steps: ['F = IV, G = V, Am = vi.', 'V went to vi instead of I.'], answer: 'A surprise ending (V → vi): the home chord was swapped for its relative.' },
        { q: 'You hear a B7 chord in a song. Which chord does it probably lead to?', steps: ['A dominant 7th is usually V.', 'B is the V of E (E F# G# A B…).'], answer: 'E (or Em): a 5th below B.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Two ear skills: hearing whether a phrase **lands home**, and hearing **how** it lands. Over a drone, play 7 → 1 and 4 → 3 and feel the pull. Then do the drills.' },
      ],
      drills: [
        { label: 'How does it end? (ear)', quiz: 'l3-cadence-ear', minutes: 5, goal: '8 out of 10' },
        { label: 'Home, or not home yet? (ear)', quiz: 'l2-home-ear', minutes: 3 },
        { label: 'Degrees over a drone: 7 → 1 and 4 → 3', tool: 'ear', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Thinking the key is the chord you hear most.', right: 'Home is where it rests; a song can spend ages on IV or V.' },
        { wrong: 'Calling any 7th chord "the I7".', right: 'In a major key a dominant 7th is usually V7, pointing a 5th down to home (blues is the exception: lesson 7).' },
        { wrong: 'Ending every phrase on I.', right: 'End some on V (a question) and save V → I for when you mean "finished".' },
        { wrong: 'Hearing only the top note.', right: 'Listen to the bass too: V → I is a strong 5th-down move in the bass.' },
        { wrong: 'Guessing home from the first chord only.', right: 'Hum, find, test with the I chord, and check the line endings.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Find home in one song each time you practise: hum it first, then check.',
      challenge: { label: 'Which progression? (ear), no mistakes', quiz: 'l3-prog-ear', goal: '10 out of 10', why: 'Hearing where every phrase goes, not just how it ends.' },
      goals: [
        { focus: 'The pull', tasks: [{ label: 'Degrees over a drone: 7 → 1, 4 → 3', tool: 'ear', minutes: 5 }] },
        { focus: 'V7', tasks: [{ label: 'G7 arpeggio (find B and F)', ex: { label: 'G7 arpeggio', spec: { kind: 'arpeggio', root: 'G', type: 'dom7', position: 0 } }, minutes: 5 }] },
        { focus: 'Endings', tasks: [{ label: 'How does it end? (ear)', quiz: 'l3-cadence-ear', minutes: 5 }] },
        { focus: 'V7 → I in a song', tasks: [{ label: 'Red River Valley: D7 → G at the line ends', ex: { label: 'Red River Valley', songbook: { song: 'redriver', part: 'words' } }, minutes: 6 }] },
        { focus: 'Neighbours', tasks: [{ label: 'IV and V: the neighbours', quiz: 'cof-neighbours', minutes: 5 }] },
        { focus: 'Find home', tasks: [{ label: 'Home, or not home yet? (ear)', quiz: 'l2-home-ear', minutes: 4 }] },
        { focus: 'Write endings', tasks: [{ label: 'In Jam: a 4-bar phrase ending on V, then one ending V → I', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['Solos: over V7, the 3rd of the chord (the key\'s 7th) resolving up to the root of I is the most satisfying move there is.', 'Songwriting: a verse that ends on V makes the chorus feel like an arrival.', 'Learning songs: hum home first; then the chord before each line ending is your V.'] },
      ],
      tasks: [{ label: 'How does it end? (ear)', quiz: 'l3-cadence-ear' }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'IV and V: the neighbours', quiz: 'cof-neighbours' },
        { skill: 'Hear', label: 'How does it end? (ear)', quiz: 'l3-cadence-ear' },
        { skill: 'Play', label: 'G7 arpeggio (mic)', ex: { label: 'G7 arpeggio', spec: { kind: 'arpeggio', root: 'G', type: 'dom7', position: 0 } } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Hearing the key and the V → I pull". Quiz me as my teacher: ask me (1) which two notes of the major scale pull hardest and where, (2) why V7 pulls to I (the tritone), (3) the four ways a phrase can end and how each feels, (4) my steps for finding home by ear. One question at a time; tell me what I got right and missed; keep it short.',
        points: ['7 → 1 and 4 → 3, both semitones', 'V7 holds 7 and 4, a tritone that collapses inwards', 'Home V–I, amen IV–I, hanging on V, surprise V–vi', 'Hum, find, test with I, check the line endings'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'EknaUvmYB4k', title: 'Musical Cadences: Explained!' },
      books: [
        { book: 'Improvise for Real', where: 'The magic key, and Exercise 2: Melody', why: 'Hearing every note against home: the ear skill under this lesson.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'Part One: harmonising the 7th degree of the major scale', why: 'Where the dominant 7th comes from.' },
        { book: 'Music Theory for Guitarists', where: 'Chapter 7: Chord Construction', why: 'Dominant 7th chords and their shapes.' },
        { book: 'No Bull Music Theory for Guitarists', where: 'Chapter 9: Understanding Chord Progressions', why: 'Why V leads back to I.' },
      ],
      blocks: [{ p: '**Extra credit**: you can borrow the pull for any chord. Put a dominant 7th a 5th above it (A7 → D in G major) and that chord becomes a temporary home. That\'s a secondary dominant, in Level 7.' }],
    },
  ],
}

export const MINOR_PENT: CourseLesson = {
  id: 'c3-minorpent', level: 3, n: 3, title: 'Minor pentatonic and the blues scale', minutes: 45,
  goal: 'Build the minor pentatonic and blues scales, play box 1 in any key, know which notes are the roots and the blue note, and make music with bends, slides and vibrato over a blues or minor groove.',
  builds: ['flat and sharp intervals', 'the notes on the low E and A strings'], topics: ['pentatonic', 'blues', 'soloing'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'If there\'s one scale every guitarist knows, it\'s the **minor pentatonic**. It\'s the sound of blues, rock, a huge amount of pop and country soloing, and countless riffs. It fits under the fingers in a box you can learn in a day and spend a lifetime getting good at.' },
        { p: 'This lesson gives you the box, the theory of why it works so well, and the **blue note** that turns it into the blues scale.' },
        { play: { label: 'A minor pentatonic, then the blues scale', seq: [45, 48, 50, 52, 55, 57, 45, 48, 50, 51, 52, 55, 57], gap: 0.3 } },
      ],
    },
    {
      kind: 'learn', title: 'Five notes: 1 ♭3 4 5 ♭7', blocks: [
        { p: '"Pentatonic" means **five notes**. The minor pentatonic is: **1, ♭3, 4, 5, ♭7**. In A: **A C D E G**.' },
        { p: 'Compare it with the natural minor scale (lesson 5): it\'s the same scale with the **2 and ♭6 left out**. Those are the two notes that sit a semitone from a neighbour, so what\'s left has **no semitone steps at all**. Nothing rubs; every note sounds fine against the others, and against most chords in a minor or blues song.' },
        { list: ['**1** home', '**♭3** the minor colour (and the note to bend in blues)', '**4** the note to bend up to the 5th', '**5** strong and stable', '**♭7** bluesy, wants to go up to the root'] },
      ],
    },
    {
      kind: 'learn', title: 'Box 1', blocks: [
        { p: 'The famous shape: **two notes on every string**, root on the low E. For A minor pentatonic it sits at **frets 5 to 8**:' },
        { spots: { caption: 'A minor pentatonic, box 1 (frets 5–8). Roots on the low E, D and high e strings.', from: 4, to: 8, marks: midis => box(midis, 9, MPENT, MPENT_L, 5, 8) } },
        { list: ['Index finger on fret 5 all the way across.', 'Fret 8 with the pinky on the low E, B and high e; fret 7 with the ring finger on A, D and G.', 'Roots (the key\'s name) on the **low E (5), D (7) and high e (5)** strings: start and end there.'] },
        { p: 'The box is **moveable**: put the index finger on the key\'s root on the low E. E minor pentatonic is at fret 12 (or open), G at 3, C at 8, D at 10.' },
        { tip: 'Learn the box as **degrees**, not just dots: knowing where the ♭3 and the 4 are is what lets you bend the right notes and land on the chord.' },
      ],
    },
    {
      kind: 'learn', title: 'The blues scale: one extra note', blocks: [
        { p: 'Add the **♭5** between the 4 and the 5 and you have the **blues scale**: **1 ♭3 4 ♭5 5 ♭7** (A C D E♭ E G). The ♭5 is the **blue note**: a passing note that adds grit. Slide through it, don\'t sit on it.' },
        { spots: { caption: 'A blues scale in box 1: the two blue notes (♭5) on the A string (fret 6) and the G string (fret 8).', from: 4, to: 8, marks: midis => box(midis, 9, BLUES, BLUES_L, 5, 8) } },
        { play: { label: 'A typical blues move: 4 → ♭5 → 5, then down to the root', seq: [50, 51, 52, 48, 45], gap: 0.3 } },
      ],
    },
    {
      kind: 'learn', title: 'Making it sound like music', blocks: [
        { p: 'A scale is just notes. Guitarists make the pentatonic sing with a few techniques (Learn → Technique has drills for each):' },
        { list: ['**Bend the 4 up a whole tone to the 5** (D → E on the G string, fret 7): the classic rock and blues bend.', '**Bend the ♭3 slightly sharp** (a quarter tone) for a crying, bluesy sound.', '**Bend the ♭7 up to the root** (G → A on the B string, fret 8).', '**Slide** into notes from a fret below; **vibrato** on long notes.', '**Leave space**: short phrases with gaps, like speaking.'] },
        { p: 'Over a minor song (Am, Dm, Em) the minor pentatonic of the key works everywhere. Over a **blues** in A (A7 D7 E7), A minor pentatonic works over all three chords: that slightly "wrong" ♭3 against the major chords is the blues sound itself.' },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Build, then place it on the neck.', examples: [
        { q: 'Spell E minor pentatonic.', steps: ['E natural minor: E F# G A B C D.', 'Leave out 2 (F#) and ♭6 (C).'], answer: 'E G A B D.' },
        { q: 'Where is box 1 for G minor pentatonic?', steps: ['G on the low E: fret 3.', 'Index finger on the root: frets 3–6.'], answer: 'Frets 3–6, root at fret 3 on the low E.', spots: { from: 2, to: 6, marks: midis => (G6(midis) ? box(midis, 7, MPENT, MPENT_L, 3, 6) : []) } },
        { q: 'Spell the A blues scale.', steps: ['A minor pentatonic: A C D E G.', 'Add the ♭5 of A: E♭.'], answer: 'A C D E♭ E G.' },
        { q: 'In A minor pentatonic box 1, which note do you bend up to reach the 5th?', steps: ['The 4th (D) is on the G string, fret 7.', 'Bend it up a whole tone (two frets) to sound E.'], answer: 'The D on the G string, fret 7, bent up to E.' },
        { q: 'Why does the pentatonic have no "wrong" notes against a minor groove?', steps: ['It leaves out 2 and ♭6.', 'Those are the notes that sit a semitone from another scale note (2 next to ♭3, ♭6 next to 5).'], answer: 'No semitone steps are left, so nothing rubs.' },
        { q: 'A blues in E uses E7, A7 and B7. Which box?', steps: ['E minor pentatonic over all three chords.', 'E on the low E: fret 12 (or the open position).'], answer: 'E minor pentatonic, box 1 at fret 12 or open.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Learn the sound of each scale so you can recognise it in solos and pick the right one by ear: five notes or seven? A minor 3rd or a major one? Is there a blue note sliding through?' },
        { list: ['Sing the minor pentatonic up and down with the root drone.', 'Listen to a blues solo and spot the bend from 4 to 5.'] },
      ],
      drills: [
        { label: 'Which scale? (ear)', quiz: 'l3-scale-ear', minutes: 5, goal: '8 out of 10' },
        { label: 'Bends & vibrato trainer: bend 4 → 5 in tune', tool: 'ear', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Running the box up and down as an exercise only.', right: 'Make short phrases; start and end on the roots.' },
        { wrong: 'Sitting on the ♭5.', right: 'It\'s a passing note: slide through it to the 4 or the 5.' },
        { wrong: 'Bends that don\'t reach the target note.', right: 'Play the target fret first, then bend until the pitch matches.' },
        { wrong: 'Not knowing which notes are the roots in the box.', right: 'Low E, D and high e strings; land on them at phrase ends.' },
        { wrong: 'Using A minor pentatonic for a song in A major.', right: 'Over major songs use the major pentatonic (next lesson); over a blues in A the minor one works.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Half box, half making music with it.',
      challenge: { label: 'A minor pentatonic in all five positions', ex: { label: 'A minor pentatonic, all five boxes', spec: { kind: 'scale', root: 'A', type: 'minor pentatonic', position: -1 } }, goal: 'a clean run', why: 'The whole neck in one scale: where Level 4 begins.' },
      goals: [
        { focus: 'The box', tasks: [{ label: 'A minor pentatonic, box 1', ex: { label: 'A minor pentatonic, box 1', spec: { kind: 'scale', root: 'A', type: 'minor pentatonic', position: 0 } }, minutes: 6, goal: 'even notes at 80 BPM' }] },
        { focus: 'Spell it', tasks: [{ label: 'Pentatonic scales quiz', quiz: 'nb-pent', minutes: 5 }] },
        { focus: 'The bend', tasks: [{ label: 'Lick: bend, release, resolve', ex: { label: 'Bend, release, resolve', spec: { kind: 'lick', root: 'A', type: 'bend-release', position: 0 } }, minutes: 6 }] },
        { focus: 'The blue note', tasks: [{ label: 'A blues scale', ex: { label: 'A blues scale', spec: { kind: 'scale', root: 'A', type: 'minor blues', position: 0 } }, minutes: 5 }, { label: 'Lick: blue-note walk', ex: { label: 'Blue-note walk', spec: { kind: 'lick', root: 'A', type: 'blue-note', position: 0 } }, minutes: 4 }] },
        { focus: 'Hear it', tasks: [{ label: 'Which scale? (ear)', quiz: 'l3-scale-ear', minutes: 5 }] },
        { focus: 'Move it', tasks: [{ label: 'E minor pentatonic (box 1 at fret 12 or open)', ex: { label: 'E minor pentatonic', spec: { kind: 'scale', root: 'E', type: 'minor pentatonic', position: 0 } }, minutes: 5 }] },
        { focus: 'Solo', tasks: [{ label: 'Solo over an A blues in Jam: short phrases, end on A', tool: 'jam', minutes: 10 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['Blues and rock solos: minor pentatonic of the key, with bends and vibrato.', 'Riffs: most classic rock riffs live inside box 1.', 'Minor songs: the minor pentatonic of the key is the safe first choice for a solo.'] },
      ],
      tasks: [{ label: 'Call and answer lick', ex: { label: 'Call and answer', spec: { kind: 'lick', root: 'A', type: 'answer', position: 0 } } }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Pentatonic scales quiz', quiz: 'nb-pent' },
        { skill: 'Hear', label: 'Which scale? (ear)', quiz: 'l3-scale-ear' },
        { skill: 'Play', label: 'A minor pentatonic box 1 (mic)', ex: { label: 'A minor pentatonic, box 1', spec: { kind: 'scale', root: 'A', type: 'minor pentatonic', position: 0 } } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Minor pentatonic and the blues scale". Quiz me as my teacher: ask me (1) the five notes as degrees and which two natural-minor notes are left out and why, (2) where box 1 sits for G and where the roots are, (3) what the blue note is and how to use it, (4) which notes I bend and to where. One question at a time; tell me what I got right and missed; keep it short.',
        points: ['1 ♭3 4 5 ♭7; no 2 or ♭6, so no semitones', 'G at fret 3; roots on the low E, D and high e', '♭5, a passing note between 4 and 5', '4 → 5 a whole tone, ♭3 a little sharp, ♭7 → 1'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'Gu2esZ-PzFM', title: '5 Blues Licks from the Minor Pentatonic' },
      books: [
        { book: 'No Bull Music Theory for Guitarists', where: 'Chapter 10: Pentatonic Scales', why: 'Both pentatonics with their shapes and exercises.' },
        { book: 'The CAGED System and 100 Licks for Blues Guitar', where: 'Minor pentatonic shape 1 licks, and Chapter Seven: The Blues Scale', why: 'Real blues licks in each shape, with audio.' },
        { book: 'Dominant Pentatonic Scale Guitar Soloing', where: 'Chapter One: Preparatory Exercises', why: 'A pentatonic built for dominant chords: a step beyond this lesson.' },
      ],
      blocks: [{ p: '**Extra credit**: the pentatonic has **five boxes** that join up the neck; box 1 is the first. All five, linked through CAGED, are Level 4.' }],
    },
  ],
}
