// KGuitar's own tab-picture reader (tabRead.ts) → a song. Pictures of a printed tab (book pages, a scanned or Songsterr
// PDF, screenshots) are read here first, with no AI and no key: the line a number sits on is the string, so the strings
// are never guessed. Numbers the reader wasn't sure of are kept and marked (`unsure`): the tab shows them with an amber
// ring so you can check them against the page.
import { deskew, inkDark, type Gray } from './image'
import { readTab, graceLead, type TabReading } from './tabRead'
import { readVectorTab, type VectorReading } from './vectorTab'
import type { TuningFound } from './tuningText'
import type { PdfPage } from '../tabs/pdfTab'
import type { Song, SongBar } from '../tabs/model'
import { guessTabTempo } from '../audio/tempo'

export interface PictureReading {
  song: Song
  notes: number
  unsure: number
  staves: number
  meter: number
  /** the tuning / capo / tempo the page printed */
  found?: TuningFound
  /** Deep Mode audio-engine Render-and-Compare summary (when video audio verified the tab) */
  polish?: import('./deepAudioAlign').PolishSummary
}

/** Read every picture (pages in order). Null when no tab staff with numbers was found on any of them. */
export function readTabPictures(pics: Gray[], tuning: number[], title: string): PictureReading | null {
  const strings = tuning.length
  // light lines on a dark background (a dark-mode screenshot, a video's tab strip): turn round so the ink is dark
  pics = pics.map(g => deskew(inkDark(g)).g) // and level a crooked photo
  let readings = pics.map(g => readTab(g, { strings }))
  // one time signature for the whole piece: the one most of the notes were read in (a page with few bars can't tell)
  const votes = new Map<number, number>()
  for (const r of readings) if (r.notes) votes.set(r.meter, (votes.get(r.meter) ?? 0) + r.notes)
  if (!votes.size) return null
  const meter = [...votes].sort((a, b) => b[1] - a[1])[0][0]
  readings = readings.map((r, i) => (r.notes && r.meter !== meter ? readTab(pics[i], { strings, beats: meter }) : r))
  readings.forEach((r, i) => r.systems.forEach(sy => { sy.pic ??= i }))
  return readingSong(readings, tuning, title, meter, undefined, pics.map(g => ({ w: g.w, h: g.h })))
}

/** how many of a's items appear in b in the same order */
function lcs(a: string[], b: string[]): number {
  let prev = new Uint16Array(b.length + 1)
  for (const x of a) {
    const cur = new Uint16Array(b.length + 1)
    for (let j = 1; j <= b.length; j++) cur[j] = x === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1])
    prev = cur
  }
  return prev[b.length]
}

/** A video of a whole page that scrolls up and down (Songsterr's page view, a PDF on screen): each picture shows a few
 *  lines of tab, the next one the same lines moved up with a new one at the bottom. The lines a picture starts with
 *  that are the lines the picture before it ended on (in order, mostly the same notes) are the same music seen again:
 *  they're left out of the later picture, and every look at a line counts as a vote: the line keeps the reading that
 *  agrees most with the others (a rest sign once read as a 0, a blurred 6 once read as an 8, is outvoted). */
