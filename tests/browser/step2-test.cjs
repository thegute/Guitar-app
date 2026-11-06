// Blueprint Step 2 in the browser: tempo badge + sheet (tap along, ½×/2×, time signature): the floating finger box (drag, resize, tuck, remembered), the upcoming shift badge
// and Loop this shift, choosing a finger / another string for a tapped note, Make it easier, hand size in Settings;
// later parts: tunings, layers, voice leading, play the changes.
// Needs `vite preview` on :4173 and CHROME_PATH.  node tests/browser/step2-test.cjs [tempo,scan,scanvideo]
const { chromium } = require('playwright')
const path = require('path')
const DIR = path.join(__dirname, 'out')
const want = p => !process.argv[2] || process.argv[2].split(',').includes(p)
const problems = []
const bad = m => { problems.push(m); console.log('  PROBLEM ' + m) }

async function newPage(browser, viewport, seed = {}) {
  const ctx = await browser.newContext({ viewport, hasTouch: true, permissions: ['microphone'] })
  const page = await ctx.newPage()
  page.errors = []
  page.on('pageerror', e => page.errors.push(e.message))
  await page.addInitScript(s => {
    if (sessionStorage.getItem('seeded')) return
    localStorage.clear()
    for (const [k, v] of Object.entries({ 'kg:welcomed': '1', 'kg:psyDefault': '1', 'kg:askBubble': 'false', 'kg:layoutHint': '1', 'kg:getReady': '0', ...s })) localStorage.setItem(k, v)
    sessionStorage.setItem('seeded', '1')
  }, seed)
  await page.goto('http://localhost:4173/')
  await page.waitForSelector('nav.nav')
  return page
}
const nav = (page, l) => page.locator(`nav.nav button:has-text("${l}")`).first().click()
const sub = (page, l) => page.locator(`.subtabs [role=tab]:has-text("${l}")`).first().click()
const sideways = page => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || [...document.querySelectorAll('.main')].some(m => m.scrollWidth > m.clientWidth + 1))
async function drag(page, loc, dx, dy) {
  const b = await loc.boundingBox()
  const x = b.x + Math.min(30, b.width / 2), y = b.y + b.height / 2
  await page.mouse.move(x, y); await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 8 }); await page.mouse.up()
  await page.waitForTimeout(200)
}
// open position, a rest, then up at fret 7, then back
const SHIFTY = `Shift test
e|-0-1-3-1-0-1-3-0-|-7-8-10-8-7---|
B|---------|---------|--------------|
G|---------|---------|--------------|
D|---------|---------|--------------|
A|---------|---------|--------------|
E|---------|---------|--------------|`
async function pasteSong(page, text, title) {
  await nav(page, 'Songs'); await sub(page, 'Add a song')
  await page.waitForSelector('.songs-screen textarea')
  await page.fill('.songs-screen textarea', text)
  await page.fill('.songs-screen input[aria-label="Song title"]', title)
  await page.click('.songs-screen button:text-is("Load tab")')
  await page.waitForSelector('.tab-note')
  await page.waitForTimeout(400)
  const got = page.locator('.song-check button:has-text("Got it")')
  if (await got.count()) await got.click()
}

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] })

  if (want('tempo')) for (const vp of [{ width: 412, height: 915, n: 'cover' }, { width: 840, height: 757, n: 'inner' }, { width: 1400, height: 876, n: 'tab-s10' }]) {
    const page = await newPage(browser, vp)
    await pasteSong(page, SHIFTY, 'Tempo test')
    const badge = page.locator('[data-testid=tempo-badge]')
    if (!(await badge.count())) { bad(`${vp.n}: no tempo badge`); await page.context().close(); continue }
    const t0 = (await badge.innerText()).replace(/\s+/g, ' ')
    if (!/^~\d+/.test(t0)) bad(`${vp.n}: pasted tab badge should show a guess (~): "${t0}"`)
    await badge.click()
    const sheet = page.locator('[data-testid=tempo-sheet]')
    await sheet.waitFor({ timeout: 3000 })
    // tap along at 120
    const tapBtn = sheet.locator('[data-testid=tap-tempo]')
    for (let i = 0; i < 6; i++) { await tapBtn.dispatchEvent('pointerdown'); await page.waitForTimeout(500) }
    const use = sheet.locator('[data-testid=tap-use]')
    const useText = await use.innerText().catch(() => '')
    const tapped = Number((useText.match(/\d+/) || [0])[0])
    if (Math.abs(tapped - 120) > 6) bad(`${vp.n}: tapped 120, got "${useText}"`)
    await use.click()
    const v = Number(await sheet.locator('[data-testid=tempo-value]').innerText())
    if (Math.abs(v - 120) > 6) bad(`${vp.n}: tempo after Use = ${v}`)
    await sheet.locator('button:has-text("½×")').click()
    const half = Number(await sheet.locator('[data-testid=tempo-value]').innerText())
    if (Math.abs(half - v / 2) > 1) bad(`${vp.n}: ½× gave ${half}`)
    await sheet.locator('button:has-text("2×")').click()
    await sheet.locator('.chip:text-is("3/4")').click()
    await page.screenshot({ path: `${DIR}/step2-tempo-${vp.n}.png` })
    if (await sideways(page)) bad(`${vp.n}: sideways overflow with the tempo sheet`)
    await sheet.locator('button:has-text("Done")').click()
    const t1 = (await badge.innerText()).replace(/\s+/g, ' ')
    if (!/^1[12]\d 3\/4$/.test(t1)) bad(`${vp.n}: badge after changes "${t1}"`)
    // saved with the song
    const saved = await page.evaluate(() => new Promise(res => {
      const r = indexedDB.open('kguitar'); r.onsuccess = () => { try { const tx = r.result.transaction(r.result.objectStoreNames[0], 'readonly'); const g = tx.objectStore(r.result.objectStoreNames[0]).getAll(); g.onsuccess = () => res(g.result.filter(d => d.title === 'Tempo test').map(d => [d.song.tempo, d.song.tempoFrom, d.song.timeSig && d.song.timeSig.join('/')])) } catch (e) { res(String(e)) } }; r.onerror = () => res('no db')
    }))
    console.log(`${vp.n}: badge "${t0}" → "${t1}" · saved ${JSON.stringify(saved)}`)
    if (!JSON.stringify(saved).includes('[120,"you","3/4"]')) bad(`${vp.n}: tempo not saved with the song (${JSON.stringify(saved)})`)
    // In time uses it
    await page.locator('.play-mode button:has-text("In time"), [data-find=mode] button:has-text("In time"), button:has-text("In time")').first().click().catch(() => {})
    await page.waitForTimeout(300)
    if (page.errors.length) bad(`${vp.n} tempo errors: ${page.errors.join(' | ')}`)
    await page.context().close()
  }

  // ---------- Riff Scanner: a screenshot of a video with a small tab, and a screen recording of a scrolling tab ----------
  const CANNED = `Tempo: 96
    G               C
e|-----3-----|-----0-----|
B|---0---0---|---1---1---|
G|-0-------0-|-0-------0-|
D|-----------|-2---------|
A|-----------|-3---------|
E|-3---------|-----------|`
  async function aiPage(vp) {
    const page = await newPage(browser, vp, { 'kgx:ai': JSON.stringify({ provider: 'gemini', keys: { gemini: 'test-key' }, models: {} }), 'kg:tab2': 'progressions', 'kg:sub:jam': 'find', 'kg:scanMode': '"scan"' })
    page.sent = []
    await page.route('**/generativelanguage.googleapis.com/**', async route => {
      const req = route.request()
      if (req.method() !== 'POST') return route.fulfill({ json: { models: [] } })
      const body = JSON.parse(req.postData() || '{}')
      const img = body.contents?.[0]?.parts?.find(p => p.inline_data)?.inline_data
      if (img) { const b = Buffer.from(img.data, 'base64'); page.sent.push({ w: b.readUInt32BE(16), h: b.readUInt32BE(20), mime: img.mime_type }) }
      await new Promise(r => setTimeout(r, 300))
      route.fulfill({ json: { candidates: [{ content: { parts: [{ text: img ? CANNED : 'NO TAB' }] } }] } })
    })
    await nav(page, 'Jam'); await sub(page, 'Riff Scanner')
    return page
  }
  // a dark video frame: a "face cam" box up top, a small white-on-black tab strip near the bottom
  const DRAW = `(ctx, W, H, shift) => {
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#6a4a3a'; ctx.fillRect(W * 0.3, 40, W * 0.4, H * 0.45)
    const gap = 9, y0 = H - 100, x0 = 30
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 1
    for (let s = 0; s < 6; s++) { ctx.beginPath(); ctx.moveTo(x0, y0 + s * gap + 0.5); ctx.lineTo(W - 30, y0 + s * gap + 0.5); ctx.stroke() }
    ctx.font = 'bold 11px sans-serif'; ctx.textBaseline = 'middle'
    for (let i = 0; i < 60; i++) {
      const x = x0 + 20 + i * 34 - shift
      if (x < x0 + 4 || x > W - 44) continue
      const s = (i * 7) % 6, f = String((i * 5) % 13)
      const w = ctx.measureText(f).width
      ctx.fillStyle = '#111'; ctx.fillRect(x - 2, y0 + s * gap - 6, w + 4, 12)
      ctx.fillStyle = '#fff'; ctx.fillText(f, x, y0 + s * gap)
      if (i % 8 === 0) { ctx.fillRect(x - 8, y0, 1, gap * 5) }
    }
  }`

  if (want('scan')) for (const vp of [{ width: 412, height: 915, n: 'cover' }, { width: 840, height: 757, n: 'inner' }]) {
    const page = await aiPage(vp)
    await page.waitForSelector('[data-testid=riff-scanner]')
    const png = await page.evaluate(draw => { const c = document.createElement('canvas'); c.width = 1280; c.height = 720; eval(draw)(c.getContext('2d'), 1280, 720, 0); return c.toDataURL('image/png').split(',')[1] }, DRAW)
    await page.locator('[data-testid=scan-pics]').setInputFiles({ name: 'frame.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') })
    await page.waitForSelector('[data-testid=crop-box]')
    const rect = await page.locator('.crop-rect').evaluate(e => ({ top: parseFloat(e.style.top), height: parseFloat(e.style.height), left: parseFloat(e.style.left), width: parseFloat(e.style.width) }))
    console.log(`${vp.n}: tab found at ${rect.top.toFixed(0)}% down, ${rect.height.toFixed(0)}% tall, ${rect.width.toFixed(0)}% wide`)
    if (!(rect.top > 60 && rect.top < 88 && rect.height < 30 && rect.width > 80)) bad(`${vp.n}: crop box missed the tab strip (${JSON.stringify(rect)})`)
    await page.screenshot({ path: `${DIR}/step2-scan-crop-${vp.n}.png` })
    await page.locator('[data-testid=scan-read]').click()
    await page.waitForSelector('[data-testid=scan-progress]', { timeout: 3000 }).catch(() => bad(`${vp.n}: no progress steps`))
    await page.waitForSelector('[data-testid=scan-result]', { timeout: 20000 }).catch(() => bad(`${vp.n}: no result`))
    const sent = page.sent[0]
    console.log(`${vp.n}: the AI got ${page.sent.length} strip(s): ${page.sent.map(x => `${x.w}×${x.h}`).join(', ')}`)
    const totalW = page.sent.reduce((a, x) => a + x.w, 0)
    // the strip was ~1200 × 87 px in the frame: it must arrive at least twice as big, in at most 3 pieces
    if (!sent || totalW < 2400 || sent.h < 170 || page.sent.length > 3) bad(`${vp.n}: the strip sent wasn't enlarged well (${JSON.stringify(page.sent)})`)
    const badge = (await page.locator('[data-testid=scan-result] [data-testid=tempo-badge]').innerText()).replace(/\s+/g, ' ')
    if (!/^96 4\/4$/.test(badge)) bad(`${vp.n}: result tempo badge "${badge}"`)
    if (await page.locator('[data-testid=scan-check]').count()) bad(`${vp.n}: a tab read off the screen shouldn't ask "Does this look right?"`)
    await page.screenshot({ path: `${DIR}/step2-scan-result-${vp.n}.png` })
    if (await sideways(page)) bad(`${vp.n}: sideways overflow in the scanner`)
    await page.locator('[data-testid=scan-today]').click()
    const cur = await page.evaluate(() => localStorage.getItem('kg:playSong:guitar'))
    if (!cur) bad(`${vp.n}: Practise it today didn't set the song`)
    await page.locator('[data-testid=scan-play]').click()
    await page.waitForSelector('.tab-note', { timeout: 5000 }).catch(() => bad(`${vp.n}: Open in Play showed no tab`))
    const notes = await page.locator('.tab-note').count()
    console.log(`${vp.n}: opened in Play with ${notes} notes`)
    if (page.errors.length) bad(`${vp.n} scan errors: ${page.errors.join(' | ')}`)
    await page.context().close()
  }

  if (want('scanvideo')) {
    const page = await aiPage({ width: 840, height: 757 })
    await page.waitForSelector('[data-testid=riff-scanner]')
    // a screen recording of a scrolling tab (12 s, 15 fps) made in the page with MediaRecorder
    const webm = await page.evaluate(async draw => {
      const c = document.createElement('canvas'); c.width = 960; c.height = 540
      const ctx = c.getContext('2d'); const f = eval(draw)
      const rec = new MediaRecorder(c.captureStream(15), { mimeType: 'video/webm' })
      const parts = []; rec.ondataavailable = e => parts.push(e.data)
      rec.start(); const t0 = performance.now()
      await new Promise(res => { const tick = () => { const t = (performance.now() - t0) / 1000; f(ctx, 960, 540, Math.round(t * 60)); if (t < 12) requestAnimationFrame(tick); else res() }; tick() })
      rec.stop(); await new Promise(r => rec.onstop = r)
      const b = new Blob(parts, { type: 'video/webm' })
      const buf = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000))
      return btoa(s)
    }, DRAW)
    await page.locator('[data-testid=scan-file]').setInputFiles({ name: 'screen-recording.webm', mimeType: 'video/webm', buffer: Buffer.from(webm, 'base64') })
    await page.waitForSelector('[data-testid=scan-progress]', { timeout: 5000 }).catch(() => bad('video: no progress steps'))
    await page.waitForSelector('[data-testid=scan-result], [data-testid=scan-msg]', { timeout: 120000 }).catch(() => bad('video: nothing after 120 s'))
    const msg = await page.locator('[data-testid=scan-msg]').innerText().catch(() => '')
    const how = await page.locator('[data-testid=scan-result] p.small.muted').first().innerText().catch(() => '')
    console.log(`video: ${msg || how} · strips sent ${page.sent.map(x => `${x.w}×${x.h}`).join(', ')}`)
    if (!page.sent.length) bad(`video: no tab strips were read (${msg})`)
    const widest = Math.max(0, ...page.sent.map(x => x.w))
    // 12 s × 60 px/s of scrolling, enlarged: the stitched strip(s) together must be longer than one frame's strip
    const total = page.sent.reduce((a, x) => a + x.w, 0)
    if (total < 960 * 2 * 1.3) bad(`video: the scrolling tab wasn't stitched (total ${total} px, widest ${widest})`)
    await page.screenshot({ path: `${DIR}/step2-scan-video.png` })
    if (page.errors.length) bad(`video scan errors: ${page.errors.join(' | ')}`)
    await page.context().close()
  }

  await browser.close()
  console.log(problems.length ? `\n${problems.length} problem(s)` : 'step 2: all good')
  process.exit(problems.length ? 1 : 0)
})()
