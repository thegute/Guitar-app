// Jam → Inspire me (chord sets, Playbox style): roll a set, hear a chord, lock one and roll again (it stays), shuffle,
// tap two chords into your order and play them with the band (Jam's progression becomes them), bring in a made-up
// chordsets.json (tests/fixtures; the owner's real Playbox file is private) and roll from it. Cover and inner, no
// sideways overflow, no page errors.
// node tests/browser/inspire-test.cjs
const { chromium } = require('playwright')
const path = require('path')
const problems = []
const bad = m => { problems.push(m); console.log('  PROBLEM', m) }
;(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
  for (const vp of [{ width: 412, height: 915, n: 'cover' }, { width: 840, height: 757, n: 'inner' }]) {
    const page = await (await browser.newContext({ viewport: vp })).newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.addInitScript(() => {
      window.__kgTest = true
      if (sessionStorage.getItem('s')) return
      localStorage.clear()
      for (const [k, v] of Object.entries({ 'kg:welcomed': '1', 'kg:psyDefault': '1', 'kg:getReady': '0', 'kg:tipsMode': '"off"', 'kg:progKey': '"G"' })) localStorage.setItem(k, v)
      sessionStorage.setItem('s', '1')
    })
    await page.goto('http://localhost:4173/')
    await page.locator('nav >> text=Jam').first().click()
    const box = page.locator('[data-testid=inspire]')
    await box.waitFor({ timeout: 10000 }).catch(() => bad(`${vp.n}: Inspire me isn't on Jam`))
    await box.scrollIntoViewIfNeeded()
    const names = async () => (await box.locator('[data-testid=inspire-chord] .readout').allTextContents()).join(' ')
    const first = await names()
    if (!first) bad(`${vp.n}: no chords shown`)
    await box.locator('[data-testid=inspire-roll]').click()
    const second = await names()
    if (second === first) bad(`${vp.n}: rolling didn't change the set`)
    // lock the first chord, roll: it stays
    const keep = (await box.locator('[data-testid=inspire-chord] .readout').first().textContent()).trim()
    await box.locator('.inspire-chord').first().locator('button[aria-label^="Keep"]').click()
    await box.locator('[data-testid=inspire-roll]').click()
    const kept = (await box.locator('[data-testid=inspire-chord] .readout').first().textContent()).trim()
    if (kept !== keep) bad(`${vp.n}: the locked chord changed (${keep} → ${kept})`)
    await box.locator('[data-testid=inspire-chord]').nth(1).click() // hear it, and its finger diagram pops up
    if (!(await page.locator('[data-testid=chord-peek]').count())) bad(`${vp.n}: pressing a chord didn't show its finger diagram`)
    else {
      const peekName = await page.locator('[data-testid=chord-peek] .diagram, [data-testid=chord-peek] svg').count()
      if (!peekName) bad(`${vp.n}: the chord peek has no diagram in it`)
    }
    await box.locator('[data-testid=inspire-shuffle]').click()
    const sh = (await box.locator('[data-testid=inspire-chord] .readout').first().textContent()).trim()
    if (sh !== keep) bad(`${vp.n}: shuffle moved the locked chord`)
    // my order: chords 2 and 1
    const c2 = (await box.locator('[data-testid=inspire-chord] .readout').nth(1).textContent()).trim()
    await box.locator('[data-testid=inspire-add]').nth(1).click()
    await box.locator('[data-testid=inspire-add]').nth(0).click()
    await box.locator('[data-testid=inspire-use]').click()
    await page.waitForTimeout(400)
    const prog = (await page.locator('.prog-card .pc-name').allTextContents()).map(s => s.trim())
    if (prog.join(' ') !== `${c2} ${keep}`) bad(`${vp.n}: Jam's progression is "${prog.join(' ')}", want "${c2} ${keep}"`)
    // every chord name in the app: a famous progression's chord (Jam → Famous progressions, opened) and the progression card
    const fam = page.locator('[data-win=famous] [data-chord]').first()
    if (await fam.count()) {
      await page.waitForTimeout(2200)
      await fam.scrollIntoViewIfNeeded().catch(() => {})
      await fam.dispatchEvent('pointerdown').catch(() => {})
      await page.waitForTimeout(150)
      if (!(await page.locator('[data-testid=chord-peek]').count())) bad(`${vp.n}: a famous progression's chord name has no finger diagram`)
      await page.mouse.up()
    }
    // bring in a chord sets file
    await box.locator('input[type=file]').setInputFiles(path.join(__dirname, '..', 'fixtures', 'chordsets-test.json'))
    await box.locator('text=2 chord sets brought in').waitFor({ timeout: 5000 }).catch(() => bad(`${vp.n}: the chord sets file didn't come in`))
    let sawImported = false
    for (let i = 0; i < 40 && !sawImported; i++) {
      await box.locator('[data-testid=inspire-roll]').click()
      sawImported = (await box.textContent()).includes('from your Playbox')
    }
    if (!sawImported) bad(`${vp.n}: never rolled one of the brought-in sets`)
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    if (over > 1) bad(`${vp.n}: ${over}px sideways overflow`)
    if (errors.length) bad(`${vp.n}: page errors: ${errors.join(' | ')}`)
    await page.screenshot({ path: path.join(__dirname, 'out', `inspire-${vp.n}.png`) })
    console.log(`${vp.n}: rolled, lock held, order → Jam "${prog.join(' ')}", file brought in`)
    await page.context().close()
  }
  await browser.close()
  console.log(problems.length ? `\n${problems.length} problems` : '\ninspire: all good')
  process.exit(problems.length ? 1 : 0)
})()
