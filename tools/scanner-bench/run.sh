#!/bin/bash
# The Riff Scanner scoreboard: every reader measured the same way against Guitar Pro files of the same pages.
#   SCANNER_DATA=<private folder> bash tools/scanner-bench/run.sh [model.onnx]
# The folder (the owner's books: never in this repo) holds plini.pdf, gp/<Song>.gpx and hold/<song>-110, hold/<song>-photo
# (pages as .gray files: python3 tools/scanner-bench/pages-to-gray.py <pdf> <from> <to> <out> <dpi> [damage]).
# Held-back songs only (never trained on): Selenium Forest 34–60, Opening 62–86, Wombat 167–180.
set -e
cd "$(dirname "$0")/../.."
D=${SCANNER_DATA:?set SCANNER_DATA}
MODEL=${1:-}
for f in pdf-vs-gp pictures-vs-gp; do
  npx esbuild tools/scanner-bench/$f.ts --bundle --platform=node --format=esm --external:pdfjs-dist --external:'onnxruntime-web*' --log-level=error --outfile=node_modules/.tmp/$f.mjs
done
while read name a b short; do
  echo "== $name"
  printf '  PDF (shapes):           '; node node_modules/.tmp/pdf-vs-gp.mjs $D/plini.pdf $a $b $D/gp/$name.gpx | tail -1
  for q in 110 photo; do
    printf "  picture $q, number matcher: "; node node_modules/.tmp/pictures-vs-gp.mjs $D/hold/$short-$q $D/gp/$name.gpx | tail -1
    [ -n "$MODEL" ] && { printf "  picture $q, trained reader: "; MODEL=$MODEL node node_modules/.tmp/pictures-vs-gp.mjs $D/hold/$short-$q $D/gp/$name.gpx | tail -1; }
  done
done <<LIST
SeleniumForest 34 60 sel
Opening 62 86 ope
WombatAstronautBeyondTheBurrow 167 180 wom
LIST
