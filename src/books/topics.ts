// The topics KGuitar's screens are about, so "In your books" chips can link a screen to the pages of the owner's own
// books that cover the same thing. Only the topic names live here (public code); which book pages match is in his
// private book pack (tools/make_book_pack.py, kept on his phone, never in the repo).
export interface BookTopic { id: string; label: string; words: RegExp }

export const BOOK_TOPICS: BookTopic[] = [
  // fretboard and theory
  { id: 'fretboard-notes', label: 'Notes on the neck', words: /notes? on the (neck|fretboard)|fretboard (notes|map)|natural notes|memoriz/i },
  { id: 'caged', label: 'CAGED', words: /\bCAGED\b|five (shapes|forms)|C shape|A shape|E shape|G shape|D shape/i },
  { id: 'intervals', label: 'Intervals', words: /\bintervals?\b|major third|minor third|perfect fifth|octave shape/i },
  { id: 'major-scale', label: 'The major scale', words: /major scale|do re mi|whole.?step|half.?step|scale degrees?/i },
  { id: 'pentatonic', label: 'Pentatonic scales', words: /pentatonic/i },
  { id: 'dominant-pentatonic', label: 'Dominant pentatonic', words: /dominant pentatonic|mixolydian pentatonic/i },
  { id: 'modes', label: 'Modes', words: /\b(dorian|phrygian|lydian|mixolydian|aeolian|locrian|ionian)\b|\bmodes?\b/i },
  { id: 'triads', label: 'Triads and inversions', words: /\btriads?\b|inversions?|first inversion|second inversion|root position/i },
  { id: 'chord-tones', label: 'Chord tones and arpeggios', words: /chord tones?|arpeggios?/i },
  { id: 'chord-building', label: 'How chords are built', words: /chord (construction|formula|spelling)|build(ing)? chords|seventh chords?|7th chords?/i },
  { id: 'circle-of-fifths', label: 'Circle of fifths and keys', words: /circle of (fifths|fourths)|key signatures?|relative minor/i },
  { id: 'harmony', label: 'Harmony and progressions', words: /diatonic|roman numerals?|cadences?|chord progressions?|ii.?V.?I|harmoni[sz]/i },
  { id: 'voice-leading', label: 'Voice leading', words: /voice.?leading|common tones?|smooth(est)? (voice|motion)/i },
  { id: 'improvising', label: 'Improvising', words: /improvis|soloing|make up (your own )?(lines|melodies)|phrasing/i },
  { id: 'ear', label: 'Ear training', words: /ear training|by ear|hear the|sing (the|it)|recogni[sz]e (the )?(intervals|chords)/i },
  { id: 'rhythm', label: 'Rhythm and timing', words: /eighth notes?|sixteenth|triplets?|syncopat|counting|metronome|strum(ming)? patterns?/i },
  // technique
  { id: 'alternate-picking', label: 'Alternate picking', words: /alternate picking|down.?up|pick direction/i },
  { id: 'crosspicking', label: 'Crosspicking', words: /cross.?picking/i },
  { id: 'hammer-on', label: 'Hammer-ons and pull-offs', words: /hammer.?ons?|pull.?offs?|legato/i },
  { id: 'slide', label: 'Slides', words: /\bslides?\b|sliding/i },
  { id: 'bend', label: 'Bends and vibrato', words: /\bbends?\b|bending|vibrato/i },
  { id: 'sweep', label: 'Sweep picking', words: /sweep(ing)?|economy picking/i },
  { id: 'tapping', label: 'Tapping', words: /\btapping\b|two.?hand/i },
  { id: 'shred', label: 'Speed and shred licks', words: /\bshred|speed|fast licks?|sequences?\b/i },
  { id: 'harmonics', label: 'Harmonics', words: /harmonics?|chimes?/i },
  // styles
  { id: 'flatpicking', label: 'Flatpicking', words: /flat.?pick/i },
  { id: 'bluegrass-rhythm', label: 'Bluegrass rhythm', words: /boom.?chuck|bass.?strum|bluegrass rhythm|alternating bass/i },
  { id: 'g-runs', label: 'G runs and bass runs', words: /\bG.?runs?\b|bass runs?|walk(ing)? (up|down)/i },
  { id: 'fiddle-tunes', label: 'Fiddle tunes', words: /fiddle tunes?|breakdown|\breel\b|hornpipe/i },
  { id: 'travis', label: 'Travis picking', words: /travis|thumb.?pick|alternating thumb|fingerpick/i },
  { id: 'fingerstyle', label: 'Fingerstyle', words: /finger.?style|fingerpicking|p.?i.?m.?a/i },
  { id: 'celtic', label: 'Celtic guitar', words: /celtic|irish|scottish|\bjig\b|\breel\b|DADGAD/i },
  { id: 'dadgad', label: 'DADGAD', words: /DADGAD/i },
  { id: 'slack-key', label: 'Slack key', words: /slack.?key|k[iī].? h[oō].?alu|taro patch|open G/i },
  { id: 'open-tunings', label: 'Open tunings', words: /open (G|D|C|E) tuning|open tunings?|taro patch|DADGAD|drop D/i },
  { id: 'blues', label: 'Blues', words: /\bblues\b|12.?bar|shuffle/i },
  { id: 'country', label: 'Country guitar', words: /\bcountry\b|chicken pick|hybrid picking/i },
  { id: 'songs', label: 'Songs to play', words: /\b(verse|chorus|bridge|intro|outro)\b/i },
]

export const topicById = (id: string) => BOOK_TOPICS.find(t => t.id === id)
