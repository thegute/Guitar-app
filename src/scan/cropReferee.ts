// Zoom-Crop Vision AI Referee: instead of asking a Vision LLM to watch a whole video or type out a full ASCII tab
// (which hallucinates and loses pixel coordinates), this takes ONLY the red/unsure (or audio-disputed) notes from
// KGuitar's own local scan, builds ONE compact numbered contact-sheet image of 2× zoomed crops with a red box around
// each target note, and asks Gemini/Groq a tight closed JSON question: "What fret is inside each red box?"
// - High-confidence agreement with tab_crnn → auto-confirms (clears unsure).
// - High-confidence disagreement → puts AI's fret first in `alts` + adds a plain hint for the Visual Checker (and
//   auto-swaps if the audio/runner-up already suggested that exact fret).
// - High-confidence "none" (blank/cursor/tie noise) → adds a hint so you can Delete in one tap.
import { ask, activeProvider } from '../assistant/providers'
import type { Song, SongNote } from '../tabs/model'
import type { Gray } from './image'

export interface CropVerdict {
  idx: number
  value: number | 'x' | 'none'
  confidence: 'high' | 'low'
}

export interface CropRefSummary {
  checked: number
  confirmed: number
  corrected: number
  flaggedBlank: number
}

const CROP_SYSTEM = `You inspect tiny zoomed-in crops of guitar tablature.
Each numbered tile (#1, #2, ...) shows a 6-string tab staff with ONE bright red square box centered on a single string position.
Read ONLY what is printed inside the red square box (ignore digits outside the box; neighboring digits are just context).
Reply with ONLY valid JSON: an array of objects, one per tile:
[{"id":1,"val":"8","conf":"high"}, ...]
Rules for "val":
- A fret integer string "0" through "24" if a fret number is printed inside the red box (read 0/9, 3/8, 5/6, 1/7, 11/14 carefully!)
- "x" if a muted/dead note X is printed inside the red box
- "none" if the red box contains ONLY empty staff line, a vertical cursor/playhead bar, a tie curve, or a bend label (1/2, full) with NO fret number
Rules for "conf": "high" when clearly readable, "low" when blurry or ambiguous.`

/** Parse the JSON array returned by the Zoom-Crop AI cleanly, tolerating markdown code fences. */
export function parseCropVerdicts(text: string): CropVerdict[] {
  const cleaned = text.replace(/```[a-z]*\n?|```/g, '').trim()
  const s = cleaned.indexOf('['), e = cleaned.lastIndexOf(']')
  if (s < 0 || e <= s) return []
  try {
    const arr = JSON.parse(cleaned.slice(s, e + 1)) as unknown[]
    if (!Array.isArray(arr)) return []
    const out: CropVerdict[] = []
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue
      const o = item as Record<string, unknown>
      const id = Number(o.id)
      const raw = String(o.val ?? '').trim().toLowerCase()
      const conf = String(o.conf ?? '').toLowerCase() === 'high' ? 'high' : 'low'
      if (!Number.isFinite(id) || id < 1) continue
      if (raw === 'x') out.push({ idx: id - 1, value: 'x', confidence: conf })
      else if (raw === 'none' || raw === 'empty' || raw === 'blank' || raw === '-') out.push({ idx: id - 1, value: 'none', confidence: conf })
      else if (/^\d{1,2}$/.test(raw)) {
        const n = Number(raw)
        if (n >= 0 && n <= 24) out.push({ idx: id - 1, value: n, confidence: conf })
      }
    }
    return out
  } catch {
    return []
  }
}

interface TargetSpot {
  note: SongNote & { hint?: string }
  src: NonNullable<SongNote['src']>
}

/** Build a single numbered contact-sheet PNG (base64) of zoomed crops around each target note with a red box. */
function buildContactSheet(pics: Gray[], targets: TargetSpot[]): string | null {
  if (typeof document === 'undefined' || !targets.length) return null
  const TILE_W = 240
  const TILE_H = 160
  const COLS = Math.min(3, targets.length)
  const ROWS = Math.ceil(targets.length / COLS)
  const sheet = document.createElement('canvas')
  sheet.width = COLS * TILE_W
  sheet.height = ROWS * TILE_H
  const ctx = sheet.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#18181f'
  ctx.fillRect(0, 0, sheet.width, sheet.height)

  // Cache rendered canvases per gray picture
  const picCache = new Map<number, HTMLCanvasElement>()
  const canvasFor = (pIdx: number): HTMLCanvasElement | null => {
    if (picCache.has(pIdx)) return picCache.get(pIdx)!
    const g = pics[pIdx]
    if (!g) return null
    const c = document.createElement('canvas')
    c.width = g.w
    c.height = g.h
    const cx = c.getContext('2d')
    if (!cx) return null
    const im = cx.createImageData(g.w, g.h)
    for (let i = 0; i < g.w * g.h; i++) {
      const v = Math.round(Math.max(0, Math.min(1, g.px[i])) * 255)
      im.data[i * 4] = v
      im.data[i * 4 + 1] = v
      im.data[i * 4 + 2] = v
      im.data[i * 4 + 3] = 255
    }
    cx.putImageData(im, 0, 0)
    picCache.set(pIdx, c)
    return c
  }

  targets.forEach((t, idx) => {
    const col = idx % COLS
    const row = Math.floor(idx / COLS)
    const ox = col * TILE_W
    const oy = row * TILE_H
    const srcCanvas = canvasFor(t.src.p)
    const g = pics[t.src.p]
    if (!srcCanvas || !g) return

    const staffH = Math.max(24, (t.src.y1 - t.src.y0) * g.h)
    const cropH = Math.min(g.h, staffH * 1.15)
    const cropW = Math.min(g.w, cropH * (TILE_W / TILE_H))
    const cx = t.src.x * g.w
    const cy = t.src.y * g.h
    const sx = Math.max(0, Math.min(g.w - cropW, cx - cropW / 2))
    const sy = Math.max(0, Math.min(g.h - cropH, ((t.src.y0 + t.src.y1) / 2) * g.h - cropH / 2))

    ctx.save()
    ctx.beginPath()
    ctx.rect(ox + 2, oy + 2, TILE_W - 4, TILE_H - 4)
    ctx.clip()
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(srcCanvas, sx, sy, cropW, cropH, ox + 2, oy + 2, TILE_W - 4, TILE_H - 4)

    // Draw bright red box right around the target digit inside the tile
    const rx = ox + 2 + ((cx - sx) / cropW) * (TILE_W - 4)
    const ry = oy + 2 + ((cy - sy) / cropH) * (TILE_H - 4)
    const boxSize = Math.max(20, Math.min(46, (staffH / 5) * ((TILE_H - 4) / cropH) * 1.45))
    ctx.strokeStyle = '#ff2222'
    ctx.lineWidth = 3
    ctx.strokeRect(rx - boxSize / 2, ry - boxSize / 2, boxSize, boxSize)

    // Numbered tile badge (#1, #2, ...)
    ctx.fillStyle = '#ff2222'
    ctx.fillRect(ox + 4, oy + 4, 34, 20)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 13px sans-serif'
    ctx.fillText(`#${idx + 1}`, ox + 9, oy + 18)
    ctx.restore()
  })

  return sheet.toDataURL('image/png').split(',')[1] ?? null
}

