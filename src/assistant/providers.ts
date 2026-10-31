// The AI behind the assistant (and "tab from a screenshot"). Free ones first: Google Gemini (AI Studio free tier,
// can read pictures), Groq and OpenRouter's free models. Claude and ChatGPT keys work too but cost money.
// Keys are kept on this phone only, under "kgx:" so backups (which copy kg:* settings) never include them.
import { Capacitor, CapacitorHttp } from '@capacitor/core'

export type ProviderId = 'gemini' | 'groq' | 'openrouter' | 'claude' | 'openai'
export interface ProviderInfo { id: ProviderId; label: string; free: boolean; pictures: boolean; keyUrl: string; keyHint: string; model: string }
export const PROVIDERS: ProviderInfo[] = [
  { id: 'gemini', label: 'Google Gemini', free: true, pictures: true, keyUrl: 'https://aistudio.google.com/apikey', keyHint: 'Free: sign in with Google at AI Studio and tap "Create API key". No card needed.', model: 'gemini-flash-latest' },
  { id: 'groq', label: 'Groq', free: true, pictures: true, keyUrl: 'https://console.groq.com/keys', keyHint: 'Free: make an account at Groq and create a key. Very fast.', model: 'llama-3.3-70b-versatile' },
  { id: 'openrouter', label: 'OpenRouter (free models)', free: true, pictures: false, keyUrl: 'https://openrouter.ai/keys', keyHint: 'Free models only (about 50 questions a day). Make an account and create a key.', model: 'meta-llama/llama-3.3-70b-instruct:free' },
  { id: 'claude', label: 'Claude (paid)', free: false, pictures: true, keyUrl: 'https://console.anthropic.com/settings/keys', keyHint: 'Costs money per question: needs a paid API account, separate from a Claude subscription.', model: 'claude-haiku-5-5' },
  { id: 'openai', label: 'ChatGPT (paid)', free: false, pictures: true, keyUrl: 'https://platform.openai.com/api-keys', keyHint: 'Costs money per question: needs a paid API account, separate from a ChatGPT subscription.', model: 'gpt-4o-mini' },
]
const VISION: Partial<Record<ProviderId, string>> = { groq: 'meta-llama/llama-4-scout-17b-16e-instruct' }

export interface AiSettings { provider: ProviderId | null; keys: Partial<Record<ProviderId, string>>; models: Partial<Record<ProviderId, string>> }
const KEY = 'kgx:ai'
export function aiSettings(): AiSettings {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as AiSettings | null; if (v) return { provider: v.provider ?? null, keys: v.keys ?? {}, models: v.models ?? {} } } catch { /* fall through */ }
  return { provider: null, keys: {}, models: {} }
}
export function saveAiSettings(v: AiSettings) {
  try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* storage full */ }
  listeners.forEach(f => f())
}
const listeners = new Set<() => void>()
export function onAiChange(f: () => void) { listeners.add(f); return () => { listeners.delete(f) } }
/** The provider to use: the chosen one if it has a key, else the first free one with a key. */
export function activeProvider(v = aiSettings(), needPictures = false): ProviderInfo | null {
  const ok = (p: ProviderInfo) => !!v.keys[p.id] && (!needPictures || p.pictures)
  const chosen = PROVIDERS.find(p => p.id === v.provider)
  if (chosen && ok(chosen)) return chosen
  return PROVIDERS.find(ok) ?? null
}

class Timeout extends Error {}
let streamBroken = false
export async function post(url: string, headers: Record<string, string>, body: unknown, timeoutMs = 30000): Promise<{ status: number; data: unknown }> {
  if (Capacitor.isNativePlatform()) {
    const call = CapacitorHttp.request({ url, method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, data: body, readTimeout: timeoutMs, connectTimeout: 10000 })
    const r = await Promise.race([call, new Promise<never>((_, no) => setTimeout(() => no(new Timeout()), timeoutMs + 2000))])
    return { status: r.status, data: typeof r.data === 'string' ? safeJson(r.data) : r.data }
  }
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), timeoutMs)
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: ac.signal })
    return { status: r.status, data: safeJson(await r.text()) }
  } catch (e) {
    if (ac.signal.aborted) throw new Timeout()
    throw e
  } finally { clearTimeout(t) }
}
async function get(url: string, headers: Record<string, string>): Promise<{ status: number; data: unknown }> {
  if (Capacitor.isNativePlatform()) {
    const r = await CapacitorHttp.request({ url, method: 'GET', headers })
    return { status: r.status, data: typeof r.data === 'string' ? safeJson(r.data) : r.data }
  }
  const r = await fetch(url, { headers })
  return { status: r.status, data: safeJson(await r.text()) }
}
function safeJson(t: string): unknown { try { return JSON.parse(t) } catch { return t } }

