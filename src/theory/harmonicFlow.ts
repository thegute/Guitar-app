// Harmonic Flow Coach & Strum Grid (Strum Machine) core theory, radial graph,
// Pathfinder challenges, 16 built-in groove charts, and candidate-constrained chord matcher.
import { FLATS, SHARPS, keyPrefersFlats, pc, pcName } from './notes'

export type FlowSpice = 'campfire' | 'pop' | 'jazz'
export type EdgeFlavor = 'diatonic' | 'pull' | 'color'
export type ChordQual = '' | 'm' | '5' | '7' | 'm7' | 'maj7' | 'dim' | 'sus4' | 'add9'

export interface FlowNodeDef {
  /** Unique function id inside the key, e.g. 'I', 'vi', 'V7/vi', 'iv', 'bVII'. */
  id: string
  /** Roman numeral label locked to key function. */
  roman: string
  /** Semitones above key tonic (0..11). */
  semi: number
  /** Chord quality suffix. */
  qual: ChordQual
  /** Harmonic flavor category for color-coding. */
  flavor: EdgeFlavor
  /** Minimum spice level where this node is suggested. */
  minSpice: FlowSpice
  /** Short 1-line musical description. */
  note: string
}

export interface FlowEdge {
  to: string
  flavor: EdgeFlavor
  minSpice: FlowSpice
  whisper: string
}

export interface ResolvedFlowNode extends FlowNodeDef {
  /** Concert-pitch chord symbol, e.g. 'Am', 'E7', 'Fm'. */
  symbol: string
  /** Capo-adjusted display shape when capo > 0 (e.g. 'G' when sounding 'A' with Capo 2). */
  capoSymbol: string
  /** Concert root pitch class (0..11). */
  rootPc: number
  /** Pitch classes in this chord (0..11). */
  pcs: number[]
}

export interface ResolvedFlowBranch {
  node: ResolvedFlowNode
  flavor: EdgeFlavor
  whisper: string
}

const SPICE_RANK: Record<FlowSpice, number> = { campfire: 0, pop: 1, jazz: 2 }

const QUAL_IVS: Record<ChordQual, [number, number][]> = {
  '': [[0, 1], [4, 0.85], [7, 0.8]],
  m: [[0, 1], [3, 0.85], [7, 0.8]],
  '5': [[0, 1], [7, 0.9]],
  '7': [[0, 1], [4, 0.85], [7, 0.72], [10, 0.65]],
  m7: [[0, 1], [3, 0.85], [7, 0.72], [10, 0.65]],
  maj7: [[0, 1], [4, 0.85], [7, 0.72], [11, 0.65]],
  dim: [[0, 1], [3, 0.85], [6, 0.8]],
  sus4: [[0, 1], [5, 0.85], [7, 0.8]],
  add9: [[0, 1], [2, 0.55], [4, 0.85], [7, 0.78]],
}

export const MAJOR_NODES: FlowNodeDef[] = [
  { id: 'I', roman: 'I', semi: 0, qual: '', flavor: 'diatonic', minSpice: 'campfire', note: 'Home tonic — stable resolution' },
  { id: 'ii', roman: 'ii', semi: 2, qual: 'm', flavor: 'diatonic', minSpice: 'campfire', note: 'Warm pre-dominant leading to V' },
  { id: 'iii', roman: 'iii', semi: 4, qual: 'm', flavor: 'diatonic', minSpice: 'campfire', note: 'Mediant color — shares 2 notes with I and V' },
  { id: 'IV', roman: 'IV', semi: 5, qual: '', flavor: 'diatonic', minSpice: 'campfire', note: 'Subdominant lift — bright departure from home' },
  { id: 'V', roman: 'V', semi: 7, qual: '', flavor: 'diatonic', minSpice: 'campfire', note: 'Dominant tension pulling straight home to I' },
  { id: 'V7', roman: 'V7', semi: 7, qual: '7', flavor: 'pull', minSpice: 'pop', note: 'Dominant 7th tritone pull back to I' },
  { id: 'vi', roman: 'vi', semi: 9, qual: 'm', flavor: 'diatonic', minSpice: 'campfire', note: 'Relative minor — emotional mirror of home' },
  { id: 'vii°', roman: 'vii°', semi: 11, qual: 'dim', flavor: 'pull', minSpice: 'jazz', note: 'Leading-tone diminished tension into I' },
  // Secondary dominants (Pull)
  { id: 'V7/vi', roman: 'V7/vi', semi: 4, qual: '7', flavor: 'pull', minSpice: 'pop', note: 'Secondary dominant pulling magnetically into vi' },
  { id: 'V7/V', roman: 'V7/V', semi: 2, qual: '7', flavor: 'pull', minSpice: 'pop', note: 'Bright major II7 pushing hard into V' },
  { id: 'V7/IV', roman: 'V7/IV', semi: 0, qual: '7', flavor: 'pull', minSpice: 'pop', note: 'Bluesy I7 lean straight into IV' },
  { id: 'V7/ii', roman: 'V7/ii', semi: 9, qual: '7', flavor: 'pull', minSpice: 'jazz', note: 'Jazz turnaround VI7 setting up ii–V–I' },
  // Modal interchange / borrowed (Color)
  { id: 'iv', roman: 'iv', semi: 5, qual: 'm', flavor: 'color', minSpice: 'pop', note: 'Borrowed minor 4 — bittersweet cinematic pull to I' },
  { id: 'bVII', roman: '♭VII', semi: 10, qual: '', flavor: 'color', minSpice: 'pop', note: 'Mixolydian rock/backdoor chord lifting into I or IV' },
  { id: 'bVI', roman: '♭VI', semi: 8, qual: '', flavor: 'color', minSpice: 'pop', note: 'Epic heroic modal-interchange lift (pairs with ♭VII → I)' },
  { id: 'bIII', roman: '♭III', semi: 3, qual: '', flavor: 'color', minSpice: 'jazz', note: 'Chromatic mediant color borrowed from parallel minor' },
  { id: 'bII7', roman: '♭II7', semi: 1, qual: '7', flavor: 'color', minSpice: 'jazz', note: 'Tritone substitute for V7 — silky half-step slide to I' },
  { id: 'Imaj7', roman: 'Imaj7', semi: 0, qual: 'maj7', flavor: 'diatonic', minSpice: 'jazz', note: 'Dreamy neo-soul / jazz home tonic' },
  { id: 'ii7', roman: 'ii7', semi: 2, qual: 'm7', flavor: 'diatonic', minSpice: 'jazz', note: 'Smooth jazz pre-dominant into V7 or ♭II7' },
]

