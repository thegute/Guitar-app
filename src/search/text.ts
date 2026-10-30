// Turning what you type into search terms: lower case, word stems ("tuning" and "tuner" → "tun"), phrases that only
// mean something together ("palm mute", "drop D", "circle of fifths"), filler words dropped ("how do I …"), and
// groups of words that mean the same thing here ("slow", "slower", "half speed" → speed). Pure: no DOM.

export function normalize(q: string): string {
  return q.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[’‘`´]/g, "'")
    .replace(/♯/g, '#').replace(/♭/g, 'b')
    .replace(/½/g, ' half ').replace(/¾/g, ' three quarter ')
    .replace(/&/g, ' and ')
    .replace(/(\w)'(s|t|re|ve|ll|d|m)\b/g, '$1$2')
}

/** The words of a query, keeping # (C#), / (6/8) and + (C+) inside words. */
export function words(q: string): string[] {
  return normalize(q).split(/[^a-z0-9#/+]+/).map(w => w.replace(/^[/+]+|[/]+$/g, '')).filter(Boolean)
}

/** A light English stemmer: the same rules run on the app's text and on the query, so they only need to agree. */
export function stem(w: string): string {
  if (w.length <= 3 || /\d|#/.test(w)) return w
  let s = w
  if (s.endsWith('ies') && s.length > 4) s = s.slice(0, -3) + 'y'
  else if (s.endsWith('sses')) s = s.slice(0, -2)
  else if (s.endsWith('s') && !/(ss|us|is)$/.test(s)) s = s.slice(0, -1)
  if (s.endsWith('ing') && s.length > 5) s = s.slice(0, -3)
  else if (s.endsWith('ed') && s.length > 4) s = s.slice(0, -2)
  else if (s.endsWith('er') && s.length > 4) s = s.slice(0, -2)
  else if (s.endsWith('ly') && s.length > 4) s = s.slice(0, -2)
  if (/([b-df-hj-km-np-tv-z])\1$/.test(s) && !/(ll|ss|zz)$/.test(s)) s = s.slice(0, -1)
  if (s.endsWith('e') && s.length > 3) s = s.slice(0, -1)
  return s
}

/** Filler words: dropped unless they are part of a phrase. */
export const STOP = new Set(('a an the i me my mine myself you your we our us it its this that these those there here ' +
  'how do does did doing done can could would should will shall may might must to of for in on at by with without from into onto ' +
  'about as is are am was were be been being have has had having what which who whom whose why when where whats wheres hows ' +
  'want wanna need needs like please show tell find give get got go goes going open opening use using used ' +
  'app kguitar some any just really so too very much many more most also only then than again and or but if not no yes ok okay ' +
  'hey hi hello lets let try trying able im ive id dont doesnt cant cannot wont isnt arent didnt thing things something stuff ' +
  'way ways one ones all every each other another same own way').split(' '))

/** Phrases that mean one thing (matched on stems, so "palm muting" and "palm mutes" both count). */
const PHRASE_LIST: [string, string][] = [
  ['palm mute', 'palmmute'], ['hammer on', 'hammeron'], ['pull off', 'pulloff'], ['circle of fifths', 'circlefifths'],
  ['circle of 5ths', 'circlefifths'], ['circle of fourths', 'circlefifths'], ['drop d', 'dropd'], ['drop c', 'dropc'],
  ['open g', 'openg'], ['open d', 'opend'], ['half step down', 'halfdown'], ['eb standard', 'halfdown'], ['e flat standard', 'halfdown'],
  ['in time', 'intime'], ['on time', 'intime'], ['wait for me', 'waitforme'], ['chord melody', 'chordmelody'],
  ['speed trainer', 'speedtrainer'], ['ear training', 'eartrain'], ['ear trainer', 'eartrain'], ['by ear', 'byear'],
  ['guitar pro', 'guitarpro'], ['ultimate guitar', 'ultimateguitar'], ['full screen', 'fullscreen'], ['split screen', 'splitscreen'],
  ['set up', 'setup'], ['back up', 'backup'], ['how to use', 'howtouse'], ['start over', 'restart'], ['from the top', 'restart'],
  ['from the start', 'restart'], ['from the beginning', 'restart'], ['dark mode', 'night'], ['light mode', 'day'],
  ['night mode', 'night'], ['day mode', 'day'], ['google drive', 'drive'], ['new phone', 'newphone'], ['play along', 'playalong'],
  ['play back', 'playback'], ['hear it', 'hearit'], ['page turner', 'pageturner'], ['foot switch', 'footswitch'], ['hands free', 'handsfree'],
  ['note name', 'notename'], ['tab number', 'tabnumber'], ['fret number', 'tabnumber'], ['where your fingers go', 'handshape'],
  ['hand shape', 'handshape'], ['hand position', 'handshape'], ['which finger', 'handshape'], ['what finger', 'handshape'],
  ['one minute', 'oneminute'], ['chord change', 'chordchange'], ['switch chord', 'chordchange'], ['change chord', 'chordchange'],
  ['changing chord', 'chordchange'], ['switching chord', 'chordchange'], ['strum pattern', 'strumpattern'], ['strumming pattern', 'strumpattern'],
  ['travis pick', 'travis'], ['finger pick', 'fingerpick'], ['finger style', 'fingerpick'], ['fingerstyle', 'fingerpick'],
  ['alternate pick', 'altpick'], ['backing track', 'backingtrack'], ['chord progression', 'progression'], ['find chord', 'findchords'],
  ['figure out', 'figureout'], ['work out', 'figureout'], ['what chord', 'whatchords'], ['which chord', 'whatchords'],
  ['music theory', 'theory'], ['song check', 'songcheck'], ['how hard', 'howhard'], ['too hard', 'howhard'], ['too fast', 'toofast'],
  ['slow down', 'slowdown'], ['speed up', 'speedup'], ['go faster', 'speedup'], ['wrong note', 'wrongnote'], ['not hear', 'notheard'],
  ['not pick', 'notheard'], ['not detect', 'notheard'], ['not register', 'notheard'], ['not listen', 'notheard'], ['not working', 'notworking'],
  ['doesnt work', 'notworking'], ['wont work', 'notworking'], ['cant hear', 'notheard'], ['doesnt hear', 'notheard'], ['wont hear', 'notheard'],
  ['doesnt detect', 'notheard'], ['doesnt pick', 'notheard'], ['isnt hear', 'notheard'], ['phone mic', 'phonemic'], ['usb amp', 'usbamp'],
  ['audio interface', 'usbamp'], ['a b loop', 'abloop'], ['a b repeat', 'abloop'], ['tap tempo', 'taptempo'], ['tap along', 'tapsync'],
  ['time signature', 'timesig'], ['drum beat', 'drumbeat'], ['drum machine', 'drumbeat'], ['reference tone', 'reftone'],
  ['tune by ear', 'reftone'], ['your samurai', 'samurai'], ['moving colour', 'motion'], ['moving color', 'motion'], ['reduce motion', 'motion'],
  ['key signature', 'keysig'], ['what key', 'whatkey'], ['which key', 'whatkey'], ['twelve bar', 'twelvebar'], ['12 bar', 'twelvebar'],
  ['daily goal', 'goal'], ['streak freeze', 'freeze'], ['away from my guitar', 'away'], ['without my guitar', 'away'], ['without a guitar', 'away'],
  ['without guitar', 'away'], ['no guitar', 'away'], ['about you', 'aboutyou'], ['my level', 'aboutyou'], ['skill level', 'aboutyou'],
  ['hide the menu', 'hidemenu'], ['hide menu', 'hidemenu'], ['pinch zoom', 'pinch'], ['zoom in', 'zoom'], ['zoom out', 'zoom'],
  ['practice course', 'course'], ['path to mastery', 'mastery'], ['power chord', 'powerchord'], ['barre chord', 'barre'], ['bar chord', 'barre'],
  ['exact octave', 'octave'], ['other guitar', 'band'], ['the band', 'band'], ['record myself', 'recordme'], ['record yourself', 'recordme'],
  ['listen back', 'recordme'], ['share to', 'sharein'], ['share into', 'sharein'], ['share from', 'sharein'], ['send to', 'sharein'],
  ['how am i doing', 'howdoing'], ['how i am doing', 'howdoing'], ['how far', 'howdoing'], ['what can it do', 'whatcando'],
  ['what can i do', 'whatcando'], ['what does it do', 'whatcando'], ['where do i start', 'whatcando'], ['getting started', 'whatcando'],
  ['scales and chords', 'solopanel'], ['scale and chord', 'solopanel'], ['solo over', 'soloover'], ['what to play over', 'soloover'],
  ['improvise over', 'soloover'], ['make a tab', 'maketab'], ['make tab', 'maketab'], ['turn into a tab', 'maketab'], ['into a tab', 'maketab'],
]
const PHRASES: { stems: string[]; token: string }[] = PHRASE_LIST
  .map(([p, t]) => ({ stems: words(p).map(stem), token: '_' + t }))
  .sort((a, b) => b.stems.length - a.stems.length)

/** Words that mean the same thing in this app. A word can be in more than one group. */
const GROUPS: Record<string, string> = {
  speed: 'slow slower slowly slowdown speed fast faster quick quicker half quarter toofast speedup _slowdown _toofast _speedup',
  tempo: 'tempo bpm beat beats pulse metronome click clicks tick _taptempo',
  loop: 'loop loops looping repeat repeating cycle section bit passage _abloop',
  tune: 'tune tuner tuning tuned tunings intune detune pitch _reftone _dropd _dropc _openg _opend _halfdown',
  record: 'record recording recorder capture tape _recordme',
  video: 'video videos youtube yt clip clips watch _tapsync',
  hearing: 'mic microphone listen listening hear hearing detect detection recognize recognise sensitivity sensitive input _notheard _phonemic',
  usb: 'usb amp amplifier interface amphonix sonicake electric plug plugged cable _usbamp',
  song: 'song songs tab tabs tablature sheet music piece pieces track tracks',
  add: 'add import upload load paste download file files new _guitarpro _ultimateguitar songsterr gp gp5 gpx',
  chord: 'chord chords shape shapes voicing voicings grip grips diagram diagrams',
  scale: 'scale scales mode modes pentatonic',
  jam: 'jam jams jamming backing accompaniment groove progression progressions _backingtrack _playalong _progression',
  solo: 'solo solos soloing improvise improvising improvisation lead noodle shred _soloover',
  theory: 'theory lesson lessons explain understand concept concepts chapter',
  ear: 'ear ears interval intervals aural _eartrain _byear',
  look: 'look theme themes colour colours color colors appearance dark light night day psychedelic trippy background wallpaper skin _night _day',
  dog: 'dog dogs samurai puppy pup avatar mascot brandy lab breed character _samurai',
  art: 'art artwork picture pictures image images poster gallery drawing drawings illustration',
  backup: 'backup save restore export transfer drive _backup _drive _newphone',
  remind: 'reminder reminders notification notifications notify alert alarm nudge',
  streak: 'streak streaks goal goals daily habit xp level levels badge badges quest quests reward rewards points freeze _goal _freeze',
  progress: 'progress stats statistics history calendar improvement improving trend trends graph graphs _howdoing',
  size: 'big bigger larger large zoom enlarge magnify size font small smaller tiny pinch readable _pinch _zoom',
  notes: 'note notes name names letter letters _notename _tabnumber',
  hand: 'finger fingers fingering hand hands fretting position positions _handshape',
  count: 'count counting rhythm rhythms timing stems _strumpattern',
  strum: 'strum strums strumming stroke strokes _strumpattern',
  pick: 'pick picking plectrum _altpick _fingerpick _travis',
  band: 'band drums drum drummer bass bassist _band',
  hearit: 'hearit playback demo preview example _hearit _playback',
  sound: 'sound sounds tone tones acoustic nylon electric distortion distorted crunch clean metal j45 overdrive',
  pedal: 'pedal pedals footswitch midi bluetooth foot _pageturner _footswitch _handsfree',
  inst: 'ukulele uke ukes baritone tenor instrument instruments',
  help: 'help guide manual tutorial instructions tour welcome faq _howtouse _whatcando',
  fold: 'fold folding folded tabletop laptop half _splitscreen',
  focus: 'focus distraction immersive _fullscreen _hidemenu',
  menu: 'menu nav navigation sidebar rail drawer _hidemenu',
  wrong: 'wrong mistake mistakes error errors missed miss incorrect _wrongnote',
  broken: 'broken problem problems issue issues fix trouble _notworking _notheard',
  key: 'key keys tonality _keysig _whatkey',
  neck: 'fretboard neck fret frets memorize memorise _notename',
  bend: 'bend bends bending vibrato wobble',
  technique: 'technique techniques skill skills exercise exercises drill drills warmup warm',
  lick: 'lick licks riff riffs phrase phrases',
  find: 'transcribe transcription identify recognize recognise shazam _findchords _figureout _whatchords',
  intime: 'intime score scoring scored accuracy _intime',
  wait: 'follow waitforme pace _waitforme',
  quiz: 'quiz quizzes test tests flashcard flashcards question questions _course',
  songbook: 'songbook folk bluegrass reggae traditional standards',
  restart: 'restart reset beginning _restart',
  away: 'away travel work commute _away',
  share: 'share sharing _sharein',
}
const CONCEPTS = new Map<string, string[]>()
for (const [g, list] of Object.entries(GROUPS)) {
  for (const w of list.split(' ')) {
    const t = w.startsWith('_') ? w : stem(w)
    CONCEPTS.set(t, [...(CONCEPTS.get(t) ?? []), '~' + g])
  }
}
/** The groups a term belongs to ("~speed", …). */
export const conceptsOf = (t: string) => CONCEPTS.get(t) ?? []

/** Search terms for a piece of text: stems and phrase tokens, filler words left out. */
export function terms(text: string, keepStop = false): string[] {
  const ws = words(text)
  const st = ws.map(stem)
  const out: string[] = []
  for (let i = 0; i < st.length;) {
    const ph = PHRASES.find(p => p.stems.every((s, k) => st[i + k] === s))
    if (ph) { out.push(ph.token); i += ph.stems.length; continue }
    if (keepStop || !STOP.has(ws[i])) out.push(st[i])
    i++
  }
  return out
}

/** Damerau–Levenshtein distance, stopping early once it is past `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      rowMin = Math.min(rowMin, d[i][j])
    }
    if (rowMin > max) return max + 1
  }
  return d[a.length][b.length]
}
