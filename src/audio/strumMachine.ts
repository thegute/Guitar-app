// Persistent Multi-Genre Strum Machine ("Strum Grid") Audio Engine.
// Runs as a single app-wide background player (via liveSound + keepAcrossPages) so backing tracks keep
// playing smoothly while you view Tabs, Scales, Chords, Licks, or Harmonic Flow Coach.
// Supports 18 ultra-realistic styles (Acoustic/Bluegrass, Reggae One-Drop Skank, Metal Chugs/Gallop/Djent,
// Layered VSCO 2 Orchestral Strings, Rhodes, Hammond B3, Funk, Ambient) + live anywhere-accessible
// Style, Chord/Guitar pack, Bass, and Drum Kit overrides.
import { audio, route, setDelayTempo } from './engine'
import { liveSound, quietSound } from './stopAll'
import {
  allSounds,
  loadBank,
  loadSound,
  playBass,
  playNote,
  strum,
  type Handle,
  type SoundId,
} from './pluck'
import { bassPacks, type BassKind } from './packSounds'
import { KITS, playDrum, playGrooveBar, prepareKit, type KitId } from './drums'
import { playClick } from './metronome'
import { loadInstr, playInstr } from '../studio/sounds'
import { subscribeScheduler, updateClockState } from '../engine/clock'
import {
  BUILTIN_STRUM_CHARTS,
  parseChordQual,
  strumStyleMeta,
  transposeChordSymbol,
  transposeStrumChart,
  type ChordQual,
  type StrumChart,
  type StrumStyleId,
} from '../theory/harmonicFlow'
import { keyPrefersFlats, pc } from '../theory/notes'

export type ChordVoiceId =
  | 'auto'
  | SoundId
  | 'orchestra'
  | 'cinematic'
  | 'rhodes'
  | 'organ'
  | 'grand'
  | 'banjo'
  | 'ambient'

export type BassVoiceId = 'auto' | BassKind | 'upbass' | 'synthbass' | 'sub808' | 'off'
export type DrumKitOverride = 'auto' | KitId | 'perc' | 'off'

export interface StrumVolumes {
  chords: number
  bass: number
  drums: number
}

export interface StrumMutes {
  chords: boolean
  bass: boolean
  drums: boolean
}

export interface SpeedUpConfig {
  on: boolean
  step: number
  everyLoops: number
  max: number
}

export interface StrumState {
  playing: boolean
  chart: StrumChart
  bpm: number
  style: StrumStyleId
  capo: number
  barIdx: number
  splitIdx: number
  beat: number
  beatsPerBar: 3 | 4
  currentChord: string
  nextChord: string
  /** Concert-pitch sounding chord (with capo applied). */
  soundingChord: string
  /** Flow Coach live override mode: loops a single chord and transitions smoothly on Beat 1. */
  flowMode: boolean
  flowChord: string | null
  queuedFlowChord: string | null
  countIn: boolean
  countInLeft: number
  loopCount: number
  keepAcrossPages: boolean
  chordVoice: ChordVoiceId
  bassVoice: BassVoiceId
  drumKit: DrumKitOverride
  volumes: StrumVolumes
  mutes: StrumMutes
  speedUp: SpeedUpConfig
  /** Floating 5-layer neck card (Shape · Triads · Pentatonic · Mode · Free fingers) */
  floatNeckOpen: boolean
  floatNeckFollow: 'key' | 'chord'
}

export interface VoiceOption {
  id: string
  label: string
  group: string
}

const PREFS_KEY = 'kg:strumPrefs'

function loadPrefs(): Partial<Pick<StrumState, 'chordVoice' | 'bassVoice' | 'drumKit' | 'volumes' | 'mutes' | 'countIn' | 'keepAcrossPages'>> {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function savePrefs(s: StrumState) {
  try {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({
        chordVoice: s.chordVoice,
        bassVoice: s.bassVoice,
        drumKit: s.drumKit,
        volumes: s.volumes,
        mutes: s.mutes,
        countIn: s.countIn,
        keepAcrossPages: s.keepAcrossPages,
      }),
    )
  } catch { /* private */ }
}

/** Build the live list of Chord/Guitar voice choices (Auto + built-in guitars + all imported .kgpack guitars + Orchestra & Keys). */
export function chordVoiceOptions(): VoiceOption[] {
  const opts: VoiceOption[] = [{ id: 'auto', label: 'Auto (match style)', group: 'Smart' }]
  for (const s of allSounds()) {
    opts.push({
      id: s.id,
      label: s.id.startsWith('pack:') ? `${s.label} ★` : s.label,
      group: s.id.startsWith('pack:') ? 'My Sound Packs' : 'Guitars',
    })
  }
  opts.push(
    { id: 'orchestra', label: 'Orchestral Strings (VSCO 2)', group: 'Orchestra & Keys' },
    { id: 'cinematic', label: 'Cinematic Strings + Horns', group: 'Orchestra & Keys' },
    { id: 'rhodes', label: 'Warm Rhodes Electric Piano', group: 'Orchestra & Keys' },
    { id: 'organ', label: 'Hammond B3 Rotary Organ', group: 'Orchestra & Keys' },
    { id: 'grand', label: 'Salamander Grand Piano', group: 'Orchestra & Keys' },
    { id: 'banjo', label: 'Bluegrass Banjo', group: 'Orchestra & Keys' },
    { id: 'ambient', label: 'Ambient Modal Pad', group: 'Orchestra & Keys' },
  )
  return opts
}

/** Build the live list of Bass voice choices. */
export function bassVoiceOptions(): VoiceOption[] {
  const packs = bassPacks()
  const mark = (id: string) => (packs.includes(id) ? ' ★' : '')
  return [
    { id: 'auto', label: 'Auto (match style)', group: 'Smart' },
    { id: 'session', label: `Session Electric Bass${mark('studiobass-session')}`, group: 'Electric Bass' },
    { id: 'sixties', label: `60s Flatwound / Reggae Bass${mark('studiobass-sixties') || mark('jambass')}`, group: 'Electric Bass' },
    { id: 'modern', label: `Modern Punch / Metal Bass${mark('studiobass-modern')}`, group: 'Electric Bass' },
    { id: 'upright', label: `Acoustic Upright Bass${mark('studiobass-upright')}`, group: 'Acoustic Bass' },
    { id: 'upbass', label: 'Orchestral Contrabass', group: 'Acoustic Bass' },
    { id: 'synthbass', label: 'Analog Synth Bass', group: 'Synth' },
    { id: 'sub808', label: 'Deep 808 Sub', group: 'Synth' },
    { id: 'off', label: 'Off (No Bass)', group: 'Off' },
  ]
}

/** Build the live list of Drum kit choices. */
export function drumKitOptions(): VoiceOption[] {
  return [
    { id: 'auto', label: 'Auto (match style)', group: 'Smart' },
    ...KITS.map(k => ({ id: k.id, label: k.label, group: k.synth ? 'Drum Machines' : 'Acoustic Kits' })),
    { id: 'perc', label: 'Acoustic Percussion (Cajón / Shaker)', group: 'Percussion' },
    { id: 'off', label: 'Off (No Drums)', group: 'Off' },
  ]
}

// ---------- Chord Voicing Helpers ----------

const QUAL_INTERVALS: Record<ChordQual, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '5': [0, 7, 12],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  dim: [0, 3, 6],
  sus4: [0, 5, 7],
  add9: [0, 2, 4, 7],
}

function parseChord(symbol: string, capo = 0): { rootPc: number; qual: ChordQual; intervals: number[] } {
  const clean = symbol.trim() || 'G'
  const parsed = parseChordQual(clean)
  const rootPc = ((parsed ? parsed.rootPc : 7) + capo + 120) % 12
  const qual: ChordQual = parsed ? parsed.qual : ''
  return { rootPc, qual, intervals: QUAL_INTERVALS[qual] ?? [0, 4, 7] }
}

