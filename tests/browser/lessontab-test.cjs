// Course folder tabs open in the one "Lesson tab" floating window (PDF page, text tab, picture), it follows the lesson,
// and "Play this page" opens the PDF's tab in Play. Needs the preview server on 4173 and ffmpeg.
const { chromium } = require('playwright')
const fs = require('fs'), path = require('path'), { execSync } = require('child_process')
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true })
const COURSE = path.join(OUT, 'lessontab-course', 'My Course'), CH = path.join(COURSE, '01 Basics')
fs.rmSync(path.join(OUT, 'lessontab-course'), { recursive: true, force: true }); fs.mkdirSync(CH, { recursive: true })
fs.copyFileSync(path.join(__dirname, '../fixtures/text-tab.pdf'), path.join(CH, '01 First riff.pdf'))
fs.copyFileSync(path.join(__dirname, '../fixtures/scanned.pdf'), path.join(CH, 'Extra tabs.pdf'))
fs.writeFileSync(path.join(CH, 'Warm up riff.txt'), 'e|-----0---3---|\nB|---1---1-----|\nG|-2-----------|\nD|-------------|\nA|-------------|\nE|-------------|\n')
execSync(`ffmpeg -loglevel error -y -f lavfi -i color=c=black:s=320x240:d=2 -c:v libx264 -pix_fmt yuv420p "${path.join(CH, '01 First riff.mp4')}"`)
// a picture: copy the scanned PDF's look is not needed, any PNG will do
fs.writeFileSync(path.join(CH, 'Chord chart.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64'))
let bad = 0; const fail = m => { bad++; console.log('  PROBLEM ' + m) }
;(async () => {
  const S = OUT + '/'
  const b = await chromium.launch()
  for (const [w, h, n] of [[840, 757, 'inner'], [412, 915, 'cover']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  const errs = []; p.on('pageerror', e => errs.push(e.message))
  await p.addInitScript(() => { if (sessionStorage.getItem('s')) return; localStorage.clear(); for (const [k, v] of Object.entries({ 'kg:welcomed': '1', 'kg:psyDefault': '1', 'kg:navHidden': '0', 'kg:studioCockpit': 'false', 'kg:getReady': '0', 'kg:askBubble': 'false', 'kg:looperBubble': 'false', 'kg:tipsMode': '"off"', 'kg:sub:learn': '"explore"' })) localStorage.setItem(k, v); sessionStorage.setItem('s', '1') })
  await p.goto('http://localhost:4173/'); await p.waitForTimeout(1500)
  await p.locator('nav.nav button:has-text("Learn")').first().click(); await p.waitForTimeout(800)
  await p.locator('button:has-text("Course Studio"), button:has-text("Your video lessons")').first().click(); await p.waitForTimeout(800)
  await p.locator('[data-testid=course-webdir-input]').setInputFiles(COURSE); await p.waitForTimeout(1500)
  // chapter list → tabs under the lessons
  if (await p.locator('.course-ch').first().getAttribute('aria-expanded') !== 'true') await p.locator('.course-ch').first().click(); await p.waitForTimeout(400)
    const files = await p.locator('[data-testid=lesson-tab-file]').allInnerTexts()
  console.log(n, 'tabs listed:', files.map(t => t.replace(/\n/g, ' ')))
  await p.locator('[data-testid=lesson-tab-file]', { hasText: 'First riff' }).first().click()
  await p.waitForSelector('[data-testid=lesson-tab-pdf] canvas', { timeout: 8000 }); await p.waitForTimeout(1500)
  console.log('  pdf:', await p.locator('[data-testid=lesson-tab-page]').innerText())
  await p.screenshot({ path: S + `lt-${n}-pdf.png` })
  await p.locator('[data-testid=lesson-tab-pick]').selectOption({ label: 'Warm up riff' })
  await p.waitForSelector('[data-testid=lesson-tab-tab] .tab-note', { timeout: 8000 }).catch(() => console.log('  NO text tab'))
  { const c = await p.locator('[data-testid=lesson-tab-card]').count(), nn = await p.locator('[data-testid=lesson-tab-tab] .tab-note').count(); if (c !== 1 || nn < 4) fail(`${n}: text tab in the window (${c} windows, ${nn} notes)`) }
  console.log('  cards open:', await p.locator('[data-testid=lesson-tab-card]').count(), 'notes:', await p.locator('[data-testid=lesson-tab-tab] .tab-note').count())
  await p.screenshot({ path: S + `lt-${n}-txt.png` })
  await p.locator('[data-testid=lesson-tab-pick]').selectOption({ label: 'Chord chart' }); await p.waitForTimeout(600)
  console.log('  picture:', await p.locator('[data-testid=lesson-tab-pic] img').count())
  // a lesson: the window follows
  await p.locator('[data-testid=lesson-tab-card] button[aria-label*="Shrink"], [data-testid=lesson-tab-card] .fc-btn').nth(1).click().catch(() => {}); await p.waitForTimeout(300); await p.locator('.course-video:not(.tab-file)').first().click({ force: true }); await p.waitForTimeout(1500)
  console.log('  in lesson, card shows:', await p.locator('[data-testid=lesson-tab-card]').count() ? await p.locator('[data-testid=lesson-tab-card] .fc-title, [data-testid=lesson-tab-card] b').first().innerText().catch(() => '?') : 'none')
  await p.screenshot({ path: S + `lt-${n}-lesson.png` })
  // Play this page
  if (!(await p.locator('[data-testid=lesson-tab-card]').count())) await p.locator('[data-testid=lesson-tab-chip]').click().catch(() => {}); await p.waitForTimeout(800)
  await p.locator('[data-testid=lesson-tab-play]').click(); await p.waitForTimeout(3000)
  console.log('  after Play this page: play screen notes', await p.locator('.tab-note').count(), 'status', await p.locator('[data-testid=lesson-tab-card] [role=status]').innerText().catch(() => '(card gone)'))
  if (errs.length) fail(`${n}: page errors ${errs.join(' | ')}`)
  if (!(await p.locator('.tab-note').count())) fail(`${n}: Play this page didn't open the tab in Play`)
  await p.close()
  }
  await b.close()
  console.log(bad ? `${bad} problem(s)` : 'lesson tab: all good')
  process.exit(bad ? 1 : 0)
})()
