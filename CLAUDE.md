# KGuitar: project brief

A personal guitar practice app for its owner (one user, sideloaded), built as an Android app (Capacitor) plus web version.
Main phone: **Samsung Galaxy Z Fold 8** (cover screen ~412 dp wide, inner screen ~840 × 757 dp).
Electric guitar goes through a **Sonicake Amphonix 2** headphone amp (USB-C, USB Audio 2.0 class compliant) into the phone;
acoustic guitar uses the phone mic. Keep both working.

## What matters most
The **Play** screen (play-along) is the heart of the app. Everything else supports it:
- Load a tab (Guitar Pro file, pasted/uploaded text tab or chord sheet, shared from another app, examples), saved on the phone with its YouTube link and chord edits.
- YouTube mini player beside the tab (speed, A–B loop, Sync with tab). Error 101/150/152/153 means the owner blocks embedding: offer "Open in YouTube".
- The mic (or USB amp) listens; each correct note lights up green and the cursor moves to the next one. Wrong notes say what was played and what the tab wants.
- Two modes: Wait for me (follow) and In time (tab scrolls at tempo or with the synced video; perfect ≤45 ms, good ≤90 ms, else early/late; speed trainer).
  Chord-sheet steps (3+ pitch classes) are judged by chroma (strum-along).
- Tab numbers can show the note name too (fret / note / both). Tapping a note plays it and names it.
- "Hear it" plays the tab back (recorded samples, Karplus–Strong fallback) while the playhead moves.
- Scales & chords panel: detected key, solo scales, chord progression (from the tab, guessed, or edited),
  and the fretboard in Scale / Arpeggio / Triads / Connect (voice leading + a numbered walk into the next chord) modes.

## Stack and layout
- Vite + React 19 + TypeScript, Capacitor 8 (`app.kguitar`), fonts Barlow Condensed / Semi Condensed.
- Five tabs: Play, Songs, Learn, Jam, Tools (`ToolsScreen.tsx` switches Tuner / Tempo / Chords / Scales). `src/nav.ts`: `go(Destination)` takes a tab or a tool page;
  `openSongs(page)` opens a Songs page. Screens split into pages with `components/SubTabs.tsx` (`useSubTab`, remembered in `kg:sub:<screen>`).
- `src/screens/PlayScreen.tsx` (main; follow-along, play in time, section loop with pass scores, Hear it, split/tabletop layout, tab zoom, pedals),
  `SongsScreen.tsx` (Songs tab: My songs / Songbook / Practice / Add a song; per-song progress), `JamScreen.tsx` (progression generator with chord diagrams, strum + drum backing,
  looper recording, circle of fifths), Chords, Scales, Tempo (metronome), Tuner.
- `src/play/`: `inTime.ts` (timeline, judge, scoreRun, nextSpeed, InternalClock, VideoClock, matchTimed), `useInTime.ts` (also tells the listener which
  notes are due: `onExpect`), `songStats.ts` (runs, trouble bars, learned at a 90%+ full run at ≥0.75 speed, reviews after 3/7/14/30/60 days),
  `fold.ts` (Viewport Segments → tabletop), `handShape.ts` (hand positions, one finger per fret / first position, finger numbers).
- Play layout (`PlayLayout` in PlayScreen, `kg:playLayout`): drag handles (`components/Splitter.tsx`) for side width (wide), Scales & chords height,
  phone video panel height; panels tuck away; Full tab (`focus`) hides side/solo and the menu (`src/ui.ts` playFocus). Mini readout when the side is hidden.
  `components/HandShape.tsx` in the readout + HarmonyPanel 'hand' mode. TabView splits bars wider than the box (dashed `tab-cont` edges).
- Menu: slimmer rail (74 px), hide button / swipe → `kg:navHidden`; pull tab opens a drawer; poster thumbnail (`components/Art.tsx`, `kg:showArt`).
- Jam engine: `src/theory/progressions.ts` (22 styles, chord colours, endings, spice incl. secondary dominants / tritone subs / passing dim / chromatic mediants),
  `src/audio/jam.ts` (JamTransport: one clock for chords, drums, click and loop layers), `strums.ts`, `drums.ts` (synth kit + grooves),
  `looper.ts` (AudioWorklet recorder stamped with context frames, latency compensation + timing check). Recordings are exactly one loop long and start on the loop's first beat.
