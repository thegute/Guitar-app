// Tips (owner 2026-11-11): a glowing dot on the ✨ bubble when there's a tip for the screen you're on; tap ✨ to read it.
// Two kinds: app tips (a feature you haven't used yet, shown where it lives) and guitar advice (technique, timing, practice
// habits; switch off in Settings → You). "More often" (his answer): a new tip whenever there's one you haven't seen, a
// short breather between them, never the same one twice in a row; stuck in a bar → a tip for that first.
// Settings: kg:tipsMode = dot (default) | always (the card opens by itself) | ask (only when you ask the helper) | off;
// kg:tipsAdvice = guitar advice on/off (on). Everything is kept on this phone. All tip text is our own words.
import type { Go } from '../learn/path'

export type TipScreen = 'play' | 'songs' | 'learn' | 'jam' | 'tools' | 'settings' | 'any'
export type TipMode = 'dot' | 'always' | 'ask' | 'off'
export interface TipCtx { screen: string; sub: string; inst: 'guitar' | 'uke' | 'bass' | string }
export interface Tip {
  id: string
  where: TipScreen[]
  /** only on this sub-page (e.g. Jam's 'beats') */
  sub?: string
  kind: 'app' | 'advice' | 'stuck'
  text: string
  /** Show me: an element to flash (CSS selector) and/or a place to go first */
  find?: string
  go?: Go
  /** an app tip stops once you've used the thing (usage ids, prefix match) */
  unless?: string[]
  when?: (c: TipCtx) => boolean
}

