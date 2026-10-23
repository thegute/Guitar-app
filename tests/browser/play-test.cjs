// Headless check of the play-along screen with a synthesized guitar melody as the microphone.
const { chromium } = require('playwright')
// Run: npm run build && npx vite preview --port 4173, then: node tests/browser/play-test.cjs [cover|small|inner-portrait|inner-landscape]
// Needs playwright (npm i --no-save playwright) and makes ode.wav / riff.gp first (see tests/README.md).
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
    { name: 'small', width: 360, height: 780, dpr: 3 },
    { name: 'inner-portrait', width: 757, height: 840, dpr: 2.6 },
    { name: 'inner-landscape', width: 840, height: 757, dpr: 2.6 },
  ].filter(v => !only || v.name === only)
  for (const vp of vps) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.dpr, hasTouch: true, permissions: ['microphone'] })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', e => errors.push('pageerror: ' + e.message))
    page.on('console', m => { if (m.type() === 'error' && !/youtube|ERR_|net::/i.test(m.text())) errors.push('console: ' + m.text()) })
    await page.goto('http://localhost:4173/')
    await page.waitForSelector('.tab-note', { timeout: 8000 })
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${DIR}/play-${vp.name}-1-start.png` })
    const out = { vp: vp.name }
    out.title = await page.textContent('.song-title b')
    out.chordsOnTab = await page.$$eval('.tab-chord', e => e.map(x => x.textContent).join(' '))
    out.hScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)

    if (vp.name === 'cover' || vp.name === 'inner-landscape') {
      // follow along with the mic
      await page.click('button.listen')
      const samples = []
      let sawMiss = null, sawOkText = null
      for (let i = 0; i < 40; i++) {
        await page.waitForTimeout(500)
        const s = await page.evaluate(() => ({
          next: document.querySelector('.next .small')?.textContent,
          hits: document.querySelectorAll('.tab-note.hit').length,
          late: document.querySelectorAll('.tab-note.late').length,
          bad: document.querySelector('.fb.bad')?.textContent ?? null,
          ok: document.querySelector('.fb.ok')?.textContent ?? null,
          heard: document.querySelector('.heard-note')?.textContent,
          done: !!document.querySelector('.next b') && document.querySelector('.next b').textContent === 'Finished!',
        }))
        if (s.bad && !sawMiss) { sawMiss = s.bad; await page.screenshot({ path: `${DIR}/play-${vp.name}-2-miss.png` }) }
        if (s.ok && !sawOkText) sawOkText = s.ok
        samples.push(`${s.next?.match(/note (\d+)/)?.[1] ?? 'end'}/${s.hits}${s.late ? '+' + s.late : ''}`)
        if (i === 12) await page.screenshot({ path: `${DIR}/play-${vp.name}-3-following.png` })
        if (s.done) { out.finished = true; break }
      }
      out.progress = samples.join(' ')
      out.sawMiss = sawMiss
      out.sawOk = sawOkText
      out.finalHits = await page.$$eval('.tab-note.hit', e => e.length)
      out.finishText = await page.textContent('.next')
      await page.screenshot({ path: `${DIR}/play-${vp.name}-4-done.png` })
      await page.click('button.listen')
    }

    // input picker
    await page.click('.input-btn')
    await page.waitForTimeout(600)
    out.inputs = await page.$$eval('.sheet .song-list li b', e => e.map(x => x.textContent).join(' | '))
    await page.screenshot({ path: `${DIR}/play-${vp.name}-0-input.png` })
    await page.click('.sheet >> text=Done')

    // hear the tab: the playhead should move through the steps
    await page.click('.tab-tools >> text=Restart').catch(() => {})
    await page.click('button.hear')
    const heads = []
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(400)
      heads.push(await page.evaluate(() => { const c = document.querySelector('.tab-view.playing .tab-cursor'); return c ? c.closest('svg').dataset.bar + ':' + Math.round(c.getAttribute('x')) : '-' }))
      if (i === 3) await page.screenshot({ path: `${DIR}/play-${vp.name}-4b-hear.png` })
    }
    out.playhead = heads.join(' ')
    await page.click('button.hear')
    out.afterStop = await page.$eval('.tab-view', e => e.className)

    // harmony modes
    if (vp.width < 760) await page.click('.view-switch >> text=Both')
    for (const m of ['Scale', 'Arpeggio', 'Triads', 'Connect']) {
      await page.click(`.harmony .h-modes >> text=${m}`)
      await page.waitForTimeout(150)
      out['marks_' + m] = await page.$$eval('.harmony .note-dot', e => e.length)
      out['cap_' + m] = (await page.textContent('.h-caption').catch(() => ''))?.slice(0, 160)
      await page.screenshot({ path: `${DIR}/play-${vp.name}-5-${m}.png` })
    }

    // tap a note: hear it and see its name
    await page.click('.view-switch >> text=Tab').catch(() => {})
    const notes = await page.$$('.tab-note')
    await notes[5].click()
    await page.waitForTimeout(200)
    out.inspect = await page.textContent('.next')

    // songs sheet: paste a text tab with chords
    await page.click('button:has-text("Songs")')
    await page.waitForSelector('.sheet')
    await page.screenshot({ path: `${DIR}/play-${vp.name}-6-sheet.png` })
    await page.fill('.sheet textarea', `Wish riff (test)
G              Em7
e|-----------------|---0-------0-----|
B|-----3-----3-----|---3-------3-----|
G|-------0-------0-|-------0-------0-|
D|---0-------0-----|-2-------2-------|
A|-----------------|-----------------|
E|-3---------------|-0---------------|`)
    await page.fill('.sheet input[aria-label="Song title"]', 'Pasted riff')
    await page.click('.sheet >> text=Load tab')
    await page.waitForTimeout(400)
    out.pastedTitle = await page.textContent('.song-title b')
    out.pastedChords = await page.$$eval('.tab-chord', e => e.map(x => x.textContent).join(' '))
    out.pastedKey = await page.textContent('.key-btn')
    await page.screenshot({ path: `${DIR}/play-${vp.name}-7-pasted.png` })

    // open a Guitar Pro file
    await page.click('button:has-text("Songs")')
    await page.setInputFiles('.sheet input[type=file]', `${DIR}/riff.gp`)
    await page.waitForTimeout(1500)
    out.gpTitle = await page.textContent('.song-title b')
    out.gpTrack = await page.$eval('.song-title select', s => s.options[s.selectedIndex].text).catch(() => 'no select')
    out.gpNotes = await page.$$eval('.tab-note text', e => e.slice(0, 10).map(x => x.textContent).join(' '))
    await page.screenshot({ path: `${DIR}/play-${vp.name}-8-gp.png` })

    // YouTube link
    await page.fill('#yt-url', 'https://youtu.be/dQw4w9WgXcQ?t=30').catch(() => {})
    await page.click('.yt-add button[type=submit]').catch(() => {})
    await page.waitForTimeout(800)
    out.iframe = await page.$eval('.yt-frame iframe', f => f.src).catch(() => 'none')
    await page.screenshot({ path: `${DIR}/play-${vp.name}-9-video.png` })
    out.hScrollEnd = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    out.errors = errors
    console.log(JSON.stringify(out, null, 1))
    await ctx.close()
  }
  await browser.close()
})()
