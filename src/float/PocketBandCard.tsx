// Floating Pocket Drummer (#2) and Pocket Band & Drone (#3) cards.
// Both share ONE audio-clock-locked transport (`pocketEngine`) on `src/engine/clock.ts` (`subscribeScheduler`) so they
// never play two clashing beats, support ALL 7 drum genre groups + all grooves & kits + your own Beat Maker drums
// (Parts A–D), Tap Tempo, Gap Click, Auto/Manual + ✨ AI Drum Fills & Bass Fills, Sound Packs, Studio Bass packs,
// independent ON/OFF + mixer for every layer, and live chord/key publishing to your 5-Layer Fretboard, Licks & Circle!
import { useEffect, useMemo, useRef, useState } from 'react'
import { Ico } from '../components/Icon'
import { audio, bus } from '../audio/engine'
import { liveSound, quietSound } from '../audio/stopAll'
import { GROOVES, GROOVE_GROUPS, KITS, grooveOf, loadKit, playDrum, type KitId, type Voice } from '../audio/drums'
import { allSounds, loadSound, playBass, playNote, strum, type SoundId } from '../audio/pluck'
import { BASS_LABEL, type BassKind } from '../audio/packSounds'
import { Drone } from '../audio/drone'
import { LOOKAHEAD_SEC, subscribeScheduler, updateClockState } from '../engine/clock'
import { loadBeat, PART_IDS, STEPS_PER_BAR, type Beat, type DrumRow, type PartId } from '../studio/beat'
import { KEYS, pc, SHARPS } from '../theory/notes'
import { chordInfo } from '../tabs/harmony'
import { openJam } from '../nav'
import { onBandAddChord, publishFloat, type FloatCtx } from './bus'
import { askAiBassFill, askAiDrumFill, canUseAiFills, generateBassFill, generateDrumFill, type BassFillHit, type DrumFillHit, type DrumFillStyle } from './fillsAi'

// ---------- Shared clock-locked Pocket Audio Engine ----------
export type DrumSource = 'groove' | 'beatmaker'
export type BandMode = 'drone' | 'prog'
export type ChordFeel = 'hold' | 'strum' | 'arp' | 'pulse'
export type GapMode = 0 | 1 | 2 // 0 = off, 1 = 1 bar muted / 4, 2 = 2 bars muted / 4
export type FillFreq = 0 | 4 | 8

interface PocketConfig {
  bpm: number
  // Drums
  drumsOn: boolean
  drumVol: number
  drumSource: DrumSource
  grooveId: string
  kitId: KitId
  beatPart: PartId
  gapMode: GapMode
  autoFill: FillFreq
  fillStyle: DrumFillStyle
  // Band / Drone (all off when launched from Pocket Drummer alone!)
  mode: BandMode
  droneOn: boolean
  droneVol: number
  chordsOn: boolean
  chordsVol: number
  chordSound: SoundId
  chordFeel: ChordFeel
  bassOn: boolean
  bassVol: number
  bassKind: BassKind
  bassAutoFill: boolean
  clickOn: boolean
  clickVol: number
  // Musical content
  root: string
  quality: string // '', 'm', '7', 'maj7', 'm7', '5', 'dorian', 'lydian', 'mixolydian'
  chords: string[]
}

const PROG_PRESETS: { id: string; label: string; build: (r: string) => string[] }[] = [
  { id: 'pop', label: 'I – V – vi – IV', build: r => { const p = pc(r); return [SHARPS[p], SHARPS[(p + 7) % 12], `${SHARPS[(p + 9) % 12]}m`, SHARPS[(p + 5) % 12]] } },
  { id: 'jazz', label: 'ii – V – I – VI', build: r => { const p = pc(r); return [`${SHARPS[(p + 2) % 12]}m7`, `${SHARPS[(p + 7) % 12]}7`, `${SHARPS[p]}maj7`, `${SHARPS[(p + 9) % 12]}m7`] } },
  { id: 'blues', label: '12-Bar Blues (I-IV-V)', build: r => { const p = pc(r); const I = `${SHARPS[p]}7`, IV = `${SHARPS[(p + 5) % 12]}7`, V = `${SHARPS[(p + 7) % 12]}7`; return [I, I, I, I, IV, IV, I, I, V, IV, I, V] } },
  { id: 'dorian', label: 'Dorian Vamp (i – IV)', build: r => { const p = pc(r); return [`${SHARPS[p]}m7`, `${SHARPS[(p + 5) % 12]}7`] } },
  { id: 'rock', label: 'i – bVII – bVI – V', build: r => { const p = pc(r); return [`${SHARPS[p]}m`, SHARPS[(p + 10) % 12], SHARPS[(p + 8) % 12], SHARPS[(p + 7) % 12]] } },
  { id: 'ballad', label: 'I – vi – IV – V', build: r => { const p = pc(r); return [SHARPS[p], `${SHARPS[(p + 9) % 12]}m`, SHARPS[(p + 5) % 12], SHARPS[(p + 7) % 12]] } },
]