- Note detection: `src/audio/noteDetect.ts` (pure: spectral-flux onsets, harmonic salience with whitening + true-peak check, expected-note check
  with "what the pick added" diff, re-pick rule, overtone guard, double-listen before "wrong note"). `NoteListener` (follow.ts) feeds it from an
  AudioWorklet and exposes `expect(now, next)`. Bench: `npm run test:detect` (recorded samples × noise/phone/distortion; needs ffmpeg).
- Generators: `tabs/picking.ts` (Travis/arpeggio/strum patterns → tab), `tabs/chordMelody.ts` (melody over chords + arrangement, 7 styles, 3 levels),
  `tabs/licks.ts` (6 genres), `tabs/fromProgression.ts` (glue, starter progressions, Jam progression from storage), UI `components/ProgressionTabs.tsx`
  (Jam "Make it a tab" + Songs) and `components/LickMaker.tsx`. Generated songs are saved with `source: 'jam'`.
- `src/tabs/`: `model.ts` (Song model: strings 0 = lowest, midi includes capo), `textTab.ts` (ASCII tab parser incl. chord lines, techniques, rhythm from spacing),
  `gpImport.ts` (alphaTab importer only, lazy-loaded), `follow.ts` (NoteListener onset + pitch, matchNote), `harmony.ts` (chord parsing/guessing, timeline, voice leading, triads, walks, chord scales),
  `keyDetect.ts` (Krumhansl–Kessler), `library.ts` (IndexedDB + YouTube link parsing), `examples.ts`, `chordSheet.ts` (chords over lyrics → one chord per bar
  with shape + lyric + section), `importer.ts` (text → tab or chord sheet; files incl. GP).
- `src/audio/`: `engine.ts` (shared AudioContext), `pluck.ts` (sample banks in `public/samples/<id>/` from `tools/make-samples.py`, Karplus–Strong fallback),
  `tabPlayer.ts`, `metronome.ts`, `pitch.ts` (tuner), `input.ts` (input device choice: auto / phone mic / USB), `gear.ts` (per-input profile: gate + latency,
  set by `components/GearSetup.tsx`), `chroma.ts`.
- `src/controls/pedals.ts` (keyboard / Bluetooth page-turner and Web MIDI → actions; the top-most screen gets them), `src/backup.ts` (JSON of `kg:*` storage + songs;
  Filesystem + Share on Android, download on the web), `src/shareIn.ts` + native `ShareInPlugin.java` (Android SEND intents: text, files, YouTube links).
- `src/components/`: `TabView.tsx` (SVG tab renderer), `Fretboard.tsx` (roles root/chord/scale/next/common/pass/target/live), `HarmonyPanel.tsx`, `YouTubePlayer.tsx`, `InputPicker.tsx`.
- Design tokens in `src/styles.css`: theme roles `--bg --surface --ink --accent --gold --mint --coral --hero` for day / night / psy / auto (`src/theme.ts`);
  old names (rosewood / pearl / amber / jewel / strobe) are aliases. Fretboard colours are `--fb-*` (wood `--wood-1/2/3`, `--inlay`; changed only by Psychedelic). Bottom nav (5 tabs) under 760 px, side rail above.
- Works on any Android 7+ phone or tablet; check small phone 360 px, Fold cover/inner and 12" tablet portrait/landscape.

## Build and release
- Every push to `main` runs `.github/workflows/android.yml`: builds a signed release APK and publishes GitHub release `build-N` (`KGuitar-N.apk`).
- The signing keystore is committed on purpose (`android/app/kguitar-personal.keystore`, personal sideloaded app) so updates install over each other. Never commit any other secrets.
- `gh` GraphQL may be blocked in Claude's sandbox: use `gh api` REST calls to check runs and releases.

