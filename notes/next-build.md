# Changes waiting for the next build (owner is testing; don't ship until he says "ship it")

(Build 29 shipped everything before this.)

1. Gemini's voice no longer reads out "Say this in a warm way…" before the answer.
2. Gemini backups: your choice first, then Groq asked alongside it, then other Gemini models; failing models skipped for 10 minutes; slow models say "took too long".
3. Zero to Hero: the lists (Work on now, the gate, style paths) no longer squash the words into a thin column: the small ✓ / "I can do it" buttons only take the room they need.
4. Learn → Course: Zero to Hero is full width at the top (the practice course is under it), instead of half the screen.
5. Beat maker → Looper on small phones: "On the beat (4 bars)" no longer stacks word by word.
6. ✨ helper and 🎤 talk buttons: smaller, side by side, low in the corner (above the menu) so they cover less; the answer card opens above them.
7. New check that scans every screen, page, Learn tool and all five Zero to Hero phases at 4 screen sizes for squashed text, cut-off words and sideways scrolling (tests/browser/ui-scan.cjs): all clear.

## The "million-dollar" pass (owner said: do all 8, remember them and ask me about each so we can undo any)

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
