// Every screen is made of windows you can move, resize and hide (owner, 2026-11-06), and Play's panels move too.
// Needs `vite preview` on :4173 and CHROME_PATH.  node tests/browser/windows-test.cjs [screens,drag,play]
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
// Play has no menu button any more (songs open in the song player): the Now playing bar goes back to it
const nav = (page, l) => l === 'Play' ? page.locator('[data-testid=now-playing]').count().then(c => (c ? page.locator('[data-testid=now-playing]').click() : null)) : page.locator(`nav.nav button:has-text("${l}")`).first().click()
const sub = (page, l) => page.locator(`.subtabs [role=tab]:has-text("${l}")`).first().click()
const sideways = page => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || [...document.querySelectorAll('.main')].some(m => m.scrollWidth > m.clientWidth + 1))
async function drag(page, from, toX, toY) {
  const b = await from.boundingBox()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  for (let i = 1; i <= 8; i++) await page.mouse.move(b.x + b.width / 2 + ((toX - b.x - b.width / 2) * i) / 8, b.y + b.height / 2 + ((toY - b.y - b.height / 2) * i) / 8)
  await page.mouse.up()
  await page.waitForTimeout(300)
}

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] })
  const SCREENS = [
    ['Tools', 'Tuner', 3], ['Tools', 'Tempo', 3], ['Tools', 'Chords', 4], ['Tools', 'Scales', 2],
    ['Songs', 'My songs', 2], ['Songs', 'Songbook', 2], ['Learn', 'Exercises', 3], ['Songs', 'Add a song', 3],
    ['Learn', 'Today', 3], ['Learn', 'Course', 2], ['Learn', 'Explore', 3],
    ['Jam', 'Jam', 2], ['Jam', 'Solo over it', 3], ['Jam', 'Make a tab', 1], ['Jam', 'Riff Scanner', 2],
    ['Settings', 'You', 6], ['Settings', 'Sound', 4], ['Settings', 'Look', 1], ['Settings', 'Backup', 2],
  ]
  if (want('screens')) for (const vp of [{ width: 360, height: 760 }, { width: 412, height: 915 }, { width: 840, height: 757 }]) {
    const page = await newPage(browser, vp)
    for (const [tab, pg, min] of SCREENS) {
      if (tab === 'Settings') { await nav(page, 'Learn'); await page.locator('[aria-label="Settings"]').click() } else await nav(page, tab)
      await sub(page, pg)
      if (pg === 'Riff Scanner') await page.locator('[data-testid=scan-mode-listen]').click()
      await page.waitForTimeout(500)
      const n = await page.locator('.win').count()
      const bars = await page.locator('.win .win-grip').count()
      if (n < min) bad(`${vp.width}px ${tab} → ${pg}: ${n} windows (want ${min}+)`)
      if (bars !== n) bad(`${vp.width}px ${tab} → ${pg}: ${n - bars} windows without a Move grip`)
      if (await sideways(page)) bad(`${vp.width}px ${tab} → ${pg}: scrolls sideways`)
      if (tab === 'Settings') await page.locator('button:has-text("← Back")').first().click()
    }
    console.log(`${vp.width}px: ${SCREENS.length} pages have windows`)
    if (page.errors.length) bad(`${vp.width}px page errors: ${page.errors.join(' | ')}`)
    await page.context().close()
  }

  // drag a window to another place, resize it, hide it, bring it back, reset
  if (want('drag')) {
    const page = await newPage(browser, { width: 412, height: 1800 })
    await nav(page, 'Tools'); await sub(page, 'Tempo')
    const ids = () => page.evaluate(() => [...document.querySelectorAll('.win')].sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top).map(w => w.dataset.win))
    const before = await ids()
    const last = page.locator(`.win[data-win="${before[before.length - 1]}"] .win-grip`)
    const firstBox = await page.locator(`.win[data-win="${before[0]}"]`).boundingBox()
    // drag the last window's grip to the top of the first window
    const g = await page.locator(`.win[data-win="${before[before.length - 1]}"] .win-grip`).boundingBox()
    await drag(page, page.locator(`.win[data-win="${before[before.length - 1]}"] .win-grip`), g.x + g.width / 2, Math.max(5, firstBox.y + 10))
    const after = await ids()
    console.log(`move: ${before.join(',')} → ${after.join(',')}`)
    if (after[0] !== before[before.length - 1]) bad(`dragging ☰ didn't move the window to the top: ${after.join(',')}`)
    // resize
    const w = page.locator(`.win[data-win="click"]`)
    const h0 = (await w.locator('.win-body').boundingBox()).height
    await drag(page, w.locator('.win-size'), (await w.locator('.win-size').boundingBox()).x + 30, (await w.locator('.win-size').boundingBox()).y - 60)
    const h1 = (await w.locator('.win-body').boundingBox()).height
    console.log(`resize: ${Math.round(h0)} → ${Math.round(h1)}`)
    if (!(h1 < h0 - 30)) bad(`resize didn't make the window shorter (${h0} → ${h1})`)
    // hide and bring back
    await w.locator('button[aria-label^="Tuck away"]').click()
    if (await page.locator('.win[data-win="click"]').count()) bad('– Hide left the window up')
    await page.locator('.win-tray .win-chip').first().click()
    if (!(await page.locator('.win[data-win="click"]').count())) bad('the tray did not bring the window back')
    // remembered after a reload, then Reset layout
    await page.reload(); await page.waitForSelector('nav.nav'); await nav(page, 'Tools'); await sub(page, 'Tempo'); await page.waitForTimeout(400)
    if ((await ids())[0] !== after[0]) bad('the moved window was not remembered')
    await page.locator('.win-chip.reset').click(); await page.waitForTimeout(300)
    if ((await ids()).join() !== before.join()) bad(`Reset layout: ${(await ids()).join()}`)
    await page.screenshot({ path: `${DIR}/win-drag.png` })
    if (page.errors.length) bad(`drag page errors: ${page.errors.join(' | ')}`)
    await page.context().close()
  }

  // Play: ☰ Move on the panels' bars
  if (want('play')) {
    // phone: video & readout below the tab, Scales & chords above it
    let page = await newPage(browser, { width: 412, height: 915 }, { 'kg:playView': '"both"' })
    await page.waitForSelector('.tab-note')
    const top = sel => page.locator(sel).boundingBox().then(b => b?.y ?? -1)
    const moveSide = page.locator('.split-top .split-move')
    if (!(await moveSide.count())) bad('Play phone: no ☰ Move on the video & readout bar')
    else {
      const tab = await page.locator('.play-tab').boundingBox()
      await drag(page, moveSide, tab.x + 60, tab.y + tab.height - 10)
      const [s, t] = [await top('.play-side'), await top('.play-tab')]
      console.log(`phone: side ${Math.round(s)} tab ${Math.round(t)}`)
      if (!(s > t)) bad('Play phone: the readout did not move below the tab')
      const solo = page.locator('.split-solo .split-move')
      const tb = await page.locator('.play-tab').boundingBox()
      await drag(page, solo, tb.x + 60, tb.y + 10)
      const [so, t2] = [await top('.play-solo'), await top('.play-tab')]
      console.log(`phone: solo ${Math.round(so)} tab ${Math.round(t2)}`)
      if (!(so < t2)) bad('Play phone: Scales & chords did not move above the tab')
      await page.screenshot({ path: `${DIR}/win-play-phone.png` })
      if (await sideways(page)) bad('Play phone: sideways scroll after moving')
      // the bars still resize the right way: dragging the solo bar down makes Scales & chords taller now it's above
      const h0 = (await page.locator('.play-solo').boundingBox()).height
      const bar = await page.locator('.split-solo').boundingBox()
      await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2); await page.mouse.down()
      await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2 + 40, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(300)
      const h1 = (await page.locator('.play-solo').boundingBox()).height
      console.log(`phone: solo height ${Math.round(h0)} → ${Math.round(h1)}`)
      if (!(h1 > h0 + 20)) bad('Play phone: dragging the bar under Scales & chords did not make it taller')
      // put them back
      await page.locator('.opts-btn').click(); await page.waitForSelector('.play-opts')
      await page.locator('.play-opts button:has-text("Put them back")').click()
      await page.locator('.play-opts >> text=Done').click()
      if (!((await top('.play-side')) < (await top('.play-tab')))) bad('Play phone: Put them back did not restore the order')
    }
    if (page.errors.length) bad(`play phone errors: ${page.errors.join(' | ')}`)
    await page.context().close()
    // wide: side panel to the left, Scales & chords on top
    page = await newPage(browser, { width: 1024, height: 768 })
    await page.waitForSelector('.tab-note')
    const side = page.locator('.split-side .split-move')
    if (!(await side.count())) bad('Play wide: no ☰ Move on the side bar')
    else {
      await drag(page, side, 80, 400)
      const sx = (await page.locator('.play-side').boundingBox()).x, tx = (await page.locator('.play-tab').boundingBox()).x
      console.log(`wide: side x ${Math.round(sx)} tab x ${Math.round(tx)}`)
      if (!(sx < tx)) bad('Play wide: the side panel did not move to the left')
      const solo = page.locator('.split-solo .split-move')
      await drag(page, solo, 500, 120)
      const sy = (await page.locator('.play-solo').boundingBox()).y, ty = (await page.locator('.play-tab').boundingBox()).y
      console.log(`wide: solo y ${Math.round(sy)} tab y ${Math.round(ty)}`)
      if (!(sy < ty)) bad('Play wide: Scales & chords did not move above the tab')
      await page.screenshot({ path: `${DIR}/win-play-wide.png` })
      if (await sideways(page)) bad('Play wide: sideways scroll after moving')
    }
    if (page.errors.length) bad(`play wide errors: ${page.errors.join(' | ')}`)
    await page.context().close()
  }

  await browser.close()
  console.log(problems.length ? `\n${problems.length} problem(s)` : 'windows: all good')
  process.exit(problems.length ? 1 : 0)
})()
