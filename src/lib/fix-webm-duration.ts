/**
 * Chrome's `MediaRecorder` writes WebM as an unbounded, unseekable stream —
 * it never patches a `Duration` back into the Segment `Info` element,
 * because doing so would require seeking backward in output it's already
 * flushed. The result: every `.webm` this app downloads is technically
 * valid (VLC/Chrome play it fine by reading Cluster-by-Cluster) but reports
 * no duration and no seek bar in stricter players.
 *
 * This patches a real `Duration` into the container after recording stops,
 * using the app's own precise (paused-time-excluded) elapsed-ms tracking
 * rather than re-deriving it from Cluster timecodes. It only ever rewrites
 * bytes inside the small Info block near the very start of the file — the
 * actual video/audio Clusters are never touched, copied byte-for-byte via
 * `Blob.slice()`. If the file's structure doesn't match what Chrome
 * actually produces, this returns the original blob unchanged rather than
 * risk corrupting the recording.
 */

const ID_SEGMENT = 0x18538067;
const ID_INFO = 0x1549a966;
const ID_TIMECODE_SCALE = 0x2ad7b1;
const ID_DURATION = 0x4489;

const DEFAULT_TIMECODE_SCALE_NS = 1_000_000; // 1ms — what Chrome always writes, used only as a fallback

// Chrome's Info block sits in the first few hundred bytes, well before any
// Cluster (the actual frame data) — we never need to read past it.
const HEADER_SCAN_BYTES = 4096;

interface EbmlId {
  id: number;
  length: number;
}

interface EbmlSize {
  value: number;
  length: number;
  isUnknown: boolean;
}

function vintLength(firstByte: number): number {
  for (let length = 1; length <= 8; length++) {
    if (firstByte & (0x80 >> (length - 1))) return length;
  }
  return 8;
}

function readId(view: DataView, offset: number): EbmlId {
  const first = view.getUint8(offset);
  const length = vintLength(first);
  let id = 0;
  for (let i = 0; i < length; i++) id = id * 256 + view.getUint8(offset + i);
  return { id, length };
}

function readSize(view: DataView, offset: number): EbmlSize {
  const first = view.getUint8(offset);
  const length = vintLength(first);
  const maxFirstByteValue = (1 << (8 - length)) - 1;
  let value = first & maxFirstByteValue;
  let isUnknown = value === maxFirstByteValue;
  for (let i = 1; i < length; i++) {
    const byte = view.getUint8(offset + i);
    value = value * 256 + byte;
    if (byte !== 0xff) isUnknown = false;
  }
  return { value, length, isUnknown };
}

function encodeEbmlSize(value: number): Uint8Array<ArrayBuffer> {
  // Info blocks are always tiny in practice (well under a few hundred
  // bytes) — these two widths comfortably cover every real case. Built via
  // `new Uint8Array(n)` + index assignment rather than `Uint8Array.of(...)`,
  // which types its buffer as the wider `ArrayBufferLike` and doesn't
  // satisfy `BlobPart`.
  if (value < 0x80) {
    const bytes = new Uint8Array(1);
    bytes[0] = 0x80 | value;
    return bytes;
  }
  if (value < 0x4000) {
    const bytes = new Uint8Array(2);
    bytes[0] = 0x40 | (value >> 8);
    bytes[1] = value & 0xff;
    return bytes;
  }
  const bytes = new Uint8Array(3);
  bytes[0] = 0x20 | (value >> 16);
  bytes[1] = (value >> 8) & 0xff;
  bytes[2] = value & 0xff;
  return bytes;
}

