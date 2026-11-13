// KGuitar's own tab-picture reader (tabRead.ts) → a song. Pictures of a printed tab (book pages, a scanned or Songsterr
// PDF, screenshots) are read here first, with no AI and no key: the line a number sits on is the string, so the strings
// are never guessed. Numbers the reader wasn't sure of are kept and marked (`unsure`): the tab shows them with an amber
// ring so you can check them against the page.
import { isDark, type Gray } from './image'
import { readTab, type TabReading } from './tabRead'
import type { Song, SongBar } from '../tabs/model'
import { guessTabTempo } from '../audio/tempo'

export interface PictureReading {
  song: Song
  notes: number
  unsure: number
  staves: number
  meter: number
}

/** Read every picture (pages in order). Null when no tab staff with numbers was found on any of them. */
export function readTabPictures(pics: Gray[], tuning: number[], title: string): PictureReading | null {
  const strings = tuning.length
  let readings = pics.map(g => readTab(g, { strings }))
  // one time signature for the whole piece: the one most of the notes were read in (a page with few bars can't tell)
  const votes = new Map<number, number>()
  for (const r of readings) if (r.notes) votes.set(r.meter, (votes.get(r.meter) ?? 0) + r.notes)
  if (!votes.size) return null
  const meter = [...votes].sort((a, b) => b[1] - a[1])[0][0]
  readings = readings.map((r, i) => (r.notes && r.meter !== meter ? readTab(pics[i], { strings, beats: meter }) : r))
  return readingSong(readings, tuning, title, meter)
}

/** Several pages' readings → one song (exported for tests). */
export function readingSong(readings: TabReading[], tuning: number[], title: string, meter: number): PictureReading | null {
  const bars: SongBar[] = []
  let notes = 0, unsure = 0, staves = 0
  for (const r of readings) {
    for (const s of r.systems) {
      if (!s.bars.some(b => b.steps.length)) continue
      staves++
      for (const b of s.bars) {
        if (!b.steps.length) { bars.push({ steps: [{ notes: [], dur: b.beats }] }); continue }
        bars.push({
          steps: b.steps.map(st => ({
            dur: st.dur,
            notes: st.notes.filter(n => n.string < tuning.length).map(n => {
              notes++
              const doubt = n.sure < 0.06
              if (doubt) unsure++
              return { string: n.string, fret: n.fret, midi: tuning[n.string] + n.fret, ...(n.dead ? { tech: 'x' } : {}), ...(doubt ? { unsure: true } : {}) }
            }),
          })),
        })
      }
    }
  }
  if (!notes) return null
  // an empty last bar left over at the end of a page isn't music
  while (bars.length && !bars[bars.length - 1].steps.some(st => st.notes.length)) bars.pop()
  const durs = bars.flatMap(b => b.steps.filter(st => st.notes.length).map(st => st.dur))
  const song: Song = {
    title,
    tempo: guessTabTempo(durs),
    tempoFrom: 'guess',
    ...(meter !== 4 ? { meter, timeSig: [meter, 4] as [number, number] } : {}),
    tracks: [{ name: 'Guitar', tuning: [...tuning], capo: 0, bars }],
  }
  return { song, notes, unsure, staves, meter }
}

/** Good enough to use without asking the AI: a real tab was found, and most of it read cleanly. */
export const trustReading = (r: PictureReading | null) => !!r && r.notes >= 6 && r.unsure <= r.notes * 0.35

/** A picture (an <img> that has loaded) → grey pixels for the reader. Small pictures are enlarged so a tab's numbers are
 *  at least ~20 pixels tall (screenshots of a phone screen), big ones kept (a 300 dpi page is fine as it is). */
export function grayOf(img: HTMLImageElement | HTMLCanvasElement, minWidth = 1600): Gray {
  const w0 = 'naturalWidth' in img ? img.naturalWidth : img.width, h0 = 'naturalHeight' in img ? img.naturalHeight : img.height
  const s = Math.min(3, Math.max(1, minWidth / Math.max(1, w0)))
  const w = Math.round(w0 * s), h = Math.round(h0 * s)
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const x = c.getContext('2d', { willReadFrequently: true })!
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h)
  x.imageSmoothingQuality = 'high'
  x.drawImage(img, 0, 0, w, h)
  const d = x.getImageData(0, 0, w, h).data
  const px = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) px[i] = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) / 255
  const g = { w, h, px }
  // a dark-mode screenshot (light lines on black): turn it round so ink is dark
  if (isDark(g)) for (let i = 0; i < px.length; i++) px[i] = 1 - px[i]
  return g
}

/** The song as a plain text tab (for "Fix the tab text"), high string on top; spacing follows the note lengths. */
export function songTabText(song: Song, names: string[]): string {
  const t = song.tracks[0]
  const lines: string[] = []
  const perLine = 4
  for (let b0 = 0; b0 < t.bars.length; b0 += perLine) {
    const rows = names.map(n => n.padEnd(2) + '|')
    for (const bar of t.bars.slice(b0, b0 + perLine)) {
      for (const st of bar.steps) {
        const cell = Math.max(2, ...st.notes.map(n => String(n.fret).length)) + Math.max(0, Math.round(st.dur * 4) - 1)
        for (let k = 0; k < names.length; k++) {
          const n = st.notes.find(m => m.string === k)
          const tx = n ? (n.tech === 'x' ? 'x' : String(n.fret)) : ''
          rows[k] += '-' + tx + '-'.repeat(Math.max(0, cell - tx.length))
        }
      }
      for (let k = 0; k < names.length; k++) rows[k] += '-|'
    }
    lines.push(rows.reverse().join('\n'))
  }
  return lines.join('\n\n')
}
