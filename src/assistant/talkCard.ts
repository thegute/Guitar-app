// How long a spoken answer stays on screen after the voice finishes (Settings → You → AI helper). 0 = until you close
// it. Typed answers (the Ask sheet) always stay until you close them.
const KEY = 'kg:talkCardSecs'
export const TALK_CARD_CHOICES = [12, 30, 60, 0]
export function talkCardSecs(): number { try { const v = JSON.parse(localStorage.getItem(KEY) ?? '30'); return typeof v === 'number' ? v : 30 } catch { return 30 } }
export function setTalkCardSecs(v: number) { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* storage blocked */ } }
