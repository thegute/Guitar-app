# KGuitar handoff: START HERE in a new chat

Last updated 2026-11-07 (end of the "big update" chat). Read this whole file, then `CLAUDE.md` (the project brief, loaded
automatically), then `notes/next-build.md` (every change waiting for "ship it", with checkpoints), then
`notes/blueprint-decisions.md` and `notes/blueprint-part1.txt` / `part2.txt` (the owner's master blueprint, full text).
**Also read `notes/WEEK.md` first: the owner's test notes, quick ideas and bugs from the week.** Nothing important lives only in the old chat: if a detail isn't in these files or the code, it doesn't exist yet.

## Where things stand
- Repo github.com/thegute/Guitar-app, local clone /home/claude/guitar-app. Work branch **`big-update`** (everything since build-31).
  `main` = build-31 (what's installed as the normal release). **Never push to `main` until the owner says "ship it".**
- Test builds for the owner come from `big-update` as GitHub **pre-releases** `test-N` (the workflow step "Publish a test build page"):
  dispatch with `gh api -X POST repos/thegute/Guitar-app/actions/workflows/android.yml/dispatches -f ref=big-update`, then send him
  `https://github.com/thegute/Guitar-app/releases/tag/test-N`. test-38 and test-39 are out (test-39 = everything up to the looper).
- Web app: `.github/workflows/web.yml` deploys GitHub Pages on `main` pushes. The owner still has to switch Pages on (Settings → Pages →
  Source: GitHub Actions); `gh api repos/thegute/Guitar-app/pages` said 404 on 2026-11-07. Update the web app together with the next
  release ("ship it"); he asked for the web app to get all the new features too.

## The owner (keenang, GitHub thegute): how to work with him
- A guitarist, not a developer: plain words, no jargon. Fold 8 phone (cover ~412 dp, inner ~840 × 757), Galaxy Tab S10+.
- Permanent rule (his words): "maintain the highest quality and cut no corners anywhere. Audit yourself mid-build, use the best available
  resources, and ask me clarifying questions whenever you need to instead of guessing." Best methods and technologies, no shortcuts,
  double-check work, intuitive design.
- He tests every build before "ship it"; ask him about each checkpoint item in notes/next-build.md after he tries it.
- He's often low on usage credits: send him a test APK before long stretches, and keep these notes current at every checkpoint.
- Rules that never change: keystore committed on purpose, never any other secret; AI and YouTube keys stay on the phone (`kgx:` storage,
  never in backups, the repo, memory or notes); no copyrighted songs/tabs/lyrics (lyrics only pre-1929); never copy Offtonic's text;
  never copy/convert/index his course files; only "Brandy" is named on screen, never invent names/titles for the art or dogs; live guitar
  input is never processed (played back only in the opt-in interface setup); models whose training data is non-commercial are never
  bundled or re-hosted (download from the source on request); ask before deleting anything on his computer.

## NEW TOP OF THE QUEUE (owner 2026-11-09 00:14): these 4 come BEFORE everything else (incl. the Learn overhaul, which follows them):
## 1. Songs tab refinement: My songs vs Songbook is confusing; consider ONE library; Songbook's "pick a style and level" is clunky.
##    Every song added any way gets a style + difficulty (asked, or worked out by analysing the song) and the list sorts/searches/filters by them.
## 2. Game Mode: Songsterr import works great, BUT in Game there is no bouncing ball; "Hear it" just plays the sound without the tab/highway
##    moving or the ball bouncing (Hear it must drive the same clock: tab scrolls, ball bounces, no scoring). The floating hand diagram must
##    float in Game too. (Ball design agreed 2026-11-07, see item 3.)
## 3. Exercises (Songs -> Exercises) is too cluttered: replace the windowed left-hand diagram (HandGuide window) with the floating hand
##    diagram; brainstorm a cleanup WITH him (sections? layout?).
## 4. Add a song: merge "Find a tab" and "Bring it in" into one. Riff Scanner from a SCREENSHOT works well; from VIDEO it "fails horribly".
##    He is fine waiting longer for accuracy. Brainstorm + fix; "I need Riff Scanner to work."
## Failing Riff Scanner video from the owner (2026-11-09): https://youtube.com/shorts/c_8nhmfqVbs (a Short). = "Dust In a Baggie Intro | Billy Strings" by Level Up Guitar Tabs: fast bluegrass flatpicking, from a TAB channel (tab very likely on screen -> read the frames first). Use it as the main test case.
## 5. Windows (owner 2026-11-09): in Songs at least, ideally almost everywhere, every window resizable in LENGTH AND WIDTH, and a resized
##    window must still show all its info (content reflows / fits, not cut off). Win.tsx today only resizes height (⇕). Design to agree
##    with him: tidy grid (narrow windows sit side by side on Fold inner / tablet; cover screen stays one column) vs free placement.
## 2026-11-09 answers: windows = TIDY GRID (snap side by side, never overlap, corner resize, others make room; cover screen 1 column).
##   The floating hand diagram stays FREE-floating. BUG: it sometimes goes behind other windows / is hard to grab -> always on top, a
##   handle that is always tappable, never under a Win. He wants MORE floating panels (ideas offered, he picks) that can be combined or
##   chosen. Exercises MOVE to Learn and get tidied. He asked whether Play should be merged too (proposal: Songs library -> song player
##   screen with a "Now playing" bar; awaiting his answer).
## 2026-11-09 decisions (final): FLOATING CARDS: build all of: hand diagram, chord now + next (beat countdown), mini neck map, live
##   feedback ("you played G, tab wants A"), bar/beat counter, tempo pill, quick tuner, MINI YOUTUBE PLAYER, practice timer. Card idea:
##   separable cards / one dock; each card can be hidden; show ONE or SEVERAL at once (he'll mostly use one); chosen per screen; remembers
##   spot + size, snaps to edges, shrinks to a bubble; always on top + always grabbable. PLAY TAB IS MERGED into Songs: Songs = library,
##   opening a song = the song player (all Play features kept), a "Now playing" bar on every screen; menu = Songs · Learn · Jam · Tools
##   + gear (settings + manual). Exercises move to Learn (Exercise library + lesson Practice steps).
## 2026-11-09 reorder (owner): REALISTIC ACOUSTIC SOUNDS + STRUM MACHINE (Band/Track mode, strum engine, 300 songs) go ABOVE the
##   pro-level Learn course. Where it lives + what the gear button opens: proposals sent 00:35, awaiting his answers.
## 2026-11-09: Band (Strum Machine) lives in JAM (agreed); 300 songs in the one Songs library with "Play with the band". Gear proposal sent
##   (setup only: You, Sound, Look, Floating cards, Controls, AI helper, Backup, Manual, About; in-play controls stay in the player), no
##   objection yet. Now brainstorming: make Jam more intuitive + Beat maker like pro beat makers (proposals sent 00:39).
## 2026-11-09 beat maker: used for QUICK BEATS + SAMPLES, "like Koala but with more features". Proposal: one fixed pro layout (transport bar
##   on top, 4x4 pads, bottom views Pads/Steps/Keys/Mixer/FX, parts A-D strip, hold a pad = edit sheet), not Win windows; Jam = 3 choices
##   (Play with a band / Make a beat / Loop myself). Extra-value ideas sent 00:45, awaiting his picks.
## 2026-11-09 beat maker picks: VOICE "record this" -> count-in, recording starts 3 s later (instead of the footswitch; keep pedal as
##   backup; check mic sharing between speech recognition and recording, and with the USB pedal input, on his phone; never record the
##   spoken words). LIKES: pull sounds from a song OR a YouTube video (stems -> pads); LOVES #4 chord pads that follow the progression.
##   Asked for more detail on: riff-to-pads, style starters + variation, swing/humanise, practice over this, kits + send.
## 2026-11-09 beat maker: owner wants ALL the ideas (riff-to-pads, sounds from songs/YouTube, chord pads, style starters + variation +
##   fills, swing/humanise, practice over this, kits + send, voice "record this") AND clean/pro/not bloated. UX plan sent 00:51: fixed zones
##   (transport bar / parts strip / one centre view / bottom view switcher), each feature on the thing it acts on (pad sheet, Beat menu,
##   Sounds drawer, Done menu), voice + pedal invisible, 3-way start screen; offered a visual mockup before building.
## 2026-11-09 WINDOWS RULE (owner): EVERY window in the app is RESIZABLE (width + height) and MOVABLE in the tidy grid, EXCEPT Learn
##   (Learn is rebuilt later). Beat maker: its zones (pads, steps, keys, mix, FX, pad sheet) are tidy-grid windows too (side by side on big
##   screens); only the transport bar stays pinned. FIRST beat-maker step = a visual MOCKUP (phone + big screen) for him to comment on.
## 2026-11-09 EFFORT SPLIT (owner bought credits, stays on MEDIUM): MEDIUM now = Game ball + Hear it + floating hand in Game; floating
##   cards; menu (Play into Songs, Now playing, gear); tidy-grid windows except Learn; Exercises into Learn; beat maker mockup + layout.
##   OPUS HIGH later = Riff Scanner from video, realistic strum engine, pro-level Learn course, automatic style/level, the 300 SONGS.
## 2026-11-09 voice "record this" + USB: the VOICE is heard on the phone's BUILT-IN mic; the RECORDING comes from the chosen input (Pocket
##   Master over USB = clean DI, no voice). Android may route the default mic to the USB interface when plugged in -> keep speech on the
##   built-in mic (AudioRecord/SpeechRecognizer preferred device, Android 12+), else our own small recogniser on the built-in mic; footswitch
##   + big on-screen record button as backup. Test on his Fold with the pedal plugged in.
## 2026-11-09 07:48 idea (owner): the Ask bubble suggests smart tips per screen. Proposal sent: glowing dot on the bubble (never pops over
##   play), tip card with Show me / Got it / No more tips here; tips from guide.ts (offline), picked by moment (first visit, struggling in a bar,
##   better way, never-used features from usage.ts), smarter with Gemini using progress; max 1 per visit + a few a day, dismissed never return,
##   Settings: Tips On / Only when I ask / Off. ANSWER (10:42): the GLOWING DOT, plus a setting to ALWAYS SHOW tips (Tips: Dot / Always show / Only when I ask / Off). Guitar-advice question unanswered.
## 2026-11-09 20:37 ANSWERS: sound packs from Mac plugins live in a PHONE / GOOGLE DRIVE folder, never in the public repo. Band behind me:
##   Songsterr/GP tracks + chord band first. Carry on ALL medium tasks; DO NOT make a test APK without asking him first (he may add more
##   medium tasks). The full plan with status + [M]/[H] is notes/MASTER-PLAN.md (keep it current).
## 2026-11-11: owner sent "KGuitar Master Game Plan & Implementation Roadmap" (notes/master-roadmap-2026-11-11.pdf, 7 stages, made with
##   Gemini). Claude read all 12 pages, sent questions + concerns (order, Learn 6 grades vs 10 units, latency claims, COEP vs YouTube,
##   which plugins he owns, phone storage budget, Mac linking). Await his answers before re-ordering MASTER-PLAN.md.
## 2026-11-11 ANSWERS: order = Stage 1 → 2 → 4 (Riff Scanner) → 3 (audio engine + Mac harvest) → 5 (Strum Machine) → 6 (Beat maker) →
##   7 (Learn). Learn = BOTH: 6 Pickup-style grades for the path AND the PDF's 10 deep-dive units as a deep-dive library. Sound packs may use
##   2 GB+ of phone storage. Stompbox = ADD ON TOP of the Pocket Master (looper, synth, backing), don't replace its tones. Still open: which
##   plugins/electric DI library he owns; linking the Mac at Stage 3. Now doing Stage 1 (build25 + windows-test fixes).
## 2026-11-11 OWNS (installed on the Mac): Orange Tree Evolution (acoustic, Kontakt) + Orange Tree Evolution ELECTRIC (the electric DI
##   library), Ample Sound SJ-200 (Strummer), Nembrini Acoustic Voice Pro, Neural DSP Archetypes (the 8), Baby Audio Humanoid, VocalEssential,
##   Jam Origin MIDI Guitar. Riff Scanner must handle ALL video kinds: tab channels, lessons, players with no tab, full band songs.
## 2026-11-11 Jam decisions: Riff Scanner lives in BOTH Songs → Add a song (a big "Scan a video or recording" card) AND a Jam shortcut.
##   "Solo over it" = floating cards only (mini neck + chord cards over the band; the full Scales tool stays in Tools).
## 2026-11-11 09:43 owner: TAB lines must fill the full width (no blank space on the right before the next line; justify like printed tab);
##   the tab window and GAME MODE resizable + zoomable; Game Mode scrollable to look ahead (snaps back); the song plays in Game Mode while he
##   plays + scores: a guide with BOTH his part and the other instruments, with a SLIDER (09:45).
## 2026-11-11 09:51 owner: leave room + an upgrade plan for the NEW AUDIO ENGINE used by ALL features → notes/AUDIO-ENGINE.md (the
##   contract: parts not samples, swappable packs, named buses me/band/drums/bass/click/fx/input, one clock, rules for code written before
##   Stage 3, and the per-feature checklist). The Game guide slider = `me` vs `band` bus volume.
## 2026-11-11 10:03 owner uploaded 20 PDF books (tabs, theory, flatpicking, Celtic, slack key, fretboard, improvising, harmony; list in
##   the private Project doc, NOT in the repo). Rules: never copy their text, pictures or tabs into the app or repo; use ideas to shape
##   Stage 7 lessons in our own words; tabs from them only go into his own phone library through the PDF reader. Done now: PDF books ask
##   which pages (components/PdfPages.tsx, `kg:pdfPage:<name>`), tab printed as pictures goes to the picture reader (`PdfPage.pictures`).
##   Asked him: which book is his main path?
## 2026-11-11 10:57 AI TEACHER (new stage, RIGHT AFTER Stage 2, before Stage 4): the helper becomes his guitar teacher that LISTENS and
##   critiques. Design agreed: KGuitar measures exactly (notes right/wrong, ms early/late, trouble bars, trends, takes) + Gemini hears a
##   short clip of the run (tone, buzz, muting, dynamics, feel; opinions labelled as opinions) → teacher talks: what went well, ONE fix,
##   why, then sets up a drill (loop bars at a speed, an exercise) and re-listens. Answers: talks BOTH spoken (between passes, never while
##   he plays) + a text card; strictness = HIS CHOICE (a setting); clips sent to Gemini only when the teacher listens; "super smart,
##   intelligent, integrated in lots of places": Play + Game (after runs/passes, fix-this-spot drills), Learn (teaches lessons + Z2H
##   steps, grades gates, daily check-in across days), technique trainers (bends, vibrato, chord changes, rhythm), Jam/looper solos
##   (note choice over chords, later), a Teacher floating card per screen. Audio never sent in the background.
## 2026-11-11 10:59 Game full screen: NOT stretched; starts comfortable (fit, ≤56 px strings), he sizes it with the ◢ corner (height +
##   width, centred), scrolls when bigger than the screen, bar sticky at the bottom; double tap fits. Done (tabfit-test).
## 2026-11-11 11:08 STAGE 2 ANSWERS (then test APK + Gemini handoff when Stage 2 is done, then the AI teacher):
##   Jam = 3 big buttons (Play with a band · Make a beat · Loop myself) + Riff Scanner as a SMALL LINK underneath. Band starts → cards
##   Chord now & next + Mini neck by default. Tips: MORE OFTEN (a new tip whenever there's a good one, still Got it / No more here),
##   guitar-advice tips ON by default. Stem mixer = FLOATING CARD. YouTube band minus guitar = Stage 4. Library opens LEARNING NOW
##   first (in progress + reviews due, then everything). Add a song: a YouTube link asks Find a tab / Scan it / Just save. Quick Start =
##   for his brother (new to the app). Chord band guesses its style from the song, changeable. Shorts: he'll type more channels (asked).
## Brainstorm round 2026-11-09: see the chat summary appended below in "Brainstorm 2026-11-09".

## TOP PRIORITY FOR THE NEXT BUILD (owner 2026-11-07 13:04): seriously beef up and REDO the Learn tabs: a full, in-depth course on guitar
## theory AND techniques, "just like Pickup Music" (6 grades, mastery path; see item 7 round 3-5 decisions, notes/research-pickup.md).
## BAR: PRO LEVEL (owner 2026-11-07 13:04: "I want it pro level"). Not primers: every topic taught to working-professional depth
## (theory + physical technique + musical use), with measurable targets (tempos, accuracy %, keys/positions), a mic-graded check, and a
## correctness audit of all theory by a separate reviewer before it ships. Grade 6 ends at professional-level playing.
## Start with Grade 2 as the pilot. The other queue items below follow it (or ride along in the same build when small).

## Work queue, in order (agreed 2026-11-07)
1. ~~Handoff + Gemini review package~~ (done: this file, CLAUDE.md, `review/`). Keep them current.
2. **Part 1 #1: Riff Scanner accuracy from video, slides, hammer-ons, pull-offs.**
   **STATUS 2026-11-07 (commit 784aaba, test-40 sent to him):** done (a) technique pass `ml/legato.ts` (pick click + contours) wired via
   `transcribe.ts scanNotes` + soundScan (better notes marked too), `hand/legato.ts` one-string chains, toTab marks + 32nds. Bench
   `npm run bench:scan` (render `python3 tools/ml-bench/make_legato.py /tmp/claude-0/bench/legato`; ORT_NODE=/tmp/claude-0/ort with
   onnxruntime-node@1.22.0): dry F1 83→92, p 51/51, h 98/134 (11 h read as "/": tune glide vs jump), b 6/7, ~ 3/3, 0 false marks.
   Video-style mixes: no pick click → nothing marked (by design). NEXT: wire `ml/stems.ts` (6-stem guitar stem, written, untested;
   model at /tmp/claude-0/models/demucs6, `KG_STEMS=… npm run bench:scan video`) before scanning video sound, then re-bench; then (e)
   picture-led merge and his video 7YKecUwEzZU (Staged Right, bends/slides/h/p). Ask him how test-40 did on his own playing.
   Web app: web.yml dispatch on big-update builds but deploy is blocked by the github-pages environment rule (main only); he was told how
   to allow big-update (Settings → Environments → github-pages → Deployment branches) and re-run it himself.
   His report: scanning a video misses a lot of notes;
   slides and pull-offs/hammer-ons are never detected. Diagnosis (from the code, 2026-11-07):
   - `src/audio/transcribe.ts` Basic Pitch draft uses `outputToNotesPoly(frames, onsets, 0.5, 0.3, 11, …)`: minimum note 11 frames
     (≈128 ms) drops fast notes (16ths at 120 BPM are 125 ms); onset 0.5 / frame 0.3 miss soft legato notes; then `amp ≥ 0.18`.
   - `notesToTab` keeps ONE note per 16th slot (the loudest) on a grid from a guessed tempo: triplets, 32nds, fast runs and any two
     notes landing in one slot are thrown away.
   - Video sound is a full mix (backing, vocals, reverb, compression) through screen capture; the general model hears everything.
   - Techniques: nothing in the sound path marks h / p / slides / bends. Basic Pitch's pitch contours (3 bins per semitone, the
     `contours` output, `addPitchBendsToNoteEvents`) are computed and then ignored; the AI's "techniques heard" is text only.
   Plan to do (ask him before big downloads): (a) take the guitar out of the mix first with the **6-stem HT-Demucs** (guitar stem; the
   same model as #3 below; `StemSplitio/htdemucs-6s-onnx`, MIT, `htdemucs_6s_fp16weights.onnx` 136 MB, input `mix` [1,2,343980] 44.1 kHz
   stereo, output `stems` [1,6,2,343980], order drums, bass, other, vocals, guitar, piano: the STFT is inside the graph, unlike our
   4-stem `htdemucs_fwd` which needs our own STFT in `src/ml/demucs.ts`); (b) guitar-note model as the main pass with tuned thresholds
   (min note ~3–4 frames, onset ~0.3–0.35, adaptive per file); (c) rhythm on the beat grid (Beat This / `analyse`) with per-beat
   subdivision choice (16ths / triplets / 32nds), keeping every note, monophonic vs chord decided per segment; (d) technique detection
   from the pitch contour + onset strength (`noteDetect.ts` spectral flux): pitch change with no new pick attack = hammer-on (up) /
   pull-off (down) on the same string; a continuous glide of ≥2 semitones = slide (/ \); a rise and return inside one note = bend / release;
   4–8 Hz wobble = vibrato; the fingering Viterbi (`tabs/fingering.ts` / hand brain) must keep legato pairs on one string; (e) if a tab is
   visible in the video, the picture read leads and the sound fixes timing; (f) a benchmark: GP files rendered with our banks + backing +
   reverb + compression (tools/ render scripts), measuring note F1 and technique accuracy before/after, plus his real videos.
3. **Part 1 #2: Game Mode, Yousician-style.** Owner 2026-11-07 on test-40: "on Play it for me it just has a line that doesn't move… I want a bouncing
   ball EXACTLY like Yousician". Now: a 7 px gold dot pinned to the hit line (GameHighway.tsx ~163) that moves only while a run plays;
   "Play for me" only sounds the next note, so nothing scrolls. Build the real Yousician ball FIRST in this item. Agreed design (owner 2026-11-07): the tab/notes slide right→left
   continuously toward the fixed play line and the ball stays at (or just around) that line, so it never leaves the screen; between
   notes it arcs up and lands ON the next note's head (its string's height, a chord's box) exactly on the beat, arc height from the gap;
   the notes sliding under it make it look like it hops along them. Rests: small beat hops or a wait. Paused / Wait for me: scroll and
   ball wait together. Big and easy to see. Check a current Yousician guitar video first to match the look. (a) A bouncing ball that arcs from note to note and lands on each note exactly on its time
   (a ball exists in `components/GameHighway.tsx` since 1d4f07d: check how it moves and make it a true parabolic hop per note, landing
   on the hit line at the note's time, size/colour per finger); (b) a floating, movable, resizable, hidable tiny finger diagram (see #4);
   (c) **YouTube backing with the guitar removed**: he chose the 6-stem model and "record it once, then play": the video plays through
   once while KGuitar records its sound (Android screen-audio capture as in Get a sound, `scan/grab.ts`), the guitar stem is removed, the
   backing is saved (IndexedDB, per song + video id), then every run plays the backing in sync with the muted video and the game (Video
   sync offset/tempo from `play/autoSync.ts` / SyncPanel); uploaded audio/video files work the same without the listen-through;
   (d) a **customizable full-screen game** that starts completely clean (only the highway) where he adds just the pieces he wants
   (finger box, score, video, chord names, speed …), remembered.
4. **Part 1 #3: floating finger diagrams everywhere**, each movable, resizable, hidable, with toggleable overlays: finger placement,
   pentatonic box, chord tones, triads, voice leading / leading notes (next chord's 3rd/7th, the note that resolves). Put it where it
   helps: Play (tab reader), Game, Must-know licks / lick chainer / Tab maker, Learn lessons + theory + techniques, Riff Scanner result
   + scan player, Jam (Solo over it, looper, beat maker keyboard), Exercises. Build ONE component (the existing finger box from Step 1b
   "Where your fingers go", `components/HandShape.tsx` / FingerBox, plus `theory/layers.ts`), then mount it everywhere.
5. **Looper "Start when I play"** (he asked 2026-11-07): one tap readies a track, it listens and starts the take on the first guitar
   note (onset from `noteDetect.ts`, noise gate from `gear.ts`), snapped to the nearest beat (the input keeps 3 min of history, so the take
   can start exactly on that beat even though the note was heard a moment later). Also as the default for the footswitch.
6. **The two courses** (Step 3 §2, still to build). Build on a 3-step loop per lesson: Concept (original text, a live 5-layer neck,
   one verified video) → Exercise (tabs in the lick notation `licks/notation.ts`, opened in Play with Wait / In time / Game, target
   tempos) → Challenge (the looper opened on the lesson's chords via `beatFromJam`, or a Game Mode star goal for odd meters).
   - **Melodic prog metal** (Plini, Intervals, Ichika Nito, Tim Henson, Syncatto style; no djent/chug): sound & touch; lyrical vocal-like
     phrasing (motif, space, slides into notes, landing on 9ths/3rds); Lydian #11 over maj7#11; Dorian natural 6 over m9; modal mixture
     (Emaj7#11 E Lydian ↔ Em9 E Dorian: only G#/G, A#/A, D#/D move); extended voicings with open strings (maj7#11, m9, add9, sus2);
     wide-interval hybrid picking; legato cascades; two-hand tapping (ambient tapping); odd meters 7/8 (2+2+3) and 5/4 (3+2); rudiment
     picking (paradiddle picking, muted arpeggios); putting it together (a 4-track looper piece: rhythm, embellishment, bass, lead).
   - **Acoustic singer-songwriter** (Dylan Gossett / Zach Bryan / Noah Kahan style, generic course name): open-chord palette + anchor
     fingers (G, C, D, Em7, Am7, Fmaj7, Cadd9, Dsus2/Dsus4) and the capo; strumming drive + accents; boom-chuck; mid-strum embellishments
     (3rd, sus2, sus4, add9, 6th hammer-ons/pull-offs); bass walk-ups/downs (G→F#→Em7, C→B→Am7); alternating thumb / Travis; open-string
     drones; song form + dynamics (verse = part A, chorus = part B in the looper).
   - **Embellished Rhythm generator** in Jam → Make a tab (`components/TabMaker.tsx`, new part): open/capoed chords with continuous
     mid-strum embellishments, stepping bass walks between chords, boom-chuck or alternating thumb, drones.
   - Genre shift still to finish: the words djent / math rock still show in lick style labels ("Math rock"), the drum groove "Prog / djent",
     the lick "Djent octave riff", a songbook description; decisions: new styles Melodic prog, Prog-pop (tapping + hybrid), Ambient tapping,
     Rudiment picking; heavy low chug goes.
   - Video candidates found 2026-11-07 (NOT yet verified: check each with YouTube oEmbed through WebFetch; the URL has to appear in the chat
     first, e.g. from a WebSearch with allowed_domains youtube.com): Lydian U2F6QNKbiAs, 11PFEV1PHKI; Dorian XZ1ebHPTmNQ; hybrid picking
     Ma6yYttz7lE; legato eIVVdevUSdM; Ichika-style tapping gC8qtzZYpRw, 0NLfCkgehdo; odd meter LA8Ucl_oDbI, -OGyvzznmrw; paradiddle
     picking QJApA3qodjQ; Plini writing 7L6a7dpQ3F8; prog chords ToqDrVMRpcs; anchor fingers MO6HLU06L4c; capo ikFZ1Ywdjak;
     embellishments A6Iw4dK-3-o; walks Ksy2QKDZFpg, DtE_FHRJgn8; drones pQ71rLu8WZU, kSiSqwZUiYU; song form qXvot5xEgP8;
     Travis K2Z3RZc5t-A; already verified earlier: ipAEa0RcKCg (American Trail strumming), CCy7o76cv60 (Coal hammer-ons),
     O9_HLJ7NYBI (bass walks), 1mKGX-XiEjA (Plini tapping), FvKiOyY-zOA (Plini pentatonic).
7. **Brainstorm the next build with him, back and forth** (he wants this before the credits reset, ~2026-11-13). His three topics (sent 2026-11-07 12:09):
   (1) **Deep overhaul of Zero to Hero + guitar theory, modeled on Pickup Music**: real depth, not primers, each idea with a concrete
   step-by-step practice plan; research pickupmusic.com (app, site, reviews: graded Learning Pathways, daily bite-sized exercises,
   CAGED/triad neck connection, jamming, graduation pieces) and why players praise it; make Learn / Zero to Hero resemble that depth.
   Original text only, never copy their material. (2) **Quick Start Guide + in-depth illustrated manual with real Day Mode screenshots**
   (how / why / when for every feature): propose how to design and generate it (screenshots via the browser tests' `shot` tooling).
   (3) **Strum Machine analysis + integration** (strummachine.com): a copy of its features deeply wired into the app (chord changes drive the
   floating finger diagrams, triad / pentatonic / chord-tone overlays, lessons), lots of built-in songs with real acoustic guitar sound;
   and give an opinion on an even better way: load a YouTube backing track and auto-sense key, timing and chords (Riff Scanner beat
   grid + chord finder + stems) so he can jam over it with the overlays; or combine both. Brainstorm these WITH him, back and forth.
   **Owner's answers 2026-11-07 (brainstorm round 1):** (a) Pickup-style depth: lessons = Learn → Practice → Jam → Check (the mic grades the
   Check step), a graduation piece per pathway from the composer, step-by-step daily plan; he wants MUCH deeper research on Pickup Music
   (see notes/research-pickup.md, keep extending it). (b) Strum Machine: YES to "both": Band mode (Strum-Machine-style) + Track mode
   (YouTube/file: scanner finds tempo, key, chords) feeding ONE chord chart that drives finger box + overlays + lessons.
   (c) **Acoustic guitar sounds are NOT good enough: he needs far more life-like, realistic acoustic guitar** (strums, picking, bass,
   band); plan real multi-sampled / layered sources with licences checked (CC0/CC-BY only, credited; no non-commercial). (d) **Much larger
   song library** (public-domain/traditional/original; no copyrighted songs, lyrics only pre-1929). (e) **Manual: BOTH in the app and a
   file he can send** (PDF and/or Docs), real Day Mode screenshots made by the browser tests. (f) **A top-level Settings tab**: Settings is
   buried in Learn and hard to reach; make it easy to get to (ask him: 6th tab, or a gear button on every screen?).
   **Round 2 answers (2026-11-07):** graduation gig graded by the app only, NO sharing. **Settings: a gear button in the top corner of
   EVERY screen** (not a 6th tab); that gear opens all settings AND the manual (How to use KGuitar / Quick Start) in one place. Realistic
   acoustic: search free professional sample sets (licences first), owner does not need to record his own. RESULT: best free set = Meta Open Sound Steel + Nylon Guitar (CC0), see notes/research-acoustic.md (not yet auditioned).
   **Round 3 (2026-11-07), the big goal:** the Learn section must become "EXACTLY like Pickup Music" in depth: a full MASTERY curriculum so he
   can learn every concept in depth and become a pro-level player. Proposed shape (confirm with him): 6 grades (1 Foundations, 2 Neck
   knowledge, 3 Connect the neck [CAGED/pentatonic positions/triads], 4 Lead + harmony craft [modes, arpeggios, voicings, voice leading,
   legato/hybrid/bends], 5 Improvisation + harmony [chord-tone soloing, ii-V-I, borrowed harmony, transcribing, ear training], 6 Pro level
   [style fluency, composing, odd meters, chord melody, repertoire]); each lesson Learn → Practice → Jam → Check; each grade ends with a
   graded graduation gig; absorbs Zero to Hero + the Deep Dive spec (notes/next-build.md). Original text only; curated videos from the best
   teachers; build ONE grade at a time, starting with a pilot grade.
   **Round 3 answers:** owner is a late beginner who can play pentatonics; the curriculum must take a RELATIVELY NEW player all the way to pro
   (all 6 grades, none skipped). Proposed build order: Grade 1 = deepen the existing Zero to Hero (placement test lets him skip), PILOT =
   Grade 2 (his level: neck knowledge, barre chords, major scale, pentatonic -> CAGED intro), then 3, 4, 5, 6. Still to ask: minutes/day.
   **Round 4 answers (2026-11-07):** (1) CORRECTION (owner, 13:00): FIRST grade to build = **Grade 2 (Neck knowledge)**, as originally proposed (NOT Grade 3); then 3, 4, 5, 6; Grade 1 = deepen Zero to Hero. (2) Strum Machine side: "figure out
   a way to get realistic strum sounds": build a strum engine on the CC0 Meta steel samples (notes/research-acoustic.md): down/up strokes with
   per-string timing spread (8-25 ms, scaled by tempo + strength, up-strokes quicker and lighter, top strings only), per-string velocity curve,
   open-position bluegrass chords, bass-note + brush (boom-chuck), muted "chop", ghost/dead strums, pick + string noise, release/mute at the
   end, round-robin between the 3 velocity layers; search for CC0 recorded chord/strum one-shots to layer; A/B against current with the owner
   before replacing. (3) **Song library = 300 songs across genres, PRIORITY BLUEGRASS** (then folk, old-time, country, blues, Hawaiian,
   reggae, gospel/hymns). Only public-domain / traditional / our own originals (no copyrighted songs; lyrics only pre-1929); check each
   title's status, skip anything uncertain (e.g. later arrangements/authored songs); chords + form + sections + suggested tempo/key; Nashville
   numbers; each song works in Band mode and feeds the chord chart overlays.
   **Round 5 (2026-11-07), sound plan:** do the recommendation: (A) Band mode = free CC0 Meta steel samples + the new strum engine, A/B vs
   current with the owner; (B) Track mode = real recordings captured on the phone for personal practice only (never bundled/re-hosted/uploaded;
   no YouTube audio downloading). DESIGN FOR SWAPPABLE SOUND SOURCES: the strum engine must take any "strum pack" (a folder with
   `index.json`: chord or note -> stroke direction -> strength -> takes) so he can later drop in (1) his OWN recorded strums (write him a
   short recording guide: chords, down/up, 3 strengths, 3+ takes, chop/mute, 44.1 kHz, DI + mic) or (2) a PROFESSIONAL library he has
   WRITTEN PERMISSION to use (keep the licence/permission note + credit in `public/samples/<id>/LICENSE.txt` and in Settings -> Credits;
   he must confirm in writing before any such pack is bundled; never bundle a pack whose licence forbids app redistribution). Packs are
   chosen in Settings -> Sound (Auto = best installed), shown with their licence.
   Saved ideas: the Deep Dive course
   (notes/next-build.md "Saved for the next work cycle": real depth in CAGED, modes, intervals, ear training, voicings, soloing,
   improvising, voice leading); extra FX, note repeat/arp; weekly challenge + ghost; left-handed mode; Google Drive backup (needs his
   Google Cloud setup); app upgrades from the audit (lazy-load screens, tests in CI, lint, split PlayScreen, web offline cache);
   native MIDI for the Chocolate Plus (Step 1g); his artist profile through the app.
8. Final full check (Fold cover/inner, tablet, day/night/psy: `tests/browser/build14-test.cjs tour` + every suite), CLAUDE.md + guide +
   brother's Docs guide (https://claude.ai/artifact/7Cuc18hXrt23FDQ1PniqV5) up to date, test APK, then "ship it" → main + web app.

## How to check work (quick reference; details in CLAUDE.md and tests/README.md)
- `npx tsc --noEmit -p .`, `npm test` (logic chain), `npx vite build`, `npx vite preview --port 4173`, then browser suites with
  `CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome NODE_PATH=/opt/npm-tools/node_modules node tests/browser/<suite>.cjs [parts]`.
  Newest suites: looper-test, game-test, getsound-test, step1-test (gaps), step2-test, build33-test (voiceout), build14-test (tour + contrast).
- Big model files can't go through Playwright route.fulfill: seed Cache Storage `kg-models-v1` from `dist/__testmodels` symlinks
  (see getsound-test / build33 voiceout). Demucs files live in /tmp/claude-0/models/demucs (re-download from the pinned HF revision).
- The manual the helper reads (guide.ts → `systemPrompt`) must stay under 20000 characters (build25 logic test).
