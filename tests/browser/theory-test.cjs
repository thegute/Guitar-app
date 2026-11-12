// Guitar theory: the essentials (12 lessons in the order of the owner's theory book). On guitar they come first in
// Learn → Explore → Theory; every lesson has its book chapter, a video, play-along exercises and works at cover and
// inner sizes (neck pictures fit, no sideways overflow). A sound example plays, an exercise opens in Play, the last
// lesson's quiz opens. On ukulele the essentials are left out (they talk about guitar strings).
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

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--autoplay-policy=no-user-gesture-required'] })
  for (const [vp, theme] of [[{ width: 412, height: 915, n: 'cover' }, 'psy'], [{ width: 840, height: 757, n: 'inner' }, 'day']]) {
    const page = await newPage(browser, vp, { 'kg:theme': JSON.stringify(theme) })
    await openTheory(page)
    const first = await page.locator('.chapter h2').first().innerText()
    if (!/the essentials/.test(first)) bad(`${vp.n}: the essentials aren't the first chapter ("${first}")`)
    const cont = await page.locator('.continue-card b').innerText()
    if (cont !== '1. The musical alphabet') bad(`${vp.n}: Start with shows "${cont}"`)
    const n = await page.locator('.chapter').first().locator('.lesson-index li').count()
    if (n !== 12) bad(`${vp.n}: ${n} essentials lessons, want 12`)
    await page.screenshot({ path: path.join(OUT, `theory-list-${vp.n}.png`) })
    await page.click('.continue-card')
    for (let i = 1; i <= 12; i++) {
      await page.waitForSelector('.lesson h1', { timeout: 4000 })
      const title = await page.locator('.lesson h1').innerText()
      if (!title.startsWith(`${i}.`)) bad(`${vp.n}: lesson ${i} is "${title}"`)
      const book = await page.locator('[data-testid=lesson-book]').innerText().catch(() => '')
      if (!new RegExp(`No Bull Music Theory.*Chapter ${i}\\b`).test(book)) bad(`${vp.n}: ${title}: book line "${book}"`)
      if (!(await page.locator('.lesson-video').count())) bad(`${vp.n}: ${title}: no video`)
      if ((await page.locator('.lesson-ex').count()) < 2) bad(`${vp.n}: ${title}: fewer than 2 play exercises`)
      if ((await page.locator('.lesson-practice').count()) < 1) bad(`${vp.n}: ${title}: no quiz or tool link`)
      if (await sideways(page)) bad(`${vp.n}: ${title}: sideways overflow`)
      // the neck pictures fit the screen (or scroll inside their own box)
      const wide = await page.evaluate(() => [...document.querySelectorAll('.lesson-body svg')].some(s => s.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && !s.closest('[class*=zoom], [class*=scroll]')))
      if (wide) bad(`${vp.n}: ${title}: a picture runs off the screen`)
      if (i === 1 || i === 3 || i === 10) await page.screenshot({ path: path.join(OUT, `theory-${vp.n}-${i}.png`), fullPage: true })
      if (i === 3) {
        await page.locator('.lesson-play').first().click()
        await page.waitForTimeout(400)
      }
      if (i < 12) await page.locator('.lesson-end button:has-text("Next:")').click()
    }
    // the last lesson's quiz opens
    await page.locator('.lesson-practice:has-text("Minor keys quiz")').click()
    await page.waitForSelector('.quiz-card', { timeout: 5000 }).catch(() => bad(`${vp.n}: the Minor keys quiz didn't open`))
    await page.screenshot({ path: path.join(OUT, `theory-quiz-${vp.n}.png`) })
    if (page.errors.length) bad(`${vp.n}: page errors: ${page.errors.join(' | ')}`)
    console.log(`${vp.n} ${theme}: 12 lessons checked, quiz opened`)
    await page.context().close()
  }
  // an exercise opens in Play with a tab
  {
    const page = await newPage(browser, { width: 840, height: 757 }, { 'kg:theme': '"night"' })
    await openTheory(page)
    await page.locator('.lesson-index button:has-text("3. The major scale")').click()
    await page.locator('.lesson-ex:has-text("C major scale")').click()
    await page.waitForSelector('.tab-note', { timeout: 8000 }).catch(() => bad('the C major scale exercise didn\'t open in Play'))
    if (page.errors.length) bad(`exercise: page errors: ${page.errors.join(' | ')}`)
    console.log('exercise opened in Play')
    await page.context().close()
  }
  // ukulele: no guitar essentials
  {
    const page = await newPage(browser, { width: 412, height: 915 }, { 'kg:instrument': JSON.stringify({ id: 'tenor', tuning: {} }) })
    await openTheory(page)
    const txt = await page.locator('.lesson-index').first().innerText()
    if (/musical alphabet\n.*\n?.*1\./.test(txt) || await page.locator('.chapter h2:has-text("the essentials")').count()) bad('ukulele shows the guitar essentials')
    const cont = await page.locator('.continue-card b').innerText()
    if (/^\d+\./.test(cont)) bad(`ukulele starts with "${cont}"`)
    console.log(`ukulele starts with "${cont}"`)
    await page.context().close()
  }
  await browser.close()
  console.log(problems.length ? `\n${problems.length} problems` : '\nall good')
  process.exit(problems.length ? 1 : 0)
})()
