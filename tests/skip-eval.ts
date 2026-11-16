// Skip-ahead bench: does the follow-along move on when you HAVEN'T played the next note yet?
// Recorded notes from the app's banks, each held long (ringing into silence), through clean / amp / driven tones,
// with and without a pedal-style delay. Counts "false hits": the cursor moving past a note that wasn't picked.
//   npx -y esbuild@0.25 tests/skip-eval.ts --bundle --platform=node --format=esm --outfile=node_modules/.tmp/skip-eval.mjs && node node_modules/.tmp/skip-eval.mjs
import './test-env'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { NoteDetector } from '../src/audio/noteDetect'
import { matchNote, type FollowStep } from '../src/tabs/follow'
import { accepted } from '../src/tabs/bends'

const SR = 44100
function decode(file: string): Float32Array {
  const r = spawnSync('ffmpeg', ['-v', 'quiet', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 })
  const b = r.stdout
  return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4).slice()
}
type Bank = Map<number, Float32Array>
function loadBank(id: string): Bank {
  const dir = `${process.cwd()}/public/samples/${id}/`
  const raw = JSON.parse(readFileSync(dir + 'index.json', 'utf8')) as Record<string, unknown>
  const idx = (typeof Object.values(raw)[0] === 'string' ? raw : raw.notes) as Record<string, string>
  const m = new Map<number, Float32Array>()
  for (const [k, f] of Object.entries(idx)) m.set(+k, decode(dir + f))
  return m
}
function noteAudio(bank: Bank, midi: number, len: number, gain: number): Float32Array {
  const key = [...bank.keys()].reduce((a, b) => (Math.abs(b - midi) < Math.abs(a - midi) ? b : a))
  const src = bank.get(key)!, rate = Math.pow(2, (midi - key) / 12), out = new Float32Array(len)
  for (let i = 0; i < len; i++) { const p = i * rate, j = Math.floor(p); if (j + 1 >= src.length) break; out[i] = (src[j] + (src[j + 1] - src[j]) * (p - j)) * gain }
  return out
}
let seed = 777
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }

interface Cond { name: string; bank: string; drive: number; delay: number; snr: number }
const CONDS: Cond[] = [
  { name: 'clean amp', bank: 'clean', drive: 0, delay: 0, snr: 45 },
  { name: 'clean amp + delay', bank: 'clean', drive: 0, delay: 0.4, snr: 45 },
  { name: 'electric driven', bank: 'electric', drive: 18, delay: 0, snr: 40 },
  { name: 'electric driven + delay', bank: 'electric', drive: 18, delay: 0.35, snr: 40 },
  { name: 'high-gain amp', bank: 'metal', drive: 0, delay: 0, snr: 40 },
  { name: 'high-gain amp + delay', bank: 'metal', drive: 0, delay: 0.3, snr: 40 },
  { name: 'acoustic', bank: 'acoustic', drive: 0, delay: 0, snr: 30 },
]

/** a tab line: scale steps, octave jumps, 5ths and 4ths (the intervals overtones fool), repeated notes */
function tabLine(n: number): number[] {
  const out = [52 + Math.floor(rnd() * 12)]
  const moves = [2, -2, 1, -1, 12, -12, 7, -7, 5, -5, 0, 3, -3, 4, -4, 19, 24]
  while (out.length < n) {
    const m = out[out.length - 1] + moves[Math.floor(rnd() * moves.length)]
    if (m >= 40 && m <= 84) out.push(m)
  }
  return out
}

function render(notes: { midi: number; at: number }[], end: number, c: Cond, bank: Bank) {
  const out = new Float32Array(Math.ceil(end * SR))
  notes.forEach((n, i) => {
    const start = Math.round(n.at * SR), next = notes[i + 1]
    const stopAt = next ? Math.round(next.at * SR) : out.length
    const a = noteAudio(bank, n.midi, out.length - start, 0.5 * (0.75 + rnd() * 0.5))
    for (let k = 0; k < a.length; k++) { const t = start + k; let g = 1; if (t >= stopAt) { g = 1 - (t - stopAt) / (0.03 * SR); if (g <= 0) break } out[t] += a[k] * g }
  })
  if (c.drive) { let lp = 0; for (let i = 0; i < out.length; i++) { const d = Math.tanh(out[i] * c.drive) / Math.tanh(c.drive) * 0.5; lp += (d - lp) * 0.35; out[i] = lp } }
  if (c.delay) { const D = Math.round(0.33 * SR); for (let i = D; i < out.length; i++) out[i] += out[i - D] * c.delay }
  let sig = 0
  for (let i = 0; i < out.length; i++) sig += out[i] * out[i]
  const nAmp = Math.sqrt(sig / out.length) / Math.pow(10, c.snr / 20)
  for (let i = 0; i < out.length; i++) out[i] += (rnd() * 2 - 1) * nAmp
  return out
}

const banks: Record<string, Bank> = {}
let totFalse = 0, totMissed = 0, totNotes = 0
console.log('condition'.padEnd(26), 'played  got  false-ahead  missed')
for (const c of CONDS) {
  banks[c.bank] ??= loadBank(c.bank)
  let F = 0, M = 0, N = 0, G = 0
  for (let trial = 0; trial < 12; trial++) {
    const tab = tabLine(14)
    // you play the first 8 notes, each held 1.1 s, then stop and let the last one ring for 3 s
    const k = 8
    const notes = tab.slice(0, k).map((m, i) => ({ midi: m, at: 0.4 + i * 1.1 }))
    const end = notes[k - 1].at + 3.5
    const x = render(notes, end, c, banks[c.bank])
    const steps: FollowStep[] = tab.map(m => ({ midis: [m] }))
    let idx = 0, hitTime = -Infinity
    const d = new NoteDetector(SR)
    if (c.bank !== 'acoustic') d.gate = 1
    const exp = () => d.expect(accepted(steps[idx]), accepted(steps[idx + 1]))
    exp()
    d.onNote = e => {
      const r = matchNote(steps, idx, e.midi, false, e.time - hitTime, e.attack)
      if (r.kind === 'hit') {
        // which note was really being played at that moment?
        const playing = notes.filter(n => n.at <= e.time + 0.06).length - 1
        if (r.step > playing) { F++; if (process.env.WHY) console.log(`   ${c.name} t${trial}: moved to step ${r.step + 1} at ${e.time.toFixed(2)}s (${e.attack ? 'pick' : 'legato'}, heard ${e.midi}) but you were on ${playing} (${tab.slice(0, 10).join(' ')})`) }
        idx = r.step + 1; hitTime = e.time
      }
      exp()
    }
    if (process.env.ONSETS && trial < 3) d.debugOnset = o => { const real = notes.some(n => Math.abs(n.at - o.at) < 0.04); console.log(`  ${c.name} ${real ? 'PICK ' : 'other'} @${o.at.toFixed(2)} flux ${o.flux.toFixed(1)} pre ${o.pre.toFixed(4)} post ${o.post.toFixed(4)} rise ${(o.post / Math.max(1e-4, o.pre)).toFixed(2)}`) }
    for (let i = 0; i < x.length; i += 512) d.push(x.subarray(i, Math.min(x.length, i + 512)))
    N += k; G += Math.min(idx, k); M += Math.max(0, k - idx)
  }
  totFalse += F; totMissed += M; totNotes += N
  console.log(c.name.padEnd(26), `${String(N).padStart(6)} ${String(G).padStart(5)} ${String(F).padStart(9)} ${String(M).padStart(9)}`)
}
console.log(`\nTOTAL false moves ahead: ${totFalse}   missed: ${totMissed} of ${totNotes}`)
