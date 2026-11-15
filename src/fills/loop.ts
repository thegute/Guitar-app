// "Loop your own rhythm": the workshop's progression goes to the looper as a beat (drums, bass and keys on the chords),
// so you can record yourself strumming it on track 1 and then practise the fills over your own playing.
import { chordInfo } from '../tabs/harmony'
import { launch } from '../search/launch'
import { stopAllSounds } from '../audio/stopAll'

export async function loopOver(o: { chords: string[]; key: string; minor: boolean; bpm: number; groove: string }) {
  stopAllSounds()
  const [{ station }, { beatFromJam }] = await Promise.all([import('../looper/station'), import('../studio/practice')])
  const chords = o.chords.map(sym => {
    const ci = chordInfo(sym)
    const root = /^[A-G][#b]?/.exec(sym)?.[0] ?? 'C'
    return { root, ivs: ci ? [...new Set(ci.pcs.map(p => (p - ci.root + 12) % 12))].sort((a, b) => a - b) : [0, 7], beats: 4 }
  })
  const b = beatFromJam({ chords, bpm: o.bpm, key: o.key, minor: o.minor, groove: o.groove, kit: o.groove === 'metal' || o.groove === 'gallop' ? 'metal' : 'studio' })
  const st = station()
  st.useBeat({ ...b, name: `Fills ${o.chords.join(' ')}`.slice(0, 40) })
  // record your strumming from the next bar line, one time round the progression
  st.set({ start: 'count' })
  launch({ jam: { page: 'loop' } })
}
