// What a guitar tuning changes, in plain words (Tuner, CAGED explorer, Song check): which strings move and by how much,
// what that does to the shapes you know (Drop D: everything on the 6th string 2 frets higher), and what open tunings
// give you (open strings = a chord, one finger across = a major chord, the drone strings slack key leans on).
import { noteToMidi } from './notes'

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const STD = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'].map(noteToMidi)
const ORD = ['6th (lowest)', '5th', '4th', '3rd', '2nd', '1st (highest)']
const MAJOR = [0, 4, 7], MINOR = [0, 3, 7]

export interface TuningInfo { summary: string; points: string[] }

/** Plain-words notes for a 6-string guitar tuning (open-string MIDI numbers, lowest first). Null for standard. */
export function tuningInfo(midis: number[]): TuningInfo | null {
  if (midis.length !== 6) return null
  const diff = midis.map((m, i) => m - STD[i])
  if (diff.every(d => d === 0)) return null
  const points: string[] = []
  const name = (m: number) => NAMES[m % 12]
  // the whole guitar moved the same amount: same shapes, different pitch
  if (diff.every(d => d === diff[0])) {
    const d = diff[0]
    return { summary: `Every string ${Math.abs(d) === 1 ? 'a half step' : Math.abs(d) === 2 ? 'a whole step' : `${Math.abs(d)} half steps`} ${d < 0 ? 'lower' : 'higher'} than standard.`, points: [`All your shapes stay the same: they just sound ${Math.abs(d)} fret${Math.abs(d) > 1 ? 's' : ''} ${d < 0 ? 'lower' : 'higher'} (an E shape sounds like ${name(64 + d)}).`, d < 0 ? 'Bends feel easier (the strings are slacker) and it suits a lower voice. Lots of rock and blues players tune down like this.' : 'Tighter strings: bends take more push.'] }
  }
  const moved = diff.map((d, i) => ({ d, i })).filter(x => x.d !== 0)
  for (const { d, i } of moved) points.push(`${ORD[i]} string: ${name(STD[i])} → ${name(midis[i])} (${Math.abs(d) === 1 ? 'a half step' : Math.abs(d) === 2 ? 'a whole step' : `${Math.abs(d)} half steps`} ${d < 0 ? 'down' : 'up'}). Anything you play on it moves ${Math.abs(d)} fret${Math.abs(d) > 1 ? 's' : ''} ${d < 0 ? 'higher' : 'lower'} to sound the same.`)
  // the open strings as a chord (rooted on one of its own notes, the lowest string first)
  const pcs = [...new Set(midis.map(m => m % 12))]
  const bass = midis[0] % 12
  const TYPES: { ivs: number[]; suffix: string; kind: 'major' | 'minor' | 'wahine' | 'six' | 'sus' | 'dom' }[] = [
    { ivs: [0, 4, 7], suffix: '', kind: 'major' }, { ivs: [0, 3, 7], suffix: 'm', kind: 'minor' },
    { ivs: [0, 4, 7, 11], suffix: 'maj7', kind: 'wahine' }, { ivs: [0, 2, 4, 7, 11], suffix: 'maj9', kind: 'wahine' },
    { ivs: [0, 4, 7, 9], suffix: '6', kind: 'six' }, { ivs: [0, 5, 7], suffix: 'sus4', kind: 'sus' }, { ivs: [0, 2, 7], suffix: 'sus2', kind: 'sus' },
    { ivs: [0, 4, 7, 10], suffix: '7', kind: 'dom' },
  ]
  let open: { root: number; t: (typeof TYPES)[number] } | null = null
  for (const r of [bass, ...pcs.filter(p => p !== bass)]) {
    const ivs = pcs.map(p => (p - r + 12) % 12).sort((a, b) => a - b).join()
    const t = TYPES.find(x => x.ivs.join() === ivs)
    if (t) { open = { root: r, t }; break }
  }
  const sameRest = diff.slice(1).every(d => d === diff[1])
  let summary: string
  if (sameRest && diff[0] === diff[1] - 2) {
    // a drop tuning (Drop D, Drop C …): the rest of the guitar is standard (or all moved together)
    summary = `Drop ${name(midis[0])}: the lowest string a whole step below the rest${diff[1] ? `, and the whole guitar ${Math.abs(diff[1]) === 2 ? 'a whole step' : `${Math.abs(diff[1])} half steps`} ${diff[1] < 0 ? 'down' : 'up'}` : ''}.`
    points.push(`Power chords on the bottom three strings become one finger straight across (fret 0 = ${name(midis[0])}5, fret 3 = ${name(midis[0] + 3)}5, fret 5 = ${name(midis[0] + 5)}5): the heavy-riff sound.`)
    points.push('Chord shapes with their root on the lowest string (E and G shapes) move that one note up 2 frets; shapes rooted on the 5th string (A and C shapes) stay as they are.')
    points.push(`The open low ${name(midis[0])} rings under songs in ${name(midis[0])}: a big drone for ${name(midis[0])} major and minor.`)
  } else if (open) {
    const R = name(open.root), t = open.t
    summary = `Open ${R}${t.suffix ? ` (${R}${t.suffix})` : ''}: the open strings already make a ${R}${t.suffix} chord.`
    if (t.kind === 'major' || t.kind === 'minor') {
      points.push(`One finger across all six strings plays a ${t.kind} chord: fret 5 = ${name(open.root + 5)}, fret 7 = ${name(open.root + 7)}, fret 12 = ${R} again (the I, IV and V of ${R}).`)
      const third = midis.findIndex(m => ((m % 12) - open!.root + 12) % 12 === (t.kind === 'minor' ? 3 : 4))
      if (third >= 0) points.push(`The ${ORD[third]} string holds the chord's 3rd: ${t.kind === 'minor' ? 'play it one fret higher than the barre and the chord turns major' : 'play it one fret lower than the barre and the chord turns minor'}. That one note decides major or minor in this tuning.`)
    } else if (t.kind === 'wahine') {
      points.push(`The ${t.suffix === 'maj9' ? 'major 9th' : 'major 7th'} in the open strings is the sweet "wahine" sound of slack key. A barre keeps that colour at every fret (fret 5 = ${name(open.root + 5)}${t.suffix}).`)
      const seventh = midis.findIndex(m => ((m % 12) - open!.root + 12) % 12 === 11)
      if (seventh >= 0) points.push(`For a plain major chord, play the ${ORD[seventh]} string one fret higher than the barre (the 7th becomes the root).`)
    } else if (t.kind === 'six') {
      points.push(`The added 6th (${name(open.root + 9)}) gives the open strings a soft, sweet sound; a barre keeps it at every fret (fret 5 = ${name(open.root + 5)}6).`)
    } else if (t.kind === 'sus') {
      points.push(`No 3rd in the open strings, so they fit ${R} major and ${R} minor songs alike: fret the 3rd on one string to choose (${name(open.root + 4)} for major, ${name(open.root + 3)} for minor).`)
      points.push('Folk, Celtic and fingerstyle players love it for the open strings ringing against melodies.')
    }
    const drones = [...new Set(midis.filter(m => m % 12 === open!.root || m % 12 === (open!.root + 7) % 12).map(name))]
    if (drones.length) points.push(`The open ${drones.join(' and ')} strings ring as drones under a melody played higher up: the sound of slack key and open-tuning blues.`)
    if (bass !== open.root) points.push(`The lowest string is the chord's ${((bass - open.root + 12) % 12) === 7 ? '5th' : ((bass - open.root + 12) % 12) === 4 ? '3rd' : 'other note'} (${name(midis[0])}), so the thumb can alternate it with the root ${name(open.root)}.`)
  } else {
    summary = `${moved.length} string${moved.length > 1 ? 's' : ''} differ${moved.length > 1 ? '' : 's'} from standard.`
    points.push('Shapes that use the moved strings change; shapes on the other strings stay the same.')
  }
  if (midis[0] < STD[0] - 2) points.push('The low string is much slacker: a heavier string or a gentler pick keeps it from flapping.')
  return { summary, points }
}
