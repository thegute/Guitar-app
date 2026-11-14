# KGuitar master plan (updated 2026-11-09)
Everything the owner has asked for, in one place. [M] = Opus medium is fine, [H] = needs Opus high.
✅ done on `big-update` (not yet in a test build) · 🔨 in progress · ⏳ queued. Nothing ships without "ship it";
**no test APK without asking the owner first**. Each item is its own checkpoint so it can be undone.

## A. Done since test-40 (waiting for the next test build)
- ✅ Game Mode: Yousician-style bouncing ball (tab slides, ball stays on the line, lands on each note on the beat, never leaves the screen).
- ✅ Hear it in Game: the tab scrolls and the ball bounces while the song plays itself (no scoring).
- ✅ Floating cards: Hand, Chord now & next, Mini neck, What you played, Bar & beat, Tempo, Quick tuner, Mini video, Practice timer.
  One or several, chosen per screen, × hides, – shrinks to a bubble, always on top, place themselves where they cover least.
- ✅ Menu: Play merged into Songs (opening a song shows the song player), **Now playing** bar on every other screen,
  **Settings** in the menu (You, Sound, Look, Cards, Backup, Manual). Gear sits in the menu, not a corner (a corner button would cover Play's buttons).
- ✅ (test-40) Riff Scanner marks hammer-ons, pull-offs, slides, bends and vibrato on clean guitar; fast runs kept.

## B. Medium batch: now, in this order
1. 🔨 Finish the menu change's browser tests (build18, build30). [M]
2. ⏳ **Tidy-grid windows**: every window resizable in width and height and movable, except Learn; windows snap side by side on big screens,
   one column on the Fold cover; content rearranges to fit. [M]
3. ⏳ **Exercises move into Learn** and get tidied: For you · Technique · Fretboard · Rhythm · Fingerstyle · Make your own; the floating hand
   replaces the windowed hand diagram. [M]
4. ⏳ **Jam simplified** to three choices: Play with a band · Make a beat · Loop myself. Solo over it becomes floating cards; Find chords moves to
   Add a song; Make a tab moves to Learn's exercise library. Jam feeds its chords and tempo to the floating cards. [M]
5. ⏳ **Tips**: a glowing dot on the Ask bubble when there's a tip for this screen, plus an "always show tips" option (Tips: Dot / Always show /
   Only when I ask / Off). Tips come from the manual, picked for the moment (first visit, struggling in a bar, a better way, features never
   opened); Show me / Got it / No more tips here; never nags. Smarter with Gemini. Tips ALSO give guitar advice (owner 20:44), with its own
   on/off switch in Settings. [M]
6. ⏳ **Beat maker** (Koala-like plus more), **mockup first for the owner to review**, then: fixed pro layout (transport bar, 4×4 pads,
   Pads/Steps/Keys/Mix/FX views, parts A–D, hold a pad = editor, Sounds drawer, ⋯ menu); its zones are resizable windows (transport pinned);
   **full screen ⤢/⤡** (hides banner, menu and Jam tabs); voice **"record this"** with a count-in (voice on the phone mic, recording from the
   chosen input incl. the USB pedal; footswitch backup); style starters + Variation + Fill; Swing + Humanise; riff → pads; **chord pads that
   follow the progression**; Practice over this; save kits + send to looper/library/recordings; **groovebox upgrades**: arpeggio/strum pills
   (Block, Pluck up, Pluck down, Strum, Pulse), slide a step = volume, hold a step = roll 2×/3×/4× or "only on bar 4", effects pad Pin +
   record finger movements, Kick Pump, Auto Bass, Warmth + Length dials. [M]
   **Owner 2026-11-11: "important to me": ALSO everything in Stage 6 of the Gemini roadmap PDF (notes/master-roadmap-2026-11-11.pdf):**
   - Posture-aware cockpit: unfolded Fold / tablet = 4 quadrants with no scrolling (pads with live mini-waveforms + playheads |
     step grid + drum layers | keys/piano roll + chord motion pills + XY FX | 4-track looper rings + docked target-tone fretboard);
     half-folded tabletop = grid, looper rings and fretboard on the top half, a giant 16-pad deck + footswitch bar on the bottom;
     ⤢ full screen starts the transport at pixel 0 with a small ⤡ exit.
   - "Match a Song's Vibe": a song file or YouTube link → BPM, meter, swing %, groove DNA (prog-metal double kick, reggae
     one-drop, Gossett boom-chuck…), key and chord colour → a similar-but-different starter beat ("How close?" slider,
     Reroll variation), a cousin chord progression, and "Extract drum one-shots from the song" (cleanest kick, snare, hat
     from the drum stem onto pads).
   - "Guitarcatcher": play your real guitar (plucks, bends, slides) to play the beat maker's synths, choirs, 808 bass or
     sliced pads live (needs the Stage 3 pitch-contour engine; target under 12 ms), recording into the piano roll.
   - Hardware-on-glass: MPC-style "16 Levels" (spread one pad over 16 by scale-locked pitch, velocity, filter warmth or
     decay), Tidy pads; step grid gestures (drag = velocity, swipe = 2×/3×/4× ratchets, hold = a wheel for fills on bar 4,
     probability %, pitch lock, per-row step length for 5/4, 7/8, 6/8 and polyrhythms); 1-tap Auto-Bass, Kick Pump,
     latched (pinned) XY FX trails, Auto-build song (parts A–D), Track mute mode.
7. ⏳ **Band behind me**: one button in the song player and Game Mode; the other tracks of a Songsterr/Guitar Pro song, or a chord-based band
   for chord songs, play quieter while your part is a little louder; a "band vs my part" slider. [M]
