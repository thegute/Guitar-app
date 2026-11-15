// The improv coach: what it heard while you soloed over the band, in numbers a teacher would look at (notes in the
// scale, landing on chord tones when the chord changes, range, space, repeated ideas) and the one thing to work on next.
const pcOf = (m: number) => ((m % 12) + 12) % 12

export interface ImprovNote { beat: number; midi: number }
export interface ImprovChord { start: number; beats: number; pcs: number[]; symbol: string }
export interface ImprovReport {
  notes: number
  inKey: number
  landed: number
  changes: number
  range: number
  perBeat: number
  space: number
  motifs: number
  /** the one thing to work on, and why */
  focus: 'scale' | 'land' | 'space' | 'range' | 'motif' | 'more' | 'good'
  say: string
  /** what went well */
  good: string
}

/** Analyse a solo: notes (beats from the band's start), the progression (one loop), the key's scale. */
export function analyseImprov(notes: ImprovNote[], chords: ImprovChord[], loopBeats: number, keyPcs: number[], keyName: string): ImprovReport {
  const n = notes.length
  const first = n ? notes[0].beat : 0, last = n ? notes[n - 1].beat : 0
  const inKey = n ? Math.round((notes.filter(x => keyPcs.includes(pcOf(x.midi))).length / n) * 100) : 0
  // every chord change while you were playing: is the note at the change (from a quarter beat before to half a beat
  // after, or the last one still sounding from just before) a note of the new chord?
  let landed = 0, changes = 0
  if (n && loopBeats > 0) {
    for (let L = Math.floor(first / loopBeats); L * loopBeats <= last; L++) for (const c of chords) {
      const at = L * loopBeats + c.start
      if (at < first + 0.5 || at > last) continue
      changes++
      const near = notes.filter(x => x.beat >= at - 0.25 && x.beat <= at + 0.5)
      const ringing = [...notes].reverse().find(x => x.beat < at - 0.25 && x.beat > at - 1.5)
      const cand = near.length ? near : ringing ? [ringing] : []
      if (cand.some(x => c.pcs.includes(pcOf(x.midi)))) landed++
    }
  }
  const midis = notes.map(x => x.midi)
  const range = n ? Math.max(...midis) - Math.min(...midis) : 0
  const span = Math.max(1, last - first)
  const perBeat = Math.round((n / span) * 10) / 10
  // space: the share of beats with no new note
  const beats = new Set(notes.map(x => Math.floor(x.beat)))
  const space = n ? Math.round((1 - beats.size / Math.max(1, Math.ceil(span))) * 100) : 0
  // repeated ideas: the same three-note shape (intervals) coming back
  const tri = new Map<string, number>()
  for (let i = 2; i < n; i++) { const k = `${midis[i - 1] - midis[i - 2]},${midis[i] - midis[i - 1]}`; tri.set(k, (tri.get(k) ?? 0) + 1) }
  const motifs = [...tri.values()].filter(v => v >= 2).length
  const landPct = changes ? landed / changes : 1
  let focus: ImprovReport['focus'], say: string
  if (n < 8) { focus = 'more'; say = 'Play a bit longer (a few times round the progression) so there\'s something to go on.' }
  else if (inKey < 80) { focus = 'scale'; say = `${100 - inKey}% of your notes were outside ${keyName}. Stay inside the scale for a while (the neck card shows it) until it's in your fingers.` }
  else if (changes >= 3 && landPct < 0.5) { focus = 'land'; say = `You landed on a note of the new chord at ${landed} of ${changes} chord changes. Aim for its root, 3rd or 5th right when it arrives: the Target notes trainer drills exactly this.` }
  else if (space < 20 && perBeat > 2.5) { focus = 'space'; say = `Lots of notes (about ${perBeat} a beat) and hardly any gaps. Leave space: play a short idea, then rest for a beat or two. Rests make the notes count.` }
  else if (range < 8) { focus = 'range'; say = `You stayed within ${range} frets' worth of notes. Move to a higher or lower position for a phrase, or climb to the next box of the scale.` }
  else if (motifs < 2) { focus = 'motif'; say = 'Your lines keep changing. Try repeating a short idea (three or four notes) and changing it a little each time: that\'s what makes a solo sound like it\'s saying something.' }
  else { focus = 'good'; say = 'A strong solo: in the scale, landing on the chords, with space and ideas that come back. Next: push the tempo up, or try the same over a new progression.' }
  const goods: string[] = []
  if (inKey >= 90) goods.push(`${inKey}% of the notes in the scale`)
  if (changes >= 3 && landPct >= 0.6) goods.push(`landed on chord tones at ${landed} of ${changes} changes`)
  if (motifs >= 2) goods.push('ideas that came back')
  if (space >= 25) goods.push('good use of space')
  return { notes: n, inKey, landed, changes, range, perBeat, space, motifs, focus, say, good: goods.length ? `Good: ${goods.join(', ')}.` : '' }
}
