// Big views of a few pieces: node out.mjs out.html dogs:lab,shiba  or  scene:sunSvg,moonSvg
import { writeFileSync } from 'fs'
import { dogSvg, type BreedId } from '../src/art/dogs'
import * as scenes from '../src/art/scenes'
const [, , out, what] = process.argv
const [kind, list] = what.split(':')
let html = '<!doctype html><meta charset="utf-8"><body style="margin:0;padding:10px;background:#14002b;display:flex;flex-wrap:wrap;gap:10px">'
for (const id of list.split(',')) {
  const svg = kind === 'dogs' ? dogSvg(id as BreedId, { halo: true }) : (scenes as Record<string, unknown>)[id] ? ((scenes as Record<string, (o?: unknown) => string>)[id])() : ''
  html += `<div style="width:${kind === 'dogs' ? 480 : 620}px;background:#1c0641">${svg.replace('<svg ', '<svg style="width:100%;height:auto;display:block" ')}</div>`
}
writeFileSync(out, html)