8. ⏳ **Shorts**: follow Mr. Tabs, Level Up Guitar Tabs and Kenneth Acoustic by default, keep the random mix of new channels. [M]
9. ⏳ **One Songs library**: My songs + Songbook in one list with search and filter chips (style, level, mine/built-in, learning, learned,
   review due); built-in songs' versions (easy/full/fingerstyle) inside the song. [M] (the automatic style/level guess is [H], in C)
10. ⏳ **Add a song in one box**: song name, link, file, screenshot or record, all from one place. [M]
11. ⏳ **Manual as a file to send** (PDF) + Quick Start, with real Day Mode screenshots made by the browser tests. [M]
→ Then ASK the owner before making a test APK / updating the web app. When he warns he's almost out of usage: make the test APK,
  update the web app, and write a GEMINI HANDOFF (notes/GEMINI-HANDOFF.md) so Gemini can work on items (he backs up the repo first).
  If usage allows after the medium batch: start the Riff Scanner (C, first item).

## C. Opus high batch
- **Riff Scanner from video** (the owner's #1 need): read the tab off the video frames, separate the guitar from the mix, slower guitar model,
  combine sound timing + picture frets, scan an A–B section, mark unsure notes; test on the Billy Strings Short; Jam Origin MIDI Guitar on the
  Mac as an answer key. [H]
- **Realistic acoustic sound**: free CC0 Meta guitar recordings + a strum engine (down/up, chop, boom-chuck, bass runs, timing spread, noise);
  **sound packs rendered on the Mac** from the owner's plugins (Ample SJ strummer, Orange Tree, Nembrini, Neural DSP Archetypes, .nam
  captures, Humanoid vocal chops), by script, no Logic work; packs live in a phone / Google Drive folder, **never in the public repo**;
  swappable packs (own recordings or licensed packs with written permission). Needs the Mac linked. [H]
- **Strum Machine Band mode** in Jam: strums D/U/X, bass B/A + walk-ups, strum feel controls, upstroke swing, backbeat, damped sustain,
  capo/drop D/open G, Cadd9 for C, standup bass, mandolin/banjo chop, foot tap; chart with 2–4 chords a bar, pushes, holds, rests, pickups,
  repeats + 1st/2nd endings, sections; 1-tap transpose; letters / Nashville / Roman; quick entry; drag to loop; auto speed-up; song lists.
  Chords drive the floating cards, overlays and lessons. Engine sound [H], chart screens [M].
- **300 songs, bluegrass first** (then old-time, folk, country, blues, Hawaiian, reggae, gospel), public-domain/traditional/original only. [H]
- **Automatic style and level** for every song added. [H]
- **Track mode**: a YouTube or audio backing; key, tempo and chords found automatically; overlays work on it. [H]
- **Band behind me from the real recording** (guitar removed, synced to the tab). [H]
- **Pull sounds from a song or YouTube into pads** (stems). [H]

## D. Next big update: the Learn revamp [H]
- Pro-level course like Pickup Music: 6 grades (Grade 2 first, then 3–6; Grade 1 deepened from Zero to Hero); every lesson Learn → Practice →
  Jam → Check (the app grades); graduation gig per grade graded by the app; placement test; "you are here" map; 5-minute lessons; theory checked
  by a second reviewer. Research: notes/research-pickup.md.
- **Your tab and technique books (PDFs) → tabs, exercises and practice plans**, kept private (never in the public repo), lessons in our own
  words with book + page. Brainstorm first.
- Older ideas to fold in: Progressive Melodic Metal + Dylan Gossett courses (blueprint).

## E. Still to discuss
- Brainstorm the books feature and the Learn revamp.
- Game Mode extras from the blueprint: YouTube backing minus the guitar, clean full-screen game; looper "start when I play".

## The owner's to-do while waiting (notes/WEEK.md)
Test test-40's Riff Scanner on your own playing and the Staged Right video; note bugs and ideas in WEEK.md.


## AI TEACHER (owner 2026-11-11 10:57; runs right after Stage 2, before Stage 4)
The ✨ helper grows into a teacher that listens to him play and coaches him. KGuitar's own measurements are the facts (notes, timing in
ms, trouble bars, trends, recordings); Gemini also hears a short clip of the run for tone / buzz / muting / feel (labelled as opinion).
- Talks spoken between passes + a text card; strictness is his setting (several levels); clips go to Gemini only when the teacher listens.
- Places: Play + Game (after runs and loop passes: one fix, a drill it sets up, re-listen), Learn (teaches lessons and Zero to Hero steps,
  grades gates, daily check-in using trends), technique trainers (bends, vibrato, chord changes, rhythm), Jam / looper solos (later),
  and a Teacher floating card on any screen.
- Memory of past lessons (what he was told, whether it improved) on the phone; works with the free Gemini key, falls back to the
  built-in coach (report card + rules) without a key.
- (owner 2026-11-13) Teacher characters, switchable: a cheerful neutral coach (default) and an encouraging, flirty "librarian" who
  believes in him (not strict), with a spice setting Off / Playful / Flirty / Max (suggestive, never explicit), off by default and
  out of the brother's guide. Advice stays honest underneath (one fix each pass). It suggests what to practise and he chooses. On a
  style path it tailors focus, examples, what it listens for and the exercises to that style. Camera hand checks explained, his
  call pending. Open: names, her picture (only from his own art), default spice, keep persona prompts private on the phone.
- Ideas list (brainstorm 2026-11-13): root-cause patterns over many runs → matching or Composer-made drills; song chunking + speed
  ladder + reviews; technique clinic (bend cents, vibrato width, changes per minute, buzz/muting); call and response; improv coach
  (chord tones on the beat, space); theory in context with course + book links; hands-free session director (mic + footswitch);
  weekly teacher note, then-vs-now picks; quick "someone's here" switch to the neutral voice; warmth that grows with his streak.
