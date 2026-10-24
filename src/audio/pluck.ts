// Guitar sounds: recorded and amp-rendered sample banks (public/samples/<id>/), with a Karplus–Strong synth as the
// instant fallback while a bank loads. The amp tones were rendered offline from the owner's own amp captures and cab /
// body impulse responses (tools/render_tones.py); only the finished notes ship. Live guitar input is never processed here.
import { audio, out } from './engine'
import { midiToFreq } from '../theory/notes'

const cache = new Map<string, AudioBuffer>()

function render(ctx: BaseAudioContext, midi: number, bright: number): AudioBuffer {
  const sr = ctx.sampleRate
  const f = midiToFreq(midi)
  const dur = Math.max(1.4, 3.2 - (midi - 40) * 0.04)
  const n = Math.floor(sr * dur)
  const buf = ctx.createBuffer(1, n, sr)
  const y = buf.getChannelData(0)
  // loop delay = p (integer) + 0.5 (averaging filter) + allpass fraction
  const period = sr / f
  let p = Math.floor(period - 0.5)
  let frac = period - 0.5 - p
  if (frac < 0.1) {
    p -= 1
    frac += 1
  }
  const C = (1 - frac) / (1 + frac)
  // decay so every string rings for roughly the same musical time
  const t60 = Math.max(0.9, 3.5 - (midi - 40) * 0.07)
  const rho = Math.pow(10, (-3 * period) / (sr * t60))
  const line = new Float32Array(p)
  // excitation: filtered noise, brightness controls the pick
  let lp = 0
  for (let i = 0; i < p; i++) {
    const w = Math.random() * 2 - 1
    lp = lp + bright * (w - lp)
    line[i] = lp
  }
  // pluck position comb (about 1/5 along the string)
  const pick = Math.max(1, Math.floor(p / 5))
  const exc = Float32Array.from(line)
  for (let i = 0; i < p; i++) line[i] = exc[i] - 0.6 * exc[(i + pick) % p]
  let idx = 0
  let apX1 = 0
  let apY1 = 0
  for (let i = 0; i < n; i++) {
    const cur = line[idx]
    const nxt = line[(idx + 1) % p]
    const avg = 0.5 * (cur + nxt)
    const ap = C * avg + apX1 - C * apY1
    apX1 = avg
    apY1 = ap
    line[idx] = ap * rho
    y[i] = cur
    idx = (idx + 1) % p
  }
  // gentle attack and normalise
  let peak = 0
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(y[i]))
  const g = peak > 0 ? 0.6 / peak : 1
  for (let i = 0; i < n; i++) y[i] *= g * (i < 64 ? i / 64 : 1)
  return buf
}

function bufferFor(midi: number, bright = 0.55) {
  const ctx = audio()
  const key = `${midi}:${bright}`
  let b = cache.get(key)
  if (!b) {
    b = render(ctx, midi, bright)
    cache.set(key, b)
  }
  return b
}

// ---------- the sounds ----------
export type SoundId = 'acoustic' | 'j45' | 'nylon' | 'clean' | 'electric' | 'crunch' | 'metal' | 'synth'
export interface SoundInfo {
  id: SoundId
  label: string
  hint: string
  /** an amp tone: chords are levelled like a real amp compresses them, power chords and palm mutes are recorded whole */
  amp?: boolean
  /** how far up a backing part sits in Jam's mix (a metal rhythm guitar is the loudest thing in the room) */
  band?: number
}
export const SOUNDS: SoundInfo[] = [
  { id: 'acoustic', label: 'Acoustic', hint: 'Recorded steel-string acoustic.' },
  { id: 'j45', label: 'Acoustic J-45', hint: 'A steel string through your Gibson J-45 impulse response: bright, woody, big body.' },
  { id: 'nylon', label: 'Nylon', hint: 'Recorded classical guitar. Also the ukulele default.' },
  { id: 'clean', label: 'Clean electric', hint: "Neck pickup, clean amp, your '66 Deluxe Reverb cab impulse response." },
  { id: 'electric', label: 'Jazz electric', hint: 'Recorded electric guitar, warm and round.' },
  { id: 'crunch', label: 'Crunch', hint: 'Your Peavey 5150 capture (Brit green channel) into the Celestion V30 cab: classic rock and blues.', amp: true, band: 1.45 },
  { id: 'metal', label: 'Distorted', hint: 'Your Peavey 5150 red-channel capture with a boost, into the Mesa 4x12: real palm mutes and power chords, double-tracked left and right.', amp: true, band: 2.0 },
  { id: 'synth', label: 'Simple synth', hint: 'A light plucked-string synth. Nothing to download.' },
]
export const soundInfo = (id: SoundId) => SOUNDS.find(s => s.id === id) ?? SOUNDS[0]

