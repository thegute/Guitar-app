// For every theory lesson: a YouTube video that explains the same idea (found for KGuitar; the videos belong to
// their makers and play from YouTube), and exercises to play in Play, where the mic follows you.
import type { ExerciseSpec } from '../tabs/exercises'
import { fingerMelody } from '../tabs/fingering'
import type { Song, SongBar } from '../tabs/model'

export interface LessonVideo { id: string; title: string }
export type LessonEx = { label: string } & (
  | { spec: ExerciseSpec }
  | { songbook: { song: string; part: string } }
  | { drill: string }
  | { tab: 'alphabetA' | 'alphabetE' | 'octaves' | 'durations' | 'intervals' | 'counting' | 'shuffle' }
  | { tool: 'ear' | 'circle' | 'caged' | 'changes' | 'bends' | 'jam' }
  | { example: string }
)
export interface LessonExtra { video?: LessonVideo; exercises: LessonEx[] }

const v = (id: string, title: string): LessonVideo => ({ id, title })
const scale = (label: string, root: string, type: string, position = 0): LessonEx => ({ label, spec: { kind: 'scale', root, type, position } })
const arp = (label: string, root: string, type: string, position = 0): LessonEx => ({ label, spec: { kind: 'arpeggio', root, type, position } })
const sb = (label: string, song: string, part: string): LessonEx => ({ label, songbook: { song, part } })

