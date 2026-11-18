// Song and exercise transposition + Capo N synchronization.
// Sounding pitches shift by `semi` semitones; chord shape names and relative fret positions
// shift by `semi - (newCapo - track.capo)` so raising both transpose and capo together preserves open shapes.
import { keyPrefersFlats, pc, pcName } from '../theory/notes'
import type { Instrument } from '../instrument'
import { shapeNotes } from './chordSheet'
import type { Song, SongNote, SongTrack } from './model'
import { formatKeyBadge } from './keyDetect'
import { diatonic, MODE_STEPS, spell, typeTones, type ModeId, type ProgChord } from '../theory/progressions'

const r12 = (n: number) => ((n % 12) + 12) % 12

/** Shared key-filter id (`"7:1"` for Em, `"7:0"` for G). */
export const keyOptionId = (root: string, minor: boolean) => `${pc(root)}:${minor ? 1 : 0}`

/** Transpose a key root name by `semi` semitones, picking sharps or flats naturally for the new key. */
export function shiftKeyName(root: string, semi: number, minor = false): string {
  const newPc = r12(pc(root) + semi)
  const sharp = pcName(newPc, false)
  const flat = pcName(newPc, true)
  // prefer flats when the resulting key normally uses flats
  return keyPrefersFlats(flat, minor) && !keyPrefersFlats(sharp, minor) ? flat : keyPrefersFlats(sharp, minor) ? flat : sharp
}

/** Transpose a chord symbol (`Am7`, `G/B`, `Bbmaj7`, `F#m7b5`) by `semi` semitones. */
export function shiftChord(name: string, semi: number, flats?: boolean): string {
  const s = r12(semi)
  if (s === 0) return name
  const m = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(name.trim())
  if (!m) return name
  const minor = /^m(?!aj)/i.test(m[2])
  const newRoot = shiftKeyName(m[1], s, minor)
  const useFlats = flats ?? keyPrefersFlats(newRoot, minor)
  const rootTxt = pcName(pc(newRoot), useFlats)
  const bassTxt = m[3] ? `/${pcName(r12(pc(m[3]) + s), useFlats)}` : ''
  return `${rootTxt}${m[2]}${bassTxt}`
}

/** True when every non-empty step in the track is a strummed chord sheet entry. */
export function isChordSheetTrack(track: SongTrack): boolean {
  let hasChord = false
  for (const b of track.bars) {
    for (const st of b.steps) {
      if (st.chord) hasChord = true
      if (st.notes.length && !st.chord) return false
    }
  }
  return hasChord
}

/** Transpose a single `SongTrack` by `semi` semitones and/or change its capo to `targetCapo`. */
export function transposeTrack(
  track: SongTrack,
  semi: number,
  opts?: { targetCapo?: number; inst?: Instrument; flats?: boolean },
): SongTrack {
  const newCapo = opts?.targetCapo !== undefined ? Math.max(0, Math.min(11, Math.round(opts.targetCapo))) : track.capo
  const capoDelta = newCapo - track.capo
  if (semi === 0 && capoDelta === 0) return track

  const shapeShift = semi - capoDelta
  const eff = track.tuning.map(t => t + newCapo)
  const maxFret = track.tuning.length === 4 ? 15 : 22
  const chordSheet = isChordSheetTrack(track)

  const bars = track.bars.map(b => ({
    steps: b.steps.map(st => {
      const nextChord = st.chord ? shiftChord(st.chord, shapeShift, opts?.flats) : undefined
      if (chordSheet && nextChord && opts?.inst) {
        return {
          ...st,
          chord: nextChord,
          notes: st.notes.length ? shapeNotes(nextChord, opts.inst, newCapo) : st.notes,
        }
      }
      const used = new Set<number>()
      const out: SongNote[] = []
      for (const note of [...st.notes].sort((a, c) => a.midi - c.midi)) {
        if (note.tech === 'x') {
          if (!used.has(note.string)) { used.add(note.string); out.push(note) }
          continue
        }
        let midi = note.midi + semi
        let up = false
        if (midi < eff[0]) {
          midi += 12 * Math.ceil((eff[0] - midi) / 12)
          up = true
        }
        const same = midi - eff[note.string]
        if (!up && same >= 0 && same <= maxFret && !used.has(note.string)) {
          used.add(note.string)
          out.push({ ...note, midi, fret: same })
          continue
        }
        const alt = eff
          .map((t, s) => ({ s, f: midi - t }))
          .filter(x => x.f >= 0 && x.f <= maxFret && !used.has(x.s))
          .sort((a, c) => Math.abs(a.f - note.fret) - Math.abs(c.f - note.fret))[0]
        if (!alt) continue
        used.add(alt.s)
        out.push({ ...note, midi, string: alt.s, fret: alt.f })
      }
      return {
        ...st,
        ...(nextChord !== undefined ? { chord: nextChord } : {}),
        notes: out.sort((a, c) => a.string - c.string),
      }
    }),
  }))

  return { ...track, capo: newCapo, bars }
}

