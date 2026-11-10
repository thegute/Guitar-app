# KGuitar: handoff for Google Gemini (2026-11-09)

You're helping the owner (a guitarist, not a developer) on his personal guitar practice app while Claude is out of credits.
He backs up the repo before you start. Work ONLY on the `big-update` branch, never `main` (main = the release; it ships only
when he says "ship it"). Explain things to him in plain words.

## Read first (in this order)
1. `notes/MASTER-PLAN.md`: everything he asked for, with status (✅ done, ⏳ queued) and effort ([M] medium, [H] hard).
2. `CLAUDE.md`: the developer brief (stack, files, how features fit together, testing).
3. `notes/HANDOFF.md` (top part, the 2026-11-09 lines): his latest decisions in his own words.
4. `notes/owner-brainstorm-2026-11-09-part1.txt` and `-part2.txt`: his Gemini brainstorm (Mac plugin sounds, Strum Machine
   details, beat maker groovebox upgrades, band behind the tab).

## The app in one paragraph
Vite + React 19 + TypeScript, Android via Capacitor 8. Menu: Songs · Learn · Jam · Tools · Ask · Settings. Opening a song shows
the song player (`src/screens/PlayScreen.tsx`, tab + video + listening + Game Mode). Floating cards (`src/float/`,
`src/components/FloatCard.tsx`) hover over screens. Windows (`src/components/Win.tsx`) can be moved and resized in a tidy grid.

## Where Claude stopped (exactly)
Last commit `3b01f79` on `big-update`; test APK = the newest `test-N` GitHub release (built from that commit).
Done in this round (all checkpointed, one commit each):
- Game Mode bouncing ball (`src/components/GameHighway.tsx`), Hear it drives the highway (`TabPlayer.position()`).
- Floating cards: hand, chord now & next, mini neck, what you played, bar & beat, tempo, quick tuner, mini video, timer.
- Menu: Play merged into Songs, Now playing bar (`src/components/NowPlaying.tsx`), Settings in the menu with Cards + Manual.
- Tidy-grid windows: width + height resize, move beside others (not on Learn's own pages).
- Exercises moved to Learn → Exercises with sections (`src/exercises/ExercisesPage.tsx`).

**In progress when Claude stopped (finish these first):**
1. `tests/browser/build25-test.cjs` line ~272 times out waiting for `.chain-pick-add`: the lick chainer now lives in
   Learn → Exercises → **Make your own**. Fix the test: after `sub(page, 'Exercises')`, click
   `[data-testid=ex-sections] button:has-text("Make your own")` before using the chainer. (The suggested-cards check above
   it runs in "For you", which is the default section.)
2. `tests/browser/windows-test.cjs` reports "Play phone: dragging the bar under Scales & chords did not make it taller".
   Check whether the Now playing bar or a floating card now sits over that splitter on the phone size, or whether it is
   older flakiness (run it twice). Do not weaken the check; fix the cause.
3. Then run `npm test` (logic) and the browser suites listed in `tests/README.md` (needs `npm run build` and
   `npx vite preview --port 4173`).

## Next medium tasks (in his order; see MASTER-PLAN section B)
4. Jam simplified to three choices (Play with a band / Make a beat / Loop myself); Jam publishes chords + tempo to the floating
   cards with `publishFloat('jam', {...})` (see how PlayScreen does it).
5. Tips: glowing dot on the Ask bubble + "always show tips" option; tips from `src/learn/guide.ts`; guitar advice too, with its
   own switch in Settings.
6. Beat maker: a MOCKUP first for him to approve, then the layout + full screen + groovebox upgrades (part 2 brainstorm).
7. Band behind me (Songsterr/GP tracks via `src/audio/band.ts`, plus a chord band), Shorts default channels (Mr. Tabs,
   Level Up Guitar Tabs, Kenneth Acoustic), one Songs library with filters, Add a song in one box, manual as a PDF.

## Rules (please keep them)
- Ask him before making a test APK. Never push to `main`. Never delete his files.
- Quality over speed: check every change on the Fold cover (412×915), Fold inner (840×757) and a tablet (1280×800), in Day,
  Night and Psychedelic themes, with no sideways scrolling and no page errors.
- Keep `src/learn/guide.ts` (the in-app manual) and `src/search/catalog.ts` in step with any feature change.
- His paid-plugin sounds and his books are private: never commit them to this public repo (they go in a phone/Drive folder).
- Only "Brandy" is named on screen (his dog); never invent names for the artwork.
- Don't change Learn's design: Learn is being rebuilt by Claude later (the pro-level course).
- Note what you did at the top of `notes/HANDOFF.md` so Claude can pick up after you.
