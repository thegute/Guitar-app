// Learn tab: screenshots of every Learn screen at cover/inner sizes in day and night, overflow + page-error checks,
// away mode, the ukulele switch (with its confirm step) and separate song banks.
// Run with the preview server on :4173:  node tests/browser/learn-test.cjs
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const DIR = path.join(__dirname, 'out')
fs.mkdirSync(DIR, { recursive: true })
const SIZES = { cover: { width: 412, height: 915 }, inner: { width: 840, height: 757 } }

async function overflow(page) {
  return page.evaluate(() => {
    const m = document.querySelector('#main')
    const bad = []
    if (document.documentElement.scrollWidth > window.innerWidth + 1) bad.push('page ' + document.documentElement.scrollWidth)
    if (m && m.scrollWidth > m.clientWidth + 1) {
      // find the widest culprits
      for (const el of m.querySelectorAll('*')) {
        const r = el.getBoundingClientRect()
        if (r.right > window.innerWidth + 1 && !el.closest('.fretboard-wrap, .chips, .heat, .tab-tools, .yt-bar, .prog-strip, .scroll-x')) bad.push(`${el.tagName}.${el.className} ${Math.round(r.right)}`)
        if (bad.length > 5) break
      }
    }
    return bad
  })
}

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--autoplay-policy=no-user-gesture-required'] })
  const problems = []
  for (const theme of ['day', 'night']) {
    for (const [sizeName, viewport] of Object.entries(SIZES)) {
      const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1.5 })
      const page = await ctx.newPage()
      const errors = []
      page.on('pageerror', e => errors.push(e.message))
      await page.addInitScript(t => { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); localStorage.setItem('kg:welcomed', '1'); localStorage.setItem('kg:theme', JSON.stringify(t)); localStorage.setItem('kg:tab2', '"learn"'); sessionStorage.setItem('seeded', '1') } }, theme)
      await page.goto('http://localhost:4173/')
      await page.waitForSelector('.today-card')
      const shot = async name => {
        await page.waitForTimeout(250)
        await page.screenshot({ path: `${DIR}/learn-${sizeName}-${theme}-${name}.png`, fullPage: false })
        const o = await overflow(page)
        if (o.length) problems.push(`${sizeName}/${theme}/${name}: overflow ${o.join(', ')}`)
      }
      await shot('home')
      const back = async () => { await page.click('text=← Back').catch(async () => page.click('text=← All lessons')) ; await page.waitForSelector('.today-card') }
      const tools = [['Theory', 'lessons'], ['Ear training', 'ear'], ['explorer', 'caged'], ['Circle of fifths', 'circle'], ['Chord changes', 'changes'], ['Rhythm trainer', 'rhythm'], ['Progress', 'progress']]
      for (const [label, name] of tools) {
        await page.click(`.tool:has-text("${label}")`)
        await shot(name)
        if (name === 'lessons') {
          await page.click('.continue-card')
          await shot('lesson')
          await page.click('text=← All lessons')
        }
        await back()
      }
      // a quiz in tap mode
      await page.click('.quiz-list button >> nth=0')
      await page.waitForSelector('.quiz-card')
      await shot('quiz')
      const opt = await page.$('.note-btn, .choice-btn')
      if (opt) { await opt.click(); await shot('quiz-answered') }
      await page.click('text=← Back')
      await page.waitForSelector('.today-card')
      // settings
      await page.click('[aria-label="Settings"]')
      await shot('settings')
      await page.click('.inst-card:has-text("Tenor")')
      await page.waitForSelector('.sheet.confirm')
      await shot('confirm')
      await page.click('.sheet.confirm >> text=Cancel')
      await back()
      // away mode
      await page.click('.away-switch button >> nth=1')
      await shot('away')
      await page.click('.away-switch button >> nth=0')
      console.log(theme, sizeName, errors.length ? errors : 'no page errors')
      if (errors.length) problems.push(`${sizeName}/${theme}: ${errors.join(' | ')}`)
      await ctx.close()
    }
  }

  // ---- behaviour: ukulele switch + separate song banks + celebration ----
  const ctx = await browser.newContext({ viewport: SIZES.cover })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('http://localhost:4173/')
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('kg:welcomed', '1'); localStorage.setItem('kg:tab2', '"play"') })
  await page.reload()
  await page.waitForSelector('.tab-note')
  // paste a guitar tab into the guitar bank
  const guitarTab = 'e|-0-1-3-|\nB|-------|\nG|-------|\nD|-------|\nA|-------|\nE|-------|'
  await page.click('text=Songs').catch(() => page.click('button:has-text("Song")'))
  await page.waitForSelector('.sheet')
  await page.fill('textarea', guitarTab)
  await page.fill('input[placeholder*="itle"]', 'Guitar bank test').catch(() => {})
  await page.click('button:text-is("Load tab")')
  await page.waitForTimeout(500)
  // switch to tenor ukulele (with confirm)
  await page.click('nav >> text=Learn')
  await page.click('[aria-label="Settings"]')
  await page.click('.inst-card:has-text("Tenor")')
  const askText = await page.textContent('.sheet.confirm h2')
  if (!/Are you sure you want to switch to tenor ukulele/i.test(askText)) problems.push('confirm text: ' + askText)
  await page.click('.sheet.confirm .btn.primary')
  await page.waitForTimeout(300)
  const instNow = await page.evaluate(() => JSON.parse(localStorage.getItem('kg:instrument')).id)
  if (instNow !== 'tenor') problems.push('instrument after confirm: ' + instNow)
  await page.click('nav >> text=Play')
  await page.waitForSelector('.tab-note')
  await page.click('text=Songs').catch(() => page.click('button:has-text("Song")'))
  await page.waitForSelector('.sheet')
  await page.waitForTimeout(600)
  const ukeList = await page.textContent('.sheet')
  if (/Guitar bank test/.test(ukeList)) problems.push('guitar song visible in ukulele mode')
  await page.fill('textarea', 'A|-0-2-3-|\nE|-------|\nC|-------|\nG|-------|')
  await page.fill('input[placeholder*="itle"]', 'Uke bank test').catch(() => {})
  await page.click('button:text-is("Load tab")')
  await page.waitForTimeout(400)
  const title1 = await page.textContent('.song-title b')
  if (!/Uke bank test/.test(title1)) problems.push('uke song not opened: ' + title1)
  // back to guitar
  await page.click('nav >> text=Learn')
  await page.click('[aria-label="Settings"]')
  await page.click('.inst-card:has-text("Guitar")')
  await page.click('.sheet.confirm .btn.primary')
  await page.click('nav >> text=Play')
  await page.waitForSelector('.tab-note')
  const title2 = await page.textContent('.song-title b')
  if (/Uke bank test/.test(title2)) problems.push('uke song shown in guitar mode')
  await page.click('text=Songs').catch(() => page.click('button:has-text("Song")'))
  await page.waitForSelector('.sheet')
  await page.waitForTimeout(600)
  const gList = await page.textContent('.sheet')
  if (/Uke bank test/.test(gList)) problems.push('uke song listed in guitar mode')
  if (!/Guitar bank test/.test(gList)) problems.push('guitar song missing from guitar bank')
  await page.keyboard.press('Escape')
  // celebration: 14 minutes logged, goal 15, then one more minute of practice
  await page.evaluate(() => {
    const k = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })()
    localStorage.setItem('kg:practiceLog', JSON.stringify({ [k]: { guitar: 0, study: 14 * 60 + 50, by: { quiz: 890 }, answers: 0, correct: 0, done: [] } }))
  })
  await page.reload()
  await page.click('nav >> text=Learn')
  await page.screenshot({ path: `${DIR}/learn-behaviour-before-goal.png` })
  await page.click('.tool:has-text("Rhythm")')
  await page.click('text=Start')
  await page.waitForTimeout(16500) // timer flushes every 15 s
  const celebrated = await page.$('.celebrate')
  await page.screenshot({ path: `${DIR}/learn-behaviour-celebrate.png` })
  if (!celebrated) problems.push('no celebration after reaching the daily goal')
  if (errors.length) problems.push('behaviour page errors: ' + errors.join(' | '))
  await ctx.close()
  await browser.close()
  console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'All Learn checks passed')
  process.exit(problems.length ? 1 : 0)
})()
