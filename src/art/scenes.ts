// Psychedelic art besides the dogs: oni masks, mushrooms, a smiling sun, a sleepy crescent moon, an ukiyo-e style
// wave, sakura petals, and scenes made from them. All original, drawn in code as SVG strings.
import { INK, sym, both, path, circle, ellipse, line, rays, uid, rng } from './svg'
import { dogSvg, type BreedId } from './dogs'
import { guitarArtSvg, guitarShape, notes, type GuitarKind, type GuitarPaint } from './guitars'

const svgOpen = (vb: string, cls: string, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" class="${cls}" aria-hidden="true"${extra}>`

/** A four-point sparkle. */
export const sparkle = (x: number, y: number, r: number, fill = '#fff6d0', cls = 'psy-twinkle') =>
  `<path class="${cls}" d="M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z" fill="${fill}"/>`

// ---------------------------------------------------------------- oni masks
export type OniColour = 'red' | 'blue' | 'purple' | 'green'
const ONI: Record<OniColour, { face: string; face2: string; dark: string; hair: string; brow: string; iris: string; horn: string }> = {
  red: { face: '#e8283c', face2: '#ff7a5c', dark: '#8a0f22', hair: '#2a0b3a', brow: '#ffd23f', iris: '#2cf5a6', horn: '#fff1c9' },
  blue: { face: '#2f6bff', face2: '#7cf6ff', dark: '#14287a', hair: '#ff3fd8', brow: '#2cf5a6', iris: '#ffd23f', horn: '#ffe3f7' },
  purple: { face: '#8a2cff', face2: '#ff7be6', dark: '#3d0f8a', hair: '#00e5ff', brow: '#ffd23f', iris: '#ff3355', horn: '#fff1c9' },
  green: { face: '#18b86a', face2: '#c6ff4a', dark: '#0b5a33', hair: '#ff8a00', brow: '#ff3fd8', iris: '#ffd23f', horn: '#fff1c9' },
}
export function oniSvg(colour: OniColour = 'red', cls = '') {
  const c = ONI[colour]
  let s = svgOpen('-110 -118 220 228', `psy-oni oni-${colour} ${cls}`)
  // wild hair
  let hair = ''
  for (let i = 0; i <= 18; i++) {
    const a = Math.PI * (0.95 + (i / 18) * 1.1)
    const r = i % 2 ? 74 : 104
    hair += `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r * 0.92 + 8).toFixed(1)} `
  }
  s += path(hair + 'L80 60 L-80 60Z', c.hair, INK, 2.6)
  // horns
  s += both(path('M28 -52 C38 -74 54 -92 76 -110 C74 -86 64 -64 50 -38Z', c.horn, INK, 2.6) +
    line('M38 -64 L52 -56 M46 -78 L60 -70 M56 -90 L68 -84', '#c9a36a', 2.2))
  // face
  const face = sym([0, -66], [[32, -66, 58, -52, 62, -20], [66, 2, 64, 22, 54, 38], [46, 54, 26, 70, 0, 72]])
  s += path(face, c.face, INK, 3)
  // cheek and forehead swirls
  s += both(line('M30 6 C40 -2 54 6 49 16 C45 23 35 19 39 12', c.face2, 3.2) + line('M44 -48 C52 -42 54 -34 50 -28', c.face2, 3))
  s += line('M-10 -54 C-4 -48 4 -48 10 -54', c.face2, 3)
  // brows, eyes
  s += both(path('M6 -30 C18 -48 46 -50 62 -34 C52 -30 36 -30 24 -24 C17 -21 10 -23 6 -30Z', c.brow, INK, 2.4))
  s += both(path('M14 -20 C24 -30 44 -30 52 -18 C44 -9 24 -9 14 -20Z', '#fff6d6', INK, 2.4) + circle(34, -19, 6.5, c.iris, INK, 1.6) + circle(34, -19, 2.6, INK, null) + circle(32, -21, 1.3, '#fff', null))
  s += line('M-4 -30 L-2 -20 M4 -30 L2 -20', c.dark, 2.4)
  s += path('M-7 -46 L0 -56 L7 -46 L0 -38Z', c.brow, INK, 2)
  // nose
  s += path('M-11 -8 C-13 4 -22 8 -18 15 C-12 20 -5 16 0 18 C5 16 12 20 18 15 C22 8 13 4 11 -8Z', c.dark, INK, 2.4) + both(ellipse(9, 12, 4, 2.6, INK, null))
  // mouth with teeth and tusks
  s += path('M-42 26 C-28 56 28 56 42 26 C24 32 -24 32 -42 26Z', '#3a0016', INK, 2.6)
  let teeth = ''
  for (let x = -30; x <= 24; x += 9) teeth += path(`M${x} ${30 + Math.abs(x + 3) * 0.08} L${x + 8} ${30 + Math.abs(x + 3) * 0.08} L${x + 7} ${37} L${x + 1} ${37}Z`, '#fff8ea', INK, 1.4)
  s += teeth
  s += both(path('M18 46 C20 34 24 24 28 14 C30 26 30 36 28 46Z', c.horn, INK, 2.2))
  return s + '</svg>'
}

// ---------------------------------------------------------------- mushrooms
function amanita(x: number, y: number, k: number, cap: string, cap2: string, face = false) {
  const g = uid('mg')
  let s = `<defs><radialGradient id="${g}" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="${cap2}"/><stop offset="1" stop-color="${cap}"/></radialGradient></defs>`
  s += `<g transform="translate(${x} ${y}) scale(${k})">`
  s += path('M-12 0 C-14 -30 -10 -60 -8 -76 L8 -76 C10 -60 14 -30 12 0 C6 4 -6 4 -12 0Z', '#fff4e0', INK, 2.6)
  s += path('M-16 -46 C-6 -40 6 -40 16 -46 C14 -36 -14 -36 -16 -46Z', '#ffe0f0', INK, 2)
  if (face) s += line('M-7 -24 q2.5 3 5 0 M2 -24 q2.5 3 5 0', INK, 2) + line('M-4 -16 q4 4 8 0', INK, 2) + circle(-9, -18, 2.2, '#ff9ac0', null) + circle(9, -18, 2.2, '#ff9ac0', null)
  s += path('M-48 -70 C-50 -110 -18 -128 0 -128 C18 -128 50 -110 48 -70 C30 -78 -30 -78 -48 -70Z', `url(#${g})`, INK, 2.8)
  for (const [sx, sy, r] of [[-28, -96, 7], [-6, -114, 5.5], [16, -104, 7], [34, -86, 5], [-38, -80, 4], [4, -90, 4.5]]) s += ellipse(sx, sy, r, r * 0.8, '#fff6ea', INK, 1.2)
  return s + '</g>'
}
function glowCap(x: number, y: number, k: number, cap: string, cap2: string, lean = 0) {
  const g = uid('mh')
  let s = `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${cap2}"/><stop offset="1" stop-color="${cap}"/></linearGradient></defs>`
  s += `<g transform="translate(${x} ${y}) rotate(${lean}) scale(${k})" class="psy-glow">`
  s += path('M-5 0 C-8 -30 -2 -60 -3 -88 L5 -88 C6 -60 9 -30 6 0Z', '#e9fff8', INK, 2.2)
  s += path('M-30 -84 C-28 -108 -12 -122 0 -122 C12 -122 28 -108 30 -84 C18 -90 -18 -90 -30 -84Z', `url(#${g})`, INK, 2.4)
  s += line('M-20 -92 C-10 -100 10 -100 20 -92', '#ffffff', 1.6, 'opacity=".55"')
  for (const [sx, sy] of [[-12, -106], [8, -112], [16, -98], [-2, -98]]) s += circle(sx, sy, 2.2, '#ffffff', null, 0, 'opacity=".8"')
  return s + '</g>'
}
export function mushroomsSvg(cls = '') {
  let s = svgOpen('-120 -150 240 250', `psy-shrooms ${cls}`)
  s += ellipse(0, 84, 112, 18, '#1f6b3a', INK, 2.4)
  s += glowCap(58, 86, 0.95, '#00b4ff', '#7cf6ff', 8)
  s += glowCap(84, 88, 0.55, '#b46bff', '#ffb3ff', 14)
  s += amanita(-22, 88, 0.95, '#e8283c', '#ff7a5c', true)
  s += amanita(-86, 90, 0.42, '#ff3fd8', '#ffb3f0')
  s += glowCap(20, 92, 0.42, '#2cf5a6', '#c6ff4a', -10)
  let blades = ''
  for (let x = -104; x <= 104; x += 9) blades += `M${x} 86 q${x % 2 ? 3 : -3} -10 ${x % 3 ? 6 : -4} -16 `
  s += line(blades, '#34c35e', 2.2)
  s += sparkle(-92, -60, 7) + sparkle(98, -52, 6, '#7cf6ff') + sparkle(40, -132, 5, '#ffd23f') + sparkle(-56, -124, 4.5, '#ff9ae8')
  return s + '</svg>'
}

// ---------------------------------------------------------------- sun and moon
export function sunSvg(cls = '') {
  const g = uid('sg')
  let s = svgOpen('-115 -115 230 230', `psy-sun ${cls}`)
  s += `<defs><radialGradient id="${g}" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#fff3a0"/><stop offset=".6" stop-color="#ffc21f"/><stop offset="1" stop-color="#ff8a00"/></radialGradient></defs>`
  s += `<g class="sun-rays">${rays(16, 50, 112, '#ff5c00', 0.62, `stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"`)}${rays(16, 50, 86, '#ffd23f', 0.5, `transform="rotate(11.25)" stroke="${INK}" stroke-width="2" stroke-linejoin="round"`)}</g>`
  s += `<g class="sun-dots">`
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; s += circle(Math.cos(a) * 62, Math.sin(a) * 62, 2.4, '#ff3fd8', null) }
  s += `</g>`
  s += circle(0, 0, 54, `url(#${g})`, INK, 3)
  // face: closed happy eyes, third eye, smile, blush
  s += both(line('M14 -6 q9 9 18 0', INK, 3) + line('M16 -3 l-2 4 M23 0 l0 4.5 M30 -3 l2 4', INK, 1.6) + circle(30, 14, 6.5, '#ff6f9f', null, 0, 'opacity=".75"'))
  s += path('M-9 -28 Q0 -38 9 -28 Q0 -18 -9 -28Z', '#fff8ea', INK, 2) + circle(0, -28, 3.6, '#7a2cff', null) + circle(0, -28, 1.6, INK, null)
  s += path('M-14 16 Q0 30 14 16 Q0 22 -14 16Z', '#c8183c', INK, 2.4)
  return s + '</svg>'
}
// crescent: the part of a circle (r 72) outside a second circle (r 62) shifted up and right
const MOON = (() => {
  const r1 = 72, r2 = 62, cx = 34, cy = -22
  const d = Math.hypot(cx, cy), a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(r1 * r1 - a * a)
  const bx = (a * cx) / d, by = (a * cy) / d, px = -cy / d, py = cx / d
  const p1 = [bx + h * px, by + h * py], p2 = [bx - h * px, by - h * py]
  const f = (v: number) => v.toFixed(2)
  return `M${f(p2[0])} ${f(p2[1])} A${r1} ${r1} 0 1 0 ${f(p1[0])} ${f(p1[1])} A${r2} ${r2} 0 0 1 ${f(p2[0])} ${f(p2[1])}Z`
})()
export function moonSvg(cls = '') {
  const g = uid('mg'), c = uid('mc')
  let s = svgOpen('-115 -115 230 230', `psy-moon ${cls}`)
  s += `<defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6c2"/><stop offset="1" stop-color="#ffc94a"/></linearGradient><clipPath id="${c}"><path d="${MOON}"/></clipPath></defs>`
  s += `<g class="moon-clouds">` + cloud(-58, 74, 1, '#ff7be6') + cloud(56, 82, 0.8, '#7cf6ff') + `</g>`
  s += `<g class="moon-body">` + path(MOON, `url(#${g})`, null)
  s += `<g clip-path="url(#${c})">${circle(-40, 30, 8, '#f0b23a', null, 0, 'opacity=".5"')}${circle(-22, 52, 5, '#f0b23a', null, 0, 'opacity=".5"')}${circle(-58, -4, 5, '#f0b23a', null, 0, 'opacity=".5"')}</g>`
  s += path(MOON, 'none', INK, 3)
  // sleepy face on the inner curve
  s += line('M-44 -8 q8 7 16 0', INK, 3) + line('M-41 -5 l-2 4 M-36 -3 l0 4.5 M-31 -5 l2 4', INK, 1.5)
  s += line('M-40 22 q8 8 18 2', INK, 3) + circle(-50, 10, 6, '#ff6f9f', null, 0, 'opacity=".7"') + `</g>`
  s += sparkle(54, -70, 10) + sparkle(84, -24, 6, '#7cf6ff') + sparkle(30, -98, 5, '#ff9ae8') + sparkle(92, 36, 4.5) + circle(64, -42, 2.4, '#fff6d0', null) + circle(100, -80, 2, '#fff6d0', null)
  return s + '</svg>'
}
function cloud(x: number, y: number, k: number, fill: string) {
  return `<g transform="translate(${x} ${y}) scale(${k})">` + path('M-46 10 C-50 -6 -34 -14 -24 -8 C-22 -24 2 -28 8 -14 C14 -26 36 -22 36 -6 C50 -8 54 10 42 14 Z', fill, INK, 2.4) +
    line('M-24 -8 q6 -8 14 -2 q4 4 -2 7 M8 -14 q6 -8 14 -2', INK, 1.6, 'opacity=".6"') + `</g>`
}