// ---------- the tips ----------
export const TIPS: Tip[] = [
  // Song player
  { id: 'p-game', where: ['play'], kind: 'app', text: 'Game Mode turns the tab into a note highway with points and stars. Tap Game at the top; Full screen hides everything else.', find: '[data-find="game"]', unless: ['btn:play:Game'] },
  { id: 'p-loop', where: ['play'], kind: 'app', text: 'Stuck on a few bars? Tap Loop, then the first and last bar: it plays just that part again and again. Loop + a slower speed is the fastest way to fix a hard spot.', find: '[data-find="loop"]', unless: ['btn:play:Loop'] },
  { id: 'p-hear', where: ['play'], kind: 'app', text: 'Hear it plays the tab for you while the playhead moves, so you know how it should sound before you try it.', find: '[data-find="hear"]', unless: ['btn:play:Hear it'] },
  { id: 'p-intime', where: ['play'], kind: 'app', text: 'Wait for me stops on every note until you play it. When you can play it clean, switch to In time: the tab keeps moving and checks your timing too.', find: '[data-find="mode"]', unless: ['btn:play:In time'] },
  { id: 'p-stand', where: ['play'], kind: 'app', text: 'Music stand shows just the tab, big, with one row of big buttons: good with the phone on a stand at arm\'s length.', find: '[data-find="stand"]', unless: ['play:stand'] },
  { id: 'p-along', where: ['play'], kind: 'app', text: 'In Game Mode, tick Song plays along: your part and the band play with you, and the slider sets how much of each you hear.', unless: ['btn:play:Song plays along'] },
  { id: 'p-tapnote', where: ['play'], kind: 'app', text: 'Tap any number on the tab to hear that note and see its name. Hold a chord name to see its shape.' },
  { id: 'p-right', where: ['play'], kind: 'app', text: 'If the mic keeps calling a note wrong that you played right, tap "I played it right": KGuitar learns how your guitar sounds there.', find: '[data-find="taught"]', unless: ['play:taught'] },
  // Songs
  { id: 's-add', where: ['songs'], kind: 'app', text: 'Songs → Add a song takes a Guitar Pro file, a PDF (even a whole book: pick the pages), a text tab, a screenshot or a YouTube link.', go: { songs: 'add' }, unless: ['page:songs:add'] },
  { id: 's-book', where: ['songs'], kind: 'app', text: 'The Songbook has folk, bluegrass, reggae, Hawaiian and classical pieces at four levels, from just the words and chords to full arrangements.', go: { songs: 'songbook' }, unless: ['page:songs:songbook'] },
  // Learn
  { id: 'l-z2h', where: ['learn'], kind: 'app', text: 'Zero to Hero (Learn → Course) is a step-by-step plan with checks you pass by playing. Start check finds where you are.', go: { learn: 'course' }, unless: ['page:learn:course'] },
  { id: 'l-ex', where: ['learn'], kind: 'app', text: 'Learn → Exercises has about 800 exercises; For you picks the ones that fit what you\'re working on.', go: { learn: 'exercises' }, unless: ['page:learn:exercises'] },
  { id: 'l-practice', where: ['learn'], kind: 'app', text: 'The Practice button builds a 10, 20 or 30 minute session for today: warm-up, your focus, your trouble bars and a song.', find: '.practice-go', unless: ['btn:learn:Practice', 'btn:songs:Practice'] },
  // Jam
  { id: 'j-cards', where: ['jam'], sub: 'jam', kind: 'app', text: 'While the band plays, the Mini neck card shows the scale to solo with. Two beats before each change, the next chord\'s root and 3rd light up cyan: aim for them.', unless: [] },
  { id: 'j-lock', where: ['jam'], sub: 'jam', kind: 'app', text: 'Like some chords but not others? Tap the padlock on the ones you like, then New progression changes only the rest.', find: '.pc-lock' },
  { id: 'j-loopit', where: ['jam'], sub: 'jam', kind: 'app', text: 'Loop over this progression turns your chords into a beat and opens the 4-track looper: record rhythm, then a bassline, then a lead.', find: '[data-testid=jam-loop-it]', unless: ['btn:progressions:Loop over this progression'] },
  { id: 'j-beat-sample', where: ['jam'], sub: 'beats', kind: 'app', text: 'Hold one of Your pads and make a sound (your voice, a knock on the guitar body): let go and it\'s a drum pad.', unless: ['btn:progressions:Your pads'] },
  { id: 'j-scan', where: ['jam'], kind: 'app', text: 'The Riff Scanner link turns a YouTube video, a screenshot of a tab or a recording into a tab you can play along with.', find: '[data-testid=jam-scan-link]', unless: ['page:jam:find'] },
  // Tools
  { id: 't-tuner', where: ['tools'], kind: 'app', text: 'The tuner has alternate tunings too (drop D, open G, DADGAD and more): pick one and it explains what it\'s for.' },
  { id: 't-groove', where: ['tools'], kind: 'app', text: 'The metronome can play a drum groove instead of a click, with a fill every 8 bars: much more fun to practise to.' },
  // Anywhere
  { id: 'a-cards', where: ['play', 'learn', 'jam'], kind: 'app', text: 'Floating cards (hand, chord now & next, mini neck, tempo, tuner, video…) can be picked for each screen in Settings → Cards. Shrink one to a bubble with –.', go: { settings: 'cards' }, unless: ['page:settings:cards'] },
  { id: 'a-talk', where: ['any'], kind: 'app', text: 'Tap the microphone next to ✨ and say what you want: "slower", "loop bars 5 to 8", "what scale fits this?"', find: '[data-testid=talk-btn]', unless: ['btn:play:Talk to the helper', 'btn:learn:Talk to the helper'] },

  // ---------- guitar advice (our own words) ----------
  { id: 'g-slow', where: ['play', 'learn'], kind: 'advice', text: 'Practise at the speed where you play it right every time, not the speed you wish you could. Clean and slow becomes clean and fast; sloppy and fast stays sloppy.' },
  { id: 'g-relax', where: ['play', 'learn', 'jam'], kind: 'advice', text: 'Check your fretting hand: press just hard enough for a clean note, right behind the fret. Squeezing harder only makes you slower and tired.' },
  { id: 'g-thumb', where: ['play', 'learn'], kind: 'advice', text: 'For single notes, keep your thumb behind the neck, roughly behind your 2nd finger. It frees your fingers to reach and stretch.' },
  { id: 'g-mute', where: ['play', 'jam'], kind: 'advice', text: 'Ringing strings you didn\'t mean to play? Rest the side of your picking hand lightly on the low strings, and let the fretting fingers touch the strings next to the note.' },
  { id: 'g-alt', where: ['play', 'learn'], kind: 'advice', text: 'Alternate pick (down, up, down, up) for fast single notes: the pick never wastes a trip back.' },
  { id: 'g-changes', where: ['play', 'jam', 'learn'], kind: 'advice', text: 'For quicker chord changes, move all your fingers together as one shape, and look for a finger that can stay on the same string between the two chords.' },
  { id: 'g-strum', where: ['jam', 'play'], kind: 'advice', text: 'Keep your strumming hand moving down and up all the time, even when you skip a strum: the steady motion keeps you in time.' },
  { id: 'g-count', where: ['play', 'jam'], kind: 'advice', text: 'Count out loud ("1 and 2 and…") while you play a tricky rhythm. If you can\'t count it, you can\'t play it in time yet.' },
  { id: 'g-solo', where: ['jam'], kind: 'advice', text: 'When you solo, land on a note of the chord (gold on the Mini neck) on beat 1 of each change. Any scale note in between sounds fine if you land well.' },
  { id: 'g-space', where: ['jam'], kind: 'advice', text: 'Leave space in a solo. Play a short idea, rest, then answer it with a small change: it sounds like talking, not running scales.' },
  { id: 'g-short', where: ['learn', 'play'], kind: 'advice', text: 'Short daily practice beats a long session once a week. Even 10 focused minutes moves you forward, and your streak counts any 5.' },
  { id: 'g-record', where: ['play'], kind: 'advice', text: 'Record yourself now and then (Options → Record yourself). You hear timing and buzzing on a recording that you miss while playing.' },
  { id: 'g-tune', where: ['play', 'jam', 'tools'], kind: 'advice', text: 'Tune before you practise, every time. Even a slightly out-of-tune string makes right notes sound wrong, and the mic will think so too.' },
  { id: 'g-trouble', where: ['play'], kind: 'advice', text: 'Practise the hard bar plus one note on each side of it. Most mistakes live in the change into and out of the hard part.' },
  { id: 'g-bend', where: ['learn', 'play'], kind: 'advice', text: 'Bend with two or three fingers together and push from the wrist, not the finger. Check the bent note against the target note (Learn → Bends & vibrato).' },
  { id: 'g-flat', where: ['play', 'learn'], kind: 'advice', text: 'Flatpicking bluegrass? Let the pick come from the wrist with small motions, and keep down-strokes on the beat, up-strokes on the "and".' },
  { id: 'g-ear', where: ['learn'], kind: 'advice', text: 'Sing the note before you play it. Even humming badly trains your ear to hear where a melody goes.' },
  { id: 'g-posture', where: ['any'], kind: 'advice', text: 'Sit up, shoulders loose, and tilt the neck up a little: your fretting wrist straightens and reaching the low frets gets easier.' },

  // ---------- stuck in a bar (shown first when the mic hears the same spot go wrong again and again) ----------
  { id: 'x-slow', where: ['play'], kind: 'stuck', text: 'This spot keeps tripping you up. Loop just this bar and the next, drop the speed to about 60%, and play it 5 times clean before speeding up.', find: '[data-find="loop"]' },
  { id: 'x-hear', where: ['play'], kind: 'stuck', text: 'Not sure how this bar goes? Tap Hear it and listen once or twice, or tap the notes one by one to hear each.' },
  { id: 'x-hand', where: ['play'], kind: 'stuck', find: '[data-testid=finger-box], [data-testid=finger-chip]', text: 'Check the hand card: it shows which finger goes on each note here. The right fingering often makes a "hard" bar easy.' },
]

