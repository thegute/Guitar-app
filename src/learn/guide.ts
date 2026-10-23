// "How to use KGuitar": a plain-language tour of every feature, for someone opening the app for the first time.
// Each item can jump straight to the feature it describes.
import type { Go } from './path'

export interface GuideItem { title: string; text: string; go?: Go; tip?: string }
export interface GuideSection { id: string; title: string; intro: string; items: GuideItem[] }

export const GUIDE: GuideSection[] = [
  {
    id: 'start', title: 'Start here', intro: 'KGuitar listens while you play a tab and lights up every note you get right. Around that it teaches you, trains your ear and keeps you practising every day. It works for guitar and ukulele.',
    items: [
      { title: 'The four sections', text: 'The bar at the bottom (or the side, on a big screen) has four sections. Play: play along with songs and practice tabs. Learn: your daily plan, lessons, quizzes and progress. Jam: make chord progressions with drums and record loops. Tools: tuner, metronome, chord library and scales.' },
      { title: 'Tune up first', text: 'Tools → Tuner. Play one string at a time; the needle and the note name show how far off you are. Turn the tuning peg until the note is green.', go: { tab: 'tuner' } },
      { title: 'Set up your input (2 minutes)', text: 'So the app hears you properly. It measures your room, how loud your strings are and how much delay your headphones add. Do it once for the phone mic (acoustic) and once for a USB amp or audio interface (electric).', go: { tool: 'settings' }, tip: 'Settings is the gear icon at the top of Learn.' },
      { title: 'Guitar or ukulele', text: 'Learn → Settings → Instrument. Pick guitar, tenor ukulele or baritone ukulele and the tuning. The whole app follows: chord shapes, tabs, tuner, quizzes. Songs are kept separately for each instrument, and the app asks "Are you sure?" before switching.', go: { tool: 'settings' } },
    ],
  },
  {
    id: 'play', title: 'Play: playing along with tabs', intro: 'The heart of the app. Load a tab, tap Listen, and play. Each right note turns green and the cursor moves on.',
    items: [
      { title: 'Open a song', text: 'Tap Songs (top left of Play). You can: search Songsterr or Ultimate Guitar (opens your browser), upload Guitar Pro files (.gp, .gp5, .gpx) or text tabs (several at once, straight from Google Drive), paste a tab or chord sheet you copied, or open the examples and practice tabs.', go: { tab: 'play' } },
      { title: 'Share straight into KGuitar', text: 'In a browser or tab site, select the tab text (or a whole chord sheet), tap Share, then KGuitar. Guitar Pro files from Drive or Downloads can be shared to KGuitar the same way ("Send a copy" in Drive). Sharing a YouTube link adds that video to the song you have open.' },
      { title: 'Listen: wait for me', text: 'Tap Listen and play. The app waits for each note, so go as slowly as you like. A wrong note shows what you played and what the tab wants. The box at the top shows the next note and where it is.', go: { tab: 'play' } },
      { title: 'Chord sheets: strum along', text: 'Songs with chords written over the words (the most common way songs are shared) open as a strum-along: one chord per bar with its shape and the words underneath. Strum the chord and let it ring; the app checks all the notes of the chord. Try "Amazing Grace" in Songs → Practice examples.' },
      { title: 'In time: keep the beat', text: 'Switch "Wait for me" to "In time" and tap Start. After a count-in the tab scrolls at tempo with a click; every note is marked on time, early or late, and you get a score at the end. Hear tab too plays the tab quietly along with you.' },
      { title: 'Loop a section + speed trainer', text: 'Tap "Loop a section", then the first and last bar of the hard part. It repeats and scores each pass. In time mode, turn on Speed trainer: it starts slow and speeds up a little every time you score 90% or better.' },
      { title: 'Hear it', text: 'Plays the tab so you know how it should sound, with the cursor moving along. ½ and ¾ slow it down.' },
      { title: 'Frets, notes or both', text: 'Frets shows the tab numbers, Notes shows the note names, Both shows each number with its note. Tap any number to hear it and start from there. A− and A+ change the size of the tab.' },
      { title: 'YouTube video beside the tab', text: 'Paste a YouTube link under the Video button. Speed buttons slow it down; A and B set a loop. Sync with tab lines the video up with the tab so, in In time mode, the tab scrolls with the recording. If a video says it can\'t play here, its owner blocks other apps: use Open in YouTube.' },
      { title: 'Scales & chords for soloing', text: 'The panel under the tab (or Scales & chords on small screens) shows the song\'s key, the scales that fit, the chords, and the fretboard. Arpeggio shows the chord\'s notes, Triads small chord shapes, Connect how to move smoothly to the next chord.' },
      { title: 'Split screen on a folding phone', text: 'Half-fold a Galaxy Fold like a little laptop and Play puts the video and readout on top and the tab on the bottom. The Split button does the same on any phone or tablet.' },
    ],
  },
  {
    id: 'learn', title: 'Learn: your daily practice', intro: 'Open Learn every day. It shows what to practise, keeps your streak and tracks everything.',
    items: [
      { title: 'Today card', text: 'The pick fills up as you practise toward your daily goal and turns into a green check when you reach it. Any 5 minutes keeps your streak alive. Every 7 days in a row earns a streak freeze that saves a missed day.' },
      { title: "I'm away from my guitar", text: 'Tap it when you don\'t have your instrument (work, travel). The plan and quests switch to things you can do without it (lessons, tap quizzes, ear training with headphones) and it still counts. It switches itself off after 30 hours.' },
      { title: "Today's plan", text: 'A short session made for you: tune up, warm up, a quiz, a song (or the bars you keep missing, or a song due for review), and one more skill. Tap a step to go straight there; it ticks itself off.' },
      { title: 'Daily quests and levels', text: 'Three small challenges a day for extra XP. XP comes from practice time and right answers; levels and badges come with it.' },
      { title: 'Practice course', text: 'Quizzes on fretboard notes, chords, triads, the circle of fifths and CAGED. Answer by tapping, or switch to Play and answer on your instrument (the mic checks it). What you miss comes back more often until it sticks. Up to three stars per quiz.', go: { tool: 'lessons' } },
      { title: 'Path to mastery', text: 'Seven stages from first steps to mastery, each with goals that tick off on their own as you hit them. Tap a goal to work on it.' },
      { title: 'Ear training', text: 'A soft drone plays the home note of a key; then a note plays and you name it by how it feels against home. After each answer it walks back home. Levels unlock as you go. Turn on "Use my guitar" to answer by playing the note.', go: { tool: 'ear' } },
      { title: 'Theory lessons', text: 'Short lessons with sounds to tap, from the basics to harmony, plus CAGED and how to practise. Each one links to the full chapter on Offtonic Theory.', go: { tool: 'lessons' } },
      { title: 'CAGED explorer', text: 'Any chord in five shapes up the whole neck, with the arpeggio, pentatonic, scale and triads inside each shape.', go: { tool: 'caged' } },
      { title: 'Circle of fifths', text: 'Tap a key to see its chords and key signature and hear how they sound.', go: { tool: 'circle' } },
      { title: 'One-minute chord changes', text: 'Switch between two chords as many times as you can in a minute. Tap for each clean change, or let it listen and count for you. Do it daily and watch the number climb.', go: { tool: 'changes' } },
      { title: 'Rhythm trainer', text: 'Listen to a bar, then tap it back (or strum it) against the click. Nine levels from quarter notes to swing.', go: { tool: 'rhythm' } },
      { title: 'Progress', text: 'Your practice calendar, this week compared with last, badges and how well you know each part of the course.', go: { tool: 'progress' } },
    ],
  },
  {
    id: 'jam', title: 'Jam: progressions and looping', intro: 'Make chord progressions to play over, with strumming and drums, and record yourself as a loop.',
    items: [
      { title: 'Make a progression', text: 'Pick a key, style and how many chords, then tap New progression. Every chord shows its shape; lock the ones you like (the padlock) and tap New progression again to change the rest. Options has more: chord colours, endings and how adventurous it gets. Famous progressions are at the bottom.', go: { tab: 'progressions' } },
      { title: 'Play along', text: 'Tap Play loop for strumming, drums and a click. The scales panel shows what to solo with, and the circle of fifths lights up the chords.' },
      { title: 'Looper', text: 'Record a loop: it waits for the start of the next pass and records exactly one loop in time with the drums. Add more layers on top. If loops sound a little late, run Timing check once, or nudge a layer Earlier/Later.' },
    ],
  },
  {
    id: 'tools', title: 'Tools', intro: 'Everyday helpers.',
    items: [
      { title: 'Tuner', text: 'Standard and alternate tunings, plus reference tones to tune by ear.', go: { tab: 'tuner' } },
      { title: 'Tempo (metronome)', text: 'Accents, subdivisions, odd time signatures, tap tempo and a speed trainer.' },
      { title: 'Chords', text: 'Every common chord in every key, with several shapes. Tap a shape to hear it.' },
      { title: 'Scales', text: '22 scales and modes on the whole neck or one position at a time.' },
    ],
  },
  {
    id: 'gear', title: 'Your gear', intro: 'KGuitar works with the phone mic for acoustic instruments and with a USB amp or audio interface for electric.',
    items: [
      { title: 'Acoustic: the phone mic', text: 'Hold or prop the phone 30–50 cm from the soundhole. Quiet rooms work best. Use headphones for videos and backing so the mic hears only you.' },
      { title: 'Electric: USB amp or interface', text: 'Plug a USB headphone amp or audio interface (for example a Sonicake Amphonix 2) into the phone\'s USB-C port. Automatic input picks it up when it\'s plugged in. Use a clean or lightly driven sound while learning; heavy effects make notes harder to tell apart.' },
      { title: 'Hands-free with a footswitch', text: 'Pair a Bluetooth page-turner or footswitch: right pedal starts and stops, left pedal goes back to the start. Settings → Hands-free lets you set what each pedal does (loop this bar, next bar, Hear it, video …). USB MIDI pedals work too.', go: { tool: 'settings' } },
      { title: 'Sound', text: 'Hear it, Jam and the quizzes use real recorded guitar sounds. Settings → Playback sound picks steel-string acoustic, clean electric or nylon (great for ukulele).' },
    ],
  },
  {
    id: 'keep', title: 'Keeping your progress', intro: 'Everything is stored on your phone or tablet.',
    items: [
      { title: 'Back up', text: 'Settings → Backup → Back up now, then pick Google Drive in the share menu. Restore from that file on a new phone or tablet to bring back your songs, streak and progress.', go: { tool: 'settings' } },
      { title: 'Reminders', text: 'Settings → Reminders sends a daily reminder at the time you choose, plus an optional late "streak saver". Days you\'ve already practised are skipped.' },
      { title: 'Day and night', text: 'Settings → Look: Night is dim and low-glare for practising in bed; "Match my phone" follows your phone\'s dark mode.' },
    ],
  },
  {
    id: 'tips', title: 'Tips for getting good', intro: 'What actually makes you better, fastest.',
    items: [
      { title: 'Little and often', text: '15 minutes every day beats 2 hours once a week. The streak and reminders are there to help with exactly that.' },
      { title: 'Slow and clean first', text: 'Play it right slowly, then speed up a little at a time. Use the speed trainer on the hard bars.' },
      { title: 'Loop the hard part', text: 'Don\'t replay the whole song to fix one bar. Loop just those bars until they\'re green.' },
      { title: 'Use your ears', text: 'Hum what you play, do a round of ear training most days, and play songs you love.' },
    ],
  },
]
