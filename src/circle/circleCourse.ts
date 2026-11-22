// 6-Chapter Pro Circle of Fifths Masterclass with 25 YouTube lessons, LoG and Signals Music Studio first where they cover
// the chapter (owner's favourites), plus Mauricio Murúa, Chris Sherland, Jens Larsen and others; every one checked with
// oEmbed (exists and plays inside the app), `parts` = the video's own chapter times,
// plain-English deep theory, clickable Hear-It chord moves, worked guide-tone breakdowns, and Practice hooks.
import type { EtudeLevel, EtudeTexture, EtudeZone } from './circleEngine'

export interface MasterclassVideo {
  id: string
  title: string
  teacher: string
  watchFor: string
  /** where to jump in: seconds from the start + what happens there (from the video's own chapters) */
  parts?: { at: number; what: string }[]
}

export interface HearDemo {
  label: string
  /** semitone offsets + suffix from current tonic (transposes to ANY key!) */
  chords: { semi: number; suffix: string }[]
  note: string
}

export interface WorkedStep {
  move: string
  anchor: string
  shift: string
  why: string
}

export interface CircleChapter {
  id: string
  num: number
  title: string
  subtitle: string
  minutes: number
  minorDefault?: boolean
  pathId: string
  practicePreset: { texture: EtudeTexture; level: EtudeLevel; zone: EtudeZone }
  /** Cross-links to KGuitar's existing Theory Course lessons for extra depth */
  courseLinks: { id: string; label: string }[]
  whyItSoundsGreat: string
  deepDive: { heading: string; body: string }[]
  workedTitle: string
  /** the key the worked example is written in: it is moved to the key you pick (none = no note names to move) */
  workedKey?: { tonic: string; minor: boolean }
  worked: WorkedStep[]
  demos: HearDemo[]
  mistakes: { wrong: string; right: string }[]
  videos: MasterclassVideo[]
}

