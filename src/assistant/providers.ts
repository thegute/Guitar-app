// The AI behind the assistant (and "tab from a screenshot"). Free ones first: Google Gemini (AI Studio free tier,
// can read pictures), Groq and OpenRouter's free models. Claude and ChatGPT keys work too but cost money.
// Keys are kept on this phone only, under "kgx:" so backups (which copy kg:* settings) never include them.
import { Capacitor, CapacitorHttp } from '@capacitor/core'

export type ProviderId = 'gemini' | 'groq' | 'openrouter' | 'claude' | 'openai'
export interface ProviderInfo { id: ProviderId; label: string; free: boolean; pictures: boolean; keyUrl: string; keyHint: string; model: string }
export const PROVIDERS: ProviderInfo[] = [
  { id: 'gemini', label: 'Google Gemini', free: true, pictures: true, keyUrl: 'https://aistudio.google.com/apikey', keyHint: 'Free: sign in with Google at AI Studio and tap "Create API key". No card needed.', model: 'gemini-2.5-flash' },
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

/** Gemini's "thinking" before it answers: 2.5 Flash can switch it off (fastest); Gemini 3 and newer take a level,
 *  and "low" keeps chat quick (their default, "high", is slow). Other models keep their own setting. */
function geminiThinking(model: string): Record<string, unknown> {
  if (/gemini-2\.5-flash/.test(model)) return { thinkingConfig: { thinkingBudget: 0 } }
  const m = /gemini-(\d+)/.exec(model)
  if (m && Number(m[1]) >= 3) return { thinkingConfig: { thinkingLevel: 'low' } }
  return {}
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
  return `${p.label} didn't answer (error ${status}).`
}
const busy = (status: number) => status === 500 || status === 502 || status === 503 || status === 504 || status === 529
/** Gemini models to fall back to, fastest first, when the chosen one is busy */
const GEMINI_BACKUP = ['gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-flash-latest']
const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Ask the AI. `system` sets the job; the last message can carry a picture. If the AI is busy (Google's free servers
 *  often are), it tries once more, then a lighter model, then your other free key, before giving up. */
export async function ask(system: string, msgs: Msg[], o: { pictures?: boolean; json?: boolean; maxTokens?: number; onText?: (soFar: string) => void } = {}): Promise<string> {
  const v = aiSettings()
  const p = activeProvider(v, !!o.pictures)
  if (!p) throw new AiError(o.pictures ? 'Reading pictures needs a free Google Gemini or Groq key: add one in Settings → You → AI helper.' : 'No AI key yet: add a free one in Settings → You → AI helper.')
  const hasImage = msgs.some(m => m.image)
  const first = (hasImage && VISION[p.id]) || v.models[p.id] || p.model
  const tries: { p: ProviderInfo; model: string }[] = [{ p, model: first }, { p, model: first }]
  if (p.id === 'gemini' && !hasImage) for (const m of GEMINI_BACKUP) if (m !== first) tries.push({ p, model: m })
  for (const q of PROVIDERS) if (q.id !== p.id && v.keys[q.id] && (q.free || q.id === v.provider) && (!o.pictures || q.pictures)) tries.push({ p: q, model: (hasImage && VISION[q.id]) || v.models[q.id] || q.model })
  const started = Date.now()
  let last: AiError | null = null
  for (let i = 0; i < tries.length; i++) {
    // give up after about 45 seconds in all: the built-in helper answers instead
    if (i > 0 && Date.now() - started > 45000) break
    if (i === 1) await wait(1200)
    try {
      return await askOnce(tries[i].p, tries[i].model, v.keys[tries[i].p.id]!, system, msgs, o, hasImage ? 60000 : 25000)
    } catch (e) {
      last = e instanceof AiError ? e : new AiError(`Couldn't reach ${tries[i].p.label}. Check the internet connection.`)
      if (!last.retry) break
    }
  }
  throw last ?? new AiError('The AI helper didn\'t answer.')
}

async function askOnce(p: ProviderInfo, model: string, key: string, system: string, msgs: Msg[], o: { json?: boolean; maxTokens?: number; onText?: (soFar: string) => void }, timeoutMs: number): Promise<string> {
  const max = o.maxTokens ?? 2048
  const fail = (r: { status: number; data: unknown }) => new AiError(why(r.status, r.data, p), busy(r.status) || r.status === 404)
  let r: { status: number; data: unknown }
  try {
    if (p.id === 'gemini') {
      const body = {
        systemInstruction: { parts: [{ text: system }] },
        contents: msgs.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [...(m.image ? [{ inline_data: { mime_type: m.image.mime, data: m.image.b64 } }] : []), { text: m.text }] })),
        generationConfig: { maxOutputTokens: max, ...geminiThinking(model), ...(o.json ? { responseMimeType: 'application/json' } : {}) },
      }
      const base = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`
      // stream the words when someone is watching them arrive; if streaming can't connect, ask the normal way
      if (o.onText && !msgs.some(m => m.image)) {
        let st: { status: number; data: unknown; text?: string } | null = null
        try { st = await geminiStream(`${base}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`, body, timeoutMs, o.onText) } catch (e) { if (e instanceof Timeout) throw e }
        if (st) {
          if (st.status >= 300) throw fail(st)
          if (!st.text?.trim()) throw new AiError(`${p.label} sent an empty answer.`, true)
          return st.text
        }
      }
      r = await post(`${base}:generateContent?key=${encodeURIComponent(key)}`, {}, body, timeoutMs)
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
    if (e instanceof Timeout) throw new AiError(`${p.label} took too long to answer.`, true)
    throw new AiError(`Couldn't reach ${p.label}. Check the internet connection.`)
  }
}

/** The models a key can use (for the model picker). Free-only for OpenRouter. */
export async function listModels(id: ProviderId, key: string): Promise<string[]> {
  try {
    if (id === 'gemini') {
      const r = await get(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`, {})
      const d = r.data as { models?: { name: string; supportedGenerationMethods?: string[] }[] }
      return (d.models ?? []).filter(m => m.supportedGenerationMethods?.includes('generateContent') && /gemini/.test(m.name)).map(m => m.name.replace(/^models\//, ''))
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
