// The beat maker's instruments: sampled ones (Salamander grand, the VSCO 2 orchestra, MusyngKite keys and voices, the
// app's own guitars and bass) and synths built here (supersaw, plucks, pads, leads, an 808 sub, a tonewheel organ).
// Every note returns a handle that fades out when stopped, so held keys and piano-roll notes last as long as they should.
import { audio, route } from '../audio/engine'
import { loadBank, loadSound, playBass, playFromBank, playNote, type Handle, type SoundId } from '../audio/pluck'
import { BASS_LABEL, BASS_PACK, bassPacks, packSounds, type BassKind } from '../audio/packSounds'

export type SynthKind =
  | 'supersaw' | 'pluck' | 'warmpad' | 'ambient' | 'sawlead' | 'squarelead' | 'sub808' | 'synthbass' | 'organ'
  | 'juno' | 'prophet' | 'lofikeys' | 'wurli' | 'fmglass' | 'shimmer' | 'moogpoly' | 'clavinet' | 'moogbass' | 'reesebass'
export interface Instr {
  id: string
  label: string
  group: 'Keys' | 'Guitars' | 'Bass' | 'Strings' | 'Voices' | 'Winds and brass' | 'Mallets and bells' | 'Synths'
  /** sample bank (public/samples/<bank>) */
  bank?: string
  /** one of the app's guitar sounds (built-in or pack:<id>) */
  guitar?: SoundId
  /** specific recorded Studio Bass / JamBass kind */
  bassKind?: BassKind
  synth?: SynthKind
  /** seconds to fade out when a note stops */
  release: number
  gain: number
  /** the range it sounds good in (the keyboard and the piano roll start here) */
  lo: number; hi: number
  /** glide into each note from below (steel guitar) */
  slide?: boolean
  /** how much of it goes to the reverb by default */
  space: number
}

