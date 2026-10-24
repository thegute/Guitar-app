// Accuracy test bench for the follow-along: recorded guitar notes (the app's sample banks), played as tab-like
// phrases under different conditions, through the old snapshot detector and the new one. Prints, per condition,
// how much of each phrase the follow-along got through and how many times it wrongly said "wrong note".
//   npx -y esbuild@0.25 tests/detect-eval.ts --bundle --platform=node --format=esm --outfile=node_modules/.tmp/detect-eval.mjs && node node_modules/.tmp/detect-eval.mjs
import './test-env'
import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { PitchDetector } from 'pitchy'
import { NoteDetector } from '../src/audio/noteDetect'
import { matchNote, type FollowStep } from '../src/tabs/follow'

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
  // amp banks keep their single notes under "notes"
  const idx = (typeof Object.values(raw)[0] === 'string' ? raw : raw.notes) as Record<string, string>
  const m = new Map<number, Float32Array>()
  for (const [k, f] of Object.entries(idx)) {
    const x = decode(dir + f)
    // leave out samples with a stray second pluck in the recording (they'd test the recording, not the detector)
    const w = 441, env: number[] = []
    for (let i = 0; i + w < x.length; i += w) { let s = 0; for (let j = i; j < i + w; j++) s += x[j] * x[j]; env.push(Math.sqrt(s / w) + 1e-6) }
    const bad = env.some((e, i) => i >= 15 && e > 0.02 && e > 1.6 * Math.min(...env.slice(i - 3, i)))
    if (!bad) m.set(+k, x)
  }
  return m
}
/** one note from the nearest sample, pitch-shifted like the app does */
function noteAudio(bank: Bank, midi: number, len: number, gain: number): Float32Array {
  let key = [...bank.keys()].reduce((a, b) => (Math.abs(b - midi) < Math.abs(a - midi) ? b : a))
  const src = bank.get(key)!
  const rate = Math.pow(2, (midi - key) / 12)
  const out = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    const p = i * rate, j = Math.floor(p)
    if (j + 1 >= src.length) break
    out[i] = (src[j] + (src[j + 1] - src[j]) * (p - j)) * gain
  }
  return out
}

let seed = 12345
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
interface Phrase { name: string; notes: { midi: number; at: number }[]; ring: boolean; tab?: number[] }
function phrases(): Phrase[] {
  const out: Phrase[] = []
  const scale = [0, 2, 4, 5, 7, 9, 11]
  const inScale = (m: number) => scale.includes(((m - 43) % 12 + 12) % 12)
  const walk = (n: number, lo: number, hi: number, dt: number, repeat: number, start: number) => {
    const ns: { midi: number; at: number }[] = []
    let m = start
    for (let i = 0; i < n; i++) {
      if (i && rnd() >= repeat) {
        let next = m
        for (let tries = 0; tries < 20; tries++) { const c = m + Math.round((rnd() - 0.5) * 8); if (c >= lo && c <= hi && inScale(c) && c !== m) { next = c; break } }
        m = next
      }
      ns.push({ midi: m, at: 0.3 + i * dt })
    }
    return ns
  }
  out.push({ name: 'melody, 8ths @100', notes: walk(32, 43, 79, 0.3, 0.2, 55), ring: false })
  out.push({ name: 'fast 16ths @100', notes: walk(32, 52, 76, 0.15, 0.1, 64), ring: false })
  out.push({ name: 'low strings', notes: walk(20, 40, 55, 0.45, 0.15, 43), ring: false })
  const reps: { midi: number; at: number }[] = []
  ;[55, 57, 59, 60, 62].forEach((m, k) => { for (let i = 0; i < 4; i++) reps.push({ midi: m, at: 0.3 + (k * 4 + i) * 0.28 }) })
  out.push({ name: 'repeated notes', notes: reps, ring: false })
  // mistakes: every 4th note is first played a whole step off, then corrected
  const tab = walk(16, 50, 74, 0.3, 0, 59)
  const played: { midi: number; at: number }[] = []
  let tt = 0.3
  tab.forEach((n, i) => { if (i % 4 === 2) { played.push({ midi: n.midi + 2, at: tt }); tt += 0.3 } played.push({ midi: n.midi, at: tt }); tt += 0.3 })
  out.push({ name: 'mistakes (4 wrong)', notes: played, ring: false, tab: tab.map(n => n.midi) } as Phrase)
  // wrong string: every 4th note first played a 5th lower (its overtones include the right note an octave up)
  const tab2 = walk(16, 57, 76, 0.3, 0, 64)
  const played2: { midi: number; at: number }[] = []
  let t2 = 0.3
  tab2.forEach((n, i) => { if (i % 4 === 2) { played2.push({ midi: n.midi - 7, at: t2 }); t2 += 0.3 } played2.push({ midi: n.midi, at: t2 }); t2 += 0.3 })
  out.push({ name: 'wrong: a 5th low (4)', notes: played2, ring: false, tab: tab2.map(n => n.midi) } as Phrase)
  out.push({ name: 'arpeggio, ringing', notes: [43, 50, 55, 59, 62, 59, 55, 50, 45, 52, 57, 60, 64, 60, 57, 52].map((m, i) => ({ midi: m, at: 0.3 + i * 0.3 })), ring: true })
  return out
}

