# Changes waiting for the next build (owner is testing; don't ship until he says "ship it")

(Build 28 shipped everything before this.)
1. Gemini's voice no longer reads out "Say this in a warm way…" before the answer: it only says the answer.
2. Gemini backups: your choice first, then Groq (if you have a key) asked alongside it, then the other Gemini models. A model that just failed (busy, too slow, over its limit) is skipped for 10 minutes. A slow model now says "took too long" instead of "check the internet".
