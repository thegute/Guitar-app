// The 4-track looper (Jam → Looper) with a synthesized guitar as the fake mic: record a loop on the bar, Auto length
// closed by hand, overdub, undo / redo / clear, part A / B switching on the bar, the free first loop setting the tempo,
// the bass octave, mute / solo, the footswitch (keyboard), chop onto pads, make it a tab, resample, save to My
// recordings, the strip on Play / Scales / the beat maker, Jam → Loop over this progression, and every screen size.
// Needs `vite preview` on :4173 and CHROME_PATH. Usage: node tests/browser/looper-test.cjs [part,part]
const { chromium } = require('playwright')
const path = require('path')
const OUT = path.join(__dirname, 'out')
const only = process.argv[2] ? process.argv[2].split(',') : null
const want = p => !only || only.includes(p)
const problems = []
const bad = m => { problems.push(m); console.log('  PROBLEM', m) }

async function newPage(browser, viewport = { width: 412, height: 915 }, seed = {}, page0 = 'loop') {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1.5, hasTouch: true, permissions: ['microphone'] })
  const page = await ctx.newPage()
  page.errors = []
  page.on('pageerror', e => page.errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error' && !/youtube|ytimg|ERR_|net::|Failed to load resource/i.test(m.text())) page.errors.push('console: ' + m.text()) })
  await page.addInitScript(([s, p0]) => {
    try { if (window.top !== window || sessionStorage.getItem('seeded')) return } catch { return }
    localStorage.clear()
    localStorage.setItem('kg:welcomed', '1'); localStorage.setItem('kg:psyDefault', '1'); localStorage.setItem('kg:askBubble', 'false'); localStorage.setItem('kg:getReady', '0')
    localStorage.setItem('kg:tab2', '"progressions"'); localStorage.setItem('kg:sub:jam', JSON.stringify(p0))
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v))
    sessionStorage.setItem('seeded', '1')
  }, [seed, page0])
  await page.goto('http://localhost:4173/')
  if (page0 === 'loop') await page.waitForSelector('[data-testid=looper]', { timeout: 10000 })
  return page
}
const sideways = page => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
const errs = (page, where) => { if (page.errors.length) bad(`${where} page errors: ${page.errors.join(' | ')}`); page.errors = [] }
const session = page => page.evaluate(() => JSON.parse(localStorage.getItem('kg:looper') || 'null'))
const stateOf = (page, i) => page.locator(`[data-testid=lp-track-${i}]`).getAttribute('class').then(c => (/ s-(\w+)/.exec(c) || [])[1])
async function waitState(page, i, want, ms = 20000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { if ((await stateOf(page, i)) === want) return true; await page.waitForTimeout(100) }
  return false
}
const takes = (s, i, part = 'A') => s?.tracks?.[i]?.parts?.[part]?.takes?.length ?? 0

