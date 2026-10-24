// Opening a songbook part: made fresh from the songbook, keeping what you added to your saved copy.
import type { Instrument } from '../instrument'
import { refreshBuiltIn, type SongDoc } from './library'
import { songbookDoc } from './songbook'

export async function loadSongbookDoc(song: string, part: string, inst: Instrument): Promise<SongDoc | null> {
  const fresh = songbookDoc(song, part, inst)
  return fresh ? refreshBuiltIn(fresh) : null
}