export function mergePages(readings: TabReading[]): TabReading[] {
  type Sys = TabReading['systems'][number]
  const key = (st: { notes: { string: number; fret: number }[] }) => st.notes.map(n => `${n.string}:${n.fret}`).sort().join('+')
  const keysOf = (sy: Sys) => sy.bars.flatMap(b => b.steps.filter(st => st.notes.length).map(key))
  const sim = (a: Sys, b: Sys) => {
    const ka = keysOf(a), kb = keysOf(b)
    const n = Math.max(ka.length, kb.length)
    return n ? lcs(ka, kb) / n : 1
  }
  const kept: { r: number; i: number; looks: Sys[] }[] = []
  const lines = readings.map(r => r.systems.length)
  readings.forEach((rd, ri) => {
    const prevMany = ri > 0 && lines[ri - 1] >= 2
    let m = 0
    if (prevMany && rd.systems.length >= 2) {
      for (let n = Math.min(kept.length, rd.systems.length); n >= 1 && !m; n--) {
        const from = kept.length - n
        if (rd.systems.slice(0, n).every((sy, j) => sim(sy, kept[from + j].looks[kept[from + j].looks.length - 1]) >= 0.6)) m = n
      }
      for (let j = 0; j < m; j++) kept[kept.length - m + j].looks.push(rd.systems[j])
    }
    rd.systems.forEach((sy, i) => { if (i >= m) kept.push({ r: ri, i, looks: [sy] }) })
    rd.systems = rd.systems.slice(m)
    // (indexes of the lines this picture keeps start at 0 again)
    for (const k of kept) if (k.r === ri) k.i -= m
  })
  for (const k of kept) if (k.looks.length > 2) {
    // the look with the fewest differences from the others (notes in one and not the other)
    const ks = k.looks.map(keysOf)
    let best = 0, bv = Infinity
    ks.forEach((a, x) => { const v = ks.reduce((s, b, y) => s + (x === y ? 0 : a.length + b.length - 2 * lcs(a, b)), 0); if (v < bv) { bv = v; best = x } })
    readings[k.r].systems[k.i] = k.looks[best]
  }
  return readings
}

/** A video's strips can repeat: the tab stops scrolling at the end, a page comes back, the scroll was lost for a moment
 *  and picked up again. A strip that starts with what the strips before it ended on loses that part (8+ steps the same,
 *  in order), and a short scrap that only repeats the last steps is dropped. */
export function dropRepeats(readings: TabReading[]): TabReading[] {
  const key = (st: { notes: { string: number; fret: number }[] }) => st.notes.map(n => `${n.string}:${n.fret}`).sort().join('+')
  const seen: string[] = []
  for (const r of readings) for (const sys of r.systems) {
    const steps = sys.bars.flatMap(b => b.steps.filter(st => st.notes.length))
    const keys = steps.map(key)
    if (keys.length && seen.length) {
      const tail = seen.slice(-Math.max(keys.length * 2, 40))
      // wholly inside what came just before
      // a short scrap that's nothing but the last steps again (the tab stopping at the end); a riff that really repeats
      // (a whole line, a card of its own) is kept
      const inside = keys.length >= 2 && keys.length <= 12 && lcs(keys, seen.slice(-keys.length - 2)) >= keys.length * 0.9
      let k = 0
      if (!inside) for (let n = Math.min(keys.length, tail.length); n >= 8; n--) if (tail.slice(-n).join('|') === keys.slice(0, n).join('|')) { k = n; break }
      if (inside) { sys.bars = []; continue }
      if (k) {
        // drop the first k note steps (and whatever rests sit among them)
        let left = k
        for (const b of sys.bars) {
          if (!left) break
          let cut = 0
          while (cut < b.steps.length && left) { if (b.steps[cut].notes.length) left--; cut++ }
          b.steps = b.steps.slice(cut)
        }
        sys.bars = sys.bars.filter(b => b.steps.length)
      }
      seen.push(...keys.slice(k))
    } else seen.push(...keys)
  }
  return readings
}

/** A screen recording of a YouTube Short often runs past its end: the Short starts again from the top. Lines at the end
 *  that are the opening again (6+ steps the same, in order, from the first note) are that replay, not more music. */
export function dropLoop(readings: TabReading[]): TabReading[] {
  const key = (st: { notes: { string: number; fret: number }[] }) => st.notes.map(n => `${n.string}:${n.fret}`).sort().join('+')
  const all = readings.flatMap(r => r.systems.map(sy => ({ r, sy, keys: sy.bars.flatMap(b => b.steps.filter(st => st.notes.length).map(key)) })))
  const start = all.flatMap(a => a.keys).slice(0, 40)
  // walk back from the end while each line (or its start) is the opening played again
  for (let i = all.length - 1; i > 0; i--) {
    const k = all[i].keys
    const n = Math.min(k.length, start.length)
    if (n < 6 || lcs(k.slice(0, n), start.slice(0, n)) < n * 0.85) break
    // the replay only counts when everything after this line is gone too (it is the very end)
    if (all.slice(i + 1).some(a => a.sy.bars.length)) break
    all[i].sy.bars = []
  }
  return readings
}

