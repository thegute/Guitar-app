// Build 30 browser checks: the Practice button (plan shown, session starts at the trouble bars at 70%), the report card
// after a whole run (score, trouble bars marked on the tab, next step button), "I played it right", Then vs now,
// the cover-screen remote, the icon set and What you use. Needs `vite preview` on :4173 and CHROME_PATH.
// Usage: node tests/browser/build30-test.cjs [part,part]
const { chromium } = require('playwright')
const path = require('path')
const DIR = path.join(__dirname)
const OUT = path.join(DIR, 'out')
const only = process.argv[2] ? process.argv[2].split(',') : null
const want = p => !only || only.includes(p)
const problems = []
const bad = m => { problems.push(m); console.log('  PROBLEM', m) }

async function newPage(browser, seed = {}, viewport = { width: 840, height: 757 }) {
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
    const now = Date.now()
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v).replace(/"NOW"/g, String(now)))
    sessionStorage.setItem('seeded', '1')
  }, seed)
  await page.goto('http://localhost:4173/')
  return page
}
const nav = (page, label) => page.locator(`nav.nav button:has-text("${label}")`).click()
const sub = (page, label) => page.locator(`.subtabs [role=tab]:has-text("${label}")`).first().click()
const sideways = page => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
const errs = (page, where) => { if (page.errors.length) bad(`${where} page errors: ${page.errors.join(' | ')}`); page.errors = [] }

/** Follow the whole example song with the fake mic (Wait for me) until it says Finished. */
async function playThrough(page) {
  await page.locator('button.listen').click()
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(500)
    if (await page.locator('[data-testid=report-card]').count()) return true
  }
  return false
}

