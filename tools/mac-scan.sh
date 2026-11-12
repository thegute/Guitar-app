#!/bin/bash
# Read-only scan of the owner's Mac for everything KGuitar's sound engine could use (Stage 3, the harvest).
# Never changes, moves or deletes anything. Writes a report to stdout (and to $1 if given).
# Usage on the Mac:  bash tools/mac-scan.sh ~/kguitar-scan.txt
set -u
OUT="${1:-/dev/null}"
exec > >(tee "$OUT") 2>&1
H="$HOME"
say() { printf '\n== %s\n' "$1"; }
size() { du -sh "$1" 2>/dev/null | cut -f1; }

say "Machine"
sw_vers 2>/dev/null; uname -m; sysctl -n machdep.cpu.brand_string 2>/dev/null
df -h "$H" | tail -1
command -v python3 && python3 --version
python3 -c "import pedalboard; print('pedalboard', pedalboard.__version__)" 2>/dev/null || echo "pedalboard: not installed"
python3 -c "import dawdreamer; print('dawdreamer ok')" 2>/dev/null || echo "dawdreamer: not installed"

say "Plug-ins (VST3 / Audio Units / VST2 / AAX), system and user"
for d in "/Library/Audio/Plug-Ins/VST3" "/Library/Audio/Plug-Ins/Components" "/Library/Audio/Plug-Ins/VST" \
         "$H/Library/Audio/Plug-Ins/VST3" "$H/Library/Audio/Plug-Ins/Components" "$H/Library/Audio/Plug-Ins/VST" \
         "/Library/Application Support/Avid/Audio/Plug-Ins"; do
  [ -d "$d" ] || continue
  echo "-- $d"
  ls -1 "$d" 2>/dev/null | sed 's/^/   /'
done

say "Kontakt and Native Instruments content (libraries, .nki instruments, Playbox)"
for d in "/Users/Shared" "$H/Documents/Native Instruments" "/Library/Application Support/Native Instruments" \
         "$H/Library/Application Support/Native Instruments" "/Applications/Native Instruments"; do
  [ -d "$d" ] || continue
  find "$d" -maxdepth 4 \( -iname "*.nicnt" -o -iname "*.nki" -o -iname "*.nkx" -o -iname "*.nkc" \) 2>/dev/null | \
    sed -E 's#/[^/]+$##' | sort | uniq -c | sort -rn | head -40 | sed 's/^/   /'
done
find "/Users/Shared" "$H/Documents" "$H/Music" -maxdepth 4 -iname "*playbox*" 2>/dev/null | head -20 | sed 's/^/   /'
ls "/Library/Application Support/Native Instruments/Service Center" 2>/dev/null | sed 's/^/   NI product: /'

say "Guitar instruments and amp/cab software (Orange Tree, Ample, Neural DSP, Nembrini, Baby Audio, Jam Origin, IK, others)"
for pat in "Orange Tree" "Ample" "Neural DSP" "Nembrini" "Baby Audio" "Jam Origin" "MIDI Guitar" "IK Multimedia" "Shreddage" \
           "Impact Soundworks" "Spitfire" "Native Instruments" "Toontrack" "Steven Slate" "Superior" "EZdrummer" "Addictive" \
           "Valhalla" "FabFilter" "Soundtoys" "Waves" "Universal Audio" "STL" "Line 6" "Positive Grid" "Bias" "Amplitube"; do
  find /Library/Application\ Support "$H/Library/Application Support" /Applications /Users/Shared "$H/Documents" -maxdepth 2 -iname "*$pat*" 2>/dev/null | \
    while read -r p; do printf '   %-60s %s\n' "$p" "$(size "$p")"; done
done

say "Neural Amp Modeler captures (.nam) and impulse responses (.wav IRs)"
find "$H" -maxdepth 6 -iname "*.nam" 2>/dev/null | sed -E 's#/[^/]+$##' | sort | uniq -c | sort -rn | head -20 | sed 's/^/   /'
find "$H" -maxdepth 6 \( -ipath "*IR*" -o -ipath "*impulse*" -o -ipath "*cab*" \) -iname "*.wav" 2>/dev/null | sed -E 's#/[^/]+$##' | sort | uniq -c | sort -rn | head -20 | sed 's/^/   /'

say "Sample folders (WAV / AIFF / FLAC, 20+ files), largest first"
find "$H" /Users/Shared -maxdepth 7 \( -iname "*.wav" -o -iname "*.aif" -o -iname "*.aiff" -o -iname "*.flac" \) \
  -not -path "*/Library/Caches/*" -not -path "*/.Trash/*" 2>/dev/null | sed -E 's#/[^/]+$##' | sort | uniq -c | \
  awk '$1 >= 20' | sort -rn | head -40 | sed 's/^/   /'

say "Logic Pro / GarageBand content and Apple Loops"
for d in "/Library/Application Support/Logic" "/Library/Audio/Apple Loops" "$H/Music/Audio Music Apps"; do
  [ -d "$d" ] && printf '   %-60s %s\n' "$d" "$(size "$d")"
done
ls /Applications | grep -iE "logic|garageband|ableton|reaper|kontakt|native access|ample|neural|nembrini" | sed 's/^/   App: /'

say "Downloads: installers and packs (top 40 by size)"
find "$H/Downloads" -maxdepth 2 \( -iname "*.dmg" -o -iname "*.pkg" -o -iname "*.zip" -o -iname "*.rar" -o -iname "*.nam" -o -type d \) 2>/dev/null | \
  while read -r p; do printf '%s\t%s\n' "$(du -sk "$p" 2>/dev/null | cut -f1)" "$p"; done | sort -rn | head -40 | \
  awk -F'\t' '{printf "   %8.1f MB  %s\n", $1/1024, $2}'

echo
echo "Scan done (read-only: nothing was changed)."
