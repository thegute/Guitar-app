// What the assistant does with a request: answer in plain words and, when it fits, set something up: a practice
// session, a screen opened just right, or changes to the beat you're making. With no AI key the built-in planner
// and the search results do it; with a key the AI picks from the same building blocks (it can't do anything else).
import type { Result, Target } from '../search/types'
import { builtInPlan } from '../sessions/recipes'
import type { Session, Step } from '../sessions/session'
import { loadBeat, PATTERNS, STARTERS, voiceLabel, type Beat } from '../studio/beat'
import { instr } from '../studio/sounds'
import { beatChords } from '../studio/practice'
import { activeProvider, ask, AiError } from './providers'
import type { AskContext } from './bus'
import { screenInfo, type ScreenInfo } from './screen'

export interface BeatChange { starter?: string; bpm?: number; key?: string; minor?: boolean; patterns?: string[]; swing?: number }
/** a change to Play: loop (0-based bars, null = stop) and/or speed; `label` is the button text */
export interface PlayChange { loop?: { from: number; to: number } | null; speed?: number; label: string }
export interface Answer { reply: string; session?: Session; open?: Result; beat?: BeatChange; play?: PlayChange; ideas?: string[]; ai: boolean; note?: string }

function playLabel(c: Omit<PlayChange, 'label'>): string {
  const parts: string[] = []
  if (c.loop === null) parts.push('Stop looping')
  else if (c.loop) parts.push(c.loop.from === c.loop.to ? `Loop bar ${c.loop.from + 1}` : `Loop bars ${c.loop.from + 1}–${c.loop.to + 1}`)
  if (c.speed) parts.push(`${parts.length ? 'at' : 'Speed'} ${Math.round(c.speed * 100)}%`)
  return parts.join(' ')
}

/** Without an AI key: quick Play commands ("slower", "loop this bar", "70%") and "what key / chord is this". */
const NUM_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100 }
/** Spoken words → digits ("five to eight" → "5 to 8", "seventy five percent" → "75 percent"). */
export function spokenNumbers(q: string): string {
  return q.toLowerCase()
    .replace(/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[\s-](one|two|three|four|five|six|seven|eight|nine)\b/g, (_, a: string, b: string) => String(NUM_WORDS[a] + NUM_WORDS[b]))
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b/g, w => String(NUM_WORDS[w]))
    .replace(/\bfor\b(?=\s*(to|through|-))/g, '4').replace(/\bto\b(?=\s*(to|through))/g, '2')
}

function playCommand(q: string, info: ScreenInfo | null): Answer | null {
  const p = info?.play
  if (!p) return null
  const t = spokenNumbers(q)
  if (t.split(/\s+/).length > 12 && !/loop\b.*\d/.test(t)) return null // a real question, not a quick command
  if (/^(how|what|why|explain|tell me|teach|show me|can you (explain|tell|show))\b/.test(t) && !/\b(tempo|speed|loop|bpm|percent)\b/.test(t)) return null
  const c: Omit<PlayChange, 'label'> = {}
  const pct = /(\d{2,3})\s*(%|percent)/.exec(t)
  if (pct) c.speed = Math.max(0.25, Math.min(1.5, Number(pct[1]) / 100))
  else if (/full speed|normal speed|original (speed|tempo)/.test(t)) c.speed = 1
  else if (/slow(er| (it )?down| (the |it )?(tempo|speed))|too fast|(lower|decrease|reduce|drop|bring down)( the)? (tempo|speed|bpm)|(tempo|speed) down/.test(t)) c.speed = Math.max(0.25, Math.round((p.speed - 0.1) * 20) / 20)
  else if (/faster|speed (it )?up|too slow|(raise|increase|bring up|bump)( up)?( the)? (tempo|speed|bpm)|(tempo|speed) up/.test(t)) c.speed = Math.min(1.5, Math.round((p.speed + 0.1) * 20) / 20)
  if (/(stop|no|turn off|clear|cancel)( the)? loop(ing)?/.test(t)) c.loop = null
  else if (/loop (this|the|my) (bar|measure)|loop here|loop it\b|loop this\b/.test(t)) c.loop = { from: p.bar, to: p.bar }
  else {
    const m = /loop(?: (?:bars?|measures?|section|sections|from))*\s*(\d+)(?:\s*(?:-|–|to|through|thru|and|till|until)\s*(?:bars? |measures? )?(\d+))?/.exec(t)
    if (m) { const a = Number(m[1]) - 1, b = Number(m[2] ?? m[1]) - 1; c.loop = { from: Math.max(0, Math.min(a, b, p.bars - 1)), to: Math.min(p.bars - 1, Math.max(a, b)) } }
  }
  if (c.speed !== undefined || c.loop !== undefined) return { reply: `Okay: ${playLabel(c).toLowerCase()}.`, play: { ...c, label: playLabel(c) }, ai: false }
  if (/what key/.test(t)) return { reply: `This song looks like it's in ${p.key}.`, ai: false }
  if (/what chord/.test(t) && p.chord) return { reply: `The chord where you are is ${p.chord}. Press and hold the chord name on the tab to see its shape.`, ai: false }
  return null
}

