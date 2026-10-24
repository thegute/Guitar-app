// Samurai dogs: original front-view portraits in a bold sticker / ukiyo-e poster style, one per breed, each in
// its own psychedelic armour. Drawn as SVG strings so the app and the art gallery script share them.
import { INK, sym, both, path, circle, ellipse, line, rays, uid } from './svg'
import { guitarShape, type GuitarKind, type GuitarPaint } from './guitars'

export type BreedId = 'lab' | 'shiba' | 'husky' | 'shepherd' | 'doberman' | 'pug' | 'corgi' | 'beagle' | 'dalmatian' | 'poodle' | 'golden'
type Ear = 'pointy' | 'big' | 'tall' | 'floppy' | 'long' | 'feather' | 'fold' | 'curly'
type Crest = 'horns' | 'moon' | 'sun' | 'mushroom' | 'flame' | 'bolt' | 'eye'

interface Breed {
  id: BreedId
  name: string
  fur: string; fur2: string; dark: string; inner: string; iris: string
  ear: Ear; earFill?: string
  cheek: number; jaw: number; chin: number; tufts?: boolean
  eyeX: number; eyeY: number; eyeR: number
  noseY: number; mw: number; pads?: string
  tongue?: boolean
  brows: 'fierce' | 'dots' | 'both'
  browDot?: string
  marks?: (b: Breed) => string
  armour: { helmet: string; helmet2: string; plate: string; plate2: string; lace: string; trim: string; crest: Crest; crestFill: string; halo: [string, string]; gear: 'katana' | null; paint?: string; guitar: [GuitarKind, GuitarPaint] }
}

const CREAM = '#fff1d6'
const TONGUE = '#ff6f9f'

// ---------- breed markings (drawn inside the head outline) ----------
const shibaMarks = (b: Breed) =>
  path(sym([0, 2], [[14, 2, b.cheek * 0.6, 4, b.cheek + 2, 12], [b.cheek + 2, 30, b.cheek * 0.6, 46, 0, 52]]), b.fur2, null)
const huskyMarks = (b: Breed) =>
  path(sym([0, -3], [[6, -10, b.eyeX - 8, -19, b.eyeX + 2, -18], [b.eyeX + 11, -18, b.cheek, -12, b.cheek + 3, -2], [b.cheek + 3, 24, b.cheek * 0.6, 46, 0, 52]]), b.fur2, null) +
  path(sym([0, -46], [[9, -46, 9, -28, 6, -14], [4, -8, 2, -5, 0, -3]]), b.fur, null)
const shepherdMarks = (b: Breed) =>
  path(sym([0, -46], [[10, -46, 14, -30, 8, -16], [5, -12, 2, -10, 0, -10]]), b.dark, null) +
  path(sym([0, -22], [[10, -22, b.eyeX, -14, b.eyeX + 11, -3], [b.eyeX + 8, 10, b.mw + 3, 16, b.mw + 3, b.noseY + 8], [b.mw + 2, b.noseY + 22, 8, b.chin, 0, b.chin]]), b.dark, null)
const dobermanMarks = (b: Breed) =>
  both(path(`M${b.cheek - 4} 16 C${b.cheek + 2} 22 ${b.cheek - 2} 38 ${b.cheek - 16} 42 C${b.cheek - 20} 32 ${b.cheek - 15} 22 ${b.cheek - 4} 16Z`, b.fur2, null))
const pugMarks = (b: Breed) =>
  path(sym([0, -12], [[9, -12, b.eyeX - 9, -15, b.eyeX + 6, -11], [b.eyeX + 15, -4, b.mw + 7, 6, b.mw + 7, b.noseY + 12], [b.mw + 7, b.noseY + 26, 10, b.chin, 0, b.chin]]), b.dark, null) +
  line('M-11 -16 Q0 -11 11 -16 M-8 -10 Q0 -6 8 -10', '#8a6a44', 2)
const blazeMarks = (b: Breed) =>
  path(sym([0, -46], [[3, -46, 4, -20, 5, -9], [7, -3, b.mw, 0, b.mw + 2, b.noseY], [b.mw + 9, b.noseY + 14, b.cheek * 0.7, 42, 0, b.chin + 2]]), b.fur2, null)
