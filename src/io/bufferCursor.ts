import { Buffer } from "node:buffer";
import { decodeText } from "../utils/encoding/decodeText.js";
import type { TextEncoding } from "../utils/encoding/types.js";
import { decodeSyncSafeInt32 } from "../utils/syncSafeInt/decodeSyncSafeInt32.js";

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
  /**
   * Read one unsigned byte.
   *
   * @returns The byte value in `[0, 255]`.
   */
  readUInt8: () => number;
  /**
   * Read a 16-bit unsigned integer in big-endian order.
   *
   * @returns The value in `[0, 0xFFFF]`.
   */
  readUInt16BE: () => number;
  /**
   * Read a 16-bit unsigned integer in little-endian order.
   *
   * @returns The value in `[0, 0xFFFF]`.
   */
  readUInt16LE: () => number;
  /**
   * Read a 24-bit unsigned integer in big-endian order.
   *
   * @returns The value in `[0, 0xFFFFFF]`.
   */
  readUInt24BE: () => number;
  /**
   * Read a 32-bit unsigned integer in big-endian order.
   *
   * @returns The value in `[0, 0xFFFFFFFF]`.
   */
  readUInt32BE: () => number;
  /**
   * Read a 32-bit unsigned integer in little-endian order.
   *
   * @returns The value in `[0, 0xFFFFFFFF]`.
   */
  readUInt32LE: () => number;
  /**
   * Read an ID3v2 syncsafe 32-bit unsigned integer (4 bytes consumed).
   *
   * @returns The decoded 28-bit value.
   */
  readSyncSafeInt32: () => number;
  /**
   * Read `length` bytes as a zero-copy `Uint8Array` view onto the underlying buffer.
   *
   * The returned view shares memory with the source — do not mutate it.
   *
   * @param length - Number of bytes to read.
   * @returns A zero-copy view of the next `length` bytes.
   */
  readBytes: (length: number) => Uint8Array;
  /**
   * Read a fixed-length string in the given encoding.
   *
   * @param length - Number of bytes to consume from the cursor.
   * @param encoding - Text encoding to interpret the bytes with.
   * @returns The decoded string.
   */
  readString: (length: number, encoding: TextEncoding) => string;
  /**
   * Read a null-terminated string. The terminator is consumed but not included in the
   * returned string.
   *
   * UTF-16 variants use a 2-byte (`0x0000`) terminator and align reads to even byte
   * counts; all other encodings use a single-byte (`0x00`) terminator.
   *
   * @param encoding - Text encoding to interpret the bytes with.
   * @returns The decoded string up to (but excluding) the terminator.
   */
  readNullTerminated: (encoding: TextEncoding) => string;
  /**
   * Move the cursor to an absolute offset (must be in `[0, length]`).
   *
   * @param offset - New absolute position.
   */
  seek: (offset: number) => void;
  /**
   * Move the cursor forward by `n` bytes (must keep position in `[0, length]`).
   *
   * @param n - Number of bytes to advance (negative values move backwards).
   */
  skip: (n: number) => void;
  /**
   * Return a zero-copy view of the next `n` bytes without advancing the cursor.
   *
   * @param n - Number of bytes to peek ahead.
   * @returns A view sharing memory with the underlying buffer.
   */
  peek: (n: number) => Uint8Array;
};

/**
 * Create a {@link BufferCursor} over the given byte source.
 *
 * Both `Uint8Array` and `Buffer` inputs are accepted; the returned cursor reads via a
 * Node.js `Buffer` view onto the same memory for fast multi-byte access.
 *
 * @param source - Bytes the cursor will read from. The buffer is not copied.
 * @returns A cursor positioned at offset `0` of `source`.
 */
export const createBufferCursor = (source: Uint8Array): BufferCursor => {
  const buffer = Buffer.from(source.buffer, source.byteOffset, source.byteLength);
  const state = { position: 0 };

  /**
   * Throw a `RangeError` when the next `need` bytes would extend past the end of
   * the buffer. Centralised so every read method shares the same message format.
   *
   * @param need - Number of bytes the caller is about to read.
   */
  const checkAvailable = (need: number): void => {
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
      checkAvailable(1);
      const value = buffer.readUInt8(state.position);
      state.position++;
      return value;
    },
    readUInt16BE: () => {
      checkAvailable(2);
      const value = buffer.readUInt16BE(state.position);
      state.position += 2;
      return value;
    },
    readUInt16LE: () => {
      checkAvailable(2);
      const value = buffer.readUInt16LE(state.position);
      state.position += 2;
      return value;
    },
    readUInt24BE: () => {
      checkAvailable(3);
      const value = buffer.readUIntBE(state.position, 3);
      state.position += 3;
      return value;
    },
    readUInt32BE: () => {
      checkAvailable(4);
      const value = buffer.readUInt32BE(state.position);
      state.position += 4;
      return value;
    },
    readUInt32LE: () => {
      checkAvailable(4);
      const value = buffer.readUInt32LE(state.position);
      state.position += 4;
      return value;
    },
    readSyncSafeInt32: () => {
      checkAvailable(4);
      const value = decodeSyncSafeInt32(source, state.position);
      state.position += 4;
      return value;
    },
    readBytes: (length: number) => {
      if (length < 0 || !Number.isInteger(length)) {
        throw new RangeError(`BufferCursor.readBytes: invalid length ${length}`);
      }

      checkAvailable(length);
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
      const end = isUtf16
        ? findUtf16Terminator(source, start)
        : findSingleByteTerminator(source, start);
      const value = decodeText(source.subarray(start, end), encoding);
      // Advance past the payload plus the terminator when one is present.
      const terminatorSize = isUtf16 ? 2 : 1;
      state.position =
        end + terminatorSize - 1 < source.length ? end + terminatorSize : source.length;
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

      checkAvailable(n);
      return source.subarray(state.position, state.position + n);
    },
  };

  return cursor;
};

/**
 * Walk forward over `source` looking for the first single-byte `0x00` terminator.
 *
 * @param source - Bytes to scan.
 * @param start - Offset to start scanning from.
 * @returns The offset of the terminator, or `source.length` when no terminator exists.
 */
const findSingleByteTerminator = (source: Uint8Array, start: number): number => {
  let end = start;
  while (end < source.length && source[end] !== 0) {
    end++;
  }

  return end;
};

/**
 * Walk forward over `source` looking for the first aligned 2-byte `0x00 0x00`
 * terminator (UTF-16 family).
 *
 * @param source - Bytes to scan.
 * @param start - Offset to start scanning from. Should be aligned with the UTF-16 code-unit grid.
 * @returns The offset of the terminator, or the position at which scanning stopped
 *   (just past the last full code unit) when no terminator exists.
 */
const findUtf16Terminator = (source: Uint8Array, start: number): number => {
  let end = start;
  while (end + 1 < source.length) {
    if (source[end] === 0 && source[end + 1] === 0) {
      return end;
    }

    end += 2;
  }

  return end;
};
