# Changes waiting for the next build (owner is testing; don't ship until he says "ship it")

(Build 30 shipped as build-31. Everything below is on `big-update`, not shipped yet.)
Each item is its own checkpoint, so any one can be undone with `git revert <checkpoint>`. ASK THE OWNER ABOUT EACH after he tries it.

## Beat maker (Koala-style) and looper
16. **Pads play anything + Sample mode** (137b7a7, styles 57c7299). Hold a pad to record onto it; tap for pitch/volume/reverse/mode/fades/choke;
    pads can be an instrument note or chord, or a phone file; 16 Your pads. Ask: is hold-to-record easy enough? Any settings missing?
17. **Chop a riff + Keys mode** (e5c9867). Ask: does it cut where you picked? Is one pad up the keyboard useful?
18. **Effects pad** (b683757). Filter / echo / reverb / stutter / crush / gate on an XY square. Ask: which effects do you use?
19. **Parts A–D + song chain** (38be91e). Ask: is the song chain clear?
20. **Bounce and save as WAV (+ stems)** (f1d419a). Ask: do the files share where you want them?
21. **Redo** (ea07b82). 22. **Looper extras: backwards, half speed, per-layer effect** (e9760e3).

## Helper, feel, look
23. **Helper voice + answer length + card time** (c6ee058). No pause/noise, typed answers longer and stay, Settings → You → card time.
    Ask: is the voice clean on the phone now? Typed answers the right length?
24. **Haptics** (99efd2b). Buzz on pads, keys, tuner in tune, quiz, tap tempo, rhythm trainer (Buzz / Tap sound). Settings → Sound → Vibrate.
    Ask: too much, too little, anywhere it's missing?
25. **Android: still background; music stand slim buttons + phone bar hidden** (24fcce3). Ask: stand buttons small enough? Does the
    bar stay hidden and come back with a swipe on the Fold?

## Learning
26. **Theory videos re-picked** (cc9ee7b): guitar teachers where possible; tenor uke (22) and baritone (12) videos. Ask: better?
27. **Zero to Hero + style path videos** (d3a6454): 66 spots, ▶ Watch inline, ticked when played, a watch step every other day.
    Ask: are the teachers right for each style? Swap any you don't like.
28. **Slack key in Learn** (cfc1e98): 4 technique lessons + videos + open G drill; Slack key and Classical style paths; C wahine tuning.

## Tabs and songs
29. **Make a tab rebuilt** (ce8a3b3): composer for Licks & solos, Chord melody, Riffs in 21 styles from his artists; follows Jam chords;
    full neck except bluegrass; 6 new fingerpicking patterns; Jam: bossa nova → Classical, + Hawaiian slack key. Old lick maker and
    chord melody removed (Must-know licks library stays). Ask: do the styles sound like the players? Which ones need work?
30. **Songbook originals redone + new pieces + Classical** (b30df5d). Ask: does Iron Monsoon feel like prog metal now? Romanza right?
31. **Fretted capo-style licks move up the neck** (bfa5a9a).
32. **PDF tabs** (b4479dd). Ask: try a real Guitar Pro / Songsterr PDF print.
33. **Songsterr + Ultimate Guitar search in the app** (11d8484). NOT tested against the live sites from here (the sandbox can't reach
    them): first thing to check on the phone. Ask: does Open bring the tab in? Which tracks/tabs fail?
34. **Notes from a recording (Basic Pitch)** (c1048bc). Ask: how close is it on your own playing and on a solo lesson video?
35. **Guide + search** (2b33f81).
36. **Every window movable and resizable** (47d75ee; owner 2026-11-06: "all windows are resizable and moveable", picked
    reorder + resize everywhere, Play too). Tools, Songs, Learn (Course, Explore, Progress, licks, CAGED, circle, recordings), Jam
    (Make a tab, Find chords), Settings are WinAreas; Play: ☰ Move on the panel bars (Options → Move the panels → Put them back).
    Ask: is the extra title bar on every box OK on the cover screen, or should small one-box pages drop it?
37. **Fixes from the full test run** (17251ae): beat maker loop extras race, Make a tab sideways on 360 px, report card spilling
    over Scales & chords on phones.
38. **Generic style names** (owner 2026-11-06: "don't call it Marco Cirillo style"): every style, pattern, songbook credit and
    guide line uses a descriptive name; players only in "Listen to" lines and video credits.

Checks: npm test (build32/build33 logic, pdf-tab), browser: build33-test [pdf, maketab, transcribe, z2h], beatmaker-test,
windows-test [screens, drag, play], and the older suites.

---

# Waiting for the owner's verdict on build 30 (ask him about each; undo any with `git revert <checkpoint>`)

Each one is its own saved checkpoint, so any single one can be undone without touching the others
(`git revert <checkpoint>`). ASK THE OWNER ABOUT EACH ONE after he has tried the build.

8. **Practice button** (checkpoint 306533f). Learn → Today and Songs → My songs: one big ▶ Practice that plans 10/20/30 minutes:
   warm-up → Zero to Hero focus → the bars that go wrong most in a recent song (looped at 70%) → a song (due review / the one you
   were on / songbook). Plan shown under the button; runs as a session. Replaces "Jump back in" (Just carry on keeps Continue).
   Ask: does the plan pick good things? Is replacing the 15-minute session OK?
9. **Report card** (b4d19ca). After a whole run: score ring, vs last time, trouble bars marked on the tab (dashed red), one button for
   the next step (loop them at 70% / try In time at ¾ / speed up). Replaces the "Clean run, try In time" note for whole runs.
   Ask: helpful, or does it get in the way?
10. **"I played it right"** (ce5fd70). Under a wrong-note message (Wait for me). Moves on and remembers the mix-up for that input (mic and
    USB amp separate); chords get more lenient after corrections. New pedal action for it. Options → Learned → Forget them.
    Ask: does it learn the right things on the real guitar / amp?
11. **Then vs now** (1c7a500). Quietly records each whole run from the top; keeps the first, and later the best one 10+ points better.
    Report card button + Learn → My recordings. On by default; Play → Options → Then vs now switches it off.
    Ask: OK that it records by itself (on the phone only)? Space on the phone fine?
12. **Big view / cover screen remote** (fe0a99e). Stand on a narrow screen (Fold closed) opens: the note or chord huge, bar, next chord,
    the box green/red, big Listen / Loop / − % + / back. Inner screen: Big button in the stand bar.
    Ask: readable from where you sit? Anything else it should show?
13. **One icon set** (7d74482). Lucide line icons instead of emoji on buttons, labels, badges and celebrations (new library lucide-react).
    Ask: like the cleaner look, or miss the colourful emoji?
14. **Tidy-up** (bada4ec). One scale for corners, button heights and gaps; chips and buttons in a row line up; sheets rounder.
    Ask: anything look worse?
15. **What you use** (106c1ea). Counts screens/pages/buttons on the phone only; Settings → You → What you use. After a month: trim.
    Ask: in about a month, look at it together and decide what to tuck away.

Checks: npm test (new tests/build30-logic.test.ts), tests/browser/build30-test.cjs (report, practice, right, tvn, remote, usage),
ui-scan at 4 sizes, build14 tour + contrast, older browser suites.
