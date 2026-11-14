// Ear path (Learn → Explore → Ear training) and Call and response: the path opens with Next, Next opens its drill;
// call and response plays a phrase, right notes mark it right, a wrong one says what it was. Phone sizes, no errors.
// Needs `vite preview` on :4173. Usage: node tests/browser/ear-test.cjs
const { chromium } = require('playwright')
const path = require('path')
const OUT = path.join(__dirname, 'out')
const problems = []
const bad = m => { problems.push(m); console.log('  PROBLEM', m) }
;(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] })
  for (const vp of [{ width: 360, height: 740 }, { width: 840, height: 757 }]) {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: true, permissions: ['microphone'] })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', e => errs.push(e.message))
    await page.addInitScript(() => {
      window.__kgTest = true
      if (sessionStorage.getItem('s')) return
      localStorage.clear()
      for (const [k, v] of Object.entries({ 'kg:welcomed': '1', 'kg:psyDefault': '1', 'kg:getReady': '0', 'kg:askBubble': 'false', 'kg:sub:learn': '"explore"', 'kg:cr:level': '2' })) localStorage.setItem(k, v)
      sessionStorage.setItem('s', '1')
    })
    await page.goto('http://localhost:4173/')
    await page.waitForSelector('nav')
    await page.locator('nav >> text=Learn').first().click()
    await page.locator('text=Ear training').first().click()
    await page.waitForSelector('[data-testid=ear-path]', { timeout: 5000 }).catch(() => bad(`${vp.width}: no ear path`))
    const nx = await page.locator('[data-testid=ear-next]').innerText().catch(() => '')
    if (!/Higher, lower/.test(nx)) bad(`${vp.width}: next should be the first drill: "${nx}"`)
    if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)) bad(`${vp.width}: ear path sideways`)
    await page.screenshot({ path: path.join(OUT, `earpath-${vp.width}.png`) })
    // into call and response from the path (stage 6)
    await page.locator('button:has-text("Play it back: Three notes")').click()
    await page.waitForSelector('[data-testid=call-response]', { timeout: 5000 })
    await page.locator('[data-testid=cr-play]').click()
    await page.waitForTimeout(400)
    const ph = await page.evaluate(() => window.__crPhrase())
    for (const m of ph.notes) await page.evaluate(n => window.__crHear(n), m)
    await page.waitForTimeout(200)
    const msg = await page.locator('[data-testid=cr-msg]').innerText().catch(() => '')
    if (!/First time/.test(msg)) bad(`${vp.width}: right notes: "${msg}"`)
    await page.locator('[data-testid=cr-next]').click()
    await page.locator('[data-testid=cr-play]').click()
    await page.waitForTimeout(400)
    const ph2 = await page.evaluate(() => window.__crPhrase())
    await page.evaluate(([a, b]) => { window.__crHear(a); window.__crHear(b) }, [ph2.notes[0], ph2.notes[1] + 2])
    await page.waitForTimeout(3500)
    const msg2 = await page.locator('[data-testid=cr-msg]').innerText().catch(() => '')
    if (!/Note 2: you played .*, it was/.test(msg2)) bad(`${vp.width}: wrong note message: "${msg2}"`)
    console.log(`  ${vp.width}: ${msg} / ${msg2}`)
    if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)) bad(`${vp.width}: call and response sideways`)
    await page.screenshot({ path: path.join(OUT, `cr-${vp.width}.png`) })
    if (errs.length) bad(`${vp.width}: page errors: ${errs.join(' | ')}`)
    await ctx.close()
  }
  await browser.close()
  console.log(problems.length ? `\n${problems.length} PROBLEM(S)` : '\near: all good')
  process.exit(problems.length ? 1 : 0)
})()
