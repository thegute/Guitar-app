// Jam engine: option combinations produce sensible progressions with playable shapes.
import {
  randomProgression, suggestions, scalesForProgression, scaleForChord, swapChord, STYLES, MODES, FLAVORS, ENDINGS,
  progChordPcs, resolveFlavor, type Style, type ModeId, type Flavor, type Ending,
} from '../src/theory/progressions'
import { voicings } from '../src/theory/chords'
import { scaleInfo } from '../src/theory/scales'

let fails = 0
const bad = (m: string) => { fails++; if (fails < 40) console.log('FAIL', m) }
const FALL: Record<string, string[]> = { '13': ['9', '7'], m11: ['m9', 'm7'], maj9: ['maj7', 'major'], '69': ['6', 'major'], madd9: ['minor'], '7b9': ['7'], m9: ['m7'], '9': ['7'], add9: ['major'], sus2: ['major'], '7sus4': ['sus4', '7'], m7b5: ['dim'], dim7: ['dim'] }
const shapeOk = (root: string, type: string) => {
  const s = type === '' ? 'major' : type === 'm' ? 'minor' : type
  return [s, ...(FALL[s] ?? [])].some(x => voicings(root, x).length > 0)
}
const seen = new Map<string, number>()
let total = 0
const styles = STYLES.map(s => s.id) as Style[]
const modes = MODES.map(m => m.id) as ModeId[]
const flavors = FLAVORS.map(f => f.id) as Flavor[]
// a spread of combinations (every style, mode, colour, length and spice level appears many times)
for (let k = 0; k < 900; k++) {
  const style = styles[k % styles.length]
  const mode = modes[(k * 3) % modes.length]
  const flavor = flavors[(k * 5) % flavors.length]
  const count = [2, 4, 8, 12, 16][(k * 7) % 5]
  const spice = k % 4
  const ending = ENDINGS[(k * 11) % 4].id as Ending
  const start = k % 3 === 0 ? 'any' : 'home'
  const p = randomProgression({ tonic: ['C', 'G', 'Bb', 'F#', 'E', 'Ab'][k % 6], mode, style, flavor, count, spice, start, ending, seed: k + 1 })
  total++
  const desc = `${style}/${mode}/${flavor}/${count}/spice${spice}/${ending}`
  if (p.length !== count) bad(`length ${p.length} != ${count} (${desc})`)
  for (const c of p) {
    seen.set(c.type, (seen.get(c.type) ?? 0) + 1)
    if (!shapeOk(c.root, c.type)) bad(`no shape for ${c.symbol} (${desc})`)
    if (progChordPcs('C', c).length < 2) bad(`no tones for ${c.type}`)
    if (!c.roman) bad(`no roman for ${c.symbol}`)
    const t = scaleForChord('C', mode, c)
    if (!scaleInfo(t.root, t.scale).notes.length) bad(`empty scale ${t.root} ${t.scale} for ${c.symbol}`)
  }
  if (spice === 0 && mode !== 'harmonic' && resolveFlavor(flavor, style) !== 'power') {
    const b = p.filter(c => c.borrowed).map(c => c.symbol + ':' + c.roman)
    if (b.length) bad(`spice 0 borrowed ${b.join(' ')} (${desc})`)
  }
  if (ending === 'cadence' && p[p.length - 1].semi !== 0) bad(`cadence does not end home: ${p.map(c => c.symbol).join(' ')} (${desc})`)
  if (start === 'home' && p[0].semi !== 0) bad(`does not start home: ${p.map(c => c.symbol).join(' ')} (${desc})`)
}
console.log('progressions generated:', total)
console.log('chord types used:', [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t || 'maj'}:${n}`).join(' '))
for (const s of ['pop', 'jazz', 'metal', 'epic', 'blues'] as Style[]) {
  for (let k = 0; k < 2; k++) {
    const p = randomProgression({ tonic: s === 'metal' ? 'E' : 'C', mode: s === 'metal' || s === 'epic' ? 'minor' : 'major', style: s, flavor: 'auto', count: 8, spice: 3, ending: 'loop' })
    console.log(`  ${s.padEnd(6)} ${p.map(c => c.symbol.padEnd(6)).join(' ')} | ${p.map(c => c.roman).join(' ')}`)
  }
}
console.log('blues suggestions:', suggestions('G', 'major', 'blues', 'sevenths').slice(0, 3).map(s => s.name).join(' | '))
for (const t of scalesForProgression('A', 'minor', randomProgression({ tonic: 'A', mode: 'minor', style: 'jazz', flavor: 'auto', count: 4, spice: 3 }), 'jazz'))
  if (!scaleInfo(t.root, t.scale).notes.length) bad(`empty tip scale ${t.root} ${t.scale}`)
const base = randomProgression({ tonic: 'D', mode: 'major', style: 'pop', flavor: 'triads', count: 4, spice: 1, seed: 7 })
const sw = swapChord(base, 2, { tonic: 'D', mode: 'major', style: 'pop', flavor: 'triads', spice: 1 })
console.log('swap', base.map(c => c.symbol).join(' '), '→ slot 3 =', sw.symbol)
if (sw.semi === base[2].semi) bad('swap returned the same root')
console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
