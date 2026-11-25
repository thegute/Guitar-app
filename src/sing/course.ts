// Complete 10-Module / 20-Lesson Professional Voice Course with verified YouTube coach videos,
// structured lesson breakdowns (Key Concepts, Body Sensation Cues, Traps to Avoid),
// and interactive in-app drills tailored to the singer's Voice Range Profile.

export type DrillKind =
  | 'range-test'
  | 'sigh-relax'
  | 'breath-hiss'
  | 'sustain-nosag'
  | 'workout-pattern'
  | 'ear-blind'
  | 'tone-clarity'
  | 'passaggio-bridge'
  | 'vowel-resonance'
  | 'vibrato-lab'
  | 'harmony-lock'
  | 'sing-strum'

export interface CourseVideo {
  title: string
  coach: string
  youtubeId: string
  note?: string
}

export interface SingLesson {
  id: string
  moduleId: string
  num: string
  title: string
  goal: string
  videos: CourseVideo[]
  keyConcepts: string[]
  bodyCue: string
  avoidTrap: string
  drill: {
    kind: DrillKind
    title: string
    prompt: string
    patternId?: string
    targetSec?: number
  }
}

export interface SingModule {
  id: string
  num: number
  title: string
  subtitle: string
  icon: string
  lessons: SingLesson[]
}

