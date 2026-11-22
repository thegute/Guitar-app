// Unit tests for Circle of Fifths Mastery engine (circleEngine.ts) and 6-chapter curriculum (circleCourse.ts).
import {
  CIRCLE_FOURTHS, CIRCLE_PATHS, STANDARD_MIDI,
  analyzeVoiceLeading, buildCircleChord, buildGuideToneShell, buildTopTriadGrip, buildVoiceLedGrip,
  explainCircleChord, generateCircleEtude, instantiatePath,
  loadKeyMastery, markKeyMastered, parseChordToCircle, resetKeyMastery,
  type EtudeLevel, type EtudePicking, type EtudeTexture, type EtudeZone,
} from '../src/circle/circleEngine'
import { CIRCLE_CHAPTERS } from '../src/circle/circleCourse'

// Minimal localStorage shim
const store = new Map<string, string>()
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, String(v)) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => { store.clear() },
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() { return store.size },
}

let passed = 0
let failed = 0
function check(name: string, cond: boolean, detail = '') {
  if (cond) passed++
  else { failed++; console.error(`FAIL: ${name}${detail ? ` (${detail})` : ''}`) }
}

// 1. All 6 Circle Path presets instantiate cleanly across all 12 keys
for (const path of CIRCLE_PATHS) {
  for (const key of CIRCLE_FOURTHS) {
    const chords = instantiatePath(path.id, key)
    check(`${path.id} in ${key} chord count`, chords.length === path.steps.length && chords.length >= 4)
    check(`${path.id} in ${key} valid pcs`, chords.every(c => c.pcs.length >= 3 && c.rootPc >= 0 && c.rootPc < 12))
  }
}

// 2. Voice Leading Analyzer detects exact 1-fret guide-tone drops in Dm7 -> G7 -> Cmaj7!
const dm7 = buildCircleChord(2, 'm7')
const g7 = buildCircleChord(7, '7')
const cmaj7 = buildCircleChord(0, 'maj7')

const vl1 = analyzeVoiceLeading(dm7, g7)
check('Dm7 -> G7 anchor includes F (pc 5)', vl1.anchors.includes(5))
check('Dm7 -> G7 detects 1-fret guide-tone drop C(0) -> B(11)', vl1.moves.some(m => m.role === 'guide-drop' && m.fromPc === 0 && m.toPc === 11 && m.semitones === -1))

const vl2 = analyzeVoiceLeading(g7, cmaj7)
check('G7 -> Cmaj7 anchor includes B (pc 11)', vl2.anchors.includes(11))
check('G7 -> Cmaj7 detects 1-fret guide-tone drop F(5) -> E(4)', vl2.moves.some(m => m.role === 'guide-drop' && m.fromPc === 5 && m.toPc === 4 && m.semitones === -1))

// 3. Harmonic GPS Explainer distinguishes diatonic vs outside-the-slice colours
const homeC = explainCircleChord('Cmaj7', 'G7', 'C', false)
check('Cmaj7 in C major is diatonic Home', !homeC.outside && homeC.badge.includes('Home'))

const b7InEm = explainCircleChord('B7', 'F#m7b5', 'E', true)
check('B7 in E minor flagged as outside Harmonic Minor V7', b7InEm.outside && /Harmonic Minor/i.test(b7InEm.badge))

const db7InC = explainCircleChord('Db7', 'Dm7', 'C', false)
check('Db7 in C major flagged as Tritone Sub', db7InC.outside && /Tritone/i.test(db7InC.badge))

const fmInC = explainCircleChord('Fm7', 'Fmaj7', 'C', false)
check('Fm7 in C major flagged as Borrowed Minor iv', fmInC.outside && /Borrowed/i.test(fmInC.badge))

const a7InC = explainCircleChord('A7', 'Cmaj7', 'C', false)
check('A7 in C major flagged as Secondary Dominant', a7InC.outside && /Secondary/i.test(a7InC.text))