/** The General MIDI guitar programs Guitar Pro files carry, mapped to the closest sound. */
export function soundForProgram(program: number | undefined): SoundId | null {
  if (program === undefined || program < 24 || program > 31) return null
  return (['nylon', 'acoustic', 'electric', 'clean', 'clean', 'crunch', 'metal', 'clean'] as SoundId[])[program - 24]
}

const SOUND_KEY = 'kg:sound'
type GroupId = 'notes' | 'pm' | 'power' | 'powerpm'
interface Sample { buf: AudioBuffer; off: number }
/** samples by note; several takes of a note are played in turn (and left/right when double-tracked) */
interface Group { keys: number[]; map: Map<number, Sample[]>; last: Map<number, number> }
interface Bank { groups: Partial<Record<GroupId, Group>> }
const banks = new Map<string, Bank>()
const loading = new Map<string, Promise<void>>()
const soundListeners = new Set<() => void>()

export function soundChoice(): 'auto' | SoundId {
  try {
    const v = JSON.parse(localStorage.getItem(SOUND_KEY) ?? '"auto"') as string
    return v === 'auto' || SOUNDS.some(s => s.id === v) ? (v as 'auto' | SoundId) : 'auto'
  } catch { return 'auto' }
}
export function setSoundChoice(c: 'auto' | SoundId) {
  try { localStorage.setItem(SOUND_KEY, JSON.stringify(c)) } catch { /* storage unavailable */ }
  void loadSound(activeSound())
  soundListeners.forEach(f => f())
}
export function onSoundChange(f: () => void) { soundListeners.add(f); return () => { soundListeners.delete(f) } }
/** The instrument's own default: steel-string acoustic for guitar, nylon for ukulele. */
export function instrumentSound(): SoundId {
  try {
    const inst = (JSON.parse(localStorage.getItem('kg:instrument') ?? '{}') as { id?: string }).id
    return inst === 'tenor' || inst === 'baritone' ? 'nylon' : 'acoustic'
  } catch { return 'acoustic' }
}
/** The sound in use: your choice, or the instrument's default. `suggested` (a song's own guitar sound) wins over the default. */
export function activeSound(suggested?: SoundId | null): SoundId {
  const c = soundChoice()
  if (c !== 'auto') return c
  const inst = instrumentSound()
  // a ukulele keeps its nylon sound when a tab only asks for "an acoustic guitar"
  if (inst === 'nylon' && (suggested === 'acoustic' || suggested === 'j45')) return inst
  return suggested ?? inst
}
export function soundLoaded(id: SoundId) { return id === 'synth' || banks.has(id) }
export const bankLoaded = (id: string) => id === 'synth' || banks.has(id)

/** Where the pluck starts in a decoded sample (MP3 decoders add a little silence in front, differently per browser). */
function onsetOf(buf: AudioBuffer) {
  const d = buf.getChannelData(0)
  const lim = Math.min(d.length, Math.floor(buf.sampleRate * 0.25))
  let pk = 0
  for (let i = 0; i < lim; i++) pk = Math.max(pk, Math.abs(d[i]))
  const thr = pk * 0.03
  let i = 0
  while (i < lim && Math.abs(d[i]) < thr) i++
  return Math.max(0, i - Math.floor(buf.sampleRate * 0.001)) / buf.sampleRate
}

