// Course video notes, run on the Mac with nothing installed (macOS's own JavaScript for Automation + curl).
// The same job as run.mjs: Gemini watches each course video (jobs.json) and writes notes against its lesson.
// Resumable: notes already in notes.json are skipped. The key never leaves gemini-key.txt except in the request header.
//   cd ~/Documents/KGuitar/tools/video-notes && caffeinate -i osascript -l JavaScript run-mac.js ~/Documents/KGuitar
// Options after the folder: --model gemini-2.5-flash  --only c5-  --retry-failed
// Creator mode: --videos <file> (one video per line: a YouTube link or id, optionally a tab and its title) matches each
// video against the whole course instead, saving video-notes/match-<file name>.json.
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
  // each model has its own free allowance (about 20 videos a day): when one is used up, the next one carries on
  const MODELS = [...new Set([opt('--model', 'gemini-3-flash-preview'), 'gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite-preview', 'gemini-2.5-flash-lite'])]
  const only = opt('--only', '')
  const retryFailed = argv.includes('--retry-failed')
  const here = $.NSFileManager.defaultManager.currentDirectoryPath.js

  const keyFile = `${folder}/gemini-key.txt`
  if (!exists(keyFile)) return `No gemini-key.txt in ${folder}. Put your Gemini key in it (one line) and run again.`
  const out = `${folder}/video-notes`
  sh(`mkdir -p ${q(out)}`)
  const videosArg = opt('--videos', '')
  const videosFile = videosArg ? videosArg.replace(/^~/, $.NSHomeDirectory().js) : ''
  const base = videosFile ? videosFile.split('/').pop().replace(/\.[a-z]+$/i, '') : ''
  const notesFile = videosFile ? `${out}/match-${base}.json` : `${out}/notes.json`, logFile = `${out}/log.txt`, tmp = `${out}/.tmp`
  sh(`mkdir -p ${q(tmp)}`)
  const log = m => { const line = `${new Date().toISOString()} ${m}`; console.log(line); sh(`printf '%s\\n' ${q(line)} >> ${q(logFile)}`) }
  const pack = JSON.parse(readText(`${here}/jobs.json`))
  let jobs = pack.jobs
  if (videosFile) {
    const text = readText(videosFile)
    if (!text) return `Couldn't read ${videosFile}.`
    jobs = text.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      const [first, ...rest] = l.split('\t')
      const m = /(?:v=|youtu\.be\/|shorts\/|^)([A-Za-z0-9_-]{11})(?:[^A-Za-z0-9_-]|$)/.exec(first)
      const secs = Number(rest[1]) || 0
      if (!m) return null
      const one = { key: `match|${m[1]}`, id: m[1], title: rest[0] || m[1], secs, lessonId: base, where: 'creator', prompt: pack.matchPrompt }
      // longer than 50 minutes: watched in 40-minute parts (times in the answers stay times in the whole video)
      if (secs <= 3000) return [one]
      const parts = []
      for (let from = 0, k = 1; from < secs; from += 2400, k++) {
        const to = Math.min(secs, from + 2400)
        const mm = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
        parts.push(Object.assign({}, one, { key: `match|${m[1]}|${k}`, secs: to - from, from, to, prompt: pack.matchPrompt + `\n\nWatch only the part from ${mm(from)} to ${mm(to)} of this long video (part ${k}). Give every time as a time in the whole video.` }))
      }
      return parts
    }).filter(Boolean).reduce((a, b) => a.concat(b), [])
  }
  const state = exists(notesFile) ? JSON.parse(readText(notesFile)) : { notes: {}, failed: {} }
  const save = () => writeText(notesFile, JSON.stringify(state, null, 1))

  // the answer is one object, or sometimes a list of them (one per topic): a list is merged into one note
  const merge = list => {
    const objs = list.filter(o => o && typeof o === 'object')
    if (!objs.length) return null
    const out = Object.assign({}, objs[0])
    for (const k of ['matches', 'parts']) if (objs.some(o => Array.isArray(o[k]))) out[k] = objs.reduce((a, o) => a.concat(o[k] || []), [])
    const nc = objs.map(o => o.notCourse).filter(Boolean)
    if (nc.length > 1) out.notCourse = nc.join(' ')
    return out
  }
  const tryJSON = t => { try { const v = JSON.parse(t); return Array.isArray(v) ? merge(v) : v } catch (e) { return null } }
  const parse = text => {
    const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
    const whole = tryJSON(t)
    if (whole) return whole
    const a = t.indexOf('{'), b = t.lastIndexOf('}')
    if (a < 0 || b <= a) return null
    return tryJSON(t.slice(a, b + 1)) || tryJSON(`[${t.slice(a, b + 1)}]`)
  }
  const watch = (job, model) => {
    const body = {
      // creator videos can be an hour long: low resolution (and fewer frames for long ones) keeps them inside the free limits
      contents: [{ role: 'user', parts: [Object.assign({ file_data: { file_uri: `https://www.youtube.com/watch?v=${job.id}` } }, (job.secs > 1500 || job.from !== undefined) ? { video_metadata: Object.assign(job.secs > 1500 ? { fps: job.secs > 3000 ? 0.25 : 0.5 } : {}, job.from !== undefined ? { start_offset: `${job.from}s`, end_offset: `${job.to}s` } : {}) } : {}), { text: job.prompt }] }],
      generationConfig: Object.assign({ maxOutputTokens: videosFile ? 24000 : 8000, responseMimeType: 'application/json', temperature: 0.2 }, videosFile ? { mediaResolution: 'MEDIA_RESOLUTION_LOW' } : {}),
    }
    writeText(`${tmp}/body.json`, JSON.stringify(body))
    let code = '0'
    const t0 = Date.now()
    try {
      code = sh(`curl -s --max-time 360 -o ${q(tmp + '/resp.json')} -w '%{http_code}' -H 'content-type: application/json' -H "x-goog-api-key: $(tr -d ' \\n\\r' < ${q(keyFile)})" --data @${q(tmp + '/body.json')} ${q(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`)}`)
    } catch (e) { return { status: 0, error: String(e), fast: Date.now() - t0 < 20000 } }
    const status = Number(code)
    const raw = readText(`${tmp}/resp.json`) || ''
    let data = {}
    try { data = JSON.parse(raw) } catch (e) { /* not JSON */ }
    if (status !== 200) return { status, error: raw.slice(0, 500) }
    const c = data.candidates && data.candidates[0]
    const text = c && c.content && c.content.parts ? c.content.parts.map(p => p.text || '').join('') : ''
    return { status, text, usage: data.usageMetadata }
  }

  // answers kept as text are read again with the better reader first; only ones still unreadable are watched again
  let fixed = 0
  for (const k of Object.keys(state.notes)) { const r = state.notes[k]; if (!r.note && r.raw) { const n = parse(r.raw); if (n) { r.note = n; delete r.raw; fixed++ } } }
  if (fixed) { save(); log(`read ${fixed} earlier answer(s) again`) }
  // a video that failed only because the Mac was offline (status 0) is tried again
  let offline = 0
  for (const k of Object.keys(state.failed)) if (/^0 /.test(state.failed[k])) { delete state.failed[k]; offline++ }
  if (offline) { save(); log(`${offline} video(s) failed earlier with no internet: trying them again`) }
  const todo = jobs.filter(j => (!only || j.lessonId.indexOf(only) === 0) && !(state.notes[j.key] && state.notes[j.key].note) && (retryFailed || !state.failed[j.key]))
  log(`${todo.length} videos to watch (${Object.keys(state.notes).length} done already, ${jobs.length} in the course)`)
  let mi = 0, limitHits = 0, netWaits = 0
  for (const job of todo) {
    let retried = false
    for (;;) {
      const model = MODELS[mi]
      log(`watching ${job.id} for ${job.lessonId} (${job.where}) with ${model}: ${job.title}`)
      const r = watch(job, model)
      if (r.status === 200) {
        netWaits = 0
        const note = parse(r.text)
        const rec = Object.assign({}, job, { prompt: undefined, note, model, tokens: r.usage ? r.usage.promptTokenCount : null, at: new Date().toISOString() })
        if (!note) rec.raw = r.text.slice(0, 8000)
        state.notes[job.key] = rec
        delete state.failed[job.key]; save(); limitHits = 0
        log(`  done${note ? (videosFile ? `: ${(note.matches || []).length} matches` : `: fit ${note.fit}/5, ${(note.parts || []).length} parts`) : ' (answer was not JSON, kept as text)'}${r.usage ? `, ${r.usage.promptTokenCount} tokens` : ''}`)
        delay(20)
        break
      }
      const err = r.error || ''
      if ((r.status === 429 && /PerDay/i.test(err)) || ((r.status === 503 || /high demand|UNAVAILABLE/i.test(err)) && retried)) {
        if (mi < MODELS.length - 1) { log(`  ${model} is ${r.status === 429 ? 'used up for today' : 'busy'}: switching to ${MODELS[mi + 1]}`); mi++; retried = false; continue }
        log('STOPPED: every model\'s free allowance is used up for today. Run the same command again tomorrow; it carries on.')
        save(); return 'Stopped at the free limit.'
      }
      if (r.status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(err)) {
        if (limitHits++ < 2) { log('  free limit hit: waiting 70 s and trying again'); delay(70); continue }
        log('STOPPED: Google\'s free limit is used up for now (about 8 hours of YouTube video a day). Run the same command again later or tomorrow; it carries on.')
        save(); return 'Stopped at the free limit.'
      }
      if (r.status === 404 && mi < MODELS.length - 1) { log(`  no model ${model}: trying ${MODELS[mi + 1]}`); mi++; continue }
      if ((r.status === 400 || r.status === 403) && /API key|API_KEY/i.test(err)) { log('STOPPED: Google didn\'t accept the key in gemini-key.txt.'); return 'Key not accepted.' }
      // no internet (the Mac's Wi-Fi asleep or down): wait for it instead of failing the whole list
      if (r.status === 0 && r.fast) {
        if (netWaits++ < 30) { log(`  no internet: waiting 2 minutes (${netWaits}/30)`); delay(120); continue }
        log('STOPPED: no internet for an hour. Check the Mac\'s Wi-Fi; it carries on when you run it again.')
        save(); return 'Stopped: no internet.'
      }
      if ((r.status >= 500 || r.status === 0) && !retried) { retried = true; log(`  error ${r.status}, trying once more in 30 s`); delay(30); continue }
      if (r.status === 503 && mi < MODELS.length - 1) { log(`  ${model} still busy: switching to ${MODELS[mi + 1]}`); mi++; retried = false; continue }
      state.failed[job.key] = `${r.status} ${err}`; save()
      log(`  FAILED (${r.status}): ${err.slice(0, 200)}`)
      break
    }
  }
  log(`finished: ${Object.keys(state.notes).length} notes, ${Object.keys(state.failed).length} failed`)
  return 'Done.'
}