export const SING_COURSE: SingModule[] = [
  {
    id: 'm1',
    num: 1,
    title: 'Know Your Instrument & Tension Reset',
    subtitle: 'Map your range, locate your vocal break, and free jaw, tongue & throat tension.',
    icon: '🧭',
    lessons: [
      {
        id: 'm1-l1',
        moduleId: 'm1',
        num: '1.1',
        title: 'Mapping Your Range & Vocal Break',
        goal: 'Measure your true Voice Range Profile (low, high, comfort zone & passaggio break) and set effortless singing posture.',
        videos: [
          { title: 'How to Find Your Range and Voice Type as a Singer', coach: 'Vocal Coach Assessment', youtubeId: 'HI-YMd8iRJs', note: '5 pillars: range, tone, stamina, and locating your transition note.' },
          { title: 'Ep. 98 Voice Lessons For Beginners — 12 Steps', coach: 'New York Vocal Coaching', youtubeId: '1dPPo3MvTbc' },
          { title: 'Head Posture For Singing', coach: 'New York Vocal Coaching', youtubeId: 'OdLuyCYUOu8' },
        ],
        keyConcepts: [
          'Voice type is not just your highest note — it is where your voice feels easiest (tessitura) and where your break sits.',
          'Keep your chin level (never crane up for high notes or jam down for low notes).',
          'Knowing your exact transition note lets KGuitar shift songs and tailor every drill to YOUR voice.',
        ],
        bodyCue: 'Stand or sit tall like a string gently lifts the crown of your head; shoulders heavy and relaxed.',
        avoidTrap: 'Do not force squeaky or gravelly extreme notes during your range test — only count comfortable, musical notes.',
        drill: {
          kind: 'range-test',
          title: 'Guided Voice Range Profile',
          prompt: 'Sing comfortably down to your lowest clear note, then glide gently up to your highest comfortable note.',
        },
      },
      {
        id: 'm1-l2',
        moduleId: 'm1',
        num: '1.2',
        title: 'Releasing Jaw, Tongue & Throat Tension',
        goal: 'Stop squeezing from your throat by resetting your jaw, tongue root, and sigh reflex.',
        videos: [
          { title: 'Fix Your Jaw & Tongue Tension While Singing', coach: '30 Day Singer', youtubeId: 'xJhJ0FcrDm8' },
          { title: 'Stop Singing With Throat Tension HERE & NOW', coach: 'Chris Liepe', youtubeId: 'PyRw-MlvWMA', note: 'Sighing out of tension & dropping self-conscious squeezing.' },
        ],
        keyConcepts: [
          'Most throat tightness comes from trying too hard to "sound good" — sighing gently immediately resets the larynx.',
          'Rest one finger gently on your chin to catch jaw-clenching on vowels.',
          'Keep the tip of your tongue resting softly behind your bottom front teeth.',
        ],
        bodyCue: 'Let out an easy, relieved "ahhh" sigh like sinking into a couch — then let a pitch ride on top of that exact feeling.',
        avoidTrap: 'Never push your jaw forward or pull your tongue backward when going higher.',
        drill: {
          kind: 'sigh-relax',
          title: 'Relaxed Sigh-to-Pitch Drill',
          prompt: 'Sigh down gently into easy mid-range notes while keeping the Strain Guard calm and green.',
        },
      },
    ],
  },
  {
    id: 'm2',
    num: 2,
    title: 'The Breath Engine (Appoggio Support)',
    subtitle: 'Steady, silent low-rib breathing so notes never wobble or sag flat at the end.',
    icon: '🫁',
    lessons: [
      {
        id: 'm2-l1',
        moduleId: 'm2',
        num: '2.1',
        title: 'Appoggio Breath Support Made Simple',
        goal: 'Replace shallow chest gasps with calm, low-rib expansion and steady airflow control.',
        videos: [
          { title: 'What Is Breath Support? — Singing Dictionary Ep. 1', coach: 'New York Vocal Coaching', youtubeId: 'xWuaAh_7-IU' },
          { title: 'Breath Support Made Simple — Appoggio for Beginners', coach: 'New York Vocal Coaching', youtubeId: 'RzSpxcj9gZc' },
        ],
        keyConcepts: [
          'Breath support ("appoggio") is NOT pushing your abs hard — it is gently slowing down how fast your ribs collapse.',
          'Silent inhales keep your throat wide open; noisy gasps dry out and tense your vocal folds.',
          'Even, steady airflow is what lets your vocal cords vibrate cleanly without strain.',
        ],
        bodyCue: 'Put hands on your lower side ribs: feel them widen like an umbrella on inhale, then stay gently buoyant as you hiss.',
        avoidTrap: 'Avoid lifting your shoulders or sucking in so much air that your chest locks stiff.',
        drill: {
          kind: 'breath-hiss',
          title: 'Steady "Sss" Airflow Meter',
          prompt: 'Inhale quietly for 4 counts, then hiss a rock-steady "sss" for 10+ seconds with zero spikes.',
          targetSec: 10,
        },
      },
      {
        id: 'm2-l2',
        moduleId: 'm2',
        num: '2.2',
        title: 'Pairing Breath With Sound (Kill Phrase-End Sag)',
        goal: 'Keep pitch dead-center through the final second of every held note.',
        videos: [
          { title: 'How To Sing Part 3: Pairing Breath With Sound', coach: '30 Day Singer', youtubeId: 'Ubk05SojvbQ' },
          { title: 'Breath Support Applied to Singing — 7 Exercises', coach: 'New York Vocal Coaching', youtubeId: 'GiHZrYCAIas' },
        ],
        keyConcepts: [
          '90% of end-of-phrase flatness happens because singers stop supporting 1 second before the word finishes.',
          'Think of spinning the sound forward slightly as the note ends instead of collapsing your ribs.',
        ],
        bodyCue: 'Imagine lightly leaning out against your lower ribs during the last 2 seconds of a long note.',
        avoidTrap: 'Do not dump half your air on the very first syllable.',
        drill: {
          kind: 'sustain-nosag',
          title: 'Zero-Sag Sustained Hold',
          prompt: 'Hold a comfortable mid-range note for 6 seconds with zero flat sag in the final 30%.',
          targetSec: 6,
        },
      },
    ],
  },
  {
    id: 'm3',
    num: 3,
    title: 'Daily SOVT Warmups & Vocal Health',
    subtitle: 'Pro singers\' secret weapon: lip trills, straw phonation, and 5-minute warmups & cool-downs.',
    icon: '🫧',
    lessons: [
      {
        id: 'm3-l1',
        moduleId: 'm3',
        num: '3.1',
        title: 'Lip Trills & Lip Bubbles',
        goal: 'Warm up your vocal folds effortlessly using gentle back-pressure.',
        videos: [
          { title: 'Your Vocal Folds Need This Lip Bubble Exercise', coach: "Dr. Dan's Voice Essentials", youtubeId: 'jH2dt0lXAcE' },
          { title: 'Beginner Lip Trills (Vocal Exercises Series)', coach: 'The Charismatic Voice', youtubeId: '_9OK-jhmffQ' },
        ],
        keyConcepts: [
          'Semi-Occluded Vocal Tract (SOVT) exercises cushion vocal fold impact so you warm up faster with zero strain.',
          'If your lips stall, lightly lift the corners of your cheeks with two fingers.',
          'Keep the pitch tone prominent — do not blow hurricane air through your lips.',
        ],
        bodyCue: 'Soft puffy cheeks, loose lips fluttering like a motorboat on warm gentle breath.',
        avoidTrap: 'Over-tightening lips or blasting too much air will choke the trill immediately.',
        drill: {
          kind: 'workout-pattern',
          patternId: 'sovt-5tone',
          title: 'Lip-Trill 5-Tone Glide',
          prompt: 'Follow the piano up and down your comfortable range on a relaxed lip trill.',
        },
      },
      {
        id: 'm3-l2',
        moduleId: 'm3',
        num: '3.2',
        title: 'Straw Phonation, Daily Warmup & Cool-Down',
        goal: 'Build a repeatable 5-minute daily warmup and a 2-minute cool-down so your voice feels stronger every week.',
        videos: [
          { title: 'Straw Phonation in Water for Vocal Health & Power', coach: 'Healthy Vocal Technique', youtubeId: '2wkrtxQVFHw' },
          { title: 'The Only 10-Minute Vocal Routine You Need', coach: "Dr. Dan's Voice Essentials", youtubeId: 'LshWahubP0k' },
          { title: '5-Minute Vocal Warm Up', coach: 'Jacobs Vocal Academy', youtubeId: 'YCLyAmXtpfY' },
          { title: 'Vocal Cool Down Exercises', coach: 'Vocal Coach', youtubeId: '4SaweGqe4dA' },
        ],
        keyConcepts: [
          'Humming through a straw (or into 1 inch of water) gently massages tired vocal folds back into balance.',
          'Short daily warmups (5–10 min) beat rare 2-hour marathons every single time.',
          'Always end heavy singing with 60–90 seconds of soft descending hums.',
        ],
        bodyCue: 'Buzzing tickle right behind your nose and lips; zero throat work.',
        avoidTrap: 'Never jump cold straight into your highest belting chorus.',
        drill: {
          kind: 'workout-pattern',
          patternId: 'hum-siren',
          title: 'NG Hum Octave Siren',
          prompt: 'Glide smoothly through an octave on "NG" (as in "sing") to wake up your whole range.',
        },
      },
    ],
  },
  {
    id: 'm4',
    num: 4,
    title: 'Pitch Precision & Ear-to-Voice Lock',
    subtitle: 'Kill flat scooping and train your ears to nail notes dead-center — even blind.',
    icon: '🎯',
    lessons: [
      {
        id: 'm4-l1',
        moduleId: 'm4',
        num: '4.1',
        title: 'Hear It Before You Sing It ("Audiation")',
        goal: 'Fix 70% of intonation issues by picturing the pitch in your inner ear before opening your mouth.',
        videos: [
          { title: 'Singing in Tune — Quick Fix', coach: 'Vocal Coach', youtubeId: 'sfw2K7AG44w', note: 'Listening mentally before singing fixes most pitch misses.' },
          { title: 'Keep Your Singing Voice From Going Flat', coach: 'Chris Liepe', youtubeId: '21sc5EwPbcU' },
          { title: 'How To Sing In Tune', coach: '30 Day Singer', youtubeId: 'NZjMzjCYmT8' },
        ],
        keyConcepts: [
          'If you only stare at a pitch meter, your eyes do the work and your pitch slips when you look away.',
          'Hear the note → pause 1 second to hear it inside your head → land cleanly on center pitch.',
          'Never sacrifice pitch to try to make a "cool" or heavy tone.',
        ],
        bodyCue: 'Think of dropping straight down onto the top of the note rather than climbing up to it from underneath.',
        avoidTrap: 'Avoid starting 40 cents flat and sliding ("scooping") up to the note.',
        drill: {
          kind: 'ear-blind',
          title: 'Ear-First Blind Target Drill',
          prompt: 'Listen to the piano note, imagine it for 1 second, sing with the pitch line HIDDEN, then watch the reveal!',
        },
      },
      {
        id: 'm4-l2',
        moduleId: 'm4',
        num: '4.2',
        title: 'Clean Intervals & Instant Vocal Mirror',
        goal: 'Lock major 3rds, perfect 5ths, and octaves with crisp attacks and honest playback.',
        videos: [
          { title: 'Sing on Pitch: 3 Exercises to Make It Happen Every Time', coach: 'Vocal Coach', youtubeId: 'bBKH3sNeikg' },
          { title: 'Vocal Lesson: Ear Training for Singers', coach: 'Singeo', youtubeId: 'LF6Zl-Uu-Ls' },
        ],
        keyConcepts: [
          'Recording yourself for 5 seconds and playing it back rewires your ear faster than anything else.',
          'Practice triad arpeggios (1–3–5–3–1) so your voice memorizes chord shapes automatically.',
        ],
        bodyCue: 'Light, crisp "Lah" onset — feel each note snap right into the pocket.',
        avoidTrap: 'Don\'t slur every interval together unless it is an intentional stylistic slide.',
        drill: {
          kind: 'workout-pattern',
          patternId: 'triad-arpeggio',
          title: 'Major Triad Precision',
          prompt: 'Nail clean 1–3–5–3–1 leaps with zero flat scooping — then tap "Hear Me" on the Dashcam bubble!',
        },
      },
    ],
  },
  {
    id: 'm5',
    num: 5,
    title: 'Mastering Chest Voice & Head Voice',
    subtitle: 'Build a grounded chest voice AND a clear, ringing head voice before blending them.',
    icon: '🔔',
    lessons: [
      {
        id: 'm5-l1',
        moduleId: 'm5',
        num: '5.1',
        title: 'Warm, Grounded Chest Voice',
        goal: 'Develop rich, effortless low-to-mid tone without heaviness or shouting.',
        videos: [
          { title: 'Head Voice vs Chest Voice — What\'s the Difference?', coach: '30 Day Singer', youtubeId: 'LhT04a25GLI' },
          { title: 'How To Sing: Chest Voice Exercises for Beginners', coach: '30 Day Singer', youtubeId: 'Y5ApTcvG9LQ' },
          { title: 'Ep. 128 How To Sing Low Notes', coach: 'New York Vocal Coaching', youtubeId: 'vIZSVTmyQIY' },
        ],
        keyConcepts: [
          'Chest voice feels like your relaxed speaking voice — full, warm, and vibrating in your sternum.',
          'Low notes need LESS air pressure and MORE open space — pushing down makes them gravelly.',
        ],
        bodyCue: 'Place a hand on your chest bone and speak "Mah-Mah-Mah" easily, then sustain it on pitch.',
        avoidTrap: 'Do not depress your chin or press hard on your throat to chase low notes.',
        drill: {
          kind: 'tone-clarity',
          title: 'Chest Voice Clarity Check',
          prompt: 'Sing comfortable chest-zone notes on "Mah / Boh" aiming for Balanced/Clear tone (not airy or pushed).',
        },
      },
      {
        id: 'm5-l2',
        moduleId: 'm5',
        num: '5.2',
        title: 'Awakening & Strengthening Head Voice',
        goal: 'Turn weak, breathy falsetto into clear, connected head voice that unlocks high songs.',
        videos: [
          { title: 'FIND & STRENGTHEN HEAD VOICE — 4 Exercises', coach: 'Healthy Vocal Technique', youtubeId: 'GGLcf7TYaGc' },
          { title: 'Super Easy Head Voice Exercises for Beginners', coach: '30 Day Singer', youtubeId: '0VXJKymas0Q' },
        ],
        keyConcepts: [
          'A strong head voice is the secret foundation of mixed voice — skip it and high notes will always crack.',
          'Start top-down on a clean "Hoo" or "Wee" owl hoot to keep vocal cords gently connected.',
        ],
        bodyCue: 'Feel a light, buoyant ring behind your eyes/forehead — like a clear flute rather than a whisper.',
        avoidTrap: 'Avoid letting tons of breathy air leak out; aim for a focused, clean "Hoo".',
        drill: {
          kind: 'workout-pattern',
          patternId: 'head-owl',
          title: 'Head-Voice Owl Descent',
          prompt: 'Start light and clear above your break on "Hoo" and glide smoothly downward.',
        },
      },
    ],
  },
  {
    id: 'm6',
    num: 6,
    title: 'Smoothing Your Vocal Break & Mixed Voice',
    subtitle: 'Eliminate the crack at your passaggio so low, middle, and high feel like ONE voice.',
    icon: '🌉',
    lessons: [
      {
        id: 'm6-l1',
        moduleId: 'm6',
        num: '6.1',
        title: 'Understanding & Bridging Your Passaggio',
        goal: 'Thin out chest weight 2 notes BEFORE your vocal break so transitions stop cracking.',
        videos: [
          { title: 'Blending The Passaggio: Why Your Voice Breaks (& How To Fix It)', coach: 'Vocal Coach', youtubeId: '5F06TWChiRc' },
          { title: 'How to Sing in Mixed Voice / Vocal Break', coach: 'RPM Vocal Studio', youtubeId: 'g92zDfZakFs' },
        ],
        keyConcepts: [
          'Your voice cracks because you carry heavy low-note muscle weight too high until it snaps.',
          'Start lightening volume slightly 2 semitones BEFORE your purple Passaggio Band on screen.',
          'Smooth bridging takes patience — gentle consistency beats brute force.',
        ],
        bodyCue: 'Imagine your voice getting slightly narrower and taller like a laser beam as you cross your break.',
        avoidTrap: 'Never get louder to muscle through your break — louder makes the break bigger!',
        drill: {
          kind: 'passaggio-bridge',
          title: 'Passaggio Bridge Siren',
          prompt: 'Glide slowly across your exact purple Vocal Break band (auto-centered on your voice profile!).',
        },
      },
      {
        id: 'm6-l2',
        moduleId: 'm6',
        num: '6.2',
        title: 'Unlocking Real Mixed Voice',
        goal: 'Keep vocal cords zipped cleanly across your bridge using gentle "Nay / Mum / Gee" patterns.',
        videos: [
          { title: 'How to Find Your Mixed Voice — Try These Exercises!', coach: 'Healthy Vocal Technique', youtubeId: '3om2vRxrQ4M' },
          { title: 'Beginner Vocal Exercises — Mixed Voice Super Easy', coach: '30 Day Singer', youtubeId: '1q2ogjcP1l8' },
          { title: 'Nay Nay Nay Vocal Exercise', coach: 'Vocal Coach', youtubeId: 'lCnW14uicPo' },
        ],
        keyConcepts: [
          'A playful, slightly bratty "Nay" adds natural forward ring (twang) that prevents airy flipping.',
          'Think of "releasing down into" high notes rather than reaching up for them.',
        ],
        bodyCue: 'Silly, easy "Nay-Nay-Nay" right behind your upper teeth — zero throat grab.',
        avoidTrap: 'Don\'t worry about sounding pretty on "Nay" — it is a gym exercise that builds effortless mix!',
        drill: {
          kind: 'workout-pattern',
          patternId: 'nay-mix-ladder',
          title: 'Bratty "Nay" Mix Zip',
          prompt: 'Walk cleanly across your vocal break with light, zippy "Nay" resonance.',
        },
      },
    ],
  },
  {
    id: 'm7',
    num: 7,
    title: 'Resonance, Vowel Shaping & Safe Belting',
    subtitle: 'Project rich, powerful high notes without shouting, splatting vowels, or losing your voice.',
    icon: '🔥',
    lessons: [
      {
        id: 'm7-l1',
        moduleId: 'm7',
        num: '7.1',
        title: 'Vowels, Formants & Mask Resonance',
        goal: 'Use subtle vowel modification so tight vowels stop choking your high notes.',
        videos: [
          { title: 'Vowels: A Singer\'s Secret Weapon', coach: 'Vocal Coach', youtubeId: 'hLhTbCABpIk' },
          { title: 'Ep. 117 Singing Vowels & Formants', coach: 'New York Vocal Coaching', youtubeId: 'KC6vNPLzftw' },
          { title: 'Better Vocal Tone in ONE Video', coach: '30 Day Singer', youtubeId: 'WhfXeX0MNh0' },
        ],
        keyConcepts: [
          'Pure tight "ee" or wide spread "eh" vowels fight high pitches; shading slightly ("ee → ih", "ah → uh") opens instant ring.',
          'Drop the lyrics on a tough line and sing it on one smooth vowel first to lock the resonance.',
        ],
        bodyCue: 'Keep the inside of your mouth tall like a tiny quiet yawn while keeping the sound buzzing forward.',
        avoidTrap: 'Do not spread your mouth wide sideways like a grin on high notes ("splatting").',
        drill: {
          kind: 'vowel-resonance',
          title: '5-Vowel Resonance Lab',
          prompt: 'Sing Mee · May · Mah · Moh · Moo on one pitch and watch the Tone Gauge find your brightest effortless ring!',
        },
      },
      {
        id: 'm7-l2',
        moduleId: 'm7',
        num: '7.2',
        title: 'Strong High Notes & Belting Without Strain',
        goal: 'Hit powerful chorus peaks with stretch and resonance instead of throat squeezing.',
        videos: [
          { title: 'Sing High Notes Without Strain', coach: 'Healthy Vocal Technique', youtubeId: '_t23Ayrnu94' },
          { title: 'Hit High Belt Notes Without Squeezing & Pushing', coach: 'Vocal Coach', youtubeId: 'uIohvRpxyDk' },
          { title: 'How to Sing Strong High Notes!', coach: '30 Day Singer', youtubeId: 'KETg_A3eWQU' },
        ],
        keyConcepts: [
          'Real power comes from resonance + stretch — if you can only hit a note by yelling at 100% volume, it is strain.',
          'Narrowing your cheeks slightly prevents wide-vowel throat grab on big belt words.',
        ],
        bodyCue: 'Firm, grounded torso support + open tall vowel + relaxed throat (zero scratch or pinch).',
        avoidTrap: 'Stop immediately and hum gently for 30 seconds if you ever feel tickling, coughing, or throat ache.',
        drill: {
          kind: 'workout-pattern',
          patternId: 'passaggio-bridge',
          title: 'Safe High-Note Bridge Ladder',
          prompt: 'Build effortless power on 1-5-8-5-1 while keeping the Strain Guard green.',
        },
      },
    ],
  },
  {
    id: 'm8',
    num: 8,
    title: 'Vibrato, Agility, Dynamics & Emotion',
    subtitle: 'Turn accurate notes into pro artistry: natural 5–7 Hz vibrato, crisp runs, and storytelling.',
    icon: '✨',
    lessons: [
      {
        id: 'm8-l1',
        moduleId: 'm8',
        num: '8.1',
        title: 'Natural Vibrato & Straight-Tone Control',
        goal: 'Unlock relaxed, natural 5–7 Hz vibrato and choose when to sing straight vs. shimmer.',
        videos: [
          { title: 'STOP, You\'re Learning Vibrato Wrong!', coach: 'Chris Liepe', youtubeId: 'faxexjdveKU' },
          { title: 'Vibrato for Beginners', coach: '30 Day Singer', youtubeId: '4_-7cJJNQ6g' },
          { title: 'How to Control Your Vibrato When You Want a Straight Tone', coach: 'Vocal Coach', youtubeId: 'Rd2C2DxFJ48' },
        ],
        keyConcepts: [
          'Healthy vibrato (5–7 cycles/sec) appears naturally when breath support and vocal-fold release balance.',
          'Pop & rock pros often start a held note straight for 1 second, then "let go" so vibrato blooms at the tail.',
        ],
        bodyCue: 'Hold a clear, easy mid-range note — relax your throat & jaw completely and let a gentle wave float in.',
        avoidTrap: 'Never shake your jaw or pulse your throat muscles to fake vibrato.',
        drill: {
          kind: 'vibrato-lab',
          title: 'Live Vibrato Oscilloscope Lab',
          prompt: 'Hold a comfortable note for 4+ seconds and aim for a smooth 5.0–7.0 Hz wave (green badge!).',
        },
      },
      {
        id: 'm8-l2',
        moduleId: 'm8',
        num: '8.2',
        title: 'Riffs, Runs, Dynamics & Storytelling',
        goal: 'Sing crisp pentatonic runs cleanly and shape songs with soft-to-loud emotional dynamics.',
        videos: [
          { title: 'Vocal Riffs and Runs For Beginner Singers — Pentatonic', coach: '30 Day Singer', youtubeId: 'wj2y6FSdLfg' },
          { title: 'Vocal Agility Exercises', coach: '30 Day Singer', youtubeId: 'kQfuEQhgDTc' },
          { title: 'I\'ve Taught 1,000s of Students — How I Sing With Emotion', coach: '30 Day Singer', youtubeId: 'p3V8Gif-Uck' },
        ],
        keyConcepts: [
          'Every fast vocal run is just a slow pentatonic scale sped up — nail it at 70 BPM first!',
          'Great singers vary dynamics (soft verse → fuller chorus) and treat lyrics like real conversation.',
        ],
        bodyCue: 'Keep runs light and bouncy like skipping stones — heavy volume makes runs muddy.',
        avoidTrap: 'Don\'t blur runs into a slide; give each pitch a tiny distinct heartbeat.',
        drill: {
          kind: 'workout-pattern',
          patternId: 'pentatonic-run',
          title: 'Pentatonic Agility Run',
          prompt: 'Nail clean 5-note pentatonic runs at 85 BPM, then bump up speed as it locks in!',
        },
      },
    ],
  },
  {
    id: 'm9',
    num: 9,
    title: 'Singing Harmonies By Ear & Over Songs',
    subtitle: 'Hear chord tones instinctively, beat the "lead singer pull", and harmonize over any song.',
    icon: '🤝',
    lessons: [
      {
        id: 'm9-l1',
        moduleId: 'm9',
        num: '9.1',
        title: 'Hearing 3rds & Defeating the "Lead Pull"',
        goal: 'Hold a rock-solid lower or upper 3rd harmony even when the lead singer gets loud.',
        videos: [
          { title: 'How to Sing Vocal Harmony for Beginners (Hearing 3rds)', coach: 'Vocal Coach', youtubeId: 'kV84-ru5SPg' },
          { title: 'How to Sing Harmonies Without Music Training', coach: 'Singeo', youtubeId: 'rF9ut7BZhqQ' },
          { title: 'Ear Training for Harmony', coach: '30 Day Singer', youtubeId: 'iz6-lsH2YTw' },
        ],
        keyConcepts: [
          'Harmony is simply singing a DIFFERENT note inside the same chord (root, 3rd, or 5th).',
          'Start with the lead muted so your ear memorizes YOUR line, then gradually fade the lead up ("Lead-Pull Drill").',
        ],
        bodyCue: 'Listen to the chord ringing underneath you more than the lead singer\'s voice.',
        avoidTrap: 'If you slip onto unison, pause, tap your harmony note on the Pitch Pipe bubble, and lock back in!',
        drill: {
          kind: 'harmony-lock',
          patternId: 'harmony-3rd-lock',
          title: '3-Step Harmony Lock Drill',
          prompt: 'Hold the lower 3rd harmony steady while the coach plays the higher lead melody!',
        },
      },
      {
        id: 'm9-l2',
        moduleId: 'm9',
        num: '9.2',
        title: 'Harmonizing Comfortably Over High Songs',
        goal: 'Use lower 3rd & Baritone harmonies to sound amazing with original recordings that sit too high.',
        videos: [
          { title: 'Easy Way To Write Vocal Harmony', coach: 'Vocal Harmony Tutorial', youtubeId: 'sXkNFOPBWHA' },
          { title: 'How To Harmonize for Beginners', coach: '30 Day Singer', youtubeId: 'SbHmTd4q2Q4' },
        ],
        keyConcepts: [
          'Strong beats (anchor notes) lock to chord tones; passing notes glide smoothly in between.',
          'A lower 3rd or Baritone harmony drops soaring choruses right into your sweet spot — zero key-shifting needed!',
        ],
        bodyCue: 'Blend your volume slightly softer than the lead so the two voices lock like a warm chord.',
        avoidTrap: 'Don\'t force huge unnatural jumps — stepwise harmonies sound smoother and feel way easier.',
        drill: {
          kind: 'harmony-lock',
          patternId: 'harmony-3rd-lock',
          title: 'Open Harmony Mode on Any Song',
          prompt: 'Practice the harmony lock here, then open Songs → Mode B (Harmony) on your own tracks!',
        },
      },
    ],
  },
  {
    id: 'm10',
    num: 10,
    title: 'Singing & Playing Guitar Together',
    subtitle: 'Break the strumming hand-freeze and pull your starting pitch cleanly straight from the chord.',
    icon: '🎸',
    lessons: [
      {
        id: 'm10-l1',
        moduleId: 'm10',
        num: '10.1',
        title: 'The 5-Stage Sing & Strum Independence Ladder',
        goal: 'Put your strumming hand on autopilot so your brain can sing freely without freezing.',
        videos: [
          { title: 'How To Sing And Play Guitar At The Same Time — 10-Step Method', coach: 'JustinGuitar', youtubeId: '29w4RyBjugo' },
          { title: 'How to Sing and Play Guitar Step-by-Step', coach: 'Sound Guitar Lessons', youtubeId: 'DEgHrP3RypM' },
          { title: 'Play Guitar & Sing in 3 Easy Steps', coach: 'Guitar Lesson', youtubeId: 'ttSjXUlsuxA' },
        ],
        keyConcepts: [
          'Never jump straight into full strumming + lyrics — climb 5 easy rungs (Melody → Beat-1 Ring → Quarter Pulse → Hum + Groove → Full Sing & Strum).',
          'Humming the melody over your full strumming pattern bridges the gap instantly by removing lyric overload!',
          'Anchor which exact syllable lands on Beat 1 when each chord changes.',
        ],
        bodyCue: 'Keep your strumming wrist moving down-up like a pendulum even when you miss a lyric!',
        avoidTrap: 'Never look straight down at your fretboard while singing — it crushes your throat! Keep your chin level.',
        drill: {
          kind: 'sing-strum',
          title: '5-Stage Sing & Strum Ladder',
          prompt: 'Climb all 5 coordination rungs over a live G – Em – C – D progression with beat-aligned strum arrows!',
        },
      },
      {
        id: 'm10-l2',
        moduleId: 'm10',
        num: '10.2',
        title: 'Staying in Tune While Playing Guitar',
        goal: 'Pull your exact starting pitch straight out of the guitar chord before Beat 1.',
        videos: [
          { title: 'How to Sing in Tune When Playing Guitar', coach: 'JustinGuitar + Chris Liepe', youtubeId: 'twvc8RvgaNg', note: 'Linking ear, fretboard chord tones, and vocal feel.' },
        ],
        keyConcepts: [
          'Strum the first chord cleanly, hum its root, 3rd, or 5th softly in your head, then sing your opening line.',
          'Always use a Capo so the guitar stays in easy open shapes while the key matches YOUR singing sweet spot!',
        ],
        bodyCue: 'Hear the bass string of your guitar chord vibrate — feel your voice lock right into that chord family.',
        avoidTrap: 'Don\'t play the guitar so loud that you have to shout over it and go sharp.',
        drill: {
          kind: 'sing-strum',
          title: 'Find Your First Note From the Chord',
          prompt: 'Strum along with the progression and lock your vocal pitch onto the root, 3rd, or 5th of every chord!',
        },
      },
    ],
  },
]

export const ALL_SING_LESSONS: SingLesson[] = SING_COURSE.flatMap(m => m.lessons)

export function nextUnfinishedLesson(doneIds: string[]): SingLesson {
  const done = new Set(doneIds)
  return ALL_SING_LESSONS.find(l => !done.has(l.id)) ?? ALL_SING_LESSONS[0]
}