const QUALITIES: { id: string; label: string; suffix: string; droneIntervals: number[]; minor: boolean }[] = [
  { id: 'maj', label: 'Major', suffix: '', droneIntervals: [4], minor: false },
  { id: 'min', label: 'Minor', suffix: 'm', droneIntervals: [3], minor: true },
  { id: '5', label: 'Power (Root+5)', suffix: '5', droneIntervals: [], minor: false },
  { id: '7', label: 'Dom 7', suffix: '7', droneIntervals: [4, 10], minor: false },
  { id: 'maj7', label: 'Maj 7', suffix: 'maj7', droneIntervals: [4, 11], minor: false },
  { id: 'm7', label: 'Min 7', suffix: 'm7', droneIntervals: [3, 10], minor: true },
  { id: 'dorian', label: 'Dorian', suffix: 'm7', droneIntervals: [3, 9], minor: true },
  { id: 'lydian', label: 'Lydian', suffix: 'maj7', droneIntervals: [4, 6], minor: false },
  { id: 'mixolydian', label: 'Mixolydian', suffix: '7', droneIntervals: [4, 10], minor: false },
]

function chordVoicingMidis(symbol: string): number[] {
  const info = chordInfo(symbol)
  if (!info) return [48, 52, 55, 60]
  const base = 48 + info.root
  const tones = info.pcs.map(p => {
    const diff = (p - info.root + 12) % 12
    return base + diff
  }).sort((a, b) => a - b)
  const out = [...tones]
  if (out.length < 4) out.push(base + 12)
  return out
}

function beatRowsForPart(b: Beat, part: PartId): DrumRow[] {
  if (b.part === part || !b.parts?.[part]) {
    const layers = b.layers?.length ? b.layers.filter(l => !l.mute).flatMap(l => l.rows) : []
    return [...b.rows, ...layers]
  }
  const pcPart = b.parts[part]!
  const layers = pcPart.layers?.length ? pcPart.layers.filter(l => !l.mute).flatMap(l => l.rows) : []
  return [...pcPart.rows, ...layers]
}

class PocketEngine {
  playing = false
  owner: 'drummer' | 'band' | null = null
  bar = 0
  step = 0 // 0..15 within bar
  chordIdx = 0
  private nextStepTime = 0
  private unsub: (() => void) | null = null
  private drone = new Drone()
  private droneActive = false
  private beatCache: Beat | null = null
  queuedDrumFill: DrumFillHit[] | null = null
  queuedBassFill: BassFillHit[] | null = null
  customAiDrumFill: DrumFillHit[] | null = null
  customAiBassFill: BassFillHit[] | null = null
  private listeners = new Set<() => void>()

  cfg: PocketConfig = {
    bpm: 96,
    drumsOn: true,
    drumVol: 0.85,
    drumSource: 'groove',
    grooveId: GROOVES[0]?.id ?? 'rock',
    kitId: 'studio',
    beatPart: 'A',
    gapMode: 0,
    autoFill: 4,
    fillStyle: 'syncopated',
    mode: 'drone',
    droneOn: false,
    droneVol: 0.55,
    chordsOn: true,
    chordsVol: 0.72,
    chordSound: 'acoustic',
    chordFeel: 'strum',
    bassOn: true,
    bassVol: 0.8,
    bassKind: 'session',
    bassAutoFill: true,
    clickOn: false,
    clickVol: 0.5,
    root: 'G',
    quality: 'maj',
    chords: ['G', 'D', 'Em', 'C'],
  }

  onChange(f: () => void) { this.listeners.add(f); return () => { this.listeners.delete(f) } }
  private emit() { this.listeners.forEach(f => f()) }

  set(patch: Partial<PocketConfig>) {
    const prevDrone = this.cfg.droneOn && this.playing && this.owner === 'band'
    const prevKey = `${this.cfg.root}:${this.cfg.quality}`
    this.cfg = { ...this.cfg, ...patch }
    if (patch.drumSource === 'beatmaker' || patch.beatPart) this.beatCache = loadBeat()
    if (patch.kitId) void loadKit(patch.kitId)
    if (patch.chordSound) void loadSound(patch.chordSound)
    if (this.playing) {
      if (this.owner === 'band' && this.cfg.droneOn) {
        this.drone.setVolume(this.cfg.droneVol)
        if (!prevDrone || prevKey !== `${this.cfg.root}:${this.cfg.quality}`) this.startDroneNow()
      } else if (this.droneActive) {
        this.drone.stop()
        this.droneActive = false
      }
      updateClockState({ bpm: this.cfg.bpm })
    }
    this.emit()
  }

