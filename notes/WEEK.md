# KGuitar: this week (2026-11-07 → credits reset ~2026-11-13)

Builds to test: **Android test-40** (https://github.com/thegute/Guitar-app/releases/tag/test-40) and the **web app**
(https://thegute.github.io/Guitar-app/). Both are the `big-update` branch, not the normal release.

## Owner's to-do list for the week
Tick with [x] and add a few words about what happened. Short notes are perfect ("missed the slide at 1:20").

### Riff Scanner (the main thing to test)
- [ ] Record yourself playing alone (clean guitar, Pocket Master or phone mic): a lick with **hammer-ons and pull-offs**. Scan it.
      Are h / p in the right places? Any marks on notes you picked?
- [ ] Same with **slides** ( / \ ) and **bends** (b) and **vibrato** (~).
- [ ] A **fast run** (16ths or faster). Does the tab keep every note now?
- [ ] The **Staged Right** video (https://www.youtube.com/watch?v=7YKecUwEzZU): scan it. Note the times it gets wrong.
- [ ] A lesson video **with a backing track or drums**. (Expected: techniques NOT marked yet. That's next session's job. Just tell me
      how the notes look.)
- [ ] Tap **Hear it** on a scanned tab: does it sound like what you played?

### Game Mode (look, don't fix)
- [ ] Start a song in Game and let it play. Note anything besides the ball that feels off compared with Yousician.

### Everything else on test-40 (only if you have time)
- [ ] Anything that broke or feels worse than before: where, and what you tapped.
- [ ] Web app: does it open and load songs on the computer and the tablet?

## What Claude works on next session (in this order)
1. Read your notes in this file and fix anything broken in test-40.
2. **Riff Scanner for videos**: take the guitar out of the mix first (6-stem model), so notes and techniques work on lesson videos with
   backing; then tune hammer-on vs slide (it sometimes reads a hammer-on as a slide); test on the Staged Right video.
3. **Game Mode: the real Yousician bouncing ball** (design agreed 2026-11-07: tab keeps sliding to the play line, a big ball stays at
   the line and arcs onto each note right on the beat, never leaves the screen; tab and ball wait together when paused).
   Then the floating finger box in Game, YouTube backing with the guitar removed, and the clean full-screen game.
4. **Brainstorm with you** on the three big ideas (Pickup-Music-depth Zero to Hero + theory; Quick Start + illustrated Day Mode manual;
   Strum Machine + YouTube backing that finds key, tempo and chords by itself).
Then: floating finger diagrams everywhere, looper "start when I play", the two courses.

## Quick ideas (add anything, any time, in any words)
Format: date, idea. Gemini ideas welcome too. Paste them here with "(Gemini)".
- 2026-11-07, Bouncing ball exactly like Yousician; the tab slides so the ball never hops off the screen.
- 
- 
- 

## Bugs or annoyances spotted
- 
- 

## For Gemini (brainstorming partner)
This repo is public. Useful files to give Gemini (the raw links are easiest for it to read):
- This page: https://raw.githubusercontent.com/thegute/Guitar-app/big-update/notes/WEEK.md
- Current state + full work queue: https://raw.githubusercontent.com/thegute/Guitar-app/big-update/notes/HANDOFF.md
- The whole app explained for a reviewer: https://raw.githubusercontent.com/thegute/Guitar-app/big-update/review/KGUITAR_REVIEW.md
- Developer brief: https://raw.githubusercontent.com/thegute/Guitar-app/big-update/CLAUDE.md