/** Gemini, streamed: the words arrive as they're written (server-sent events), so the answer shows sooner. Uses the
 *  web view's own fetch (Google allows it from apps and browsers). `onText` gets the whole text so far. */
async function geminiStream(url: string, body: unknown, timeoutMs: number, onText: (t: string) => void): Promise<{ status: number; data: unknown; text?: string }> {
  const ac = new AbortController()
  let t = setTimeout(() => ac.abort(), timeoutMs)
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ac.signal })
    if (!r.ok || !r.body) return { status: r.status, data: safeJson(await r.text()) }
    const reader = r.body.getReader()
    const dec = new TextDecoder()
    let buf = '', full = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      // still getting words: keep the line open a while longer
      clearTimeout(t); t = setTimeout(() => ac.abort(), timeoutMs)
      buf += dec.decode(value, { stream: true })
      let k: number
      while ((k = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, k).trim()
        buf = buf.slice(k + 1)
        if (!line.startsWith('data:')) continue
        const d = safeJson(line.slice(5).trim()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] }
        const add = d?.candidates?.[0]?.content?.parts?.filter(x => !x.thought).map(x => x.text ?? '').join('') ?? ''
        if (add) { full += add; onText(full) }
      }
    }
    return { status: 200, data: null, text: full }
  } catch (e) {
    if (ac.signal.aborted) throw new Timeout()
    throw e
  } finally { clearTimeout(t) }
}

/** Gemini's "thinking" before it answers: 2.5 Flash can switch it off (fastest); Gemini 3 and newer (and the
 *  "-latest" names, which point at the newest model) take a level, and "low" keeps chat quick (their default,
 *  "high", is slow). A model that refuses the setting is remembered and asked without it from then on. */
// Least thinking each model accepts: Gemini 3+ Flash takes "minimal" (fastest), others "low"; if a model refuses a
// level it steps down (minimal → low → none) and remembers it for the rest of the session.
const thinkStep = new Map<string, number>()
const LEVELS = ['minimal', 'low']
function geminiThinking(model: string): Record<string, unknown> {
  if (/gemini-2\.5-flash/.test(model)) return thinkStep.get(model) ? {} : { thinkingConfig: { thinkingBudget: 0 } }
  const m = /gemini-(\d+)/.exec(model)
  if (!((m && Number(m[1]) >= 3) || /-latest$/.test(model))) return {}
  const start = /flash/.test(model) ? 0 : 1
  const i = start + (thinkStep.get(model) ?? 0)
  return i < LEVELS.length ? { thinkingConfig: { thinkingLevel: LEVELS[i] } } : {}
}
const stepDown = (model: string) => thinkStep.set(model, (thinkStep.get(model) ?? 0) + 1)
const refusesThinking = (r: { status: number; data: unknown }) => r.status === 400 && /thinking/i.test(JSON.stringify(r.data ?? ''))

// The Gemini models this key can use (saved when the key is checked), so the backups are ones that exist.
const MODELS_KEY = 'kgx:aiModels'
export function savedModels(id: ProviderId): string[] { try { return (JSON.parse(localStorage.getItem(MODELS_KEY) ?? '{}') as Record<string, string[]>)[id] ?? [] } catch { return [] } }
function saveModels(id: ProviderId, ms: string[]) { try { const all = JSON.parse(localStorage.getItem(MODELS_KEY) ?? '{}') as Record<string, string[]>; all[id] = ms; localStorage.setItem(MODELS_KEY, JSON.stringify(all)) } catch { /* storage */ } }
/** Version number in a Gemini model name (gemini-3.1-flash → 3.1), 0 if none */
const ver = (m: string) => Number(/gemini-(\d+(?:\.\d+)?)/.exec(m)?.[1] ?? 0)
/** Chat-capable Flash models, newest first (not image, speech, live, embedding or old "exp" ones). */
export function flashModels(list: string[]): string[] {
  return list.filter(m => /flash/.test(m) && !/image|tts|audio|live|embed|exp|thinking|8b|vision/.test(m))
    .sort((a, b) => ver(b) - ver(a) || Number(/preview/.test(a)) - Number(/preview/.test(b)) || Number(/lite/.test(a)) - Number(/lite/.test(b)))
}
/** Which Gemini models to try, in order: your choice, then the newest Flash ones this key has, then Google's
 *  "latest" names (always point at a current model). Never the same one twice. */
