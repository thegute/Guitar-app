// The built-in planner: "I wanna practise triads today" → a ready session, no AI needed. The assistant uses the same
// recipes (and can change them) when an AI key is set up.
import { KEYS } from '../theory/notes'
import type { Session, Step } from './session'

export interface Plan { reply: string; session?: Session }
const id = () => Math.random().toString(36).slice(2, 8)
const warm: Step = { title: 'Warm up', minutes: 4, target: { exercise: 'type:warmup' }, tip: 'Slow and clean with the metronome. Pick one and play it 3 times clean, then add 5 BPM.' }

function keyIn(q: string): { key?: string; minor?: boolean } {
  const m = /\bin ([A-G])([#b♯♭]?)(m|min| minor)?\b/i.exec(q)
  if (!m) return {}
  const letter = m[1].toUpperCase()
  const acc = m[2] === '#' || m[2] === '♯' ? 1 : m[2] === 'b' || m[2] === '♭' ? -1 : 0
  const pcs: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  return { key: KEYS[(pcs[letter] + acc + 12) % 12], minor: !!m[3] }
}
const bpmIn = (q: string) => { const m = /(\d{2,3})\s*(bpm|beats)/i.exec(q); return m ? Math.max(40, Math.min(220, Number(m[1]))) : undefined }
const minutesIn = (q: string) => { const m = /(\d{1,3})\s*(min|minute)/i.exec(q); return m ? Number(m[1]) : undefined }

/** Scale every step so the session lasts about `total` minutes. */
function fit(steps: Step[], total?: number): Step[] {
  if (!total) return steps
  const sum = steps.reduce((a, s) => a + s.minutes, 0)
  return steps.map(s => ({ ...s, minutes: Math.max(2, Math.round((s.minutes * total) / sum)) }))
}

interface Recipe { test: RegExp; title: string; reply: string; steps: (k: { key?: string; minor?: boolean; bpm?: number }) => Step[] }
const RECIPES: Recipe[] = [
  {
    test: /triad/i, title: 'Triads today',
    reply: "Here's a triads session: warm up, the triad shapes on each string set, then use them over a beat so they turn into music.",
    steps: k => [warm,
      { title: 'Triad shapes and inversions', minutes: 10, target: { exercise: 'type:triads' }, tip: 'Say the chord name out loud as you play each shape. Start on the top three strings.' },
      { title: 'Triads all over the neck', minutes: 6, target: { go: { tool: 'caged' } }, tip: 'Find the same chord in three places, moving up the neck.' },
      { title: 'Triads over a beat', minutes: 8, target: { jam: { page: 'beats' } }, beat: { starter: 'pop', key: k.key ?? 'G', minor: k.minor ?? false }, tip: 'Open "Practise over it": play the triad of each chord as it comes round, close to where your hand already is.' }],
  },
  {
    test: /caged|note switch|melod(y|ies) in.?between|little melod/i, title: 'CAGED with little melodies',
    reply: "Here's a CAGED session: the five shapes, then short melodies that connect them, then improvising with both over a backing.",
    steps: k => [warm,
      { title: 'The five CAGED shapes', minutes: 8, target: { go: { tool: 'caged' } }, tip: 'One chord, five places. Play each shape, then slide to the next.' },
      { title: 'Little melodies between the chords', minutes: 8, target: { exercise: 'type:melodic' }, tip: 'Short phrases that lead from one chord shape into the next.' },
      { title: 'Scale sequences in one shape', minutes: 5, target: { exercise: 'type:sequences' } },
      { title: 'Jam: chord, melody, chord', minutes: 8, target: { jam: { page: 'solo', ...(k.key ? { key: k.key } : {}) } }, tip: 'Strum a chord shape, play a little melody, land in the next shape on the chord change.' }],
  },
  {
    test: /chord.?tone|solo|improvi|lead/i, title: 'Chord tones and soloing',
    reply: "Here's a soloing session: chord tones through the changes first, then soloing over a loop landing on them.",
    steps: k => [warm,
      { title: 'Chord tones through the changes', minutes: 10, target: { exercise: 'type:changes' }, tip: 'Hit the root, 3rd or 5th of each chord right when it changes.' },
      { title: 'Arpeggios', minutes: 5, target: { exercise: 'type:arpeggios' } },
      { title: 'Solo over the loop', minutes: 10, target: { jam: { page: 'solo', ...(k.key ? { key: k.key, mode: k.minor ? 'minor' : 'major' } : {}) } }, tip: 'Land on the gold notes when each chord starts. Leave space: short phrases, then rest.' }],
  },
  {
    test: /marco|cirillo|fingerstyle|finger.?pick|melodic acoustic/i, title: 'Melodic fingerstyle',
    reply: "Here's a melodic fingerstyle session in that style: thumb independence, then the melodic exercises, then licks. For one of his actual pieces, get the tab (search Songsterr or his own tab books) and open it in Play: the mic follows you note by note.",
    steps: () => [{ ...warm, target: { exercise: 'type:fingerstyle' }, title: 'Thumb and fingers warm-up' },
      { title: 'How the style works', minutes: 4, target: { go: { technique: 'melodic' } } },
      { title: 'Melodic fingerstyle exercises', minutes: 12, target: { exercise: 'type:melodic' }, tip: 'Let every note ring. Melody on top, thumb steady underneath.' },
      { title: 'Fingerstyle licks', minutes: 6, target: { exercise: 'type:lick:fingerstyle' } }],
  },
  {
    test: /blues/i, title: 'Blues',
    reply: "Here's a blues session: licks, then jamming over a 12-bar.",
    steps: k => [warm,
      { title: 'Blues licks', minutes: 8, target: { exercise: 'type:lick:blues' } },
      { title: 'Bends in tune', minutes: 5, target: { exercise: 'type:bends' } },
      { title: 'Jam over a blues', minutes: 10, target: { jam: { page: 'solo', style: 'blues', key: k.key ?? 'A', mode: 'minor' } } }],
  },
  {
    test: /rhythm|strum|timing|groove/i, title: 'Rhythm and strumming',
    reply: "Here's a rhythm session: timing first, then strumming patterns, then playing along with a band.",
    steps: () => [warm,
      { title: 'Rhythm and timing', minutes: 8, target: { exercise: 'type:rhythm' } },
      { title: 'Strumming patterns', minutes: 8, target: { exercise: 'type:strumming' } },
      { title: 'Strum along with the band', minutes: 8, target: { jam: { page: 'jam' } } }],
  },
  {
    test: /speed|fast|shred|picking|alternate/i, title: 'Speed and picking',
    reply: 'Here\'s a picking session. Rule of thumb: drop the tempo 20% when it gets shaky, add 5 BPM after 3 clean runs.',
    steps: () => [warm,
      { title: 'Alternate picking', minutes: 8, target: { exercise: 'type:alt' } },
      { title: 'Picking drills', minutes: 8, target: { exercise: 'type:picking' } },
      { title: 'Scale sequences', minutes: 6, target: { exercise: 'type:sequences' } }],
  },
  {
    test: /barre/i, title: 'Barre chords',
    reply: "Here's a barre chord session.",
    steps: () => [warm,
      { title: 'Barre chord drills', minutes: 10, target: { exercise: 'type:barre' } },
      { title: 'One-minute changes', minutes: 6, target: { go: { tool: 'changes' } } },
      { title: 'Strum them in a song', minutes: 8, target: { jam: { page: 'jam' } } }],
  },
  {
    test: /beat|drum|trap|hip.?hop|edm|house/i, title: 'Make a beat',
    reply: "Opening the beat maker with a starter beat. Tap the pattern buttons to stack layers, or press ● and drum on the pads: each pass becomes a layer.",
    steps: k => [{ title: 'Make a beat', minutes: 15, target: { jam: { page: 'beats' } }, beat: { starter: /trap|rap|hip/i.test(String(k.key)) ? 'trap' : undefined, bpm: k.bpm } }],
  },
]

/** A session for a request, without AI. Null when the request isn't about practising. */
export function builtInPlan(q: string): Plan | null {
  const k = { ...keyIn(q), bpm: bpmIn(q) }
  const r = RECIPES.find(x => x.test.test(q))
  if (!r) return null
  let steps = fit(r.steps(k), minutesIn(q))
  if (r.title === 'Make a beat') {
    const starter = /trap/i.test(q) ? 'trap' : /boom|rap|hip/i.test(q) ? 'boombap' : /edm|house|dance/i.test(q) ? 'edm' : /prog/i.test(q) ? 'progmetal' : /rock/i.test(q) ? 'rock' : /country/i.test(q) ? 'country' : /hawai|island/i.test(q) ? 'hawaiian' : /lo.?fi/i.test(q) ? 'lofi' : 'pop'
    steps = [{ ...steps[0], beat: { starter, bpm: k.bpm, key: k.key, minor: k.minor } }]
  }
  return { reply: r.reply, session: { id: id(), title: r.title + (k.key ? ` in ${k.key}${k.minor ? 'm' : ''}` : ''), steps } }
}
export const RECIPE_TITLES = RECIPES.map(r => r.title)
