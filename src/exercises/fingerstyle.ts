// Melodic fingerstyle, in the style of Marco Cirillo: open-string chord colours (add9, maj7, sus and slash chords with
// the top strings ringing), the thumb on the bass and the fingers on top, little hammer-ons and harmonics inside the
// arpeggios, cascading scales that let every note ring into the next, and Spanish-flavoured minor melodies.
// Everything here is written for this app; the progressions are the common ones such music is built on (the Canon
// is Pachelbel's, centuries old). Shapes are for standard tuning; other keys use a capo, as fingerstyle players do.
import type { Voicing } from '../theory/chords'
import { pc } from '../theory/notes'
import type { Song } from '../tabs/model'
import { pickingSong } from '../tabs/picking'
import { isStandard, keyLabel } from '../licks/generator'
import type { Make } from './build'
import { spell } from './build'

const STD = [40, 45, 50, 55, 59, 64]

/** Open-string shapes, low E first (-1 = not played), with the bass note the thumb plays. */
export const LUSH: Record<string, { frets: number[]; bass: string }> = {
  G: { frets: [3, 2, 0, 0, 3, 3], bass: 'G' },
  Gmaj7: { frets: [3, 2, 0, 0, 0, 2], bass: 'G' },
  'G/B': { frets: [-1, 2, 0, 0, 3, 3], bass: 'B' },
  Cadd9: { frets: [-1, 3, 2, 0, 3, 3], bass: 'C' },
  C: { frets: [-1, 3, 2, 0, 1, 0], bass: 'C' },
  Cmaj7: { frets: [-1, 3, 2, 0, 0, 0], bass: 'C' },
  'C/E': { frets: [0, 3, 2, 0, 1, 0], bass: 'E' },
  D: { frets: [-1, -1, 0, 2, 3, 2], bass: 'D' },
  Dsus4: { frets: [-1, -1, 0, 2, 3, 3], bass: 'D' },
  Dsus2: { frets: [-1, -1, 0, 2, 3, 0], bass: 'D' },
  Dmaj7: { frets: [-1, -1, 0, 2, 2, 2], bass: 'D' },
  'D/F#': { frets: [2, -1, 0, 2, 3, 2], bass: 'F#' },
  Dm7: { frets: [-1, -1, 0, 2, 1, 1], bass: 'D' },
  Em: { frets: [0, 2, 2, 0, 0, 0], bass: 'E' },
  Em7: { frets: [0, 2, 2, 0, 3, 3], bass: 'E' },
  'Em(add9)': { frets: [0, 2, 4, 0, 0, 0], bass: 'E' },
  Em9: { frets: [0, 2, 0, 0, 0, 2], bass: 'E' },
  E: { frets: [0, 2, 2, 1, 0, 0], bass: 'E' },
  Fmaj7: { frets: [-1, -1, 3, 2, 1, 0], bass: 'F' },
  Fadd9: { frets: [-1, -1, 3, 2, 1, 3], bass: 'F' },
  A: { frets: [-1, 0, 2, 2, 2, 0], bass: 'A' },
  Asus2: { frets: [-1, 0, 2, 2, 0, 0], bass: 'A' },
  'A/C#': { frets: [-1, 4, 2, 2, 2, 0], bass: 'C#' },
  Am: { frets: [-1, 0, 2, 2, 1, 0], bass: 'A' },
  Am7: { frets: [-1, 0, 2, 0, 1, 0], bass: 'A' },
  'Am(add9)': { frets: [-1, 0, 2, 4, 1, 0], bass: 'A' },
  'Am/G': { frets: [3, 0, 2, 2, 1, 0], bass: 'G' },
  Bm: { frets: [-1, 2, 4, 4, 3, 2], bass: 'B' },
  Bm11: { frets: [-1, 2, 0, 2, 0, 0], bass: 'B' },
  'F#m': { frets: [2, 4, 4, 2, 2, 2], bass: 'F#' },
}
export function lushVoicing(name: string): Voicing {
  const l = LUSH[name]
  return { frets: l.frets, fingers: l.frets.map(() => 0), barres: [], baseFret: 1, midi: l.frets.flatMap((f, s) => (f >= 0 ? [STD[s] + f] : [])) }
}