export const MINOR_NODES: FlowNodeDef[] = [
  { id: 'i', roman: 'i', semi: 0, qual: 'm', flavor: 'diatonic', minSpice: 'campfire', note: 'Minor home base — moody, grounded root' },
  { id: 'ii°', roman: 'ii°', semi: 2, qual: 'dim', flavor: 'pull', minSpice: 'jazz', note: 'Dark pre-dominant setting up V7' },
  { id: 'bIII', roman: '♭III', semi: 3, qual: '', flavor: 'diatonic', minSpice: 'campfire', note: 'Relative major — warm sunlight inside a minor key' },
  { id: 'iv', roman: 'iv', semi: 5, qual: 'm', flavor: 'diatonic', minSpice: 'campfire', note: 'Minor subdominant — deep emotional pull' },
  { id: 'v', roman: 'v', semi: 7, qual: 'm', flavor: 'diatonic', minSpice: 'campfire', note: 'Natural minor dominant — laid-back modal turn' },
  { id: 'V7', roman: 'V7', semi: 7, qual: '7', flavor: 'pull', minSpice: 'pop', note: 'Harmonic minor V7 — dramatic neoclassical pull to i' },
  { id: 'bVI', roman: '♭VI', semi: 8, qual: '', flavor: 'diatonic', minSpice: 'campfire', note: 'Lush minor-key staple (classic metal, rock & film)' },
  { id: 'bVII', roman: '♭VII', semi: 10, qual: '', flavor: 'diatonic', minSpice: 'campfire', note: 'Driving Aeolian climb straight back to i' },
  { id: 'IV', roman: 'IV', semi: 5, qual: '', flavor: 'color', minSpice: 'pop', note: 'Dorian bright major IV (Santana / Pink Floyd lift)' },
  { id: 'bII', roman: '♭II', semi: 1, qual: '', flavor: 'color', minSpice: 'pop', note: 'Phrygian / Neapolitan half-step tension (metal & flamenco)' },
  { id: 'I', roman: 'I', semi: 0, qual: '', flavor: 'color', minSpice: 'jazz', note: 'Picardy third — surprise major sunrise resolution' },
  { id: 'V7/iv', roman: 'V7/iv', semi: 0, qual: '7', flavor: 'pull', minSpice: 'jazz', note: 'Secondary dominant pulling into iv' },
  { id: 'V7/bVI', roman: 'V7/♭VI', semi: 3, qual: '7', flavor: 'pull', minSpice: 'jazz', note: 'Dominant push into lush ♭VI' },
]