  private startDroneNow() {
    const q = QUALITIES.find(x => x.id === this.cfg.quality) ?? QUALITIES[0]
    const chordNow = this.activeChord()
    const info = this.cfg.mode === 'prog' ? chordInfo(chordNow) : null
    const rootMidi = 36 + (info ? info.root : pc(this.cfg.root))
    const intervals = info ? (info.pcs.includes((info.root + 3) % 12) ? [3] : [4]) : q.droneIntervals
    this.drone.setVolume(this.cfg.droneVol)
    this.drone.start(rootMidi, intervals)
    this.droneActive = true
  }

  activeChord(barIdx = this.bar): string {
    if (this.cfg.mode === 'prog' && this.cfg.chords.length) {
      return this.cfg.chords[barIdx % this.cfg.chords.length]
    }
    const q = QUALITIES.find(x => x.id === this.cfg.quality) ?? QUALITIES[0]
    return `${this.cfg.root}${q.suffix}`
  }

  queueDrumFillNow(hits?: DrumFillHit[]) {
    this.queuedDrumFill = hits ?? this.customAiDrumFill ?? generateDrumFill(this.cfg.fillStyle)
    this.emit()
  }

  queueBassFillNow(hits?: BassFillHit[]) {
    if (hits) { this.queuedBassFill = hits; this.emit(); return }
    const curC = chordInfo(this.activeChord(this.bar))
    const nxtC = chordInfo(this.activeChord(this.bar + 1))
    const curPc = curC ? curC.root : pc(this.cfg.root)
    const nxtPc = nxtC ? nxtC.root : curPc
    const isMin = curC ? curC.pcs.includes((curC.root + 3) % 12) : false
    this.queuedBassFill = this.customAiBassFill ?? generateBassFill(curPc, nxtPc, isMin)
    this.emit()
  }

  start(owner: 'drummer' | 'band') {
    if (this.playing) this.stop()
    this.owner = owner
    this.playing = true
    this.bar = 0
    this.step = 0
    this.chordIdx = 0
    this.beatCache = loadBeat()
    const ctx = audio()
    void ctx.resume()
    void loadKit(this.cfg.kitId)
    if (owner === 'band' && this.cfg.chordsOn) void loadSound(this.cfg.chordSound)
    liveSound(this, owner === 'drummer' ? 'Pocket Drummer' : 'Pocket Band')
    if (owner === 'band' && this.cfg.droneOn) this.startDroneNow()
    this.nextStepTime = ctx.currentTime + 0.06
    updateClockState({ playing: true, source: owner === 'drummer' ? 'beat' : 'jam', bpm: this.cfg.bpm, groove: this.cfg.grooveId })
    this.unsub = subscribeScheduler(now => this.tick(now), true)
    this.emit()
  }

  stop() {
    if (!this.playing) return
    this.playing = false
    this.unsub?.()
    this.unsub = null
    if (this.droneActive) { this.drone.stop(); this.droneActive = false }
    this.queuedDrumFill = null
    this.queuedBassFill = null
    quietSound(this)
    updateClockState({ playing: false })
    this.emit()
  }

  private tick(now: number) {
    if (!this.playing) return
    while (this.nextStepTime < now + LOOKAHEAD_SEC) {
      this.scheduleStep(this.bar, this.step, this.nextStepTime)
      const sp16 = 60 / Math.max(30, this.cfg.bpm) / 4
      this.nextStepTime += sp16
      this.step++
      if (this.step >= STEPS_PER_BAR) {
        this.step = 0
        this.bar++
        this.queuedDrumFill = null
        this.queuedBassFill = null
      }
    }
  }

  private scheduleStep(bar: number, step: number, when: number) {
    const c = this.cfg
    const isBand = this.owner === 'band'
    const barIn4 = bar % 4
    const inGap = c.gapMode === 1 ? barIn4 === 3 : c.gapMode === 2 ? barIn4 >= 2 : false

    // Publish live chord & beat to all other floating cards (5-Layer Fretboard, Licks, Circle)!
    if (step % 4 === 0) {
      const beat = Math.floor(step / 4)
      if (isBand) {
        const nowCh = this.activeChord(bar)
        const nxtCh = this.activeChord(bar + 1)
        const info = chordInfo(nowCh)
        const q = QUALITIES.find(x => x.id === c.quality) ?? QUALITIES[0]
        const rootPc = pc(c.root)
        const scaleSteps = q.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]
        publishFloat('pocket-band', {
          chordNow: nowCh,
          chordNext: nxtCh,
          beatsToChange: 4 - beat,
          keyName: `${c.root}${q.minor ? 'm' : ''}`,
          keyPcs: scaleSteps.map(s => (rootPc + s) % 12),
          bpm: c.bpm,
          bar: bar + 1,
          beat: beat + 1,
        })
        // Update drone root on bar 1 if progression mode + drone both active
        if (step === 0 && c.droneOn && c.mode === 'prog' && info) {
          this.drone.start(36 + info.root, info.pcs.includes((info.root + 3) % 12) ? [3] : [4])
        }
      } else {
        publishFloat('pocket-drummer', { bpm: c.bpm, bar: bar + 1, beat: beat + 1 })
      }
      this.emit()
    }

