// Roy Ziv Speed Builder-inspired engine: 14 playable scale/endurance sequences in ANY key & scale,
// Burst-Speed ("Hockey Experiment") tempo cycle math, and persistent Clean BPM speed log (`kg:speedLog`).
import type { Song } from '../tabs/model'
import { newId, type SongDoc } from '../tabs/library'
import { pc } from '../theory/notes'
import { scaleInfo } from '../theory/scales'
import { midiToGuitarSpot } from '../improv/improvGym'

export interface SpeedSequenceDef {
  id: string
  label: string
  category: 'Scale Sequences' | 'Endurance & Picking'
  hint: string
  defaultBpm: number
  subdiv: 2 | 4 // 8ths or 16ths per beat
}

export const SPEED_SEQUENCES: SpeedSequenceDef[] = [
  { id: 'asc-3rds', label: 'Ascending Thirds (Melodic Favourite)', category: 'Scale Sequences', hint: '1-3, 2-4, 3-5, 4-6… melodic leaping sequence across the neck', defaultBpm: 80, subdiv: 4 },
  { id: 'desc-triads', label: 'Descending Triads', category: 'Scale Sequences', hint: '3-note cascading diatonic triads down the scale', defaultBpm: 76, subdiv: 4 },
  { id: 'pent-seq-1', label: 'Pentatonic Sequence 1 (4s)', category: 'Scale Sequences', hint: 'Classic rock/fusion 4-note ascending groups (1-2-3-4, 2-3-4-5)', defaultBpm: 92, subdiv: 4 },
  { id: 'pent-seq-2', label: 'Pentatonic Sequence 2 (3s)', category: 'Scale Sequences', hint: 'Punchy 3-note climbing groups (1-2-3, 2-3-4, 3-4-5)', defaultBpm: 96, subdiv: 4 },
  { id: 'pent-up-down', label: 'Up-Down Pentatonic Pivot', category: 'Scale Sequences', hint: 'Climb 4 notes, fall 2, climb 4 — builds effortless hand sync', defaultBpm: 88, subdiv: 4 },
  { id: 'pent-horiz', label: 'Horizontal Pentatonic Shift', category: 'Scale Sequences', hint: 'Connect 2 adjacent boxes diagonally up the fretboard', defaultBpm: 84, subdiv: 4 },
  { id: 'hex-2nps', label: '2-Notes-Per-String Hexatonic Linear', category: 'Scale Sequences', hint: 'Smooth diagonal 2NPS hexatonic run connecting shapes across strings', defaultBpm: 84, subdiv: 4 },
  { id: 'mode-3nps-asc', label: '3-Notes-Per-String Ascending', category: 'Scale Sequences', hint: 'Clean alternate picking 3NPS scalar climb for effortless speed', defaultBpm: 90, subdiv: 4 },
  { id: 'mode-3nps-horiz', label: 'Horizontal 3NPS Connector', category: 'Scale Sequences', hint: 'Slide up to the next 3NPS position on every string pair', defaultBpm: 82, subdiv: 4 },
  { id: 'mode-pulloffs', label: 'Legato Pull-Off Cascades', category: 'Scale Sequences', hint: '3-note descending pull-off bursts for fluid legato speed', defaultBpm: 86, subdiv: 4 },
  { id: 'chrom-cycles', label: 'Chromatic String Cycles (1-2-3-4)', category: 'Endurance & Picking', hint: 'Strict alternate picking 1-2-3-4 across all 6 strings & back', defaultBpm: 80, subdiv: 4 },
  { id: 'pinky-workout', label: 'Pinky Finger Workout (3-4-2-4)', category: 'Endurance & Picking', hint: 'Builds ring & pinky strength and independence without tension', defaultBpm: 72, subdiv: 4 },
  { id: 'inside-outside', label: 'Inside / Outside Cross-String Picking', category: 'Endurance & Picking', hint: 'Alternating string-change pairs to clean up pick-escape timing', defaultBpm: 78, subdiv: 4 },
  { id: 'wide-stretch', label: 'Wide Fret Stretches (1-3-5)', category: 'Endurance & Picking', hint: 'Controlled 1-3-5 stretch climbs to open left-hand reach', defaultBpm: 68, subdiv: 2 },
]

