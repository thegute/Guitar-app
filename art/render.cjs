// Render the icon SVGs to every PNG the Android app, splash screens and web version need.
// node art/render.cjs [--preview]   (needs Playwright; run art/icon.py first)
const path = require('path')
const fs = require('fs')
const { chromium } = require(path.join(__dirname, '../tests/browser/node_modules/playwright'))
const ROOT = path.join(__dirname, '..')
const RES = path.join(ROOT, 'android/app/src/main/res')
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8')

const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
const SPLASH = {
  'drawable': [480, 320], 'drawable-land-mdpi': [480, 320], 'drawable-land-hdpi': [800, 480], 'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960], 'drawable-land-xxxhdpi': [1920, 1280], 'drawable-port-mdpi': [320, 480], 'drawable-port-hdpi': [480, 800],
  'drawable-port-xhdpi': [720, 1280], 'drawable-port-xxhdpi': [960, 1600], 'drawable-port-xxxhdpi': [1280, 1920],
}

async function shot(page, html, w, h, out, transparent = false) {
  await page.setViewportSize({ width: w, height: h })
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${html}</body></html>`)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  await page.screenshot({ path: out, omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: h } })
}
const img = (svg, size, extra = '') => svg.replace(/width="1024" height="1024"/, `width="${size}" height="${size}" style="display:block;${extra}"`)

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
  const page = await browser.newPage()
  const bg = read('icon-background.svg'), fg = read('icon-foreground.svg'), full = read('icon-full.svg')
  if (process.argv.includes('--preview')) {
    const out = path.join(__dirname, 'preview')
    await shot(page, img(full, 512), 512, 512, `${out}/full-512.png`)
    // how it looks on a home screen: circle and squircle masks, small sizes
    const masked = (r, s) => `<div style="width:${s}px;height:${s}px;border-radius:${r};overflow:hidden;position:relative">${img(bg, s * 1.5, `position:absolute;left:${-s / 4}px;top:${-s / 4}px`)}${img(fg, s * 1.5, `position:absolute;left:${-s / 4}px;top:${-s / 4}px`)}</div>`
    const row = `<div style="display:flex;gap:24px;padding:24px;background:#3a3f4a;align-items:center">${masked('50%', 192)}${masked('32%', 192)}${masked('50%', 96)}${masked('22%', 48)}</div>`
    await shot(page, row, 640, 240, `${out}/homescreen.png`)
    await browser.close()
    return
  }
  for (const [d, k] of Object.entries(DENS)) {
    const s = Math.round(48 * k), f = Math.round(108 * k)
    await shot(page, img(fg, f), f, f, `${RES}/mipmap-${d}/ic_launcher_foreground.png`, true)
    await shot(page, img(bg, f), f, f, `${RES}/mipmap-${d}/ic_launcher_background.png`)
    await shot(page, `<div style="width:${s}px;height:${s}px;border-radius:${s * 0.22}px;overflow:hidden">${img(full, s)}</div>`, s, s, `${RES}/mipmap-${d}/ic_launcher.png`, true)
    await shot(page, `<div style="width:${s}px;height:${s}px;border-radius:50%;overflow:hidden">${img(full, s)}</div>`, s, s, `${RES}/mipmap-${d}/ic_launcher_round.png`, true)
  }
  for (const [dir, [w, h]] of Object.entries(SPLASH)) {
    const s = Math.round(Math.min(w, h) * 0.42)
    await shot(page, `<div style="width:${w}px;height:${h}px;background:#120e17;display:grid;place-items:center"><div style="width:${s}px;height:${s}px;border-radius:${s * 0.22}px;overflow:hidden">${img(full, s)}</div></div>`, w, h, `${RES}/${dir}/splash.png`)
  }
  for (const [name, s] of [['icon-512.png', 512], ['icon-192.png', 192], ['favicon.png', 64]]) {
    await shot(page, `<div style="width:${s}px;height:${s}px;border-radius:${s * 0.22}px;overflow:hidden">${img(full, s)}</div>`, s, s, path.join(ROOT, 'public', name), true)
  }
  await browser.close()
  console.log('rendered launcher icons, splash screens and web icons')
})()
