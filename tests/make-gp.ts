// Writes a small Guitar Pro 7 file (two tracks, capo, chord names) for testing the importer in the app.
import { exporter, importer, Settings } from '@coderline/alphatab'
import { writeFileSync } from 'node:fs'
const tex = `\\title "House Riff Test"
\\artist "KGuitar"
\\tempo 92
.
\\track "Rhythm"
\\staff {tabs}
\\tuning e4 b3 g3 d3 a2 e2
:4 (0.5 2.4 2.3 1.2 0.1) (0.5 2.4 2.3 1.2 0.1) (3.6 2.5 0.4 0.3 0.2 3.1) (3.6 2.5 0.4 0.3 0.2 3.1) |
\\track "Lead"
\\staff {tabs}
\\tuning e4 b3 g3 d3 a2 e2
:8 5.3 7.3 5.2 8.2 5.1 8.1 5.2 7.3 | :8 7.3 5.3 7.4 5.4 7.5 5.5 :4 5.6 |
`
const score = importer.ScoreLoader.loadAlphaTex(tex, new Settings())
writeFileSync(process.argv[2], new exporter.Gp7Exporter().export(score, new Settings()))
console.log('ok')
