// Blueprint Step 2 in the browser: tempo badge + sheet (tap along, ½×/2×, time signature): the floating finger box (drag, resize, tuck, remembered), the upcoming shift badge
// and Loop this shift, choosing a finger / another string for a tapped note, Make it easier, hand size in Settings;
// later parts: tunings, layers, voice leading, play the changes.
// Needs `vite preview` on :4173 and CHROME_PATH.  node tests/browser/step2-test.cjs [tempo,scan,scanvideo,scanlink,scansound,rig,shorts]
// scansound needs the models in KG_MODELS (default /tmp/claude-0/models) and test audio in KG_BENCH (see tools/ml-bench)
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
  page.on('crash', () => console.log('  PAGE CRASHED'))
  page.on('console', m => { if (m.type() === 'error') console.log('  console: ' + m.text().slice(0, 200)) })
  await page.addInitScript(s => {
    try { if (window.top !== window || sessionStorage.getItem('seeded')) return } catch { return }
    localStorage.clear()
    for (const [k, v] of Object.entries({ 'kg:welcomed': '1', 'kg:psyDefault': '1', 'kg:askBubble': 'false', 'kg:layoutHint': '1', 'kg:getReady': '0', ...s })) localStorage.setItem(k, v)
    sessionStorage.setItem('seeded', '1')
  }, seed)
  await page.goto('http://localhost:4173/')
  await page.waitForSelector('nav.nav')
  return page
}
// Play has no menu button any more (songs open in the song player): the Now playing bar goes back to it
const nav = (page, l) => l === 'Play' ? page.locator('[data-testid=now-playing]').count().then(c => (c ? page.locator('[data-testid=now-playing]').click() : null)) : page.locator(`nav.nav button:has-text("${l}")`).first().click()
// Jam's pages are three big choices now (+ the Riff Scanner link); old names still work here
const JAM_ALIAS = { 'Jam': 'Play with a band', 'Looper': 'Loop myself', 'Beat maker': 'Make a beat' }
// Songs is one Library now: "My songs" and "Songbook" are its Mine / Songbook chips
const LIB_CHIP = { 'My songs': 'mine', 'Songbook': 'songbook' }
const sub = async (page, label) => {
  if (label === 'Riff Scanner') return page.locator('[data-testid=jam-scan-link]').click()
  if (LIB_CHIP[label]) { await page.locator('.subtabs [role=tab]:has-text("Library")').first().click(); return page.locator(`[data-testid=lib-${LIB_CHIP[label]}]`).click() }
  return page.locator(`.subtabs [role=tab]:has-text("${JAM_ALIAS[label] ?? label}")`).first().click()
}
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
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--disable-dev-shm-usage'] })

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
    if (!(Array.isArray(saved) && saved.some(d => Math.abs(d[0] - v) <= 1 && d[1] === 'you' && d[2] === '3/4'))) bad(`${vp.n}: tempo not saved with the song (${JSON.stringify(saved)})`)
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

  if (want('scanlink')) for (const ok of [true, false]) {
    const page = await newPage(browser, { width: 412, height: 915 }, { 'kgx:ai': JSON.stringify({ provider: 'gemini', keys: { gemini: 'test-key' }, models: {} }), 'kg:scanMode': '"scan"' })
    page.sent = []
    await page.route('**/generativelanguage.googleapis.com/**', async route => {
      const req = route.request()
      if (req.method() !== 'POST') return route.fulfill({ json: { models: [] } })
      const body = JSON.parse(req.postData() || '{}')
      const part = body.contents?.[0]?.parts?.[0]
      if (part?.file_data) {
        page.watched = { uri: part.file_data.file_uri, meta: part.video_metadata }
        if (!ok) return route.fulfill({ status: 403, json: { error: { status: 'PERMISSION_DENIED', message: 'The video is private' } } })
        return route.fulfill({ json: { candidates: [{ content: { parts: [{ text: 'SOURCE: screen\nTEMPO: 104\nTIME: 3/4\nKEY: G\nCHORDS: G C D\nTAB:\n' + CANNED.split('\n').slice(1).join('\n') }] } }] } })
      }
      const img = body.contents?.[0]?.parts?.find(p => p.inline_data)
      route.fulfill({ json: { candidates: [{ content: { parts: [{ text: img ? CANNED : 'NO TAB' }] } }] } })
    })
    await page.route('**/www.youtube.com/**', r => r.abort())
    await nav(page, 'Jam'); await sub(page, 'Riff Scanner')
    await page.fill('[data-testid=scan-link]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await page.fill('input[aria-label="From (minutes:seconds)"]', '1:20')
    await page.fill('input[aria-label="To (minutes:seconds)"]', '2:05')
    await page.locator('[data-testid=scan-link-go]').click()
    if (ok) {
      await page.waitForSelector('[data-testid=scan-result]', { timeout: 15000 }).catch(() => bad('link: no result when Gemini watched it'))
      const badge = (await page.locator('[data-testid=scan-result] [data-testid=tempo-badge]').innerText().catch(() => '')).replace(/\s+/g, ' ')
      console.log(`link (Gemini ok): watched ${page.watched?.uri} ${JSON.stringify(page.watched?.meta)} → badge "${badge}"`)
      if (!/youtube\.com\/watch\?v=dQw4w9WgXcQ/.test(page.watched?.uri || '')) bad('link: Gemini was not given the YouTube link')
      if (page.watched?.meta?.start_offset !== '80s' || page.watched?.meta?.end_offset !== '125s') bad(`link: the part to watch wasn't sent (${JSON.stringify(page.watched?.meta)})`)
      if (!/^104 3\/4$/.test(badge)) bad(`link: tempo/time from Gemini not used ("${badge}")`)
      await page.locator('[data-testid=scan-play]').click()
      await page.waitForSelector('.tab-note', { timeout: 5000 }).catch(() => bad('link: Open in Play showed no tab'))
      const yt = await page.evaluate(() => new Promise(res => {
        const r = indexedDB.open('kguitar'); r.onsuccess = () => { const tx = r.result.transaction(r.result.objectStoreNames[0], 'readonly'); const g = tx.objectStore(r.result.objectStoreNames[0]).getAll(); g.onsuccess = () => res(g.result.filter(d => d.title === 'Scanned riff').map(d => d.youtube)) }
      }))
      if (!JSON.stringify(yt).includes('dQw4w9WgXcQ')) bad(`link: the scanned song wasn't saved with its video (${JSON.stringify(yt)})`)
    } else {
      await page.waitForSelector('[data-testid=scan-grab]', { timeout: 15000 }).catch(() => bad('link: no screen-grab step after Gemini failed'))
      const why = await page.locator('[data-testid=scan-grab] p').first().innerText().catch(() => '')
      console.log(`link (Gemini refused): "${why.slice(0, 120)}"`)
      if (!/can't open this video|private/i.test(why)) bad(`link: the reason wasn't shown ("${why}")`)
      if (!(await page.locator('[data-testid=grab-start]').count())) bad('link: no Start the grab button')
      await page.screenshot({ path: `${DIR}/step2-scan-grab.png` })
      await page.locator('[data-testid=scan-grab] button:has-text("Use a screen recording instead")').click()
      await page.waitForSelector('[data-testid=scan-record]')
      if (!(await page.locator('[data-testid=scan-loud]').count())) bad('link: no Play it out loud button')
      await page.screenshot({ path: `${DIR}/step2-scan-record.png` })
      if (await sideways(page)) bad('link: sideways overflow')
    }
    if (page.errors.length) bad(`link errors: ${page.errors.join(' | ')}`)
    await page.context().close()
  }

  // ---------- Shorts: the key, the feed from YouTube search (stubbed), styles, next, scan this Short ----------
  if (want('shorts')) for (const vp of [{ width: 412, height: 915, n: 'cover' }, { width: 840, height: 757, n: 'inner' }]) {
    const page = await newPage(browser, vp, { 'kg:scanMode': '"shorts"' })
    page.searches = []
    const vid = (k, i) => `${String(k.length % 9999).padStart(4, '0')}${String(i).padStart(7, '0')}`
    await page.route('**/www.googleapis.com/youtube/v3/search**', route => {
      const u = new URL(route.request().url())
      page.searches.push(u.searchParams.get('q'))
      if (u.searchParams.get('key') !== 'AIzaTEST') return route.fulfill({ status: 400, json: { error: { code: 400, message: 'API key not valid', errors: [{ reason: 'badRequest' }] } } })
      const q = u.searchParams.get('q') || ''
      const items = Array.from({ length: 12 }, (_, i) => ({ id: { videoId: vid(q.replace(/\W/g, '') + 'xxxx', i) }, snippet: { title: i === 3 ? 'djent riff' : `${q.replace('#guitartabs ', '').replace(' #shorts', '')} lick ${i} #guitar`, channelTitle: `Chan ${q.length % 7}-${i}`, channelId: `UC${String(q.length % 7).padStart(11, '0')}${String(i).padStart(11, '0')}` } }))
      route.fulfill({ json: { items, nextPageToken: 'n2' } })
    })
    await page.route('**/www.googleapis.com/youtube/v3/videos**', route => {
      const ids = new URL(route.request().url()).searchParams.get('id').split(',')
      route.fulfill({ json: { items: ids.map((id, i) => ({ id, contentDetails: { duration: i === 5 ? 'PT4M10S' : 'PT45S' }, status: { embeddable: i !== 7 } })) } })
    })
    await page.route('**/www.youtube.com/**', r => r.abort())
    await nav(page, 'Jam'); await sub(page, 'Riff Scanner')
    await page.waitForSelector('[data-testid=shorts-setup]', { timeout: 5000 }).catch(() => bad(`${vp.n}: no key setup on first visit`))
    await page.fill('[data-testid=yt-key]', 'AIzaBAD')
    await page.locator('[data-testid=shorts-setup] button:has-text("Save and check")').click()
    await page.waitForFunction(() => /didn't work/.test(document.querySelector('[data-testid=shorts-setup] [role=status]')?.textContent || ''), null, { timeout: 5000 }).catch(() => bad(`${vp.n}: a bad key wasn't reported`))
    await page.fill('[data-testid=yt-key]', 'AIzaTEST')
    await page.locator('[data-testid=shorts-setup] button:has-text("Save and check")').click()
    await page.waitForFunction(() => /key works/.test(document.querySelector('[data-testid=shorts-setup] [role=status]')?.textContent || ''), null, { timeout: 5000 }).catch(() => bad(`${vp.n}: a good key wasn't confirmed`))
    const stored = await page.evaluate(() => [localStorage.getItem('kgx:youtube'), localStorage.getItem('kg:youtube')])
    if (stored[0] !== 'AIzaTEST' || stored[1]) bad(`${vp.n}: the key should be kept under kgx: only (${JSON.stringify(stored)})`)
    await page.locator('[data-testid=shorts-setup] button:has-text("Show the Shorts")').click()
    await page.waitForSelector('[data-testid=shorts] .short-frame', { timeout: 8000 }).catch(() => bad(`${vp.n}: no Short shown`))
    const feed = await page.evaluate(() => JSON.parse(localStorage.getItem('kg:shortsFeed') || '[]'))
    if (feed.some(s => /djent/i.test(s.title))) bad(`${vp.n}: a djent Short got into the feed`)
    if (feed.some(s => /\d{7}$/.test(s.id) && (s.id.endsWith('0000005') || s.id.endsWith('0000007')))) bad(`${vp.n}: a long or not-embeddable video got in`)
    for (let i = 0; i < feed.length; i++) for (let j = i + 1; j < Math.min(feed.length, i + 10); j++) if (feed[i].channelId === feed[j].channelId) { bad(`${vp.n}: channel ${feed[i].channel} twice within 10`); i = feed.length; break }
    const src1 = await page.locator('.short-frame').getAttribute('src')
    await page.locator('[data-testid=shorts-next]').click()
    const src2 = await page.locator('.short-frame').getAttribute('src')
    if (src1 === src2) bad(`${vp.n}: next didn't change the Short`)
    await page.keyboard.press('ArrowUp')
    if ((await page.locator('.short-frame').getAttribute('src')) !== src1) bad(`${vp.n}: ↑ didn't go back`)
    await page.locator('[data-testid=shorts-scan]').click()
    await page.waitForFunction(() => /shorts\//.test(document.querySelector('[data-testid=scan-link]')?.value || ''), null, { timeout: 4000 }).catch(() => {})
    const link = await page.inputValue('[data-testid=scan-link]').catch(() => '')
    if (!/youtube\.com\/shorts\//.test(link)) bad(`${vp.n}: Scan this Short didn't fill the link ("${link}")`)
    console.log(`${vp.n}: ${feed.length} Shorts from ${page.searches.length} searches (${page.searches.slice(0, 2).join(' | ')})`)
    await page.screenshot({ path: `${DIR}/step2-shorts-${vp.n}.png` })
    if (await sideways(page)) bad(`${vp.n}: sideways overflow in Shorts`)
    if (page.errors.length) bad(`${vp.n} shorts errors: ${page.errors.join(' | ')}`)
    await page.context().close()
  }

  // ---------- Audio setups: the Pocket Master switches to mono by itself; wired headphones = one tap to stereo ----------
  if (want('rig')) for (const vp of [{ width: 412, height: 915, n: 'cover' }, { width: 840, height: 757, n: 'inner' }]) {
    const page = await newPage(browser, vp)
    // the phone's device list with the pedal in it (the fake mic stays the real input)
    await page.evaluate(() => {
      const md = navigator.mediaDevices
      const real = md.enumerateDevices.bind(md)
      md.enumerateDevices = async () => [...(await real()), { deviceId: 'pm1', kind: 'audioinput', label: 'USB-Audio - Pocket Master', groupId: 'g', toJSON() { return this } }]
      md.dispatchEvent(new Event('devicechange'))
    })
    // a permission once so labels show (the app asks the same way)
    await page.evaluate(async () => { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach(t => t.stop()); navigator.mediaDevices.dispatchEvent(new Event('devicechange')) })
    await page.waitForSelector('[data-testid=rig-notice]', { timeout: 5000 }).catch(() => bad(`${vp.n}: no "Pocket Master plugged in" notice`))
    const note = await page.locator('[data-testid=rig-notice]').innerText().catch(() => '')
    if (!/mono/.test(note)) bad(`${vp.n}: notice should say mono: "${note}"`)
    await page.screenshot({ path: `${DIR}/step2-rig-notice-${vp.n}.png` })
    if (await sideways(page)) bad(`${vp.n}: sideways overflow with the notice`)
    // Jam's input button (on the Looper page, where Jam records you) says mono; its sheet has the setup
    await nav(page, 'Jam'); await sub(page, 'Looper')
    await page.waitForSelector('.input-btn', { timeout: 6000 }).catch(() => {})
    const btn = page.locator('.input-btn').first()
    if (await btn.count()) {
      const t = await btn.innerText()
      if (!/mono/.test(t)) bad(`${vp.n}: input button should show mono: "${t}"`)
      await btn.click()
      const now = await page.locator('.sheet [data-testid=rig-now]').innerText().catch(() => '')
      if (!/Pedal \+ wireless/.test(now)) bad(`${vp.n}: setup should be the pedal: "${now}"`)
      await page.locator('.sheet [data-testid=rig-switch]').click()
      const now2 = await page.locator('.sheet [data-testid=rig-now]').innerText().catch(() => '')
      if (!/Stereo/.test(now2)) bad(`${vp.n}: the switch should give stereo: "${now2}"`)
      await page.locator('.sheet [data-testid=rig-switch]').click()
      await page.screenshot({ path: `${DIR}/step2-rig-sheet-${vp.n}.png` })
      if (await sideways(page)) bad(`${vp.n}: sideways overflow in the input sheet`)
      await page.locator('.sheet button:has-text("Done")').first().click()
    } else bad(`${vp.n}: no input button on Jam`)
    // Settings → Sound lists the pedal setup's own timing
    await nav(page, 'Learn'); await sub(page, 'Today')
    const settings = page.locator('button[aria-label=Settings]').first()
    if (!(await settings.count())) bad(`${vp.n}: no Settings button`)
    else {
      await settings.click(); await sub(page, 'Sound')
      await page.waitForTimeout(300)
      const row = await page.locator('text=Pocket Master + wireless').count()
      if (!(await page.locator('[data-testid=audio-setup]').count())) bad(`${vp.n}: Settings → Sound has no Audio setup`)
      if (!row) bad(`${vp.n}: Settings → Sound has no Pocket Master + wireless timing row`)
      await page.screenshot({ path: `${DIR}/step2-rig-settings-${vp.n}.png`, fullPage: false })
    }
    if (page.errors.length) bad(`${vp.n} rig errors: ${page.errors.join(' | ')}`)
    await page.context().close()
  }

  if (want('scansound')) {
    const fs = require('fs')
    const MODELS = process.env.KG_MODELS || '/tmp/claude-0/models'
    const BENCH = process.env.KG_BENCH || '/tmp/claude-0/bench'
    const ORTDIR = path.join(__dirname, '..', '..', 'node_modules', 'onnxruntime-web', 'dist')
    const page = await newPage(browser, { width: 840, height: 757 }, { 'kgx:ai': JSON.stringify({ provider: 'gemini', keys: { gemini: 'test-key' }, models: {} }), 'kg:scanMode': '"scan"' })
    page.heard = 0
    // the model files and onnxruntime-web's WebAssembly from local copies (the app fetches them from Hugging Face / jsDelivr)
    await page.route('**/huggingface.co/**', r => { const f = path.join(MODELS, path.basename(new URL(r.request().url()).pathname)); r.fulfill({ status: 200, path: f, headers: { 'content-type': 'application/octet-stream', 'access-control-allow-origin': '*' } }) })
    await page.route('**/cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/**', r => { const f = path.join(ORTDIR, path.basename(new URL(r.request().url()).pathname)); r.fulfill({ status: 200, body: fs.readFileSync(f), headers: { 'content-type': f.endsWith('.wasm') ? 'application/wasm' : 'text/javascript', 'access-control-allow-origin': '*' } }) })
    await page.route('**/generativelanguage.googleapis.com/**', async r => {
      const body = JSON.parse(r.request().postData() || '{}')
      const aud = body.contents?.[0]?.parts?.find(p => p.inline_data && /audio/.test(p.inline_data.mime_type))
      if (aud) { page.heard++; page.audioBytes = Buffer.from(aud.inline_data.data, 'base64').length }
      r.fulfill({ json: { candidates: [{ content: { parts: [{ text: aud ? 'SONG: Unknown\nKEY: E\nTEMPO: 96\nTIME: 4/4\nCHORDS: 0.0 E; 2.5 A; 5.0 G; 7.5 D; 10.0 E; 12.5 A; 15.0 G; 17.5 D\nSTRUM: D-DU-UDU\nTECHNIQUES: none\nVOICE: ' : 'NO TAB' }] } }] } })
    })
    await nav(page, 'Jam'); await sub(page, 'Riff Scanner')
    const t0 = Date.now()
    await page.locator('[data-testid=scan-file]').setInputFiles(path.join(BENCH, 'strum96.wav'))
    await page.waitForSelector('[data-testid=scan-result]', { timeout: 90000 }).catch(() => bad('sound: no quick draft'))
    const tDraft = (Date.now() - t0) / 1000
    const badge = (await page.locator('[data-testid=scan-result] [data-testid=tempo-badge]').innerText().catch(() => '')).replace(/\s+/g, ' ')
    console.log(`sound: quick draft after ${tDraft.toFixed(1)} s, badge "${badge}"`)
    if (!/^(9[5-7]|19[0-3]|4[7-9]) /.test(badge)) bad(`sound: tempo off ("${badge}", true 96)`)
    if (!(await page.locator('[data-testid=scan-check]').count())) bad('sound: a heard scan should ask "Does this look right?"')
    await page.waitForSelector('[data-testid=scan-ai-note]:has-text("Gemini:")', { timeout: 30000 }).catch(() => bad('sound: no AI second opinion'))
    const ai = await page.locator('[data-testid=scan-ai-note]').innerText().catch(() => '')
    console.log(`sound: ${ai} (sent ${page.heard} clip, ${(page.audioBytes / 1e6).toFixed(2)} MB)`)
    const chordsOnTab = await page.locator('[data-testid=scan-player] .tab-chord, [data-testid=scan-player] text.chord').count()
    console.log(`sound: chord names on the tab: ${chordsOnTab}`)
    if (!(await page.locator('[data-testid=scan-getmodels]').count())) bad('sound: no offer to download the models')
    await page.screenshot({ path: `${DIR}/step2-sound-draft.png` })
    // download (served locally) → the better version
    const t1 = Date.now()
    // Chrome's request interception can't pass ~100 MB bodies (the browser goes away), so the models are put straight
    // into the app's model cache from the preview server, exactly where the download would leave them
    const TM = path.join(__dirname, '..', '..', 'dist', '__testmodels')
    fs.mkdirSync(TM, { recursive: true })
    for (const f of ['guitar_crnn.onnx', 'guitar_crnn.onnx.data', 'beat_this.onnx']) if (!fs.existsSync(path.join(TM, f))) fs.symlinkSync(path.join(MODELS, f), path.join(TM, f))
    await page.evaluate(async () => {
      const c = await caches.open('kg-models-v1')
      const base = 'https://huggingface.co/baroned/musicnote-ondevice-models/resolve/fb6a270d0492862389958c898d7def780ad6ccff/'
      for (const f of ['guitar_crnn.onnx', 'guitar_crnn.onnx.data', 'beat_this.onnx']) {
        const b = await (await fetch('/__testmodels/' + f)).arrayBuffer()
        await c.put(base + f, new Response(b, { headers: { 'content-length': String(b.byteLength) } }))
      }
    })
    await page.locator('[data-testid=scan-download]').click()
    await page.waitForSelector('[data-testid=scan-better-run]', { timeout: 120000 }).catch(e => bad('sound: the better pass never started: ' + e.message.split('\n')[0]))
    await page.waitForSelector('[data-testid=scan-better-ready]', { timeout: 400000 }).catch(() => bad('sound: no better version'))
    const ready = await page.locator('[data-testid=scan-better-ready]').innerText().catch(() => '')
    console.log(`sound: ${ready.replace(/\s+/g, ' ')} (${((Date.now() - t1) / 1000).toFixed(0)} s incl. loading the models)`)
    await page.locator('[data-testid=scan-ok]').click()
    await page.locator('[data-testid=scan-use-better]').click()
    const notes = await page.locator('[data-testid=scan-player] .tab-note').count()
    console.log(`sound: better version shows ${notes} notes`)
    if (notes < 20) bad(`sound: the better version has few notes (${notes})`)
    await page.screenshot({ path: `${DIR}/step2-sound-better.png` })
    // connections
    await page.locator('[data-testid=scan-chain]').click()
    const mine = await page.evaluate(() => JSON.parse(localStorage.getItem('kg:myLicks') || '[]').length)
    const note1 = await page.locator('[data-testid=scan-note]').innerText().catch(() => '')
    console.log(`sound: lick chain → ${mine} riff(s) kept · "${note1}"`)
    if (!mine) bad('sound: Add to my lick chain kept nothing')
    await page.locator('[data-testid=scan-pad]').click()
    await page.waitForFunction(() => /pad \d+ of Your pads/.test(document.querySelector('[data-testid=scan-note]')?.textContent || ''), null, { timeout: 30000 }).catch(() => bad('sound: Sample to a pad did nothing'))
    const pads = await page.evaluate(() => Object.keys((JSON.parse(localStorage.getItem('kg:studioBeat') || '{}').pads) || {}).filter(k => /^u\d+$/.test(k)))
    console.log(`sound: pad → ${pads.join(', ')}`)
    if (await sideways(page)) bad('sound: sideways overflow')
    if (page.errors.length) bad(`sound errors: ${page.errors.join(' | ')}`)
    await page.context().close()
  }

  await browser.close()
  console.log(problems.length ? `\n${problems.length} problem(s)` : 'step 2: all good')
  process.exit(problems.length ? 1 : 0)
})()