export const LESSON_EXTRAS: Record<string, LessonExtra> = {
  intro: { video: v('ZIcHA2furG0', 'Music Theory (for Guitarists) in 2 Minutes & 15 Minutes'), exercises: [sb('Strum along: Down in the Valley', 'valley', 'words'), scale('G major scale, first shape', 'G', 'major')] },
  rules: { video: v('SnIrmTuSSl0', 'The FIRST Music Theory Lesson Every Guitar Player Needs'), exercises: [sb('Melody: Oh! Susanna', 'susanna', 'melody')] },
  reading: { video: v('pQC3JsbgaTw', 'Learn How To Read TAB in 5 Minutes'), exercises: [{ label: 'Open strings, one at a time', drill: 'openstrings' }, sb('Read a melody tab: Clementine', 'clementine', 'melody')] },
  alphabet: { video: v('Ky-55ybil3k', 'The Guitar Notes Of The Musical Alphabet on The Guitar Fretboard'), exercises: [{ label: 'The alphabet along the A string', tab: 'alphabetA' }, { label: 'The alphabet along the low E string', tab: 'alphabetE' }] },
  pitch: { video: v('lJYF_Bm7g_w', 'Memorize Guitar Notes - Octave Shapes'), exercises: [{ label: 'Octaves: the same note, higher and lower', tab: 'octaves' }] },
  durations: { video: v('KYaMzLpUGbE', 'Basic Rhythms Whole, Half Quarter and Eighth Notes explained'), exercises: [{ label: 'One note: whole, half, quarter, eighth', tab: 'durations' }] },
  counting: { video: v('SxNh6gKD3aU', 'How To Count Rhythm on Guitar for Beginners'), exercises: [{ label: 'Count it: quarters and eighths', tab: 'counting' }, sb('Melody with counts: Oh! Susanna', 'susanna', 'melody')] },
  singing: { video: v('iGu8WLHnfrQ', 'Ear Training For Guitar Players: Singing Melodies'), exercises: [sb('Play and sing: Michael, Row the Boat Ashore', 'michael', 'melody')] },
  meter: { video: v('TkMwNOpl2P4', 'Time Signatures Explained - Basic Music Theory Lesson'), exercises: [sb('In 3: Down in the Valley (waltz)', 'valley', 'waltz'), sb('In 4: Red River Valley', 'redriver', 'words')] },
  tuplets: { video: v('r3yElG4Qe6M', 'Rhythm tutorial: Understanding Triplets'), exercises: [{ label: 'Triplet rolls in A minor pentatonic', spec: { kind: 'sequence', root: 'A', type: 'triplets', position: 0, scale: 'minor pentatonic' } }, sb('Triplets in a tune: Turkey in the Straw', 'turkey', 'melody')] },
  syncopation: { video: v('dy0_MMA1Dfo', 'Syncopated Strums Guitar Lesson with Tom Butwin'), exercises: [sb('Off-beat chops: First Skank', 'firstskank', 'rockers'), sb('Strum D DU UDU: Keep on the Sunny Side', 'sunny', 'words')] },
  'metric-mod': { video: v('oMGHilWtuoE', 'The Simplest Metric Modulation!! (Music Theory Lesson)'), exercises: [sb('Half-time feel: Steppers double chops', 'steppers', 'double')] },
  swing: { video: v('Uue04UD0r84', 'Shuffle and Swing Rhythms - Guitar Lesson 46'), exercises: [{ label: 'Shuffle riff: play the eighths long-short', tab: 'shuffle' }] },
  dynamics: { video: v('SRSKYdDyfBo', 'DYNAMICS in Music - forte, piano - crescendo, diminuendo'), exercises: [sb('Soft and loud: Wayfaring Stranger (Travis)', 'stranger', 'travis')] },
  roadmaps: { video: v('bciYQLkraFg', 'Master Repeat Signs & Navigation in Music Notation (D.C., D.S., Coda, Fine, Volta Explained)'), exercises: [sb('AABB form: Soldier\'s Joy', 'soldier', 'melody')] },
  articulation: { video: v('cHIQ1NxzxFU', 'How to Read Every Symbol in Guitar Tab'), exercises: [{ label: 'Hammer-ons and pull-offs', drill: 'legato' }, { label: 'Slides', drill: 'slides' }, { label: 'Palm muting', drill: 'palmmute' }] },
  ornaments: { video: v('UH6VN7SobTE', 'Lead Effects: Vibrato, Bend, Slide, Hammer-on, Pull-off'), exercises: [{ label: 'Bend trainer', tool: 'bends' }, { label: 'Lick: bend, release, resolve', spec: { kind: 'lick', root: 'A', type: 'bend-release', position: 0 } }] },
  'tempo-words': { video: v('s3bcrk2_Rr4', 'Largo, Andante, Moderato, Allegro, & Presto'), exercises: [sb('Slow then fast: Angeline the Baker', 'angeline', 'melody')] },
  diatonic: { video: v('dZfo9wyZrnc', '3-Minute Theory #16: Major Scale Pattern'), exercises: [scale('G major scale', 'G', 'major'), scale('C major scale', 'C', 'major'), { label: 'G major in 3rds', spec: { kind: 'sequence', root: 'G', type: 'thirds', position: 0, scale: 'major' } }] },
  intervals: { video: v('8gpch49FKtY', '3-Minute Theory #21: Basic Intervals'), exercises: [{ label: 'Every interval from A', tab: 'intervals' }, arp('A major arpeggio (root, 3rd, 5th)', 'A', 'maj')] },
  keys: { video: v('PSUKRB_G6N0', 'Names of Scale Degrees - Three Minute Music Theory #26'), exercises: [scale('D major scale', 'D', 'major'), sb('I, IV and V in G: Will the Circle Be Unbroken', 'circle', 'words')] },
  circle: { video: v('YFe7Jchras0', 'The Circle of Fifths Explained for Guitar'), exercises: [{ label: 'Circle of fifths tool', tool: 'circle' }, sb('Neighbours on the circle (C, F, G): Oh! Susanna', 'susanna', 'words')] },
  'pitch-space': { video: v('zBQi_CyCseA', 'Sound Explained: Frequency and Pitch'), exercises: [{ label: 'Octaves: the same note, higher and lower', tab: 'octaves' }] },
  'interval-sounds': { video: v('w0t6lKLybyA', 'Intervals (Ear Training) - Identifying Intervals Using Popular Songs'), exercises: [{ label: 'Every interval from A', tab: 'intervals' }, { label: 'Ear training', tool: 'ear' }] },
  'ear-together': { video: v('l1moc6n1sRk', 'Ear training for guitar that actually works (to play what you hear)'), exercises: [{ label: 'Drone ear training', tool: 'ear' }, sb('Find the melody: When the Saints', 'saints', 'melody')] },
  'harmony-intro': { video: v('aReLsWJ2Pmw', 'What Are Triads? (Chords)'), exercises: [arp('C major triad', 'C', 'maj'), arp('A minor triad', 'A', 'min')] },
  triads: { video: v('i22MvZ8GHqM', 'Music Theory for Guitar: Diatonic Triads'), exercises: [arp('G major triad', 'G', 'maj'), arp('E minor triad', 'E', 'min'), sb('The chords of a key: Red River Valley', 'redriver', 'words')] },
  sevenths: { video: v('Fqc2AySOcKQ', 'Seventh Chords on Guitar'), exercises: [arp('G7 (dominant 7th)', 'G', 'dom7'), arp('Cmaj7', 'C', 'maj7'), arp('Am7', 'A', 'm7')] },
  'pop-chords': { video: v('Qftt4IyV9V8', 'Finally Understanding sus2, sus4, 9, add9, 6 & 13 Chords'), exercises: [{ label: 'Try them in Jam', tool: 'jam' }, arp('Fmaj7', 'F', 'maj7')] },
  'jazz-chords': { video: v('He3QTgIaQps', 'The Most Popular Jazz Progression EXPLAINED! - The (II-V-I)'), exercises: [arp('ii: Dm7', 'D', 'm7'), arp('V: G7', 'G', 'dom7'), arp('I: Cmaj7', 'C', 'maj7')] },
  slash: { video: v('_HaEzRNmI9I', 'Slash Chords - What They Are And How To Use Them In Your Guitar Playing'), exercises: [sb('Bass runs between chords: Will the Circle', 'circle', 'boom')] },
  'scales-def': { video: v('qBeyDkoyiWA', 'How I wish Scales & Modes were explained to me as a student'), exercises: [scale('C major', 'C', 'major'), scale('A natural minor', 'A', 'aeolian')] },
  principal: { video: v('5HLtZ_K8h3E', '3-Minute Theory #37: Relative Minor'), exercises: [scale('G major', 'G', 'major'), scale('E natural minor (same notes)', 'E', 'aeolian')] },
  modes: { video: v('oF9TYm0Ck9U', 'Guitar Lesson: A Guide to the Seven Modes of the Major Scale'), exercises: [scale('A Dorian', 'A', 'dorian'), scale('G Mixolydian', 'G', 'mixolydian'), sb('Mixolydian tune: Old Joe Clark', 'joeclark', 'melody')] },
  pentatonic: { video: v('FONKenvjCN4', 'Guitar Scales Explained: MAJOR vs MINOR PENTATONIC vs BLUES'), exercises: [scale('A minor pentatonic, box 1', 'A', 'minor pentatonic'), scale('A blues scale', 'A', 'minor blues'), scale('G major pentatonic', 'G', 'major pentatonic')] },
  'harmonic-modes': { video: v('h-vidjPJZg0', '3-Minute Theory #39: Harmonic Minor Scale'), exercises: [scale('A harmonic minor', 'A', 'harmonic minor'), arp('E7: the V chord it makes', 'E', 'dom7')] },
  'melodic-modes': { video: v('Ekml3enKF-E', '3-Minute Theory #41: Melodic Minor Scale'), exercises: [scale('Compare: A harmonic minor', 'A', 'harmonic minor'), scale('Compare: A Dorian', 'A', 'dorian')] },
  symmetric: { video: v('BHSFObtGsmI', 'Symmetrical Dominant & Diminished Scales: The Basics'), exercises: [arp('Diminished 7th arpeggio', 'B', 'dim7')] },
  world: { video: v('SlM-xEAiAJc', 'Exotic Scales Guitar Lesson - Spanish Egyptian Scales Phrygian Dominant Harmonic Minor'), exercises: [scale('A harmonic minor (start on E for the Spanish sound)', 'A', 'harmonic minor')] },
  'using-scales': { video: v('CsoB2o8PHfI', 'Chord Scale Relationships: What\'s the Best Scale to Play With Each Chord?'), exercises: [sb('Lead over Am, Dm, Em: Roots Melody', 'roots', 'melody'), { label: 'Solo over a Jam progression', tool: 'jam' }] },
  'compose-layers': { video: v('PNf0k3N2aI0', 'The 3 Elements of Music - Rhythm, Melody & Harmony'), exercises: [sb('The bass layer: Rockers Riddim', 'rockers', 'melody'), sb('The rhythm layer: First Skank', 'firstskank', 'chops')] },
  'compose-how': { video: v('RG9yFzVvwXE', 'How to write your first song on guitar - Songwriting for beginners'), exercises: [{ label: 'Make a progression in Jam', tool: 'jam' }] },
  nht: { video: v('1uhNjoXg4zI', 'Non Chordal Tones Part 1 - Three Minute Music Theory #41'), exercises: [{ label: 'Lick: blue-note walk', spec: { kind: 'lick', root: 'A', type: 'blue-note', position: 0 } }, sb('Passing notes in a fiddle tune: Soldier\'s Joy', 'soldier', 'melody')] },
  inversions: { video: v('dV9Q5F6HX-8', 'What Are Chord Inversions? • Guitar Theory'), exercises: [arp('C major triad up the neck', 'C', 'maj', -1), sb('Bass walks: Will the Circle', 'circle', 'boom')] },
  roman: { video: v('xS2jNlUmi74', 'How to Read Roman Numerals in Chord Progressions - by David Bennett'), exercises: [sb('I–IV–V: Oh! Susanna', 'susanna', 'words'), sb('I–IV–V–IV: Sunshine Skank', 'sunshine', 'chops')] },
  secondary: { video: v('FdyOMwXxJYU', 'What Are Secondary Dominants & How to Use Them - Guitar Lesson'), exercises: [sb('G7 leading to C: Red River Valley', 'redriver', 'words'), sb('E7 leading to A: Soldier\'s Joy', 'soldier', 'boom')] },
  interchange: { video: v('14gBV0Ni-DY', 'MODAL INTERCHANGE - Borrowed Chords and Parallel Modes Explained'), exercises: [{ label: 'Add "spice" chords in Jam', tool: 'jam' }] },
  beyond: { video: v('aewI1F8bA8M', 'Negative Harmony'), exercises: [{ label: 'Try IV–I endings in Jam', tool: 'jam' }] },
  harmonize: { video: v('jZcgWQU1Ic0', 'Music Theory: Harmonizing a Melody (Chord Progression Types)'), exercises: [sb('Melody and chords: Clementine', 'clementine', 'melody'), sb('Now strum it: Clementine', 'clementine', 'words')] },
  cadences: { video: v('EknaUvmYB4k', 'Musical Cadences: Explained!'), exercises: [sb('V to I at every line end: Will the Circle', 'circle', 'words')] },
  caged: { video: v('93RDnOs7QHM', 'CAGED System Explained (1 of 4) • Converting Open Chords to Moveable Chords'), exercises: [{ label: 'CAGED explorer', tool: 'caged' }, arp('G major in all five shapes', 'G', 'maj', -1)] },
  'fretboard-plan': { video: v('LxfME_pBOgA', 'How to Identify ANY Note on the Guitar Fretboard (Simple System for Beginners & Beyond)'), exercises: [{ label: 'Natural notes on the low E string', tab: 'alphabetE' }, { label: 'Natural notes on the A string', tab: 'alphabetA' }, { label: 'Octave shapes', tab: 'octaves' }] },
  'practice-how': { video: v('rMrlCm8uLws', 'Deliberate Practice Will Supercharge Your Guitar Progress'), exercises: [{ label: 'The spider warm-up', spec: { kind: 'warmup', root: 'A', type: 'spider', position: 0 } }, { label: 'One-minute chord changes', tool: 'changes' }] },
  technique: { video: v('LO24XNc39bk', 'Every Guitar Tab Symbol Explained (with Demos!)'), exercises: [{ label: 'Hammer-ons and pull-offs', drill: 'legato' }, { label: 'Alternate picking', drill: 'alternate' }] },
  'uke-notes': { video: v('_M7PTTnU22Q', 'Baritone Ukulele vs Guitar: Same Chords, Same Tuning (Explained)'), exercises: [sb('Strum along: Down in the Valley', 'valley', 'words')] },
}