export function geminiOrder(first: string, list = savedModels('gemini')): string[] {
  const fl = flashModels(list)
  const full = fl.filter(m => !/lite/.test(m)), lite = fl.filter(m => /lite/.test(m))
  return [...new Set([first, ...full.slice(0, 2), 'gemini-flash-latest', ...lite.slice(0, 1), 'gemini-flash-lite-latest'])]
}

export interface Msg { role: 'user' | 'assistant'; text: string; image?: { mime: string; b64: string } }
/** `retry`: worth trying again or with another model (busy, overloaded, timed out) */
export class AiError extends Error { constructor(m: string, public retry = false) { super(m) } }

function why(status: number, data: unknown, p: ProviderInfo): string {
  const raw = JSON.stringify(data ?? '').slice(0, 300)
  if (status === 401 || status === 403 || /API key not valid|invalid.*key|Incorrect API key/i.test(raw)) return `${p.label} didn't accept the key. Check it in Settings → You → AI helper.`
  if (status === 429 || /quota|rate/i.test(raw)) return `${p.label}'s free limit is used up for now. Try again later, or add another free key (Groq or OpenRouter) as a backup.`
  if (status === 402 || /credit|billing/i.test(raw)) return `${p.label} says the account has no credit.`
  if (status === 503 || status === 500 || status === 504 || status === 529 || /overloaded|UNAVAILABLE/i.test(raw)) return `${p.label}'s servers are busy right now (error ${status}).`
  if (status === 404) return `${p.label} has no model by that name (error 404): pick one from the list in Settings → You → AI helper.`
  return `${p.label} didn't answer (error ${status}).`
}
const busy = (status: number) => status === 500 || status === 502 || status === 503 || status === 504 || status === 529

/** Ask the AI. `system` sets the job; the last message can carry a picture. Fast by design: the first model gets a
 *  few seconds, and if it hasn't answered by then the next one is asked too, at the same time; whichever answers
 *  first wins. A model that's busy, missing or over its free limit is skipped at once. After about 30 seconds the
 *  built-in helper answers instead. */
export async function ask(system: string, msgs: Msg[], o: { pictures?: boolean; json?: boolean; maxTokens?: number; onText?: (soFar: string) => void } = {}): Promise<string> {
  const v = aiSettings()
  const p = activeProvider(v, !!o.pictures)
  if (!p) throw new AiError(o.pictures ? 'Reading pictures needs a free Google Gemini or Groq key: add one in Settings → You → AI helper.' : 'No AI key yet: add a free one in Settings → You → AI helper.')
  const hasImage = msgs.some(m => m.image)
  const known = p.id === 'gemini' ? savedModels('gemini') : []
  // learn which Gemini models this key has (for the backups), without making this question wait
  if (p.id === 'gemini' && !known.length) void listModels('gemini', v.keys.gemini!)
  const first = (hasImage && VISION[p.id]) || v.models[p.id] || (p.id === 'gemini' && workedModel) || p.model
  const own = (p.id === 'gemini' && !hasImage ? geminiOrder(first, known) : [first]).map(model => ({ p, model }))
  const others: { p: ProviderInfo; model: string }[] = []
  for (const q of PROVIDERS) if (q.id !== p.id && v.keys[q.id] && (q.free || q.id === v.provider) && (!o.pictures || q.pictures)) others.push({ p: q, model: (hasImage && VISION[q.id]) || v.models[q.id] || q.model })
  // your choice first; the backup asked alongside it is another service if you have one (it isn't busy when Google
  // is), then the other Gemini models. Ones that just failed wait at the back for 10 minutes.
  const tries = [own[0], ...others, ...own.slice(1)].filter(Boolean)
  tries.sort((a, b) => Number(cooling(a.model)) - Number(cooling(b.model)))
  const deadline = Date.now() + (hasImage ? 90000 : 30000)
  const hedgeMs = hasImage ? 20000 : 6000
  lastTries = []
  return new Promise<string>((resolve, reject) => {
    let done = false, next = 0, running = 0, leader = -1
    let last: AiError | null = null
    const timers: number[] = []
    const finish = (f: () => void) => { if (done) return; done = true; timers.forEach(clearTimeout); f() }
    const giveUp = () => finish(() => reject(last ?? new AiError(`${p.label} took too long to answer.`, true)))
    const launch = () => {
      if (done) return
      const left = deadline - Date.now()
      if (next >= tries.length || left < 3000) { if (!running) giveUp(); return }
      const i = next++, t = tries[i], t0 = Date.now()
      running++
      // only the first model that starts writing shows its words
      const onText = o.onText ? (soFar: string) => { if (leader < 0) leader = i; if (leader === i && !done) o.onText!(soFar) } : undefined
      askOnce(t.p, t.model, v.keys[t.p.id]!, system, msgs, { ...o, onText }, Math.min(hasImage ? 60000 : 25000, left)).then(text => {
        running--
        lastTries.push(`${t.model}: answered in ${((Date.now() - t0) / 1000).toFixed(1)} s`)
        if (t.p.id === 'gemini' && i > 0) { workedModel = t.model; try { localStorage.setItem('kgx:aiWorked', t.model) } catch { /* storage */ } }
        finish(() => resolve(text))
      }, e => {
        running--
        last = e instanceof AiError ? e : new AiError(`Couldn't reach ${t.p.label}. Check the internet connection.`)
        lastTries.push(`${t.model}: ${last.message} (${((Date.now() - t0) / 1000).toFixed(1)} s)`)
        if (last.retry) coolUntil.set(t.model, Date.now() + 10 * 60000)
        if (leader === i) leader = -1
        if (done) return
        if (!last.retry) { if (!running) giveUp(); return }
        launch()
      })
      // still nothing after a few seconds: ask the next one too (at most two at a time)
      timers.push(window.setTimeout(() => { if (!done && running < 2 && leader < 0) launch() }, hedgeMs))
    }
    timers.push(window.setTimeout(giveUp, deadline - Date.now()))
    launch()
  })
}
/** A backup Gemini model that answered when your chosen one didn't: asked first for the rest of the session. */
const coolUntil = new Map<string, number>()
const cooling = (m: string) => (coolUntil.get(m) ?? 0) > Date.now()
export let workedModel: string | null = (() => { try { return localStorage.getItem('kgx:aiWorked') } catch { return null } })()
/** What happened on the last question: each model tried, how long it took and how it ended (shown under answers
 *  that fell back to the built-in helper). */