// ---------------------------------------------------------------- waves
function waveUnit(x: number, fill: string, foam: string, lines: string) {
  const top = 'M0 80 C40 80 70 70 92 50 C110 32 122 20 146 18 C168 16 184 30 178 46 C174 56 162 58 156 51 C151 45 154 39 160 39 C152 35 145 44 147 53 C151 65 168 72 186 72 C194 72 198 76 200 80'
  let s = `<g transform="translate(${x} 0)">` + path(top + ' L200.6 130 L-0.6 130Z', fill, null) + line(top, INK, 2.6)
  // foam claws along the crest
  const claws: [number, number, number][] = [[96, 46, -30], [106, 36, -20], [118, 27, -10], [131, 21, 0], [144, 18, 10], [157, 19, 25], [168, 24, 45]]
  for (const [cx, cy, a] of claws) s += path(`M${cx} ${cy} q-3 -9 2 -14 q1 6 5 7 q-1 5 -7 7Z`, foam, INK, 1.3, `transform="rotate(${a} ${cx} ${cy})"`)
  s += line('M8 96 C44 94 76 84 98 66 M30 112 C64 110 96 100 118 84 M160 94 C176 92 190 94 200 98', lines, 2.4)
  return s + '</g>'
}
/** A band of waves, two crests per 400 units; the inner group drifts sideways (class wave-drift). */
export function waveSvg(cls = '', a = '#1b4dff', b = '#0a2a9e') {
  let s = svgOpen('0 0 400 130', `psy-wave ${cls}`, ' preserveAspectRatio="xMidYMax slice"')
  s += `<g transform="translate(-100 -14)"><g class="wave-drift wave-back">${waveUnit(0, b, '#c9f6ff', '#3a6bff')}${waveUnit(200, b, '#c9f6ff', '#3a6bff')}${waveUnit(400, b, '#c9f6ff', '#3a6bff')}</g></g>`
  s += `<g><g class="wave-drift">${waveUnit(0, a, '#ffffff', '#7cf6ff')}${waveUnit(200, a, '#ffffff', '#7cf6ff')}${waveUnit(400, a, '#ffffff', '#7cf6ff')}</g></g>`
  return s + '</svg>'
}