const dalmatianMarks = () =>
  [[-28, -14, 5], [22, -26, 4], [31, 10, 6], [-34, 16, 4], [12, -34, 3], [-15, -32, 4], [37, -8, 3], [-22, 36, 4], [19, 37, 3.5], [-41, 0, 3], [3, -22, 2.5], [-5, 44, 2.5]]
    .map(([x, y, r]) => circle(x, y, r, '#17121c', null)).join('')
const softMuzzle = (b: Breed) =>
  path(sym([0, b.eyeY + 4], [[10, b.eyeY + 4, b.mw * 0.9, b.noseY - 6, b.mw, b.noseY + 4], [b.mw * 1.05, b.noseY + 16, b.mw * 0.6, b.chin - 1, 0, b.chin - 1]]), b.fur2, null)

export const BREEDS: Breed[] = [
  {
    id: 'lab', name: 'Chocolate lab', fur: '#6b3d24', fur2: '#8a5634', dark: '#3d2214', inner: '#4a2a18', iris: '#ffb233',
    ear: 'floppy', earFill: '#55301c', cheek: 44, jaw: 38, chin: 46, eyeX: 19, eyeY: 0, eyeR: 8.5, noseY: 20, mw: 19, brows: 'fierce', marks: softMuzzle,
    armour: { helmet: '#c81e5a', helmet2: '#ff7aa8', plate: '#6a1fd0', plate2: '#3d0f8a', lace: '#2cf5a6', trim: '#ffd23f', crest: 'horns', crestFill: '#ffd23f', halo: ['#ff3fd8', '#ff8a00'], gear: 'katana', paint: '#2cf5a6', guitar: ['electric', 'swirl'] },
  },
  {
    id: 'shiba', name: 'Shiba Inu', fur: '#e8862c', fur2: CREAM, dark: '#9a4d12', inner: CREAM, iris: '#3a1d0e',
    ear: 'pointy', cheek: 43, jaw: 36, chin: 46, tufts: true, eyeX: 18, eyeY: 1, eyeR: 7.8, noseY: 19, mw: 17, brows: 'both', browDot: CREAM, marks: shibaMarks,
    armour: { helmet: '#24105a', helmet2: '#5b3fd0', plate: '#00b8c9', plate2: '#006f86', lace: '#ff3fd8', trim: '#ffd23f', crest: 'sun', crestFill: '#ffd23f', halo: ['#ffd23f', '#ff5c00'], gear: 'katana', guitar: ['acoustic', 'rainbow'] },
  },
  {
    id: 'husky', name: 'Husky', fur: '#55606f', fur2: '#f2f4f7', dark: '#2c333d', inner: '#f2f4f7', iris: '#5fd6ff',
    ear: 'pointy', cheek: 44, jaw: 37, chin: 47, tufts: true, eyeX: 19, eyeY: 1, eyeR: 8.0, noseY: 21, mw: 17, brows: 'fierce', marks: huskyMarks,
    armour: { helmet: '#232a8f', helmet2: '#5c6bff', plate: '#7a2cff', plate2: '#46129e', lace: '#7cf6ff', trim: '#c9f6ff', crest: 'moon', crestFill: '#c9f6ff', halo: ['#3a7bff', '#b46bff'], gear: 'katana', paint: '#ff3fd8', guitar: ['pointy', 'galaxy'] },
  },
  {
    id: 'shepherd', name: 'German shepherd', fur: '#c98a3e', fur2: '#e0aa62', dark: '#2b211c', inner: '#3a2a22', iris: '#6b3a12',
    ear: 'big', earFill: '#b5762e', cheek: 42, jaw: 38, chin: 48, eyeX: 18, eyeY: 0, eyeR: 7.8, noseY: 23, mw: 15, brows: 'fierce', marks: shepherdMarks,
    armour: { helmet: '#1b1424', helmet2: '#5a4a6e', plate: '#c81e3a', plate2: '#7e0f22', lace: '#ffd23f', trim: '#ffd23f', crest: 'horns', crestFill: '#ffd23f', halo: ['#ff3d3d', '#ffb000'], gear: 'katana', guitar: ['electric', 'flames'] },
  },
  {
    id: 'doberman', name: 'Doberman', fur: '#231b22', fur2: '#c06a2e', dark: '#120c12', inner: '#4a2a30', iris: '#d98a2e',
    ear: 'tall', cheek: 39, jaw: 38, chin: 49, eyeX: 17, eyeY: 0, eyeR: 7.4, noseY: 24, mw: 14, pads: '#c06a2e', brows: 'dots', browDot: '#c06a2e', marks: dobermanMarks,
    armour: { helmet: '#3a0f6e', helmet2: '#8a4dff', plate: '#ff5c00', plate2: '#a33a00', lace: '#ffd23f', trim: '#ffd23f', crest: 'bolt', crestFill: '#fff04a', halo: ['#ffe600', '#ff3fd8'], gear: 'katana', paint: '#00e5ff', guitar: ['pointy', 'rainbow'] },
  },
  {
    id: 'pug', name: 'Pug', fur: '#dcb47c', fur2: '#e8c896', dark: '#2a2026', inner: '#2a2026', iris: '#3a2010',
    ear: 'fold', earFill: '#2a2026', cheek: 46, jaw: 34, chin: 42, eyeX: 21, eyeY: 2, eyeR: 10.3, noseY: 13, mw: 21, pads: '#2a2026', brows: 'fierce', marks: pugMarks,
    armour: { helmet: '#16c98a', helmet2: '#7dffd0', plate: '#ff3fd8', plate2: '#a3168a', lace: '#ffd23f', trim: '#ffd23f', crest: 'mushroom', crestFill: '#ff3355', halo: ['#2cf5a6', '#00b4ff'], gear: null, guitar: ['acoustic', 'mushroom'] },
  },
  {
    id: 'corgi', name: 'Corgi', fur: '#e27a2c', fur2: '#fff6ec', dark: '#9a4a14', inner: '#ffb3c4', iris: '#3a1d0e',
    ear: 'big', cheek: 44, jaw: 36, chin: 46, tufts: true, eyeX: 19, eyeY: 2, eyeR: 7.8, noseY: 20, mw: 17, tongue: true, brows: 'fierce', marks: blazeMarks,
    armour: { helmet: '#ff8a00', helmet2: '#ffd27a', plate: '#0f5bff', plate2: '#0a338f', lace: '#ffd23f', trim: '#fff04a', crest: 'flame', crestFill: '#ff3fd8', halo: ['#00c8ff', '#2f3dff'], gear: null, guitar: ['electric', 'rainbow'] },
  },
  {
    id: 'beagle', name: 'Beagle', fur: '#c87c3a', fur2: '#fff6ec', dark: '#5a3015', inner: '#7a4520', iris: '#3a1d0e',
    ear: 'long', earFill: '#8a4a1e', cheek: 41, jaw: 38, chin: 48, eyeX: 18, eyeY: 1, eyeR: 8.2, noseY: 22, mw: 17, brows: 'fierce', marks: blazeMarks,
    armour: { helmet: '#0aa86b', helmet2: '#6dffc0', plate: '#ffd23f', plate2: '#b38a00', lace: '#ff3fd8', trim: '#ff3fd8', crest: 'eye', crestFill: '#ffd23f', halo: ['#7dff3f', '#ffd23f'], gear: 'katana', paint: '#ff3fd8', guitar: ['acoustic', 'swirl'] },
  },
  {
    id: 'dalmatian', name: 'Dalmatian', fur: '#f6f2ee', fur2: '#ffffff', dark: '#17121c', inner: '#17121c', iris: '#5a2a10',
    ear: 'floppy', earFill: '#2a2230', cheek: 42, jaw: 38, chin: 48, eyeX: 18, eyeY: 0, eyeR: 8.0, noseY: 22, mw: 16, brows: 'fierce', marks: dalmatianMarks,
    armour: { helmet: '#e0123c', helmet2: '#ff6b8a', plate: '#1b1b4a', plate2: '#0d0d2a', lace: '#ff4f8a', trim: '#e9e6ff', crest: 'horns', crestFill: '#e9e6ff', halo: ['#ff2f6b', '#ff9ad0'], gear: 'katana', paint: '#ff2f6b', guitar: ['electric', 'galaxy'] },
  },
  {
    id: 'poodle', name: 'Poodle', fur: '#c9a0ff', fur2: '#e8d6ff', dark: '#7a4fc9', inner: '#b07aff', iris: '#2a1040',
    ear: 'curly', cheek: 38, jaw: 38, chin: 49, eyeX: 16, eyeY: 0, eyeR: 7.2, noseY: 24, mw: 13, brows: 'fierce', marks: softMuzzle,
    armour: { helmet: '#ffcf2a', helmet2: '#fff3a0', plate: '#ff5fd2', plate2: '#b0208f', lace: '#7cf6ff', trim: '#7cf6ff', crest: 'sun', crestFill: '#ff8a00', halo: ['#ff9ae8', '#a77bff'], gear: null, paint: '#7cf6ff', guitar: ['acoustic', 'galaxy'] },
  },
  {
    id: 'golden', name: 'Golden retriever', fur: '#e2a54a', fur2: '#f3cf8e', dark: '#a8701e', inner: '#c48a36', iris: '#5a2e0e',
    ear: 'feather', earFill: '#cf9036', cheek: 44, jaw: 38, chin: 47, tufts: true, eyeX: 19, eyeY: 1, eyeR: 8.0, noseY: 21, mw: 18, tongue: true, brows: 'fierce', marks: softMuzzle,
    armour: { helmet: '#0f6fff', helmet2: '#7ab3ff', plate: '#ff5c7a', plate2: '#b02a4a', lace: '#ffd23f', trim: '#ffd23f', crest: 'moon', crestFill: '#ffd23f', halo: ['#ff5c7a', '#ffd23f'], gear: 'katana', guitar: ['electric', 'mushroom'] },
  },
]
export const BREED_IDS = BREEDS.map(b => b.id)
export const breed = (id: BreedId) => BREEDS.find(b => b.id === id) ?? BREEDS[0]

