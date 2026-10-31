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

async function post(url: string, headers: Record<string, string>, body: unknown): Promise<{ status: number; data: unknown }> {
  if (Capacitor.isNativePlatform()) {
    const r = await CapacitorHttp.request({ url, method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, data: body, readTimeout: 90000, connectTimeout: 15000 })
    return { status: r.status, data: typeof r.data === 'string' ? safeJson(r.data) : r.data }
  }
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })
  return { status: r.status, data: safeJson(await r.text()) }
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

export interface Msg { role: 'user' | 'assistant'; text: string; image?: { mime: string; b64: string } }
export class AiError extends Error {}

function why(status: number, data: unknown, p: ProviderInfo): string {
  const raw = JSON.stringify(data ?? '').slice(0, 300)
  if (status === 401 || status === 403 || /API key not valid|invalid.*key|Incorrect API key/i.test(raw)) return `${p.label} didn't accept the key. Check it in Settings → You → AI helper.`
  if (status === 429 || /quota|rate/i.test(raw)) return `${p.label}'s free limit is used up for now. Try again later, or add another free key (Groq or OpenRouter) as a backup.`
  if (status === 402 || /credit|billing/i.test(raw)) return `${p.label} says the account has no credit.`
  return `${p.label} didn't answer (error ${status}).`
}

/** Ask the AI. `system` sets the job; the last message can carry a picture. */
export async function ask(system: string, msgs: Msg[], o: { pictures?: boolean; json?: boolean; maxTokens?: number } = {}): Promise<string> {
  const v = aiSettings()
  const p = activeProvider(v, !!o.pictures)
  if (!p) throw new AiError(o.pictures ? 'Reading pictures needs a free Google Gemini or Groq key: add one in Settings → You → AI helper.' : 'No AI key yet: add a free one in Settings → You → AI helper.')
  const key = v.keys[p.id]!
  const hasImage = msgs.some(m => m.image)
  const model = (hasImage && VISION[p.id]) || v.models[p.id] || p.model
  const max = o.maxTokens ?? 2048
  let r: { status: number; data: unknown }
  try {
    if (p.id === 'gemini') {
      r = await post(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {}, {
        systemInstruction: { parts: [{ text: system }] },
        contents: msgs.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [...(m.image ? [{ inline_data: { mime_type: m.image.mime, data: m.image.b64 } }] : []), { text: m.text }] })),
        generationConfig: { maxOutputTokens: max, ...(o.json ? { responseMimeType: 'application/json' } : {}) },
      })
      if (r.status >= 300) throw new AiError(why(r.status, r.data, p))
      const d = r.data as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
      return d.candidates?.[0]?.content?.parts?.map(x => x.text ?? '').join('') ?? ''
    }
    if (p.id === 'claude') {
      r = await post('https://api.anthropic.com/v1/messages', { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, {
        model, max_tokens: max, system,
        messages: msgs.map(m => ({ role: m.role, content: [...(m.image ? [{ type: 'image', source: { type: 'base64', media_type: m.image.mime, data: m.image.b64 } }] : []), { type: 'text', text: m.text }] })),
      })
      if (r.status >= 300) throw new AiError(why(r.status, r.data, p))
      const d = r.data as { content?: { type: string; text?: string }[] }
      return d.content?.filter(c => c.type === 'text').map(c => c.text).join('') ?? ''
    }
    const url = p.id === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' : p.id === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions'
    r = await post(url, { Authorization: `Bearer ${key}`, ...(p.id === 'openrouter' ? { 'X-Title': 'KGuitar' } : {}) }, {
      model, max_tokens: max, ...(o.json ? { response_format: { type: 'json_object' } } : {}),
      messages: [{ role: 'system', content: system }, ...msgs.map(m => ({ role: m.role, content: m.image ? [{ type: 'text', text: m.text }, { type: 'image_url', image_url: { url: `data:${m.image.mime};base64,${m.image.b64}` } }] : m.text }))],
    })
    if (r.status >= 300) throw new AiError(why(r.status, r.data, p))
    const d = r.data as { choices?: { message?: { content?: string } }[] }
    return d.choices?.[0]?.message?.content ?? ''
  } catch (e) {
    if (e instanceof AiError) throw e
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