/** One repeating tile of the wave band (200 × 130), for a CSS background that rolls sideways. */
export function waveTileSvg(a = '#1b4dff', b = '#0a2a9e') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 130" preserveAspectRatio="none">` +
    `<g transform="translate(0 -14)">${waveUnit(-100, b, '#c9f6ff', '#3a6bff')}${waveUnit(100, b, '#c9f6ff', '#3a6bff')}</g>${waveUnit(0, a, '#ffffff', '#7cf6ff')}</svg>`
}

// ---------------------------------------------------------------- petals
export const petalSvg = (fill = '#ffb3d9', cls = '') =>
  svgOpen('-12 -12 24 24', `psy-petal ${cls}`) + path('M0 -10 C7 -8 9 0 0 10 C-9 0 -7 -8 -2 -9 L0 -6Z', fill, '#b0207a', 1) + '</svg>'

// ---------------------------------------------------------------- scenes
/** Samurai dogs standing in a row over the waves, with the sun or the moon behind. */
export function paradeSvg(ids: BreedId[], o: { sky?: 'sun' | 'moon'; cls?: string } = {}) {
  const W = 600, H = 170
  let s = svgOpen(`0 0 ${W} ${H}`, `psy-parade ${o.cls ?? ''}`, ' preserveAspectRatio="xMidYMax slice"')
  const skyG = uid('pk')
  s += `<defs><linearGradient id="${skyG}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0a6e"/><stop offset=".6" stop-color="#ff3fd8"/><stop offset="1" stop-color="#ff8a00"/></linearGradient></defs>`
  s += `<rect width="${W}" height="${H}" fill="url(#${skyG})"/>`
  s += `<g class="parade-sky">${(o.sky === 'moon' ? moonSvg : sunSvg)().replace('<svg ', '<svg x="240" y="-2" width="120" height="120" ')}</g>`
  const r = rng(ids.length * 7 + 3)
  for (let i = 0; i < 18; i++) s += sparkle(r() * W, r() * 60 + 6, 2 + r() * 3.5, ['#fff6d0', '#7cf6ff', '#ffd23f'][i % 3])
  const n = ids.length, w = Math.min(118, (W - 20) / n), gap = (W - w * n) / (n + 1)
  ids.forEach((id, i) => {
    s += `<g class="parade-dog" style="--i:${i}">` + dogSvg(id, { frame: 'bust', place: { x: gap + i * (w + gap), y: H - w - 8, w, h: w } }) + `</g>`
  })
  s += `<svg x="0" y="${H - 40}" width="${W}" height="40" viewBox="0 0 400 130" preserveAspectRatio="none">${waveSvg().replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</svg>`
  return s + '</svg>'
}

