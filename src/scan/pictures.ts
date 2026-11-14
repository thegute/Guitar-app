// Pictures → clean, large tab strips for the AI (runs in the page with <canvas>):
//   screenshots: find the tab staves, crop to them (or to the box you dragged), scale 2–3× smoothly, grey, stretch
//   the contrast (dark video tabs come out black on white), sharpen; very wide strips are cut between notes
//   video files (and Samsung screen recordings): sample frames, skip ones where nothing changed, follow a scrolling tab
//   sideways and stitch the new part onto a panorama; a page turn starts a new strip
import { findStrips, matchAt, playheadX, profile, sharpen, shiftBetween, stretchContrast, toGray, type Gray, type Strip } from './image'

export interface Box { x: number; y: number; w: number; h: number } // 0..1 of the picture
export interface Piece { b64: string; mime: string; url: string; w: number; h: number }
type Src = HTMLImageElement | ImageBitmap | HTMLVideoElement | HTMLCanvasElement

const sizeOf = (s: Src) => s instanceof HTMLVideoElement ? { w: s.videoWidth, h: s.videoHeight } : { w: (s as { width: number }).width, h: (s as { height: number }).height }

function canvasOf(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h))
  return c
}

/** A picture file or data URL → an image. */
export async function loadPicture(src: Blob | string): Promise<HTMLImageElement> {
  const url = typeof src === 'string' ? src : URL.createObjectURL(src)
  const img = new Image()
  img.decoding = 'async'
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('That picture could not be opened.')); img.src = url })
  return img
}

/** Grey pixels of (part of) a picture, at most `maxW` wide (for finding things). */
export function grayAt(src: Src, maxW = 1000, box?: Box): { g: Gray; scale: number; ox: number; oy: number } {
  const { w, h } = sizeOf(src)
  const bx = box ? { x: box.x * w, y: box.y * h, w: box.w * w, h: box.h * h } : { x: 0, y: 0, w, h }
  const scale = Math.min(1, maxW / bx.w)
  const c = canvasOf(bx.w * scale, bx.h * scale)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(src as CanvasImageSource, bx.x, bx.y, bx.w, bx.h, 0, 0, c.width, c.height)
  const d = ctx.getImageData(0, 0, c.width, c.height)
  return { g: toGray(d.data, c.width, c.height), scale, ox: bx.x, oy: bx.y }
}

/** Where the tab is in a picture (as 0..1 boxes, one per staff), or [] when no staff lines were found. */
export function tabBoxes(src: Src): Box[] {
  const { w, h } = sizeOf(src)
  const { g, scale } = grayAt(src, 1000)
  return findStrips(g).map(s => toBox(s, scale, w, h))
}
const toBox = (s: Strip, scale: number, w: number, h: number): Box => ({ x: s.left / scale / w, y: s.top / scale / h, w: (s.right - s.left) / scale / w, h: (s.bottom - s.top) / scale / h })
/** One box around all the staves (the crop to show and adjust). */
export function unionBox(bs: Box[]): Box | null {
  if (!bs.length) return null
  const x0 = Math.min(...bs.map(b => b.x)), y0 = Math.min(...bs.map(b => b.y))
  const x1 = Math.max(...bs.map(b => b.x + b.w)), y1 = Math.max(...bs.map(b => b.y + b.h))
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/** Crop, scale up 2–3× (smooth), grey + contrast + sharpen. `gapPx` = the string spacing in the source, if known. */
export function enhance(src: Src, box: Box | null, gapPx?: number): Gray {
  const { w, h } = sizeOf(src)
  const bx = box ? { x: box.x * w, y: box.y * h, w: box.w * w, h: box.h * h } : { x: 0, y: 0, w, h }
  // big enough that a fret number is ~16+ px tall, never more than 3×, and not wider than 3600 px
  let k = gapPx ? Math.max(2, Math.min(3, 22 / gapPx)) : bx.h < 400 ? 3 : bx.h < 800 ? 2 : 1
  k = Math.max(1, Math.min(k, 3600 / bx.w))
  const c = canvasOf(bx.w * k, bx.h * k)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src as CanvasImageSource, bx.x, bx.y, bx.w, bx.h, 0, 0, c.width, c.height)
  const d = ctx.getImageData(0, 0, c.width, c.height)
  return sharpen(stretchContrast(toGray(d.data, c.width, c.height)), 0.9)
}