/** A video's sound with, per strip, when its playhead was where (Stitcher.timelines) and where its frames sat when
 *  (Stitcher.views). */
export interface VideoSound { x: Float32Array; sr: number; timelines: { x: number; t: number }[][]; views?: { x0: number; w: number; t: number }[][] }

/** The audio referee's settings for strip i: from its playhead when one was seen; otherwise (given a first reading of the
 *  strip) from where its frames sat, with the playhead place and the tuning that make the notes the picture is sure of
 *  sound right (standard, drop D, a half step and a whole step down are tried when the app is in standard tuning). */
export async function soundFor(snd: VideoSound, tuning: number[]): Promise<(i: number, first?: TabReading) => { hear?: { at: import('./hear').Hearing; when: (x: number) => number | null; tuning: number[] } }> {
  const H = await import('./hear')
  const { timeOf } = await import('./crnnRead')
  const at = H.hearing(snd.x, snd.sr)
  const std = tuning.join() === '40,45,50,55,59,64'
  const tunings = std ? [tuning, [38, 45, 50, 55, 59, 64], tuning.map(m => m - 1), tuning.map(m => m - 2)] : [tuning]
  const cache = new Map<number, ReturnType<typeof H.tuneTiming>>()
  return (i, first) => {
    const tl = snd.timelines[i]
    if (tl && tl.length >= 2) return { hear: { at, when: timeOf(tl), tuning } }
    const vs = snd.views?.[i]
    if (!vs || vs.length < 2) return {}
    if (!cache.has(i)) {
      if (!first) return {}
      const notes = first.systems.flatMap(sy => sy.bars.flatMap(b => b.steps.flatMap(st => st.notes.filter(n => !n.dead && n.sure >= 0.8).map(n => ({ x: n.x, string: n.string, fret: n.fret })))))
      cache.set(i, H.tuneTiming(notes, vs, at, tunings))
    }
    const tt = cache.get(i)
    if (!tt) return {}
    const w = timeOf(H.viewTimeline(vs, tt.p))
    return { hear: { at: H.heardAround(at), when: (x: number) => { const t = w(x); return t === null ? null : t + tt.delay }, tuning: tt.tuning } }
  }
}

/** The same, with the trained reader (tab_crnn) when the app has it: it reads photos, scans and video frames far better
 *  than the number matcher. Falls back to readTabPictures when the model can't be loaded. */
