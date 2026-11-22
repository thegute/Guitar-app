// Pro Licks Pack A (50 authentic working-pro signature licks across Roots, Acoustic, Island, Blues-Pop & Neo-Soul).
// Appended after CLASSIC_LICKS in library.ts so zero existing licks are modified or shifted.
import type { LickStyleId } from './styles'

export interface ProLick {
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

const P = (
  style: LickStyleId,
  ref: string,
  list: (Omit<ProLick, 'style' | 'ref'> & { ref?: string })[],
  minor?: boolean,
): ProLick[] => list.map(l => ({ style, ref, ...(minor !== undefined && l.minor === undefined ? { minor } : {}), ...l }))

export const PRO_LICKS_A: ProLick[] = [
  // ───────────────────────── Bluegrass (5)
  ...P('bluegrass', 'G', [
    {
      id: 'pro-bg-rice-float', name: 'Tony Rice floating cross-string syncopation', level: 3, kind: 'run', chord: 'G', bpm: 132,
      tab: 'e 3:2h 3:3 2:0 3:2 4:5 3:0 4:3 4:2 | e 4:0 5:3 5:2 5:0 q 6:3 6:3~',
      must: {
        about: 'Tony Rice’s signature "floating" syncopation: alternating fretted notes with open strings across adjacent strings so the melody shimmers like a waterfall at speed.',
        steps: ['Hammer fret 2 to 3 on the G string (A to Bb), then catch the open B string cleanly with an upstroke.', 'Drop to fret 5 on the D string (G) and ring the open G right after it — that unison/octave ring is the Rice magic.', 'Walk chromatically down D-3, D-2, open D, then A-3, A-2, open A to land solidly on low G (E-3).'],
        tip: 'Keep strict alternating down-up picking and let every open string ring slightly into the next note.',
        use: 'Over a 2-bar G break in any bluegrass standard or jam.', goal: 132,
      },
    },
    {
      id: 'pro-bg-grier-d', name: 'David Grier chromatic D-position rip', level: 3, kind: 'run', ref: 'D', chord: 'D', bpm: 128,
      tab: 'e 1:2 1:3 1:4 1:5 1:2 2:3 2:2 2:0 | e 3:2 3:1 3:0 4:4 h 4:0~',
      must: {
        about: 'David Grier’s fearless chromatic passing line in D: climbs chromatically from F# to A on the high E, then tumbles straight back into open D.',
        steps: ['Use fingers 1–2–3–4 cleanly across frets 2, 3, 4, 5 on the high E string.', 'Drop back to F# (e-2), B-3 (D), B-2 (C#), and open B.', 'Walk down G-2, G-1, open G, then D-4 (F#) resolving to open D.'],
        tip: 'Accent beat 1 and beat 3 so the chromatic passing notes sound intentional and swinging, never random.',
        use: 'Over the V chord in G or the I chord in D fiddle tunes.', goal: 128,
      },
    },
    {
      id: 'pro-bg-watson-walk', name: 'Doc Watson thumb-drive bass walk-up', level: 1, kind: 'lick', chord: 'G | C', bpm: 112,
      tab: 'q 6:3 e 6:3 5:0 5:2h 5:3 q 4:0 | q 5:3 e 4:0 4:2 4:0 5:3 q 5:3~',
      must: {
        about: 'Doc Watson’s warm, muscular flatpicked bass walk connecting G into C with a crisp A-string hammer-on.',
        steps: ['Strike low G (E-3) solidly with a downstroke, then bounce into open A and hammer A-2 to A-3 (B to C).', 'Pop the open D string on beat 4 for drive before landing squarely on C (A-3) in bar 2.', 'Answer with a tiny D-string bounce (0–2–0) right back into C.'],
        tip: 'Rest your picking hand lightly near the bridge for punchy dreadnought bass authority.',
        use: 'Connecting G to C in folk, country, and bluegrass rhythm breaks.', goal: 112,
      },
    },
    {
      id: 'pro-bg-white-tag', name: 'Clarence White syncopated C-to-G tag', level: 2, kind: 'turnaround', chord: 'C | G', bpm: 120,
      tab: 'e 2:1 1:0 2:3 2:1 3:2 3:0 4:2 4:0 | e 5:2h 5:3 5:2 5:0 h 6:3~',
      must: {
        about: 'Clarence White’s off-beat Nashville syncopation: weaves high C chord tones into a snappy low-string turnaround back to G.',
        steps: ['Hold a loose C shape and pick B-1, open high E, pinky on B-3 (D), back to B-1.', 'Walk down G-2, open G, D-2, open D.', 'Finish bar 2 with a snappy hammer-pull on A-2 to A-3 back to open A and low G.'],
        tip: 'Give the open high E on the "&" of beat 1 an upbeat snap — that off-beat pop is pure Clarence White.',
        use: 'Turnaround from IV (C) back to I (G) at the end of a verse or solo.', goal: 120,
      },
    },
    {
      id: 'pro-bg-smith-roll', name: 'Kenny Smith Scruggs-roll crosspick', level: 2, kind: 'arpeggio', chord: 'G | D7', bpm: 126,
      tab: 'e 4:0 3:0 2:0 4:0 3:0 2:3 3:0 2:0 | e 4:0 3:2 2:1 3:2 4:0 3:0 q 6:3~',
      must: {
        about: 'Modern flatpicking crosspick roll in the style of Kenny Smith: mimics a 3-finger banjo roll across D–G–B strings using pure down-down-up or alternate picking.',
        steps: ['Roll smoothly across open D, open G, open B in groups of three eighths, adding B-3 (D) for melodic lift.', 'In bar 2, fret D7 tones (G-2 and B-1) right inside the same three-string roll.', 'Resolve cleanly to low G (E-3) on beat 3.'],
        tip: 'Keep all three strings ringing together like a chord — avoid muting with your left hand.',
        use: 'Filling space over G and D7 in driving bluegrass songs.', goal: 126,
      },
    },
  ]),

  // ───────────────────────── Modern Bluegrass / Billy Strings (5)
  ...P('billy', 'G', [
    {
      id: 'pro-bs-dorian-jam', name: 'Billy Strings Dorian jam tear', level: 3, kind: 'run', chord: 'Gm | C7', bpm: 136, minor: true,
      tab: 'e 3:0 3:3 2:1 2:3 1:1 1:3 1:1 2:3 | e 2:1 3:3 3:2 3:0 4:3 4:0 q 6:3~',
      must: {
        about: 'Modern jam-grass Dorian run: blends minor 3rd (Bb) with bright major 6th (E on the high E or D-2) for that Grateful Dead meets bluegrass psychedelic lift.',
        steps: ['Launch from open G to Bb (G-3), then C (B-1), D (B-3), F (e-1), and high G (e-3).', 'Turn back down through B-3, B-1, G-3, and hit A (G-2) before open G.', 'Snap through F (D-3) and open D right into low G.'],
        tip: 'Dig in with a thick pick (1.14 mm+) and push the tempo smoothly with relaxed wrist motion.',
        use: 'Over extended minor or modal bluegrass jams in Gm / G Dorian.', goal: 136,
      },
    },
    {
      id: 'pro-bs-high-fiddle', name: 'High-neck 12th-fret fiddle double-stops', level: 3, kind: 'double-stop', chord: 'G', bpm: 138,
      tab: 'e 2:12+1:10 2:12+1:10 2:13+1:12 2:15+1:14 2:13+1:12 2:12+1:10 q 2:12+1:10 | e 2:11/+1:10 2:12+1:10 2:10+1:8 2:8+1:7 h 2:8+1:7~',
      must: {
        about: 'Screaming high-register fiddle-style double-stops around fret 12 that cut straight through banjo and mandolin in a hot acoustic jam.',
        steps: ['Grip B-12 + e-10 (B and D) with middle and index fingers for a ringing G double-stop.', 'Climb up diatonically to B-13+e-12 and B-15+e-14, then back down.', 'In bar 2, slide into the blue-note B-11→12 against e-10, then resolve down to B-8+e-7 (G and B).'],
        tip: 'Strike both strings together with crisp downstrokes so they bark like a fiddle bow.',
        use: 'Peak-energy climax of a bluegrass break in G.', goal: 138,
      },
    },
    {
      id: 'pro-bs-b5-cascade', name: 'Chromatic flat-5 turnaround cascade', level: 2, kind: 'turnaround', chord: 'D7 | G', bpm: 140,
      tab: 'e 2:3 2:1 3:3 3:2 3:0 4:3 4:2 4:1 | e 4:0 5:3 5:2 5:0 h 6:3~',
      must: {
        about: 'Fearless descending bluegrass blues-scale cascade sliding straight across the flat-5 (Db/C#) and chromatic passing tones into G.',
        steps: ['Start at D (B-3), drop to C (B-1), Bb (G-3), A (G-2), open G.', 'Walk chromatically down the D string: frets 3, 2, 1, open.', 'Snap down A-3, A-2, open A and punch low G on beat 3.'],
        tip: 'Keep your index finger gliding cleanly across frets 1–3; don’t pause on the chromatic passing notes.',
        use: 'High-speed ending of a 4-bar solo break over D7 → G.', goal: 140,
      },
    },
    {
      id: 'pro-bs-minor-train', name: 'Crosspicked minor-key train drive', level: 2, kind: 'arpeggio', ref: 'A', chord: 'Am | G', bpm: 132, minor: true,
      tab: 'e 5:0 4:2 3:2 2:1 3:2 4:2 5:0 4:2 | e 6:3 4:0 3:0 2:0 3:0 4:0 q 5:0~',
      must: {
        about: 'Relentless acoustic train-beat crosspicking over Am → G that turns simple cowboy chords into a hypnotic, driving instrumental engine.',
        steps: ['Hold an open Am chord and alternate-pick straight across A–D–G–B–G–D–A–D.', 'Switch cleanly to low G (E-3) on beat 1 of bar 2 while rolling open D–G–B–G–D.', 'Land squarely back on open A on beat 3.'],
        tip: 'Accent beat 1 and the "&" of beat 2 to create that rolling bluegrass locomotive sway.',
        use: 'Driving rhythm/lead glue over dark mountain-minor tunes in Am.', goal: 132,
      },
    },
    {
      id: 'pro-bs-open-flurry', name: 'Open-string banjo pull-off flurry', level: 3, kind: 'lick', chord: 'G', bpm: 144,
      tab: 'e 1:3p 1:0 2:3p 2:0 3:3p 3:2p 3:0 4:2 | e 4:0 3:0 4:2 4:0 5:2h 5:3 q 6:3~',
      must: {
        about: 'Blistering open-string pull-off cascade inspired by 5-string banjo rolls — sounds impossibly fast while staying super ergonomic in open position.',
        steps: ['Pull off high E-3 to open, then B-3 to open, then double pull-off G-3→2→0.', 'Bounce off D-2 to open D, flash open G, then D-2 to open D.', 'Finish with a classic A-2→3 hammer right down onto low G.'],
        tip: 'Snap each pull-off slightly downward toward the floor so the open string rings just as loud as a picked note.',
        use: 'Flashy 2-bar showcase lick over G in fast jams.', goal: 144,
      },
    },
  ]),

  // ───────────────────────── Country (5)
  ...P('country', 'A', [
    {
      id: 'pro-ct-gatton-hybrid', name: 'Danny Gatton major-to-minor hybrid cascade', level: 3, kind: 'run', chord: 'A7', bpm: 126,
      tab: 'e 1:5 2:7 2:5 3:6 3:4 4:7 3:5h 3:6 | e 2:5 2:8 2:5 3:7 3:5h 3:6 q 4:7~',
      must: {
        about: 'Danny Gatton’s trademark Telecaster wizardry: opens bright in A major pentatonic, then flips mid-phrase into gritty A minor pentatonic with a snappy b3→3 hammer-on.',
        steps: ['Descend A major pentatonic: e-5 (A), B-7 (F#), B-5 (E), G-6 (C#), G-4 (B), D-7 (A).', 'Immediately hammer C to C# (G-5→6) to launch into the bluesy mix.', 'Pop B-5, B-8 (G), B-5, G-7 (D), then one last G-5→6 snap resolving to A (D-7).'],
        tip: 'Pluck the B and high E notes with your middle finger (hybrid picking) for maximum Telecaster snap.',
        use: 'Burning solo phrase over A7 in country, rockabilly, or blues-rock.', goal: 126,
      },
    },
    {
      id: 'pro-ct-buchanan-cry', name: 'Roy Buchanan crying Tele bend & double-stop', level: 2, kind: 'lick', chord: 'A7 | D7', bpm: 92,
      tab: 'q 2:8b e 2:8r 2:5 q 3:7b e 3:7r 3:5 | e 3:6+2:5 3:6+2:5 q 4:7~ h r',
      must: {
        about: 'Roy Buchanan’s soulful, vocal Telecaster cry: bends both the B and G strings cleanly into chord tones before settling on a bright major-3rd double-stop.',
        steps: ['Push B-8 (G) up a whole step to A, ease it back down, and pull to B-5 (E).', 'Immediately bend G-7 (D) up to E, release to D, drop to C (G-5).', 'Snap twice on the sweet C#+E double-stop (G-6 + B-5) and resolve to A (D-7) with vibrato.'],
        tip: 'Pick close to the bridge pickup for sharp bite, then soften near the neck for the resolution.',
        use: 'Slow country ballads and soulful blues-country leads.', goal: 92,
      },
    },
    {
      id: 'pro-ct-reed-claw', name: 'Jerry Reed syncopated claw-thumb groove', level: 2, kind: 'riff', chord: 'A7', bpm: 112,
      tab: 'e 5:0 3:6+2:5 5:0 3:7+2:7 5:0 3:6+2:5 4:5 4:7 | e 5:0 3:5h+2:5 3:6+2:5 4:7 h 5:0~',
      must: {
        about: 'Jerry Reed’s funky country-fingerstyle "claw" groove: steady open-A thumb bounce underneath snappy syncopated double-stops.',
        steps: ['Keep your thumb pumping steady open A on the downbeats.', 'Pluck G-6+B-5 (C#+E) and G-7+B-7 (D+F#) with index and middle fingers snapping off the strings.', 'In bar 2, hammer G-5→6 against B-5 and lock back onto the open A thumb pulse.'],
        tip: 'Lightly palm-mute the open A bass string while letting the snapped treble double-stops pop out crisp and dry.',
        use: 'Country-funk rhythm/lead grooves over a static A7 vamp.', goal: 112,
      },
    },
    {
      id: 'pro-ct-burton-snap', name: 'James Burton chicken-pickin’ pre-bend snap', level: 2, kind: 'lick', chord: 'A7', bpm: 116,
      tab: 'e 3:7pb 3:7r 3:5 4:7 3:6 2:5 1:5 2:7 | e 2:5 3:6 4:7 4:5 q 5:7 5:0~',
      must: {
        about: 'Classic Bakersfield chicken-pickin’ in the style of James Burton: opens with a pre-bent G-string release into a crisp hybrid-picked triad snap.',
        steps: ['Silently bend G-7 up a whole step BEFORE picking, pluck it, and ease it straight down to D then C (G-5).', 'Bounce through A (D-7), C# (G-6), E (B-5), A (e-5), and F# (B-7).', 'Descend cleanly through E, C#, A, G (D-5), E (A-7), and open A.'],
        tip: 'Cut the ringing notes short by relaxing your fretting fingers slightly — that "cluck" is pure chicken pickin’.',
        use: 'Upbeat honky-tonk and classic country solos in A.', goal: 116,
      },
    },
    {
      id: 'pro-ct-trapp-mixo', name: 'Guthrie Trapp Mixolydian open-string run', level: 3, kind: 'run', chord: 'A7', bpm: 120,
      tab: 'e 1:5 1:3 1:0 2:5 2:2 2:0 3:4 3:2 | e 3:0 4:5 4:2 4:0 5:4 5:3 q 5:0~',
      must: {
        about: 'Modern Nashville session magic (Guthrie Trapp style): weaves ringing open E, B, G, D, and A strings into a fluid Mixolydian descent.',
        steps: ['Pull across high E (5–3–0), then B string (5–2–0), then G string (4–2–0).', 'Drop to D string (5–2–0) — notice how every open string gives you time to shift smoothly.', 'Snap A-4 (C#), A-3 (C), and finish firmly on open A.'],
        tip: 'Let the open strings overlap slightly for that lush "cascade" sound Nashville studio pros love.',
        use: 'Two-bar showstopper run over A7 in country, Americana, or blues.', goal: 120,
      },
    },
  ]),

  // ───────────────────────── Acoustic Singer-Songwriter (5)
  ...P('acoustic', 'G', [
    {
      id: 'pro-ac-bryan-walk', name: 'Zach Bryan hammer-on C-to-Am bass walk', level: 1, kind: 'riff', chord: 'C | Am', bpm: 92,
      tab: 'q 5:3 e 4:0h 4:2 3:0 2:1 q 5:2 | q 5:0 e 4:0h 4:2 3:2 2:1 q 5:0~',
      must: {
        about: 'Heartfelt modern Americana acoustic movement: hammers the D string inside a ringing C chord, steps the bass down to B (C/B), and lands warm on Am.',
        steps: ['Hold open C, pluck A-3, then hammer open D to D-2 while letting open G and B-1 ring.', 'Move your middle finger to A-2 (B) on beat 4 as a passing bass note.', 'Land on open A (Am) in bar 2 and repeat the exact D-0→2 hammer-on inside the Am chord.'],
        tip: 'Keep your wrist loose and let the treble strings ring underneath the walking bass notes.',
        use: 'Verse accompaniment and intros for modern folk/country ballads.', goal: 92,
      },
    },
    {
      id: 'pro-ac-childers-drone', name: 'Tyler Childers mountain Dorian drone lick', level: 2, kind: 'lick', ref: 'D', chord: 'Dm | C', bpm: 96, minor: true,
      tab: 'e 4:0 3:2 2:3 2:1 3:2 3:0 4:3 4:0 | e 5:3 4:0 4:2 4:3 4:2 4:0 q 4:0~',
      must: {
        about: 'Appalachian acoustic storytelling feel: bounces a soulful minor melody off the ringing open D string with a bittersweet C-chord turnaround.',
        steps: ['Strike open D as your drone, then walk up to G-2 (A), B-3 (D), B-1 (C), G-2, open G, D-3 (F), open D.', 'In bar 2, hit C (A-3) and roll smoothly up and back down D-0→2→3→2→0.'],
        tip: 'Let the open D drone breathe underneath the melody — don’t rush the turnaround.',
        use: 'Intro or turnaround between verses in D minor / D Dorian acoustic songs.', goal: 96,
      },
    },
    {
      id: 'pro-ac-kahan-stomp', name: 'Noah Kahan driving folk-stomp arpeggio', level: 1, kind: 'arpeggio', chord: 'G | Em', bpm: 108,
      tab: 'e 6:3 4:0 3:0 2:3 4:0 3:0 2:3 3:0 | e 6:0 4:2 3:0 2:3 4:2 3:0 q 2:3~',
      must: {
        about: 'Driving New-England folk-pop arpeggio: anchors your ring finger on B-3 (D) as a high ringing pedal while the bass shifts from G to Em7.',
        steps: ['Keep your ring finger glued to fret 3 of the B string (D) for BOTH bars.', 'Pick a steady 8th-note wave across E-3, D-0, G-0, B-3.', 'In bar 2, simply open the low E and add D-2 for an instant lush Em7 glow.'],
        tip: 'Accent beats 1 and 3 slightly to create that foot-stomping indie-folk pulse.',
        use: 'High-energy verses and bridges over G → Em (try capo 2 or 5!).', goal: 108,
      },
    },
    {
      id: 'pro-ac-stapleton-fill', name: 'Chris Stapleton soul-acoustic double-stop fill', level: 2, kind: 'double-stop', ref: 'A', chord: 'A | D', bpm: 84,
      tab: 'q 5:0 e 4:2+3:2 4:4/+3:4 q 4:2+3:2 5:0 | e 4:0 3:2+2:3 3:4/+2:5 3:2+2:3 h 4:0~',
      must: {
        about: 'Gritty, soulful acoustic double-stop slide in the style of Chris Stapleton: glides warm 4ths and 3rds between open bass roots on A and D.',
        steps: ['Hit open A, then barre D-2+G-2 and slide both up 2 frets to D-4+G-4 and right back.', 'In bar 2, hit open D, grip G-2+B-3 (A+D) and slide smoothly up 2 frets to G-4+B-5 (B+E) and back.'],
        tip: 'Keep steady pressure during the slides so both strings sing together like a pedal steel.',
        use: 'Soulful acoustic country fills between vocal lines over I and IV.', goal: 84,
      },
    },
    {
      id: 'pro-ac-isbell-thirds', name: 'Jason Isbell singing slide-into-thirds hook', level: 2, kind: 'lick', chord: 'G | C', bpm: 86,
      tab: 'e 3:2/ 3:4 2:3 3:4 3:2 3:0 4:2 4:0 | q 5:3 e 4:2 3:0 2:1 3:0 q 4:2~',
      must: {
        about: 'Lyrical Americana melody hook: slides warmly into the major 3rd (B) on the G string, lingers against D, and resolves gently into a ringing C major chord.',
        steps: ['Slide G-2 up to G-4 (A→B), catch B-3 (D), return to G-4, then walk down G-2, open G, D-2, open D.', 'In bar 2, land on C (A-3) and gently arpeggiate D-2, open G, B-1, open G, resting on E (D-2).'],
        tip: 'Play with a light touch and sing the melody in your head — phrasing is everything here.',
        use: 'Intro, outro, or vocal-answer acoustic hook in G.', goal: 86,
      },
    },
  ]),

  // ───────────────────────── Folk (5)
  ...P('folk', 'G', [
    {
      id: 'pro-fk-croce-walk', name: 'Jim Croce alternating-bass walking turnaround', level: 2, kind: 'turnaround', chord: 'G | D7 | G', bpm: 98,
      tab: 'e 6:3 3:0 4:0 2:0 6:2 3:0 4:0 2:0 | e 6:0 3:0 4:2 2:0 5:0 3:2 q 6:3~',
      must: {
        about: 'Jim Croce’s classic fingerpicked descending bass line (G → F# → E → A → G) woven effortlessly beneath ringing open treble notes.',
        steps: ['Thumb plays the descending bass on beats 1 and 3: low E-3 (G), E-2 (F#), open E, then open A.', 'Index and middle fingers answer on the "&" beats with open G, D, and B strings.', 'Resolve cleanly back to low G on beat 3 of bar 2.'],
        tip: 'Keep the thumb melody smooth and connected — that descending bass line is the hook.',
        use: 'Endings and verse turnarounds in fingerpicked folk ballads.', goal: 98,
      },
    },
    {
      id: 'pro-fk-simon-travis', name: 'Paul Simon Travis-picked interlocking melody', level: 2, kind: 'arpeggio', ref: 'C', chord: 'C | G/B', bpm: 94,
      tab: 'e 5:3 3:0 4:2 2:1 5:3 1:0 4:2 2:3 | e 5:2 3:0 4:0 2:3 5:2 3:0 q 2:1~',
      must: {
        about: 'Classic Greenwich Village Travis picking: steady alternating thumb while your top fingers sing a bittersweet melody from C up to E, D, and back to C.',
        steps: ['Thumb alternates A-3 and D-2 in bar 1 while fingers pick open G, B-1, open high E, and pinky B-3.', 'In bar 2, move your middle finger to A-2 (G/B) and let your pinky hold B-3 before resolving softly to B-1.'],
        tip: 'Let your thumb stay automatic and quiet so the top-string counter-melody floats above it.',
        use: 'Fingerpicked folk verses and quiet intros in C (great with capo 3–7!).', goal: 94,
      },
    },
    {
      id: 'pro-fk-jansch-celtic', name: 'Bert Jansch Celtic hammer-pull drone', level: 3, kind: 'lick', ref: 'D', chord: 'Dm | C', bpm: 102, minor: true,
      tab: 'e 4:0 3:2h 3:3p 3:2 3:0 4:3p 4:0 3:0 | e 5:3 4:2p 4:0 3:2p 3:0 4:3 q 4:0~',
      must: {
        about: 'British folk-revival ornamentation in the style of Bert Jansch: rapid triplet-like hammer-pull flourishes dancing over an open D drone.',
        steps: ['Pluck open D, then immediately snap a fluid hammer-pull G-2→3→2→0.', 'Pull D-3 to open D and touch open G.', 'In bar 2, hit C (A-3), pull D-2→0, pull G-2→0, catch D-3 (F), and resolve to open D.'],
        tip: 'Keep the hammer-ons and pull-offs crisp and snappy like a Celtic tin whistle.',
        use: 'Celtic/folk fingerstyle breaks and modal acoustic intros.', goal: 102,
      },
    },
    {
      id: 'pro-fk-prine-tag', name: 'John Prine syncopated country-folk tag', level: 1, kind: 'ending', chord: 'G | D | G', bpm: 96,
      tab: 'e 6:3 4:0 3:0 4:2 4:0 5:2 5:0 6:3 | q 4:0 e 3:2 2:3 h 6:3+4:0+3:0~',
      must: {
        about: 'Warm, unhurried Midwest folk storytelling turnaround: walks down from open D into low G, pops a bright D cadence, and settles home.',
        steps: ['Play low G, open D, open G, then walk down D-2, open D, A-2, open A, low G.', 'In bar 2, arpeggiate open D, G-2, B-3 and strum a warm open G triad on beat 3.'],
        tip: 'Play with relaxed swing and leave space for the guitar body to resonate.',
        use: 'Friendly verse endings in G-major folk and country-folk songs.', goal: 96,
      },
    },
    {
      id: 'pro-fk-lightfoot-12', name: 'Gordon Lightfoot ringing 12-string cascade', level: 2, kind: 'arpeggio', ref: 'D', chord: 'D | Asus4', bpm: 100,
      tab: 'e 4:0 3:2 2:3 1:2 1:3p 1:2 1:0 2:3 | e 5:0 4:2 3:2 2:3 2:2 3:2 q 4:0~',
      must: {
        about: 'Shimmering Canadian folk arpeggio: sparkles through Dsus4 → D → Dsus2 on the high E string before gliding through Asus4 → A back to D.',
        steps: ['Hold open D, pick D–G–B–e(2), then add pinky on e-3, pull off to e-2, lift to open high E, and catch B-3.', 'In bar 2, pick open A, D-2, G-2, B-3 (Asus4), drop to B-2 (A), touch G-2, and settle on open D.'],
        tip: 'Let every single string ring into the next — that bell-like overlap gives a 6-string a 12-string shimmer.',
        use: 'Intros and chorus arpeggios in D major folk ballads.', goal: 100,
      },
    },
  ]),

  // ───────────────────────── Melodic Fingerstyle (5)
  ...P('fingerstyle', 'E', [
    {
      id: 'pro-fs-murua-circle', name: 'Mauricio Murúa Peaceful Circle-of-4ths roll', level: 2, kind: 'arpeggio', chord: 'Em9 | Am9 | D9 | Gmaj7', bpm: 78, minor: true,
      tab: 'e 6:0 4:4 3:0 2:3 5:0 4:5 3:5 2:0 | e 4:0 3:5 2:5 1:2 6:3 4:4 3:4 2:3',
      must: {
        about: 'Inspired by Mauricio Murúa’s "Peaceful" Circle-of-4ths etudes: glides effortlessly through Em9 → Am9 → D9 → Gmaj7 with glowing open strings and minimal finger movement.',
        steps: ['Bar 1 beats 1–2 (Em9): pluck open low E, D-4 (F# = 9th!), open G, B-3 (D).', 'Bar 1 beats 3–4 (Am9): open A, D-5 (G), G-5 (C), open B (9th!).', 'Bar 2 beats 1–2 (D9): open D, G-5 (C), B-5 (E = 9th), e-2 (F#).', 'Bar 2 beats 3–4 (Gmaj7): E-3 (G), D-4 (F# = maj7!), G-4 (B), B-3 (D).'],
        tip: 'Notice how the 9ths and 7ths fall right under open strings and 1-fret shifts — let every note bloom like a harp.',
        use: 'Solo fingerstyle warm-up, songwriting spark, or peaceful ballad intro in Em.', goal: 78,
      },
    },
    {
      id: 'pro-fs-murua-twister', name: 'Mauricio Murúa string-skipping Twister', level: 3, kind: 'arpeggio', chord: 'Em7 | Cmaj7', bpm: 88, minor: true,
      tab: 'e 6:0 3:0 4:2 1:3 6:0 2:3 3:0 1:2 | e 5:3 2:0 4:2 1:3 5:3 3:0 q 1:2~',
      must: {
        about: 'Inspired by Mauricio Murúa’s "Twister" exercises: skips across non-adjacent strings (6 → 3 → 4 → 1) so ordinary chords unfold in wide, cinematic cello-like leaps.',
        steps: ['Bar 1 (Em7): jump low E-0 → open G → D-2 → high E-3, then E-0 → B-3 → open G → e-2 (F#9 colour!).', 'Bar 2 (Cmaj7): jump A-3 → open B → D-2 → high E-3, then A-3 → open G → settle glowing on e-2 (F# #11 Lydian sparkle!).'],
        tip: 'Assign thumb to strings 6–4, index to G, middle to B, ring finger to high E so the string skips feel effortless.',
        use: 'Modern fingerstyle study piece and melodic arpeggio workout in Em.', goal: 88,
      },
    },
    {
      id: 'pro-fs-emmanuel-sparkle', name: 'Tommy Emmanuel boom-chick harmonic sparkle', level: 2, kind: 'lick', ref: 'G', chord: 'G | C', bpm: 96,
      tab: 'e 6:3 2:0 4:0 1:3 6:3 1:12n 4:0 2:12n | e 5:3 2:1 4:2 1:0 5:3 3:0 q 2:1~',
      must: {
        about: 'Tommy Emmanuel’s joyful fingerstyle magic: pairs a rock-solid alternating thumb groove with sparkling 12th-fret natural harmonics right on the upbeat.',
        steps: ['Keep thumb alternating low E-3 and open D in bar 1 while plucking open B and e-3.', 'Touch right over the 12th fretwire on high E and B for glassy bell harmonics without stopping the thumb!', 'Drop cleanly into a warm C boom-chick in bar 2.'],
        tip: 'Lightly lift your finger off the 12th fret the instant you pluck so the harmonic rings loud and clear.',
        use: 'Acoustic solo guitar showcase in G major.', goal: 96,
      },
    },
    {
      id: 'pro-fs-jung-pinch', name: 'Sungha Jung pop-melody & bass pinch', level: 2, kind: 'lick', ref: 'C', chord: 'C | G | Am', bpm: 84,
      tab: 'q 5:3+1:0 e 3:0 2:1 q 6:3+2:3 e 3:0 1:0 | q 5:0+2:1 e 3:2 2:0 h 5:0+3:2~',
      must: {
        about: 'Modern pop fingerstyle arrangement technique: pinches the bass note and vocal melody simultaneously on beat 1 & beat 3, filling the gaps with gentle inner chord tones.',
        steps: ['Pinch A-3 + open high E together, whisper open G and B-1 underneath.', 'Pinch low E-3 + B-3 (G chord) and answer with open G and open high E.', 'In bar 2, pinch open A + B-1 (Am), walk down B-0, and let A + G-2 ring softly.'],
        tip: 'Make the pinched melody note slightly louder than the inner fill notes so the song sings clearly.',
        use: 'Arranging any pop ballad for solo fingerstyle guitar.', goal: 84,
      },
    },
    {
      id: 'pro-fs-atkins-harp', name: 'Chet Atkins cascade-harmonic harp ending', level: 3, kind: 'ending', ref: 'G', chord: 'Gmaj9', bpm: 74,
      tab: 'e 6:3 4:12n 3:0 2:12n 4:4 1:12n 3:2 2:3 | w 6:3+4:4+3:2+2:3+1:2',
      must: {
        about: 'Chet Atkins / Lenny Breau "harp harmonic" waterfall: alternates fretted chord notes with 12th-fret harmonics so the guitar rings out like a concert harp.',
        steps: ['Pluck low G (E-3), chime D-12 harmonic, open G, chime B-12 harmonic.', 'Drop into D-4 (F#), chime e-12 harmonic, G-2 (A), B-3 (D).', 'Finish bar 2 with a lush rolled Gmaj9 chord (E-3, D-4, G-2, B-3, e-2).'],
        tip: 'Slow down slightly (ritardando) on the last two notes before rolling the final chord softly with your thumb.',
        use: 'Show-stopping quiet ending for any ballad or fingerstyle piece in G.', goal: 74,
      },
    },
  ]),

  // ───────────────────────── Hawaiian Slack-Key (5)
  ...P('hawaiian', 'G', [
    {
      id: 'pro-hw-makana-water', name: 'Makana flowing-water hammer-pull roll', level: 2, kind: 'arpeggio', chord: 'G | C', bpm: 84,
      tab: 'e 6:3 3:0 2:0h 2:1p 2:0 3:0 1:0 2:0 | e 5:3 3:0 2:1 1:0h 1:3p 1:0 q 2:1~',
      must: {
        about: 'Inspired by slack-key virtuoso Makana: cascading hammer-ons and pull-offs over a gentle island thumb pulse that sound like mountain stream water.',
        steps: ['Pluck low G (E-3), open G, then glide smoothly B-0→1→0 while open strings shimmer underneath.', 'Move to C (A-3) in bar 2 and ripple high E-0→3→0 before resting warmly on B-1 (C).'],
        tip: 'Keep the dynamic silky and relaxed (nahenahe — sweet and gentle); never force the hammer-ons.',
        use: 'Flowing Hawaiian/acoustic ballad intros and bridges in G.', goal: 84,
      },
    },
    {
      id: 'pro-hw-kane-vamp', name: 'Ray Kāne classic island vamp & chime', level: 1, kind: 'turnaround', chord: 'D7 | G', bpm: 80,
      tab: 'q 4:0 e 3:2 2:1 q 1:2 e 2:1 3:2 | q 6:3 e 3:12n 2:12n h 1:12n~',
      must: {
        about: 'The quintessential Hawaiian slack-key turnaround (inspired by Raymond Kāne): a sweet rocking D7 cadence resolving into sparkling 12th-fret "chimes" (harmonics) over G.',
        steps: ['Hold open D7 and gently rock D → G-2 → B-1 → e-2 → B-1 → G-2.', 'Hit low G (E-3) on beat 1 of bar 2, then chime natural harmonics across G-12, B-12, and high E-12.'],
        tip: 'Play the chimes slightly behind the beat — Hawaiian slack-key breathes like ocean waves.',
        use: 'Between verses or at the end of any Hawaiian or island-folk song.', goal: 80,
      },
    },
    {
      id: 'pro-hw-kotani-thirds', name: 'Ozzie Kotani sweet 3rds & 6ths island melody', level: 2, kind: 'double-stop', chord: 'G | C | G', bpm: 78,
      tab: 'q 3:4+2:3 3:5+2:5 e 3:7+2:7 3:5+2:5 q 3:4+2:3 | q 3:5+2:5 3:4+2:3 h 3:0+2:0~',
      must: {
        about: 'Lyrical harmonized 3rds in the style of Ozzie Kotani: captures the warm vocal-harmony sound of traditional Hawaiian mele on two strings.',
        steps: ['Pluck G-4+B-3 (B+D), step smoothly up to G-5+B-5 (C+E) and G-7+B-7 (D+F#).', 'Float gently back down through G-5+B-5 and G-4+B-3, finishing warm on open G+B.'],
        tip: 'Pluck both strings simultaneously with thumb and index finger (or index + middle) for silky, balanced tone.',
        use: 'Sweet melodic solos and vocal-harmony interludes in G.', goal: 78,
      },
    },
    {
      id: 'pro-hw-cyril-bass', name: 'Cyril Pahinui alternating-thumb bass walk', level: 2, kind: 'riff', chord: 'G | C | D7', bpm: 86,
      tab: 'q 6:3 e 3:0 2:0 q 4:0 e 5:0 5:2 | q 5:3 e 3:0 2:1 q 4:0 e 3:2 2:1',
      must: {
        about: 'Cyril Pahinui’s rolling slack-key rhythm pocket: strong, warm walking thumb bass connecting G → C → D7 while light treble strokes shimmer on the upbeats.',
        steps: ['Thumb plays low G on beat 1, open D on beat 3, then walks A-0 → A-2 right into C (A-3) in bar 2.', 'Answer on beat 3 of bar 2 with open D and D7 treble notes (G-2, B-1) ready to resolve home.'],
        tip: 'Let the thumb bass ring round and full — Pahinui’s groove lives in the warmth of the low strings.',
        use: 'Accompanying Hawaiian and island-acoustic songs with steady motion.', goal: 86,
      },
    },
    {
      id: 'pro-hw-kamakahi-ending', name: 'Dennis Kamakahi gentle harmonic turnaround', level: 1, kind: 'ending', chord: 'C | G | D7 | G', bpm: 76,
      tab: 'q 5:3+2:1 6:3+2:0 4:0+2:1 4:0+1:2 | e 6:3 4:0 3:0 2:0 h 1:3~',
      must: {
        about: 'Peaceful Hawaiian song ending inspired by Dennis Kamakahi: walks gracefully through IV → I → V7 → I with singing top-note voice leading.',
        steps: ['Pinch C (A-3+B-1), G (E-3+B-0), D7 (D-0+B-1), then lift to F# (D-0+e-2).', 'Roll softly up the open G chord (E-3, D-0, G-0, B-0) and let high G (e-3) linger.'],
        tip: 'Ease the tempo down naturally on bar 2 like a sunset exhale.',
        use: 'Classic gentle outro for Hawaiian, acoustic, and folk ballads.', goal: 76,
      },
    },
  ]),

  // ───────────────────────── Reggae Rock / Island & Dub (5)
  ...P('reggaerock', 'G', [
    {
      id: 'pro-rr-ranglin-ska', name: 'Ernest Ranglin jazz-ska chromatic bounce', level: 3, kind: 'lick', chord: 'G | C', bpm: 104,
      tab: 'e r 3:4 3:5 3:6 3:7 2:5 2:8 2:5 | e 3:7 3:5 3:4 4:5 q 4:5~ r',
      must: {
        about: 'Inspired by Jamaican guitar legend Ernest Ranglin: mixes jazz chromatic walk-ups with laid-back Caribbean off-beat phrasing.',
        steps: ['Rest on beat 1 (pure reggae pocket!), then climb chromatically G-4, 5, 6, 7 into B-5 (E) and B-8 (G).', 'Step cleanly back down B-5, G-7, G-5, G-4, and punch the root G (D-5) with crisp staccato bounce.'],
        tip: 'Leave beat 1 completely empty — starting on the "&" of 1 instantly gives the line Jamaican swing.',
        use: 'Jazzy ska, roots reggae, and island-rock solos in G.', goal: 104,
      },
    },
    {
      id: 'pro-rr-anderson-cry', name: 'Al Anderson / Wailers wah cry-bend lead', level: 2, kind: 'lick', ref: 'A', chord: 'Am | Dm', bpm: 84, minor: true,
      tab: 'q r 2:8b e 2:8r 2:5 q 3:7~ | e r 3:5 3:7 2:5 2:8 2:5 q 3:7~',
      must: {
        about: 'Classic Wailers roots-reggae electric lead (Al Anderson style): spacious, vocal blues-rock bends laid lazily behind the one-drop snare.',
        steps: ['Wait out beat 1, then push B-8 (G) up a whole step to A, release smoothly to B-5 (E), and vibrate D (G-7).', 'In bar 2, answer off the beat with G-5, G-7, B-5, B-8, B-5, settling again on warm singing D (G-7).'],
        tip: 'Play slightly behind the beat with neck pickup (and optional wah!) — space is half the groove.',
        use: 'Roots reggae and dub-rock solos over minor vamps in Am.', goal: 84,
      },
    },
    {
      id: 'pro-rr-summers-add9', name: 'Andy Summers add9 reggae-rock skank', level: 2, kind: 'riff', ref: 'E', chord: 'Em9 | G', bpm: 98, minor: true,
      tab: 'e r 3:9+2:7+1:7 r 3:9+2:7+1:7 r 3:11+2:7+1:7 q r | e r 3:7+2:8+1:7 r 3:7+2:8+1:7 h r',
      must: {
        about: 'New-wave reggae-rock chop in the style of Andy Summers (The Police): crisp off-beat treble skanks spiced with a shimmering 9th (F#) on top.',
        steps: ['Mute beat 1 and beat 3; snap crisp upstrokes on beats 2 and 4 using Em triad (G-9, B-7, e-7).', 'Reach your pinky to G-11 (F#) on the third stab for that signature haunting add9 shimmer.', 'Resolve cleanly onto crisp G-major skank chops (G-7, B-8, e-7) in bar 2.'],
        tip: 'Release fretting pressure immediately after each chop so the stabs sound percussive and tight.',
        use: 'Reggae-rock verses and chorus chops in Em / G.', goal: 98,
      },
    },
    {
      id: 'pro-rr-kolohe-sixths', name: 'Kolohe Kai sunny island 6ths hook', level: 1, kind: 'double-stop', chord: 'G | D', bpm: 88,
      tab: 'q 3:4+1:3 e 3:5+1:5 3:7+1:7 q 3:5+1:5 3:4+1:3 | q 3:2+1:2 e 3:4+1:3 3:2+1:2 h 3:0+1:0~',
      must: {
        about: 'Feel-good Hawaii island-reggae guitar melody (Kolohe Kai / Jawaiian vibe): sunny harmonized 6ths gliding smoothly up and down the G major scale.',
        steps: ['Grip G-4+e-3 (B+G), slide smoothly up to G-5+e-5 (C+A) and G-7+e-7 (D+B).', 'Glide back down to G-4+e-3, then step to G-2+e-2 (A+F#) and resolve warm on open G+E (G6 shimmer!).'],
        tip: 'Use a clean chorus/reverb tone and mute the skipped B string lightly with your middle finger.',
        use: 'Sunny island-reggae intros and chorus hooks in G.', goal: 88,
      },
    },
    {
      id: 'pro-rr-kings-dub', name: 'Common Kings melodic dub-bass & treble answer', level: 2, kind: 'riff', ref: 'A', chord: 'Am | F', bpm: 92, minor: true,
      tab: 'e 6:5m 6:5m 5:7m 5:5m r 3:5+2:5 q r | e 6:1m 6:1m 5:3m 5:0m r 3:5+2:6 q r',
      must: {
        about: 'Modern Cali/island reggae-rock call-and-response: punchy palm-muted bass-line riff answered immediately by a crisp off-beat high-string chord stab.',
        steps: ['Palm-mute the chunky low-string dub line: E-5, E-5, A-7, A-5 (A–A–E–D).', 'Pop a sharp, unmuted Am double-stop (G-5+B-5) right on the "&" of beat 3.', 'Move the exact move down to F (E-1, E-1, A-3, open A) answered by G-5+B-6 (C+F).'],
        tip: 'Contrast the dead-muted bass notes against the bright ringing treble chop — that contrast makes it bounce.',
        use: 'One-guitar reggae-rock grooves when jamming solo or with Pocket Drummer.', goal: 92,
      },
    },
  ]),

  // ───────────────────────── Blues-Pop / Mayer & Hendrix (5)
  ...P('mayer', 'E', [
    {
      id: 'pro-my-hendrix-bloom', name: 'Hendrix thumb chord-melody bloom', level: 2, kind: 'lick', chord: 'Em | G | Am', bpm: 74, minor: true,
      tab: 'q 6:0 e 3:7h+2:7 3:9+2:7 q 6:3 e 4:5h+3:4 4:7+3:4 | q 6:5 e 4:5h+3:5 4:7+3:5 h 4:5+3:5~',
      must: {
        about: 'Jimi Hendrix’s immortal ballad blueprint ("Little Wing" / "Bold as Love" vocabulary): wrap your thumb over the bass note so your other fingers hammer sparkling 9ths and sus4s inside every chord.',
        steps: ['Ring open low E, then barre G-7+B-7 and hammer G-7→9 (D→E) while B-7 sings.', 'Wrap your thumb onto low E-3 (G), grip D-5+G-4, and hammer D-5→7 (G→A).', 'Slide your thumb to E-5 (Am), barre D-5+G-5, hammer D-5→7, and let the minor 7th glow.'],
        tip: 'Keep the thumb light on the top edge of the neck and let each hammer-on blossom gently rather than slapping.',
        use: 'Soulful ballad intros and rhythm-lead blending in Em / G.', goal: 74,
      },
    },
    {
      id: 'pro-my-hendrix-triads', name: 'Hendrix sliding triad embellishment', level: 2, kind: 'double-stop', chord: 'E | A | B', bpm: 80,
      tab: 'e 4:9+3:9 4:11/+3:11 4:9+3:9 5:11 q 4:9+3:9 r | e 4:7+3:6 4:9/+3:8 4:7+3:6 5:7 h 4:7+3:6~',
      must: {
        about: 'The sliding R&B-rock triad move Hendrix popularized ("Wind Cries Mary" / Curtis Mayfield lineage): slides parallel 2-string triads up a whole step and back inside each bar.',
        steps: ['Grip D-9+G-9 (B+E), slide both up 2 frets to D-11+G-11 and smoothly back, dipping to G# (A-11).', 'Drop cleanly to the IV chord shape (D-7+G-6 = A+C#), slide up 2 frets to D-9+G-8 and back into A.'],
        tip: 'Use your ring and index fingers so the whole hand glides effortlessly like one unit.',
        use: 'Transforming plain I–IV–V ballads into lush Hendrix/Mayer rhythm parts.', goal: 80,
      },
    },
    {
      id: 'pro-my-gravity-cry', name: 'John Mayer slow singing bend & space', level: 2, kind: 'lick', ref: 'G', chord: 'G | C', bpm: 68,
      tab: 'q. 2:10b e 2:10r q 2:8~ r | e r 3:9 2:8 2:10b q 2:10~ r',
      must: {
        about: 'John Mayer’s "Gravity" vocal phrasing: unhurried, crying whole-step bends on the B string separated by deliberate silence so every note hits like a lyric.',
        steps: ['Start in G major pentatonic at fret 8 (B-8 = G, B-10 = A).', 'Bend B-10 up a full step to B slowly, hold it, ease it down, and vibrate G (B-8) before resting beat 4.', 'In bar 2, answer softly off beat 1: G-9 (E), B-8 (G), then soar back up on the B-10 bend and hold with singing vibrato.'],
        tip: 'Play with your fingertips (no pick!) or a very soft pick attack on the Strat neck pickup for syrupy warmth.',
        use: 'Slow 6/8 or 4/4 blues-pop ballads in G major.', goal: 68,
      },
    },
    {
      id: 'pro-my-mix-double', name: 'Mayer major-meets-minor double-stops', level: 2, kind: 'double-stop', ref: 'E', chord: 'E | C#m', bpm: 82,
      tab: 'e 3:9+2:9 3:11/+2:10 3:9+2:9 4:11 q 3:9+2:9 r | e 3:9+2:9 3:9+2:12 3:9+2:10 3:9+2:9 h 4:11~',
      must: {
        about: 'Classic John Mayer clean-electric sweet spot: sparkles between E major pentatonic double-stops (fret 9) and soulful C#m blues-pop inflections.',
        steps: ['Grip G-9+B-9 (E+G#) and slide up to G-11+B-10 (F#+A) and back, touching C# (D-11).', 'In bar 2, hold G-9 as an anchor while your pinky and middle finger walk B-12 → B-10 → B-9 down to C# (D-11).'],
        tip: 'Keep a touch of spring reverb and let the two strings ring together smoothly without buzzing.',
        use: 'Over I → vi (E → C#m) pop-blues grooves.', goal: 82,
      },
    },
    {
      id: 'pro-my-srv-lenny', name: 'SRV shimmering 6/9 chord swell & harmonic', level: 2, kind: 'arpeggio', chord: 'E6/9 | A9', bpm: 70,
      tab: 'q 6:0 e 4:6 3:6 2:7 1:7 q 1:12n | q 6:5 e 4:5 3:6 2:5 1:7 q 1:7~',
      must: {
        about: 'Stevie Ray Vaughan’s tender ballad side ("Lenny" / "Riviera Paradise" mood): lets a lush E6/9 chord bloom upward into a bell-like 12th-fret harmonic, then glides to a warm A13.',
        steps: ['Let open low E ring, then roll gently through D-6 (G#), G-6 (C#), B-7 (F#), e-7 (B) and touch high E-12 harmonic.', 'In bar 2, wrap thumb onto E-5 (A) and arpeggiate D-5 (G), G-6 (C#), B-5 (E), resting on high B (e-7).'],
        tip: 'Brush the strings with your thumb or lightly with the pick edge so it sounds like warm glass.',
        use: 'Slow soulful clean-Strat ballads and intimate intros in E.', goal: 70,
      },
    },
  ]),

  // ───────────────────────── Neo-Soul (5)
  ...P('neosoul', 'E', [
    {
      id: 'pro-ns-asato-sixths', name: 'Mateus Asato sliding 6ths & chord flourish', level: 3, kind: 'double-stop', chord: 'Emaj7 | C#m9', bpm: 76,
      tab: 'e 3:8+1:7 3:9/+1:9 3:11/+1:11 3:9+1:9 q 3:8+1:7 r | e 3:9+1:9 3:8+1:7 3:6+1:5 3:8h+1:7 h 3:6+1:4~',
      must: {
        about: 'Mateus Asato’s signature vocal neo-soul guitar move: glides sweet harmonized 6ths up and down the G and high E strings with silky legato slides.',
        steps: ['Grip G-8+e-7 (D#+B) with middle & index fingers; slide smoothly to G-9+e-9 (E+C#) and G-11+e-11 (F#+D#).', 'Glide back to G-8+e-7 and let it breathe on beat 4.', 'In bar 2, descend smoothly into C#m9 colour ending on G-6+e-4 (C#+G#).'],
        tip: 'Pluck with thumb + ring finger (or pick + middle) so the two voices glide like a gospel choir.',
        use: 'Romantic, vocal neo-soul & gospel-pop breaks in E / C#m.', goal: 76,
      },
    },
    {
      id: 'pro-ns-kerry-m7', name: 'Kerry "2 Smooth" minor-7 hammer pocket', level: 2, kind: 'riff', ref: 'A', chord: 'Am7 | Dm9', bpm: 80, minor: true,
      tab: 'q 6:5+4:5+3:5+2:5 e 2:5h 2:7 1:5 2:7 q 3:5 | q 5:5+4:3+3:5+2:5 e 1:5h 1:7 2:5 3:5 q 3:5~',
      must: {
        about: 'Kerry "2 Smooth" R&B rhythm-lead pocket: strikes a lush thumb-over Am7, immediately ornaments the 9th (B) and 11th (D) on top, then floats smoothly into Dm9.',
        steps: ['Barre fret 5 across D–G–B with thumb on E-5 (Am7), then hammer B-5→7 (E→F#) and kiss e-5 (A).', 'Move right next door to Dm9 (A-5, D-3, G-5, B-5) and hammer high E-5→7 (A→B) before resting on C (G-5).'],
        tip: 'Keep your tone clean, warm, and compressed — leave subtle rhythmic air before every hammer-on.',
        use: 'R&B and neo-soul groove comping in Am / C.', goal: 80,
      },
    },
    {
      id: 'pro-ns-spanky-walk', name: 'Spanky Alford gospel chromatic walk-up', level: 2, kind: 'turnaround', ref: 'C', chord: 'Fmaj7 | G13 | Am9', bpm: 78,
      tab: 'q 4:3+3:2+2:1 e 4:4+3:3+2:2 4:5+3:4+2:3 q 4:5+3:4+2:5 r | q 5:0+4:5+3:5+2:5 e 1:7 1:5 h 2:5~',
      must: {
        about: 'Gospel/neo-soul legend Spanky Alford’s signature chromatic chord walk: slides a 3-note maj7 voicing straight up half-step by half-step into a sparkling Am9 resolution.',
        steps: ['Play Fmaj7 (D-3, G-2, B-1), slide the exact shape up 1 fret (F#dim7 colour!) and 1 more fret into G6 (D-5, G-4, B-3).', 'Pop your pinky to B-5 (E = G13!) on beat 3.', 'Land glowing on Am9 (open A + fret-5 barre) and sing high E-7→5 down to B-5.'],
        tip: 'Play the chromatic passing chord (fret 4–3–2) lightly like a grace step pushing into beat 3.',
        use: 'Church/gospel/R&B lift from IV → V → vi in any major key.', goal: 78,
      },
    },
    {
      id: 'pro-ns-faye-maj9', name: 'Melanie Faye dreamy maj9 arpeggio & slide', level: 2, kind: 'arpeggio', ref: 'G', chord: 'Gmaj9 | Em9', bpm: 74,
      tab: 'e 6:3 4:4 3:2 2:3 1:2 1:5/ 1:7 2:7 | e 6:0 4:5 3:4 2:7 1:5 2:7 q 3:4~',
      must: {
        about: 'Dreamy bedroom neo-soul arpeggio (Melanie Faye vibe): rolls upwards through a lush Gmaj9 grip, slides effortlessly up the high E string, and melts into Em9.',
        steps: ['Arpeggiate Gmaj9 (E-3, D-4, G-2, B-3, e-2), then slide e-5 up to e-7 (B) and catch B-7 (F#).', 'Let open low E ring in bar 2 and roll through Em9 colour (D-5, G-4, B-7, e-5) ending warmly on B (G-4).'],
        tip: 'Light touch with a hint of vibrato or chorus — let the 9ths and major 7ths hang in the air.',
        use: 'Lo-fi, neo-soul, and chill R&B jams in G / Em.', goal: 74,
      },
    },
    {
      id: 'pro-ns-fujita-triad', name: 'Tomo Fujita clean triad-shell funky groove', level: 2, kind: 'riff', ref: 'A', chord: 'Am7 | D9', bpm: 92, minor: true,
      tab: 'e 4:5+3:5+2:5 3:x+2:x 4:5+3:5+2:5 4:7+3:5+2:5 e 4:5+3:5+2:5 3:x+2:x q 3:5h+2:5 | e 4:4+3:5+2:5 3:x+2:x 4:4+3:5+2:5 4:4+3:5+2:7 h 4:4+3:5+2:5~',
      must: {
        about: 'Tomo Fujita’s Berklee funk-soul triad groove: tight, sparkling 3-note inversions on the D–G–B strings with crisp muted chuck-notes between stabs (notice the 1-fret guide-tone drop from G on D-5 to F# on D-4!).',
        steps: ['Barre D-5, G-5, B-5 (rootless Am7) and bounce cleanly with muted ghost strums.', 'Flick D-7 (A) and a quick hammer-on inside bar 1.', 'In bar 2, simply drop ONLY the D-string note 1 fret from D-5 to D-4 — instant silky D9!'],
        tip: 'Keep your right wrist swinging steadily in 16ths/8ths — dynamics and crisp muting make simple triads sound pro.',
        use: 'Groovy ii–V and i–IV soul/funk vamps (works great with Pocket Drummer!).', goal: 92,
      },
    },
  ]),
]
