// Step 1 of a link scan: Gemini watches the YouTube video and writes down the tab (read off the screen when one is
// shown, else worked out from the guitar it hears), the tempo, time signature, key and chords. Its answer comes in a
// fixed shape so it can be checked: a tab read off the screen is trusted; one worked out from the sound asks
// "Does this look right?".
import { watchVideo } from '../assistant/providers'
import { looksLikeTab } from './read'

export const WATCH_PROMPT = (inst: string, strings: string, singing: boolean) => `Watch this guitar video and write down the ${inst} part.
Answer in exactly this shape, nothing else:
SOURCE: screen   (if a tab is shown on screen and you read it)   or   SOURCE: sound   (if you worked it out by listening)   or   SOURCE: none
TEMPO: <quarter-note BPM of the music, a whole number>
TIME: <time signature, like 4/4, 3/4, 6/8>
KEY: <key, like G or Em>
CHORDS: <the chord names in order, one per bar, separated by spaces, like: G G C D>
TAB:
<plain ASCII tab: one line per string, highest first, starting with its name and | (${strings}), frets as numbers,
- for space, | for bar lines, h p / \\ b r ~ x for techniques; chord names on a line above in the same columns>
Rules: read on-screen tab exactly, digit by digit (0/9, 3/8, 1/7 look alike when small); follow it as it scrolls and write
every part once in playing order. Leave out talking${singing ? '' : ' and singing'}. If no guitar is played, SOURCE: none.
Never invent notes: if a passage is unclear, leave dashes.`

export interface Watched {
  source: 'screen' | 'sound' | 'none'
  tempo: number | null
  timeSig: [number, number] | null
  key: string | null
  chords: string[]
  tab: string
}

/** Read Gemini's answer. */
export function parseWatched(text: string): Watched {
  const t = text.replace(/```[a-z]*\n?|```/g, '')
  const line = (k: string) => new RegExp(`^\\s*(?:[-*]\\s*)?\\*{0,2}${k}:\\*{0,2}\\s*(.*)$`, 'im').exec(t)?.[1]?.trim() ?? ''
  const src = line('SOURCE').toLowerCase()
  const tempo = Number(/\d{2,3}/.exec(line('TEMPO'))?.[0])
  const sig = /(\d{1,2})\s*\/\s*(\d{1,2})/.exec(line('TIME'))
  const chords = line('CHORDS').split(/[\s|,]+/).filter(c => /^[A-G][#b]?[^\s]*$/.test(c))
  const tabMatch = /^\s*(?:[-*]\s*)?\*{0,2}TAB:\*{0,2}\s*(.*)$/im.exec(t)
  let tab = ''
  if (tabMatch) {
    const rest = t.slice(tabMatch.index + tabMatch[0].length).trim()
    tab = tabMatch[1]?.trim() ? `${tabMatch[1].trim()}\n${rest}`.trim() : rest
  } else {
    // Keep blank lines between tab systems so multi-system tabs don't merge into an 18-line block.
    const kept: string[] = []
    for (const ln of t.split('\n')) {
      if (/^\s*[A-Ga-g][#b]?\s*\|/.test(ln) || (/^\s+[A-G]/.test(ln) && !/:/.test(ln))) kept.push(ln)
      else if (!ln.trim() && kept.length && kept[kept.length - 1] !== '') kept.push('')
    }
    tab = kept.join('\n').trim()
  }
  return {
    source: /screen/.test(src) ? 'screen' : /sound/.test(src) ? 'sound' : looksLikeTab(tab) ? 'sound' : 'none',
    tempo: tempo >= 30 && tempo <= 300 ? tempo : null,
    timeSig: sig ? [Number(sig[1]), Number(sig[2])] : null,
    key: line('KEY') || null,
    chords,
    tab: looksLikeTab(tab) ? tab : '',
  }
}

/** "1:20" or "80" → seconds (undefined when empty or unreadable). */
export function parseTime(s: string): number | undefined {
  const v = s.trim()
  if (!v) return undefined
  const m = /^(?:(\d+):)?(\d{1,2})(?::(\d{1,2}))?$/.exec(v)
  if (!m) return undefined
  if (m[3] !== undefined) return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3])
  return m[1] !== undefined ? Number(m[1]) * 60 + Number(m[2]) : Number(m[2])
}

export async function watchLink(url: string, o: { inst: string; strings: string; singing?: boolean; from?: number; to?: number; signal?: AbortSignal }): Promise<Watched> {
  const isShort = /\/shorts\//.test(url)
  const bounded = o.from !== undefined && o.to !== undefined && o.to - o.from <= 180
  const text = await watchVideo(url, WATCH_PROMPT(o.inst, o.strings, !!o.singing), { from: o.from, to: o.to, detail: isShort || bounded, highRes: true, signal: o.signal })
  return parseWatched(text)
}

/** A chord chart text (one bar per chord) the chord-sheet reader understands. */
export function chartText(chords: string[], perLine = 4): string {
  const lines: string[] = []
  for (let i = 0; i < chords.length; i += perLine) lines.push(chords.slice(i, i + perLine).map(c => c.padEnd(8)).join(''))
  return lines.join('\n')
}