export async function readTabPicturesBest(pics: Gray[], tuning: number[], title: string, o: {
  video?: boolean
  /** Deep Accuracy Mode: DTW Audio-to-Tab + Render-and-Compare verification (videos/Shorts) or Dual-Reader Cross-Check (PDFs/screenshots) */
  deep?: boolean
  /** a video's sound and, per picture, when the playhead was where (pictures.ts Stitcher.timelines): numbers the
   *  picture leaves in doubt are settled by the note heard */
  hear?: VideoSound
} = {}): Promise<PictureReading | null> {
  let run: import('./crnnRead').CrnnRun | null = null
  try { run = await (await import('../ml/models')).tabCrnnRunner() } catch { run = null }
  if (!run) return readTabPictures(pics, tuning, title)
  const { readTabCrnn } = await import('./crnnRead')
  const strings = tuning.length
  const hearFor: Awaited<ReturnType<typeof soundFor>> = o.hear ? await soundFor(o.hear, tuning) : () => ({})
  pics = pics.map(inkDark)
  let readings: TabReading[] = []
  for (const [i, g] of pics.entries()) readings.push(await readTabCrnn(g, run, { strings, ...hearFor(i) }))
  const votes = new Map<number, number>()
  for (const r of readings) if (r.notes) votes.set(r.meter, (votes.get(r.meter) ?? 0) + r.notes)
  if (!votes.size) return readTabPictures(pics, tuning, title)
  const meter = [...votes].sort((a, b) => b[1] - a[1])[0][0]
  const again: TabReading[] = []
  for (const [i, r] of readings.entries()) {
    // strips with no playhead to time them: timed from where their frames sat, once the reading says what to listen for
    const late: ReturnType<typeof hearFor> = r.notes && !hearFor(i).hear ? hearFor(i, r) : {}
    again.push(r.notes && (r.meter !== meter || late.hear) ? await readTabCrnn(pics[i], run, { strings, beats: meter, ...hearFor(i), ...late }) : r)
  }

  // Deep Mode PDF / Screenshot Dual-Reader Cross-Check (tab_crnn + template reader consensus)
  if (o.deep && !o.video) {
    for (let i = 0; i < again.length; i++) {
      const cr = again[i]
      if (!cr.unsure) continue
      const tpl = readTab(deskew(pics[i]).g, { strings, beats: meter })
      if (!tpl.notes) continue
      const tplNotes = tpl.systems.flatMap(sy => sy.bars.flatMap(b => b.steps.flatMap(st => st.notes)))
      for (const sy of cr.systems) {
        for (const b of sy.bars) {
          for (const st of b.steps) {
            for (const n of st.notes) {
              if (n.sure >= 0.06) continue
              // If the template matcher independently read the exact same fret on the same string nearby, confirm it!
              const agrees = tplNotes.some(tn => tn.string === n.string && tn.fret === n.fret && tn.sure >= 0.12 && Math.abs(tn.x - n.x) < 28)
              if (agrees) n.sure = 0.12
            }
          }
        }
      }
    }
  }

  // each staff remembers its picture before pages are merged (a merged staff may come from another picture)
  again.forEach((r, i) => r.systems.forEach(sy => { sy.pic ??= i }))
  readings = o.video ? dropLoop(dropRepeats(mergePages(again))) : again
  const built = readingSong(readings, tuning, title, meter, undefined, pics.map(g => ({ w: g.w, h: g.h })))
  if (!built) return null

  // Deep Mode Audio Engine Render-and-Compare + DTW Alignment + Tuning/Capo Auto-Detection!
  if (o.hear && o.deep !== false) {
    try {
      const { renderAndCompareSong } = await import('./deepAudioAlign')
      const polish = renderAndCompareSong(built.song, o.hear.x, o.hear.sr)
      built.polish = polish
      // Recount remaining unsure notes after audio verification
      let remUnsure = 0
      for (const tr of built.song.tracks) {
        for (const b of tr.bars) {
          for (const st of b.steps) {
            for (const n of st.notes as { unsure?: boolean }[]) if (n.unsure) remUnsure++
          }
        }
      }
      built.unsure = remUnsure
    } catch { /* non-fatal: keep visual reading */ }
  }
  return built
}

/** Several pages' readings → one song (exported for tests). Staves stacked in one system (Guitar 1 / 2 / 3) become their
 *  own tracks; a tuning / capo / tempo the page prints is used. */
