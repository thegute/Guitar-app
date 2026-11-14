// Making small video tabs readable before the AI sees them (pure maths on grey pixels, so it's testable):
//   findStrips   where the tab staves are: groups of 4–7 long, evenly spaced horizontal lines
//   stretchContrast + sharpen   high-contrast grey with crisp digit edges (unsharp mask)
//   profile / shiftBetween      how far a scrolling tab moved between two frames (for stitching a panorama)
//   sameFrame                   skip frames where nothing changed
export interface Gray { w: number; h: number; px: Float32Array /* 0 black … 1 white */ }

export interface Strip { top: number; bottom: number; left: number; right: number; lines: number[] }

/** RGBA bytes → grey 0..1. */
export function toGray(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number): Gray {
  const px = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) px[i] = (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) / 255
  return { w, h, px }
}

/** A photo taken a little crooked: the angle (as a slope, rise per pixel across) that lines the staff lines up with the
 *  rows best, and the picture sheared straight. Small angles only (±4°); a flat scan comes back as it was. */
export function deskew(g: Gray): { g: Gray; slope: number } {
  const { w, h, px } = g
  // dark pixels (a sample of them is enough to find the angle)
  const pts: number[] = []
  const step = Math.max(1, Math.round(Math.sqrt((w * h) / 250000)))
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) if (px[y * w + x] < 0.5) pts.push(x, y)
  const score = (slope: number) => {
    const rows = new Float32Array(h + 2)
    for (let i = 0; i < pts.length; i += 2) {
      const y = pts[i + 1] - pts[i] * slope
      if (y >= 0 && y < h) rows[Math.round(y)]++
    }
    let s2 = 0
    for (const r of rows) s2 += r * r
    return s2
  }
  let best = 0, bs = score(0)
  for (let a = -4; a <= 4; a += 0.25) { const sl = Math.tan((a * Math.PI) / 180); const v = score(sl); if (v > bs) { bs = v; best = sl } }
  const c = best
  for (let d = -0.2; d <= 0.2; d += 0.025) { const sl = Math.tan(Math.atan(c) + (d * Math.PI) / 180); const v = score(sl); if (v > bs) { bs = v; best = sl } }
  if (Math.abs(best) * w < 1) return { g, slope: 0 }
  // shear each column back so the lines run level
  const out = new Float32Array(w * h).fill(1)
  for (let x = 0; x < w; x++) {
    const dy = x * best
    for (let y = 0; y < h; y++) {
      const sy = y + dy
      const y0 = Math.floor(sy), f = sy - y0
      if (y0 < 0 || y0 + 1 >= h) continue
      out[y * w + x] = px[y0 * w + x] * (1 - f) + px[(y0 + 1) * w + x] * f
    }
  }
  return { g: { w, h, px: out }, slope: best }
}

/** Is the picture mostly dark (white lines on black, like many video tabs)? */
export function isDark(g: Gray) {
  let s = 0
  for (let i = 0; i < g.px.length; i += 7) s += g.px[i]
  return s / Math.ceil(g.px.length / 7) < 0.45
}

/**
 * Tab staves: rows where a long stretch differs from the rows just above and below in the same direction (a thin
 * line), grouped into 4–7 lines with even spacing. Returns each staff's box, with room above for chord names and
 * below for rhythm marks.
 */
export function findStrips(g: Gray, strings = [6, 4]): Strip[] {
  const { w, h, px } = g
  const dark = isDark(g)
  // a pixel is "line" when it is darker (or lighter, on a dark picture) than 2 px above and below
  const lineRow = new Float32Array(h)
  const spanL = new Int32Array(h), spanR = new Int32Array(h)
  for (let y = 2; y < h - 2; y++) {
    let run = 0, best = 0, bestEnd = 0, count = 0
    for (let x = 0; x < w; x++) {
      const v = px[y * w + x], a = px[(y - 2) * w + x], b = px[(y + 2) * w + x]
      const on = dark ? v - Math.max(a, b) > 0.08 : Math.min(a, b) - v > 0.08
      if (on) { run++; count++; if (run > best) { best = run; bestEnd = x } } else if (run > 0 && x + 1 < w) {
        // a digit sitting on the line breaks it for a few pixels: bridge small gaps
        const look = Math.min(w - 1, x + Math.max(4, Math.round(w * 0.03)))
        let gap = true
        for (let k = x + 1; k <= look; k++) { const vv = px[y * w + k], aa = px[(y - 2) * w + k], bb = px[(y + 2) * w + k]; if (dark ? vv - Math.max(aa, bb) > 0.08 : Math.min(aa, bb) - vv > 0.08) { gap = false; break } }
        if (gap) run = 0
      }
    }
    lineRow[y] = best / w
    spanL[y] = bestEnd - best + 1
    spanR[y] = bestEnd
    void count
  }
  // candidate line rows: long runs, keep the strongest row of each thick line
  const cand: number[] = []
  for (let y = 2; y < h - 2; y++) {
    if (lineRow[y] < 0.35) continue
    if (cand.length && y - cand[cand.length - 1] <= 2) { if (lineRow[y] > lineRow[cand[cand.length - 1]]) cand[cand.length - 1] = y; continue }
    cand.push(y)
  }
  const out: Strip[] = []
  const used = new Set<number>()
  for (let i = 0; i < cand.length; i++) {
    if (used.has(i)) continue
    for (const n of strings) {
      // n lines from i with near-equal gaps
      if (i + n - 1 >= cand.length) continue
      const ys = cand.slice(i, i + n)
      const gaps = ys.slice(1).map((y, k) => y - ys[k])
      const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length
      if (mean < 4 || gaps.some(d => Math.abs(d - mean) > Math.max(1.5, mean * 0.18))) continue
      // the next line (if any) isn't part of this staff
      const left = Math.min(...ys.map(y => spanL[y])), right = Math.max(...ys.map(y => spanR[y]))
      out.push({ top: Math.max(0, Math.round(ys[0] - mean * 2.6)), bottom: Math.min(h - 1, Math.round(ys[n - 1] + mean * 1.8)), left: Math.max(0, left - Math.round(mean * 2)), right: Math.min(w - 1, right + Math.round(mean)), lines: ys })
      for (let k = i; k < i + n; k++) used.add(k)
      break
    }
  }
  return out
}

