// The lick library: original licks written in each style's own vocabulary, as tab in a reference key (see
// notation.ts). The must-know ones carry a full breakdown. Nothing here is copied from a recording: the styles are
// named after the players who shaped them, the notes are written for this app.
import type { LickStyleId } from './styles'

export type LickKind = 'lick' | 'arpeggio' | 'run' | 'riff' | 'ending' | 'double-stop' | 'turnaround'
export interface Breakdown {
  /** what it is and why it matters */
  about: string
  /** how to play it, step by step */
  steps: string[]
  /** the mistake to avoid, or the thing that makes it sound right */
  tip: string
  /** where to use it */
  use: string
  /** a tempo to aim for */
  goal: number
}
export interface LickDef {
  id: string
  style: LickStyleId
  name: string
  level: 1 | 2 | 3
  kind: LickKind
  /** the key the tab is written in */
  ref: string
  minor?: boolean
  /** the chord(s) it sits over, in the reference key */
  chord?: string
  meter?: number
  bpm?: number
  tab: string
  must?: Breakdown
}

const L = (style: LickStyleId, ref: string, list: (Omit<LickDef, 'style' | 'ref'> & { ref?: string })[], minor?: boolean): LickDef[] =>
  list.map(l => ({ style, ref, ...(minor !== undefined && l.minor === undefined ? { minor } : {}), ...l }))

