// Blueprint Step 1 in the browser: the floating finger box (drag, resize, tuck, remembered), the upcoming shift badge
// and Loop this shift, choosing a finger / another string for a tapped note, Make it easier, hand size in Settings;
// later parts: tunings, layers, voice leading, play the changes.
// Needs `vite preview` on :4173 and CHROME_PATH.  node tests/browser/step1-test.cjs [box,tunings,layers,voice,changes]
const { chromium } = require('playwright')
const path = require('path')
const DIR = path.join(__dirname, 'out')
const want = p => !process.argv[2] || process.argv[2].split(',').includes(p)
const problems = []
const bad = m => { problems.push(m); console.log('  PROBLEM ' + m) }

async function newPage(browser, viewport, seed = {}) {
  const ctx = await browser.newContext({ viewport, hasTouch: true, permissions: ['microphone'] })
  const page = await ctx.newPage()
  page.errors = []
  page.on('pageerror', e => page.errors.push(e.message))
  await page.addInitScript(s => {
    if (sessionStorage.getItem('seeded')) return
    localStorage.clear()
    for (const [k, v] of Object.entries({ 'kg:welcomed': '1', 'kg:psyDefault': '1', 'kg:askBubble': 'false', 'kg:layoutHint': '1', 'kg:getReady': '0', ...s })) localStorage.setItem(k, v)
    sessionStorage.setItem('seeded', '1')
  }, seed)
  await page.goto('http://localhost:4173/')
  await page.waitForSelector('nav.nav')
  return page
}
const nav = (page, l) => page.locator(`nav.nav button:has-text("${l}")`).first().click()
const sub = (page, l) => page.locator(`.subtabs [role=tab]:has-text("${l}")`).first().click()
const sideways = page => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || [...document.querySelectorAll('.main')].some(m => m.scrollWidth > m.clientWidth + 1))
async function drag(page, loc, dx, dy) {
  const b = await loc.boundingBox()
  const x = b.x + Math.min(30, b.width / 2), y = b.y + b.height / 2
  await page.mouse.move(x, y); await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 8 }); await page.mouse.up()
  await page.waitForTimeout(200)
}
// open position, a rest, then up at fret 7, then back
const SHIFTY = `Shift test
e|-0-1-3-1-0-1-3-0-|-7-8-10-8-7---|
B|---------|---------|--------------|
G|---------|---------|--------------|
D|---------|---------|--------------|
A|---------|---------|--------------|
E|---------|---------|--------------|`
async function pasteSong(page, text, title) {
  await nav(page, 'Songs'); await sub(page, 'Add a song')
  await page.waitForSelector('.songs-screen textarea')
  await page.fill('.songs-screen textarea', text)
  await page.fill('.songs-screen input[aria-label="Song title"]', title)
  await page.click('.songs-screen button:text-is("Load tab")')
  await page.waitForSelector('.tab-note')
  await page.waitForTimeout(400)
  const got = page.locator('.song-check button:has-text("Got it")')
  if (await got.count()) await got.click()
}

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] })

  if (want('box')) for (const vp of [{ width: 412, height: 915, n: 'cover' }, { width: 840, height: 757, n: 'inner' }, { width: 1400, height: 876, n: 'tab-s10' }]) {
    const page = await newPage(browser, vp)
    await page.waitForSelector('.tab-note')
    const box = page.locator('[data-testid=finger-box]')
    if (!(await box.count())) { bad(`${vp.n}: no finger box in Play`); continue }
    // drag it
    const b0 = await box.boundingBox()
    await drag(page, box.locator('.fbx-bar'), -120, -200)
    const b1 = await box.boundingBox()
    console.log(`${vp.n}: box moved ${Math.round(b0.x)},${Math.round(b0.y)} → ${Math.round(b1.x)},${Math.round(b1.y)}`)
    if (Math.abs(b1.y - b0.y) < 100) bad(`${vp.n}: dragging the finger box didn't move it`)
    // resize it
    await drag(page, box.locator('.fbx-size'), 50, 0)
    const b2 = await box.boundingBox()
    if (!(b2.width > b1.width + 20) && b1.width < vp.width - 40) bad(`${vp.n}: resizing didn't make it wider (${b1.width} → ${b2.width})`)
    // tuck and bring back
    await box.locator('button[aria-label^="Tuck"]').click()
    if (!(await page.locator('[data-testid=finger-chip]').count())) bad(`${vp.n}: no chip after tucking the box`)
    await page.reload(); await page.waitForSelector('.tab-note')
    if (!(await page.locator('[data-testid=finger-chip]').count())) bad(`${vp.n}: the tucked box wasn't remembered`)
    await page.locator('[data-testid=finger-chip]').click()
    const b3 = await page.locator('[data-testid=finger-box]').boundingBox()
    if (Math.abs(b3.y - b2.y) > 4) bad(`${vp.n}: the box's place wasn't remembered (${b2.y} → ${b3.y})`)
    // inside the screen
    if (b3.x < 0 || b3.y < 0 || b3.x + b3.width > vp.width + 1 || b3.y + b3.height > vp.height + 1) bad(`${vp.n}: box off the screen ${JSON.stringify(b3)}`)
    if (await sideways(page)) bad(`${vp.n}: sideways scroll with the box`)

    // a song with a shift: the badge comes two beats before, with Loop this shift
    await pasteSong(page, SHIFTY, 'Shift test')
    // park the box low on the screen so the tab's first lines and the readout are free to tap
    { const bb = await page.locator('[data-testid=finger-box] .fbx-bar').boundingBox(); await drag(page, page.locator('[data-testid=finger-box] .fbx-bar'), 0, vp.height - 230 - bb.y) }
    const notes = page.locator('.tab-note')
    const n = await notes.count()
    let saw = '', loopBtn = false
    for (let i = 0; i < n; i++) {
      await notes.nth(i).click(); await page.waitForTimeout(120)
      const badge = page.locator('.fbx-badge')
      if (await badge.count()) { saw = (await badge.textContent()) + ` (at note ${i + 1})`; loopBtn = !!(await page.locator('[data-testid=loop-shift]').count()); break }
    }
    console.log(`${vp.n}: shift badge "${saw}"`)
    if (!saw || !/fret 7|fret 6/.test(saw)) bad(`${vp.n}: no upcoming-shift badge for the move up to fret 7 (${saw})`)
    if (loopBtn) {
      await page.locator('[data-testid=loop-shift]').click(); await page.waitForTimeout(200)
      const looped = await page.locator('.tab-loopband, .tab-loop, [data-loop]').count()
      if (!looped) bad(`${vp.n}: Loop this shift didn't set a loop`)
    } else bad(`${vp.n}: no Loop this shift button`)
    const why = await page.locator('.fbx-shift .small').first().textContent().catch(() => '')
    console.log(`${vp.n}: why "${why}"`)
    if (!/rings|rest/.test(why)) bad(`${vp.n}: the shift reason should say when to move (${why})`)
    if (/at note [1-4]\)/.test(saw)) bad(`${vp.n}: the shift badge came too early (${saw})`)
    await page.screenshot({ path: `${DIR}/step1-box-${vp.n}.png` })

    // tap the fret-8 note: choose finger 3 and another string
    const eight = page.locator('.tab-note').filter({ hasText: /^8/ }).first()
    await eight.click(); await page.waitForTimeout(150)
    await page.screenshot({ path: `${DIR}/step1-edit-${vp.n}.png` })
    const edit = page.locator('.note-edit')
    if (!(await edit.count())) bad(`${vp.n}: no finger choice after tapping a note`)
    else {
      await edit.locator('button[aria-label="Play it with finger 3"]').click(); await page.waitForTimeout(200)
      const pressed = await page.locator('.note-edit button[aria-pressed="true"]').textContent().catch(() => '')
      if (pressed.trim() !== '3') bad(`${vp.n}: choosing finger 3 didn't stick (${pressed})`)
      const other = edit.locator('button:has-text("Other string")')
      if (await other.count()) {
        const label = await other.textContent()
        await other.click(); await page.waitForTimeout(250)
        const moved = await page.locator('.tab-note:has-text("13")').count()
        console.log(`${vp.n}: ${label} → ${moved ? 'moved to the B string (fret 13)' : 'not moved'}`)
        if (!moved) bad(`${vp.n}: Other string didn't move the note`)
      }
    }
    // Make it easier: the tab is re-placed (same notes) and can be switched back
    await page.locator('.opts-btn').click(); await page.waitForSelector('.play-opts')
    await page.locator('.play-opts [data-find=fingering] button:has-text("Easier for my hand")').click()
    await page.locator('.play-opts >> text=Done').click(); await page.waitForTimeout(300)
    const easyNotes = await page.locator('.tab-note').allTextContents()
    console.log(`${vp.n}: easier: ${easyNotes.join(' ').replace(/[^\d ]/g, '').slice(0, 60)}`)
    await page.locator('.opts-btn').click(); await page.waitForSelector('.play-opts')
    await page.locator('.play-opts [data-find=fingering] button:has-text("As written")').click()
    await page.locator('.play-opts >> text=Done').click()
    if (page.errors.length) bad(`${vp.n} errors: ${page.errors.join(' | ')}`)
    await page.context().close()
  }

  if (want('box')) {
    // hand size lives in Settings → You
    const page = await newPage(browser, { width: 412, height: 915 })
    await nav(page, 'Learn'); await page.locator('[aria-label="Settings"]').click(); await sub(page, 'You')
    const hs = page.locator('.win[data-win="handsize"]')
    if (!(await hs.count())) bad('no Your hand window in Settings → You')
    else {
      await hs.locator('button:has-text("Large")').click()
      const v = await page.evaluate(() => localStorage.getItem('kg:hand'))
      if (!/large/.test(v ?? '')) bad(`hand size not saved (${v})`)
    }
    await page.context().close()
  }

  if (want('tunings')) {
    const page = await newPage(browser, { width: 412, height: 915 })
    // a Drop D riff while tuned to Standard: retune, or play it in Standard
    await pasteSong(page, `Drop riff
e|-----------|
B|-----------|
G|-----------|
D|-----------|
A|-----------|
D|-0-0-3-5-0-|`, 'Drop riff')
    // tell KGuitar the tab is in Drop D: the paste box keeps the tuning names on the left
    const notice = page.locator('.notice.retune')
    const n = await notice.count()
    console.log(`retune notice: ${n ? (await notice.first().textContent()).slice(0, 90) : 'none'}`)
    if (n && (await page.locator('[data-testid=adapt]').count())) {
      await page.locator('[data-testid=adapt]').click(); await page.waitForTimeout(300)
      const note = await page.locator('[data-testid=adapt-note]').textContent().catch(() => '')
      console.log(`adapted: ${note.slice(0, 140)}`)
      if (!/octave up|frets/.test(note)) bad(`no explanation after Play it in Standard (${note})`)
      const frets = (await page.locator('.tab-note').allTextContents()).map(t => parseInt(t)).join(' ')
      console.log(`frets now: ${frets}`)
      await page.locator('[data-testid=adapt-note] button:has-text("As written")').click()
    } else bad('no "Play it in Standard" on the retune notice for a Drop D tab')
    // Tuner lists the slack key tunings
    await nav(page, 'Tools'); await sub(page, 'Tuner'); await page.waitForTimeout(300)
    const opts = await page.locator('select option').allTextContents()
    for (const t of ['G wahine', "Leonard's C", 'C Mauna Loa', 'Open G', 'C wahine']) if (!opts.some(o => o.includes(t))) bad(`tuner has no ${t}`)
    // a chord sheet in Eb gets a Smart capo idea
    await pasteSong(page, `Eb song
Eb        Ab        Bb        Cm
Words go here and here
Eb        Ab        Bb        Bb
More words go here too`, 'Eb song')
    await page.locator('.opts-btn').click(); await page.waitForSelector('.play-opts')
    const sc = page.locator('.play-opts [data-find=capo]')
    if (!(await sc.count())) bad('no Smart capo for a chord sheet in Eb')
    else {
      console.log(`smart capo: ${(await sc.textContent()).slice(0, 120)}`)
      await sc.locator('button:has-text("Capo")').click(); await page.waitForTimeout(200)
      await page.locator('.play-opts >> text=Done').click(); await page.waitForTimeout(300)
      const chords = await page.locator('.tab-chord').allTextContents()
      console.log(`chords with the capo: ${[...new Set(chords)].join(' ')}`)
      if (chords.some(c => /Eb|Ab/.test(c))) bad(`capo shapes not shown (${chords.join(' ')})`)
    }
    if (page.errors.length) bad(`tunings errors: ${page.errors.join(' | ')}`)
    await page.context().close()
  }

  if (want('layers')) for (const vp of [{ width: 412, height: 915, n: 'cover' }, { width: 840, height: 757, n: 'inner' }]) {
    const page = await newPage(browser, vp)
    const dots = loc => loc.locator('.note-dot').count()
    // Tools → Chords: the 5-layer window
    await nav(page, 'Tools'); await sub(page, 'Chords'); await page.waitForTimeout(400)
    const ln = page.locator('.win[data-win="layers"] [data-testid=layer-neck]')
    if (!(await ln.count())) bad(`${vp.n}: no 5-layer neck in Tools → Chords`)
    else {
      await ln.scrollIntoViewIfNeeded()
      const d0 = await dots(ln)
      await ln.locator('.layer-chip:has-text("Pentatonic")').click(); await page.waitForTimeout(150)
      const d1 = await dots(ln)
      await ln.locator('.layer-chip:has-text("Mode notes")').click(); await page.waitForTimeout(150)
      const d2 = await dots(ln)
      const modes = await ln.locator('button:has-text("Lydian")').count()
      console.log(`${vp.n}: chords layers dots ${d0} → +penta ${d1} → +mode ${d2}; mode chips ${modes ? 'yes' : 'no'}`)
      if (!(d1 > d0 && d2 > d1)) bad(`${vp.n}: switching layers on didn't add notes (${d0}, ${d1}, ${d2})`)
      if (!modes) bad(`${vp.n}: no mode choice with Mode notes on`)
      await ln.locator('.layer-chip:has-text("3 per string")').click(); await page.waitForTimeout(150)
      const d3 = await dots(ln)
      if (!(d3 > d2)) bad(`${vp.n}: 3 per string added nothing (${d2} → ${d3})`)
      await ln.locator('.layer-chip:has-text("3 per string")').click()
      // a violet free-finger note plays the chord + hammer-on and explains itself
      const emb = ln.locator('.note-dot.role-embel').first()
      if (await emb.count()) { await emb.click(); await page.waitForTimeout(200); const t = await ln.locator('[role=status]').textContent(); if (!/hammer|pull/.test(t)) bad(`${vp.n}: free-finger note didn't explain itself (${t})`) }
      else bad(`${vp.n}: no free-finger notes`)
      await ln.locator('[data-testid=drone]').click(); await page.waitForTimeout(200)
      if (!/Stop/.test(await ln.locator('[data-testid=drone]').textContent())) bad(`${vp.n}: drone didn't start`)
      await ln.locator('[data-testid=drone]').click()
      await page.screenshot({ path: `${DIR}/step1-layers-chords-${vp.n}.png` })
    }
    if (await sideways(page)) bad(`${vp.n}: Chords scrolls sideways`)
    // Play → Scales & chords → Layers
    await nav(page, 'Play'); await page.waitForSelector('.tab-note')
    if (vp.width < 760) await page.click('.view-switch >> text=Both').catch(() => {})
    const lay = page.locator('.harmony .h-modes button:has-text("Layers")')
    if (!(await lay.count())) bad(`${vp.n}: no Layers in Scales & chords`)
    else {
      await lay.click(); await page.waitForTimeout(300)
      if (!(await page.locator('.harmony [data-testid=layer-neck]').count())) bad(`${vp.n}: Layers view empty`)
      await page.screenshot({ path: `${DIR}/step1-layers-play-${vp.n}.png` })
      await page.locator('.harmony .h-modes button:has-text("Hand shape")').click()
    }
    // chord peek: hold a chord name, Pin open
    const chord = page.locator('[data-chord]').first()
    if (await chord.count()) {
      const b = await chord.boundingBox()
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(200); await page.mouse.up()
      const pin = page.locator('[data-testid=peek-pin]')
      if (await pin.count()) {
        await pin.click(); await page.waitForTimeout(1900)
        const stays = await page.locator('.chord-peek.pinned [data-testid=layer-neck]').count()
        if (!stays) bad(`${vp.n}: pinned peek didn't stay with its layers`)
        await page.screenshot({ path: `${DIR}/step1-peek-pinned-${vp.n}.png` })
        await page.locator('.chord-peek.pinned button:has-text("Close")').click()
      } else bad(`${vp.n}: no Pin open on the chord peek`)
    }
    // CAGED explorer: one shape shows the layers
    await nav(page, 'Learn'); await sub(page, 'Explore'); await page.waitForTimeout(300)
    const caged = page.locator('.tool:has-text("explorer")').first()
    if (await caged.count()) {
      await caged.click(); await page.waitForTimeout(400)
      await page.locator('.chip:has-text("E shape ·")').first().click(); await page.waitForTimeout(300)
      if (!(await page.locator('[data-testid=layer-neck]').count())) bad(`${vp.n}: CAGED explorer shape has no layers`)
      await page.screenshot({ path: `${DIR}/step1-layers-caged-${vp.n}.png` })
    } else bad(`${vp.n}: CAGED explorer not found`)
    if (await sideways(page)) bad(`${vp.n}: CAGED explorer scrolls sideways`)
    if (page.errors.length) bad(`${vp.n} layers errors: ${page.errors.join(' | ')}`)
    await page.context().close()
  }

  await browser.close()
  console.log(problems.length ? `\n${problems.length} problem(s)` : 'step 1: all good')
  process.exit(problems.length ? 1 : 0)
})()
