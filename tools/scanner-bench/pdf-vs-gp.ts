// Strict score of the shape reader (vector PDF) against a Guitar Pro file: same alignment as eval2.ts.
import { readFileSync } from 'node:fs'
import { readPdf } from '../../src/tabs/pdfTab'
import { readVectorTab } from '../../src/scan/vectorTab'
import { graceLead } from '../../src/scan/tabRead'
import { importGuitarPro } from '../../src/tabs/gpImport'
const [pdf, from, to, gp] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4]), process.argv[5]]
const song = importGuitarPro(new Uint8Array(readFileSync(gp)), 'x')
type St = { key: string; n: number; dur: number }
const keyOf = (ns: { string: number; fret: number; dead?: boolean; tech?: string }[]) => ns.map(n => `${n.string}:${n.dead || n.tech === 'x' ? 'x' : n.fret}`).sort().join('+')
const tracks: St[][] = song.tracks.filter(t => t.tuning.length === 6).map(t => t.bars.flatMap(b => b.steps.filter(s => s.notes.length).map(s => ({ key: keyOf(s.notes), n: s.notes.length, dur: s.dur }))))
function align(a: St[], b: St[]) {
  const m = a.length, n = b.length
  const H = new Float32Array((m + 1) * (n + 1)), P = new Uint8Array((m + 1) * (n + 1))
  let best = 0, bi = 0, bj = 0
  const share = (x: string, y: string) => { const s = new Set(x.split('+')); return y.split('+').some(t => s.has(t)) }
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    const s = a[i - 1].key === b[j - 1].key ? (Math.abs(a[i - 1].dur - b[j - 1].dur) < 0.01 ? 2.2 : 2) : share(a[i - 1].key, b[j - 1].key) ? 0.5 : -1
    const d = H[(i - 1) * (n + 1) + j - 1] + s, u = H[(i - 1) * (n + 1) + j] - 1, l = H[i * (n + 1) + j - 1] - 1
    let v = 0, p = 0
    if (d > v) { v = d; p = 1 } if (u > v) { v = u; p = 2 } if (l > v) { v = l; p = 3 }
    H[i * (n + 1) + j] = v; P[i * (n + 1) + j] = p
    if (v > best) { best = v; bi = i; bj = j }
  }
  let i = bi, j = bj, okNotes = 0, gpNotes = 0, steps = 0, rhythm = 0
  const bad: string[] = []
  while (i > 0 && j > 0 && P[i * (n + 1) + j]) {
    const p = P[i * (n + 1) + j]
    if (p === 1) {
      gpNotes += b[j - 1].n
      if (a[i - 1].key === b[j - 1].key) { okNotes += a[i - 1].n; steps++; if (Math.abs(a[i - 1].dur - b[j - 1].dur) < 0.01) { rhythm++; bad.push(`ok ${a[i - 1].key} ${+a[i - 1].dur.toFixed(3)}`) } else bad.push(`dur ${a[i - 1].key} ${+a[i - 1].dur.toFixed(3)}≠${b[j - 1].dur}`) }
      else { const s = new Set(a[i - 1].key.split('+')); okNotes += b[j - 1].key.split('+').filter(t => s.has(t)).length; bad.push(`read ${a[i - 1].key} gp ${b[j - 1].key}`) }
      i--; j--
    } else if (p === 2) { bad.push(`extra ${a[i - 1].key}`); i-- }
    else { bad.push(`missed ${b[j - 1].key}`); gpNotes += b[j - 1].n; j-- }
  }
  return { score: best, okNotes, gpNotes, steps, rhythm, bad: bad.reverse() }
}
const pages = await readPdf(new Uint8Array(readFileSync(pdf)), from, to)
let read = 0, ok = 0, gpN = 0, steps = 0, rhy = 0, staves = 0, rr = 0
const metersSeen: string[] = []
let start: { beats: number; sig: [number, number] } | undefined
for (const [pi, pg] of pages.entries()) {
  const r = readVectorTab(pg.shapes ?? [], { texts: pg.texts, height: pg.height, glyphs: pg.glyphs, startMeter: start })
  const lm = r?.meters[r.meters.length - 1]; if (lm) start = { beats: lm.beats, sig: lm.sig }
  if (!r) continue
  rr += r.rhythmRead
  metersSeen.push(...r.meters.map(m => `${m.sig.join('/')}`))
  for (const s of r.systems) {
    graceLead(s.bars)
    const a: St[] = s.bars.flatMap(b => b.steps.filter(st => st.notes.length).map(st => ({ key: keyOf(st.notes), n: st.notes.length, dur: st.dur })))
    if (a.length < 2) continue
    staves++
    let best = { score: -1 } as ReturnType<typeof align>
    for (const t of tracks) { const al = align(a, t); if (al.score > best.score) best = al }
    read += a.reduce((x, y) => x + y.n, 0); ok += best.okNotes; gpN += best.gpNotes; steps += a.length; rhy += best.rhythm
    if (process.env.V === '3') console.log(`p${from + pi} y${(s.lines[5] / 4).toFixed(0)}`, best.bad.join(' | '))
    else if (process.env.V && best.bad.some(x => !x.startsWith('dur') || process.env.V === '2')) console.log(`p${from + pi}`, best.bad.filter(x => !x.startsWith('dur') || process.env.V === '2').slice(0, 12).join(' | '))
  }
}
const pc = (x: number, y: number) => (100 * x / Math.max(1, y)).toFixed(1) + '%'
console.log(`${staves} staves | notes read ${read} | precision ${pc(ok, read)} | recall ${pc(ok, gpN)} | rhythm right ${pc(rhy, steps)} (${rr} from stems) | meters ${[...new Set(metersSeen)].join(' ')}`)