    // Auto-queue drum/bass fills at start of fill bar
    if (step === 0) {
      if (c.autoFill > 0 && (bar + 1) % c.autoFill === 0 && !this.queuedDrumFill) {
        this.queuedDrumFill = this.customAiDrumFill ?? generateDrumFill(c.fillStyle, bar)
      }
      if (isBand && c.bassOn && c.bassAutoFill && (bar + 1) % 4 === 0 && !this.queuedBassFill) {
        const curC = chordInfo(this.activeChord(bar))
        const nxtC = chordInfo(this.activeChord(bar + 1))
        const curPc = curC ? curC.root : pc(c.root)
        const nxtPc = nxtC ? nxtC.root : curPc
        const isMin = curC ? curC.pcs.includes((curC.root + 3) % 12) : false
        this.queuedBassFill = this.customAiBassFill ?? generateBassFill(curPc, nxtPc, isMin, bar)
      }
    }

    // 1. Click
    if (isBand && c.clickOn && step % 4 === 0) {
      playDrum(step === 0 ? 'bell' : 'rim', when, c.clickVol * (step === 0 ? 0.65 : 0.45), bus('drums'), c.kitId)
    }

    // 2. Drums (Built-in Grooves OR My Beat Maker + Fills + Gap Click)
    if (c.drumsOn && !inGap) {
      const fillActive = !!this.queuedDrumFill && step >= 8
      // Crash on beat 1 right after a fill bar
      if (step === 0 && bar > 0 && c.autoFill > 0 && bar % c.autoFill === 0) {
        playDrum('crash', when, c.drumVol * 0.72, bus('drums'), c.kitId)
      }
      if (fillActive) {
        for (const h of this.queuedDrumFill!) {
          if (h.step === step) playDrum(h.voice, when, h.vel * c.drumVol, bus('drums'), c.kitId)
        }
      } else if (c.drumSource === 'beatmaker') {
        const b = this.beatCache ?? (this.beatCache = loadBeat())
        const rows = beatRowsForPart(b, c.beatPart)
        const total = Math.max(STEPS_PER_BAR, b.bars * STEPS_PER_BAR)
        const idx = (bar * STEPS_PER_BAR + step) % total
        for (const r of rows) {
          if (r.mute) continue
          const v = r.steps[idx] ?? 0
          if (v > 0) playDrum(r.voice as Voice, when, Math.min(1, v) * c.drumVol, bus('drums'), b.kit || c.kitId)
        }
      } else {
        const gr = grooveOf(c.grooveId) ?? GROOVES[0]
        const stepBeat = step / 4
        for (const [bPos, voice, vel] of gr.hits) {
          if (Math.abs(bPos - stepBeat) < 0.06) {
            playDrum(voice, when, vel * c.drumVol, bus('drums'), c.kitId)
          }
        }
      }
    }

    if (!isBand) return

    // 3. Chords / Guitar (using real Sound Packs!)
    if (c.chordsOn) {
      const ch = this.activeChord(bar)
      const midis = chordVoicingMidis(ch)
      const feel = c.chordFeel
      if (feel === 'hold' && step === 0) {
        strum(midis, when, { gain: c.chordsVol * 0.75, spread: 0.032, dest: bus('band'), sound: c.chordSound })
      } else if (feel === 'strum' && (step === 0 || step === 6 || step === 8 || step === 10 || step === 14)) {
        const up = step === 6 || step === 10 || step === 14
        strum(midis, when, { up, gain: c.chordsVol * (step === 0 ? 0.8 : up ? 0.52 : 0.64), spread: 0.022, dest: bus('band'), sound: c.chordSound })
      } else if (feel === 'pulse' && step % 4 === 0) {
        strum(midis, when, { gain: c.chordsVol * (step === 0 ? 0.76 : 0.58), spread: 0.018, dest: bus('band'), sound: c.chordSound })
      } else if (feel === 'arp' && step % 2 === 0) {
        const m = midis[(step / 2) % midis.length]
        playNote(m, when, c.chordsVol * 0.7, bus('band'), { sound: c.chordSound })
      }
    }

    // 4. Bass (using recorded Studio Bass packs + Bass Fills!)
    if (c.bassOn) {
      const ch = this.activeChord(bar)
      const info = chordInfo(ch)
      const rootPc = info ? info.root : pc(c.root)
      const bassRoot = 28 + ((rootPc - 4 + 12) % 12)
      const bassFifth = bassRoot + 7
      if (this.queuedBassFill && step >= 8) {
        for (const h of this.queuedBassFill) {
          if (h.step === step) playBass(h.midi, when, h.vel * c.bassVol, bus('bass'), c.bassKind)
        }
      } else if (step === 0) {
        playBass(bassRoot, when, c.bassVol * 0.92, bus('bass'), c.bassKind)
      } else if (step === 6) {
        playBass(bassRoot, when, c.bassVol * 0.65, bus('bass'), c.bassKind)
      } else if (step === 8) {
        playBass(bassFifth, when, c.bassVol * 0.78, bus('bass'), c.bassKind)
      } else if (step === 12) {
        playBass(bassRoot, when, c.bassVol * 0.72, bus('bass'), c.bassKind)
      }
    }
  }
}

