// Technique lessons: the physical skills, each with short how-to steps (written for KGuitar), a video lesson from a
// guitar teacher's site to watch, and a drill to play along with in Play (the mic follows you) or a tool.
import type { Song, SongBar, SongNote } from '../tabs/model'

export interface Technique {
  id: string
  title: string
  why: string
  steps: string[]
  video: { site: string; title: string; url: string }
  /** what to practise: a drill tab, a songbook part, or a Learn tool */
  drill: { label: string } & ({ tab: string } | { songbook: { song: string; part: string } } | { tool: 'changes' | 'bends' } | { exercise: 'spider' } | { exName: string })
}

export const TECHNIQUES: Technique[] = [
  {
    id: 'pick', title: 'Holding the pick', why: 'A relaxed, steady grip makes everything else easier.',
    steps: [
      'Rest the pick on the side of your index finger, near the tip, pointing away from you.',
      'Put your thumb flat on top, so only a few millimetres of pick stick out.',
      'Keep the other fingers loose. Grip just firmly enough that the pick doesn\'t turn.',
      'Pick from the wrist, not the elbow, with small movements close to the strings.',
    ],
    video: { site: 'JustinGuitar', title: 'Before You Begin: Guitar Basics', url: 'https://justinguitar.com/modules/before-you-begin-guitar-basics' },
    drill: { label: 'Open strings, four down-picks each', tab: 'openstrings' },
  },
  {
    id: 'fret', title: 'Fretting notes cleanly', why: 'Buzz-free notes come from where and how you press, not how hard.',
    steps: [
      'Press with the very tip of the finger, just behind the fret wire (not on top of it, not in the middle).',
      'Keep your thumb behind the neck, roughly behind your middle finger.',
      'Press only as hard as you need: find the point where the buzz stops, then add a little.',
      'One finger per fret: index on the first fret of the position, then middle, ring and little finger.',
    ],
    video: { site: 'JustinGuitar', title: 'Technique: Fretting Hand', url: 'https://justinguitar.com/modules/technique-fretting-hand' },
    drill: { label: 'The spider warm-up', exercise: 'spider' },
  },
  {
    id: 'chords', title: 'Your first chords', why: 'A few open chords play hundreds of songs.',
    steps: [
      'Start with D, A and E: look at the shape, place the fingers one at a time, then strum.',
      'Pick each string of the chord one by one. Fix any that buzz or are muted.',
      'Lift all the fingers together and put them back as one shape. That is what makes changes quick.',
      'Practise the change between two chords for a minute at a time and count how many you get.',
    ],
    video: { site: 'JustinGuitar', title: 'How to Play the D Chord', url: 'https://justinguitar.com/guitar-lessons/how-to-play-the-d-chord-b1-105' },
    drill: { label: 'One-minute chord changes', tool: 'changes' },
  },
  {
    id: 'strum', title: 'Strumming in time', why: 'Steady strumming makes simple chords sound like a song.',
    steps: [
      'Keep your strumming hand moving down and up all the time, like a pendulum, even when you don\'t hit the strings.',
      'Downstrokes on the beats (1 2 3 4), upstrokes on the "and"s.',
      'Start with four downstrokes a bar, then add upstrokes once the changes are smooth.',
      'Count out loud. Turn on the strum arrows in Play and play In time with the band.',
    ],
    video: { site: 'JustinGuitar', title: 'Exploring Strumming', url: 'https://justinguitar.com/guitar-lessons/exploring-strumming-b1-503' },
    drill: { label: 'Strum along: Boil Them Cabbage Down', songbook: { song: 'cabbage', part: 'words' } },
  },
  {
    id: 'alternate', title: 'Alternate picking', why: 'Down-up-down-up is how you play fast melodies and fiddle tunes evenly.',
    steps: [
      'Pick down on the beat and up on the "and", every time, even when the string changes.',
      'Keep the pick movements tiny: just past the string and back.',
      'Use a metronome or In time at a slow speed. Speed comes from playing it even, not from rushing.',
      'Listen for down and up notes being the same volume.',
    ],
    video: { site: 'JustinGuitar', title: '6/8 Time, Fast Changes & Alternate Picking', url: 'https://justinguitar.com/modules/6-8-time-fast-changes-alternate-picking' },
    drill: { label: 'Down-up eighths across the strings', tab: 'alternate' },
  },
  {
    id: 'mute', title: 'Muting strings', why: 'Clean playing is as much about the strings you stop as the ones you play.',
    steps: [
      'Fretting hand: relax the finger so it still touches the string but doesn\'t press it to the fret. The note stops.',
      'Let spare fingers lightly touch strings you don\'t want to ring.',
      'Reggae chops: strum the chord, then relax the fretting hand right away so it sounds short and crisp.',
      'Picking hand: the side of the palm can stop strings too (see palm muting).',
    ],
    video: { site: 'JustinGuitar', title: 'String Muting Techniques', url: 'https://justinguitar.com/guitar-lessons/string-muting-techniques-im-134' },
    drill: { label: 'One drop chops: First Skank', songbook: { song: 'firstskank', part: 'chops' } },
  },
  {
    id: 'pm', title: 'Palm muting', why: 'The chunky sound of rock and metal rhythm, and the "boom" of country bass notes.',
    steps: [
      'Rest the fleshy side of your picking hand lightly on the strings, right where they meet the bridge.',
      'Too far forward and the notes die; too far back and they ring. Move it until you hear a thick "chug".',
      'Keep the hand there while you pick, with small down-strokes.',
      'Lift the hand off to let accented notes ring, then put it back.',
    ],
    video: { site: 'JustinGuitar on YouTube', title: 'This Is How Rock Guitar Players Palm Mute', url: 'https://www.youtube.com/watch?v=5H7Q6dSxuQc' },
    drill: { label: 'Palm-muted chugs on E5 and A5', tab: 'palmmute' },
  },
  {
    id: 'legato', title: 'Hammer-ons and pull-offs', why: 'Play two notes with one pick: smoother, faster lines.',
    steps: [
      'Hammer-on: pick the first note, then bring a fingertip down hard and fast just behind the higher fret.',
      'Pull-off: with both fingers down, pick the higher note, then pull that finger off sideways, slightly plucking the string.',
      'Both notes should be equally loud. Slow down until they are.',
      'Watch the tab for h and p marks.',
    ],
    video: { site: 'JustinGuitar', title: 'Beginner Hammer-Ons', url: 'https://www.justinguitar.com/guitar-lessons/beginner-hammer-ons-bg-1008' },
    drill: { label: 'Hammer-on and pull-off drill', tab: 'legato' },
  },
  {
    id: 'slide', title: 'Slides', why: 'Glide between notes for a vocal, singing sound.',
    steps: [
      'Pick the first note and keep pressing as you move the finger along the string to the new fret.',
      'Press a little lighter while moving, firm again when you arrive, so the note keeps ringing.',
      'Aim for the target fret: stop exactly behind it.',
      'Watch the tab for / (slide up) and \\ (slide down).',
    ],
    video: { site: 'GuitarLessons.com', title: 'How to Slide on the Guitar', url: 'https://guitarlessons.com/guitar-lessons/guitar-technique/how-to-slide-on-guitar/' },
    drill: { label: 'Slides on the G and B strings', tab: 'slides' },
  },
  {
    id: 'bend', title: 'Bends and vibrato', why: 'Bends and vibrato make single notes sing.',
    steps: [
      'Put two or three fingers on the string behind the note to share the work.',
      'Push the string up (towards the ceiling) by turning your wrist, like turning a door handle.',
      'Bend to a target pitch: play the note two frets higher first and match it. The bend trainer shows when you\'re there.',
      'Vibrato: bend a little and release, over and over, evenly. Not too wide, not too fast.',
    ],
    video: { site: 'GuitarLessons.com', title: 'How to Bend Notes on Your Guitar', url: 'https://guitarlessons.com/guitar-lessons/guitar-technique/how-to-bend-notes-on-guitar/' },
    drill: { label: 'Bend trainer', tool: 'bends' },
  },
  {
    id: 'barre', title: 'Barre chords', why: 'One shape, moved up the neck, plays every major and minor chord.',
    steps: [
      'Lay the index finger flat across all the strings, just behind the fret, using the bony side rather than the soft middle.',
      'Pull back gently with the whole arm instead of squeezing hard with the thumb.',
      'Build the rest of the shape on top (the E shape for F, the A shape for B♭).',
      'Pick each string to find the muted ones, and move the barre finger a little until they ring.',
    ],
    video: { site: 'JustinGuitar', title: 'The F Chord', url: 'https://justinguitar.com/guitar-lessons/the-f-chord-b2-901' },
    drill: { label: 'One-minute chord changes', tool: 'changes' },
  },
  {
    id: 'travis', title: 'Travis picking', why: 'The fingerpicking of folk and country: a steady bass with a melody on top.',
    steps: [
      'The thumb plays the bass strings on every beat, alternating between two strings.',
      'Get the thumb steady on its own first. It must never stop.',
      'Add one finger on the top string between the bass notes, then a second finger on the 2nd string.',
      'Play slowly with In time until it feels automatic.',
    ],
    video: { site: 'JustinGuitar', title: 'Basic Travis Picking', url: 'https://justinguitar.com/guitar-lessons/basic-travis-picking-fo-108' },
    drill: { label: 'Travis picking: Red River Valley', songbook: { song: 'redriver', part: 'travis' } },
  },
  {
    id: 'melodic', title: 'Melodic fingerstyle (Marco Cirillo style)', why: 'Open-string chords, a steady thumb and little hammer-ons inside the arpeggio: the calm, beautiful sound of melodic acoustic players.',
    steps: [
      'Thumb (p) takes the bass strings; index, middle and ring (i, m, a) each own one of the G, B and top strings. Rest each finger on its string before you play it.',
      'Use shapes that keep strings ringing between chords: G, Cadd9, Em7 and D/F# all hold the 3rd fret on the top two strings, so those notes never stop.',
      'Play slowly and let every note ring into the next. Don\'t lift a finger until it has to move.',
      'Add colour inside the arpeggio: hammer a sus2 up to the major chord, or touch the 12th fret lightly for a bell-like harmonic.',
      'Exercises → Melodic fingerstyle has the patterns, studies and cascading scales; the lick library has the phrases explained.',
    ],
    video: { site: 'Marco Cirillo on YouTube', title: 'Fingerstyle Technique for Beginners', url: 'https://www.youtube.com/watch?v=qzreNu9FWec' },
    drill: { label: 'Peaceful progression, picked p-i-m-a', exName: 'Peaceful: rising arpeggio' },
  },
]