/** The progressions, in the key the shapes are written in. */
export const FS_PROGS: { id: string; name: string; key: string; minor?: boolean; chords: string[]; about: string }[] = [
  { id: 'peace', name: 'Peaceful (G – Cadd9 – Em7 – D/F#)', key: 'G', chords: ['G', 'Cadd9', 'Em7', 'D/F#'],
    about: 'The I–IV–vi–V of countless ballads, voiced so the top two strings (D and G) ring through every chord.' },
  { id: 'glow', name: 'Open-string glow (Cadd9 – G/B – Am7 – Dsus4)', key: 'G', chords: ['Cadd9', 'G/B', 'Am7', 'Dsus4'],
    about: 'The bass walks down C, B, A while the open strings shimmer on top, then the sus4 leans home.' },
  { id: 'melan', name: 'Melancholic (Am(add9) – Fmaj7 – C – G/B)', key: 'A', minor: true, chords: ['Am(add9)', 'Fmaj7', 'C', 'G/B'],
    about: 'A minor with the add9 and maj7 colours: sad but warm. The G/B pulls straight back to Am.' },
  { id: 'canon', name: 'Canon progression (D – A/C# – Bm – F#m – G – D – G – A)', key: 'D', chords: ['D', 'A/C#', 'Bm', 'F#m', 'G', 'D', 'G', 'A'],
    about: "Pachelbel's Canon (from the 1680s): the bass steps down almost a scale while the chords stay sweet. Behind more wedding songs and pop hits than anyone can count." },
  { id: 'spanish', name: 'Spanish (Am – G – Fmaj7 – E)', key: 'A', minor: true, chords: ['Am', 'G', 'Fmaj7', 'E'],
    about: 'The Andalusian cadence: the bass falls A, G, F, E. The E major at the end gives it the Spanish, flamenco sound.' },
  { id: 'dream', name: 'Dreamy sevenths (Cmaj7 – Fmaj7)', key: 'C', chords: ['Cmaj7', 'Fmaj7', 'Cmaj7', 'Fmaj7'],
    about: 'Two major-7th chords rocking back and forth with the open high E ringing on both: calm and floating.' },
  { id: 'ballad', name: 'Minor ballad (Em(add9) – Cmaj7 – G – D/F#)', key: 'E', minor: true, chords: ['Em(add9)', 'Cmaj7', 'G', 'D/F#'],
    about: 'E minor with the open B and E strings ringing over everything; the F# in the bass leads back to Em.' },
  { id: 'walk', name: 'Walking bass (C – G/B – Am – Am/G – Fmaj7 – C/E – Dm7 – G)', key: 'C', chords: ['C', 'G/B', 'Am', 'Am/G', 'Fmaj7', 'C/E', 'Dm7', 'G'],
    about: 'The bass walks down the C major scale (C B A G F E D) under the chords, like a classical piece.' },
  { id: 'float', name: 'Floating (Em9 – Cmaj7 – Gmaj7 – D/F#)', key: 'E', minor: true, chords: ['Em9', 'Cmaj7', 'Gmaj7', 'D/F#'],
    about: 'Ninths and major sevenths everywhere: an ambient, open sound with very little fretting.' },
]

/** Which picking patterns go with which progression, and the level of each pairing. */
export const FS_COMBOS: [string, string, 1 | 2 | 3][] = [
  ['peace', 'arp-up', 1], ['peace', 'arp-updown', 1], ['peace', 'falling', 2], ['peace', 'travis', 2], ['peace', 'arp-16', 3], ['peace', 'synco', 3],
  ['glow', 'arp-up', 1], ['glow', 'arp-pinch', 2], ['glow', 'falling', 2], ['glow', 'roll', 3],
  ['melan', 'arp-updown', 1], ['melan', 'arp-pinch', 2], ['melan', 'arp-16', 3],
  ['canon', 'arp-up', 2], ['canon', 'arp-updown', 2], ['canon', 'travis', 3], ['canon', 'arp-16', 3],
  ['spanish', 'arp-updown', 2], ['spanish', 'falling', 2], ['spanish', 'arp-16', 3],
  ['dream', 'arp-up', 1], ['dream', 'arp-pinch', 2],
  ['ballad', 'arp-updown', 1], ['ballad', 'pinch2', 2], ['ballad', 'roll', 3],
  ['walk', 'arp-up', 2], ['walk', 'arp-updown', 2], ['walk', 'travis', 3],
  ['float', 'arp-pinch', 2], ['float', 'falling', 2], ['float', 'arp-16', 3],
]

