// Every quiz in the practice course, answered on screen by tapping like a person would: the first question of each
// quiz gets a wrong answer (it must say "Not quite" and move on with Next), the rest get the right answer (tapped on
// the neck, the note buttons, the choices or the chord diagrams). Runs on guitar, tenor ukulele and baritone, with away
// mode on for guitar (the mode the "tap the F on the low E string" bug was found in).
// Run with the preview server on :4173:  node tests/browser/quiz-test.cjs [guitar|tenor|baritone|guitar-dadgad]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const DIR = path.join(__dirname, 'out')
fs.mkdirSync(DIR, { recursive: true })

const SETUPS = {
  guitar: { inst: { id: 'guitar', tuning: {} }, away: true },
  tenor: { inst: { id: 'tenor', tuning: {} }, away: false },
  baritone: { inst: { id: 'baritone', tuning: {} }, away: false },
  'guitar-dadgad': { inst: { id: 'guitar', tuning: { guitar: 'dadgad' } }, away: false },
}

/** In the page: what to tap for the right (or a wrong) answer to the question on screen. */
function plan(wantRight) {
  const q = window.__kgQuestion
  if (!q) return { err: 'no question' }
  const inp = q.input
  const good = a => { try { return q.check(a) === wantRight } catch (e) { return false } }
  if (inp.type === 'notes') {
    const pcs = inp.naturalsOnly ? [0, 2, 4, 5, 7, 9, 11] : [...Array(12).keys()]
    const i = pcs.findIndex(p => good({ pc: p }))
    return i < 0 ? { err: 'no note answer' } : { kind: 'nth', sel: '.note-btn', i, item: q.item }
  }
  if (inp.type === 'choices' || inp.type === 'diagrams') {
    const i = inp.options.findIndex(o => good({ choice: o.id }))
    return i < 0 ? { err: `no ${inp.type} answer` } : { kind: 'nth', sel: inp.type === 'choices' ? '.choice-btn' : '.quiz-input .diagram', i, item: q.item }
  }
  if (inp.type === 'spell') {
    for (let a = 0; a < 12; a++) for (let b = a + 1; b < 12; b++) for (let c = b + 1; c < 12; c++)
      if (good({ pcs: [a, b, c] })) return { kind: 'spell', pcs: [a, b, c], item: q.item }
    return { err: 'no spell answer' }
  }
  if (inp.type === 'neck') {
    const from = q.neck?.from ?? 0, to = q.neck?.to ?? 13
    const nStr = document.querySelectorAll('.quiz-card .fb-hit[data-fret="1"]').length
    const strings = inp.strings ?? [...Array(nStr).keys()]
    const frets = []
    for (let f = from; f <= to; f++) frets.push(f)
    if (inp.count === 1) {
      for (const s of strings) for (const f of frets) if (good({ pos: { s, f } })) return { kind: 'neck', spots: [{ s, f }], item: q.item }
      return { err: 'no neck answer' }
    }
    if (inp.strings && inp.count === inp.strings.length) {
      // one note per string: try every combination (prefer low frets so it stays in reach)
      const [s1, s2, s3] = inp.strings
      for (const a of frets) for (const b of frets) for (const c of frets) {
        const ps = [{ s: s1, f: a }, { s: s2, f: b }, { s: s3, f: c }]
        if (good({ positions: ps })) return { kind: 'neck', spots: ps, item: q.item }
      }
      return { err: 'no triad answer' }
    }
    // tap every spot: the revealed spots are the answer; a wrong answer swaps one for a wrong note
    const spots = (q.reveal ?? []).map(m => ({ s: m.s, f: m.f }))
    if (wantRight) return good({ positions: spots }) ? { kind: 'neck', spots, item: q.item } : { err: 'reveal is not the answer' }
    for (const s of strings) for (const f of frets) {
      if (spots.some(p => p.s === s && p.f === f)) continue
      const ps = [...spots.slice(1), { s, f }]
      if (good({ positions: ps })) return { kind: 'neck', spots: ps, item: q.item }
    }
    return { err: 'no wrong set' }
  }
  return { err: 'unknown input ' + inp.type }
}

async function tapNeck(page, s, f) {
  const hit = page.locator(`.quiz-card .fb-hit[data-string="${s}"][data-fret="${f}"]`)
  await hit.scrollIntoViewIfNeeded()
  const b = await hit.boundingBox()
  if (!b) throw new Error(`no hit area for string ${s} fret ${f}`)
  // a real finger tap at that spot: whatever is drawn there gets it
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2)
}