/** A header scene: sky, a big centrepiece (sun, moon, mushrooms or an oni) and the waves. */
export type ScenePiece = 'sun' | 'moon' | 'shrooms' | 'oni' | 'guitar'
export function skySceneSvg(piece: ScenePiece, o: { cls?: string; oni?: OniColour; tint?: [string, string]; guitar?: [GuitarKind, GuitarPaint] } = {}) {
  const W = 600, H = 200
  const [t1, t2] = o.tint ?? (piece === 'moon' ? ['#0a0640', '#7a2cff'] : piece === 'oni' ? ['#3a0010', '#ff3fd8'] : piece === 'shrooms' ? ['#062a3a', '#2cf5a6'] : piece === 'guitar' ? ['#1a0066', '#00b4ff'] : ['#ff3fd8', '#ffd23f'])
  const g = uid('ss')
  let s = svgOpen(`0 0 ${W} ${H}`, `psy-scene scene-${piece} ${o.cls ?? ''}`, ' preserveAspectRatio="xMidYMid slice"')
  s += `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t1}"/><stop offset="1" stop-color="${t2}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${g})"/>`
  s += `<g class="scene-rays" style="transform-origin:420px 90px">${rays(28, 0, 420, '#ffffff', 0.5, 'transform="translate(420 90)" opacity=".1"')}</g>`
  const r = rng(piece.length * 13)
  for (let i = 0; i < 16; i++) s += sparkle(r() * W, r() * 120 + 6, 2 + r() * 3.5, ['#fff6d0', '#7cf6ff', '#ffd23f', '#ff9ae8'][i % 4])
  if (piece === 'guitar') {
    const [kind, paint] = o.guitar ?? ['electric', 'swirl']
    s += `<g transform="translate(440 112)"><circle r="96" fill="#ff3fd8" opacity=".25"/><g class="guitar-float"><g transform="rotate(-64) scale(.74)">${guitarShape({ kind, paint, k: 1.4 })}</g></g>${notes(5, 300, 150)}</g>`
  } else {
    const inner = piece === 'sun' ? sunSvg() : piece === 'moon' ? moonSvg() : piece === 'shrooms' ? mushroomsSvg() : oniSvg(o.oni ?? 'red')
    s += inner.replace('<svg ', `<svg x="330" y="-6" width="190" height="190" `)
  }
  s += `<svg x="0" y="${H - 64}" width="${W}" height="64" viewBox="0 0 400 130" preserveAspectRatio="none">${waveSvg().replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</svg>`
  return s + '</svg>'
}

