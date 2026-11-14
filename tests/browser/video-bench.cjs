// Riff Scanner video scoreboard: a test video (tools/scanner-bench/make-video.py) through the app's own video path
// (tabFromVideo: find the tab, follow the scroll, middle value per pixel) and both readers; the readings are written as
// JSON for tools/scanner-bench/pictures-vs-gp.ts to score against the Guitar Pro file.
//   npx vite --port 5179 &   (dev server: the page imports the app's modules directly)
//   node tests/browser/video-bench.cjs <video.webm> <out-prefix>   → <out-prefix>-trained.json, <out-prefix>-matcher.json
// The trained reader needs public/models/tab-crnn/tab_crnn.onnx.
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const [video, outp] = process.argv.slice(2)
;(async () => {
  const b = await chromium.launch()
  const page = await b.newPage()
  page.on('pageerror', e => console.log('page error:', e.message))
  // ONNX Runtime's WebAssembly from node_modules (the app fetches it from the CDN)
  await page.route('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/**', r => {
    const f = path.join(__dirname, '../../node_modules/onnxruntime-web/dist', path.basename(new URL(r.request().url()).pathname))
    r.fulfill({ body: fs.readFileSync(f), contentType: f.endsWith('.wasm') ? 'application/wasm' : 'text/javascript' })
  })
  await page.route('**/__bench_video', r => r.fulfill({ body: fs.readFileSync(video), contentType: 'video/webm' }))
  await page.goto('http://localhost:5179/', { waitUntil: 'load' })
  const res = await page.evaluate(async () => {
    const { tabFromVideo } = await import('/src/scan/pictures.ts')
    const { readTabCrnn } = await import('/src/scan/crnnRead.ts')
    const { readTab } = await import('/src/scan/tabRead.ts')
    const { deskew } = await import('/src/scan/image.ts')
    const { tabCrnnRunner } = await import('/src/ml/models.ts')
    const blob = await (await fetch('/__bench_video')).blob()
    const t0 = performance.now()
    const vt = await tabFromVideo(blob)
    const t1 = performance.now()
    const ser = r => r.systems.map(s => ({ bars: s.bars.map(b => ({ steps: b.steps.map(st => ({ dur: st.dur, notes: st.notes.map(n => ({ string: n.string, fret: n.fret, ...(n.dead ? { dead: true } : {}) })) })) })) }))
    const { dropRepeats } = await import('/src/scan/tabReadSong.ts')
    const run = await tabCrnnRunner()
    const tr = [], mt = []
    for (const g of vt.strips) { tr.push(await readTabCrnn(g, run)); mt.push(readTab(deskew(g).g)) }
    const perStrip = tr.map(r => r.notes)
    // the same with the sound as referee (the video's own sound track; standard tuning)
    let heard = null
    try {
      const { soundOf } = await import('/src/scan/pictures.ts')
      const { hearing } = await import('/src/scan/hear.ts')
      const { timeOf } = await import('/src/scan/crnnRead.ts')
      const snd = await soundOf(blob, new OfflineAudioContext(1, 44100, 44100))
      if (snd && vt.timelines) {
        const at = hearing(snd.x, snd.sr)
        const hr = []
        for (const [i, g] of vt.strips.entries()) hr.push(await readTabCrnn(g, run, { hear: { at, when: timeOf(vt.timelines[i] || []), tuning: [40, 45, 50, 55, 59, 64] } }))
        heard = dropRepeats(hr).flatMap(ser)
      }
    } catch (e) { heard = String(e) }
    const trained = dropRepeats(tr).flatMap(ser), matcher = dropRepeats(mt).flatMap(ser)
    // the first strip's start, as a PNG, to look at
    const g0 = vt.strips[0], cw = Math.min(g0.w, 3000)
    const c = document.createElement('canvas'); c.width = cw; c.height = g0.h
    const id = c.getContext('2d').createImageData(cw, g0.h)
    for (let y = 0; y < g0.h; y++) for (let x = 0; x < cw; x++) { const v = g0.px[y * g0.w + x] * 255; const i = (y * cw + x) * 4; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255 }
    c.getContext('2d').putImageData(id, 0, 0)
    const peek = c.toDataURL('image/png')
    // the whole first strip as 8-bit grey (for looking into it outside the browser)
    const gray = btoa(Array.from(g0.px, v => String.fromCharCode(Math.max(0, Math.min(255, Math.round(v * 255))))).join(''))
    return { heard, tl: (vt.timelines || []).map(t => t.length), trace: vt.trace, perStrip, gray, gw: g0.w, gh: g0.h, peek, strips: vt.strips.map(g => `${g.w}×${g.h}`), frames: vt.frames, kept: vt.kept, scrolled: vt.scrolled, secs: Math.round((t1 - t0) / 100) / 10, readSecs: Math.round((performance.now() - t1) / 100) / 10, trained, matcher }
  })
  if (process.env.TRACE) console.log(res.trace.join(' '))
  console.log(`notes per strip ${res.perStrip.join(' ')} · frames ${res.frames}, kept ${res.kept}, scrolled ${res.scrolled}, strips ${res.strips.join(' ')}, video ${res.secs} s, reading ${res.readSecs} s`)
  { const head = Buffer.alloc(8); head.writeUInt32LE(res.gw, 0); head.writeUInt32LE(res.gh, 4); fs.writeFileSync(`${outp}-strip.gray`, Buffer.concat([head, Buffer.from(res.gray, 'base64')])) }
  fs.writeFileSync(`${outp}-strip.png`, Buffer.from(res.peek.split(',')[1], 'base64'))
  if (Array.isArray(res.heard)) fs.writeFileSync(`${outp}-heard.json`, JSON.stringify(res.heard)); else console.log('sound:', res.heard)
  console.log('timeline points per strip', res.tl.join(' '))
  fs.writeFileSync(`${outp}-trained.json`, JSON.stringify(res.trained))
  fs.writeFileSync(`${outp}-matcher.json`, JSON.stringify(res.matcher))
  await b.close()
})().catch(e => { console.error(e); process.exit(1) })
