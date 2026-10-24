// Small helpers for the hand-drawn Psychedelic art (all original, drawn in code as SVG strings).
export const INK = '#16002e'

const n = (v: number) => (Math.round(v * 10) / 10).toString()

/** A closed path that is mirror-symmetric about x = 0. `start` is on the axis; `segs` are cubic segments
 *  [c1x, c1y, c2x, c2y, x, y] down the right-hand side, ending back on the axis. */
export function sym(start: [number, number], segs: number[][]): string {
  let d = `M${n(start[0])} ${n(start[1])}`
  const pts: [number, number][] = [start]
  for (const s of segs) {
    d += ` C${n(s[0])} ${n(s[1])} ${n(s[2])} ${n(s[3])} ${n(s[4])} ${n(s[5])}`
    pts.push([s[4], s[5]])
  }
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i]
    const [px, py] = pts[i]
    d += ` C${n(-s[2])} ${n(s[3])} ${n(-s[0])} ${n(s[1])} ${n(-px)} ${n(py)}`
  }
  return d + 'Z'
}

/** The same shape on both sides: `right` is drawn as is and mirrored to the left. */
export const both = (right: string) => `${right}<g transform="scale(-1 1)">${right}</g>`

export function path(d: string, fill: string, stroke: string | null = INK, w = 2.6, extra = '') {
  return `<path d="${d}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"` : ''}${extra ? ' ' + extra : ''}/>`
}
export const circle = (x: number, y: number, r: number, fill: string, stroke: string | null = INK, w = 2.2, extra = '') =>
  `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${w}"` : ''}${extra ? ' ' + extra : ''}/>`
export const ellipse = (x: number, y: number, rx: number, ry: number, fill: string, stroke: string | null = INK, w = 2.2, extra = '') =>
  `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${w}"` : ''}${extra ? ' ' + extra : ''}/>`
export const line = (d: string, stroke: string, w: number, extra = '') =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra ? ' ' + extra : ''}/>`

/** Rays round a centre: `count` wedges between radius r0 and r1. */
export function rays(count: number, r0: number, r1: number, fill: string, width = 0.5, extra = '') {
  let d = ''
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2
    const h = (Math.PI / count) * width
    d += `M${n(Math.cos(a - h) * r0)} ${n(Math.sin(a - h) * r0)} L${n(Math.cos(a) * r1)} ${n(Math.sin(a) * r1)} L${n(Math.cos(a + h) * r0)} ${n(Math.sin(a + h) * r0)}Z`
  }
  return `<path d="${d}" fill="${fill}"${extra ? ' ' + extra : ''}/>`
}

let uidN = 0
/** Ids for gradients and clip paths, unique within the page. */
export const uid = (p = 'k') => `${p}${(++uidN).toString(36)}`

/** A tiny seeded random (same picture every time for the same seed). */
export function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 10000) / 10000 }
}
export function hashStr(t: string) {
  let h = 2166136261
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
