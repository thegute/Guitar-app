// Scanner lab, one video: the app's own video path (tabFromVideo → tab_crnn → the sound as referee) on a downloaded
// Short, then every note the reader was sure of is checked against what the video's sound plays at that moment.
//   - pieces where EVERY note column is confirmed by the sound → training strips (picture + labels, the trainer's format)
//   - columns where the sound clearly prefers another reading → "hard" cases (for looking at, never trained on blind)
//   - an agreement score for the video (confirmed / checked): the lab's yardstick for "is the scanner getting better"
// Needs the app's dev server (npx vite --port 5179) in the folder of a KGuitar checkout. Run by run-lab.sh:
//   node tools/scan-lab/scan-lab.cjs <video file> <out dir> [model.onnx]
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const [video, outDir, model] = process.argv.slice(2)
const PORT = process.env.LAB_PORT || 5179
fs.mkdirSync(outDir, { recursive: true })
;(async () => {
  const b = await chromium.launch()
  const page = await b.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.route('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/**', r => {
    const f = path.join(process.cwd(), 'node_modules/onnxruntime-web/dist', path.basename(new URL(r.request().url()).pathname))
    r.fulfill({ body: fs.readFileSync(f), contentType: f.endsWith('.wasm') ? 'application/wasm' : 'text/javascript' })
  })
  if (model) await page.route('**/models/tab-crnn/tab_crnn.onnx', r => r.fulfill({ body: fs.readFileSync(model), contentType: 'application/octet-stream' }))
  await page.route('**/__lab_video', r => r.fulfill({ body: fs.readFileSync(video), contentType: video.endsWith('.webm') ? 'video/webm' : 'video/mp4' }))
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' })
  const res = await page.evaluate(async () => {
    const { tabFromVideo, soundOf } = await import('/src/scan/pictures.ts')
    const { readTabCrnn } = await import('/src/scan/crnnRead.ts')
    const { inkDark } = await import('/src/scan/image.ts')
    const { soundFor } = await import('/src/scan/tabReadSong.ts')
    const { tabCrnnRunner } = await import('/src/ml/models.ts')
    globalThis.__crnnDbg = []
    const blob = await (await fetch('/__lab_video')).blob()
    const vt = await tabFromVideo(blob)
    let snd = null
    try { snd = await soundOf(blob, new OfflineAudioContext(1, 44100, 44100)) } catch { /* no sound */ }
    const run = await tabCrnnRunner()
    const tuning = [40, 45, 50, 55, 59, 64]
    const hearFor = snd ? await soundFor({ x: snd.x, sr: snd.sr, timelines: vt.timelines ?? [], views: vt.views }, tuning) : null
    const toPng = (px, W, H) => {
      const c = document.createElement('canvas'); c.width = W; c.height = H
      const id = c.getContext('2d').createImageData(W, H)
      for (let i = 0; i < W * H; i++) { const v = Math.max(0, Math.min(255, px[i] * 255)); id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255 }
      c.getContext('2d').putImageData(id, 0, 0)
      return c.toDataURL('image/png')
    }
    const pieces = [], hard = [], steps = [], colLog = []
    const why = {}
    let corrected = 0, settled = 0
    let checked = 0, confirmed = 0, contradicted = 0, notes = 0
    // 1. read every strip, keeping each straightened piece and its note columns
    const work = []
    for (const [i, g0] of vt.strips.entries()) {
      const g = inkDark(g0) // as the app reads it: dark ink on a light ground
      let h = hearFor ? hearFor(i) : {}
      if (hearFor && !h.hear) { const first = await readTabCrnn(g, run); h = hearFor(i, first) }
      const seen = []
      const reading = await readTabCrnn(g, run, { ...h, onPiece: p => seen.push(p) })
      for (const sy of reading.systems) for (const bar of sy.bars) for (const st of bar.steps) if (st.notes.length) steps.push(st.notes.filter(n => !n.dead).map(n => tuning[n.string] + n.fret).sort((a, b) => a - b))
      for (const p of seen) work.push({ i, p, hear: h.hear })
    }
    // 2. the sound at a column: the note's MIDI salience relative to the loudest note then, over a short stretch round t
    // the plain hearing (one short look just after t), not the app's smeared one: neighbouring notes stay out of it
    const { hearing } = await import('/src/scan/hear.ts')
    const plain = snd ? hearing(snd.x, snd.sr, 16384) : null
    const relAt = (hear, t, midis) => {
      const sal = plain(t)
      if (!sal) return null
      let top = 1e-9
      for (let m = 36; m <= 90; m++) top = Math.max(top, sal(m))
      return m => sal(m) / top
    }
    const midisOf = (p, c, hear) => c.frets.filter(f => !f.dead).map(f => hear.tuning[p.nStr - 1 - f.slot] + f.fret)
    // where a video "plays" a column differs from where the playhead line is drawn (a note sounds when it touches the
    // line, or when its middle crosses it, or a little before): find this video's offset from the columns themselves
    const shifts = []
    for (const { p, hear } of work) if (hear) for (const c of p.cols) {
      if (c.kind !== 'note' || !c.frets.every(f => f.sure)) continue
      const t0 = hear.when(p.toPage(c.u) + p.xOffset)
      if (t0 === null || t0 === undefined) continue
      const ms = midisOf(p, c, hear)
      if (!ms.length) continue
      let best = -1, bestD = 0
      for (let d = -0.5; d <= 0.5001; d += 0.04) { const r = relAt(hear, t0 + d, ms); if (!r) continue; const v = Math.min(...ms.map(r)); if (v > best + 0.03 || (v > best - 0.03 && Math.abs(d) < Math.abs(bestD))) { best = Math.max(best, v); bestD = d } }
      if (best >= 0.6) shifts.push(bestD)
    }
    shifts.sort((x, y) => x - y)
    const offset = shifts.length >= 5 ? shifts[shifts.length >> 1] : 0
    // 3. check every column at its time (+ the offset, give or take a little)
    for (const { i, p, hear } of work) {
      let all = true, any = 0
      const labels = []
      const noteCols = p.cols.filter(c => c.kind === 'note')
      for (const c of p.cols) {
        if (c.kind !== 'note') { labels.push({ x: c.u, kind: c.kind, frets: {}, dur: null, dots: 0, tup: 0, grace: 0, stroke: 0 }); continue }
        notes++
        const frets = {}
        for (const f of c.frets) frets[f.slot] = f.dead ? 'x' : f.fret
        labels.push({ x: c.u, kind: 'note', frets, dur: null, dots: 0, tup: 0, grace: c.grace ? 1 : 0, stroke: c.stroke })
        const t0 = hear ? hear.when(p.toPage(c.u) + p.xOffset) : null
        if (t0 === null || t0 === undefined) { all = false; continue }
        const ms = midisOf(p, c, hear)
        // the moment near t0 + offset where this reading sounds best (a column's own time is only known to ~0.1 s)
        let rel = null, best = -1
        for (let d = -0.15; d <= 0.1501; d += 0.025) { const r = relAt(hear, t0 + offset + d, ms); if (!r) continue; const v = ms.length ? Math.min(...ms.map(r)) : 0; if (v > best) { best = v; rel = r } }
        colLog.push({ x: Math.round(p.toPage(c.u) + p.xOffset), t: t0 + offset, midis: ms, best: +best.toFixed(2) })
        if (!rel) { all = false; continue }
        const single = c.frets.length === 1
        // an alternative reading that is really another note sounding (this chord, or the notes either side): no doubt
        const k = noteCols.indexOf(c)
        const near = new Set([c, noteCols[k - 1], noteCols[k + 1]].filter(Boolean).flatMap(cc => midisOf(p, cc, hear)).flatMap(m => [m, m - 12, m + 12, m + 19, m + 24]))
        let colOk = true, colBad = false
        for (const f of c.frets) {
          if (f.dead) continue
          const string = p.nStr - 1 - f.slot
          const thr = single ? 0.6 : 0.4
          const mine = rel(hear.tuning[string] + f.fret)
          const others = f.alts.filter(a => !a.dead && a.fret !== f.fret)
          const altBest = Math.max(0, ...others.filter(a => !near.has(hear.tuning[string] + a.fret)).map(a => rel(hear.tuning[string] + a.fret)))
          checked++
          if (f.sure && mine >= thr && mine >= altBest * 1.25) { confirmed++; continue }
          // the reader was unsure, or read another number than the one heard: when the sound settles it beyond doubt,
          // the heard number becomes the label (these are the pictures the reader most needs to learn from)
          const opts = [f.fret, ...others.map(a => a.fret)].filter((v, k, arr) => arr.indexOf(v) === k)
            .map(fr => ({ fr, r: rel(hear.tuning[string] + fr) })).sort((x, y) => y.r - x.r)
          const rival = opts.slice(1).filter(o => !near.has(hear.tuning[string] + o.fr) || hear.tuning[string] + o.fr === hear.tuning[string] + opts[0].fr)
          const second = rival.length ? rival[0].r : 0
          if (opts[0].r >= Math.max(0.7, thr) && opts[0].r >= second * 1.6 && !(opts[0].fr !== f.fret && near.has(hear.tuning[string] + opts[0].fr) && midisOf(p, c, hear).filter(m => m === hear.tuning[string] + opts[0].fr).length)) {
            if (opts[0].fr !== f.fret) { frets[f.slot] = opts[0].fr; corrected++ } else settled++
            continue
          }
          colOk = false
          const reason = !f.sure ? 'unsure' : mine < thr ? 'quiet' : 'alt'
          why[reason] = (why[reason] || 0) + 1
          if (altBest >= 0.6 && altBest > mine * 1.6) { colBad = true; contradicted++ }
        }
        if (!colOk) all = false
        if (colBad) { const png = toPng(p.px, p.W, 160); hard.push({ strip: i, x: Math.round(p.toPage(c.u) + p.xOffset), read: c.frets.map(f => `${p.nStr - 1 - f.slot}:${f.dead ? 'x' : f.fret}`).join(' '), alts: c.frets.map(f => f.alts.map(a => a.fret).join('/')).join(' '), png: png.length < 4e5 ? png : null }) }
        any++
      }
      if (all && any >= 3) pieces.push({ png: toPng(p.px, p.W, 160), W: p.W, nstr: p.nStr, cols: labels })
    }
    return { corrected, settled, why, offset, colLog, steps, dbg: globalThis.__crnnDbg, strips: vt.strips.length, frames: vt.frames, sound: !!snd, notes, checked, confirmed, contradicted, pieces, hard }
  })
  if (process.env.LAB_DEBUG) console.log(res.dbg.join('\n'), '\nwhy not confirmed', JSON.stringify(res.why), 'offset', res.offset)
  if (process.env.LAB_DEBUG) fs.writeFileSync(path.join(outDir, 'cols.json'), JSON.stringify(res.colLog))
  // a made-up test video (tools/scan-lab/fakeshort.py) comes with the right answer: score the reading against it
  let truthScore = null
  if (fs.existsSync(video + '.truth.json')) {
    const want = JSON.parse(fs.readFileSync(video + '.truth.json', 'utf8')).truth.map(t => t.notes.slice().sort((a, b) => a - b).join(','))
    const got = res.steps.map(s => s.join(','))
    const L = Array.from({ length: want.length + 1 }, () => new Int32Array(got.length + 1))
    for (let i = 1; i <= want.length; i++) for (let j = 1; j <= got.length; j++) L[i][j] = want[i - 1] === got[j - 1] ? L[i - 1][j - 1] + 1 : Math.max(L[i - 1][j], L[i][j - 1])
    const right = L[want.length][got.length]
    truthScore = { want: want.length, got: got.length, right, recall: +(100 * right / want.length).toFixed(1), precision: got.length ? +(100 * right / got.length).toFixed(1) : 0 }
    console.log(`against the right answer: ${right} of ${want.length} chords/notes right (${truthScore.recall}%), ${got.length} read (${truthScore.precision}% of them right)`)
    if (process.env.LAB_DEBUG) console.log('want', want.join(' | '), '\ngot ', got.join(' | '))
  }
  const stem = path.basename(video).replace(/\.[^.]+$/, '')
  const save = (url, f) => fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'))
  const labels = []
  res.pieces.forEach((p, k) => {
    const file = `${stem}-${k}.png`
    save(p.png, path.join(outDir, file))
    labels.push(JSON.stringify({ file, nstr: p.nstr, rhythm: true, cols: p.cols }))
  })
  fs.writeFileSync(path.join(outDir, 'labels.jsonl'), labels.join('\n') + (labels.length ? '\n' : ''))
  res.hard.forEach((hd, k) => { if (hd.png) save(hd.png, path.join(outDir, `hard-${k}.png`)); delete hd.png })
  const summary = { video: path.basename(video), soundOffset: res.offset, strips: res.strips, frames: res.frames, sound: res.sound, notes: res.notes, checked: res.checked, confirmed: res.confirmed, contradicted: res.contradicted, agreement: res.checked ? +(100 * res.confirmed / res.checked).toFixed(1) : null, trainingPieces: res.pieces.length, corrected: res.corrected, settledBySound: res.settled, truth: truthScore, hard: res.hard, errors }
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 1))
  console.log(`${summary.video}: ${res.notes} notes, ${summary.agreement ?? '-'}% agree with the sound, ${res.pieces.length} training pieces (${res.corrected} numbers corrected by the sound), ${res.hard.length} hard cases${errors.length ? `, ${errors.length} page errors` : ''}`)
  await b.close()
})().catch(e => { console.error('scan-lab failed:', e.message); process.exit(1) })