// ---------- parts ----------
function headPath(b: Breed) {
  const c = b.cheek
  const side = b.tufts
    ? [[c, -4, c + 8, 8, c + 8, 10], [c + 8, 10, c - 1, 14, c - 1, 14], [c - 1, 14, c + 6, 26, c + 6, 26], [c + 6, 26, c * 0.62, b.jaw - 2, c * 0.62, b.jaw - 2]]
    : [[c, 16, c * 0.82, 32, c * 0.5, b.jaw]]
  return sym([0, -44], [[26, -44, c, -32, c, -6], ...side, [c * 0.28, b.chin - 2, 10, b.chin, 0, b.chin]])
}

function ear(b: Breed) {
  const f = b.earFill ?? b.fur
  switch (b.ear) {
    case 'pointy': return both(path('M30 -56 C40 -72 52 -84 62 -92 C68 -74 66 -52 56 -32 L38 -36Z', f) + path('M38 -54 C45 -66 52 -74 58 -80 C61 -68 60 -54 54 -42Z', b.inner, null))
    case 'big': return both(path('M26 -58 C38 -80 56 -100 72 -108 C80 -84 74 -56 58 -30 L36 -36Z', f) + path('M36 -56 C46 -74 58 -88 68 -96 C72 -78 68 -58 56 -40Z', b.inner, null))
    case 'tall': return both(path('M32 -60 C38 -84 46 -104 54 -114 C62 -96 62 -64 54 -34 L38 -38Z', f) + path('M39 -60 C43 -80 48 -94 53 -102 C57 -86 57 -64 51 -44Z', b.inner, null))
    case 'floppy': return both(path('M34 -30 C52 -36 64 -24 64 -2 C64 18 58 34 46 36 C38 30 36 10 36 -6Z', f))
    case 'long': return both(path('M34 -30 C54 -36 68 -20 68 8 C68 34 60 52 46 52 C38 42 36 18 36 -6Z', f))
    case 'feather': return both(path('M34 -30 C54 -36 66 -22 66 0 C67 14 70 24 64 30 C66 37 58 42 52 38 C50 45 42 42 40 34 C36 22 36 6 36 -6Z', f))
    case 'curly': return both([[54, -20, 11], [61, -4, 11], [59, 13, 11], [53, 28, 10], [45, 39, 8]].map(([x, y, r]) => circle(x, y, r, b.fur) + line(`M${x - r * 0.5} ${y} q${r * 0.25} ${-r * 0.5} ${r * 0.5} 0`, b.dark, 1.4)).join(''))
    case 'fold': return ''
  }
}
const foldEars = (b: Breed) => b.ear === 'fold' ? both(path('M36 -32 C46 -42 62 -42 66 -30 C62 -22 56 -16 48 -10 C45 -18 41 -26 36 -32Z', b.earFill ?? b.dark)) : ''