interface Cond { name: string; bank: string; drive: number; snr: number; hpf: number; gain: number; external: boolean }
const CONDS: Cond[] = [
  { name: 'acoustic, quiet room', bank: 'acoustic', drive: 0, snr: 60, hpf: 0, gain: 0.5, external: false },
  { name: 'acoustic, phone mic + noisy room', bank: 'acoustic', drive: 0, snr: 16, hpf: 150, gain: 0.35, external: false },
  { name: 'acoustic, soft playing', bank: 'acoustic', drive: 0, snr: 26, hpf: 120, gain: 0.08, external: false },
  { name: 'electric clean (USB amp)', bank: 'electric', drive: 0, snr: 45, hpf: 0, gain: 0.5, external: true },
  { name: 'electric distorted (USB amp)', bank: 'electric', drive: 18, snr: 40, hpf: 0, gain: 0.5, external: true },
  // real amp tones (5150 high gain, clean Fender-style) through the USB amp
  { name: 'high-gain amp tone (USB amp)', bank: 'metal', drive: 0, snr: 40, hpf: 0, gain: 0.5, external: true },
  { name: 'clean amp tone (USB amp)', bank: 'clean', drive: 0, snr: 45, hpf: 0, gain: 0.5, external: true },
  { name: 'acoustic J-45, phone mic', bank: 'j45', drive: 0, snr: 22, hpf: 150, gain: 0.35, external: false },
]

function render(p: Phrase, c: Cond, bank: Bank): Float32Array {
  const end = p.notes[p.notes.length - 1].at + 1.6
  const out = new Float32Array(Math.ceil(end * SR))
  p.notes.forEach((n, i) => {
    const start = Math.round(n.at * SR)
    const next = p.notes[i + 1]
    // picked notes stop when the next one starts (short release); ringing notes keep going
    const stopAt = !p.ring && next ? Math.round(next.at * SR) : out.length
    const len = out.length - start
    const a = noteAudio(bank, n.midi, len, c.gain * (0.75 + rnd() * 0.5))
    for (let k = 0; k < len; k++) {
      const t = start + k
      let g = 1
      if (t >= stopAt) { g = Math.max(0, 1 - (t - stopAt) / (0.03 * SR)) ; if (g <= 0) break }
      out[t] += a[k] * g
    }
  })
  if (c.drive) {
    let lp = 0
    for (let i = 0; i < out.length; i++) { const d = Math.tanh(out[i] * c.drive) / Math.tanh(c.drive) * 0.5; lp += (d - lp) * 0.35; out[i] = lp }
  }
  if (c.hpf) {
    const a = Math.exp((-2 * Math.PI * c.hpf) / SR)
    let y = 0, x1 = 0
    for (let i = 0; i < out.length; i++) { const x = out[i]; y = a * (y + x - x1); x1 = x; out[i] = y }
  }
  // room noise (pinkish) at the given signal-to-noise ratio
  let sig = 0
  for (let i = 0; i < out.length; i++) sig += out[i] * out[i]
  sig = Math.sqrt(sig / out.length)
  const nAmp = sig / Math.pow(10, c.snr / 20)
  let b0 = 0, b1 = 0
  for (let i = 0; i < out.length; i++) { const w = rnd() * 2 - 1; b0 = 0.99 * b0 + w * 0.1; b1 = 0.9 * b1 + w * 0.3; out[i] += (b0 + b1 + w * 0.2) * nAmp * 1.2 }
  return out
}

