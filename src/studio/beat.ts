// A beat in the beat maker: drum rows on a 16th-note grid, instrument tracks of notes (the piano roll), tempo, bars,
// swing and kit. Kept in localStorage (small); loop recordings live in IndexedDB (see loops.ts).
import { GROOVES, type KitId, type Voice } from '../audio/drums'
import { pc } from '../theory/notes'
import { CHORD_TYPES, chordNotes } from './sounds'

export const STEPS_PER_BAR = 16
export interface DrumRow { voice: Voice; steps: number[]; mute?: boolean }
export interface PNote { s: number; l: number; m: number; v: number }
export interface Track { id: string; inst: string; notes: PNote[]; vol: number; mute?: boolean; space: number }
export interface Beat {
  name: string
  bpm: number
  bars: 1 | 2 | 4 | 8
  /** 0 = straight, 0.33 = full triplet swing on the 16ths */
  swing: number
  kit: KitId
  rows: DrumRow[]
  tracks: Track[]
  key: string
  minor: boolean
  drumVol: number
}
export const totalSteps = (b: Beat) => b.bars * STEPS_PER_BAR
export const newId = () => Math.random().toString(36).slice(2, 9)

/** The 16 pads for each kit (the beat's drum rows come from these). */
export const PADS: Record<string, Voice[]> = {
  acoustic: ['kick', 'snare', 'clap', 'rim', 'hat', 'open', 'pedal', 'crash', 'ride', 'bell', 'tom1', 'tom2', 'tom3', 'tamb', 'shaker', 'cowbell'],
  metal: ['kick', 'snare', 'hat', 'open', 'crash', 'china', 'splash', 'ride', 'bell', 'tom1', 'tom2', 'tom3', 'pedal', 'rim', 'clap', 'impact'],
  machine: ['kick', 'snare', 'clap', 'rim', 'hat', 'open', 'pedal', 'crash', 'ride', 'cowbell', 'tom1', 'tom2', 'tom3', 'snap', 'shaker', 'riser'],
  perc: ['conga', 'congalo', 'bongo', 'bongolo', 'cajon', 'cajonslap', 'clave', 'guiro', 'agogo', 'tamb', 'shaker', 'cowbell', 'snap', 'brush', 'brushtap', 'impact'],
}
export const padsFor = (kit: KitId) => (kit === 'metal' ? PADS.metal : kit === '808' || kit === '909' ? PADS.machine : PADS.acoustic)
export const VOICE_LABEL: Partial<Record<Voice, string>> = {
  kick: 'Kick', snare: 'Snare', clap: 'Clap', rim: 'Rim', hat: 'Hi-hat', open: 'Open hat', pedal: 'Pedal hat', crash: 'Crash', ride: 'Ride',
  bell: 'Ride bell', tom1: 'High tom', tom2: 'Mid tom', tom3: 'Floor tom', tamb: 'Tambourine', shaker: 'Shaker', cowbell: 'Cowbell', ghost: 'Ghost snare',
  china: 'China', splash: 'Splash', impact: 'Impact', snap: 'Snap', riser: 'Riser', conga: 'Conga', congalo: 'Low conga', bongo: 'Bongo',
  bongolo: 'Low bongo', cajon: 'Cajón', cajonslap: 'Cajón slap', clave: 'Clave', guiro: 'Guiro', agogo: 'Agogo', brush: 'Brush swish',
  brushtap: 'Brush tap', roto1: 'Roto high', roto2: 'Roto mid', roto3: 'Roto low',
}
export const voiceLabel = (v: Voice) => VOICE_LABEL[v] ?? v

/** One bar of a groove as drum rows (positions rounded to the 16th grid). */
export function rowsFromGroove(id: string, bars: number): DrumRow[] {
  const g = GROOVES.find(x => x.id === id)
  if (!g) return []
  const by = new Map<Voice, number[]>()
  for (const [b, v, l] of g.hits) {
    const step = Math.round(b * 4)
    if (step >= 16) continue
    const row = by.get(v) ?? Array(16).fill(0)
    row[step] = Math.max(row[step], Math.min(1, l))
    by.set(v, row)
  }
  return [...by.entries()].map(([voice, one]) => ({ voice, steps: Array.from({ length: bars }, () => one).flat() }))
}

