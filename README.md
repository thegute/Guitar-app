# KGuitar

A personal guitar practice app for Android (and the web), built with React + Capacitor.

## What's in it
- **Play (play-along):** load a tab, play it on your guitar and the app follows you note by note. Each correct note lights up; wrong notes tell you what you played and what the tab wants. Tab numbers can also show their note names.
  - **Wait for me** (goes at your pace) or **In time** (the tab scrolls at tempo with a count-in and click; every note is marked on time, early or late, with a score), plus a **speed trainer** that speeds up after each good pass
  - **Strum-along:** chord sheets (chords written over the words) open one chord per bar with the shape and the lyrics; strums are checked by all the notes that ring
  - YouTube mini player next to the tab, with ½ / ¾ speed, an A–B loop and **Sync with tab** so the tab follows the recording
  - **Hear it** plays the tab back with recorded guitar sounds; **Loop a section** repeats bars and scores each pass
  - Scales & chords for soloing: detected key, scale suggestions, the song's chord progression, and the fretboard in Scale, Arpeggio, Triads and Connect modes
  - Per-song progress: best score, the bars you keep missing, "learned" songs that come back for review
  - **Split** layout, automatic on a half-folded Galaxy Fold (video on top, tab below); A−/A+ tab size
  - Hands-free with a Bluetooth page-turner / footswitch or a USB MIDI pedal
  - Works with the phone mic (acoustic) or a USB amp / audio interface such as the Amphonix 2 (electric); a two-minute **input setup** tunes detection and timing for each
- **Songs:** find tabs on Songsterr, Ultimate Guitar or Guitar Pro file sites; upload Guitar Pro files (.gp .gp5 .gpx .gp4 .gp3), text tabs or chord sheets, several at once and straight from Google Drive; paste from the clipboard; or **share** a tab, chord sheet, file or YouTube link from another app straight into KGuitar. Songs are saved on the phone, in separate banks per instrument (guitar, tenor ukulele, baritone ukulele).
- **Practice tabs:** scales, sequences, arpeggios, licks and warm-ups for any key and position, played in Play with the same follow-along.
- **Learn:** the daily hub.
  - Today's goal (a guitar pick that fills up), streak with streak freezes, levels and XP, a week view, and an **"I'm away from my guitar"** switch that makes the plan, quests and reminders guitar-free
  - Today's plan (including songs due for review and the bars you keep missing), three daily quests, a practice course (fretboard notes, chords, triads, circle of fifths, CAGED) in tap mode or play mode with spaced repetition and stars
  - A seven-stage path to mastery
  - Drone ear training (levels, melodies, hands-free, optional guitar mode)
  - Theory lessons following Offtonic Theory's chapters, with sounds to tap
  - CAGED explorer, circle of fifths, one-minute chord changes and a rhythm trainer
  - Progress, settings (instrument with a confirm step, input setup, pedals, playback sound, theme, daily goal, reminders, **backup / restore**)
  - **How to use KGuitar:** a guide to every feature with "Show me" buttons; a short welcome sets the app up on first launch
- **Ukulele mode:** tenor (high-G or low-G) and baritone (DGBE or high-D). Every screen follows the instrument.
- **Day and night themes** (night is low-glare for practising in bed), and phone reminders that skip days you've practised.
- **Jam:** chord-progression generator (22 styles, chord colours from power chords to jazzy 13ths, 2–16 chords, endings, surprise level) with a chord diagram for every chord, strumming and drum backing, a **looper** that records your playing in time with the beat, scales to solo with, the circle of fifths, and famous progressions
- **Tools:** tuner (alternate tunings, reference tones), tempo (metronome with accents, subdivisions, odd time signatures, tap tempo, speed trainer), chords (every common type in all 12 keys, several shapes) and scales (22 scales and modes, full neck or by position)
- Runs on any Android phone or tablet from Android 7 up (tested layouts: small phones, Galaxy Fold cover and inner screens, 12" tablets in both orientations).

## Installing on your phone
Every push to `main` builds a new APK automatically (Actions tab). When it finishes:
1. On your phone, open this repository's **Releases** page and tap the newest `KGuitar-N.apk`.
2. If Android asks, allow your browser to install unknown apps.
3. Tap **Install**. New builds install over the old one and keep your settings and songs.

Each phone or tablet keeps its own songs and progress. To move them, use Learn → Settings → Backup on the old device and Restore on the new one.

## Developing
```
npm install
npm run dev        # web version at http://localhost:5173
npm test           # logic tests
node art/from-image.cjs art/kguitar-art.jpg 0.483 0.27 1.85   # app icon, splash screens, web icons and in-app art from the illustration
npm run build && npx cap sync android
```