/** Lowest comfortable guitar bass MIDI (E2=40..D#3=51) for a pitch class. */
function guitarRootMidi(rootPc: number, minMidi = 40): number {
  let m = minMidi + ((rootPc - (minMidi % 12) + 12) % 12)
  if (m > minMidi + 11) m -= 12
  return m
}

/** Electric/upright bass MIDI (E1=28..D#2=39). */
function bassRootMidi(rootPc: number, minMidi = 28): number {
  let m = minMidi + ((rootPc - (minMidi % 12) + 12) % 12)
  if (m > minMidi + 11) m -= 12
  return m
}

/** Idiomatic 5-to-6 string guitar chord voicing for acoustic/rock strumming. */
function guitarStrumVoicing(rootPc: number, qual: ChordQual): number[] {
  const root = guitarRootMidi(rootPc, 40)
  const ivs = QUAL_INTERVALS[qual] ?? [0, 4, 7]
  if (qual === '5') return [root, root + 7, root + 12]
  const third = ivs.find(x => x === 3 || x === 4 || x === 5) ?? 4
  const fifth = ivs.find(x => x === 6 || x === 7) ?? 7
  const seventh = ivs.find(x => x === 10 || x === 11)
  const ninth = ivs.find(x => x === 2)
  const out = [root, root + fifth, root + 12, root + 12 + third]
  if (seventh !== undefined) out[2] = root + seventh
  if (ninth !== undefined) out.push(root + 12 + ninth)
  else out.push(root + 12 + fifth)
  return [...new Set(out)].filter(n => n >= 40 && n <= 76).sort((a, b) => a - b)
}

/** Tight high-register staccato triad/7th for Reggae Skank & Funk scratches (MIDI 57–74). */
function skankVoicing(rootPc: number, qual: ChordQual): number[] {
  const ivs = QUAL_INTERVALS[qual] ?? [0, 4, 7]
  const notes: number[] = []
  for (const iv of ivs) {
    let m = 57 + ((rootPc + iv - 9 + 24) % 12)
    if (m < 57) m += 12
    notes.push(m)
  }
  return [...new Set(notes)].sort((a, b) => a - b)
}

/** Heavy low-register metal power chord (Drop-D/E2 range: MIDI 38–52). */
function metalPowerVoicing(rootPc: number): number[] {
  const r = guitarRootMidi(rootPc, 38)
  return [r, r + 7, r + 12]
}

/** Smooth voice-led chord tones for Orchestral Strings, Rhodes, Hammond B3, and Ambient pads. */
function voiceLeadSpread(rootPc: number, qual: ChordQual, prev: number[] | null): { bass: number; upper: number[] } {
  const bass = bassRootMidi(rootPc, 36) // Cello / warm low C2..B2
  const ivs = QUAL_INTERVALS[qual] ?? [0, 4, 7]
  const pcs = [...new Set(ivs.map(iv => (rootPc + iv) % 12))]
  if (!prev || prev.length === 0) {
    const base = 52 + ((rootPc - 4 + 12) % 12)
    const upper = ivs.map((iv, idx) => base + iv + (idx === 1 ? 12 : 0)).sort((a, b) => a - b)
    return { bass, upper }
  }
  const center = prev.reduce((a, b) => a + b, 0) / prev.length
  const upper: number[] = []
  for (const p of pcs) {
    let best = 60 + p
    let bestDist = 999
    for (let oct = 48; oct <= 72; oct += 12) {
      const cand = oct + p
      if (cand < 50 || cand > 81) continue
      const d = Math.abs(cand - center)
      if (d < bestDist) {
        bestDist = d
        best = cand
      }
    }
    upper.push(best)
  }
  upper.sort((a, b) => a - b)
  return { bass, upper }
}

/** Choose a warm bowed wooden-formant fallback voice if orchestral samples are still preloading. */
function playBowedLayer(midi: number, when: number, dur: number, vel: number, dest: AudioNode): Handle {
  const ctx = audio()
  const t = Math.max(when, ctx.currentTime)
  const f = 440 * Math.pow(2, (midi - 69) / 12)
  const o1 = ctx.createOscillator()
  const o2 = ctx.createOscillator()
  o1.type = 'sawtooth'
  o2.type = 'sawtooth'
  o1.frequency.value = f
  o2.frequency.value = f
  o1.detune.value = -6
  o2.detune.value = 6
  // Delayed vibrato (string player bow bloom)
  const vib = ctx.createOscillator()
  const vibG = ctx.createGain()
  vib.frequency.value = 5.2
  vibG.gain.setValueAtTime(0, t)
  vibG.gain.linearRampToValueAtTime(8, t + Math.min(0.45, dur * 0.4))
  vib.connect(vibG)
  vibG.connect(o1.detune)
  vibG.connect(o2.detune)

  const body = ctx.createBiquadFilter()
  body.type = 'lowpass'
  body.frequency.setValueAtTime(1100, t)
  body.frequency.linearRampToValueAtTime(2200, t + Math.min(0.4, dur * 0.35))
  body.Q.value = 0.8

  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0.0001, t)
  amp.gain.linearRampToValueAtTime(vel * 0.12, t + Math.min(0.28, dur * 0.3))
  amp.gain.setTargetAtTime(vel * 0.09, t + Math.min(0.35, dur * 0.4), 0.3)

  o1.connect(body)
  o2.connect(body)
  body.connect(amp).connect(dest)
  o1.start(t)
  o2.start(t)
  vib.start(t)
  let stopped = false
  const stop = (at?: number) => {
    if (stopped) return
    stopped = true
    const e = Math.max(at ?? ctx.currentTime, t + 0.05)
    try {
      amp.gain.cancelScheduledValues(e)
      amp.gain.setTargetAtTime(0.0001, e, 0.14)
      o1.stop(e + 0.55)
      o2.stop(e + 0.55)
      vib.stop(e + 0.55)
    } catch { /* already stopped */ }
  }
  stop(t + dur)
  return { stop }
}

/** Resolve the effective sound & groove choices for a style + user overrides. */
function defaultGuitarForStyle(style: StrumStyleId): ChordVoiceId {
  switch (style) {
    case 'bluegrass':
    case 'waltz':
      return 'j45'
    case 'folk':
    case 'twelve':
      return 'acoustic'
    case 'island':
    case 'bossa':
      return 'nylon'
    case 'reggae':
    case 'funk':
      return 'clean'
    case 'blues':
    case 'rock':
      return 'crunch'
    case 'metal-chug':
    case 'metal-gallop':
    case 'djent':
      return 'metal'
    case 'orchestra':
      return 'orchestra'
    case 'cinematic':
      return 'cinematic'
    case 'rhodes':
      return 'rhodes'
    case 'organ':
      return 'organ'
    case 'ambient':
      return 'ambient'
  }
}

function defaultBassForStyle(style: StrumStyleId): BassVoiceId {
  switch (style) {
    case 'bluegrass':
    case 'waltz':
    case 'folk':
    case 'twelve':
    case 'island':
    case 'bossa':
      return 'upright'
    case 'reggae':
    case 'blues':
    case 'rhodes':
    case 'organ':
      return 'sixties'
    case 'funk':
    case 'rock':
    case 'metal-chug':
    case 'metal-gallop':
    case 'djent':
      return 'modern'
    case 'orchestra':
    case 'cinematic':
      return 'upbass'
    case 'ambient':
      return 'off'
  }
}