export const LICKS: LickDef[] = [
  // ───────────────────────── Blues (A, box 1 at the 5th fret)
  ...L('blues', 'A', [
    { id: 'bl-box1', name: 'Box 1 call', level: 1, kind: 'lick', chord: 'A7', tab: 'q 2:8 e 2:5 3:7 q 3:5 4:7~',
      must: { about: 'The first thing most blues players learn: five notes walking down the minor pentatonic "box" at the 5th fret, ending on the root with vibrato. It is the musical "Hey!" that starts a conversation.',
        steps: ['Put your first finger across the 5th fret and your third finger ready for the 7th; your pinky takes the 8th fret on the B string.', 'Pick the 8th fret on the B string (G), then the 5th (E), then cross to the G string: 7th (D) and 5th (C).', 'Land on the 7th fret of the D string (A, the root) and shake it with vibrato: wiggle the string a little up and down from the wrist, not the fingertip.', 'Count "1, 2 &, 3, 4": the long notes are on 1, 3 and 4.'],
        tip: 'Let the last note ring with even, slow vibrato. Ending a phrase with confidence matters more than how many notes you play.', use: 'Over the I chord (A7) in a 12-bar blues, or to start any blues solo in A.', goal: 90 } },
    { id: 'bl-bend-release', name: 'Bend, release, resolve', level: 1, kind: 'lick', chord: 'A7', tab: 'q 3:7b e 3:7r 3:5 h 4:7~',
      must: { about: 'A whole-step bend from the 4th (D) up to the 5th (E), let back down, then home to the root. Bending into a chord tone is what makes blues guitar "talk".',
        steps: ['Fret the 7th fret on the G string with your third finger, with the first and second fingers behind it on the same string to help push.', 'Pick and push the string up (towards the ceiling) until it sounds like the 9th fret (E). Check by playing the 9th fret first and matching it.', 'Hold the bend for half a beat, then let it come back down to D without picking again.', 'Pick the 5th fret (C), then land on the 7th fret of the D string (A) with vibrato.'],
        tip: 'Bend with the wrist, like turning a doorknob, not by squeezing the finger. Out-of-tune bends are the number one thing that makes blues sound amateur: use the Bends trainer to check.', use: 'Anywhere over A7 or Am; strongest at the end of a phrase.', goal: 80 } },
    { id: 'bl-bb-box', name: 'The B.B. box', level: 2, kind: 'lick', chord: 'A7', tab: 'q 1:10b e 1:10r 2:12 q 2:10~ e 2:13 2:10',
      must: { about: 'Up at the 10th fret on the top two strings sits the little "B.B. King box": a handful of notes with the root on the B string, a sweet bend on the high E and the major-6th/9th sound. Few notes, lots of feeling.',
        steps: ['Your first finger sits on the 10th fret of the B string (A, the root).', 'Bend the 10th fret of the high E (D) up a whole step to E with the third finger, release it.', 'Play the 12th fret on the B string (B, the 9th), then the root at the 10th with a wide, slow vibrato.', 'Finish with the 13th fret (C) back to the 10th: the minor 3rd leaning on the root.'],
        tip: 'Leave space. This box sounds best with rests between phrases; play, listen to the band, answer.', use: 'Over A7, especially in slow blues and ballads.', goal: 70 } },
    { id: 'bl-turnaround', name: 'Shuffle turnaround', level: 2, kind: 'turnaround', chord: 'A7 | E7', tab: 't 1:5+3:8 r 1:5+3:8 1:5+3:7 r 1:5+3:7 1:5+3:6 r 1:5+3:6 1:5+3:5 r 1:5+3:5 | q 4:7 4:6 h 5:7+4:6+3:7',
      must: { about: 'The last two bars of a 12-bar blues "turn around" to the start. Here the high A stays put while a line walks down chromatically underneath, in a shuffle feel, then lands on the E7 chord.',
        steps: ['Hold the 5th fret on the high E with your first finger the whole bar.', 'Your other fingers play the G string: 8, 7, 6, 5, each twice in a long-short shuffle rhythm with the high A.', 'Bar two: the D string 7th then 6th fret (A, G#), then grab the E7 shape: A string 7, D string 6, G string 7.', 'Shuffle feel: "DAH-da DAH-da", the first of each pair longer.'],
        tip: 'Keep the shuffle swing. Played straight it sounds stiff; tap your foot and say "hump-ty dump-ty".', use: 'The last two bars (11–12) of a 12-bar blues in A.', goal: 90 } },
    { id: 'bl-double-stops', name: 'Double-stop slides', level: 2, kind: 'double-stop', chord: 'A7', tab: 'e 3:7+2:8 3:7+2:8 3:5+2:5 3:5+2:5 h 4:7+3:6~' },
    { id: 'bl-blue-note', name: 'Blue-note climb', level: 1, kind: 'run', chord: 'A7', tab: 'e 6:5 6:8 5:5 5:6 5:7 4:5 q 4:7~' },
    { id: 'bl-triplet-cascade', name: 'Triplet cascade', level: 3, kind: 'run', chord: 'A7', tab: 't 1:8 1:5 2:8 1:5 2:8 2:5 2:8 2:5 3:7 2:5 3:7 3:5' },
    { id: 'bl-call-response', name: 'Call and response', level: 2, kind: 'lick', chord: 'A7', tab: 'e 3:5 3:7 2:5 2:8b q 2:8r e 2:5 3:7 | q 3:5 e 3:7 3:5 q 4:7~ r',
      must: { about: 'Blues is a conversation: a question in the first bar (rising, ending up in the air on a bend) and an answer in the second (falling, landing home). Learn this shape and you can build endless solos from it.',
        steps: ['Bar one, the call: walk up C D E on the G and B strings, then bend the 8th fret of the B string (G) up to A and let it down.', 'Finish the call on E and D: it should sound unfinished.', 'Bar two, the answer: C, D, C, then the root A on the D string with vibrato, and a beat of silence.', 'Say it like words: "Where are you going?" … "Going home."'],
        tip: 'The rest at the end is part of the lick. Silence makes the next phrase land.', use: 'Any two bars over A7; repeat with different calls for a whole chorus.', goal: 85 } },
    { id: 'bl-major-mix', name: 'Major–minor mix', level: 2, kind: 'lick', chord: 'A7', tab: 'e 4:7 3:5 3:6h 2:5 2:7 2:5 q 3:6~' },
    { id: 'bl-arp-a7', name: 'A7 arpeggio', level: 2, kind: 'arpeggio', chord: 'A7', tab: 'e 6:5 5:4 5:7 4:5 4:7 3:6 2:5 2:8 | q 1:5 e 2:8 2:5 q 3:6~ 4:7' },
    { id: 'bl-fast-run', name: 'Sixteenth-note box run', level: 3, kind: 'run', chord: 'A7', tab: 's 1:8 1:5 2:8 2:5 1:8 1:5 2:8 2:5 3:7 2:5 3:7 3:5 4:7 3:5 4:7 4:5' },
    { id: 'bl-ending', name: 'Slow blues ending', level: 1, kind: 'ending', chord: 'E7 | A7', tab: 'e 2:5 2:8 1:5 2:8 q 2:5 3:7 | q 3:6 3:5 h 4:7+3:6~' },
  ], true),

  // ───────────────────────── Classic rock (A minor, box 1 and 2)
  ...L('rock', 'A', [
    { id: 'rk-pent-run', name: 'Pentatonic run down', level: 1, kind: 'run', chord: 'A5', tab: 'e 1:8 1:5 2:8 2:5 3:7 3:5 q 4:7~' },
    { id: 'rk-repeat', name: 'Repeating triplet lick', level: 2, kind: 'lick', chord: 'A5', tab: 't 1:8 1:5p 2:8 1:8 1:5p 2:8 1:8 1:5p 2:8 1:8 1:5p 2:8',
      must: { about: 'The repeating pull-off triplet: three notes looped over and over, so it sounds faster and more exciting than it is. A trademark of late-60s and 70s rock solos.',
        steps: ['Pinky on the 8th fret of the high E, first finger on the 5th (both ready before you start).', 'Pick the 8th fret, pull off to the 5th (flick the pinky down so the 5th sounds without picking), then pick the 8th fret on the B string.', 'That is one group of three: "1-trip-let". Repeat it four times for one bar.', 'Start slow and even; speed comes from repetition, not effort.'],
        tip: 'Accent the first note of each group a little so the triplets stay locked to the beat instead of running away.', use: 'Building excitement in the middle of a solo, over A5, Am or A7.', goal: 110 } },
    { id: 'rk-unison', name: 'Unison bend', level: 2, kind: 'double-stop', chord: 'A5', tab: 'q 3:7b+2:5 3:7b+2:5 e 3:7r 3:5 q 4:7~',
      must: { about: 'Two strings, one pitch: you bend the G string up to match the note held on the B string. The two notes rub as they meet, which gives that crying, huge rock sound.',
        steps: ['First finger flat on the 5th fret of the B string (E); third finger on the 7th fret of the G string (D).', 'Pick both together and bend the G string up a whole step until it matches the E on the B string.', 'You will hear a wobble that stops when the two are in tune: that is your target.', 'Do it twice, then let the bend down, play C (G string 5th) and finish on A.'],
        tip: 'Keep the first finger from muting the bent string; let it sit just on the tip.', use: 'Climaxes of solos, long notes over A5 or Am.', goal: 90 } },
    { id: 'rk-double-bend', name: 'Double-stop bend', level: 2, kind: 'double-stop', chord: 'A5', tab: 'q 3:7b+2:8 e 2:8 2:5 q 3:7 4:7~' },
    { id: 'rk-ext-box', name: 'Box 2 extension', level: 2, kind: 'lick', chord: 'Am', tab: 'e 1:10 1:8 2:10 2:8 q 3:9b~ e 3:7 4:7' },
    { id: 'rk-sixteenths', name: 'Descending fours', level: 3, kind: 'run', chord: 'Am', tab: 's 1:8 1:5 2:8 2:5 1:5 2:8 2:5 3:7 2:8 2:5 3:7 3:5 2:5 3:7 3:5 4:7' },
    { id: 'rk-chuck', name: 'Rock and roll double stops', level: 1, kind: 'double-stop', chord: 'A', minor: false, tab: 'e 3:6+2:5 3:6+2:5 3:6+2:5 3:6+2:5 3:5+2:5 3:5+2:5 4:7+3:6 4:7+3:6',
      must: { about: 'Two notes at once on the G and B strings, played in straight eighths: the sound of 1950s rock and roll and everything that came from it.',
        steps: ['Third finger on the 6th fret of the G string, first finger on the 5th of the B string.', 'Strum just those two strings four times (down-down-down-down or down-up).', 'Move the third finger to the 5th fret of the G string (now both on the 5th) for two strums.', 'Finish with A and C# (D string 7th, G string 6th).'],
        tip: 'Mute the other strings with the side of the picking hand and the unused fingertips so only the two notes sound.', use: 'Over A or A7 in rock and roll, boogie and early rock.', goal: 130 } },
    { id: 'rk-arp-am', name: 'Am arpeggio roll', level: 3, kind: 'arpeggio', chord: 'Am', tab: 't 4:7 3:5 2:5 1:5 1:8 1:5 2:5 3:5 4:7 3:5 2:5 1:5' },
    { id: 'rk-ending', name: 'Big ending', level: 1, kind: 'ending', chord: 'Am', tab: 'e 3:5 3:7 q 2:5b~ e 2:5r 3:7 q 4:7~' },
    { id: 'rk-hammer-pull', name: 'Hammer-pull riff', level: 1, kind: 'riff', chord: 'Am', tab: 'e 3:5 3:7h 3:5p 4:7 3:5 3:7h 3:5p 4:7' },
    { id: 'rk-southern', name: 'Southern rock major pentatonic', level: 2, kind: 'run', chord: 'A', minor: false, tab: 'e 2:7 2:5 3:6 3:4 4:7 4:4 q 4:7~',
      must: { about: 'Same shapes, sweeter sound: the major pentatonic (A B C# E F#) that Southern rock and country-rock players use over major chords. It is the minor pentatonic box slid down three frets.',
        steps: ['Start on the 7th fret of the B string (F#, the 6th) and walk down: B string 5, G string 6 and 4, D string 7 and 4.', 'Use first finger for the 4th fret notes, third for the 6th and 7th.', 'Land on A (D string 7th) and hold it.', 'Listen to how it sounds happy compared with the minor box at the 5th fret.'],
        tip: 'Over a major chord, slide between the two sounds: a phrase of major pentatonic, a phrase of minor. That mix is the Southern rock secret.', use: 'Over A major and A7 in rock, country-rock and jam music.', goal: 100 } },
  ], true),

  // ───────────────────────── Alt rock (E minor, open strings)
  ...L('altrock', 'E', [
    { id: 'alt-octaves', name: 'Octave melody', level: 1, kind: 'lick', chord: 'Em', tab: 'q 4:2+2:5 4:5+2:8 4:4+2:7 4:2+2:5',
      must: { about: 'Play a melody in octaves (the same note two octaves apart, one string skipped) and it instantly sounds bigger. A favourite of 90s alternative, Britpop and indie players.',
        steps: ['First finger on the D string, third or fourth finger two strings up on the B string, three frets higher.', 'Mute the G string in between with the underside of the first finger, and mute the strings outside with your other fingers and picking hand.', 'Strum through all the strings: only the two octave notes should ring.', 'Walk the shape: E, G, F#, E.'],
        tip: 'Muting is everything. Strum hard and loose; if you hear the G string, flatten the first finger a little more.', use: 'Melodies over Em, or any riff you want to sound huge without distortion.', goal: 100 } },
    { id: 'alt-drone', name: 'Open-string drone', level: 1, kind: 'riff', chord: 'Em', tab: 'e 3:9+2:0 1:0 3:7+2:0 1:0 3:5+2:0 1:0 3:4+2:0 1:0',
      must: { about: 'A moving note on the G string while the open B and E strings ring on and on. The shimmering, chiming sound of 90s and 2000s alternative rock.',
        steps: ['Play the G string 9th fret together with the open B, then the open high E.', 'Move down the G string: 7, 5, 4, each time with the open strings.', 'Let every open string ring into the next note.', 'Use a little delay or reverb if you have it.'],
        tip: 'Arch your fretting finger so it doesn\'t touch the open B string.', use: 'Intros, verses and anywhere in E minor or G major.', goal: 110 } },
    { id: 'alt-chromatic', name: 'Chromatic power-chord slide', level: 2, kind: 'riff', chord: 'E5', tab: 'e 6:0m 6:0m 6:5+5:7 6:4+5:6 6:3+5:5 6:2+5:4 q 6:0+5:2~' },
    { id: 'alt-add9', name: 'Minor add9 arpeggio', level: 2, kind: 'arpeggio', chord: 'Em(add9)', tab: 'e 6:0 5:2 4:4 3:0 2:0 1:2 2:0 3:0' },
    { id: 'alt-unison', name: 'Unison bend wail', level: 2, kind: 'double-stop', chord: 'Em', tab: 'h 3:14b+2:12 q 2:12 1:12~' },
    { id: 'alt-tremolo', name: 'Tremolo melody', level: 2, kind: 'lick', chord: 'Em', tab: 's 2:12 2:12 2:12 2:12 2:10 2:10 2:10 2:10 2:8 2:8 2:8 2:8 2:7 2:7 2:7 2:7' },
    { id: 'alt-riff', name: 'Power-chord riff', level: 1, kind: 'riff', chord: 'E5', tab: 'e 6:0+5:2 6:0+5:2 6:3+5:5 6:0+5:2 6:5+5:7 6:3+5:5 q 6:0+5:2' },
    { id: 'alt-singing', name: 'Slow singing line', level: 1, kind: 'lick', chord: 'Em', tab: 'h 2:5~ q 2:7 2:8 | w 2:5~' },
    { id: 'alt-harmonics', name: 'Harmonic shimmer', level: 2, kind: 'lick', chord: 'Em', tab: 'q 3:12n+2:12n+1:12n 4:12n+3:12n e 2:7n 1:7n q 3:7n' },
    { id: 'alt-cascade', name: 'Open-string cascade', level: 3, kind: 'arpeggio', chord: 'Em', tab: 's 3:9 2:0 1:0 2:0 3:7 2:0 1:0 2:0 3:6 2:0 1:0 2:0 3:4 2:0 1:0 2:0' },
    { id: 'alt-fuzz', name: 'Fuzz pentatonic', level: 2, kind: 'lick', chord: 'Em', tab: 'e 1:15 1:12 2:15b 2:15r 2:12 3:14 q 3:12~' },
  ], true),

  // ───────────────────────── Heavy metal (E, low E pedal)
  ...L('metal', 'E', [
    { id: 'mt-gallop', name: 'The gallop', level: 1, kind: 'riff', chord: 'E5', tab: 'e 6:0m s 6:0m 6:0m e 6:0m s 6:0m 6:0m e 6:0m s 6:0m 6:0m e 6:3+5:5 s 6:3+5:5 6:3+5:5',
      must: { about: 'Long-short-short, like a horse running: the rhythm that drives classic heavy metal. Every metal player needs it locked in.',
        steps: ['Rest the side of your picking hand on the low strings near the bridge (palm mute: chunky, not choked).', 'Pick down on the eighth note, then down-up on the two sixteenths: "1 trip-let", "2 trip-let".', 'Three gallops on the open low E, then one on a G5 power chord (6th string 3rd fret, 5th string 5th fret).', 'Keep the wrist loose; it comes from a small rotation, not the arm.'],
        tip: 'Count "ONE-and-a TWO-and-a": the gallop starts exactly on the beat. Practise with the click at 100 bpm before speeding up.', use: 'Verses and riffs in E minor metal; move the power chord to change the riff.', goal: 150 } },
    { id: 'mt-pedal', name: 'Pedal-point run', level: 2, kind: 'riff', chord: 'Em', tab: 's 6:0m 5:2 6:0m 5:3 6:0m 5:5 6:0m 5:3 6:0m 5:2 6:0m 4:2 6:0m 5:3 6:0m 5:2',
      must: { about: 'A melody where every other note is the open low E (the "pedal"). It sounds fast and heavy while the left hand only plays a few notes.',
        steps: ['Alternate pick strictly: down on the low E, up on the melody note.', 'Palm mute the low E lightly, let the melody notes on the A and D strings speak a bit more.', 'Fingering: 2nd fret first finger, 3rd fret second finger, 5th fret fourth finger.', 'Start at 80 bpm in sixteenths and only speed up when it is perfectly even.'],
        tip: 'Your picking hand never stops: down-up-down-up, even when you change strings.', use: 'Fast riffs and solo intros in E minor.', goal: 140 } },
    { id: 'mt-harm-minor', name: 'Harmonic minor descent', level: 3, kind: 'run', chord: 'Em', tab: 's 1:12 1:11 1:8 1:7 2:8 2:7 2:5 2:4 3:5 3:4 3:2 4:5 4:4 4:2 4:1 4:2',
      must: { about: 'The E harmonic minor scale (with D# instead of D) running down: the dark, classical sound of neoclassical and power metal.',
        steps: ['Start on the 12th fret of the high E, play 12-11-8-7 with fingers 4-3-1 then shift.', 'Keep strict alternate picking through the string changes.', 'The D# (high E 11th, B string 4th, D string 1st) is the note that gives the exotic pull back to E.', 'Practise in small chunks of four notes, then join them.'],
        tip: 'Shift the hand position on the B string with a small slide of the first finger, not a jump.', use: 'Over Em and B7 (the V chord) in metal and neoclassical solos.', goal: 120 } },
    { id: 'mt-tremolo', name: 'Tremolo-picked melody', level: 2, kind: 'lick', chord: 'Em', tab: 's 2:8 2:8 2:8 2:8 2:7 2:7 2:7 2:7 2:5 2:5 2:5 2:5 2:4 2:4 2:4 2:4' },
    { id: 'mt-chromatic', name: 'Chromatic chug', level: 1, kind: 'riff', chord: 'E5', tab: 'e 6:0m 6:0m 6:1 6:0m 6:0m 6:2 6:0m 6:3' },
    { id: 'mt-sweep', name: 'E minor sweep', level: 3, kind: 'arpeggio', chord: 'Em', tab: 's 4:14 3:12 2:12 1:12 1:15 1:12 2:12 3:12 4:14 3:12 2:12 1:12 q 1:15b~' },
    { id: 'mt-dim', name: 'Diminished climb', level: 3, kind: 'arpeggio', chord: 'B7', tab: 's 5:6 5:9 4:7 4:10 3:8 3:11 2:10 2:13 h 1:12~' },
    { id: 'mt-thrash', name: 'Thrash riff', level: 1, kind: 'riff', chord: 'E5', tab: 's 6:0m 6:0m 6:0m 6:0m e 6:5+5:7 s 6:0m 6:0m e 6:6+5:8 s 6:0m 6:0m e 6:3+5:5 6:0m' },
    { id: 'mt-scream', name: 'Screaming bend', level: 2, kind: 'lick', chord: 'Em', tab: 'h 2:17b~ q 1:15 1:12' },
    { id: 'mt-legato', name: 'Legato run', level: 3, kind: 'run', chord: 'Em', tab: 's 1:12 1:15h 1:17h 1:15p 1:12p 2:15 2:13p 2:12p 3:14 3:12p 3:11p 4:14 q 4:14~' },
    { id: 'mt-end', name: 'Phrygian ending', level: 1, kind: 'ending', chord: 'E5', tab: 'e 6:0m 6:0m q 6:1+5:3 e 6:0m 6:0m q 6:0+5:2~' },
  ], true),

  // ───────────────────────── Prog metal (E minor)
  ...L('progmetal', 'E', [
    { id: 'pm-fives', name: 'Groups of five', level: 2, kind: 'run', chord: 'Em', tab: 's 5:7 5:9 5:10 4:7 4:9 5:7 5:9 5:10 4:7 4:9 5:7 5:9 5:10 4:7 4:9 5:7',
      must: { about: 'A five-note pattern played in sixteenth notes (groups of four): the pattern starts on a different part of the beat each time, so it seems to tumble over the bar line. The classic prog trick.',
        steps: ['Learn the five notes first: A string 7-9-10, D string 7-9 (E F# G A B).', 'Play them as sixteenths with alternate picking and count "1-e-&-a" out loud.', 'Feel the pattern restart: on beat 1, then the "a" of 1, then the "&" of 2 …', 'Loop it with the click until the beat stays steady while the pattern shifts.'],
        tip: 'Tap your foot on the beat, not on the pattern. If your foot follows the fives, slow down.', use: 'Building tension over Em or a long held chord before a big change.', goal: 110 } },
    { id: 'pm-3nps', name: 'Three-notes-per-string legato', level: 3, kind: 'run', chord: 'Em', tab: 's 6:12 6:14h 6:15h 5:12 5:14h 5:15h 4:12 4:14h 4:16h 3:12 3:14h 3:16h 2:13 2:15h 2:17h 1:15',
      must: { about: 'Three notes on every string, picking only the first and hammering the rest: smooth, fast, flowing lines. The backbone of modern prog and fusion technique.',
        steps: ['Pick the first note on each string, hammer the next two hard enough that they ring as loud as the picked one.', 'Fingers: 1-3-4 on the low strings (12-14-15), 1-3-4 or 1-2-4 on the others; keep the thumb low behind the neck.', 'Mute the strings you just left with the fretting hand\'s first finger.', 'Practise each string alone, then two strings, then the whole run.'],
        tip: 'Evenness beats speed: record yourself and listen for quiet hammer-ons.', use: 'Ascending runs over Em, Em9 or Cmaj7 in prog and fusion.', goal: 120 } },
    { id: 'pm-skip', name: 'String-skip arpeggio', level: 3, kind: 'arpeggio', chord: 'Em', tab: 's 4:14 2:12 2:15 2:12 4:14 2:12 2:15 2:12 4:12 2:13 2:15 2:13 4:12 2:13 2:15 2:13' },
    { id: 'pm-78', name: '7/8 riff', level: 2, kind: 'riff', chord: 'E5', meter: 3.5, tab: 'e 6:0m 6:0m 6:3 6:0m 6:5 6:0m 6:6' },
    { id: 'pm-threes', name: 'Three over four chug', level: 3, kind: 'riff', chord: 'E5', tab: 's 6:0m 6:0m 6:3 6:0m 6:0m 6:3 6:0m 6:0m 6:3 6:0m 6:0m 6:3 6:0m 6:0m 6:3 6:5' },
    { id: 'pm-tap', name: 'Tapped arpeggios', level: 3, kind: 'arpeggio', chord: 'Em | C', tab: 's 1:19t 1:12p 1:15h 1:12p 1:19t 1:12p 1:15h 1:12p 1:20t 1:12p 1:15h 1:12p 1:20t 1:12p 1:15h 1:12p',
      must: { about: 'The picking hand taps a note on the fretboard (T), pulls off to a note held by the fretting hand, which then hammers on: three notes per beat-chunk without picking. Change one finger and the chord changes.',
        steps: ['Fretting hand: first finger on the 12th fret of the high E, fourth finger ready for the 15th.', 'Tap the 19th fret with the middle finger of the picking hand, then pull it off sideways (towards the floor) so the 12th sounds.', 'Hammer the 15th, pull off back to the 12th, tap again.', 'Second half: tap the 20th instead of the 19th: E minor becomes C major.'],
        tip: 'Rest the picking-hand palm on the low strings to keep them quiet; tapping makes a lot of noise otherwise.', use: 'Em to C (or any two chords a semitone apart at the top), solo climaxes.', goal: 110 } },
    { id: 'pm-ending', name: 'Odd-group ending', level: 2, kind: 'ending', chord: 'Em', tab: 't 1:12 1:15 1:17 q 1:19b~ t 2:15 2:13 2:12 q 3:14~' },
  ], true),

  // ───────────────────────── Math rock (E major, open strings, clean)
  ...L('mathrock', 'E', [
    { id: 'mr-open-hammer', name: 'Open-string hammer-ons', level: 1, kind: 'arpeggio', chord: 'E | B | A', tab: 's 3:6 3:8h 2:0 1:0 3:4 3:6h 2:0 1:0 3:2 3:4h 2:0 1:0 3:1 3:2h 2:0 1:0',
      must: { about: 'Hammer-ons on the G string while the open B and E strings ring above them: the sparkly sound of math rock and Midwest emo.',
        steps: ['Pick the G string, hammer two frets up, then pick the open B and open E.', 'Move the hammer-on down the G string: 6→8, 4→6, 2→4, 1→2.', 'Let everything ring; a clean tone with a little reverb is ideal.', 'Count "1-e-&-a": the hammer is on "e", the open strings on "&" and "a".'],
        tip: 'Fret with the very tips of your fingers so the open strings never get touched.', use: 'Verses and intros in E major (I, V, IV sound all come from it).', goal: 120 } },
    { id: 'mr-tap', name: 'Two-hand tapping progression', level: 3, kind: 'arpeggio', chord: 'E | C#m | A | B', tab: 's 2:12t 2:5p 2:9h 2:5p 2:14t 2:5p 2:9h 2:5p 2:17t 2:10p 2:14h 2:10p 2:12t 2:4p 2:7h 2:4p',
      must: { about: 'A whole chord progression (I–vi–IV–V) on one string: the picking hand taps the top note, the fretting hand plays the other two. Pure math rock.',
        steps: ['On the B string: tap 12, pull off to 5, hammer 9, pull back to 5 (E major).', 'Change only the tap to 14 for C#m.', 'For A: tap 17, pull to 10, hammer 14. For B: tap 12, pull to 4, hammer 7.', 'Keep it slow; the hands must take turns evenly.'],
        tip: 'Mute the other strings with a hair tie or the side of the picking hand: tapping excites every string.', use: 'Intros and solos over I–vi–IV–V in E.', goal: 100 } },
    { id: 'mr-78', name: '7/8 arpeggio', level: 2, kind: 'arpeggio', chord: 'E', meter: 3.5, tab: 'e 4:2 3:1 2:0 1:0 2:0 3:1 4:2' },
    { id: 'mr-harm', name: 'Harmonic chimes', level: 2, kind: 'lick', chord: 'E', tab: 'q 2:7n 1:7n e 3:7n 4:7n q 3:12n+2:12n+1:12n' },
    { id: 'mr-54', name: '5/4 flow', level: 2, kind: 'arpeggio', chord: 'E', meter: 5, tab: 'e 6:0 5:2 4:2 3:1 2:0 1:0 2:0 3:1 4:2 5:2' },
    { id: 'mr-sixths', name: 'Sliding sixths', level: 2, kind: 'double-stop', chord: 'E', tab: 'e 3:6+1:4/ 3:6+1:4 3:4+1:2 3:4+1:2 3:2+1:0 3:2+1:0 q 3:1+1:0~' },
    { id: 'mr-cascade', name: 'Pedal-tone cascade', level: 2, kind: 'run', chord: 'E', tab: 's 1:0 2:5 1:0 2:4 1:0 2:2 1:0 2:0 1:0 3:4 1:0 3:2 1:0 3:1 1:0 4:2' },
    { id: 'mr-sus', name: 'Sus2 shimmer', level: 1, kind: 'arpeggio', chord: 'Esus2', tab: 'e 6:0 5:2 4:4 3:4 2:0 1:2 2:0 3:4' },
    { id: 'mr-accents', name: 'Shifting accents', level: 3, kind: 'riff', chord: 'E', tab: 's 3:9 2:0 1:0 3:9 2:0 1:0 3:11 2:0 1:0 3:11 2:0 1:0 3:13 2:0 1:0 3:11' },
  ]),

  // ───────────────────────── Jazz (C major, 7th–8th position)
  ...L('jazz', 'C', [
    { id: 'jz-enclosure', name: 'Enclosures', level: 2, kind: 'lick', chord: 'Cmaj7', tab: 'e 3:10 3:8 q 3:9 e 4:10 4:8 q 4:9',
      must: { about: 'Circle a chord tone from a note above and a note below before landing on it. The "enclosure" is the single most jazz-sounding move there is.',
        steps: ['Target E (the 3rd of Cmaj7) on the G string 9th fret.', 'Play the note above it (F, 10th fret), the note below it (D#, 8th fret), then land on E on a beat.', 'Do the same around B (the 7th) on the D string: C, A#, B.', 'The landing note is longer; the two around it are quick.'],
        tip: 'The chromatic note is fine because it resolves immediately. Land the target on the beat and it always sounds right.', use: 'Approaching any chord tone, especially the 3rd at a chord change.', goal: 140 } },
    { id: 'jz-251', name: 'ii–V–I line', level: 2, kind: 'lick', chord: 'Dm7 G7 | Cmaj7', tab: 'e 3:7 3:10 2:10 1:8 1:7 2:10 3:10 3:7 | q 3:9 e 2:8 3:9 h 4:10~',
      must: { about: 'The ii–V–I (Dm7–G7–Cmaj7) is the most common move in jazz. This line climbs the Dm7 arpeggio, comes down through G7 and lands on E, the 3rd of Cmaj7, right on the downbeat.',
        steps: ['Bar one, beats 1–2: D F A C (Dm7) going up across the G, B and high E strings.', 'Beats 3–4: B A F D coming down (the sound of G7).', 'Bar two: land on E (G string 9th fret) exactly on beat one, then G, E and a long C.', 'Practise with a backing track in Jam set to jazz in C.'],
        tip: 'The note on the first beat of the new chord matters most. Hear the E arrive as the chord changes to Cmaj7.', use: 'Every ii–V–I in C; move it up and down the neck for other keys.', goal: 130 } },
    { id: 'jz-bebop', name: 'Bebop scale descent', level: 3, kind: 'run', chord: 'G7', tab: 'e 2:8 2:7 2:6 3:9 3:7 4:10 4:9 4:7 | h 5:10~ r' },
    { id: 'jz-cmaj7', name: 'Cmaj7 arpeggio', level: 1, kind: 'arpeggio', chord: 'Cmaj7', tab: 'e 4:10 3:9 2:8 1:7 1:8 1:7 2:8 3:9' },
    { id: 'jz-dm9', name: 'Dm9 arpeggio', level: 2, kind: 'arpeggio', chord: 'Dm7', tab: 'e 3:7 3:10 2:10 1:8 1:10 1:8 2:10 3:10' },
    { id: 'jz-altered', name: 'Altered dominant', level: 3, kind: 'lick', chord: 'G7alt | C', tab: 'e 1:7 1:6 1:4 2:6 2:4 2:2 q 3:5' },
    { id: 'jz-approach', name: 'Chromatic approach notes', level: 2, kind: 'lick', chord: 'Cmaj7', tab: 'e 3:8 3:9 4:9 4:10 2:7 2:8 q 1:7' },
    { id: 'jz-octaves', name: 'Wes-style octaves', level: 2, kind: 'double-stop', chord: 'Cmaj7', tab: 'q 5:7+3:9 5:8+3:10 e 5:10+3:12 5:8+3:10 q 5:7+3:9',
      must: { about: 'A melody played in octaves with the thumb, string skipped: the warm, singing jazz sound associated with Wes Montgomery.',
        steps: ['First finger on the A string, third or fourth finger on the G string two frets higher.', 'Mute the D string between them with the underside of the first finger.', 'Strike with the side of the thumb (or the pick) through all three strings: only the octave rings.', 'Walk E, F, G, F, E.'],
        tip: 'Use the thumb for a softer, rounder tone; turn the guitar\'s tone knob down a little.', use: 'Melodies and solo builds over Cmaj7 or any slow jazz tune.', goal: 110 } },
    { id: 'jz-guide', name: 'Guide tones', level: 1, kind: 'double-stop', chord: 'Dm7 G7 | Cmaj7', tab: 'h 4:3+3:5 4:3+3:4 | w 4:2+3:4~',
      must: { about: 'The 3rd and 7th of each chord ("guide tones") move by tiny steps from one chord to the next. Play just those and the changes are heard, with nothing else.',
        steps: ['Dm7: F and C (D string 3rd fret, G string 5th fret).', 'G7: keep F, move C down to B (G string 4th fret).', 'Cmaj7: F moves down to E (D string 2nd fret), B stays.', 'Play them slowly and listen to one note moving at each change.'],
        tip: 'Solo lines built on these notes always outline the chords. Sing the moving note.', use: 'Hearing and outlining any ii–V–I, comping, and as targets for soloing.', goal: 80 } },
  ]),

  // ───────────────────────── Blues-pop, John Mayer style (E major)
  ...L('mayer', 'E', [
    { id: 'jm-sixths', name: 'Sliding sixths', level: 2, kind: 'double-stop', chord: 'E | A', tab: 'q 3:6+1:5/ e 3:6+1:5 3:4+1:4 q 3:2+1:2 3:1+1:0',
      must: { about: 'Two notes a sixth apart (G string and high E, skipping the B) sliding down the neck. Sweet, vocal and soulful: the sound of slow blues-pop ballads.',
        steps: ['Middle finger on the G string, ring finger on the high E; let the B string sit muted under the fingers.', 'Slide into the first pair (C# and A), then step down: B and G#, A and F#, G# and E.', 'Pluck with pick and middle finger (hybrid picking) or two fingers, so both notes sound together.', 'Let the last pair ring with a gentle vibrato.'],
        tip: 'Mute the B string by letting the middle finger lean on it. If it rings, the sixths turn into a mushy chord.', use: 'Over E and A in slow ballads and between vocal lines.', goal: 80 } },
    { id: 'jm-embellish', name: 'Hendrix-style chord embellishment', level: 2, kind: 'riff', chord: 'E', tab: 'e 6:0 4:2+3:1+2:0 r 4:2+3:2h+2:0 3:1p 5:2 4:2 4:4h',
      must: { about: 'Instead of strumming a chord, decorate it: bass note, a slice of the chord, hammer-ons to the sus4 and back, a little fill. Rhythm and lead in one, as in Hendrix\'s ballads and Mayer\'s clean songs.',
        steps: ['Pluck the open low E with the thumb or pick.', 'Pick the top of the E chord (D string 2, G string 1, open B).', 'Hammer the G string from the 1st to the 2nd fret (sus4) and pull back off: that is the sweet "decoration".', 'Walk B, E, F# on the A and D strings to lead back to the start.'],
        tip: 'Keep the E-chord shape held down the whole time and only move one finger at a time.', use: 'Intros and verses on E (move the shape for A and B).', goal: 76 } },
    { id: 'jm-hybrid', name: 'Hybrid-picked pentatonic', level: 2, kind: 'lick', chord: 'E', tab: 'e 1:12 2:14 1:12 2:12 q 3:14b e 3:14r 3:12' },
    { id: 'jm-slow-bend', name: 'Slow-burn bend', level: 1, kind: 'lick', chord: 'E', tab: 'h 2:15b~ q 2:12 1:12~',
      must: { about: 'One note, bent slowly up to pitch, held with vibrato. Less is more: this is the emotional peak of a slow solo.',
        steps: ['Third finger on the 15th fret of the B string (D), first and second behind it.', 'Pick and bend slowly up a whole step to E, taking a full beat to get there.', 'Hold it at pitch and add a slow, wide vibrato.', 'Then B (B string 12th) and a long E on the high E string.'],
        tip: 'The slower the bend, the more it sings, but it must arrive exactly at E. Check with the 17th fret.', use: 'The big moment of a solo over E or A.', goal: 70 } },
    { id: 'jm-pinky', name: 'Minor-to-major 3rd', level: 2, kind: 'lick', chord: 'E', tab: 'e 4:14 3:12 3:13h 2:12 2:14 2:12 q 3:13~' },
    { id: 'jm-triads', name: 'Triad arpeggios E–A–B', level: 2, kind: 'arpeggio', chord: 'E | A | B', tab: 'e 3:9 2:9 1:7 2:9 3:9 2:10 1:9 2:10 | e 3:8 2:7 1:7 2:7 q 3:9+2:9+1:7~ r' },
    { id: 'jm-ds-bend', name: 'Double-stop bend and release', level: 3, kind: 'double-stop', chord: 'E', tab: 'q 2:15b+1:15 e 2:15r+1:15 2:12+1:12 q 3:14b 3:12' },
    { id: 'jm-fast', name: 'Fast pentatonic cascade', level: 3, kind: 'run', chord: 'Em', tab: 's 1:15 1:12 2:15 2:12 3:14 3:12 4:14 4:12 5:14 5:12 6:15 6:12 q 6:12~' },
    { id: 'jm-slide-3rd', name: 'Slide into the 3rd', level: 2, kind: 'lick', chord: 'E', tab: 'e 3:11/ 3:13 2:12 1:12 2:14 1:12 q 2:12~' },
    { id: 'jm-ending', name: 'Sweet ending', level: 1, kind: 'ending', chord: 'E', tab: 'e 3:13 2:12 2:14 1:12 h 1:12~' },
  ]),

  // ───────────────────────── Neo-soul (E major)
  ...L('neosoul', 'E', [
    { id: 'ns-flourish', name: 'Hammer-on chord flourish', level: 2, kind: 'arpeggio', chord: 'Emaj7', tab: 'e 5:7 4:9 3:8 3:9h 2:9 3:9 3:8p 4:9',
      must: { about: 'Hold a major 7th chord shape and play it one note at a time, with a hammer-on from the 7th to the root and back. The liquid, R&B sound of neo-soul.',
        steps: ['Make Emaj7 at the 7th fret: A string 7, D string 9, G string 8, B string 9.', 'Play the notes one at a time from the bottom.', 'On the G string, hammer from the 8th to the 9th fret (D# to E), then pull back.', 'Keep the chord held; only the hammering finger moves.'],
        tip: 'Play soft, with the fingers or a light pick, and let notes overlap.', use: 'Over Emaj7 or E in slow R&B grooves.', goal: 76 } },
    { id: 'ns-ds-slide', name: 'Sliding double stops', level: 1, kind: 'double-stop', chord: 'Emaj7', tab: 'q 3:9+2:9/ e 3:11+2:12 3:9+2:9 q 3:8+2:9 r' },
    { id: 'ns-pent', name: 'Neo-soul pentatonic', level: 2, kind: 'run', chord: 'C#m7', tab: 's 1:12 1:9 2:12 2:9 3:11 3:9 4:11 4:9 q 4:11~ r' },
    { id: 'ns-maj9', name: 'Major 9 arpeggio', level: 2, kind: 'arpeggio', chord: 'Emaj9', tab: 'e 5:7 4:6 4:9 3:8 2:7 3:8 4:9 4:6' },
    { id: 'ns-ending', name: 'Soft landing', level: 1, kind: 'ending', chord: 'Emaj7', tab: 'e 2:9 2:7 3:8 3:6 h 4:7+3:8+2:9~' },
  ]),

  // ───────────────────────── Funk (E dorian, A)
  ...L('funk', 'E', [
    { id: 'fk-dorian', name: '16th-note dorian riff', level: 2, kind: 'riff', chord: 'Em7', tab: 's 6:0 6:x 6:3 6:x 6:5 6:x 5:2 5:x 6:0 6:x 5:4 5:2 6:3 6:x 6:5 6:x',
      must: { about: 'A one-bar single-note riff in E dorian (minor with a bright 6th, C#), with muted "ghost" scratches between the notes. The picking hand never stops moving.',
        steps: ['Keep the picking hand going down-up in steady sixteenths the whole bar.', 'Notes are only on some strokes; on the others, lay the fretting fingers loosely on the string so it goes "chk" (the x\'s).', 'Notes: E, G, A, B, C#, B, G, A.', 'Start at 70 bpm with a click; funk is about the pocket, not speed.'],
        tip: 'The muted scratches should be quiet. Let the real notes jump out.', use: 'Grooves on Em7 or E9 vamps.', goal: 100 } },
    { id: 'fk-scratch', name: 'Chicken scratch', level: 1, kind: 'riff', chord: 'Em7', tab: 's 3:x 3:x 3:9 3:x 3:x 3:x 3:11 3:x 3:x 3:x 3:9 3:x 3:7 3:x 3:9 3:x' },
    { id: 'fk-9th', name: '9th-chord stabs', level: 2, kind: 'riff', chord: 'E9', tab: 's 5:7+4:6+3:7 r r r 5:7+4:6+3:7 r 4:6+3:7 r r r 4:6+3:7 r 5:7+4:6+3:7 r r r' },
    { id: 'fk-octave', name: 'Octave riff', level: 2, kind: 'riff', chord: 'Em7', tab: 's 6:0 4:2 6:0 4:2 6:3 4:5 r 6:5 4:7 r 6:3 4:5 6:0 4:2 r r' },
    { id: 'fk-slides', name: 'Pentatonic slides', level: 2, kind: 'lick', chord: 'Em7', tab: 's 2:12/ 2:14 1:12 2:14 3:14 2:14 3:12 4:14 q 3:14~ e 4:12 4:14' },
    { id: 'fk-ghost', name: 'Ghost-note line', level: 3, kind: 'riff', chord: 'A7', ref: 'A', tab: 's 5:0 5:x 5:3 5:5 4:x 4:5 5:5 5:x 5:3 5:0 6:x 6:3 6:5 6:x 5:0 5:x' },
    { id: 'fk-end', name: 'Funk tag', level: 1, kind: 'ending', chord: 'Em7', tab: 's 3:9 3:7 4:9 3:7 q 4:9 4:7 5:7~' },
  ], true),

  // ───────────────────────── Hawaiian (G, open position; capo for other keys)
  ...L('hawaiian', 'G', [
    { id: 'hw-thirds', name: 'Sweet thirds (nahenahe)', level: 1, kind: 'double-stop', chord: 'G', tab: 'e 3:0+2:0 3:2+2:1 3:4+2:3 3:5+2:5 q 3:4+2:3 3:0+2:0',
      must: { about: 'Two notes a third apart on the G and B strings, walking up the G major scale and back. Sweet and soft ("nahenahe"): the heart of Hawaiian guitar melody.',
        steps: ['Start with both strings open (G and B).', 'Climb: G string 2 + B string 1, then 4 + 3, then 5 + 5.', 'Come back down to 4 + 3 and the open strings.', 'Pluck with thumb and finger, or pick both strings together, gently.'],
        tip: 'Let each pair ring into the next. Hawaiian music is never in a hurry.', use: 'Melody fills over G (with a capo, any key).', goal: 80 } },
    { id: 'hw-slack', name: 'Slack-key hammer roll', level: 1, kind: 'lick', chord: 'G', tab: 'e 6:3 2:1 2:3h 4:0 2:0 3:0 6:3 1:0',
      must: { about: 'The thumb keeps a steady bass while the fingers play a melody with a hammer-on: the basic motion of ki hō\'alu (slack-key) guitar, played here in standard tuning.',
        steps: ['Thumb: low G (6th string 3rd fret) on beat 1, open D on beat 3, low G again on beat 4.', 'Fingers in between: B string 1st fret, hammer to the 3rd, then the open B, open G and open high E.', 'Keep the thumb steady like a heartbeat; the melody floats on top.', 'Play it slowly with a soft touch.'],
        tip: 'Rest the picking hand lightly; slack key is about a relaxed, ringing sound.', use: 'Over G in any slow island song; capo up for other keys.', goal: 80 } },
    { id: 'hw-steel', name: 'Steel-guitar slide', level: 2, kind: 'lick', chord: 'G', tab: 'q 3:2/ 3:4 e 2:3 2:5/ q 2:8~' },
    { id: 'hw-harmonics', name: 'Harmonic chimes', level: 2, kind: 'lick', chord: 'G6', tab: 'q 4:12n 3:12n 2:12n 1:12n' },
    { id: 'hw-cascade', name: 'Pull-off cascade', level: 2, kind: 'run', chord: 'G', tab: 'e 1:3 1:0p 2:3 2:0p 3:2 3:0p 4:2 4:0p' },
    { id: 'hw-vamp', name: 'Hawaiian vamp ending', level: 2, kind: 'turnaround', chord: 'A7 D7 | G', tab: 'e 5:0 4:2 3:0 2:2 4:0 3:2 2:1 1:2 | h 6:3+5:2+4:0+3:0+2:0+1:3 r',
      must: { about: 'Almost every Hawaiian song ends (and often starts) with the "vamp": II7 to V7 to I (A7, D7, G in G). Playing the chord tones through the vamp is the classic way to finish.',
        steps: ['Bar one, beats 1–2: A7 arpeggio (A, E, G, C#).', 'Beats 3–4: D7 arpeggio (D, A, C, F#).', 'Bar two: strum a full G chord and let it ring.', 'Repeat the first bar twice before the last chord for the full vamp.'],
        tip: 'Slow down a touch on the final G, like a singer holding the last word.', use: 'Endings and intros of Hawaiian songs; capo for other keys.', goal: 90 } },
    { id: 'hw-sixths', name: 'Island sixths', level: 2, kind: 'double-stop', chord: 'G', tab: 'e 3:7+1:7 3:5+1:5 3:4+1:3 3:2+1:2 h 3:0+1:0~' },
    { id: 'hw-grace', name: 'Grace-note melody', level: 1, kind: 'lick', chord: 'G', tab: 'e 2:0 2:1h q 2:3 e 1:0 1:2h q 1:3~' },
    { id: 'hw-g6', name: 'G6 open arpeggio', level: 1, kind: 'arpeggio', chord: 'G6', tab: 'e 6:3 4:0 3:0 2:0 1:0 2:0 3:0 4:0' },
    { id: 'hw-run', name: 'Slack-key run', level: 3, kind: 'run', chord: 'G', tab: 's 2:3 2:1p 2:0p 3:2 3:0p 4:2 4:0p 5:2 6:3 4:0 3:0 2:0 q 2:3+1:3~' },
  ]),

  // ───────────────────────── Jawaiian / island reggae (G)
  ...L('jawaiian', 'G', [
    { id: 'jw-chop-fill', name: 'Skank and fill', level: 1, kind: 'riff', chord: 'G', tab: 'q r 3:0+2:0+1:3 e 2:3 2:0 3:2 3:0',
      must: { about: 'Island reggae guitar: a short chord "chop" on the off-beat (the skank), then a little melodic fill. Rhythm and melody trade places.',
        steps: ['Rest on beat 1 (the bass and drums own it).', 'Beat 2: a short, clipped chop on the top three strings of G; release the pressure right after so it stops.', 'Beats 3–4: a fill walking down D, B, A, G.', 'Feel the laid-back pulse; don\'t rush.'],
        tip: 'The chop must be short. Let go of the strings with the fretting hand a split second after you strum.', use: 'Verses of island reggae in G; capo for other keys.', goal: 78 } },
    { id: 'jw-thirds', name: 'Island thirds melody', level: 1, kind: 'double-stop', chord: 'G', tab: 'e 3:4+2:3 3:4+2:3 3:2+2:1 3:2+2:1 q 3:0+2:0 r' },
    { id: 'jw-run', name: 'Major pentatonic run', level: 2, kind: 'run', chord: 'G', tab: 'e 1:3 1:0 2:3 2:0 3:2 3:0 q 4:0~' },
    { id: 'jw-octave-hook', name: 'Octave hook', level: 2, kind: 'double-stop', chord: 'G', tab: 'q 4:5+2:8 e 4:4+2:7 4:2+2:5 q 4:0+2:3 r',
      must: { about: 'A catchy hook in octaves (D string and B string): the kind of line that becomes the "voice" of an island reggae song.',
        steps: ['D string 5th fret with the first finger, B string 8th fret with the fourth; mute the G string in between.', 'Play G, then F#, E and D, each in octaves.', 'Leave a beat of space at the end.', 'Pick softly and let each octave ring.'],
        tip: 'Mute well: only two notes should ring each time.', use: 'Intros and hooks over G.', goal: 80 } },
    { id: 'jw-bubble', name: 'Organ bubble', level: 2, kind: 'riff', chord: 'G | C', tab: 's r 3:0+2:0 3:0+2:0 r r 3:0+2:0 3:0+2:0 r r 3:2+2:1 3:2+2:1 r r 3:0+2:0 3:0+2:0 r' },
    { id: 'jw-slide', name: 'Sweet slide', level: 1, kind: 'lick', chord: 'G', tab: 'e 2:3/ 2:5 2:3 2:0 q 3:2 3:0' },
    { id: 'jw-arp', name: 'D–G arpeggios', level: 2, kind: 'arpeggio', chord: 'D | G', tab: 'e 4:0 3:2 2:3 1:2 2:3 3:2 q 4:0 | e 6:3 5:2 4:0 3:0 2:0 1:3 q 2:0' },
    { id: 'jw-ending', name: 'Island ending', level: 1, kind: 'ending', chord: 'G', tab: 'e 3:0 3:2 2:0 2:3 h 1:3~' },
  ]),

  // ───────────────────────── Bluegrass (first position: G, C and D shapes; capo for other keys)
  ...L('bluegrass', 'G', [
    { id: 'bg-g-run', name: 'The G run', level: 1, kind: 'ending', chord: 'G', tab: 'e 4:0 4:2h 3:0 4:2 4:0 5:2 q 6:3',
      must: { about: 'The most famous phrase in bluegrass guitar: a run down to the low G that ends verses, solos and songs. Every bluegrass picker plays a version of it.',
        steps: ['Pick the open D, hammer to the 2nd fret (E).', 'Open G, then back to E and the open D.', 'The 2nd fret of the A string (B), then the low G (6th string 3rd fret) on beat 4.', 'Alternate pick: down on the beats, up in between.'],
        tip: 'Play it with a strong, even attack and let the low G ring. It should sound like a door closing.', use: 'Ending any phrase over G; capo for other keys (capo 2 for A).', goal: 120 } },
    { id: 'bg-crosspick', name: 'Crosspicking roll', level: 2, kind: 'arpeggio', chord: 'G', tab: 'e 3:0 2:0 1:3 3:0 2:0 1:3 3:0 2:0',
      must: { about: 'Picking across three strings in a repeating three-note pattern while the rhythm is in eighths (groups of two), so the accents roll like a banjo. Clarence White and Tony Rice made it a bluegrass guitar staple.',
        steps: ['Hold a G chord with the high E string fretted at the 3rd fret.', 'Pick G string, B string, high E string, over and over (down-up-up or down-down-up, whichever stays even).', 'Count "1 & 2 & 3 & 4 &": the pattern of three restarts in different places.', 'Let all three strings ring.'],
        tip: 'Keep the pick close to the strings; crosspicking needs small, precise movements.', use: 'Backing up a singer or slow solos on G, C and D (move the fretted notes).', goal: 130 } },
    { id: 'bg-hammer-3rd', name: 'Flat-3rd to 3rd', level: 1, kind: 'lick', chord: 'G', tab: 'e 5:1 5:2h 4:0 4:2 3:0 4:2 q 4:0',
      must: { about: 'Hammer from the minor 3rd (B♭) up to the major 3rd (B): the bluesy little "slur" that gives bluegrass and country licks their bounce.',
        steps: ['First finger on the 1st fret of the A string (B♭), hammer the second finger onto the 2nd fret (B).', 'Then open D, D string 2nd fret (E), open G, back to E, and open D.', 'Keep the eighth notes perfectly even.', 'Down-up alternate picking; the hammer-on takes the place of an up-stroke.'],
        tip: 'Hammer firmly so the B is as loud as the picked note.', use: 'Over G (and with a capo, any key). Great right before the G run.', goal: 120 } },
    { id: 'bg-fiddle', name: 'Fiddle-tune line', level: 2, kind: 'run', chord: 'G', tab: 'e 3:0 3:2 2:0 2:1 2:3 2:1 2:0 3:2' },
    { id: 'bg-c-lick', name: 'Lick over C', level: 1, kind: 'lick', chord: 'C', tab: 'e 5:3 4:0 4:2 3:0 2:1 3:2 q 3:0' },
    { id: 'bg-d-lick', name: 'Lick over D', level: 1, kind: 'lick', chord: 'D', tab: 'e 4:0 3:2 2:3 1:2 2:3 3:2 q 4:0' },
    { id: 'bg-turnaround', name: 'D-to-G turnaround', level: 2, kind: 'turnaround', chord: 'D7 | G', tab: 'e 4:0 4:2 3:0 3:2 2:1 2:3 2:1 3:2 | e 3:0 4:2 4:0 5:2 q 6:3 r' },
    { id: 'bg-bluesy', name: 'Bluesy bluegrass', level: 2, kind: 'lick', chord: 'G7', tab: 'e 2:3 3:3 3:2 3:0 4:3 4:2 q 4:0' },
    { id: 'bg-arps', name: 'Chord arpeggios G–C–D–G', level: 2, kind: 'arpeggio', chord: 'G C | D G', tab: 'e 6:3 5:2 4:0 3:0 5:3 4:2 3:0 2:1 | e 4:0 3:2 2:3 1:2 6:3 4:0 3:0 2:0' },
    { id: 'bg-fast', name: 'First-position scale run', level: 3, kind: 'run', chord: 'G', tab: 's 1:3 1:2 1:0 2:3 2:1 2:0 3:2 3:0 4:2 4:0 5:3 5:2 5:0 6:3 6:2 6:3' },
    { id: 'bg-ds', name: 'Double-stop slides', level: 2, kind: 'double-stop', chord: 'G', tab: 'e 3:2+2:3/ 3:4+2:5 3:4+2:3 3:2+2:3 3:0+2:0 3:0+2:0 q 4:0+3:0' },
  ]),
  ...L('bluegrass', 'C', [
    { id: 'bg-c-run', name: 'The C run', level: 1, kind: 'ending', chord: 'C', tab: 'e 4:0 4:2h 3:0 4:2 4:0 5:2 q 5:3' },
    { id: 'bg-c-roll', name: 'C crosspick roll', level: 2, kind: 'arpeggio', chord: 'C', tab: 'e 3:0 2:1 1:0 3:0 2:1 1:0 3:0 2:1' },
    { id: 'bg-c-melody', name: 'C melody walk', level: 1, kind: 'run', chord: 'C', tab: 'e 2:1 2:3 1:0 1:1 1:3 1:1 1:0 2:3' },
    { id: 'bg-c-end', name: 'C ending', level: 1, kind: 'ending', chord: 'C', tab: 'e 2:3 2:1 3:2 3:0 4:2 4:0 q 5:3' },
  ]),
  ...L('bluegrass', 'D', [
    { id: 'bg-d-run', name: 'The D run', level: 1, kind: 'ending', chord: 'D', tab: 'e 3:2 3:4h 2:3 3:4 3:2 4:4 q 4:0' },
    { id: 'bg-d-roll', name: 'D crosspick roll', level: 2, kind: 'arpeggio', chord: 'D', tab: 'e 4:0 2:3 1:2 4:0 2:3 1:2 4:0 2:3' },
    { id: 'bg-d-fiddle', name: 'D fiddle line', level: 2, kind: 'run', chord: 'D', tab: 'e 4:0 4:2 4:4 3:0 3:2 3:4 2:3 1:2' },
    { id: 'bg-d-end', name: 'D ending', level: 1, kind: 'ending', chord: 'D', tab: 'e 1:2 2:3 3:2 3:0 4:4 4:2 q 4:0' },
  ]),

  // ───────────────────────── Country (A, 5th position; open A)
  ...L('country', 'A', [
    { id: 'cy-chicken', name: 'Chicken pickin\'', level: 2, kind: 'lick', chord: 'A', tab: 's 3:7 3:x 3:7 3:x 2:5 2:x 2:5 2:x 3:6 3:x 3:6 3:x q 4:7~',
      must: { about: 'Pick a note, then mute it with a quick snap so it clucks like a chicken. The snappy, percussive sound of country lead guitar.',
        steps: ['Pick the G string 7th fret, then immediately lay the fretting finger lightly on the string and pick again for the muted "x".', 'Same on the B string 5th and the G string 6th.', 'End on A (D string 7th) with vibrato.', 'If you can, pluck the notes with your middle finger (hybrid picking) and snap the string against the frets.'],
        tip: 'The muted note is a click, not a pitch. Use a bright, clean tone.', use: 'Fills over A and A7 in country and rockabilly.', goal: 100 } },
    { id: 'cy-steel', name: 'Pedal-steel bend', level: 2, kind: 'double-stop', chord: 'A', tab: 'q 3:4b+2:5 e 3:4r+2:5 3:2+2:2 h 3:2+2:2~',
      must: { about: 'Bend one string while another note rings on top: it imitates a pedal steel guitar, the sound of classic country.',
        steps: ['Third finger on the G string 4th fret (B), first finger on the B string 5th fret (E).', 'Pick both and bend the G string up to C#, keeping the E steady.', 'Release the bend, then move to A and C# (both 2nd fret).', 'Let the last pair ring.'],
        tip: 'Only the bent note moves. If the E goes out of tune, your first finger is pulling it.', use: 'Over A and D in ballads and two-steps.', goal: 90 } },
    { id: 'cy-sixth', name: 'Major 6th lick', level: 1, kind: 'lick', chord: 'A', tab: 'e 2:5 2:7 1:5 2:7 2:5 3:6 q 4:7' },
    { id: 'cy-ds-bend', name: 'Double-stop bend', level: 2, kind: 'double-stop', chord: 'A', tab: 'q 3:7b+2:7 e 3:7r+2:7 3:6+2:7 q 3:4+2:5 r' },
    { id: 'cy-roll', name: 'Banjo roll', level: 3, kind: 'arpeggio', chord: 'A', tab: 's 4:7 3:6 1:5 4:7 3:6 1:5 4:7 3:6 1:5 4:7 3:6 1:5 4:7 3:6 1:5 3:6' },
    { id: 'cy-banjo', name: 'Easy banjo roll', level: 2, kind: 'arpeggio', chord: 'A', tab: 'e 3:6 2:5 1:5 3:6 2:5 1:5 3:6 2:5' },
    { id: 'cy-chromatic', name: 'Chromatic run down', level: 3, kind: 'run', chord: 'A', tab: 's 1:5 1:4 1:3 1:2 2:5 2:4 2:3 2:2 3:4 3:3 3:2 4:4 q 5:0' },
    { id: 'cy-ending', name: 'Country ending', level: 1, kind: 'ending', chord: 'A', tab: 'e 3:6 3:4 4:7 4:4 q 4:2 5:0' },
  ]),

  // ───────────────────────── Folk (G and C, open position)
  ...L('folk', 'G', [
    { id: 'fo-ring', name: 'Ringing hammer-ons', level: 1, kind: 'lick', chord: 'G', tab: 'e 4:0 4:2h 3:0 2:0 1:0 2:0 q 3:0' },
    { id: 'fo-pulls', name: 'Pull-off melody', level: 1, kind: 'lick', chord: 'G', tab: 'e 2:3 2:0p 3:2 3:0p q 4:2 4:0' },
    { id: 'fo-travis', name: 'Travis pattern on G', level: 2, kind: 'arpeggio', chord: 'G', tab: 'e 6:3+1:3 3:0 4:0 2:0 6:3 3:0 4:0 2:0',
      must: { about: 'The thumb alternates between two bass strings like a steady bass player while the fingers pluck in between. Merle Travis made it famous; folk players from Doc Watson to James Taylor live on it.',
        steps: ['Hold a G chord. Thumb plays the low G (6th string) on beats 1 and 3, the D string on beats 2 and 4.', 'On beat 1 pinch: thumb plus the high E string together.', 'Between thumb notes, a finger plucks the G or B string.', 'Say it: "PINCH-and-bass-and, bass-and-bass-and".'],
        tip: 'Get the thumb going on its own first (it should feel automatic), then add the fingers one at a time.', use: 'Accompanying folk songs on G; the same pattern works on any chord.', goal: 100 } },
    { id: 'fo-walk', name: 'Bass walk-down', level: 1, kind: 'riff', chord: 'G Em', tab: 'q 6:3+3:0+2:0 6:2+3:0+2:0 6:0+3:0+2:0 e 6:0 6:2' },
    { id: 'fo-am', name: 'Am arpeggio', level: 1, kind: 'arpeggio', chord: 'Am', tab: 'e 5:0 4:2 3:2 2:1 1:0 2:1 3:2 4:2' },
    { id: 'fo-melody', name: 'Melody run', level: 2, kind: 'run', chord: 'G', tab: 'e 1:0 1:2 1:3 1:2 1:0 2:3 2:1 2:0' },
    { id: 'fo-ending', name: 'Folk ending', level: 1, kind: 'ending', chord: 'G', tab: 'e 3:2 3:0 4:2 4:0 h 6:3+4:0+3:0+2:0+1:3' },
  ]),
  ...L('folk', 'C', [
    { id: 'fo-travis-c', name: 'Travis pattern on C', level: 2, kind: 'arpeggio', chord: 'C', tab: 'e 5:3+2:1 3:0 4:2 2:1 5:3 3:0 4:2 2:1' },
    { id: 'fo-hammer-c', name: 'C hammer melody', level: 1, kind: 'lick', chord: 'C', tab: 'e 5:3 4:0 4:2h 3:0 2:1 2:0 2:1 3:0' },
  ]),
  // ───────────────────────── more arpeggios, advanced licks and everyday licks for every style
  ...L('blues', 'A', [
    { id: 'bl-arp-d9', name: 'D9 arpeggio (the IV chord)', level: 2, kind: 'arpeggio', chord: 'D9', tab: 'e 5:5 4:4 4:7 3:5 2:5 3:5 4:7 4:4' },
    { id: 'bl-arp-e7', name: 'E7 arpeggio (the V chord)', level: 2, kind: 'arpeggio', chord: 'E7', tab: 'e 5:7 4:6 4:9 3:7 2:9 3:7 4:9 4:6' },
    { id: 'bl-overbend', name: 'Overbend cry', level: 3, kind: 'lick', chord: 'A7', tab: 'q 1:8b3 e 1:8r 1:5 q 2:8 4:7~' },
    { id: 'bl-texas', name: 'Texas shuffle run', level: 3, kind: 'run', chord: 'A7', tab: 't 3:5 3:7 3:8 2:5 2:8 2:5 3:8 3:7 3:5 4:7 4:5 4:7' },
    { id: 'bl-rake', name: 'Raked bend', level: 2, kind: 'lick', chord: 'A7', tab: 'e 4:x+3:x 2:8b q 2:8r e 2:5 3:7 q 3:5~' },
    { id: 'bl-chrom-ds', name: 'Chromatic double stops', level: 3, kind: 'double-stop', chord: 'A7', tab: 'e 3:8+2:8 3:7+2:7 3:6+2:6 3:5+2:5 q 4:7+3:6 r' },
  ], true),
  ...L('rock', 'A', [
    { id: 'rk-arp-cg', name: 'C and G triads up top', level: 2, kind: 'arpeggio', chord: 'C G', tab: 'e 3:5 2:5 1:3 2:5 3:4 2:3 1:3 2:3' },
    { id: 'rk-pedal', name: 'Pedal-tone lick', level: 3, kind: 'lick', chord: 'Am', tab: 's 1:12 1:8 1:12 1:10 1:12 1:8 1:12 1:7 1:12 1:8 1:12 1:10 1:12 1:8 1:12 1:5' },
    { id: 'rk-box2-bend', name: 'Box 2 bend', level: 1, kind: 'lick', chord: 'Am', tab: 'q 2:10b e 2:10r 2:8 h 3:9~' },
    { id: 'rk-double-time', name: 'Double-time climb', level: 3, kind: 'run', chord: 'Am', tab: 's 4:5 4:7 3:5 3:7 2:5 2:8 1:5 1:8 2:5 2:8 1:5 1:8 q 1:10b~' },
  ], true),
  ...L('altrock', 'E', [
    { id: 'alt-cadd9', name: 'Cadd9 shimmer', level: 1, kind: 'arpeggio', chord: 'Cadd9', tab: 'e 5:3 4:2 3:0 2:3 1:3 2:3 3:0 4:2' },
    { id: 'alt-g-ring', name: 'G with ringing top', level: 2, kind: 'arpeggio', chord: 'G', tab: 'e 6:3 5:2 4:0 3:0 2:3 1:3 2:3 3:0' },
    { id: 'alt-octave-run', name: 'Staccato octave run', level: 3, kind: 'run', chord: 'Em', tab: 's 4:2+2:5 r 4:2+2:5 r 4:5+2:8 r 4:5+2:8 r 4:7+2:10 r 4:7+2:10 r 4:9+2:12 r 4:7+2:10 r' },
  ], true),
  ...L('metal', 'E', [
    { id: 'mt-am-pedal', name: 'Am arpeggio over the pedal', level: 2, kind: 'arpeggio', chord: 'Am', tab: 's 6:0m 4:7 3:5 2:5 6:0m 4:7 3:5 2:5 6:0m 4:7 3:5 2:5 6:0m 4:7 3:5 2:5' },
    { id: 'mt-twin', name: 'Twin-guitar thirds', level: 2, kind: 'double-stop', chord: 'Em', tab: 'q 2:8+1:7 2:7+1:5 2:5+1:3 2:4+1:2' },
    { id: 'mt-econ', name: 'Economy-picked Em arpeggio', level: 3, kind: 'arpeggio', chord: 'Em', tab: 's 5:7 4:5 3:4 2:5 1:7 2:5 3:4 4:5 5:7 4:5 3:4 2:5 1:8 2:5 3:4 4:5' },
  ], true),
  ...L('progmetal', 'E', [
    { id: 'pm-djent', name: 'Djent octave riff', level: 1, kind: 'riff', chord: 'E5', tab: 's 6:0m 6:0m 6:0m r 6:0m 6:0m r 6:0m e 4:5+2:8 6:0m s 6:0m 6:0m e 4:7+2:10' },
    { id: 'pm-pent-fives', name: 'Pentatonic in fives', level: 2, kind: 'run', chord: 'Em', tab: 's 2:12 2:15 1:12 1:15 1:17 2:12 2:15 1:12 1:15 1:17 2:12 2:15 1:12 1:15 1:17 2:12' },
    { id: 'pm-cmaj7', name: 'Cmaj7 rolling arpeggio', level: 2, kind: 'arpeggio', chord: 'Cmaj7', tab: 'e 5:15 4:14 3:12 2:12 1:12 2:12 3:12 4:14' },
    { id: 'pm-legato-trip', name: 'Legato triplets', level: 2, kind: 'run', chord: 'Em', tab: 't 1:12 1:14h 1:15h 2:12 2:13h 2:15h 3:12 3:14h 3:16h 4:12 4:14h 4:16h' },
  ], true),
  ...L('mathrock', 'E', [
    { id: 'mr-tap-open', name: 'Tapping with an open string', level: 2, kind: 'arpeggio', chord: 'E | A', tab: 's 1:12t 1:0p 1:4h 1:7h 1:12t 1:0p 1:4h 1:7h 1:14t 1:0p 1:5h 1:9h 1:12t 1:0p 1:4h 1:7h' },
    { id: 'mr-shapes', name: 'Ringing shapes', level: 2, kind: 'riff', chord: 'E | C#m | A', tab: 'e 5:7+4:6+2:0+1:0 r 5:5+4:4+2:0+1:0 r 5:4+4:2+2:0+1:0 r q 5:2+4:1+2:0+1:0' },
  ]),
  ...L('jazz', 'C', [
    { id: 'jz-blues', name: 'Jazz blues phrase', level: 1, kind: 'lick', chord: 'C7', tab: 'e 3:8 3:9 2:8 1:6 1:8 2:11 q 3:9~' },
    { id: 'jz-triad-pairs', name: 'Triad pairs', level: 3, kind: 'arpeggio', chord: 'Cmaj7', tab: 's 3:7 2:6 1:5 2:6 3:9 2:8 1:7 2:8 3:7 2:6 1:5 2:6 3:9 2:8 1:7 2:8' },
    { id: 'jz-dorian', name: 'Dorian scale run', level: 1, kind: 'run', chord: 'Dm7', tab: 'e 3:7 3:9 3:10 2:8 2:10 1:7 1:8 1:10' },
    { id: 'jz-g7', name: 'G7 arpeggio', level: 1, kind: 'arpeggio', chord: 'G7', tab: 'e 5:10 4:9 3:7 3:10 2:8 1:7 2:6 3:7' },
    { id: 'jz-69-end', name: '6/9 ending', level: 1, kind: 'ending', chord: 'C6/9', tab: 'q 3:9 e 2:8 2:10 h 4:10+3:9+2:10+1:10~' },
  ]),
  ...L('neosoul', 'E', [
    { id: 'ns-m9', name: 'C#m9 hammer flourish', level: 2, kind: 'arpeggio', chord: 'C#m7', tab: 'e 5:4 4:2 3:4 2:4 3:4 3:6h 3:4p 4:2' },
    { id: 'ns-sixths', name: 'Soul sixths', level: 2, kind: 'double-stop', chord: 'E', tab: 'e 4:6+2:5/ 4:6+2:5 4:4+2:4 4:4+2:4 q 4:2+2:2 4:1+2:0' },
    { id: 'ns-run', name: 'Fast neo-soul run', level: 3, kind: 'run', chord: 'Emaj7', tab: 's 2:9 2:12 1:9 1:11 1:12 1:11 1:9 2:12 2:9 3:11 3:9 4:11 q 4:9~' },
    { id: 'ns-ds-hammer', name: 'Hammered double stops', level: 1, kind: 'double-stop', chord: 'E', tab: 'e 3:6+2:7 3:8+2:9h 3:8+2:9 3:6+2:7 q 3:4+2:5 r' },
  ]),
  ...L('funk', 'E', [
    { id: 'fk-e9', name: 'E9 arpeggio', level: 1, kind: 'arpeggio', chord: 'E9', tab: 'e 5:7 4:6 3:7 2:7 1:7 2:7 3:7 4:6' },
    { id: 'fk-one-string', name: 'One-string riff', level: 1, kind: 'riff', chord: 'Em7', tab: 's 2:12 2:x 2:12 2:x 2:10 2:x 2:12 2:x 2:14 2:x 2:12 2:x 2:10 2:x 2:8 2:x' },
    { id: 'fk-oct-slide', name: 'Octave slides', level: 2, kind: 'double-stop', chord: 'Em7', tab: 's 5:7+3:9 r 5:7+3:9 r 5:5+3:7/ r 5:7+3:9 r e 5:9+3:11 5:7+3:9 q 5:7+3:9~' },
    { id: 'fk-run', name: 'Funk turnaround run', level: 3, kind: 'run', chord: 'Em7', tab: 's 1:12 1:10 2:12 1:10 2:12 2:10 3:12 2:10 3:12 3:11 3:9 4:12 q 4:9~' },
  ], true),
  ...L('hawaiian', 'G', [
    { id: 'hw-d7', name: 'D7 slack-key arpeggio', level: 2, kind: 'arpeggio', chord: 'D7', tab: 'e 4:0 3:2 2:1 1:2 2:1 3:2 4:0 5:0' },
    { id: 'hw-c', name: 'Lick over C', level: 1, kind: 'lick', chord: 'C', tab: 'e 5:3 3:0 2:1 2:0 2:1 1:0 q 2:1' },
    { id: 'hw-turn', name: 'Island turnaround', level: 2, kind: 'turnaround', chord: 'G E7 | A7 D7', tab: 'e 6:3 4:0 3:0 2:0 6:0 4:2 3:1 2:0 | e 5:0 4:2 3:0 2:2 4:0 3:2 2:1 1:2' },
    { id: 'hw-flurry', name: 'Hammer-pull flurry', level: 3, kind: 'run', chord: 'G', tab: 's 1:0 1:2h 1:3h 1:2p 1:0p 2:3 2:1p 2:0p 3:2 3:0p 4:2 4:0p q 6:3+2:0+1:3' },
  ]),
  ...L('jawaiian', 'G', [
    { id: 'jw-g-arp', name: 'G major arpeggio', level: 1, kind: 'arpeggio', chord: 'G', tab: 'e 6:3 5:2 4:0 3:0 2:0 1:3 2:0 3:0' },
    { id: 'jw-em-c', name: 'Em–C arpeggio', level: 2, kind: 'arpeggio', chord: 'Em C', tab: 'e 6:0 5:2 4:2 3:0 5:3 4:2 3:0 2:1' },
    { id: 'jw-oct-fill', name: 'Octave fill', level: 1, kind: 'double-stop', chord: 'G', tab: 'q 5:5+3:7 e 5:3+3:5 5:2+3:4 q 5:0+3:2 r' },
    { id: 'jw-run4', name: 'Island run in fours', level: 3, kind: 'run', chord: 'G', tab: 's 1:3 1:0 2:3 2:0 1:0 2:3 2:0 3:2 2:3 2:0 3:2 3:0 2:0 3:2 3:0 4:2' },
  ]),
  ...L('bluegrass', 'G', [
    { id: 'bg-cross-cd', name: 'Crosspicking C to D', level: 3, kind: 'arpeggio', chord: 'C D', tab: 's 3:0 2:1 1:0 3:0 2:1 1:0 3:0 2:1 4:0 2:3 1:2 4:0 2:3 1:2 4:0 2:3' },
    { id: 'bg-fiddle-g', name: 'Fiddle-style G lick', level: 1, kind: 'lick', chord: 'G', tab: 'e 4:0 4:2 3:0 3:2 2:0 3:2 3:0 4:2' },
    { id: 'bg-g-arp', name: 'G arpeggio walk', level: 1, kind: 'arpeggio', chord: 'G', tab: 'e 6:3 5:2 4:0 3:0 2:0 1:3 2:0 3:0' },
  ]),
  ...L('country', 'A', [
    { id: 'cy-a6', name: 'A6 arpeggio', level: 1, kind: 'arpeggio', chord: 'A', tab: 'e 5:0 4:2 3:2 2:2 1:2 2:2 3:2 4:2' },
    { id: 'cy-hybrid', name: 'Hybrid-picked double stops', level: 2, kind: 'double-stop', chord: 'A', tab: 'e 4:7+2:7 r 3:6+1:5 r 4:7+2:7 3:6+1:5 q 4:7+2:7' },
  ]),
  ...L('folk', 'G', [
    { id: 'fo-d', name: 'D arpeggio', level: 1, kind: 'arpeggio', chord: 'D', tab: 'e 4:0 3:2 2:3 1:2 2:3 3:2 4:0 3:2' },
    { id: 'fo-em', name: 'Em arpeggio', level: 1, kind: 'arpeggio', chord: 'Em', tab: 'e 6:0 5:2 4:2 3:0 2:0 1:0 2:0 3:0' },
    { id: 'fo-travis-melody', name: 'Travis with a melody', level: 3, kind: 'arpeggio', chord: 'G', tab: 'e 6:3+1:3 3:0 4:0+1:2 2:0 6:3+1:0 3:0 4:0 2:0' },
  ]),
  ...L('mayer', 'E', [
    { id: 'jm-a', name: 'Over the IV chord', level: 1, kind: 'lick', chord: 'A', tab: 'e 2:10 1:9 2:10 1:9 q 2:10b e 2:10r 3:9' },
    { id: 'jm-eadd9', name: 'E add9 arpeggio', level: 3, kind: 'arpeggio', chord: 'E', tab: 's 6:0 4:2 3:4 2:0 1:0 2:0 3:4 4:2 6:0 4:2 3:4 2:0 1:2 2:0 3:4 4:2' },
  ]),
  // ───────────────────────── Melodic fingerstyle (Marco Cirillo style): open strings ringing, thumb on the bass
  ...L('fingerstyle', 'G', [
    { id: 'mc-sus-bloom', ref: 'A', name: 'Sus2 bloom', level: 1, kind: 'arpeggio', chord: 'A', tab: 'e 5:0 4:2 3:2 2:0 2:2h 3:2 4:2 3:2',
      must: { about: 'An Asus2 chord picked one string at a time, then the open B string hammered up to C#, so the chord "blooms" from sus2 into major in the middle of the arpeggio. It is the signature touch of melodic fingerstyle: the chord changes colour without a new strum.',
        steps: ['Hold an A chord shape but leave the B string open (that\'s Asus2: fingers on the 2nd fret of the D and G strings only).', 'Thumb plays the open A string, then index, middle and ring pick the D, G and open B strings.', 'Right after the open B rings, hammer your third finger onto its 2nd fret without picking: B becomes C#.', 'Finish the pattern back down: G string, D string, G string. Keep all the notes ringing.'],
        tip: 'Hammer firmly and right on the fret so the C# is as loud as the picked notes. Let the open strings ring the whole bar: no lifting fingers.', use: 'Over any A chord in a slow song; move it to D (Dsus2 to D on the top string) and E the same way.', goal: 80 } },
    { id: 'mc-cadd9-fall', name: 'Cadd9 falling arpeggio', level: 2, kind: 'arpeggio', chord: 'Cadd9', tab: 'e 5:3 4:2 1:3 2:3 3:0 2:3 1:0 2:3',
      must: { about: 'A Cadd9 shape with the top two strings fretted at the 3rd fret, picked so the notes fall from the top down: C and E in the bass, then G, D, open G, D and the open E. Three open-string notes ring under everything: that shimmering, piano-like sound is what makes these progressions feel peaceful.',
        steps: ['Fingers: 3rd fret of the A string (2nd finger), 2nd fret of the D string (1st finger), 3rd fret of the B and high E strings (3rd and 4th fingers). The G string stays open.', 'Thumb picks the A string then the D string.', 'Ring finger (a) picks the top string, middle (m) the B string, index (i) the open G: a falling roll.', 'Then the B string, and the open high E: lift your pinky off the top string just for that note, then put it back down for the last note.'],
        tip: 'Lifting the pinky to let the open E ring is the trick: it adds a 3rd to the chord and sounds like a little melody inside it.', use: 'The IV chord in G (G – Cadd9 – Em7 – D/F#). The same idea works with G and Em7 shapes, which share those top two strings.', goal: 76 } },
    { id: 'mc-bells', ref: 'E', minor: true, name: 'Harmonic bells', level: 2, kind: 'lick', chord: 'Em', tab: 'q 6:0+3:12n e 2:12n 1:12n q 4:7n e 3:7n 2:7n',
      must: { about: 'The low E rings while bell-like natural harmonics float over it: first the 12th-fret harmonics on the top three strings, then the 7th-fret ones. A favourite way to open or close a fingerstyle piece.',
        steps: ['Pluck the open low E with your thumb and, at the same time, the G-string harmonic at the 12th fret: touch the string lightly right above the fret wire, don\'t press it down.', 'Then the 12th-fret harmonics on the B and high E strings.', 'Move to the 7th fret: the D-string harmonic on beat 3, then G and B.', 'Lift each fretting finger just after the note sounds so the bell keeps ringing.'],
        tip: 'Pluck harmonics a little closer to the bridge than normal and lift the touching finger right away. They ring longest that way.', use: 'Intros, endings and the gap between sections, over E minor or E major.', goal: 70 } },
    { id: 'mc-walkdown', ref: 'C', name: 'Bass walk-down with melody', level: 2, kind: 'run', chord: 'C G/B Am Am/G', tab: 'q 5:3+1:0 e 3:0 2:1 q 5:2+1:3 e 3:0 2:3 | q 5:0+1:0 e 3:2 2:1 q 6:3+1:0 e 3:2 2:1',
      must: { about: 'The bass walks down C, B, A, G with the thumb while the fingers keep a little melody on top: the classical move behind countless pretty songs. Every beat 1 and 3 the thumb and the top string play together.',
        steps: ['Beat 1: thumb on the A string 3rd fret (C) with the open high E together (a pinch).', 'Then index on the open G and middle on the B string 1st fret (C).', 'Beat 3: thumb walks down to B (A string 2nd fret) with the top string 3rd fret (G) on top: a G/B chord.', 'Bar 2: open A with the open E, then G on the low E string 3rd fret, Am/G. The fingers keep the same pattern.'],
        tip: 'Make the bass notes legato: each one should ring until the next. That falling line is the "song" here; the top is the accompaniment.', use: 'Any time a song goes from C down to Am (the I – vi), or as an intro. It works the same down from G (G – D/F# – Em).', goal: 72 } },
    { id: 'mc-spanish-run', ref: 'A', minor: true, name: 'Spanish run to E', level: 3, kind: 'run', chord: 'E', tab: 's 1:1 1:0 2:3 2:1 2:0 3:2 3:1 4:3 4:2 3:1 2:0 1:0 q 6:0+3:1+2:0',
      must: { about: 'A fast run down the A harmonic minor scale (the one with G#) that turns around and lands on an E chord: the classic Spanish-flavoured cadence. The G# is what gives it that flamenco sound.',
        steps: ['Start on the 1st fret of the high E (F), then the open E, the B string 3rd, 1st and open (D, C, B).', 'G string 2nd and 1st fret (A, G#), then D string 3rd and 2nd (F, E).', 'Turn round and climb back: G string 1st fret (G#), open B, open high E.', 'Land on an E chord on beat 4: low E, G# and B together.'],
        tip: 'Use i-m (index, middle) alternating on every note and keep it slow until it is even: speed comes from evenness, not effort.', use: 'Just before an E (or E7) chord in a minor song, at the end of a phrase over Am – G – F – E.', goal: 90 } },
    { id: 'mc-pinch-melody', name: 'Pinch and melody', level: 1, kind: 'lick', chord: 'G', tab: 'q 6:3+1:3 e 2:3 3:0 q 4:0+1:2 e 2:3 3:0' },
    { id: 'mc-em-hammer', ref: 'E', minor: true, name: 'Em open hammer-on', level: 1, kind: 'arpeggio', chord: 'Em', tab: 'e 6:0 4:2 3:0 3:2h 2:0 3:2 1:0 2:0' },
    { id: 'mc-grace-slide', ref: 'D', name: 'Grace-note slide', level: 2, kind: 'lick', chord: 'D', tab: 'e 4:0 3:2 2:3/ 1:2 1:0 2:3 3:2 2:3' },
    { id: 'mc-dmaj7', ref: 'D', name: 'Dmaj7 float', level: 2, kind: 'arpeggio', chord: 'Dmaj7', tab: 'e 4:0 3:2 2:2 1:2 1:0 2:2 3:2 2:2' },
    { id: 'mc-bass-melody', name: 'Melody over a walking thumb', level: 3, kind: 'run', chord: 'G', tab: 'e 6:3+1:3 1:2 4:0+1:0 2:3 6:3+2:1 2:0 4:0+3:2 3:0' },
    { id: 'mc-ripple', ref: 'A', minor: true, name: 'Pull-off ripple in Am', level: 2, kind: 'lick', chord: 'Am', tab: 's 1:3 1:0p 2:1 1:0 2:3 2:1p 3:2 2:1 3:2 3:0p 4:2 3:0 q 5:0+4:2+3:2+2:1' },
    { id: 'mc-ending', name: 'Falling G ending', level: 1, kind: 'ending', chord: 'G', tab: 'e 1:3 2:3 3:0 4:0 5:2 6:3 q 6:3+5:2+4:0+3:0+2:3+1:3' },
  ]),
  // ───────────────────────── Modern bluegrass flatpicking (Billy Strings style): all original, G position, capo for other keys
  ...L('billy', 'G', [
    { id: 'bs-grun', name: 'The big G run', level: 1, kind: 'run', chord: 'G', tab: 'e 5:0 5:1 5:2 4:0 4:2 3:0 q 4:0 | e 5:2 5:0 q 6:3 h r',
      must: { about: 'The G run, played with the confidence modern flatpickers give it: open A, the blue B-flat, B, D, E, G, back to D, then down to the low G. Every bluegrass guitarist ends phrases with some version of this.',
        steps: ['Open A string, then 1st and 2nd fret of the A string (Bb, B): first and second fingers.', 'Open D, 2nd fret of the D string (E), open G.', 'Back to the open D for a beat.', 'Bar 2: 2nd fret of the A string (B), open A, then the low G (3rd fret, low E string) and let it ring.'],
        tip: 'Down-up alternate picking all the way, and hit the low G hard: the run is a punctuation mark.', use: 'The end of any phrase landing on G; capo up for other keys.', goal: 140 } },
    { id: 'bs-bluenote', name: 'Blue-note climb and fall', level: 1, kind: 'run', chord: 'G', tab: 'e 5:1 5:2h 4:0 4:2 3:0 3:2 2:0 2:3 | e 2:0 3:2 3:0 4:2 q 4:0 6:3',
      must: { about: 'The flat 3rd hammered to the major 3rd (Bb to B) starts a climb up the G major scale to the high D, then it tumbles back down to the root. That bluesy hammer-on is the sound of modern bluegrass.',
        steps: ['Pick the 1st fret of the A string (Bb) and hammer the 2nd finger onto the 2nd fret (B).', 'Climb: open D, D string 2nd fret, open G, G string 2nd fret, open B, B string 3rd fret (D).', 'Come back down the same notes: open B, G string 2nd, open G, D string 2nd.', 'Finish on the open D and the low G.'],
        tip: 'Pick only the first note of the hammer-on; the hammered note should be as loud as the picked one.', use: 'Over G, especially at the start of a break.', goal: 130 } },
    { id: 'bs-cross-g', name: 'Crosspicking roll on G', level: 2, kind: 'arpeggio', chord: 'G', tab: 'e 4:0 3:0 2:0 4:0 3:0 2:0 4:0 3:0 | e 4:0 3:0 2:3 4:0 3:0 2:3 4:0 3:0',
      must: { about: 'Crosspicking: three strings in a repeating pattern of three against the beat of four, so the accent keeps moving. It sounds like a banjo roll on guitar, the shimmering texture under slow bluegrass melodies.',
        steps: ['Hold a G chord. Pick D, G, B strings, then D, G, B again, then D, G: eight notes in a bar.', 'Bar 2: the same, but fret the B string at the 3rd fret (D) for a G with the 5th on top.', 'Pick down, down, up on each group of three, or strictly alternate: try both and keep the one that stays even.', 'Let every note ring into the next.'],
        tip: 'Feel the groups of three while your foot taps in four: that friction is the whole point.', use: 'Behind a singer, or slow parts of a tune over G; the same pattern works on C and D shapes.', goal: 120 } },
    { id: 'bs-cross-c', name: 'Crosspicking C to D', level: 2, kind: 'arpeggio', chord: 'C | D', tab: 'e 5:3 3:0 2:1 5:3 3:0 2:1 5:3 3:0 | e 4:0 3:2 2:3 4:0 3:2 2:3 4:0 3:2' },
    { id: 'bs-chrom-walk', name: 'Chromatic walk-down', level: 3, kind: 'run', chord: 'G', tab: 'e 1:3 1:2 1:1 1:0 2:3 2:2 2:1 2:0 | e 3:2 3:1 3:0 4:4 4:3 4:2 q 3:0',
      must: { about: 'A long chromatic slide down from the high G, every fret in turn, mixing open strings in: the kind of fast, slippery line that makes modern bluegrass sound jazzy and wild.',
        steps: ['High E string: 3, 2, 1, open.', 'B string: 3, 2, 1, open.', 'G string: 2, 1, open; D string: 4, 3, 2.', 'Land on the open G string on beat 4.'],
        tip: 'Use one finger per fret and keep your hand still: the line is fast because nothing moves except the fingertips.', use: 'Leading back to G at the end of a break; start slow with the speed trainer.', goal: 150 } },
    { id: 'bs-triplet-pull', name: 'Pull-off triplets', level: 2, kind: 'lick', chord: 'G', tab: 't 2:3 2:0p 3:2 2:3 2:0p 3:2 2:3 2:0p 3:2 2:3 2:0p 3:2' },
    { id: 'bs-double-stops', name: 'Fiddle double stops', level: 2, kind: 'double-stop', chord: 'G | C', tab: 'e 3:0+2:0 3:2+2:3 3:4+2:3 3:2+2:3 q 3:0+2:0 3:2+2:3 | h 3:4+2:5 3:0+2:1' },
    { id: 'bs-d-run', name: 'Run over the D chord', level: 2, kind: 'run', chord: 'D', tab: 'e 4:0 4:2 4:4 3:0 3:2 2:0 2:3 1:2 | q 2:3 e 2:0 3:2 h 4:0' },
    { id: 'bs-minor-mode', ref: 'A', minor: true, name: 'Dark A minor line', level: 2, kind: 'lick', chord: 'Am', tab: 'e 5:0 5:3 4:0 4:2 4:3 3:0 3:2 2:1 | e 2:0 3:2 3:0 4:3 4:2 4:0 q 5:0' },
    { id: 'bs-banjo-roll', name: 'Banjo roll on guitar', level: 3, kind: 'arpeggio', chord: 'G | C', tab: 'e 3:0 2:0 1:3 3:0 2:0 1:3 3:0 2:0 | e 3:0 2:1 1:0 3:0 2:1 1:0 3:2 2:1' },
    { id: 'bs-fast-scale', name: 'Sixteenth-note scale burst', level: 3, kind: 'run', chord: 'G', tab: 's 6:3 5:0 5:2 5:3 4:0 4:2 4:4 3:0 3:2 2:0 2:1 2:3 1:0 1:2 1:3 1:2 | q 1:0 2:3 h 3:0' },
    { id: 'bs-slide-third', name: 'Slide into the 3rd', level: 1, kind: 'lick', chord: 'G', tab: 'e 3:2 3:4/ 2:3 3:4 3:2 3:0 4:2 4:0 | q 5:2 6:3 h r' },
    { id: 'bs-tag', name: 'Tag ending', level: 1, kind: 'ending', chord: 'D | G', tab: 'e 2:3 2:0 3:2 3:0 4:2 4:0 q 5:2 | q 6:3 r 4:0+3:0 r' },
    { id: 'bs-jam-climb', name: 'Jam climb up the neck', level: 3, kind: 'run', chord: 'G', tab: 'e 3:5 3:7 3:9 2:8 2:10 1:9 1:10 1:12 | e 1:10 1:9 2:10 2:8 3:9 3:7 q 3:5~' },
    { id: 'bs-kickoff', name: 'Kickoff into a tune', level: 1, kind: 'lick', chord: 'G', tab: 'q 4:0 e 5:2 5:3 4:0 4:2 q 3:0 | e 2:0 3:2 3:0 4:2 4:0 5:2 q 6:3' },
    { id: 'bs-lonesome-bend', name: 'Lonesome bend', level: 2, kind: 'lick', chord: 'G', tab: 'e 3:0 3:3bq 3:0 4:2 q 4:0 e 5:1 5:2h | h 6:3 3:0+4:0+5:2' },
    { id: 'bs-cross-am', ref: 'A', minor: true, name: 'Crosspicking in A minor', level: 2, kind: 'arpeggio', chord: 'Am', tab: 'e 5:0 3:2 2:1 5:0 3:2 2:1 5:0 3:2 | e 4:2 3:2 2:1 4:2 3:2 2:1 4:2 3:2' },
    { id: 'bs-turnaround', name: 'D to G turnaround', level: 2, kind: 'turnaround', chord: 'D | G', tab: 'e 4:0 4:2 4:4 3:0 q 4:4 4:0 | e 5:2 5:0 6:2 6:3 h r' },
    { id: 'bs-clarence', name: 'Double-stop pull (Clarence White style)', level: 2, kind: 'double-stop', chord: 'G', tab: 'e 2:3+1:3 2:1+1:3 2:0+1:3 r q 2:0+1:0 3:0+2:0 | h 4:0+3:0+2:0 r' },
    { id: 'bs-em-arp', ref: 'E', minor: true, name: 'E minor sweep up and down', level: 1, kind: 'arpeggio', chord: 'Em', tab: 'e 6:0 5:2 4:2 3:0 2:0 1:0 2:0 3:0 | e 4:2 5:2 6:0 6:3 q 5:2 6:0' },
  ]),
  // ───────────────────────── more licks for the styles that had only a few
  ...L('neosoul', 'E', [
    { id: 'ns-sixths', name: 'Sliding sixths', level: 2, kind: 'double-stop', chord: 'E', tab: 'e 3:9+1:9 3:11+1:12 3:9+1:9 r q 3:7+1:7 3:9+1:9 | h 3:9+1:9~ h r' },
    { id: 'ns-hammer-chord', name: 'Chord with a hammer flourish', level: 2, kind: 'lick', chord: 'E', tab: 'e 4:9+3:9 4:9+3:9 3:11h r 2:9 2:12 2:9 3:11 | h 3:9~ q 4:9 r' },
    { id: 'ns-slide-arp', name: 'Slide into an arpeggio', level: 1, kind: 'arpeggio', chord: 'E', tab: 'e 4:7/ 4:9 3:9 2:9 1:7 2:9 3:9 4:9 | q 4:7~ e 3:9 2:9 h 1:7' },
    { id: 'ns-flutter', name: 'Pentatonic flutter', level: 3, kind: 'run', chord: 'E', tab: 's 1:7 1:9 2:9 1:9 1:7 2:9 2:7 3:9 3:7 3:9 2:7 3:9 4:9 3:7 4:9 4:7 | h 5:7~ h r' },
  ]),
  ...L('country', 'A', [
    { id: 'cy-chicken', name: 'Chicken-pickin\' snaps', level: 2, kind: 'lick', chord: 'A', tab: 'e 3:2 3:2m 2:2 3:2 4:2 4:2m 3:2 2:2 | q 2:5 e 2:2 3:2 h 4:2' },
    { id: 'cy-steel-bend', name: 'Pedal-steel bend', level: 2, kind: 'double-stop', chord: 'A', tab: 'q 3:4b+2:5 e 3:4r 2:5 q 1:5 e 2:5 3:2 | h 3:2+2:2 h r' },
    { id: 'cy-walk-a', name: 'Walk-up in A', level: 1, kind: 'run', chord: 'A', tab: 'e 5:0 5:2 5:4 4:0 4:2 4:4 3:1 3:2 | q 2:2 2:0 h 3:2' },
    { id: 'cy-acoustic-fill', name: 'Acoustic hammer-on fill', level: 1, kind: 'lick', chord: 'D', tab: 'e 4:0 3:2 2:3 1:0 1:2h 2:3 3:2 4:0 | h 4:0+3:2+2:3+1:2 h r' },
  ]),
  ...L('funk', 'E', [
    { id: 'fk-chop16', name: 'Sixteenth chop', level: 2, kind: 'riff', chord: 'E9', tab: 's 3:9+2:9 3:x+2:x r 3:9+2:9 r 3:x+2:x 3:9+2:9 r 3:9+2:9 3:x+2:x r 3:9+2:9 r 3:x+2:x 3:9+2:9 r' },
    { id: 'fk-pop-line', name: 'Funk-pop single-note line', level: 2, kind: 'riff', chord: 'E', tab: 'e 5:7 r 5:7 4:9 r 4:7 5:9 5:7 | e 6:7 r 6:9 6:10 q 5:7 r' },
  ]),
  ...L('progmetal', 'E', [
    { id: 'pg-legato-sweep', name: 'Lush legato cascade', level: 3, kind: 'run', chord: 'E', tab: 's 2:12 2:14h 2:16h 1:12 1:14h 1:16h 1:14p 1:12p 2:16 2:14p 2:12p 3:14 3:13p 3:11p 4:14 4:12p | h 4:12~ h r' },
    { id: 'pg-gallop', name: 'Chug gallop', level: 2, kind: 'riff', chord: 'E5', tab: 'e 6:0m s 6:0m 6:0m e 6:0m s 6:0m 6:0m e 6:3 6:0m 6:5 6:0m | e 6:0m s 6:0m 6:0m e 6:0m 6:6 q 6:5 6:3' },
    { id: 'pg-tap-arp', name: 'Tapped arpeggio', level: 3, kind: 'arpeggio', chord: 'E', tab: 'x 1:12 1:19t 1:15 1:12 1:19t 1:15 1:12 1:19t 1:15 1:12 1:19t 1:15 1:12 1:17t 1:14 1:12 1:17t 1:14 1:12 1:17t 1:14 1:12 1:17t 1:14 | h 1:12~ h r' },
  ]),
  ...L('mathrock', 'E', [
    { id: 'mr-taps3', name: 'Tapped threes', level: 3, kind: 'lick', chord: 'E', tab: 'e 2:7 2:12t 2:9 1:7 1:12t 1:9 2:7 2:12t | e 2:9 1:7 1:12t 1:9 q 1:7 1:5' },
    { id: 'mr-open-arp', name: 'Open-string arpeggio climb', level: 2, kind: 'arpeggio', chord: 'E', tab: 'e 4:9 3:0 2:9 1:0 4:7 3:0 2:7 1:0 | e 4:4 3:0 2:5 1:0 q 2:5+1:0 4:4+3:0' },
  ]),
  ...L('jawaiian', 'G', [
    { id: 'jw-skank-fill', name: 'Skank with a fill', level: 2, kind: 'riff', chord: 'G', tab: 'e r 3:4+2:3+1:3 r 3:4+2:3+1:3 r 3:5+2:5+1:5 r 3:4+2:3+1:3 | e 4:5 4:7 3:4 3:5 q 3:7 3:4' },
    { id: 'jw-dub-melody', name: 'Dub melody', level: 1, kind: 'lick', chord: 'G', tab: 'q 2:8 e 2:10 1:8 q 2:10~ e 2:8 3:7 | h 3:9~ q 3:7 r' },
    { id: 'jw-rock-run', name: 'Reggae-rock run', level: 2, kind: 'run', chord: 'G', tab: 'e 4:5 4:7 3:4 3:5 3:7 2:5 2:8 1:5 | q 1:7 2:8 h 1:3' },
  ]),
  // ───────────────────────── Acoustic singer-songwriter (Dylan Gossett style): open chords ringing, hammer-on fills, walking bass
  ...L('acoustic', 'G', [
    { id: 'ac-g-hammer', name: 'G hammer-on fill', level: 1, kind: 'lick', chord: 'G', tab: 'e 6:3 4:0 4:0 4:2h 3:0 2:0 1:3 2:0 | h 6:3+5:2+4:0+3:0+2:3+1:3 h r' },
    { id: 'ac-walk-g-em', name: 'Walk from G to Em', level: 1, kind: 'run', chord: 'G | Em', tab: 'q 6:3+2:3+1:3 e 4:0 3:0 q 6:2+2:3+1:3 e 4:0 3:0 | q 6:0+2:3+1:3 e 4:2 3:0 h 6:0+5:2+4:2+3:0+2:3+1:3' },
    { id: 'ac-cadd9-dsus', name: 'Cadd9 to Dsus4 ring', level: 1, kind: 'arpeggio', chord: 'Cadd9 | Dsus4', tab: 'e 5:3 4:2 3:0 2:3 1:3 2:3 3:0 4:2 | e 4:0 3:2 2:3 1:3 1:2 2:3 3:2 4:0' },
    { id: 'ac-d-flutter', name: 'D chord flutter', level: 2, kind: 'lick', chord: 'D', tab: 'e 4:0 3:2 2:3 1:2 1:3h 1:2p 1:0p 2:3 | q 4:0+3:2+2:3+1:2 e 1:3 1:2 h 1:0' },
    { id: 'ac-em7-ring', name: 'Em7 open ring', level: 1, kind: 'arpeggio', chord: 'Em7', tab: 'e 6:0 5:2 4:2 3:0 2:3 1:3 2:3 3:0 | e 6:0 4:2 3:0 2:3 h 6:0+5:2+4:2+3:0+2:3+1:3' },
    { id: 'ac-bass-to-c', name: 'Bass run into C', level: 1, kind: 'run', chord: 'G | C', tab: 'q 6:3+1:3 6:3+1:3 e 6:3 5:0 5:2 r | h 5:3+4:2+3:0+2:1+1:0 h r' },
    { id: 'ac-strum-hammer', name: 'Strum with a hammer-on (D)', level: 2, kind: 'riff', chord: 'D', tab: 'e 4:0+3:2+2:3+1:2 r 4:0+3:2+2:3+1:2 4:0+3:2+2:3+1:0 1:2h 4:0+3:2+2:3+1:2 r 4:0+3:2+2:3+1:2 | h 4:0+3:2+2:3+1:2 h r' },
    { id: 'ac-travis-g', name: 'Travis G with a melody', level: 2, kind: 'arpeggio', chord: 'G', tab: 'e 6:3+1:3 3:0 4:0 2:0 6:3 3:0 4:0+1:2 2:0 | e 6:3+1:0 3:0 4:0 2:0 h 6:3+2:0+1:3' },
    { id: 'ac-am-pick', name: 'Am picking with a pull-off', level: 2, kind: 'arpeggio', chord: 'Am', tab: 'e 5:0 3:2 2:1 1:0 2:1 3:2 2:3 2:1p | e 5:0 3:2 2:1 1:0 h 5:0+4:2+3:2+2:1' },
    { id: 'ac-g-dfs', name: 'G to D/F# walk-down', level: 2, kind: 'run', chord: 'G D/F# Em', tab: 'q 6:3+3:0+2:0 e 4:0 3:0 q 6:2+3:2+2:3 e 4:0 3:2 | h 6:0+4:2+3:0+2:0 q 5:2 6:3' },
    { id: 'ac-top-hook', name: 'Hook on the top strings', level: 1, kind: 'lick', chord: 'G', tab: 'e 1:3 2:3 1:3 2:3 1:5 2:3 1:3 2:0 | q 1:3 2:3 h 3:0' },
    { id: 'ac-c-hammer-pull', name: 'C chord hammer and pull', level: 2, kind: 'lick', chord: 'C', tab: 'e 5:3 4:2 3:0 2:1 2:3h 2:1p 3:0 4:2 | e 5:3 4:0 4:2h 3:0 h 5:3+4:2+3:0+2:1+1:0' },
    { id: 'ac-ending', name: 'Singer-songwriter ending', level: 1, kind: 'ending', chord: 'G', tab: 'e 2:3 3:0 4:0 5:2 6:3 5:2 4:0 3:0 | w 6:3+5:2+4:0+3:0+2:3+1:3' },
    { id: 'ac-thumb-slap', name: 'Thumb and slap groove', level: 3, kind: 'riff', chord: 'G | Em', tab: 'e 6:3 4:x+3:x 4:0 3:0 6:3 4:x+3:x 4:0 3:0 | e 6:0 4:x+3:x 4:2 3:0 h 6:3+4:0+3:0' },
    { id: 'ac-four-chord', name: 'The four-chord pick (Em C G D)', level: 2, kind: 'arpeggio', chord: 'Em C | G D', tab: 'e 6:0 4:2 3:0 4:2 5:3 4:2 3:0 4:2 | e 6:3 4:0 3:0 4:0 4:0 3:2 2:3 3:2' },
  ]),
  // ───────────────────────── Reggae rock and dub (Sublime, Stick Figure, The Movement style)
  ...L('reggaerock', 'G', [
    { id: 'rr-skank', name: 'Off-beat skank', level: 1, kind: 'riff', chord: 'G | C', tab: 'e r 4:5+3:4+2:3 r 4:5+3:4+2:3 r 4:5+3:4+2:3 r 4:5+3:4+2:3 | e r 4:5+3:5+2:5 r 4:5+3:5+2:5 r 4:7+3:7+2:8 r 4:7+3:7+2:8' },
    { id: 'rr-dub-line', name: 'Dub line on the low strings', level: 1, kind: 'riff', chord: 'G', tab: 'e 6:3 r 6:3 6:5 q 5:2 e 5:5 5:2 | e 6:5 r 6:3 r h 6:3' },
    { id: 'rr-beach-pent', name: 'Beach major pentatonic', level: 1, kind: 'lick', chord: 'G', tab: 'e 3:4 3:7 2:5 2:8 1:5 1:7 1:5 2:8 | q 2:5 3:7 h 3:4~' },
    { id: 'rr-octave-hook', name: 'Octave hook', level: 2, kind: 'double-stop', chord: 'G', tab: 'q 4:5+2:8 e 4:7+2:10 4:5+2:8 q 5:5+3:7 r | h 4:5+2:8 h r' },
    { id: 'rr-punk-run', name: 'Punk-reggae run', level: 2, kind: 'run', chord: 'G', tab: 'e 5:5 5:7 4:5 4:7 3:4 3:7 2:5 2:8 | e 2:5 3:7 3:4 4:7 q 4:5 5:5' },
    { id: 'rr-thirds', name: 'Sweet thirds', level: 2, kind: 'double-stop', chord: 'G', tab: 'e 2:8+1:7 2:10+1:8 2:12+1:10 2:10+1:8 q 2:8+1:7 r | e 3:7+2:8 3:9+2:10 q 3:7+2:8 h r' },
    { id: 'rr-bubble', name: 'Organ bubble on guitar', level: 2, kind: 'riff', chord: 'G | C', tab: 'e r 3:7+2:8 3:7+2:8 r r 3:7+2:8 3:7+2:8 r | e r 3:9+2:10 3:9+2:10 r r 3:7+2:8 3:7+2:8 r' },
    { id: 'rr-slide-fill', name: 'Slide fill', level: 1, kind: 'lick', chord: 'G', tab: 'e 3:2/ 3:4 2:3 3:4 q 2:5/ e 2:3 3:4 | h 3:4~ h r' },
    { id: 'rr-minor-dub', ref: 'E', minor: true, name: 'Minor dub phrase', level: 2, kind: 'lick', chord: 'Em', tab: 'q 2:5 e 2:8 1:7 q 2:8~ e 2:5 3:7 | e 3:5 3:7 2:5 3:7 h 4:7~' },
    { id: 'rr-ending', name: 'Reggae rock ending', level: 1, kind: 'ending', chord: 'G', tab: 'e 1:3 2:3 3:4 4:5 q 5:5 6:3 | h 6:3+5:5+4:5+3:4 h r' },
  ]),
  // ───────────────────────── Pop and soul (Bruno Mars, James Arthur style)
  ...L('popsoul', 'C', [
    { id: 'ps-funk-chop', name: 'Funk-pop chop', level: 2, kind: 'riff', chord: 'C', tab: 's 3:5+2:5+1:5 3:x+2:x+1:x r 3:5+2:5+1:5 r r 3:5+2:5+1:5 3:x+2:x+1:x 3:5+2:5+1:5 r 3:x+2:x+1:x 3:5+2:5+1:5 r r 3:5+2:5+1:5 r' },
    { id: 'ps-single-hook', name: 'Single-note funk hook', level: 2, kind: 'riff', chord: 'C', tab: 'e 5:3 r 5:3 4:5 r 4:2 5:5 5:3 | e 6:3 r 6:5 6:6 q 5:3 r' },
    { id: 'ps-ballad-arp', name: 'Ballad arpeggio', level: 1, kind: 'arpeggio', chord: 'C | G', tab: 'e 5:3 4:2 3:0 2:1 1:0 2:1 3:0 4:2 | e 6:3 5:2 4:0 3:0 h 6:3+5:2+4:0+3:0+2:0+1:3' },
    { id: 'ps-soul-sixths', name: 'Soul sixths', level: 2, kind: 'double-stop', chord: 'C', tab: 'e 3:5+1:5 3:7+1:8 3:5+1:5 r q 3:4+1:3 3:5+1:5 | h 3:5+1:5~ h r' },
    { id: 'ps-hammer-riff', name: 'Hammer-on chord riff', level: 1, kind: 'riff', chord: 'C', tab: 'e 4:2+3:0 4:2+3:0 4:2+3:2h r 4:2+3:0 4:2+3:2h 4:2+3:0 r | h 5:3+4:2+3:0+2:1 h r' },
    { id: 'ps-ninth-slide', name: 'Ninth chord slide', level: 2, kind: 'riff', chord: 'C9', tab: 'e 4:4+3:3+2:3 4:5/+3:5+2:5 r 4:5+3:5+2:5 r 4:5+3:5+2:5 4:4+3:3+2:3 r | h 4:5+3:5+2:5 h r' },
    { id: 'ps-pent-run', name: 'Pop pentatonic run', level: 2, kind: 'run', chord: 'Am', tab: 'e 1:8 1:5 2:8 2:5 3:7 3:5 4:7 4:5 | q 5:7 e 4:5 4:7 h 3:5~' },
    { id: 'ps-octave-groove', name: 'Octave groove', level: 2, kind: 'riff', chord: 'C', tab: 'e 5:3+3:5 r 5:3+3:5 5:5+3:7 r 5:3+3:5 r 5:1+3:3 | e 5:3+3:5 r q 5:3+3:5 h r' },
    { id: 'ps-ballad-walk', name: 'Ballad bass walk-down', level: 1, kind: 'run', chord: 'C G/B Am F', tab: 'q 5:3+2:1 5:2+2:1 5:0+2:1 6:1+2:1 | h 6:1+3:2+2:1+1:1 h r' },
    { id: 'ps-ending', name: 'Soul ending', level: 1, kind: 'ending', chord: 'C', tab: 'e 2:5 2:8 1:5 1:8 q 1:7~ e 1:5 2:8 | h 3:7+2:8+1:7 h r' },
  ]),
  // ───────────────────────── Melodic prog (Plini style): clean, lush, legato and tapped lines over major 7 and add9 colours
  ...L('progclean', 'E', [
    { id: 'pc-lydian-arp', name: 'Lydian arpeggio', level: 2, kind: 'arpeggio', chord: 'Emaj7#11', tab: 'e 5:7 4:6 3:8 2:7 1:7 2:7 3:8 4:6 | e 5:7 4:9 3:8 2:9 h 1:7~' },
    { id: 'pc-legato', name: 'Legato melody', level: 3, kind: 'lick', chord: 'E', tab: 's 2:9 2:11h 2:12h 2:11p 2:9p 3:11 3:9p 3:8p 2:9 2:11h 2:12h 1:9 1:11h 1:12h 1:11p 1:9p | h 2:12~ h r' },
    { id: 'pc-sweep', name: 'Major 7 sweep', level: 3, kind: 'arpeggio', chord: 'Emaj7', tab: 'x 5:7 4:6 3:8 2:7 1:7 1:11 1:7 2:7 3:8 4:6 5:7 4:6 3:8 2:7 1:7 1:11 1:7 2:7 3:8 4:6 5:7 4:6 3:8 2:7 | h 1:7~ h r' },
    { id: 'pc-harmonics', name: 'Harmonic chime', level: 1, kind: 'lick', chord: 'E', tab: 'q 3:12n+2:12n e 1:12n 2:12n q 4:7n+3:7n e 2:7n 1:7n | h 3:12n+2:12n+1:12n h r' },
    { id: 'pc-tap', name: 'Tapped melody', level: 3, kind: 'lick', chord: 'E', tab: 'e 2:9 2:16t 2:12 2:9 2:17t 2:12 2:9 2:16t | e 2:12 2:9 2:14t 2:9 h 2:12~' },
    { id: 'pc-hybrid', name: 'Hybrid-picked arpeggio', level: 2, kind: 'arpeggio', chord: 'Emaj7 | F#m7', tab: 's 5:7 3:8 2:7 1:7 5:7 3:8 2:7 1:7 5:9 3:9 2:9 1:9 5:9 3:9 2:9 1:9 | h 5:7+3:8+2:7+1:7 h r' },
    { id: 'pc-add9', name: 'Add9 with open strings', level: 2, kind: 'arpeggio', chord: 'Eadd9', tab: 'e 6:0 4:9 3:8 2:0 1:0 2:0 3:8 4:9 | e 6:0 4:11 3:9 2:0 h 1:0~' },
    { id: 'pc-sixths', name: 'Gliding sixths', level: 2, kind: 'double-stop', chord: 'E', tab: 'e 3:6+1:7 3:8/+1:9 3:9+1:11 r q 3:8+1:9 3:6+1:7 | h 3:4+1:5~ h r' },
    { id: 'pc-climb', name: 'Sixteenth climb', level: 3, kind: 'run', chord: 'E', tab: 's 4:6 4:7 4:9 3:6 3:8 3:9 2:7 2:9 2:10 1:7 1:9 1:11 1:12 1:11 1:9 1:7 | q 2:9 2:7 h 3:8~' },
    { id: 'pc-resolve', name: 'Floating resolution', level: 1, kind: 'ending', chord: 'Emaj7', tab: 'q 2:9+1:11 2:7+1:9 h 2:9+1:7~ | w 5:7+4:6+3:8+2:7+1:7' },
  ]),
]

