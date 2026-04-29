import { Buffer } from "node:buffer";
import { decodeText, type TextEncoding } from "../utils/encoding.js";
import { decodeSyncSafeInt32 } from "../utils/syncSafeInt.js";

/**
 * Read-only cursor over a `Uint8Array` that tracks the current position.
 *
 * All `readXxx` methods advance the cursor by the size they consumed; `peek` /
 * `seek` / `skip` reposition the cursor without reading. Errors thrown are
 * `RangeError`s when a read would extend past the end of the buffer.
 */
export type BufferCursor = {
  /** Total length of the underlying buffer in bytes. */
  readonly length: number;
  /** Current read position (0 .. `length`). */
  readonly position: number;
  /** Number of bytes remaining ahead of the cursor. */
  readonly remaining: number;
  /** Read one unsigned byte. */
  readUInt8: () => number;
  /** Read a 16-bit unsigned integer in big-endian order. */
  readUInt16BE: () => number;
  /** Read a 16-bit unsigned integer in little-endian order. */
  readUInt16LE: () => number;
  /** Read a 24-bit unsigned integer in big-endian order. */
  readUInt24BE: () => number;
  /** Read a 32-bit unsigned integer in big-endian order. */
  readUInt32BE: () => number;
  /** Read a 32-bit unsigned integer in little-endian order. */
  readUInt32LE: () => number;
  /** Read an ID3v2 syncsafe 32-bit unsigned integer (4 bytes consumed). */
  readSyncSafeInt32: () => number;
  /**
   * Read `length` bytes as a zero-copy `Uint8Array` view onto the underlying buffer.
   *
   * The returned view shares memory with the source — do not mutate it.
   */
  readBytes: (length: number) => Uint8Array;
  /** Read a fixed-length string in the given encoding. */
  readString: (length: number, encoding: TextEncoding) => string;
  /**
   * Read a null-terminated string. The terminator is consumed but not included in the
   * returned string.
   *
   * UTF-16 variants use a 2-byte (`0x0000`) terminator and align reads to even byte
   * counts; all other encodings use a single-byte (`0x00`) terminator.
   */
  readNullTerminated: (encoding: TextEncoding) => string;
  /** Move the cursor to an absolute offset (must be in `[0, length]`). */
  seek: (offset: number) => void;
  /** Move the cursor forward by `n` bytes (must keep position in `[0, length]`). */
  skip: (n: number) => void;
  /**
   * Return a zero-copy view of the next `n` bytes without advancing the cursor.
   */
  peek: (n: number) => Uint8Array;
};

/**
 * Create a {@link BufferCursor} over the given byte source.
 *
 * Both `Uint8Array` and `Buffer` inputs are accepted; the returned cursor reads via a
 * Node.js `Buffer` view onto the same memory for fast multi-byte access.
 */
export const createBufferCursor = (source: Uint8Array): BufferCursor => {
  const buffer = Buffer.from(source.buffer, source.byteOffset, source.byteLength);
  const state = { position: 0 };

  const ensure = (need: number): void => {
    if (state.position + need > buffer.length) {
      throw new RangeError(
        `BufferCursor: read of ${need} bytes at ${state.position} exceeds length ${buffer.length}`,
      );
    }
  };

  const cursor: BufferCursor = {
    get length() {
      return buffer.length;
    },
    get position() {
      return state.position;
    },
    get remaining() {
      return buffer.length - state.position;
    },
    readUInt8: () => {
      ensure(1);
      const value = buffer.readUInt8(state.position);
      state.position += 1;
      return value;
    },
    readUInt16BE: () => {
      ensure(2);
      const value = buffer.readUInt16BE(state.position);
      state.position += 2;
      return value;
    },
    readUInt16LE: () => {
      ensure(2);
      const value = buffer.readUInt16LE(state.position);
      state.position += 2;
      return value;
    },
    readUInt24BE: () => {
      ensure(3);
      const value = buffer.readUIntBE(state.position, 3);
      state.position += 3;
      return value;
    },
    readUInt32BE: () => {
      ensure(4);
      const value = buffer.readUInt32BE(state.position);
      state.position += 4;
      return value;
    },
    readUInt32LE: () => {
      ensure(4);
      const value = buffer.readUInt32LE(state.position);
      state.position += 4;
      return value;
    },
    readSyncSafeInt32: () => {
      ensure(4);
      const value = decodeSyncSafeInt32(source, state.position);
      state.position += 4;
      return value;
    },
    readBytes: (length: number) => {
      if (length < 0 || !Number.isInteger(length)) {
        throw new RangeError(`BufferCursor.readBytes: invalid length ${length}`);
      }

      ensure(length);
      const view = source.subarray(state.position, state.position + length);
      state.position += length;
      return view;
    },
    readString: (length: number, encoding: TextEncoding) => {
      const bytes = cursor.readBytes(length);
      return decodeText(bytes, encoding);
    },
    readNullTerminated: (encoding: TextEncoding) => {
      const isUtf16 = encoding === "utf16" || encoding === "utf16le" || encoding === "utf16be";
      const start = state.position;
      let end = start;
      if (isUtf16) {
        while (end + 1 < source.length) {
          if (source[end] === 0 && source[end + 1] === 0) {
            break;
          }

          end += 2;
        }

        const value = decodeText(source.subarray(start, end), encoding);
        // Advance past the payload plus the 2-byte terminator when one is present.
        state.position = end + 1 < source.length ? end + 2 : source.length;
        return value;
      }

      while (end < source.length && source[end] !== 0) {
        end += 1;
      }

      const value = decodeText(source.subarray(start, end), encoding);
      state.position = end < source.length ? end + 1 : source.length;
      return value;
    },
    seek: (offset: number) => {
      if (!Number.isInteger(offset) || offset < 0 || offset > buffer.length) {
        throw new RangeError(
          `BufferCursor.seek: offset ${offset} out of range [0, ${buffer.length}]`,
        );
      }

      state.position = offset;
    },
    skip: (n: number) => {
      if (!Number.isInteger(n)) {
        throw new RangeError(`BufferCursor.skip: invalid step ${n}`);
      }

      const next = state.position + n;
      if (next < 0 || next > buffer.length) {
        throw new RangeError(
          `BufferCursor.skip: position ${next} out of range [0, ${buffer.length}]`,
        );
      }

      state.position = next;
    },
    peek: (n: number) => {
      if (n < 0 || !Number.isInteger(n)) {
        throw new RangeError(`BufferCursor.peek: invalid length ${n}`);
      }

      ensure(n);
      return source.subarray(state.position, state.position + n);
    },
  };

  return cursor;
};
