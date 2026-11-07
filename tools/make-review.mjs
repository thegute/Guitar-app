// Builds the outside-review package (for Gemini or anyone): review/out/
//   KGuitar-review-guide.md   review/KGUITAR_REVIEW.md + the whole in-app manual (guide.ts) + CLAUDE.md + HANDOFF + change list + decisions
//   KGuitar-source-1/2/3.txt   every source file with its path: 1 app code, 2 content and looks, 3 Android + build + tools + tests
//   screens-*.jpg             contact sheets of the screens from the browser tests (run tests/browser/build14-test.cjs tour first)
//   KGuitar-review.zip        all of it in one file
// Usage: node tools/make-review.mjs   (or npm run review:pack)
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const out = path.join(root, 'review', 'out')
fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(out, { recursive: true })
const read = p => fs.readFileSync(path.join(root, p), 'utf8')
const sha = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim()
const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: root }).toString().trim()

// ---- the in-app manual, straight from guide.ts (bundled with esbuild so it's exactly what the app shows)
const tmp = path.join(root, 'node_modules', '.tmp')
fs.mkdirSync(tmp, { recursive: true })
execSync(`npx -y esbuild@0.25 src/learn/guide.ts --bundle --platform=node --format=esm --log-level=error --outfile=${tmp}/guide.mjs`, { cwd: root })
const { GUIDE } = await import(`${tmp}/guide.mjs?${Date.now()}`)
let manual = '\n\n---\n\n# Appendix A: every feature, in the app\'s own manual ("How to use KGuitar")\n\n'
for (const sec of GUIDE) {
  manual += `## ${sec.title}\n\n${sec.intro}\n\n`
  for (const it of sec.items) manual += `- **${it.title}**${it.phoneOnly ? ' (phone app only)' : ''}: ${it.text}${it.tip ? ` _Tip: ${it.tip}_` : ''}\n`
  manual += '\n'
}
const appendix = (title, p) => `\n\n---\n\n# ${title} (\`${p}\`)\n\n${read(p)}`
const guide = `> Package made from branch \`${branch}\` at commit \`${sha}\` on ${new Date().toISOString().slice(0, 10)}.\n\n` +
  read('review/KGUITAR_REVIEW.md') + manual +
  appendix('Appendix B: the developer brief', 'CLAUDE.md') +
  appendix('Appendix C: current state and work queue', 'notes/HANDOFF.md') +
  appendix('Appendix D: changes waiting for release', 'notes/next-build.md') +
  appendix('Appendix E: the owner\'s decisions on the blueprint', 'notes/blueprint-decisions.md')
fs.writeFileSync(path.join(out, 'KGuitar-review-guide.md'), guide)

// ---- the source, every text file the app is built from (no binaries, no big data)
const files = execSync('git ls-files', { cwd: root }).toString().split('\n').filter(Boolean).filter(f =>
  (/^(src|android\/app\/src\/main\/java|\.github|tools|tests)\//.test(f) || /^(package\.json|vite\.config\.ts|capacitor\.config\.ts|tsconfig[^/]*\.json|index\.html)$/.test(f)) &&
  /\.(ts|tsx|js|mjs|cjs|java|ya?ml|json|py|css|html)$/.test(f) && !/package-lock|\/fixtures\/|\.min\./.test(f))
// three parts by meaning: 1 how it works (app code), 2 content and looks (teaching text, songbook, licks, exercises, styles),
// 3 Android, build, tools and tests. Part 1 + the guide is the core review and fits one Gemini conversation.
const CONTENT = /^src\/(styles\.css|licks\/library\.ts|exercises\/catalog\.ts|tabs\/songbook\.ts|tabs\/examples\.ts|learn\/(lessons|lessonExtras|guide|techniques|zeroHero|path|course|quiz)\.ts|sessions\/recipes\.ts|search\/catalog\.ts)$/
const partOf = f => (f.startsWith('src/') ? (CONTENT.test(f) ? 1 : 0) : 2)
const NAMES = ['how it works: the app code', 'content and looks: lessons, songbook, licks, exercises, styles', 'Android plugins, build, tools and tests']
const parts = [[], [], []]
const index = []
for (const f of files.sort((a, b) => a.localeCompare(b))) {
  const text = fs.readFileSync(path.join(root, f), 'utf8')
  const k = partOf(f)
  parts[k].push(`\n\n===== FILE: ${f} (${text.split('\n').length} lines) =====\n${text}`)
  index.push(`${k + 1}  ${f}`)
}
parts.forEach((p, i) => {
  const head = `KGuitar source, part ${i + 1} of 3: ${NAMES[i]} (branch ${branch}, commit ${sha}). Each file starts with "===== FILE: path".\n` +
    (i === 0 ? `\nFile index for all three parts (part number, path):\n${index.sort().join('\n')}\n` : '')
  fs.writeFileSync(path.join(out, `KGuitar-source-${i + 1}.txt`), head + p.join(''))
})

// ---- screenshots as contact sheets (python + Pillow)
const shots = path.join(root, 'tests', 'browser', 'out')
if (fs.existsSync(shots)) {
  try {
    execSync(`python3 - <<'PY'
import glob, os
from PIL import Image, ImageDraw
shots = ${JSON.stringify(shots)}
out = ${JSON.stringify(out)}
sets = [('psy-cover', 'b14-psy-cover-*.png'), ('day-inner', 'b14-day-inner-*.png'), ('night-cover', 'b14-night-cover-*.png'), ('looper-game', 'lp-*-psy.png'), ('looper-game', 'game-*.png')]
groups = {}
for name, pat in sets: groups.setdefault(name, []).extend(sorted(glob.glob(os.path.join(shots, pat))))
for name, files in groups.items():
    files = files[:24]
    if not files: continue
    tw, th = 300, 560
    cols = 6
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * tw, rows * (th + 26)), (24, 20, 30))
    d = ImageDraw.Draw(sheet)
    for i, f in enumerate(files):
        im = Image.open(f).convert('RGB')
        im.thumbnail((tw, th))
        x, y = (i % cols) * tw, (i // cols) * (th + 26)
        sheet.paste(im, (x + (tw - im.width) // 2, y))
        d.text((x + 6, y + th + 6), os.path.basename(f).replace('b14-', '').replace('.png', '')[:40], fill=(230, 230, 230))
    sheet.save(os.path.join(out, f'screens-{name}.jpg'), quality=82)
PY`, { stdio: 'inherit' })
  } catch { console.log('(no contact sheets: Pillow missing?)') }
}

// ---- one zip
execSync(`cd ${out} && zip -q -9 KGuitar-review.zip *.md *.txt $(ls *.jpg 2>/dev/null)`)
for (const f of fs.readdirSync(out)) console.log(`${f}  ${(fs.statSync(path.join(out, f)).size / 1e6).toFixed(2)} MB`)