const I = (id: string, label: string, group: Instr['group'], o: Partial<Instr>): Instr => ({ id, label, group, release: 0.12, gain: 0.8, lo: 48, hi: 84, space: 0.15, ...o })
export const INSTRS: Instr[] = [
  I('grand', 'Grand piano', 'Keys', { bank: 'inst/grand', release: 0.35, lo: 36, hi: 96, space: 0.18 }),
  I('upright', 'Upright piano (lo-fi)', 'Keys', { bank: 'inst/upright', release: 0.3, lo: 36, hi: 96, space: 0.15 }),
  I('epiano', 'Electric piano', 'Keys', { bank: 'inst/epiano', release: 0.3, lo: 36, hi: 93, space: 0.2 }),
  I('wurli', 'Wurlitzer funk EP', 'Keys', { synth: 'wurli', release: 0.24, gain: 0.56, lo: 36, hi: 90, space: 0.18 }),
  I('lofikeys', 'Lo-Fi tape keys', 'Keys', { synth: 'lofikeys', release: 0.4, gain: 0.54, lo: 40, hi: 88, space: 0.28 }),
  I('fmglass', 'FM glass keys (DX7)', 'Keys', { synth: 'fmglass', release: 0.38, gain: 0.5, lo: 44, hi: 92, space: 0.32 }),
  I('clavinet', 'Funk clavinet', 'Keys', { synth: 'clavinet', release: 0.08, gain: 0.52, lo: 38, hi: 86, space: 0.1 }),
  I('honky', 'Honky-tonk piano', 'Keys', { bank: 'inst/honky', release: 0.25, lo: 36, hi: 93, space: 0.12 }),
  I('organ', 'Tonewheel organ', 'Keys', { synth: 'organ', release: 0.06, gain: 0.55, lo: 36, hi: 93, space: 0.15 }),
  I('church', 'Church organ', 'Keys', { bank: 'inst/church', release: 0.5, lo: 24, hi: 96, space: 0.35 }),
  I('acoustic', 'Acoustic guitar', 'Guitars', { guitar: 'acoustic', release: 0.2, lo: 40, hi: 84 }),
  I('nylon', 'Nylon / ukulele', 'Guitars', { guitar: 'nylon', release: 0.2, lo: 48, hi: 84 }),
  I('clean', 'Clean electric', 'Guitars', { guitar: 'clean', release: 0.15, lo: 40, hi: 86 }),
  I('crunch', 'Crunch guitar', 'Guitars', { guitar: 'crunch', release: 0.08, lo: 40, hi: 86, space: 0.08 }),
  I('metal', 'Distorted guitar', 'Guitars', { guitar: 'metal', release: 0.06, lo: 38, hi: 84, space: 0.06 }),
  I('steel', 'Steel guitar (slides)', 'Guitars', { guitar: 'clean', slide: true, release: 0.3, lo: 52, hi: 88, space: 0.25 }),
  I('banjo', 'Banjo', 'Guitars', { bank: 'inst/banjo', release: 0.15, lo: 48, hi: 84 }),
  I('bass', 'Electric bass', 'Bass', { bank: 'bass', release: 0.08, gain: 0.9, lo: 28, hi: 60, space: 0.03 }),
  I('upbass', 'Upright bass', 'Bass', { bank: 'inst/upbass', release: 0.1, gain: 0.9, lo: 28, hi: 55, space: 0.05 }),
  I('synthbass', 'Synth bass', 'Bass', { synth: 'synthbass', release: 0.06, gain: 0.7, lo: 28, hi: 55, space: 0.02 }),
  I('moogbass', 'Moog funk synth bass', 'Bass', { synth: 'moogbass', release: 0.08, gain: 0.74, lo: 26, hi: 55, space: 0.03 }),
  I('reesebass', 'Deep Reese sub bass', 'Bass', { synth: 'reesebass', release: 0.2, gain: 0.72, lo: 24, hi: 52, space: 0.08 }),
  I('sub808', '808 sub (slides)', 'Bass', { synth: 'sub808', release: 0.12, gain: 0.9, lo: 24, hi: 50, space: 0 }),
  I('strings', 'String section', 'Strings', { bank: 'inst/strings', release: 0.6, lo: 36, hi: 96, space: 0.35 }),
  I('fiddle', 'Violin / fiddle', 'Strings', { bank: 'inst/fiddle', release: 0.35, lo: 55, hi: 96, space: 0.25 }),
  I('cellos', 'Cellos', 'Strings', { bank: 'inst/cellos', release: 0.5, lo: 36, hi: 72, space: 0.3 }),
  I('pizz', 'Pizzicato strings', 'Strings', { bank: 'inst/pizz', release: 0.15, lo: 55, hi: 96, space: 0.25 }),
  I('harp', 'Harp', 'Strings', { bank: 'inst/harp', release: 0.6, lo: 36, hi: 96, space: 0.35 }),
  I('choir', 'Choir "aah"', 'Voices', { bank: 'inst/choir', release: 0.8, lo: 45, hi: 84, space: 0.4 }),
  I('voices', 'Voices "ooh"', 'Voices', { bank: 'inst/voices', release: 0.8, lo: 45, hi: 84, space: 0.4 }),
  I('flute', 'Flute', 'Winds and brass', { bank: 'inst/flute', release: 0.25, lo: 60, hi: 96, space: 0.3 }),
  I('horns', 'French horns', 'Winds and brass', { bank: 'inst/horns', release: 0.4, lo: 36, hi: 77, space: 0.35 }),
  I('trumpet', 'Trumpet', 'Winds and brass', { bank: 'inst/trumpet', release: 0.25, lo: 52, hi: 84, space: 0.2 }),
  I('harmonica', 'Harmonica', 'Winds and brass', { bank: 'inst/harmonica', release: 0.2, lo: 55, hi: 88, space: 0.15 }),
  I('marimba', 'Marimba', 'Mallets and bells', { bank: 'inst/marimba', release: 0.3, lo: 45, hi: 96, space: 0.2 }),
  I('vibes', 'Vibraphone', 'Mallets and bells', { bank: 'inst/vibes', release: 0.5, lo: 48, hi: 93, space: 0.3 }),
  I('xylo', 'Xylophone', 'Mallets and bells', { bank: 'inst/xylo', release: 0.2, lo: 55, hi: 100, space: 0.2 }),
  I('glock', 'Glockenspiel (bells)', 'Mallets and bells', { bank: 'inst/glock', release: 0.6, lo: 67, hi: 108, space: 0.3 }),
  I('steeldrums', 'Steel drums', 'Mallets and bells', { bank: 'inst/steeldrums', release: 0.3, lo: 48, hi: 90, space: 0.25 }),
  I('juno', 'Juno 106 chorus pad', 'Synths', { synth: 'juno', release: 0.65, gain: 0.48, lo: 40, hi: 86, space: 0.4 }),
  I('prophet', 'Prophet analog brass', 'Synths', { synth: 'prophet', release: 0.28, gain: 0.48, lo: 40, hi: 86, space: 0.26 }),
  I('moogpoly', 'Deep Moog poly', 'Synths', { synth: 'moogpoly', release: 0.32, gain: 0.5, lo: 38, hi: 84, space: 0.25 }),
  I('shimmer', 'Dreamy shimmer pad', 'Synths', { synth: 'shimmer', release: 1.6, gain: 0.46, lo: 40, hi: 86, space: 0.65 }),
  I('supersaw', 'Supersaw (EDM chords)', 'Synths', { synth: 'supersaw', release: 0.35, gain: 0.45, lo: 48, hi: 84, space: 0.35 }),
  I('pluck', 'Synth pluck', 'Synths', { synth: 'pluck', release: 0.15, gain: 0.55, lo: 48, hi: 90, space: 0.3 }),
  I('warmpad', 'Warm pad', 'Synths', { synth: 'warmpad', release: 1.2, gain: 0.5, lo: 40, hi: 84, space: 0.45 }),
  I('ambient', 'Ambient pad', 'Synths', { synth: 'ambient', release: 2.5, gain: 0.45, lo: 36, hi: 84, space: 0.7 }),
  I('sawlead', 'Saw lead', 'Synths', { synth: 'sawlead', release: 0.15, gain: 0.45, lo: 55, hi: 96, space: 0.25 }),
  I('squarelead', 'Square lead', 'Synths', { synth: 'squarelead', release: 0.12, gain: 0.4, lo: 55, hi: 96, space: 0.2 }),
]
export const INSTR_GROUPS: Instr['group'][] = ['Keys', 'Guitars', 'Bass', 'Strings', 'Voices', 'Winds and brass', 'Mallets and bells', 'Synths']
/** All Beat Maker instruments: built-ins + all imported .kgpack guitars + harvested Studio Bass / JamBass packs. */
export function allInstrs(): Instr[] {
  const extraGuitars: Instr[] = packSounds().map(p =>
    I(`pack:${p.id}`, `${p.name} ★`, 'Guitars', {
      guitar: `pack:${p.id}` as SoundId,
      release: p.base === 'metal' || p.base === 'crunch' ? 0.08 : 0.2,
      lo: 38,
      hi: 86,
      space: p.amp ? 0.08 : 0.16,
    }),
  )
  const haveBass = bassPacks()
  const extraBasses: Instr[] = (['session', 'sixties', 'modern', 'upright'] as BassKind[])
    .filter(k => haveBass.includes(BASS_PACK[k]) || (k === 'sixties' && haveBass.includes('jambass')))
    .map(k =>
      I(`bass:${k}`, `Studio Bass — ${BASS_LABEL[k]} ★`, 'Bass', {
        bank: 'bass',
        bassKind: k,
        release: 0.09,
        gain: 0.92,
        lo: 28,
        hi: 60,
        space: 0.04,
      }),
    )
  return [...INSTRS, ...extraGuitars, ...extraBasses]
}
export const instr = (id: string) => {
  const all = allInstrs()
  const found = all.find(x => x.id === id)
  if (found) return found
  if (id.startsWith('pack:')) {
    return I(id, id.slice(5), 'Guitars', { guitar: id as SoundId, release: 0.16, lo: 38, hi: 86, space: 0.12 })
  }
  return INSTRS[0]
}

