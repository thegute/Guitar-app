// Level 6 (Chord tones, melody and soloing), lessons 5–8 and the mastery check: passing, approach and chromatic notes;
// phrasing; double stops and 6ths as lead; playing what you hear. Checked on a standard-tuned guitar (low E first):
//   6ths on G + high e over C: G12+e12 (G/E), G14+e13 (A/F), G9+e8 (E/C), G7+e7 (D/B); slid into from a fret below
//   3rds on G + B with the hammer from the 2 to the 3: C G5 + B3→5 · F G10 + B8→10 · G G12 + B10→12
//   approach line: B→C (from below), F♯→F (from above), C B♭→B (enclosure), D♯→E
import type { CourseLesson } from './types'
import { pairMarks } from './l4bTabs'
import { positionMarks, scaleMarks } from './l6Tabs'

const G = [40, 45, 50, 55, 59, 64]
const notes = (frets: number[]) => frets.flatMap((f, i) => (f < 0 ? [] : [G[i] + f]))

// ---- Lesson 5: passing, approach and chromatic notes ---------------------------------------------------------------
export const APPROACH: CourseLesson = {
  id: 'c6-approach', level: 6, n: 5, title: 'Passing, approach and chromatic notes', minutes: 80,
  goal: 'Fill the space between chord tones with scale passing notes, chromatic passing notes and approach notes from a half step below, above, or both (enclosures), placed on the weak beats so the chord tones still land on the strong ones: the sound of blues, jazz, country and bebop lines.',
  builds: ['targeting chord tones', 'seventh arpeggios', 'the chromatic scale'],
  topics: ['approach notes', 'chromatic notes', 'passing notes', 'enclosures', 'bebop', 'blues', 'soloing'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Chord tones on the strong beats make a line fit the harmony. But a line made only of chord tones sounds like an arpeggio exercise. The magic is in the notes **between** them: a scale note passing from one chord tone to the next, a note a half step away leaning into the target, even notes that aren\'t in the key at all.' },
        { p: 'The rule that makes "wrong" notes sound right: **put them on weak beats and resolve them at once**, by a half step, into a chord tone. Then even a note outside the key sounds deliberate, like the line is sliding into place. That\'s how blues players use the ♭5, how country players slide into notes, and how jazz lines sound so slippery.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['connect chord tones with scale and chromatic passing notes;', 'approach any target from a half step below, from above, and with an enclosure;', 'place outside notes on weak beats so they resolve;', 'use the blues ♭5 and slides into notes as approaches.'] },
        { play: { label: 'An enclosure: C and B♭ around the target B, over G7 (then C)', seq: [72, 70, 71], chord: notes([3, -1, 3, 4, 3, -1]), gap: 0.4 } },
      ],
    },
    {
      kind: 'learn', title: '1 · Passing notes', blocks: [
        { p: 'A **passing note** sits between two chord tones and connects them by step. Over C (C E G), the line **C – D – E** passes through D; **E – F – G** passes through F. The passing note goes on the weak part of the beat (the "and"), the chord tones on the beats.' },
        { p: 'When two scale notes are a whole step apart, you can pass through the note between them: a **chromatic passing note**. **D – C♯ – C**, **G – F♯ – F**, **A – A♭ – G**. One fret at a time, on weak beats, and the line glides.' },
        { tip: 'Going down from the root to the ♭7 over a dominant chord, add the major 7th in between (C – B – B♭ over C7). That one chromatic note is the heart of the bebop sound.' },
      ],
    },
    {
      kind: 'learn', title: '2 · Approach notes', blocks: [
        { p: 'An **approach note** is the note right before a target, a step away from it. Three kinds:' },
        { list: [
          '**From a half step below**: always works, even if the note isn\'t in the key (D♯ → E over C, G♯ → A over Am). The strongest pull there is: the leading-note effect.',
          '**From a half step above**: from the scale when it\'s there (F → E over C), chromatic otherwise (D♭ → C).',
          '**From a scale step**: a whole step above or below, using the key\'s notes.',
        ] },
        { p: 'Approach notes go on the beat **before** the target (often the last eighth of a bar), and the target lands on the strong beat.' },
        { spots: { caption: 'C chord tones in the home position (frets 7–11). Each one can be reached from the fret below it, any time.', from: 0, to: 12, marks: m => positionMarks(m, 0, 0, [0, 4, 7], [4]) } },
      ],
    },
    {
      kind: 'learn', title: '3 · Enclosures', blocks: [
        { p: 'An **enclosure** surrounds the target from both sides before landing: **above, below, target** (or below, above, target). To land on **B** (the 3rd of G7): **C – B♭ – B**. To land on **E**: **F – D♯ – E**.' },
        { p: 'The ear hears the target coming from both directions, so when it arrives it sounds inevitable. Jazz players (Charlie Parker made it famous) use enclosures constantly, often in eighths with the target on beat 1 or 3.' },
        { p: 'The tab for this lesson walks **C – Am – Dm – G7 – C**, landing on a chord tone every bar: B → C from below, F♯ → F from above, C and B♭ enclosing B, D♯ → E.' },
        { video: { id: 'InuaRCIN-h0', title: 'Blues Soloing for Beginners: Passing Tones', note: 'Passing notes in a blues: where they go and how they resolve.' } },
      ],
    },
    {
      kind: 'learn', title: '4 · Blues and country versions', blocks: [
        { list: [
          '**The ♭5 (blues scale)**: A C D **E♭** E G. The E♭ is a chromatic passing note between D and E. Pass through it, never sit on it.',
          '**Slides**: sliding into a target from one fret below is an approach note played with the left hand. It\'s all over blues, country and slide guitar.',
          '**Bends**: bending up to a target from a half or whole step below is the same idea again.',
          '**Country chromatics**: the 6 → ♭7 → 7 → 1 walk up into the root (E – F – F♯ – G in G).',
        ] },
        { spots: { caption: 'The A blues scale, frets 5–8: the ♭5 (E♭) is the passing note between the 4 and the 5.', from: 0, to: 10, marks: m => scaleMarks(m, 9, [0, 3, 5, 6, 7, 10], 4, 8, [6]) } },
      ],
    },
    {
      kind: 'learn', title: '5 · What mastery looks like', blocks: [
        { p: 'You own approach notes when:' },
        { list: [
          'You can play the approach tab cleanly at 76 BPM and **say each approach** as you play ("from below", "enclosure").',
          'Over any chord, you can **approach each chord tone** from below, from above and with an enclosure, without thinking.',
          'You use the blues ♭5 as a passing note, **never landing on it**.',
          'Your improvised lines over ii – V – I put chord tones on the beats and approach notes **just before them**.',
        ] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Find the target, then step into it.', examples: [
        { q: 'Approach E (the 3rd of C) from below.', steps: ['A half step below E is D♯.', 'Not in C major, but it resolves at once.'], answer: 'D♯ → E.' },
        { q: 'Enclose A (the root of Am).', steps: ['Above: B♭ (chromatic) or B (scale).', 'Below: G♯.'], answer: 'B♭ – G♯ – A (or B – G♯ – A).' },
        { q: 'Over C7, walk down from C to A with a chromatic passing note.', steps: ['C7 tones: C E G B♭.', 'C – B (passing) – B♭ (chord tone) – A.'], answer: 'C – B – B♭ – A: the B passes between the root and the ♭7.' },
        { q: 'Why does a D♯ over a C chord sound fine on the "and" of 4 but bad on beat 1 held for a bar?', steps: ['On a weak beat and resolved, it\'s heard as motion.', 'On a strong beat and held, it\'s heard as a wrong note against E.'], answer: 'Outside notes work as motion on weak beats, resolved by a half step.' },
        { q: 'In the A blues scale, what should E♭ do?', steps: ['It\'s the ♭5, between D and E.'], answer: 'Pass through: D – E♭ – E (or E – E♭ – D), never stop on it.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Hear approach notes as **leaning**: a note that only makes sense because of where it goes next. Play D♯ alone over C (it sounds wrong), then D♯ → E (it sounds like a slide into place). The ear forgives anything that resolves quickly.' },
        { list: ['Over a C chord, sing D♯ → E, F → E, then F – D♯ – E.', 'Play the approach tab and stop just before each beat 1: sing where it\'s going.'] },
      ],
      drills: [
        { label: 'Hear it: semitone or tone?', quiz: 'l1-step-ear', minutes: 3 },
        { label: 'Hear it: which chord tone?', quiz: 'l6-tone-ear', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Putting chromatic notes on beat 1.', right: 'Outside notes go on weak beats; chord tones on strong ones.' },
        { wrong: 'Stopping on an approach note.', right: 'An approach note only works when it resolves, a half step, straight away.' },
        { wrong: 'Running the chromatic scale up and down and calling it a line.', right: 'One or two chromatic notes between targets is plenty.' },
        { wrong: 'Sitting on the blues ♭5.', right: 'Pass through it. It\'s the most tense note in the scale.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Say the target before you play into it. Approach notes are about where you\'re going.',
      challenge: { label: 'Every chord tone, three ways', ex: { label: 'Approach notes: every chord tone on beat 1 reached from a half step away', tab: 'approach' }, goal: 'then over a looped ii – V – I, approach every 3rd from below, then from above, then with an enclosure, one chorus each, at 70 BPM', why: 'Choosing the approach on the fly is what turns this into your own vocabulary.' },
      goals: [
        { focus: 'Name the approach', tasks: [{ label: 'Approach the target', quiz: 'l6-approach', minutes: 5, goal: '2 stars' }] },
        { focus: 'Play the line', tasks: [{ label: 'Approach notes into every chord', ex: { label: 'Approach notes: every chord tone on beat 1 reached from a half step away', tab: 'approach' }, minutes: 8, goal: 'clean at 76 BPM' }] },
        { focus: 'Slides as approaches', tasks: [{ label: 'Slides into targets', ex: { label: 'Slides', drill: 'slides' }, minutes: 4 }] },
        { focus: 'Targets plus approaches', tasks: [{ label: 'Target notes: approach each target', tool: 'targets', minutes: 8 }] },
        { focus: 'In a blues', tasks: [{ label: 'Jam: a blues using the ♭5 as a passing note', tool: 'jam', minutes: 6 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: [
          '**Jam**: over a jazz or blues progression, play your normal pentatonic lines but approach the last note of each phrase from a half step below.',
          '**Must-know licks**: find the chromatic notes in the blues and jazz licks: where do they resolve?',
          '**Fills between chords**: walk into the next chord\'s top note from a fret below.',
        ] },
      ],
      tasks: [
        { label: 'Jam: approach notes', tool: 'jam', minutes: 10 },
        { label: 'Fills between chords', tool: 'fills', minutes: 6 },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Name them, hear them, play them, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Approach the target', quiz: 'l6-approach' },
        { skill: 'Hear', label: 'Hear it: semitone or tone?', quiz: 'l1-step-ear' },
        { skill: 'Play', label: 'Approach notes into every chord (mic)', ex: { label: 'Approach notes: every chord tone on beat 1 reached from a half step away', tab: 'approach' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Passing, approach and chromatic notes". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) what a passing note is and a chromatic passing note, (2) the three kinds of approach note, (3) what an enclosure is, with an example, (4) the rule that makes outside notes sound right, (5) how the blues ♭5 and slides are approach ideas. Keep it short.',
        points: ['passing note: a step between chord tones; chromatic: the fret between a whole step', 'from a half step below (always), from above, from a scale step', 'enclosure: above, below, target (C – B♭ – B)', 'outside notes on weak beats, resolved at once by a half step', '♭5 passes between 4 and 5; a slide or bend from below is an approach'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'UH6VN7SobTE', title: 'Lead Effects: Vibrato, Bend, Slide, Hammer-on, Pull-off' },
      books: [
        { book: 'Improvise for Real', where: 'The parts on chromatic notes and how they resolve', why: 'Hearing outside notes as tension that wants to resolve.' },
        { book: 'The Practical Guide to Modern Music Theory for Guitarists', where: 'The soloing chapters', why: 'Approach notes and enclosures with more examples.' },
      ],
      blocks: [{ p: '**Next**: phrasing: how to turn notes into musical sentences.' }],
    },
  ],
}

// ---- Lesson 6: phrasing --------------------------------------------------------------------------------------------
export const PHRASING: CourseLesson = {
  id: 'c6-phrasing', level: 6, n: 6, title: 'Phrasing: motifs, space, call and response, tension and release', minutes: 80,
  goal: 'Build a solo from a short idea: state a motif, repeat it, vary it, answer it, leave space, build tension (higher, longer, outside the chord) and release it, so your playing sounds like someone saying something rather than running scales.',
  builds: ['targeting chord tones', 'approach notes', 'pentatonic positions'],
  topics: ['phrasing', 'motif', 'call and response', 'space', 'tension and release', 'rhythm', 'soloing', 'improvising'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Ask any guitarist what makes a great solo and the answer is rarely "the notes". It\'s the **phrasing**: the way the notes are grouped, repeated, paused and shaped, like sentences in speech. A slow, simple solo with great phrasing beats a fast one that never takes a breath.' },
        { p: 'Phrasing can be learned. It comes down to a handful of habits: a **motif** (a short idea), **repetition and variation**, **space**, **call and response**, a **shape** (where the solo goes over time), and **tension and release**.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['build a solo from one short motif;', 'vary a motif by rhythm, ending, register and direction;', 'use space and call and response on purpose;', 'build tension and release it at the end of a phrase or a solo.'] },
      ],
    },
    {
      kind: 'learn', title: '1 · The motif', blocks: [
        { p: 'A **motif** is a short idea, 3 to 6 notes, with a recognisable rhythm. "Da da da DAAA" is a motif. Your solo can grow from just one.' },
        { p: 'Ways to develop it:' },
        { list: ['**Repeat** it exactly (the ear loves to hear an idea twice).', '**Vary the ending**: same start, new last note (the strongest variation).', '**Move it**: the same shape starting on another note (a sequence).', '**Change the rhythm**: same notes, new timing (start it on the "and").', '**Turn it round**: play it backwards or upside down.'] },
        { p: 'Repeat, vary, then contrast: say it, say it again a bit differently, then say something new.' },
      ],
    },
    {
      kind: 'learn', title: '2 · Space and call and response', blocks: [
        { p: '**Space is part of the music.** A phrase needs a breath after it, like a sentence needs a full stop. Leave a beat or a whole bar of silence after a phrase and the next one sounds twice as strong.' },
        { p: '**Call and response** is the blues and gospel way to use space: a phrase (the call), a gap, then an answer that sounds like a reply. The answer often uses the same rhythm with a different ending, or moves the other way (call goes up, answer comes down).' },
        { tip: 'Sing your phrases. If you can\'t sing it, it\'s probably not a phrase yet; and singers have to breathe, which gives you space for free.' },
        { video: { id: 'Rekcoshs4qI', title: 'Call and Response Blues You Can Play by Yourself', note: 'Call and response on one guitar: the phrase and its answer.' } },
      ],
    },
    {
      kind: 'learn', title: '3 · Shape: where the solo goes', blocks: [
        { p: 'Great solos have a **shape**, like a story: they start low and simple, build (higher, busier, longer notes, bends), reach a peak, and come back down. Within a phrase the same thing happens: an **arch** (up then down) or a **fall** (start high, come down to land on a chord tone).' },
        { list: ['Start your solo **lower and sparser** than you think.', 'Build by **register** (move up the neck), **density** (more notes), and **intensity** (bends, vibrato, volume).', 'Save the **highest note** for near the end.', 'End on a **strong chord tone**, held.'] },
      ],
    },
    {
      kind: 'learn', title: '4 · Tension and release', blocks: [
        { p: '**Tension**: anything that makes the ear want resolution: a note that isn\'t a chord tone held on a strong beat (the 9th, the 4th), a bend held just short, a repeated note, a high, long note, notes outside the key. **Release**: landing on a chord tone, a downward phrase to the root, silence.' },
        { p: 'The tab for this lesson does it over **Am7 – D7**: a motif, space, the motif with a new ending, an answer coming down, the motif moved up a step (tension builds), higher still, a held **B (the 9th of Am)**, then a falling release to A.' },
        { spots: { caption: 'A minor pentatonic, frets 5–8 (the lesson tab is played here). Land on the targets to release.', from: 0, to: 10, marks: m => scaleMarks(m, 9, [0, 3, 5, 7, 10], 4, 8, [3, 7]) } },
      ],
    },
    {
      kind: 'learn', title: '5 · What mastery looks like', blocks: [
        { p: 'You own phrasing when:' },
        { list: [
          'Over a two-chord vamp you can improvise **two minutes from one motif**, and someone listening could hum it afterwards.',
          'You leave **space** without thinking about it, and your phrases have clear beginnings and endings.',
          'You can play **call and response** with yourself, and in the Call and response tool.',
          'Your solos have a **shape**: they build and land.',
          'By ear, you can tell whether a phrase is repeated, varied or new.',
        ] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Start from one idea and change one thing at a time.', examples: [
        { q: 'Your motif is A – C – D (quarter, eighth, eighth) – E (half note). Vary the ending.', steps: ['Keep A – C – D and the rhythm.', 'Change the last note: G instead of E.'], answer: 'A – C – D – G.' },
        { q: 'Move the same motif up a step (a sequence) in A minor pentatonic.', steps: ['Each note moves to the next pentatonic note up: A→C, C→D, D→E, E→G.'], answer: 'C – D – E – G.' },
        { q: 'You played a fast run up to a high A. What should come next?', steps: ['High, fast and busy = tension built.', 'Release: space, or a slower phrase down to a chord tone.'], answer: 'Space, then a slow phrase falling to C or A.' },
        { q: 'Call: A – C – D – E going up. Write an answer.', steps: ['Answers often come back down, same rhythm.'], answer: 'E – D – C – A (down, ending on the root).' },
        { q: 'Over Am7, which held note creates tension and which releases it: B or C?', steps: ['B is the 9th: not a chord tone.', 'C is the ♭3: a chord tone.'], answer: 'B builds tension; C (or A, E) releases it.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'Listen to a singer you like and notice the gaps between lines, the repeats, the way a chorus builds. Then listen to your favourite guitar solo the same way: count how often an idea comes back, varied.' },
        { list: ['Record a minute of improvising and listen back: where were the phrases? Where did you breathe?', 'Sing a short phrase, then sing three variations of it.'] },
      ],
      drills: [
        { label: 'Hear it: same, varied or new?', quiz: 'l6-phrase-ear', minutes: 5, goal: '8 out of 9' },
        { label: 'Call and response', tool: 'cr', minutes: 6 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Playing non-stop until the solo ends.', right: 'Leave space after every phrase. Silence makes the next phrase count.' },
        { wrong: 'A new idea every bar.', right: 'Repeat and vary. An idea needs to be heard twice before it\'s an idea.' },
        { wrong: 'Starting the solo at full speed and at the top of the neck.', right: 'Start low and simple; build to the peak.' },
        { wrong: 'Every phrase starting on beat 1.', right: 'Start some on the "and" of 1, or on beat 2: rhythm variety is phrasing too.' },
        { wrong: 'Ending phrases on random notes.', right: 'End on chord tones, especially at the end of the solo.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Sing before you play. Use fewer notes than you think you need.',
      challenge: { label: 'A one-motif solo', ex: { label: 'A motif and its answers over Am7 – D7: say it, leave space, answer it, build, release', tab: 'phrasing' }, goal: 'then record a two-minute solo over a looped vamp (Am7 – D7, or a blues) built from one motif of your own: repeat it, vary it at least four ways, leave space, build to a peak and land', why: 'Building a whole solo from one idea is the clearest proof of phrasing, and you\'ll hear it on the recording.' },
      goals: [
        { focus: 'Play the model', tasks: [{ label: 'Motif, space, answer, build, release', ex: { label: 'A motif and its answers over Am7 – D7: say it, leave space, answer it, build, release', tab: 'phrasing' }, minutes: 6, goal: 'clean at 80 BPM' }] },
        { focus: 'Hear the variations', tasks: [{ label: 'Hear it: same, varied or new?', quiz: 'l6-phrase-ear', minutes: 5, goal: '2 stars' }] },
        { focus: 'Call and response', tasks: [{ label: 'Call and response', tool: 'cr', minutes: 8 }] },
        { focus: 'Space', tasks: [{ label: 'Jam on Am7 – D7: play two bars, rest two bars, for three minutes', tool: 'jam', minutes: 6 }] },
        { focus: 'Expression', tasks: [{ label: 'Bends and vibrato', tool: 'techniques', minutes: 5 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: [
          '**Looper**: loop a vamp and play call and response with yourself: record a call on one track, answer it live.',
          '**Improv coach (Jam)**: it notices whether you\'re leaving space and repeating ideas.',
          '**Learn a solo you love** and mark its motifs and space with a pencil (or in your head).',
        ] },
      ],
      tasks: [
        { label: 'Call and response', tool: 'cr', minutes: 8 },
        { label: 'Jam: a one-motif solo', tool: 'jam', minutes: 10 },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Hear the phrasing, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Which chord tone is it? (tension or release)', quiz: 'l6-tone' },
        { skill: 'Hear', label: 'Hear it: same, varied or new?', quiz: 'l6-phrase-ear' },
        { skill: 'Play', label: 'Motif, space, answer, build, release (mic)', ex: { label: 'A motif and its answers over Am7 – D7: say it, leave space, answer it, build, release', tab: 'phrasing' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Phrasing: motifs, space, call and response, tension and release". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) what a motif is and five ways to develop it, (2) why space matters, (3) what call and response is, (4) how a solo builds and lands, (5) three ways to make tension and two ways to release it. Then give me a motif and ask me how I\'d vary it. Keep it short.',
        points: ['motif: 3–6 notes with a rhythm; repeat, vary the ending, sequence, change the rhythm, turn it round', 'space lets a phrase land and makes the next one stronger', 'call, gap, answer (same rhythm, new ending or opposite direction)', 'start low and sparse, build register/density/intensity, peak late, land on a chord tone', 'tension: held non-chord tones, high long notes, held bends, outside notes; release: chord tones, falling phrases, silence'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'F6sB_-NV8kM', title: 'The Ultimate Guide to Bending and Vibrato' },
      books: [
        { book: 'Improvise for Real', where: 'The parts on melody and phrases', why: 'Building melodies you can sing, from the inside.' },
        { book: 'The CAGED System and 100 Licks for Blues Guitar', where: 'Any lick: look for its motif and answer', why: 'Licks are phrases: see how they\'re built.' },
      ],
      blocks: [{ p: '**Next**: double stops and 6ths as lead: two notes at once, the soul and blues-rock way.' }],
    },
  ],
}

// ---- Lesson 7: double stops and 6ths as lead -----------------------------------------------------------------------
export const DOUBLE_STOPS: CourseLesson = {
  id: 'c6-doublestops', level: 6, n: 7, title: 'Double stops and 6ths as lead: the soul sound', minutes: 75,
  goal: 'Use 6ths and 3rds as lead lines over chords the way soul, R&B, blues-rock and Mayer-style players do: 6ths on the G and high E strings slid into from a fret below, 3rds on the G and B strings with the hammer-on from the 2 to the 3, chosen so the top note is a chord tone, and muted cleanly.',
  builds: ['interval shapes: 3rds, 6ths and double stops', 'targeting chord tones', 'approach notes'],
  topics: ['double stops', '6ths', '3rds', 'soul', 'R&B', 'Hendrix', 'Mayer', 'rhythm guitar', 'fills'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'In Level 4 you learned 3rds and 6ths as shapes. Now they become a **voice**. Two notes at once sound fuller than a single-note line but lighter than a chord: the sweet, sliding sound of soul and Motown guitar, the Hendrix and Mayer rhythm-lead style, the fills between vocal lines on a thousand R&B records.' },
        { p: 'The trick is the same as with single notes: put a **chord tone on top**, slide or hammer into it, and leave space.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['play 6ths on the G and high E strings over C and F, sliding into them;', 'play 3rds on the G and B strings with the hammer-on from the 2 to the 3;', 'choose double stops whose top note is a chord tone;', 'mute the string in between and use them as fills between chords.'] },
        { play: { label: 'Slide into a 6th: F♯/D♯ → G/E over C', seq: [66, 75, 67, 76], chord: notes([-1, 3, 2, 0, 1, 0]), gap: 0.35 } },
      ],
    },
    {
      kind: 'learn', title: '1 · 6ths on the G and high E strings', blocks: [
        { p: 'A 6th skips a string: one note on the **G string**, one on the **high E**, with the B string between them muted. Over a C chord, **G string 12 + high E 12** gives G and E (the 5th and 3rd of C). Slide into it from the 11th fret and you have the classic soul move.' },
        { p: 'Walk down the C major scale in 6ths on these strings and every pair is a sweet sound; the best ones over C have a **chord tone on top** (E, G or C). Over F, move so the top notes are F, A or C.' },
        { spots: { caption: 'C major in 6ths on the G and high E strings. Over C, the pairs with 3 or 5 on top are the landing spots.', from: 0, to: 15, marks: m => pairMarks(m, 0, 'GE', 5) } },
        { tip: 'Fret the G-string note with your middle finger and the high E with your ring or pinky: the middle finger leans on the B string to mute it. Pick with pick + middle finger (hybrid) or thumb + finger.' },
      ],
    },
    {
      kind: 'learn', title: '2 · 3rds on the G and B strings, with a hammer-on', blocks: [
        { p: '3rds sit on **neighbouring strings**. The Hendrix and soul trick: hold the lower note and **hammer the upper note from the 2 (or 4) to the 3**, a move that sounds like the chord blooming open.' },
        { list: ['**Over C**: G string 5 (C) with B string 3 (D) → hammer to 5 (E).', '**Over F**: G string 10 (F) with B string 8 (G) → 10 (A).', '**Over G**: G string 12 (G) with B string 10 (A) → 12 (B).'] },
        { spots: { caption: 'C major in 3rds on the G and B strings: the double stops that sit under your fingers when you play triads.', from: 0, to: 15, marks: m => pairMarks(m, 0, 'GB', 2) } },
        { video: { id: '4Hf66fxDLiA', title: 'Hendrix / Mayer Double-Stop Riff in 5 Levels', note: 'The style this lesson is built on, step by step.' } },
      ],
    },
    {
      kind: 'learn', title: '3 · Choosing the right double stop', blocks: [
        { p: 'Same rule as targeting single notes: when the chord changes, the **top note** should be a chord tone, ideally the 3rd. Between changes, anything from the scale in 6ths or 3rds works as passing motion.' },
        { list: ['**Slide in** from a fret below (approach notes, two at a time).', '**Walk** down the scale in 6ths and stop on a chord tone.', '**Hammer** from a sus sound to the 3rd.', '**Leave space**: double-stop fills sound best between vocal lines or chord stabs.'] },
        { p: 'The tab for this lesson: sliding 6ths over C and F, then 3rds with hammer-ons over C – F – C – G.' },
      ],
    },
    {
      kind: 'learn', title: '4 · Blues and rock double stops', blocks: [
        { p: 'Blues and rock use **4ths** too: the same fret on the **B and high E** strings gives a 4th (B string 8 + high E 8 = G and C). That\'s the Chuck Berry sound. Slide up and down a fret, bend the lower note, repeat.' },
        { p: 'And the Hendrix trick from Level 5\'s 7♯9 lesson: thumb over the neck for the bass, double stops on top. Rhythm and lead at once.' },
      ],
    },
    {
      kind: 'learn', title: '5 · What mastery looks like', blocks: [
        { p: 'You own double stops as lead when:' },
        { list: [
          'You can play the soul-stops tab cleanly at 72 BPM, **with the middle string muted**.',
          'You can slide into a 6th with a chord tone on top **over any major chord**, in two places on the neck.',
          'You can play the **2 → 3 hammer-on** in 3rds over C, F and G without looking.',
          'Over a slow I – IV progression, you can play **fills** with double stops between strums.',
        ] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Pick the chord tone for the top; the lower note follows the shape.', examples: [
        { q: 'Over a G chord, a 6th on the G and high E strings with the 3rd on top.', steps: ['The 3rd of G is B: high E 7.', 'A major 6th below B is D: G string 7.'], answer: 'G string 7 + high E 7 (D and B). Slide in from 6.' },
        { q: 'Over F, a 3rd on the G and B strings with the hammer-on.', steps: ['Lower note F (G string 10), upper G (B 8) hammered to A (B 10).'], answer: 'G10 + B8 → B10.' },
        { q: 'Why mute the B string when playing 6ths on G and high E?', steps: ['The B string sits between them and isn\'t part of the 6th.'], answer: 'If it rings it adds a note you didn\'t choose: lean the G-string finger on it.' },
        { q: 'Over a D chord, which 6th on G and high E has the root on top?', steps: ['D on high E: 10. A major 6th below: F♯ on the G string 11.'], answer: 'G11 + e10 (F♯ and D).' },
        { q: 'A 4th on the B and high E at the 5th fret: which notes?', steps: ['B string 5 = E, high E 5 = A.'], answer: 'E and A: a 4th (the sound of rock\'n\'roll double stops in A).' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: '6ths sound **sweet and open** (soul, Motown, country); 3rds sound **close and warm** (they\'re the top of a triad); 4ths sound **bluesy and hard** (rock\'n\'roll). Hear the slide-in as two approach notes at once.' },
        { list: ['Over a C chord, play the 6th G/E with and without the slide in. Which sounds more like a record?', 'Hum the top note of each double stop in the tab: that\'s the melody.'] },
      ],
      drills: [
        { label: 'Which pair? 3rds or 6ths', quiz: 'l4-pairs', minutes: 4 },
        { label: 'Hear it: which chord tone?', quiz: 'l6-tone-ear', minutes: 4 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Letting the middle string ring in 6ths.', right: 'Mute it with the underside of the lower finger.' },
        { wrong: 'Strumming double stops with a full pick stroke.', right: 'Pick + middle finger, or thumb + finger: just the two strings.' },
        { wrong: 'Random double stops over the chord.', right: 'Chord tone on top when the chord changes.' },
        { wrong: 'Playing double stops continuously.', right: 'They\'re fills: play them between vocal lines or strums, and leave space.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Slowly, listening for the muted middle string. Let the slides be smooth and short.',
      challenge: { label: 'A soul rhythm part', ex: { label: 'Soul double stops: sliding 6ths over C – F, then 3rds with a hammer-on', tab: 'soulStops' }, goal: 'then over a looped I – IV – V in G (or D), play a rhythm part made only of double-stop fills between chord stabs, for two minutes', why: 'That\'s exactly how these sounds are used on records: as a rhythm-lead part around a song.' },
      goals: [
        { focus: 'Warm up the shapes', tasks: [{ label: 'C major in 6ths on the G and high E', ex: { label: 'C major in 6ths on G and E', tab: 'sixthsGE' }, minutes: 4 }, { label: 'C major in 3rds on G and B', ex: { label: 'C major in 3rds on G and B', tab: 'thirdsGB' }, minutes: 4 }] },
        { focus: 'The soul sound', tasks: [{ label: 'Sliding 6ths and hammered 3rds over C – F', ex: { label: 'Soul double stops: sliding 6ths over C – F, then 3rds with a hammer-on', tab: 'soulStops' }, minutes: 8, goal: 'clean at 72 BPM' }] },
        { focus: 'Hear the intervals', tasks: [{ label: 'Which pair? 3rds or 6ths', quiz: 'l4-pairs', minutes: 4, goal: '2 stars' }] },
        { focus: 'Over a groove', tasks: [{ label: 'Jam: a slow soul groove, double stops between strums', tool: 'jam', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: [
          '**Fills between chords**: the Mayer workshop uses exactly these moves between chord changes.',
          '**Jam**: soul, R&B or blues styles at a slow tempo; fills between the chords.',
          '**Songs**: add a sliding 6th fill at the end of each line in a song you strum.',
        ] },
      ],
      tasks: [
        { label: 'Fills between chords (Mayer style)', tool: 'fills', minutes: 10 },
        { label: 'Jam: soul groove with double stops', tool: 'jam', minutes: 8 },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Hear them, play them, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Which pair? 3rds or 6ths', quiz: 'l4-pairs' },
        { skill: 'Hear', label: 'Hear it: which chord tone?', quiz: 'l6-tone-ear' },
        { skill: 'Play', label: 'Soul double stops (mic)', ex: { label: 'Soul double stops: sliding 6ths over C – F, then 3rds with a hammer-on', tab: 'soulStops' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Double stops and 6ths as lead: the soul sound". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) where 6ths and 3rds sit on the strings, (2) the soul slide-in and why it works, (3) the 2 → 3 hammer-on in 3rds, (4) how to choose a double stop over a chord, (5) how to keep the middle string quiet and how to pick them. Keep it short.',
        points: ['6ths: G + high E (skip a string); 3rds: G + B (neighbours)', 'slide in from a fret below = two approach notes', 'hold the lower note, hammer the upper from 2 to 3', 'chord tone (the 3rd) on top when the chord changes', 'lean the lower finger on the middle string; pick + finger or thumb + finger'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'rFDuj8GXMk0', title: 'John Mayer Style Guitar Lesson' },
      books: [
        { book: 'Triads for the Improvising Guitarist', where: 'The parts on dyads and partial triads', why: 'Double stops as two notes of a triad, and how to move them.' },
        { book: 'The CAGED System and 100 Licks for Blues Guitar', where: 'The double-stop licks', why: 'Blues double stops in every shape.' },
      ],
      blocks: [{ p: '**Next**: playing what you hear: from the sound in your head to the neck.' }],
    },
  ],
}

// ---- Lesson 8: playing what you hear -------------------------------------------------------------------------------
export const PLAY_WHAT_YOU_HEAR: CourseLesson = {
  id: 'c6-ear', level: 6, n: 8, title: 'Playing what you hear', minutes: 80,
  goal: 'Hear a melody as scale degrees against home, sing a phrase and find it on the neck, echo short phrases by ear, work out a lick from a recording, and start soloing from the ear (sing it, then play it) instead of from patterns.',
  builds: ['intervals by ear', 'scale degrees', 'phrasing'],
  topics: ['ear training', 'scale degrees', 'singing', 'transcribing', 'improvising', 'call and response'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Everything in this level has been about **knowing** where the good notes are. The last step is the one that makes it music: **hearing** a melody in your head and playing it straight away. Players who can do this improvise like they\'re singing, learn songs by ear, and never get stuck in patterns.' },
        { p: 'The method: learn what each **scale degree** sounds like against home (1 sounds settled, 7 sounds like it wants to rise, 4 wants to fall…), then practise going from sound to neck in tiny steps: sing, find, play.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['name short melodies as scale degrees by ear;', 'sing a three- to five-note phrase and play it back on the neck;', 'echo phrases played to you (call and response);', 'work out a short lick from a recording;', 'improvise a phrase by singing it first.'] },
      ],
    },
    {
      kind: 'learn', title: '1 · Degrees have feelings', blocks: [
        { p: 'Against a home note, every degree of the major scale has its own pull. Learn them as feelings, not just numbers:' },
        { list: ['**1**: home, rest.', '**2**: hovering just above home, wants to fall to 1 (or rise to 3).', '**3**: bright and settled, the "major" note.', '**4**: wants to fall to 3.', '**5**: strong and open, a second home.', '**6**: warm, a bit wistful, wants to fall to 5.', '**7**: tense, a half step under home, wants to rise to 1.'] },
        { p: 'Hold a drone (or a chord) on the home note and sing each degree, feeling where it wants to go. The Ear training path in Explore drills this with Sonofield-style drones.' },
        { video: { id: 'iGu8WLHnfrQ', title: 'Ear Training For Guitar Players: Singing Melodies', note: 'Singing degrees and melodies, then finding them on the guitar.' } },
      ],
    },
    {
      kind: 'learn', title: '2 · Sing it, find it, play it', blocks: [
        { p: 'Start tiny. Over a C chord, in the open position:' },
        { list: ['**Sing** a three-note phrase (say, 1 2 3: C D E).', '**Find** the first note on the neck (it\'s home: C).', '**Hear the direction and size** of each step: up a step, up a step.', '**Play it**, then sing it again to check.'] },
        { p: 'Then 1 3 5, 5 4 3, 5 6 5, 3 2 1, 1 7 1… then five notes, then phrases from songs you know. Stay in one position at first so the neck doesn\'t get in the way.' },
        { tip: 'Wrong notes are useful: if you find a D when you meant E, you just learned what a step is. Correct by ear, not by looking it up.' },
      ],
    },
    {
      kind: 'learn', title: '3 · Echo and transcribe', blocks: [
        { p: '**Echo**: someone (or the Call and response tool) plays a short phrase; you play it back. Start with two notes in one position, build up to two-bar licks. This is how blues players learned for a hundred years.' },
        { p: '**Transcribe**: take a short lick from a recording you like (four to eight notes):' },
        { list: ['Find the **first note** (or the key\'s home note) by humming and matching.', 'Hear the **direction** of each note (up, down, same).', 'Hear the **size** (a step, a skip, a big jump).', 'Use the scale you\'re in to narrow it down.', 'Slow it down (Play\'s speed control, or the Riff Scanner) when it\'s fast.'] },
        { video: { id: '2Jq4vEAqZq8', title: 'How To Figure Songs Out By Ear (Chords and Riffs)', note: 'The same process for working out riffs and chords.' } },
      ],
    },
    {
      kind: 'learn', title: '4 · Soloing from the ear', blocks: [
        { p: 'Now combine everything. Over a backing: **sing a short phrase in your head (or out loud) first, then play it.** At first it will be simple: three or four notes. That\'s perfect: simple sung phrases with good phrasing beat fast patterns.' },
        { list: ['**Sing while you play** (scat along with your lines, like B.B. King or George Benson): it ties your ear to your hands.', '**Hear the target** before the chord changes (lesson 3), and let your ear find the way there.', '**Mix**: patterns when you need them, ear-led phrases as often as you can.'] },
        { p: 'The tab for this lesson: four short phrases in C, each followed by a bar of space. Play the phrase, sing it back in the gap, then make up your own answer in the gap next time round.' },
      ],
    },
    {
      kind: 'learn', title: '5 · What mastery looks like', blocks: [
        { p: 'You own playing by ear when:' },
        { list: [
          'You name **three-note phrases** as degrees by ear eight times out of ten.',
          'You can sing a **five-note phrase** and play it back first time, most of the time.',
          'You can **echo two-bar phrases** in the Call and response tool.',
          'You\'ve worked out **three licks** from recordings you like.',
          'In a solo, you **sing a phrase first** and play it, at least a few times a chorus.',
        ] },
      ],
    },
    {
      kind: 'examples', title: 'Worked examples', intro: 'Find home, then hear each step from it.', examples: [
        { q: 'A phrase sounds like it starts on home, goes up two steps, then comes back. Degrees?', steps: ['Home = 1. Up a step = 2, up again = 3, back to 1.'], answer: '1 2 3 1.' },
        { q: 'A note sounds tense, just under home, and rises into it. Which degree?', steps: ['The note a half step under home is 7.'], answer: '7 → 1.' },
        { q: 'You sing 5 4 3 in C. Where is it in the open position?', steps: ['5 = G (open G string or high E 3), 4 = F (high E 1), 3 = E (open high E).'], answer: 'High E 3, 1, 0 (G, F, E).' },
        { q: 'You\'re transcribing a lick in A minor pentatonic. It starts on the root and jumps up to a note that sounds bright and open. Likely note?', steps: ['From A, an open, strong skip up is the 5th (E).'], answer: 'E, the 5th.' },
        { q: 'How do you check a note you found by ear is right?', steps: ['Sing the phrase, then play it, then sing again.', 'If they match, it\'s right; if not, hear which way it\'s off.'], answer: 'Sing – play – sing: your ear is the judge.' },
      ],
    },
    {
      kind: 'hear', title: 'Hear it', blocks: [
        { p: 'The whole lesson is ear training, so spend most of your time here. Little and often beats long sessions: five minutes of degree singing a day changes how you hear music within a few weeks.' },
        { list: ['Sing the major scale over a C drone, feeling each degree\'s pull.', 'Pick a song you know well and work out its first phrase by ear.', 'Echo phrases in the Call and response tool.'] },
      ],
      drills: [
        { label: 'Hear it: which degrees?', quiz: 'l6-melody-ear', minutes: 5, goal: '8 out of 10' },
        { label: 'Scale degrees by ear', quiz: 'l4-deg-ear', minutes: 5 },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Hunting for notes on the neck until something sounds right.', right: 'Sing it first, hear the direction and size, then go straight there.' },
        { wrong: 'Starting with long, fast phrases.', right: 'Three notes in one position. Build up slowly.' },
        { wrong: 'Skipping the singing because it feels silly.', right: 'Singing is the fastest way to connect ear and hands. Hum quietly if you have to.' },
        { wrong: 'Only working by ear from tabs you already know.', right: 'Use new material: that\'s what trains the ear.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'A few minutes every day. Sing, then play, then sing again.',
      challenge: { label: 'A lick from a record', ex: { label: 'Hear it, sing it, play it: four short phrases with a bar of space after each', tab: 'hearPlay' }, goal: 'then work out a short lick (4–8 notes) from a recording you love, by ear only, and play it along with the record', why: 'Learning real music by ear is where this skill pays off for the rest of your life.' },
      goals: [
        { focus: 'Degrees by ear', tasks: [{ label: 'Hear it: which degrees?', quiz: 'l6-melody-ear', minutes: 5, goal: '2 stars' }, { label: 'Scale degrees by ear', quiz: 'l4-deg-ear', minutes: 5 }] },
        { focus: 'Sing it, play it', tasks: [{ label: 'Four phrases with space to echo', ex: { label: 'Hear it, sing it, play it: four short phrases with a bar of space after each', tab: 'hearPlay' }, minutes: 6 }] },
        { focus: 'Echo', tasks: [{ label: 'Call and response', tool: 'cr', minutes: 8, goal: 'two-bar phrases' }] },
        { focus: 'The ear path', tasks: [{ label: 'Ear training path', tool: 'earpath', minutes: 8 }] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { list: [
          '**Riff Scanner and Play\'s speed control**: slow down a recording to work out a lick.',
          '**Looper**: record a phrase, then answer it by ear on the next track.',
          '**Jam**: sing a phrase, then play it, over any backing.',
        ] },
      ],
      tasks: [
        { label: 'Call and response', tool: 'cr', minutes: 8 },
        { label: 'Ear training path', tool: 'earpath', minutes: 8 },
      ],
    },
    {
      kind: 'check', title: 'Check your understanding', intro: 'Hear it, play it, then explain it back.',
      tasks: [
        { skill: 'Apply', label: 'Scale degrees by ear', quiz: 'l4-deg-ear' },
        { skill: 'Hear', label: 'Hear it: which degrees?', quiz: 'l6-melody-ear' },
        { skill: 'Play', label: 'Four phrases to echo (mic)', ex: { label: 'Hear it, sing it, play it: four short phrases with a bar of space after each', tab: 'hearPlay' } },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Playing what you hear". Quiz me as my teacher, one question at a time, and tell me what I got right and missed: (1) the feeling of each scale degree against home, (2) the sing – find – play method, (3) how to work out a lick from a recording, (4) how to solo from the ear, (5) why singing matters. Keep it short.',
        points: ['1 home, 2 hovers, 3 bright, 4 falls to 3, 5 strong, 6 warm, 7 rises to 1', 'sing it, find the first note, hear direction and size, play it, sing again', 'first note, direction, size, the scale narrows it, slow it down', 'sing a short phrase first, then play it; scat along', 'singing ties the ear to the hands'],
      },
    },
    {
      kind: 'deeper', title: 'Go deeper', video: { id: 'l1moc6n1sRk', title: 'Ear training for guitar that actually works (to play what you hear)' },
      books: [
        { book: 'Improvise for Real', where: 'From the start', why: 'A whole method for hearing in scale degrees and playing what you hear: the deepest source for this lesson.' },
      ],
      blocks: [{ p: '**Next**: the Level 6 mastery check, then Level 7: harmony in depth (secondary dominants, borrowed chords, key changes).' }],
    },
  ],
}

// ---- Level 6 mastery check -----------------------------------------------------------------------------------------
export const LEVEL6_CHECK: CourseLesson = {
  id: 'c6-check', level: 6, n: 9, title: 'Level 6 mastery check', minutes: 30,
  goal: 'Show that you can solo on the chords: arpeggios in five shapes and in one position, chord tones landed on the changes, major and minor pentatonic chosen and mixed, approach notes, phrasing, double stops, and playing what you hear.',
  builds: ['all of Level 6'], topics: ['arpeggios', 'chord tones', 'targeting', 'pentatonic', 'approach notes', 'phrasing', 'double stops', 'ear'],
  steps: [
    {
      kind: 'why', title: 'Before Level 7', blocks: [
        { p: 'This check covers all of Level 6: chord tones, melody and soloing. It\'s **strongly suggested** before Level 7, but never required.' },
        { list: ['Take it when the practice goals feel easy.', 'Anything you miss points back to the right lesson.', 'Pass it and the Level 6 badge is yours; it comes back as a review later.'] },
      ],
    },
    {
      kind: 'check', title: 'The check', intro: 'Eleven parts across knowing, hearing and playing, then explain the level back to the teacher.',
      tasks: [
        { skill: 'Apply', label: 'Which chord tone is it?', quiz: 'l6-tone' },
        { skill: 'Apply', label: 'Approach the target', quiz: 'l6-approach' },
        { skill: 'Hear', label: 'Hear it: which chord tone?', quiz: 'l6-tone-ear' },
        { skill: 'Hear', label: 'Hear it: major, minor or mixed pentatonic?', quiz: 'l6-pent-ear' },
        { skill: 'Hear', label: 'Hear it: same, varied or new?', quiz: 'l6-phrase-ear' },
        { skill: 'Hear', label: 'Hear it: which degrees?', quiz: 'l6-melody-ear' },
        { skill: 'Play', label: 'C arpeggio in all five shapes (mic)', ex: { label: 'C arpeggio in all five CAGED shapes, up and back', tab: 'arpCaged' } },
        { skill: 'Play', label: 'ii – V – I – vi as one line (mic)', ex: { label: 'ii – V – I – vi in C: 7th arpeggios as one line', tab: 'arp7Changes' } },
        { skill: 'Play', label: 'Target the 3rds (mic)', ex: { label: 'Target the 3rds: Dm7 – G7 – Cmaj7, landing on F, B and E', tab: 'targets' } },
        { skill: 'Play', label: 'Approach notes (mic)', ex: { label: 'Approach notes: every chord tone on beat 1 reached from a half step away', tab: 'approach' } },
        { skill: 'Play', label: 'Soul double stops (mic)', ex: { label: 'Soul double stops: sliding 6ths over C – F, then 3rds with a hammer-on', tab: 'soulStops' } },
      ],
      explain: {
        prompt: 'I just took the KGuitar Level 6 mastery check (arpeggios in five CAGED shapes, 7th arpeggios in one position, targeting chord tones on the changes, mixing major and minor pentatonic, passing and approach notes, phrasing, double stops and 6ths as lead, playing what you hear). Be my teacher for a short oral exam: ask me six questions across these topics, one at a time, including "what are the targets in a blues in E?" and "how would you develop this motif: A C D E?", tell me what I got right and missed, and finish with which lesson to review if anything was shaky.',
        points: ['arpeggio = chord shape + doubled notes; 7th arpeggios of a key in one position', 'land on the 3rd on beat 1; plan backwards', 'match the pentatonic to the chord\'s 3rd; blues mixes them (♭3 → 3)', 'approach from a half step below/above, enclosures; outside notes on weak beats', 'motif, repeat, vary, space, call and response, build and release', 'degrees by ear: sing it, find it, play it'],
      },
    },
  ],
}

export const LEVEL6_B: CourseLesson[] = [APPROACH, PHRASING, DOUBLE_STOPS, PLAY_WHAT_YOU_HEAR, LEVEL6_CHECK]
