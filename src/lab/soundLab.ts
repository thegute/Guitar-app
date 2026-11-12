// The sound lab (Stage 3, notes/AUDIO-ENGINE.md): fixed musical scenes played through the app's real sound code, so the
// engine can be recorded and measured the same way before and after every change (tests/browser/sound-lab.cjs →
// tools/sound-report.py). Test builds only: main.tsx loads this lazily when window.__kgTest is set.
import { audio } from '../audio/engine'
import { strum, playNote, loadSound, type SoundId } from '../audio/pluck'
import { loadKit, playGrooveBar } from '../audio/drums'
import { JamTransport } from '../audio/jam'
import { TabPlayer } from '../audio/tabPlayer'
import { Metronome } from '../audio/metronome'
import { exampleDoc, EXAMPLES } from '../tabs/examples'
import { flatten } from '../tabs/model'
import { STYLE_DEFAULTS } from '../theory/progressions'

const G = [43, 47, 50, 55, 59, 67], C = [48, 52, 55, 60, 64], D = [50, 57, 62, 66], EM = [40, 47, 52, 55, 59, 64]
const AM = [45, 52, 57, 60, 64], F = [41, 48, 53, 57, 60, 65]
const POWER = [[40, 47, 52], [45, 52, 57], [43, 50, 55], [38, 45, 50]]

export interface Scene { id: string; label: string; seconds: number; prepare: () => Promise<void>; play: (t0: number) => void | (() => void) }

/** a strummed 4-chord loop, down / down-up pattern, in one sound */
function strumScene(id: string, sound: SoundId, chords: number[][], bpm = 90): Scene {
  const spb = 60 / bpm
  return {
    id: `strum-${id}`, label: `Strums, ${sound}`, seconds: chords.length * 4 * spb + 1.5,
    prepare: () => loadSound(sound),
    play: t0 => {
      chords.forEach((ch, i) => {
        const bar = t0 + i * 4 * spb
        // D, D U, (3) U, D U: the "old faithful" pattern
        const hits: [number, boolean][] = [[0, false], [1, false], [1.5, true], [2.5, true], [3, false], [3.5, true]]
        for (const [b, up] of hits) strum(up ? ch.slice(-4) : ch, bar + b * spb, { up, sound, gain: up ? 0.55 : 0.8 })
      })
    },
  }
}
function notesScene(id: string, sound: SoundId, midis: number[], bpm = 100): Scene {
  const spb = 60 / bpm
  return {
    id: `notes-${id}`, label: `Single notes, ${sound}`, seconds: midis.length * 0.5 * spb + 2,
    prepare: () => loadSound(sound),
    play: t0 => { midis.forEach((m, i) => playNote(m, t0 + i * 0.5 * spb, 0.8, undefined, { sound })) },
  }
}

export const SCENES: Scene[] = [
  strumScene('acoustic', 'acoustic', [G, C, D, EM]),
  strumScene('j45', 'j45', [G, C, D, EM]),
  strumScene('nylon', 'nylon', [AM, F, G, C]),
  strumScene('clean', 'clean', [G, C, D, EM]),
  strumScene('crunch', 'crunch', POWER),
  strumScene('metal', 'metal', POWER, 120),
  notesScene('acoustic', 'acoustic', [43, 45, 47, 48, 50, 52, 54, 55, 57, 59, 60, 62, 64, 66, 67, 64, 60, 55]),
  notesScene('electric', 'electric', [57, 60, 62, 64, 67, 69, 72, 69, 67, 64, 62, 60]),
  notesScene('metal', 'metal', [40, 40, 43, 40, 45, 40, 46, 45, 43, 40]),
  {
    id: 'drums-rock', label: 'Drums, rock groove', seconds: 4 * 4 * (60 / 100) + 1,
    prepare: () => loadKit('rock'),
    play: t0 => { const spb = 60 / 100; for (let b = 0; b < 4; b++) playGrooveBar('rock', t0 + b * 4 * spb, spb, 1, undefined, 4, 0, { fill: b === 3, crash: b === 0 }) },
  },
  ...(['folk', 'rock', 'metal', 'reggae'] as const).map((style): Scene => {
    const jam = new JamTransport()
    const d = STYLE_DEFAULTS[style]
    return {
      id: `jam-${style}`, label: `Jam band, ${style} (its own strum, drums, bass and tone)`, seconds: 10,
      prepare: async () => {
        const sound = d.tone as SoundId
        const chords = (style === 'metal' ? POWER : [G, C, D, EM]).map(midis => ({ midis, beats: 4, root: midis[0] % 12, tones: style === 'metal' ? [0, 7] : [0, 4, 7] }))
        jam.setSong(chords, d.bpm, d.strum, d.drums, d.bass, sound)
        jam.setMix({ chords: true, drums: d.drums !== 'off', click: false, bass: d.bass !== 'off' })
        await loadSound(sound)
      },
      play: () => { jam.start(0); return () => jam.stop() },
    }
  }),
  {
    id: 'hearit-example', label: 'Hear it, first example tab', seconds: 12,
    prepare: () => loadSound('acoustic'),
    play: () => {
      const doc = exampleDoc(EXAMPLES[0].id)
      const tp = new TabPlayer()
      tp.sound = 'acoustic'
      tp.play(flatten(doc.song.tracks[0]), 0, 90)
      return () => tp.stop()
    },
  },
  {
    id: 'metronome', label: 'Metronome, wood click', seconds: 5,
    prepare: async () => { /* nothing to load */ },
    play: () => { const m = new Metronome(); m.bpm = 100; m.start(); return () => m.stop() },
  },
]

/** Play one scene now; resolves when it's over (and anything it started is stopped). */
export async function runScene(id: string): Promise<{ seconds: number }> {
  const s = SCENES.find(x => x.id === id)
  if (!s) throw new Error(`no scene ${id}`)
  await s.prepare()
  const ctx = audio()
  await ctx.resume()
  const t0 = ctx.currentTime + 0.3
  const stop = s.play(t0)
  await new Promise(r => setTimeout(r, s.seconds * 1000))
  if (typeof stop === 'function') stop()
  await new Promise(r => setTimeout(r, 400))
  return { seconds: s.seconds }
}
export const sceneIds = () => SCENES.map(s => s.id)