/** Notes for a chord progression: each chord a bar long, as a pattern ("hold", "stabs" on the beats, "arp" up in 8ths). */
export function chordNotesFor(prog: [number, string][], key: string, octaveRoot: number, pattern: 'hold' | 'stabs' | 'offbeat' | 'arp' | 'pulse', voicing: 'close' | 'open' = 'close'): PNote[] {
  const out: PNote[] = []
  const k = pc(key)
  prog.forEach(([semi, type], bar) => {
    const root = octaveRoot + ((k + semi) % 12)
    const ivs = CHORD_TYPES.find(c => c.id === type)?.ivs ?? [0, 4, 7]
    const ns = chordNotes(root, ivs, voicing)
    const s0 = bar * 16
    if (pattern === 'hold') ns.forEach(m => out.push({ s: s0, l: 16, m, v: 0.7 }))
    else if (pattern === 'stabs') [0, 4, 8, 12].forEach(s => ns.forEach(m => out.push({ s: s0 + s, l: 2, m, v: 0.75 })))
    else if (pattern === 'offbeat') [2, 6, 10, 14].forEach(s => ns.forEach(m => out.push({ s: s0 + s, l: 1, m, v: 0.7 })))
    else if (pattern === 'pulse') [0, 3, 6, 8, 11, 14].forEach(s => ns.forEach(m => out.push({ s: s0 + s, l: 2, m, v: 0.7 })))
    else ns.concat(ns.slice(1, -1).reverse()).concat(ns).slice(0, 8).forEach((m, i) => out.push({ s: s0 + i * 2, l: 2, m, v: 0.7 }))
  })
  return out
}
/** A bass line: the root of each chord, on a rhythm. */
export function bassNotesFor(prog: [number, string][], key: string, low: number, rhythm: number[], len = 2): PNote[] {
  const k = pc(key)
  return prog.flatMap(([semi], bar) => rhythm.map(s => ({ s: bar * 16 + s, l: len, m: low + ((k + semi) % 12), v: 0.85 })))
}

/** Starter beats for the styles you asked about: drums, chords and bass in a key, ready to change. */
export interface Starter { id: string; label: string; make: () => Beat }
const T = (inst: string, notes: PNote[], vol = 0.8, space = 0.2): Track => ({ id: newId(), inst, notes, vol, space })
const B = (name: string, bpm: number, kit: KitId, groove: string, key: string, minor: boolean, tracks: Track[], bars: Beat['bars'] = 4, swing = 0): Beat =>
  ({ name, bpm, bars, swing, kit, rows: rowsFromGroove(groove, bars), tracks, key, minor, drumVol: 0.9 })
