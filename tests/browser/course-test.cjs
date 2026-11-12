// Theory course sample lesson (Level 1 · Octave shapes): open it from Learn → Theory, walk every step with Next, open the
// worked examples, check the neck pictures have marks, open an exercise in Play and a quiz, the teacher button opens the
// helper, finish the lesson. Cover / inner / tablet, psy / day / night; ukulele opens it too. No sideways overflow, no errors.
// node tests/browser/course-test.cjs
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
    for (const [k, v] of Object.entries({ 'kg:welcomed': '1', 'kg:psyDefault': '1', 'kg:getReady': '0', 'kg:tab2': '"learn"', 'kg:tipsMode': '"off"', ...s })) localStorage.setItem(k, v)
    sessionStorage.setItem('seeded', '1')
  }, seed)
  await page.goto('http://localhost:4173/')
  await page.waitForSelector('.today-card', { timeout: 10000 })
  return page
}
async function openLesson(page) {
  await page.locator('.subtabs [role=tab]:has-text("Explore")').first().click()
  await page.click('.tool:has-text("Theory")')
  await page.locator('[data-testid=course-lesson-c1-octaves]').click()
  await page.waitForSelector('[data-testid=deep-step]', { timeout: 5000 })
}

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--autoplay-policy=no-user-gesture-required'] })
  const sizes = [[{ width: 412, height: 915, n: 'cover' }, 'psy'], [{ width: 840, height: 757, n: 'inner' }, 'day'], [{ width: 1280, height: 800, n: 'tablet' }, 'night']]
  for (const [vp, theme] of sizes) {
    const page = await newPage(browser, vp, { 'kg:theme': JSON.stringify(theme) })
    await openLesson(page)
    const n = await page.locator('.deep-rail-step').count()
    if (n < 10) bad(`${vp.n}: only ${n} steps`)
    for (let i = 0; i < n; i++) {
      const kind = await page.locator('.deep-eyebrow').innerText()
      if (await sideways(page)) bad(`${vp.n}: step ${i + 1} (${kind}) sideways overflow`)
      // neck pictures have their marks
      const figs = page.locator('[data-testid=deep-step] .lesson-spots')
      for (let k = 0; k < await figs.count(); k++) {
        const marks = await figs.nth(k).locator('.fb-mark, circle, [class*=mark]').count()
        if (!marks) bad(`${vp.n}: step ${i + 1}: a neck picture has no notes on it`)
      }
      if (/WORKED EXAMPLES/i.test(kind)) {
        const shows = page.locator('[data-testid=deep-show]')
        const c = await shows.count()
        for (let k = 0; k < c; k++) await shows.first().click()
        if (await page.locator('.deep-answer').count() !== c) bad(`${vp.n}: Show me how didn't reveal every answer`)
      }
      if (vp.n === 'cover' && [0, 2, 7, 8, 10].includes(i)) await page.screenshot({ path: path.join(OUT, `course-${vp.n}-${i + 1}.png`), fullPage: true })
      if (vp.n !== 'cover' && [3, 7, 12].includes(i)) await page.screenshot({ path: path.join(OUT, `course-${vp.n}-${i + 1}.png`) })
      if (i < n - 1) await page.locator('[data-testid=deep-next]').click()
    }
    // the check step: the teacher button opens the helper with the prompt
    await page.locator('.deep-rail-step:has-text("Check")').click()
    await page.locator('[data-testid=deep-explain]').click()
    await page.waitForSelector('.search-sheet', { timeout: 4000 }).catch(() => bad(`${vp.n}: Explain it to the teacher didn't open the helper`))
    await page.keyboard.press('Escape').catch(() => {})
    await page.locator('.search-sheet button[aria-label*="lose"], .search-sheet .sheet-close').first().click({ timeout: 2000 }).catch(() => {})
    // finish
    await page.locator('.deep-rail-step').last().click()
    await page.locator('[data-testid=deep-finish]').click().catch(() => bad(`${vp.n}: no Finish button on the last step`))
    await page.waitForSelector('[data-testid=deep-done]', { timeout: 3000 }).catch(() => bad(`${vp.n}: finishing showed nothing`))
    const done = await page.evaluate(() => JSON.parse(localStorage.getItem('kg:course') || '{}')['c1-octaves'])
    if (!done?.done) bad(`${vp.n}: the lesson wasn't saved as finished`)
    if (page.errors.length) bad(`${vp.n}: page errors: ${page.errors.join(' | ')}`)
    console.log(`${vp.n} ${theme}: ${n} steps walked, examples, teacher, finish`)
    await page.context().close()
  }
  // every Level 1 lesson: walk all steps (cover psy + ukulele), pictures have notes, examples open, no overflow / errors
  for (const [inst, seed] of [['guitar', {}], ['ukulele', { 'kg:instrument': JSON.stringify({ id: 'tenor', tuning: {} }) }]]) {
    const page = await newPage(browser, { width: 412, height: 915 }, { 'kg:theme': '"psy"', ...seed })
    await page.locator('.subtabs [role=tab]:has-text("Explore")').first().click()
    await page.click('.tool:has-text("Theory")')
    const ids = await page.$$eval('[data-testid^=course-lesson-]', bs => bs.map(b => b.dataset.testid.replace('course-lesson-', '')))
    if (inst === 'guitar' && ids.length !== 8) bad(`Level 1 lists ${ids.length} lessons, want 8`)
    for (const id of ids) {
      await page.locator(`[data-testid=course-lesson-${id}]`).click()
      await page.waitForSelector('[data-testid=deep-step]')
      const n = await page.locator('.deep-rail-step').count()
      for (let i = 0; i < n; i++) {
        if (await sideways(page)) bad(`${inst} ${id} step ${i + 1}: sideways overflow`)
        const shows = page.locator('[data-testid=deep-show]')
        while (await shows.count()) await shows.first().click()
        if (inst === 'guitar') {
          const figs = page.locator('[data-testid=deep-step] .lesson-spots, [data-testid=deep-step] .deep-example .fretboard-wrap')
          for (let k = 0; k < await figs.count(); k++) if (!(await figs.nth(k).locator('.fb-mark, circle, [class*=mark]').count())) bad(`${id} step ${i + 1}: a neck picture has no notes`)
        }
        if (i < n - 1) await page.locator('[data-testid=deep-next]').click()
      }
      if (inst === 'guitar' && id === 'c1-rhythm') { await page.locator('.deep-rail-step').nth(4).click(); await page.screenshot({ path: path.join(OUT, `course-rhythm.png`), fullPage: true }) }
      await page.locator('.deep button:has-text("← Back")').first().click()
      await page.waitForSelector('[data-testid=course-lesson-c1-strings]')
    }
    if (page.errors.length) bad(`${inst} Level 1 walk: page errors: ${page.errors.join(' | ')}`)
    console.log(`${inst}: walked ${ids.length} Level 1 lessons`)
    await page.context().close()
  }
  // an exercise from the practice week opens in Play; a quiz opens
  {
    const page = await newPage(browser, { width: 840, height: 757 }, {})
    await openLesson(page)
    await page.locator('.deep-rail-step:has-text("Practice week")').click()
    await page.locator('[data-testid=deep-task]:has-text("Octave pairs up the neck")').first().click()
    await page.waitForSelector('.tab-note', { timeout: 8000 }).catch(() => bad('the octave pairs exercise did not open in Play'))
    const notes = await page.locator('.tab-note').count()
    console.log(`exercise in Play: ${notes} notes on the tab`)
    if (page.errors.length) bad(`exercise: ${page.errors.join(' | ')}`)
    await page.context().close()
  }
  {
    const page = await newPage(browser, { width: 412, height: 915 }, {})
    await openLesson(page)
    await page.locator('.deep-rail-step:has-text("Hear it")').click()
    await page.locator('[data-testid=deep-task]:has-text("Octave or not")').click()
    await page.waitForSelector('.quiz-card', { timeout: 5000 }).catch(() => bad('the ear drill did not open'))
    await page.screenshot({ path: path.join(OUT, 'course-ear-drill.png') })
    if (page.errors.length) bad(`ear drill: ${page.errors.join(' | ')}`)
    await page.context().close()
  }
  // ukulele: opens, no errors, pictures adapt
  {
    const page = await newPage(browser, { width: 412, height: 915 }, { 'kg:instrument': JSON.stringify({ id: 'tenor', tuning: {} }) })
    await openLesson(page)
    for (let i = 0; i < 6; i++) await page.locator('[data-testid=deep-next]').click()
    if (page.errors.length) bad(`ukulele: ${page.errors.join(' | ')}`)
    console.log('ukulele: opened and stepped through')
    await page.context().close()
  }
  await browser.close()
  console.log(problems.length ? `\n${problems.length} problems` : '\nall good')
  process.exit(problems.length ? 1 : 0)
})()
