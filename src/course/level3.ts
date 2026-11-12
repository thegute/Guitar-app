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
        { label: 'Degrees over a drone: sing 1 ♭3 4 5 ♭7', tool: 'ear', minutes: 4 },
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

export const MAJOR_PENT: CourseLesson = {
  id: 'c3-majorpent', level: 3, n: 4, title: 'Major pentatonic and the relative trick', minutes: 40,
  goal: 'Build the major pentatonic, see that it shares its notes with a minor pentatonic, play it anywhere with the box you already know, and choose major or minor pentatonic for the song in front of you.',
  builds: ['minor pentatonic and the blues scale', 'the major scale'], topics: ['pentatonic', 'soloing', 'relative-minor'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'The minor pentatonic is gritty and bluesy. Its twin, the **major pentatonic**, is sweet and open: the sound of country licks, Southern rock, folk melodies, soul and a lot of pop. Most guitarists learn the minor box and then sound "wrong" over happy songs. This lesson fixes that with almost nothing new to memorise.' },
        { play: { label: 'A major pentatonic: bright and open', seq: [45, 47, 49, 52, 54, 57, 54, 52, 49, 47, 45], gap: 0.28 } },
      ],
    },
    {
      kind: 'learn', title: 'Five notes: 1 2 3 5 6', blocks: [
        { p: 'Take the major scale and leave out the **4 and the 7**: what\'s left is the **major pentatonic**, **1 2 3 5 6**. In C: **C D E G A**. In G: G A B D E.' },
        { p: 'The two notes left out are exactly the two that pull (4 → 3 and 7 → 1, from the last lesson). Without them there\'s **no semitone and no tension**: every note sounds calm over the I chord. That\'s why it sounds so friendly.' },
        { play: { label: 'C major scale, then C major pentatonic (no F, no B)', seq: [48, 50, 52, 53, 55, 57, 59, 60, 48, 50, 52, 55, 57, 60], gap: 0.26 } },
      ],
    },
    {
      kind: 'learn', title: 'The relative trick: same notes, different home', blocks: [
        { p: 'Write out **C major pentatonic**: C D E G A. Now **A minor pentatonic**: A C D E G. **The same five notes.** Only the home note is different.' },
        { p: 'Every major pentatonic has a **relative minor pentatonic** that starts on its **6th note**, three frets lower (C → A, G → E, D → B, A → F#). They\'re one set of notes seen from two homes.' },
        { p: 'So you already know the major pentatonic shape: it\'s your **minor box, three frets lower**. For **A major pentatonic**, play the minor box with the index finger at **fret 2** (F# minor), but treat **A** as home:' },
        { spots: { caption: 'A major pentatonic: your minor box at fret 2, with A (low E fret 5, G string fret 2, high e fret 5) as home.', from: 1, to: 5, marks: midis => box(midis, 9, PENT, PENT_L, 2, 5) } },
        { tip: 'The shape didn\'t change; your **target notes** did. Land on A, the 3rd (C#) and the 5th (E) and it sounds major; land on F# and it sounds minor.' },
      ],
    },
    {
      kind: 'learn', title: 'Which one, when?', blocks: [
        { list: ['**Major songs** (home is a major chord: G, C, D …): **major pentatonic** of the key. Country, folk, Southern rock, gospel, pop ballads.', '**Minor songs** (home is Am, Em …): **minor pentatonic** of the key.', '**Blues** (I7 IV7 V7): the **minor** pentatonic is the classic sound; mixing in the major pentatonic is the B.B. King / Allman Brothers sweetness. Mixing them properly is Level 6.'] },
        { p: 'Quick test: play the **root of the song** and hum the note a minor 3rd up (♭3) and the major 3rd (3). The one that sounds right tells you which pentatonic fits.' },
        { p: 'Country players love the major pentatonic\'s **6th** and the slide from **♭3 up to 3** (C to C# in A): a little of the blues inside a happy scale.' },
        { play: { label: 'A country move: ♭3 slides to 3, then 2 → 1 → 6 → 1', seq: [48, 49, 47, 45, 42, 45], gap: 0.3 } },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Spell it, then find it with the box you know.', examples: [
        { q: 'Spell G major pentatonic.', steps: ['G major: G A B C D E F#.', 'Leave out 4 (C) and 7 (F#).'], answer: 'G A B D E.' },
        { q: 'Which minor pentatonic has the same notes as G major pentatonic?', steps: ['Its 6th note: E.', 'E minor pentatonic: E G A B D.'], answer: 'E minor pentatonic.' },
        { q: 'Play D major pentatonic with your minor box. Where?', steps: ['Its relative minor is B (the 6th of D).', 'B on the low E: fret 7.'], answer: 'The minor box at fret 7, with D (fret 10 on the low E) as home.' },
        { q: 'A song goes G – C – D. Major or minor pentatonic, and in which key?', steps: ['Home is G, a major chord.', 'G major pentatonic (or the minor box at fret 0/12, E minor\'s shape).'], answer: 'G major pentatonic.' },
        { q: 'Why does the major pentatonic never sound "wrong" over the I chord?', steps: ['It leaves out 4 and 7.', 'Those are the notes a semitone from 3 and 1, the ones that clash or pull.'], answer: 'No semitone steps and no pulling notes: everything is calm over I.' },
        { q: 'A song in E major. Where\'s the box?', steps: ['Relative minor of E: C# (the 6th).', 'C# on the low E: fret 9.'], answer: 'Minor box at fret 9, E as home (fret 12 on the low E).' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Major and minor pentatonic are the same five notes seen from different homes, so your ear has to hear **the home and its 3rd**. Play the same box over an A major drone and then an F# minor drone: the notes don\'t change, the feeling does.' },
      ],
      drills: [
        { label: 'Which scale? (ear)', quiz: 'l3-scale-ear', minutes: 5, goal: '8 out of 10' },
        { label: 'Degrees over a drone: 1 2 3 5 6', tool: 'ear', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Using the minor pentatonic of the key over a happy major song.', right: 'Major songs want the major pentatonic: the minor box three frets lower.' },
        { wrong: 'Moving the box down three frets but still landing on its minor root.', right: 'Same shape, new home: land on the major root and its 3rd.' },
        { wrong: 'Thinking relative pentatonics are different scales to learn.', right: 'Same five notes; learn one set of shapes, two ways of hearing it.' },
        { wrong: 'Counting the relative minor up from the root.', right: 'It\'s the 6th note, which is three frets DOWN from the root.' },
        { wrong: 'Sitting on the 2 or the 6 at the end of a phrase.', right: 'End on 1, 3 or 5 for a finished sound.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Over a backing track whenever you can: these scales only make sense against chords.',
      challenge: { label: 'Country major-6 lick, then use it over a G – C – D band', ex: { label: 'Country major-6 lick', spec: { kind: 'lick', root: 'G', type: 'country-6', position: 0 } }, goal: 'at full speed, clean', why: 'The major pentatonic\'s favourite lick, then yours to use over a real progression.' },
      goals: [
        { focus: 'The scale', tasks: [{ label: 'G major pentatonic', ex: { label: 'G major pentatonic', spec: { kind: 'scale', root: 'G', type: 'major pentatonic', position: 0 } }, goal: 'even notes at 90 BPM' }] },
        { focus: 'Spell and relate', tasks: [{ label: 'Pentatonic scales quiz', quiz: 'nb-pent' }, { label: 'Relative minors and majors', quiz: 'cof-relative' }] },
        { focus: 'Real music', tasks: [{ label: 'Keep on the Sunny Side (G): strum it, then solo over it in Jam with G major pentatonic', ex: { label: 'Keep on the Sunny Side', songbook: { song: 'sunny', part: 'words' } } }, { label: 'Solo over G – C – D in Jam; end phrases on G or B', tool: 'jam', goal: 'three phrases that end on home' }] },
        { focus: 'Hear it', tasks: [{ label: 'Which scale? (ear)', quiz: 'l3-scale-ear' }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['Country and bluegrass breaks: major pentatonic plus the ♭3 → 3 slide.', 'Southern rock and soul: major pentatonic over major chords, minor over the blues.', 'Melodies: many folk tunes use only the major pentatonic (Amazing Grace, Auld Lang Syne).'] },
      ],
      tasks: [{ label: 'Solo over a major-key band in Jam', tool: 'jam' }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Pentatonic scales quiz', quiz: 'nb-pent' },
        { skill: 'Hear', label: 'Which scale? (ear)', quiz: 'l3-scale-ear' },
        { skill: 'Play', label: 'G major pentatonic (mic)', ex: { label: 'G major pentatonic', spec: { kind: 'scale', root: 'G', type: 'major pentatonic', position: 0 } } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Major pentatonic and the relative trick". Quiz me as my teacher: ask me (1) the five degrees and which two major-scale notes are left out and why, (2) which minor pentatonic shares notes with C major pentatonic and how I find it, (3) where I play A major pentatonic with my minor box, (4) how I choose between major and minor pentatonic for a song. One question at a time; tell me what I got right and missed; keep it short.',
        points: ['1 2 3 5 6; no 4 or 7, so no pull', 'A minor: the 6th note, three frets down', 'Minor box at fret 2, A as home', 'Home major: major pentatonic; home minor: minor; blues: minor (plus major later)'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'FONKenvjCN4', title: 'Guitar Scales Explained: MAJOR vs MINOR PENTATONIC vs BLUES' },
      books: [
        { book: 'No Bull Music Theory for Guitarists', where: 'Chapter 10: Pentatonic Scales', why: 'The relative pentatonics and their shapes.' },
        { book: 'Flatpicking Essentials Volume 1', where: 'The lead playing sections', why: 'Major-pentatonic bluegrass breaks.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'Part Two: pentatonic substitution', why: 'Which pentatonic fits which chord, and why.' },
      ],
      blocks: [{ p: '**Extra credit**: the minor pentatonic built on the **2nd** of a major key (B minor pentatonic in A major) fits over the V chord too. Pentatonic substitution, in Level 6.' }],
    },
  ],
}

export const NATURAL_MINOR: CourseLesson = {
  id: 'c3-natminor', level: 3, n: 5, title: 'The natural minor scale', minutes: 40,
  goal: 'Build the natural minor scale two ways (from its own recipe and from its relative major), spell it in any key, play it in a moveable shape, and hear its darker colour.',
  builds: ['the major scale', 'minor pentatonic and the blues scale', 'major pentatonic and the relative trick'], topics: ['minor-scale', 'relative-minor'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'The minor pentatonic gave you five minor notes. The **natural minor** gives you all seven, and with them the full sound of sad, serious, epic and haunting music: folk ballads, film scores, metal, much of rock and pop. It\'s also the scale minor keys are built from (next lesson).' },
        { play: { label: 'A natural minor', seq: [45, 47, 48, 50, 52, 53, 55, 57], gap: 0.32 } },
      ],
    },
    {
      kind: 'learn', title: 'The recipe: T S T T S T T', blocks: [
        { p: 'From any root: **tone, semitone, tone, tone, semitone, tone, tone**. As degrees against the major scale: **1 2 ♭3 4 5 ♭6 ♭7**.' },
        { p: 'Three notes are lower than in major: the **♭3** (the minor colour), the **♭6** (sad, heavy) and the **♭7** (no leading tone, so no hard pull to home: the scale feels more open and modal).' },
        { play: { label: 'A major, then A natural minor: 3, 6 and 7 drop', seq: [45, 47, 49, 50, 52, 54, 56, 57, 45, 47, 48, 50, 52, 53, 55, 57], gap: 0.24 } },
        { p: 'The minor pentatonic is the natural minor with the 2 and ♭6 left out. Put them back and box 1 becomes the full scale.' },
      ],
    },
    {
      kind: 'learn', title: 'The relative major: same notes again', blocks: [
        { p: 'Play the C major scale but start and end on **A**: A B C D E F G A. That\'s **A natural minor**. Every major scale contains a natural minor starting on its **6th note**: its **relative minor**. They share all seven notes and the **same key signature**.' },
        { list: ['C major ↔ **A minor** (no sharps or flats)', 'G major ↔ **E minor** (F#)', 'D major ↔ **B minor** (F# C#)', 'F major ↔ **D minor** (B♭)'] },
        { p: 'To find the relative minor: go **down three frets** (a minor 3rd) from the major root. To find the relative major: up three frets.' },
        { tip: 'Don\'t confuse **relative** and **parallel**. A major and A minor (parallel: same root) have different notes. C major and A minor (relative) have the same notes and different homes.' },
      ],
    },
    {
      kind: 'learn', title: 'A moveable shape', blocks: [
        { p: 'Fill in the minor pentatonic box with the 2 and ♭6 and you have the natural minor in one position, root on the low E:' },
        { spots: { caption: 'A natural minor around box 1 (root on the low E at fret 5). The 2 and ♭6 are the two notes added to the pentatonic.', from: 3, to: 8, marks: midis => box(midis, 9, NAT, NAT_L, 4, 8) } },
        { p: 'Slide it to any root: E minor at fret 12 (or open), G minor at 3, D minor at 10. And because A minor and C major share notes, this is also a C major shape: the same frets, a different home.' },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Use the recipe or the relative major: both should agree.', examples: [
        { q: 'Spell E natural minor.', steps: ['Recipe from E: E (T) F# (S) G (T) A (T) B (S) C (T) D (T) E.', 'Check: the relative major of E minor is G (up 3 frets): one sharp, F#.'], answer: 'E F# G A B C D.' },
        { q: 'What is the relative minor of D major?', steps: ['The 6th note of D major: D E F# G A **B**.', 'Or: three frets down from D.'], answer: 'B minor.' },
        { q: 'Spell D natural minor and give its key signature.', steps: ['Relative major: F (three frets up from D).', 'F major has one flat, B♭.'], answer: 'D E F G A B♭ C: one flat.' },
        { q: 'A major vs A minor: which notes change?', steps: ['A major: A B C# D E F# G#.', 'A minor: A B C D E F G.'], answer: 'The 3rd, 6th and 7th drop: C#→C, F#→F, G#→G.' },
        { q: 'Which minor key shares its notes with E♭ major?', steps: ['Three frets down from E♭: D, D♭, C.'], answer: 'C minor (three flats).' },
        { q: 'Where is G natural minor on the low E, and what is its relative major?', steps: ['G on the low E: fret 3.', 'Up three frets: B♭.'], answer: 'Fret 3; relative major B♭ (two flats).' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Over a minor drone, each note of the scale has a feeling: **♭3** dark and settled, **♭6** heavy and sad (it leans down onto 5), **♭7** open and folky, **2** a gentle step. And learn to hear minor vs major scale as a whole: does the 3rd drop?' },
      ],
      drills: [
        { label: 'Which scale? (ear)', quiz: 'l3-scale-ear', minutes: 5, goal: '8 out of 10' },
        { label: 'Major or minor? (chords by ear)', quiz: 'ch-ear', minutes: 3 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Mixing up relative (C major / A minor) and parallel (A major / A minor).', right: 'Relative: same notes, different home. Parallel: same home, different notes.' },
        { wrong: 'Counting the relative minor up from the major root.', right: 'Down three frets (or the 6th note of the major scale).' },
        { wrong: 'Playing A minor notes but landing on C at every phrase end.', right: 'The home note decides the key: end on A for A minor.' },
        { wrong: 'Treating the ♭6 like a passing note.', right: 'It\'s a key colour: let it fall to 5 for the classic sad sound.' },
        { wrong: 'Spelling minor scales with a mix of sharps and flats.', right: 'Use the relative major\'s signature: D minor has B♭, never A#.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Play every goal over a minor groove if you can (Jam, any minor style).',
      challenge: { label: 'E natural minor (G major\'s notes) in every position', ex: { label: 'E natural minor, all positions', spec: { kind: 'scale', root: 'E', type: 'aeolian', position: -1 } }, goal: 'a clean run', why: 'The same notes as G major all over the neck, heard from E.' },
      goals: [
        { focus: 'The scale', tasks: [{ label: 'A natural minor', ex: { label: 'A natural minor', spec: { kind: 'scale', root: 'A', type: 'aeolian', position: 0 } }, goal: 'even notes at 80 BPM' }] },
        { focus: 'Spell it', tasks: [{ label: 'The natural minor scale quiz', quiz: 'nb-minor' }] },
        { focus: 'Real music', tasks: [{ label: 'Greensleeves (A minor melody, 3/4)', ex: { label: 'Greensleeves', songbook: { song: 'greensleeves', part: 'melody' } }, goal: 'a clean run' }] },
        { focus: 'Hear and solo', tasks: [{ label: 'Which scale? (ear)', quiz: 'l3-scale-ear' }, { label: 'Solo with A natural minor over Am – F – G in Jam; lean on the F (♭6) falling to E', tool: 'jam' }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['Minor songs: the natural minor adds the 2 and ♭6 to your pentatonic phrases.', 'Metal and epic rock: the ♭6 → 5 move is everywhere.', 'Folk ballads (Wayfaring Stranger, Greensleeves): minor melodies built on this scale.'] },
      ],
      tasks: [{ label: 'Wayfaring Stranger (A minor)', ex: { label: 'Wayfaring Stranger', songbook: { song: 'stranger', part: 'words' } } }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'The natural minor scale quiz', quiz: 'nb-minor' },
        { skill: 'Hear', label: 'Which scale? (ear)', quiz: 'l3-scale-ear' },
        { skill: 'Play', label: 'A natural minor (mic)', ex: { label: 'A natural minor', spec: { kind: 'scale', root: 'A', type: 'aeolian', position: 0 } } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "The natural minor scale". Quiz me as my teacher: ask me (1) the recipe and the three notes that differ from major, (2) what a relative minor is and how I find it, (3) the difference between relative and parallel, (4) how I spell D natural minor and why it has B♭. One question at a time; tell me what I got right and missed; keep it short.',
        points: ['T S T T S T T: 1 2 ♭3 4 5 ♭6 ♭7', 'The major scale from its 6th note; three frets down', 'Relative = same notes; parallel = same root', 'D minor = F major\'s notes: D E F G A B♭ C'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'V9HxLG544ZA', title: 'How to Find the Relative Minor of Any Major Key on Guitar' },
      books: [
        { book: 'No Bull Music Theory for Guitarists', where: 'Chapter 11: The Natural Minor Scale', why: 'The scale, its relative major and shapes.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'Part One: relative minor key, natural minor construction', why: 'Both ways of building the minor scale.' },
        { book: 'Music Theory for Guitarists', where: 'Chapter 3: Scales', why: 'Minor scales in tab and notation.' },
      ],
      blocks: [{ p: '**Extra credit**: raise the ♭7 back to 7 and you get the **harmonic minor**: the leading tone returns and the scale gets an exotic, classical sound. Level 7.' }],
    },
  ],
}

export const MINOR_KEYS: CourseLesson = {
  id: 'c3-minorkeys', level: 3, n: 6, title: 'Minor keys', minutes: 40,
  goal: 'Build the seven chords of any minor key, use the common minor progressions, tell a minor key from its relative major by ear and on paper, and know why the V chord is often major in a minor key.',
  builds: ['the natural minor scale', 'building the chords of any key', 'hearing the key and the V → I pull'], topics: ['minor-keys', 'keys', 'progressions'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'A huge share of music is in minor keys: rock anthems, ballads, metal, flamenco, film music, folk. They use the same notes as a major key, but home is the minor chord, and that changes how every chord feels.' },
        { prog: { label: 'Am – F – G – Am: a minor key (i – VI – VII – i)', chords: [[45, 52, 57, 60, 64], [41, 48, 53, 57, 60], [43, 50, 55, 59], [45, 52, 57, 60, 64]], gap: 1 } },
      ],
    },
    {
      kind: 'learn', title: 'The chords of a minor key', blocks: [
        { p: 'Stack 3rds on each note of the natural minor, exactly as you did for major. In **A minor** (A B C D E F G):' },
        { list: ['**i** Am · **ii°** B° · **III** C · **iv** Dm · **v** Em · **VI** F · **VII** G'] },
        { p: 'They\'re the **same seven chords as C major**, just counted from Am. The pattern for every minor key: **minor, diminished, major, minor, minor, major, major**.' },
        { list: ['**E minor**: Em F#° G Am Bm C D', '**D minor**: Dm E° F Gm Am B♭ C', '**B minor**: Bm C#° D Em F#m G A'] },
      ],
    },
    {
      kind: 'learn', title: 'Minor progressions you\'ll hear everywhere', blocks: [
        { list: ['**i – VI – VII – i** (Am F G Am): epic, driving rock', '**i – iv – v – i** (Am Dm Em Am): dark and folky', '**i – VII – VI – VII** (Am G F G): the rock and metal climb', '**i – VI – III – VII** (Am F C G): the minor version of the pop four', '**i – VII – VI – V** (Am G F E): the "Andalusian" descent, flamenco to rock'] },
        { prog: { label: 'i – VII – VI – V in A minor: the Andalusian descent', chords: [[45, 52, 57, 60, 64], [43, 50, 55, 59], [41, 48, 53, 57, 60], [40, 47, 52, 56, 59]], gap: 1 } },
        { p: 'Notice that last chord: **E major**, not Em. That\'s next.' },
      ],
    },
    {
      kind: 'learn', title: 'Why the V is often major', blocks: [
        { p: 'In natural minor the v chord is minor (Em in A minor), and it doesn\'t pull home very hard: the ♭7 (G) sits a whole tone below A, so there\'s no leading tone.' },
        { p: 'So musicians usually **raise the 7th** (G → G#) when they reach the V chord: **Em becomes E (or E7)**, with G# pulling up to A. The V → i pull from lesson 2 is back. (The scale with that raised 7th is the harmonic minor, in Level 7.)' },
        { spots: { caption: 'E major in A minor: the G# (G string, fret 1) is the borrowed leading tone that pulls up to A.', to: 3, marks: midis => (G6(midis) ? [{ s: 0, f: 0, label: 'E', role: 'chord' as const }, { s: 1, f: 2, label: 'B', role: 'chord' as const }, { s: 2, f: 2, label: 'E', role: 'chord' as const }, { s: 3, f: 1, label: 'G#', role: 'target' as const }, { s: 4, f: 0, label: 'B', role: 'chord' as const }, { s: 5, f: 0, label: 'E', role: 'chord' as const }] : []) } },
        { prog: { label: 'Em → Am (soft), then E → Am (a real homecoming)', chords: [[40, 47, 52, 55, 59, 64], [45, 52, 57, 60, 64], [40, 47, 52, 56, 59, 64], [45, 52, 57, 60, 64]], gap: 1 } },
        { tip: 'An E or E7 chord in a song full of Am, Dm and F is the giveaway: the song is in A minor.' },
      ],
    },
    {
      kind: 'learn', title: 'Minor key or relative major?', blocks: [
        { p: 'Am, C, F, G and Dm could be **C major** or **A minor**: same chords. Home decides:' },
        { list: ['**Where does it rest?** The first and last chords, and the line endings.', '**Is there a major V?** E or E7 means A minor; G7 → C means C major.', '**How does it feel?** Hum home: is it the bright chord or the dark one?'] },
        { p: 'Many songs move between the two: a verse in A minor, a chorus that lifts to C major. Same notes, a new home: one of the simplest and most effective tricks in songwriting.' },
        { p: 'Soloing: in a minor key use the **minor pentatonic** or **natural minor** of the minor root; over the major V chord, aim for its leading tone (G# in A minor) or just the root.' },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Find home first, then the numbers.', examples: [
        { q: 'List the chords of E minor.', steps: ['E natural minor: E F# G A B C D.', 'Pattern: m dim M m m M M.'], answer: 'Em F#° G Am Bm C D.' },
        { q: 'A song goes Am – F – C – G and ends on Am. Key and numbers?', steps: ['It rests on Am.', 'In A minor: Am = i, F = VI, C = III, G = VII.'], answer: 'A minor: i – VI – III – VII.' },
        { q: 'Play i – iv – V – i in D minor.', steps: ['D minor chords: Dm E° F Gm Am B♭ C.', 'iv = Gm; V raised to major: A (with C#).'], answer: 'Dm – Gm – A – Dm.' },
        { q: 'A song uses Em, C, G, D and B7. Major or minor key?', steps: ['Em, C, G and D fit both G major and E minor.', 'B7 is the major V of E minor (D# is the raised 7th).'], answer: 'E minor.' },
        { q: 'What is the VII chord in B minor?', steps: ['B natural minor: B C# D E F# G A.', 'VII = A (major).'], answer: 'A major.' },
        { q: 'A verse is Am Dm Am E; the chorus is C F G C. What happened?', steps: ['Verse: rests on Am with a major V (E): A minor.', 'Chorus: rests on C with G → C: C major, its relative.'], answer: 'The chorus moves to the relative major: same notes, brighter home.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Hearing **major key vs minor key** is the first thing to decide when you work out a song: is home bright or dark? Then listen for the major V at the ends of lines.' },
      ],
      drills: [
        { label: 'Major key or minor key? (ear)', quiz: 'l3-mood-ear', minutes: 4, goal: '9 out of 10' },
        { label: 'Major or minor? (chords by ear)', quiz: 'ch-ear', minutes: 3 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Calling a song C major because it has no sharps or flats.', right: 'A minor shares those notes: check where it rests.' },
        { wrong: 'Thinking the E chord in A minor is a mistake.', right: 'It\'s the major V, borrowed for its leading tone. Very common.' },
        { wrong: 'Using Roman numerals from the relative major.', right: 'In a minor key, count from the minor root: Am is i, not vi.' },
        { wrong: 'Soloing with the major pentatonic of the relative major and landing on C.', right: 'Same notes, but land on A, C and E (the i chord) in A minor.' },
        { wrong: 'Forgetting the diminished chord sits on 2 in minor.', right: 'Minor pattern: i ii° III iv v VI VII.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Real songs first this time: minor keys are all about the mood.',
      challenge: { label: 'Write a minor verse and a relative-major chorus in Jam, with a major V at the end of the verse', tool: 'jam', goal: 'verse ends E → Am, chorus rests on C', why: 'The mood shift in your own song: the best test of hearing both homes.' },
      goals: [
        { focus: 'A minor song', tasks: [{ label: 'Wayfaring Stranger (A minor)', ex: { label: 'Wayfaring Stranger', songbook: { song: 'stranger', part: 'words' } }, goal: 'every change on time' }] },
        { focus: 'The chords', tasks: [{ label: 'Minor keys quiz', quiz: 'nb-minorkey' }, { label: 'Relative minors and majors', quiz: 'cof-relative' }] },
        { focus: 'Hear the home', tasks: [{ label: 'Major key or minor key? (ear)', quiz: 'l3-mood-ear' }] },
        { focus: 'Play over it', tasks: [{ label: 'Am, Dm and Em: Roots Melody', ex: { label: 'Roots Melody', songbook: { song: 'roots', part: 'melody' } } }, { label: 'Solo with A minor pentatonic over Am – G – F – E in Jam', tool: 'jam' }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['Working out a song: decide major or minor home first, then the numbers.', 'Writing: verse in the minor, chorus in its relative major (or the other way round).', 'Soloing in minor: minor pentatonic or natural minor; hit the leading tone over the major V.'] },
      ],
      tasks: [{ label: 'A minor progression in Jam', tool: 'jam' }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Minor keys quiz', quiz: 'nb-minorkey' },
        { skill: 'Hear', label: 'Major key or minor key? (ear)', quiz: 'l3-mood-ear' },
        { skill: 'Play', label: 'Wayfaring Stranger (mic, strum along)', ex: { label: 'Wayfaring Stranger', songbook: { song: 'stranger', part: 'words' } } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Minor keys". Quiz me as my teacher: ask me (1) the chord pattern of a minor key and the chords of E minor, (2) why the V chord in a minor key is often major, (3) how I tell A minor from C major when the chords are the same, (4) two common minor progressions in numbers. One question at a time; tell me what I got right and missed; keep it short.',
        points: ['i ii° III iv v VI VII: Em F#° G Am Bm C D', 'Raise the 7th for a leading tone: v → V', 'Where it rests, a major V, and how home feels', 'i–VI–VII, i–iv–v, i–VII–VI–V'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'VTITl8OGoII', title: 'Music Theory - Minor Keys Explained - Chords, Scales and Function' },
      books: [
        { book: 'No Bull Music Theory for Guitarists', where: 'Chapter 12: Minor Key Basics', why: 'Minor keys, their chords and progressions.' },
        { book: 'The Circle of Fifths for Guitarists', where: 'Chapter Two: Scales and Keys', why: 'Relative keys on the circle.' },
        { book: 'Music Theory for Guitarists', where: 'Chapter 9: Determining Key Centers', why: 'Telling a minor key from its relative major in real songs.' },
      ],
      blocks: [{ p: '**Extra credit**: you\'ve now covered everything in No Bull Music Theory for Guitarists. The rest of the course goes beyond it.' }],
    },
  ],
}

export const BLUES12: CourseLesson = {
  id: 'c3-blues', level: 3, n: 7, title: 'The 12-bar blues', minutes: 40,
  goal: 'Play the 12-bar blues in any key (standard and quick change, with a turnaround), with a shuffle rhythm part, and solo over it with the minor pentatonic and blues scale.',
  builds: ['chord progressions as numbers', 'minor pentatonic and the blues scale', 'flat and sharp intervals'], topics: ['blues', 'progressions', 'rhythm'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'The 12-bar blues is the most played chord form in popular music: blues, early rock and roll, jazz, country, funk and rock all lean on it. Learn it once and you can jam with almost anyone, anywhere: "12-bar in A" is a whole set of instructions.' },
        { prog: { label: 'A7 – D7 – E7: the three blues chords', chords: [[45, 52, 55, 61, 64], [50, 57, 60, 66], [40, 47, 50, 56, 59, 64]], gap: 1 } },
      ],
    },
    {
      kind: 'learn', title: 'The form: 12 bars, three chords', blocks: [
        { p: 'Three lines of four bars, using **I, IV and V**:' },
        { list: ['**Line 1**: I · I · I · I', '**Line 2**: IV · IV · I · I', '**Line 3**: V · IV · I · V (the last bar, the **turnaround**, sends you back to the top)'] },
        { p: 'In **A**: A7 A7 A7 A7 · D7 D7 A7 A7 · E7 D7 A7 E7. The **quick change** puts IV in bar 2 (A7 D7 A7 A7 …): very common, and what most jams use.' },
        { p: 'The three lines match the classic blues lyric: a line is sung, **repeated**, then **answered**. Statement, statement, answer.' },
      ],
    },
    {
      kind: 'learn', title: 'Every chord is a dominant 7th', blocks: [
        { p: 'In a major key only V is a dominant 7th. The blues breaks that rule: **I7, IV7 and V7 are all dominant 7ths**. A7 has a G, D7 a C, E7 a D: notes from outside A major that give the blues its restless, earthy sound. The blues isn\'t really major or minor: it\'s its own thing.' },
        { p: 'That\'s also why the **minor pentatonic works over the whole form**: its ♭3 and ♭7 rub against the major chords in exactly the bluesy way the style wants.' },
      ],
    },
    {
      kind: 'learn', title: 'The shuffle rhythm part', blocks: [
        { p: 'The classic rhythm part is the **boogie shuffle**: root and 5th, then root and 6th, alternating on each beat, played with a **long-short** swing (Rhythm 3 explains the feel). For A: the open A string with the D string at fret 2, then fret 4.' },
        { spots: { caption: 'The A boogie: A with E (5th, D string fret 2), then A with F# (6th, fret 4).', to: 5, marks: midis => (G6(midis) ? [{ s: 1, f: 0, label: 'A', role: 'root' as const }, { s: 2, f: 2, label: 'E', role: 'chord' as const }, { s: 2, f: 4, label: 'F#', role: 'next' as const }] : []) } },
        { p: 'Move it across: for D7 the same shape on the D and G strings; for E7 on the low E and A strings. Palm-mute lightly. This one part is behind a thousand blues and rock songs.' },
      ],
    },
    {
      kind: 'learn', title: 'Soloing over the form', blocks: [
        { list: ['**Minor pentatonic or blues scale of I** over all 12 bars: A minor pentatonic for a blues in A.', '**Follow the form**: a phrase per line; the 3rd line is the climax (V7), then resolve to the root in bar 11.', '**Call and response**: play a phrase, leave space, answer it, like the sung lyric.', '**Land on chord tones at the changes**: the root of D7 (D) in bar 5, the root of E7 (E) in bar 9.'] },
        { play: { label: 'A short blues phrase: 5 → ♭7 → 5 → ♭3 → 1', seq: [52, 55, 52, 48, 45], gap: 0.35 } },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Count the bars as you go.', examples: [
        { q: 'Write a 12-bar blues in E.', steps: ['E major: I = E, IV = A, V = B.', 'All dominant 7ths.'], answer: 'E7 E7 E7 E7 · A7 A7 E7 E7 · B7 A7 E7 B7.' },
        { q: 'Which chord is bar 9?', steps: ['Line 3 starts on V.'], answer: 'V7 (E7 in A).' },
        { q: 'What does the quick change change?', steps: ['Bar 2 goes to IV, then back to I in bar 3.'], answer: 'Bar 2 is IV7 instead of I7.' },
        { q: 'A blues in G: what are the three chords?', steps: ['G major: G A B C D E F#.', 'I = G, IV = C, V = D.'], answer: 'G7, C7, D7.' },
        { q: 'Why does A minor pentatonic work over D7?', steps: ['D7 = D F# A C.', 'A minor pentatonic = A C D E G: A, C and D are chord tones of D7.'], answer: 'Three of its five notes are in D7; the rest add the blues colour.' },
        { q: 'What is the turnaround for?', steps: ['Bar 12 sits on V7.', 'V pulls to I, so it sends the form back to bar 1.'], answer: 'It leads back to the top: V7 → I7.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Follow the form by ear: count the bars and hear the moves to IV (bar 5) and V (bar 9). Then hear whether a change goes up to IV or V.' },
      ],
      drills: [
        { label: 'Where is the blues going? (ear)', quiz: 'l3-blues-ear', minutes: 4, goal: '9 out of 10' },
        { label: 'The 12-bar blues: which chord?', quiz: 'l3-12bar', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Losing count of the bars.', right: 'Count "1 2 3 4, 2 2 3 4, 3 2 3 4 …" (bar number on beat 1) until the form is in your body.' },
        { wrong: 'Playing plain major chords.', right: 'Dominant 7ths on all three chords.' },
        { wrong: 'Soloing nonstop over all 12 bars.', right: 'Phrase with the lyric: statement, statement, answer, with space between.' },
        { wrong: 'Ignoring the turnaround.', right: 'Bar 12 is V7: it tells everyone the form is starting again.' },
        { wrong: 'Playing the shuffle with straight eighths.', right: 'Long-short: "doo-ba doo-ba" (Rhythm 3).' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Always with a band or a drum beat: the blues is a groove.',
      challenge: { label: 'Slow Burn: three choruses of a 12-bar blues', ex: { label: 'Slow Burn', songbook: { song: 'slowburn', part: 'piece' } }, goal: 'all three choruses', why: 'A head and two solo choruses written for the form: bends, double stops and space.' },
      goals: [
        { focus: 'The rhythm part', tasks: [{ label: 'The shuffle riff', ex: { label: 'Shuffle riff', tab: 'shuffle' }, goal: 'long-short, steady at 84 BPM' }] },
        { focus: 'The form', tasks: [{ label: 'The 12-bar blues: which chord?', quiz: 'l3-12bar' }, { label: 'Where is the blues going? (ear)', quiz: 'l3-blues-ear' }] },
        { focus: 'Licks', tasks: [{ label: 'Blue-note walk', ex: { label: 'Blue-note walk', spec: { kind: 'lick', root: 'A', type: 'blue-note', position: 0 } } }, { label: 'Call and answer', ex: { label: 'Call and answer', spec: { kind: 'lick', root: 'A', type: 'answer', position: 0 } } }] },
        { focus: 'Jam', tasks: [{ label: 'Two choruses over a blues in A in Jam: one rhythm, one solo', tool: 'jam', goal: 'never lose the form' }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['Any jam: "12-bar in E, quick change" and you\'re in.', 'Rock and roll and boogie: the same form, faster and straighter.', 'Songwriting: the AAB lyric and the form fit together.'] },
      ],
      tasks: [{ label: 'Blues in Jam', tool: 'jam' }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'The 12-bar blues: which chord?', quiz: 'l3-12bar' },
        { skill: 'Hear', label: 'Where is the blues going? (ear)', quiz: 'l3-blues-ear' },
        { skill: 'Play', label: 'The shuffle riff (mic)', ex: { label: 'Shuffle riff', tab: 'shuffle' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "The 12-bar blues". Quiz me as my teacher: ask me (1) the 12 bars in numbers and what the quick change and turnaround are, (2) why all three chords are dominant 7ths and why the minor pentatonic still works, (3) how the boogie shuffle part is built, (4) how I shape a solo over the form. One question at a time; tell me what I got right and missed; keep it short.',
        points: ['I I I I · IV IV I I · V IV I V; quick change = IV in bar 2; bar 12 turns around', 'Blues uses I7 IV7 V7; ♭3 and ♭7 rub on purpose', 'Root + 5th, root + 6th, long-short', 'A phrase a line: statement, statement, answer'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'zEpDaO0lZIU', title: '12 Bar Blues Shuffle in the Key of A' },
      books: [
        { book: 'The CAGED System and 100 Licks for Blues Guitar', where: 'Part One: Rhythm Guitar', why: 'Blues rhythm parts and the form through the CAGED shapes.' },
        { book: 'Music Theory for Guitarists', where: 'Chapter 10: Blues Harmony', why: 'Why the blues uses dominant chords, and its variations.' },
        { book: 'Dominant Pentatonic Scale Guitar Soloing', where: 'Chapter Six: Running the Changes', why: 'Following each blues chord with its own scale.' },
      ],
      blocks: [{ p: '**Extra credit**: the **minor blues** uses i7 iv7 v7 (Am7 Dm7 Em7, often with a major E7 at bar 9): the same form, darker.' }],
    },
  ],
}

export const RHYTHM3: CourseLesson = {
  id: 'c3-rhythm', level: 3, n: 8, title: 'Rhythm 3: triplets, shuffle and swing', minutes: 35,
  goal: 'Count and play triplets, turn straight eighths into a shuffle or swing feel, and feel the difference between 3/4, 6/8 and 12/8.',
  builds: ['Rhythm 2: strumming eighths, rests and ties', 'the 12-bar blues'], topics: ['rhythm'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Play a blues with straight eighths and it sounds stiff. Play it with a **shuffle** and it grooves. Half of blues, jazz, swing, country shuffles, Southern rock and many ballads live on the **triplet**: the beat split in three instead of two.' },
        { rhythm: { label: 'Straight eighths…', beats: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], bpm: 84 } },
        { rhythm: { label: '…then the same with a shuffle feel', beats: [2 / 3, 1 / 3, 2 / 3, 1 / 3, 2 / 3, 1 / 3, 2 / 3, 1 / 3], bpm: 84 } },
      ],
    },
    {
      kind: 'learn', title: 'Triplets: three to a beat', blocks: [
        { p: 'A **triplet** squeezes **three even notes** into one beat. Count them **"1-trip-let 2-trip-let 3-trip-let 4-trip-let"**, or "1 & a 2 & a". In notation they\'re eighth notes with a little 3 over them.' },
        { rhythm: { label: 'Triplets: 1-trip-let 2-trip-let …', beats: Array(12).fill(1 / 3), bpm: 72 } },
        { p: 'Strumming triplets is awkward with down-up pendulum strokes (they alternate the accent each beat). Two common answers: **down-up-down, down-up-down** (restart every beat), or **down-down-up** feels. Picking single notes, keep strict alternate picking and let the accents move.' },
      ],
    },
    {
      kind: 'learn', title: 'The shuffle: triplets with the middle tied', blocks: [
        { p: 'Take triplets and **tie the first two together**: long-short, long-short. That\'s the **shuffle**: **"1 (trip) let 2 (trip) let"**, often sung "doo-ba doo-ba". The off-beat (the "&") arrives **late**, on the last third of the beat.' },
        { rhythm: { label: 'Shuffle: long-short on every beat', beats: [2 / 3, 1 / 3, 2 / 3, 1 / 3, 2 / 3, 1 / 3, 2 / 3, 1 / 3], bpm: 84 } },
        { p: 'The boogie riff from the last lesson only sounds right this way. **Swing** in jazz is the same idea, usually lighter and with the "&" a little less late at fast tempos. Chord charts write it as "swing" or "shuffle" above straight eighths: you play them long-short.' },
      ],
    },
    {
      kind: 'learn', title: '3/4, 6/8 and 12/8', blocks: [
        { p: '**3/4**: three beats in a bar, each split in two (1 & 2 & 3 &): the waltz from Rhythm 2.' },
        { p: '**6/8**: six eighth notes, felt as **two big beats of three**: **ONE** two three **FOUR** five six. Same number of eighths as 3/4, completely different feel: a lilt, a rocking boat. Irish jigs, ballads, a lot of slow rock.' },
        { rhythm: { label: '6/8: two groups of three', beats: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5], bpm: 120 } },
        { p: '**12/8**: four big beats, each split in three: a **slow blues** and many soul ballads. It\'s really 4/4 with triplets everywhere, written out.' },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Count out loud, clap, then play.', examples: [
        { q: 'How many triplet eighths fit in a bar of 4/4?', steps: ['Three per beat × four beats.'], answer: '12: which is why a triplet blues is often written in 12/8.' },
        { q: 'At 60 BPM, how long is one triplet note?', steps: ['One beat = 1 second; three per beat.'], answer: 'A third of a second.' },
        { q: 'Where does the "&" land in a shuffle?', steps: ['The beat is split in three; the first two are tied.'], answer: 'On the third part of the beat ("let"): later than halfway.' },
        { q: '3/4 and 6/8 both have six eighth notes. What\'s the difference?', steps: ['3/4 groups them 2+2+2: three beats.', '6/8 groups them 3+3: two beats.'], answer: '3/4 = 1 & 2 & 3 & (three beats); 6/8 = ONE two three FOUR five six (two beats).' },
        { q: 'A chart says "shuffle" over straight eighths. How do you play them?', steps: ['Shuffle = long-short.'], answer: 'Each pair long-short, like a triplet with the middle tied.' },
        { q: 'Count one bar of 12/8.', steps: ['Four big beats, three each.'], answer: '1 & a 2 & a 3 & a 4 & a.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'The key ear skill: hearing whether eighths are **straight or swung**, and whether the beat is split in **two or three**. Count "1 & 2 &" against a song: if the & feels late, it swings.' },
      ],
      drills: [
        { label: 'Straight, swung or triplets? (ear)', quiz: 'l3-feel-ear', minutes: 4, goal: '7 out of 8' },
        { label: 'Rhythm trainer: hear it, tap it back', tool: 'rhythm', minutes: 5 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Shuffling with a dotted rhythm (too jerky: 3/4 + 1/4).', right: 'Triplet-based: 2/3 + 1/3. "Doo-ba", not "dooo-b".' },
        { wrong: 'Rushing triplets into the next beat.', right: 'Say "1-trip-let" with a click: the 1 lands exactly on the click.' },
        { wrong: 'Counting 6/8 as six equal beats.', right: 'Two big beats: feel ONE and FOUR.' },
        { wrong: 'Switching between straight and swung in one song.', right: 'Pick the feel and keep it; the drums will tell you which.' },
        { wrong: 'Stiff, even volume on a shuffle.', right: 'Lean on the beat (the long note); the short note is lighter.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'A drum beat for every goal: shuffles only make sense against one.',
      challenge: { label: 'Triplet roll lick', ex: { label: 'Triplet roll', spec: { kind: 'lick', root: 'A', type: 'triplet-roll', position: 0 } }, goal: 'even triplets at full speed', why: 'Fast, even triplets: the classic rock and blues roll.' },
      goals: [
        { focus: 'The shuffle', tasks: [{ label: 'Shuffle riff', ex: { label: 'Shuffle riff', tab: 'shuffle' }, goal: 'long-short, steady' }] },
        { focus: 'Hear the feel', tasks: [{ label: 'Straight, swung or triplets? (ear)', quiz: 'l3-feel-ear' }] },
        { focus: 'Real music', tasks: [{ label: 'Slow Burn (a blues: shuffle the eighths)', ex: { label: 'Slow Burn', songbook: { song: 'slowburn', part: 'piece' } } }, { label: 'Down in the Valley in 3/4 (the waltz part)', ex: { label: 'Down in the Valley', songbook: { song: 'valley', part: 'waltz' } } }] },
        { focus: 'Tap it', tasks: [{ label: 'Rhythm trainer', tool: 'rhythm', goal: 'most taps green' }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: ['Blues and boogie: shuffle everything.', 'Slow blues and soul ballads: think 12/8, triplets on every beat.', 'Ballads and jigs: 6/8 strumming, two big beats a bar.'] },
      ],
      tasks: [{ label: 'Shuffle over a blues band in Jam', tool: 'jam' }],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Use it, hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Rhythm trainer', tool: 'rhythm' },
        { skill: 'Hear', label: 'Straight, swung or triplets? (ear)', quiz: 'l3-feel-ear' },
        { skill: 'Play', label: 'Shuffle riff (mic)', ex: { label: 'Shuffle riff', tab: 'shuffle' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar theory lesson "Rhythm 3: triplets, shuffle and swing". Quiz me as my teacher: ask me (1) how I count triplets, (2) how a shuffle is built from triplets and where its "&" lands, (3) the difference between 3/4 and 6/8, (4) what 12/8 is and where it\'s used. One question at a time; tell me what I got right and missed; keep it short.',
        points: ['1-trip-let: three even notes a beat', 'Tie the first two: long-short, the & on the last third', '3/4 = three beats of two; 6/8 = two beats of three', '12/8 = four beats of three: slow blues'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'Uue04UD0r84', title: 'Shuffle and Swing Rhythms - Guitar Lesson 46' },
      books: [
        { book: 'The CAGED System and 100 Licks for Blues Guitar', where: 'Part One: Rhythm Guitar', why: 'Shuffle rhythm parts in every shape.' },
        { book: 'Music Theory for Guitarists', where: 'Chapter 2: Theory Basics', why: 'Triplets and time signatures in notation.' },
      ],
      blocks: [{ video: { id: 'QKTveq6RMK0', title: 'Rhythm Workout #4: Triplet Strumming Basics for Guitar', note: 'More strumming practice with triplets.' } }],
    },
  ],
}

export const LEVEL3_CHECK: CourseLesson = {
  id: 'c3-check', level: 3, n: 9, title: 'Level 3 mastery check', minutes: 25,
  goal: 'Show that progressions, pentatonics, minor keys and the blues are yours: everything in No Bull Music Theory for Guitarists, heard and played.',
  builds: ['all of Level 3'], topics: ['progressions', 'pentatonic', 'minor-keys', 'blues', 'rhythm', 'ear'],
  steps: [
    {
      kind: 'why', title: 'Before Level 4', blocks: [
        { p: 'This check covers all of Level 3, and with it everything in No Bull. It\'s **strongly suggested** before Level 4 (mapping the whole fretboard starts from the pentatonic and the keys), but never required.' },
        { list: ['Take it when the practice goals feel easy.', 'Anything you miss points back to the right lesson.', 'Pass it and the Level 3 badge is yours; it comes back as a review later.'] },
      ],
    },
    {
      kind: 'check', title: 'The check', intro: 'Eight parts across building, hearing and playing, then explain the level back to the teacher.',
      tasks: [
        { skill: 'Apply', label: 'Progressions in any key', quiz: 'nb-prog' },
        { skill: 'Apply', label: 'Minor keys', quiz: 'nb-minorkey' },
        { skill: 'Apply', label: 'The 12-bar blues: which chord?', quiz: 'l3-12bar' },
        { skill: 'Hear', label: 'Which progression?', quiz: 'l3-prog-ear' },
        { skill: 'Hear', label: 'Which scale?', quiz: 'l3-scale-ear' },
        { skill: 'Hear', label: 'Major key or minor key?', quiz: 'l3-mood-ear' },
        { skill: 'Play', label: 'A minor pentatonic box 1 (mic)', ex: { label: 'A minor pentatonic, box 1', spec: { kind: 'scale', root: 'A', type: 'minor pentatonic', position: 0 } } },
        { skill: 'Play', label: 'The shuffle riff (mic)', ex: { label: 'Shuffle riff', tab: 'shuffle' } },
      ],
      explain: {
        prompt: 'I just took the KGuitar Level 3 mastery check (progressions as numbers, the V → I pull, minor and major pentatonic and the blues scale, the natural minor, minor keys, the 12-bar blues, triplets and shuffle). Be my teacher for a short oral exam: ask me five questions across these topics, one at a time, including "play me the chords of a quick-change blues in E" and "which pentatonic would you use over a song in D major, and where?", tell me what I got right and missed, and finish with which lesson to review if anything was shaky.',
        points: ['Functions and number charts', 'V7 → I: the tritone resolving', 'Minor and major pentatonic, the relative trick, the blue note', 'Natural minor and its relative major', 'Minor key chords and the major V', 'The 12 bars and the shuffle feel'],
      },
    },
  ],
}

export const LEVEL3: CourseLesson[] = [PROGRESSIONS, PULL, MINOR_PENT, MAJOR_PENT, NATURAL_MINOR, MINOR_KEYS, BLUES12, RHYTHM3, LEVEL3_CHECK]