export const MAJOR_EDGES: Record<string, FlowEdge[]> = {
  I: [
    { to: 'IV', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Classic subdominant lift — warm and open' },
    { to: 'V', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Bright dominant energy ready to answer home' },
    { to: 'vi', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Smooth 1-note drop into the relative minor' },
    { to: 'ii', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Gentle step up to launch a ii–V–I' },
    { to: 'V7/vi', flavor: 'pull', minSpice: 'pop', whisper: 'Chromatic #5 push that begs to resolve to vi' },
    { to: 'bVII', flavor: 'color', minSpice: 'pop', whisper: 'Mixolydian rock-anthem step down a whole step' },
    { to: 'V7/IV', flavor: 'pull', minSpice: 'pop', whisper: 'Add the ♭7 for a soulful blues lean into IV' },
    { to: 'bVI', flavor: 'color', minSpice: 'jazz', whisper: 'Cinematic chromatic mediant leap' },
  ],
  Imaj7: [
    { to: 'ii7', flavor: 'diatonic', minSpice: 'jazz', whisper: 'Silky step into a jazz ii7–V7 turnaround' },
    { to: 'V7/ii', flavor: 'pull', minSpice: 'jazz', whisper: 'Classic VI7 turnaround pushing into ii7' },
    { to: 'IV', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Lush lift to the 4 chord' },
    { to: 'iv', flavor: 'color', minSpice: 'pop', whisper: 'Neo-soul borrowed minor iv shimmer' },
    { to: 'bIII', flavor: 'color', minSpice: 'jazz', whisper: 'Unexpected parallel-minor mediant color' },
  ],
  ii: [
    { to: 'V', flavor: 'diatonic', minSpice: 'campfire', whisper: 'The strongest move in harmony: ii → V' },
    { to: 'V7', flavor: 'pull', minSpice: 'pop', whisper: 'Add the 7th on V for maximum magnetic pull' },
    { to: 'IV', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Share 2 common tones for a smooth side-step' },
    { to: 'vi', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Circle-of-fifths detour back to vi' },
    { to: 'bII7', flavor: 'color', minSpice: 'jazz', whisper: 'Jazz tritone sub — smooth chromatic bass slide to I' },
    { to: 'V7/V', flavor: 'pull', minSpice: 'pop', whisper: 'Brighten ii into major II7 to supercharge V' },
  ],
  ii7: [
    { to: 'V7', flavor: 'pull', minSpice: 'pop', whisper: 'Iconic ii7–V7 jazz resolution engine' },
    { to: 'bII7', flavor: 'color', minSpice: 'jazz', whisper: 'Chromatic tritone sub sliding half-step down to Imaj7' },
    { to: 'iv', flavor: 'color', minSpice: 'pop', whisper: 'Bittersweet minor subdominant substitute' },
    { to: 'Imaj7', flavor: 'diatonic', minSpice: 'jazz', whisper: 'Soft modal resolution straight home' },
  ],
  iii: [
    { to: 'vi', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Natural 5th-down glide into vi' },
    { to: 'IV', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Half-step bass lift into bright IV' },
    { to: 'ii', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Stepwise descent setting up V' },
    { to: 'V7/vi', flavor: 'pull', minSpice: 'pop', whisper: 'Turn iii major/7th for an instant pull to vi' },
    { to: 'bIII', flavor: 'color', minSpice: 'jazz', whisper: 'Chromatic slip down a half step for dark color' },
  ],
  IV: [
    { to: 'V', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Classic climb toward the cadence' },
    { to: 'I', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Warm plagal ("Amen") resolution home' },
    { to: 'ii', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Extend subdominant tension before V' },
    { to: 'iv', flavor: 'color', minSpice: 'pop', whisper: 'The iconic IV → iv bittersweet major-to-minor melt' },
    { to: 'V7/V', flavor: 'pull', minSpice: 'pop', whisper: 'Raise the root a half-step into bright II7 → V' },
    { to: 'bVII', flavor: 'color', minSpice: 'pop', whisper: 'Double-plagal rock lift (IV → ♭VII → I)' },
  ],
  V: [
    { to: 'I', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Authentic cadence — satisfying return home' },
    { to: 'vi', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Deceptive cadence — emotional surprise instead of I' },
    { to: 'IV', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Classic rock retrogression (V → IV → I)' },
    { to: 'V7', flavor: 'pull', minSpice: 'pop', whisper: 'Add the ♭7 to heighten the pull home' },
    { to: 'bVI', flavor: 'color', minSpice: 'pop', whisper: 'Dramatic cinematic deceptive leap to ♭VI' },
    { to: 'Imaj7', flavor: 'diatonic', minSpice: 'jazz', whisper: 'Lush maj7 landing back on tonic' },
  ],
  V7: [
    { to: 'I', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Tritone resolves cleanly straight home to I' },
    { to: 'vi', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Deceptive cadence to vi for extra emotion' },
    { to: 'Imaj7', flavor: 'diatonic', minSpice: 'jazz', whisper: 'Warm jazz resolution onto Imaj7' },
    { to: 'bVI', flavor: 'color', minSpice: 'pop', whisper: 'Big cinematic deceptive lift to ♭VI' },
    { to: 'bIII', flavor: 'color', minSpice: 'jazz', whisper: 'Surprise chromatic mediant turn' },
  ],
  vi: [
    { to: 'IV', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Huge pop/rock hook move (vi → IV)' },
    { to: 'ii', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Circle-of-fifths motion down to ii' },
    { to: 'V', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Direct push to dominant tension' },
    { to: 'I', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Gentle common-tone lift back home' },
    { to: 'V7/V', flavor: 'pull', minSpice: 'pop', whisper: 'Sparkling major II7 aiming straight at V' },
    { to: 'V7/ii', flavor: 'pull', minSpice: 'jazz', whisper: 'Flip vi into dominant VI7 to launch ii7–V7' },
    { to: 'iv', flavor: 'color', minSpice: 'pop', whisper: 'Smooth chromatic drop into borrowed iv' },
  ],
  'vii°': [
    { to: 'I', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Leading tone resolves a half step up to I' },
    { to: 'iii', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Stepwise root motion to iii' },
    { to: 'vi', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Deceptive slide into relative minor' },
    { to: 'V7/vi', flavor: 'pull', minSpice: 'pop', whisper: 'Smooth dominant pivot aiming at vi' },
  ],
  'V7/vi': [
    { to: 'vi', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Target reached! Magnetic resolution into vi' },
    { to: 'IV', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Deceptive lift to IV (Creep / classic ballad move!)' },
    { to: 'V7/ii', flavor: 'pull', minSpice: 'jazz', whisper: 'Chain secondary dominants down the circle of 5ths' },
  ],
  'V7/V': [
    { to: 'V', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Clean target resolution straight onto V' },
    { to: 'V7', flavor: 'pull', minSpice: 'pop', whisper: 'Land on V7 to keep the tension rolling home' },
    { to: 'IV', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Beatles-style slide down to IV → I' },
    { to: 'iv', flavor: 'color', minSpice: 'pop', whisper: 'Bittersweet chromatic drop into minor iv' },
  ],
  'V7/IV': [
    { to: 'IV', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Bluesy release straight onto IV' },
    { to: 'iv', flavor: 'color', minSpice: 'pop', whisper: 'Dark twist landing on borrowed minor iv' },
    { to: 'ii', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Substitute relative minor ii of IV' },
  ],
  'V7/ii': [
    { to: 'ii', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Clean turnaround resolution into ii' },
    { to: 'ii7', flavor: 'diatonic', minSpice: 'jazz', whisper: 'Classic jazz VI7 → ii7 → V7 chain' },
    { to: 'V7/V', flavor: 'pull', minSpice: 'pop', whisper: 'Extend dominant chain (VI7 → II7 → V7)' },
  ],
  iv: [
    { to: 'I', flavor: 'diatonic', minSpice: 'campfire', whisper: 'The minor-plagal tearjerker resolution straight home' },
    { to: 'Imaj7', flavor: 'diatonic', minSpice: 'jazz', whisper: 'Dreamy neo-soul resolution onto Imaj7' },
    { to: 'bVII', flavor: 'color', minSpice: 'pop', whisper: 'Backdoor cadence: iv → ♭VII → I' },
    { to: 'V', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Step up to V for a dramatic final push' },
    { to: 'bVI', flavor: 'color', minSpice: 'pop', whisper: 'Deepen the parallel-minor mood on ♭VI' },
  ],
  bVII: [
    { to: 'I', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Backdoor / Mixolydian triumphant lift straight to I' },
    { to: 'IV', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Rock staple: ♭VII → IV → I (Hey Jude / Sweet Home)' },
    { to: 'V', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Pivot back into the dominant' },
    { to: 'iv', flavor: 'color', minSpice: 'pop', whisper: 'Stay in borrowed minor color' },
  ],
  bVI: [
    { to: 'bVII', flavor: 'color', minSpice: 'pop', whisper: 'Heroic Mario/rock cadence: ♭VI → ♭VII → I!' },
    { to: 'V', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Dramatic half-step drop onto V' },
    { to: 'I', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Cinematic chromatic lift directly home' },
    { to: 'iv', flavor: 'color', minSpice: 'pop', whisper: 'Share 2 common tones into bittersweet iv' },
  ],
  bIII: [
    { to: 'IV', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Rock climb: ♭III → IV → I' },
    { to: 'bVI', flavor: 'color', minSpice: 'pop', whisper: 'Smooth 5th-down slide into lush ♭VI' },
    { to: 'bVII', flavor: 'color', minSpice: 'pop', whisper: 'Epic modal lift to ♭VII' },
    { to: 'ii7', flavor: 'diatonic', minSpice: 'jazz', whisper: 'Half-step chromatic slide into ii7–V7' },
  ],
  bII7: [
    { to: 'I', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Silky half-step bass glide home to I' },
    { to: 'Imaj7', flavor: 'diatonic', minSpice: 'jazz', whisper: 'Ultimate jazz tritone-sub landing on Imaj7' },
    { to: 'vi', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Deceptive chromatic detour to vi' },
  ],
}

export const MINOR_EDGES: Record<string, FlowEdge[]> = {
  i: [
    { to: 'bVI', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Classic dark lift into lush ♭VI' },
    { to: 'bVII', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Driving rock/metal step down to ♭VII' },
    { to: 'iv', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Deep minor subdominant ache' },
    { to: 'bIII', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Open up into bright relative major ♭III' },
    { to: 'V7', flavor: 'pull', minSpice: 'pop', whisper: 'Harmonic minor V7 — sharp leading-tone tension' },
    { to: 'IV', flavor: 'color', minSpice: 'pop', whisper: 'Dorian bright major IV lift (funk / classic rock)' },
    { to: 'bII', flavor: 'color', minSpice: 'pop', whisper: 'Phrygian / metal half-step menace' },
  ],
  'ii°': [
    { to: 'V7', flavor: 'pull', minSpice: 'pop', whisper: 'Classic minor ii° → V7 → i tension' },
    { to: 'v', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Softer natural-minor turn' },
    { to: 'bIII', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Resolve upward into bright ♭III' },
  ],
  bIII: [
    { to: 'bVI', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Lush 5th-down motion to ♭VI' },
    { to: 'bVII', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Anthemic lift to ♭VII' },
    { to: 'iv', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Step up into emotional iv' },
    { to: 'V7/bVI', flavor: 'pull', minSpice: 'jazz', whisper: 'Turn ♭III into a dominant 7th pushing into ♭VI' },
    { to: 'i', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Settle back to minor tonic' },
  ],
  iv: [
    { to: 'i', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Heavy minor-plagal return home' },
    { to: 'V7', flavor: 'pull', minSpice: 'pop', whisper: 'Neoclassical climb into sharp V7' },
    { to: 'bVII', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Smooth 5th-down glide into ♭VII' },
    { to: 'v', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Natural minor step up to v' },
    { to: 'bVI', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Common-tone bloom into ♭VI' },
  ],
  v: [
    { to: 'i', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Laid-back Aeolian return to i' },
    { to: 'bVI', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Half-step rise to epic ♭VI' },
    { to: 'iv', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Step down into iv' },
    { to: 'V7', flavor: 'pull', minSpice: 'pop', whisper: 'Raise the 3rd for dramatic harmonic-minor V7 pull' },
  ],
  V7: [
    { to: 'i', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Dramatic harmonic-minor resolution home to i' },
    { to: 'bVI', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Deceptive minor cadence onto ♭VI' },
    { to: 'I', flavor: 'color', minSpice: 'jazz', whisper: 'Picardy third! Surprise major sunrise ending' },
    { to: 'iv', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Pull back to keep the groove rolling' },
  ],
  bVI: [
    { to: 'bVII', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Iconic metal/rock/film climb: ♭VI → ♭VII → i!' },
    { to: 'V7', flavor: 'pull', minSpice: 'pop', whisper: 'Andalusian / classical half-step drop onto V7' },
    { to: 'bIII', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Bright pop-minor loop (i → ♭VI → ♭III → ♭VII)' },
    { to: 'iv', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Common-tone drop into moody iv' },
  ],
  bVII: [
    { to: 'i', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Driving rock/metal whole-step slam back to i' },
    { to: 'bIII', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Dominant-of-relative-major lift to ♭III' },
    { to: 'bVI', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Andalusian descent (i → ♭VII → ♭VI → V7)' },
    { to: 'iv', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Pivot into minor subdominant' },
  ],
  IV: [
    { to: 'i', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Signature Dorian vamp (i ↔ IV)' },
    { to: 'bVII', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Funky modal step into ♭VII' },
    { to: 'iv', flavor: 'color', minSpice: 'pop', whisper: 'Darken Dorian IV down to moody iv' },
    { to: 'V7', flavor: 'pull', minSpice: 'pop', whisper: 'Turn the vamp into a dramatic cadence' },
  ],
  bII: [
    { to: 'i', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Crushing Phrygian half-step drop straight to i' },
    { to: 'V7', flavor: 'pull', minSpice: 'pop', whisper: 'Classical Neapolitan cadence: ♭II → V7 → i!' },
    { to: 'bVII', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Exotic metal riff bounce to ♭VII' },
  ],
  I: [
    { to: 'iv', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Slip back into minor via iv' },
    { to: 'bVI', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Cinematic chromatic drop to ♭VI' },
    { to: 'i', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Return to minor tonic' },
  ],
  'V7/iv': [
    { to: 'iv', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Clean secondary-dominant landing on iv' },
    { to: 'bVI', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Deceptive lift to ♭VI' },
  ],
  'V7/bVI': [
    { to: 'bVI', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Magnetic dominant pull straight onto ♭VI' },
    { to: 'iv', flavor: 'diatonic', minSpice: 'campfire', whisper: 'Smooth alternate landing on iv' },
  ],
}

export function formatChordSymbol(rootPc: number, qual: ChordQual, flats: boolean): string {
  const name = (flats ? FLATS : SHARPS)[((rootPc % 12) + 12) % 12]
  return name + qual
}

export function chordPcsFrom(rootPc: number, qual: ChordQual): number[] {
  const ivs = QUAL_IVS[qual] ?? QUAL_IVS['']
  return ivs.map(([iv]) => (rootPc + iv) % 12)
}

export function resolveFlowNode(def: FlowNodeDef, tonic: string, minor: boolean, capo = 0): ResolvedFlowNode {
  const tPc = pc(tonic)
  const flats = keyPrefersFlats(tonic, minor) || def.id.startsWith('b')
  const rootPc = (tPc + def.semi) % 12
  const symbol = formatChordSymbol(rootPc, def.qual, flats)
  const capoPc = ((rootPc - capo) % 12 + 12) % 12
  const capoFlats = capo > 0 ? (keyPrefersFlats(pcName(capoPc, flats), minor) || def.id.startsWith('b')) : flats
  const capoSymbol = capo > 0 ? formatChordSymbol(capoPc, def.qual, capoFlats) : symbol
  return {
    ...def,
    rootPc,
    symbol,
    capoSymbol,
    pcs: chordPcsFrom(rootPc, def.qual),
  }
}

export function getFlowNodes(tonic: string, minor: boolean, capo = 0): ResolvedFlowNode[] {
  const list = minor ? MINOR_NODES : MAJOR_NODES
  return list.map(d => resolveFlowNode(d, tonic, minor, capo))
}

export function getFlowBranches(
  centerId: string,
  tonic: string,
  minor: boolean,
  spice: FlowSpice = 'pop',
  capo = 0,
  maxBranches = 5,
): { center: ResolvedFlowNode; branches: ResolvedFlowBranch[] } {
  const nodes = getFlowNodes(tonic, minor, capo)
  const byId = new Map(nodes.map(n => [n.id, n]))
  const fallbackId = minor ? 'i' : 'I'
  const center = byId.get(centerId) ?? byId.get(fallbackId) ?? nodes[0]
  const edges = (minor ? MINOR_EDGES : MAJOR_EDGES)[center.id] ?? []
  const maxRank = SPICE_RANK[spice]
  const filtered = edges
    .filter(e => SPICE_RANK[e.minSpice] <= maxRank && byId.has(e.to))
    .slice(0, maxBranches)
    .map(e => ({ node: byId.get(e.to)!, flavor: e.flavor, whisper: e.whisper }))
  return { center, branches: filtered }
}

/** Find the best matching flow node id in a key for an arbitrary chord symbol like 'Am7' or 'E7'. */
export function flowNodeForChordSymbol(symbol: string, tonic: string, minor: boolean): string {
  const m = symbol.trim().match(/^([A-G][#b]?)(.*)$/)
  const fallback = minor ? 'i' : 'I'
  if (!m) return fallback
  const r = pc(m[1])
  const rest = (m[2] ?? '').toLowerCase()
  const semi = (r - pc(tonic) + 12) % 12
  const list = minor ? MINOR_NODES : MAJOR_NODES
  const isMin = rest.startsWith('m') && !rest.startsWith('maj')
  const isDom7 = rest === '7' || rest.startsWith('7')
  const isDim = rest.includes('dim') || rest.includes('°')
  const exact = list.find(n => n.semi === semi && (
    (isDim && n.qual === 'dim') ||
    (isDom7 && n.qual === '7') ||
    (isMin && (n.qual === 'm' || n.qual === 'm7')) ||
    (!isMin && !isDom7 && !isDim && (n.qual === '' || n.qual === 'maj7'))
  ))
  return exact?.id ?? list.find(n => n.semi === semi)?.id ?? fallback
}

/** Parse an arbitrary chord symbol (e.g. 'F#m7', 'Bb', 'E5', 'Gsus4', 'Cmaj7') into rootPc + ChordQual. */
export function parseChordQual(symbol: string): { rootPc: number; qual: ChordQual } | null {
  const m = symbol.trim().match(/^([A-G][#b]?)(.*)$/)
  if (!m) return null
  const rootPc = pc(m[1])
  const q = (m[2] ?? '').trim()
  if (q === '' || q === 'maj' || q === 'M') return { rootPc, qual: '' }
  if (q === '5') return { rootPc, qual: '5' }
  if (q === 'm' || q === 'min' || q === '-') return { rootPc, qual: 'm' }
  if (q.startsWith('maj7') || q.startsWith('M7') || q.startsWith('maj9')) return { rootPc, qual: 'maj7' }
  if (q.startsWith('m7') || q.startsWith('min7') || q.startsWith('m9')) return { rootPc, qual: 'm7' }
  if (q.includes('dim') || q.includes('°')) return { rootPc, qual: 'dim' }
  if (q.includes('sus4') || q.includes('sus')) return { rootPc, qual: 'sus4' }
  if (q.includes('add9')) return { rootPc, qual: 'add9' }
  if (q.startsWith('7') || q.startsWith('9') || q.startsWith('13')) return { rootPc, qual: '7' }
  if (q.startsWith('m')) return { rootPc, qual: 'm' }
  return { rootPc, qual: '' }
}

export interface CandidateMatch {
  id: string
  symbol: string
  score: number
  margin: number
}

/**
 * Candidate-constrained chord matcher: scores incoming 12-bin audio chroma ONLY against
 * the active center + lit branch candidates (3–6 targets instead of all 48 chords).
 * Dramatically improves real-time guitar accuracy and reduces false triggers.
 */
export function matchCandidateChord(
  chroma: number[],
  bass: number[] | undefined,
  candidates: { id: string; symbol: string; rootPc: number; qual: ChordQual }[],
): CandidateMatch | null {
  if (!candidates.length) return null
  const sum = chroma.reduce((a, b) => a + b, 0)
  if (sum <= 1e-6) return null
  const c = chroma.map(v => v / sum)
  const norm = Math.sqrt(c.reduce((a, b) => a + b * b, 0)) || 1
  const bsum = bass ? bass.reduce((a, b) => a + b, 0) : 0
  const scored: { id: string; symbol: string; score: number }[] = []
  for (const cand of candidates) {
    const ivs = QUAL_IVS[cand.qual] ?? QUAL_IVS['']
    const t = new Array(12).fill(0)
    for (const [iv, w] of ivs) t[(cand.rootPc + iv) % 12] = w
    const tn = Math.sqrt(t.reduce((a, b) => a + b * b, 0)) || 1
    let dot = 0
    for (let i = 0; i < 12; i++) dot += c[i] * t[i]
    let score = dot / (norm * tn)
    if (bass && bsum > 1e-6) score += 0.14 * (bass[cand.rootPc] / bsum)
    scored.push({ id: cand.id, symbol: cand.symbol, score })
  }
  scored.sort((a, b) => b.score - a.score)
  const top = scored[0]
  const second = scored[1]?.score ?? 0
  return { id: top.id, symbol: top.symbol, score: top.score, margin: top.score - second }
}

// ---------- Pathfinder Challenges ----------
export interface PathfinderChallenge {
  id: string
  title: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  minor: boolean
  spice: FlowSpice
  startId: string
  goalId: string
  maxSteps: number
  requireFlavor?: EdgeFlavor
  hint: string
}

export const PATHFINDER_CHALLENGES: PathfinderChallenge[] = [
  { id: 'pf-1', title: 'Campfire Loop to V', level: 'Beginner', minor: false, spice: 'campfire', startId: 'I', goalId: 'V', maxSteps: 2, hint: 'Lift to IV or vi, then climb onto V.' },
  { id: 'pf-2', title: 'Classic ii–V Turnaround', level: 'Beginner', minor: false, spice: 'campfire', startId: 'I', goalId: 'ii', maxSteps: 2, hint: 'Step via vi down the circle of fifths to ii.' },
  { id: 'pf-3', title: 'Deceptive Surprise', level: 'Beginner', minor: false, spice: 'campfire', startId: 'IV', goalId: 'vi', maxSteps: 2, hint: 'Go IV → V → vi for the classic deceptive cadence.' },
  { id: 'pf-4', title: 'Minor Anthem Climb', level: 'Beginner', minor: true, spice: 'campfire', startId: 'i', goalId: 'bVII', maxSteps: 2, hint: 'Bloom into ♭VI then climb up to ♭VII.' },
  { id: 'pf-5', title: 'Bittersweet IV → iv Melt', level: 'Intermediate', minor: false, spice: 'pop', startId: 'I', goalId: 'iv', maxSteps: 3, requireFlavor: 'color', hint: 'Head to IV, then melt into borrowed minor iv!' },
  { id: 'pf-6', title: 'Secondary Dominant to vi', level: 'Intermediate', minor: false, spice: 'pop', startId: 'I', goalId: 'vi', maxSteps: 2, requireFlavor: 'pull', hint: 'Use V7/vi (major III7) to pull magnetically into vi.' },
  { id: 'pf-7', title: 'Backdoor ♭VII Resolution', level: 'Intermediate', minor: false, spice: 'pop', startId: 'IV', goalId: 'bVII', maxSteps: 2, requireFlavor: 'color', hint: 'Try IV → iv → ♭VII or IV → ♭VII.' },
  { id: 'pf-8', title: 'Heroic ♭VI → ♭VII Lift', level: 'Intermediate', minor: false, spice: 'pop', startId: 'V', goalId: 'bVII', maxSteps: 2, requireFlavor: 'color', hint: 'Take the dramatic deceptive leap V → ♭VI → ♭VII.' },
  { id: 'pf-9', title: 'Neoclassical Harmonic Minor', level: 'Intermediate', minor: true, spice: 'pop', startId: 'i', goalId: 'V7', maxSteps: 3, requireFlavor: 'pull', hint: 'Drop to ♭VI or iv, then ignite the sharp V7.' },
  { id: 'pf-10', title: 'Phrygian Metal Tension', level: 'Intermediate', minor: true, spice: 'pop', startId: 'bVI', goalId: 'bII', maxSteps: 3, requireFlavor: 'color', hint: 'Return to i via ♭VII, then slam into Phrygian ♭II.' },
  { id: 'pf-11', title: 'Jazz Tritone Sub', level: 'Advanced', minor: false, spice: 'jazz', startId: 'I', goalId: 'bII7', maxSteps: 3, requireFlavor: 'color', hint: 'Navigate to ii or ii7, then swap V7 for tritone sub ♭II7!' },
  { id: 'pf-12', title: 'Picardy Sunrise Ending', level: 'Advanced', minor: true, spice: 'jazz', startId: 'i', goalId: 'I', maxSteps: 3, requireFlavor: 'color', hint: 'Build tension on V7, then resolve to surprise major I!' },
]

export function randomPathfinderGoal(spice: FlowSpice, minor: boolean): PathfinderChallenge {
  const nodes = minor ? MINOR_NODES : MAJOR_NODES
  const eligible = nodes.filter(n => SPICE_RANK[n.minSpice] <= SPICE_RANK[spice])
  const startId = minor ? 'i' : 'I'
  const targets = eligible.filter(n => n.id !== startId)
  const pick = targets[Math.floor(Math.random() * targets.length)] ?? eligible[1]
  return {
    id: `pf-rand-${Date.now()}`,
    title: `Random Goal → ${pick.roman}`,
    level: spice === 'campfire' ? 'Beginner' : spice === 'pop' ? 'Intermediate' : 'Advanced',
    minor,
    spice,
    startId,
    goalId: pick.id,
    maxSteps: spice === 'campfire' ? 3 : 4,
    hint: `Improvise a musical path from ${startId} to ${pick.roman} (${pick.note.toLowerCase()}).`,
  }
}

// ---------- Strum Grid (Strum Machine) Data Model & 16 Built-in Groove Charts ----------
export type StrumStyleId =
  | 'bluegrass'
  | 'folk'
  | 'waltz'
  | 'twelve'
  | 'reggae'
  | 'island'
  | 'bossa'
  | 'blues'
  | 'rock'
  | 'metal-chug'
  | 'metal-gallop'
  | 'djent'
  | 'orchestra'
  | 'cinematic'
  | 'rhodes'
  | 'organ'
  | 'funk'
  | 'ambient'

export interface StrumStyleMeta {
  id: StrumStyleId
  label: string
  group: 'Acoustic' | 'Reggae & Groove' | 'Rock & Metal' | 'Orchestra & Keys'
  beatsPerBar: 3 | 4
  defaultBpm: number
  defaultKit: 'studio' | 'rock' | 'metal' | 'jazz' | 'vintage' | 'lofi' | '808' | '909' | 'perc' | 'off'
  hint: string
}

export const STRUM_STYLES: StrumStyleMeta[] = [
  { id: 'bluegrass', label: 'Bluegrass Boom-Chuck', group: 'Acoustic', beatsPerBar: 4, defaultBpm: 118, defaultKit: 'perc', hint: 'Alternating root–5th bass + crisp dreadnought chop' },
  { id: 'folk', label: 'Folk Acoustic 4/4', group: 'Acoustic', beatsPerBar: 4, defaultBpm: 100, defaultKit: 'studio', hint: 'Warm D-DU-UDU acoustic strumming with walking bass' },
  { id: 'waltz', label: 'Acoustic Waltz 3/4', group: 'Acoustic', beatsPerBar: 3, defaultBpm: 108, defaultKit: 'jazz', hint: 'Oom-pah-pah 3/4 acoustic waltz' },
  { id: 'twelve', label: '12-String Shimmer', group: 'Acoustic', beatsPerBar: 4, defaultBpm: 96, defaultKit: 'studio', hint: 'Lush octave-doubled 12-string acoustic strums' },
  { id: 'island', label: 'Island / Slack-Key', group: 'Acoustic', beatsPerBar: 4, defaultBpm: 92, defaultKit: 'perc', hint: 'Breezy Hawaiian / slack-key fingerpicked bounce' },
  { id: 'bossa', label: 'Bossa Nova Nylon', group: 'Acoustic', beatsPerBar: 4, defaultBpm: 112, defaultKit: 'jazz', hint: 'Syncopated classical nylon + rim clave' },
  { id: 'reggae', label: 'Reggae One-Drop Skank', group: 'Reggae & Groove', beatsPerBar: 4, defaultBpm: 82, defaultKit: 'vintage', hint: 'Crisp off-beat 2 & 4 skank + deep dub bass + beat-3 drop' },
  { id: 'funk', label: 'Clean Funk Scratch', group: 'Reggae & Groove', beatsPerBar: 4, defaultBpm: 106, defaultKit: 'studio', hint: 'Tight 16th muted scratches + snappy bass pocket' },
  { id: 'blues', label: '12-Bar Blues Shuffle', group: 'Reggae & Groove', beatsPerBar: 4, defaultBpm: 94, defaultKit: 'vintage', hint: 'Swung triplet shuffle with walking bass' },
  { id: 'rock', label: 'Classic Rock Drive', group: 'Rock & Metal', beatsPerBar: 4, defaultBpm: 118, defaultKit: 'rock', hint: 'Punchy crunch 8ths + big 26" rock drums' },
  { id: 'metal-chug', label: 'Metal Chugs (Heavy)', group: 'Rock & Metal', beatsPerBar: 4, defaultBpm: 132, defaultKit: 'metal', hint: 'Double-tracked palm-muted low power-chord chugs' },
  { id: 'metal-gallop', label: 'Thrash Metal Gallop', group: 'Rock & Metal', beatsPerBar: 4, defaultBpm: 152, defaultKit: 'metal', hint: 'Relentless 8th-16th-16th palm-muted gallop for lead shred' },
  { id: 'djent', label: 'Modern Djent Breakdown', group: 'Rock & Metal', beatsPerBar: 4, defaultBpm: 122, defaultKit: 'metal', hint: 'Syncopated gated chugs + half-time snare crush' },
  { id: 'orchestra', label: 'Orchestral Strings', group: 'Orchestra & Keys', beatsPerBar: 4, defaultBpm: 84, defaultKit: 'off', hint: 'Layered VSCO 2 Cellos + Strings + Violins with voice leading' },
  { id: 'cinematic', label: 'Cinematic Film Swell', group: 'Orchestra & Keys', beatsPerBar: 4, defaultBpm: 76, defaultKit: 'rock', hint: 'Soaring orchestral strings + slow epic percussion pulse' },
  { id: 'rhodes', label: 'Warm Rhodes / Neo-Soul', group: 'Orchestra & Keys', beatsPerBar: 4, defaultBpm: 86, defaultKit: 'lofi', hint: 'Lush electric piano chords + dusty pocket groove' },
  { id: 'organ', label: 'Hammond B3 Organ', group: 'Orchestra & Keys', beatsPerBar: 4, defaultBpm: 92, defaultKit: 'vintage', hint: 'Warm rotary drawbar organ swell for blues, soul & gospel' },
  { id: 'ambient', label: 'Ambient Modal Pad', group: 'Orchestra & Keys', beatsPerBar: 4, defaultBpm: 72, defaultKit: 'off', hint: 'Weightless atmospheric pad for pure scale & melodic exploration' },
]

export const strumStyleMeta = (id: StrumStyleId) => STRUM_STYLES.find(s => s.id === id) ?? STRUM_STYLES[0]

export interface StrumBar {
  /** 1 chord for full bar, or 2 chords for a split bar (beats 1–2 / beats 3–4). */
  chords: string[]
  /** Optional section label shown above this bar, e.g. 'A Part', 'Chorus', 'Bridge'. */
  section?: string
}

export interface StrumChart {
  id: string
  name: string
  tonic: string
  minor: boolean
  capo: number
  bpm: number
  style: StrumStyleId
  bars: StrumBar[]
}

export const BUILTIN_STRUM_CHARTS: StrumChart[] = [
  {
    id: 'bg-g-breakdown', name: 'Bluegrass G–C–D Breakdown', tonic: 'G', minor: false, capo: 0, bpm: 120, style: 'bluegrass',
    bars: [
      { chords: ['G'], section: 'A Part' }, { chords: ['G'] }, { chords: ['C'] }, { chords: ['G'] },
      { chords: ['G'] }, { chords: ['Em'] }, { chords: ['D'] }, { chords: ['D'] },
      { chords: ['G'], section: 'B Part' }, { chords: ['C'] }, { chords: ['G', 'D'] }, { chords: ['G'] },
    ],
  },
  {
    id: 'reggae-onedrop-am', name: 'Reggae One-Drop Skank', tonic: 'A', minor: true, capo: 0, bpm: 80, style: 'reggae',
    bars: [
      { chords: ['Am'], section: 'Groove' }, { chords: ['Am'] }, { chords: ['Dm'] }, { chords: ['Em'] },
      { chords: ['F'] }, { chords: ['G'] }, { chords: ['Am'] }, { chords: ['Em'] },
    ],
  },
  {
    id: 'metal-chug-em', name: 'Heavy Metal Chug Jam', tonic: 'E', minor: true, capo: 0, bpm: 132, style: 'metal-chug',
    bars: [
      { chords: ['E5'], section: 'Riff A' }, { chords: ['E5'] }, { chords: ['C5'] }, { chords: ['D5'] },
      { chords: ['E5'] }, { chords: ['G5'] }, { chords: ['C5', 'B5'] }, { chords: ['E5'] },
    ],
  },
  {
    id: 'metal-gallop-dm', name: 'Thrash Metal Gallop (Lead Shed)', tonic: 'D', minor: true, capo: 0, bpm: 152, style: 'metal-gallop',
    bars: [
      { chords: ['D5'], section: 'Gallop' }, { chords: ['D5'] }, { chords: ['Bb5'] }, { chords: ['C5'] },
      { chords: ['D5'] }, { chords: ['F5'] }, { chords: ['Bb5', 'A5'] }, { chords: ['D5'] },
    ],
  },
  {
    id: 'djent-breakdown-dm', name: 'Modern Djent Syncopated', tonic: 'D', minor: true, capo: 0, bpm: 122, style: 'djent',
    bars: [
      { chords: ['D5'], section: 'Breakdown' }, { chords: ['D5'] }, { chords: ['Eb5'] }, { chords: ['C5'] },
      { chords: ['Bb5'] }, { chords: ['A5'] }, { chords: ['D5'] }, { chords: ['D5'] },
    ],
  },
  {
    id: 'orch-neoclassical-am', name: 'Orchestral Neoclassical Lead (Am)', tonic: 'A', minor: true, capo: 0, bpm: 86, style: 'orchestra',
    bars: [
      { chords: ['Am'], section: 'Theme' }, { chords: ['F'] }, { chords: ['Dm'] }, { chords: ['E7'] },
      { chords: ['Am'] }, { chords: ['G'] }, { chords: ['F'] }, { chords: ['E7'] },
    ],
  },
  {
    id: 'cinematic-epic-cm', name: 'Cinematic Film Strings (Cm)', tonic: 'C', minor: true, capo: 0, bpm: 78, style: 'cinematic',
    bars: [
      { chords: ['Cm'], section: 'Swell' }, { chords: ['Ab'] }, { chords: ['Eb'] }, { chords: ['Bb'] },
      { chords: ['Fm'] }, { chords: ['Cm'] }, { chords: ['Ab', 'G7'] }, { chords: ['Cm'] },
    ],
  },
  {
    id: 'folk-campfire-c', name: 'Folk Campfire (C–G–Am–F)', tonic: 'C', minor: false, capo: 0, bpm: 98, style: 'folk',
    bars: [
      { chords: ['C'], section: 'Verse' }, { chords: ['G'] }, { chords: ['Am'] }, { chords: ['F'] },
      { chords: ['C'] }, { chords: ['G'] }, { chords: ['F', 'Fm'] }, { chords: ['C'] },
    ],
  },
  {
    id: 'twelve-string-d', name: '12-String Shimmer Ballad', tonic: 'D', minor: false, capo: 0, bpm: 94, style: 'twelve',
    bars: [
      { chords: ['D'], section: 'Main' }, { chords: ['A'] }, { chords: ['Bm'] }, { chords: ['G'] },
      { chords: ['D'] }, { chords: ['G'] }, { chords: ['A'] }, { chords: ['D'] },
    ],
  },
  {
    id: 'waltz-g', name: '3/4 Country Acoustic Waltz', tonic: 'G', minor: false, capo: 0, bpm: 108, style: 'waltz',
    bars: [
      { chords: ['G'], section: 'Waltz' }, { chords: ['G'] }, { chords: ['C'] }, { chords: ['C'] },
      { chords: ['D7'] }, { chords: ['D7'] }, { chords: ['G'] }, { chords: ['G'] },
    ],
  },
  {
    id: 'rhodes-neosoul-eb', name: 'Neo-Soul Rhodes ii–V–I', tonic: 'C', minor: false, capo: 0, bpm: 84, style: 'rhodes',
    bars: [
      { chords: ['Dm7'], section: 'Pocket' }, { chords: ['G7'] }, { chords: ['Cmaj7'] }, { chords: ['A7'] },
      { chords: ['Dm7'] }, { chords: ['Fm'] }, { chords: ['Cmaj7'] }, { chords: ['G7'] },
    ],
  },
  {
    id: 'organ-blues-a', name: '12-Bar Blues (Organ & Band)', tonic: 'A', minor: false, capo: 0, bpm: 94, style: 'blues',
    bars: [
      { chords: ['A7'], section: '12-Bar' }, { chords: ['D7'] }, { chords: ['A7'] }, { chords: ['A7'] },
      { chords: ['D7'] }, { chords: ['D7'] }, { chords: ['A7'] }, { chords: ['A7'] },
      { chords: ['E7'] }, { chords: ['D7'] }, { chords: ['A7'] }, { chords: ['E7'] },
    ],
  },
  {
    id: 'funk-vamp-em', name: 'Clean Funk Pocket (Em7–A7)', tonic: 'E', minor: true, capo: 0, bpm: 106, style: 'funk',
    bars: [
      { chords: ['Em7'], section: 'Vamp' }, { chords: ['A7'] }, { chords: ['Em7'] }, { chords: ['A7'] },
      { chords: ['C7'] }, { chords: ['B7'] }, { chords: ['Em7'] }, { chords: ['Em7', 'B7'] },
    ],
  },
  {
    id: 'island-slackkey-c', name: 'Island Slack-Key Groove', tonic: 'C', minor: false, capo: 0, bpm: 92, style: 'island',
    bars: [
      { chords: ['C'], section: 'Aloha' }, { chords: ['C7'] }, { chords: ['F'] }, { chords: ['G7'] },
      { chords: ['C'] }, { chords: ['Am'] }, { chords: ['Dm7', 'G7'] }, { chords: ['C'] },
    ],
  },
  {
    id: 'bossa-nylon-dm', name: 'Bossa Nova Nylon Jazz', tonic: 'D', minor: true, capo: 0, bpm: 112, style: 'bossa',
    bars: [
      { chords: ['Dm7'], section: 'Bossa' }, { chords: ['Dm7'] }, { chords: ['Gm7'] }, { chords: ['A7'] },
      { chords: ['Bb'] }, { chords: ['A7'] }, { chords: ['Dm7'] }, { chords: ['A7'] },
    ],
  },
  {
    id: 'ambient-dorian-d', name: 'Ambient Dorian Solo Wash', tonic: 'D', minor: true, capo: 0, bpm: 74, style: 'ambient',
    bars: [
      { chords: ['Dm7'], section: 'Float' }, { chords: ['Dm7'] }, { chords: ['G'] }, { chords: ['G'] },
      { chords: ['C'] }, { chords: ['G'] }, { chords: ['Dm7'] }, { chords: ['Dm7'] },
    ],
  },
]

const USER_CHARTS_KEY = 'kg:strumUserCharts'
export function loadUserStrumCharts(): StrumChart[] {
  try {
    const v = JSON.parse(localStorage.getItem(USER_CHARTS_KEY) ?? '[]')
    return Array.isArray(v) ? v as StrumChart[] : []
  } catch { return [] }
}
export function saveUserStrumChart(chart: StrumChart): StrumChart[] {
  const prev = loadUserStrumCharts().filter(c => c.id !== chart.id)
  const next = [chart, ...prev].slice(0, 40)
  try { localStorage.setItem(USER_CHARTS_KEY, JSON.stringify(next)) } catch { /* private */ }
  return next
}
export function deleteUserStrumChart(id: string): StrumChart[] {
  const next = loadUserStrumCharts().filter(c => c.id !== id)
  try { localStorage.setItem(USER_CHARTS_KEY, JSON.stringify(next)) } catch { /* private */ }
  return next
}

/** Transpose a single chord symbol by `semi` semitones. */
export function transposeChordSymbol(symbol: string, semi: number, flats = false): string {
  const m = symbol.trim().match(/^([A-G][#b]?)(.*)$/)
  if (!m) return symbol
  const r = ((pc(m[1]) + semi) % 12 + 12) % 12
  return (flats ? FLATS : SHARPS)[r] + m[2]
}

/** Transpose an entire StrumChart to a new tonic while keeping chord qualities intact. */
export function transposeStrumChart(chart: StrumChart, newTonic: string): StrumChart {
  const semi = (pc(newTonic) - pc(chart.tonic) + 12) % 12
  if (semi === 0 && newTonic === chart.tonic) return chart
  const flats = keyPrefersFlats(newTonic, chart.minor)
  return {
    ...chart,
    tonic: newTonic,
    bars: chart.bars.map(b => ({
      ...b,
      chords: b.chords.map(c => transposeChordSymbol(c, semi, flats)),
    })),
  }
}

/** Build a ready-to-play StrumChart tailored to a scale (for ScalesScreen → Strum Grid launcher). */
export function chartForScale(root: string, scaleId: string, style: StrumStyleId): StrumChart {
  const s = scaleId.toLowerCase()
  const minor = /minor|dorian|phrygian|aeolian|locrian|blues/.test(s) && !/major/.test(s)
  const flats = keyPrefersFlats(root, minor)
  const t = pc(root)
  const ch = (semi: number, q: ChordQual) => formatChordSymbol((t + semi) % 12, q, flats)
  let bars: StrumBar[]
  if (style === 'metal-chug' || style === 'metal-gallop' || style === 'djent') {
    bars = /phrygian/.test(s)
      ? [{ chords: [ch(0, '5')], section: 'Phrygian' }, { chords: [ch(0, '5')] }, { chords: [ch(1, '5')] }, { chords: [ch(10, '5')] }]
      : [{ chords: [ch(0, '5')], section: 'Metal' }, { chords: [ch(0, '5')] }, { chords: [ch(8, '5')] }, { chords: [ch(10, '5')] }]
  } else if (/harmonic minor/.test(s)) {
    bars = [
      { chords: [ch(0, 'm')], section: 'Harmonic' }, { chords: [ch(8, '')] }, { chords: [ch(5, 'm')] }, { chords: [ch(7, '7')] },
    ]
  } else if (/dorian/.test(s)) {
    bars = [
      { chords: [ch(0, 'm7')], section: 'Dorian' }, { chords: [ch(0, 'm7')] }, { chords: [ch(5, '')] }, { chords: [ch(5, '')] },
    ]
  } else if (/mixolydian/.test(s)) {
    bars = [
      { chords: [ch(0, '')], section: 'Mixolydian' }, { chords: [ch(10, '')] }, { chords: [ch(5, '')] }, { chords: [ch(0, '')] },
    ]
  } else if (/lydian/.test(s)) {
    bars = [
      { chords: [ch(0, 'maj7')], section: 'Lydian' }, { chords: [ch(0, 'maj7')] }, { chords: [ch(2, '')] }, { chords: [ch(2, '')] },
    ]
  } else if (minor) {
    bars = [
      { chords: [ch(0, 'm')], section: 'Groove' }, { chords: [ch(8, '')] }, { chords: [ch(3, '')] }, { chords: [ch(10, '')] },
    ]
  } else {
    bars = [
      { chords: [ch(0, '')], section: 'Groove' }, { chords: [ch(7, '')] }, { chords: [ch(9, 'm')] }, { chords: [ch(5, '')] },
    ]
  }
  const meta = strumStyleMeta(style)
  return {
    id: `scale-${root}-${scaleId}-${style}`,
    name: `${root} ${scaleId} (${meta.label})`,
    tonic: root,
    minor,
    capo: 0,
    bpm: meta.defaultBpm,
    style,
    bars,
  }
}