export const STARTERS: Starter[] = [
  { id: 'empty', label: 'Empty (start from scratch)', make: () => ({ name: 'My beat', bpm: 90, bars: 2, swing: 0, kit: 'studio', rows: [], tracks: [], key: 'A', minor: true, drumVol: 0.9 }) },
  { id: 'trap', label: 'Rap: trap', make: () => B('Trap', 140, '808', 'trap', 'F', true, [
    T('sub808', bassNotesFor([[0, 'min'], [8, 'maj'], [3, 'maj'], [10, 'maj']], 'F', 29, [0, 6, 10], 3), 0.9, 0),
    T('glock', [[0, 'min'], [8, 'maj'], [3, 'maj'], [10, 'maj']].flatMap(([semi], bar) => [0, 3, 6, 10, 12].map((s, i) => ({ s: (bar as number) * 16 + s, l: 2, m: 77 + (((pc('F') + (semi as number)) % 12)) + [0, 7, 3, 7, 12][i], v: 0.6 }))), 0.55, 0.35),
  ]) },
  { id: 'boombap', label: 'Rap: boom bap', make: () => B('Boom bap', 90, 'lofi', 'boombap', 'D', true, [
    T('upright', chordNotesFor([[0, 'm9'], [5, '9'], [0, 'm9'], [7, 'm7']], 'D', 50, 'hold'), 0.6, 0.25),
    T('upbass', bassNotesFor([[0, 'min'], [5, 'maj'], [0, 'min'], [7, 'min']], 'D', 38, [0, 7, 10]), 0.85, 0.05),
  ], 4, 0.18) },
  { id: 'pop', label: 'Pop', make: () => B('Pop', 104, 'studio', 'pop', 'C', false, [
    T('grand', chordNotesFor([[0, 'maj'], [7, 'maj'], [9, 'min'], [5, 'maj']], 'C', 60, 'pulse'), 0.6, 0.2),
    T('synthbass', bassNotesFor([[0, 'maj'], [7, 'maj'], [9, 'min'], [5, 'maj']], 'C', 36, [0, 3, 6, 8, 11, 14]), 0.7, 0.02),
    T('strings', chordNotesFor([[0, 'maj'], [7, 'maj'], [9, 'min'], [5, 'maj']], 'C', 60, 'hold', 'open'), 0.35, 0.4),
  ]) },
  { id: 'edm', label: 'EDM / house', make: () => B('House', 124, '909', 'house', 'A', true, [
    T('supersaw', chordNotesFor([[0, 'min'], [8, 'maj'], [3, 'maj'], [10, 'maj']], 'A', 57, 'offbeat'), 0.55, 0.35),
    T('sub808', bassNotesFor([[0, 'min'], [8, 'maj'], [3, 'maj'], [10, 'maj']], 'A', 33, [2, 6, 10, 14], 1), 0.8, 0),
    T('pluck', chordNotesFor([[0, 'm7'], [8, 'maj7'], [3, 'maj'], [10, '7']], 'A', 69, 'arp'), 0.4, 0.35),
  ]) },
  { id: 'rock', label: 'Rock', make: () => B('Rock', 112, 'rock', 'rock', 'E', false, [
    T('crunch', chordNotesFor([[0, '5'], [10, '5'], [5, '5'], [0, '5']], 'E', 40, 'stabs'), 0.7, 0.08),
    T('bass', bassNotesFor([[0, 'maj'], [10, 'maj'], [5, 'maj'], [0, 'maj']], 'E', 28, [0, 2, 4, 6, 8, 10, 12, 14]), 0.85, 0.02),
  ]) },
  { id: 'progmetal', label: 'Prog metal', make: () => B('Prog metal', 120, 'metal', 'djent', 'D', true, [
    T('metal', [0, 3, 6, 8, 11, 14].flatMap(s => [0, 1, 2, 3].map(bar => ({ s: bar * 16 + s, l: 1, m: bar === 3 && s > 8 ? 41 : 38, v: 0.9 }))), 0.75, 0.05),
    T('bass', [0, 3, 6, 8, 11, 14].flatMap(s => [0, 1, 2, 3].map(bar => ({ s: bar * 16 + s, l: 1, m: bar === 3 && s > 8 ? 29 : 26, v: 0.85 }))), 0.8, 0.02),
    T('ambient', chordNotesFor([[0, 'add9'], [10, 'add9'], [8, 'maj7'], [3, 'add9']], 'D', 62, 'hold', 'open'), 0.35, 0.7),
  ]) },
  { id: 'country', label: 'Country', make: () => B('Country', 112, 'vintage', 'train', 'G', false, [
    T('acoustic', chordNotesFor([[0, 'maj'], [0, 'maj'], [5, 'maj'], [7, 'maj']], 'G', 55, 'offbeat'), 0.6, 0.15),
    T('upbass', bassNotesFor([[0, 'maj'], [0, 'maj'], [5, 'maj'], [7, 'maj']], 'G', 31, [0, 8]).flatMap(n => [n, { ...n, s: n.s + 4, m: n.m + 7 }]), 0.85, 0.05),
    T('steel', [[0, 0, 71], [4, 0, 74], [8, 4, 76], [16, 8, 74], [24, 4, 71], [32, 8, 72], [40, 4, 76], [48, 8, 74], [56, 4, 71]].map(([s, , m]) => ({ s, l: 6, m, v: 0.6 })), 0.45, 0.3),
  ]) },
  { id: 'hawaiian', label: 'Hawaiian / island', make: () => B('Island', 88, 'studio', 'island', 'G', false, [
    T('nylon', chordNotesFor([[0, 'maj'], [5, 'maj'], [7, 'maj'], [5, 'maj']], 'G', 60, 'offbeat'), 0.6, 0.2),
    T('bass', bassNotesFor([[0, 'maj'], [5, 'maj'], [7, 'maj'], [5, 'maj']], 'G', 31, [0, 6, 8, 12]), 0.85, 0.05),
    T('steel', [[0, 79], [6, 76], [8, 74], [16, 81], [22, 77], [32, 79], [40, 74], [48, 77], [56, 76]].map(([s, m]) => ({ s, l: 6, m, v: 0.55 })), 0.4, 0.35),
  ], 4, 0.12) },
  { id: 'lofi', label: 'Lo-fi chill', make: () => B('Lo-fi', 78, 'lofi', 'hiphop', 'F', false, [
    T('epiano', chordNotesFor([[0, 'maj7'], [9, 'm7'], [2, 'm7'], [7, '9']], 'F', 53, 'hold'), 0.55, 0.3),
    T('upbass', bassNotesFor([[0, 'maj'], [9, 'min'], [2, 'min'], [7, 'maj']], 'F', 29, [0, 10]), 0.8, 0.05),
  ], 4, 0.2) },
  { id: 'ambient', label: 'Ambient backing (no drums)', make: () => ({ ...B('Ambient', 70, 'studio', 'off', 'D', false, [
    T('ambient', chordNotesFor([[0, 'add9'], [7, 'add9'], [9, 'm7'], [5, 'maj7']], 'D', 50, 'hold', 'open'), 0.5, 0.75),
    T('strings', chordNotesFor([[0, 'maj'], [7, 'maj'], [9, 'min'], [5, 'maj']], 'D', 62, 'hold', 'open'), 0.35, 0.5),
    T('choir', chordNotesFor([[0, 'maj'], [7, 'maj'], [9, 'min'], [5, 'maj']], 'D', 62, 'hold'), 0.3, 0.55),
  ]), rows: [] }) },
]