function eye(b: Breed, side: 1 | -1) {
  const r = b.eyeR
  const g = `<g transform="translate(${side * b.eyeX} ${b.eyeY}) scale(${side} 1)">` +
    path(`M${-r * 1.15} 0.6 Q0 ${-r * 1.3} ${r * 1.15} ${-r * 0.3} Q${r * 0.1} ${r * 1.2} ${-r * 1.15} 0.6Z`, '#12071f', INK, 1.6) +
    circle(r * 0.08, -r * 0.05, r * 0.7, b.iris, null) + circle(r * 0.08, -r * 0.05, r * 0.4, '#0a0410', null) +
    circle(-r * 0.22, -r * 0.35, r * 0.24, '#ffffff', null) + circle(r * 0.32, r * 0.22, r * 0.11, '#ffffff', null, 0, 'opacity=".8"') +
    `</g>`
  return g
}
function brows(b: Breed) {
  const r = b.eyeR, x = b.eyeX, y = b.eyeY
  let s = ''
  if (b.brows === 'dots' || b.brows === 'both') s += both(ellipse(x - 1, y - r * 1.75, r * 0.72, r * 0.42, b.browDot ?? b.fur2, null, 0, `transform="rotate(-14 ${x - 1} ${y - r * 1.75})"`))
  if (b.brows === 'fierce' || b.brows === 'both') s += both(line(`M${x - r * 1.25} ${y - r * 1.05} Q${x} ${y - r * 1.85} ${x + r * 1.35} ${y - r * 1.75}`, b.dark, 3.2))
  return s
}
function muzzle(b: Breed) {
  const r = b.mw * 0.52, py = b.noseY + 6, mw = b.mw
  const pads = b.pads ?? b.fur2
  let s = ''
  if (b.tongue) s += path(`M-8 ${py + r * 0.7} Q0 ${py + r * 0.5} 8 ${py + r * 0.7} L8.5 ${py + r * 0.7 + 12} Q0 ${py + r * 0.7 + 22} -8.5 ${py + r * 0.7 + 12}Z`, TONGUE, INK, 2) +
    line(`M0 ${py + r * 0.8} L0 ${py + r * 0.7 + 12}`, '#d23b72', 1.6)
  s += path(`M${-mw * 0.95} ${py - 2} C${-mw * 1.05} ${py + r * 1.2} ${-mw * 0.1} ${py + r * 1.25} 0 ${py + r * 0.55} C${mw * 0.1} ${py + r * 1.25} ${mw * 1.05} ${py + r * 1.2} ${mw * 0.95} ${py - 2} C${mw * 0.7} ${py - r * 0.9} ${-mw * 0.7} ${py - r * 0.9} ${-mw * 0.95} ${py - 2}Z`, pads, INK, 2)
  // whisker dots
  s += both([[0.35, 0.1], [0.55, 0.25], [0.42, 0.45]].map(([fx, fy]) => circle(mw * fx + 2, py + r * fy, 1.1, INK, null, 0, 'opacity=".55"')).join(''))
  const ny = b.noseY, nw = Math.max(7, b.mw * 0.48)
  s += line(`M0 ${ny + 6} L0 ${py + r * 0.55}`, INK, 2)
  s += path(`M${-nw} ${ny - 3} C${-nw} ${ny - 9} ${nw} ${ny - 9} ${nw} ${ny - 3} C${nw} ${ny + 2} 3 ${ny + 6} 0 ${ny + 7} C-3 ${ny + 6} ${-nw} ${ny + 2} ${-nw} ${ny - 3}Z`, '#170d1c', INK, 1.8)
  s += ellipse(-nw * 0.35, ny - 4.5, nw * 0.32, 1.7, '#ffffff', null, 0, 'opacity=".75"')
  return s
}
function paint(b: Breed) {
  const c = b.armour.paint
  if (!c) return ''
  const x = b.eyeX, y = b.eyeY + b.eyeR + 4
  return both(line(`M${x - 6} ${y} Q${x + 3} ${y + 4} ${x + 13} ${y - 2}`, c, 2.8) + line(`M${x - 3} ${y + 5.5} Q${x + 5} ${y + 9} ${x + 13} ${y + 4}`, c, 2.4, 'opacity=".85"'))
}

