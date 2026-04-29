import { Buffer } from "node:buffer";
import { encodeText } from "../utils/encoding/encodeText.js";
import type { TextEncoding } from "../utils/encoding/types.js";
import { encodeSyncSafeInt32 } from "../utils/syncSafeInt/encodeSyncSafeInt32.js";

/**
 * Append-only writer that grows its backing buffer on demand.
 *
 * Use {@link createBufferWriter} to construct one. Call `concat()` once you are
 * done to obtain the underlying bytes; subsequent writes after `concat()` continue
 * to extend the same buffer (the returned `Buffer` is a slice over live memory).
 */
export type BufferWriter = {
  /** Number of bytes written so far. */
  readonly length: number;
  /**
   * Append one unsigned byte.
   *
   * @param value - Byte value in the range `[0, 255]`.
   */
  writeUInt8: (value: number) => void;
  /**
   * Append a 16-bit unsigned integer in big-endian order.
   *
   * @param value - Value in the range `[0, 0xFFFF]`.
   */
  writeUInt16BE: (value: number) => void;
  /**
   * Append a 16-bit unsigned integer in little-endian order.
   *
   * @param value - Value in the range `[0, 0xFFFF]`.
   */
  writeUInt16LE: (value: number) => void;
  /**
   * Append a 24-bit unsigned integer in big-endian order.
   *
   * @param value - Value in the range `[0, 0xFFFFFF]`.
   */
  writeUInt24BE: (value: number) => void;
  /**
   * Append a 32-bit unsigned integer in big-endian order.
   *
   * @param value - Value in the range `[0, 0xFFFFFFFF]`.
   */
  writeUInt32BE: (value: number) => void;
  /**
   * Append a 32-bit unsigned integer in little-endian order.
   *
   * @param value - Value in the range `[0, 0xFFFFFFFF]`.
   */
  writeUInt32LE: (value: number) => void;
  /**
   * Append an ID3v2 syncsafe 32-bit unsigned integer (4 bytes).
   *
   * @param value - Value in the range `[0, SYNC_SAFE_INT32_MAX]`.
   */
  writeSyncSafeInt32: (value: number) => void;
  /**
   * Append the given bytes.
   *
   * @param bytes - Bytes to append; copied into the internal buffer.
   */
  writeBytes: (bytes: Uint8Array) => void;
  /**
   * Append a string in the given encoding (no length prefix, no terminator).
   * Returns the number of bytes written.
   *
   * @param value - String to encode.
   * @param encoding - Target text encoding.
   */
  writeString: (value: string, encoding: TextEncoding) => number;
  /**
   * Append a string followed by its null terminator (`0x00` or `0x0000` for UTF-16).
   * Returns the total number of bytes written including the terminator.
   *
   * @param value - String to encode.
   * @param encoding - Target text encoding.
   */
  writeNullTerminated: (value: string, encoding: TextEncoding) => number;
  /**
   * Return a `Buffer` view over the bytes written so far (zero-copy).
   *
   * Mutating the returned buffer mutates the writer's internal state.
   */
  concat: () => Buffer;
};

/**
 * Initial size in bytes of the writer's backing buffer.
 *
 * Chosen to fit a typical small tag (a handful of frames) in one allocation
 * while keeping idle writers cheap. The buffer doubles on each overflow.
 */
const INITIAL_CAPACITY = 256;

/**
 * Create an empty {@link BufferWriter}.
 *
 * The internal buffer starts at {@link INITIAL_CAPACITY} bytes and doubles whenever a
 * write would overflow it.
 */
export const createBufferWriter = (): BufferWriter => {
  const state = { buffer: Buffer.alloc(INITIAL_CAPACITY), length: 0 };

  /**
   * Make sure the backing buffer can hold `need` more bytes, doubling it as
   * many times as required. No-op when the existing capacity already fits.
   *
   * @param need - Number of additional bytes that must fit after `state.length`.
   */
  const ensureCapacity = (need: number): void => {
    const required = state.length + need;
    if (required <= state.buffer.length) {
      return;
    }

    let next = state.buffer.length;
    while (next < required) {
      next *= 2;
    }

    const grown = Buffer.alloc(next);
    state.buffer.copy(grown, 0, 0, state.length);
    state.buffer = grown;
  };

  const writer: BufferWriter = {
    get length() {
      return state.length;
    },
    writeUInt8: (value: number) => {
      ensureCapacity(1);
      state.buffer.writeUInt8(value, state.length);
      state.length += 1;
    },
    writeUInt16BE: (value: number) => {
      ensureCapacity(2);
      state.buffer.writeUInt16BE(value, state.length);
      state.length += 2;
    },
    writeUInt16LE: (value: number) => {
      ensureCapacity(2);
      state.buffer.writeUInt16LE(value, state.length);
      state.length += 2;
    },
    writeUInt24BE: (value: number) => {
      ensureCapacity(3);
      state.buffer.writeUIntBE(value, state.length, 3);
      state.length += 3;
    },
    writeUInt32BE: (value: number) => {
      ensureCapacity(4);
      state.buffer.writeUInt32BE(value, state.length);
      state.length += 4;
    },
    writeUInt32LE: (value: number) => {
      ensureCapacity(4);
      state.buffer.writeUInt32LE(value, state.length);
      state.length += 4;
    },
    writeSyncSafeInt32: (value: number) => {
      writer.writeBytes(encodeSyncSafeInt32(value));
    },
    writeBytes: (bytes: Uint8Array) => {
      ensureCapacity(bytes.length);
      state.buffer.set(bytes, state.length);
      state.length += bytes.length;
    },
    writeString: (value: string, encoding: TextEncoding) => {
      const encoded = encodeText(value, encoding);
      writer.writeBytes(encoded);
      return encoded.length;
    },
    writeNullTerminated: (value: string, encoding: TextEncoding) => {
      const written = writer.writeString(value, encoding);
      const isUtf16 = encoding === "utf16" || encoding === "utf16le" || encoding === "utf16be";
      if (isUtf16) {
        writer.writeUInt16BE(0);
        return written + 2;
      }

      writer.writeUInt8(0);
      return written + 1;
    },
    concat: () => state.buffer.subarray(0, state.length),
  };

  return writer;
};