/** Load an instrument's samples (synths need nothing). */
export function loadInstr(id: string): Promise<void> {
  const d = instr(id)
  if (d.guitar) return loadSound(d.guitar)
  if (d.bank) return loadBank(d.bank)
  return Promise.resolve()
}

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

/** A synth voice: oscillators → filter → amp envelope, with optional LFOs. */
function synth(kind: SynthKind, midi: number, when: number, vel: number, dest: AudioNode, glideFrom?: number): Handle {
  const ctx = audio()
  const t = Math.max(when, ctx.currentTime)
  const f = hz(midi)
  const amp = ctx.createGain()
  const filt = ctx.createBiquadFilter()
  filt.type = 'lowpass'
  filt.connect(amp)
  amp.connect(dest)
  const oscs: OscillatorNode[] = []
  const lfos: OscillatorNode[] = []
  const add = (type: OscillatorType, ratio: number, cents: number, level: number) => {
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.value = f * ratio
    o.detune.value = cents
    if (glideFrom !== undefined) { o.frequency.setValueAtTime(hz(glideFrom) * ratio, t); o.frequency.exponentialRampToValueAtTime(f * ratio, t + 0.09) }
    const g = ctx.createGain()
    g.gain.value = level
    o.connect(g).connect(filt)
    oscs.push(o)
    return o
  }
  const lfo = (rate: number, depth: number, param: AudioParam, delay = 0) => {
    const l = ctx.createOscillator()
    l.frequency.value = rate
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(depth, t + delay + 0.01)
    l.connect(g).connect(param)
    lfos.push(l)
  }
  let attack = 0.005, peak = vel, sustain = vel, decay = 0.2, release = 0.15
  switch (kind) {
    case 'supersaw':
      for (const [c, l] of [[-28, 0.5], [-17, 0.7], [-7, 0.9], [0, 1], [7, 0.9], [17, 0.7], [28, 0.5]] as const) add('sawtooth', 1, c, l * 0.16)
      add('sine', 0.5, 0, 0.25)
      filt.frequency.value = 5200; filt.Q.value = 0.6
      attack = 0.012; decay = 0.4; sustain = vel * 0.8; release = 0.35
      break
    case 'pluck':
      add('sawtooth', 1, -5, 0.35); add('square', 1, 5, 0.25); add('sine', 0.5, 0, 0.2)
      filt.Q.value = 4
      filt.frequency.setValueAtTime(7500, t); filt.frequency.exponentialRampToValueAtTime(550, t + 0.28)
      attack = 0.002; decay = 0.55; sustain = vel * 0.08; release = 0.15
      break
    case 'warmpad':
      add('sawtooth', 1, -9, 0.35); add('sawtooth', 1, 9, 0.35); add('triangle', 0.5, 0, 0.35)
      filt.frequency.value = 1900; filt.Q.value = 0.5
      lfo(0.15, 450, filt.frequency)
      attack = 0.35; decay = 0.6; sustain = vel * 0.85; release = 1.2
      break
    case 'ambient':
      add('sawtooth', 1, -13, 0.28); add('sawtooth', 1, 13, 0.28); add('sawtooth', 2, 4, 0.12); add('sine', 0.5, 0, 0.4)
      filt.frequency.value = 1300; filt.Q.value = 0.9
      lfo(0.07, 700, filt.frequency); lfo(0.21, 6, oscs[0].detune)
      attack = 1.1; decay = 1.5; sustain = vel * 0.9; release = 2.5
      break
    case 'sawlead': {
      const a = add('sawtooth', 1, -6, 0.45), b = add('sawtooth', 1, 6, 0.45)
      filt.frequency.value = 3600; filt.Q.value = 2
      lfo(5.6, 14, a.detune, 0.25); lfo(5.6, 14, b.detune, 0.25)
      attack = 0.01; decay = 0.3; sustain = vel * 0.85; release = 0.15
      break
    }
    case 'squarelead':
      add('square', 1, 0, 0.4); add('square', 0.5, 3, 0.18)
      filt.frequency.value = 4200; filt.Q.value = 1
      attack = 0.006; decay = 0.3; sustain = vel * 0.8; release = 0.12
      break
    case 'sub808': {
      const o = add('sine', 1, 0, 1)
      if (glideFrom === undefined) { o.frequency.setValueAtTime(f * 1.35, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05) }
      // a little drive so the sub is heard on small speakers too
      const ws = ctx.createWaveShaper()
      const c = new Float32Array(1024)
      for (let i = 0; i < c.length; i++) { const x = (i / (c.length - 1)) * 2 - 1; c[i] = Math.tanh(x * 2.2) / Math.tanh(2.2) }
      ws.curve = c
      filt.disconnect(); filt.connect(ws).connect(amp)
      filt.frequency.value = 2500
      attack = 0.003; decay = 1.6; sustain = vel * 0.35; release = 0.12
      break
    }
    case 'synthbass':
      add('sawtooth', 1, 0, 0.5); add('square', 0.5, 0, 0.35)
      filt.Q.value = 6
      filt.frequency.setValueAtTime(1600, t); filt.frequency.exponentialRampToValueAtTime(320, t + 0.22)
      attack = 0.003; decay = 0.3; sustain = vel * 0.7; release = 0.06
      break
    case 'organ': {
      // drawbars 16' 8' 4' 2⅔' 2' (88 8 6 0 4 style) + a percussion click on the 3rd harmonic
      for (const [ratio, l] of [[0.5, 0.9], [1, 1], [2, 0.75], [3, 0.4], [4, 0.45], [6, 0.12]] as const) add('sine', ratio, 0, l * 0.22)
      const perc = add('sine', 3, 0, 0)
      const pg = ctx.createGain(); perc.disconnect(); perc.connect(pg).connect(filt)
      pg.gain.setValueAtTime(0.25, t); pg.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
      filt.frequency.value = 7000
      // the rotating speaker: a gentle wobble in pitch and level
      for (const o of oscs) lfo(6.4, 7, o.detune)
      const trem = ctx.createGain(); trem.gain.value = 0.15
      const tl = ctx.createOscillator(); tl.frequency.value = 6.4; tl.connect(trem).connect(amp.gain); lfos.push(tl)
      attack = 0.004; decay = 0.05; sustain = vel; release = 0.06
      break
    }
    case 'juno': {
      // Juno 106 chorus pad: saw + warm sub-square + gentle chorus detune sweep
      const a = add('sawtooth', 1, -11, 0.32)
      const b = add('sawtooth', 1, 11, 0.32)
      add('square', 0.5, 0, 0.2)
      add('triangle', 2, 3, 0.08)
      filt.frequency.setValueAtTime(3400, t)
      filt.frequency.exponentialRampToValueAtTime(1600, t + 0.7)
      filt.Q.value = 1.4
      lfo(0.45, 9, a.detune)
      lfo(0.45, -9, b.detune)
      lfo(0.22, 380, filt.frequency)
      attack = 0.06; decay = 0.7; sustain = vel * 0.85; release = 0.65
      break
    }
    case 'prophet': {
      // Prophet-5 warm analog brass: detuned saws with punchy filter swell
      add('sawtooth', 1, -8, 0.38)
      add('sawtooth', 1, 8, 0.38)
      add('sawtooth', 0.5, 2, 0.2)
      filt.Q.value = 2.4
      filt.frequency.setValueAtTime(520, t)
      filt.frequency.exponentialRampToValueAtTime(4200, t + 0.09)
      filt.frequency.exponentialRampToValueAtTime(1900, t + 0.45)
      attack = 0.028; decay = 0.38; sustain = vel * 0.78; release = 0.28
      break
    }
    case 'lofikeys': {
      // Lo-Fi tape keys: mellow sine/triangle tines with gentle cassette wow/flutter
      const a = add('triangle', 1, -4, 0.48)
      const b = add('sine', 1, 4, 0.42)
      add('sine', 2, -2, 0.14)
      add('sine', 3, 5, 0.05)
      filt.frequency.setValueAtTime(2100, t)
      filt.frequency.exponentialRampToValueAtTime(980, t + 0.5)
      filt.Q.value = 0.7
      lfo(0.75, 11, a.detune)
      lfo(0.75, 11, b.detune)
      attack = 0.008; decay = 0.85; sustain = vel * 0.45; release = 0.4
      break
    }
    case 'wurli': {
      // Wurlitzer funk EP: warm fundamental + barky 2nd/3rd reed harmonics + classic tremolo
      add('sine', 1, 0, 0.55)
      add('triangle', 2, 0, 0.24)
      add('sawtooth', 3, 0, 0.08)
      const ws = ctx.createWaveShaper()
      const curve = new Float32Array(512)
      for (let i = 0; i < curve.length; i++) { const x = (i / (curve.length - 1)) * 2 - 1; curve[i] = Math.tanh(x * 1.85) / Math.tanh(1.85) }
      ws.curve = curve
      filt.disconnect(); filt.connect(ws).connect(amp)
      filt.frequency.setValueAtTime(3600, t)
      filt.frequency.exponentialRampToValueAtTime(1400, t + 0.35)
      filt.Q.value = 1.1
      const trem = ctx.createGain(); trem.gain.value = 0.14
      const tl = ctx.createOscillator(); tl.frequency.value = 4.8; tl.connect(trem).connect(amp.gain); lfos.push(tl)
      attack = 0.004; decay = 0.75; sustain = vel * 0.36; release = 0.24
      break
    }
    case 'fmglass': {
      // Sparkling DX7-style FM electric piano / glass bell tines
      const carrier = ctx.createOscillator()
      const mod = ctx.createOscillator()
      const modGain = ctx.createGain()
      carrier.type = 'sine'; carrier.frequency.value = f
      mod.type = 'sine'; mod.frequency.value = f * 3.0
      modGain.gain.setValueAtTime(f * 2.2, t)
      modGain.gain.exponentialRampToValueAtTime(f * 0.18, t + 0.32)
      mod.connect(modGain).connect(carrier.frequency)
      const cg = ctx.createGain(); cg.gain.value = 0.65
      carrier.connect(cg).connect(filt)
      oscs.push(carrier, mod)
      add('sine', 2, 5, 0.16)
      filt.frequency.value = 6200; filt.Q.value = 0.5
      attack = 0.003; decay = 0.9; sustain = vel * 0.3; release = 0.38
      break
    }
    case 'shimmer': {
      // Ethereal octave-up ambient shimmer pad (amazing behind guitar swells & ballads)
      const a = add('sawtooth', 1, -12, 0.24)
      const b = add('sawtooth', 1, 12, 0.24)
      add('triangle', 2, -6, 0.18)
      add('sine', 2, 6, 0.16)
      add('sine', 0.5, 0, 0.3)
      filt.frequency.value = 2200; filt.Q.value = 0.8
      lfo(0.11, 750, filt.frequency)
      lfo(0.32, 8, a.detune); lfo(0.32, -8, b.detune)
      attack = 0.55; decay = 1.1; sustain = vel * 0.88; release = 1.6
      break
    }
    case 'moogpoly': {
      // Thick analog Moog-style poly chords: dual saws + sub triangle + warm ladder sweep
      add('sawtooth', 1, -6, 0.38)
      add('sawtooth', 1, 6, 0.38)
      add('triangle', 0.5, 0, 0.3)
      filt.Q.value = 3.2
      filt.frequency.setValueAtTime(3400, t)
      filt.frequency.exponentialRampToValueAtTime(920, t + 0.42)
      attack = 0.008; decay = 0.5; sustain = vel * 0.72; release = 0.32
      break
    }
    case 'clavinet': {
      // Snappy percussive funk clavinet: bright pulse harmonics + fast plucky filter
      add('sawtooth', 1, 0, 0.34)
      add('square', 2, 2, 0.22)
      add('square', 1, -3, 0.26)
      filt.Q.value = 3.6
      filt.frequency.setValueAtTime(6800, t)
      filt.frequency.exponentialRampToValueAtTime(950, t + 0.16)
      attack = 0.002; decay = 0.28; sustain = vel * 0.12; release = 0.08
      break
    }
    case 'moogbass': {
      // Punchy resonant Moog funk bass
      add('sawtooth', 1, -4, 0.48)
      add('square', 0.5, 0, 0.42)
      add('sawtooth', 1, 4, 0.32)
      filt.Q.value = 7.5
      filt.frequency.setValueAtTime(2400, t)
      filt.frequency.exponentialRampToValueAtTime(280, t + 0.19)
      attack = 0.003; decay = 0.28; sustain = vel * 0.65; release = 0.08
      break
    }
    case 'reesebass': {
      // Deep wide detuned Reese sub bass (modern chillhop / cinematic / rock)
      const a = add('sawtooth', 1, -18, 0.38)
      const b = add('sawtooth', 1, 18, 0.38)
      add('sine', 0.5, 0, 0.48)
      filt.frequency.value = 520; filt.Q.value = 1.6
      lfo(0.28, 160, filt.frequency)
      lfo(0.35, 6, a.detune); lfo(0.35, -6, b.detune)
      attack = 0.025; decay = 0.4; sustain = vel * 0.85; release = 0.2
      break
    }
  }
  amp.gain.setValueAtTime(0.0001, t)
  amp.gain.linearRampToValueAtTime(peak, t + attack)
  amp.gain.setTargetAtTime(Math.max(0.0001, sustain), t + attack, decay / 3)
  for (const o of [...oscs, ...lfos]) o.start(t)
  let stopped = false
  return {
    stop: (at?: number) => {
      if (stopped) return
      stopped = true
      const e = Math.max(at ?? ctx.currentTime, t + attack * 0.5)
      try {
        amp.gain.cancelScheduledValues(e)
        amp.gain.setTargetAtTime(0.0001, e, release / 4)
        for (const o of [...oscs, ...lfos]) o.stop(e + release * 1.5 + 0.05)
      } catch { /* already stopped */ }
    },
  }
}

