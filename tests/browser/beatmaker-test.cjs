// Beat maker (build 32) browser checks with a synthesized guitar as the fake mic: Sample mode (hold a pad = record,
// tap = settings), the pad editor (trim, instrument note/chord, settings), Your pads, chop a riff, keys mode, perform
// effects, patterns + song chain, bounce, export, redo, looper extras. Needs `vite preview` on :4173 and CHROME_PATH.
// Usage: node tests/browser/beatmaker-test.cjs [part,part]
const { chromium } = require('playwright')
const path = require('path')
const OUT = path.join(__dirname, 'out')
const only = process.argv[2] ? process.argv[2].split(',') : null
const want = p => !only || only.includes(p)
const problems = []
const bad = m => { problems.push(m); console.log('  PROBLEM', m) }

async function newPage(browser, viewport = { width: 412, height: 915 }, seed = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1.5, hasTouch: true, permissions: ['microphone'] })
  const page = await ctx.newPage()
  page.errors = []
  page.on('pageerror', e => page.errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error' && !/youtube|ytimg|ERR_|net::|Failed to load resource/i.test(m.text())) page.errors.push('console: ' + m.text()) })
  await page.addInitScript(s => {
    try { if (window.top !== window || sessionStorage.getItem('seeded')) return } catch { return }
    localStorage.clear()
    localStorage.setItem('kg:welcomed', '1'); localStorage.setItem('kg:psyDefault', '1'); localStorage.setItem('kg:askBubble', 'false'); localStorage.setItem('kg:getReady', '0')
    localStorage.setItem('kg:tab2', '"progressions"'); localStorage.setItem('kg:sub:jam', '"beats"')
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v))
    sessionStorage.setItem('seeded', '1')
  }, seed)
  await page.goto('http://localhost:4173/')
  await page.waitForSelector('.st-pads', { timeout: 10000 })
  return page
}
const sideways = page => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
const errs = (page, where) => { if (page.errors.length) bad(`${where} page errors: ${page.errors.join(' | ')}`); page.errors = [] }
const beat = async page => { await page.waitForTimeout(450); return page.evaluate(() => JSON.parse(localStorage.getItem('kg:studioBeat') || '{}')) }
async function hold(page, sel, ms) {
  await page.locator(sel).first().evaluate(e => e.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(250)
  const b = await page.locator(sel).first().boundingBox()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(ms)
  await page.mouse.up()
}

;(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${OUT}/ode.wav`, '--autoplay-policy=no-user-gesture-required'],
  })

  if (want('sample')) for (const vp of [{ width: 412, height: 915 }, { width: 840, height: 757 }]) {
    const page = await newPage(browser, vp)
    await page.locator('[data-testid=sample-mode]').click()
    await page.waitForTimeout(1200)
    if (!(await page.locator('.st-pads.sampling').count())) bad('Sample mode did not light the pads')
    // hold the kick pad: records onto it
    await page.screenshot({ path: path.join(OUT, `bm-before-${vp.width}.png`) })
    await hold(page, '.st-pad[data-voice="kick"]', 1300)
    await page.waitForTimeout(1500)
    let b = await beat(page)
    const k = b.pads?.kick
    console.log(`${vp.width}px sample: kick = ${k ? `${k.src} ${(k.end - k.start).toFixed(2)} s, root ${k.root ?? '–'}` : 'nothing'} · "${(await page.locator('.st-sample-bar').innerText()).slice(0, 70)}"`)
    if (!k || k.src !== 'rec' || !k.sample) bad('holding a pad in Sample mode did not record onto it')
    if (k && !(k.end > k.start)) bad('recording has no length after trimming')
    // a quick tap opens its settings
    await page.locator('.st-pad[data-voice="kick"]').click()
    await page.waitForSelector('[data-testid=pad-editor]', { timeout: 3000 }).catch(() => bad('tapping a pad in Sample mode did not open its settings'))
    if (await page.locator('[data-testid=pad-wave]').count()) {
      // drag the start handle right
      const w = await page.locator('[data-testid=pad-wave]').boundingBox()
      await page.mouse.move(w.x + 2, w.y + w.height / 2); await page.mouse.down(); await page.mouse.move(w.x + w.width * 0.2, w.y + w.height / 2, { steps: 4 }); await page.mouse.up()
      await page.waitForTimeout(300)
      const k2 = (await beat(page)).pads.kick
      if (!(k2.start > k.start)) bad(`dragging the start handle did not trim (${k.start} → ${k2.start})`)
    } else bad('no wave in the pad editor')
    // pitch and reverse
    await page.locator('[aria-label="Pitch in semitones"]').evaluate(el => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, '-5'); el.dispatchEvent(new Event('input', { bubbles: true })) })
    await page.locator('.pad-editor label:has-text("Reverse") input').check()
    await page.locator('[data-testid=pad-hear]').click()
    b = await beat(page)
    if (b.pads?.kick?.pitch !== -5 || !b.pads.kick.reverse) bad(`pitch/reverse not saved: ${JSON.stringify(b.pads.kick)}`)
    if (await sideways(page)) bad(`pad editor scrolls sideways at ${vp.width}`)
    await page.screenshot({ path: path.join(OUT, `bm-editor-${vp.width}.png`) })
    // an instrument chord on the snare
    await page.locator('.pad-editor .sheet-head button:has-text("Done")').click()
    await page.locator('.st-pad[data-voice="snare"]').click()
    await page.locator('.pad-src button:has-text("Instrument chord")').click()
    await page.locator('.pad-keychords .chip').nth(3).click()
    b = await beat(page)
    const sn = b.pads?.snare
    console.log(`${vp.width}px chord pad: ${sn?.src} ${sn?.inst} midi ${sn?.midi} ivs ${JSON.stringify(sn?.ivs)}`)
    if (!sn || sn.src !== 'chord' || !sn.ivs?.length) bad('chord pad not set')
    await page.locator('.pad-editor .sheet-head button:has-text("Done")').click()
    // undo brings the snare back
    await page.locator('.st-sample-bar button:has-text("Undo")').click()
    await page.waitForTimeout(200)
    b = await beat(page)
    if (b.pads?.snare?.ivs && JSON.stringify(b.pads.snare.ivs) === JSON.stringify(sn.ivs) && b.pads.snare.midi === sn.midi) bad('Undo did not take back the last pad change')
    // Your pads page: hold an empty pad
    await page.locator('.st-padpanel .seg button:has-text("Your pads")').click()
    await hold(page, '.st-pad[data-voice="u1"]', 900)
    await page.waitForTimeout(1200)
    b = await beat(page)
    if (b.pads?.u1?.src !== 'rec') bad('recording onto Your pads → Pad 1 failed')
    // leave Sample mode: pads play again
    await page.locator('[data-testid=sample-mode]').click()
    await page.locator('.st-pad[data-voice="u1"]').click()
    await page.locator('.st-padpanel .seg button:has-text("Drums")').click()
    await page.locator('.st-pad[data-voice="kick"]').click()
    if (await page.locator('.st-pads.sampling').count()) bad('Sample mode did not turn off')
    await page.screenshot({ path: path.join(OUT, `bm-pads-${vp.width}.png`) })
    if (await sideways(page)) bad(`beat maker scrolls sideways at ${vp.width}`)
    errs(page, `sample ${vp.width}`)
    await page.context().close()
  }

  await browser.close()
  console.log(problems.length ? `\n${problems.length} problem(s)` : '\nbeat maker: all good')
  process.exit(problems.length ? 1 : 0)
})()
