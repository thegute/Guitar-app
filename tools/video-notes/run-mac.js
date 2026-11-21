// Course video notes, run on the Mac with nothing installed (macOS's own JavaScript for Automation + curl).
// The same job as run.mjs: Gemini watches each course video (jobs.json) and writes notes against its lesson.
// Resumable: notes already in notes.json are skipped. The key never leaves gemini-key.txt except in the request header.
//   cd ~/Documents/KGuitar/tools/video-notes && caffeinate -i osascript -l JavaScript run-mac.js ~/Documents/KGuitar
// Options after the folder: --model gemini-2.5-flash  --only c5-  --retry-failed
ObjC.import('Foundation')
const app = Application.currentApplication()
app.includeStandardAdditions = true

const readText = p => { const s = $.NSString.stringWithContentsOfFileEncodingError(p, $.NSUTF8StringEncoding, null); return s.isNil() ? null : s.js }
const writeText = (p, t) => $(t).writeToFileAtomicallyEncodingError(p, true, $.NSUTF8StringEncoding, null)
const exists = p => $.NSFileManager.defaultManager.fileExistsAtPath(p)
const q = s => `'${String(s).replace(/'/g, `'\\''`)}'`
const sh = cmd => app.doShellScript(cmd)

function run(argv) {
  const folder = (argv.find(a => !a.startsWith('--')) || '.').replace(/^~/, $.NSHomeDirectory().js)
  const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
  const MODELS = [opt('--model', 'gemini-2.5-flash'), 'gemini-flash-latest', 'gemini-2.5-flash-lite']
  const only = opt('--only', '')
  const retryFailed = argv.includes('--retry-failed')
  const here = $.NSFileManager.defaultManager.currentDirectoryPath.js

  const keyFile = `${folder}/gemini-key.txt`
  if (!exists(keyFile)) return `No gemini-key.txt in ${folder}. Put your Gemini key in it (one line) and run again.`
  const out = `${folder}/video-notes`
  sh(`mkdir -p ${q(out)}`)
  const notesFile = `${out}/notes.json`, logFile = `${out}/log.txt`, tmp = `${out}/.tmp`
  sh(`mkdir -p ${q(tmp)}`)
  const log = m => { const line = `${new Date().toISOString()} ${m}`; console.log(line); sh(`printf '%s\\n' ${q(line)} >> ${q(logFile)}`) }
  const jobs = JSON.parse(readText(`${here}/jobs.json`)).jobs
  const state = exists(notesFile) ? JSON.parse(readText(notesFile)) : { notes: {}, failed: {} }
  const save = () => writeText(notesFile, JSON.stringify(state, null, 1))

  const parse = text => {
    const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
    const a = t.indexOf('{'), b = t.lastIndexOf('}')
    if (a < 0 || b <= a) return null
    try { return JSON.parse(t.slice(a, b + 1)) } catch (e) { return null }
  }
  const watch = (job, model) => {
    const body = {
      contents: [{ role: 'user', parts: [{ file_data: { file_uri: `https://www.youtube.com/watch?v=${job.id}` } }, { text: job.prompt }] }],
      generationConfig: { maxOutputTokens: 8000, responseMimeType: 'application/json', temperature: 0.2 },
    }
    writeText(`${tmp}/body.json`, JSON.stringify(body))
    let code = '0'
    try {
      code = sh(`curl -s --max-time 360 -o ${q(tmp + '/resp.json')} -w '%{http_code}' -H 'content-type: application/json' -H "x-goog-api-key: $(tr -d ' \\n\\r' < ${q(keyFile)})" --data @${q(tmp + '/body.json')} ${q(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`)}`)
    } catch (e) { return { status: 0, error: String(e) } }
    const status = Number(code)
    const raw = readText(`${tmp}/resp.json`) || ''
    let data = {}
    try { data = JSON.parse(raw) } catch (e) { /* not JSON */ }
    if (status !== 200) return { status, error: raw.slice(0, 500) }
    const c = data.candidates && data.candidates[0]
    const text = c && c.content && c.content.parts ? c.content.parts.map(p => p.text || '').join('') : ''
    return { status, text, usage: data.usageMetadata }
  }

  const todo = jobs.filter(j => (!only || j.lessonId.indexOf(only) === 0) && !state.notes[j.key] && (retryFailed || !state.failed[j.key]))
  log(`${todo.length} videos to watch (${Object.keys(state.notes).length} done already, ${jobs.length} in the course)`)
  let mi = 0, limitHits = 0
  for (const job of todo) {
    let retried = false
    for (;;) {
      const model = MODELS[mi]
      log(`watching ${job.id} for ${job.lessonId} (${job.where}) with ${model}: ${job.title}`)
      const r = watch(job, model)
      if (r.status === 200) {
        const note = parse(r.text)
        const rec = Object.assign({}, job, { prompt: undefined, note, model, tokens: r.usage ? r.usage.promptTokenCount : null, at: new Date().toISOString() })
        if (!note) rec.raw = r.text.slice(0, 8000)
        state.notes[job.key] = rec
        delete state.failed[job.key]; save(); limitHits = 0
        log(`  done${note ? `: fit ${note.fit}/5, ${(note.parts || []).length} parts` : ' (answer was not JSON, kept as text)'}${r.usage ? `, ${r.usage.promptTokenCount} tokens` : ''}`)
        delay(20)
        break
      }
      const err = r.error || ''
      if (r.status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(err)) {
        if (limitHits++ < 2) { log('  free limit hit: waiting 70 s and trying again'); delay(70); continue }
        log('STOPPED: Google\'s free limit is used up for now (about 8 hours of YouTube video a day). Run the same command again later or tomorrow; it carries on.')
        save(); return 'Stopped at the free limit.'
      }
      if (r.status === 404 && mi < MODELS.length - 1) { log(`  no model ${model}: trying ${MODELS[mi + 1]}`); mi++; continue }
      if ((r.status === 400 || r.status === 403) && /API key|API_KEY/i.test(err)) { log('STOPPED: Google didn\'t accept the key in gemini-key.txt.'); return 'Key not accepted.' }
      if ((r.status >= 500 || r.status === 0) && !retried) { retried = true; log(`  error ${r.status}, trying once more in 30 s`); delay(30); continue }
      state.failed[job.key] = `${r.status} ${err}`; save()
      log(`  FAILED (${r.status}): ${err.slice(0, 200)}`)
      break
    }
  }
  log(`finished: ${Object.keys(state.notes).length} notes, ${Object.keys(state.failed).length} failed`)
  return 'Done.'
}
