// "Sample to a pad": a scanned riff onto the next free pad of Your pads in the beat maker. When the scan came from a
// recording, the real sound goes on the pad (from its first note, up to 12 s); a tab read off the screen is played by
// KGuitar into the pad instead (the same sound as Hear it). Its root note is found so Keys mode plays it in tune.
import type { SongDoc } from '../tabs/library'
import { flatten } from '../tabs/model'
import { TabPlayer } from '../audio/tabPlayer'
import { TapRecorder } from '../audio/tap'
import { audio, masterInput } from '../audio/engine'
import { activeSound, soundForProgram } from '../audio/pluck'
import { saveSample } from '../studio/padSamples'
import { detectRoot, padName, trimSilence, USER_PADS } from '../studio/pads'
import { loadBeat, pushBeat } from '../studio/beat'

const MAX = 12

export async function riffToPad(doc: SongDoc, sound?: { x: Float32Array; sr: number; from?: number }, onNote?: (s: string) => void): Promise<string> {
  let data: Float32Array, sr: number
  if (sound) {
    sr = sound.sr
    const a = Math.max(0, Math.round((sound.from ?? 0) * sr))
    data = sound.x.slice(a, a + MAX * sr)
  } else {
    // play the tab and record what KGuitar plays (never the mic)
    const track = doc.song.tracks[0]
    const flat = flatten(track)
    const bpm = doc.song.tempo ?? 90
    const secs = Math.min(MAX, flat.reduce((t, f) => t + f.step.dur, 0) * (60 / bpm) + 0.8)
    const ctx = audio(); await ctx.resume()
    const rec = new TapRecorder()
    await rec.start(masterInput()) // everything KGuitar plays, before the master
    const p = new TabPlayer()
    p.sound = activeSound(soundForProgram(track.program))
    const t0 = ctx.currentTime + 0.15
    p.play(flat, 0, bpm)
    onNote?.(`Recording it onto a pad (${Math.ceil(secs)} s)…`)
    const got = await rec.capture(t0, secs)
    p.stop(); rec.stop()
    sr = ctx.sampleRate
    data = new Float32Array(got.l.length)
    for (let i = 0; i < data.length; i++) data[i] = (got.l[i] + got.r[i]) / 2
  }
  const cut = trimSilence(data, sr)
  data = data.slice(Math.floor(cut.start * sr), Math.ceil(cut.end * sr))
  if (data.length < sr * 0.05) throw new Error('There was no sound to put on a pad.')
  const beat = loadBeat()
  const free = USER_PADS.find(p => !beat.pads?.[p]) ?? USER_PADS[USER_PADS.length - 1]
  const id = `scan-${Date.now().toString(36)}`
  await saveSample(id, data, sr)
  pushBeat({ ...beat, pads: { ...beat.pads, [free]: { src: 'rec', sample: id, start: 0, end: data.length / sr, root: detectRoot(data, sr) ?? undefined, name: doc.title.slice(0, 18), mode: 'oneshot' } } })
  return `It's on pad ${padName(free)} of Your pads (Jam → Make a beat).`
}
