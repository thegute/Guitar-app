// Fills between chords, metal: chug riffs with lead fills (the modern metal sound: Trivium, Killswitch Engage, Bullet
// for My Valentine, Periphery). The low string is the pedal: palm-muted chugs and gallops on it, and between the chug
// bursts the fretting hand jumps to a few melody notes on the A, D and G strings, then drops straight back.
// Standard tuning; the key sets the pedal (E = the open low E, A = the 5th fret …). Original riffs only.
import type { Song, SongBar } from '../tabs/model'
import { bar, nt, rnd, type Ev, type FillStep } from './make'
import { STD } from './shells'

const MINOR = [0, 2, 3, 5, 7, 8, 10]
const PCS: Record<string, number> = { C: 0, 'C#': 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 }
const pcOf = (m: number) => ((m % 12) + 12) % 12

/** chords of a minor-key metal progression, as semitones above the key note */
export const METAL_PROGS: { id: string; label: string; chords: number[] }[] = [
  { id: 'i-vi-vii', label: 'i – bVI – bVII – i', chords: [0, 8, 10, 0] },
  { id: 'i-i-vi-vii', label: 'i – i – bVI – bVII', chords: [0, 0, 8, 10] },
  { id: 'i-iii-vii-vi', label: 'i – bIII – bVII – bVI', chords: [0, 3, 10, 8] },
  { id: 'i-ii', label: 'i – bII (phrygian)', chords: [0, 1, 0, 1] },
]
export const METAL_KEYS = ['E', 'F#', 'G', 'A', 'B', 'C', 'D']
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

export interface MetalIn { key: string; prog: number[]; bpm: number; title?: string }

export function metalChords(key: string, prog: number[]): string[] {
  const k = PCS[key] ?? 4
  return prog.map(s => NAMES[(k + s) % 12] + '5')
}

function setup(w: MetalIn) {
  const tuning = STD
  const key = PCS[w.key] ?? 4
  // the pedal: the key note on the low E string
  const pf = pcOf(key - tuning[0])
  const chords = metalChords(w.key, w.prog)
  // a chord's power chord: its root on the low E (or the A string when it would be far from the pedal), plus the 5th
  const power = (semi: number) => {
    const root = pcOf(key + semi)
    // the root on the low E or the A string, whichever place is nearest the pedal (frets 0–14)
    const cands: { s: number; f: number }[] = []
    for (const s of [0, 1]) for (const o of [0, 12]) { const f = pcOf(root - tuning[s]) + o; if (f <= 14) cands.push({ s, f }) }
    const c = cands.reduce((a, b) => (Math.abs(b.f - pf) + b.s * 0.5 < Math.abs(a.f - pf) + a.s * 0.5 ? b : a))
    return [nt(c.s, c.f, undefined, tuning), nt(c.s + 1, c.f + 2, undefined, tuning)]
  }
  // melody notes: the natural minor on the A, D and G strings, frets from the pedal to five above
  const lo = pf, hi = pf + 5
  const spots: { string: number; fret: number; midi: number }[] = []
  for (const s of [1, 2, 3]) for (let f = lo; f <= hi; f++) if (MINOR.includes(pcOf(tuning[s] + f - key))) spots.push({ string: s, fret: f, midi: tuning[s] + f })
  const byPitch = new Map<number, { string: number; fret: number }>()
  for (const sp of spots) if (!byPitch.has(sp.midi)) byPitch.set(sp.midi, { string: sp.string, fret: sp.fret })
  const pitches = [...byPitch.keys()].sort((a, b) => a - b)
  const mel = (m: number, tech?: string) => { const p = byPitch.get(m)!; return nt(p.string, p.fret, tech, tuning) }
  const near = (m: number) => pitches.reduce((b, p, i) => (Math.abs(p - m) < Math.abs(pitches[b] - m) ? i : b), 0)
  const at = (i: number) => pitches[Math.max(0, Math.min(pitches.length - 1, i))]
  const chug = (tech = 'PM') => nt(0, pf, tech, tuning)
  return { tuning, key, pf, chords, power, pitches, mel, near, at, chug }
}