const PLACES: [string, string, Target][] = [
  ['tool:caged', 'CAGED explorer (chord shapes all over the neck)', { go: { tool: 'caged' } }],
  ['tool:changes', 'One-minute chord changes trainer', { go: { tool: 'changes' } }],
  ['tool:ear', 'Ear trainer', { go: { tool: 'ear' } }],
  ['tool:rhythm', 'Rhythm trainer', { go: { tool: 'rhythm' } }],
  ['tool:bends', 'Bends and vibrato trainer', { go: { tool: 'bends' } }],
  ['jam:jam', 'Jam: chord progression with a backing band', { jam: { page: 'jam' } }],
  ['jam:solo', 'Jam: solo over the loop with scales on the neck', { jam: { page: 'solo' } }],
  ['jam:beats', 'Beat maker', { jam: { page: 'beats' } }],
  ['metronome', 'Metronome', { tool: 'metronome' }],
  ['tuner', 'Tuner', { tool: 'tuner' }],
]
const EX_TYPES = ['warmup', 'picking', 'legato', 'bends', 'rhythm', 'scales', 'sequences', 'arpeggios', 'changes', 'triads', 'intervals', 'neck', 'chords', 'strumming', 'barre', 'power', 'fingerstyle', 'melodic', 'alt', 'sweep', 'skip', 'hybrid']
const LICKS = ['blues', 'rock', 'metal', 'progmetal', 'jazz', 'mayer', 'neosoul', 'funk', 'hawaiian', 'reggaerock', 'bluegrass', 'billy', 'acoustic', 'popsoul', 'progclean', 'country', 'folk', 'fingerstyle']

function targetOf(code: string, results: Result[], key?: string, minor?: boolean): Target | null {
  const r = results.find(x => x.id === code)
  if (r) return r.target
  const p = PLACES.find(x => x[0] === code)
  if (p) return code === 'jam:solo' && key ? { jam: { page: 'solo', key, mode: minor ? 'minor' : 'major' } } : p[2]
  const ex = /^ex:(.+)$/.exec(code)
  if (ex) return { exercise: `type:${ex[1]}` }
  const lick = /^lick:(.+)$/.exec(code)
  if (lick) return { exercise: `type:lick:${lick[1]}` }
  const tech = /^technique:(.+)$/.exec(code)
  if (tech) return { go: { technique: tech[1] } }
  return null
}

function beatSummary(b: Beat): string {
  const chords = beatChords(b).map(c => c?.name ?? '-').join(' ')
  return `Current beat "${b.name}": ${b.bpm} BPM, ${b.bars} bars, key ${b.key}${b.minor ? ' minor' : ''}, kit ${b.kit}, swing ${Math.round(b.swing * 300)}%.
Drum grid: ${b.rows.map(r => `${voiceLabel(r.voice)} (${r.steps.filter(v => v > 0).length} hits)`).join(', ') || 'empty'}.
Layers: ${(b.layers ?? []).map(l => l.label).join(', ') || 'none'}.
Parts: ${b.tracks.map(t => `${instr(t.inst).label} (${t.notes.length} notes)`).join(', ') || 'none'}. Chords per bar: ${chords}.`
}

