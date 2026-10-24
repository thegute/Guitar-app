// Writes an HTML page with every piece of Psychedelic art, for looking at it while drawing:
//   npx -y esbuild@0.25 tools/psy-gallery.ts --bundle --platform=node --format=esm --outfile=node_modules/.tmp/g.mjs && node node_modules/.tmp/g.mjs out.html
import { writeFileSync } from 'fs'
import { BREEDS, dogSvg } from '../src/art/dogs'
import * as scenes from '../src/art/scenes'

const out = process.argv[2] ?? 'gallery.html'
const cell = (label: string, svg: string, w = 220) => `<figure style="width:${w}px"><div class="art">${svg}</div><figcaption>${label}</figcaption></figure>`
let html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:16px;background:#14002b;color:#fff;font:14px system-ui;display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start}
figure{margin:0;background:#1c0641;border:1px solid #ff3fd855;border-radius:12px;padding:8px}
.art > svg{width:100%;height:auto;display:block} figcaption{text-align:center;margin-top:4px;color:#e7dcff}
h2{width:100%;margin:8px 0 0;color:#ffe9a8}
</style>`
const only = process.argv[3]
if (!only || only === 'dogs') {
  html += '<h2>Portraits</h2>' + BREEDS.map(b => cell(b.name, dogSvg(b.id, { halo: true }))).join('')
  html += '<h2>Busts, no halo</h2>' + BREEDS.map(b => cell(b.name, dogSvg(b.id, { frame: 'bust' }), 140)).join('')
}
if (!only || only === 'scenes') {
  html += '<h2>Scenes</h2>'
  for (const [name, fn] of Object.entries(scenes)) {
    if (typeof fn !== 'function' || !name.endsWith('Svg') || fn.length > 0) continue
    html += cell(name, (fn as () => string)(), /wave|band|parade|scene/i.test(name) ? 600 : 260)
  }
}
writeFileSync(out, html)
console.log('wrote', out)