/** Load a bank of samples (a few hundred KB, bundled with the app): a guitar sound, 'bass' or 'drums'. */
export function loadBank(id: string): Promise<void> {
  if (id === 'synth' || banks.has(id)) return Promise.resolve()
  let p = loading.get(id)
  if (!p) {
    p = (async () => {
      const ctx = audio()
      const index = (await (await fetch(`samples/${id}/index.json`)).json()) as Record<string, unknown>
      const first = Object.values(index)[0]
      // old banks: {midi: file}; amp banks: {notes: {...}, pm: {...}, power: {...}, powerpm: {...}}, a value being one
      // file or a list of takes
      const groupsIn = (typeof first === 'string' ? { notes: index } : index) as Record<string, Record<string, string | string[]>>
      const bank: Bank = { groups: {} }
      await Promise.all(Object.entries(groupsIn).map(async ([g, files]) => {
        const map = new Map<number, Sample[]>()
        await Promise.all(Object.entries(files).map(async ([m, file]) => {
          const takes = await Promise.all((Array.isArray(file) ? file : [file]).map(async f => {
            const buf = await ctx.decodeAudioData(await (await fetch(`samples/${id}/${f}`)).arrayBuffer())
            return { buf, off: onsetOf(buf) }
          }))
          map.set(Number(m), takes)
        }))
        bank.groups[g as GroupId] = { keys: [...map.keys()].sort((a, b) => a - b), map, last: new Map() }
      }))
      banks.set(id, bank)
    })().catch(() => { loading.delete(id) })
    loading.set(id, p)
  }
  return p
}
export const loadSound = (id: SoundId) => loadBank(id)

export interface Handle { stop: (at?: number) => void }

function nearest(g: Group, midi: number) {
  let best = g.keys[0]
  for (const n of g.keys) if (Math.abs(n - midi) < Math.abs(best - midi)) best = n
  return best
}

/** The next take of a note: a different one each time, so repeats don't sound copied. */
function take(g: Group, k: number, avoid = -1): { s: Sample; i: number } {
  const list = g.map.get(k)!
  if (list.length === 1) return { s: list[0], i: 0 }
  const last = g.last.get(k) ?? -1
  let i = Math.floor(Math.random() * list.length)
  for (let tries = 0; tries < 4 && (i === last || i === avoid); tries++) i = (i + 1) % list.length
  g.last.set(k, i)
  return { s: list[i], i }
}

function playSample(s: Sample, rate: number, when: number, gain: number, dest?: AudioNode, pan?: number): Handle {
  const ctx = audio()
  const src = ctx.createBufferSource()
  src.buffer = s.buf
  src.playbackRate.value = rate
  const g = ctx.createGain()
  g.gain.value = gain
  if (pan !== undefined && typeof ctx.createStereoPanner === 'function') {
    const p = ctx.createStereoPanner()
    p.pan.value = pan
    src.connect(g).connect(p).connect(dest ?? out())
  } else src.connect(g).connect(dest ?? out())
  const t = Math.max(when || ctx.currentTime, ctx.currentTime)
  src.start(t, s.off)
  return { stop: (at?: number) => { try { g.gain.setTargetAtTime(0, Math.max(at ?? ctx.currentTime, t), 0.035) } catch { /* noop */ } } }
}

function synthNote(midi: number, when: number, gain: number, dest?: AudioNode): Handle {
  const ctx = audio()
  const src = ctx.createBufferSource()
  src.buffer = bufferFor(midi)
  const g = ctx.createGain()
  g.gain.value = gain
  src.connect(g).connect(dest ?? out())
  const t = when || ctx.currentTime
  src.start(t)
  return { stop: (at?: number) => { try { g.gain.setTargetAtTime(0, at ?? ctx.currentTime, 0.03) } catch { /* noop */ } } }
}

export interface NoteOpts {
  /** which sound (default: the active sound) */
  sound?: SoundId
  /** palm muted */
  pm?: boolean
  /** double-tracked: two takes panned left and right (rhythm parts on the amp sounds) */
  double?: boolean
}