export const videoUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`
export const videoThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`

// ---- small tabs for the lessons ----
/** Notes (MIDI) on one string where they fit, otherwise wherever the fingering puts them. */
function line(title: string, tuning: number[], midis: (number | null)[], durs: number[] | number, bpm: number, string?: number, perBar = 4): Song {
  const placed = fingerMelody(midis, tuning)
  const steps = midis.map((m, i) => {
    const dur = Array.isArray(durs) ? durs[i % durs.length] : durs
    if (m === null) return { notes: [], dur }
    const f = string !== undefined ? m - tuning[string] : -1
    const p = string !== undefined && f >= 0 && f <= 15 ? { string, fret: f } : placed[i]
    return { notes: p ? [{ string: p.string, fret: p.fret, midi: tuning[p.string] + p.fret }] : [], dur }
  })
  const bars: SongBar[] = []
  let cur: SongBar = { steps: [] }, used = 0
  for (const s of steps) {
    cur.steps.push(s)
    used += s.dur
    if (used >= perBar - 1e-6) { bars.push(cur); cur = { steps: [] }; used = 0 }
  }
  if (cur.steps.length) bars.push(cur)
  return { title, tempo: bpm, tracks: [{ name: title, tuning, capo: 0, bars, program: 25 }] }
}

const NATURAL = [0, 2, 4, 5, 7, 9, 11]
/** The lesson tab: built for this instrument's tuning. */
export function lessonTab(id: string, tuning: number[]): Song {
  const low = 0
  const aStr = tuning.length >= 6 ? 1 : 0
  const naturals = (from: number, n: number) => { const out: number[] = []; for (let m = from; out.length < n; m++) if (NATURAL.includes(m % 12)) out.push(m); return out }
  if (id === 'alphabetA' || id === 'alphabetE') {
    const s = id === 'alphabetA' ? aStr : low
    const up = naturals(tuning[s], 8)
    return line(`The musical alphabet on the ${id === 'alphabetA' ? (tuning.length >= 6 ? 'A' : 'lowest') : (tuning.length >= 6 ? 'low E' : 'lowest')} string`, tuning, [...up, ...up.slice(0, -1).reverse()], 1, 66, s)
  }
  if (id === 'octaves') {
    // the same note in every octave the instrument has, up and back down; then the next note name
    const lo = Math.min(...tuning), hi = Math.max(...tuning) + 12
    const seq: number[] = []
    for (const pcv of [lo % 12, (lo + 2) % 12]) {
      const ms: number[] = []
      for (let m = lo; m <= hi; m++) if (m % 12 === pcv) ms.push(m)
      seq.push(...ms, ...ms.slice(0, -1).reverse())
    }
    return line('Octaves: the same note, higher and lower', tuning, seq, 1, 70)
  }
  if (id === 'durations') {
    const m = tuning[Math.min(2, tuning.length - 1)] + 2
    return line('Whole, half, quarter, eighth', tuning, [m, m, m, m, m, m, m, m, m, m, m, m, m, m, m], [4, 2, 2, 1, 1, 1, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], 72)
  }
  if (id === 'counting') {
    const base = tuning[Math.min(3, tuning.length - 1)]
    const ms = [base, base, base + 2, base + 2, base + 4, base + 4, base + 2, null, base, base + 2, base + 4, base + 2, base, null, base, null]
    return line('Count out loud: 1 2 3 4, 1 & 2 &', tuning, ms, [1, 1, 1, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1], 72)
  }
  if (id === 'shuffle') {
    // a boogie shuffle on the two lowest strings: root + 5th, root + 6th, four times a bar; then the same a string up
    const pair = (r: number, base: number) => {
      const d = tuning[r + 1] - tuning[r]
      return [[{ string: r, fret: base }, { string: r + 1, fret: base + 7 - d }], [{ string: r, fret: base }, { string: r + 1, fret: base + 9 - d }]]
    }
    let r0 = 0
    while (r0 + 1 < tuning.length && !(tuning[r0 + 1] > tuning[r0] && tuning[r0 + 1] - tuning[r0] <= 7)) r0++
    const i = pair(r0, 0)
    // the IV chord: the same shape with its root a 4th up, on whichever pair of strings keeps it closest and in reach
    // (an open root, or fretted with the 6th at most four frets above the root)
    const want = tuning[r0] + 5
    let best: { r: number; b: number; cost: number } | null = null
    for (let r = 0; r + 1 < tuning.length; r++) {
      const d = tuning[r + 1] - tuning[r]
      if (d < 4 || d > 7) continue
      const b = (((want - tuning[r]) % 12) + 12) % 12
      if (b > 9 || (b > 0 && 9 - d > 4)) continue
      const cost = Math.abs(tuning[r] + b - want) * 10 + b
      if (!best || cost < best.cost) best = { r, b, cost }
    }
    const iv = best ? pair(best.r, best.b) : i
    const bar = (shape: { string: number; fret: number }[][]): SongBar => ({
      steps: [0, 0, 1, 1, 0, 0, 1, 1].map(k => ({ dur: 0.5, notes: shape[k].map(n => ({ ...n, midi: tuning[n.string] + n.fret })) })),
    })
    const bars = [i, i, i, i, iv, iv, i, i].map(bar)
    return { title: 'Shuffle riff (play the eighths long-short)', tempo: 84, tracks: [{ name: 'Shuffle', tuning, capo: 0, bars, program: 25 }] }
  }
  // intervals: A up to each interval and back, an octave of steps
  let a = Math.min(...tuning)
  while (a % 12 !== 9) a++
  const ms: (number | null)[] = []
  for (let i = 1; i <= 12; i++) ms.push(a, a + i)
  return line('Intervals from A: minor 2nd to octave', tuning, ms, 1, 66)
}