// ---- drill tabs (guitar; on ukulele they use the instrument's own strings) ----
type N = [number, number, string?] // string, fret, technique
function song(title: string, tuning: number[], bpm: number, bars: N[][][], dur = 0.5): Song {
  const out: SongBar[] = bars.map(b => ({
    steps: b.map(step => ({
      dur,
      notes: step.filter(([s]) => s < tuning.length).map(([s, f, t]): SongNote => ({ string: s, fret: f, midi: tuning[s] + f, ...(t ? { tech: t } : {}) })),
    })),
  }))
  return { title, tempo: bpm, tracks: [{ name: title, tuning, capo: 0, bars: out, program: 25 }] }
}

/** The drill tab for a technique, for this tuning (lowest string first). */
export function drillSong(id: string, tuning: number[]): Song | null {
  const n = tuning.length
  const top = n - 1
  if (id === 'openstrings') {
    const bars = Array.from({ length: n }, (_, k) => [[[top - k, 0]], [[top - k, 0]], [[top - k, 0]], [[top - k, 0]]] as N[][])
    return song('Open strings, down-picks', tuning, 70, bars, 1)
  }
  if (id === 'alternate') {
    const bar = (s: number): N[][] => [[s, 0], [s, 2], [s, 3], [s, 2], [s, 0], [s, 2], [s, 3], [s, 2]].map(x => [x as N])
    return song('Alternate picking: down-up eighths', tuning, 72, [bar(top), bar(top - 1), bar(top - 2), bar(top - 1), bar(top), bar(top)])
  }
  if (id === 'palmmute') {
    if (n < 6) return drillSong('alternate', tuning)
    const e5: N[] = [[0, 0, 'PM'], [1, 2, 'PM']], a5: N[] = [[1, 0, 'PM'], [2, 2, 'PM']]
    const ring: N[] = [[0, 0], [1, 2], [2, 2]]
    return song('Palm muting: chugs', tuning, 90, [
      [e5, e5, e5, e5, e5, e5, e5, e5], [e5, e5, e5, e5, a5, a5, a5, a5], [e5, e5, e5, e5, e5, e5, e5, e5], [a5, a5, a5, a5, ring, ring, ring, ring],
    ])
  }
  if (id === 'legato') {
    // the mark sits on the note you pick (0h2 = pick 0, hammer on to 2)
    const b = (s: number): N[][] => [[[s, 0, 'h']], [[s, 2]], [[s, 2, 'p']], [[s, 0]], [[s, 0, 'h']], [[s, 3]], [[s, 3, 'p']], [[s, 0]]]
    return song('Hammer-ons and pull-offs', tuning, 66, [b(top - 2), b(top - 1), b(top), b(top - 1)])
  }
  if (id === 'slides') {
    const b = (s: number): N[][] => [[[s, 2, '/']], [[s, 4]], [[s, 4, '\\']], [[s, 2]], [[s, 5, '/']], [[s, 7]], [[s, 7, '\\']], [[s, 5]]]
    return song('Slides', tuning, 66, [b(top - 2), b(top - 1), b(top - 2), b(top - 1)])
  }
  return null
}

export function techniquesDone(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem('kg:techDone') ?? '[]') as string[]) } catch { return new Set() }
}
export function markTechnique(id: string) {
  const s = techniquesDone()
  s.add(id)
  try { localStorage.setItem('kg:techDone', JSON.stringify([...s])) } catch { /* storage unavailable */ }
}
