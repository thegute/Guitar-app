// Sound packs end to end (Stage 3 step 2): Settings → Sound → My sound packs → bring in a folder (a made-up pack of
// sine tones, tests/fixtures/pack-test) → it's listed → choose it for the Acoustic sound → "Try it" and a strum through
// pluck.ts both play from the pack (the engine counts pack notes in test builds) → remove it again. Cover and inner.
// node tests/browser/packs-test.cjs
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
    page.on('dialog', d => d.accept())
    await page.addInitScript(() => {
      window.__kgTest = true
      if (sessionStorage.getItem('s')) return
      localStorage.clear()
      for (const [k, v] of Object.entries({ 'kg:welcomed': '1', 'kg:psyDefault': '1', 'kg:getReady': '0', 'kg:tipsMode': '"off"', 'kg:sound': '"acoustic"' })) localStorage.setItem(k, v)
      sessionStorage.setItem('s', '1')
    })
    await page.goto('http://localhost:4173/')
    await page.waitForFunction(() => window.__kgLab, null, { timeout: 15000 })
    // Settings (the gear on Learn) → Sound
    await page.locator('nav >> text=Learn').first().click()
    await page.locator('button[aria-label=Settings]').first().click()
    await page.locator('[role=tab]:has-text("Sound")').first().click()
    const box = page.locator('[data-testid=sound-packs]')
    await box.waitFor({ timeout: 8000 }).catch(() => bad(`${vp.n}: My sound packs isn't in Settings → Sound`))
    // the phone way (one .kgpack file) on the cover screen, the computer way (a folder) on the inner screen
    if (vp.n === 'cover') await box.locator('input[type=file][accept*=kgpack]').setInputFiles(path.join(__dirname, '..', 'fixtures', 'pack-test.kgpack'))
    else await box.locator('input[type=file]:not([accept])').setInputFiles(path.join(__dirname, '..', 'fixtures', 'pack-test'))
    await page.locator('[data-testid=sound-pack]:has-text("Test sines")').waitFor({ timeout: 10000 }).catch(() => bad(`${vp.n}: the imported pack isn't listed`))
    await page.locator('[data-testid=sound-pack] select').selectOption('acoustic')
    if ((await page.evaluate(() => localStorage.getItem('kg:pack:acoustic'))) !== '"test-sines"') bad(`${vp.n}: choosing it for Acoustic wasn't saved`)
    await page.locator('[data-testid=sound-pack] button:has-text("Try it")').click()
    await page.waitForTimeout(2500)
    const tried = await page.evaluate(() => window.__kgPackPlays ?? 0)
    if (tried < 6) bad(`${vp.n}: Try it played ${tried} pack notes, want 6`)
    // pluck.ts (every feature's guitar) now plays the pack: the sound lab's acoustic strum scene
    await page.evaluate(() => window.__kgLab.runScene('strum-acoustic'))
    const after = await page.evaluate(() => window.__kgPackPlays ?? 0)
    if (after - tried < 20) bad(`${vp.n}: strums through pluck.ts played ${after - tried} pack notes`)
    await page.locator('[data-testid=sound-pack] button:has-text("Remove")').click()
    await page.waitForTimeout(500)
    if (await page.locator('[data-testid=sound-pack]').count()) bad(`${vp.n}: the pack is still listed after Remove`)
    if (await page.evaluate(() => localStorage.getItem('kg:pack:acoustic'))) bad(`${vp.n}: Acoustic still points at the removed pack`)
    if (errors.length) bad(`${vp.n}: page errors: ${errors.join(' | ')}`)
    console.log(`${vp.n}: imported, Try it ${tried} notes, strums ${after - tried} pack notes, removed`)
    await page.context().close()
  }
  await browser.close()
  console.log(problems.length ? `\n${problems.length} problems` : '\npacks: all good')
  process.exit(problems.length ? 1 : 0)
})()
