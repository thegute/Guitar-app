// Pictures → clean, large tab strips for the AI (runs in the page with <canvas>):
//   screenshots: find the tab staves, crop to them (or to the box you dragged), scale 2–3× smoothly, grey, stretch
//   the contrast (dark video tabs come out black on white), sharpen; very wide strips are cut between notes
//   video files (and Samsung screen recordings): sample frames, skip ones where nothing changed, follow a scrolling tab
//   sideways and stitch the new part onto a panorama; a page turn starts a new strip
import { findStrips, profile, sameFrame, sharpen, shiftBetween, stretchContrast, toGray, type Gray, type Strip } from './image'

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

export interface VideoTab { pieces: Piece[]; frames: number; kept: number; scrolled: boolean; box: Box | null }

/**
 * A video file (a lesson download, a Samsung screen recording) → tab strips: frames every `every` seconds; the tab
 * area is found on the first frames that have one; static frames are skipped; a scrolling tab is followed and
 * stitched; anything else (a page turn) starts a new strip.
 */
export async function tabFromVideo(file: Blob, o: { every?: number; from?: number; to?: number; box?: Box | null; onProgress?: (f: number, note: string) => void; signal?: AbortSignal } = {}): Promise<VideoTab> {
  const url = URL.createObjectURL(file)
  const v = document.createElement('video')
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url
  try {
    await new Promise<void>((res, rej) => { v.onloadeddata = () => res(); v.onerror = () => rej(new Error("That video couldn't be opened here: try an MP4 from the phone's screen recorder.")) })
    const dur = v.duration
    const from = o.from ?? 0, to = Math.min(dur, o.to ?? dur)
    const every = o.every ?? Math.max(0.5, Math.min(1.5, (to - from) / 240))
    // find the tab area on the first frames that have staff lines
    let box = o.box ?? null, gap = 0
    for (let t = from; !box && t < Math.min(to, from + 40); t += 2) {
      if (o.signal?.aborted) throw new Error('Cancelled.')
      await seek(v, t)
      const { g, scale } = grayAt(v, 1000)
      const s = findStrips(g)
      if (s.length) {
        box = unionBox(s.map(x => toBox(x, scale, v.videoWidth, v.videoHeight)))
        gap = (s[0].lines[s[0].lines.length - 1] - s[0].lines[0]) / (s[0].lines.length - 1) / scale
      }
    }
    const pieces: Piece[] = []
    let frames = 0, kept = 0, scrolled = false
    let prev: Gray | null = null, prevProf: Float32Array | null = null
    let pano: Gray | null = null
    const flush = () => { if (pano) for (const part of cutWide(pano)) pieces.push(pieceOf(part)); pano = null }
    for (let t = from; t <= to; t += every) {
      if (o.signal?.aborted) throw new Error('Cancelled.')
      await seek(v, t)
      frames++
      o.onProgress?.((t - from) / Math.max(0.001, to - from), `${Math.round(t)} s of ${Math.round(to)} s`)
      const g = enhance(v, box, gap || undefined)
      if (prev && sameFrame(prev, g)) continue
      const prof = profile(g)
      const sh = prev && prevProf ? shiftBetween(prevProf, prof) : null
      if (pano && sh && sh.dx > 0) {
        // scrolled sideways: add the new columns on the right
        scrolled = true
        const add = sh.dx
        const P: Gray = pano
        const w = P.w + add
        const px = new Float32Array(w * g.h)
        for (let y = 0; y < g.h; y++) { px.set(P.px.subarray(y * P.w, (y + 1) * P.w), y * w); px.set(g.px.subarray(y * g.w + g.w - add, (y + 1) * g.w), y * w + P.w) }
        pano = { w, h: g.h, px }
      } else if (!pano || !sh) {
        // a new page (or the first): keep what we had, start again
        flush()
        pano = g
      }
      kept++
      prev = g; prevProf = prof
    }
    flush()
    return { pieces, frames, kept, scrolled, box }
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
