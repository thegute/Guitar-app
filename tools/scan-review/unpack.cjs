// Unpack a "Send for review" file from the Riff Scanner: one folder per scan with its pictures, strips and a summary
// (what went wrong in the owner's words, how it was read, and every note the owner changed).
//   node tools/scan-review/unpack.cjs KGuitar-scan-review-….json [out folder]
const fs = require('fs'), path = require('path')
const [file, outDir = file.replace(/\.json$/, '')] = process.argv.slice(2)
const j = JSON.parse(fs.readFileSync(file, 'utf8'))
const notes = song => (song.tracks[0]?.bars ?? []).flatMap((b, bi) => b.steps.flatMap((st, si) => st.notes.map(n => ({ bar: bi + 1, step: si, string: n.string, fret: n.fret, unsure: !!n.unsure, src: n.src }))))
const save = (p, url) => { const m = /^data:([^;]+);base64,(.*)$/.exec(url); if (m) fs.writeFileSync(p + (m[1].includes('png') ? '.png' : m[1].includes('webp') ? '.webp' : '.jpg'), Buffer.from(m[2], 'base64')) }
for (const [i, r] of j.reviews.entries()) {
  const dir = path.join(outDir, `${String(i + 1).padStart(2, '0')}-${r.title.replace(/[^\w-]+/g, '_').slice(0, 40)}`)
  fs.mkdirSync(dir, { recursive: true })
  r.sources.forEach((p, k) => save(path.join(dir, `picture-${k}`), p.url))
  r.strips.forEach((p, k) => save(path.join(dir, `strip-${k}`), p.url))
  const a = notes(r.first), b = notes(r.now)
  const key = n => `${n.bar}:${n.step}:${n.string}`
  const bm = new Map(b.map(n => [key(n), n])), am = new Map(a.map(n => [key(n), n]))
  const diffs = [...a.filter(n => !bm.has(key(n))).map(n => `removed bar ${n.bar} step ${n.step} string ${n.string} fret ${n.fret}`),
    ...b.filter(n => !am.has(key(n))).map(n => `added   bar ${n.bar} step ${n.step} string ${n.string} fret ${n.fret}`),
    ...a.filter(n => bm.has(key(n)) && bm.get(key(n)).fret !== n.fret).map(n => `changed bar ${n.bar} step ${n.step} string ${n.string}: ${n.fret} → ${bm.get(key(n)).fret}`)]
  fs.writeFileSync(path.join(dir, 'summary.md'), [
    `# ${r.title}`, '', `- when: ${new Date(r.at).toISOString()}`, `- source: ${r.source ?? '(none)'}`, `- how: ${r.how}`, `- instrument: ${r.instrument} ${JSON.stringify(r.tuning)}`,
    `- problems: ${r.problems.join(', ') || '(none ticked)'}`, `- owner's note: ${r.note || '(none)'}`,
    `- notes first read: ${a.length} (${a.filter(n => n.unsure).length} unsure), now: ${b.length}; pictures ${r.sources.length}, strips ${r.strips.length}`,
    '', '## Owner\'s fixes', ...(diffs.length ? diffs.map(d => `- ${d}`) : ['(none)']), '', r.text ? '## AI text\n```\n' + r.text + '\n```' : '',
  ].join('\n'))
  fs.writeFileSync(path.join(dir, 'review.json'), JSON.stringify({ ...r, sources: r.sources.map(p => ({ w: p.w, h: p.h })), strips: r.strips.map(p => ({ w: p.w, h: p.h })) }, null, 1))
  console.log(`${dir}: ${r.problems.join(', ')} · ${diffs.length} fix(es)`)
}