## Testing
- `npm test`: logic tests (tab parsing, GP import round trip, chords, follow matching, Jam engine, practice tabs, Learn, build 6: chord sheets, in time,
  song stats, gear, pedals, backup). `tests/test-env.ts` stubs browser globals for tests that import app modules.
- Browser tests (play, jam, learn, build6) with a synthesized guitar as the fake mic: see `tests/README.md`. Check cover and inner sizes, day and night, no horizontal overflow, no page errors.
- Never give two files names that differ only by case (breaks macOS and esbuild).

## Learn tab (src/learn/)
- `LearnScreen.tsx` hub: Today card (pick-shaped goal ring, streak + freezes, week strip, level/XP, "I'm away from my guitar" switch),
  today's plan (`plan.ts`, guitar vs away), daily quests, practice course, path to mastery (`path.ts`, 7 stages of self-checking goals), tools.
- `progress.ts` (day logs, streak: any 5 minutes counts, with or without the guitar; away mode auto-off after 30 h; Leitner spaced repetition; stars;
  `usePracticeTimer`, `bump`/`bumpCounts`), `game.ts` (XP/levels, freezes every 7 days, quests, badges, celebrations), `reminders.ts` (local notifications,
  14 days ahead + optional streak saver, skipped once today counts; icon `drawable/ic_stat_kguitar.xml`).
