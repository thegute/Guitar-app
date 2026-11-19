// Pure zero-dependency Standard MIDI File (SMF Type 0) Chord Chart Exporter & Importer.
// Lets you export Strum Machine / Chord Vibe Sets / Chord Path progressions as .mid files
// (for Logic Pro, Ableton, GarageBand, Scaler) AND import .mid chord progressions straight into Strum Machine!
import { Chord } from 'tonal'
import { keyPrefersFlats, pcName } from '../theory/notes'
import {
  parseChordQual,
  strumStyleMeta,
  type ChordQual,
  type StrumBar,
  type StrumChart,
} from '../theory/harmonicFlow'

const QUAL_IVS: Record<ChordQual, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '5': [0, 7, 12],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  dim: [0, 3, 6],
  sus4: [0, 5, 7],
  add9: [0, 4, 7, 14],
}

function writeVarLen(v: number): number[] {
  let val = Math.max(0, Math.floor(v))
  const out = [val & 0x7f]
  val >>= 7
  while (val > 0) {
    out.unshift((val & 0x7f) | 0x80)
    val >>= 7
  }
  return out
}

function u16(n: number): number[] {
  return [(n >> 8) & 0xff, n & 0xff]
}

function u32(n: number): number[] {
  return [(n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

/** Export a StrumChart to a Standard MIDI File (.mid) with tempo, meter, and chord blocks. */
export function exportStrumChartToMidi(chart: StrumChart): Uint8Array {
  const tpq = 480
  const beatsPerBar = strumStyleMeta(chart.style).beatsPerBar
  const mpq = Math.round(60_000_000 / Math.max(40, Math.min(240, chart.bpm)))

  const evs: { tick: number; bytes: number[] }[] = []
  // Meta: Tempo
  evs.push({ tick: 0, bytes: [0xff, 0x51, 0x03, (mpq >> 16) & 0xff, (mpq >> 8) & 0xff, mpq & 0xff] })
  // Meta: Time Signature
  evs.push({ tick: 0, bytes: [0xff, 0x58, 0x04, beatsPerBar, 2, 24, 8] })
  // Meta: Track Name
  const titleBytes = Array.from(new TextEncoder().encode(chart.name || 'KGuitar Chords'))
  evs.push({ tick: 0, bytes: [0xff, 0x03, ...writeVarLen(titleBytes.length), ...titleBytes] })

  let curTick = 0
  for (const bar of chart.bars) {
    const chords = bar.chords.length ? bar.chords : ['C']
    const segTicks = Math.floor((beatsPerBar * tpq) / chords.length)
    for (const sym of chords) {
      const parsed = parseChordQual(sym)
      const rootPc = ((parsed?.rootPc ?? 0) + (chart.capo ?? 0) + 120) % 12
      const qual = parsed?.qual ?? ''
      const ivs = QUAL_IVS[qual] ?? [0, 4, 7]
      const notes = [36 + rootPc, ...ivs.map(iv => 48 + rootPc + iv)]
      for (const m of notes) {
        evs.push({ tick: curTick, bytes: [0x90, m & 0x7f, 88] })
        evs.push({ tick: curTick + Math.max(60, segTicks - 20), bytes: [0x80, m & 0x7f, 0] })
      }
      curTick += segTicks
    }
  }

  evs.sort((a, b) => a.tick - b.tick)

  const track: number[] = []
  let lastTick = 0
  for (const ev of evs) {
    track.push(...writeVarLen(ev.tick - lastTick), ...ev.bytes)
    lastTick = ev.tick
  }
  // End of Track
  track.push(0x00, 0xff, 0x2f, 0x00)

  const header = [
    0x4d, 0x54, 0x68, 0x64, // MThd
    ...u32(6),
    ...u16(0), // format 0
    ...u16(1), // 1 track
    ...u16(tpq),
    0x4d, 0x54, 0x72, 0x6b, // MTrk
    ...u32(track.length),
    ...track,
  ]
  return new Uint8Array(header)
}

/** Trigger browser/webview download of a .mid file. */
export function downloadMidiFile(bytes: Uint8Array, filename: string) {
  const safe = filename.replace(/[^a-z0-9._-]+/gi, '_').replace(/\.mid$/i, '') + '.mid'
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  const blob = new Blob([copy.buffer], { type: 'audio/midi' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = safe
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

/** Import a Standard MIDI File (.mid) into a playable StrumChart by detecting chords per bar. */
export function importMidiToStrumChart(bytes: Uint8Array, fileName = 'Imported MIDI'): StrumChart {
  if (bytes.length < 14 || String.fromCharCode(...bytes.slice(0, 4)) !== 'MThd') {
    throw new Error('Not a valid .mid file (missing MThd header).')
  }
  const nTracks = (bytes[10] << 8) | bytes[11]
  const tpq = Math.max(24, (bytes[12] << 8) | bytes[13])
  let pos = 8 + ((bytes[4] << 24) | (bytes[5] << 16) | (bytes[6] << 8) | bytes[7])
  let bpm = 100
  let beatsPerBar: 3 | 4 = 4
  const noteOns: { tick: number; midi: number }[] = []

  const readVar = (p: { i: number }, end: number) => {
    let val = 0
    for (let k = 0; k < 4 && p.i < end; k++) {
      const b = bytes[p.i++]
      val = (val << 7) | (b & 0x7f)
      if ((b & 0x80) === 0) break
    }
    return val
  }

  for (let tr = 0; tr < nTracks && pos + 8 <= bytes.length; tr++) {
    const tag = String.fromCharCode(...bytes.slice(pos, pos + 4))
    const len = (bytes[pos + 4] << 24) | (bytes[pos + 5] << 16) | (bytes[pos + 6] << 8) | bytes[pos + 7]
    pos += 8
    const end = Math.min(bytes.length, pos + len)
    if (tag !== 'MTrk') {
      pos = end
      continue
    }
    const p = { i: pos }
    let tick = 0
    let running = 0
    while (p.i < end) {
      tick += readVar(p, end)
      if (p.i >= end) break
      let status = bytes[p.i]
      if (status >= 0x80) {
        p.i++
        if (status < 0xf0) running = status
      } else {
        status = running
      }
      if (status === 0xff) {
        const metaType = bytes[p.i++]
        const mLen = readVar(p, end)
        if (metaType === 0x51 && mLen === 3 && p.i + 3 <= end) {
          const mpq = (bytes[p.i] << 16) | (bytes[p.i + 1] << 8) | bytes[p.i + 2]
          if (mpq > 0) bpm = Math.max(40, Math.min(240, Math.round(60_000_000 / mpq)))
        } else if (metaType === 0x58 && mLen >= 1 && p.i < end) {
          beatsPerBar = bytes[p.i] === 3 ? 3 : 4
        }
        p.i += mLen
      } else if (status === 0xf0 || status === 0xf7) {
        const sLen = readVar(p, end)
        p.i += sLen
      } else {
        const hi = status & 0xf0
        const dataBytes = hi === 0xc0 || hi === 0xd0 ? 1 : 2
        const d1 = bytes[p.i] ?? 0
        const d2 = dataBytes === 2 ? (bytes[p.i + 1] ?? 0) : 0
        p.i += dataBytes
        // Skip drum channel (ch 10 = index 9)
        if (hi === 0x90 && d2 > 0 && (status & 0x0f) !== 9) {
          noteOns.push({ tick, midi: d1 })
        }
      }
    }
    pos = end
  }

  if (!noteOns.length) {
    throw new Error('No pitched chord notes found in that .mid file.')
  }

  const barTicks = tpq * beatsPerBar
  const maxTick = Math.max(...noteOns.map(n => n.tick))
  const totalBars = Math.min(32, Math.max(1, Math.floor(maxTick / barTicks) + 1))

  const detectFromMidis = (midis: number[]): string | null => {
    if (!midis.length) return null
    const sorted = [...midis].sort((a, b) => a - b)
    const noteNames = [...new Set(sorted.map(m => pcName(m % 12, false)))]
    const detected = Chord.detect(noteNames)
    if (detected.length) {
      return detected[0]
        .replace(/M$/, '')
        .replace(/maj$/, '')
        .replace(/\/[A-G][#b]?$/, '')
    }
    const bassPc = sorted[0] % 12
    const pcs = new Set(sorted.map(m => m % 12))
    const hasMin = pcs.has((bassPc + 3) % 12)
    const hasMaj = pcs.has((bassPc + 4) % 12)
    return pcName(bassPc, false) + (hasMin && !hasMaj ? 'm' : '')
  }

  const bars: StrumBar[] = []
  let lastChord = 'C'
  for (let b = 0; b < totalBars; b++) {
    const start = b * barTicks
    const mid = start + Math.floor(barTicks / 2)
    const end = (b + 1) * barTicks
    const firstHalf = noteOns.filter(n => n.tick >= start - 24 && n.tick < mid - 24).map(n => n.midi)
    const secondHalf = noteOns.filter(n => n.tick >= mid - 24 && n.tick < end - 24).map(n => n.midi)
    const c1 = detectFromMidis(firstHalf)
    const c2 = detectFromMidis(secondHalf)
    if (c1 && c2 && c1 !== c2) {
      bars.push({ chords: [c1, c2], section: b === 0 ? 'Imported' : undefined })
      lastChord = c2
    } else {
      const whole = c1 ?? c2 ?? detectFromMidis([...firstHalf, ...secondHalf]) ?? lastChord
      bars.push({ chords: [whole], section: b === 0 ? 'Imported' : undefined })
      lastChord = whole
    }
  }

  const firstParsed = parseChordQual(bars[0]?.chords[0] ?? 'C')
  const minor = firstParsed ? (firstParsed.qual === 'm' || firstParsed.qual === 'm7') : false
  const tonic = firstParsed ? pcName(firstParsed.rootPc, keyPrefersFlats(pcName(firstParsed.rootPc, false), minor)) : 'C'

  return {
    id: `midi-${Date.now()}`,
    name: fileName.replace(/\.mid$/i, ''),
    tonic,
    minor,
    capo: 0,
    bpm,
    style: beatsPerBar === 3 ? 'waltz' : 'folk',
    bars,
  }
}
