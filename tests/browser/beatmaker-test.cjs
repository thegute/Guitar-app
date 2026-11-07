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
    // the pitch dial: five steps down with the keys
    const knob = page.locator('[data-testid=pitch-dial] [role=slider]')
    await knob.focus()
    for (let i = 0; i < 5; i++) await knob.press('ArrowDown')
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

  // ---- chop a riff onto Your pads, then play one up and down the keyboard
  if (want('chop')) {
    const page = await newPage(browser, { width: 412, height: 915 })
    await page.locator('.st-padpanel .seg button:has-text("Your pads")').click()
    await page.locator('[data-testid=chop-open]').click()
    await page.waitForTimeout(1200)
    await page.locator('[data-testid=chop-rec]').click()
    await page.waitForTimeout(4500)
    await page.locator('[data-testid=chop-rec]').click()
    await page.waitForSelector('[data-testid=chop-put]', { timeout: 5000 }).catch(() => bad('chop: no slices step'))
    const found = await page.locator('.chop-mark').count()
    console.log(`chop: ${found} notes found in 4.5 s of the fake guitar`)
    if (found < 3) bad(`chop found only ${found} notes`)
    await page.screenshot({ path: path.join(OUT, 'bm-chop.png') })
    await page.locator('[data-testid=chop-put]').click()
    await page.waitForSelector('[data-testid=chop]', { state: 'detached', timeout: 5000 }).catch(() => bad('chop sheet did not close'))
    const b = await beat(page)
    const n = Object.keys(b.pads || {}).filter(k => /^u\d+$/.test(k)).length
    if (n !== found) bad(`chop put ${n} pads, found ${found}`)
    // the keyboard plays Riff 1 up and down
    await page.evaluate(() => document.querySelector('.st-keypanel')?.scrollIntoView({ block: 'center' }))
    const sel = page.locator('.st-keypanel select').first()
    const opts = await sel.locator('option').allTextContents()
    if (!opts.some(o => /Riff 1/.test(o))) bad('Keyboard sound list has no Your pads')
    else {
      await sel.selectOption({ label: 'Riff 1' })
      const key = page.locator('.st-key.white').nth(3)
      await key.click()
      await page.waitForTimeout(300)
    }
    if (await sideways(page)) bad('chop scrolls sideways')
    errs(page, 'chop')
    await page.context().close()
  }

  // ---- effects pad: every effect, dragged while the beat plays
  if (want('fx')) for (const vp of [{ width: 412, height: 915 }, { width: 840, height: 757 }]) {
    const page = await newPage(browser, vp)
    await page.locator('.st-play').first().click()
    const pad = page.locator('[data-testid=fx-pad]')
    await pad.evaluate(e => e.scrollIntoView({ block: 'center' }))
    await page.waitForTimeout(300)
    for (const k of ['Filter', 'Echo', 'Reverb', 'Stutter', 'Crush', 'Gate']) {
      await page.locator(`.st-fx-kinds button:has-text("${k}")`).click()
      const b = await pad.boundingBox()
      await page.mouse.move(b.x + b.width * 0.2, b.y + b.height * 0.7)
      await page.mouse.down()
      await page.mouse.move(b.x + b.width * 0.8, b.y + b.height * 0.2, { steps: 6 })
      if (!(await page.locator('.st-xy.on .st-xy-dot').count())) bad(`${k}: no dot while dragging`)
      await page.waitForTimeout(400)
      await page.mouse.up()
      if (await page.locator('.st-xy.on').count()) bad(`${k}: still on after letting go`)
    }
    // latch keeps it on
    await page.locator('label:has-text("Latch") input').check()
    const b = await pad.boundingBox()
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
    if (!(await page.locator('.st-xy.on').count())) bad('latch did not keep the effect on')
    await page.locator('button:has-text("Effect off")').click()
    await page.screenshot({ path: path.join(OUT, `bm-fx-${vp.width}.png`) })
    if (await sideways(page)) bad(`effects scroll sideways at ${vp.width}`)
    await page.locator('.st-play').first().click()
    errs(page, `fx ${vp.width}`)
    await page.context().close()
  }

  // ---- parts A–D and the song chain
  if (want('song')) for (const vp of [{ width: 412, height: 915 }, { width: 840, height: 757 }]) {
    const page = await newPage(browser, vp)
    await page.locator('button:has-text("Key, bars, save")').click()
    await page.locator('.st-bars button:has-text("1")').click()
    await page.locator('[data-testid=part-B]').click()
    let b = await beat(page)
    if (b.part !== 'B' || !b.parts?.A) bad('making part B failed')
    await page.locator('[data-testid=song-open]').click()
    await page.locator('[data-testid=chain-add-A]').click()
    await page.locator('[data-testid=chain-add-B]').click()
    await page.locator('[data-testid=chain-on]').check()
    b = await beat(page)
    if (JSON.stringify(b.chain) !== '["A","B"]' || !b.chainOn) bad(`song not saved: ${JSON.stringify(b.chain)} ${b.chainOn}`)
    await page.locator('.st-play').first().click()
    const seen = new Set()
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(250)
      const p = await page.locator('.st-part.playing').textContent().catch(() => '')
      if (p) seen.add(p.trim())
    }
    await page.locator('.st-play').first().click()
    console.log(`${vp.width}px song: parts heard ${[...seen].join(' ')}`)
    if (!(seen.has('A') && seen.has('B'))) bad(`song did not play both parts (${[...seen].join(',')})`)
    await page.screenshot({ path: path.join(OUT, `bm-song-${vp.width}.png`) })
    if (await sideways(page)) bad(`song bar scrolls sideways at ${vp.width}`)
    errs(page, `song ${vp.width}`)
    await page.context().close()
  }

  // ---- bounce into a loop / onto a pad, save as WAV
  if (want('bounce')) {
    const page = await newPage(browser, { width: 840, height: 757 })
    await page.locator('button:has-text("Key, bars, save")').click()
    await page.locator('.st-bars button:has-text("1")').click()
    const btn = page.locator('[data-testid=bounce-loop]')
    await btn.evaluate(e => e.scrollIntoView({ block: 'center' }))
    await btn.click()
    await page.waitForSelector('[data-testid=bounce-msg]', { timeout: 15000 }).catch(() => bad('bounce into a loop never finished'))
    const loops = await page.locator('.st-layers li').count()
    let b = await beat(page)
    console.log(`bounce: ${loops} loop(s), rows muted ${b.rows.every(r => r.mute)}, parts muted ${b.tracks.every(x => x.mute)}`)
    if (loops < 1) bad('bounce made no loop')
    const peak = await page.evaluate(() => new Promise(res => { const r = indexedDB.open('kg-loops', 1); r.onsuccess = () => { const g = r.result.transaction('loops').objectStore('loops').getAll(); g.onsuccess = () => { let m = 0; for (const l of g.result) for (let i = 0; i < l.data.length; i += 7) m = Math.max(m, Math.abs(l.data[i])); res(m) } } }))
    console.log(`bounced loop peak ${peak.toFixed(3)}`)
    if (!(peak > 0.02)) bad('the bounced loop is silent')
    if (!b.rows.every(r => r.mute) || !b.tracks.every(x => x.mute)) bad('bounce did not mute what it came from')
    await page.locator('button:has-text("Undo the bounce")').click()
    await page.waitForTimeout(400)
    b = await beat(page)
    if (b.rows.some(r => r.mute) || (await page.locator('.st-layers li').count()) !== 0) bad('undo the bounce did not bring it back')
    await page.locator('[data-testid=bounce-pad]').click()
    await page.waitForFunction(() => /pad A 1/.test(document.querySelector('[data-testid=bounce-msg]')?.textContent || ''), null, { timeout: 15000 }).catch(() => bad('bounce onto a pad never finished'))
    b = await beat(page)
    if (b.pads?.u1?.src !== 'rec') bad('bounce onto a pad did not fill Pad 1')
    // save as audio, with stems
    await page.locator('label:has-text("stems") input').check()
    const dls = []
    page.on('download', d => dls.push(d.suggestedFilename()))
    await page.locator('[data-testid=export]').click()
    await page.waitForFunction(() => /Saved \d+ file/.test(document.querySelector('[data-testid=bounce-msg]')?.textContent || ''), null, { timeout: 20000 }).catch(() => bad('save as audio never finished'))
    await page.waitForTimeout(1500)
    console.log(`save: ${dls.join(' | ')}`)
    if (!dls.some(n => /mix\.wav$/.test(n)) || !dls.some(n => /drums\.wav$/.test(n))) bad(`save as audio files: ${dls.join(', ')}`)
    errs(page, 'bounce')
    await page.context().close()
  }

  // ---- undo and redo
  if (want('redo')) {
    const page = await newPage(browser, { width: 412, height: 915 })
    const before = (await beat(page)).bpm
    await page.locator('button[aria-label^="Faster"]').click()
    await page.locator('button[aria-label^="Faster"]').click()
    const up = (await beat(page)).bpm
    await page.locator('button[aria-label="Undo"]').click()
    const u1 = (await beat(page)).bpm
    await page.locator('button[aria-label="Redo"]').click()
    const r1 = (await beat(page)).bpm
    console.log(`redo: ${before} → ${up}, undo ${u1}, redo ${r1}`)
    if (!(u1 < up) || r1 !== up) bad(`undo/redo of the tempo: ${before} ${up} ${u1} ${r1}`)
    errs(page, 'redo')
    await page.context().close()
  }

  // ---- looper extras: backwards, half speed, an effect per loop
  if (want('loopx')) for (const vp of [{ width: 360, height: 760 }, { width: 840, height: 757 }]) {
    const page = await newPage(browser, vp)
    await page.locator('button:has-text("Key, bars, save")').click()
    await page.locator('.st-bars button:has-text("1")').click()
    await page.locator('[data-testid=bounce-loop]').evaluate(e => e.scrollIntoView({ block: 'center' }))
    await page.locator('[data-testid=bounce-loop]').click()
    await page.waitForSelector('[data-testid=bounce-msg]', { timeout: 15000 })
    const li = page.locator('.st-layers li').first()
    await li.evaluate(e => e.scrollIntoView({ block: 'center' }))
    await li.locator('button:has-text("Back")').click()
    await li.locator('button:has-text("½ speed")').click()
    await li.locator('select').selectOption('echo')
    await page.waitForTimeout(800)
    const st = await page.evaluate(() => new Promise(res => { const r = indexedDB.open('kg-loops', 1); r.onsuccess = () => { const g = r.result.transaction('loops').objectStore('loops').getAll(); g.onsuccess = () => res(g.result.map(l => ({ rev: l.rev, half: l.half, fx: l.fx }))) } }))
    console.log(`${vp.width}px loop extras saved: ${JSON.stringify(st)}`)
    if (!st.some(l => l.rev && l.half && l.fx === 'echo')) bad('loop extras not saved')
    await page.waitForTimeout(2500)
    if (await sideways(page)) bad(`looper scrolls sideways at ${vp.width}`)
    await page.screenshot({ path: path.join(OUT, `bm-loopx-${vp.width}.png`) })
    errs(page, `loopx ${vp.width}`)
    await page.context().close()
  }

  await browser.close()
  console.log(problems.length ? `\n${problems.length} problem(s)` : '\nbeat maker: all good')
  process.exit(problems.length ? 1 : 0)
})()