/** The metal workshop: ten steps over a minor progression, each with the metal band (double kick, driven bass). */
export function metalWorkshop(w: MetalIn): { chords: string[]; steps: FillStep[] } {
  const S = setup(w)
  const { chords, power, mel, near, at, chug } = S
  const n = chords.length
  const song = (title: string, bars: SongBar[], groove = 'metal'): Song => ({
    title: `${w.title ?? 'Metal fills'}: ${title}`, tempo: w.bpm, backing: { groove, bass: groove === 'gallop' ? 'gallop' : 'metal' },
    tracks: [{ name: 'Guitar', tuning: S.tuning, capo: 0, bars, program: 30 }],
  })
  const twice = (make: (i: number, pass: number) => Ev[]) => [0, 1].flatMap(pass => chords.map((_, i) => bar(make(i, pass))))
  const stab = (i: number, at0: number, dur: number): Ev => ({ at: at0, dur, notes: power(w.prog[i]), chord: chords[i], stroke: 'down' })
  const chugs = (from: number, to: number, step = 0.5): Ev[] => { const out: Ev[] = []; for (let t = from; t < to - 1e-6; t += step) out.push({ at: t, dur: step, notes: [chug()], stroke: 'down' }); return out }
  const gallop = (from: number, to: number): Ev[] => { const out: Ev[] = []; for (let t = from; t < to - 1e-6; t += 1) out.push({ at: t, dur: 0.5, notes: [chug()] }, { at: t + 0.5, dur: 0.25, notes: [chug()] }, { at: t + 0.75, dur: 0.25, notes: [chug()] }); return out }
  // the target for a fill: the next chord's root, an octave up on the A/D strings
  const rootNote = (i: number) => { const r = pcOf(S.key + w.prog[i % n]); return S.pitches.find(p => pcOf(p) === r) ?? S.pitches[0] }
  /** k notes walking (stepwise in the minor scale) to just before the next chord's root (from above or below) */
  const fillTo = (i: number, k: number, up: boolean) => {
    const t = near(rootNote(i + 1))
    const out: number[] = []
    for (let j = k; j >= 1; j--) out.push(at(up ? t - j : t + j))
    return out.filter((m, j, a) => j === 0 || m !== a[j - 1])
  }
  const legato = (ms: number[]) => ms.map((m, j) => {
    const p = mel(m), q = j ? mel(ms[j - 1]) : null
    const tech = q && q.string === p.string && Math.abs(p.fret - q.fret) <= 3 && p.fret !== q.fret ? (p.fret > q.fret ? 'h' : 'p') : undefined
    return tech ? { ...p, tech } : p
  })
  const steps: FillStep[] = []
  steps.push({
    id: 'm-chug', title: '1. Tight palm-muted chugs',
    why: 'Everything in this style sits on the chug: the low string, palm-muted, picked down on every 8th. If the chugs are tight and even, the fills will sound great; if not, nothing will.',
    how: ['Rest the edge of your picking hand on the strings right at the bridge saddles (PM in the tab).', 'Pick the low string with all downstrokes, small and from the wrist.', 'A power chord rings on beat 1 of each bar: lift the palm a little for it, then back down.'],
    listen: 'Every chug the same volume and length: a tight "chunk", not a ringing note.',
    song: song('tight chugs', twice(i => [stab(i, 0, 1), ...chugs(1, 4)])),
  })
  steps.push({
    id: 'm-gallop', title: '2. The gallop',
    why: 'The gallop (one 8th and two 16ths: "da-da-dum") is the classic metal rhythm, from Iron Maiden to Trivium. It\'s the engine the fills drop out of.',
    how: ['Pick it down-down-up or down-up-down: try both, keep the one that stays even.', 'Say it as you play: "gal-lo-ping, gal-lo-ping", one per beat.', 'Power chord on 1, gallops for the rest of the bar.'],
    listen: 'The two short notes are exactly even, and the long one lands on the beat.',
    song: song('the gallop', twice(i => [stab(i, 0, 0.5), { at: 0.5, dur: 0.25, notes: [chug()] }, { at: 0.75, dur: 0.25, notes: [chug()] }, ...gallop(1, 4)]), 'gallop'),
  })
  steps.push({
    id: 'm-pedal', title: '3. Pedal point: chug, note, chug, note',
    why: 'A pedal point is a note that keeps coming back under a moving melody. Here the open (or pedal) low string alternates with melody notes above it: the riff sounds like two guitars, a chug and a melody.',
    how: ['Alternate: the low string (palm-muted), then a melody note on the A or D string (not muted), and so on in 8ths.', 'The melody notes walk up the minor scale and come back.', 'Your picking hand barely moves: lift the palm just enough for the melody notes to ring.'],
    listen: 'The melody notes sing out over the chugs; the chugs stay short.',
    song: song('pedal point', twice((i, pass) => {
      const base = near(rootNote(i))
      const line = [0, 1, 2, 1].map(d => at(base + (pass ? -d : d)))
      const evs: Ev[] = [stab(i, 0, 0.5)]
      line.forEach((m, k) => { const t = 0.5 + k; evs.push({ at: t, dur: 0.5, notes: [mel(m)] }); if (t + 0.5 < 4) evs.push({ at: t + 0.5, dur: 0.5, notes: [chug()] }) })
      return evs
    })),
  })
  steps.push({
    id: 'm-one', title: '4. One note between the chugs',
    why: 'The simplest fill: gallop, then on beat 4 one melody note that rings out, then straight back to the chug on the next 1. One note, perfectly timed, already sounds like a riff.',
    how: ['Gallop through beats 1 to 3.', 'On beat 4 play the one melody note (unmuted, let it ring).', 'Back to the chug on 1. The jump back is the hard part: practise it slowly.'],
    listen: 'The melody note is clear and the next chug is right on 1.',
    song: song('one note', twice((i, pass) => [stab(i, 0, 0.5), { at: 0.5, dur: 0.25, notes: [chug()] }, { at: 0.75, dur: 0.25, notes: [chug()] }, ...gallop(1, 3), { at: 3, dur: 1, notes: [mel(at(near(rootNote(i + 1)) + (pass ? 2 : 1)))] }]), 'gallop'),
  })
  steps.push({
    id: 'm-two', title: '5. Two notes into the next chord',
    why: 'Two melody notes at the end of the bar, stepping down (or up) the scale to the next chord\'s root, make the riff move from chord to chord instead of just changing.',
    how: ['Chug 8ths and a gallop through beat 3.', 'On beat 4 and its "and", two melody notes walking to the next chord.', 'Land on the next power chord on 1.'],
    listen: 'The two notes are even and lead clearly into the next chord.',
    song: song('two notes', twice((i, pass) => [stab(i, 0, 0.5), ...chugs(0.5, 2), ...gallop(2, 3), ...legato(fillTo(i, 2, pass === 0)).map((nn, k) => ({ at: 3 + k * 0.5, dur: 0.5, notes: [nn] }))])),
  })
  steps.push({
    id: 'm-three', title: '6. Three-note lead fills (16ths)',
    why: 'Three fast notes in a burst, hammered or pulled where they sit on one string, then the chug again: this is the sound of modern metal riffs. Short, fast and back in time.',
    how: ['Gallop beats 1 to 3.', 'On beat 4: three 16th notes (pick the first, hammer or pull the rest), then one last chug.', 'Keep the chug hand moving through the fill so you come back in time.'],
    listen: 'The fill doesn\'t drag: the last chug is still a 16th, right before the next 1.',
    song: song('three-note fills', twice((i, pass) => [stab(i, 0, 0.5), { at: 0.5, dur: 0.25, notes: [chug()] }, { at: 0.75, dur: 0.25, notes: [chug()] }, ...gallop(1, 3), ...legato(fillTo(i, 3, pass === 1)).map((nn, k) => ({ at: 3 + k * 0.25, dur: 0.25, notes: [nn] })), { at: 3.75, dur: 0.25, notes: [chug()] }]), 'gallop'),
  })
  steps.push({
    id: 'm-harmony', title: '7. Harmonized fills (in 5ths)',
    why: 'Play each melody note with the note a 5th above it (a power-chord shape) and the fill gets huge, like two guitars in harmony. This is the sound of melodic death metal and metalcore leads.',
    how: ['Chug the first half of the bar.', 'From beat 3, play the fill as two-note shapes: the melody note and the note two frets up on the next string.', 'Mute the strings around them with the fretting fingers.'],
    listen: 'Both notes of each shape sound together, cleanly.',
    song: song('harmony', twice((i, pass) => {
      const ms = fillTo(i, 3, pass === 0)
      return [stab(i, 0, 0.5), ...chugs(0.5, 2.5), ...ms.map((m, k) => { const p = mel(m); return { at: 2.5 + k * 0.5, dur: 0.5, notes: p.string < 3 ? [p, nt(p.string + 1, p.fret + 2, undefined, S.tuning)] : [p] } })]
    })),
  })
  steps.push({
    id: 'm-offbeat', title: '8. Fills on the off-beats',
    why: 'Modern prog and metalcore riffs put the melody notes on the 16th off-beats ("e" and "a") between chugs on the beat. The groove gets bouncy and the melody pops out of the gaps.',
    how: ['Chug on every beat and on the "and".', 'The melody notes come on the "a" (just before each beat) in beats 2 and 3.', 'Count 16ths: "1 e + a 2 e + a": chug on 1 and +, note on a.'],
    listen: 'The off-beat notes are crisp and short; the chugs stay on the grid.',
    inTime: true,
    song: song('off-beats', twice((i, pass) => {
      const base = near(rootNote(i))
      const evs: Ev[] = [stab(i, 0, 0.5), { at: 0.5, dur: 0.25, notes: [chug()] }]
      ;[1, 2, 3].forEach((b, k) => { evs.push({ at: b, dur: 0.25, notes: [chug()] }, { at: b + 0.5, dur: 0.25, notes: [chug()] }, { at: b + 0.75, dur: 0.25, notes: [mel(at(base + (pass ? 3 - k : k + 1)))] }) })
      return evs
    })),
  })
  steps.push({
    id: 'm-mix', title: '9. Mix them up',
    why: 'A real riff uses all of it: gallops, a pedal-point bar, a three-note burst, a harmonized fill. Mixed, it sounds like a song section.',
    how: ['Each bar is a different move from steps 3 to 8.', 'The chugs are the backbone: never let a fill push them late.', 'Once it\'s clean, speed it up with the speed trainer.'],
    listen: 'Tight chugs everywhere, and every fill lands back on the 1.',
    song: song('mixed', [0, 1].flatMap(pass => chords.map((_, i) => { const k = 2 + ((i + pass * 2) % 6); return steps[k].song.tracks[0].bars[(i + pass * n) % steps[k].song.tracks[0].bars.length] }))),
  })
  steps.push({
    id: 'm-yours', title: '10. Your own fills',
    why: 'The band and your chugs keep going; the last two beats of every bar are yours for any fill.',
    how: ['Power chord on 1, gallop through beat 2.', 'Beats 3 and 4: any fill you like, from the scale notes on the A, D and G strings.', 'Back to the next power chord on 1. Play it In time.'],
    listen: 'You land on the next 1 every time.',
    inTime: true,
    song: song('your own fills', twice(i => [stab(i, 0, 0.5), { at: 0.5, dur: 0.25, notes: [chug()] }, { at: 0.75, dur: 0.25, notes: [chug()] }, ...gallop(1, 2)]), 'gallop'),
  })
  return { chords, steps }
}

