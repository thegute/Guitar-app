// Your say over the hand brain: "Make it easier" re-fingers a whole tab for your hand (pitches kept, strings and
// frets chosen again), and single notes can be moved to another string or given another finger. The tab as written
// stays saved; these are applied when the song is opened.
import { flatten, type SongTrack } from '../tabs/model'
import { placeAndFinger } from './engine'
import { handSize, scaleFor } from './neck'
import type { SongDoc } from '../tabs/library'

const KEEP = new Set(['T', 'harm', 'x', 'tap'])

/** The track re-placed for your hand: the same notes, on the strings and frets that move your hand least. */
export function easierTrack(track: SongTrack, level = 2, inst?: string): SongTrack {
  const tuning = track.tuning.map(t => t + track.capo)
  const flat = flatten(track)
  const steps = flat.map(f => {
    const ns = f.step.notes.filter(n => !KEEP.has(n.tech ?? ''))
    const order = [...ns].sort((a, b) => b.midi - a.midi)
    return { midis: order.map(n => n.midi), dur: f.step.dur, techs: order.map(n => n.tech), keep: f.step.notes.filter(n => KEEP.has(n.tech ?? '')) }
  })
  const placed = placeAndFinger(steps.map(s => ({ midis: s.midis, dur: s.dur, techs: s.techs })), {
    // easier = low on the neck where frets are easy to find, open strings welcome, few shifts; less pull for players further along
    scale: scaleFor(track.tuning.length, inst), size: handSize(), tuning, level, open: 0.7, warm: 0.1, low: level <= 2 ? 0.03 : 0.012, maxFret: track.tuning.length === 4 ? 15 : 20,
  })
  let k = 0
  return {
    ...track,
    bars: track.bars.map(b => ({
      steps: b.steps.map(st => {
        const i = k++
        const ns = placed.notes[i] ?? []
        if (steps[i].midis.length && ns.length !== steps[i].midis.length) return st // couldn't place all: as written
        const moved = ns.map((n, q) => ({ string: n.string, fret: n.fret, midi: steps[i].midis[q], ...(steps[i].techs[q] ? { tech: steps[i].techs[q] } : {}) }))
        const kept = steps[i].keep.filter(n => !moved.some(m => m.string === n.string))
        return { ...st, notes: [...moved, ...kept].sort((a, b) => a.string - b.string) }
      }),
    })),
  }
}

export const editKey = (track: number, flatIdx: number, string: number) => `${track}:${flatIdx}:${string}`

/** The track with your moved notes applied. */
export function withMoves(track: SongTrack, trackIdx: number, hand: SongDoc['hand']): SongTrack {
  if (!hand || !Object.values(hand).some(e => e.string !== undefined)) return track
  let k = 0
  return {
    ...track,
    bars: track.bars.map(b => ({
      steps: b.steps.map(st => {
        const i = k++
        let changed = false
        const notes = st.notes.map(n => {
          const e = hand[editKey(trackIdx, i, n.string)]
          if (e?.string === undefined || e.fret === undefined) return n
          changed = true
          return { ...n, string: e.string, fret: e.fret }
        })
        return changed ? { ...st, notes: notes.sort((a, c) => a.string - c.string) } : st
      }),
    })),
  }
}

/** Fingers you chose, as the engine's fixed map (flat step → string → finger). */
export function fixedFingers(trackIdx: number, hand: SongDoc['hand']): Map<number, Map<number, number>> | undefined {
  if (!hand) return undefined
  const out = new Map<number, Map<number, number>>()
  for (const [k, e] of Object.entries(hand)) {
    if (e.finger === undefined) continue
    const [t, i, s] = k.split(':').map(Number)
    if (t !== trackIdx) continue
    // a moved note keeps its finger on the new string
    const str = e.string ?? s
    ;(out.get(i) ?? out.set(i, new Map()).get(i)!).set(str, e.finger)
  }
  return out.size ? out : undefined
}

/** Other places on the neck for the same pitch (for "Other string"). */
export function otherSpots(midi: number, tuning: number[], capo: number, maxFret: number, near = 0): { string: number; fret: number }[] {
  // nearest first: the spot your hand can reach from where it is
  return tuning.map((t, s) => ({ string: s, fret: midi - t - capo })).filter(x => x.fret >= 0 && x.fret <= maxFret)
    .sort((a, b) => Math.abs(a.fret - near) - Math.abs(b.fret - near))
}