/** Transpose all tracks of a `Song` by `semi` semitones. */
export function transposeSong(
  song: Song,
  semi: number,
  opts?: { targetCapo?: number; inst?: Instrument; flats?: boolean; trackIdx?: number },
): Song {
  if (semi === 0 && opts?.targetCapo === undefined) return song
  return {
    ...song,
    tracks: song.tracks.map((trk, i) =>
      opts?.trackIdx !== undefined && i !== opts.trackIdx
        ? transposeTrack(trk, semi, { flats: opts.flats })
        : transposeTrack(trk, semi, opts),
    ),
  }
}

export interface JamKeyMismatch {
  progKey: { root: string; minor: boolean; label: string }
  jamLabel: string
  outsideCount: number
}

const MINOR_MODES: ModeId[] = ['minor', 'dorian', 'phrygian', 'harmonic']

function fitScoreForKey(prog: ProgChord[], tonicPc: number, steps: number[], isMinor: boolean): { diatonic: number; score: number } {
  const stepSet = new Set(steps)
  let diatonic = 0
  let score = 0
  prog.forEach((c, idx) => {
    const cType = c.type ?? ''
    const rel = r12(pc(c.root) - tonicPc)
    const tones = typeTones(cType).map(t => (rel + t) % 12)
    const rootIn = stepSet.has(rel)
    const allIn = rootIn && tones.every(t => stepSet.has(t))
    if (allIn) {
      diatonic++
      score += 2
    } else if (rootIn) {
      score += 0.5
    }
    if (rel === 0) {
      const mChord = /^m(?!aj)/i.test(cType)
      const majChord = !mChord && !/dim|sus|5/.test(cType)
      if ((isMinor && mChord) || (!isMinor && majChord)) score += idx === 0 ? 2.5 : 1.5
      else if ((isMinor && majChord && !/7$/.test(cType)) || (!isMinor && mChord)) score -= 2
    }
    if (idx === 0 && rel === 0) score += 1
  })
  return { diatonic, score }
}

/** Detect when Jam's progression chords clearly belong to a different key than Jam's current `(tonic, mode)`. */
export function detectJamKeyMismatch(prog: ProgChord[], tonic: string, mode: ModeId): JamKeyMismatch | null {
  if (prog.length < 2) return null
  const tPc = pc(tonic)
  const isMinor = MINOR_MODES.includes(mode)
  const curSteps = MODE_STEPS[mode]
  const cur = fitScoreForKey(prog, tPc, curSteps, isMinor)
  const outsideCount = prog.length - cur.diatonic
  if (outsideCount === 0) return null

  let tonicClash = false
  for (const c of prog) {
    if (r12(pc(c.root) - tPc) === 0) {
      const cType = c.type ?? ''
      const mChord = /^m(?!aj)/i.test(cType)
      const majChord = !mChord && !/dim|sus|5/.test(cType)
      if ((isMinor && majChord && !/7$/.test(cType)) || (!isMinor && mChord)) tonicClash = true
    }
  }

  let best = { pc: tPc, minor: isMinor, diatonic: cur.diatonic, score: cur.score }
  for (let p = 0; p < 12; p++) {
    for (const m of [false, true]) {
      if (p === tPc && m === isMinor) continue
      const f = fitScoreForKey(prog, p, MODE_STEPS[m ? 'minor' : 'major'], m)
      if (f.score > best.score + 0.5 || (f.diatonic > best.diatonic && f.score >= best.score)) {
        best = { pc: p, minor: m, ...f }
      }
    }
  }

  if (best.pc === tPc && best.minor === isMinor) return null
  const origPc = r12(pc(prog[0].root) - prog[0].semi)
  const originMoved = origPc !== tPc && outsideCount >= 1
  if (outsideCount < Math.ceil(prog.length / 2) && !tonicClash && !originMoved) return null
  if (best.diatonic <= cur.diatonic && !tonicClash) return null

  const sharp = pcName(best.pc, false)
  const flat = pcName(best.pc, true)
  const root = keyPrefersFlats(flat, best.minor) && !keyPrefersFlats(sharp, best.minor) ? flat : sharp
  return {
    progKey: { root, minor: best.minor, label: formatKeyBadge(root, best.minor) },
    jamLabel: formatKeyBadge(tonic, isMinor),
    outsideCount,
  }
}

/** Transpose Jam's `ProgChord[]` from `(fromRoot, fromMinor)` to `(toTonic, toMode)`. */
export function transposeJamProg(
  prog: ProgChord[],
  fromRoot: string,
  toTonic: string,
  toMode: ModeId,
  fromMinor = false,
): ProgChord[] {
  const toMinor = MINOR_MODES.includes(toMode)
  const fromSteps = MODE_STEPS[fromMinor ? 'minor' : 'major']
  return prog.map(c => {
    const cType = c.type ?? ''
    const semi = r12(pc(c.root) - pc(fromRoot))
    if (fromMinor !== toMinor) {
      const deg = fromSteps.indexOf(semi)
      if (deg >= 0) {
        const has7 = /7|9|11|13|maj/.test(cType)
        const d = diatonic(toMode, deg, has7)
        const next = spell(toTonic, toMode, { semi: d.semi, type: d.type, fn: c.fn, why: c.why })
        return { ...next, ...(c.beats ? { beats: c.beats } : {}) }
      }
    }
    const next = spell(toTonic, toMode, { semi, type: cType, fn: c.fn, why: c.why })
    return { ...next, ...(c.borrowed ? { borrowed: c.borrowed } : {}), ...(c.beats ? { beats: c.beats } : {}) }
  })
}
