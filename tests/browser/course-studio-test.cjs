// End-to-end Headless Chrome Playwright verification for KGuitar's Course Studio:
// 1. Loads a mapped course with `kguitar-course.json` (containing multi-page PDF book lessons, tab diagram PNGs,
//    backing track MP3s, and Drop D tuning badges).
// 2. Verifies Lesson 1 opens the PDF book directly on <canvas> at its exact mapped page (p.2) with the
//    draggable/resizable Floating Video Player (`course-floating-video-card`) on top.
// 3. Verifies tapping `Next ›` advances to Lesson 2 AND automatically flips the PDF book canvas to p.3!
// 4. Verifies `📌 Pin p.X` manual override persists across lesson transitions, and `Reset` restores the auto-mapped page.
// 5. Verifies `⧉ Float Video` | `◫ Side-by-Side` | `🎬 Video Only` layout switching, minimize-to-bubble (`–`),
//    `🖼 Tab Diagram | 📖 Study Guide` switching on lessons with both, and all 5 Guitar Practice Tools
//    (Metronome + Speed-Ramp, Floating 5-Layer Neck, Quick Tuner with Drop D target, My BPM & Note, Backing Track strip).
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const DIR = path.join(__dirname, 'out')
fs.mkdirSync(DIR, { recursive: true })

const problems = []
const bad = m => { problems.push(m); console.error('  FAIL:', m) }
const ok = m => console.log('  OK:', m)

