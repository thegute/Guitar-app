// Ask the AI for a known song's tempo and time signature (a pasted tab or a screenshot has none written down).
// Only answers it's sure of are used; otherwise the guess from the notes stays and the badge says so.
import { activeProvider, ask } from './providers'

export interface TempoAnswer { bpm: number; timeSig?: [number, number] }

const SYSTEM = `You know the tempos of recorded songs. Given a song title (and maybe the artist), answer with JSON only:
{"bpm": number or null, "timeSig": "4/4" | "3/4" | "6/8" | "12/8" | "5/4" | "7/8" | "2/4" | null, "sure": true or false}
bpm = quarter-note beats per minute of the best-known recording (for 6/8 and 12/8 still give quarter-note BPM:
dotted-quarter × 1.5). Say sure: false and bpm: null if you don't know this exact song. Never guess from the title alone.`

export const canAskTempo = () => !!activeProvider()

export async function askTempo(title: string, artist?: string): Promise<TempoAnswer | null> {
  if (!activeProvider() || !title.trim() || /^(pasted tab|song|untitled|scanned riff)/i.test(title.trim())) return null
  try {
    const raw = await ask(SYSTEM, [{ role: 'user', text: `Song: ${title}${artist ? ` by ${artist}` : ''}` }], { json: true, maxTokens: 120 })
    return parseTempoAnswer(raw)
  } catch { return null }
}

export function parseTempoAnswer(raw: string): TempoAnswer | null {
  try {
    const j = JSON.parse(raw.replace(/^[^{]*/, '').replace(/[^}]*$/, '')) as { bpm?: number | null; timeSig?: string | null; sure?: boolean }
    if (!j.sure || typeof j.bpm !== 'number' || j.bpm < 40 || j.bpm > 260) return null
    const m = /^(\d+)\/(\d+)$/.exec(j.timeSig ?? '')
    return { bpm: Math.round(j.bpm), ...(m ? { timeSig: [Number(m[1]), Number(m[2])] as [number, number] } : {}) }
  } catch { return null }
}