export function playNote(midi: number, when = 0, gain = 0.8, dest?: AudioNode, opts: NoteOpts = {}): Handle {
  const id = opts.sound ?? activeSound()
  const bank = banks.get(id)
  const t = when || audio().currentTime
  if (bank) {
    const pmGroup = opts.pm ? bank.groups.pm : undefined
    const g = pmGroup ?? bank.groups.notes!
    const k = nearest(g, midi)
    const rate = Math.pow(2, (midi - k) / 12)
    if (opts.double) {
      // a double-tracked rhythm part: two takes, hard left and right, a few ms apart (one take: a tiny detune)
      const a = take(g, k)
      const b = take(g, k, a.i)
      const same = b.i === a.i
      const hs = [playSample(a.s, rate, t, gain * 1.05, dest, -0.8),
        playSample(b.s, rate * (same ? Math.pow(2, 7 / 1200) : 1), t + 0.009 + Math.random() * 0.008, gain * 1.05, dest, 0.8)]
      const h = { stop: (at?: number) => hs.forEach(x => x.stop(at)) }
      if (opts.pm && !pmGroup) h.stop(t + 0.13)
      return h
    }
    const h = playSample(take(g, k).s, rate, t, gain * 1.3, dest)
    if (opts.pm && !pmGroup) h.stop(t + 0.13)
    return h
  }
  if (id !== 'synth') void loadSound(id)
  const h = synthNote(midi, t, gain, dest)
  if (opts.pm) h.stop(t + 0.12)
  return h
}

/** Root, fifth (and octave): the shape every rock and metal player calls a power chord. */
export function isPowerChord(midis: number[]) {
  const m = [...midis].sort((a, b) => a - b)
  return (m.length === 2 || m.length === 3) && m[1] - m[0] === 7 && (m.length === 2 || m[2] - m[0] === 12)
}

/** Strum notes (low to high for a downstroke). Amp tones play power chords as recorded chords. */
export function strum(midis: number[], when = 0, opts: { up?: boolean; spread?: number; gain?: number; dest?: AudioNode; sound?: SoundId; pm?: boolean; double?: boolean } = {}): Handle {
  const ctx = audio()
  const t0 = when || ctx.currentTime + 0.01
  const id = opts.sound ?? activeSound()
  const bank = banks.get(id)
  const gain = (opts.gain ?? 0.7) * (opts.up ? 0.75 : 1)
  if (bank && isPowerChord(midis)) {
    const g = opts.pm ? bank.groups.powerpm : bank.groups.power
    if (g) {
      const root = Math.min(...midis)
      const k = nearest(g, root)
      const rate = Math.pow(2, (root - k) / 12)
      if (opts.double) {
        const a = take(g, k)
        const b = take(g, k, a.i)
        const same = b.i === a.i
        const hs = [playSample(a.s, rate, t0, gain * 1.15, opts.dest, -0.85),
          playSample(b.s, rate * (same ? Math.pow(2, 7 / 1200) : 1), t0 + 0.008 + Math.random() * 0.01, gain * 1.15, opts.dest, 0.85)]
        return { stop: (at?: number) => hs.forEach(x => x.stop(at)) }
      }
      return playSample(take(g, k).s, rate, t0, gain * 1.45, opts.dest)
    }
  }
  const order = opts.up ? [...midis].reverse() : midis
  const spread = opts.spread ?? 0.018
  // an amp squashes six strings into roughly the level of one, so big chords don't blast
  const amp = soundInfo(id).amp ? Math.min(1, 1.7 / Math.sqrt(Math.max(1, midis.length))) : 1
  const notes = order.map((m, i) => playNote(m, t0 + i * spread, gain * amp, opts.dest, { sound: id, pm: opts.pm, double: opts.double }))
  return { stop: (at?: number) => notes.forEach(n => n.stop(at)) }
}

/** Electric bass (recorded), for Jam's bass lines. */
export function playBass(midi: number, when: number, gain: number, dest?: AudioNode): Handle {
  const bank = banks.get('bass')
  const t = when || audio().currentTime
  if (bank) {
    const g = bank.groups.notes!
    const k = nearest(g, midi)
    return playSample(take(g, k).s, Math.pow(2, (midi - k) / 12), t, gain * 1.3, dest)
  }
  void loadBank('bass')
  return synthNote(midi, t, gain * 0.9, dest)
}

/** Warm up for a set of notes so the first strum doesn't stutter (and start loading the sound). */
export function preload(midis: number[], sound?: SoundId) {
  const id = sound ?? activeSound()
  if (id !== 'synth') void loadSound(id)
  if (!banks.has(id)) for (const m of midis) bufferFor(m)
}