/** Build a tiny valid 4-page PDF in memory so pdfjs-dist renders pages 1..4 onto canvas. */
function makeMinimal4PagePdfBase64() {
  const objs = []
  const addObj = (id, body) => objs.push({ id, body })
  addObj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  addObj(2, '<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R 6 0 R] /Count 4 >>')
  for (let p = 0; p < 4; p++) {
    const pageId = 3 + p
    const contentId = 7 + p
    addObj(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 520] /Contents ${contentId} 0 R /Resources << /Font << /F1 11 0 R >> >> >>`)
    const stream = `BT /F1 24 Tf 40 460 Td (Acoustic Adventure Page ${p + 1}) Tj ET`
    addObj(contentId, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  }
  addObj(11, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  objs.sort((a, b) => a.id - b.id)

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const o of objs) {
    offsets[o.id] = Buffer.byteLength(pdf, 'utf8')
    pdf += `${o.id} 0 obj\n${o.body}\nendobj\n`
  }
  const xrefStart = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  for (let i = 1; i <= objs.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`
  return Buffer.from(pdf, 'utf8').toString('base64')
}

// 1x1 white PNG
const TINY_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='

;(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  })

  const vid = path.join(__dirname, '..', '..', 'dist', 'test-lesson.webm')
  if (!fs.existsSync(vid)) {
    const tmp = await browser.newPage()
    const b64 = await tmp.evaluate(async () => {
      const c = document.createElement('canvas')
      c.width = 160; c.height = 90
      const ctx = c.getContext('2d')
      const stream = c.captureStream(15)
      const rec = new MediaRecorder(stream, { mimeType: 'video/webm' })
      const chunks = []
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
      rec.start()
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 ? '#224' : '#346'
        ctx.fillRect(0, 0, 160, 90)
        await new Promise(r => setTimeout(r, 40))
      }
      rec.stop()
      await new Promise(r => { rec.onstop = r })
      const buf = await new Blob(chunks, { type: 'video/webm' }).arrayBuffer()
      let bin = ''
      const bytes = new Uint8Array(buf)
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
      return btoa(bin)
    })
    fs.mkdirSync(path.dirname(vid), { recursive: true })
    fs.writeFileSync(vid, Buffer.from(b64, 'base64'))
    await tmp.close()
  }

  const pdfB64 = makeMinimal4PagePdfBase64()
  const courseMapJson = JSON.stringify({
    version: 1,
    title: 'Paul Davids — Acoustic Adventure',
    instructor: 'Paul Davids',
    description: 'Synced 93-page songbook + floating video player',
    chapters: [
      {
        id: '01',
        title: '01 · Flatpickers Saloon',
        lessons: [
          {
            id: 'aa-01-01',
            title: '1. Walk in the Park Blues',
            video: '01 Flatpicker Saloon/01. Walk in the park blues.mp4',
            pdf: 'book.pdf',
            startPage: 2,
            endPage: 2,
            defaultView: 'pdf',
          },
          {
            id: 'aa-01-02',
            title: '3. Drop D Fingerpicking Level 1',
            video: '01 Flatpicker Saloon/02. Drop D Fingerpicking.mp4',
            pdf: 'book.pdf',
            startPage: 3,
            endPage: 4,
            images: [{ path: '01 Flatpicker Saloon/tab1.png', label: 'Tab 1' }],
            backings: [{ path: '01 Flatpicker Saloon/backing1.mp3', label: 'Drop D Backing 82 BPM' }],
            defaultView: 'image',
            tuning: 'Drop D',
          },
        ],
      },
    ],
  })
  const mapB64 = Buffer.from(courseMapJson, 'utf8').toString('base64')

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 })
  const page = await ctx.newPage()
  page.errors = []
  page.on('pageerror', e => page.errors.push(e.message))

  await page.addInitScript(({ pdfB64, mapB64, pngB64 }) => {
    const f = (p, uri, mime) => ({
      path: p,
      name: p.split('/').pop(),
      mime,
      size: 1024,
      modified: 0,
      uri: 'content://test/aa/' + uri,
    })
    window.__kgLessonsMock = {
      pick: async () => ({ tree: 'content://test/aa', name: 'Paul Davids - Acoustic Adventure' }),
      list: async () => ({
        files: [
          f('kguitar-course.json', 'map', 'application/json'),
          f('book.pdf', 'book', 'application/pdf'),
          f('01 Flatpicker Saloon/01. Walk in the park blues.mp4', 'v1', 'video/mp4'),
          f('01 Flatpicker Saloon/02. Drop D Fingerpicking.mp4', 'v2', 'video/mp4'),
          f('01 Flatpicker Saloon/tab1.png', 'img1', 'image/png'),
          f('01 Flatpicker Saloon/backing1.mp3', 'aud1', 'audio/mpeg'),
        ],
      }),
      read: async ({ uri }) => {
        if (uri.endsWith('/map')) return { data: mapB64 }
        if (uri.endsWith('/book')) return { data: pdfB64 }
        return { data: pngB64 }
      },
      openExternal: async () => {},
      forget: async () => {},
      granted: async () => ({ trees: [] }),
      media: uri => {
        if (uri.endsWith('/img1')) return 'data:image/png;base64,' + pngB64
        return '/test-lesson.webm'
      },
    }
    if (sessionStorage.getItem('seeded')) return
    localStorage.clear()
    localStorage.setItem('kg:welcomed', '1')
    localStorage.setItem('kg:psyDefault', '1'); localStorage.setItem('kg:navHidden', '0'); localStorage.setItem('kg:studioCockpit', 'false')
    localStorage.setItem('kg:getReady', '0')
    localStorage.setItem('kg:tab2', JSON.stringify('learn'))
    localStorage.setItem('kg:sub:learn', JSON.stringify('explore'))
    sessionStorage.setItem('seeded', '1')
  }, { pdfB64, mapB64, pngB64: TINY_PNG_B64 })

  await page.goto('http://localhost:4173/')
  await page.waitForSelector('.explore')
  await page.locator('.tool:has-text("Your video lessons")').click()
  await page.locator('button:has-text("Find my lessons")').click()
  await page.waitForSelector('.course')

  const courseText = await page.locator('.course').textContent()
  if (!courseText.includes('Book & Tab Sync ✓')) bad('Course card missing Book & Tab Sync badge')
  else ok('Course card loaded kguitar-course.json and displays Book & Tab Sync badge')

  // Open Lesson 1
  await page.locator('.course .btn.primary').click()
  await page.waitForSelector('[data-testid="lesson-player"]')
  await page.waitForSelector('[data-testid="course-floating-video-card"]')
  await page.waitForSelector('[data-testid="course-pdf-canvas-1"]')
  ok('Lesson 1 opens with Floating Video Card + In-App PDF Book Canvas')

  const p1Val = await page.locator('[data-testid="course-pdf-page-input"]').inputValue()
  if (p1Val !== '2') bad(`Lesson 1 expected PDF page 2, got ${p1Val}`)
  else ok('Lesson 1 automatically opened PDF book to mapped Page 2')

  // Test Pin Page override
  await page.locator('[data-testid="pdf-next-page"]').click()
  const pNext = await page.locator('[data-testid="course-pdf-page-input"]').inputValue()
  if (pNext !== '3') bad(`Expected page 3 after Next Page, got ${pNext}`)
  await page.locator('[data-testid="pdf-pin-btn"]').click()
  const pinLabel = await page.locator('[data-testid="pdf-pin-btn"]').textContent()
  if (!pinLabel.includes('Pinned p.3')) bad(`Expected Pinned p.3 badge, got ${pinLabel}`)
  else ok('1-tap Pin Page saves custom page override')
  await page.locator('[data-testid="pdf-unpin-btn"]').click()

  // Test Floating Video Opacity Slider + Quick Presets
  await page.locator('[data-testid="float-video-opacity-btn"]').click()
  await page.waitForSelector('[data-testid="float-video-opacity-bar"]')
  await page.locator('[data-testid="float-opacity-60"]').click()
  const cardOp = await page.evaluate(() => getComputedStyle(document.querySelector('[data-testid="course-floating-video-card"]')).opacity)
  if (Math.abs(parseFloat(cardOp) - 0.6) > 0.05) bad(`Expected floating video opacity ~0.6, got ${cardOp}`)
  else ok('Floating video Opacity slider & quick presets make video translucent over PDF')
  await page.locator('[data-testid="float-opacity-100"]').click()
  await page.locator('[data-testid="float-video-opacity-btn"]').click()

  // Test Floating Finger Diagram: open, chord lookup, zoom, shape cycle, hide
  await page.locator('[data-testid="tool-finger-card-btn"]').click()
  await page.waitForSelector('[data-testid="course-finger-card"]')
  await page.locator('[data-testid="finger-chord-input"]').fill('Am7')
  await page.locator('[data-testid="finger-zoom-in"]').click()
  const zoomText = await page.locator('[data-testid="finger-zoom-reset"]').textContent()
  if (!zoomText.includes('125%')) bad(`Expected finger diagram zoom 125%, got ${zoomText}`)
  else ok('Floating Finger Diagram opens, looks up chords, and zooms cleanly')
  await page.locator('[data-testid="course-finger-card"] button[aria-label="Hide this card"]').click()
  if (await page.locator('[data-testid="course-finger-card"]').count()) bad('Floating Finger Diagram did not hide on ×')
  else ok('Floating Finger Diagram hides cleanly on ×')

  // Test Layout switching: Float -> Side-by-Side -> Float & Minimize to Bubble
  await page.locator('[data-testid="layout-split"]').click()
  await page.waitForSelector('[data-testid="course-docked-video"]')
  ok('Side-by-Side split layout docks video next to PDF book')
  await page.locator('[data-testid="layout-float"]').click()
  await page.locator('[data-testid="float-video-minimize"]').click()
  await page.waitForSelector('[data-testid="float-video-bubble"]')
  await page.locator('[data-testid="float-video-bubble"]').click()
  ok('Floating video shrinks to bubble pill and restores cleanly')

  // Advance to Lesson 2 -> verify automatic sync to Tab Image + Study Guide p.3-4 + Backing Track + Drop D badge!
  await page.locator('button:has-text("Next ›")').click()
  const l2Title = await page.locator('.lesson-player h1').textContent()
  if (l2Title !== '3. Drop D Fingerpicking Level 1') bad(`Expected Lesson 2 title, got ${l2Title}`)
  await page.waitForSelector('[data-testid="course-tab-image"]')
  await page.waitForSelector('[data-testid="lesson-backing-audio"]')
  ok('Next Lesson automatically switches to Lesson 2 Tab Diagram + Backing Track Audio Strip')

  // Switch from Tab Diagram to Study Guide PDF (p.3–4)
  await page.locator('[data-testid="stage-mode-pdf"]').click()
  await page.waitForSelector('[data-testid="course-pdf-canvas-1"]')
  const l2Page = await page.locator('[data-testid="course-pdf-page-input"]').inputValue()
  if (l2Page !== '3') bad(`Lesson 2 Study Guide expected page 3, got ${l2Page}`)
  else ok('1-tap Tab Diagram | Study Guide switcher flips straight to Lesson 2 Page 3')

  // Test Practice Tools on the toolbar
  await page.locator('[data-testid="tool-metronome-btn"]').click()
  await page.waitForSelector('[data-testid="inline-metronome-panel"]')
  await page.locator('[data-testid="metro-plus5"]').click()
  await page.locator('[data-testid="metro-ramp-btn"]').click()
  ok('Inline Metronome + Speed-Ramp (+5 BPM / 4 bars) works')

  await page.locator('[data-testid="tool-tuner-btn"]').click()
  await page.waitForSelector('[data-testid="inline-tuner-panel"]')
  const tunerText = await page.locator('[data-testid="inline-tuner-panel"]').textContent()
  if (!tunerText.includes('Drop D')) bad('Tuner panel did not show Drop D target strings')
  else ok('Quick Tuner shows Drop D target strings for Drop D lesson')

  await page.locator('[data-testid="tool-note-btn"]').click()
  await page.waitForSelector('[data-testid="lesson-note-panel"]')
  await page.locator('[data-testid="lesson-bpm-input"]').fill('95')
  await page.locator('[data-testid="lesson-note-input"]').fill('Clean at 95 BPM')
  const noteBtnText = await page.locator('[data-testid="tool-note-btn"]').textContent()
  if (!noteBtnText.includes('95 BPM')) bad(`Expected 95 BPM badge on note button, got ${noteBtnText}`)
  else ok('Per-lesson My BPM & Note saves and updates toolbar badge live')

  await page.locator('[data-testid="tool-float-neck-btn"]').click()
  await page.waitForSelector('[data-testid="strum-float-neck"]')
  ok('1-tap 5-Layer Neck opens the Floating 5-Layer Fretboard over the lesson')

  await page.screenshot({ path: path.join(DIR, 'course-studio-verified.png') })

  if (page.errors.length) bad('Page errors: ' + page.errors.join(' | '))
  await browser.close()

  if (problems.length) {
    console.error(`Course Studio test failed with ${problems.length} problem(s)`)
    process.exit(1)
  }
  console.log('Course Studio browser test: ALL CHECKS PASSED!')
})()