// ---------- state (this phone only) ----------
const DAY = 864e5
const read = <T>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d } catch { return d } }
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* full */ } }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(f => f())
export function onTips(f: () => void) { listeners.add(f); return () => { listeners.delete(f) } }

export const tipsMode = (): TipMode => read<TipMode>('kg:tipsMode', 'dot')
export function setTipsMode(m: TipMode) { write('kg:tipsMode', m); emit() }
export const adviceOn = (): boolean => read('kg:tipsAdvice', true)
export function setAdviceOn(on: boolean) { write('kg:tipsAdvice', on); emit() }

/** id → when you said Got it (ms) */
const seen = () => read<Record<string, number>>('kg:tipsSeen', {})
const muted = () => read<string[]>('kg:tipsMuted', [])
const lastAt = () => read<Record<string, number>>('kg:tipsLast', {})

/** "Got it": not again (advice comes back after 3 weeks), and a short breather before the next one here. */
export function tipDone(t: Tip, screen: string) {
  const s = seen(); s[t.id] = Date.now(); write('kg:tipsSeen', s)
  const l = lastAt(); l[screen] = Date.now(); write('kg:tipsLast', l)
  if (t.kind !== 'stuck') write('kg:tipsKinds', [...read<string[]>('kg:tipsKinds', []), t.kind].slice(-3))
  if (t.kind === 'stuck') stuckAt = 0
  emit()
}
/** "No more tips here" */
export function muteTips(screen: string) { const m = muted(); if (!m.includes(screen)) write('kg:tipsMuted', [...m, screen]); emit() }
export function unmuteAllTips() { write('kg:tipsMuted', []); write('kg:tipsSeen', {}); write('kg:tipsLast', {}); write('kg:tipsKinds', []); emit() }
export const tipsMuted = (screen: string) => muted().includes(screen)