/** Rename a chord for a capo (Cadd9 with a capo on 2 sounds as Dadd9). */
function moveName(name: string, by: number, key: string, minor: boolean) {
  return name.replace(/([A-G][#b]?)/g, (m: string) => spell(pc(m) + by, key, minor))
}
/** Put a song written in open position under a capo: the notes sound higher, the chord names follow. */
export function underCapo(s: Song, capo: number, key: string, minor: boolean): Song {
  if (!capo) return s
  return {
    ...s,
    tracks: s.tracks.map(t => ({
      ...t, capo,
      bars: t.bars.map(b => ({ steps: b.steps.map(st => ({ ...st, notes: st.notes.map(n => ({ ...n, midi: n.midi + capo })), ...(st.chord ? { chord: moveName(st.chord, capo, key, minor) } : {}) })) })),
    })),
  }
}

/** A progression picked with a pattern, in any key a capo (0–7) reaches. */
export function fromLush(progId: string, patternId: string, label: string): Make {
  const p = FS_PROGS.find(x => x.id === progId)!
  return ({ root, inst, bpm }) => {
    if (!isStandard(inst.midis)) return null
    const capo = ((pc(root) - pc(p.key)) % 12 + 12) % 12
    if (capo > 7) return null
    const chords = p.chords.map(n => ({ name: n, root: LUSH[n].bass, voicing: lushVoicing(n), beats: 4 }))
    const s = pickingSong(chords, patternId, STD, { title: `${label} (${keyLabel(root, !!p.minor)})`, bpm, times: p.chords.length >= 8 ? 1 : 2, program: 25 })
    return underCapo(s, capo, root, !!p.minor)
  }
}

/** Studies written out as tab (standard tuning, open position; other keys with a capo). */
export const FS_ETUDES: { id: string; name: string; level: 1 | 2 | 3 | 4; key?: string; minor?: boolean; bpm: number; tech: string[]; about: string; tab: string }[] = [
  { id: 'pima-open', name: 'p-i-m-a on the open strings', level: 1, bpm: 70, tech: ['finger'],
    about: 'Thumb (p) on the 6th, 5th and 4th strings, then index, middle and ring (i, m, a) on the 3rd, 2nd and top string. Rest each finger on its string before you play it.',
    tab: 'e 6:0 3:0 2:0 1:0 5:0 3:0 2:0 1:0 4:0 3:0 2:0 1:0 5:0 3:0 2:0 1:0 6:0 3:0 2:0 1:0 5:0 3:0 2:0 1:0 w 6:0+3:0+2:0+1:0' },
  { id: 'thumb-indep', name: 'Thumb independence: steady bass, melody on top', level: 2, key: 'G', bpm: 66, tech: ['finger', 'indep'],
    about: 'The thumb keeps a steady beat on the bass while the fingers play a tune on the top strings. Practise the bass alone first until it runs on autopilot.',
    tab: 'e 6:3+1:3 2:3 4:0+1:2 2:3 6:3+1:0 2:3 4:0+1:2 2:3 5:3+1:3 2:3 4:2+1:0 2:3 5:3+1:3 2:3 4:2+1:5 2:3 6:0+1:3 2:3 4:2+1:2 2:3 6:0+1:0 2:3 4:2+1:2 2:3 6:2+1:2 2:3 4:0+1:0 2:3 6:2+1:2 2:3 4:0+1:3 2:3 w 6:3+4:0+3:0+2:3+1:3' },
  { id: 'sus2-hammer', name: 'Hammer-ons inside the arpeggio (sus2 to major)', level: 2, key: 'A', bpm: 72, tech: ['finger', 'hammer'],
    about: 'Pick the sus2 chord, then hammer the open string up to the major 3rd without picking it again: the chord "blooms". A favourite touch in melodic fingerstyle.',
    tab: 'e 5:0 4:2 3:2 2:0 2:2h 3:2 4:2 3:2 4:0 3:2 2:3 1:0 1:2h 2:3 3:2 2:3 5:0 4:2 3:2 2:0 2:2h 3:2 4:2 3:2 6:0 5:2 4:2 3:1 2:0 3:1 4:2 5:2 w 5:0+4:2+3:2+2:2+1:0' },
  { id: 'sus4-pull', name: 'Pull-offs inside the arpeggio (sus4 to major)', level: 2, key: 'D', bpm: 72, tech: ['finger', 'pull'],
    about: 'Each chord starts as a sus4 and the fourth pulls off to the 3rd: tension, then release, inside one arpeggio.',
    tab: 'e 4:0 3:2 2:3 1:3 1:2p 2:3 3:2 2:3 5:0 4:2 3:2 2:3 2:2p 3:2 4:2 3:2 6:3 4:0 3:0 2:1 2:0p 3:0 4:0 3:0 5:0 4:2 3:2 2:3 2:2p 3:2 4:2 3:2 w 4:0+3:2+2:3+1:2' },
  { id: 'bells', name: 'Harmonic bells over the open bass', level: 2, bpm: 66, tech: ['finger', 'harm'],
    about: 'Touch the string right above the 12th, 7th or 5th fret (don\'t press) and pluck: bell tones. The open bass strings ring underneath.',
    tab: 'e 6:0 3:12n 2:12n 1:12n 4:0 3:12n 2:12n 1:12n 5:0 3:7n 2:7n 1:7n 4:0 3:7n 2:7n 1:7n 6:0 3:5n 2:5n 1:5n 4:0 3:5n 2:5n 1:5n w 6:0+3:12n+2:12n+1:12n' },
  { id: 'cascade-g', name: 'Cascading G major scale (two octaves)', level: 3, key: 'G', bpm: 72, tech: ['finger', 'stretch'],
    about: 'Every note of the scale on a different string from the one before, so each note keeps ringing into the next like a harp. Let them overlap; don\'t lift your fingers early.',
    tab: 'e 6:3 5:0 6:7 5:3 4:0 5:7 4:4 3:0 4:7 2:0 3:5 2:3 1:0 2:7 1:3 2:7 1:0 2:3 3:5 2:0 4:7 3:0 4:4 5:7 4:0 5:3 6:7 5:0 h 6:3+5:2+4:0+3:0+2:3+1:3' },
  { id: 'cascade-em', name: 'Cascading E minor scale', level: 3, key: 'E', minor: true, bpm: 72, tech: ['finger', 'stretch'],
    about: 'The same harp-like trick in E minor: open G, B and E strings between fretted notes, so the scale sounds like falling water.',
    tab: 'e 6:0+5:7 4:4 3:0 4:7 2:0 3:5 2:3 1:0 2:7 1:3 2:7 1:0 2:3 3:5 2:0 4:7 3:0 4:4 6:0+5:7 4:4 3:0 4:7 2:0 3:5 2:3 1:0 2:3 3:5 2:0 4:7 3:0 4:4 w 6:0+5:2+4:2+3:0+2:0+1:0' },
  { id: 'cascade-am', name: 'Cascading A minor scale', level: 3, key: 'A', minor: true, bpm: 72, tech: ['finger', 'stretch'],
    about: 'A minor from the low A up to the open high E, every note on a new string. Hold each fretted note until it has to move.',
    tab: 'e 5:0 6:7 5:3 4:0 5:7 4:3 3:0 4:7 2:0 3:5 2:3 1:0 2:3 3:5 2:0 4:7 3:0 4:3 5:7 4:0 5:3 6:7 h 5:0+4:2+3:2+2:1+1:0' },
  { id: 'cascade-g3', name: 'Cascading G major scale in triplets', level: 4, key: 'G', bpm: 72, tech: ['finger', 'stretch', 'speed'],
    about: 'The two-octave cascade in triplets: three notes a beat, still letting every note ring. Keep the right hand relaxed and even.',
    tab: 't 6:3 5:0 6:7 5:3 4:0 5:7 4:4 3:0 4:7 2:0 3:5 2:3 1:0 2:7 1:3 2:7 1:0 2:3 3:5 2:0 4:7 3:0 4:4 5:7 4:0 5:3 6:7 5:0 6:3 r h 6:3+5:2+4:0+3:0+2:3+1:3' },
  { id: 'spanish', name: 'Spanish melody over Am – G – F – E', level: 3, key: 'A', minor: true, bpm: 76, tech: ['finger', 'theory'],
    about: 'A melody in A harmonic minor (the G# on the E chord is what makes it sound Spanish) with the thumb on the bass on each beat 1. Play the bass and the first melody note together.',
    tab: 'e 5:0+1:0 1:1 1:0 2:3 2:1 2:0 2:1 3:2 6:3+2:3 1:0 2:3 2:1 2:0 3:2 2:0 3:0 4:3+3:2 2:1 1:1 1:0 2:3 2:1 3:2 2:1 6:0+2:0 3:1 2:0 1:0 2:3 2:0 3:1 4:2 5:0+1:0 1:1 1:0 2:3 2:1 2:0 2:1 3:2 6:3+2:3 1:0 2:3 2:1 2:0 3:2 2:0 3:0 4:3+3:2 2:1 1:1 1:0 2:3 2:1 3:2 2:1 6:0+2:0 3:1 2:0 1:0 q 2:3 3:1 w 5:0+4:2+3:2+2:1+1:0' },
  { id: 'chord-melody', name: 'Chord melody: G – Cadd9 – Em7 – D/F#', level: 3, key: 'G', bpm: 70, tech: ['finger', 'chords'],
    about: 'The tune on the top string with the chord\'s bass underneath, played together. Make the melody notes a little louder than the rest.',
    tab: 'q 6:3+1:3 e 2:3 1:3 q 4:0+1:5 e 1:3 2:3 q 5:3+1:3 e 2:3 1:3 q 4:2+1:0 e 2:3 1:3 q 6:0+1:3 e 2:3 1:3 q 4:2+1:2 e 1:3 2:3 q 6:2+1:2 e 2:3 1:2 q 4:0+1:0 e 2:3 1:2 q 6:3+1:3 e 2:3 1:3 q 4:0+1:5 e 1:3 2:3 q 5:3+1:3 e 2:3 1:3 q 4:2+1:0 e 2:3 1:3 q 6:2+1:2 e 2:3 1:3 q 4:0+1:5 e 1:3 2:3 w 6:3+5:2+4:0+3:0+2:3+1:3' },
]
