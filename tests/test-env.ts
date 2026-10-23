// Minimal browser globals for logic tests that import app modules (imported first so it runs before them).
const store = new Map<string, string>()
const g = globalThis as unknown as Record<string, unknown>
g.localStorage = {
  getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k), clear: () => store.clear(), key: () => null, get length() { return store.size },
}
g.sessionStorage ??= g.localStorage
g.window ??= globalThis
if (typeof g.addEventListener !== 'function') { g.addEventListener = () => {}; g.removeEventListener = () => {} }
export {}