/** Ideas for the beat without AI: what's missing, what would suit the style. */
function beatIdeas(b: Beat): string[] {
  const out: string[] = []
  const has = (label: string) => (b.layers ?? []).some(l => l.label === label)
  const voices = new Set([...b.rows.filter(r => r.steps.some(v => v > 0)).map(r => r.voice), ...(b.layers ?? []).flatMap(l => l.rows.map(r => r.voice))])
  if (!voices.has('kick')) out.push('Add a kick: tap "Four-on-the-floor kick" for dance, or "Rock kick" for a band feel.')
  if (!voices.has('snare') && !voices.has('clap')) out.push('Add "Snare on 2 and 4" (or a clap) so the beat has a backbeat.')
  if (!voices.has('hat') && !voices.has('open') && !voices.has('ride')) out.push('Add a hi-hat layer: 8ths for most styles, 16ths for trap and funk, off-beat open hats for house.')
  if (b.swing < 0.05 && b.bpm < 100) out.push('Try a little swing (Key, bars, save… → Swing 30–50%): slower hip-hop and lo-fi feel better with it.')
  if (!b.tracks.some(t => instr(t.inst).group === 'Bass')) out.push('Add a bass part in the piano roll (808 sub for trap, upright for lo-fi, electric for rock): just the root of each chord on beat 1 already helps.')
  if (!b.tracks.some(t => instr(t.inst).group !== 'Bass')) out.push('Add chords: open the Keyboard, switch to "Chords in ' + b.key + (b.minor ? 'm' : '') + '", press ● and play one chord per bar.')
  if (!voices.has('crash')) out.push('Put a crash on the first beat of the first bar so the loop has a clear start.')
  if (!has('Shaker 16ths') && b.bpm < 110) out.push('A quiet "Shaker 16ths" layer adds movement without crowding the beat.')
  out.push('Record a guitar loop over it in the Looper ("On the beat" mode): it starts on bar 1 and lines up by itself.')
  return out.slice(0, 5)
}

const SYSTEM = (ctx: AskContext, extra: string, results: Result[], screen: ScreenInfo | null) => `You are the helpful guitar coach inside KGuitar, a guitar practice app. The user is a guitarist who wants plain, friendly, short answers (no jargon, 1-4 sentences; your reply may be read aloud, so write it as speech: no symbols or lists in "reply"). Answer music and guitar questions directly from what you know (theory, technique, gear, how a style works). Today's date: ${new Date().toDateString()}.
You can set things up, but ONLY with these building blocks. Reply with JSON only:
{"reply": "your answer in plain words",
 "open": "<one id from PLACES or RESULTS to open right away, or null>",
 "session": null or {"title": "short title", "steps": [{"title": "...", "minutes": 2-20, "use": "<id>", "tip": "one sentence on what to do"}]},
 "beat": null or {"starter": one of [${STARTERS.map(s => s.id).join(', ')}] or null, "bpm": number or null, "key": "C".."B" or null, "minor": true/false/null, "patterns": [ids from ${PATTERNS.map(p => p.id).join(', ')}], "swing": 0-0.33 or null},
 "ideas": ["short suggestion", ...] or null}
Use a session when they want to practise something (3-5 steps, about 20-35 minutes, start with a warm-up). Use "beat" only to change the beat maker. Use "open" for "how do I / where is / show me" questions.
Step ids you can use: ${PLACES.map(p => p[0]).join(', ')}, ex:<type> with type in [${EX_TYPES.join(', ')}], lick:<style> with style in [${LICKS.join(', ')}], technique:<id> with id in [pick, fret, chords, strum, alternate, mute, pm, legato, slide, bend, barre, travis, melodic], or an id from RESULTS.
RESULTS (things in the app matching the request): ${results.slice(0, 12).map(r => `${r.id} = ${r.title} (${r.where})`).join('; ') || 'none'}.
Never invent songs' tabs or lyrics; for a real song, tell them to search its tab (Songsterr / Ultimate Guitar) and open it in Play.${ctx === 'beat' ? '\nThey are in the beat maker now. ' + extra : ''}${screen ? `\nON THEIR SCREEN RIGHT NOW (use it: "here", "this bar", "this song" mean this): ${screen.summary}` : ''}${screen?.can?.length ? `\nYou may also add "play": {"loop": [firstBar, lastBar] as the bar numbers they see, or null to stop looping, "speed": 0.25-1.5 (1 = full speed)} to change their loop or speed in Play; only when it helps.` : ''}`

