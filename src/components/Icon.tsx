// One icon set for the whole app (Lucide line icons, ISC licence): the same weight and size everywhere, the same
// on every phone, instead of emoji that each phone draws its own way. <Ico n="mic" /> sits in a line of text.
import {
  BookOpen, Camera, Dices, Drum, Eye, FileText, Flame, Flower2, Footprints, Guitar, Hand, Headphones, Image, Mic, Music, Pause, Play,
  RotateCcw, SkipBack, SlidersHorizontal, Snowflake, Sparkles, Speech, Square, Star, TreePalm, Volume2, Circle, Repeat, PartyPopper, GripVertical,
  Trophy, Crown, Timer, Gem, Sparkle, Target, Disc3, Brain, Zap, Ear, Puzzle, MapPin, CalendarCheck, CircleCheck, CircleArrowUp, CircleArrowDown,
  Minus, Plus, Trash2, ScanLine, Gamepad2, Film, Upload, ScreenShare, Shuffle, Layers, Undo2, Redo2, Scissors, Save, ChevronDown, Waves, Maximize, X,
  type LucideIcon,
} from 'lucide-react'

const ICONS = {
  mic: Mic, guitar: Guitar, sparkles: Sparkles, flame: Flame, freeze: Snowflake, dice: Dices, book: BookOpen, flower: Flower2, palm: TreePalm,
  record: Circle, stop: Square, pause: Pause, play: Play, back: SkipBack, sound: Volume2, eye: Eye, camera: Camera, party: PartyPopper,
  hand: Hand, headphones: Headphones, sliders: SlidersHorizontal, foot: Footprints, file: FileText, image: Image, talk: Speech, drum: Drum,
  loop: Repeat, again: RotateCcw, star: Star, grip: GripVertical, music: Music,
  trophy: Trophy, crown: Crown, timer: Timer, gem: Gem, sparkle: Sparkle, target: Target, disc: Disc3, brain: Brain, zap: Zap, ear: Ear,
  puzzle: Puzzle, pin: MapPin, calendar: CalendarCheck, check: CircleCheck, up: CircleArrowUp,
  minus: Minus, plus: Plus, trash: Trash2, scan: ScanLine, game: Gamepad2, film: Film, upload: Upload, screen: ScreenShare, shuffle: Shuffle, layers: Layers,
  down: CircleArrowDown, undo: Undo2, redo: Redo2, scissors: Scissors, save: Save, more: ChevronDown, waves: Waves, expand: Maximize, x: X,
} satisfies Record<string, LucideIcon>
export type IconName = keyof typeof ICONS

/** A line icon sized to the text around it. `fill` fills it (record dot, stop square, play triangle, a star that's on). */
export function Ico({ n, className = '', fill = false, label }: { n: IconName; className?: string; fill?: boolean; label?: string }) {
  const C = ICONS[n]
  return <C className={`ico ico-${n} ${className}`} width="1.1em" height="1.1em" strokeWidth={2.1} fill={fill ? 'currentColor' : 'none'}
    aria-hidden={label ? undefined : true} aria-label={label} role={label ? 'img' : undefined} />
}

/** The instrument's picture: guitar, tenor ukulele (flower), baritone (palm). */
export const instIcon = (id: string): IconName => (id === 'guitar' ? 'guitar' : id === 'tenor' ? 'flower' : 'palm')

/** Badges and celebrations keep their emoji in the data; on screen they're drawn as the matching icon. */
const FROM_EMOJI: Record<string, IconName> = {
  '🎸': 'guitar', '🔥': 'flame', '🏆': 'trophy', '👑': 'crown', '⏱️': 'timer', '⏱': 'timer', '💎': 'gem', '🌟': 'sparkle', '🎯': 'target',
  '🎵': 'music', '📀': 'disc', '🔁': 'loop', '🧠': 'brain', '⚡': 'zap', '👂': 'ear', '📖': 'book', '⭐': 'star', '🧩': 'puzzle', '🚒': 'pin',
  '📅': 'calendar', '🌺': 'flower', '✅': 'check', '⬆️': 'up', '🧊': 'freeze', '🎉': 'party', '🎤': 'mic', '✨': 'sparkles',
}
export function Glyph({ e, className = '' }: { e: string; className?: string }) {
  const n = FROM_EMOJI[e]
  return n ? <Ico n={n} className={className} /> : <span className={className}>{e}</span>
}
