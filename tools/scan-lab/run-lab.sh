#!/bin/bash
# The Riff Scanner's self-training lab, one night's run (install.sh sets it to run every night; it can also be run by hand:
#   bash ~/"KGuitar Folder"/KGuitar-harvest/lab/run-lab.sh
# 1. download the newest Mr. Tabs / Level Up Shorts (fetch.py)
# 2. scan each one with the app's own scanner and check every note against the video's sound (scan-lab.cjs)
# 3. strips the sound confirms (or corrects beyond doubt) become training pictures in scanner/strips/lab
# 4. once enough new pictures have come in: train the reader further, and keep the new reader only if it is better
#    on the held-back book pages AND on a fixed exam of Shorts it never trained on (lab/for-the-app/ then has it)
# Everything stays on this Mac. A log per night in lab/logs, the running score in lab/report.md.
set -uo pipefail
LAB="${LAB:-$(cd "$(dirname "$0")" && pwd)}"
HARVEST="$(dirname "$LAB")"
KIT="$HARVEST/scanner"
PY="$HARVEST/train/bin/python"
APP="$LAB/app"
export PATH="$LAB/node/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
mkdir -p "$LAB/logs" "$LAB/out" "$LAB/for-the-app" "$KIT/strips/lab"
LOG="$LAB/logs/$(date +%F).log"
exec >>"$LOG" 2>&1
echo "=== $(date) ==="
# only one run at a time
if [ -f "$LAB/.running" ] && kill -0 "$(cat "$LAB/.running")" 2>/dev/null; then echo "already running"; exit 0; fi
echo $$ > "$LAB/.running"
VITE=""
cleanup() { [ -n "$VITE" ] && kill "$VITE" 2>/dev/null; rm -f "$LAB/.running"; }
trap cleanup EXIT

# --- the app's newest code (nightly.sh has just brought it up to date) ------------------------------------------------
[ -d "$APP/node_modules" ] && [ "$(cat "$LAB/.lock-seen" 2>/dev/null)" = "$(git -C "$APP" rev-parse HEAD:package-lock.json)" ] || {
  (cd "$APP" && npm ci --no-audit --no-fund && npx playwright install chromium) && git -C "$APP" rev-parse HEAD:package-lock.json > "$LAB/.lock-seen"; }
(cd "$APP" && exec npx vite --port 5179 --strictPort > "$LAB/logs/vite.log" 2>&1) &
VITE=$!
for i in $(seq 60); do curl -s -o /dev/null http://localhost:5179/ && break; sleep 2; done

# --- the reader the lab is working with (starts as the one in the app) -----------------------------------------------
[ -f "$LAB/current.onnx" ] || cp "$APP/public/models/tab-crnn/tab_crnn.onnx" "$LAB/current.onnx"
[ -f "$LAB/current.pt" ] || cp "$KIT/runs/v6/last.pt" "$LAB/current.pt"

# --- 1. new videos --------------------------------------------------------------------------------------------------
"$PY" "$APP/tools/scan-lab/fetch.py" "$LAB" "${LAB_MAX:-12}"

