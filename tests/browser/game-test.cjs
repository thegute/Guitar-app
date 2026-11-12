// Play → Game: the note highway with the fake mic playing the example (Ode to Joy, one wrong note): points, the
// multiplier, feedback, the end screen with stars per part and the saved best; then In time on the highway and Auto speed.
// Needs `vite preview` on :4173 and CHROME_PATH (and tests/browser/out/ode.wav from gen-ode.cjs).
const { chromium } = require('playwright')
const path = require('path')
const OUT = path.join(__dirname, 'out')
const problems = []
const bad = m => { problems.push(m); console.log('  PROBLEM', m) }
const sideways = page => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)

async function newPage(browser, seed, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1.5, hasTouch: true, permissions: ['microphone'] })
  const page = await ctx.newPage()
  page.errors = []
  page.on('pageerror', e => page.errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error' && !/youtube|ytimg|ERR_|net::|Failed to load resource/i.test(m.text())) page.errors.push('console: ' + m.text()) })
  await page.addInitScript(s => {
    window.__kgTest = true
    try { if (window.top !== window || sessionStorage.getItem('seeded')) return } catch { return }
    localStorage.clear()
    localStorage.setItem('kg:welcomed', '1'); localStorage.setItem('kg:psyDefault', '1'); localStorage.setItem('kg:askBubble', 'false'); localStorage.setItem('kg:getReady', '0')
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v))
    sessionStorage.setItem('seeded', '1')
  }, seed)
  await page.goto('http://localhost:4173/')
  return page
}

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${OUT}/ode.wav`, '--autoplay-policy=no-user-gesture-required'] })
  for (const vp of [{ width: 412, height: 915, n: 'cover' }, { width: 840, height: 757, n: 'inner' }]) {
    const page = await newPage(browser, { 'kg:tab2': 'play', 'kg:playTidy': false }, vp)
    await page.waitForSelector('.tab-note', { timeout: 8000 })
    await page.locator('.song-check button:has-text("Got it")').click({ timeout: 2500 }).catch(() => {})
    await page.locator('[data-testid=game-toggle]').click()
    await page.waitForSelector('[data-testid=game-highway] canvas', { timeout: 4000 }).catch(() => bad(`${vp.n}: no highway`))
    if (await page.locator('.tab-view').count()) bad(`${vp.n}: the tab is still shown in Game`)
    // Play for me: plays without moving on
    await page.locator('[data-testid=game-playfor]').click()
    // the canvas is drawing (not blank)
    const ink = await page.evaluate(() => { const c = document.querySelector('[data-testid=game-highway] canvas'); const g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4 * 97) if (d[i + 3] > 0) n++; return n })
    if (ink < 50) bad(`${vp.n}: the highway looks blank`)
    await page.screenshot({ path: path.join(OUT, `game-start-${vp.n}.png`) })
    // Wait for me through the whole song with the fake mic
    await page.locator('button.listen').click()
    let mult = '', points = 0, sawFeedback = false
    for (let i = 0; i < 70; i++) {
      await page.waitForTimeout(500)
      points = Number((await page.locator('[data-testid=game-points]').textContent()).replace(/\D/g, ''))
      mult = await page.locator('[data-testid=game-mult]').textContent()
      if (i === 8) await page.screenshot({ path: path.join(OUT, `game-playing-${vp.n}.png`) })
      if (await page.locator('[data-testid=game-end]').count()) break
    }
    if (!(points > 0)) bad(`${vp.n}: no points after playing`)
    if (!(await page.locator('[data-testid=game-end]').count())) bad(`${vp.n}: no end screen after the whole song`)
    else {
      const end = await page.locator('[data-testid=game-end]').innerText()
      const stars = (end.match(/★/g) || []).length
      console.log(`${vp.n}: ${points} points, ${mult} at the end, ${stars} stars shown`)
      if (!stars) bad(`${vp.n}: no stars on the end screen`)
      const best = await page.evaluate(() => JSON.parse(localStorage.getItem('kg:gameBest') || '{}'))
      if (!Object.keys(best).length) bad(`${vp.n}: best not saved`)
      await page.screenshot({ path: path.join(OUT, `game-end-${vp.n}.png`) })
      if (await sideways(page)) bad(`${vp.n}: sideways overflow at the end screen`)
      await page.locator('[data-testid=game-end] button:has-text("Close")').click()
    }
    await page.locator('button.listen').click().catch(() => {})
    // In time on the highway with Auto speed
    await page.locator('.tab-tools >> text=In time').click().catch(() => bad(`${vp.n}: no In time switch`))
    await page.locator('[data-testid=game-auto]').check()
    const tr = await page.evaluate(() => JSON.parse(localStorage.getItem('kg:speedTrainer') || '{}'))
    if (!(tr.on && tr.down === 60 && tr.target === 1.25 && tr.min === 0.25)) bad(`${vp.n}: Auto speed settings wrong: ${JSON.stringify(tr)}`)
    await page.locator('button.listen').click()
    await page.waitForTimeout(6500)
    const p2 = Number((await page.locator('[data-testid=game-points]').textContent()).replace(/\D/g, ''))
    await page.screenshot({ path: path.join(OUT, `game-intime-${vp.n}.png`) })
    await page.locator('button.listen').click().catch(() => {})
    console.log(`${vp.n}: In time on the highway: ${p2} points after 6.5 s`)
    // From the top: In time starts again from the beginning (with its count-in)
    await page.waitForTimeout(300)
    await page.locator('[data-testid=game-top]').click()
    await page.waitForFunction(() => document.querySelector('button.listen')?.getAttribute('aria-pressed') === 'true', null, { timeout: 12000 }).catch(() => bad(`${vp.n}: From the top didn't start the run`))
    await page.locator('button.listen').click().catch(() => {})
    await page.waitForTimeout(300)
    // tap the highway further on: "Start here" shows; tapping it starts the run from there
    const box = await page.locator('[data-testid=game-highway] canvas').boundingBox()
    await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.5)
    await page.locator('[data-testid=game-start-here]').waitFor({ timeout: 2000 }).catch(() => bad(`${vp.n}: tapping the highway showed no Start here`))
    await page.screenshot({ path: path.join(OUT, `game-starthere-${vp.n}.png`) })
    await page.locator('[data-testid=game-start-here]').click().catch(() => {})
    await page.waitForFunction(() => document.querySelector('button.listen')?.getAttribute('aria-pressed') === 'true', null, { timeout: 12000 }).catch(() => bad(`${vp.n}: Start here didn't start the run`))
    if (await page.locator('[data-testid=game-start-here]').count()) bad(`${vp.n}: the Start here chip stayed up`)
    await page.locator('button.listen').click().catch(() => {})
    if (await page.locator('[data-testid=game-loopstart]').count()) bad(`${vp.n}: From my loop shows with no loop set`)
    if (page.errors.length) bad(`${vp.n} errors: ${page.errors.join(' | ')}`)
    await page.context().close()
  }
  await browser.close()
  console.log(problems.length ? `\n${problems.length} problem(s)` : '\nGame Mode: all good')
  process.exit(problems.length ? 1 : 0)
})()
