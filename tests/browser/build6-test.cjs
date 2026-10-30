// Build 6 checks: every main screen on small phones, the Fold (cover + inner), and a 12" tablet (portrait + landscape),
// in day and night; plus the new features: Tools tab, play in time, strum-along chord sheet, split layout,
// footswitch keys, gear setup, backup download, recorded sounds loading.
// Run with the preview server on :4173:  node tests/browser/build6-test.cjs
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const DIR = path.join(__dirname, 'out')
fs.mkdirSync(DIR, { recursive: true })
const SIZES = {
  phone: { width: 360, height: 740 }, cover: { width: 412, height: 915 }, inner: { width: 840, height: 757 },
  tabPortrait: { width: 800, height: 1280 }, tabLandscape: { width: 1280, height: 800 },
}
async function overflow(page) {
  return page.evaluate(() => {
    const bad = []
    if (document.documentElement.scrollWidth > innerWidth + 1) bad.push('page ' + document.documentElement.scrollWidth)
    for (const el of document.querySelectorAll('#main *')) {
      const r = el.getBoundingClientRect()
      if (r.width && r.right > innerWidth + 1 && !el.closest('.fretboard-wrap, .chips, .heat, .tab-tools, .yt-bar, .prog-strip, .scroll-x, .tab-view, .tools-switch')) { bad.push(`${el.tagName}.${String(el.className).slice(0, 40)} ${Math.round(r.right)}`); if (bad.length > 4) break }
    }
    return bad
  })
}

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] })
  const problems = []
  for (const theme of ['day', 'night']) {
    for (const [name, viewport] of Object.entries(SIZES)) {
      if (theme === 'night' && !['cover', 'tabLandscape'].includes(name)) continue
      const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 })
      const page = await ctx.newPage()
      const errors = []
      page.on('pageerror', e => errors.push(e.message))
      await page.addInitScript(t => { if (!sessionStorage.getItem('s')) { localStorage.clear(); localStorage.setItem('kg:welcomed', '1'); localStorage.setItem('kg:psyDefault', '1'); localStorage.setItem('kg:getReady', '0'); localStorage.setItem('kg:theme', JSON.stringify(t)); sessionStorage.setItem('s', '1') } }, theme)
      await page.goto('http://localhost:4173/')
      await page.waitForSelector('.tab-note')
      const shot = async n => {
        await page.waitForTimeout(300)
        await page.screenshot({ path: `${DIR}/b6-${name}-${theme}-${n}.png` })
        const o = await overflow(page)
        if (o.length) problems.push(`${name}/${theme}/${n}: overflow ${o.join(', ')}`)
      }
      await shot('play')
      for (const [tab, label] of [['Learn', 'learn'], ['Jam', 'jam'], ['Tools', 'tools']]) {
        await page.click(`nav >> text=${tab}`)
        await shot(label)
      }
      for (const p of ['Tempo', 'Chords', 'Scales']) {
        await page.click(`.tools-switch >> text=${p}`)
        await shot('tools-' + p.toLowerCase())
      }
      await page.click('nav >> text=Learn')
      await page.click('[aria-label="Settings"]')
      await shot('settings')
      if (errors.length) problems.push(`${name}/${theme}: page errors ${errors.join(' | ')}`)
      console.log(name, theme, errors.length ? errors : 'ok')
      await ctx.close()
    }
  }

  // ---- features ----
  const ctx = await browser.newContext({ viewport: SIZES.inner, acceptDownloads: true })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('http://localhost:4173/')
  // first launch: the welcome appears and can be walked through
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForSelector('.welcome')
  await page.screenshot({ path: `${DIR}/b6-feature-welcome.png` })
  await page.click('.welcome >> text=Let\'s go')
  await page.click('.welcome .inst-card:has-text("Tenor")')
  await page.click('.welcome >> text=Next')
  // About you (build 13): level, a goal, a style
  await page.click('.welcome .pf-level:has-text("I know some chords")')
  await page.click('.welcome .chip:has-text("Strum chords")')
  await page.click('.welcome .chip:has-text("Folk")')
  await page.screenshot({ path: `${DIR}/b6-feature-about.png` })
  await page.click('.welcome button.primary:has-text("Next")')
  await page.click('.welcome >> text=Later')
  await page.click('.welcome >> text=Next')
  await page.click('.welcome >> text=Show me around')
  await page.waitForSelector('.guide')
  await page.screenshot({ path: `${DIR}/b6-feature-guide.png` })
  if ((await page.evaluate(() => JSON.parse(localStorage.getItem('kg:instrument')).id)) !== 'tenor') problems.push('welcome did not set the instrument')
  const prof = await page.evaluate(() => JSON.parse(localStorage.getItem('kg:profile') ?? 'null'))
  if (!prof || prof.level !== 2 || !prof.goals.includes('strum') || !prof.genres.includes('folk')) problems.push('welcome did not save About you: ' + JSON.stringify(prof))
  await page.click('.guide-sec >> nth=1')
  await page.click('.guide-items >> text=Show me >> nth=0')
  await page.waitForTimeout(400)
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('kg:welcomed', '1'); localStorage.setItem('kg:psyDefault', '1'); localStorage.setItem('kg:getReady', '0'); localStorage.setItem('kg:tab2', '"play"') })
  await page.reload()
  await page.waitForSelector('.tab-note')
  // recorded sounds load
  const sound = await page.evaluate(async () => { const r = await fetch('samples/acoustic/index.json'); return r.ok ? Object.keys(await r.json()).length : 0 })
  if (sound < 8) problems.push('acoustic samples missing: ' + sound)
  // strum-along: open the Amazing Grace chord sheet
  await page.click('nav.nav button:has-text("Songs")')
  await page.click('.subtabs [role=tab]:has-text("Practice")')
  await page.click('.songs-screen >> text=Amazing Grace')
  await page.waitForTimeout(500)
  const lyric = await page.$$eval('.tab-lyric', els => els.map(e => e.textContent).join(' | '))
  if (!/Amazing grace/.test(lyric)) problems.push('chord sheet lyrics missing: ' + lyric.slice(0, 80))
  const chordReadout = await page.textContent('.next')
  if (!/strum it/.test(chordReadout)) problems.push('strum-along readout missing: ' + chordReadout.slice(0, 80))
  await page.screenshot({ path: `${DIR}/b6-feature-chordsheet.png` })
  // footswitch: → starts listening (wait mode), toast shows
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(800)
  const toast = await page.$('.pedal-toast')
  const listening = await page.getAttribute('button.listen', 'aria-pressed')
  if (!toast) problems.push('no pedal toast')
  if (listening !== 'true') problems.push('pedal did not start listening')
  await page.keyboard.press('ArrowRight')
  // play in time: switch mode, start, run for a few seconds
  await page.click('.tab-tools >> text=In time')
  await page.click('button.listen')
  await page.waitForTimeout(4500)
  const cursor = await page.$$eval('.tab-view.playing', e => e.length)
  if (!cursor) problems.push('in-time cursor not running')
  await page.screenshot({ path: `${DIR}/b6-feature-intime.png` })
  await page.click('button.listen')
  await page.click('.tab-tools >> text=Wait for me')
  // split layout (in Options)
  const options = async () => { await page.click('.opts-btn'); await page.waitForSelector('.play-opts') }
  await options()
  await page.click('.play-opts label:has-text("Split")')
  await page.click('.play-opts >> text=Done')
  await page.waitForTimeout(300)
  if (!(await page.$('.play.tabletop'))) problems.push('split layout did not switch on')
  await page.screenshot({ path: `${DIR}/b6-feature-split.png` })
  await options()
  await page.click('.play-opts label:has-text("Split")')
  // gear setup opens and walks to step 2
  await page.click('.play-opts >> text=Set up your input')
  await page.waitForSelector('.sheet.gear')
  await page.click('.sheet.gear >> text=Next')
  await page.screenshot({ path: `${DIR}/b6-feature-gear.png` })
  await page.click('.sheet.gear >> text=Close')
  // backup downloads a file on the web version
  await page.click('nav >> text=Learn')
  await page.click('[aria-label="Settings"]')
  await page.click('.subtabs [role=tab]:has-text("Backup")')
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }).catch(() => null), page.click('text=Back up now')])
  if (!dl) problems.push('backup did not download')
  else {
    const p = await dl.path()
    const b = JSON.parse(fs.readFileSync(p, 'utf8'))
    if (b.app !== 'KGuitar' || !b.songs.length) problems.push('backup file looks wrong')
  }
  // tools tab: old saved tab name maps to Tools
  await page.evaluate(() => localStorage.setItem('kg:tab2', '"tuner"'))
  await page.reload()
  await page.waitForTimeout(500)
  if (!(await page.$('.tools-switch'))) problems.push('old "tuner" tab did not open Tools')
  if (errors.length) problems.push('feature page errors: ' + errors.join(' | '))
  await ctx.close()
  await browser.close()
  console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'All build 6 checks passed')
  process.exit(problems.length ? 1 : 0)
})()