# --- 2. scan them -------------------------------------------------------------------------------------------------
# the first 10 videos are the exam: scanned every time a new reader is tried, never trained on
[ -f "$LAB/exam.txt" ] || ls -tr "$LAB/videos" 2>/dev/null | grep '\.mp4$' | head -10 > "$LAB/exam.txt"
for v in "$LAB"/videos/*.mp4; do
  [ -e "$v" ] || continue
  id="$(basename "$v" .mp4)"
  [ -f "$LAB/out/$id/summary.json" ] && continue
  (cd "$APP" && timeout 1800 node tools/scan-lab/scan-lab.cjs "$v" "$LAB/out/$id" "$LAB/current.onnx") || echo "scan failed: $id"
done

# --- 3. collect the checked strips, write the report ----------------------------------------------------------------
"$PY" - "$LAB" "$KIT/strips/lab" <<'EOF'
import json, os, shutil, sys, datetime
lab, dst = sys.argv[1], sys.argv[2]
exam = set(l.strip().replace('.mp4', '') for l in open(os.path.join(lab, 'exam.txt')) if l.strip())
lines, n_new = [], 0
outs = sorted(d for d in os.listdir(os.path.join(lab, 'out')) if os.path.exists(os.path.join(lab, 'out', d, 'summary.json')))
for d in outs:
    od = os.path.join(lab, 'out', d)
    if d in exam or os.path.exists(os.path.join(od, '.collected')) or not os.path.exists(os.path.join(od, 'labels.jsonl')):
        continue
    for l in open(os.path.join(od, 'labels.jsonl')):
        if not l.strip(): continue
        e = json.loads(l)
        name = f"{d}-{e['file']}"
        shutil.copy(os.path.join(od, e['file']), os.path.join(dst, name))
        e['file'] = name
        lines.append(json.dumps(e))
        n_new += 1
    open(os.path.join(od, '.collected'), 'w').write('')
if lines:
    with open(os.path.join(dst, 'labels.jsonl'), 'a') as f: f.write('\n'.join(lines) + '\n')
sums = [json.load(open(os.path.join(lab, 'out', d, 'summary.json'))) for d in outs]
chk = sum(s.get('checked') or 0 for s in sums); ok = sum(s.get('confirmed') or 0 for s in sums)
total = sum(1 for l in open(os.path.join(dst, 'labels.jsonl')) if l.strip()) if os.path.exists(os.path.join(dst, 'labels.jsonl')) else 0
rep = os.path.join(lab, 'report.md')
if not os.path.exists(rep):
    open(rep, 'w').write('# Riff Scanner lab\n\nEach night: videos scanned so far, how many of the notes read the sound agrees with, training strips collected.\n\n')
with open(rep, 'a') as f:
    f.write(f"- {datetime.date.today()}: {len(sums)} videos, {100 * ok / max(1, chk):.1f}% of notes agree with the sound, "
            f"{n_new} new training strips ({total} in all)\n")
print('collected', n_new, 'strips;', total, 'in all')
EOF

# --- 4. train further when enough has come in ------------------------------------------------------------------------
TOTAL=$(grep -c . "$KIT/strips/lab/labels.jsonl" 2>/dev/null || echo 0)
LAST=$(cat "$LAB/trained-at" 2>/dev/null || echo 0)
if [ "$TOTAL" -ge $((LAST + ${LAB_RETRAIN_AT:-400})) ]; then
  RUN="lab-$(date +%Y%m%d)"
  echo "training $RUN on $TOTAL lab strips"
  # the current reader's own score on the held-back pages (measured once, the same way)
  if [ ! -f "$LAB/current.json" ]; then
    (cd "$KIT" && "$PY" train.py --strips strips/train --holdout strips/holdout --out "runs/$RUN-base" --steps 1 --eval 1 --batch 2 --workers 0 \
      --arch dense --resume "$LAB/current.pt" --lr 1e-12) && cp "$KIT/runs/$RUN-base/best.json" "$LAB/current.json"
  fi
  (cd "$KIT" && caffeinate -i "$PY" train.py --strips strips/train,strips/lab --holdout strips/holdout --out "runs/$RUN" \
    --steps "${LAB_STEPS:-3000}" --batch 32 --workers 6 --eval 1000 --arch dense --resume "$LAB/current.pt" --lr 3e-4 --real 0.5 2>&1 | grep -v Warning)
  if [ -f "$KIT/runs/$RUN/last.pt" ]; then
    (cd "$KIT" && "$PY" export.py "runs/$RUN/last.pt" "$LAB/candidate.onnx")
    # the exam, with the candidate and (once) with the current reader
    exam_score() {  # $1 = model, $2 = folder
      for v in $(cat "$LAB/exam.txt"); do (cd "$APP" && timeout 1800 node tools/scan-lab/scan-lab.cjs "$LAB/videos/$v" "$2/${v%.mp4}" "$1") >/dev/null; done
      "$PY" -c "import json,glob,sys; s=[json.load(open(f)) for f in glob.glob(sys.argv[1]+'/*/summary.json')]; c=sum(x['checked'] or 0 for x in s); print(round(100*sum(x['confirmed'] or 0 for x in s)/max(1,c),2))" "$2"
    }
    [ -f "$LAB/exam-current.txt" ] || exam_score "$LAB/current.onnx" "$LAB/exam/current" > "$LAB/exam-current.txt"
    rm -rf "$LAB/exam/candidate"
    NEW=$(exam_score "$LAB/candidate.onnx" "$LAB/exam/candidate")
    OLD=$(cat "$LAB/exam-current.txt")
    VERDICT=$("$PY" - "$LAB/current.json" "$KIT/runs/$RUN/last.json" "$KIT/runs/$RUN/best.json" "$OLD" "$NEW" <<'EOF'
import json, os, sys
cur = json.load(open(sys.argv[1]))
new = json.load(open(sys.argv[3]))  # (the newest held-back check; last.pt is saved at every check, best.pt at the best)
s = lambda m: m['clean']['precision'] + m['clean']['recall'] + m['damaged']['precision'] + m['damaged']['recall']
old_e, new_e = float(sys.argv[4]), float(sys.argv[5])
better = s(new) >= s(cur) - 0.2 and new_e >= old_e + 0.5
print(('better' if better else 'not better') + f": book pages {s(cur) / 4:.2f} -> {s(new) / 4:.2f}, Shorts exam {old_e}% -> {new_e}%")
EOF
)
    echo "$VERDICT"
    echo "- $(date +%F): tried a new reader ($RUN): $VERDICT" >> "$LAB/report.md"
    if [[ "$VERDICT" == better* ]]; then
      cp "$KIT/runs/$RUN/best.pt" "$LAB/current.pt"
      (cd "$KIT" && "$PY" export.py "runs/$RUN/best.pt" "$LAB/current.onnx")
      cp "$LAB/current.onnx" "$LAB/for-the-app/tab_crnn-$(date +%Y%m%d).onnx"
      cp "$KIT/runs/$RUN/best.json" "$LAB/current.json"
      echo "$NEW" > "$LAB/exam-current.txt"
      echo "  NEW READER KEPT: lab/for-the-app/tab_crnn-$(date +%Y%m%d).onnx is ready for the app" >> "$LAB/report.md"
    fi
    echo "$TOTAL" > "$LAB/trained-at"
  fi
fi
echo "=== done $(date) ==="
