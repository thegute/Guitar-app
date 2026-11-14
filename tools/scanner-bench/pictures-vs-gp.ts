// Strict score of the tab-picture reader against the Guitar Pro file of the same printed pages.
// Each staff read is aligned to ONE contiguous stretch of one track (Smith–Waterman local alignment of steps: a step = the
// set of string:fret played together). Reported:
//   note precision  = notes in aligned matching steps / notes read
//   note recall     = GP notes covered by aligned stretches that were read right / GP notes in those stretches
//   step rhythm     = matched steps whose length (quarters) equals the GP length
//   chance          = the same score for the staff's steps shuffled (what a reader that only got the notes but not
//                     their order would score): shows the alignment isn't flattering
import { readFileSync, readdirSync } from 'node:fs'
import { readTab } from '../../src/scan/tabRead'
import { deskew } from '../../src/scan/image'
import { readTabCrnn, type CrnnRun } from '../../src/scan/crnnRead'
import { pathToFileURL } from 'node:url'
let run: CrnnRun | null = null
if (process.env.MODEL) {
  // the Node build of ONNX Runtime Web (run from the repo's root)
  const ort = await import(pathToFileURL(process.cwd() + '/node_modules/onnxruntime-web/dist/ort.node.min.mjs').href)
  const sess = await ort.InferenceSession.create(process.env.MODEL)
  run = async (strip, W) => { const r = await sess.run({ strip: new ort.Tensor('float32', strip, [1, 1, 160, W]) }); const f = (k: string) => r[k].data as Float32Array; return { T: W / 4, heat: f('heat'), off: f('off'), frets: f('frets'), dur: f('dur'), dots: f('dots'), tup: f('tup'), grace: f('grace'), stroke: f('stroke') } }
}
import { importGuitarPro } from '../../src/tabs/gpImport'

const dir = process.argv[2], gp = process.argv[3]
const song = importGuitarPro(new Uint8Array(readFileSync(gp)), 'x')
type St = { key: string; n: number; dur: number }
const keyOf = (ns: { string: number; fret: number; dead?: boolean; tech?: string }[]) => ns.map(n => `${n.string}:${n.dead || n.tech === 'x' ? 'x' : n.fret}`).sort().join('+')
const tracks: St[][] = song.tracks.filter(t => t.tuning.length === 6).map(t => t.bars.flatMap(b => b.steps.filter(s => s.notes.length).map(s => ({ key: keyOf(s.notes), n: s.notes.length, dur: s.dur }))))

function align(a: St[], b: St[]) {
  // local alignment; match +2 (exact step), partial (shares a note) +0.5, mismatch -1, gap -1
  const m = a.length, n = b.length
  const H = new Float32Array((m + 1) * (n + 1)), P = new Uint8Array((m + 1) * (n + 1))
  let best = 0, bi = 0, bj = 0
  const share = (x: string, y: string) => { const s = new Set(x.split('+')); return y.split('+').some(t => s.has(t)) }
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    const s = a[i - 1].key === b[j - 1].key ? 2 : share(a[i - 1].key, b[j - 1].key) ? 0.5 : -1
    const d = H[(i - 1) * (n + 1) + j - 1] + s, u = H[(i - 1) * (n + 1) + j] - 1, l = H[i * (n + 1) + j - 1] - 1
    let v = 0, p = 0
    if (d > v) { v = d; p = 1 } if (u > v) { v = u; p = 2 } if (l > v) { v = l; p = 3 }
    H[i * (n + 1) + j] = v; P[i * (n + 1) + j] = p
    if (v > best) { best = v; bi = i; bj = j }
  }
  // trace back
  let i = bi, j = bj, okNotes = 0, gpNotes = 0, steps = 0, rhythm = 0
  const j1 = bj
  while (i > 0 && j > 0 && P[i * (n + 1) + j]) {
    const p = P[i * (n + 1) + j]
    if (p === 1) {
      gpNotes += b[j - 1].n
      if (a[i - 1].key === b[j - 1].key) { okNotes += a[i - 1].n; steps++; if (Math.abs(a[i - 1].dur - b[j - 1].dur) < 0.01) rhythm++ }
      else { const s = new Set(a[i - 1].key.split('+')); okNotes += b[j - 1].key.split('+').filter(t => s.has(t)).length }
      i--; j--
    } else if (p === 2) i--
    else { gpNotes += b[j - 1].n; j-- }
  }
  return { score: best, okNotes, gpNotes, steps, rhythm, span: [j, j1] }
}

let read = 0, ok = 0, gpN = 0, steps = 0, rhy = 0, chanceOk = 0, staves = 0
const per: string[] = []
for (const f of readdirSync(dir).filter(f => f.endsWith('.gray')).sort()) {
  const buf = readFileSync(dir + '/' + f); const w = buf.readUInt32LE(0), h = buf.readUInt32LE(4)
  const px = new Float32Array(w * h); for (let i = 0; i < w * h; i++) px[i] = buf[8 + i] / 255
  const r = run ? await readTabCrnn({ w, h, px }, run) : readTab(deskew({ w, h, px }).g)
  for (const s of r.systems) {
    const a: St[] = s.bars.flatMap(b => b.steps.filter(st => st.notes.length).map(st => ({ key: keyOf(st.notes), n: st.notes.length, dur: st.dur })))
    if (a.length < 2) continue
    staves++
    const nRead = a.reduce((x, y) => x + y.n, 0)
    let best = { score: -1 } as ReturnType<typeof align>
    for (const t of tracks) { const al = align(a, t); if (al.score > best.score) best = al }
    // chance: shuffled steps
    const sh = a.slice(); for (let k = sh.length - 1; k > 0; k--) { const q = (k * 7919 + 13) % (k + 1); [sh[k], sh[q]] = [sh[q], sh[k]] }
    let cb = { score: -1 } as ReturnType<typeof align>
    for (const t of tracks) { const al = align(sh, t); if (al.score > cb.score) cb = al }
    read += nRead; ok += best.okNotes; gpN += best.gpNotes; steps += a.length; rhy += best.rhythm; chanceOk += cb.okNotes
    if (process.env.V) per.push(`${f} ${nRead} read, ${best.okNotes} right of ${best.gpNotes} in GP stretch, rhythm ${best.rhythm}/${best.steps}`)
  }
}
if (process.env.V) console.log(per.join('\n'))
const pc = (x: number, y: number) => (100 * x / Math.max(1, y)).toFixed(1) + '%'
console.log(`${staves} staves | notes read ${read} | precision ${pc(ok, read)} | recall ${pc(ok, gpN)} | rhythm right ${pc(rhy, steps)} of steps | chance ${pc(chanceOk, read)}`)