function crest(b: Breed) {
  const f = b.armour.crestFill, t = b.armour.trim
  switch (b.armour.crest) {
    case 'horns': return both(path('M3 -38 C10 -58 26 -80 36 -110 C38 -98 36 -88 32 -80 C24 -64 12 -52 6 -36Z', f, INK, 2.4)) + circle(0, -40, 7, t)
    case 'moon': return path('M-46 -78 Q0 -150 46 -78 Q0 -128 -46 -78Z', f, INK, 2.4) + path('M-3 -66 L3 -66 L3 -40 L-3 -40Z', t, INK, 1.6) + path('M-6 -46 L6 -46 L4 -34 L-4 -34Z', t, INK, 2) + circle(0, -50, 6, t)
    case 'sun': return `<g>${rays(14, 12, 25, f, 0.55, `transform="translate(0 -62)" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"`)}${circle(0, -62, 12.5, t)}${circle(0, -62, 6, f, INK, 1.4)}</g>` + path('M-4 -48 L4 -48 L3 -34 L-3 -34Z', t, INK, 1.8)
    case 'mushroom': return path('M-5 -56 L5 -56 L6 -36 L-6 -36Z', '#fff4e0', INK, 2) + path('M-20 -56 C-22 -80 -6 -88 0 -88 C6 -88 22 -80 20 -56 C10 -60 -10 -60 -20 -56Z', f, INK, 2.4) +
      [[-9, -72, 3.2], [5, -78, 2.6], [11, -65, 2.4], [-2, -64, 2]].map(([x, y, r]) => circle(x, y, r, '#fff4e0', null)).join('')
    case 'flame': return path('M0 -36 C-16 -48 -14 -70 -6 -78 C-8 -90 0 -102 -2 -114 C12 -100 20 -86 12 -72 C20 -64 16 -46 0 -36Z', f, INK, 2.4) + path('M0 -42 C-7 -50 -6 -62 -1 -68 C2 -60 8 -54 0 -42Z', '#ffd23f', null)
    case 'bolt': return path('M8 -112 L-14 -70 L-2 -70 L-10 -36 L16 -80 L3 -80 L14 -112Z', f, INK, 2.4)
    case 'eye': return `<g transform="translate(0 -64)">${rays(16, 13, 26, f, 0.45, `stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"`)}${path('M-18 0 Q0 -16 18 0 Q0 16 -18 0Z', '#fff8ea', INK, 2)}${circle(0, 0, 6.5, '#7a2cff', null)}${circle(0, 0, 3, INK, null)}${circle(-2, -2, 1.3, '#fff', null)}</g>` + path('M-4 -50 L4 -50 L3 -34 L-3 -34Z', t, INK, 1.8)
  }
}

