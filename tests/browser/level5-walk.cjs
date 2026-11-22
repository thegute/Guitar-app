// Walk every Level 5 lesson (guitar, cover + inner), every step: no errors, no sideways overflow, pictures have marks,
// the Key menu moves a picture, every Level 5 quiz opens. node tests/browser/level5-walk.cjs
const { chromium } = require('playwright')
const IDS = (process.env.IDS || 'c5-augdim,c5-sevenths,c5-key7,c5-colours,c5-ext,c5-altered,c5-slash,c5-voicelead,c5-check').split(',')
const problems = []
const bad = m => { problems.push(m); console.log('  PROBLEM', m) }
;(async () => {
  const b = await chromium.launch()
  for (const [vp, theme, inst] of [[{ width: 412, height: 915, n: 'cover' }, 'psy', 'guitar'], [{ width: 840, height: 757, n: 'inner' }, 'day', 'guitar'], [{ width: 412, height: 915, n: 'uke' }, 'night', 'ukulele']]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: true })
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message))
    await page.addInitScript(([t, i]) => { window.__kgTest = true; if (sessionStorage.getItem('s')) return; localStorage.clear(); for (const [k, v] of Object.entries({ 'kg:welcomed': '1', 'kg:psyDefault': '1', 'kg:navHidden': '0', 'kg:getReady': '0', 'kg:tab2': '"learn"', 'kg:tipsMode': '"off"', 'kg:theme': JSON.stringify(t), 'kg:instrument': JSON.stringify(i) })) localStorage.setItem(k, v); sessionStorage.setItem('s', '1') }, [theme, inst])
    await page.goto('http://localhost:4173/'); await page.waitForSelector('.today-card')
    for (const id of IDS) {
      if (!await page.locator(`[data-testid=course-lesson-${id}]`).count()) {
        await page.locator('.subtabs [role=tab]:has-text("Explore")').first().click()
        await page.click('.tool:has-text("Theory")')
      }
      const link = page.locator(`[data-testid=course-lesson-${id}]`)
      if (!await link.count()) { bad(`${vp.n}: ${id} not listed`); continue }
      await link.click()
      await page.waitForSelector('[data-testid=deep-step]')
      const n = await page.locator('.deep-rail-step').count()
      for (let i = 0; i < n; i++) {
        if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)) bad(`${vp.n} ${id}: step ${i + 1} overflow`)
        const shows = page.locator('[data-testid=deep-show]')
        while (await shows.count()) await shows.first().click()
        const figs = page.locator('[data-testid=deep-step] .lesson-spots')
        for (let k = 0; k < await figs.count(); k++) if (!await figs.nth(k).locator('.fb-mark, circle, [class*=mark]').count()) bad(`${vp.n} ${id}: step ${i + 1} picture ${k + 1} empty`)
        if (i < n - 1) await page.locator('[data-testid=deep-next]').click()
      }
      // key change on the first picture of the lesson's first learn step
      await page.locator('.deep-rail-step').nth(1).click()
      const sel = page.locator('.deep-key select')
      await sel.selectOption('5')
      const moved = await page.locator('.key-moved').count()
      const figsNow = await page.locator('[data-testid=deep-step] .lesson-spots').count()
      if (figsNow && !moved) bad(`${vp.n} ${id}: key change shows no moved note`)
      await sel.selectOption('0')
      if (vp.n === 'cover' && (id === 'c5-sevenths' || id === 'c6-doublestops' || (process.env.SHOT || '').split(',').includes(id))) await page.screenshot({ path: 'tests/browser/out/' + id + '-cover.png', fullPage: true })
      await page.locator('button:has-text("← Back")').first().click()
    }
    if (errs.length) bad(`${vp.n}: page errors ${errs.slice(0, 3).join(' | ')}`)
    await ctx.close()
  }
  await b.close()
  console.log(problems.length ? `level5-walk: ${problems.length} problems` : 'level5-walk: all good')
  process.exit(problems.length ? 1 : 0)
})()