- `quiz.ts` + `QuizRunner.tsx` (tap or play mode), `EarTrainer.tsx` + `audio/drone.ts` (Sonofield-style drone degrees), `caged.ts` + `CagedExplorer.tsx`
  (shapes adjusted per string for non-standard tunings), `lessons.ts` + `LessonReader.tsx` (original text following Offtonic Theory's chapters, with links;
  never copy Offtonic's text), `Tools.tsx` (chord changes with optional chroma counting, rhythm trainer, circle of fifths), `ProgressView.tsx`, `Settings.tsx`
  (instrument switch always asks "Are you sure…"), `Celebration.tsx`.
- Counters other screens feed: notesHit, songNotes, exerciseNotes, songsFinished, loop90 (Play), loopsRecorded (Jam), plus timers in Play/Jam/Tuner.
- `src/nav.ts`: `go(tab)` and `openInPlay(doc)` for cross-screen links.
- `guide.ts` + `GuideScreen.tsx` ("How to use KGuitar", every feature with Show me links) and `components/Welcome.tsx` (first launch: instrument, input setup,
  goal, reminders; skipped for existing users; `kg:welcomed`). Keep the guide up to date when features change: the owner's brother learns the app from it.
- Songs are kept in per-instrument banks (`SongDoc.inst`, `docInstrument()` sorts older songs by tuning); Play remembers the last song per instrument.
- App art: the owner's own illustration `art/kguitar-art.jpg` (ukiyo-e psychedelic chocolate-lab samurai with a neon Strat and katana).
  `node art/from-image.cjs art/kguitar-art.jpg 0.483 0.27 1.85` makes the launcher icons (picture as the adaptive background), Android 12+ `splash_icon`,
  WebP splash screens, web icons and `public/art.jpg` (welcome screen, guide). Previews in `art/preview/`.

## Sounds (build 10)
- `audio/pluck.ts`: SOUNDS registry (acoustic, j45, nylon, clean, electric = jazz, crunch, metal, synth). Banks are
  `public/samples/<id>/index.json`: flat `{midi: file}` or groups `{notes, pm, power, powerpm}` (amp tones). Onsets are trimmed
  at load (MP3 padding). `strum()` plays power chords (R-5 or R-5-8) as one recorded chord on amp tones; `pm` = palm mute.
  `soundForProgram()` maps a Guitar Pro track's GM program (SongTrack.program) to a sound; Play's Sound picker (global
  `kg:sound`, Auto = song's sound or instrument default). Jam has its own `kg:jamTone` (Auto = STYLE_DEFAULTS[style].tone).
- Rendering (offline, owner's gear NOT in the repo): `tools/guitar_di.py` (modelled string → pickup DI), `tools/nam_render.py`
  (numpy NAM WaveNet player), `tools/render_tones.py --gear <folder with "Amp Models & Presets" and "IR">` (5150 captures +
  York MES 412 / Calypso V30 / '66 Deluxe / J-45 IRs). Gear was staged from the Mac's ~/Downloads.
- `tools/make-samples.py` (tonejs acoustic/electric/nylon/bass; static gain, no loudnorm), `tools/make-kit.py <avl-drumkits>`
  (github.com/studiorack/avl-drumkits, CC BY-SA 3.0, credited in Settings).
- `audio/drums.ts`: recorded kit with velocity layers, hi-hat choke, per-groove kit/level, fills (`FILLS`) and crash on the
  loop restart. `audio/bass.ts`: BASSLINES + `bassMidi` (walking, approach notes). JamTransport has bass bus + sound; a new
  strum stops the last one. `engine.ts` master: compressor + soft ceiling.
- Check the mix: `node tests/browser/sound-capture.cjs Metal,Reggae` (PARTS=guitar|bass|drums) then
  `python3 tools/analyse-capture.py tests/browser/out/sound-metal.wav 140`. Live guitar input is never processed or monitored.

## Build 11 (review pass)
- Metronome: recorded cross-stick / cowbell / hi-hat clicks and `Metronome.groove` (a GROOVES drum beat in 4/4, fill every 8 bars).
- Tuner: octave guard (a low string reading an octave high must hold ~20 readings before the needle follows).
- Play: video link box opens only from the Video button when the song has no link (`videoAsk`); Hear it on amp tones
  mutes the last note when the next single note is picked. Jam: "Loading sounds…" waits for banks; 'S' chops keep bass ringing.
- noteDetect: re-picked current note accepted when it is the loudest plain note and ≥1.08× louder than before; diff-view
  candidates next to a much louder note are pick noise (`shadowed`). Bench now includes metal / clean / J-45 banks.
- Chord strum-along (chroma) bench (scratch only): right chords 18/18 accepted on acoustic and clean; major/minor mix-ups
  rejected; a triad is accepted where a 7th chord is expected (3rd harmonics) — left lenient on purpose.

## Build 12 (owner: "a little cluttered", distorted "fake, like a keyboard" and "thin" in Jam)
- Tones: `guitar_di.pluck(human=1)` (attack pitch settle, detune/wander, pick click, varied pick spot/strength);
  render_tones `variants` (pm 2, power 2, powerpm 3 takes; index values may be lists), `weight` EQ, 112 kbps. pluck.ts
  `take()` rotates takes; `double` = two takes hard L/R (+ tiny detune if one take) — Jam rhythm on amp tones only.
  SoundInfo.band = Jam mix level (metal 2.0, crunch 1.45); BassLine.drive feeds JamTransport's driven bass path.
- Declutter (owner said keep the Play toolbar as is): `components/Fold.tsx` (Fold = folding section with summary +
  remembered state `kg:fold:<id>`, useHint/HintHead = ⓘ explanations). Jam: Band line + editor, Make it a tab
  segmented (pick | melody | licks; ProgressionTabs `part`), Looper/Scales/Circle/Famous as folds. Learn: quests,
  course (Continue button, units start closed), path as folds. Songs sheet: your songs first, generators folded.
  Settings explanations behind ⓘ. `.panel .panel` drops its frame.

## Build 13 (songbook, coaching, Find the chords, pinch zoom)
- Songbook: `tabs/songbook.ts` (~30 folk / bluegrass / reggae songs; ABC melodies via `tabs/abc.ts`, chord charts, parts
  words / melody / rhythm / octaves at levels 1–4; reggae = originals + public-domain tunes; lyrics only pre-1929),
  `tabs/fingering.ts` (Viterbi fingering), `components/Songbook.tsx` (Songs sheet fold `songsBook`), ids `sb:song:part:inst:tuning`.
  Open built-ins through `refreshBuiltIn` (library.ts) / `loadSongbookDoc`: made fresh, keeping the owner's video, chords, loop.
- Song model: `meter`, `strum`, `drums` (GP percussion), `backing` ({groove, bass}); `trackPickup`/`pickupShift` (model.ts)
  is the one pickup rule (a first bar shorter than the bars after it). Examples carry their real rhythm (`EXAMPLES[].rhythm`).
- Play: song check (`play/songCheck.ts`, `SongCheckCard.tsx`, opens once per new song, `kg:checked`), retune notice,
  🥁 Band (`audio/band.ts`: GP drums/bass/other tracks or songbook backing; `kg:playBand`), ⏺ Record (`audio/takeRecorder.ts`),
  1 & 2 & counts (`kg:tabCounts`), strum coach for chord sheets (`play/strumCoach.ts`, `kg:strumBySong`, In time judges each
  strum), chord help (`play/chordHelp.ts`), clean-run nudge to In time, rest blocks (`restRuns`), tap-to-sync in the video.
- Learn: About you (`learn/profile.ts`, Welcome step + Settings) drives the plan and songbook picks; lessons are Read / Watch /
  Play (`learn/lessonExtras.ts`: a YouTube video per lesson, checked with oEmbed, and exercises incl. `lessonTab` tabs);
  Technique (`learn/techniques.ts`, `TechniqueLessons.tsx`), Bends & vibrato (`BendTrainer.tsx`), skill trends (`learn/trends.ts`).
  Quiz necks: every string/fret is a tap target (`fb-hit`); a tap on the wrong string says which string to use.
- Jam: Find the chords (`components/SongFinder.tsx`, `audio/chordFinder.ts`, `audio/voiceGate.ts`): mic only (never YouTube
  audio), chords (chroma templates) or a melody (NoteSegmenter), talking always and singing optionally left out.
- Amp tones: whole recorded chords (`maj`/`min` groups, bass 40–52) for strums on crunch/metal.
- Pinch zoom (`components/Zoomable.tsx`: `usePinch`, `Zoomable`, `useZoomBox`, `kg:zoom:<id>`): tab, fretboards (edge arrows when
  wider than the screen), chord shapes, circle, hand shape, calendar, Jam cards. Tapping the current menu tab goes back to its start.
- Tests: `tests/build13-logic.test.ts`; browser `tests/browser/build13-test.cjs` (lessons, technique, songbook, plan, play,
  intime, finder, melody, learnmisc, sizes) and `tests/browser/quiz-test.cjs` (every quiz answered by tapping on screen, right
  and wrong). Fake mics: `gen-chords.cjs` (chords.wav), `gen-ode.cjs` (ode.wav); `make-gp.mjs <out> late` for rest blocks.
  Lesson videos were checked with YouTube oEmbed (title back = exists and embeddable); WebFetch reaches it, the shell can't.

## Build 14 (owner: "still a little cluttered", "more intuitive", plus a Psychedelic look)
- Menu: Play · Songs · Learn · Jam · Tools. Songs is its own tab (`SongsScreen.tsx`, the old Songs sheet is gone): My songs (only the
  owner's own: not examples, lessons or songbook), Songbook, Practice (practice tabs, build-your-own, picking, licks, examples), Add a song.
- Play: one row under the readout: Wait for me / In time, ⟲ Loop, Hear it, (recording timer), Options (sliders; label hidden < 440 px).
  Everything else is in the Options sheet (`.play-opts`): Speed, Sound, band, Click / Hear the tab too / Speed trainer (In time), Record
  yourself, Numbers, Count it or Strum, hand shape, Size, Split, Exact octave, Sensitivity, Set up input, Start over. The input button
  has a yellow dot until input is set up (`needsSetup`).
- Learn: Today (today card, About you, plan, quests, backup nudge) / Course (Continue + units, path) / Explore (tools in groups).
  Jam: Jam (generator, Looper, Famous) / Solo over it (mini transport, scales, neck, circle) / Make a tab / Find chords.
  Settings: You / Sound / Look / Backup. Tools keeps its switch (now `.subtabs`).
- Psychedelic (`data-theme="psy"`, `data-motion` on/off from `kg:psyMotion`): tokens block after the dark media block; `PsyBackdrop`
  (fixed, z-index −1: tiled `public/psy/liquid.webp` drifting + hue-rotating under a dark veil); `PsyArt` (renders only in psy):
  face (Songs empty state, menu/Learn thumb, celebrations), pop (Songs header, Look swatch), melt (Jam header, pulses with the beat while Jam plays,
  `--beat`), shrooms (oni mask + mushrooms, Tools header), kaleido (today card), tunnel (celebrations), Mandala (SVG round
  the goal ring). Art made by `python3 tools/make-psy-art.py` from `art/kguitar-art.jpg` (+ original procedural pieces). Words stay on
  near-opaque dark cards; rainbow only on big headings; dark text on bright buttons. Reduced motion and the switch stop all movement.
- Day `--ink-3` and `--mint-text`, Night `--ink-3` and `--hero-mute` were lifted to pass 4.5:1.
- Tests: `tests/browser/build14-test.cjs` (tour: every screen and sub-tab in day/night/psy at cover + inner, psy at phone + tablet;
  no sideways overflow, no errors, and a pixel contrast check of visible text against what's really behind it; play options; songs;
  psy art/motion/beat). Older browser tests were moved to the new layout.

## Build 15 → 16 (owner: Psychedelic the default; then "I don't like those dogs, use these", "use these images, take snippets")
- Psychedelic is the default (`themeChoice()` falls back to 'psy'); `kg:psyDefault` makes every install switch to it once
  (browser tests seed `kg:psyDefault` so a seeded theme sticks). theme-color and the Android background are #14002b.
- ALL Psychedelic pictures come from the owner's own artwork in `art/` (samurai-dogs.jpg, samurai-dogs-2.jpg, psy-scenes.jpg,
  concert.jpg, ninja.jpg, princess.jpg, story.jpg, kguitar-art.jpg). `python3 tools/make-samurai.py` cuts them into
  `public/samurai/`: faces `<dog>.webp` (12 dogs: lab = Brandy, the owner's chocolate lab (samurai poster, ninja, festival
  show), princess = Brandy as a princess (her story panels too), shiba, husky, shepherd, boxer, golden, rottweiler,
  frenchie, akita, doberman, muscle = pit bull), `card-*` (900 px whole pictures), `wide-*` (banners dragon / vortex / torii / waves,
  story rise / march / attack / peace, the concert `stage`), `float-*` (soft-edged round snippets), `strip.webp` (all heads),
  `thumb-*` (gallery). Crop boxes and panel edges are in the script. My drawn SVG dogs/scenes were removed (owner didn't like them).
- `src/art/samurai.ts` (DOGS: `name` only for Brandy, `breed` for screen readers, cards; GALLERY without titles, src helpers, STRIP_ORDER, hashStr); `components/PsyArt.tsx`: PsyDog
  (face; your samurai `kg:psyDog`, 'mix' = by place and day; `breedOf(id)` for songs), PsyDogCard, PsyPic (header picture,
  object-position), PsyStrip, Mandala, PsyBackdrop (liquid + floating snippets). `make-psy-art.py` now only makes face / tunnel / liquid.
- Where it shows: Songs header = strip; My songs rows = a face each; Learn header = the march, today card = peace; Explore tool
  stickers = faces; Jam header = the concert stage (pulses with the beat); Tools: Tuner dragon guitar, Tempo amp vortex, Chords
  mushroom guitar, Scales waves; Settings header = torii volcanoes; Finished / quiz end = your samurai's face; empty pages and big
  celebrations = one of its whole cards; Settings → Look: Your samurai (Mix + 12) and The art (gallery, `ArtViewer` with ‹ ›).
- Only whole pictures move (cheap for the phone), in synced steps 4 times a second (liquid 120s steps(480), floaters 12s steps(24),
  mandala 60s steps(240)). While any input is open, `openInput()` (audio/input.ts) sets `data-listening` on <html> and the
  background pauses: Find chords polls the mic on the page's thread, and under load the motion made it miss a re-picked note
  (build13 melody). Loose field labels get a dark chip in psy so they read over the art.

## Builds 19–21 (exercises, video lessons, drums, beat maker, Ask, sessions, Zero to Hero)
- Exercises: `src/exercises/` (catalog ~800, `build.ts` builders, `fingerstyle.ts` Marco-Cirillo-style melodic fingerstyle, ExerciseBrowser on Songs → Exercises; `openExercise(code | 'type:<id>')`).
- Video lessons (phone only): `src/lessons/` + native `LessonFoldersPlugin.java`, `MediaWebViewClient.java` (SAF folder, byte-range `/_kg_media_/`). Never copy, convert or index the owner's course files; nothing of them in the repo.
- Drums: 8 kits incl. 808/909 synth, perc voices, 41 grooves. Instruments: `tools/make-instruments.py` → `public/samples/inst/` (Salamander CC BY, VSCO 2 CE CC0, MusyngKite CC BY-SA; credited in Settings).
- Beat maker (Jam → Beat maker, `src/studio/`): `StudioScreen.tsx` (all sections are `Win` windows: Controls, Drum pads with big kick/snare/hat, Drum layers,
  Keyboard with chord helper + lit chord notes + hidable guitar neck, Looper, Step grid, Piano roll, Mix, Practise over it), `beat.ts` (Beat, `layers` = DrumLayer,
  PATTERNS one-tap layers, STARTERS, `applyBeatChange`), `transport.ts` (one clock; `allRows`; custom pad samples), `loops.ts` (WSOLA, gridOffset, fitToBars, IndexedDB),
  `practice.ts` (chords per bar, beatFromJam), `mySounds.ts` (phone folder of pad samples). ● recording makes one drum layer per pass. Pedal: right = record next loop,
  left = undo, hold = stop (`pedals.ts` hold support).
- Windows: `components/Win.tsx` (`WinArea area=… defaultHidden`, `Win id title`): ☰ drag to reorder, – tuck into the tray, ⇕ resize, Reset layout; `kg:win:<area>`.
  Used in the beat maker, Jam (jam + solo pages), Learn → Today. Play keeps its own layout (splitters, tuck-away panels).
- Hand guide: `components/HandGuide.tsx` (handGroups → one card per hand position) under ProgressionTabs Preview, ExerciseBrowser, the studio lick.
- Ask (menu button "Ask" = search + assistant): `components/SearchSheet.tsx`, `assistant/plan.ts` (AI picks only from building blocks: search results, places,
  exercise types, licks, techniques, beat changes; falls back to the built-in planner `sessions/recipes.ts`), `assistant/providers.ts` (Gemini, Groq, OpenRouter free;
  Claude/ChatGPT paid; keys in `kgx:ai`, never in backups), `assistant/AiSetup.tsx` (Settings → You → AI helper), `assistant/bus.ts` (`askAssistant`).
- Tab from a screenshot: `assistant/TabFromPicture.tsx` (vision AI → ASCII tab → songFromText), in Jam → Find chords and Songs → Add a song. Mic Notes mode is
  labelled a rough guess (full mixes can't be transcribed reliably).
- Sessions: `sessions/session.ts` (timed steps, each opens a Target; `kg:session`), `SessionBar.tsx` (top bar), `MySessions.tsx` (Learn → Today).
- Zero to Hero (guitar): `learn/zeroHero.ts` + `ZeroToHero.tsx` on Learn → Course (ukes keep the path to mastery): the owner's plan doc
  (https://claude.ai/artifact/LQjDVM8yCNx2WmGrkT9Xnm), phases + gates (auto-checked where measurable), start check, daily routine as a session, JustinGuitar links only.
- Tests: `tests/browser/build20-test.cjs`, build19, build14 tour (Songs tab "Exercises"), search-test.

## Builds 22–24 (shipped as build-24)
- Beat maker: typed tempo + hold −/+, `fitToBars` stretch ≤12% else trim, on-screen notes recorded as notes while looping, 🎚 Volumes (`voiceVol`), keys volume.
- Songbook: `arrangeSong` full arrangements (Carter style / chord-melody), genres country, pop, bluesrock, reggaerock, prog with original songs. Jam: 9 new styles.
- Licks: billy, acoustic, reggaerock (Jawaiian merged in), popsoul, progclean; first 25 per style have breakdowns (`autoBreakdown`). Back steps inside licks.
- AskBubble (✨, draggable, `kg:askBubble`), chat history (`assistant/chat.ts`), read aloud (`assistant/speak.ts`, SpeakPlugin.java). Full screen (ImmersivePlugin.java, `kg:fullScreen`), `--sab` padding.
- Win: tap title folds, ☰ Move / – Hide / ⇕ resize, LayoutHint. Exercises and Songs → Practice are WinAreas. `audio/stopAll.ts` stops sound on page change (`kg:keepMetronome`).
- Rhythm trainer count-in bar. My recordings (`audio/recordings.ts`, `learn/MyRecordings.tsx`, Play "Keep it"). Zero to Hero style PATHS (`pathSteps` in the routine).
- `notes/next-build.md` = the owner's change list between builds (he tests before "ship it").

## Build 25 (owner's UX pass)
- Play: chord peek (`components/ChordPeek.tsx`, hold `[data-chord]` on the tab or chord strip; gone 1.5 s after release), music stand (`stand`, `standZoom`, `.stand-bar`), tidy while playing (`kg:playTidy`), big count-in (`useInTime` countIn) + loop flash (`wraps`), Hear it "Loading sounds…".
- Jump back in (`components/JumpBackIn.tsx`, Learn → Today, Songs → My songs; `routine(v, 15)`), Suggested for you (`exercises/suggest.ts`), lick chainer (`licks/chain.ts`, `components/LickChainer.tsx`, `kg:lickChain`).
- Helper: screen awareness (`assistant/screen.ts` `useScreenInfo` in Play, Exercises, licks, Jam, lessons, Tuner/Tempo/Chords/Scales), compact manual from guide.ts at the top of the prompt (screen state last), quick Play commands (`playCommand`, spoken numbers),
  🎤 hands-free talk (`assistant/listen.ts`, native `ListenPlugin.java`; Play ignores the mic while `talkingNow()`), Gemini retries/fallbacks + streaming (`streamGenerateContent`), thinking off on 2.5 Flash / "low" on 3+, Gemini TTS voice (`speak.ts`, `kg:geminiVoice`); built-in helper keeps the phone voice.
- Tests: `tests/build25-logic.test.ts`, `tests/browser/build25-test.cjs`.

## Next up — pick up here
1. Owner tries the build after 24; fix what he finds. Untested on a real phone: 🎤 talk with the USB amp plugged in / while Play listens, Gemini voice, streaming in the Android web view.
2. Note follower accuracy (fewer misreads, accept bends; GP test files in the scratchpad testdata) and a better note detector for Notes mode (own guitar only).
3. Hand position accuracy in Play, Jam looper loud/reliable, ukulele theory, more badges, chord-tone lessons, deep CAGED, a simplicity pass.
4. Keep the brother's Docs guide (https://claude.ai/artifact/7Cuc18hXrt23FDQ1PniqV5) in step with the in-app guide. The owner should switch on GitHub Pages
   (Settings → Pages → Source: GitHub Actions) for the web version.
   Owner rules still hold: only "Brandy" is named on screen; never invent names or titles for the art or the dogs.

## Ideas not done yet
Left-handed mode, automatic tempo detection from the video, per-note polyphonic transcription (chords are judged by chroma only), cloud sync between devices.

## Working with the owner
Explain things plainly: a guitarist, not a developer. Ask before deleting anything on their computer.
Tab search opens Songsterr / Ultimate Guitar / Google in the browser (their APIs are private), then the GP file is uploaded or the text pasted.
