// Psychedelic guitars: original electric (double cutaway), acoustic and spiky metal shapes, each in a trippy paint
// job (swirl, rainbow, flames, galaxy, mushroom spots). Drawn upright with the body centre at 0,0, the headstock up.
import { INK, sym, path, circle, ellipse, line, rays, uid, rng } from './svg'

export type GuitarKind = 'electric' | 'acoustic' | 'pointy'
export type GuitarPaint = 'swirl' | 'rainbow' | 'flames' | 'galaxy' | 'mushroom'

const BODY: Record<GuitarKind, string> = {
  electric: sym([0, -48], [[6, -48, 10, -50, 14, -54], [18, -62, 22, -74, 30, -76], [38, -78, 42, -66, 40, -56], [38, -44, 32, -30, 36, -22], [40, -12, 52, -2, 52, 18], [52, 44, 30, 56, 0, 56]]),
  acoustic: sym([0, -56], [[14, -56, 30, -54, 32, -40], [34, -26, 26, -20, 28, -10], [30, 0, 46, 6, 46, 28], [46, 50, 26, 60, 0, 60]]),
  pointy: 'M-7 -50 L7 -50 L22 -34 L58 -46 L34 -8 L52 54 L12 28 L-16 62 L-20 8 L-54 -12 L-24 -30Z',
}
const TOP: Record<GuitarKind, number> = { electric: -48, acoustic: -56, pointy: -50 }
const BRIDGE: Record<GuitarKind, number> = { electric: 26, acoustic: 32, pointy: 18 }
const NUT = -200

function spiral(cx: number, cy: number, turns: number, r0: number, r1: number, a0 = 0) {
  let d = ''
  const n = Math.round(turns * 24)
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = a0 + t * turns * Math.PI * 2, r = r0 + (r1 - r0) * t
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)} `
  }
  return d
}

function paintJob(p: GuitarPaint, k: number) {
  const g = uid('gp')
  switch (p) {
    case 'swirl':
      return { defs: `<radialGradient id="${g}" cx=".4" cy=".55" r=".8"><stop offset="0" stop-color="#ffd23f"/><stop offset=".45" stop-color="#ff8a00"/><stop offset="1" stop-color="#ff3fd8"/></radialGradient>`, fill: `url(#${g})`,
        art: line(spiral(4, 8, 3.2, 2, 62), '#7a2cff', 4 * k, 'opacity=".85"') + line(spiral(4, 8, 3.2, 2, 62, Math.PI), '#00e5ff', 3 * k, 'opacity=".8"') }
    case 'rainbow':
      return { defs: `<linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1">${['#ff3fd8', '#ff3355', '#ff8a00', '#ffd23f', '#2cf5a6', '#00b4ff', '#7a2cff'].map((c, i) => `<stop offset="${i / 6}" stop-color="${c}"/>`).join('')}</linearGradient>`, fill: `url(#${g})`,
        art: [0, 1, 2, 3].map(i => line(`M-70 ${-40 + i * 26} Q0 ${-70 + i * 26} 70 ${-40 + i * 26}`, '#ffffff', 2 * k, 'opacity=".35"')).join('') }
    case 'flames': {
      let f = ''
      for (const [x, h, c] of [[-40, 70, '#ff3355'], [-20, 96, '#ff8a00'], [2, 110, '#ffd23f'], [24, 90, '#ff8a00'], [44, 66, '#ff3355']] as [number, number, string][])
        f += path(`M${x - 16} 64 C${x - 18} ${64 - h * 0.4} ${x - 4} ${64 - h * 0.6} ${x - 2} ${64 - h} C${x + 6} ${64 - h * 0.66} ${x + 18} ${64 - h * 0.5} ${x + 16} 64Z`, c, INK, 1.6 * k)
      return { defs: '', fill: '#2a0a4a', art: f }
    }
    case 'galaxy': {
      const r = rng(7)
      let st = ''
      for (let i = 0; i < 26; i++) st += circle(-50 + r() * 100, -60 + r() * 120, 0.6 + r() * 1.6, '#ffffff', null, 0, `opacity="${(0.5 + r() * 0.5).toFixed(2)}"`)
      return { defs: `<radialGradient id="${g}" cx=".35" cy=".35" r=".9"><stop offset="0" stop-color="#3a1bbf"/><stop offset=".6" stop-color="#140a5a"/><stop offset="1" stop-color="#05021a"/></radialGradient>`, fill: `url(#${g})`,
        art: ellipse(-14, -8, 34, 16, '#ff3fd8', null, 0, 'opacity=".35" transform="rotate(-30)"') + ellipse(18, 22, 30, 12, '#00e5ff', null, 0, 'opacity=".3" transform="rotate(20)"') + st +
          circle(20, -20, 9, '#ffd23f', INK, 1.4 * k) + ellipse(20, -20, 17, 4, 'none', '#ff8a00', 2 * k, 'transform="rotate(-20 20 -20)"') }
    }
    case 'mushroom':
      return { defs: `<radialGradient id="${g}" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#ff7a5c"/><stop offset="1" stop-color="#c8102e"/></radialGradient>`, fill: `url(#${g})`,
        art: [[-26, -20, 9], [10, -34, 7], [28, 6, 10], [-8, 18, 8], [-34, 30, 6], [14, 40, 6], [-14, -46, 5], [36, -24, 5]].map(([x, y, s]) => ellipse(x, y, s, s * 0.8, '#fff6ea', INK, 1.2 * k)).join('') }
  }
}