export interface EnduranceDrill {
  id: string
  label: string
  focus: string
  seconds: number
  restSeconds: number
}

export const ENDURANCE_DRILLS: EnduranceDrill[] = [
  { id: 'chrom-cycles', label: 'Chromatic String Cycles', focus: 'Relaxed alternate picking across all 6 strings', seconds: 60, restSeconds: 20 },
  { id: 'pinky-workout', label: 'Pinky Finger Workout', focus: 'Keep pinky curved & close to the fret wire', seconds: 60, restSeconds: 25 },
  { id: '4finger', label: '4-Finger Independence (1-3-2-4)', focus: 'Zero flying fingers — lift barely 2mm off strings', seconds: 90, restSeconds: 25 },
  { id: 'inside-outside', label: 'Inside / Outside Picking', focus: 'Tiny wrist motion, zero forearm tension', seconds: 60, restSeconds: 20 },
  { id: 'wide-stretch', label: 'Wide Fret Stretches', focus: 'Thumb behind neck, warm up slowly, stop if tight', seconds: 45, restSeconds: 30 },
]

/** Compute BPM for a bar inside a Burst-Speed ("Hockey Experiment") cycle: 2 bars clean -> 1 bar burst -> 1 bar recovery! */
export function burstBarBpm(
  barIndex: number,
  cleanBpm: number,
  mode: 'burst' | 'ramp',
  boostPct = 15,
): { bpm: number; phase: 'clean' | 'burst' | 'ramp' } {
  const base = Math.max(40, Math.min(220, Math.round(cleanBpm)))
  if (mode === 'ramp') {
    const steps = Math.floor(barIndex / 4)
    return { bpm: Math.min(220, base + steps * 5), phase: 'ramp' }
  }
  const slot = barIndex % 3
  if (slot === 2) {
    return { bpm: Math.min(220, Math.round(base * (1 + boostPct / 100))), phase: 'burst' }
  }
  return { bpm: base, phase: 'clean' }
}

