// A hammer-on, pull-off or slide happens on ONE string: the finger moves along the same string, with no new pick.
// The hand engine places each note on its own, so after it has run this puts every linked run of notes on one string
// (when the pitches fit one string within reach) and leaves everything else as the engine chose.
import type { HNote } from './engine'

const LINKS = new Set(['h', 'p', '/', '\\'])
/** how far apart (frets) two notes of a hammer-on / pull-off can be (a slide can go as far as it likes) */
const REACH = 5

/**
 * `notes[i]` is step i's placed notes; `techs[i]` is the move step i starts ("h", "p", "/", "\\") onto step i+1.
 * Only single-note steps take part. Returns new arrays; the inputs are not changed.
 */
export function keepLegatoOnString(notes: HNote[][], techs: (string | undefined)[], tuning: number[], maxFret = 22): HNote[][] {
  const out = notes.map(ns => ns.map(n => ({ ...n })))
  const linked = (i: number) => !!techs[i] && LINKS.has(techs[i]!) && out[i]?.length === 1 && out[i + 1]?.length === 1
  let i = 0
  while (i < out.length) {
    if (!linked(i)) { i++; continue }
    let j = i
    while (linked(j)) j++ // steps i..j are one chain
    const chain = out.slice(i, j + 1).map(ns => ns[0])
    const midis = chain.map(n => tuning[n.string] + n.fret)
    let best = -1, bestCost = Infinity
    for (let s = 0; s < tuning.length; s++) {
      const frets = midis.map(m => m - tuning[s])
      if (frets.some(f => f < 0 || f > maxFret)) continue
      let ok = true
      for (let k = 0; k < frets.length - 1; k++) {
        const t = techs[i + k]!
        if ((t === 'h' || t === 'p') && Math.abs(frets[k + 1] - frets[k]) > REACH) ok = false
      }
      if (!ok) continue
      // closest to what the engine chose: fewest notes moved to another string, then the smallest move
      const cost = chain.reduce((c, n, k) => c + (n.string === s ? 0 : 10) + Math.abs(n.string - s) + Math.abs(frets[k] - n.fret) * 0.05, 0)
      if (cost < bestCost) { bestCost = cost; best = s }
    }
    if (best >= 0) chain.forEach((n, k) => { n.string = best; n.fret = midis[k] - tuning[best] })
    i = j + 1
  }
  return out
}
