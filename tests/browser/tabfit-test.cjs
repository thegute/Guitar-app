// Play: tab lines use the whole width (no blank space at the right before the next line), the tab's own − % + zoom,
// and Game Mode's zoom (− / +), look-ahead drag (⟲ Now brings it back) and the ⇕ size handle. Every size, day/night/psy.
// Needs `vite preview` on :4173.  node tests/browser/tabfit-test.cjs
const { chromium } = require('playwright')
const path = require('path')
const OUT = path.join(__dirname, 'out')
const problems = []
const bad = m => { problems.push(m); console.log('  PROBLEM', m) }
const sideways = page => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)

// rows of bars: every row but the last should reach the right edge of the tab box
const rowGaps = page => page.evaluate(() => {
  const view = document.querySelector('.tab-view'); if (!view) return null
  const bars = [...view.querySelectorAll('svg.tab-bar')].map(s => s.getBoundingClientRect()).filter(r => r.width > 0)
  if (!bars.length) return null
  const host = bars.length ? view.querySelector('svg.tab-bar').parentElement.getBoundingClientRect() : view.getBoundingClientRect()
  const cs = getComputedStyle(view.querySelector('svg.tab-bar').parentElement)
  const right = host.right - parseFloat(cs.paddingRight || '0')
  const rows = new Map()
  for (const r of bars) { const k = Math.round(r.top); rows.set(k, Math.max(rows.get(k) ?? 0, r.right)) }
  const ends = [...rows.entries()].sort((a, b) => a[0] - b[0]).map(e => e[1])
  return { rows: ends.length, gaps: ends.slice(0, -1).map(e => Math.round(right - e)), over: Math.max(0, ...ends.map(e => Math.round(e - right))) }
})

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] })
  const sizes = [{ width: 412, height: 915, n: 'cover' }, { width: 840, height: 757, n: 'inner' }, { width: 1280, height: 800, n: 'tablet' }, { width: 360, height: 740, n: 'small' }]
  const themes = ['day', 'night', 'psy']
  let i = 0
  for (const vp of sizes) {
    const theme = themes[i++ % 3]
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, hasTouch: true, permissions: ['microphone'] })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', e => errs.push(e.message))
    await page.addInitScript(t => {
      window.__kgTest = true
      try { if (window.top !== window || sessionStorage.getItem('seeded')) return } catch { return }
      localStorage.clear()
      for (const [k, v] of Object.entries({ 'kg:welcomed': '1', 'kg:psyDefault': '1', 'kg:askBubble': 'false', 'kg:getReady': '0', 'kg:tab2': '"play"', 'kg:playTidy': 'false', 'kg:theme': JSON.stringify(t), 'kg:floatCards:play': '[]' })) localStorage.setItem(k, v)
      sessionStorage.setItem('seeded', '1')
    }, theme)
    await page.goto('http://localhost:4173/')
    await page.waitForSelector('.tab-note', { timeout: 8000 })
    await page.locator('.song-check button:has-text("Got it")').click({ timeout: 2500 }).catch(() => {})
    await page.waitForTimeout(500)
    // full-width lines at three zooms
    for (const z of [1, 1.5, 0.8]) {
      await page.evaluate(z => { localStorage.setItem('kg:tabZoom', String(z)) }, z)
      // set through the on-tab control so the screen updates: step from what it shows now
      for (let k = 0; k < 20; k++) {
        const now = parseInt(await page.locator('.tab-zoom-ctl .gh-secs').innerText(), 10) / 100
        if (Math.abs(now - z) < 0.05) break
        await page.locator(now < z ? '[data-testid=tab-zoom-in]' : '[data-testid=tab-zoom-out]').click()
      }
      await page.waitForTimeout(350)
      const g = await rowGaps(page)
      if (!g) { bad(`${vp.n}: no tab bars`); continue }
      const worst = Math.max(0, ...g.gaps)
      console.log(`${vp.n} ${theme} zoom ${z}: ${g.rows} lines, right-side gaps ${g.gaps.join(',') || '–'} px`)
      if (worst > 14) bad(`${vp.n} zoom ${z}: a line stops ${worst} px short of the right side`)
      if (g.over > 2) bad(`${vp.n} zoom ${z}: a line runs ${g.over} px past the right side`)
      if (await sideways(page)) bad(`${vp.n} zoom ${z}: sideways overflow`)
    }
    await page.screenshot({ path: path.join(OUT, `tabfit-${vp.n}.png`) })
    // Game Mode: zoom, look ahead, size
    await page.locator('[data-testid=game-toggle]').click()
    await page.waitForSelector('[data-testid=game-highway] canvas', { timeout: 4000 }).catch(() => bad(`${vp.n}: no highway`))
    const secs = async () => parseFloat(await page.locator('.gh-zoom .gh-secs').innerText())
    const s0 = await secs()
    await page.locator('[data-testid=game-zoom-out]').click()
    const s1 = await secs()
    await page.locator('[data-testid=game-zoom-in]').click(); await page.locator('[data-testid=game-zoom-in]').click()
    const s2 = await secs()
    if (!(s1 > s0 && s2 < s0)) bad(`${vp.n}: game zoom − / + didn't change the view (${s0} → ${s1} → ${s2})`)
    const saved = await page.evaluate(() => localStorage.getItem('kg:gameSecs'))
    if (Math.abs(+saved - s2) > 0.05) bad(`${vp.n}: game zoom not remembered (${saved})`)
    const cv = await page.locator('[data-testid=game-highway] canvas').boundingBox()
    const y = cv.y + cv.height / 2
    await page.mouse.move(cv.x + cv.width * 0.8, y); await page.mouse.down()
    await page.mouse.move(cv.x + cv.width * 0.3, y, { steps: 8 })
    const nowShown = await page.locator('[data-testid=game-now]').count()
    await page.mouse.up()
    if (!nowShown) bad(`${vp.n}: dragging the highway didn't look ahead (no ⟲ Now)`)
    if (await page.locator('[data-testid=game-now]').count()) await page.locator('[data-testid=game-now]').click()
    await page.waitForTimeout(1200)
    if (await page.locator('[data-testid=game-now]').count()) bad(`${vp.n}: ⟲ Now didn't go back`)
    // it fits its box: the whole highway is inside the tab box without scrolling to it
    await page.locator('button:has-text("Got it")').first().click({ timeout: 800 }).catch(() => {})
    await page.waitForTimeout(400)
    const fit = await page.evaluate(() => { const c = document.querySelector('[data-testid=game-highway] canvas').getBoundingClientRect(), h = document.querySelector('.play-tab').getBoundingClientRect(); return { cb: Math.round(c.bottom), hb: Math.round(h.bottom), ch: Math.round(c.height) } })
    if (fit.cb > fit.hb + 1 && fit.ch > 190) bad(`${vp.n}: the highway runs past its box (${fit.cb} > ${fit.hb}, ${fit.ch} px tall)`)
    await page.locator('[data-testid=game-size]').scrollIntoViewIfNeeded()
    const h0 = (await page.locator('[data-testid=game-highway] canvas').boundingBox()).height
    const hb = await page.locator('[data-testid=game-size]').boundingBox()
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await page.mouse.down()
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 + 80, { steps: 6 }); await page.mouse.up()
    await page.waitForTimeout(300)
    const h1 = (await page.locator('[data-testid=game-highway] canvas').boundingBox()).height
    if (!(h1 > h0 + 20)) bad(`${vp.n}: the size handle didn't make the highway taller (${h0} → ${h1})`)
    await page.locator('[data-testid=game-size]').dblclick()
    await page.waitForTimeout(300)
    const h2 = (await page.locator('[data-testid=game-highway] canvas').boundingBox()).height
    if (Math.abs(h2 - h0) > 2) bad(`${vp.n}: double tap on ⇕ didn't fit the box again (${h0} → ${h2})`)
    if (await sideways(page)) bad(`${vp.n}: sideways overflow in Game`)
    await page.screenshot({ path: path.join(OUT, `tabfit-game-${vp.n}.png`) })
    console.log(`${vp.n}: game zoom ${s0}→${s1}→${s2} s, look-ahead and back, height fits at ${Math.round(h0)}, ⇕ ${Math.round(h1)}`)
    if (errs.length) bad(`${vp.n}: page errors: ${errs.join(' | ')}`)
    await ctx.close()
  }
  await browser.close()
  console.log(problems.length ? `${problems.length} problem(s)` : 'tab fit + game zoom: all good')
  process.exit(problems.length ? 1 : 0)
})()
