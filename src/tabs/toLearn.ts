// Saved for later (Songs → Add a song → Save for later; listed in Songs → Library): a song name or a video to come back
// to, with Find a tab / Scan it when you're ready. Kept on this phone (kg:toLearn).
export interface ToLearn { id: string; title: string; youtube?: string; at: number }
const KEY = 'kg:toLearn'
const listeners = new Set<() => void>()
export const onToLearn = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } }
export function toLearnList(): ToLearn[] { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as ToLearn[] } catch { return [] } }
function put(l: ToLearn[]) { try { localStorage.setItem(KEY, JSON.stringify(l)) } catch { /* full */ } listeners.forEach(f => f()) }
export function saveForLater(x: { title: string; youtube?: string }) {
  const l = toLearnList().filter(e => !(x.youtube ? e.youtube === x.youtube : e.title.toLowerCase() === x.title.toLowerCase()))
  put([{ id: `tl${Date.now().toString(36)}`, title: x.title, youtube: x.youtube, at: Date.now() }, ...l].slice(0, 200))
}
export function removeToLearn(id: string) { put(toLearnList().filter(e => e.id !== id)) }