export function readingSong(readings: TabReading[], tuning: number[], title: string, meter: number, found?: TuningFound, sizes?: { w: number; h: number }[]): PictureReading | null {
  const tun = found?.midis && found.midis.length === tuning.length ? found.midis : tuning
  const capo = found?.capo ?? 0
  const parts: { name?: string; bars: SongBar[] }[] = []
  let notes = 0, unsure = 0, staves = 0
  for (const [ri, r] of readings.entries()) {
    for (const s of r.systems) {
      if (!s.bars.some(b => b.steps.length)) continue
      const pic = s.pic ?? ri, size = sizes?.[pic]
      const top = Math.min(...s.lines), bottom = Math.max(...s.lines)
      const srcOf = (n: { x: number; string: number }) => size && Number.isFinite(top) ? { p: pic, x: n.x / size.w, y: (s.lines[n.string] ?? top) / size.h, y0: Math.max(0, top - s.gap * 1.6) / size.h, y1: Math.min(size.h, bottom + s.gap * 1.6) / size.h } : undefined
      staves++
      const part = (parts[s.part ?? 0] ??= { bars: [] })
      if (s.partName && !part.name) part.name = s.partName
      for (const b of s.bars) {
        if (!b.steps.length) { part.bars.push({ steps: [{ notes: [], dur: b.beats }] }); continue }
        part.bars.push({
          steps: b.steps.map(st => ({
            dur: st.dur,
            ...(st.grace ? { grace: true } : {}),
            ...(st.stroke ? { stroke: st.stroke } : {}),
            notes: st.notes.filter(n => n.string < tun.length).map(n => {
              notes++
              const doubt = n.sure < 0.06
              if (doubt) unsure++
              const tech = n.dead ? 'x' : n.tech
              const alts = n.alts?.filter(a => a !== n.fret)
              return {
                string: n.string,
                fret: n.fret,
                midi: tun[n.string] + capo + n.fret,
                ...(tech ? { tech } : {}),
                ...(doubt ? { unsure: true } : {}),
                ...(alts?.length ? { alts } : {}),
                ...(srcOf(n) ? { src: srcOf(n)! } : {}),
              }
            }),
          })),
        })
      }
    }
  }
  if (!notes) return null
  for (const p of parts) if (p) graceLead(p.bars)
  const tracks = parts.filter(Boolean).map((p, i) => {
    // an empty last bar left over at the end of a page isn't music
    while (p.bars.length && !p.bars[p.bars.length - 1].steps.some(st => st.notes.length)) p.bars.pop()
    const name = p.name ?? (parts.length > 1 ? `Guitar ${i + 1}` : 'Guitar')
    // the page can give each guitar its own tuning ("Guitars 4 & 5  E A D G B E")
    const num = Number(/(\d+)/.exec(name)?.[1] ?? i + 1)
    const own = found?.parts?.find(q => q.guitars.includes(num) && q.midis.length === tuning.length)?.midis
    if (own && own.join() !== tun.join()) for (const b of p.bars) for (const st of b.steps) for (const n of st.notes) n.midi = own[n.string] + capo + n.fret
    return { name, tuning: [...(own ?? tun)], capo, bars: p.bars }
  }).filter(t => t.bars.length)
  const durs = tracks[0].bars.flatMap(b => b.steps.filter(st => st.notes.length).map(st => st.dur))
  const song: Song = {
    title,
    ...(found?.tempo ? { tempo: found.tempo, tempoFrom: 'file' as const } : { tempo: guessTabTempo(durs), tempoFrom: 'guess' as const }),
    ...(meter !== 4 ? { meter, timeSig: [meter, 4] as [number, number] } : {}),
    tracks,
  }
  return { song, notes, unsure, staves, meter, ...(found ? { found } : {}) }
}

/** A tab PDF drawn by tab software (Guitar Pro, Songsterr, Sheet Happens …): read from its shapes, exactly. Null when
 *  the pages have no drawn tab. */
export function readPdfShapes(pages: PdfPage[], tuning: number[], title: string): PictureReading | null {
  const strings = tuning.length
  const rs: VectorReading[] = []
  let startMeter: { beats: number; sig: [number, number] } | undefined
  for (const pg of pages) {
    // a time signature carries on to the next page until a new one is printed
    const r = pg.shapes?.length ? readVectorTab(pg.shapes, { strings, texts: pg.texts, height: pg.height, glyphs: pg.glyphs, pdfMarks: pg.marks, startMeter }) : null
    if (r && r.notes) rs.push(r)
    const last = r?.meters[r.meters.length - 1]
    if (last) startMeter = { beats: last.beats, sig: last.sig }
  }
  if (!rs.length) return null
  const found = rs.find(r => r.tuning?.names)?.tuning ?? rs.find(r => r.tuning)?.tuning
  const first = rs.flatMap(r => r.meters)[0]
  return readingSong(rs, tuning, title, first?.beats ?? 4, found)
}

/** Good enough to use without asking the AI: a real tab was found, and most of it read cleanly. */
export const trustReading = (r: PictureReading | null) => !!r && r.notes >= 4 && r.unsure <= Math.max(2, r.notes * 0.55)