/** Grey pixels → a PNG piece. */
export function pieceOf(g: Gray): Piece {
  const c = canvasOf(g.w, g.h)
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(g.w, g.h)
  for (let i = 0; i < g.px.length; i++) { const v = Math.round(g.px[i] * 255); img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255 }
  ctx.putImageData(img, 0, 0)
  const url = c.toDataURL('image/png')
  return { b64: url.slice(url.indexOf(',') + 1), mime: 'image/png', url, w: g.w, h: g.h }
}

/** A strip much wider than tall is cut into parts (at the emptiest column near each cut) so nothing gets shrunk.
 *  8:1 keeps it to a few requests (the free AI tiers count them) while staying sharp after the AI's own resizing. */
export function cutWide(g: Gray, maxAspect = 8): Gray[] {
  if (g.w <= g.h * maxAspect) return [g]
  const target = Math.round(g.h * maxAspect * 0.9)
  const p = profile(g)
  const out: Gray[] = []
  let x0 = 0
  while (g.w - x0 > target * 1.15) {
    // the emptiest column in the last 20% before the target
    let cut = x0 + target, low = Infinity
    for (let x = x0 + Math.round(target * 0.8); x < Math.min(g.w - 1, x0 + target); x++) if (p[x] < low) { low = p[x]; cut = x }
    out.push(crop(g, x0, cut))
    x0 = cut
  }
  out.push(crop(g, x0, g.w))
  return out
}
function crop(g: Gray, x0: number, x1: number): Gray {
  const w = x1 - x0
  const px = new Float32Array(w * g.h)
  for (let y = 0; y < g.h; y++) px.set(g.px.subarray(y * g.w + x0, y * g.w + x1), y * w)
  return { w, h: g.h, px }
}

/** Screenshots → pieces for the AI: each staff cropped and enhanced (or the box you set, or the whole picture). */
export function piecesFromPictures(pics: Src[], userBox?: Box | null): { pieces: Piece[]; found: number } {
  const pieces: Piece[] = []
  let found = 0
  for (const p of pics) {
    const { w, h } = sizeOf(p)
    const { g, scale } = grayAt(p, 1000, userBox ?? undefined)
    const strips = findStrips(g)
    if (strips.length) {
      found += strips.length
      for (const s of strips) {
        const gap = (s.lines[s.lines.length - 1] - s.lines[0]) / (s.lines.length - 1) / scale
        const ox = userBox ? userBox.x * w : 0, oy = userBox ? userBox.y * h : 0
        const box = { x: (ox + s.left / scale) / w, y: (oy + s.top / scale) / h, w: (s.right - s.left) / scale / w, h: (s.bottom - s.top) / scale / h }
        for (const part of cutWide(enhance(p, box, gap))) pieces.push(pieceOf(part))
      }
    } else for (const part of cutWide(enhance(p, userBox ?? null), 3)) pieces.push(pieceOf(part))
  }
  return { pieces, found }
}

// ---------------- video files ----------------

/** Seek a video and wait until that frame is shown. */
function seek(v: HTMLVideoElement, t: number) {
  return new Promise<void>(res => {
    const done = () => { v.removeEventListener('seeked', done); res() }
    v.addEventListener('seeked', done)
    v.currentTime = Math.min(Math.max(0, t), Math.max(0, v.duration - 0.05))
    setTimeout(done, 1500)
  })
}

export interface VideoTab { pieces: Piece[]; frames: number; kept: number; scrolled: boolean; box: Box | null; /** each tab strip whole (before it's cut into pieces for the AI): for KGuitar's own reader */ strips: Gray[]; trace?: string[]; /** per strip: playhead x → seconds (see Stitcher.timelines) */ timelines?: { x: number; t: number }[][] }

