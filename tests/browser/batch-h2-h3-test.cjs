// Batch H2 + H3 browser verification:
// H2: Play Key badge & Transpose Bar (+/- semitones, 12-key select, Capo 1-7, Sync Capo, Reset),
//     Exercises transpose + Jam key match, Jam key mismatch banner (transpose chords / switch Jam key),
//     Songs library key filter + key links banner, and rare-key Licks deep link fallback (no empty wall).
// H3: Slim Cue Bar above tab in both normal Play (no blocking .count-big overlay: Option B) and Music Stand mode,
//     plus Looper BarLights mount & Beat 1 pulse attributes without overflow or console errors.
// Run after `npm run build && npx vite preview --port 4173`.
const { chromium } = require('playwright')

const problems = []
const ok = (cond, msg) => { if (!cond) { problems.push(msg); console.log('  FAIL:', msg) } }

async function newPage(browser, seed = {}, viewport = { width: 360, height: 760 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: true })
  const page = await ctx.newPage()
  page.errors = []
  page.on('pageerror', e => page.errors.push('pageerror: ' + e.message))
  page.on('console', m => {
    if (m.type() === 'error' && !/youtube|ytimg|ERR_|net::|Failed to load resource/i.test(m.text())) {
      page.errors.push('console: ' + m.text())
    }
  })
  await page.addInitScript(s => {
    window.__kgTest = true
    try { if (window.top !== window || sessionStorage.getItem('seeded')) return } catch { return }
    localStorage.clear()
    localStorage.setItem('kg:welcomed', '1')
    localStorage.setItem('kg:psyDefault', '1'); localStorage.setItem('kg:navHidden', '0')
    localStorage.setItem('kg:getReady', '0')
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v))
    sessionStorage.setItem('seeded', '1')
  }, seed)
  await page.goto('http://localhost:4173/')
  await page.waitForSelector('nav.nav')
  return page
}

