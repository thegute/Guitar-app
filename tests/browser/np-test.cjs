// Now playing bar: ✕ hides it on every screen; opening another song brings it back. Cover + inner, no page errors.
// node tests/browser/np-test.cjs
const { chromium } = require('playwright')
const problems = []
const bad = m => { problems.push(m); console.log('  PROBLEM', m) }
;(async () => {
  const browser = await chromium.launch()
  for (const vp of [{ width: 412, height: 915, n: 'cover' }, { width: 840, height: 757, n: 'inner' }]) {
    const page = await (await browser.newContext({ viewport: vp })).newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.addInitScript(() => {
      window.__kgTest = true
      if (sessionStorage.getItem('s')) return
      localStorage.clear()
      for (const [k, v] of Object.entries({ 'kg:welcomed': '1', 'kg:psyDefault': '1', 'kg:getReady': '0', 'kg:tipsMode': '"off"', 'kg:playSong:guitar': '"ex:first"' })) localStorage.setItem(k, v)
      sessionStorage.setItem('s', '1')
    })
    await page.goto('http://localhost:4173/')
    await page.locator('nav >> text=Jam').first().click()
    const np = page.locator('[data-testid=now-playing]')
    await np.waitFor({ timeout: 8000 }).catch(() => bad(`${vp.n}: no Now playing bar`))
    await page.locator('[data-testid=now-playing-close]').click()
    if (await np.count()) bad(`${vp.n}: ✕ didn't hide the bar`)
    await page.locator('nav >> text=Learn').first().click()
    if (await np.count()) bad(`${vp.n}: the bar came back on another screen`)
    await page.reload()
    await page.locator('nav >> text=Learn').first().click()
    if (await np.count()) bad(`${vp.n}: the bar came back after a reload`)
    // another song opened → it comes back
    await page.evaluate(() => localStorage.setItem('kg:playSong:guitar', '"ex:other"'))
    await page.reload()
    await page.locator('nav >> text=Jam').first().click()
    await np.waitFor({ timeout: 8000 }).catch(() => bad(`${vp.n}: a new song didn't bring the bar back`))
    if (errors.length) bad(`${vp.n}: page errors: ${errors.join(' | ')}`)
    console.log(`${vp.n}: hide / stays hidden / back with a new song`)
    await page.context().close()
  }
  await browser.close()
  console.log(problems.length ? `\n${problems.length} problems` : '\nnow playing: all good')
  process.exit(problems.length ? 1 : 0)
})()
