# KGuitar: handoff for Gemini (one week, from 2026-11-14)

You are taking over KGuitar, the owner's personal guitar practice app, for about a week. Claude takes it back afterwards.
Read **CLAUDE.md** first: it is the full project brief (layout, every feature, tests, owner rules). Then **notes/ENGINE-WEEK.md**
(this week's plan) and **notes/AUDIO-ENGINE.md** (the sound engine contract).

## Branches (the owner's backup plan; please keep it exactly like this)
- Work ONLY on the branch `gemini-week`. Commit small, one change per commit, with clear messages.
- NEVER push to `main`, `big-update` or `claude-safe`. `claude-safe` is the frozen backup of the last good state (the test-52 APK).
- Don't rewrite history (no force-push, no rebase of pushed commits), so every step can be reviewed and undone.
- Log what you did, why, and anything half-finished in `notes/GEMINI-LOG.md` (newest at the top). Claude reads it on return.

## Building a test APK for the owner
GitHub Actions workflow `.github/workflows/android.yml`, run on this branch:
`gh api -X POST repos/thegute/Guitar-app/actions/workflows/android.yml/dispatches -f ref=gemini-week` → a release `test-N`.
Only make one when the owner asks. Updates install over each other because the signing keystore is committed on purpose
(`android/app/kguitar-personal.keystore`); never change it and never commit any other secret.

## Checks before every commit
- `npx tsc --noEmit -p .` (no type errors), `npm test` (all logic tests).
- Browser tests need `npm run build && npx vite preview --port 4173`, then e.g. `node tests/browser/fills-test.cjs`,
  `node tests/browser/coach-test.cjs`, `node tests/browser/looper-test.cjs`, `node tests/browser/build14-test.cjs` (the full tour:
  every screen, sizes, contrast, no sideways scroll). See tests/README.md.
- Never give two files names that differ only by letter case (breaks macOS and esbuild).

## Owner rules (all still hold)
- He's a guitarist, not a developer: explain things plainly, keep him updated, ask before deleting anything on his computer.
- Paid plugin sound packs, his books and chord-set exports are private: never commit them. Only "Brandy" is named on screen.
- No copyrighted songs or lyrics (lyrics only pre-1929); fills and licks are original material "in the style of".
- YouTube audio is for his personal practice only. Keep the in-app guide (`src/learn/guide.ts`) up to date when features change,
  and add each new guide item to the search catalog (`src/search/catalog.ts`; a test checks it).
- He wants everything interconnected (one progression / key / style shared across Play, Jam, fills, Target notes, looper, coach).

## This week's plan (notes/ENGINE-WEEK.md has the details and the four safeguards he asked for)
1. Shared clock + app speed (one transport everything follows; heavy work off the main thread).
2. Shared listener (one note detector for Play, coach, Target notes, Call and response, looper, Improv coach) with isolated
   per-feature settings and bleed suppression of KGuitar's own backing.
3. Automatic timing calibration per gear profile (phone mic: click loopback; Pocket Master: 8-click play-along).
4. Sampler in an AudioWorklet (per-string voices; hammer-ons/slides from the ringing string).
If a step turns out risky, stop at a working, tested point and write down where you got to rather than leaving it half-wired.

## Build on what's there (owner rule, 2026-11-14)
- Claude's work is the foundation: build on it, don't throw it away. Every existing feature stays unless the owner says otherwise
  (the coach, fills workshop, Target notes, ear training, Call and response, looper, beat maker, Riff Scanner, Game Mode, theory
  course, sounds, the layout and the look).
- When the OWNER asks for a change, make it, even if that means altering, reworking or redesigning something Claude built. His
  requests come first.
- On your own initiative: improve by extending (new options, better accuracy, faster code, fixed bugs) and keep how things look
  and behave. Before deleting, hiding or redesigning a feature, screen or setting that he didn't ask about, ask him first.
- If the new engine needs an old piece rewired, keep its behaviour working (same buttons, same results) and note it in the log.
