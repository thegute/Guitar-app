// Screenshot an HTML file: node tools/shot.cjs in.html out.png [width]
const { chromium } = require('playwright')
;(async () => {
  const [, , inp, out, w] = process.argv
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined })
  const p = await b.newPage({ viewport: { width: Number(w) || 1300, height: 800 }, deviceScaleFactor: 1 })
  await p.goto('file://' + require('path').resolve(inp))
  await p.screenshot({ path: out, fullPage: true })
  await b.close()
})()
