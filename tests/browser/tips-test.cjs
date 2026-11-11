// Tips: the glowing dot on ✨, the tip card (Show me flashes the button, Got it, No more tips here), Always show opens by
// itself, Only when I ask (the helper's "A tip for this screen"), Off, and the Settings → You → Tips controls.
// Cover and inner, day and psy; no sideways overflow, no page errors.  node tests/browser/tips-test.cjs
const { chromium } = require('playwright')
const path = require('path')
const OUT = path.join(__dirname, 'out')
const problems = []
const bad = m => { problems.push(m); console.log('  PROBLEM', m) }
const sideways = page => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)

async function newPage(browser, vp, seed) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true })
  const page = await ctx.newPage()
  page.errors = []
  page.on('pageerror', e => page.errors.push(e.message))
  await page.addInitScript(s => {
    window.__kgTest = true
    try { if (window.top !== window || sessionStorage.getItem('seeded')) return } catch { return }
    localStorage.clear()
    for (const [k, v] of Object.entries({ 'kg:welcomed': '1', 'kg:psyDefault': '1', 'kg:getReady': '0', 'kg:tab2': '"play"', 'kg:playTidy': 'false', ...s })) localStorage.setItem(k, v)
    sessionStorage.setItem('seeded', '1')
  }, seed)
  await page.goto('http://localhost:4173/')
  await page.waitForSelector('.tab-note', { timeout: 10000 })
  await page.locator('.song-check button:has-text("Got it")').click({ timeout: 2000 }).catch(() => {})
  return page
}

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined })
  for (const [vp, theme] of [[{ width: 412, height: 915, n: 'cover' }, 'psy'], [{ width: 840, height: 757, n: 'inner' }, 'day']]) {
    // dot mode (default): dot glows, ✨ opens the tip, Show me flashes the button, Got it → breather (no dot)
    let page = await newPage(browser, vp, { 'kg:theme': JSON.stringify(theme) })
    await page.waitForSelector('[data-testid=tip-dot]', { timeout: 4000 }).catch(() => bad(`${vp.n}: no glowing dot on ✨`))
    await page.locator('[data-testid=ask-bubble]').click()
    await page.waitForSelector('[data-testid=tip-card]', { timeout: 3000 }).catch(() => bad(`${vp.n}: tapping ✨ didn't show the tip`))
    const text = await page.locator('[data-testid=tip-card] .tip-text').innerText().catch(() => '')
    if (await sideways(page)) bad(`${vp.n}: sideways overflow with the tip card`)
    await page.screenshot({ path: path.join(OUT, `tips-card-${vp.n}.png`) })
    if (await page.locator('[data-testid=tip-show]').count()) {
      await page.locator('[data-testid=tip-show]').click()
      await page.waitForSelector('.find-flash', { timeout: 4000 }).catch(() => bad(`${vp.n}: Show me didn't flash anything ("${text.slice(0, 60)}")`))
    } else await page.locator('[data-testid=tip-got]').click()
    await page.waitForTimeout(400)
    if (await page.locator('[data-testid=tip-dot]').count()) bad(`${vp.n}: the dot came straight back (no breather)`)
    // the next tap opens the helper, not a tip
    await page.locator('[data-testid=ask-bubble]').click()
    await page.waitForSelector('.search-sheet', { timeout: 3000 }).catch(() => bad(`${vp.n}: ✨ without a tip should open the helper`))
    // the helper's "A tip for this screen" (during the breather: "no new tips" for a moment)
    await page.locator('[data-testid=ask-tip]').click().catch(() => bad(`${vp.n}: no "A tip for this screen" in the helper`))
    await page.waitForSelector('[data-testid=tip-none], [data-testid=tip-card]', { timeout: 3000 }).catch(() => bad(`${vp.n}: "A tip for this screen" showed nothing`))
    console.log(`${vp.n} ${theme}: dot → "${text.slice(0, 70)}…" → Show me / Got it → helper`)
    if (page.errors.length) bad(`${vp.n}: page errors: ${page.errors.join(' | ')}`)
    await page.context().close()

    // always: the card opens by itself
    page = await newPage(browser, vp, { 'kg:tipsMode': '"always"', 'kg:theme': JSON.stringify(theme) })
    await page.waitForSelector('[data-testid=tip-card]', { timeout: 6000 }).catch(() => bad(`${vp.n}: Always show didn't open the tip by itself`))
    // No more tips here
    await page.locator('[data-testid=tip-mute]').click().catch(() => {})
    await page.waitForTimeout(300)
    if (await page.locator('[data-testid=tip-dot], [data-testid=tip-card]').count()) bad(`${vp.n}: No more tips here didn't stop them`)
    const muted = await page.evaluate(() => localStorage.getItem('kg:tipsMuted'))
    if (!/play/.test(muted || '')) bad(`${vp.n}: muting wasn't kept (${muted})`)
    await page.context().close()

    // off: no dot; Settings → You → Tips switches it back and has the advice switch
    page = await newPage(browser, vp, { 'kg:tipsMode': '"off"', 'kg:theme': JSON.stringify(theme) })
    await page.waitForTimeout(800)
    if (await page.locator('[data-testid=tip-dot]').count()) bad(`${vp.n}: Off still shows the dot`)
    await page.locator('nav.nav button:has-text("Settings"), button[aria-label=Settings]').first().click()
    await page.locator('.subtabs [role=tab]:has-text("You")').first().click()
    await page.waitForSelector('[data-win="tips"]', { timeout: 4000 }).catch(() => bad(`${vp.n}: no Tips in Settings → You`))
    await page.locator('[data-win="tips"] button:has-text("Glowing dot")').click()
    await page.locator('[data-testid=tips-advice]').uncheck()
    const st = await page.evaluate(() => [localStorage.getItem('kg:tipsMode'), localStorage.getItem('kg:tipsAdvice')])
    if (st[0] !== '"dot"' || st[1] !== 'false') bad(`${vp.n}: Tips settings not saved (${st})`)
    await page.locator('[data-win="tips"]').scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(OUT, `tips-settings-${vp.n}.png`) })
    if (await sideways(page)) bad(`${vp.n}: sideways overflow in Settings → Tips`)
    if (page.errors.length) bad(`${vp.n}: page errors: ${page.errors.join(' | ')}`)
    await page.context().close()
  }
  await browser.close()
  console.log(problems.length ? `${problems.length} problem(s)` : 'tips: all good')
  process.exit(problems.length ? 1 : 0)
})()