export async function plan(q: string, results: Result[], ctx: AskContext = 'general', past: { q: string; a: string }[] = []): Promise<Answer> {
  const beat = ctx === 'beat' ? loadBeat() : null
  const screen = screenInfo()
  const local = (): Answer => {
    const pc = playCommand(q, screen)
    if (pc) return pc
    if (beat && /idea|suggest|better|what (should|can)|next/i.test(q)) return { reply: 'A few ideas for this beat:', ideas: beatIdeas(beat), ai: false }
    const p = builtInPlan(q)
    if (p) return { reply: p.reply, session: p.session, ai: false }
    if (results[0] && results[0].score >= 40) return { reply: `This looks like what you want: ${results[0].title}.`, open: results[0], ai: false }
    return { reply: "I'm not sure what you mean. Try saying what you want to practise (\"triads\", \"blues in A\", \"make a trap beat\") or what's wrong (\"it doesn't hear me\").", ai: false }
  }
  // a plain command ("slower", "loop 5 to 8 at 70 percent") is done straight away, even with an AI key: no waiting
  const quick = playCommand(q, screen)
  if (quick && !/\b(what|why|how|explain|tell|which|show)\b/i.test(q)) return quick
  if (!activeProvider()) return { ...local(), note: 'Built-in helper. Add a free AI key in Settings → You → AI helper for smarter answers.' }
  try {
    const raw = await ask(SYSTEM(ctx, beat ? beatSummary(beat) : '', results, screen), [...past.flatMap(p => [{ role: 'user' as const, text: p.q }, { role: 'assistant' as const, text: JSON.stringify({ reply: p.a }) }]), { role: 'user', text: q }], { json: true, maxTokens: 1200 })
    const j = JSON.parse(raw.replace(/^[^{]*/, '').replace(/[^}]*$/, '')) as { reply?: string; open?: string | null; session?: { title: string; steps: { title: string; minutes: number; use: string; tip?: string }[] } | null; beat?: BeatChange | null; play?: { loop?: number[] | null; speed?: number | null } | null; ideas?: string[] | null }
    const ans: Answer = { reply: j.reply || 'Here you go.', ai: true }
    if (j.open) { const r = results.find(x => x.id === j.open); const t = r ? null : targetOf(j.open, results); ans.open = r ?? (t ? { id: j.open, kind: 'feature', title: PLACES.find(p => p[0] === j.open)?.[1] ?? j.open, where: '', text: '', target: t, score: 100 } : undefined) }
    if (j.session?.steps?.length) {
      const steps: Step[] = []
      for (const s of j.session.steps.slice(0, 8)) {
        const t = targetOf(s.use, results)
        if (t) steps.push({ title: s.title, minutes: Math.max(1, Math.min(30, Math.round(s.minutes || 5))), target: t, tip: s.tip, ...(s.use === 'jam:beats' && j.beat ? { beat: { ...j.beat, starter: j.beat.starter ?? undefined } } : {}) })
      }
      if (steps.length) ans.session = { id: Math.random().toString(36).slice(2, 8), title: j.session.title || 'Practice', steps }
    }
    if (j.beat && ctx === 'beat') ans.beat = { ...j.beat, patterns: (j.beat.patterns ?? []).filter(p => PATTERNS.some(x => x.id === p)) }
    if (j.ideas?.length) ans.ideas = j.ideas.slice(0, 6)
    if (j.play && screen?.can?.length) {
      const c: Omit<PlayChange, 'label'> = {}
      const n = screen.play?.bars ?? 999
      if (j.play.loop === null) c.loop = null
      else if (Array.isArray(j.play.loop) && j.play.loop.length) { const a = Math.round(j.play.loop[0]) - 1, b = Math.round(j.play.loop[1] ?? j.play.loop[0]) - 1; c.loop = { from: Math.max(0, Math.min(a, b)), to: Math.min(n - 1, Math.max(a, b)) } }
      if (typeof j.play.speed === 'number' && j.play.speed > 0) c.speed = Math.max(0.25, Math.min(1.5, j.play.speed))
      if (c.loop !== undefined || c.speed !== undefined) ans.play = { ...c, label: playLabel(c) }
    }
    return ans
  } catch (e) {
    return { ...local(), note: e instanceof AiError ? `${e.message} (Answered with the built-in helper.)` : 'The AI answer didn\'t come through, so this is the built-in helper.' }
  }
}