/**
 * Frames in, tab strips out, one frame at a time (a long screen grab never keeps more than a handful of frames): the tab
 * area is found on the first frames that have staff lines; a scrolling tab is followed and the new part stitched on;
 * anything else (a page turn) starts a new strip. Every frame of a strip is kept in its place and the strip is made from
 * the MIDDLE value of each pixel across them: a playhead, a highlight box or a bouncing ball is only in a few frames at
 * any one spot, so it disappears, and the numbers (in every frame) stay.
 */
export class Stitcher {
  box: Box | null
  private gap = 0
  private prev: Gray | null = null
  private prevProf: Float32Array | null = null
  /** the current strip: frames at their place across it */
  private layers: { x0: number; g: Gray }[] = []
  private at = 0
  private width = 0
  private out: Piece[] = []
  /** the strips whole, before cutting (bar lines stay where they are) */
  strips: Gray[] = []
  frames = 0
  kept = 0
  scrolled = false
  /** for each strip: when the playhead was over which point of it (strip x, seconds into the video), from the frames
   *  whose time was given. Lets the sound be checked against each column (the audio referee). */
  timelines: { x: number; t: number }[][] = []
  private timeline: { x: number; t: number }[] = []
  /** what the scroll tracking saw at each frame (shift:match, or x for none): for tests */
  trace: string[] = []
  private shifts: number[] = []
  /** frames looked at while still searching for the tab */
  private searched = 0
  constructor(box: Box | null = null) { this.box = box }
  /** still looking for where the tab is */
  get searching() { return !this.box }
  add(src: Src, t?: number) {
    this.frames++
    if (!this.box) {
      // look for staff lines (on every frame until found, but give up after 60 tries: then read whole frames)
      this.searched++
      const { w, h } = sizeOf(src)
      const { g, scale } = grayAt(src, 1000)
      const s = findStrips(g)
      if (s.length) {
        this.gap = (s[0].lines[s[0].lines.length - 1] - s[0].lines[0]) / (s[0].lines.length - 1) / scale
        // room above (pick strokes, words) and below (the rhythm: stems, beams, tuplet 3s) the staff
        const b = unionBox(s.map(x => toBox(x, scale, w, h)))!
        const up = (this.gap * 2) / h, down = (this.gap * 3.5) / h
        const y0 = Math.max(0, b.y - up), y1 = Math.min(1, b.y + b.h + down)
        this.box = { ...b, y: y0, h: y1 - y0 }
      } else if (this.searched < 60) return
      else this.box = { x: 0, y: 0, w: 1, h: 1 }
    }
    this.addGray(enhance(src, this.box, this.gap || undefined), t)
  }
  /** a frame already cut to the tab box and cleaned up (enhance): follow it into the strips (also for tests) */
  addGray(g: Gray, t?: number) {
    // a blank frame (a video still decoding after a jump, a fade to black): nothing to stack; it would wipe the tab out
    let ink = 0
    for (let i = 0; i < g.px.length; i += 5) if (g.px[i] < 0.5) ink++
    if (ink < g.px.length / 5 * 0.004) return
    const mark = () => { if (t === undefined) return; const p = playheadX(g); if (p !== null) this.timeline.push({ x: this.at + p, t }) }
    // (a "nearly the same" frame still has its shift measured: a sparse tab scrolling a little changes few pixels, and
    // stacking it in the old place would smear the numbers away)
    const prof = profile(g)
    let sh = this.prev && this.prevProf && this.layers.length ? shiftBetween(this.prevProf, prof) : null
    // a tab scrolling at a steady speed moves the same amount between frames: when the last few shifts agree and this
    // frame's best guess is missing or different, the steady shift is used if it still fits reasonably (small, blurry tabs
    // match less sharply)
    const recent = this.shifts.slice(-3)
    const steady = recent.length === 3 && recent.every(d => Math.abs(d - recent[0]) <= 3) ? Math.round(recent.reduce((a, b) => a + b, 0) / 3) : 0
    if (steady && this.prevProf && this.layers.length && (!sh || Math.abs(sh.dx - steady) > 3)) {
      const m = matchAt(this.prevProf, prof, steady)
      // (a "didn't move" that isn't nearly identical, in the middle of a steady scroll, is something on the screen that
      // stays put, not the tab stopping)
      // (only when this frame's own answer is weak: a clear match at another shift is the truth, e.g. a choppy recording
      // that skipped frames)
      if (m > 0.3 && (!sh || (sh.dx === 0 && sh.match < 0.9) || (sh.match < 0.8 && m > sh.match - 0.2))) sh = { dx: steady, match: m }
    }
    this.trace.push(sh ? `${sh.dx}:${sh.match.toFixed(2)}` : 'x')
    // a big jump that matches only loosely is a new page whose music looks like the last one (a repeated riff), not a
    // scroll (a choppy recording can jump far, but then the overlap matches almost exactly)
    if (sh && sh.dx > g.w * 0.35 && sh.match < 0.9) sh = null
    // not moved at all: the same page only if it's nearly identical (a playhead moved over it); a new page with the same
    // riff in the same places matches less well
    if (sh && sh.dx === 0 && sh.match < 0.97 && this.prev && pageDiff(this.prev, g) > 0.02) sh = null
    if (sh && sh.dx > 0) {
      // scrolled sideways: this frame sits further along the strip
      this.scrolled = true
      this.at += sh.dx
      this.shifts.push(sh.dx)
      this.stack(g)
    } else if (sh) this.stack(g) // the same page, something moved on it (a playhead)
    else {
      // a new page (or the first): keep what we had, start again
      this.flush()
      this.at = 0
      this.shifts = []
      this.stack(g)
    }
    mark()
    this.kept++
    this.prev = g; this.prevProf = prof
  }
  /** keep a frame at the current place (at most 7 at any one place: the oldest goes). Columns no later frame can reach
   *  (left of where the newest frame starts: a tab only scrolls one way) are finished, and frames wholly left of it let go */
  private stack(g: Gray) {
    if (this.layers.length && this.layers[0].g.h !== g.h) return
    const here = this.layers.filter(l => l.x0 === this.at)
    if (here.length >= 7) this.layers.splice(this.layers.indexOf(here[0]), 1)
    this.layers.push({ x0: this.at, g })
    this.width = Math.max(this.width, this.at + g.w)
    if (this.at > this.doneW) {
      this.append(this.compose(this.doneW, this.at))
      this.layers = this.layers.filter(l => l.x0 + l.g.w > this.at)
    }
  }
  /** finished columns of the current strip */
  private done: Gray | null = null
  private doneW = 0
  private append(part: Gray) {
    const d = this.done
    if (!d) { this.done = part; this.doneW = part.w; return }
    const w = d.w + part.w, px = new Float32Array(w * d.h)
    for (let y = 0; y < d.h; y++) { px.set(d.px.subarray(y * d.w, (y + 1) * d.w), y * w); px.set(part.px.subarray(y * part.w, (y + 1) * part.w), y * w + d.w) }
    this.done = { w, h: d.h, px }
    this.doneW = w
  }
  /** columns x0…x1 of the strip from its frames: each pixel's middle value */
  private compose(x0: number, x1: number): Gray {
    const h = this.layers[0].g.h, w = Math.max(0, x1 - x0)
    const px = new Float32Array(w * h).fill(1)
    const vals: number[] = []
    for (let x = x0; x < x1; x++) {
      const on = this.layers.filter(l => x >= l.x0 && x < l.x0 + l.g.w)
      if (!on.length) continue
      const last = on[on.length - 1]
      for (let y = 0; y < h; y++) {
        // one or two frames: the newer; three or more: the middle one
        if (on.length < 3) { px[y * w + x - x0] = last.g.px[y * last.g.w + (x - last.x0)]; continue }
        vals.length = 0
        for (const l of on) vals.push(l.g.px[y * l.g.w + (x - l.x0)])
        vals.sort((a, b) => a - b)
        px[y * w + x - x0] = vals[(vals.length - 1) >> 1]
      }
    }
    return { w, h, px }
  }
  private flush() {
    if (this.layers.length) this.append(this.compose(this.doneW, this.width))
    const pano = this.done
    this.layers = []; this.width = 0; this.done = null; this.doneW = 0
    const tl = this.timeline
    this.timeline = []
    if (pano) { this.strips.push(pano); this.timelines.push(tl); for (const part of cutWide(pano)) this.out.push(pieceOf(part)) }
  }
  finish(): Piece[] { this.flush(); return this.out }
}