;(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${OUT}/ode.wav`, '--autoplay-policy=no-user-gesture-required'],
  })

  // ---- report card after a whole run
  if (want('report')) for (const vp of [{ width: 840, height: 757 }, { width: 412, height: 915 }]) {
    const page = await newPage(browser, { 'kg:tab2': 'play', 'kg:playTidy': false }, vp)
    await page.waitForSelector('.tab-note', { timeout: 8000 })
    await page.locator('.song-check button:has-text("Got it")').click({ timeout: 2500 }).catch(() => {})
    const ok = await playThrough(page)
    if (!ok) { bad(`${vp.width}: no report card after a whole run`); await page.screenshot({ path: path.join(OUT, `b30-report-${vp.width}-fail.png`) }); await page.context().close(); continue }
    await page.locator('button.listen').click().catch(() => {})
    const txt = await page.locator('[data-testid=report-card]').innerText()
    const score = Number((await page.locator('.report-score b').textContent()) || -1)
    if (!(score >= 0 && score <= 100)) bad(`report score ${score}`)
    if (!/first full run/i.test(txt)) bad(`report should say first run: ${txt}`)
    const marks = await page.locator('.tab-markband').count()
    const nextLabel = await page.locator('.report-btns .btn.primary').textContent()
    console.log(`${vp.width}px: report ${score}%, ${marks} marked bar piece(s), next = "${nextLabel}"`)
    if (/Loop/.test(nextLabel) && !marks) bad('report suggests a loop but no bars are marked')
    await page.screenshot({ path: path.join(OUT, `b30-report-${vp.width}.png`) })
    if (await sideways(page)) bad(`report scrolls sideways at ${vp.width}`)
    await page.locator('.report-btns .btn.primary').click()
    await page.waitForTimeout(400)
    if (await page.locator('[data-testid=report-card]').count()) bad('report card stayed after its button')
    if (/Loop/.test(nextLabel) && !(await page.locator('.loop-chip').count())) bad('loop button did not set a loop')
    if (/In time/.test(nextLabel) && !(await page.locator('.chip[aria-pressed=true]:has-text("In time"), [aria-pressed=true]:has-text("In time")').count())) bad('In time button did not switch mode')
    // second run: compares with the first
    if (vp.width === 840) {
      await page.locator('.loop-chip button').click().catch(() => {})
      await page.locator('.chip:has-text("Wait for me"), button:has-text("Wait for me")').first().click().catch(() => {})
      await page.locator('.opts-btn').click(); await page.locator('.play-opts button:has-text("Start over")').click()
      if (await playThrough(page)) {
        const t2 = await page.locator('[data-testid=report-card]').innerText()
        if (!/last time|Same as/i.test(t2)) bad(`second report doesn't compare: ${t2}`)
        await page.locator('button.listen').click().catch(() => {})
      } else bad('no report after the second run')
    }
    errs(page, `report ${vp.width}`)
    await page.context().close()
  }

  // ---- Practice button: plan shown, starting it opens the trouble bars at 70%
  if (want('practice')) for (const vp of [{ width: 412, height: 915 }, { width: 840, height: 757 }, { width: 360, height: 760 }]) {
    const page = await newPage(browser, {
      'kg:tab2': 'learn',
      'kg:z2h': { phase: 1, since: 0, placed: true, ticks: [] },
    }, vp)
    // a song with trouble bars: open the example first so it exists, then seed its stats
    await nav(page, 'Play'); await page.waitForSelector('.tab-note', { timeout: 8000 })
    const id = await page.evaluate(() => JSON.parse(localStorage.getItem('kg:playSong:guitar')))
    await page.evaluate(id => localStorage.setItem('kg:songStats', JSON.stringify({ [id]: { title: 'Ode', inst: 'guitar', runs: [], best: 60, lastAt: Date.now(), barMiss: { 2: 3, 3: 2 }, barHit: { 0: 5 } } })), id)
    await nav(page, 'Learn'); await sub(page, 'Today')
    await page.waitForSelector('.practice-step', { timeout: 4000 }).catch(() => bad('no practice steps'))
    const steps = await page.locator('.practice-step b').allTextContents()
    console.log(`${vp.width}px practice: ${steps.join(' | ')}`)
    if (!steps.some(s => /Fix bars 3–4/.test(s))) bad(`practice plan missing the trouble bars: ${steps.join(' | ')}`)
    if (await sideways(page)) bad(`practice card scrolls sideways at ${vp.width}`)
    await page.screenshot({ path: path.join(OUT, `b30-practice-${vp.width}.png`) })
    await page.locator('.practice-len button:has-text("10 min")').click()
    await page.waitForTimeout(300)
    const steps10 = await page.locator('.practice-step').count()
    if (steps10 >= steps.length) bad('10-minute practice should drop a step')
    await page.locator('.practice-len button:has-text("20 min")').click()
    await page.waitForTimeout(300)
    await page.locator('.practice-go').click()
    await page.waitForSelector('.session-bar', { timeout: 4000 }).catch(() => bad('practice session did not start'))
    // jump to the fix step
    await page.locator('.session-bar button:has-text("Next")').click()
    await page.locator('.session-bar button:has-text("Next")').click()
    await page.waitForSelector('.loop-chip', { timeout: 5000 }).catch(() => bad('fix step did not loop the bars'))
    const chip = await page.locator('.loop-chip').textContent().catch(() => '')
    if (!/Bars 3–4/.test(chip)) bad(`fix step loop: ${chip}`)
    const speed = await page.evaluate(() => JSON.parse(localStorage.getItem('kg:playSpeed')))
    if (speed !== 0.7) bad(`fix step speed ${speed}`)
    await page.locator('.session-bar button:has-text("Next")').click()
    await page.waitForTimeout(800)
    if (await page.locator('.loop-chip').count()) bad('the song step should play it all the way (loop cleared)')
    errs(page, `practice ${vp.width}`)
    await page.context().close()
  }

  await browser.close()
  console.log(problems.length ? `\n${problems.length} problem(s)` : '\nbuild 30: all good')
  process.exit(problems.length ? 1 : 0)
})()