function grooveForStyle(style: StrumStyleId): string {
  switch (style) {
    case 'bluegrass':
    case 'island':
      return 'cajon'
    case 'folk':
    case 'twelve':
      return 'brushfolk'
    case 'waltz':
      return 'brushes'
    case 'bossa':
      return 'bossa'
    case 'reggae':
      return 'reggae'
    case 'funk':
      return 'funk'
    case 'blues':
      return 'shuffle'
    case 'rock':
      return 'rock'
    case 'metal-chug':
      return 'metal'
    case 'metal-gallop':
      return 'gallop'
    case 'djent':
      return 'djent'
    case 'cinematic':
      return 'halftime'
    case 'rhodes':
      return 'hiphop'
    case 'organ':
      return 'motown'
    case 'orchestra':
    case 'ambient':
      return ''
  }
}

// ---------- Persistent Singleton Engine ----------

interface ScheduledEvent {
  time: number
  barIdx: number
  splitIdx: number
  beat: number
  currentChord: string
  nextChord: string
  soundingChord: string
  countInLeft: number
  loopCount: number
}

class StrumMachineEngine {
  readonly kind = 'strum'
  private listeners = new Set<() => void>()
  private unsubSched: (() => void) | null = null
  private uiTimer: ReturnType<typeof setInterval> | null = null
  private activeHandles: Handle[] = []
  private timeline: ScheduledEvent[] = []
  private nextBarTime = 0
  private schedBarIdx = 0
  private schedLoopCount = 0
  private schedBarsPlayed = 0
  private pendingCountIn = 0
  private lastUpperVoicing: number[] | null = null
  private chordBus: GainNode | null = null
  private bassBus: GainNode | null = null
  private drumBus: GainNode | null = null
  private state: StrumState

  constructor() {
    const prefs = loadPrefs()
    const initChart = BUILTIN_STRUM_CHARTS[0]
    const firstChord = initChart.bars[0]?.chords[0] ?? 'G'
    const nextChord = initChart.bars[1]?.chords[0] ?? firstChord
    this.state = {
      playing: false,
      chart: initChart,
      bpm: initChart.bpm,
      style: initChart.style,
      capo: initChart.capo,
      barIdx: 0,
      splitIdx: 0,
      beat: 0,
      beatsPerBar: strumStyleMeta(initChart.style).beatsPerBar,
      currentChord: firstChord,
      nextChord,
      soundingChord: firstChord,
      flowMode: false,
      flowChord: null,
      queuedFlowChord: null,
      countIn: prefs.countIn ?? true,
      countInLeft: 0,
      loopCount: 0,
      keepAcrossPages: prefs.keepAcrossPages ?? true,
      chordVoice: prefs.chordVoice ?? 'auto',
      bassVoice: prefs.bassVoice ?? 'auto',
      drumKit: prefs.drumKit ?? 'auto',
      volumes: prefs.volumes ?? { chords: 0.9, bass: 0.9, drums: 0.85 },
      mutes: prefs.mutes ?? { chords: false, bass: false, drums: false },
      speedUp: { on: false, step: 5, everyLoops: 2, max: 180 },
      floatNeckOpen: false,
      floatNeckFollow: 'key',
    }
  }

  /** Used by stopAllSounds() to keep Strum Machine running smoothly across tabs/screens. */
  keep = () => this.state.playing && this.state.keepAcrossPages