export const CIRCLE_CHAPTERS: CircleChapter[] = [
  {
    id: 'ch1-gravity',
    num: 1,
    title: 'The Physics of the Wheel',
    subtitle: 'Why counter-clockwise = gravity, and how to read any song on the Circle in 2 seconds',
    minutes: 15,
    minorDefault: true,
    pathId: 'minor-gravity',
    practicePreset: { texture: 'peaceful', level: 'starter', zone: 'open' },
    courseLinks: [
      { id: 'c2-circle', label: 'Level 2: Key signatures & circle' },
      { id: 'c3-pull', label: 'Level 3: Hearing the V → I pull' },
    ],
    whyItSoundsGreat:
      'Every time you step ONE wedge counter-clockwise on the Circle of Fifths (say B → E → A → D → G → C → F), the root drops by a 5th (or climbs a 4th). Your ear hears every chord as a mini V → I resolution — like dominoes tipping forward with unstoppable musical momentum.',
    deepDive: [
      {
        heading: '1. Clockwise lifts energy — Counter-clockwise pulls you home',
        body: 'Going clockwise (C → G → D → A) adds a sharp each step: it brightens and builds tension, like walking uphill. Going counter-clockwise (A → D → G → C) resolves that tension like coasting downhill. Most cinematic, jazz, folk, and "peaceful" progressions ride that counter-clockwise slide.',
      },
      {
        heading: '2. The 6-Chord Key Slice (Your Safe Home Zone)',
        body: 'Pick any key on the wheel. Its 6 main diatonic chords sit right next to each other in one compact slice: Home (I) in the middle, IV one click counter-clockwise, V one click clockwise, and the three minor chords (ii, vi, iii) tucked directly inside them. Neighbouring keys share 6 out of 7 notes!',
      },
      {
        heading: '3. Why Guitarists Actually Play the "Circle of 4ths"',
        body: 'Look at your open guitar strings from thick to thin: E → A → D → G! Your guitar is literally tuned in counter-clockwise steps around the Circle of Fifths. That means moving across strings at the SAME fret walks you straight around the Circle of 4ths!',
      },
    ],
    workedTitle: 'The Classic 8-Chord Minor Gravity Walk',
    workedKey: { tonic: 'E', minor: true },
    worked: [
      { move: 'i → iv (Em → Am)', anchor: 'E stays put', shift: 'G → A, B → C', why: '1 click counter-clockwise: opens the journey with deep warmth.' },
      { move: 'iv → VII (Am → D7)', anchor: 'A & C stay put', shift: 'E → F#', why: 'Another 4th drop: D7 points right at the relative major (G).' },
      { move: 'VII → III (D7 → Gmaj7)', anchor: 'D stays put', shift: 'C → B (1 fret!)', why: 'Momentary sunlight in the relative major key.' },
      { move: 'III → VI → iiø → V7 → i', anchor: 'Shared guide tones cascade', shift: '7th drops 1 fret into 3rd', why: 'F#m7b5 → B7 (outside Harmonic Minor V7!) snaps you right back home to Em.' },
    ],
    demos: [
      { label: 'Counter-Clockwise Gravity (i → iv → VII → III)', chords: [{ semi: 0, suffix: 'm7' }, { semi: 5, suffix: 'm7' }, { semi: 10, suffix: '7' }, { semi: 3, suffix: 'maj7' }], note: 'Hear how every chord pulls smoothly into the next like dominoes.' },
      { label: 'Clockwise Bright Lift (I → V → II)', chords: [{ semi: 0, suffix: '' }, { semi: 7, suffix: '' }, { semi: 2, suffix: '' }], note: 'Compare that to going clockwise — energetic, open, rising.' },
    ],
    mistakes: [
      { wrong: 'Treating the Circle of Fifths like a dry wall chart to memorize sharps and flats.', right: 'Use it as a live GPS while playing: spot which direction the chords move and feel the pull.' },
      { wrong: 'Jumping all over the fretboard for each root note.', right: 'Remember your strings (E–A–D–G) already move in 4ths — stay in one 4-fret zone!' },
    ],
    videos: [
      { id: 'fiAay-Ld_IM', teacher: 'Chris Sherland', title: 'Circle Of Fifths On Guitar', watchFor: 'How the wheel lies on the fretboard: neighbouring keys and why going backwards gives you 4ths.', parts: [{ at: 259, what: 'The lesson' }, { at: 827, what: 'Wrap up' }] },
      { id: 'YFe7Jchras0', teacher: 'Samjamguitar', title: 'The Circle of Fifths Explained for Guitar', watchFor: 'The 6-chord key slice and how neighbouring keys share chords.' },
      { id: 'qF3mJzDulJ8', teacher: 'Active Melody', title: 'Circle of Fifths Explained (For Guitar)', watchFor: 'Spotting IV, V and secondary dominants on the wheel, played on the guitar.' },
    ],
  },
  {
    id: 'ch2-guidetones',
    num: 2,
    title: 'Guide Tones: The "1-Fret Drop" Secret',
    subtitle: 'How pros glide through complex chord changes while barely moving their hand',
    minutes: 20,
    minorDefault: false,
    pathId: 'major-cascade',
    practicePreset: { texture: 'triads', level: 'starter', zone: 'mid' },
    courseLinks: [
      { id: 'c5-sevenths', label: 'Level 5: Seventh chords & shells' },
      { id: 'c5-voicelead', label: 'Level 5: Voice leading & guide tones' },
    ],
    whyItSoundsGreat:
      'A chord’s root tells you its name, and the 5th just adds weight — but the 3rd and 7th (the "Guide Tones") define the ENTIRE emotional colour. Whenever chords move around the Circle of 4ths, the 7th of chord #1 drops by ONE fret to become the 3rd of chord #2. Your hand barely moves, yet the harmony sounds rich and pro.',
    deepDive: [
      {
        heading: '1. The 2-Note Engine (3rd & 7th on the D and G Strings)',
        body: 'In a Dm7 → G7 → Cmaj7 progression, ignore the roots for a second and watch just two notes on the D and G strings: Dm7 has F (3rd) and C (7th). To play G7, KEEP F glued down and drop C by ONE fret to B! To play Cmaj7, KEEP B glued down and drop F by ONE fret to E! Two notes, one fret at a time.',
      },
      {
        heading: '2. Common Tones = Glue ("Anchor Notes")',
        body: 'Every time you keep a shared note ringing from the previous chord, your brain hears smooth continuity instead of choppy "chord jumping." In our 5-Layer Fretboard, turn on the Flow toggle to see Anchor Notes glow gold-and-emerald!',
      },
      {
        heading: '3. Shell Voicings Unlock Every Jazz & Neo-Soul Song',
        body: 'Add a simple bass root on the low E or A string underneath those two D/G-string guide tones and you have a 3-note Shell Voicing. Every jazz, neo-soul, R&B, and peaceful fingerstyle arrangement is built on top of this exact 3-note skeleton.',
      },
    ],
    workedTitle: 'The 1-Fret Domino Effect in a ii7 → V7 → Imaj7',
    workedKey: { tonic: 'C', minor: false },
    worked: [
      { move: 'Dm7 (D – F – C)', anchor: 'Start position', shift: 'F = b3, C = b7', why: 'Warm minor-7th tension ready to tip forward.' },
      { move: 'Dm7 → G7 (G – F – B)', anchor: 'F stays glued!', shift: 'C drops 1 fret → B (3rd of G7)', why: 'Creates the classic tritone (F + B) demanding resolution.' },
      { move: 'G7 → Cmaj7 (C – E – B)', anchor: 'B stays glued!', shift: 'F drops 1 fret → E (3rd of Cmaj7)', why: 'Effortless resolution — zero awkward hand jumps!' },
    ],
    demos: [
      { label: 'ii7 → V7 → Imaj7 (Watch the 1-fret guide-tone glide)', chords: [{ semi: 2, suffix: 'm7' }, { semi: 7, suffix: '7' }, { semi: 0, suffix: 'maj7' }], note: 'Listen to the inner voice gently stepping down half-step by half-step.' },
      { label: 'Full 4-Chord Guide Cascade (vi7 → ii7 → V7 → Imaj7)', chords: [{ semi: 9, suffix: 'm7' }, { semi: 2, suffix: 'm7' }, { semi: 7, suffix: '7' }, { semi: 0, suffix: 'maj7' }], note: 'Notice how calm and connected it feels compared to jumping barre chords.' },
    ],
    mistakes: [
      { wrong: 'Strumming full 6-string root-position barre chords on every change.', right: 'Use 3-note shells (Root + 3rd + 7th) so the bass, harmony, and melody all breathe.' },
      { wrong: 'Lifting all four fingers off the neck between chords.', right: 'Spot the Anchor Note first — keep that finger planted and pivot the others around it.' },
    ],
    videos: [
      { id: '9ppYNb8_CUg', teacher: 'marbinmusic', title: 'Guide Tones: The Simplest Way to Improvise Chords and Solo Within Changes', watchFor: 'Tracking only the 3rd and 7th, for chords and for solo lines.' },
      { id: '1tThogfLBW0', teacher: 'Jens Larsen', title: 'Jazz Chord Essentials: Shell Voicings', watchFor: 'The 3-note shells on the E and A strings that move by one fret.' },
      { id: 'hXKx5ctsvJw', teacher: 'Jamey Arent', title: 'Voice Leading the ii-V-I: Connect Your Chords', watchFor: 'The 7th dropping to the 3rd, chord after chord, on a real ii – V – I.' },
      { id: 'WSPiHgoghjs', teacher: 'LoG', title: 'Quickies #9: Connecting Lines Through Chords', watchFor: 'Log connects a line through the changes by stepping to the nearest chord tone: guide tones as a melody.' },
    ],
  },
  {
    id: 'ch3-peaceful',
    num: 3,
    title: 'Peaceful Voicings & Drop-2 Flow',
    subtitle: 'Stacking add9, maj7, m9 & inner-voice motion into lush cinematic guitar chords',
    minutes: 25,
    minorDefault: false,
    pathId: 'peaceful-open',
    practicePreset: { texture: 'peaceful', level: 'intermediate', zone: 'open' },
    courseLinks: [
      { id: 'c5-ext', label: 'Level 5: 9ths, 11ths & 13ths' },
      { id: 'c5-colours', label: 'Level 5: Sus, add & colour chords' },
    ],
    whyItSoundsGreat:
      'This is the exact heart of Mauricio Murúa’s "Peaceful" sound: take the smooth guide-tone skeleton from Chapter 2, spread the notes out like a piano (Drop-2 voicings or open-string drones), add a shimmering 9th or major 7th on top, and let ONE inner string move like a mini melody while the rest rings out.',
    deepDive: [
      {
        heading: '1. Why "Spread" Voicings Sound 10× More Open',
        body: 'Standard stacked chords put notes cramped right next to each other. Drop-2 voicings and open-string hybrids leave air between the bass note and the upper melody — just like a grand piano played with both hands. Even a plain C major becomes magical as Cadd9 or Cmaj7 with an open B or E ringing on top.',
      },
      {
        heading: '2. The Top-Note Melody Rule',
        body: 'Your ear always follows the HIGHEST note you play. When you walk around the Circle of Fifths, try keeping the top string note either singing a slow stepwise melody (going down scale-wise) OR staying on a shimmering pedal note while the chords change underneath!',
      },
      {
        heading: '3. Moving One Inner Voice Inside a Single Bar',
        body: 'Before even changing chords, lift or slide ONE finger by a fret (like turning Em9 → Em7, or Cadd9 → Cmaj7). That subtle inner motion makes solo guitar sound like two instruments playing together.',
      },
    ],
    workedTitle: 'Peaceful Voicing Colour Upgrades Around I → vi → ii → V',
    workedKey: { tonic: 'C', minor: false },
    worked: [
      { move: 'I → Imaj7 / Iadd9', anchor: 'Root + 5th ring warm', shift: 'Add 9th (2 frets up from root) on high string', why: 'Instant shimmering acoustic/clean-electric glow.' },
      { move: 'vi → vi9 (e.g. Am9)', anchor: 'Keep the 9th (B) ringing!', shift: 'Only bass drops to A', why: 'Same top note turns from major 7th into minor 9th!' },
      { move: 'ii → ii7 / ii9 (Dm9)', anchor: 'Smooth inner drop', shift: '3rd & 7th lock in the pocket', why: 'Sets up the gentle tension before V.' },
      { move: 'V → V9sus4 → V7', anchor: 'Suspend the 4th first', shift: 'Resolve 4th → 3rd right before bar 1', why: 'Classic peaceful delay-and-release cadence.' },
    ],
    demos: [
      { label: 'Peaceful Open Loop (Iadd9 → vi9 → ii7 → V7)', chords: [{ semi: 0, suffix: 'add9' }, { semi: 9, suffix: 'm9' }, { semi: 2, suffix: 'm7' }, { semi: 7, suffix: '7' }], note: 'Hear how lush the 9ths make a classic 4-chord progression sound.' },
      { label: 'Drop-2 Cycle of 4ths (Imaj7 → IVmaj7 → viiø7 → iii7)', chords: [{ semi: 0, suffix: 'maj7' }, { semi: 5, suffix: 'maj7' }, { semi: 11, suffix: 'm7b5' }, { semi: 4, suffix: 'm7' }], note: 'Every chord flows effortlessly along the neck.' },
    ],
    mistakes: [
      { wrong: 'Muting adjacent open strings by laying your fingers flat.', right: 'Arch your fingertips so open strings and upper colour notes ring like a harp.' },
      { wrong: 'Playing every note at the exact same loud volume.', right: 'Play the bass softly with the thumb and let the highest melody note sing slightly louder.' },
    ],
    videos: [
      { id: 'UkatcvIuF4U', teacher: 'Signals Music Studio', title: 'How To Arrange Chords into Beautiful 4-Part Harmonies', watchFor: 'Each string as a singer moving by the smallest step.', parts: [{ at: 111, what: 'Basic concepts' }, { at: 375, what: 'Arranging in 3 voices' }, { at: 790, what: 'Arranging in 4 voices' }, { at: 980, what: 'Make it into music' }] },
      { id: 'hSWHyJ6mrzg', teacher: 'LoG', title: 'Power Ups #20: Chord Inversions (Part 1)', watchFor: 'Finding the inversion closest to where your hand already is.' },
      { id: 'QPuRjy7Re8k', teacher: 'Phil Sargent', title: 'Voice Leading Drop-2 Voicings Through the Cycle of 4ths', watchFor: 'Drop-2 grips walking the cycle of 4ths with tiny moves.' },
      { id: 'j39gPN-3scA', teacher: 'Tim Lerch', title: 'How To Get Inner Voice Movement in Your Chords', watchFor: 'Moving one inner voice inside a grip for that solo-guitar sound.' },
    ],
  },
  {
    id: 'ch4-arpeggios',
    num: 4,
    title: 'One-Box Arpeggios & String-Skipping ("Twisters")',
    subtitle: 'Playing every chord of the Circle inside one 4-fret zone — plus melodic wide leaps',
    minutes: 25,
    minorDefault: true,
    pathId: 'minor-gravity',
    practicePreset: { texture: 'arpeggio', level: 'intermediate', zone: 'mid' },
    courseLinks: [
      { id: 'c6-arps', label: 'Level 6: Arpeggios in CAGED' },
      { id: 'c6-arp7', label: 'Level 6: 7th arpeggios in one position' },
    ],
    whyItSoundsGreat:
      'When you hear Mauricio Murúa’s viral "Circle of Arpeggios" or "Twister" clips, he isn’t playing random scale runs — he is outlining EACH chord’s 1–3–5–7 arpeggio in ONE neck position as the Circle turns underneath. Because he skips strings instead of walking adjacent strings, the melody leaps gracefully like a harp or cello suite.',
    deepDive: [
      {
        heading: '1. The One-Position Discipline',
        body: 'Pick ONE 4-fret neighborhood (say frets 5–8). Every single chord in the key — all 7 of them! — lives right inside those 4 frets. Practicing a Circle of 4ths progression without ever leaving frets 5–8 forces you to truly SEE the chord tones instead of relying on one memorized root shape.',
      },
      {
        heading: '2. Connecting Arpeggios at the Bar Line (Nearest Chord Tone)',
        body: 'When beat 4 ends on a note of Chord A, don’t jump back to the root of Chord B! Step to the NEAREST chord tone of Chord B (usually just 1 or 2 frets away). That is how jazz legends and modern fingerstyle players weave seamless unbroken lines.',
      },
      {
        heading: '3. String-Skipping ("Twister" Architecture)',
        body: 'Take any 4-note chord grip and instead of picking strings 5–4–3–2 in order, pick 5 → 3 → 4 → 2 (or 6 → 3 → 5 → 2). Instantly your arpeggio leaps in wide 6ths and 10ths — dramatic, modern, and hypnotic to listen to.',
      },
    ],
    workedTitle: 'Inside One Box (Frets 5–8) Across the Minor Circle of 4ths',
    workedKey: { tonic: 'A', minor: true },
    worked: [
      { move: 'Bar 1: Am7', anchor: 'Fret 5–8 zone', shift: 'Outline A – C – E – G', why: 'Lock your index finger on fret 5 as home anchor.' },
      { move: 'Bar 2: Dm7', anchor: 'C & A stay inside the box!', shift: 'Only add D & F (1 fret shift)', why: 'Zero shifting up or down the neck.' },
      { move: 'Bar 3: G7', anchor: 'F & D stay inside the box!', shift: 'C drops 1 fret → B', why: 'The arpeggio itself sings the guide-tone resolution!' },
      { move: 'Bar 4: Cmaj7', anchor: 'G & B stay inside the box!', shift: 'F drops 1 fret → E', why: 'Clean resolution — ready to loop straight into Fmaj7 → Bm7b5 → E7!' },
    ],
    demos: [
      { label: 'Circle of Arpeggios Progression (i → iv → VII → III → VI → iiø → V7)', chords: [{ semi: 0, suffix: 'm7' }, { semi: 5, suffix: 'm7' }, { semi: 10, suffix: '7' }, { semi: 3, suffix: 'maj7' }, { semi: 8, suffix: 'maj7' }, { semi: 2, suffix: 'm7b5' }, { semi: 7, suffix: '7' }], note: 'Try hitting Practice Mode → Circle Etude (Arpeggio or String-Skipper) to play this live!' },
    ],
    mistakes: [
      { wrong: 'Always starting every arpeggio on its lowest root note on beat 1.', right: 'Start on the 3rd, 5th, or 7th nearest to where your last note finished.' },
      { wrong: 'Rushing string skips with tense picking.', right: 'Use slow Wait-for-Me mode at 60% speed first; keep your wrist relaxed and let notes ring.' },
    ],
    videos: [
      { id: '5w9xeadMZDA', teacher: 'Mauricio Murúa', title: 'Guitar Circle of Arpeggios', watchFor: 'How each arpeggio flows into the next around the circle.' },
      { id: 'L_La1p8Nq9A', teacher: 'LoG', title: 'Power Ups #21: Small Arpeggios (Part 1)', watchFor: 'Small 3- and 4-note arpeggio cells that link across chord changes in one area.' },
      { id: 'PXpTyCGLIKU', teacher: 'LoG', title: 'Quickies #22: Circle Progressions In Your Licks', watchFor: 'Log turns a circle progression into licks: the lines follow the chords round the wheel.' },
      { id: 'qUoV6l19jZE', teacher: 'Dan Cosley', title: 'CAGED 7th Arpeggios + Circle of Fourths', watchFor: 'Staying in one CAGED area while the chords move round the circle of 4ths.' },
    ],
  },
  {
    id: 'ch5-outside',
    num: 5,
    title: 'Stepping Outside the Slice',
    subtitle: 'Harmonic Minor V7, Secondary Dominants, Borrowed Chords & Tritone Subs',
    minutes: 25,
    minorDefault: false,
    pathId: 'secdom-chain',
    practicePreset: { texture: 'peaceful', level: 'intermediate', zone: 'mid' },
    courseLinks: [
      { id: 'c7-minor', label: 'Level 7: Harmonic minor' },
      { id: 'c7-secdom', label: 'Level 7: Secondary dominants' },
      { id: 'c7-tritone', label: 'Level 7: Tritone substitutions' },
    ],
    whyItSoundsGreat:
      'Staying strictly inside the 6 diatonic chords is pleasant, but stepping ONE wedge outside the key slice creates goosebumps. On the Circle of Fifths, EVERY pro "outside" trick has a dead-simple visual rule you can spot at a glance.',
    deepDive: [
      {
        heading: '1. Secondary Dominants ("Look 1 Click Clockwise, Make It a 7th")',
        body: 'Want a dramatic pull into ANY chord in your key — say Am (vi) in C major? Find Am on the Circle, look ONE click clockwise (E), and play E7! That E7 borrows a G# from outside the key to pull magnetically into Am. Chain them together (A7 → D7 → G7 → C) for a soaring Circle-of-5ths dominant waterfall!',
      },
      {
        heading: '2. The Harmonic Minor V7 (Why Mauricio’s Minor Loops Snap Home)',
        body: 'In natural E minor, the 5-chord is soft Bm7. Swap it for B7 (raising D → D# from Harmonic Minor) and you literally step outside the slice to create a razor-sharp 1-fret pull (D# → E) right back home.',
      },
      {
        heading: '3. Tritone Substitution ("Jump Straight Across the Wheel!")',
        body: 'Look directly OPPOSITE G7 across the Circle of Fifths: you land on Db7. Mind-blowing trick: G7 and Db7 share the EXACT SAME 3rd and 7th guide tones (B and F — just swapped)! So in Dm7 → G7 → Cmaj7, swap G7 for Db7 and your bass glides down chromatically by half-steps: D → Db → C!',
      },
      {
        heading: '4. Borrowed Parallel Minor Chords (Shift 3 Clicks Counter-Clockwise)',
        body: 'Want instant movie-soundtrack nostalgia in a major key? Reach 3 clicks counter-clockwise into your parallel minor to grab iv (Fm in C) or ♭VI (Ab) or ♭VII (Bb).',
      },
    ],
    workedTitle: '3 Instant Outside-the-Slice Visual Moves',
    workedKey: { tonic: 'C', minor: false },
    worked: [
      { move: 'V7/ii: A7 → Dm7', anchor: 'G (b7 of A7) drops to F', shift: 'C# (outside!) pulls 1 fret up → D', why: 'Bright gospel/jazz spark heading into the ii chord.' },
      { move: 'Tritone Sub: Dm7 → Db7 → Cmaj7', anchor: 'F & B stay glued (the same two guide tones in both chords)', shift: 'Bass glides D → Db → C', why: 'Directly across the Circle — identical guide tones, silky chromatic bass.' },
      { move: 'Borrowed iv: Fmaj7 → Fm7 → Cmaj7', anchor: 'F & C stay glued', shift: 'A drops 1 fret → Ab → G', why: 'That classic bittersweet "Beatles / film score" heart-tug.' },
    ],
    demos: [
      { label: 'Chained Secondary Dominants (C → A7 → D7 → G7 → C)', chords: [{ semi: 0, suffix: 'maj7' }, { semi: 9, suffix: '7' }, { semi: 2, suffix: '7' }, { semi: 7, suffix: '7' }, { semi: 0, suffix: 'maj7' }], note: 'Hear each dominant 7th tug the progression one click counter-clockwise!' },
      { label: 'Tritone Sub Glide (Am7 → Dm7 → Db7 → Cmaj7)', chords: [{ semi: 9, suffix: 'm7' }, { semi: 2, suffix: 'm7' }, { semi: 1, suffix: '7' }, { semi: 0, suffix: 'maj7' }], note: 'Listen to that smooth chromatic bass line sliding straight into Home.' },
      { label: 'Borrowed Minor iv (Cmaj7 → E7 → Am7 → Fm7 → Cmaj7)', chords: [{ semi: 0, suffix: 'maj7' }, { semi: 4, suffix: '7' }, { semi: 9, suffix: 'm7' }, { semi: 5, suffix: 'm7' }, { semi: 0, suffix: 'maj7' }], note: 'Secondary dominant + borrowed iv in one dreamy progression.' },
    ],
    mistakes: [
      { wrong: 'Playing your home major scale blindly right over a secondary dominant.', right: 'Target the ONE altered note (like G# on E7, or C# on A7) — that single note is the magic!' },
      { wrong: 'Thinking Tritone Subs require weird theory math.', right: 'Just jump directly across the Circle — or play the dominant 7th ONE fret above your target chord!' },
    ],
    videos: [
      { id: 'py4HaueW50Q', teacher: 'Signals Music Studio', title: 'Secondary Dominants: Write Better Chord Progressions', watchFor: 'A V7 before any chord of the key, and how each one resolves.', parts: [{ at: 128, what: 'Secondary dominants' }, { at: 322, what: 'V7/IV' }, { at: 407, what: 'V7/V' }, { at: 469, what: 'V7/vi and resolving tricks' }] },
      { id: '7IdttvJSedg', teacher: 'Signals Music Studio', title: 'Writing Progressions with Borrowed Chords', watchFor: 'Borrowing iv, ♭VI and ♭VII from the parallel minor, the bittersweet colours.' },
      { id: 'TkG_3UNNAH0', teacher: 'LoG', title: 'Playing over a Minor 4', watchFor: 'What to play when the IV turns minor (the borrowed iv), with a backing track.' },
      { id: 'nBLIWx0bia4', teacher: 'LoG', title: 'Playing over the "5 of" a Minor Chord', watchFor: 'The harmonic-minor V7 going home to i: which notes make it pull.' },
      { id: 'NlqvZ0Q_Wpk', teacher: 'Jens Larsen', title: 'Tritone Substitution Is a Really Great Hack', watchFor: 'Why the chord across the circle shares the same 3rd and 7th.', parts: [{ at: 48, what: 'What is a tritone sub?' }, { at: 157, what: 'Tritone subs in progressions' }, { at: 204, what: 'Scales and arpeggios' }, { at: 485, what: 'Turning it into altered lines' }] },
    ],
  },
  {
    id: 'ch6-pro',
    num: 6,
    title: 'Thinking Like a Pro: 12 Keys, Modulating & Soloing',
    subtitle: 'Turning the Circle into your daily fretboard workout, songwriting engine, and soloing radar',
    minutes: 30,
    minorDefault: false,
    pathId: 'tritone-glide',
    practicePreset: { texture: 'twister', level: 'pro', zone: 'mid' },
    courseLinks: [
      { id: 'c7-keys', label: 'Level 7: Key centres & modulations' },
      { id: 'c6-targets', label: 'Level 6: Targeting chord tones' },
      { id: 'c8-overchord', label: 'Level 8: What to play over any chord' },
    ],
    whyItSoundsGreat:
      'Once the Circle is in your ears and hands, you stop memorizing isolated shapes in "guitar keys" (G, A, E, C) and unlock ALL 12 keys equally. You can take any 1-bar lick, triad, or voicing, spin it around the Circle of 4ths, and wire it into permanent muscle memory in 5 minutes a day.',
    deepDive: [
      {
        heading: '1. The 5-Minute 12-Key Workout (How Berklee & Session Pros Practice)',
        body: 'Never practice a new chord voicing or lick in just one key! Take ONE shape and run it counter-clockwise around the Circle: C → F → Bb → Eb → Ab → Db → Gb → B → E → A → D → G. Because adjacent keys are a 4th apart, you can’t just slide up 1 fret mechanically — your brain actually learns every note on the neck!',
      },
      {
        heading: '2. Seamless Key Changes Using Pivot Chords',
        body: 'Want to modulate smoothly from C major to G major (1 click away)? Pick a chord they BOTH share — like Am (vi in C, ii in G) — then drop D7 (V7 of G) and land on G! The Circle immediately shows which keys share 4 chords (1 click away = invisible modulation) vs. 0 chords (across the wheel = dramatic film-score shock).',
      },
      {
        heading: '3. Soloing Over Circle Changes: Target the Moving Note',
        body: 'When soloing over a Circle progression, you don’t need a fancy new scale for every bar. Play your melodic phrasing, and on beat 1 of each chord change, land squarely on the 3rd of the new chord (the note that just dropped by 1 fret!). Listeners immediately hear the entire chord progression in your solo alone.',
      },
    ],
    workedTitle: 'The Pro 3-Step Daily Circle Routine (10 Minutes Total)',
    worked: [
      { move: 'Min 1–3: Guide-Tone Shells', anchor: 'D & G strings only', shift: 'Run ii–V–I around the wheel', why: 'Warms up harmonic ears and 1-fret voice leading.' },
      { move: 'Min 4–7: One-Box Arpeggio / Twister', anchor: 'Stay in frets 5–9', shift: 'Switch keys or run Minor Gravity', why: 'Locks every chord tone into one fretboard view.' },
      { move: 'Min 8–10: Pocket Band Solo', anchor: 'Target the 3rd on beat 1', shift: 'Open 5-Layer Flow + Circle GPS', why: 'Turns theory straight into real music!' },
    ],
    demos: [
      { label: 'Smooth Pivot Modulation (C → Am7 → D7 → Gmaj7)', chords: [{ semi: 0, suffix: 'maj7' }, { semi: 9, suffix: 'm7' }, { semi: 2, suffix: '7' }, { semi: 7, suffix: 'maj7' }], note: 'Am7 lives in BOTH C major and G major — it pivots seamlessly into a brand-new key!' },
      { label: 'Chaining ii–V–Is Around the Wheel (Dm7 → G7 → Cmaj7 → Cm7 → F7 → Bbmaj7)', chords: [{ semi: 2, suffix: 'm7' }, { semi: 7, suffix: '7' }, { semi: 0, suffix: 'maj7' }, { semi: 0, suffix: 'm7' }, { semi: 5, suffix: '7' }, { semi: 10, suffix: 'maj7' }], note: 'Turn the I chord minor (Cmaj7 → Cm7) and suddenly it becomes the ii of the next key!' },
    ],
    mistakes: [
      { wrong: 'Only practicing in C, G, D, A, and E.', right: 'Use our 12-Key Wheel Challenge in Practice Mode — flat keys (Bb, Eb, Ab, Db) are where your fretboard really opens up.' },
      { wrong: 'Playing too fast before your ears predict the next chord.', right: 'Sing or hum the 3rd of the next chord before you fret it — that connects your ear directly to your fingers.' },
    ],
    videos: [
      { id: 'wlnY0JnIWEc', teacher: 'Chris Sherland', title: 'Circle Of Fifths Workout!', watchFor: 'Turning any chord, triad or riff into a 12-key drill.', parts: [{ at: 120, what: 'The lesson' }] },
      { id: 'RhnvpxY-Lkk', teacher: 'Chris Sherland', title: 'ii – V – I Turnarounds Around the Circle of Fifths', watchFor: 'Chaining ii – V – Is through all 12 keys without thinking too hard.', parts: [{ at: 196, what: 'The lesson' }] },
      { id: 'A2qo0gK86Yg', teacher: 'LoG', title: 'Power Ups #18: Playing Over Changes (Part 1)', watchFor: 'A constant line through every chord, landing on chord tones as they change.' },
      { id: '4hGhTlEpa94', teacher: 'LoG', title: 'Quickies #12: Smooth Key Changes', watchFor: 'Moving a line from one key to the next so the change sounds smooth.' },
      { id: 'Vxac3hHrxg8', teacher: 'Signals Music Studio', title: 'Intro to Modulations and Key Changes', watchFor: 'Pivot chords and direct changes, with the circle as the map.' },
    ],
  },
]

const DONE_KEY = 'kg:circleChaptersDone'
export function loadDoneChapters(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(DONE_KEY) ?? '[]') as unknown
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []
  } catch { return [] }
}
export function toggleDoneChapter(id: string): string[] {
  const cur = loadDoneChapters()
  const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]
  try { localStorage.setItem(DONE_KEY, JSON.stringify(next)) } catch { /* full */ }
  return next
}
