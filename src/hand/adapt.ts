// Play a tab in the tuning you're in, or without its capo, instead of retuning. Every note keeps its pitch: on the
// same string when it fits (Drop D → Standard: notes on the low string move 2 frets up), on another string when it
// doesn't, and an octave up when the note is lower than your lowest string (a low D in Standard). The tab as written
// stays saved. A short summary says what changed, string by string.
import type { SongNote, SongTrack } from '../tabs/model'
import { pcName } from '../theory/notes'

export interface Adapted { track: SongTrack; changes: string[] }

const names = (tuning: number[]) => tuning.map((m, s) => {
  const n = pcName(m % 12, false)
  return s === tuning.length - 1 && tuning.length === 6 ? n.toLowerCase() : n
})
const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th']

/** The track moved onto `to` (open strings, lowest first, no capo), the same pitches. */
export function adaptTrack(track: SongTrack, to: number[], keepCapo = true): Adapted {
  const n = track.tuning.length
  if (to.length !== n) return { track, changes: [] }
  const capo = keepCapo ? track.capo : 0
  const eff = to.map(t => t + capo)
  const maxFret = n === 4 ? 15 : 22
  let octaveUp = 0, moved = 0
  const bars = track.bars.map(b => ({
    steps: b.steps.map(st => {
      const used = new Set<number>()
      const out: SongNote[] = []
      // same string first, then the nearest free string, lowest notes first
      for (const note of [...st.notes].sort((a, c) => a.midi - c.midi)) {
        if (note.tech === 'x') { if (!used.has(note.string)) { used.add(note.string); out.push(note) } continue }
        let midi = note.midi, up = false
        if (midi < eff[0]) { midi += 12 * Math.ceil((eff[0] - midi) / 12); octaveUp++; up = true }
        const same = midi - eff[note.string]
        // an octave-up note goes where it's closest to the original fret (a low open D becomes the open D string)
        if (!up && same >= 0 && same <= maxFret && !used.has(note.string)) {
          used.add(note.string); out.push({ ...note, midi, fret: same }); continue
        }
        const alt = eff.map((t, s) => ({ s, f: midi - t })).filter(x => x.f >= 0 && x.f <= maxFret && !used.has(x.s))
          .sort((a, c) => Math.abs(a.f - note.fret) - Math.abs(c.f - note.fret))[0]
        if (!alt) continue
        if (!up) moved++
        used.add(alt.s); out.push({ ...note, midi, string: alt.s, fret: alt.f })
      }
      return { ...st, notes: out.sort((a, c) => a.string - c.string) }
    }),
  }))
  const changes: string[] = []
  const from = names(track.tuning), toN = names(to)
  for (let s = 0; s < n; s++) {
    const d = track.tuning[s] + track.capo - eff[s]
    if (d === 0) continue
    const label = `${ORD[n - 1 - s]} string (${from[s]}→${toN[s]})`
    changes.push(`${label}: notes ${Math.abs(d)} fret${Math.abs(d) > 1 ? 's' : ''} ${d > 0 ? 'higher' : 'lower'}`)
  }
  if (!keepCapo && track.capo) changes.unshift(`No capo: every fret is ${track.capo} higher`)
  if (octaveUp) changes.push(`${octaveUp} note${octaveUp > 1 ? 's are' : ' is'} lower than your lowest string, so ${octaveUp > 1 ? 'they are' : 'it is'} played an octave up`)
  if (moved) changes.push(`${moved} note${moved > 1 ? 's' : ''} moved to another string where they didn't fit`)
  return { track: { ...track, bars, tuning: to.slice(), capo }, changes }
}
