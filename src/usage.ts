// What you use: quiet counts, kept only on this phone, of which screens, pages, Learn tools and buttons get opened.
// Nothing is sent anywhere. After a few weeks Settings → You → "What you use" shows the favourites and what's gone
// untouched, so the app can be trimmed to how it's really used.

const KEY = 'kg:usage'
const MAX = 900
/** id → [times, first day, last day] (days since 1970) */
type Store = { since: number; c: Record<string, [number, number, number]> }

const today = () => Math.floor(Date.now() / 864e5)
let store: Store | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null

function load(): Store {
  if (store) return store
  try { store = JSON.parse(localStorage.getItem(KEY) ?? '') as Store } catch { store = null }
  if (!store || typeof store !== 'object' || !store.c) store = { since: today(), c: {} }
  return store
}
function save() {
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveTimer = null
    const s = load()
    const ids = Object.keys(s.c)
    // keep it small: drop the ones not used for longest
    if (ids.length > MAX) ids.sort((a, b) => s.c[a][2] - s.c[b][2]).slice(0, ids.length - MAX).forEach(k => delete s.c[k])
    try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* storage full or blocked */ }
  }, 1500)
}

/** Count one use of something (e.g. 'screen:play', 'page:jam:beats', 'learn:ear', 'btn:play:Hear it'). */
export function countUse(id: string) {
  if (!id) return
  const s = load()
  const d = today()
  const e = s.c[id]
  if (e) { e[0]++; e[2] = d } else s.c[id] = [1, d, d]
  save()
}

export interface UseRow { id: string; label: string; n: number; last: number }

/** The screens, pages and Learn tools there are, with names you'd recognise. */
export const KNOWN: Record<string, string> = {
  'screen:play': 'Play', 'screen:songs': 'Songs', 'screen:learn': 'Learn', 'screen:progressions': 'Jam',
  'tool:tuner': 'Tuner', 'tool:metronome': 'Tempo', 'tool:chords': 'Chords', 'tool:scales': 'Scales',
  'page:songs:mine': 'Songs → My songs', 'page:songs:songbook': 'Songs → Songbook', 'page:songs:practice': 'Songs → Practice',
  'page:songs:add': 'Songs → Add a song',
  'page:learn:today': 'Learn → Today', 'page:learn:course': 'Learn → Course', 'page:learn:explore': 'Learn → Explore',
  'page:jam:jam': 'Jam → Jam', 'page:jam:solo': 'Jam → Solo over it', 'page:jam:tab': 'Jam → Make a tab', 'page:jam:find': 'Jam → Riff Scanner',
  'page:jam:beats': 'Jam → Beat maker',
  'learn:ear': 'Ear trainer', 'learn:caged': 'CAGED', 'learn:changes': 'Chord changes', 'learn:rhythm': 'Rhythm trainer',
  'learn:circle': 'Circle of fifths', 'learn:progress': 'Progress', 'learn:lessons': 'Lessons', 'learn:techniques': 'Technique',
  'learn:bends': 'Bends & vibrato', 'learn:licks': 'Licks', 'learn:videos': 'Video lessons', 'learn:recordings': 'My recordings',
  'learn:chainer': 'Lick chainer', 'learn:guide': 'How to use KGuitar', 'learn:quiz': 'Quizzes', 'learn:settings': 'Settings',
  'play:hear': 'Play → Hear it', 'play:loop': 'Play → Loop', 'play:intime': 'Play → In time', 'play:stand': 'Play → Music stand',
  'play:video': 'Play → Video', 'play:band': 'Play → Band', 'play:record': 'Play → Record yourself', 'play:options': 'Play → Options',
  'play:remote': 'Play → Remote', 'play:report': 'Play → Report card', 'practice:start': 'Practice button', 'ask:open': 'Ask / helper',
}

export function usageSince(): number { return load().since }

/** Everything counted, most used first, with readable names. */
export function usageRows(): UseRow[] {
  const s = load()
  return Object.entries(s.c).map(([id, [n, , last]]) => ({ id, n, last, label: labelOf(id) })).sort((a, b) => b.n - a.n)
}
/** Known screens / pages / tools not opened for `days` days (or never). */
export function untouched(days = 30): UseRow[] {
  const s = load()
  const cut = today() - days
  return Object.keys(KNOWN).filter(id => !s.c[id] || s.c[id][2] < cut).map(id => ({ id, label: KNOWN[id], n: s.c[id]?.[0] ?? 0, last: s.c[id]?.[2] ?? 0 }))
}
export function clearUsage() {
  store = { since: today(), c: {} }
  try { localStorage.setItem(KEY, JSON.stringify(store)) } catch { /* storage blocked */ }
}
function labelOf(id: string) {
  if (KNOWN[id]) return KNOWN[id]
  const m = /^btn:([^:]+):(.*)$/.exec(id)
  if (m) return `${m[1][0].toUpperCase()}${m[1].slice(1).replace('progressions', 'Jam')}: “${m[2]}” button`
  return id
}

/** Count button presses everywhere by their label (one listener for the whole app). */
export function watchButtons(area: () => string) {
  const f = (e: MouseEvent) => {
    const b = (e.target as Element | null)?.closest?.('button, [role=tab], a.btn')
    if (!b || !e.isTrusted) return
    let label = b.getAttribute('data-use') || b.getAttribute('aria-label') || b.textContent || ''
    label = label.replace(/[\u{1F000}-\u{1FFFF}☀-➿️]/gu, '').replace(/\d+(\.\d+)?\s*%?/g, '#').replace(/\s+/g, ' ').trim().slice(0, 32)
    if (label.length < 2) return
    countUse(`btn:${area()}:${label}`)
  }
  document.addEventListener('click', f, true)
  return () => document.removeEventListener('click', f, true)
}