/** The previous listener: a 4096-sample snapshot ~60 times a second, volume-jump attacks, pitch by MPM. */
function oldDetector(x: Float32Array, external: boolean, onNote: (m: number, t: number) => void) {
  const det = PitchDetector.forFloat32Array(4096)
  det.minVolumeDecibels = -55
  const hop = Math.round(SR / 60)
  const buf = new Float32Array(4096)
  let noise = 0.004, lastOnset = -1, pendingAttack = 0, lastEmitted: number | null = null, lastEmitTime = -1, cand: number | null = null, candFrames = 0
  const levels: number[] = []
  const onsetRatio = external ? 1.35 : 1.7, gate = 1
  for (let end = 4096; end <= x.length; end += hop) {
    buf.set(x.subarray(end - 4096, end))
    const now = end / SR
    let s = 0
    for (let i = 4096 - 1024; i < 4096; i++) s += buf[i] * buf[i]
    const level = Math.sqrt(s / 1024)
    if (level < noise * 1.5) noise = noise * 0.98 + level * 0.02
    const recentMin = levels.length ? Math.min(...levels) : level
    levels.push(level); if (levels.length > 5) levels.shift()
    const loud = level > Math.max(0.006 * gate, noise * 3 * gate)
    if (loud && level > recentMin * onsetRatio && now - lastOnset > 0.08) { lastOnset = now; pendingAttack = 8; cand = null; candFrames = 0 }
    const [freq, clarity] = det.findPitch(buf, SR)
    let midi: number | null = null
    if (loud && clarity > 0.88 && freq > 60 && freq < 1400) midi = Math.round(12 * Math.log2(freq / 440) + 69)
    if (!loud) { if (level < noise * 2) lastEmitted = null; pendingAttack = Math.max(0, pendingAttack - 1); continue }
    if (midi === null) { pendingAttack = Math.max(0, pendingAttack - 1); continue }
    if (midi === cand) candFrames++
    else { cand = midi; candFrames = 1 }
    if (candFrames < 2) { pendingAttack = Math.max(0, pendingAttack - 1); continue }
    if (pendingAttack > 0) { lastEmitted = midi; lastEmitTime = now; onNote(midi, now); pendingAttack = 0 }
    else if (midi !== lastEmitted && now - lastEmitTime > 0.06 && candFrames >= 3) { lastEmitted = midi; lastEmitTime = now; onNote(midi, now) }
  }
}

function follow(steps: FollowStep[], run: (expect: (midis: number[], after: number[]) => void, onEvent: (midi: number) => void) => void) {
  let idx = 0, wrong = 0
  const expectNow = (exp: (midis: number[], after: number[]) => void) => exp(steps[idx]?.midis ?? [], steps[idx + 1]?.midis ?? [])
  let setExp: ((m: number[], a: number[]) => void) | null = null
  run(exp => { setExp = exp; expectNow(exp) }, midi => {
    const r = matchNote(steps, idx, midi)
    if (r.kind === 'hit') idx = r.step + 1
    else if (r.kind === 'miss') wrong++
    if (setExp) expectNow(setExp)
  })
  return { got: idx, wrong }
}

