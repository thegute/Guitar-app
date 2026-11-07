// The on-phone music models through KGuitar's own TypeScript (resampling, log-mel, chunking, note and beat
// post-processing), checked against the models' own Python code and against the right answers. Not part of npm test
// (the models are ~180 MB and are downloaded on first use, never kept in the repo):
//   KG_MODELS=<folder with guitar_crnn.onnx(.data), beat_this.onnx>  KG_BENCH=<folder made by the bench scripts>
//   ORT_NODE=<folder holding node_modules/onnxruntime-node>  npm run bench:ml
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { logMel, resample } from '../src/ml/dsp'
import { BEAT, NOTE, beatChunk, beatChunks, beatsFrom, gridFrom, joinBeatChunks, joinNoteChunks, noteChunks, notesFrom, type NoteOut } from '../src/ml/post'
import { analyse } from '../src/audio/tempo'

const M = process.env.KG_MODELS ?? '/tmp/claude-0/models'
const B = process.env.KG_BENCH ?? '/tmp/claude-0/bench'
const req = createRequire(join(process.env.ORT_NODE ?? '/tmp/claude-0/ort', 'x.js'))
const ort = req('onnxruntime-node') as typeof import('onnxruntime-node')

/** a float32 .npy (1-D or 2-D, C order) */
function npy(path: string): { data: Float32Array; shape: number[] } {
  const b = readFileSync(path)
  const hl = b.readUInt16LE(8)
  const header = b.subarray(10, 10 + hl).toString('latin1')
  const shape = /'shape': \(([^)]*)\)/.exec(header)![1].split(',').map(s => s.trim()).filter(Boolean).map(Number)
  const off = 10 + hl
  const data = new Float32Array(b.buffer.slice(b.byteOffset + off, b.byteOffset + b.length))
  return { data, shape }
}
const f1 = (est: { t: number; m: number }[], ref: { t: number; m: number }[], tol = 0.05) => {
  const used = new Set<number>()
  let hit = 0
  for (const r of ref) {
    let bi = -1, bd = Infinity
    est.forEach((e, i) => { const d = Math.abs(e.t - r.t); if (!used.has(i) && e.m === r.m && d <= tol && d < bd) { bd = d; bi = i } })
    if (bi >= 0) { used.add(bi); hit++ }
  }
  const p = est.length ? hit / est.length : 0, r = ref.length ? hit / ref.length : 0
  return p + r ? (2 * p * r) / (p + r) : 0
}
const beatF = (est: number[], ref: number[], tol = 0.07) => f1(est.map(t => ({ t, m: 0 })), ref.map(t => ({ t, m: 0 })), tol)

