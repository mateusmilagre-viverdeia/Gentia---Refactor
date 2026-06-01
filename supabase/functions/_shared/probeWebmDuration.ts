/**
 * Pure TypeScript WebM duration probe — no ffmpeg, no dependencies.
 *
 * Parses the EBML (WebM) container looking for the Segment > Info > Duration
 * element and combines it with TimecodeScale to return the audio duration
 * in seconds.
 *
 * Returns null if the file is not WebM, is corrupt, or duration cannot be
 * extracted. Caller is expected to fall back gracefully (e.g. to
 * last_activity_at − started_at).
 *
 * Reference: https://www.matroska.org/technical/elements.html
 */

const ID_SEGMENT = 0x18538067;
const ID_INFO = 0x1549a966;
const ID_TIMECODE_SCALE = 0x2ad7b1;
const ID_DURATION = 0x4489;
// Generic skip helpers
const ID_SEEK_HEAD = 0x114d9b74;
const ID_CLUSTER = 0x1f43b675;
const ID_TRACKS = 0x1654ae6b;
const ID_CUES = 0x1c53bb6b;
const ID_VOID = 0xec;
const ID_CRC32 = 0xbf;

interface ParseState {
  bytes: Uint8Array;
  pos: number;
}

function readVintLength(byte: number): number {
  // Number of leading zero bits + 1 = length in bytes
  for (let i = 0; i < 8; i++) {
    if ((byte & (0x80 >> i)) !== 0) return i + 1;
  }
  return 8;
}

/** Read a variable-length integer (EBML "VINT"). Used for both IDs and sizes. */
function readVint(s: ParseState, keepMarker: boolean): number | null {
  if (s.pos >= s.bytes.length) return null;
  const first = s.bytes[s.pos];
  const len = readVintLength(first);
  if (len === 0 || s.pos + len > s.bytes.length) return null;

  let value = keepMarker ? first : first & ((1 << (8 - len)) - 1);
  for (let i = 1; i < len; i++) {
    value = value * 256 + s.bytes[s.pos + i];
  }
  s.pos += len;
  return value;
}

function readId(s: ParseState): number | null {
  return readVint(s, true);
}

function readSize(s: ParseState): number | null {
  return readVint(s, false);
}

function readFloat(s: ParseState, size: number): number | null {
  if (s.pos + size > s.bytes.length) return null;
  const view = new DataView(s.bytes.buffer, s.bytes.byteOffset + s.pos, size);
  let value: number | null = null;
  if (size === 4) value = view.getFloat32(0, false);
  else if (size === 8) value = view.getFloat64(0, false);
  s.pos += size;
  return value;
}

function readUint(s: ParseState, size: number): number | null {
  if (size === 0 || size > 8 || s.pos + size > s.bytes.length) return null;
  let value = 0;
  for (let i = 0; i < size; i++) {
    value = value * 256 + s.bytes[s.pos + i];
  }
  s.pos += size;
  return value;
}

/**
 * Walks Info element children to extract TimecodeScale (ns per tick, default 1_000_000)
 * and Duration (in ticks, float).
 */
function parseInfo(bytes: Uint8Array): { timecodeScale: number; duration: number | null } {
  const s: ParseState = { bytes, pos: 0 };
  let timecodeScale = 1_000_000;
  let duration: number | null = null;

  while (s.pos < s.bytes.length) {
    const id = readId(s);
    const size = readSize(s);
    if (id == null || size == null) break;
    if (s.pos + size > s.bytes.length) break;

    if (id === ID_TIMECODE_SCALE) {
      const v = readUint(s, size);
      if (v != null && v > 0) timecodeScale = v;
    } else if (id === ID_DURATION) {
      duration = readFloat(s, size);
    } else {
      s.pos += size;
    }
  }
  return { timecodeScale, duration };
}

/**
 * Probe a WebM audio buffer and return its duration in seconds.
 * Returns null on any failure.
 */
export function probeWebmDuration(bytes: Uint8Array): number | null {
  try {
    const s: ParseState = { bytes, pos: 0 };

    // Skip top-level EBML header (we don't need DocType)
    const ebmlId = readId(s);
    if (ebmlId !== 0x1a45dfa3) return null; // not EBML/WebM
    const ebmlSize = readSize(s);
    if (ebmlSize == null) return null;
    s.pos += ebmlSize;

    // Now expect Segment
    const segId = readId(s);
    if (segId !== ID_SEGMENT) return null;
    const segSize = readSize(s);
    if (segSize == null) return null;

    // Some encoders write unknown size (all 1s) — in that case, scan to end.
    const segEnd = segSize > bytes.length || segSize < 0
      ? bytes.length
      : Math.min(s.pos + segSize, bytes.length);

    while (s.pos < segEnd) {
      const id = readId(s);
      const size = readSize(s);
      if (id == null || size == null) break;
      if (size > segEnd - s.pos) break;

      if (id === ID_INFO) {
        const info = parseInfo(bytes.subarray(s.pos, s.pos + size));
        if (info.duration != null && Number.isFinite(info.duration)) {
          const seconds = (info.duration * info.timecodeScale) / 1_000_000_000;
          if (seconds > 0 && seconds < 24 * 60 * 60) {
            return Math.round(seconds);
          }
        }
        s.pos += size;
      } else if (
        id === ID_SEEK_HEAD ||
        id === ID_TRACKS ||
        id === ID_CUES ||
        id === ID_VOID ||
        id === ID_CRC32 ||
        id === ID_CLUSTER
      ) {
        s.pos += size;
      } else {
        s.pos += size;
      }
    }
    return null;
  } catch (err) {
    console.warn("[probeWebmDuration] failed:", err);
    return null;
  }
}
