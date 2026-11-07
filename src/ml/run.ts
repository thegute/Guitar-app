// A whole recording through the on-phone models.
//   guitarNotes  16 kHz, 10 s chunks moving 8 s on; after the first chunk it knows how fast this phone is, says how
//                long the rest will take, and (when that's over the limit) asks before going on
//   beatGrid     Beat This! on the log-mel spectrogram in 30 s chunks → beats, downbeats, tempo, beats per bar
import { resample, logMel } from './dsp'
import { NOTE, beatChunk, beatChunks, beatsFrom, gridFrom, joinBeatChunks, joinNoteChunks, noteChunks, notesFrom, type BeatGrid, type Note, type NoteOut } from './post'
import { beatRunner, noteRunner } from './models'

const tick = () => new Promise(r => setTimeout(r, 0))

export interface NotesOpts {
  signal?: AbortSignal
  /** 0..1 */
  onProgress?: (f: number, note: string) => void
  /** after the first chunk: the whole job will take about `secs`; return false to stop (asked when over `limit`) */
  confirm?: (secs: number) => Promise<boolean>
  /** seconds; default 120 */
  limit?: number
}

export async function guitarNotes(x: Float32Array, sr: number, o: NotesOpts = {}): Promise<{ notes: Note[]; where: string; secs: number }> {
  const t0 = performance.now()
  const audio = resample(x, sr, NOTE.sr)
  const runner = await noteRunner()
  const starts = noteChunks(audio.length)
  const outs: NoteOut[] = []
  for (let i = 0; i < starts.length; i++) {
    if (o.signal?.aborted) throw new Error('Cancelled.')
    const seg = new Float32Array(NOTE.chunk)
    seg.set(audio.subarray(starts[i], Math.min(audio.length, starts[i] + NOTE.chunk)))
    const c0 = performance.now()
    outs.push(await runner.run(seg))
    const per = (performance.now() - c0) / 1000
    if (i === 0 && starts.length > 1) {
      const total = per * starts.length
      if (total > (o.limit ?? 120) && o.confirm && !(await o.confirm(Math.round(total)))) throw new Error('Cancelled.')
    }
    const left = Math.round(per * (starts.length - i - 1))
    o.onProgress?.((i + 1) / starts.length, left > 0 ? `about ${left < 60 ? `${left} s` : `${Math.round(left / 60)} min`} left` : 'nearly done')
    await tick()
  }
  const frames = Math.floor((audio.length / NOTE.sr) * 100) + 1
  const notes = notesFrom(joinNoteChunks(outs, frames), frames)
  return { notes, where: runner.where, secs: (performance.now() - t0) / 1000 }
}

export async function beatGrid(x: Float32Array, sr: number, o: { signal?: AbortSignal; onProgress?: (f: number) => void } = {}): Promise<BeatGrid | null> {
  const audio = resample(x, sr, 22050)
  const sp = logMel(audio)
  const runner = await beatRunner()
  const starts = beatChunks(sp.frames)
  const preds: { beat: Float32Array; downbeat: Float32Array }[] = []
  for (let i = 0; i < starts.length; i++) {
    if (o.signal?.aborted) throw new Error('Cancelled.')
    const c = beatChunk(sp.data, sp.frames, starts[i])
    preds.push(await runner.run(c.data, c.frames))
    o.onProgress?.((i + 1) / starts.length)
    await tick()
  }
  const j = joinBeatChunks(preds, starts, sp.frames)
  const { beats, downbeats } = beatsFrom(j.beat, j.downbeat)
  return gridFrom(beats, downbeats)
}