/** A longer riff (4, 6 or 8 bars): a fill idea in bar 1, the same idea over the next chord, a longer burst in bar 3,
 *  a gallop and the power chord to finish; generated fresh from a seed. */
export function metalRiff(w: MetalIn, bars: number, seed: number): Song {
  const S = setup(w)
  const { chords, power, mel, near, at, chug } = S
  const r = rnd(seed * 13 + 5)
  const n = chords.length
  const shape = [[1, 2, 1], [2, 1, 0], [0, 1, 2], [3, 2, 1], [-1, 0, 1]][Math.floor(r() * 5)]
  const out: SongBar[] = []
  for (let b = 0; b < bars; b++) {
    const i = b % n, last = b === bars - 1
    const evs: Ev[] = [{ at: 0, dur: 0.5, notes: power(w.prog[i]), chord: chords[i], stroke: 'down' }]
    const g = (from: number, to: number) => { for (let t = from; t < to - 1e-6; t += 1) evs.push({ at: t, dur: 0.5, notes: [chug()] }, { at: t + 0.5, dur: 0.25, notes: [chug()] }, { at: t + 0.75, dur: 0.25, notes: [chug()] }) }
    evs.push({ at: 0.5, dur: 0.25, notes: [chug()] }, { at: 0.75, dur: 0.25, notes: [chug()] })
    if (last) { g(1, 3); evs.push({ at: 3, dur: 1, notes: power(w.prog[0]) }); out.push(bar(evs)); break }
    const root = pcOf(S.key + w.prog[i])
    const base = near(S.pitches.find(p => pcOf(p) === root) ?? S.pitches[0])
    const role = b % 4 === 2 ? 'long' : 'motif'
    if (role === 'long') {
      g(1, 2)
      const line = [0, 1, 2, 3, 2, 1].map(d => at(base + d + shape[0]))
      line.forEach((m, k) => evs.push({ at: 2 + k * 0.25, dur: 0.25, notes: [mel(m)] }))
      evs.push({ at: 3.5, dur: 0.25, notes: [chug()] }, { at: 3.75, dur: 0.25, notes: [chug()] })
    } else {
      g(1, 3)
      shape.forEach((d, k) => evs.push({ at: 3 + k * 0.25, dur: 0.25, notes: [mel(at(base + d + (b % 2)))] }))
      evs.push({ at: 3.75, dur: 0.25, notes: [chug()] })
    }
    out.push(bar(evs))
  }
  return { title: `${w.title ?? 'Metal fills'}: a ${bars}-bar riff`, tempo: w.bpm, backing: { groove: 'gallop', bass: 'gallop' }, tracks: [{ name: 'Guitar', tuning: S.tuning, capo: 0, bars: out, program: 30 }] }
}