/** A picture (an <img> that has loaded) → grey pixels for the reader. Small pictures are enlarged so a tab's numbers are
 *  at least ~20 pixels tall (screenshots of a phone screen), big ones kept (a 300 dpi page is fine as it is). */
export function grayOf(img: HTMLImageElement | HTMLCanvasElement, minWidth = 1600, box?: { x: number; y: number; w: number; h: number } | null): Gray {
  const w0 = 'naturalWidth' in img ? img.naturalWidth : img.width, h0 = 'naturalHeight' in img ? img.naturalHeight : img.height
  const sx = box ? Math.max(0, Math.round(box.x * w0)) : 0
  const sy = box ? Math.max(0, Math.round(box.y * h0)) : 0
  const sw = box ? Math.max(1, Math.min(w0 - sx, Math.round(box.w * w0))) : w0
  const sh = box ? Math.max(1, Math.min(h0 - sy, Math.round(box.h * h0))) : h0
  const s = Math.min(4, Math.max(1, minWidth / Math.max(1, sw)))
  const w = Math.round(sw * s), h = Math.round(sh * s)
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const x = c.getContext('2d', { willReadFrequently: true })!
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h)
  x.imageSmoothingQuality = 'high'
  x.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
  const d = x.getImageData(0, 0, w, h).data
  const px = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) px[i] = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) / 255
  // a dark-mode screenshot (light lines on black): turned round so ink is dark (a dark video frame with a white tab
  // strip in it is left as it is)
  return inkDark({ w, h, px })
}

/** A grey picture the reader saw, as an image for the "Check it in the picture" card (note positions are fractions of
 *  it, so a picture scaled down to stay inside the phone's canvas limits still lines up). */
export function grayPicture(g: Gray): { url: string; w: number; h: number } {
  const s = Math.min(1, 8000 / g.w, 3000 / g.h)
  const w = Math.max(1, Math.round(g.w * s)), h = Math.max(1, Math.round(g.h * s))
  const full = document.createElement('canvas')
  full.width = g.w; full.height = g.h
  const fx = full.getContext('2d')!
  const im = fx.createImageData(g.w, g.h)
  for (let i = 0; i < g.w * g.h; i++) { const v = Math.round(Math.max(0, Math.min(1, g.px[i])) * 255); im.data[i * 4] = v; im.data[i * 4 + 1] = v; im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255 }
  fx.putImageData(im, 0, 0)
  let c = full
  if (s < 1) { c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d')!; x.imageSmoothingQuality = 'high'; x.drawImage(full, 0, 0, w, h) }
  return { url: c.toDataURL('image/jpeg', 0.82), w, h }
}

/** The song as a plain text tab (for "Fix the tab text"), high string on top; spacing follows the note lengths. */
export function songTabText(song: Song, names: string[]): string {
  const t = song.tracks[0]
  const lines: string[] = []
  const perLine = 4
  const asc = [...names].reverse()
  for (let b0 = 0; b0 < t.bars.length; b0 += perLine) {
    const rows = asc.map(n => n.padEnd(2) + '|')
    for (const bar of t.bars.slice(b0, b0 + perLine)) {
      for (const st of bar.steps) {
        const cell = Math.max(2, ...st.notes.map(n => String(n.fret).length + (n.tech && n.tech !== 'x' ? 1 : 0))) + Math.max(0, Math.round(st.dur * 4) - 1)
        for (let k = 0; k < asc.length; k++) {
          const n = st.notes.find(m => m.string === k)
          const tx = n ? (n.tech === 'x' ? 'x' : String(n.fret) + (n.tech && /^[hp/\\b~]$/.test(n.tech) ? n.tech : '')) : ''
          rows[k] += '-' + tx + '-'.repeat(Math.max(0, cell - tx.length))
        }
      }
      for (let k = 0; k < asc.length; k++) rows[k] += '-|'
    }
    lines.push(rows.reverse().join('\n'))
  }
  return lines.join('\n\n')
}
