// Settings → You → AI helper: paste a free key (Gemini, Groq or OpenRouter), or a paid one, and pick which to use.
import { useEffect, useState } from 'react'
import { PROVIDERS, aiSettings, listModels, onAiChange, saveAiSettings, type ProviderId } from './providers'
import { GEMINI_VOICES, geminiVoice, setGeminiVoice, tryGeminiVoice } from './speak'

export function AiSetup({ compact = false }: { compact?: boolean }) {
  const [v, setV] = useState(aiSettings)
  useEffect(() => onAiChange(() => setV(aiSettings())), [])
  const [open, setOpen] = useState<ProviderId | null>(compact ? 'gemini' : null)
  const [draft, setDraft] = useState('')
  const [models, setModels] = useState<string[]>([])
  const [msg, setMsg] = useState('')
  const save = (id: ProviderId) => {
    const key = draft.trim()
    const next = { ...v, keys: { ...v.keys, [id]: key || undefined }, provider: key ? (v.provider && v.keys[v.provider] ? v.provider : id) : v.provider === id ? null : v.provider }
    if (!key) delete next.keys[id]
    saveAiSettings(next)
    setDraft('')
    setMsg(key ? 'Saved on this phone only. Checking the key…' : 'Key removed.')
    if (key) void listModels(id, key).then(ms => { setModels(ms); setMsg(ms.length ? `The key works: ${ms.length} models available.` : 'Saved. (Couldn\'t list the models, but the key may still work.)') })
  }
  return (
    <div className="stack ai-setup" style={{ gap: 8 }}>
      {!compact && <p className="small muted" style={{ margin: 0 }}>The assistant and "tab from a screenshot" use an AI service with your own key. The free ones cost nothing. Keys stay on this phone: they're never in backups or sent anywhere except to that service.</p>}
      {PROVIDERS.filter(p => !compact || p.free).map(p => {
        const has = !!v.keys[p.id]
        return (
          <div key={p.id} className="ai-prov">
            <div className="row" style={{ gap: 8, justifyContent: 'space-between' }}>
              <label className="row" style={{ gap: 6 }}>
                <input type="radio" name="aiprov" checked={v.provider === p.id} disabled={!has} onChange={() => saveAiSettings({ ...v, provider: p.id })} />
                <b>{p.label}</b>{p.free ? <span className="chip sm-chip free">Free</span> : <span className="chip sm-chip paid">Costs money</span>}
                {has && <span className="small muted">key saved</span>}
              </label>
              <button className="btn sm" onClick={() => { setOpen(open === p.id ? null : p.id); setDraft(''); setMsg(''); setModels([]) }}>{has ? 'Change' : 'Add key'}</button>
            </div>
            {open === p.id && (
              <div className="stack" style={{ gap: 6, marginTop: 6 }}>
                <p className="small" style={{ margin: 0 }}>{p.keyHint} <a href={p.keyUrl} target="_blank" rel="noreferrer">Get a key</a>, copy it, then paste it here.</p>
                <div className="row" style={{ gap: 6 }}>
                  <input className="input" type="password" autoComplete="off" placeholder="Paste the key" value={draft} onChange={e => setDraft(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                  <button className="btn primary sm" onClick={() => save(p.id)}>{draft.trim() ? 'Save' : has ? 'Remove key' : 'Save'}</button>
                </div>
                {models.length > 0 && (
                  <label className="field"><span>Model</span>
                    <select className="select" value={v.models[p.id] ?? p.model} onChange={e => saveAiSettings({ ...v, models: { ...v.models, [p.id]: e.target.value } })}>
                      {[...new Set([v.models[p.id] ?? p.model, ...models])].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </label>
                )}
                {msg && <p className="small" role="status" style={{ margin: 0 }}>{msg}</p>}
              </div>
            )}
          </div>
        )
      })}
      {!compact && v.keys.gemini && <GeminiVoice />}
    </div>
  )
}

/** Which voice reads Gemini's answers aloud. The built-in helper always uses the phone's own voice. */
function GeminiVoice() {
  const [voice, setVoice] = useState(geminiVoice)
  const [note, setNote] = useState('')
  const pick = (id: string) => { setVoice(id); setGeminiVoice(id); setNote('') }
  const test = async () => { setNote('Getting the voice…'); setNote(await tryGeminiVoice(voice) ? '' : 'Gemini\'s voice didn\'t come through just now (busy or offline). Try again in a moment.') }
  return (
    <div className="ai-prov stack" style={{ gap: 6 }}>
      <b>Gemini's voice</b>
      <span className="small muted">When Gemini answers and "Read answers aloud" is on, it speaks in this voice. The built-in helper keeps the phone's own voice, so you can tell them apart.</span>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        <select className="select" value={voice} onChange={e => pick(e.target.value)} aria-label="Gemini's voice">
          {GEMINI_VOICES.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
          <option value="phone">The phone's voice</option>
        </select>
        {voice !== 'phone' && <button className="btn sm" onClick={() => void test()}>▶ Hear it</button>}
      </div>
      {note && <span className="small" role="status">{note}</span>}
    </div>
  )
}