;(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${OUT}/ode.wav`, '--autoplay-policy=no-user-gesture-required'],
  })

  if (want('basic')) for (const vp of [{ width: 412, height: 915, n: 'cover' }, { width: 840, height: 757, n: 'inner' }]) {
    const page = await newPage(browser, vp)
    const tracks = await page.locator('.lp-track').count()
    if (tracks !== 4) bad(`${vp.n}: ${tracks} tracks, expected 4`)
    // tempo: 120 so a bar is 2 s
    const bpm0 = Number(await page.locator('[data-testid=lp-bpm]').innerText())
    for (let k = 0; k < Math.abs(120 - bpm0) && k < 80; k++) await page.locator(`.lp-tempo button[aria-label=${bpm0 < 120 ? 'Faster' : 'Slower'}]`).click()
    // track 1: one beat-length loop
    const t1 = page.locator('[data-testid=lp-track-0]')
    await t1.locator('.lp-lens button').nth(1).click()
    await page.locator('[data-testid=lp-rec-0]').click()
    const armed = await waitState(page, 0, 'armed', 3000)
    const note = await page.locator('[data-testid=lp-note]').innerText().catch(() => '')
    console.log(`${vp.n}: after the press: ${armed ? 'armed' : await stateOf(page, 0)} · "${note}"`)
    if (!armed) bad(`${vp.n}: the first press didn't arm (count-in)`)
    if (!(await waitState(page, 0, 'rec', 6000))) bad(`${vp.n}: never started recording`)
    if (!(await waitState(page, 0, 'loop', 30000))) bad(`${vp.n}: the loop never closed by itself`)
    let s = await session(page)
    const len = s?.tracks?.[0]?.parts?.A?.len
    console.log(`${vp.n}: track 1 = ${len} bar(s), ${takes(s, 0)} take; selected now: track ${s?.sel + 1}`)
    if (takes(s, 0) !== 1) bad(`${vp.n}: track 1 has ${takes(s, 0)} takes`)
    if (s?.sel !== 1) bad(`${vp.n}: the footswitch didn't move on to track 2`)
    // the waveform is drawn and the playhead moves
    if (!(await page.locator('[data-testid=lp-track-0] svg.lp-wave rect').count())) bad(`${vp.n}: no waveform`)
    const h1 = await page.locator('[data-testid=lp-track-0] .lp-head').evaluate(e => parseFloat(e.style.left))
    await page.waitForTimeout(400)
    const h2 = await page.locator('[data-testid=lp-track-0] .lp-head').evaluate(e => parseFloat(e.style.left))
    if (h1 === h2) bad(`${vp.n}: the playhead doesn't move (${h1} → ${h2})`)
    // track 2: Auto length, closed by hand after about 2 bars
    await page.locator('[data-testid=lp-rec-1]').click()
    await waitState(page, 1, 'rec', 6000)
    await page.waitForTimeout(4200)
    await page.locator('[data-testid=lp-rec-1]').click()
    if (!(await waitState(page, 1, 'loop', 15000))) bad(`${vp.n}: Auto loop on track 2 didn't close`)
    s = await session(page)
    console.log(`${vp.n}: track 2 Auto → ${s?.tracks?.[1]?.parts?.A?.len} bars`)
    if (![1, 2].includes(s?.tracks?.[1]?.parts?.A?.len)) bad(`${vp.n}: Auto length ${s?.tracks?.[1]?.parts?.A?.len}, expected 2 (or 1)`)
    // overdub on track 1: press, play a bar, press
    await page.locator('[data-testid=lp-rec-0]').click()
    const dubArmed = await waitState(page, 0, 'dubArmed', 1500) || (await stateOf(page, 0)) === 'dub'
    if (!dubArmed) bad(`${vp.n}: overdub didn't arm`)
    await waitState(page, 0, 'dub', 4000)
    await page.waitForTimeout(1500)
    await page.locator('[data-testid=lp-rec-0]').click()
    if (!(await waitState(page, 0, 'loop', 12000))) bad(`${vp.n}: overdub didn't finish`)
    s = await session(page)
    if (takes(s, 0) !== 2) bad(`${vp.n}: after the overdub track 1 has ${takes(s, 0)} takes`)
    // undo / redo / clear
    await page.locator('[data-testid=lp-track-0] button[aria-label="Undo track 1"]').click()
    s = await session(page); if (takes(s, 0) !== 1) bad(`${vp.n}: undo left ${takes(s, 0)} takes`)
    await page.locator('[data-testid=lp-track-0] button[aria-label="Redo track 1"]').click()
    s = await session(page); if (takes(s, 0) !== 2) bad(`${vp.n}: redo left ${takes(s, 0)} takes`)
    // mute + solo
    await page.locator('[data-testid=lp-track-1] button[aria-label="Solo track 2"]').click()
    s = await session(page); if (!s.tracks[1].solo) bad(`${vp.n}: solo not kept`)
    await page.locator('[data-testid=lp-track-1] button[aria-label="Solo track 2"]').click()
    // part B on the next bar
    await page.locator('[data-testid=lp-part-B]').click()
    const isArmed = await page.locator('[data-testid=lp-part-B]').getAttribute('class')
    if (!/armed/.test(isArmed || '')) bad(`${vp.n}: part B not armed`)
    await page.waitForTimeout(2600)
    if ((await page.locator('[data-testid=lp-part-B]').getAttribute('aria-pressed')) !== 'true') bad(`${vp.n}: part B never came in`)
    if ((await stateOf(page, 0)) !== 'empty') bad(`${vp.n}: part B should start empty`)
    await page.locator('[data-testid=lp-part-A]').click()
    await page.waitForTimeout(2600)
    if ((await stateOf(page, 0)) !== 'loop') bad(`${vp.n}: back in part A, track 1 lost its loop`)
    await page.screenshot({ path: path.join(OUT, `lp-basic-${vp.n}.png`), fullPage: false })
    if (await sideways(page)) bad(`${vp.n}: the looper scrolls sideways`)
    // stop: at the end of the bar
    await page.locator('[data-testid=lp-play]').click()
    await page.waitForTimeout(2500)
    if ((await page.locator('[data-testid=lp-play]').getAttribute('aria-label')) !== 'Play') bad(`${vp.n}: didn't stop at the end of the bar`)
    // the takes are in IndexedDB
    const ids = await page.evaluate(() => new Promise(res => { const r = indexedDB.open('kg-looper', 1); r.onsuccess = () => { const g = r.result.transaction('takes').objectStore('takes').getAllKeys(); g.onsuccess = () => res(g.result.length) } }))
    console.log(`${vp.n}: ${ids} takes stored`)
    if (ids < 3) bad(`${vp.n}: only ${ids} takes stored`)
    // after a reload everything is back
    await page.evaluate(() => sessionStorage.setItem('seeded', '1'))
    await page.reload()
    await page.waitForSelector('[data-testid=looper]')
    await page.waitForTimeout(800)
    if ((await stateOf(page, 0)) !== 'loop' || (await stateOf(page, 1)) !== 'loop') bad(`${vp.n}: loops not back after a reload`)
    errs(page, `basic ${vp.n}`)
    await page.context().close()
  }

  if (want('free')) {
    const page = await newPage(browser, { width: 412, height: 915 })
    await page.locator('[data-testid=lp-free]').click()
    const bpm0 = Number(await page.locator('[data-testid=lp-bpm]').innerText())
    await page.locator('[data-testid=lp-rec-0]').click()
    if (!(await waitState(page, 0, 'rec', 2000))) bad('free: did not record straight away')
    await page.waitForTimeout(3300)
    await page.locator('[data-testid=lp-rec-0]').click()
    if (!(await waitState(page, 0, 'loop', 10000))) bad('free: the loop did not close')
    const bpm1 = Number(await page.locator('[data-testid=lp-bpm]').innerText())
    const s = await session(page)
    const playing = (await page.locator('[data-testid=lp-play]').getAttribute('aria-label')) !== 'Play'
    console.log(`free: ${bpm0} → ${bpm1} BPM, ${s.tracks[0].parts.A.len} bars, beat playing: ${playing}; "${await page.locator('[data-testid=lp-note]').innerText().catch(() => '')}"`)
    // 3.3 s of loop: whole bars at a tempo between 40 and 240
    const secs = (s.tracks[0].parts.A.len * 240) / bpm1
    if (Math.abs(secs - 3.3) > 0.35) bad(`free: ${s.tracks[0].parts.A.len} bars at ${bpm1} BPM is ${secs.toFixed(2)} s, played 3.3 s`)
    if (!playing) bad('free: the beat did not join in')
    errs(page, 'free')
    await page.context().close()
  }

  if (want('bass')) {
    const page = await newPage(browser, { width: 840, height: 757 })
    await page.locator('[data-testid=lp-track-2] .lp-lens button').nth(1).click()
    await page.locator('[data-testid=lp-rec-2]').click()
    if (!(await waitState(page, 2, 'loop', 30000))) bad('bass: no loop')
    await page.locator('[data-testid=lp-more-2]').click()
    if ((await page.locator('[data-testid=lp-octave]').getAttribute('aria-pressed')) !== 'true') bad('bass: octave down not on by default')
    // the octave-down version gets made (Signalsmith): the waveform redraws
    await page.waitForTimeout(2500)
    await page.locator('[data-testid=lp-octave]').click()
    await page.locator('[data-testid=lp-more-2] ~ *').first().count()
    await page.screenshot({ path: path.join(OUT, 'lp-bass.png') })
    errs(page, 'bass')
    await page.context().close()
  }

  if (want('pedal')) {
    const page = await newPage(browser, { width: 412, height: 915 })
    await page.locator('[data-testid=lp-track-0] .lp-lens button').nth(1).click()
    await page.keyboard.press('ArrowRight')
    if (!(await waitState(page, 0, 'armed', 2000))) bad('pedal: → did not record')
    await waitState(page, 0, 'loop', 30000)
    // ← = stop at the end of the bar (a short press)
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(2600)
    if ((await page.locator('[data-testid=lp-play]').getAttribute('aria-label')) !== 'Play') bad('pedal: ← did not stop')
    // hold ← = clear the selected track (track 1 after selecting it)
    await page.locator('[data-testid=lp-track-0] .lp-th').click()
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(800); await page.keyboard.up('ArrowLeft')
    await page.waitForTimeout(300)
    if ((await stateOf(page, 0)) !== 'empty') bad('pedal: holding ← did not clear the track')
    errs(page, 'pedal')
    await page.context().close()
  }

  if (want('bridges')) {
    const page = await newPage(browser, { width: 840, height: 757 })
    await page.locator('[data-testid=lp-track-0] .lp-lens button').nth(2).click()
    await page.locator('[data-testid=lp-rec-0]').click()
    if (!(await waitState(page, 0, 'loop', 40000))) bad('bridges: no loop')
    // chop onto pads
    await page.locator('[data-testid=lp-more-0]').click()
    await page.locator('[data-testid=lp-chop-0]').click()
    await page.waitForTimeout(1200)
    const b = await page.evaluate(() => JSON.parse(localStorage.getItem('kg:studioBeat') || '{}'))
    const chops = Object.values(b.pads || {}).filter(d => /^Rhythm \d/.test(d.name || ''))
    console.log(`bridges: ${chops.length} slices on pads, choke ${[...new Set(chops.map(c => c.choke))]}`)
    if (chops.length < 3) bad(`bridges: chop made ${chops.length} pads`)
    // resample onto an empty track
    await page.locator('[data-testid=lp-resample-track]').scrollIntoViewIfNeeded()
    await page.locator('[data-testid=lp-resample-track]').click()
    await page.waitForFunction(() => /now on track/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => bad('bridges: resample onto a track never finished'))
    const s = await session(page)
    if (takes(s, 1) !== 1 || !s.tracks[0].mute) bad('bridges: resample did not land on track 2 with track 1 muted')
    // save the mix
    await page.locator('[data-testid=lp-save]').click()
    await page.waitForFunction(() => /Saved in My recordings/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => bad('bridges: save never finished'))
    const recs = await page.evaluate(() => new Promise(res => { const r = indexedDB.open('kg-recordings'); r.onsuccess = () => { const st = r.result.objectStoreNames[0]; const g = r.result.transaction(st).objectStore(st).getAll(); g.onsuccess = () => res(g.result.map(x => x.title)) }; r.onerror = () => res([]) }))
    console.log(`bridges: recordings ${JSON.stringify(recs)}`)
    if (!recs.some(t => /^Looper/.test(t))) bad('bridges: the mix is not in My recordings')
    // make it a tab: opens the Riff Scanner and scans
    await page.locator('[data-testid=lp-tab-0]').click()
    await page.waitForSelector('[data-testid=transcriber]', { timeout: 8000 }).catch(() => bad('bridges: Make it a tab did not open the Riff Scanner'))
    await page.locator('[data-testid=transcriber] [data-testid=scan-result]').waitFor({ timeout: 120000 }).catch(() => bad('bridges: no tab from the loop'))
    // the strip on the Riff Scanner? no: on Play and Scales
    await page.locator('[data-testid=now-playing]').click()
    await page.waitForSelector('[data-testid=looper-bar]', { timeout: 8000 }).catch(() => bad('bridges: no looper strip on Play'))
    await page.screenshot({ path: path.join(OUT, 'lp-play-strip.png') })
    if (await sideways(page)) bad('Play with the looper strip scrolls sideways')
    errs(page, 'bridges')
    await page.context().close()
  }

  if (want('jam')) {
    const page = await newPage(browser, { width: 412, height: 915 }, {}, 'jam')
    await page.locator('[data-testid=jam-loop-it]').waitFor({ timeout: 10000 })
    await page.locator('[data-testid=jam-loop-it]').click()
    await page.waitForSelector('[data-testid=looper]', { timeout: 8000 }).catch(() => bad('jam: Loop over this progression did not open the looper'))
    const chords = await page.locator('.lp-chords .chip').allInnerTexts()
    console.log(`jam: the looper's neck shows ${chords.join(' ')}`)
    if (chords.filter(c => c !== '–').length < 2) bad(`jam: the neck shows no chords (${chords})`)
    await page.locator('[data-testid=lp-play]').click()
    await page.waitForTimeout(1500)
    const gold = await page.locator('.note-dot.role-target, .note-dot.role-root').count()
    if (gold < 4) bad(`jam: no chord notes on the neck while it plays (${gold})`)
    await page.screenshot({ path: path.join(OUT, 'lp-jam.png') })
    errs(page, 'jam')
    await page.context().close()
  }

  if (want('sizes')) for (const vp of [{ width: 360, height: 760 }, { width: 412, height: 915 }, { width: 840, height: 757 }, { width: 1400, height: 876 }]) {
    for (const theme of ['psy', 'day', 'night']) {
      const page = await newPage(browser, vp, { 'kg:theme': theme })
      await page.locator('[data-testid=lp-more-1]').click()
      if (await sideways(page)) bad(`${vp.width} ${theme}: the looper scrolls sideways`)
      await page.screenshot({ path: path.join(OUT, `lp-${vp.width}-${theme}.png`) })
      errs(page, `sizes ${vp.width} ${theme}`)
      await page.context().close()
    }
  }

  await browser.close()
  console.log(problems.length ? `\n${problems.length} problem(s)` : '\nlooper: all good')
  process.exit(problems.length ? 1 : 0)
})()