// ---- storage
const KEY = 'kg:studioBeat'
const SAVED = 'kg:studioBeats'
export function loadBeat(): Beat {
  try { const b = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Beat | null; if (b && Array.isArray(b.rows)) return b } catch { /* fall through */ }
  return STARTERS.find(s => s.id === 'pop')!.make()
}
export function saveBeat(b: Beat) { try { localStorage.setItem(KEY, JSON.stringify(b)) } catch { /* storage full */ } }
export function savedBeats(): Beat[] { try { return JSON.parse(localStorage.getItem(SAVED) ?? '[]') as Beat[] } catch { return [] } }
export function storeBeat(b: Beat) {
  const list = savedBeats().filter(x => x.name !== b.name)
  try { localStorage.setItem(SAVED, JSON.stringify([...list, b].slice(-40))) } catch { /* storage full */ }
}
export function deleteStored(name: string) { try { localStorage.setItem(SAVED, JSON.stringify(savedBeats().filter(x => x.name !== name))) } catch { /* noop */ } }

/** Change the number of bars, repeating what's there (or cutting it). */
export function setBars(b: Beat, bars: Beat['bars']): Beat {
  const n = bars * 16, old = totalSteps(b)
  return {
    ...b, bars,
    rows: b.rows.map(r => ({ ...r, steps: Array.from({ length: n }, (_, i) => r.steps[i % old] ?? 0) })),
    tracks: b.tracks.map(t => ({ ...t, notes: n > old ? Array.from({ length: n / old }, (_, k) => t.notes.map(x => ({ ...x, s: x.s + k * old }))).flat() : t.notes.filter(x => x.s < n) })),
  }
}

// listeners: the assistant (and other screens) can change the beat while the beat maker is open
const listeners = new Set<(b: Beat) => void>()
export function onBeatChange(f: (b: Beat) => void) { listeners.add(f); return () => { listeners.delete(f) } }
/** Replace the beat from outside (the assistant); the beat maker picks it up if it's open. */
export function pushBeat(b: Beat) { saveBeat(b); listeners.forEach(f => f(b)) }
