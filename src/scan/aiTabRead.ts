// High-resolution AI Vision tab reader for course PDFs, cropped tab sections, and diagram images.
// Uses the owner's configured AI vision provider (Google Gemini with MEDIA_RESOLUTION_HIGH, Groq, Claude, etc.)
// via src/assistant/providers.ts and parses the returned ASCII guitar tab cleanly into a SongDoc.
import { activeProvider, aiSettings, ask } from '../assistant/providers'
import type { Instrument } from '../instrument'
import { newId, type SongDoc } from '../tabs/library'
import { fromTextTab } from '../tabs/model'
import { parseTextTab } from '../tabs/textTab'
import { guessTabTempo } from '../audio/tempo'
import { midiName } from '../theory/notes'

/** True if the user has any vision-capable AI key configured in Settings → You → AI helper. */
export function hasVisionAi(): boolean {
  return !!activeProvider(aiSettings(), true)
}

/** Clean up markdown fences, unicode dashes, and stray prose so parseTextTab gets crisp ASCII tab blocks. */
export function normalizeAiTabText(raw: string): string {
  let s = raw.replace(/\r\n?/g, '\n').trim()
  // Prefer fenced code block(s) if the model wrapped the tab in ```...```
  const fences = [...s.matchAll(/```(?:[a-zA-Z0-9_-]*)?\n([\s\S]*?)```/g)].map(m => m[1].trim()).filter(Boolean)
  if (fences.length) s = fences.join('\n\n')
  // Replace unicode en/em dashes with ASCII hyphens
  s = s.replace(/[–—−]/g, '-')
  return s
}

/** Extract and parse an AI Vision reply into a playable SongDoc (pure, unit-testable). */
export function extractTabFromAiReply(
  reply: string,
  inst: Instrument,
  title: string,
  youtube?: string,
  tuningNotes?: string[],
): SongDoc | null {
  const cleaned = normalizeAiTabText(reply)
  const notes = tuningNotes && tuningNotes.length === inst.strings ? tuningNotes : inst.tuning.notes
  const parsed = parseTextTab(cleaned, title, notes)
  if (!parsed) return null
  const song = fromTextTab(parsed)
  if (title) song.title = title
  // Also pick up an explicit BPM line if the model read one from the page (e.g. "BPM: 100")
  const bpmMatch = reply.match(/\b(?:BPM|Tempo)\s*[:=]\s*(\d{2,3})\b/i)
  if (bpmMatch) {
    const b = Number(bpmMatch[1])
    if (b >= 35 && b <= 260) song.tempo = b
  }
  if (!song.tempo) {
    const durs = song.tracks[0]?.bars.flatMap(b => b.steps.filter(st => st.notes.length).map(st => st.dur)) ?? []
    song.tempo = guessTabTempo(durs)
    song.tempoFrom = 'guess'
  }
  const totalNotes = song.tracks[0]?.bars.reduce((a, b) => a + b.steps.reduce((x, st) => x + st.notes.length, 0), 0) ?? 0
  if (totalNotes < 2) return null
  return {
    id: newId(),
    title: song.title || title,
    source: 'text',
    inst: inst.id,
    song,
    youtube,
    updated: Date.now(),
  }
}

/**
 * Send a high-res PNG/JPEG data URL (cropped tab box or full course PDF page) to the user's configured
 * Vision AI (e.g. Gemini Flash with MEDIA_RESOLUTION_HIGH) and return a playable SongDoc.
 */
export async function readTabImageWithAi(
  dataUrl: string,
  inst: Instrument,
  title: string,
  youtube?: string,
  targetMidis?: number[],
): Promise<SongDoc> {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) throw new Error('Invalid tab image data.')
  const header = dataUrl.slice(0, comma)
  const mimeMatch = header.match(/data:([^;]+);base64/i)
  const mime = mimeMatch ? mimeMatch[1] : 'image/png'
  const b64 = dataUrl.slice(comma + 1)

  const tuningNotes = targetMidis && targetMidis.length === inst.strings
    ? targetMidis.map(m => midiName(m, false))
    : inst.tuning.notes
  const topToBottom = [...tuningNotes].reverse().map((n, i, a) => {
    const pc = n.replace(/-?\d+$/, '')
    return i === 0 && a.length === 6 && pc === 'E' ? 'e' : pc
  })

  const system = [
    `You are an expert guitar teacher transcribing printed ${inst.strings}-string guitar TAB from an image into exact, playable ASCII guitar tab.`,
    'Rules:',
    `1. Read ONLY the ${inst.strings}-line guitar TAB staves. COMPLETELY IGNORE 5-line standard music notation (treble clef), fretboard neck/scale diagrams, chord box diagrams, finger numbers (1 2 3 4) in circles or below the staff, and page headers.`,
    '2. Read EVERY SINGLE fret number on EVERY string carefully from left to right — do NOT skip fast 16th-note runs, double-digit frets (10, 12, 14, 15, 17, etc.), or colored/highlighted root notes.',
    '3. Keep double-digit fret numbers together (e.g. -12- not -1-2-) and vertically align simultaneous chord/double-stop notes in the exact same column.',
    '4. Preserve barlines (|), techniques (h, p, /, \\, b, ~, x), and relative horizontal spacing for rhythm.',
    `5. Format each tab system as exactly ${inst.strings} lines labeled top-to-bottom: ${topToBottom.map(s => `${s}|`).join(' ')}. Separate systems with one blank line.`,
    '6. If a tempo like "♩ = 100" is printed, put one line `BPM: 100` above the tab. Output ONLY the optional BPM line and the ASCII tab block(s) — no explanations.',
  ].join('\n')

  const user = `Transcribe every guitar TAB note shown in this image (${title}) accurately. Double-check every bar so no notes are missed.`

  const reply = await ask(
    system,
    [{ role: 'user', text: user, image: { mime, b64 } }],
    {
      pictures: true,
      highRes: true,
      maxTokens: 4096,
      accept: text => !!extractTabFromAiReply(text, inst, title, youtube, tuningNotes),
    },
  )

  const doc = extractTabFromAiReply(reply, inst, title, youtube, tuningNotes)
  if (!doc) throw new Error('AI Vision could not find a readable guitar tab in that area — try cropping tighter around just the 6-line tab.')
  return doc
}
