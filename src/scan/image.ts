// Making small video tabs readable before the AI sees them (pure maths on grey pixels, so it's testable):
//   findStrips   where the tab staves are: groups of 4–7 long, evenly spaced horizontal lines
//   stretchContrast + sharpen   high-contrast grey with crisp digit edges (unsharp mask)
//   profile / shiftBetween      how far a scrolling tab moved between two frames (for stitching a panorama)
//   sameFrame                   skip frames where nothing changed
export interface Gray {
  w: number
  h: number
  px: Float32Array /* 0 black … 1 white */
  /** Per-column chromaticity (0..1, fraction of rows with RGB saturation) to catch colored playheads/cursors. */
  chroma?: Float32Array
}

export interface Strip { top: number; bottom: number; left: number; right: number; lines: number[] }

/** RGBA bytes → grey 0..1 (plus per-column chromaticity for colored playhead detection). */
export function toGray(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number): Gray {
  const px = new Float32Array(w * h)
  const chroma = new Float32Array(w)
  const y0 = Math.floor(h * 0.12), y1 = Math.ceil(h * 0.85), span = Math.max(1, y1 - y0)
  for (let y = 0; y < h; y++) {
    const inBand = y >= y0 && y < y1
    for (let x = 0; x < w; x++) {
      const i = y * w + x, k = i * 4
      const r = rgba[k], g = rgba[k + 1], b = rgba[k + 2]
      px[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      if (inBand) {
        const mx = r > g ? (r > b ? r : b) : (g > b ? g : b)
        const mn = r < g ? (r < b ? r : b) : (g < b ? g : b)
        if (mx - mn >= 42 && mx >= 60) chroma[x] += 1 / span
      }
    }
  }
  return { w, h, px, chroma }
}

/** A photo taken a little crooked: the angle (as a slope, rise per pixel across) that lines the staff lines up with the
 *  rows best, and the picture sheared straight. Small angles only (±4°); a flat scan comes back as it was. */
export function deskew(g: Gray): { g: Gray; slope: number } {
  const { w, h, px } = g
  // dark pixels (a sample of them is enough to find the angle)
  const pts: number[] = []
  const step = Math.max(1, Math.round(Math.sqrt((w * h) / 250000)))
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) if (px[y * w + x] < 0.8) pts.push(x, y) // blurred thin lines are only grey
  const score = (slope: number) => {
    // rows binned as wide as the sampling step (else a level line wins just because only every step-th row has points)
    const rows = new Float32Array(Math.ceil(h / step) + 2)
    for (let i = 0; i < pts.length; i += 2) {
      const y = pts[i + 1] - pts[i] * slope
      if (y >= 0 && y < h) rows[Math.round(y / step)]++
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
  return { g: { w, h, px: out, chroma: g.chroma }, slope: best }
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
  // a video frame is often mostly dark (the player, the room) with a white tab strip in it: try the other way round too
  const d = isDark(g)
  const first = stripsOf(g, strings, d)
  return first.length ? first : stripsOf(g, strings, !d)
}

/** The picture with its tab as dark ink on a light ground: turned round only when the tab itself is light on dark
 *  (a dark-mode screenshot), not when a dark video frame has a white tab strip in it. */
export function inkDark(g: Gray): Gray {
  if (stripsOf(g, [6, 4], false).length) return g
  if (stripsOf(g, [6, 4], true).length || isDark(g)) return { w: g.w, h: g.h, px: g.px.map(v => 1 - v), chroma: g.chroma }
  return g
}

function stripsOf(g: Gray, strings: number[], dark: boolean): Strip[] {
  const { w, h, px } = g
  // a pixel is "line" when it is darker (or lighter, on a dark picture) than 1–4 px above and below
  const lineRow = new Float32Array(h)
  const spanL = new Int32Array(h), spanR = new Int32Array(h)
  // (a thin line in a small video needs d=1..2; a thick line blown up from a small video needs d=3..4)
  const lineAt = (x: number, y: number) => {
    const v = px[y * w + x]
    for (const d of [1, 2, 3, 4]) {
      if (y - d < 0 || y + d >= h) continue
      const a = px[(y - d) * w + x], b = px[(y + d) * w + x]
      if (dark ? v - Math.max(a, b) > 0.08 : Math.min(a, b) - v > 0.08) return true
    }
    return false
  }
  for (let y = 2; y < h - 2; y++) {
    let run = 0, best = 0, bestEnd = 0, count = 0
    for (let x = 0; x < w; x++) {
      const on = lineAt(x, y)
      if (on) { run++; count++; if (run > best) { best = run; bestEnd = x } } else if (run > 0 && x + 1 < w) {
        // a digit sitting on the line breaks it for a few pixels: bridge small gaps
        const look = Math.min(w - 1, x + Math.max(4, Math.round(w * 0.03)))
        let gap = true
        for (let k = x + 1; k <= look; k++) if (lineAt(k, y)) { gap = false; break }
        if (gap) run = 0
      }
    }
    // a top line crowded with two-digit numbers ("—11—12—14—12—") breaks into short runs: the row's total line pixels
    // count too (a little less than one unbroken run)
    lineRow[y] = Math.max(best, count * 0.85) / w
    spanL[y] = bestEnd - best + 1
    spanR[y] = bestEnd
  }
  // candidate line rows: long runs, keep the strongest row of each thick line
  const cand: number[] = []
  for (let y = 2; y < h - 2; y++) {
    if (lineRow[y] < 0.35) continue
    if (cand.length && y - cand[cand.length - 1] <= 4) { if (lineRow[y] > lineRow[cand[cand.length - 1]]) cand[cand.length - 1] = y; continue }
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
  if (out.length) return out

  // Comb-filter recovery for compressed video frames where 1–2 interior string lines faded below 0.35 (e.g. H.264 wash-out
  // on B/D strings in a Short or translucent tab overlay), while 4–5 lines sit on a strict even grid:
  const softCand: number[] = []
  for (let y = 2; y < h - 2; y++) {
    if (lineRow[y] < 0.16) continue
    if (softCand.length && y - softCand[softCand.length - 1] <= 3) {
      if (lineRow[y] > lineRow[softCand[softCand.length - 1]]) softCand[softCand.length - 1] = y
      continue
    }
    softCand.push(y)
  }
  if (softCand.length < 4) return out

  for (const n of strings) {
    if (n < 4) continue
    let bestComb: { score: number; ys: number[]; mean: number } | null = null
    for (let a = 0; a < softCand.length; a++) {
      for (let b = a + 1; b < softCand.length; b++) {
        const span = softCand[b] - softCand[a]
        for (let div = 1; div < n; div++) {
          const gap = span / div
          if (gap < 4 || gap > Math.min(64, (h - 4) / (n - 1))) continue
          const snapTol = gap >= 10 ? 2 : 1
          for (let s0 = 0; s0 < n - div; s0++) {
            const yTop = softCand[a] - s0 * gap
            const yBot = yTop + (n - 1) * gap
            if (yTop < 2 || yBot >= h - 2) continue
            const ys: number[] = []
            let strong = 0, faint = 0, onSum = 0
            for (let s = 0; s < n; s++) {
              const yEst = Math.round(yTop + s * gap)
              let by = yEst, bv = lineRow[yEst]
              for (let dy = -snapTol; dy <= snapTol; dy++) {
                const yy = yEst + dy
                if (yy >= 2 && yy < h - 2 && lineRow[yy] > bv) { bv = lineRow[yy]; by = yy }
              }
              ys.push(by)
              onSum += bv
              if (bv >= 0.28) strong++
              if (bv >= 0.09) faint++
            }
            if (strong < Math.max(4, n - 2) || faint < n - 1) continue
            const gaps = ys.slice(1).map((y, k) => y - ys[k])
            const mean = gaps.reduce((p, q) => p + q, 0) / gaps.length
            if (gaps.some(d => Math.abs(d - mean) > Math.max(1.5, mean * 0.18))) continue
            // Midpoints between strings must be clearly weaker than the string lines themselves (rules out solid textures)
            let offSum = 0
            for (let s = 0; s < n - 1; s++) {
              const my = Math.round((ys[s] + ys[s + 1]) / 2)
              offSum += lineRow[my]
            }
            const onMean = onSum / n, offMean = offSum / (n - 1)
            if (onMean < 0.28 || onMean - offMean < 0.17) continue
            // Don't match a 4-string subset inside a 6-string staff
            const yAbove = Math.round(ys[0] - mean), yBelow = Math.round(ys[n - 1] + mean)
            if ((yAbove >= 2 && lineRow[yAbove] > onMean * 0.75) || (yBelow < h - 2 && lineRow[yBelow] > onMean * 0.75)) continue
            const score = onMean - offMean * 0.6 + strong * 0.05
            if (!bestComb || score > bestComb.score) bestComb = { score, ys, mean }
          }
        }
      }
    }
    if (bestComb) {
      const { ys, mean } = bestComb
      const strongYs = ys.filter(y => lineRow[y] >= 0.25)
      const left = Math.min(...(strongYs.length ? strongYs : ys).map(y => spanL[y]))
      const right = Math.max(...(strongYs.length ? strongYs : ys).map(y => spanR[y]))
      out.push({
        top: Math.max(0, Math.round(ys[0] - mean * 2.6)),
        bottom: Math.min(h - 1, Math.round(ys[n - 1] + mean * 1.8)),
        left: Math.max(0, left - Math.round(mean * 2)),
        right: Math.min(w - 1, right + Math.round(mean)),
        lines: ys,
      })
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
  return { w: g.w, h: g.h, px, chroma: g.chroma }
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
  return { w, h, px, chroma: g.chroma }
}

/** Darkness per column (what scrolls sideways in a scrolling tab). */
export function profile(g: Gray): Float32Array {
  const p = new Float32Array(g.w)
  const ph = playheadX(g)
  for (let x = 0; x < g.w; x++) {
    let s = 0, dark = 0
    for (let y = 0; y < g.h; y++) { const v = g.px[y * g.w + x]; s += 1 - v; if (v < 0.5) dark++ }
    // a line from top to bottom of the box (or a colored playhead) stays put while the tab moves: leave it out
    const isPh = dark > g.h * 0.8 || (ph !== null && Math.abs(x - ph) <= 8) || (g.chroma ? g.chroma[x] > 0.3 : false)
    p[x] = isPh ? -1 : s / g.h
  }
  for (let x = 0; x < g.w; x++) if (p[x] < 0) { let a = x; while (a > 0 && p[a] < 0) a--; let b = x; while (b < g.w - 1 && p[b] < 0) b++; p[x] = Math.max(0, ((p[a] < 0 ? 0 : p[a]) + (p[b] < 0 ? 0 : p[b])) / 2) }
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

/** A video's playhead in a tab frame:
 *  1) A narrow colored cursor/highlight bar (RGB chroma spike across the staff rows),
 *  2) A narrow dark vertical line from top to bottom of the box (or across the central staff band),
 *  3) When `prev` is given for a static card (`dx === 0`), a narrow vertical band that moved onto column x.
 */
export function playheadX(g: Gray, prev?: Gray): number | null {
  const maxW = Math.max(10, g.w * 0.012)
  // 1. Classic full-height dark line (checked first for exact compatibility)
  const runs: [number, number][] = []
  let start = -1
  for (let x = 0; x <= g.w; x++) {
    let dark = 0
    if (x < g.w) for (let y = 0; y < g.h; y++) if (g.px[y * g.w + x] < 0.5) dark++
    const on = x < g.w && dark > g.h * 0.8
    if (on && start >= 0) { /* keep going */ }
    else if (on && start < 0) start = x
    else if (!on && start >= 0) { runs.push([start, x - 1]); start = -1 }
  }
  const narrow = runs.filter(([a, b]) => b - a < maxW)
  if (narrow.length === 1) return (narrow[0][0] + narrow[0][1]) / 2

  // 2. Colored playhead / highlight bar (Songsterr green/blue cursor, red/orange/cyan line)
  if (g.chroma) {
    const sorted = Float32Array.from(g.chroma).sort()
    const med = sorted[g.w >> 1] ?? 0
    const thr = Math.max(0.25, med + 0.18)
    const cRuns: [number, number, number][] = []
    let cs = -1, cPeak = 0
    for (let x = 0; x <= g.w; x++) {
      const v = x < g.w ? g.chroma[x] : 0
      if (v >= thr) {
        if (cs < 0) { cs = x; cPeak = v } else if (v > cPeak) cPeak = v
      } else if (cs >= 0) {
        cRuns.push([cs, x - 1, cPeak])
        cs = -1; cPeak = 0
      }
    }
    const maxColorW = Math.max(24, g.w * 0.04)
    const validC = cRuns.filter(([a, b]) => b - a <= maxColorW)
    if (validC.length === 1) return (validC[0][0] + validC[0][1]) / 2
    if (validC.length > 1) {
      validC.sort((a, b) => b[2] - a[2])
      if (validC[0][2] > validC[1][2] * 1.6) return (validC[0][0] + validC[0][1]) / 2
    }
  }

  // 3. Frame-difference playhead on a static card (when `prev` has the same dimensions)
  if (prev && prev.w === g.w && prev.h === g.h) {
    const y0 = Math.floor(g.h * 0.15), y1 = Math.ceil(g.h * 0.78), bh = Math.max(1, y1 - y0)
    // Where `g` became darker (or distinctly changed) relative to `prev` along a vertical band
    const dRuns: [number, number][] = []
    let ds = -1
    for (let x = 0; x <= g.w; x++) {
      let chg = 0
      if (x < g.w) {
        for (let y = y0; y < y1; y++) {
          const dv = prev.px[y * g.w + x] - g.px[y * g.w + x]
          if (dv > 0.14) chg++
        }
      }
      const on = x < g.w && chg > bh * 0.55
      if (on && ds < 0) ds = x
      if (!on && ds >= 0) { dRuns.push([ds, x - 1]); ds = -1 }
    }
    const maxDiffW = Math.max(24, g.w * 0.035)
    const validD = dRuns.filter(([a, b]) => b - a <= maxDiffW)
    if (validD.length === 1) return (validD[0][0] + validD[0][1]) / 2
  }

  return null
}

/** Columns tainted by a playhead line or colored cursor bar in `g` (1 = tainted, 0 = clean); null when none found. */
export function playheadCols(g: Gray, prev?: Gray): Uint8Array | null {
  const px = playheadX(g, prev)
  const hasChroma = g.chroma ? g.chroma.some(v => v >= 0.26) : false
  if (px === null && !hasChroma) return null
  const mask = new Uint8Array(g.w)
  let any = false
  if (px !== null) {
    const pad = Math.max(6, Math.round(g.w * 0.01))
    const a = Math.max(0, Math.floor(px - pad)), b = Math.min(g.w - 1, Math.ceil(px + pad))
    for (let x = a; x <= b; x++) { mask[x] = 1; any = true }
  }
  if (g.chroma) {
    for (let x = 0; x < g.w; x++) {
      if (g.chroma[x] >= 0.26) {
        for (let d = -3; d <= 3; d++) if (x + d >= 0 && x + d < g.w) mask[x + d] = 1
        any = true
      }
    }
  }
  return any ? mask : null
}

/** How well frame b matches frame a moved left by dx (the same measure shiftBetween uses). */
export function matchAt(a: Float32Array, b: Float32Array, dx: number): number {
  const n = Math.min(a.length, b.length), len = n - dx
  if (dx < 0 || len < n * 0.25) return 0
  let s = 0, na = 0, nb = 0
  for (let x = 0; x < len; x++) { const va = a[x + dx], vb = b[x]; s += va * vb; na += va * va; nb += vb * vb }
  return s / Math.sqrt(na * nb + 1e-12)
}

/** Nothing changed between two frames (same size): mean absolute difference under 2%. */
export function sameFrame(a: Gray, b: Gray): boolean {
  if (a.w !== b.w || a.h !== b.h) return false
  let d = 0
  const step = 3
  for (let i = 0; i < a.px.length; i += step) d += Math.abs(a.px[i] - b.px[i])
  return d / Math.ceil(a.px.length / step) < 0.02
}