export const lickById = (id: string) => LICKS.find(l => l.id === id)

// ── every style gets 10–25 must-know licks: the hand-written breakdowns first, then a breakdown made from the tab
import { parseLick } from './notation'
const TECH: [string, string][] = [['b1½', 'big bend'], ['b½', 'half-step bend'], ['b¼', 'quarter bend'], ['pb', 'pre-bend'], ['b', 'whole-step bend'], ['h', 'hammer-on'], ['p', 'pull-off'], ['/', 'slide'], ['\\', 'slide down'], ['r', 'release'], ['~', 'vibrato'], ['PM', 'palm mute'], ['harm', 'harmonic'], ['T', 'tap'], ['x', 'dead note']]
const STRING = ['', 'high E', 'B', 'G', 'D', 'A', 'low E']
const WHY: Record<string, string> = {
  lick: 'a short phrase', run: 'a run that moves through the scale', arpeggio: 'the chord picked one note at a time', riff: 'a rhythm riff',
  ending: 'an ending', 'double-stop': 'two notes played together', turnaround: 'a turnaround back to the top',
}
const STYLE_WORD: Record<string, string> = { billy: 'modern bluegrass flatpicking', acoustic: 'acoustic singer-songwriter', reggaerock: 'reggae rock', popsoul: 'pop and soul', progclean: 'melodic prog', altrock: 'alt rock', progmetal: 'prog metal', mathrock: 'math rock', mayer: 'blues-pop', neosoul: 'neo-soul', jawaiian: 'island reggae', fingerstyle: 'melodic fingerstyle' }
function autoBreakdown(l: LickDef): Breakdown {
  const st = l.style
  const { events, bars } = parseLick(l.tab)
  const notes = events.flatMap(e => e.notes)
  const fretted = notes.filter(n => n.fret > 0 && n.tech !== 'x').map(n => n.fret)
  const lo = fretted.length ? Math.min(...fretted) : 0, hi = fretted.length ? Math.max(...fretted) : 0
  const strings = [...new Set(notes.map(n => 6 - n.string))].sort((a, b) => b - a)
  const techs = [...new Set(notes.flatMap(n => { const out: string[] = []; let r = n.tech ?? ''; while (r) { const hit = TECH.find(([k]) => r.startsWith(k)); if (!hit) break; out.push(hit[1]); r = r.slice(hit[0].length) } return out }))]
  const opens = notes.some(n => n.fret === 0 && n.tech !== 'x')
  const pos = !fretted.length ? 'open strings' : lo <= 3 || (opens && hi <= 5) ? 'first position (open strings and the first few frets)' : `around the ${lo}${['st', 'nd', 'rd'][lo - 1] ?? 'th'} fret (first finger on fret ${lo})`
  const steps = [
    `Put your hand in ${pos}.${hi - lo > 4 && fretted.length ? ` It moves up to fret ${hi} on the way: slide your whole hand, don't stretch.` : ''}`,
    `It uses the ${strings.map(s => STRING[s]).join(', ')} string${strings.length > 1 ? 's' : ''}: play it slowly once and say the fret numbers out loud.`,
    ...(techs.length ? [`Techniques: ${techs.join(', ')}. Only pick the first note of a hammer-on, pull-off or slide.`] : []),
    `Tap your foot and count it: ${bars.length + (events.length ? 1 : 0) > 1 ? `${bars.length + 1} bars` : 'one bar'} of 4 beats. Use the slow speed first, then Play along.`,
  ]
  return {
    about: `${l.name}: ${WHY[l.kind] ?? 'a phrase'} in the ${STYLE_WORD[st] ?? st} style, over ${l.chord ?? 'the I chord'}.`,
    steps,
    tip: techs.some(t => t.includes('bend')) ? 'Check your bends against the fretted note they should reach. In-tune bends make the lick.' : 'Even notes beat fast notes: play it clean 3 times in a row before adding 5 BPM.',
    use: `Over ${l.chord ?? 'the chord shown'}; it moves to any key with the Key buttons${opens ? ' (with a capo for open-string licks)' : ''}.`,
    goal: l.bpm ?? 100,
  }
}
for (const id of [...new Set(LICKS.map(l => l.style))]) {
  const own = LICKS.filter(l => l.style === id).sort((a, b) => Number(!!b.must) - Number(!!a.must) || a.level - b.level)
  own.slice(0, 25).forEach(l => { if (!l.must) l.must = autoBreakdown(l) })
}
export const mustKnow = () => LICKS.filter(l => l.must)