async function answer(page, wantRight) {
  const p = await page.evaluate(plan, wantRight)
  if (p.err) throw new Error(p.err)
  if (p.kind === 'nth') await page.locator(p.sel).nth(p.i).tap()
  else if (p.kind === 'spell') {
    for (const pc of p.pcs) await page.locator('.note-btn').nth(pc).tap()
    await page.locator('.quiz-input button:has-text("Check")').tap()
  } else for (const sp of p.spots) await tapNeck(page, sp.s, sp.f)
  return p
}

async function run(name) {
  const setup = SETUPS[name]
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined })
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(s => {
    window.__kgTest = true
    if (sessionStorage.getItem('seeded')) return
    localStorage.clear()
    localStorage.setItem('kg:welcomed', '1'); localStorage.setItem('kg:getReady', '0')
    localStorage.setItem('kg:tab2', '"learn"')
    localStorage.setItem('kg:quizMode', '"tap"')
    localStorage.setItem('kg:sub:learn', '"course"')
    localStorage.setItem('kg:instrument', JSON.stringify(s.inst))
    if (s.away) localStorage.setItem('kg:away', JSON.stringify({ since: Date.now() }))
    sessionStorage.setItem('seeded', '1')
  }, setup)
  await page.goto('http://localhost:4173/')
  await page.waitForSelector('.unit-head')
  const problems = []
  let quizzes = 0, questions = 0
  const units = await page.locator('.unit-head').count()
  for (let u = 0; u < units; u++) {
    const head = page.locator('.unit-head').nth(u)
    const unitName = (await head.locator('b').textContent()).trim()
    if ((await head.getAttribute('aria-expanded')) !== 'true') await head.tap()
    const n = await page.locator('.unit.open .quiz-list button').count()
    for (let k = 0; k < n; k++) {
      const btn = page.locator('.unit.open .quiz-list button').nth(k)
      const title = (await btn.locator('b').textContent()).trim()
      await btn.tap()
      const tag = `${name} / ${unitName} / ${title}`
      try {
        await page.waitForSelector('.quiz-card', { timeout: 5000 })
        const len = await page.locator('.quiz-progress span').count()
        for (let i = 0; i < len; i++) {
          await page.waitForFunction(() => window.__kgQuestion && !document.querySelector('.quiz-feedback'), null, { timeout: 5000 })
          const prompt = await page.locator('.quiz-prompt').textContent()
          const wantRight = i > 0
          const p = await answer(page, wantRight)
          await page.waitForSelector('.quiz-feedback', { timeout: 3000 }).catch(() => { throw new Error(`no feedback after answering "${prompt}" (${p.item})`) })
          const fb = await page.locator('.quiz-feedback b').textContent()
          if (wantRight !== fb.startsWith('✓')) throw new Error(`"${prompt}" (${p.item}): expected ${wantRight ? 'right' : 'wrong'}, got "${fb}"`)
          questions++
          if (!wantRight) {
            await page.locator('.quiz-feedback button:has-text("Next")').tap()
          } else if (i + 1 < len) {
            // right answers move on by themselves
            await page.waitForFunction(() => !document.querySelector('.quiz-feedback'), null, { timeout: 4000 })
          }
        }
        await page.waitForSelector('.quiz-end', { timeout: 4000 })
        const pct = await page.locator('.quiz-end .readout').textContent()
        const want = Math.round(((len - 1) / len) * 100) + '%'
        if (pct.trim() !== want) problems.push(`${tag}: end score ${pct}, expected ${want}`)
        quizzes++
        await page.locator('.quiz-end button:has-text("Done")').tap()
      } catch (e) {
        problems.push(`${tag}: ${e.message.split('\n')[0]}`)
        await page.screenshot({ path: `${DIR}/quiz-fail-${name}-${quizzes}-${k}.png` })
        await page.locator('text=← Back').first().tap().catch(() => {})
      }
      await page.waitForSelector('.unit-head', { timeout: 5000 })
      const h = page.locator('.unit-head').nth(u)
      if ((await h.getAttribute('aria-expanded')) !== 'true') await h.tap()
    }
  }
  // a tap on the wrong string says which string to use (the away-mode "find F on the low E string" question)
  if (name === 'guitar' || name === 'tenor') {
    await page.locator('.unit-head').first().tap().catch(() => {})
  }
  await browser.close()
  return { name, quizzes, questions, problems, errors }
}

;(async () => {
  const names = process.argv[2] ? [process.argv[2]] : Object.keys(SETUPS)
  const results = await Promise.all(names.map(run))
  let bad = 0
  for (const r of results) {
    console.log(`${r.name}: ${r.quizzes} quizzes, ${r.questions} questions answered on screen`)
    for (const p of r.problems) { console.log('  PROBLEM', p); bad++ }
    if (r.errors.length) { console.log('  PAGE ERRORS', r.errors); bad++ }
  }
  console.log(bad ? `${bad} problems` : 'all quizzes work by tapping')
  process.exit(bad ? 1 : 0)
})()
