// Signature "Must-know licks" inspired by legendary guitarists across all 20 styles.
// Appended at the end of LICKS in library.ts so existing exercise codes never shift.
import type { LickStyleId } from './styles'

interface ClassicLick {
  id: string
  style: LickStyleId
  name: string
  level: 1 | 2 | 3
  kind: 'lick' | 'arpeggio' | 'run' | 'riff' | 'ending' | 'double-stop' | 'turnaround'
  ref: string
  minor?: boolean
  chord?: string
  meter?: number
  bpm?: number
  tab: string
  must: {
    about: string
    steps: string[]
    tip: string
    use: string
    goal: number
  }
}

const C = (
  style: LickStyleId,
  ref: string,
  list: (Omit<ClassicLick, 'style' | 'ref'> & { ref?: string })[],
  minor?: boolean,
): ClassicLick[] => list.map(l => ({ style, ref, ...(minor !== undefined && l.minor === undefined ? { minor } : {}), ...l }))

export const CLASSIC_LICKS: ClassicLick[] = [
  // ───────────────────────── Blues (B.B. King, SRV, Albert King, Freddie King, Buddy Guy, Robert Johnson, Gary Moore, Derek Trucks, Joe Bonamassa, Muddy Waters)
  ...C('blues', 'A', [
    {
      id: 'cl-bl-bb-sting', name: 'B.B. King butterfly sting & vibrato', level: 2, kind: 'lick', chord: 'A7', bpm: 74,
      tab: 'q 1:10b e 1:10r 2:12 q 2:10~ r | e 2:13 2:10 q 3:12bh e 3:12r q. 4:10~',
      must: {
        about: 'B.B. King vocal "sting": one piercing whole-step bend on the high E, answered by his signature butterfly wrist vibrato on the root and a crying half-bend.',
        steps: [
          'Place your index finger on fret 10 of the B string (A) and ring finger on fret 10 of the high E (D) with two fingers behind it.',
          'Strike and push the high E up a whole step to E, release it cleanly, step to B (B-12), then hold the root A (B-10) with a wide wrist vibrato.',
          'Leave beat 4 resting so the vibrato breathes before bar 2.',
          'In bar 2, flick from C (B-13) to A (B-10), then give a sweet half-step bend-and-release on G-12 down to E (D-10).',
        ],
        tip: 'Roll your palm away from the neck for vibrato like humming a note. Let the rest on beat 4 feel as heavy as the notes.',
        use: 'Over A7 in a slow 12-bar blues (especially bars 1, 5 or 9).',
        goal: 78,
      },
    },
    {
      id: 'cl-bl-srv-rake', name: 'Stevie Ray Vaughan Texas rake & scoop', level: 3, kind: 'lick', chord: 'A7', bpm: 92,
      tab: 's 4:x 3:x e 2:8b q 2:8r e 3:7 3:5 q 4:7~ | e 4:7 3:5 3:7b q 3:7r e 3:5 q 4:7~',
      must: {
        about: 'Stevie Ray Vaughan Texas thunder: raking across muted middle strings straight into a ferocious bend, then snapping back down Box 1.',
        steps: [
          'Rest your fretting palm lightly across the D and G strings and drag a downstroke rake (D-x, G-x) straight into B-8.',
          'Snap B-8 up a whole step to A, release it on beat 2, tumble down G-7 and G-5 to root A (D-7).',
          'In bar 2, rebound off D-7 and G-5 into a thick G-7 whole-step bend, let it down and dig into D-7 with fierce vibrato.',
        ],
        tip: 'Strike hard with the pick angled slightly downward and mute strings 4–3 with your left index tip so the rake gives a percussive "chk-BOOM".',
        use: 'High-energy Texas shuffle solos over A7 or Am.',
        goal: 100,
      },
    },
    {
      id: 'cl-bl-albert-bend', name: 'Albert King minor-third wrench', level: 2, kind: 'lick', chord: 'A7', bpm: 72,
      tab: 'q. 1:8b3 e 1:8r q 1:8 1:5 | q 2:8bh e 2:8r 2:5 h 3:7~',
      must: {
        about: 'Albert King trademark 1.5-step blues wrench: squeezing the top note of the minor pentatonic all the way up to the minor 3rd/4th cry.',
        steps: [
          'Support fret 8 on the high E (C) with three fingers stacked behind it.',
          'Bend up a full step and a half (matching fret 11, Eb) and hold it on the dotted quarter before releasing smoothly.',
          'Drop to high E fret 5, then nudge B-8 up a quick half-step into B-5 and settle on G-7.',
        ],
        tip: 'Check the big 1.5-step bend by fretting 1:11 first so your ear locks in that mournful Eb pitch.',
        use: 'The Albert King box (frets 8–10 on B/e) over slow blues in A or C.',
        goal: 76,
      },
    },
    {
      id: 'cl-bl-freddie-hideaway', name: 'Freddie King stinging intro phrase', level: 2, kind: 'lick', chord: 'A7', bpm: 104,
      tab: 'e 3:5 3:6h 2:5 2:7 q 1:5 2:8 | e 1:5 2:8 2:5 3:7 q 3:5 4:7~',
      must: {
        about: 'Freddie King bright Texas "Cannonball" snap: hammering minor-to-major 3rd on the G string before shooting to the top strings.',
        steps: [
          'Pick G-5 (C) and immediately hammer to G-6 (C#), then roll cleanly to B-5 (E) and B-7 (F#).',
          'Pop the top A (high E-5) and G (B-8) with crisp snap using pick or hybrid fingers.',
          'Bar 2 tumbles straight back down Box 1 to land solidly on D-7.',
        ],
        tip: 'Accent high E-5 right on beat 3—Freddie used a metal thumbpick and plastic fingerpick so top notes popped like horns.',
        use: 'Kickoff chorus or upbeat shuffle turnaround over A7.',
        goal: 112,
      },
    },
    {
      id: 'cl-bl-buddy-tremolo', name: 'Buddy Guy tense flutter & drop', level: 2, kind: 'lick', chord: 'A7', bpm: 84,
      tab: 's 1:8 1:5 2:8 2:5 1:8 1:5 2:8 2:5 q 1:10b~ r | e 3:7 3:5 4:7 4:5 h 5:7~',
      must: {
        about: 'Buddy Guy dramatic dynamic contrast: rapid-fire top-string 16ths slammed into a screaming held bend, then a quiet low drop.',
        steps: [
          'Roll 16th notes cleanly across e-8, e-5, B-8, B-5 twice, keeping the first finger flat on fret 5.',
          'Slide fast to e-10, bend a whole step to E and let the sustain howl on beat 3, leaving beat 4 quiet.',
          'Switch pickup/touch softer for bar 2, dropping down to A-7.',
        ],
        tip: 'The surprise comes from playing bar 1 louder and wilder, then backing off to a whisper on beat 3 of bar 2.',
        use: 'Dynamic climax in a slow or mid-tempo blues.',
        goal: 92,
      },
    },
    {
      id: 'cl-bl-robert-turnaround', name: 'Robert Johnson Delta walking turnaround', level: 2, kind: 'turnaround', chord: 'E7 | B7', ref: 'E', bpm: 84,
      tab: 't 2:0 4:2 4:2 2:0 4:1 4:1 2:0 4:0 4:0 2:0 5:4 5:3 | q 5:2 4:1 h 5:2+4:1+3:2~',
      must: {
        about: 'Foundational Delta blues turnaround: high open strings chime on every triplet while the bass chromatic line walks down into the V chord.',
        steps: [
          'Use thumb-and-finger (or hybrid picking): ring finger plucks open B while thumb walks D-2, D-1, D-0, then A-4→3 in triplets.',
          'Keep the swing triplet feel steady—each chord voice rings over the walking bass.',
          'Bar 2 grabs A-2 and D-1, landing on the open B7 chord (A-2, D-1, G-2) ready to repeat.',
        ],
        tip: 'Even on electric guitar, using thumb + index/middle finger gives this authentic Delta snap and separation.',
        use: 'Bars 11–12 of any acoustic or electric blues in E.',
        goal: 92,
      },
    },
    {
      id: 'cl-bl-gary-cry', name: 'Gary Moore sustained minor-ballad cry', level: 2, kind: 'lick', chord: 'Am | Dm7', bpm: 66,
      tab: 'h 2:8b e 2:8r 2:5 q 3:7b~ | e 3:7r 3:5 4:7 4:5 h 5:7~',
      must: {
        about: 'Parisienne Walkways singing sustain: bending up a whole step on the B string, hanging in the air with slow soulful vibrato, then sighing down to E.',
        steps: [
          'Anchor ring finger on B-8 with index and middle supporting behind it; lift cleanly up to A and sing out.',
          'Release smoothly to B-5, push G-7 up and back through D-7→5 onto A-7 (E).',
        ],
        tip: 'Commit to the long held bend—do not shake it immediately; let it sing pure for half a beat first.',
        use: 'Minor blues ballads (Still Got the Blues / Parisienne Walkways feel) over Am.',
        goal: 72,
      },
    },
    {
      id: 'cl-bl-trucks-slide', name: 'Derek Trucks vocal slide sweep', level: 2, kind: 'lick', chord: 'A7', bpm: 78,
      tab: 'e 2:8/ 2:10~ 2:8 3:9 3:7/ 3:5 q 4:7~ | e 3:5 3:7/ 2:8 2:10~ h 2:10~',
      must: {
        about: 'Fluid, vocal blues slide phrasing: swooping gently into target chord tones like a gospel singer rather than chopping individual frets.',
        steps: [
          'Gliss smoothly from B-8 up into B-10 (A) with silky vibrato, dip down G-9→7→5, and settle on D-7.',
          'Rebound smoothly up G-5→7→B-8→B-10 and sing out over bar 2.',
        ],
        tip: 'Think about sliding *into* pitch from a fret below like a human voice scooping up to a note.',
        use: 'Slow soulful gospel-blues and Allman-style jams over A7.',
        goal: 84,
      },
    },
    {
      id: 'cl-bl-bonamassa-run', name: 'Joe Bonamassa repeating pentatonic fire', level: 3, kind: 'run', chord: 'A7', bpm: 108,
      tab: 's 1:8 1:5 2:8 2:5 1:8 1:5 2:8 2:5 2:8 2:5 3:7 3:5 3:7 3:5 4:7 4:5 | q 5:7~ e 4:5 4:7 h 3:5~',
      must: {
        about: 'Precision British-blues turbo box descent: chaining crisp four-note pentatonic bursts down the neck before locking back into Box 1.',
        steps: [
          'Tear cleanly down 4-note chunks in 16ths: e-8, e-5, B-8, B-5 twice, then B-8, B-5, G-7, G-5 and G-7, G-5, D-7, D-5.',
          'Drop on A-7 (E) on beat 1 of bar 2 and walk gracefully up to G-5 with wide vibrato.',
        ],
        tip: 'Accent every 4th 16th (beat 1, 2, 3, 4) so the listener feels the groove lock inside the burst of speed.',
        use: 'Show-stopping blues-rock climaxes over A7.',
        goal: 122,
      },
    },
  ], true),

  // ───────────────────────── Classic Rock (Chuck Berry, Page, Hendrix, Clapton, Gilmour, Slash, EVH, Angus Young, Santana, Mark Knopfler)
  ...C('rock', 'A', [
    {
      id: 'cl-rk-chuck-b-slide', name: 'Chuck Berry Johnny B. double-stop slide', level: 1, kind: 'double-stop', chord: 'A', minor: false, bpm: 132,
      tab: 'e 3:6/ 2:5+1:5 2:5+1:5 3:7 3:5 2:5+1:5 2:5+1:5 3:6/ | e 2:5+1:5 2:8 1:5 2:8 2:5 3:7 q 4:7~',
      must: {
        about: 'The most recognizable intro gesture in rock and roll: sliding into the major 3rd, barring strings 1–2 at the 5th fret, and snapping double stops.',
        steps: [
          'Slide your middle finger into G-6 (C#) and immediately lay your index flat across B-5 and e-5.',
          'Brush the top two strings twice in brisk eighth notes, hop to G-7 then G-5, and repeat the motif.',
          'Bar 2 tumbles down the Box 1 pentatonic cleanly onto the root A (D-7).',
        ],
        tip: 'Play straight eighth notes with a slight swing bounce and keep those top two strings crisp and staccato.',
        use: 'Upbeat rock & roll, classic rock verses and turnarounds over A or A7.',
        goal: 145,
      },
    },
    {
      id: 'cl-rk-page-stairway', name: 'Jimmy Page repeating pull-off cascade', level: 2, kind: 'lick', chord: 'Am', bpm: 102,
      tab: 'q 1:8b 1:8r t 1:8 1:5p 2:8 1:8 1:5p 2:8 | s 1:8 1:5p 2:8 2:5 3:7 3:5 4:7 3:5 3:7 3:5 4:7 4:5 q 5:7~',
      must: {
        about: 'Jimmy Page dramatic arc: an aching whole-step bend into rapid-fire 3-note triplets and a sweeping descending Box 1 flurry.',
        steps: [
          'Bend e-8 (C) up a full step to D and release back cleanly.',
          'Lock into the classic triplet engine: pick e-8, pull off to e-5, pick B-8—twice smoothly.',
          'In bar 2, unravel straight down four-note 16th groups all the way to E on the A string (7th fret).',
        ],
        tip: 'Keep your index planted as an anchor on fret 5 through bar 1 so your pinky only flicks down for clean pull-offs.',
        use: 'Over Am or F–G–Am climaxes in classic rock ballads.',
        goal: 112,
      },
    },
    {
      id: 'cl-rk-hendrix-double', name: 'Hendrix double-stop chord hammer', level: 2, kind: 'double-stop', chord: 'A', minor: false, bpm: 84,
      tab: 'e 4:7+3:5 4:7+3:6h q 3:5+2:5 h 4:7+3:6~ | e 4:5+3:5 4:7h+3:5 q 2:7p+1:5 h 4:7+3:6~',
      must: {
        about: 'Jimi Hendrix Little Wing / Wind Cries Mary chordal embellishment: fretting a double stop and hammering the next fret onto one string while the other rings.',
        steps: [
          'Barre D & G at fret 5, strike D-7 + G-5 and hammer onto G-6 while D-7 rings, jump to G-5+B-5, then sustain D-7+G-6.',
          'Bar 2 mirrors the same move across D-5 + G-5 hammered to D-7, ending warmly on the major triad top.',
        ],
        tip: 'Keep the fretting palm loose and use your thumb gently over the neck edge if needed, just like Jimi.',
        use: 'Sweetening any major or minor chord vamp when playing rhythm and lead together.',
        goal: 92,
      },
    },
    {
      id: 'cl-rk-clapton-woman', name: 'Eric Clapton Crossroads turnaround cry', level: 2, kind: 'lick', chord: 'A7', bpm: 108,
      tab: 'q 3:7b e 3:7r 3:5 q 2:8b 2:8r | e 2:5 3:7 3:5 4:7 3:6 q. 4:7~',
      must: {
        about: 'Clapton cream-era "woman tone" phrase: weeping bends on the G and B strings answered by a snappy major-3rd twist right on the root.',
        steps: [
          'Bend G-7 up to E, release to G-5, then lift B-8 up a whole step to A and let down cleanly.',
          'Walk down B-5, G-7, G-5, D-7—then sneak in G-6 (C#, the major 3rd) before snapping back to A (D-7).',
        ],
        tip: 'Roll your guitar tone knob halfway down on the neck pickup for that creamy vocal sustain.',
        use: 'Over A7 in rock blues or fast boogie shuffles.',
        goal: 118,
      },
    },
    {
      id: 'cl-rk-gilmour-soar', name: 'David Gilmour soaring double bend', level: 2, kind: 'lick', chord: 'Am', ref: 'B', bpm: 64,
      tab: 'h 2:10b e 2:10r 2:7 q 3:9b~ | e 3:9r 3:7 q 4:9~ e 3:7 3:9 q 2:10b~',
      must: {
        about: 'Wide-screen stadium sustain: holding a vocal whole-step bend for two full beats, answering slowly down the minor pentatonic, and soaring right back up.',
        steps: [
          'Start at B-10 (in B minor, the 7th position) and push up slowly a full step into F#, letting the note bloom.',
          'Release to B-7, push G-9 up a whole step, then resolve calmly to D-9 (the root B).',
          'Step back up G-7, G-9, and lift B-10 into a long sustained vibrato.',
        ],
        tip: 'Do not rush the vibrato—wait half a beat at the peak of the bend so the pitch settles in tune before shaking it.',
        use: 'Slow minor rock solos in Bm or Am.',
        goal: 70,
      },
    },
    {
      id: 'cl-rk-slash-sweet', name: 'Slash melodic high-string bend & hook', level: 3, kind: 'lick', chord: 'Am', bpm: 98,
      tab: 'e 2:10 1:10b q 1:10r 1:8 2:10 | e 2:8 2:10b q 2:10r e 2:8 3:9 q 4:7~',
      must: {
        about: 'Arena hard-rock phrasing in Box 2: singing bends paired with sweet melodic chord-tone landings rather than speed runs.',
        steps: [
          'Anchor in Box 2 at frets 8–10: strike B-10, bend e-10 up a full step, release, then sing cleanly on e-8 and B-10.',
          'Drop smoothly down to B-8, bend B-10 up to B, release to B-8, touch G-9 and resolve to D-7.',
        ],
        tip: 'Think like a singer—every note belongs cleanly to the Am chord underneath.',
        use: 'Chorus melodies and lyrical classic rock solos.',
        goal: 106,
      },
    },
    {
      id: 'cl-rk-evh-eruption', name: 'EVH wide three-finger tap arpeggio', level: 3, kind: 'arpeggio', chord: 'Am', bpm: 120,
      tab: 't 2:12t 2:5p 2:8h 2:12t 2:5p 2:8h 2:12t 2:5p 2:8h 2:12t 2:5p 2:8h | t 2:13t 2:5p 2:8h 2:13t 2:5p 2:8h 2:15t 2:7p 2:10h q 2:17t~',
      must: {
        about: 'Eddie Van Halen signature right-hand tap cascade: outlining shifting triads up one string with silky triplet fluidity.',
        steps: [
          'Hold the Am shape on the B string: index on 5 (E), pinky on 8 (G). Tap fret 12 (B) with your right index or middle fingertip.',
          'Pull your tapping finger straight down to snap fret 5, hammer fret 8—three crisp even triplets per beat.',
          'In bar 2, slide the tap note up to fret 13 (C), jump to 7–10 + tap 15, and sustain fret 17.',
        ],
        tip: 'Rest your right thumb lightly on top of the neck above the fretboard so the tap comes cleanly from a small wrist pivot.',
        use: 'High-energy rock solo break over Am.',
        goal: 140,
      },
    },
    {
      id: 'cl-rk-angus-pull', name: 'Angus Young punching Boogie pull-off', level: 1, kind: 'lick', chord: 'A5', bpm: 120,
      tab: 'e 3:7 3:5 4:7 3:5 3:7h 3:5p 4:7 4:5 | q 5:7~ e 5:5 5:7 h 4:7~',
      must: {
        about: 'High-voltage schoolboy rock & roll: biting Box 1 pull-offs anchored right on the beat like a punch in the chest.',
        steps: [
          'Dig crisply into G-7→5→D-7→G-5, then snap G-7 to G-5 and walk down D-7→5.',
          'Plant firmly on A-7 (E), step A-5→7, and hammer home onto A (D-7).',
        ],
        tip: 'Pick firmly near the bridge pickup with slight crunch—Angus makes single notes hit as hard as chords.',
        use: 'Driving 4/4 arena rock boogies in A or E.',
        goal: 132,
      },
    },
    {
      id: 'cl-rk-knopfler-triad', name: 'Mark Knopfler Sultans triad arpeggio snap', level: 2, kind: 'arpeggio', chord: 'Dm | C', ref: 'D', bpm: 146,
      tab: 'e 3:7 2:6 1:5 1:8p 1:5 2:6 3:7 4:7 | e 3:5 2:5 1:3 1:7 1:3 2:5 q 3:5~',
      must: {
        about: 'Crystal-clean Dire Straits fingerpicked chord sweeps: darting across triad inversions with pure thumb-and-finger pop.',
        steps: [
          'Hold a Dm triad up at fret 5–7 (D-7, G-7, B-6, e-5) and pluck cleanly upward with thumb-index-middle, popping e-8 with your pinky.',
          'Shift seamlessly down to C major (G-5, B-5, e-3) with a sparkling pinky reach up to e-7 (B).',
        ],
        tip: 'Play without a pick—squeeze gently with your fingertips right by the middle pickup for that glassy Strat pop.',
        use: 'Upbeat rock chord-tone solos over Dm–C–Bb–A.',
        goal: 158,
      },
    },
    {
      id: 'cl-rk-santana-dorian', name: 'Santana singing Dorian sustain & bounce', level: 2, kind: 'lick', chord: 'Am7', bpm: 92,
      tab: 'h 2:10~ e 2:12 2:13 1:10 1:12 | q 1:12~ e 1:10 2:13 h 2:12~',
      must: {
        about: 'Smooth Latin-rock passion: leaning sweetly into the Dorian 6th (F#) and natural 9th (B) on top strings with singing neck-pickup warmth.',
        steps: [
          'Hold A (B-10) for two full beats with singing vibrato, then glide calmly up B-12 (B), B-13 (C), e-10 (D), e-12 (E).',
          'Pause brightly on high e-12, step down e-10→B-13, and sustain B-12 (B, the lush 9th over Am7!).',
        ],
        tip: 'Hold that B-12 long and steady at the end of bar 2—the 9th over a minor chord gives instant Santana soul.',
        use: 'Latin rock jams (Am7 → D7 / Oye Como Va style).',
        goal: 100,
      },
    },
  ], true),

  // ───────────────────────── Alt Rock (The Edge, Frusciante, Billy Corgan, Jonny Greenwood, Kurt Cobain, Johnny Marr)
  ...C('altrock', 'E', [
    {
      id: 'cl-al-edge-chime', name: 'The Edge dotted-eighth delay chime', level: 1, kind: 'arpeggio', chord: 'Em | C', bpm: 122,
      tab: 'e 2:8 1:7 2:8 1:7 2:8 1:7 2:8 1:7 | e 2:8 1:8 2:8 1:8 2:8 1:7 2:8 1:5',
      must: {
        about: 'Anthemic stadium shimmer: alternating two ringing high strings while only one top melody note shifts against the pedal tone.',
        steps: [
          'Hold B-8 (G) and high e-7 (B) together so both notes ring into each other like bells.',
          'Pick alternating eighth notes cleanly, palm muting ever so slightly or letting clean delay bloom.',
          'In bar 2, stretch pinky to e-8 (C) on beats 1–2, back to e-7 on beat 3, and open up to e-5 (A) on beat 4.',
        ],
        tip: 'Do not let notes die early—keep fingers arched cleanly so adjacent strings shimmer together.',
        use: 'Clean or lightly driven verses and soaring anthemic choruses.',
        goal: 130,
      },
    },
    {
      id: 'cl-al-frusciante-triad', name: 'Frusciante thumb-over triad bounce', level: 2, kind: 'lick', chord: 'Em | D', bpm: 92,
      tab: 'e 4:9 3:7+2:8 3:7+2:8 4:9h 3:9~ 4:9 3:7+2:8 3:7+2:8 | e 4:7 3:7+2:7 3:7+2:7 4:9h 3:7+2:7 q. 4:7~',
      must: {
        about: 'John Frusciante funk-rock signature: anchoring a chord root on the D string while hammering small double-stop triads underneath.',
        steps: [
          'Shape an Em triad at frets 7–9 (D-9, G-7, B-8) and strike the bass root followed by crisp double stops on strings G and B.',
          'Hammer your pinky up onto G-9 for melodic soul sparkle, then shift the entire shape down two frets to D major (fret 7).',
        ],
        tip: 'Think rhythmically with your strumming wrist—keep small muted up-down motions going between chords.',
        use: 'Groovy alt-rock and funk-tinged ballad progressions.',
        goal: 100,
      },
    },
    {
      id: 'cl-al-corgan-octave', name: 'Corgan octave fuzz anthem swell', level: 2, kind: 'riff', chord: 'Em | G', bpm: 112,
      tab: 'e 5:7+3:9 5:7+3:9 5:9+3:11 5:10+3:12 5:10+3:12 5:9+3:11 q 5:7+3:9 | e 5:10+3:12 5:10+3:12 5:12+3:14 5:10+3:12 h 5:9+3:11',
      must: {
        about: 'Massive wall-of-fuzz octave chords gliding up the A and G strings, cutting through big drums without muddy thirds.',
        steps: [
          'Grip the octave shape: index on A-7 (E), ring/pinky on G-9 (E), arching your index slightly to mute the D string between them.',
          'Slide smoothly up 7→9→10→9→7 in driving 8th notes with confident down-up strumming.',
          'Bar 2 climbs higher to fret 10 and 12 before hanging tension on fret 9 (F#).',
        ],
        tip: 'Mute the unused low E and top two strings so you can strum hard without unwanted ringing.',
        use: 'Big 90s alt-rock choruses and soaring bridges.',
        goal: 122,
      },
    },
    {
      id: 'cl-al-greenwood-skip', name: 'Greenwood angular fifths & minor ninth', level: 2, kind: 'arpeggio', chord: 'Em9', bpm: 116,
      tab: 'e 6:0 4:2 3:0 2:7 3:0 4:4 2:7 3:0 | e 5:7 4:5 3:4 1:7 3:4 4:5 q 3:0',
      must: {
        about: 'Art-rock clean intricacy: stretching wide open-string intervals with an eerie major-7th / minor-9th shimmer.',
        steps: [
          'Pick open low E, D-2, open G, then stretch your pinky to B-7 (F#, the lush 9th!) and let everything ring into the room.',
          'Switch up to D-4 and keep the top F# ringing against the open G.',
          'Bar 2 voices a sparkling high Em triad across strings 5–4–3–1 before floating out on open G.',
        ],
        tip: 'Let every string bleed into the next like a piano with the sustain pedal down.',
        use: 'Atmospheric clean verses, intros and modern indie/alt ballads.',
        goal: 124,
      },
    },
    {
      id: 'cl-al-marr-jangle', name: 'Johnny Marr Rickenbacker jangle weave', level: 2, kind: 'arpeggio', chord: 'Em | Cadd9', bpm: 120,
      tab: 'e 5:7 4:5 3:4 2:5 1:3 2:5 3:4 4:5 | e 5:3 4:2 3:0 2:3 1:0 2:3 3:0 2:0',
      must: {
        about: '80s UK indie guitar jangle: weaving fluid broken chord melodies across middle and top strings without repeating rigid campfire shapes.',
        steps: [
          'Hold the lush Em inversion (A-7, D-5, G-4, B-5, e-3) and pick seamlessly up and back down.',
          'Glide cleanly down to open Cadd9 (A-3, D-2, G-0, B-3, e-0) keeping open shimmer intact.',
        ],
        tip: 'Pick gently with bright neck-and-bridge pickup clarity and a light touch of chorus shimmer.',
        use: 'Melodic indie/jangle verses in Em or G.',
        goal: 132,
      },
    },
  ], true),

  // ───────────────────────── Metal (Metallica, Iron Maiden, Randy Rhoads, Zakk Wylde, Yngwie, Dimebag, Paul Gilbert, Marty Friedman)
  ...C('metal', 'E', [
    {
      id: 'cl-mt-metallica-gallop', name: 'Hetfield downpicked gallop & power snap', level: 2, kind: 'riff', chord: 'E5', bpm: 148,
      tab: 'e 6:0m s 6:0m 6:0m q 6:0m+5:2m e 6:0m s 6:0m 6:0m q 6:3+5:5 | e 6:0m s 6:0m 6:0m q 6:0m+5:2m q 6:6+5:8 6:5+5:7',
      must: {
        about: 'Bay-Area thrash tightness: crisp palm-muted gallops slammed against punchy open and b5/4th power chords.',
        steps: [
          'Anchor your picking palm squarely on the bridge saddles so the open low E barks cleanly without ringing.',
          'Strike the triplet gallop ("ONE-da-ta TWO"): eighth followed by two tight sixteenths, clamping straight onto E5.',
          'In bar 2, slam the menacing tritone Bb5 (6:6+5:8) down to A5 (6:5+5:7).',
        ],
        tip: 'Play the power chords un-muted while the open chugs stay ultra-tight—that contrast is what sounds heavy.',
        use: 'Thrash metal verses and main riffs over E5.',
        goal: 160,
      },
    },
    {
      id: 'cl-mt-maiden-twin', name: 'Iron Maiden twin-lead gallop harmony', level: 2, kind: 'run', chord: 'Em', bpm: 140,
      tab: 'e 3:9 3:7 3:9 2:8 2:7 2:8 2:10 2:8 | e 1:7 1:8 1:10 1:8 1:7 2:10 q 2:8~',
      must: {
        about: 'Classic twin-guitar NWOBHM melodic line climbing the natural minor scale cleanly up the top three strings.',
        steps: [
          'Start in the 7th position: G-9, G-7, G-9, then sweep smoothly across B-8, B-7, B-8, B-10, B-8.',
          'Bar 2 climbs the high E (7, 8, 10, 8, 7) before stepping onto B-10 and settling with crisp vibrato on B-8 (G).',
        ],
        tip: 'Alternate-pick strictly down-up on every eighth note so it locks like two guitars playing in unison.',
        use: 'Chorus hooks and soaring metal harmonized intros in Em.',
        goal: 152,
      },
    },
    {
      id: 'cl-mt-rhoads-dim', name: 'Randy Rhoads neoclassical diminished climb', level: 3, kind: 'run', chord: 'B7', bpm: 120,
      tab: 's 4:10 4:9 4:7 3:10 3:9 3:7 2:10 2:9 2:7 1:11 1:8 1:7 1:8 1:7 2:10 2:7 | w 1:7~',
      must: {
        about: 'Classical fury on electric guitar: a harmonic minor / diminished sequence racing up the neck and locking onto the tonic.',
        steps: [
          'Descend each three-note fragment across D (10-9-7), G (10-9-7), and B (10-9-7) with strict alternate picking.',
          'Grab the dramatic harmonic-minor jump on high E (11 down to 8 and 7—the D# leading tone!).',
          'Step down e-8, e-7, B-10, B-7 and hold high e-7 (B) ringing cleanly for bar 2.',
        ],
        tip: 'Use a metronome slow at first—the big 4-fret stretch between e-7 and e-11 needs relaxed fingers.',
        use: 'Over V chords (B7) resolving back to E minor.',
        goal: 135,
      },
    },
    {
      id: 'cl-mt-wylde-pinch', name: 'Zakk Wylde pentatonic shred & scream', level: 3, kind: 'lick', chord: 'Em', ref: 'E', bpm: 126,
      tab: 's 2:15 2:12 3:14 3:12 2:15 2:12 3:14 3:12 4:14 3:12 4:14 4:12 5:14 4:12 5:14 5:12 | q 6:15b~ e 6:12 5:14 h 3:14bh~',
      must: {
        about: 'Relentless pentatonic fours screamed straight down Box 1 at the 12th fret, capped with a low crunch bend and attitude.',
        steps: [
          'Lock into the 12th-fret Em box and tear down overlapping four-note 16th chunks (15-12-14-12 shifted string by string).',
          'At the bottom, tug low E-15 down slightly, snap back to 12–14, then squeeze G-14 with a pinch-harmonic attitude.',
        ],
        tip: 'Choke up close to the pick tip so your thumb edge brushes the string right after picking for squealing pinch harmonics.',
        use: 'High-octane hard rock and heavy metal shred breaks.',
        goal: 142,
      },
    },
    {
      id: 'cl-mt-yngwie-harm', name: 'Yngwie harmonic minor pedal cascade', level: 3, kind: 'run', chord: 'Em', bpm: 128,
      tab: 's 1:12 1:8 1:7 1:8 1:12 1:8 1:7 1:8 1:11 1:8 1:7 1:8 1:11 1:8 1:7 1:8 | q 1:12~ e 1:11 1:8 h 1:7~',
      must: {
        about: 'Neoclassical shred architecture: a classical one-string pedal-point sequence weaving the exotic harmonic-minor major 7th (D#).',
        steps: [
          'Keep your index parked solidly on high e-7 (B) and middle on e-8 (C) as the pedal base.',
          'Stretch your pinky to e-12 (E) for the first two groups of four, then slide pinky down one fret to e-11 (D#) for groups 3 and 4.',
          'Hold e-12, step cleanly down 11→8→7 and shake e-7 with fast classical vibrato.',
        ],
        tip: 'Practice with pure alternate picking or strict pull-offs—either way, keep your thumb centered behind the neck for the 5-fret reach.',
        use: 'Over E minor or B7 neoclassical turnarounds.',
        goal: 148,
      },
    },
    {
      id: 'cl-mt-dimebag-blue', name: 'Dimebag wide stretch & blue-note squeal', level: 3, kind: 'lick', chord: 'Em', bpm: 118,
      tab: 't 2:15p 2:12p 2:10 2:15p 2:12p 2:10 3:14p 3:12p 3:9 3:14p 3:12p 3:9 | q 4:14~ e 3:12 3:15 q 2:12b~ r',
      must: {
        about: 'Groove-metal wide stretches: massive symmetric 3-note-per-string pull-offs jumping between frets 10–12–15 and 9–12–14.',
        steps: [
          'Pick only the first note (B-15) and pull smoothly through 12 to 10 twice in crisp triplets.',
          'Drop to the G string and perform the huge 9-12-14 stretch twice.',
          'Dig into D-14, sneak the screaming b5 blue note (G-15 = Bb), and finish by yanking B-12.',
        ],
        tip: 'Use a classical thumb position behind the neck—that huge 5-fret span is impossible if your thumb hangs over top.',
        use: 'Groove-metal solos over churning low riffs.',
        goal: 132,
      },
    },
    {
      id: 'cl-mt-gilbert-six', name: 'Paul Gilbert 6-note alternate picking engine', level: 3, kind: 'run', chord: 'Em', bpm: 124,
      tab: 's 2:12 2:13 2:15 1:12 1:13 1:15 2:12 2:13 2:15 1:12 1:13 1:15 1:15 1:13 1:12 2:15 | q 1:12~ e 2:15 2:13 h 2:12~',
      must: {
        about: 'Laser-accurate 3-notes-per-string alternate picking across the B and high E strings—every string crossing feels identical.',
        steps: [
          'Start with a downstroke on B-12: down-up-down (12-13-15), then cross cleanly onto e-12 with an UPSTROKE (up-down-up on 12-13-15).',
          'Notice how repeating that 6-note loop makes string crossing super crisp.',
          'Reverse calmly in bar 2 and hold B-12 cleanly.',
        ],
        tip: 'Keep zero tension in your picking wrist and tilt the pick slightly so upstrokes skip smoothly clear of the B string.',
        use: 'Clean, razor-sharp 80s shred climbing phrases in Em or G.',
        goal: 145,
      },
    },
  ], true),

  // ───────────────────────── Prog Metal (Petrucci, Tosin Abasi, Misha Mansoor, Marty Friedman)
  ...C('progmetal', 'E', [
    {
      id: 'cl-pg-petrucci-fives', name: 'Petrucci 3-notes-per-string legato stream', level: 3, kind: 'run', chord: 'Em', bpm: 120,
      tab: 's 3:9 3:11h 3:12h 2:10 2:12h 2:13h 1:10 1:12h 1:14h 1:15 1:14p 1:12p 1:10 2:13p 2:12p 2:10 | q 1:12~ e 2:15 1:14 h 1:12~',
      must: {
        about: 'John Petrucci crystal-clear 3NPS prog precision: climbing Em Dorian smoothly across the top three strings and bouncing back seamlessly.',
        steps: [
          'Pick the first note of each string cleanly, hammering the remaining two with uniform finger strength (G 9-11-12, B 10-12-13, e 10-12-14).',
          'Grab e-15 at the peak, then reverse straight back with sharp pull-offs.',
          'Land calmly on e-12, ornament via B-15 and e-14, and sustain high E.',
        ],
        tip: 'Every hammered and pulled note should match your picked note in volume—test it unplugged first.',
        use: 'Precision melodic runs over Em or Em7–A7 prog vamps.',
        goal: 138,
      },
    },
    {
      id: 'cl-pg-abasi-thump', name: 'Abasi string-skipping wide arpeggio', level: 3, kind: 'arpeggio', chord: 'Em9', bpm: 112,
      tab: 's 6:0 4:4 2:7 1:7 1:11 1:7 2:7 4:4 6:0 4:5 2:8 1:7 1:12 1:7 2:8 4:5 | h 6:0+4:4+2:7+1:11~ h r',
      must: {
        about: 'Animals as Leaders modern architectural spread: skipping strings from bass roots straight to sparkling major-7th and 9th intervals.',
        steps: [
          'Bounce cleanly across open 6th → D-4 (F#) → B-7 (F#) → e-7 (B) → e-11 (D#) and cascade straight back down.',
          'Shift one fret into the C-natural color (D-5, B-8, e-12) for the second half of bar 1.',
          'Bloom out on the wide open Em9 chord in bar 2.',
        ],
        tip: 'Hybrid-pick (pick on 6 & 4, middle/ring fingers on 2 & 1) so skipping strings feels effortless.',
        use: 'Ambient clean prog intros and modern fusion arpeggio beds.',
        goal: 122,
      },
    },
    {
      id: 'cl-pg-mansoor-djent', name: 'Periphery syncopated pedal riff', level: 3, kind: 'riff', chord: 'Em', bpm: 126,
      tab: 's 6:0m 6:0m 4:9 6:0m 6:0m 4:7 6:0m 6:0m 4:10 6:0m 6:0m 4:9 6:0m 4:7 6:0m 4:5 | q 6:0m+5:2m e 6:0m 4:4 6:0m 4:5 q 6:0+5:2',
      must: {
        about: 'Djent polymetric groove: groups of three 16th notes (chug-chug-melody) rolling smoothly across a strict 4/4 grid.',
        steps: [
          'Keep strict alternating right-hand 16ths going against the chugging open low E.',
          'Pop melodic accented notes on the D string (9, 7, 10, 9, 7, 5) while clamping immediately back onto the open palm mute.',
          'Lock squarely back onto the bar 2 downbeat power chord.',
        ],
        tip: 'Count the accented melody notes—"1-2-3, 1-2-3"—inside your steady foot tap on beats 1-2-3-4.',
        use: 'Modern progressive metal riffs in E.',
        goal: 138,
      },
    },
  ], true),

  // ───────────────────────── Math Rock (Covet/Yvette Young, Chon, American Football, TTNG)
  ...C('mathrock', 'G', [
    {
      id: 'cl-mr-covet-tap', name: 'Yvette Young sparkling open tap flower', level: 3, kind: 'lick', chord: 'Gmaj7', bpm: 112,
      tab: 'e 3:0 2:0 1:12t 1:7p 1:0 2:10t 2:7p 2:0 | e 3:0 1:11t 1:7p 1:0 2:8t 2:0 q 1:7~',
      must: {
        about: 'Covet-style fairy-sparkle math rock: open strings blooming under crystalline right-hand tapping melodies.',
        steps: [
          'Let open G and B ring as a warm harp bed while your right hand taps e-12 (E) and pulls off to left-hand e-7 (B) then open e.',
          'Repeat on the B string: tap 10, pull to 7, pull to open 0.',
          'Bar 2 shifts to e-11 (D#, pure major 7th magic) and resolves brightly on e-7.',
        ],
        tip: 'Pull sideways with a crisp little flick as you lift your tapping finger so the fretted note rings clear as a bell.',
        use: 'Clean sparkling verses and math-rock tapping loops.',
        goal: 120,
      },
    },
    {
      id: 'cl-mr-chon-glide', name: 'Chon bright chord-bounce & hammer cascade', level: 3, kind: 'lick', chord: 'Gmaj7', bpm: 118,
      tab: 's 4:5 3:7 2:7 1:7 1:10p 1:7 2:7 3:7 4:4 3:5 2:7 1:5 1:7h 1:5p 2:7 3:5 | q 4:5+3:4+2:3+1:7~ h r',
      must: {
        about: 'Chon signature bouncy jazz-math fusion: sparkling maj9 chord sweeps punctuated by effortless snappy pull-offs.',
        steps: [
          'Roll cleanly up a Gmaj9 shape (D-5, G-7, B-7, e-7), snatch e-10 with your pinky and pull back down.',
          'Drop cleanly to an Am9/F#m7 shape (D-4, G-5, B-7, e-5) with a bright hammer-pull ripple.',
          'Strike the rich open Gmaj7 chord in bar 2 and let it shimmer.',
        ],
        tip: 'Play completely clean on the neck-and-middle single coil mix so every chord sparkle speaks.',
        use: 'Upbeat progressive clean grooves over Gmaj7 or Em9.',
        goal: 128,
      },
    },
    {
      id: 'cl-mr-af-twinkle', name: 'American Football Midwest twinkle arpeggio', level: 1, kind: 'arpeggio', chord: 'Gmaj7', meter: 4, bpm: 108,
      tab: 'e 6:3 4:4 3:0 2:3 1:2 2:3 3:0 4:4 | e 5:3 4:4 3:0 2:3 1:0 2:3 3:0 2:0',
      must: {
        about: 'Bittersweet Midwest emo chime: letting open G and open high E ring alongside warm major-7th bass movements.',
        steps: [
          'Fret Gmaj7 (low E-3, D-4, B-3, e-2) leaving the G string completely open, and pick across smoothly.',
          'In bar 2, move just the bass finger to A-3 (C) and lift e-2 open for a glowing Cmaj9 sound.',
        ],
        tip: 'Keep your fingers steep on their tips so the open G string rings unbroken across both bars.',
        use: 'Nostalgic clean indie/math verses in G.',
        goal: 116,
      },
    },
  ], false),

  // ───────────────────────── Melodic Prog (Plini, Polyphia/Tim Henson, Intervals)
  ...C('progclean', 'E', [
    {
      id: 'cl-pc-plini-lydian', name: 'Plini soaring Lydian slide & bloom', level: 2, kind: 'lick', chord: 'Emaj7#11', bpm: 96,
      tab: 'e 3:8/ 2:9 1:7 1:11 2:9~ e 1:11 1:12 1:14 | h 1:11~ e 1:9 2:12 q 2:9~',
      must: {
        about: 'Plini signature optimistic Lydian melody: gliding cleanly into chord tones and highlighting the dreamy #11 (A#) and major 7th (D#).',
        steps: [
          'Slide gently into G-8 (D#), step across B-9, e-7, and jump brightly up to e-11 (D#).',
          'Climb through the top E-F# notes (11→12→14), then pause with singing vibrato on e-11 (major 7th!) before resolving warmly to G# (B-9).',
        ],
        tip: 'Use tiny smooth slides into the first note and wide, relaxed vibrato on e-11—let notes overlap like a clean synth pad.',
        use: 'Uplifting melodic prog solos over Emaj7 or Amaj7#11.',
        goal: 104,
      },
    },
    {
      id: 'cl-pc-henson-hybrid', name: 'Polyphia hybrid harmonic bounce', level: 3, kind: 'lick', chord: 'Emaj7', bpm: 104,
      tab: 's 5:7 2:12n 1:12n 2:9 4:9 3:8 1:11 1:9p 1:7 2:9 3:8 4:6 5:7 3:8 2:7 1:7 | h 3:12n+2:12n+1:12n~ h r',
      must: {
        about: 'Modern nylon-electric hybrid trickery: snappy natural harmonics woven directly inside crisp arpeggios and pull-offs.',
        steps: [
          'Pluck A-7 with the pick while your middle/ring fingers snap natural harmonics lightly over the 12th fret wire on B and e.',
          'Catch B-9 cleanly, cascade down 11→9p→7, and glide through the Emaj7 chord tones.',
          'Chime three glowing 12th-fret harmonics together to crown bar 2.',
        ],
        tip: 'Touch the string directly OVER the 12th metal fret wire—not between frets—and lift your left fingertip immediately after plucking.',
        use: 'Modern pop-prog riffs and clean trap-influenced guitar hooks.',
        goal: 114,
      },
    },
    {
      id: 'cl-pc-intervals-groove', name: 'Intervals upbeat pentatonic sparkle', level: 2, kind: 'lick', chord: 'E', bpm: 112,
      tab: 'e 2:9 1:7 1:11h 1:12 2:9 1:9 2:12 2:9 | e 3:9 3:11 2:9 2:12 q 1:9b~ e 1:7 r',
      must: {
        about: 'Aaron Marshall bright, feel-good major-pentatonic bounce: snappy hybrid intervals paired with clean uplifting bends.',
        steps: [
          'Skip sweetly between B-9 (G#) and e-7 (B), hammering 11→12, then bounce down e-9→B-12→B-9.',
          'Bar 2 climbs effortlessly up to e-9 (C#) and bends gracefully up into D#/E, landing cleanly on e-7.',
        ],
        tip: 'Add tiny crisp mutes between the wide jumps so it bounces with tight groove.',
        use: 'Joyful, uplifting prog hooks over E major or C#m.',
        goal: 120,
      },
    },
  ], false),

  // ───────────────────────── Jazz (Wes Montgomery, Joe Pass, Grant Green, Django, Charlie Christian, Pat Martino, George Benson)
  ...C('jazz', 'G', [
    {
      id: 'cl-jz-wes-octaves', name: 'Wes Montgomery thumb octave bounce', level: 2, kind: 'lick', chord: 'Gmaj7', ref: 'G', bpm: 120,
      tab: 'q 5:10+3:12 e 5:9+3:11 5:7+3:9 q 5:5+3:7 r | e 5:7+3:9 5:9+3:11 q 5:10+3:12 h 5:10+3:12~',
      must: {
        about: 'Wes Montgomery warm octave melody: swinging down and back up the major scale in two-string octaves played with the fleshy edge of the thumb.',
        steps: [
          'Grip the G octave on A-10 and G-12 (D string muted cleanly by the underside of your index finger).',
          'Slide smoothly down 10→9→7→5 in relaxed swing phrasing.',
          'Climb cleanly back 7→9→10 in bar 2.',
        ],
        tip: 'Pluck with the side of your right thumb instead of a pick—it immediately gives that velvety, rounded Wes warmth.',
        use: 'Building solo choruses or stating melodies over Gmaj7 or any swing tune.',
        goal: 132,
      },
    },
    {
      id: 'cl-jz-pass-bop', name: 'Joe Pass ii–V–I chromatic enclosure', level: 3, kind: 'run', chord: 'Am7 D7 | Gmaj7', ref: 'G', bpm: 124,
      tab: 'e 2:8 2:10 1:7 1:8 1:10 1:9 1:8 1:7 | q 2:10 e 2:8 2:7 h 3:7~',
      must: {
        about: 'Bebop mastery in four beats: outlining Am7 right up to the D7 chromatic walkdown that resolves onto the major 3rd (B) of Gmaj7.',
        steps: [
          'Ascend the Am7 chord: B-8 (G), B-10 (A), e-7 (B), e-8 (C), e-10 (D).',
          'Walk chromatically down across beat 4 (e-9 C# → e-8 C → e-7 B) right onto the target chord.',
          'Bar 2 lands smoothly through A-G-F# onto D (G-7), the warm 5th of Gmaj7.',
        ],
        tip: 'Accent the off-beats slightly ("one-AND two-AND") with swing eighth notes so it dances like a horn line.',
        use: 'Any ii–V–I progression (Am7 → D7 → Gmaj7).',
        goal: 138,
      },
    },
    {
      id: 'cl-jz-grant-blues', name: 'Grant Green funky soul-jazz pocket', level: 2, kind: 'lick', chord: 'G7', ref: 'G', bpm: 108,
      tab: 'e 3:5 2:6 2:3 2:5 3:3 4:5 q 3:5~ | e 2:3 2:6 2:3 3:5 3:3 4:5 q 4:5~',
      must: {
        about: 'Grant Green greasy organ-trio pocket: crisp pentatonic + major 3rd phrases played slightly behind the beat.',
        steps: [
          'Stay in the 3rd fret G-minor/Blues box: pick G-5 (C), snap B-6 (F), drop to B-3 (D), B-5 (E, the sweet 6th!).',
          'Tuck down G-3 (Bb) to D-5 (G) and resolve firmly back to G-5.',
          'Bar 2 repeats the pocket bounce and lands squarely home on the root G (D-5).',
        ],
        tip: 'Use mostly downstrokes and keep notes short and punchy—Grant Green made single notes groove like percussion.',
        use: 'Soul-jazz grooves, blues shuffles and funk-jazz vamps over G7.',
        goal: 118,
      },
    },
    {
      id: 'cl-jz-django-arpeggio', name: 'Django Reinhardt gypsy sweep & trill', level: 3, kind: 'arpeggio', chord: 'Gm6', ref: 'G', bpm: 140,
      tab: 'e 4:5 3:3 2:5 1:3 1:6 1:5 1:3 2:5 | t 1:5 1:6p 1:5 q 1:3 e 2:5 3:3 q 4:5~',
      must: {
        about: 'Gypsy jazz fire over minor 6th harmony: sweeping briskly up Gm6 into a snappy classical ornament.',
        steps: [
          'Glide briskly through Gm6 chord tones: D-5 (G), G-3 (Bb), B-5 (E, the 6th!), e-3 (G), up to e-6 (Bb) and down.',
          'Open bar 2 with a crisp triplet trill (e-5→6→5), pull cleanly down e-3 → B-5 → G-3 and finish on D-5.',
        ],
        tip: 'Use rest strokes (let your pick fall slightly onto the next string toward the floor) for Django acoustic snap.',
        use: 'Gypsy swing and minor-key standards over Gm or Gm6.',
        goal: 155,
      },
    },
    {
      id: 'cl-jz-charlie-swing', name: 'Charlie Christian classic swing riff', level: 1, kind: 'riff', chord: 'G7', ref: 'G', bpm: 132,
      tab: 'e 4:3 4:5 3:3 3:4h 2:3 2:5 q 2:3~ | e 2:5 2:3 3:5 3:3 h 4:5~',
      must: {
        about: 'Where electric jazz guitar began: Charlie Christian horn-like major-and-minor swing melody right inside the 3rd-fret G7 chord.',
        steps: [
          'Walk up from D-3 (F, the flat 7th) through D-5 (G), then hammer G-3 (Bb) into G-4 (B natural, the sunny major 3rd!).',
          'Step onto B-3 and B-5, and walk smoothly down in bar 2 back home to G (D-5).',
        ],
        tip: 'Imagine Benny Goodman clarinet playing this line—keep it bouncy, relaxed and crystal clear.',
        use: 'Swing blues, rhythm changes and 1940s jazz standards.',
        goal: 145,
      },
    },
    {
      id: 'cl-jz-martino-minor', name: 'Pat Martino linear minor flow', level: 3, kind: 'run', chord: 'Am7', ref: 'A', bpm: 136,
      tab: 'e 2:8 2:10 1:7 1:8 1:10 1:7 2:10 2:8 | e 3:9 3:7 4:10 4:9 4:7 5:10 q 5:7~',
      must: {
        about: 'Pat Martino seamless unbroken eighth-note stream: connecting minor-7th chord tones and smooth Dorian steps across every string.',
        steps: [
          'Keep constant down-up swing eighths rolling: B-8→10 → e-7→8→10 → e-7 → B-10→8.',
          'Continue smoothly down G-9→7, D-10→9→7, A-10 and resolve firmly on E (A-7).',
        ],
        tip: 'Play every note with exact rhythmic equality—Martino treated lines like long breathing ribbons of sound.',
        use: 'Modal jazz jams and long minor-7th solo stretches over Am7.',
        goal: 155,
      },
    },
    {
      id: 'cl-jz-benson-scat', name: 'George Benson pentatonic-blues scat line', level: 2, kind: 'lick', chord: 'G7', ref: 'G', bpm: 118,
      tab: 'e 2:6 2:3 3:5 3:3 4:5 3:3 3:5 2:3 | e 2:5 2:6 1:3 2:6 2:3 3:5 q 4:5~',
      must: {
        about: 'Vocal jazz-blues swing: singing crisp pentatonic phrases packed with snappy grace notes just like Benson scattering his lines out loud.',
        steps: [
          'Bounce warmly through B-6→3, G-5→3, D-5 and snap straight back up G-3→5→B-3.',
          'Add the sweet 6th (B-5) rolling onto e-3 and tumbling right back home onto G (D-5).',
        ],
        tip: 'Hum or sing the notes quietly while you play them—if you can sing the rhythm easily, it swings.',
        use: 'Soulful jazz-funk, smooth jazz and blues changes over G7.',
        goal: 132,
      },
    },
  ], false),

  // ───────────────────────── Blues-Pop / Mayer (John Mayer, Hendrix ballads, SRV slow)
  ...C('mayer', 'A', [
    {
      id: 'cl-jm-slow-dancing', name: 'John Mayer Slow Dancing sixths slide', level: 2, kind: 'double-stop', chord: 'A', minor: false, bpm: 68,
      tab: 'q 3:6+1:5 3:7/+1:7/ e 3:9+1:9 3:7+1:7 q 3:6+1:5~ | e 3:4+1:4 3:6/+1:5/ q 3:6+1:5~ h r',
      must: {
        about: 'Sweet, melancholic double-stop sixths on the G and high E strings—the shimmering chordal heart of Slow Dancing in a Burning Room style.',
        steps: [
          'Hold G-6 with your middle finger and e-5 with index (hybrid pick: pick G, pluck high E with middle finger).',
          'Slide both fingers together up to G-7 + e-7, bounce to fret 9, walk back down to 6+5 with warm vibrato.',
          'Bar 2 drops to fret 4 and slides straight back home to 6+5.',
        ],
        tip: 'Mute the B string gently with your fretting fingers so only the two glassy sixth notes ring together.',
        use: 'Slow 6/8 or 4/4 soulful blues-pop ballads over A or F#m.',
        goal: 74,
      },
    },
    {
      id: 'cl-jm-gravity-cry', name: 'Mayer slow-blues cry & thumb chord touch', level: 2, kind: 'lick', chord: 'A7', bpm: 66,
      tab: 'q 2:8b e 2:8r 2:5 h 3:7b~ | e 3:7r 3:5 4:7 4:5 h 6:5+4:5+3:6~',
      must: {
        about: 'Less-is-more ballad soloing: two unhurried bends across a whole bar, answered cleanly by grabbing the rich low thumb-over A chord.',
        steps: [
          'Wait right behind the beat and lift B-8 a slow whole step to A, release to B-5, and squeeze G-7 up and hold.',
          'Walk gracefully down G-5, D-7, D-5, then wrap your thumb onto low E-5 + D-5 + G-6 to cushion the end.',
        ],
        tip: 'Leave almost two beats of silence at the end of bar 2—space is half of Mayer tone.',
        use: 'Slow blues ballads and sparse trio jams over A.',
        goal: 72,
      },
    },
    {
      id: 'cl-jm-neon-claw', name: 'Mayer percussive acoustic-pop thumb slap', level: 3, kind: 'riff', chord: 'Am7', bpm: 92,
      tab: 'e 6:5 4:5+3:5 6:x 3:5+2:5 e 6:5 4:7+3:5 6:x 2:8 | e 6:3 4:5+3:4 6:x 3:4+2:5 h 6:5+4:5+3:5~',
      must: {
        about: 'Perpetual-motion slap-and-pluck pop groove: thumb slapping the low string while fingers snap glossy 7th/9th chord voicings above.',
        steps: [
          'Fret Am7 across fret 5 (thumb on E-5, fingers across D-G-B-5). Pluck the bass note, snap the top strings, then smack the thumb percussively onto muted E-x.',
          'Catch the snappy pinky embellishments (D-7, B-8) before slipping down to G6 (E-3) and resolving back to Am7.',
        ],
        tip: 'Drop your right-hand thumb sideways onto the low E string on beats 2 and 4 so it clicks cleanly like a snare drum.',
        use: 'Acoustic pop-soul grooves and solo fingerstyle vocal accompaniment.',
        goal: 100,
      },
    },
  ], false),

  // ───────────────────────── Pop & Soul (Bruno Mars, Anderson .Paak, Motown, Steve Cropper)
  ...C('popsoul', 'C', [
    {
      id: 'cl-ps-motown-hook', name: 'Motown sunny pentatonic bell hook', level: 1, kind: 'lick', chord: 'C', bpm: 104,
      tab: 'e 3:5 2:5 2:8 1:5 q 1:8~ e 1:5 2:8 | e 2:5 3:7 3:5 4:7 h 4:5~',
      must: {
        about: 'Classic Motown studio sweetness: a bright, hummable major-pentatonic melody that sits cleanly above horn hits and bass grooves.',
        steps: [
          'Walk straight up C major pentatonic from G-5 (C) through B-5 (E), B-8 (G), e-5 (A) to high e-8 (C).',
          'Step back down smoothly through B-5 and G-7/G-5 to land brightly on G (D-5).',
        ],
        tip: 'Think about a horn section or backup singers—play every note legato and proud, no rushed 16ths.',
        use: 'Motown, Bruno Mars-style retro pop, and upbeat soul choruses over C.',
        goal: 112,
      },
    },
    {
      id: 'cl-ps-bruno-funk', name: 'Retro pop-funk staccato 9th chop', level: 2, kind: 'riff', chord: 'C9', bpm: 112,
      tab: 's 4:5+3:5+2:5 4:x+3:x+2:x e 4:5+3:5+2:5 s 4:x+3:x+2:x 4:4+3:3+2:3 e 4:5/+3:5/+2:5/ r s 4:x+3:x+2:x 4:5+3:5+2:5 e 4:x+3:x+2:x r | e 3:5+2:5+1:5 3:x+2:x+1:x 3:5+2:5+1:5 r h 4:5+3:5+2:5+1:5',
      must: {
        about: 'Tight retro pop-funk rhythm guitar: slicing little three-string triad shapes on the upbeats with muted chuck scratches between.',
        steps: [
          'Grab the crisp C triad on strings 4–2 at fret 5 (index barred lightly across 5). Strike short, release grip slightly for the muted chuck.',
          'Slide into beat 2+ from one fret below (4-3-3 → 5-5-5) for pure disco/funk grease.',
          'Answer in bar 2 on the sparkling high triad (strings 3–1 at fret 5).',
        ],
        tip: 'All the funk is in your left hand releasing pressure right after the pick hits—keep the right arm swinging steadily like a pendulum.',
        use: 'Upbeat pop-funk grooves, retro pop and soul-funk jams.',
        goal: 118,
      },
    },
    {
      id: 'cl-ps-ballad-grace', name: 'Pop ballad Hendrix-style chord grace', level: 1, kind: 'lick', chord: 'C | Am', bpm: 78,
      tab: 'e 5:3 4:2 3:0 3:2h 3:0p 4:2 q 2:1+1:0 | e 5:0 4:2 3:0 2:1 2:3h 2:1 q 3:2~',
      must: {
        about: 'Heartfelt pop-ballad accompaniment: letting a warm open C chord ring while one finger hammers a singing inner melody.',
        steps: [
          'Hold a standard open C chord (A-3, D-2, G-0, B-1) and pick up through it before hammering your middle/ring onto G-2 and pulling back to open G.',
          'Drop cleanly to Am in bar 2 (open A, D-2, G-0, B-1), stretching your pinky onto B-3 and landing smoothly on A (G-2).',
        ],
        tip: 'Keep the bass thumb note ringing all the way across each bar like a soft piano sustain.',
        use: 'Singer-songwriter pop and soul ballads in C or G.',
        goal: 86,
      },
    },
    {
      id: 'cl-ps-cropper-sixths', name: 'Steve Cropper Memphis soul sixths stab', level: 1, kind: 'double-stop', chord: 'C | F', bpm: 98,
      tab: 'e 3:5+1:5 3:7+1:8 3:5+1:5 r q 3:4+1:3 3:5+1:5 | q 3:9/+1:8/ 3:10+1:10 h 3:9+1:8~',
      must: {
        about: 'Pure Memphis Stax soul pocket: dry, punchy two-note sixth intervals punctuated like crisp horn stabs.',
        steps: [
          'Pluck G-5+e-5, jump sweetly up to G-7+e-8, dip to G-4+e-3 and back onto G-5+e-5.',
          'Bar 2 glides cleanly up into F major sixths (G-9+e-8 → G-10+e-10 → G-9+e-8).',
        ],
        tip: 'Leave the B string dead so the wide sixth intervals ring clean and soulful.',
        use: 'Southern soul grooves, Otis Redding and Booker T style jams over C–F.',
        goal: 108,
      },
    },
  ], false),

  // ───────────────────────── Neo-Soul (Isaiah Sharkey, Mark Lettieri, Curtis Mayfield, Tom Misch)
  ...C('neosoul', 'C', [
    {
      id: 'cl-ns-sharkey-bloom', name: 'Isaiah Sharkey gospel maj9 flourish', level: 3, kind: 'lick', chord: 'Cmaj9', ref: 'C', bpm: 74,
      tab: 'e 4:9 3:7 2:8 1:7 1:10p 1:7 2:8h 2:10 | q 2:8~ e 3:9p 3:7 h 4:10+3:9+2:8~',
      must: {
        about: 'Gospel & neo-soul heaven: rolling swiftly up an airy Cmaj9 shape and spilling cleanly out with hammer-ons and wide sweet double stops.',
        steps: [
          'Roll cleanly across D-9 (B), G-7 (D), B-8 (G), e-7 (B), catch e-10 (D) and pull back smoothly.',
          'Hammer B-8 → B-10 (A) for gospel warmth, shake B-8 lightly, pull G-9→7 and land softly on the lush Cmaj7 triad.',
        ],
        tip: 'Use fingers or hybrid picking with neck pickup warmth—let every note whisper rather than bark.',
        use: 'Lush neo-soul grooves and slow R&B turnarounds over Cmaj7 or Am9.',
        goal: 82,
      },
    },
    {
      id: 'cl-ns-curtis-chime', name: 'Curtis Mayfield Gospel-soul triad slide', level: 1, kind: 'double-stop', chord: 'C | Am7', ref: 'C', bpm: 84,
      tab: 'q 3:5+2:5+1:5 e 3:5h+2:6h+1:5 3:5+2:5 q 3:7/+2:8/+1:7/ r | e 4:5+3:5+2:5 4:7+3:5+2:5 q 4:5+3:5+2:5~ h r',
      must: {
        about: 'The soul sound that inspired every R&B guitarist since 1965: barring a triad and hammering an upper suspension chord inside it.',
        steps: [
          'Barre strings 3–1 at fret 5 (Am7 top) and hammer middle finger onto B-6 + ring onto G-7/D-7 style grace notes.',
          'Slide smoothly up two frets to fret 7+8+7 (G/Dm7 color) and back down cleanly in bar 2 onto the warm D-G-B Am7 core.',
        ],
        tip: 'Keep the strumming light and airy near the neck pickup; let the hammer-on sing gently.',
        use: 'Uplifting soul progressions, Motown and neo-soul verses.',
        goal: 92,
      },
    },
    {
      id: 'cl-ns-lettieri-pocket', name: 'Mark Lettieri funky double-stop bounce', level: 2, kind: 'lick', chord: 'C9', ref: 'C', bpm: 94,
      tab: 'e 3:8/+2:8/ 3:9+2:8 3:7+2:7 3:9+2:8 q 2:8~ r | e 3:7+2:7 3:9+2:8 3:12 2:10 q 3:9+2:8~',
      must: {
        about: 'Snarky Puppy-style crisp pocket: sliding minor-to-major third double stops right in the groove.',
        steps: [
          'Pluck G-8 + B-8 (Cm triad top) and immediately slide G-8 up one fret to G-9 (turning it bright C major!).',
          'Pop down a step to G-7 + B-7 and right back home with crisp thumb-or-finger staccato.',
          'Bar 2 dances up to G-12 and B-10 before locking right back onto fret 9+8.',
        ],
        tip: 'Lock strictly onto beats 2 and 4—short, dry, glassy tone makes double stops pop.',
        use: 'Modern funk, gospel and neo-soul vamps over C7 or C9.',
        goal: 102,
      },
    },
    {
      id: 'cl-ns-misch-chill', name: 'Tom Misch laid-back jazz-hop 9th pocket', level: 2, kind: 'lick', chord: 'Cmaj9 | Dm9', ref: 'C', bpm: 88,
      tab: 'e 5:3 4:2+3:4+2:3 r 4:2+3:4+2:3 3:5 2:3 q 2:5~ | e 5:5 4:3+3:5+2:5 r 3:5 2:3 q 4:2+3:4+2:3~',
      must: {
        about: 'Modern bedroom neo-soul magic: bouncy fingerpicked maj9/min9 chords laced with tiny pentatonic single notes right behind the beat.',
        steps: [
          'Shape Cmaj9 (A-3, D-2, G-4, B-3): thumb plucks A-3, fingers snap the middle triad, rest slightly, then drop a sweet pentatonic fill up G-5→B-3→B-5.',
          'Glide effortlessly up two frets to Dm9 (A-5, D-3, G-5, B-5) and drop back home.',
        ],
        tip: 'Lay slightly behind the click like a hip-hop drummer—never rush the "&" beats.',
        use: 'Chill R&B, lo-fi neo-soul and groovy maj9 progressions.',
        goal: 96,
      },
    },
  ], false),

  // ───────────────────────── Funk (Nile Rodgers, Cory Wong, Prince, Jimmy Nolen)
  ...C('funk', 'E', [
    {
      id: 'cl-fk-nile-chic', name: 'Nile Rodgers Chic muted triad scratch', level: 2, kind: 'riff', chord: 'Em7', bpm: 114,
      tab: 's 3:7+2:8+1:7 3:x+2:x+1:x 3:x+2:x+1:x 3:7+2:8+1:7 3:x+2:x+1:x 3:9+2:8+1:10 3:x+2:x+1:x 3:7+2:8+1:7 3:x+2:x+1:x 3:7+2:8+1:7 3:x+2:x+1:x 3:x+2:x+1:x 3:9+2:10+1:9 3:x+2:x+1:x 3:7+2:8+1:7 r',
      must: {
        about: 'Pure 16th-note disco-funk propulsion: your picking wrist never stops for a microsecond while your fretting fingers squeeze tiny chords only on the rhythmic hits.',
        steps: [
          'Keep your right forearm swinging steadily down-up on every single 16th note ("1-e-&-a 2-e-&-a").',
          'Fret the small Em7 shape (G-7, B-8, e-7) on fret 7–8; lift finger pressure completely (still touching the strings!) on the "x" hits.',
          'Grab quick pinky/ring accents on beat 2+ and beat 4 (Em9 / A13 top) for classic Chic sparkle.',
        ],
        tip: 'Never pause your right arm. The muted "chicka-chicka" scratches come naturally when the left hand lifts off while the right hand keeps strumming.',
        use: 'Every upbeat funk, disco and pop-funk groove in Em.',
        goal: 120,
      },
    },
    {
      id: 'cl-fk-wong-fourth', name: 'Cory Wong syncopated fourths & mute', level: 3, kind: 'riff', chord: 'Em7', bpm: 106,
      tab: 's 4:x 4:x 4:7+3:7 4:x 4:9+3:9 4:x 4:x 4:7+3:7 4:x 4:9+3:9 4:x 4:7+3:7 4:5+3:5 4:7+3:7 r r | s 4:x 4:9+3:9 4:x 4:7+3:7 4:x 4:5+3:5 4:x 4:7+3:7 h 4:7+3:7~',
      must: {
        about: 'Modern Minneapolis rubbery fourth-string funk: snappy two-string fourths popping out of razor-sharp 16th-note ghost scratches.',
        steps: [
          'Lock the clean Strat position-4 tone and keep rapid-fire 16ths moving over the D and G strings.',
          'Punch double stops at frets 7, 9 and 5 with left-hand pressure snaps and instant muting.',
          'Let bar 2 settle warmly onto D-7+G-7.',
        ],
        tip: 'Keep a light touch with the pick—flexing a thin/medium pick gives that rubbery "quack" on clean funk guitars.',
        use: 'High-energy funk jams over Em7 or Am7.',
        goal: 114,
      },
    },
    {
      id: 'cl-fk-nolen-chank', name: 'Jimmy Nolen James Brown 9th chank', level: 2, kind: 'riff', chord: 'E9', bpm: 108,
      tab: 's 4:6+3:7+2:7+1:7 r 4:x+3:x+2:x+1:x 4:6+3:7+2:7+1:7 r 4:x+3:x+2:x+1:x 4:6+3:7+2:7+1:7 r 4:x+3:x+2:x+1:x 4:6+3:7+2:7+1:7 r 4:x+3:x+2:x+1:x 4:5+3:6+2:6+1:6 4:6/+3:7/+2:7/+1:7/ r r',
      must: {
        about: 'The chord that invented funk: the high 9th chord snapped razor-sharp on the upbeat ("chank!"), sliding up from one fret below on beat 4.',
        steps: [
          'Finger the E9 top shape (D-6, G-7, B-7, e-7—omit low E/A so it sits bright like a snare hit).',
          'Keep every hit staccato—clamp and immediately relax your hand after each upbeat.',
          'Drop one fret down (5-6-6-6) and snap-slide up into 6-7-7-7 on beat 4.',
        ],
        tip: 'Imagine you are playing the hi-hat and snare inside a horn band—short, tight and bright.',
        use: 'One-chord funk vamps in E9 or A9.',
        goal: 116,
      },
    },
    {
      id: 'cl-fk-prince-kiss', name: 'Prince sharp syncopated octave-and-sixth', level: 2, kind: 'lick', chord: 'E7', bpm: 112,
      tab: 'e 2:12 1:12 2:10 1:10 q 2:9+1:9~ e r 3:9 | e 2:9 2:12 1:9 1:12 h 2:9~',
      must: {
        about: 'Minimalist funk genius: crisp angular skips up on frets 9–12 with huge space and attitude.',
        steps: [
          'Snap clean 8th notes alternating across top strings at frets 12 and 10, locking onto the bright E6/9 double stop at fret 9.',
          'Leave beat 3 breathing, then hop smoothly up the E major/mixolydian pocket in bar 2.',
        ],
        tip: 'Play completely dry with bridge-pickup crispness—zero mud, maximum attitude.',
        use: 'Sparse synth-funk and clean pop-funk breaks over E7 or A7.',
        goal: 120,
      },
    },
  ], true),

  // ───────────────────────── Hawaiian Slack Key (Gabby Pahinui, Keola Beamer, Ledward Kaapana, Sonny Chillingworth)
  ...C('hawaiian', 'G', [
    {
      id: 'cl-hw-gabby-chime', name: 'Gabby Pahinui taro-patch thumb chime', level: 1, kind: 'lick', chord: 'G', bpm: 80,
      tab: 'e 4:0 2:0 1:5 1:3 1:2p 1:0 2:3 1:0 | q 3:0+2:0+1:5~ e 2:3 1:2 h 3:0+2:0+1:0~',
      must: {
        about: 'The golden voice of slack-key guitar: steady open bass warmth underneath sweet descending melody notes in thirds and gentle pull-offs.',
        steps: [
          'Let your right thumb brush open D while index/middle pluck open B and high e-5 (A).',
          'Step down e-3, pull e-2 cleanly to open e, dip to B-3, and open back out to e-0.',
          'In bar 2, chime e-5 with open G/B together, step calmly down B-3 and e-2, and let the open G triad ring out.',
        ],
        tip: 'Slow down and let every open string ring smoothly over the melody—nahenahe means sweet and gentle.',
        use: 'Traditional Hawaiian melodies and gentle G-major intros or endings.',
        goal: 88,
      },
    },
    {
      id: 'cl-hw-ledward-casc', name: 'Ledward Kaapana sparkling cascade', level: 2, kind: 'run', chord: 'G', bpm: 88,
      tab: 'e 1:7 1:5 2:8 2:5 3:7 3:4 4:5 4:0 | q 2:3+1:2 2:1+1:0 h 3:0+2:0+1:0~',
      must: {
        about: 'Cascading waterfall fingerstyle: picking sweet overlapping intervals down the neck so the last note rings over the next string.',
        steps: [
          'Roll lightly from e-7 (B) → e-5 (A) → B-8 (G) → B-5 (E) → G-7 (D) → G-4 (B) → D-5 (G) → open D.',
          'In bar 2, pinch sweet island sixths/thirds (B-3+e-2 sliding down to B-1+e-0) and float onto open G-B-e.',
        ],
        tip: 'Hold each fretted note slightly past when the next string rings—that harp-like overlap is the signature sound.',
        use: 'Melodic turnarounds and solo island instrumentals in G.',
        goal: 96,
      },
    },
    {
      id: 'cl-hw-keola-vamp', name: 'Keola Beamer harmonic & island vamp', level: 2, kind: 'turnaround', chord: 'D7 | G', bpm: 78,
      tab: 'e 4:0 2:3+1:2 4:0 2:1+1:0 q 2:3+1:2 1:12n | q 2:12n 3:12n h 6:3+3:0+2:0+1:0~',
      must: {
        about: 'Iconic Hawaiian slack-key turnaround vamp: D7 → C → D7 double stops answered by ringing 12th-fret chimes over open G.',
        steps: [
          'Thumb bounces open D on beats 1 and 2 while fingers pinch sweet double stops on B and e (3+2 → 1+0 → 3+2).',
          'Touch lightly over the 12th fret wire across strings 1, 2 and 3 in gentle staggered chime notes, resolving warmly onto low G (E-3) + open strings.',
        ],
        tip: 'Ring the 12th-fret chimes with your pinky or ring finger directly over the fret wire for crystalline bell tones.',
        use: 'Turnarounds between verses and gentle slack-key endings in G.',
        goal: 84,
      },
    },
  ], false),

  // ───────────────────────── Reggae Rock (Sublime, Stick Figure, Rebelution, Common Kings)
  ...C('reggaerock', 'A', [
    {
      id: 'cl-rr-bradley-skank', name: 'Sublime Bradley crisp skank & dub run', level: 2, kind: 'riff', chord: 'Am | G', bpm: 92,
      tab: 'e r 3:5+2:5+1:5 r 3:5+2:5+1:5 r 3:5+2:5+1:5 4:7 4:5 | e r 3:4+2:3+1:3 r 3:4+2:3+1:3 5:5 5:3 q 6:3~',
      must: {
        about: 'SoCal reggae-rock drive: razor-sharp offbeat chord chops on "&" beats anchored by a gritty, rolling dub bass run.',
        steps: [
          'Chop the high Am barre triad (G-5, B-5, e-5) strictly on beats "1-&, 2-&, 3-&"—rest on the downbeats!',
          'On beat 4, drop sharply onto the D string (7 → 5) like a bass line.',
          'Bar 2 moves to crisp G chops (G-4, B-3, e-3) and walks down A-5 → A-3 → low E-3.',
        ],
        tip: 'Mute completely right after each offbeat chop—the big silent downbeats make the reggae bounce hit hard.',
        use: 'SoCal reggae-rock verses and chorus drops over Am–G.',
        goal: 100,
      },
    },
    {
      id: 'cl-rr-stick-bubble', name: 'Stick Figure dreamy delay & dub drop', level: 2, kind: 'lick', chord: 'Am', bpm: 82,
      tab: 'e 6:5 4:7 3:5 r 1:5 2:8 q 2:5~ | e 2:8 2:5 3:7 3:5 h 4:7~',
      must: {
        about: 'Atmospheric dub-reggae melody: spacious minor-pentatonic notes that leave room for delay echoes and heavy sub-bass.',
        steps: [
          'Start calmly from low A (E-5) up D-7→G-5, rest a beat, then pop bright top e-5 → B-8 → B-5.',
          'Answer lazily behind the beat in bar 2 down to D-7 with gentle vibrato.',
        ],
        tip: 'Hold notes lightly and leave generous rests—reggae soloing is about breathing room, not density.',
        use: 'Chill dub breakdowns and spacious minor reggae solos over Am.',
        goal: 90,
      },
    },
    {
      id: 'cl-rr-island-third', name: 'Island reggae sweet major thirds', level: 1, kind: 'double-stop', chord: 'C | G', ref: 'C', bpm: 88,
      tab: 'e r 2:5+1:3 2:6+1:5 q. 2:8+1:7~ e 2:6+1:5 2:5+1:3 | q 2:3+1:1 2:5+1:3 h 2:3+1:0~',
      must: {
        about: 'Sunny island-reggae harmony: smooth harmonized thirds gliding sweetly over C → G.',
        steps: [
          'Start on the "&" of beat 1 (B-5+e-3) and walk smoothly up to B-6+e-5 and B-8+e-7.',
          'Step warmly back down 6+5 → 5+3, then bar 2 glides through 3+1 → 5+3 → B-3+open e.',
        ],
        tip: 'Slide gently between shapes instead of picking harshly—think sweet vocal harmonies.',
        use: 'Island reggae intros, sunny choruses and romantic reggae grooves.',
        goal: 96,
      },
    },
    {
      id: 'cl-rr-rebelution-Skank', name: 'Rebelution tight roots bubble bounce', level: 2, kind: 'riff', chord: 'Am | F', bpm: 90,
      tab: 's r 3:5+2:5+1:5 r 3:5+2:5+1:5 r 3:5+2:5+1:5 r 3:5+2:5+1:5 r 3:5+2:5+1:5 r 3:5+2:5+1:5 r 3:5+2:5+1:5 r 3:5+2:5+1:5 | e r 3:5+2:6+1:5 r 3:5+2:6+1:5 r 3:5+2:6+1:5 q 3:5+2:5+1:5~',
      must: {
        about: 'Tight Californian roots-reggae double-skank bubble: locking percussive offbeat double-hits solidly behind the groove.',
        steps: [
          'Hold the small Am top shape (G-5, B-5, e-5) and strike crisp muted upstrokes on the off-beats.',
          'Drop cleanly onto F major (G-5, B-6, e-5) in bar 2 while keeping identical staccato snap.',
        ],
        tip: 'Use thin pick motion on only the top three strings—too much low-end muddies the reggae snare pocket.',
        use: 'Upbeat reggae verses over Am–F–C–G.',
        goal: 100,
      },
    },
  ], true),

  // ───────────────────────── Bluegrass (MAX <= 12 added so total bluegrass < 40! Currently 22 -> add 8 = 30!)
  // Artists: Tony Rice, Doc Watson, Clarence White, Norman Blake, Bryan Sutton, Molly Tuttle, Dan Crary
  ...C('bluegrass', 'G', [
    {
      id: 'cl-bg-tony-grun', name: 'Tony Rice long-line G run & blues snap', level: 2, kind: 'ending', chord: 'G', bpm: 128,
      tab: 'e 6:3 5:0 5:1h 5:2 4:0 4:2 3:0 3:3bqp | e 3:0 4:2 4:0 5:2 5:1 5:0 q 6:3~',
      must: {
        about: 'Tony Rice signature G-run: snapping across the open strings into a cheeky quarter-step blues nudge on the G string before tumbling cleanly home.',
        steps: [
          'Pick cleanly down-up: low G (E-3) → open A → hammer A-1 to A-2 → open D → D-2 → open G → snap G-3 with a tiny blues tug.',
          'Pull cleanly to open G, reverse smoothly down D-2, open D, A-2, A-1, open A, and pop E-3 firmly.',
        ],
        tip: 'Let the flatpick glide crisply down-up—do not stop your wrist between open strings and fretted snaps.',
        use: 'Ending vocals, breaks and fiery chorus turnarounds in G.',
        goal: 150,
      },
    },
    {
      id: 'cl-bg-doc-watson', name: 'Doc Watson Black Mountain crosspick', level: 2, kind: 'lick', chord: 'G', bpm: 120,
      tab: 'e 6:3 4:0 3:0 2:0 3:2h 3:0 4:2 4:0 | e 5:2 5:0 4:2 4:0 3:2 3:0 q 6:3~',
      must: {
        about: 'Doc Watson warm rolling clarity: open G crosspicking paired with snappy first-position hammer-ons and bass resolution.',
        steps: [
          'Strike bass G (E-3), roll cleanly across open D, G and B strings, hammer G-2 then lift open, and walk down D-2 → D-0.',
          'Bar 2 walks crisply down A-2→0 → D-2→0 → G-2→0 right onto the ringing bass G.',
        ],
        tip: 'Hold a relaxed pick grip near the soundhole—Doc got huge acoustic volume from clean stroke follow-through, never tension.',
        use: 'Traditional fiddle tunes and folk-bluegrass vocals in G.',
        goal: 136,
      },
    },
    {
      id: 'cl-bg-clarence-sync', name: 'Clarence White syncopated Nashville bounce', level: 3, kind: 'lick', chord: 'G', bpm: 124,
      tab: 'e 3:0 3:3h 3:4 2:3 1:3 2:3 3:3 3:0 | e 4:2 4:0 5:2 5:1 5:0 6:3 q 6:3~',
      must: {
        about: 'Clarence White revolutionary bluegrass bounce: crossing the minor-to-major third (Bb→B) with jazz-like rhythmic elasticity right over G.',
        steps: [
          'Pick open G, hammer G-3 → slide/step to G-4 (B), pop B-3 (D) and high e-3 (G), then drop back B-3 → G-3 → open G.',
          'Bar 2 walks chromatically down through A-2, A-1, open A and punches the root G cleanly.',
        ],
        tip: 'Accent beat 2+ ("G-4") slightly to make the flatpicked line swing like Clarence.',
        use: 'Syncopated breaks over G in bluegrass or country-rock.',
        goal: 142,
      },
    },
    {
      id: 'cl-bg-norman-blake', name: 'Norman Blake low-string Church Street roll', level: 2, kind: 'run', chord: 'C | G', ref: 'C', bpm: 112,
      tab: 'e 5:3 4:0 4:2 4:3 4:2 4:0 5:3 5:2 | e 5:0 6:3 6:1 6:3 q 5:3~ r',
      must: {
        about: 'Warm, woody mahogany rhythm-and-lead bass motion in the key of C—melody weaving right through the low strings.',
        steps: [
          'Walk up smoothly from A-3 (C) across D-0→2→3→2→0, then walk back through A-3→A-2.',
          'Bar 2 dips warmly to open A, low E-3, E-1 (F), E-3 and lands solidly on A-3 (C).',
        ],
        tip: 'Let open strings ring lightly alongside your bass notes so it sounds like a whole rhythm section at once.',
        use: 'Storytelling folk-bluegrass tunes in C.',
        goal: 124,
      },
    },
    {
      id: 'cl-bg-sutton-cross', name: 'Bryan Sutton crisp crosspicking cascade', level: 3, kind: 'arpeggio', chord: 'G', bpm: 130,
      tab: 'e 4:0 3:0 2:0 4:0 3:0 2:3 4:0 3:2 | e 2:0 3:0 4:2 3:0 4:0 5:2 q 6:3~',
      must: {
        about: 'Modern flatpicking banjo-roll illusion: repeating 3-note patterns across open strings G-D-B so it shimmers like a 5-string banjo.',
        steps: [
          'Keep strict alternating or D-D-U crosspicking across D-G-B: 0-0-0, then 0-0-B3, then D0-G2.',
          'In bar 2 unwind smoothly down B-0 → G-0 → D-2 → G-0 → D-0 → A-2 → G.',
        ],
        tip: 'Keep your right wrist close to the strings—big pick motions destroy crosspicking evenness.',
        use: 'Vocal backing fills and high-speed acoustic showcases in G.',
        goal: 146,
      },
    },
    {
      id: 'cl-bg-d-fiddle', name: 'Tony Rice Key of D fiddle tune sparkle', level: 2, kind: 'run', chord: 'D', ref: 'D', bpm: 126,
      tab: 'e 4:0 3:2 3:4 2:3 1:2 1:3 1:5 1:3 | e 1:2 2:3 2:2 2:3 3:2 4:4 q 4:0~',
      must: {
        about: 'Classic fiddle-tune drive in D major: soaring up to fret 5 on high E with open D resonance ringing underneath.',
        steps: [
          'Start on open D, climb G-2 → G-4 → B-3 → e-2 → e-3 → e-5 (A) → e-3.',
          'Tumble cleanly down e-2, B-3→2→3, G-2, D-4, and resolve straight home to ringing open D.',
        ],
        tip: 'Leave the D string completely open on beat 1 so every note above sits against that rich D drone.',
        use: 'Whiskey Before Breakfast / Blackberry Blossom style D fiddle tunes.',
        goal: 144,
      },
    },
    {
      id: 'cl-bg-tuttle-roll', name: 'Molly Tuttle claw-crosspick sparkle in C', level: 2, kind: 'lick', chord: 'C', ref: 'C', bpm: 122,
      tab: 'e 5:3 4:2 3:0 2:1 1:0 2:1 3:0 4:2 | e 5:3 4:0 3:2h 3:0 4:2 4:0 q 5:3~',
      must: {
        about: 'Silky acoustic precision in C major: weaving rolling chord arpeggios seamlessly with open-string bluegrass hammer-ons.',
        steps: [
          'Hold a full open C chord and pick smoothly up and back down strings 5–1–5.',
          'Lift to open D, punch a crisp G-2 hammer-on, pull cleanly back open and walk home to A-3 (C).',
        ],
        tip: 'Keep every fretted finger arched cleanly so open strings G and high E sing bright beside fretted notes.',
        use: 'Bluegrass ballads and vocal breaks over C major.',
        goal: 136,
      },
    },
    {
      id: 'cl-bg-crary-casc', name: 'Dan Crary cascading fiddle scale run', level: 2, kind: 'run', chord: 'G', bpm: 130,
      tab: 'e 1:3 1:2 1:0 2:3 2:1 2:0 3:2 3:0 | e 4:4 4:2 4:0 5:2 5:0 6:3 q 6:3~',
      must: {
        about: 'Pure linear flatpicking velocity: flying down two full octaves of G major mixing ringing open strings with crisp fretted steps.',
        steps: [
          'Roll straight down: e-3,2,0 → B-3,1,0 → G-2,0.',
          'Continue down D-4,2,0 → A-2,0 → E-3 with exact down-up alternate picking.',
        ],
        tip: 'Let open strings slightly overlap fretted notes like chimes for rich acoustic depth.',
        use: 'Big sweeping endings and fast fiddle-tune breakdowns in G.',
        goal: 150,
      },
    },
  ], false),

  // ───────────────────────── Billy Strings / Modern Bluegrass Flatpicking
  ...C('billy', 'G', [
    {
      id: 'cl-bs-turbo-grun', name: 'Billy Strings runaway G-run with b5 rip', level: 3, kind: 'run', chord: 'G', bpm: 144,
      tab: 's 6:3 5:0 5:1 5:2 4:0 4:2 3:0 3:3 3:4 2:3 2:5 2:6 1:3 1:6p 1:3 2:5 | e 2:3 3:3 3:0 4:2 4:0 5:2 q 6:3~',
      must: {
        about: 'Turbocharged Billy Strings jam-grass burn: roaring up from the open G bass straight past the blues flat-5 into the top strings and firing back down.',
        steps: [
          'Sprint clean alternate-picked 16ths: E-3 → A-0,1,2 → D-0,2 → G-0,3,4 → B-3,5,6 → e-3, pull 6→3, drop B-5.',
          'Bar 2 switches to punchy eighth notes down the open bluegrass pocket straight home to E-3.',
        ],
        tip: 'Stay completely relaxed in the forearm—use tiny wrist rotation for the 16th-note burst in bar 1.',
        use: 'Climax of fast jam-grass solos in G.',
        goal: 162,
      },
    },
    {
      id: 'cl-bs-train-beat', name: 'Billy Strings Dust-style crosspick train', level: 2, kind: 'lick', chord: 'Am | G', ref: 'A', bpm: 138,
      tab: 'e 5:0 4:2 3:2 2:1 1:0 2:1 3:2 4:2 | e 5:0 4:2 3:0 2:3 1:3 2:3 3:0 4:0',
      must: {
        about: 'Propulsive bluegrass locomotive crosspicking: rolling cleanly up and down open Am and G shapes like a rushing steam train.',
        steps: [
          'Hold a standard Am chord and pick strictly down-up across A → D → G → B → e → B → G → D.',
          'In bar 2, lift your index and ring onto G-shape top notes (B-3, e-3) while keeping open G and D chugging.',
        ],
        tip: 'Accent beat 1 (A string) and beat 3 (open high E / e-3) so it surges forward like a train rhythm.',
        use: 'Fast acoustic jams over Am–G–F–G.',
        goal: 152,
      },
    },
    {
      id: 'cl-bs-fiddle-double', name: 'Billy Strings screeching fiddle double-stops', level: 3, kind: 'double-stop', chord: 'G', bpm: 136,
      tab: 'e 2:8+1:7 2:8+1:7 2:7+1:6 2:8+1:7 2:10+1:10 2:8+1:7 q 2:6+1:5 | e 2:3+1:3 2:6/+1:5/ 2:8+1:7 q. 2:3+1:3~ q r',
      must: {
        about: 'Fiddle-style high double stops played with flatpick fury—bouncing thirds and fourths down the top two strings.',
        steps: [
          'Grip B-8 + e-7 (G major top third), dip chromatically one fret down (7+6) and back, then pop up to 10+10.',
          'Walk through 6+5 and 3+3, sliding sharply back up 6+5 → 8+7 and resolving home on 3+3.',
        ],
        tip: 'Dig crisply into both top strings at once so the two notes fuse together like a bow across two fiddle strings.',
        use: 'High-energy jamgrass breaks and traded licks with fiddle/mandolin.',
        goal: 148,
      },
    },
  ], false),

  // ───────────────────────── Acoustic Singer-Songwriter (Dylan Gossett, Zach Bryan, Noah Kahan, Tyler Childers)
  ...C('acoustic', 'G', [
    {
      id: 'cl-ac-gossett-hammer', name: 'Dylan Gossett open-G hammer & drone', level: 1, kind: 'lick', chord: 'G', bpm: 86,
      tab: 'e 6:3 4:0 4:2h 3:0 2:3 1:0 2:3 3:0 | q 5:3+4:2+3:0+2:3 e 5:2h 4:0 q 6:3+3:0+2:3+1:3~',
      must: {
        about: 'Heartland acoustic warmth: hammering into the open D string while keeping the high G-chord ring pinned underneath.',
        steps: [
          'Keep ring finger on B-3 and pinky/middle on low E-3: pluck low G, open D hammered to D-2, let open G and top notes shimmer.',
          'In bar 2, strum a rich Cadd9 shape, hammer A-2 cleanly over open D, and settle back onto open G.',
        ],
        tip: 'Leave your ring finger glued down on B-3 the entire time—that shared anchor keeps every chord ringing together.',
        use: 'Modern folk-country acoustic songs and storytelling ballads in G.',
        goal: 96,
      },
    },
    {
      id: 'cl-ac-bryan-walk', name: 'Zach Bryan bittersweet bass walk & pluck', level: 1, kind: 'riff', chord: 'G D/F# | Em', bpm: 90,
      tab: 'e 6:3 3:0+2:3 6:3 3:0+2:3 6:2 3:2+2:3 6:2 3:2+2:3 | e 6:0 3:0+2:3 4:2 4:0 h 5:2~',
      must: {
        about: 'Raw campfire storytelling groove: walking the bass cleanly G → F# → Em under a ringing top chord drone.',
        steps: [
          'Hold B-3 down while your thumb plucks E-3, pinches G+B, then walks index/thumb smoothly to E-2 (F#).',
          'Open up onto low open E (Em7) in bar 2, dipping through D-2→0 onto A-2.',
        ],
        tip: 'Use a warm, human strum touch—slightly brushed chords feel far more authentic than stiff metronomic hits.',
        use: 'Acoustic storytelling verses over G → D/F# → Em → C.',
        goal: 98,
      },
    },
    {
      id: 'cl-ac-kahan-boom', name: 'Noah Kahan driving folk-stomp chord bounce', level: 2, kind: 'riff', chord: 'C | G', ref: 'C', bpm: 108,
      tab: 'e 5:3 4:2 4:0h 4:2 3:0 2:1 1:0 2:1 | q 6:3+3:0+2:0+1:3 e 5:0h 5:2 4:0 3:0 q 6:3~',
      must: {
        about: 'Modern New England stomp-folk drive: fast hammer-ons inside open C and G shapes pushed relentlessly forward.',
        steps: [
          'Pick A-3, D-2, pull off D-2 to open and hammer right back onto D-2 before shimmering up G-B-e.',
          'Bar 2 lands firmly on big open G with a punchy A-0→2 hammer bounce.',
        ],
        tip: 'Tap your heel hard on beats 1 and 3 and snap those open hammer-ons right in the pocket.',
        use: 'Driving indie-folk choruses and upbeat acoustic strumming.',
        goal: 118,
      },
    },
    {
      id: 'cl-ac-childers-holler', name: 'Tyler Childers mountain mountain-modal walk', level: 2, kind: 'lick', chord: 'G | C', bpm: 94,
      tab: 'e 6:3 5:0 5:2 4:0 4:2 3:0 2:3 3:0 | e 5:3 4:2 4:0 5:3 5:2 5:0 q 6:3~',
      must: {
        about: 'Appalachian outlaw acoustic punch: walking straight up the open pentatonic chord spine into ringing B-3 shimmer and right back down.',
        steps: [
          'Flatpick cleanly up low G → open A → A-2 → open D → D-2 → open G → B-3.',
          'In bar 2 walk down C (A-3) through D-2→0 and bass C–B–A back home to open G.',
        ],
        tip: 'Let open strings blur naturally under your strumming hand like big acoustic rhythm accompaniment.',
        use: 'Country-folk storytelling songs over G–C–D.',
        goal: 104,
      },
    },
  ], false),

  // ───────────────────────── Country (Brad Paisley, Brent Mason, Albert Lee, Chet Atkins, Vince Gill)
  ...C('country', 'G', [
    {
      id: 'cl-cw-paisley-snap', name: 'Brad Paisley chicken-pickin\' hybrid snap', level: 2, kind: 'lick', chord: 'G7', bpm: 116,
      tab: 'e 4:5m 1:3 4:3m 1:6 4:4m 1:7 2:8 2:6p | e 2:5 3:7 3:6 3:5 h 4:5~',
      must: {
        about: 'Pure modern Nashville Telecaster twang: palm-muted bass notes popped against stinging middle-finger snapped high strings.',
        steps: [
          'Use hybrid picking: palm-mute D-5 with your pick, then pluck and snap e-3 with your middle finger so it pops sharply against the fret.',
          'Walk up D-3 → e-6, D-4 → e-7, peel smoothly off B-8→B-6p→B-5, and walk chromatically down G-7→6→5 to G (D-5).',
        ],
        tip: 'Pull your middle finger slightly upward away from the fretboard before letting go on beat 1+ and 2+—that snapping pop IS chicken pickin\'.',
        use: 'Country grooves, Telecaster solos and upbeat honky-tonk turnarounds over G7.',
        goal: 128,
      },
    },
    {
      id: 'cl-cw-mason-steel', name: 'Brent Mason pedal-steel double-stop bend', level: 2, kind: 'double-stop', chord: 'G', bpm: 92,
      tab: 'q 3:7b+2:8 2:8+1:7 e 3:7r+2:8 3:5+2:6 q 4:5+3:4~ | e 3:2/ 3:4 2:3 1:3 h 2:3~',
      must: {
        about: 'Nashville session staple: holding a high chord note stationary while bending the lower G-string up into it like two crying pedal-steel strings.',
        steps: [
          'Plant pinky on B-8 (G) and ring finger on G-7 (D). Strike both together and bend only the G string up a whole step to E.',
          'Step quickly up to B-8+e-7, lower the bent G back down cleanly, then slide into the major third (D-5+G-4).',
          'Slide smoothly up G-2→4 through the G triad in bar 2.',
        ],
        tip: 'Keep your pinky arched and rock-solid on B-8 so its pitch never goes sharp while you push G-7.',
        use: 'Country ballads, intro fills and sweet major-chord turnarounds.',
        goal: 100,
      },
    },
    {
      id: 'cl-cw-lee-cascade', name: 'Albert Lee banjo-roll speed run', level: 3, kind: 'run', chord: 'G', bpm: 132,
      tab: 's 1:3 2:5 3:4 1:3 2:5 3:4 1:3 2:6 3:5 1:3 2:6 3:5 1:3 2:5 3:4 2:3 | q 3:2/ 3:4~ h r',
      must: {
        about: 'Country Boy lightning illusion: hybrid picking a three-string pattern (ring on e, middle on B, pick on G) so fast 16ths roll effortlessly.',
        steps: [
          'Shape the G chord top (G-4, B-5, e-3) and cycle ring → middle → pick twice.',
          'Move one fret up on B & G (G-5, B-6, keeping e-3!) for the C/G flavor twice, then drop cleanly back and slide into G-4.',
        ],
        tip: 'Do not pick every note with a flatpick—assigning one finger per string makes country speeds feel relaxing.',
        use: 'Upbeat country showcases and ending flourishes in G.',
        goal: 150,
      },
    },
    {
      id: 'cl-cw-chet-thumb', name: 'Chet Atkins alternating thumb boom-chick', level: 2, kind: 'lick', chord: 'G', bpm: 106,
      tab: 'e 6:3 2:0 4:0 1:3 5:2 2:3 4:0 1:2 | e 6:3 2:0 4:0 2:3 5:2 3:0 q 6:3~',
      must: {
        about: 'Certified Guitar Player thumb-style groove: the thumb lays down a rock-steady alternating bass while fingers pluck a bright syncopated country melody.',
        steps: [
          'Keep your thumb playing strictly on the beats (E-3 → open D → A-2 → open D), lightly palm-muted.',
          'Pinch and weave melody notes (open B, e-3, B-3, e-2) smoothly between the thumb pulses.',
        ],
        tip: 'Practice the thumb line completely alone until it runs on autopilot, then drop the top melody fingers in one beat at a time.',
        use: 'Solo country fingerstyle and acoustic accompaniment in G.',
        goal: 118,
      },
    },
    {
      id: 'cl-cw-gill-sweet', name: 'Vince Gill crying ballad bend & release', level: 2, kind: 'lick', chord: 'G', bpm: 72,
      tab: 'q 2:8b e 2:8r 2:6 q 3:7~ r | e 3:4/ 3:7 2:8 1:7 h 2:8~',
      must: {
        about: 'Silky Nashville country ballad Tele tone: weeping slow-release bends falling straight into glowing major-6th and triad chord tones.',
        steps: [
          'Slowly lift B-8 a full step, release gracefully down to B-6 and settle on G-7 (D).',
          'Slide smoothly up G-4→7, step cleanly to B-8 and e-7, and sustain B-8 with liquid finger vibrato.',
        ],
        tip: 'Wait a tiny fraction longer before releasing B-8—let the high pitch shimmer before sighing downward.',
        use: 'Slow 4/4 country ballads and Telecaster intros over G.',
        goal: 78,
      },
    },
  ], false),

  // ───────────────────────── Folk (James Taylor, Nick Drake, Elizabeth Cotten / Doc Watson)
  ...C('folk', 'C', [
    {
      id: 'cl-fo-jt-walk', name: 'James Taylor warm Fire-style chord walk', level: 2, kind: 'arpeggio', chord: 'C G/B | Am7', bpm: 84,
      tab: 'e 5:3 4:2 2:1 3:0 5:2 4:0 2:3 3:0 | e 5:0 4:2 2:1 3:0 5:0 3:2h 2:1 3:0~',
      must: {
        about: 'Cozy James Taylor acoustic touch: walking bass notes C → B → A underneath plucked open strings and a tender little hammer-on.',
        steps: [
          'Thumb picks A-3 (C) while fingers bounce B-1 and open G; move index to A-2 (B) + ring to B-3 (D) for beat 3.',
          'Drop cleanly to open A (Am7) in bar 2 and sneak a delicate hammer onto G-2 before letting open G shine.',
        ],
        tip: 'Use the flesh of your fingertips gently without nails catching—James Taylor gets his piano warmth by brushing softly near the neck.',
        use: 'Singer-songwriter folk ballads in C or G.',
        goal: 92,
      },
    },
    {
      id: 'cl-fo-drake-bloom', name: 'Nick Drake pastoral open-chord shimmer', level: 2, kind: 'arpeggio', chord: 'Cadd9', bpm: 78,
      tab: 'e 5:3 4:2 2:3 1:0 3:0 2:3 4:2 1:0 | e 5:3 4:0 2:3 1:0 3:2 2:1 q 5:3+3:0+2:1~',
      must: {
        about: 'Haunting English pastoral folk: weaving rich add9 colors inside rolling fingerpicked arpeggios.',
        steps: [
          'Hold Cadd9 (A-3, D-2, G-0, B-3, e-0) and roll calmly across strings with thumb + index + middle.',
          'In bar 2, lift D-2 open for lush suspended space before folding gently onto G-2 and B-1.',
        ],
        tip: 'Keep a steady hypnotic pulse without heavy accents—let every open string breathe evenly.',
        use: 'Gentle fingerpicked folk intros and moody verses.',
        goal: 86,
      },
    },
    {
      id: 'cl-fo-freight-train', name: 'Elizabeth Cotten / Doc Travis classic', level: 1, kind: 'lick', chord: 'C | G7', bpm: 100,
      tab: 'e 5:3 2:1 4:2 1:0 5:3 2:1 4:2 1:3 | e 6:3 2:0 4:0 1:1 6:3 2:3 4:0 1:0~',
      must: {
        about: 'Foundational American Travis-picking song: alternating bass thumb under a cheerful syncopated melody.',
        steps: [
          'Thumb alternates cleanly A-3 → D-2 over C, then low E-3 → open D over G7.',
          'Fingers answer right on the melody notes (B-1, e-0, e-3 → B-0, e-1, B-3, e-0).',
        ],
        tip: 'Lightly palm-mute the lowest bass strings with the heel of your hand so the melody sparkles clearly above.',
        use: 'Traditional American folk songs and Travis-pick arrangements.',
        goal: 112,
      },
    },
  ], false),

  // ───────────────────────── Melodic Fingerstyle (Marco Cirillo, Tommy Emmanuel, Andy McKee)
  ...C('fingerstyle', 'C', [
    {
      id: 'cl-fs-tommy-boom', name: 'Tommy Emmanuel thumb-groove melody spark', level: 2, kind: 'lick', chord: 'Am | F', ref: 'A', bpm: 96,
      tab: 'e 5:0 2:1 4:2 1:0 5:0 1:3 4:2 2:1 | e 6:1 2:1 4:3 1:0 6:1 3:2h 4:3 2:1~',
      must: {
        about: 'Tommy Emmanuel one-man-band secret: an unshakeable bass boom-chick groove while your top fingers sing and ornament freely above.',
        steps: [
          'Thumb thumps steady Am bass (A-0 → D-2) while fingers snap e-0, reach pinky onto e-3, and step back to B-1.',
          'Wrap thumb onto F (low E-1) in bar 2 and keep the melody bouncing sweetly with a G-2 hammer-on.',
        ],
        tip: 'Tap your toe hard and smile—groove comes from keeping the thumb steady even if the melody changes.',
        use: 'Solo acoustic fingerstyle performances over Am–F–C–G.',
        goal: 108,
      },
    },
    {
      id: 'cl-fs-cirillo-cascade', name: 'Cirillo luminous add9 harp roll', level: 2, kind: 'arpeggio', chord: 'Cadd9', ref: 'C', bpm: 74,
      tab: 'e 5:3 4:2 3:0 2:3 1:0 1:3 1:0 2:3 | e 5:3 3:0 2:3 1:7 1:5 1:3 q 5:3+3:0+2:3~',
      must: {
        about: 'Marco Cirillo lush melodic fingerstyle: overlapping open strings paired with singing top-E chord-extension melodies.',
        steps: [
          'Pluck A-3, D-2, open G, B-3, open e, grab e-3 with pinky, pull to open e and back to B-3.',
          'In bar 2, reach high cleanly to e-7 (B, the major 7th!), walk sweetly down 7→5→3 and let the warm Cadd9 chord ring.',
        ],
        tip: 'Arpeggiate gently with p-i-m-a so every string sings like a concert harp.',
        use: 'Dreamy acoustic intros and solo melodic fingerstyle pieces.',
        goal: 82,
      },
    },
    {
      id: 'cl-fs-mckee-slap', name: 'Andy McKee rhythmic thumb-thump & chime', level: 2, kind: 'riff', chord: 'Am7', ref: 'A', bpm: 88,
      tab: 'e 5:0 3:5+2:5+1:0 4:x 3:5+2:5+1:3 5:0 3:5+2:5+1:0 4:x 2:5 | q 3:12n+2:12n+1:12n~ e 4:0 3:2 h 5:0+3:0+2:1~',
      must: {
        about: 'Modern percussive acoustic fingerstyle: deep open bass, gentle body/string thumps on beats 2 & 4, and shimmering harmonics.',
        steps: [
          'Hold fifth-fret notes on G & B leaving open high E free: pluck open A, snap the chord, then lightly slap the low string for a snare-like "chk".',
          'Cap beat 1 of bar 2 with glowing 12th-fret natural harmonics and settle gently onto open Am.',
        ],
        tip: 'Keep the percussion slap musical and balanced—no louder than a light snare brush.',
        use: 'Contemporary solo acoustic instrumentals.',
        goal: 96,
      },
    },
  ], false),
]
