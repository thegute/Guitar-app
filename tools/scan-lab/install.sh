#!/bin/bash
# Sets up the Riff Scanner's self-training lab on the owner's Mac, once:
#   bash ~/"KGuitar Folder"/KGuitar-harvest/lab-install.sh
# (or straight from GitHub: curl -fsSL https://raw.githubusercontent.com/thegute/guitar-app/gemini-week/tools/scan-lab/install.sh | bash)
# It puts everything in KGuitar-harvest/lab and runs the lab every night at 2:30 (when the Mac is on; a missed night runs
# when it wakes). Nothing outside that folder is changed except the nightly schedule entry.
set -e
HARVEST="${HARVEST:-$HOME/KGuitar Folder/KGuitar-harvest}"
LAB="$HARVEST/lab"
PY="$HARVEST/train/bin/python"
say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
[ -x "$PY" ] || { echo "Can't find the training setup at $HARVEST/train (the scanner's Python). Ask Claude."; exit 1; }
[ -d "$HARVEST/scanner" ] || { echo "Can't find the scanner training kit at $HARVEST/scanner. Ask Claude."; exit 1; }
mkdir -p "$LAB"

say "1/5 The app's code (for its scanner)"
if [ -d "$LAB/app/.git" ]; then git -C "$LAB/app" fetch -q origin gemini-week && git -C "$LAB/app" reset -q --hard FETCH_HEAD
else git clone -q --branch gemini-week --single-branch https://github.com/thegute/guitar-app "$LAB/app"; fi

say "2/5 Node (runs the scanner)"
NEED=1
if command -v node >/dev/null && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ]; then NEED=0; fi
if [ $NEED = 1 ] && [ ! -x "$LAB/node/bin/node" ]; then
  ARCH=$( [ "$(uname -m)" = arm64 ] && echo arm64 || echo x64 )
  curl -fsSL "https://nodejs.org/dist/v22.11.0/node-v22.11.0-darwin-$ARCH.tar.gz" | tar -xz -C "$LAB"
  mv "$LAB/node-v22.11.0-darwin-$ARCH" "$LAB/node"
fi
export PATH="$LAB/node/bin:$PATH"
node -v

say "3/5 The scanner's parts (a few minutes the first time)"
(cd "$LAB/app" && npm ci --no-audit --no-fund >/dev/null && npx playwright install chromium >/dev/null)
git -C "$LAB/app" rev-parse HEAD:package-lock.json > "$LAB/.lock-seen"

say "4/5 The video downloader"
"$PY" -m pip install -q --upgrade yt-dlp imageio-ffmpeg

say "5/5 Every night at 2:30"
cat > "$LAB/nightly.sh" <<'NIGHT'
#!/bin/bash
# brings the app's code up to date, then runs the lab (kept apart so the update never changes a script while it runs)
LAB="$(cd "$(dirname "$0")" && pwd)"
export PATH="$LAB/node/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
git -C "$LAB/app" fetch -q origin gemini-week && git -C "$LAB/app" reset -q --hard FETCH_HEAD
LAB="$LAB" exec caffeinate -i /bin/bash "$LAB/app/tools/scan-lab/run-lab.sh"
NIGHT
chmod +x "$LAB/nightly.sh"
PL="$HOME/Library/LaunchAgents/app.kguitar.scanlab.plist"
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PL" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>app.kguitar.scanlab</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$LAB/nightly.sh</string></array>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>2</integer><key>Minute</key><integer>30</integer></dict>
  <key>StandardOutPath</key><string>$LAB/logs/launchd.log</string>
  <key>StandardErrorPath</key><string>$LAB/logs/launchd.log</string>
</dict></plist>
PLIST
mkdir -p "$LAB/logs"
launchctl bootout "gui/$(id -u)/app.kguitar.scanlab" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PL"

say "All set."
echo "The lab runs every night at 2:30. To run it right now (takes a while):  bash \"$LAB/nightly.sh\""
echo "How it's doing: $LAB/report.md"
echo "To stop it for good:  launchctl bootout gui/\$(id -u)/app.kguitar.scanlab"