/** Generate MIDI + fret spots for any of the 14 Speed Builder sequences in the chosen key & scale! */
export function buildSpeedSequenceDoc(
  seqId: string,
  keyRoot: string,
  scaleId: string,
  bpm: number,
  tuning: number[],
): SongDoc {
  const def = SPEED_SEQUENCES.find(s => s.id === seqId) ?? SPEED_SEQUENCES[0]
  const nStr = tuning.length
  const sInfo = scaleInfo(keyRoot, scaleId)
  const r = pc(keyRoot)
  // Build ascending scale notes spanning 2 octaves starting near fret 5 on low E
  const loBase = (tuning[0] ?? 40) + ((r - ((tuning[0] ?? 40) % 12) + 12) % 12)
  const startMidi = loBase < 45 ? loBase + 12 : loBase
  const scalePool: number[] = []
  for (let m = startMidi; m <= startMidi + 26; m++) {
    if (sInfo.pcs.includes(((m % 12) + 12) % 12)) scalePool.push(m)
  }

  let spots: { string: number; fret: number; midi: number }[] = []

  if (seqId === 'chrom-cycles') {
    for (let s = 0; s < nStr; s++) {
      for (const off of [5, 6, 7, 8]) spots.push({ string: s, fret: off, midi: tuning[s] + off })
    }
    for (let s = nStr - 1; s >= 0; s--) {
      for (const off of [8, 7, 6, 5]) spots.push({ string: s, fret: off, midi: tuning[s] + off })
    }
  } else if (seqId === 'pinky-workout') {
    for (let s = 0; s < nStr; s++) {
      for (const off of [7, 8, 6, 8, 5, 8, 7, 8]) spots.push({ string: s, fret: off, midi: tuning[s] + off })
    }
  } else if (seqId === 'inside-outside') {
    for (let s = 0; s < nStr - 1; s++) {
      spots.push(
        { string: s, fret: 5, midi: tuning[s] + 5 },
        { string: s, fret: 7, midi: tuning[s] + 7 },
        { string: s + 1, fret: 5, midi: tuning[s + 1] + 5 },
        { string: s + 1, fret: 8, midi: tuning[s + 1] + 8 },
      )
    }
  } else if (seqId === 'wide-stretch') {
    for (let s = 0; s < nStr; s++) {
      for (const off of [5, 7, 9, 7]) spots.push({ string: s, fret: off, midi: tuning[s] + off })
    }
  } else {
    const midis: number[] = []
    const L = scalePool.length
    if (seqId === 'asc-3rds') {
      for (let i = 0; i + 2 < Math.min(L, 14); i++) midis.push(scalePool[i], scalePool[i + 2])
    } else if (seqId === 'desc-triads') {
      for (let i = Math.min(L - 1, 13); i >= 4; i--) midis.push(scalePool[i], scalePool[i - 2], scalePool[i - 4])
    } else if (seqId === 'pent-seq-1') {
      for (let i = 0; i + 3 < Math.min(L, 12); i++) midis.push(scalePool[i], scalePool[i + 1], scalePool[i + 2], scalePool[i + 3])
    } else if (seqId === 'pent-seq-2') {
      for (let i = 0; i + 2 < Math.min(L, 13); i++) midis.push(scalePool[i], scalePool[i + 1], scalePool[i + 2])
    } else if (seqId === 'pent-up-down') {
      for (let i = 0; i + 3 < Math.min(L, 12); i += 2) {
        midis.push(scalePool[i], scalePool[i + 1], scalePool[i + 2], scalePool[i + 3], scalePool[i + 2], scalePool[i + 1])
      }
    } else if (seqId === 'mode-pulloffs') {
      for (let i = Math.min(L - 1, 13); i >= 2; i--) midis.push(scalePool[i], scalePool[i - 1], scalePool[i - 2])
    } else {
      // 3NPS / Horizontal / 2NPS Linear climb & descend
      const up = scalePool.slice(0, Math.min(L, 16))
      midis.push(...up, ...up.slice(0, -1).reverse())
    }
    const shiftPerNote = seqId === 'pent-horiz' || seqId === 'hex-2nps' || seqId === 'mode-3nps-horiz' ? 0.35 : 0
    spots = midis.map((m, idx) => {
      const prefer = Math.min(14, Math.round(5 + idx * shiftPerNote))
      const sp = midiToGuitarSpot(m, tuning, prefer)
      return { string: sp.string, fret: sp.fret, midi: m }
    })
  }

  // Slice into 4/4 bars (16 sixteenth notes or 8 eighth notes per bar)
  const perBar = def.subdiv * 4
  const dur = 4 / perBar
  const bars: { steps: { dur: number; notes: { string: number; fret: number; midi: number }[] }[] }[] = []
  for (let i = 0; i < spots.length; i += perBar) {
    const chunk = spots.slice(i, i + perBar)
    if (!chunk.length) continue
    bars.push({
      steps: chunk.map(sp => ({ dur, notes: [sp] })),
    })
  }
  if (!bars.length) bars.push({ steps: [{ dur: 4, notes: [{ string: 0, fret: 5, midi: (tuning[0] ?? 40) + 5 }] }] })

  const song: Song = {
    title: `${def.label} (${keyRoot} ${scaleId})`,
    tempo: Math.round(bpm),
    tracks: [{ name: 'Speed Builder', tuning: [...tuning], capo: 0, bars }],
  }
  return {
    id: newId(),
    title: song.title,
    source: 'lesson',
    song,
    updated: Date.now(),
  }
}

// ---- Persistent Clean BPM Speed Log (`kg:speedLog`) ----
export interface SpeedLogEntry {
  drillId: string
  bpm: number
  at: number
}

const LOG_KEY = 'kg:speedLog'

export function loadSpeedLog(): SpeedLogEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]') as unknown
    if (!Array.isArray(raw)) return []
    return raw.filter((x): x is SpeedLogEntry => !!x && typeof x.drillId === 'string' && typeof x.bpm === 'number')
  } catch {
    return []
  }
}

export function recordSpeedBpm(drillId: string, bpm: number): SpeedLogEntry[] {
  const next: SpeedLogEntry[] = [...loadSpeedLog(), { drillId, bpm: Math.round(bpm), at: Date.now() }].slice(-120)
  try { localStorage.setItem(LOG_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  return next
}

export function bestSpeedBpm(drillId: string, log: SpeedLogEntry[] = loadSpeedLog()): number | null {
  const vals = log.filter(e => e.drillId === drillId).map(e => e.bpm)
  return vals.length ? Math.max(...vals) : null
}