function helmet(b: Breed, g: string) {
  const a = b.armour
  let s = ''
  // fukigaeshi: the turned-back wings at the sides
  s += both(path('M48 -46 C58 -52 70 -52 76 -44 C76 -33 71 -23 62 -16 C58 -25 53 -33 48 -36Z', a.plate, INK, 2.4) + circle(64, -36, 3.6, a.trim, INK, 1.4))
  // the bowl
  s += path('M-50 -30 C-52 -62 -30 -86 0 -88 C30 -86 52 -62 50 -30 C30 -25 -30 -25 -50 -30Z', `url(#${g})`, INK, 2.6)
  for (const k of [-2, -1, 0, 1, 2]) s += line(`M${k * 5} -86 Q${k * 15} -62 ${k * 21} -29`, a.helmet2, 1.5, 'opacity=".7"')
  for (let x = -40; x <= 40; x += 10) s += circle(x, -36 + (x * x) / 400, 1.7, a.trim, null)
  s += circle(0, -88, 4.5, a.trim, INK, 1.6)
  // the visor band
  s += path('M-56 -35 C-30 -27 30 -27 56 -35 L54 -28 C30 -19 -30 -19 -54 -28Z', a.trim, INK, 2.2)
  s += crest(b)
  return s
}

function body(b: Breed) {
  const a = b.armour
  let s = ''
  s += path('M-28 28 L28 28 L34 72 L-34 72Z', b.fur, INK, 2.4)
  // shoulder guards
  const sode = 'M44 56 C62 52 80 54 92 60 C96 78 98 96 98 118 L52 118 C50 98 48 76 44 56Z'
  let rows = ''
  for (const y of [72, 87, 102]) rows += line(`M${47 + (y - 56) * 0.12} ${y} Q72 ${y - 3} ${95 + (y - 60) * 0.05} ${y + 2}`, INK, 1.4) + line(`M${49 + (y - 56) * 0.12} ${y + 7} Q72 ${y + 4} ${95} ${y + 9}`, a.lace, 2.6, 'stroke-dasharray="1.5 3.5"')
  s += both(path(sode, a.plate, INK, 2.4) + rows + line('M46 58 C62 54 80 56 91 62', a.trim, 2.4))
  // chest plate
  s += path('M-50 60 C-20 52 20 52 50 60 L58 118 L-58 118Z', a.plate2, INK, 2.4)
  for (const y of [76, 92, 108]) {
    const w = 50 + (y - 60) * 0.14
    s += line(`M${-w} ${y} Q0 ${y - 6} ${w} ${y}`, INK, 1.4) + line(`M${-w + 2} ${y + 6} Q0 ${y} ${w - 2} ${y + 6}`, a.lace, 2.6, 'stroke-dasharray="1.5 3.5"')
  }
  // collar and the pick-shaped badge
  s += path('M-36 50 C-14 60 14 60 36 50 L32 60 C14 70 -14 70 -32 60Z', a.trim, INK, 2.2)
  s += circle(0, 86, 10.5, a.trim, INK, 2) + path('M0 79 C6 79 8.5 82 7.5 85.5 C6.5 89 3 92 0 94 C-3 92 -6.5 89 -7.5 85.5 C-8.5 82 -6 79 0 79Z', a.crestFill === a.trim ? a.lace : a.crestFill, INK, 1.4)
  return s
}