/** Two psychedelic guitars crossed like swords behind a glowing sun (an emblem for celebrations). */
export function crossedGuitarsSvg(cls = '') {
  let s = svgOpen('-130 -130 260 260', `psy-crossed ${cls}`)
  s += `<g transform="translate(-58 70) rotate(34) scale(.58)">${guitarShape({ kind: 'electric', paint: 'rainbow', k: 1.7 })}</g>`
  s += `<g transform="translate(58 70) rotate(-34) scale(.58)">${guitarShape({ kind: 'pointy', paint: 'galaxy', k: 1.7 })}</g>`
  s += `<g class="crossed-sun" transform="translate(0 -4) scale(.5)">${sunSvg().replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g>`
  s += notes(11, 230, 230)
  return s + '</svg>'
}

// gallery helpers (tools/psy-gallery.ts shows every *Svg export)
export const guitarElectricSvg = () => guitarArtSvg('electric', 'swirl')
export const guitarAcousticSvg = () => guitarArtSvg('acoustic', 'rainbow')
export const guitarPointySvg = () => guitarArtSvg('pointy', 'galaxy')
export const guitarFlamesSvg = () => guitarArtSvg('electric', 'flames')
export const guitarMushroomSvg = () => guitarArtSvg('acoustic', 'mushroom')
export const sceneGuitarSvg = () => skySceneSvg('guitar', { guitar: ['pointy', 'flames'] })
export const oniRedSvg = () => oniSvg('red')
export const oniBlueSvg = () => oniSvg('blue')
export const oniPurpleSvg = () => oniSvg('purple')
export const oniGreenSvg = () => oniSvg('green')
export const paradeDemoSvg = () => paradeSvg(['shiba', 'husky', 'lab', 'corgi', 'pug'])
export const sceneSunSvg = () => skySceneSvg('sun')
export const sceneMoonSvg = () => skySceneSvg('moon')
export const sceneShroomsSvg = () => skySceneSvg('shrooms')
export const sceneOniSvg = () => skySceneSvg('oni', { oni: 'blue' })