// 4. Voicing / Shell / Top-Triad builders produce playable grips in valid fret & MIDI range
for (const zone of ['open', 'mid', 'high'] as EtudeZone[]) {
  const g = buildVoiceLedGrip(dm7, zone)
  check(`voice-led grip ${zone} >= 3 notes`, g.length >= 3)
  check(`voice-led grip ${zone} frets 0..15`, g.every(n => n.fret >= 0 && n.fret <= 15 && n.midi === STANDARD_MIDI[n.string] + n.fret))

  const sh = buildGuideToneShell(g7, zone)
  check(`guide shell ${zone} has 3 notes (R, 3, 7)`, sh.length === 3 && sh.some(n => n.degree === '3') && sh.some(n => n.degree === '7'))

  const tr = buildTopTriadGrip(cmaj7, zone)
  check(`top triad ${zone} on strings 3,4,5`, tr.length === 3 && tr.every(n => n.string >= 3 && n.string <= 5 && n.fret >= 0 && n.fret <= 15))
}

// 5. Original Circle Etude Generator produces valid 4/4 playable tabs for all textures/levels/pickings
const TEXTURES: EtudeTexture[] = ['peaceful', 'arpeggio', 'twister', 'triads']
const LEVELS: EtudeLevel[] = ['starter', 'intermediate', 'pro']
const PICKINGS: EtudePicking[] = ['finger', 'pick']

for (const texture of TEXTURES) {
  for (const level of LEVELS) {
    for (const picking of PICKINGS) {
      const { song, chords } = generateCircleEtude({ tonic: 'E', pathId: 'minor-gravity', texture, level, zone: 'mid', picking })
      const bars = song.tracks[0].bars
      check(`etude ${texture}/${level}/${picking} bar count matches chords`, bars.length === chords.length)
      check(
        `etude ${texture}/${level}/${picking} every bar sums to 4 beats & valid notes`,
        bars.every(b => {
          const sum = b.steps.reduce((acc, s) => acc + s.dur, 0)
          return Math.abs(sum - 4) < 0.01 && b.steps.every(s => s.notes.length >= 1 && s.notes.every(n => n.fret >= 0 && n.fret <= 15))
        }),
      )
    }
  }
}

// Custom Tap-a-Path Etude generation
const customEtude = generateCircleEtude({
  tonic: 'A',
  pathId: 'peaceful-open',
  customChords: ['Am', 'Dm', 'G7', 'Cmaj7'],
  texture: 'peaceful',
  level: 'starter',
  zone: 'open',
  picking: 'finger',
})
check('custom Tap-a-Path etude has 4 bars', customEtude.song.tracks[0].bars.length === 4)
check('parseChordToCircle handles half-diminished', parseChordToCircle('F#m7b5')?.dim === true)

// 6. All 6 Masterclass chapters have curated videos, deep dive, worked steps, demos & course links
check('6 Masterclass chapters defined', CIRCLE_CHAPTERS.length === 6)
let totalVideos = 0
for (const ch of CIRCLE_CHAPTERS) {
  totalVideos += ch.videos.length
  check(`Ch.${ch.num} has >= 3 curated videos`, ch.videos.length >= 3)
  check(`Ch.${ch.num} video IDs look valid`, ch.videos.every(v => v.id.length >= 8 && v.watchFor.length > 10))
  check(`Ch.${ch.num} has deepDive + worked + demos + mistakes`, ch.deepDive.length >= 3 && ch.worked.length >= 3 && ch.demos.length >= 1 && ch.mistakes.length >= 2)
}
check('at least 20 curated videos across chapters', totalVideos >= 20, `got ${totalVideos}`)

// 7. 12-Key Mastery persistence
resetKeyMastery()
check('mastery starts empty', Object.keys(loadKeyMastery()).length === 0)
markKeyMastered('Bb', 2)
markKeyMastered('C', 1)
const m = loadKeyMastery()
check('mastery saved Bb=2 and C=1', m['Bb'] === 2 && m['C'] === 1)

console.log(`circle-mastery: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