export async function fixWebmDuration(blob: Blob, durationMs: number): Promise<Blob> {
  if (!(durationMs > 0)) return blob;

  try {
    const headBuf = await blob.slice(0, HEADER_SCAN_BYTES).arrayBuffer();
    const view = new DataView(headBuf);

    // EBML header — skip over without inspecting.
    const ebmlId = readId(view, 0);
    const ebmlSize = readSize(view, ebmlId.length);
    let offset = ebmlId.length + ebmlSize.length + ebmlSize.value;

    // Segment.
    const segId = readId(view, offset);
    if (segId.id !== ID_SEGMENT) return blob;
    offset += segId.length;
    const segSize = readSize(view, offset);
    offset += segSize.length;

    // Walk Segment's direct children looking for Info. Bail out (never
    // guess) if we hit an unknown-size sibling before finding it, or run
    // past our scan window.
    let infoStart = -1;
    let infoHeaderLength = 0;
    let infoContentLength = 0;
    let cursor = offset;

    while (cursor < headBuf.byteLength - 4) {
      const childId = readId(view, cursor);
      const idEnd = cursor + childId.length;
      const childSize = readSize(view, idEnd);
      const contentStart = idEnd + childSize.length;

      if (childId.id === ID_INFO) {
        infoStart = cursor;
        infoHeaderLength = contentStart - cursor;
        infoContentLength = childSize.value;
        break;
      }
      if (childSize.isUnknown) break;
      cursor = contentStart + childSize.value;
    }

    if (infoStart === -1) return blob;

    const infoContentStart = infoStart + infoHeaderLength;
    const infoContentEnd = infoContentStart + infoContentLength;

    // Look for an existing TimecodeScale/Duration inside Info.
    let timecodeScaleNs = DEFAULT_TIMECODE_SCALE_NS;
    let durationFieldStart = -1;
    let durationFieldByteLength = 0;
    let icursor = infoContentStart;

    while (icursor < infoContentEnd) {
      const cid = readId(view, icursor);
      const cIdEnd = icursor + cid.length;
      const csize = readSize(view, cIdEnd);
      const cContentStart = cIdEnd + csize.length;

      if (cid.id === ID_TIMECODE_SCALE) {
        let v = 0;
        for (let i = 0; i < csize.value; i++) v = v * 256 + view.getUint8(cContentStart + i);
        timecodeScaleNs = v;
      } else if (cid.id === ID_DURATION) {
        durationFieldStart = cContentStart;
        durationFieldByteLength = csize.value;
      }
      icursor = cContentStart + csize.value;
    }

    // Duration's value is expressed in TimecodeScale units.
    const durationValue = (durationMs * 1_000_000) / timecodeScaleNs;

    if (durationFieldStart !== -1) {
      // Already has a Duration field (some Chrome versions write a
      // placeholder) — overwrite its value in place, no size change needed.
      const patched = new Uint8Array(headBuf.slice(0, headBuf.byteLength));
      const patchedView = new DataView(patched.buffer);
      if (durationFieldByteLength === 4) {
        patchedView.setFloat32(durationFieldStart, durationValue, false);
      } else if (durationFieldByteLength === 8) {
        patchedView.setFloat64(durationFieldStart, durationValue, false);
      } else {
        return blob; // unexpected width — don't guess
      }
      return new Blob([patched, blob.slice(headBuf.byteLength)], { type: blob.type });
    }

    // No Duration element — insert one (ID 0x4489, 8-byte float64) at the
    // end of Info's content, then grow Info's own size field to match.
    const durationElement = new Uint8Array(11);
    const durationView = new DataView(durationElement.buffer);
    durationView.setUint16(0, ID_DURATION, false);
    durationView.setUint8(2, 0x88); // 1-byte size field, value = 8
    durationView.setFloat64(3, durationValue, false);

    const newInfoSize = encodeEbmlSize(infoContentLength + durationElement.length);
    const infoIdLength = readId(view, infoStart).length;
    const before = headBuf.slice(0, infoStart + infoIdLength);
    const infoContent = headBuf.slice(infoContentStart, infoContentEnd);
    const rest = blob.slice(infoContentEnd); // everything after Info, including all Clusters — untouched

    return new Blob([before, newInfoSize, infoContent, durationElement, rest], { type: blob.type });
  } catch {
    // Any parsing surprise: never risk corrupting the recording.
    return blob;
  }
}