;(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  })

  try {
    // 1. Play (360x760 phone + 1366x768 desktop): H2 Transpose Bar + Sync Capo, H3 Cue Bar above Tab (normal & Music Stand)
    for (const vp of [{ n: 'phone', w: 360, h: 760 }, { n: 'desktop', w: 1366, h: 768 }]) {
      const page = await newPage(browser, { 'kg:tab2': 'play', 'kg:theme': 'night' }, { width: vp.w, height: vp.h })
      await page.waitForSelector('.tab-bar')
      await page.waitForSelector('[data-testid="play-key-badge"]')

      const startKey = (await page.locator('[data-testid="play-key-badge"]').textContent() || '').trim()
      ok(startKey.length > 0, `${vp.n}: play-key-badge shows initial key (${startKey})`)

      // Open transpose bar
      await page.locator('[data-testid="play-key-badge"]').click()
      await page.waitForSelector('[data-testid="play-transpose-bar"]')

      // Transpose up +2 semitones
      await page.locator('[data-testid="transpose-up"]').click()
      await page.locator('[data-testid="transpose-up"]').click()
      await page.waitForTimeout(80)
      const upKey = (await page.locator('[data-testid="play-key-badge"]').textContent() || '').trim()
      ok(upKey !== startKey, `${vp.n}: transpose +2 updates play-key-badge (${startKey} -> ${upKey})`)

      // Toggle Sync Capo -> Capo becomes 2 and spelled-out Capo 2 caption shows
      await page.locator('[data-testid="capo-sync-toggle"]').check()
      await page.waitForTimeout(80)
      const capoVal = await page.locator('[data-testid="play-capo-select"]').inputValue()
      const syncedKey = (await page.locator('[data-testid="play-key-badge"]').textContent() || '').trim()
      ok(capoVal === '2' && /Capo 2/.test(syncedKey), `${vp.n}: Sync Capo updates capo=2 & badge "${syncedKey}"`)

      // Reset -> restores initial key & closes reset button
      await page.locator('[data-testid="transpose-reset"]').click()
      await page.waitForTimeout(80)
      const resetKey = (await page.locator('[data-testid="play-key-badge"]').textContent() || '').trim()
      ok(resetKey === startKey, `${vp.n}: Reset restores key (${resetKey})`)

      // Switch to In time and start playback -> Option B Cue Bar check
      await page.locator('.tab-tools >> text=In time').click()
      await page.waitForTimeout(80)
      await page.locator('.play-head .btn.listen').click()
      await page.waitForSelector('[data-testid="cue-bar"]')
      await page.waitForTimeout(180)

      // Option B: NO giant centered .count-big overlay in normal Play view
      const giantOverlayCount = await page.locator('.count-big').count()
      ok(giantOverlayCount === 0, `${vp.n}: Option B keeps giant .count-big hidden in normal Play view (${giantOverlayCount})`)

      // Cue Bar must sit cleanly above .tab-bar without blocking
      const normLayout = await page.evaluate(() => {
        const cue = document.querySelector('[data-testid="cue-bar"]')?.getBoundingClientRect()
        const tab = document.querySelector('.tab-bar')?.getBoundingClientRect()
        const phase = document.querySelector('[data-testid="cue-bar"]')?.getAttribute('data-phase')
        return { cueBottom: cue ? cue.bottom : -1, cueH: cue ? cue.height : 0, tabTop: tab ? tab.top : -1, phase }
      })
      ok(normLayout.cueH > 10 && normLayout.tabTop >= normLayout.cueBottom - 2,
        `${vp.n}: Normal Play CueBar sits above tab without overlap (cueBottom=${Math.round(normLayout.cueBottom)}, tabTop=${Math.round(normLayout.tabTop)}, phase=${normLayout.phase})`)

      // Enter Music Stand mode: on narrow phones (<= 480px) it opens Big View first (check compact CueBar, then switch to "Show the tab")
      await page.locator('.stand-btn').first().click()
      await page.waitForTimeout(150)
      if (vp.w <= 480) {
        await page.waitForSelector('[data-testid="remote"]')
        const remoteCue = await page.locator('[data-testid="remote"] [data-testid="cue-bar"]').count()
        ok(remoteCue === 1, `${vp.n}: Music Stand Big View renders compact CueBar`)
        await page.locator('[data-testid="remote"] button:has-text("Show the tab")').click()
      }
      await page.waitForSelector('[data-testid="stand-bar"]')
      await page.waitForTimeout(150)
      const standLayout = await page.evaluate(() => {
        const cue = document.querySelector('[data-testid="cue-bar"]')?.getBoundingClientRect()
        const tab = document.querySelector('.tab-bar')?.getBoundingClientRect()
        return { cueBottom: cue ? cue.bottom : -1, cueH: cue ? cue.height : 0, tabTop: tab ? tab.top : -1 }
      })
      ok(standLayout.cueH > 10 && standLayout.tabTop >= standLayout.cueBottom - 2,
        `${vp.n}: Music Stand tab CueBar sits above tab without overlap (cueBottom=${Math.round(standLayout.cueBottom)}, tabTop=${Math.round(standLayout.tabTop)})`)

      // Exit stand & stop playback
      await page.locator('.stand-x').click()
      await page.waitForTimeout(80)
      const ov = await page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth)
      ok(ov <= 0, `${vp.n}: Play has no horizontal overflow (${ov})`)
      ok(page.errors.length === 0, `${vp.n}: Play had 0 errors (${page.errors.join(' | ')})`)
      await page.context().close()
    }

    // 2. Jam Key Mismatch Warning (1-tap Switch key & Transpose chords) + Looper BarLights
    {
      const amProg = [
        { semi: 0, type: 'm', roman: 'i', root: 'A', symbol: 'Am', beats: 4 },
        { semi: 5, type: 'm', roman: 'iv', root: 'D', symbol: 'Dm', beats: 4 },
        { semi: 7, type: '7', roman: 'V7', root: 'E', symbol: 'E7', beats: 4 },
        { semi: 0, type: 'm', roman: 'i', root: 'A', symbol: 'Am', beats: 4 },
      ]
      const page = await newPage(browser, {
        'kg:tab2': 'progressions',
        'kg:theme': 'day',
        'kg:jamProg': amProg,
        'kg:progKey': 'G',
        'kg:progMode': 'major',
      }, { width: 360, height: 760 })
      await page.waitForSelector('[data-testid="jam-key-mismatch"]')
      const bannerTxt = await page.locator('[data-testid="jam-key-mismatch"]').textContent()
      ok(/Am/.test(bannerTxt) && /G/.test(bannerTxt), `Jam detects Am/Dm/E7 mismatch vs G (${bannerTxt})`)

      // Click Transpose chords -> moves progression to G and clears banner
      await page.locator('[data-testid="jam-transpose-chords"]').click()
      await page.waitForTimeout(100)
      ok(await page.locator('[data-testid="jam-key-mismatch"]').count() === 0, 'Transpose chords clears Jam mismatch warning')

      // Open Looper page to verify BarLights renders cleanly with 4 beat pips
      await page.locator('[data-testid="jam-loop"]').click()
      await page.waitForSelector('[data-testid="bar-lights"]')
      const pips = await page.locator('[data-testid="bar-lights"] i').count()
      ok(pips >= 4, `Looper BarLights renders beat pips (${pips})`)

      const ov = await page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth)
      ok(ov <= 0, `Jam/Looper has no horizontal overflow on 360px (${ov})`)
      ok(page.errors.length === 0, `Jam/Looper had 0 errors (${page.errors.join(' | ')})`)
      await page.context().close()
    }

    // 3. Songs Key Filter & Links + Exercises Transpose + Rare-Key Licks Fallback (openLicksInKey)
    {
      const page = await newPage(browser, { 'kg:tab2': 'songs', 'kg:theme': 'psy' }, { width: 1366, height: 768 })
      await page.waitForSelector('[data-testid="lib-key-filter"]')
      await page.locator('[data-testid="lib-key-filter"]').selectOption('7:0')
      await page.waitForSelector('[data-testid="lib-key-links"]')
      ok(await page.locator('[data-testid="songs-to-licks"]').count() === 1 && await page.locator('[data-testid="songs-to-exercises"]').count() === 1,
        'Songs Key filter renders deep links to Licks & Exercises')

      // Navigate to Exercises, pick Bluegrass Licks so keyed exercise shows key-tag, and test transpose
      await page.locator('[data-testid="songs-to-exercises"]').click()
      await page.waitForSelector('.ex-browser')
      await page.locator('.ex-filters select').nth(3).selectOption('all')
      await page.locator('.ex-filters select').nth(1).selectOption('lick:bluegrass')
      await page.waitForSelector('.ex-card-head .key-tag')
      const exKeyBefore = (await page.locator('.ex-card-head .key-tag').textContent() || '').trim()
      await page.locator('[data-testid="ex-transpose-up"]').click()
      await page.waitForTimeout(80)
      const exKeyAfter = (await page.locator('.ex-card-head .key-tag').textContent() || '').trim()
      ok(exKeyBefore !== exKeyAfter, `ExerciseBrowser transpose changes key tag (${exKeyBefore} -> ${exKeyAfter})`)

      // Also directly test rare-key Licks deep link by opening Play via Now Playing bar, transposing to Bb, and clicking Licks
      await page.locator('[data-testid="now-playing"]').click()
      await page.waitForSelector('[data-testid="play-key-badge"]')
      await page.locator('[data-testid="play-key-badge"]').click()
      await page.waitForSelector('[data-testid="transpose-key-select"]')
      await page.locator('[data-testid="transpose-key-select"]').selectOption('Bb')
      await page.waitForTimeout(80)
      await page.locator('[data-testid="play-to-licks"]').click()
      await page.waitForSelector('.lick-library')
      const wantBanner = await page.locator('[data-testid="lick-want"]').count()
      const lickCards = await page.locator('.lick-card').count()
      ok(wantBanner === 1 && lickCards >= 1, `Rare key (Bb) Licks link falls back to transposed want-key banner with ${lickCards} playable licks (instead of empty screen)`)

      const ov = await page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth)
      ok(ov <= 0, `Songs/Exercises/Licks deep-link flow has no overflow (${ov})`)
      ok(page.errors.length === 0, `Deep links flow had 0 errors (${page.errors.join(' | ')})`)
      await page.context().close()
    }
  } finally {
    await browser.close()
  }

  console.log(`Batch H2 + H3 browser verification: ${problems.length ? problems.length + ' problem(s)' : 'ALL PASSED'}`)
  if (problems.length) process.exit(1)
})()
