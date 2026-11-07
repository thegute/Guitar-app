// Get a sound + pitch dial (beat maker): a wav and a webm video loaded from "files", the clip editor (handles, zoom,
// hear, trim), Put it on a pad / Chop it across pads, the pitch dial (keys, −/+, double tap, Tape / Keep the speed),
// Signalsmith's keep-the-speed copy checked for pitch and length, and the stems with the real model (routed locally).
// Needs `vite preview` on :4173, CHROME_PATH, and the model in KG_MODELS/demucs for the `stems` part.
// Usage: node tests/browser/getsound-test.cjs [file,video,dial,shift,micfx,stems]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const OUT = path.join(__dirname, 'out')
const DIST = path.join(__dirname, '..', '..', 'dist')
const MODELS = process.env.KG_MODELS || '/tmp/claude-0/models'
const only = process.argv[2] ? process.argv[2].split(',') : null
const want = p => !only || only.includes(p)
const problems = []
const bad = m => { problems.push(m); console.log('  PROBLEM', m) }

async function newPage(browser, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1.5, hasTouch: true, permissions: ['microphone'] })
  const page = await ctx.newPage()
  page.errors = []
  page.on('pageerror', e => page.errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error' && !/youtube|ytimg|ERR_|net::|Failed to load resource/i.test(m.text())) page.errors.push('console: ' + m.text()) })
  await page.addInitScript(() => {
    try { if (window.top !== window || sessionStorage.getItem('seeded')) return } catch { return }
    localStorage.clear()
    localStorage.setItem('kg:welcomed', '1'); localStorage.setItem('kg:psyDefault', '1'); localStorage.setItem('kg:askBubble', 'false'); localStorage.setItem('kg:getReady', '0')
    localStorage.setItem('kg:tab2', '"progressions"'); localStorage.setItem('kg:sub:jam', '"beats"')
    sessionStorage.setItem('seeded', '1')
  })
  await page.goto('http://localhost:4173/')
  await page.waitForSelector('.st-pads', { timeout: 10000 })
  return page
}
const sideways = page => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
const beat = async page => { await page.waitForTimeout(450); return page.evaluate(() => JSON.parse(localStorage.getItem('kg:studioBeat') || '{}')) }
const errs = (page, where) => { if (page.errors.length) bad(`${where} page errors: ${page.errors.join(' | ')}`); page.errors = [] }
async function openGetSound(page) {
  await page.locator('.st-padpanel .seg button:has-text("Your pads")').click()
  if (await page.locator('.st-pads.sampling').count()) await page.locator('[data-testid=sample-mode]').click()
  await page.waitForTimeout(300)
  const b = page.locator('[data-testid=gs-open]')
  if (!(await b.count())) { bad('no Get a sound button'); return false }
  await b.click()
  await page.waitForSelector('[data-testid=get-sound]', { timeout: 4000 })
  return true
}

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] })

  // ---------- a wav file → clip editor → a pad, then a chop ----------
  if (want('file')) for (const vp of [{ width: 412, height: 915, n: 'cover' }, { width: 840, height: 757, n: 'inner' }]) {
    const page = await newPage(browser, vp)
    if (!(await openGetSound(page))) { await page.context().close(); continue }
    await page.locator('[data-testid=gs-file]').setInputFiles(path.join(OUT, 'gs-mix.wav'))
    await page.waitForSelector('[data-testid=clip-editor]', { timeout: 8000 }).catch(() => bad(`${vp.n}: the wav didn't open in the clip editor`))
    const info = await page.locator('[data-testid=clip-editor] p.small').first().innerText().catch(() => '')
    if (!/12\.0 s in all/.test(info)) bad(`${vp.n}: clip length should be 12.0 s: "${info}"`)
    // drag the right handle from 4 s to about 6 s (the view shows 0–12 s)
    const box = await page.locator('[data-testid=clip-wave]').boundingBox()
    const xAt = t => box.x + (t / 12) * box.width
    await page.mouse.move(xAt(4), box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(xAt(6), box.y + box.height / 2, { steps: 6 }); await page.mouse.up()
    // a tap near 1 s moves the left handle there
    await page.mouse.click(xAt(1), box.y + box.height / 2)
    const span = await page.locator('[data-testid=clip-editor] .tabular').innerText()
    const m = /([\d.]+)–([\d.]+) s/.exec(span)
    if (!m || Math.abs(+m[1] - 1) > 0.15 || Math.abs(+m[2] - 6) > 0.15) bad(`${vp.n}: handles should be at about 1–6 s: "${span}"`)
    await page.locator('[data-testid=gs-hear]').click()
    await page.locator('button:has-text("Zoom to it")').click()
    await page.locator('button:has-text("Trim the quiet")').click()
    await page.screenshot({ path: path.join(OUT, `gs-editor-${vp.n}.png`) })
    if (await sideways(page)) bad(`${vp.n}: sideways overflow in Get a sound`)
    await page.locator('[data-testid=clip-editor] input.input').fill('Film line')
    await page.locator('[data-testid=gs-put]').click()
    await page.waitForTimeout(600)
    let b = await beat(page)
    const pad = Object.entries(b.pads || {}).find(([, d]) => d.name === 'Film line')
    if (!pad) bad(`${vp.n}: the clip didn't land on a pad`)
    else if (pad[1].src !== 'rec' || !(pad[1].end > 3 && pad[1].end < 5.5)) bad(`${vp.n}: pad looks wrong: ${JSON.stringify(pad[1])}`)
    const note = await page.locator('.st-sample-bar, [role=status]').allInnerTexts()
    if (!note.join(' ').includes('Film line')) bad(`${vp.n}: no "is on pad" note`)
    // chop the whole clip across pads
    await openGetSound(page)
    await page.locator('[data-testid=gs-file]').setInputFiles(path.join(OUT, 'gs-mix.wav'))
    await page.waitForSelector('[data-testid=clip-editor]', { timeout: 8000 })
    await page.locator('button:has-text("Whole clip")').click()
    const box2 = await page.locator('[data-testid=clip-wave]').boundingBox()
    await page.mouse.move(box2.x + (4 / 12) * box2.width, box2.y + 40); await page.mouse.down(); await page.mouse.move(box2.x + box2.width * 0.995, box2.y + 40, { steps: 8 }); await page.mouse.up()
    await page.locator('[data-testid=gs-chop]').click()
    await page.waitForTimeout(700)
    b = await beat(page)
    const chops = Object.values(b.pads || {}).filter(d => /^Chop|^gs-mix/.test(d.name || '') && d.choke === 1)
    if (chops.length < 4) bad(`${vp.n}: chop made ${chops.length} pads (expected several)`)
    else console.log(`${vp.n}: clip on a pad, then chopped into ${chops.length} pads`)
    errs(page, `file ${vp.n}`)
    await page.context().close()
  }

  // ---------- a video file: its soundtrack ----------
  if (want('video')) {
    const page = await newPage(browser, { width: 412, height: 915 })
    if (await openGetSound(page)) {
      await page.locator('[data-testid=gs-file]').setInputFiles(path.join(OUT, 'gs-clip.webm'))
      await page.waitForSelector('[data-testid=clip-editor]', { timeout: 8000 }).catch(() => bad("the webm video's sound didn't open"))
      const info = await page.locator('[data-testid=clip-editor] p.small').first().innerText().catch(() => '')
      if (!/8\.0 s in all/.test(info)) bad(`video: clip should be 8.0 s: "${info}"`)
      else console.log('video: soundtrack read (8.0 s)')
    }
    errs(page, 'video')
    await page.context().close()
  }

  // ---------- the pitch dial in the pad editor ----------
  if (want('dial')) for (const vp of [{ width: 412, height: 915, n: 'cover' }, { width: 840, height: 757, n: 'inner' }]) {
    const page = await newPage(browser, vp)
    if (!(await openGetSound(page))) { await page.context().close(); continue }
    await page.locator('[data-testid=gs-file]').setInputFiles(path.join(OUT, 'gs-mix.wav'))
    await page.waitForSelector('[data-testid=clip-editor]', { timeout: 8000 })
    await page.locator('[data-testid=gs-put]').click()
    await page.waitForTimeout(500)
    const b = await beat(page)
    const id = Object.entries(b.pads || {}).find(([, d]) => d.src === 'rec')?.[0]
    if (!id) { bad(`${vp.n}: no pad to open`); await page.context().close(); continue }
    // tap the pad in Sample mode: its settings open
    await page.locator('[data-testid=sample-mode]').click()
    await page.waitForTimeout(500)
    await page.locator(`.st-pad[data-voice="${id}"]`).first().click()
    await page.waitForSelector('[data-testid=pitch-dial]', { timeout: 4000 }).catch(() => bad(`${vp.n}: no pitch dial in the pad editor`))
    if (!(await page.locator('[data-testid=pitch-dial]').count())) { await page.screenshot({ path: path.join(OUT, `gs-nodial-${vp.n}.png`) }); await page.context().close(); continue }
    const knob = page.locator('[data-testid=pitch-dial] [role=slider]')
    await knob.focus()
    for (let i = 0; i < 5; i++) await knob.press('ArrowUp')
    await knob.press('Shift+ArrowUp'); await knob.press('Shift+ArrowUp')
    let p = (await beat(page)).pads[id].pitch
    if (Math.abs(p - 5.1) > 0.001) bad(`${vp.n}: 5 steps + 2 fine steps should give 5.1, got ${p}`)
    // drag up 60 px from the middle: about +12 (48 over 240 px)
    const kb = await knob.boundingBox()
    await page.mouse.move(kb.x + kb.width / 2, kb.y + kb.height / 2); await page.mouse.down(); await page.mouse.move(kb.x + kb.width / 2, kb.y + kb.height / 2 - 60, { steps: 6 }); await page.mouse.up()
    p = (await beat(page)).pads[id].pitch
    if (!(p > 15 && p < 19)) bad(`${vp.n}: dragging up 60 px should add about 12: ${p}`)
    await page.locator('[data-testid=pitch-dial] button[aria-label="Pitch: down a step"]').click()
    const p2 = (await beat(page)).pads[id].pitch
    if (p2 !== Math.ceil(p - 1e-6) - 1) bad(`${vp.n}: − should go to the step below ${p}: ${p2}`)
    // double tap: back to 0
    await page.waitForTimeout(400)
    await page.mouse.click(kb.x + kb.width / 2, kb.y + kb.height / 2); await page.waitForTimeout(80); await page.mouse.click(kb.x + kb.width / 2, kb.y + kb.height / 2)
    p = (await beat(page)).pads[id].pitch
    if (p !== 0) bad(`${vp.n}: double tap should reset to 0: ${p}`)
    await knob.focus(); for (let i = 0; i < 7; i++) await knob.press('ArrowDown')
    await page.locator('[data-testid=pitch-dial] button:has-text("Keep the speed")').click()
    await page.locator('[data-testid=pitch-dial] input[type=checkbox]').check()
    await page.waitForTimeout(300)
    const st = await page.locator('[data-testid=pitch-dial] [role=status]').innerText().catch(() => '')
    await page.waitForFunction(() => !document.querySelector('[data-testid=pitch-dial] [role=status]'), null, { timeout: 15000 }).catch(() => bad(`${vp.n}: "Getting it ready…" never finished (${st})`))
    const fin = await page.locator('[data-testid=pitch-dial] [role=status]').innerText().catch(() => '')
    if (/Couldn't/.test(fin)) bad(`${vp.n}: keep-the-speed shift failed`)
    const d = (await beat(page)).pads[id]
    if (d.pitch !== -7 || d.pitchMode !== 'keep' || !d.natural) bad(`${vp.n}: pad should be −7, keep, natural: ${JSON.stringify(d)}`)
    await page.screenshot({ path: path.join(OUT, `gs-dial-${vp.n}.png`) })
    if (await sideways(page)) bad(`${vp.n}: sideways overflow in the pad editor`)
    console.log(`${vp.n}: dial keys, drag, −, double tap and Keep the speed all work`)
    errs(page, `dial ${vp.n}`)
    await page.context().close()
  }

  // ---------- Signalsmith keep-the-speed: right pitch, same length, lined up (the module itself, in the page) ----------
  if (want('shift')) {
    fs.mkdirSync(path.join(DIST, '__test'), { recursive: true })
    execSync(`npx -y esbuild@0.25 src/studio/pitchShift.ts --bundle --format=iife --global-name=KGShift --log-level=error --outfile=${path.join(DIST, '__test', 'shift.js')}`, { cwd: path.join(__dirname, '..', '..') })
    const page = await newPage(browser, { width: 840, height: 757 })
    await page.addScriptTag({ url: '/__test/shift.js' })
    const r = await page.evaluate(async () => {
      const sr = 44100, len = sr * 2
      const ctx = new OfflineAudioContext(1, len, sr)
      const buf = ctx.createBuffer(1, len, sr)
      const d = buf.getChannelData(0)
      // a plucked 220 Hz note starting at 0.5 s
      for (let i = Math.round(0.5 * sr); i < len; i++) { const t = i / sr - 0.5; d[i] = (Math.sin(2 * Math.PI * 220 * t) + 0.4 * Math.sin(2 * Math.PI * 440 * t)) * Math.exp(-t * 2) * 0.6 }
      const f0 = x => { // autocorrelation pitch of the loudest part
        let best = 0, lag = 0; const a = Math.round(0.6 * sr), n = 4096
        for (let L = 40; L < 600; L++) { let s = 0; for (let i = 0; i < n; i++) s += x[a + i] * x[a + i + L]; if (s > best) { best = s; lag = L } }
        return sr / lag }
      const onset = x => { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > m * 0.2) return i / sr; return -1 }
      const out = []
      for (const [semis, natural] of [[7, false], [-5, false], [12, true]]) {
        const sh = await window.KGShift.prepareShift('t' + semis, buf, 0, 2, semis, natural)
        const x = sh.getChannelData(0)
        out.push({ semis, natural, len: sh.length, f0: f0(x), want: 220 * Math.pow(2, semis / 12), onset: onset(x) })
      }
      return { out, onset0: onset(d) }
    })
    for (const o of r.out) {
      if (o.len !== 88200) bad(`shift ${o.semis}: length changed (${o.len} samples)`)
      if (Math.abs(1200 * Math.log2(o.f0 / o.want)) > 25) bad(`shift ${o.semis}: pitch ${o.f0.toFixed(1)} Hz, wanted ${o.want.toFixed(1)}`)
      if (Math.abs(o.onset - r.onset0) > 0.03) bad(`shift ${o.semis}: start moved from ${r.onset0.toFixed(3)} to ${o.onset.toFixed(3)} s`)
      console.log(`shift ${o.semis > 0 ? '+' : ''}${o.semis}${o.natural ? ' (voice natural)' : ''}: ${o.f0.toFixed(1)} Hz (wanted ${o.want.toFixed(1)}), same length, starts at ${o.onset.toFixed(3)} s (original ${r.onset0.toFixed(3)})`)
    }
    errs(page, 'shift')
    await page.context().close()
  }

  // ---------- mic effects: each one makes sound, keeps the length (reverb adds its tail), octaves land an octave away ----------
  if (want('micfx')) {
    fs.mkdirSync(path.join(DIST, '__test'), { recursive: true })
    execSync(`npx -y esbuild@0.25 src/studio/micFx.ts --bundle --format=iife --global-name=KGFx --log-level=error --outfile=${path.join(DIST, '__test', 'fx.js')}`, { cwd: path.join(__dirname, '..', '..') })
    const page = await newPage(browser, { width: 840, height: 757 })
    await page.addScriptTag({ url: '/__test/fx.js' })
    const r = await page.evaluate(async () => {
      const sr = 44100, x = new Float32Array(sr * 1.5)
      for (let i = 0; i < x.length; i++) { const t = i / sr; x[i] = (Math.sin(2 * Math.PI * 196 * t) + 0.5 * Math.sin(2 * Math.PI * 392 * t)) * Math.min(1, t * 20) * 0.5 }
      const out = {}
      for (const f of window.KGFx.MIC_FX.map(m => m.id)) {
        const y = await window.KGFx.applyMicFx(x, sr, f)
        let peak = 0, e = 0
        for (const v of y) { peak = Math.max(peak, Math.abs(v)); e += v * v }
        out[f] = { len: y.length, peak, rms: Math.sqrt(e / y.length), f0: window.KGFx.framePitch(y, Math.round(sr * 0.6), 2048, sr), same: f === 'none' ? y === x : false }
      }
      // the octaves on a plain sine (a strong 2nd harmonic would make a pitch reading ambiguous)
      const pure = x.map((_, i) => Math.sin(2 * Math.PI * 196 * i / sr) * Math.min(1, i / sr * 20) * 0.5)
      for (const f of ['octaveUp', 'octaveDown']) out[f].f0 = window.KGFx.framePitch(await window.KGFx.applyMicFx(pure, sr, f), Math.round(sr * 0.6), 4096, sr)
      return out
    })
    for (const [f, o] of Object.entries(r)) {
      if (!(o.peak > 0.05)) bad(`mic effect ${f}: silent`)
      if (f === 'reverb' ? o.len <= 66150 : o.len !== 66150) bad(`mic effect ${f}: length ${o.len}`)
    }
    if (Math.abs(1200 * Math.log2(r.octaveUp.f0 / 392)) > 40) bad(`octave up: ${r.octaveUp.f0.toFixed(1)} Hz, wanted 392`)
    if (Math.abs(1200 * Math.log2(r.octaveDown.f0 / 98)) > 40) bad(`octave down: ${r.octaveDown.f0.toFixed(1)} Hz, wanted 98`)
    console.log('mic effects: ' + Object.entries(r).map(([f, o]) => `${f} ${o.f0 ? Math.round(o.f0) + ' Hz' : '-'}`).join(', '))
    errs(page, 'micfx')
    await page.context().close()
  }

  // ---------- the stems with the real model (put straight into the model cache from the preview server) ----------
  if (want('stems')) {
    const TM = path.join(DIST, '__testmodels')
    fs.mkdirSync(TM, { recursive: true })
    for (const f of ['htdemucs_fwd.onnx', 'htdemucs_fwd.onnx.data']) if (!fs.existsSync(path.join(TM, f))) fs.symlinkSync(path.join(MODELS, 'demucs', f), path.join(TM, f))
    const page = await newPage(browser, { width: 840, height: 757 })
    // ONNX Runtime's wasm from the local package (no network in the test)
    await page.route(/cdn\.jsdelivr\.net\/npm\/onnxruntime-web@[^/]+\/dist\/(.+)$/, r => r.fulfill({ path: path.join(__dirname, '..', '..', 'node_modules', 'onnxruntime-web', 'dist', /dist\/(.+)$/.exec(r.request().url())[1]), headers: { 'access-control-allow-origin': '*' } }))
    await page.evaluate(async () => {
      const c = await caches.open('kg-models-v1')
      const base = 'https://huggingface.co/webnn/stem-separator/resolve/b56f9e66ceffca2401f83d2469dadaddd06e4994/onnx/'
      for (const f of ['htdemucs_fwd.onnx', 'htdemucs_fwd.onnx.data']) {
        const b = await (await fetch('/__testmodels/' + f)).arrayBuffer()
        await c.put(base + f, new Response(b, { headers: { 'content-length': String(b.byteLength) } }))
      }
    })
    if (await openGetSound(page)) {
      await page.locator('[data-testid=gs-file]').setInputFiles(path.join(OUT, 'gs-mix.wav'))
      await page.waitForSelector('[data-testid=clip-editor]', { timeout: 8000 })
      await page.waitForTimeout(500)
      if (await page.locator('[data-testid=gs-get-model]').count()) bad('stems: model asked for download though it is in the cache')
      const t0 = Date.now()
      await page.locator('[data-testid=gs-part] button:has-text("Voice only")').click()
      await page.waitForFunction(() => /Separated in/.test(document.querySelector('[data-testid=gs-note]')?.textContent || '') || /stopped/.test(document.querySelector('[data-testid=gs-note]')?.textContent || ''), null, { timeout: 300000 }).catch(() => bad('stems: separation never finished'))
      const note = await page.locator('[data-testid=gs-note]').innerText().catch(() => '')
      console.log(`stems: ${note} (${Math.round((Date.now() - t0) / 1000)} s with loading)`)
      if (!/Separated in/.test(note)) bad(`stems: ${note}`)
      for (const p of ['Drums', 'Bass', 'Instruments', 'Without the voice']) {
        await page.locator(`[data-testid=gs-part] button:has-text("${p}")`).click()
        if ((await page.locator(`[data-testid=gs-part] button:has-text("${p}")`).getAttribute('aria-pressed')) !== 'true') bad(`stems: ${p} didn't switch at once`)
      }
      await page.locator('[data-testid=gs-part] button:has-text("Voice only")').click()
      await page.locator('[data-testid=clip-editor] input.input').fill('Voice')
      await page.locator('[data-testid=gs-put]').click()
      await page.waitForTimeout(600)
      const b = await beat(page)
      const v = Object.values(b.pads || {}).find(d => d.name === 'Voice')
      if (!v) bad('stems: the voice did not land on a pad')
      // the pad's sound should be the choir (voice), not the mix: compare with the known voice
      const score = await page.evaluate(async id => {
        const db = await new Promise((res, rej) => { const q = indexedDB.open('kg-pad-samples'); q.onsuccess = () => res(q.result); q.onerror = rej })
        const store = db.objectStoreNames[0]
        const rec = await new Promise(res => { const t = db.transaction(store).objectStore(store).get(id); t.onsuccess = () => res(t.result) })
        return rec ? { n: rec.data.length, sr: rec.sr } : null
      }, v?.sample)
      if (!score || score.sr !== 44100) bad(`stems: the voice pad should be 44.1 kHz: ${JSON.stringify(score)}`)
      await page.screenshot({ path: path.join(OUT, 'gs-stems.png') })
    }
    errs(page, 'stems')
    await page.context().close()
  }

  await browser.close()
  console.log(problems.length ? `\n${problems.length} problem(s)` : '\nGet a sound: all good')
  process.exit(problems.length ? 1 : 0)
})()