export interface PlayOpts { dest?: AudioNode; /** seconds to hold (piano roll); otherwise until stop() */ dur?: number; /** the previous note, to slide from (808 sub, steel guitar) */ from?: number }
/** Play one note on an instrument. */
export function playInstr(id: string, midi: number, when: number, vel = 0.8, o: PlayOpts = {}): Handle {
  const d = instr(id)
  const dest = o.dest ?? route('any', 'keys')
  const gain = vel * d.gain
  let h: Handle
  if (d.synth) h = synth(d.synth, midi, when, gain, dest, d.synth === 'sub808' ? o.from : undefined)
  else if (d.guitar) {
    h = playNote(midi, when, gain, dest, { sound: d.guitar, ...(d.slide ? { bend: -(o.from !== undefined && Math.abs(o.from - midi) <= 5 ? midi - o.from : 1.5), release: true, bendTime: 0.09 } : {}) })
  } else if (d.bank === 'bass') h = playBass(midi, when, gain, dest, d.bassKind)
  // the sampled instruments were levelled quietly (about −20 dB); this brings them up to sit with the drums
  else h = playFromBank(d.bank!, midi, when, gain * 1.5, dest, d.release)
  if (o.dur !== undefined) h.stop(Math.max(when, audio().currentTime) + o.dur)
  return h
}

