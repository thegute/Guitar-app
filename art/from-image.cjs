// Make the app icon, splash screens and web icons from a picture (e.g. an illustration you generated).
//   node art/from-image.cjs <picture> [focusX focusY zoom]
// focusX/focusY: the point to centre the icon on, as fractions of the picture (default 0.5 0.4 = middle, a bit high);
// zoom: how tightly the icon crops around it (1 = the largest square that fits; 1.6 = closer in).
// Writes: Android launcher icons (adaptive: the picture is the background layer, the foreground is left empty),
// splash screens (the whole picture on dark, plus the round splash_icon Android 12+ shows), public/icon-512.png, icon-192.png, favicon.png, and art/preview/*.
const path = require('path')
const fs = require('fs')
const { chromium } = require(path.join(__dirname, '../tests/browser/node_modules/playwright'))
const ROOT = path.join(__dirname, '..')
const RES = path.join(ROOT, 'android/app/src/main/res')
const [src, fx = '0.5', fy = '0.4', zm = '1'] = process.argv.slice(2)
if (!src) { console.log('usage: node art/from-image.cjs <picture> [focusX focusY zoom]'); process.exit(1) }
const data = fs.readFileSync(src)
const mime = /\.png$/i.test(src) ? 'image/png' : /\.webp$/i.test(src) ? 'image/webp' : 'image/jpeg'
const url = `data:${mime};base64,${data.toString('base64')}`
const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
const SPLASH = {
  'drawable': [480, 320], 'drawable-land-mdpi': [480, 320], 'drawable-land-hdpi': [800, 480], 'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960], 'drawable-land-xxxhdpi': [1920, 1280], 'drawable-port-mdpi': [320, 480], 'drawable-port-hdpi': [480, 800],
  'drawable-port-xhdpi': [720, 1280], 'drawable-port-xxhdpi': [960, 1600], 'drawable-port-xxxhdpi': [1280, 1920],
}

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
  const page = await browser.newPage()
  // picture size
  await page.setContent(`<img id="i" src="${url}">`)
  const { w, h } = await page.evaluate(() => new Promise(r => { const i = document.getElementById('i'); const done = () => r({ w: i.naturalWidth, h: i.naturalHeight }); i.complete ? done() : (i.onload = done) }))
  const side = Math.min(w, h) / Number(zm)
  let x0 = Number(fx) * w - side / 2, y0 = Number(fy) * h - side / 2
  x0 = Math.max(0, Math.min(w - side, x0)); y0 = Math.max(0, Math.min(h - side, y0))
  /** a square crop of the picture drawn at `size` px; `inset` > 1 zooms out (for the adaptive 108dp canvas) */
  const square = (size, radius = '0', inset = 1) => {
    const scale = size / side / inset
    const off = (size - side * scale) / 2
    return `<div style="width:${size}px;height:${size}px;border-radius:${radius};overflow:hidden;position:relative;background:#120e17">
      <img src="${url}" style="position:absolute;left:${off - x0 * scale}px;top:${off - y0 * scale}px;width:${w * scale}px;height:${h * scale}px"></div>`
  }
  async function shot(html, W, H, out, transparent = false) {
    await page.setViewportSize({ width: W, height: H })
    await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${html}</body></html>`)
    await page.waitForFunction(() => [...document.images].every(i => i.complete))
    fs.mkdirSync(path.dirname(out), { recursive: true })
    await page.screenshot({ path: out, omitBackground: transparent, clip: { x: 0, y: 0, width: W, height: H } })
  }
  /** like shot() but saves a WebP (much smaller than PNG for a detailed picture; Android reads it from API 18) */
  async function shotWebp(html, W, H, out, transparent = false) {
    const png = path.join(__dirname, 'preview', '.tmp.png')
    await shot(html, W, H, png, transparent)
    const b64 = fs.readFileSync(png).toString('base64')
    const webp = await page.evaluate(async ([src, w, h]) => {
      const img = new Image(); img.src = src; await img.decode()
      const c = document.createElement('canvas'); c.width = w; c.height = h
      c.getContext('2d').drawImage(img, 0, 0)
      return c.toDataURL('image/webp', 0.84).split(',')[1]
    }, [`data:image/png;base64,${b64}`, W, H])
    fs.unlinkSync(png)
    // one resource name per folder: drop an older PNG of the same name
    const old = out.replace(/\.webp$/, '.png')
    if (fs.existsSync(old)) fs.unlinkSync(old)
    fs.writeFileSync(out, Buffer.from(webp, 'base64'))
  }
  for (const [d, k] of Object.entries(DENS)) {
    const s = Math.round(48 * k), f = Math.round(108 * k)
    // adaptive icon: the launcher shows the middle 72 of 108, so the 108 canvas is the crop zoomed out by 1.5
    await shot(square(f, '0', 1.5), f, f, `${RES}/mipmap-${d}/ic_launcher_background.png`)
    await shot(`<div style="width:${f}px;height:${f}px"></div>`, f, f, `${RES}/mipmap-${d}/ic_launcher_foreground.png`, true)
    await shot(square(s, '22%'), s, s, `${RES}/mipmap-${d}/ic_launcher.png`, true)
    await shot(square(s, '50%'), s, s, `${RES}/mipmap-${d}/ic_launcher_round.png`, true)
  }
  // Android 12+ launch screen: the icon crop as a circle, 192 dp inside a 288 dp transparent canvas
  for (const [d, k] of Object.entries(DENS)) {
    const c = Math.round(288 * k), r = Math.round(192 * k)
    await shotWebp(`<div style="width:${c}px;height:${c}px;display:grid;place-items:center">${square(r, '50%')}</div>`, c, c, `${RES}/drawable-${d}/splash_icon.webp`, true)
  }
  for (const [dir, [W, H]] of Object.entries(SPLASH)) {
    await shotWebp(`<div style="width:${W}px;height:${H}px;background:#120e17 url('${url}') center/contain no-repeat"></div>`, W, H, `${RES}/${dir}/splash.webp`)
  }
  for (const [name, s] of [['icon-512.png', 512], ['icon-192.png', 192], ['favicon.png', 64]]) {
    await shot(square(s, '22%'), s, s, path.join(ROOT, 'public', name), true)
  }
  // previews + a copy of the full picture for in-app use
  const out = path.join(__dirname, 'preview')
  await shot(square(512), 512, 512, `${out}/full-512.png`)
  // what a launcher really shows: the middle 72/108 of the adaptive background, cut to its shape
  const masked = (r, s) => `<div style="width:${s}px;height:${s}px;border-radius:${r};overflow:hidden;position:relative"><div style="position:absolute;left:${-s / 4}px;top:${-s / 4}px">${square(s * 1.5, '0', 1.5)}</div></div>`
  await shot(`<div style="display:flex;gap:24px;padding:24px;background:#3a3f4a;align-items:center">${masked('50%', 192)}${masked('32%', 192)}${masked('50%', 96)}${masked('22%', 48)}</div>`, 640, 240, `${out}/homescreen.png`)
  // the full picture for in-app use (welcome screen, guide), 1000 px wide so the app stays small
  const AW = 1000, AH = Math.round(h * AW / w)
  await page.setViewportSize({ width: AW, height: AH })
  await page.setContent(`<!doctype html><html><body style="margin:0"><img src="${url}" style="display:block;width:${AW}px;height:${AH}px"></body></html>`)
  await page.waitForFunction(() => [...document.images].every(i => i.complete))
  await page.screenshot({ path: path.join(ROOT, 'public', 'art.jpg'), type: 'jpeg', quality: 86, clip: { x: 0, y: 0, width: AW, height: AH } })
  await browser.close()
  console.log(`picture ${w}x${h}, icon crop ${Math.round(side)}px at (${Math.round(x0)}, ${Math.round(y0)})`)
})()