export let lastTries: string[] = []

async function askOnce(p: ProviderInfo, model: string, key: string, system: string, msgs: Msg[], o: { json?: boolean; maxTokens?: number; onText?: (soFar: string) => void }, timeoutMs: number): Promise<string> {
  const max = o.maxTokens ?? 2048
  const began = Date.now()
  const fail = (r: { status: number; data: unknown }) => new AiError(why(r.status, r.data, p), busy(r.status) || r.status === 404 || (p.id === 'gemini' && r.status === 429))
  let r: { status: number; data: unknown }
  try {
    if (p.id === 'gemini') {
      const body = {
        systemInstruction: { parts: [{ text: system }] },
        contents: msgs.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [...(m.image ? [{ inline_data: { mime_type: m.image.mime, data: m.image.b64 } }] : []), { text: m.text }] })),
        generationConfig: { maxOutputTokens: max, ...(o.json ? { responseMimeType: 'application/json' } : {}) } as Record<string, unknown>,
      }
      const base = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`
      const withThinking = () => ({ ...body, generationConfig: { ...body.generationConfig, ...geminiThinking(model) } })
      // stream the words when someone is watching them arrive; if streaming doesn't work on this phone, ask the
      // normal way (and don't try streaming again this session)
      // On the phone, Gemini goes through the app's own connection (the one that's proven to reach Google there);
      // word-by-word streaming is used in the web version only.
      if (o.onText && !streamBroken && !Capacitor.isNativePlatform() && !msgs.some(m => m.image)) {
        let st: { status: number; data: unknown; text?: string } | null = null
        try { st = await geminiStream(`${base}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`, withThinking(), timeoutMs, o.onText) }
        catch (e) { streamBroken = true; if (e instanceof Timeout) throw e }
        if (st && refusesThinking(st)) { stepDown(model); st = null }
        if (st) {
          if (st.status >= 300) throw fail(st)
          if (!st.text?.trim()) throw new AiError(`${p.label} sent an empty answer.`, true)
          return st.text
        }
      }
      r = await post(`${base}:generateContent?key=${encodeURIComponent(key)}`, {}, withThinking(), timeoutMs)
      // a model that doesn't take this thinking setting: ask again with its own default (and remember)
      for (let k = 0; k < 2 && refusesThinking(r); k++) { stepDown(model); r = await post(`${base}:generateContent?key=${encodeURIComponent(key)}`, {}, withThinking(), timeoutMs) }
      if (r.status >= 300) throw fail(r)
      const d = r.data as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
      const text = d.candidates?.[0]?.content?.parts?.map(x => x.text ?? '').join('') ?? ''
      if (!text.trim()) throw new AiError(`${p.label} sent an empty answer.`, true)
      return text
    }
    if (p.id === 'claude') {
      r = await post('https://api.anthropic.com/v1/messages', { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, {
        model, max_tokens: max, system,
        messages: msgs.map(m => ({ role: m.role, content: [...(m.image ? [{ type: 'image', source: { type: 'base64', media_type: m.image.mime, data: m.image.b64 } }] : []), { type: 'text', text: m.text }] })),
      }, timeoutMs)
      if (r.status >= 300) throw fail(r)
      const d = r.data as { content?: { type: string; text?: string }[] }
      return d.content?.filter(c => c.type === 'text').map(c => c.text).join('') ?? ''
    }
    const url = p.id === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' : p.id === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions'
    r = await post(url, { Authorization: `Bearer ${key}`, ...(p.id === 'openrouter' ? { 'X-Title': 'KGuitar' } : {}) }, {
      model, max_tokens: max, ...(o.json ? { response_format: { type: 'json_object' } } : {}),
      messages: [{ role: 'system', content: system }, ...msgs.map(m => ({ role: m.role, content: m.image ? [{ type: 'text', text: m.text }, { type: 'image_url', image_url: { url: `data:${m.image.mime};base64,${m.image.b64}` } }] : m.text }))],
    }, timeoutMs)
    if (r.status >= 300) throw fail(r)
    const d = r.data as { choices?: { message?: { content?: string } }[] }
    return d.choices?.[0]?.message?.content ?? ''
  } catch (e) {
    if (e instanceof AiError) throw e
    if (e instanceof Timeout || Date.now() - began >= timeoutMs - 1000) throw new AiError(`${p.label} took too long to answer.`, true)
    throw new AiError(`Couldn't reach ${p.label}. Check the internet connection.`, true)
  }
}