/** The guitar slung across the chest, neck under the chin, with a paw on the neck and one strumming. */
function guitar(b: Breed) {
  const [kind, paint] = b.armour.guitar
  const k = 1 / 0.6
  const paw = (x: number, y: number, rx: number, ry: number, rot: number) =>
    `<g transform="translate(${x} ${y}) rotate(${rot})">` + ellipse(0, 0, rx, ry, b.fur, INK, 2.4 * k) +
    line(`M${-rx * 0.35} ${-ry * 0.9} L${-rx * 0.35} ${-ry * 0.35} M${rx * 0.35} ${-ry * 0.9} L${rx * 0.35} ${-ry * 0.35}`, INK, 1.8 * k) + `</g>`
  return `<g class="dog-guitar" transform="translate(44 76) rotate(-70) scale(.6)">` +
    guitarShape({ kind, paint, trim: b.armour.trim, k }) +
    paw(16, 2, 15, 12, 70) + paw(0, -168, 11, 15, 0) + `</g>`
}

function shikoro(b: Breed) {
  const a = b.armour
  let s = ''
  for (let i = 2; i >= 0; i--) {
    const yt = -26 + i * 20, yb = yt + 22, wt = 52 + i * 9, wb = 60 + i * 10
    s += path(`M${-wt} ${yt} Q0 ${yt + 6} ${wt} ${yt} L${wb} ${yb} Q0 ${yb + 8} ${-wb} ${yb}Z`, i % 2 ? a.plate2 : a.plate, INK, 2.2)
    const ym = (yt + yb) / 2 + 1, wm = (wt + wb) / 2
    s += line(`M${-wm + 2} ${ym} Q0 ${ym + 7} ${wm - 2} ${ym}`, a.lace, 2.6, 'stroke-dasharray="1.5 3.5"')
  }
  return s
}

