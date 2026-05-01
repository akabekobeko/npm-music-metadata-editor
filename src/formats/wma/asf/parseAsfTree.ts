import { Buffer } from "node:buffer";
import { ASF_GUID, ASF_HEADER_OBJECT_PREAMBLE_SIZE, ASF_OBJECT_HEADER_SIZE } from "../constants.js";
import type { AsfObject } from "../types.js";
import { decodeGuid } from "./guid.js";

/**
 * Parse the top-level ASF object sequence from the start of `buffer`.
 *
 * The Header Object's children are also parsed (one level deep) and exposed
 * via `children` — that is the only level deep enough to discover the
 * Content / Extended Content Description Objects we care about. Header
 * Extension Objects keep their nested objects opaque, matching the
 * "raw transparent" strategy described in the Phase 8 plan.
 *
 * Iteration stops cleanly when an object's declared size would overflow the
 * buffer, mirroring the IFF parser's tolerance for truncated files.
 *
 * @param buffer - Whole-file bytes (or any byte slice that begins on an ASF
 *   object boundary).
 * @returns Top-level objects in file order.
 */
export const parseAsfTree = (buffer: Uint8Array): readonly AsfObject[] =>
  parseSequence({ buffer, start: 0, end: buffer.length, parseHeaderChildren: true });

/** Arguments shared by {@link parseSequence}. */
type Args = {
  /** Full source buffer; offsets in returned objects are absolute to this. */
  buffer: Uint8Array;
  /** Inclusive start offset where the next object begins. */
  start: number;
  /** Exclusive end offset to stop parsing at. */
  end: number;
  /**
   * When `true`, the Header Object's payload is recursed into one level deeper
   * so that callers can locate Content Description / Extended Content
   * Description objects without an additional walk.
   */
  parseHeaderChildren: boolean;
};

/**
 * Walk a contiguous run of ASF objects between `start` and `end`.
 *
 * Helper for {@link parseAsfTree}: recursing into the Header Object reuses
 * the same routine while keeping every other branch of the tree shallow.
 *
 * @returns Parsed objects in file order.
 */
const parseSequence = ({ buffer, start, end, parseHeaderChildren }: Args): readonly AsfObject[] => {
  const view = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const objects: AsfObject[] = [];
  let cursor = start;

  while (cursor + ASF_OBJECT_HEADER_SIZE <= end) {
    const guid = decodeGuid(buffer.subarray(cursor, cursor + ASF_OBJECT_HEADER_SIZE));
    const size = view.readBigUInt64LE(cursor + 16);
    const sizeNumber = Number(size);
    if (size < BigInt(ASF_OBJECT_HEADER_SIZE) || cursor + sizeNumber > end) {
      break;
    }

    const payloadOffset = cursor + ASF_OBJECT_HEADER_SIZE;
    const payloadSize = size - BigInt(ASF_OBJECT_HEADER_SIZE);
    const object: AsfObject = {
      guid,
      offset: cursor,
      size,
      payloadOffset,
      payloadSize,
    };

    if (parseHeaderChildren && guid === ASF_GUID.HeaderObject) {
      // Header Object preamble: 4-byte child count + 2 reserved bytes after the
      // generic 24-byte header. We don't rely on the count itself — we walk
      // bytes until the object ends, which is how every reference parser
      // (libavformat, ATL.NET) does it too.
      const childrenStart = cursor + ASF_HEADER_OBJECT_PREAMBLE_SIZE;
      const childrenEnd = cursor + sizeNumber;
      objects.push({
        ...object,
        children: parseSequence({
          buffer,
          start: childrenStart,
          end: childrenEnd,
          parseHeaderChildren: false,
        }),
      });
    } else {
      objects.push(object);
    }

    cursor += sizeNumber;
  }

  return objects;
};
