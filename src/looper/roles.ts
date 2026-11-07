// The four looper tracks' usual jobs (defaults: any track can do anything).
export type Role = 'rhythm' | 'embellish' | 'bass' | 'lead'
export const ROLES: { role: Role; label: string; hint: string }[] = [
  { role: 'rhythm', label: 'Rhythm', hint: 'Chords and strumming: the bed the rest sits on.' },
  { role: 'embellish', label: 'Embellishments', hint: 'Hammer-ons, sus and add9 colours, little counter-melodies between the chords.' },
  { role: 'bass', label: 'Bass', hint: 'Play a bassline on your guitar: it plays back an octave lower, like a bass guitar.' },
  { role: 'lead', label: 'Lead', hint: 'Melodies, solos and harmonies: the other tracks dip a little while it plays so it stands out.' },
]
