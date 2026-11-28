# Guitar courses plan (owner approved 2026-11-28)

Owner's rules for this work:
- Claude works ONLY on the guitar courses. Never fix or change anything Gemini built (Gemini handles its own bugs).
- VIDEOS ARE THE BACKBONE: his paid course videos (Roy Ziv Hexatonic / Modes Navigator / Speed Builder, Paul Davids Electric
  Elevation / Acoustic Adventure, Matteo Mancuso Masterclass; course maps in his Drive `kguitar-all-courses.json`, 567 tagged
  lessons) where they cover a topic, then the best free YouTube lessons. His PDF books SUPPLEMENT (extra drills, "In your
  books" pages, pieces). Each lesson is designed around the videos and uses the drills/tabs the videos teach.
- Tabs transcribed from videos and books stay in his private app only.
- Two levels/pathways per test APK.

## Approved teachers (owner 2026-11-28)
- Theory, neck: LoG Sounds and Signals Music Studio first (234 videos already matched to lessons on the Mac), Daniel Seriff
  (triads, 5-fret system), Paul Davids, Jens Larsen (voice leading, 7ths, chord-tone soloing).
- Technique: Roy Ziv Speed Builder + Mancuso (paid, his), LoG Power Ups series, Ben Eller, Troy Grady, Tom Quayle (legato),
  BERNTH, Rick Graham, JustinGuitar, Andy Aledort, Sarah Longfield + Ichika (tapping), Max Rich, Sound Guitar Lessons.
- Bluegrass: Lessons With Marcel (lead), Jason Carey, Brandon Johnson, Andy Wood; books Flatpicking Essentials 1-2, Teach
  Yourself Bluegrass Guitar, Tony Rice collection.
- Acoustic singer-songwriter: Paul Davids Acoustic Adventure (his), Daniel Chavez (Gossett), The Guitar Factory (Zach Bryan),
  Acoustic Guitar Magazine, Dave Milliken. Sing course "Sing and Play" module.
- Melodic prog: Plini's Guitar World lessons, Roy Ziv Hexatonic/Modes + Mancuso (his), Sarah Longfield, Music Is Win, LoG;
  book Progressive Metal Guitar.
- Fingerstyle: Marco Cirillo, Paul Davids Acoustic, Fingerstyle Guitar School, JustinGuitar; books Fingerpicking Country, Celtic.
- Slack key: Harry's Guitar (free YouTube series, lead) + Jeff Peterson's free page only (owner can't pay); books Keola
  Beamer's First Method + Masters of Hawaiian Slack Key Guitar supplement.
- Later: funk (Tomo Fujita, Cory Wong), neo-soul double stops (Mayer), reggae.

## Order
1. Technique course (30 lessons, 10 units) — candidates under review on the Mac now.
2. Bluegrass flatpicking pathway. 3. Acoustic singer-songwriter pathway. Alongside: rebuild the theory lessons around
   LoG / Signals (Level 8 needs a match run first: its lessons didn't exist when the creators were scanned).
Then melodic prog, fingerstyle, slack key; later funk, neo-soul, reggae.

## Lesson shape
Warm-up (from the lesson before) → Watch (2-3 videos, jump-to parts; paid-course clips in the floating video card) →
Understand (own words, key-changeable necks) → Drills from the videos (tabs in Play: Wait for me, then In time with a tempo
ladder; goals not days) → Use it (style backing / looper / Strum Machine) → Check (mic-graded) → Explain it back; challenge round.

## Gemini's tools wired into lessons (open them pre-set; never change them)
From-your-courses clip engine + floating video card; lesson tab card ("Play this page") for course tab PDFs; Drill Lab, Burst
Mode, Speed Builder Lab (clean-BPM log, endurance); Fretboard Game (L1 + warm-ups); CAGED Warmup Studio + Arpeggio Connector
(L4/L6); hexatonic scales + modal drone (L8, prog); Harmonic Flow / Chord Path wheel + Circle masterclass (L2/3/5/7);
AI composer styles for style backings; Strum Machine (acoustic, rhythm); beat maker + looper; Melodic Improv Gym games
(Chord-Tone Sniper L6, Call & Response / Note-Limit phrasing, Neck Teleporter); pro/classic licks for style lick sets; left-hand
coach + mini grips; Game Mode stars for pieces; Sing "Sing and Play"; Practice button / sessions build the day; phone/tablet sync.

## Technique course outline (lesson ids → candidates in the Mac's creators/review-technique.tsv)
U1 Picking: t1-grip grip and motion · t1-alt1 one-string alternate picking · t1-cross string changes · t1-seq sequences
U2 Fretting hand: t2-indep finger independence · t2-stretch stretches and shifts · t2-sync hand synchronisation
U3 Legato: t3-hopo hammer-ons/pull-offs · t3-runs 3nps runs · t3-flow across strings, slides
U4 Bends: t4-bend in tune · t4-vib vibrato · t4-expr double-stop / unison bends
U5 Hybrid: t5-hyb1 basics · t5-hyb2 rhythm and chicken pickin · t5-hyb3 lead, wide intervals (Mayer, Mancuso)
U6 Economy and sweeps: t6-econ · t6-sweep3 · t6-sweep5
U7 Skipping: t7-skip · t7-wide
U8 Tapping: t8-tap1 basics · t8-tap2 two-hand (Ichika, Plini) · t8-tap3 tapped chords
U9 Rhythm hand: t9-mute muting · t9-funk 16ths and funk · t9-rud rudiments, selective picking, thumping
U10 Speed and time: t10-speed bursts and ramps · t10-odd odd meters · t10-etude putting it together

## Mac pipeline
`run-mac.js --review --videos creators/review-<name>.tsv` (lines: id, title, secs, lessonId, lessonTitle, course) →
`video-notes/review-<name>.json`: fit / teaching / practice scores, key points, mistakes, drills with times and on-screen tabs
(tabSure), best part, verdict. "Start video notes.command" runs every creators/review-*.tsv after the course videos.
Candidates found with yt-dlp search on the Mac (titles/links only), checked to load; Claude picks 2-3 per lesson from the
reviews and checks every tab before it goes in.