function gear(b: Breed) {
  const a = b.armour
  if (a.gear === 'katana') {
    let wrap = 'M-5 -44'
    for (let y = -40; y <= 8; y += 6) wrap += ` L${(y / 6) % 2 ? 5 : -5} ${y}`
    return `<g transform="translate(70 -20) rotate(20)">` +
      path('M-6 -46 L6 -46 L6 10 L-6 10Z', '#14081c', INK, 2.2) + line(wrap, a.lace, 2.2) +
      path('M-7 -53 L7 -53 L7 -45 L-7 -45Z', a.trim, INK, 2) + ellipse(0, 13, 14, 4.8, a.trim, INK, 2) + `</g>`
  }
  return ''
}

export interface DogOpts { halo?: boolean; frame?: 'portrait' | 'bust'; className?: string; place?: { x: number; y: number; w: number; h: number } }

/** One samurai dog as an SVG string. `bust` crops to the head and shoulders (round avatars). */
export function dogSvg(id: BreedId, o: DogOpts = {}): string {
  const b = breed(id)
  const g = uid('hg'), h = uid('ha'), clip = uid('hc')
  const hp = headPath(b)
  const vb = o.frame === 'bust' ? '-98 -112 196 196' : '-104 -120 208 240'
  const at = o.place ? ` x="${o.place.x}" y="${o.place.y}" width="${o.place.w}" height="${o.place.h}"` : ''
  let s = `<svg xmlns="http://www.w3.org/2000/svg"${at} viewBox="${vb}" class="psy-dog dog-${b.id} ${o.className ?? ''}" aria-hidden="true">`
  s += `<defs><linearGradient id="${g}" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="${b.armour.helmet2}"/><stop offset=".55" stop-color="${b.armour.helmet}"/></linearGradient>` +
    `<radialGradient id="${h}" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="${b.armour.halo[0]}"/><stop offset="1" stop-color="${b.armour.halo[1]}"/></radialGradient>` +
    `<clipPath id="${clip}"><path d="${hp}"/></clipPath></defs>`
  if (o.halo) {
    s += `<circle cx="0" cy="-10" r="${o.frame === 'bust' ? 92 : 104}" fill="url(#${h})"/>`
    s += `<g class="dog-rays">${rays(20, 16, 150, '#ffffff', 0.5, 'opacity=".2"')}</g>`
    s += `<circle cx="0" cy="-10" r="86" fill="none" stroke="#ffffff" stroke-opacity=".4" stroke-width="1.6" stroke-dasharray="2 6"/>`
  }
  s += gear(b) + shikoro(b) + body(b)
  s += `<g class="dog-head">` + ear(b) + path(hp, b.fur) + `<g clip-path="url(#${clip})">${b.marks ? b.marks(b) : ''}</g>` + path(hp, 'none') +
    paint(b) + brows(b) + eye(b, 1) + eye(b, -1) + muzzle(b) + foldEars(b) + helmet(b, g) + `</g>` + guitar(b)
  return s + `</svg>`
}
