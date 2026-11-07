// Riff Scanner accuracy bench: notes (F1 at ±50 ms, exact pitch) and techniques (hammer-on, pull-off, slide, bend, vibrato) on
// pieces whose right answers are known (tools/ml-bench/make_legato.py). Not part of npm test (needs the rendered audio):
//   python3 tools/ml-bench/make_legato.py /tmp/claude-0/bench/legato
//   ORT_NODE=<folder with node_modules/onnxruntime-node>  npm run bench:scan  [pieceFilter]
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as bp from '@spotify/basic-pitch'
import { bpRaw, heardNotes, NOTE_RULES, type BPRaw, type HeardNote, type NoteRules } from '../src/audio/transcribe'
import { makeEvidence, markTechniques } from '../src/ml/legato'
import type { Note } from '../src/ml/post'
import { notesToSong } from '../src/ml/toTab'
import { separate } from '../src/ml/stems'

const DIR = process.env.KG_LEGATO ?? '/tmp/claude-0/bench/legato'
const req = createRequire(join(process.env.ORT_NODE ?? '/tmp/claude-0/ort', 'x.js'))
const ort = req('onnxruntime-node') as typeof import('onnxruntime-node')

interface Truth { t: number; dur: number; midi: number; tech: string; pick: boolean; to?: number; soft?: boolean }
interface Meta { name: string; bpm: number; kind: 'dry' | 'video'; truth: Truth[] }

/** a float32 / 16-bit mono .wav */
function wav(path: string): Float32Array {
  const b = readFileSync(path)
  let o = 12, fmt = 1, bits = 16
  while (o < b.length) {
    const id = b.toString('ascii', o, o + 4), len = b.readUInt32LE(o + 4)
    if (id === 'fmt ') { fmt = b.readUInt16LE(o + 8); bits = b.readUInt16LE(o + 22) }
    if (id === 'data') {
      const n = len / (bits / 8), out = new Float32Array(n)
      for (let i = 0; i < n; i++) out[i] = fmt === 3 ? b.readFloatLE(o + 8 + i * 4) : b.readInt16LE(o + 8 + i * 2) / 32768
      return out
    }
    o += 8 + len + (len & 1)
  }
  throw new Error('no data in ' + path)
}

export interface Score { tp: number; est: number; ref: number }
/** Match estimated notes to true ones (same pitch, onset within `tol` s; each used once). Returns the match for each true note. */
export function match(est: { start: number; midi: number }[], ref: Truth[], tol = 0.05): (number | null)[] {
  const used = new Set<number>()
  return ref.map(r => {
    const t = r.soft ? Math.max(tol, 0.12) : tol
    let bi = -1, bd = Infinity
    est.forEach((e, i) => { const d = Math.abs(e.start - r.t); if (!used.has(i) && e.midi === r.midi && d <= t && d < bd) { bd = d; bi = i } })
    if (bi >= 0) used.add(bi)
    return bi >= 0 ? bi : null
  })
}
const f1 = (s: Score) => { const p = s.est ? s.tp / s.est : 0, r = s.ref ? s.tp / s.ref : 0; return p + r ? (2 * p * r) / (p + r) : 0 }


async function main() {
  const filter = process.argv[2] ?? ''
  const meta = (JSON.parse(readFileSync(join(DIR, 'legato-meta.json'), 'utf8')) as Meta[]).filter(m => m.name.includes(filter))
  const sess = await ort.InferenceSession.create(join(process.cwd(), 'public/models/basic-pitch/nmp.onnx'))
  const run = async (win: Float32Array) => {
    const r = await sess.run({ [sess.inputNames[0]]: new ort.Tensor('float32', win, [1, win.length, 1]) })
    const g = (k: string) => (r[`StatefulPartitionedCall:${k}`].data as Float32Array).slice()
    return { frames: g('1'), onsets: g('2'), contours: g('0') }
  }
  const configs: { name: string; rules: NoteRules }[] = [
    { name: 'now 0.5/0.3/11', rules: NOTE_RULES },
    { name: '0.4/0.3/6', rules: { onset: 0.4, frame: 0.3, minFrames: 6 } },
    { name: '0.3/0.25/4', rules: { onset: 0.3, frame: 0.25, minFrames: 4 } },
    { name: '0.25/0.2/3', rules: { onset: 0.25, frame: 0.2, minFrames: 3 } },
  ]
  const raws = new Map<string, { raw: BPRaw; audio: Float32Array }>()
  // KG_STEMS=<the 6-stem .onnx>: every piece is first put through the guitar stem (what the app does for video sound)
  let stemRun: ((mix: Float32Array) => Promise<Float32Array>) | null = null
  if (process.env.KG_STEMS) {
    const ss = await ort.InferenceSession.create(process.env.KG_STEMS)
    stemRun = async mix => ((await ss.run({ mix: new ort.Tensor('float32', mix, [1, 2, 343980]) })).stems.data as Float32Array).slice()
  }
  for (const m of meta) {
    let audio = wav(join(DIR, m.name + '.wav'))
    if (stemRun && m.kind === 'video') { const t0 = Date.now(); audio = await separate(audio, 22050, stemRun, 'guitar'); console.log(`guitar stem of ${m.name}: ${((Date.now() - t0) / 1000).toFixed(0)} s`) }
    raws.set(m.name, { raw: await bpRaw(audio, run), audio })
  }
  techReport(meta, raws, { onset: 0.4, frame: 0.3, minFrames: 6 }, 'with techniques (0.4/0.3/6)')
  gridReport(meta, raws)
  for (const kind of ['dry', 'video'] as const) {
    console.log(`\n== ${kind} ==  (note F1 / recall / precision)`)
    const sel = meta.filter(m => m.kind === kind)
    console.log('piece'.padEnd(24) + configs.map(c => c.name.padEnd(22)).join(''))
    const tot = configs.map(() => ({ tp: 0, est: 0, ref: 0 }))
    for (const m of sel) {
      let line = m.name.replace('.' + kind, '').padEnd(24)
      configs.forEach((c, ci) => {
        const notes = heardNotes(bp, raws.get(m.name)!.raw, c.rules).filter(n => n.amp >= 0.18 || true)
        const mt = match(notes, m.truth)
        const tp = mt.filter(x => x !== null).length
        tot[ci].tp += tp; tot[ci].est += notes.length; tot[ci].ref += m.truth.length
        const s = { tp, est: notes.length, ref: m.truth.length }
        line += `${(f1(s) * 100).toFixed(0)}/${((s.tp / s.ref) * 100).toFixed(0)}/${((s.tp / Math.max(1, s.est)) * 100).toFixed(0)}`.padEnd(22)
      })
      console.log(line)
    }
    console.log('ALL'.padEnd(24) + tot.map(s => `${(f1(s) * 100).toFixed(0)}/${((s.tp / s.ref) * 100).toFixed(0)}/${((s.tp / Math.max(1, s.est)) * 100).toFixed(0)}`.padEnd(22)).join(''))
  }
}