/** How different two frames of the same size are, leaving out a playhead (columns dark from top to bottom in either):
 *  the share of pixels that changed clearly. A page with a playhead moving over it stays under ~1%; a new page, even of
 *  the same riff, changes many of its numbers. */
function pageDiff(a: Gray, b: Gray): number {
  if (a.w !== b.w || a.h !== b.h) return 1
  const skip = new Uint8Array(a.w)
  for (let x = 0; x < a.w; x++) {
    let da = 0, db = 0
    for (let y = 0; y < a.h; y += 2) { if (a.px[y * a.w + x] < 0.5) da++; if (b.px[y * a.w + x] < 0.5) db++ }
    if (da > a.h * 0.4 || db > a.h * 0.4) { skip[x] = 1; if (x > 0) skip[x - 1] = 1 }
  }
  let n = 0, d = 0
  for (let y = 0; y < a.h; y += 2) for (let x = 0; x < a.w; x += 2) {
    if (skip[x]) continue
    n++
    if (Math.abs(a.px[y * a.w + x] - b.px[y * a.w + x]) > 0.35) d++
  }
  return d / Math.max(1, n)
}

/** A video file (a lesson download, a Samsung screen recording) → tab strips, a frame every `every` seconds. */
export async function tabFromVideo(file: Blob, o: { every?: number; from?: number; to?: number; box?: Box | null; onProgress?: (f: number, note: string) => void; signal?: AbortSignal } = {}): Promise<VideoTab> {
  const url = URL.createObjectURL(file)
  const v = document.createElement('video')
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url
  try {
    await new Promise<void>((res, rej) => { v.onloadeddata = () => res(); v.onerror = () => rej(new Error("That video couldn't be opened here: try an MP4 from the phone's screen recorder.")) })
    const dur = v.duration
    const from = o.from ?? 0, to = Math.min(dur, o.to ?? dur)
    const every = o.every ?? Math.max(0.5, Math.min(1.5, (to - from) / 240))
    const st = new Stitcher(o.box ?? null)
    for (let t = from; t <= to; t += every) {
      if (o.signal?.aborted) throw new Error('Cancelled.')
      await seek(v, t)
      o.onProgress?.((t - from) / Math.max(0.001, to - from), `${Math.round(t)} s of ${Math.round(to)} s`)
      st.add(v, t)
    }
    const pieces = st.finish()
    return { pieces, frames: st.frames, kept: st.kept, scrolled: st.scrolled, box: st.box, strips: st.strips, timelines: st.timelines, trace: st.trace }
  } finally {
    v.removeAttribute('src'); v.load()
    URL.revokeObjectURL(url)
  }
}

/** The sound of an audio or video file, mono, at most `maxSec` long. */
export async function soundOf(file: Blob, ctx: BaseAudioContext, maxSec = 240): Promise<{ x: Float32Array; sr: number } | null> {
  try {
    const buf = await ctx.decodeAudioData(await file.arrayBuffer())
    const n = Math.min(buf.length, Math.round(buf.sampleRate * maxSec))
    const x = new Float32Array(n)
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) x[i] += d[i] / buf.numberOfChannels }
    return { x, sr: buf.sampleRate }
  } catch { return null }
}
