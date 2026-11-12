// The KGuitar manual as a PDF: a 2-minute Quick Start with real Day Mode screenshots of the app (taken here, from the
// built app on the preview server), then every section of "How to use KGuitar" (src/learn/guide.ts) with why, when and
// how. Writes public/manual/KGuitar-manual.pdf, which Learn → How to use KGuitar → "Save the manual (PDF)" hands out.
//   npm run build && npx vite preview --port 4173 &   then   node tools/make-manual.cjs
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'public', 'manual')
fs.mkdirSync(OUT, { recursive: true })

// the guide's text, straight from the app's source
const tmp = path.join(ROOT, 'node_modules', '.tmp')
fs.mkdirSync(tmp, { recursive: true })
fs.writeFileSync(path.join(tmp, 'guide-entry.ts'), `import { GUIDE } from '../../src/learn/guide'\nconsole.log(JSON.stringify(GUIDE))\n`)
execSync(`npx -y esbuild@0.25 ${path.join(tmp, 'guide-entry.ts')} --bundle --platform=node --format=esm --log-level=warning --outfile=${path.join(tmp, 'guide.mjs')}`, { cwd: ROOT })
const GUIDE = JSON.parse(execSync(`node ${path.join(tmp, 'guide.mjs')}`).toString())

const VP = { width: 412, height: 915 }
async function shot(browser, seed, act, name) {
  const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 2, hasTouch: true })
  const page = await ctx.newPage()
  await page.addInitScript(s => {
    window.__kgTest = true
    try { if (window.top !== window || sessionStorage.getItem('seeded')) return } catch { return }
    localStorage.clear()
    for (const [k, v] of Object.entries({ 'kg:welcomed': '1', 'kg:psyDefault': '1', 'kg:theme': '"day"', 'kg:getReady': '0', 'kg:tipsMode': '"off"', 'kg:askBubble': 'true', ...s })) localStorage.setItem(k, v)
    sessionStorage.setItem('seeded', '1')
  }, seed)
  await page.goto('http://localhost:4173/')
  await page.waitForTimeout(800)
  try { await act(page) } catch (e) { console.log(`  (${name}: ${e.message.split('\n')[0]})`) }
  await page.waitForTimeout(700)
  const buf = await page.screenshot({ type: 'jpeg', quality: 72 })
  await ctx.close()
  console.log('  shot', name)
  return `data:image/jpeg;base64,${buf.toString('base64')}`
}
const explore = async page => { await page.waitForSelector('.today-card'); await page.locator('.subtabs [role=tab]:has-text("Explore")').first().click() }
const play = async page => { await page.waitForSelector('.tab-note', { timeout: 10000 }); await page.locator('.song-check button:has-text("Got it")').click({ timeout: 2500 }).catch(() => {}) }

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--autoplay-policy=no-user-gesture-required'] })
  const S = {}
  S.library = await shot(browser, { 'kg:tab2': '"songs"' }, p => p.waitForSelector('.songs-screen'), 'library')
  S.play = await shot(browser, { 'kg:tab2': '"play"' }, play, 'play')
  S.game = await shot(browser, { 'kg:tab2': '"play"' }, async p => { await play(p); await p.locator('[data-testid=game-toggle]').click(); await p.waitForSelector('[data-testid=game-highway] canvas') }, 'game')
  S.add = await shot(browser, { 'kg:tab2': '"songs"' }, async p => { await p.waitForSelector('.songs-screen'); await p.locator('.subtabs [role=tab]:has-text("Add a song")').first().click() }, 'add')
  S.today = await shot(browser, { 'kg:tab2': '"learn"' }, p => p.waitForSelector('.today-card'), 'today')
  S.course = await shot(browser, { 'kg:tab2': '"learn"' }, async p => { await explore(p); await p.click('.tool:has-text("Theory")'); await p.locator('[data-testid=deep-preview]').click(); await p.locator('[data-testid=deep-next]').click(); await p.locator('[data-testid=deep-next]').click() }, 'course')
  S.jam = await shot(browser, { 'kg:tab2': '"progressions"' }, p => p.waitForSelector('.jam-choices'), 'jam')
  S.helper = await shot(browser, { 'kg:tab2': '"learn"' }, async p => { await p.waitForSelector('.today-card'); await p.locator('.ask-bubble').click(); await p.waitForSelector('.search-sheet') }, 'helper')
  S.tuner = await shot(browser, { 'kg:tab2': '"tools"' }, p => p.waitForSelector('.subtabs'), 'tuner')
  S.books = await shot(browser, { 'kg:tab2': '"learn"' }, async p => { await explore(p); await p.click('.tool:has-text("My books")') }, 'books')
  S.settings = await shot(browser, { 'kg:tab2': '"learn"' }, async p => { await p.waitForSelector('.today-card'); await p.locator('button[aria-label="Settings"]').first().click() }, 'settings')

  const QUICK = [
    ['library', 'Pick a song', 'Tap **Songs**. The Library has everything you can play: your songs and the built-in songbook. "Learning now" is at the top. Tap any song.'],
    ['play', 'Play along', 'The song opens in the song player. Tap **Listen** (top right) and play: every right note turns green and the cursor moves on. **Wait for me** waits for you; **In time** keeps the beat. **Loop** repeats a hard part, **Hear it** plays it for you, **Options** has speed and more.'],
    ['game', 'Game Mode', 'The game button turns the tab into a highway with a bouncing ball, like a game. Score stars, beat your best, slow it down until it\'s easy.'],
    ['add', 'Add your own songs', 'Songs → **Add a song**: type a song name, paste a YouTube or tab link, paste a tab, or pick a Guitar Pro file, a PDF, a picture or a recording. One box does it all.'],
    ['today', 'Practise every day', 'Tap **Learn**. Today shows a short plan made for you, your streak and your goal. Five minutes counts, with or without the guitar.'],
    ['course', 'Learn the theory', 'Learn → Explore → **Theory lessons**: deep lessons step by step, with sounds, pictures of the neck, ear training, a practice week and checks.'],
    ['jam', 'Jam with a band', 'Tap **Jam**: **Play with a band** (chord progressions with drums and bass), **Make a beat**, or **Loop myself** (a 4-track looper).'],
    ['helper', 'Ask anything', 'The **✨** bubble is your helper: ask how to do something, or a guitar question. A glowing dot means it has a tip for the screen you\'re on.'],
    ['tuner', 'Tune up', 'Tap **Tools** for the tuner, metronome, chords and scales.'],
    ['settings', 'Make it yours', 'The **gear** opens Settings: your instrument, how you plug in (phone mic or USB), sounds, look and backup.'],
  ]
  const md = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  const SEC_SHOT = { start: 'today', play: 'play', learn: 'course', jam: 'jam', tools: 'tuner', gear: 'settings' }
  const art = fs.existsSync(path.join(ROOT, 'public', 'art.jpg')) ? `data:image/jpeg;base64,${fs.readFileSync(path.join(ROOT, 'public', 'art.jpg')).toString('base64')}` : ''
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>KGuitar manual</title><style>
    @page { size: A4; margin: 16mm 14mm; }
    body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1d1830; font-size: 11pt; line-height: 1.45; }
    h1 { font-size: 30pt; margin: 0 0 6pt; } h2 { font-size: 17pt; margin: 0 0 6pt; color: #5b2bb5; } h3 { font-size: 12.5pt; margin: 10pt 0 2pt; }
    .cover { text-align: center; page-break-after: always; padding-top: 40mm; } .cover img { width: 70mm; border-radius: 6mm; margin-bottom: 10mm; }
    .qs { display: flex; gap: 8mm; align-items: flex-start; page-break-inside: avoid; margin: 0 0 7mm; }
    .qs img, .sec img { width: 46mm; border-radius: 3mm; border: 1px solid #ddd; flex: 0 0 auto; }
    .num { display: inline-block; width: 8mm; height: 8mm; border-radius: 50%; background: #7c4dff; color: #fff; text-align: center; line-height: 8mm; font-weight: 700; margin-right: 2mm; }
    .sec { page-break-before: always; } .sec .top { display: flex; gap: 8mm; align-items: flex-start; }
    .ww { background: #f3efff; border-radius: 3mm; padding: 3mm 4mm; margin: 4mm 0; } .ww p { margin: 1mm 0; }
    .item { page-break-inside: avoid; } .item p { margin: 1mm 0 0; } .tip { color: #555; font-style: italic; }
    .muted { color: #666; }
  </style></head><body>
  <div class="cover">${art ? `<img src="${art}">` : ''}<h1>KGuitar</h1><p style="font-size:14pt">The manual</p><p class="muted">Quick Start (2 minutes), then every feature: why, when and how.<br>${new Date().toISOString().slice(0, 10)}</p></div>
  <h2>Quick Start: 2 minutes</h2>
  ${QUICK.map(([k, t, d], i) => `<div class="qs"><img src="${S[k]}"><div><h3><span class="num">${i + 1}</span>${md(t)}</h3><p>${md(d)}</p></div></div>`).join('\n')}
  ${GUIDE.map((sec, n) => `<div class="sec"><div class="top">${SEC_SHOT[sec.id] && S[SEC_SHOT[sec.id]] ? `<img src="${S[SEC_SHOT[sec.id]]}">` : ''}<div><h2>${n + 1}. ${md(sec.title)}</h2><p>${md(sec.intro)}</p>
    ${sec.why || sec.when ? `<div class="ww">${sec.why ? `<p><b>Why:</b> ${md(sec.why)}</p>` : ''}${sec.when ? `<p><b>When:</b> ${md(sec.when)}</p>` : ''}</div>` : ''}</div></div>
    ${sec.items.map(it => `<div class="item"><h3>${md(it.title)}</h3><p>${md(it.text)}</p>${it.tip ? `<p class="tip">${md(it.tip)}</p>` : ''}</div>`).join('\n')}</div>`).join('\n')}
  </body></html>`
  fs.writeFileSync(path.join(tmp, 'manual.html'), html)
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto('file://' + path.join(tmp, 'manual.html'))
  await page.pdf({ path: path.join(OUT, 'KGuitar-manual.pdf'), format: 'A4', printBackground: true, margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' } })
  await browser.close()
  console.log(`manual: ${Math.round(fs.statSync(path.join(OUT, 'KGuitar-manual.pdf')).size / 1024)} KB → public/manual/KGuitar-manual.pdf`)
})()