/** Notes + techniques: Basic Pitch with relaxed rules, then the technique pass. */
export function withTechniques(raw: BPRaw, audio: Float32Array, rules: NoteRules): Note[] {
  const heard: Note[] = heardNotes(bp, raw, rules).map(n => ({ start: n.start, end: n.start + n.dur, midi: n.midi, velocity: n.amp }))
  return markTechniques(heard, makeEvidence(raw.contours, audio))
}

function techReport(meta: Meta[], raws: Map<string, { raw: BPRaw; audio: Float32Array }>, rules: NoteRules, label: string, audioFor?: (name: string) => Float32Array) {
  for (const kind of ['dry', 'video'] as const) {
    const sel = meta.filter(m => m.kind === kind)
    if (!sel.length) continue
    const tot = { tp: 0, est: 0, ref: 0 }
    const conf: Record<string, Record<string, number>> = {}
    let falseMarks = 0, plain = 0
    for (const m of sel) {
      const { raw, audio } = raws.get(m.name)!
      const notes = withTechniques(raw, audioFor ? audioFor(m.name) : audio, rules)
      const mt = match(notes, m.truth)
      tot.tp += mt.filter(x => x !== null).length; tot.est += notes.length; tot.ref += m.truth.length
      const matched = new Set(mt.filter((x): x is number => x !== null))
      m.truth.forEach((t, i) => {
        const j = mt[i]
        if (!t.tech) { if (j !== null) { plain++; if (notes[j].tech) falseMarks++ } return }
        const got = j === null ? 'missed' : notes[j].tech || 'plain'
        ;(conf[t.tech] ??= {})[got] = (conf[t.tech][got] ?? 0) + 1
      })
      void matched
    }
    console.log(`\n== ${label}, ${kind}: notes F1 ${(f1(tot) * 100).toFixed(0)} (recall ${((tot.tp / tot.ref) * 100).toFixed(0)}, precision ${((tot.tp / tot.est) * 100).toFixed(0)}); marks put on plain notes: ${falseMarks} of ${plain}`)
    console.log('truth technique -> what the scanner wrote')
    for (const [t, row] of Object.entries(conf)) console.log(`  ${t.padEnd(3)} `, Object.entries(row).map(([k, v]) => `${k}:${v}`).join('  '))
  }
}


/** Notes that get into the tab vs notes heard (what the grid loses), and marks that reach the tab. */
function gridReport(meta: Meta[], raws: Map<string, { raw: BPRaw; audio: Float32Array }>) {
  console.log('\n== tab: notes heard -> notes in the tab (dry pieces, steady tempo from the piece) ==')
  for (const m of meta.filter(x => x.kind === 'dry')) {
    const { raw, audio } = raws.get(m.name)!
    const notes = withTechniques(raw, audio, { onset: 0.4, frame: 0.3, minFrames: 6 })
    const song = notesToSong(notes, { tuning: [40, 45, 50, 55, 59, 64], title: m.name, chords: false, grid: null, bpm: m.bpm })
    const steps = song ? song.tracks[0].bars.flatMap(b => b.steps).filter(st => st.notes.length) : []
    const marks = steps.flatMap(st => st.notes).filter(n => n.tech).length
    console.log(m.name.padEnd(26), `heard ${String(notes.length).padStart(3)}  in tab ${String(steps.length).padStart(3)}  true ${String(m.truth.length).padStart(3)}  marks in tab ${marks}`)
  }
}

if (process.argv[1]?.includes('scan-bench')) main().catch(e => { console.error(e); process.exit(1) })
