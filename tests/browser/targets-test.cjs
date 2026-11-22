// Target notes trainer (Learn → Explore): opens, counts in, follows the chords; landing the shown target on each chord
// marks it green, wrong notes red; the speed buttons and the speed trainer move the tempo; fits phone and Fold sizes.
// Needs `vite preview` on :4173. Usage: node tests/browser/targets-test.cjs
const { chromium } = require('playwright')
const path = require('path')
const OUT = path.join(__dirname, 'out')
const problems = []
const bad = m => { problems.push(m); console.log('  PROBLEM', m) }

;(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] })
  for (const vp of [{ width: 360, height: 740 }, { width: 412, height: 915 }, { width: 840, height: 757 }]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, hasTouch: true, permissions: ['microphone'] })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', e => errs.push(e.message))
    await page.addInitScript(() => {
      window.__kgTest = true
      if (sessionStorage.getItem('s')) return
      localStorage.clear()
      for (const [k, v] of Object.entries({ 'kg:welcomed': '1', 'kg:psyDefault': '1', 'kg:navHidden': '0', 'kg:studioCockpit': 'false', 'kg:getReady': '0', 'kg:askBubble': 'false', 'kg:sub:learn': '"explore"', 'kg:tn:bpm': '120', 'kg:tn:kind': '"third"', 'kg:tn:trainer': 'true' })) localStorage.setItem(k, v)
      sessionStorage.setItem('s', '1')
    })
    await page.goto('http://localhost:4173/')
    await page.waitForSelector('nav')
    await page.locator('nav >> text=Learn').first().click()
    await page.locator('text=Target notes').first().click()
    await page.waitForSelector('[data-testid=target-notes]', { timeout: 5000 })
    const sideways = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    if (sideways) bad(`${vp.width}: sideways scroll`)
    if (vp.width === 412) {
      await page.locator('[data-testid=tn-faster]').click()
      if (!/124 BPM/.test(await page.locator('[data-testid=tn-bpm]').innerText())) bad('faster should add 4 BPM')
      await page.locator('[data-testid=tn-slower]').click()
      await page.locator('[data-testid=tn-go]').click()
      // play the shown target on chords 0 and 2 of each lap, a wrong note on 1 and 3, for two laps
      await page.waitForSelector('.tn-count', { timeout: 4000 }).catch(() => {})
      await page.waitForSelector('.tn-count', { state: 'detached', timeout: 6000 }).catch(() => {})
      let last = -1, n = 0
      const t0 = Date.now()
      while (Date.now() - t0 < 25000 && n < 8) {
        const el = page.locator('[data-testid=tn-target]')
        if (await el.count()) {
          const ci = Number(await el.getAttribute('data-chord')), m = Number(await el.getAttribute('data-midi'))
          if (ci !== last) { last = ci; n++; await page.evaluate(([note]) => window.__tnHear?.(note), [ci % 2 === 0 ? m : m + 1]) }
        }
        await page.waitForTimeout(40)
      }
      await page.waitForTimeout(1500)
      const cells = await page.locator('.tn-cell').evaluateAll(cs => cs.map(c => c.className))
      const laps = await page.locator('text=/Laps:/').innerText().catch(() => '')
      console.log(`  cells: ${cells.map(c => c.includes(' ok') ? 'ok' : c.includes('miss') ? 'miss' : '-').join(' ')} · ${laps}`)
      if (!/^Laps: 50% · 50%/.test(laps)) bad(`a lap with two of four landed should score 50%: "${laps}"`)
      await page.screenshot({ path: path.join(OUT, 'targets-412.png') })
      await page.locator('[data-testid=tn-go]').click()
    }
    if (errs.length) bad(`${vp.width}: page errors: ${errs.join(' | ')}`)
    await ctx.close()
  }
  await browser.close()
  console.log(problems.length ? `\n${problems.length} PROBLEM(S)` : '\ntargets: all good')
  process.exit(problems.length ? 1 : 0)
})()