export const pocketEngine = new PocketEngine()

function usePocket() {
  const [, bump] = useState(0)
  useEffect(() => pocketEngine.onChange(() => bump(n => n + 1)), [])
  return pocketEngine
}

// ---------- #2: Pocket Drummer Floating Card (Drums ONLY — zero drone!) ----------
export function PocketDrummerBody({ ctx }: { ctx: FloatCtx }) {
  const eng = usePocket()
  const c = eng.cfg
  const [group, setGroup] = useState(() => grooveOf(c.grooveId)?.group ?? GROOVE_GROUPS[0])
  const [aiBusy, setAiBusy] = useState(false)
  const [aiNote, setAiNote] = useState('')
  const taps = useRef<number[]>([])
  const active = eng.playing && eng.owner === 'drummer'

  const groupGrooves = useMemo(() => GROOVES.filter(g => g.group === group), [group])

  const tapTempo = () => {
    const now = performance.now()
    const list = taps.current.filter(t => now - t < 2500)
    list.push(now)
    taps.current = list.slice(-5)
    if (list.length >= 2) {
      const diffs = list.slice(1).map((t, i) => t - list[i])
      const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length
      const bpm = Math.max(40, Math.min(220, Math.round(60000 / avg)))
      eng.set({ bpm })
    }
  }

  const togglePlay = () => {
    if (active) eng.stop()
    else {
      eng.set({ drumsOn: true })
      eng.start('drummer')
    }
  }

  const runAiFill = async () => {
    setAiBusy(true); setAiNote('')
    const hits = await askAiDrumFill({ style: c.drumSource === 'beatmaker' ? 'custom beat maker groove' : (grooveOf(c.grooveId)?.label ?? group), bpm: c.bpm, kit: c.kitId })
    setAiBusy(false)
    if (hits) {
      eng.customAiDrumFill = hits
      eng.queueDrumFillNow(hits)
      setAiNote(`✨ AI fill ready (${hits.length} hits)`)
    } else {
      eng.queueDrumFillNow()
      setAiNote('Queued fresh musical fill')
    }
  }

  return (
    <div className="stack small" style={{ gap: 7 }} data-testid="fc-drummer">
      <div className="row" style={{ gap: 6, alignItems: 'center', justifyContent: 'space-between' }}>
        <button className={`btn sm${active ? ' on' : ' primary'}`} onClick={togglePlay} data-testid="drum-play">
          <Ico n={active ? 'stop' : 'play'} fill /> {active ? 'Stop' : 'Play drums'}
        </button>
        <div className="row" style={{ gap: 4, alignItems: 'center' }}>
          <button className="btn sm" onClick={() => eng.set({ bpm: Math.max(40, c.bpm - 5) })} aria-label="Slower">−</button>
          <b className="tabular" style={{ minWidth: 56, textAlign: 'center' }}>{c.bpm} BPM</b>
          <button className="btn sm" onClick={() => eng.set({ bpm: Math.min(220, c.bpm + 5) })} aria-label="Faster">+</button>
          <button className="btn sm ghost" onClick={tapTempo} title="Tap tempo">Tap</button>
          {ctx.bpm && Math.abs(Math.round(ctx.bpm) - c.bpm) > 1 && (
            <button className="btn sm ghost" onClick={() => eng.set({ bpm: Math.round(ctx.bpm!) })} title="Match current song/Jam BPM">Sync</button>
          )}
        </div>
      </div>

      {/* Drum source: 7 Genre Groups OR My Beat Maker */}
      <div className="seg" role="group" aria-label="Drum source">
        <button className="btn sm" aria-pressed={c.drumSource === 'groove'} onClick={() => eng.set({ drumSource: 'groove' })}>Grooves ({GROOVES.length})</button>
        <button className="btn sm" aria-pressed={c.drumSource === 'beatmaker'} onClick={() => eng.set({ drumSource: 'beatmaker' })} data-testid="drum-src-beatmaker">My Beat Maker</button>
      </div>

      {c.drumSource === 'groove' ? (
        <div className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
          <select className="select sm" style={{ flex: '1 1 110px' }} value={group} onChange={e => { const g = e.target.value; setGroup(g); const first = GROOVES.find(x => x.group === g); if (first) eng.set({ grooveId: first.id }) }} aria-label="Drum genre">
            {GROOVE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select className="select sm" style={{ flex: '1 1 120px' }} value={c.grooveId} onChange={e => eng.set({ grooveId: e.target.value })} aria-label="Drum groove">
            {groupGrooves.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
          <button className="btn sm ghost" onClick={() => { const pick = GROOVES[Math.floor(Math.random() * GROOVES.length)]; setGroup(pick.group ?? GROOVE_GROUPS[0]); eng.set({ grooveId: pick.id }) }} title="Random groove"><Ico n="dice" /></button>
        </div>
      ) : (
        <div className="row" style={{ gap: 6, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span className="row" style={{ gap: 4, alignItems: 'center' }}>
            <span className="muted">Part:</span>
            {PART_IDS.map(p => (
              <button key={p} className={`btn sm${c.beatPart === p ? ' on' : ' ghost'}`} onClick={() => eng.set({ beatPart: p })}>{p}</button>
            ))}
          </span>
          <button className="btn sm ghost" onClick={() => openJam('beats')}>Edit in Beat Maker →</button>
        </div>
      )}

      <div className="row" style={{ gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="select sm" style={{ flex: '1 1 110px' }} value={c.kitId} onChange={e => eng.set({ kitId: e.target.value as KitId })} aria-label="Drum kit">
          {KITS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>
        <select className="select sm" style={{ flex: '1 1 110px' }} value={c.gapMode} onChange={e => eng.set({ gapMode: Number(e.target.value) as GapMode })} aria-label="Gap click">
          <option value={0}>Gap click: Off</option>
          <option value={1}>Gap: 1 bar / 4</option>
          <option value={2}>Gap: 2 bars / 4</option>
        </select>
      </div>

      {/* Fills: Auto + Manual Fill Now + ✨ AI Fill */}
      <div className="row" style={{ gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="select sm" style={{ width: 'auto' }} value={c.autoFill} onChange={e => eng.set({ autoFill: Number(e.target.value) as FillFreq })} aria-label="Auto fill">
          <option value={0}>Auto-fill: Off</option>
          <option value={4}>Fill / 4 bars</option>
          <option value={8}>Fill / 8 bars</option>
        </select>
        <select className="select sm" style={{ width: 'auto' }} value={c.fillStyle} onChange={e => eng.set({ fillStyle: e.target.value as DrumFillStyle })} aria-label="Fill style">
          <option value="simple">Simple</option>
          <option value="syncopated">Syncopated</option>
          <option value="linear">Linear</option>
          <option value="double">Double-time</option>
        </select>
        <button className={`btn sm${eng.queuedDrumFill ? ' on' : ''}`} onClick={() => eng.queueDrumFillNow()} data-testid="drum-fill-now">🔥 Fill now</button>
        {canUseAiFills() && (
          <button className="btn sm ghost" disabled={aiBusy} onClick={() => void runAiFill()} data-testid="drum-ai-fill">
            {aiBusy ? 'Writing…' : '✨ AI Fill'}
          </button>
        )}
      </div>
      {aiNote && <span className="muted" style={{ fontSize: 11 }}>{aiNote}</span>}
    </div>
  )
}

// ---------- #3: Pocket Band & Drone Floating Card ----------
export function PocketBandBody() {
  const eng = usePocket()
  const c = eng.cfg
  const [mixerOpen, setMixerOpen] = useState(false)
  const [group, setGroup] = useState(() => grooveOf(c.grooveId)?.group ?? GROOVE_GROUPS[0])
  const [aiNote, setAiNote] = useState('')
  const [aiBusy, setAiBusy] = useState<null | 'drum' | 'bass'>(null)
  const active = eng.playing && eng.owner === 'band'
  const sounds = useMemo(() => allSounds(), [])
  const groupGrooves = useMemo(() => GROOVES.filter(g => g.group === group), [group])

  // Listen for "+ Band" clicks from the Circle & Key Sheet card!
  useEffect(() => onBandAddChord(ch => {
    eng.set({ mode: 'prog', chords: [...eng.cfg.chords.slice(-7), ch] })
  }), [eng])

  const togglePlay = () => {
    if (active) eng.stop()
    else eng.start('band')
  }

  const runAiDrum = async () => {
    setAiBusy('drum'); setAiNote('')
    const hits = await askAiDrumFill({ style: c.drumSource === 'beatmaker' ? 'beat maker groove' : (grooveOf(c.grooveId)?.label ?? group), bpm: c.bpm, kit: c.kitId })
    setAiBusy(null)
    if (hits) { eng.customAiDrumFill = hits; eng.queueDrumFillNow(hits); setAiNote(`✨ AI drum fill queued (${hits.length} hits)`) }
    else { eng.queueDrumFillNow(); setAiNote('Queued drum fill') }
  }
  const runAiBass = async () => {
    setAiBusy('bass'); setAiNote('')
    const hits = await askAiBassFill({ curChord: eng.activeChord(eng.bar), nextChord: eng.activeChord(eng.bar + 1), bpm: c.bpm, style: group })
    setAiBusy(null)
    if (hits) { eng.customAiBassFill = hits; eng.queueBassFillNow(hits); setAiNote(`✨ AI bass turnaround queued (${hits.length} notes)`) }
    else { eng.queueBassFillNow(); setAiNote('Queued bass turnaround') }
  }

  return (
    <div className="stack small" style={{ gap: 7 }} data-testid="fc-band">
      {/* Top transport + Single Chord/Drone vs Progression mode */}
      <div className="row" style={{ gap: 6, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <button className={`btn sm${active ? ' on' : ' primary'}`} onClick={togglePlay} data-testid="band-play">
          <Ico n={active ? 'stop' : 'play'} fill /> {active ? 'Stop' : 'Play'}
        </button>
        <div className="seg" role="group" aria-label="Band mode">
          <button className="btn sm" aria-pressed={c.mode === 'drone'} onClick={() => eng.set({ mode: 'drone' })} data-testid="band-mode-drone">Single / Drone</button>
          <button className="btn sm" aria-pressed={c.mode === 'prog'} onClick={() => eng.set({ mode: 'prog' })} data-testid="band-mode-prog">Progression</button>
        </div>
        <span className="row" style={{ gap: 3, alignItems: 'center' }}>
          <button className="btn sm ghost" onClick={() => eng.set({ bpm: Math.max(40, c.bpm - 5) })}>−</button>
          <b className="tabular">{c.bpm}</b>
          <button className="btn sm ghost" onClick={() => eng.set({ bpm: Math.min(220, c.bpm + 5) })}>+</button>
        </span>
      </div>

      {/* Key + Chord/Mode OR Progression chips */}
      <div className="row" style={{ gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="select sm" style={{ width: 64 }} value={c.root} onChange={e => {
          const r = e.target.value
          const preset = PROG_PRESETS[0]
          eng.set({ root: r, ...(c.mode === 'prog' ? { chords: preset.build(r) } : {}) })
        }} aria-label="Key root">
          {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        {c.mode === 'drone' ? (
          <select className="select sm" style={{ flex: 1 }} value={c.quality} onChange={e => eng.set({ quality: e.target.value })} aria-label="Chord or mode">
            {QUALITIES.map(q => <option key={q.id} value={q.id}>{c.root} {q.label}</option>)}
          </select>
        ) : (
          <select className="select sm" style={{ flex: 1 }} defaultValue="" onChange={e => { const p = PROG_PRESETS.find(x => x.id === e.target.value); if (p) eng.set({ chords: p.build(c.root) }) }} aria-label="Progression preset">
            <option value="" disabled>Pick progression…</option>
            {PROG_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        )}
      </div>

      {c.mode === 'prog' && (
        <div className="row" style={{ gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          {c.chords.map((ch, idx) => {
            const isNow = active && (eng.bar % c.chords.length) === idx
            return (
              <span key={`${ch}-${idx}`} className={`chip${isNow ? ' on' : ''}`} style={{ padding: '2px 8px', minHeight: 24, fontSize: 12, ...(isNow ? { background: 'var(--accent)', color: 'var(--accent-ink)' } : {}) }}>
                {ch}
              </span>
            )
          })}
          {c.chords.length > 2 && (
            <button className="btn sm ghost" onClick={() => eng.set({ chords: c.chords.slice(0, -1) })} title="Remove last chord">⌫</button>
          )}
        </div>
      )}

      {/* Independent layer toggles (turn Drone OFF whenever you just want Band/Drums!) */}
      <div className="row" style={{ gap: 4, flexWrap: 'wrap' }} role="group" aria-label="Band layers">
        <button className={`btn sm${c.droneOn ? ' on' : ' ghost'}`} aria-pressed={c.droneOn} onClick={() => eng.set({ droneOn: !c.droneOn })} data-testid="band-tog-drone">Drone</button>
        <button className={`btn sm${c.chordsOn ? ' on' : ' ghost'}`} aria-pressed={c.chordsOn} onClick={() => eng.set({ chordsOn: !c.chordsOn })} data-testid="band-tog-chords">Chords</button>
        <button className={`btn sm${c.bassOn ? ' on' : ' ghost'}`} aria-pressed={c.bassOn} onClick={() => eng.set({ bassOn: !c.bassOn })} data-testid="band-tog-bass">Bass</button>
        <button className={`btn sm${c.drumsOn ? ' on' : ' ghost'}`} aria-pressed={c.drumsOn} onClick={() => eng.set({ drumsOn: !c.drumsOn })} data-testid="band-tog-drums">Drums</button>
        <button className={`btn sm${c.clickOn ? ' on' : ' ghost'}`} aria-pressed={c.clickOn} onClick={() => eng.set({ clickOn: !c.clickOn })} data-testid="band-tog-click">Click</button>
        <button className="btn sm ghost" onClick={() => setMixerOpen(o => !o)} aria-expanded={mixerOpen} data-testid="band-mixer-toggle">
          <Ico n="sliders" /> {mixerOpen ? 'Hide' : 'Packs & Mix ▾'}
        </button>
      </div>

      {/* Quick Drum & Bass Fill triggers */}
      <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
        {c.drumsOn && <button className={`btn sm${eng.queuedDrumFill ? ' on' : ' ghost'}`} onClick={() => eng.queueDrumFillNow()}>🔥 Drum fill</button>}
        {c.bassOn && <button className={`btn sm${eng.queuedBassFill ? ' on' : ' ghost'}`} onClick={() => eng.queueBassFillNow()}>🎸 Bass fill</button>}
        {canUseAiFills() && c.drumsOn && <button className="btn sm ghost" disabled={aiBusy === 'drum'} onClick={() => void runAiDrum()}>{aiBusy === 'drum' ? '…' : '✨ AI Drum'}</button>}
        {canUseAiFills() && c.bassOn && <button className="btn sm ghost" disabled={aiBusy === 'bass'} onClick={() => void runAiBass()}>{aiBusy === 'bass' ? '…' : '✨ AI Bass'}</button>}
      </div>
      {aiNote && <span className="muted" style={{ fontSize: 11 }}>{aiNote}</span>}

      {/* Sound Pack pickers + Band Mixer + Beat Maker Drums */}
      {mixerOpen && (
        <div className="stack" style={{ gap: 6, paddingTop: 6, borderTop: '1px solid var(--hairline)' }} data-testid="band-mixer-panel">
          <label className="row" style={{ gap: 6, alignItems: 'center' }}>
            <span className="muted" style={{ width: 52 }}>Chords</span>
            <select className="select sm" style={{ flex: 1 }} value={c.chordSound} onChange={e => eng.set({ chordSound: e.target.value as SoundId })}>
              {sounds.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <select className="select sm" style={{ width: 82 }} value={c.chordFeel} onChange={e => eng.set({ chordFeel: e.target.value as ChordFeel })}>
              <option value="strum">Strum</option>
              <option value="hold">Hold</option>
              <option value="arp">Arp</option>
              <option value="pulse">Pulse</option>
            </select>
          </label>
          <label className="row" style={{ gap: 6, alignItems: 'center' }}>
            <span className="muted" style={{ width: 52 }}>Bass</span>
            <select className="select sm" style={{ flex: 1 }} value={c.bassKind} onChange={e => eng.set({ bassKind: e.target.value as BassKind })}>
              {(['session', 'sixties', 'modern'] as BassKind[]).map(k => <option key={k} value={k}>{BASS_LABEL[k]}</option>)}
            </select>
            <button className={`btn sm${c.bassAutoFill ? ' on' : ' ghost'}`} onClick={() => eng.set({ bassAutoFill: !c.bassAutoFill })} title="Auto bass turnaround on bar 4">Auto-fill</button>
          </label>
          <div className="row" style={{ gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="muted" style={{ width: 52 }}>Drums</span>
            <select className="select sm" style={{ width: 105 }} value={c.drumSource} onChange={e => eng.set({ drumSource: e.target.value as DrumSource })}>
              <option value="groove">Grooves</option>
              <option value="beatmaker">My Beat Maker</option>
            </select>
            {c.drumSource === 'groove' ? (
              <>
                <select className="select sm" style={{ flex: 1 }} value={group} onChange={e => { const g = e.target.value; setGroup(g); const first = GROOVES.find(x => x.group === g); if (first) eng.set({ grooveId: first.id }) }}>
                  {GROOVE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select className="select sm" style={{ flex: 1 }} value={c.grooveId} onChange={e => eng.set({ grooveId: e.target.value })}>
                  {groupGrooves.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                </select>
              </>
            ) : (
              <span className="row" style={{ gap: 3 }}>
                {PART_IDS.map(p => <button key={p} className={`btn sm${c.beatPart === p ? ' on' : ' ghost'}`} onClick={() => eng.set({ beatPart: p })}>{p}</button>)}
              </span>
            )}
          </div>
          {/* Individual volume sliders */}
          {([
            ['Drone', c.droneVol, (v: number) => eng.set({ droneVol: v }), c.droneOn],
            ['Chords', c.chordsVol, (v: number) => eng.set({ chordsVol: v }), c.chordsOn],
            ['Bass', c.bassVol, (v: number) => eng.set({ bassVol: v }), c.bassOn],
            ['Drums', c.drumVol, (v: number) => eng.set({ drumVol: v }), c.drumsOn],
          ] as const).map(([lbl, val, setVal, on]) => (
            <label key={lbl} className="row" style={{ gap: 6, alignItems: 'center', opacity: on ? 1 : 0.45 }}>
              <span className="muted" style={{ width: 52 }}>{lbl}</span>
              <input type="range" min={0} max={100} value={Math.round(val * 100)} onChange={e => setVal(Number(e.target.value) / 100)} style={{ flex: 1 }} />
              <span className="tabular" style={{ width: 32, textAlign: 'right' }}>{Math.round(val * 100)}%</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