  getState(): StrumState {
    return this.state
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  private emit() {
    this.state = { ...this.state }
    for (const fn of this.listeners) {
      try {
        fn()
      } catch { /* noop */ }
    }
  }

  private ensureBuses() {
    const ctx = audio()
    if (!this.chordBus) {
      this.chordBus = ctx.createGain()
      this.chordBus.connect(route('band', 'guitar'))
    }
    if (!this.bassBus) {
      this.bassBus = ctx.createGain()
      this.bassBus.connect(route('band', 'bass'))
    }
    if (!this.drumBus) {
      this.drumBus = ctx.createGain()
      this.drumBus.connect(route('band', 'drums'))
    }
    this.syncBusGains()
  }

  private syncBusGains() {
    if (!this.chordBus || !this.bassBus || !this.drumBus) return
    const now = audio().currentTime
    const { volumes, mutes } = this.state
    this.chordBus.gain.setTargetAtTime(mutes.chords ? 0 : volumes.chords, now, 0.025)
    this.bassBus.gain.setTargetAtTime(mutes.bass ? 0 : volumes.bass, now, 0.025)
    this.drumBus.gain.setTargetAtTime(mutes.drums ? 0 : volumes.drums, now, 0.025)
  }

  private preloadVoices() {
    const cv = this.effectiveChordVoice()
    if (cv === 'orchestra' || cv === 'cinematic') {
      void loadInstr('cellos')
      void loadInstr('strings')
      void loadInstr('fiddle')
      if (cv === 'cinematic') void loadInstr('horns')
    } else if (cv === 'rhodes') {
      void loadInstr('epiano')
    } else if (cv === 'grand') {
      void loadInstr('grand')
    } else if (cv === 'banjo') {
      void loadInstr('banjo')
    } else if (cv !== 'organ' && cv !== 'ambient') {
      void loadSound(cv as SoundId)
    }
    if (this.state.style === 'bluegrass') void loadInstr('banjo')
    const bv = this.effectiveBassVoice()
    if (bv === 'upbass') void loadInstr('upbass')
    else if (bv !== 'off' && bv !== 'synthbass' && bv !== 'sub808') void loadBank('bass')
    const dk = this.effectiveDrumKit()
    if (dk !== 'off' && dk !== 'perc') void prepareKit(dk)
  }

  effectiveChordVoice(): Exclude<ChordVoiceId, 'auto'> {
    return this.state.chordVoice === 'auto' ? defaultGuitarForStyle(this.state.style) as Exclude<ChordVoiceId, 'auto'> : this.state.chordVoice
  }

  effectiveBassVoice(): Exclude<BassVoiceId, 'auto'> {
    return this.state.bassVoice === 'auto' ? defaultBassForStyle(this.state.style) as Exclude<BassVoiceId, 'auto'> : this.state.bassVoice
  }

  effectiveDrumKit(): Exclude<DrumKitOverride, 'auto'> {
    if (this.state.drumKit !== 'auto') return this.state.drumKit
    return strumStyleMeta(this.state.style).defaultKit
  }

  private soundSymbol(sym: string): string {
    if (!this.state.capo) return sym
    const flats = keyPrefersFlats(this.state.chart.tonic, this.state.chart.minor)
    return transposeChordSymbol(sym, this.state.capo, flats)
  }

  // ---------- Transport Controls ----------

  start(opts: { fromBar?: number; skipCountIn?: boolean } = {}) {
    this.ensureBuses()
    this.preloadVoices()
    this.stopHandles()
    if (this.unsubSched) {
      this.unsubSched()
      this.unsubSched = null
    }
    const ctx = audio()
    this.schedBarIdx = opts.fromBar ?? 0
    this.schedLoopCount = 0
    this.schedBarsPlayed = 0
    this.timeline = []
    this.lastUpperVoicing = null
    const beatsPerBar = strumStyleMeta(this.state.style).beatsPerBar
    this.pendingCountIn = this.state.countIn && !opts.skipCountIn && !this.state.flowMode ? beatsPerBar : 0
    this.nextBarTime = ctx.currentTime + 0.08
    const first = this.state.flowMode && this.state.flowChord
      ? this.state.flowChord
      : this.state.chart.bars[this.schedBarIdx]?.chords[0] ?? 'G'
    const next = this.peekNextChord(this.schedBarIdx, 0)
    this.state = {
      ...this.state,
      playing: true,
      beatsPerBar,
      barIdx: this.schedBarIdx,
      splitIdx: 0,
      beat: 0,
      currentChord: first,
      nextChord: next,
      soundingChord: this.soundSymbol(first),
      countInLeft: this.pendingCountIn,
      loopCount: 0,
    }
    liveSound(this, 'Strum Machine')
    setDelayTempo(this.state.bpm)
    updateClockState({ bpm: this.state.bpm, speed: 1, meter: beatsPerBar, playing: true, source: 'strum' })
    this.unsubSched = subscribeScheduler((_now, horizon) => this.schedule(horizon))
    if (!this.uiTimer) {
      this.uiTimer = setInterval(() => this.syncPlayhead(), 33)
    }
    this.emit()
  }

  stop(ringOut = false) {
    if (!this.state.playing && !this.unsubSched) return
    if (this.unsubSched) {
      this.unsubSched()
      this.unsubSched = null
    }
    if (this.uiTimer) {
      clearInterval(this.uiTimer)
      this.uiTimer = null
    }
    if (!ringOut) this.stopHandles()
    else this.activeHandles = []
    this.timeline = []
    this.state = {
      ...this.state,
      playing: false,
      countInLeft: 0,
      queuedFlowChord: null,
    }
    quietSound(this)
    this.emit()
  }

  toggle() {
    if (this.state.playing) this.stop()
    else this.start()
  }

  private stopHandles() {
    const now = audio().currentTime
    for (const h of this.activeHandles) {
      try {
        h.stop(now + 0.015)
      } catch { /* noop */ }
    }
    this.activeHandles = []
  }

  private trackHandle(h: Handle) {
    this.activeHandles.push(h)
    if (this.activeHandles.length > 96) this.activeHandles.splice(0, 32)
  }

  // ---------- Live Configuration Setters (Work Live While Playing!) ----------

  setChart(chart: StrumChart, opts: { autoPlay?: boolean; keepStyle?: boolean } = {}) {
    const style = opts.keepStyle ? this.state.style : chart.style
    const beatsPerBar = strumStyleMeta(style).beatsPerBar
    const first = chart.bars[0]?.chords[0] ?? 'G'
    const next = chart.bars[0]?.chords[1] ?? chart.bars[1]?.chords[0] ?? first
    this.state = {
      ...this.state,
      chart,
      style,
      bpm: chart.bpm,
      capo: chart.capo,
      beatsPerBar,
      flowMode: false,
      flowChord: null,
      queuedFlowChord: null,
      barIdx: 0,
      splitIdx: 0,
      currentChord: first,
      nextChord: next,
      soundingChord: this.soundSymbol(first),
    }
    this.schedBarIdx = 0
    this.preloadVoices()
    setDelayTempo(this.state.bpm)
    if (opts.autoPlay) {
      this.start({ fromBar: 0 })
    } else {
      this.emit()
    }
  }

  updateChartBars(bars: StrumChart['bars']) {
    if (!bars.length) return
    const nextChart: StrumChart = { ...this.state.chart, bars }
    if (this.schedBarIdx >= bars.length) this.schedBarIdx = 0
    const curIdx = Math.min(this.state.barIdx, bars.length - 1)
    const cur = bars[curIdx]?.chords[0] ?? 'G'
    this.state = {
      ...this.state,
      chart: nextChart,
      barIdx: curIdx,
      currentChord: this.state.flowMode && this.state.flowChord ? this.state.flowChord : cur,
      soundingChord: this.soundSymbol(this.state.flowMode && this.state.flowChord ? this.state.flowChord : cur),
    }
    this.emit()
  }

  setStyle(style: StrumStyleId) {
    const meta = strumStyleMeta(style)
    this.state = {
      ...this.state,
      style,
      beatsPerBar: meta.beatsPerBar,
      chart: { ...this.state.chart, style },
    }
    this.preloadVoices()
    this.emit()
  }

  setBpm(bpm: number) {
    const clamped = Math.max(40, Math.min(240, Math.round(bpm)))
    this.state = { ...this.state, bpm: clamped, chart: { ...this.state.chart, bpm: clamped } }
    setDelayTempo(clamped)
    if (this.state.playing) updateClockState({ bpm: clamped })
    this.emit()
  }

  setCapo(capo: number) {
    const c = Math.max(0, Math.min(11, Math.round(capo)))
    this.state = {
      ...this.state,
      capo: c,
      chart: { ...this.state.chart, capo: c },
    }
    this.state.soundingChord = this.soundSymbol(this.state.currentChord)
    this.emit()
  }

  setChordVoice(chordVoice: ChordVoiceId) {
    this.state = { ...this.state, chordVoice }
    savePrefs(this.state)
    this.preloadVoices()
    this.emit()
  }

  setBassVoice(bassVoice: BassVoiceId) {
    this.state = { ...this.state, bassVoice }
    savePrefs(this.state)
    this.preloadVoices()
    this.emit()
  }

  setDrumKit(drumKit: DrumKitOverride) {
    this.state = { ...this.state, drumKit }
    savePrefs(this.state)
    this.preloadVoices()
    this.emit()
  }

  setVolumes(patch: Partial<StrumVolumes>) {
    this.state = { ...this.state, volumes: { ...this.state.volumes, ...patch } }
    savePrefs(this.state)
    this.syncBusGains()
    this.emit()
  }

  setMutes(patch: Partial<StrumMutes>) {
    this.state = { ...this.state, mutes: { ...this.state.mutes, ...patch } }
    savePrefs(this.state)
    this.syncBusGains()
    this.emit()
  }

  setCountIn(countIn: boolean) {
    this.state = { ...this.state, countIn }
    savePrefs(this.state)
    this.emit()
  }

  setKeepAcrossPages(keepAcrossPages: boolean) {
    this.state = { ...this.state, keepAcrossPages }
    savePrefs(this.state)
    this.emit()
  }

  setSpeedUp(patch: Partial<SpeedUpConfig>) {
    this.state = { ...this.state, speedUp: { ...this.state.speedUp, ...patch } }
    this.emit()
  }

  /** Transpose the active Strum Grid chart live to a new tonic (works seamlessly while playing). */
  setKey(newTonic: string) {
    const transposed = transposeStrumChart(this.state.chart, newTonic)
    const curIdx = Math.min(this.state.barIdx, transposed.bars.length - 1)
    const curBar = transposed.bars[curIdx]
    const curChord = curBar?.chords[Math.min(this.state.splitIdx, (curBar.chords.length || 1) - 1)] ?? newTonic
    const nxt = this.peekNextChord(curIdx, this.state.splitIdx)
    this.state = {
      ...this.state,
      chart: transposed,
      currentChord: this.state.flowMode && this.state.flowChord ? this.state.flowChord : curChord,
      nextChord: nxt,
      soundingChord: this.soundSymbol(this.state.flowMode && this.state.flowChord ? this.state.flowChord : curChord),
    }
    this.emit()
  }

  setFloatNeckOpen(floatNeckOpen: boolean) {
    this.state = { ...this.state, floatNeckOpen }
    this.emit()
  }

  setFloatNeckFollow(floatNeckFollow: 'key' | 'chord') {
    this.state = { ...this.state, floatNeckFollow }
    this.emit()
  }

  // ---------- Flow Coach Real-Time Jam Steering ----------

  startFlowJam(chordSymbol: string, opts: { style?: StrumStyleId; bpm?: number; capo?: number } = {}) {
    const style = opts.style ?? this.state.style
    const bpm = opts.bpm ?? this.state.bpm
    const capo = opts.capo ?? this.state.capo
    this.state = {
      ...this.state,
      style,
      bpm,
      capo,
      beatsPerBar: strumStyleMeta(style).beatsPerBar,
      flowMode: true,
      flowChord: chordSymbol,
      queuedFlowChord: null,
      currentChord: chordSymbol,
      nextChord: chordSymbol,
      soundingChord: this.soundSymbol(chordSymbol),
    }
    this.start({ skipCountIn: true })
  }

  queueFlowChord(chordSymbol: string, immediate = false) {
    if (!this.state.flowMode) {
      this.startFlowJam(chordSymbol)
      return
    }
    if (immediate) {
      this.state = {
        ...this.state,
        flowChord: chordSymbol,
        queuedFlowChord: null,
        currentChord: chordSymbol,
        nextChord: chordSymbol,
        soundingChord: this.soundSymbol(chordSymbol),
      }
      // Audition immediate accent hit so user feels instant transition
      if (this.state.playing) {
        this.ensureBuses()
        const now = audio().currentTime + 0.02
        const parsed = parseChord(chordSymbol, this.state.capo)
        const cv = this.effectiveChordVoice()
        if (cv === 'orchestra' || cv === 'cinematic' || cv === 'rhodes' || cv === 'organ' || cv === 'grand' || cv === 'ambient') {
          this.playKeysOrStrings(cv, parsed.rootPc, parsed.qual, now, 60 / this.state.bpm * 2, 0.72)
        } else {
          const midis = (this.state.style === 'metal-chug' || this.state.style === 'metal-gallop' || this.state.style === 'djent')
            ? metalPowerVoicing(parsed.rootPc)
            : guitarStrumVoicing(parsed.rootPc, parsed.qual)
          this.trackHandle(strum(midis, now, { sound: cv as SoundId, dest: this.chordBus!, gain: 0.72, double: cv === 'metal' }))
        }
      }
      this.emit()
    } else {
      this.state = {
        ...this.state,
        queuedFlowChord: chordSymbol,
        nextChord: chordSymbol,
      }
      this.emit()
    }
  }

  exitFlowMode() {
    this.state = { ...this.state, flowMode: false, flowChord: null, queuedFlowChord: null }
    this.emit()
  }

  // ---------- Scheduler Core ----------

  private peekNextChord(barIdx: number, splitIdx: number): string {
    if (this.state.flowMode) return this.state.queuedFlowChord ?? this.state.flowChord ?? 'C'
    const bars = this.state.chart.bars
    if (!bars.length) return 'G'
    const curBar = bars[barIdx % bars.length]
    if (splitIdx === 0 && curBar.chords.length > 1) return curBar.chords[1]
    return bars[(barIdx + 1) % bars.length].chords[0] ?? 'G'
  }

  private schedule(horizon: number) {
    if (!this.state.playing) return
    const spb = 60 / this.state.bpm
    const beatsPerBar = strumStyleMeta(this.state.style).beatsPerBar

    while (this.nextBarTime < horizon) {
      // 1) Optional 4-beat / 3-beat Count-in before Bar 0
      if (this.pendingCountIn > 0) {
        const t = this.nextBarTime
        const kind = this.pendingCountIn === beatsPerBar ? 'accent' : 'beat'
        playClick(t, 'sticks', kind, 0.85)
        const cur = this.state.chart.bars[this.schedBarIdx]?.chords[0] ?? 'G'
        this.timeline.push({
          time: t,
          barIdx: this.schedBarIdx,
          splitIdx: 0,
          beat: beatsPerBar - this.pendingCountIn,
          currentChord: cur,
          nextChord: cur,
          soundingChord: this.soundSymbol(cur),
          countInLeft: this.pendingCountIn,
          loopCount: this.schedLoopCount,
        })
        this.pendingCountIn--
        this.nextBarTime += spb
        continue
      }

      // 2) Schedule 1 full bar
      const barStart = this.nextBarTime
      const bars = this.state.chart.bars
      const barIdx = this.state.flowMode ? 0 : this.schedBarIdx % Math.max(1, bars.length)
      let barChords: string[]

      if (this.state.flowMode) {
        if (this.state.queuedFlowChord) {
          this.state.flowChord = this.state.queuedFlowChord
          this.state.queuedFlowChord = null
        }
        barChords = [this.state.flowChord ?? 'C']
      } else {
        barChords = bars[barIdx]?.chords?.length ? bars[barIdx].chords : ['G']
      }

      const nextBarChord = this.state.flowMode
        ? (this.state.queuedFlowChord ?? barChords[0])
        : (bars[(barIdx + 1) % Math.max(1, bars.length)]?.chords[0] ?? barChords[0])

      // Push beat-by-beat UI events for smooth beat dots & split-bar highlights
      for (let b = 0; b < beatsPerBar; b++) {
        const splitIdx = barChords.length > 1 && b >= Math.floor(beatsPerBar / 2) ? 1 : 0
        const active = barChords[splitIdx] ?? barChords[0]
        const nxt = splitIdx === 0 && barChords.length > 1 ? barChords[1] : nextBarChord
        this.timeline.push({
          time: barStart + b * spb,
          barIdx,
          splitIdx,
          beat: b,
          currentChord: active,
          nextChord: nxt,
          soundingChord: this.soundSymbol(active),
          countInLeft: 0,
          loopCount: this.schedLoopCount,
        })
      }

      // Schedule Audio for Drums, Bass, and Chords across this bar
      const isFillBar = !this.state.flowMode
        ? ((barIdx + 1) % 4 === 0 || barIdx === bars.length - 1)
        : ((this.schedBarsPlayed + 1) % 4 === 0)
      const isCrashBar = this.schedBarsPlayed === 0 || this.schedBarsPlayed % 4 === 0

      this.scheduleBarDrums(barStart, spb, beatsPerBar, isFillBar, isCrashBar)

      if (barChords.length > 1 && beatsPerBar === 4) {
        this.scheduleSegment(barChords[0], barChords[1], barStart, spb, 2, 0)
        this.scheduleSegment(barChords[1], nextBarChord, barStart + 2 * spb, spb, 2, 2)
      } else {
        this.scheduleSegment(barChords[0], nextBarChord, barStart, spb, beatsPerBar, 0)
      }

      this.nextBarTime += beatsPerBar * spb
      this.schedBarsPlayed++

      if (!this.state.flowMode) {
        this.schedBarIdx++
        if (this.schedBarIdx >= Math.max(1, bars.length)) {
          this.schedBarIdx = 0
          this.schedLoopCount++
          // Auto Speed-Up BPM ramp
          const su = this.state.speedUp
          if (su.on && this.schedLoopCount > 0 && this.schedLoopCount % su.everyLoops === 0 && this.state.bpm < su.max) {
            const nextBpm = Math.min(su.max, this.state.bpm + su.step)
            this.state = { ...this.state, bpm: nextBpm }
            setDelayTempo(nextBpm)
            updateClockState({ bpm: nextBpm })
            this.emit()
          }
        }
      }
    }
  }

  private syncPlayhead() {
    if (!this.state.playing || !this.timeline.length) return
    const now = audio().currentTime
    let cur: ScheduledEvent | null = null
    while (this.timeline.length > 1 && this.timeline[1].time <= now) {
      this.timeline.shift()
    }
    if (this.timeline[0] && this.timeline[0].time <= now + 0.02) {
      cur = this.timeline[0]
    }
    if (!cur) return
    if (
      cur.barIdx !== this.state.barIdx ||
      cur.splitIdx !== this.state.splitIdx ||
      cur.beat !== this.state.beat ||
      cur.currentChord !== this.state.currentChord ||
      cur.countInLeft !== this.state.countInLeft ||
      cur.loopCount !== this.state.loopCount
    ) {
      this.state = {
        ...this.state,
        barIdx: cur.barIdx,
        splitIdx: cur.splitIdx,
        beat: cur.beat,
        currentChord: cur.currentChord,
        nextChord: this.state.flowMode && this.state.queuedFlowChord ? this.state.queuedFlowChord : cur.nextChord,
        soundingChord: cur.soundingChord,
        countInLeft: cur.countInLeft,
        loopCount: cur.loopCount,
      }
      this.emit()
    }
  }

  // ---------- Style Audio Realization ----------

  private scheduleBarDrums(barStart: number, spb: number, beatsPerBar: 3 | 4, fill: boolean, crash: boolean) {
    const dk = this.effectiveDrumKit()
    if (dk === 'off' || this.state.mutes.drums || !this.drumBus) return
    const style = this.state.style

    if (beatsPerBar === 3) {
      // 3/4 Waltz drum pattern (brushes / studio)
      const kit: KitId = dk === 'perc' ? 'jazz' : dk
      playDrum('kick', barStart, 0.55, this.drumBus, { kit })
      playDrum(kit === 'jazz' ? 'brush' : 'hat', barStart, 0.45, this.drumBus, { kit })
      playDrum(kit === 'jazz' ? 'brushtap' : 'rim', barStart + spb, 0.55, this.drumBus, { kit })
      playDrum(kit === 'jazz' ? 'brushtap' : 'hat', barStart + 2 * spb, 0.5, this.drumBus, { kit })
      return
    }

    if (dk === 'perc') {
      const groove = style === 'bluegrass' || style === 'island' ? 'cajon' : 'brushfolk'
      playGrooveBar(groove, barStart, spb, 0.8, this.drumBus, 4, 0, { fill, crash })
      return
    }

    const groove = grooveForStyle(style)
    if (!groove) {
      // User explicitly enabled a drum kit on Orchestra/Ambient — play a tasteful ballad pulse
      playGrooveBar('halftime', barStart, spb, 0.65, this.drumBus, 4, 0, { fill, crash, kit: dk })
      return
    }
    playGrooveBar(groove, barStart, spb, 0.85, this.drumBus, 4, 0, { fill, crash, kit: dk })
  }

  private scheduleSegment(
    symbol: string,
    nextSymbol: string,
    segStart: number,
    spb: number,
    beats: number,
    beatOffset: number,
  ) {
    const parsed = parseChord(symbol, this.state.capo)
    const nextParsed = parseChord(nextSymbol, this.state.capo)
    const style = this.state.style

    // 1) Schedule Bass Line (with walking lead-ins on chord changes!)
    this.scheduleBass(parsed.rootPc, parsed.qual, nextParsed.rootPc, segStart, spb, beats, beatOffset, style)

    // 2) Schedule Chords / Strums / Chugs / Skank / Orchestra
    if (!this.state.mutes.chords && this.chordBus) {
      this.scheduleChords(parsed.rootPc, parsed.qual, segStart, spb, beats, beatOffset, style)
    }
  }

  private playOneBass(midi: number, when: number, dur: number, gain: number) {
    if (!this.bassBus || this.state.mutes.bass) return
    const bv = this.effectiveBassVoice()
    if (bv === 'off') return
    let h: Handle
    if (bv === 'upbass') {
      h = playInstr('upbass', midi, when, gain * 0.95, { dest: this.bassBus, dur })
    } else if (bv === 'synthbass' || bv === 'sub808') {
      h = playInstr(bv, midi, when, gain * 0.85, { dest: this.bassBus, dur })
    } else {
      h = playBass(midi, when, gain, this.bassBus, bv)
      h.stop(when + dur)
    }
    this.trackHandle(h)
  }

  private scheduleBass(
    rootPc: number,
    qual: ChordQual,
    nextRootPc: number,
    t0: number,
    spb: number,
    beats: number,
    _beatOffset: number,
    style: StrumStyleId,
  ) {
    if (this.effectiveBassVoice() === 'off' || this.state.mutes.bass) return
    const r = bassRootMidi(rootPc, style === 'metal-chug' || style === 'metal-gallop' || style === 'djent' ? 28 : 31)
    const fifth = r + 7 <= 48 ? r + 7 : r - 5
    const third = r + (qual === 'm' || qual === 'm7' || qual === 'dim' ? 3 : 4)
    const nextR = bassRootMidi(nextRootPc, 31)
    const changing = nextRootPc !== rootPc
    // Smooth walking approach note (half-step or whole-step into next root)
    const walkTarget = changing ? (nextR > r ? nextR - 1 : nextR + 1) : fifth

    if (beats === 3) {
      // 3/4 waltz bass
      this.playOneBass(r, t0, spb * 1.4, 0.9)
      if (changing) this.playOneBass(walkTarget, t0 + 2 * spb, spb * 0.9, 0.72)
      return
    }

    switch (style) {
      case 'bluegrass':
      case 'folk':
      case 'twelve': {
        this.playOneBass(r, t0, spb * 1.45, 0.95)
        if (beats >= 4) {
          this.playOneBass(fifth, t0 + 2 * spb, spb * 1.35, 0.85)
          if (changing) this.playOneBass(walkTarget, t0 + 3.5 * spb, spb * 0.45, 0.78)
        } else if (changing) {
          this.playOneBass(walkTarget, t0 + 1.5 * spb, spb * 0.45, 0.75)
        }
        break
      }
      case 'island':
      case 'bossa': {
        this.playOneBass(r, t0, spb * 1.35, 0.88)
        this.playOneBass(fifth, t0 + 1.5 * spb, spb * 0.45, 0.65)
        if (beats >= 4) {
          this.playOneBass(fifth, t0 + 2 * spb, spb * 1.35, 0.82)
          this.playOneBass(changing ? walkTarget : r, t0 + 3.5 * spb, spb * 0.45, 0.7)
        }
        break
      }
      case 'reggae': {
        // Authentic Reggae dub bass: breathing space on beat 1 or late pickup, heavy drop on beat 3
        this.playOneBass(r, t0 + 0.5 * spb, spb * 0.85, 0.92)
        if (beats >= 4) {
          this.playOneBass(r, t0 + 2 * spb, spb * 0.95, 1.0)
          this.playOneBass(fifth, t0 + 3 * spb, spb * 0.45, 0.82)
          this.playOneBass(changing ? walkTarget : r + 12, t0 + 3.5 * spb, spb * 0.4, 0.76)
        }
        break
      }
      case 'funk': {
        this.playOneBass(r, t0, spb * 0.45, 0.95)
        this.playOneBass(r, t0 + 0.75 * spb, spb * 0.35, 0.8)
        this.playOneBass(r + 12, t0 + 1.5 * spb, spb * 0.35, 0.75)
        if (beats >= 4) {
          this.playOneBass(fifth, t0 + 2.5 * spb, spb * 0.4, 0.88)
          this.playOneBass(changing ? walkTarget : r + 10, t0 + 3.5 * spb, spb * 0.4, 0.82)
        }
        break
      }
      case 'blues': {
        // Classic walking blues bass: 1 - 3 - 5 - 6/approach
        this.playOneBass(r, t0, spb * 0.9, 0.95)
        this.playOneBass(third, t0 + spb, spb * 0.9, 0.86)
        if (beats >= 4) {
          this.playOneBass(fifth, t0 + 2 * spb, spb * 0.9, 0.88)
          this.playOneBass(changing ? walkTarget : r + 9, t0 + 3 * spb, spb * 0.9, 0.84)
        }
        break
      }
      case 'rock': {
        for (let b = 0; b < beats; b += 0.5) {
          const note = changing && b === beats - 0.5 ? walkTarget : r
          this.playOneBass(note, t0 + b * spb, spb * 0.44, b % 1 === 0 ? 0.92 : 0.72)
        }
        break
      }
      case 'metal-chug': {
        const hits = beats >= 4 ? [0, 0.5, 1, 1.5, 1.75, 2, 2.5, 3, 3.5] : [0, 0.5, 1, 1.5]
        for (const b of hits) {
          this.playOneBass(r, t0 + b * spb, spb * 0.36, b === 0 || b === 2 ? 0.98 : 0.78)
        }
        break
      }
      case 'metal-gallop': {
        for (let beat = 0; beat < beats; beat++) {
          this.playOneBass(r, t0 + beat * spb, spb * 0.36, 0.95)
          this.playOneBass(r, t0 + (beat + 0.5) * spb, spb * 0.2, 0.76)
          this.playOneBass(r, t0 + (beat + 0.75) * spb, spb * 0.2, 0.8)
        }
        break
      }
      case 'djent': {
        const hits = beats >= 4 ? [0, 0.75, 1.5, 2.25, 3, 3.5] : [0, 0.75, 1.5]
        for (const b of hits) {
          this.playOneBass(r, t0 + b * spb, spb * 0.32, 0.98)
        }
        break
      }
      case 'orchestra':
      case 'cinematic':
      case 'ambient': {
        this.playOneBass(r, t0, beats * spb * 0.98, 0.82)
        break
      }
      case 'rhodes':
      case 'organ': {
        this.playOneBass(r, t0, spb * 1.8, 0.9)
        if (beats >= 4) {
          this.playOneBass(fifth, t0 + 2 * spb, spb * 1.3, 0.78)
          if (changing) this.playOneBass(walkTarget, t0 + 3.5 * spb, spb * 0.45, 0.75)
        }
        break
      }
    }
  }

  private playKeysOrStrings(
    voice: 'orchestra' | 'cinematic' | 'rhodes' | 'organ' | 'grand' | 'banjo' | 'ambient',
    rootPc: number,
    qual: ChordQual,
    when: number,
    dur: number,
    vel: number,
  ) {
    if (!this.chordBus) return
    const { bass, upper } = voiceLeadSpread(rootPc, qual, this.lastUpperVoicing)
    this.lastUpperVoicing = upper

    if (voice === 'orchestra' || voice === 'cinematic') {
      // Real layered VSCO 2 Cellos + String Section + Violin top + warm wooden-formant blend
      this.trackHandle(playInstr('cellos', bass, when, vel * 0.88, { dest: this.chordBus, dur: dur * 1.02 }))
      upper.forEach((m, idx) => {
        const micro = idx * 0.014
        this.trackHandle(playInstr('strings', m, when + micro, vel * 0.78, { dest: this.chordBus!, dur: dur * 1.02 }))
        this.trackHandle(playBowedLayer(m, when + micro, dur * 0.98, vel * 0.55, this.chordBus!))
      })
      const top = upper[upper.length - 1]
      if (top !== undefined) {
        this.trackHandle(playInstr('fiddle', top + (top < 69 ? 12 : 0), when + 0.03, vel * 0.42, { dest: this.chordBus, dur: dur * 0.96 }))
      }
      if (voice === 'cinematic') {
        this.trackHandle(playInstr('horns', bass + 12, when + 0.02, vel * 0.58, { dest: this.chordBus, dur: dur * 0.95 }))
      }
      return
    }

    if (voice === 'rhodes') {
      upper.forEach((m, idx) => {
        this.trackHandle(playInstr('epiano', m, when + idx * 0.012, vel * 0.85, { dest: this.chordBus!, dur }))
      })
      return
    }

    if (voice === 'organ') {
      const notes = [bass + 12, ...upper]
      notes.forEach((m, idx) => {
        this.trackHandle(playInstr('organ', m, when + idx * 0.008, vel * 0.72, { dest: this.chordBus!, dur }))
      })
      return
    }

    if (voice === 'grand') {
      ;[bass + 12, ...upper].forEach((m, idx) => {
        this.trackHandle(playInstr('grand', m, when + idx * 0.011, vel * 0.78, { dest: this.chordBus!, dur }))
      })
      return
    }

    if (voice === 'banjo') {
      upper.forEach((m, idx) => {
        this.trackHandle(playInstr('banjo', m, when + idx * 0.015, vel * 0.82, { dest: this.chordBus!, dur: Math.min(dur, 0.35) }))
      })
      return
    }

    // ambient
    this.trackHandle(playInstr('warmpad', bass + 12, when, vel * 0.72, { dest: this.chordBus, dur: dur * 1.05 }))
    upper.forEach((m, idx) => {
      this.trackHandle(playInstr('ambient', m, when + idx * 0.025, vel * 0.65, { dest: this.chordBus!, dur: dur * 1.08 }))
    })
  }

  private scheduleChords(
    rootPc: number,
    qual: ChordQual,
    t0: number,
    spb: number,
    beats: number,
    _beatOffset: number,
    style: StrumStyleId,
  ) {
    const dest = this.chordBus!
    const cv = this.effectiveChordVoice()
    const isNonGuitar =
      cv === 'orchestra' || cv === 'cinematic' || cv === 'rhodes' || cv === 'organ' || cv === 'grand' || cv === 'banjo' || cv === 'ambient'

    if (isNonGuitar) {
      if (cv === 'rhodes' && beats >= 4) {
        this.playKeysOrStrings('rhodes', rootPc, qual, t0, spb * 1.65, 0.85)
        this.playKeysOrStrings('rhodes', rootPc, qual, t0 + 1.75 * spb, spb * 0.7, 0.68)
        this.playKeysOrStrings('rhodes', rootPc, qual, t0 + 2.5 * spb, spb * 1.4, 0.78)
        return
      }
      if (cv === 'organ' && style === 'reggae' && beats >= 4) {
        // Reggae organ bubble on & of 1 and & of 3 + crisp stabs
        this.playKeysOrStrings('organ', rootPc, qual, t0 + 0.5 * spb, spb * 0.3, 0.55)
        this.playKeysOrStrings('organ', rootPc, qual, t0 + spb, spb * 0.25, 0.78)
        this.playKeysOrStrings('organ', rootPc, qual, t0 + 2.5 * spb, spb * 0.3, 0.55)
        this.playKeysOrStrings('organ', rootPc, qual, t0 + 3 * spb, spb * 0.25, 0.78)
        return
      }
      if (cv === 'banjo' && beats >= 4) {
        // Forward bluegrass roll
        const roll = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]
        const v = skankVoicing(rootPc, qual)
        roll.forEach((b, idx) => {
          const note = v[idx % v.length]
          this.trackHandle(playInstr('banjo', note, t0 + b * spb, b % 1 === 0 ? 0.76 : 0.58, { dest, dur: spb * 0.48 }))
        })
        return
      }
      this.playKeysOrStrings(cv, rootPc, qual, t0, beats * spb * 0.98, 0.82)
      return
    }

    const sound = cv as SoundId
    const midis = guitarStrumVoicing(rootPc, qual)
    const high = midis.slice(-4)
    const skank = skankVoicing(rootPc, qual)
    const pwr = metalPowerVoicing(rootPc)

    const doStrum = (
      notes: number[],
      when: number,
      opts: { up?: boolean; spread?: number; gain?: number; pm?: boolean; double?: boolean; choke?: number } = {},
    ) => {
      const h = strum(notes, when, {
        sound,
        dest,
        up: opts.up,
        spread: opts.spread,
        gain: opts.gain ?? 0.78,
        pm: opts.pm,
        double: opts.double,
      })
      if (opts.choke) h.stop(when + opts.choke)
      this.trackHandle(h)
    }

    if (beats === 3) {
      // 3/4 Acoustic Waltz: low pick on 1, full strums on 2 & 3
      this.trackHandle(playNote(midis[0], t0, 0.72, dest, { sound }))
      doStrum(high, t0 + spb, { spread: 0.018, gain: 0.76 })
      doStrum(high, t0 + 2 * spb, { up: true, spread: 0.016, gain: 0.65 })
      return
    }

    switch (style) {
      case 'bluegrass': {
        // Classic Bluegrass boom-chuck: low pick on 1 & 3, crisp chop on 2 & 4, light upstroke on 4-and
        this.trackHandle(playNote(midis[0], t0, 0.8, dest, { sound }))
        doStrum(high, t0 + spb, { spread: 0.012, gain: 0.82, choke: spb * 0.55 })
        if (beats >= 4) {
          this.trackHandle(playNote(midis[1] ?? midis[0], t0 + 2 * spb, 0.76, dest, { sound }))
          doStrum(high, t0 + 3 * spb, { spread: 0.012, gain: 0.84, choke: spb * 0.55 })
          doStrum(high.slice(-3), t0 + 3.5 * spb, { up: true, spread: 0.011, gain: 0.52, choke: spb * 0.35 })
        }
        break
      }
      case 'folk': {
        // Warm D - D U - U D U acoustic strum
        doStrum(midis, t0, { spread: 0.022, gain: 0.84 })
        doStrum(high, t0 + spb, { spread: 0.018, gain: 0.76 })
        doStrum(high, t0 + 1.5 * spb, { up: true, spread: 0.014, gain: 0.62 })
        if (beats >= 4) {
          doStrum(high, t0 + 2.5 * spb, { up: true, spread: 0.014, gain: 0.64 })
          doStrum(midis, t0 + 3 * spb, { spread: 0.019, gain: 0.78 })
          doStrum(high, t0 + 3.5 * spb, { up: true, spread: 0.014, gain: 0.6 })
        }
        break
      }
      case 'twelve': {
        // 12-string shimmer: main acoustic + octave-doubled shimmer courses slightly delayed
        const oct = midis.slice(0, 3).map(n => n + 12)
        const shimmer = (at: number, up = false, g = 0.78) => {
          doStrum(midis, at, { up, spread: up ? 0.016 : 0.024, gain: g })
          doStrum(oct, at + 0.008, { up, spread: 0.016, gain: g * 0.42 })
        }
        shimmer(t0, false, 0.82)
        shimmer(t0 + spb, false, 0.72)
        shimmer(t0 + 1.5 * spb, true, 0.58)
        if (beats >= 4) {
          shimmer(t0 + 2.5 * spb, true, 0.6)
          shimmer(t0 + 3 * spb, false, 0.74)
          shimmer(t0 + 3.5 * spb, true, 0.56)
        }
        break
      }
      case 'island':
      case 'bossa': {
        // Syncopated fingerpicked/nylon comping (0, 0.75, 1.5, 2.5, 3.25)
        const hits: [number, number, boolean][] = beats >= 4
          ? [[0, 0.82, false], [0.75, 0.64, true], [1.5, 0.74, false], [2.5, 0.72, true], [3.25, 0.68, false]]
          : [[0, 0.82, false], [0.75, 0.64, true], [1.5, 0.74, false]]
        for (const [b, g, up] of hits) {
          doStrum(up ? high : midis, t0 + b * spb, { up, spread: 0.017, gain: g })
        }
        break
      }
      case 'reggae': {
        // Ultra-authentic Reggae Skank: razor-tight staccato chop on Beats 2 & 4 (+ crisp upbeat double skank)
        // plus subtle warm Hammond organ bubble underneath!
        doStrum(skank, t0 + spb, { spread: 0.007, gain: 0.88, choke: 0.11 })
        doStrum(skank, t0 + 1.25 * spb, { up: true, spread: 0.006, gain: 0.46, choke: 0.08 })
        if (beats >= 4) {
          doStrum(skank, t0 + 3 * spb, { spread: 0.007, gain: 0.9, choke: 0.11 })
          doStrum(skank, t0 + 3.25 * spb, { up: true, spread: 0.006, gain: 0.48, choke: 0.08 })
          // Subtle warm B3 organ bubble on & of 1 and & of 3
          this.playKeysOrStrings('organ', rootPc, qual, t0 + 0.5 * spb, spb * 0.24, 0.34)
          this.playKeysOrStrings('organ', rootPc, qual, t0 + 2.5 * spb, spb * 0.24, 0.34)
        }
        break
      }
      case 'funk': {
        // Crisp 16th muted scratches + tight clean stabs
        const stabs = beats >= 4 ? [0, 0.75, 1.5, 2.5, 3.25] : [0, 0.75, 1.5]
        const scratches = beats >= 4 ? [0.25, 0.5, 1.25, 2, 2.25, 3, 3.75] : [0.25, 0.5, 1.25]
        for (const b of stabs) doStrum(skank, t0 + b * spb, { spread: 0.008, gain: 0.84, choke: 0.12 })
        for (const b of scratches) doStrum(skank, t0 + b * spb, { pm: true, spread: 0.006, gain: 0.42, choke: 0.06 })
        break
      }
      case 'blues': {
        // Swung blues shuffle
        for (let b = 0; b < beats; b++) {
          doStrum(midis.slice(0, 4), t0 + b * spb, { spread: 0.015, gain: 0.8, choke: spb * 0.55 })
          doStrum(high.slice(0, 3), t0 + (b + 0.667) * spb, { up: true, spread: 0.012, gain: 0.64, choke: spb * 0.28 })
        }
        break
      }
      case 'rock': {
        // Punchy classic rock crunch 8ths
        for (let b = 0; b < beats; b += 0.5) {
          const accent = b === 0 || b === 2
          doStrum(accent ? midis : pwr, t0 + b * spb, {
            pm: !accent && b % 1 !== 0,
            spread: 0.01,
            gain: accent ? 0.88 : 0.66,
            double: true,
          })
        }
        break
      }
      case 'metal-chug': {
        // Heavy double-tracked L/R metal rhythm chugs (open accent on 1 + tight PM chugs)
        doStrum(pwr, t0, { pm: false, double: true, gain: 0.94, choke: spb * 0.48 })
        const chugs = beats >= 4 ? [0.5, 1, 1.5, 1.75, 2, 2.5, 3] : [0.5, 1, 1.5]
        for (const b of chugs) {
          doStrum(pwr, t0 + b * spb, { pm: true, double: true, gain: b % 1 === 0 ? 0.88 : 0.78 })
        }
        if (beats >= 4) {
          doStrum(pwr, t0 + 3.5 * spb, { pm: false, double: true, gain: 0.9, choke: spb * 0.45 })
        }
        break
      }
      case 'metal-gallop': {
        // Relentless Thrash Gallop: 8th + 16th + 16th palm-muted power chords
        for (let b = 0; b < beats; b++) {
          doStrum(pwr, t0 + b * spb, { pm: b !== 0, double: true, gain: b === 0 ? 0.95 : 0.86, choke: b === 0 ? spb * 0.45 : undefined })
          doStrum(pwr, t0 + (b + 0.5) * spb, { pm: true, double: true, gain: 0.76 })
          doStrum(pwr, t0 + (b + 0.75) * spb, { pm: true, double: true, gain: 0.82 })
        }
        break
      }
      case 'djent': {
        // Syncopated gated djent breakdown chugs
        const hits = beats >= 4 ? [0, 0.75, 1.5, 2.25, 3, 3.5] : [0, 0.75, 1.5]
        for (const b of hits) {
          const open = b === 0 || b === 3.5
          doStrum(pwr, t0 + b * spb, {
            pm: !open,
            double: true,
            gain: open ? 0.95 : 0.88,
            choke: open ? spb * 0.42 : spb * 0.22,
          })
        }
        break
      }
      default: {
        // User overrode Orchestra/Rhodes/Organ/Ambient with a custom guitar pack!
        doStrum(midis, t0, { spread: 0.025, gain: 0.82 })
        if (beats >= 4) doStrum(high, t0 + 2 * spb, { spread: 0.02, gain: 0.7 })
        break
      }
    }
  }
}

export const strumMachine = new StrumMachineEngine()

// React subscription hook (lazy import avoided by simple callback pattern in components,
// or standard useSyncExternalStore exported cleanly here).
import { useSyncExternalStore } from 'react'

export function useStrumState(): StrumState {
  return useSyncExternalStore(
    cb => strumMachine.subscribe(cb),
    () => strumMachine.getState(),
  )
}
