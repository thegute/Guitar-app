// Style lenses: what the coach listens for, and leans its advice toward, in the style you're working on (your Zero to
// Hero style paths). One or two sentences each, handed to the AI coach with the clip and shown in its settings.
import { z2h } from '../learn/zeroHero'

export const LENSES: Record<string, { title: string; listen: string }> = {
  songwriter: { title: 'Acoustic singer-songwriter', listen: 'The alternating-thumb or boom-chuck pulse must stay steady while the ring finger and pinky add sus2, sus4, add9 and 6th hammer-ons mid-strum, without muting the open strings ringing next to them.' },
  prog: { title: 'Prog and prog metal', listen: 'Strings that should be silent stay muted across wide hybrid-picked intervals; legato runs are smooth with no pick scratch; the pocket stays steady in odd meters like 5/4 and 7/8; palm-muted chugs are tight and even.' },
  flatpick: { title: 'Bluegrass flatpicking', listen: 'Alternate picking stays strict (down on the beat, up on the and) through fast runs, crosspicking rolls are even in volume across the three strings, and the G run lands cleanly on beat 1.' },
  slackkey: { title: 'Hawaiian slack key', listen: 'The open bass strings keep ringing warmly under the melody (a steady alternating thumb), and melody notes and harmonies in 6ths ring into each other instead of being cut short.' },
  reggae: { title: 'Reggae rock', listen: 'Off-beat skanks are short, crisp and exactly on the "and" of each beat, with the strings muted dead between them; muted bubble scratches are even.' },
  bluesrock: { title: 'Blues-rock and neo-soul', listen: 'Bends reach their target pitch and are held in tune, vibrato is even and wide enough to hear, double-stops ring together, and phrases breathe instead of running on.' },
  popsoul: { title: 'Pop and soul', listen: 'Sixteenth-note muted strums stay even with the fretting hand lifting cleanly, chord stabs are short and together, and the groove sits a touch behind the beat rather than rushing.' },
  classical: { title: 'Classical guitar', listen: 'Each voice is clear: the melody sings above the accompaniment, bass notes last their full length, and rest strokes and free strokes are even in tone.' },
  fingerstyle: { title: 'Melodic fingerstyle', listen: 'The melody rings over the bass and inner notes without being cut off by the next fingering, the thumb keeps an even pulse, and held notes last their full value.' },
}

/** The lens for the style paths you follow (the first one that has a lens); undefined when you follow none. */
export function activeLens(paths: string[] | undefined = z2h().paths): { id: string; title: string; listen: string } | undefined {
  for (const id of paths ?? []) if (LENSES[id]) return { id, ...LENSES[id] }
  return undefined
}
