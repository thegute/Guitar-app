// Blueprint Step 2 in the browser: tempo badge + sheet (tap along, ½×/2×, time signature): the floating finger box (drag, resize, tuck, remembered), the upcoming shift badge
// and Loop this shift, choosing a finger / another string for a tapped note, Make it easier, hand size in Settings;
// later parts: tunings, layers, voice leading, play the changes.
// Needs `vite preview` on :4173 and CHROME_PATH.  node tests/browser/step2-test.cjs [tempo]
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

  await browser.close()
  console.log(problems.length ? `\n${problems.length} problem(s)` : 'step 2: all good')
  process.exit(problems.length ? 1 : 0)
})()