;(async () => {
  let problems = 0
  const bad = (m: string) => { problems++; console.log('  PROBLEM ' + m) }

  // 1 log-mel = torchaudio LogMelSpect
  {
    const x = npy(join(B, 'mel_x.npy')).data, ref = npy(join(B, 'mel_ref.npy'))
    const m = logMel(x)
    let err = 0, mx = 0
    for (let i = 0; i < ref.data.length; i++) { err = Math.max(err, Math.abs(m.data[i] - ref.data[i])); mx = Math.max(mx, Math.abs(ref.data[i])) }
    console.log(`log-mel: ${m.frames} frames (torchaudio ${ref.shape[0]}), biggest difference ${err.toExponential(2)} (values up to ${mx.toFixed(2)})`)
    if (m.frames !== ref.shape[0] || err > 1e-3 * Math.max(1, mx)) bad('log-mel differs from torchaudio')
  }
  // 2 resampling ≈ scipy.signal.resample_poly with a long Kaiser window (a high-quality reference)
  {
    const x = npy(join(B, 'rs_x.npy')).data, ref = npy(join(B, 'rs_ref.npy')).data
    const y = resample(x, 22050, 16000)
    let e = 0, s = 0
    for (let i = 2000; i < Math.min(y.length, ref.length) - 2000; i++) { e += (y[i] - ref[i]) ** 2; s += ref[i] ** 2 }
    const db = 10 * Math.log10(e / s)
    console.log(`resample 22050→16000: ${y.length} samples (scipy ${ref.length}), difference ${db.toFixed(1)} dB`)
    if (Math.abs(y.length - ref.length) > 1 || db > -40) bad('resampling differs from scipy resample_poly (Kaiser)')
  }

  // 3 guitar notes
  {
    const sess = await ort.InferenceSession.create(join(M, 'guitar_crnn.onnx'))
    const meta = JSON.parse(readFileSync(join(B, 'audio/meta.json'), 'utf8')) as { name: string; truth: [number, number][] }[]
    const pyNotes = JSON.parse(readFileSync(join(B, 'audio/notes_ref.json'), 'utf8')) as Record<string, [number, number][]>
    let fT = 0, fP = 0, secs = 0, audioSecs = 0
    for (const m of meta) {
      const x22 = npy(join(B, `audio/${m.name}.npy`)).data
      const x = resample(x22, 22050, 16000)
      audioSecs += x.length / 16000
      const t0 = Date.now()
      const starts = noteChunks(x.length)
      const outs: NoteOut[] = []
      for (const s of starts) {
        const seg = new Float32Array(NOTE.chunk)
        seg.set(x.subarray(s, Math.min(x.length, s + NOTE.chunk)))
        const r = await sess.run({ waveform: new ort.Tensor('float32', seg, [1, NOTE.chunk]) })
        outs.push({ onset: r.reg_onset_output.data as Float32Array, offset: r.reg_offset_output.data as Float32Array, frame: r.frame_output.data as Float32Array, velocity: r.velocity_output.data as Float32Array })
      }
      const frames = Math.floor((x.length / 16000) * 100) + 1
      const notes = notesFrom(joinNoteChunks(outs, frames), frames)
      secs += (Date.now() - t0) / 1000
      const est = notes.map(n => ({ t: n.start, m: n.midi }))
      const a = f1(est, m.truth.map(([t, mm]) => ({ t, m: mm })))
      const b = f1(est, pyNotes[m.name].map(([t, mm]) => ({ t, m: mm })), 0.015)
      fT += a; fP += b
      if (b < 0.97) bad(`${m.name}: notes differ from the Python reference (agreement ${b.toFixed(2)})`)
    }
    console.log(`guitar notes: right ${(fT / meta.length * 100).toFixed(1)}% (vs the true notes), same as Python ${(fP / meta.length * 100).toFixed(1)}%, ${secs.toFixed(0)} s for ${audioSecs.toFixed(0)} s of audio`)
  }

  // 4 beats
  {
    const sess = await ort.InferenceSession.create(join(M, 'beat_this.onnx'))
    const meta = JSON.parse(readFileSync(join(B, 'rhythm/meta.json'), 'utf8')) as { name: string; bpm: number; meter: number; beats: number[]; downbeats: number[] }[]
    const ref = JSON.parse(readFileSync(join(B, 'rhythm/ref.json'), 'utf8')) as Record<string, { beats: number[]; downbeats: number[] }>
    let okBpm = 0, okMeter = 0, dspBpm = 0, agree = 0
    for (const m of meta) {
      const x = npy(join(B, `rhythm/${m.name}.npy`)).data
      const sp = logMel(x)
      const starts = beatChunks(sp.frames)
      const preds = []
      for (const s of starts) {
        const c = beatChunk(sp.data, sp.frames, s)
        const r = await sess.run({ spect: new ort.Tensor('float32', c.data, [1, c.frames, BEAT.mels]) })
        preds.push({ beat: r.beat.data as Float32Array, downbeat: r.downbeat.data as Float32Array })
      }
      const j = joinBeatChunks(preds, starts, sp.frames)
      const { beats, downbeats } = beatsFrom(j.beat, j.downbeat)
      const g = gridFrom(beats, downbeats)
      const same = beatF(beats, ref[m.name].beats, 0.021)
      agree += same
      const dsp = analyse(x, 22050)
      const right = !!g && Math.abs(g.bpm / m.bpm - 1) < 0.015
      if (right) okBpm++
      if (g?.beatsPerBar === m.meter) okMeter++
      if (dsp && Math.abs(dsp.bpm / m.bpm - 1) < 0.015) dspBpm++
      console.log(`  ${m.name.padEnd(28)} ${g?.bpm} BPM, ${g?.beatsPerBar}/bar (true ${m.bpm}, ${m.meter}) · beats F ${beatF(beats, m.beats).toFixed(2)} · same as Python ${same.toFixed(2)} · old detector ${dsp?.bpm}`)
      if (same < 0.97) bad(`${m.name}: beats differ from the Python reference`)
    }
    console.log(`beats: tempo right ${okBpm}/${meta.length}, beats per bar right ${okMeter}/${meta.length}, same as Python ${(agree / meta.length * 100).toFixed(0)}% · the old detector got the tempo right ${dspBpm}/${meta.length}`)
  }
  console.log(problems ? `${problems} problem(s)` : 'ml bench: all good')
  process.exit(problems ? 1 : 0)
})()