const banks: Record<string, Bank> = {}
const ps = phrases()
let totOld = 0, totNew = 0, tot = 0, wrongOld = 0, wrongNew = 0
console.log('condition'.padEnd(38), 'phrase'.padEnd(20), 'old: got  wrong', '  new: got  wrong')
for (const c of CONDS) {
  banks[c.bank] ??= loadBank(c.bank)
  for (const p of ps) {
    const x = render(p, c, banks[c.bank])
    const steps: FollowStep[] = (p.tab ?? p.notes.map(n => n.midi)).map(m => ({ midis: [m] }))
    const o = follow(steps, (_exp, ev) => oldDetector(x, c.external, m => ev(m)))
    const n = follow(steps, (exp, ev) => {
      const d = new NoteDetector(SR)
      d.onNote = e => ev(e.midi)
      exp((m, a) => d.expect(m, a))
      const chunk = 512
      for (let i = 0; i < x.length; i += chunk) d.push(x.subarray(i, Math.min(x.length, i + chunk)))
    })
    tot += steps.length; totOld += o.got; totNew += n.got; wrongOld += o.wrong; wrongNew += n.wrong
    console.log(c.name.padEnd(38), p.name.padEnd(20), `${String(o.got).padStart(4)}/${steps.length}  ${String(o.wrong).padStart(4)}`, `   ${String(n.got).padStart(4)}/${steps.length}  ${String(n.wrong).padStart(4)}`)
  }
}
console.log(`\nTOTAL  old: ${totOld}/${tot} notes (${Math.round((totOld / tot) * 100)}%), ${wrongOld} false "wrong note"   new: ${totNew}/${tot} (${Math.round((totNew / tot) * 100)}%), ${wrongNew} false "wrong note"`)
if (existsSync('/dev/null')) process.exitCode = 0

// DEBUG=c,p  → show what the new detector did on one condition/phrase
if (process.env.DEBUG) {
  const [ci, pi] = process.env.DEBUG.split(',').map(Number)
  const c = CONDS[ci], p = ps[pi]
  banks[c.bank] ??= loadBank(c.bank)
  const x = render(p, c, banks[c.bank])
  const d = new NoteDetector(SR) as NoteDetector & Record<string, unknown>
  let k = 0
  const want = p.tab ?? p.notes.map(n => n.midi)
  d.expect([want[0]], [want[1]])
  const onsets: number[] = []
  d.onOnset = t => onsets.push(t)
  if (process.env.DEBUG2) d.debug = x => { const t = d.time; if (t > +process.env.DEBUG2! && t < +process.env.DEBUG2! + 1.2) console.log(`    @${t.toFixed(2)} best ${x.best} top ${JSON.stringify(x.ranked)} exp ${JSON.stringify(x.exp)}`) }
  d.onNote = e => { console.log(`  note ${e.midi} at ${e.time.toFixed(3)} ${e.attack ? 'attack' : 'legato'} exp=${e.expected} conf=${e.conf.toFixed(2)}  (want ${want[k]})`); if (e.expected) { k = Math.max(k + 1, want.indexOf(e.midi, k) + 1); d.expect([want[k]].filter(x => x !== undefined), [want[k + 1]].filter(x => x !== undefined)) } }
  for (let i = 0; i < x.length; i += 512) d.push(x.subarray(i, Math.min(x.length, i + 512)))
  console.log('true onsets', p.notes.slice(0, 12).map(n => n.at.toFixed(2)).join(' '))
  console.log('found onsets', onsets.slice(0, 14).map(t => t.toFixed(2)).join(' '), `(${onsets.length} of ${p.notes.length})`)
}
if (process.env.DEBUG) { const [, pi] = process.env.DEBUG.split(',').map(Number); console.log('true notes', ps[pi].notes.slice(0, 16).map(n => `${n.midi}@${n.at.toFixed(2)}`).join(' ')) }
