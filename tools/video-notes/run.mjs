#!/usr/bin/env node
// Course video notes on the Mac: Gemini watches each course video (it opens YouTube links itself) and writes notes against
// the lesson it sits in. Plain Node 18+, no packages. Resumable: notes already in notes.json are skipped.
//   node run.mjs <folder with gemini-key.txt> [--model gemini-2.5-flash] [--only c5-] [--retry-failed]
// Writes <folder>/video-notes/notes.json and log.txt. Google's free tier allows about 8 hours of YouTube video a day:
// when the limit is hit it stops with a message; run it again later (tomorrow) and it carries on.
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const folder = args.find(a => !a.startsWith('--')) ?? process.cwd()
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const MODELS = [opt('--model', 'gemini-2.5-flash'), 'gemini-flash-latest', 'gemini-2.5-flash-lite']
const only = opt('--only', '')
const retryFailed = args.includes('--retry-failed')

const key = readFileSync(join(folder, 'gemini-key.txt'), 'utf8').trim()
if (!/^[A-Za-z0-9_-]{20,}$/.test(key)) { console.error('gemini-key.txt doesn\'t look like a Gemini key (it should be one line, starting AIza…).'); process.exit(1) }
const out = join(folder, 'video-notes'); mkdirSync(out, { recursive: true })
const notesFile = join(out, 'notes.json'), logFile = join(out, 'log.txt')
const log = m => { const line = `${new Date().toISOString()} ${m}`; console.log(line); appendFileSync(logFile, line + '\n') }
const { jobs } = JSON.parse(readFileSync(join(here, 'jobs.json'), 'utf8'))
const state = existsSync(notesFile) ? JSON.parse(readFileSync(notesFile, 'utf8')) : { notes: {}, failed: {} }
const save = () => writeFileSync(notesFile, JSON.stringify(state, null, 1))
const sleep = ms => new Promise(r => setTimeout(r, ms))

function parse(text) {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  const a = t.indexOf('{'), b = t.lastIndexOf('}')
  if (a < 0 || b <= a) return null
  try { return JSON.parse(t.slice(a, b + 1)) } catch { return null }
}

async function watch(job, model) {
  const body = {
    contents: [{ role: 'user', parts: [{ file_data: { file_uri: `https://www.youtube.com/watch?v=${job.id}` } }, { text: job.prompt }] }],
    generationConfig: { maxOutputTokens: 8000, responseMimeType: 'application/json', temperature: 0.2 },
  }
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 360000)
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) return { status: r.status, error: JSON.stringify(data).slice(0, 500) }
    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? ''
    return { status: 200, text, usage: data.usageMetadata }
  } catch (e) { return { status: 0, error: String(e) } } finally { clearTimeout(t) }
}

const todo = jobs.filter(j => (!only || j.lessonId.startsWith(only)) && !state.notes[j.key] && (retryFailed || !state.failed[j.key]))
log(`${todo.length} videos to watch (${Object.keys(state.notes).length} done already, ${jobs.length} in the course)`)
let mi = 0, limitHits = 0
for (const job of todo) {
  for (;;) {
    const model = MODELS[mi]
    log(`watching ${job.id} for ${job.lessonId} (${job.where}) with ${model}: ${job.title}`)
    const r = await watch(job, model)
    if (r.status === 200) {
      const note = parse(r.text)
      state.notes[job.key] = { ...job, prompt: undefined, note, ...(note ? {} : { raw: r.text.slice(0, 8000) }), model, tokens: r.usage?.promptTokenCount, at: new Date().toISOString() }
      delete state.failed[job.key]; save(); limitHits = 0
      log(`  done${note ? `: fit ${note.fit}/5, ${note.parts?.length ?? 0} parts` : ' (answer was not JSON, kept as text)'}${r.usage ? `, ${r.usage.promptTokenCount} tokens` : ''}`)
      await sleep(20000)
      break
    }
    if (r.status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(r.error ?? '')) {
      if (limitHits++ < 2) { log('  free limit hit: waiting 70 s and trying again'); await sleep(70000); continue }
      log('STOPPED: Google\'s free limit is used up for now (about 8 hours of YouTube video a day). Run again later or tomorrow; it carries on.'); save(); process.exit(2)
    }
    if (r.status === 404 && mi < MODELS.length - 1) { log(`  no model ${model}: trying ${MODELS[mi + 1]}`); mi++; continue }
    if (r.status === 400 && /API key/i.test(r.error ?? '')) { log('STOPPED: Google didn\'t accept the key in gemini-key.txt.'); process.exit(1) }
    if ((r.status >= 500 || r.status === 0) && !job._retried) { job._retried = true; log(`  error ${r.status}, trying once more in 30 s`); await sleep(30000); continue }
    state.failed[job.key] = `${r.status} ${r.error}`; save()
    log(`  FAILED (${r.status}): ${(r.error ?? '').slice(0, 200)}`)
    break
  }
}
log(`finished: ${Object.keys(state.notes).length} notes, ${Object.keys(state.failed).length} failed`)
