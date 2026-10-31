# Changes waiting for the next build (owner is testing; don't ship until he says "ship it")

(Build 27 shipped everything before this.)
1. Gemini fix: on the phone, Gemini goes through the app's own connection again (build 27's word-by-word connection is the likely reason every question timed out); word-by-word stays on the web only.
2. Gemini faster: least thinking ("minimal" on 3.x Flash); if no answer after 6 s the next model is asked at the same time and the first answer wins; busy / missing / over-limit models are skipped at once; whole thing gives up after 30 s (was up to 70 s). The model that worked is remembered.
3. Default model is now Google's "newest Flash" (gemini-flash-latest) when you haven't picked one; backups come from your key's own model list.
4. Settings → You → AI helper → ▶ Test Gemini: checks the key and times each model; "Use the fastest". If the helper ever falls back, the note says what was tried and why.
5. Gemini's voice uses the newest speech model your key has, and gives up after 9 s (the phone's voice reads it instead of making you wait).
