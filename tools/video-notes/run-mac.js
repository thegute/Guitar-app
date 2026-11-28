// Course video notes, run on the Mac with nothing installed (macOS's own JavaScript for Automation + curl).
// The same job as run.mjs: Gemini watches each course video (jobs.json) and writes notes against its lesson.
// Resumable: notes already in notes.json are skipped. The key never leaves gemini-key.txt except in the request header.
//   cd ~/Documents/KGuitar/tools/video-notes && caffeinate -i osascript -l JavaScript run-mac.js ~/Documents/KGuitar
// Options after the folder: --model gemini-2.5-flash  --only c5-  --retry-failed
// Creator mode: --videos <file> (one video per line: a YouTube link or id, optionally a tab and its title) matches each
// video against the whole course instead, saving video-notes/match-<file name>.json.
// Paid-course mode: --paid <paid-jobs.json> (made by make-paid-jobs.py from his course maps; lives only on his Mac). Each video
// is read from his Google Drive folder KGuitar-Courses (Google Drive for Desktop; --root <folder> to point elsewhere), uploaded
// to Gemini's Files API for this one question, then deleted from Google straight away. Notes: video-notes/paid-courses.json.
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
  // --review: each line is a candidate video for a course lesson (id, title, seconds, lesson id, lesson title). Gemini judges
  // the teaching and writes down every drill with its times and the tab shown on screen, so Claude can pick the best videos
  // and build the lesson's practice from them.
  const review = argv.includes('--review')
  const paidArg = opt('--paid', '')
  const paidFile = paidArg ? paidArg.replace(/^~/, $.NSHomeDirectory().js) : ''
  const notesFile = paidFile ? `${out}/paid-courses.json` : videosFile ? `${out}/${review ? 'review' : 'match'}-${base}.json` : `${out}/notes.json`, logFile = `${out}/log.txt`, tmp = `${out}/.tmp`
  sh(`mkdir -p ${q(tmp)}`)
  const log = m => { const line = `${new Date().toISOString()} ${m}`; console.log(line); sh(`printf '%s\\n' ${q(line)} >> ${q(logFile)}`) }
  const reviewPrompt = (lessonTitle, course) => `You are helping a guitar teacher build a lesson called "${lessonTitle}" for a ${course || 'guitar technique'} course for one student: a late-beginner / early-intermediate guitarist (open chords, barre chords, minor pentatonic) who wants to get really good. The lesson will be built AROUND the best YouTube videos on the topic, using the drills the videos teach. Watch this video and judge it as a candidate.

Answer with ONE JSON object only, no other text:
{
 "videoTitle": "...", "teacher": "channel or person", "lengthSec": 0,
 "fit": 1-5 (how well it teaches exactly this lesson's topic),
 "teaching": 1-5 (clarity: explains WHY and HOW, shows the hands up close, slow demonstrations),
 "practice": 1-5 (gives concrete drills the student can practise, with tempos or steps),
 "level": "beginner" | "intermediate" | "advanced",
 "tabOnScreen": true/false,
 "summary": "2-3 sentences: what it teaches and how",
 "keyPoints": ["the technique points it stresses (hand position, motion, timing...)"],
 "mistakes": ["common mistakes it warns about"],
 "drills": [
  { "name": "short name", "from": "m:ss", "to": "m:ss", "what": "what to play and how to practise it (steps, tempo, repeats)",
    "tempo": "start/target BPM or speed advice if given, else null",
    "tab": "the exercise as ASCII guitar tab (6 lines e|B|G|D|A|E, standard tuning unless the video says otherwise) ONLY if a tab or the exact notes are clearly shown or played slowly enough to be sure; otherwise null",
    "tabSure": 1-5 }
 ],
 "bestPart": { "from": "m:ss", "to": "m:ss", "why": "the part a student should watch if they watch only one part" },
 "skip": "parts that are off-topic (ads, gear talk, intros) as m:ss-m:ss ranges, or null",
 "verdict": "one sentence: use it as the main video, a second video, only for one part, or skip it, and why"
}
Rules: every time must be a real time in this video. Never guess a tab: when you can't read or hear the exact notes, set "tab" to null. Copy tabs exactly as shown on screen.`
  const pack = JSON.parse(readText(`${here}/jobs.json`))
  let jobs = pack.jobs
  // paid courses: find the KGuitar-Courses folder in Google Drive, then each course's own folder in it
  let root = ''
  if (paidFile) {
    const p = readText(paidFile)
    if (!p) return `Couldn't read ${paidFile}.`
    const paid = JSON.parse(p)
    const home = $.NSHomeDirectory().js
    root = (opt('--root', '') || '').replace(/^~/, home)
    if (!root) {
      try { root = sh(`ls -d ${q(home + '/Library/CloudStorage')}/GoogleDrive-*/*/KGuitar-Courses 2>/dev/null | head -1`).trim() } catch (e) { root = '' }
    }
    if (!root) {
      try { root = sh(`find ${q(home + '/Library/CloudStorage')} -maxdepth 4 -type d -name KGuitar-Courses 2>/dev/null | head -1`).trim() } catch (e) { root = '' }
    }
    if (!root || !exists(root)) return 'No courses folder: couldn\'t find the KGuitar-Courses folder in Google Drive. Is Google Drive for Desktop running and signed in? (If the Mac asked whether Terminal may open Google Drive files, click Allow.)'
    let dirs = []
    try { dirs = sh(`ls -1 ${q(root)}`).split(/\r?\n|\r/).filter(Boolean) } catch (e) { dirs = [] }
    const missing = new Set()
    jobs = paid.jobs.map(j => {
      const dir = dirs.find(d => d.toLowerCase().indexOf(j.folderKey.toLowerCase()) >= 0)
      if (!dir) { missing.add(j.course); return null }
      return Object.assign({}, j, { where: 'paid', dir: `${root}/${dir}`, prompt: paid.prompt.replace('{COURSE}', j.course).replace('{INSTRUCTOR}', j.instructor).replace('{CHAPTER}', j.chapter || '').replace('{TITLE}', j.title) })
    }).filter(Boolean)
    if (missing.size) console.log(`No folder found in ${root} for: ${[...missing].join(', ')}`)
  }
  if (videosFile) {
    const text = readText(videosFile)
    if (!text) return `Couldn't read ${videosFile}.`
    jobs = text.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      const [first, ...rest] = l.split('\t')
      const m = /(?:v=|youtu\.be\/|shorts\/|^)([A-Za-z0-9_-]{11})(?:[^A-Za-z0-9_-]|$)/.exec(first)
      const secs = Number(rest[1]) || 0
      if (!m) return null
      const one = review
        ? { key: `review|${rest[2] || base}|${m[1]}`, id: m[1], title: rest[0] || m[1], secs, lessonId: rest[2] || base, where: 'review', prompt: reviewPrompt(rest[3] || rest[2] || '', rest[4] || '') }
        : { key: `match|${m[1]}`, id: m[1], title: rest[0] || m[1], secs, lessonId: base, where: 'creator', prompt: pack.matchPrompt }
      // longer than 50 minutes: watched in 40-minute parts (times in the answers stay times in the whole video)
      if (secs <= 3000) return [one]
      const parts = []
      for (let from = 0, k = 1; from < secs; from += 2400, k++) {
        const to = Math.min(secs, from + 2400)
        const mm = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
        parts.push(Object.assign({}, one, { key: `match|${m[1]}|${k}`, secs: to - from, from, to, prompt: one.prompt + `\n\nWatch only the part from ${mm(from)} to ${mm(to)} of this long video (part ${k}). Give every time as a time in the whole video.` }))
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
  // ---- paid-course videos: upload to Gemini's Files API (resumable), wait until it's ready, delete when the job is done
  const keyHdr = `-H "x-goog-api-key: $(tr -d ' \\n\\r' < ${q(keyFile)})"`
  const API = 'https://generativelanguage.googleapis.com'
  const MIME = { mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mpg: 'video/mpeg', mpeg: 'video/mpeg', avi: 'video/x-msvideo', wmv: 'video/x-ms-wmv', flv: 'video/x-flv', '3gp': 'video/3gpp' }
  const findVideo = job => {
    const p = `${job.dir}/${job.video}`
    if (exists(p)) return p
    // the folder inside the course may be named a little differently: look for the file by name
    const name = job.video.split('/').pop()
    try { const f = sh(`find ${q(job.dir)} -type f -name ${q(name)} 2>/dev/null | head -1`).trim(); if (f) return f } catch (e) { /* none */ }
    return ''
  }
  const upload = job => {
    const path = findVideo(job)
    if (!path) return { status: -1, error: `video file not found: ${job.video}` }
    const ext = (path.split('.').pop() || '').toLowerCase()
    const mime = MIME[ext]
    if (!mime) return { status: -1, error: `not a video Gemini reads: ${ext}` }
    let size = 0
    try { size = Number(sh(`stat -f%z ${q(path)}`).trim()) } catch (e) { size = 0 }
    if (!size) return { status: -1, error: `couldn't read the size of ${path}` }
    writeText(`${tmp}/meta.json`, JSON.stringify({ file: { display_name: `kg-${job.lessonId}` } }))
    const t0 = Date.now()
    let code
    try {
      code = sh(`curl -s --max-time 120 -D ${q(tmp + '/hdr.txt')} -o ${q(tmp + '/start.json')} -w '%{http_code}' ${keyHdr} -H 'X-Goog-Upload-Protocol: resumable' -H 'X-Goog-Upload-Command: start' -H 'X-Goog-Upload-Header-Content-Length: ${size}' -H 'X-Goog-Upload-Header-Content-Type: ${mime}' -H 'Content-Type: application/json' --data @${q(tmp + '/meta.json')} ${q(API + '/upload/v1beta/files')}`)
    } catch (e) { return { status: 0, error: String(e), fast: Date.now() - t0 < 20000 } }
    if (Number(code) !== 200) return { status: Number(code), error: (readText(`${tmp}/start.json`) || '').slice(0, 500) }
    const m = /x-goog-upload-url:\s*(\S+)/i.exec(readText(`${tmp}/hdr.txt`) || '')
    if (!m) return { status: -1, error: 'Google gave no upload address' }
    log(`  uploading ${(size / 1048576).toFixed(0)} MB from Google Drive...`)
    try {
      code = sh(`curl -s --max-time 5400 -o ${q(tmp + '/up.json')} -w '%{http_code}' -X POST -H 'Content-Length: ${size}' -H 'X-Goog-Upload-Offset: 0' -H 'X-Goog-Upload-Command: upload, finalize' -T ${q(path)} ${q(m[1])}`)
    } catch (e) { return { status: 0, error: String(e) } }
    let f = {}
    try { f = (JSON.parse(readText(`${tmp}/up.json`) || '{}').file) || {} } catch (e) { f = {} }
    if (Number(code) !== 200 || !f.name) return { status: Number(code) || -1, error: (readText(`${tmp}/up.json`) || '').slice(0, 500) }
    job.fileName = f.name; job.fileUri = f.uri; job.mime = mime
    // Google prepares the video before it can be watched
    for (let i = 0; i < 120 && f.state !== 'ACTIVE'; i++) {
      if (f.state === 'FAILED') return { status: -1, error: 'Google could not read this video file' }
      delay(10)
      try { sh(`curl -s --max-time 60 -o ${q(tmp + '/state.json')} ${keyHdr} ${q(API + '/v1beta/' + f.name)}`); f = JSON.parse(readText(`${tmp}/state.json`) || '{}') } catch (e) { /* try again */ }
    }
    if (f.state !== 'ACTIVE') return { status: -1, error: 'Google took too long to prepare the video' }
    const d = f.videoMetadata && /([\d.]+)s/.exec(f.videoMetadata.videoDuration || '')
    job.secs = d ? Math.round(Number(d[1])) : (job.secs || 0)
    return { status: 200 }
  }
  const drop = job => {
    if (!job.fileName) return
    try { sh(`curl -s --max-time 60 -X DELETE -o /dev/null ${keyHdr} ${q(API + '/v1beta/' + job.fileName)}`) } catch (e) { /* it expires by itself after 48 hours */ }
    delete job.fileName; delete job.fileUri
  }

  const watch = (job, model) => {
    if (job.where === 'paid' && !job.fileUri) { const u = upload(job); if (u.status !== 200) return u }
    const video = job.where === 'paid' ? { file_data: { mime_type: job.mime, file_uri: job.fileUri } } : { file_data: { file_uri: `https://www.youtube.com/watch?v=${job.id}` } }
    const body = {
      // creator videos can be an hour long: low resolution (and fewer frames for long ones) keeps them inside the free limits
      contents: [{ role: 'user', parts: [Object.assign(video, (job.secs > 1500 || job.from !== undefined) ? { video_metadata: Object.assign(job.secs > 1500 ? { fps: job.secs > 3000 ? 0.25 : 0.5 } : {}, job.from !== undefined ? { start_offset: `${job.from}s`, end_offset: `${job.to}s` } : {}) } : {}), { text: job.prompt }] }],
      generationConfig: Object.assign({ maxOutputTokens: (videosFile || paidFile) ? 24000 : 8000, responseMimeType: 'application/json', temperature: 0.2 }, (videosFile || paidFile) ? { mediaResolution: 'MEDIA_RESOLUTION_LOW' } : {}),
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
        log(`  done${note ? (paidFile ? `: ${(note.matches || []).length} matches, ${(note.drills || []).length} drills` : review ? `: fit ${note.fit}/5, teaching ${note.teaching}/5, ${(note.drills || []).length} drills` : videosFile ? `: ${(note.matches || []).length} matches` : `: fit ${note.fit}/5, ${(note.parts || []).length} parts`) : ' (answer was not JSON, kept as text)'}${r.usage ? `, ${r.usage.promptTokenCount} tokens` : ''}`)
        delay(20)
        break
      }
      const err = r.error || ''
      if ((r.status === 429 && /PerDay/i.test(err)) || ((r.status === 503 || /high demand|UNAVAILABLE/i.test(err)) && retried)) {
        if (mi < MODELS.length - 1) { log(`  ${model} is ${r.status === 429 ? 'used up for today' : 'busy'}: switching to ${MODELS[mi + 1]}`); mi++; retried = false; continue }
        log('STOPPED: every model\'s free allowance is used up for today. Run the same command again tomorrow; it carries on.')
        drop(job); save(); return 'Stopped at the free limit.'
      }
      if (r.status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(err)) {
        if (limitHits++ < 2) { log('  free limit hit: waiting 70 s and trying again'); delay(70); continue }
        log('STOPPED: Google\'s free limit is used up for now (about 8 hours of YouTube video a day). Run the same command again later or tomorrow; it carries on.')
        drop(job); save(); return 'Stopped at the free limit.'
      }
      if (r.status === 404 && mi < MODELS.length - 1) { log(`  no model ${model}: trying ${MODELS[mi + 1]}`); mi++; continue }
      if ((r.status === 400 || r.status === 403) && /API key|API_KEY/i.test(err)) { drop(job); log('STOPPED: Google didn\'t accept the key in gemini-key.txt.'); return 'Key not accepted.' }
      // no internet (the Mac's Wi-Fi asleep or down): wait for it instead of failing the whole list
      if (r.status === 0 && r.fast) {
        if (netWaits++ < 30) { log(`  no internet: waiting 2 minutes (${netWaits}/30)`); delay(120); continue }
        log('STOPPED: no internet for an hour. Check the Mac\'s Wi-Fi; it carries on when you run it again.')
        drop(job); save(); return 'Stopped: no internet.'
      }
      if ((r.status >= 500 || r.status === 0) && !retried) { retried = true; log(`  error ${r.status}, trying once more in 30 s`); delay(30); continue }
      if (r.status === 503 && mi < MODELS.length - 1) { log(`  ${model} still busy: switching to ${MODELS[mi + 1]}`); mi++; retried = false; continue }
      state.failed[job.key] = `${r.status} ${err}`; save()
      log(`  FAILED (${r.status}): ${err.slice(0, 200)}`)
      break
    }
    drop(job)
  }
  log(`finished: ${Object.keys(state.notes).length} notes, ${Object.keys(state.failed).length} failed`)
  return 'Done.'
}
