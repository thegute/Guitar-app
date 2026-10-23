// Find a song's key from its notes (Krumhansl–Kessler key profiles),
// then recommend scales to improvise with.
import { Scale } from 'tonal'
import { FLATS, SHARPS, keyPrefersFlats, pc } from '../theory/notes'

const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

function corr(a: number[], b: number[]) {
  const ma = a.reduce((x, y) => x + y) / 12
  const mb = b.reduce((x, y) => x + y) / 12
  let num = 0, da = 0, db = 0
  for (let i = 0; i < 12; i++) {
    num += (a[i] - ma) * (b[i] - mb)
    da += (a[i] - ma) ** 2
    db += (b[i] - mb) ** 2
  }
  return da && db ? num / Math.sqrt(da * db) : 0
}

export interface KeyGuess {
  root: string
  minor: boolean
  score: number
  label: string
}

/** weights: 12 pitch-class weights (e.g. total note duration per pitch class) */
export function detectKey(weights: number[], bassWeights?: number[]): KeyGuess[] {
  const guesses: KeyGuess[] = []
  for (let r = 0; r < 12; r++) {
    for (const minor of [false, true]) {
      const prof = minor ? MINOR : MAJOR
      const rot = Array.from({ length: 12 }, (_, i) => prof[(i - r + 12) % 12])
      let s = corr(weights, rot)
      // a little extra trust for keys whose tonic is often the lowest/first note
      if (bassWeights) s += 0.08 * (bassWeights[r] / Math.max(1e-9, Math.max(...bassWeights)))
      const flats = keyPrefersFlats(SHARPS[r], minor) || keyPrefersFlats(FLATS[r], minor)
      const root = (flats ? FLATS : SHARPS)[r]
      guesses.push({ root, minor, score: s, label: `${root} ${minor ? 'minor' : 'major'}` })
    }
  }
  return guesses.sort((a, b) => b.score - a.score)
}

export interface ImproTip {
  root: string
  scale: string
  why: string
  fit: number // share of the song's notes inside the scale, 0..1
}

function fitOf(weights: number[], root: string, scale: string) {
  const pcs = new Set(Scale.get(`${root} ${scale}`).notes.map(pc))
  const total = weights.reduce((a, b) => a + b, 0) || 1
  let inside = 0
  weights.forEach((w, i) => { if (pcs.has(i)) inside += w })
  return inside / total
}

export function improvisationScales(key: KeyGuess, weights: number[]): ImproTip[] {
  const r = pc(key.root)
  const rel = key.minor ? (r + 3) % 12 : (r + 9) % 12
  const relName = (keyPrefersFlats(key.root, key.minor) ? FLATS : SHARPS)[rel]
  const tips: Omit<ImproTip, 'fit'>[] = []
  if (key.minor) {
    tips.push({ root: key.root, scale: 'minor pentatonic', why: 'The safest choice. Every note works, and bends sound great.' })
    tips.push({ root: key.root, scale: 'minor blues', why: 'Pentatonic plus the b5 "blue note" for a grittier sound.' })
    const modes = ['aeolian', 'dorian', 'phrygian', 'harmonic minor']
    const best = modes.map(m => ({ m, f: fitOf(weights, key.root, m) })).sort((a, b) => b.f - a.f)[0]
    const why: Record<string, string> = {
      aeolian: 'The full natural minor scale: the notes this song is built from.',
      dorian: 'This song uses the major 6th, so Dorian matches it best.',
      phrygian: 'The song leans on the b2, the Phrygian sound.',
      'harmonic minor': 'The song raises the 7th, so harmonic minor fits.',
    }
    tips.push({ root: key.root, scale: best.m, why: why[best.m] })
    tips.push({ root: relName, scale: 'major pentatonic', why: `Same notes as ${key.root} minor pentatonic, but centred on ${relName}: a sweeter colour.` })
  } else {
    tips.push({ root: key.root, scale: 'major pentatonic', why: 'The safest choice: five notes that never clash.' })
    const modes = ['major', 'mixolydian', 'lydian']
    const best = modes.map(m => ({ m, f: fitOf(weights, key.root, m) })).sort((a, b) => b.f - a.f)[0]
    const why: Record<string, string> = {
      major: 'The full major scale: the notes this song is built from.',
      mixolydian: 'The song uses the b7, so Mixolydian fits best (rock and blues flavour).',
      lydian: 'The song uses the #4, the dreamy Lydian sound.',
    }
    tips.push({ root: key.root, scale: best.m, why: why[best.m] })
    tips.push({ root: relName, scale: 'minor pentatonic', why: `The relative minor pentatonic: same notes as ${key.root} major pentatonic.` })
    tips.push({ root: key.root, scale: 'major blues', why: 'Major pentatonic plus the b3, for country and blues licks.' })
  }
  return tips.map(t => ({ ...t, fit: fitOf(weights, t.root, t.scale) }))
}
