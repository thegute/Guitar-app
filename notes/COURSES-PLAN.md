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

## His paid video courses (owner 2026-11-28: "don't forget my course video lessons like Roy Ziv and Paul Davids")
- Roy Ziv (Hexatonic, Modes Navigator, Speed Builder), Paul Davids (Electric Elevation, Acoustic Adventure), Matteo Mancuso
  (The Masterclass): on his phone (SAF folders) with Gemini's course maps (topics per lesson; `kguitar-all-courses.json` in his
  Drive). Never copied into the repo. Theory lessons now mount Gemini's `InYourCourses` ("In your video courses") on the first
  Learn step with the lesson's topics. Every new course/pathway lesson will name its paid-course lessons explicitly (by course
  and lesson title from the maps) as a Watch source, ahead of YouTube where they cover the topic: Speed Builder → technique
  speed units; Mancuso → hybrid/legato/improv; Roy Ziv Hexatonic + Modes → Level 8 and melodic prog; Paul Davids Acoustic →
  acoustic pathway; Electric Elevation → technique/lead. Their drills: from the course's own tab PDFs (lesson tab card).
- Open question for the owner: letting Gemini watch the course videos themselves (would mean uploading his files to Google's
  API) — ask before doing it.

## Songs in the lessons (owner 2026-11-28)
- Every lesson ends with real music. Public-domain tunes go in the built-in songbook (check each title; skip anything uncertain).
  Bluegrass: Salt Creek, Soldier's Joy, Old Joe Clark, Blackberry Blossom, Billy in the Lowground, Red Haired Boy, Bill Cheatham,
  Forked Deer, Sally Goodin, Liberty, Big Sciota, Arkansas Traveler, Turkey in the Straw, Cripple Creek, Angeline the Baker;
  songs Nine Pound Hammer (traditional words, not Merle Travis's 1946 lyrics), John Henry, Shady Grove, Man of Constant Sorrow,
  Little Maggie, Cumberland Gap, In the Pines, Banks of the Ohio, Handsome Molly, Wildwood Flower, Will the Circle (1907 hymn).
  Whiskey Before Breakfast: NOT in the songbook (earliest dated source = Andy DeJarlis's 1957 book, credited to him); teach it
  from the video tutorials, tab only in his private library.
- Added 2026-11-28 (own guitar settings, checked against Traditional Tune Archive sources; `reach` = highest fret for tunes
  with a high B part): Salt Creek, Billy in the Lowground, Red Haired Boy, Bill Cheatham (melody + boom-chicka backing);
  Nine Pound Hammer, Little Maggie (chord charts + backing, no words). The bluegrass "Blackberry Blossom" is NOT the Irish
  reel of that name; it appears to come from Fiddlin' Arthur Smith (1930s): keep it out of the songbook, teach it from tutorials.
  Still to add (check each first): Forked Deer, Sally Goodin, Liberty, Big Sciota, John Henry, Cumberland Gap, In the Pines,
  Banks of the Ohio, Handsome Molly, Wildwood Flower.
- Copyrighted songs (Gossett, Zach Bryan …): taught from tutorials; his own Songsterr imports stay in his private library.
- "Songs for this lesson" (built 2026-11-28, `course/LessonSongs.tsx` + `course/songFocus.ts`, `kg:lessonSongs`): he pins any song
  (Songsterr / UG search in the phone app, or one of his songs) to a lesson; KGuitar finds the bars that use the lesson's skill
  (lessonFocus from the lesson's topics: legato, bends, slides, muting, double stops, triads, chords, scale lines in the key,
  bass runs, sixteenths) and "Practise bars x–y" opens Play looped at 70 %. Shown on every course lesson's Use-it step; the
  pathways get it too. The Songsterr import is still untested against the live site: test it with him on the phone first.
- Theory lessons have "Watch" (built 2026-11-28, `course/watch.ts` generated by `tools/video-notes/make-watch.py` from the Mac's
  match-*.json; `course/WatchHere.tsx`): 135 LoG / Signals videos in 51 lessons, parts placed in their steps. Re-run the script
  when more creators are matched (Level 8 still needs its match run).

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

## Mac queue ("Start video notes.command", in order)
match singles / logsounds / signals (done) → course videos (jobs.json, now 126 jobs incl. Level 8) → review-1-technique →
match level8 (creators/level8.tsv: 57 modal LoG/Signals videos, so Level 8 gets Watch videos; re-run make-watch.py after) →
review-2-bluegrass → review-3-acoustic. The start file was swapped by rename, so a running window keeps its old copy.

## Mac pipeline
`run-mac.js --review --videos creators/review-<name>.tsv` (lines: id, title, secs, lessonId, lessonTitle, course) →
`video-notes/review-<name>.json`: fit / teaching / practice scores, key points, mistakes, drills with times and on-screen tabs
(tabSure), best part, verdict. "Start video notes.command" runs every creators/review-*.tsv after the course videos.
Candidates found with yt-dlp search on the Mac (titles/links only), checked to load; Claude picks 2-3 per lesson from the
reviews and checks every tab before it goes in.
