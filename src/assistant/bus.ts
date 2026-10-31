// Lets any screen open the assistant with a question (the beat maker's ✨ Ideas, a lesson's "Ask about this").
export type AskContext = 'beat' | 'play' | 'learn' | 'jam' | 'general'
export interface AskRequest { text: string; context: AskContext; send?: boolean }
const listeners = new Set<(r: AskRequest) => void>()
let pending: AskRequest | null = null
/** Open the assistant with `text`; `send` asks it straight away instead of leaving it in the box. */
export function askAssistant(text: string, context: AskContext = 'general', send = true) {
  const r = { text, context, send }
  if (listeners.size) listeners.forEach(f => f(r))
  else pending = r
}
export function onAsk(f: (r: AskRequest) => void) {
  listeners.add(f)
  if (pending) { const p = pending; pending = null; f(p) }
  return () => { listeners.delete(f) }
}
