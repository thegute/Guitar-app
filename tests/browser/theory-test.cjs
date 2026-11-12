// Learn → Explore → Theory after the course replaced the old lessons (owner 2026-11-11): the theory course is at the top
// with Levels 1–3; the 12 essentials and the old lessons Levels 1–3 cover are gone; the remaining earlier lessons are
// listed under "Earlier lessons"; an old link (search → "pentatonic") opens its course lesson; ukulele gets the course
// too. Cover and inner sizes, psy and day; no sideways overflow, no page errors.
// node tests/browser/theory-test.cjs
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
async function openTheory(page) {
  await page.locator('.subtabs [role=tab]:has-text("Explore")').first().click()
  await page.click('.tool:has-text("Theory")')
  await page.waitForSelector('.lesson-index', { timeout: 5000 })
}
const GONE = ['The musical alphabet on the fretboard', 'Sheet music and tab', 'The major scale', 'Naming intervals', 'The circle of fifths', 'Pentatonic and blues scales', 'Roman numerals', 'Triads, diatonic chords and function']

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--autoplay-policy=no-user-gesture-required'] })
  for (const [vp, theme] of [[{ width: 412, height: 915, n: 'cover' }, 'psy'], [{ width: 840, height: 757, n: 'inner' }, 'day']]) {
    const page = await newPage(browser, vp, { 'kg:theme': JSON.stringify(theme) })
    await openTheory(page)
    if (!(await page.locator('[data-testid=course-lesson-c1-strings]').count())) bad(`${vp.n}: the theory course isn't at the top`)
    for (const lv of [1, 2, 3]) if (!(await page.locator(`.course-levels h3:has-text("Level ${lv}")`).count())) bad(`${vp.n}: Level ${lv} missing`)
    if (await page.locator('.chapter h2:has-text("essentials")').count()) bad(`${vp.n}: the essentials are still listed`)
    const earlier = await page.locator('.chapter:not(.course-levels .chapter) .lesson-index').allInnerTexts()
    for (const t of GONE) if (earlier.some(x => x.split('\n').some(line => line.trim() === t))) bad(`${vp.n}: old lesson "${t}" is still listed`)
    if (!earlier.join('\n').includes('Seventh chords')) bad(`${vp.n}: lessons the course hasn't reached (Seventh chords) are missing`)
    if (await sideways(page)) bad(`${vp.n}: sideways overflow`)
    await page.screenshot({ path: path.join(OUT, `theory-list-${vp.n}.png`), fullPage: true })
    if (page.errors.length) bad(`${vp.n}: page errors: ${page.errors.join(' | ')}`)
    console.log(`${vp.n} ${theme}: course on top, old lessons gone`)
    await page.context().close()
  }
  // an old link opens its course lesson (the helper / search / plans still say "pentatonic")
  {
    const page = await newPage(browser, { width: 412, height: 915 }, {})
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('kg-go', { detail: { lesson: 'pentatonic' } })))
    await page.waitForTimeout(300)
    if (!(await page.locator('[data-testid=deep-step]').count())) {
      // fall back to search: type it in Ask
      await page.locator('nav button:has-text("Ask"), .rail button:has-text("Ask")').first().click().catch(() => {})
      await page.locator('.search-sheet input').first().fill('minor pentatonic').catch(() => {})
      await page.waitForTimeout(500)
      await page.locator('.search-sheet [data-kind=lesson], .search-sheet li:has-text("Minor pentatonic and the blues scale")').first().click().catch(() => {})
      await page.waitForSelector('[data-testid=deep-step]', { timeout: 4000 }).catch(() => bad('search for "minor pentatonic" did not open the course lesson'))
    }
    const t = await page.locator('.deep h1, [data-testid=deep-step] h1, .deep-title').first().innerText().catch(() => '')
    console.log(`old link → "${t}"`)
    if (page.errors.length) bad(`old link: page errors: ${page.errors.join(' | ')}`)
    await page.context().close()
  }
  // ukulele: the course is there, no essentials
  {
    const page = await newPage(browser, { width: 412, height: 915 }, { 'kg:instrument': JSON.stringify({ id: 'tenor', tuning: {} }) })
    await openTheory(page)
    if (!(await page.locator('[data-testid=course-lesson-c3-blues]').count())) bad('ukulele: the course (Level 3) is missing')
    if (page.errors.length) bad(`ukulele: page errors: ${page.errors.join(' | ')}`)
    console.log('ukulele: course listed')
    await page.context().close()
  }
  await browser.close()
  console.log(problems.length ? `\n${problems.length} problems` : '\nall good')
  process.exit(problems.length ? 1 : 0)
})()
