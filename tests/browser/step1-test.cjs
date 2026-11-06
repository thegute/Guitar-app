// Blueprint Step 1 in the browser: the floating finger box (drag, resize, tuck, remembered), the upcoming shift badge
// and Loop this shift, choosing a finger / another string for a tapped note, Make it easier, hand size in Settings;
// later parts: tunings, layers, voice leading, play the changes.
// Needs `vite preview` on :4173 and CHROME_PATH.  node tests/browser/step1-test.cjs [box,tunings,layers,voice,changes]
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

  if (want('box')) for (const vp of [{ width: 412, height: 915, n: 'cover' }, { width: 840, height: 757, n: 'inner' }, { width: 1400, height: 876, n: 'tab-s10' }]) {
    const page = await newPage(browser, vp)
    await page.waitForSelector('.tab-note')
    const box = page.locator('[data-testid=finger-box]')
    if (!(await box.count())) { bad(`${vp.n}: no finger box in Play`); continue }
    // drag it
    const b0 = await box.boundingBox()
    await drag(page, box.locator('.fbx-bar'), -120, -200)
    const b1 = await box.boundingBox()
    console.log(`${vp.n}: box moved ${Math.round(b0.x)},${Math.round(b0.y)} → ${Math.round(b1.x)},${Math.round(b1.y)}`)
    if (Math.abs(b1.y - b0.y) < 100) bad(`${vp.n}: dragging the finger box didn't move it`)
    // resize it
    await drag(page, box.locator('.fbx-size'), 50, 0)
    const b2 = await box.boundingBox()
    if (!(b2.width > b1.width + 20) && b1.width < vp.width - 40) bad(`${vp.n}: resizing didn't make it wider (${b1.width} → ${b2.width})`)
    // tuck and bring back
    await box.locator('button[aria-label^="Tuck"]').click()
    if (!(await page.locator('[data-testid=finger-chip]').count())) bad(`${vp.n}: no chip after tucking the box`)
    await page.reload(); await page.waitForSelector('.tab-note')
    if (!(await page.locator('[data-testid=finger-chip]').count())) bad(`${vp.n}: the tucked box wasn't remembered`)
    await page.locator('[data-testid=finger-chip]').click()
    const b3 = await page.locator('[data-testid=finger-box]').boundingBox()
    if (Math.abs(b3.y - b2.y) > 4) bad(`${vp.n}: the box's place wasn't remembered (${b2.y} → ${b3.y})`)
    // inside the screen
    if (b3.x < 0 || b3.y < 0 || b3.x + b3.width > vp.width + 1 || b3.y + b3.height > vp.height + 1) bad(`${vp.n}: box off the screen ${JSON.stringify(b3)}`)
    if (await sideways(page)) bad(`${vp.n}: sideways scroll with the box`)

    // a song with a shift: the badge comes two beats before, with Loop this shift
    await pasteSong(page, SHIFTY, 'Shift test')
    // park the box low on the screen so the tab's first lines and the readout are free to tap
    { const bb = await page.locator('[data-testid=finger-box] .fbx-bar').boundingBox(); await drag(page, page.locator('[data-testid=finger-box] .fbx-bar'), 0, vp.height - 230 - bb.y) }
    const notes = page.locator('.tab-note')
    const n = await notes.count()
    let saw = '', loopBtn = false
    for (let i = 0; i < n; i++) {
      await notes.nth(i).click(); await page.waitForTimeout(120)
      const badge = page.locator('.fbx-badge')
      if (await badge.count()) { saw = (await badge.textContent()) + ` (at note ${i + 1})`; loopBtn = !!(await page.locator('[data-testid=loop-shift]').count()); break }
    }
    console.log(`${vp.n}: shift badge "${saw}"`)
    if (!saw || !/fret 7|fret 6/.test(saw)) bad(`${vp.n}: no upcoming-shift badge for the move up to fret 7 (${saw})`)
    if (loopBtn) {
      await page.locator('[data-testid=loop-shift]').click(); await page.waitForTimeout(200)
      const looped = await page.locator('.tab-loopband, .tab-loop, [data-loop]').count()
      if (!looped) bad(`${vp.n}: Loop this shift didn't set a loop`)
    } else bad(`${vp.n}: no Loop this shift button`)
    const why = await page.locator('.fbx-shift .small').first().textContent().catch(() => '')
    console.log(`${vp.n}: why "${why}"`)
    if (!/rings|rest/.test(why)) bad(`${vp.n}: the shift reason should say when to move (${why})`)
    if (/at note [1-4]\)/.test(saw)) bad(`${vp.n}: the shift badge came too early (${saw})`)
    await page.screenshot({ path: `${DIR}/step1-box-${vp.n}.png` })

    // tap the fret-8 note: choose finger 3 and another string
    const eight = page.locator('.tab-note').filter({ hasText: /^8/ }).first()
    await eight.click(); await page.waitForTimeout(150)
    await page.screenshot({ path: `${DIR}/step1-edit-${vp.n}.png` })
    const edit = page.locator('.note-edit')
    if (!(await edit.count())) bad(`${vp.n}: no finger choice after tapping a note`)
    else {
      await edit.locator('button[aria-label="Play it with finger 3"]').click(); await page.waitForTimeout(200)
      const pressed = await page.locator('.note-edit button[aria-pressed="true"]').textContent().catch(() => '')
      if (pressed.trim() !== '3') bad(`${vp.n}: choosing finger 3 didn't stick (${pressed})`)
      const other = edit.locator('button:has-text("Other string")')
      if (await other.count()) {
        const label = await other.textContent()
        await other.click(); await page.waitForTimeout(250)
        const moved = await page.locator('.tab-note:has-text("13")').count()
        console.log(`${vp.n}: ${label} → ${moved ? 'moved to the B string (fret 13)' : 'not moved'}`)
        if (!moved) bad(`${vp.n}: Other string didn't move the note`)
      }
    }
    // Make it easier: the tab is re-placed (same notes) and can be switched back
    await page.locator('.opts-btn').click(); await page.waitForSelector('.play-opts')
    await page.locator('.play-opts [data-find=fingering] button:has-text("Easier for my hand")').click()
    await page.locator('.play-opts >> text=Done').click(); await page.waitForTimeout(300)
    const easyNotes = await page.locator('.tab-note').allTextContents()
    console.log(`${vp.n}: easier: ${easyNotes.join(' ').replace(/[^\d ]/g, '').slice(0, 60)}`)
    await page.locator('.opts-btn').click(); await page.waitForSelector('.play-opts')
    await page.locator('.play-opts [data-find=fingering] button:has-text("As written")').click()
    await page.locator('.play-opts >> text=Done').click()
    if (page.errors.length) bad(`${vp.n} errors: ${page.errors.join(' | ')}`)
    await page.context().close()
  }

  if (want('box')) {
    // hand size lives in Settings → You
    const page = await newPage(browser, { width: 412, height: 915 })
    await nav(page, 'Learn'); await page.locator('[aria-label="Settings"]').click(); await sub(page, 'You')
    const hs = page.locator('.win[data-win="handsize"]')
    if (!(await hs.count())) bad('no Your hand window in Settings → You')
    else {
      await hs.locator('button:has-text("Large")').click()
      const v = await page.evaluate(() => localStorage.getItem('kg:hand'))
      if (!/large/.test(v ?? '')) bad(`hand size not saved (${v})`)
    }
    await page.context().close()
  }

  await browser.close()
  console.log(problems.length ? `\n${problems.length} problem(s)` : 'step 1: all good')
  process.exit(problems.length ? 1 : 0)
})()