/**
 * Run a single fast Zoom-Crop Vision AI Referee pass on up to 12 unsure/disputed notes in `song`.
 * Mutates `song` in place (auto-confirming clear agreements, promoting AI suggestions to `alts[0]` + `hint`).
 * Safe no-op when no Vision AI key is configured or when there are no unsure notes with picture spots.
 */
export async function refineUnsureWithCropAi(
  song: Song,
  pics: Gray[],
  o: { signal?: AbortSignal; maxSpots?: number } = {},
): Promise<CropRefSummary> {
  const empty: CropRefSummary = { checked: 0, confirmed: 0, corrected: 0, flaggedBlank: 0 }
  if (!activeProvider(undefined, true) || !pics.length) return empty
  const track = song.tracks[0]
  if (!track) return empty

  const targets: TargetSpot[] = []
  const maxSpots = o.maxSpots ?? 12
  for (const b of track.bars) {
    for (const st of b.steps) {
      for (const n of st.notes as (SongNote & { hint?: string })[]) {
        if (n.unsure && n.src && pics[n.src.p]) {
          targets.push({ note: n, src: n.src })
          if (targets.length >= maxSpots) break
        }
      }
      if (targets.length >= maxSpots) break
    }
    if (targets.length >= maxSpots) break
  }
  if (!targets.length) return empty

  const b64 = buildContactSheet(pics, targets)
  if (!b64) return empty

  let text = ''
  try {
    text = await ask(
      CROP_SYSTEM,
      [{ role: 'user', text: `Inspect all ${targets.length} numbered tiles (#1 to #${targets.length}) and return the JSON array.`, image: { mime: 'image/png', b64 } }],
      { pictures: true, json: true, maxTokens: 900, hedgeMs: 4500, deadlineMs: 25000, signal: o.signal },
    )
  } catch {
    return empty
  }

  const verdicts = parseCropVerdicts(text)
  if (!verdicts.length) return empty

  const capo = track.capo ?? 0
  let confirmed = 0, corrected = 0, flaggedBlank = 0

  for (const v of verdicts) {
    const t = targets[v.idx]
    if (!t) continue
    const n = t.note
    const openMidi = track.tuning[n.string] ?? 40

    if (v.value === 'none') {
      if (v.confidence === 'high') {
        n.hint = 'Zoomed AI check: looks blank (cursor or stray line?) — tap Delete if no digit is there.'
        flaggedBlank++
      }
      continue
    }

    if (v.value === 'x') {
      if (n.tech === 'x' && v.confidence === 'high') {
        delete n.unsure
        confirmed++
      } else if (v.confidence === 'high') {
        n.hint = 'Zoomed AI check: looks like a dead note (x).'
      }
      continue
    }

    // Numeric fret verdict
    if (v.value === n.fret && n.tech !== 'x') {
      if (v.confidence === 'high') {
        delete n.unsure
        delete n.hint
        confirmed++
      }
      continue
    }

    // AI suggests a different fret!
    const alts = [v.value, ...(n.alts ?? []).filter(a => a !== v.value && a !== n.fret)].slice(0, 4)
    const alreadyRunnerUp = (n.alts ?? []).includes(v.value)
    if (v.confidence === 'high' && alreadyRunnerUp) {
      // Both neural runner-up / audio AND zoomed Vision AI agree on this exact fret → swap cleanly!
      n.alts = [n.fret, ...alts.filter(a => a !== v.value && a !== n.fret)].slice(0, 4)
      n.fret = v.value
      n.midi = openMidi + capo + v.value
      if (n.tech === 'x') delete n.tech
      delete n.unsure
      delete n.hint
      corrected++
    } else {
      // Keep unsure so the player visually confirms in 1 tap, with AI's pick right at the front!
      n.alts = alts
      n.hint = `Zoomed AI check suggests fret ${v.value}${v.confidence === 'high' ? ' (high confidence)' : ''}`
    }
  }

  return { checked: targets.length, confirmed, corrected, flaggedBlank }
}