function headstock(kind: GuitarKind, trim: string, k: number) {
  let s = ''
  if (kind === 'acoustic') {
    s += path(`M-7 ${NUT} L-10 ${NUT - 38} Q0 ${NUT - 44} 10 ${NUT - 38} L7 ${NUT}Z`, '#2a1408', INK, 2.2 * k)
    for (const y of [NUT - 9, NUT - 19, NUT - 29]) s += circle(-13, y, 3, trim, INK, 1.2 * k) + circle(13, y, 3, trim, INK, 1.2 * k)
  } else if (kind === 'pointy') {
    s += path(`M-6.5 ${NUT} L-15 ${NUT - 50} L11 ${NUT - 24} L6.5 ${NUT}Z`, '#14081c', INK, 2.2 * k)
    for (let i = 0; i < 3; i++) s += circle(-12 - i * 1.6, NUT - 12 - i * 11, 2.4, trim, INK, 1 * k) + circle(10 - i * 0.4, NUT - 8 - i * 6, 2.2, trim, INK, 1 * k)
  } else {
    s += path(`M-6.5 ${NUT} L-9 ${NUT - 36} C-9 ${NUT - 46} 4 ${NUT - 50} 12 ${NUT - 43} C16 ${NUT - 38} 13 ${NUT - 30} 9 ${NUT - 26} L6.5 ${NUT}Z`, '#f4e3c0', INK, 2.2 * k)
    for (let i = 0; i < 6; i++) s += circle(-12.5, NUT - 5 - i * 5.8, 2.3, trim, INK, 1 * k)
  }
  return s
}

export interface GuitarOpts { kind: GuitarKind; paint: GuitarPaint; trim?: string; k?: number; strings?: boolean }

/** The guitar's own drawing (no <svg> wrapper), body centre at 0,0, headstock pointing up to y -250. */
export function guitarShape(o: GuitarOpts) {
  const k = o.k ?? 1, trim = o.trim ?? '#ffd23f'
  const clip = uid('gc')
  const pj = paintJob(o.paint, k)
  const body = BODY[o.kind], top = TOP[o.kind], by = BRIDGE[o.kind]
  let s = `<defs>${pj.defs}<clipPath id="${clip}"><path d="${body}"/></clipPath></defs>`
  // neck and fretboard
  s += path(`M-6.5 ${top + 6} L-6.5 ${NUT} L6.5 ${NUT} L6.5 ${top + 6}Z`, '#2a1408', INK, 2.2 * k)
  const L = 150 / (1 - 2 ** (-14 / 12))
  const fret = (i: number) => NUT + L * (1 - 2 ** (-i / 12))
  for (let i = 1; i <= 14; i++) s += line(`M-6 ${fret(i).toFixed(1)} L6 ${fret(i).toFixed(1)}`, '#d9dcdd', 0.9 * k)
  for (const i of [3, 5, 7, 9]) s += circle(0, (fret(i) + fret(i - 1)) / 2, 1.7, ['#2cf5a6', '#ff3fd8', '#ffd23f', '#00e5ff'][i % 4], null)
  s += circle(-2.6, (fret(12) + fret(11)) / 2, 1.6, '#ff3fd8', null) + circle(2.6, (fret(12) + fret(11)) / 2, 1.6, '#2cf5a6', null)
  s += path(`M-7 ${NUT - 1} L7 ${NUT - 1} L7 ${NUT + 2} L-7 ${NUT + 2}Z`, '#fff6ea', INK, 1 * k)
  s += headstock(o.kind, trim, k)
  // body with its paint job
  s += path(body, pj.fill, null) + `<g clip-path="url(#${clip})">${pj.art}</g>` + path(body, 'none', INK, 2.8 * k)
  if (o.kind === 'acoustic') {
    s += circle(0, -22, 16, 'none', '#ffd23f', 2 * k) + circle(0, -22, 13.5, 'none', '#ff3fd8', 2 * k) + circle(0, -22, 11, '#12071f', INK, 1.6 * k)
    s += path('M12 -32 C26 -32 30 -16 22 -6 C14 0 8 -12 12 -32Z', '#14081c', INK, 1.4 * k, 'opacity=".85"')
    s += path(`M-15 ${by - 3} L15 ${by - 3} L15 ${by + 4} L-15 ${by + 4}Z`, '#2a1408', INK, 1.6 * k)
  } else {
    if (o.kind === 'electric') s += path('M-24 -24 C-34 -8 -36 16 -26 28 C-14 36 2 34 8 24 L12 -16 C4 -28 -14 -32 -24 -24Z', '#14081c', INK, 1.4 * k, 'fill-opacity=".45"')
    for (const y of o.kind === 'electric' ? [-30, -12, 6] : [-26, -4]) s += path(`M-9 ${y} L9 ${y} L9 ${y + 6} L-9 ${y + 6}Z`, '#14081c', INK, 1.4 * k) + line(`M-6 ${y + 3} L6 ${y + 3}`, '#d9dcdd', 1.2 * k, 'stroke-dasharray=".1 2.4"')
    s += path(`M-11 ${by - 3} L11 ${by - 3} L11 ${by + 5} L-11 ${by + 5}Z`, '#d9dcdd', INK, 1.4 * k)
    for (const [x, y] of o.kind === 'electric' ? [[26, 26], [32, 38], [20, 40]] : [[24, 24], [33, 32]]) s += circle(x, y, 4, trim, INK, 1.2 * k)
  }
  if (o.strings !== false) for (let i = 0; i < 6; i++) s += line(`M${(-6 + i * 2.4).toFixed(1)} ${by} L${(-4.5 + i * 1.8).toFixed(1)} ${NUT}`, '#f4f0ff', 0.55 * k, 'opacity=".9"')
  return s
}