// ---------- chords for the keyboard's chord helper and the piano roll's chord stamp
export const CHORD_TYPES: { id: string; label: string; ivs: number[] }[] = [
  { id: 'maj', label: 'Major', ivs: [0, 4, 7] }, { id: 'min', label: 'Minor', ivs: [0, 3, 7] },
  { id: '7', label: '7', ivs: [0, 4, 7, 10] }, { id: 'maj7', label: 'maj7', ivs: [0, 4, 7, 11] }, { id: 'm7', label: 'm7', ivs: [0, 3, 7, 10] },
  { id: '9', label: '9', ivs: [0, 4, 7, 10, 14] }, { id: 'maj9', label: 'maj9', ivs: [0, 4, 7, 11, 14] }, { id: 'm9', label: 'm9', ivs: [0, 3, 7, 10, 14] },
  { id: '6', label: '6', ivs: [0, 4, 7, 9] }, { id: 'm6', label: 'm6', ivs: [0, 3, 7, 9] }, { id: 'add9', label: 'add9', ivs: [0, 4, 7, 14] },
  { id: 'sus2', label: 'sus2', ivs: [0, 2, 7] }, { id: 'sus4', label: 'sus4', ivs: [0, 5, 7] }, { id: '7sus4', label: '7sus4', ivs: [0, 5, 7, 10] },
  { id: 'dim', label: 'dim', ivs: [0, 3, 6] }, { id: 'dim7', label: 'dim7', ivs: [0, 3, 6, 9] }, { id: 'm7b5', label: 'm7♭5', ivs: [0, 3, 6, 10] },
  { id: 'aug', label: 'aug', ivs: [0, 4, 8] }, { id: '11', label: '11', ivs: [0, 7, 10, 14, 17] }, { id: '13', label: '13', ivs: [0, 4, 10, 14, 21] },
  { id: '5', label: 'Power (5)', ivs: [0, 7, 12] },
]
export type Voicing = 'close' | 'open' | 'bass'
/** The notes of a chord on `root`, voiced: close (piano), open (spread for strings and choir), or with a low bass note. */
export function chordNotes(root: number, ivs: number[], v: Voicing = 'close'): number[] {
  const n = ivs.map(i => root + i)
  if (v === 'open' && n.length >= 3) return [n[0], n[2] ?? n[1], n[1] + 12, ...n.slice(3).map(x => x + 12)].sort((a, b) => a - b)
  if (v === 'bass') return [root - 12, ...n]
  return n
}
/** The chord of the key that a root note belongs to (one-finger "key chords"): degree triads, or 7ths. */
export function keyChord(rootMidi: number, keyPc: number, minor: boolean, sevenths = false): { ivs: number[]; label: string } | null {
  const steps = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]
  const deg = steps.indexOf(((rootMidi - keyPc) % 12 + 12) % 12)
  if (deg < 0) return null
  const tone = (k: number) => { const d = deg + k; return steps[d % 7] + 12 * Math.floor(d / 7) - steps[deg] }
  const ivs = sevenths ? [0, tone(2), tone(4), tone(6)] : [0, tone(2), tone(4)]
  const third = ivs[1], fifth = ivs[2]
  const q = third === 4 && fifth === 7 ? '' : third === 3 && fifth === 7 ? 'm' : third === 3 && fifth === 6 ? 'dim' : 'aug'
  const sev = sevenths ? (ivs[3] === 11 ? (q === '' ? 'maj7' : 'm(maj7)') : ivs[3] === 10 ? (q === 'dim' ? 'm7♭5' : q === '' ? '7' : 'm7') : '7') : ''
  return { ivs, label: sevenths ? (q === 'dim' && sev === 'm7♭5' ? 'm7♭5' : q === 'm' ? sev : sev === '7' && q === '' ? '7' : q + sev) : q }
}
