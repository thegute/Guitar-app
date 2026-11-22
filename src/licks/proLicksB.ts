// Pro Licks Pack B (50 authentic working-pro signature licks across Pop/Soul, Funk, Jazz, Blues, Rock, Alt Rock, Metal & Modern Prog/Math).
// Appended after CLASSIC_LICKS in library.ts so zero existing licks are modified or shifted.
import type { LickStyleId } from './styles'
import type { ProLick } from './proLicksA'

const P = (
  style: LickStyleId,
  ref: string,
  list: (Omit<ProLick, 'style' | 'ref'> & { ref?: string })[],
  minor?: boolean,
): ProLick[] => list.map(l => ({ style, ref, ...(minor !== undefined && l.minor === undefined ? { minor } : {}), ...l }))

export const PRO_LICKS_B: ProLick[] = [
  // ───────────────────────── Pop & Soul (5)
  ...P('popsoul', 'C', [
    {
      id: 'pro-ps-motown-line', name: 'Motown sunny harmony hook', level: 1, kind: 'lick', chord: 'C | F', bpm: 102,
      tab: 'e 4:10 3:9 2:8 2:10 1:8 2:10 2:8 3:9 | q 4:10 e 3:10 2:10 h 2:10~',
      must: {
        about: 'Classic Detroit Motown guitar hook: dances briskly up the C major triad with a joyful 6th (A) on top, then locks warmly onto the IV chord (F).',
        steps: ['Start at fret 8 position: D-10 (C), G-9 (E), B-8 (G), B-10 (A), e-8 (C), and step cleanly back down.', 'In bar 2, anchor C (D-10) and step straight onto F+A (G-10, B-10) with warm vibrato.'],
        tip: 'Keep the notes slightly detached and bouncy like a Motown studio horn section.',
        use: 'Upbeat pop, soul, and R&B intros or chorus hooks in C.', goal: 102,
      },
    },
    {
      id: 'pro-ps-mayfield-lift', name: 'Curtis Mayfield parallel-triad gospel lift', level: 2, kind: 'double-stop', ref: 'G', chord: 'G | Am | Bm | C', bpm: 84,
      tab: 'q 4:5+3:4+2:3 4:7+3:5+2:5 4:9+3:7+2:7 4:10+3:9+2:8 | q 4:9+3:7+2:7 4:7+3:5+2:5 h 4:5+3:4+2:3~',
      must: {
        about: 'Curtis Mayfield’s uplifting Chicago-soul trademark: climbs straight up harmonized diatonic triads (I → ii → iii → IV) on the middle three strings and floats gently home.',
        steps: ['Start on G triad (D-5, G-4, B-3), step up to Am (7–5–5), Bm (9–7–7), and C (10–9–8).', 'Walk smoothly back down Bm → Am → G in bar 2 and let the warm G triad bloom.'],
        tip: 'Strum gently with your thumb or soft pick so all three strings blend like warm organ voices.',
        use: 'Soulful intros, bridges, and emotional lifts in G major.', goal: 84,
      },
    },
    {
      id: 'pro-ps-silk-octave', name: 'Silk Sonic smooth 70s octave hook', level: 2, kind: 'riff', ref: 'A', chord: 'Am7 | D9', bpm: 94, minor: true,
      tab: 'e 5:7+3:9 5:10/+3:12 q 5:12+3:14 e 5:10+3:12 5:7+3:9 q 5:5+3:7 | q 5:7+3:9 e 5:10+3:12 5:7+3:9 h 5:5+3:7~',
      must: {
        about: 'Silky 70s retro-soul octave lead (Bruno Mars / Silk Sonic / George Benson flavour): glides crisp octaves across the A and G strings with muted D-string damping.',
        steps: ['Grip A-7 + G-9 (E octave) with index & pinky while lightly muting the D string with your index finger.', 'Slide smoothly up to G (10–12) and A (12–14), then answer back down to D (5–7).'],
        tip: 'Keep your index finger gently touching the D string so only the two octave notes ring clean and silky.',
        use: 'Chorus hooks and smooth retro-pop/soul breaks in Am.', goal: 94,
      },
    },
    {
      id: 'pro-ps-cropper-stax', name: 'Steve Cropper Stax syncopated horn-answer', level: 2, kind: 'lick', ref: 'G', chord: 'G | C', bpm: 100,
      tab: 'q r e 3:4+1:3 3:5+1:5 q 3:7+1:7 r | e 3:5+1:5 3:4+1:3 q 3:2+1:2 h 3:4+1:3~',
      must: {
        about: 'Memphis Stax soul economy (Steve Cropper style): leaves beat 1 wide open for the singer, then answers with three punchy, razor-tight 6th stabs.',
        steps: ['Rest beat 1 completely, then pop G-4+e-3 and G-5+e-5 into a confident beat-3 stab on G-7+e-7.', 'In bar 2, answer back down G-5+e-5, G-4+e-3, G-2+e-2, settling crisp on G-4+e-3.'],
        tip: 'Cropper’s secret is restraint — cut the beat-3 stab short on beat 4 so the groove snaps.',
        use: 'Answering vocal lines in soul, R&B, and pop-rock bands.', goal: 100,
      },
    },
    {
      id: 'pro-ps-gospel-plagal', name: 'R&B ballad gospel 4-to-1 plagal cadence', level: 1, kind: 'ending', chord: 'F | Fm | C', bpm: 74,
      tab: 'q 4:3+3:2+2:1 4:3+3:1+2:1 h 4:2+3:0+2:1~ | e 5:3 4:2 3:0 2:1 h 1:0~',
      must: {
        about: 'The heart-melting soul/R&B ballad resolution: moves from major IV (F) through borrowed minor iv (Fm — just ONE finger drops 1 fret!) straight home to C.',
        steps: ['Strum warm F (D-3, G-2, B-1) on beat 1.', 'Drop ONLY the G-string note 1 fret from G-2 (A) to G-1 (Ab) on beat 2 — hear the instant goosebumps!', 'Resolve to C (D-2, open G, B-1) and roll a gentle C arpeggio in bar 2.'],
        tip: 'Lean slightly into that G-2 → G-1 half-step drop — it is the single most emotional move in pop/soul.',
        use: 'Ballad endings and pre-chorus heart-tugs in C major.', goal: 74,
      },
    },
  ]),

  // ───────────────────────── Funk (5)
  ...P('funk', 'E', [
    {
      id: 'pro-fk-wong-ghost', name: 'Cory Wong 16th-note muted ghost pocket', level: 2, kind: 'riff', chord: 'Em7', bpm: 106, minor: true,
      tab: 's 3:7+2:8+1:7 3:x+2:x 3:x+2:x 3:7+2:8+1:7 3:x+2:x 3:9+2:8+1:7 3:x+2:x 3:x+2:x 3:7+2:8+1:7 3:x+2:x 3:9+2:10+1:10 3:x+2:x 3:x+2:x 3:7+2:8+1:7 3:x+2:x 3:x+2:x',
      must: {
        about: 'Cory Wong’s razor-sharp 16th-note Stratocaster pocket: non-stop alternating wrist motion where muted "chucks" outnumber the sparkling treble chord stabs.',
        steps: ['Keep your strumming wrist moving nonstop down-up-down-up across all 16 sixteenths.', 'Press your fretting fingers ONLY on the accented Em7 / Em9 treble stabs (G-7/B-8/e-7 and G-9/B-8/e-7).', 'Lift pressure instantly on every "x" so the dead scratches sound like a hi-hat.'],
        tip: 'Position 4 (neck + middle Strat pickups) and a super loose wrist give that rubbery snap.',
        use: 'Tight funk jams and Pocket Drummer syncopation workouts in Em.', goal: 106,
      },
    },
    {
      id: 'pro-fk-hazel-dorian', name: 'Eddie Hazel psych-funk Dorian cry', level: 2, kind: 'lick', chord: 'Em7 | A7', bpm: 88, minor: true,
      tab: 'q 2:15b e 2:15r 2:12 q 3:14b e 3:14r 3:12 | e 4:14 3:12 3:14 2:14 2:12 3:14 q 4:14~',
      must: {
        about: 'Psychedelic P-Funk lead in the style of Eddie Hazel ("Maggot Brain" / Funkadelic energy): searing high bends anchored around the bright Dorian 6th (C# on B-14).',
        steps: ['Start at fret 12 E minor box: bend B-15 up a whole step to E, release to B-12, bend G-14 up to B, release to G-12.', 'In bar 2, highlight the bright Dorian major 6th at B-14 (C#) before sliding home to E (D-14).'],
        tip: 'Add generous vibrato and fuzz/overdrive — let that B-14 Dorian note shine right over the IV chord (A7).',
        use: 'Soulful funk-rock solos over Em7 → A7 vamps.', goal: 88,
      },
    },
    {
      id: 'pro-fk-rodgers-inv', name: 'Nile Rodgers high-triad disco inversion bounce', level: 2, kind: 'riff', ref: 'A', chord: 'Am7 | D9', bpm: 114, minor: true,
      tab: 'e 3:9+2:10+1:8 3:x+2:x 3:9+2:10+1:8 3:9+2:10+1:10 3:x+2:x 3:9+2:10+1:8 q r | e 3:7+2:7+1:8 3:x+2:x 3:7+2:7+1:7 3:7+2:7+1:8 q 3:7+2:7+1:7 r',
      must: {
        about: 'Nile Rodgers’s signature "chucking" magic: tiny 3-string inversions up around frets 7–10 that sparkle above the bass and keys without ever muddying the mix.',
        steps: ['Grip high Am7 (G-9, B-10, e-8) and flick pinky onto e-10 (D = Am11!) on the upbeat.', 'Drop to D9/D7 (G-7, B-7, e-8 → e-7) in bar 2 with tight muted scratches between chops.'],
        tip: 'Strike ONLY the top 3 strings with a bright, relaxed down-up wrist flick.',
        use: 'Upbeat disco-funk, pop-funk, and Nile-style groove tracks in Am.', goal: 114,
      },
    },
    {
      id: 'pro-fk-prince-stab', name: 'Prince sharp staccato minor-9 stab & slide', level: 2, kind: 'lick', chord: 'Em9', bpm: 108, minor: true,
      tab: 'e 4:5+3:7+2:7+1:7 r 4:5+3:7+2:7+1:7 r q 2:10/ 2:12 | e 1:10 2:12 2:10 3:12 q 4:14~ r',
      must: {
        about: 'Minneapolis funk punch (Prince style): two razor-sharp staccato Em9 chord stabs answered instantly by a funky high-fret single-note slide.',
        steps: ['Snap Em9 (D-5, G-7, B-7, e-7) twice on beats 1 and 2, muting instantly on the "&" beats.', 'Slide smoothly B-10→12, snap high E-10, B-12, B-10, G-12, and land crisp on E (D-14).'],
        tip: 'Make the rests between stabs dead silent — funk is all about the gap between notes.',
        use: 'Tight funk/pop verses and solos in Em.', goal: 108,
      },
    },
    {
      id: 'pro-fk-vulf-octave', name: 'Vulfpeck syncopated octave funk break', level: 2, kind: 'riff', ref: 'D', chord: 'Dm7 | G7', bpm: 104, minor: true,
      tab: 'e 5:5 4:7 5:5 3:7 5:3 5:4 5:5 r | e 6:3 4:5 6:3 4:3 5:5 5:3 q 5:5~',
      must: {
        about: 'Bouncy Vulfpeck-style low-register funk break: interlocks snappy thumb/pick octave leaps with a chromatic walk-up into beat 4.',
        steps: ['Jump D (A-5) up to A (D-7), D (A-5), high D (G-7), then walk chromatically A-3 → 4 → 5 with a crisp rest on beat 4.', 'In bar 2, bounce low G (E-3) to its octave (D-5), dip to F (D-3), and lock back onto D (A-5).'],
        tip: 'Play tight and dry with a touch of palm mute on the low notes so it locks right onto the kick and snare.',
        use: 'Funky breakdown riffs and bass-interlocking grooves in Dm.', goal: 104,
      },
    },
  ]),

  // ───────────────────────── Jazz (5)
  ...P('jazz', 'C', [
    {
      id: 'pro-jz-parker-251', name: 'Charlie Parker bebop enclosure (ii–V–I)', level: 3, kind: 'lick', chord: 'Dm7 | G7 | Cmaj7', bpm: 132,
      tab: 'e 4:7 3:5 2:6 1:5 1:8 1:7 1:6 1:5 | e 2:8 2:6 2:5 3:7 q 3:5~ r',
      must: {
        about: 'Classic Charlie Parker bebop vocabulary over ii–V–I: rockets up the Dm7 arpeggio (A–C–F–A), weaves chromatically down G7’s b9/root/7th, and lands squarely on the 3rd of Cmaj7 (E).',
        steps: ['Bar 1 (Dm7 → G7): climb D-7, G-5, B-6, e-5, jump to e-8 (C), then walk chromatically down e-7 (B), e-6 (Bb), e-5 (A).', 'Bar 2 (G7 → Cmaj7): drop to B-8 (G), B-6 (F = 7th of G7!), then resolve 1 fret down to B-5 (E = 3rd of Cmaj7!), dipping G-7 to settle on C (G-5).'],
        tip: 'Swing the 8th notes gently and accent the off-beats ("&"s) so the line dances like a saxophone.',
        use: 'The single most useful ii–V–I vocabulary line in jazz — move it around all 12 keys on the Circle!', goal: 132,
      },
    },
    {
      id: 'pro-jz-lage-modern', name: 'Julian Lage wide-interval chord-melody', level: 3, kind: 'lick', chord: 'Cmaj7 | Am7', bpm: 108,
      tab: 'e 5:3 3:4 1:7 2:5 4:5 2:8 1:5 2:5 | e 5:0 3:5 1:8 2:5 h 4:7+3:5+2:5~',
      must: {
        about: 'Inspired by modern jazz master Julian Lage: leaps across wide 6ths, 7ths, and 10ths with crystal-clear Telecaster warmth and conversational phrasing.',
        steps: ['Open with a sweeping Cmaj7 leap: A-3 (C) → G-4 (B) → e-7 (B) → B-5 (E), then D-5 → B-8 → e-5 → B-5.', 'In bar 2, open A launches an Am7 leap up to high C (e-8), settling into a warm 3-note Am7 grip.'],
        tip: 'Let notes ring slightly into each other like a piano sustain pedal — dynamics are everything.',
        use: 'Modern jazz intros, rubato chord-melody, and lyrical ballads in C.', goal: 108,
      },
    },
    {
      id: 'pro-jz-metheny-lydian', name: 'Pat Metheny singing Lydian melodic arc', level: 2, kind: 'lick', chord: 'Cmaj7#11', bpm: 112,
      tab: 'q 3:5 e 2:5 2:7 q 1:7 e 1:5 2:7 | e 2:5 3:7 3:5 4:7 h 3:4~',
      must: {
        about: 'Pat Metheny’s wide-open American jazz sound: spotlights the soaring #11 (F# on B-7) against Cmaj7 for a bright, cinematic horizon feel.',
        steps: ['Start warm on C (G-5), step to E (B-5) and soar right onto F# (B-7) and B (e-7).', 'Float gently back down e-5 (A), B-7 (F#), B-5 (E), G-7 (D), G-5 (C), D-7 (A), landing glowing on the major 7th B (G-4).'],
        tip: 'Use smooth legato slides and minimal picking — think vocal horn line rather than guitar pattern.',
        use: 'Over Cmaj7 or Fmaj7#11 (Lydian) modern jazz and fusion vamps.', goal: 112,
      },
    },
    {
      id: 'pro-jz-ford-altered', name: 'Robben Ford altered-dominant jazz-blues line', level: 3, kind: 'turnaround', ref: 'G', chord: 'D7alt | G7', bpm: 100,
      tab: 'e 2:10 1:8 1:11 1:10 2:11 2:9 3:10 3:8 | e 4:9 3:7 3:9 2:8 h 2:8~',
      must: {
        about: 'Robben Ford’s iconic jazz-blues secret weapon: runs the D Altered scale (Eb melodic minor!) over the V7 chord for spicy #9 / b9 / b13 tension before resolving cleanly to G.',
        steps: ['Bar 1 (D7alt): play B-10 (A), e-8 (C), e-11 (Eb = b9!), e-10 (D), B-11 (Bb = b13!), B-9 (Ab = #11!), G-10 (F = #9!), G-8 (Eb = b9!).', 'Bar 2 (G7): snap directly into the sweet G major 3rd B (D-9), walk G-7, G-9, and land home on G (B-8).'],
        tip: 'Commit confidently to the outside altered notes in bar 1 — the clean landing on B (D-9) makes it sound like genius.',
        use: 'Turnaround bar (V7 → I) in sophisticated blues, fusion, and jazz jams.', goal: 100,
      },
    },
    {
      id: 'pro-jz-harris-6dim', name: 'Barry Harris 6th-diminished walking chord line', level: 3, kind: 'arpeggio', chord: 'C6 | Bdim7 | C6', bpm: 104,
      tab: 'q 4:5+3:5+2:5 4:6+3:4+2:6 4:7+3:5+2:8 4:9+3:7+2:9 | q 4:10+3:9+2:8 4:9+3:7+2:9 h 4:7+3:5+2:8~',
      must: {
        about: 'Jazz educator Barry Harris’s legendary 6th-diminished chord scale: alternates C6 inversions with passing Bdim7 voicings so every single scale note can be harmonized as a rich 3-note chord.',
        steps: ['Walk up the D–G–B strings: C6 (5–5–5) → Bdim7 (6–4–6) → C6 (7–5–8) → Bdim7 (9–7–9).', 'Peak on C6 (10–9–8), step back through Bdim7 (9–7–9), and settle warmly on C6 (7–5–8).'],
        tip: 'Listen to the top B-string melody (E → F → G → A → G → A → G) — it sounds like a swinging big-band horn section.',
        use: 'Jazz comping, chord-melody, and lush Circle-of-Fifths voice leading in C.', goal: 104,
      },
    },
  ]),

  // ───────────────────────── Blues (5)
  ...P('blues', 'A', [
    {
      id: 'pro-bl-green-cry', name: 'Peter Green aching minor-blues cry & space', level: 2, kind: 'lick', chord: 'Am7', bpm: 66, minor: true,
      tab: 'q. 2:10b e 2:10r q 2:8~ r | e r 3:9 3:7 3:5 h 4:7~',
      must: {
        about: 'Fleetwood Mac founder Peter Green’s haunting British blues phrasing: devastating restraint, slow crying bends, and deep vocal vibrato on the root.',
        steps: ['Start on B-10 (A) — wait, in A minor at fret 8/10: bend B-10 up a whole step to B (9th cry!), release softly, hold G (B-8) with wide vibrato.', 'Leave beat 4 completely silent.', 'In bar 2, exhale gently down G-9 (E), G-7 (D), G-5 (C), landing tenderly on A (D-7).'],
        tip: 'Roll your guitar volume down to 7 and let the quiet notes whisper — dynamics make Peter Green’s tone weep.',
        use: 'Slow minor blues ballads (like "Thrill Is Gone" / "Black Magic Woman" grooves).', goal: 66,
      },
    },
    {
      id: 'pro-bl-collins-snap', name: 'Albert Collins ice-pick finger-snap bite', level: 2, kind: 'lick', chord: 'A7', bpm: 108,
      tab: 'e r 1:8 1:5 2:8 q 1:5 1:8~ | e 1:8b 1:5 2:8 2:5 q 3:5h 4:7~',
      must: {
        about: 'The "Master of the Telecaster" Albert Collins’s biting finger-plucked snap: sharp, percussive high-E stabs popped with bare fingers for razor-edged Texas attack.',
        steps: ['Rest beat 1, then snap high E-8 (C), e-5 (A), B-8 (G), e-5, and pop e-8 short with fierce vibrato.', 'In bar 2, yank a sharp whole-step bend on e-8, drop through e-5, B-8, B-5, and punch G-5→A (D-7).'],
        tip: 'Pluck upward with your bare index finger so the string snaps back against the fretboard like an ice pick!',
        use: 'Cutting through a loud blues band over A7 shuffle or funk-blues.', goal: 108,
      },
    },
    {
      id: 'pro-bl-rush-westside', name: 'Otis Rush West-Side aching vibrato drop', level: 2, kind: 'lick', chord: 'Am7 | Dm7', bpm: 72, minor: true,
      tab: 'q 1:8b e 1:8r 1:5 q 2:8b 2:8~ | e 2:5 3:7 3:5 4:7 h 4:7~',
      must: {
        about: 'Chicago West-Side minor blues (Otis Rush & Magic Sam lineage): fierce, pleading bends on the top two strings that inspired Clapton, Santana, and SRV.',
        steps: ['Bend e-8 (C) up a whole step to D, release cleanly to e-5 (A).', 'Immediately push B-8 (G) up to A and hold it trembling with wide wrist vibrato.', 'In bar 2, drop calmly through B-5, G-7, G-5, landing strong on A (D-7).'],
        tip: 'Hold the peak of the bend for an extra split second before shaking it — that suspense creates the West-Side ache.',
        use: 'Slow 12-bar minor blues solos in Am.', goal: 72,
      },
    },
    {
      id: 'pro-bl-gallagher-tear', name: 'Rory Gallagher fierce open-string pull-off tear', level: 2, kind: 'run', ref: 'E', chord: 'E7', bpm: 124,
      tab: 'e 1:3p 1:0 2:3p 2:0 3:2p 3:0 4:2p 4:0 | e 5:2p 5:0 6:3b 6:0 h 6:0~',
      must: {
        about: 'Irish blues-rock firebrand Rory Gallagher’s raw open-position flurry: rips straight down every string in E minor pentatonic with aggressive open-string pull-offs and a snarling low-G quarter bend.',
        steps: ['Rip down the open box: e-3→0, B-3→0, G-2→0, D-2→0.', 'Keep the freight train rolling through A-2→0, tug low E-3 (G) sharply, and slam open low E.'],
        tip: 'Dig in hard with the edge of your pick — Rory’s magic lives in raw, fearless energy.',
        use: 'High-octane blues-rock turnarounds and climax runs in E.', goal: 124,
      },
    },
    {
      id: 'pro-bl-allman-major', name: 'Duane Allman / Dickey Betts singing major-pentatonic', level: 2, kind: 'lick', ref: 'A', chord: 'A | D', bpm: 100,
      tab: 'e 3:6 2:5 2:7b 2:7r 2:5 3:6 q 4:7~ | e 2:5 2:7 1:5 1:7/ 1:9 1:7 q 1:5~',
      must: {
        about: 'Allman Brothers Southern-rock sunshine: glides joyfully through A major pentatonic (A–B–C#–E–F#) with sweet country-blues bends and soaring high-string slides.',
        steps: ['Start at C# (G-6) → E (B-5), bend F# (B-7) up to G# and release smoothly back through E and C# to A (D-7).', 'In bar 2, climb B-5, B-7, e-5, slide e-7→9 (B→C#), step to B, and sing home on high A (e-5).'],
        tip: 'Keep bends sweet and dead in tune — major pentatonic shines when every pitch is vocal and bright.',
        use: 'Uplifting major-key blues, jam-band, and Southern rock solos in A.', goal: 100,
      },
    },
  ]),

  // ───────────────────────── Classic Rock (5)
  ...P('rock', 'G', [
    {
      id: 'pro-rk-keith-flick', name: 'Keith Richards suspended-chord rhythm flick', level: 1, kind: 'riff', chord: 'G | C/G', bpm: 118,
      tab: 'q 4:5+3:4+2:3 e 4:5+3:5+2:5 4:5+3:4+2:3 q 4:5+3:4+2:3 r | e 4:5+3:5+2:5 4:5+3:4+2:3 4:5+3:5+2:5 4:5+3:4+2:3 h 4:5+3:4+2:3~',
      must: {
        about: 'The unmistakable Rolling Stones rhythm hook (playable in standard tuning!): toggles between a ringing G triad and a C/G sus4 chord with just two fingers.',
        steps: ['Grip G triad on the middle strings (D-5, G-4, B-3) with ring, middle, and index.', 'Hammer/drop your pinky onto G-5 and ring/bar onto B-5 to flash C/G right on the upbeat, then snap back to G.', 'Give bar 2 a snappy double-flick swagger.'],
        tip: 'Keep your strumming hand swinging loose and slightly behind the snare — pure Stones attitude.',
        use: 'Classic rock rhythm riffs and chorus lifts over any major chord.', goal: 118,
      },
    },
    {
      id: 'pro-rk-gilmour-cry', name: 'David Gilmour soaring 1.5-step cry', level: 2, kind: 'lick', ref: 'B', chord: 'Bm | G', bpm: 68, minor: true,
      tab: 'h 2:10b3 q 2:10r 2:7~ | e r 3:9 2:7 2:10b h 2:10~',
      must: {
        about: 'Pink Floyd atmospheric lead craft: pushes a slow, haunting 1.5-step bend (from A up to C / or minor-third reach) with huge sustain and cathedral-like phrasing.',
        steps: ['Anchor B-10 with three fingers behind it (index on 8, middle on 9, ring on 10).', 'Push smoothly up 1½ steps (match fret 13 pitch!), hold it glowing for two beats, release slowly, and rest on F# (B-7).', 'In bar 2, step softly G-9, B-7, and lift B-10 a full step to B with singing delay-drenched vibrato.'],
        tip: 'Practice matching the target pitch (fret 13) first so your 1½-step bend hits dead center.',
        use: 'Epic slow rock ballads and spacious minor solos in Bm.', goal: 68,
      },
    },
    {
      id: 'pro-rk-may-thirds', name: 'Brian May operatic harmonized melody', level: 2, kind: 'lick', ref: 'G', chord: 'G | D | Em', bpm: 92,
      tab: 'e 2:8 2:10 2:12 1:10 1:12 1:10 q 2:12~ | e 2:10 2:8 3:9 2:8 q 2:10b 2:10~',
      must: {
        about: 'Queen’s theatrical melodic lead phrasing (Brian May style): crystal-clear diatonic major-scale vocal lines that soar like an orchestral trumpet.',
        steps: ['Climb cleanly in G major at fret 8: B-8 (G), B-10 (A), B-12 (B), e-10 (D), e-12 (E), back to e-10 and singing B (B-12).', 'In bar 2, curve down A, G, E (G-9), G, and lift A (B-10) a whole step to triumphant B.'],
        tip: 'Articulate every single note cleanly (Brian uses a sixpence coin!) with singing mid-range tone.',
        use: 'Anthemic melodic rock solos and harmonized guitar layers in G.', goal: 92,
      },
    },
    {
      id: 'pro-rk-carlton-9th', name: 'Larry Carlton Steely Dan 9th-chord bend', level: 3, kind: 'lick', ref: 'A', chord: 'A9 | D9', bpm: 102,
      tab: 'e 2:10 2:12b 2:12r 2:10 3:11 2:10 q 3:9~ | e 4:11 3:9 3:11 2:10 2:12b 2:12r q 2:10~',
      must: {
        about: 'Studio legend Larry Carlton’s buttery jazz-rock elegance: bends the 9th (B) smoothly up to the major 3rd (C#) over a sophisticated dominant 9th groove.',
        steps: ['Start at fret 10 (A on B-10), push B-12 (B = 9th) a full step up to C# (major 3rd!), ease down, dip to F# (G-11) and E (G-9).', 'In bar 2, answer from C# (D-11) climbing right back into that sweet B→C# bend and landing warmly on A (B-10).'],
        tip: 'Think "vocal smoothness" — use warm overdrive and roll off a little treble for that ES-335 studio sheen.',
        use: 'Classic rock-fusion, Steely Dan grooves, and classy blues-rock jams.', goal: 102,
      },
    },
    {
      id: 'pro-rk-walsh-slide', name: 'Joe Walsh sliding double-stop swagger', level: 2, kind: 'double-stop', ref: 'A', chord: 'A | G | D', bpm: 112,
      tab: 'e 3:5/+2:5 3:6+2:5 4:7 3:5/+2:5 3:6+2:5 4:7 q 3:7+2:7 | e 3:7\\+2:7 3:5+2:5 q 4:7~ h r',
      must: {
        about: 'Joe Walsh’s gritty classic-rock swagger: punches snappy G+B double-stops sliding from minor 3rd into major 3rd against a rock-solid A root.',
        steps: ['Slide G-5+B-5 quickly up into G-6+B-5 (C+E → C#+E) twice, snapping D-7 (A) between them.', 'Hit D+F# (G-7+B-7) on beat 4, then slide down in bar 2 through G-5+B-5 to anchor firmly on A (D-7).'],
        tip: 'Dig in with crunch tone and slight palm-mute on the D-7 bass punches.',
        use: 'Driving classic rock riffs and chorus fills in A.', goal: 112,
      },
    },
  ]),

  // ───────────────────────── Alt Rock (5)
  ...P('altrock', 'E', [
    {
      id: 'pro-ar-mccready-bloom', name: 'Pearl Jam Hendrix-inflected chord bloom', level: 2, kind: 'lick', chord: 'E | B | A', bpm: 78,
      tab: 'q 6:0 e 4:9h+3:9 4:11+3:9 4:9+3:9 5:11 q 6:0 | q 6:7 e 4:9h+3:8 4:11+3:8 h 4:9+3:8~',
      must: {
        about: '90s Seattle clean-Strat magic (Mike McCready / "Yellow Ledbetter" vibe): pairs open ringing bass roots with Hendrix-style hammer-ons across E and B.',
        steps: ['Strike open low E, hammer D-9→11 against G-9, pull off to D-9, and touch G# (A-11).', 'Jump to low B (E-7) in bar 2 and hammer D-9→11 against G-8 (D#) for warm chord-melody shimmer.'],
        tip: 'Clean Strat neck pickup with light reverb — let the low bass strings ring through the whole bar.',
        use: 'Emotional alt-rock intros and verse grooves in E major.', goal: 78,
      },
    },
    {
      id: 'pro-ar-frusciante-engine', name: 'John Frusciante hammer-pull arpeggio engine', level: 3, kind: 'arpeggio', ref: 'G', chord: 'Em | C', bpm: 102, minor: true,
      tab: 's 5:7 4:9 3:9 2:8h 2:10p 2:8 3:9 4:9 5:7 4:9 3:9 2:8h 2:10p 2:8 3:9 4:9 | s 5:3 4:5 3:5 2:5h 2:7p 2:5 3:5 4:5 h 5:3+4:5+3:5~',
      must: {
        about: 'Relentless Red Hot Chili Peppers clean-electric arpeggio engine: constant 16th-note waves powered by a quick hammer-pull flourish at the peak of every chord.',
        steps: ['Bar 1 (Em at fret 7): pick A-7, D-9, G-9, hammer-pull B-8→10→8, then come back down G-9, D-9 — repeat twice!', 'Bar 2 (C at fret 3): shift the exact physical pattern down to A-3, D-5, G-5, hammer-pull B-5→7→5, and ring warm on C.'],
        tip: 'Start slow at 70 BPM! Keep your picking hand tiny and relaxed — let the hammer-pull give your pick a split-second rest.',
        use: 'Stamina-building clean alt-rock arpeggio riff and verse groove.', goal: 102,
      },
    },
    {
      id: 'pro-ar-greenwood-angular', name: 'Jonny Greenwood angular chromatic lead', level: 2, kind: 'lick', chord: 'Em | Cmaj7', bpm: 108, minor: true,
      tab: 'e 3:9 2:8 2:11 2:10 3:9 2:8 3:11 3:9 | e 4:10 3:9 2:8 2:7 q 3:9~ r',
      must: {
        about: 'Radiohead’s art-rock melodic edge: twists a minor pentatonic box with sharp chromatic passing tones and unexpected interval leaps.',
        steps: ['Start E (G-9) → G (B-8), leap sharply to Bb (B-11) and drop chromatically to A (B-10) before returning to E and G.', 'Touch F# (G-11) → E, then walk down C (D-10), E, G, F# (B-7), resolving firmly on E (G-9).'],
        tip: 'Play straight (unswung) with crisp alternate picking and slight edge-of-breakup bite.',
        use: 'Moody, angular indie and alt-rock leads in Em.', goal: 108,
      },
    },
    {
      id: 'pro-ar-marr-jangle', name: 'Johnny Marr chiming arpeggio weave', level: 2, kind: 'arpeggio', ref: 'A', chord: 'Amaj7 | F#m7', bpm: 116,
      tab: 'e 5:0 3:6 2:5 1:4 2:5 3:6 1:5 2:5 | e 6:2 4:4 3:2 2:2 1:4 2:2 q 3:2~',
      must: {
        about: 'Smiths-inspired British indie jangle: weaves sparkling open strings and major-7th / sus4 top notes into a ceaseless chiming arpeggio.',
        steps: ['Ring open A while picking G-6 (C#), B-5 (E), e-4 (G# = Amaj7!), then lift to e-5 (A) and B-5.', 'In bar 2, anchor F# (E-2) and chime through D-4, G-2, B-2, kissing e-4 (G# = F#m9!) before resting on A (G-2).'],
        tip: 'Bright clean tone with light compression or chorus — keep every note ringing together like bells.',
        use: 'Chiming indie-pop and jangle-rock verses in A major.', goal: 116,
      },
    },
    {
      id: 'pro-ar-grohl-octaves', name: 'Foo Fighters driving octave-chord lift', level: 1, kind: 'riff', ref: 'D', chord: 'D | Bm | G', bpm: 132,
      tab: 'e 5:5+3:7 5:5+3:7 5:7+3:9 5:9+3:11 5:9+3:11 5:7+3:9 5:5+3:7 5:4+3:6 | q 5:2+3:4 e 5:4+3:6 5:5+3:7 h 5:10+3:12~',
      must: {
        about: 'Anthemic modern rock chorus engine: blasts soaring octave shapes up the A and G strings with relentless down-up drive.',
        steps: ['Lock your index & pinky into the octave shape (2 frets apart across A & G, muting the D string).', 'Drive from D (5–7) up to E (7–9) and F# (9–11), drop through C# (4–6) to B (2–4), and soar up to G (10–12).'],
        tip: 'Use your index fingertip to gently touch low E and its belly to mute D, B, and high E so you can strum hard without noise.',
        use: 'Huge stadium-rock chorus melodies and energetic bridges in D.', goal: 132,
      },
    },
  ]),

  // ───────────────────────── Heavy Metal (5)
  ...P('metal', 'E', [
    {
      id: 'pro-mt-friedman-exotic', name: 'Marty Friedman Hirajoshi slide bend', level: 3, kind: 'lick', chord: 'Em', bpm: 120, minor: true,
      tab: 'e 2:12 2:13 1:12 1:15b 1:15r 1:12 2:13 2:12 | e 3:14/ 3:16 2:13 2:12 h 3:14~',
      must: {
        about: 'Ex-Megadeth virtuoso Marty Friedman’s unmistakable exotic lead style: uses the Japanese Hirajoshi intervals (E–F#–G–B–C) with soaring bends and vocal slides.',
        steps: ['Play B-12 (B), B-13 (C), e-12 (E), then push e-15 (G) up a whole step to A and release smoothly back down.', 'In bar 2, slide G-14→16 (A→B), hit B-13 (C), B-12 (B), and hold dramatic vibrato on A (G-14).'],
        tip: 'Slide into bends from a half-step below for that weeping, un-guitar-like Friedman inflection.',
        use: 'Memorable melodic metal solos over Em / C / B progressions.', goal: 120,
      },
    },
    {
      id: 'pro-mt-becker-sweep', name: 'Jason Becker neoclassical triad sweep cascade', level: 3, kind: 'arpeggio', chord: 'Em | B7', bpm: 126, minor: true,
      tab: 's 3:9 2:8 1:7 1:12p 1:7 2:8 3:9 2:8 3:8 2:7 1:7 1:11p 1:7 2:7 3:8 2:7 | h 1:12~ h r',
      must: {
        about: 'Neoclassical shred elegance (Jason Becker / Yngwie lineage): glides effortlessly through compact 3-string Em and B major triads with a crisp high-E pull-off at each peak.',
        steps: ['Sweep down G-9, B-8, e-7, hammer/pick e-12 and pull off to e-7, then sweep right back up B-8, G-9.', 'Shift just 1 fret down to B major (G-8, B-7, e-7 → e-11 pull-off!) for classic harmonic-minor tension, then nail high E (e-12)!'],
        tip: 'Roll your left fingertips off each string immediately so the triad notes sound crisp like a violin, not a muddy chord.',
        use: 'Climax shred flourish over Em → B7 → Em metal progressions.', goal: 126,
      },
    },
    {
      id: 'pro-mt-hammett-flurry', name: 'Kirk Hammett wah-pentatonic 16th flurry', level: 2, kind: 'run', chord: 'Em', bpm: 136, minor: true,
      tab: 's 1:15p 1:12 2:15 2:12 1:15p 1:12 2:15 2:12 2:15p 2:12 3:14 3:12 2:15p 2:12 3:14 3:12 | q 3:14b 1:12 h 2:15b~',
      must: {
        about: 'Classic thrash-metal repeating pentatonic 4-note flurry (Metallica style): builds blistering momentum at fret 12 before exploding into a screaming unison bend.',
        steps: ['Cycle the 4-note pull-off engine twice on the top two strings: e-15→12, B-15, B-12.', 'Drop one string pair and repeat twice: B-15→12, G-14, G-12.', 'Launch into bar 2 with G-14 bend, high e-12 snap, and a huge ringing B-15 bend!'],
        tip: 'Rock a wah pedal slowly open as the flurry climbs into the bar-2 bend for instant arena thrash fire.',
        use: 'Fast thrash and hard-rock solo climaxes in E minor.', goal: 136,
      },
    },
    {
      id: 'pro-mt-iommi-doom', name: 'Tony Iommi heavy blues-doom tritone crawl', level: 1, kind: 'riff', chord: 'E5 | Bb5', bpm: 86, minor: true,
      tab: 'q 6:0+5:2 6:6+5:8 e 6:5+5:7 6:3+5:5 q 6:0+5:2 | e 6:0 6:3 6:5 6:6 6:5 6:3 q 6:0~',
      must: {
        about: 'The riff vocabulary that invented heavy metal (Black Sabbath style): slams straight from low E5 to the ominous flat-5 tritone (Bb5) and crawls heavily back home.',
        steps: ['Hammer open E5 power chord, leap straight up to the dark tritone Bb5 (E-6+A-8), step down A5 → G5 → E5.', 'In bar 2, grind a heavy single-string blues-scale crawl (0–3–5–6–5–3–0) with wide vibrato.'],
        tip: 'Use heavy distortion and slight behind-the-beat weight — doom metal hits harder when you don’t rush.',
        use: 'Heavy riffing, breakdowns, and ominous metal intros in Em.', goal: 86,
      },
    },
    {
      id: 'pro-mt-laiho-gallop', name: 'Alexi Laiho melodic-death harmonic-minor gallop', level: 3, kind: 'run', chord: 'Em | B7', bpm: 148, minor: true,
      tab: 's 1:12 1:11 1:12 1:15 1:12 1:11 1:12 1:14 1:12 1:11 1:12 1:15 1:14 1:12 1:11 2:13 | q 2:12~ 1:11 h 1:12~',
      must: {
        about: 'Finnish melodic-death metal precision (Children of Bodom style): razor-sharp alternate-picked harmonic-minor pedal line weaving around the dramatic D# (e-11) leading tone.',
        steps: ['Pivot relentlessly off e-12 (E) and e-11 (D#) while stepping the top melody up to G (e-15) and F# (e-14).', 'Dip to C (B-13) on the last 16th, hit B (B-12), flash D# (e-11), and nail high E (e-12) with fierce vibrato.'],
        tip: 'Keep pick strokes tiny and strict down-up; practice cleanly at 100 BPM before pushing to 148.',
        use: 'Aggressive neoclassical and melodic-metal leads in E harmonic minor.', goal: 148,
      },
    },
  ]),

  // ───────────────────────── Prog Metal (5)
  ...P('progmetal', 'E', [
    {
      id: 'pro-pm-govan-fusion', name: 'Guthrie Govan hybrid-picked fusion legato', level: 3, kind: 'run', chord: 'Em9', bpm: 118, minor: true,
      tab: 's 4:7h 4:9 3:7 2:7h 2:8 2:10 1:7 1:10p 1:7 2:10p 2:8 2:7 3:9 3:7 4:9 4:7 | h 3:9~ h r',
      must: {
        about: 'Virtuoso fusion legato in the style of Guthrie Govan: silky 3-note-per-string Dorian phrasing driven by hybrid picking on the string crossings so every note flows like liquid.',
        steps: ['Hammer D-7→9, pluck G-7 with your middle finger, hammer B-7→8→10, pluck e-7, jump to e-10 and pull cleanly back down.', 'Glide down B-10→8→7, G-9→7, D-9→7, and finish smoothly on singing E (G-9).'],
        tip: 'Keep your left thumb relaxed behind the neck and use minimal finger pressure so legato stays effortless.',
        use: 'Fluid modern prog-fusion and Dorian lead runs in Em.', goal: 118,
      },
    },
    {
      id: 'pro-pm-petrucci-5s', name: 'John Petrucci chromatic climb & power resolve', level: 3, kind: 'run', chord: 'Em', bpm: 132, minor: true,
      tab: 's 5:7 5:8 5:9 5:10 4:7 4:8 4:9 4:10 3:7 3:8 3:9 3:10 2:8 2:10 2:12 1:10 | h 1:12~ h r',
      must: {
        about: 'Dream Theater technical precision: rockets straight across four strings with strict alternate-picked 4-note chromatic discipline before bursting into a soaring E-minor climax.',
        steps: ['Use fingers 1–2–3–4 strictly across frets 7–8–9–10 on the A, D, and G strings.', 'Pivot seamlessly onto E minor notes on the B and high E strings (B-8, 10, 12, e-10) and land roaring on high E (e-12).'],
        tip: 'Sync every pick stroke to your fretting finger — start at 90 BPM with zero tension before cranking up.',
        use: 'Prog-metal speed builder and dramatic solo climb in Em.', goal: 132,
      },
    },
    {
      id: 'pro-pm-mansoor-djent', name: 'Misha Mansoor syncopated djent ghost-chug', level: 2, kind: 'riff', chord: 'E5 | F5', bpm: 126, minor: true,
      tab: 's 6:0m 6:0m 6:1 6:0m 6:0m 6:0m 6:3 6:0m 6:0m 6:1 6:0m 6:0m 6:0m 6:5 6:0m 6:0m | q 6:1+5:3 6:0+5:2 h r',
      must: {
        about: 'Periphery-style modern djent groove: locks heavy palm-muted open-E chugs into asymmetric 3+3+2+3+3+2 rhythmic groupings with biting Phrygian accents (F = fret 1).',
        steps: ['Palm-mute the open low E tight right over the bridge saddle.', 'Let the accented fretted notes (E-1, E-3, E-5) ring unmuted for maximum dynamic punch.', 'Slam F5 → E5 power chords on beats 1 and 2 of bar 2 and cut dead silent on beat 3!'],
        tip: 'Use a tight noise gate feel — mute the strings completely with BOTH hands during the rests.',
        use: 'Modern progressive metal rhythm grooves in E Phrygian.', goal: 126,
      },
    },
    {
      id: 'pro-pm-jones-hypnotic', name: 'Adam Jones hypnotic pull-off prog riff', level: 2, kind: 'riff', ref: 'D', chord: 'Dm', bpm: 108, minor: true,
      tab: 'e 4:0 4:10h 4:12 4:0 4:10p 4:0 4:8 4:7 | e 4:0 4:5h 4:7 4:0 4:3p 4:0 q 4:0~',
      must: {
        about: 'Tool-inspired hypnotic riff architecture: weaves crisp single-string hammer-ons and pull-offs around a ringing open D pedal tone.',
        steps: ['Strike open D, snap D-10→12, flash open D, pull off D-10→0, then walk D-8 → D-7.', 'In bar 2, mirror the exact motif lower on the neck (D-5→7, D-3→0) settling dark on open D.'],
        tip: 'Keep a punchy mid-heavy crunch tone and play locked like a hypnotic machine.',
        use: 'Dark, driving progressive rock/metal riffs in Dm.', goal: 108,
      },
    },
    {
      id: 'pro-pm-plini-skip', name: 'Plini wide string-skipping prog arpeggio', level: 3, kind: 'arpeggio', chord: 'Em9 | Cmaj9', bpm: 112, minor: true,
      tab: 'e 5:7 3:9 4:9 1:7 2:8 4:9 3:9 1:10 | e 5:3 3:5 4:5 1:7 2:5 3:5 q 1:7~',
      must: {
        about: 'Modern instrumental prog beauty (Plini style): skips strings cleanly through spacious Em9 and Cmaj9 arpeggios so every note sparkles with wide, cinematic air.',
        steps: ['Bar 1 (Em9): pick A-7 → G-9 → D-9 → e-7 → B-8 → D-9 → G-9 → e-10 (D).', 'Bar 2 (Cmaj9): jump to A-3 → G-5 → D-5 → e-7 (B = maj7!) → B-5 → G-5, lingering on glowing B (e-7).'],
        tip: 'Use a smooth neck-humbucker tone with warm delay and hybrid-pick the high-E leaps for effortless accuracy.',
        use: 'Soaring modern prog-metal and instrumental ballads in Em.', goal: 112,
      },
    },
  ]),

  // ───────────────────────── Melodic Prog (5)
  ...P('progclean', 'E', [
    {
      id: 'pro-pc-govan-micro', name: 'Guthrie Govan expressive slide & micro-bend', level: 2, kind: 'lick', chord: 'Emaj9', bpm: 88,
      tab: 'e 3:8/ 3:9 2:9 2:10bq q 2:9~ r | e 3:11 2:9 1:9/ 1:11 q 1:11~ r',
      must: {
        about: 'Guthrie Govan’s singing clean-guitar nuance: combines vocal slides with a tiny quarter-step micro-bend on the B string for unforgettable expressiveness.',
        steps: ['Slide smoothly G-8→9 (D#→E), catch B-9 (G#), give B-10 (A) a delicate quarter-step nudge, and sigh back to B-9.', 'In bar 2, float up G-11 (F#), B-9 (G#), and slide e-9→11 (C#→D# = sparkling maj7!) with sweet vibrato.'],
        tip: 'Play with a light touch and clean-to-edge breakup — tiny dynamic swells bring melodic prog alive.',
        use: 'Expressive clean melodic prog leads in E major.', goal: 88,
      },
    },
    {
      id: 'pro-pc-micic-swell', name: 'David Maxim Micic ambient add9 chord swell', level: 2, kind: 'arpeggio', chord: 'Eadd9 | C#m9', bpm: 82,
      tab: 'e 6:0 5:7 4:9 3:11 2:0 1:0 2:0 3:11 | e 5:4 4:6 3:8 2:0 1:0 2:0 q 3:8~',
      must: {
        about: 'Huge modern cinematic prog texture: stretches lush add9 voicings across the neck while open B and high E strings ring like an ambient synthesizer pad.',
        steps: ['Bar 1 (Eadd9): let open low E ring, climb A-7 (E), D-9 (B), G-11 (F# = 9th!), then bloom across open B and open high E.', 'Bar 2 (C#m9): glide down to A-4 (C#), D-6 (G#), G-8 (D# = 9th!) against those same shimmering open B and E strings!'],
        tip: 'Add lush hall reverb and dotted-8th delay — let every single string sustain together.',
        use: 'Cinematic clean-prog intros and ambient breakdowns in E.', goal: 82,
      },
    },
    {
      id: 'pro-pc-owane-lydian', name: 'Owane jazzy hybrid-picked Lydian run', level: 3, kind: 'run', ref: 'G', chord: 'Gmaj7#11', bpm: 108,
      tab: 'e 4:5 3:4 2:7 1:5 1:7 2:8 3:6 4:7 | e 3:4 2:7 1:7 1:10 h 1:10~',
      must: {
        about: 'Playful modern jazz-prog (Owane / Jakub Zytecki vibe): mixes wide Lydian intervals (C# on G-6 + F# on B-7) with bouncy hybrid-picked articulation.',
        steps: ['Climb Gmaj7#11: D-5 (G), G-4 (B), B-7 (F#), e-5 (A), e-7 (B), then weave back through B-8 (G), G-6 (C# = Lydian #11!), D-7 (A).', 'Launch bar 2 cleanly up G-4 → B-7 → e-7 → high D (e-10).'],
        tip: 'Keep the notes bouncy and slightly staccato on the wide jumps for that bright modern-fusion smile.',
        use: 'Upbeat melodic prog and modern fusion jams in G Lydian.', goal: 108,
      },
    },
    {
      id: 'pro-pc-johnston-strat', name: 'Nick Johnston clean Strat minor-9 line', level: 2, kind: 'lick', chord: 'Em9 | Cmaj7', bpm: 92, minor: true,
      tab: 'e 4:9 3:7 2:8 2:7 3:9 3:7 4:9 4:5 | e 5:7 4:5 3:7 2:7 h 2:8~',
      must: {
        about: 'Nick Johnston’s classy instrumental-Strat phrasing: highlights the aching 9th (F# on B-7) inside Em9 with glassy single-coil clarity and vocal control.',
        steps: ['Roll smoothly D-9 (B), G-7 (D), B-8 (G), B-7 (F# = 9th!), back down G-9 (E), G-7, D-9, D-5 (G).', 'In bar 2, step A-7 (E), D-5, G-7, B-7 (F#), and resolve tenderly up 1 fret to G (B-8).'],
        tip: 'Play on the neck pickup with a warm clean-plus-grit tone and subtle fingertip vibrato.',
        use: 'Lyrical modern instrumental rock and clean prog ballads in Em.', goal: 92,
      },
    },
    {
      id: 'pro-pc-henson-bounce', name: 'Tim Henson / Polyphia harmonic bounce riff', level: 3, kind: 'riff', chord: 'Em7 | Cmaj7', bpm: 112, minor: true,
      tab: 's 6:0 3:12n 2:12n 1:12n 4:9 3:7 2:8 1:7 6:0 2:10/ 2:12 1:10 2:8 3:9 4:9 3:7 | q 5:3+3:4+2:5 e 1:7n 2:7n h 1:12n~',
      must: {
        about: 'Polyphia’s viral hip-hop-meets-prog clean riff craft: snaps glassy 12th-fret and 7th-fret harmonics right alongside quick hybrid-picked arpeggio leaps and slides.',
        steps: ['Pop open low E and immediately sweep 12th-fret harmonics across G–B–e.', 'Drop into Em7 (D-9, G-7, B-8, e-7), hit open E, slide B-10→12, and tumble down e-10, B-8, G-9, D-9, G-7.', 'In bar 2, strike Cmaj7 (A-3, G-4, B-5) and sparkle 7th-fret + 12th-fret harmonics on top!'],
        tip: 'Bright clean tone with compression makes the harmonics pop at the same volume as fretted notes.',
        use: 'Modern trap-prog grooves and flashy clean riffs in Em.', goal: 112,
      },
    },
  ]),

  // ───────────────────────── Math Rock (5)
  ...P('mathrock', 'E', [
    {
      id: 'pro-mr-ttng-tap', name: 'TTNG sparkling open-string tap loop', level: 3, kind: 'arpeggio', chord: 'Emaj9 | C#m9', bpm: 116,
      tab: 'e 2:12t 2:0 2:4h 2:12t 2:0 1:11t 1:0 1:4h | e 1:12t 1:0 2:12t 2:0 3:11t 3:4p q 3:1~',
      must: {
        about: 'British math-rock twinkle (Tim Collis / TTNG style) playable right in standard tuning: right-hand taps at fret 11–12 bounce off ringing open B and E strings.',
        steps: ['Tap B-12 with right index/middle finger, pull off to open B, hammer left hand B-4 (D#!), tap B-12, pull to open.', 'Jump to high E: tap e-11 (D#), pull to open E, hammer e-4 (G#), then sparkle down e-12, B-12, and G-11 in bar 2!'],
        tip: 'Keep your tapping finger curved like a tiny hammer and pull off slightly downward so the open strings shine.',
        use: 'Twinkly math-rock intros and shimmering clean loops in E major.', goal: 116,
      },
    },
    {
      id: 'pro-mr-ichika-maj9', name: 'Ichika Nito two-hand tapped maj9 cascade', level: 3, kind: 'arpeggio', ref: 'C', chord: 'Cmaj9 | Fmaj9', bpm: 110,
      tab: 's 5:3 4:2h 3:4h 2:3h 1:7t 2:3p 3:4p 1:12t 1:7p 2:8t 2:3p 3:4 4:5 3:4 2:3 1:7t | q 6:1+4:2+3:2+2:1 e 1:8t 1:0 h 1:12t~',
      must: {
        about: 'Inspired by viral Japanese math-fingerstyle star Ichika Nito: hammers a warm Cmaj9 chord with the left hand while the right hand taps bell-like high extensions at frets 7, 8, and 12.',
        steps: ['Hammer up Cmaj9 with the left hand (A-3, D-2, G-4, B-3) and tap e-7 (B) and e-12 (E) with the right hand.', 'Weave smoothly back down through B-8 tap and G-4, then resolve into a warm Fmaj7 grip topped with e-8 and e-12 taps!'],
        tip: 'Add crisp compression and clean tone — balance the volume of left-hand hammers with right-hand taps.',
        use: 'Modern math-pop and viral clean solo-guitar compositions in C.', goal: 110,
      },
    },
    {
      id: 'pro-mr-yvette-twinkle', name: 'Yvette Young / Covet lush fingerpicked twinkle', level: 2, kind: 'arpeggio', ref: 'G', chord: 'Gmaj9 | Cadd9', bpm: 108,
      tab: 'e 6:3 4:4 3:2 1:2 2:3h 2:5 1:2 3:2 | e 5:3 4:2 3:0 1:3 2:3p 2:0 q 3:0~',
      must: {
        about: 'Covet’s bright, joyful fingerpicked math-rock style (in standard tuning): weaves lush Gmaj9 and Cadd9 voicings with sparkling B-string hammer-ons and pull-offs.',
        steps: ['Bar 1 (Gmaj9): pluck E-3, D-4, G-2, e-2, then hammer B-3→5 (D→E) and shimmer back across e-2 and G-2.', 'Bar 2 (Cadd9): pluck A-3, D-2, open G, e-3, pull B-3→0 (D→B = Cmaj7 glow!) and rest warm on open G.'],
        tip: 'Play fingerstyle (thumb + index + middle + ring) so every chord tone rings like a harp.',
        use: 'Uplifting math-rock and indie-instrumental grooves in G.', goal: 108,
      },
    },
    {
      id: 'pro-mr-delta-bounce', name: 'Delta Sleep syncopated chord-bounce riff', level: 2, kind: 'riff', ref: 'D', chord: 'Dmaj7 | Bm9', bpm: 120,
      tab: 'e 5:5+3:6+2:7 r 4:7 3:6 2:7 1:5 r 3:6 | e 6:7+4:7+3:6 r 2:7 1:5 2:7 3:6 q 4:7~',
      must: {
        about: 'Syncopated modern math-rock groove (Delta Sleep style): punches crisp maj7 chords on off-beat accents separated by snappy single-note arpeggio hops.',
        steps: ['Hit Dmaj7 (A-5, G-6, B-7), leave a crisp rest on the "&" of 1, then hop D-7, G-6, B-7, e-5.', 'In bar 2, anchor Bm9 (E-7, D-7, G-6) and bounce cleanly across B-7, e-5, B-7, G-6, settling on A (D-7).'],
        tip: 'Lean into the syncopated rests — the start-stop bounce gives math rock its infectious head-nod groove.',
        use: 'Energetic indie/math-rock verses in D major.', goal: 120,
      },
    },
    {
      id: 'pro-mr-midwest-emo', name: 'Midwest emo open-voicing hammer-pull hook', level: 2, kind: 'lick', ref: 'C', chord: 'Fmaj7 | Am7', bpm: 112,
      tab: 'e 4:3 3:2 2:0h 2:1 1:0 2:1p 2:0 3:2 | e 5:0 4:2 3:0h 3:2 2:1 1:0 q 2:0~',
      must: {
        about: 'Nostalgic Midwest-emo twinkle riff (American Football / Tiny Moving Parts spirit in standard tuning): hammers open B and G strings inside bittersweet Fmaj7 and Am9 chords.',
        steps: ['Hold Fmaj7 (D-3, G-2), hammer open B to B-1 (B→C), catch open high E, pull B-1→0, and touch G-2.', 'In bar 2, strike open A, D-2, hammer open G→2, pluck B-1, open high E, and let the aching open B (Am9!) ring out.'],
        tip: 'Play on a bright Telecaster middle/neck position with light reverb — let that final open B hang.',
        use: 'Bittersweet Midwest-emo and math-pop intros in C / Am.', goal: 112,
      },
    },
  ]),
]