/** Music notes floating round a picture. */
export function notes(seed: number, w: number, h: number, colours = ['#7cf6ff', '#ffd23f', '#ff9ae8', '#2cf5a6']) {
  const r = rng(seed)
  let s = ''
  for (let i = 0; i < 5; i++) {
    const x = r() * w - w / 2, y = r() * h - h / 2, c = colours[i % colours.length], k = 0.8 + r() * 0.6
    s += `<g class="psy-note" style="--d:${(r() * 3).toFixed(2)}s" transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${k.toFixed(2)}) rotate(${(r() * 30 - 15).toFixed(0)})">` +
      (i % 2 ? ellipse(0, 0, 5.5, 4, c, INK, 1.4, 'transform="rotate(-20)"') + line('M4.8 -1.5 L4.8 -20 Q10 -16 12 -10', INK, 1.8) :
        ellipse(0, 0, 5.5, 4, c, INK, 1.4, 'transform="rotate(-20)"') + ellipse(14, -4, 5.5, 4, c, INK, 1.4, 'transform="rotate(-20 14 -4)"') + line('M4.8 -1.5 L4.8 -20 L18.8 -24 L18.8 -5.5', INK, 1.8) + line('M4.8 -20 L18.8 -24', INK, 3.4)) +
      `</g>`
  }
  return s
}

/** A psychedelic guitar on its own, glowing, with rays and music notes. */
export function guitarArtSvg(kind: GuitarKind = 'electric', paint: GuitarPaint = 'swirl', cls = '') {
  const g = uid('ga')
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-130 -170 260 340" class="psy-guitar g-${kind} ${cls}" aria-hidden="true">`
  s += `<defs><radialGradient id="${g}"><stop offset="0" stop-color="#ff3fd8" stop-opacity=".75"/><stop offset=".6" stop-color="#7a2cff" stop-opacity=".35"/><stop offset="1" stop-color="#7a2cff" stop-opacity="0"/></radialGradient></defs>`
  s += `<circle cx="0" cy="0" r="150" fill="url(#${g})"/>`
  s += `<g class="guitar-rays">${rays(18, 30, 190, '#ffffff', 0.45, 'opacity=".14"')}</g>`
  s += `<g class="guitar-float"><g transform="translate(10 62) rotate(-16) scale(.92)">${guitarShape({ kind, paint })}</g></g>`
  s += notes(kind.length * 5 + paint.length, 220, 260)
  return s + '</svg>'
}

export const KINDS: GuitarKind[] = ['electric', 'acoustic', 'pointy']
export const PAINTS: GuitarPaint[] = ['swirl', 'rainbow', 'flames', 'galaxy', 'mushroom']