/** The models a key can use (for the model picker). Free-only for OpenRouter. */
export async function listModels(id: ProviderId, key: string): Promise<string[]> {
  try {
    if (id === 'gemini') {
      const r = await get(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`, {})
      const d = r.data as { models?: { name: string; supportedGenerationMethods?: string[] }[] }
      const ms = (d.models ?? []).filter(m => m.supportedGenerationMethods?.includes('generateContent') && /gemini/.test(m.name)).map(m => m.name.replace(/^models\//, ''))
      if (ms.length) saveModels('gemini', ms)
      return ms
    }
    if (id === 'claude') {
      const r = await get('https://api.anthropic.com/v1/models', { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' })
      return ((r.data as { data?: { id: string }[] }).data ?? []).map(m => m.id)
    }
    const url = id === 'groq' ? 'https://api.groq.com/openai/v1/models' : id === 'openrouter' ? 'https://openrouter.ai/api/v1/models' : 'https://api.openai.com/v1/models'
    const r = await get(url, id === 'openrouter' ? {} : { Authorization: `Bearer ${key}` })
    const ids = ((r.data as { data?: { id: string }[] }).data ?? []).map(m => m.id)
    return id === 'openrouter' ? ids.filter(x => x.endsWith(':free')) : id === 'openai' ? ids.filter(x => /^gpt-|^o\d/.test(x)) : ids
  } catch { return [] }
}

/** Settings → AI helper → Test: ask one Gemini model a tiny question (streamed or not) and time it. */
export async function tryGemini(model: string, stream: boolean): Promise<{ ok: boolean; secs: number; note: string }> {
  const key = aiSettings().keys.gemini
  if (!key) return { ok: false, secs: 0, note: 'no Gemini key' }
  const p = PROVIDERS[0]
  const t0 = Date.now()
  let firstWord = 0
  try {
    const text = await askOnce(p, model, key, 'You are a test. Reply with the single word OK.', [{ role: 'user', text: 'Test' }], { maxTokens: 20, ...(stream ? { onText: () => { if (!firstWord) firstWord = Date.now() } } : {}) }, 20000)
    const secs = (Date.now() - t0) / 1000
    return { ok: true, secs, note: `answered in ${secs.toFixed(1)} s${stream && firstWord ? ` (first words after ${((firstWord - t0) / 1000).toFixed(1)} s)` : ''}: “${text.trim().slice(0, 20)}”` }
  } catch (e) {
    const secs = (Date.now() - t0) / 1000
    return { ok: false, secs, note: `${e instanceof Error ? e.message : 'failed'} (${secs.toFixed(1)} s)` }
  }
}
/** Was streaming switched off this session because the phone couldn't do it? */
export const streamingWorks = () => !streamBroken

/** The newest Gemini speech model this key has (for Gemini's voice), newest Flash first. */
export function ttsModel(): string {
  const tts = savedModels('gemini').filter(m => /tts/.test(m)).sort((a, b) => ver(b) - ver(a) || Number(/pro/.test(a)) - Number(/pro/.test(b)))
  return tts[0] ?? 'gemini-2.5-flash-preview-tts'
}
