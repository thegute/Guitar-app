// Headless check of the Jam screen (generator, diagrams, playback, looper recording) and the Play screen's section loop.
// Run after `npm run build && npx vite preview --port 4173` and `node tests/browser/gen-ode.cjs`.
const { chromium } = require('playwright')
const path = require('path')
const DIR = path.join(__dirname, 'out')
require('fs').mkdirSync(DIR, { recursive: true })
const only = process.argv[2]

;(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${DIR}/ode.wav`, '--autoplay-policy=no-user-gesture-required'],
  })
  const vps = [
    { name: 'cover', width: 412, height: 915, dpr: 2.6 },
    { name: 'inner-landscape', width: 840, height: 757, dpr: 2.6 },
  ].filter(v => !only || v.name === only)
  for (const vp of vps) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.dpr, hasTouch: true, permissions: ['microphone'] })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', e => errors.push('pageerror: ' + e.message))
    page.on('console', m => { if (m.type() === 'error' && !/youtube|ERR_|net::/i.test(m.text())) errors.push('console: ' + m.text()) })
    await page.addInitScript(() => { try { localStorage.setItem('kg:welcomed', '1') } catch { /* video iframe */ } })
    await page.goto('http://localhost:4173/')
    await page.click('nav >> text=Jam')
    await page.waitForSelector('.prog-card')
    await page.click('button:has-text("Options")')
    await page.waitForTimeout(400)
    const out = { vp: vp.name }
    const cards = async () => page.$$eval('.prog-card .pc-name', e => e.map(x => x.textContent).join(' '))
    out.first = await cards()
    out.diagrams = await page.$$eval('.prog-card svg', e => e.length)
    await page.screenshot({ path: `${DIR}/jam-${vp.name}-1.png` })
    // jazz, 8 chords, wild
    await page.click('.jam-options >> text=Jazz')
    await page.click('.jam-options [aria-label="How many chords"] >> text=8')
    await page.click('.jam-options >> text=Wild')
    await page.click('button:has-text("New progression")')
    await page.waitForTimeout(300)
    out.jazz = await cards()
    out.romans = await page.$$eval('.prog-card .pc-roman', e => e.map(x => x.textContent).join(' '))
    await page.click('button:has-text("Hide options")')
    await page.screenshot({ path: `${DIR}/jam-${vp.name}-2-jazz.png`, fullPage: true })
    // swap one chord, cycle a shape
    await page.click('.prog-card:nth-child(3) .pc-swap')
    out.afterSwap = await cards()
    await page.click('.prog-card:nth-child(2) .diagram')
    out.shapeLabel = await page.textContent('.prog-card:nth-child(2) .pc-foot')
    // play the loop and watch the highlight move
    await page.click('button:has-text("Play loop")')
    const lit = new Set()
    for (let i = 0; i < 14; i++) { await page.waitForTimeout(500); lit.add(await page.evaluate(() => [...document.querySelectorAll('.prog-card')].findIndex(e => e.classList.contains('on')))) }
    out.litCards = [...lit].join(',')
    await page.click('button:has-text("Stop")')
    // back to a short loop for recording: pop, 4 chords, fast tempo
    await page.click('button:has-text("Options")')
    await page.click('.jam-options >> text=Pop')
    await page.click('.jam-options [aria-label="How many chords"] >> text=2')
    await page.click('.jam-options [aria-label="Chord changes"] >> text=Every bar')
    await page.click('button:has-text("New progression")')
    await page.click('button:has-text("Hide options")')
    await page.$eval('input[aria-label="Loop tempo"]', el => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, '160'); el.dispatchEvent(new Event('input', { bubbles: true })) })
    out.tempoLabel = await page.textContent('.jam .field span')
    // record a layer
    // the looper folds away: open it first
    if (!(await page.isVisible('.looper button.rec'))) await page.click('.fold-toggle:has-text("Looper")')
    await page.click('.looper button.rec')
    await page.waitForTimeout(800)
    out.countIn = await page.textContent('.looper .rec-meter').catch(() => 'none')
    await page.screenshot({ path: `${DIR}/jam-${vp.name}-3-recording.png` })
    await page.waitForSelector('.layers li', { timeout: 15000 }).catch(() => {})
    out.layers = await page.$$eval('.layers li', e => e.length)
    out.chordsChip = await page.$eval('button.chip:has-text("Backing guitar")', b => b.getAttribute('aria-pressed'))
    // nudge earlier
    await page.click('.layers li >> text=Earlier').catch(() => {})
    out.nudge = await page.textContent('.layers li .nudge').catch(() => '')
    await page.screenshot({ path: `${DIR}/jam-${vp.name}-4-looper.png` })
    // add a second layer while playing
    await page.click('button:has-text("Add a layer")')
    await page.waitForFunction(() => document.querySelectorAll('.layers li').length >= 2, null, { timeout: 15000 }).catch(() => {})
    out.layers2 = await page.$$eval('.layers li', e => e.length)
    await page.click('button:has-text("Stop")')
    await page.click('button:has-text("Clear")')
    // circle of fifths (on the Solo over it page): pick D
    await page.click('.subtabs [role=tab]:has-text("Solo over it")')
    await page.waitForSelector('.cof-cell')
    await page.locator('.cof-cell', { has: page.locator('text', { hasText: /^D$/ }) }).first().locator('path').click().catch(e => errors.push('circle click ' + e.message.slice(0, 80)))
    await page.waitForTimeout(200)
    out.afterCircle = await page.textContent('.jam .small.muted')
    await page.screenshot({ path: `${DIR}/jam-${vp.name}-5-circle.png`, fullPage: true })
    // timing check (fake mic: just make sure it finishes)
    await page.click('.subtabs [role=tab]:has-text("Jam")')
    if (!(await page.isVisible('.looper button.rec'))) await page.click('.fold-toggle:has-text("Looper")')
    await page.click('.looper summary').catch(() => {})
    await page.click('button:has-text("Timing check")')
    await page.waitForTimeout(7500)
    out.timing = (await page.textContent('.looper .notice').catch(() => ''))?.slice(0, 90)
    out.hScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)

    // Play screen: loop bars 2–3
    await page.click('nav >> text=Play')
    await page.waitForSelector('.tab-note')
    await page.click('.tab-tools button:has-text("Loop")')
    await page.click('svg.tab-bar[data-bar="1"]')
    await page.click('svg.tab-bar[data-bar="2"]')
    await page.waitForTimeout(200)
    out.loopChip = await page.textContent('.loop-chip').catch(() => 'none')
    out.loopBands = await page.$$eval('.tab-loopband', e => e.length)
    out.cursorBar = await page.$eval('.tab-cursor', r => r.closest('svg').dataset.bar)
    await page.click('button.hear')
    const heads = []
    for (let i = 0; i < 10; i++) { await page.waitForTimeout(350); heads.push(await page.evaluate(() => document.querySelector('.tab-view.playing .tab-cursor')?.closest('svg').dataset.bar ?? '-')) }
    out.loopPlayhead = heads.join('')
    await page.click('button.hear')
    await page.screenshot({ path: `${DIR}/jam-${vp.name}-6-playloop.png` })
    out.errors = errors
    console.log(JSON.stringify(out, null, 1))
    await ctx.close()
  }
  await browser.close()
})()
