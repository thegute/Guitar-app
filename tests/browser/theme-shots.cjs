// Screenshots of key screens in day and night themes.
const { chromium } = require('playwright')
const path = require('path')
const DIR = path.join(__dirname, 'out')
;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined })
  for (const theme of ['day', 'night']) {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.addInitScript(t => localStorage.setItem('kg:theme', JSON.stringify(t)), theme)
    await page.addInitScript(() => { try { localStorage.setItem('kg:welcomed', '1'); localStorage.setItem('kg:psyDefault', '1') } catch { /* video iframe */ } })
    await page.goto('http://localhost:4173/')
    await page.waitForSelector('.tab-note')
    await page.click('.view-switch >> text=Both').catch(() => {})
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${DIR}/theme-${theme}-play.png` })
    for (const tab of (process.argv[2] || 'Jam,Chords').split(',')) {
      await page.click(`nav >> text=${tab}`)
      await page.waitForTimeout(400)
      await page.screenshot({ path: `${DIR}/theme-${theme}-${tab.toLowerCase()}.png` })
    }
    console.log(theme, errors)
    await ctx.close()
  }
  await browser.close()
})()