// Play tells the tips when the same bar keeps going wrong
let stuckAt = 0
let stuckBar = -1
export function noteStuck(bar: number) { stuckAt = Date.now(); stuckBar = bar; emit() }
export const stuckBarNow = () => (Date.now() - stuckAt < 90_000 ? stuckBar : -1)

/** usage counts (from usage.ts's store) by prefix: has he used it? */
function used(prefixes: string[]): boolean {
  if (!prefixes.length) return false
  const c = read<{ c?: Record<string, [number, number, number]> }>('kg:usage', {}).c ?? {}
  const ids = Object.keys(c)
  return prefixes.some(p => ids.some(id => id === p || id.startsWith(p)))
}

/** a different order every day, the same all day (so the tip doesn't jump around while you look) */
function dayOrder(ids: string[]): string[] {
  const d = Math.floor(Date.now() / DAY)
  const h = (s: string) => { let x = d * 2654435761; for (const ch of s) x = Math.imul(x ^ ch.charCodeAt(0), 2246822519) >>> 0; return x }
  return [...ids].sort((a, b) => h(a) - h(b))
}

/** The tip to offer on this screen right now, or null. */
export function currentTip(c: TipCtx, now = Date.now()): Tip | null {
  const mode = tipsMode()
  if (mode === 'off' || tipsMuted(c.screen)) return null
  const s = seen()
  // a breather between tips on the same screen ("more often", but not one after another)
  const rest = now - (lastAt()[c.screen] ?? 0) < 90_000
  const fits = (t: Tip) =>
    (t.where.includes('any') || t.where.includes(c.screen as TipScreen)) &&
    (!t.sub || t.sub === c.sub) &&
    (t.kind !== 'advice' || adviceOn()) &&
    (!t.when || t.when(c))
  // stuck first
  if (now - stuckAt < 90_000 && c.screen === 'play') {
    const st = TIPS.filter(t => t.kind === 'stuck' && fits(t) && !(s[t.id] && now - s[t.id] < 10 * 60_000))
    if (st.length) return st[0]
  }
  if (rest) return null
  const fresh = (t: Tip) => !s[t.id] || (t.kind === 'advice' && now - s[t.id] > 21 * DAY)
  const pool = TIPS.filter(t => t.kind !== 'stuck' && fits(t) && fresh(t) && !(t.unless && used(t.unless)))
  if (!pool.length) return null
  // app tips first (they're about this screen), then advice, each in today's order
  const apps = dayOrder(pool.filter(t => t.kind === 'app').map(t => t.id))
  const adv = dayOrder(pool.filter(t => t.kind === 'advice').map(t => t.id))
  // mix: after two app tips in a row comes an advice tip, so advice turns up "more often" too
  const recent = read<string[]>('kg:tipsKinds', [])
  const adviceTurn = adv.length > 0 && (!apps.length || (recent.length >= 2 && recent.slice(-2).every(k => k === 'app')))
  return TIPS.find(t => t.id === (adviceTurn ? adv[0] : apps[0])) ?? null
}

/** Show me: flash the thing the tip is about (after going there, if it lives elsewhere). */
export function flashFind(sel: string, delay = 120) {
  let tries = 0
  const find = () => {
    let el: Element | null = null
    try { el = document.querySelector(sel) } catch { return }
    if (!el) { if (++tries < 25) setTimeout(find, 120); return }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    el.classList.add('find-flash')
    setTimeout(() => el?.classList.remove('find-flash'), 2600)
  }
  setTimeout(find, delay)
}
