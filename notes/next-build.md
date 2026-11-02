# Changes waiting for the next build (owner is testing; don't ship until he says "ship it")

(Build 29 shipped everything before this.)

1. Gemini's voice no longer reads out "Say this in a warm way…" before the answer.
2. Gemini backups: your choice first, then Groq asked alongside it, then other Gemini models; failing models skipped for 10 minutes; slow models say "took too long".
3. Zero to Hero: the lists (Work on now, the gate, style paths) no longer squash the words into a thin column: the small ✓ / "I can do it" buttons only take the room they need.
4. Learn → Course: Zero to Hero is full width at the top (the practice course is under it), instead of half the screen.
5. Beat maker → Looper on small phones: "On the beat (4 bars)" no longer stacks word by word.
6. ✨ helper and 🎤 talk buttons: smaller, side by side, low in the corner (above the menu) so they cover less; the answer card opens above them.
7. New check that scans every screen, page, Learn tool and all five Zero to Hero phases at 4 screen sizes for squashed text, cut-off words and sideways scrolling (tests/browser/ui-scan.cjs): all clear.
