import { Buffer } from "node:buffer";
import {
  OGG_CAPTURE_PATTERN,
  OGG_CAPTURE_PATTERN_SIZE,
  OGG_PAGE_HEADER_FIXED_SIZE,
} from "../constants.js";
import type { OggPage } from "../types.js";

/**
 * Lazily iterate over every Ogg page contained in `buffer`.
 *
 * Each yielded page exposes the raw header fields plus zero-copy `payload`
 * bytes. Iteration stops cleanly when no more `"OggS"` capture pattern is
 * found at the current offset (e.g. the buffer ends with a partial page or
 * trailing garbage); it throws `RangeError` only when a page header claims
 * more bytes than the buffer can supply.
 *
 * @param buffer - Whole-file (or partial) Ogg bytes.
 * @returns An iterable that yields {@link OggPage} records in source order.
 * @throws RangeError when a page extends past the end of `buffer`.
 */
export const parseOggPages = (buffer: Uint8Array): Iterable<OggPage> => ({
  [Symbol.iterator]: () => createPageIterator(buffer),
});

/**
 * Build the underlying iterator for {@link parseOggPages}.
 *
 * Kept separate so the public function can stay an expression-body arrow.
 *
 * @param buffer - Bytes the iterator walks across.
 * @returns A standard `Iterator<OggPage>`.
 */
const createPageIterator = (buffer: Uint8Array): Iterator<OggPage> => {
  const view = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let pos = 0;

  return {
    next: (): IteratorResult<OggPage> => {
      if (pos + OGG_PAGE_HEADER_FIXED_SIZE > buffer.length) {
        return { value: undefined, done: true };
      }

      if (!hasCapturePattern(buffer, pos)) {
        return { value: undefined, done: true };
      }

      const page = readPage({ buffer, view, pageStart: pos });
      pos = page.pageStart + page.pageSize;
      return { value: page, done: false };
    },
  };
};

/**
 * Test whether the four bytes starting at `offset` match `"OggS"`.
 *
 * @param buffer - Source buffer.
 * @param offset - Position to inspect.
 * @returns `true` when the capture pattern is present.
 */
const hasCapturePattern = (buffer: Uint8Array, offset: number): boolean => {
  if (offset + OGG_CAPTURE_PATTERN_SIZE > buffer.length) {
    return false;
  }

  return (
    buffer[offset] === OGG_CAPTURE_PATTERN[0] &&
    buffer[offset + 1] === OGG_CAPTURE_PATTERN[1] &&
    buffer[offset + 2] === OGG_CAPTURE_PATTERN[2] &&
    buffer[offset + 3] === OGG_CAPTURE_PATTERN[3]
  );
};

/** Arguments for {@link readPage}. */
type Args = {
  /** Source bytes (used for the zero-copy payload view). */
  buffer: Uint8Array;
  /** Pre-built `Buffer` over the same memory for fast multi-byte reads. */
  view: Buffer;
  /** Absolute offset where the page header begins. */
  pageStart: number;
};

/**
 * Decode a single Ogg page starting at `pageStart`.
 *
 * @returns The decoded {@link OggPage}.
 * @throws RangeError when the segment table or payload extends past the buffer.
 */
const readPage = ({ buffer, view, pageStart }: Args): OggPage => {
  const version = view.readUInt8(pageStart + 4);
  const headerType = view.readUInt8(pageStart + 5);
  const granulePosition = view.readBigUInt64LE(pageStart + 6);
  const serialNumber = view.readUInt32LE(pageStart + 14);
  const pageSequence = view.readUInt32LE(pageStart + 18);
  const crcChecksum = view.readUInt32LE(pageStart + 22);
  const segmentCount = view.readUInt8(pageStart + 26);

  const segmentTableStart = pageStart + OGG_PAGE_HEADER_FIXED_SIZE;
  const segmentTableEnd = segmentTableStart + segmentCount;
  if (segmentTableEnd > buffer.length) {
    throw new RangeError(`parseOggPages: segment table at ${pageStart} extends past buffer`);
  }

  const segmentSizes: number[] = new Array(segmentCount);
  let payloadSize = 0;
  for (let i = 0; i < segmentCount; i++) {
    const size = view.readUInt8(segmentTableStart + i);
    segmentSizes[i] = size;
    payloadSize += size;
  }

  const payloadStart = segmentTableEnd;
  const payloadEnd = payloadStart + payloadSize;
  if (payloadEnd > buffer.length) {
    throw new RangeError(`parseOggPages: payload at ${pageStart} extends past buffer`);
  }

  return {
    version,
    headerType,
    granulePosition,
    serialNumber,
    pageSequence,
    crcChecksum,
    segmentSizes,
    payload: buffer.subarray(payloadStart, payloadEnd),
    pageStart,
    pageSize: payloadEnd - pageStart,
  };
};
