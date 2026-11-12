// A sound pack as ONE file (.kgpack = a plain "stored" zip: pack.json + its recordings, no compression since the audio
// is already Opus). Phones can't pick a whole folder in the file picker, so tools/harvest/export_pack.py writes this and
// the owner brings it in with one tap. Read without loading the whole file: the zip's central directory says where each
// recording sits, and each one is cut out of the file as a Blob slice.

export interface ZipEntry { name: string; offset: number; size: number; method: number }

const u16 = (d: DataView, o: number) => d.getUint16(o, true)
const u32 = (d: DataView, o: number) => d.getUint32(o, true)

/** The entries of a zip file (stored or deflated; KGuitar packs are stored). */
export async function zipEntries(file: Blob): Promise<ZipEntry[]> {
  const tailLen = Math.min(file.size, 65557)
  const tail = new DataView(await file.slice(file.size - tailLen).arrayBuffer())
  let eocd = -1
  for (let i = tailLen - 22; i >= 0; i--) if (u32(tail, i) === 0x06054b50) { eocd = i; break }
  if (eocd < 0) throw new Error('Not a .kgpack file (no zip directory found)')
  let count = u16(tail, eocd + 10)
  let cdSize = u32(tail, eocd + 12)
  let cdOff = u32(tail, eocd + 16)
  // zip64 (packs over 4 GB or 65 535 files): the zip64 end record just before
  if (cdOff === 0xffffffff || count === 0xffff) {
    const loc = eocd - 20
    if (loc >= 0 && u32(tail, loc) === 0x07064b50) {
      const z64 = Number(tail.getBigUint64(loc + 8, true))
      const rec = new DataView(await file.slice(z64, z64 + 56).arrayBuffer())
      count = Number(rec.getBigUint64(32, true))
      cdSize = Number(rec.getBigUint64(40, true))
      cdOff = Number(rec.getBigUint64(48, true))
    }
  }
  const cd = new DataView(await file.slice(cdOff, cdOff + cdSize).arrayBuffer())
  const dec = new TextDecoder()
  const out: ZipEntry[] = []
  let p = 0
  for (let k = 0; k < count && p + 46 <= cd.byteLength; k++) {
    if (u32(cd, p) !== 0x02014b50) break
    const method = u16(cd, p + 10)
    let size = u32(cd, p + 20)
    const nameLen = u16(cd, p + 28), extraLen = u16(cd, p + 30), commentLen = u16(cd, p + 32)
    let local = u32(cd, p + 42)
    const name = dec.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLen))
    // zip64 sizes / offsets live in the extra field
    if (size === 0xffffffff || local === 0xffffffff) {
      let e = p + 46 + nameLen
      const end = e + extraLen
      while (e + 4 <= end) {
        const id = u16(cd, e), len = u16(cd, e + 2)
        if (id === 0x0001) {
          let q = e + 4
          if (u32(cd, p + 24) === 0xffffffff) q += 8
          if (size === 0xffffffff) { size = Number(cd.getBigUint64(q, true)); q += 8 }
          if (local === 0xffffffff) local = Number(cd.getBigUint64(q, true))
        }
        e += 4 + len
      }
    }
    out.push({ name, offset: local, size, method })
    p += 46 + nameLen + extraLen + commentLen
  }
  // where each entry's data starts: after its local header (its own name / extra lengths can differ from the directory)
  await Promise.all(out.map(async e => {
    const h = new DataView(await file.slice(e.offset, e.offset + 30).arrayBuffer())
    if (u32(h, 0) !== 0x04034b50) throw new Error(`Damaged .kgpack (${e.name})`)
    e.offset = e.offset + 30 + u16(h, 26) + u16(h, 28)
  }))
  return out
}

/** One entry's bytes as a Blob (stored entries only: what export_pack.py writes). */
export function entryBlob(file: Blob, e: ZipEntry): Blob {
  if (e.method !== 0) throw new Error(`${e.name} is compressed: make the pack with tools/harvest/export_pack.py`)
  return file.slice(e.offset, e.offset + e.size)
}
