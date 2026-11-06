// The AI reads the prepared tab strips into plain text tab (then the usual text-tab reader turns it into a song).
// Every strip is asked in parallel (up to 3 at a time) with the Gemini + Groq race: the first answer that really is a
// tab wins, a quick one in about 5 seconds; a big scan keeps going (with progress) until it's done or cancelled.
import { ask, activeProvider, AiError } from '../assistant/providers'
import type { Piece } from './pictures'

export const READ_SYSTEM = `You read guitar or ukulele tablature from pictures (enlarged strips from video lessons, tab books, websites).
Write out exactly what the picture shows as plain ASCII tab, nothing else:
- one line per string, highest string first, each starting with its name and | (e|, B|, G|, D|, A|, E| for standard guitar)
- frets as numbers, - for space, | for bar lines; keep the spacing so notes that line up in the picture line up here
- read every digit carefully: 0 and 9, 3 and 8, 1 and 7, 5 and 6 look alike when small; two-digit frets (10–24) stay together
- keep techniques the picture shows: h hammer-on, p pull-off, / and \\ slides, b bend, r release, ~ vibrato, x dead note,
  PM palm mute (on a line above), harmonics as <12>
- if chord names are written above the tab, put them on a line above in the same columns
- if a strum pattern is shown (arrows or D U), put it on a line under the tab as D, U, B (bass) and X (chop) in the same columns
- if a tempo is written (♩ = 92, 92 BPM), start with a line: Tempo: 92
Never invent notes you can't see. If a part is unreadable, leave it as dashes. If there is no tab in the picture, answer only: NO TAB`

/** Is this answer a tab (at least 4 string lines with notes)? */
export function looksLikeTab(text: string): boolean {
  if (/^\s*NO TAB/i.test(text)) return false
  const lines = text.split('\n').filter(l => /^\s*[A-Ga-g][#b]?\s*\|/.test(l))
  return lines.length >= 4 && lines.some(l => /\d/.test(l))
}

export const clean = (t: string) => t.replace(/```[a-z]*\n?|```/g, '').trim()

/** A tempo written on the tab ("Tempo: 92"), if the AI saw one. */
export function writtenTempo(text: string): number | null {
  const m = /^\s*Tempo:\s*(\d{2,3})/im.exec(text)
  const v = m ? Number(m[1]) : NaN
  return v >= 30 && v <= 300 ? v : null
}

export const canRead = () => !!activeProvider(undefined, true)

/** Read all the pieces (in order). `onDone(n)` after each one; throws AiError when nothing came back as a tab. */
export async function readPieces(pieces: Piece[], o: { signal?: AbortSignal; onDone?: (done: number, total: number) => void } = {}): Promise<{ text: string; read: number }> {
  const out: (string | null)[] = new Array(pieces.length).fill(null)
  let next = 0, done = 0
  let lastErr: unknown = null
  const worker = async () => {
    while (next < pieces.length) {
      const i = next++
      const p = pieces[i]
      try {
        const t = clean(await ask(READ_SYSTEM, [{ role: 'user', text: `Strip ${i + 1} of ${pieces.length}. Write out the tab.`, image: { mime: p.mime, b64: p.b64 } }],
          { pictures: true, maxTokens: 3000, accept: looksLikeTab, hedgeMs: 5000, deadlineMs: 120000, signal: o.signal }))
        out[i] = t
      } catch (e) {
        if (o.signal?.aborted) throw e
        lastErr = e
      }
      o.onDone?.(++done, pieces.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, pieces.length) }, worker))
  const parts = out.filter((t): t is string => !!t)
  if (!parts.length) throw lastErr instanceof AiError ? new AiError(/not with what was asked/.test(lastErr.message) ? "No tab found in the picture: try a sharper frame, or drag the box around the tab." : lastErr.message) : new AiError('No tab found in the picture.')
  return { text: parts.join('\n\n'), read: parts.length }
}