/** Stretch the grey levels so the 2nd percentile is black and the 98th white (dark pictures are flipped to black on white). */
export function stretchContrast(g: Gray): Gray {
  const hist = new Uint32Array(256)
  for (let i = 0; i < g.px.length; i++) hist[Math.max(0, Math.min(255, Math.round(g.px[i] * 255)))]++
  const n = g.px.length
  let lo = 0, hi = 255, acc = 0
  for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= n * 0.02) { lo = i; break } }
  acc = 0
  for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= n * 0.02) { hi = i; break } }
  const span = Math.max(1, hi - lo) / 255, base = lo / 255
  const flip = isDark(g)
  const px = new Float32Array(n)
  for (let i = 0; i < n; i++) { const v = Math.max(0, Math.min(1, (g.px[i] - base) / span)); px[i] = flip ? 1 - v : v }
  return { w: g.w, h: g.h, px }
}

/** Unsharp mask with a 3×3 kernel: crisp edges on the digits against the string lines. */
export function sharpen(g: Gray, amount = 1): Gray {
  const { w, h } = g
  const px = new Float32Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) { px[i] = g.px[i]; continue }
    const blur = (g.px[i - w - 1] + 2 * g.px[i - w] + g.px[i - w + 1] + 2 * g.px[i - 1] + 4 * g.px[i] + 2 * g.px[i + 1] + g.px[i + w - 1] + 2 * g.px[i + w] + g.px[i + w + 1]) / 16
    px[i] = Math.max(0, Math.min(1, g.px[i] + amount * (g.px[i] - blur)))
  }
  return { w, h, px }
}

/** Darkness per column (what scrolls sideways in a scrolling tab). */
export function profile(g: Gray): Float32Array {
  const p = new Float32Array(g.w)
  for (let x = 0; x < g.w; x++) { let s = 0; for (let y = 0; y < g.h; y++) s += 1 - g.px[y * g.w + x]; p[x] = s / g.h }
  // take away each column's average over a wide window, so only the notes are left (not the lines or the background)
  const out = new Float32Array(g.w)
  const r = 12
  for (let x = 0; x < g.w; x++) { let s = 0, k = 0; for (let j = Math.max(0, x - r); j <= Math.min(g.w - 1, x + r); j++) { s += p[j]; k++ } out[x] = p[x] - s / k }
  return out
}

/**
 * How many pixels the tab moved left from frame a to frame b (0 = didn't move; null = it changed some other way,
 * like a page turn). Matches b's columns against a's shifted by every amount up to maxShift.
 */
export function shiftBetween(a: Float32Array, b: Float32Array, maxShift = Math.round(a.length * 0.7)): { dx: number; match: number } | null {
  const n = Math.min(a.length, b.length)
  let best = { dx: 0, match: -Infinity }
  for (let dx = 0; dx <= maxShift; dx++) {
    const len = n - dx
    if (len < n * 0.25) break
    let s = 0, na = 0, nb = 0
    for (let x = 0; x < len; x++) { const va = a[x + dx], vb = b[x]; s += va * vb; na += va * va; nb += vb * vb }
    const m = s / Math.sqrt(na * nb + 1e-12)
    if (m > best.match + 1e-4) best = { dx, match: m }
  }
  return best.match > 0.6 ? best : null
}

/** Nothing changed between two frames (same size): mean absolute difference under 2%. */
export function sameFrame(a: Gray, b: Gray): boolean {
  if (a.w !== b.w || a.h !== b.h) return false
  let d = 0
  const step = 3
  for (let i = 0; i < a.px.length; i += step) d += Math.abs(a.px[i] - b.px[i])
  return d / Math.ceil(a.px.length / step) < 0.02
}
